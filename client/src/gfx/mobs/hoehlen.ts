/** Gegner der Kristallhöhlen: Fledermaus, Kristallkrabbler, Glimmerwisp, Tropfschleim. */
import { Px, crystal, tube } from '../draw';
import type { Pt } from '../draw';
import { P, INK, WHITE, alpha } from '../palette';
import { R, deathFx, dissolve, dots, floatState, form, glow, pk, puddle, spark } from './kit';
import type { MobDef, MobFn } from './kit';
import { slimeBody, slimeGeo, slimeState } from './slime';
import type { Profile } from './slime';

// ================================================================ Fledermaus
interface BT { dx: number; dy: number; wing: number; fold: number; mouth: boolean; eye: 'n' | 'angry' | 'shut' }
function batDraw(p: Px, o: BT): void {
  const cx = 16 + o.dx, cy = 13 + o.dy, V = P.violet;
  p.layer((l) => {
    for (const s of [-1, 1]) {
      const sh: Pt = [cx + s * 2.5, cy - 1], wr: Pt = [cx + s * (7.5 - o.fold * 3), cy - 3.5 + o.wing * 4], tip: Pt = [cx + s * (12.6 - o.fold * 6), cy - 2 + o.wing * 7];
      const bd: Pt = [cx + s * 2, cy + 3], L = (t: number, d: number): Pt => [tip[0] + (bd[0] - tip[0]) * t, tip[1] + (bd[1] - tip[1]) * t + d];
      l.poly([sh, wr, tip, L(0.25, 2.5), L(0.42, -0.5), L(0.62, 2.5), L(0.8, 0), bd], V[s < 0 ? 1 : 2]);
      l.line(R(sh[0]), R(sh[1]), R(wr[0]), R(wr[1]), V[3]); l.line(R(wr[0]), R(wr[1]), R(tip[0]), R(tip[1]), V[3]);
      const f1 = L(0.25, 2), f2 = L(0.62, 2); l.line(R(wr[0]), R(wr[1]), R(f1[0]), R(f1[1]), V[s < 0 ? 0 : 1]); l.line(R(wr[0]), R(wr[1]), R(f2[0]), R(f2[1]), V[s < 0 ? 0 : 1]);
      l.set(R(wr[0]), R(wr[1]) - 1, V[4]);
      // Löcher in der Flughaut
      const h = L(0.45, -2.5); l.set(R(h[0]), R(h[1]), 0); if (s > 0) { const h2 = L(0.18, 0); l.set(R(h2[0]), R(h2[1]), 0); }
    }
  });
  p.layer((l) => {
    l.rect(R(cx - 2), R(cy + 5), 1, 2, V[1]); l.rect(R(cx + 1), R(cy + 5), 1, 2, V[1]);
    // große Ohren
    l.poly([[cx - 3.5, cy - 3], [cx - 4.5, cy - 10], [cx - 0.5, cy - 4.5]], V[2]); l.line(R(cx - 3), R(cy - 5), R(cx - 4), R(cy - 8), P.pink[2]);
    l.poly([[cx + 0.5, cy - 4.5], [cx + 4.5, cy - 10.5], [cx + 4.2, cy - 3]], V[3]); l.line(R(cx + 3), R(cy - 5), R(cx + 4), R(cy - 8), P.pink[3]); l.set(R(cx + 2), R(cy - 6), 0);
    l.ball(cx, cy + 1.5, 3.6, 4, V, 1, 4); l.ball(cx + 0.4, cy - 1.6, 3.8, 3.3, V, 2, 4);
    l.px([cx - 1, cy + 2, cx + 1, cy + 3, cx, cy + 4, cx + 2, cy + 2], V[4]); l.px([cx - 2, cy + 4, cx + 2, cy + 5], V[1]);
    const ex = R(cx - 1), ey = R(cy - 3);
    if (o.eye === 'shut') { l.px([ex - 1, ey, ex, ey + 1, ex - 1, ey + 2, ex + 4, ey, ex + 3, ey + 1, ex + 4, ey + 2], V[0]); }
    else { l.rect(ex - 1, ey, 2, 2, P.gold[4]); l.set(ex, ey + 1, INK); l.rect(ex + 3, ey, 2, 2, P.gold[4]); l.set(ex + 4, ey + 1, INK); if (o.eye === 'angry') { l.px([ex - 2, ey - 1, ex - 1, ey - 1, ex, ey, ex + 3, ey, ex + 4, ey - 1, ex + 5, ey - 1], V[0]); } }
    l.set(ex + 1, ey + 2, P.pink[3]);
    if (o.mouth) { l.rect(ex, ey + 3, 4, 2, P.red[0]); l.set(ex, ey + 3, WHITE); l.set(ex + 3, ey + 3, WHITE); l.set(ex + 1, ey + 4, P.red[2]); } else { l.set(ex, ey + 3, WHITE); l.set(ex + 3, ey + 3, WHITE); }
  });
}
const fledermaus: MobFn = (p, fr) => {
  const i = fr.i, o: BT = { dx: 0, dy: 0, wing: 0, fold: 0, mouth: false, eye: 'n' };
  switch (fr.a) {
    case 'idle': o.wing = [-0.8, 0.1, 0.9, 0.1][i]; o.dy = [1, 0, -1, 0][i]; break;
    case 'move': o.wing = [-1, -0.4, 0.5, 1, 0.4, -0.5][i]; o.dy = [1, 1, 0, -1, -1, 0][i]; o.dx = 1; break;
    case 'windup': o.wing = [-0.9, -1][i]; o.dy = [-2, -3][i]; o.dx = [-1, -2][i]; o.fold = [0, 0.3][i]; o.mouth = i === 1; o.eye = 'angry'; break;
    case 'attack': o.dx = [2, 3, 2][i]; o.dy = [3, 6, 2][i]; o.wing = [-0.9, 0.6, 0.2][i]; o.fold = [0.5, 0.1, 0][i]; o.mouth = i < 2; o.eye = 'angry'; break;
    case 'hit': o.dx = [-2, -1][i]; o.dy = [-1, 0][i]; o.fold = [0.6, 0.3][i]; o.wing = [0.7, 0.3][i]; o.eye = 'shut'; o.mouth = i === 0; break;
    case 'death': o.eye = 'shut'; o.fold = [0.4, 0.7, 0.85, 0.85, 0.85][i]; o.wing = [0.2, -1, 0.9, 0.9, 0.9][i]; o.dy = [0, 5, 8, 8, 8][i]; o.dx = [-1, -1, 0, 0, 0][i]; break;
  }
  if (fr.a === 'death' && i >= 3) { const b = new Px(32, 32); batDraw(b, o); dissolve(b, i === 3 ? 0.35 : 0.75, 7); b.alphaMul(i === 3 ? 0.85 : 0.45); p.draw(b); dots(p, i === 3 ? [9, 18, 22, 16, 15, 14] : [12, 15, 20, 12], alpha(P.violet[4], 150)); return; }
  batDraw(p, o);
  if (fr.a === 'attack' && i === 1) dots(p, [14, 8, 13, 6, 22, 9, 23, 7], alpha(WHITE, 150));
  if (fr.a === 'windup' && i === 1) spark(p, 18, 9, WHITE, P.gold[4]);
};

