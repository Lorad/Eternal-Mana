/**
 * Objekt-Baukasten (v2): wiederverwendbare Maler für Laub, Rinde, Fels, Mauerwerk, Bretter, Flammen, Lichtschein.
 * Biom-neutral – Farben kommen immer über Rampen herein, damit andere Biome dieselben Maler mit eigener Palette nutzen.
 *
 * Arbeitsweise fast aller Maler: erst die Silhouette in einer MARKER-Farbe zeichnen (Px-Primitive, limb, poly …),
 * dann die Markerpixel mit einer Textur füllen (barkFill, planks, masonry, texFill). Zum Schluss inkOutline().
 */
import { Px, Pt, resample } from '../draw';
import { INK, P, Ramp, WHITE, alpha, hash2, mix, rnd2, vnoise } from '../palette';

export type Frames = Array<[string, Px]>;
export const TAU = Math.PI * 2;
export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
/** Markerfarben für Silhouetten, die anschließend texturiert werden. */
export const MARK = 0xffff00ff >>> 0, MARK2 = 0xff00ffff >>> 0, MARK3 = 0xffffff00 >>> 0;

/** Wiege-Versatz für Frame f einer 4er-Schleife (Ruhe → rechts → Ruhe → links), ph = Phasenverschiebung. */
export function sw(f: number, amp: number, ph = 0): number { return Math.round(amp * Math.sin((f * Math.PI) / 2 + ph)); }

/** Neuer Frame; fn zeichnet, danach optional farbige Kontur. */
export function mk(w: number, h: number, fn: (p: Px) => void, outline = true): Px {
  const p = new Px(w, h);
  fn(p);
  if (outline) inkOutline(p);
  return p;
}
/** Hängt n Animationsframes `<name>_0..n-1` an. */
export function anim(out: Frames, name: string, n: number, w: number, h: number, fn: (p: Px, f: number) => void, outline = true): void {
  for (let f = 0; f < n; f++) out.push([`${name}_${f}`, mk(w, h, (p) => fn(p, f), outline)]);
}
export function one(out: Frames, name: string, w: number, h: number, fn: (p: Px) => void, outline = true): void {
  out.push([name, mk(w, h, fn, outline)]);
}

/**
 * Farbige 1px-Kontur (Sel-out): jede freie Zelle neben einem deckenden Pixel bekommt dessen abgedunkelte Farbe.
 * Lichtseite (oben/links) etwas heller als Schattenseite (unten/rechts). Halbtransparente Pixel (Glühen) zählen nicht.
 */
export function inkOutline(p: Px, lit = 0.58, dark = 0.74, base: number = INK): Px {
  const { w, h, d } = p, src = d.slice();
  const op = (x: number, y: number): number => (x >= 0 && y >= 0 && x < w && y < h && src[y * w + x] >>> 24 >= 200 ? src[y * w + x] : 0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (src[y * w + x] >>> 24 >= 200) continue;
    const b = op(x, y + 1), r = op(x + 1, y), l = op(x - 1, y), u = op(x, y - 1);
    if (!(b || r || l || u)) continue;
    const litSide = (b || r) && !(u || l);
    const n = b || r || l || u;
    d[y * w + x] = (0xff000000 | (mix(n, base, litSide ? lit : dark) & 0xffffff)) >>> 0;
  }
  return p;
}
/** Zeichnet fn in eine eigene Ebene, konturiert sie und legt sie auf p (für überlappende Einzelteile). */
export function part(p: Px, fn: (l: Px) => void, outline = true): Px {
  const l = new Px(p.w, p.h);
  fn(l);
  if (outline) inkOutline(l);
  return p.draw(l);
}
/** Ersetzt alle Pixel der Markerfarbe durch fn(x, y). */
export function texFill(p: Px, mark: number, fn: (x: number, y: number) => number): void {
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.d[y * p.w + x] === mark) p.d[y * p.w + x] = fn(x, y);
}
/** Dunkelt/hellt deckende Pixel innerhalb einer Maske durch Mischen. */
export function shadeArea(p: Px, test: (x: number, y: number) => boolean, c: number, t: number): void {
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) { const v = p.d[y * p.w + x]; if (v >>> 24 >= 200 && test(x, y)) p.d[y * p.w + x] = (0xff000000 | (mix(v, c, t) & 0xffffff)) >>> 0; }
}
/** Weicher Lichtschein in drei Stufen; malt nur auf nicht deckende Pixel (liegt also "hinter" dem Sprite). */
export function glow(p: Px, cx: number, cy: number, r: number, c: number, a = 90, over = false): void {
  for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
    if (d >= 1) continue;
    if (!over && p.get(x, y) >>> 24 >= 200) continue;
    p.blend(x, y, alpha(c, Math.round(a * (d < 0.4 ? 1 : d < 0.7 ? 0.6 : 0.3))));
  }
}
export function sparkle(p: Px, x: number, y: number, c: number, big = false): void {
  p.set(x, y, WHITE); p.set(x - 1, y, c); p.set(x + 1, y, c); p.set(x, y - 1, c); p.set(x, y + 1, c);
  if (big) { p.set(x - 2, y, c); p.set(x + 2, y, c); p.set(x, y - 2, c); p.set(x, y + 2, c); }
}
/** Schachbrett-Dither von Farbe c über deckende Pixel in einem Rechteck. */
export function dither(p: Px, x: number, y: number, w: number, h: number, c: number, phase = 0): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (((i + j + phase) & 1) === 0 && p.get(i, j) >>> 24 >= 200) p.set(i, j, c);
}

