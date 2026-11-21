/** Zweibeiner-Rig (Blick nach rechts): Kobolde, Skelett, Schattenwandler und die schweren Kolosse. Arme/Beine per IK. */
import { Px } from '../draw';
import type { Pt } from '../draw';
import type { Ramp } from '../palette';
import { ik, limb, pk } from './kit';
import type { Fr } from './kit';

export type BMood = 'n' | 'blink' | 'angry' | 'open' | 'shut';
export interface BPose { dx: number; dy: number; lean: number; feet: [Pt, Pt]; armN: Pt; armF: Pt; head: Pt; mood: BMood; fr: Fr }
export interface BKey { hip: Pt; sh: Pt; neck: Pt; G: number; handN: Pt; handF: Pt; cx: number }
export interface BLook {
  w: number; h: number; cx?: number;
  hip: number; torsoH: number; stance: number; legR: [number, number]; legs?: boolean;
  armL: number; armR: [number, number]; armRF?: [number, number]; shN: Pt; shF: Pt;
  skin: Ramp; far: Ramp;
  torso(l: Px, k: BKey, b: BPose): void;
  head(l: Px, x: number, y: number, b: BPose): void;
  hand?(l: Px, h: Pt, b: BPose, near: boolean): void;
  foot?(l: Px, x: number, y: number, near: boolean): void;
  behind?(p: Px, k: BKey, b: BPose): void;
  over?(p: Px, k: BKey, b: BPose): void;
}
export type BStyle = 'throw' | 'slash' | 'slam';

export function bipPose(fr: Fr, style: BStyle, A: number): BPose {
  const i = fr.i;
  const b: BPose = { dx: 0, dy: 0, lean: 0, feet: [[0, 0], [0, 0]], armN: [1, A * 0.9], armF: [2, A * 0.85], head: [0, 0], mood: 'n', fr };
  switch (fr.a) {
    case 'idle': b.dy = [0, 0, 1, 1][i]; b.head = [0, [0, 0, 0, 1][i]]; if (i === 3) b.mood = 'blink'; break;
    case 'move': {
      const S = A * 0.4 + 1.5, c = Math.cos(fr.ph), s = Math.sin(fr.ph);
      b.feet = [[S * c, 2.5 * Math.max(0, -s)], [-S * c, 2.5 * Math.max(0, s)]]; b.dy = [0, 1, 0, 0, 1, 0][i]; b.lean = 1;
      b.armN = [1 - c * A * 0.4, A * 0.85]; b.armF = [2 + c * A * 0.4, A * 0.8]; break;
    }
    case 'windup':
      b.mood = 'angry';
      if (style === 'throw') { b.dx = -1; b.lean = [-1, -2][i]; b.armN = pk([[-3, -A * 0.8], [-4, -A]], i); b.armF = [A * 0.8, -1]; }
      else if (style === 'slash') { b.dx = [-1, -2][i]; b.lean = [-1, -2][i]; b.armN = pk([[-1, -A], [-3, -A]], i); b.armF = [3, 1]; b.feet = [[2, 0], [-1, 0]]; }
      else { b.dy = [0, -1][i]; b.lean = [-1, -2][i]; b.armN = pk([[2, -A * 0.85], [0, -A]], i); b.armF = pk([[3, -A * 0.85], [1, -A * 0.95]], i); }
      break;
    case 'attack':
      b.mood = 'open';
      if (style === 'throw') { b.dx = [2, 2, 1][i]; b.lean = [2, 3, 1][i]; b.armN = pk([[A, -2], [A * 0.9, 2], [A * 0.5, A * 0.6]], i); b.armF = [-1, A * 0.7]; b.feet = [[2, 0], [-2, 0]]; }
      else if (style === 'slash') { b.dx = [3, 4, 2][i]; b.lean = [3, 3, 1][i]; b.armN = pk([[A, -2], [A * 0.8, A * 0.5], [A * 0.5, A * 0.8]], i); b.armF = [2, 2]; b.feet = [[3, 0], [-3, 0]]; }
      else { b.dx = [1, 2, 1][i]; b.dy = [0, 2, 1][i]; b.lean = [2, 4, 2][i]; b.armN = pk([[A * 0.8, -A * 0.4], [A * 0.7, A * 0.7], [A * 0.5, A * 0.8]], i); b.armF = pk([[A * 0.8 + 1, -A * 0.4], [A * 0.7 + 2, A * 0.7], [A * 0.5 + 1, A * 0.8]], i); b.feet = [[2, 0], [-2, 0]]; }
      break;
    case 'hit': b.mood = 'shut'; b.dx = [-2, -1][i]; b.lean = [-2, -1][i]; b.head = pk([[-1, -1], [0, 0]], i); b.armN = pk([[-2, A * 0.6], [0, A * 0.85]], i); b.armF = pk([[4, A * 0.4], [3, A * 0.8]], i); break;
    case 'death': b.mood = 'shut'; b.dx = -2; b.lean = -3; b.head = [-2, -1]; b.armN = [-3, -2]; b.armF = [4, -1]; b.feet = [[1, 0], [-2, 1]]; break;
  }
  return b;
}

