/** Gegner des Frostgebirges: Frostwolf, Eiswicht, Schneebrute, Frostwisp. */
import { Px, crystal, tube } from '../draw';
import type { Pt } from '../draw';
import { P, INK, WHITE, alpha } from '../palette';
import type { Ramp } from '../palette';
import { R, TAU, debris, deathFx, dissolve, dots, floatState, form, glow, puff, shatter, spark } from './kit';
import type { MobDef, MobFn } from './kit';
import { quad, quadPose } from './quad';
import type { QLook } from './quad';
import { biped, bipPose } from './biped';
import type { BLook } from './biped';
import { bushyTail, wolfHead } from './gruenwald';

// ================================================================ Frostwolf
const FROST: Ramp = [P.ice[0], P.snow[1], P.snow[2], P.snow[3], P.snow[4]];
const FROST_FAR: Ramp = [P.ice[0], P.snow[0], P.snow[0], P.snow[1], P.snow[1]];
const FROST_UNDER: Ramp = [P.ice[0], P.ice[1], P.ice[2], P.ice[3], P.ice[4]];
const FWOLF: QLook = {
  w: 48, h: 40, coat: FROST, far: FROST_FAR, under: FROST_UNDER,
  hip: [15.5, 21.5], sh: [27, 21], rump: [5, 4.7], chest: [5.6, 5.9], neck: [7, -6.5], neckR: 2.7, tuck: 3,
  legF: [5.7, 6, 1.8, 1.15], legH: [4.8, 4.6, 2, 1.1], hock: [-1.8, -4], paw: 1.8,
  head: (l, x, y, q) => { wolfHead(l, x, y, q.jaw, q.ear, q.eye, FROST, P.blue[3], FROST_UNDER); if (q.eye !== 'shut' && q.eye !== 'blink') l.set(R(x), R(y) - 1, P.ice[4]); },
  tail: (l, x, y, q) => bushyTail(l, x, y, q.tail, FROST, P.ice[2], 8),
  back: (l, k, q) => {
    // Eiskamm vom Nacken bis zur Kruppe
    const pts: Pt[] = [[k.head[0] - 4, k.head[1] - 1], [k.sh[0] - 1, k.sh[1] - 6], [k.sh[0] - 5, k.sh[1] - 5.2], [(k.sh[0] + k.hip[0]) / 2, (k.sh[1] + k.hip[1]) / 2 - 4.6], [k.hip[0] + 1, k.hip[1] - 4.6]];
    const hs = [4, 6.5, 5.5, 4.5, 3], bristle = q.fr.a === 'windup' ? 1.5 : 0;
    pts.forEach((b, s) => crystal(l, b[0], b[1] + 1, b[0] - 2.2, b[1] - hs[s] - bristle, 1.5, P.ice));
    l.px([k.hip[0] + 4, k.hip[1], k.sh[0] - 3, k.sh[1] + 1, k.hip[0] + 7, k.hip[1] + 1], P.snow[1]);
    l.px([k.sh[0] + 3, k.sh[1] + 2, k.sh[0] + 4, k.sh[1] + 3], P.snow[4]);
  },
  foot: (l, x, y, near) => { l.ell(x + 1, y - 0.1, 1.8, 1.3, near ? P.ice[3] : P.ice[1]); if (near) l.set(R(x + 2), R(y - 0.5), WHITE); },
  over: (p, k, q) => {
    const a = q.fr.a, i = q.fr.i;
    if ((a === 'idle' && (i === 1 || i === 2)) || a === 'windup') puff(p, k.head[0] + 11 + i, k.head[1] + 3 - (a === 'idle' ? i : 0), 2.2 + i * 0.4, 1.6, P.ice[3], 120 - i * 30);
    if (a === 'attack' && i === 1) { spark(p, k.head[0] + 10, k.head[1] + 3, WHITE, P.ice[3]); dots(p, [k.head[0] + 8, k.head[1] - 2, k.head[0] + 11, k.head[1] + 7], P.ice[4]); }
    if (a === 'move' && (i === 1 || i === 4)) dots(p, [k.hip[0] - 7, k.G, k.hip[0] - 10, k.G - 2, k.hip[0] - 8, k.G - 3], WHITE);
  },
};
const frostwolf: MobFn = (p, fr) => {
  if (fr.a === 'death' && fr.i >= 2) {
    // erstarrt zu Eis und zerspringt
    const b = new Px(48, 40); quad(b, FWOLF, quadPose({ ...fr, i: 2 }, 'pounce')); b.tint(P.ice[2], [0, 0, 0.45, 0.6, 0.6][fr.i]);
    if (fr.i >= 3) { const s = shatter(b, fr.i === 3 ? 0.6 : 1, 35, 6, { cell: 4, heap: 2, cx: 23, pop: 2 }); if (fr.i === 4) { dissolve(s, 0.6, 2); s.alphaMul(0.5); } p.draw(s); } else p.draw(b);
    for (const [x, y] of [[12, 24], [24, 19], [34, 25], [18, 17]].slice(0, 5 - fr.i)) spark(p, x, y - fr.i, WHITE, alpha(P.ice[4], 200));
    return;
  }
  quad(p, FWOLF, quadPose(fr, 'pounce'));
};

