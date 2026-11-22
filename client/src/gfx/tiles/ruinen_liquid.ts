/**
 * Verlorene Ruinen – animiertes Beckenwasser: 8 Frames à 64×64, in beide Richtungen nahtlos kachelbar, als Schleife.
 * Trübes Jadegrün mit träge wandernden Lichtnetzen (Kaustik), dunkleren Tiefen und treibenden Wasserlinsen-Teppichen,
 * die auf einer kleinen geschlossenen Bahn pendeln.
 * Schleife: Die Zeit geht nur als ganzzahliges Vielfaches der Phase in periodische Funktionen ein.
 */
import { P, hash2, mix } from '../palette';
import { Px } from '../draw';

const N = 64, FR = 8, TAU = Math.PI * 2;
const J_BASE = mix(mix(P.teal[2], P.forest[2], 0.5), P.sand[1], 0.22);
const J_DEEP = mix(J_BASE, mix(P.teal[0], P.forest[0], 0.5), 0.55);
const J_MID = mix(J_BASE, J_DEEP, 0.5);
const J_LIGHT = mix(J_BASE, mix(P.teal[3], P.sand[3], 0.4), 0.38);
const J_PALE = mix(J_BASE, mix(P.teal[4], P.sand[4], 0.5), 0.55);
const DW = [mix(P.green[2], P.forest[2], 0.4), mix(P.green[3], P.sand[3], 0.25), mix(P.green[4], P.sand[4], 0.3)];

export function ruinenLiquid(): Px[] {
  const out: Px[] = [];
  const wrap = (v: number): number => ((Math.round(v) % N) + N) % N;
  for (let f = 0; f < FR; f++) {
    const p = new Px(N, N), ph = (f / FR) * TAU;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = (x / N) * TAU, v = (y / N) * TAU;
      // träge Tiefenflecken
      const s = Math.sin(u + 1.3 * Math.sin(v) + 0.3 * Math.sin(v + ph)) + Math.sin(v - 2 * u + 0.9 * Math.sin(2 * v) + 0.3 * Math.sin(u - ph)) + 0.5 * Math.sin(2 * u + 2 * v + Math.sin(u) + 0.35 * Math.sin(v + ph));
      // Lichtnetz: Nullstellen zweier verschränkter Wellen ergeben dünne, wandernde Linien
      const a = Math.sin(2 * u + 1.4 * Math.sin(v + 0.5 * Math.sin(ph)) + 0.5 * Math.sin(2 * v - ph)), b = Math.sin(2 * v + 1.4 * Math.sin(u - 0.5 * Math.cos(ph)) + 0.5 * Math.sin(2 * u + ph));
      const net = Math.abs(a * b);
      let col = s < -1.45 ? J_DEEP : s < -0.7 ? J_MID : J_BASE;
      if (net < 0.035 && s > -0.7) col = s > 0.9 ? J_PALE : J_LIGHT;
      else if (s > 1.7) col = J_LIGHT;
      p.d[y * N + x] = col;
    }
    // Wasserlinsen: lockere Teppiche aus winzigen Blättchen
    for (let k = 0; k < 7; k++) {
      const h = hash2(k, 19, 5301), cx = (h % N) + 1.4 * Math.sin(ph + k * 1.9), cy = ((h >>> 8) % N) + 1.1 * Math.cos(ph + k * 1.1), n = 5 + ((h >>> 16) % 9), rad = 3 + ((h >>> 22) % 5);
      for (let j = 0; j < n; j++) {
        const hj = hash2(k, j, 5302), dx = ((hj % 100) / 50 - 1) * rad, dy = (((hj >>> 8) % 100) / 50 - 1) * rad * 0.7;
        const x = wrap(cx + dx), y = wrap(cy + dy), tone = (hj >>> 16) % 4;
        p.set(x, y, tone === 0 ? DW[2] : DW[1]);
        if ((hj >>> 20) & 1) p.set(wrap(x + 1), y, DW[tone === 1 ? 2 : 1]);
        p.set(x, wrap(y + 1), tone > 1 ? J_DEEP : DW[0]);
      }
    }
    // einzelne Blättchen und seltene Glanzpunkte
    for (let k = 0; k < 14; k++) {
      const h = hash2(k, 43, 5310), life = (f + (h % FR)) % FR, x = (h >>> 5) % N, y = (h >>> 12) % N;
      if (k < 9) p.set(wrap(x + (life >> 2)), y, DW[1]);
      else if (life === 0 || life === 2) p.set(x, y, J_PALE);
      else if (life === 1) { p.set(x, y, mix(J_PALE, P.cream[4], 0.5)); p.set(wrap(x - 1), y, J_PALE); p.set(wrap(x + 1), y, J_PALE); }
    }
    out.push(p);
  }
  return out;
}
