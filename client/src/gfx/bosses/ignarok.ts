/** Ignarok (Feuer): Schlackenwurm, der aus einem Lavabecken aufragt – Basaltplatten mit Glutfugen, gehörnter Kopf. 112×112. */
import { Px, bez, tube } from '../draw';
import type { Pt } from '../draw';
import { P, INK, WHITE, alpha, mix, rnd2 } from '../palette';
import type { Ramp } from '../palette';
import { R, boulder, clamp, cracks, glow, lay, lerp, lp, normal, puff, rmix, spline } from './kit';
import type { BFr, BossDef } from './kit';

const BAS: Ramp = P.ash;
const STONE: Ramp = [P.stone[0], mix(P.stone[0], P.stone[1], 0.6), P.stone[1], P.stone[2], P.stone[3]];
const HORN: Ramp = [P.ash[2], P.cream[0], P.cream[1], P.cream[2], P.cream[3]];
const BELLY: Ramp = [P.fire[0], mix(P.fire[0], P.fire[1], 0.5), P.fire[1], P.fire[2], P.fire[3]];

interface I { b1: Pt; b2: Pt; b3: Pt; H: Pt; ha: number; jaw: number; heat: number; throat: number; dim: number; cool: number; breath: number; tail: Pt; f: BFr }

const COIL = { b1: [30, 84] as Pt, b2: [48, 73] as Pt, b3: [70, 78] as Pt, H: [78, 90] as Pt, ha: 0.42 };

function pose(f: BFr): I {
  const s = Math.sin(f.ph), c = Math.cos(f.ph), i = f.i;
  const z: I = { b1: [32, 80], b2: [38, 59], b3: [50, 41], H: [61, 35], ha: 0.22, jaw: 0.08, heat: 0.3, throat: 0.2, dim: 0, cool: 0, breath: 0, tail: [97, 78], f };
  switch (f.a) {
    case 'idle':
      z.b1 = [32 + R(s * 2), 80]; z.b2 = [38 - R(s * 2), 59 + R(c)]; z.b3 = [50 + R(c * 1.5), 41 + R(c * 1.5)]; z.H = [61 + R(s * 2), 35 + R(c * 2)];
      z.ha = 0.22 + s * 0.07; z.jaw = i === 3 || i === 4 ? 0.2 : 0.08; z.heat = 0.3 + 0.15 * c; z.tail = [97 + R(c * 2), 78 + R(s * 2)]; break;
    case 'windup':
      z.b1 = [[35, 80], [37, 80]][i] as Pt; z.b2 = [[46, 62], [51, 64]][i] as Pt; z.b3 = [[39, 45], [35, 44]][i] as Pt; z.H = [[51, 31], [45, 28]][i] as Pt;
      z.ha = [-0.12, -0.32][i]; z.jaw = [0.06, 0.22][i]; z.heat = [0.6, 0.9][i]; z.throat = [0.8, 1.4][i]; z.tail = [[98, 74], [99, 72]][i] as Pt; break;
    case 'attack':
      z.b1 = [[32, 80], [31, 80], [31, 80], [32, 80]][i] as Pt; z.b2 = [[40, 60], [43, 63], [43, 63], [40, 60]][i] as Pt; z.b3 = [[52, 44], [56, 51], [56, 51], [52, 45]][i] as Pt;
      z.H = [[63, 40], [65, 48], [64, 48], [62, 40]][i] as Pt; z.ha = [0.2, 0.4, 0.4, 0.28][i]; z.jaw = [0.5, 0.8, 0.75, 0.35][i];
      z.heat = [1, 1, 0.8, 0.5][i]; z.throat = [1.4, 1.2, 1, 0.5][i]; z.breath = [0.35, 1, 0.85, 0.25][i]; z.tail = [[95, 80], [93, 82], [93, 82], [96, 79]][i] as Pt; break;
    case 'special':
      z.b1 = [33, 80]; z.b2 = [38 + [0, 1, 0, -1][i], 62]; z.b3 = [45, 47]; z.H = [53 + [0, 1, 0, -1][i], 35 + [0, -1, 0, 1][i]];
      z.ha = -1.12 + [0, 0.05, 0, -0.05][i]; z.jaw = [0.7, 0.85, 0.7, 0.85][i]; z.heat = [1.1, 1.5, 1.1, 1.5][i]; z.throat = 1.3; z.tail = [[99, 72], [97, 70], [99, 72], [100, 74]][i] as Pt; break;
    case 'hit':
      z.b2 = [[35, 60], [37, 59]][i] as Pt; z.b3 = [[43, 42], [47, 41]][i] as Pt; z.H = [[53, 33], [57, 34]][i] as Pt; z.ha = [-0.15, 0.08][i]; z.jaw = 0.4; z.heat = 0.1; break;
    case 'death': {
      const t = [0, 0, 0.3, 0.6, 0.85, 1, 1, 1][i], up: I = { ...z, b1: [33, 80], b2: [37, 60], b3: [44, 42], H: [55, 32], ha: -0.4 };
      z.b1 = lp(up.b1, COIL.b1, t); z.b2 = lp(up.b2, COIL.b2, t); z.b3 = lp(up.b3, COIL.b3, t); z.H = lp(up.H, COIL.H, t); z.ha = lerp(i === 0 ? -0.45 : 0, COIL.ha, t);
      z.jaw = [0.7, 0.45, 0.3, 0.2, 0.12, 0.06, 0.06, 0.06][i]; z.heat = [1.5, 0.3, 0, 0, 0, 0, 0, 0][i]; z.throat = [1.2, 0.3, 0, 0, 0, 0, 0, 0][i];
      z.dim = [0, 0.35, 0.6, 0.8, 0.95, 1, 1, 1][i]; z.cool = [0, 0.1, 0.3, 0.5, 0.75, 0.9, 1, 1][i]; z.tail = lp([97, 78], [101, 94], t); break;
    }
  }
  return z;
}

