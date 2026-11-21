/** Grünwald – Sträucher, Bodenpflanzen, Uferpflanzen, Stümpfe, Stämme, Felsen (v2). */
import { Px, bez } from '../draw';
import {
  Frames, LEAF, LEAF_FINE, Lobe, MARK, P, Ramp, WHITE, anim, barkFill, blade, boulder, crown, hash2, inkOutline, limb, mix, moss, one, part, rings, rnd2, sw,
} from './kit';

const W = P.wood, G = P.green, FO = P.forest;

// ---------------------------------------------------------------- Sträucher
const BUSH: Lobe[] = [
  { x: 12, y: 8, rx: 8, ry: 5.5, lv: 0, amp: 1.5 }, { x: 6, y: 12, rx: 5, ry: 4.5, lv: 0.2, amp: 0.6 }, { x: 18.5, y: 12, rx: 5, ry: 4.5, lv: -0.3, amp: 0.6 }, { x: 12, y: 13.5, rx: 7, ry: 4, lv: 0.3, amp: 0 },
];
function bush(p: Px, f: number, kind: number): void {
  // Stämmchen
  p.px([10, 18, 13, 18, 11, 17], W[1]); p.px([11, 18, 14, 17], W[2]);
  const tf = crown(p, BUSH, { ramp: kind === 2 ? LEAF.light : LEAF.oak, seed: 600 + kind * 37, tuft: 3.3, frame: f, sway: 1 });
  if (kind === 1) {
    for (const t of tf) {
      if (((t.seed >>> 6) & 3) > 1) continue;
      const x = Math.round(t.x) + ((t.seed >>> 9) % 3) - 1, y = Math.round(t.y) + ((t.seed >>> 12) % 3);
      if (p.get(x, y) >>> 24 === 0 || y > 17) continue;
      p.set(x, y, P.red[3]); p.set(x + 1, y, P.red[2]); p.set(x, y + 1, P.red[2]); p.set(x + 1, y + 1, P.red[1]);
      if ((t.seed >>> 15) & 1) { p.set(x + 2, y + 1, P.red[2]); p.set(x + 2, y + 2, P.red[1]); p.set(x, y, P.red[4]); }
    }
  } else if (kind === 2) {
    // Hortensien-Dolden
    const cols: Ramp[] = [P.blue, P.violet, P.pink, P.blue];
    [[6, 8, 0], [13, 5, 1], [18, 9, 2], [10, 12, 3], [16, 14, 1]].forEach(([x, y, c], k) => {
      const C = cols[c], o = sw(f, 1, k * 0.5 - 0.5), X = x + o;
      p.ell(X + 0.5, y + 0.5, 2.6, 2.3, C[2]); p.ell(X, y, 2, 1.7, C[3]);
      p.px([X - 1, y - 1, X, y - 2, X + 1, y], C[4]); p.set(X - 1, y - 2, k % 2 ? WHITE : C[4]); p.px([X + 1, y + 2, X + 2, y + 1], C[1]); p.set(X, y + 1, C[2]);
    });
  }
}

