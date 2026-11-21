/**
 * Kristallhöhlen – Wasser des unterirdischen Sees: 8 Frames à 64×64, nahtlos kachelbar, als Schleife.
 * Dunkles Petrol, fast still; langsam atmende Kaustik-Lichtnetze, einzelne Glanzpunkte und ab und zu ein Tropfenring.
 * Die Zeit geht nur als ganzzahliges Vielfaches der Phase in periodische Funktionen ein.
 */
import { P, WHITE, hash2, mix } from '../palette';
import { Px } from '../draw';

const N = 64, FR = 8, TAU = Math.PI * 2;
const T = P.teal;
const W_BASE = mix(mix(T[1], T[2], 0.3), P.blue[0], 0.22);
const W_DEEP = mix(mix(T[0], T[1], 0.6), P.blue[0], 0.3);
const W_MID = mix(W_BASE, W_DEEP, 0.5);
const W_NET = mix(mix(T[1], T[2], 0.75), P.blue[2], 0.12);
const W_NET2 = mix(T[2], T[3], 0.45);
const W_GLINT = mix(T[4], WHITE, 0.4);

export function kristallLiquid(): Px[] {
  const out: Px[] = [];
  const wrap = (v: number): number => ((Math.round(v) % N) + N) % N;
  for (let f = 0; f < FR; f++) {
    const p = new Px(N, N), ph = (f / FR) * TAU;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = (x / N) * TAU, v = (y / N) * TAU;
      // träge Tiefenflecken
      const s = Math.sin(u + 1.1 * Math.sin(v) + 0.25 * Math.sin(v + ph)) + Math.sin(2 * v - u + 0.8 * Math.sin(2 * u) + 0.3 * Math.sin(u - ph));
      // Kaustik: Nulllinien zweier verzerrter Wellenfelder bilden ein Netz
      const a = Math.sin(3 * u + 1.5 * Math.sin(2 * v + 0.5 * Math.sin(u + ph)) + 0.5 * Math.sin(v - ph)) + 0.6 * Math.sin(2 * v + u + 0.6 * Math.sin(ph + 2 * u));
      const b = Math.sin(3 * v + 1.4 * Math.sin(2 * u - 0.5 * Math.sin(v + ph)) + 0.5 * Math.sin(u + ph)) + 0.6 * Math.sin(2 * u - v + 0.6 * Math.sin(ph - 2 * v));
      const na = Math.abs(a), nb = Math.abs(b), m = na < nb ? na : nb;
      let col = s < -1.1 ? W_DEEP : s < -0.3 ? W_MID : W_BASE;
      if (s > -0.9) {
        if (na < 0.16 && nb < 0.16) col = W_NET2;
        else if (m < 0.075) col = s > 0.5 ? W_NET2 : W_NET;
        else if (m < 0.17 && s > 0.2) col = W_NET;
      }
      p.d[y * N + x] = col;
    }
    // Glanzpunkte
    for (let k = 0; k < 7; k++) {
      const h = hash2(k, 57, 2911), life = (f + (h % FR)) % FR, x = (h >>> 6) % N, y = (h >>> 14) % N;
      if (life === 0 || life === 2) p.set(x, y, W_NET2);
      else if (life === 1) { p.set(x, y, W_GLINT); p.set(wrap(x - 1), y, W_NET2); p.set(wrap(x + 1), y, W_NET2); }
    }
    // Tropfenringe: wachsen über 6 Frames und verlaufen
    for (let k = 0; k < 2; k++) {
      const h = hash2(k, 91, 2917), life = (f + k * 4) % FR, cx = (h >>> 5) % N, cy = (h >>> 13) % N;
      if (life > 5) continue;
      const r = 1 + life * 1.3, col = life < 2 ? W_GLINT : life < 4 ? W_NET2 : W_NET;
      for (let t = 0; t < 40; t++) {
        const an = (t / 40) * TAU;
        if (life >= 4 && (t & 1)) continue;
        p.set(wrap(cx + Math.cos(an) * r), wrap(cy + Math.sin(an) * r * 0.6), col);
      }
      if (life === 0) p.set(cx, cy, WHITE);
    }
    out.push(p);
  }
  return out;
}
