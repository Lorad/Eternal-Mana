/**
 * Bodenmaler – Einstiegspunkt. Verteilt auf die Biom-Maler (v2, siehe core.ts) bzw. auf den alten v1-Maler (legacy.ts)
 * für Biome, die noch nicht neu gestaltet sind.
 *
 * Neues Biom anschließen: tiles/<biom>.ts nach dem Muster von gruenwald.ts schreiben und unten in PAINTERS eintragen.
 */
import type { BiomeId } from '../../../../shared/src/maps/tiles';
import type { PaintableMap } from '../spec';
import { Chunk, TS, type BiomePainter } from './core';
import { gruenwald } from './gruenwald';
import { kristall } from './kristall';
import { glut } from './glut';
import { buildLiquidsLegacy, paintGroundLegacy } from './legacy';

const PAINTERS: Partial<Record<BiomeId, BiomePainter>> = {
  gruenwald,
  kristall,
  glut,
};

const CH = 32;
let scratch: HTMLCanvasElement | null = null;

/**
 * Malt die Bodenebene der Kacheln tx0..tx1-1 × ty0..ty1-1 (16 px je Kachel, Ursprung = Kachel (0,0) bei Pixel (0,0);
 * der Kontext darf verschoben sein). Deterministisch und nahtlos – beliebige Aufteilung in Teilaufrufe ergibt
 * dasselbe Bild.
 */
export function paintGround(ctx: CanvasRenderingContext2D, map: PaintableMap, tx0: number, ty0: number, tx1: number, ty1: number): void {
  const painter = PAINTERS[map.biome];
  if (!painter) { paintGroundLegacy(ctx, map, tx0, ty0, tx1, ty1); return; }
  tx0 = Math.max(0, Math.floor(tx0)); ty0 = Math.max(0, Math.floor(ty0)); tx1 = Math.min(map.w, Math.ceil(tx1)); ty1 = Math.min(map.h, Math.ceil(ty1));
  if (tx1 <= tx0 || ty1 <= ty0) return;
  if (!scratch) { scratch = document.createElement('canvas'); scratch.width = CH * TS; scratch.height = CH * TS; }
  const sctx = scratch.getContext('2d')!;
  const smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  for (let cy = ty0; cy < ty1; cy += CH) for (let cx = tx0; cx < tx1; cx += CH) {
    const x1 = Math.min(tx1, cx + CH), y1 = Math.min(ty1, cy + CH);
    const c = new Chunk(map, cx, cy, x1, y1);
    painter.paint(c);
    const w = c.ix1 - c.ix0, h = c.iy1 - c.iy0;
    const img = new ImageData(w, h), out = new Uint32Array(img.data.buffer);
    for (let y = 0; y < h; y++) out.set(c.buf.subarray((c.iy0 + y) * c.W + c.ix0, (c.iy0 + y) * c.W + c.ix1), y * w);
    sctx.clearRect(0, 0, w, h);
    sctx.putImageData(img, 0, 0);
    ctx.clearRect(cx * TS, cy * TS, w, h);
    ctx.drawImage(scratch, 0, 0, w, h, cx * TS, cy * TS, w, h);
  }
  ctx.imageSmoothingEnabled = smooth;
}

/** Animierte Flüssigkeiten je Biom: v2-Biome 8 nahtlose 64×64-Frames, übrige die v1-Frames (4 × 32×32). */
export function buildLiquids(): Record<BiomeId, HTMLCanvasElement[]> {
  const out = buildLiquidsLegacy();
  for (const b in PAINTERS) {
    const p = PAINTERS[b as BiomeId];
    if (p?.liquid) out[b as BiomeId] = p.liquid().map((f) => f.toCanvas());
  }
  return out;
}

export type { BiomePainter } from './core';
