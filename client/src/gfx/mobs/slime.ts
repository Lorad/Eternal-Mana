/** Schleim-Rig: Kuppelkörper mit Stauchen/Strecken, Hüpfzyklus und Stimmung. Körperprofil je Art. */
import { Px } from '../draw';
import type { Pt } from '../draw';
import type { Ramp } from '../palette';
import { clamp } from './kit';
import type { Fr } from './kit';

export type Mood = 'n' | 'blink' | 'angry' | 'open' | 'shut' | 'dead';
export interface SlimeState { sq: number; lift: number; dx: number; lean: number; grow: number; mood: Mood; lag: number }
export interface SlimeGeo { cx: number; gy: number; rx: number; H: number; lean: number; top: number; at(u: number, v: number): Pt }
export type Profile = (v: number) => number;

/** Standard-Bewegungsablauf aller Schleime (Tod: nur Frame 0, der Rest ist artspezifisch). */
export function slimeState(fr: Fr): SlimeState {
  const z: SlimeState = { sq: 0, lift: 0, dx: 0, lean: 0, grow: 1, mood: 'n', lag: 0 };
  const i = fr.i;
  switch (fr.a) {
    case 'idle': z.sq = [0, 0.08, 0, -0.08][i]; z.lag = [0, 1, 0, -1][i]; if (i === 1) z.mood = 'blink'; break;
    case 'move': z.sq = [0.26, -0.2, -0.14, 0, -0.12, 0.32][i]; z.lift = [0, 1, 4, 5, 3, 0][i]; z.lean = [0, 2, 1.5, 0, -1, 0][i]; z.lag = [1, -2, -1, 0, 2, 2][i]; break;
    case 'windup': z.sq = [0.34, -0.1][i]; z.lean = [-3, -2][i]; z.dx = [-1, -2][i]; z.grow = [1, 1.16][i]; z.mood = 'angry'; z.lag = [-2, -1][i]; break;
    case 'attack': z.sq = [-0.28, 0.28, 0.06][i]; z.dx = [4, 5, 2][i]; z.lift = [3, 0, 0][i]; z.lean = [4, 1, 0][i]; z.mood = i < 2 ? 'open' : 'angry'; z.lag = [-3, 2, 1][i]; break;
    case 'hit': z.sq = [0.32, -0.1][i]; z.dx = [-2, -1][i]; z.lean = [-3, -1][i]; z.mood = 'shut'; z.lag = [3, 1][i]; break;
    case 'death': z.sq = 0.44; z.mood = 'dead'; z.dx = -1; z.lag = 2; break;
  }
  return z;
}
export function slimeGeo(w: number, h: number, rx0: number, H0: number, st: SlimeState, prof: Profile): SlimeGeo {
  const rx = rx0 * (1 + st.sq) * st.grow, H = H0 * (1 - st.sq * 0.85) * st.grow;
  const cx = w / 2 + st.dx, gy = h - 5 - st.lift, lean = st.lean;
  return { cx, gy, rx, H, lean, top: gy - H + 1, at: (u, v) => [cx + lean * v + u * rx * prof(v), gy - v * H + 0.5] };
}
/** Füllt den Körper zeilenweise nach Profil, schattiert wie Px.ball (Licht oben links). */
export function slimeBody(l: Px, g: SlimeGeo, r: Ramp, lo: number, hi: number, prof: Profile, bias = 0): void {
  const n = hi - lo + 1;
  for (let k = 0; k < Math.ceil(g.H); k++) {
    const y = g.gy - k, v = (k + 0.5) / g.H; if (v > 1) break;
    const hw = g.rx * prof(v), xc = g.cx + g.lean * v;
    for (let x = Math.floor(xc - hw); x <= Math.ceil(xc + hw); x++) {
      const dxn = x + 0.5 - xc; if (Math.abs(dxn) > hw) continue;
      const nx = dxn / g.rx, ny = 1 - 2 * v;
      const t = 0.56 - (nx * 0.42 + ny * 0.58) * 0.62 - (nx * nx + ny * ny) * 0.12 + bias;
      l.set(x, y, r[lo + Math.floor(clamp(t, 0, 0.999) * n)]);
    }
  }
}
