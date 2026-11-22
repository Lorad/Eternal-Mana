/**
 * Schattenreich – Rechenhelfer: Scherben-Voronoi mit Zell-Cache und punktgenaue Kachel-Abdeckung.
 *
 * Das Schattenreich besteht aus SCHERBEN (Bodenplatten, Trittsteine, Kristallprismen). Damit Kanten von Weg, Leere und
 * Wand entlang ganzer Scherben verlaufen statt entlang weicher Rauschlinien, wird die Zugehörigkeit je Voronoi-Zelle am
 * Zellkern entschieden: `coverAt()` wertet dieselbe B-Spline-Abdeckung wie `Chunk.cover` an einem beliebigen Weltpixel
 * aus – eine reine Funktion der Weltkoordinaten, also in jedem Chunk gleich (auch am Pufferrand).
 */
import { hash2 } from '../palette';
import { tileAt } from './core';
import type { PaintableMap } from '../spec';

/** Jittered-Grid-Voronoi mit Cache der 3×3 Zellkerne (Pixel laufen zeilenweise, die Gitterzelle wechselt selten). */
export class Vor {
  /** Hash der nächsten Zelle */
  id = 0;
  /** Abstand zur Zellkante in px (senkrecht zur Mittelsenkrechten zum zweitnächsten Kern) */
  e = 0;
  /** Versatz zum Zellkern */
  dx = 0; dy = 0;
  /** Weltposition des Zellkerns */
  px = 0; py = 0;
  /** Gitterkoordinaten der Zelle (eindeutiger Schlüssel) */
  cx = 0; cy = 0;
  /** Lichtseite der nächsten Kante: 1 = zeigt nach oben links (hell), -1 = unten rechts (dunkel), 0 = seitlich */
  lit = 0;
  private gx = NaN; private gy = NaN; private sd = NaN;
  private xs = new Float64Array(9); private ys = new Float64Array(9); private ids = new Uint32Array(9);
  constructor(readonly sx: number, readonly sy: number) {}

  at(x: number, y: number, seed: number): void {
    const { sx, sy, xs, ys } = this, gx = Math.floor(x / sx), gy = Math.floor(y / sy);
    if (gx !== this.gx || gy !== this.gy || seed !== this.sd) {
      this.gx = gx; this.gy = gy; this.sd = seed;
      for (let j = 0, k = 0; j < 3; j++) for (let i = 0; i < 3; i++, k++) {
        const h = hash2(gx + i - 1, gy + j - 1, seed);
        this.ids[k] = h;
        xs[k] = (gx + i - 1 + 0.15 + ((h & 255) / 255) * 0.7) * sx; ys[k] = (gy + j - 1 + 0.15 + (((h >>> 8) & 255) / 255) * 0.7) * sy;
      }
    }
    let d1 = 1e18, d2 = 1e18, k1 = 0, k2 = 0;
    for (let k = 0; k < 9; k++) {
      const dx = x - xs[k], dy = y - ys[k], dd = dx * dx + dy * dy;
      if (dd < d1) { d2 = d1; k2 = k1; d1 = dd; k1 = k; } else if (dd < d2) { d2 = dd; k2 = k; }
    }
    const nx = xs[k2] - xs[k1], ny = ys[k2] - ys[k1], nl = Math.sqrt(nx * nx + ny * ny) || 1;
    this.id = this.ids[k1]; this.px = xs[k1]; this.py = ys[k1]; this.dx = x - xs[k1]; this.dy = y - ys[k1];
    this.e = (d2 - d1) / (2 * nl);
    this.cx = gx + (k1 % 3) - 1; this.cy = gy + ((k1 / 3) | 0) - 1;
    const l = (nx * -0.55 + ny * -0.83) / nl;
    this.lit = l > 0.22 ? 1 : l < -0.22 ? -1 : 0;
  }
  /** Schlüssel der aktuellen Zelle für Caches. */
  key(): number { return (this.cx + 32768) * 65536 + (this.cy + 32768); }
}

/** Abdeckung der Kachelmenge `l` am Weltpixel (wx, wy) – identisch zu Chunk.cover, aber überall auswertbar. */
export function coverAt(map: PaintableMap, l: Uint8Array, wx: number, wy: number): number {
  const cx = wx >> 4, cy = wy >> 4, tx = ((wx & 15) + 0.5) / 16 - 0.5, ty = ((wy & 15) + 0.5) / 16 - 0.5;
  const ax = 0.5 * (0.5 - tx) * (0.5 - tx), bx = 0.75 - tx * tx, ex = 0.5 * (0.5 + tx) * (0.5 + tx);
  const ay = 0.5 * (0.5 - ty) * (0.5 - ty), by = 0.75 - ty * ty, ey = 0.5 * (0.5 + ty) * (0.5 + ty);
  const r = (y: number): number => ax * l[tileAt(map, cx - 1, y)] + bx * l[tileAt(map, cx, y)] + ex * l[tileAt(map, cx + 1, y)];
  return ay * r(cy - 1) + by * r(cy) + ey * r(cy + 1);
}

/** Abdeckung am Kern der aktuellen Voronoi-Zelle (+ fester Zufallsversatz je Zelle), je Chunk gecacht. */
export function seedCover(v: Vor, cache: Map<number, number>, map: PaintableMap, l: Uint8Array, jit: number): number {
  const k = v.key();
  let s = cache.get(k);
  if (s === undefined) {
    s = coverAt(map, l, Math.floor(v.px), Math.floor(v.py)) + (((v.id >>> 16) & 255) / 255 - 0.5) * jit;
    cache.set(k, s);
  }
  return s;
}

/** 4×4-Bayer-Schwelle 0..1 (für sich auflösende Muster). */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function bayer(wx: number, wy: number): number { return (BAYER[(wy & 3) * 4 + (wx & 3)] + 0.5) / 16; }
