/** Kristallhöhlen – Natur (v2): Tropfsteine, Kristalle, Leuchtpilze, Felsen, Pfützen, Flechten, Knochen. */
import { Px } from '../draw';
import { Frames, P, Ramp, WHITE, alpha, anim, boulder, clamp, glow, inkOutline, mix, moss, one, part, rnd2, shadeArea, vnoise } from './kit';
import { CAVEROCK, CYAN, MAGENTA, SINTER, TEALC, VIOLETC, PrismOpts, jag, prism, stalag, twinkle } from './kr_kit';
import { resample } from '../draw';

const TL = P.teal, BL = P.blue, B = P.bone;
/** Leuchtflechte (5) */
const LICHEN: Ramp = [mix(TL[0], P.steel[0], 0.3), TL[1], TL[2], TL[3], mix(TL[4], WHITE, 0.25)];
const AMBIENT = mix(TL[1], BL[1], 0.4);

/** Kleine Geröllbrocken am Fuß (verankern das Objekt im Boden). */
function rubble(p: Px, pts: ReadonlyArray<readonly [number, number, number]>, R: Ramp = CAVEROCK): void {
  for (const [x, y, s] of pts) {
    if (s >= 2) { p.rect(x, y - 1, 3, 2, R[2]); p.set(x, y - 1, R[4]); p.set(x + 1, y - 1, R[3]); p.set(x + 2, y, R[1]); }
    else { p.rect(x, y, 2, 1, R[2]); p.set(x, y, R[3]); }
  }
}
/** Kühles Streulicht vom Boden: unterste Zeilen leicht ins Petrol ziehen. */
function footTint(p: Px, rows = 5, t = 0.22): void { shadeArea(p, (x, y) => y >= p.h - rows, AMBIENT, t); shadeArea(p, (x, y) => y >= p.h - 2, AMBIENT, t * 0.6); }

// ---------------------------------------------------------------- Tropfsteine
function stalagmite(p: Px): void {
  part(p, (l) => stalag(l, 12.5, 26, 11, 5, SINTER, { seed: 4, rings: 2 }));
  part(p, (l) => stalag(l, 6.5, 27, 25, 9.5, SINTER, { seed: 2, rings: 5, lean: 0.03 }));
  part(p, (l) => stalag(l, 2.5, 27, 6, 3.4, SINTER, { seed: 7, rings: 1 }));
  rubble(p, [[10, 26, 2], [14, 26, 1]]);
  footTint(p);
}
function stalagmiteL(p: Px): void {
  part(p, (l) => stalag(l, 18, 41, 23, 8, SINTER, { seed: 11, rings: 4, lean: 0.04 }));
  part(p, (l) => stalag(l, 10.5, 43, 41, 14, SINTER, { seed: 12, rings: 7, lean: -0.015 }));
  part(p, (l) => stalag(l, 4, 43, 14, 5.6, SINTER, { seed: 14, rings: 3 }));
  part(p, (l) => stalag(l, 16.5, 43, 8, 4.4, SINTER, { seed: 15, rings: 2 }));
  rubble(p, [[20, 42, 2], [0, 42, 1], [13, 42, 1]]);
  // Kalkäderchen und ein eingewachsener Kristallsplitter
  p.px([8, 30, 9, 31, 9, 32], SINTER[5]); p.px([12, 21, 12, 22], CYAN[4]); p.set(12, 20, CYAN[5]); p.set(13, 22, CYAN[2]);
  footTint(p, 7);
}
function stalagmiteCluster(p: Px): void {
  part(p, (l) => stalag(l, 9, 32, 25, 9, SINTER, { seed: 21, rings: 4, lean: -0.03 }));
  part(p, (l) => stalag(l, 21.5, 33, 31, 11.5, SINTER, { seed: 22, rings: 6, lean: 0.02 }));
  part(p, (l) => stalag(l, 28, 34, 15, 6, SINTER, { seed: 24, rings: 3, lean: 0.05 }));
  part(p, (l) => stalag(l, 14.5, 35, 19, 8.6, SINTER, { seed: 23, rings: 4 }));
  part(p, (l) => stalag(l, 4, 35, 11, 5.4, SINTER, { seed: 25, rings: 2 }));
  part(p, (l) => stalag(l, 23.5, 35, 7, 4.4, SINTER, { seed: 26, rings: 2 }));
  rubble(p, [[8, 34, 2], [18, 34, 1], [28, 34, 2]]);
  p.px([20, 14, 20, 15, 21, 16], SINTER[5]);
  moss(p, (x, y) => (y > 30 ? 0.3 : 0), 5, LICHEN);
  footTint(p, 6);
}
function dripStone(p: Px): void {
  part(p, (l) => {
    stalag(l, 6, 19, 10, 9.5, SINTER, { seed: 31, rings: 3, blunt: 0.45, wet: 1.4 });
    // nasse Kuppe mit Mulde
    l.rect(4, 9, 4, 1, SINTER[4]); l.px([5, 9, 6, 9], SINTER[5]); l.set(5, 10, AMBIENT); l.set(6, 10, mix(AMBIENT, SINTER[5], 0.5));
  });
  footTint(p, 4, 0.3);
  // Aufprallkrönchen, fallender Tropfen, Tropfbahn
  p.px([3, 8, 8, 8], alpha(P.ice[3], 210)); p.px([4, 7, 7, 7], alpha(P.ice[2], 150));
  p.set(6, 3, P.ice[3]); p.set(6, 4, P.ice[2]); p.set(5, 4, P.ice[4]); p.set(6, 2, alpha(P.ice[3], 170)); p.set(6, 0, alpha(P.ice[2], 80)); p.set(6, 1, alpha(P.ice[2], 120));
  // Rinnsal am Fuß
  p.px([1, 19, 2, 19, 10, 19], alpha(TL[3], 150));
}

