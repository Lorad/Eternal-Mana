/** Kristallkoloss (Erde/Licht, langsamer Läufer): Golem aus dunklem Höhlenfels mit Kristallwuchs und Kristallherz. 112×112. */
import { Px, crystal } from '../draw';
import type { Pt } from '../draw';
import { P, INK, WHITE, alpha, mix, rnd2 } from '../palette';
import type { Ramp } from '../palette';
import { pk, R, boulder, bsel, cracks, ease, glow, lay, lerp, puff, rays, rmix, spark } from './kit';
import type { BFr, BossDef } from './kit';

const GY = 105;
const ROCK: Ramp = [P.shadow[1], mix(P.steel[0], P.shadow[2], 0.35), mix(P.steel[1], P.stone[1], 0.5), mix(P.steel[2], P.stone[2], 0.5), mix(P.steel[3], P.stone[3], 0.5)];
const ROCK_D: Ramp = [P.shadow[0], P.shadow[1], ROCK[1], ROCK[2], ROCK[3]];
const BLAZE: Ramp = [P.ice[1], P.ice[2], P.ice[3], P.ice[4], WHITE];
const DIM: Ramp = [P.steel[0], P.steel[0], P.steel[1], mix(P.steel[2], P.teal[2], 0.4), P.steel[3]];

interface K { tx: number; ty: number; hd: Pt; ff: Pt; bf: Pt; pulse: number; blaze: number; bfFront: boolean; step: number }

function pose(f: BFr): K {
  const s = Math.sin(f.ph), c = Math.cos(f.ph), i = f.i;
  const z: K = { tx: 0, ty: 0, hd: [0, 0], ff: [93, 101], bf: [19, 91], pulse: 0.5, blaze: 0, bfFront: false, step: 0 };
  switch (f.a) {
    case 'idle': z.tx = R(s * 1.4); z.ty = R(0.5 - c * 0.9); z.ff = [93 + R(s * 1.2), 101 + R(0.5 - c)]; z.bf = [19 + R(s), 91 + R(0.5 + c)]; z.pulse = 0.5 + 0.5 * Math.sin(f.ph * 2); z.hd = [0, i === 2 || i === 3 ? 1 : 0]; z.step = s; break;
    case 'windup': z.tx = [-2, -3][i]; z.ty = [-2, -3][i]; z.ff = pk([[94, 60], [91, 41]], i); z.bf = pk([[18, 62], [26, 42]], i); z.hd = [-1, -1]; z.pulse = [0.8, 1][i]; break;
    case 'attack':
      z.tx = [2, 7, 7, 4][i]; z.ty = [-1, 8, 9, 4][i]; z.ff = pk([[94, 70], [93, 105], [93, 105], [93, 99]], i); z.bf = pk([[36, 62], [64, 105], [64, 105], [40, 96]], i);
      z.hd = pk([[2, 1], [5, 6], [5, 7], [2, 3]], i); z.bfFront = i === 1 || i === 2; z.pulse = [1, 1, 0.7, 0.5][i]; break;
    case 'special':
      z.tx = [3, 4, 4, 3][i]; z.ty = [5, 6, 6, 5][i]; z.hd = pk([[4, 6], [5, 7], [5, 7], [4, 6]], i); z.ff = pk([[84, 97], [81, 95], [82, 96], [84, 97]], i); z.bf = pk([[16, 86], [15, 84], [15, 85], [16, 86]], i);
      z.blaze = [0.65, 1, 0.8, 1][i]; z.pulse = 1; break;
    case 'hit': z.tx = [-3, -2][i]; z.ty = [-1, 0][i]; z.hd = [-2, -1]; z.ff = pk([[92, 96], [94, 99]], i); z.bf = pk([[17, 86], [18, 89]], i); z.pulse = 0.1; break;
    case 'death': z.tx = [-2, -1][Math.min(i, 1)]; z.ty = [-1, 2][Math.min(i, 1)]; z.hd = pk([[-1, 0], [1, 3]], Math.min(i, 1)); z.ff = pk([[94, 98], [96, 103]], Math.min(i, 1)); z.bf = pk([[18, 88], [18, 95]], Math.min(i, 1)); z.pulse = 0; break;
  }
  return z;
}

