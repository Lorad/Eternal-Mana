/** Objekt-Atlas (`obj`): Bäume, Häuser, Deko, Interaktives. Fußpunkt = unten Mitte. */
import { Px, Pt, atlasSheet, bez, crystal, tube } from './draw';
import { P, Ramp, INK, WHITE, alpha, mix, rng } from './palette';
import { OBJ_FRAMES } from './spec';
import type { Sheet } from './spec';

type Fn = (p: Px) => void;
const items: Array<[string, Px]> = [];
function add(name: string, w: number, h: number, fn: Fn, outline = true): void {
  const p = new Px(w, h);
  fn(p);
  if (outline) p.outline();
  items.push([name, p]);
}
const SHADOW = alpha(INK, 70);
function shadow(p: Px, cx: number, cy: number, rx: number, ry: number): void {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
    if (nx * nx + ny * ny <= 1 && p.get(x, y) >>> 24 === 0) p.set(x, y, SHADOW);
  }
}
function glow(p: Px, cx: number, cy: number, r: number, c: number, a = 90): void {
  for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
    if (d < 1 && p.get(x, y) >>> 24 < 128) p.blend(x, y, alpha(c, Math.round(a * (d < 0.55 ? 1 : 0.5))));
  }
}
function sparkle(p: Px, x: number, y: number, c: number): void { p.set(x, y, WHITE); p.set(x - 1, y, c); p.set(x + 1, y, c); p.set(x, y - 1, c); p.set(x, y + 1, c); }

/** Laubkugel mit Blatt-Textur und gewelltem Rand. */
function leaf(l: Px, cx: number, cy: number, rx: number, ry: number, r: Ramp, lo: number, hi: number, seed: number): void {
  const R = rng(seed);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + R(); const s = Math.sin(a), c = Math.cos(a); l.ell(cx + c * rx * 0.92, cy + s * ry * 0.92, 2 + R(), 2 + R(), r[s > 0.35 ? lo : c + s < -0.3 ? hi : Math.min(hi, lo + 1)]); }
  l.ball(cx, cy, rx, ry, r, lo, hi);
  const n = Math.round(rx * ry * 0.5);
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, d = Math.sqrt(R()), c = Math.cos(a), s = Math.sin(a), x = cx + c * d * rx * 0.9, y = cy + s * d * ry * 0.9, lit = -(c * 0.45 + s * 0.6) * d;
    if (lit > 0.1) { l.set(x, y, r[Math.min(4, hi + (lit > 0.5 ? 1 : 0))]); if (R() < 0.5) l.set(x + 1, y, r[hi]); }
    else if (lit < -0.15) { l.set(x, y, r[Math.max(0, lo - (lit < -0.5 ? 1 : 0))]); if (R() < 0.5) l.set(x - 1, y, r[lo]); }
    else l.set(x, y, r[Math.min(hi, lo + 2)]);
  }
}
function trunk(l: Px, cx: number, y0: number, y1: number, w: number, r: Ramp): void {
  l.rect(cx - w / 2, y0, w, y1 - y0, r[2]); l.rect(cx - w / 2, y0, 1 + (w > 5 ? 1 : 0), y1 - y0, r[3]); l.rect(cx + w / 2 - 2, y0, 2, y1 - y0, r[1]);
  l.rect(cx - w / 2 - 2, y1 - 2, w + 4, 2, r[2]); l.rect(cx - w / 2 - 3, y1 - 1, 2, 1, r[1]); l.rect(cx + w / 2 + 1, y1 - 1, 2, 1, r[1]); l.set(cx - w / 2 - 2, y1 - 2, r[3]);
  for (let y = y0 + 2; y < y1 - 2; y += 3) l.set(cx - 1 + ((y * 7) % 3), y, r[1]);
  l.rect(cx - w / 2, y0, w, 3, r[1]); l.rect(cx - w / 2, y0, w, 1, r[0]);
}
function rock(l: Px, cx: number, cy: number, rx: number, ry: number, r: Ramp, seed = 1): void {
  const R = rng(seed);
  l.ball(cx, cy, rx, ry, r, 0, 3);
  l.ell(cx - rx * 0.25, cy - ry * 0.35, rx * 0.55, ry * 0.4, r[3]); l.ell(cx - rx * 0.35, cy - ry * 0.5, rx * 0.3, ry * 0.18, r[4]);
  for (let x = Math.floor(cx - rx); x <= cx + rx; x++) for (let y = Math.round(cy + ry * 0.55); y <= cy + ry + 1; y++) if (l.get(x, y)) l.set(x, y, y > cy + ry * 0.8 ? r[0] : r[1]);
  for (let i = 0; i < Math.round(rx / 2); i++) { const x = cx + (R() - 0.3) * rx, y = cy + (R() - 0.4) * ry; l.line(x, y, x + 1 + R() * 2, y + 2 + R() * 2, r[1]); }
  l.set(cx + rx * 0.4, cy - ry * 0.1, r[1]);
}
function flame(p: Px, cx: number, base: number, h: number, w: number, k: number, r: Ramp = P.fire): void {
  const lean = [-1, 0, 1][k % 3], hh = h + [0, 1, -1][k % 3];
  p.poly([[cx - w, base], [cx - w * 0.9, base - hh * 0.45], [cx + lean, base - hh], [cx + w * 0.9, base - hh * 0.5 - (k === 1 ? 1 : 0)], [cx + w, base]], r[2]);
  p.poly([[cx - w * 0.6, base], [cx - w * 0.5 + lean * 0.3, base - hh * 0.4], [cx + lean * 0.6, base - hh * 0.72], [cx + w * 0.55, base - hh * 0.35], [cx + w * 0.6, base]], r[3]);
  p.poly([[cx - w * 0.3, base], [cx - lean * 0.3, base - hh * 0.4], [cx + w * 0.3, base]], r[4]);
  p.set(cx + [2, -2, 1][k % 3], base - hh - 2, r[3]); p.set(cx - [1, 2, -2][k % 3], base - hh * 0.8, r[2]);
}

// ================================================================ Bäume
function oak(p: Px, G: Ramp, D: Ramp, variant: number): void {
  shadow(p, 16, 45, 12, 3);
  p.layer((l) => { trunk(l, 16, 30, 46, 6, P.wood); if (variant) { l.line(13, 36, 9, 32, P.wood[2]); l.set(15, 38, P.wood[0]); l.set(16, 39, P.wood[0]); } });
  p.layer((l) => {
    if (variant === 0) {
      leaf(l, 8, 25, 6.5, 6, D, 0, 2, 11); leaf(l, 24, 25, 6.5, 6, D, 0, 2, 12); leaf(l, 16, 28, 8, 5.5, D, 0, 2, 13);
      leaf(l, 7, 17, 6.5, 6.5, G, 0, 3, 14); leaf(l, 25, 17, 6.5, 6.5, G, 0, 2, 15); leaf(l, 16, 20, 9, 7, G, 1, 3, 16);
      leaf(l, 11, 10, 7, 6.5, G, 1, 4, 17); leaf(l, 21, 10, 7, 6.5, G, 1, 3, 18); leaf(l, 16, 7, 7, 5.5, G, 2, 4, 19);
    } else {
      leaf(l, 16, 27, 11, 6, D, 0, 2, 21); leaf(l, 9, 20, 7.5, 7, G, 0, 3, 22); leaf(l, 23, 20, 7.5, 7, G, 0, 2, 23);
      leaf(l, 16, 14, 10.5, 9, G, 1, 3, 24); leaf(l, 13, 8, 7.5, 6, G, 2, 4, 25); leaf(l, 21, 9, 6, 5, G, 1, 3, 26);
      for (const [x, y] of [[8, 22], [20, 26], [25, 17], [13, 15], [18, 9]] as const) { l.rect(x, y, 2, 2, P.red[2]); l.set(x, y, P.red[4]); }
    }
  });
}
function pine(p: Px, G: Ramp, snow: boolean, variant: number): void {
  const w = p.w, cx = w / 2, h = p.h;
  shadow(p, cx, h - 3, w * 0.34, 3);
  p.layer((l) => trunk(l, cx, h - 12, h - 2, 4, P.wood));
  const tiers = variant ? 3 : 4, top = 2, bot = h - 8;
  for (let i = tiers - 1; i >= 0; i--) {
    p.layer((l) => {
      const y0 = top + ((bot - top) * i) / (tiers + 0.6) - 1, y1 = top + ((bot - top) * (i + 1.7)) / (tiers + 0.6), hw = (w / 2 - 2) * (0.42 + (0.58 * (i + 1)) / tiers);
      const pts: Pt[] = [[cx, y0]];
      const n = 5 + i;
      for (let k = 0; k <= n; k++) { const x = cx + hw - (2 * hw * k) / n; pts.push([x, y1 - (k % 2 ? 3 : 0) - Math.abs(x - cx) * 0.12]); }
      l.poly(pts, G[1]);
      l.poly([[cx, y0], [cx - hw, y1 - hw * 0.12], [cx - hw * 0.25, y1 - 3], [cx - 1, y0 + 4]], G[2]);
      l.poly([[cx, y0 + 1], [cx - hw * 0.75, y1 - hw * 0.2 - 2], [cx - hw * 0.55, y1 - 5], [cx - 1, y0 + 5]], G[3]);
      const R = rng(40 + i + variant * 9);
      for (let k = 0; k < 10 + i * 4; k++) { const yy = y0 + 3 + R() * (y1 - y0 - 5), f = (yy - y0) / (y1 - y0), xx = cx + (R() * 2 - 1) * hw * f * 0.9; if (l.get(Math.floor(xx), Math.floor(yy))) l.set(xx, yy, xx < cx ? G[4] : G[0]); }
      for (let x = Math.floor(cx - hw); x <= cx + hw; x++) for (let y = Math.floor(y1 - 6); y <= y1; y++) if (l.get(x, y) && !l.get(x, y + 1) && x > cx) l.set(x, y, G[0]);
      if (snow) {
        const S = P.snow;
        l.poly([[cx, y0 - 0.5], [cx - hw * 0.72, y1 - hw * 0.2 - 3], [cx - hw * 0.35, y1 - 6], [cx, y0 + (y1 - y0) * 0.55], [cx + hw * 0.3, y1 - 7], [cx + hw * 0.55, y1 - hw * 0.2 - 4]], S[3]);
        l.poly([[cx, y0], [cx - hw * 0.6, y1 - hw * 0.2 - 4], [cx - hw * 0.3, y1 - 8], [cx - 1, y0 + 4]], S[4]);
        l.line(cx + hw * 0.5, y1 - hw * 0.2 - 4, cx + 1, y0 + 3, S[2]); l.set(cx - hw * 0.5, y1 - 6, S[4]); l.set(cx + hw * 0.2, y1 - 6, S[2]);
      }
    });
  }
}
add('tree_oak', 32, 48, (p) => oak(p, P.green, P.forest, 0), false);
add('tree_oak2', 32, 48, (p) => oak(p, [P.forest[1], P.green[2], P.green[3], P.green[4], mix(P.green[4], P.gold[4], 0.5)], P.green, 1), false);
add('tree_pine', 32, 48, (p) => pine(p, P.forest, false, 0), false);
add('pine_snow', 32, 48, (p) => pine(p, P.forest, true, 0), false);
add('pine_snow2', 24, 40, (p) => pine(p, [P.forest[0], P.teal[0], P.teal[1], P.teal[2], P.teal[3]], true, 1), false);
function bareTree(p: Px, r: Ramp, twist: boolean, accent?: Ramp): void {
  shadow(p, 16, 45, 10, 2.5);
  p.layer((l) => {
    const br = (a: Pt, b: Pt, c: Pt, r0: number, r1: number) => tube(l, bez(a, b, c, 10), r0, r1, r, 1);
    if (twist) { br([16, 46], [8, 36], [17, 28], 4, 3); br([17, 28], [25, 20], [14, 12], 3, 1.6); br([14, 12], [10, 6], [16, 2], 1.6, 0.6); br([17, 26], [26, 26], [29, 16], 2, 0.6); br([12, 34], [4, 30], [3, 20], 2, 0.6); br([18, 16], [24, 10], [27, 6], 1.4, 0.5); br([4, 22], [1, 18], [6, 14], 0.9, 0.5); }
    else { br([16, 46], [15, 36], [16, 26], 3.6, 2.6); br([16, 26], [10, 20], [7, 9], 2.2, 0.6); br([16, 27], [22, 20], [26, 8], 2.2, 0.6); br([16, 24], [17, 14], [15, 3], 1.8, 0.5); br([9, 17], [4, 15], [2, 10], 1, 0.5); br([24, 15], [28, 14], [30, 9], 1, 0.5); br([12, 34], [8, 32], [5, 27], 1.4, 0.5); }
    l.rect(11, 44, 10, 2, r[1]); l.rect(9, 45, 3, 1, r[1]); l.rect(20, 45, 3, 1, r[0]);
    l.px([15, 38, 16, 39, 15, 32], r[0]);
    if (accent) { for (const [x, y] of twist ? [[16, 2], [29, 16], [3, 20], [27, 6], [6, 14]] as const : [[7, 9], [26, 8], [15, 3]] as const) { l.rect(x - 1, y - 1, 2, 2, accent[3]); l.set(x - 1, y - 1, accent[4]); } if (twist) { l.rect(14, 35, 3, 2, INK); l.set(15, 35, accent[4]); } }
  });
}
add('dead_tree', 32, 48, (p) => bareTree(p, [P.ash[0], P.ash[1], P.ash[2], P.ash[3], P.ash[4]], false, P.fire), false);
add('twisted_tree', 32, 48, (p) => bareTree(p, P.shadow, true, P.pink), false);
add('vine_tree', 32, 48, (p) => {
  shadow(p, 16, 45, 12, 3);
  p.layer((l) => { tube(l, bez([16, 46], [12, 36], [17, 26], 10), 4, 3, P.tan, 1); tube(l, bez([13, 40], [20, 34], [15, 28], 8), 1.2, 1, P.forest, 2); l.rect(10, 44, 12, 2, P.tan[1]); });
  p.layer((l) => {
    const O: Ramp = [P.forest[0], P.sand[1], P.sand[2], P.green[3], P.sand[4]];
    leaf(l, 16, 25, 11, 5.5, P.forest, 0, 2, 51); leaf(l, 8, 17, 7, 7, O, 0, 3, 52); leaf(l, 24, 18, 7, 7, O, 0, 2, 53); leaf(l, 16, 11, 10, 8, O, 1, 4, 54);
    for (const [x, len] of [[5, 9], [10, 13], [22, 11], [27, 8], [15, 7]] as const) { for (let y = 0; y < len; y++) l.set(x + ((y >> 1) & 1), 25 + y, y % 3 === 2 ? P.green[4] : P.forest[2]); l.set(x, 25 + len, P.pink[3]); }
  });
}, false);