// ================================================================ Laub
/** Index-Puffer für Laub (−1 = leer); wird am Ende über eine Rampe eingefärbt. Erlaubt "um n Stufen abdunkeln". */
export class Tone {
  i: Int8Array;
  constructor(public w: number, public h: number) { this.i = new Int8Array(w * h).fill(-1); }
  get(x: number, y: number): number { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.i[y * this.w + x] : -1; }
  set(x: number, y: number, v: number): void { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.i[y * this.w + x] = v; }
  /** vorhandene Pixel in einer Ellipse um n Stufen abdunkeln */
  shade(cx: number, cy: number, rx: number, ry: number, n = 1, min = 0): void {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry;
      if (u * u + v * v > 1) continue;
      const t = this.get(x, y);
      if (t > min) this.set(x, y, Math.max(min, t - n));
    }
  }
  toPx(p: Px, ramp: Ramp, dx = 0, dy = 0): void {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const t = this.i[y * this.w + x]; if (t >= 0) p.set(x + dx, y + dy, ramp[Math.min(ramp.length - 1, t)]); }
  }
}
export interface LeafStyle { lw: number; lh: number; /** 0 = feine Tupfer (kleines Laub), 1 = normale Blatt-Tupfer */ dab: number }
export const LEAF_ROUND: LeafStyle = { lw: 3, lh: 2, dab: 1 };
export const LEAF_FINE: LeafStyle = { lw: 2, lh: 2, dab: 0 };
export const LEAF_NEEDLE: LeafStyle = { lw: 2, lh: 3, dab: 0 };
/** Blatt-Tupfer (Pixelmuster, dx/dy-Paare) */
const DABS: ReadonlyArray<ReadonlyArray<number>> = [
  [0, 0, 1, 0, 1, 1, 2, 1], [1, 0, 2, 0, 0, 1, 1, 1], [0, 0, 1, 0, 2, 0, 0, 1, 1, 1], [0, 0, 1, 0, 2, 0, 1, 1], [1, 0, 0, 1, 1, 1, 2, 1], [0, 0, 1, 0, 2, 0, 3, 0, 1, 1, 2, 1],
];
const DABS_FINE: ReadonlyArray<ReadonlyArray<number>> = [[0, 0, 1, 0], [0, 0, 1, 0, 1, 1], [0, 0, 0, 1, 1, 0], [0, 0, 1, 1], [0, 0, 1, 0, 2, 0]];

/**
 * Ein Laubbüschel, Licht von oben links: gezackte Grundform (Blattzellen lw×lh) im Schattenton mit dunklem unteren
 * Saum, darauf Blatt-Tupfer in Mittel-, Licht- und Glanzton (hellste zuletzt, damit sie als ganze Blättchen stehen).
 * Alles hängt am Büschelmittelpunkt → beim Wiegen verschiebt sich das Büschel starr (kein Flimmern).
 * flat ≥ 0: einfarbige Füllung (dunkle Rückschicht) mit vereinzelten helleren Blättern.
 */