function pool(p: Px, z: I, front: boolean): void {
  const cool = z.cool, f = z.f, ph = f.a === 'idle' || f.a === 'special' ? f.i : 0;
  const lava = (k: number): number => mix(P.fire[k], [P.ash[1], P.ash[2], P.ash[3], P.stone[1], P.stone[2]][k], cool);
  if (!front) {
    if (cool < 0.8) glow(p, 56, 97, 46, P.fire[2], 26 * (1 - cool));
    lay(p, (l) => {
      l.ell(56, 98, 45, 7.5, BAS[1]); l.ell(56, 97.5, 43, 6.5, BAS[2]);
      for (const [x, w, h, sd] of [[18, 13, 9, 1], [31, 12, 8, 2], [47, 11, 6, 3], [66, 13, 7, 4], [82, 12, 8, 5], [95, 12, 9, 6]] as const) boulder(l, x, 97, w, h, { ramp: BAS, seed: sd + 20, cracks: 0 });
      l.ell(56, 98, 39, 5.4, lava(1)); l.ell(56, 98.2, 37, 4.6, lava(2)); l.ell(54, 98, 29, 3.2, lava(3));
      // helle Schlieren, wandernde Krustenschollen, Blasen
      for (let k = 0; k < 7; k++) { const x = 26 + ((k * 13 + ph * 3) % 62), y = 96 + (k % 3); l.rect(x, y, 4 + (k % 3) * 2, 1, lava(4)); }
      for (let k = 0; k < 6; k++) { const x = 22 + ((k * 17 + ph * 2) % 68), y = 96 + ((k * 2) % 5); l.rect(x, y, 5 - (k % 2) * 2, 1 + (k % 2), cool > 0.5 ? P.stone[0] : BAS[2]); l.set(x, y, cool > 0.5 ? P.stone[2] : BAS[3]); }
      if (cool < 0.5) for (let k = 0; k < 3; k++) { const x = 28 + k * 27 + (ph * 5 + k * 7) % 9, b = (ph + k * 2) % 6; if (b < 3) { l.rect(x, 99 - (k % 2) * 3, 2, 2, P.fire[4]); if (b === 2) l.set(x, 97 - (k % 2) * 3, WHITE); } }
    });
  } else {
    lay(p, (l) => {
      for (const [x, w, h, sd] of [[13, 14, 8, 7], [26, 13, 6, 8], [40, 12, 5, 9], [72, 12, 5, 10], [87, 14, 6, 11], [100, 13, 8, 12], [56, 14, 4, 13]] as const) boulder(l, x, 105, w, h, { ramp: cool > 0.6 ? rmix(BAS, STONE, 0.5) : BAS, seed: sd + 20, cracks: 0 });
      if (cool < 0.7) for (const x of [20, 34, 80, 94]) { l.set(x, 100, lava(3)); l.set(x + 1, 101, lava(2)); }
    });
  }
}

