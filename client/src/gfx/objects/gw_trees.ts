/** Grünwald – Bäume (v2): Eiche, Blütenbaum, Tanne, Birke, Weide, toter Baum, Schössling. */
import { Px, Pt, bez } from '../draw';
import {
  Frames, LEAF, LEAF_FINE, Lobe, MARK, P, Ramp, Tone, WHITE, anim, barkFill, clamp, crown, hash2, inkOutline, knot, limb, mix, moss, one, rnd2,
  shadeArea, sw, tuft,
} from './kit';

const W = P.wood;
const COOL = P.forest[0];

// ---------------------------------------------------------------- Eiche
const OAK_LOBES: Lobe[] = [
  { x: 48, y: 21, rx: 28, ry: 16, lv: -0.6, amp: 1 },
  { x: 23, y: 37, rx: 19, ry: 15, lv: -0.6, amp: 1.6 },
  { x: 74, y: 39, rx: 18, ry: 14, lv: -0.9, amp: 1.6 },
  { x: 35, y: 25, rx: 19, ry: 13, lv: 0.2, amp: 1.3 },
  { x: 63, y: 26, rx: 18, ry: 12, lv: 0, amp: 1.3 },
  { x: 18, y: 53, rx: 14, ry: 10, lv: 0, amp: 2 },
  { x: 78, y: 55, rx: 14, ry: 9, lv: -0.3, amp: 2 },
  { x: 48, y: 46, rx: 22, ry: 13, lv: 0.3, amp: 1.2 },
];
function oak(p: Px, f: number): void {
  p.poly([[40, 56], [57, 56], [57, 78], [59, 93], [63, 104], [33, 104], [37, 93], [40, 78]], MARK);
  limb(p, bez([39, 94], [32, 100], [23, 107]), 6.5, 2);
  limb(p, bez([57, 94], [65, 101], [74, 107]), 6.5, 2);
  limb(p, bez([45, 99], [43, 104], [39, 108]), 4.5, 2);
  limb(p, bez([53, 99], [55, 104], [60, 108]), 4.2, 1.8);
  limb(p, bez([43, 62], [34, 54], [20, 44]), 5, 2);
  limb(p, bez([54, 62], [62, 54], [76, 46]), 5, 2);
  limb(p, bez([48, 60], [47, 46], [51, 30]), 5.5, 2.5);
  barkFill(p, W, 11);
  knot(p, 52.5, 85.5, 1.5, 2, W);
  // Astloch
  p.ell(44.5, 76, 3, 4, W[1]); p.ell(44, 75.5, 2.5, 3.5, W[3]); p.ell(45, 76.5, 2, 3, W[0]); p.px([44, 78, 45, 79], mix(W[0], P.shadow[0], 0.5));
  // Wurzelkerben
  p.line(41, 97, 38, 103, W[0]); p.line(55, 98, 58, 104, W[0]); p.line(48, 99, 48, 105, W[1]);
  moss(p, (x, y) => (y > 96 ? 0.5 - (x - 30) * 0.006 : y > 86 && x < 45 ? 0.36 : y > 72 && y < 82 && x > 52 ? 0.25 : 0), 5);
  shadeArea(p, (x, y) => y < 71 + Math.round(Math.sin(x * 0.8) * 2), COOL, 0.5);
  shadeArea(p, (x, y) => y >= 71 && y < 75 + Math.round(Math.sin(x * 0.8) * 2), COOL, 0.22);
  crown(p, OAK_LOBES, { ramp: LEAF.oak, seed: 101, tuft: 5.4, frame: f, sway: 1.5 });
  skyHoles(p, [[31, 32], [66, 31], [57, 43], [38, 44], [84, 46], [13, 44]], LEAF.oak, 7);
}
/** Kleine Lichtlöcher: an den Stellen dunkle Rückschicht durchstoßen (nur wo wirklich Rückschicht sichtbar ist). */
function skyHoles(p: Px, pts: ReadonlyArray<Pt>, ramp: Ramp, seed: number): void {
  pts.forEach(([x, y], k) => {
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 2; i++) {
      const c = p.get(x + i, y + j);
      if ((c === ramp[0] || c === ramp[1]) && rnd2(i + k * 9, j, seed) < 0.8) p.set(x + i, y + j, 0);
    }
  });
}