// ---------------------------------------------------------------- Farn, Gras, Korn, Schilf
function frond(p: Px, x0: number, y0: number, x1: number, y1: number, lift: number, c: number, hi: number, dk: number): void {
  const pts = bez([x0, y0], [(x0 * 0.35 + x1 * 0.65), Math.min(y0, y1) - lift], [x1, y1], 14), out = x1 >= x0 ? 1 : -1;
  let lx = -99, ly = -99, k = 0;
  for (let i = 0; i < pts.length; i++) {
    const x = Math.round(pts[i][0]), y = Math.round(pts[i][1]), t = i / 14;
    if (x === lx && y === ly) continue;
    lx = x; ly = y; k++;
    p.set(x, y, t > 0.8 ? hi : c);
    if (t < 0.18 || t > 0.93) continue;
    // Fiederblättchen: abwechselnd oben (hell) und unten (dunkel), zur Spitze kürzer
    if (k % 2 === 0) { p.set(x, y - 1, hi); if (t < 0.6) p.set(x - out, y - 2, c); }
    else { p.set(x, y + 1, dk); if (t < 0.5 && t > 0.3) p.set(x - out, y + 2, dk); }
  }
}
function fern(p: Px, f: number): void {
  const tips: Array<[number, number, number, number]> = [[0, 11, 5, 0], [15, 11, 5, 0], [3, 5, 4, 1], [13, 5, 4, 1], [8, 1, 1, 2]];
  for (const [x, y, lift, r] of tips) {
    const o = sw(f, r === 2 ? 1.4 : r === 1 ? 1.1 : 0.7, x * 0.12 - 0.9), lit = x < 9;
    frond(p, x < 8 ? 7 : 8, 15, x + o, y, lift, lit ? G[3] : G[2], lit ? G[4] : G[3], lit ? G[1] : FO[1]);
  }
  p.px([7, 15, 8, 15], FO[1]); p.px([7, 14, 8, 13], G[1]);
}
function tallgrass(p: Px, f: number): void {
  const bl: Array<[number, number, number, number]> = [[2, 6, -2, 0], [4, 3, -1, 2], [5, 8, 1, 1], [7, 1, 0, 3], [8, 6, -1, 0], [10, 3, 2, 2], [11, 9, 1, 1], [13, 5, 2, 3], [6, 10, -2, 0], [12, 11, 2, 0], [9, 12, 0, 1]];
  bl.forEach(([x, top, lean, c], k) => {
    const o = sw(f, top < 5 ? 1.6 : 1, k * 0.37 - 0.8);
    blade(p, x, 15, x + lean, top, lean * 0.6, [FO[2], G[2], G[3], G[3]][c], [G[2], G[3], G[4], mix(G[4], P.gold[4], 0.4)][c], c === 3, o);
  });
  // Rispen
  const o = sw(f, 1.6, -0.3);
  p.px([7 + o, 0, 7 + o, 1, 8 + o, 2], P.sand[4]); p.set(6 + o, 1, P.sand[3]);
  const o2 = sw(f, 1.6, 0.5); p.px([15 + o2, 4, 15 + o2, 5], P.sand[4]); p.set(14 + o2, 6, P.sand[3]);
}
function ear(p: Px, x: number, y: number, h: number, dir: number): void {
  const Y = P.gold;
  // Grannen
  p.set(x, y - 2, Y[3]); p.set(x - 1, y - 3, mix(Y[3], P.tan[3], 0.5)); p.set(x + 1, y - 2, P.tan[3]); p.set(x + dir * 2, y - 1, Y[3]);
  p.set(x, y - 1, Y[4]);
  for (let j = 0; j < h; j++) {
    const odd = j & 1;
    p.set(x - 1, y + j, odd ? Y[2] : Y[4]); p.set(x, y + j, j < 2 ? Y[4] : Y[3]); p.set(x + 1, y + j, odd ? Y[1] : Y[2]);
  }
  p.set(x + 1, y + h - 1, Y[1]); p.set(x - 1, y + h - 1, Y[2]);
}
function wheat(p: Px, f: number): void {
  const Y = P.gold, st: Array<[number, number, number, number]> = [[3, 7, -2, 7], [5, 2, -1, 8], [8, 5, 0, 7], [10, 1, 1, 8], [12, 8, 2, 6], [7, 10, -1, 6], [13, 3, 2, 7]];
  // Halmblätter
  const o0 = sw(f, 1, -0.4);
  blade(p, 5, 25, 1, 15, -2, mix(Y[2], G[3], 0.45), mix(Y[3], G[4], 0.4), false, o0); blade(p, 10, 25, 15, 16, 2, mix(Y[2], G[3], 0.55), mix(Y[3], G[4], 0.4), false, o0); blade(p, 8, 25, 6, 17, -1, mix(Y[1], G[2], 0.5), undefined, false, o0);
  st.forEach(([x, top, lean, h], k) => {
    const o = sw(f, 1.7, k * 0.33 - 0.7), tx = x + lean + o;
    blade(p, x, 25, x + lean, top + h, lean * 0.5, k % 3 === 0 ? Y[1] : k % 3 === 1 ? Y[2] : P.tan[2], Y[2], false, o);
    ear(p, tx, top, h, lean >= 0 ? 1 : -1);
  });
}
function reeds(p: Px, f: number): void {
  const bl: Array<[number, number, number, number]> = [[3, 8, -1, 0], [5, 2, 0, 1], [7, 5, 1, 2], [8, 0, -1, 1], [10, 3, 1, 2], [12, 7, 2, 0], [13, 11, 2, 1], [6, 12, -2, 0], [9, 9, 0, 0]];
  bl.forEach(([x, top, lean, c], k) => {
    const o = sw(f, top < 5 ? 1.8 : 1.2, k * 0.4 - 0.9);
    blade(p, x, 25, x + lean, top, lean * 0.4, [FO[2], G[2], mix(G[2], G[3], 0.6)][c], [G[2], G[3], mix(G[4], P.sand[4], 0.4)][c], k % 2 === 0, o);
  });
  // geknickter Halm und Rispe
  const o = sw(f, 1.8, -0.2);
  p.line(8 + o, 0, 11 + o, 2, mix(G[4], P.sand[4], 0.4)); p.px([4 + o, 1, 5 + o, 0, 6 + o, 1, 5 + o, 2], P.tan[3]); p.px([5 + o, 1], P.tan[4]);
  p.px([2, 25, 6, 25, 11, 25, 13, 25], FO[1]);
}
function cattail(p: Px, f: number): void {
  const bl: Array<[number, number, number, number]> = [[3, 12, -2, 0], [12, 10, 2, 1], [6, 15, -1, 1], [10, 16, 2, 0], [8, 13, 0, 2]];
  bl.forEach(([x, top, lean, c], k) => {
    const o = sw(f, 1.2, k * 0.4 - 0.6);
    blade(p, x, 27, x + lean, top, lean * 0.5, [FO[2], G[2], G[3]][c], [G[2], G[3], G[4]][c], true, o);
  });
  const heads: Array<[number, number, number]> = [[5, 4, -0.5], [9, 1, 0], [12, 7, 0.5]];
  heads.forEach(([x, top, ph], k) => {
    const o = sw(f, 1.5, ph), X = x + o;
    blade(p, x + (k - 1), 27, x, top + 7, 0, G[2], G[2], false, o);
    p.set(X, top, P.tan[3]); p.set(X, top + 1, P.tan[2]);
    p.rect(X - 1, top + 2, 3, 6, W[1]); p.rect(X - 1, top + 2, 1, 6, W[2]); p.set(X - 1, top + 3, W[3]); p.set(X, top + 2, W[2]); p.rect(X + 1, top + 3, 1, 5, W[0]); p.set(X, top + 7, W[0]);
  });
}