export function tuft(t: Tone, cx: number, cy: number, rx: number, ry: number, level: number, seed: number, max = 6, st: LeafStyle = LEAF_ROUND, flat = -1): void {
  const ox = Math.round(cx), oy = Math.round(cy), { lw, lh } = st, half = (lw + 1) >> 1, base = Math.round(3 + level);
  for (let y = Math.floor(-ry) - lh; y <= Math.ceil(ry) + lh; y++) {
    const r = Math.floor(y / lh), sh = r & 1 ? half : 0;
    for (let x = Math.floor(-rx) - lw; x <= Math.ceil(rx) + lw; x++) {
      const c = Math.floor((x + sh) / lw);
      const u = (c * lw - sh + lw / 2) / rx, v = (r * lh + lh / 2) / ry, h = hash2(c, r, seed);
      const h1 = (h & 255) / 255, h2 = ((h >> 8) & 255) / 255;
      const lim = 0.84 + h1 * 0.3, d2 = u * u + v * v;
      if (d2 > lim * lim) continue;
      let tone: number;
      if (flat >= 0) tone = flat + (h2 > 0.88 ? 1 : 0);
      else {
        const lit = -(u * 0.38 + v * 0.92) + (h2 - 0.5) * 0.2;
        tone = base + (lit > 0.66 ? 2 : lit > 0.36 ? 1 : lit > 0.06 ? 0 : lit > -0.22 ? -1 : -2) - (v > 0.45 && d2 > 0.55 ? 1 : 0);
      }
      t.set(ox + x, oy + y, clamp(tone, 0, max));
    }
  }
  if (flat >= 0) return;
  const shapes = st.dab ? DABS : DABS_FINE, n = Math.round((rx + ry) * (st.dab ? 0.9 : 1.1));
  const dab = (u: number, v: number, tn: number, h: number): void => {
    const sp = shapes[(h >>> 20) % shapes.length], X = ox + Math.round(u * rx) - 1, Y = oy + Math.round(v * ry);
    for (let k = 0; k < sp.length; k += 2) t.set(X + sp[k], Y + sp[k + 1], clamp(tn, 0, max));
  };
  for (let i = 0; i < n; i++) {
    const h = hash2(i, 5, seed), a = (h & 255) / 255, b = ((h >> 8) & 255) / 255;
    // Mitteltupfer, die in die Schattenzone hineinragen
    const u1 = a * 1.5 - 0.75, v1 = -0.08 + b * 0.26 - u1 * 0.4;
    if (u1 * u1 + v1 * v1 < 0.75) dab(u1, v1, base - (i & 1), h);
  }
  for (let i = 0; i < n; i++) {
    const h = hash2(i, 6, seed), a = (h & 255) / 255, b = ((h >> 8) & 255) / 255;
    // Lichttupfer am unteren Rand der Kappe
    const u1 = a * 1.6 - 0.8, v1 = -0.42 + b * 0.26 - u1 * 0.4;
    if (u1 * u1 + v1 * v1 < 0.8) dab(u1, v1, base + 1, h);
  }
  for (let i = 0; i < Math.ceil(n * 0.4); i++) {
    const h = hash2(i, 7, seed), a = (h & 255) / 255, b = ((h >> 8) & 255) / 255;
    // Glanzlichter oben links
    const u1 = -0.75 + a * 1.1, v1 = -0.85 + b * 0.4 + Math.max(0, u1) * 0.5;
    if (u1 * u1 + v1 * v1 < 0.85) dab(u1, v1, base + 2 + (i === 0 ? 1 : 0), h);
  }
}

export interface Lobe { x: number; y: number; rx: number; ry: number; /** Helligkeitsversatz */ lv?: number; /** Wiege-Amplitude in px */ amp?: number; ph?: number; back?: boolean }
export interface Tuft { x: number; y: number; r: number; lv: number; lobe: number; seed: number }
export interface CrownOpts {
  /** 7 Töne dunkel → hell */
  ramp: Ramp; seed: number;
  /** Büschelradius in px */
  tuft: number;
  frame?: number; sway?: number; style?: LeafStyle;
  /** dunkle Rückschicht hinter den Büscheln (Tiefe, "Lichtlöcher") */
  back?: boolean;
  /** Dichte: 1 = Standard, kleiner = luftiger */
  density?: number;
  /** Stärke der Großform-Schattierung */
  form?: number;
}
/**
 * Baumkrone aus Lappen (große Ellipsen, hinten → vorn angegeben), die mit Laubbüscheln gefüllt werden.
 * Großform: jeder Lappen ist wie eine Kugel schattiert, die ganze Krone zusätzlich von oben links nach unten rechts.
 * Gibt die Büschel mit ihrer Frame-Position zurück (für Blüten, Früchte, Schnee, Lichter …).
 */
