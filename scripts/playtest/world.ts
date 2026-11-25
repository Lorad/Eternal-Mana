/**
 * Lebendige Welt im Spieltest: Weltbosse, seltene Monster, Ereignisse – jeweils als echter Kampf mit Belohnungswert.
 * Dazu der Übungsgegner für die Stärkequellen (ein Gegner mit sehr viel Leben, der stillhält).
 */
import { circleFree } from '../../shared/src/collision';
import { CFG } from '../../shared/src/config';
import { T } from '../../shared/src/maps/tiles';
import { ITEMS, sellPrice } from '../../shared/src/data/items';
import { RARES, WORLD_BOSSES } from '../../shared/src/data/rares';
import type { EventKind } from '../../shared/src/data/events';
import type { CharData } from '../../shared/src/types';
import { World } from '../../server/src/world';
import type { Mob, Zone } from '../../server/src/zone';
import type { Bot, Skill } from './model';
import type { Lab } from './lab';

export interface WorldResult {
  win: boolean; time: number; deaths: number; potions: number; taken: number;
  /** Belohnung je Spieler: Erfahrung, Gold, Verkaufswert der Gegenstände */
  xp: number; gold: number; loot: number;
}

/** Wert dessen, was ein Bot seit `mark()` bekommen hat. */
function ledger(lab: Lab, z: Zone, bots: Bot[]) {
  const xp = bots.map(() => 0), gold0 = bots.map(b => b.p.char.gold), inv0 = bots.map(b => new Map(b.p.char.inv.map(i => [i.uid, i.qty ?? 1])));
  bots.forEach((b, i) => { const p = b.p; p.gainXp = (n: number) => { xp[i] += Math.max(1, Math.round(n * (1 + p.stats.xpPct / 100))); }; });
  return () => {
    let X = 0, G = 0, L = 0;
    bots.forEach((b, i) => {
      const p = b.p;
      X += xp[i]; G += Math.max(0, p.char.gold - gold0[i]);
      for (const it of p.char.inv) { const had = inv0[i].get(it.uid) ?? 0, n = (it.qty ?? 1) - had; if (n > 0 && ITEMS[it.base]) L += sellPrice(it) * n; }
      for (const [id, d] of z.drops) { if (d.owner !== p) continue; if (d.gold) G += d.gold; else if (d.item) L += sellPrice(d.item) * (d.item.qty ?? 1); z.drops.delete(id); }
    });
    return { xp: X / bots.length, gold: G / bots.length, loot: L / bots.length };
  };
}

/** Leerer Kampfplatz mitten in der Zone: gewöhnliche Gegner raus, Bots an eine freie Stelle abseits der Schutzzonen. */
function arena(lab: Lab, z: Zone, bots: Bot[]): { x: number; y: number } {
  for (const m of [...z.mobs.values()]) z.mobs.delete(m.id);
  // freie Fläche suchen: möglichst weit ohne Hindernis, abseits der Schutzzonen (dort verlieren Gegner ihr Ziel)
  const far = (x: number, y: number) => !z.map.safe.some(s => Math.hypot(x - s.x, y - s.y) < s.r + 200);
  const open = (x: number, y: number, half: number) => { for (let dx = -half; dx <= half; dx += 22) for (let dy = -half; dy <= half; dy += 22) if (!circleFree(z.solidWalk, x + dx, y + dy, 7) || z.tileAt(x + dx, y + dy) === T.HAZARD) return false; return true; };
  const list = z.map.spawns, mid = Math.floor(list.length / 2);
  let sp = list.find(c => far(c.x, c.y)) ?? list[mid];
  search: for (const half of [132, 110, 88, 66]) for (let k = 0; k < list.length; k++) { const c = list[(mid + k) % list.length]; if (far(c.x, c.y) && open(c.x + 45, c.y, half)) { sp = c; break search; } }
  bots.forEach((b, i) => { lab.place(b.p, sp.x + i * 14, sp.y + (i % 2) * 12); b.p.iframesUntil = 0; b.bounds = null; b.focus = null; });
  return sp;
}

function fightUntil(lab: Lab, z: Zone, bots: Bot[], done: () => boolean, maxSec: number) {
  lab.tap(z, bots);
  for (const b of bots) { b.taken = 0; b.potions = 0; }
  const t0 = lab.game.now, d0 = bots.map(b => b.p.char.deaths);
  let win = false;
  for (;;) {
    lab.step(bots);
    if (done()) { win = true; break; }
    if (bots.every(b => b.p.dead) || lab.game.now - t0 > maxSec) break;
  }
  return { win, time: lab.game.now - t0, deaths: bots.reduce((a, b, i) => a + b.p.char.deaths - d0[i], 0), potions: bots.reduce((a, b) => a + b.potions, 0), taken: bots.reduce((a, b) => a + b.taken / b.p.stats.maxHp, 0) / bots.length };
}

