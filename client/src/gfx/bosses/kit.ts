/** Werkzeugkasten der Boss-Sprites (v2): Frame-Kontext, Ebenen mit getönter Kontur, Formen und Partikel. */
import { Px, resample } from '../draw';
import type { Pt } from '../draw';
import { P, WHITE, alpha, mix, rnd2 } from '../palette';
import type { Ramp } from '../palette';
import { BOSS_ANIMS } from '../spec';
import { inkOutline } from '../objects/kit';
import { R, TAU, clamp, lerp } from '../mobs/kit';

export { pk } from '../mobs/kit';
export { R, TAU, clamp, lerp, glow, puff, spark, dots, shade, form, reramp, xf, dissolve, shatter, burst, shredUp } from '../mobs/kit';
export { boulder, flame } from '../objects/kit';

export type BAnim = keyof typeof BOSS_ANIMS;
/** Frame-Kontext: Animation, Index, Länge, Phase (0..2π über die Animation), u = i/(n-1). */
export interface BFr { a: BAnim; i: number; n: number; ph: number; u: number }
export type BossFn = (p: Px, fr: BFr) => void;
export interface BossDef { w: number; h: number; fn: BossFn }
export const B_ORDER: BAnim[] = ['idle', 'windup', 'attack', 'special', 'hit', 'death'];

/** Wert je Animation/Frame aus einer Tabelle; fehlende Animation → d. */
export function bsel<T>(fr: BFr, t: Partial<Record<BAnim, readonly T[]>>, d: T): T {
  const a = t[fr.a];
  return a ? a[Math.min(fr.i, a.length - 1)] : d;
}
/** Baut alle 26 Frames; Treffer-Frames werden aufgehellt. */
export function buildBoss(def: BossDef): Px[] {
  const out: Px[] = [];
  for (const a of B_ORDER) {
    const n = BOSS_ANIMS[a].len;
    for (let i = 0; i < n; i++) {
      const p = new Px(def.w, def.h);
      def.fn(p, { a, i, n, ph: (i / n) * TAU, u: n > 1 ? i / (n - 1) : 0 });
      if (a === 'hit') p.tint(WHITE, i === 0 ? 0.5 : 0.22);
      // Sicherheitsrand: 1 px frei an den Seiten/oben, 6 px unter der Standlinie
      for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (x === 0 || x === p.w - 1 || y === 0 || y >= p.h - 6) p.d[y * p.w + x] = 0;
      out.push(p);
    }
  }
  return out;
}
/** Eigene Ebene mit getönter 1px-Kontur. */
export function lay(p: Px, fn: (l: Px) => void, outline = true): Px {
  const l = new Px(p.w, p.h);
  fn(l);
  if (outline) inkOutline(l);
  return p.draw(l);
}
export const ease = (t: number): number => { t = clamp(t); return t * t * (3 - 2 * t); };
export const easeIn = (t: number): number => { t = clamp(t); return t * t; };
export const lp = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
export const rot = (x: number, y: number, a: number): Pt => { const c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; };

