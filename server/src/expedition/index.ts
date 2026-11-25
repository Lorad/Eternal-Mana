/**
 * Expeditionen (0.9), Serverseite – der EINZIGE Einstieg für Game, Zone und BossCtl.
 *
 *   Portal & Auswahl   `message` (exp-Nachricht): auswählen, Bereitschaftsprüfung der Gruppe, starten, beitreten, verlassen
 *   Instanz            jede Gruppe (oder jeder Einzelne) bekommt eine eigene Zone `exp:<n>` mit einem ExpRun (run.ts);
 *                      `setup` besetzt sie nach Schwierigkeitsgrad und Wochenmodifikatoren, `tick` führt Mini-Bosse,
 *                      Rätsel, Fallen, Ereignisse, Abschnitte und die Belohnungsphase
 *   Abschluss          `bossDown` → Belohnung genau einmal (reward.ts) → Arena versiegelt → Statistik → Portal →
 *                      gemeinsame Rückkehr in den Hub (hub.ts) mit Zusammenfassung
 *   Wiederverbindung   `entry` setzt einen neu angemeldeten Charakter zurück in seinen laufenden Lauf (Gruppe + Position)
 * Daten und Regeln: shared/src/data/expeditions.ts, Karte: shared/src/maps/expedition.ts.
 */
import { circleFree } from '../../../shared/src/collision';
import { CFG } from '../../../shared/src/config';
import { BOSSES, ENEMIES, type BossDef } from '../../../shared/src/data/enemies';
import {
  DIFFICULTIES, ELITE_AFFIX, ELITE_AFFIXES, EXPEDITIONS, EXP_BY_LEGACY, EXP_CFG, EXP_DIFF, MINIS, diffBlock, expPar, expUnlock, isExpedition, isoWeek, weeklyChallenge, weeklyFlag,
  type EliteAffix, type Weekly,
} from '../../../shared/src/data/expeditions';
import type { Difficulty } from '../../../shared/src/data/hub';
import { DIFFICULTY_NAME } from '../../../shared/src/data/hub';
import { generateGear, makeStack, rollRarity } from '../../../shared/src/data/items';
import { NPCS } from '../../../shared/src/data/npcs';
import { kreisBossDef, kreisLevel, kreisOf } from '../../../shared/src/data/rifts';
import { ZONES, type ZoneDef } from '../../../shared/src/data/zones';
import { getMap, type GameMap } from '../../../shared/src/maps/mapgen';
import type { ExpSection } from '../../../shared/src/maps/expedition';
import { RUNE_SYMBOLS } from '../../../shared/src/maps/expedition';
import { TILE } from '../../../shared/src/maps/tiles';
import type { ClientMsg, ExpLobbyInfo, ExpRunInfo } from '../../../shared/src/types';
import type { BossCtl } from '../boss';
import type { EchoMech } from '../echo';
import type { Game } from '../game';
import type { Player } from '../player';
import { Social } from '../social';
import { Mob, Zone, type Obj } from '../zone';
import { expBossMech } from './bossmech';
import { expeditionPortals, returnSpot } from './hub';
import { miniDown, spawnMinis, tickMinis } from './mini';
import { grant, totals } from './reward';
import { lobbiesOf, newRun, runs, type EventState, type ExpRun, type Lobby } from './run';

type ExpMsg = Extract<ClientMsg, { t: 'exp' }>;
const reject = (p: Player, s: string) => { p.toast(s, 'bad'); p.pev.push({ k: 'sfx', n: 'ui_error' }); };
const secOf = (zone: Zone, id: string) => zone.map.exp!.sections.find(s => s.id === id)!;
const inSec = (s: ExpSection, x: number, y: number, pad = 0) => x >= (s.x0 + pad) * TILE && x < (s.x1 + 1 - pad) * TILE && y >= (s.y0 + pad) * TILE && y < (s.y1 + 1 - pad) * TILE;
const weeklyNow = (): Weekly => weeklyChallenge(isoWeek(Date.now()));
/** Stufe eines Gegners in diesem Lauf: Plan + Neuer Kreis + Schwierigkeitsgrad */
function levelFor(run: ExpRun, base: number): number { const d = EXP_DIFF[run.diff]; return Math.max(d.lvlMin, kreisLevel(base, run.kreis) + d.lvlPlus); }

/** Zeitpunkt der letzten Rückkehr je Charakter (Weg zur Schmiede nur kurz danach) */
const returnedAt = new Map<number, number>();

// =====================================================================================================================
//  Instanz aufbauen
// =====================================================================================================================
function makeMob(zone: Zone, mobId: string, lvl: number, x: number, y: number, elite: boolean, group: number, idx: number): Mob {
  const run = zone.exp!, d = EXP_DIFF[run.diff], mods = run.weekly?.mods ?? [];
  const m = new Mob(ENEMIES[mobId], lvl, x, y, elite, group, idx);
  m.maxHp = m.hp = Math.round(m.maxHp * d.hpMul); m.baseDmg *= d.dmgMul; m.dmg = m.baseDmg;
  if (mods.includes('hast')) { m.speed *= 1.25; m.cdMul = 0.8; }
  if (elite && d.affixes) {
    const list = zone.rng.shuffle([...ELITE_AFFIXES]).slice(0, d.affixes) as EliteAffix[];
    run.affix.set(m.id, list);
    if (list.includes('gepanzert')) m.vuln = 0.6;
    if (list.includes('eilig')) { m.speed *= 1.3; m.cdMul *= 0.75; }
    m.name = `${list.map(a => ELITE_AFFIX[a].name).join(', ')}: ${m.name}`;
  }
  zone.mobs.set(m.id, m);
  return m;
}