export function biped(p: Px, L: BLook, b: BPose): BKey {
  const G = L.h - 5, cx = L.w / 2 + (L.cx ?? 0);
  const hip: Pt = [cx + b.dx, G - L.hip + b.dy], sh: Pt = [hip[0] + b.lean, hip[1] - L.torsoH];
  const neck: Pt = [sh[0] + b.head[0] + b.lean * 0.3, sh[1] + b.head[1]];
  const sN: Pt = [sh[0] + L.shN[0], sh[1] + L.shN[1]], sF: Pt = [sh[0] + L.shF[0], sh[1] + L.shF[1]];
  const hN: Pt = [sN[0] + b.armN[0], sN[1] + b.armN[1]], hF: Pt = [sF[0] + b.armF[0], sF[1] + b.armF[1]];
  const k: BKey = { hip, sh, neck, G, handN: hN, handF: hF, cx };
  const arm = (l: Px, s: Pt, h: Pt, near: boolean): void => {
    const r = near ? L.skin : L.far, ar = near ? L.armR : L.armRF ?? L.armR, e = ik(s, h, L.armL / 2 + 0.3, L.armL / 2 + 0.3, 1);
    limb(l, s, e, ar[0], (ar[0] + ar[1]) / 2, r, near ? 1 : 0); limb(l, e, h, (ar[0] + ar[1]) / 2, ar[1], r, near ? 1 : 0);
    L.hand?.(l, h, b, near);
  };
  const leg = (l: Px, near: boolean): void => {
    if (L.legs === false) return;
    const f = b.feet[near ? 0 : 1], r = near ? L.skin : L.far, a: Pt = [hip[0] + (near ? -1 : 1.5), hip[1]];
    const ft: Pt = [cx + b.dx + (near ? -L.stance : L.stance) + f[0], G + 0.4 - Math.max(1.3, L.legR[1]) - f[1]], j = ik(a, ft, L.hip / 2 + 0.5, L.hip / 2 + 0.5, -1);
    limb(l, a, j, L.legR[0], (L.legR[0] + L.legR[1]) / 2, r, near ? 1 : 0); limb(l, j, ft, (L.legR[0] + L.legR[1]) / 2, L.legR[1], r, near ? 1 : 0);
    if (L.foot) L.foot(l, ft[0], ft[1], near); else l.ell(ft[0] + 1, ft[1] - 0.1, L.legR[1] + 1, 1.2, r[near ? 2 : 1]);
  };
  L.behind?.(p, k, b);
  p.layer((l) => { leg(l, false); arm(l, sF, hF, false); });
  p.layer((l) => { leg(l, true); L.torso(l, k, b); L.head(l, neck[0], neck[1], b); });
  p.layer((l) => arm(l, sN, hN, true));
  L.over?.(p, k, b);
  return k;
}
