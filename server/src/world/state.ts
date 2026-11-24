/**
 * Lebendige Welt (0.6) – gemeinsamer Zustand und Hilfen der Weltsysteme.
 * Zustand hängt per WeakMap an `Game` bzw. `Zone`; die Kernklassen bleiben unverändert.
 * Grundsatz: Zonen ohne Spieler werden nicht simuliert – alles hier läuft nur aus `Zone.update` heraus oder ist ein
 * einzelner Zeitvergleich im Spieltakt.
 */
import { circleFree } from '../../../shared/src/collision';
import { CFG } from '../../../shared/src/config';
import { ENEMIES } from '../../../shared/src/data/enemies';
import { seasonAt, type EncounterKind, type EventDef } from '../../../shared/src/data/events';
import type { RareDef, Season, WorldBossDef } from '../../../shared/src/data/rares';
import type { RoutineDef } from '../../../shared/src/data/routines';
import { TILE } from '../../../shared/src/maps/tiles';
import type { ItemInstance } from '../../../shared/src/types';
import { freeNear, inSafe } from '../../../shared/src/world';
import type { Game } from '../game';
import type { Player } from '../player';
import { Mob, type Obj, type Zone } from '../zone';

/** Laufendes Ereignis (auch Weltboss). `contrib`: charId → Beitragspunkte */
export interface ActiveEvent {
  id: number; def: EventDef; zone: Zone;
  x: number; y: number;
  startedAt: number; until: number;
  /** läuft erst richtig, sobald jemand da ist */
  engaged: boolean;
  contrib: Map<number, number>;
  mobs: Set<Mob>; objs: Obj[];
  st: any;
  result: 'win' | 'fail' | null;
  paid: Set<number>;
  boss?: WorldBossDef; bossMob?: Mob;
  /** Spieler, denen die Bossleiste gezeigt wird */
  shown: Set<Player>;
  emptySince: number;
  goal: string; prog?: [number, number];
}
export interface RareState { def: RareDef; mob: Mob | null; nextAt: number; spawnedAt: number; st: any; hinted: Set<number> }
export interface RoutineNpc { def: RoutineDef; obj: Obj; home: { x: number; y: number }; stops: { x: number; y: number }[]; cur: number; path: { x: number; y: number }[] | null; seg: number }
export interface Encounter {
  id: number; kind: EncounterKind; zone: Zone; owner: Player;
  x: number; y: number; until: number;
  stage: string; st: any;
  mobs: Set<Mob>; objs: Obj[]; who: Set<Player>;
  done: boolean;
}
export interface TraderState { offers: { item: ItemInstance; price: number; max: number; unique?: string }[]; bought: Map<number, number[]>; npc: Obj }

export interface GameWorld {
  /** Weltzeit beim Start (aus der Datenbank) – Weltzeit = base + game.now */
  base: number;
  season: Season;
  /** nächster Auftritt je Weltboss (Weltzeit) */
  bossNext: Record<string, number>;
  events: Set<ActiveEvent>;
  nextId: number;
  syncT: number; dirty: boolean; loaded: boolean;
  /** false = keine selbstständigen Ereignisse, Monster, Begegnungen (Tests, Messläufe) – erzwungene laufen trotzdem */
  auto: boolean;
}
export interface ZoneWorld {
  nextEventAt: number;
  event: ActiveEvent | null; boss: ActiveEvent | null;
  rares: Map<string, RareState> | null;
  routines: RoutineNpc[] | null;
  encounters: Set<Encounter>;
  lastTick: number; acc: number; slow: number;
  traderVisits: number;
  dirty: boolean;
}
const games = new WeakMap<Game, GameWorld>();
const zones = new WeakMap<Zone, ZoneWorld>();
export function gw(g: Game): GameWorld {
  let s = games.get(g);
  if (!s) games.set(g, (s = { base: 0, season: 0, bossNext: {}, events: new Set(), nextId: 1, syncT: 0, dirty: false, loaded: false, auto: true }));
  return s;
}
export function zw(z: Zone): ZoneWorld {
  let s = zones.get(z);
  if (!s) zones.set(z, (s = { nextEventAt: -1, event: null, boss: null, rares: null, routines: null, encounters: new Set(), lastTick: -1e9, acc: 0, slow: 0, traderVisits: 0, dirty: false }));
  return s;
}
export const worldTime = (g: Game) => gw(g).base + g.now;
export const seasonOf = (g: Game) => seasonAt(worldTime(g));