// ================================================================ Kleinpflanzen
add('bush', 16, 16, (p) => { leaf(p, 5, 10, 4, 4, P.forest, 0, 2, 61); leaf(p, 11, 10, 4, 4, P.green, 0, 2, 62); leaf(p, 8, 7, 5, 4.5, P.green, 1, 4, 63); });
add('bush_berry', 16, 16, (p) => { leaf(p, 5, 10, 4, 4, P.forest, 0, 2, 64); leaf(p, 11, 10, 4, 4, P.green, 0, 2, 65); leaf(p, 8, 7, 5, 4.5, P.green, 1, 4, 66); for (const [x, y] of [[4, 8], [9, 5], [11, 10], [7, 11]] as const) { p.rect(x, y, 2, 2, P.red[2]); p.set(x, y, P.red[4]); } });
add('frozen_bush', 16, 16, (p) => { leaf(p, 5, 10, 4, 4, P.ice, 0, 2, 67); leaf(p, 11, 10, 4, 4, P.ice, 0, 2, 68); leaf(p, 8, 7, 5, 4.5, P.snow, 1, 4, 69); p.px([3, 6, 12, 4, 8, 2], WHITE); });
add('stump', 16, 16, (p) => { p.rrect(3, 6, 10, 9, P.wood[2]); p.rect(3, 8, 2, 6, P.wood[3]); p.rect(10, 8, 3, 7, P.wood[1]); p.rect(1, 13, 3, 2, P.wood[2]); p.rect(12, 13, 3, 2, P.wood[1]); p.ell(8, 7, 5, 3, P.tan[3]); p.ell(8, 7, 3, 1.8, P.tan[2]); p.ell(7.5, 6.8, 1.2, 0.8, P.tan[4]); p.px([6, 11, 7, 12, 9, 10], P.wood[0]); p.set(4, 5, P.green[3]); p.set(5, 4, P.green[4]); });
add('log', 32, 16, (p) => { p.rrect(4, 5, 25, 9, P.wood[2]); p.rect(5, 5, 22, 2, P.wood[3]); p.rect(5, 11, 23, 3, P.wood[1]); p.ell(5.5, 9.5, 3.5, 4.5, P.tan[3]); p.ell(5.5, 9.5, 2, 3, P.tan[2]); p.set(5, 9, P.tan[4]); for (const x of [11, 17, 23]) p.line(x, 7, x + 2, 9, P.wood[1]); p.rect(14, 4, 6, 2, P.green[2]); p.rect(15, 4, 3, 1, P.green[4]); p.rect(22, 5, 3, 1, P.green[3]); p.line(26, 5, 29, 2, P.wood[2]); });
add('rock_s', 16, 16, (p) => rock(p, 8, 10, 6, 5, P.stone, 3));
add('rock_l', 32, 24, (p) => { shadow(p, 16, 21, 14, 2.5); p.layer((l) => { rock(l, 22, 14, 8, 7, P.stone, 5); rock(l, 12, 13, 10, 9, P.stone, 4); rock(l, 24, 19, 4, 3, P.stone, 6); l.px([6, 20, 7, 19, 9, 21], P.green[2]); }); }, false);
add('snow_rock', 24, 20, (p) => { rock(p, 12, 12, 10, 7, P.steel, 7); p.ell(11, 7.5, 8.5, 3.5, P.snow[3]); p.ell(9.5, 6.5, 5.5, 2, P.snow[4]); p.rect(4, 9, 3, 2, P.snow[3]); p.rect(15, 9, 4, 2, P.snow[2]); p.set(18, 11, P.snow[2]); });
add('lava_rock', 16, 16, (p) => { rock(p, 8, 10, 6.5, 5, [P.ash[0], P.ash[1], P.ash[2], P.ash[3], P.ash[4]], 8); p.line(5, 8, 8, 11, P.fire[2]); p.line(8, 11, 11, 9, P.fire[3]); p.line(8, 11, 7, 14, P.fire[1]); p.set(8, 11, P.fire[4]); });
function flowers(p: Px, cols: Ramp[], seed: number): void {
  const R = rng(seed);
  for (let i = 0; i < 5; i++) { const x = 2 + Math.floor(R() * 11), y = 4 + Math.floor(R() * 9), c = cols[i % cols.length]; p.line(x + 1, y + 1, x + 1, y + 3, P.green[2]); p.set(x, y + 3, P.green[3]); p.px([x + 1, y - 1, x, y, x + 2, y, x + 1, y + 1], c[3]); p.set(x + 1, y, P.gold[4]); p.set(x, y - 1 + 1, c[4]); }
}
add('flowers_a', 16, 16, (p) => flowers(p, [P.red, P.gold], 71), false);
add('flowers_b', 16, 16, (p) => flowers(p, [P.blue, P.pink, P.cream], 72), false);
add('tallgrass', 16, 16, (p) => { const R = rng(73); for (let i = 0; i < 9; i++) { const x = 1 + i * 1.6 + R(), h = 6 + R() * 6, lean = R() * 4 - 2; p.line(x, 15, x + lean * 0.4, 15 - h * 0.6, P.green[i % 2 ? 2 : 1]); p.line(x + lean * 0.4, 15 - h * 0.6, x + lean, 15 - h, P.green[i % 2 ? 4 : 3]); } }, false);
add('mushrooms', 16, 16, (p) => { for (const [x, y, s, c] of [[4, 10, 3, P.red], [10, 12, 2.4, P.tan], [11, 7, 2, P.red]] as const) { p.rect(x - 1, y, 2, 3, P.cream[3]); p.set(x, y + 1, P.cream[2]); p.ball(x, y - 0.5, s, s * 0.7, c, 1, 4); p.set(x - 1, y - 1, WHITE); } });
add('glowshroom', 16, 16, (p) => { glow(p, 8, 8, 8, P.teal[3], 70); for (const [x, y, s] of [[5, 9, 3.4], [11, 11, 2.6], [10, 5, 2]] as const) { p.rect(x - 1, y, 2, 4, P.ice[2]); p.ball(x, y - 0.5, s, s * 0.75, P.teal, 2, 4); p.set(x - 1, y - 1, WHITE); p.set(x + 1, y, P.teal[4]); } });
add('fence_h', 16, 16, (p) => { p.rect(0, 6, 16, 2, P.wood[3]); p.rect(0, 7, 16, 1, P.wood[2]); p.rect(0, 11, 16, 2, P.wood[3]); p.rect(0, 12, 16, 1, P.wood[1]); for (const x of [2, 11]) { p.rect(x, 3, 3, 12, P.wood[2]); p.rect(x, 3, 1, 12, P.wood[4]); p.rect(x + 2, 4, 1, 11, P.wood[1]); p.rect(x, 3, 3, 1, P.wood[4]); } });
add('fence_v', 16, 16, (p) => { p.rect(6, 0, 2, 16, P.wood[3]); p.rect(8, 0, 1, 16, P.wood[1]); for (const y of [0, 9]) { p.rect(5, y + 1, 5, 6, P.wood[2]); p.rect(5, y + 1, 1, 6, P.wood[4]); p.rect(9, y + 2, 1, 5, P.wood[1]); p.rect(5, y + 1, 5, 1, P.wood[4]); } });

