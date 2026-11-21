/**
 * Grünwald – vorgezeichnete Kleinmotive (Stempel) für den Bodenmaler: Grasbüschel in allen Lichtzonen, Blüten, Klee,
 * Laub, Kiesel, Farne, Wurzeln, Dornenranken, Ufersteine, Brückenpfosten …
 * Wird einmal beim ersten Malen aufgebaut (initStamps) und danach nur noch geblittet.
 */
import { INK, P, WHITE, alpha, mix, rng } from '../palette';
import { Px, bez, type Pt } from '../draw';
import { flipStamp, stampOf, stampRows, type Stamp } from './core';
import { EARTH, F, FOAM, G, GRASS_N, MEADOW_N, MOSS, PATH_N, PLANK, ROCK, WD, YG, zShade, zShadeM, zSun } from './gruenwald_pal';

export interface TuftPal { d: number; m: number; l: number; t: number; s: number }

export const ST = {
  tuftPal: [] as TuftPal[][], tallPal: [] as TuftPal[][],
  tuft: [] as Stamp[][][], tall: [] as Stamp[][][], tiny: [] as Stamp[][],
  flower: [] as Stamp[][], flowerTall: [] as Stamp[][], clover: [] as Stamp[][], seed: [] as Stamp[][],
  leaf: [] as Stamp[], pebble: [] as Stamp[], pebbleL: [] as Stamp[], grit: [] as Stamp[], puddle: [] as Stamp[], crack: [] as Stamp[],
  twig: [] as Stamp[], shroom: [] as Stamp[], litter: [] as Stamp[], fern: [] as Stamp[], mossBlob: [] as Stamp[], pebbleDark: [] as Stamp[],
  root: [] as Stamp[], bramble: [] as Stamp[], brambleS: [] as Stamp[], clump: [] as Stamp[][], plant: [] as Stamp[][], faceRoot: [] as Stamp[], vine: [] as Stamp[], faceMoss: [] as Stamp[],
  stone: [] as Stamp[], stoneWet: [] as Stamp[], ripple: [] as Stamp[], post: [] as Stamp[],
};

const zf = [zShade, (c: number): number => c, zSun];
const SH = alpha(mix(F[0], INK, 0.3), 70);

/** Grasbüschel: n Halme, die aus einem Fußpunkt auffächern – dunkler Fuß, helle Spitzen. */
function mkTuft(seed: number, pal: TuftPal, kindOf: 'short' | 'tall' | 'tiny'): Stamp {
  const r = rng(seed), tall = kindOf === 'tall', tiny = kindOf === 'tiny';
  const w = 15, h = tall ? 14 : 10, p = new Px(w, h), by = h - 2, cx = 7;
  const n = tiny ? 1 + ((r() * 2) | 0) : tall ? 3 + ((r() * 3) | 0) : 2 + ((r() * 3) | 0);
  if (pal.s) for (let k = tiny ? 0 : -1; k <= (n > 3 ? 2 : 1); k++) p.set(cx + k, by + 1, pal.s);
  for (let k = 0; k < n; k++) {
    const off = k - (n - 1) / 2;
    const bx = cx + Math.round(off * (0.9 + r() * 0.6));
    const hgt = Math.max(2, (tiny ? 2 : tall ? 5 : 3) + ((r() * (tiny ? 2 : tall ? 5 : 3)) | 0) - (Math.abs(off) > 1 ? 1 : 0));
    const lean = off < -0.4 ? -1 : off > 0.4 ? 1 : r() < 0.5 ? 0 : r() < 0.5 ? -1 : 1;
    const bendAt = 1 + ((r() * 2) | 0);
    let x = bx;
    for (let j = 0; j < hgt; j++) {
      const col = j === 0 ? pal.d : j === hgt - 1 ? pal.t : j < hgt * 0.45 ? pal.m : pal.l;
      p.set(x, by - j, col);
      if (lean && j >= bendAt && (j - bendAt) % 2 === 0) x += lean;
    }
  }
  return stampOf(p, cx, by);
}

