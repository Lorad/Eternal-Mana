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
    const v = pnoise(x, y, 2, 5, 11) * 0.62 + pnoise(x, y, 5, 10, 12) * 0.3 + pnoise(x, y, 12, 20, 13) * 0.08;
    const t = (v - 0.47) / 0.24;
    fog[y * N + x] = t <= 0 ? 0 : [0.14, 0.26, 0.38, 0.5][Math.min(3, Math.floor(t * 4))];
  }
  // Wolkenschatten: wenige große Formen, viel freie Fläche, 3 Bänder bis 0.35
  const cloud = new Float32Array(N * N), RC = rng(905), lobes: number[][] = [];
  for (const [bx, by] of [[52, 44], [176, 86], [92, 178], [226, 214]]) {
    const n = 2 + Math.floor(RC() * 2);
    for (let i = 0; i < n; i++) lobes.push([bx + (RC() - 0.5) * 56, by + (RC() - 0.5) * 26, 26 + RC() * 22, 15 + RC() * 12]);
  }
  const wrap = (d: number): number => ((((d + N / 2) % N) + N) % N) - N / 2;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let f = -1;
    for (const [lx, ly, rx, ry] of lobes) f = Math.max(f, 1 - Math.hypot(wrap(x - lx) / rx, wrap(y - ly) / ry));
    f += (pnoise(x, y, 8, 8, 22) - 0.5) * 0.5 + (pnoise(x, y, 20, 20, 23) - 0.5) * 0.16;
    cloud[y * N + x] = f < 0.06 ? 0 : f < 0.26 ? 0.13 : f < 0.5 ? 0.24 : 0.35;
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