// ================================================================ Häuser
function house(p: Px, roof: Ramp, v: number): void {
  shadow(p, 32, 69, 30, 3);
  const R = rng(80 + v);
  p.layer((l) => {
    const C = P.cream, Wd = P.wood;
    // Wand
    l.rect(6, 38, 52, 32, C[3]);
    for (let i = 0; i < 26; i++) { const x = 8 + Math.floor(R() * 47), y = 46 + Math.floor(R() * 20); l.rect(x, y, 2, 1, R() < 0.5 ? C[4] : C[2]); }
    l.rect(6, 38, 52, 6, C[1]); l.rect(6, 44, 52, 2, C[2]);
    // Steinsockel
    l.rect(6, 65, 52, 5, P.stone[2]); for (let x = 6; x < 58; x += 6) { l.rect(x + ((x / 6) % 2 ? 2 : 0), 65, 1, 5, P.stone[1]); l.rect(x + 1, 65, 3, 1, P.stone[3]); } l.rect(6, 69, 52, 1, P.stone[0]);
    // Fachwerk
    const beamV = (x: number) => { l.rect(x, 40, 3, 26, Wd[2]); l.rect(x, 40, 1, 26, Wd[3]); l.rect(x + 2, 40, 1, 26, Wd[1]); };
    beamV(6); beamV(55); beamV(22); beamV(39);
    l.rect(6, 52, 52, 2, Wd[2]); l.rect(6, 52, 52, 1, Wd[3]); l.rect(6, 63, 52, 2, Wd[2]); l.rect(6, 64, 52, 1, Wd[1]);
    for (const [a, b] of [[9, 21], [42, 54]] as const) { l.line(a, 62, b, 54, Wd[2], 2); l.line(b, 62, a, 54, Wd[2], 2); l.line(a, 62, b, 54, Wd[3]); }
    // Tür
    const dx = v === 2 ? 26 : 26;
    l.rrect(dx - 1, 49, 13, 21, Wd[0]); l.rrect(dx, 50, 11, 20, Wd[2]); l.rect(dx, 52, 11, 18, Wd[2]);
    for (const x of [dx + 3, dx + 7]) l.rect(x, 51, 1, 19, Wd[1]); l.rect(dx, 51, 2, 19, Wd[3]); l.rect(dx, 56, 11, 1, P.steel[1]); l.rect(dx, 64, 11, 1, P.steel[1]); l.rect(dx + 8, 60, 2, 2, P.gold[3]); l.set(dx + 8, 60, P.gold[4]);
    l.rect(dx - 3, 69, 17, 2, P.stone[3]); l.rect(dx - 3, 70, 17, 1, P.stone[1]);
    // Fenster
    for (const wx of [10, 43]) {
      l.rect(wx, 44, 11, 9, Wd[1]); l.rect(wx + 1, 45, 9, 7, P.blue[1]); l.rect(wx + 1, 45, 4, 3, P.blue[3]); l.rect(wx + 6, 49, 4, 3, P.blue[2]); l.line(wx + 2, 50, wx + 5, 46, P.blue[4]);
      l.rect(wx + 5, 45, 1, 7, Wd[2]); l.rect(wx + 1, 48, 9, 1, Wd[2]);
      l.rect(wx - 1, 53, 13, 3, Wd[2]); l.rect(wx - 1, 53, 13, 1, Wd[3]);
      for (let i = 0; i < 6; i++) { l.set(wx + i * 2, 52 - (i % 2), [P.red[3], P.gold[3], P.pink[3]][(i + v) % 3]); l.set(wx + i * 2 + 1, 52, P.green[3]); }
    }
    if (v === 2) { l.rect(18, 44, 2, 1, P.steel[1]); l.rect(13, 45, 9, 7, Wd[2]); l.rect(14, 46, 7, 5, P.tan[3]); l.rect(16, 47, 3, 3, P.gold[3]); l.set(17, 48, P.gold[4]); }
  });
  // Dach
  p.layer((l) => {
    const top = 8, bot = 42, xl0 = 12, xr0 = 51, xl1 = 1, xr1 = 62;
    for (let y = top; y <= bot; y++) {
      const f = (y - top) / (bot - top), xa = Math.round(xl0 + (xl1 - xl0) * f), xb = Math.round(xr0 + (xr1 - xr0) * f), row = Math.floor((y - top) / 5), ry = (y - top) % 5;
      for (let x = xa; x <= xb; x++) {
        const tx = Math.floor((x + (row % 2 ? 4 : 0)) / 8), k = (x + (row % 2 ? 4 : 0)) % 8, hsh = rng(row * 131 + tx * 17 + v)();
        let c = hsh < 0.18 ? roof[3] : hsh > 0.85 ? roof[1] : roof[2];
        if (ry === 0) c = roof[3]; if (ry === 4) c = roof[1]; if (k === 0) c = roof[1]; if (k === 1 && ry < 3) c = roof[3];
        if (ry === 0 && hsh < 0.5) c = roof[4];
        if (x > xb - 3) c = roof[1]; if (x < xa + 2) c = roof[3];
        l.set(x, y, c);
      }
    }
    l.rect(xl1, bot, xr1 - xl1 + 1, 2, roof[0]); l.rect(xl1, bot - 1, xr1 - xl1 + 1, 1, roof[1]);
    l.rect(xl0 - 1, top - 3, xr0 - xl0 + 3, 4, roof[1]); l.rect(xl0 - 1, top - 3, xr0 - xl0 + 3, 1, roof[3]); for (let x = xl0 + 3; x < xr0; x += 6) l.rect(x, top - 3, 1, 4, roof[0]);
  });
  // Schornstein / Gaube
  p.layer((l) => {
    const cx = v === 1 ? 14 : 44;
    l.rect(cx, 2, 8, 14, P.stone[2]); l.rect(cx, 2, 2, 14, P.stone[3]); l.rect(cx + 6, 3, 2, 13, P.stone[1]); l.rect(cx - 1, 1, 10, 3, P.stone[3]); l.rect(cx - 1, 3, 10, 1, P.stone[1]); l.rect(cx + 2, 1, 4, 1, INK);
    for (let y = 6; y < 15; y += 3) l.rect(cx + ((y / 3) % 2 ? 2 : 4), y, 3, 1, P.stone[1]);
  });
  if (v === 1) p.layer((l) => { l.poly([[24, 30], [32, 17], [40, 30]], roof[2]); l.line(24, 30, 32, 18, roof[3]); l.line(40, 30, 33, 18, roof[1]); l.rect(26, 28, 13, 8, P.cream[3]); l.rect(26, 28, 13, 2, P.cream[1]); l.rect(29, 29, 7, 6, P.wood[1]); l.rect(30, 30, 5, 4, P.blue[2]); l.rect(30, 30, 2, 2, P.blue[4]); l.rect(32, 30, 1, 4, P.wood[2]); });
}
add('house_a', 64, 72, (p) => house(p, P.red, 0), false);
add('house_b', 64, 72, (p) => house(p, P.blue, 1), false);
add('house_c', 64, 72, (p) => house(p, [P.forest[0], P.forest[1], P.teal[2], P.teal[3], P.teal[4]], 2), false);

// ================================================================ Dorf-Requisiten
add('well', 32, 40, (p) => {
  shadow(p, 16, 37, 13, 3);
  p.layer((l) => { l.rect(5, 12, 3, 22, P.wood[2]); l.rect(5, 12, 1, 22, P.wood[3]); l.rect(24, 12, 3, 22, P.wood[1]); l.rect(8, 16, 16, 2, P.wood[2]); l.rect(15, 18, 1, 8, P.cream[2]); l.rrect(13, 24, 6, 5, P.wood[2]); l.rect(13, 25, 6, 1, P.steel[2]); });
  p.layer((l) => {
    l.ell(16, 31, 12, 5, P.stone[2]); l.rect(4, 31, 24, 5, P.stone[2]); l.ell(16, 36, 12, 3, P.stone[1]); l.ell(16, 31, 12, 5, P.stone[3]); l.ell(16, 31, 9, 3.4, P.blue[0]); l.ell(15, 31.5, 6, 2, P.blue[2]); l.rect(12, 31, 3, 1, P.blue[4]);
    for (let x = 5; x < 27; x += 5) { l.rect(x, 34 + ((x / 5) % 2), 1, 3, P.stone[0]); l.rect(x + 1, 33, 3, 1, P.stone[4]); }
  });
  p.layer((l) => { l.poly([[1, 14], [8, 3], [24, 3], [31, 14]], P.red[2]); l.poly([[1, 14], [8, 3], [14, 3], [9, 14]], P.red[3]); l.rect(1, 13, 30, 2, P.red[1]); for (let x = 5; x < 30; x += 5) l.line(x, 13, x + (x < 16 ? 2 : -2) * 1 + (16 - x) * 0.12, 4, P.red[1]); l.rect(8, 2, 16, 2, P.red[1]); l.rect(8, 2, 16, 1, P.red[4]); });
}, false);
add('stall', 32, 32, (p) => {
  shadow(p, 16, 30, 14, 2.5);
  p.layer((l) => { l.rect(3, 8, 2, 22, P.wood[2]); l.rect(27, 8, 2, 22, P.wood[1]); l.rect(2, 19, 28, 10, P.wood[2]); l.rect(2, 19, 28, 2, P.wood[4]); l.rect(2, 21, 28, 1, P.wood[1]); for (let x = 7; x < 30; x += 6) l.rect(x, 22, 1, 7, P.wood[1]); l.rect(2, 28, 28, 1, P.wood[0]);
    for (const [x, c] of [[5, P.red], [10, P.fire], [15, P.green], [20, P.gold], [24, P.pink]] as const) { l.ball(x + 1.5, 17.5, 2.2, 2, c, 1, 4); } l.rect(8, 13, 3, 4, P.blue[3]); l.set(8, 13, WHITE); l.rect(21, 12, 2, 5, P.tan[3]); });
  p.layer((l) => { for (let x = 0; x < 32; x++) { const c = Math.floor(x / 4) % 2 ? P.cream : P.red; l.rect(x, 2 + (x < 2 || x > 29 ? 1 : 0), 1, 7, c[3]); l.set(x, 2 + (x < 2 || x > 29 ? 1 : 0), c[4]); l.rect(x, 8, 1, 2 + ((x % 4) === 1 || (x % 4) === 2 ? 1 : 0), c[2]); } l.rect(0, 7, 32, 1, P.red[1]); });
}, false);
add('barrel', 16, 20, (p) => { p.rrect(3, 3, 10, 16, P.wood[2]); p.rect(2, 6, 12, 10, P.wood[2]); p.rect(2, 6, 2, 10, P.wood[3]); p.rect(11, 5, 3, 12, P.wood[1]); for (const x of [6, 9]) p.rect(x, 4, 1, 14, P.wood[1]); p.rect(2, 6, 12, 2, P.steel[2]); p.rect(2, 14, 12, 2, P.steel[2]); p.rect(2, 6, 3, 1, P.steel[4]); p.rect(2, 14, 3, 1, P.steel[3]); p.ell(8, 4, 5, 2, P.tan[2]); p.ell(8, 4, 3.4, 1.2, P.tan[3]); });
add('crate', 16, 16, (p) => { p.rect(2, 3, 12, 12, P.tan[2]); p.rect(2, 3, 12, 2, P.tan[4]); p.rect(2, 5, 12, 1, P.tan[1]); p.rect(2, 6, 2, 9, P.tan[3]); p.rect(12, 6, 2, 9, P.tan[1]); p.rect(2, 13, 12, 2, P.tan[1]); p.line(4, 7, 11, 12, P.tan[3], 2); p.line(11, 7, 4, 12, P.tan[1]); p.px([3, 4, 12, 4, 3, 14, 12, 14], P.steel[3]); });
add('lamp', 16, 32, (p) => { glow(p, 8, 7, 8, P.gold[3], 80); p.rect(7, 12, 2, 18, P.steel[1]); p.rect(7, 12, 1, 18, P.steel[2]); p.rect(5, 29, 6, 2, P.steel[1]); p.rect(6, 28, 4, 1, P.steel[2]); p.rect(5, 11, 6, 1, P.steel[1]); p.rect(5, 4, 6, 7, P.gold[4]); p.rect(6, 5, 4, 5, P.fire[4]); p.rect(7, 6, 2, 3, WHITE); p.rect(5, 4, 1, 7, P.steel[1]); p.rect(10, 4, 1, 7, P.steel[1]); p.poly([[3.5, 4], [8, 0.5], [12.5, 4]], P.steel[1]); p.rect(6, 2, 3, 1, P.steel[3]); });
add('signpost', 16, 24, (p) => { p.rect(7, 6, 2, 17, P.wood[2]); p.rect(7, 6, 1, 17, P.wood[3]); p.rect(5, 22, 6, 1, P.wood[1]); p.poly([[1, 4], [12, 4], [15, 7], [12, 10], [1, 10]], P.tan[3]); p.rect(1, 4, 11, 1, P.tan[4]); p.rect(1, 9, 11, 1, P.tan[1]); p.rect(3, 6, 6, 1, P.wood[1]); p.rect(3, 8, 4, 1, P.wood[1]); p.poly([[14, 12], [4, 12], [1, 14.5], [4, 17], [14, 17]], P.tan[2]); p.rect(5, 14, 6, 1, P.wood[1]); });
add('bounty_board', 32, 32, (p) => { shadow(p, 16, 30, 13, 2); p.layer((l) => { l.rect(4, 8, 3, 23, P.wood[2]); l.rect(4, 8, 1, 23, P.wood[3]); l.rect(25, 8, 3, 23, P.wood[1]); l.rect(2, 7, 28, 17, P.wood[1]); l.rect(3, 8, 26, 15, P.tan[2]); l.rect(3, 8, 26, 1, P.tan[1]); l.poly([[0, 7], [16, 1], [32, 7]], P.wood[2]); l.line(1, 6, 16, 1, P.wood[4]); l.rect(0, 6, 32, 2, P.wood[1]);
    for (const [x, y, w, h, c] of [[5, 10, 7, 9, P.cream[4]], [14, 11, 6, 7, P.cream[3]], [22, 10, 6, 9, P.cream[4]], [13, 18, 8, 4, P.sand[4]]] as const) { l.rect(x, y, w, h, c); l.rect(x + 1, y + 2, w - 2, 1, P.cream[1]); l.rect(x + 1, y + 4, w - 3, 1, P.cream[1]); l.set(x + (w >> 1), y, P.red[2]); }
    l.rect(7, 15, 3, 3, P.red[2]); l.rect(23, 15, 3, 2, P.stone[1]); }); }, false);