// ---------------------------------------------------------------- Seerosen
function pad(p: Px, cx: number, cy: number, rx: number, ry: number, notch: number): void {
  const L = [FO[2], G[2], G[3], mix(G[3], G[4], 0.5)];
  p.ell(cx, cy + 0.5, rx, ry, L[0]); p.ell(cx, cy, rx, ry - 0.5, L[1]); p.ell(cx - rx * 0.2, cy - ry * 0.25, rx * 0.65, ry * 0.5, L[2]);
  p.set(cx - rx * 0.5, cy - ry * 0.5, L[3]); p.set(cx - rx * 0.3, cy - ry * 0.6, L[3]);
  // Kerbe und Adern
  const nx = cx + (notch > 0 ? rx * 0.55 : -rx * 0.55);
  p.set(nx, cy, 0); p.set(nx + notch, cy, 0); p.set(nx + notch, cy - 1, 0); p.set(nx + notch * 2, cy, 0); p.set(nx + notch * 2, cy - 1, 0); p.set(nx + notch * 2, cy + 1, 0);
  p.set(cx, cy, L[0]); p.set(cx - 1, cy + 1, L[0]); p.set(cx - 2, cy - 1, L[1]);
}
function lilyFlower(p: Px): void {
  pad(p, 6, 6.5, 5.5, 3, 1);
  const K = P.pink;
  p.px([3, 4, 9, 4, 4, 5, 8, 5], K[2]); p.px([4, 3, 8, 3, 5, 5, 7, 5, 6, 5], K[3]); p.px([5, 2, 7, 2, 4, 4, 8, 4, 6, 1], K[4]); p.px([5, 3, 7, 3, 6, 2], WHITE);
  p.px([6, 3, 6, 4], P.gold[3]); p.set(5, 4, P.gold[2]); p.set(7, 4, P.gold[4]);
}

