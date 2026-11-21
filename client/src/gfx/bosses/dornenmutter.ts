/** Dornenmutter (Erde, ortsfest): kolossale fleischfressende Blüte auf einem Hügel aus Dornenwurzeln. 112×112. */
import { Px, bez, tube } from '../draw';
import type { Pt } from '../draw';
import { P, INK, WHITE, alpha, mix, rnd2 } from '../palette';
import type { Ramp } from '../palette';
import { R, TAU, bsel, clamp, form, glow, lay, lerp, petal, shroom, spark, thorns } from './kit';
import type { BFr, BossDef } from './kit';

const CX = 56, GY = 105;
const VINE: Ramp = P.forest;
const STALK: Ramp = [P.forest[0], P.forest[1], P.green[2], P.green[3], P.green[4]];
const ROOT: Ramp = [P.wood[0], P.wood[1], P.wood[2], P.wood[3], P.tan[3]];
const DRY: Ramp = [P.wood[0], P.wood[1], mix(P.wood[2], P.sand[1], 0.4), P.tan[1], P.tan[2]];
const PET_B: Ramp = [mix(P.red[0], INK, 0.35), P.red[0], P.red[1], mix(P.red[1], P.red[2], 0.6), P.red[3]];
const PET_F: Ramp = [P.pink[0], P.pink[1], mix(P.pink[1], P.pink[2], 0.6), P.pink[2], P.pink[3]];
const LIP: Ramp = [P.forest[1], P.green[2], P.green[3], P.green[4], mix(P.green[4], WHITE, 0.4)];

interface S {
  hx: number; hy: number; open: number; spread: number; core: number; droop: number; wr: number;
  vl: Pt; vr: Pt; wilt: number; lost: number; f: BFr;
}

function pose(f: BFr): S {
  const s = Math.sin(f.ph), c = Math.cos(f.ph), i = f.i;
  const z: S = { hx: 56, hy: 42, open: 0.35, spread: 0, core: 0.5, droop: 0, wr: 0, vl: [14, 46], vr: [98, 48], wilt: 0, lost: 0, f };
  switch (f.a) {
    case 'idle':
      z.hx = 56 + R(s * 2); z.hy = 42 + R(c * 1.6); z.spread = s * 1.6; z.open = 0.34 + 0.12 * Math.sin(f.ph + 1); z.core = 0.5 + 0.2 * c;
      z.vl = [14 - R(s * 3), 46 + R(c * 3)]; z.vr = [98 + R(c * 3), 48 - R(s * 3)]; z.wr = s; break;
    case 'windup':
      z.hx = [51, 47][i]; z.hy = [37, 34][i]; z.open = [0.75, 1][i]; z.core = [0.9, 1.4][i]; z.spread = [-1, -2][i];
      z.vl = [[11, 34], [9, 25]][i] as Pt; z.vr = [[101, 32], [104, 22]][i] as Pt; z.wr = -1; break;
    case 'attack':
      z.hx = [61, 67, 65, 60][i]; z.hy = [45, 50, 49, 45][i]; z.open = [1, 1, 0.8, 0.5][i]; z.core = [1.3, 1, 0.7, 0.5][i]; z.spread = [2, 3, 2, 1][i];
      z.vl = [[20, 60], [34, 97], [31, 95], [18, 66]][i] as Pt; z.vr = [[100, 58], [93, 98], [95, 96], [101, 62]][i] as Pt; z.wr = 2; break;
    case 'special':
      z.hy = 40 + [0, -1, 0, 1][i]; z.spread = [5, 6.5, 5, 6.5][i]; z.open = [0.7, 0.85, 0.7, 0.85][i]; z.core = [1.2, 1.5, 1.2, 1.5][i];
      z.vl = [[10, 40], [8, 37], [10, 40], [12, 43]][i] as Pt; z.vr = [[102, 40], [104, 37], [102, 40], [100, 43]][i] as Pt; z.wr = [3, 0, -3, 0][i]; break;
    case 'hit':
      z.hx = [50, 53][i]; z.hy = [39, 41][i]; z.open = 0.15; z.spread = -1.5; z.core = 0.2;
      z.vl = [[10, 52], [13, 48]][i] as Pt; z.vr = [[92, 54], [96, 50]][i] as Pt; break;
    case 'death':
      z.wilt = [0.05, 0.25, 0.5, 0.72, 0.9, 1, 1, 1][i];
      z.hx = [52, 57, 63, 69, 71, 71, 71, 71][i]; z.hy = [40, 47, 59, 73, 86, 90, 92, 92][i];
      z.open = [0.9, 0.5, 0.35, 0.2, 0.1, 0, 0, 0][i]; z.core = [1.5, 0.4, 0.2, 0, 0, 0, 0, 0][i];
      z.droop = [0, 3, 6, 8, 8, 8, 8, 8][i]; z.spread = [1, -1, -3, -6, -9, -10, -10, -10][i]; z.lost = [0, 0, 2, 4, 6, 9, 9, 9][i];
      z.vl = [[12, 40], [12, 56], [14, 76], [16, 96], [16, 100], [16, 100], [16, 100], [16, 100]][i] as Pt;
      z.vr = [[100, 42], [101, 60], [100, 80], [98, 97], [98, 100], [98, 100], [98, 100], [98, 100]][i] as Pt; break;
  }
  return z;
}