add('anvil', 16, 16, (p) => { p.rect(4, 12, 8, 3, P.wood[2]); p.rect(4, 12, 8, 1, P.wood[3]); p.rect(6, 8, 4, 4, P.steel[1]); p.rect(2, 4, 12, 4, P.steel[2]); p.rect(2, 4, 11, 1, P.steel[4]); p.rect(0, 5, 3, 2, P.steel[3]); p.rect(3, 7, 10, 1, P.steel[1]); p.rect(12, 5, 3, 2, P.steel[1]); });
add('haystack', 32, 24, (p) => { shadow(p, 16, 21, 14, 2.5); p.layer((l) => { l.ball(16, 14, 13, 9, P.gold, 1, 4); for (let x = 0; x < 32; x++) for (let y = 21; y < 24; y++) l.set(x, y, 0); const R = rng(91); for (let i = 0; i < 40; i++) { const x = 5 + R() * 22, y = 6 + R() * 13; if (l.get(Math.floor(x), Math.floor(y))) l.line(x, y, x + (R() - 0.5) * 2, y + 2 + R() * 2, R() < 0.5 ? P.gold[1] : P.gold[4]); } l.rect(4, 13, 24, 1, P.tan[1]); l.rect(4, 12, 24, 1, P.tan[3]); l.px([3, 21, 28, 20, 9, 22], P.gold[3]); }); }, false);
add('tent', 48, 40, (p) => { shadow(p, 24, 37, 22, 3); p.layer((l) => { const C = P.cream, A = P.red;
  l.poly([[24, 3], [46, 36], [2, 36]], C[3]); l.poly([[24, 3], [14, 36], [2, 36]], C[4]); l.poly([[24, 3], [46, 36], [36, 36]], C[2]);
  l.poly([[24, 12], [31, 36], [17, 36]], INK); l.poly([[24, 12], [20, 36], [17, 36]], P.wood[0]); l.poly([[24, 10], [18, 36], [15, 36]], C[2]); l.poly([[24, 10], [33, 36], [30, 36]], C[1]);
  for (let i = 0; i < 5; i++) { l.line(6 + i * 2, 34 - i, 12 + i * 2, 20 - i * 2, C[3]); } l.line(24, 3, 40, 28, C[1]); l.rect(2, 34, 44, 2, A[2]); l.rect(2, 34, 14, 1, A[3]); l.rect(30, 35, 16, 1, A[1]);
  l.rect(23, 0, 2, 4, P.wood[2]); l.poly([[25, 0], [31, 2], [25, 4]], A[2]); l.line(2, 36, 0, 39, P.wood[2]); l.line(46, 36, 47, 39, P.wood[2]); }); }, false);
add('banner', 16, 32, (p) => { p.rect(3, 1, 2, 30, P.wood[2]); p.rect(3, 1, 1, 30, P.wood[3]); p.rect(2, 30, 4, 1, P.wood[1]); p.rect(3, 0, 2, 2, P.gold[3]); p.rect(4, 3, 10, 2, P.wood[2]); p.poly([[5, 5], [14, 5], [14, 22], [9.5, 18], [5, 22]], P.red[2]); p.rect(5, 5, 2, 15, P.red[3]); p.rect(12, 5, 2, 15, P.red[1]); p.rect(5, 5, 9, 1, P.gold[3]); p.rect(8, 9, 3, 5, P.gold[3]); p.rect(7, 10, 5, 3, P.gold[3]); p.set(9, 11, P.gold[4]); });

// ================================================================ Kristallhöhlen
const CAVE: Ramp = [P.shadow[1], P.steel[0], P.steel[1], P.steel[2], P.steel[3]];
function stalag(l: Px, cx: number, base: number, h: number, w: number, r: Ramp): void {
  l.poly([[cx - w, base], [cx - w * 0.5, base - h * 0.5], [cx, base - h], [cx + w * 0.6, base - h * 0.45], [cx + w, base]], r[2]);
  l.poly([[cx - w, base], [cx - w * 0.5, base - h * 0.5], [cx, base - h], [cx - w * 0.1, base - h * 0.4], [cx - w * 0.3, base]], r[3]);
  l.line(cx - w * 0.5, base - h * 0.5, cx - 0.5, base - h + 1, r[4]); l.poly([[cx + w * 0.3, base], [cx + w * 0.6, base - h * 0.45], [cx + w, base]], r[1]);
  for (let y = base - 3; y > base - h * 0.7; y -= 4) l.rect(cx - w * 0.3 * ((base - y) / h + 0.4), y, w * 0.8, 1, r[1]);
  l.rect(cx - w, base - 1, w * 2, 1, r[0]);
}
add('stalagmite', 16, 24, (p) => { stalag(p, 6, 23, 18, 4.5, CAVE); stalag(p, 12, 23, 9, 3, CAVE); });
add('stalagmite_l', 24, 40, (p) => { stalag(p, 17, 39, 22, 5, CAVE); stalag(p, 10, 39, 36, 7.5, CAVE); stalag(p, 4, 39, 12, 3.4, CAVE); p.set(9, 8, P.teal[4]); p.set(12, 20, P.teal[3]); });
function crystalCluster(p: Px, r: Ramp, r2: Ramp, big: boolean): void {
  const w = p.w, h = p.h;
  glow(p, w / 2, h * 0.55, w * 0.55, r[3], 55);
  p.layer((l) => {
    if (big) { crystal(l, 8, 44, 3, 22, 4, r2); crystal(l, 24, 44, 29, 18, 4.5, r); crystal(l, 16, 45, 15, 2, 7, r); crystal(l, 10, 45, 7, 30, 3, r); crystal(l, 22, 45, 25, 32, 3, r2); rock(l, 16, 44, 13, 3.5, CAVE, 9); }
    else { crystal(l, 4, 21, 2, 11, 2.2, r2); crystal(l, 12, 21, 14, 8, 2.5, r); crystal(l, 8, 22, 8, 1, 3.5, r); rock(l, 8, 21, 7, 2.5, CAVE, 10); }
  });
  sparkle(p, big ? 13 : 7, big ? 8 : 5, r[4]);
}
add('crystal_blue', 16, 24, (p) => crystalCluster(p, P.blue, P.ice, false), false);
add('crystal_pink', 16, 24, (p) => crystalCluster(p, P.pink, P.violet, false), false);
add('crystal_big', 32, 48, (p) => crystalCluster(p, P.teal, P.ice, true), false);
add('void_crystal', 16, 24, (p) => crystalCluster(p, P.violet, P.pink, false), false);
add('bones', 16, 16, (p) => { const B = P.bone; p.line(2, 12, 11, 7, B[3], 2); p.rect(1, 12, 2, 3, B[3]); p.rect(11, 5, 3, 2, B[4]); p.rect(12, 7, 2, 2, B[3]); p.line(5, 6, 12, 13, B[2]); p.rect(4, 5, 2, 2, B[3]); p.rect(12, 13, 2, 2, B[2]); for (let i = 0; i < 3; i++) p.line(6 + i * 2, 13, 7 + i * 2, 10, B[4]); });
add('skull', 16, 16, (p) => { const B = P.bone; p.ball(8, 8, 5.5, 5, B, 2, 4); p.rect(5, 11, 6, 3, B[3]); p.rect(5, 7, 2, 3, INK); p.rect(9, 7, 2, 3, INK); p.set(8, 10, B[1]); p.rect(6, 13, 1, 1, INK); p.rect(8, 13, 1, 1, INK); p.rect(10, 12, 1, 2, B[2]); p.line(11, 3, 14, 1, B[3]); p.set(3, 13, B[2]); });

