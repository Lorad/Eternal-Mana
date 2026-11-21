/**
 * Bodenmaler: malt die Kachel-Ebene einer Karte pixelweise (16 px je Kachel), nachbarschaftsbewusst.
 * Weiche Bodenarten (GROUND/GROUND2/PATH/HAZARD) gehen über verrauschte Grenzen organisch ineinander über,
 * Wände bekommen in 3/4-Sicht eine Frontfläche, Flüssigkeiten bleiben transparent bis auf das Ufer.
 */
import { P, Ramp, INK, WHITE, alpha, hash2, mix, rnd2 } from './palette';
import type { PaintableMap } from './spec';
import type { BiomeId } from '../../../shared/src/maps/tiles';

const VOID = 0, GROUND = 1, GROUND2 = 2, PATH = 3, FLOOR = 4, WALL = 5, LIQUID = 6, BRIDGE = 7, HAZARD = 8;
const TS = 16;

type Tones = number[];
/** 5 fein abgestufte Töne zwischen zwei Farben: [Detail dunkel, Schatten, Basis, Licht, Detail hell]. */
function tones(a: number, b: number): Tones { return [a, mix(a, b, 0.3), mix(a, b, 0.5), mix(a, b, 0.72), b]; }

interface Style {
  g: Tones; g2: Tones; path: Tones; hz: Tones; floor: Tones; wall: Tones; top: Tones; cliff: Tones; cliffTop: Tones;
  voidC: number; bank: [number, number, number]; foam: number;
  face: 'thicket' | 'rock' | 'basalt' | 'ice' | 'bricks';
  bridge: Tones; bridgeStone: boolean; accent: number; accent2: number;
}

const STYLES: Record<BiomeId, Style> = {
  gruenwald: {
    g: tones(P.green[2], mix(P.green[3], P.green[4], 0.2)), g2: tones(mix(P.green[1], P.green[2], 0.4), mix(P.green[2], P.green[3], 0.45)),
    path: tones(mix(P.tan[1], P.tan[2], 0.55), mix(P.tan[3], P.tan[4], 0.3)), hz: tones(P.forest[0], mix(P.forest[2], P.green[2], 0.5)),
    floor: tones(mix(P.stone[1], P.tan[1], 0.3), mix(P.stone[3], P.tan[3], 0.35)), wall: tones(mix(P.stone[0], P.forest[0], 0.3), mix(P.stone[3], P.sand[3], 0.3)), top: tones(P.stone[0], P.stone[2]),
    cliff: tones(P.forest[0], P.forest[2]), cliffTop: tones(P.forest[1], P.green[3]),
    voidC: mix(P.forest[0], INK, 0.55), bank: [P.wood[1], P.wood[2], P.tan[2]], foam: alpha(P.blue[4], 170),
    face: 'thicket', bridge: tones(P.wood[1], P.wood[4]), bridgeStone: false, accent: P.green[2], accent2: P.gold[4],
  },
  kristall: {
    g: tones(mix(P.shadow[3], P.blue[1], 0.45), mix(P.steel[2], P.teal[2], 0.45)), g2: tones(mix(P.teal[0], P.teal[1], 0.4), mix(P.teal[2], P.teal[3], 0.4)),
    path: tones(mix(P.steel[1], P.blue[1], 0.2), mix(P.steel[3], P.ice[1], 0.35)), hz: tones(P.shadow[1], P.violet[1]),
    floor: tones(mix(P.steel[0], P.violet[1], 0.35), mix(P.steel[2], P.blue[2], 0.25)), wall: tones(P.shadow[1], mix(P.steel[2], P.blue[1], 0.35)), top: tones(mix(P.shadow[0], P.shadow[1], 0.5), P.shadow[3]),
    cliff: tones(P.shadow[1], mix(P.steel[2], P.teal[1], 0.4)), cliffTop: tones(mix(P.shadow[0], P.shadow[1], 0.5), mix(P.shadow[3], P.blue[0], 0.5)),
    voidC: mix(P.shadow[0], INK, 0.5), bank: [P.shadow[1], P.steel[0], P.steel[1]], foam: alpha(P.teal[4], 150),
    face: 'rock', bridge: tones(P.wood[0], P.wood[3]), bridgeStone: false, accent: P.teal[3], accent2: P.teal[4],
  },
  glut: {
    g: tones(P.ash[1], mix(P.ash[4], P.ash[3], 0.5)), g2: tones(P.ash[0], mix(P.ash[3], P.red[0], 0.35)),
    path: tones(mix(P.ash[3], P.ash[2], 0.3), mix(P.ash[4], P.tan[2], 0.45)), hz: tones(P.ash[0], P.ash[2]),
    floor: tones(mix(P.ash[2], P.red[0], 0.35), mix(P.ash[4], P.red[1], 0.25)), wall: tones(P.ash[0], mix(P.ash[4], P.red[0], 0.2)), top: tones(INK, P.ash[2]),
    cliff: tones(P.ash[0], P.ash[4]), cliffTop: tones(INK, P.ash[2]),
    voidC: mix(P.ash[0], INK, 0.6), bank: [P.ash[0], P.ash[2], P.fire[1]], foam: alpha(P.fire[3], 230),
    face: 'basalt', bridge: tones(P.ash[1], P.ash[4]), bridgeStone: true, accent: P.fire[2], accent2: P.fire[3],
  },
  frost: {
    g: tones(P.snow[2], P.snow[4]), g2: tones(mix(P.snow[1], P.snow[2], 0.4), P.snow[4]),
    path: tones(mix(P.snow[0], P.snow[1], 0.7), mix(P.snow[2], P.snow[3], 0.3)), hz: tones(P.ice[2], P.ice[4]),
    floor: tones(mix(P.ice[0], P.steel[1], 0.4), mix(P.ice[2], P.steel[3], 0.3)), wall: tones(mix(P.blue[0], P.ice[0], 0.5), P.ice[2]), top: tones(P.snow[1], P.snow[3]),
    cliff: tones(mix(P.blue[1], P.ice[0], 0.5), P.ice[3]), cliffTop: tones(mix(P.snow[0], P.snow[1], 0.4), mix(P.snow[2], P.snow[3], 0.4)),
    voidC: mix(P.blue[0], INK, 0.5), bank: [P.ice[0], P.ice[1], P.snow[3]], foam: alpha(WHITE, 190),
    face: 'ice', bridge: tones(P.wood[1], P.wood[4]), bridgeStone: false, accent: P.ice[4], accent2: WHITE,
  },
  ruinen: {
    g: tones(mix(P.sand[1], P.sand[2], 0.55), mix(P.sand[3], P.sand[4], 0.3)), g2: tones(P.sand[1], P.sand[3]),
    path: tones(P.sand[2], mix(P.sand[4], P.cream[3], 0.4)), hz: tones(P.forest[1], P.green[3]),
    floor: tones(mix(P.sand[1], P.stone[1], 0.5), mix(P.sand[3], P.stone[3], 0.5)), wall: tones(P.sand[0], mix(P.sand[3], P.stone[3], 0.3)), top: tones(mix(P.sand[0], INK, 0.3), P.sand[1]),
    cliff: tones(P.sand[0], mix(P.sand[3], P.stone[3], 0.3)), cliffTop: tones(mix(P.sand[0], INK, 0.2), mix(P.sand[1], P.sand[2], 0.5)),
    voidC: mix(P.sand[0], INK, 0.6), bank: [P.sand[0], P.sand[1], P.sand[2]], foam: alpha(P.green[4], 130),
    face: 'bricks', bridge: tones(P.sand[1], P.sand[4]), bridgeStone: true, accent: P.green[2], accent2: P.teal[3],
  },
  schatten: {
    g: tones(mix(P.shadow[1], P.shadow[2], 0.5), mix(P.shadow[3], P.shadow[4], 0.4)), g2: tones(mix(P.shadow[2], P.violet[1], 0.3), mix(P.shadow[4], P.violet[2], 0.4)),
    path: tones(mix(P.shadow[3], P.steel[1], 0.4), mix(P.shadow[4], P.bone[1], 0.5)), hz: tones(P.shadow[0], P.shadow[2]),
    floor: tones(mix(P.shadow[1], P.shadow[2], 0.5), mix(P.shadow[4], P.steel[1], 0.3)), wall: tones(INK, mix(P.shadow[3], P.shadow[4], 0.5)), top: tones(mix(INK, P.shadow[0], 0.5), P.shadow[1]),
    cliff: tones(INK, mix(P.shadow[3], P.shadow[4], 0.5)), cliffTop: tones(mix(INK, P.shadow[0], 0.5), P.shadow[1]),
    voidC: mix(P.shadow[0], INK, 0.7), bank: [INK, P.shadow[1], P.shadow[3]], foam: alpha(P.pink[2], 150),
    face: 'rock', bridge: tones(P.shadow[2], mix(P.bone[1], P.shadow[4], 0.4)), bridgeStone: true, accent: P.pink[2], accent2: P.pink[3],
  },
};

