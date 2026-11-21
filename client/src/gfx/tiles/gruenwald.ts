/**
 * Grünwald – Bodenmaler v2 (Oberwelt). Vorlage für weitere Biome: Aufbau siehe Kopfkommentar von core.ts.
 * Der Dungeon „Wurzelgruft“ liegt in gruenwald_gruft.ts, die Motiv-Stempel in gruenwald_stamps.ts.
 *
 * Ablauf paintOverworld():
 *   1. Felder (Abdeckungen, Rauschen)            4. Bodendecker-Stempel (Büschel, Blüten, Laub, Kiesel …)
 *   2. Oberflächenart je Pixel (c.kind)          5. Licht: Wandschatten, Kontaktschatten
 *   3. Grundfarbe je Pixel im Kern               6. Aufbauten: Brückenbalken und -pfosten, Hängegras, Wurzeln, Ufersteine
 */
import { INK, P, alpha, hash2, mix, rnd2, vnoise } from '../palette';
import {
  BRIDGE, Chunk, FLOOR, GROUND2, HAZARD, LIQUID, PATH, SHADE, TS, VOID, WALL,
  allow, clamp, lut, mapCache, rf, ri, seedAt, tileAt, voro, V, type BiomePainter, type WallGeom,
} from './core';
import {
  DEEP, EARTH, F, FOAM, GRASS, HAZ_N, MEADOW, MOSS, PATHZ, PLANK, ROCK, TOPR, VOIDC, WET,
  S_BANK, S_BRIDGE, S_FACE, S_FLOOR, S_GRASS, S_HAZ, S_MEADOW, S_PATH, S_TOP, S_VOID, S_WATER,
} from './gruenwald_pal';
import { ST, initStamps } from './gruenwald_stamps';
import { paintGruft } from './gruenwald_gruft';
import { gruenwaldLiquid } from './gruenwald_liquid';
import type { PaintableMap } from '../spec';

const L_WALL = lut(WALL, VOID), L_VOID = lut(VOID), L_PATH = lut(PATH, BRIDGE), L_MEAD = lut(GROUND2), L_HAZ = lut(HAZARD);
const L_LIQ = lut(LIQUID, BRIDGE), L_BRIDGE = lut(BRIDGE), L_FLOOR = lut(FLOOR);

const A_GROUND = allow(S_GRASS, S_MEADOW, S_PATH, S_HAZ, S_BANK);
const A_GREEN = allow(S_GRASS, S_MEADOW, S_HAZ, S_BANK);
/** Büschel wachsen von ihrem Fußpunkt nach oben und dürfen alles überdecken, was dahinter liegt. */
const A_TUFT = allow(S_GRASS, S_MEADOW, S_HAZ, S_BANK, S_PATH, S_TOP, S_FACE, S_WATER);
const A_GRASSY = allow(S_GRASS, S_MEADOW, S_HAZ);
const A_PATH = allow(S_PATH);
const A_TOP = allow(S_TOP);
const A_WALL = allow(S_TOP, S_FACE);
const A_SHORE = allow(S_BANK, S_WATER);
const A_STONE = allow(S_BANK, S_WATER, S_GRASS, S_MEADOW, S_PATH);
const A_HAZ = allow(S_HAZ, S_GRASS, S_MEADOW, S_PATH);
const A_NOTBRIDGE = allow(S_GRASS, S_MEADOW, S_PATH, S_HAZ, S_BANK, S_WATER, S_FLOOR);

// ---------------------------------------------------------------------------------------------------- Brücken
/** Je Brückenzelle: 1 = Steg verläuft West–Ost (Bohlen liegen in N–S-Richtung), 2 = Steg verläuft Nord–Süd. */
export function bridgeDirs(map: PaintableMap): Uint8Array {
  return mapCache(map, 'bridgeDirs', () => {
    const { w, h, tiles } = map, out = new Uint8Array(w * h);
    for (let s = 0; s < tiles.length; s++) {
      if (tiles[s] !== BRIDGE || out[s]) continue;
      const comp: number[] = [s]; out[s] = 3;
      let ns = 0, ew = 0;
      for (let k = 0; k < comp.length; k++) {
        const i = comp[k], x = i % w, y = (i / w) | 0;
        if (tileAt(map, x, y - 1) === LIQUID) ns++;
        if (tileAt(map, x, y + 1) === LIQUID) ns++;
        if (tileAt(map, x - 1, y) === LIQUID) ew++;
        if (tileAt(map, x + 1, y) === LIQUID) ew++;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h && tiles[yy * w + xx] === BRIDGE && !out[yy * w + xx]) { out[yy * w + xx] = 3; comp.push(yy * w + xx); }
        }
      }
      for (const i of comp) out[i] = ns >= ew ? 1 : 2;
    }
    return out;
  });
}

// ---------------------------------------------------------------------------------------------------- Oberwelt
interface Fields {
  nA: Float32Array; nB: Float32Array; nC: Float32Array; nL: Float32Array; zone: Uint8Array;
  wallM: Uint8Array; geom: WallGeom; dWall: Float32Array; dTop: Float32Array; dLand: Float32Array; dShore: Float32Array; dPath: Float32Array;
  bankW: Float32Array; dWat: Float32Array;
}