// ---------------------------------------------------------------- Blütenbaum (Apfel)
const BLOOM_LOBES: Lobe[] = [
  { x: 44, y: 20, rx: 24, ry: 15, lv: -0.5, amp: 1 },
  { x: 22, y: 34, rx: 17, ry: 13, lv: -0.5, amp: 1.6 },
  { x: 67, y: 35, rx: 17, ry: 13, lv: -0.8, amp: 1.6 },
  { x: 34, y: 23, rx: 16, ry: 11, lv: 0.2, amp: 1.2 },
  { x: 57, y: 25, rx: 15, ry: 11, lv: 0, amp: 1.2 },
  { x: 18, y: 49, rx: 12, ry: 9, lv: 0, amp: 2 },
  { x: 70, y: 50, rx: 12, ry: 8, lv: -0.3, amp: 2 },
  { x: 44, y: 43, rx: 19, ry: 11, lv: 0.3, amp: 1.2 },
];
function bloomTree(p: Px, f: number): void {
  // gegabelter, leicht geneigter Stamm
  limb(p, bez([45, 97], [43, 84], [44, 70]), 6.5, 5.2);
  limb(p, bez([44, 72], [38, 62], [28, 50]), 4.6, 2.2);
  limb(p, bez([45, 72], [52, 62], [60, 48]), 4.4, 2.2);
  limb(p, bez([40, 92], [34, 97], [28, 101]), 3.6, 1.4);
  limb(p, bez([49, 92], [56, 97], [62, 101]), 3.6, 1.4);
  limb(p, bez([45, 95], [45, 99], [43, 102]), 2.8, 1.4);
  const BW: Ramp = [W[0], mix(W[1], P.stone[1], 0.25), mix(W[2], P.stone[2], 0.25), mix(W[3], P.tan[3], 0.4), mix(W[4], P.tan[4], 0.4)];
  barkFill(p, BW, 23, MARK, 3);
  knot(p, 46.5, 82.5, 1.2, 1.6, BW);
  p.line(44, 71, 44, 76, BW[0]);
  moss(p, (x, y) => (y > 92 ? 0.42 : y > 84 && x < 43 ? 0.3 : 0), 9);
  shadeArea(p, (x, y) => y < 64 + Math.round(Math.sin(x * 0.9) * 2), COOL, 0.5);
  shadeArea(p, (x, y) => y >= 64 && y < 68, COOL, 0.2);
  const tf = crown(p, BLOOM_LOBES, { ramp: LEAF.light, seed: 211, tuft: 4.8, frame: f, sway: 1.5 });
  // Blüten: kleine rosa-weiße Dolden, dichter auf der Lichtseite; reiten auf den Büscheln mit
  const PK = P.pink;
  for (const t of tf) {
    const h = t.seed >>> 3, r = (h & 255) / 255;
    if (t.lobe < 3 ? r > 0.3 : r > 0.62 + (t.lv < -0.8 ? 0.2 : 0)) continue;
    const x = Math.round(t.x) + ((h >> 8) % 5) - 2, y = Math.round(t.y) + ((h >> 11) % 4) - 3, lit = t.lv > -0.3;
    if (p.get(x, y) >>> 24 === 0) continue;
    const big = ((h >> 14) & 3) > 0;
    p.set(x, y, lit ? WHITE : PK[4]); p.set(x + 1, y, PK[4]); p.set(x, y + 1, PK[4]); p.set(x + 1, y + 1, lit ? PK[3] : mix(PK[3], PK[2], 0.5));
    if (big) { p.set(x - 1, y, lit ? PK[4] : PK[3]); p.set(x, y - 1, lit ? WHITE : PK[4]); p.set(x + 2, y + 1, mix(PK[3], PK[2], 0.5)); }
  }
  // ein paar rote Äpfel im Schatten der unteren Lappen
  for (const t of tf) {
    if (t.lobe < 5 || ((t.seed >>> 5) & 7) > 1) continue;
    const x = Math.round(t.x) + 1, y = Math.round(t.y) + 2;
    p.set(x, y, P.red[3]); p.set(x + 1, y, P.red[2]); p.set(x, y + 1, P.red[2]); p.set(x + 1, y + 1, P.red[1]); p.set(x, y - 1, mix(W[1], COOL, 0.3));
  }
  skyHoles(p, [[30, 30], [58, 36], [35, 40], [76, 42]], LEAF.light, 8);
}

