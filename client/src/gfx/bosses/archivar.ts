/** Der Archivar (Wind/Arkan, schwebender Konstrukt): Kugel aus Messing und Stein mit Linsenauge, Runenringen, Folianten. 112×112. */
import { Px } from '../draw';
import type { Pt } from '../draw';
import { P, INK, WHITE, alpha, mix, rnd2 } from '../palette';
import type { Ramp } from '../palette';
import { pk, R, TAU, clamp, ease, glow, lay, lerp, lp, rays, rmix, spark } from './kit';
import type { BFr, BossDef } from './kit';

const GY = 104;
const BRASS: Ramp = [P.gold[0], P.gold[1], mix(P.gold[1], P.gold[2], 0.6), P.gold[2], P.gold[3]];
const LENS: Ramp = [P.blue[0], P.blue[1], P.blue[2], P.teal[3], P.teal[4]];
const COVERS: Ramp[] = [P.red, P.violet, P.teal];

interface Ring { rx: number; ry: number; tilt: number; ph: number; cy: number; broken?: boolean }
interface A { ox: number; oy: number; a: Ring; b: Ring; lid: number; charge: number; beam: number; open: number; orbit: number; rad: number; dead: number; f: BFr }

function pose(f: BFr): A {
  const i = f.i, s = Math.sin(f.ph), seg = TAU / 8;
  const z: A = { ox: 0, oy: 0, a: { rx: 40, ry: 13, tilt: 0.32, ph: 0, cy: 0 }, b: { rx: 32, ry: 15, tilt: -0.5, ph: 0, cy: 0 }, lid: 0, charge: 0, beam: 0, open: 0, orbit: 0, rad: 1, dead: 0, f };
  switch (f.a) {
    case 'idle': z.oy = [0, -1, -2, -2, -1, 0][i]; z.a.ph = (i / 6) * seg; z.b.ph = -(i / 6) * seg; z.orbit = s * 0.07; z.lid = i === 4 ? 0.5 : 0; break;
    case 'windup': z.oy = [-1, -2][i]; z.ox = [-1, -2][i]; z.a.tilt = [0.14, 0][i]; z.b.tilt = [-0.2, 0][i]; z.a.ry = [12, 11][i]; z.b.ry = [13, 12][i]; z.b.rx = [33, 34][i]; z.a.rx = [41, 42][i]; z.a.ph = [0.3, 0.6][i] * seg; z.b.ph = -[0.3, 0.6][i] * seg; z.lid = [0.4, 0.62][i]; z.charge = [0.6, 1][i]; z.rad = [0.94, 0.88][i]; break;
    case 'attack': z.oy = -1; z.ox = [-2, -4, -3, -1][i]; z.a.tilt = 0; z.b.tilt = 0; z.a.ry = 11; z.b.ry = 12; z.b.rx = 34; z.a.rx = 42; z.a.ph = (0.2 + i * 0.4) * seg; z.b.ph = -z.a.ph; z.lid = [0.1, 0, 0, 0.2][i]; z.charge = [1, 1, 0.8, 0.3][i]; z.beam = [0.3, 1, 0.8, 0.22][i]; z.rad = 0.9; break;
    case 'special': z.oy = [-2, -3, -2, -3][i]; z.a = { rx: 43, ry: 16, tilt: 0.8, ph: (i / 4) * seg, cy: 0 }; z.b = { rx: 38, ry: 15, tilt: -0.85, ph: -(i / 4) * seg, cy: 0 }; z.open = 1; z.charge = [0.5, 0.7, 0.5, 0.7][i]; z.rad = 0.93; break;
    case 'hit': z.ox = [-3, -1][i]; z.oy = [1, 0][i]; z.lid = 0.55; z.a.tilt = [0.5, 0.4][i]; z.b.tilt = [-0.3, -0.42][i]; z.orbit = [-0.2, -0.1][i]; break;
    case 'death': {
      const t = ease([0, 0, 0.25, 0.6, 1, 1, 1, 1][i]);
      z.dead = i === 0 ? 0.5 : 1; z.ox = lerp(-1, 3, t); z.oy = lerp(0, 38, t * t) + (i === 5 ? -1 : 0);
      z.a = { rx: 40, ry: lerp(13, 4, t), tilt: lerp(0.32, 0, t) + (i === 1 ? 0.2 : 0), ph: 0.4, cy: lerp(0, 50, t), broken: i >= 3 };
      z.b = { rx: lerp(32, 30, t), ry: lerp(15, 3, t), tilt: lerp(-0.5, 0, t) - (i === 1 ? 0.2 : 0), ph: 1.1, cy: lerp(0, 52, Math.min(1, t * 1.25)), broken: i >= 2 };
      z.lid = 0; break;
    }
  }
  return z;
}