// ---------------------------------------------------------------- Blumen
function stem(p: Px, x: number, y0: number, y1: number, lean = 0): void {
  for (let y = y0; y <= y1; y++) p.set(x + Math.round((lean * (y1 - y)) / Math.max(1, y1 - y0)), y, (y1 - y) % 3 === 2 ? G[1] : G[2]);
}
function leafPair(p: Px, x: number, y: number): void { p.px([x - 1, y, x - 2, y - 1], G[3]); p.px([x + 1, y, x + 2, y - 1], G[2]); }
function flowersA(p: Px): void { // Klatschmohn
  const R = P.red;
  for (const [x, y, big] of [[4, 5, 1], [10, 3, 1], [13, 8, 0], [7, 9, 0], [2, 10, 0]] as const) {
    stem(p, x, y + 1, 15, x < 8 ? 1 : -1);
    if (big) { p.rect(x - 1, y - 1, 3, 3, R[2]); p.px([x - 2, y, x + 2, y, x, y - 2, x, y + 2], R[2]); p.px([x - 1, y - 1, x, y - 2, x - 2, y], R[3]); p.set(x - 1, y - 2, R[4]); p.px([x + 1, y + 1, x + 2, y + 1], R[1]); p.set(x, y, P.shadow[1]); p.set(x + 1, y, P.shadow[2]); }
    else { p.px([x, y, x - 1, y, x, y - 1, x + 1, y], R[2]); p.set(x - 1, y - 1, R[3]); p.set(x, y, R[1]); }
  }
  p.px([12, 12, 12, 11], G[3]); p.set(12, 10, R[1]); leafPair(p, 5, 12); leafPair(p, 10, 11);
}
function flowersB(p: Px): void { // Glockenblumen
  const B = P.blue;
  for (const [x, top, dir] of [[4, 3, 1], [9, 1, -1], [12, 5, 1], [7, 7, -1]] as const) {
    stem(p, x, top + 1, 15); p.set(x + dir, top, G[2]); p.set(x + dir * 2, top, G[3]);
    for (let k = 0; k < 3; k++) {
      const bx = x + dir * (2 - (k > 1 ? 1 : 0)) + (k === 1 ? -dir * 3 : 0), by = top + 1 + k * 3;
      if (by > 12) break;
      p.set(bx, by, B[3]); p.rect(bx - (dir > 0 ? 0 : 1), by + 1, 2, 2, B[2]); p.set(bx - (dir > 0 ? 0 : 1), by + 1, B[3]); p.set(bx + (dir > 0 ? 1 : 0), by + 2, B[1]); p.set(bx, by + 1, B[4]);
    }
  }
  p.px([2, 14, 3, 13, 13, 14, 14, 13, 6, 14], G[3]); p.px([5, 15, 10, 15], G[1]);
}
function flowersC(p: Px): void { // Butterblumen
  const Y = P.gold;
  for (const [x, y] of [[3, 6], [8, 3], [12, 7], [6, 10], [13, 12], [2, 12]] as const) {
    stem(p, x, y + 1, 15, x < 8 ? 1 : -1);
    p.px([x - 1, y, x + 1, y, x, y - 1, x, y + 1], Y[3]); p.set(x, y, Y[2]); p.set(x - 1, y - 1, Y[4]); p.set(x, y - 1, Y[4]); p.set(x + 1, y + 1, Y[2]);
  }
  leafPair(p, 8, 9); leafPair(p, 4, 13); p.px([10, 14, 11, 13], G[3]);
}
function flowersD(p: Px): void { // Margeriten
  for (const [x, y] of [[4, 4], [10, 2], [13, 8], [7, 9], [2, 10]] as const) {
    stem(p, x, y + 2, 15, x < 8 ? 1 : -1);
    p.px([x - 2, y, x + 2, y, x, y - 2, x, y + 2, x - 1, y - 1, x + 1, y - 1, x - 1, y + 1, x + 1, y + 1], WHITE); p.px([x - 1, y, x + 1, y, x, y - 1, x, y + 1], P.cream[4]);
    p.px([x + 2, y, x + 1, y + 1, x, y + 2], P.cream[2]); p.set(x, y, P.gold[3]); p.set(x, y + 1, P.gold[2]);
  }
  leafPair(p, 5, 13); leafPair(p, 11, 12);
}
function flowersE(p: Px): void { // Lupinen
  const V = P.violet;
  for (const [x, top, h] of [[4, 2, 9], [9, 0, 10], [13, 5, 7], [7, 7, 5]] as const) {
    stem(p, x, top + h, 15);
    for (let j = 0; j < h; j++) {
      const w = j < 2 ? 0 : 1, y = top + j, c = j < 2 ? V[4] : j < h * 0.5 ? V[3] : V[2];
      p.set(x, y, c); if (w) { p.set(x - 1, y, j % 2 ? c : j < h * 0.5 ? V[4] : V[3]); p.set(x + 1, y, j % 2 ? V[1] : V[2]); }
    }
    p.set(x, top, P.pink[4]);
  }
  for (const [x, y] of [[2, 13], [11, 13], [6, 14]] as const) { p.px([x, y, x - 1, y - 1, x + 1, y - 1, x - 2, y, x + 2, y], G[3]); p.set(x, y - 2, G[4]); p.set(x, y + 1, G[1]); }
}
function flowersF(p: Px): void { // Malven
  const K = P.pink;
  for (const [x, y] of [[4, 3], [10, 5], [6, 9], [12, 10]] as const) {
    stem(p, x, y + 2, 15, x < 8 ? 1 : -1);
    p.rect(x - 1, y - 1, 3, 3, K[3]); p.px([x - 2, y, x + 2, y, x, y - 2, x, y + 2, x - 2, y - 1, x + 2, y - 1, x - 1, y - 2, x + 1, y - 2], K[3]);
    p.px([x - 1, y - 2, x - 2, y - 1, x, y - 2], K[4]); p.px([x + 2, y, x + 1, y + 1, x, y + 2], K[2]); p.set(x, y, K[1]); p.set(x, y - 1, WHITE); p.set(x - 1, y + 1, K[2]);
  }
  p.px([3, 12, 2, 11, 9, 13, 8, 12, 13, 14, 14, 13], G[3]); p.px([4, 12, 10, 13], G[2]); p.rect(7, 2, 2, 2, K[2]); p.set(7, 2, K[4]); stem(p, 8, 4, 8);
}
function clover(p: Px): void {
  for (let k = 0; k < 20; k++) {
    const a = rnd2(k, 1, 41) * 6.283, r = Math.sqrt(rnd2(k, 2, 41)), x = Math.round(8 + Math.cos(a) * r * 6), y = Math.round(5.5 + Math.sin(a) * r * 3.6), lit = hash2(k, 3, 41) % 3 === 0, c = lit ? G[4] : k % 2 ? G[3] : G[2];
    p.px([x, y, x - 1, y + 1, x + 1, y + 1], c); p.set(x, y + 1, G[1]); if (lit) p.set(x, y, mix(G[4], WHITE, 0.3));
  }
  for (const [x, y] of [[5, 4], [11, 7], [8, 9]] as const) { p.px([x, y, x + 1, y, x, y - 1], WHITE); p.set(x + 1, y - 1, P.pink[4]); p.set(x + 1, y + 1, P.pink[3]); p.set(x, y + 1, G[1]); }
}
function shroom(p: Px, x: number, base: number, r: number, h: number, C: Ramp, dots = true): void {
  const S = P.cream, sw2 = Math.max(1, Math.round(r * 0.45));
  p.rect(x - sw2 / 2, base - h, sw2, h, S[3]); p.rect(x - sw2 / 2, base - h, 1, h, S[4]); if (sw2 > 1) p.rect(x + sw2 / 2 - 1, base - h + 1, 1, h - 1, S[2]);
  const cy = base - h;
  for (let j = -Math.ceil(r * 0.8); j <= 1; j++) {
    const hw = j > 0 ? r - 1 : Math.sqrt(Math.max(0, 1 - (j / (r * 0.85)) ** 2)) * r;
    for (let i = Math.round(x - hw); i < Math.round(x + hw); i++) {
      const u = (i + 0.5 - x) / r;
      p.set(i, cy + j, j > 0 ? S[1] : u < -0.35 && j < -r * 0.25 ? C[3] : u > 0.45 || j === 0 ? C[1] : C[2]);
    }
  }
  if (dots) { p.set(x - r * 0.45, cy - r * 0.45, WHITE); if (r > 2.4) { p.set(x + r * 0.3, cy - r * 0.6, S[4]); p.set(x + r * 0.55, cy - 1, S[4]); p.set(x - r * 0.1, cy - 1, WHITE); } if (r > 4) { p.set(x - r * 0.7, cy - 1, S[4]); p.set(x + 1, cy - r * 0.35, WHITE); } }
}
function mushrooms(p: Px): void {
  shroom(p, 5, 11, 3.6, 4, P.red); shroom(p, 11, 11, 2.6, 3, P.red); shroom(p, 14, 11, 1.6, 2, P.tan, false); shroom(p, 8, 11, 1.4, 1, P.red, false);
  p.px([2, 11, 9, 11], G[2]);
}
function mushroomBig(p: Px): void {
  shroom(p, 7, 19, 6.2, 9, P.red);
  // Manschette, Lamellen
  p.rect(6, 13, 3, 1, P.cream[4]); p.set(5, 13, P.cream[3]); p.set(9, 14, P.cream[2]);
  for (let x = 3; x < 12; x += 2) p.set(x, 11, P.cream[2]);
  shroom(p, 13, 19, 2.4, 3, P.red); p.px([3, 19, 10, 19, 4, 18], G[2]); p.set(2, 19, G[3]);
}