// ------------------------------------------------------------------ Objekte und Gegner der Weltsysteme
export function addObj(z: Zone, type: string, x: number, y: number, props: Record<string, any>, tag?: string): Obj {
  const o = z.addDynamicObj(type, Math.round(x), Math.round(y), props, tag);
  if (type !== 'chest') delete o.looted;
  return o;
}
export function removeObj(z: Zone, o: Obj) {
  if (!z.objs.delete(o.id)) return;
  z.ev({ k: 'obj-', id: o.id });
}
/** Versetzt ein Objekt; `t` Sekunden Laufzeit für die Darstellung (0 = sofort) */
export function moveObj(z: Zone, o: Obj, x: number, y: number, t: number) {
  o.x = Math.round(x); o.y = Math.round(y);
  z.ev({ k: 'omv', id: o.id, x: o.x, y: o.y, t: Math.round(t * 100) / 100 });
}
export function spawnMob(z: Zone, mobId: string, lvl: number, x: number, y: number, o: { elite?: boolean; name?: string; target?: Player | null; summoned?: boolean } = {}): Mob {
  const m = new Mob(ENEMIES[mobId], Math.max(1, Math.round(lvl)), x, y, !!o.elite, -1, -1);
  m.summoned = o.summoned ?? true; m.awake = true;
  if (o.name) m.name = o.name;
  if (o.target) { m.target = o.target; m.state = 'chase'; }
  z.mobs.set(m.id, m);
  z.ev({ k: 'mob+', m: m.info() });
  z.ev({ k: 'fx', n: 'spawn', x: Math.round(x), y: Math.round(y), el: m.element });
  return m;
}
export function removeMob(z: Zone, m: Mob) {
  if (m.dead) return;
  m.dead = true;
  if (z.mobs.delete(m.id)) z.ev({ k: 'mob-', id: m.id });
}
/** Freier Punkt im Ring um (x, y) – für Gegner, die um einen Ort herum erscheinen */
export function ringSpot(z: Zone, x: number, y: number, rMin: number, rMax: number, flying = false): { x: number; y: number } {
  const solid = flying ? z.solidFly : z.solidWalk;
  for (let k = 0; k < 16; k++) {
    const a = z.rng.range(0, Math.PI * 2), r = z.rng.range(rMin, rMax), nx = x + Math.cos(a) * r, ny = y + Math.sin(a) * r;
    if (circleFree(solid, nx, ny, 7)) return { x: nx, y: ny };
  }
  return { x, y };
}
export function playersNear(z: Zone, x: number, y: number, r: number): Player[] {
  const out: Player[] = [];
  for (const p of z.players.values()) if (!p.linkdead && Math.hypot(p.x - x, p.y - y) <= r) out.push(p);
  return out;
}
export const alive = (ps: Player[]) => ps.filter(p => !p.dead);
/** Stufe für beschworene Gegner: die der Anwesenden, begrenzt auf den Bereich der Zone */
export function zoneLevel(z: Zone, ps: Player[], over = 1): number {
  const [lo, hi] = z.def.level;
  const lvl = ps.length ? Math.max(...ps.map(p => p.level)) : Math.round((lo + hi) / 2);
  return Math.max(lo, Math.min(hi + over, lvl));
}
/**
 * Orte für Ereignisse: besondere Orte der Karte und die Mitte der Wege dazwischen – außerhalb der Schutzzonen
 * und mit Abstand zu allen Spielern (`minDist`), damit nichts vor den Augen der Spieler aus dem Boden wächst.
 */
export function eventSites(z: Zone, minDist: number): { x: number; y: number }[] {
  const m = z.map, def = z.def, out: { x: number; y: number }[] = [];
  const add = (tx: number, ty: number) => {
    const c = freeNear(m, Math.round(tx), Math.round(ty), 6, (x, y) => !inSafe(m, x * TILE + 8, y * TILE + 8, 40));
    if (!c) return;
    for (const p of z.players.values()) if (Math.hypot(p.x - c.x, p.y - c.y) < minDist) return;
    out.push(c);
  };
  for (const p of def.pois ?? []) if (p.kind === 'spot') add(p.x + 2, p.y + 3);
  for (const [a, b] of def.links ?? []) {
    const pa = def.pois!.find(p => p.id === a), pb = def.pois!.find(p => p.id === b);
    if (pa && pb) add((pa.x + pb.x) / 2, (pa.y + pb.y) / 2);
  }
  return out;
}
/** Name des nächsten benannten Ortes (für Ansagen) */
export function placeName(z: Zone, x: number, y: number): string {
  let best = '', bd = 1e9;
  for (const l of z.map.labels) { const d = Math.hypot(l.x - x, l.y - y); if (d < bd) { bd = d; best = l.name; } }
  return best ? (bd < 10 * TILE ? `bei „${best}“` : `unweit von „${best}“`) : 'abseits der Wege';
}
export const rnd = (z: Zone, [a, b]: number[]) => z.rng.range(a, b);
void CFG;
