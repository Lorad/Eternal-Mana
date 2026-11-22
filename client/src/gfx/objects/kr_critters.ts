/** Kristallhöhlen – Kleintiere (v2), Präfix `crit_`. Alle blicken nach rechts (Engine spiegelt). */
import { Px } from '../draw';
import { Frames, INK, P, Ramp, WHITE, alpha, anim, inkOutline, mix } from './kit';

const C = P.cream;

function glowbug(p: Px, f: number): void {
  const c = mix(P.teal[4], P.ice[3], 0.4), core = mix(P.teal[4], WHITE, 0.7);
  p.set(2, 2, alpha(f ? WHITE : core, f ? 255 : 210)); for (const [x, y] of [[1, 2], [3, 2], [2, 1], [2, 3]] as const) p.set(x, y, alpha(c, f ? 235 : 150));
  for (const [x, y] of [[1, 1], [3, 1], [1, 3], [3, 3]] as const) p.set(x, y, alpha(c, f ? 120 : 50));
  if (f) for (const [x, y] of [[0, 2], [4, 2], [2, 0], [2, 4]] as const) p.set(x, y, alpha(c, 90));
}
function bat(p: Px, f: number): void {
  const B: Ramp = [P.shadow[1], mix(P.shadow[3], P.steel[1], 0.4), mix(P.violet[2], P.steel[2], 0.5), mix(P.violet[3], P.steel[3], 0.5)];
  const tip = [1, 4, 8, 5][f], el = [2, 3, 6, 4][f], by = [1, 0, -1, 0][f];
  // Flughäute
  for (const s of [-1, 1]) {
    const sx = 6 + s, X = (d: number): number => (s < 0 ? 5 - d : 6 + d);
    p.poly([[sx + (s < 0 ? 0 : 0), 4 + by], [X(2.5) + (s < 0 ? 0 : 1), el + by - (f === 2 ? 2 : 0)], [X(5) + (s < 0 ? 0 : 1), tip + by], [X(3) + (s < 0 ? 0 : 1), el + 2 + by], [X(1.5) + (s < 0 ? 0 : 1), 7 + by - (f === 0 ? 1 : 0)], [sx, 6 + by]], s < 0 ? B[2] : B[1]);
    p.line(X(0.6), 4 + by, X(2.6), el + by - (f === 2 ? 1 : 0), s < 0 ? B[3] : B[2]); p.line(X(2.6), el + by - (f === 2 ? 1 : 0), X(5), tip + by, s < 0 ? B[3] : B[2]);
    p.set(X(5), tip + by, B[3]);
  }
  // Körper, Ohren, Augen
  p.rect(5, 4 + by, 2, 4, B[1]); p.set(5, 4 + by, B[2]); p.set(5, 8 + by, B[0]); p.px([4, 2 + by, 7, 2 + by], B[2]); p.rect(5, 3 + by, 2, 1, B[2]);
  p.set(5, 4 + by, P.pink[3]); p.set(6, 4 + by, P.pink[4]);
}
interface NewtPose { ph?: number; head?: number; tail?: number; run?: boolean }
function newt(p: Px, o: NewtPose): void {
  const N: Ramp = [mix(P.pink[1], P.stone[1], 0.6), mix(P.pink[3], C[2], 0.6), mix(P.pink[4], C[3], 0.65), mix(P.pink[4], C[4], 0.8)];
  const ph = o.ph ?? 0, run = o.run ?? false, hd = o.head ?? 0, tl = o.tail ?? 0;
  const yAt = (x: number): number => 5 + (run ? Math.round(Math.sin(ph + x * 0.75) * 1.1) : 0) + (x < 4 ? Math.round(tl * (4 - x) * 0.34) : 0);
  // Schwanz (dünn), Rumpf (2 px), Kopf
  for (let x = 0; x <= 12; x++) {
    const y = yAt(x) - (x >= 10 ? hd : 0);
    if (x < 3) { p.set(x, y, N[1]); if (x === 2) p.set(x, y - 1, N[2]); }
    else if (x < 10) { p.set(x, y - 1, x % 3 === 0 ? N[3] : N[2]); p.set(x, y, N[1]); }
    else { p.set(x, y - 1, N[3]); p.set(x, y, N[2]); if (x === 11) p.set(x, y - 2, N[2]); }
  }
  const hy = yAt(11) - hd;
  p.set(13, hy - 1, N[2]); p.set(13, hy, N[1]); p.set(12, hy - 1, INK); p.set(12, hy - 2, N[3]);
  // Außenkiemen (rosa Büschel)
  p.px([9, yAt(9) - 2, 10, yAt(10) - 2 - hd], P.pink[3]); p.set(9, yAt(9) - 3, P.pink[2]);
  // Beinchen
  const lg = run ? [Math.round(Math.sin(ph) * 1.2), Math.round(Math.sin(ph + Math.PI) * 1.2)] : [0, 0];
  p.set(4 + lg[0], yAt(4) + 1, N[1]); p.set(4 + lg[0] * 2, yAt(4) + 2, N[2]); p.set(8 + lg[1], yAt(8) + 1, N[1]); p.set(8 + lg[1] * 2, yAt(8) + 2, N[2]);
  if (run) { p.set(5 - lg[0], yAt(5) + 1, N[0]); p.set(9 - lg[1], yAt(9) + 1, N[0]); }
}
function cavefish(p: Px, f: number): void {
  const R = alpha(WHITE, 200), R2 = alpha(P.ice[3], 140), R3 = alpha(P.ice[2], 80);
  const ring = (rx: number, ry: number, c: number, gap = 0): void => { for (let k = 0; k < 28; k++) { if (gap && k % gap === 0) continue; const a = (k / 28) * Math.PI * 2; p.set(Math.round(8 + Math.cos(a) * rx), Math.round(9 + Math.sin(a) * ry), c); } };
  if (f === 0) { ring(3.6, 1.6, R2); p.px([5, 8, 6, 8, 10, 10, 11, 10], R); p.set(8, 9, R3); }
  else if (f === 1 || f === 2) {
    ring(4.5, 1.8, R2, f === 2 ? 3 : 0);
    // blasser, augenloser Höhlenfisch: rosaweiß, durchscheinende Flossen
    const F: Ramp = [mix(P.pink[1], P.steel[1], 0.6), mix(P.pink[3], P.steel[3], 0.6), mix(P.pink[4], C[3], 0.6), mix(P.pink[4], C[4], 0.8), WHITE];
    const l = new Px(16, 12);
    if (f === 1) {
      l.poly([[6, 9], [7, 3], [9, 1], [10, 3], [10, 9]], F[2]); l.line(7, 4, 7, 8, F[3]); l.set(8, 2, F[4]); l.line(10, 4, 10, 8, F[1]); l.px([11, 5, 5, 6], F[1]); l.set(8, 5, F[4]); l.set(9, 2, P.pink[3]);
    } else {
      l.poly([[4, 6], [6, 2], [10, 1], [13, 4], [13, 8], [11, 8], [10, 4], [7, 4], [6, 7]], F[2]); l.line(6, 3, 10, 2, F[3]); l.px([8, 2, 9, 2], F[4]); l.line(7, 4, 10, 4, F[1]); l.set(12, 6, P.pink[3]);
      l.px([3, 5, 2, 4, 3, 7, 2, 8], F[1]); l.set(4, 6, F[2]);
    }
    inkOutline(l); p.draw(l);
    if (f === 2) p.px([13, 9, 14, 8, 12, 10], R);
    p.px([5, 9, 6, 10, 10, 10], R);
  } else if (f === 3) {
    ring(6, 2.2, R2, 2); ring(3, 1.2, R);
    for (const [x, y] of [[11, 6], [13, 5], [12, 3], [14, 7], [10, 4], [9, 7]] as const) p.set(x, y, R); p.px([12, 4, 13, 6], R2); p.set(12, 8, WHITE);
  } else { ring(7, 2.6, R3, 2); ring(4.5, 1.6, R3, 3); }
}

export function krCritters(out: Frames): void {
  anim(out, 'crit_glowbug', 2, 5, 5, glowbug, false);
  anim(out, 'crit_cavebat', 4, 12, 10, bat);
  anim(out, 'crit_newt_idle', 2, 14, 8, (p, f) => newt(p, f ? { head: 1, tail: -1 } : {}));
  anim(out, 'crit_newt_run', 4, 14, 8, (p, f) => newt(p, { run: true, ph: (f * Math.PI) / 2 }));
  anim(out, 'crit_cavefish', 5, 16, 12, cavefish, false);
}