function paintOverworld(c: Chunk): void {
  initStamps();
  const { W, H, kind, buf, map } = c, n = W * H, seed = c.seed;
  // ---------------------------------------------------------------- 1. Felder
  const nA = c.noise(6, 11), nB = c.noise(13, 12), nC = c.noise(3.3, 13), nL = c.noise(37, 14), nZ1 = c.noise(96, 15), nZ2 = c.noise(41, 16);
  const cWall = c.cover(L_WALL, 'w'), cVoid = c.cover(L_VOID, 'v'), cPath = c.cover(L_PATH, 'p'), cMead = c.cover(L_MEAD, 'm'), cHaz = c.cover(L_HAZ, 'h');
  const cLiq = c.cover(L_LIQ, 'l'), cFloor = c.cover(L_FLOOR, 'f');
  const bm = c.cellMask(L_BRIDGE);
  const wallM = new Uint8Array(n), liqM = new Uint8Array(n), notLiq = new Uint8Array(n), notWall = new Uint8Array(n);
  const wm = c.cellMask(L_WALL);
  for (let i = 0; i < n; i++) {
    const e1 = nA[i] - 0.5, e2 = nB[i] - 0.5, e3 = nC[i] - 0.5;
    // Wandkörper: Rand kräftig ausgefranst, aber der Kern jeder Wandzelle (10×10 px) bleibt garantiert Wand
    // (Ausbuchtungen nach außen bis ~6 px, Einbuchtungen nur ~2 px – so reißt keine Wand optisch auf)
    let nz = e2 * 0.44 + e1 * 0.2 + e3 * 0.06;
    if (nz < -0.1) nz = -0.1 + (nz + 0.1) * 0.2;
    let w = !bm[i] && cWall[i] + nz > 0.5 ? 1 : 0;
    if (!w && wm[i]) { const px = (c.x0 + (i % W)) & 15, py = (c.y0 + ((i / W) | 0)) & 15; if (px > 2 && px < 13 && py > 2 && py < 13) w = 1; }
    wallM[i] = w; notWall[i] = 1 - w;
    const l = !w && (bm[i] || cLiq[i] + e2 * 0.3 + e1 * 0.17 + e3 * 0.06 > 0.6) ? 1 : 0;
    liqM[i] = l; notLiq[i] = 1 - l;
  }
  const geom = c.resolveWalls(wallM, 32, 6, 6);
  const dWall = c.dist(wallM), dTop = c.dist(notWall), dLand = c.dist(notLiq), dShore = c.dist(liqM);
  const bankW = new Float32Array(n), zone = new Uint8Array(n);
  // ---------------------------------------------------------------- 2. Oberflächenart
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, e1 = nA[i] - 0.5, e2 = nB[i] - 0.5, e3 = nC[i] - 0.5;
    const zf = nZ1[i] * 0.6 + nZ2[i] * 0.4 + (dWall[i] > 28 ? 28 : dWall[i]) * 0.008 - 0.11 + e3 * 0.05;
    zone[i] = zf < 0.4 ? 0 : zf > 0.59 ? 2 : 1;
    let k: number;
    if (bm[i]) k = S_BRIDGE;
    else if (wallM[i]) k = geom.fv[i] ? S_FACE : cVoid[i] + e1 * 0.2 > 0.8 ? S_VOID : S_TOP;
    else if (liqM[i]) {
      const ny = y > 0 && y < H - 1 ? (dLand[i + W] - dLand[i - W]) * 0.5 : 0;
      const bar = nL[i] * 0.6 + nB[i] * 0.4 - 0.57;
      const bw = 3.4 + nA[i] * 1.8 + (ny > 0 ? ny * 3.6 : ny * 1.2) + (bar > 0 ? bar * 34 : 0);
      bankW[i] = bw;
      k = dLand[i] <= bw ? S_BANK : S_WATER;
    }
    else if (cFloor[i] > 0.5) k = S_FLOOR;
    else if (cPath[i] + e2 * 0.2 + e1 * 0.2 + e3 * 0.1 > 0.5) k = S_PATH;
    else if (cHaz[i] + e2 * 0.3 + e1 * 0.2 > 0.5) k = S_HAZ;
    else if (cMead[i] + e2 * 0.3 + e1 * 0.14 > 0.5) k = S_MEADOW;
    else k = S_GRASS;
    kind[i] = k;
  }
  const notPath = new Uint8Array(n), water = new Uint8Array(n);
  for (let i = 0; i < n; i++) { notPath[i] = kind[i] === S_PATH || kind[i] === S_BRIDGE ? 0 : 1; water[i] = kind[i] === S_WATER ? 1 : 0; }
  const dPath = c.dist(notPath), dWat = c.dist(water);
  const f: Fields = { nA, nB, nC, nL, zone, wallM, geom, dWall, dTop, dLand, dShore, dPath, bankW, dWat };

  // ---------------------------------------------------------------- 3. Grundfarbe
  const dirs = bridgeDirs(map);
  for (let y = c.iy0; y < c.iy1; y++) for (let x = c.ix0; x < c.ix1; x++) {
    const i = y * W + x, wx = c.x0 + x, wy = c.y0 + y, z = zone[i], h = rnd2(wx, wy, seed);
    let col = 0;
    switch (kind[i]) {
      case S_GRASS: {
        const v = nL[i] * 0.5 + nB[i] * 0.3 + nC[i] * 0.2;
        let t = v < 0.38 ? 0 : v < 0.47 ? 1 : v < 0.56 ? 2 : v < 0.65 ? 3 : 4;
        if (h < 0.03 && t > 0) t--; else if (h > 0.975 && t < 4) t++;
        col = GRASS[z][t];
        if (dShore[i] < 5 + nA[i] * 4) col = GRASS[z > 0 ? z - 1 : 0][t > 0 ? t - 1 : 0];
        const ku = kind[i - W], kd = kind[i + W];
        if (kd === S_PATH || kd === S_BANK) col = ST.tuftPal[z][0].d; else if (ku === S_PATH) col = GRASS[z][4];
        break;
      }
      case S_MEADOW: {
        const v = nL[i] * 0.4 + nB[i] * 0.35 + nC[i] * 0.25;
        let t = v < 0.36 ? 0 : v < 0.46 ? 1 : v < 0.56 ? 2 : v < 0.66 ? 3 : 4;
        if (h < 0.04 && t > 0) t--; else if (h > 0.96 && t < 4) t++;
        col = MEADOW[z][t];
        const kd = kind[i + W];
        if (kd === S_PATH || kd === S_BANK) col = ST.tuftPal[z][0].d;
        break;
      }
      case S_PATH: col = pathCol(c, f, i, wx, wy, z, h); break;
      case S_HAZ: {
        const v = nB[i] * 0.55 + nC[i] * 0.45;
        col = HAZ_N[v < 0.36 ? 0 : v < 0.5 ? 1 : v < 0.64 ? 2 : 3];
        if (h > 0.97) col = HAZ_N[3];
        break;
      }
      case S_FLOOR: {
        voro(wx, wy, 8, 7, seed + 22);
        const hv = (V.id >>> 16) / 65536, s = V.dx + V.dy;
        col = V.edge < 1 ? ROCK[0] : s < -2.4 ? ROCK[5] : s > 2.8 ? ROCK[1] : hv < 0.3 ? ROCK[2] : hv > 0.7 ? ROCK[4] : ROCK[3];
        if (V.edge < 1 && nB[i] > 0.56) col = MOSS[1];
        break;
      }
      case S_BANK: col = bankCol(c, f, i, wx, wy, z, h); break;
      case S_WATER: col = waterCol(c, f, i, wx, wy); break;
      case S_TOP: col = topCol(c, f, i, wx, wy, h); break;
      case S_FACE: col = faceCol(c, f, i, wx, wy, h); break;
      case S_BRIDGE: col = bridgeCol(c, dirs, wx, wy, h); break;
      default: col = h > 0.992 ? mix(VOIDC, F[1], 0.5) : VOIDC;
    }
    buf[i] = col;
  }

  // ---------------------------------------------------------------- 4. Bodendecker
  groundCover(c, f);
  // ---------------------------------------------------------------- 5. Licht und Schatten
  const sh = c.wallShadow(wallM, dWall, 14);
  for (let y = c.iy0; y < c.iy1; y++) for (let x = c.ix0; x < c.ix1; x++) {
    const i = y * W + x, s = sh[i];
    if (s <= 0 || kind[i] === S_BRIDGE) continue;
    // zwei harte Stufen mit ausgefranster Grenze statt weichem Verlauf
    const j = s + (nC[i] - 0.5) * 0.25;
    c.darken(i, j > 0.66 ? 0.44 : j > 0.36 ? 0.3 : 0.15);
  }
  // ---------------------------------------------------------------- 6. Aufbauten
  structures(c, f, dirs);
}