const isSoft = (t: number): boolean => t === GROUND || t === GROUND2 || t === PATH || t === HAZARD;

// ---------------------------------------------------------------- Rauschfelder
function field(W: number, H: number, x0: number, y0: number, period: number, seed: number): Float32Array {
  const out = new Float32Array(W * H);
  for (let py = 0; py < H; py++) {
    const fy = (y0 + py) / period, yi = Math.floor(fy);
    let ty = fy - yi; ty = ty * ty * (3 - 2 * ty);
    let lastXi = NaN, a = 0, b = 0, c = 0, d = 0;
    for (let px = 0; px < W; px++) {
      const fx = (x0 + px) / period, xi = Math.floor(fx);
      if (xi !== lastXi) { a = rnd2(xi, yi, seed); b = rnd2(xi + 1, yi, seed); c = rnd2(xi, yi + 1, seed); d = rnd2(xi + 1, yi + 1, seed); lastXi = xi; }
      let tx = fx - xi; tx = tx * tx * (3 - 2 * tx);
      out[py * W + px] = a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
    }
  }
  return out;
}
// Voronoi (Ergebnis in Modulvariablen, um Allokationen zu vermeiden)
let vId = 0, vEdge = 0, vDx = 0, vDy = 0;
function voro(x: number, y: number, size: number, seed: number): void {
  const gx = Math.floor(x / size), gy = Math.floor(y / size);
  let d1 = 1e9, d2 = 1e9;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = gx + i, cy = gy + j, h = hash2(cx, cy, seed);
    const px = (cx + 0.15 + ((h & 255) / 255) * 0.7) * size, py = (cy + 0.15 + (((h >> 8) & 255) / 255) * 0.7) * size;
    const dx = x - px, dy = y - py, dd = dx * dx + dy * dy;
    if (dd < d1) { d2 = d1; d1 = dd; vId = h; vDx = dx; vDy = dy; } else if (dd < d2) d2 = dd;
  }
  vEdge = Math.sqrt(d2) - Math.sqrt(d1);
}
function tone(r: Tones, n: number, h: number, speck = 0.02): number {
  if (h < speck) return r[0];
  if (h > 1 - speck * 0.7) return r[4];
  return n < 0.42 ? r[1] : n > 0.6 ? r[3] : r[2];
}
function shade(c: number, t: number): number { return ((c & 0xff000000) | (mix(c, INK, t) & 0xffffff)) >>> 0; }

const MOSAIC = [P.sand[4], mix(P.teal[2], P.sand[2], 0.45), mix(P.red[2], P.sand[2], 0.5), P.cream[3], mix(P.blue[2], P.sand[2], 0.55)];

// ---------------------------------------------------------------- Kontext eines Chunks
interface Ctx {
  map: PaintableMap; st: Style; biome: BiomeId; seed: number;
  W: number; H: number; x0: number; y0: number; buf: Uint32Array;
  nA: Float32Array; nB: Float32Array; wX: Float32Array; wY: Float32Array;
}
function tileAt(m: PaintableMap, x: number, y: number): number {
  return x < 0 || y < 0 || x >= m.w || y >= m.h ? VOID : m.tiles[y * m.w + x];
}
const wallish = (t: number): boolean => t === WALL || t === VOID;

