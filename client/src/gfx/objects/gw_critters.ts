/** Grünwald – Kleintiere (v2), Präfix `crit_`. Alle blicken nach rechts (Engine spiegelt). */
import { Px } from '../draw';
import { Frames, INK, P, Ramp, WHITE, alpha, anim, inkOutline, mix } from './kit';

const W = P.wood, T = P.tan, C = P.cream, Y = P.gold;

function butterfly(p: Px, f: number, A: Ramp, spot: number): void {
  // Flügelspanne: weit, halb, zu, halb
  const sp = [3, 2, 0, 2][f], dy = [0, 0, -1, 0][f];
  p.rect(4, 2 + dy, 1, 4, INK); p.set(4, 1 + dy, P.shadow[2]); p.px([3, 0 + dy, 5, 0 + dy], P.shadow[2]);
  if (sp === 0) { p.rect(3, 1 + dy, 1, 4, A[1]); p.set(3, 2 + dy, A[3]); return; }
  for (const s of [-1, 1]) {
    const x0 = 4 + s;
    for (let i = 0; i < sp; i++) {
      const x = x0 + s * i, lit = s < 0;
      p.set(x, 2 + dy - (i > 0 ? 1 : 0), i === sp - 1 ? A[1] : A[lit ? 3 : 2]); p.set(x, 3 + dy - (i > 0 ? 1 : 0), A[lit ? 3 : 2]); p.set(x, 4 + dy, i === sp - 1 ? A[1] : A[2]);
      if (i < sp - 1 || sp === 2) p.set(x, 5 + dy, A[lit ? 2 : 1]);
    }
    if (sp === 3) { p.set(x0 + s, 1 + dy, A[4]); p.set(x0 + s * 2, 3 + dy, spot); p.set(x0 + s, 6 + dy, A[1]); }
    else p.set(x0 + s, 2 + dy, spot);
  }
}
interface BirdPose { hx?: number; hy?: number; tail?: number; wing?: number; by?: number; legs?: boolean; tilt?: number }
function bird(p: Px, o: BirdPose): void {
  const hx = o.hx ?? 0, hy = o.hy ?? 0, by = o.by ?? 0, back = mix(P.blue[2], P.steel[2], 0.35), backD = mix(P.blue[1], P.steel[1], 0.35), backL = mix(P.blue[3], P.ice[2], 0.3);
  // Schwanz
  const tl = o.tail ?? 0; p.line(3, 7 + by, 1, 6 + by - tl, backD); p.line(3, 8 + by, 1, 7 + by - tl, back); p.set(0, 6 + by - tl, backD);
  // Körper, Brust
  p.ell(5.5, 7.5 + by, 3, 2.3, back); p.ell(6.4, 8.2 + by, 2.2, 1.7, P.fire[2]); p.px([6, 9 + by, 7, 9 + by], C[3]); p.set(7, 8 + by, P.fire[3]);
  // Kopf
  p.ell(7.6 + hx, 5 + hy + by, 2.1, 2, back); p.px([7 + hx, 3 + hy + by, 8 + hx, 3 + hy + by], backL); p.set(8 + hx, 5 + hy + by, INK); p.set(8 + hx, 4 + hy + by, WHITE); p.set(7 + hx, 6 + hy + by, C[4]);
  p.set(10 + hx, 5 + hy + by + (o.tilt ?? 0), Y[3]); if (!o.tilt) p.set(10 + hx, 6 + hy + by, Y[1]);
  // Flügel
  const wg = o.wing ?? 0;
  if (wg === 0) { p.px([4, 7 + by, 5, 7 + by, 5, 8 + by, 3, 7 + by], backD); p.set(4, 6 + by, backL); }
  else if (wg > 0) { p.poly([[4, 7 + by], [7, 7 + by], [5, 7 + by - wg * 2.4], [2, 7 + by - wg * 2]], backD); p.line(6, 7 + by, 4, 7 + by - wg * 2.2, backL); }
  else { p.poly([[4, 7 + by], [7, 7 + by], [6, 7 + by + 3.4], [3, 7 + by + 2.6]], backD); p.line(4, 7 + by, 4, 9 + by, back); }
  if (o.legs !== false) { p.set(5, 10 + by, T[1]); p.set(7, 10 + by, T[1]); p.px([5, 11 + by, 6, 11 + by, 7, 11 + by, 8, 11 + by], T[1]); }
}
interface RabbitPose { st?: number; ear?: number; y?: number; legs?: number }
function rabbit(p: Px, o: RabbitPose): void {
  const F: Ramp = [mix(W[0], P.shadow[1], 0.3), mix(T[1], P.stone[1], 0.3), mix(T[2], P.stone[2], 0.25), mix(T[3], C[2], 0.3), C[4]];
  const st = o.st ?? 0, y = o.y ?? 0, e = o.ear ?? 0;
  // Körper (st = Streckung beim Sprung), Blume
  p.ell(6.5 - st * 0.5, 11 + y, 4.4 + st, 3.2 - st * 0.5, F[2]); p.ell(6 - st * 0.5, 10.4 + y, 3.4 + st, 2.2 - st * 0.4, F[3]); p.ell(8 + st * 0.5, 12.4 + y, 2.4, 1.4, F[4]);
  p.ell(2 - st, 11 + y, 1.6, 1.6, WHITE); p.set(1 - st, 12 + y, C[2]);
  // Kopf
  const hx = 10.5 + st, hy = 7.5 + y;
  p.ell(hx, hy, 2.7, 2.4, F[2]); p.ell(hx - 0.4, hy - 0.5, 2, 1.6, F[3]); p.set(hx + 1, hy, INK); p.set(hx + 1, hy - 1, WHITE); p.set(hx + 2.4, hy + 1, P.pink[3]); p.set(hx + 1, hy + 2, C[4]);
  // Löffel
  const ex = Math.round(hx - 1), ey = Math.round(hy - 2);
  if (st > 0) { p.line(ex, ey, ex - 5, ey + 1, F[2]); p.line(ex + 1, ey, ex - 4, ey - 1, F[3]); p.set(ex - 3, ey, P.pink[3]); }
  else { p.line(ex, ey, ex - 1 + e, ey - 5, F[2]); p.line(ex + 1, ey, ex + 1 + e, ey - 5, F[3]); p.line(ex + 2, ey, ex + 3, ey - 4 + e, F[2]); p.set(ex + 1 + e, ey - 3, P.pink[3]); p.set(ex + 1, ey - 2, P.pink[3]); }
  // Läufe
  const lg = o.legs ?? 0;
  if (lg === 0) { p.rect(3, 14 + y, 4, 1, F[3]); p.set(2, 14 + y, F[1]); p.rect(9, 14 + y, 3, 1, F[4]); p.set(8, 13 + y, F[1]); }
  else if (lg === 1) { p.line(3, 13 + y, 0, 15 + y, F[1]); p.line(4, 13 + y, 1, 15 + y, F[3]); p.line(11, 12 + y, 14, 14 + y, F[4]); }
  else { p.line(2, 12 + y, -1, 11 + y, F[1]); p.line(3, 13 + y, 0, 12 + y, F[3]); p.line(12, 12 + y, 15, 12 + y, F[4]); }
}
interface SqPose { up?: boolean; tail?: number; y?: number; st?: number; legs?: number }
function squirrel(p: Px, o: SqPose): void {
  const F: Ramp = [P.red[0], mix(P.fire[0], W[1], 0.4), mix(P.fire[1], W[2], 0.45), mix(P.fire[2], T[2], 0.4), mix(P.fire[3], T[4], 0.5)];
  const y = o.y ?? 0, tl = o.tail ?? 0, st = o.st ?? 0;
  if (o.up) {
    // buschiger Schwanz hinter dem Rücken (S-Kurve)
    p.ell(3.5, 9 + y, 2.6, 3.4, F[2]); p.ell(3 + tl, 4.5 + y, 2.8, 3, F[2]); p.ell(2.6 + tl, 4 + y, 1.8, 2, F[3]); p.px([2 + tl, 2 + y, 3 + tl, 1 + y], F[4]); p.px([5, 11 + y, 5, 7 + y], F[1]);
    // Körper aufrecht
    p.ell(8, 9.5 + y, 2.6, 3.4, F[2]); p.ell(8.8, 10 + y, 1.6, 2.4, C[3]); p.rect(6, 12 + y, 5, 1, F[1]); p.px([10, 13 + y, 11, 13 + y, 6, 13 + y], F[3]);
    // Kopf, Ohr, Auge
    p.ell(9.6, 5 + y, 2.4, 2.2, F[2]); p.ell(9.2, 4.6 + y, 1.6, 1.4, F[3]); p.px([8, 2 + y, 8, 3 + y], F[1]); p.set(9, 2 + y, F[3]); p.set(10, 5 + y, INK); p.set(10, 4 + y, WHITE); p.set(12, 6 + y, INK); p.set(11, 6 + y, C[4]);
    // Pfoten mit Nuss
    p.px([10, 8 + y, 11, 8 + y], F[3]); p.rect(11, 7 + y, 2, 2, W[2]); p.set(11, 7 + y, T[3]);
  } else {
    // Lauf: gestreckt, Schwanz wehend
    p.line(4 - st, 8 + y, 0, 5 + y - tl, F[2]); p.ell(2 - st * 0.5, 6.5 + y - tl * 0.6, 2.4, 2.2, F[2]); p.ell(1.6 - st * 0.5, 6 + y - tl * 0.6, 1.4, 1.2, F[3]); p.set(0, 4 + y - tl, F[4]);
    p.ell(7.5, 9 + y, 3.6 + st * 0.6, 2.2, F[2]); p.ell(7.5, 8.4 + y, 2.6 + st * 0.5, 1.2, F[3]); p.ell(8, 10.2 + y, 2, 0.9, C[3]);
    p.ell(12 + st * 0.5, 7.4 + y, 2.2, 1.9, F[2]); p.set(11 + st * 0.5, 5 + y, F[1]); p.set(12 + st * 0.5, 5 + y, F[3]); p.set(13 + st * 0.5, 7 + y, INK); p.set(13 + st * 0.5, 6 + y, WHITE); p.set(14.6 + st * 0.5, 8 + y, INK);
    const lg = o.legs ?? 0;
    if (lg === 0) { p.line(5, 11 + y, 4, 13, F[1]); p.line(10, 11 + y, 11, 13, F[3]); }
    else if (lg === 1) { p.line(5, 10 + y, 2, 12 + y, F[1]); p.line(11, 10 + y, 14, 12 + y, F[3]); }
    else { p.line(6, 11 + y, 8, 13, F[1]); p.line(9, 11 + y, 8, 13, F[3]); }
  }
}
function firefly(p: Px, f: number): void {
  const c = mix(Y[4], P.green[4], 0.35), a = f ? 255 : 170;
  p.set(2, 2, alpha(WHITE, a)); for (const [x, y] of [[1, 2], [3, 2], [2, 1], [2, 3]] as const) p.set(x, y, alpha(c, f ? 220 : 110));
  if (f) for (const [x, y] of [[0, 2], [4, 2], [2, 0], [2, 4], [1, 1], [3, 1], [1, 3], [3, 3]] as const) p.set(x, y, alpha(c, 80));
}
interface FrogPose { st?: number; y?: number; puff?: boolean }
function frog(p: Px, o: FrogPose): void {
  const G: Ramp = [P.forest[0], P.forest[2], P.green[2], P.green[3], P.green[4]];
  const st = o.st ?? 0, y = o.y ?? 0;
  if (st === 0) {
    p.ell(5.5, 6.5 + y, 3.8, 2.6, G[2]); p.ell(5, 6 + y, 2.8, 1.6, G[3]); p.ell(7, 7.6 + y, 2.2 + (o.puff ? 0.8 : 0), 1.2 + (o.puff ? 0.5 : 0), C[3]);
    p.rect(1, 8 + y, 3, 1, G[1]); p.set(0, 9, G[1]); p.rect(1, 9, 3, 1, G[2]); p.px([8, 9, 9, 9, 7, 9], G[3]);
    p.ell(8, 4.2 + y, 1.5, 1.4, G[3]); p.set(8, 4 + y, INK); p.set(8, 3 + y, Y[3]); p.set(9, 6 + y, G[1]); p.px([3, 5 + y, 5, 7 + y], G[1]); p.set(4, 5 + y, G[4]);
  } else {
    // Sprung: gestreckt, Hinterbeine lang
    p.ell(6.5, 5 + y, 3.6, 1.9, G[2]); p.ell(6.5, 4.6 + y, 2.6, 1, G[3]); p.ell(8, 5.8 + y, 2, 0.8, C[3]);
    p.line(3, 6 + y, 0, 8 + y + (st > 1 ? 1 : 0), G[1]); p.line(4, 6 + y, 1, 9 + y, G[2]); p.line(9, 6 + y, 11, 7 + y + (st > 1 ? 1 : -1), G[3]);
    p.set(9, 3 + y, G[3]); p.set(9, 4 + y, INK); p.set(9, 2 + y, Y[3]); p.set(4, 4 + y, G[4]);
  }
}
function dragonfly(p: Px, f: number): void {
  const B = P.teal, w = alpha(WHITE, 190), w2 = alpha(P.ice[3], 130);
  p.rect(1, 4, 6, 1, B[2]); p.px([1, 4, 2, 4], B[1]); p.rect(6, 3, 2, 2, B[3]); p.set(8, 4, B[4]); p.set(8, 3, P.red[2]); p.set(6, 3, B[4]);
  if (f === 0) { p.line(6, 2, 3, 0, w); p.line(5, 2, 2, 1, w2); p.line(7, 2, 9, 0, w); p.set(8, 1, w2); }
  else { p.line(6, 5, 3, 7, w); p.line(5, 5, 2, 6, w2); p.line(7, 5, 9, 7, w2); p.rect(4, 2, 4, 1, w2); }
}
function fish(p: Px, f: number): void {
  const R = alpha(WHITE, 200), R2 = alpha(P.ice[3], 140), R3 = alpha(P.ice[2], 80);
  const ring = (rx: number, ry: number, c: number, gap = 0): void => { for (let k = 0; k < 28; k++) { if (gap && k % gap === 0) continue; const a = (k / 28) * Math.PI * 2; p.set(Math.round(8 + Math.cos(a) * rx), Math.round(9 + Math.sin(a) * ry), c); } };
  if (f === 0) { ring(3.6, 1.6, R2); p.px([5, 8, 6, 8, 10, 10, 11, 10], R); p.set(8, 9, R3); }
  else if (f === 1 || f === 2) {
    ring(4.5, 1.8, R2, f === 2 ? 3 : 0);
    const F: Ramp = [P.blue[0], P.blue[1], mix(P.blue[2], P.steel[2], 0.4), mix(P.ice[1], P.steel[3], 0.4), P.ice[3]];
    const l = new Px(16, 12);
    if (f === 1) { // steigt
      l.poly([[6, 9], [7, 3], [9, 1], [10, 3], [10, 9]], F[2]); l.line(7, 4, 7, 8, F[3]); l.set(9, 2, INK); l.set(8, 2, F[4]); l.line(10, 4, 10, 8, F[1]); l.px([11, 5, 5, 6], F[1]); l.set(8, 5, F[4]);
    } else { // Bogen, Kopf taucht wieder ein
      l.poly([[4, 6], [6, 2], [10, 1], [13, 4], [13, 8], [11, 8], [10, 4], [7, 4], [6, 7]], F[2]); l.line(6, 3, 10, 2, F[3]); l.set(12, 6, INK); l.px([8, 2, 9, 2], F[4]); l.line(7, 4, 10, 4, C[3]);
      l.px([3, 5, 2, 4, 3, 7, 2, 8], F[1]); l.set(4, 6, F[2]);
    }
    inkOutline(l); p.draw(l);
    if (f === 2) { p.px([13, 9, 14, 8, 12, 10], R); }
    p.px([5, 9, 6, 10, 10, 10], R);
  } else if (f === 3) {
    ring(6, 2.2, R2, 2); ring(3, 1.2, R);
    for (const [x, y] of [[11, 6], [13, 5], [12, 3], [14, 7], [10, 4], [9, 7]] as const) p.set(x, y, R); p.px([12, 4, 13, 6], R2); p.set(12, 8, WHITE);
  } else { ring(7, 2.6, R3, 2); ring(4.5, 1.6, R3, 3); }
}