// ------------------------------------------------------------------ Weg
function pathCol(c: Chunk, f: Fields, i: number, wx: number, wy: number, z: number, h: number): number {
  const R = PATHZ[z === 2 ? 2 : 1], d = f.dPath[i], e = f.nA[i] - 0.5, W = c.W, kind = c.kind;
  const ku = kind[i - W], kl = kind[i - 1];
  // Grasnarbe wirft einen schmalen Schatten auf den tiefer liegenden Weg
  if (ku === S_GRASS || ku === S_MEADOW || ku === S_HAZ) return mix(R[0], INK, 0.18);
  if (kl === S_GRASS || kl === S_MEADOW) return R[0];
  if (d < 2.2 + e * 2.4) return h < 0.3 ? R[1] : R[0];
  if (d < 4.4 + e * 3.5) return h < 0.22 ? R[0] : h > 0.8 ? R[2] : R[1];
  // große ruhige Flecken statt Rauschen
  const v = f.nL[i] * 0.4 + f.nB[i] * 0.42 + f.nC[i] * 0.18;
  let t = v < 0.41 ? 2 : v > 0.57 ? 4 : 3;
  // heller, festgetretener Rücken in der Mitte
  if (d > 11 + f.nA[i] * 6 && t < 4) t++;
  // Fahrspuren: zwei dunklere Bänder entlang der Ränder
  const rut = d - (8.2 + (f.nB[i] - 0.5) * 3.5);
  if (rut > 0 && rut < 2.1 && f.nC[i] > 0.32) t = t > 2 ? t - 1 : 2;
  // wenige waagerechte Kratzer und Krümel
  const off = hash2(wy, 3, c.seed + 90) & 7, seg = (wx + off) >> 2, hd = rnd2(seg, wy, c.seed + 91);
  if (hd < 0.045) t = t > 2 ? t - 1 : 2; else if (hd > 0.962 && t < 5) t++;
  if (h > 0.992) t = 5; else if (h < 0.008) t = 1;
  return R[t];
}

