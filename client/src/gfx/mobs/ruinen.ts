/** Gegner der Verlorenen Ruinen: Runenwächter, Skelettkrieger, Fluchgeist, Arkanauge. */
import { Px, bez } from '../draw';
import type { Pt } from '../draw';
import { P, INK, WHITE, alpha } from '../palette';
import type { Ramp } from '../palette';
import { R, TAU, debris, deathFx, dots, floatState, form, glow, spark } from './kit';
import type { Fr, MobDef, MobFn } from './kit';
import { biped, bipPose } from './biped';
import type { BLook } from './biped';

/** Klinge ab der Hand in Richtung (dx, dy); liefert die Spitze. */
export function sword(l: Px, h: Pt, dx: number, dy: number, len: number, r: Ramp, w: number, guard: number, edge?: number): Pt {
  const n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n, at = (s: number, o: number): Pt => [h[0] + ux * s - uy * o, h[1] + uy * s + ux * o];
  const g0 = at(-2.5, 0); l.line(R(g0[0]), R(g0[1]), R(h[0]), R(h[1]), P.wood[1]); l.set(R(g0[0]), R(g0[1]), guard);
  l.poly([at(1.5, -w), at(len - 2.5, -w), at(len, 0), at(len - 2.5, w), at(1.5, w)], r[2]);
  const a0 = at(2, -w * 0.6), a1 = at(len - 2, -w * 0.6); l.line(R(a0[0]), R(a0[1]), R(a1[0]), R(a1[1]), r[4]);
  const b0 = at(2, w * 0.7), b1 = at(len - 3, w * 0.7); l.line(R(b0[0]), R(b0[1]), R(b1[0]), R(b1[1]), edge ?? r[1]);
  const c0 = at(1, -w - 1.6), c1 = at(1, w + 1.6); l.line(R(c0[0]), R(c0[1]), R(c1[0]), R(c1[1]), guard);
  return at(len, 0);
}
function arc(p: Px, a: Pt, c: Pt, b: Pt, col: number, a0 = 210): void {
  const pts = bez(a, c, b, 22); pts.forEach((q, i) => { p.blend(R(q[0]), R(q[1]), alpha(col, R(a0 * (i / pts.length)))); if (i > pts.length * 0.5) p.blend(R(q[0] - 1), R(q[1]), alpha(col, R(a0 * 0.4 * (i / pts.length)))); });
}

