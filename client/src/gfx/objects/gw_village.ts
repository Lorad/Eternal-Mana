/** Grünwald – Dorf- und Bauwerks-Requisiten (v2). */
import { Px } from '../draw';
import {
  Frames, MARK, MARK2, P, Ramp, WHITE, anim, band, blade, box, boulder, clamp, embers, flame, glow, hash2, inkOutline, masonry, mix, moss, one, part, planks, rings, rnd2,
  shadeArea, sw, texFill,
} from './kit';
import { ROOF_RED, STRAW, roofTiles, thatch } from './gw_houses';

const W = P.wood, T = P.tan, S = P.stone, G = P.green, I = P.steel, C = P.cream, Y = P.gold;
const SHADE = P.shadow[2];

/** Pfosten/Balken mit Lichtkante, Maserung und optional Kappe. */
export function post(p: Px, x: number, y0: number, y1: number, w = 3, R: Ramp = W): void {
  p.rect(x, y0, w, y1 - y0 + 1, R[2]); p.rect(x, y0, 1, y1 - y0 + 1, R[3]); p.rect(x + w - 1, y0, 1, y1 - y0 + 1, R[1]);
  for (let y = y0 + 2; y < y1 - 1; y += 4) p.set(x + 1 + (hash2(x, y, 2) % Math.max(1, w - 2)), y, R[1]);
  p.rect(x, y0, w, 1, R[4]);
}
export function rail(p: Px, x0: number, x1: number, y: number, h = 2, R: Ramp = W): void {
  p.rect(x0, y, x1 - x0 + 1, h, R[2]); p.rect(x0, y, x1 - x0 + 1, 1, R[3]); if (h > 2) p.rect(x0, y + h - 1, x1 - x0 + 1, 1, R[1]);
  for (let x = x0 + 3; x < x1 - 1; x += 5) p.set(x, y + (hash2(x, y, 3) & 1), hash2(x, y, 4) & 1 ? R[1] : R[4]);
}

