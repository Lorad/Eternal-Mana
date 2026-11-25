/**
 * Quellwarte (0.9) – Einstiegspunkt für die Kernklassen: der Hub als EINE Instanz für alle, seine Einrichtungen, das Tor in
 * Quellhain, die Spaziergänger, Gruppengesuche, der Hinweis für ältere Charaktere. `Game`, `Zone` und die Truhe (home) rufen nur
 * die Funktionen dieses Objekts. Was geht und was es kostet, steht in shared/src/data/hubdata.ts (dieselben Regeln wie in der
 * Oberfläche); hier wird zusätzlich geprüft, ob der Spieler wirklich an der Einrichtung steht.
 *
 * Bereits vorhandene Systeme werden angebunden, nicht nachgebaut: Schmiede und Alchemie sind Stationen (STATION_NPCS),
 * Verbessern und Zurücksetzen sind NPC-Dienste, das Lagerhaus ist die Profil-Truhe (home/storage.ts), die Gruppe die aus 0.7.
 */
import { CFG } from '../../../shared/src/config';
import { FACILITIES, effRank, hubPeriod, lagerRows, lfgNote, LFG_GOAL, masteryBlock, masteryCost, masteryOf, rowBlock, rowPrice, traderGot, traderLevel, traderStock } from '../../../shared/src/data/hubdata';
import { HUB_ZONE, type Facility } from '../../../shared/src/data/hub';
import { newUid } from '../../../shared/src/data/items';
import { HUB_MAIN_QUEST, HUB_NEW_FLAG, HUB_OLD_FLAG } from '../../../shared/src/data/quests_hub';
import { SKILLS } from '../../../shared/src/data/skills';
import { ZONES } from '../../../shared/src/data/zones';
import { HUB_LAYOUT } from '../../../shared/src/maps/hubgen';
import { getMap, type GameMap } from '../../../shared/src/maps/mapgen';
import { T, TILE } from '../../../shared/src/maps/tiles';
import type { ClientMsg, HubStock, LfgEntry, PlayerInfo } from '../../../shared/src/types';
import type { Game } from '../game';
import { acc, flush, touch } from '../home/state';
import { nextId, type Player } from '../player';
import type { Obj, Zone } from '../zone';
import { tickWalkers } from './walkers';

type HubMsg = Extract<ClientMsg, { t: 'hub' }>;
const H = CFG.hub;
function reject(p: Player, s: string) { p.toast(s, 'bad'); p.pev.push({ k: 'sfx', n: 'ui_error' }); }

// ------------------------------------------------------------------ Zustand (hängt am Game, wird nie gespeichert)
interface Lfg { goal: string; note: string; at: number }
interface HubState { lfg: Map<number, Lfg> }
const ST = new WeakMap<Game, HubState>();
const st = (g: Game): HubState => { let s = ST.get(g); if (!s) ST.set(g, (s = { lfg: new Map() })); return s; };

/** Uhr für Tag und Woche des Händlers (Tests stellen sie) */
export const hubClock = { now: () => Date.now() };

// ------------------------------------------------------------------ Tor in Quellhain
const GATE = { zone: 'gruenwald', poi: 'dorf', dx: -10, dy: -9 };
let gateCache: { x: number; y: number } | null | undefined;
/** Platz des Tors zur Quellwarte: nächste freie, geräumige Kachel abseits der Wege nahe am Dorf (die Karte bleibt unverändert). */
export function gateSpot(): { x: number; y: number } | null {
  if (gateCache !== undefined) return gateCache;
  const map = getMap(GATE.zone), poi = map.def.pois?.find(p => p.id === GATE.poi);
  gateCache = null;
  if (!poi) return null;
  const I = (x: number, y: number) => y * map.w + x;
  const open = (x: number, y: number) => x >= 2 && y >= 2 && x < map.w - 2 && y < map.h - 2 && !map.solid[I(x, y)] && map.tiles[I(x, y)] !== T.BRIDGE && map.tiles[I(x, y)] !== T.HAZARD;
  const roomy = (x: number, y: number) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -1; dx <= 1; dx++) if (!open(x + dx, y + dy)) return false; return true; };
  const taken = (tx: number, ty: number) => map.objects.some(o => Math.abs(Math.floor(o.x / TILE) - tx) <= 3 && Math.abs(Math.floor(o.y / TILE) - ty) <= 3);
  for (let r = 0; r <= 9 && !gateCache; r++) for (let oy = -r; oy <= r && !gateCache; oy++) for (let ox = -r; ox <= r && !gateCache; ox++) {
    if (Math.max(Math.abs(ox), Math.abs(oy)) !== r) continue;
    const tx = poi.x + GATE.dx + ox, ty = poi.y + GATE.dy + oy;
    if (roomy(tx, ty) && !taken(tx, ty)) gateCache = { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
  }
  return gateCache;
}
const gateProps = (to: string, label: string, prompt: string) => ({ frame: 'portal', label, prompt, light: [90, 0x80ff90, 0.9], hub: 'tor', to });