// ================================================================ Kristallkrabbler
interface KR { bx: number; by: number; claw: Pt; open: number; ph: number; walk: number; hide: boolean; lit: number; tw: number }
function krabDraw(p: Px, o: KR): void {
  const cx = 15 + o.bx, cy = 21 + o.by, G = 27, T = P.teal;
  p.layer((l) => {
    for (let i = 0; i < 3; i++) {
      const th = o.ph + i * 2.1, fx = [7, 13, 19.5][i] + o.bx + o.walk * 1.8 * Math.cos(th), fy = G - o.walk * 2 * Math.max(0, -Math.sin(th));
      const ax = cx - 5 + i * 5, kx = (ax + fx) / 2 + (i - 1) * 1.5;
      l.line(R(ax), R(cy + 2), R(kx), R(cy + 1), T[1], 2); l.line(R(kx), R(cy + 2), R(fx), R(fy), T[2]); l.set(R(fx), R(fy), T[3]);
      l.rect(R(fx + 2.5 - (i - 1)), R(fy) - 1, 1, 2, T[0]);
    }
    // kleine Schere hinten
    l.ball(cx - 9, cy + 1.5 + (o.hide ? 1 : 0), 2.4, 2, T, 1, 3); l.set(R(cx - 11), R(cy + 1), T[4]); l.set(R(cx - 11), R(cy + 2), 0);
  });
  p.layer((l) => {
    // Kristalle auf dem Rücken
    const g = o.lit;
    crystal(l, cx - 5, cy - 2, cx - 7.5, cy - 9.5 - g, 2, T); crystal(l, cx + 4.5, cy - 2, cx + 7.5, cy - 8.5 - g, 2, T);
    crystal(l, cx, cy - 3, cx + 0.5, cy - 13 - g, 2.7, P.ice); crystal(l, cx - 2.5, cy - 3, cx - 3, cy - 7, 1.2, P.pink);
    // Panzer
    form(l, (m) => { m.ell(cx, cy, 8, 4.4, 1); }, [T[0], T[0], T[1], T[2], T[3]], 1, 4, 0.08);
    l.rect(R(cx - 6), R(cy + 3), 12, 1, P.tan[1]); l.rect(R(cx - 4), R(cy + 2), 9, 1, P.tan[2]);
    l.px([cx - 5, cy - 1, cx - 1, cy, cx + 3, cy - 1, cx + 5, cy + 1], T[3]); l.px([cx - 3, cy + 1, cx + 2, cy + 1], T[0]);
    if (!o.hide) {
      for (const [x, y] of [[cx + 5, cy - 2], [cx + 8, cy - 1]] as const) { l.rect(R(x), R(y) - 2, 1, 3, T[2]); l.rect(R(x) - 1, R(y) - 4, 2, 2, WHITE); l.set(R(x), R(y) - 3, INK); }
      l.px([cx + 3, cy - 7, cx + 4, cy - 6, cx + 8, cy - 6, cx + 9, cy - 7], T[0]);
    }
  });
  if (o.tw >= 0) { const q = [[cx - 7, cy - 9], [cx + 1, cy - 12], [cx + 7, cy - 8], [cx - 3, cy - 6]][o.tw % 4]; spark(p, q[0], q[1], WHITE, alpha(P.ice[4], 200)); }
  p.layer((l) => {
    // große Schere
    const c: Pt = [o.claw[0] + o.bx, o.claw[1] + o.by];
    tube(l, [[cx + 6, cy + 1.5], [c[0] - 2, c[1] + 0.5]], 1.4, 1.5, T, 1);
    l.ball(c[0], c[1], 3.4, 3, T, 1, 4);
    l.poly([[c[0] + 1, c[1] - 2.5], [c[0] + 5.5, c[1] - 1.5 - o.open], [c[0] + 3, c[1] - 0.2]], T[3]); l.set(R(c[0] + 5), R(c[1] - 1.5 - o.open), WHITE);
    l.poly([[c[0] + 1, c[1] + 2.5], [c[0] + 5, c[1] + 1 + o.open * 0.6], [c[0] + 2.5, c[1] + 0.6]], T[2]); l.set(R(c[0] - 1), R(c[1] - 1), T[4]);
  });
}
const kristallkrabbler: MobFn = (p, fr) => {
  const i = fr.i, o: KR = { bx: 0, by: 0, claw: [24, 22], open: 1, ph: 0, walk: 0, hide: false, lit: 0, tw: -1 };
  switch (fr.a) {
    case 'idle': o.by = [0, 0, 1, 1][i]; o.open = [1, 2.2, 0.2, 1][i]; o.tw = i; break;
    case 'move': o.ph = fr.ph; o.walk = 1; o.by = [0, 1, 0, 0, 1, 0][i]; o.claw = [24, 22 + [0, 1, 0, -1, 0, 1][i]]; if (i % 3 === 0) o.tw = i; break;
    case 'windup': o.by = [-1, -2][i]; o.bx = [-1, -2][i]; o.claw = pk([[24, 13], [23, 10]], i); o.open = [2.5, 3.5][i]; o.lit = i; o.tw = i ? 1 : -1; break;
    case 'attack': o.bx = [1, 2, 1][i]; o.by = [0, 1, 0][i]; o.claw = pk([[26, 18], [26, 24], [24, 23]], i); o.open = [3, 0, 0.5][i]; break;
    case 'hit': o.by = [1, 1][i]; o.bx = [-2, -1][i]; o.hide = true; o.claw = pk([[21, 23], [22, 23]], i); o.open = 0; break;
    case 'death': o.by = 1; o.hide = true; o.claw = [22, 23]; o.open = 2; break;
  }
  if (fr.a === 'death' && i >= 1) {
    const b = new Px(32, 32); krabDraw(b, o); deathFx(p, b, i, 'shatter', 27, 12, { cell: 4, heap: 3, cx: 15, pop: 3 });
    if (i < 4) for (const [x, y] of [[6, 12], [24, 10], [15, 6], [27, 18], [3, 19]].slice(0, 5 - i)) spark(p, x + (i % 2), y - i, WHITE, alpha(P.ice[4], 200));
    return;
  }
  if (o.lit) glow(p, 15 + o.bx, 12, 7, P.teal[4], 60);
  krabDraw(p, o);
  if (fr.a === 'attack' && i === 1) { spark(p, 30, 25, WHITE, P.teal[4]); dots(p, [28, 21, 30, 27, 25, 27], P.ice[4]); }
};

