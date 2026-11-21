/**
 * Glutlande – Lava: 8 Frames à 64×64, nahtlos kachelbar, als Schleife.
 * Träger Strom: hellgelb-orange Rinnen zwischen treibenden dunklen Krustenschollen, die aufreißen und wieder
 * zusammenwachsen; gelegentlich eine Blase. Große zusammenhängende Formen (Wellenzahlen 1–3), kein Rauschen.
 * Die Zeit geht nur als ganzzahliges Vielfaches der Phase in periodische Funktionen ein.
 */
import { P, hash2, mix } from '../palette';
import { Px } from '../draw';

const N = 64, FR = 8, TAU = Math.PI * 2;
const F = P.fire, A = P.ash;
const C_TOP = mix(A[2], P.red[0], 0.2), C_MID = mix(A[1], P.red[0], 0.25), C_DARK = mix(A[0], P.red[0], 0.2);
const C_RIM = mix(P.red[1], F[0], 0.4), C_CRACK = mix(P.red[1], F[1], 0.5);
const L0 = F[1], L1 = mix(F[1], F[2], 0.6), L2 = mix(F[2], F[3], 0.5), L3 = F[3], L4 = mix(F[3], F[4], 0.6);

export function glutLiquid(): Px[] {
  const out: Px[] = [];
  const wrap = (v: number): number => ((Math.round(v) % N) + N) % N;
  for (let f = 0; f < FR; f++) {
    const p = new Px(N, N), ph = (f / FR) * TAU;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = (x / N) * TAU, v = (y / N) * TAU;
      // Schollenfeld: zwei ruhende, verzerrte Wellen + eine langsam durchziehende
      const s = Math.sin(2 * u + 1.2 * Math.sin(v + 0.45 * Math.sin(u + ph)) + 0.8 * Math.sin(2 * v)) + Math.sin(3 * v - u + 0.9 * Math.sin(2 * u) + 0.5 * Math.sin(v - ph))
        + 0.62 * Math.sin(2 * u + 2 * v - ph + 1.0 * Math.sin(v + 2 * u)) + 0.34 * Math.sin(4 * v - 3 * u + ph);
      // Feinstruktur: Risse in den Schollen, Schlieren in den Rinnen
      const r = Math.sin(5 * u - 3 * v + 1.5 * Math.sin(u + 2 * v) + ph) + 0.6 * Math.sin(6 * v + 2 * u - ph + Math.sin(3 * u));
      let col: number;
      if (s > 0.42) {
        if (Math.abs(r) < 0.1 && s < 1.5) col = C_CRACK;
        else col = s > 1.35 ? (r > 0.3 ? C_TOP : C_MID) : r > 0.9 ? C_MID : s > 0.6 ? C_DARK : C_MID;
      }
      else if (s > 0.24) col = C_RIM;
      else if (s > 0.05) col = L0;
      else if (s > -0.55) col = r > 1.05 ? L2 : L1;
      else if (s > -1.3) col = r > 0.9 ? L3 : L2;
      else col = r > 0.6 ? L4 : L3;
      p.d[y * N + x] = col;
    }
    // Blasen: wölben sich auf und zerplatzen zu ein paar Funken
    for (let k = 0; k < 2; k++) {
      const h = hash2(k, 77, 3907), life = (f + k * 4) % FR, cx = (h >>> 5) % N, cy = (h >>> 13) % N;
      if (life > 3) continue;
      if (life < 3) {
        const rr = 0.8 + life * 0.7;
        for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const d = Math.hypot(i, j * 1.2); if (d <= rr) p.set(wrap(cx + i), wrap(cy + j), i + j < -rr * 0.5 ? L4 : d > rr - 1 ? L1 : L3); }
      } else for (let t = 0; t < 5; t++) { const an = (t / 5) * TAU + k; p.set(wrap(cx + Math.cos(an) * 3), wrap(cy + Math.sin(an) * 2.2), L4); }
    }
    out.push(p);
  }
  return out;
}