// ------------------------------------------------------------------ Nähe zu Einrichtungen
export const inHub = (p: Player) => p.zone.def.kind === 'hub';
/** Steht der Spieler in der Quellwarte an dieser Einrichtung (ihr Hüter oder eines ihrer Objekte in Reichweite)? */
export function atFacility(p: Player, fac: Facility, r = H.useRadius): boolean {
  if (!inHub(p) || p.dead) return false;
  const npc = FACILITIES[fac].npc;
  for (const o of p.zone.objs.values()) {
    if (Math.hypot(o.x - p.x, o.y - p.y) > r) continue;
    if ((o.type === 'npc' && npc && o.tag === npc) || (o.type === 'qobj' && o.props?.fac === fac)) return true;
  }
  return false;
}

// ------------------------------------------------------------------ Händler
function stockFor(p: Player): HubStock {
  const per = hubPeriod(hubClock.now()), lvl = traderLevel(p.char);
  const offers = traderStock(p.char.cls, lvl, per.day, per.week).map((o, i) => ({ item: o.item, price: o.price, weekly: o.weekly, got: traderGot(p.char, i, per.day, per.week) ? (1 as const) : undefined }));
  return { day: per.day, week: per.week, lvl, next: per.next, nextWeek: per.nextWeek, offers };
}
function buy(g: Game, p: Player, m: HubMsg) {
  const c = p.char, per = hubPeriod(hubClock.now()), lvl = traderLevel(c), idx = Math.floor(Number(m.idx));
  const resend = () => p.send({ t: 'hub', stock: stockFor(p) });
  if (m.day !== per.day || (m.lvl !== undefined && m.lvl !== lvl)) { reject(p, 'Ottmar hat inzwischen umgeräumt. Sieh dir das neue Angebot an.'); return resend(); }
  const list = traderStock(c.cls, lvl, per.day, per.week), e = list[idx];
  if (!e) return;
  if (traderGot(c, idx, per.day, per.week)) return reject(p, e.weekly ? 'Das Stück der Woche gibt es nur einmal. „Sonst wäre es ja das Stück der Wochen“, sagt Ottmar.' : 'Davon hatte Ottmar nur eines. Morgen kommt neue Ware.');
  if (c.gold < e.price) return reject(p, 'Nicht genug Gold.');
  const it = { ...e.item, uid: newUid(), affixes: e.item.affixes.map(a => [...a] as typeof a) };
  if (!p.addItem(it)) return reject(p, 'Inventar voll.');
  c.gold -= e.price;
  const s = c.hubShop && c.hubShop.day === per.day ? { ...c.hubShop, got: [...c.hubShop.got] } : { day: per.day, got: [] as number[], week: c.hubShop?.week ?? per.week, wgot: c.hubShop?.wgot };
  if (s.week !== per.week) { s.week = per.week; delete s.wgot; }
  if (e.weekly) s.wgot = 1; else s.got.push(idx);
  if (!s.wgot) delete s.wgot;
  c.hubShop = s;
  p.sync('gold', 'hubShop');
  p.pev.push({ k: 'sfx', n: 'buy' });
  p.checkCollectQuests();
  g.savePlayer(p);
  resend();
}

// ------------------------------------------------------------------ Gruppengesuche
function lfgList(g: Game): LfgEntry[] {
  const out: LfgEntry[] = [], now = g.now;
  for (const [charId, e] of st(g).lfg) {
    const q = g.players.get(charId);
    if (!q || q.linkdead) continue;
    const size = q.party ? q.party.members.size + q.party.seats.size : 1;
    out.push({ id: q.id, name: q.name, cls: q.char.cls, level: q.level, goal: e.goal, note: e.note || undefined, size, lead: !q.party || q.party.leader === q, zone: q.zone.id, sec: Math.round(now - e.at) });
  }
  return out.sort((a, b) => a.sec - b.sec);
}
function setLfg(g: Game, p: Player, goal?: string, note?: string) {
  const s = st(g), had = s.lfg.get(p.charId);
  if (goal) s.lfg.set(p.charId, { goal, note: lfgNote(note), at: had?.goal === goal ? had.at : g.now });
  else s.lfg.delete(p.charId);
  if ((had?.goal ?? '') !== (goal ?? '')) g.broadcastPlayerInfo(p);
}