function well(p: Px): void {
  // Brunnenschacht
  p.ell(16, 36, 13, 6, MARK); p.rect(3, 27, 26, 9, MARK);
  masonry(p, 3, 26, 26, 17, { bh: 4, bw: 6, seed: 3, rough: 0.6, mark: MARK });
  shadeArea(p, (x, y) => y > 27 && x > 23, SHADE, 0.3); shadeArea(p, (x, y) => y > 27 && x < 6, WHITE, 0.12);
  p.ell(16, 27, 13, 5.5, S[3]); p.ell(16, 26.6, 12.4, 5, S[4]);
  for (let k = 0; k < 14; k++) { const a = (k / 14) * 6.283, x = 16 + Math.cos(a) * 11.5, y = 26.8 + Math.sin(a) * 4.5; p.set(x, y, S[2]); }
  p.ell(16, 27.4, 9.2, 3.4, S[0]); p.ell(16, 28, 8.4, 2.6, P.teal[0]); p.px([12, 28, 13, 29, 19, 28], P.teal[2]); p.set(14, 28, P.teal[3]);
  moss(p, (x, y) => (y > 37 ? 0.45 : y < 30 && x < 10 ? 0.3 : 0), 4);
  // Gestell und Dach
  part(p, (l) => {
    post(l, 4, 9, 29); post(l, 25, 9, 29);
    rail(l, 6, 25, 13, 2); l.rect(28, 13, 3, 1, I[1]); l.rect(30, 13, 1, 4, I[1]); l.set(30, 17, W[3]); // Kurbel
    l.rect(13, 12, 6, 4, T[2]); l.rect(13, 12, 6, 1, T[3]); l.px([14, 14, 16, 13, 17, 15], T[1]);     // Seilrolle
    l.rect(16, 16, 1, 5, T[3]);
    // Eimer
    l.rect(13, 21, 6, 5, W[2]); l.rect(13, 21, 1, 5, W[3]); l.rect(18, 21, 1, 5, W[1]); l.rect(13, 22, 6, 1, I[2]); l.rect(13, 25, 6, 1, I[1]); l.px([13, 20, 18, 20, 14, 19, 17, 19, 15, 18, 16, 18], I[1]); l.rect(14, 21, 4, 1, P.teal[2]);
  });
  part(p, (l) => {
    l.poly([[16, 0], [32, 10], [32, 12], [0, 12], [0, 10]], MARK); roofTiles(l, ROOF_RED, 0, 12, 7, 3, 4);
    l.line(16, 0, 0, 10, ROOF_RED[4]); l.rect(0, 11, 32, 1, ROOF_RED[0]); l.rect(14, 0, 4, 1, W[1]);
    moss(l, (x, y) => (x < 9 && y > 6 ? 0.4 : 0), 5);
  });
}
function stall(p: Px): void {
  // hintere Pfosten, Theke
  post(p, 4, 12, 40); post(p, 41, 12, 40);
  p.rect(3, 26, 42, 15, MARK); planks(p, 3, 26, 42, 15, { ramp: T, pw: 5, seed: 5, mark: MARK, nails: true });
  p.rect(2, 24, 44, 3, W[3]); p.rect(2, 24, 44, 1, W[4]); p.rect(2, 26, 44, 1, W[1]);
  shadeArea(p, (x, y) => y >= 27 && y < 30, SHADE, 0.28);
  post(p, 3, 27, 42, 2); post(p, 43, 27, 42, 2);
  // Waren: Äpfel, Brot, Kohl, Krüge
  for (const [x, c] of [[6, P.red], [9, P.red], [8, P.fire], [11, P.red]] as const) { p.rect(x, 21 + (x % 2), 3, 3, c[2]); p.set(x, 21 + (x % 2), c[4]); p.set(x + 2, 23 + (x % 2), c[1]); }
  p.rect(5, 23, 10, 2, W[2]); p.rect(5, 23, 10, 1, W[3]);
  p.ell(20, 22, 3.5, 2.4, T[2]); p.ell(19.5, 21.5, 2.6, 1.6, T[3]); p.px([18, 21, 20, 21, 22, 22], T[1]); p.ell(26, 22.4, 3, 2, T[2]); p.px([25, 21, 27, 22], T[4]);
  for (const x of [31, 35]) { p.ell(x + 1.5, 21.5, 2.6, 2.6, G[2]); p.ell(x + 1, 21, 1.8, 1.8, G[3]); p.set(x, 20, G[4]); p.set(x + 2, 22, G[1]); }
  p.rect(39, 18, 4, 6, P.teal[2]); p.rect(39, 18, 1, 6, P.teal[3]); p.rect(40, 17, 2, 1, C[3]); p.rect(42, 19, 1, 5, P.teal[1]);
  // Hängende Würste/Kräuter
  p.rect(14, 12, 1, 4, T[1]); p.rect(13, 16, 3, 3, P.red[1]); p.set(13, 16, P.red[3]); p.rect(30, 12, 1, 3, T[1]); p.px([29, 15, 30, 15, 31, 16, 30, 17, 29, 17], G[3]); p.set(30, 16, G[1]);
  // gestreifte Markise
  part(p, (l) => {
    l.poly([[6, 1], [42, 1], [48, 12], [0, 12]], MARK);
    texFill(l, MARK, (x, y) => { const k = Math.floor((x - 24 + (x < 24 ? -1 : 1) * (y - 1) * 0.3 + 60) / 6), red = k % 2 === 0, lit = y < 4; return red ? (lit ? P.red[3] : y > 9 ? P.red[1] : P.red[2]) : lit ? WHITE : y > 9 ? C[2] : C[4]; });
    for (let x = 0; x < 48; x++) { const k = Math.floor(x / 6), red = k % 2 === 0, m = x % 6; if (m > 0 && m < 5) { l.set(x, 12, red ? P.red[2] : C[4]); l.set(x, 13, red ? P.red[1] : C[3]); if (m > 1 && m < 4) l.set(x, 14, red ? P.red[1] : C[2]); } }
    l.rect(6, 0, 36, 1, W[2]);
  });
}
function barrel(p: Px): void {
  for (let y = 3; y < 19; y++) { const b = y < 6 ? 6 - (6 - y) * 0.5 : y > 15 ? 6 - (y - 15) * 0.5 : 6.5, x0 = Math.round(8 - b), x1 = Math.round(8 + b); p.rect(x0, y, x1 - x0, 1, MARK); }
  planks(p, 0, 3, 16, 16, { ramp: W, pw: 3, vertical: true, seed: 9, mark: MARK, worn: 0.6 });
  shadeArea(p, (x, y) => x > 10 && y > 3, SHADE, 0.25); shadeArea(p, (x, y) => x < 5 && y > 3, WHITE, 0.1);
  for (const y of [6, 14]) { for (let x = 1; x < 15; x++) if (p.get(x, y) >>> 24) { p.set(x, y, x < 4 ? I[3] : x > 10 ? I[1] : I[2]); p.set(x, y + 1, I[1]); } p.set(7, y, I[4]); }
  p.ell(8, 3.5, 5.6, 2.2, W[1]); p.ell(8, 3.2, 4.8, 1.6, T[2]); p.rect(5, 3, 6, 1, T[3]); p.px([6, 2, 9, 4], T[1]); p.set(8, 3, W[1]);
}
function crate(p: Px): void {
  p.rect(2, 2, 12, 5, MARK); planks(p, 2, 2, 12, 5, { ramp: T, pw: 3, vertical: true, seed: 12, mark: MARK }); shadeArea(p, (x, y) => y < 7, WHITE, 0.18);
  p.rect(2, 7, 12, 8, MARK); planks(p, 2, 7, 12, 8, { ramp: T, pw: 3, seed: 13, mark: MARK, worn: 0.8 });
  p.rect(2, 7, 12, 1, T[0]); p.rect(2, 7, 2, 8, T[1]); p.rect(12, 7, 2, 8, T[1]); p.rect(2, 7, 1, 8, T[2]); p.rect(2, 14, 12, 1, T[0]);
  p.line(4, 13, 11, 8, T[1]); p.line(4, 12, 10, 8, T[3]);
  p.px([2, 8, 13, 8, 2, 13, 13, 13], I[3]); p.rect(2, 2, 12, 1, T[4]); p.px([2, 2, 13, 2, 2, 6, 13, 6], I[2]);
}
function sack(l: Px, x: number, y: number, w: number, h: number, seed: number): void {
  const B: Ramp = [mix(T[0], W[0], 0.3), T[1], T[2], T[3], T[4]];
  l.ball(x + w / 2, y + h / 2 + 1, w / 2, h / 2 - 0.5, B, 1, 4); l.rect(x + 1, y + h - 2, w - 2, 2, B[1]); l.rect(x + 2, y + h - 1, w - 4, 1, B[0]);
  l.rect(x + w / 2 - 1, y, 3, 2, B[2]); l.px([x + w / 2 - 2, y - 1, x + w / 2 + 2, y - 1, x + w / 2, y - 1], B[3]); l.rect(x + w / 2 - 1, y + 1, 3, 1, W[1]);
  for (let k = 0; k < 4; k++) l.set(x + 2 + (hash2(k, 1, seed) % (w - 4)), y + 3 + (hash2(k, 2, seed) % (h - 5)), B[1]);
}
function sacks(p: Px): void {
  part(p, (l) => sack(l, 7, 3, 8, 12, 1)); part(p, (l) => sack(l, 1, 6, 8, 9, 2));
  p.rect(3, 9, 3, 3, mix(T[1], P.red[1], 0.4)); p.px([3, 9, 5, 11], T[0]);   // Flicken
  p.px([12, 14, 13, 15, 14, 15, 11, 15], Y[3]); p.px([13, 14, 15, 15], Y[2]); // verstreutes Korn
}
function wheel(l: Px, cx: number, cy: number, r: number): void {
  l.ell(cx, cy, r, r, W[1]); l.ell(cx, cy, r - 1, r - 1, W[3]); l.ell(cx, cy, r - 2, r - 2, 0);
  for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI + 0.3; l.line(cx - Math.cos(a) * (r - 1.5), cy - Math.sin(a) * (r - 1.5), cx + Math.cos(a) * (r - 1.5), cy + Math.sin(a) * (r - 1.5), W[2]); }
  l.ell(cx, cy, 1.6, 1.6, I[2]); l.set(cx - 0.5, cy - 0.5, I[4]);
  for (let k = 0; k < 16; k++) { const a = (k / 16) * 6.283; if (Math.sin(a) > 0.2) l.set(cx + Math.cos(a) * (r - 0.6), cy + Math.sin(a) * (r - 0.6), W[0]); }
}
function cart(p: Px): void {
  // Deichsel, Wagenkasten
  p.line(1, 27, 12, 18, W[2], 2); p.line(1, 27, 12, 18, W[3]);
  p.rect(10, 14, 30, 8, MARK); planks(p, 10, 14, 30, 8, { ramp: W, pw: 3, seed: 15, mark: MARK, nails: true });
  for (const x of [10, 19, 29, 38]) post(p, x, 8, 21, 2);
  rail(p, 10, 39, 9, 2);
  // Heuladung
  part(p, (l) => {
    l.poly([[11, 13], [12, 6], [18, 2], [30, 1], [37, 5], [39, 13]], MARK); thatch(l, STRAW, 17, 5);
    shadeArea(l, (x, y) => x > 30 && y > 5, SHADE, 0.2);
    for (const [x, y] of [[14, 3], [22, 0], [34, 2], [38, 8], [10, 9]] as const) l.set(x, y, STRAW[3]);
  });
  rail(p, 10, 39, 12, 2);
  part(p, (l) => wheel(l, 31, 22, 6.5)); part(p, (l) => wheel(l, 15, 23, 5.5));
}
function lamp(p: Px, f: number): void {
  const B: Ramp = [P.ash[0], I[0], I[1], I[2], I[3]];
  // Fuß und Mast
  p.rect(5, 41, 6, 2, B[1]); p.rect(6, 39, 4, 2, B[2]); p.rect(5, 41, 6, 1, B[2]); p.rect(7, 13, 2, 27, B[1]); p.rect(7, 13, 1, 27, B[3]); p.rect(6, 30, 4, 1, B[2]); p.rect(6, 20, 4, 1, B[2]);
  // Schnörkelarm
  p.px([9, 16, 10, 15, 11, 15, 12, 16, 12, 17, 11, 18], B[1]); p.px([6, 16, 5, 15, 4, 15, 3, 16, 3, 17, 4, 18], B[2]);
  // Laterne
  p.rect(5, 12, 6, 1, B[2]); p.rect(4, 3, 8, 1, B[2]); p.poly([[5, 3], [11, 3], [9, 0], [7, 0]], B[1]); p.rect(7, 0, 2, 1, B[3]); p.set(6, 2, B[3]);
  p.rect(5, 4, 6, 8, Y[3]); p.rect(5, 4, 1, 8, B[1]); p.rect(10, 4, 1, 8, B[0]); p.rect(8, 4, 1, 8, mix(Y[2], B[1], 0.5));
  const fl = [0, 1, 0, -1][f];
  p.rect(6, 6 - (f === 1 ? 1 : 0), 2, 4, P.fire[4]); p.set(6 + (fl > 0 ? 1 : 0), 5 - (f === 1 ? 1 : 0), P.fire[3]); p.set(9, 7 + fl, P.fire[4]); p.px([6, 10, 7, 10, 9, 10], P.fire[2]); p.set(6, 11, P.fire[1]); p.set(9, 11, P.fire[1]);
  p.set(6, 5, WHITE);
  inkOutline(p);
  glow(p, 8, 8, 8 + (f & 1), Y[3], 70 + (f === 1 ? 14 : f === 3 ? -8 : 0));
}
function signpost(p: Px): void {
  post(p, 7, 4, 26, 2); p.rect(6, 26, 4, 1, W[1]); p.px([7, 3, 8, 3], W[4]);
  const arrow = (y: number, dir: number, R: Ramp): void => {
    p.rect(2, y, 12, 5, R[2]); p.rect(2, y, 12, 1, R[4]); p.rect(2, y + 4, 12, 1, R[1]);
    const tx = dir > 0 ? 14 : 1; p.px([tx, y + 1, tx, y + 2, tx, y + 3, tx + dir, y + 2], R[2]); p.set(tx, y + 1, R[3]);
    const bx = dir > 0 ? 2 : 13; p.set(bx, y, 0); p.set(bx, y + 4, 0); p.set(bx, y + 2, 0);
    for (let x = 4; x < 12; x += 2) p.set(x + (x % 4 === 0 ? 1 : 0), y + 2, W[0]); p.set(8, y + 1, I[3]);
  };
  arrow(6, 1, T); arrow(13, -1, [W[0], W[1], W[2], W[3], W[4]]);
  moss(p, (x, y) => (y > 22 ? 0.4 : 0), 8);
}
function bountyBoard(p: Px): void {
  post(p, 3, 6, 34); post(p, 30, 6, 34);
  p.rect(4, 8, 28, 19, MARK); planks(p, 4, 8, 28, 19, { ramp: W, pw: 5, seed: 21, mark: MARK, nails: true });
  p.rect(4, 8, 28, 1, W[0]); p.rect(4, 26, 28, 1, W[0]); p.rect(4, 8, 1, 19, W[1]); p.rect(31, 8, 1, 19, W[0]);
  // Zettel
  const note = (x: number, y: number, w: number, h: number, tilt: number, seal?: number): void => {
    p.rect(x, y, w, h, C[3]); p.rect(x, y, w, 1, C[4]); p.rect(x + w - 1, y + 1, 1, h - 1, C[2]); p.rect(x, y + h - 1, w, 1, C[2]);
    if (tilt) { p.set(x + (tilt > 0 ? w - 1 : 0), y, 0); p.set(x + (tilt > 0 ? 0 : w - 1), y + h - 1, 0); }
    for (let j = 2; j < h - 2; j += 2) p.rect(x + 1, y + j, w - 2 - ((j * 3) % 3), 1, mix(C[1], P.shadow[2], 0.3));
    p.set(x + (w >> 1), y, P.red[2]);
    if (seal !== undefined) { p.rect(x + w - 3, y + h - 3, 2, 2, seal); }
  };
  note(6, 10, 8, 10, 1, P.red[2]); note(15, 9, 7, 8, 0); note(23, 11, 7, 11, -1, Y[3]); note(14, 18, 8, 7, 1);
  // Steckbrief-Skizze
  p.rect(24, 13, 5, 4, mix(C[1], P.shadow[2], 0.3)); p.px([25, 14, 27, 14], C[4]); p.rect(25, 16, 3, 1, C[4]);
  // Dächlein
  part(p, (l) => { l.poly([[1, 6], [3, 2], [33, 2], [35, 6], [35, 8], [1, 8]], MARK); roofTiles(l, ROOF_RED, 2, 6, 23, 3, 4); l.rect(1, 7, 34, 1, ROOF_RED[0]); l.rect(3, 2, 30, 1, ROOF_RED[4]); });
  moss(p, (x, y) => (y > 30 ? 0.35 : 0), 9);
}
function anvil(p: Px): void {
  // Holzklotz
  p.rect(4, 9, 12, 6, MARK); planks(p, 4, 9, 12, 6, { ramp: W, pw: 4, vertical: true, seed: 25, mark: MARK }); p.ell(10, 9.5, 6, 1.8, T[2]); p.rect(6, 9, 8, 1, T[3]);
  part(p, (l) => {
    l.rect(7, 7, 6, 3, I[1]); l.rect(6, 9, 8, 1, I[1]); l.rect(8, 6, 4, 2, I[2]);
    l.poly([[0, 3], [5, 1], [17, 1], [17, 6], [5, 6], [2, 5]], I[2]); l.rect(5, 1, 12, 2, I[3]); l.rect(5, 1, 11, 1, I[4]); l.line(1, 3, 5, 2, I[3]); l.rect(5, 5, 12, 1, I[1]); l.rect(16, 2, 1, 4, I[1]); l.set(14, 2, I[2]);
  });
  // Hammer
  part(p, (l) => { l.line(12, 13, 18, 8, W[3]); l.rect(17, 6, 3, 4, I[2]); l.rect(17, 6, 3, 1, I[4]); l.rect(19, 7, 1, 3, I[1]); });
}
function forge(p: Px, f: number): void {
  // Esse: Sockel
  p.rect(2, 24, 26, 19, MARK); masonry(p, 2, 24, 26, 19, { bh: 4, bw: 7, seed: 27, rough: 0.5, mark: MARK });
  shadeArea(p, (x, y) => x > 23 && y >= 24, SHADE, 0.3);
  p.rect(1, 21, 28, 3, S[3]); p.rect(1, 21, 28, 1, S[4]); p.rect(1, 23, 28, 1, S[1]);
  // Feuerloch mit Glut
  p.rect(8, 29, 14, 12, P.ash[0]); p.px([8, 29, 21, 29, 9, 29, 20, 29, 8, 30, 21, 30], S[2]);
  embers(p, 9, 36, 12, 4, f, 5); p.rect(8, 40, 14, 1, S[1]);
  flame(p, 13, 36, 2, 5, f); flame(p, 18, 36, 1.5, 4, f + 2);
  for (let k = 0; k < 6; k++) { const a = Math.PI * (k / 5); p.set(15 - Math.cos(a) * 7.5, 30 - Math.sin(a) * 3, k % 2 ? S[4] : S[3]); }
  // Rauchfang
  part(p, (l) => {
    l.poly([[4, 21], [9, 8], [10, 0], [20, 0], [21, 8], [26, 21]], MARK); masonry(l, 2, 0, 26, 21, { bh: 4, bw: 6, seed: 29, rough: 0.5, mark: MARK });
    shadeArea(l, (x, y) => x > 19 + (y > 8 ? (y - 8) * 0.35 : 0), SHADE, 0.3); l.rect(9, 0, 12, 2, S[3]); l.rect(9, 0, 12, 1, S[4]); l.rect(11, 0, 8, 1, P.ash[0]);
    l.rect(6, 19, 18, 2, P.ash[1]); l.rect(7, 18, 16, 1, P.ash[2]);
  });
  // glühende Kohlen auf der Herdplatte
  embers(p, 9, 20, 12, 2, f + 1, 7); p.set(11 + f, 19, P.fire[3]); p.set(18 - f, 19, P.fire[2]);
  // Zange und Blasebalg
  part(p, (l) => { l.line(27, 26, 27, 36, I[2]); l.line(29, 26, 28, 36, I[1]); l.rect(26, 25, 4, 1, I[3]); l.poly([[24, 38], [31, 36], [31, 42], [24, 41]], T[2]); l.rect(24, 38, 7, 1, T[3]); l.line(25, 39, 30, 38, W[1]); l.line(25, 41, 30, 41, W[1]); l.rect(22, 39, 2, 2, I[1]); });
  inkOutline(p);
  glow(p, 15, 34, 9 + (f & 1), P.fire[2], 60, true); glow(p, 15, 19, 6, P.fire[2], 40 + f * 4, true);
  // Funken
  p.set(12 + f * 2, 15 - f, P.fire[4]); p.set(19 - f, 13 + (f % 2), P.fire[3]);
}
function haystack(p: Px): void {
  p.poly([[1, 22], [2, 14], [6, 6], [12, 2], [17, 2], [23, 7], [26, 15], [27, 22]], MARK); thatch(p, STRAW, 33, 5);
  shadeArea(p, (x, y) => x > 18 + (y < 10 ? 2 : 0) && y > 5, SHADE, 0.22); shadeArea(p, (x, y) => x < 10 && y < 12, WHITE, 0.12);
  for (const [x, y] of [[0, 20], [4, 8], [9, 3], [20, 4], [27, 17], [14, 1], [25, 11]] as const) p.set(x, y, STRAW[3]);
  p.px([3, 22, 8, 22, 15, 22, 22, 22, 25, 22], STRAW[0]);
  // Heugabel
  part(p, (l) => { l.line(22, 20, 16, 3, W[3]); l.line(23, 20, 17, 3, W[1]); l.px([14, 0, 14, 1, 15, 2, 16, 0, 16, 1, 18, 0, 18, 1, 17, 2, 16, 2], I[3]); l.px([14, 0, 16, 0, 18, 0], I[4]); });
}
function tent(p: Px): void {
  const K: Ramp = [mix(C[0], P.shadow[2], 0.3), C[1], C[2], C[3], C[4]];
  // Rückwand/Seitenflächen
  p.poly([[22, 3], [43, 37], [1, 37]], MARK);
  texFill(p, MARK, (x, y) => { const left = x < 22 - (y - 3) * 0.05, seam = (x + Math.round((y - 3) * (left ? -0.3 : 0.3))) % 9 === 0; const n = rnd2(x >> 1, y >> 1, 3); return left ? (seam ? K[2] : n > 0.9 ? K[4] : K[3]) : seam ? K[0] : n > 0.85 ? K[2] : K[1]; });
  // Eingang
  p.poly([[22, 12], [31, 37], [13, 37]], P.shadow[0]); p.poly([[22, 16], [27, 37], [17, 37]], P.shadow[1]);
  p.poly([[22, 11], [16, 30], [12, 37], [15, 37], [20, 28]], K[4]); p.line(22, 11, 13, 37, K[2]); p.poly([[22, 11], [28, 30], [32, 37], [29, 37], [24, 28]], K[2]); p.line(22, 11, 31, 37, K[0]);
  p.px([17, 30, 27, 30], T[1]);
  // Zierborte, Flicken, First
  for (let x = 2; x < 43; x++) if (p.get(x, 35) >>> 24 && !(x > 12 && x < 32)) { p.set(x, 34, x % 4 < 2 ? P.teal[2] : P.teal[3]); p.set(x, 35, P.teal[1]); }
  p.rect(33, 24, 4, 4, mix(K[1], P.red[1], 0.4)); p.px([33, 24, 36, 27], K[0]); p.rect(6, 28, 3, 3, K[2]); p.set(6, 28, K[0]);
  p.line(22, 1, 22, 5, W[2]); p.set(22, 0, W[4]); p.px([21, 2, 23, 3], T[3]);
  // Heringe und Spannseile
  p.line(1, 37, 0, 39, T[3]); p.line(43, 37, 43, 39, T[2]); p.rect(0, 38, 2, 2, W[2]); p.rect(42, 38, 2, 2, W[1]); p.rect(20, 37, 5, 2, mix(T[1], P.shadow[1], 0.4));
}
function banner(p: Px, f: number): void {
  const TL = P.teal;
  post(p, 2, 2, 43, 2); p.rect(1, 43, 4, 1, W[1]); p.px([2, 0, 3, 0, 2, 1, 3, 1], Y[3]); p.set(2, 0, Y[4]); p.set(3, 1, Y[1]);
  rail(p, 2, 14, 4, 1); p.set(14, 4, Y[3]); p.set(14, 5, Y[2]);
  // Tuch: Spalten mit wanderndem Wellenversatz
  for (let x = 5; x < 14; x++) {
    const u = (x - 5) / 8, ph = (f * Math.PI) / 2 - u * 2.2, dy = Math.round(Math.sin(ph) * (0.4 + u * 1.3)), light = Math.cos(ph);
    const len = 26 + (x === 9 ? -4 : Math.abs(x - 9) === 1 ? -3 : Math.abs(x - 9) === 2 ? -1 : 0);   // Schwalbenschwanz
    for (let j = 0; j < len; j++) {
      const y = 5 + j + (j > 3 ? dy : 0);
      let c = light > 0.45 ? TL[3] : light < -0.45 ? TL[1] : TL[2];
      if (x === 5 || x === 13) c = light > 0 ? Y[3] : Y[2];
      else if (j === 2) c = Y[2];
      else if (j >= len - 2) c = light > 0 ? Y[3] : Y[2];
      p.set(x, y, c);
    }
    // Quell-Emblem (Spirale mit Tropfen)
    const e = (dx: number, dyy: number, c: number): void => { if (x === 9 + dx) p.set(x, 15 + dyy + dy, c); };
    for (const [dx, dyy] of [[0, -3], [1, -2], [2, -1], [2, 0], [2, 1], [1, 2], [0, 2], [-1, 2], [-2, 1], [-2, 0], [-1, -1], [0, 0], [0, -6], [0, -5], [-1, -5], [1, -5]] as const) e(dx, dyy, dyy < -3 ? TL[4] : Y[3]);
    e(0, -4, WHITE); e(1, 0, Y[4]);
  }
}
function bench(p: Px): void {
  post(p, 3, 2, 14, 2); post(p, 23, 2, 14, 2);
  rail(p, 2, 25, 3, 3); rail(p, 2, 25, 7, 2);
  p.rect(1, 9, 26, 3, W[3]); p.rect(1, 9, 26, 1, W[4]); p.rect(1, 11, 26, 1, W[1]); p.px([6, 10, 14, 10, 20, 10], W[2]);
  post(p, 4, 12, 15, 2); post(p, 22, 12, 15, 2); p.rect(6, 13, 16, 1, W[1]);
  p.px([2, 9, 26, 9], I[3]);
}
function woodpile(p: Px): void {
  post(p, 1, 3, 19, 2); post(p, 25, 3, 19, 2);
  const lg = (x: number, y: number, r: number, k: number): void => { p.ell(x, y, r, r, W[1]); rings(p, x, y, r - 0.8, r - 0.8, T, k); p.set(x - 1, y - r + 1, W[3]); };
  for (let i = 0; i < 4; i++) lg(6.5 + i * 5.2, 16, 2.9, i);
  for (let i = 0; i < 3; i++) lg(9 + i * 5.2, 11.2, 2.9, i + 4);
  lg(11.6, 6.6, 2.8, 8); lg(17, 6.4, 2.6, 9);
  // gespaltene Scheite obenauf, Axt
  p.rect(5, 6, 4, 2, T[3]); p.rect(5, 8, 4, 1, W[1]); p.set(5, 6, T[4]);
  part(p, (l) => { l.line(21, 2, 24, 9, W[3]); l.poly([[18, 1], [22, 0], [23, 3], [19, 4]], I[2]); l.line(18, 1, 19, 4, I[4]); });
  moss(p, (x, y) => (y > 16 && x < 8 ? 0.3 : 0), 11);
}
function scarecrow(p: Px): void {
  post(p, 11, 14, 39, 2); p.rect(10, 39, 4, 1, W[1]);
  rail(p, 2, 21, 17, 2);
  // Hemd
  const R: Ramp = [P.red[0], P.red[1], mix(P.red[2], T[2], 0.3), mix(P.red[3], T[3], 0.3), P.red[4]];
  p.poly([[7, 15], [17, 15], [18, 28], [16, 30], [13, 28], [10, 31], [6, 28]], R[2]); p.rect(3, 15, 5, 4, R[2]); p.rect(16, 15, 5, 4, R[1]); p.rect(7, 15, 4, 12, R[3]); p.rect(15, 17, 3, 11, R[1]);
  p.rect(9, 22, 3, 3, P.blue[2]); p.set(9, 22, P.blue[3]); p.px([12, 18, 12, 20, 12, 22], T[4]); p.rect(7, 26, 11, 1, T[1]);
  // Strohhände, Strohfransen
  for (const [x, d] of [[1, -1], [21, 1]] as const) { p.px([x, 16, x, 18, x + d, 17, x + d, 19, x, 20], STRAW[3]); p.px([x - d, 17, x - d, 18], STRAW[2]); }
  p.px([8, 31, 10, 32, 13, 30, 15, 32, 17, 31, 12, 32], STRAW[3]); p.px([9, 31, 14, 31, 16, 31], STRAW[2]);
  // Sackkopf mit Strohhut
  p.ell(12, 10.5, 4, 4.2, T[3]); p.ell(11.4, 10, 3, 3.2, T[4]); p.px([10, 10, 14, 10], P.shadow[1]); p.px([10, 12, 11, 13, 12, 12, 13, 13, 14, 12], W[1]); p.rect(10, 14, 5, 1, T[1]); p.set(12, 11, P.red[2]);
  p.ell(12, 6.6, 7.4, 2, STRAW[1]); p.ell(12, 6, 7, 1.6, STRAW[3]); p.poly([[8, 6], [9, 2], [15, 2], [16, 6]], STRAW[2]); p.rect(9, 2, 6, 1, STRAW[4]); p.rect(8, 5, 8, 1, P.red[2]); p.px([5, 6, 7, 5, 18, 7], STRAW[4]); p.px([13, 3, 14, 4], STRAW[1]);
  // Krähe auf dem Arm
  part(p, (l) => { l.rect(17, 13, 4, 3, P.shadow[1]); l.rect(19, 11, 3, 3, P.shadow[1]); l.set(22, 12, Y[2]); l.set(20, 12, WHITE); l.px([16, 14, 15, 15], P.shadow[0]); l.set(18, 13, P.shadow[3]); });
}
function beehive(p: Px): void {
  // Ständer
  post(p, 3, 15, 21, 2); post(p, 11, 15, 21, 2); p.rect(1, 13, 14, 2, W[3]); p.rect(1, 13, 14, 1, W[4]); p.rect(1, 15, 14, 1, W[1]);
  part(p, (l) => {
    for (let y = 1; y < 13; y++) { const hw = y < 5 ? 2 + y * 1.1 : 6.5; const x0 = Math.round(8 - hw), x1 = Math.round(8 + hw); for (let x = x0; x < x1; x++) { const u = (x + 0.5 - 8) / hw, band2 = y % 3 === 0; l.set(x, y, band2 ? STRAW[u > 0.3 ? 0 : 1] : u < -0.35 ? STRAW[4] : u > 0.45 ? STRAW[1] : y % 3 === 1 ? STRAW[3] : STRAW[2]); } }
    l.rect(7, 0, 2, 1, STRAW[2]); l.ell(8, 10, 1.6, 1.4, P.shadow[0]);
  });
  p.px([13, 5, 2, 8], Y[4]); p.px([14, 5, 3, 8], P.shadow[1]); p.set(13, 4, WHITE); p.set(2, 7, WHITE);
}
function shrine(p: Px): void {
  const M: Ramp = [S[0], mix(S[1], P.forest[1], 0.2), mix(S[2], P.sand[2], 0.25), mix(S[3], P.sand[3], 0.25), mix(S[4], P.sand[4], 0.2)];
  // Stufensockel
  p.rect(2, 44, 32, 7, MARK); p.rect(6, 38, 24, 6, MARK); masonry(p, 2, 38, 32, 13, { ramp: M, bh: 4, bw: 9, seed: 41, rough: 0.5, mark: MARK });
  p.rect(2, 44, 32, 1, M[4]); p.rect(6, 38, 24, 1, M[4]); p.rect(2, 45, 4, 1, M[3]); p.rect(30, 45, 4, 1, M[3]);
  // Schaft mit Nische
  p.rect(9, 14, 18, 24, MARK); masonry(p, 9, 14, 18, 24, { ramp: M, bh: 6, bw: 9, seed: 43, rough: 0.3, mark: MARK });
  shadeArea(p, (x, y) => x > 23 && y >= 14 && y < 38, SHADE, 0.28); p.rect(9, 14, 1, 24, M[4]);
  p.rect(12, 19, 12, 14, M[0]); p.ell(18, 20, 6, 4, M[0]); p.rect(13, 21, 10, 12, P.shadow[1]); p.ell(18, 21.5, 5, 3.4, P.shadow[1]);
  // Figur: kleine Quellgeist-Stele mit Spiralrune
  p.rect(16, 24, 5, 9, M[2]); p.ell(18.5, 24, 2.5, 2.5, M[3]); p.rect(16, 24, 1, 9, M[3]); p.rect(20, 25, 1, 8, M[1]);
  p.px([18, 27, 19, 28, 18, 29, 17, 28], P.teal[3]); p.set(18, 28, P.teal[4]); p.px([17, 23, 19, 23], P.shadow[0]);
  // Giebeldach
  part(p, (l) => {
    l.poly([[18, 1], [32, 12], [32, 16], [4, 16], [4, 12]], MARK); masonry(l, 4, 0, 28, 16, { ramp: M, bh: 5, bw: 8, seed: 45, rough: 0.4, mark: MARK });
    l.line(18, 1, 4, 12, M[4]); l.line(18, 2, 6, 12, M[3]); l.rect(4, 15, 28, 1, M[0]); shadeArea(l, (x, y) => x > 20 && y > 3 && y < 15, SHADE, 0.2);
    l.px([17, 0, 18, 0], M[2]);
  });
  // Wasserschale
  part(p, (l) => { l.ell(18, 39, 7, 2.8, M[1]); l.ell(18, 38, 7, 2.6, M[3]); l.ell(18, 38, 5.6, 1.8, P.teal[1]); l.ell(17, 37.8, 3.6, 1, P.teal[2]); l.px([15, 37, 16, 38], P.teal[4]); l.rect(13, 41, 10, 2, M[2]); l.rect(13, 43, 10, 1, M[0]); });
  // Risse, Moos, Opferblumen
  p.line(25, 16, 23, 22, M[0]); p.line(23, 22, 24, 26, M[0]); p.line(6, 46, 9, 49, M[0]);
  moss(p, (x, y) => (y < 12 ? 0.55 - x * 0.012 : y > 43 ? 0.5 - Math.abs(x - 6) * 0.02 : x < 13 && y < 30 ? 0.38 : y > 37 && y < 41 && x > 24 ? 0.5 : 0), 13);
  p.px([27, 42, 29, 42, 28, 41], P.red[3]); p.px([28, 42, 27, 43, 29, 43], G[3]); p.px([8, 42, 9, 43], WHITE); p.set(8, 43, Y[3]); p.set(7, 43, G[3]);
  blade(p, 3, 51, 1, 46, -1, G[2], G[4]); blade(p, 33, 51, 35, 47, 1, G[2], G[3]);
}
function birdhouse(p: Px): void {
  post(p, 7, 14, 43, 2); p.rect(6, 43, 4, 1, W[1]); p.line(8, 22, 12, 17, W[1]); p.line(7, 22, 3, 17, W[2]);
  part(p, (l) => {
    l.rect(3, 6, 10, 10, MARK); planks(l, 3, 6, 10, 10, { ramp: T, pw: 3, vertical: true, seed: 51, mark: MARK });
    shadeArea(l, (x, y) => y < 8, SHADE, 0.25); l.ell(8, 10.5, 2, 2, P.shadow[0]); l.set(7, 9, W[0]); l.rect(7, 13, 3, 1, W[3]); l.set(9, 14, W[1]); l.rect(2, 15, 12, 1, W[3]); l.rect(2, 16, 12, 1, W[1]);
  });
  part(p, (l) => { l.poly([[8, 0], [15, 6], [15, 8], [1, 8], [1, 6]], MARK); roofTiles(l, ROOF_RED, 0, 8, 53, 3, 3); l.line(8, 0, 1, 6, ROOF_RED[4]); l.rect(1, 7, 14, 1, ROOF_RED[0]); });
  // Meise auf der Stange
  p.rect(10, 11, 3, 2, P.blue[3]); p.set(12, 10, P.blue[2]); p.set(13, 11, Y[3]); p.set(10, 12, Y[4]); p.set(9, 12, P.blue[1]);
}
function campfire(p: Px, f: number): void {
  // Steinring (hinten), Scheite, Flamme, Steinring (vorn)
  for (const [x, y] of [[5, 15], [9, 14], [13, 15]] as const) part(p, (l) => boulder(l, x + 1, y + 2, 5, 4, { seed: x, facets: 3, cracks: 0 }));
  part(p, (l) => { l.line(4, 20, 14, 15, W[2], 2); l.line(4, 20, 14, 15, W[3]); l.line(16, 20, 6, 15, W[1], 2); l.line(16, 20, 6, 15, W[2]); l.px([14, 15, 15, 16, 6, 15], P.ash[1]); l.px([9, 17, 10, 18, 11, 17], P.fire[2]); l.set(10, 17, P.fire[3]); });
  flame(p, 10, 18, 3.6, 12, f); flame(p, 7, 18, 1.6, 5, f + 1); flame(p, 13, 18, 1.5, 4, f + 3);
  for (const [x, s] of [[1, 31], [5, 33], [10, 35], [15, 37]] as const) part(p, (l) => boulder(l, x + 2, 23, 5 + (s % 2), 4 + (s % 2), { seed: s, facets: 3, cracks: 0 }));
  glow(p, 10, 14, 10, P.fire[2], 55 + (f === 1 ? 12 : f === 3 ? -6 : 0));
  p.set(8 + f, 3 + (f % 2), P.fire[3]); p.set(13 - f, 5 - (f % 2), P.fire[2]);
}
function fenceH(p: Px): void {
  rail(p, 0, 15, 6, 2); rail(p, 0, 15, 11, 2); p.rect(0, 8, 16, 1, W[0]); p.rect(0, 13, 16, 1, W[0]);
  part(p, (l) => { post(l, 6, 2, 15); l.rect(6, 15, 3, 1, W[1]); l.px([7, 6, 7, 11], I[3]); l.set(6, 2, W[4]); l.set(8, 2, W[2]); });
  p.px([2, 6, 12, 11], W[4]); p.px([3, 12, 13, 7], W[1]);
}
function fenceV(p: Px): void {
  // Riegel laufen "in die Tiefe": ein senkrechter Doppelstreifen über die ganze Höhe → kachelt vertikal; Pfosten davor
  p.rect(7, 0, 2, 24, W[2]); p.rect(7, 0, 1, 24, W[3]); p.rect(9, 0, 1, 24, W[0]); p.rect(6, 0, 1, 24, W[1]);
  for (let y = 1; y < 24; y += 4) { p.set(7, y, W[4]); p.set(8, y + 2, W[1]); }
  part(p, (l) => { post(l, 6, 10, 22, 4); l.rect(6, 22, 4, 1, W[1]); l.rect(6, 23, 4, 1, W[0]); l.px([7, 13, 8, 18], P.steel[3]); l.rect(5, 9, 6, 1, W[4]); l.rect(5, 10, 6, 1, W[2]); l.rect(6, 8, 4, 1, W[3]); });
}
function fencePost(p: Px): void {
  post(p, 2, 2, 17, 4); p.rect(2, 2, 4, 1, W[4]); p.rect(1, 1, 6, 1, W[3]); p.rect(2, 0, 4, 1, W[2]); p.rect(2, 17, 4, 1, W[1]); p.set(3, 8, I[3]);
  moss(p, (x, y) => (y > 13 ? 0.45 : y < 2 ? 0.3 : 0), 15);
}
function wallRuin(p: Px, end: boolean): void {
  const w = p.w, h = p.h, top = (x: number): number => (end ? 4 + Math.max(0, x - 5) * 0.8 + (hash2(x >> 2, 1, 7) % 3) : 3 + (hash2(Math.floor(x / 5), 2, 9) % 5) + (x > 34 ? (x - 34) * 0.5 : 0) + (x < 5 ? (5 - x) * 1.2 : 0));
  const R: Ramp = [S[0], S[1], mix(S[2], P.sand[2], 0.2), mix(S[3], P.sand[3], 0.2), S[4]];
  for (let x = 1; x < w - 1; x++) { const t = Math.round(top(x)); if (t < h - 3) p.rect(x, t, 1, h - 1 - t, MARK); }
  masonry(p, 0, 0, w, h, { ramp: R, bh: 5, bw: 9, seed: end ? 61 : 63, rough: 0.9, mark: MARK });
  // Mauerkrone: sichtbare Oberseiten heller
  for (let x = 1; x < w - 1; x++) { const t = Math.round(top(x)); if (t < h - 3) { p.set(x, t, R[4]); p.set(x, t + 1, R[3]); if (hash2(x, 3, 5) % 4 === 0) p.set(x, t + 2, R[3]); } }
  shadeArea(p, (x, y) => y > h - 6, SHADE, 0.18);
  moss(p, (x, y) => { const t = top(x); return y < t + 4 ? 0.62 - (x / w) * 0.25 : y > h - 5 ? 0.4 : x < 10 && !end ? 0.3 : 0.08; }, end ? 17 : 19);
  // herabgefallene Steine, Efeu
  for (const [x, s] of end ? [[17, 3], [21, 5]] as const : [[42, 7], [45, 8], [2, 9]] as const) part(p, (l) => boulder(l, x, h - 1, 5 + (s % 2), 4, { ramp: R, seed: s, facets: 3, cracks: 0 }));
  if (!end) { for (let k = 0; k < 9; k++) { const x = 20 + ((k * 5) % 9) - k, y = 8 + k * 1.6; p.set(x, y, k % 2 ? G[3] : G[2]); p.set(x + 1, y, G[2]); if (k % 3 === 0) p.set(x - 1, y + 1, G[4]); } }
}
function bridgePost(p: Px): void {
  post(p, 2, 3, 18, 4); p.rect(2, 18, 4, 1, W[1]);
  p.rect(1, 1, 6, 2, I[2]); p.rect(1, 1, 6, 1, I[3]); p.rect(2, 0, 4, 1, I[3]); p.set(2, 0, I[4]);
  for (const y of [6, 8]) { p.rect(1, y, 6, 1, T[3]); p.set(1, y, T[4]); p.set(6, y, T[1]); } p.rect(1, 7, 6, 1, T[2]); p.px([6, 9, 6, 10], T[2]);
  moss(p, (x, y) => (y > 14 ? 0.5 : 0), 21);
}

