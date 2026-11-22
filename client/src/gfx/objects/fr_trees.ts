/** Frostgebirge – Bäume und Büsche: verschneite Tannen (3 Größen), kahle Birke, gefrorener Busch. */
import { Px, bez } from '../draw';
import { Frames, LEAF_FINE, MARK, P, Ramp, WHITE, barkFill, clamp, crown, hash2, limb, mix, rnd2, shadeArea, sw } from './kit';
import { FIR, FWOOD, SNOW, fAnim, fOne, mound, snowCap } from './fr_kit';

/** Tonpuffer: 0–6 Tannengrün, 7–10 Schnee (Schatten → Weiß). */
const TREE: Ramp = [...FIR, mix(SNOW[1], P.ice[1], 0.45), SNOW[2], SNOW[3], SNOW[4]];
class TB {
  i: Int8Array;
  constructor(public w: number, public h: number) { this.i = new Int8Array(w * h).fill(-1); }
  set(x: number, y: number, v: number): void { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.i[y * this.w + x] = v; }
  /** Schlagschatten der höheren Etage: Grün eine Stufe dunkler, Schnee ins Blaue */
  shade(cx: number, cy: number, rx: number, ry: number): void {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) continue;
      const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry; if (u * u + v * v > 1) continue;
      const t = this.i[y * this.w + x];
      if (t > 7) this.i[y * this.w + x] = Math.max(7, t - 2); else if (t > 0 && t < 7) this.i[y * this.w + x] = t - 1;
    }
  }
  toPx(p: Px): void { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const t = this.i[y * this.w + x]; if (t >= 0) p.set(x, y, TREE[t]); } }
}
/** Schneebeladener Tannenzweig: spitz zulaufend, Oberseite weiß, darunter hängt dunkles Nadelgrün hervor. */
function sbough(t: TB, x0: number, y0: number, x1: number, y1: number, wid: number, lv: number, seed: number, snow: number, side: number): void {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
  let px = -uy, py = ux; if (py < -0.01 || (Math.abs(py) <= 0.01 && px < 0)) { px = -px; py = -py; }
  const pad = wid + 2;
  for (let y = Math.floor(Math.min(y0, y1) - pad); y <= Math.max(y0, y1) + pad; y++) for (let x = Math.floor(Math.min(x0, x1) - pad); x <= Math.max(x0, x1) + pad; x++) {
    const qx = x + 0.5 - x0, qy = y + 0.5 - y0, s = (qx * ux + qy * uy) / len;
    if (s < -0.05 || s > 1.04) continue;
    const hw = wid * (s < 0.5 ? 0.5 + s : Math.max(0.12, (1 - s) * 2)), c = (qx * px + qy * py) / hw, h = hash2(x - Math.round(x0), y - Math.round(y0), seed), n = (h & 255) / 255;
    if (Math.abs(c) > 1 + (n < 0.3 ? 0.3 : -0.08)) continue;
    const cs = -0.4 + snow * 0.8 + (n - 0.5) * 0.36;
    let tone: number;
    if (s > 0.14 && s < 0.96 && c < cs) {
      tone = 9 + (c < cs - 0.8 ? 1 : 0) - (c > cs - 0.3 ? 1 : 0) - (side > 0.3 ? 1 : 0) + (side < -0.3 && c < cs - 0.45 ? 1 : 0);
      tone = clamp(tone, 7, 10);
    } else {
      tone = 3 + lv + (c > 0.45 ? -1 : 0) + (s > 0.82 ? 1.2 : 0) + (s < 0.3 ? -2.4 : s < 0.5 ? -1 : 0);
      if (n > 0.86) tone += 1; else if (n < 0.2) tone -= 1;
      tone = clamp(Math.round(tone), 0, 6);
    }
    t.set(x, y, tone);
  }
}
function trunk(p: Px, cx: number, y0: number, by: number, r: number, seed: number): void {
  p.poly([[cx - r, y0], [cx + r, y0], [cx + r + 1, by - 5], [cx + r + 2.5, by - 1], [cx - r - 2.5, by - 1], [cx - r - 1, by - 5]], MARK);
  limb(p, bez([cx - r, by - 4], [cx - r - 2, by - 2], [cx - r - 5, by - 1]), r * 0.7, 0.9); limb(p, bez([cx + r, by - 4], [cx + r + 2, by - 2], [cx + r + 5, by - 1]), r * 0.7, 0.9);
  barkFill(p, FWOOD, seed, MARK, 3);
  shadeArea(p, (_x, y) => y < y0 + 7, P.forest[0], 0.45);
  mound(p, cx - r - 3.5, by, 4, 2.4, seed); mound(p, cx + r + 4, by, 3.2, 1.7, seed + 1);
}
interface PineO { cx: number; N: number; y0: number; y1: number; hw0: number; hw1: number; th0: number; th1: number; top: number; seed: number; snow: number; bw?: number; lean?: number; m0: number; m1: number }
function snowPine(p: Px, f: number, o: PineO): void {
  const t = new TB(p.w, p.h), { cx, N } = o, lean = o.lean ?? 0;
  for (let i = 0; i < N; i++) {
    const k = i / (N - 1), yB = o.y0 + (o.y1 - o.y0) * k, hw = o.hw0 + (o.hw1 - o.hw0) * k, th = o.th0 + (o.th1 - o.th0) * k;
    const off = sw(f, 0.3 + k * 2.1, -0.5 + k * 0.6) + Math.round(lean * k * k), m = Math.max(2, Math.round(o.m0 + (o.m1 - o.m0) * k));
    if (i > 0) t.shade(cx + off + 1, yB + 2, hw * 0.98, 5);
    const order = [...Array(m).keys()].sort((a, b) => Math.abs(b - (m - 1) / 2) - Math.abs(a - (m - 1) / 2));
    for (const b of order) {
      const u = m === 1 ? 0 : -1 + (2 * b) / (m - 1), jit = (rnd2(i, b, o.seed) - 0.5) * 2;
      const tx = cx + off + u * hw + jit, ty = yB - Math.pow(Math.abs(u), 1.7) * th * 0.5 + jit * 0.6;
      sbough(t, cx + off * 0.6 + u * hw * 0.12, yB - th, tx, ty, (o.bw ?? 3.6) + hw * 0.1, -u * 1.2 + 0.4 + (i === N - 1 ? 0.4 : 0), o.seed * 7 + i * 16 + b, o.snow, u);
    }
  }
  const offT = sw(f, 2.5, 0.2) + lean;
  sbough(t, cx + offT * 0.8, o.top + o.th1 + 5, cx + offT, o.top, 2.6, 0.6, o.seed + 990, o.snow, -0.4);
  t.toPx(p);
}
function pineA(p: Px, f: number): void {
  trunk(p, 24, 68, 88, 3, 31);
  snowPine(p, f, { cx: 24, N: 6, y0: 80, y1: 23, hw0: 22, hw1: 7, th0: 18, th1: 12, top: 2, seed: 5, snow: 0.72, m0: 7, m1: 3 });
  // ein paar Zapfen im Grün
  for (const [x, y, k] of [[14, 60, 2], [33, 49, 3], [20, 37, 4]] as const) { const o = sw(f, 0.3 + (k / 5) * 2.1, -0.5 + (k / 5) * 0.6); if (p.get(x + o, y) >>> 24) { p.set(x + o, y, P.wood[3]); p.set(x + o, y + 1, P.wood[2]); p.set(x + o, y + 2, P.wood[1]); } }
}
function pineB(p: Px, f: number): void {
  trunk(p, 19, 54, 72, 2.5, 37);
  snowPine(p, f, { cx: 19, N: 5, y0: 65, y1: 21, hw0: 17.5, hw1: 6, th0: 17, th1: 12, top: 3, seed: 9, snow: 0.95, lean: 2, m0: 6, m1: 3 });
}
function pineS(p: Px, f: number): void {
  trunk(p, 12, 28, 36, 1.4, 43);
  snowPine(p, f, { cx: 12, N: 3, y0: 31, y1: 14, hw0: 10.5, hw1: 5.5, th0: 12, th1: 9, top: 1, seed: 13, snow: 0.85, bw: 3, m0: 5, m1: 3 });
}