/** Farnrosette für den Waldboden. */
function mkFern(seed: number): Stamp {
  const r = rng(seed), p = new Px(13, 11), cx = 6, cy = 6;
  const n = 5 + ((r() * 3) | 0), a0 = r() * 6.28;
  for (let k = 0; k < n; k++) {
    const a = a0 + (k / n) * 6.283 + (r() - 0.5) * 0.5, len = 3 + r() * 2.6, dx = Math.cos(a), dy = Math.sin(a) * 0.72;
    for (let s = 1; s <= len; s++) {
      const x = cx + dx * s, y = cy + dy * s, lit = dy < 0.1;
      p.set(x, y, s > len - 1 ? (lit ? mix(F[4], G[3], 0.35) : F[3]) : lit ? F[3] : mix(F[2], F[3], 0.4));
      if (s > 1 && s < len && (s & 1) === 0) { p.set(x - dy * 1.4, y + dx, F[2]); p.set(x + dy * 1.4, y - dx, mix(F[2], F[3], 0.6)); }
    }
  }
  p.set(cx, cy, F[1]);
  return stampOf(p, cx, cy);
}

/** Wurzel, die flach über den Boden kriecht. */
function mkRoot(seed: number): Stamp {
  const r = rng(seed), w = 18, h = 9, p = new Px(w, h);
  const y0 = 2 + r() * 4, pts = bez([1, y0], [6 + r() * 5, y0 + (r() - 0.5) * 8], [16, 2 + r() * 5], 18);
  let last: Pt = pts[0];
  pts.forEach((q, i) => {
    const x = Math.round(q[0]), y = Math.round(q[1]);
    p.set(x, y + 1, alpha(INK, 70));
    p.set(x, y, i > pts.length - 4 ? WD[1] : WD[2]);
    if (i > 2 && i < pts.length - 5 && (i % 5) < 3) p.set(x, y - 1, WD[3]);
    last = q;
  });
  if (r() < 0.6) { const b = pts[9]; p.line(b[0], b[1], b[0] + 3, b[1] + 3, WD[1]); }
  return stampOf(p, 9, 4);
}

/** Dornenranke: dunkle, bogenförmige Triebe mit rot gespitzten Dornen, wenig Laub, einzelne Beeren. */
function mkBramble(seed: number, small: boolean): Stamp {
  const r = rng(seed), w = small ? 16 : 26, h = small ? 11 : 16, p = new Px(w, h);
  const stem = mix(WD[0], P.violet[0], 0.4), stemM = mix(WD[1], P.pink[0], 0.3), stemL = mix(WD[3], P.red[1], 0.35);
  const nStem = small ? 1 : 2;
  for (let s = 0; s < nStem; s++) {
    // drei Wuchsformen: hoher Bogen, flach kriechender Ausläufer, schräg aufsteigender Trieb
    const form = (seed + s) % 3, flip = r() < 0.5;
    let a: Pt, b: Pt, cpt: Pt;
    if (form === 0) { a = [1 + r() * 4, h - 3 - r() * 3]; b = [w - 2 - r() * 4, h - 3 - r() * 3]; cpt = [w * (0.3 + r() * 0.4), -h * (0.5 + r() * 0.5) + s * 5]; }
    else if (form === 1) { a = [1 + r() * 3, 3 + r() * (h - 7)]; b = [w - 2 - r() * 3, 3 + r() * (h - 7)]; cpt = [w * (0.3 + r() * 0.4), (r() < 0.5 ? -2 : h + 1) + r() * 3]; }
    else { a = [2 + r() * 4, h - 3 - r() * 2]; b = [w - 3 - r() * 5, 2 + r() * 3]; cpt = [w * (0.55 + r() * 0.3), h - 2 - r() * 3]; }
    if (flip) { a = [w - 1 - a[0], a[1]]; b = [w - 1 - b[0], b[1]]; cpt = [w - 1 - cpt[0], cpt[1]]; }
    const pts = bez(a, cpt, b, small ? 16 : 28);
    let lx = -9, ly = -9;
    pts.forEach((q, i) => {
      const x = Math.round(q[0]), y = Math.round(q[1]);
      if (x === lx && y === ly) return;
      lx = x; ly = y;
      p.set(x, y + 2, alpha(INK, 70));
      p.set(x, y + 1, stem);
      p.set(x, y, i % 5 < 3 ? stemL : stemM);
    });
    // Dornen: kurze Stacheln mit roter Spitze, abwechselnd nach oben außen und unten
    for (let i = 3; i < pts.length - 2; i += 4 + ((r() * 2) | 0)) {
      const x = Math.round(pts[i][0]), y = Math.round(pts[i][1]), dx = (i < pts.length / 2) !== flip ? -1 : 1;
      if ((i + s) % 2 === 0) { p.set(x, y - 1, stemL); p.set(x + dx, y - 2, P.red[2]); p.set(x + dx, y - 3, P.red[3]); }
      else { p.set(x + dx, y + 2, stemM); p.set(x + dx * 2, y + 3, P.red[2]); }
    }
    // Blattpaare
    for (let k = 0; k < (small ? 1 : 2); k++) {
      const q = pts[5 + ((r() * (pts.length - 10)) | 0)], x = Math.round(q[0]), y = Math.round(q[1]) - 1;
      p.set(x - 1, y - 1, F[2]); p.set(x - 2, y - 2, mix(F[3], G[2], 0.5)); p.set(x - 2, y - 1, F[1]);
      p.set(x + 1, y - 1, mix(F[3], G[2], 0.5)); p.set(x + 2, y - 2, mix(F[3], G[3], 0.5)); p.set(x + 2, y - 1, F[2]);
    }
  }
  // Beeren
  for (let k = (r() * (small ? 2 : 3)) | 0; k > 0; k--) {
    const x = 3 + ((r() * (w - 7)) | 0), y = 3 + ((r() * (h - 8)) | 0);
    p.set(x, y, P.red[3]); p.set(x + 1, y, P.red[2]); p.set(x, y + 1, P.red[2]); p.set(x + 1, y + 1, P.red[0]);
    p.set(x + 1, y + 2, alpha(INK, 90));
  }
  return stampOf(p, w >> 1, h - 3);
}