/** Farbe eines weichen Bodenpixels. */
function softColor(c: Ctx, k: number, wx: number, wy: number, i: number): number {
  const st = c.st, a = c.nA[i], b = c.nB[i], n = a * 0.6 + b * 0.4, h = rnd2(wx, wy, c.seed);
  const rx = Math.abs(c.wX[i] - 0.5), ry = Math.abs(c.wY[i] - 0.5);
  const bio = c.biome;
  if (k === GROUND) {
    switch (bio) {
      case 'gruenwald': return tone(st.g, n, h, 0.006);
      case 'kristall': if (rx < 0.012 && a > 0.45) return st.g[0]; return tone(st.g, n, h, 0.02);
      case 'glut': if (rx < 0.013 && a > 0.6) return rx < 0.005 ? P.fire[2] : P.fire[1]; return tone(st.g, n, h, 0.03);
      case 'frost': { const s = Math.sin((wy + a * 22 + wx * 0.3) / 4.2); return h > 0.994 ? WHITE : s < -0.93 ? st.g[1] : n > 0.56 ? st.g[4] : n < 0.4 ? st.g[2] : st.g[3]; }
      case 'ruinen': {
        voro(wx, wy, 13, c.seed + 3);
        const hv = (vId >>> 16) / 65536;
        if (vEdge < 1.1) return hv < 0.35 || b > 0.62 ? mix(st.accent, st.g[0], 0.45) : st.g[0];
        if (vEdge < 2.2 && vDx + vDy < 0) return st.g[4];
        return h < 0.02 ? st.g[1] : hv < 0.3 ? st.g[1] : hv > 0.75 ? st.g[3] : st.g[2];
      }
      default: if (ry < 0.014 && a > 0.4) return ry < 0.005 && b > 0.5 ? P.pink[1] : mix(st.g[2], P.pink[1], 0.45); return tone(st.g, n, h, 0.012);
    }
  }
  if (k === GROUND2) {
    switch (bio) {
      case 'gruenwald': {
        const off = hash2(wx, 0, c.seed) & 3, seg = (wy + off) >> 2, v = rnd2(wx, seg, c.seed + 9), top = ((wy + off) & 3) === 0;
        if (v > 0.72) return top ? st.g2[4] : st.g2[3];
        if (v < 0.3) return st.g2[n < 0.45 ? 0 : 1];
        return st.g2[n < 0.45 ? 1 : 2];
      }
      case 'kristall': return h > 0.985 ? P.teal[4] : tone(st.g2, b * 0.7 + a * 0.3, h, 0.03);
      case 'glut': {
        voro(wx, wy, 6, c.seed + 4);
        if (h > 0.993) return P.fire[2];
        if (vEdge < 0.9) return st.g2[0];
        return vDx + vDy < -1.2 ? st.g2[4] : vDx + vDy > 1.5 ? st.g2[1] : st.g2[2 + ((vId >>> 20) & 1)];
      }
      case 'frost': { const s = Math.sin((wy + a * 20 + wx * 0.22) / 2.9); return h > 0.99 ? WHITE : s > 0.78 ? st.g2[4] : s < -0.86 ? st.g2[0] : s < -0.55 ? st.g2[1] : n < 0.42 ? st.g2[2] : st.g2[3]; }
      case 'ruinen': {
        const tx = wx >> 2, ty = wy >> 2;
        if ((wx & 3) === 3 || (wy & 3) === 3) return st.g2[1];
        const ht = rnd2(tx, ty, c.seed + 6);
        if (ht > 0.8 || a < 0.33) return st.g2[ht > 0.9 ? 2 : 3];
        const mx = Math.abs(((tx % 8) + 8) % 8 - 3.5), my = Math.abs(((ty % 8) + 8) % 8 - 3.5), ring = Math.floor(mx + my);
        const col = MOSAIC[ring === 2 ? 1 : ring === 4 ? 2 : ring === 0 ? 4 : ring === 6 ? 1 : (tx + ty) % 2 ? 0 : 3];
        return (wx & 3) === 0 && (wy & 3) === 0 ? mix(col, WHITE, 0.25) : mix(col, st.g2[2], 0.25 + ht * 0.3);
      }
      default: if (ry < 0.03 || rx < 0.012) return ry < 0.01 ? P.pink[2] : mix(st.g2[2], P.pink[1], 0.6); return h > 0.992 ? P.violet[3] : tone(st.g2, n, h, 0.02);
    }
  }
  if (k === PATH) {
    switch (bio) {
      case 'ruinen': {
        const row = Math.floor(wy / 7), xx = wx + (row & 1) * 5, col = Math.floor(xx / 10), hb = rnd2(col, row, c.seed + 8);
        const ly = ((wy % 7) + 7) % 7, lx = ((xx % 10) + 10) % 10;
        if (ly === 6 || lx === 9) return st.path[0];
        if (ly === 0 || lx === 0) return st.path[4];
        return h < 0.03 ? st.path[1] : hb < 0.3 ? st.path[1] : hb > 0.7 ? st.path[3] : st.path[2];
      }
      case 'frost': { const s = Math.sin((wx + b * 9) / 2.4 + wy * 0.15); return h > 0.994 ? WHITE : s > 0.95 ? st.path[4] : s < -0.95 ? st.path[1] : tone(st.path, n, h, 0.01); }
      default: return tone(st.path, b * 0.65 + a * 0.35, h, 0.035);
    }
  }
  // HAZARD
  switch (bio) {
    case 'gruenwald': {
      if (rx < 0.022) return rx < 0.008 ? P.wood[3] : P.wood[2];
      if (ry < 0.02) return mix(P.red[1], P.wood[1], 0.5);
      if ((rx < 0.05 || ry < 0.045) && h > 0.72) return P.bone[3];
      if (b > 0.66) return h > 0.5 ? P.green[2] : P.forest[2];
      return tone(st.hz, n, h, 0.03);
    }
    case 'kristall': {
      voro(wx, wy, 5, c.seed + 5);
      if (vEdge < 0.8) return st.hz[0];
      const s = vDx * 0.7 + vDy, pink = (vId >>> 18) % 5 === 0;
      if (h > 0.985) return WHITE;
      return s < -0.8 ? (pink ? P.pink[3] : P.teal[3]) : s > 1 ? (pink ? P.pink[0] : P.teal[0]) : pink ? P.pink[1] : P.teal[1];
    }
    case 'glut': {
      if (rx < 0.05) return rx < 0.012 ? P.fire[4] : rx < 0.03 ? P.fire[3] : P.fire[2];
      if (ry < 0.03) return ry < 0.012 ? P.fire[2] : P.fire[1];
      if (a > 0.66 && ((wx + wy) & 1) === 0) return P.fire[0];
      return h > 0.985 ? P.fire[3] : tone(st.hz, n, h, 0.03);
    }
    case 'frost': {
      if (rx < 0.016) return rx < 0.006 ? P.blue[1] : P.blue[2];
      if (ry < 0.012) return WHITE;
      if (a < 0.3) return P.ice[1];
      const s = Math.sin((wx + wy * 0.8 + b * 6) / 3);
      return s > 0.82 ? WHITE : s > 0.2 ? st.hz[3] : st.hz[2];
    }
    case 'ruinen': {
      if (b > 0.5) { if (b < 0.54) return P.forest[1]; return h > 0.985 ? P.green[4] : b > 0.68 ? (h > 0.9 ? P.green[4] : P.green[3]) : P.green[2]; }
      return softColor(c, GROUND, wx, wy, i);
    }
    default: {
      if (rx < 0.05) return rx < 0.012 ? P.pink[4] : rx < 0.028 ? P.pink[2] : P.pink[1];
      if (ry < 0.02) return P.violet[2];
      return h > 0.99 ? P.pink[3] : tone(st.hz, n, h, 0.02);
    }
  }
}

function softKind(c: Ctx, own: number, wx: number, wy: number, i: number): number {
  const ox = (c.wX[i] - 0.5) * 8, oy = (c.wY[i] - 0.5) * 8;
  const t = tileAt(c.map, (wx + ox) >> 4, (wy + oy) >> 4);
  return isSoft(t) ? t : own;
}
const RANK = [0, 2, 3, 1, 0, 0, 0, 0, 2];

// ---------------------------------------------------------------- gemauerter Boden
function floorColor(c: Ctx, wx: number, wy: number, i: number): number {
  const st = c.st, r = st.floor, h = rnd2(wx, wy, c.seed);
  if (c.map.dungeon) {
    // große Platten 16x16 mit Fase, einzelne gesprungen oder mit Rune
    const lx = wx & 15, ly = wy & 15, tx = wx >> 4, ty = wy >> 4, ht = rnd2(tx, ty, c.seed + 21);
    if (lx === 15 || ly === 15) return r[0];
    if (lx === 0 || ly === 0) return r[4];
    if (lx === 14 || ly === 14) return r[1];
    let base = ht < 0.25 ? r[1] : ht > 0.78 ? r[3] : r[2];
    if (ht > 0.97) { const d = Math.abs(lx - 7.5) + Math.abs(ly - 7.5); if (d > 3.2 && d < 4.6) return mix(st.accent2, r[2], 0.35); if (d < 1.2) return mix(st.accent2, r[2], 0.2); }
    else if (ht < 0.04) { if (Math.abs(lx - ly + ((hash2(tx, ty, 3) & 3) - 1) * (ly > 7 ? 1 : 0)) < 1 && lx > 2 && lx < 13) return r[0]; }
    else if (ht > 0.42 && ht < 0.5) { if ((lx === 7 || ly === 7)) return r[1]; if (lx === 8 || ly === 8) return r[3]; }
    if (h < 0.03) base = r[1]; else if (h > 0.975) base = r[3];
    return base;
  }
  // Oberwelt: Kopfsteinpflaster
  voro(wx, wy, 7, c.seed + 22);
  if (vEdge < 1) return r[0];
  const hv = (vId >>> 16) / 65536, s = vDx + vDy;
  if (s < -2.2) return r[4];
  if (s > 2.6) return r[1];
  return h < 0.03 ? r[1] : hv < 0.3 ? r[2] : hv > 0.7 ? r[3] : mix(r[2], r[3], 0.5);
  void i;
}