function setup(zone: Zone) {
  const run = zone.exp!, d = EXP_DIFF[run.diff], info = zone.map.exp!, mods = run.weekly?.mods ?? [];
  if (mods.includes('glas')) { zone.mod.dmgTaken = 1.3; zone.mod.cd = 0.8; }
  if (mods.includes('versiegt')) zone.mod.heal = 0.6;
  if (mods.includes('finster')) zone.mod.aggro = 0.75;
  const eliteCh = d.elite * (mods.includes('erwacht') ? 2 : 1);
  const firstOf = new Set<number>();
  zone.map.spawns.forEach((s, i) => {
    const lvl = levelFor(run, s.lvl);
    makeMob(zone, s.mob, lvl, s.x, s.y, !!s.elite || zone.rng.chance(eliteCh), s.group, i);
    const extra = (firstOf.has(s.group) ? 0 : (mods.includes('horde') ? 2 : 0) + (zone.rng.chance(d.extra) ? 1 : 0));
    firstOf.add(s.group);
    for (let k = 0; k < extra; k++) {
      const a = zone.rng.range(0, 6.28), x = s.x + Math.cos(a) * 16, y = s.y + Math.sin(a) * 16;
      if (circleFree(ENEMIES[s.mob].flying ? zone.solidFly : zone.solidWalk, x, y, 6)) makeMob(zone, s.mob, lvl, x, y, zone.rng.chance(eliteCh), s.group, i);
    }
  });
  spawnMinis(zone, b => levelFor(run, b), d.hpMul, d.dmgMul);
  for (const pz of info.puzzles) run.puzzles.set(pz.sec, { sec: pz.sec, kind: pz.kind, order: pz.order, bits: pz.bits, runes: pz.runes, time: pz.time, progress: 0, solved: false });
  for (const ev of info.events) run.events.set(ev.sec, { kind: ev.kind, sec: ev.sec, state: 'idle', wave: 0, waves: 3, mobs: new Set(), barriers: [], at: 0, next: 0 });
}

// =====================================================================================================================
//  Betreten, Verlassen, Wiederkehr
// =====================================================================================================================
function nearPortal(p: Player): boolean { for (const o of p.zone.objs.values()) if (o.type === 'xobj' && o.props?.kind === 'portal' && Math.hypot(o.x - p.x, o.y - p.y) < 96) return true; return false; }
/** Der laufende Lauf, in den dieser Spieler gehört (eigene Gruppe – oder einer, den er allein begonnen hat) */
function runFor(game: Game, p: Player): Zone | undefined {
  let best: Zone | undefined;
  for (const z of runs(game)) {
    const r = z.exp!;
    if (r.returned) continue;
    if (!mayEnter(r, p)) continue;
    if (!best || r.id > best.exp!.id) best = z;
  }
  return best;
}
/** Darf dieser Spieler in diesen Lauf? Nur die eigene Gruppe – nie die Instanz einer fremden Gruppe. */
function mayEnter(r: ExpRun, p: Player): boolean { return r.party ? r.party === p.party : r.members.has(p.charId); }

function startRun(game: Game, lead: Player, id: string, diff: Difficulty, members: Player[], back?: { zone: string; x: number; y: number }): Zone {
  const w = weeklyNow();
  const run = newRun(id, diff, lead.party, game.now, w.exp === id && w.diff === diff ? w : null);
  run.kreis = game.worldKreis(lead);
  const zone = new Zone(game, Expedition.zoneDef(id, diff, run.kreis), { key: 'exp:' + run.id, exp: run });
  game.zones.set(zone.key, zone);
  const name = `${EXPEDITIONS[id].name} (${DIFFICULTY_NAME[diff]})`;
  for (const q of members) {
    enter(game, q, zone, q === lead ? back : undefined);
    q.toast(q === lead ? `${name} beginnt.` : `${lead.name} führt euch in: ${name}.`, 'story');
  }
  if (lead.party) for (const q of lead.party.members) if (!members.includes(q)) q.toast(`${lead.name} ist aufgebrochen: ${name}. Am Portal kannst du nachkommen.`, 'info');
  return zone;
}
function enter(game: Game, p: Player, zone: Zone, back?: { zone: string; x: number; y: number }) {
  const run = zone.exp!;
  run.members.add(p.charId);
  if (!run.from.has(p.charId)) run.from.set(p.charId, back ?? returnSpot());
  if (!run.d0.has(p.charId)) run.d0.set(p.charId, p.char.deaths);
  const at = run.checkpoint ?? zone.map.start;
  game.moveTo(p, zone, at);
  p.pev.push({ k: 'sfx', n: 'teleport' });
  if (zone.map.start === at) p.send({ t: 'story', id: 'exp', title: EXPEDITIONS[run.exp].name, lines: [EXPEDITIONS[run.exp].intro] });
}
function leave(game: Game, p: Player, why?: string) {
  const z = p.zone, run = z.exp;
  if (!run) return;
  const t = run.from.get(p.charId) ?? returnSpot();
  if (p.dead) { p.dead = false; p.hp = Math.round(p.stats.maxHp * 0.5); }
  game.moveTo(p, game.zone(ZONES[t.zone] ? t.zone : 'gruenwald', game.worldKreis(p)), { x: t.x, y: t.y });
  p.send({ t: 'exp', run: null });
  if (why) p.toast(why, 'info');
}

// =====================================================================================================================
//  Bereitschaftsprüfung
// =====================================================================================================================
function lobbyInfo(game: Game, l: Lobby): ExpLobbyInfo {
  return { exp: l.exp, diff: l.diff, lead: l.lead.charId, sec: Math.max(0, Math.round(l.until - game.now)),
    members: [...l.party.members].map(q => ({ charId: q.charId, name: q.name, ready: l.ready.has(q.charId), here: nearPortal(q), online: !q.linkdead })) };
}
function sendLobby(game: Game, l: Lobby | null, party: Lobby['party']) { const info = l ? lobbyInfo(game, l) : null; for (const q of party.members) q.send({ t: 'exp', lobby: info }); }
function lobbyOf(game: Game, p: Player): Lobby | null {
  if (!p.party) return null;
  const all = lobbiesOf(game), l = all.get(p.party);
  if (l && (game.now > l.until || !p.party.members.has(l.lead) || l.party !== p.party)) { all.delete(p.party); sendLobby(game, null, p.party); return null; }
  return l ?? null;
}