/** Wurzelhügel mit Moos, Pilzen und Blättern. */
function mound(p: Px, z: S, dry = 0): void {
  const RT = dry ? DRY : ROOT, wr = z.wr;
  lay(p, (l) => {
    form(l, (m) => { m.ell(CX, 99, 41, 7, 1); m.ell(CX - 2, 94, 28, 9, 1); m.ell(CX + 14, 96, 20, 7, 1); }, RT, 0, 3, -0.04);
    for (let x = 18; x < 96; x += 3) { const r = rnd2(x, 3, 5); if (r < 0.5) l.set(x + (r * 4 | 0), 97 + (r * 12 | 0) % 7, RT[r < 0.25 ? 0 : 3]); }
    // dicke Wurzeln, die sich vom Scheitel zum Boden winden
    const roots: Array<[Pt, Pt, Pt, number]> = [
      [[46, 88], [26 - wr, 84], [13, 103], 4.6], [[66, 88], [88 + wr, 84], [100, 103], 4.6],
      [[50, 90], [38 + wr, 96 - Math.abs(wr) * 0.5], [30, 104], 3.6], [[62, 91], [76 - wr, 95 - Math.abs(wr) * 0.5], [82, 104], 3.8],
      [[56, 92], [57 + wr * 0.6, 98], [54, 104], 3.2],
    ];
    roots.forEach(([a, b, c, r], k) => {
      const pts = tube(l, bez(a, b, c, 16), r, r * 0.45, RT, 1);
      if (k < 2) thorns(l, pts, 7, 3, (i) => r - (r * 0.55 * i) / pts.length, dry ? P.cream : P.bone, 6);
    });
    // Schlinge im Vordergrund
    tube(l, bez([34, 101], [44, 90 - wr * 0.4], [58, 100], 12), 2.4, 2, RT, 1);
    tube(l, bez([70, 102], [80, 92 + wr * 0.4], [92, 100], 12), 2.2, 1.6, RT, 1);
    if (!dry) {
      // Moospolster auf den Oberseiten
      for (const [x, y, rx] of [[30, 88, 6], [41, 85, 5], [74, 86, 6], [86, 90, 5], [58, 88, 4], [20, 97, 4], [96, 98, 3]] as const) {
        l.ell(x, y, rx, 2.2, P.green[2]); l.ell(x - 1, y - 0.8, rx * 0.7, 1.3, P.green[3]); l.set(x - 2, y - 2, P.green[4]); l.set(x + 1, y - 2, P.green[4]); l.set(x + rx - 1, y + 1, P.forest[2]);
      }
      shroom(l, 24, 94, 4, P.red, -1); shroom(l, 29, 97, 2, P.red, 0); shroom(l, 88, 96, 3, P.gold, 1); shroom(l, 93, 99, 2, P.gold, 0);
      shroom(l, 44, 100, 2, P.red, 0); shroom(l, 72, 99, 3, P.red, 1);
      // Blättchen
      for (const [x, y, d] of [[16, 101, -1], [36, 92, -1], [80, 91, 1], [100, 101, 1], [64, 97, 1]] as const) { l.rect(x, y, 3, 2, P.green[3]); l.set(x + (d > 0 ? 3 : -1), y, P.green[4]); l.set(x + 1, y + 1, P.green[1]); }
    }
  });
}