// ------------------------------------------------------------------ Ufer und Wasser
function bankCol(c: Chunk, f: Fields, i: number, wx: number, wy: number, z: number, h: number): number {
  const d = f.dLand[i], dw = f.dWat[i], W = c.W;
  const ny = (f.dLand[i + W] - f.dLand[i - W]) * 0.5;
  if (ny < -0.3) {
    // Südufer: wir blicken von hinten über die Graskante – nur ein schmaler dunkler Saum
    if (d < 1.3) return ST.tuftPal[z][2].l;
    return dw > 1.3 ? (h < 0.3 ? EARTH[1] : EARTH[2]) : WET;
  }
  // Böschung mit sichtbarer Vorderseite: heller Graswulst → Schattenfuge → helle Erde → dunkle, nasse Erde
  if (d < 1.25) return ST.tuftPal[z][2].l;
  if (d < 2.3) return h < 0.35 ? ST.tuftPal[z][0].d : ST.tuftPal[z][0].m;
  if (dw <= 1.3) return h < 0.35 ? EARTH[0] : WET;
  if (dw <= 2.9) return h < 0.25 ? EARTH[1] : EARTH[2];
  // Kiesbank: wo das Ufer breit ausläuft, liegt heller Sand und Kies
  if (dw > 4.4 && d > 3.4) { const hd = rnd2(wx >> 1, wy, c.seed + 97); return hd < 0.14 ? PATHZ[1][2] : hd > 0.8 ? PATHZ[1][5] : hd > 0.5 ? PATHZ[1][4] : PATHZ[1][3]; }
  const off = hash2(wy, 6, c.seed + 95) & 3, hd = rnd2((wx + off) >> 2, wy, c.seed + 96);
  return hd < 0.2 ? EARTH[4] : hd > 0.82 ? EARTH[2] : EARTH[3];
}
function waterCol(c: Chunk, f: Fields, i: number, wx: number, wy: number): number {
  const bw = f.bankW[i], d = f.dLand[i], dw = d - bw, W = c.W;
  const ny = (f.dLand[i + W] - f.dLand[i - W]) * 0.5;
  if (ny > 0.35) {
    // Schlagschatten der Böschung, davor die helle Wasserkante
    if (dw < 1.4) return alpha(INK, 125);
    if (dw < 2.7) return alpha(DEEP, 95);
    if (dw < 3.8 && rnd2(wx >> 1, wy, 77) > 0.3) return alpha(FOAM, 165);
  } else if (dw < 1.1 && rnd2(wx >> 1, wy >> 1, 78) > 0.2) return alpha(FOAM, 185);
  else if (dw < 2.1 && ny > -0.3) return alpha(DEEP, 60);
  const dd = d + (f.nB[i] - 0.5) * 9 + (f.nL[i] - 0.5) * 8;
  if (dd > 26) return alpha(DEEP, 92);
  if (dd > 16) return alpha(DEEP, 52);
  // helles Flachwasser am Ufersaum
  if (dw < 4.5 + f.nA[i] * 4) return alpha(P.teal[4], 62);
  return 0;
}

// ------------------------------------------------------------------ Wand: Oberseite
function topCol(c: Chunk, f: Fields, i: number, wx: number, wy: number, h: number): number {
  const g = f.geom, d = f.dTop[i], ts = g.ts[i];
  // Abbruchkante nach Süden: heller Grassaum, der über die Front hängt
  if (ts <= 3) return ts === 1 ? ST.tuftPal[1][2].l : h > 0.6 ? ST.tuftPal[1][2].t : GRASS[1][3 + (h < 0.3 ? 1 : 0)];
  if (ts < 255 && ts <= 4 + f.nA[i] * 3) return GRASS[1][h < 0.25 ? 1 : 2];
  // Nord- und Westkanten fangen das Licht, Ostkanten bekommen eine dunkle Kontur
  const lit = g.tn[i] <= 2 || !f.wallM[i - 1] || !f.wallM[i - 2];
  if (lit) return (g.tn[i] === 1 || !f.wallM[i - 1]) && f.nC[i] > 0.3 ? GRASS[2][4] : h > 0.45 ? GRASS[1][4] : GRASS[1][3];
  if (d <= 1.01 && ts === 255) return mix(F[0], INK, 0.2);
  if (!f.wallM[i + 2] || !f.wallM[i + 3]) return TOPR[4];
  // schattiges Gras am Rand → dunkler Waldboden im Inneren
  const v = f.nB[i] * 0.5 + f.nC[i] * 0.3 + f.nL[i] * 0.2, deep = clamp((d - 20) / 22, 0, 1);
  let t = Math.round(6.3 - deep * 5.6 + (v - 0.5) * 2.6);
  if (h < 0.04) t--; else if (h > 0.965) t++;
  return TOPR[t < 0 ? 0 : t > 7 ? 7 : t];
}

// ------------------------------------------------------------------ Wand: Front (Felsbank mit Erde, Moos und Grasbehang)
function faceCol(c: Chunk, f: Fields, i: number, wx: number, wy: number, h: number): number {
  const g = f.geom, v = g.fv[i], fh = g.fh[i], seed = c.seed;
  // Grasbehang an der Oberkante
  const hang = 2 + (hash2(wx >> 1, 7, seed + 104) % 3) + (hash2(wx, 9, seed + 105) % 9 === 0 ? 3 : 0);
  const top = fh - v;
  if (top < hang) {
    if (top === hang - 1) return hash2(wx, 5, seed + 106) & 1 ? ST.tuftPal[1][0].d : ST.tuftPal[1][0].m;
    return top === 0 ? GRASS[1][h < 0.5 ? 2 : 3] : h < 0.4 ? GRASS[1][1] : GRASS[1][2];
  }
  // Schichten: Zeilen leicht gewellt, Blockbreiten unregelmäßig
  const yy = wy + Math.round((f.nB[i] - 0.5) * 6), row = Math.floor(yy / 7), ry = yy - row * 7;
  const xx = wx + (hash2(row, 0, seed + 101) % 12), k0 = Math.floor(xx / 12);
  let k = k0, start = k0 * 12 + (hash2(k0, row, seed + 102) % 6);
  if (xx < start) { k = k0 - 1; start = k * 12 + (hash2(k, row, seed + 102) % 6); }
  const end = (k + 1) * 12 + (hash2(k + 1, row, seed + 102) % 6), lx = xx - start, bw = end - start;
  const hb = rnd2(k, row, seed + 103), hb2 = rnd2(k, row, seed + 107);
  const damp = f.nB[i] * 0.6 + f.nC[i] * 0.4, en = f.nL[i] * 0.62 + f.nB[i] * 0.38;
  let col: number;
  if (en > 0.6 && hb > 0.22) {
    // Erdreich zwischen den Felsbänken (organisch begrenzt, einzelne Steine bleiben stecken)
    const off = hash2(wy, 4, seed + 109) & 3, hd = rnd2((wx + off) >> 2, wy, seed + 110);
    col = en < 0.617 ? EARTH[0] : hd < 0.16 ? EARTH[1] : hd > 0.86 ? EARTH[3] : EARTH[2];
    if (h > 0.98) col = ROCK[4]; else if (h < 0.03) col = EARTH[0];
  } else {
    // Moos liegt als Polster über den Blöcken – Fugen und Lichtkanten bleiben lesbar
    const mossy = damp + (hb2 > 0.72 ? 0.12 : 0) + (v / fh) * 0.1 > 0.7;
    const base = hb < 0.14 ? 1 : hb < 0.5 ? 2 : hb < 0.84 ? 3 : 4;
    if (ry === 6 || lx === bw - 1) col = mossy && h < 0.5 ? MOSS[0] : ROCK[0];
    else if (ry === 0) col = mossy ? MOSS[3] : ROCK[Math.min(5, base + 2)];
    else if (lx === 0) col = mossy ? MOSS[2] : ROCK[base + 1];
    else if (ry >= 4 && lx >= bw - 3) col = mossy ? MOSS[0] : ROCK[base];
    else col = mossy ? MOSS[h < 0.25 ? 2 : 1] : ROCK[base + 1 - (ry === 5 ? 1 : 0)];
    // Risse in einzelnen Blöcken
    if (hb2 < 0.16 && bw > 8 && Math.abs(lx - 3 - ry - ((hash2(k, row, 5) & 3))) < 1 && ry > 0 && ry < 6) col = ROCK[0];
    if (!mossy) { if (h < 0.035 && ry !== 6) col = ROCK[base]; else if (h > 0.975 && ry !== 6) col = ROCK[5]; }
  }
  // Schatten unter dem Grasbehang, feuchter dunkler Fuß
  if (top === hang || (top === hang + 1 && h < 0.5)) col = mix(col, SHADE, 0.42);
  if (v <= 2) col = mix(col, SHADE, v === 1 ? 0.5 : 0.28);
  else if (v <= 4 && h < 0.5) col = mix(col, SHADE, 0.2);
  // seitliche Enden: links Lichtkante, rechts Schattenkante
  if (!f.wallM[i - 1]) col = mix(col, ROCK[5], 0.45);
  else if (!f.wallM[i + 1] || !f.wallM[i + 2]) col = mix(col, SHADE, 0.4);
  return col;
}

