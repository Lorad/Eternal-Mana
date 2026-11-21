/**
 * Master-Palette von Eternal Mana. Alle Sprites/Kacheln benutzen ausschließlich diese Rampen
 * (dunkel → hell, Schatten ins Kühle/Violette verschoben, Lichter ins Warme).
 * Farben sind als 0xAABBGGRR (little-endian RGBA) gepackt.
 */
export type Ramp = readonly number[];

export function hex(s: string, a = 255): number {
  const n = parseInt(s.slice(1), 16);
  return ((a << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255)) >>> 0;
}
const ramp = (...c: string[]): Ramp => c.map((s) => hex(s));

export const INK = hex('#1b1424');
export const INK2 = hex('#2c2138');
export const WHITE = hex('#fbf7ea');
export const CLEAR = 0;

export const P = {
  steel: ramp('#2a2940', '#4b506c', '#7882a2', '#aeb8cf', '#e6ecf4'),
  stone: ramp('#2d2936', '#4c4753', '#746e77', '#a29b9b', '#d0c9bf'),
  red: ramp('#4a1532', '#8c2036', '#c8383a', '#ea6c4a', '#f8ac7c'),
  fire: ramp('#7a2418', '#c8481c', '#f08424', '#fcc43c', '#fff39c'),
  gold: ramp('#6a3a1c', '#a8661c', '#dc9c28', '#f6d250', '#fff5ac'),
  wood: ramp('#2e1a24', '#523020', '#7c4c2a', '#a8723a', '#d09c5a'),
  tan: ramp('#583222', '#8c5a34', '#b88650', '#dcb47c', '#f2dcac'),
  skin: ramp('#7c3c3a', '#b86a4e', '#e29e72', '#f6c89a', '#fde6c6'),
  skinD: ramp('#3c2028', '#643428', '#8e5434', '#b47a4c', '#d4a06c'),
  green: ramp('#14302e', '#1f5438', '#3a7e3c', '#6aac3e', '#a8d652'),
  forest: ramp('#0f2432', '#17403e', '#22604a', '#3a8a52', '#70b862'),
  teal: ramp('#102a3a', '#165262', '#1f8282', '#3cbaa6', '#90eaca'),
  blue: ramp('#181c4a', '#243c82', '#306ac2', '#58a6ea', '#aadef8'),
  ice: ramp('#3a5282', '#608aba', '#98c2e2', '#c8e6f4', '#f0fafc'),
  violet: ramp('#1e123a', '#3c1e6a', '#6a36a2', '#9c5ed2', '#d0a2f0'),
  pink: ramp('#4a104a', '#8a1c6c', '#c83c8e', '#f072aa', '#fcb6ce'),
  sand: ramp('#3c382a', '#665c3c', '#948852', '#c0b472', '#e4dca2'),
  snow: ramp('#6c7ca6', '#9eaeca', '#c8d4e6', '#e6eef6', '#ffffff'),
  ash: ramp('#16121e', '#261e2a', '#3a2e38', '#54424a', '#74605e'),
  shadow: ramp('#0c0816', '#181026', '#281a3c', '#3c2856', '#58407c'),
  cream: ramp('#6c5a5c', '#a08c7c', '#cfc0a4', '#ece2c8', '#fdf8e8'),
  bone: ramp('#4c4458', '#847c84', '#b8b0a4', '#e0d8c0', '#f8f4e0'),
} as const;

const DARKER = new Map<number, number>();
const LIGHTER = new Map<number, number>();
const ROOT = new Map<number, number>();
for (const r of Object.values(P)) {
  for (let i = 0; i < r.length; i++) {
    if (!DARKER.has(r[i])) {
      DARKER.set(r[i], r[Math.max(0, i - 1)]);
      LIGHTER.set(r[i], r[Math.min(r.length - 1, i + 1)]);
      ROOT.set(r[i], r[0]);
    }
  }
}

export function mix(a: number, b: number, t: number): number {
  const ar = a & 255, ag = (a >> 8) & 255, ab = (a >> 16) & 255, aa = a >>> 24;
  const br = b & 255, bg = (b >> 8) & 255, bb = (b >> 16) & 255, ba = b >>> 24;
  const r = (ar + (br - ar) * t) | 0, g = (ag + (bg - ag) * t) | 0, bl = (ab + (bb - ab) * t) | 0, al = (aa + (ba - aa) * t) | 0;
  return ((al << 24) | (bl << 16) | (g << 8) | r) >>> 0;
}
export function alpha(c: number, a: number): number {
  return (((a & 255) << 24) | (c & 0xffffff)) >>> 0;
}
export function darker(c: number): number { return DARKER.get(c) ?? mix(c, INK, 0.3); }
export function lighter(c: number): number { return LIGHTER.get(c) ?? mix(c, WHITE, 0.3); }
/** Getönte Outline-Farbe passend zur Füllfarbe. */
const OUTL = new Map<number, number>();
export function outlineOf(c: number): number {
  let o = OUTL.get(c);
  if (o === undefined) {
    const root = ROOT.get(c);
    o = root === undefined ? INK : mix(root, INK, 0.6);
    OUTL.set(c, o);
  }
  return o;
}

// ---------------------------------------------------------------- deterministischer Zufall
export function hash2(x: number, y: number, s = 0): number {
  let h = (Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(s | 0, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
/** 0..1 */
export function rnd2(x: number, y: number, s = 0): number { return hash2(x, y, s) / 4294967296; }
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** weiches Value-Noise 0..1 */
export function vnoise(x: number, y: number, s = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  let fx = x - xi, fy = y - yi;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = rnd2(xi, yi, s), b = rnd2(xi + 1, yi, s), c = rnd2(xi, yi + 1, s), d = rnd2(xi + 1, yi + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