export function crown(p: Px, lobes: ReadonlyArray<Lobe>, o: CrownOpts): Tuft[] {
  const t = new Tone(p.w, p.h), f = o.frame ?? 0, s = o.tuft, st = o.style ?? LEAF_ROUND, out: Tuft[] = [], dens = o.density ?? 1, form = o.form ?? 1;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const l of lobes) { x0 = Math.min(x0, l.x - l.rx); x1 = Math.max(x1, l.x + l.rx); y0 = Math.min(y0, l.y - l.ry); y1 = Math.max(y1, l.y + l.ry); }
  const ccx = (x0 + x1) / 2, ccy = (y0 + y1) / 2, crx = (x1 - x0) / 2, cry = (y1 - y0) / 2;
  if (o.back !== false) lobes.forEach((l, k) => { if (l.back !== false) tuft(t, l.x, l.y, l.rx * 0.9, l.ry * 0.88, 0, o.seed + k * 31, 6, st, 0); });
  lobes.forEach((l, k) => {
    const amp = l.amp ?? o.sway ?? 1.5, ph = l.ph ?? ((k * 0.83) % 1.1) - 0.55;
    if (k > 0) t.shade(l.x + 2 + sw(f, amp, ph), l.y + 4, l.rx * 1.04, l.ry * 1.04, 2);
    const list: Tuft[] = [];
    let j = 0;
    for (let gy = l.y - l.ry + s * 0.55; gy <= l.y + l.ry - s * 0.3; gy += (s * 1.08) / dens, j++) {
      let i = 0;
      for (let gx = l.x - l.rx + s * 0.5 + (j & 1 ? s * 0.72 : 0); gx <= l.x + l.rx - s * 0.3; gx += (s * 1.45) / dens, i++) {
        const sd = hash2(i, j, o.seed + k * 977);
        const x = gx + ((sd & 255) / 255 - 0.5) * s * 0.6, y = gy + (((sd >> 8) & 255) / 255 - 0.5) * s * 0.5;
        const nx = (x - l.x) / l.rx, ny = (y - l.y) / l.ry;
        if (nx * nx + ny * ny > 0.9) continue;
        const lobeLit = -(nx * 0.45 + ny * 0.85), crownLit = -(((x - ccx) / crx) * 0.5 + ((y - ccy) / cry) * 0.7);
        const tph = (((sd >> 16) & 255) / 255 - 0.5) * 0.7;
        list.push({ x: x + sw(f, amp, ph + tph), y, r: s * (0.9 + (((sd >>> 24) & 255) / 255) * 0.35), lv: (l.lv ?? 0) - 0.5 + (lobeLit * 1.4 + crownLit * 1.2) * form, lobe: k, seed: sd });
      }
    }
    list.sort((a, b) => a.y - b.y);
    for (const q of list) { t.shade(q.x + 0.5, q.y - 0.5, q.r + 1.7, q.r * 0.84 + 1.7, 2, 1); tuft(t, q.x, q.y, q.r, q.r * 0.84, q.lv, q.seed, 6, st); out.push(q); }
  });
  t.toPx(p, o.ramp);
  return out;
}
/** Standard-Laubrampen (7 Töne): tief blaugrün → gelbgrünes Licht. */
export const LEAF = {
  oak: [P.forest[0], P.forest[1], P.green[1], P.green[2], P.green[3], P.green[4], mix(P.green[4], P.gold[4], 0.4)] as Ramp,
  light: [P.forest[1], P.green[1], mix(P.green[1], P.green[2], 0.7), mix(P.green[2], P.green[3], 0.55), mix(P.green[3], P.green[4], 0.4), mix(P.green[4], P.gold[4], 0.2), mix(P.green[4], P.gold[4], 0.55)] as Ramp,
  fir: [mix(P.forest[0], INK, 0.3), P.forest[0], P.forest[1], P.forest[2], mix(P.forest[2], P.forest[3], 0.6), P.forest[3], P.forest[4]] as Ramp,
  birch: [P.forest[1], P.green[1], P.green[2], mix(P.green[2], P.green[3], 0.7), mix(P.green[3], P.green[4], 0.45), P.green[4], mix(P.green[4], P.gold[4], 0.5)] as Ramp,
  willow: [P.forest[0], P.forest[1], mix(P.forest[2], P.green[2], 0.5), mix(P.green[2], P.sand[2], 0.25), mix(P.green[3], P.sand[3], 0.3), mix(P.green[4], P.sand[3], 0.25), mix(P.green[4], P.sand[4], 0.45)] as Ramp,
  moss: [P.forest[1], P.green[1], P.green[2], mix(P.green[2], P.green[3], 0.6), P.green[3]] as Ramp,
};

// ================================================================ Holz
/** Stempelt einen sich verjüngenden Ast/Stamm (Scheiben entlang der Punktliste) in Markerfarbe. */
export function limb(p: Px, path: ReadonlyArray<Pt>, r0: number, r1: number, c: number = MARK): void {
  const pts = resample(path), n = pts.length - 1 || 1;
  pts.forEach((q, i) => { const r = r0 + ((r1 - r0) * i) / n; if (r <= 0.6) p.set(q[0], q[1], c); else p.ell(q[0], q[1], r, r, c); });
}
/**
 * Rindentextur auf allen Markerpixeln: je Zeile wird jedes zusammenhängende Stück wie ein Zylinder schattiert
 * (Licht links), darüber senkrechte, unterbrochene Borkenrillen und helle Flecken. Rampe mit 5 Tönen.
 */