// =====================================================================================================================
//  Anzeige (HUD)
// =====================================================================================================================
function goalFor(zone: Zone, p: Player): string {
  const run = zone.exp!, info = zone.map.exp!;
  if (run.done) return run.done.revealed ? 'Durch das Portal in der Belohnungskammer heimkehren' : 'Der Kampf ist vorbei …';
  if (zone.boss?.active) return `${zone.boss.def.name} besiegen`;
  const here = info.sections.find(s => s.id === run.where.get(p.charId));
  const ev = here && run.events.get(here.id);
  if (ev && ev.state === 'running') return 'Den Hinterhalt überstehen';
  const pz = here && run.puzzles.get(here.id);
  if (pz && !pz.solved) return 'Das Rätsel dieses Abschnitts lösen';
  if (here?.role === 'key' && zone.keys === 0) return 'Den Schlüssel finden';
  const mains = info.sections.filter(s => s.main), i = here ? mains.findIndex(s => s.order === here.order) : 0;
  const next = mains[Math.min(mains.length - 1, Math.max(0, i) + 1)];
  return next ? `Weiter: ${next.name}` : '';
}
function runInfo(zone: Zone, p: Player): ExpRunInfo {
  const run = zone.exp!, T = totals(zone), now = zone.game.now, here = run.where.get(p.charId) ?? '';
  const ev = [...run.events.values()].find(e => e.state === 'running' && e.sec === here);
  const d = EXP_DIFF[run.diff];
  return {
    exp: run.exp, diff: run.diff, t: Math.round(run.done ? run.done.sec : now - run.startAt), sec: here ? secOf(zone, here).name : '', goal: goalFor(zone, p),
    kills: run.kills, deaths: p.char.deaths - (run.d0.get(p.charId) ?? p.char.deaths), secrets: [run.secrets.size, T.secrets], minis: [run.minis.size, T.minis],
    weekly: run.weekly?.mods, par: d.timedChest ? expPar(EXPEDITIONS[run.exp]) : undefined,
    event: ev ? { kind: ev.kind, wave: ev.wave, waves: ev.waves, text: 'Hinterhalt' } : undefined,
    done: run.done?.sec, ret: run.done?.revealed ? Math.max(0, Math.round(run.returnAt - now)) : undefined,
    votes: run.done?.revealed ? [run.votes.size, zone.alivePlayers().length + [...zone.players.values()].filter(q => q.dead).length] : undefined,
    enrage: zone.boss?.active && d.enrage ? Math.round(d.enrage - (now - run.bossAt)) : undefined,
  };
}
function sendInfo(zone: Zone, only?: Player) { for (const p of only ? [only] : zone.players.values()) p.send({ t: 'exp', run: runInfo(zone, p) }); }