/** Catmull-Rom-Kurve durch alle Punkte (dicht abgetastet). */
export function spline(pts: ReadonlyArray<Pt>, seg = 10): Pt[] {
  const out: Pt[] = [], n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    for (let k = 0; k < seg; k++) {
      const t = k / seg, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(pts[n - 1]);
  return resample(out);
}
/** Normale (links der Laufrichtung) am Punkt i einer Punktliste. */
export function normal(pts: ReadonlyArray<Pt>, i: number): Pt {
  const a = pts[Math.max(0, i - 2)], b = pts[Math.min(pts.length - 1, i + 2)];
  const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1;
  return [dy / n, -dx / n];
}
/** Dornen entlang eines Schlauchs, abwechselnd links/rechts. */
export function thorns(l: Px, pts: ReadonlyArray<Pt>, every: number, len: number, rad: (i: number) => number, c: Ramp = P.bone, from = 3): void {
  for (let i = from, k = 0; i < pts.length - 2; i += every, k++) {
    const [nx, ny] = normal(pts, i), s = k % 2 ? 1 : -1, r = rad(i), a = pts[i];
    const bx = a[0] + nx * s * r, by = a[1] + ny * s * r, tx = a[0] + nx * s * (r + len) + ny * s * 1.2, ty = a[1] + ny * s * (r + len) - Math.abs(nx) * 1.5;
    l.poly([[bx - ny * 1.6, by + nx * 1.6], [tx, ty], [bx + ny * 1.6, by - nx * 1.6]], c[2]);
    l.line(bx, by, tx, ty, c[3]); l.set(tx, ty, c[4]);
  }
}
/**
 * Blüten-/Blattform: Fuß bei (bx,by), Spitze (tx,ty), halbe Breite w. Dunkler Saum, Lichthälfte oben links, Mittelader.
 * bend verschiebt die Mitte quer (Krümmung).
 */
export function petal(l: Px, bx: number, by: number, tx: number, ty: number, w: number, r: Ramp, lo = 1, bend = 0): void {
  const dx = tx - bx, dy = ty - by, n = Math.hypot(dx, dy) || 1, ux = dx / n, uy = dy / n, nx = -uy, ny = ux;
  const at = (t: number, s: number, k: number): Pt => { const c = Math.sin(t * Math.PI) * bend; return [bx + dx * t + nx * (s * w * k + c), by + dy * t + ny * (s * w * k + c)]; };
  const shape = (k: number, e: number): Pt[] => [at(e * 0.02, -1, 0.42 * k), at(0.3, -1, 0.92 * k), at(0.58, -1, k), at(0.84, -1, 0.6 * k), at(1 - e * 0.03, 0, 0), at(0.84, 1, 0.6 * k), at(0.58, 1, k), at(0.3, 1, 0.92 * k), at(e * 0.02, 1, 0.42 * k)];
  l.poly(shape(1, 0), r[Math.max(0, lo - 1)]);
  const k = Math.max(0.2, (w - 1) / w), s = shape(k, 1);
  l.poly(s, r[lo]);
  const lit = nx * -0.6 + ny * -0.8 > 0 ? 1 : -1; // welche Seite zeigt nach oben links
  const half = lit > 0 ? [s[4], s[5], s[6], s[7], s[8], at(0.05, 0, 0)] : [s[0], s[1], s[2], s[3], s[4], at(0.05, 0, 0)];
  l.poly(half, r[Math.min(r.length - 1, lo + 1)]);
  const m0 = at(0.12, 0, 0), m1 = at(0.8, 0, 0);
  l.line(m0[0], m0[1], m1[0], m1[1], r[Math.max(0, lo - 1)]);
  const h0 = at(0.45, lit, k * 0.62), h1 = at(0.78, lit, k * 0.42);
  l.line(h0[0], h0[1], h1[0], h1[1], r[Math.min(r.length - 1, lo + 2)]);
}
/** Kleiner Pilz mit Tupfenhut. */
export function shroom(l: Px, x: number, y: number, h: number, cap: Ramp, lean = 0): void {
  x = R(x); y = R(y);
  l.rect(x, y - h, 2, h, P.cream[3]); l.rect(x + 1, y - h, 1, h, P.cream[2]);
  const cx = x + lean, w = h >= 4 ? 7 : 5;
  l.rect(cx - (w >> 1) + 1, y - h - 3, w - 2, 1, cap[3]); l.rect(cx - (w >> 1), y - h - 2, w, 2, cap[2]);
  l.rect(cx - (w >> 1) + 1, y - h - 2, 2, 1, cap[3]); l.rect(cx + 1, y - h - 1, (w >> 1), 1, cap[1]);
  l.set(cx, y - h - 3, WHITE); l.set(cx + 2, y - h - 2, WHITE); if (w > 5) l.set(cx - 2, y - h - 1, WHITE);
}
/** Lichtstrahlenkranz (Alpha) hinter einer Lichtquelle. */
export function rays(p: Px, cx: number, cy: number, r0: number, r1: number, n: number, rotA: number, c: number, a = 120): void {
  for (let k = 0; k < n; k++) {
    const ang = rotA + (k / n) * TAU, len = r1 * (0.7 + 0.3 * rnd2(k, 4, n));
    for (let d = r0; d < len; d++) {
      const t = (d - r0) / (len - r0);
      p.blend(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, alpha(c, R(a * (1 - t))));
    }
  }
}
/** Deterministische Risse (Porzellan/Stein): nur auf deckenden Pixeln, amt 0..1 steuert die Länge. */
export function cracks(p: Px, seeds: ReadonlyArray<Pt>, amt: number, seed: number, c: number, c2?: number, maxLen = 26): void {
  seeds.forEach((s, k) => {
    for (let b = 0; b < 3; b++) {
      let x = s[0], y = s[1], a = rnd2(k, b, seed) * TAU;
      const len = maxLen * amt * (0.5 + rnd2(k, b + 5, seed) * 0.5);
      for (let i = 0; i < len; i++) {
        a += (rnd2(k * 7 + b, i, seed) - 0.5) * 1.3;
        x += Math.cos(a); y += Math.sin(a) * 0.9 + 0.25;
        const xi = Math.floor(x), yi = Math.floor(y);
        if (p.get(xi, yi) >>> 24 < 200) break;
        p.set(xi, yi, c);
        if (c2 !== undefined && p.get(xi - 1, yi) >>> 24 >= 200 && i % 2 === 0) p.set(xi - 1, yi, c2);
      }
    }
  });
}
/** Farbe abdunkeln/entsättigen innerhalb einer Rampe: mischt Rampe a nach b. */
export function rmix(a: Ramp, b: Ramp, t: number): Ramp { return a.map((c, i) => mix(c, b[Math.min(b.length - 1, i)], t)); }
/** Löscht alle Pixel unterhalb/innerhalb einer Bedingung. */
export function cut(p: Px, test: (x: number, y: number) => boolean): void {
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.d[y * p.w + x] && test(x, y)) p.d[y * p.w + x] = 0;
}