/** Üppiger Grashorst: breiter dunkler Fuß, viele Halme, links hell, rechts im Eigenschatten. */
function mkClump(seed: number, pal: TuftPal, dark: TuftPal): Stamp {
  const r = rng(seed), w = 17, h = 13, p = new Px(w, h), by = h - 2, cx = 8;
  const n = 6 + ((r() * 3) | 0);
  for (let k = -2; k <= 3; k++) p.set(cx + k, by + 1, alpha(INK, 70));
  for (let k = 0; k < n; k++) {
    const off = k - (n - 1) / 2;
    const bx = cx + Math.round(off * 0.8);
    const hgt = Math.max(3, Math.round(7 - Math.abs(off) * 1.1 + r() * 2.4));
    const lean = off < -0.6 ? -1 : off > 0.6 ? 1 : 0;
    const q = off > 0.8 ? dark : pal;
    let x = bx;
    for (let j = 0; j < hgt; j++) {
      const col = j === 0 ? dark.d : j === hgt - 1 ? q.t : j < hgt * 0.4 ? q.m : q.l;
      p.set(x, by - j, col);
      if (j < 2) p.set(x + 1, by - j, dark.d);
      if (lean && j >= 1 && (j % 2 === 1 || Math.abs(off) > 2)) x += lean;
    }
  }
  return stampOf(p, cx, by);
}

/** Breitblättrige Rosette (Wegerich, Ampfer): flache Blätter rund um die Mitte. */
function mkPlant(seed: number, f: (c: number) => number): Stamp {
  const r = rng(seed), p = new Px(13, 11), cx = 6, cy = 6;
  const dk = f(mix(G[1], F[2], 0.45)), md = f(mix(G[2], F[3], 0.35)), lt = f(mix(G[3], F[4], 0.3)), hi = f(mix(G[4], F[4], 0.35));
  const n = 4 + ((r() * 3) | 0), a0 = r() * 6.28;
  p.set(cx, cy + 2, alpha(INK, 60)); p.set(cx + 1, cy + 2, alpha(INK, 60));
  for (let k = 0; k < n; k++) {
    const a = a0 + (k / n) * 6.283 + (r() - 0.5) * 0.5, len = 2.6 + r() * 2, dx = Math.cos(a), dy = Math.sin(a) * 0.75;
    for (let s = 1; s <= len; s++) {
      const x = cx + dx * s, y = cy + dy * s, lit = dx + dy < 0.2;
      p.set(x, y, s >= len - 0.9 ? (lit ? hi : md) : lit ? lt : md);
      if (s > 1 && s < len) p.set(x + (Math.abs(dx) > Math.abs(dy) ? 0 : 1), y + (Math.abs(dx) > Math.abs(dy) ? 1 : 0), lit ? md : dk);
    }
  }
  p.set(cx, cy, dk);
  return stampOf(p, cx, cy);
}