// ================================================================ Glimmerwisp
function lantern(p: Px, cx: number, cy: number, flare: number, tilt: number, shut: boolean, t: number, cage = true): void {
  const Gd = P.gold, B: readonly number[] = [P.wood[0], P.wood[1], P.gold[0], P.gold[1], P.gold[2]];
  glow(p, cx, cy, 8 + flare * 4, Gd[3], 50 + flare * 60);
  // Funkenschweif
  for (let k = 0; k < 5; k++) { const y = cy + 7 + k * 2, x = cx - tilt * (k + 1) * 0.9 + Math.sin(k * 1.9 + t * 1.6) * 1.6; p.blend(R(x), R(y), alpha(k < 2 ? WHITE : Gd[3], 240 - k * 40)); }
  p.layer((l) => {
    // Flammenzunge aus dem Deckel
    const fx = cx - tilt * 1.2;
    l.poly([[cx - 1.6, cy - 6], [fx + Math.sin(t * 2.2) * 1.2, cy - 10.5 - flare * 2.5 - (t & 1)], [cx + 1.8, cy - 6]], P.fire[3]); l.set(R(cx), R(cy - 7), Gd[4]);
    l.ball(cx, cy, 4.6 + flare * 0.8, 5 + flare * 0.6, Gd, 2, 4); l.ell(cx - 0.6, cy - 0.6, 2.8, 3, WHITE); l.ell(cx + 1.6, cy + 2.2, 1.6, 1.4, Gd[4]);
    if (cage) {
      // Laternengestell: Deckel mit Öse, Rippen, Fuß
      l.rect(R(cx - 3), R(cy - 6), 6, 2, B[3]); l.rect(R(cx - 2), R(cy - 7), 4, 1, B[4]); l.set(R(cx - 3), R(cy - 6), B[4]); l.rect(R(cx + 1), R(cy - 5), 2, 1, B[1]);
      l.px([cx - 1, cy - 9, cx, cy - 10, cx + 1, cy - 9, cx, cy - 8], B[3]); l.set(R(cx), R(cy - 9), 0);
      for (const s of [-1, 1]) { l.line(R(cx + s * 4 - (s > 0 ? 1 : 0)), R(cy - 4), R(cx + s * 5 - (s > 0 ? 1 : 0)), R(cy), B[s < 0 ? 3 : 1]); l.line(R(cx + s * 5 - (s > 0 ? 1 : 0)), R(cy), R(cx + s * 3 - (s > 0 ? 1 : 0)), R(cy + 4), B[s < 0 ? 3 : 1]); }
      l.rect(R(cx - 2), R(cy + 5), 4, 1, B[2]); l.set(R(cx - 1), R(cy + 6), B[1]); l.set(R(cx), R(cy + 6), B[1]);
    }
    const ex = R(cx), ey = R(cy - 1);
    if (shut) { l.px([ex - 1, ey + 1, ex, ey, ex + 3, ey, ex + 2, ey + 1], Gd[0]); l.rect(ex, ey + 3, 2, 1, Gd[0]); }
    else { l.rect(ex - 1, ey, 1, 2, P.wood[0]); l.rect(ex + 2, ey, 1, 2, P.wood[0]); if (flare > 0.5) { l.rect(ex, ey + 3, 2, 2, P.wood[0]); l.px([ex - 2, ey - 2, ex - 1, ey - 1, ex + 2, ey - 1, ex + 3, ey - 2], Gd[1]); } else l.px([ex, ey + 3, ex + 1, ey + 3], Gd[1]); }
  });
}
const glimmerwisp: MobFn = (p, fr) => {
  const i = fr.i, z = floatState(fr), cx = 16 + z.dx, cy = 13 + z.dy;
  if (fr.a === 'death' && i >= 1) {
    const b = new Px(32, 32); lantern(b, 15, 13, 1 - i * 0.2, 0, true, i, false); deathFx(p, b, i, 'burst', 27, 3, { cx: 15, cy: 13, dist: 12 });
    // Deckel und Gestell fallen zu Boden
    const y = [0, 16, 23, 26, 26][i];
    p.layer((l) => { l.rect(12 + i, y, 6, 2, P.gold[1]); l.rect(13 + i, y - 1, 4, 1, P.gold[2]); if (i >= 3) { l.rect(8, 27, 3, 1, P.gold[0]); l.rect(19, 26, 1, 2, P.gold[0]); } });
    if (i === 4) p.alphaMul(0.55);
    for (let k = 0; k < 6 - i; k++) spark(p, 15 + Math.cos(k * 2.3 + i) * (4 + i * 3), 13 + Math.sin(k * 2.3 + i) * (3 + i * 2.4), WHITE, alpha(P.gold[4], 220 - i * 40));
    return;
  }
  lantern(p, cx, cy, z.flare, z.tilt, z.shut, fr.a === 'move' ? i * 1.3 : i, true);
  // kreisende Funken
  const n = fr.a === 'windup' ? 6 : 3, rad = fr.a === 'windup' ? [12, 8][i] : 10;
  for (let k = 0; k < n; k++) { const a = (k / n) * 6.283 + i * 0.7; p.set(R(cx + Math.cos(a) * rad), R(cy + Math.sin(a) * rad * 0.7), k % 2 ? P.gold[4] : WHITE); }
  if (fr.a === 'attack') { if (i === 0) { spark(p, cx + 9, cy, WHITE, P.gold[4], 2); dots(p, [cx + 12, cy - 2, cx + 12, cy + 2, cx + 6, cy - 4, cx + 6, cy + 4], P.gold[4]); } else if (i === 1) dots(p, [cx + 11, cy, cx + 13, cy - 1, cx + 9, cy + 3], P.gold[4]); }
  if (fr.a === 'hit') dots(p, [cx + 7, cy - 6, cx + 9, cy + 2, cx - 8, cy - 3], P.fire[2]);
};