// ---------------------------------------------------------------- Tanne
/** Ein hängender Tannenzweig als spitz zulaufendes Blatt im Tonpuffer. */
function bough(t: Tone, x0: number, y0: number, x1: number, y1: number, wid: number, lv: number, seed: number): void {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
  let px = -uy, py = ux; if (py < 0) { px = -px; py = -py; }
  const pad = wid + 2;
  for (let y = Math.floor(Math.min(y0, y1) - pad); y <= Math.max(y0, y1) + pad; y++) for (let x = Math.floor(Math.min(x0, x1) - pad); x <= Math.max(x0, x1) + pad; x++) {
    const qx = x + 0.5 - x0, qy = y + 0.5 - y0, s = (qx * ux + qy * uy) / len;
    if (s < -0.05 || s > 1.04) continue;
    const hw = wid * (s < 0.5 ? 0.5 + s : Math.max(0.12, (1 - s) * 2)), c = (qx * px + qy * py) / hw, h = hash2(x - Math.round(x0), y - Math.round(y0), seed), n = (h & 255) / 255;
    if (Math.abs(c) > 1 + (n < 0.3 ? 0.3 : -0.08)) continue;
    let tone = 3.6 + lv + (c < -0.25 ? 1 : c > 0.4 ? -1 : 0) + (s > 0.8 ? 1.4 : 0) + (s < 0.3 ? -2.4 : s < 0.5 ? -1 : 0);
    if (n > 0.86) tone += 1; else if (n < 0.14 + (c > 0 ? 0.12 : 0)) tone -= 1;
    t.set(x, y, clamp(Math.round(tone), 0, 6));
  }
}
function pine(p: Px, f: number): void {
  const cx = 28, FW: Ramp = [W[0], mix(W[1], P.shadow[2], 0.3), mix(W[2], P.stone[1], 0.3), mix(W[3], P.stone[2], 0.3), mix(W[4], P.stone[3], 0.3)];
  p.poly([[25, 70], [31, 70], [32, 88], [34, 92], [22, 92], [24, 88]], MARK);
  limb(p, bez([25, 88], [22, 91], [18, 93]), 2.5, 1.2); limb(p, bez([31, 88], [35, 91], [38, 93]), 2.5, 1.2); limb(p, [[28, 90], [28, 93]], 2, 1.4);
  barkFill(p, FW, 31, MARK, 3);
  moss(p, (x, y) => (y > 89 ? 0.35 : 0), 4);
  shadeArea(p, (x, y) => y < 86, COOL, 0.45);
  const t = new Tone(p.w, p.h), N = 6;
  for (let i = 0; i < N; i++) {
    const k = i / (N - 1), yB = 85 - k * 62, hw = 26 - k * 18, th = 19 - k * 7, off = sw(f, 0.3 + k * 2.2, -0.5 + k * 0.6), m = Math.max(3, Math.round(7 - k * 4));
    if (i > 0) t.shade(cx + off + 1, yB + 2, hw * 0.98, 5, 1);
    const order = [...Array(m).keys()].sort((a, b) => Math.abs(b - (m - 1) / 2) - Math.abs(a - (m - 1) / 2));
    for (const b of order) {
      const u = m === 1 ? 0 : -1 + (2 * b) / (m - 1), jit = (rnd2(i, b, 77) - 0.5) * 2;
      const tx = cx + off + u * hw + jit, ty = yB - Math.pow(Math.abs(u), 1.7) * th * 0.5 + jit * 0.6;
      bough(t, cx + off * 0.6 + u * hw * 0.12, yB - th, tx, ty, 3.6 + hw * 0.1, -u * 1.2 + 0.5 + (i === N - 1 ? 0.4 : 0), 500 + i * 16 + b);
    }
  }
  const offT = sw(f, 2.6, 0.2);
  bough(t, cx + offT * 0.8, 20, cx + offT, 2, 3, 0.6, 990);
  t.toPx(p, LEAF.fir);
  // ein paar Zapfen
  for (const [x, y, k] of [[20, 62, 3], [37, 50, 4], [24, 40, 5], [34, 72, 2]] as const) { const o = sw(f, 0.3 + (k / 6) * 2.2, -0.5 + (k / 6) * 0.6); p.set(x + o, y, W[3]); p.set(x + o, y + 1, W[2]); p.set(x + o, y + 2, W[1]); }
}

