/**
 * Lebendige Welt (0.6) – gemeinsame Regeln für Server und Oberfläche, die eine Karte brauchen:
 * erreichbare Zellen, Grabstellen der Schatzkarten und ihr Hinweistext. Alles deterministisch aus Karte und Charakter.
 */
import { CFG } from './config';
import type { GameMap } from './maps/mapgen';
import { T, TILE, isWalkableTile } from './maps/tiles';
import type { CharData } from './types';
import { Rng, strHash } from './util/rng';

const reachCache = new WeakMap<GameMap, Uint8Array>();
/** Vom Startpunkt aus begehbare Zellen (Türen und Felsblockaden gelten als offen) */
export function reachable(m: GameMap): Uint8Array {
  let r = reachCache.get(m);
  if (r) return r;
  r = new Uint8Array(m.w * m.h);
  const s = Math.floor(m.start.y / TILE) * m.w + Math.floor(m.start.x / TILE), q = [s];
  r[s] = 1;
  while (q.length) {
    const i = q.pop()!, x = i % m.w;
    for (const n of [x > 0 ? i - 1 : -1, x < m.w - 1 ? i + 1 : -1, i - m.w, i + m.w]) if (n >= 0 && n < r.length && !r[n] && !m.solid[n]) { r[n] = 1; q.push(n); }
  }
  reachCache.set(m, r);
  return r;
}
export const isRoad = (m: GameMap, tx: number, ty: number) => { const t = m.tiles[ty * m.w + tx]; return t === T.PATH || t === T.BRIDGE; };
/** Frei begehbare, erreichbare Zelle (kein Gefahrenboden, keine Brücke)? */
export function cellFree(m: GameMap, tx: number, ty: number): boolean {
  if (tx < 2 || ty < 2 || tx >= m.w - 2 || ty >= m.h - 2) return false;
  const i = ty * m.w + tx, t = m.tiles[i];
  return !!reachable(m)[i] && !m.solid[i] && isWalkableTile(t) && t !== T.HAZARD && t !== T.BRIDGE;
}
/** Nächste freie Zelle in wachsenden Ringen um (tx, ty) – als Weltpunkt (Zellmitte) */
export function freeNear(m: GameMap, tx: number, ty: number, maxR = 8, ok: (x: number, y: number) => boolean = () => true): { x: number; y: number } | null {
  for (let r = 0; r <= maxR; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = tx + dx, y = ty + dy;
    if (cellFree(m, x, y) && ok(x, y)) return { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 };
  }
  return null;
}
export const inSafe = (m: GameMap, x: number, y: number, pad = 0) => m.safe.some(s => Math.hypot(x - s.x, y - s.y) < s.r + pad);

// ------------------------------------------------------------------ Schatzkarten
const spotCache = new WeakMap<GameMap, { x: number; y: number }[]>();
/** Mögliche Grabstellen einer Region: abseits der Wege, außerhalb der Lager, voneinander entfernt. */
export function treasureSpots(m: GameMap): { x: number; y: number }[] {
  let out = spotCache.get(m);
  if (out) return out;
  out = [];
  const rng = new Rng(strHash('schatz:' + m.id));
  const occupied = m.objects.map(o => [Math.floor(o.x / TILE), Math.floor(o.y / TILE)] as const);
  const offRoad = (x: number, y: number) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (isRoad(m, x + dx, y + dy)) return false; return true; };
  for (let k = 0; k < 6000 && out.length < CFG.living.treasure.spots; k++) {
    const x = rng.int(4, m.w - 5), y = rng.int(4, m.h - 5), px = x * TILE + TILE / 2, py = y * TILE + TILE / 2;
    if (!cellFree(m, x, y) || !offRoad(x, y) || inSafe(m, px, py, 24)) continue;
    if (out.some(s => Math.hypot(s.x - px, s.y - py) < 7 * TILE) || occupied.some(([ox, oy]) => Math.abs(ox - x) <= 1 && Math.abs(oy - y) <= 1)) continue;
    out.push({ x: px, y: py });
  }
  spotCache.set(m, out);
  return out;
}
/** Welche Grabstelle die nächste Karte dieses Charakters in dieser Region zeigt (1-basiert; 0 = keine Stelle vorhanden) */
export function treasureIndex(c: CharData, m: GameMap): number {
  const n = treasureSpots(m).length;
  return n ? 1 + (strHash(`${c.name}:${m.id}:${c.flags[`tm:${m.id}`] ?? 0}`) % n) : 0;
}
/** Aktive Grabstelle des Charakters in dieser Zone (Karte gelesen, Schatz noch nicht gehoben) */
export function activeTreasure(c: CharData | null | undefined, m: GameMap): { x: number; y: number } | null {
  const idx = c?.flags[`tk:${m.id}`];
  return idx ? treasureSpots(m)[idx - 1] ?? null : null;
}
const DIRS = ['östlich', 'südöstlich', 'südlich', 'südwestlich', 'westlich', 'nordwestlich', 'nördlich', 'nordöstlich'];
/** Hinweis einer Schatzkarte: Richtung und Entfernung vom nächsten benannten Ort */
export function treasureHint(m: GameMap, spot: { x: number; y: number }): string {
  let best = m.labels[0], bd = 1e9;
  for (const l of m.labels) { const d = Math.hypot(l.x - spot.x, l.y - spot.y); if (d < bd) { bd = d; best = l; } }
  if (!best) return 'Das Kreuz liegt irgendwo abseits der Wege.';
  const a = Math.atan2(spot.y - best.y, spot.x - best.x), dir = DIRS[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
  const far = bd < 12 * TILE ? 'gleich' : bd < 26 * TILE ? 'ein gutes Stück' : 'weit';
  return `Das Kreuz liegt ${far} ${dir} von „${best.name}“, abseits der Wege.`;
}