// =====================================================================================================================
//  Rätsel, Fallen, Ereignisse
// =====================================================================================================================
function puzzleSolved(zone: Zone, sec: string) {
  const run = zone.exp!, pz = run.puzzles.get(sec);
  if (!pz || pz.solved) return;
  pz.solved = true;
  zone.ev({ k: 'sfx', n: 'puzzle_solved' });
  for (const o of zone.objs.values()) if (o.type === 'door' && o.props?.seal === 'pz:' + sec && o.state === 0) { zone.setObjState(o, 1); zone.ev({ k: 'fx', n: 'shard', x: o.x, y: o.y }); }
  for (const p of zone.players.values()) p.toast('Das Siegel bricht – der Weg ist frei!', 'good');
  sendInfo(zone);
}
function puzzleInteract(zone: Zone, p: Player, o: Obj): boolean {
  const run = zone.exp!, sec = o.props?.psec as string | undefined, pz = sec ? run.puzzles.get(sec) : undefined;
  if (!pz) return false;
  if (pz.solved) return true;
  if (o.type === 'brazier') {
    if (o.state === 1) return true;
    if (o.props!.idx === pz.order![pz.progress]) {
      zone.setObjState(o, 1); pz.progress++;
      zone.ev({ k: 'sfx', n: 'cast_fire', x: o.x, y: o.y });
      if (pz.progress >= 4) puzzleSolved(zone, sec!);
    } else {
      pz.progress = 0;
      for (const b of zone.objs.values()) if (b.type === 'brazier' && b.props?.psec === sec && b.state === 1) zone.setObjState(b, 0);
      zone.ev({ k: 'sfx', n: 'ui_error', x: o.x, y: o.y });
      p.toast('Die Flammen erlöschen. Falsche Reihenfolge.', 'bad');
    }
  } else if (o.type === 'lever') {
    zone.setObjState(o, o.state ? 0 : 1);
    zone.ev({ k: 'sfx', n: 'lever', x: o.x, y: o.y });
    if ([...zone.objs.values()].filter(l => l.type === 'lever' && l.props?.psec === sec).every(l => l.state === pz.bits![l.props!.idx])) puzzleSolved(zone, sec!);
  } else if (o.type === 'xobj' && o.props?.kind === 'rune') {
    const v = (o.state + 1) % 4;
    zone.setObjState(o, v, { label: RUNE_SYMBOLS[v] });
    o.props.label = RUNE_SYMBOLS[v];
    zone.ev({ k: 'sfx', n: 'lever', x: o.x, y: o.y });
    if ([...zone.objs.values()].filter(r => r.props?.kind === 'rune' && r.props?.psec === sec).every(r => r.state === pz.runes![r.props!.idx])) puzzleSolved(zone, sec!);
  } else return false;
  return true;
}
function tickPlates(zone: Zone, now: number) {
  for (const pz of zone.exp!.puzzles.values()) {
    if (pz.kind !== 'plates' || pz.solved) continue;
    const plates = [...zone.objs.values()].filter(o => o.type === 'plate' && o.props?.psec === pz.sec);
    for (const o of plates) {
      const on = zone.alivePlayers().some(p => Math.abs(p.x - o.x) < 9 && Math.abs(p.y - o.y) < 9);
      if (on) { o.activeUntil = now + (pz.time ?? 6); if (o.state === 0) { zone.setObjState(o, 1); zone.ev({ k: 'sfx', n: 'plate', x: o.x, y: o.y }); } }
      else if (o.state === 1 && now > (o.activeUntil ?? 0)) zone.setObjState(o, 0);
    }
    if (plates.length && plates.every(o => o.state === 1)) puzzleSolved(zone, pz.sec);
  }
}
/** brüchiger Boden: knackt, wenn jemand darauf steht, bricht nach kurzer Zeit – wer dann noch darauf steht, stürzt */
function tickCollapse(zone: Zone, now: number) {
  for (const o of zone.objs.values()) {
    if (o.type !== 'xobj' || o.props?.kind !== 'collapse') continue;
    const cells = o.props.cells as number[], w = zone.map.w;
    const on = (p: Player) => cells.includes(Math.floor(p.y / TILE) * w + Math.floor(p.x / TILE));
    if (o.state === 0) { if (zone.alivePlayers().some(p => on(p) && now >= p.rollUntil)) { zone.setObjState(o, 1, { frame: 'collapse_floor_1' }); o.props.frame = 'collapse_floor_1'; o.activeUntil = now + 0.8; zone.ev({ k: 'sfx', n: 'wall_break', x: o.x, y: o.y }); } }
    else if (o.state === 1 && now >= o.activeUntil!) {
      zone.setObjState(o, 2, { frame: 'collapse_floor_2' }); o.props.frame = 'collapse_floor_2'; o.activeUntil = now + 4;
      zone.ev({ k: 'fx', n: 'rubble', x: o.x, y: o.y });
      for (const p of zone.alivePlayers()) if (on(p)) {
        zone.hitPlayer(p, CFG.enemy.dmg(zone.def.level[1]) * 1.6, 'phys', zone.def.level[1], 'Einsturz');
        const s = zone.map.exp!.sections.find(s2 => inSec(s2, o.x, o.y));
        if (s && !p.dead) { p.x = s.entry.x; p.y = s.entry.y; p.epoch++; p.send({ t: 'pos', x: p.x, y: p.y, e: p.epoch }); p.toast('Der Boden gibt nach! Du kletterst zurück zum Anfang des Gangs.', 'bad'); }
      }
    } else if (o.state === 2 && now >= o.activeUntil!) { zone.setObjState(o, 0, { frame: 'collapse_floor_0' }); o.props.frame = 'collapse_floor_0'; }
  }
}
/** Hinterhalt: Der Abschnitt schließt sich, drei Wellen, dann öffnet er sich wieder (mit einer Truhe) */
function tickEvent(zone: Zone, ev: EventState, now: number) {
  const run = zone.exp!, s = secOf(zone, ev.sec);
  const inside = zone.alivePlayers().filter(p => inSec(s, p.x, p.y, 1));
  if (ev.state === 'idle') {
    if (!inside.length || ev.kind !== 'ambush') return;
    ev.state = 'running'; ev.wave = 0; ev.next = now + 1.4; ev.at = now;
    for (const m of s.mouths) {
      const o = zone.addDynamicObj('door', m.x, m.y, { cells: m.cells, orient: m.orient, ambush: 1 }, 'ambush');
      zone.setObjState(o, 0);
      ev.barriers.push(o);
      for (const p of zone.alivePlayers()) if (m.cells.includes(Math.floor(p.y / TILE) * zone.map.w + Math.floor(p.x / TILE))) { p.x = s.entry.x; p.y = s.entry.y; p.epoch++; p.send({ t: 'pos', x: p.x, y: p.y, e: p.epoch }); }
    }
    zone.ev({ k: 'sfx', n: 'boss_roar' });
    for (const p of zone.players.values()) p.toast('Hinterhalt! Wurzeln schließen den Raum. Haltet drei Wellen stand!', 'story');
    sendInfo(zone);
    return;
  }
  if (ev.state !== 'running') return;
  for (const m of [...ev.mobs]) if (m.dead) ev.mobs.delete(m);
  if (!inside.length) { // alle gefallen oder geflohen: der Hinterhalt beginnt von vorn
    for (const m of ev.mobs) { m.dead = true; zone.mobs.delete(m.id); zone.ev({ k: 'mob-', id: m.id }); }
    ev.mobs.clear(); clearBarriers(zone, ev); ev.state = 'idle';
    sendInfo(zone); return;
  }
  if (ev.mobs.size) return;
  if (!ev.next) { ev.next = now + 2.2; return; }
  if (now < ev.next) return;
  ev.next = 0;
  if (ev.wave >= ev.waves) {
    clearBarriers(zone, ev); ev.state = 'done';
    zone.addDynamicObj('chest', (s.cx + 0.5) * TILE, (s.cy + 0.5) * TILE, { tier: 'silver', label: 'Beute des Hinterhalts' });
    zone.ev({ k: 'sfx', n: 'puzzle_solved' });
    for (const p of zone.players.values()) p.toast('Der Hinterhalt ist überstanden. Die Wurzeln ziehen sich zurück.', 'good');
    sendInfo(zone); return;
  }
  ev.wave++;
  const mix = EXPEDITIONS[run.exp].mobs[s.look as 0 | 1] ?? EXPEDITIONS[run.exp].mobs[0];
  const n = 3 + ev.wave + Math.floor(inside.length / 2);
  const lvl = levelFor(run, zone.map.def.level[0] + Math.round((zone.map.def.level[1] - zone.map.def.level[0]) * 0.7));
  for (let i = 0; i < n; i++) {
    for (let t = 0; t < 30; t++) {
      const x = (zone.rng.int(s.x0 + 1, s.x1 - 1) + 0.5) * TILE, y = (zone.rng.int(s.y0 + 1, s.y1 - 1) + 0.5) * TILE;
      if (!circleFree(zone.solidWalk, x, y, 8) || inside.some(p => Math.hypot(p.x - x, p.y - y) < 60)) continue;
      const m = makeMob(zone, zone.rng.weighted(mix), lvl, x, y, ev.wave === ev.waves && i === 0, -200 - ev.wave, -1);
      m.awake = true; m.state = 'chase'; m.target = zone.rng.pick(inside);
      zone.ev({ k: 'mob+', m: m.info() }); zone.ev({ k: 'fx', n: 'spawn', x, y, el: m.element });
      ev.mobs.add(m);
      break;
    }
  }
  for (const p of zone.players.values()) p.toast(`Welle ${ev.wave} von ${ev.waves}!`, 'bad');
  sendInfo(zone);
}
function clearBarriers(zone: Zone, ev: EventState) {
  for (const o of ev.barriers) { zone.setObjState(o, 1); zone.objs.delete(o.id); zone.ev({ k: 'obj-', id: o.id }); }
  ev.barriers = [];
}