function ring(l: Px, cx: number, cy: number, r: Ring, front: boolean, dim: number, glowT: number): void {
  const ct = Math.cos(r.tilt), st = Math.sin(r.tilt), n = Math.ceil(r.rx * 7), seg = TAU / 8;
  const B = dim ? rmix(BRASS, P.ash, 0.28) : BRASS;
  const cols = front ? [B[4], B[3], B[2], B[1]] : [B[2], B[1], B[1], B[0]];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU, sa = Math.sin(a);
    if (sa >= 0 !== front) continue;
    const g = (a + r.ph + TAU) / seg, gi = Math.floor(g), gf = g - gi;
    if (r.broken && (gi % 8 === 2 || gi % 8 === 5 || (gi % 8 === 7 && gf > 0.5))) continue;
    const lx = r.rx * Math.cos(a), ly = r.ry * sa, x = Math.floor(cx + lx * ct - ly * st), y = Math.floor(cy + lx * st + ly * ct);
    const notch = gf < 0.07 || gf > 0.93, rune = gf > 0.3 && gf < 0.7;
    for (let j = 0; j < 4; j++) l.set(x, y - 2 + j, notch ? B[0] : cols[j]);
    if (!front) continue;
    if (rune && !notch) {
      const u = Math.floor(((gf - 0.3) / 0.4) * 5), pat = [[1, 3, 1, 2, 1], [3, 1, 2, 1, 3], [2, 2, 1, 3, 1], [1, 2, 3, 2, 1]][gi % 4][u];
      const rc = dim ? B[0] : glowT > 0.5 ? WHITE : P.teal[4];
      if (pat & 1) l.set(x, y - 1, rc); if (pat & 2) l.set(x, y, dim ? B[0] : glowT > 0.5 ? P.teal[4] : P.teal[3]);
    } else if (!notch && (k % 3 === 0)) l.set(x, y - 2, WHITE === cols[0] ? cols[0] : mix(cols[0], WHITE, 0.35));
  }
}

function tome(l: Px, x: number, y: number, c: Ramp, skew: number, open: number, small = false): void {
  x = R(x); y = R(y);
  if (open > 0.5) {
    // aufgeschlagen: zwei Seitenflügel über dem Einband
    for (let j = 0; j < 3; j++) l.rect(x - 10 + j, y + 3 - j, 20 - j * 2, 1, c[j === 0 ? 1 : 2]);
    for (let i = 0; i < 9; i++) { const h = 6 + (i < 2 ? i : i > 6 ? 1 : 2), top = y - 4 - Math.round(Math.sin((i / 8) * Math.PI) * 2) + (i > 6 ? 1 : 0); l.rect(x - 10 + i, top, 1, h, i === 0 ? P.cream[2] : P.cream[i < 5 ? 4 : 3]); l.rect(x + 1 + i, top + (i < 2 ? 1 : 0) - (i > 5 ? 1 : 0), 1, h, i === 8 ? P.cream[2] : P.cream[i < 3 ? 4 : 3]); }
    l.rect(x, y - 5, 1, 8, P.cream[1]);
    for (let j = 0; j < 3; j++) { l.rect(x - 8, y - 3 + j * 2, 6, 1, P.stone[2]); l.rect(x + 3, y - 3 + j * 2, 6, 1, P.stone[2]); }
    return;
  }
  const w = small ? 12 : 15, h = small ? 9 : 11;
  for (let j = 0; j < h; j++) {
    const ox = x - (w >> 1) + Math.round((j - h / 2) * skew);
    l.rect(ox, y - (h >> 1) + j, w, 1, j < 2 ? c[3] : j > h - 3 ? P.cream[j === h - 1 ? 2 : 4] : c[2]);
    l.set(ox, y - (h >> 1) + j, c[1]); l.set(ox + 1, y - (h >> 1) + j, j === 2 || j === h - 4 ? P.gold[3] : c[1]);
    if (j <= h - 3) l.set(ox + w - 1, y - (h >> 1) + j, j < h - 3 ? c[1] : c[1]);
    if (j === h - 3) l.rect(ox, y - (h >> 1) + j, w, 1, c[1]);
    if (j > h - 3) { l.set(ox, y - (h >> 1) + j, c[1]); l.set(ox + w - 1, y - (h >> 1) + j, P.cream[2]); }
  }
  // Emblem und Eckbeschläge
  l.rect(x + 1, y - 2, 3, 3, P.gold[3]); l.set(x + 2, y - 1, P.gold[4]); l.set(x + 2, y - 3, P.gold[2]); l.set(x + 2, y + 1, P.gold[2]);
  l.set(x + (w >> 1) - 1, y - (h >> 1), P.gold[3]); l.set(x + (w >> 1) - 1, y - (h >> 1) + h - 4, P.gold[3]);
}