function vine(l: Px, base: Pt, tip: Pt, side: number, wilt: number): void {
  const mx = (side < 0 ? Math.min(base[0], tip[0]) : Math.max(base[0], tip[0])) + side * lerp(15, 6, wilt);
  const pts = tube(l, bez(base, [clamp(mx, 4, 108), (base[1] + tip[1]) / 2 + 6], tip, 20), 5, 3, VINE, 1);
  thorns(l, pts, 7, 4, (i) => 5 - (2 * i) / pts.length, P.bone, 5);
  // Dornenkeule
  const [x, y] = tip;
  for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU + 0.3; l.line(x + Math.cos(a) * 4, y + Math.sin(a) * 4, x + Math.cos(a) * 8, y + Math.sin(a) * 8, P.bone[k % 2 ? 3 : 2]); l.set(x + Math.cos(a) * 8, y + Math.sin(a) * 8, P.bone[4]); }
  l.ball(x, y, 5.5, 5.5, PET_B, 1, 4);
  l.line(x - 3, y + 2, x, y - 4, PET_B[0]); l.line(x + 1, y + 4, x + 3, y - 3, PET_B[0]); l.set(x - 2, y - 3, P.pink[4]);
  l.ell(x - side * 4, y + 4, 2.5, 1.6, P.green[2]); l.set(x - side * 5, y + 3, P.green[4]);
}

function head(p: Px, z: S): void {
  const { hx, hy } = z, wl = z.wilt, lenB = 24 + z.spread, lenF = 17 + z.spread * 0.7;
  const pb = wl > 0.4 ? PET_B.map((c) => mix(c, P.wood[1], (wl - 0.4) * 0.8)) : PET_B;
  const pf = wl > 0.4 ? PET_F.map((c) => mix(c, P.wood[2], (wl - 0.4) * 0.8)) : PET_F;
  // hintere Blütenblätter (karmin)
  lay(p, (l) => {
    const n = 8;
    for (const k of [6, 5, 7, 4, 0, 3, 1, 2]) {
      if (k < z.lost) continue;
      const a = (k / n) * TAU + 0.2 + Math.sin(k * 2.1) * 0.06, ca = Math.cos(a), sa = Math.sin(a);
      const dr = z.droop * (1 - sa * 0.5);
      petal(l, hx + ca * 5, hy + sa * 5, hx + ca * (5 + lenB), hy + sa * (5 + lenB) * 0.92 + dr, 9.5, pb, 2, ca * 2);
    }
  });
  // vordere Blütenblätter (magenta)
  lay(p, (l) => {
    const n = 7;
    for (const k of [5, 6, 4, 0, 3, 1, 2]) {
      if (k + 2 < z.lost) continue;
      const a = (k / n) * TAU + 0.62, ca = Math.cos(a), sa = Math.sin(a), dr = z.droop * 0.7 * (1 - sa * 0.5);
      petal(l, hx + ca * 6, hy + sa * 6, hx + ca * (6 + lenF), hy + sa * (6 + lenF) * 0.9 + dr, 7.5, pf, 2, -ca * 1.5);
      l.set(hx + ca * (4 + lenF), hy + sa * (4 + lenF) * 0.9 + dr, pf[4]);
    }
  });
  // Schlund
  lay(p, (l) => {
    const mh = 2 + z.open * 7.5, my = hy + 1;
    l.ball(hx, hy, 13.5, 12.5, wl > 0.5 ? DRY : LIP, 0, 4, 0.04);
    for (let k = 0; k < 9; k++) { const a = (k / 9) * TAU + 0.5; l.set(hx + Math.cos(a) * 11.5, hy + Math.sin(a) * 10.5, LIP[wl > 0.5 ? 0 : 1]); }
    l.ell(hx, my, 10.5, mh + 1, P.red[0]); l.ell(hx, my + 0.5, 9, mh, mix(P.red[0], INK, 0.55));
    if (z.open > 0.3) { l.ell(hx, my + mh * 0.35, 6.5, mh * 0.55, P.red[1]); l.ell(hx, my + mh * 0.45, 4.5, mh * 0.4, mix(P.red[1], P.fire[1], 0.5)); }
    if (z.core > 0.25 && z.open > 0.25) {
      const cr = Math.min(mh * 0.5, 2 + z.core * 1.6);
      l.ball(hx, my + mh * 0.4, cr + 1, cr, P.gold, 2, 4, 0.1); if (z.core > 1) l.ell(hx, my + mh * 0.4, cr * 0.5, cr * 0.5, WHITE);
    }
    // Zähne: oben nach unten, unten nach oben
    for (let k = -4; k <= 4; k++) {
      const x = hx + k * 2.3, e = Math.sqrt(Math.max(0, 1 - (k * 2.3) ** 2 / 110)) * (mh + 0.5), tl = k % 2 ? 3 : 4;
      if (e < 0.8) continue;
      l.poly([[x - 1.3, my - e], [x, my - e + Math.min(tl, mh)], [x + 1.3, my - e]], P.bone[4]); l.set(x, my - e + Math.min(tl, mh) - 1, P.bone[3]);
      l.poly([[x - 1.3, my + e], [x, my + e - Math.min(tl - 1, mh)], [x + 1.3, my + e]], P.bone[3]); l.set(x, my + e - 1, P.bone[2]);
    }
    // Lippenglanz und Augenflecken
    l.line(hx - 8, hy - 8, hx - 3, hy - 11, LIP[4]); l.set(hx - 10, hy - 5, LIP[4]);
    if (wl < 0.5) for (const sx of [-1, 1]) { l.rect(hx + sx * 9 - 1, hy - 4 - (sx < 0 ? 0 : 1), 2, 2, P.gold[z.core > 1 ? 4 : 3]); l.set(hx + sx * 9 - 1, hy - 4 - (sx < 0 ? 0 : 1), P.gold[4]); }
  });
}