// ---------------------------------------------------------------- Stumpf, Stamm
function stump(p: Px, mossy: boolean): void {
  p.poly([[3, 5], [17, 5], [18, 11], [19, 14], [1, 14], [2, 11]], MARK);
  limb(p, [[3, 12], [0, 14]], 1.6, 1); limb(p, [[17, 12], [19, 14]], 1.6, 1); limb(p, [[9, 13], [8, 14]], 1.4, 1);
  barkFill(p, W, 91, MARK, 3);
  p.ell(10, 5.5, 8, 3.6, W[1]); rings(p, 10, 5.2, 7, 2.9, P.tan, 4); p.set(10, 5, P.tan[1]); p.px([7, 4, 8, 4], P.tan[4]);
  // Axtkerbe und Riss
  p.px([4, 4, 5, 5, 4, 5], W[0]); p.line(12, 5, 15, 6, P.tan[1]);
  if (mossy) {
    moss(p, (x, y) => (y < 9 ? 0.72 - x * 0.02 : y > 11 ? 0.5 : 0.25), 21);
    part(p, (l) => { shroom(l, 16, 13, 1.8, 2, P.tan, false); shroom(l, 18, 14, 1.3, 1, P.tan, false); });
    p.px([3, 2, 4, 1], G[3]); p.set(3, 3, G[2]); // Grashalm
  } else {
    moss(p, (x, y) => (y > 11 && x < 8 ? 0.4 : 0), 22);
    // Spross
    p.px([15, 3, 15, 2, 15, 1], G[2]); p.px([16, 0, 17, 0, 14, 1, 13, 0], G[4]); p.px([16, 1, 13, 1], G[3]);
  }
}
function log(p: Px, mossy: boolean): void {
  const v = new Px(18, 40);
  v.rect(4, 3, 12, 31, MARK);
  for (let y = 0; y < 3; y++) v.rect(5 + (y === 0 ? 2 : y === 1 ? 1 : 0), 2 - y + 1, 10 - (y === 0 ? 4 : y === 1 ? 2 : 0), 1, MARK);
  barkFill(v, W, 95, MARK, 4);
  const h = Px.map(40, 18, v, (x, y) => [y, x]);
  p.draw(h);
  // Schnittfläche rechts
  p.ell(33.5, 10, 4, 6.4, W[1]); rings(p, 33.5, 9.8, 3.2, 5.6, P.tan, 6); p.px([32, 6, 32, 7], P.tan[4]); p.line(33, 10, 35, 13, P.tan[1]);
  // Aststumpf, Rindenplatzer
  p.rect(13, 2, 3, 2, W[2]); p.set(13, 2, W[3]); p.set(15, 3, W[1]); p.set(14, 1, P.tan[3]); p.set(15, 1, P.tan[2]);
  p.ell(22, 9, 1.6, 1.2, W[0]); p.set(21, 8, W[3]);
  p.px([2, 6, 2, 9, 3, 12], W[0]);
  if (mossy) {
    moss(p, (x, y) => (x < 31 ? (y < 8 ? 0.8 - Math.abs(x - 14) * 0.012 : y < 11 ? 0.3 : 0) : 0), 25);
    // Baumpilze und Mooshalme
    for (const [x, y] of [[8, 12], [11, 13], [24, 12]] as const) { p.rect(x, y, 3, 1, P.tan[3]); p.set(x, y, P.tan[4]); p.rect(x, y + 1, 3, 1, P.tan[1]); p.set(x + 1, y + 1, P.tan[2]); }
    part(p, (l) => { shroom(l, 19, 4, 2, 2, P.red); shroom(l, 16, 4, 1.4, 1, P.red, false); });
    p.px([6, 2, 26, 2, 27, 1], G[3]);
  } else moss(p, (x, y) => (x < 12 && y < 7 ? 0.35 : 0), 26);
}

