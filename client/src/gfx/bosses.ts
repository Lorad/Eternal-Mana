/** Bosse: 0-3 Idle, 4-5 Angriff, 6-7 Spezial, 8 Getroffen. */
import { Px, Pt, bez, crystal, gridSheet, tube } from './draw';
import { P, Ramp, INK, WHITE, alpha, mix } from './palette';
import { BOSS_IDS } from './spec';
import type { Sheet, SpriteMeta } from './spec';

interface St { t: number; atk: number; sp: number }
type BossFn = (p: Px, s: St) => void;

function glow(p: Px, cx: number, cy: number, r: number, c: number, a = 90): void {
  for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
    if (d < 1) p.blend(x, y, alpha(c, Math.round(a * (d < 0.5 ? 1 : d < 0.78 ? 0.6 : 0.3))));
  }
}
function spark(p: Px, x: number, y: number, c: number, big = false): void {
  p.set(x, y, WHITE); p.set(x - 1, y, c); p.set(x + 1, y, c); p.set(x, y - 1, c); p.set(x, y + 1, c);
  if (big) { p.set(x - 2, y, c); p.set(x + 2, y, c); p.set(x, y - 2, c); p.set(x, y + 2, c); }
}
const ROCK: Ramp = [P.shadow[1], P.steel[0], P.steel[1], P.steel[2], P.steel[3]];
const BASALT: Ramp = [P.ash[0], P.ash[1], P.ash[2], P.ash[3], P.ash[4]];

// ---------------------------------------------------------------- Dornenmutter 80x80
const dornenmutter: BossFn = (p, s) => {
  const sw = Math.sin((s.t / 4) * Math.PI * 2), sw2 = Math.cos((s.t / 4) * Math.PI * 2);
  const G = P.forest, K = P.pink;
  let hx = 40 + sw * 2, hy = 30 + sw2 * 1.5, open = 0.55, spread = 0;
  if (s.atk === 1) { hy = 22; hx = 37; open = 0.3; } if (s.atk === 2) { hy = 40; hx = 44; open = 1; }
  if (s.sp === 1) { spread = 2; open = 0.8; hy = 28; } if (s.sp === 2) { spread = 4; open = 1; hy = 27; }
  const thorns = (l: Px, pts: Pt[], every: number, len: number) => {
    for (let i = every; i < pts.length - 2; i += every) {
      const a = pts[i], b = pts[i + 1], tx = b[0] - a[0], ty = b[1] - a[1], n = Math.hypot(tx, ty) || 1, side = (i / every) % 2 ? 1 : -1;
      const qx = (-ty / n) * side, qy = (tx / n) * side;
      l.line(a[0] + qx * 2, a[1] + qy * 2, a[0] + qx * (2 + len), a[1] + qy * (2 + len), P.bone[3]); l.set(a[0] + qx * (2 + len), a[1] + qy * (2 + len), P.bone[4]);
    }
  };
  // Peitschenranken hinten
  p.layer((l) => {
    const up = s.atk === 1 ? -14 : s.atk === 2 ? 10 : s.sp ? -8 : 0;
    const v1 = bez([22, 72], [2 - sw * 3, 52 + up * 0.3], [10 + sw * 4, 30 + up - (s.atk === 2 ? -24 : 0)], 20);
    const v2 = bez([58, 72], [79 + sw * 3, 50 + up * 0.3], [70 - sw * 4 + (s.atk === 2 ? 6 : 0), 28 + up - (s.atk === 2 ? -30 : 0)], 20);
    thorns(l, tube(l, v1, 3.2, 1.2, G), 5, 2); thorns(l, tube(l, v2, 3.2, 1.2, G), 5, 2);
    l.ball(v1[20][0], v1[20][1], 2.6, 2.6, P.red, 1, 3); l.ball(v2[20][0], v2[20][1], 2.6, 2.6, P.red, 1, 3);
  });
  // Wurzel-/Rankenknäuel am Boden
  p.layer((l) => {
    for (const [x0, x1, y, r] of [[12, 34, 74, 3.5], [68, 46, 74, 3.5], [20, 40, 70, 4], [60, 40, 70, 4], [30, 50, 76, 3]] as const) thorns(l, tube(l, bez([x0, y], [(x0 + x1) / 2, y - 12 - r], [x1, y - 1], 14), r, r * 0.8, G), 6, 2);
    l.ball(40, 70, 14, 7, G, 0, 3);
    // Blätter
    for (const sgn of [-1, 1]) {
      l.poly([[40 + sgn * 6, 66], [40 + sgn * 26, 52 + sw * sgn], [40 + sgn * 30, 60], [40 + sgn * 18, 68]], P.green[2]);
      l.poly([[40 + sgn * 6, 66], [40 + sgn * 26, 52 + sw * sgn], [40 + sgn * 20, 60]], P.green[sgn < 0 ? 3 : 1]); l.line(40 + sgn * 7, 66, 40 + sgn * 28, 56, P.green[sgn < 0 ? 4 : 2]);
    }
  });
  // Stängel
  p.layer((l) => {
    const st = bez([40, 68], [40 - (hx - 40) * 1.5 - 8, 52], [hx, hy + 8], 18);
    thorns(l, tube(l, st, 5, 4, P.green), 6, 2);
  });
  // Blütenkopf
  p.layer((l) => {
    const R = 13 + spread;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.39; const x = hx + Math.cos(a) * R, y = hy + Math.sin(a) * R * 0.9; l.ball(x, y, 7.5, 7.5, i % 2 ? P.red : K, Math.sin(a) > 0.2 ? 0 : 1, Math.sin(a) > 0.2 ? 2 : 3); }
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const x = hx + Math.cos(a) * (R - 2), y = hy + Math.sin(a) * (R - 2) * 0.9; l.ball(x, y, 7, 7, K, 1, 4); l.set(x + Math.cos(a) * 3, y + Math.sin(a) * 3, WHITE); l.set(x + Math.cos(a + 0.5) * 4, y + Math.sin(a + 0.5) * 3, K[4]); l.line(hx + Math.cos(a) * 8, hy + Math.sin(a) * 7, x + Math.cos(a) * 2, y + Math.sin(a) * 2, K[1]); }
  });
  p.layer((l) => {
    l.ball(hx, hy, 11, 10, P.green, 1, 4);
    const mh = 2 + open * 6;
    l.ell(hx, hy + 1, 8, mh, P.red[0]); l.ell(hx, hy + 2, 5, Math.max(1, mh - 2), INK);
    if (open > 0.5) { l.ell(hx + 1, hy + mh - 1, 3, 2, P.red[2]); l.set(hx, hy + mh - 2, P.red[3]); }
    for (let i = -3; i <= 3; i++) { const x = hx + i * 2.2, e = Math.sqrt(Math.max(0, 1 - (i * 2.2) ** 2 / 64)) * mh; l.poly([[x - 1.2, hy + 1 - e], [x, hy + 1 - e + 3], [x + 1.2, hy + 1 - e]], P.bone[4]); l.poly([[x - 1.2, hy + 1 + e], [x, hy + 1 + e - 3], [x + 1.2, hy + 1 + e]], P.bone[3]); }
    // Augenflecken
    l.rect(hx - 7, hy - 7, 3, 2, P.gold[4]); l.rect(hx + 5, hy - 7, 3, 2, P.gold[4]); l.set(hx - 6, hy - 6, INK); l.set(hx + 6, hy - 6, INK); l.rect(hx - 8, hy - 8, 4, 1, P.green[0]); l.rect(hx + 5, hy - 8, 4, 1, P.green[0]);
  });
  if (s.sp) { glow(p, hx, hy + 1, 8 + s.sp * 3, P.gold[4], 90); for (let i = 0; i < 10; i++) { const a = i * 0.63 + s.sp, d = 18 + ((i * 7) % 12) + s.sp * 4; spark(p, hx + Math.cos(a) * d, hy + Math.sin(a) * d * 0.9, P.green[4], i % 3 === 0); } }
  if (s.atk === 2) { for (let i = 0; i < 5; i++) p.set(hx - 12 + i * 6, hy + 18 + (i % 2) * 2, P.green[4]); }
};

