/** Vierbeiner-Rig (Seitenansicht, Blick nach rechts): Wölfe, Hund, Nachtmahr. Beine per IK, Galoppzyklus, Sprung/Sturm/Aufbäumen. */
import { Px } from '../draw';
import type { Pt } from '../draw';
import type { Ramp } from '../palette';
import { R, form, ik, limb, pk, reramp } from './kit';
import type { Fr } from './kit';

export type QEye = 'n' | 'blink' | 'angry' | 'shut';
export interface QPose { hip: Pt; sh: Pt; feet: Pt[]; head: Pt; jaw: number; ear: number; eye: QEye; tail: number; lie: boolean; fr: Fr }
export interface QKey { hip: Pt; sh: Pt; head: Pt; G: number }
export interface QLook {
  w: number; h: number; coat: Ramp; far: Ramp; under?: Ramp;
  hip: Pt; sh: Pt; rump: Pt; chest: Pt; neck: Pt; neckR: number; tuck: number;
  legF: [number, number, number, number]; legH: [number, number, number, number]; hock: Pt; paw: number;
  head(l: Px, x: number, y: number, q: QPose): void;
  tail(l: Px, x: number, y: number, q: QPose): void;
  back?(l: Px, k: QKey, q: QPose): void;
  foot?(l: Px, x: number, y: number, near: boolean): void;
  behind?(p: Px, k: QKey, q: QPose): void;
  over?(p: Px, k: QKey, q: QPose): void;
}
export type QStyle = 'pounce' | 'charge' | 'rear';