// ---------------------------------------------------------------- Felsen
function pebbles(p: Px): void {
  const S = P.stone;
  for (const [x, y, w] of [[2, 3, 3], [7, 1, 4], [12, 4, 3], [5, 5, 2], [9, 5, 3], [14, 2, 2]] as const) {
    p.rect(x, y, w, 2, S[2]); p.rect(x, y, w - 1, 1, S[3]); p.set(x, y, S[4]); p.rect(x, y + 2, w, 1, S[0]); p.set(x + w - 1, y + 1, S[1]);
  }
}
function leafpile(p: Px): void {
  const cols = [P.gold[2], P.gold[3], P.fire[1], P.tan[2], P.red[2], W[2], P.gold[1], mix(G[3], P.gold[3], 0.5)];
  for (let k = 0; k < 26; k++) {
    const a = rnd2(k, 1, 33), r = Math.sqrt(rnd2(k, 2, 33)), x = Math.round(8 + Math.cos(a * 6.283) * r * 6.5), y = Math.round(6 + Math.sin(a * 6.283) * r * 3 - (1 - r) * 2), c = cols[hash2(k, 3, 33) % cols.length];
    p.set(x, y, c); p.set(x + 1, y, c); p.set(x + (k % 2 ? 0 : 1), y + 1, mix(c, P.shadow[1], 0.4)); if (k % 3 === 0) p.set(x, y - 1, mix(c, WHITE, 0.25));
  }
}

