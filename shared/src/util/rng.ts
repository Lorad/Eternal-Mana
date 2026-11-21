/** Deterministischer Zufall – identisch auf Server und Client (wichtig für die Kartengenerierung). */
export class Rng {
  private s: number;
  constructor(seed: number) { this.s = (seed >>> 0) || 0x9e3779b9; }
  /** [0,1) */
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** ganze Zahl in [a,b] */
  int(a: number, b: number): number { return a + Math.floor(this.next() * (b - a + 1)); }
  range(a: number, b: number): number { return a + this.next() * (b - a); }
  chance(p: number): boolean { return this.next() < p; }
  pick<T>(arr: readonly T[]): T { return arr[Math.floor(this.next() * arr.length)]; }
  weighted<T>(arr: readonly (readonly [T, number])[]): T {
    let sum = 0;
    for (const [, w] of arr) sum += w;
    let r = this.next() * sum;
    for (const [v, w] of arr) { r -= w; if (r <= 0) return v; }
    return arr[arr.length - 1][0];
  }
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

export function hash2(x: number, y: number, seed: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smooth(t: number): number { return t * t * (3 - 2 * t); }

/** Value-Noise in [0,1], scale = Kachelgröße einer Noise-Zelle */
export function noise2(x: number, y: number, scale: number, seed: number): number {
  const fx = x / scale, fy = y / scale;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = smooth(fx - x0), ty = smooth(fy - y0);
  const a = hash2(x0, y0, seed), b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed), d = hash2(x0 + 1, y0 + 1, seed);
  return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
}

/** Zwei Oktaven */
export function fbm2(x: number, y: number, scale: number, seed: number): number {
  return noise2(x, y, scale, seed) * 0.65 + noise2(x, y, scale / 2.3, seed + 101) * 0.35;
}

export function strHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