// ---------------------------------------------------------------- Kristallkoloss 80x80
const kristallkoloss: BossFn = (p, s) => {
  const bob = s.t === 1 || s.t === 2 ? 1 : 0, sw = [1, 0, -1, 0][s.t];
  const by = bob + (s.atk === 2 ? 3 : s.atk === 1 ? -1 : 0);
  const lit = s.sp > 0, C = lit ? P.ice : P.teal, C2 = P.pink;
  const boulder = (l: Px, x: number, y: number, rx: number, ry: number, lo = 0, hi = 4) => { l.ball(x, y, rx, ry, ROCK, lo, hi); l.set(x - rx * 0.3, y + ry * 0.2, ROCK[1]); l.set(x + rx * 0.2, y - ry * 0.3, ROCK[3]); };
  // Rückenkristalle
  p.layer((l) => {
    crystal(l, 24, 26 + by, 12, 2 + by, 5, C); crystal(l, 56, 26 + by, 68, 4 + by, 5, C); crystal(l, 40, 20 + by, 40, -2 + by + (lit ? -1 : 0), 6, P.ice); crystal(l, 31, 22 + by, 26, 6 + by, 3.5, C2); crystal(l, 50, 22 + by, 55, 8 + by, 3.5, C);
  });
  p.layer((l) => {
    // Beine
    boulder(l, 28 - sw, 66, 9, 9, 0, 3); boulder(l, 52 + sw, 66, 9, 9, 0, 3); l.rect(20 - sw, 73, 17, 2, ROCK[0]); l.rect(44 + sw, 73, 17, 2, ROCK[0]);
    boulder(l, 27 - sw, 58, 6, 5, 1, 3); boulder(l, 53 + sw, 58, 6, 5, 0, 2);
    // linker Arm (hinten)
    const ly = s.sp ? -16 : 0;
    boulder(l, 12, 34 + by + ly * 0.4, 7, 8, 0, 3); boulder(l, 9, 48 + by + ly + sw, 6, 7, 0, 3); boulder(l, 9, 60 + by + ly * 1.4 + sw, 8, 8, 0, 3);
    if (s.sp) crystal(l, 9, 60 + by + ly * 1.4 - 6, 6, 60 + by + ly * 1.4 - 18, 3, C);
  });
  p.layer((l) => {
    // Rumpf
    boulder(l, 40, 40 + by, 20, 17); boulder(l, 27, 30 + by, 9, 8, 1, 4); boulder(l, 53, 30 + by, 9, 8, 0, 3); boulder(l, 40, 52 + by, 13, 8, 0, 2);
    // Risse
    l.line(24, 40 + by, 30, 46 + by, ROCK[0]); l.line(30, 46 + by, 28, 52 + by, ROCK[0]); l.line(52, 46 + by, 57, 42 + by, ROCK[0]); l.line(45, 54 + by, 50, 50 + by, ROCK[0]);
    l.px([33, 33 + by, 46, 35 + by, 36, 50 + by, 48, 28 + by], ROCK[4]);
    // Kopf
    boulder(l, 40, 24 + by, 9, 8, 1, 4); l.rect(33, 23 + by, 14, 4, ROCK[0]);
    const e = lit || s.atk ? WHITE : C[4];
    l.rect(35, 24 + by, 3, 2, e); l.rect(42, 24 + by, 3, 2, e); l.rect(34, 23 + by, 5, 1, ROCK[1]); l.rect(36, 29 + by, 8, 1, ROCK[0]); l.rect(37, 30 + by, 1, 1, ROCK[0]); l.rect(42, 30 + by, 1, 1, ROCK[0]);
  });
  // Kernkristall in der Brust
  glow(p, 40, 42 + by, lit ? 12 : 7, C[4], lit ? 120 : 80);
  p.layer((l) => { l.poly([[40, 34 + by], [46, 42 + by], [40, 51 + by], [34, 42 + by]], C[3]); l.poly([[40, 34 + by], [40, 51 + by], [34, 42 + by]], C[4]); l.line(40, 36 + by, 36, 42 + by, WHITE); l.poly([[40, 44 + by], [44, 42 + by], [40, 50 + by]], C[2]); }, true);
  // rechter Arm (vorne, Angriff)
  p.layer((l) => {
    let sx = 68, sy = 34 + by, ex = 71, ey = 48 + by - sw, fx = 71, fy = 60 + by - sw;
    if (s.atk === 1) { sy = 30; ex = 73; ey = 18; fx = 70; fy = 7; }
    if (s.atk === 2) { sy = 38; ex = 70; ey = 52; fx = 66; fy = 66; }
    if (s.sp) { ex = 72; ey = 30 + by; fx = 71; fy = 16 + by; }
    boulder(l, sx, sy, 7, 8, 1, 4); boulder(l, ex, ey, 6, 7, 1, 3); boulder(l, fx, fy, 8.5, 8.5, 1, 4);
    crystal(l, fx - 3, fy - 5, fx - 6, fy - 14, 2.5, C); crystal(l, fx + 3, fy - 6, fx + 5, fy - 13, 2, C2);
    l.line(fx - 4, fy + 2, fx + 4, fy + 3, ROCK[0]);
  });
  if (s.atk === 2) { for (const [x, y] of [[54, 76], [78, 74], [60, 78], [74, 78], [50, 72]] as const) spark(p, x, y, C[4]); p.rect(56, 76, 20, 1, ROCK[4]); }
  if (lit) { for (let i = 0; i < 8; i++) { const a = i * 0.8 + s.sp; spark(p, 40 + Math.cos(a) * (24 + s.sp * 5), 30 + by + Math.sin(a) * (22 + s.sp * 4), P.ice[4], i % 2 === 0); } for (const [x, y] of [[12, 3], [68, 5], [40, 0]] as const) glow(p, x, y + by, 5, WHITE, 110); }
  else { const g = [[13, 6], [66, 8], [40, 2], [27, 9]][s.t]; spark(p, g[0], g[1] + by, WHITE); }
};

