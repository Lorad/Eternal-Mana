/**
 * Werkzeugkasten der Effekte v2: harte Pixelformen für Schmierbögen, Splitter, Flammen, Rauchballen, Ringe.
 * Alles deterministisch (Seeds), keine weichen Verläufe – Abstufung nur über wenige feste Bänder.
 */
import { Px, bez, resample } from '../draw';
import type { Pt } from '../draw';
import { rnd2 } from '../palette';

export type Item = [string, Px];
export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
export const clamp = (v: number, a = 0, b = 1): number => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const byte = (v: number): number => Math.max(0, Math.min(255, Math.round(v)));

/** Reines Weiß (für tintbare Effekte: die Engine multipliziert die Elementfarbe hinein). */
export const WH = 0xffffffff;
export const W = (a = 255): number => ((byte(a) << 24) | 0xffffff) >>> 0;
/** Neutrales Grau v (0..1) mit Alpha. */
export const G = (v: number, a = 255): number => { const c = byte(v * 255); return ((byte(a) << 24) | (c << 16) | (c << 8) | c) >>> 0; };
/** Tintendunkel (INK) mit Alpha – für Schatten, Risse, Brandflecken. */
export const K = (a = 255): number => ((byte(a) << 24) | 0x24141b) >>> 0;
export const withA = (c: number, a: number): number => ((byte(a) << 24) | (c & 0xffffff)) >>> 0;

export type Heat = (h: number) => number;
/** Hitze → Weiß/Grau-Bänder (tintbar). */
export const heatW: Heat = (h) => (h >= 0.78 ? WH : h >= 0.58 ? G(0.9) : h >= 0.4 ? G(0.78) : h >= 0.22 ? G(0.64) : G(0.52, 215));
/** Hitze → Farbliste (dunkel → hell). */
export const heatOf = (cols: readonly number[]): Heat => (h) => cols[Math.max(0, Math.min(cols.length - 1, Math.floor(h * cols.length)))];

export const at = <T>(arr: readonly T[], k: number): T => arr[Math.max(0, Math.min(arr.length - 1, k))];

export function anim(out: Item[], name: string, n: number, w: number, h: number, fn: (p: Px, k: number) => void): void {
  for (let k = 0; k < n; k++) { const p = new Px(w, h); fn(p, k); out.push([`${name}_${k}`, p]); }
}
export function one(out: Item[], name: string, w: number, h: number, fn: (p: Px) => void): void {
  const p = new Px(w, h); fn(p); out.push([name, p]);
}

// ---------------------------------------------------------------- Schmierbogen (Waffenspur)
export interface ArcOpt {
  cx: number; cy: number; rx: number; ry: number;
  /** Schweifende (Grad) → Kopf (Grad); Bewegungsrichtung von a0 nach a1. */
  a0: number; a1: number;
  /** größte Dicke in px */
  w: number;
  /** Lage der dicksten Stelle 0..1 (Standard 0.68) */
  fat?: number;
  heat?: Heat;
  gain?: number;
  /** 0..1: wie stark der Schweif in Striche zerfällt */
  breakup?: number;
  /** 0..1: ausgefranste Geschwindigkeitslinien am Schweif */
  comb?: number;
  seed?: number;
  /** nur Außen- und Innenkante (Nachbild) */
  edge?: boolean;
}
/**
 * Sichelförmige Schmierspur entlang eines Ellipsenbogens: dicke, helle Führungskante außen/vorn,
 * nach hinten in Einzelstriche (konstanter Radius = Geschwindigkeitslinien) zerfallend.
 */
