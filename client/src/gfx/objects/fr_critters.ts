/** Frostgebirge – Kleintiere, Präfix `crit_`. Alle blicken nach rechts (Engine spiegelt). */
import { Px } from '../draw';
import { Frames, INK, P, Ramp, WHITE, alpha, mix } from './kit';
import { SNOW, fAnim } from './fr_kit';

const C = P.cream, T = P.tan;

interface HarePose { st?: number; ear?: number; y?: number; legs?: number }
/** Schneehase: weißes Winterfell, schwarze Löffelspitzen. */
function hare(p: Px, o: HarePose): void {
  const F: Ramp = [SNOW[0], SNOW[1], SNOW[2], mix(SNOW[3], C[4], 0.4), WHITE], TIP = mix(P.shadow[2], P.steel[0], 0.5);
  const st = o.st ?? 0, y = o.y ?? 0, e = o.ear ?? 0;
  p.ell(6.5 - st * 0.5, 11 + y, 4.4 + st, 3.2 - st * 0.5, F[2]); p.ell(6 - st * 0.5, 10.4 + y, 3.4 + st, 2.2 - st * 0.4, F[3]); p.ell(5.4 - st * 0.5, 9.6 + y, 2.2 + st, 1, F[4]); p.ell(8 + st * 0.5, 12.6 + y, 2.2, 1.2, F[1]);
  p.ell(2 - st, 10.6 + y, 1.6, 1.6, WHITE); p.set(1 - st, 12 + y, F[1]);
  const hx = 10.5 + st, hy = 7.5 + y;
  p.ell(hx, hy, 2.7, 2.4, F[2]); p.ell(hx - 0.4, hy - 0.5, 2, 1.6, F[4]); p.set(hx + 1, hy, INK); p.set(hx + 1, hy - 1, F[4]); p.set(hx + 2.4, hy + 1, P.pink[3]); p.set(hx + 1, hy + 2, F[1]);
  const ex = Math.round(hx - 1), ey = Math.round(hy - 2);
  if (st > 0) { p.line(ex, ey, ex - 5, ey + 1, F[2]); p.line(ex + 1, ey, ex - 4, ey - 1, F[3]); p.set(ex - 3, ey, P.pink[3]); p.set(ex - 5, ey + 1, TIP); p.set(ex - 4, ey - 1, TIP); }
  else { p.line(ex, ey, ex - 1 + e, ey - 5, F[2]); p.line(ex + 1, ey, ex + 1 + e, ey - 5, F[4]); p.line(ex + 2, ey, ex + 3, ey - 4 + e, F[2]); p.set(ex + 1 + e, ey - 3, P.pink[3]); p.set(ex + 1 + e, ey - 5, TIP); p.set(ex - 1 + e, ey - 5, TIP); p.set(ex + 3, ey - 4 + e, TIP); }
  const lg = o.legs ?? 0;
  if (lg === 0) { p.rect(3, 14 + y, 4, 1, F[3]); p.set(2, 14 + y, F[1]); p.rect(9, 14 + y, 3, 1, F[4]); p.set(8, 13 + y, F[1]); }
  else if (lg === 1) { p.line(3, 13 + y, 0, 15 + y, F[1]); p.line(4, 13 + y, 1, 15 + y, F[3]); p.line(11, 12 + y, 14, 14 + y, F[4]); }
  else { p.line(2, 12 + y, -1, 11 + y, F[1]); p.line(3, 13 + y, 0, 12 + y, F[3]); p.line(12, 12 + y, 15, 12 + y, F[4]); }
}
interface BirdPose { hx?: number; hy?: number; tail?: number; wing?: number; by?: number; legs?: boolean; tilt?: number }
/** Schneeammer: weißer Bauch, rostbraune Kappe, dunkle Schwingen. */
function snowbird(p: Px, o: BirdPose): void {
  const hx = o.hx ?? 0, hy = o.hy ?? 0, by = o.by ?? 0, back = mix(T[2], P.stone[2], 0.4), backD = mix(P.shadow[2], P.steel[0], 0.4), backL = mix(T[3], C[3], 0.4);
  const tl = o.tail ?? 0; p.line(3, 7 + by, 1, 6 + by - tl, backD); p.line(3, 8 + by, 1, 7 + by - tl, back); p.set(0, 6 + by - tl, backD);
  p.ell(5.5, 7.5 + by, 3, 2.3, back); p.ell(6.4, 8.2 + by, 2.3, 1.8, WHITE); p.px([6, 9 + by, 7, 9 + by], SNOW[2]); p.set(5, 9 + by, SNOW[1]);
  p.ell(7.6 + hx, 5 + hy + by, 2.1, 2, WHITE); p.px([7 + hx, 3 + hy + by, 8 + hx, 3 + hy + by, 6 + hx, 4 + hy + by], mix(T[2], P.fire[1], 0.3)); p.set(8 + hx, 5 + hy + by, INK); p.set(7 + hx, 6 + hy + by, SNOW[2]);
  p.set(10 + hx, 5 + hy + by + (o.tilt ?? 0), P.gold[3]); if (!o.tilt) p.set(10 + hx, 6 + hy + by, P.gold[1]);
  const wg = o.wing ?? 0;
  if (wg === 0) { p.px([4, 7 + by, 5, 7 + by, 5, 8 + by, 3, 7 + by], backD); p.set(4, 6 + by, backL); p.set(4, 8 + by, WHITE); }
  else if (wg > 0) { p.poly([[4, 7 + by], [7, 7 + by], [5, 7 + by - wg * 2.4], [2, 7 + by - wg * 2]], backD); p.line(6, 7 + by, 4, 7 + by - wg * 2.2, WHITE); }
  else { p.poly([[4, 7 + by], [7, 7 + by], [6, 7 + by + 3.4], [3, 7 + by + 2.6]], backD); p.line(4, 7 + by, 4, 9 + by, WHITE); }
  if (o.legs !== false) { p.set(5, 10 + by, T[1]); p.set(7, 10 + by, T[1]); p.px([5, 11 + by, 6, 11 + by, 7, 11 + by, 8, 11 + by], T[1]); }
}
function sparkle(p: Px, f: number): void {
  const c = P.ice[3];
  p.set(2, 2, alpha(WHITE, f ? 255 : 190)); for (const [x, y] of [[1, 2], [3, 2], [2, 1], [2, 3]] as const) p.set(x, y, alpha(f ? WHITE : c, f ? 220 : 120));
  if (f) for (const [x, y] of [[0, 2], [4, 2], [2, 0], [2, 4]] as const) p.set(x, y, alpha(c, 150)); else for (const [x, y] of [[1, 1], [3, 3]] as const) p.set(x, y, alpha(c, 70));
}

export function frCritters(out: Frames): void {
  fAnim(out, 'crit_hare_idle', 2, 16, 16, (p, f) => hare(p, { ear: f ? 1 : 0 }));
  fAnim(out, 'crit_hare_hop', 4, 16, 16, (p, f) => hare(p, [{ y: 1, ear: 0 }, { st: 1, y: -2, legs: 1 }, { st: 1.4, y: -4, legs: 2 }, { st: 0.6, y: -1, legs: 1 }][f]));
  fAnim(out, 'crit_snowbird_idle', 2, 12, 12, (p, f) => snowbird(p, f ? { hy: -1, tail: 1 } : {}));
  fAnim(out, 'crit_snowbird_peck', 2, 12, 12, (p, f) => snowbird(p, f ? { hx: 1, hy: 3, tail: 2, tilt: 1 } : { hx: 1, hy: 1, tail: 1 }));
  fAnim(out, 'crit_snowbird_fly', 4, 12, 12, (p, f) => snowbird(p, { wing: [1.4, 0.6, -1, 0.6][f], by: [-2, -3, -2, -1][f], legs: false, tail: -1 }));
  fAnim(out, 'crit_icesparkle', 2, 5, 5, sparkle, false);
}