export function barkFill(p: Px, ramp: Ramp, seed = 1, mark: number = MARK, groove = 4): void {
  const { w, h, d } = p;
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      if (d[y * w + x] !== mark) { x++; continue; }
      let e = x; while (e + 1 < w && d[y * w + e + 1] === mark) e++;
      const n = e - x + 1;
      for (let i = x; i <= e; i++) {
        const t = (i - x + 0.5) / n;
        let tone = n <= 2 ? (i === x ? 3 : 1) : n <= 4 ? (t < 0.3 ? 3 : t < 0.7 ? 2 : 1) : t < 0.08 ? 2 : t < 0.36 ? 3 : t < 0.68 ? 2 : t < 0.9 ? 1 : 0;
        if (n > 4) {
          const gx = i + Math.round(Math.sin(y * 0.19 + Math.floor(i / groove) * 1.7 + seed) * 1.2), col = Math.floor(gx / groove), m = ((gx % groove) + groove) % groove;
          const seg = rnd2(col, Math.floor((y + col * 3) / 7), seed);
          if (m === 0 && seg > 0.22) tone -= 1;
          else if (m === 1 && seg > 0.55 && t < 0.6) tone += 1;
          if (rnd2(i, y, seed + 9) < 0.035) tone -= 1;
        }
        d[y * w + i] = ramp[clamp(tone, 0, ramp.length - 1)];
      }
      x = e + 1;
    }
  }
}
/** Astloch / Knoten. */
export function knot(p: Px, x: number, y: number, rx: number, ry: number, ramp: Ramp): void {
  p.ell(x, y, rx + 1, ry + 1, ramp[1]); p.ell(x - 0.5, y - 0.5, rx + 0.5, ry + 0.5, ramp[3]); p.ell(x, y, rx, ry, ramp[0]);
  p.set(x + rx * 0.3, y + ry * 0.3, INK);
}
/** Moosbewuchs: färbt deckende Pixel, an denen amount(x,y) > Rauschen ist, in Moostönen (hell oben, dunkel unten). */
export function moss(p: Px, amount: (x: number, y: number) => number, seed = 3, ramp: Ramp = LEAF.moss): void {
  const { w, h } = p, src = p.d.slice();
  const op = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < w && y < h && src[y * w + x] >>> 24 >= 200;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!op(x, y)) continue;
    const a = amount(x, y);
    if (a <= 0) continue;
    const n = vnoise(x * 0.35, y * 0.35, seed) * 0.7 + rnd2(x, y, seed) * 0.3;
    if (n > a) continue;
    const top = !op(x, y - 1) || n > a - 0.12, hi = rnd2(x, y, seed + 1);
    p.d[y * w + x] = ramp[clamp((top ? 3 : 2) + (hi > 0.8 ? 1 : hi < 0.25 ? -1 : 0) - (n < a * 0.35 ? 1 : 0), 0, ramp.length - 1)];
  }
}
export interface PlankOpts { ramp?: Ramp; /** Brettbreite */ pw?: number; vertical?: boolean; seed?: number; mark?: number; nails?: boolean; /** 0..1 Verwitterung */ worn?: number }
/**
 * Bretterfläche mit Fugen, Maserung, Ton-Varianz je Brett, Nägeln und Kerben. Füllt das Rechteck – oder, wenn `mark`
 * gesetzt ist, nur Markerpixel darin (für schiefe/gebrochene Umrisse).
 */