function page(l: Px, x: number, y: number, v: number): void {
  x = R(x); y = R(y);
  if (v === 0) { l.poly([[x - 3, y - 3], [x + 4, y - 4], [x + 3, y + 3], [x - 4, y + 4]], P.cream[4]); l.rect(x - 2, y - 1, 4, 1, P.stone[2]); l.rect(x - 2, y + 1, 3, 1, P.stone[2]); l.set(x + 3, y + 2, P.cream[2]); }
  else if (v === 1) { l.poly([[x - 4, y - 1], [x, y - 3], [x + 4, y - 1], [x + 3, y + 3], [x, y + 1], [x - 3, y + 3]], P.cream[3]); l.line(x, y - 3, x, y + 1, P.cream[1]); l.rect(x - 3, y - 1, 2, 1, P.cream[4]); l.set(x + 2, y, P.stone[2]); }
  else if (v === 2) { l.poly([[x - 4, y + 1], [x + 3, y - 2], [x + 4, y], [x - 3, y + 3]], P.cream[4]); l.line(x - 2, y + 1, x + 2, y, P.stone[2]); }
  else { l.rect(x - 4, y, 8, 2, P.cream[3]); l.rect(x - 3, y, 6, 1, P.cream[4]); l.set(x - 1, y + 1, P.stone[2]); }
}

function glyph(p: Px, x: number, y: number, k: number, a: number): void {
  const pats = [[0b01110, 0b10001, 0b00100, 0b10001, 0b01110], [0b00100, 0b01110, 0b10101, 0b00100, 0b01010], [0b11011, 0b00100, 0b01110, 0b00100, 0b11011], [0b10001, 0b01010, 0b11111, 0b01010, 0b00100]][k % 4];
  x = R(x); y = R(y);
  glow(p, x + 0.5, y + 0.5, 6, P.teal[3], a * 0.3);
  for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) if (pats[j] & (1 << i)) p.blend(x - 2 + i, y - 2 + j, alpha(j === 2 ? WHITE : P.teal[4], a));
}