// ================================================================ Glutlande
const BAS: Ramp = [P.ash[0], P.ash[1], P.ash[2], P.ash[3], P.ash[4]];
add('basalt_column', 16, 32, (p) => { for (const [x, top, w] of [[1, 14, 5], [10, 9, 5], [5, 3, 6]] as const) { p.rect(x, top + 2, w, 30 - top, BAS[2]); p.rect(x, top + 2, 2, 30 - top, BAS[3]); p.rect(x + w - 2, top + 2, 2, 30 - top, BAS[1]); p.poly([[x, top + 2], [x + w / 2, top], [x + w, top + 2], [x + w / 2, top + 4]], BAS[4]); p.rect(x + 1, top + 2, w - 2, 1, BAS[4]); for (let y = top + 8; y < 30; y += 7) p.rect(x + 1, y, w - 2, 1, BAS[1]); } p.rect(1, 30, 14, 1, BAS[0]); p.set(7, 20, P.fire[2]); p.set(7, 21, P.fire[1]); });
add('obsidian', 16, 24, (p) => { const O: Ramp = [INK, P.shadow[1], P.shadow[3], P.violet[2], P.violet[4]]; crystal(p, 4, 22, 2, 13, 2.2, O); crystal(p, 9, 23, 10, 2, 4, O); crystal(p, 13, 22, 14, 14, 2, O); p.line(8, 6, 7, 16, WHITE); p.set(11, 9, P.violet[4]); p.rect(2, 22, 13, 1, O[1]); });
for (let k = 0; k < 3; k++) add(`ember_vent_${k}`, 16, 16, (p) => { glow(p, 8, 9, 8, P.fire[2], 70 + k * 15); p.layer((l) => { l.ell(8, 11, 7.5, 4.5, BAS[2]); l.ell(7, 10, 6, 3, BAS[3]); for (const [x, y] of [[2, 9], [12, 8], [13, 12], [4, 13], [8, 6]] as const) { l.rrect(x - 1, y - 1, 3, 3, BAS[3]); l.set(x - 1, y - 1, BAS[4]); } l.ell(8, 11, 4.6, 2.6, P.fire[1]); l.ell(8, 11, 3.4, 1.8, P.fire[k === 1 ? 3 : 2]); l.ell(8, 11, 2, 1, P.fire[k === 2 ? 3 : 4]); }); const e = [[6, 5, 9, 2, 11, 6], [8, 4, 5, 7, 10, 1], [10, 5, 7, 1, 5, 3]][k]; p.set(e[0], e[1], P.fire[4]); p.set(e[2], e[3], P.fire[3]); p.set(e[4], e[5], P.fire[2]); }, false);

// ================================================================ Frostgebirge
function iceSpike(p: Px, big: boolean): void { if (big) { crystal(p, 6, 38, 3, 20, 3.5, P.ice); crystal(p, 18, 38, 21, 16, 3.5, P.ice); crystal(p, 12, 39, 12, 1, 6, P.ice); p.ell(12, 38, 10, 2, P.snow[3]); p.rect(5, 37, 8, 1, P.snow[4]); } else { crystal(p, 4, 22, 3, 12, 2.2, P.ice); crystal(p, 12, 22, 13, 10, 2.2, P.ice); crystal(p, 8, 23, 8, 1, 3.5, P.ice); p.ell(8, 22, 7, 1.6, P.snow[3]); p.rect(3, 21, 5, 1, P.snow[4]); } }
add('ice_spike', 16, 24, (p) => iceSpike(p, false));
add('ice_spike_l', 24, 40, (p) => iceSpike(p, true));
add('snowman', 16, 24, (p) => { const S = P.snow; p.ball(8, 17, 6, 5.5, S, 1, 4); p.ball(8, 9, 4.2, 4, S, 2, 4); p.rect(6, 8, 1, 1, INK); p.rect(9, 8, 1, 1, INK); p.rect(8, 10, 3, 1, P.fire[2]); p.px([7, 15, 7, 18], INK); p.rect(5, 12, 7, 1, P.red[2]); p.rect(10, 13, 2, 3, P.red[1]); p.rect(5, 3, 6, 3, P.steel[0]); p.rect(4, 5, 8, 1, P.steel[1]); p.line(2, 14, 0, 10, P.wood[2]); p.line(14, 14, 15, 10, P.wood[2]); });

// ================================================================ Ruinen
const RUIN: Ramp = P.sand;
function pillar(p: Px, x: number, top: number, bot: number, broken: boolean): void {
  p.rect(x + 1, top, 8, bot - top - 3, RUIN[3]); p.rect(x + 1, top, 2, bot - top - 3, RUIN[4]); p.rect(x + 7, top, 2, bot - top - 3, RUIN[2]); for (const xx of [x + 4, x + 6]) p.rect(xx, top, 1, bot - top - 3, RUIN[2]);
  p.rect(x, bot - 4, 10, 2, RUIN[3]); p.rect(x - 1, bot - 2, 12, 2, RUIN[2]); p.rect(x - 1, bot - 2, 5, 1, RUIN[4]); p.rect(x - 1, bot - 1, 12, 1, RUIN[1]);
  if (!broken) { p.rect(x, top, 10, 2, RUIN[3]); p.rect(x - 1, top - 3, 12, 3, RUIN[3]); p.rect(x - 1, top - 3, 12, 1, RUIN[4]); p.rect(x + 6, top - 2, 5, 2, RUIN[2]); }
  else { p.poly([[x + 1, top], [x + 4, top - 3], [x + 6, top - 1], [x + 9, top - 4], [x + 9, top + 1]], RUIN[3]); p.set(x + 4, top - 2, RUIN[4]); }
  p.line(x + 3, top + 6, x + 5, top + 10, RUIN[1]); p.px([x + 1, bot - 6, x + 2, bot - 7, x + 1, bot - 9, x + 8, bot - 8], P.green[2]); p.set(x + 2, bot - 8, P.green[3]);
}
add('pillar', 16, 40, (p) => pillar(p, 3, 4, 39, false));
add('pillar_broken', 16, 24, (p) => { pillar(p, 3, 8, 23, true); p.rect(13, 20, 3, 2, RUIN[2]); p.set(13, 20, RUIN[4]); });
add('statue', 24, 40, (p) => { const S = P.stone; shadow(p, 12, 38, 10, 2); p.layer((l) => {
  l.rect(4, 31, 16, 7, S[2]); l.rect(4, 31, 16, 2, S[4]); l.rect(15, 33, 5, 5, S[1]); l.rect(3, 37, 18, 2, S[1]); l.rect(7, 34, 6, 1, S[1]);
  l.poly([[7, 31], [8, 17], [16, 17], [17, 31]], S[3]); l.poly([[7, 31], [8, 17], [11, 17], [10, 31]], S[4]); l.poly([[14, 19], [16, 17], [17, 31], [14, 31]], S[2]); l.line(12, 20, 12, 30, S[2]);
  l.ball(12, 12, 4.5, 4.5, S, 2, 4); l.rect(10, 12, 1, 2, S[1]); l.rect(13, 12, 1, 2, S[1]); l.rect(8, 7, 8, 2, S[3]); l.rect(8, 7, 3, 1, S[4]);
  l.line(8, 19, 5, 25, S[3], 2); l.line(16, 19, 19, 13, S[2], 2); l.rect(19, 3, 1, 27, S[3]); l.poly([[17.5, 4], [19.5, 0], [21.5, 4]], S[4]);
  l.line(14, 22, 16, 27, S[1]); l.px([5, 30, 6, 29, 8, 24, 17, 28, 18, 30], P.green[2]); l.set(6, 30, P.green[3]); }); }, false);
add('rubble', 16, 16, (p) => { for (const [x, y, w, h] of [[2, 9, 6, 5], [8, 10, 6, 4], [5, 5, 5, 4], [11, 7, 3, 3]] as const) { p.rrect(x, y, w, h, RUIN[2]); p.rect(x + 1, y, w - 2, 1, RUIN[4]); p.rect(x + 1, y + h - 1, w - 1, 1, RUIN[1]); } p.px([3, 8, 13, 14], P.green[2]); });
add('arch', 48, 48, (p) => { shadow(p, 24, 46, 22, 2.5); p.layer((l) => { const brick = (x: number, y: number, w: number, h: number, c = 3) => { l.rect(x, y, w, h, RUIN[c]); l.rect(x, y, w, 1, RUIN[Math.min(4, c + 1)]); l.rect(x, y + h - 1, w, 1, RUIN[c - 1]); l.rect(x + w - 1, y, 1, h, RUIN[c - 1]); };
  for (let i = 0; i < 6; i++) { brick(4 - (i % 2), 40 - i * 6, 10 + (i % 2), 6); brick(34, 40 - i * 6, 10 + (i % 2), 6, 2); }
  for (let i = 0; i <= 8; i++) { const a = Math.PI * (1 - i / 8), x = 24 + Math.cos(a) * 16, y = 13 - Math.sin(a) * 9; brick(Math.round(x) - 3, Math.round(y) - 3, 7, 6, i > 5 ? 2 : 3); }
  brick(20, 0, 8, 6, 3); l.rect(22, 2, 4, 2, P.teal[2]); l.set(23, 2, P.teal[4]); l.rect(2, 44, 14, 3, RUIN[2]); l.rect(32, 44, 14, 3, RUIN[1]); l.rect(2, 44, 14, 1, RUIN[4]);
  for (const [x, y] of [[5, 20], [6, 21], [5, 22], [12, 30], [13, 31], [40, 14], [41, 15], [36, 36], [18, 5], [30, 6]] as const) l.set(x, y, P.green[2]); for (let y = 0; y < 10; y++) l.set(43 + ((y >> 1) & 1), 12 + y, y % 3 ? P.forest[2] : P.green[3]); }); }, false);
add('rune_stone', 16, 24, (p) => { glow(p, 8, 12, 8, P.teal[3], 50); p.poly([[3, 23], [2, 8], [6, 2], [11, 3], [14, 9], [13, 23]], P.stone[2]); p.poly([[3, 23], [2, 8], [6, 2], [8, 3], [6, 23]], P.stone[3]); p.poly([[11, 3], [14, 9], [13, 23], [11, 23]], P.stone[1]); p.line(3, 8, 6, 3, P.stone[4]); p.rect(3, 22, 10, 1, P.stone[0]);
  const T = P.teal[4]; p.rect(8, 6, 1, 6, T); p.line(8, 6, 10, 8, T); p.line(8, 9, 10, 11, T); p.rect(6, 14, 4, 1, T); p.rect(7, 14, 1, 5, T); p.rect(9, 16, 1, 3, T); p.set(8, 8, WHITE); p.px([3, 20, 4, 21, 12, 19], P.green[2]); }, true);
add('urn', 16, 16, (p) => { p.ball(8, 10, 5, 5, P.tan, 1, 4); p.rect(6, 2, 4, 3, P.tan[2]); p.rect(5, 1, 6, 2, P.tan[3]); p.rect(5, 1, 3, 1, P.tan[4]); p.rect(6, 14, 4, 1, P.tan[1]); p.rect(3, 8, 10, 1, P.teal[2]); p.rect(3, 9, 10, 1, P.red[1]); p.px([5, 8, 8, 8, 11, 8], P.teal[4]); p.line(10, 5, 12, 8, P.tan[0]); });