// ================================================================ Runenwächter
const STN_FAR: Ramp = [P.stone[0], P.stone[0], P.stone[1], P.stone[1], P.stone[2]];
function rune(fr: Fr): number { const i = fr.i; return fr.a === 'windup' ? [P.gold[4], WHITE][i] : fr.a === 'attack' ? [WHITE, P.gold[4], P.gold[3]][i] : fr.a === 'hit' ? P.gold[0] : fr.a === 'death' ? (i === 0 ? WHITE : P.stone[0]) : P.gold[[2, 3, 4, 3, 2, 3][i]]; }
function headBob(fr: Fr): Pt { const i = fr.i; return fr.a === 'idle' ? [0, [0, -1, -2, -1][i]] : fr.a === 'move' ? [-1, [0, -1, 0, 1, 0, -1][i]] : fr.a === 'windup' ? [0, [-3, -4][i]] : fr.a === 'attack' ? [[2, 1, 0][i], [-1, 1, 0][i]] : fr.a === 'hit' ? [[-4, -2][i], [1, 0][i]] : [-3, -3]; }
const WAECHTER: BLook = {
  w: 48, h: 48, hip: 9, torsoH: 12, stance: 5, legR: [3, 3], armL: 12, armR: [3, 3.3], armRF: [2.6, 2.8], shN: [-7, 3], shF: [8, 3], skin: P.stone, far: STN_FAR,
  torso: (l, k, b) => {
    const s = k.sh, h = k.hip, rc = rune(b.fr);
    form(l, (m) => { m.poly([[s[0] - 10, s[1] + 1], [s[0] + 9, s[1] + 1], [h[0] + 7, h[1] + 2], [h[0] - 7, h[1] + 2]], 1); m.rrect(R(s[0] - 11), R(s[1]), 22, 6, 1); m.rect(R(s[0] + 9), R(s[1]), 2, 2, 0); }, P.stone, 1, 4, 0.1);
    // Blockfugen, Risse
    for (let x = R(s[0] - 9); x < s[0] + 9; x++) if (l.get(x, R(s[1] + 6)) >>> 24) l.set(x, R(s[1] + 6), P.stone[1]);
    l.line(R(s[0] - 4), R(s[1] + 1), R(s[0] - 4), R(s[1] + 5), P.stone[1]); l.line(R(s[0] + 5), R(s[1] + 7), R(s[0] + 5), R(h[1]), P.stone[1]); l.px([s[0] + 6, s[1] + 2, s[0] + 7, s[1] + 3, s[0] + 7, s[1] + 4], P.stone[0]);
    // Rune auf der Brust
    const rx = R((s[0] + h[0]) / 2), ry = R(s[1] + 4);
    l.line(rx, ry, rx, ry + 7, rc); l.line(rx, ry + 1, rx + 3, ry + 3, rc); l.line(rx, ry + 4, rx + 3, ry + 6, rc); l.line(rx, ry + 2, rx - 3, ry, rc); l.set(rx - 3, ry + 6, rc); l.set(rx + 3, ry, rc);
    // Moos und Ranke auf der Schulter
    form(l, (m) => { m.ell(s[0] - 8, s[1] + 0.5, 4, 2, 1); m.ell(s[0] - 4.5, s[1], 2.5, 1.5, 1); }, P.green, 2, 4, 0.1);
    l.line(R(s[0] - 9), R(s[1] + 2), R(s[0] - 10), R(s[1] + 7), P.forest[3]); l.set(R(s[0] - 9), R(s[1] + 5), P.green[4]); l.set(R(s[0] - 11), R(s[1] + 8), P.green[3]);
  },
  head: (l, x, y, b) => {
    const o = headBob(b.fr), hx = R(x - 4 + o[0] - b.head[0]), hy = R(y - 12 + o[1] - b.head[1]), rc = rune(b.fr);
    form(l, (m) => { m.rrect(hx, hy, 11, 9, 1); m.rect(hx + 9, hy, 2, 2, 0); }, P.stone, 2, 4, 0.2);
    l.rect(hx + 3, hy + 4, 7, 1, INK); l.rect(hx + 2, hy + 2, 8, 1, P.stone[1]);
    if (b.mood === 'shut') l.rect(hx + 4, hy + 4, 5, 1, P.gold[0]); else { l.rect(hx + 4, hy + 3, 2, 2, rc); l.rect(hx + 7, hy + 3, 2, 2, rc); }
    l.px([hx + 5, hy + 1, hx + 6, hy, hx + 6, hy + 1], rc); l.line(hx + 2, hy + 6, hx + 3, hy + 8, P.stone[1]); l.rect(hx + 6, hy + 7, 3, 1, P.stone[2]);
    l.px([hx + 1, hy - 1, hx + 2, hy - 1, hx + 3, hy - 1, hx + 2, hy - 2], P.green[3]); l.set(hx + 1, hy, P.green[4]);
  },
  hand: (l, h, b, near) => { const r = near ? P.stone : STN_FAR, x = R(h[0] - 3), y = R(h[1] - 3); l.rrect(x, y, 7, 7, r[2]); l.rect(x + 1, y, 5, 1, r[3]); l.rect(x + 1, y + 6, 5, 1, r[1]); l.rect(x + 6, y + 1, 1, 5, r[1]); if (near) { l.rect(x + 2, y + 2, 3, 3, rune(b.fr)); l.set(x + 3, y + 3, r[2]); } },
  foot: (l, x, y, near) => { const r = near ? P.stone : STN_FAR; l.rrect(R(x - 3), R(y - 2), 8, 4, r[2]); l.rect(R(x - 2), R(y - 2), 6, 1, r[3]); },
  over: (p, k, b) => {
    const f = b.fr, o = headBob(f), gx = k.sh[0] + 1, gy = k.sh[1] - 2 + o[1] * 0.5, rc = rune(f);
    if (f.a !== 'death') { glow(p, gx, gy, 4.5, P.gold[3], 90); dots(p, [gx - 2, gy, gx + 2, gy + 1, gx, gy - 1], rc); }
    const mx = (k.handN[0] + k.handF[0]) / 2, my = (k.handN[1] + k.handF[1]) / 2;
    if (f.a === 'windup') { glow(p, mx, my - 2, 5 + f.i * 3, P.gold[3], 100); spark(p, mx, my - 2, WHITE, P.gold[4], 1 + f.i); for (let s = 0; s < 6; s++) p.set(R(mx + Math.cos(s * 1.05 + f.i) * (9 - f.i * 3)), R(my - 2 + Math.sin(s * 1.05 + f.i) * (7 - f.i * 2)), P.gold[4]); }
    if (f.a === 'attack' && f.i < 2) { glow(p, mx + 4, my, 8 - f.i * 2, P.gold[4], 120 - f.i * 40); spark(p, mx + 5, my, WHITE, P.gold[4], 3 - f.i); for (let x = R(mx + 8); x < 47; x += 2) p.blend(x, R(my + Math.sin(x) * 1.5), alpha(P.gold[4], 220 - (x - mx) * 5)); }
    if (f.a === 'move' && (f.i === 1 || f.i === 4)) dots(p, [k.cx - 11, k.G, k.cx + 10, k.G - 1], alpha(P.sand[4], 200));
  },
};
const runenwaechter: MobFn = (p, fr) => {
  if (fr.a === 'death' && fr.i >= 1) {
    const b = new Px(48, 48); biped(b, WAECHTER, bipPose({ ...fr, i: 1 }, 'slam', 12));
    deathFx(p, b, fr.i, 'shatter', 43, 17, { cell: 6, heap: 6, cx: 24, pop: 2 });
    if (fr.i <= 2) debris(p, 24, 43, fr.i * 0.4, 6, 8, [P.stone[3], P.sand[3], P.stone[2]], 14, 8);
    if (fr.i < 4) dots(p, [20 + fr.i, 38 - fr.i * 3, 28 - fr.i, 34 - fr.i * 4, 24, 30 - fr.i * 3], alpha(P.gold[4], 230 - fr.i * 50));
    return;
  }
  const b = bipPose(fr, 'slam', 12);
  if (fr.a === 'attack') { b.armN = [[9, -2], [10, 1], [7, 6]][fr.i] as unknown as Pt; b.armF = [[2, -2], [3, 1], [1, 6]][fr.i] as unknown as Pt; b.dy = 0; }
  biped(p, WAECHTER, b);
};