// ---------------------------------------------------------------- Ignarok 80x88
const ignarok: BossFn = (p, s) => {
  const sw = Math.sin((s.t / 4) * Math.PI * 2), F = P.fire;
  let hx = 46 + sw * 2, hy = 24 + Math.cos((s.t / 4) * Math.PI * 2) * 1.5, open = 0.25, nx = 22;
  if (s.atk === 1) { hx = 34; hy = 16; nx = 14; } if (s.atk === 2) { hx = 56; hy = 40; open = 1; nx = 30; }
  if (s.sp === 1) { hx = 42; hy = 16; open = 0.7; } if (s.sp === 2) { hx = 42; hy = 14; open = 1; }
  const hot = s.sp > 0 || s.atk === 2;
  // Lavabecken
  p.layer((l) => {
    l.ell(40, 79, 39, 8, BASALT[1]); l.ell(40, 78.5, 36, 6.5, F[1]); l.ell(40, 78.5, 33, 5.2, F[2]); l.ell(38, 78, 28, 3.4, F[3]); l.ell(16, 78, 6, 1.5, F[4]); l.ell(62, 79, 7, 1.5, F[4]);
    for (const [x, y, w] of [[8, 79, 5], [58, 81, 6], [26, 82, 4], [68, 77, 3]] as const) l.rect(x, y, w, 1, BASALT[2]);
    const b = [[12, 76], [66, 78], [20, 81], [58, 76]][s.t]; l.ell(b[0], b[1], 2, 1.5, F[4]); l.set(b[0], b[1] - 3, F[3]);
    for (const [x, y] of [[3, 82], [76, 83], [24, 85], [56, 85]] as const) { l.ball(x, y, 3.5, 2.5, BASALT, 1, 4); }
  });
  // Leib
  const body: Pt[] = [...bez([40, 78], [nx - 6, 66], [nx + 4, 46], 14), ...bez([nx + 4, 46], [nx + 12, 30], [hx - 8, hy + 6], 12)];
  p.layer((l) => {
    const pts = tube(l, body, 11, 7.5, BASALT, 1);
    // Bauchschuppen (rechte Seite) + Glutfugen
    for (let i = 4; i < pts.length - 3; i += 5) {
      const a = pts[i], b = pts[i + 2], tx = b[0] - a[0], ty = b[1] - a[1], n = Math.hypot(tx, ty) || 1, qx = -ty / n, qy = tx / n;
      const r = 11 - (3.5 * i) / pts.length;
      l.line(a[0] - qx * r * 0.85, a[1] - qy * r * 0.85, a[0] + qx * r * 0.85, a[1] + qy * r * 0.85, F[hot ? 2 : 1]);
      l.line(a[0] - qx * r * 0.2, a[1] - qy * r * 0.2, a[0] + qx * r * 0.7, a[1] + qy * r * 0.7, F[hot ? 3 : 2]);
      l.set(a[0] + qx * r * 0.5, a[1] + qy * r * 0.5, F[hot ? 4 : 3]);
      // Rückenstacheln (linke Seite)
      const bx = a[0] + qx * r * (qx < 0 ? 1 : -1), byy = a[1] + qy * r * (qx < 0 ? 1 : -1), dir = qx < 0 ? 1 : -1;
      l.poly([[bx - tx / n * 2, byy - ty / n * 2], [bx + qx * dir * 6 - 1, byy + qy * dir * 6 - 2], [bx + tx / n * 2, byy + ty / n * 2]], BASALT[2]);
      l.line(bx, byy, bx + qx * dir * 5 - 1, byy + qy * dir * 5 - 2, BASALT[4]);
    }
  });
  // Kopf
  p.layer((l) => {
    const jy = open * 9;
    // Hörner
    l.poly([[hx - 8, hy - 4], [hx - 20, hy - 16], [hx - 4, hy - 8]], P.bone[3]); l.line(hx - 8, hy - 6, hx - 18, hy - 15, P.bone[4]); l.poly([[hx - 2, hy - 8], [hx - 8, hy - 22], [hx + 3, hy - 9]], P.bone[2]); l.line(hx - 1, hy - 9, hx - 7, hy - 20, P.bone[4]);
    // Unterkiefer
    l.poly([[hx - 6, hy + 5], [hx + 16, hy + 6 + jy], [hx + 12, hy + 10 + jy], [hx - 4, hy + 10 + jy * 0.4]], BASALT[2]);
    l.line(hx - 3, hy + 10 + jy * 0.4, hx + 12, hy + 10 + jy, BASALT[1]);
    if (open > 0.2) { l.poly([[hx - 2, hy + 5], [hx + 14, hy + 6], [hx + 14, hy + 5 + jy], [hx - 2, hy + 6 + jy * 0.4]], F[hot ? 3 : 1]); l.poly([[hx, hy + 6], [hx + 10, hy + 6], [hx + 10, hy + 4 + jy], [hx, hy + 5 + jy * 0.4]], hot ? F[4] : F[2]); }
    for (let i = 0; i < 4; i++) { l.poly([[hx + 2 + i * 4, hy + 6 + jy * (0.5 + i * 0.12)], [hx + 3 + i * 4, hy + 2 + jy * (0.5 + i * 0.12)], [hx + 4.5 + i * 4, hy + 6 + jy * (0.5 + i * 0.12)]], P.bone[3]); }
    // Oberschädel
    l.ball(hx, hy, 10, 8.5, BASALT, 1, 4);
    l.poly([[hx + 2, hy - 6], [hx + 20, hy - 1], [hx + 21, hy + 4], [hx + 2, hy + 6]], BASALT[3]); l.poly([[hx + 2, hy - 6], [hx + 20, hy - 1], [hx + 4, hy - 2]], BASALT[4]); l.line(hx + 4, hy + 5, hx + 20, hy + 4, BASALT[1]);
    l.rect(hx + 17, hy - 1, 2, 2, F[2]); l.set(hx + 18, hy - 3, F[3]);
    for (let i = 0; i < 4; i++) l.poly([[hx + 4 + i * 4, hy + 5], [hx + 5 + i * 4, hy + 8.5], [hx + 6.5 + i * 4, hy + 5]], P.bone[4]);
    // Auge + Glutadern
    l.poly([[hx + 1, hy - 3], [hx + 8, hy - 1], [hx + 2, hy + 1]], INK); l.rect(hx + 3, hy - 2, 3, 2, F[4]); l.set(hx + 5, hy - 1, INK); l.set(hx + 3, hy - 2, WHITE);
    l.line(hx - 7, hy + 2, hx - 3, hy - 1, F[2]); l.line(hx - 5, hy - 5, hx - 1, hy - 5, F[hot ? 3 : 2]); l.set(hx - 8, hy - 1, F[3]); l.line(hx + 9, hy - 2, hx + 14, hy, F[1]);
  });
  if (hot) {
    const mx = hx + 10, my = hy + 8 + open * 5;
    glow(p, mx, my, 9, F[3], 110);
    if (s.sp) { for (let i = 0; i < 9; i++) { const a = -1.2 + i * 0.3, d = 10 + ((i * 5 + s.sp * 3) % 14); spark(p, mx + Math.cos(a) * d + 4, my + Math.sin(a) * d - 2, F[3], i % 3 === 0); } }
    else { for (let i = 0; i < 12; i++) { const x = mx + 4 + i * 1.6, y = my + 2 + i * 1.2; p.ell(x, y, 3 - i * 0.15, 3 - i * 0.15, i < 5 ? F[4] : alpha(F[3], 230)); } p.ell(mx + 5, my + 3, 2, 2, WHITE); }
  }
  // aufsteigende Glut
  const em = [[10, 60], [70, 56], [16, 50], [64, 66]][s.t]; p.set(em[0], em[1], F[3]); p.set(em[0] + 1, em[1] - 6, F[2]);
};