/** Plattenleib entlang des Pfads; Bauchseite = rechts der Laufrichtung. */
function serpent(l: Px, path: Pt[], r0: number, r1: number, z: I, phase = 0): void {
  const n = path.length - 1, rad = (i: number): number => lerp(r0, r1, i / n);
  const body = z.dim > 0 ? rmix(BAS, STONE, z.dim) : z.heat > 1 ? rmix(BAS, [P.red[0], P.red[0], P.red[1], P.fire[1], P.fire[2]], (z.heat - 1) * 0.7) : BAS;
  const hot = clamp(z.heat), seam = z.dim > 0.5 ? body[0] : mix(P.fire[1], P.fire[3], hot), seam2 = z.dim > 0.5 ? body[1] : z.heat > 0.9 ? WHITE : mix(P.fire[2], P.fire[4], hot);
  const belly = z.dim > 0 ? rmix(BELLY, [STONE[1], STONE[2], STONE[2], STONE[3], STONE[4]], Math.min(1, z.dim * 1.3)) : BELLY;
  // Rückenstacheln
  for (let i = 5 + phase; i < n - 3; i += 8) {
    const [nx, ny] = normal(path, i), q = path[i], r = rad(i), len = 5 + (r > 10 ? 2 : 0);
    const bx = q[0] + nx * (r - 1), by = q[1] + ny * (r - 1), tx = q[0] + nx * (r + len) - ny * 2, ty = q[1] + ny * (r + len) + nx * 2 - 1;
    l.poly([[bx - ny * 3, by + nx * 3], [tx, ty], [bx + ny * 3, by - nx * 3]], body[2]); l.line(bx - ny * 2, by + nx * 2, tx, ty, body[4]); l.set(tx, ty, body[4]);
  }
  tube(l, path, r0, r1, body, 1);
  for (let i = 0; i <= n; i++) {
    const [nx, ny] = normal(path, i), q = path[i], r = rad(i), k = (i + phase) % 8;
    // Bauchschilde
    const bx = q[0] - nx * r * 0.52, by = q[1] - ny * r * 0.52;
    if (k === 0) l.ell(bx, by, r * 0.5, r * 0.5, seam);
    else { l.ell(bx, by, r * 0.46, r * 0.46, belly[k < 3 ? 2 : k < 6 ? 1 : 0]); if (k === 1) l.set(bx - 1, by - 1, belly[3]); }
  }
  for (let i = 2; i <= n; i++) {
    const [nx, ny] = normal(path, i), q = path[i], r = rad(i), k = (i + phase) % 8;
    if (k !== 0) continue;
    // Glutfuge quer über den Rücken, Lichtkante der nächsten Platte
    l.line(q[0] - nx * r * 0.1, q[1] - ny * r * 0.1, q[0] + nx * (r - 1), q[1] + ny * (r - 1), seam);
    l.set(q[0] + nx * r * 0.45, q[1] + ny * r * 0.45, seam2);
    if (z.heat > 0.9) l.line(q[0] - nx * r * 0.1 + 1, q[1] - ny * r * 0.1, q[0] + nx * (r - 2) + 1, q[1] + ny * (r - 2), seam);
    const q2 = path[Math.min(n, i + 1)]; l.line(q2[0] + nx * r * 0.2 - ny, q2[1] + ny * r * 0.2 + nx - 1, q2[0] + nx * (r - 2) - ny, q2[1] + ny * (r - 2) + nx - 1, body[3]);
    l.set(q[0] + nx * (r - 3) + 2, q[1] + ny * (r - 3) - 3, body[4]);
  }
}

