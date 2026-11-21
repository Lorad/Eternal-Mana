/** Gegner des Grünwalds: Moosling, Dornkäfer, Pilzling, Waldwolf, Wurzelschleicher. */
import { Px, bez, tube } from '../draw';
import type { Pt } from '../draw';
import { P, INK, INK2, WHITE, alpha, hash2 } from '../palette';
import type { Ramp } from '../palette';
import { R, TAU, debris, dissolve, dots, form, glow, pk, puddle, puff, reramp, sel, shatter, spark, xf } from './kit';
import type { Fr, MobDef, MobFn } from './kit';
import { slimeBody, slimeGeo, slimeState } from './slime';
import type { Mood, Profile } from './slime';
import { quad, quadPose } from './quad';
import type { QLook } from './quad';

// ================================================================ Moosling
const dome: Profile = (v) => Math.sqrt(Math.max(0, 1 - Math.pow(v, 2.3))) * (0.84 + 0.16 * Math.min(1, v / 0.16));
function sprout(l: Px, x: number, y: number, lag: number, droop = 0): void {
  const tx = x + lag * 0.8, ty = y - 4 + droop;
  l.line(x, y, R(x + lag * 0.3), y - 2, P.green[2]); l.line(R(x + lag * 0.3), y - 2, R(tx), R(ty), P.green[2]);
  l.ell(tx - 2.4, ty - 0.2 + droop * 0.5, 2.5, 1.5, P.green[3]); l.set(R(tx - 3), R(ty - 1 + droop * 0.5), P.green[4]); l.set(R(tx - 2), R(ty - 1 + droop * 0.5), P.green[4]);
  l.ell(tx + 2.2, ty - 1.3 + droop, 2, 1.3, P.green[4]); l.set(R(tx + 1), R(ty - 0.5 + droop), P.green[2]); l.set(R(tx + 3), R(ty - 2 + droop), WHITE);
}
function tinyShroom(l: Px, x: number, y: number, lag: number): void {
  x = R(x); y = R(y);
  l.rect(x, y - 2, 1, 2, P.cream[3]);
  const cx = x + R(lag * 0.4);
  l.rect(cx - 1, y - 4, 3, 2, P.red[2]); l.set(cx - 1, y - 4, P.red[3]); l.set(cx, y - 4, WHITE); l.set(cx + 1, y - 3, P.red[1]);
}
function mooslingFace(l: Px, ex: number, ey: number, mood: Mood): void {
  const D = P.forest[0], ex2 = ex + 5;
  if (mood === 'blink') { l.rect(ex, ey + 1, 3, 1, D); l.rect(ex2, ey + 1, 2, 1, D); }
  else if (mood === 'shut') { l.px([ex, ey, ex + 1, ey + 1, ex, ey + 2, ex + 2, ey + 1, ex2 + 1, ey, ex2, ey + 1, ex2 + 1, ey + 2], D); }
  else if (mood === 'dead') { l.px([ex, ey, ex + 2, ey, ex + 1, ey + 1, ex, ey + 2, ex + 2, ey + 2, ex2, ey, ex2 + 2, ey, ex2 + 1, ey + 1, ex2, ey + 2, ex2 + 2, ey + 2], D); }
  else {
    l.rect(ex, ey, 3, 3, D); l.set(ex, ey, WHITE); l.set(ex + 2, ey + 2, P.green[1]);
    l.rect(ex2, ey, 2, 3, D); l.set(ex2, ey, WHITE);
    if (mood === 'angry' || mood === 'open') { l.px([ex - 1, ey - 2, ex, ey - 1, ex + 1, ey - 1, ex + 2, ey, ex2, ey, ex2 + 1, ey - 1, ex2 + 2, ey - 2], P.forest[1]); l.set(ex, ey, D); l.set(ex + 1, ey, WHITE); l.set(ex2, ey, D); l.set(ex2, ey + 1, WHITE); }
  }
  const mx = ex + 3, my = ey + 4;
  if (mood === 'open') { l.rect(mx - 1, my - 1, 4, 3, P.forest[0]); l.rect(mx, my + 1, 2, 1, P.red[2]); l.set(mx - 1, my - 1, WHITE); l.set(mx + 2, my - 1, WHITE); }
  else if (mood === 'angry') l.rect(mx - 1, my, 3, 1, P.green[1]);
  else if (mood === 'shut' || mood === 'dead') l.px([mx - 1, my, mx, my - 1, mx + 1, my, mx + 2, my - 1], P.green[1]);
  else l.px([mx - 1, my - 1, mx, my, mx + 1, my, mx + 2, my - 1], P.green[1]);
}
const moosling: MobFn = (p, fr) => {
  if (fr.a === 'death' && fr.i >= 1) {
    const i = fr.i, cx = 15, gy = 27;
    p.layer((l) => {
      if (i === 1) {
        puddle(l, cx, gy, 11, 2.6, P.green, 1); l.ell(cx, gy - 3.2, 6.5, 2.8, P.green[3]); l.ell(cx - 1, gy - 4, 4, 1.4, P.forest[3]); l.rect(cx - 3, gy - 6, 4, 1, P.forest[4]);
        mooslingFace(l, cx, gy - 4, 'dead'); sprout(l, cx - 2, gy - 5, -4, 3); tinyShroom(l, cx - 8, gy - 1, -2);
      } else if (i === 2) {
        puddle(l, cx, gy, 12.5, 2.8, P.green, 1); l.ell(cx - 2, gy - 2.4, 4, 1.2, P.forest[3]); l.px([cx + 3, gy - 2, cx + 6, gy - 1, cx - 7, gy - 2], P.forest[3]); l.px([cx + 1, gy - 3, cx + 2, gy - 3], WHITE);
        l.ell(cx - 5, gy - 3.4, 2.4, 1.2, P.green[4]); l.set(cx - 3, gy - 3, P.green[2]); l.rect(cx + 6, gy - 3, 3, 2, P.red[2]); l.set(cx + 6, gy - 3, WHITE); l.set(cx + 9, gy - 2, P.cream[3]);
      } else if (i === 3) {
        puddle(l, cx, gy, 9, 2, P.green, 0); l.px([cx - 2, gy - 2, cx + 3, gy - 1], P.green[3]); l.ell(cx - 4, gy - 2.6, 2.2, 1, P.green[3]); l.set(cx + 5, gy - 2, P.red[2]);
      } else { l.px([cx - 5, gy, cx - 4, gy, cx - 1, gy, cx, gy - 1, cx + 3, gy, cx + 4, gy], P.green[2]); l.ell(cx - 4, gy - 1.4, 2, 0.9, P.green[3]); }
    });
    if (i === 1) dots(p, [cx - 12, gy - 6, cx + 11, gy - 7, cx - 9, gy - 10, cx + 8, gy - 11, cx + 13, gy - 3, cx - 14, gy - 2], P.green[4]);
    if (i === 3) dots(p, [cx - 1, gy - 6, cx + 4, gy - 8], alpha(P.green[4], 170));
    if (i === 4) p.alphaMul(0.5);
    return;
  }
  const st = slimeState(fr), g = slimeGeo(32, 32, 8.6, 13, st, dome);
  p.layer((l) => {
    slimeBody(l, g, P.green, 1, 4, dome, 0.16);
    // Moospolster: oberes Drittel mit ausgefranstem Rand
    reramp(l, P.green, P.forest, (x, y) => (g.gy - y + 0.5) / g.H > 0.6 + (hash2(R(x - g.cx), 3, 11) % 4) * 0.045 - 0.06 * Math.abs((x - g.cx) / g.rx));
    for (const [u, c] of [[-0.8, 3], [-0.45, 4], [0.05, 3], [0.5, 3], [0.85, 2]] as const) { const q = g.at(u * 0.92, 0.94 - Math.abs(u) * 0.2); l.ell(q[0], q[1] - 0.3, 1.5, 1.3, P.forest[c]); }
    for (const [u, v, c] of [[-0.3, 0.8, 4], [0.25, 0.86, 4], [0.55, 0.72, 2], [-0.6, 0.7, 4], [0.1, 0.7, 2]] as const) { const q = g.at(u, v); l.set(R(q[0]), R(q[1]), P.forest[c]); }
    const fl = g.at(0.62, 0.83); l.set(R(fl[0]), R(fl[1]) - 1, P.gold[4]); l.set(R(fl[0]) + 1, R(fl[1]), P.gold[3]);
    // Glanz
    const hl = g.at(-0.62, 0.42); l.rect(R(hl[0]), R(hl[1]), 2, 1, WHITE); l.set(R(hl[0]) - 1, R(hl[1]) + 1, WHITE); l.set(R(hl[0]) - 1, R(hl[1]) + 3, P.green[4]);
    const e = g.at(0, 0.36); mooslingFace(l, R(e[0] + 0.5), R(e[1]) - 2, st.mood);
    const top = g.at(-0.12, 0.97); sprout(l, R(top[0]), R(top[1]), st.lag, fr.a === 'hit' ? 1 : 0);
    const sh = g.at(-0.74, 0.62); tinyShroom(l, sh[0], sh[1], st.lag);
  });
  if (fr.a === 'windup' && fr.i === 1) dots(p, [g.cx - 12, g.gy - 9, g.cx + 9, g.gy - 15, g.cx - 10, g.gy - 2], P.green[4]);
  if (fr.a === 'attack' && fr.i === 1) dots(p, [g.cx - 11, g.gy, g.cx + 11, g.gy - 1, g.cx - 13, g.gy - 3, g.cx + 12, g.gy - 4], P.green[4]);
  if (fr.a === 'move' && fr.i === 5) dots(p, [g.cx - 12, g.gy - 1, g.cx + 12, g.gy - 1], P.green[4]);
};