/** Standardposen für alle 22 Frames (Tod: 0 Taumeln, 1 Einknicken, 2–4 liegend). */
export function quadPose(fr: Fr, style: QStyle): QPose {
  const i = fr.i;
  const q: QPose = { hip: [0, 0], sh: [0, 0], feet: [[0, 0], [0, 0], [0, 0], [0, 0]], head: [0, 0], jaw: 0, ear: 0, eye: 'n', tail: -0.6, lie: false, fr };
  const F = (hf: Pt, ff: Pt, hn: Pt, fn: Pt): void => { q.feet = [hf, ff, hn, fn]; };
  switch (fr.a) {
    case 'idle':
      q.sh = [0, [0, 0, 1, 1][i]]; q.hip = [0, [0, 0, 0, 1][i]]; q.head = [0, [0, 1, 1, 0][i]]; q.tail = [-0.35, -0.25, -0.35, -0.45][i];
      q.ear = i === 1 ? 0.5 : 0; if (i === 2) q.eye = 'blink'; break;
    case 'move': {
      const S = 6, L = 4, th = fr.ph, tf = fr.ph + 2.6;
      const ft = (t: number, s = S): Pt => [s * Math.cos(t), L * Math.max(0, -Math.sin(t))];
      F(ft(th + 0.55), ft(tf + 0.55), ft(th), ft(tf));
      q.hip = [0, R(1.4 * Math.sin(fr.ph + 0.5))]; q.sh = [0, R(1.4 * Math.sin(fr.ph + 3.1))];
      q.head = [1, R(0.9 * Math.sin(fr.ph + 2))]; q.tail = 0.25 + 0.25 * Math.sin(fr.ph + 1); q.ear = 0.7; break;
    }
    case 'windup':
      q.eye = 'angry'; q.ear = 1;
      if (style === 'pounce') { q.hip = pk([[-1, 0], [-1, -1]], i); q.sh = pk([[-2, 3], [-2, 4]], i); q.head = pk([[-1, 2], [0, 3]], i); q.jaw = i + 1; q.tail = [0.2, 0.6][i]; F([1, 0], [3, 0], [0, 0], [2, 0]); }
      else if (style === 'charge') { q.hip = pk([[0, 0], [-1, -1]], i); q.sh = pk([[-1, 2], [-2, 3]], i); q.head = pk([[1, 5], [1, 6]], i); q.jaw = 1; q.tail = [0.4, 0.8][i]; F([0, 0], [1, 0], [0, 0], i ? [3, 1] : [-3, 4]); }
      else { q.hip = pk([[-2, 1], [-2, 2]], i); q.sh = pk([[-4, -6], [-5, -10]], i); q.head = pk([[-3, -3], [-4, -4]], i); q.jaw = 1 + i; q.tail = [0.3, 0.7][i]; F([-1, 0], i ? [7, 17] : [5, 11], [1, 0], i ? [4, 14] : [3, 9]); }
      break;
    case 'attack':
      q.eye = 'angry'; q.ear = 1; q.tail = 0.5;
      if (style === 'pounce') {
        q.hip = pk([[2, -2], [3, -2], [2, 0]], i); q.sh = pk([[3, -5], [4, -1], [3, 1]], i); q.head = pk([[1, -2], [2, 1], [1, 1]], i); q.jaw = [3, 1, 0][i];
        if (i === 0) F([-3, 0], [7, 7], [-4, 0], [6, 6]); else if (i === 1) F([-2, 3], [7, 1], [-3, 4], [6, 0]); else F([2, 0], [4, 0], [1, 0], [3, 0]);
      } else if (style === 'charge') {
        q.hip = pk([[3, 0], [5, 0], [3, 0]], i); q.sh = pk([[5, 1], [7, 2], [4, 1]], i); q.head = pk([[3, 3], [4, 4], [2, 2]], i); q.jaw = [2, 0, 0][i];
        if (i === 0) F([-4, 1], [8, 4], [-5, 2], [7, 3]); else if (i === 1) F([-5, 4], [6, 0], [-6, 3], [8, 0]); else F([1, 0], [3, 0], [0, 0], [4, 0]);
      } else {
        q.hip = pk([[1, 0], [3, -1], [2, 0]], i); q.sh = pk([[1, -6], [4, 3], [2, 1]], i); q.head = pk([[1, -2], [5, 5], [2, 2]], i); q.jaw = [2, 1, 0][i];
        if (i === 0) F([0, 0], [11, 10], [1, 0], [9, 8]); else if (i === 1) F([-2, 2], [11, 0], [-3, 0], [9, 0]); else F([1, 0], [6, 0], [0, 0], [5, 0]);
      }
      break;
    case 'hit':
      q.eye = 'shut'; q.ear = 1; q.jaw = 1; q.tail = -1;
      q.hip = pk([[-2, 0], [-1, 0]], i); q.sh = pk([[-3, -2], [-2, 0]], i); q.head = pk([[-3, -3], [-2, -1]], i);
      F([0, 0], [-1, i ? 0 : 3], [-1, 0], [-2, i ? 0 : 2]); break;
    case 'death':
      q.eye = 'shut'; q.ear = 1; q.tail = -1;
      if (i === 0) { q.hip = [-2, 1]; q.sh = [-3, -3]; q.head = [-4, -4]; q.jaw = 2; F([0, 0], [0, 4], [-1, 0], [-1, 3]); }
      else if (i === 1) { q.hip = [0, 5]; q.sh = [0, 6]; q.head = [1, 6]; q.jaw = 1; F([-3, 0], [5, 0], [-4, 0], [4, 0]); }
      else { q.hip = [0, 8]; q.sh = [1, 7]; q.head = [2, 10]; q.lie = true; q.tail = 0; F([5, 0], [9, 0], [3, 0], [8, 0]); }
      break;
  }
  return q;
}