// ---------------------------------------------------------------- Wände
function wallFace(c: Ctx, wx: number, wy: number, lx: number, ly: number, i: number, wOpen: boolean, eOpen: boolean): number {
  const st = c.st, dun = c.map.dungeon, face = dun ? 'bricks' : st.face;
  const r = dun ? st.wall : st.cliff, tp = dun ? st.top : st.cliffTop;
  const h = rnd2(wx, wy, c.seed), a = c.nA[i], b = c.nB[i];
  if (face === 'thicket') {
    // Dickicht: oben überhängendes Laub, darunter Stämme im Dunkeln, unten Gestrüpp
    voro(wx, wy, 6, c.seed + 31);
    const hang = 6 + Math.round((b - 0.5) * 5);
    if (ly < hang) { const s = vDx * 0.8 + vDy; if (ly >= hang - 1) return P.forest[0]; return vEdge < 0.9 ? P.forest[1] : s < -1.4 ? P.green[3] : s > 1.2 ? P.forest[1] : P.green[2]; }
    const col = Math.floor((wx + (hash2(wx >> 3, 0, c.seed) & 1)) / 1), tk = ((col % 7) + 7) % 7, tid = Math.floor(col / 7), th = rnd2(tid, 5, c.seed + 32);
    const bush = 13 - Math.round(a * 3);
    if (ly >= bush) { voro(wx, wy, 5, c.seed + 33); return vEdge < 0.8 ? P.forest[0] : vDx + vDy < -1 ? P.green[2] : P.forest[2]; }
    if (th > 0.25 && tk >= 2 && tk <= 4) return tk === 2 ? P.wood[3] : tk === 3 ? (h > 0.85 ? P.wood[1] : P.wood[2]) : P.wood[1];
    if (th > 0.6 && tk === 6) return P.wood[1];
    return h > 0.93 ? P.forest[1] : mix(P.forest[0], INK, 0.35);
  }
  // Oberkante (Lippe)
  if (ly < 2) { if (face === 'ice') return ly === 0 ? P.snow[4] : P.snow[3]; return tp[3]; }
  if (ly === 2) return face === 'ice' ? P.snow[4] : r[4];
  let col: number;
  if (face === 'bricks') {
    const band = Math.floor((ly - 3) / 4), by = (ly - 3) % 4, row = (wy >> 4) * 3 + band, xx = wx + (row & 1) * 4, bx = ((xx % 8) + 8) % 8, id = Math.floor(xx / 8), hb = rnd2(id, row, c.seed + 34);
    if (ly === 15) col = r[0];
    else if (by === 3 || bx === 7) col = r[0];
    else if (by === 0) col = hb > 0.5 ? r[4] : r[3];
    else col = hb < 0.22 ? r[1] : hb > 0.8 ? r[3] : r[2];
    if (hb > 0.9 && by !== 3 && bx !== 7 && (c.biome === 'gruenwald' || c.biome === 'ruinen')) col = mix(col, st.accent, 0.45);
    if (hb < 0.05 && bx === 3 + by) col = r[0];
    if ((c.biome === 'schatten' || c.biome === 'kristall') && hb > 0.95 && by === 1 && bx === 3) col = st.accent2;
    if (c.biome === 'glut' && hb > 0.94 && by === 3) col = P.fire[1];
  } else if (face === 'basalt') {
    const colId = Math.floor(wx / 5), cx = ((wx % 5) + 5) % 5, hc = rnd2(colId, wy >> 4, c.seed + 35), topOff = Math.floor(hc * 4);
    if (ly - 3 < topOff) col = cx === 4 ? r[1] : tp[3 + (cx < 2 ? 1 : 0)];
    else if (ly - 3 === topOff) col = r[4];
    else if (cx === 4) col = r[0];
    else if (cx === 0) col = r[3];
    else col = (ly + Math.floor(hc * 9)) % 7 === 0 ? r[1] : cx === 3 ? r[1] : r[2];
    if (c.biome === 'glut' && cx === 4 && rnd2(colId, wy >> 2, c.seed + 36) > 0.86) col = P.fire[ly > 11 ? 2 : 1];
    if (ly === 15) col = r[0];
  } else if (face === 'ice') {
    const s = Math.sin((wx * 0.9 + wy * 0.55 + a * 14) / 2.6), icl = 3 + (hash2(wx, wy >> 4, c.seed + 37) % 5);
    if (ly < icl && (wx & 1) === 0) col = ly === icl - 1 ? P.ice[3] : P.snow[4];
    else col = s > 0.86 ? P.ice[4] : s > 0.3 ? r[3] : s < -0.7 ? r[1] : r[2];
    if (((wx + (hash2(wx >> 3, wy >> 4, c.seed) & 7)) & 7) === 0 && ly > 5) col = r[0];
    if (ly === 15) col = r[0];
  } else {
    // Fels: senkrechte Schichten mit Rissen
    const wxx = wx + Math.round((a - 0.5) * 6), colId = Math.floor(wxx / 5), cx = ((wxx % 5) + 5) % 5, hc = rnd2(colId, Math.floor((wy + (colId & 3) * 3) / 9), c.seed + 38);
    col = hc < 0.3 ? r[1] : hc > 0.72 ? r[3] : r[2];
    if (cx === 4) col = r[0]; else if (cx === 0) col = hc > 0.5 ? r[4] : r[3];
    if ((wy + (colId * 5)) % 9 === 0 && cx !== 4) col = r[1];
    if (h > 0.985) col = st.accent2; else if (h < 0.03) col = r[1];
    if (c.biome === 'schatten' && Math.abs(c.wX[i] - 0.5) < 0.014) col = P.pink[1];
    if (ly === 15) col = r[0];
  }
  if (ly === 3 && face !== 'ice') col = mix(col, r[4], 0.5);
  if (ly >= 13) col = shade(col, ly === 14 ? 0.3 : 0.18);
  if (wOpen && lx === 0) col = mix(col, r[4], 0.6);
  if (eOpen && lx >= 14) col = shade(col, lx === 15 ? 0.45 : 0.2);
  return col;
}