// ---------------------------------------------------------------- Birke
const BIRCH: Ramp = [mix(P.cream[0], P.steel[1], 0.4), mix(P.cream[1], P.snow[1], 0.5), mix(P.cream[2], P.snow[2], 0.5), P.cream[4], WHITE];
const BIRCH_BACK: Lobe[] = [
  { x: 24, y: 13, rx: 12, ry: 9, lv: -0.3, amp: 1.8 }, { x: 13, y: 26, rx: 9, ry: 8, lv: -0.4, amp: 2 }, { x: 36, y: 27, rx: 9, ry: 8, lv: -0.8, amp: 2 }, { x: 25, y: 33, rx: 9, ry: 7, lv: -0.6, amp: 1.5 },
  { x: 10, y: 43, rx: 7, ry: 6, lv: -0.5, amp: 2.2 }, { x: 38, y: 44, rx: 7, ry: 6, lv: -0.9, amp: 2.2 },
];
const BIRCH_FRONT: Lobe[] = [
  { x: 20, y: 10, rx: 9, ry: 6, lv: 0.9, amp: 1.8, back: false }, { x: 32, y: 17, rx: 8, ry: 6, lv: 0.4, amp: 1.8, back: false }, { x: 12, y: 22, rx: 7, ry: 5, lv: 0.7, amp: 2, back: false },
  { x: 21, y: 27, rx: 7, ry: 5, lv: 0.4, amp: 1.6, back: false }, { x: 37, y: 34, rx: 6, ry: 5, lv: -0.1, amp: 2, back: false }, { x: 12, y: 38, rx: 6, ry: 5, lv: 0.3, amp: 2.2, back: false },
  { x: 29, y: 44, rx: 6, ry: 4.5, lv: 0, amp: 1.8, back: false }, { x: 17, y: 52, rx: 5, ry: 4, lv: 0.2, amp: 2.4, back: false }, { x: 34, y: 54, rx: 5, ry: 4, lv: -0.3, amp: 2.4, back: false },
];
function birch(p: Px, f: number): void {
  crown(p, BIRCH_BACK, { ramp: LEAF.birch, seed: 311, tuft: 3.8, frame: f, sway: 2, style: LEAF_FINE, density: 0.95 });
  const tr = new Px(p.w, p.h);
  limb(tr, bez([23, 85], [21, 60], [25, 34]), 3.6, 2.2); limb(tr, bez([25, 34], [26, 22], [24, 10]), 2.2, 0.8);
  limb(tr, bez([21, 82], [18, 85], [15, 86]), 2, 1); limb(tr, bez([25, 82], [29, 85], [32, 86]), 2, 1);
  limb(tr, bez([23, 52], [16, 46], [11, 40]), 1.3, 0.6); limb(tr, bez([24, 46], [31, 40], [36, 32]), 1.3, 0.6); limb(tr, bez([24, 38], [18, 30], [14, 24]), 1.1, 0.5); limb(tr, bez([23, 60], [29, 56], [34, 52]), 1, 0.5);
  barkFill(tr, BIRCH, 41, MARK, 99);
  const DK = mix(P.shadow[1], P.steel[0], 0.5);
  // schwarze Querrisse und Astnarben
  for (let k = 0; k < 16; k++) {
    const y = 22 + Math.round(k * 3.9 + rnd2(k, 1, 5) * 2), len = 2 + Math.floor(rnd2(k, 2, 5) * 3);
    let x0 = -1, x1 = -1; for (let x = 0; x < tr.w; x++) if (tr.get(x, y) >>> 24) { if (x0 < 0) x0 = x; x1 = x; }
    if (x0 < 0 || x1 - x0 < 3) continue;
    const xs = rnd2(k, 3, 5) < 0.5 ? x0 : x1 - len + 1;
    for (let i = 0; i < len; i++) tr.set(xs + i, y, DK);
    if (k % 4 === 1) { tr.set(xs + 1, y - 1, DK); tr.set(xs + 1, y + 1, BIRCH[1]); }
  }
  for (const [x, y] of [[22, 70], [24, 55]] as const) { tr.px([x, y, x + 1, y, x + 2, y, x + 1, y - 1, x, y + 1, x + 2, y + 1], DK); tr.set(x + 1, y + 1, BIRCH[0]); }
  // dunkler, rissiger Stammfuß
  for (let y = 78; y < 88; y++) for (let x = 12; x < 36; x++) if (tr.get(x, y) >>> 24 && rnd2(x >> 1, y, 8) < (y - 78) / 12) tr.set(x, y, rnd2(x, y, 9) < 0.4 ? DK : BIRCH[0]);
  moss(tr, (x, y) => (y > 83 ? 0.3 : 0), 6);
  shadeArea(tr, (x, y) => y < 50, P.green[1], 0.22);
  inkOutline(tr);
  p.draw(tr);
  crown(p, BIRCH_FRONT, { ramp: LEAF.birch, seed: 347, tuft: 3.4, frame: f, sway: 2, style: LEAF_FINE, back: false, form: 0.8 });
}