// ================================================================ Dornkäfer
interface KP { bx: number; by: number; rot: number; open: number; ant: number; eye: boolean; ph: number; walk: number; splay: number }
const KAEFER: Ramp = [P.forest[0], P.forest[1], P.forest[2], P.forest[3], P.forest[4]];
function kaeferBody(b: Px, o: KP, thorns = true): void {
  if (thorns) for (const [x, y, h] of [[6.5, 14.8, 2.2], [11, 13, 2.8], [15.5, 14.4, 2.2]] as const) {
    b.poly([[x - 1.6, y + 1.5], [x - 1.4, y - h], [x + 1.8, y + 1.5]], P.green[3]); b.set(R(x - 1.4), R(y - h), P.green[4]); b.set(R(x - 1), R(y - h + 1), P.green[4]); b.set(R(x + 0.6), R(y), P.forest[2]);
  }
  form(b, (m) => { m.ell(11, 19.2, 8, 7, 1); m.rect(0, 24, 32, 8, 0); }, KAEFER, 1, 4, 0.26);
  // Flügeldecken-Rillen, Glanz, Moosfleck
  for (const pt of bez([8.5, 23], [10.5, 17.5], [18.4, 18.5], 10)) b.set(R(pt[0]), R(pt[1]), P.forest[1]);
  b.px([5, 18, 5, 17, 6, 16, 7, 15, 8, 15, 9, 14], WHITE); b.px([6, 17, 7, 16, 6, 18], P.green[4]); b.px([13, 16, 14, 16, 15, 17], P.green[4]); b.px([12, 21, 15, 22], P.forest[1]);
  b.rect(4, 23, 15, 1, P.forest[0]);
  // Halsschild + Kopf
  form(b, (m) => { m.ell(19.6, 20.6, 3.5, 4.1, 1); m.rect(0, 24, 32, 8, 0); }, P.wood, 1, 3, 0.04);
  b.line(17, 17, 16, 23, P.wood[0]); b.px([19, 17, 20, 17], P.tan[3]); b.set(18, 18, P.wood[4]);
  b.ball(23, 21.9, 2.4, 2.2, P.wood, 0, 2);
  if (o.eye) { b.set(23, 21, P.gold[4]); b.set(24, 21, INK); b.set(23, 22, P.gold[2]); } else b.rect(22, 21, 3, 1, INK);
  // Fühler
  b.line(21, 19, R(19.5 + o.ant), 16, P.wood[1]); b.set(R(19 + o.ant * 1.5), 15, P.tan[3]);
  // Geweihzangen: oben hakenförmig mit Sprosse, unten kurz
  const up = tube(b, bez([24.4, 20.8], [28.6, 21.4 - o.open * 0.4], [27.6, 16.4 - o.open], 9), 1.05, 0.6, P.tan, 2);
  const t0 = up[up.length - 1]; b.set(R(t0[0] - 0.5), R(t0[1] - 0.5), P.wood[1]);
  const m0 = up[Math.floor(up.length * 0.55)]; b.line(R(m0[0] - 1), R(m0[1] - 1), R(m0[0] - 2), R(m0[1] - 2.4), P.tan[3]);
  tube(b, bez([24.4, 22.8], [27.4, 24 + o.open * 0.3], [28.4, 22.4 + o.open * 0.7], 6), 0.9, 0.5, P.tan, 2);
}
function kaeferLegs(l: Px, o: KP, far: boolean): void {
  const at: Pt[] = [[7.5, 23], [12, 23], [16.5, 23]], rest = [5, 11.5, 18.5];
  at.forEach((a, i) => {
    const th = o.ph + (i % 2 ? Math.PI : 0) + (far ? Math.PI : 0);
    const fx = rest[i] + (far ? 2.5 : 0) + o.bx * 0.6 + o.walk * 2.2 * Math.cos(th) + o.splay * (i - 1) * 1.6, fy = 27 - o.walk * 2 * Math.max(0, -Math.sin(th));
    if (far) { l.rect(R(fx), R(fy) - 1, 1, 2, P.wood[0]); return; }
    const ax = a[0] + o.bx, ay = a[1] + o.by;
    const kx = (ax + fx) / 2 + (i - 1) * 1.4, ky = ay + 0.5 + o.splay;
    l.line(R(ax), R(ay), R(kx), R(ky), P.wood[1], 2); l.line(R(kx), R(ky + 1), R(fx), R(fy), P.wood[1]); l.set(R(fx) + 1, R(fy), P.wood[1]);
    l.set(R(kx), R(ky), P.wood[3]);
  });
}
function kaeferDraw(p: Px, o: KP): void {
  p.layer((l) => kaeferLegs(l, o, true));
  let b = new Px(32, 32); kaeferBody(b, o);
  if (o.rot || o.bx || o.by) b = xf(b, { rot: o.rot, ax: 12, ay: 24, dx: o.bx, dy: o.by });
  p.draw(b.outline());
  p.layer((l) => kaeferLegs(l, o, false));
}
function kaeferBack(p: Px, kick: number, sink: number): Px {
  const b = new Px(32, 32);
  const o: KP = { bx: 0, by: 0, rot: 0, open: 1, ant: 0, eye: false, ph: 0, walk: 0, splay: 0 };
  kaeferBody(b, o, false);
  const f = xf(b, { sy: -1, ax: 14, ay: 18, dy: 2 + sink });
  // Bauchplatten
  f.rect(4, 14 + sink, 15, 1, P.tan[3]); f.rect(5, 15 + sink, 13, 1, P.tan[2]); for (const x of [7, 10, 13, 16]) f.line(x, 14 + sink, x, 16 + sink, P.wood[1]);
  for (let i = 0; i < 6; i++) {
    const x = 6 + i * 2.4, k = Math.sin(kick * 2.2 + i * 1.9), h = kick < 0 ? 2 : 4 + k * 1.2;
    f.line(R(x), 14 + sink, R(x + k * 1.5), R(14 + sink - h), P.wood[1]); if (kick < 0) f.set(R(x + (i < 3 ? 1 : -1)), R(13 + sink - h), P.wood[1]); else f.set(R(x + k * 1.5 + (k > 0 ? 1 : -1)), R(13 + sink - h), P.wood[1]);
  }
  void p;
  return f;
}
const dornkaefer: MobFn = (p, fr) => {
  const i = fr.i;
  if (fr.a === 'death' && i >= 1) {
    if (i === 1) { p.draw(kaeferBack(p, 1, 0).outline()); dots(p, [3, 26, 28, 25, 1, 23], P.tan[3]); }
    else if (i === 2) p.draw(kaeferBack(p, -1, 1).outline());
    else {
      const s = shatter(kaeferBack(p, -1, 1), i === 3 ? 0.75 : 1, 27, 9, { cell: 4, heap: 2, cx: 14 });
      if (i === 4) { dissolve(s, 0.62, 4); s.outline(); s.alphaMul(0.55); } else s.outline();
      p.draw(s); if (i === 3) dots(p, [6, 20, 21, 19, 13, 17], alpha(P.tan[3], 180));
    }
    return;
  }
  const o: KP = { bx: 0, by: 0, rot: 0, open: 0, ant: 0, eye: true, ph: 0, walk: 0, splay: 0 };
  switch (fr.a) {
    case 'idle': o.ant = [0, 1, 0, -1][i]; o.open = [0, 0, 1.2, 0.4][i]; o.by = [0, 0, 1, 1][i]; break;
    case 'move': o.ph = fr.ph; o.walk = 1; o.by = [0, 1, 0, 0, 1, 0][i]; o.ant = [1, 0, -1, 0, 1, 0][i]; o.open = 0.5; break;
    case 'windup': o.bx = [-2, -3][i]; o.rot = [0.14, 0.24][i]; o.open = [2, 3][i]; o.ant = -1; o.ph = i ? 1 : 4; o.walk = 0.6; break;
    case 'attack': o.bx = [1, 2, 1][i]; o.rot = [0.06, -0.16, 0][i]; o.open = [3, 0, 0.6][i]; o.ant = [-2, 1, 0][i]; o.splay = [0.6, 0.3, 0][i]; break;
    case 'hit': o.bx = [-2, -1][i]; o.rot = [-0.22, -0.08][i]; o.eye = false; o.splay = [1, 0.4][i]; o.open = 1; o.ant = 2; break;
    case 'death': o.bx = 0; o.by = -2; o.rot = -0.6; o.eye = false; o.open = 2; o.splay = 1; break;
  }
  kaeferDraw(p, o);
  if (fr.a === 'windup') { dots(p, i ? [2, 26, 4, 24, 1, 22] : [3, 26, 5, 25], P.tan[3]); if (i) spark(p, 26, 12, WHITE, P.gold[4]); }
  if (fr.a === 'attack' && i === 0) dots(p, [1, 18, 2, 18, 3, 18, 0, 22, 1, 22, 2, 14, 3, 14], alpha(WHITE, 150));
  if (fr.a === 'attack' && i === 1) { spark(p, 29, 18, WHITE, P.gold[4]); dots(p, [27, 13, 30, 22], P.gold[4]); }
};