// =====================================================================================================================
//  Abschluss
// =====================================================================================================================
function reveal(zone: Zone) {
  const run = zone.exp!, info = zone.map.exp!, now = zone.game.now, d = EXP_DIFF[run.diff];
  run.done!.revealed = true;
  run.returnAt = now + EXP_CFG.returnSec;
  for (const o of zone.objs.values()) if (o.type === 'door' && o.props?.seal === 'boss' && o.state === 0) zone.setObjState(o, 1);
  const { x, y } = info.reward;
  zone.addDynamicObj('xobj', x, y + 2 * TILE, { kind: 'return', frame: 'expedition_portal', label: 'Heimweg', prompt: 'Gemeinsam zurückkehren', light: [110, 0x9fe8ff, 1] }, 'return');
  const deaths = [...zone.players.values()].reduce((a, p) => a + p.char.deaths - (run.d0.get(p.charId) ?? p.char.deaths), 0);
  if (d.noDeathChest && deaths === 0) zone.addDynamicObj('chest', x - 4 * TILE, y + 1 * TILE, { tier: 'gold', xb: 'nodeath', label: 'Truhe der Unversehrten' });
  if (d.timedChest && run.done!.sec <= expPar(EXPEDITIONS[run.exp])) zone.addDynamicObj('chest', x + 4 * TILE, y + 1 * TILE, { tier: 'gold', xb: 'timed', label: 'Truhe der Eile' });
  Social.groupChest(zone, x, y - 4 * TILE);
  // wer außerhalb der Belohnungskammer steht, holt das Licht zu seiner Gruppe
  const rs = info.sections.find(s => s.role === 'reward')!;
  for (const p of zone.players.values()) {
    if (p.dead) { p.dead = false; p.hp = Math.round(p.stats.maxHp * 0.5); }
    if (!inSec(rs, p.x, p.y)) { p.x = x + zone.rng.range(-20, 20); p.y = y + 3 * TILE; p.epoch++; p.send({ t: 'pos', x: p.x, y: p.y, e: p.epoch }); zone.ev({ k: 'fx', n: 'blink', x: p.x, y: p.y, el: 'light' }); }
    const res = run.results.get(p.charId);
    if (res) p.send({ t: 'exp', result: res });
  }
  zone.ev({ k: 'sfx', n: 'teleport' });
  sendInfo(zone);
}
function returnAll(zone: Zone) {
  const run = zone.exp!, game = zone.game, t = returnSpot();
  if (run.returned) return;
  run.returned = true;
  const list = [...zone.players.values()];
  list.forEach((p, i) => {
    const a = (i / Math.max(1, list.length)) * Math.PI * 2;
    if (p.dead) { p.dead = false; p.hp = p.stats.maxHp; }
    game.moveTo(p, game.zone(ZONES[t.zone] ? t.zone : 'gruenwald', game.worldKreis(p)), { x: t.x + (list.length > 1 ? Math.cos(a) * 18 : 0), y: t.y + (list.length > 1 ? Math.sin(a) * 12 : 0) });
    p.pev.push({ k: 'fx', n: 'blink', x: p.x, y: p.y, el: 'water' }, { k: 'sfx', n: 'teleport' });
    returnedAt.set(p.charId, game.now);
    const res = run.results.get(p.charId);
    p.send({ t: 'exp', run: null, ...(res ? { summary: res } : {}) });
  });
}