export function worldBoss(lab: Lab, id: string, zoneId: string, chars: CharData[], skill: Skill, seed: number): WorldResult & { level: number; hp: number } {
  const bots = chars.map((c, i) => lab.join(c, skill, seed * 31 + i));
  lab.party(bots);
  const z = lab.enter(bots, zoneId, seed);
  const sp = arena(lab, z, bots);
  const ev = World.startBoss(lab.game, id, z, { x: sp.x + 90, y: sp.y });
  const m = ev!.bossMob!;
  const led = ledger(lab, z, bots);
  const r = fightUntil(lab, z, bots, () => bots.some(b => !!b.p.char.flags[`wb:${id}`]), 900);
  for (let i = 0; i < 10; i++) lab.step(bots);
  const v = led();
  const hp = m.maxHp;
  // den Auftritt schließen, damit der nächste Versuch frisch beginnt
  World.state.game(lab.game).bossWin.delete(id);
  for (const b of bots) lab.leave(b);
  return { ...r, ...v, level: m.lvl, hp };
}

export function rareFight(lab: Lab, id: string, char: CharData, skill: Skill, seed: number): WorldResult & { level: number } {
  const def = RARES[id];
  const b = lab.join(char, skill, seed);
  const z = lab.enter([b], def.zone, seed);
  for (const m of [...z.mobs.values()]) z.mobs.delete(m.id);
  const m = World.spawnRare(z, id) as Mob | null;
  if (!m) { lab.leave(b); return { win: false, time: 0, deaths: 0, potions: 0, taken: 0, xp: 0, gold: 0, loot: 0, level: 0 }; }
  lab.place(b.p, m.x + 70, m.y + 20); b.p.iframesUntil = 0;
  const led = ledger(lab, z, [b]);
  const r = fightUntil(lab, z, [b], () => m.dead, 300);
  for (let i = 0; i < 10; i++) lab.step([b]);
  const v = led();
  lab.leave(b);
  return { ...r, ...v, level: m.lvl };
}

export function eventFight(lab: Lab, kind: EventKind, zoneId: string, chars: CharData[], skill: Skill, seed: number): WorldResult {
  const bots = chars.map((c, i) => lab.join(c, skill, seed * 31 + i));
  lab.party(bots);
  const z = lab.enter(bots, zoneId, seed);
  const sp = arena(lab, z, bots);
  const ev = World.startEvent(z, kind, { x: sp.x + 40, y: sp.y });
  if (!ev) { for (const b of bots) lab.leave(b); return { win: false, time: 0, deaths: 0, potions: 0, taken: 0, xp: 0, gold: 0, loot: 0 }; }
  for (const b of bots) b.goto = { x: ev.x, y: ev.y + 30 };
  const led = ledger(lab, z, bots);
  const r = fightUntil(lab, z, bots, () => ev.result !== null, CFG.living.events.fightSec + 60);
  for (let i = 0; i < 20; i++) lab.step(bots);
  const v = led();
  for (const b of bots) lab.leave(b);
  return { ...r, win: ev.result === 'win', ...v };
}

/** Schaden je Sekunde gegen einen Übungsgegner (hält still, schlägt nicht zurück) – der Bot spielt seine volle Rotation. */
export function dummyDps(lab: Lab, chars: CharData[], skill: Skill, seed: number, o: { mob?: string; sec?: number; count?: number; prep?: (b: Bot) => void } = {}): number {
  const bots = chars.map((c, i) => lab.join(c, skill, seed * 31 + i));
  lab.party(bots);
  const z = lab.enter(bots, 'quellgrund', seed);
  const sp = arena(lab, z, bots);
  for (const b of bots) o.prep?.(b);
  const n = o.count ?? 1;
  const ms = Array.from({ length: n }, (_, i) => { const a = (i / Math.max(1, n)) * Math.PI * 2, d = n > 1 ? 16 : 0; return lab.sim.dummy(z, o.mob ?? 'ev_duellant', 40, sp.x + 60 + Math.cos(a) * d, sp.y + Math.sin(a) * d, 1e9); });
  const pos = ms.map(m => [m.x, m.y]);
  const sec = o.sec ?? 45;
  // kein Rückstoß, kein Betäuben: die Übungsgegner bleiben, wo sie sind
  for (let i = 0; i < sec * CFG.net.tickRate; i++) { lab.step(bots); ms.forEach((m, k) => { m.x = pos[k][0]; m.y = pos[k][1]; m.kx = m.ky = 0; }); }
  const dps = ms.reduce((a, m) => a + (m.maxHp - m.hp), 0) / sec;
  for (const m of ms) z.mobs.delete(m.id);
  for (const b of bots) lab.leave(b);
  return dps;
}
void WORLD_BOSSES;