// ---------------------------------------------------------------- Felsen
function wetSpecks(l: Px, R: Ramp, seed: number, n = 0.5): void {
  for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) if (l.get(x, y) === R[4] && rnd2(x, y, seed) < 0.16 * n && l.get(x, y - 1) >>> 24 >= 200) l.set(x, y, mix(R[4], WHITE, 0.6));
}
/** Mineralader: helle Kalklinie mit Schattensaum, nur auf Fels. */
function calcite(l: Px, a: readonly [number, number], b: readonly [number, number], seed: number, c: number = mix(B[3], P.ice[3], 0.4)): void {
  for (const [x, y] of resample(jag(a, b, 1.2, seed, 3))) {
    if (l.get(x, y) >>> 24 < 200) continue;
    if (l.get(x, y + 1) >>> 24 >= 200) l.set(x, y + 1, mix(l.get(x, y + 1), CAVEROCK[0], 0.35));
    l.set(x, y, rnd2(Math.floor(x), Math.floor(y), seed) < 0.8 ? c : mix(c, WHITE, 0.5));
  }
}
function caveRock(p: Px, size: number): void {
  if (size === 0) {
    part(p, (l) => { boulder(l, 7, 13, 12, 11, { ramp: CAVEROCK, seed: 41, cracks: 1 }); wetSpecks(l, CAVEROCK, 3); });
    part(p, (l) => boulder(l, 12.5, 13, 6, 5, { ramp: CAVEROCK, seed: 43, cracks: 0 }));
    p.set(4, 8, TEALC[3]); p.set(5, 9, TEALC[2]);
  } else if (size === 1) {
    part(p, (l) => { boulder(l, 10, 19, 18, 17, { ramp: CAVEROCK, seed: 46, cracks: 2 }); calcite(l, [3, 12], [15, 7], 5); wetSpecks(l, CAVEROCK, 4); moss(l, (x, y) => (y > 14 ? 0.5 : y > 10 && x > 12 ? 0.25 : 0), 7, LICHEN); });
    part(p, (l) => { boulder(l, 19.5, 19, 8, 8, { ramp: CAVEROCK, seed: 48, cracks: 0 }); moss(l, (x, y) => (y > 16 ? 0.4 : 0), 8, LICHEN); });
  } else {
    part(p, (l) => {
      boulder(l, 19, 28, 28, 26, { ramp: CAVEROCK, seed: 52, cracks: 3 });
      // Mineralstreifen: Kalkbänder schräg durch den Block, Kupfergrün in den Rinnen
      calcite(l, [6, 20], [20, 8], 11); calcite(l, [14, 24], [30, 13], 12); calcite(l, [22, 9], [31, 7], 13, mix(TEALC[3], B[3], 0.4));
      for (const [x, y, n] of [[9, 12, 5], [24, 16, 6], [17, 6, 4]] as const) for (let i = 0; i < n; i++) if (l.get(x, y + i) >>> 24 >= 200) l.set(x, y + i, mix(l.get(x, y + i), TEALC[i < 2 ? 3 : 2], 0.45));
      wetSpecks(l, CAVEROCK, 6, 0.35);
      moss(l, (x, y) => (y > 22 ? 0.55 : y > 15 && x > 24 ? 0.3 : 0), 9, LICHEN);
    });
    part(p, (l) => { boulder(l, 7, 29, 13, 12, { ramp: CAVEROCK, seed: 55, cracks: 1 }); wetSpecks(l, CAVEROCK, 7); moss(l, (x, y) => (y > 24 ? 0.5 : 0), 10, LICHEN); });
    part(p, (l) => boulder(l, 30.5, 29, 10, 8, { ramp: CAVEROCK, seed: 57, cracks: 0 }));
    // Kristalleinschluss in einer Kluft
    part(p, (l) => { prism(l, 27, 22, 30, 15, 1.6, CYAN, { seed: 2 }); prism(l, 25, 22, 23.5, 17, 1.3, CYAN, { seed: 3 }); });
    // Wasserfilm: Tropfen an der Unterkante
    p.set(14, 28, alpha(P.ice[3], 200)); p.set(33, 27, alpha(P.ice[3], 160));
  }
  footTint(p, 4, 0.2);
}