// ---------------------------------------------------------------- Weide
/** Eine herabhängende Laubsträhne: wie ein schmaler Zylinder schattiert, Fischgrät-Blättchen, helle Spitze. */
function lock(t: Tone, f: number, x: number, y0: number, L: number, wd: number, base: number, amp: number, ph: number, seed: number): void {
  for (let j = 0; j < L; j++) {
    const u = j / L, hw = (wd / 2) * (u < 0.1 ? 0.6 + u * 4 : u < 0.72 ? 1 : Math.max(0.18, (1 - u) / 0.28));
    const dx = Math.round(amp * Math.pow(u, 1.5) * Math.sin((f * Math.PI) / 2 + ph)), wob = Math.round(Math.sin(j * 0.35 + seed) * 0.6);
    for (let i = -Math.ceil(hw); i <= Math.ceil(hw); i++) {
      const c = hw < 0.6 ? 0 : i / hw;
      if (Math.abs(c) > 1.05) continue;
      if (Math.abs(c) > 0.6 && (j + (i > 0 ? 2 : 0)) % 4 === 0) continue;           // gesägter Rand
      let tone = base + (c < -0.25 ? 1 : c > 0.35 ? -1 : 0) + (u < 0.18 ? 0.6 : 0) + (u > 0.86 ? 1.2 : u > 0.6 ? -0.5 : 0);
      if ((j + Math.abs(i) * 2) % 5 === 0) tone -= 1;                                // Fischgrät
      else if ((hash2(i, j, seed) & 15) === 0) tone += 1;
      t.set(x + i + dx + wob, y0 + j, clamp(Math.round(tone), 0, 6));
    }
  }
}
function curtain(t: Tone, f: number, x0: number, x1: number, step: number, top: (x: number) => number, len: (x: number, k: number) => number, wd: number, base: number, amp: number, seed: number, skip?: (x: number) => boolean): void {
  const ls: Array<[number, number, number, number]> = [];
  let k = 0;
  for (let xf = x0; xf <= x1; xf += step, k++) {
    const x = Math.round(xf + (rnd2(k, 1, seed) - 0.5) * step * 0.7);
    if (skip && skip(x)) continue;
    ls.push([x, Math.round(top(x) + rnd2(k, 2, seed) * 6), Math.round(len(x, k)), k]);
  }
  ls.sort((a, b) => b[2] + b[1] - (a[2] + a[1]));   // lange zuerst → kurze liegen vorn
  for (const [x, y0, L, kk] of ls) lock(t, f, x, y0, L, wd + (rnd2(kk, 4, seed) < 0.4 ? 1 : 0), base - ((x - 48) / 46) * 0.9 + (rnd2(kk, 5, seed) - 0.5) * 1.2, amp, x * 0.05 + rnd2(kk, 3, seed) * 0.6, seed + kk);
}
const WILLOW_LOBES: Lobe[] = [
  { x: 48, y: 14, rx: 22, ry: 11, lv: -0.3, amp: 0.8 }, { x: 22, y: 28, rx: 17, ry: 11, lv: -0.2, amp: 1 }, { x: 74, y: 29, rx: 17, ry: 11, lv: -0.7, amp: 1 },
  { x: 34, y: 20, rx: 15, ry: 10, lv: 0.4, amp: 0.9 }, { x: 62, y: 21, rx: 14, ry: 10, lv: 0.1, amp: 0.9 }, { x: 12, y: 38, rx: 9, ry: 8, lv: 0, amp: 1.2 }, { x: 84, y: 39, rx: 9, ry: 8, lv: -0.5, amp: 1.2 },
  { x: 48, y: 33, rx: 20, ry: 9, lv: 0.2, amp: 1 },
];
function willow(p: Px, f: number): void {
  const R = LEAF.willow;
  const domeEdge = (x: number): number => 32 + ((x - 48) / 46) ** 2 * 8;
  const tb = new Tone(p.w, p.h);
  curtain(tb, f, 6, 90, 4.2, (x) => domeEdge(x) - 6, (x, k) => 50 - ((x - 48) / 46) ** 2 * 12 + rnd2(k, 9, 61) * 10, 6, 1.3, 1.4, 61);
  tb.toPx(p, R);
  // knorriger, kurzer Stamm
  const tr = new Px(p.w, p.h);
  tr.poly([[41, 46], [55, 46], [56, 70], [58, 86], [62, 96], [34, 96], [38, 86], [41, 70]], MARK);
  limb(tr, bez([40, 87], [33, 93], [25, 99]), 6, 2); limb(tr, bez([56, 87], [63, 93], [71, 99]), 6, 2); limb(tr, bez([46, 92], [44, 97], [41, 100]), 4, 1.8); limb(tr, bez([52, 92], [54, 97], [58, 100]), 3.8, 1.8);
  limb(tr, bez([44, 52], [36, 44], [28, 38]), 4, 2); limb(tr, bez([52, 52], [60, 44], [68, 38]), 4, 2);
  const WW: Ramp = [W[0], mix(W[1], P.shadow[2], 0.25), mix(W[2], P.stone[1], 0.2), mix(W[3], P.stone[2], 0.2), mix(W[4], P.stone[3], 0.2)];
  barkFill(tr, WW, 51, MARK, 5);
  knot(tr, 46.5, 68.5, 2, 2.6, WW); knot(tr, 52.5, 80.5, 1.4, 1.8, WW);
  tr.line(40, 90, 37, 96, WW[0]); tr.line(55, 90, 59, 96, WW[0]); tr.line(49, 60, 50, 72, WW[1]);
  moss(tr, (x, y) => (y > 88 ? 0.5 : y > 74 && x < 46 ? 0.38 : y > 60 && y < 70 && x > 50 ? 0.3 : 0), 12);
  shadeArea(tr, (x, y) => y < 64 + Math.round(Math.sin(x) * 2), COOL, 0.5);
  inkOutline(tr);
  p.draw(tr);
  const tf = new Tone(p.w, p.h);
  curtain(tf, f, 4, 92, 5.6, (x) => domeEdge(x) - 3, (x, k) => 40 - ((x - 48) / 46) ** 2 * 8 + rnd2(k, 9, 62) * 20, 4, 3.5, 2.4, 62, (x) => x > 39 && x < 57);
  curtain(tf, f, 41, 56, 5, () => 36, (x, k) => 10 + rnd2(k, 9, 63) * 12, 4, 3.3, 1.4, 63);
  tf.toPx(p, R);
  const tufts = crown(p, WILLOW_LOBES, { ramp: R, seed: 411, tuft: 4.8, frame: f, sway: 1, style: LEAF_FINE });
  // kurze Strähnen, die vorn über die Kuppel fallen
  const to = new Tone(p.w, p.h);
  tufts.forEach((q, k) => {
    if (q.lobe < 3 || k % 2 !== 0 || q.y < 20) return;
    lock(to, f, Math.round(q.x), Math.round(q.y) + 2, 9 + ((q.seed >>> 4) % 12), 3, 3.6 + q.lv * 0.7, 1, q.x * 0.05, 640 + k);
  });
  to.toPx(p, R);
}

