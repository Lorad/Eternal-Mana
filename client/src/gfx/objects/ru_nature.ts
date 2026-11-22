/** Verlorene Ruinen – Bäume: knorriger Olivenbaum mit Ranken, Zypresse. */
import { Px, bez } from '../draw';
import { Frames, INK, LEAF_FINE, LEAF_NEEDLE, MARK, P, Ramp, anim, barkFill, crown, inkOutline, knot, limb, mix, moss, shadeArea } from './kit';
import { ARC, OLIVE, VINE, vineStrand } from './ru_kit';

const W = P.wood;
const OWOOD: Ramp = [mix(W[0], P.shadow[1], 0.3), mix(W[1], P.stone[1], 0.4), mix(W[2], P.stone[2], 0.45), mix(W[3], P.sand[3], 0.45), mix(W[4], P.cream[3], 0.5)];
const COOL = P.forest[0];

function vineTree(p: Px, f: number): void {
  // zwei ineinander verdrehte Stämme, weit ausgreifende Wurzeln
  const tr = new Px(p.w, p.h);
  limb(tr, bez([24, 76], [17, 63], [27, 49]), 6.2, 4.4); limb(tr, bez([32, 76], [39, 64], [28, 50]), 5.4, 4);
  limb(tr, bez([21, 73], [14, 76], [8, 79]), 3.6, 1.2); limb(tr, bez([35, 73], [42, 76], [48, 79]), 3.4, 1.2); limb(tr, bez([27, 75], [27, 78], [25, 79]), 3, 1.6); limb(tr, bez([30, 75], [33, 78], [36, 79]), 2.4, 1.2);
  limb(tr, bez([26, 51], [18, 44], [12, 33]), 3.8, 1.6); limb(tr, bez([30, 51], [38, 44], [45, 35]), 3.6, 1.6); limb(tr, bez([28, 51], [29, 41], [27, 28]), 3.8, 2);
  limb(tr, bez([16, 40], [10, 40], [6, 44]), 1.4, 0.7); limb(tr, bez([41, 41], [47, 41], [51, 45]), 1.4, 0.7);
  barkFill(tr, OWOOD, 61, MARK, 3);
  // Drehwuchs: schräge Furchen, Höhlung, Knoten
  for (let k = 0; k < 7; k++) { const y0 = 52 + k * 3.6; for (let i = 0; i < 9; i++) { const x = 20 + i + k, y = Math.round(y0 + i * 0.9); if (tr.get(x, y) >>> 24 && tr.get(x + 1, y) >>> 24 && tr.get(x - 1, y) >>> 24) { tr.set(x, y, OWOOD[0]); if (i % 3 === 0) tr.set(x, y - 1, OWOOD[4]); } } }
  tr.ell(26.5, 62, 2.2, 3.6, OWOOD[1]); tr.ell(26, 61.6, 1.8, 3, OWOOD[3]); tr.ell(27, 62.4, 1.5, 2.8, mix(OWOOD[0], INK, 0.4));
  knot(tr, 33.5, 68.5, 1.4, 1.8, OWOOD); knot(tr, 21.5, 57.5, 1.2, 1.4, OWOOD);
  moss(tr, (x, y) => (y > 73 ? 0.5 - (x - 10) * 0.008 : y > 60 && x < 22 ? 0.35 : 0), 7);
  // Ranke um den Stamm
  for (let y = 74; y > 47; y--) { const x = 28 + Math.round(Math.sin(y * 0.3) * 6); if (tr.get(x, y) >>> 24) { tr.set(x, y, VINE[y % 3 ? 2 : 1]); if (y % 3 === 0) tr.set(x + (y % 2 ? 1 : -1), y - 1, VINE[4]); } }
  shadeArea(tr, (x, y) => y < 45 + Math.round(Math.sin(x * 0.8) * 2), COOL, 0.5);
  shadeArea(tr, (x, y) => y >= 45 && y < 49 + Math.round(Math.sin(x * 0.8) * 2), COOL, 0.22);
  inkOutline(tr);
  // lange Ranken hinter dem Stamm, dann Stamm, Krone, vordere Ranken
  for (const [x, y, n, s] of [[10, 38, 20, 2], [18, 40, 14, 5], [38, 40, 17, 7], [47, 40, 21, 9]] as const) vineStrand(p, x, y, n, f, s, 1.6);
  p.draw(tr);
  crown(p, [
    { x: 28, y: 17, rx: 19, ry: 11, lv: -0.4, amp: 1 }, { x: 13, y: 29, rx: 11, ry: 9, lv: -0.3, amp: 1.5 }, { x: 44, y: 30, rx: 11, ry: 9, lv: -0.8, amp: 1.5 },
    { x: 21, y: 17, rx: 12, ry: 8, lv: 0.4, amp: 1.2 }, { x: 37, y: 19, rx: 11, ry: 8, lv: 0.1, amp: 1.2 }, { x: 7, y: 38, rx: 6, ry: 5, lv: 0, amp: 1.8 }, { x: 50, y: 39, rx: 5.5, ry: 4.5, lv: -0.4, amp: 1.8 },
    { x: 28, y: 32, rx: 14, ry: 8, lv: 0.3, amp: 1.1 },
  ], { ramp: OLIVE, seed: 71, tuft: 4.2, frame: f, sway: 1.3, style: LEAF_FINE });
  // einzelne Oliven
  for (const [x, y] of [[20, 26], [35, 30], [12, 35], [44, 24]] as const) if (p.get(x, y) >>> 24) { p.set(x, y, P.violet[1]); p.set(x, y - 1, P.violet[3]); }
  for (const [x, y, n, s, b] of [[5, 41, 13, 3, 1], [14, 37, 9, 6, 0], [24, 38, 12, 4, 1], [33, 39, 8, 8, 0], [43, 37, 11, 1, 1], [52, 42, 12, 11, 0]] as const) vineStrand(p, x, y, n, f, s, 1.4, b ? ARC[3] : 0);
}
const CYP: Ramp = [mix(P.forest[0], INK, 0.3), P.forest[0], P.forest[1], mix(P.forest[1], P.green[1], 0.5), mix(P.forest[2], P.green[2], 0.5), mix(P.forest[3], P.green[2], 0.4), mix(P.green[3], P.sand[3], 0.3)];
function cypress(p: Px, f: number): void {
  const tr = new Px(p.w, p.h);
  limb(tr, [[12, 62], [12, 50]], 2, 1.6); limb(tr, bez([11, 61], [9, 62], [7, 63]), 1.4, 0.7); limb(tr, bez([13, 61], [15, 62], [17, 63]), 1.4, 0.7);
  barkFill(tr, OWOOD, 9, MARK, 3); shadeArea(tr, (_x, y) => y < 58, COOL, 0.45); inkOutline(tr); p.draw(tr);
  crown(p, [
    { x: 12, y: 45, rx: 8.2, ry: 9.5, lv: -0.3, amp: 0.4 }, { x: 12, y: 32, rx: 7.6, ry: 11, lv: -0.1, amp: 1.1 }, { x: 12, y: 19, rx: 6, ry: 9.5, lv: 0.1, amp: 1.8 }, { x: 12, y: 8.5, rx: 3.8, ry: 7, lv: 0.3, amp: 2.5 },
  ], { ramp: CYP, seed: 91, tuft: 3.3, frame: f, sway: 1, style: LEAF_NEEDLE, form: 0.9 });
  // aufstrebende Zweigspitzen
  const o = [0, 1, 0, -1][f];
  p.set(12 + o * 2, 1, CYP[5]); p.set(12 + o * 2, 0, CYP[4]); p.set(4, 40, CYP[4]); p.set(20, 37, CYP[2]);
}

export function ruNature(out: Frames): void {
  anim(out, 'vine_tree', 4, 56, 80, vineTree);
  anim(out, 'cypress', 4, 24, 64, cypress);
}