function wallTop(c: Ctx, wx: number, wy: number, lx: number, ly: number, i: number, nb: number): number {
  // nb: Bitmaske offener Nachbarn N=1 W=2 E=4 NW=8 NE=16
  const st = c.st, dun = c.map.dungeon, r = dun ? st.top : st.cliffTop;
  const h = rnd2(wx, wy, c.seed), a = c.nA[i], b = c.nB[i];
  if (!dun && st.face === 'thicket') {
    voro(wx, wy, 7, c.seed + 41);
    const jit = 1 + Math.round(b * 2.2);
    if (((nb & 1) && ly < jit) || ((nb & 2) && lx < jit) || ((nb & 4) && lx > 15 - jit)) return P.forest[0];
    if (vEdge < 1) return P.forest[1];
    const s = vDx * 0.8 + vDy, hv = (vId >>> 16) / 65536;
    if (s < -2.6) return hv > 0.5 ? P.green[4] : P.green[3];
    if (s < -0.6) return P.green[3 - (h > 0.85 ? 1 : 0)];
    if (s > 2.2) return P.forest[1];
    return h > 0.9 ? P.green[3] : h < 0.1 ? P.forest[2] : P.green[2];
  }
  const n = (nb & 1) !== 0, w = (nb & 2) !== 0, e = (nb & 4) !== 0;
  if ((n && ly === 0) || (w && lx === 0) || (e && lx === 15)) return r[0];
  if ((n && ly <= 2) || (w && lx <= 2)) return r[4];
  if (e && lx >= 13) return r[3];
  if ((nb & 8) && lx <= 1 && ly <= 1) return r[4];
  if ((nb & 16) && lx >= 14 && ly <= 1) return r[3];
  if (!dun && st.face === 'ice') { const s = Math.sin((wy + a * 20 + wx * 0.3) / 3.4); void s; return h > 0.994 ? WHITE : h < 0.01 ? r[1] : a > 0.58 ? r[3] : r[2]; }
  if (dun) {
    // Mauerkrone: große Quader
    const row = wy >> 3, xx = wx + (row & 1) * 8, bx = xx & 15, by = wy & 7;
    if (by === 7 || bx === 15) return r[0];
    return h < 0.04 ? r[0] : rnd2(xx >> 4, row, c.seed + 42) > 0.6 ? r[2] : r[1];
  }
  if (h > 0.9975) return st.accent2;
  return tone(r, a * 0.5 + b * 0.5, h, 0.008);
}

// ---------------------------------------------------------------- Brücke
function bridgeColor(c: Ctx, wx: number, wy: number, lx: number, ly: number, vertical: boolean): number {
  const r = c.st.bridge, stone = c.st.bridgeStone;
  const u = vertical ? lx : ly, v = vertical ? wy : wx;   // u: quer, v: längs
  if (u === 0 || u === 15) return r[0];
  if (u === 1 || u === 14) return ((v % 8) + 8) % 8 < 2 ? r[4] : r[3];
  if (u === 2) return r[1];
  if (u === 13) return r[0];
  if (stone) {
    const row = Math.floor(v / 6), k = ((v % 6) + 6) % 6, uu = u + (row & 1) * 3, hb = rnd2(row, Math.floor(uu / 6), c.seed + 51);
    if (k === 5 || uu % 6 === 0) return r[0];
    if (k === 0) return r[4];
    return hb < 0.3 ? r[1] : hb > 0.7 ? r[3] : r[2];
  }
  const plank = Math.floor(v / 4), k = ((v % 4) + 4) % 4, hp = rnd2(plank, vertical ? wx >> 4 : wy >> 4, c.seed + 52);
  if (k === 3) return r[0];
  if (k === 0) return r[4];
  if ((u === 4 || u === 11) && k === 1) return r[0];
  if (c.biome === 'frost' && hp > 0.55 && k === 1 && u > 4 && u < 10) return P.snow[3];
  return rnd2(wx, wy, c.seed) < 0.06 ? r[1] : hp < 0.3 ? r[2] : hp > 0.75 ? r[3] : mix(r[2], r[3], 0.5);
}

// ---------------------------------------------------------------- Detail-Stempel
type Stamp = ReadonlyArray<readonly [number, number, number]>;
const TUFT: Stamp = [[0, 0, 4], [0, 1, 3], [2, -1, 4], [2, 0, 4], [2, 1, 3], [4, 0, 4], [4, 1, 3], [1, 2, 0], [3, 2, 0]];
const TUFT2: Stamp = [[0, 0, 4], [1, 1, 3], [3, 0, 4], [3, 1, 3], [2, 2, 0]];
const PEBBLE: Stamp = [[0, 0, 4], [1, 0, 3], [0, 1, 1], [1, 1, 0], [2, 1, 0]];
const PEBBLE2: Stamp = [[0, 0, 4], [1, 0, 4], [2, 0, 3], [0, 1, 3], [1, 1, 2], [2, 1, 1], [0, 2, 0], [1, 2, 0], [2, 2, 0], [3, 1, 0]];
const CRACK: Stamp = [[0, 0, 0], [1, 1, 0], [2, 1, 0], [3, 2, 0], [3, 3, 0], [4, 4, 0], [1, 2, 0]];
const SPARK: Stamp = [[1, 0, 5], [0, 1, 5], [1, 1, 6], [2, 1, 5], [1, 2, 5]];
const FLOWER: Stamp = [[1, 0, 5], [0, 1, 5], [1, 1, 6], [2, 1, 5], [1, 2, 5], [1, 3, 0]];
const DRIFT: Stamp = [[0, 1, 1], [1, 0, 1], [2, 0, 1], [3, 0, 1], [4, 1, 1], [1, 1, 4], [2, 1, 4], [3, 1, 4]];
const SHROOM: Stamp = [[0, 0, 5], [1, 0, 6], [2, 0, 5], [1, 1, 4], [1, 2, 0]];
const BONE: Stamp = [[0, 0, 5], [1, 1, 5], [2, 2, 5], [3, 3, 5], [0, 1, 6], [3, 2, 6], [1, 2, 0], [2, 3, 0]];
const FLOWER_COLS = [WHITE, P.gold[4], P.pink[3], P.blue[4], P.red[3]];