// ================================================================ Pilzling
type PMood = 'n' | 'blink' | 'squint' | 'spit' | 'shut' | 'dead';
interface PZ { dx: number; lift: number; sh: number; cdy: number; crx: number; cry: number; tilt: number; mood: PMood; arms: number; fat: number; tuck: number }
const SPOTS: ReadonlyArray<readonly [number, number, number, number]> = [[-0.5, -0.38, 2.3, 1.7], [0.14, -0.66, 1.9, 1.3], [0.56, -0.12, 1.7, 1.5], [-0.1, 0, 1.3, 1], [-0.8, 0.1, 1, 0.9], [0.86, 0.22, 0.8, 0.8]];
function pilzDraw(p: Px, o: PZ): void {
  const cx = 16 + o.dx, G = 27, sb = 25 - o.lift, st = sb - o.sh + 1, fy = st + 4;
  p.layer((l) => {
    // Füße
    const fyy = G - 0.6 - o.lift + (o.lift > 1 ? 1 - o.tuck : 0); if (o.sh > 3) {
    l.ell(cx - 2.8, fyy, 2, 1.3, P.tan[2]); l.ell(cx + 3, fyy, 2.1, 1.3, P.tan[3]); l.set(R(cx + 4), R(fyy - 0.8), P.tan[4]); }
    // Stiel
    form(l, (m) => { m.ell(cx, sb - o.sh * 0.36, 4.9 + o.fat, o.sh * 0.62, 1); m.rect(R(cx - 3.5), st, 7, R(o.sh * 0.6), 1); }, P.cream, 2, 4, 0.16);
    l.rect(R(cx - 3.5), st, 7, 2, P.cream[1]); l.rect(R(cx - 3.5), st + 2, 7, 1, P.cream[2]);
    for (let x = R(cx - 3); x <= cx + 3; x += 2) l.set(x, st + 1, P.cream[0]);
    if (o.sh < 7) return;
    // Gesicht
    const ex = R(cx), ex2 = ex + 4, D = INK2;
    if (o.mood === 'blink' || o.mood === 'squint') { l.rect(ex, fy + 1, 2, 1, D); l.rect(ex2, fy + 1, 2, 1, D); }
    else if (o.mood === 'shut') { l.px([ex, fy, ex + 1, fy + 1, ex, fy + 2, ex2 + 1, fy, ex2, fy + 1, ex2 + 1, fy + 2], D); }
    else if (o.mood === 'dead') { l.px([ex, fy, ex + 2, fy, ex + 1, fy + 1, ex, fy + 2, ex + 2, fy + 2, ex2, fy, ex2 + 2, fy, ex2 + 1, fy + 1, ex2, fy + 2, ex2 + 2, fy + 2], D); }
    else { l.rect(ex, fy, 2, 2, D); l.set(ex, fy, WHITE); l.rect(ex2, fy, 2, 2, D); l.set(ex2, fy, WHITE); }
    if (o.mood !== 'dead') { l.px([ex - 1, fy - 2, ex, fy - 2, ex + 1, fy - 1, ex + 2, fy - 1, ex2 - 1, fy - 1, ex2, fy - 1, ex2 + 1, fy - 2, ex2 + 2, fy - 2], P.wood[1]); }
    const mx = ex + 2, my = fy + 4;
    if (o.mood === 'spit') { l.rect(mx - 1, my - 1, 3, 3, D); l.set(mx, my, P.red[1]); }
    else if (o.mood === 'squint') { l.rect(mx, my - 1, 2, 2, D); l.set(mx - 1, my, P.red[3]); l.set(mx + 2, my, P.red[3]); }
    else l.px([mx - 1, my + 1, mx, my, mx + 1, my, mx + 2, my + 1], D);
    l.set(ex - 2, fy + 2, P.red[4]); l.set(ex2 + 2, fy + 2, P.red[4]);
    // Ärmchen
    l.ell(cx - 5 - o.fat, fy + 3.5 - o.arms, 1.2, 1.4, P.cream[3]); l.ell(cx + 5.2 + o.fat, fy + 3.5 - o.arms, 1.2, 1.4, P.cream[2]);
  });
  // Hut
  const cb = st + 1 + o.cdy, cy = cb - 2, ccx = cx - 0.5;
  let c = new Px(32, 32);
  c.ball(ccx, cy, o.crx, o.cry, P.red, 1, 4);
  c.rect(0, R(cy + 2.5), 32, 32, 0);
  const by = R(cy + 2.5) - 1;
  for (let x = 0; x < 32; x++) if (c.get(x, by) >>> 24) c.set(x, by, x < ccx - o.crx * 0.3 ? P.red[1] : P.red[0]);
  for (const [u, v, rx, ry] of SPOTS) { const x = ccx + u * o.crx, y = cy + v * o.cry; if (y + ry > by) continue; c.ell(x, y, rx, ry, WHITE); c.set(R(x + rx * 0.4), R(y + ry * 0.5), P.cream[2]); }
  c.rect(R(ccx - o.crx * 0.74), by - 1, 2, 2, 0); c.set(R(ccx - o.crx * 0.74) + 2, by, 0);
  // Blättchen auf dem Hut
  const lx = R(ccx + o.crx * 0.34), ly = R(cy - o.cry * 0.9);
  c.px([lx, ly, lx + 1, ly - 1, lx + 2, ly - 1], P.green[3]); c.set(lx + 2, ly - 2, P.green[4]); c.set(lx + 3, ly - 1, P.green[4]);
  if (o.tilt) c = xf(c, { shx: o.tilt * 0.14, ax: ccx, ay: by });
  p.draw(c.outline());
}
function spores(p: Px, pts: ReadonlyArray<number>, a = 255): void {
  for (let i = 0; i + 1 < pts.length; i += 2) p.blend(R(pts[i]), R(pts[i + 1]), alpha(i % 6 === 0 ? WHITE : i % 4 === 0 ? P.gold[4] : P.green[4], a));
}
const pilzling: MobFn = (p, fr) => {
  const i = fr.i;
  const o: PZ = { dx: 0, lift: 0, sh: 10, cdy: 0, crx: 9.4, cry: 6.8, tilt: 0, mood: 'n', arms: 0, fat: 0, tuck: 0 };
  switch (fr.a) {
    case 'idle': o.cdy = [0, 0, 1, 1][i]; o.sh = [10, 10, 9, 9][i]; if (i === 3) o.mood = 'blink'; break;
    case 'move':
      o.sh = [8, 11, 10, 10, 10, 8][i]; o.lift = [0, 1, 3, 4, 2, 0][i]; o.cdy = [1, 1, -1, -2, -2, 2][i]; o.crx = [10.2, 8.8, 9, 9.4, 9.2, 10.6][i]; o.cry = [6.2, 7.2, 7.2, 6.8, 7, 5.8][i];
      o.tilt = [0, -2, -1, 0, 1, 0][i]; o.tuck = [0, 0, 1, 1, 0, 0][i]; o.arms = [0, 1, 2, 2, 1, -1][i]; break;
    case 'windup': o.dx = [-1, -1][i]; o.crx = [10.4, 11.4][i]; o.cry = [7.8, 8.8][i]; o.cdy = [-1, -1][i]; o.tilt = [-2, -3][i]; o.fat = [0.6, 1.2][i]; o.mood = 'squint'; o.arms = [2, 3][i]; break;
    case 'attack': o.dx = [3, 2, 1][i]; o.cry = [5.2, 6, 6.6][i]; o.crx = [10, 9.8, 9.4][i]; o.tilt = [5, 3, 1][i]; o.cdy = [1, 1, 0][i]; o.mood = i < 2 ? 'spit' : 'n'; o.arms = [-1, 0, 0][i]; o.sh = [9, 10, 10][i]; break;
    case 'hit': o.dx = [-2, -1][i]; o.tilt = [-5, -2][i]; o.cdy = [-2, 0][i]; o.sh = [8, 9][i]; o.mood = 'shut'; o.arms = [3, 1][i]; o.fat = 0.5; break;
    case 'death':
      o.mood = 'dead'; o.dx = -1;
      o.sh = [9, 7, 4, 3, 3][i]; o.cry = [6.8, 5, 3.6, 2.6, 2.2][i]; o.crx = [9.6, 10.4, 11, 10.6, 9.6][i]; o.cdy = [-1, 1, 1, 1, 1][i]; o.tilt = [-4, -2, 0, 0, 0][i]; o.arms = [3, -1, -2, -2, -2][i]; break;
  }
  if (fr.a === 'death' && i >= 3) {
    const b = new Px(32, 32); pilzDraw(b, o);
    if (i === 4) { dissolve(b, 0.6, 3); b.alphaMul(0.5); }
    p.draw(b);
  } else pilzDraw(p, o);
  if (fr.a === 'idle') spores(p, [[25, 9], [26, 7], [27, 6], [26, 4]][i], 200);
  if (fr.a === 'windup') spores(p, i ? [3, 6, 27, 4, 1, 14, 29, 12, 9, 1, 22, 0, 5, 20] : [1, 4, 29, 2, 0, 16, 30, 15, 12, 0], 255);
  if (fr.a === 'attack' && i < 2) { puff(p, 26 + i * 2, 17 - i, 3.5 + i, 3 + i, P.green[4], 110 - i * 30); spores(p, i ? [24, 12, 28, 14, 30, 19, 27, 21, 23, 17, 30, 11, 29, 16] : [24, 15, 27, 13, 28, 18, 25, 20, 29, 16, 26, 16]); }
  if (fr.a === 'attack' && i === 2) spores(p, [28, 10, 30, 17, 26, 22], 170);
  if (fr.a === 'death') spores(p, [[8, 8, 22, 6], [6, 10, 12, 5, 20, 7, 25, 11, 16, 3], [4, 12, 10, 8, 15, 6, 21, 9, 26, 13, 18, 12, 8, 15], [6, 9, 12, 5, 17, 8, 22, 6, 27, 11, 14, 13, 9, 14, 20, 14], [8, 6, 15, 4, 21, 8, 12, 10, 25, 5]][i], [255, 255, 255, 200, 110][i]);
};

