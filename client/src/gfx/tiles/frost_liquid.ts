/**
 * Frostgebirge – animiertes Eiswasser: 8 Frames à 64×64, in beide Richtungen nahtlos kachelbar, als Schleife.
 * Dunkles, kaltes Blau mit träge atmenden Tiefenflecken; darauf treiben kantige, blasse Eisschollen (sie pendeln um
 * 1–2 px auf einer geschlossenen Bahn), dazwischen Eisbrei und seltene, langsame Glanzpunkte.
 * Schleife: Die Zeit geht nur als ganzzahliges Vielfaches der Phase in periodische Funktionen ein.
 */
import { P, WHITE, hash2, mix } from '../palette';
import { Px } from '../draw';

const N = 64, FR = 8, TAU = Math.PI * 2;
const IC = P.ice;
const W_BASE = mix(mix(P.blue[1], P.teal[1], 0.45), P.steel[1], 0.2);
const W_DEEP = mix(W_BASE, mix(P.blue[0], P.teal[0], 0.3), 0.62);
const W_MID = mix(W_BASE, W_DEEP, 0.5);
const W_LIGHT = mix(W_BASE, IC[1], 0.32);
const W_PALE = mix(W_BASE, IC[2], 0.55);
const F_TOP = mix(IC[4], WHITE, 0.5), F_MID = IC[3], F_LOW = IC[2], F_SUB = mix(W_BASE, IC[2], 0.4);

export function frostLiquid(): Px[] {
  const out: Px[] = [];
  const wrap = (v: number): number => ((Math.round(v) % N) + N) % N;
  const mask = new Uint8Array(N * N);
  for (let f = 0; f < FR; f++) {
    const p = new Px(N, N), ph = (f / FR) * TAU;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = (x / N) * TAU, v = (y / N) * TAU;
      // große, träge Tiefenflecken und flache, lange Dünung
      const s = Math.sin(u + 1.1 * Math.sin(v) + 0.3 * Math.sin(v + ph)) + Math.sin(2 * v - u + 0.8 * Math.sin(2 * u) + 0.3 * Math.sin(u - ph)) + 0.5 * Math.sin(2 * u + v + Math.sin(v) + 0.35 * Math.sin(u + v + ph));
      const r = Math.sin(4 * v + 1.6 * Math.sin(u) + 0.5 * Math.sin(2 * u + ph)) + 0.45 * Math.sin(6 * v - u + ph);
      let col = s < -1.4 ? W_DEEP : s < -0.6 ? W_MID : s > 1.65 ? W_LIGHT : W_BASE;
      if (r > 1.36 && s > -0.6) col = W_LIGHT;
      else if (r < -1.38 && s < 1) col = s < -0.6 ? W_DEEP : W_MID;
      p.d[y * N + x] = col;
    }
    // Eisschollen: Schnitt dreier Streifen = kantiges Sechseck; jede pendelt auf einer kleinen Kreisbahn
    mask.fill(0);
    for (let k = 0; k < 9; k++) {
      const h = hash2(k, 17, 4201), h2 = hash2(k, 23, 4202);
      const cx = (h % N) + 1.6 * Math.sin(ph + k * 1.3), cy = ((h >>> 8) % N) + 1.2 * Math.cos(ph + k * 2.1);
      const r1 = 1.6 + ((h >>> 16) % 40) / 10, r2 = 1.3 + ((h >>> 22) % 30) / 10, r3 = (r1 + r2) * 0.62, a = ((h2 % 100) / 100) * TAU;
      const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(a + 1.05), sb = Math.sin(a + 1.05);
      const R = Math.ceil(r1 + r2);
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const X = Math.round(cx) + dx, Y = Math.round(cy) + dy, ex = X - cx, ey = Y - cy;
        if (Math.abs(ex * ca + ey * sa) < r1 && Math.abs(-ex * sa + ey * ca) < r2 && Math.abs(ex * cb + ey * sb) < r3) mask[wrap(Y) * N + wrap(X)] = 1 + (k % 3);
      }
    }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const m = mask[y * N + x], up = mask[wrap(y - 1) * N + x], lf = mask[y * N + wrap(x - 1)], dn = mask[wrap(y + 1) * N + x], rt = mask[y * N + wrap(x + 1)];
      if (m) {
        let col = !up || !lf ? F_TOP : !dn || !rt ? F_LOW : F_MID;
        if (col === F_MID && hash2(x, y, 4203 + m) % 7 === 0) col = F_TOP;
        p.d[y * N + x] = col;
      } else if (up) p.d[y * N + x] = W_DEEP;
      else if (mask[wrap(y - 2) * N + x]) p.d[y * N + x] = W_MID;
      else if (lf || rt || dn) p.d[y * N + x] = F_SUB;
    }
    // Eisbrei: kleine blasse Krümel, die kommen und gehen
    for (let k = 0; k < 26; k++) {
      const h = hash2(k, 41, 4210), life = (f + (h % FR)) % FR, x = (h >>> 5) % N, y = (h >>> 12) % N;
      if (life > 5 || mask[y * N + x]) continue;
      const col = life === 0 || life === 5 ? W_LIGHT : life === 2 || life === 3 ? F_LOW : W_PALE;
      const xx = wrap(x + (life >> 1));
      if (!mask[y * N + xx]) p.set(xx, y, col);
      if ((h >>> 20) & 1 && life > 0 && life < 5 && !mask[y * N + wrap(xx + 1)]) p.set(wrap(xx + 1), y, W_PALE);
    }
    // langsame Glanzpunkte
    for (let k = 0; k < 4; k++) {
      const h = hash2(k, 57, 4220), life = (f + (h % FR)) % FR, x = (h >>> 6) % N, y = (h >>> 14) % N;
      if (mask[y * N + x]) continue;
      if (life === 0 || life === 3) p.set(x, y, W_PALE);
      else if (life === 1 || life === 2) { p.set(x, y, life === 1 ? WHITE : IC[3]); p.set(wrap(x - 1), y, W_PALE); p.set(wrap(x + 1), y, W_PALE); }
    }
    out.push(p);
  }
  return out;
}