// ------------------------------------------------------------------ Brücke
function bridgeCol(c: Chunk, dirs: Uint8Array, wx: number, wy: number, h: number): number {
  const map = c.map, cx = wx >> 4, cy = wy >> 4, lx = wx & 15, ly = wy & 15, seed = c.seed;
  const dir = dirs[cy * map.w + cx] || 1;
  const liq = (x: number, y: number): boolean => tileAt(map, x, y) === LIQUID;
  const nL = liq(cx, cy - 1), sL = liq(cx, cy + 1), wL = liq(cx - 1, cy), eL = liq(cx + 1, cy);
  // Geländerbalken an den Längsseiten des Stegs, an Stufen nur ein schmales Randbrett
  if (dir === 1) {
    if (nL && ly < 5) return beam(ly, wx, seed, false);
    if (sL && ly > 10) return beam(ly - 11, wx, seed + 1, false);
    if (wL && lx < 2) return lx === 0 ? PLANK[0] : PLANK[5];
    if (eL && lx > 13) return lx === 15 ? PLANK[0] : PLANK[2];
  } else {
    if (wL && lx < 4) return beam(lx, wy, seed + 2, true);
    if (eL && lx > 11) return beam(lx - 12, wy, seed + 3, true);
    if (nL && ly < 2) return ly === 0 ? PLANK[0] : PLANK[5];
    if (sL && ly > 13) return ly === 15 ? PLANK[0] : PLANK[2];
  }
  // Schwelle am Brückenkopf (Landseite)
  const open = (x: number, y: number): boolean => { const q = tileAt(map, x, y); return q !== LIQUID && q !== BRIDGE; };
  if (dir === 1) {
    if (lx < 3 && open(cx - 1, cy)) return beam(lx + 1, wy, seed + 4, true);
    if (lx > 12 && open(cx + 1, cy)) return beam(lx === 15 ? 0 : lx === 13 ? 1 : 2, wy, seed + 5, true);
  } else {
    if (ly < 3 && open(cx, cy - 1)) return beam(ly + 1, wx, seed + 4, false);
    if (ly > 12 && open(cx, cy + 1)) return beam(ly === 15 ? 4 : ly - 12, wx, seed + 5, false);
  }
  // Bohlen quer zur Laufrichtung
  const u = dir === 1 ? wx + 2 : wy + 2, vv = dir === 1 ? wy : wx;
  const pk = Math.floor(u / 5), pi = u - pk * 5, hp = rnd2(pk, dir, seed + 120), hq = rnd2(pk, dir, seed + 123);
  if (pi === 4) return alpha(PLANK[0], 215);
  let t = hp < 0.2 ? 2 : hp < 0.55 ? 3 : hp < 0.85 ? 4 : 5;
  // Stoß in der Bohle
  const joint = 7 + (hash2(pk, 3, seed + 121) % 34), vj = ((vv % 48) + 48) % 48;
  if (hq > 0.5 && vj === joint) return PLANK[1];
  if (hq > 0.5 && vj > joint) t = t > 2 ? t - 1 : t + 1;
  if (pi === 0) t = Math.min(6, t + 1);
  else if (pi === 3) t--;
  // Maserung längs der Bohle, Astlöcher
  if (rnd2(u, (vv + (hash2(pk, 1, seed) & 7)) >> 3, seed + 122) < 0.16) t--;
  if (h < 0.03) t--;
  let col = PLANK[Math.max(1, t)];
  const kn = hash2(pk, 9, seed + 124) % 61;
  if (hq < 0.3 && pi === 2 && (vj === kn || vj === kn + 1)) col = PLANK[1];
  // Nagelköpfe neben den Balken und am Stoß
  const nearBeam = dir === 1 ? (nL && ly === 6) || (sL && ly === 9) : (wL && lx === 5) || (eL && lx === 10);
  const nail = nearBeam || (hq > 0.5 && Math.abs(vj - joint) === 2);
  if (nail && pi === 2) col = PLANK[0];
  else if (nail && pi === 1) col = PLANK[6];
  // Schatten des Nord-/Westbalkens auf den Bohlen
  if (dir === 1 ? nL && (ly === 5 || (ly === 6 && pi !== 2 && pi !== 1)) : wL && lx === 4) col = mix(col, SHADE, ly === 6 ? 0.2 : 0.42);
  return col;
}
function beam(k: number, along: number, seed: number, vertical: boolean): number {
  // k = 0..4 quer zum Balken (vertikale Balken: 0..3)
  const g = rnd2(along >> 2, k, seed + 130);
  if (vertical) return k === 0 ? PLANK[0] : k === 1 ? PLANK[6] : k === 2 ? (g < 0.25 ? PLANK[3] : PLANK[4]) : PLANK[1];
  return k === 0 ? PLANK[0] : k === 1 ? (g < 0.15 ? PLANK[5] : PLANK[6]) : k === 2 ? (g < 0.2 ? PLANK[3] : PLANK[4]) : k === 3 ? (g < 0.3 ? PLANK[2] : PLANK[3]) : PLANK[0];
}