// ---------------------------------------------------------------- Kristalle
type Shard = readonly [bx: number, by: number, tx: number, ty: number, hw: number, ramp: Ramp, opts?: PrismOpts];
interface Cluster {
  w: number; h: number;
  /** hinter dem Sockelgestein */
  back: Shard[];
  /** [cx, breite, höhe, seed] */
  rock: ReadonlyArray<readonly [number, number, number, number]>;
  front: Shard[];
  /** Index (back, dann front) des Kristalls, der in Frame f aufblitzt */
  glint: readonly number[];
  glow: readonly [cx: number, cy: number, r: number, c: number, a: number];
  /** Kernleuchten im Hauptkristall: [cx, cy, rx, ry] */
  core?: readonly [number, number, number, number];
}
function cluster(p: Px, C: Cluster, f: number): void {
  const all = [...C.back, ...C.front], gi = C.glint[f & 3], pulse = [0, 1, 2, 1][f & 3];
  const shard = (s: Shard, k: number): void => {
    part(p, (l) => {
      prism(l, s[0], s[1], s[2], s[3], s[4], s[5], { clipY: C.h - 1, seed: k * 7 + 3, ...(s[6] ?? {}), lift: k === gi ? 1 : 0 });
      if (k === 0 && C.core) { const [cx, cy, rx, ry] = C.core; shadeArea(l, (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 < 1, s[5][5], 0.1 + pulse * 0.07); shadeArea(l, (x, y) => ((x + 0.5 - cx) / (rx * 0.5)) ** 2 + ((y + 0.5 - cy) / (ry * 0.7)) ** 2 < 1, s[5][5], 0.08 + pulse * 0.06); }
    });
  };
  C.back.forEach((s, k) => shard(s, k));
  for (const [cx, w, h, seed] of C.rock) part(p, (l) => { boulder(l, cx, C.h - 1, w, h, { ramp: CAVEROCK, seed, flat: true, cracks: 0 }); });
  C.front.forEach((s, k) => shard(s, C.back.length + k));
  // farbiger Widerschein auf dem Sockelgestein
  const [gx, gy, gr, gc, ga] = C.glow;
  for (let y = C.h - 9; y < C.h; y++) for (let x = 0; x < C.w; x++) { const c = p.get(x, y); if (CAVEROCK.includes(c)) p.set(x, y, mix(c, gc, c === CAVEROCK[4] || c === CAVEROCK[3] ? 0.34 + pulse * 0.05 : 0.16)); }
  inkOutline(p);
  glow(p, gx, gy, gr + (pulse === 2 ? 1 : 0), gc, ga + pulse * 9);
  // Aufblitzen: Stern an der Schulter des aktiven Kristalls
  const g = all[gi];
  if (g) {
    const len = Math.hypot(g[2] - g[0], g[3] - g[1]), sh = g[6]?.sh ?? clamp(1 - (g[4] * 1.7) / len, 0.4, 0.86);
    const ax = (g[2] - g[0]) / len, ay = (g[3] - g[1]) / len;
    twinkle(p, g[0] + ax * sh * len + ay * (g[4] - 1.2), g[1] + ay * sh * len - ax * (g[4] - 1.2), g[5][4], g[4] >= 3.4);
  }
}
const CL_BLUE: Cluster = {
  w: 20, h: 30,
  back: [[10, 27, 9.5, 1.5, 4.3, CYAN], [5.5, 27, 2.5, 10, 2.8, CYAN, { skew: -0.3 }], [14.5, 27, 17.5, 8, 3, CYAN, { skew: 0.3 }]],
  rock: [[10, 17, 6, 61], [4, 7, 4, 62]],
  front: [[8, 28, 5, 19.5, 2, CYAN], [13, 28, 15.5, 18, 2.2, CYAN], [17, 28, 18.5, 23, 1.4, CYAN]],
  glint: [0, 2, 1, 4], glow: [10, 15, 12, CYAN[3], 46],
};
const CL_PINK: Cluster = {
  w: 20, h: 30,
  back: [[11, 27, 12.5, 2.5, 4, MAGENTA, { skew: 0.25 }], [6.5, 27, 4, 6.5, 3.2, MAGENTA], [15.5, 27, 18, 12.5, 2.6, MAGENTA]],
  rock: [[10, 17, 6, 71], [16, 6, 4, 72]],
  front: [[4, 28, 1.5, 19, 1.9, MAGENTA], [10, 28, 9, 17.5, 2.3, MAGENTA], [14.5, 28, 16.5, 21, 1.7, VIOLETC]],
  glint: [1, 0, 4, 2], glow: [10, 15, 12, MAGENTA[3], 46],
};
const CL_BIG: Cluster = {
  w: 40, h: 60,
  back: [
    [20, 56, 18.5, 1.5, 7.6, CYAN, { sh: 0.78, skew: -0.15 }],
    [27, 55, 28.5, 11, 4.4, CYAN, { skew: 0.3 }], [11, 56, 5.5, 17, 5, CYAN, { skew: -0.3 }], [30.5, 56, 35.5, 24, 4.2, CYAN, { skew: 0.2 }],
  ],
  rock: [[20, 35, 10, 81], [7, 12, 7, 82], [33, 11, 6, 83]],
  front: [
    [8, 57, 3, 40, 2.7, CYAN], [15, 58, 12, 37, 3.2, CYAN], [26, 58, 29, 39, 3.1, CYAN], [34, 57, 37.5, 44, 2.3, MAGENTA],
    [20.5, 58, 21.5, 46, 2.4, MAGENTA], [4, 58, 1.5, 51, 1.5, VIOLETC], [30.5, 58, 32.5, 51, 1.6, CYAN],
  ],
  glint: [0, 2, 1, 6], glow: [20, 30, 21, CYAN[3], 52], core: [19, 36, 4.5, 20],
};
const CL_TEAL: Cluster = {
  w: 28, h: 24,
  back: [[14, 19, 14.5, 2, 3.3, TEALC], [9, 20, 3.5, 6.5, 2.7, TEALC, { skew: -0.3 }], [19, 20, 24.5, 6, 2.7, TEALC, { skew: 0.3 }], [6, 21, 0.5, 14, 2, TEALC], [22, 21, 27.5, 13.5, 2, TEALC]],
  rock: [[14, 26, 9, 91]],
  front: [[11, 22, 8.5, 12, 2.1, TEALC], [16.5, 22, 19, 11, 2.2, TEALC], [14, 23, 13.5, 15.5, 1.8, CYAN], [4.5, 23, 2, 18.5, 1.3, TEALC], [23.5, 23, 26, 19, 1.3, TEALC]],
  glint: [0, 2, 6, 1], glow: [14, 13, 14, TEALC[3], 44],
};
function crystalShards(p: Px): void {
  part(p, (l) => prism(l, 4, 11, 2, 4.5, 1.7, CYAN, { clipY: 11, seed: 3 }));
  part(p, (l) => prism(l, 9.5, 11, 12, 2.5, 1.9, MAGENTA, { clipY: 11, seed: 4 }));
  part(p, (l) => prism(l, 13, 11, 14.5, 7, 1.3, CYAN, { clipY: 11, seed: 5 }));
  // liegender Splitter und Bruchstücke
  part(p, (l) => { l.poly([[5, 9], [9, 7], [10, 8], [6, 11]], CYAN[2]); l.line(5, 9, 9, 7, CYAN[4]); l.set(9, 7, CYAN[5]); l.set(7, 10, CYAN[1]); });
  p.px([1, 10, 11, 10], MAGENTA[3]); p.px([15, 10], CYAN[3]); p.set(7, 5, CYAN[4]);
  inkOutline(p);
  glow(p, 8, 7, 7, CYAN[3], 30);
}

// ---------------------------------------------------------------- Leuchtpilze
const LUM: Ramp = [TL[1], mix(TL[2], BL[2], 0.25), TL[3], mix(TL[4], P.ice[3], 0.3), mix(TL[4], WHITE, 0.55)];
const LUMV: Ramp = [P.violet[1], mix(P.violet[2], P.pink[2], 0.3), mix(P.violet[3], P.pink[3], 0.35), mix(P.violet[4], P.pink[4], 0.4), mix(P.pink[4], WHITE, 0.5)];
const STEM: Ramp = [mix(TL[1], P.steel[1], 0.5), mix(TL[2], P.steel[2], 0.6), mix(P.ice[1], B[2], 0.5), mix(P.ice[3], B[4], 0.4)];
/** Leuchtpilz: gebogener Stiel, gewölbter Hut mit Lamellensaum und Leuchtpunkten; pulse 0..2 hebt die Huttöne. */
function gshroom(l: Px, x: number, base: number, r: number, stemH: number, L: Ramp, pulse: number, bend = 0, seed = 1): void {
  const cy = base - stemH, ry = Math.max(1.6, r * 0.82), sw2 = r > 5 ? 3 : r > 2.4 ? 2 : 1;
  for (let i = 0; i <= stemH; i++) {
    const t = i / Math.max(1, stemH), sx = Math.round(x + bend * (1 - t) * (1 - t) - sw2 / 2 + 0.5), wv = sw2 + (t < 0.15 && r > 3 ? 1 : 0);
    for (let k = 0; k < wv; k++) l.set(sx + k, base - i, k === 0 ? STEM[wv > 1 ? 3 : 2] : k === wv - 1 ? STEM[1] : STEM[2]);
    if (t > 0.72) l.set(sx, base - i, mix(STEM[3], L[4], 0.5));     // Licht vom Hut
  }
  if (r > 4.5) { const sx = Math.round(x + bend * 0.2 - sw2 / 2 + 0.5); l.rect(sx - 1, cy + Math.round(stemH * 0.3), sw2 + 2, 1, STEM[3]); l.set(sx + sw2, cy + Math.round(stemH * 0.3) + 1, STEM[1]); }  // Manschette
  const shift = pulse === 2 ? 1 : 0;
  for (let dy = Math.floor(-ry); dy <= 0; dy++) {
    const hw = r * Math.sqrt(Math.max(0, 1 - ((dy - 0.5) / ry) ** 2));
    for (let X = Math.round(x - hw); X < Math.round(x + hw); X++) {
      const nx = (X + 0.5 - x) / r, ny = (dy - 0.5) / ry, lit = -(nx * 0.5 + ny * 0.8);
      let tone = lit > 0.62 ? 4 : lit > 0.3 ? 3 : lit > -0.1 ? 2 : 1;
      if (dy === 0) tone = nx < -0.2 ? 2 : 1;
      l.set(X, cy + dy, L[clamp(tone + shift - (dy === 0 && pulse === 0 ? 1 : 0), 0, 4)]);
    }
  }
  // Lamellensaum unter dem Hut (leuchtet am stärksten)
  if (r > 2) for (let X = Math.round(x - r + 1); X < Math.round(x + r - 1); X++) l.set(X, cy + 1, (X & 1) === 0 ? L[pulse === 2 ? 4 : 3] : L[pulse ? 1 : 0]);
  // Leuchtpunkte
  const n = r > 5 ? 5 : r > 3 ? 3 : r > 2 ? 2 : 1;
  for (let k = 0; k < n; k++) {
    const a = rnd2(k, 1, seed) * 2 - 1, b = rnd2(k, 2, seed), X = Math.round(x + a * r * 0.62), Y = Math.round(cy - 1 - b * (ry - 1.5) * Math.sqrt(1 - a * a * 0.5));
    l.set(X, Y, pulse ? WHITE : L[4]); if (r > 3.2 && k % 2 === 0) l.set(X + 1, Y, pulse === 2 ? WHITE : L[4]);
  }
}
function glowshroom(p: Px, f: number): void {
  const pu = [0, 1, 2, 1][f], pu2 = [1, 2, 1, 0][f];
  part(p, (l) => gshroom(l, 11.5, 16, 3.3, 6, LUM, pu2, 1, 3));
  part(p, (l) => gshroom(l, 6, 16, 5, 10, LUM, pu, -1.5, 1));
  part(p, (l) => gshroom(l, 2.5, 16, 1.9, 3, LUMV, pu2, 0, 5));
  part(p, (l) => gshroom(l, 14, 16, 1.6, 2, LUMV, pu, 0, 7));
  p.px([8, 16, 9, 16, 4, 16], LICHEN[2]); p.set(9, 15, LICHEN[3]);
  inkOutline(p);
  glow(p, 6, 7, 7 + (pu === 2 ? 1 : 0), LUM[2], 44 + pu * 16); glow(p, 11.5, 11, 5, LUM[2], 30 + pu2 * 12);
  if (pu === 2) { p.blend(6, 0, alpha(LUM[4], 150)); p.blend(1, 4, alpha(LUM[4], 110)); }
  else if (pu === 1) p.blend(9, 1 + (f === 3 ? 1 : 0), alpha(LUM[4], 120));
}
function glowshroomBig(p: Px, f: number): void {
  const pu = [0, 1, 2, 1][f], pu2 = [2, 1, 0, 1][f];
  part(p, (l) => gshroom(l, 15.5, 28, 3, 7, LUMV, pu2, 1, 13));
  part(p, (l) => {
    gshroom(l, 9.5, 28, 8.2, 19, LUM, pu, 2.2, 11);
    // herabhängende Leuchttropfen am Hutrand
    for (const [x, n] of [[3, 2], [7, 1], [13, 2], [16, 1]] as const) for (let i = 0; i < n; i++) l.set(x, 11 + i, i === n - 1 ? LUM[pu ? 4 : 3] : LUM[2]);
  });
  part(p, (l) => gshroom(l, 3.5, 28, 2.4, 4, LUM, pu2, 0, 15));
  part(p, (l) => gshroom(l, 18, 28, 1.6, 2, LUM, pu, 0, 17));
  p.px([6, 28, 7, 28, 13, 28, 1, 28], LICHEN[2]); p.px([7, 27, 12, 28], LICHEN[3]);
  inkOutline(p);
  glow(p, 9.5, 8, 10 + (pu === 2 ? 1 : 0), LUM[2], 46 + pu * 16); glow(p, 15.5, 22, 5, LUMV[2], 30 + pu2 * 12);
  // aufsteigende Sporen
  const sp = [[4, 1], [15, 0], [17, 6], [1, 9]] as const;
  for (let k = 0; k < sp.length; k++) if ((k + f) % 2 === 0) p.blend(sp[k][0], sp[k][1] + ((f + k) % 3 === 0 ? 1 : 0), alpha(LUM[4], 170 - k * 20));
}

// ---------------------------------------------------------------- Flaches: Flechte, Pfütze, Knochen
function caveMoss(p: Px): void {
  for (let y = 0; y < 10; y++) for (let x = 0; x < 16; x++) {
    const d = ((x + 0.5 - 8) / 8) ** 2 + ((y + 0.5 - 5.2) / 4.8) ** 2, n = vnoise(x * 0.42, y * 0.5, 17) * 0.75 + rnd2(x, y, 3) * 0.25;
    if (d > 0.55 + n * 0.55) continue;
    const pad = vnoise(x * 0.8 + 3, y * 0.9, 23), hi = rnd2(x, y, 9);
    if (pad < 0.3 && d > 0.2) { if (hi < 0.5) p.set(x, y, alpha(LICHEN[1], 170)); continue; }      // Lücken: Boden scheint durch
    const tone = (pad > 0.62 ? 3 : pad > 0.45 ? 2 : 1) + (hi > 0.9 ? 1 : hi < 0.12 ? -1 : 0) - (d > 0.7 ? 1 : 0);
    p.set(x, y, LICHEN[clamp(tone, 0, 4)]);
  }
  // Leuchtpünktchen (Sporenkapseln)
  for (const [x, y] of [[5, 3], [9, 5], [7, 7], [11, 3], [3, 6], [12, 7]] as const) if (p.get(x, y) >>> 24 >= 200) { p.set(x, y, mix(LICHEN[4], WHITE, 0.5)); if (p.get(x, y + 1) >>> 24 >= 200) p.set(x, y + 1, LICHEN[3]); }
  glow(p, 8, 5, 8, TL[3], 34);
}
function puddle(p: Px): void {
  const DEEP = mix(TL[0], BL[0], 0.5), BODY = mix(TL[1], BL[1], 0.35), RIM = mix(TL[3], P.ice[2], 0.4);
  const inside = (x: number, y: number): number => ((x + 0.5 - 10) / 9.4) ** 2 + ((y + 0.5 - 6.2) / 4.9) ** 2 + (vnoise(x * 0.45, y * 0.6, 31) - 0.5) * 0.45;
  for (let y = 0; y < 12; y++) for (let x = 0; x < 20; x++) {
    const d = inside(x, y);
    if (d > 1) continue;
    const top = inside(x, y - 1) > 1, bot = inside(x, y + 1) > 1, edge = top || bot || inside(x - 1, y) > 1 || inside(x + 1, y) > 1;
    let c = d < 0.42 ? DEEP : BODY;
    if (top) c = mix(DEEP, P.shadow[0], 0.45);                    // Schatten der Uferkante
    else if (bot) c = RIM;                                        // heller Saum am unteren Ufer
    else if (edge) c = BODY;
    p.set(x, y, edge && !top && !bot ? alpha(c, 215) : c);
  }
  // Spiegelungen: Kristallschein als waagrechte Lichtstriche, ein Glanzpunkt
  const refl = (x: number, y: number, n: number, c: number): void => { for (let i = 0; i < n; i++) if (inside(x + i, y) < 0.8) p.set(x + i, y, c); };
  refl(5, 4, 4, mix(BODY, CYAN[3], 0.55)); refl(6, 5, 2, CYAN[4]); refl(11, 7, 4, mix(BODY, CYAN[3], 0.45)); refl(13, 4, 2, mix(BODY, MAGENTA[3], 0.5)); refl(8, 8, 2, mix(BODY, CYAN[3], 0.35));
  p.set(7, 5, WHITE); p.set(14, 8, mix(RIM, WHITE, 0.5));
  // Tropfenring
  for (const [x, y] of [[12, 5], [13, 5], [14, 6], [11, 6]] as const) p.set(x, y, mix(BODY, P.ice[2], 0.5));
}
function bones(p: Px): void {
  const bone = (x0: number, y0: number, x1: number, y1: number): void => {
    part(p, (l) => { l.line(x0, y0, x1, y1, B[3], 2); l.line(x0, y0, x1, y1, B[4]); l.rect(x0 - 1, y0 - 1, 2, 3, B[3]); l.set(x0 - 1, y0 - 1, B[4]); l.rect(x1 + 1, y1, 2, 3, B[3]); l.set(x1 + 1, y1, B[4]); l.set(x1 + 2, y1 + 2, B[2]); l.set(x0, y0 + 1, B[2]); });
  };
  // Rippenbögen hinten
  part(p, (l) => { for (const [x, h] of [[9, 4], [11, 5], [13, 4]] as const) { l.line(x, 8, x + 1, 8 - h, B[3]); l.set(x + 1, 8 - h, B[4]); l.set(x + 2, 8 - h + 1, B[2]); l.set(x, 8, B[2]); } l.rect(8, 8, 7, 1, B[2]); l.px([9, 8, 12, 8], B[3]); });
  bone(2, 5, 9, 2); bone(3, 8, 7, 6);
  p.px([1, 2, 14, 9], B[3]); p.set(6, 9, B[2]);
  shadeArea(p, (x, y) => y >= 8, AMBIENT, 0.25);
}

export function krNature(out: Frames): void {
  one(out, 'stalagmite', 16, 28, stalagmite, false);
  one(out, 'stalagmite_l', 24, 44, stalagmiteL, false);
  one(out, 'stalagmite_cluster', 32, 36, stalagmiteCluster, false);
  one(out, 'drip_stone', 12, 20, dripStone, false);
  one(out, 'rock_cave_s', 16, 14, (p) => caveRock(p, 0), false);
  one(out, 'rock_cave_m', 24, 20, (p) => caveRock(p, 1), false);
  one(out, 'rock_cave_l', 36, 30, (p) => caveRock(p, 2), false);
  anim(out, 'crystal_blue', 4, 20, 30, (p, f) => cluster(p, CL_BLUE, f), false);
  anim(out, 'crystal_pink', 4, 20, 30, (p, f) => cluster(p, CL_PINK, f), false);
  anim(out, 'crystal_big', 4, 40, 60, (p, f) => cluster(p, CL_BIG, f), false);
  anim(out, 'crystal_teal', 4, 28, 24, (p, f) => cluster(p, CL_TEAL, f), false);
  one(out, 'crystal_shards', 16, 12, crystalShards, false);
  anim(out, 'glowshroom', 4, 16, 18, glowshroom, false);
  anim(out, 'glowshroom_big', 4, 20, 30, glowshroomBig, false);
  one(out, 'cave_moss', 16, 10, caveMoss, false);
  one(out, 'puddle_cave', 20, 12, puddle, false);
  one(out, 'bones', 16, 10, bones, false);
}