// ---------------------------------------------------------------- kahle Birke
function birchBare(p: Px): void {
  const B: Ramp = [mix(P.cream[0], P.steel[1], 0.5), mix(P.cream[1], P.snow[1], 0.6), mix(P.cream[2], P.snow[2], 0.6), mix(P.cream[4], P.snow[3], 0.4), WHITE];
  const DK = mix(P.shadow[1], P.steel[0], 0.5), TW = mix(P.wood[1], P.steel[0], 0.45);
  // feine Zweige zuerst (liegen hinter den Ästen)
  for (const [a, b, c] of [
    [[9, 26], [5, 22], [2, 23]], [[7, 24], [6, 18], [3, 14]], [[26, 22], [30, 20], [34, 21]], [[29, 17], [27, 11], [29, 6]], [[11, 14], [7, 11], [5, 5]], [[10, 10], [13, 6], [12, 1]],
    [[23, 9], [20, 5], [21, 1]], [[24, 7], [28, 4], [30, 1]], [[27, 39], [31, 38], [34, 40]], [[29, 35], [31, 30], [34, 28]], [[13, 34], [8, 34], [5, 37]], [[31, 14], [34, 12], [35, 8]], [[17, 8], [15, 4], [16, 1]],
  ] as const) limb(p, bez(a, b, c), 0.5, 0.5, TW);
  limb(p, bez([18, 62], [16, 46], [18, 30]), 2.9, 2); limb(p, bez([18, 30], [19, 18], [17, 5]), 2, 0.7);
  limb(p, bez([16, 60], [13, 62], [11, 63]), 1.6, 0.8); limb(p, bez([20, 60], [23, 62], [25, 63]), 1.6, 0.8);
  limb(p, bez([18, 41], [11, 34], [6, 23]), 1.3, 0.5); limb(p, bez([18, 35], [25, 27], [31, 14]), 1.3, 0.5); limb(p, bez([18, 27], [12, 19], [10, 9]), 1.1, 0.5); limb(p, bez([18, 20], [23, 13], [24, 6]), 1, 0.5); limb(p, bez([18, 47], [25, 43], [30, 34]), 1.1, 0.5);
  barkFill(p, B, 41, MARK, 99);
  for (let k = 0; k < 13; k++) {
    const y = 14 + Math.round(k * 3.6 + rnd2(k, 1, 5) * 2), len = 2 + Math.floor(rnd2(k, 2, 5) * 2);
    let x0 = -1, x1 = -1; for (let x = 12; x < 25; x++) if (B.includes(p.get(x, y))) { if (x0 < 0) x0 = x; x1 = x; } else if (x0 >= 0) break;
    if (x0 < 0 || x1 - x0 < 3) continue;
    const xs = rnd2(k, 3, 5) < 0.5 ? x0 : x1 - len + 1;
    for (let i = 0; i < len; i++) p.set(xs + i, y, DK);
    if (k % 4 === 1) p.set(xs + 1, y - 1, DK);
  }
  for (const [x, y] of [[17, 50], [18, 38]] as const) { p.px([x, y, x + 1, y, x + 2, y, x + 1, y - 1], DK); p.set(x + 1, y + 1, B[0]); }
  for (let y = 56; y < 64; y++) for (let x = 8; x < 28; x++) if (p.get(x, y) >>> 24 && rnd2(x >> 1, y, 8) < (y - 56) / 11) p.set(x, y, rnd2(x, y, 9) < 0.4 ? DK : B[0]);
  // Schnee auf Astoberseiten und in den Gabeln
  snowCap(p, (x, y) => (rnd2(x >> 1, y >> 2, 15) < 0.62 ? 1 : 0), { raise: 1, all: true, y1: 46, seed: 3 });
  p.px([17, 29, 18, 29, 19, 30, 17, 40, 16, 41, 19, 34], SNOW[4]); p.px([18, 30, 17, 41], SNOW[2]);
  mound(p, 12.5, 64, 4.5, 2.4, 6); mound(p, 23.5, 64, 3.5, 1.8, 7);
}

