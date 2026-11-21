/** Nahtlos kachelbare 256×256-Overlays: Nebel, Wolkenschatten, Blätterschatten (in wenige Alpha-Bänder quantisiert). */
import { rnd2, rng } from '../palette';

const N = 256;
/** Periodisches Value-Noise: cells Gitterzellen je Kachel und Achse. */
function pnoise(x: number, y: number, cx: number, cy: number, s: number): number {
  const fx0 = (x / N) * cx, fy0 = (y / N) * cy, xi = Math.floor(fx0), yi = Math.floor(fy0);
  let fx = fx0 - xi, fy = fy0 - yi;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const v = (i: number, j: number): number => rnd2(((i % cx) + cx) % cx, ((j % cy) + cy) % cy, s);
  const a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
function toCanvas(alpha: Float32Array, rgb: number): HTMLCanvasElement {
  const cv = document.createElement('canvas'); cv.width = N; cv.height = N;
  const img = new ImageData(N, N);
  for (let i = 0; i < N * N; i++) { img.data[i * 4] = rgb; img.data[i * 4 + 1] = rgb; img.data[i * 4 + 2] = rgb; img.data[i * 4 + 3] = Math.round(alpha[i] * 255); }
  cv.getContext('2d')!.putImageData(img, 0, 0);
  return cv;
}

export function buildOverlaysImpl(): Record<string, HTMLCanvasElement> {
  // Nebel: waagerecht gestreckte Schwaden, 5 Bänder bis 0.5
  const fog = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const v = pnoise(x, y, 3, 6, 11) * 0.56 + pnoise(x, y, 6, 12, 12) * 0.28 + pnoise(x, y, 16, 24, 13) * 0.16;
    const t = (v - 0.44) / 0.3;
    fog[y * N + x] = t <= 0 ? 0 : Math.min(5, Math.ceil(t * 5)) * 0.1;
  }
  // Wolkenschatten: wenige große Formen, viel freie Fläche, 3 Bänder bis 0.35
  const cloud = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const v = pnoise(x, y, 3, 3, 21) * 0.6 + pnoise(x, y, 6, 6, 22) * 0.27 + pnoise(x, y, 14, 14, 23) * 0.13;
    const t = (v - 0.57) / 0.16;
    cloud[y * N + x] = t <= 0 ? 0 : t < 0.33 ? 0.13 : t < 0.75 ? 0.24 : 0.35;
  }
  // Blätterschatten: Büschel kleiner Blattflecken mit Sonnenlücken, bis 0.3
  const leaf = new Float32Array(N * N), R = rng(4711);
  const stamp = (cx: number, cy: number, len: number, wid: number, ang: number, a: number): void => {
    const ca = Math.cos(ang), sa = Math.sin(ang), r = Math.ceil(len);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const u = (dx * ca + dy * sa) / len, v = (-dx * sa + dy * ca) / wid;
      // Linsenform: zur Spitze hin schmaler
      if (Math.abs(u) > 1 || Math.abs(v) > 1 - u * u) continue;
      const i = ((((Math.round(cy) + dy) % N) + N) % N) * N + ((((Math.round(cx) + dx) % N) + N) % N);
      if (a > leaf[i]) leaf[i] = a;
    }
  };
  for (let c = 0; c < 58; c++) {
    const cx = R() * N, cy = R() * N, rad = 12 + R() * 16, n = 7 + Math.floor(R() * 9);
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, d = Math.sqrt(R()) * rad;
      stamp(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, 3 + R() * 4.5, 1.4 + R() * 2, R() * Math.PI, [0.12, 0.2, 0.3][Math.floor(R() * 3)]);
    }
  }
  for (let i = 0; i < 150; i++) stamp(R() * N, R() * N, 2 + R() * 2.5, 1 + R(), R() * Math.PI, R() < 0.5 ? 0.12 : 0.2);
  return { fog: toCanvas(fog, 255), cloud_shadow: toCanvas(cloud, 0), leaf_shadow: toCanvas(leaf, 0) };
}
