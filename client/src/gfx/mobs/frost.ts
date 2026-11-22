/** Gegner des Frostgebirges: Frostwolf, Eiswicht, Schneebrute, Frostwisp. */
import { Px, crystal, tube } from '../draw';
import type { Pt } from '../draw';
import { P, INK, WHITE, alpha } from '../palette';
import type { Ramp } from '../palette';
import { R, TAU, debris, deathFx, dissolve, dots, floatState, form, glow, limb, pk, puff, shatter, spark } from './kit';
import type { Fr, MobDef, MobFn } from './kit';
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
  w: 48, h: 48, cx: -1, hip: 12, torsoH: 17, stance: 5, legR: [3.8, 3.4], armL: 16, armR: [4, 3.6], armRF: [3.2, 3], shN: [-8, 4], shF: [8, 4], skin: FUR, far: FUR_FAR,
  // dicke, zottelige Glieder
  seg: (l, a, b, part, _idx, near) => {
    const r = near ? FUR : FUR_FAR, w = part === 'leg' ? 3.8 : near ? 4 : 3.2;
    limb(l, a, b, w, w - 0.3, r, near ? 1 : 0);
    for (const t of [0.25, 0.7]) {
      const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
      l.poly([[x - w, y - 1], [x - w - 1.5, y + 3.5], [x - w + 2, y + 1]], r[near ? 2 : 1]); l.poly([[x + w - 2, y + 1], [x + w, y + 4.5], [x + w + 0.6, y]], r[near ? 1 : 0]);
    }
  },
  torso: (l, k) => {
    const cx = (k.hip[0] + k.sh[0]) / 2, cy = (k.hip[1] + k.sh[1]) / 2;
    form(l, (m) => {
      m.ell(cx, cy - 0.5, 11.5, 11.5, 1); m.ell(k.sh[0] - 1, k.sh[1] + 4.5, 12.5, 7, 1);
      for (let s = 0; s < 8; s++) { const x = cx - 10.5 + s * 3, y = cy + 8.5 + (s === 0 || s === 7 ? -4 : s % 2 ? 1 : 2.5); m.poly([[x - 2, y - 2], [x, y + 3.5], [x + 2, y - 2]], 1); }
      for (let s = 0; s < 5; s++) { const y = cy - 8 + s * 4; m.poly([[cx - 10.5, y - 2], [cx - 14, y + 2], [cx - 9.5, y + 2]], 1); m.poly([[cx + 10.5, y - 2], [cx + 13.5, y + 2.5], [cx + 9.5, y + 2]], 1); }
    }, FUR, 1, 4, 0.1);
    // Zotteln und Frostkrusten
    for (const [dx, dy] of [[-6, -6], [1, -8], [6, -3], [-2, -1], [4, 3], [-7, 3], [0, 6], [8, 6], [-4, 8], [-9, -1]] as const) { l.set(R(cx + dx), R(cy + dy), FUR[1]); l.set(R(cx + dx) + 1, R(cy + dy) + 1, FUR[1]); l.set(R(cx + dx) - 1, R(cy + dy) + 1, FUR[2]); l.set(R(cx + dx), R(cy + dy) + 2, FUR[2]); }
    for (const [dx, dy, h] of [[7, 2, 4], [10, 0, 3], [-10, 5, 4], [3, 9, 3]] as const) { l.line(R(cx + dx), R(cy + dy), R(cx + dx), R(cy + dy + h), P.ice[3]); l.set(R(cx + dx), R(cy + dy), WHITE); l.set(R(cx + dx) - 1, R(cy + dy), P.ice[2]); l.set(R(cx + dx) + 1, R(cy + dy), P.ice[2]); }
  },
  head: (l, x, y, b) => {
    const hx = R(x + 3), hy = R(y - 1);
    // geschwungene Hörner
    l.poly([[hx - 4, hy - 4], [hx - 8.5, hy - 10], [hx - 5.5, hy - 10.5], [hx - 1, hy - 5.5]], P.bone[3]); l.line(hx - 7, hy - 9, hx - 4, hy - 6, P.bone[4]); l.set(hx - 3, hy - 5, P.bone[1]);
    l.poly([[hx + 2, hy - 5.5], [hx + 7, hy - 10], [hx + 9.5, hy - 8.5], [hx + 6, hy - 3.5]], P.bone[2]); l.set(hx + 8, hy - 9, P.bone[4]);
    form(l, (m) => { m.ell(hx, hy, 6.9, 6, 1); for (let s = 0; s < 5; s++) m.poly([[hx - 6 + s * 3, hy + 3], [hx - 5 + s * 3, hy + 8 - (s === 4 ? 3 : s === 0 ? 1 : 0)], [hx - 3 + s * 3, hy + 3]], 1); }, FUR, 1, 4, 0.14);
    // ledriges Gesicht mit Wulstbraue, Unterbiss und Hauern
    l.ell(hx + 2.5, hy + 1, 4.6, 3.8, HIDE[1]); l.rect(hx - 1, hy - 1, 8, 1, HIDE[2]); l.rect(hx - 2, hy - 2, 9, 1, FUR[1]); l.rect(hx - 1, hy - 3, 7, 1, FUR[2]);
    if (b.mood === 'shut') { l.rect(hx, hy, 2, 1, HIDE[0]); l.rect(hx + 4, hy, 2, 1, HIDE[0]); }
    else { l.rect(hx, hy, 2, 2, WHITE); l.set(hx + 1, hy + 1, INK); l.rect(hx + 4, hy, 2, 2, WHITE); l.set(hx + 5, hy + 1, INK); if (b.mood !== 'n') { l.set(hx, hy, HIDE[0]); l.set(hx + 5, hy, HIDE[0]); l.rect(hx + 2, hy, 2, 1, HIDE[0]); } if (b.mood === 'blink') { l.rect(hx, hy, 2, 1, HIDE[1]); l.rect(hx + 4, hy, 2, 1, HIDE[1]); } }
    l.set(hx + 3, hy + 2, HIDE[0]);
    if (b.mood === 'open' || b.mood === 'angry') { l.rect(hx, hy + 3, 7, 2, P.red[0]); l.rect(hx + 2, hy + 4, 3, 1, P.red[2]); } else l.rect(hx, hy + 4, 7, 1, HIDE[0]);
    l.rect(hx, hy + 2, 1, 3, WHITE); l.rect(hx + 6, hy + 2, 1, 3, WHITE);
  },
  hand: (l, h, _b, near) => {
    l.ball(h[0], h[1], near ? 4.3 : 3.4, near ? 4 : 3.2, HIDE, near ? 1 : 0, near ? 4 : 2);
    if (near) { l.px([h[0] - 3, h[1] + 3, h[0] - 1, h[1] + 4, h[0] + 1, h[1] + 4, h[0] + 3, h[1] + 3], P.blue[0]); for (let s = 0; s < 4; s++) l.rect(R(h[0] - 4 + s * 2), R(h[1] - 5), 1, 2, FUR[3 - (s & 1)]); }
  },
  foot: (l, x, y, near) => { l.ell(x + 1.5, y + 0.9, 5, 2.4, near ? HIDE[2] : HIDE[1]); l.px([x + 3, y + 2, x + 5, y + 2, x + 1, y + 2], P.blue[0]); },
  over: (p, k, b) => {
    const a = b.fr.a, i = b.fr.i;
    if (a === 'idle' && i >= 1) puff(p, k.neck[0] + 13 + i, k.neck[1] + 2 - i, 2 + i * 0.6, 1.6 + i * 0.3, WHITE, 150 - i * 30);
    if (a === 'windup' && i === 1) { puff(p, k.neck[0] + 13, k.neck[1] + 1, 3.5, 2.5, WHITE, 140); dots(p, [k.neck[0] + 16, k.neck[1] - 2, k.neck[0] + 17, k.neck[1] + 3], P.ice[2]); }
    if (a === 'attack' && i === 1) { debris(p, k.handN[0] + 3, k.G, 0.6, 3, 10, [WHITE, P.ice[2], P.ice[3]], 9, 9); puff(p, k.handN[0] + 3, k.G - 2, 6, 2.5, WHITE, 150); }
    if (a === 'attack' && i === 2) debris(p, k.handN[0] + 3, k.G, 1, 3, 8, [P.ice[2], P.ice[3]], 11, 5);
    if (a === 'move' && (i === 1 || i === 4)) dots(p, [k.cx - 12, k.G, k.cx + 11, k.G - 1, k.cx - 10, k.G - 2], P.ice[2]);
  },
};
function brutePose(fr: Fr): ReturnType<typeof bipPose> {
  const b = bipPose(fr, 'slam', 16);
  b.lean += 2; b.armN = [b.armN[0] + 1, Math.min(b.armN[1], 15)]; b.armF = [b.armF[0], Math.min(b.armF[1], 15)];
  if (fr.a === 'move') { const c = Math.cos(fr.ph); b.armN = [1 - c * 4, 15 - Math.max(0, Math.sin(fr.ph)) * 3]; b.armF = [2 + c * 4, 15 - Math.max(0, -Math.sin(fr.ph)) * 3]; b.lean += 1; }
  if (fr.a === 'windup') { b.armN = pk([[3, -9], [1, -11]], fr.i); b.armF = pk([[4, -9], [3, -10]], fr.i); b.dy = 0; }
  if (fr.a === 'attack') { b.armN = pk([[9, -6], [8, 17], [7, 16]], fr.i); b.armF = pk([[7, -5], [6, 16], [5, 15]], fr.i); }
  return b;
}
const schneebrute: MobFn = (p, fr) => {
  const i = fr.i;
  if (fr.a === 'death' && i >= 1) {
    if (i === 1) { const b = brutePose({ ...fr, a: 'hit', i: 1 }); b.dy = 7; b.lean = 6; b.dx = 0; b.mood = 'shut'; b.armN = [5, 9]; b.armF = [5, 9]; biped(p, BRUTE, b); return; }
    // sackt zu einem Schneehaufen zusammen, aus dem die Hörner ragen
    const rx = [0, 0, 15, 13, 9][i], ry = [0, 0, 8.5, 5.5, 3][i];
    p.layer((l) => {
      l.poly([[18, 43 - ry * 1.5], [14.5, 34 - ry * 1.3], [17.5, 34 - ry * 1.3], [21, 42 - ry * 1.5]], P.bone[3]); l.poly([[27, 42 - ry * 1.5], [31, 34.5 - ry * 1.2], [33, 36 - ry * 1.2], [30, 43 - ry * 1.4]], P.bone[2]);
      form(l, (m) => { m.ell(23, 43 - ry + 1, rx, ry, 1); m.ell(17, 43 - ry * 0.7, rx * 0.6, ry * 0.8, 1); m.rect(0, 44, 48, 4, 0); }, FUR, 1, 4, 0.06);
      l.px([15, 41, 22, 40, 28, 41, 25, 38, 19, 39, 31, 41, 12, 42], FUR[1]); if (i === 2) { l.ell(32, 39, 4, 3.2, HIDE[1]); l.set(31, 38, HIDE[3]); l.px([29, 42, 31, 42, 33, 42], P.blue[0]); }
    });
    if (i === 2) puff(p, 23, 28, 10, 4, WHITE, 110);
    dots(p, [[], [], [6, 36, 40, 34, 10, 28, 36, 26], [8, 38, 38, 37, 23, 32], [13, 40, 32, 39]][i], WHITE);
    if (i === 4) p.alphaMul(0.55);
    return;
  }
  biped(p, BRUTE, brutePose(fr));
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