interface Cr { b: Pt; t: Pt; hw: number; k: number }
// Rückenkristalle (hinter dem Rumpf) und Schulterkristalle (vorn)
const BACK: Cr[] = [
  { b: [21, 50], t: [9, 34], hw: 3.5, k: 2 }, { b: [29, 44], t: [13, 12], hw: 6.5, k: 0 }, { b: [42, 38], t: [35, 7], hw: 5.5, k: 1 }, { b: [55, 38], t: [56, 14], hw: 4.5, k: 0 },
  { b: [72, 40], t: [83, 10], hw: 6.5, k: 0 }, { b: [87, 48], t: [100, 28], hw: 5, k: 1 }, { b: [64, 40], t: [68, 20], hw: 3.5, k: 2 },
];
const FRONT: Cr[] = [{ b: [33, 44], t: [27, 28], hw: 3.5, k: 1 }, { b: [90, 46], t: [97, 31], hw: 4, k: 0 }, { b: [79, 43], t: [76, 27], hw: 3, k: 2 }, { b: [24, 47], t: [16, 40], hw: 2.5, k: 0 }];
const crRamp = (k: number, blaze: number, dim: number): Ramp => {
  const base = k === 0 ? P.teal : k === 1 ? P.ice : P.pink;
  return dim > 0 ? rmix(base, DIM, dim) : blaze > 0 ? rmix(base, BLAZE, blaze) : base;
};
function crystals(l: Px, list: Cr[], dx: number, dy: number, blaze: number, dim: number): void {
  for (const c of list) {
    const r = crRamp(c.k, blaze, dim);
    crystal(l, c.b[0] + dx, c.b[1] + dy, c.t[0] + dx, c.t[1] + dy - (blaze > 0.9 ? 1 : 0), c.hw, r);
    // Querbruch und Fußsplitter
    const mx = lerp(c.b[0], c.t[0], 0.45) + dx, my = lerp(c.b[1], c.t[1], 0.45) + dy;
    l.line(mx - c.hw + 1, my + 1, mx + c.hw - 2, my - 1, r[1]); l.set(mx - c.hw + 2, my, r[4]);
  }
}
const rock = (p: Px, cx: number, by: number, w: number, h: number, seed: number, ramp: Ramp = ROCK, extra?: (l: Px) => void): void => {
  lay(p, (l) => { boulder(l, cx, by, w, h, { ramp, seed, cracks: Math.round(w / 12) }); extra?.(l); });
};

function heart(p: Px, x: number, y: number, pulse: number, state: number): void {
  // state 0 = heil, 1 = gesprungen (weiß), 2 = erloschen
  lay(p, (l) => {
    l.ell(x, y, 10, 11, ROCK[0]); l.ell(x + 0.5, y + 0.5, 8.5, 9.5, mix(INK, P.shadow[0], 0.5));
    for (const [dx, dy] of [[-8, -5], [7, -6], [-9, 3], [8, 4], [-4, 9], [4, 9], [0, -10]] as const) l.set(x + dx, y + dy, ROCK[2]);
  }, false);
  const G = state === 2 ? [P.steel[0], P.steel[1], P.steel[1], P.steel[2], P.steel[3]] : P.gold;
  lay(p, (l) => {
    const hh = 8, hw = 6;
    l.poly([[x, y - hh], [x + hw, y - 1], [x, y + hh], [x - hw, y - 1]], G[3]);
    l.poly([[x, y - hh], [x, y + hh], [x - hw, y - 1]], G[4]);
    l.poly([[x, y - 1], [x + hw, y - 1], [x, y + hh]], G[2]);
    l.line(x - hw + 1, y - 1, x + hw - 1, y - 1, G[state === 2 ? 2 : 3]); l.line(x, y - hh + 1, x - 3, y - 2, state === 2 ? G[4] : WHITE);
    if (state < 2 && pulse > 0.6) l.rect(x - 2, y - 4, 2, 3, WHITE);
    if (state >= 1) { const c = state === 1 ? P.gold[0] : INK; l.line(x - 3, y - 6, x, y - 1, c); l.line(x, y - 1, x - 2, y + 3, c); l.line(x, y - 1, x + 4, y + 2, c); l.line(x - 2, y + 3, x + 1, y + 7, c); }
  });
  if (state === 0) { glow(p, x, y, 10 + pulse * 5, P.gold[3], 40 + pulse * 30); glow(p, x, y, 5 + pulse * 2, P.gold[4], 70); }
  if (state === 1) { glow(p, x, y, 26, WHITE, 70); rays(p, x, y, 8, 34, 10, 0.3, WHITE, 200); }
}

