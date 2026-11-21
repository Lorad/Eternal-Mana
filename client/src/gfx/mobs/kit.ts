/** Werkzeugkasten der Gegner-Sprites (v2): Frame-Kontext, Posen-Helfer, Bildoperationen für Tode. */
import { Px, tube } from '../draw';
import type { Pt } from '../draw';
import { alpha, hash2, rnd2, vnoise } from '../palette';
import type { Ramp } from '../palette';
import { MOB_ANIMS } from '../spec';

export type AnimName = keyof typeof MOB_ANIMS;
/** Frame-Kontext: Animation, Index, Länge, Phase (0..2π über die Animation). */
export interface Fr { a: AnimName; i: number; n: number; ph: number }
export type MobFn = (p: Px, fr: Fr) => void;
export interface MobDef { w: number; h: number; fn: MobFn }
export const ANIM_ORDER: AnimName[] = ['idle', 'move', 'windup', 'attack', 'hit', 'death'];

export const TAU = Math.PI * 2;
export const R = Math.round;
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const clamp = (v: number, a = 0, b = 1): number => Math.max(a, Math.min(b, v));
/** Wert je Animation/Frame aus einer Tabelle; fehlende Animation → d. */
export function sel<T>(fr: Fr, t: Partial<Record<AnimName, readonly T[]>>, d: T): T {
  const a = t[fr.a];
  return a ? a[Math.min(fr.i, a.length - 1)] : d;
}

// ---------------------------------------------------------------- Licht & Partikel
/** Pixeliger Lichtschein in drei Stufen (hinter die Figur zeichnen). */
export function glow(p: Px, cx: number, cy: number, r: number, c: number, a = 70): void {
  for (let y = Math.floor(cy - r); y <= cy + r; y++)
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
      if (d < 1) p.blend(x, y, alpha(c, R(a * (d < 0.45 ? 1 : d < 0.75 ? 0.55 : 0.25))));
    }
}
/** Rauch-/Dunstwölkchen (weiche Alpha-Ellipse). */
export function puff(p: Px, cx: number, cy: number, rx: number, ry: number, c: number, a: number): void {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, d = nx * nx + ny * ny;
      if (d < 1) p.blend(x, y, alpha(c, R(a * (d < 0.5 ? 1 : 0.55))));
    }
}
/** Kreuzförmiger Funke: Kern c, Arme c2. */
export function spark(p: Px, x: number, y: number, c: number, c2?: number, len = 1): void {
  x = R(x); y = R(y);
  if (c2 !== undefined) for (let i = 1; i <= len; i++) { p.blend(x - i, y, c2); p.blend(x + i, y, c2); p.blend(x, y - i, c2); p.blend(x, y + i, c2); }
  p.set(x, y, c);
}
export function dots(p: Px, pts: ReadonlyArray<number>, c: number): void {
  for (let i = 0; i + 1 < pts.length; i += 2) p.blend(R(pts[i]), R(pts[i + 1]), c);
}

// ---------------------------------------------------------------- Formen
/** Zwei-Knochen-IK: Gelenkpunkt zwischen a und b; dir = +1 knickt für ein nach unten zeigendes Bein nach hinten (−x). */
export function ik(a: Pt, b: Pt, l1: number, l2: number, dir: number): Pt {
  const dx = b[0] - a[0], dy = b[1] - a[1], D = Math.max(0.001, Math.hypot(dx, dy));
  const d = clamp(D, Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.01);
  const k = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - k * k));
  const ux = dx / D, uy = dy / D;
  return [a[0] + ux * k - dir * uy * h, a[1] + uy * k + dir * ux * h];
}
/** Schattiertes Glied von a nach b. */
export function limb(l: Px, a: Pt, b: Pt, r0: number, r1: number, r: Ramp, lo = 1): void { tube(l, [a, b], r0, r1, r, lo); }

/**
 * Schattiert eine beliebige Silhouette wie einen runden Körper: Licht von oben links, harte Bänder aus der Rampe.
 * Alle deckenden Pixel von m werden ersetzt.
 */