// ------------------------------------------------------------------ Bodendecker
const SX = new Int32Array(16), SY = new Int32Array(16), SR = new Float32Array(16);
function groundCover(c: Chunk, f: Fields): void {
  const { W, kind } = c, seed = c.seed;
  // Büschel (pro Zelle nach y sortiert, damit vordere die hinteren überdecken)
  c.cells((cx, cy) => {
    seedAt(cx, cy, seed + 200);
    const N = 12;
    for (let k = 0; k < N; k++) {
      const x = cx * TS + ri(16), y = cy * TS + ri(16), r = rf();
      let j = k;
      while (j > 0 && SY[j - 1] > y) { SX[j] = SX[j - 1]; SY[j] = SY[j - 1]; SR[j] = SR[j - 1]; j--; }
      SX[j] = x; SY[j] = y; SR[j] = r;
    }
    for (let k = 0; k < N; k++) {
      const wx = SX[k], wy = SY[k], r = SR[k], i = (wy - c.y0) * W + (wx - c.x0), kd = kind[i], z = f.zone[i];
      const hv = hash2(wx, wy, seed + 201);
      if (kd === S_GRASS) {
        // Dichte schwankt: dichte Horste wechseln mit ruhigeren Rasenstellen
        const dens = 0.42 + 0.56 * clamp((f.nB[i] * 0.6 + f.nA[i] * 0.4 - 0.3) * 2.4, 0, 1);
        if (r > dens) continue;
        const q = r / dens;
        // Tonklasse folgt den großen Farbflecken: dunkle Büschel in dunklen Flecken, helle in hellen
        const v = f.nL[i] * 0.5 + f.nB[i] * 0.3 + (q - 0.5) * 0.4;
        const cls = v < 0.36 ? 0 : v > 0.6 ? 2 : 1;
        if (q > 0.93) c.blitK(ST.clump[z][hv % ST.clump[z].length], wx, wy, A_TUFT);
        else if (q > 0.895) c.blitK(ST.plant[z][hv % ST.plant[z].length], wx, wy, A_GRASSY);
        else { const set = ST.tuft[z][cls]; c.blitK(set[hv % set.length], wx, wy, A_TUFT); }
      } else if (kd === S_MEADOW) {
        const v = f.nL[i] * 0.4 + f.nB[i] * 0.3 + (r - 0.5) * 0.4;
        const cls = v < 0.38 ? 0 : v > 0.56 ? 2 : 1;
        const set = r < 0.14 ? ST.tuft[z][2] : ST.tall[z][cls];
        c.blitK(set[hv % set.length], wx, wy, A_TUFT);
      } else if (kd === S_PATH) {
        const d = f.dPath[i];
        // Graszungen kriechen vom Rand herein, in der Mitte nur vereinzelte Halme
        if (d < 3.5 ? r < 0.8 : d < 7 ? r < 0.25 : r < 0.02) { const set = d < 3.5 && r < 0.5 ? ST.tuft[z][1] : ST.tiny[z]; c.blitK(set[hv % set.length], wx, wy, A_GROUND); }
        // Grasinseln auf breiten Plätzen
        else if (d > 12 && r > 0.993) { c.blitK(ST.tuft[z][1][hv % 14], wx - 3, wy - 1, A_PATH); c.blitK(ST.tuft[z][2][(hv >>> 4) % 14], wx + 3, wy, A_PATH); c.blitK(ST.clump[z][(hv >>> 8) % 8], wx, wy + 2, A_PATH); c.blitK(ST.tiny[z][(hv >>> 12) % 8], wx - 5, wy + 3, A_PATH); }
      } else if (kd === S_TOP) {
        // Gras auf dem Rand der Geländestufe, nach innen ausdünnend
        const d = f.dTop[i];
        if (d > 2 && d < 14 && r < 0.75 - d * 0.045) { const set = ST.tuft[0][r < 0.3 ? 0 : 1]; c.blitK(set[hv % set.length], wx, wy, A_TOP); }
      } else if (kd === S_HAZ) {
        if (r < 0.3) { const set = ST.tuft[0][0]; c.blitK(set[hv % set.length], wx, wy, A_GRASSY); }
      } else if (kd === S_BANK) {
        if (f.dLand[i] < 2.6 && r < 0.85) { const set = ST.tuft[z][r < 0.4 ? 0 : 1]; c.blitK(set[hv % set.length], wx, wy, A_GREEN); }
      }
    }
  });
  // Einzeldetails
  c.cells((cx, cy) => {
    seedAt(cx, cy, seed + 210);
    const x0 = cx * TS, y0 = cy * TS;
    // Blüten wachsen in Flecken; die Farbe wechselt gebietsweise
    const fam = Math.floor(vnoise(cx / 6.5, cy / 6.5, seed + 211) * 3.999 + rf() * 0.7) % 4;
    const pf = clamp((vnoise(cx / 3.7, cy / 3.7, seed + 213) - 0.5) * 3.4, 0, 1);
    for (let k = 0; k < 6; k++) {
      const wx = x0 + ri(16), wy = y0 + ri(16), r = rf(), r2 = rf(), i = (wy - c.y0) * W + (wx - c.x0), kd = kind[i], z = f.zone[i];
      const hv = hash2(wx, wy, seed + 212);
      if (kd === S_GRASS) {
        const nearWall = f.dWall[i] < 22;
        let q = r;
        if ((q -= 0.012 + pf * 0.075) < 0) flowerCluster(c, wx, wy, fam, hv, 3 + (hv % 4), false);
        else if ((q -= 0.006 + pf * 0.03) < 0) c.blitK(ST.flower[fam][hv % ST.flower[fam].length], wx, wy, A_GREEN);
        else if ((q -= 0.04) < 0) c.blitK(ST.clover[z][hv % ST.clover[z].length], wx, wy, A_GRASSY);
        else if ((q -= nearWall ? 0.12 : 0.035) < 0) c.blitK(ST.leaf[hv % ST.leaf.length], wx, wy, A_GROUND);
        else if ((q -= nearWall ? 0.03 : 0.012) < 0) c.blitK(ST.pebble[hv % ST.pebble.length], wx, wy, A_GROUND);
        else if ((q -= nearWall ? 0.02 : 0) < 0) c.blitK(ST.twig[hv % ST.twig.length], wx, wy, A_GROUND);
        else if ((q -= z === 0 ? 0.012 : 0) < 0) c.blitK(ST.shroom[hv % ST.shroom.length], wx, wy, A_GRASSY);
        else if (f.dShore[i] < 9 && q < 0.2) c.blitK(ST.pebble[hv % ST.pebble.length], wx, wy, A_GROUND);
      } else if (kd === S_MEADOW) {
        let q = r;
        if ((q -= 0.05 + pf * 0.12) < 0) flowerCluster(c, wx, wy, fam, hv, 3 + (hv % 4), true);
        else if ((q -= 0.08 + pf * 0.16) < 0) c.blitK(ST.flowerTall[(fam + (r2 < 0.2 ? 1 + (hv & 1) : 0)) % 4][hv % 4], wx, wy, A_GREEN);
        else if ((q -= 0.08) < 0) c.blitK(ST.seed[z][hv % ST.seed[z].length], wx, wy, A_GREEN);
        else if ((q -= 0.03) < 0) c.blitK(ST.clover[z][hv % ST.clover[z].length], wx, wy, A_GRASSY);
      } else if (kd === S_PATH) {
        const d = f.dPath[i];
        let q = r;
        if ((q -= 0.035) < 0) c.blitK(ST.pebble[hv % ST.pebble.length], wx, wy, A_PATH);
        else if ((q -= 0.1) < 0) c.blitK(ST.grit[hv % ST.grit.length], wx, wy, A_PATH);
        else if ((q -= d > 7 ? 0.008 : 0) < 0) c.blitK(ST.pebbleL[hv % ST.pebbleL.length], wx, wy, A_PATH);
        else if ((q -= d > 9 ? 0.005 : 0) < 0) c.blitK(ST.puddle[hv % ST.puddle.length], wx, wy, A_PATH);
        else if ((q -= d < 6 ? 0.03 : 0.006) < 0) c.blitK(ST.leaf[hv % ST.leaf.length], wx, wy, A_GROUND);
        else if ((q -= d > 5 ? 0.012 : 0) < 0) c.blitK(ST.crack[hv % ST.crack.length], wx, wy, A_PATH);
      } else if (kd === S_TOP) {
        if (f.dTop[i] < 6) continue;
        if (r < 0.2) c.blitK(ST.litter[hv % ST.litter.length], wx, wy, A_TOP);
        else if (r < 0.32) c.blitK(ST.fern[hv % ST.fern.length], wx, wy, A_TOP);
        else if (r < 0.4) c.blitK(ST.mossBlob[hv % ST.mossBlob.length], wx, wy, A_TOP);
        else if (r < 0.44) c.blitK(ST.pebbleDark[hv % ST.pebbleDark.length], wx, wy, A_TOP);
      } else if (kd === S_HAZ) {
        if (r < 0.2) c.blitK(ST.leaf[hv % ST.leaf.length], wx, wy, A_GRASSY);
      }
    }
    // Wurzeln am Waldrand
    if (rf() < 0.16) {
      const wx = x0 + ri(16), wy = y0 + ri(16), i = (wy - c.y0) * W + (wx - c.x0);
      if (kind[i] === S_GRASS && f.dWall[i] < 9 && f.dWall[i] > 2) c.blitK(ST.root[ri(ST.root.length)], wx, wy, A_GRASSY);
    }
  });
  // Dornengestrüpp
  c.cells((cx, cy, t) => {
    if (t !== HAZARD) return;
    seedAt(cx, cy, seed + 220);
    const x0 = cx * TS, y0 = cy * TS;
    // die Ranken dürfen über den Zellrand wuchern, aber nur von Zellen aus, deren Mitte wirklich Gestrüpp ist
    if (c.kindAt(x0 + 8, y0 + 8) !== S_HAZ) return;
    c.blitK(ST.bramble[ri(ST.bramble.length)], x0 + 4 + ri(8), y0 + 8 + ri(5), A_HAZ);
    if (rf() < 0.55) c.blitK(ST.brambleS[ri(ST.brambleS.length)], x0 + 2 + ri(12), y0 + 14 + ri(3), A_HAZ);
  });
}
function flowerCluster(c: Chunk, wx: number, wy: number, fam: number, hv: number, n: number, tall: boolean): void {
  for (let k = 0; k < n; k++) {
    const hh = hash2(hv, k, 41), dx = (hh % 13) - 6, dy = ((hh >>> 5) % 9) - 4;
    const set = tall && (hh >>> 12) % 3 ? ST.flowerTall[fam] : ST.flower[fam];
    c.blitK(set[(hh >>> 9) % set.length], wx + dx, wy + dy, A_GREEN);
  }
}