// ---------------------------------------------------------------- toter Baum mit Nest
function deadTree(p: Px): void {
  const D: Ramp = [mix(W[0], P.shadow[1], 0.4), mix(W[1], P.stone[1], 0.55), mix(W[2], P.stone[2], 0.55), mix(W[3], P.stone[3], 0.6), mix(W[4], P.stone[4], 0.6)];
  limb(p, bez([24, 58], [22, 44], [25, 30]), 5, 3.4);
  limb(p, bez([21, 55], [15, 59], [10, 62]), 3, 1.2); limb(p, bez([27, 55], [33, 59], [38, 62]), 3, 1.2); limb(p, [[24, 58], [24, 62]], 3, 2);
  limb(p, bez([25, 32], [18, 24], [9, 20]), 2.8, 0.8); limb(p, bez([12, 22], [8, 16], [9, 9]), 1.2, 0.5); limb(p, bez([15, 24], [10, 26], [5, 25]), 1, 0.5);
  limb(p, bez([25, 30], [33, 24], [38, 12]), 2.8, 0.8); limb(p, bez([36, 18], [41, 16], [44, 10]), 1.1, 0.5); limb(p, bez([33, 24], [39, 26], [43, 24]), 1, 0.5);
  limb(p, bez([25, 30], [24, 20], [27, 8]), 2.4, 0.7); limb(p, bez([26, 16], [22, 10], [20, 4]), 1, 0.5); limb(p, bez([24, 44], [30, 40], [34, 38]), 1.6, 0.6);
  barkFill(p, D, 71, MARK, 3);
  // abgebrochener Aststumpf, Spechtloch
  p.rect(33, 37, 2, 2, D[4]); p.set(34, 38, D[1]);
  p.ell(23.5, 46, 1.6, 2.2, D[0]); p.set(22, 44, D[4]);
  moss(p, (x, y) => (y > 55 ? 0.4 : 0), 14);
  // Nest in der Astgabel
  const N = P.tan;
  p.ell(30.5, 23.5, 5, 2.6, N[1]); p.ell(30.5, 22.6, 4.4, 1.8, N[2]); p.ell(30.5, 22.5, 3, 1, W[0]);
  for (let k = 0; k < 9; k++) { const x = 26 + k, y = 24 + ((k * 7) % 3) - 1; p.set(x, y, k % 3 === 0 ? N[3] : k % 3 === 1 ? N[1] : W[2]); }
  p.px([25, 22, 36, 22, 26, 25], N[3]); p.px([24, 23, 37, 24], W[2]);
  p.rect(29, 21, 2, 2, P.ice[3]); p.set(29, 21, WHITE); p.rect(32, 21, 2, 2, P.ice[2]); p.set(32, 21, P.ice[4]);
}