// ------------------------------------------------------------------ Nachrichten
function handle(g: Game, p: Player, m: HubMsg) {
  const c = p.char;
  switch (String(m.a)) {
    case 'stock':
      if (!atFacility(p, 'haendler')) return reject(p, 'Ottmars Ware sieht man nur bei Ottmar.');
      return p.send({ t: 'hub', stock: stockFor(p) });
    case 'buy':
      if (!atFacility(p, 'haendler')) return reject(p, 'Ottmars Ware sieht man nur bei Ottmar.');
      return buy(g, p, m);
    case 'master': {
      if (!atFacility(p, 'meister')) return reject(p, 'Meisterränge lehrt Meister Corvin. Persönlich. Mit Stock.');
      const id = String(m.id ?? ''), sk = SKILLS[id];
      const why = masteryBlock(c, id);
      if (why || !sk) return reject(p, why ?? 'Unbekannte Fähigkeit.');
      const next = masteryOf(c, id) + 1, cost = masteryCost(sk, next);
      c.gold -= cost.gold;
      for (const [b, n] of cost.mats) p.removeItems(b, n);
      c.mastery = { ...(c.mastery ?? {}), [id]: next };
      p.recalc();
      p.sync('gold', 'inv', 'mastery');
      p.toast(`${sk.name}: Meisterrang ${next}. Die Technik wirkt jetzt wie Rang ${effRank(c, id)}.`, 'good');
      p.zone.ev({ k: 'fx', n: 'levelup', x: p.x, y: p.y });
      p.pev.push({ k: 'sfx', n: 'quest_complete' });
      g.savePlayer(p);
      return;
    }
    case 'row': {
      if (!atFacility(p, 'lager')) return reject(p, 'Regale verkauft Fridolin. Im Lagerhaus.');
      const a = acc(g, p.accountId), h = a.h, why = rowBlock(c, h);
      if (why) return reject(p, why);
      const price = rowPrice(h);
      c.gold -= price;
      h.rows = lagerRows(h) + 1;
      touch(g, p.accountId, 'rows');
      p.sync('gold');
      p.toast(`Fridolin stellt ein neues Regal auf: ${H.lager.row} Plätze mehr in der Truhe – für alle deine Charaktere.`, 'good');
      p.pev.push({ k: 'sfx', n: 'buy' });
      g.savePlayer(p);
      flush(g, p);
      return;
    }
    case 'lfg': {
      const goal = m.goal ? String(m.goal) : '';
      if (goal && !LFG_GOAL[goal]) return;
      if (goal && !inHub(p)) return reject(p, 'Gesuche hängt man am Brett in der Quellwarte aus.');
      if (goal && p.party && p.party.leader !== p) return reject(p, 'Für die Gruppe sucht, wer sie anführt.');
      setLfg(g, p, goal || undefined, m.note);
      p.send({ t: 'hub', lfg: lfgList(g) });
      return;
    }
    case 'board': return p.send({ t: 'hub', lfg: lfgList(g) });
  }
}