export function gwCritters(out: Frames): void {
  const MON: Ramp = [P.fire[0], P.fire[1], P.fire[2], Y[3], Y[4]], BLU: Ramp = [P.blue[0], P.blue[1], P.blue[2], P.blue[3], P.ice[3]];
  anim(out, 'crit_butterfly_a', 4, 8, 8, (p, f) => butterfly(p, f, MON, WHITE));
  anim(out, 'crit_butterfly_b', 4, 8, 8, (p, f) => butterfly(p, f, BLU, P.pink[4]));
  anim(out, 'crit_bird_idle', 2, 12, 12, (p, f) => bird(p, f ? { hy: -1, tail: 1 } : {}));
  anim(out, 'crit_bird_peck', 2, 12, 12, (p, f) => bird(p, f ? { hx: 1, hy: 3, tail: 2, tilt: 1 } : { hx: 1, hy: 1, tail: 1 }));
  anim(out, 'crit_bird_fly', 4, 12, 12, (p, f) => bird(p, { wing: [1.4, 0.6, -1, 0.6][f], by: [-2, -3, -2, -1][f], legs: false, tail: -1 }));
  anim(out, 'crit_rabbit_idle', 2, 16, 16, (p, f) => rabbit(p, { ear: f ? 1 : 0 }));
  anim(out, 'crit_rabbit_hop', 4, 16, 16, (p, f) => rabbit(p, [{ y: 1, ear: 0 }, { st: 1, y: -2, legs: 1 }, { st: 1.4, y: -4, legs: 2 }, { st: 0.6, y: -1, legs: 1 }][f]));
  anim(out, 'crit_squirrel_idle', 2, 16, 14, (p, f) => squirrel(p, { up: true, tail: f ? 1 : 0 }));
  anim(out, 'crit_squirrel_run', 4, 16, 14, (p, f) => squirrel(p, [{ legs: 0, tail: 0 }, { legs: 1, y: -2, st: 1, tail: 1 }, { legs: 1, y: -3, st: 1, tail: 2 }, { legs: 2, y: -1, tail: 1 }][f]));
  anim(out, 'crit_firefly', 2, 5, 5, firefly, false);
  anim(out, 'crit_frog_idle', 2, 12, 10, (p, f) => frog(p, { puff: f === 1 }));
  anim(out, 'crit_frog_hop', 3, 12, 10, (p, f) => frog(p, [{ y: 1 }, { st: 1, y: -2 }, { st: 2, y: 0 }][f]));
  anim(out, 'crit_dragonfly', 2, 10, 8, dragonfly, false);
  anim(out, 'crit_fish', 5, 16, 12, fish, false);
}