// ================================================================ Waldwolf
const WOLF: Ramp = [P.stone[0], P.stone[2], P.stone[3], P.stone[4], P.cream[4]];
const WOLF_FAR: Ramp = [P.stone[0], P.stone[1], P.stone[1], P.stone[2], P.stone[2]];
const WOLF_UNDER: Ramp = [P.cream[0], P.cream[1], P.cream[2], P.cream[3], P.cream[4]];
export function wolfHead(l: Px, x: number, y: number, jaw: number, ear: number, eye: string, r: Ramp, eyeC: number, muzzle: Ramp): void {
  x = R(x); y = R(y);
  // fernes Ohr, Schädel, Backenfell
  l.poly([[x - 0.5, y - 3], [x + 2.5 - ear * 2.5, y - 7.5 + ear * 2], [x + 3, y - 2.5]], r[1]);
  l.ball(x, y, 4, 3.6, r, 1, 4);
  l.poly([[x - 4, y], [x - 6.5, y + 3.5], [x - 3.5, y + 3], [x - 3.5, y + 6], [x, y + 3.5]], r[2]); l.set(x - 5, y + 3, r[3]); l.set(x - 3, y + 5, r[1]); l.set(x - 2, y + 4, r[1]);
  // Schnauze
  l.poly([[x + 2, y - 1.5], [x + 8, y], [x + 8, y + 2.5], [x + 2, y + 3.2]], r[3]); l.rect(x + 3, y - 1, 4, 1, r[4]); l.rect(x + 3, y + 2, 5, 1, muzzle[3]);
  l.rect(x + 7, y, 2, 2, INK); l.set(x + 7, y, P.stone[2]);
  // Unterkiefer
  if (jaw > 0) {
    const j = Math.min(4, jaw);
    l.poly([[x + 2, y + 3], [x + 6.5, y + 3 + j], [x + 6, y + 4.5 + j], [x + 1.5, y + 4.5]], muzzle[2]);
    l.poly([[x + 2.5, y + 3], [x + 6.5, y + 3], [x + 6, y + 3 + j * 0.8]], P.red[1]);
    l.set(x + 6, y + 3, WHITE); l.set(x + 4, y + 3, WHITE); if (j > 1) { l.set(x + 5, y + 2 + j, WHITE); l.set(x + 3, y + 3, WHITE); }
  } else { l.rect(x + 3, y + 3, 4, 1, r[0]); l.set(x + 6, y + 3, WHITE); }
  // nahes Ohr mit Kerbe
  l.poly([[x - 3.5, y - 2.5], [x - 2 - ear * 3, y - 8.5 + ear * 2.5], [x + 0.5, y - 3.5]], r[2]); l.set(R(x - 2 - ear * 2), R(y - 5 + ear), P.red[4]); l.set(R(x - 2.5 - ear * 3), R(y - 7 + ear * 2.5), r[3]);
  // Auge + Braue
  if (eye === 'shut' || eye === 'blink') l.rect(x + 1, y - 1, 2, 1, r[0]);
  else { l.set(x + 1, y - 1, eyeC); l.set(x + 2, y - 1, INK); l.rect(x, y - 2, 3, 1, r[0]); if (eye === 'angry') { l.set(x + 3, y - 1, r[0]); l.set(x - 1, y - 3, r[0]); } }
}
export function bushyTail(l: Px, x: number, y: number, a: number, r: Ramp, tip: number, len = 9): void {
  const ang = a * 1.15, mx = x - Math.cos(ang) * len * 0.5, my = y - Math.sin(ang) * len * 0.5 + 1, tx = x - Math.cos(ang * 1.25) * len, ty = y - Math.sin(ang * 1.25) * len;
  tube(l, [[x + 1, y + 0.5], [mx, my]], 1.7, 2.5, r, 1); tube(l, [[mx, my], [tx, ty]], 2.5, 1, r, 1);
  l.set(R(tx), R(ty), tip); l.set(R(tx + 0.6), R(ty + (a > 0 ? 0.8 : -0.8)), tip); l.set(R(mx - 1), R(my + 2), r[1]);
}
const WOLF_LOOK: QLook = {
  w: 48, h: 40, coat: WOLF, far: WOLF_FAR, under: WOLF_UNDER,
  hip: [15.5, 21.5], sh: [27, 21], rump: [5, 4.7], chest: [5.4, 5.7], neck: [7, -6.5], neckR: 2.6, tuck: 3,
  legF: [5.7, 6, 1.8, 1.15], legH: [4.8, 4.6, 2, 1.1], hock: [-1.8, -4], paw: 1.8,
  head: (l, x, y, q) => wolfHead(l, x, y, q.jaw, q.ear, q.eye, WOLF, P.gold[3], WOLF_UNDER),
  tail: (l, x, y, q) => bushyTail(l, x, y, q.tail, WOLF, P.cream[4], 8),
  back: (l, k, q) => {
    // struppige Mähne vom Widerrist bis zum Hinterkopf
    const a: Pt = [k.sh[0] - 5, k.sh[1] - 5.4], b: Pt = [k.head[0] - 3.5, k.head[1] - 2.5];
    for (let s = 0; s < 5; s++) {
      const t = s / 4, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, h = 3 + (s % 2) + (q.fr.a === 'windup' ? 1.5 : 0);
      l.poly([[x - 1.5, y + 2], [x - 2.6, y - h + 1], [x + 1.6, y + 1.4]], P.stone[s % 2 ? 2 : 1]); l.set(R(x - 2.2), R(y - h + 1.6), P.stone[3]);
    }
    // Sattelzeichnung und Fellsträhnen
    for (let x = k.hip[0] - 2; x < k.sh[0] - 5; x += 3) { const y = R(k.hip[1] + (k.sh[1] - k.hip[1]) * ((x - k.hip[0]) / 12) - 4.2); l.set(R(x), y, P.stone[1]); l.set(R(x) + 1, y, P.stone[1]); l.set(R(x) + 1, y + 1, P.stone[2]); }
    l.px([k.hip[0] + 3, k.hip[1], k.hip[0] + 6, k.hip[1] + 1, k.sh[0] - 3, k.sh[1] + 1, k.sh[0] - 1, k.sh[1] - 1], P.stone[2]);
    l.px([k.sh[0] + 3, k.sh[1] + 2, k.sh[0] + 4, k.sh[1] + 3, k.sh[0] + 2, k.sh[1] + 4], P.cream[3]);
  },
};
const waldwolf: MobFn = (p, fr) => {
  if (fr.a === 'death' && fr.i >= 3) {
    const b = new Px(48, 40); quad(b, WOLF_LOOK, quadPose({ ...fr, i: 2 }, 'pounce'));
    dissolve(b, fr.i === 3 ? 0.38 : 0.8, 5); b.alphaMul(fr.i === 3 ? 0.8 : 0.45); p.draw(b);
    dots(p, fr.i === 3 ? [12, 22, 25, 20, 33, 24] : [10, 18, 27, 16], alpha(P.cream[3], 150));
    return;
  }
  quad(p, WOLF_LOOK, quadPose(fr, 'pounce'));
  if (fr.a === 'windup' && fr.i === 1) dots(p, [42, 27, 43, 29], alpha(WHITE, 200));
  if (fr.a === 'attack' && fr.i === 1) { spark(p, 45, 20, WHITE, P.cream[3]); dots(p, [43, 15, 46, 24], WHITE); }
  if (fr.a === 'move' && (fr.i === 1 || fr.i === 4)) dots(p, [9, 35, 6, 34], alpha(P.tan[3], 170));
};