export function planks(p: Px, x: number, y: number, w: number, h: number, o: PlankOpts = {}): void {
  const R = o.ramp ?? P.wood, pw = o.pw ?? 5, seed = o.seed ?? 1, vert = o.vertical ?? false, worn = o.worn ?? 0.5;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const X = x + i, Y = y + j;
    if (o.mark !== undefined && p.get(X, Y) !== o.mark) continue;
    const a = vert ? i : j, b = vert ? j : i, len = vert ? h : w;
    const k = Math.floor(a / pw), m = a - k * pw, hk = hash2(k, 7, seed), base = 2 + ((hk & 7) === 0 ? 1 : (hk & 7) === 1 ? -1 : 0);
    let tone = base;
    // Stoßfuge versetzt je Brett
    const joint = ((hk >> 4) % Math.max(8, len)) | 0;
    if (m === pw - 1) tone = 0;
    else if (m === 0) tone = base + 1;
    else if (len > 14 && b === joint) tone = base - 1;
    else {
      const g = hash2(k * 13 + m, Math.floor((b + (hk >> 8)) / 6), seed + 5);
      if ((g & 255) < 60 * worn + 20) tone = base - 1;
      else if (((g >> 8) & 255) < 22) tone = base + 1;
    }
    if (o.nails && m === ((pw - 1) >> 1) && (b === 1 || b === len - 2 || (len > 14 && b === joint + 1))) tone = 0;
    p.set(X, Y, R[clamp(tone, 0, R.length - 1)]);
  }
}
/** Stirnholz mit Jahresringen (Stammquerschnitt). */
export function rings(p: Px, cx: number, cy: number, rx: number, ry: number, ramp: Ramp = P.tan, seed = 1): void {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, d = Math.sqrt(u * u + v * v);
    if (d > 1) continue;
    const ring = Math.floor(d * Math.max(2.2, Math.min(rx, ry) * 0.62) + vnoise(x * 0.4, y * 0.4, seed) * 0.7);
    p.set(x, y, d > 0.86 ? ramp[1] : ring % 2 ? ramp[3] : ramp[4] ?? ramp[3]);
  }
  p.set(cx, cy, ramp[1]);
}

// ================================================================ Stein
export interface RockOpts { ramp?: Ramp; seed?: number; /** 0..1 Moos auf Oberseiten */ moss?: number; cracks?: number; /** kantiger (kleiner) oder runder */ facets?: number; flat?: boolean }
/**
 * Facettierter Felsbrocken: Standfläche bei (cx, by), Breite w, Höhe h. Flächen aus Voronoi-Zellen: oben helle
 * Deckflächen, vorn Mitteltöne, unten rechts Schatten; Bruchkanten mit Lichtsaum, Risse, Sprenkel, optional Moos.
 */
