/**
 * Kristallhöhlen/Glutlande – gemeinsame Maler: facettierte Kristallprismen, Tropfstein-Kegel, Glutadern.
 * Ergänzt kit.ts (dort: Laub, Holz, Fels, Mauerwerk, Flammen); Farben kommen immer über Rampen herein.
 */
import { Px, Pt, resample } from '../draw';
import { INK, P, Ramp, WHITE, alpha, clamp, mix, rnd2 } from './kit';

const ST = P.steel, TL = P.teal, BL = P.blue, W = P.wood, T = P.tan;

// ---------------------------------------------------------------- Rampen
/** Höhlenfels (5): warmes Graubraun mit kühlen Indigo-Schatten – hebt sich vom petrolfarbenen Boden ab. */
export const CAVEROCK: Ramp = [mix(W[0], BL[0], 0.55), mix(W[1], ST[1], 0.55), mix(W[2], ST[2], 0.5), mix(T[2], ST[3], 0.5), mix(T[3], P.ice[3], 0.45)];
/** Sinter/Tropfstein (6): Schattenbraun → helles Kalkbeige → nasser Glanz. */
export const SINTER: Ramp = [mix(W[0], BL[0], 0.5), mix(W[1], ST[1], 0.45), mix(W[2], P.stone[2], 0.5), mix(T[2], P.stone[3], 0.45), mix(T[3], P.bone[3], 0.5), mix(P.bone[4], P.ice[3], 0.3)];
/** Kristallrampen (6): [Kern dunkel, Schattenfacette, Körper, Lichtfacette, Glanz, Weißglanz]. */
export const CYAN: Ramp = [mix(BL[0], TL[0], 0.3), mix(BL[1], TL[1], 0.45), mix(BL[2], TL[2], 0.5), mix(BL[3], TL[3], 0.45), mix(BL[4], TL[4], 0.45), mix(P.ice[4], WHITE, 0.5)];
export const MAGENTA: Ramp = [mix(P.pink[0], P.violet[0], 0.4), mix(P.pink[1], P.violet[1], 0.35), mix(P.pink[2], P.violet[2], 0.15), P.pink[3], P.pink[4], mix(P.pink[4], WHITE, 0.6)];
export const TEALC: Ramp = [TL[0], TL[1], TL[2], TL[3], TL[4], mix(TL[4], WHITE, 0.6)];
export const VIOLETC: Ramp = [P.violet[0], P.violet[1], P.violet[2], P.violet[3], P.violet[4], mix(P.violet[4], WHITE, 0.6)];
/** Feuchtes Grubenholz (5) und rostiges Eisen (5). */
export const MINEWOOD: Ramp = [mix(W[0], BL[0], 0.3), mix(W[1], ST[0], 0.2), mix(W[2], P.stone[1], 0.15), mix(W[3], P.stone[2], 0.15), mix(W[4], P.stone[3], 0.2)];
export const RUST: Ramp = [mix(ST[0], INK, 0.3), mix(ST[0], W[1], 0.35), mix(ST[1], W[2], 0.3), mix(ST[2], T[1], 0.25), mix(ST[3], T[3], 0.2)];

// ---------------------------------------------------------------- Kristallprisma
export interface PrismOpts {
  /** Anteil der Länge, ab dem die Spitze beginnt (Schulter) */
  sh?: number;
  /** seitlicher Versatz der Spitze in Halbbreiten (schräg angeschliffene Spitze) */
  skew?: number;
  /** Aufhellung (Glanz-Frame): 1 = eine Stufe */
  lift?: number;
  seed?: number;
  /** Glasig-schwarz (Obsidian): dunkle Flächen, harte Lichtkanten statt heller Facetten */
  glass?: boolean;
  /** unterste Zeile (exklusiv), Standard = by */
  clipY?: number;
}
/**
 * Sechskantprisma von der Basis (bx,by) zur Spitze (tx,ty), halbe Breite hw. Drei sichtbare Längsfacetten (links hell,
 * Mitte, rechts Schatten), die an der Schulter zur Spitze zusammenlaufen; Lichtkante zwischen linker und mittlerer
 * Facette, Schulterkante, innere Reflexstreifen, dunkler Fuß. Rampe mit 6 Tönen.
 */