// ---------------------------------------------------------------- Ysolde 64x80
const ysolde: BossFn = (p, s) => {
  const bob = Math.round(Math.sin((s.t / 4) * Math.PI * 2) * 2), sw = Math.cos((s.t / 4) * Math.PI * 2);
  const y0 = bob + (s.sp ? -3 : 0), I = P.ice, B = P.blue, W = P.snow;
  // Aura
  if (s.sp) { glow(p, 32, 36 + y0, 30, I[2], 60); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + s.sp * 0.26, x = 32 + Math.cos(a) * 26, y = 38 + y0 + Math.sin(a) * 24; const q = new Px(p.w, p.h); crystal(q, x, y + 3, x, y - 5, 2, I); q.outline(B[1]); p.draw(q); } }
  // Haar hinten
  p.layer((l) => {
    for (const sgn of [-1, 1]) { const pts = bez([32 + sgn * 5, 18 + y0], [32 + sgn * (15 + sw * 2), 34 + y0], [32 + sgn * (13 - sw * 3), 54 + y0], 14); tube(l, pts, 5, 1.5, W, 1); }
    l.ball(32, 22 + y0, 9, 9, W, 1, 3);
  });
  // Kleid
  p.layer((l) => {
    const hem = 70 + y0;
    l.poly([[27, 34 + y0], [37, 34 + y0], [48 + sw, hem - 4], [16 - sw, hem - 4]], B[2]);
    l.poly([[27, 34 + y0], [31, 34 + y0], [26, hem - 4], [16 - sw, hem - 4]], B[3]); l.poly([[35, 36 + y0], [37, 34 + y0], [48 + sw, hem - 4], [42, hem - 4]], B[1]);
    // zerfließender, gezackter Saum
    for (let x = 15; x <= 49; x++) { const len = 3 + Math.round(Math.abs(Math.sin((x + s.t * 2) * 0.7)) * 5); l.rect(x, hem - 4, 1, len, x < 26 ? I[2] : x > 42 ? B[1] : I[1]); if (len > 5) l.set(x, hem - 4 + len, I[3]); }
    l.line(22, hem - 5, 29, 40 + y0, I[3]); l.line(34, 42 + y0, 37, hem - 5, B[1]); l.line(41, hem - 6, 37, 46 + y0, B[3]);
    // Frostornamente
    for (const [x, y] of [[24, 60], [32, 64], [40, 58], [29, 52], [36, 50]] as const) { l.set(x, y + y0, WHITE); l.set(x - 1, y + y0, I[3]); l.set(x + 1, y + y0, I[3]); l.set(x, y - 1 + y0, I[3]); l.set(x, y + 1 + y0, I[3]); }
    // Oberkörper
    l.poly([[26, 28 + y0], [38, 28 + y0], [36, 38 + y0], [28, 38 + y0]], I[3]); l.rect(27, 28 + y0, 3, 8, I[4]); l.rect(35, 30 + y0, 2, 8, I[2]); l.rect(28, 37 + y0, 8, 2, P.gold[3]); l.rect(31, 37 + y0, 2, 2, B[3]);
    l.poly([[29, 28 + y0], [32, 33 + y0], [35, 28 + y0]], I[1]); l.rect(31, 30 + y0, 2, 2, B[4]);
    // Schulterkristalle
    crystal(l, 24, 30 + y0, 20, 22 + y0, 2.5, I); crystal(l, 40, 30 + y0, 44, 22 + y0, 2.5, I);
  });
  // Arme
  const arm = (sgn: number, ex: number, ey: number, hxx: number, hyy: number) => p.layer((l) => {
    const sx = 32 + sgn * 7, sy = 30 + y0;
    tube(l, [[sx, sy], [ex, ey], [hxx, hyy]], 2.2, 1.6, I, 2);
    l.poly([[ex - 2, ey - 1], [ex + 2, ey - 1], [ex + sgn * 2, ey + 9 + sw], [ex - sgn * 3, ey + 6]], B[2]); l.line(ex - 1, ey, ex - sgn * 2, ey + 6, B[3]);
    l.ball(hxx, hyy, 2, 2, I, 3, 4);
  });
  let rx = 50, ry = 40 + y0, rex = 45, rey = 36 + y0, lx = 14, ly = 40 + y0, lex = 19, ley = 36 + y0;
  if (s.atk === 1) { rx = 52; ry = 14 + y0; rex = 46; rey = 24 + y0; } if (s.atk === 2) { rx = 56; ry = 34 + y0; rex = 47; rey = 32 + y0; }
  if (s.sp) { rx = 52; ry = 16 + y0 - s.sp; rex = 46; rey = 26 + y0; lx = 12; ly = 16 + y0 - s.sp; lex = 18; ley = 26 + y0; }
  arm(-1, lex, ley, lx, ly); arm(1, rex, rey, rx, ry);
  // Kopf
  p.layer((l) => {
    const hy = 21 + y0;
    l.ball(32, hy, 7, 7.5, P.cream, 3, 4); l.rect(35, hy + 1, 2, 4, P.cream[3]); l.rect(29, hy + 6, 6, 1, P.cream[2]);
    // Haar vorn
    l.poly([[25, hy - 2], [32, hy - 8], [39, hy - 2], [36, hy - 4], [32, hy - 3], [28, hy - 4]], W[3]); l.rect(25, hy - 3, 2, 9, W[3]); l.rect(37, hy - 3, 2, 9, W[2]); l.rect(26, hy - 5, 4, 2, W[4]);
    // Augen
    l.rect(28, hy, 2, 2, B[2]); l.rect(34, hy, 2, 2, B[2]); l.set(28, hy, WHITE); l.set(34, hy, WHITE); l.rect(27, hy - 1, 3, 1, B[0]); l.rect(34, hy - 1, 3, 1, B[0]);
    l.rect(31, hy + 4, 2, 1, s.atk === 2 || s.sp ? B[0] : P.pink[2]); l.set(27, hy + 3, P.pink[4]); l.set(36, hy + 3, P.pink[4]);
    // Kristallkrone
    crystal(l, 32, hy - 6, 32, hy - 19, 2.5, I); crystal(l, 27, hy - 5, 24, hy - 15, 2, I); crystal(l, 37, hy - 5, 40, hy - 15, 2, I); crystal(l, 23, hy - 3, 19, hy - 9, 1.6, B); crystal(l, 41, hy - 3, 45, hy - 9, 1.6, B);
    l.rect(25, hy - 5, 14, 1, P.gold[3]); l.set(32, hy - 5, P.pink[3]);
  });
  // Zauber
  if (s.atk === 1) { glow(p, 52, 9 + y0, 7, I[4], 110); const q = new Px(p.w, p.h); crystal(q, 52, 13 + y0, 52, 0 + y0, 3, I); q.outline(B[1]); p.draw(q); }
  else if (s.atk === 2) { for (let i = 0; i < 3; i++) { const q = new Px(p.w, p.h); const x = 57 + i * 2, y = 30 + y0 + (i - 1) * 9; q.poly([[x - 5, y - 2], [x + 5, y + (i - 1)], [x - 5, y + 2]], I[4]); q.line(x - 4, y, x + 3, y + (i - 1) * 0.6, WHITE); q.outline(B[1]); p.draw(q); } }
  else if (!s.sp) { glow(p, lx, ly - 1, 4, I[4], 90); spark(p, lx, ly - 4 - (s.t & 1), I[4]); spark(p, rx + 1, ry - 4 + (s.t & 1), I[4]); }
  if (s.sp) { spark(p, lx, ly - 4, I[4], true); spark(p, rx, ry - 4, I[4], true); if (s.sp === 2) { spark(p, 32, 2, WHITE, true); for (const [x, y] of [[6, 30], [58, 28], [8, 60], [56, 62], [32, 76]] as const) spark(p, x, y + y0, WHITE); } }
  const sn = [[8, 50], [56, 46], [12, 66], [52, 70]][s.t]; p.set(sn[0], sn[1], WHITE); p.set(sn[0] + 40 > 63 ? 5 : sn[0] + 40, sn[1] - 30, I[4]);
};