// ================================================================ Skelettkrieger
const BONE_FAR: Ramp = [P.bone[0], P.bone[0], P.bone[1], P.bone[1], P.bone[2]];
const RUST: Ramp = [P.wood[0], P.wood[1], P.wood[2], P.tan[2], P.tan[3]];
function skDir(fr: Fr): Pt { const i = fr.i; return fr.a === 'windup' ? [[-0.35, -1], [-0.7, -1]][i] as unknown as Pt : fr.a === 'attack' ? [[1, -0.55], [1, 0.5], [0.7, 0.8]][i] as unknown as Pt : fr.a === 'hit' ? [0.8, -0.6] : fr.a === 'death' ? [1, 0.2] : [0.85, -0.55]; }
function skull(l: Px, hx: number, hy: number, open: boolean, glint: number, helm = true): void {
  l.ball(hx, hy, 4.2, 4, P.bone, 2, 4); l.ell(hx - 0.5, hy - 1, 3, 2.4, P.bone[4]);
  const j = open ? 1 : 0; l.rect(hx - 1, hy + 3 + j, 5, 2, P.bone[3]); l.px([hx, hy + 4 + j, hx + 2, hy + 4 + j], P.bone[0]); if (open) l.rect(hx, hy + 3, 4, 1, INK);
  l.rect(hx, hy - 1, 2, 2, INK); l.rect(hx + 3, hy - 1, 2, 2, INK); l.set(hx + 1, hy, glint); l.set(hx + 4, hy, glint); l.set(hx + 2, hy + 1, P.bone[1]); l.px([hx - 3, hy + 1, hx - 2, hy + 2], P.bone[1]);
  if (helm) { l.rect(hx - 4, hy - 4, 5, 2, RUST[2]); l.rect(hx - 3, hy - 5, 4, 1, RUST[3]); l.rect(hx - 4, hy - 2, 2, 2, RUST[1]); l.set(hx, hy - 4, P.fire[1]); l.set(hx - 2, hy - 5, RUST[4]); l.line(hx + 2, hy - 4, hx + 3, hy - 2, P.bone[1]); }
}
const SKELETT: BLook = {
  w: 48, h: 40, cx: -3, hip: 9, torsoH: 8, stance: 2, legR: [0.9, 0.8], armL: 8, armR: [0.9, 0.8], shN: [0, 1], shF: [2, 1], skin: P.bone, far: BONE_FAR,
  torso: (l, k, b) => {
    const s = k.sh, h = k.hip, w = Math.sin(b.fr.ph + b.fr.i) * 1.2;
    // Lendentuch in Fetzen
    for (const [dx, len, c] of [[-2, 5, 1], [0, 4, 0], [2, 6, 1]] as const) { l.line(R(h[0] + dx), R(h[1]), R(h[0] + dx - w * 0.6 - (b.fr.a === 'move' ? 1 : 0)), R(h[1] + len), P.red[c]); }
    l.line(R(h[0]), R(h[1]), R(s[0]), R(s[1]), P.bone[2]); l.rect(R(h[0] - 2), R(h[1] - 1), 5, 2, P.bone[3]); l.set(R(h[0] - 2), R(h[1] - 1), P.bone[4]);
    for (let r = 0; r < 3; r++) { const t = (r + 1.2) / 4.4, x = R(s[0] + (h[0] - s[0]) * t), y = R(s[1] + (h[1] - s[1]) * t); l.rect(x - 2, y, 6, 1, P.bone[3]); l.set(x - 2, y, P.bone[4]); l.set(x + 3, y, P.bone[2]); }
    l.rect(R(s[0] - 3), R(s[1]), 7, 1, P.bone[3]);
    l.ball(s[0] - 2.5, s[1] + 0.3, 2.2, 1.8, RUST, 1, 4);
  },
  head: (l, x, y, b) => { skull(l, R(x + 1), R(y - 4), b.mood === 'open', b.mood === 'shut' ? P.violet[1] : b.mood === 'angry' || b.mood === 'open' ? P.pink[3] : P.violet[4], false); l.line(R(x) - 1, R(y) - 7, R(x), R(y) - 5, P.bone[1]); l.set(R(x) + 1, R(y) - 5, P.bone[1]); },
  hand: (l, h, b, near) => {
    if (near) {
      const d = skDir(b.fr), tip = sword(l, h, d[0], d[1], 12, P.steel, 1.1, RUST[2]);
      const m: Pt = [h[0] + (tip[0] - h[0]) * 0.55, h[1] + (tip[1] - h[1]) * 0.55]; l.set(R(m[0]), R(m[1]), 0); l.set(R(h[0] + (tip[0] - h[0]) * 0.35), R(h[1] + (tip[1] - h[1]) * 0.35), RUST[3]); l.set(R(h[0] + (tip[0] - h[0]) * 0.8), R(h[1] + (tip[1] - h[1]) * 0.8), RUST[2]);
    } else {
      // zerbrochener Rundschild
      const x = h[0] + 1, y = h[1] - 1;
      l.ball(x, y, 3.7, 4.1, P.wood, 1, 4); l.poly([[x + 1, y - 5], [x + 5, y - 5], [x + 5, y - 1], [x + 2.5, y - 2.5]], 0); l.line(R(x - 3), R(y - 1), R(x + 2), R(y + 2), P.wood[1]);
      l.rect(R(x - 1), R(y), 2, 2, P.steel[2]); l.set(R(x - 1), R(y), P.steel[4]); l.px([x - 3, y - 3, x - 4, y + 1, x + 2, y + 4, x - 1, y + 4], P.steel[1]);
    }
  },
  foot: (l, x, y, near) => l.rect(R(x - 1), R(y), 4, 1, near ? P.bone[3] : P.bone[1]),
  over: (p, k, b) => {
    const f = b.fr, h = k.handN;
    if (f.a === 'attack' && f.i === 0) arc(p, [h[0] - 8, h[1] - 12], [h[0] + 8, h[1] - 13], [h[0] + 12, h[1] - 5], WHITE);
    if (f.a === 'attack' && f.i === 1) { arc(p, [h[0] + 4, h[1] - 14], [h[0] + 15, h[1] - 9], [h[0] + 12, h[1] + 5], WHITE, 230); spark(p, h[0] + 12, h[1] + 7, WHITE, P.steel[4]); }
    if (f.a === 'windup' && f.i === 1) spark(p, h[0] - 7, h[1] - 11, WHITE, P.steel[4]);
  },
};
const skelettkrieger: MobFn = (p, fr) => {
  if (fr.a === 'death' && fr.i >= 1) {
    const b = new Px(48, 40); biped(b, SKELETT, bipPose({ ...fr, i: 0 }, 'slash', 8));
    deathFx(p, b, fr.i, 'shatter', 35, 23, { cell: 3, heap: 3, cx: 20, pop: 3, spread: 0.8 });
    // der Schädel landet obenauf
    const sy = [0, 20, 29, 31, 31][fr.i], sx = [0, 19, 21, 22, 22][fr.i];
    const s = new Px(48, 40); s.layer((l) => skull(l, sx, sy, fr.i < 3, fr.i < 3 ? P.violet[3] : P.violet[1], false)); if (fr.i === 4) s.alphaMul(0.5); p.draw(s);
    if (fr.i < 3) dots(p, [14, 30 - fr.i * 3, 28, 28 - fr.i * 2], alpha(P.violet[4], 180));
    return;
  }
  const b = bipPose(fr, 'slash', 8);
  if (fr.a === 'idle') { b.head = [[0, 0, 1, 0][fr.i], [0, 0, 0, 1][fr.i]]; if (fr.i === 2) b.mood = 'open'; }
  biped(p, SKELETT, b);
};