export function gwVillage(out: Frames): void {
  one(out, 'well', 32, 44, well);
  one(out, 'stall', 48, 44, stall);
  one(out, 'barrel', 16, 20, barrel); one(out, 'crate', 16, 16, crate); one(out, 'sacks', 16, 16, sacks);
  one(out, 'cart', 44, 30, cart);
  anim(out, 'lamp', 4, 16, 44, lamp, false);
  one(out, 'signpost', 16, 28, signpost);
  one(out, 'bounty_board', 36, 36, bountyBoard);
  one(out, 'anvil', 20, 16, anvil);
  anim(out, 'forge', 4, 32, 44, forge, false);
  one(out, 'haystack', 28, 24, haystack);
  one(out, 'tent', 44, 40, tent);
  anim(out, 'banner', 4, 16, 44, banner);
  one(out, 'bench', 28, 16, bench); one(out, 'woodpile', 28, 20, woodpile); one(out, 'scarecrow', 24, 40, scarecrow);
  one(out, 'beehive', 16, 22, beehive); one(out, 'shrine', 36, 52, shrine); one(out, 'birdhouse', 16, 44, birdhouse);
  anim(out, 'campfire', 4, 20, 24, campfire, false);
  one(out, 'fence_h', 16, 16, fenceH); one(out, 'fence_v', 16, 24, fenceV); one(out, 'fence_post', 8, 18, fencePost);
  one(out, 'wall_ruin_h', 48, 26, (p) => wallRuin(p, false)); one(out, 'wall_ruin_end', 24, 24, (p) => wallRuin(p, true));
  one(out, 'bridge_post', 8, 20, bridgePost);
}
void MARK2; void band; void box; void clamp; void thatch;