// ================================================================ Eiswicht
const WSKIN: Ramp = [P.blue[0], P.blue[1], P.blue[2], P.blue[3], P.ice[3]];
const WFAR: Ramp = [P.blue[0], P.blue[0], P.blue[1], P.blue[1], P.blue[2]];
function icicle(l: Px, x: number, y: number, dx: number, dy: number, len = 7): void {
  const n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n;
  l.poly([[x - uy * 1.6, y + ux * 1.6], [x + ux * len, y + uy * len], [x + uy * 1.6, y - ux * 1.6]], P.ice[3]);
  l.line(R(x), R(y), R(x + ux * (len - 2)), R(y + uy * (len - 2)), WHITE); l.set(R(x + uy), R(y - ux), P.ice[1]);
}
const WICHT: BLook = {
  w: 32, h: 32, hip: 5, torsoH: 5, stance: 1.5, legR: [1.3, 1], armL: 6, armR: [1.2, 1], shN: [0, 1], shF: [2, 1], skin: WSKIN, far: WFAR,
  torso: (l, k) => {
    const x = (k.hip[0] + k.sh[0]) / 2, y = (k.hip[1] + k.sh[1]) / 2 + 0.5;
    l.ball(x, y, 3.6, 3.9, P.steel, 1, 3); l.rect(R(x - 3), R(y + 2), 7, 1, P.snow[3]); l.px([x - 3, y + 3, x - 1, y + 3, x + 1, y + 3, x + 3, y + 3], P.snow[2]); l.rect(R(x - 3), R(y), 7, 1, P.wood[2]); l.set(R(x + 1), R(y), P.gold[3]);
  },
  head: (l, x, y, b) => {
    const hx = R(x + 1), hy = R(y - 4), flop = b.fr.a === 'move' ? (b.fr.i & 1) : b.fr.a === 'hit' ? 3 : 0;
    // Kapuze mit Zipfel und Schneebommel
    l.poly([[hx - 4, hy - 3], [hx - 7, hy - 8 + flop], [hx - 10, hy - 5 + flop * 1.5], [hx - 7, hy - 6 + flop], [hx - 1, hy - 4]], P.forest[2]); l.ball(hx - 10, hy - 4.5 + flop * 1.5, 1.5, 1.5, P.snow, 2, 4);
    l.ball(hx - 1, hy - 1, 5.4, 4.8, P.forest, 1, 4);
    // Ohr, Gesicht, lange Nase
    l.poly([[hx - 2, hy], [hx - 6, hy - 2], [hx - 2, hy + 2.5]], WSKIN[2]); l.set(hx - 4, hy, WSKIN[1]);
    l.ball(hx + 1, hy + 0.6, 3.7, 3.3, WSKIN, 2, 4);
    for (const [dx, dy] of [[-2, -2], [-1, -3], [0, -3], [1, -3], [2, -3], [3, -2], [4, -1], [-3, -1], [-3, 0], [-3, 1], [-2, 2]] as const) l.set(hx + dx, hy + dy, (dx + dy) & 1 ? P.snow[4] : P.snow[3]);
    l.rect(hx + 4, hy + 1, 3, 1, WSKIN[3]); l.set(hx + 7, hy + 1, P.pink[3]); l.set(hx + 5, hy + 2, WSKIN[2]);
    if (b.mood === 'shut') { l.rect(hx - 3, hy - 2, 8, 2, P.forest[2]); l.rect(hx - 2, hy, 6, 1, P.snow[3]); }
    else { l.rect(hx, hy - 1, 2, 2, WHITE); l.set(hx + 1, hy, INK); l.rect(hx + 3, hy - 1, 1, 2, WHITE); l.set(hx + 3, hy, INK); if (b.mood === 'blink') { l.rect(hx, hy - 1, 2, 1, WSKIN[2]); l.set(hx + 3, hy - 1, WSKIN[2]); } if (b.mood === 'angry' || b.mood === 'open') l.px([hx - 1, hy - 2, hx, hy - 2, hx + 1, hy - 1], WSKIN[0]); }
    if (b.mood === 'open') { l.rect(hx + 1, hy + 3, 3, 1, INK); l.set(hx + 2, hy + 3, WHITE); } else l.px([hx + 1, hy + 3, hx + 2, hy + 3], WSKIN[0]);
  },
  hand: (l, h, b, near) => {
    l.ball(h[0], h[1], 1.5, 1.5, P.snow, 1, 3);
    if (!near) return;
    const a = b.fr.a, i = b.fr.i;
    if (a === 'windup') icicle(l, h[0], h[1] - 1, -0.35 - i * 0.2, -1, 8);
    else if (a === 'attack') { if (i === 0) icicle(l, h[0] + 3, h[1], 1, 0.05, 8); }
    else if (a === 'idle') icicle(l, h[0], h[1] - 1 - [0, 2, 3, 1][i], 0.2, -1, 6);
    else if (a === 'move') icicle(l, h[0], h[1] - 1, 0.5, -1, 6);
  },
  behind: (p, k, b) => {
    // Schal weht hinterher
    const w = Math.sin(b.fr.ph + b.fr.i * 0.9) * 1.5, mv = b.fr.a === 'move' || b.fr.a === 'attack' ? 2 : 0;
    p.layer((l) => { tube(l, [[k.neck[0] - 1, k.neck[1] + 0.5], [k.neck[0] - 5 - mv, k.neck[1] + 2 + w * 0.5 - mv], [k.neck[0] - 8 - mv * 1.5, k.neck[1] + 3 + w - mv]], 1.2, 0.8, P.red, 1); });
  },
  over: (p, k, b) => {
    const a = b.fr.a, i = b.fr.i;
    if (a === 'idle' && i >= 2) puff(p, k.neck[0] + 9, k.neck[1] - 2 - (i - 2), 1.8, 1.3, WHITE, 120);
    if (a === 'attack' && i === 1) { p.layer((l) => icicle(l, 24, k.handN[1] - 2, 1, 0.05, 7)); dots(p, [21, k.handN[1] - 3, 19, k.handN[1] - 1], P.ice[4]); }
    if (a === 'windup' && i === 1) spark(p, k.handN[0] - 4, k.handN[1] - 9, WHITE, P.ice[4]);
  },
};
const eiswicht: MobFn = (p, fr) => {
  if (fr.a === 'death' && fr.i >= 1) {
    // gefriert und zerspringt
    const b = new Px(32, 32); biped(b, WICHT, bipPose({ ...fr, i: 0 }, 'throw', 6)); b.tint(P.ice[3], 0.55 + fr.i * 0.08);
    deathFx(p, b, fr.i, 'shatter', 27, 14, { cell: 3, heap: 2, cx: 15, pop: 3 });
    for (const [x, y] of [[8, 14], [22, 12], [15, 9], [25, 19]].slice(0, 4 - fr.i)) spark(p, x, y - fr.i, WHITE, alpha(P.ice[4], 200));
    return;
  }
  const b = bipPose(fr, 'throw', 6);
  if (fr.a === 'idle') { b.dx = [0, 1, 0, -1][fr.i] * 0.5; b.armN = [2, 3]; }
  biped(p, WICHT, b);
};

