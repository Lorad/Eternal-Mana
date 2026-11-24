/**
 * Lebendige Welt (0.6) – Einstiegspunkt für die Kernklassen. `Game` und `Zone` rufen nur diese wenigen Funktionen auf;
 * die Systeme selbst liegen daneben: rep.ts (Ruf), events.ts (Ereignisse, Weltbosse, Händlerin), rares.ts (seltene Monster),
 * encounters.ts (Begegnungen), treasure.ts (Schätze, Trophäen), routines.ts (Tagesabläufe).
 *
 * Kosten: Dungeons werden übersprungen, Zonen ohne Spieler gar nicht erst aufgerufen. Im Spieltakt läuft einmal je
 * Sekunde ein Zeitvergleich je Weltboss und je laufendem Ereignis – sonst nichts.
 */
import { CFG } from '../../../shared/src/config';
import { EVENTS, SEASON_NAMES, SEASON_NODES, SEASON_TEXT, isRegion, seasonWeathers, type EncounterKind, type EventKind } from '../../../shared/src/data/events';
import { FACTIONS, factionOfZone } from '../../../shared/src/data/factions';
import { ITEMS, makeStack } from '../../../shared/src/data/items';
import type { QuestDef } from '../../../shared/src/data/quests';
import { RARES, WORLD_BOSSES } from '../../../shared/src/data/rares';
import { mapOf } from '../../../shared/src/data/worlditems';
import type { ClientMsg, ItemInstance, WorldInfo } from '../../../shared/src/types';
import type { Game } from '../game';
import type { Player } from '../player';
import type { Mob, Obj, Zone } from '../zone';
import { encounterInteract, encounterMobDeath, encounterPick, startEncounter, tickEncounters } from './encounters';
import { bossKilled, eventInfo, eventInteract, eventMobDeath, finishEvent, scheduleBosses, scheduleEvents, startBoss, startEvent, tickEvent, traderBuy, traderOffers } from './events';
import { rareDeath, spawnRare, tickRares } from './rares';
import { addRep, donate, factionBuy, onQuestDone, setTitle } from './rep';
import { snapRoutines, tickRoutines } from './routines';
import { gw, ringSpot, seasonOf, worldTime, zw } from './state';
import { dig, readMap, useTrophy } from './treasure';

const L = CFG.living;
const META = 'welt';
type WorldMsg = Extract<ClientMsg, { t: 'donate' | 'fbuy' | 'wbuy' | 'dig' | 'enc' | 'title' }>;

function load(g: Game) {
  const G = gw(g);
  if (G.loaded) return;
  G.loaded = true;
  try {
    const raw = JSON.parse(g.db.getMeta(META) ?? 'null');
    if (raw && typeof raw.t === 'number' && isFinite(raw.t)) G.base = Math.max(0, raw.t);
    if (raw && raw.boss && typeof raw.boss === 'object') for (const id in WORLD_BOSSES) if (typeof raw.boss[id] === 'number') G.bossNext[id] = raw.boss[id];
  } catch { /* unlesbar: die Welt beginnt im Frühling */ }
  G.season = seasonOf(g).season;
}
function infoFor(p: Player): WorldInfo {
  const g = p.zone.game, G = gw(g), s = seasonOf(g);
  return { season: s.season, sp: Math.round(s.sp * 100) / 100, ev: [...G.events].map(e => eventInfo(e, p)), trader: traderOffers(p.zone, p) };
}
function sendTo(p: Player) { if (!p.linkdead) p.send({ t: 'world', w: infoFor(p) }); }
function regionOf(z: Zone): string | undefined { return factionOfZone(z.id)?.zone; }