// ================================================================ Fluchgeist
interface GH { dx: number; dy: number; arms: Pt; scream: number; shut: boolean; t: number; stream: number }
function ghost(p: Px, o: GH): void {
  const cx = 16 + o.dx, cy = 12 + o.dy, V = P.violet;
  const g = new Px(32, 32);
  g.layer((l) => {
    // zerfetztes Gewand: Bahnen unterschiedlicher Länge, die nach hinten wehen
    for (let x = -6; x <= 5; x++) {
      const len = 10 + Math.round(Math.sin((x + o.t * 1.7) * 1.2) * 2 + ((x * 7 + 21) % 4)) - Math.abs(x) * 0.5;
      for (let y = 0; y < len; y++) { const xx = cx + x - (y / len) * (2 + o.stream * 3) - Math.sin((y + o.t * 2) * 0.5) * (y / 9); l.set(R(xx), R(cy + 2 + y), x < -3 ? V[3] : x > 2 ? V[1] : V[2]); }
    }
    l.ball(cx + 0.5, cy, 6, 5.8, V, 1, 4);
    // Kapuzenschatten und hohle Augen
    l.ell(cx + 1.5, cy + 0.5, 4, 3.6, V[0]);
    const ex = R(cx), ey = R(cy - 1);
    if (o.shut) { l.rect(ex, ey + 1, 2, 1, P.pink[2]); l.rect(ex + 3, ey + 1, 2, 1, P.pink[2]); }
    else { l.rect(ex, ey, 2, 3, INK); l.rect(ex + 3, ey, 2, 3, INK); l.set(ex + 1, ey + 1, o.scream ? WHITE : P.pink[3]); l.set(ex + 4, ey + 1, o.scream ? WHITE : P.pink[3]); l.set(ex, ey + 3, V[1]); }
    if (o.scream) { l.rect(ex + 1, ey + 4, 3, 2 + o.scream, INK); l.set(ex + 2, ey + 4 + o.scream, P.pink[1]); } else l.rect(ex + 1, ey + 4, 2, 1, INK);
    l.px([cx - 4, cy + 6, cx - 1, cy + 8, cx + 2, cy + 7, cx - 3, cy + 10], V[1]); l.px([cx - 5, cy - 2, cx - 4, cy - 4], V[4]);
  });
  g.alphaMul(0.9);
  for (let y = 17; y < g.h; y++) for (let x = 0; x < g.w; x++) { const c = g.d[y * g.w + x]; if (c >>> 24) g.d[y * g.w + x] = alpha(c, Math.max(70, (c >>> 24) - (y - 16 - o.dy) * 16)); }
  p.draw(g);
  // dürre Arme mit Krallen; am Handgelenk eine zerrissene Fessel
  p.layer((l) => {
    for (const [s, far] of [[1, true], [0, false]] as const) {
      const sh: Pt = [cx + 3 + s, cy + 3 - s], h: Pt = [cx + o.arms[0] + s * 2, cy + o.arms[1] - s * 2], e: Pt = [(sh[0] + h[0]) / 2 - 1, Math.max(sh[1], h[1]) + 2 - (o.arms[1] < 0 ? 4 : 0)];
      const c = far ? V[1] : V[3];
      l.line(R(sh[0]), R(sh[1]), R(e[0]), R(e[1]), c); l.line(R(e[0]), R(e[1]), R(h[0]), R(h[1]), c);
      l.px([h[0] + 1, h[1] - 1, h[0] + 2, h[1], h[0] + 1, h[1] + 1], far ? V[3] : P.pink[4]);
      if (!far) { l.set(R(h[0] - 1), R(h[1]), P.steel[3]); l.set(R(h[0] - 1), R(h[1] + 1), P.steel[2]); l.set(R(h[0] - 1), R(h[1] + 2 + (o.t & 1)), P.steel[1]); }
    }
  });
}
const fluchgeist: MobFn = (p, fr) => {
  const i = fr.i, z = floatState(fr);
  const o: GH = { dx: z.dx, dy: z.dy, arms: [8, 4], scream: 0, shut: z.shut, t: i, stream: 0 };
  if (fr.a === 'idle') o.arms = [8, 4 + [0, 0, 1, 1][i]];
  if (fr.a === 'move') { o.stream = 1; o.arms = [9, 2 + (i & 1)]; }
  if (fr.a === 'windup') { o.arms = [[6, -3], [5, -6]][i] as unknown as Pt; o.scream = i + 1; }
  if (fr.a === 'attack') { o.arms = [[11, 0], [10, 2], [8, 3]][i] as unknown as Pt; o.scream = [2, 1, 0][i]; o.stream = 1; }
  if (fr.a === 'hit') { o.arms = [5, -2]; o.stream = -0.5; }
  if (fr.a === 'death') { o.arms = [4, -4]; o.scream = 2; o.shut = false; }
  if (fr.a === 'death' && i >= 1) { const b = new Px(32, 32); ghost(b, o); deathFx(p, b, i, 'shred', 27, 31); dots(p, [[], [10, 6, 22, 4], [8, 4, 18, 2, 24, 7], [12, 3, 20, 5], [15, 4]][i], alpha(P.pink[3], 200 - i * 30)); return; }
  const hx = 16 + o.dx + o.arms[0] + 2, hy = 12 + o.dy + o.arms[1] - 1;
  if (fr.a === 'windup') glow(p, hx, hy - 2, 4 + i * 2, P.pink[2], 110);
  ghost(p, o);
  const orb = (x: number, y: number, r: number): void => { p.layer((l) => { l.ball(x, y, r, r, P.pink, 1, 4); }, false); p.set(R(x - 0.5), R(y - 0.5), WHITE); };
  if (fr.a === 'windup') { orb(hx, hy - 2, [1.8, 2.8][i]); dots(p, [hx - 4, hy - 6, hx + 4, hy - 5, hx, hy - 8 + i], P.pink[4]); }
  if (fr.a === 'attack' && i === 0) { orb(hx + 3, hy, 2.6); dots(p, [hx, hy - 2, hx - 2, hy + 1, hx + 6, hy - 3], P.pink[3]); }
  if (fr.a === 'attack' && i === 1) dots(p, [hx + 2, hy - 2, hx + 4, hy + 1, hx + 5, hy - 1], P.pink[4]);
};