// ---------------------------------------------------------------- Archivar 72x72
const archivar: BossFn = (p, s) => {
  const bob = Math.round(Math.sin((s.t / 4) * Math.PI * 2) * 1.5), cx = 36, cy = 34 + bob, G = P.gold;
  const rot = s.t * 0.4 + (s.sp ? s.sp * 0.5 : 0);
  const ringPts = (rx: number, ry: number, tilt: number, front: boolean, c: Ramp, runes: boolean) => {
    const n = 72;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, x0 = Math.cos(a) * rx, y0 = Math.sin(a) * ry, isFront = Math.sin(a) > 0;
      if (isFront !== front) continue;
      const x = cx + x0 * Math.cos(tilt) - y0 * Math.sin(tilt), y = cy + x0 * Math.sin(tilt) + y0 * Math.cos(tilt);
      p.rect(Math.round(x), Math.round(y), 2, 2, front ? c[3] : c[1]); p.set(x, y, front ? c[4] : c[2]);
      if (runes && (i + Math.round(rot * 6)) % 9 === 0) { p.rect(Math.round(x) - 1, Math.round(y) - 1, 3, 3, front ? P.teal[4] : P.teal[2]); p.set(x, y, front ? WHITE : P.teal[3]); }
    }
  };
  const book = (x: number, y: number, c: Ramp, open: boolean, small = false) => {
    const q = new Px(p.w, p.h), w = small ? 4 : 6;
    if (open) {
      q.poly([[x - w - 1, y - 2], [x, y], [x + w + 1, y - 2], [x + w + 1, y + 5], [x, y + 7], [x - w - 1, y + 5]], c[2]);
      q.poly([[x - w, y - 3], [x, y - 1], [x, y + 5], [x - w, y + 3]], P.cream[4]); q.poly([[x, y - 1], [x + w, y - 3], [x + w, y + 3], [x, y + 5]], P.cream[3]);
      for (let i = 0; i < 3; i++) { q.line(x - w + 1, y - 1 + i * 2, x - 2, y + i * 2, P.cream[1]); q.line(x + 2, y + i * 2, x + w - 1, y - 1 + i * 2, P.cream[1]); }
      q.line(x, y - 1, x, y + 6, c[1]);
    } else { q.rect(x - w, y - 4, w * 2, 9, c[2]); q.rect(x - w, y - 4, 2, 9, c[3]); q.rect(x + w - 2, y - 3, 2, 8, P.cream[3]); q.rect(x - w + 3, y - 2, w, 1, G[3]); q.rect(x - w + 3, y + 2, w, 1, G[3]); }
    q.outline(); p.draw(q);
  };
  const page = (x: number, y: number, k: number) => { const q = new Px(p.w, p.h); q.poly([[x - 3, y - 2 + (k & 1)], [x + 3, y - 3], [x + 4, y + 2 - (k & 1)], [x - 2, y + 3]], P.cream[4]); q.line(x - 1, y - 1, x + 2, y - 1, P.cream[1]); q.line(x - 1, y + 1, x + 2, y + 1, P.cream[1]); q.outline(P.cream[0]); p.draw(q); };
  if (s.sp) glow(p, cx, cy, 30 + s.sp * 3, P.teal[3], 50);
  // hintere Ringhälften + hintere Bücher
  ringPts(30, 9, 0.35, false, G, true); ringPts(24, 22, -0.5, false, P.violet, false);
  const orbit = s.sp ? 27 + s.sp * 3 : 25;
  const books: Array<[number, Ramp]> = [[0, P.red], [1.57, P.blue], [3.14, P.green], [4.71, P.violet]];
  for (const [a0, c] of books) { const a = a0 + rot * 0.8; if (Math.sin(a) < 0) book(cx + Math.cos(a) * orbit, cy - 4 + Math.sin(a) * 12, c, s.sp > 0, true); }
  for (let i = 0; i < 5; i++) { const a = i * 1.26 + rot * 1.4 + 0.6; if (Math.sin(a) < 0) page(cx + Math.cos(a) * (18 + i * 3), cy - 14 + Math.sin(a) * 8 + i * 5, i + s.t); }
  // Zentralkörper: Linse mit Auge
  p.layer((l) => {
    // Seitenflügel aus Seiten
    for (const sgn of [-1, 1]) for (let i = 0; i < 4; i++) { const x = cx + sgn * (12 + i * 3), y = cy - 6 + i * 3 + (s.sp ? -i * 2 : 0); l.poly([[x - sgn * 2, y], [x + sgn * 7, y - 4], [x + sgn * 8, y + 3], [x - sgn * 2, y + 6]], P.cream[sgn < 0 ? 4 - (i & 1) : 3 - (i & 1)]); l.line(x, y + 2, x + sgn * 6, y - 1, P.cream[1]); }
    l.ball(cx, cy, 13, 13, G, 0, 4);
    l.ell(cx, cy, 10.5, 10.5, G[0]); l.ball(cx, cy, 9.5, 9.5, P.bone, 2, 4);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.39; l.rect(Math.round(cx + Math.cos(a) * 11.6) - 1, Math.round(cy + Math.sin(a) * 11.6) - 1, 2, 2, i % 2 ? P.teal[3] : G[4]); }
    // Iris
    const ir = s.atk === 1 ? 5 : 6.5, ic = s.atk ? P.fire : s.sp ? P.teal : P.violet;
    l.ball(cx, cy + 0.5, ir, ir, ic, 1, 4); l.ell(cx, cy + 0.5, s.atk === 1 ? 1 : 2, s.atk === 1 ? 4 : 3.4, INK); l.rect(cx - 4, cy - 4, 2, 2, WHITE); l.set(cx - 2, cy - 5, WHITE);
    // Lider aus Metall
    const lid = s.atk === 1 ? 3 : s.t === 3 && !s.sp && !s.atk ? 2 : 0;
    if (lid) { l.poly([[cx - 10, cy - 3], [cx, cy - 10], [cx + 10, cy - 3], [cx + 7, cy - 6 + lid], [cx - 7, cy - 6 + lid]], G[2]); l.poly([[cx - 10, cy + 4], [cx, cy + 10], [cx + 10, cy + 4], [cx + 7, cy + 7 - lid], [cx - 7, cy + 7 - lid]], G[1]); }
    // Krone / Schriftrollen-Aufsatz
    l.poly([[cx - 5, cy - 12], [cx, cy - 21], [cx + 5, cy - 12]], G[3]); l.line(cx - 3, cy - 13, cx, cy - 19, G[4]); l.rect(cx - 1, cy - 16, 2, 2, P.teal[4]);
    l.poly([[cx - 4, cy + 12], [cx, cy + 22], [cx + 4, cy + 12]], G[2]); l.line(cx, cy + 14, cx, cy + 20, G[1]); l.rect(cx - 1, cy + 23, 2, 2, P.teal[3]);
  });
  // vordere Hälften
  ringPts(24, 22, -0.5, true, P.violet, false); ringPts(30, 9, 0.35, true, G, true);
  for (const [a0, c] of books) { const a = a0 + rot * 0.8; if (Math.sin(a) >= 0) book(cx + Math.cos(a) * orbit, cy - 2 + Math.sin(a) * 12, c, true); }
  for (let i = 0; i < 5; i++) { const a = i * 1.26 + rot * 1.4 + 0.6; if (Math.sin(a) >= 0) page(cx + Math.cos(a) * (18 + i * 3), cy - 14 + Math.sin(a) * 8 + i * 5, i + s.t); }
  if (s.atk === 1) { glow(p, cx, cy, 9, P.fire[3], 120); spark(p, cx - 9, cy - 8, P.fire[4]); spark(p, cx + 10, cy + 7, P.fire[4]); }
  if (s.atk === 2) { for (let i = 0; i < 26; i++) { const x = cx + 4 + i * 1.3, y = cy + 4 + i * 1.3, w = 3 - i * 0.04; p.ell(x, y, w + 1.5, w + 1.5, alpha(P.fire[3], 150)); } for (let i = 0; i < 26; i++) { const x = cx + 4 + i * 1.3, y = cy + 4 + i * 1.3; p.ell(x, y, 2, 2, i < 20 ? WHITE : P.fire[4]); } glow(p, cx, cy, 10, WHITE, 120); }
  if (s.sp) { for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + s.sp * 0.4; spark(p, cx + Math.cos(a) * 33, cy + Math.sin(a) * 31, P.teal[4], s.sp === 2 && i % 2 === 0); } }
};