function stamp(c: Ctx, cellT: number, wx: number, wy: number, s: Stamp, r: Tones, c5 = 0, c6 = 0): void {
  for (const [dx, dy, ci] of s) {
    const x = wx + dx - c.x0, y = wy + dy - c.y0;
    if (x < 0 || y < 0 || x >= c.W || y >= c.H) continue;
    if (tileAt(c.map, (wx + dx) >> 4, (wy + dy) >> 4) !== cellT) continue;
    c.buf[y * c.W + x] = ci === 5 ? c5 : ci === 6 ? c6 : r[ci];
  }
}
function details(c: Ctx, t: number, cx: number, cy: number): void {
  const st = c.st, bio = c.biome, wx0 = cx * TS, wy0 = cy * TS;
  const n = 4;
  for (let k = 0; k < n; k++) {
    const hh = hash2(cx * 7 + k, cy * 13 + k * 3, c.seed + 60), r1 = (hh & 1023) / 1023, px = wx0 + 1 + ((hh >> 10) % 11), py = wy0 + 2 + ((hh >> 14) % 10), r2 = ((hh >> 20) & 1023) / 1023;
    if (t === GROUND) {
      if (bio === 'gruenwald') { if (r1 < 0.42) stamp(c, t, px, py, r2 < 0.5 ? TUFT : TUFT2, st.g); else if (r1 < 0.47) stamp(c, t, px, py, FLOWER, st.g, FLOWER_COLS[(hh >> 5) % 5], (hh >> 5) % 5 === 1 ? P.fire[2] : P.gold[4]); else if (r1 < 0.5) stamp(c, t, px, py, PEBBLE, P.stone as unknown as Tones); }
      else if (bio === 'kristall') { if (r1 < 0.12) stamp(c, t, px, py, PEBBLE, st.g); else if (r1 < 0.16) stamp(c, t, px, py, SPARK, st.g, mix(st.accent, st.g[2], 0.4), st.accent2); else if (r1 < 0.24) stamp(c, t, px, py, CRACK, st.g); else if (r1 < 0.27) stamp(c, t, px, py, PEBBLE2, st.g); }
      else if (bio === 'glut') { if (r1 < 0.14) stamp(c, t, px, py, PEBBLE, st.g); else if (r1 < 0.2) stamp(c, t, px, py, PEBBLE2, st.g); else if (r1 < 0.27) stamp(c, t, px, py, CRACK, st.g); else if (r1 < 0.29) stamp(c, t, px, py, SPARK, st.g, P.fire[1], P.fire[3]); }
      else if (bio === 'frost') { if (r1 < 0.12) stamp(c, t, px, py, SPARK, st.g, st.g[4], WHITE); else if (r1 < 0.26) stamp(c, t, px, py, DRIFT, st.g); else if (r1 < 0.29) stamp(c, t, px, py, PEBBLE, [P.steel[0], P.steel[1], P.steel[2], P.steel[3], P.snow[4]]); }
      else if (bio === 'ruinen') { if (r1 < 0.1) stamp(c, t, px, py, TUFT2, [P.forest[1], P.forest[2], P.green[2], P.green[2], P.green[3]]); else if (r1 < 0.16) stamp(c, t, px, py, CRACK, st.g); else if (r1 < 0.2) stamp(c, t, px, py, PEBBLE, st.g); }
      else { if (r1 < 0.07) stamp(c, t, px, py, SPARK, st.g, P.violet[1], P.pink[3]); else if (r1 < 0.15) stamp(c, t, px, py, CRACK, st.g); else if (r1 < 0.2) stamp(c, t, px, py, PEBBLE, st.g); else if (r1 < 0.22) stamp(c, t, px, py, BONE, st.g, P.bone[2], P.bone[1]); }
    } else if (t === GROUND2) {
      if (bio === 'gruenwald') { if (r1 < 0.16) stamp(c, t, px, py, FLOWER, st.g2, FLOWER_COLS[(hh >> 5) % 5], P.gold[4]); else if (r1 < 0.4) stamp(c, t, px, py, TUFT, [st.g2[0], st.g2[1], st.g2[2], st.g[2], st.g[4]]); }
      else if (bio === 'kristall') { if (r1 < 0.12) stamp(c, t, px, py, SHROOM, st.g2, P.teal[3], P.teal[4]); else if (r1 < 0.2) stamp(c, t, px, py, SPARK, st.g2, P.teal[3], WHITE); }
      else if (bio === 'glut') { if (r1 < 0.1) stamp(c, t, px, py, SPARK, st.g2, P.fire[1], P.fire[3]); else if (r1 < 0.2) stamp(c, t, px, py, PEBBLE2, st.g); }
      else if (bio === 'frost') { if (r1 < 0.2) stamp(c, t, px, py, SPARK, st.g2, st.g2[4], WHITE); }
      else if (bio === 'ruinen') { if (r1 < 0.12) stamp(c, t, px, py, TUFT2, [P.forest[1], P.forest[2], P.green[2], P.green[2], P.green[3]]); else if (r1 < 0.2) stamp(c, t, px, py, CRACK, st.g2); }
      else { if (r1 < 0.14) stamp(c, t, px, py, SPARK, st.g2, P.pink[1], P.pink[3]); else if (r1 < 0.2) stamp(c, t, px, py, SHROOM, st.g2, P.violet[2], P.pink[3]); }
    } else if (t === PATH) {
      if (bio === 'ruinen') { if (r1 < 0.08) stamp(c, t, px, py, TUFT2, [P.forest[1], P.forest[2], P.green[2], P.green[2], P.green[3]]); else if (r1 < 0.14) stamp(c, t, px, py, CRACK, st.path); }
      else if (r1 < 0.2) stamp(c, t, px, py, PEBBLE, st.path); else if (r1 < 0.3) stamp(c, t, px, py, PEBBLE2, st.path); else if (r1 < 0.36 && bio === 'gruenwald') stamp(c, t, px, py, TUFT2, st.g); else if (r1 < 0.4 && bio !== 'gruenwald') stamp(c, t, px, py, CRACK, st.path);
    }
  }
}