/** Zeichnet den Vierbeiner in p (mit Konturen). */
export function quad(p: Px, L: QLook, q: QPose): QKey {
  const G = L.h - 5;
  const hip: Pt = [L.hip[0] + q.hip[0], L.hip[1] + q.hip[1]], sh: Pt = [L.sh[0] + q.sh[0], L.sh[1] + q.sh[1]];
  const head: Pt = [sh[0] + L.neck[0] + q.head[0], sh[1] + L.neck[1] + q.head[1]];
  const k: QKey = { hip, sh, head, G };
  const legF = (l: Px, far: boolean, f: Pt): void => {
    const r = far ? L.far : L.coat, a: Pt = [sh[0] + (far ? 2 : 0), sh[1] + 2], b: Pt = [L.sh[0] + (far ? 3 : 0) + f[0], G - 0.9 - f[1]];
    const j = ik(a, b, L.legF[0], L.legF[1], -1);
    limb(l, a, j, L.legF[2], L.legF[3], r, far ? 0 : 1); limb(l, j, b, L.legF[3], L.legF[3] * 0.85, r, far ? 0 : 1);
    if (L.foot) L.foot(l, b[0], b[1], !far); else l.ell(b[0] + 1, b[1] - 0.1, L.paw, 1.3, r[far ? 1 : 3]);
  };
  const legH = (l: Px, far: boolean, f: Pt): void => {
    const r = far ? L.far : L.coat, a: Pt = [hip[0] + (far ? 2 : 0), hip[1] + 1], b: Pt = [L.hip[0] - 1 + (far ? 3 : 0) + f[0], G - 0.9 - f[1]];
    const lying = q.lie ? 0.3 : 1;
    const hk: Pt = [b[0] + L.hock[0] * lying - (q.lie ? 2 : 0), Math.min(G - 1, b[1] + L.hock[1] * lying)];
    const j = ik(a, hk, L.legH[0], L.legH[1], 1);
    limb(l, a, j, L.legH[2], L.legH[3] + 0.4, r, far ? 0 : 1); limb(l, j, hk, L.legH[3] + 0.3, L.legH[3], r, far ? 0 : 1); limb(l, hk, b, L.legH[3], L.legH[3] * 0.85, r, far ? 0 : 1);
    if (L.foot) L.foot(l, b[0], b[1], !far); else l.ell(b[0] + 1, b[1] - 0.1, L.paw, 1.3, r[far ? 1 : 3]);
  };
  L.behind?.(p, k, q);
  p.layer((l) => { legH(l, true, q.feet[0]); legF(l, true, q.feet[1]); });
  p.layer((l) => {
    L.tail(l, hip[0] - L.rump[0] + 1.5, hip[1] - L.rump[1] * 0.45, q);
    form(l, (m) => {
      m.ell(hip[0], hip[1] - 0.5, L.rump[0], L.rump[1], 1);
      m.ell(sh[0] - 1, sh[1], L.chest[0], L.chest[1], 1);
      m.poly([[hip[0] - 1, hip[1] - L.rump[1] - 0.5], [sh[0], sh[1] - L.chest[1]], [sh[0] - 1, sh[1] + L.chest[1] - 0.5], [(hip[0] + sh[0]) / 2, (hip[1] + sh[1]) / 2 + L.rump[1] - L.tuck], [hip[0] + 1, hip[1] + L.rump[1] - 1]], 1);
      const n0: Pt = [sh[0] + 1, sh[1] - L.chest[1] * 0.4], n1: Pt = [head[0] - 2, head[1] + 1.5], n = Math.ceil(Math.hypot(n1[0] - n0[0], n1[1] - n0[1]));
      for (let s = 0; s <= n; s++) { const t = s / Math.max(1, n); m.ell(n0[0] + (n1[0] - n0[0]) * t, n0[1] + (n1[1] - n0[1]) * t, L.neckR + (1 - t) * 1.2, L.neckR + (1 - t) * 1.2, 1); }
    }, L.coat, 1, 4, 0.02);
    if (L.under) { const u = L.under, yb = (x: number): number => { const t = (x - hip[0]) / Math.max(1, sh[0] - hip[0]); return hip[1] + (sh[1] - hip[1]) * t + L.rump[1] * 0.42; }; reramp(l, L.coat, u, (x, y) => y > yb(x) && x > hip[0] - 2); }
    L.back?.(l, k, q);
    L.head(l, head[0], head[1], q);
  });
  p.layer((l) => { legH(l, false, q.feet[2]); legF(l, false, q.feet[3]); });
  L.over?.(p, k, q);
  return k;
}