function head(p: Px, z: I): void {
  const [hx, hy] = z.H, c = Math.cos(z.ha), s = Math.sin(z.ha);
  const T = (x: number, y: number): Pt => [hx + x * c - y * s, hy + x * s + y * c];
  const TP = (pts: number[][]): Pt[] => pts.map((q) => T(q[0], q[1]));
  const body = z.dim > 0 ? rmix(BAS, STONE, z.dim) : BAS, horn = z.dim > 0 ? rmix(HORN, STONE, z.dim * 0.7) : HORN;
  const lit = z.dim < 0.5;
  const jc = Math.cos(z.jaw), js = Math.sin(z.jaw);
  const J = (x: number, y: number): Pt => { const dx = x + 3, dy = y - 3; return T(-3 + dx * jc - dy * js, 3 + dx * js + dy * jc); };
  // hinteres Horn
  lay(p, (l) => { tube(l, bez(T(-1, -6), T(-12, -14), T(-23, -9), 12), 2.6, 0.8, horn.slice(0, 4), 0); });
  // Rachen und Unterkiefer
  lay(p, (l) => {
    if (z.jaw > 0.15) {
      l.poly([T(-2, 2), T(28, 2), J(27, 5), J(-2, 5)], lit ? P.fire[0] : body[0]);
      if (lit) { l.poly([T(-2, 2), T(18, 3), J(16, 4), J(-2, 4)], P.fire[1]); l.poly([T(-3, 2), T(9, 3), J(8, 4), J(-3, 4)], mix(P.fire[2], P.fire[3], clamp(z.throat))); if (z.throat > 1) l.poly([T(-3, 3), T(4, 3), J(3, 4), J(-3, 4)], P.fire[4]); }
    }
    l.poly([J(-6, 3), J(8, 4), J(22, 4), J(30, 4.5), J(29, 8), J(18, 10), J(4, 10), J(-6, 8)], body[1]);
    l.poly([J(-6, 3), J(8, 4), J(22, 4), J(30, 4.5), J(29, 6), J(8, 6.5), J(-5, 5.5)], body[2]);
    for (const x of [12, 17, 22, 27]) { const a = J(x, 4.5), b = J(x + 1, 0.5), d = J(x + 2.4, 4.5); l.poly([a, b, d], P.bone[3]); l.set(b[0], b[1], P.bone[4]); }
    // Kinnstachel
    l.poly([J(2, 9), J(-3, 15), J(8, 10)], body[2]); l.poly([J(13, 10), J(11, 14), J(18, 10)], body[2]);
  });
  // Schädel
  lay(p, (l) => {
    l.poly(TP([[-8, 1], [-7, -8], [4, -11], [15, -9.5], [25, -6], [33, -2.5], [34, 0.5], [31, 3], [20, 3], [6, 4], [-5, 5]]), body[2]);
    l.poly(TP([[-7, -8], [4, -11], [15, -9.5], [25, -6], [33, -2.5], [24, -3], [13, -6], [2, -6.5], [-6, -4]]), body[3]);
    l.poly(TP([[-8, 1], [6, 1], [20, 1], [31, 1.5], [31, 3], [20, 3], [6, 4], [-5, 5]]), body[1]);
    const a = T(-5, -8.5), b = T(4, -11), d = T(15, -9.5), e = T(25, -6), g = T(32, -3);
    l.line(a[0], a[1], b[0], b[1], body[4]); l.line(b[0], b[1], d[0], d[1], body[4]); l.line(d[0], d[1], e[0], e[1], body[4]); l.line(e[0], e[1], g[0], g[1], body[3]);
    // Plattenfugen am Schädel
    for (const [x0, y0, x1, y1] of [[2, -10, 0, 2], [18, -8, 17, 1]] as const) { const q0 = T(x0, y0), q1 = T(x1, y1); l.line(q0[0], q0[1], q1[0], q1[1], lit ? mix(P.fire[0], P.fire[2], clamp(z.heat)) : body[0]); }
    // Zähne oben
    for (const x of [14, 19, 24, 29]) { const q0 = T(x, 3), q1 = T(x + 1, 3 + Math.min(4, 1.5 + z.jaw * 8)), q2 = T(x + 2.4, 3); l.poly([q0, q1, q2], P.bone[4]); }
    // Brauenwulst, Auge, Nüster
    const b0 = T(6, -6), b1 = T(17, -4.5); l.line(b0[0], b0[1], b1[0], b1[1], body[4]); l.line(b0[0], b0[1] + 1, b1[0], b1[1] + 1, body[0]);
    const ey = T(11, -2.8), e2 = T(13.5, -2.4);
    if (lit) { l.rect(R(ey[0]) - 1, R(ey[1]) - 1, 5, 3, body[0]); l.rect(R(ey[0]), R(ey[1]) - 1, 3, 2, z.heat > 0.9 ? WHITE : P.fire[4]); l.set(R(ey[0]) + 1, R(ey[1]) - 1, INK); l.set(R(e2[0]) + 1, R(e2[1]), P.fire[2]); }
    else { l.rect(R(ey[0]) - 1, R(ey[1]) - 1, 4, 2, body[0]); }
    const no = T(30, -1.2); l.set(no[0], no[1], lit ? P.fire[2] : body[0]);
    const nh0 = T(27, -5), nh1 = T(31, -9), nh2 = T(31, -3); l.poly([nh0, nh1, nh2], horn[2]); l.set(nh1[0], nh1[1], horn[4]);
    // Wangenstacheln
    for (const [x, y, tx, ty] of [[-6, -2, -15, -3], [-6, 2, -14, 5], [-4, -7, -12, -11]] as const) { const q0 = T(x, y - 2), q1 = T(tx, ty), q2 = T(x, y + 2); l.poly([q0, q1, q2], body[3]); l.set(q1[0], q1[1], body[4]); }
  });
  // vorderes Horn
  lay(p, (l) => { const pts = tube(l, bez(T(4, -9), T(-8, -22), T(-22, -17), 14), 3.4, 0.9, horn, 1); for (let k = 4; k < pts.length - 3; k += 5) l.set(pts[k][0], pts[k][1] + 1, horn[0]); });
  if (lit) { const ey = T(11, -3); glow(p, ey[0], ey[1], 4, P.fire[3], 50); }
  if (z.throat > 0.5) { const q = T(-2, 5); glow(p, q[0], q[1], 6 + z.throat * 5, P.fire[3], 50 * Math.min(1.4, z.throat)); glow(p, q[0], q[1], 3 + z.throat * 2, P.fire[4], 70); }
  if (z.breath > 0) {
    // Feuerstoß aus dem Maul
    const o = T(27, 5), dx = Math.cos(z.ha + 0.12), dy = Math.sin(z.ha + 0.12), L = 20 * z.breath, i = z.f.i;
    lay(p, (l) => {
      const cols = [P.fire[1], P.fire[2], P.fire[3], P.fire[4]];
      cols.forEach((col, k) => {
        const ls = [1, 0.86, 0.68, 0.45][k], rs = [1, 0.74, 0.5, 0.26][k];
        for (let d = 0; d < L * ls; d += 1.5) { const r = (2.2 + d * 0.36) * rs * (1 + 0.18 * Math.sin(d * 0.9 + i * 2 + k)); const x = o[0] + dx * d - dy * Math.sin(d * 0.5 + i) * 1.2, y = o[1] + dy * d + dx * Math.sin(d * 0.5 + i) * 1.2; if (x + r < 110) l.ell(x, y, r, r, col); }
      });
    }, false);
    for (let k = 0; k < 6; k++) { const d = L * (0.7 + rnd2(k, i, 3) * 0.5), off = (rnd2(k, i, 5) - 0.5) * 16; const x = o[0] + dx * d - dy * off, y = o[1] + dy * d + dx * off; if (x < 109) p.set(x, y, k % 2 ? P.fire[4] : P.fire[3]); }
  }
}