// ---------------------------------------------------------------- Chunk
function paintChunk(map: PaintableMap, c0x: number, c0y: number, cw: number, ch: number): { buf: Uint32Array; W: number; H: number } {
  const W = cw * TS, H = ch * TS, x0 = c0x * TS, y0 = c0y * TS, seed = map.seed | 0;
  const st = STYLES[map.biome] ?? STYLES.gruenwald;
  const c: Ctx = {
    map, st, biome: map.biome, seed, W, H, x0, y0, buf: new Uint32Array(W * H),
    nA: field(W, H, x0, y0, 13, seed + 1), nB: field(W, H, x0, y0, 5, seed + 2), wX: field(W, H, x0, y0, 7, seed + 3), wY: field(W, H, x0, y0, 7, seed + 4),
  };
  const buf = c.buf;
  for (let cy = c0y; cy < c0y + ch; cy++) for (let cx = c0x; cx < c0x + cw; cx++) {
    const t = tileAt(map, cx, cy);
    const tn = tileAt(map, cx, cy - 1), ts = tileAt(map, cx, cy + 1), tw = tileAt(map, cx - 1, cy), te = tileAt(map, cx + 1, cy);
    const tnw = tileAt(map, cx - 1, cy - 1), tne = tileAt(map, cx + 1, cy - 1), tsw = tileAt(map, cx - 1, cy + 1), tse = tileAt(map, cx + 1, cy + 1);
    const bx = (cx - c0x) * TS, by = (cy - c0y) * TS, wx0 = cx * TS, wy0 = cy * TS;
    if (isSoft(t)) {
      const mixed = [tn, ts, tw, te, tnw, tne, tsw, tse].some((q) => isSoft(q) && q !== t);
      for (let ly = 0; ly < TS; ly++) for (let lx = 0; lx < TS; lx++) {
        const i = (by + ly) * W + bx + lx, wx = wx0 + lx, wy = wy0 + ly;
        if (!mixed) { buf[i] = softColor(c, t, wx, wy, i); continue; }
        const k = softKind(c, t, wx, wy, i);
        let col = softColor(c, k, wx, wy, i);
        const iu = by + ly > 0 ? i - W : i, il = bx + lx > 0 ? i - 1 : i, id = by + ly < H - 1 ? i + W : i;
        const ku = softKind(c, t, wx, wy - 1, iu), kl = softKind(c, t, wx - 1, wy, il);
        if (ku !== k || kl !== k) {
          const other = ku !== k ? ku : kl;
          if (RANK[other] > RANK[k]) col = k === PATH ? c.st.path[0] : k === GROUND ? c.st.g[0] : shade(col, 0.25);
          else if (k === GROUND2 && c.biome === 'gruenwald') col = c.st.g2[4];
        } else {
          const kd = softKind(c, t, wx, wy + 1, id);
          if (kd !== k && RANK[kd] > RANK[k] && k === PATH) col = c.st.path[4];
          else if (kd !== k && RANK[kd] < RANK[k]) col = k === GROUND2 ? c.st.g2[0] : k === GROUND ? c.st.g[1] : col;
        }
        buf[i] = col;
      }
    } else if (t === FLOOR) {
      for (let ly = 0; ly < TS; ly++) for (let lx = 0; lx < TS; lx++) { const i = (by + ly) * W + bx + lx; buf[i] = floorColor(c, wx0 + lx, wy0 + ly, i); }
      // weiche Nachbarn wachsen leicht über den Rand
      const over = (q: number): number => (q === GROUND ? st.g[1] : q === GROUND2 ? st.g2[1] : q === PATH ? st.path[1] : 0);
      for (let k = 0; k < TS; k++) {
        const j1 = 1 + (hash2(wx0 + k, wy0, seed + 70) % 3), j2 = 1 + (hash2(wx0, wy0 + k, seed + 71) % 3);
        if (over(tn)) for (let d = 0; d < j1 - 1; d++) buf[(by + d) * W + bx + k] = over(tn);
        if (over(ts)) for (let d = 0; d < j1 - 1; d++) buf[(by + 15 - d) * W + bx + k] = over(ts);
        if (over(tw)) for (let d = 0; d < j2 - 1; d++) buf[(by + k) * W + bx + d] = over(tw);
        if (over(te)) for (let d = 0; d < j2 - 1; d++) buf[(by + k) * W + bx + 15 - d] = over(te);
      }
    } else if (t === WALL) {
      const face = !wallish(ts);
      if (face) {
        const wOpen = !wallish(tw) , eOpen = !wallish(te);
        for (let ly = 0; ly < TS; ly++) for (let lx = 0; lx < TS; lx++) { const i = (by + ly) * W + bx + lx; buf[i] = wallFace(c, wx0 + lx, wy0 + ly, lx, ly, i, wOpen, eOpen); }
        // Lippe: Kanten zu offenen Seiten
        const topR = map.dungeon ? st.top : st.cliffTop;
        if (!(st.face === 'thicket' && !map.dungeon)) {
          if (!wallish(tn)) for (let lx = 0; lx < TS; lx++) buf[by * W + bx + lx] = topR[0];
          if (wOpen) for (let ly = 0; ly < 2; ly++) buf[(by + ly) * W + bx] = topR[0];
          if (eOpen) for (let ly = 0; ly < 2; ly++) buf[(by + ly) * W + bx + 15] = topR[0];
        }
      } else {
        const open = (q: number) => !wallish(q);
        // Nachbar "offen" heißt auch: Nachbar ist eine Frontflächen-Wand? Nein – nur echte Nicht-Wände.
        const nb = (open(tn) ? 1 : 0) | (open(tw) ? 2 : 0) | (open(te) ? 4 : 0) | (open(tnw) ? 8 : 0) | (open(tne) ? 16 : 0);
        for (let ly = 0; ly < TS; ly++) for (let lx = 0; lx < TS; lx++) { const i = (by + ly) * W + bx + lx; buf[i] = wallTop(c, wx0 + lx, wy0 + ly, lx, ly, i, nb); }
      }
    } else if (t === BRIDGE) {
      const vertical = (tw === LIQUID || te === LIQUID) && !(tn === LIQUID && ts === LIQUID) ? true : tn === BRIDGE || ts === BRIDGE;
      for (let ly = 0; ly < TS; ly++) for (let lx = 0; lx < TS; lx++) buf[(by + ly) * W + bx + lx] = bridgeColor(c, wx0 + lx, wy0 + ly, lx, ly, vertical);
    } else if (t === VOID) {
      for (let ly = 0; ly < TS; ly++) for (let lx = 0; lx < TS; lx++) { const h = rnd2(wx0 + lx, wy0 + ly, seed); buf[(by + ly) * W + bx + lx] = h > 0.996 ? mix(st.voidC, st.top[2], 0.5) : st.voidC; }
    } else if (t === LIQUID) {
      const land = (q: number) => q !== LIQUID && q !== BRIDGE;
      const ln = land(tn), ls = land(ts), lw = land(tw), le = land(te);
      const any = ln || ls || lw || le || land(tnw) || land(tne) || land(tsw) || land(tse) || tn === BRIDGE || tw === BRIDGE || te === BRIDGE || ts === BRIDGE;
      if (any) for (let ly = 0; ly < TS; ly++) for (let lx = 0; lx < TS; lx++) {
        const wx = wx0 + lx, wy = wy0 + ly, i = (by + ly) * W + bx + lx;
        const j = c.nB[i] * 2.4;
        let d = 99, top = false;
        if (ln) { d = ly; top = true; }
        if (ls && 15 - ly < d) { d = 15 - ly; top = false; }
        if (lw && lx < d) { d = lx; top = false; }
        if (le && 15 - lx < d) { d = 15 - lx; top = false; }
        if (!ln && !lw && land(tnw)) { const q = Math.hypot(lx, ly); if (q < d) { d = q; top = false; } }
        if (!ln && !le && land(tne)) { const q = Math.hypot(15 - lx, ly); if (q < d) { d = q; top = false; } }
        if (!ls && !lw && land(tsw)) { const q = Math.hypot(lx, 15 - ly); if (q < d) { d = q; top = false; } }
        if (!ls && !le && land(tse)) { const q = Math.hypot(15 - lx, 15 - ly); if (q < d) { d = q; top = false; } }
        let col = 0;
        if (top) {
          const wallAbove = tn === WALL || tn === VOID;
          if (wallAbove) { col = d < 2 ? alpha(INK, 120) : d < 4 ? alpha(INK, 60) : 0; }
          else if (d < 1 + j * 0.6) col = softEdgeColor(c, tn, wx, wy, i);
          else if (d < 3 + j * 0.6) col = st.bank[1];
          else if (d < 5 + j * 0.6) col = st.bank[0];
          else if (d < 6 + j * 0.6) col = alpha(INK, 90);
          else if (d < 7 + j * 0.6 && rnd2(wx >> 1, wy, seed + 80) > 0.45) col = st.foam;
        } else if (d < 99) {
          if (d < 0.6 + j * 0.5) col = st.bank[0];
          else if (d < 1.6 + j * 0.5) col = c.biome === 'glut' ? st.bank[2] : alpha(INK, 100);
          else if (d < 2.6 + j * 0.5 && rnd2(wx >> 1, wy >> 1, seed + 81) > 0.5) col = st.foam;
        }
        // Brückenschatten
        if (!col) {
          if (tn === BRIDGE && ly < 3) col = alpha(INK, ly < 2 ? 110 : 60);
          else if (tw === BRIDGE && lx < 2) col = alpha(INK, 80);
        }
        if (col) buf[i] = col;
      }
    }
    // Schlagschatten der Wände (Licht von oben links)
    if (t !== WALL && t !== VOID) {
      const faceAbove = tn === WALL;
      if (faceAbove && t !== LIQUID) for (let ly = 0; ly < 5; ly++) for (let lx = 0; lx < TS; lx++) { const i = (by + ly) * W + bx + lx; buf[i] = shade(buf[i], ly < 3 ? 0.36 : 0.18); }
      if (tw === WALL && t !== LIQUID) for (let ly = faceAbove ? 5 : 0; ly < TS; ly++) for (let lx = 0; lx < 3; lx++) { const i = (by + ly) * W + bx + lx; buf[i] = shade(buf[i], lx < 2 ? 0.28 : 0.14); }
      if (!faceAbove && tw !== WALL && tnw === WALL && t !== LIQUID) for (let ly = 0; ly < 4; ly++) for (let lx = 0; lx < 3 - (ly >> 1); lx++) { const i = (by + ly) * W + bx + lx; buf[i] = shade(buf[i], 0.2); }
    }
  }
  // Details
  for (let cy = c0y; cy < c0y + ch; cy++) for (let cx = c0x; cx < c0x + cw; cx++) {
    const t = tileAt(map, cx, cy);
    if (t === GROUND || t === GROUND2 || t === PATH) details(c, t, cx, cy);
  }
  return { buf, W, H };
}
function softEdgeColor(c: Ctx, tn: number, wx: number, wy: number, i: number): number {
  if (isSoft(tn)) return shade(softColor(c, tn, wx, wy, i), 0.12);
  if (tn === FLOOR) return c.st.floor[1];
  return c.st.bank[1];
}