export function shade(m: Px, r: Ramp, lo = 0, hi = r.length - 1, bias = 0, vw = 0.64): Px {
  const { w, h, d } = m, n = hi - lo + 1;
  const op = new Uint8Array(w * h);
  for (let i = 0; i < d.length; i++) op[i] = d[i] >>> 24 >= 128 ? 1 : 0;
  const up = new Uint8Array(w * h), dn = new Uint8Array(w * h), lf = new Uint8Array(w * h), rt = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (op[i]) { up[i] = y > 0 ? up[i - w] + 1 : 1; lf[i] = x > 0 ? lf[i - 1] + 1 : 1; } }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; if (op[i]) { dn[i] = y < h - 1 ? dn[i + w] + 1 : 1; rt[i] = x < w - 1 ? rt[i + 1] + 1 : 1; } }
  for (let i = 0; i < d.length; i++) {
    if (!op[i]) continue;
    const tv = (dn[i] - 0.5) / (up[i] + dn[i] - 1), th = (rt[i] - 0.5) / (lf[i] + rt[i] - 1);
    const t = clamp(tv * vw + th * (1 - vw) + bias, 0, 0.999);
    d[i] = r[lo + Math.floor(t * n)];
  }
  return m;
}
/** Zeichnet eine Maske, schattiert sie als Form und legt sie in l. */
export function form(l: Px, fn: (m: Px) => void, r: Ramp, lo = 0, hi = r.length - 1, bias = 0, vw = 0.64): void {
  const m = new Px(l.w, l.h);
  fn(m);
  l.draw(shade(m, r, lo, hi, bias, vw));
}
/** Ersetzt in l alle deckenden Pixel, für die test gilt, durch die Farbe gleicher Helligkeitsstufe aus einer anderen Rampe. */
export function reramp(l: Px, from: Ramp, to: Ramp, test?: (x: number, y: number) => boolean): void {
  for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
    const c = l.d[y * l.w + x]; if (!(c >>> 24)) continue;
    const i = from.indexOf(c); if (i < 0) continue;
    if (!test || test(x, y)) l.d[y * l.w + x] = ((c & 0xff000000) | (to[Math.min(to.length - 1, i)] & 0xffffff)) >>> 0;
  }
}