/** Wurzel, die eine Felswand herabhängt (Anker oben). */
function mkFaceRoot(seed: number): Stamp {
  const r = rng(seed), w = 11, h = 16 + ((r() * 9) | 0), p = new Px(w, h);
  let x = 5;
  const fork = 6 + ((r() * 6) | 0);
  for (let y = 0; y < h; y++) {
    if (y % 3 === 2) x += r() < 0.4 ? -1 : r() < 0.66 ? 1 : 0;
    x = Math.max(2, Math.min(w - 3, x));
    const thick = y < h * 0.55;
    p.set(x, y, WD[2]);
    if (thick) { p.set(x + 1, y, WD[1]); p.set(x - 1, y, y % 4 < 3 ? WD[3] : WD[2]); p.set(x + 2, y, alpha(INK, 80)); }
    else p.set(x + 1, y, alpha(INK, 70));
    if (y === fork) { const dir = r() < 0.5 ? -1 : 1; for (let k = 1; k < 5; k++) { p.set(x + dir * (1 + k), y + k, WD[1]); if (k < 3) p.set(x + dir * (1 + k), y + k - 1, WD[2]); } }
  }
  return stampOf(p, 5, 0);
}

/** Hängende Ranke mit Blättchen (Anker oben). */
function mkVine(seed: number): Stamp {
  const r = rng(seed), h = 5 + ((r() * 9) | 0), p = new Px(5, h + 1);
  let x = 2;
  for (let y = 0; y < h; y++) {
    if (y % 3 === 1) x += r() < 0.5 ? -1 : 1;
    x = Math.max(1, Math.min(3, x));
    p.set(x, y, y < 2 ? GRASS_N[1] : mix(F[3], G[2], 0.5));
    if (y % 2 === 0 && y > 0) p.set(x + (y % 4 === 0 ? -1 : 1), y, y % 4 === 0 ? GRASS_N[4] : GRASS_N[2]);
  }
  p.set(x, h, mix(G[3], G[4], 0.6));
  return stampOf(p, 2, 0);
}

/** Flacher Stein mit Lichtkante oben links; wet = liegt im seichten Wasser. */
function mkStone(seed: number, wet: boolean): Stamp {
  const r = rng(seed), sw = 5 + ((r() * 7) | 0), sh = 3 + ((r() * 4) | 0), p = new Px(sw + 4, sh + 5);
  const cx = 2 + sw / 2, cy = 1 + sh / 2;
  const R = wet ? [ROCK[0], ROCK[1], ROCK[2], ROCK[3], ROCK[4]] : [ROCK[1], ROCK[2], ROCK[3], ROCK[4], ROCK[5]];
  p.ell(cx + 0.5, cy + 1.2, sw / 2 + 0.3, sh / 2 + 0.2, wet ? alpha(INK, 110) : alpha(INK, 80));
  p.ball(cx, cy, sw / 2, sh / 2, R, 0, 4, 0.08);
  if (r() < 0.5) p.set(cx + 1, cy, R[1]);
  if (r() < 0.4) { p.set(cx - sw / 4, cy - sh / 2 + 0.2, MOSS[2]); p.set(cx - sw / 4 + 1, cy - sh / 2 + 0.2, MOSS[3]); }
  if (wet) { const y = Math.round(cy + sh / 2 + 1.2); for (let x = 1; x < sw + 3; x++) if (r() < 0.55) p.set(x, y, alpha(FOAM, 170)); }
  return stampOf(p, Math.round(cx), Math.round(cy + sh / 2));
}

