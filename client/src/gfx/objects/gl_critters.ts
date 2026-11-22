/** Glutlande – Kleintiere (v2), Präfix `crit_`. Alle blicken nach rechts (Engine spiegelt). */
import { Px } from '../draw';
import { Frames, INK, P, Ramp, WHITE, alpha, anim, mix } from './kit';

const F = P.fire, A = P.ash;

function emberfly(p: Px, f: number): void {
  const c = mix(F[3], F[2], 0.5), core = mix(F[4], WHITE, 0.4);
  p.set(2, 2, alpha(f ? WHITE : core, f ? 255 : 215)); for (const [x, y] of [[1, 2], [3, 2], [2, 1], [2, 3]] as const) p.set(x, y, alpha(c, f ? 235 : 150));
  for (const [x, y] of [[1, 1], [3, 1], [1, 3], [3, 3]] as const) p.set(x, y, alpha(F[1], f ? 120 : 50));
  if (f) for (const [x, y] of [[0, 2], [4, 2], [2, 0], [2, 4]] as const) p.set(x, y, alpha(F[2], 90));
}
interface LizPose { ph?: number; head?: number; tail?: number; run?: boolean; tongue?: boolean }
function lizard(p: Px, o: LizPose): void {
  const L: Ramp = [mix(A[0], INK, 0.2), A[2], mix(A[3], P.steel[1], 0.3), mix(A[4], P.steel[2], 0.3)];
  const ph = o.ph ?? 0, run = o.run ?? false, hd = o.head ?? 0, tl = o.tail ?? 0;
  const yAt = (x: number): number => 5 + (run ? Math.round(Math.sin(ph + x * 0.7) * 1) : 0) + (x < 5 ? Math.round(tl * (5 - x) * 0.3) : 0);
  for (let x = 0; x <= 13; x++) {
    const y = yAt(x) - (x >= 11 ? hd : 0);
    if (x < 4) { p.set(x, y, L[1]); if (x > 1) p.set(x, y - 1, L[2]); }
    else if (x < 11) { p.set(x, y - 2, L[3]); p.set(x, y - 1, L[2]); p.set(x, y, L[1]); if (x % 2 === 0 && x > 4) p.set(x, y - 2, F[x % 4 === 0 ? 3 : 2]); }   // Glutpunkte
    else { p.set(x, y - 2, L[3]); p.set(x, y - 1, L[2]); if (x < 13) p.set(x, y, L[1]); }
  }
  const hy = yAt(12) - hd;
  p.set(14, hy - 1, L[2]); p.set(14, hy - 2, L[2]); p.set(12, hy - 2, F[4]); p.set(13, hy - 3, L[2]); p.set(12, hy - 3, L[3]);
  if (o.tongue) p.set(15, hy - 1, P.red[2]);
  p.set(3, yAt(3) - 1, F[1]);
  const lg = run ? [Math.round(Math.sin(ph) * 1.3), Math.round(Math.sin(ph + Math.PI) * 1.3)] : [0, 0];
  p.set(5 + lg[0], yAt(5) + 1, L[1]); p.set(5 + lg[0] * 2 - 1, yAt(5) + 2, L[2]); p.set(10 + lg[1], yAt(10) + 1, L[1]); p.set(10 + lg[1] * 2 + 1, yAt(10) + 2, L[2]);
  if (run) { p.set(6 - lg[0], yAt(6) + 1, L[0]); p.set(9 - lg[1], yAt(9) + 1, L[0]); } else { p.set(7, 6, L[0]); p.set(8, 6, L[0]); }
}
function lavapop(p: Px, f: number): void {
  const H: Ramp = [P.red[0], F[0], F[1], F[2], F[3], F[4]];
  const R = alpha(F[4], 220), R2 = alpha(F[3], 150), R3 = alpha(F[2], 90);
  const ring = (rx: number, ry: number, c: number, gap = 0): void => { for (let k = 0; k < 28; k++) { if (gap && k % gap === 0) continue; const a = (k / 28) * Math.PI * 2; p.set(Math.round(8 + Math.cos(a) * rx), Math.round(10.5 + Math.sin(a) * ry), c); } };
  const dome = (rx: number, ry: number): void => {
    for (let y = Math.floor(10 - ry); y <= 10; y++) { const hw = rx * Math.sqrt(Math.max(0, 1 - ((y + 0.5 - 10.5) / ry) ** 2)); for (let x = Math.round(8 - hw); x < Math.round(8 + hw); x++) { const u = (x + 0.5 - 8) / rx, v = (y + 0.5 - 10.5) / ry, lit = -(u * 0.5 + v * 0.8), edge = u * u + v * v > 0.62; p.set(x, y, edge ? H[2] : lit > 0.7 ? H[5] : lit > 0.35 ? H[4] : H[3]); } }
    p.set(8 - rx * 0.4, 10 - ry * 0.6, WHITE);
  };
  if (f === 0) { ring(4, 1.6, R2); dome(2.6, 2.2); }
  else if (f === 1) { ring(5, 1.9, R2); dome(4.4, 5); p.set(9, 8, H[5]); p.px([5, 10, 11, 10], H[1]); }
  else if (f === 2) {
    // Platzen: Hautfetzen als Bogenstücke, Tropfen fliegen auf
    ring(5.5, 2, R, 2);
    for (const [x, y, c] of [[4, 7, 3], [5, 5, 4], [11, 5, 4], [12, 7, 3], [3, 9, 2], [13, 9, 2], [6, 9, 3], [10, 9, 3]] as const) p.set(x, y, H[c]);
    for (const [x, y] of [[8, 2], [5, 2], [11, 3], [3, 5], [13, 4]] as const) { p.set(x, y, H[5]); p.set(x, y + 1, H[3]); }
    p.set(8, 1, WHITE); p.rect(7, 9, 3, 2, H[5]); p.px([6, 10, 10, 10], H[4]);
  } else if (f === 3) {
    ring(6.4, 2.3, R2, 2); ring(3, 1.2, R);
    for (const [x, y] of [[8, 5], [4, 6], [12, 7], [2, 8], [14, 8]] as const) { p.set(x, y, H[4]); p.set(x, y - 1, alpha(F[2], 150)); }
    p.px([6, 10, 9, 11], H[4]);
  } else { ring(7, 2.6, R3, 2); ring(4.5, 1.6, R3, 3); p.px([3, 10, 12, 11, 8, 9], R2); }
}

export function glCritters(out: Frames): void {
  anim(out, 'crit_emberfly', 2, 5, 5, emberfly, false);
  anim(out, 'crit_lizard_idle', 2, 16, 8, (p, f) => lizard(p, f ? { head: 1, tail: -1, tongue: true } : {}));
  anim(out, 'crit_lizard_run', 4, 16, 8, (p, f) => lizard(p, { run: true, ph: (f * Math.PI) / 2 }));
  anim(out, 'crit_lavapop', 5, 16, 14, lavapop, false);
}