// ---------------------------------------------------------------- Bildoperationen
export interface Xf { sx?: number; sy?: number; rot?: number; shx?: number; ax: number; ay: number; dx?: number; dy?: number }
/** Skalieren/Scheren/Drehen um den Anker (ax, ay), nearest. Vor dem Umranden anwenden. */
export function xf(src: Px, o: Xf): Px {
  const sx = o.sx ?? 1, sy = o.sy ?? 1, rot = o.rot ?? 0, sh = o.shx ?? 0, dx = o.dx ?? 0, dy = o.dy ?? 0;
  const c = Math.cos(-rot), s = Math.sin(-rot);
  return Px.map(src.w, src.h, src, (x, y) => {
    const u0 = x + 0.5 - o.ax - dx, v0 = y + 0.5 - o.ay - dy;
    const u1 = u0 * c - v0 * s, v1 = u0 * s + v0 * c;
    const v = v1 / sy, u = (u1 + sh * v) / sx;
    return [u + o.ax, v + o.ay];
  });
}
/** Löst Pixel in Flecken auf (amt 0..1); gleiche seed → wachsende Lücken. grad verschiebt die Schwelle je Pixel. */
export function dissolve(p: Px, amt: number, seed: number, grad?: (x: number, y: number) => number): Px {
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const i = y * p.w + x; if (!(p.d[i] >>> 24)) continue;
    const n = vnoise(x * 0.42, y * 0.42, seed) * 0.6 + rnd2(x, y, seed) * 0.4;
    if (n < amt + (grad ? grad(x, y) : 0)) p.d[i] = 0;
  }
  return p;
}
export interface ShatterOpt { cell?: number; spread?: number; heap?: number; cx?: number; pop?: number }
/** Zerlegt das Bild in Brocken, die zu Boden fallen und einen Haufen bilden (t 0..1). */
export function shatter(src: Px, t: number, gy: number, seed: number, o: ShatterOpt = {}): Px {
  const cell = o.cell ?? 5, spread = o.spread ?? 1, heap = o.heap ?? 4, cx = o.cx ?? src.w / 2, pop = o.pop ?? 0;
  const out = new Px(src.w, src.h);
  interface Ch { key: number; idx: number[]; x0: number; x1: number; y1: number }
  const map = new Map<number, Ch>();
  for (let y = 0; y < src.h; y++) {
    const cyi = Math.floor((y + 2) / cell), off = hash2(cyi, 7, seed) % cell;
    for (let x = 0; x < src.w; x++) {
      const i = y * src.w + x; if (!(src.d[i] >>> 24)) continue;
      const key = cyi * 64 + Math.floor((x + off) / cell);
      let ch = map.get(key);
      if (!ch) { ch = { key, idx: [], x0: x, x1: x, y1: y }; map.set(key, ch); }
      ch.idx.push(i); ch.x0 = Math.min(ch.x0, x); ch.x1 = Math.max(ch.x1, x); ch.y1 = Math.max(ch.y1, y);
    }
  }
  const chunks = [...map.values()].sort((a, b) => b.y1 - a.y1 || a.key - b.key);
  for (const ch of chunks) {
    const r1 = rnd2(ch.key, 1, seed), r2 = rnd2(ch.key, 2, seed), r3 = rnd2(ch.key, 3, seed);
    const ccx = (ch.x0 + ch.x1 + 1) / 2;
    const landX = ccx + (ccx - cx) * 0.3 * spread + (r1 - 0.5) * 6 * spread;
    const hh = heap * Math.max(0, 1 - Math.abs(landX - cx) / (src.w * 0.36));
    const landY = Math.min(gy, Math.max(ch.y1, gy - R(r2 * hh)));
    const tf = 0.45 + 0.55 * r3, k = clamp(t / tf);
    const dy = R((landY - ch.y1) * k * k - pop * Math.sin(Math.PI * clamp(t / tf)) * (0.4 + r2));
    const dx = R((landX - ccx) * k);
    for (const i of ch.idx) out.set((i % src.w) + dx, Math.floor(i / src.w) + dy, src.d[i]);
  }
  return out;
}
/** Pixel fliegen vom Zentrum weg und dünnen aus (Verpuffen). */
export function burst(src: Px, t: number, cx: number, cy: number, seed: number, dist = 10, thin = 1): Px {
  const out = new Px(src.w, src.h);
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const c = src.d[y * src.w + x]; if (!(c >>> 24)) continue;
    const r = rnd2(x, y, seed); if (r < t * thin) continue;
    const ang = Math.atan2(y + 0.5 - cy, x + 0.5 - cx) + (rnd2(x, y, seed + 1) - 0.5) * 0.9;
    const d = t * dist * (0.35 + rnd2(x >> 1, y >> 1, seed + 2));
    out.set(x + Math.cos(ang) * d, y + Math.sin(ang) * d, c);
  }
  return out;
}
/** Spalten reißen nach oben weg und lösen sich auf (Geister, Schatten). */
export function shredUp(src: Px, t: number, seed: number, rise = 10): Px {
  const out = new Px(src.w, src.h);
  for (let x = 0; x < src.w; x++) {
    const band = x >> 1, r = rnd2(band, 3, seed), sway = Math.sin(band * 1.7 + t * 5) * t * 2.5;
    for (let y = 0; y < src.h; y++) {
      const c = src.d[y * src.w + x]; if (!(c >>> 24)) continue;
      const n = vnoise(x * 0.5, y * 0.35, seed) * 0.7 + rnd2(x, y, seed) * 0.3;
      if (n < t * 1.05 - 0.08) continue;
      out.set(x + sway, y - t * rise * (0.3 + r) - t * (src.h - y) * 0.15, c);
    }
  }
  return out;
}
export function vflip(src: Px): Px { return Px.map(src.w, src.h, src, (x, y) => [x, src.h - 1 - y]); }
/** Mischt alle deckenden Pixel Richtung c, lässt Alpha. */
export function toward(p: Px, c: number, t: number): Px { p.tint(c, t); return p; }
/** Flache Pfütze/Lache in ¾-Sicht. */
export function puddle(l: Px, cx: number, gy: number, rx: number, ry: number, r: Ramp, lo = 1): void {
  l.ell(cx, gy - ry + 1, rx, ry, r[lo + 1]);
  l.ell(cx - rx * 0.12, gy - ry + 0.6, rx * 0.74, ry * 0.6, r[Math.min(r.length - 1, lo + 2)]);
  for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (l.get(x, gy) >>> 24) l.set(x, gy, r[lo]);
}
/** Staub-/Splitterwurf am Boden: n Pixel im Bogen. */
export function debris(p: Px, cx: number, gy: number, t: number, seed: number, n: number, c: ReadonlyArray<number>, reach = 10, up = 7): void {
  for (let i = 0; i < n; i++) {
    const a = rnd2(i, 1, seed), b = rnd2(i, 2, seed), dir = i % 2 ? 1 : -1;
    const x = cx + dir * (2 + a * reach) * (0.3 + t * 0.7), y = gy - Math.sin(Math.PI * Math.min(1, t * (0.7 + b * 0.6))) * up * (0.4 + b);
    p.set(x, Math.min(gy, y), c[i % c.length]);
  }
}
/** Punkt je Frame aus einer Liste (letzter Eintrag gilt weiter). */
export function pk(a: ReadonlyArray<Pt>, i: number): Pt { return a[Math.min(i, a.length - 1)]; }