const fn = (p: Px, f: BFr): void => {
  const z = pose(f), i = f.i;
  const sink = f.a === 'death' ? [0, 0, 1, 3, 5, 7, 8, 9][i] : 0;
  const path = spline([[46, 98 + sink], [z.b1[0], z.b1[1] + sink * 0.6], [z.b2[0], z.b2[1] + sink * 0.3], z.b3, z.H], 12);
  pool(p, z, false);
  // Schwanzspitze, die rechts aus der Lava ragt
  lay(p, (l) => {
    const tp = spline([[82, 99], [90, 90], [z.tail[0] - 2, z.tail[1] + 6], z.tail], 8);
    serpent(l, tp, 6, 2, z, 3);
    const e = z.tail; l.poly([[e[0] - 3, e[1] + 1], [e[0] + 2, e[1] - 7], [e[0] + 4, e[1] + 2]], z.dim > 0.5 ? STONE[2] : BAS[3]); l.set(e[0] + 2, e[1] - 7, z.dim > 0.5 ? STONE[4] : BAS[4]);
  });
  lay(p, (l) => serpent(l, path, 13.5, 9, z));
  if (z.dim > 0.3 && z.dim < 1) cracks(p, [[38, 70], [44, 52], [36, 88]], z.dim, 3, INK, undefined, 16);
  if (f.a === 'death' && i >= 5) cracks(p, [[40, 80], [58, 76]], 0.8, 5, P.stone[0], P.stone[3], 14);
  // Lavasaum am Leib
  if (z.cool < 0.6) lay(p, (l) => {
    for (const [cx, rx] of [[46, 16], [83, 8]] as const) for (let x = cx - rx; x <= cx + rx; x++) { const e = Math.sqrt(1 - ((x - cx) / rx) ** 2) * 3; l.rect(x, 99 + R(e) - 1, 1, 2, mix(P.fire[3], P.ash[3], z.cool)); l.set(x, 99 + R(e) - 2 + ((x + i) % 3 === 0 ? -1 : 0), mix(P.fire[4], P.ash[3], z.cool)); }
  }, false);
  pool(p, z, true);
  head(p, z);
  // Lavatropfen und Funken
  if (f.a === 'idle') {
    const jaw = [z.H[0] + 20, z.H[1] + 12], d = (i * 9) % 54;
    if (jaw[1] + d < 96) { p.set(jaw[0], jaw[1] + d, P.fire[4]); p.set(jaw[0], jaw[1] + d - 1, P.fire[3]); p.blend(jaw[0], jaw[1] + d - 2, alpha(P.fire[2], 160)); }
    const d2 = ((i + 3) * 7) % 42; p.set(37, 60 + d2 * 0.8, P.fire[3]); p.set(37, 59 + d2 * 0.8, P.fire[2]);
    for (let k = 0; k < 4; k++) p.blend(20 + k * 24 + (i * 3) % 7, 90 - ((i * 4 + k * 9) % 22), alpha(P.fire[3], 200 - ((i * 4 + k * 9) % 22) * 7));
  }
  if (f.a === 'windup') for (let k = 0; k < 9; k++) { const a = k * 0.7 + i, d = 20 - i * 8; p.set(z.H[0] - 2 + Math.cos(a) * d, z.H[1] + 5 + Math.sin(a) * d, k % 2 ? P.fire[4] : P.fire[3]); }
  if (f.a === 'special') {
    glow(p, 56, 96, 30, P.fire[3], 30);
    for (let k = 0; k < 18; k++) { const x = 8 + rnd2(k, 1, 7) * 96, cyc = (rnd2(k, 2, 7) * 28 + i * 7) % 28, y = 92 - rnd2(k, 3, 7) * 50 - cyc; if (y > 3) { p.set(x, y, k % 3 ? P.fire[3] : P.fire[4]); if (k % 4 === 0) p.set(x, y + 1, P.fire[2]); } }
    const m = [z.H[0] + Math.cos(z.ha) * 30, z.H[1] + Math.sin(z.ha) * 30];
    for (let k = 0; k < 5; k++) p.set(m[0] - 4 + k * 3 + (i % 2), Math.max(2, m[1] - 2 - ((k * 3 + i * 2) % 5)), k % 2 ? P.fire[4] : WHITE);
  }
  if (f.a === 'death' && i >= 3 && i < 7) for (let k = 0; k < 5; k++) puff(p, 20 + k * 18 + (i % 2) * 3, 92 - (i - 3) * 5 - (k % 2) * 6, 5, 3.5, P.stone[3], 100 - (i - 3) * 22);
};

export const ignarok: BossDef = { w: 112, h: 112, fn };