// ================================================================ Schattenreich
add('tombstone', 16, 20, (p) => { const S: Ramp = [P.shadow[1], P.shadow[2], P.shadow[3], P.shadow[4], P.violet[3]]; p.rrect(3, 2, 10, 16, S[2]); p.rect(3, 6, 10, 12, S[2]); p.rect(3, 4, 2, 13, S[3]); p.rect(11, 5, 2, 13, S[1]); p.rect(5, 2, 5, 1, S[4]); p.rect(2, 17, 12, 2, S[1]); p.rect(7, 6, 2, 7, P.pink[2]); p.rect(5, 8, 6, 2, P.pink[2]); p.set(7, 8, P.pink[4]); p.line(10, 12, 11, 16, S[0]); });
add('shadow_spire', 16, 40, (p) => { const S: Ramp = [INK, P.shadow[1], P.shadow[2], P.shadow[3], P.violet[2]]; glow(p, 8, 8, 7, P.pink[2], 60); crystal(p, 4, 38, 3, 22, 2.5, S); crystal(p, 12, 38, 13, 26, 2.2, S); crystal(p, 8, 39, 8, 4, 4.5, S); p.rect(7, 12, 2, 2, P.pink[3]); p.set(7, 12, P.pink[4]); p.rect(8, 19, 1, 4, P.pink[2]); p.rect(7, 27, 2, 1, P.pink[2]); p.rect(2, 38, 13, 1, S[1]); });
add('eye_stalk', 16, 24, (p) => { const S = P.shadow; p.layer((l) => { tube(l, bez([8, 23], [3, 16], [8, 9], 10), 2.2, 1.6, S, 2); l.rect(4, 22, 8, 1, S[2]); l.line(6, 18, 2, 15, S[3]); l.line(9, 16, 13, 14, S[3]); }); p.layer((l) => { l.ball(8.5, 6.5, 5, 5, P.bone, 2, 4); l.ball(9.5, 7, 2.6, 2.6, P.pink, 1, 3); l.rect(9, 6, 2, 2, INK); l.set(8, 5, WHITE); l.poly([[3.5, 6], [5, 2], [12, 2], [13.5, 6], [11, 3.5], [6, 3.5]], S[3]); l.set(5, 9, P.red[3]); }); }, false);
for (const nm of ['floating_shard'] as const) add(nm, 16, 24, (p) => { const S: Ramp = [INK, P.shadow[2], P.shadow[4], P.violet[3], P.violet[4]]; glow(p, 8, 10, 8, P.violet[2], 60); const q = new Px(16, 24); q.poly([[8, 1], [12, 8], [9, 17], [5, 9]], S[2]); q.poly([[8, 1], [8, 16], [5, 9]], S[3]); q.line(8, 3, 6, 9, S[4]); q.poly([[3, 14], [5, 16], [4, 20]], S[2]); q.poly([[12, 13], [14, 15], [12, 18]], S[3]); q.outline(); p.draw(q); p.set(7, 5, WHITE); for (let x = 5; x < 12; x++) if ((x & 1) === 0) p.set(x, 22, alpha(INK, 90)); p.rect(6, 23, 5, 1, alpha(INK, 70)); }, false);

// ================================================================ Truhen
function chest(p: Px, body: Ramp, band: Ramp, open: boolean): void {
  const oy = p.h - 16;
  if (open) {
    p.rrect(1, oy - 3, 14, 8, body[1]); p.rect(2, oy - 2, 12, 6, body[0]); p.rect(1, oy - 3, 14, 1, body[3]); p.rect(2, oy - 3, 1, 7, band[2]); p.rect(13, oy - 3, 1, 7, band[1]); p.rect(7, oy - 3, 2, 3, band[3]);
    p.rect(3, oy + 3, 10, 3, P.gold[3]); p.px([4, oy + 2, 7, oy + 2, 10, oy + 3, 6, oy + 3], P.gold[4]); p.set(9, oy + 2, WHITE); p.set(11, oy + 2, P.red[3]);
  } else {
    p.rrect(1, oy + 1, 14, 7, body[3]); p.rect(2, oy + 1, 12, 1, body[4]); p.rect(1, oy + 5, 14, 2, body[2]); p.rect(10, oy + 2, 4, 4, body[2]);
  }
  p.rect(1, oy + 7, 14, 8, body[2]); p.rect(1, oy + 7, 14, 1, body[1]); p.rect(2, oy + 8, 3, 6, body[3]); p.rect(11, oy + 8, 3, 7, body[1]); p.rect(1, oy + 14, 14, 1, body[0]);
  p.rect(2, oy + (open ? 7 : 1), 2, open ? 8 : 14, band[2]); p.rect(12, oy + (open ? 7 : 1), 2, open ? 8 : 14, band[1]); p.rect(2, oy + (open ? 7 : 1), 1, open ? 8 : 14, band[3]);
  p.rect(1, oy + 7, 14, 1, band[1]);
  if (!open) { p.rect(6, oy + 5, 4, 5, band[3]); p.rect(6, oy + 5, 4, 1, band[4]); p.rect(7, oy + 7, 2, 2, INK); p.rect(9, oy + 6, 1, 4, band[1]); }
}
const CHESTS: Array<[string, Ramp, Ramp]> = [['wood', P.wood, P.steel], ['silver', P.steel, P.blue], ['gold', P.gold, P.red]];
for (const [n, b, bd] of CHESTS) { add(`chest_${n}_closed`, 16, 16, (p) => chest(p, b, n === 'gold' ? [P.red[0], P.red[1], P.red[2], P.fire[3], P.gold[4]] : bd, false)); add(`chest_${n}_open`, 16, 20, (p) => chest(p, b, n === 'gold' ? [P.red[0], P.red[1], P.red[2], P.fire[3], P.gold[4]] : bd, true)); }

// ================================================================ Türen / Tore
function doorFrame(p: Px): void { const S = P.stone; p.rect(0, 2, 16, 30, S[2]); p.rrect(0, 0, 16, 6, S[3]); p.rect(1, 0, 14, 1, S[4]); p.rect(0, 4, 3, 28, S[3]); p.rect(13, 4, 3, 28, S[1]); p.rect(0, 4, 1, 28, S[4]); for (let y = 8; y < 32; y += 6) { p.rect(0, y, 3, 1, S[1]); p.rect(13, y + 3, 3, 1, S[0]); } p.rect(6, 1, 4, 3, S[4]); p.rect(6, 3, 4, 1, S[1]); }
function doorLeaf(p: Px, locked: boolean): void { const W = P.wood; p.rrect(3, 5, 10, 27, W[2]); p.rect(3, 7, 10, 25, W[2]); for (const x of [6, 9]) p.rect(x, 6, 1, 26, W[1]); p.rect(3, 7, 1, 25, W[3]); p.rect(12, 7, 1, 25, W[0]); p.rect(3, 11, 10, 2, P.steel[2]); p.rect(3, 25, 10, 2, P.steel[2]); p.rect(3, 11, 10, 1, P.steel[3]); p.rect(3, 25, 10, 1, P.steel[3]); p.px([4, 12, 11, 12, 4, 26, 11, 26], P.steel[4]); p.rect(3, 31, 10, 1, W[0]);
  if (locked) { p.rect(5, 17, 6, 6, P.gold[2]); p.rect(5, 17, 6, 1, P.gold[4]); p.rect(5, 17, 1, 6, P.gold[3]); p.rect(10, 18, 1, 5, P.gold[1]); p.rect(7, 19, 2, 2, INK); p.rect(8, 21, 1, 1, INK); p.rect(6, 15, 4, 2, P.steel[3]); p.rect(7, 16, 2, 1, W[2]); }
  else { p.rect(10, 18, 2, 3, P.steel[3]); p.set(10, 18, P.steel[4]); } }
add('door_locked', 16, 32, (p) => { doorFrame(p); doorLeaf(p, true); });
add('door_closed', 16, 32, (p) => { doorFrame(p); doorLeaf(p, false); });
add('door_open', 16, 32, (p) => { doorFrame(p); p.rrect(3, 5, 10, 27, INK); p.rect(3, 7, 10, 25, INK); p.rect(3, 6, 3, 26, P.wood[1]); p.rect(3, 6, 1, 26, P.wood[2]); p.rect(3, 11, 3, 1, P.steel[2]); p.rect(3, 25, 3, 1, P.steel[2]); p.rect(6, 28, 7, 4, P.shadow[2]); p.rect(6, 30, 7, 2, P.stone[1]); p.rect(8, 31, 5, 1, P.stone[2]); });
add('gate_bars', 16, 32, (p) => { doorFrame(p); p.rrect(3, 5, 10, 27, INK); p.rect(3, 7, 10, 25, P.shadow[1]); for (const x of [4, 7, 10]) { p.rect(x, 6, 2, 26, P.steel[2]); p.rect(x, 6, 1, 26, P.steel[4]); p.poly([[x - 0.5, 31], [x + 1, 34], [x + 2.5, 31]], P.steel[3]); } p.rect(3, 10, 10, 2, P.steel[1]); p.rect(3, 22, 10, 2, P.steel[1]); p.rect(3, 10, 10, 1, P.steel[3]); p.rect(3, 22, 10, 1, P.steel[3]); });
add('door_boss', 32, 32, (p) => { const S = P.stone, V = P.violet;
  p.rect(0, 3, 32, 29, S[2]); p.rrect(0, 0, 32, 7, S[3]); p.rect(1, 0, 30, 1, S[4]); p.rect(0, 5, 4, 27, S[3]); p.rect(28, 5, 4, 27, S[1]); p.rect(0, 5, 1, 27, S[4]); for (let y = 9; y < 32; y += 6) { p.rect(0, y, 4, 1, S[1]); p.rect(28, y + 3, 4, 1, S[0]); }
  p.rrect(4, 5, 24, 27, P.shadow[1]); p.rect(4, 8, 24, 24, P.shadow[2]); p.rect(4, 8, 12, 24, P.shadow[3]); p.rect(15, 6, 2, 26, INK); for (const x of [8, 12, 20, 24]) p.rect(x, 7, 1, 25, P.shadow[1]);
  p.rect(4, 10, 24, 2, P.gold[1]); p.rect(4, 27, 24, 2, P.gold[1]); p.rect(4, 10, 12, 1, P.gold[3]); p.rect(4, 27, 12, 1, P.gold[3]);
  p.ell(16, 19, 6.5, 6.5, P.gold[2]); p.ell(16, 19, 5.3, 5.3, V[1]); p.ell(16, 19, 3.5, 3.5, V[3]); p.rect(15, 15, 2, 8, V[4]); p.rect(12, 18, 8, 2, V[4]); p.rect(15, 18, 2, 2, WHITE); p.px([11, 14, 20, 14, 11, 23, 20, 23], P.gold[4]);
  p.poly([[12, 3], [16, 0], [20, 3], [16, 5]], P.gold[3]); p.rect(15, 2, 2, 2, V[4]); p.px([2, 2, 29, 2], S[4]); });