// ---------------------------------------------------------------- Hohlkönig 96x96
const hohlkoenig: BossFn = (p, s) => {
  const bob = Math.round(Math.sin((s.t / 4) * Math.PI * 2) * 1.5), sw = Math.cos((s.t / 4) * Math.PI * 2);
  const S = P.shadow, V = P.violet, y0 = bob + (s.sp ? -2 : 0), cx = 48;
  const flare = s.sp > 0;
  if (flare) glow(p, cx, 46 + y0, 34 + s.sp * 4, V[2], 70);
  // Schattenpfütze + aufsteigende Schlieren
  p.layer((l) => {
    l.ell(cx, 88, 34 + sw, 6, S[1]); l.ell(cx - 2, 87.5, 26, 4, S[2]); l.ell(cx - 8, 87, 10, 1.5, S[3]);
    for (const [x, h, ph] of [[14, 12, 0], [26, 8, 1], [70, 9, 2], [82, 13, 3], [38, 5, 1], [60, 6, 0]] as const) {
      const hh = h + (flare ? 12 : 0) + ((s.t + ph) % 4 < 2 ? 2 : 0);
      tube(l, bez([x, 88], [x + (x < cx ? -4 : 4) * sw, 88 - hh * 0.5], [x + (x < cx ? 3 : -3), 88 - hh], 8), 2.6, 0.7, S, 1);
    }
  });
  // Mantel
  p.layer((l) => {
    l.poly([[cx - 14, 26 + y0], [cx + 14, 26 + y0], [cx + 30 + sw, 60 + y0], [cx + 34, 86], [cx - 34, 86], [cx - 30 - sw, 60 + y0]], S[2]);
    l.poly([[cx - 14, 26 + y0], [cx - 4, 26 + y0], [cx - 16, 86], [cx - 34, 86], [cx - 30 - sw, 60 + y0]], S[3]);
    l.poly([[cx + 10, 30 + y0], [cx + 14, 26 + y0], [cx + 30 + sw, 60 + y0], [cx + 34, 86], [cx + 20, 86]], S[1]);
    // Falten
    for (const [x0, x1] of [[-10, -22], [-4, -10], [4, 6], [9, 18], [-13, -29]] as const) l.line(cx + x0, 44 + y0, cx + x1 + sw, 85, S[x0 < 0 ? 4 : 0]);
    for (const [x0, x1] of [[-7, -16], [7, 12]] as const) l.line(cx + x0, 50 + y0, cx + x1, 85, S[x0 < 0 ? 2 : 1]);
    // zerfließender Saum
    for (let x = cx - 36; x <= cx + 36; x += 1) { const len = Math.round(Math.abs(Math.sin((x + s.t * 3) * 0.45)) * 6 + ((x * 5) % 3)); l.rect(x, 84, 1, 2 + len, x < cx - 12 ? S[3] : x > cx + 14 ? S[1] : S[2]); }
    // violette Säume
    l.line(cx - 4, 28 + y0, cx - 12, 84, V[1]); l.line(cx + 4, 28 + y0, cx + 12, 84, V[1]); l.line(cx - 3, 28 + y0, cx - 11, 84, V[2]);
    // Fellkragen / Schultern
    for (const sgn of [-1, 1]) {
      l.ball(cx + sgn * 17, 28 + y0, 9, 6.5, S, sgn < 0 ? 2 : 1, sgn < 0 ? 4 : 3);
      l.poly([[cx + sgn * 20, 24 + y0], [cx + sgn * 30, 14 + y0], [cx + sgn * 25, 27 + y0]], P.bone[sgn < 0 ? 3 : 2]); l.poly([[cx + sgn * 14, 23 + y0], [cx + sgn * 20, 12 + y0], [cx + sgn * 20, 25 + y0]], P.bone[sgn < 0 ? 4 : 2]);
      l.rect(cx + sgn * 17 - 4, 31 + y0, 9, 1, V[sgn < 0 ? 2 : 1]);
    }
  });
  // Hohle Brust
  const cyy = 46 + y0;
  p.layer((l) => {
    l.ell(cx, cyy, 9, 11, S[0]); l.ell(cx, cyy, 7, 9, INK);
    for (let i = 0; i < 4; i++) { const y = cyy - 7 + i * 4.5; l.line(cx - 9, y, cx - 3, y + 2, P.bone[i < 2 ? 3 : 2]); l.line(cx + 9, y, cx + 3, y + 2, P.bone[2]); l.set(cx - 9, y, P.bone[4]); }
  }, false);
  glow(p, cx, cyy, flare ? 10 + s.sp * 2 : 6, flare ? WHITE : P.gold[4], flare ? 150 : 100);
  { const a0 = s.t * 0.9; for (let i = 0; i < (flare ? 9 : 5); i++) { const a = a0 + i * 1.3, d = flare ? 4 + i * 1.6 : 2.5 + (i % 3); spark(p, cx + Math.cos(a) * d, cyy + Math.sin(a) * d * 1.2, i % 2 ? P.gold[4] : V[4], flare && i % 3 === 0); } p.set(cx, cyy, WHITE); }
  // Arme (dünn, lang, Klauen)
  const arm = (sgn: number, ex: number, ey: number, hx: number, hy: number, front: boolean) => p.layer((l) => {
    const sx = cx + sgn * 19, sy = 31 + y0;
    // weiter Ärmel
    l.poly([[sx - 4, sy - 2], [sx + 4, sy - 2], [ex + 5, ey + 2], [ex + sgn * 2, ey + 9 + sw], [ex - 5, ey + 3]], S[front ? 3 : 2]); l.line(sx - 3, sy, ex - 4, ey + 3, S[front ? 4 : 3]); l.line(ex - 4, ey + 4, ex + 4, ey + 3, V[1]);
    tube(l, [[ex, ey], [hx, hy]], 1.8, 1.4, P.bone, 1);
    l.ball(hx, hy, 2.6, 2.6, P.bone, 1, 3);
    const dx = hx - ex, dy = hy - ey, n = Math.hypot(dx, dy) || 1;
    for (const o of [-0.7, -0.25, 0.25, 0.7]) { const a = Math.atan2(dy, dx) + o; l.line(hx + Math.cos(a) * 2, hy + Math.sin(a) * 2, hx + Math.cos(a) * 7, hy + Math.sin(a) * 7, P.bone[front ? 4 : 2]); }
    void n;
  });
  let R = { ex: 76, ey: 46 + y0, hx: 84, hy: 56 + y0 + sw }, L = { ex: 20, ey: 46 + y0, hx: 12, hy: 56 + y0 - sw };
  if (s.atk === 1) R = { ex: 80, ey: 22, hx: 88, hy: 8 }; if (s.atk === 2) R = { ex: 72, ey: 50, hx: 62, hy: 66 };
  if (s.sp) { R = { ex: 78, ey: 24 + y0, hx: 84, hy: 10 + y0 - s.sp }; L = { ex: 18, ey: 24 + y0, hx: 12, hy: 10 + y0 - s.sp }; }
  arm(-1, L.ex, L.ey, L.hx, L.hy, false); arm(1, R.ex, R.ey, R.hx, R.hy, true);
  // Kopf + Krone
  p.layer((l) => {
    const hy = 16 + y0;
    // Kapuzenschatten
    l.ball(cx, hy + 2, 11, 11, S, 1, 3); l.ell(cx, hy + 3, 8, 9, S[0]);
    // hageres Gesicht
    l.poly([[cx - 6, hy - 3], [cx + 6, hy - 3], [cx + 5, hy + 5], [cx + 2, hy + 11], [cx - 2, hy + 11], [cx - 5, hy + 5]], P.bone[3]);
    l.poly([[cx - 6, hy - 3], [cx - 1, hy - 3], [cx - 3, hy + 10], [cx - 5, hy + 5]], P.bone[4]); l.poly([[cx + 3, hy - 2], [cx + 6, hy - 3], [cx + 5, hy + 5], [cx + 2, hy + 11]], P.bone[1]);
    l.rect(cx - 5, hy, 4, 3, INK); l.rect(cx + 1, hy, 4, 3, INK); l.rect(cx - 4, hy + 1, 2, 1, flare || s.atk ? WHITE : V[4]); l.rect(cx + 2, hy + 1, 2, 1, flare || s.atk ? WHITE : V[4]);
    l.rect(cx - 1, hy + 4, 2, 2, P.bone[0]); l.rect(cx - 3, hy + 7, 6, 1, INK); for (let i = 0; i < 3; i++) l.set(cx - 2 + i * 2, hy + 8, P.bone[4]);
    if (s.atk === 2 || flare) l.rect(cx - 2, hy + 8, 4, 2, INK);
    l.line(cx - 5, hy + 4, cx - 3, hy + 6, P.bone[1]); l.line(cx + 4, hy + 4, cx + 3, hy + 6, P.bone[0]);
    // Krone
    const ky = hy - 4, K = P.gold;
    l.rect(cx - 8, ky - 2, 16, 4, K[2]); l.rect(cx - 8, ky - 2, 6, 1, K[4]); l.rect(cx + 3, ky - 1, 5, 3, K[1]); l.rect(cx - 8, ky + 1, 16, 1, K[1]);
    for (const [dx, h] of [[-7, 6], [-3.5, 8], [0, 11], [3.5, 8], [7, 6]] as const) { l.poly([[cx + dx - 1.8, ky - 2], [cx + dx, ky - 2 - h], [cx + dx + 1.8, ky - 2]], K[dx < 0 ? 3 : 2]); l.set(cx + dx, ky - 1 - h, K[4]); }
    l.rect(cx - 1, ky - 1, 2, 2, V[4]); l.set(cx - 5, ky, P.pink[3]); l.set(cx + 5, ky, P.pink[2]); l.set(cx, ky - 9, V[4]);
  });
  if (s.atk === 1) { glow(p, 88, 8, 8, V[3], 110); for (let i = 0; i < 4; i++) p.line(86 + i * 2 - 4, 0, 88 + i * 2 - 4, 6, V[4]); }
  if (s.atk === 2) { for (let k = 0; k < 4; k++) for (let i = 0; i < 14; i++) { const a = -0.9 + i * 0.12, r = 30 + k * 3; p.blend(52 + Math.cos(a) * r + 0, 42 + Math.sin(a + 1.2) * r, alpha(k % 2 ? V[4] : WHITE, 230 - i * 10)); } }
  if (flare) { for (const h of [L, R]) { glow(p, h.hx, h.hy - 4, 7, V[4], 120); spark(p, h.hx, h.hy - 5, V[4], true); } if (s.sp === 2) for (let i = 0; i < 10; i++) { const a = i * 0.63; spark(p, cx + Math.cos(a) * 40, 46 + Math.sin(a) * 38, i % 2 ? V[4] : P.gold[4]); } }
};