export function gwPlants(out: Frames): void {
  anim(out, 'bush', 4, 24, 20, (p, f) => bush(p, f, 0));
  anim(out, 'bush_berry', 4, 24, 20, (p, f) => bush(p, f, 1));
  anim(out, 'bush_flower', 4, 24, 20, (p, f) => bush(p, f, 2));
  anim(out, 'fern', 4, 16, 16, fern);
  anim(out, 'tallgrass', 4, 16, 16, tallgrass);
  anim(out, 'wheat', 4, 16, 26, wheat);
  anim(out, 'reeds', 4, 16, 26, reeds);
  anim(out, 'cattail', 4, 16, 28, cattail);
  one(out, 'lilypad_a', 12, 8, (p) => pad(p, 6, 4, 5.4, 3.2, 1));
  one(out, 'lilypad_b', 12, 8, (p) => { pad(p, 4, 3, 3.6, 2.4, -1); pad(p, 9, 5.5, 2.6, 1.8, 1); });
  one(out, 'lily_flower', 12, 10, lilyFlower);
  one(out, 'flowers_a', 16, 16, flowersA); one(out, 'flowers_b', 16, 16, flowersB); one(out, 'flowers_c', 16, 16, flowersC);
  one(out, 'flowers_d', 16, 16, flowersD); one(out, 'flowers_e', 16, 16, flowersE); one(out, 'flowers_f', 16, 16, flowersF);
  one(out, 'clover', 16, 12, clover, false);
  one(out, 'mushrooms', 16, 12, mushrooms); one(out, 'mushroom_big', 16, 20, mushroomBig);
  one(out, 'stump', 20, 16, (p) => stump(p, false)); one(out, 'stump_moss', 20, 16, (p) => stump(p, true));
  one(out, 'log', 40, 18, (p) => log(p, false)); one(out, 'log_moss', 40, 18, (p) => log(p, true));
  one(out, 'rock_s', 16, 14, (p) => boulder(p, 8, 13, 13, 11, { seed: 3 }));
  one(out, 'rock_m', 24, 20, (p) => { part(p, (l) => boulder(l, 10, 19, 18, 17, { seed: 7 })); part(p, (l) => boulder(l, 19, 19, 9, 8, { seed: 9 })); }, false);
  one(out, 'rock_l', 36, 28, (p) => { part(p, (l) => boulder(l, 20, 26, 28, 25, { seed: 12, cracks: 3 })); part(p, (l) => boulder(l, 8, 27, 14, 13, { seed: 15 })); part(p, (l) => boulder(l, 30, 27, 10, 8, { seed: 17 })); }, false);
  one(out, 'rock_moss', 28, 22, (p) => { part(p, (l) => boulder(l, 12, 21, 22, 19, { seed: 21, moss: 1 })); part(p, (l) => boulder(l, 23, 21, 9, 8, { seed: 23, moss: 0.8 })); }, false);
  one(out, 'pebbles', 16, 8, pebbles);
  one(out, 'leafpile', 16, 10, leafpile);
}
void inkOutline; void LEAF_FINE;