// ------------------------------------------------------------------ Aufbauten
function structures(c: Chunk, f: Fields, dirs: Uint8Array): void {
  const { W, kind, map } = c, seed = c.seed, g = f.geom;
  c.cells((cx, cy, t) => {
    const x0 = cx * TS, y0 = cy * TS;
    seedAt(cx, cy, seed + 230);
    // Wandfronten: Wurzeln, Ranken, Moospolster – am oberen Rand der Front verankert
    for (let k = 0; k < 3; k++) {
      const wx = x0 + ri(16), wy = y0 + ri(16), r = rf(), i = (wy - c.y0) * W + (wx - c.x0);
      if (kind[i] !== S_FACE) continue;
      // (Reichweite: nur von Zellen aus verankern, die höchstens 12 px unter der Oberkante liegen → ≤ BLEED)
      const fromTop = g.fh[i] - g.fv[i];
      if (fromTop <= 12 && r < 0.36) { if (g.fh[i] >= 20 && wy - fromTop - y0 <= 3) c.blitK(ST.faceRoot[ri(ST.faceRoot.length)], wx, wy - fromTop + 3, A_WALL); }
      else if (fromTop <= 12 && r < 0.75) c.blitK(ST.vine[ri(ST.vine.length)], wx, wy - fromTop + 1, A_WALL);
      else if (r < 0.75 && g.fv[i] < 5) c.blitK(ST.tuft[0][1][ri(ST.tuft[0][1].length)], wx, wy + g.fv[i], A_NOTBRIDGE);
      else if (r < 0.2) c.blitK(ST.faceMoss[ri(ST.faceMoss.length)], wx, wy, A_WALL);
    }
    // Ufersteine an der Wasserlinie
    if (t === LIQUID) {
      seedAt(cx, cy, seed + 231);
      for (let k = 0; k < 3; k++) {
        const wx = x0 + ri(16), wy = y0 + ri(16), r = rf(), i = (wy - c.y0) * W + (wx - c.x0);
        const dw = f.dLand[i] - f.bankW[i];
        if (kind[i] === S_BANK && r < 0.42) c.blitK(ST.stone[ri(ST.stone.length)], wx, wy, A_STONE);
        else if (kind[i] === S_WATER && dw < 5 && r < 0.2) c.blitK(ST.stoneWet[ri(ST.stoneWet.length)], wx, wy, A_SHORE);
        else if (kind[i] === S_WATER && dw < 9 && r < 0.1) c.blitK(ST.ripple[ri(ST.ripple.length)], wx, wy, A_SHORE);
      }
    }
    if (t !== BRIDGE) return;
    // Brücke: Stirnseite der Bohlen + Schlagschatten auf dem Wasser, Pfosten an den Balkenenden
    const liq = (x: number, y: number): boolean => tileAt(map, x, y) === LIQUID;
    const br = (x: number, y: number): boolean => tileAt(map, x, y) === BRIDGE;
    const nL = liq(cx, cy - 1), sL = liq(cx, cy + 1), wL = liq(cx - 1, cy), eL = liq(cx + 1, cy);
    if (sL) for (let x = 0; x < 16; x++) {
      const wx = x0 + x, u = wx + 2, pi = u - Math.floor(u / 5) * 5;
      const dir = dirs[cy * map.w + cx];
      c.setK(wx, y0 + 16, dir === 1 && pi === 4 ? PLANK[0] : PLANK[2], A_SHORE);
      c.setK(wx, y0 + 17, dir === 1 && pi === 4 ? PLANK[0] : PLANK[1], A_SHORE);
      c.setK(wx, y0 + 18, PLANK[0], A_SHORE);
      for (let k = 0; k < 6; k++) c.setK(wx + (k >> 1), y0 + 19 + k, alpha(INK, k < 2 ? 125 : k < 4 ? 85 : 45), A_SHORE);
    }
    if (eL) for (let y = 0; y < 16; y++) for (let k = 0; k < 4; k++) c.setK(x0 + 16 + k, y0 + y + 2, alpha(INK, k < 2 ? 100 : 55), A_SHORE);
    const post = ST.post, dir = dirs[cy * map.w + cx];
    // Pfosten: wo ein Geländerbalken endet (Brückenkopf oder Stufe)
    // Pfosten nur, wo ein Geländerbalken am Brückenkopf oder frei über dem Wasser endet – nicht an inneren Stufen
    const end = (x: number, y: number): boolean => !br(x, y);
    if (dir === 1) {
      if (nL && end(cx - 1, cy)) c.blit(post[0], x0 + 2, y0 + 5);
      if (nL && end(cx + 1, cy)) c.blit(post[0], x0 + 13, y0 + 5);
      if (sL && end(cx - 1, cy)) c.blit(post[1], x0 + 2, y0 + 17);
      if (sL && end(cx + 1, cy)) c.blit(post[1], x0 + 13, y0 + 17);
    } else {
      if (wL && end(cx, cy - 1)) c.blit(post[0], x0 + 2, y0 + 6);
      if (eL && end(cx, cy - 1)) c.blit(post[0], x0 + 13, y0 + 6);
      if (wL && end(cx, cy + 1)) c.blit(post[1], x0 + 2, y0 + 16);
      if (eL && end(cx, cy + 1)) c.blit(post[1], x0 + 13, y0 + 16);
    }
  });
}

// ---------------------------------------------------------------------------------------------------- Maler
export const gruenwald: BiomePainter = {
  biome: 'gruenwald',
  paint(c) { if (c.map.dungeon) paintGruft(c); else paintOverworld(c); },
  liquid: gruenwaldLiquid,
};