export function arcSmear(p: Px, o: ArcOpt): void {
  const { cx, cy, rx, ry } = o, heat = o.heat ?? heatW, gain = o.gain ?? 1, fat = o.fat ?? 0.68, comb = o.comb ?? 0.8, br = o.breakup ?? 0, seed = o.seed ?? 1;
  const a0 = o.a0 * DEG, a1 = o.a1 * DEG, dir = a1 >= a0 ? 1 : -1, span = Math.abs(a1 - a0);
  if (span < 1e-4) return;
  const R = (rx + ry) / 2;
  for (let y = Math.max(0, Math.floor(cy - ry - 1)); y < Math.min(p.h, cy + ry + 2); y++)
    for (let x = Math.max(0, Math.floor(cx - rx - 1)); x < Math.min(p.w, cx + rx + 2); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, nx = dx / rx, ny = dy / ry, rn = Math.hypot(nx, ny);
      if (rn > 1 || rn < 0.05) continue;
      let rel = (Math.atan2(ny, nx) - a0) * dir;
      rel = ((rel % TAU) + TAU) % TAU;
      if (rel > span) continue;
      const t = rel / span, dist = Math.hypot(dx, dy), d = dist / rn - dist;
      if (d > o.w) continue;
      const band = Math.floor(d), jit = rnd2(band, 3, seed);
      const ta = t < fat ? t + comb * jit * 0.34 * (1 - t / fat) : t;
      const prof = ta < fat ? Math.pow(ta / fat, 0.75) : Math.pow((1 - ta) / (1 - fat), 0.6);
      const wl = o.w * prof;
      if (d > wl) continue;
      if (br > 0 && rnd2(band, Math.floor((rel * R) / 3.2), seed + 7) < br * (1.25 - t)) continue;
      if (o.edge) {
        if (d < 1.3) p.set(x, y, heat(gain * (0.5 + 0.5 * t)));
        else if (d > wl - 1.2 && wl > 3) p.set(x, y, heat(gain * (0.3 + 0.35 * t)));
        continue;
      }
      const e = 1 - d / Math.max(1, wl);
      p.set(x, y, heat(gain * (0.3 + 0.7 * e) * (0.42 + 0.58 * t)));
    }
}

/** Linsenförmiger Schnitt entlang einer Bézier-Kurve a→b (Kontrollpunkt c), sichtbar zwischen t0 und t1. */
export function cut(p: Px, a: Pt, c: Pt, b: Pt, w: number, t0: number, t1: number, heat: Heat = heatW,
  o: { gain?: number; fat?: number; breakup?: number; seed?: number } = {}): void {
  const gain = o.gain ?? 1, fat = o.fat ?? 0.62, br = o.breakup ?? 0, seed = o.seed ?? 1;
  const pts = resample(bez(a, c, b, 24)), n = pts.length - 1;
  if (t1 <= t0) return;
  const cells = new Map<number, number>();
  for (let i = 0; i <= n; i++) {
    const tt = i / n;
    if (tt < t0 || tt > t1) continue;
    const t = (tt - t0) / (t1 - t0);
    const prof = t < fat ? Math.pow(t / fat, 0.8) : Math.pow((1 - t) / (1 - fat), 0.7), hw = (w * prof) / 2;
    if (br > 0 && rnd2(Math.floor(i / 3), 1, seed) < br * (1.2 - t)) continue;
    const q = pts[Math.min(n, i + 1)], r = pts[Math.max(0, i - 1)];
    let nx = -(q[1] - r[1]), ny = q[0] - r[0];
    const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    for (let s = -hw; s <= hw + 0.01; s += 0.5) {
      const e = hw < 0.6 ? 1 : 1 - Math.abs(s) / (hw + 0.4);
      const h = gain * (0.35 + 0.65 * e) * (0.5 + 0.5 * t);
      const x = Math.floor(pts[i][0] + nx * s), y = Math.floor(pts[i][1] + ny * s);
      if (x < 0 || y < 0 || x >= p.w || y >= p.h) continue;
      const key = y * p.w + x, prev = cells.get(key);
      if (prev === undefined || h > prev) cells.set(key, h);
    }
  }
  for (const [key, h] of cells) p.d[key] = heat(h);
}