add('lever_off', 16, 16, (p) => { p.rrect(3, 11, 10, 4, P.stone[2]); p.rect(4, 11, 8, 1, P.stone[4]); p.rect(6, 12, 4, 1, INK); p.line(8, 12, 4, 5, P.steel[3], 2); p.rect(3, 3, 3, 3, P.red[2]); p.set(3, 3, P.red[4]); });
add('lever_on', 16, 16, (p) => { p.rrect(3, 11, 10, 4, P.stone[2]); p.rect(4, 11, 8, 1, P.stone[4]); p.rect(6, 12, 4, 1, INK); p.line(8, 12, 11, 5, P.steel[3], 2); p.rect(10, 3, 3, 3, P.green[3]); p.set(10, 3, P.green[4]); });
add('plate_up', 16, 16, (p) => { p.rrect(1, 3, 14, 11, P.stone[1]); p.rrect(2, 3, 12, 9, P.stone[3]); p.rect(3, 3, 10, 1, P.stone[4]); p.rect(2, 11, 12, 1, P.stone[2]); p.rect(5, 5, 6, 5, P.stone[2]); p.rect(6, 6, 4, 3, P.gold[2]); p.rect(7, 7, 2, 1, P.gold[4]); });
add('plate_down', 16, 16, (p) => { p.rrect(1, 3, 14, 11, P.stone[1]); p.rrect(2, 5, 12, 8, P.stone[2]); p.rect(3, 5, 10, 1, P.stone[0]); p.rect(5, 7, 6, 4, P.stone[1]); p.rect(6, 8, 4, 2, P.teal[3]); p.rect(7, 8, 2, 1, WHITE); });
function brazier(p: Px, k: number): void {
  if (k >= 0) glow(p, 8, 8, 8, P.fire[2], 75);
  p.layer((l) => { l.rect(7, 15, 2, 6, P.steel[1]); l.rect(4, 21, 8, 2, P.steel[1]); l.rect(5, 20, 6, 1, P.steel[2]); l.line(4, 15, 3, 22, P.steel[1]); l.line(11, 15, 12, 22, P.steel[0]); l.poly([[2, 10], [14, 10], [12, 16], [4, 16]], P.steel[2]); l.rect(2, 10, 12, 2, P.steel[3]); l.rect(2, 10, 5, 1, P.steel[4]); l.rect(10, 12, 3, 4, P.steel[1]); l.rect(4, 9, 8, 1, k >= 0 ? P.fire[1] : P.ash[2]); if (k < 0) { l.px([5, 9, 8, 8, 10, 9], P.ash[4]); } });
  if (k >= 0) flame(p, 8, 10, 8, 4, k);
}
add('brazier_unlit', 16, 24, (p) => brazier(p, -1), false);
for (let k = 0; k < 3; k++) add(`brazier_${k}`, 16, 24, (p) => brazier(p, k), false);
for (let k = 0; k < 3; k++) add(`torch_${k}`, 16, 24, (p) => { glow(p, 8, 7, 7, P.fire[2], 75); p.layer((l) => { l.rect(7, 11, 2, 12, P.wood[2]); l.rect(7, 11, 1, 12, P.wood[3]); l.rect(5, 22, 6, 1, P.wood[1]); l.rect(6, 9, 4, 3, P.steel[2]); l.rect(6, 9, 4, 1, P.steel[4]); }); flame(p, 8, 9, 7, 3, k); }, false);
for (let k = 0; k < 3; k++) add(`campfire_${k}`, 16, 20, (p) => { glow(p, 8, 11, 8, P.fire[2], 70); p.layer((l) => { for (const [x, y] of [[2, 16], [5, 18], [9, 18], [12, 16], [3, 13], [11, 13]] as const) { l.rrect(x, y, 3, 2, P.stone[2]); l.set(x, y, P.stone[4]); } l.line(3, 17, 12, 13, P.wood[2], 2); l.line(12, 17, 4, 13, P.wood[1], 2); l.set(4, 17, P.wood[4]); l.rect(6, 15, 4, 2, P.fire[1]); }); flame(p, 8, 15, 11, 4, k); }, false);
add('boulder_wall', 16, 24, (p) => { const S = P.stone; rock(p, 8, 16, 7.5, 7, S, 20); rock(p, 5, 8, 4.5, 5, S, 21); rock(p, 11, 7, 4.5, 5.5, S, 22); rock(p, 8, 3, 3.5, 3, S, 23); p.line(4, 12, 8, 15, INK); p.line(8, 15, 7, 20, INK); p.line(8, 15, 12, 17, INK); p.line(11, 4, 10, 9, INK); p.line(5, 6, 7, 9, S[0]); p.px([8, 15, 3, 20], S[4]); });
add('push_block', 16, 20, (p) => { const S = P.stone; p.rect(1, 1, 14, 18, S[2]); p.rect(1, 1, 14, 8, S[3]); p.rect(2, 2, 12, 6, S[4]); p.rect(3, 3, 10, 4, S[3]); p.rect(1, 9, 14, 1, S[1]); p.rect(1, 10, 2, 9, S[3]); p.rect(13, 10, 2, 9, S[1]); p.rect(1, 18, 14, 1, S[0]); p.rect(5, 12, 6, 4, S[1]); p.rect(6, 13, 4, 2, S[0]); p.px([6, 4, 9, 4, 6, 5, 9, 5], S[1]); p.rect(7, 4, 2, 2, P.teal[3]); });
function quellstein(p: Px, k: number): void {
  const on = k >= 0, T = P.teal, S: Ramp = [P.shadow[1], P.steel[0], P.steel[1], P.steel[2], P.steel[3]];
  const pulse = on ? [0, 1, 2, 1][k] : 0;
  if (on) glow(p, 12, 18, 11 + pulse, T[3], 60 + pulse * 20);
  p.layer((l) => {
    l.ell(12, 36, 10, 3, S[1]); l.ell(12, 35, 9, 2.5, S[3]); l.rect(5, 34, 6, 1, S[4]);
    l.poly([[6, 35], [5, 10], [9, 2], [15, 2], [19, 10], [18, 35]], S[2]); l.poly([[6, 35], [5, 10], [9, 2], [12, 2], [10, 35]], S[3]); l.poly([[15, 2], [19, 10], [18, 35], [15, 35]], S[1]); l.line(5, 11, 9, 3, S[4]); l.line(6, 12, 6, 30, S[4]);
    l.px([7, 30, 8, 31, 16, 28, 9, 33], P.green[2]);
    const c = on ? T[3 + (pulse > 0 ? 1 : 0)] : S[0];
    // Spiralrune
    const sp = [[12, 16], [13, 16], [14, 17], [14, 18], [14, 19], [13, 20], [12, 20], [11, 20], [10, 19], [9, 18], [9, 17], [9, 16], [9, 15], [10, 14], [11, 13], [12, 13], [13, 13], [14, 13], [15, 14], [16, 15], [16, 16], [16, 17], [16, 18], [16, 19], [16, 20], [15, 21], [14, 22]];
    for (const [x, y] of sp) l.set(x, y, c); if (on) { l.set(12, 16, WHITE); if (pulse === 2) for (const [x, y] of sp) if ((x + y) % 3 === 0) l.set(x, y, WHITE); }
    for (const y of [7, 27]) { l.rect(10, y, 4, 1, c); l.set(11, y + 1, c); l.set(12, y - 1, c); }
  });
  if (on) { const s = [[4, 8, 20, 24], [3, 14, 21, 6], [5, 22, 19, 12], [2, 28, 20, 18]][k]; sparkle(p, s[0], s[1], T[4]); p.set(s[2], s[3], T[4]); }
}
add('quellstein_off', 24, 40, (p) => quellstein(p, -1), false);
for (let k = 0; k < 4; k++) add(`quellstein_${k}`, 24, 40, (p) => quellstein(p, k), false);
for (let k = 0; k < 4; k++) add(`portal_${k}`, 32, 40, (p) => {
  const cx = 16, cy = 19, G = (v: number, a = 255) => alpha(mix(INK, WHITE, v), a);
  for (let y = 0; y < 40; y++) for (let x = 0; x < 32; x++) {
    const dx = (x + 0.5 - cx) / 13, dy = (y + 0.5 - cy) / 18, d = Math.hypot(dx, dy);
    if (d > 1.12) continue;
    if (d > 1) { p.set(x, y, G(0.9, 90)); continue; }
    const a = Math.atan2(dy, dx), sw = Math.sin(a * 3 + d * 9 - k * (Math.PI / 2)), v = 0.55 + sw * 0.3 + (d > 0.82 ? 0.3 : 0) - (d < 0.25 ? 0.15 : 0);
    p.set(x, y, G(Math.max(0.2, Math.min(1, Math.round(v * 5) / 5)), d > 0.9 ? 255 : 235));
  }
  p.ell(cx, cy, 2.5, 3.5, WHITE);
  for (let i = 0; i < 5; i++) { const a = i * 1.26 + k * 0.6; p.set(cx + Math.cos(a) * 15, cy + Math.sin(a) * 20, WHITE); }
  p.ell(cx, 38, 10, 1.5, G(0.8, 80));
}, false);
add('cave_entrance', 32, 32, (p) => { const S = CAVE; p.layer((l) => { l.poly([[0, 31], [1, 14], [6, 5], [14, 1], [22, 2], [28, 8], [31, 16], [32, 31]], S[2]); l.poly([[0, 31], [1, 14], [6, 5], [14, 1], [16, 4], [8, 9], [5, 31]], S[3]); l.poly([[22, 2], [28, 8], [31, 16], [32, 31], [27, 31]], S[1]); l.line(2, 14, 7, 6, S[4]); l.line(7, 6, 14, 2, S[4]);
  l.poly([[7, 31], [8, 17], [12, 10], [17, 8], [22, 11], [25, 18], [25, 31]], INK); l.poly([[9, 31], [10, 19], [13, 13], [17, 11], [19, 31]], P.shadow[1]); l.rect(9, 29, 16, 2, P.shadow[2]);
  l.poly([[10, 12], [11, 16], [12.5, 12]], S[2]); l.poly([[19, 9], [20, 14], [21.5, 10]], S[1]); l.line(3, 20, 5, 25, S[1]); l.line(28, 14, 27, 20, S[0]); l.px([2, 28, 3, 27, 29, 26, 5, 9], P.green[2]); }); }, false);
function stairs(p: Px, down: boolean): void { const S = P.stone; p.rect(0, 0, 32, 32, S[1]); p.rect(2, 2, 28, 28, down ? INK : S[2]); p.rect(0, 0, 32, 2, S[4]); p.rect(0, 0, 2, 32, S[3]); p.rect(30, 2, 2, 30, S[0]); p.rect(2, 30, 30, 2, S[0]);
  for (let i = 0; i < 6; i++) { const y = 3 + i * 4.5, c = down ? Math.max(0, 3 - Math.floor(i * 0.7)) : Math.min(4, 1 + Math.floor(i * 0.6)); const ins = down ? i : 0; p.rect(3 + ins, Math.round(y), 26 - ins * 2, 3, S[c]); p.rect(3 + ins, Math.round(y), 26 - ins * 2, 1, S[Math.min(4, c + 1)]); p.rect(3 + ins, Math.round(y) + 3, 26 - ins * 2, 1, down ? INK : S[0]); }
  if (down) { p.rect(8, 26, 16, 4, P.shadow[0]); } else { p.rect(3, 2, 26, 1, WHITE); } }
add('stairs_down', 32, 32, (p) => stairs(p, true), false);
add('stairs_up', 32, 32, (p) => stairs(p, false), false);
for (let k = 0; k < 3; k++) add(`spikes_${k}`, 16, 16, (p) => { const S = P.stone; p.rect(1, 1, 14, 14, S[1]); p.rect(1, 1, 14, 1, S[0]); p.rect(1, 1, 1, 14, S[0]); p.rect(2, 14, 13, 1, S[3]); p.rect(14, 2, 1, 13, S[3]);
  for (const [x, y] of [[4, 4], [11, 4], [4, 11], [11, 11], [7.5, 7.5]] as const) { p.rect(x - 1, y, 3, 2, INK); if (k > 0) { const h = k === 1 ? 3 : 7; p.poly([[x - 1.5, y + 2], [x + 0.5, y + 2 - h], [x + 2, y + 2]], P.steel[3]); p.line(x, y + 1, x, y + 3 - h, P.steel[4]); p.set(x + 1, y + 1, P.steel[1]); } else p.set(x, y, P.steel[2]); } }, false);
