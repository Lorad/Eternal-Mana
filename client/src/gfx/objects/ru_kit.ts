/** Verlorene Ruinen – gemeinsame Rampen und Maler: Sandstein, Säulenschaft, Glyphen, Ranken. */
import { Px } from '../draw';
import { MARK, P, Ramp, WHITE, clamp, inkOutline, mix, rnd2, vnoise } from './kit';
import { partIn } from './fr_kit';

/** sonnengebleichter Sandstein (5): violettbrauner Schatten → fast Creme */
export const SAND: Ramp = [mix(P.sand[0], P.shadow[2], 0.45), mix(P.sand[1], P.stone[1], 0.35), mix(P.sand[2], P.cream[1], 0.45), mix(P.sand[3], P.cream[2], 0.55), mix(P.sand[4], P.cream[4], 0.6)];
/** gebrannter Ton (5) */
export const TERRA: Ramp = [mix(P.red[0], P.wood[0], 0.5), mix(P.red[1], P.wood[2], 0.5), mix(P.fire[1], P.tan[1], 0.5), mix(P.fire[2], P.tan[2], 0.55), mix(P.fire[3], P.tan[3], 0.6)];
/** Arkanblau (6) */
export const ARC: Ramp = [P.blue[0], P.blue[1], P.blue[2], P.blue[3], P.blue[4], mix(P.ice[4], WHITE, 0.5)];
/** Olivlaub (7): silbrig-graugrün */
export const OLIVE: Ramp = [P.forest[0], mix(P.forest[1], P.stone[1], 0.4), mix(P.forest[2], P.stone[2], 0.45), mix(P.green[2], P.sand[2], 0.6), mix(P.green[3], P.sand[3], 0.6), mix(P.sand[3], P.green[3], 0.3), mix(P.cream[3], P.green[4], 0.3)];
export const VINE: Ramp = [P.forest[0], P.forest[1], P.green[1], P.green[2], P.green[3]];

