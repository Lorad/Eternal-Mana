/**
 * Grünwald – animiertes Bach-/Teichwasser: 8 Frames à 64×64, in beide Richtungen nahtlos kachelbar, als Schleife.
 * Türkis mit dunkleren, blaugrünen Tiefenflecken, wandernden hellen Wellenbögen und einzelnen Glanzpunkten.
 * Schleife: Die Zeit geht nur als ganzzahliges Vielfaches der Phase in periodische Funktionen ein; Wellenbögen haben
 * einen Lebenszyklus von genau 8 Frames (entstehen → wandern → zerfallen) mit versetztem Start.
 */
import { P, WHITE, hash2, mix } from '../palette';
import { Px } from '../draw';

const N = 64, FR = 8, TAU = Math.PI * 2;
const T = P.teal;
const W_BASE = mix(T[2], T[3], 0.55);
const W_MID = mix(mix(T[2], T[3], 0.25), P.blue[2], 0.1);
const W_DEEP = mix(mix(T[1], T[2], 0.7), P.blue[2], 0.22);
const W_LIGHT = mix(T[3], T[4], 0.12);
const W_PALE = mix(T[3], T[4], 0.55);
const W_ARC = mix(T[4], WHITE, 0.4);

export function gruenwaldLiquid(): Px[] {
  const out: Px[] = [];
  const wrap = (v: number): number => ((Math.round(v) % N) + N) % N;
  for (let f = 0; f < FR; f++) {
    const p = new Px(N, N), ph = (f / FR) * TAU;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = (x / N) * TAU, v = (y / N) * TAU;
      // große, träge atmende Tiefenflecken
      const s = Math.sin(u + 1.25 * Math.sin(v + ph)) + Math.sin(2 * v - u + 0.9 * Math.sin(2 * u - ph)) + 0.55 * Math.sin(2 * u + v + Math.sin(v - ph) * 1.1);
      // feine Querwellen, die stromab laufen
      const r = Math.sin(3 * v + 2 * Math.sin(u + ph) + ph) + 0.5 * Math.sin(5 * v - 2 * u - ph);
      let col = s < -1.45 ? W_DEEP : s < -0.75 ? W_MID : s > 1.5 ? W_LIGHT : W_BASE;
      if (r > 1.32 && s > -0.75) col = s > 0.6 ? W_PALE : W_LIGHT;
      else if (r < -1.38 && s < 1) col = s < -0.75 ? W_DEEP : W_MID;
      p.d[y * N + x] = col;
    }
    // Wellenbögen
    for (let a = 0; a < 11; a++) {
      const h = hash2(a, 31, 907), life = (f + (h % FR)) % FR;
      if (life === 7) continue;
      const hw = 2 + ((h >>> 8) % 3), cx = ((h >>> 12) % N) + life * 0.5, cy = ((h >>> 18) % N) + life * 1.25, up = (h >>> 25) & 1 ? 1 : -1;
      const grow = life === 0 ? hw - 2 : life === 1 ? hw - 1 : hw;
      const col = life < 2 ? W_PALE : life < 5 ? W_ARC : life === 5 ? W_PALE : W_LIGHT;
      for (let dx = -grow; dx <= grow; dx++) {
        if (life === 6 && (dx & 1)) continue;
        const dy = Math.round(up * (dx * dx) / (hw * 1.6));
        p.set(wrap(cx + dx), wrap(cy + dy), col);
        if (life >= 2 && life <= 4 && Math.abs(dx) < grow) p.set(wrap(cx + dx), wrap(cy + dy + 1), W_MID);
      }
    }
    // Glanzpunkte
    for (let k = 0; k < 6; k++) {
      const h = hash2(k, 57, 911), life = (f + (h % FR)) % FR, x = (h >>> 6) % N, y = (h >>> 14) % N;
      if (life === 0 || life === 2) p.set(x, y, life === 0 ? W_ARC : W_PALE);
      else if (life === 1) { p.set(x, y, WHITE); p.set(wrap(x - 1), y, W_ARC); p.set(wrap(x + 1), y, W_ARC); p.set(x, wrap(y - 1), W_ARC); p.set(x, wrap(y + 1), W_ARC); }
    }
    out.push(p);
  }
  return out;
}