// ================================================================ Tropfschleim
const drop: Profile = (v) => Math.max(Math.sqrt(Math.max(0, 1 - Math.pow(v / 0.78, 2))), (1 - v) * 0.52) * (0.86 + 0.14 * Math.min(1, v / 0.14));
const tropfschleim: MobFn = (p, fr) => {
  const i = fr.i, B = P.blue;
  const pebble = (l: Px, x: number, y: number): void => { l.ball(x, y, 2.4, 1.9, P.stone, 1, 4); l.set(R(x - 1), R(y - 1), P.stone[4]); };
  if (fr.a === 'death' && i >= 1) {
    const cx = 15, gy = 27;
    p.layer((l) => {
      if (i === 1) { puddle(l, cx, gy, 10.5, 2.4, B, 1); l.ell(cx, gy - 3, 5.5, 2.6, B[3]); l.rect(cx - 3, gy - 5, 3, 1, WHITE); }
      else if (i === 2) { puddle(l, cx, gy, 12.5, 2.6, B, 1); l.px([cx - 6, gy - 2, cx - 5, gy - 2, cx + 4, gy - 3], WHITE); }
      else if (i === 3) { puddle(l, cx, gy, 9, 1.8, B, 0); l.set(cx + 5, gy - 1, B[4]); }
      else l.px([cx - 6, gy, cx - 5, gy, cx + 4, gy, cx + 6, gy], B[2]);
      if (i < 4) l.alphaMul(0.86);
    });
    p.layer((l) => pebble(l, cx - 1, gy - 1.4));
    if (i <= 2) for (let k = 0; k < 8; k++) { const a = -0.3 - k * 0.36, d = 7 + i * 5 + (k % 3); p.set(R(cx + Math.cos(a) * d * 1.1), R(gy - 3 + Math.sin(a) * d * 0.8 + i * i * 1.2), k % 2 ? B[4] : WHITE); }
    if (i === 4) p.alphaMul(0.6);
    return;
  }
  const st = slimeState(fr), g = slimeGeo(32, 32, 8.2, 16.5, st, drop);
  const b = new Px(32, 32);
  slimeBody(b, g, [B[0], B[1], B[2], B[3], P.ice[3]], 1, 4, drop, 0.12);
  // heller Saum unten (Durchscheinen) und dunkler Kern
  for (let x = 0; x < 32; x++) for (let y = 0; y < 32; y++) if (b.get(x, y) >>> 24 && !(b.get(x, y + 1) >>> 24 && b.get(x + 1, y) >>> 24) && y > g.gy - g.H * 0.5) b.set(x, y, B[3]);
  b.alphaMul(0.84);
  const pb = g.at(-0.25, 0.2); pebble(b, pb[0], pb[1] - 0.5);
  const t = fr.a === 'move' ? i + 1 : i;
  for (const [u, v0, s] of [[0.35, 0.18, 3], [-0.5, 0.3, 5], [0.1, 0.5, 4]] as const) { const v = v0 + ((t * 0.09 * s) % 0.3); const q = g.at(u, Math.min(0.7, v)); b.set(R(q[0]), R(q[1]), P.ice[4]); if (s === 4) b.set(R(q[0]) + 1, R(q[1]) - 1, WHITE); }
  const hl = g.at(-0.55, 0.52); b.rect(R(hl[0]), R(hl[1]), 2, 1, WHITE); b.set(R(hl[0]) - 1, R(hl[1]) + 1, WHITE); b.set(R(hl[0]) - 1, R(hl[1]) + 3, P.ice[4]);
  const tip = g.at(0, 0.93); b.set(R(tip[0] - 0.5), R(tip[1]), P.ice[4]);
  // Gesicht: schläfrige Tropfenaugen
  const e = g.at(0, 0.42), ex = R(e[0] + 0.5), ey = R(e[1]) - 1, D = B[0], m = st.mood;
  if (m === 'blink') { b.rect(ex, ey + 2, 2, 1, D); b.rect(ex + 4, ey + 2, 2, 1, D); }
  else if (m === 'shut' || m === 'dead') { b.px([ex, ey, ex + 1, ey + 1, ex, ey + 2, ex + 5, ey, ex + 4, ey + 1, ex + 5, ey + 2], D); }
  else { b.rect(ex, ey, 2, 3, D); b.set(ex, ey, WHITE); b.rect(ex + 4, ey, 2, 3, D); b.set(ex + 4, ey, WHITE); if (m === 'n') { b.rect(ex, ey, 2, 1, B[2]); b.rect(ex + 4, ey, 2, 1, B[2]); } else b.px([ex - 1, ey - 2, ex, ey - 1, ex + 1, ey - 1, ex + 4, ey - 1, ex + 5, ey - 1, ex + 6, ey - 2], D); }
  if (m === 'open') { b.rect(ex + 1, ey + 4, 4, 3, D); b.set(ex + 2, ey + 6, B[2]); } else if (m === 'angry') b.rect(ex + 2, ey + 4, 2, 2, D); else b.px([ex + 2, ey + 4, ex + 3, ey + 4], D);
  p.draw(b.outline(alpha(mixInk(B[0]), 255)));
  // Tropfen
  if (fr.a === 'move') dots(p, i === 5 ? [g.cx - 11, g.gy - 1, g.cx + 11, g.gy - 2, g.cx - 12, g.gy - 4] : i === 2 || i === 3 ? [g.cx - 3, g.gy + 3 + i, g.cx + 2, g.gy + 5] : [], B[4]);
  if (fr.a === 'idle' && i === 2) p.set(R(g.cx + 9), R(g.gy - 1), B[4]);
  if (fr.a === 'windup' && i === 1) dots(p, [g.cx - 11, g.gy - 8, g.cx + 9, g.gy - 16, g.cx - 9, g.gy - 1], B[4]);
  if (fr.a === 'attack' && i < 2) dots(p, [g.cx - 10 - i, g.gy - 2, g.cx - 12, g.gy - 6, g.cx + 11, g.gy - 1 - i], P.ice[4]);
  if (fr.a === 'hit' && i === 0) dots(p, [g.cx + 11, g.gy - 8, g.cx + 9, g.gy - 12, g.cx - 12, g.gy - 5], B[4]);
};
function mixInk(c: number): number { const r = (c & 255) * 0.5, g = ((c >> 8) & 255) * 0.5, b = ((c >> 16) & 255) * 0.6; return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0; }

export const HOEHLEN: Record<string, MobDef> = {
  fledermaus: { w: 32, h: 32, fn: fledermaus },
  kristallkrabbler: { w: 32, h: 32, fn: kristallkrabbler },
  glimmerwisp: { w: 32, h: 32, fn: glimmerwisp },
  tropfschleim: { w: 32, h: 32, fn: tropfschleim },
};