export const Hub = {
  /** Die eine Instanz der Quellwarte */
  zone(g: Game): Zone { return g.zone(HUB_ZONE); },
  /** Server-Objekte, die nicht in der Karte stehen: das Tor zur Quellwarte in Quellhain */
  gates(map: GameMap): Obj[] {
    if (map.id !== GATE.zone) return [];
    const s = gateSpot();
    return s ? [{ id: nextId(), type: 'qobj', x: s.x, y: s.y, state: 0, tag: 'qw_tor', props: { sid: 'qw_tor', ...gateProps(HUB_ZONE, 'Quellwarte', 'Durch das Tor zur Quellwarte') } }] : [];
  },
  /** Objekte der Quellwarte (`qobj`): das Tor führt hinüber, alles andere öffnet ein Fenster der Oberfläche. */
  interact(z: Zone, p: Player, o: Obj): boolean {
    if (o.type !== 'qobj') return false;
    const g = z.game, tag = String(o.tag ?? '');
    if (tag === 'qw_tor') { Hub.travel(g, p); return true; }
    if (tag === 'tor') {
      const s = gateSpot();
      z.ev({ k: 'fx', n: 'blink', x: p.x, y: p.y, el: 'earth' });
      g.transfer(p, GATE.zone, '', s ? { x: s.x, y: s.y + 26 } : undefined);
      p.pev.push({ k: 'sfx', n: 'teleport' });
      return true;
    }
    if (o.props?.fac === 'gruppe') p.send({ t: 'hub', lfg: lfgList(g) });
    p.send({ t: 'hub', open: tag });
    return true;
  },
  /** Zur Quellwarte (Tor in Quellhain, Dev-Befehl) – Ankunft vor dem Tor bzw. am Quellstein */
  travel(g: Game, p: Player, atStone = false) {
    if (p.dead) return;
    const z = Hub.zone(g), [gx, gy] = HUB_LAYOUT.gate, [sx, sy] = HUB_LAYOUT.stone;
    p.zone.ev({ k: 'fx', n: 'blink', x: p.x, y: p.y, el: 'water' });
    g.moveTo(p, z, atStone ? { x: sx * TILE + 8, y: sy * TILE + 8 + 18 } : { x: gx * TILE + 8, y: (gy - 2) * TILE + 8 });
    p.pev.push({ k: 'sfx', n: 'teleport' });
  },
  message(g: Game, p: Player, m: HubMsg) {
    if (p.dead || !m || typeof m.a !== 'string') return;
    handle(g, p, m);
  },
  /**
   * Charakter betritt die Welt: Die Quellwarte ist von Anfang an über jeden Quellstein erreichbar. Neue Charaktere bekommen
   * den Schritt der ersten Hauptquest, ältere (Geschichte schon begonnen) einmal einen Hinweis.
   */
  onEnter(g: Game, p: Player) {
    const c = p.char;
    if (!c.flags[`t:${HUB_ZONE}`]) { c.flags[`t:${HUB_ZONE}`] = 1; p.sync('flags'); }
    if (c.flags[HUB_NEW_FLAG] || c.flags[HUB_OLD_FLAG]) return;
    const old = c.quests.m_erwachen?.s === 'done' || c.quests[HUB_MAIN_QUEST] !== undefined || c.level > 3;
    c.flags[old ? HUB_OLD_FLAG : HUB_NEW_FLAG] = 1;
    p.sync('flags');
    if (old) p.send({ t: 'story', id: 'quellwarte', title: 'Die Quellwarte ist offen', lines: [
      'Über dem Netz der Quellsteine steht wieder Licht in den Fenstern: Die Quellwarte, die alte Wache der Hüter, hat ihre Tore geöffnet.',
      'Schmiede, Händler mit täglich neuer Ware, Alchemie, ein Fähigkeitenmeister, ein Lagerhaus mit deiner Truhe, ein Gasthaus voller Gerüchte, eine Trophäenhalle – und ein Portal in die Tiefe.',
      'Reise über jeden Quellstein hin (Karte → „Zur Quellwarte“) oder nimm das Tor am Rand von Quellhain. Hanne hält dir einen Platz am Tresen frei. Sagt sie. Sie sagt es zu allen.'] });
    void g;
  },
  /** Zusatz zur Spieler-Info: Gruppengesuch (Fähnchen über dem Kopf) */
  info(g: Game, p: Player): Pick<PlayerInfo, 'lfg'> { const e = st(g).lfg.get(p.charId); return e ? { lfg: e.goal } : {}; },
  /** Spieler verlässt die Welt: sein Gesuch verschwindet */
  onRemove(g: Game, p: Player) { st(g).lfg.delete(p.charId); },
  tick(g: Game, dt: number) {
    const z = g.zones.get(HUB_ZONE);
    if (z?.players.size) tickWalkers(z, g.now);
    const s = st(g);
    for (const [charId, e] of s.lfg) {
      const q = g.players.get(charId);
      const full = q?.party && q.party.members.size + q.party.seats.size >= CFG.social.partyMax;
      if (!q || g.now - e.at > H.lfgSec || full || (q.party && q.party.leader !== q)) { s.lfg.delete(charId); if (q) g.broadcastPlayerInfo(q); }
    }
    void dt;
  },
  /** /warte – zur Quellwarte (am Quellstein) */
  dev(g: Game, p: Player, cmd: string): boolean {
    if (cmd !== 'warte') return false;
    Hub.travel(g, p, true);
    return true;
  },
  lfgList, stockFor, atFacility, gateSpot, state: st,
};

/** Die Quellwarte ist EINE Instanz für alle – auch für Spieler eines Neuen Kreises. */
export const isHubZone = (id: string) => ZONES[id]?.kind === 'hub';