// ================================================================ Wurzelschleicher
interface WZ { bx: number; by: number; a1: Pt; a2: Pt; k: number; eye: 'n' | 'blink' | 'flare' | 'off'; ph: number; walk: number; curl: number; sag: number }
const ROOT: Ramp = [P.wood[0], P.wood[1], P.wood[2], P.wood[3], P.tan[3]];
function wurzelDraw(p: Px, o: WZ, dead = false): void {
  const cx = 14 + o.bx, cy = 19.5 + o.by + o.sag, G = 27;
  const W = dead ? P.stone : ROOT;
  /** Bogenwurzel: Schulter → hohes Knie → Spitze. */
  const arm = (l: Px, sh: Pt, tip: Pt, far: boolean, back = false): void => {
    const s = back ? -1 : 1;
    const kn: Pt = [(sh[0] + tip[0]) / 2 + s * (1 - o.curl * 3), Math.min(sh[1], tip[1]) - 7 * o.k + o.curl * 5];
    const pts = tube(l, bez(sh, kn, tip, 12), far ? 1.3 : 1.5, 0.6, W, far ? 0 : 1);
    const m = pts[Math.floor(pts.length * 0.42)];
    if (!back) { l.line(R(m[0]), R(m[1] - 1), R(m[0] - s * 2), R(m[1] - 3), W[far ? 1 : 2]); if (!far && !dead) { l.set(R(m[0] - 3), R(m[1] - 4), P.green[3]); l.set(R(m[0] - 2), R(m[1] - 4), P.green[4]); } }
  };
  const rear = (i: number): Pt => { const th = o.ph + i * 2.6 + 1; return [(i ? 6.5 : 2.5) + o.bx * 0.5 + o.walk * 2 * Math.cos(th) + o.curl * 3, G - o.walk * 2.5 * Math.max(0, -Math.sin(th)) - o.curl * 3]; };
  p.layer((l) => {
    arm(l, [cx - 3, cy - 2], rear(1), true, true);
    arm(l, [cx + 3, cy - 3], [o.a2[0] + o.bx, o.a2[1]], true);
    for (let i = 0; i < 2; i++) { const th = o.ph + i * 2.8 + Math.PI, fx = cx - 1 + i * 5 + o.walk * 2 * Math.cos(th), fy = G - o.walk * 2 * Math.max(0, -Math.sin(th)) - o.curl * 2; tube(l, [[cx - 1 + i * 4, cy + 3], [fx, fy]], 1, 0.5, W, 0); }
  });
  p.layer((l) => {
    // Knäuel aus Wurzelsträngen
    form(l, (m) => { m.ell(cx, cy, 6.2, 5.2 - o.sag * 0.5, 1); m.ell(cx - 3, cy - 2, 4, 3.2, 1); m.ell(cx + 3.6, cy + 1.5, 3.6, 3.4, 1); }, W, 1, 4, 0.12);
    for (const pt of bez([cx - 5, cy + 2], [cx - 2, cy - 4], [cx + 5, cy - 3], 14)) l.set(R(pt[0]), R(pt[1]), W[1]);
    for (const pt of bez([cx - 4, cy + 4], [cx - 1, cy + 0.5], [cx + 1, cy + 5], 8)) l.set(R(pt[0]), R(pt[1]), W[1]);
    for (const pt of bez([cx - 5, cy + 0.5], [cx - 3, cy + 3], [cx - 1, cy + 3.5], 6)) l.set(R(pt[0]), R(pt[1]) - 1, W[4]);
    l.px([cx + 5, cy + 4, cx + 2, cy + 4, cx - 2, cy + 1], W[1]);
    // Moosrücken mit Farn und Pilzchen
    if (!dead) {
      form(l, (m) => { m.ell(cx - 2, cy - 4.2, 5, 2.4, 1); m.ell(cx - 5, cy - 2.2, 2.2, 2, 1); m.ell(cx + 2, cy - 4.6, 2, 1.6, 1); }, P.green, 2, 4, 0.12);
      l.px([cx - 4, cy - 3, cx, cy - 4, cx - 6, cy - 1, cx - 1, cy - 3, cx + 3, cy - 4], P.forest[3]); l.px([cx - 4, cy - 6, cx - 1, cy - 6], P.green[4]);
      const sw = R(Math.sin(o.ph) * 0.6); l.line(cx - 4, cy - 6, cx - 5 + sw, cy - 9, P.green[3]); l.set(cx - 6 + sw, cy - 9, P.green[4]); l.set(cx - 4 + sw, cy - 10, P.green[4]); l.set(cx - 6 + sw, cy - 7, P.green[3]);
      l.rect(cx + 1, cy - 8, 1, 2, P.cream[3]); l.rect(cx, cy - 9, 3, 1, P.red[2]); l.set(cx, cy - 9, P.red[3]); l.set(cx + 1, cy - 10, P.red[2]);
    } else l.px([cx - 4, cy - 5, cx - 2, cy - 6, cx, cy - 5], P.forest[2]);
    // Augenhöhle mit Glutaugen
    l.ell(cx + 3.4, cy + 0.4, 3.6, 2.7, W[0]); l.ell(cx + 3.6, cy + 0.5, 2.9, 2, INK);
    const ex = R(cx + 1), ey = R(cy - 1);
    if (o.eye === 'n') { l.rect(ex, ey, 2, 2, P.gold[3]); l.set(ex, ey, P.gold[4]); l.set(ex + 1, ey + 1, P.fire[2]); l.rect(ex + 3, ey, 2, 2, P.gold[3]); l.set(ex + 3, ey, P.gold[4]); l.set(ex + 4, ey + 1, P.fire[2]); }
    else if (o.eye === 'flare') { l.rect(ex, ey, 2, 2, WHITE); l.set(ex - 1, ey, P.gold[4]); l.set(ex, ey + 2, P.gold[3]); l.rect(ex + 3, ey - 1, 2, 3, WHITE); l.set(ex + 5, ey, P.gold[4]); }
    else if (o.eye === 'blink') { l.rect(ex, ey + 1, 2, 1, P.fire[2]); l.rect(ex + 3, ey + 1, 2, 1, P.fire[2]); }
  });
  p.layer((l) => {
    arm(l, [cx - 4, cy], rear(0), false, true);
    arm(l, [cx + 4, cy - 1], [o.a1[0] + o.bx, o.a1[1]], false);
  });
}
const wurzelschleicher: MobFn = (p, fr) => {
  const i = fr.i;
  const o: WZ = { bx: 0, by: 0, a1: [28, 27], a2: [24, 27], k: 1, eye: 'n', ph: 0, walk: 0, curl: 0, sag: 0 };
  switch (fr.a) {
    case 'idle': o.by = [0, 0, 1, 1][i]; o.k = [1, 1.1, 1, 0.9][i]; if (i === 2) o.eye = 'blink'; o.ph = i * 0.8; break;
    case 'move': {
      o.ph = fr.ph; o.walk = 1; o.by = [0, 1, 0, 0, 1, 0][i];
      const r1 = Math.cos(fr.ph), r2 = Math.cos(fr.ph + Math.PI);
      o.a1 = [26.5 + r1 * 2, 27 - Math.max(0, -Math.sin(fr.ph)) * 4]; o.a2 = [23 + r2 * 2, 27 - Math.max(0, Math.sin(fr.ph)) * 4]; break;
    }
    case 'windup': o.bx = [-1, -2][i]; o.by = [1, 1][i]; o.a1 = pk([[27, 10], [27, 7]], i); o.a2 = pk([[22, 8], [21, 5]], i); o.k = [0.5, 0.3][i]; o.eye = 'flare'; break;
    case 'attack': o.bx = [2, 3, 1][i]; o.by = [0, 1, 0][i]; o.a1 = pk([[26, 20], [26, 27], [27, 27]], i); o.a2 = pk([[25, 15], [23, 26], [23, 27]], i); o.k = [0.9, 1.2, 1][i]; o.eye = i < 2 ? 'flare' : 'n'; break;
    case 'hit': o.bx = [-2, -1][i]; o.a1 = pk([[25, 23], [27, 26]], i); o.a2 = pk([[22, 21], [23, 26]], i); o.k = 0.7; o.eye = 'blink'; o.curl = [0.6, 0.3][i]; break;
    case 'death':
      o.eye = i === 0 ? 'flare' : 'off'; o.curl = [0.3, 1, 0.6, 0.4, 0.4][i]; o.sag = [0, 0, 2, 2, 2][i];
      o.a1 = pk([[25, 17], [22, 17], [26, 27], [26, 27], [26, 27]], i); o.a2 = pk([[21, 14], [19, 15], [22, 27], [22, 27], [22, 27]], i); o.k = [0.8, 1, 0.3, 0.2, 0.2][i]; o.by = [-1, 0, 0, 0, 0][i]; break;
  }
  if (fr.a === 'death' && i >= 2) {
    const b = new Px(32, 32); wurzelDraw(b, o, i >= 3);
    if (i === 2) { p.draw(b); return; }
    const s = shatter(b, i === 3 ? 0.7 : 1, 27, 6, { cell: 4, heap: 2, cx: 15, spread: 0.6 });
    if (i === 4) { dissolve(s, 0.6, 8); s.alphaMul(0.5); }
    p.draw(s); if (i === 3) dots(p, [9, 15, 18, 13, 23, 18], alpha(P.green[4], 190));
    return;
  }
  glow(p, 17 + o.bx, 20 + o.by, o.eye === 'flare' ? 6 : 3.5, P.gold[3], o.eye === 'flare' ? 90 : o.eye === 'off' ? 0 : 60);
  wurzelDraw(p, o);
  if (fr.a === 'attack' && i === 0) for (const pt of bez([25, 6], [31, 10], [29, 19], 9)) p.blend(R(pt[0]), R(pt[1]), alpha(WHITE, 130));
  if (fr.a === 'attack' && i === 1) { debris(p, 28, 27, 0.5, 3, 5, [P.tan[3], P.wood[3]], 3, 5); }
  if (fr.a === 'windup' && i === 1) dots(p, [28, 3, 16, 2], P.gold[4]);
};

export const GRUENWALD: Record<string, MobDef> = {
  moosling: { w: 32, h: 32, fn: moosling },
  dornkaefer: { w: 32, h: 32, fn: dornkaefer },
  pilzling: { w: 32, h: 32, fn: pilzling },
  waldwolf: { w: 48, h: 40, fn: waldwolf },
  wurzelschleicher: { w: 32, h: 32, fn: wurzelschleicher },
};
void TAU; void sel;