export const World = {
  // ================================================================== Spieltakt (Game.tick)
  tickGame(g: Game, dt: number) {
    const G = gw(g);
    load(g);
    if ((G.syncT += dt) < 1) return;
    const step = G.syncT; G.syncT = 0;
    const now = g.now, s = seasonOf(g).season;
    if (s !== G.season) {
      G.season = s; G.dirty = true;
      g.sysChat(SEASON_TEXT[s]);
      for (const p of g.players.values()) p.toast(`${SEASON_NAMES[s]}: ${SEASON_TEXT[s]}`, 'story');
    }
    if (G.auto) scheduleBosses(g);
    // Ereignisse in verlassenen Zonen aufräumen (die Zone selbst wird ohne Spieler nicht simuliert)
    for (const ev of [...G.events]) {
      if (ev.zone.players.size) { ev.emptySince = 0; continue; }
      if (!ev.emptySince) { ev.emptySince = now; continue; }
      if (ev.boss ? now > ev.until : now - ev.emptySince > L.events.abandonSec) finishEvent(ev, 'fail', !ev.boss);
    }
    // Weltzustand an alle: sofort bei Änderungen, sonst alle 20 s zum Nachziehen
    if (G.dirty || Math.floor(now / 20) !== Math.floor((now - step) / 20)) { G.dirty = false; for (const p of g.players.values()) sendTo(p); }
  },
  /** Weltzeit und Weltboss-Termine überdauern Neustarts (Tabelle `meta`). */
  save(g: Game) {
    const G = gw(g);
    if (!G.loaded) return;
    try { g.db.setMeta(META, JSON.stringify({ t: Math.round(worldTime(g)), boss: G.bossNext })); } catch (e) { console.error('[welt] Speichern fehlgeschlagen:', e); }
  },

  // ================================================================== Zonentakt (Zone.update – nur mit Spielern)
  tickZone(z: Zone, dt: number) {
    if (z.def.kind !== 'overworld') return;
    const zs = zw(z), now = z.game.now;
    if ((zs.acc += dt) < 0.25) return;
    const step = zs.acc; zs.acc = 0;
    const slow = (zs.slow += step) >= 1;
    if (slow) zs.slow = 0;
    if (now - zs.lastTick > 5) snapRoutines(z);
    zs.lastTick = now;
    tickRoutines(z, now);
    if (slow && gw(z.game).auto) scheduleEvents(z, now);
    if (zs.event) tickEvent(zs.event, now);
    if (zs.boss) tickEvent(zs.boss, now);
    tickRares(z, now, slow);
    tickEncounters(z, now, step, slow);
    if (zs.dirty) { zs.dirty = false; for (const p of z.players.values()) sendTo(p); }
  },
  /** Spieler betritt die Zone: war sie leer, stehen die NPCs sofort am richtigen Platz. */
  onJoin(z: Zone, p: Player) {
    if (z.def.kind !== 'overworld') return;
    if (z.players.size <= 1) { snapRoutines(z); zw(z).lastTick = z.game.now; }
    void p;
  },
  sendTo,
  weathers(z: Zone): [string, number][] { return seasonWeathers(z.def, seasonOf(z.game).season); },
  /** Abbaustelle geerntet: Sonderfunde der Jahreszeit; Rückgabe = Faktor auf die Chance der Biom-Zutat */
  onHarvest(z: Zone, p: Player): number {
    if (z.def.kind !== 'overworld') return 1;
    const s = SEASON_NODES[seasonOf(z.game).season];
    for (const [item, ch] of [...(s.extra['*'] ?? []), ...(s.extra[z.id] ?? [])]) if (ITEMS[item] && z.rng.chance(ch)) p.give(makeStack(item));
    return s.ingredient;
  },
  onMobDeath(z: Zone, m: Mob, rec: Player[]) {
    // Schatzkarten von Erwachten (auch in Dungeons: Karte der Region)
    if (m.elite && !m.summoned) { const reg = regionOf(z); if (reg) for (const p of rec) if (z.rng.chance(L.treasure.eliteChance)) z.dropItemFor(p, makeStack(mapOf(reg)), m.x, m.y); }
    if (z.def.kind !== 'overworld') return;
    const zs = zw(z);
    if (zs.boss && zs.boss.bossMob === m) return bossKilled(zs.boss, rec);
    if (eventMobDeath(z, m, rec) || encounterMobDeath(z, m, rec)) return;
    rareDeath(z, m, rec);
  },
  onChest(z: Zone, p: Player, tier: string) {
    const reg = regionOf(z);
    if (reg && z.rng.chance(L.treasure.chest[tier] ?? 0)) p.give(makeStack(mapOf(reg)));
  },
  /** Objekte der Weltsysteme (Sternsplitter, Geröll, Fährten, Begegnungen) */
  interact(z: Zone, p: Player, o: Obj): boolean {
    if (o.type !== 'wobj' && !(o.type === 'npc' && o.props?.enc)) return false;
    if (!encounterInteract(z, p, o)) eventInteract(z, p, o);
    return true;
  },
  /** Spielerbezogener Zustand: Sternsplitter verschwinden für den, der sie schon aufgehoben hat */
  objState(o: Obj, p: Player): number | undefined { return o.type === 'wobj' && o.looted ? (o.looted.has(p.charId) ? 1 : 0) : undefined; },

  // ================================================================== Spieleraktionen
  message(g: Game, p: Player, m: WorldMsg) {
    switch (m.t) {
      case 'donate': return donate(g, p, m.npc, m.item, m.n);
      case 'fbuy': return factionBuy(g, p, m.npc, m.idx, m.qty ?? 1);
      case 'wbuy': if (traderBuy(p, m.idx, m.qty ?? 1)) sendTo(p); return;
      case 'dig': dig(p); return;
      case 'enc': return encounterPick(p, Number(m.id), Number(m.opt));
      case 'title': return setTitle(g, p, m.id);
    }
  },
  /** Schatzkarte lesen / Trophäe in die Sammlung aufnehmen */
  useItem(_g: Game, p: Player, it: ItemInstance): boolean {
    const u = ITEMS[it.base].use!;
    if (u.tmap) return readMap(p, it);
    if (u.trophy) return useTrophy(p, it);
    return false;
  },
  onQuestDone(p: Player, q: QuestDef) { onQuestDone(p, q); },

  // ================================================================== Steuerung für Tests, Messläufe und Dev-Befehle
  /** false = nichts geschieht von selbst (Ereignisse, Weltbosse, seltene Monster, Begegnungen); Erzwungenes läuft trotzdem */
  setAuto(g: Game, on: boolean) { gw(g).auto = on; },
  season(g: Game): number { return seasonOf(g).season; },
  /** Springt an den Beginn einer Jahreszeit */
  setSeason(g: Game, n: number) {
    load(g);
    const G = gw(g), len = L.season.lengthSec, year = len * 4, t = worldTime(g);
    G.base += ((((n % 4) + 4) % 4) * len - (t % year) + year) % year;
    G.syncT = 1; // beim nächsten Takt ansagen
  },
  startEvent(z: Zone, kind: EventKind, at?: { x: number; y: number }) { return startEvent(z, kind, at, true); },
  startBoss(g: Game, id: string, zoneId?: string, at?: { x: number; y: number }) { return WORLD_BOSSES[id] ? startBoss(g, WORLD_BOSSES[id], zoneId, at) : null; },
  spawnRare(z: Zone, id: string) { return spawnRare(z, id, true); },
  startEncounter(p: Player, kind: EncounterKind, at?: { x: number; y: number }) { return startEncounter(p, kind, at); },
  state: { game: gw, zone: zw },

  /** Entwickler-Befehle (nur EM_DEV=1) */
  dev(g: Game, p: Player, cmd: string, a: string[]): boolean {
    const z = p.zone, here = () => ringSpot(z, p.x, p.y, 70, 110);
    switch (cmd) {
      case 'event': if (EVENTS[a[0] as EventKind] && isRegion(z.id)) { const zs = zw(z); if (zs.event) finishEvent(zs.event, 'fail', true); startEvent(z, a[0] as EventKind, here(), true); } else p.toast('Dev: /event woge|sterne|haendler|einsturz|aschesturm|jagd (in einer der sechs Regionen)'); return true;
      case 'wboss': if (!World.startBoss(g, a[0], z.id, here())) p.toast('Dev: /wboss moosgrimm|aschenmaul|niemand (in einer seiner Regionen)'); return true;
      case 'rare': if (!RARES[a[0]] || !spawnRare(z, a[0], true)) p.toast('Dev: /rare <id> – ' + Object.values(RARES).filter(r => r.zone === z.id).map(r => r.id).join(', ')); else { const m = zw(z).rares!.get(a[0])!.mob!; p.x = m.x; p.y = m.y + 60; p.epoch++; p.send({ t: 'pos', x: p.x, y: p.y, e: p.epoch }); } return true;
      case 'season': World.setSeason(g, +a[0] || 0); return true;
      case 'rep': if (FACTIONS[a[0]]) addRep(p, a[0], +a[1] || 500); else p.toast('Dev: /rep ' + Object.keys(FACTIONS).join('|') + ' n'); return true;
      case 'enc': if (!['hinterhalt', 'reisender', 'tier', 'duell'].includes(a[0]) || !startEncounter(p, a[0] as EncounterKind)) p.toast('Dev: /enc hinterhalt|reisender|tier|duell (in einer der sechs Regionen)'); return true;
      case 'tmap': if (isRegion(z.id)) p.give(makeStack(mapOf(z.id))); return true;
      case 'welt': World.setAuto(g, a[0] !== 'aus'); p.toast('Lebendige Welt von selbst: ' + (a[0] !== 'aus')); return true;
    }
    return false;
  },
};