function orb(p: Px, cx: number, cy: number, z: A): void {
  const dead = z.dead >= 1, ST = dead ? rmix(P.stone, P.shadow, 0.35) : P.stone, B = dead ? rmix(BRASS, P.ash, 0.4) : BRASS;
  lay(p, (l) => {
    // Öse mit schwebendem Kristall, Kappen
    l.rect(cx - 1, cy - 22, 2, 5, B[2]); l.ell(cx, cy - 24, 3.2, 3.2, B[3]); l.ell(cx, cy - 24, 1.3, 1.3, 0); l.set(cx - 2, cy - 26, B[4]);
    if (!dead) { const ky = cy - 33 - (z.f.a === 'idle' ? [0, 0, 1, 1, 0, 0][z.f.i] : 0); l.poly([[cx, ky - 4], [cx + 3, ky], [cx, ky + 4], [cx - 3, ky]], P.teal[3]); l.poly([[cx, ky - 4], [cx, ky + 4], [cx - 3, ky]], P.teal[4]); l.set(cx - 1, ky - 1, WHITE); }
    l.ball(cx, cy, 17.5, 17.5, ST, 0, 4);
    // Steinfugen
    for (let x = -16; x <= 16; x++) { const yy = Math.round(Math.sqrt(Math.max(0, 1 - (x / 17.5) ** 2)) * 2); if (Math.abs(x) > 10) { l.set(cx + x, cy - 6 - yy + 2, ST[1]); l.set(cx + x, cy + 7 + yy - 2, ST[0]); } }
    l.line(cx - 13, cy - 6, cx - 14, cy + 6, ST[1]); l.line(cx + 14, cy - 5, cx + 14, cy + 6, ST[0]); l.px([cx - 12, cy - 10, cx - 9, cy - 13, cx + 10, cy + 12], ST[4]);
    l.px([cx - 15, cy + 2, cx - 11, cy + 11, cx + 12, cy - 11], ST[1]);
    // Messingkappen oben/unten und Meridianband
    l.ell(cx, cy - 15, 10, 3.6, B[2]); l.ell(cx - 1, cy - 15.6, 8, 2.2, B[3]); l.rect(cx - 6, cy - 17, 5, 1, B[4]); l.ell(cx, cy + 15.5, 9, 3, B[1]); l.rect(cx - 5, cy + 15, 8, 1, B[2]);
    for (const dx of [-7, 0, 6]) l.set(cx + dx, cy - 14, B[0]);
    // Linsenfassung
    l.ell(cx + 1, cy, 11.5, 11.5, B[1]); l.ell(cx + 0.6, cy - 0.4, 10.6, 10.6, B[3]); l.ell(cx + 1.4, cy + 0.6, 10, 10, B[2]);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + 0.39; l.set(cx + 1 + Math.cos(a) * 9.6, cy + Math.sin(a) * 9.6, k > 4 || k === 0 ? B[4] : B[0]); }
    l.ell(cx + 1, cy, 8.4, 8.4, B[0]);
    const ex = cx + 1, ey = cy;
    if (dead) {
      l.ell(ex, ey, 7.6, 7.6, mix(INK, P.shadow[0], 0.5)); l.ell(ex + 1, ey + 1, 5, 5, P.shadow[0]);
      for (const [a, len] of [[0.4, 4], [1.6, 3], [2.5, 5], [3.6, 3], [4.6, 4], [5.5, 3]] as const) { const bx = ex + Math.cos(a) * 7.4, by = ey + Math.sin(a) * 7.4; l.poly([[bx - Math.sin(a) * 2, by + Math.cos(a) * 2], [ex + Math.cos(a) * (7.4 - len), ey + Math.sin(a) * (7.4 - len)], [bx + Math.sin(a) * 2, by - Math.cos(a) * 2]], P.blue[1]); l.set(bx, by, P.teal[2]); }
    } else {
      const ch = z.charge;
      l.ball(ex, ey, 7.6, 7.6, LENS, 0, 3, -0.05);
      l.ell(ex + 1.2, ey + 0.3, 5, 5, ch > 0.5 ? P.violet[3] : P.teal[2]); l.ell(ex + 1.2, ey + 0.3, 4, 4, ch > 0.5 ? P.violet[4] : P.teal[3]); l.ell(ex + 1.4, ey + 0.4, 3, 3, ch > 0.8 ? WHITE : P.teal[4]);
      if (ch <= 0.8) { l.ell(ex + 2, ey + 0.5, 1.7, 2.6, P.blue[0]); l.set(ex + 2, ey, INK); }
      l.rect(ex - 4, ey - 5, 2, 2, WHITE); l.set(ex - 5, ey - 3, P.teal[4]); l.set(ex + 4, ey + 4, P.teal[4]);
      if (z.dead > 0) { l.line(ex - 5, ey - 3, ex, ey + 1, WHITE); l.line(ex, ey + 1, ex + 5, ey - 2, WHITE); l.line(ex, ey + 1, ex - 1, ey + 6, WHITE); l.line(ex + 2, ey - 6, ex + 1, ey - 1, WHITE); }
      // Lider (Messingblenden)
      if (z.lid > 0.02) { const h = Math.round(z.lid * 7.5); for (let j = 0; j < h; j++) { const hw = Math.sqrt(Math.max(0, 58 - (7.6 - j) ** 2)); l.rect(ex - hw, ey - 8 + j, hw * 2 + 1, 1, j === h - 1 ? B[0] : B[j % 2 ? 2 : 3]); l.rect(ex - hw, ey + 7 - j, hw * 2 + 1, 1, j === h - 1 ? B[0] : B[j % 2 ? 1 : 2]); } }
    }
  });
  if (!dead) { const ch = z.charge; glow(p, cx + 2, cy, 9 + ch * 9, ch > 0.5 ? P.violet[3] : P.teal[3], 34 + ch * 50); if (ch > 0.8) glow(p, cx + 2, cy, 5, WHITE, 110); }
}

const TOME_POS = [3.4, 6.05, 1.78];
const PAGES: Array<[number, number, number]> = [[22, 26, 0], [88, 24, 1], [10, 70, 2], [100, 76, 0], [34, 12, 1], [80, 92, 2], [30, 92, 1]];