export function prism(l: Px, bx: number, by: number, tx: number, ty: number, hw: number, R: Ramp, o: PrismOpts = {}): void {
  const dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy) || 1, ax = dx / len, ay = dy / len, nx = -ay, ny = ax;
  const sh = o.sh ?? clamp(1 - (hw * 1.7) / len, 0.4, 0.86), skew = o.skew ?? 0, lift = o.lift ?? 0, seed = o.seed ?? 1, clipY = o.clipY ?? by, glass = o.glass ?? false;
  const k1 = -0.28, k2 = 0.42;
  const x0 = Math.floor(Math.min(bx, tx) - hw - 2), x1 = Math.ceil(Math.max(bx, tx) + hw + 2), y0 = Math.floor(Math.min(by, ty)) - 1;
  for (let y = y0; y < clipY; y++) for (let x = x0; x <= x1; x++) {
    const px = x + 0.5 - bx, py = y + 0.5 - by, t = (px * ax + py * ay) / len;
    if (t < -0.4 || t > 1) continue;
    const tt = Math.max(0, t), u = (px * nx + py * ny) / hw;
    const w = tt < sh ? 0.8 + (0.2 * tt) / sh : (1 - tt) / (1 - sh), uc = tt > sh ? (skew * (tt - sh)) / (1 - sh) : 0;
    if (Math.abs(u - uc) * hw > Math.max(w * hw, 0.5)) continue;
    const v = w > 0.02 ? (u - uc) / w : 0, face = v < k1 ? 0 : v < k2 ? 1 : 2, term = tt > sh;
    let tone = glass ? (term ? [3, 1, 0][face] : [2, 1, 0][face]) : term ? [4, 3, 1][face] : [3, 2, 1][face];
    const e1 = (v - k1) * w * hw, band = Math.floor((tt * len + v * hw * 1.3) / 3), r = rnd2(band, face, seed);
    if (glass) {
      if (face === 1 && e1 < 1 && hw >= 2) tone = term ? 5 : r > 0.3 ? 4 : 3;                     // harte Lichtkante
      else if (face === 0 && r > 0.8 && !term) tone = 3;                                            // Muschelbruch-Reflex
      else if (face === 2 && r > 0.86) tone = 1;
      else if (face === 0 && term && (tt - sh) * len < 1.2) tone = 4;
      if (face === 2 && (1 - v) * w * hw < 1 && r > 0.45 && !term) tone = 2;                        // Gegenlicht an der Schattenkante
    } else {
      if (face === 1 && e1 < 1 && hw >= 2.5) tone = term ? 5 : 4;                                   // Lichtkante L|M
      else if (!term && (sh - tt) * len < 1 && face < 2) tone += 1;                                 // Schulterkante
      else if (!term && r > (face === 1 ? 0.7 : 0.82)) tone += 1;                                   // Reflexstreifen
      else if (!term && face === 1 && r < 0.12) tone -= 1;
      if (tt * len < 2.2) tone -= 1; else if (tt * len < 5 && face === 2) tone -= 1;                // Fuß dunkler
      if (lift && (face === 0 || term)) tone += lift;
    }
    l.set(x, y, R[clamp(tone, 0, R.length - 1)]);
  }
  // Glanzpunkt an der linken Schulterecke
  const sx = bx + ax * sh * len - nx * (hw - 1.2), sy = by + ay * sh * len - ny * (hw - 1.2);
  if (hw >= 2 && sy < clipY) l.set(sx, sy, glass ? WHITE : R[R.length - 1]);
}
/** Kleiner Lichtstern mit weichem Rand (für Glanz-Frames). */
export function twinkle(p: Px, x: number, y: number, c: number, big = false): void {
  x = Math.round(x); y = Math.round(y);
  p.set(x, y, WHITE);
  for (const [i, j] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) p.set(x + i, y + j, mix(c, WHITE, 0.45));
  if (big) for (const [i, j] of [[2, 0], [-2, 0], [0, 2], [0, -2]] as const) p.blend(x + i, y + j, alpha(c, 190));
}

// ---------------------------------------------------------------- Tropfstein
export interface StalagOpts { lean?: number; seed?: number; /** Anzahl Sinterlagen */ rings?: number; /** 0..1 Nässeglanz */ wet?: number; blunt?: number }
/**
 * Stalagmit: Kegel aus übereinander getropften Sinterlagen (jede Lage hängt unten leicht über), als Zylinder von links
 * beleuchtet, mit Schattenfuge unter jeder Lage, Rinnsal-Streifen und Nässeglanz. Fuß bei (cx, by), Höhe h, Fußbreite w.
 */