// ================================================================ Arkanauge
interface AE { dx: number; dy: number; open: number; hot: number; rot: number; look: Pt; dead: boolean; t: number }
function eyeDraw(p: Px, o: AE): void {
  const cx = 16 + o.dx, cy = 13 + o.dy, S = P.stone;
  const ring = (front: boolean): void => {
    for (let s = 0; s < 12; s++) {
      const a = o.rot + (s * TAU) / 12, sn = Math.sin(a); if (sn > 0 !== front) continue;
      const x = R(cx + Math.cos(a) * 12.2 - 0.5), y = R(cy + 1 + sn * 4.2 + Math.cos(a) * 1.5);
      const c = o.dead ? S[2] : o.hot ? WHITE : P.gold[front ? 4 : 2];
      p.set(x, y, c); if (s % 3 === 0) { p.set(x, y - 1, c); p.set(x + (s % 2 ? 1 : -1), y + 1, o.dead ? S[1] : P.gold[front ? 3 : 1]); } else if (s % 3 === 1) p.set(x, y + 1, o.dead ? S[1] : P.gold[front ? 3 : 1]);
    }
  };
  if (!o.dead) glow(p, cx, cy, 9 + o.hot * 3, o.hot ? P.gold[3] : P.blue[3], 40 + o.hot * 50);
  ring(false);
  // schwebende Bruchstücke darunter
  p.layer((l) => { for (const [dx, dy, w] of [[-3, 9, 3], [1, 11, 2], [4, 8, 2]] as const) { const y = R(cy + dy + Math.sin(o.t * 1.4 + dx) * 1.2); l.rect(R(cx + dx), y, w, 2, S[2]); l.set(R(cx + dx), y, S[3]); } });
  p.layer((l) => {
    const r = 6.4;
    l.ball(cx, cy, r, r, o.dead ? S : P.bone, 2, 4);
    if (!o.dead && o.open > 0) {
      // Iris mit Runenkranz und Schlitzpupille
      const ix = cx + 1.5 + o.look[0], iy = cy + o.look[1], I = o.hot ? P.fire : P.blue;
      l.ball(ix, iy, 3.5, 3.5, I, 1, 4);
      for (let s = 0; s < 6; s++) { const a = (s * TAU) / 6 + o.rot * 0.5; l.set(R(ix + Math.cos(a) * 2.7 - 0.5), R(iy + Math.sin(a) * 2.7 - 0.5), o.hot ? WHITE : P.gold[4]); }
      l.ell(ix + 0.2, iy, o.hot ? 0.7 : 1.1, o.hot ? 2.4 : 1.9, INK); l.set(R(ix - 1.5), R(iy - 1.5), WHITE);
      l.px([cx - 5, cy + 1, cx - 4, cy + 2, cx - 4, cy - 2], P.red[3]);
    }
    // Lider aus Stein
    for (let y = R(cy - r - 1); y <= cy + r + 1; y++) for (let x = R(cx - r - 1); x <= cx + r + 1; x++) {
      if (!(l.get(x, y) >>> 24)) continue;
      const dy = y + 0.5 - cy, top = dy < -o.open + Math.abs(x + 0.5 - cx) * 0.12, bot = dy > o.open * 0.8 + 0.6 - Math.abs(x + 0.5 - cx) * 0.1;
      if (top) l.set(x, y, dy < -o.open - 1.2 ? (x < cx - 1 ? S[4] : S[3]) : S[1]); else if (bot) l.set(x, y, dy > o.open * 0.8 + 1.8 ? (x > cx + 2 ? S[1] : S[2]) : S[4]);
    }
    l.line(R(cx - 2), R(cy - r + 1), R(cx - 1), R(cy - r + 3), S[1]); l.px([cx + 2, cy - r + 1, cx + 3, cy - r + 1, cx + 2, cy - r + 2], o.dead ? S[1] : P.gold[3]); l.set(R(cx - 4), R(cy + r - 2), S[1]);
    l.px([cx - 5, cy - 5, cx - 4, cy - 6], P.green[3]);
  });
  ring(true);
}
const arkanauge: MobFn = (p, fr) => {
  const i = fr.i, z = floatState(fr);
  const o: AE = { dx: z.dx * 0.7, dy: z.dy, open: 4, hot: 0, rot: 0, look: [0, 0], dead: false, t: i };
  switch (fr.a) {
    case 'idle': o.rot = (i * TAU) / 48; o.open = [4, 4, 1.2, 4][i]; o.look = [[0, 0], [1, 0], [1, 0], [-1, 1]][i] as unknown as Pt; break;
    case 'move': o.rot = (i * TAU) / 72; o.look = [1, 0]; break;
    case 'windup': o.rot = 0.3 + i * 0.4; o.open = [5, 5.6][i]; o.hot = [0.6, 1][i]; o.look = [1, 0]; break;
    case 'attack': o.rot = 1.2 + i * 0.5; o.open = [5.6, 5, 4][i]; o.hot = [1, 1, 0][i]; o.look = [1.5, 0]; break;
    case 'hit': o.open = 0; o.rot = 0.4; break;
    case 'death': o.open = i === 0 ? 2 : 0; o.dead = i > 0; o.rot = 0.5; break;
  }
  if (fr.a === 'death' && i >= 1) { const b = new Px(32, 32); eyeDraw(b, o); deathFx(p, b, i, 'shatter', 27, 19, { cell: 4, heap: 3, cx: 15, pop: 2 }); if (i < 3) dots(p, [9, 10 + i * 3, 23, 8 + i * 4, 16, 5 + i * 2], alpha(P.gold[4], 220 - i * 60)); return; }
  eyeDraw(p, o);
  const cx = 16 + o.dx, cy = 13 + o.dy;
  if (fr.a === 'windup') for (let s = 0; s < 5; s++) p.set(R(cx + 2 + Math.cos(s * 1.26 + i) * (11 - i * 5)), R(cy + Math.sin(s * 1.26 + i) * (9 - i * 4)), WHITE);
  if (fr.a === 'attack' && i < 2) { for (let x = R(cx + 6); x < 31; x++) { p.set(x, R(cy), i ? P.gold[4] : WHITE); if (!i) { p.blend(x, R(cy) - 1, alpha(P.gold[4], 200)); p.blend(x, R(cy) + 1, alpha(P.gold[3], 200)); } } spark(p, cx + 6, cy, WHITE, P.gold[4], 2 - i); }
  if (fr.a === 'move') dots(p, [cx - 11 - (i % 3), cy + 7, cx - 13, cy + 3 + (i & 1)], P.gold[3]);
  if (fr.a === 'hit' && i === 0) dots(p, [cx + 8, cy - 7, cx + 10, cy - 3, cx - 9, cy - 6], P.gold[4]);
};

export const RUINEN: Record<string, MobDef> = {
  runenwaechter: { w: 48, h: 48, fn: runenwaechter },
  skelettkrieger: { w: 48, h: 40, fn: skelettkrieger },
  fluchgeist: { w: 32, h: 32, fn: fluchgeist },
  arkanauge: { w: 32, h: 32, fn: arkanauge },
};