function fallen(l: Px, z: S, n: number, dry: number): void {
  const spots: Array<[number, number, number]> = [[22, 103, -1], [90, 104, 1], [38, 104, 1], [78, 102, -1], [50, 103, -1], [104, 104, 1], [10, 104, 1]];
  for (let k = 0; k < Math.min(n, spots.length); k++) {
    const [x, y, d] = spots[k], r = (k % 2 ? PET_F : PET_B).map((c) => mix(c, P.wood[1], 0.25 + dry * 0.45));
    petal(l, x - d * 5, y - 1, x + d * 6, y - (k % 3), 3.2, r, 2, d);
  }
}

const fn = (p: Px, f: BFr): void => {
  const z = pose(f), i = f.i;
  if (f.a === 'death' && i >= 5) {
    // Überreste: Haufen trockener Ranken
    const t = i - 5;
    lay(p, (l) => {
      form(l, (m) => { m.ell(CX, 100, 38 - t * 2, 5.5, 1); m.ell(CX + 6, 97 - (t ? 0 : 1), 22, 6 - t, 1); }, DRY, 0, 3);
      const loops: Array<[Pt, Pt, Pt, number]> = [
        [[18, 102], [34, 84 + t * 3], [56, 99], 3.4], [[44, 100], [66, 80 + t * 4], [92, 102], 3.8], [[30, 103], [50, 92 + t], [74, 103], 2.6],
        [[60, 100], [84, 88 + t * 2], [100, 103], 2.8], [[12, 104], [24, 97], [40, 103], 2.2],
      ];
      loops.forEach(([a, b, c, r], k) => { const pts = tube(l, bez(a, b, c, 16), r, r * 0.6, DRY, 1); if (k < 3) thorns(l, pts, 8, 3, () => r * 0.8, P.cream, 5); });
      if (t < 2) {
        // welker Blütenkopf als Klumpen
        const hx = 72, hy = 93 + t * 2, rr = 9 - t * 2.5;
        for (let k = 0; k < 5 - t * 2; k++) { const a = Math.PI + (k / 4) * Math.PI * 0.9 + 0.2; petal(l, hx, hy, hx + Math.cos(a) * (13 - t * 3), hy + Math.sin(a) * 6 + 3, 4, PET_B.map((c) => mix(c, P.wood[1], 0.6)), 2, 1); }
        l.ball(hx, hy, rr, rr * 0.75, DRY, 0, 3); l.rect(hx - 4, hy, 8, 1, P.wood[0]); l.px([hx - 3, hy + 1, hx, hy + 1, hx + 3, hy + 1], P.bone[2]);
      }
      // vertrocknete Dornenkeulen
      for (const [x, y] of [[16, 100], [98, 100]] as const) { l.ball(x, y, 4 - t * 0.5, 3.5 - t * 0.5, PET_B.map((c) => mix(c, P.wood[1], 0.5 + t * 0.15)), 1, 3); l.set(x - 3, y - 4, P.cream[2]); l.set(x + 3, y - 3, P.cream[2]); }
      fallen(l, z, 7 - t, 0.4 + t * 0.3);
      l.px([40, 96, 64, 93, 82, 98], DRY[4]);
    });
    if (t === 0) for (let k = 0; k < 6; k++) p.blend(30 + k * 11, 86 - (k % 3) * 4, alpha(P.tan[3], 150));
    return;
  }
  if (z.core > 0.8) glow(p, z.hx, z.hy + 3, 14 + z.core * 6, P.gold[3], 46);
  // Peitschenranken (hinter allem)
  lay(p, (l) => { vine(l, [29, 96], z.vl, -1, z.wilt); vine(l, [83, 96], z.vr, 1, z.wilt); });
  mound(p, z);
  // Stängel
  lay(p, (l) => {
    const bendX = CX - (z.hx - CX) * 1.3 - 7 + z.wilt * 4;
    const pts = tube(l, bez([CX, 91], [bendX, lerp(66, 80, z.wilt)], [z.hx - 1, z.hy + 9], 22), 7, 5.2, STALK, 1);
    for (let k = 6; k < pts.length - 4; k += 7) { const q = pts[k]; l.line(q[0] - 4, q[1] + 1, q[0] + 5, q[1] + 2, STALK[0]); l.set(q[0] - 3, q[1], STALK[3]); }
    thorns(l, pts, 9, 4, () => 6, P.bone, 5);
    // Kelchblätter unter dem Kopf
    for (const sx of [-1, 1]) petal(l, z.hx, z.hy + 10, z.hx + sx * 17, z.hy + 15 + z.droop, 4.5, STALK, 2, sx * 2);
  });
  head(p, z);
  // Effekte
  if (f.a === 'death' && z.lost) lay(p, (l) => fallen(l, z, Math.min(7, z.lost - 1), z.wilt * 0.5));
  if (f.a === 'death' && i >= 1 && i <= 4) {
    // fallende Blütenblätter
    for (let k = 0; k < 4; k++) { const x = z.hx - 24 + k * 15 + i * (k % 2 ? 2 : -2), y = z.hy + 8 + k * 5 + i * 3; if (y < 98) lay(p, (l) => petal(l, x, y, x + (k % 2 ? 6 : -6), y + 5, 3, k % 2 ? PET_F : PET_B, 2, 1)); }
  }
  if (f.a === 'windup') {
    for (let k = 0; k < 8; k++) { const a = k * 0.785 + i * 0.4, d = 30 - i * 9; spark(p, z.hx + Math.cos(a) * d, z.hy + 2 + Math.sin(a) * d * 0.9, P.gold[4], alpha(P.gold[3], 150), 1); }
  }
  if (f.a === 'attack') {
    // Peitschenschweif und Dornensamen
    if (i === 1) for (const [a, b, c] of [[[18, 62], [10, 84], [30, 96]], [[102, 60], [108, 82], [96, 97]]] as Pt[][]) bez(a, b, c, 22).forEach((q, k) => p.blend(q[0], q[1], alpha(P.green[4], 60 + k * 6)));
    if (i >= 1) {
      const d = [0, 10, 22, 32][i];
      for (let k = 0; k < 6; k++) {
        const a = 0.25 + k * 0.42 - 0.5, x = z.hx + Math.cos(a) * (9 + d * (0.7 + (k % 3) * 0.18)), y = z.hy + 6 + Math.sin(a) * (6 + d * 0.8) + d * d * 0.012;
        if (x > 108 || y > 102) continue;
        lay(p, (l) => { l.line(x - Math.cos(a) * 3, y - Math.sin(a) * 3, x, y, P.bone[3]); l.set(x, y, P.bone[4]); l.set(x - Math.cos(a) * 4, y - Math.sin(a) * 4, P.green[3]); });
      }
      if (i <= 2) for (const vx of [z.vl[0], z.vr[0]]) for (let k = 0; k < 5; k++) p.set(vx - 8 + k * 4, 100 - ((k * 3 + i * 2) % 6), k % 2 ? P.tan[3] : P.wood[3]);
    }
  }
  if (f.a === 'special') {
    for (let k = 0; k < 16; k++) {
      const x = 10 + rnd2(k, 1, 9) * 92, cyc = (rnd2(k, 2, 9) * 24 + i * 6) % 24, y = 92 - rnd2(k, 3, 9) * 60 - cyc;
      if (y < 4) continue;
      if (k % 3 === 0) spark(p, x + Math.sin(cyc * 0.5 + k) * 1.5, y, P.gold[4], alpha(P.green[4], cyc > 18 ? 90 : 190), 1); else p.blend(x + Math.sin(cyc * 0.5 + k) * 1.5, y, alpha(k % 2 ? P.green[4] : P.gold[3], cyc > 18 ? 110 : 230));
    }
  }
  if (z.core > 0.9) glow(p, z.hx, z.hy + 3, 5 + z.core * 2, P.gold[4], 60);
  if (z.wilt > 0.1) p.tint(P.wood[2], z.wilt * 0.42);
};

export const dornenmutter: BossDef = { w: 112, h: 112, fn };
void GY;
