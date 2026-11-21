/** Allgemein – Dungeon-Requisiten (v2), Präfix `d_`. Neutrale Palette für alle Biome. */
import { Px, bez } from '../draw';
import {
  Frames, INK, MARK, P, Ramp, TAU, WHITE, alpha, anim, barkFill, boulder, clamp, flame, glow, hash2, inkOutline, limb, masonry, mix, one, part, planks, rnd2, shadeArea, sw, texFill,
} from './kit';
import { RUNESTONE } from './cm_interact';

const W = P.wood, S = P.stone, I = P.steel, Y = P.gold, B = P.bone;
const SHADE = P.shadow[2], DARK = P.shadow[0];
const OLDW: Ramp = [mix(W[0], P.shadow[1], 0.4), mix(W[1], P.ash[2], 0.4), mix(W[2], P.ash[3], 0.35), mix(W[3], P.ash[4], 0.3), mix(W[4], S[3], 0.3)];

function pillar(p: Px, broken: boolean): void {
  const R = RUNESTONE, h = p.h, top = broken ? 9 : 7;
  // Schaft mit Kanneluren
  for (let y = top; y < h - 6; y++) {
    const jag = broken ? Math.max(0, 4 - (y - top)) : 0;
    for (let x = 4; x < 12; x++) {
      if (broken && y < top + [3, 1, 0, 2, 4, 2, 5, 3][x - 4]) continue;
      const u = x - 4, tone = [3, 4, 2, 3, 2, 1, 2, 0][u] - (y % 9 === 0 ? 1 : 0) + (rnd2(x, y, 5) > 0.95 ? 1 : 0);
      p.set(x, y, R[clamp(tone, 0, 4)]);
    }
    void jag;
  }
  // Basis
  p.rect(3, h - 7, 10, 2, R[3]); p.rect(3, h - 7, 10, 1, R[4]); p.rect(2, h - 5, 12, 4, R[2]); p.rect(2, h - 5, 12, 1, R[3]); p.rect(2, h - 5, 1, 4, R[3]); p.rect(12, h - 4, 2, 3, R[1]); p.rect(2, h - 1, 12, 1, R[0]); p.px([5, h - 3, 9, h - 2], R[1]);
  if (!broken) {
    // Kapitell mit Deckplatte
    p.rect(3, 5, 10, 2, R[2]); p.rect(3, 5, 10, 1, R[3]); p.px([3, 6, 12, 6], R[1]);
    p.rect(1, 1, 14, 4, R[3]); p.rect(1, 1, 14, 1, R[4]); p.rect(1, 4, 14, 1, R[1]); p.rect(13, 2, 2, 3, R[1]); p.rect(2, 0, 12, 1, R[3]);
    p.px([4, 2, 7, 2, 10, 2], Y[2]); p.px([5, 3, 8, 3, 11, 3], R[1]);
    shadeArea(p, (x, y) => y >= 7 && y < 9, SHADE, 0.3);
    p.line(10, 18, 9, 24, R[0]); p.px([5, 30, 6, 31], R[0]);
  } else {
    p.px([4, 12, 5, 10, 6, 9, 7, 11, 8, 13, 9, 11, 10, 14, 11, 12], R[4]); p.line(8, 14, 7, 19, R[0]);
    part(p, (l) => boulder(l, 13, h - 1, 5, 4, { ramp: R, seed: 3, facets: 2, cracks: 0 })); part(p, (l) => boulder(l, 2, h - 1, 4, 3, { ramp: R, seed: 5, facets: 2, cracks: 0 }));
  }
}
function banner(p: Px, f: number): void {
  const C: Ramp = [mix(P.red[0], P.shadow[1], 0.4), mix(P.red[1], P.violet[1], 0.35), mix(P.red[2], P.violet[2], 0.35), mix(P.red[3], P.violet[3], 0.3), P.red[4]];
  // Stange mit Endknäufen
  p.rect(1, 2, 14, 2, I[2]); p.rect(1, 2, 14, 1, I[3]); p.px([0, 2, 0, 3, 15, 2, 15, 3], Y[2]); p.px([0, 2, 15, 2], Y[4]); p.px([4, 1, 11, 1], I[1]);
  for (let x = 2; x < 14; x++) {
    const u = (x - 2) / 11, ph = (f * Math.PI) / 2 + u * 2.4, dy = Math.round(Math.sin(ph) * 0.8), light = Math.cos(ph + 0.6);
    const len = 27 - [0, 3, 1, 5, 2, 0, 4, 7, 3, 1, 4, 0][x - 2];       // zerfetzter Saum
    for (let j = 0; j < len; j++) {
      const y = 4 + j + (j > 4 ? dy : 0);
      let c = light > 0.5 ? C[3] : light < -0.4 ? C[1] : C[2];
      if (x === 2 || x === 13) c = light > 0 ? Y[2] : Y[1];
      else if (j === 1) c = Y[1];
      else if (j > len - 3) c = C[1];
      if ((x === 5 && j > 14 && j < 19) || (x === 10 && j > 20 && j < 23)) continue;   // Risse
      p.set(x, y, c);
    }
    // Emblem: Krone/Auge in mattem Gold
    const e = (dx: number, dyy: number, c: number): void => { if (x === 8 + dx) p.set(x, 13 + dyy + dy, c); };
    for (const [dx, dyy] of [[-2, 0], [-1, -1], [0, -2], [1, -1], [2, 0], [1, 1], [0, 2], [-1, 1]] as const) e(dx, dyy, Y[3]);
    e(0, 0, Y[4]); e(-1, 0, Y[1]); e(0, 5, Y[2]); e(-1, 6, Y[2]); e(0, 7, Y[2]); e(-2, 5, Y[1]); e(1, 5, Y[2]); e(1, 6, Y[1]);
  }
}
function chains(p: Px): void {
  p.rect(2, 0, 3, 2, I[2]); p.set(2, 0, I[4]); p.rect(8, 0, 3, 2, I[2]); p.set(8, 0, I[4]);
  const chain = (x: number, n: number): void => { for (let k = 0; k < n; k++) { const y = 2 + k * 3; if (k % 2 === 0) { p.rect(x, y, 1, 3, I[3]); p.rect(x + 1, y, 1, 3, I[1]); } else { p.px([x - 1, y, x - 1, y + 1, x - 1, y + 2], I[2]); p.px([x + 2, y, x + 2, y + 1, x + 2, y + 2], I[1]); p.set(x - 1, y, I[4]); } } };
  chain(3, 8); chain(9, 6);
  // Schelle
  p.px([2, 26, 1, 27, 1, 28, 2, 29, 3, 29, 4, 29, 5, 28, 5, 27, 4, 26], I[2]); p.px([2, 26, 1, 27], I[4]); p.px([8, 20, 9, 21, 10, 20], I[2]); p.set(9, 22, I[1]);
}
function cobweb(p: Px): void {
  const c1 = alpha(WHITE, 210), c2 = alpha(P.snow[1], 150);
  for (const [x, y] of [[19, 2], [17, 9], [12, 14], [6, 18], [1, 19]] as const) p.line(0, 0, x, y, c1);
  for (const r of [6, 11, 16]) for (let k = 0; k < 4; k++) {
    const a0 = [0.1, 0.48, 0.86, 1.25, 1.52][k], a1 = [0.1, 0.48, 0.86, 1.25, 1.52][k + 1], rr = r + (k % 2);
    const x0 = Math.cos(a0) * rr, y0 = Math.sin(a0) * rr, x1 = Math.cos(a1) * rr, y1 = Math.sin(a1) * rr;
    for (const q of bez([x0, y0], [(x0 + x1) / 2 * 0.86, (y0 + y1) / 2 * 0.86], [x1, y1], 8)) p.blend(Math.round(q[0]), Math.round(q[1]), c2);
  }
  p.set(0, 0, c1); p.set(9, 9, WHITE); p.set(13, 5, alpha(WHITE, 230));
  // Spinne
  p.rect(10, 12, 2, 2, DARK); p.px([9, 11, 12, 11, 9, 14, 12, 14], P.shadow[2]);
}
function crate(p: Px): void {
  p.rect(2, 2, 12, 5, MARK); planks(p, 2, 2, 12, 5, { ramp: OLDW, pw: 3, vertical: true, seed: 3, mark: MARK }); shadeArea(p, (x, y) => y < 7, WHITE, 0.14);
  p.rect(2, 7, 12, 10, MARK); planks(p, 2, 7, 12, 10, { ramp: OLDW, pw: 4, seed: 5, mark: MARK, worn: 0.9 });
  p.rect(2, 7, 12, 1, OLDW[0]); p.rect(2, 16, 12, 1, OLDW[0]);
  for (const x of [2, 12]) { p.rect(x, 7, 2, 10, I[1]); p.rect(x, 7, 1, 10, I[2]); p.px([x, 8, x, 15], I[4]); }
  p.rect(2, 2, 12, 1, OLDW[4]); p.px([2, 2, 13, 2, 2, 6, 13, 6], I[2]); p.px([6, 11, 7, 12, 8, 11, 9, 12], OLDW[0]); p.px([5, 4, 10, 5], OLDW[0]);
}
function barrel(p: Px): void {
  for (let y = 2; y < 17; y++) { const b = y < 5 ? 5.5 - (5 - y) * 0.5 : y > 13 ? 5.5 - (y - 13) * 0.5 : 6, x0 = Math.round(7 - b), x1 = Math.round(7 + b); p.rect(x0, y, x1 - x0, 1, MARK); }
  planks(p, 0, 2, 14, 15, { ramp: OLDW, pw: 3, vertical: true, seed: 7, mark: MARK, worn: 0.8 });
  shadeArea(p, (x, y) => x > 9 && y > 2, SHADE, 0.3);
  for (const y of [5, 12]) for (let x = 0; x < 14; x++) if (p.get(x, y) >>> 24) { p.set(x, y, x < 4 ? I[3] : x > 9 ? I[0] : I[2]); p.set(x, y + 1, I[0]); }
  p.ell(7, 2.6, 5, 2, OLDW[1]); p.ell(7, 2.3, 4.2, 1.4, OLDW[3]); p.rect(4, 2, 5, 1, OLDW[4]); p.set(7, 2, OLDW[1]);
}
function bookshelf(p: Px): void {
  p.rect(1, 3, 30, 36, MARK); planks(p, 1, 3, 30, 36, { ramp: OLDW, pw: 6, vertical: true, seed: 9, mark: MARK });
  p.rect(1, 0, 30, 3, OLDW[3]); p.rect(1, 0, 30, 1, OLDW[4]); p.rect(0, 2, 32, 2, OLDW[2]); p.rect(0, 2, 32, 1, OLDW[3]); p.rect(0, 4, 32, 1, OLDW[0]);
  p.rect(1, 38, 30, 2, OLDW[1]); p.rect(1, 39, 30, 1, OLDW[0]);
  const cols: Ramp[] = [P.red, P.blue, P.forest, P.violet, P.tan, P.teal, P.ash, P.gold];
  for (let r = 0; r < 3; r++) {
    const y0 = 6 + r * 11, hh = 9;
    p.rect(3, y0, 26, hh, DARK); p.rect(3, y0 + hh, 26, 1, OLDW[3]); p.rect(3, y0 + hh + 1, 26, 1, OLDW[0]);
    let x = 3, k = 0;
    while (x < 28) {
      const h = hash2(k, r, 11), w = 2 + (h % 2), bh = 6 + ((h >>> 2) % 3), C = cols[(h >>> 5) % cols.length];
      if ((h >>> 9) % 7 === 0 && x < 24) {            // Lücke mit Kleinkram
        if (r === 1) { p.ell(x + 2, y0 + hh - 2.5, 2, 2.2, B[3]); p.px([x + 1, y0 + hh - 3, x + 3, y0 + hh - 3], DARK); p.set(x + 1, y0 + hh - 5, B[4]); p.rect(x + 1, y0 + hh - 1, 3, 1, B[2]); }
        else { p.rect(x + 1, y0 + hh - 4, 2, 4, P.cream[3]); p.set(x + 1, y0 + hh - 4, WHITE); p.set(x + 1, y0 + hh - 5, P.fire[3]); p.set(x + 1, y0 + hh - 6, P.fire[2]); }
        x += 5; k++; continue;
      }
      if (x + w > 29) break;
      p.rect(x, y0 + hh - bh, w, bh, C[2]); p.rect(x, y0 + hh - bh, 1, bh, C[3]); p.rect(x, y0 + hh - bh, w, 1, C[3]); if (w > 2) p.rect(x + w - 1, y0 + hh - bh + 1, 1, bh - 1, C[1]);
      p.set(x + (w >> 1), y0 + hh - bh + 2, Y[3]); if (bh > 6) p.set(x + (w >> 1), y0 + hh - 2, Y[2]);
      x += w; k++;
    }
    shadeArea(p, (xx, yy) => xx >= 3 && xx < 29 && yy >= y0 && yy < y0 + 2, DARK, 0.5);
  }
  p.rect(1, 3, 1, 36, OLDW[3]); p.rect(30, 5, 1, 34, OLDW[0]);
  // Schriftrolle obenauf
  p.rect(20, 0, 7, 2, P.cream[3]); p.rect(20, 0, 7, 1, P.cream[4]); p.px([20, 0, 26, 1], P.cream[1]);
}
function table(p: Px): void {
  // Beine, Platte
  for (const x of [3, 26]) { p.rect(x, 11, 3, 10, OLDW[2]); p.rect(x, 11, 1, 10, OLDW[3]); p.rect(x + 2, 11, 1, 10, OLDW[0]); }
  p.rect(6, 15, 20, 1, OLDW[1]);
  p.rect(1, 6, 30, 5, MARK); planks(p, 1, 6, 30, 5, { ramp: OLDW, pw: 3, seed: 13, mark: MARK }); shadeArea(p, (x, y) => y >= 6 && y < 11, WHITE, 0.12);
  p.rect(1, 11, 30, 2, OLDW[1]); p.rect(1, 12, 30, 1, OLDW[0]); p.rect(1, 6, 30, 1, OLDW[4]);
  // Schriftrolle, Tintenfass, Buch, Kerze
  part(p, (l) => { l.rect(12, 6, 11, 4, P.cream[3]); l.rect(12, 6, 11, 1, P.cream[4]); l.rect(11, 6, 2, 4, P.cream[2]); l.rect(22, 6, 2, 4, P.cream[2]); for (let x = 14; x < 21; x += 2) { l.set(x, 7, P.cream[1]); l.set(x + 1, 8, P.cream[1]); } l.set(18, 8, P.red[2]); });
  part(p, (l) => { l.rect(25, 5, 3, 3, DARK); l.set(25, 5, I[2]); l.line(27, 5, 30, 0, WHITE); l.set(30, 0, P.cream[2]); });
  part(p, (l) => { l.rect(3, 3, 2, 5, P.cream[3]); l.set(3, 3, WHITE); l.rect(2, 8, 4, 1, Y[2]); l.set(3, 2, P.fire[4]); l.set(3, 1, P.fire[2]); l.set(5, 5, P.cream[2]); });
  glow(p, 3.5, 2, 4, P.fire[2], 55);
}
function rack(p: Px): void {
  // Gestell
  for (const x of [2, 24]) { p.rect(x, 5, 2, 26, OLDW[2]); p.rect(x, 5, 1, 26, OLDW[3]); p.rect(x - 1, 30, 4, 1, OLDW[1]); }
  p.rect(1, 8, 26, 2, OLDW[2]); p.rect(1, 8, 26, 1, OLDW[4]); p.rect(1, 24, 26, 2, OLDW[2]); p.rect(1, 24, 26, 1, OLDW[3]); p.rect(1, 26, 26, 1, OLDW[0]);
  // Schwert
  part(p, (l) => { l.rect(7, 9, 2, 16, I[3]); l.rect(7, 9, 1, 16, WHITE); l.px([7, 25, 8, 26], I[2]); l.rect(5, 7, 6, 2, Y[2]); l.rect(5, 7, 6, 1, Y[4]); l.rect(7, 3, 2, 4, W[2]); l.rect(7, 2, 2, 1, Y[3]); });
  // Axt
  part(p, (l) => { l.rect(13, 3, 2, 26, W[2]); l.rect(13, 3, 1, 26, W[3]); l.poly([[15, 4], [19, 3], [20, 8], [19, 12], [15, 10]], I[2]); l.line(19, 3, 20, 8, WHITE); l.line(20, 8, 19, 12, I[4]); l.poly([[13, 5], [11, 5], [11, 9], [13, 9]], I[1]); });
  // Speer
  part(p, (l) => { l.line(21, 30, 22, 6, W[2]); l.line(22, 30, 23, 6, W[1]); l.poly([[21, 6], [24, 6], [23, 0]], I[3]); l.line(22, 5, 23, 1, WHITE); l.rect(21, 7, 3, 1, P.red[2]); });
}
function statue(p: Px): void {
  const R = RUNESTONE;
  // Sockel
  p.rect(3, 39, 18, 8, MARK); masonry(p, 3, 39, 18, 8, { ramp: R, bh: 4, bw: 7, seed: 3, mark: MARK }); p.rect(2, 37, 20, 2, R[3]); p.rect(2, 37, 20, 1, R[4]); p.rect(3, 47, 18, 1, R[0]);
  part(p, (l) => {
    // Gewand
    l.poly([[7, 14], [17, 14], [19, 26], [18, 37], [6, 37], [5, 26]], R[2]);
    l.poly([[7, 14], [10, 14], [8, 37], [6, 37], [5, 26]], R[3]); l.poly([[15, 16], [17, 14], [19, 26], [18, 37], [15, 37]], R[1]);
    for (const x of [9, 12, 14]) l.line(x, 22, x - 1, 36, R[1]); l.line(11, 24, 10, 36, R[3]);
    // Kapuze, Gesichtsschatten
    l.poly([[8, 14], [7, 8], [9, 3], [12, 1], [15, 3], [17, 8], [16, 14]], R[2]); l.poly([[8, 14], [7, 8], [9, 3], [12, 1], [11, 6], [10, 14]], R[3]); l.line(9, 3, 12, 1, R[4]);
    l.poly([[10, 13], [10, 7], [12, 5], [14, 7], [14, 13]], DARK); l.px([11, 9, 13, 9], P.teal[3]); l.rect(11, 11, 3, 2, R[0]);
    // Arme, Schwert nach unten
    l.poly([[6, 16], [9, 15], [12, 21], [11, 23], [8, 20]], R[3]); l.poly([[18, 16], [15, 15], [12, 21], [13, 23], [16, 20]], R[1]);
    l.rect(11, 20, 3, 3, R[4]); l.rect(9, 23, 7, 1, R[3]); l.rect(9, 24, 7, 1, R[0]); l.rect(11, 25, 2, 12, R[3]); l.rect(11, 25, 1, 12, R[4]); l.rect(13, 25, 1, 12, R[1]);
    l.line(17, 10, 18, 13, R[0]); l.px([7, 28, 8, 29, 16, 31], R[0]);
  });
  p.px([5, 42, 16, 44], R[0]); p.px([9, 41, 14, 41, 11, 43], Y[1]);
}
function sarcophagus(p: Px): void {
  const R = RUNESTONE;
  // Trog
  p.rect(2, 13, 32, 12, MARK); masonry(p, 2, 13, 32, 12, { ramp: R, bh: 6, bw: 11, seed: 5, rough: 0.3, mark: MARK }); p.rect(2, 25, 32, 1, R[0]); p.rect(2, 13, 32, 1, R[0]);
  for (const x of [8, 18, 28]) { p.rect(x - 1, 16, 3, 6, R[1]); p.rect(x, 17, 1, 4, Y[1]); p.set(x, 17, Y[3]); }
  // Deckel (Draufsicht) mit Relief
  part(p, (l) => {
    l.poly([[3, 2], [33, 2], [35, 5], [35, 12], [1, 12], [1, 5]], R[3]); l.rect(1, 11, 34, 2, R[1]); l.rect(3, 2, 30, 1, R[4]); l.line(1, 5, 3, 2, R[4]);
    l.rect(4, 4, 28, 6, R[2]); l.rect(4, 4, 28, 1, R[1]); l.rect(4, 4, 1, 6, R[1]); l.rect(5, 9, 27, 1, R[4]);
    // liegende Figur
    l.ell(9, 7, 2.6, 2.2, R[3]); l.set(8, 6, R[4]); l.rect(12, 5, 16, 4, R[3]); l.rect(12, 5, 16, 1, R[4]); l.rect(12, 8, 16, 1, R[1]); l.rect(28, 6, 3, 2, R[3]);
    l.rect(15, 6, 9, 1, R[1]); l.rect(19, 5, 1, 4, R[1]); l.px([19, 6], Y[2]);
    l.line(24, 2, 26, 5, R[0]); l.line(26, 5, 25, 9, R[0]); l.px([31, 10, 6, 3], R[1]);
  });
}
function rubble(p: Px): void {
  for (const [x, w, h, s] of [[6, 10, 8, 3], [15, 9, 7, 5], [11, 12, 10, 7], [20, 6, 5, 9], [3, 5, 4, 11], [9, 5, 4, 13], [17, 5, 4, 15]] as const) part(p, (l) => boulder(l, x, 15, w, h, { seed: s, facets: Math.max(2, Math.round(w / 3)), cracks: 0 }));
  p.px([1, 14, 13, 15, 22, 13, 23, 15], S[3]); p.px([0, 15, 23, 14], S[1]);
}
function bones(p: Px): void {
  const bone = (x0: number, y0: number, x1: number, y1: number): void => { p.line(x0, y0, x1, y1, B[3]); p.px([x0, y0 - 1, x0 - 1, y0, x1, y1 + 1, x1 + 1, y1], B[4]); p.set(x0, y0, B[4]); p.set(x1, y1, B[2]); };
  bone(2, 3, 9, 6); bone(13, 2, 9, 8);
  for (let k = 0; k < 3; k++) { p.px([3 + k * 2, 8, 4 + k * 2, 7, 5 + k * 2, 8], B[3]); p.set(4 + k * 2, 7, B[4]); }
  p.px([12, 8, 13, 9, 14, 8], B[2]); p.px([1, 6, 15, 5], B[1]);
}
function skull(p: Px): void {
  p.ell(5, 4.2, 4, 3.8, B[3]); p.ell(4.4, 3.6, 3, 2.6, B[4]); p.rect(3, 7, 5, 2, B[3]); p.rect(3, 8, 5, 1, B[2]);
  p.rect(2, 4, 2, 2, DARK); p.rect(6, 4, 2, 2, DARK); p.set(5, 6, B[1]); p.px([4, 8, 6, 8], B[0]); p.set(8, 5, B[2]); p.set(2, 2, WHITE);
}
function urn(p: Px): void {
  const C: Ramp = [mix(P.tan[0], P.ash[1], 0.4), mix(P.tan[1], S[1], 0.3), mix(P.tan[2], S[2], 0.3), mix(P.tan[3], S[3], 0.25), P.tan[4]];
  p.ball(7, 10.5, 5.6, 6, C, 1, 4); p.rect(4, 16, 6, 2, C[1]); p.rect(4, 17, 6, 1, C[0]); p.rect(4, 2, 6, 3, C[2]); p.rect(4, 2, 1, 3, C[3]); p.rect(3, 1, 8, 1, C[3]); p.rect(4, 0, 6, 1, C[1]); p.rect(5, 1, 4, 1, DARK);
  for (let x = 2; x < 12; x++) if (p.get(x, 9) >>> 24) { p.set(x, 8, x % 2 ? P.teal[1] : P.teal[2]); p.set(x, 10, P.teal[1]); p.set(x, 9, x % 3 === 0 ? Y[2] : C[1]); }
  p.line(9, 5, 10, 9, C[0]); p.px([1, 11, 0, 12], 0);
}
function rug(p: Px, kind: number): void {
  const C: Ramp = kind === 0 ? [P.red[0], P.red[1], mix(P.red[2], P.wood[2], 0.3), mix(P.red[3], P.tan[2], 0.3), P.tan[3]] : [P.blue[0], mix(P.blue[1], P.violet[1], 0.4), mix(P.blue[2], P.violet[2], 0.4), mix(P.blue[3], P.ice[1], 0.4), P.ice[2]];
  const G2 = mix(Y[2], P.tan[1], 0.35), G3 = mix(Y[3], P.tan[3], 0.35);
  for (let y = 1; y < 31; y++) for (let x = 2; x < 46; x++) {
    const ex = Math.min(x - 2, 45 - x), ey = Math.min(y - 1, 30 - y), e = Math.min(ex, ey), n = rnd2(x >> 1, y, 7 + kind), wear = rnd2(x >> 2, y >> 2, 11 + kind);
    if (wear < 0.06 && e > 3) continue;                                   // durchgetretene Stellen
    if (e === 0 && rnd2(x, y, 3) < 0.15) continue;
    let c: number;
    if (e < 1) c = C[1]; else if (e < 3) c = e === 1 ? G3 : G2; else if (e === 3) c = C[1];
    else {
      const u = Math.abs(x - 24), v = Math.abs(y - 16);
      if (kind === 0) { const d = u * 0.55 + v; c = d < 3 ? G3 : d < 5 ? C[1] : d < 9 ? C[3] : d < 10 ? G2 : ((x + y) % 6 === 0 || (x - y + 60) % 6 === 0) ? C[1] : C[2]; }
      else { const dm = ((u + 6) % 12) - 6, dv = ((v + 4) % 8) - 4, d = Math.abs(dm) * 0.66 + Math.abs(dv); c = d < 1.2 ? G3 : d < 2.6 ? C[3] : d < 3.4 ? C[1] : C[2]; }
    }
    if (n < 0.1) c = mix(c, DARK, 0.25); else if (n > 0.92) c = mix(c, WHITE, 0.12);
    if (wear < 0.14 && e > 3) c = mix(c, S[2], 0.4);
    p.set(x, y, c);
  }
  // Fransen
  for (let y = 2; y < 30; y += 2) { if (hash2(0, y, 5 + kind) % 5) { p.set(0, y, C[4]); p.set(1, y, C[3]); } if (hash2(1, y, 5 + kind) % 5) { p.set(47, y, C[3]); p.set(46, y, C[3]); } }
}
function crack(p: Px, k: number): void {
  const paths = [[1, 6, 5, 5, 8, 8, 12, 6, 15, 9, 19, 8], [2, 2, 6, 5, 9, 4, 11, 9, 16, 11], [10, 0, 8, 4, 11, 7, 9, 10, 10, 13]][k], br = [[8, 8, 7, 12], [9, 4, 13, 2], [11, 7, 15, 8]][k];
  const c = alpha(INK, 190), hi = alpha(WHITE, 46);
  for (let i = 0; i + 3 < paths.length; i += 2) { p.line(paths[i], paths[i + 1], paths[i + 2], paths[i + 3], c); p.line(paths[i], paths[i + 1] + 1, paths[i + 2], paths[i + 3] + 1, hi); }
  for (let i = 0; i + 3 < paths.length; i += 2) p.line(paths[i], paths[i + 1], paths[i + 2], paths[i + 3], c);
  p.line(br[0], br[1], br[2], br[3], alpha(INK, 140)); p.set(paths[4], paths[5], alpha(INK, 240)); p.set(paths[4] + 1, paths[5], alpha(INK, 200));
}
function mossPatch(p: Px, k: number): void {
  const w = p.w, h = p.h, G = [P.forest[1], P.green[1], P.green[2], mix(P.green[2], P.green[3], 0.5)];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sc = [1, 0.8, 0.62][k], u = (x + 0.5 - w / 2 - [0, 1, -2][k]) / ((w / 2) * sc), v = (y + 0.5 - h / 2 - [0, -1, 1][k]) / ((h / 2) * sc), d = u * u + v * v + (rnd2(x >> 1, y >> 1, 3 + k) - 0.5) * 0.7, n = rnd2(x, y, 9 + k);
    if (d > 0.95) continue;
    if (d > 0.7) { if (n < 0.55) p.set(x, y, alpha(G[0], 200)); continue; }
    p.set(x, y, n < 0.18 ? G[0] : n > 0.86 ? G[3] : d < 0.3 && n > 0.5 ? G[2] : G[1]);
  }
}
function puddle(p: Px): void {
  const Wt = [P.teal[0], P.blue[1], mix(P.blue[2], P.teal[2], 0.5)];
  for (let y = 0; y < 12; y++) for (let x = 0; x < 20; x++) {
    const u = (x + 0.5 - 10) / 9.5, v = (y + 0.5 - 6) / 5.2, d = u * u + v * v + Math.sin(x * 0.9) * 0.08 + Math.cos(y * 1.3 + x * 0.4) * 0.1;
    if (d > 1) continue;
    p.set(x, y, d > 0.82 ? alpha(P.shadow[1], 150) : alpha(d < 0.35 ? Wt[0] : Wt[1], 200));
  }
  p.px([6, 4, 7, 4, 8, 4, 12, 7, 13, 7], alpha(Wt[2], 230)); p.px([7, 3, 5, 5], alpha(WHITE, 200)); p.px([14, 8, 10, 9], alpha(P.ice[2], 150));
}
function grate(p: Px): void {
  p.rect(1, 1, 14, 14, S[2]); p.rect(1, 1, 14, 1, S[3]); p.rect(1, 1, 1, 14, S[3]); p.rect(1, 14, 14, 1, S[0]); p.rect(14, 1, 1, 14, S[1]);
  p.rect(3, 3, 10, 10, INK); p.rect(3, 3, 10, 1, DARK);
  for (const x of [4, 7, 10]) { p.rect(x, 3, 2, 10, I[1]); p.rect(x, 3, 1, 10, I[2]); p.set(x, 4, I[3]); }
  p.rect(3, 7, 10, 2, I[1]); p.rect(3, 7, 10, 1, I[2]); p.px([2, 2, 13, 2, 2, 13, 13, 13], I[3]); p.px([5, 11, 8, 12], P.teal[1]);
}
function candles(p: Px, f: number): void {
  const C = P.cream;
  part(p, (l) => {
    for (const [x, top, w] of [[2, 6, 3], [6, 3, 3], [9, 8, 2]] as const) { l.rect(x, top, w, 13 - top, C[3]); l.rect(x, top, 1, 13 - top, C[4]); if (w > 2) l.rect(x + w - 1, top + 1, 1, 12 - top, C[2]); l.set(x + 1, top, C[4]); l.set(x + w - 1, top + 2, C[4]); l.set(x + w - 1, top + 3, C[4]); }
    l.rect(1, 12, 10, 1, C[2]); l.px([0, 13, 4, 13, 8, 13, 11, 13], C[2]); l.rect(1, 13, 10, 1, C[1]);
  });
  const fl = (x: number, y: number, k: number): void => { const d = [0, 1, 0, -1][(f + k) & 3], t = (f + k) % 4 === 1 ? 1 : 0; p.set(x, y, P.fire[4]); p.set(x, y - 1, P.fire[3]); p.set(x + (d > 0 ? 1 : d < 0 ? -1 : 0), y - 2 - t, P.fire[2]); if (t) p.set(x, y - 2, P.fire[3]); };
  fl(3, 5, 0); fl(7, 2, 1); fl(10, 7, 2);
  glow(p, 6, 4, 6, P.fire[2], 46 + (f % 2) * 8);
}
function roots(p: Px): void {
  const R: Ramp = [mix(W[0], P.shadow[1], 0.3), mix(W[1], S[1], 0.3), mix(W[2], S[2], 0.3), mix(W[3], S[3], 0.3), mix(W[4], S[4], 0.3)];
  limb(p, bez([8, 0], [4, 12], [9, 24]), 3.6, 1.4); limb(p, bez([9, 24], [12, 30], [8, 35]), 1.4, 0.5);
  limb(p, bez([17, 0], [20, 10], [15, 20]), 3, 1.4); limb(p, bez([15, 20], [12, 26], [16, 32]), 1.4, 0.5);
  limb(p, bez([25, 0], [27, 8], [23, 16]), 2.6, 1); limb(p, bez([23, 16], [20, 22], [24, 28]), 1, 0.5); limb(p, bez([12, 0], [13, 6], [11, 12]), 1.6, 0.6);
  limb(p, bez([6, 14], [1, 18], [2, 26]), 1.2, 0.5); limb(p, bez([18, 12], [24, 14], [28, 22]), 1.1, 0.5); limb(p, bez([29, 0], [31, 5], [29, 11]), 1.3, 0.5); limb(p, bez([3, 0], [1, 4], [2, 9]), 1.2, 0.5);
  barkFill(p, R, 3, MARK, 3);
  // Haarwurzeln, Erdkrume
  for (const [x, y, l2] of [[8, 35, 0], [16, 32, 2], [24, 28, 3], [2, 26, 3], [28, 22, 4], [11, 12, 4]] as const) { p.set(x, y + 1, R[1]); if (l2) p.set(x + (l2 % 2 ? 1 : -1), y + 2, R[1]); }
  p.px([5, 0, 14, 0, 21, 0, 27, 0], R[0]);
}
function glowShroom(p: Px, f: number): void {
  const T = P.teal, cap = (x: number, y: number, r: number): void => {
    p.rect(x, y, 1, 3, P.cream[2]);
    for (let i = -r; i <= r; i++) { p.set(x + i, y, i < 0 ? T[4] : T[3]); if (Math.abs(i) < r) p.set(x + i, y - 1, i < 0 ? (f ? WHITE : T[4]) : T[3]); }
    p.set(x - r, y + 1, T[2]); p.set(x + r, y + 1, T[1]);
  };
  cap(4, 6, 3); cap(9, 8, 2); cap(7, 3, 1);
  inkOutline(p);
  glow(p, 6, 6, 6 + f, T[3], 46 + f * 16); if (f) { p.set(1, 2, alpha(T[4], 200)); p.set(11, 4, alpha(T[4], 160)); }
}

