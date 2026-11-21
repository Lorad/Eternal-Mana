/**
 * Gemeinsame Helfer der Biom-Maler Kristallhöhlen und Glutlande (wird auch von glut*.ts benutzt):
 * Brückenrichtung, Raumzuordnung für Dungeons, Plattenverbände, Sechseckraster, Lichthof um Stempel.
 */
import { hash2, rnd2 } from '../palette';
import { Px } from '../draw';
import { BRIDGE, LIQUID, VOID, WALL, mapCache, tileAt } from './core';
import type { PaintableMap } from '../spec';

// ---------------------------------------------------------------------------------------------------- Brücken
/** Je Brückenzelle: 1 = Steg verläuft West–Ost (Bohlen liegen in N–S-Richtung), 2 = Steg verläuft Nord–Süd. */
export function bridgeDirs(map: PaintableMap): Uint8Array {
  return mapCache(map, 'kgBridgeDirs', () => {
    const { w, h, tiles } = map, out = new Uint8Array(w * h);
    for (let s = 0; s < tiles.length; s++) {
      if (tiles[s] !== BRIDGE || out[s]) continue;
      const comp: number[] = [s]; out[s] = 3;
      let ns = 0, ew = 0;
      for (let k = 0; k < comp.length; k++) {
        const i = comp[k], x = i % w, y = (i / w) | 0;
        if (tileAt(map, x, y - 1) === LIQUID) ns++;
        if (tileAt(map, x, y + 1) === LIQUID) ns++;
        if (tileAt(map, x - 1, y) === LIQUID) ew++;
        if (tileAt(map, x + 1, y) === LIQUID) ew++;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h && tiles[yy * w + xx] === BRIDGE && !out[yy * w + xx]) { out[yy * w + xx] = 3; comp.push(yy * w + xx); }
        }
      }
      for (const i of comp) out[i] = ns >= ew ? 1 : 2;
    }
    return out;
  });
}

// ---------------------------------------------------------------------------------------------------- Räume
export interface RoomInfo { roomOf: Int16Array; kind: Uint8Array }
/** Je Zelle: Raumindex+1 (0 = kein Raum) und Korridorart (1 = waagerecht, 2 = senkrecht, 3 = Schwelle waagerecht, 4 = Schwelle senkrecht). */
export function roomInfo(map: PaintableMap): RoomInfo {
  return mapCache(map, 'kgRooms', () => {
    const { w, h } = map, roomOf = new Int16Array(w * h), kind = new Uint8Array(w * h), rooms = map.rooms ?? [];
    rooms.forEach((r, k) => { for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) if (x >= 0 && y >= 0 && x < w && y < h) roomOf[y * w + x] = k + 1; });
    if (!rooms.length) return { roomOf, kind };
    const fl = (x: number, y: number): boolean => { const t = tileAt(map, x, y); return t !== WALL && t !== VOID; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (roomOf[y * w + x] || !fl(x, y)) continue;
      const horiz = fl(x - 1, y) && fl(x + 1, y);
      const rm = (xx: number, yy: number): boolean => xx >= 0 && yy >= 0 && xx < w && yy < h && roomOf[yy * w + xx] > 0;
      if (horiz) kind[y * w + x] = rm(x - 1, y) || rm(x + 1, y) ? 3 : 1;
      else kind[y * w + x] = rm(x, y - 1) || rm(x, y + 1) ? 4 : 2;
    }
    return { roomOf, kind };
  });
}
/** Obere/linke Kante eines Korridors (Weltpixel quer zur Laufrichtung), in dem die Zelle (cx, cy) liegt. */
export function corridorOrigin(map: PaintableMap, cx: number, cy: number, horiz: boolean): number {
  const first = tileAt(map, horiz ? cx : cx - 1, horiz ? cy - 1 : cy);
  return ((first === WALL || first === VOID) ? (horiz ? cy : cx) : (horiz ? cy : cx) - 1) * 16;
}