// ================================================================ Schneebrute
const FUR: Ramp = [P.snow[0], P.snow[1], P.snow[2], P.snow[3], P.snow[4]];
const FUR_FAR: Ramp = [P.ice[0], P.snow[0], P.snow[1], P.snow[1], P.snow[2]];
const HIDE: Ramp = [P.blue[0], P.ice[0], P.ice[1], P.ice[2], P.ice[3]];
const BRUTE: BLook = {
  w: 48, h: 48, cx: -1, hip: 11, torsoH: 14, stance: 4.5, legR: [3.3, 3], armL: 15, armR: [3.5, 3.3], armRF: [3, 2.8], shN: [-6, 3], shF: [7, 3], skin: FUR, far: FUR_FAR,
  torso: (l, k) => {
    const cx = (k.hip[0] + k.sh[0]) / 2, cy = (k.hip[1] + k.sh[1]) / 2;
    form(l, (m) => {
      m.ell(cx, cy - 0.5, 10, 10.5, 1); m.ell(k.sh[0] - 1, k.sh[1] + 3.5, 10.5, 6, 1);
      for (let s = 0; s < 7; s++) { const x = cx - 9 + s * 3, y = cy + 6.5 + (s === 0 || s === 6 ? -3 : s % 2 ? 1 : 2); m.poly([[x - 2, y - 2], [x, y + 3], [x + 2, y - 2]], 1); }
      for (let s = 0; s < 4; s++) { const y = cy - 6 + s * 4; m.poly([[cx - 9, y - 2], [cx - 12.5, y + 1.5], [cx - 8, y + 2]], 1); m.poly([[cx + 9, y - 2], [cx + 12, y + 2], [cx + 8, y + 2]], 1); }
    }, FUR, 1, 4, 0.1);
    // Zotteln und Frostkrusten
    for (const [dx, dy] of [[-5, -4], [1, -6], [5, -2], [-2, 0], [3, 3], [-6, 3], [0, 5], [7, 5]] as const) { l.set(R(cx + dx), R(cy + dy), FUR[1]); l.set(R(cx + dx) + 1, R(cy + dy) + 1, FUR[1]); l.set(R(cx + dx) - 1, R(cy + dy) + 1, FUR[2]); }
    for (const [dx, dy, h] of [[6, 2, 3], [9, 0, 2], [-9, 4, 3]] as const) { l.line(R(cx + dx), R(cy + dy), R(cx + dx), R(cy + dy + h), P.ice[3]); l.set(R(cx + dx), R(cy + dy), WHITE); l.set(R(cx + dx) - 1, R(cy + dy), P.ice[2]); }
  },
  head: (l, x, y, b) => {
    const hx = R(x + 3), hy = R(y - 1);
    l.poly([[hx - 4, hy - 3], [hx - 6.5, hy - 8.5], [hx - 1, hy - 4.5]], P.bone[3]); l.set(hx - 6, hy - 8, P.bone[4]); l.set(hx - 3, hy - 4, P.bone[1]);
    l.poly([[hx + 2, hy - 4.5], [hx + 6.5, hy - 8], [hx + 5.5, hy - 3]], P.bone[2]); l.set(hx + 6, hy - 7, P.bone[4]);
    form(l, (m) => { m.ell(hx, hy, 6.2, 5.4, 1); for (let s = 0; s < 4; s++) m.poly([[hx - 5 + s * 3, hy + 3], [hx - 4 + s * 3, hy + 7 - (s === 3 ? 2 : 0)], [hx - 2 + s * 3, hy + 3]], 1); }, FUR, 1, 4, 0.14);
    // ledriges Gesicht
    l.ell(hx + 2.5, hy + 1, 3.8, 3.2, HIDE[1]); l.rect(hx, hy - 1, 6, 1, HIDE[2]); l.rect(hx - 1, hy - 2, 7, 1, FUR[1]);
    if (b.mood === 'shut') { l.rect(hx, hy, 2, 1, HIDE[0]); l.rect(hx + 4, hy, 2, 1, HIDE[0]); } else { l.set(hx + 1, hy, WHITE); l.set(hx + 4, hy, WHITE); l.set(hx + 2, hy, INK); l.set(hx + 5, hy, INK); if (b.mood === 'angry' || b.mood === 'open') { l.set(hx, hy - 1, HIDE[0]); l.set(hx + 1, hy - 1, HIDE[0]); l.set(hx + 5, hy - 1, HIDE[0]); } }
    if (b.mood === 'open' || b.mood === 'angry') { l.rect(hx + 1, hy + 2, 5, 2, P.red[0]); l.set(hx + 3, hy + 3, P.red[2]); } else l.rect(hx + 1, hy + 3, 5, 1, HIDE[0]);
    l.set(hx + 1, hy + 2, WHITE); l.set(hx + 5, hy + 2, WHITE); l.set(hx + 1, hy + 1, WHITE);
  },
  hand: (l, h, _b, near) => { l.ball(h[0], h[1], near ? 3.7 : 3.1, near ? 3.5 : 3, HIDE, near ? 1 : 0, near ? 4 : 2); if (near) { l.px([h[0] - 2, h[1] + 3, h[0], h[1] + 3, h[0] + 2, h[1] + 3], P.blue[0]); for (let s = 0; s < 3; s++) l.set(R(h[0] - 3 + s * 2), R(h[1] - 4), FUR[3 - (s & 1)]); } },
  foot: (l, x, y, near) => { l.ell(x + 1.5, y - 0.6, 4.2, 2, near ? HIDE[2] : HIDE[1]); l.px([x + 3, y, x + 5, y], P.blue[0]); },
  over: (p, k, b) => {
    const a = b.fr.a, i = b.fr.i;
    if (a === 'idle' && i >= 1) puff(p, k.neck[0] + 12 + i, k.neck[1] + 1 - i, 2 + i * 0.6, 1.6 + i * 0.3, WHITE, 150 - i * 30);
    if (a === 'windup' && i === 1) { puff(p, k.neck[0] + 12, k.neck[1], 3.5, 2.5, WHITE, 140); dots(p, [k.neck[0] + 15, k.neck[1] - 3, k.neck[0] + 16, k.neck[1] + 2], P.ice[2]); }
    if (a === 'attack' && i === 1) { debris(p, k.handN[0] + 3, k.G, 0.6, 3, 10, [WHITE, P.ice[2], P.ice[3]], 9, 9); puff(p, k.handN[0] + 3, k.G - 2, 6, 2.5, WHITE, 150); }
    if (a === 'attack' && i === 2) debris(p, k.handN[0] + 3, k.G, 1, 3, 8, [P.ice[2], P.ice[3]], 11, 5);
    if (a === 'move' && (i === 1 || i === 4)) dots(p, [k.cx - 11, k.G, k.cx + 10, k.G - 1, k.cx - 9, k.G - 2], P.ice[2]);
  },
};
const schneebrute: MobFn = (p, fr) => {
  const i = fr.i;
  if (fr.a === 'death' && i >= 1) {
    if (i === 1) { const b = bipPose({ ...fr, i: 1 }, 'slam', 15); b.dy = 5; b.lean = 5; b.dx = 0; b.mood = 'shut'; b.armN = [5, 9]; b.armF = [5, 9]; biped(p, BRUTE, b); return; }
    // sackt zu einem Schneehaufen zusammen, aus dem die Hörner ragen
    const rx = [0, 0, 14, 12, 9][i], ry = [0, 0, 7.5, 5, 3][i];
    p.layer((l) => {
      l.poly([[18, 43 - ry * 1.5], [15.5, 36 - ry * 1.4], [21, 42 - ry * 1.5]], P.bone[3]); l.poly([[27, 42 - ry * 1.5], [31, 36 - ry * 1.3], [30, 43 - ry * 1.4]], P.bone[2]);
      form(l, (m) => { m.ell(23, 43 - ry + 1, rx, ry, 1); m.ell(18, 43 - ry * 0.7, rx * 0.6, ry * 0.8, 1); m.rect(0, 44, 48, 4, 0); }, FUR, 1, 4, 0.14);
      l.px([16, 41, 22, 40, 28, 41, 25, 38, 19, 39], FUR[1]); if (i === 2) { l.ell(31, 40, 3.2, 2.6, HIDE[1]); l.set(30, 39, HIDE[3]); }
    });
    if (i === 2) puff(p, 23, 30, 9, 4, WHITE, 110);
    dots(p, [[], [], [8, 36, 38, 34, 12, 30, 34, 28], [10, 38, 36, 37, 23, 33], [14, 40, 31, 39]][i], WHITE);
    if (i === 4) p.alphaMul(0.55);
    return;
  }
  const b = bipPose(fr, 'slam', 15);
  b.lean += 2; b.armN = [b.armN[0] + 1, Math.min(b.armN[1], 13)]; b.armF = [b.armF[0], Math.min(b.armF[1], 13)];
  if (fr.a === 'move') { const c = Math.cos(fr.ph); b.armN = [1 - c * 4, 12 - Math.max(0, Math.sin(fr.ph)) * 3]; b.armF = [2 + c * 4, 12 - Math.max(0, -Math.sin(fr.ph)) * 3]; b.lean += 1; }
  biped(p, BRUTE, b);
};