export function boulder(l: Px, cx: number, by: number, w: number, h: number, o: RockOpts = {}): void {
  const R = o.ramp ?? P.stone, seed = o.seed ?? 1, rx = w / 2, ry = h / 2, cy = by - ry;
  const nF = o.facets ?? Math.max(5, Math.round((w * h) / 38));
  const fs: Array<[number, number, number]> = [];
  for (let k = 0; k < nF; k++) {
    const a = rnd2(k, 1, seed) * TAU, r = Math.sqrt(rnd2(k, 2, seed)) * 0.95, u = Math.cos(a) * r, v = Math.sin(a) * r * 0.95;
    const lit = -(u * 0.5 + v * 0.95) + (rnd2(k, 3, seed) - 0.5) * 0.5;
    fs.push([u, v, lit > 0.5 ? 4 : lit > 0.12 ? 3 : lit > -0.35 ? 2 : lit > -0.75 ? 1 : 0]);
  }
  const ang: number[] = []; const nA = 14;
  for (let k = 0; k < nA; k++) ang.push(0.86 + rnd2(k, 9, seed) * 0.2);
  const tone = new Int8Array(l.w * l.h).fill(-1);
  for (let y = Math.floor(cy - ry); y < by; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    if (x < 0 || y < 0 || x >= l.w || y >= l.h) continue;
    const u = (x + 0.5 - cx) / rx; let v = (y + 0.5 - cy) / ry;
    if (v > 0) v *= o.flat ? 0.55 : 0.8; // unten abgeflacht: steht auf dem Boden
    const a = (Math.atan2(v, u) / TAU + 1) % 1, ai = a * nA, i0 = Math.floor(ai) % nA, fr = ai - Math.floor(ai);
    const lim = ang[i0] + (ang[(i0 + 1) % nA] - ang[i0]) * fr;
    if (u * u + v * v > lim * lim) continue;
    let best = 9, bt = 2;
    for (const f of fs) { const d = (u - f[0]) ** 2 + ((v - f[1]) * 1.25) ** 2; if (d < best) { best = d; bt = f[2]; } }
    tone[y * l.w + x] = bt;
  }
  const T = (x: number, y: number): number => (x >= 0 && y >= 0 && x < l.w && y < l.h ? tone[y * l.w + x] : -1);
  for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
    let t = T(x, y); if (t < 0) continue;
    const up = T(x, y - 1), lf = T(x - 1, y), dn = T(x, y + 1), rt = T(x + 1, y);
    if (dn < 0 || (rt < 0 && t > 0)) t = Math.max(0, t - 1);          // Unterkante/rechte Kante dunkel
    else if ((up >= 0 && up < t) || (lf >= 0 && lf < t)) t = Math.min(4, t + (t < 3 ? 1 : 0)); // Lichtsaum an Bruchkanten
    else if ((up > t && up >= 0) || (lf > t && lf >= 0)) t = Math.max(0, t - (rnd2(x, y, seed) < 0.5 ? 1 : 0));
    const sp = rnd2(x, y, seed + 4);
    if (sp < 0.03) t = Math.max(0, t - 1); else if (sp > 0.975 && t < 4) t++;
    l.set(x, y, R[clamp(t, 0, R.length - 1)]);
  }
  const nC = o.cracks ?? Math.round(w / 14);
  for (let k = 0; k < nC; k++) {
    let x = cx + (rnd2(k, 20, seed) - 0.5) * w * 0.6, y = cy + (rnd2(k, 21, seed) - 0.6) * h * 0.5;
    const len = 3 + rnd2(k, 22, seed) * h * 0.3;
    for (let i = 0; i < len; i++) { if (T(Math.floor(x), Math.floor(y)) > 0) { l.set(x, y, R[0]); if (T(Math.floor(x) - 1, Math.floor(y)) >= 2 && i % 2 === 0) l.set(x - 1, y, R[3]); } y += 1; x += rnd2(k, 30 + i, seed) < 0.4 ? (rnd2(k, 60 + i, seed) < 0.5 ? -1 : 1) : 0; }
  }
  if (o.moss) moss(l, (x, y) => { const t = T(x, y); if (t < 0) return 0; const top = 1 - (y - (cy - ry)) / h; return (t >= 3 ? 0.75 : t === 2 ? 0.3 : 0) * o.moss! * (0.4 + top) ; }, seed + 7);
}
export interface MasonOpts { ramp?: Ramp; /** Steinhöhe */ bh?: number; /** mittlere Steinbreite */ bw?: number; seed?: number; mark?: number; /** unregelmäßig (Trockenmauer) */ rough?: number }
/** Mauerwerk aus versetzten Steinlagen; füllt das Rechteck oder nur Markerpixel darin. */
export function masonry(p: Px, x: number, y: number, w: number, h: number, o: MasonOpts = {}): void {
  const R = o.ramp ?? P.stone, bh = o.bh ?? 5, bw = o.bw ?? 8, seed = o.seed ?? 1, rough = o.rough ?? 0.4;
  for (let j = 0; j < h; j++) {
    const row = Math.floor(j / bh), m = j - row * bh;
    // Steingrenzen dieser Lage
    const cuts: number[] = []; let cx = -Math.floor(rnd2(row, 1, seed) * bw);
    while (cx < w + bw) { cuts.push(cx); cx += Math.max(3, Math.round(bw * (1 - rough * 0.5 + rnd2(row, cuts.length + 2, seed) * rough))); }
    for (let i = 0; i < w; i++) {
      const X = x + i, Y = y + j;
      if (o.mark !== undefined && p.get(X, Y) !== o.mark) continue;
      let k = 0; while (k + 1 < cuts.length && cuts[k + 1] <= i) k++;
      const a = i - cuts[k], bwk = (cuts[k + 1] ?? w + bw) - cuts[k], hb = hash2(row, k, seed + 3), base = 2 + ((hb & 3) === 0 ? 1 : (hb & 3) === 1 ? -1 : 0);
      let tone = base;
      if (m === bh - 1 || a === bwk - 1) tone = (hb >> 3) & 1 ? 0 : 1;
      else if (m === 0 || a === 0) tone = base + 1;
      else if (m === bh - 2 || a === bwk - 2) tone = base - (((hb >> 5) & 1) ? 1 : 0);
      else { const s = rnd2(X, Y, seed + 8); if (s < 0.05) tone = base - 1; else if (s > 0.965) tone = base + 1; }
      p.set(X, Y, R[clamp(tone, 0, R.length - 1)]);
    }
  }
}