function body(p: Px, z: K, f: BFr, heartState: number, dim: number): void {
  const { tx, ty } = z, hx = 63 + tx + z.hd[0], hy = 46 + ty + z.hd[1];
  const bl = z.blaze;
  if (bl > 0) for (const c of BACK) glow(p, c.t[0] + tx, c.t[1] + ty + 6, 9, P.ice[3], 40 * bl);
  const arm = (sh: Pt, fist: Pt, fw: number, fh: number, seed: number, front: boolean): void => {
    const fc: Pt = [fist[0], fist[1] - fh / 2], m: Pt = [lerp(sh[0], fc[0], 0.5), lerp(sh[1], fc[1], 0.5)];
    const uw = front ? 22 : 16, uh = front ? 24 : 18;
    rock(p, m[0] + (front ? 2 : -2), m[1] + uh / 2, uw, uh, seed, front ? ROCK : ROCK_D);
    rock(p, fist[0], fist[1], fw, fh, seed + 1, front ? ROCK : ROCK_D, (l) => {
      // Fingerfugen und Knöchelkristalle
      const top = fist[1] - fh;
      for (let k = 1; k < 4; k++) l.line(fist[0] - fw / 2 + (k * fw) / 4, fist[1] - fh * 0.42, fist[0] - fw / 2 + (k * fw) / 4 + 1, fist[1] - 3, ROCK[0]);
      l.line(fist[0] - fw / 2 + 3, fist[1] - fh * 0.45, fist[0] + fw / 2 - 3, fist[1] - fh * 0.42, ROCK[0]);
      if (front) { crystal(l, fist[0] - 6, top + 5, fist[0] - 10, top - 4, 2.5, crRamp(0, bl, dim)); crystal(l, fist[0] + 3, top + 4, fist[0] + 6, top - 5, 3, crRamp(1, bl, dim)); }
    });
  };
  // Rückenkristalle
  lay(p, (l) => crystals(l, BACK, tx, ty, bl, dim));
  // hinterer Arm
  if (!z.bfFront) arm([27 + tx, 56 + ty], z.bf, 21, 21, 31, false);
  // Beine und Becken
  const st = R(z.step);
  rock(p, 40 - st, GY, 23, 27, 11, ROCK_D, (l) => { l.rect(31 - st, GY - 3, 18, 1, ROCK[0]); });
  rock(p, 55 + tx * 0.5, 90 + ty * 0.5, 38, 22, 13);
  rock(p, 71 + st, GY, 25, 29, 12, ROCK, (l) => { l.rect(61 + st, GY - 3, 20, 1, ROCK[0]); l.set(64 + st, GY - 8, ROCK[4]); });
  // Rumpf
  rock(p, 55 + tx, 80 + ty, 56, 46, 3);
  heart(p, 56 + tx, 62 + ty, z.pulse, heartState);
  // Schultern
  rock(p, 30 + tx, 58 + ty, 26, 24, 5);
  rock(p, 84 + tx, 62 + ty, 30, 29, 6);
  lay(p, (l) => crystals(l, FRONT, tx, ty, bl, dim));
  // Kopf: Unterkiefer, Schädel, Augenschlitze
  rock(p, hx + 1, hy + 7, 17, 9, 8, ROCK_D);
  rock(p, hx, hy + 1, 23, 20, 7, ROCK, (l) => {
    const ey = hy - 8, e = dim > 0.5 ? P.steel[1] : bl > 0 || f.a === 'windup' || f.a === 'attack' ? WHITE : P.teal[4];
    l.rect(hx - 6, ey - 1, 15, 4, ROCK[0]); l.rect(hx - 7, ey - 2, 16, 1, ROCK[3]); l.rect(hx - 6, ey - 3, 13, 1, ROCK[4]);
    l.rect(hx - 3, ey, 4, 2, e); l.rect(hx + 4, ey, 4, 2, e); l.set(hx - 3, ey + 1, dim > 0.5 ? e : P.teal[3]); l.set(hx + 4, ey + 1, dim > 0.5 ? e : P.teal[3]);
    l.rect(hx - 4, hy - 1, 11, 1, ROCK[0]); l.px([hx - 2, hy, hx + 2, hy, hx + 5, hy], ROCK[0]);
  });
  if (dim < 0.5) { glow(p, hx - 1, hy - 7, 3, P.teal[4], 50); glow(p, hx + 6, hy - 7, 3, P.teal[4], 50); }
  // vorderer Arm (die große Faust)
  if (z.bfFront) arm([40 + tx, 62 + ty], z.bf, 22, 22, 31, true);
  arm([88 + tx, 62 + ty], z.ff, 29, 28, 21, true);
  if (bl > 0) {
    for (const c of [...BACK, ...FRONT]) { glow(p, c.t[0] + tx, c.t[1] + ty + 3, 6, WHITE, 50 * bl); if (c.hw > 4) spark(p, c.t[0] + tx, c.t[1] + ty + 1, WHITE, alpha(P.ice[4], 200), bl > 0.9 ? 3 : 2); }
  }
}