// ---------------------------------------------------------------- Schössling
function sapling(p: Px, f: number): void {
  const tr = new Px(p.w, p.h);
  limb(tr, bez([12, 30], [11, 22], [12, 12]), 1.3, 0.7); limb(tr, bez([12, 22], [9, 19], [7, 16]), 0.6, 0.5); limb(tr, bez([12, 19], [15, 17], [17, 14]), 0.6, 0.5);
  limb(tr, [[11, 30], [9, 31]], 0.8, 0.5); limb(tr, [[13, 30], [15, 31]], 0.8, 0.5);
  barkFill(tr, [W[0], W[1], W[2], W[3], W[4]], 81);
  inkOutline(tr); p.draw(tr);
  crown(p, [
    { x: 12, y: 8, rx: 6.5, ry: 5.5, lv: 0.2, amp: 1.6 }, { x: 6.5, y: 15, rx: 4.5, ry: 4, lv: 0.2, amp: 1.2 }, { x: 17.5, y: 14, rx: 4.5, ry: 4, lv: -0.3, amp: 1.2 },
  ], { ramp: LEAF.light, seed: 511, tuft: 3.2, frame: f, sway: 1.4, style: LEAF_FINE });
  // einzelne Blätter am Stämmchen
  const o = sw(f, 1, 0.3);
  p.px([14 + o, 21, 15 + o, 20], LEAF.light[5]); p.px([9 + o, 23, 8 + o, 22], LEAF.light[4]); p.set(15 + o, 21, LEAF.light[3]);
}

export function gwTrees(out: Frames): void {
  anim(out, 'tree_oak', 4, 96, 112, oak);
  anim(out, 'tree_oak2', 4, 88, 104, bloomTree);
  anim(out, 'tree_pine', 4, 56, 96, pine);
  anim(out, 'tree_birch', 4, 48, 88, birch);
  anim(out, 'tree_willow', 4, 96, 104, willow);
  one(out, 'tree_dead', 48, 64, deadTree);
  anim(out, 'sapling', 4, 24, 32, sapling);
}
void tuft;