// ---------------------------------------------------------------- Grundformen
/** Dünnes Dreieck: Basis bei (x,y), Spitze in Richtung ang (rad) nach len px. */
export function needle(p: Px, x: number, y: number, ang: number, len: number, w: number, c: number): void {
  const cx = Math.cos(ang), sy = Math.sin(ang);
  if (len <= 0) return;
  if (w <= 1.3) { p.line(x, y, x + cx * len, y + sy * len, c); return; }
  p.poly([[x - sy * w / 2, y + cx * w / 2], [x + cx * len, y + sy * len], [x + sy * w / 2, y - cx * w / 2]], c);
  p.line(x + cx * len * 0.5, y + sy * len * 0.5, x + cx * len, y + sy * len, c);
}
/** Raute/Splitter um (x,y): Länge len entlang ang, Breite w. */
export function kite(p: Px, x: number, y: number, ang: number, len: number, w: number, c: number, c2?: number): void {
  const cx = Math.cos(ang), sy = Math.sin(ang), hl = len / 2, hw = w / 2;
  if (len < 1.5) { p.set(x, y, c); return; }
  if (w <= 1.3) { p.line(x - cx * hl, y - sy * hl, x + cx * hl, y + sy * hl, c); return; }
  const tip: Pt = [x + cx * hl, y + sy * hl], tail: Pt = [x - cx * hl, y - sy * hl];
  const m: Pt = [x - cx * hl * 0.25, y - sy * hl * 0.25];
  const s1: Pt = [m[0] - sy * hw, m[1] + cx * hw], s2: Pt = [m[0] + sy * hw, m[1] - cx * hw];
  p.poly([tip, s1, tail, s2], c);
  p.line(tail[0], tail[1], tip[0], tip[1], c);
  if (c2 !== undefined) p.poly([tip, s1, tail], c2);
}
/** Zackenstern (Aufblitzen): n Zacken, Radien rIn/rOut mit Unregelmäßigkeit jit. */
export function burstStar(p: Px, cx: number, cy: number, n: number, rIn: number, rOut: number, rot: number, c: number, seed = 0, jit = 0.3): void {
  const pts: Pt[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n + (rnd2(i, 5, seed) - 0.5) * jit * 0.5;
    const r = i % 2 === 0 ? rOut * (1 - jit * rnd2(i, 9, seed)) : rIn * (1 + jit * (rnd2(i, 11, seed) - 0.5));
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  p.poly(pts, c);
}
/** Funkelstern: r = 0 Punkt, 1 Plus, 2 großes Plus, 3 Vierzack mit Diagonalen. */
export function twinkle(p: Px, x: number, y: number, r: number, c: number, c2 = c): void {
  x = Math.round(x); y = Math.round(y);
  if (r <= 0) { p.set(x, y, c); return; }
  for (let i = 1; i <= r; i++) { const cc = i === r && r > 1 ? c2 : c; p.set(x + i, y, cc); p.set(x - i, y, cc); p.set(x, y + i, cc); p.set(x, y - i, cc); }
  if (r >= 3) { p.set(x + 1, y + 1, c2); p.set(x - 1, y - 1, c2); p.set(x + 1, y - 1, c2); p.set(x - 1, y + 1, c2); }
  p.set(x, y, c);
}
/** Kantiger Brocken (unregelmäßiges Vieleck) mit drei Flächen: dunkel, mittel, Lichtfacette oben links. */
export function rock(p: Px, x: number, y: number, r: number, rot: number, cols: readonly number[], seed = 0): void {
  if (r < 1.1) { p.set(x, y, cols[1]); return; }
  if (r < 1.8) { p.rect(Math.round(x - 1), Math.round(y - 1), 2, 2, cols[1]); p.set(x - 1, y - 1, cols[2]); p.set(x, y, cols[0]); return; }
  const mk = (s: number, ox: number, oy: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i < 6; i++) { const a = rot + (i * TAU) / 6 + (rnd2(i, 2, seed) - 0.5) * 0.5, rr = r * s * (0.72 + 0.36 * rnd2(i, 4, seed)); pts.push([x + ox + Math.cos(a) * rr, y + oy + Math.sin(a) * rr]); }
    return pts;
  };
  p.poly(mk(1, 0, 0), cols[0]);
  p.poly(mk(0.8, -r * 0.16, -r * 0.2), cols[1]);
  if (r >= 2.6) p.poly(mk(0.45, -r * 0.34, -r * 0.4), cols[2]);
}
/** Blumenkohl-Rauchballen aus überlappenden Kreisen mit harten Schattierungsbändern (dunkel → hell). */
export function puff(p: Px, cx: number, cy: number, r: number, cols: readonly number[], seed = 0, lumps = 5): void {
  if (r < 1) { p.set(cx, cy, cols[Math.min(1, cols.length - 1)]); return; }
  if (r < 1.8) { p.rect(Math.round(cx - 1), Math.round(cy - 1), 2, 2, cols[Math.min(1, cols.length - 1)]); p.set(cx - 1, cy - 1, cols[cols.length - 1]); return; }
  const L: Array<[number, number, number]> = [[cx, cy, r * 0.62]];
  for (let i = 0; i < lumps; i++) {
    const a = (i / lumps) * TAU + rnd2(i, 1, seed) * 1.1, dd = r * (0.36 + 0.14 * rnd2(i, 2, seed));
    L.push([cx + Math.cos(a) * dd, cy + Math.sin(a) * dd * 0.9, r * (0.34 + 0.22 * rnd2(i, 3, seed))]);
  }
  for (const [x, y, q] of L) p.ell(x, y, q, q, cols[0]);
  if (cols.length > 1) for (const [x, y, q] of L) if (q > 1.2) p.ell(x - q * 0.2, y - q * 0.24, q * 0.74, q * 0.74, cols[1]);
  if (cols.length > 2) for (const [x, y, q] of L) if (q > 2) p.ell(x - q * 0.36, y - q * 0.42, q * 0.42, q * 0.42, cols[2]);
  if (cols.length > 3 && r > 4) p.ell(cx - r * 0.3, cy - r * 0.36, r * 0.2, r * 0.2, cols[3]);
}
/** Flammenzunge: Fuß bei (x,y), Höhe h, Breite w, Spitze um lean versetzt; cols außen → innen. */
export function flame(p: Px, x: number, y: number, w: number, h: number, lean: number, cols: readonly number[]): void {
  const mk = (s: number): Pt[] => {
    const ww = w * s, hh = h * s, ln = lean * s;
    return [
      [x - ww * 0.5, y], [x - ww * 0.56, y - hh * 0.28], [x - ww * 0.3 + ln * 0.35, y - hh * 0.62], [x + ln, y - hh],
      [x + ww * 0.22 + ln * 0.55, y - hh * 0.6], [x + ww * 0.5 + ln * 0.2, y - hh * 0.34], [x + ww * 0.5, y],
    ];
  };
  cols.forEach((c, i) => {
    const s = 1 - i * (0.72 / cols.length) - (i ? 0.08 : 0);
    if (w * s < 1 || h * s < 1.5) { if (i) p.set(x, y - 1, c); return; }
    p.poly(mk(s), c);
    p.ell(x, y - 0.2, (w * s) / 2, Math.max(1, w * s * 0.3), c);
    if (i === 0) p.set(x + lean, y - h, c);
  });
}
/** Elliptischer Ring (¾-Perspektive): Dicke th außen (vorn/hinten verkürzt). col(a, e) → Farbe oder 0. */
export function ering(p: Px, cx: number, cy: number, rx: number, ry: number, th: number, col: (a: number, e: number) => number): void {
  if (rx < 0.5 || ry < 0.5) return;
  const irx = Math.max(0.01, rx - th), iry = Math.max(0.01, ry - (th * ry) / rx);
  for (let y = Math.max(0, Math.floor(cy - ry - 1)); y < Math.min(p.h, cy + ry + 2); y++)
    for (let x = Math.max(0, Math.floor(cx - rx - 1)); x < Math.min(p.w, cx + rx + 2); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const o = Math.hypot(dx / rx, dy / ry);
      if (o > 1) continue;
      const i = Math.hypot(dx / irx, dy / iry);
      if (i < 1 && rx - th > 0.5) continue;
      const c = col(Math.atan2(dy / ry, dx / rx), clamp(((1 - o) * rx) / Math.max(0.5, th)));
      if (c) p.set(x, y, c);
    }
}
/** Löscht deckende Pixel mit Wahrscheinlichkeit amt (blockweise, damit Bröckchen statt Rauschen entstehen). */
export function dissolve(p: Px, amt: number, seed = 0, block = 1): void {
  if (amt <= 0) return;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const i = y * p.w + x;
    if (p.d[i] && rnd2(Math.floor(x / block), Math.floor(y / block), seed) < amt) p.d[i] = 0;
  }
}
/** Radiales Ausfransen: löscht Pixel, deren Abstand zum Zentrum unter rHole (unregelmäßig) liegt. */
export function hollow(p: Px, cx: number, cy: number, r: number, seed = 0, ry = r): void {
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / ry, a = Math.atan2(dy, dx);
    const k = 1 + 0.22 * Math.sin(a * 3 + seed) + 0.14 * Math.sin(a * 7 + seed * 2.3);
    if (Math.hypot(dx, dy) < k) p.d[y * p.w + x] = 0;
  }
}
/** Deterministische Partikel eines Ausbruchs: Winkel, Tempo (0.6..1.4), Größe (0..1), Zusatzzufall. */
export interface Part { a: number; v: number; s: number; q: number }
export function burst(seed: number, n: number, a0 = 0, a1 = TAU, even = true): Part[] {
  const out: Part[] = [];
  for (let i = 0; i < n; i++) {
    const u = even ? (i + rnd2(i, 1, seed) * 0.8) / n : rnd2(i, 1, seed);
    out.push({ a: a0 + (a1 - a0) * u, v: 0.6 + 0.8 * rnd2(i, 2, seed), s: rnd2(i, 3, seed), q: rnd2(i, 4, seed) });
  }
  return out;
}
/** Gestrichelte/gebrochene Linie mit Verjüngung der Deckung: Kopf bei (x1,y1). */
export function streak(p: Px, x0: number, y0: number, x1: number, y1: number, heat: Heat = heatW, gain = 1, br = 0, seed = 0): void {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (br > 0 && rnd2(Math.floor(i / 2), 3, seed) < br * (1.15 - t)) continue;
    p.set(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, heat(gain * (0.25 + 0.75 * t)));
  }
}
/** Quantisiert einen Wert 0..1 in n gleich breite Stufen (0..1). */
export const quant = (v: number, n: number): number => Math.floor(clamp(v, 0, 0.9999) * n) / (n - 1);