/** Steinfläche auf Markerpixeln: je Zeilenstück wie ein Zylinder schattiert (Licht links), Verwitterungsflecken, Sprenkel. */
export function stoneFill(p: Px, R: Ramp = SAND, seed = 1, mark: number = MARK, flat = false): void {
  const { w, h, d } = p;
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      if (d[y * w + x] !== mark) { x++; continue; }
      let e = x; while (e + 1 < w && d[y * w + e + 1] === mark) e++;
      const n = e - x + 1;
      for (let i = x; i <= e; i++) {
        const t = (i - x + 0.5) / n;
        let tone = flat ? (i === x ? 4 : i === e ? 1 : 3) : n <= 2 ? (i === x ? 3 : 2) : t < 0.12 ? 3 : t < 0.42 ? 4 : t < 0.68 ? 3 : t < 0.88 ? 2 : 1;
        if (vnoise(i * 0.28, y * 0.22, seed) > 0.7) tone--;
        const s = rnd2(i, y, seed + 4); if (s < 0.04) tone--; else if (s > 0.97) tone++;
        d[y * w + i] = R[clamp(tone, 0, 4)];
      }
      x = e + 1;
    }
  }
}
/** Kannelierter Säulenschaft (senkrecht): Mitte cx, Zeilen y0..y1, halbe Breite hw; Trommelfugen alle `drum` Zeilen. */
export function shaft(p: Px, cx: number, y0: number, y1: number, hw: number, seed = 1, drum = 11, R: Ramp = SAND): void {
  for (let y = y0; y <= y1; y++) for (let x = Math.round(cx - hw); x < Math.round(cx + hw); x++) {
    const u = (x + 0.5 - cx) / hw, m = (y - y0) % drum;
    let tone = u < -0.75 ? 3 : u < -0.15 ? 4 : u < 0.35 ? 3 : u < 0.72 ? 2 : 1;
    if ((x - Math.round(cx - hw)) % 3 === 2) tone--;                   // Kannelur
    if (m === drum - 1) tone = Math.min(tone, 1); else if (m === 0 && y > y0) tone++;
    if (vnoise(x * 0.3, y * 0.14, seed) > 0.72) tone--;
    if (rnd2(x, y, seed + 2) < 0.04) tone--;
    p.set(x, y, R[clamp(tone, 0, 4)]);
  }
}
/** Liegender kannelierter Schaft: x0..x1, Mitte cy, Radius r. */
export function shaftH(p: Px, x0: number, x1: number, cy: number, r: number, seed = 1, drum = 12, R: Ramp = SAND): void {
  for (let x = x0; x <= x1; x++) for (let y = Math.round(cy - r); y < Math.round(cy + r); y++) {
    const v = (y + 0.5 - cy) / r, m = (x - x0) % drum;
    let tone = v < -0.7 ? 4 : v < -0.2 ? 4 : v < 0.25 ? 3 : v < 0.65 ? 2 : 1;
    if ((y - Math.round(cy - r)) % 3 === 2) tone--;
    if (m === drum - 1) tone = Math.min(tone, 1); else if (m === 0 && x > x0) tone++;
    if (vnoise(x * 0.14, y * 0.3, seed) > 0.72) tone--;
    if (rnd2(x, y, seed + 2) < 0.04) tone--;
    p.set(x, y, R[clamp(tone, 0, 4)]);
  }
}
/** Stufe/Platte in ¾-Sicht: helle Deckfläche (top px), Front mit Lichtkante und Schattenfuß. */
export function slab(p: Px, x: number, y: number, w: number, h: number, top = 1, seed = 1, R: Ramp = SAND): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const s = rnd2(x + i, y + j, seed);
    let tone = j < top ? 4 : j === top ? 3 : j === h - 1 ? 1 : 2;
    if (j >= top && i === 0) tone++; else if (j >= top && i >= w - 2) tone--;
    if (s < 0.06) tone--; else if (s > 0.96 && j >= top) tone++;
    p.set(x + i, y + j, R[clamp(tone, 0, 4)]);
  }
}
/** Runenglyphen 3×5 */
const GLYPHS = ['x.xx.x.x..x..x.', '.x.xxx.x.x.xx.x', 'xx..x..xx.x.xx.', 'x..xx.x.xxx.x..', '.x.x.xx.x.x.xxx', 'xxx..x.x.x..xxx', '.x..x.xxxx.xx.x', 'x.xxxx.x..x.xxx'];
export function glyph(p: Px, x: number, y: number, k: number, c: number, c2?: number): void {
  const g = GLYPHS[((k % GLYPHS.length) + GLYPHS.length) % GLYPHS.length];
  for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j * 3 + i] === 'x') p.set(x + i, y + j, c2 !== undefined && (i + j) % 2 === 0 ? c2 : c);
}
/** Hängende Ranke ab (x, y0), Länge len; pendelt unten (f = Frame, amp in px), Blättchen wechselseitig, optional Blüte am Ende. */
export function vineStrand(p: Px, x: number, y0: number, len: number, f: number, seed: number, amp = 1.5, bloom = 0): void {
  for (let j = 0; j < len; j++) {
    const u = j / len, X = x + Math.round(Math.sin(j * 0.55 + seed) * 0.7) + Math.round(amp * Math.pow(u, 1.5) * Math.sin((f * Math.PI) / 2 + seed * 0.7));
    p.set(X, y0 + j, j % 4 === 3 ? VINE[1] : VINE[2]);
    if (j % 3 === 1) { const s = (j + seed) % 2 ? 1 : -1; p.set(X + s, y0 + j, VINE[s < 0 ? 4 : 3]); if (j % 6 === 1) p.set(X + s * 2, y0 + j - 1, VINE[3]); }
    if (j === len - 1) { p.set(X, y0 + j + 1, VINE[4]); if (bloom) { p.set(X, y0 + j + 1, bloom); p.set(X - 1, y0 + j, mix(bloom, WHITE, 0.4)); } }
  }
}
/** Überlagertes Einzelteil mit Kontur nur innerhalb des Sprites (siehe partIn). */
export function over(p: Px, fn: (l: Px) => void): Px { return partIn(p, fn, (l) => inkOutline(l)); }