// ---------------------------------------------------------------------------------------------------- Plattenverbände
/** Verlegemuster für 32×32-px-Blöcke: Rechtecke (x, y, w, h), die den Block lückenlos füllen. */
const LAYOUTS: Array<Array<[number, number, number, number]>> = [
  [[0, 0, 16, 16], [16, 0, 16, 8], [16, 8, 16, 8], [0, 16, 8, 16], [8, 16, 8, 16], [16, 16, 16, 16]],
  [[0, 0, 24, 16], [24, 0, 8, 16], [0, 16, 12, 16], [12, 16, 20, 8], [12, 24, 10, 8], [22, 24, 10, 8]],
  [[0, 0, 10, 10], [10, 0, 22, 10], [0, 10, 16, 22], [16, 10, 16, 12], [16, 22, 8, 10], [24, 22, 8, 10]],
  [[0, 0, 20, 12], [20, 0, 12, 20], [0, 12, 8, 20], [8, 12, 12, 20], [20, 20, 12, 12]],
  [[0, 0, 12, 16], [12, 0, 12, 8], [24, 0, 8, 8], [12, 8, 20, 8], [0, 16, 20, 16], [20, 16, 12, 8], [20, 24, 12, 8]],
  [[0, 0, 16, 20], [16, 0, 16, 12], [16, 12, 8, 8], [24, 12, 8, 20], [0, 20, 24, 12]],
  [[0, 0, 32, 12], [0, 12, 14, 20], [14, 12, 18, 10], [14, 22, 18, 10]],
  [[0, 0, 18, 18], [18, 0, 14, 10], [18, 10, 14, 8], [0, 18, 10, 14], [10, 18, 22, 14]],
];
const LAYMAPS = LAYOUTS.map((rects) => {
  const id = new Uint8Array(1024), edge = new Uint8Array(1024);
  rects.forEach(([x, y, w, h], k) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      id[j * 32 + i] = k;
      edge[j * 32 + i] = (j === y ? 1 : 0) | (i === x ? 2 : 0) | (j === y + h - 1 ? 4 : 0) | (i === x + w - 1 ? 8 : 0);
    }
  });
  return { id, edge };
});
/** Ergebnis von slabAt(): e = Kantenbits (1 oben, 2 links, 4 unten/Fuge, 8 rechts/Fuge), h1/h2 = Zufall je Platte, bx/by = Blockkante (0/1). */
export const SLAB = { e: 0, h1: 0, h2: 0, lx: 0, ly: 0 };
/** Unregelmäßiger Plattenverband (Blöcke 32×32, spaltenweise versetzt, zufällig gespiegelt). */
export function slabAt(wx: number, wy: number, seed: number): void {
  const sx = wx + 5, bx = sx >> 5, sy = wy + 3 + (hash2(bx, 0, seed + 1) & 3) * 8, by = sy >> 5, hs = hash2(bx, by, seed);
  const lay = LAYMAPS[hs % LAYMAPS.length], fx = (hs >>> 8) & 1, fy = (hs >>> 9) & 1;
  const lx = fx ? 31 - (sx & 31) : sx & 31, ly = fy ? 31 - (sy & 31) : sy & 31, o = ly * 32 + lx;
  let e = lay.edge[o];
  if (fx) e = (e & 5) | ((e & 2) << 2) | ((e & 8) >> 2);
  if (fy) e = (e & 10) | ((e & 1) << 2) | ((e & 4) >> 2);
  SLAB.e = e; SLAB.h1 = rnd2(hs, lay.id[o], 7); SLAB.h2 = rnd2(hs, lay.id[o], 8); SLAB.lx = sx & 31; SLAB.ly = sy & 31;
}

// ---------------------------------------------------------------------------------------------------- Sechsecke
/** Ergebnis von hexAt(): Zelle (q, r), lokaler Versatz (lx, ly – ly ungestaucht), e = Abstand zur Zellkante. */
export const HX = { q: 0, r: 0, lx: 0, ly: 0, e: 0 };
/** Sechseckraster (flache Seite oben), s = Mitte→Ecke in px, sq = senkrechte Stauchung (¾-Sicht, z. B. 0.8). */
export function hexAt(x: number, y: number, s: number, sq: number): void {
  const yy = y / sq, qf = ((2 / 3) * x) / s, rf = (-x / 3 + 0.57735027 * yy) / s, sf = -qf - rf;
  let q = Math.round(qf), r = Math.round(rf);
  const s2 = Math.round(sf), dq = Math.abs(q - qf), dr = Math.abs(r - rf), ds = Math.abs(s2 - sf);
  if (dq > dr && dq > ds) q = -r - s2; else if (dr > ds) r = -q - s2;
  const lx = x - s * 1.5 * q, ly = yy - s * 1.7320508 * (r + q / 2);
  const m = Math.max(Math.abs(ly), Math.abs(ly * 0.5 + lx * 0.8660254), Math.abs(ly * 0.5 - lx * 0.8660254));
  HX.q = q; HX.r = r; HX.lx = lx; HX.ly = ly; HX.e = s * 0.8660254 - m;
}

// ---------------------------------------------------------------------------------------------------- Stempelhilfen
/** Legt einen weichen Lichthof (2 px) um alle deckenden Pixel; col ohne Alpha, a1/a2 = Alpha im Abstand 1/2. */
export function halo(p: Px, col: number, a1: number, a2: number): Px {
  const { w, h, d } = p, src = d.slice();
  const op = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < w && y < h && src[y * w + x] >>> 24 >= 200;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (src[y * w + x] >>> 24) continue;
    let best = 9;
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const dd = Math.abs(i) + Math.abs(j); if (dd < best && dd <= 2 && op(x + i, y + j)) best = dd; }
    if (best <= 2) d[y * w + x] = (((best === 1 ? a1 : a2) << 24) | (col & 0xffffff)) >>> 0;
  }
  return p;
}
/** Transponiert einen Puffer (x ↔ y). */
export function transpose(p: Px): Px {
  const o = new Px(p.h, p.w);
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) o.d[x * o.w + y] = p.d[y * p.w + x];
  return o;
}