export function cmDungeon(out: Frames): void {
  one(out, 'd_pillar', 16, 44, (p) => pillar(p, false)); one(out, 'd_pillar_broken', 16, 28, (p) => pillar(p, true));
  anim(out, 'd_banner', 4, 16, 36, banner);
  one(out, 'd_chains', 12, 30, chains); one(out, 'd_cobweb', 20, 20, cobweb, false);
  one(out, 'd_crate', 16, 18, crate); one(out, 'd_barrel', 14, 18, barrel);
  one(out, 'd_bookshelf', 32, 40, bookshelf); one(out, 'd_table', 32, 22, table, false); one(out, 'd_rack', 28, 32, rack);
  one(out, 'd_statue', 24, 48, statue); one(out, 'd_sarcophagus', 36, 26, sarcophagus);
  one(out, 'd_rubble', 24, 16, rubble, false); one(out, 'd_bones', 16, 10, bones); one(out, 'd_skull', 10, 10, skull); one(out, 'd_urn', 14, 18, urn);
  one(out, 'd_rug_a', 48, 32, (p) => rug(p, 0), false); one(out, 'd_rug_b', 48, 32, (p) => rug(p, 1), false);
  for (let k = 0; k < 3; k++) one(out, `d_crack_${k}`, 20, 14, (p) => crack(p, k), false);
  for (let k = 0; k < 3; k++) one(out, `d_moss_${k}`, 20, 14, (p) => mossPatch(p, k), false);
  one(out, 'd_puddle', 20, 12, puddle, false); one(out, 'd_grate', 16, 16, grate, false);
  anim(out, 'd_candles', 4, 12, 14, candles, false);
  one(out, 'd_roots', 32, 36, roots);
  anim(out, 'd_mushroom_glow', 2, 12, 12, glowShroom, false);
}
void TAU; void flame; void sw; void texFill;