let scratch: HTMLCanvasElement | null = null;
export function paintGround(ctx: CanvasRenderingContext2D, map: PaintableMap, tx0: number, ty0: number, tx1: number, ty1: number): void {
  tx0 = Math.max(0, Math.floor(tx0)); ty0 = Math.max(0, Math.floor(ty0)); tx1 = Math.min(map.w, Math.ceil(tx1)); ty1 = Math.min(map.h, Math.ceil(ty1));
  if (tx1 <= tx0 || ty1 <= ty0) return;
  const CH = 32;
  if (!scratch) { scratch = document.createElement('canvas'); scratch.width = CH * TS; scratch.height = CH * TS; }
  const sctx = scratch.getContext('2d')!;
  const smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  for (let cy = ty0; cy < ty1; cy += CH) for (let cx = tx0; cx < tx1; cx += CH) {
    const cw = Math.min(CH, tx1 - cx), ch = Math.min(CH, ty1 - cy);
    const { buf, W, H } = paintChunk(map, cx, cy, cw, ch);
    sctx.putImageData(new ImageData(new Uint8ClampedArray(buf.buffer as ArrayBuffer), W, H), 0, 0);
    ctx.clearRect(cx * TS, cy * TS, W, H);
    ctx.drawImage(scratch, 0, 0, W, H, cx * TS, cy * TS, W, H);
  }
  ctx.imageSmoothingEnabled = smooth;
}

// ================================================================ Flüssigkeiten (4 Frames, 32x32, nahtlos)
import { Px } from './draw';
const TAU = Math.PI * 2;
function liquidFrame(biome: BiomeId, f: number): Px {
  const p = new Px(32, 32), ph = (f / 4) * TAU;
  const wrap = (v: number) => ((v % 32) + 32) % 32;
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const u = (x / 32) * TAU, v = (y / 32) * TAU;
    let col: number;
    if (biome === 'glut') {
      const s = Math.sin(u + 2 * Math.sin(v + ph)) + Math.sin(2 * v - u + Math.sin(2 * u - ph) * 1.2) + 0.5 * Math.sin(3 * u + 2 * v + ph);
      col = s > 1.5 ? P.fire[4] : s > 0.6 ? P.fire[3] : s > -0.5 ? P.fire[2] : s > -1.4 ? P.fire[1] : P.fire[0];
      const cr = Math.sin(2 * u - v + Math.sin(v * 2 + ph) * 0.8) + Math.sin(3 * v + u);
      if (cr > 1.55) col = cr > 1.8 ? P.ash[1] : P.ash[3];
    } else if (biome === 'schatten') {
      const s = Math.sin(u + Math.sin(v + ph) * 1.5) + Math.sin(2 * v + u + ph);
      col = s > 1.5 ? P.shadow[2] : s > 0.7 ? P.shadow[1] : s < -1.4 ? INK : P.shadow[0];
    } else {
      const R: Ramp = biome === 'gruenwald' ? [P.blue[1], mix(P.blue[1], P.blue[2], 0.6), P.blue[2], P.blue[3], P.blue[4]]
        : biome === 'kristall' ? [P.teal[0], mix(P.teal[0], P.teal[1], 0.5), P.teal[1], P.teal[2], P.teal[4]]
          : biome === 'frost' ? [P.ice[1], mix(P.ice[1], P.ice[2], 0.6), P.ice[2], P.ice[3], WHITE]
            : [P.forest[1], mix(P.forest[1], P.sand[1], 0.5), mix(P.forest[2], P.sand[2], 0.5), mix(P.green[3], P.sand[3], 0.5), P.sand[4]];
      const s = Math.sin(v * 2 + Math.sin(u + ph) * 1.4) + Math.sin(u + v + ph) * 0.6;
      col = s > 0.9 ? R[2] : s < -1 ? R[0] : R[1];
      // Glanzlicht-Striche auf Wellenkämmen
      const row = Math.floor(y / 8), yy = wrap(y + Math.round(2 * Math.sin(u + ph + row))) % 8;
      const dash = Math.sin(2 * u + row * 2.1 + ph * (row % 2 ? 1 : -1));
      if (yy === 2 && dash > 0.35) col = dash > 0.8 ? R[4] : R[3];
      else if (yy === 3 && dash > 0.6) col = R[2];
      if (biome === 'ruinen' && Math.sin(3 * u + 2 * v) + Math.sin(2 * u - 3 * v + ph) > 1.7) col = mix(P.green[2], P.sand[2], 0.3);
    }
    p.set(x, y, col);
  }
  if (biome === 'schatten' || biome === 'kristall') {
    for (let k = 0; k < (biome === 'schatten' ? 9 : 5); k++) {
      const h = hash2(k, 77, 5), x = wrap((h & 31) + (biome === 'schatten' ? f * 8 * (k % 2 ? 1 : 0) + (k % 2 ? 0 : f * 4) : 0)), y = wrap(((h >> 5) & 31) + (biome === 'schatten' && k % 3 === 0 ? f * 8 : 0));
      const tw = (f + k) % 4;
      const c1 = biome === 'schatten' ? (k % 3 ? P.violet[3] : P.pink[3]) : P.teal[4];
      if (tw === 0) { p.set(x, y, WHITE); p.set(wrap(x - 1), y, c1); p.set(wrap(x + 1), y, c1); p.set(x, wrap(y - 1), c1); p.set(x, wrap(y + 1), c1); }
      else if (tw !== 2) p.set(x, y, c1); else p.set(x, y, biome === 'schatten' ? P.violet[1] : P.teal[2]);
    }
  }
  if (biome === 'glut') { for (let k = 0; k < 3; k++) { const h = hash2(k, 78, 6), x = h & 31, y = (h >> 5) & 31, s = (f + k) % 4; if (s < 3) { p.set(x, y, WHITE); if (s > 0) { p.set(wrap(x + 1), y, P.fire[4]); p.set(x, wrap(y + 1), P.fire[4]); p.set(wrap(x - 1), y, P.fire[4]); p.set(x, wrap(y - 1), P.fire[4]); } } } }
  return p;
}
export function buildLiquids(): Record<BiomeId, HTMLCanvasElement[]> {
  const out = {} as Record<BiomeId, HTMLCanvasElement[]>;
  for (const b of ['gruenwald', 'kristall', 'glut', 'frost', 'ruinen', 'schatten'] as BiomeId[]) out[b] = [0, 1, 2, 3].map((f) => liquidFrame(b, f).toCanvas());
  return out;
}