export function initStamps(): void {
  if (ST.tuft.length) return;
  // ------------------------------------------------------------ Büschel-Paletten je Lichtzone × Tonklasse (dunkel, mittel, hell)
  for (let z = 0; z < 3; z++) {
    const f = zf[z], sh = alpha(f(mix(G[1], F[1], 0.5)), 110);
    ST.tuftPal.push([
      { d: f(mix(G[1], F[2], 0.5)), m: f(mix(G[2], F[2], 0.25)), l: f(GRASS_N[0]), t: f(GRASS_N[2]), s: sh },
      { d: f(mix(G[2], GRASS_N[0], 0.55)), m: f(GRASS_N[0]), l: f(GRASS_N[3]), t: f(GRASS_N[4]), s: 0 },
      { d: f(GRASS_N[1]), m: f(GRASS_N[3]), l: f(mix(G[3], G[4], 0.5)), t: f(mix(G[3], G[4], 0.82)), s: 0 },
    ]);
    const fm = z === 0 ? zShadeM : f;
    ST.tallPal.push([
      { d: fm(mix(G[2], F[2], 0.2)), m: fm(mix(G[2], G[3], 0.5)), l: fm(MEADOW_N[1]), t: fm(MEADOW_N[3]), s: sh },
      { d: fm(mix(G[2], G[3], 0.4)), m: fm(MEADOW_N[0]), l: fm(MEADOW_N[3]), t: fm(mix(YG, P.gold[4], 0.3)), s: sh },
      { d: fm(MEADOW_N[0]), m: fm(MEADOW_N[2]), l: fm(mix(YG, G[4], 0.4)), t: fm(mix(YG, P.gold[4], 0.55)), s: sh },
    ]);
    ST.tuft.push([0, 1, 2].map((cls) => Array.from({ length: 14 }, (_, k) => mkTuft(1000 + z * 97 + cls * 31 + k * 7, ST.tuftPal[z][cls], 'short'))));
    ST.tall.push([0, 1, 2].map((cls) => Array.from({ length: 14 }, (_, k) => mkTuft(2000 + z * 89 + cls * 37 + k * 5, ST.tallPal[z][cls], 'tall'))));
    ST.tiny.push(Array.from({ length: 8 }, (_, k) => mkTuft(3000 + z * 13 + k * 3, ST.tuftPal[z][1], 'tiny')));
    ST.clump.push(Array.from({ length: 8 }, (_, k) => mkClump(3500 + z * 41 + k * 9, ST.tuftPal[z][k % 3 === 0 ? 2 : 1], ST.tuftPal[z][0])));
    ST.plant.push(Array.from({ length: 6 }, (_, k) => mkPlant(3600 + z * 43 + k * 11, f)));
    // Klee
    const cp = { o: f(mix(G[2], F[3], 0.45)), l: f(mix(G[3], G[4], 0.4)), d: f(mix(G[1], F[2], 0.5)) };
    ST.clover.push([
      stampRows(['.oo.oo.', 'olooloo', '.od.od.', '..ooo..', '.oloo..', '..od...'], cp),
      stampRows(['.oo..', 'oloo.', '.oolo', '..od.'], cp),
      stampRows(['.oo...oo', 'olo..olo', '.od.oo.d', '...olo..', '....od..'], cp),
      stampRows(['..oo.', '.olo.', 'oo.oo', 'lo.lo', '.d..d'], cp),
    ]);
    // Rispen (Wiese)
    const sp = { g: f(mix(G[2], G[3], 0.4)), h: f(mix(P.gold[3], P.tan[3], 0.5)), H: f(mix(P.gold[4], P.tan[4], 0.5)), k: f(mix(P.gold[2], P.tan[2], 0.5)) };
    ST.seed.push([
      stampRows(['.H.', 'hHk', '.h.', '.hk', '.g.', '.g.', 'g..'], sp),
      stampRows(['.H', 'Hh', 'hk', '.g', '.g', '.g', 'g.', 'g.'], sp),
      stampRows(['H..', 'hH.', '.hk', '..g', '.g.', '.g.'], sp),
    ]);
  }
  // ------------------------------------------------------------ Blüten: 0 weiß, 1 blau, 2 gelb, 3 rosa/rot
  const stem = mix(G[1], F[2], 0.5), leafG = mix(G[2], G[3], 0.4);
  const fams: Array<Record<string, number>> = [
    { p: WHITE, c: P.gold[3], q: P.cream[3] },
    { p: P.blue[3], c: P.blue[4], q: mix(P.blue[3], P.violet[3], 0.45) },
    { p: P.gold[3], c: P.fire[2], q: P.gold[4] },
    { p: P.pink[3], c: WHITE, q: P.red[3] },
  ];
  for (const fm of fams) {
    const pal = { ...fm, g: stem, l: leafG };
    ST.flower.push([
      stampRows(['.p.', 'pcp', '.q.', '.g.'], pal, 1, 3),
      stampRows(['.q.', 'pcp', '.p.'], pal, 1, 2),
      stampRows(['pc', 'qp', '.g'], pal, 0, 2),
      stampRows(['p', 'g'], pal, 0, 1),
      stampRows(['q', 'g'], pal, 0, 1),
      stampRows(['p.', 'gq', '.g'], pal, 0, 2),
    ]);
    ST.flowerTall.push([
      stampRows(['.p.', 'pcp', '.q.', '.g.', '.gl', 'lg.'], pal, 1, 5),
      stampRows(['.pp.', 'pccp', '.qp.', '..g.', '.lg.', '..g.'], pal, 2, 5),
      stampRows(['p..', 'g.p', 'g.g', 'gqg', '.g.'], pal, 1, 4),
      stampRows(['.q.', 'pcp', '.g.', 'lg.', '.g.'], pal, 1, 4),
    ]);
  }
  // ------------------------------------------------------------ Laub, Kiesel, Wegdetails
  const leafCols: Array<[number, number]> = [[P.gold[2], P.gold[1]], [mix(P.fire[1], WD[2], 0.35), WD[1]], [P.tan[2], P.tan[1]], [mix(P.red[2], WD[2], 0.45), WD[1]], [mix(G[4], P.gold[3], 0.5), mix(G[3], P.gold[2], 0.4)], [P.gold[3], P.gold[2]]];
  for (const [a, b] of leafCols) {
    const pal = { a, b, s: SH };
    ST.leaf.push(stampRows(['.aa', 'abs'], pal), stampRows(['aa.', '.bs'], pal), stampRows(['a', 'b'], pal), stampRows(['ab', '.s'], pal));
  }
  const peb = { h: ROCK[5], l: ROCK[4], m: ROCK[3], d: ROCK[1], s: alpha(INK, 85) };
  ST.pebble.push(
    stampRows(['.hl.', 'hmmd', '.dds'], peb), stampRows(['hl', 'md', '.s'], peb), stampRows(['hlm', 'mdd', '.ss'], peb),
    stampRows(['.h.', 'lmd', '.ds'], peb), stampRows(['hm', 'ds'], peb), stampRows(['.hll', 'hmmd', 'mdds'], peb),
  );
  ST.pebbleL.push(
    stampRows(['.hhl..', 'hllmd.', 'lmmmdd', '.dddds', '..sss.'], peb),
    stampRows(['..hl..', '.hlmm.', 'hlmmmd', 'lmmmdd', '.dddss'], peb),
    stampRows(['.hhhl.', 'hlmmmd', '.ddddd', '..ssss'], peb),
  );
  const pebD = { h: ROCK[3], l: ROCK[2], m: ROCK[1], d: ROCK[0], s: alpha(INK, 90) };
  ST.pebbleDark.push(stampRows(['.hl.', 'lmmd', '.dds'], pebD), stampRows(['hl', 'md'], pebD), stampRows(['.hhl.', 'hlmmd', 'lmmdd', '.dds.'], pebD));
  const gr = { d: PATH_N[1], D: PATH_N[0], h: PATH_N[5], l: PATH_N[4] };
  ST.grit.push(stampRows(['d.', '.h'], gr), stampRows(['hd'], gr), stampRows(['l', 'd'], gr), stampRows(['.d', 'h.', '..', 'd.'], gr), stampRows(['lD'], gr), stampRows(['d..h'], gr), stampRows(['lh', 'dD'], gr));
  const pd = { o: PATH_N[0], w: mix(P.teal[2], PATH_N[2], 0.42), k: mix(P.teal[1], PATH_N[0], 0.45), h: mix(P.teal[4], WHITE, 0.3), r: PATH_N[4] };
  ST.puddle.push(
    stampRows(['..ooooo..', '.owwhhwo.', 'owwwwwkko', '.okkkkkor', '..oooorr.'], pd),
    stampRows(['.oooo..', 'owhhwo.', 'owwwkko', '.okkkor', '..oorr.'], pd),
  );
  ST.crack.push(stampRows(['D.....', '.dD...', '...d..', '....Dd'], gr), stampRows(['...D', '..d.', 'dD..'], gr), stampRows(['d.....', '.DdD..', '....d.'], gr));
  const tw = { a: WD[2], b: WD[1], l: WD[3], s: SH };
  ST.twig.push(stampRows(['l....', '.ab..', '..sab', '....s'], tw), stampRows(['...la', '.lab.', 'ab.s.', '.s...'], tw), stampRows(['lab', '.ss'], tw));
  ST.shroom.push(
    stampRows(['.rw.', 'rrrr', '.bs.'], { r: P.red[2], w: WHITE, b: P.bone[3], s: SH }),
    stampRows(['tT', 'bs'], { t: P.tan[3], T: P.tan[2], b: P.bone[3], s: SH }),
    stampRows(['.TT.', 'tTTt', '.b..', '.bs.'], { t: P.tan[2], T: P.tan[3], b: P.bone[3], s: SH }),
  );
  // ------------------------------------------------------------ Waldboden auf den Geländestufen
  const mute = (c: number): number => mix(c, F[1], 0.5);
  for (let k = 0; k < 8; k++) {
    const r = rng(4000 + k * 11), p = new Px(11, 8);
    for (let j = 0; j < 4 + (k % 3); j++) {
      const [a, b] = leafCols[(r() * 4) | 0], x = 1 + ((r() * 8) | 0), y = 1 + ((r() * 6) | 0);
      p.set(x, y, mute(a)); p.set(x + 1, y, mute(b)); if (r() < 0.5) p.set(x + 1, y - 1, mute(a));
    }
    ST.litter.push(stampOf(p, 5, 4));
  }
  for (let k = 0; k < 8; k++) ST.fern.push(mkFern(4100 + k * 13));
  for (let k = 0; k < 5; k++) {
    const r = rng(4200 + k * 7), p = new Px(10, 7), rw = 2.5 + r() * 2, rh = 1.6 + r() * 1.2;
    p.ball(5, 3.5, rw, rh, [F[1], mix(F[1], F[2], 0.6), F[2], mix(F[2], F[3], 0.6)], 0, 3);
    ST.mossBlob.push(stampOf(p, 5, 3));
  }
  for (let k = 0; k < 6; k++) { const s = mkRoot(4300 + k * 17); ST.root.push(s, flipStamp(s)); }
  for (let k = 0; k < 8; k++) { ST.bramble.push(mkBramble(4400 + k * 19, false)); ST.brambleS.push(mkBramble(4450 + k * 19, true)); }
  for (let k = 0; k < 6; k++) ST.faceRoot.push(mkFaceRoot(4500 + k * 23));
  for (let k = 0; k < 8; k++) ST.vine.push(mkVine(4600 + k * 29));
  for (let k = 0; k < 5; k++) {
    const r = rng(4700 + k * 7), p = new Px(11, 7);
    p.ball(5.5, 3.5, 3 + r() * 2, 1.8 + r() * 1.2, MOSS, 0, 4);
    ST.faceMoss.push(stampOf(p, 5, 3));
  }
  for (let k = 0; k < 8; k++) { ST.stone.push(mkStone(4800 + k * 31, false)); ST.stoneWet.push(mkStone(4900 + k * 37, true)); }
  const rp = { a: alpha(FOAM, 120), b: alpha(FOAM, 70) };
  ST.ripple.push(stampRows(['.baaab.', 'a.....a'], rp), stampRows(['.aab.', 'b...a'], rp), stampRows(['baaaab'], rp));
  // ------------------------------------------------------------ Brückenpfosten (hinten kurz, vorn lang)
  const pp = { o: PLANK[0], h: PLANK[6], l: PLANK[5], m: PLANK[4], d: PLANK[2], k: PLANK[1], s: alpha(INK, 90) };
  ST.post.push(
    stampRows(['.ooo.', 'ohhlo', 'olmdo', 'olmdo', 'olmdo', 'olmdo', 'omdko', 'omdko', '.ooos', '..sss'], pp, 2, 8),
    stampRows(['.ooo.', 'ohhlo', 'olmdo', 'olmdo', 'olmdo', 'olmdo', 'olmdo', 'omdko', 'omdko', 'omdko', 'odkko', '.ooos', '..sss'], pp, 2, 11),
  );
}