// ---------------------------------------------------------------- gefrorener Busch
const FROZEN: Ramp = [mix(P.forest[0], P.ice[0], 0.4), mix(P.forest[1], P.ice[0], 0.55), mix(P.forest[2], P.ice[1], 0.55), P.ice[1], mix(P.ice[1], P.ice[2], 0.6), P.ice[2], P.ice[3]];
function frozenBush(p: Px): void {
  const TW = mix(P.wood[1], P.steel[0], 0.4);
  for (const [x0, x1, y1] of [[8, 4, 3], [11, 11, 1], [14, 18, 3], [6, 1, 8], [16, 21, 8]] as const) { p.line(x0, 12, x1, y1, TW); p.set(x1, y1 - 1, SNOW[4]); }
  crown(p, [{ x: 11, y: 10, rx: 8, ry: 5.5, lv: 0 }, { x: 6, y: 13, rx: 5, ry: 3.6, lv: 0.2 }, { x: 16, y: 13.5, rx: 5, ry: 3.4, lv: -0.3 }], { ramp: FROZEN, seed: 77, tuft: 3.1, style: LEAF_FINE, sway: 0 });
  snowCap(p, (x, y) => (y < 12 ? 2.4 - Math.abs(x - 10) * 0.12 : hash2(x >> 1, 3, 4) & 1 ? 1 : 0), { raise: 1, seed: 8, y0: 3 });
  for (const [x, y] of [[5, 12], [13, 9], [17, 13], [9, 14]] as const) p.set(x, y, WHITE);
}

export function frTrees(out: Frames): void {
  fAnim(out, 'pine_snow', 4, 48, 88, pineA);
  fAnim(out, 'pine_snow2', 4, 40, 72, pineB);
  fAnim(out, 'pine_snow_small', 4, 24, 36, pineS);
  fOne(out, 'birch_bare', 36, 64, birchBare);
  fOne(out, 'frozen_bush', 22, 18, frozenBush);
}