add('turret', 16, 24, (p) => { const S = P.stone; p.rect(2, 16, 12, 7, S[2]); p.rect(2, 16, 12, 1, S[4]); p.rect(10, 17, 4, 6, S[1]); p.rect(1, 22, 14, 1, S[0]); p.rrect(1, 1, 14, 16, S[3]); p.rect(2, 1, 12, 1, S[4]); p.rect(1, 2, 2, 13, S[4]); p.rect(11, 3, 4, 13, S[2]); p.rect(2, 15, 12, 1, S[1]);
  p.rect(3, 5, 4, 3, INK); p.rect(9, 5, 4, 3, INK); p.rect(4, 6, 2, 1, P.fire[3]); p.rect(10, 6, 2, 1, P.fire[3]); p.rect(3, 4, 4, 1, S[1]); p.rect(9, 4, 4, 1, S[1]); p.rect(7, 8, 2, 2, S[2]); p.ell(8, 12.5, 3, 2.5, INK); p.rect(7, 12, 2, 2, P.fire[1]); p.px([5, 10, 10, 10], S[1]); p.line(12, 2, 13, 5, S[1]); });

// ================================================================ Ressourcenknoten
add('node_herb', 16, 16, (p) => { for (const [x, y, dx] of [[8, 14, -5], [8, 14, 5], [8, 14, -2], [8, 14, 3]] as const) { p.line(x, y, x + dx, y - 7, P.green[2]); p.rect(x + dx - 1, y - 9, 3, 3, P.green[3]); p.set(x + dx - 1, y - 9, P.green[4]); } p.line(8, 14, 8, 5, P.green[3]); p.rect(6, 2, 5, 4, P.pink[3]); p.rect(7, 1, 3, 6, P.pink[3]); p.rect(7, 3, 2, 2, P.gold[4]); p.set(6, 2, P.pink[4]); p.rect(5, 14, 7, 1, P.forest[2]); });
add('node_wood', 16, 16, (p) => { p.rrect(1, 8, 13, 6, P.wood[2]); p.rect(2, 8, 11, 2, P.wood[3]); p.rect(2, 12, 12, 2, P.wood[1]); p.ell(13, 11, 2, 3, P.tan[3]); p.set(13, 11, P.tan[1]); p.rrect(3, 3, 11, 5, P.wood[3]); p.rect(4, 3, 9, 1, P.wood[4]); p.rect(4, 7, 10, 1, P.wood[1]); p.ell(3.5, 5.5, 2, 2.5, P.tan[4]); p.set(3, 5, P.tan[2]); p.line(9, 3, 11, 0, P.wood[2]); p.rect(11, 0, 2, 2, P.green[3]); });
add('node_crystal', 16, 20, (p) => { glow(p, 8, 10, 8, P.teal[3], 60); p.layer((l) => { crystal(l, 4, 17, 2, 9, 2, P.teal); crystal(l, 12, 17, 14, 8, 2, P.ice); crystal(l, 8, 18, 8, 2, 3, P.teal); rock(l, 8, 17, 7, 2.5, CAVE, 31); }); sparkle(p, 7, 5, P.teal[4]); }, false);
add('node_ember', 16, 16, (p) => { glow(p, 8, 9, 8, P.fire[2], 60); p.layer((l) => { rock(l, 8, 10, 7, 5.5, BAS, 32); for (const [x, y] of [[5, 8], [9, 6], [11, 10], [7, 12]] as const) { l.rect(x, y, 2, 2, P.fire[2]); l.set(x, y, P.fire[4]); } }); p.set(12, 3, P.fire[3]); p.set(4, 2, P.fire[2]); }, false);
add('node_frost', 16, 16, (p) => { glow(p, 8, 8, 8, P.ice[3], 60); p.layer((l) => { l.line(8, 15, 8, 8, P.teal[2]); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 - Math.PI / 2; l.poly([[8 + Math.cos(a - 0.6) * 2.5, 7 + Math.sin(a - 0.6) * 2.5], [8 + Math.cos(a) * 7, 7 + Math.sin(a) * 6.5], [8 + Math.cos(a + 0.6) * 2.5, 7 + Math.sin(a + 0.6) * 2.5]], i % 2 ? P.blue[3] : P.ice[2]); l.set(8 + Math.cos(a) * 4, 7 + Math.sin(a) * 4, P.ice[4]); } l.rect(7, 6, 2, 2, WHITE); l.rect(5, 14, 6, 1, P.snow[3]); }); }, false);
add('node_rune', 16, 16, (p) => { glow(p, 8, 8, 8, P.gold[3], 50); p.layer((l) => { l.poly([[2, 14], [3, 5], [8, 2], [13, 6], [14, 14]], RUIN[2]); l.poly([[2, 14], [3, 5], [8, 2], [7, 14]], RUIN[3]); l.line(3, 5, 8, 2, RUIN[4]); l.rect(2, 14, 12, 1, RUIN[1]); const G = P.gold[4]; l.rect(7, 5, 1, 7, G); l.line(7, 5, 10, 8, G); l.line(7, 9, 5, 11, G); l.set(10, 11, G); l.set(7, 5, WHITE); }); }, false);
add('node_void', 16, 16, (p) => { glow(p, 8, 8, 8, P.pink[2], 60); p.layer((l) => { l.line(8, 15, 7, 9, P.shadow[3]); l.line(7, 12, 4, 10, P.shadow[3]); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - 1.57; l.ball(8 + Math.cos(a) * 3.5, 6 + Math.sin(a) * 3.2, 2.4, 2.4, P.violet, 1, 3); } l.ball(8, 6, 2, 2, P.shadow, 0, 1); l.set(8, 6, P.pink[4]); l.rect(5, 15, 6, 1, P.shadow[2]); }); }, false);
add('node_empty', 16, 16, (p) => { p.ell(8, 12, 6, 2.5, P.stone[1]); p.ell(8, 11.5, 4.5, 1.6, P.stone[0]); p.px([4, 10, 12, 10, 6, 14, 10, 14], P.stone[3]); p.line(6, 11, 5, 8, P.tan[1]); p.line(10, 11, 11, 9, P.tan[1]); }, false);
for (let k = 0; k < 4; k++) add(`shard_${k}`, 16, 24, (p) => {
  const by = [0, -1, -2, -1][k], T = P.teal, G = P.gold;
  glow(p, 8, 10 + by, 8, T[3], 70);
  const q = new Px(16, 24), w = [4, 3, 1.6, 3][k];
  q.poly([[8, 2 + by], [8 + w, 9 + by], [8, 18 + by], [8 - w, 9 + by]], T[3]); q.poly([[8, 2 + by], [8, 18 + by], [8 - w, 9 + by]], T[4]);
  if (w > 2) { q.line(8, 4 + by, 8 - w + 1, 9 + by, WHITE); q.poly([[8, 10 + by], [8 + w - 1, 9 + by], [8, 16 + by]], T[2]); }
  q.rect(8 - Math.ceil(w), 9 + by, Math.ceil(w) * 2, 1, G[3]); q.set(8, 9 + by, G[4]); q.set(8, 2 + by, G[4]); q.set(8, 17 + by, G[3]);
  q.outline(); p.draw(q);
  const s = [[3, 5], [13, 4], [12, 15], [3, 14]][k]; sparkle(p, s[0], s[1] + by, G[4]);
  p.rect(5, 22, 6, 1, alpha(INK, 70)); p.rect(6, 23, 4, 1, alpha(INK, 50));
}, false);

// ================================================================ Beute & Sonstiges
add('drop_bag', 16, 16, (p) => { p.ball(8, 10, 5, 4.5, P.tan, 1, 4); p.rect(6, 4, 4, 2, P.tan[3]); p.rect(5, 3, 6, 1, P.tan[2]); p.rect(6, 6, 4, 1, P.red[2]); p.set(10, 7, P.red[3]); p.rect(7, 9, 2, 3, P.gold[3]); p.set(7, 9, P.gold[4]); });
add('drop_gold', 16, 16, (p) => { for (const [x, y] of [[4, 11], [9, 12], [6, 8]] as const) { p.ell(x + 1.5, y + 1, 3, 2, P.gold[1]); p.ell(x + 1.5, y, 3, 2, P.gold[3]); p.rect(x, y - 1, 2, 1, P.gold[4]); p.set(x + 2, y, P.gold[2]); } p.set(12, 6, WHITE); });
add('drop_potion', 16, 16, (p) => { p.ball(8, 10, 4, 4, P.red, 1, 4); p.rect(7, 3, 2, 4, P.ice[3]); p.rect(6, 5, 4, 1, P.ice[4]); p.rect(7, 2, 2, 1, P.tan[2]); p.rect(6, 8, 2, 1, WHITE); p.rect(5, 9, 1, 2, P.red[4]); });
add('drop_gear', 16, 16, (p) => { p.line(4, 12, 11, 5, P.steel[4], 2); p.line(5, 13, 12, 6, P.steel[2]); p.rect(11, 3, 2, 2, WHITE); p.line(2, 10, 6, 14, P.gold[3], 1); p.rect(2, 13, 2, 2, P.wood[2]); p.set(3, 12, P.wood[3]); });
add('drop_key', 16, 16, (p) => { p.ell(5, 6, 3, 3, P.gold[3]); p.ell(5, 6, 1.2, 1.2, 0); p.line(7, 8, 12, 13, P.gold[3], 2); p.rect(11, 10, 2, 1, P.gold[2]); p.rect(13, 12, 1, 2, P.gold[2]); p.set(3, 4, P.gold[4]); p.set(4, 4, P.gold[4]); });
add('grave', 16, 20, (p) => { p.ell(8, 16, 7, 3, P.tan[1]); p.ell(8, 15.5, 5.5, 2, P.tan[2]); p.rect(7, 2, 2, 13, P.steel[3]); p.rect(7, 2, 1, 13, P.steel[4]); p.rect(4, 5, 8, 2, P.gold[2]); p.rect(4, 5, 8, 1, P.gold[4]); p.rect(7, 0, 2, 2, P.gold[3]); p.rect(9, 8, 3, 2, P.red[2]); p.rect(11, 10, 1, 3, P.red[1]); p.px([3, 14, 12, 15], P.green[3]); });
add('seal_pedestal', 24, 32, (p) => { const S = P.stone; glow(p, 12, 6, 7, P.gold[3], 50); p.layer((l) => { l.rect(2, 25, 20, 5, S[2]); l.rect(2, 25, 20, 1, S[4]); l.rect(16, 26, 6, 4, S[1]); l.rect(1, 29, 22, 2, S[1]); l.rect(1, 30, 22, 1, S[0]);
  l.rect(6, 12, 12, 13, S[3]); l.rect(6, 12, 3, 13, S[4]); l.rect(15, 12, 3, 13, S[2]); for (const x of [10, 13]) l.rect(x, 13, 1, 12, S[2]);
  l.rect(3, 8, 18, 4, S[3]); l.rect(3, 8, 18, 1, S[4]); l.rect(3, 11, 18, 1, S[1]); l.rect(16, 9, 5, 2, S[2]); l.ell(12, 8, 6, 2, S[1]); l.ell(12, 7.6, 4.5, 1.3, P.gold[2]); l.rect(10, 7, 3, 1, P.gold[4]);
  l.rect(11, 16, 2, 5, P.teal[3]); l.rect(9, 18, 6, 1, P.teal[3]); l.set(11, 18, WHITE); l.px([3, 24, 4, 23, 19, 24], P.green[2]); }); }, false);

export function buildObjects(): Sheet {
  const have = new Set(items.map((i) => i[0]));
  for (const n of OBJ_FRAMES) if (!have.has(n)) { const p = new Px(16, 16); p.rect(2, 2, 12, 12, P.pink[3]); items.push([n, p]); console.warn('[gfx] fehlender obj-Frame', n); }
  return atlasSheet(items, 512);
}