const DEFS: Record<(typeof BOSS_IDS)[number], { w: number; h: number; fn: BossFn }> = {
  dornenmutter: { w: 80, h: 80, fn: dornenmutter },
  kristallkoloss: { w: 80, h: 80, fn: kristallkoloss },
  ignarok: { w: 80, h: 88, fn: ignarok },
  ysolde: { w: 64, h: 80, fn: ysolde },
  archivar: { w: 72, h: 72, fn: archivar },
  hohlkoenig: { w: 96, h: 96, fn: hohlkoenig },
};

export function buildBosses(): { bosses: Record<string, Sheet>; bossMeta: Record<string, SpriteMeta> } {
  const bosses: Record<string, Sheet> = {}, bossMeta: Record<string, SpriteMeta> = {};
  for (const id of BOSS_IDS) {
    const d = DEFS[id], frames: Px[] = [];
    for (let f = 0; f < 9; f++) {
      const p = new Px(d.w, d.h);
      const st: St = { t: f < 4 ? f : 0, atk: f === 4 ? 1 : f === 5 ? 2 : 0, sp: f === 6 ? 1 : f === 7 ? 2 : 0 };
      if (f === 8) { const q = new Px(d.w, d.h); d.fn(q, st); q.tint(mix(WHITE, P.red[4], 0.2), 0.55); p.draw(q, -2, 0); }
      else d.fn(p, st);
      frames.push(p);
    }
    bosses[`boss_${id}`] = gridSheet(frames, 9);
    bossMeta[`boss_${id}`] = { w: d.w, h: d.h };
  }
  return { bosses, bossMeta };
}