// Trümmer: Start (cx, by, w, h) → Ruhelage
const RUBBLE: Array<[number, number, number, number, number, number, number, number]> = [
  [19, 95, 21, 21, 15, GY, 31, 0], [40, GY, 23, 27, 35, GY, 11, 0], [71, GY, 25, 29, 76, GY, 12, 0], [55, 91, 38, 22, 55, GY, 13, 0.1],
  [30, 60, 26, 24, 22, GY, 5, 0.1], [40, 80, 30, 28, 44, 92, 3, 0.2], [70, 80, 32, 30, 66, 90, 4, 0.2], [84, 64, 30, 29, 88, GY, 6, 0.1],
  [56, 58, 30, 24, 55, 80, 9, 0.3], [93, 103, 29, 28, 93, GY, 21, 0], [64, 49, 23, 20, 80, GY, 7, 0.15],
];

const fn = (p: Px, f: BFr): void => {
  const z = pose(f), i = f.i;
  if (f.a === 'death' && i >= 2) {
    const t = ease((i - 2) / 3.2), last = i === 7;
    const dimR = rmix(P.teal, DIM, 0.75);
    // liegende Kristallsplitter (hinten)
    lay(p, (l) => BACK.forEach((c, k) => {
      const gx = 14 + k * 13, bx = lerp(c.b[0], gx, t), by = lerp(c.b[1], GY, t * t), a = lerp(Math.atan2(c.t[1] - c.b[1], c.t[0] - c.b[0]), k < 3 ? -0.25 : Math.PI + 0.25, t);
      const len = Math.hypot(c.t[0] - c.b[0], c.t[1] - c.b[1]) * (last ? 0.6 : 0.8);
      crystal(l, bx, by - 1, bx + Math.cos(a) * len, by - 1 + Math.sin(a) * len, c.hw * 0.8, k % 3 === 2 ? rmix(P.pink, DIM, 0.7) : dimR);
    }));
    RUBBLE.forEach(([x0, y0, w, h, x1, y1, seed, dl], k) => {
      const tt = ease((i - 2 - dl * 4) / 3), sc = last ? 0.82 : 1 - tt * 0.1;
      const bounce = tt > 0.95 && i === 5 ? -1 : 0;
      rock(p, lerp(x0, x1, tt), lerp(y0, y1, tt * tt) + bounce, w * sc, h * sc, seed, k % 3 === 0 ? ROCK_D : ROCK);
    });
    lay(p, (l) => {
      // erloschenes Herz und vordere Splitter
      const hx = lerp(56, 46, t), hy = lerp(62, GY - 5, t * t);
      l.poly([[hx, hy - 6], [hx + 5, hy], [hx, hy + 5], [hx - 5, hy]], P.steel[2]); l.poly([[hx, hy - 6], [hx, hy + 5], [hx - 5, hy]], P.steel[3]); l.line(hx - 2, hy - 3, hx + 1, hy + 2, INK);
      FRONT.forEach((c, k) => { const gx = 24 + k * 22, bx = lerp(c.b[0], gx, t), by = lerp(c.b[1], GY, t * t); crystal(l, bx, by - 1, bx + (k % 2 ? 15 : -15) * (0.4 + t * 0.6), by - lerp(12, 3, t), c.hw, k === 2 ? rmix(P.pink, DIM, 0.6) : rmix(P.teal, DIM, 0.5)); });
      if (i >= 4) { const sr = rmix(P.teal, DIM, 0.4), g = i === 4 ? 0.7 : 1; crystal(l, 27, GY - 5, 27 - 15 * g, GY - 5 - 13 * g, 4, sr); crystal(l, 84, GY - 7, 84 + 12 * g, GY - 7 - 12 * g, 4, rmix(P.ice, DIM, 0.4)); crystal(l, 60, GY - 22, 60 + 5 * g, GY - 22 - 14 * g, 3.5, sr); crystal(l, 44, GY - 3, 44 - 8 * g, GY - 3 - 9 * g, 2.5, rmix(P.pink, DIM, 0.5)); }
      if (i >= 5) for (let k = 0; k < 9; k++) l.set(8 + k * 12 + (k % 2) * 3, GY - 1 - (k % 3 === 0 ? 1 : 0), k % 2 ? ROCK[3] : P.teal[2]);
    });
    if (i < 7) for (let k = 0; k < 6; k++) { const x = 14 + k * 17, r = rnd2(k, i, 4); puff(p, x + r * 6, GY - 3 - (i - 2) * (2 + r * 3), 5 + r * 3, 3 + r * 2, P.stone[3], Math.max(0, 110 - (i - 2) * 22)); }
    return;
  }
  const hs = f.a === 'death' ? (i === 0 ? 1 : 2) : 0, dim = f.a === 'death' ? (i === 0 ? 0.2 : 0.75) : 0;
  body(p, z, f, hs, dim);
  if (f.a === 'death' && i === 1) cracks(p, [[56 + z.tx, 62 + z.ty], [44, 70], [70, 56], [62, 84]], 1, 7, INK, ROCK[3], 30);
  if (f.a === 'windup') for (let k = 0; k < 5; k++) spark(p, z.ff[0] - 8 + k * 5, z.ff[1] - 34 + (k % 2) * 4 + i * 3, P.ice[4], alpha(P.teal[4], 160), 1);
  if (f.a === 'attack') {
    if (i === 0) for (const fp of [z.ff, z.bf]) for (let k = 0; k < 10; k++) p.blend(fp[0] - 10 + k * 2, fp[1] - 40 - k * 1.5, alpha(WHITE, 30 + k * 12));
    if (i === 1 || i === 2) {
      const t = i - 1;
      for (const fx of [z.ff[0], z.bf[0]]) {
        puff(p, fx - 16 - t * 4, GY - 3 - t * 2, 8, 4 + t, P.stone[4], 150 - t * 60); puff(p, fx + 13 + t * 3, GY - 2 - t * 2, 6, 3 + t, P.stone[4], 150 - t * 60);
        for (let k = 0; k < 7; k++) { const a = Math.PI * (0.12 + k * 0.127), d = 14 + t * 9 + (k % 3) * 3; const x = fx - Math.cos(a) * d * 1.1, y = GY - Math.sin(a) * d * (0.9 - t * 0.2); if (x > 3 && x < 107) { p.set(x, y, k % 2 ? ROCK[3] : P.teal[3]); p.set(x + 1, y, ROCK[1]); if (k % 3 === 0) p.set(x, y - 1, P.ice[4]); } }
      }
      if (i === 1) for (let x = 44; x < 108; x += 2) p.blend(x, GY - 1, alpha(WHITE, 170));
    }
  }
  if (f.a === 'special') {
    for (let k = 0; k < 5; k++) puff(p, 34 - k * 5 - i, GY - 2 - (k % 2) * 3 - i, 4, 2.5, P.stone[3], 120 - k * 20);
    for (let k = 0; k < 4; k++) p.blend(100 + k * 3, 60 + z.ty + k * 2 - (i % 2), alpha(WHITE, 200 - k * 40));
  }
  void bsel;
};

export const kristallkoloss: BossDef = { w: 112, h: 112, fn };