const fn = (p: Px, f: BFr): void => {
  const z = pose(f), i = f.i, cx = 56 + z.ox, cy = 48 + z.oy, dead = z.dead >= 1;
  const dt = f.a === 'death' ? ease([0, 0.1, 0.35, 0.65, 1, 1, 1, 1][i]) : 0;
  const rc = (r: Ring): Pt => [56 + z.ox * 0.5, 48 + (f.a === 'death' ? 0 : z.oy) + r.cy];
  const tomes = TOME_POS.map((a0, k) => {
    const a = a0 + z.orbit + (f.a === 'special' ? [0.1, -0.1, 0][k] : 0), bob = f.a === 'idle' || f.a === 'special' ? Math.round(Math.sin(f.ph + k * 2.1) * 1.5) : 0;
    const fly: Pt = [56 + Math.cos(a) * 42 * z.rad, 56 + z.oy * 0.5 + Math.sin(a) * 17 * z.rad + bob];
    const rest: Pt = pk([[14, GY - 5], [98, GY - 5], [36, GY - 4]], k);
    return { pos: f.a === 'death' ? lp(fly, rest, dt * dt) : fly, back: Math.sin(a) < 0, k };
  });
  const drawTome = (t: (typeof tomes)[number]): void => { lay(p, (l) => tome(l, t.pos[0], t.pos[1], COVERS[t.k], f.a === 'death' ? (1 - dt) * 0.3 : [0.25, -0.25, 0.12][t.k], z.open, t.back)); };
  const drawPages = (back: boolean): void => PAGES.forEach(([x, y, v], k) => {
    if ((k % 2 === 0) !== back) return;
    const fl = f.a === 'death' ? i : f.a === 'idle' ? i : i * 2, vv = dead && dt >= 1 ? 3 : (v + ((fl + k) >> 1)) % 3;
    const wob: Pt = [Math.sin(f.ph + k * 1.3) * 2, Math.cos(f.ph + k * 1.7) * 2];
    const flyP: Pt = [clamp(x + wob[0], 8, 103), y + wob[1] + z.oy * 0.5];
    const rest: Pt = [[8, 26, 50, 103, 66, 84, 24][k], GY - 3 - (k % 2)];
    const q = f.a === 'death' ? lp([lerp(flyP[0], rest[0], Math.min(1, dt * 1.5)), flyP[1]], rest, ease(clamp((i - 1 - (k % 3)) / 3))) : flyP;
    if (f.a === 'death' && i === 7 && k > 4) return;
    lay(p, (l) => page(l, q[0], q[1], vv));
  });

  // ---- hinten: Ringhälften, hintere Folianten, Seiten
  if (z.charge > 0.4 && !dead) glow(p, cx, cy, 30, P.violet[2], 22 * z.charge);
  lay(p, (l) => { const c = rc(z.b); ring(l, c[0], c[1], z.b, false, z.dead, z.charge); });
  lay(p, (l) => { const c = rc(z.a); ring(l, c[0], c[1], z.a, false, z.dead, z.charge); });
  drawPages(true);
  tomes.filter((t) => t.back).forEach(drawTome);
  // ---- Ketten mit Karteikarten
  if (!dead || i < 3) lay(p, (l) => {
    const sw = f.a === 'idle' ? Math.sin(f.ph) * 2 : f.a === 'hit' ? 3 : f.a === 'attack' ? -2 : f.a === 'special' ? Math.sin(f.ph) * 3 : 0;
    for (const [dx, len, ph] of [[-4, 22, 0], [4, 28, 1], [11, 18, 2]] as const) {
      const ex = cx + dx + sw * (0.6 + ph * 0.3) + (dx > 8 ? 3 : 0), ey = cy + 17 + len;
      for (let k = 0; k <= len; k += 1) { const t = k / len, x = lerp(cx + dx * 0.6, ex, t * t), y = cy + 17 + k; l.set(x, y, k % 3 === 0 ? P.steel[1] : k % 3 === 1 ? P.steel[3] : P.steel[2]); }
      const X = R(ex) - 3, Y = ey;
      l.rect(X, Y, 8, 9, P.cream[3]); l.rect(X, Y, 7, 8, P.cream[4]); l.rect(X, Y, 8, 2, ph === 1 ? P.red[2] : ph === 0 ? P.teal[2] : P.gold[2]); l.set(X + 3, Y, P.steel[3]);
      for (let j = 0; j < 3; j++) l.rect(X + 1, Y + 3 + j * 2, 5 - (j === 2 ? 2 : 0), 1, P.stone[2]);
    }
  });
  orb(p, cx, cy, z);
  // ---- vorn: Ringhälften, Folianten, Seiten
  lay(p, (l) => { const c = rc(z.b); ring(l, c[0], c[1], z.b, true, z.dead, z.charge); });
  lay(p, (l) => { const c = rc(z.a); ring(l, c[0], c[1], z.a, true, z.dead, z.charge); });
  tomes.filter((t) => !t.back).forEach(drawTome);
  drawPages(false);

  // ---- Effekte
  if (f.a === 'windup') { for (let k = 0; k < 10; k++) { const a = k * 0.63 + i * 0.4, d = 24 - i * 9 + (k % 3) * 3; p.blend(cx + 2 + Math.cos(a) * d, cy + Math.sin(a) * d, alpha(k % 2 ? WHITE : P.violet[4], 230)); } rays(p, cx + 2, cy, 8, 16 + i * 6, 8, 0.2, P.violet[4], 150); }
  if (z.beam > 0) {
    const bx = cx + 6, hw = z.beam * 5.5;
    if (i === 0) { rays(p, cx + 2, cy, 4, 26, 12, 0.1, WHITE, 240); spark(p, cx + 3, cy, WHITE, WHITE, 5); }
    for (let x = bx; x < 110; x++) {
      const wv = Math.sin((x + i * 5) * 0.55) * (i >= 2 ? 1.2 : 0.6), h = hw * (i === 3 ? 0.6 : 1) + (x < bx + 4 ? x - bx - 4 : 0);
      for (let y = -Math.ceil(h + 2); y <= Math.ceil(h + 2); y++) {
        const d = Math.abs(y - wv);
        if (d <= h * 0.38) p.set(x, cy + y, WHITE); else if (d <= h * 0.7) p.set(x, cy + y, P.teal[4]); else if (d <= h) p.set(x, cy + y, i === 3 ? alpha(P.violet[3], 170) : P.violet[3]); else if (d <= h + 1.6 && (x + y + i) % 2 === 0) p.blend(x, cy + y, alpha(P.violet[4], 130));
      }
    }
    for (let k = 0; k < 9; k++) { const x = bx + 6 + rnd2(k, i, 8) * 40, y = cy + (rnd2(k, i, 9) - 0.5) * (hw * 2 + 14); if (x < 109) p.set(x, y, k % 2 ? WHITE : P.teal[4]); }
    glow(p, cx + 4, cy, 11, WHITE, 90 * z.beam);
  }
  if (f.a === 'special') {
    tomes.forEach((t, k) => glyph(p, t.pos[0], t.pos[1] - 13 - (i % 2), k + i, 255));
    for (let k = 0; k < 5; k++) { const a = -2.6 + k * 0.52 + (i % 2) * 0.1; glyph(p, cx + Math.cos(a) * 30, cy - 2 + Math.sin(a) * 31, k + 1 + (i >> 1), (k + i) % 2 ? 235 : 150); }
    for (let k = 0; k < 10; k++) p.blend(12 + rnd2(k, 1, 3) * 88, 10 + ((rnd2(k, 2, 3) * 80 + i * 5) % 84), alpha(P.teal[4], 200));
  }
  if (f.a === 'death') {
    if (i === 0) { glow(p, cx + 2, cy, 24, WHITE, 70); rays(p, cx + 2, cy, 7, 30, 9, 0.5, WHITE, 220); }
    if (i >= 1 && i <= 3) lay(p, (l) => {
      // Linsenscherben
      for (let k = 0; k < 8; k++) { const a = -1.2 + k * 0.42, d = 8 + (i - 1) * 9 + (k % 3) * 3, x = 58 + Math.cos(a) * d * 1.2, y = 48 + (i - 1) * 4 + Math.sin(a) * d + (i - 1) * (i - 1) * 3; if (x < 108 && y < GY) l.poly([[x - 2, y], [x + 1, y - 2], [x + 2, y + 2]], k % 2 ? P.teal[3] : P.ice[3]); }
    });
    if (i >= 4) lay(p, (l) => { for (const [x, c] of [[70, P.teal[2]], [76, P.blue[2]], [86, P.teal[3]], [48, P.blue[2]], [92, P.teal[2]]] as const) { l.set(x, GY, c); l.set(x + 1, GY, P.ice[3]); l.set(x, GY - 1, c); } }, false);
    if (i >= 4 && i <= 5) for (let k = 0; k < 6; k++) p.blend(34 + k * 10, GY - 6 - (i - 4) * 5 - (k % 2) * 3, alpha(P.stone[3], 150 - (i - 4) * 60));
  }
};

export const archivar: BossDef = { w: 112, h: 112, fn };
