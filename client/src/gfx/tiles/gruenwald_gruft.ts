/** Grünwald-Dungeon „Wurzelgruft“ (Platzhalter – wird ersetzt). */
import { P } from '../palette';
import { Chunk, FLOOR, WALL } from './core';
export function paintGruft(c: Chunk): void {
  for (let y = c.iy0; y < c.iy1; y++) for (let x = c.ix0; x < c.ix1; x++) {
    const t = c.tile((c.x0 + x) >> 4, (c.y0 + y) >> 4);
    c.buf[y * c.W + x] = t === FLOOR ? P.stone[2] : t === WALL ? P.stone[1] : t === 6 ? 0 : P.stone[0];
  }
}