// ================================================================ Frostwisp
function frostCore(p: Px, cx: number, cy: number, rot: number, ext: number, flare: number, shut: boolean, jit: number): void {
  glow(p, cx, cy, 9 + flare * 4, P.ice[2], 50 + flare * 60);
  // Schneeflocken-Kranz: sechs Arme mit Seitenästen
  p.layer((l) => {
    for (let s = 0; s < 6; s++) {
      const a = rot + (s * TAU) / 6 + (jit ? Math.sin(s * 5.1) * jit : 0), c = Math.cos(a), sn = Math.sin(a) * 0.92, r0 = 6.5 + ext * 0.5, r1 = 10.5 + ext + (jit ? Math.cos(s * 3.3) * jit * 4 : 0);
      for (let r = r0; r <= r1; r += 0.8) l.set(R(cx + c * r - 0.5), R(cy + sn * r - 0.5), r > r1 - 1.2 ? WHITE : P.ice[3]);
      const bx = cx + c * (r1 - 2.5), by = cy + sn * (r1 - 2.5);
      l.set(R(bx - sn * 1.6 - 0.5), R(by + c * 1.5 - 0.5), P.ice[2]); l.set(R(bx + sn * 1.6 - 0.5), R(by - c * 1.5 - 0.5), P.ice[2]);
    }
  });
  // Kältedunst
  for (let s = 0; s < 3; s++) puff(p, cx - 1 + Math.sin(s * 2 + rot * 3) * 2, cy + 9 + s * 2.6, 2.6 - s * 0.6, 1.5, P.ice[3], 110 - s * 30);
  p.layer((l) => {
    const w = 4.6 + flare * 0.6, h = 7.2 + flare * 0.8;
    l.poly([[cx, cy - h], [cx + w, cy - 1], [cx, cy + h], [cx - w, cy - 1]], P.ice[2]);
    l.poly([[cx, cy - h], [cx, cy - 1], [cx - w, cy - 1]], P.ice[4]); l.poly([[cx - w, cy - 1], [cx, cy - 1], [cx, cy + h]], P.ice[3]); l.poly([[cx, cy - 1], [cx + w, cy - 1], [cx, cy + h]], P.ice[1]);
    l.line(R(cx - 0.5), R(cy - h + 1), R(cx - 0.5), R(cy + h - 2), WHITE); l.line(R(cx - w + 1), R(cy - 1), R(cx + w - 2), R(cy - 1), flare > 0.5 ? WHITE : P.ice[4]);
    l.set(R(cx - 2), R(cy - 4), WHITE);
    if (shut) { l.rect(R(cx - 3), R(cy + 1), 2, 1, P.blue[1]); l.rect(R(cx + 1), R(cy + 1), 2, 1, P.blue[1]); } else { l.rect(R(cx - 2), R(cy), 1, 2, P.blue[0]); l.rect(R(cx + 1), R(cy), 1, 2, P.blue[0]); if (flare > 0.5) { l.set(R(cx - 2), R(cy), WHITE); l.set(R(cx + 1), R(cy), WHITE); } }
  }, true);
}
const frostwisp: MobFn = (p, fr) => {
  const i = fr.i, z = floatState(fr), cx = 16 + z.dx * 0.7, cy = 13 + z.dy;
  const rot = fr.a === 'idle' ? (i * TAU) / 24 : fr.a === 'move' ? (i * TAU) / 36 : fr.a === 'windup' ? i * 0.5 : fr.a === 'attack' ? 1 + i * 0.6 : 0.2;
  if (fr.a === 'death' && i >= 1) {
    const b = new Px(32, 32); frostCore(b, 15, 13, 0.3 + i * 0.4, i * 1.2, 0, true, 0.5);
    deathFx(p, b, i, 'shatter', 27, 8, { cell: 3, heap: 1, cx: 15, spread: 1.4, pop: 2 });
    for (let k = 0; k < 6 - i; k++) spark(p, 15 + Math.cos(k * 1.9 + i) * (5 + i * 2.5), 12 + Math.sin(k * 1.9 + i) * (4 + i) + i * 2, WHITE, alpha(P.ice[4], 200 - i * 30));
    return;
  }
  frostCore(p, cx, cy, rot, fr.a === 'windup' ? [1, 2.5][i] : fr.a === 'attack' ? [-2, 0, 0][i] : 0, z.flare, z.shut, fr.a === 'hit' ? 0.5 : 0);
  if (fr.a === 'windup') for (let k = 0; k < 6; k++) { const a = k * 1.05 + i; p.set(R(cx + Math.cos(a) * (14 - i * 5)), R(cy + Math.sin(a) * (11 - i * 4)), WHITE); }
  if (fr.a === 'attack' && i < 2) { for (let k = 0; k < 3; k++) p.layer((l) => l.poly([[cx + 7 + i * 3, cy - 4 + k * 4 - 1], [cx + 12 + i * 3, cy - 4 + k * 4.5], [cx + 7 + i * 3, cy - 4 + k * 4 + 1]], P.ice[4])); }
  if (fr.a === 'move') dots(p, [cx - 9 - (i % 3), cy + 6, cx - 12, cy + 2 + (i & 1), cx - 7, cy + 10], WHITE);
};

export const FROSTG: Record<string, MobDef> = {
  frostwolf: { w: 48, h: 40, fn: frostwolf },
  eiswicht: { w: 32, h: 32, fn: eiswicht },
  schneebrute: { w: 48, h: 48, fn: schneebrute },
  frostwisp: { w: 32, h: 32, fn: frostwisp },
};