export function stalag(l: Px, cx: number, by: number, h: number, w: number, R: Ramp = SINTER, o: StalagOpts = {}): void {
  const seed = o.seed ?? 1, rings = o.rings ?? Math.max(2, Math.round(h / 6)), lean = o.lean ?? 0, wet = o.wet ?? 0.6, blunt = o.blunt ?? 0;
  for (let y = by - 1; y >= by - h; y--) {
    const t = (by - 1 - y) / Math.max(1, h - 1);
    const seg = t * rings + rnd2(0, 1, seed) * 0.6, k = Math.floor(seg), fr = seg - k;       // fr: 0 = Unterkante der Lage
    const cone = Math.pow(1 - t, 0.82) * (1 - blunt) + blunt * (t < 0.92 ? 1 : (1 - t) / 0.08);
    let hw = (w / 2) * cone * (0.86 + 0.16 * (1 - fr) + (rnd2(k, 2, seed) - 0.5) * 0.12) + 0.45;
    if (t < 0.1) hw += ((0.1 - t) / 0.1) * w * 0.1;                                            // Fußverbreiterung
    const xc = cx + lean * t * h + Math.sin(t * 4.3 + seed) * Math.min(1, w * 0.08) * (1 - t);
    const xa = Math.round(xc - hw), xb = Math.round(xc + hw) - 1, n = xb - xa + 1;
    for (let x = xa; x <= Math.max(xa, xb); x++) {
      const u = n <= 1 ? 0 : ((x - xa + 0.5) / n) * 2 - 1;
      let tone = n <= 1 ? 3 : n === 2 ? (x === xa ? 4 : 1) : n === 3 ? [4, 2, 1][x - xa] : u < -0.62 ? 4 : u < -0.12 ? 3 : u < 0.38 ? 2 : u < 0.74 ? 1 : 0;
      if (n > 3) {
        if (fr > 0.84 && t < 0.95) tone -= 1;                                                  // Schattenfuge unter der überhängenden Lage
        else if (fr < 0.3 && u < 0.1) tone += u < -0.7 ? 0 : 1;                                // Wulst fängt Licht
        const col = rnd2(x - Math.round(cx), k >> 1, seed + 3);
        if (col > 0.84 && fr > 0.2) tone -= 1; else if (col < 0.1 && u < 0.3 && fr < 0.7) tone += 1;   // Rinnsale
        if (wet && u < 0.05 && rnd2(x, y, seed + 7) < 0.05 * wet && fr < 0.5) tone = 5;        // Nässeglanz
      }
      l.set(x, y, R[clamp(tone, 0, R.length - 1)]);
    }
  }
  l.set(Math.round(cx + lean * h), by - h, R[4]);
}

// ---------------------------------------------------------------- Adern & Risse
/**
 * Glühende Ader entlang einer Punktliste: heller Kern, dunkelrote Flanken (nur auf deckenden Pixeln). heat 0..1
 * verschiebt den Kern von Glutrot nach Weißgelb. HOT = 6 Töne dunkelrot → weißgelb.
 */
export function vein(p: Px, path: ReadonlyArray<Pt>, HOT: Ramp, heat = 0.6, seed = 1, flank = true): void {
  const pts = resample(path);
  const solid = (x: number, y: number): boolean => p.get(x, y) >>> 24 >= 200;
  if (flank) for (const [x, y] of pts) for (const [i, j] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const X = Math.floor(x) + i, Y = Math.floor(y) + j;
    if (solid(X, Y)) p.set(X, Y, mix(p.get(X, Y), HOT[1], 0.42 + heat * 0.2));
  }
  pts.forEach(([x, y], i) => {
    if (!solid(Math.floor(x), Math.floor(y))) return;
    const r = rnd2(i >> 1, 3, seed), lv = 2 + heat * 2.2 + (r > 0.7 ? 1 : r < 0.25 ? -1 : 0);
    p.set(x, y, HOT[clamp(Math.round(lv), 1, HOT.length - 1)]);
  });
}
/** Zickzack-Pfad von a nach b (deterministisch gezackt) – für Risse, Adern, Blitze. */
export function jag(a: Pt, b: Pt, amp: number, seed: number, step = 3): Pt[] {
  const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)), dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
  const out: Pt[] = [a];
  for (let i = 1; i < n; i++) { const t = i / n, o = (rnd2(i, 5, seed) - 0.5) * 2 * amp; out.push([a[0] + dx * t - (dy / len) * o, a[1] + dy * t + (dx / len) * o]); }
  out.push(b);
  return out;
}
/** Weicher Rauch-/Dampftupfer (Alpha, kantig gestuft). */
export function puff(p: Px, cx: number, cy: number, r: number, c: number, a: number): void {
  for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
    if (d < 1 && p.get(x, y) >>> 24 < 200) p.blend(x, y, alpha(c, Math.round(a * (d < 0.55 ? 1 : 0.55))));
  }
}