// =====================================================================================================================
//  Einstieg
// =====================================================================================================================
export const Expedition = {
  portals(map: GameMap): Obj[] { return expeditionPortals(map); },
  /** Zonendefinition der Instanz: Stufen nach Kreis und Schwierigkeitsgrad */
  zoneDef(id: string, diff: Difficulty, kreis: number): ZoneDef {
    const base = ZONES[id], d = EXP_DIFF[diff];
    const lv = (v: number) => Math.max(d.lvlMin, kreisLevel(v, kreis) + d.lvlPlus);
    return { ...base, level: [lv(base.level[0]), lv(base.level[1])] };
  },
  bossDef(zone: Zone): BossDef {
    const run = zone.exp!, d = EXP_DIFF[run.diff], b = kreisBossDef(BOSSES[EXPEDITIONS[run.exp].boss], run.kreis);
    return { ...b, level: levelFor(run, BOSSES[EXPEDITIONS[run.exp].boss].level), hpMul: b.hpMul * d.hpMul, dmgMul: b.dmgMul * d.dmgMul };
  },
  bossMech(zone: Zone, bossId: string): EchoMech { return expBossMech(zone, bossId); },
  setup,

  // ---------------------------------------------------------------- Simulation
  tick(zone: Zone, dt: number) {
    const run = zone.exp!, now = zone.game.now;
    tickMinis(zone, now);
    tickPlates(zone, now);
    tickCollapse(zone, now);
    for (const ev of run.events.values()) tickEvent(zone, ev, now);
    // Abschnitte: Anzeige, erster Besuch, Rastplatz
    if (Math.floor(now * 2) !== Math.floor((now - dt) * 2)) {
      for (const p of zone.players.values()) {
        const s = zone.map.exp!.sections.find(x => inSec(x, p.x, p.y));
        if (!s || run.where.get(p.charId) === s.id) continue;
        run.where.set(p.charId, s.id);
        if (!run.seen.has(s.id)) {
          run.seen.add(s.id);
          if (s.role !== 'entrance') for (const q of zone.players.values()) q.send({ t: 'toast', s: `${s.secret ? 'Geheimnis: ' : ''}${s.name}`, kind: 'info', icon: 'map' });
          if (s.role === 'prep' && zone.map.exp!.checkpoint) run.checkpoint = zone.map.exp!.checkpoint;
        }
        sendInfo(zone, p);
      }
    }
    if (run.done && !run.done.revealed && now - run.done.at >= EXP_CFG.revealSec) reveal(zone);
    if (run.done?.revealed && !run.returned) {
      const present = [...zone.players.values()].filter(p => !p.linkdead);
      if (now >= run.returnAt || (present.length && present.every(p => run.votes.has(p.charId)))) returnAll(zone);
    }
    if (now - run.infoAt >= 5) { run.infoAt = now; sendInfo(zone); }
  },
  onJoin(zone: Zone, p: Player) {
    const run = zone.exp!;
    run.members.add(p.charId);
    if (!run.d0.has(p.charId)) run.d0.set(p.charId, p.char.deaths);
    run.where.delete(p.charId);
  },
  onMobDeath(zone: Zone, m: Mob) {
    const run = zone.exp!, now = zone.game.now;
    if (!m.summoned) run.kills++;
    if (miniDown(zone, m)) { sendInfo(zone); return; }
    const aff = run.affix.get(m.id);
    if (!aff) return;
    run.affix.delete(m.id);
    if (aff.includes('brennend')) zone.addFx({ kind: 'zone', x: m.x, y: m.y, r: 30, el: 'fire', dur: 5, until: now + 5, tick: 0.5, nextTick: now + 0.8, hostile: true, raw: m.baseDmg * 0.5, lvl: m.lvl, status: { id: 'burn', dur: 2, chance: 0.5 }, by: 'Brennender ' + m.def.name });
    if (aff.includes('teilend')) for (let i = 0; i < 2; i++) { const s = zone.spawnMob(m.def.id, Math.max(1, m.lvl - 2), m.x + (i ? 10 : -10), m.y); s.maxHp = s.hp = Math.round(s.maxHp * 0.45); s.state = 'chase'; s.target = [...m.hitters][0] ?? null; }
  },
  onSecret(zone: Zone, o: Obj, p: Player | null) {
    const run = zone.exp!, sec = o.props?.sec as string | undefined;
    if (!sec || run.secrets.has(sec)) return;
    run.secrets.add(sec);
    const T = totals(zone);
    for (const q of zone.players.values()) q.toast(`Geheimnis entdeckt${p ? ` von ${p.name}` : ''}: ${secOf(zone, sec).name} (${run.secrets.size}/${T.secrets})`, 'good');
    sendInfo(zone);
  },
  /** Heilende Erwachte (einmal je Sekunde) */
  heal(zone: Zone) {
    const run = zone.exp!;
    for (const [id, aff] of run.affix) {
      if (!aff.includes('heilend')) continue;
      const m = zone.mobs.get(id);
      if (!m || m.dead || !m.awake) continue;
      for (const o of zone.mobs.values()) if (o !== m && !o.dead && o.hp < o.maxHp && Math.hypot(o.x - m.x, o.y - m.y) < 70) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.04); zone.ev({ k: 'fx', n: 'heal', x: o.x, y: o.y, el: 'light' }); }
    }
  },

  /** Interaktion mit einem Objekt. true = hier erledigt. Läuft in jeder Zone (Portale stehen im Hub und in Quellhain). */
  interact(zone: Zone, p: Player, o: Obj): boolean {
    const pr = o.props ?? {};
    if (o.type === 'xobj' && pr.kind === 'portal') { this.sendTo(zone.game, p); return true; }
    const run = zone.exp;
    if (!run) return false;
    const now = zone.game.now;
    if (o.type === 'xobj') {
      switch (pr.kind) {
        case 'checkpoint': {
          run.checkpoint = zone.map.exp!.checkpoint ?? { x: o.x, y: o.y + 18 };
          if (!p.dead) { p.hp = p.stats.maxHp; p.mp = p.stats.maxMp; zone.ev({ k: 'fx', n: 'heal', x: p.x, y: p.y, el: 'water' }); }
          p.toast('Ihr rastet. Wer fällt, kehrt ab jetzt hierher zurück.', 'good');
          p.pev.push({ k: 'sfx', n: 'heal' });
          return true;
        }
        case 'altar': { const r = run.results.get(p.charId); if (r && run.done?.revealed) p.send({ t: 'exp', result: r }); else p.toast('Der Altar ist kalt. Noch nicht.', 'info'); return true; }
        case 'return': {
          if (!run.done?.revealed) return true;
          run.votes.add(p.charId);
          const present = [...zone.players.values()].filter(q => !q.linkdead);
          if (present.every(q => run.votes.has(q.charId))) returnAll(zone);
          else { for (const q of zone.players.values()) q.toast(`${p.name} ist bereit für den Heimweg (${run.votes.size}/${present.length}).`, 'info'); sendInfo(zone); }
          return true;
        }
        case 'rune': return puzzleInteract(zone, p, o);
      }
      return true;
    }
    if ((o.type === 'brazier' || o.type === 'lever') && pr.psec) return puzzleInteract(zone, p, o);
    if (o.type === 'door' && o.state === 0) {
      if (pr.ambush) { p.toast('Die Wurzeln geben nicht nach, solange der Hinterhalt dauert.', 'bad'); return true; }
      if (typeof pr.seal === 'string' && pr.seal.startsWith('pz:') && !run.puzzles.get(pr.seal.slice(3))?.solved) { p.toast('Versiegelt. Das Rätsel dieses Abschnitts hält das Tor.', 'bad'); p.pev.push({ k: 'sfx', n: 'door_locked' }); return true; }
      if (pr.seal === 'boss' && !run.done?.revealed) { p.toast('Dahinter wartet, was der Sieg verspricht. Erst der Kampf.', 'bad'); p.pev.push({ k: 'sfx', n: 'door_locked' }); return true; }
    }
    if (o.type === 'bossdoor' && pr.sealed) { p.toast('Die Arena ist versiegelt. Das Portal in der Belohnungskammer bringt euch heim.', 'info'); return true; }
    if (o.type === 'chest') {
      if (pr.mini && [...run.miniMobs.values()].some(s => s.id === pr.mini && !s.mob.dead)) { p.toast(`${MINIS[pr.mini]?.name ?? 'Der Mini-Boss'} bewacht diese Truhe.`, 'bad'); return true; }
      if (pr.xb) {
        if (o.looted!.has(p.charId)) return true;
        o.looted!.add(p.charId);
        p.pev.push({ k: 'obj', id: o.id, state: 1 }, { k: 'sfx', n: 'chest_open' });
        const r = zone.rng, ilvl = zone.def.level[1] + 2, w = [0, 0, 30, 50, 20];
        p.give(generateGear(r, ilvl, Math.max(3, rollRarity(r, w)), p.char.cls));
        p.give(makeStack('gem', r.int(1, 3)));
        return true;
      }
    }
    if (o.type === 'node' && pr.rare && (o.harvested!.get(p.charId) ?? 0) <= now) { p.give(makeStack('gem')); p.toast('Eine seltene Ader – ein Edelstein fällt dir in die Hand.', 'loot'); }
    return false;
  },
  /** Ausgänge: aus der Expedition hinaus – und die alten Dungeon-Eingänge der Oberwelt führen jetzt in die Expedition. */
  useExit(zone: Zone, p: Player, o: Obj): boolean {
    const game = zone.game, now = game.now;
    if (zone.exp) { leave(game, p, 'Du verlässt die Expedition. Solange deine Gruppe drin ist, kannst du zurück.'); return true; }
    const id = EXP_BY_LEGACY[o.props?.to];
    if (!id || zone.rift) return false;
    const say = (s: string) => { if (now - p.msgAt > 3) { p.msgAt = now; reject(p, s); } };
    const u = expUnlock(p.char, id);
    if (!u.ok) { say(`${EXPEDITIONS[id].name} ist noch verschlossen: ${u.reqs.filter(r => !r.ok).map(r => r.text).join(', ')}.`); return true; }
    const running = runFor(game, p);
    if (running) {
      if (running.exp!.exp !== id) { say(`Deine Gruppe ist gerade in ${EXPEDITIONS[running.exp!.exp].name}. Erst dort fertig werden.`); return true; }
      if (running.exp!.done) { say('Dieser Lauf ist schon vorbei.'); return true; }
      enter(game, p, running, { zone: zone.id, x: p.x, y: p.y + 2 * TILE });
      return true;
    }
    const back = getMap(zone.id).entries[EXPEDITIONS[id].legacy!] ?? { x: p.x, y: p.y + 2 * TILE };
    startRun(game, p, id, 'normal', [p], { zone: zone.id, x: back.x, y: back.y });
    return true;
  },
  respawn(game: Game, p: Player) {
    const z = p.zone, run = z.exp!;
    game.moveTo(p, z, run.checkpoint ?? z.map.start);
    for (const ev of run.events.values()) if (ev.state === 'running') sendInfo(z);
  },

  /** Der Endboss ist gefallen (Aufruf aus BossCtl.finish). Ein zweites Bossende im selben Lauf tut nichts. */
  bossDown(zone: Zone, boss: BossCtl) {
    const run = zone.exp!, game = zone.game;
    if (run.done) return;
    run.done = { sec: Math.max(1, Math.round(game.now - run.startAt)), at: game.now, revealed: false };
    for (const p of zone.players.values()) {
      if (p.dead) { p.dead = false; p.hp = Math.round(p.stats.maxHp * 0.5); p.toast('Der Sieg deiner Gruppe reißt dich zurück ins Leben.', 'good'); }
      const res = grant(zone, p);
      if (res) run.results.set(p.charId, res);
      game.savePlayer(p);
    }
    // die Arena versiegelt sich: Tor zu, Siegel an jeder Mündung außer zur Belohnungskammer
    for (const o of zone.objs.values()) if (o.type === 'bossdoor') { if (o.state !== 0) zone.setObjState(o, 0); o.props!.sealed = 1; }
    const arena = zone.map.exp!.sections.find(s => s.role === 'boss')!;
    const rewardSec = zone.map.exp!.sections.find(s => s.role === 'reward')!;
    for (const m of arena.mouths) if (!rewardSec.mouths.some(r => r.cells.some(c => m.cells.includes(c)) || Math.hypot(r.x - m.x, r.y - m.y) < 6 * TILE)) zone.addDynamicObj('xobj', m.x, m.y, { kind: 'seal', frame: 'boss_seal', label: '', light: [70, 0xffe0a0, 0.6] }, 'seal');
    zone.ev({ k: 'fx', n: 'bossdeath', x: boss.mob.x, y: boss.mob.y, el: boss.def.element });
    zone.ev({ k: 'fx', n: 'explosion', x: boss.mob.x, y: boss.mob.y, r: 120, el: boss.def.element });
    for (const p of zone.players.values()) p.toast(`${boss.def.name} ist besiegt! Die Arena versiegelt sich …`, 'story');
    sendInfo(zone);
  },

  // ---------------------------------------------------------------- Spiel: Nachrichten, Anmeldung, Gruppenwechsel
  message(game: Game, p: Player, m: ExpMsg) {
    const c = p.char;
    switch (m.a) {
      case 'info': return this.sendTo(game, p);
      case 'select': case 'start': {
        const lobby = lobbyOf(game, p);
        if (m.a === 'start' && lobby) {
          if (lobby.lead !== p) return reject(p, 'Nur wer die Gruppe anführt, startet.');
          if (!nearPortal(p)) return reject(p, 'Dafür musst du am Expeditionsportal stehen.');
          const online = [...lobby.party.members].filter(q => !q.linkdead);
          const wait = online.filter(q => !lobby.ready.has(q.charId));
          if (wait.length) return reject(p, `Noch nicht bereit: ${wait.map(q => q.name).join(', ')}.`);
          const busy = online.filter(q => q.zone.exp || q.zone.rift || q.dead);
          if (busy.length) return reject(p, `Gerade verhindert: ${busy.map(q => q.name).join(', ')}.`);
          lobbiesOf(game).delete(lobby.party); sendLobby(game, null, lobby.party);
          startRun(game, p, lobby.exp, lobby.diff, online);
          return;
        }
        const id = String(m.id ?? ''), diff = (m.diff ?? 'normal') as Difficulty;
        if (!EXPEDITIONS[id] || !DIFFICULTIES.includes(diff)) return;
        if (p.dead || p.zone.exp || p.zone.rift) return;
        if (!nearPortal(p)) return reject(p, 'Dafür musst du am Expeditionsportal stehen.');
        const block = diffBlock(c, id, diff);
        if (block) return reject(p, block);
        if (runFor(game, p)) return reject(p, 'Deine Gruppe hat bereits eine laufende Expedition – tritt ihr bei.');
        const others = p.party ? [...p.party.members].filter(q => q !== p && !q.linkdead) : [];
        if (!others.length) { startRun(game, p, id, diff, [p]); return; }
        if (p.party!.leader !== p) return reject(p, 'Nur wer die Gruppe anführt, wählt die Expedition.');
        const l: Lobby = { exp: id, diff, party: p.party!, lead: p, ready: new Set([p.charId]), until: game.now + EXP_CFG.lobbySec };
        lobbiesOf(game).set(p.party!, l);
        sendLobby(game, l, p.party!);
        for (const q of others) q.toast(`${p.name} wählt ${EXPEDITIONS[id].name} (${DIFFICULTY_NAME[diff]}). Bist du bereit? (Fenster „Expedition“)`, 'story');
        return;
      }
      case 'ready': case 'unready': {
        const l = lobbyOf(game, p);
        if (!l) return;
        if (m.a === 'ready') { const b = diffBlock(c, l.exp, l.diff); if (b) return reject(p, b); l.ready.add(p.charId); } else if (l.lead !== p) l.ready.delete(p.charId);
        sendLobby(game, l, l.party);
        return;
      }
      case 'cancel': {
        const l = lobbyOf(game, p);
        if (!l) return;
        if (l.lead === p) { lobbiesOf(game).delete(l.party); sendLobby(game, null, l.party); for (const q of l.party.members) if (q !== p) q.toast(`${p.name} hat die Auswahl abgebrochen.`, 'info'); }
        else { l.ready.delete(p.charId); sendLobby(game, l, l.party); }
        return;
      }
      case 'join': {
        if (p.dead || p.zone.exp || p.zone.rift) return;
        if (!nearPortal(p)) return reject(p, 'Dafür musst du am Expeditionsportal stehen.');
        const z = runFor(game, p);
        if (!z) return reject(p, 'Deine Gruppe hat gerade keine laufende Expedition.');
        if (z.exp!.done) return reject(p, 'Dieser Lauf ist schon vorbei.');
        if (diffBlock(c, z.exp!.exp, z.exp!.diff) && !z.exp!.members.has(p.charId)) return reject(p, 'Dieser Schwierigkeitsgrad ist für dich noch nicht freigeschaltet.');
        enter(game, p, z);
        return;
      }
      case 'leave': if (p.zone.exp) leave(game, p, 'Du verlässt die Expedition. Solange deine Gruppe drin ist, kannst du zurück.'); return;
      case 'return': { const o = [...p.zone.objs.values()].find(x => x.props?.kind === 'return'); if (o && Math.hypot(o.x - p.x, o.y - p.y) < 120) this.interact(p.zone, p, o); return; }
      case 'forge': {
        if ((returnedAt.get(p.charId) ?? -1e9) < game.now - 600 || p.zone.exp) return;
        const npc = [...p.zone.objs.values()].find(o => o.type === 'npc' && NPCS[o.tag!]?.services?.includes('upgrade'));
        if (!npc) return reject(p, 'Hier gibt es keine Schmiede.');
        p.x = npc.x; p.y = npc.y + 22; p.epoch++; p.send({ t: 'pos', x: p.x, y: p.y, e: p.epoch });
        p.send({ t: 'exp', forge: npc.tag });
        return;
      }
    }
  },
  /** Stand für das Auswahlfenster: Bereitschaftsprüfung, laufende Instanz der Gruppe, Herausforderung der Woche */
  sendTo(game: Game, p: Player) {
    const l = lobbyOf(game, p), z = runFor(game, p), w = weeklyNow();
    p.send({ t: 'exp', lobby: l ? lobbyInfo(game, l) : null, party: z && !z.exp!.done ? { exp: z.exp!.exp, diff: z.exp!.diff, n: z.players.size } : null,
      weekly: { ...w, done: !!p.char.flags[weeklyFlag(w.week)] }, ...(p.zone.exp ? { run: runInfo(p.zone, p) } : {}) });
  },
  /** Anmeldung: Wer in einer Expedition gespeichert wurde, kehrt in seinen laufenden Lauf zurück – sonst zum Portal. Wer noch in einem alten Dungeon stand, steht an dessen Eingang. */
  entry(game: Game, p: Player): { zone: Zone; pos: { x: number; y: number } } | null {
    const c = p.char;
    if (isExpedition(c.zone)) {
      for (const z of runs(game)) if (z.exp!.exp === c.zone && z.exp!.members.has(p.charId) && !z.exp!.returned) return { zone: z, pos: { x: c.x, y: c.y } };
      const t = returnSpot();
      return { zone: game.zone(t.zone, kreisOf(c)), pos: { x: t.x, y: t.y } };
    }
    const id = EXP_BY_LEGACY[c.zone];
    if (id) {
      const parent = EXPEDITIONS[id].parent, m = getMap(parent), e = m.entries[c.zone] ?? m.start;
      return { zone: game.zone(parent, kreisOf(c)), pos: { x: e.x, y: e.y } };
    }
    return null;
  },
  /** Gruppenwechsel: Wer nicht mehr zur Gruppe des Laufs gehört, verlässt die Instanz. true = Expedition (Game.rehome tut nichts weiter). */
  rehome(game: Game, p: Player): boolean {
    const run = p.zone.exp;
    if (!run) return false;
    if (run.party && p.party !== run.party && !run.done) leave(game, p, 'Du gehörst nicht mehr zur Gruppe dieser Expedition und kehrst zurück.');
    return true;
  },
  /** Entwickler-Befehle: /exp id [schwierigkeit] (startet hier), /expgo abschnitt, /expsieg */
  dev(game: Game, p: Player, cmd: string, a: string[]): boolean {
    if (cmd === 'exp') {
      const id = EXPEDITIONS[a[0]] ? a[0] : 'exp_gruenwald', diff = (DIFFICULTIES.includes(a[1] as Difficulty) ? a[1] : 'normal') as Difficulty;
      if (p.zone.exp) leave(game, p);
      const members = p.party ? [...p.party.members].filter(q => !q.linkdead && q.zone === p.zone) : [p];
      startRun(game, p, id, diff, members.length ? members : [p]);
      return true;
    }
    if (cmd === 'expgo' && p.zone.exp) {
      const s = p.zone.map.exp!.sections.find(x => x.id === a[0]) ?? p.zone.map.exp!.sections.find(x => x.role === (a[0] ?? 'boss'));
      if (s) { p.x = s.entry.x; p.y = s.entry.y; p.epoch++; p.send({ t: 'pos', x: p.x, y: p.y, e: p.epoch }); }
      else p.toast('Abschnitte: ' + p.zone.map.exp!.sections.map(x => x.id).join(', '));
      return true;
    }
    if (cmd === 'expsieg' && p.zone.boss && p.zone.exp) { const b = p.zone.boss; if (!b.active) { const a2 = p.zone.map.bossRoom!; p.x = (a2.cx + 0.5) * TILE; p.y = (a2.cy + 3) * TILE; } p.zone.hitMob(b.mob, p, 1e9, 'phys'); return true; }
    return false;
  },
  dumpInfo: runInfo,
};
void ([] as EventState[]);