// ================================================================ Feuer & Licht
/** Flamme (4 Phasen): geschichtete Tropfenform mit wandernder Spitze und Funken. base = Fußlinie. */
export function flame(p: Px, cx: number, base: number, w: number, h: number, f: number, ramp: Ramp = P.fire): void {
  const lean = [0, 0.9, 0.2, -0.9][f & 3], hh = h + [0, 1, -1, 0.5][f & 3];
  const layer = (sc: number, hs: number, c: number, sh: number): void => {
    const H = hh * hs;
    for (let i = 0; i < H; i++) {
      const tt = i / H, prof = tt < 0.3 ? 0.72 + tt * 0.93 : Math.pow(1 - (tt - 0.3) / 0.7, 0.75);
      const xc = cx + lean * tt * tt * w * 0.9 + Math.sin(tt * 5 + f * 1.7 + sh) * tt * 0.8, hw = Math.max(0.5, w * sc * prof);
      for (let x = Math.floor(xc - hw); x < Math.ceil(xc + hw); x++) if (Math.abs(x + 0.5 - xc) <= hw) p.set(x, base - 1 - i, c);
    }
  };
  layer(1, 1, ramp[1], 0); layer(0.78, 0.82, ramp[2], 0.5); layer(0.52, 0.6, ramp[3], 1); layer(0.26, 0.34, ramp[4], 1.5);
  // Zungen und Funken
  const tip = base - hh;
  p.set(cx + [-2, 2, -1, 1][f & 3] * Math.max(1, w * 0.4), tip + 2 + (f & 1), ramp[2]);
  p.set(cx + [1, -2, 2, -1][f & 3], tip - 2 - (f & 1), ramp[3]);
  if (w >= 3) p.set(cx + [-3, 3, 0, -1][f & 3], tip - 4 + (f === 2 ? 1 : 0), ramp[2]);
}
/** Glutbett: unregelmäßig glühende Kohlen in einem Rechteck. */
export function embers(p: Px, x: number, y: number, w: number, h: number, f: number, seed = 1): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const n = rnd2(i >> 1, j, seed), pulse = rnd2(i >> 1, j, seed + 50 + (f & 3));
    p.set(x + i, y + j, n < 0.3 ? P.ash[1] : n < 0.5 ? P.fire[0] : pulse < 0.35 ? P.fire[3] : n < 0.8 ? P.fire[1] : P.fire[2]);
  }
}

// ================================================================ Metall & Kleinteile
/** Eisenband mit Lichtkante und Nieten. */
export function band(p: Px, x: number, y: number, w: number, h: number, ramp: Ramp = P.steel, rivets = true): void {
  p.rect(x, y, w, h, ramp[1]);
  if (h >= w) { p.rect(x, y, 1, h, ramp[2]); if (rivets) for (let j = y + 1; j < y + h - 1; j += 4) p.set(x + ((w - 1) >> 1), j, ramp[3]); }
  else { p.rect(x, y, w, 1, ramp[2]); if (rivets) for (let i = x + 1; i < x + w - 1; i += 4) p.set(i, y + ((h - 1) >> 1), ramp[3]); }
}
/**
 * Grashalm/Blatt als gebogene Linie von (x0,y0) nach (x1,y1) mit Krümmung; Spitze heller.
 * sway verschiebt nur die oberen 70 % (quadratisch anlaufend) – der Fuß bleibt in allen Wiege-Frames pixelgleich.
 */
export function blade(p: Px, x0: number, y0: number, x1: number, y1: number, bend: number, c: number, tip?: number, thick = false, sway = 0): void {
  const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t, mx = (x0 + x1) / 2 + bend, my = (y0 + y1) / 2;
    const e = t < 0.3 ? 0 : (t - 0.3) / 0.7, x = u * u * x0 + 2 * u * t * mx + t * t * x1 + sway * e * e, y = u * u * y0 + 2 * u * t * my + t * t * y1;
    const col = tip !== undefined && t > 0.62 ? tip : c;
    p.set(Math.round(x), Math.round(y), col);
    if (thick && t < 0.55) p.set(Math.round(x) + 1, Math.round(y), c);
  }
}
/** Schattierter Kasten in ¾-Sicht: Deckfläche (top px hoch) + Front. */
export function box(p: Px, x: number, y: number, w: number, h: number, top: number, ramp: Ramp): void {
  p.rect(x, y, w, top, ramp[3]); p.rect(x, y, w, 1, ramp[4]);
  p.rect(x, y + top, w, h - top, ramp[2]); p.rect(x, y + top, w, 1, ramp[1]);
  p.rect(x + w - 1, y + top, 1, h - top, ramp[1]); p.rect(x, y + h - 1, w, 1, ramp[1]);
}
/** Alle Frames nachträglich prüfen: gleiche Größe je Animation. */
export function checkFrames(list: Frames): string[] {
  const err: string[] = [], seen = new Map<string, Px>(), names = new Set(list.map((l) => l[0]));
  for (const [n, p] of list) {
    const m = /^(.*)_(\d+)$/.exec(n);
    if (!m) continue;
    const first = seen.get(m[1]);
    if (!first) seen.set(m[1], p); else if (first.w !== p.w || first.h !== p.h) err.push(`${n}: Größe weicht ab`);
    if (names.has(m[1])) err.push(`${m[1]} existiert zusätzlich ohne Frame-Suffix`);
  }
  return err;
}
export { hash2, rnd2, vnoise, mix, alpha, INK, WHITE, P };
export type { Ramp, Pt };
