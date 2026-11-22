/**
 * Schattenreich – Bodenmaler v2 (Oberwelt „Die Kehrseite der Quelle“: die Unterseite der Welt, gemacht aus allem, was
 * die Quelle vergessen hat). Dungeon „Thron der Leere“: schatten_thron.ts · Stempel: schatten_stamps.ts ·
 * Farben: schatten_pal.ts · Leere: schatten_liquid.ts · Scherben-Voronoi: schatten_util.ts
 *
 * Leitidee: Alles ist SCHERBE. Der Boden sind dunkle Glasplatten, die leicht auseinander treiben; durch die Fugen (und
 * durch alles Halbtransparente) scheint die animierte Leere, die das Spiel unter die ganze Karte legt.
 *
 *   Boden      zerbrochene Obsidianplatten (Voronoi) mit Lichtkante, Haarrissen und Glanzstreifen; Fugen halbtransparent
 *              zur Leere, Stirnseite unter jeder Südkante; Magenta-Lichtadern wie Kintsugi; kalte und pflaumenwarme Zonen
 *   Boden 2    Felder aus blassem Erinnerungsstaub mit sanften Riffeln, Abdrücken (Fußspuren, Ringelreihen, Wagenspuren)
 *              und flach gemalten Geisterblumen
 *   Weg        schwebende Runen-Trittsteine: ganze Steine entscheiden über den Wegrand, Licht in den Fugen, Glyphen
 *   Wand       Schattenkristall-Massive: kantiger Umriss aus Prismenzellen, zwei Kacheln hohe Glasfront mit Facetten,
 *              Brechungen und verzerrten Spiegelungen, Prismenspitzen mit kaltweißem Randlicht
 *   Leere      der Boden bricht plattenweise ab: helle Randlinie, Stirnseite, davontreibende Bruchstücke
 *   Brücke     Lichtbrücke aus durchscheinenden Tafeln mit Runenborte;  Gefahr: kriechende Dunkelheit mit Augen
 */
import { INK, P, WHITE, alpha, hash2, mix, rnd2 } from '../palette';
import {
  BRIDGE, Chunk, GROUND2, HAZARD, LIQUID, PATH, SHADE, TS, VOID, WALL,
  allow, lut, rf, ri, seedAt, tileAt, type BiomePainter, type WallGeom,
} from './core';
import {
  CYG, DUST, GLASS, GLOW, MGG, PLATE, RIM, RIM2, SLAB, STAR, TAR, TOPG, VEIN, VOIDC,
  S_BRIDGE, S_DUST, S_FACE, S_GAP, S_GROUND, S_HAZ, S_PATH, S_PGAP, S_TOP, S_VOID,
} from './schatten_pal';
import { SS, initSchattenStamps } from './schatten_stamps';
import { Vor, seedCover } from './schatten_util';
import { bridgeDirs } from './kristall_util';
import { paintThron } from './schatten_thron';
import { schattenLiquid } from './schatten_liquid';

const L_WALL = lut(WALL, VOID), L_PATH = lut(PATH, BRIDGE), L_G2 = lut(GROUND2), L_HAZ = lut(HAZARD), L_LIQ = lut(LIQUID, BRIDGE), L_BRIDGE = lut(BRIDGE);
const A_SOLID = allow(S_GROUND, S_DUST, S_PATH), A_GROUND = allow(S_GROUND), A_DUST = allow(S_DUST), A_HAZ = allow(S_HAZ), A_VOID = allow(S_VOID), A_GAP = allow(S_GAP);
const A_UP = allow(S_GROUND, S_DUST, S_PATH, S_HAZ, S_GAP, S_PGAP, S_FACE, S_TOP), A_FACE = allow(S_FACE), A_TOP = allow(S_TOP), A_PATHS = allow(S_PATH, S_GROUND, S_DUST, S_GAP);
const A_FOOT = allow(S_GROUND, S_DUST, S_PATH, S_HAZ, S_GAP, S_PGAP, S_FACE);
/** begehbare, feste Oberflächen (tragen Randlicht zur Leere und Stirnseiten) */
const LAND = allow(S_GROUND, S_DUST, S_PATH, S_PGAP, S_HAZ);

const VP = new Vor(27, 19), VK = new Vor(10, 8), VS = new Vor(17, 13), VW = new Vor(13, 11), VF = new Vor(9, 15), VT = new Vor(15, 11);
/** acht Kipprichtungen der Platten */
const TX = [1, 0.7, 0, -0.7, -1, -0.7, 0, 0.7], TY = [0, 1, 1.4, 1, 0, -1, -1.4, -1];

/** Glyphen der Trittsteine (7×7: 2 = Lichtlinie, 1 = Schein). */
const GLYPHS = [
  ['..#..', '.#.#.', '#...#', '.#.#.', '..#..'], ['#...#', '#...#', '#####', '..#..', '..#..'], ['.###.', '#...#', '#.#.#', '#...#', '.###.'],
  ['#.#.#', '.#.#.', '..#..', '.#.#.', '#.#.#'], ['..#..', '..#..', '#####', '..#..', '.#.#.'], ['###..', '..#..', '..###', '..#..', '###..'],
  ['#..#.', '#.#..', '##...', '#.#..', '#..#.'], ['####.', '...#.', '.#.#.', '.###.', '.....'],
].map((rows) => {
  const g = new Uint8Array(49);
  for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) if (rows[y][x] === '#') g[(y + 1) * 7 + x + 1] = 2;
  for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
    if (g[y * 7 + x]) continue;
    if ((x > 0 && g[y * 7 + x - 1] === 2) || (x < 6 && g[y * 7 + x + 1] === 2) || (y > 0 && g[y * 7 + x - 7] === 2) || (y < 6 && g[y * 7 + x + 7] === 2)) g[y * 7 + x] = 1;
  }
  return g;
});
/** Prismenspitzen entlang der Abbruchkante: Breitenfolge (px), periodisch nach 56 px. */
const TIPW = [7, 5, 9, 6, 8, 5, 10, 6];
const TIP_ID = new Uint8Array(56), TIP_X = new Float32Array(56);
{ let x = 0; TIPW.forEach((w, k) => { for (let j = 0; j < w; j++, x++) { TIP_ID[x] = k; TIP_X[x] = (j + 0.5 - w / 2) / (w / 2); } }); }

interface SF {
  nA: Float32Array; nB: Float32Array; nC: Float32Array; nL: Float32Array; nM: Float32Array; nV: Float32Array; nG: Float32Array; nZ1: Float32Array; nZ2: Float32Array; nK: Float32Array;
  cHaz: Float32Array; pe: Float32Array; gw: Float32Array; pid: Uint32Array; pdx: Int8Array; pdy: Int8Array; pl: Int8Array;
  wallM: Uint8Array; geom: WallGeom; dWall: Float32Array; dTop: Float32Array; dVoid: Float32Array; dLand: Float32Array;
}
const cl7 = (t: number): number => (t < 0 ? 0 : t > 6 ? 6 : t);
const i8 = (v: number): number => { const r = Math.round(v); return r < -127 ? -127 : r > 127 ? 127 : r; };

function paintOverworld(c: Chunk): void {
  initSchattenStamps();
  const { W, H, kind, buf, map } = c, n = W * H, seed = c.seed;
  // ---------------------------------------------------------------- 1. Felder
  const nA = c.noise(6, 61), nB = c.noise(13, 62), nC = c.noise(3.3, 63), nL = c.noise(37, 64), nM = c.noise(21, 65), nV = c.noise(17, 66), nG = c.noise(29, 67);
  const nZ1 = c.noise(96, 68), nZ2 = c.noise(41, 69), nK = c.noise(53, 70);
  const cWall = c.cover(L_WALL, 'w'), cPath = c.cover(L_PATH, 'p'), cG2 = c.cover(L_G2, 'm'), cHaz = c.cover(L_HAZ, 'h'), cLiq = c.cover(L_LIQ, 'l');
  const bm = c.cellMask(L_BRIDGE), wm = c.cellMask(L_WALL);
  const wallM = new Uint8Array(n), notWall = new Uint8Array(n), liqM = new Uint8Array(n), notLiq = new Uint8Array(n);
  const pe = new Float32Array(n), gwA = new Float32Array(n), pid = new Uint32Array(n), pdx = new Int8Array(n), pdy = new Int8Array(n), pl = new Int8Array(n);
  const wallC = new Map<number, number>(), pathC = new Map<number, number>(), liqC = new Map<number, number>();
  // ---------------------------------------------------------------- 2. Oberflächenart (scherbenweise)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, wx = c.x0 + x, wy = c.y0 + y;
    if (bm[i]) { kind[i] = S_BRIDGE; continue; }
    const cw = cWall[i];
    if (cw > 0.1) {
      let w = cw > 0.95;
      if (!w) {
        VW.at(wx, wy, seed + 3100);
        w = seedCover(VW, wallC, map, L_WALL, 0.16) > 0.5;
        if (!w && wm[i]) { const px = wx & 15, py = wy & 15; w = px > 1 && px < 14 && py > 1 && py < 14; }
      }
      if (w) { wallM[i] = 1; continue; }
    }
    const cl = cLiq[i];
    if (cPath[i] > 0.02 && cl < 0.92) {
      VS.at(wx, wy, seed + 3110);
      const sc = seedCover(VS, pathC, map, L_PATH, 0.1);
      if (sc > 0.5 || (sc > 0.38 && VS.e > 3.4)) {
        kind[i] = sc > 0.5 && VS.e < 0.85 ? S_PGAP : S_PATH;
        pe[i] = VS.e; pid[i] = VS.id; pdx[i] = i8(VS.dx); pdy[i] = i8(VS.dy); pl[i] = sc > 0.5 ? VS.lit : VS.lit + 8;
        continue;
      }
    }
    VP.at(wx, wy, seed + 3120);
    pe[i] = VP.e; pid[i] = VP.id; pdx[i] = i8(VP.dx); pdy[i] = i8(VP.dy); pl[i] = VP.lit;
    const g = nG[i], gw = 0.5 + (g > 0.5 ? (g - 0.5) * 8 : 0) + (cl > 0.08 ? cl * 2.2 : 0);
    gwA[i] = gw;
    let k: number;
    if (cl >= 0.92 || (cl > 0.3 && seedCover(VP, liqC, map, L_LIQ, 0.12) > 0.56)) k = S_VOID;
    else {
      const e1 = nA[i] - 0.5, e2 = nB[i] - 0.5, d2 = cG2[i] + e2 * 0.3 + e1 * 0.14 - 0.5;
      if (cHaz[i] + e2 * 0.3 + e1 * 0.2 > 0.5) k = S_HAZ;
      else if (d2 > 0.04 || (d2 > 0 && ((wx + wy) & 1))) k = S_DUST;
      else k = VP.e < gw ? S_GAP : S_GROUND;
    }
    kind[i] = k;
    if (k === S_VOID) liqM[i] = 1;
  }
  const geom = c.resolveWalls(wallM, 32, 6, 6);
  for (let i = 0; i < n; i++) { if (wallM[i]) kind[i] = geom.fv[i] ? S_FACE : S_TOP; notWall[i] = 1 - wallM[i]; notLiq[i] = 1 - liqM[i]; }
  const dWall = c.dist(wallM), dTop = c.dist(notWall), dVoid = c.dist(liqM), dLand = c.dist(notLiq);
  const f: SF = { nA, nB, nC, nL, nM, nV, nG, nZ1, nZ2, nK, cHaz, pe, gw: gwA, pid, pdx, pdy, pl, wallM, geom, dWall, dTop, dVoid, dLand };

  // ---------------------------------------------------------------- 3. Grundfarbe
  const dirs = bridgeDirs(map);
  for (let y = c.iy0; y < c.iy1; y++) for (let x = c.ix0; x < c.ix1; x++) {
    const i = y * W + x, wx = c.x0 + x, wy = c.y0 + y, h = rnd2(wx, wy, seed), k = kind[i];
    let col = 0;
    switch (k) {
      case S_GROUND: col = groundCol(c, f, i, wx, wy, h); break;
      case S_GAP: col = gapCol(c, f, i, h); break;
      case S_DUST: col = dustCol(f, i, h); break;
      case S_HAZ: col = hazCol(f, i, h); break;
      case S_PATH: case S_PGAP: col = pathCol(c, f, i, wx, wy, h); break;
      case S_VOID: col = voidCol(c, f, i, wx); break;
      case S_TOP: col = topCol(c, f, i, wx, wy, h); break;
      case S_FACE: col = faceCol(c, f, i, wx, wy, h); break;
      default: col = bridgeCol(c, dirs, wx, wy);
    }
    if (k === S_GROUND || k === S_DUST || k === S_GAP) {
      // Fangarme der kriechenden Dunkelheit
      const ch = cHaz[i];
      if (ch > 0.06) {
        const reach = ch > 0.46 ? 1 : (ch - 0.06) / 0.4, tv = Math.abs(nV[i] * 0.6 + nA[i] * 0.4 - 0.5);
        if (tv < 0.005 + reach * 0.045) col = tv < reach * 0.02 ? TAR[0] : TAR[1];
      }
    }
    // helle Randlinie, wo fester Boden an die Leere grenzt
    if (LAND[k] && dVoid[i] < 1.45) col = h < 0.18 ? RIM2 : RIM;
    buf[i] = col;
  }
  // ---------------------------------------------------------------- 4. Bodendecker
  groundCover(c, f);
  // ---------------------------------------------------------------- 5. Licht und Schatten
  const sh = c.wallShadow(wallM, dWall, 13);
  for (let y = c.iy0; y < c.iy1; y++) for (let x = c.ix0; x < c.ix1; x++) {
    const i = y * W + x, s = sh[i];
    if (s <= 0 || kind[i] === S_BRIDGE || kind[i] === S_VOID) continue;
    const j = s + (nC[i] - 0.5) * 0.25;
    c.darken(i, j > 0.66 ? 0.5 : j > 0.36 ? 0.32 : 0.16);
  }
  // ---------------------------------------------------------------- 6. Aufbauten
  structures(c, f);
}

// ------------------------------------------------------------------ Obsidianplatten
function zoneOf(f: SF, i: number): number {
  return f.nZ1[i] * 0.6 + f.nZ2[i] * 0.4 + ((f.pid[i] >>> 24) / 255 - 0.5) * 0.1 > 0.52 ? 1 : 0;
}
function groundCol(c: Chunk, f: SF, i: number, wx: number, wy: number, h: number): number {
  const id = f.pid[i], R = PLATE[zoneOf(f, i)], dx = f.pdx[i], dy = f.pdy[i], lit = f.pl[i], e = f.pe[i] - f.gw[i], dv = f.dVoid[i], seed = c.seed;
  let t = 2 + ((id >>> 4) % 3);
  // gekippte Glasplatte: ein gerades Band quer über die Scherbe ist heller oder dunkler
  const ta = (id >>> 7) & 7, s = dx * TX[ta] + dy * TY[ta];
  if (s > 4) t += (id >>> 11) & 1 ? 1 : -1;
  if (dv < 2.6) t++;
  if (e < 1.25) return R[cl7(lit > 0 ? t + 2 : lit < 0 ? t - 2 : t - 1)];
  // Lichtadern (Kintsugi): gewundene Linie aus Magenta und Weiß, die an den Fugen abreißt
  const vb = Math.abs(f.nL[i] * 0.55 + f.nV[i] * 0.45 - 0.5), vz = f.nK[i] > 0.42;
  if (vz) {
    if (vb < 0.014) return h < 0.35 ? WHITE : VEIN[4];
    if (vb < 0.04) return mix(R[cl7(t)], VEIN[2], vb < 0.027 ? 0.62 : 0.3);
  }
  // Haarrisse; in der Nähe einer Ader leuchten einzelne Risse mit
  VK.at(wx, wy, seed + 3130);
  const brittle = f.nM[i] > 0.58 || f.dWall[i] < 13 || dv < 9;
  if (VK.e < 0.5) {
    if (vz && vb < 0.12 && (VK.id & 1)) return h < 0.2 ? VEIN[4] : VEIN[3];
    if (brittle) return R[cl7(t - 2)];
  } else if (brittle && VK.e < 1.4 && VK.lit > 0) t++;
  else if (f.dWall[i] < 13 && ((VK.id >>> 5) & 3) === 0) t--;
  // Glanzstreifen
  if (id & 2) { const sv = (((dx + dy * 1.4 + ((id >>> 8) & 15)) % 19) + 19) % 19; if (sv < 1.2) t++; }
  // dünner Schleier aus Erinnerungsstaub
  const md = f.nB[i] * 0.3 + f.nZ2[i] * 0.3 + f.nM[i] * 0.2 + ((id >>> 14) & 63) / 315;
  if (md > 0.72 && e > 2.2) return h < 0.3 ? DUST[1] : h > 0.96 ? DUST[4] : DUST[2];
  if (h < 0.035) t--; else if (h > 0.972) t++;
  if (h > 0.9955) return DUST[5];
  return R[cl7(t)];
}
function gapCol(c: Chunk, f: SF, i: number, h: number): number {
  const R = PLATE[zoneOf(f, i)], W = c.W, kind = c.kind;
  if (f.gw[i] < 0.95) return LAND[kind[i - W]] && !LAND[kind[i + W]] ? R[1] : R[0];
  // Stirnseite der Platte darüber, darunter die Leere
  if (LAND[kind[i - W]]) return R[1];
  if (LAND[kind[i - 2 * W]]) return h < 0.5 ? R[0] : mix(R[0], VOIDC, 0.5);
  if (h > 0.985) return STAR[h > 0.996 ? 1 : 0];
  if (Math.abs(f.nV[i] - 0.5) < 0.05) return alpha(mix(VOIDC, VEIN[1], 0.42), 215);
  return alpha(VOIDC, 170);
}
function dustCol(f: SF, i: number, h: number): number {
  const q = (f.nL[i] * 0.5 + f.nZ2[i] * 0.3 + f.nG[i] * 0.2) * 11, fr = q - Math.floor(q);
  let t = f.nZ2[i] * 0.4 + f.nM[i] * 0.35 + f.nB[i] * 0.25 > 0.57 ? 3 : 4;
  // lange, sanfte Riffel: ein heller Kamm, dahinter ein schmaler Schatten
  if (fr < 0.09) t++; else if (fr > 0.94) t--;
  if (f.dVoid[i] < 2.6) t++;
  if (h < 0.04) t--; else if (h > 0.965) t++;
  if (h > 0.997) return WHITE;
  return DUST[t < 1 ? 1 : t > 6 ? 6 : t];
}
function hazCol(f: SF, i: number, h: number): number {
  const ed = f.cHaz[i] + (f.nB[i] - 0.5) * 0.3 + (f.nA[i] - 0.5) * 0.2 - 0.5;
  if (ed < 0.035) return TAR[0];
  const g = Math.abs(f.nB[i] - 0.5), v = f.nA[i] * 0.5 + f.nC[i] * 0.5, gl = f.nL[i] > 0.38;
  // zäher Glanz: schmale Lichtbögen auf dem Teer
  if (gl && g < 0.016) return TAR[4];
  if (gl && g < 0.045) return TAR[3];
  if (v > 0.66) return TAR[2];
  if (h > 0.994) return TAR[4];
  return v < 0.42 ? TAR[0] : TAR[1];
}

// ------------------------------------------------------------------ Runen-Trittsteine
function pathCol(c: Chunk, f: SF, i: number, wx: number, wy: number, h: number): number {
  const W = c.W, kind = c.kind, seed = c.seed;
  if (kind[i] === S_PGAP) {
    // Fuge: oben die Stirnseite des Steins, darunter Licht
    if (kind[i - W] === S_PATH && kind[i + W] === S_PGAP) return SLAB[0];
    const lp = f.nM[i] * 0.6 + f.nB[i] * 0.4;
    return lp > 0.6 ? (h < 0.3 ? GLOW[3] : GLOW[2]) : lp > 0.5 ? GLOW[1] : (hash2(wx >> 1, wy >> 1, seed + 3150) & 7) === 0 ? GLOW[1] : GLOW[0];
  }
  let lit = f.pl[i], frag = false;
  if (lit > 4) { frag = true; lit -= 8; }
  const id = f.pid[i], e = f.pe[i], dx = f.pdx[i], dy = f.pdy[i];
  let t = 3 + ((id >>> 4) % 3) - (frag ? 1 : 0);
  if ((frag ? e - 3.4 : e - 0.85) < 1.3) return SLAB[cl7(lit > 0 ? t + 2 : lit < 0 ? t - 2 : t - 1)];
  if (!frag && (id >>> 9) % 5 < 3 && e > 2.4) {
    const gx = dx + 3, gy = dy + 3;
    if (gx >= 0 && gx < 7 && gy >= 0 && gy < 7) {
      const g = GLYPHS[(id >>> 13) % GLYPHS.length][gy * 7 + gx];
      if (g === 2) return (id >>> 20) & 1 ? (h < 0.3 ? WHITE : GLOW[3]) : h < 0.5 ? GLOW[2] : GLOW[1];
      if (g === 1) return mix(SLAB[t], GLOW[1], (id >>> 20) & 1 ? 0.5 : 0.3);
    }
  }
  if ((id >>> 6) % 4 === 0) { VK.at(wx, wy, seed + 3131); if (VK.e < 0.5) return SLAB[cl7(t - 2)]; }
  if (id & 2) { const sv = (((dx + dy * 1.4 + ((id >>> 8) & 15)) % 17) + 17) % 17; if (sv < 1.2) t++; }
  if (h < 0.045) t--; else if (h > 0.97) t++;
  return SLAB[cl7(t)];
}

// ------------------------------------------------------------------ Leere
function voidCol(c: Chunk, f: SF, i: number, wx: number): number {
  const W = c.W, kind = c.kind;
  // Stirnseite der abgebrochenen Platte (4 px Glasdicke), darunter ein Schatten in der Leere
  for (let k = 1; k <= 6; k++) {
    const kk = kind[i - k * W];
    if (kk === S_VOID) continue;
    if (!LAND[kk]) break;
    if (k > 4) return alpha(INK, k === 5 ? 125 : 60);
    const R = kk === S_PATH || kk === S_PGAP ? SLAB : kk === S_HAZ ? TAR : PLATE[zoneOf(f, i - k * W)], hc = hash2(wx >> 1, 9, c.seed + 3160);
    if (kk === S_HAZ) return R[k < 3 ? 1 : 0];
    if (k === 1) return R[2];
    if (k === 2) return hc % 9 === 0 ? VEIN[2] : R[1];
    if (k === 3) return hc % 4 === 0 ? R[0] : R[1];
    return R[0];
  }
  // große, ruhende Schleier brechen die Wiederholung der Sternenkachel
  const big = f.nZ2[i] * 0.5 + f.nG[i] * 0.5;
  if (big > 0.63) return alpha(P.violet[1], 30);
  if (big < 0.37) return alpha(INK, 70);
  return 0;
}

// ------------------------------------------------------------------ Schattenkristall
function topCol(c: Chunk, f: SF, i: number, wx: number, wy: number, h: number): number {
  const g = f.geom, ts = g.ts[i], tn = g.tn[i], d = f.dTop[i], seed = c.seed;
  // Prismenspitzen ragen über die Abbruchkante
  if (ts <= 9) {
    const o = ((wx % 56) + 56) % 56, tid = TIP_ID[o] + Math.floor(wx / 56) * 8, ax = TIP_X[o];
    const thr = (2 + (hash2(tid, 5, seed + 3171) % 7)) * (1 - Math.abs(ax));
    if (ts <= thr) return ts > thr - 1 ? RIM : ax < 0 ? GLASS[5] : GLASS[3];
    if (ts === 1) return GLASS[4];
  }
  // kaltes Randlicht an Nord- und Westkante des Massivs
  const lit = tn <= 2 || !f.wallM[i - 1] || !f.wallM[i - 2];
  if (lit) return tn === 1 || !f.wallM[i - 1] ? (h < 0.22 ? RIM2 : RIM) : GLASS[5];
  if (d <= 1.01 && ts === 255) return TOPG[0];
  const fade = (ts < 255 && ts * 2 < d ? ts * 2 : d) + (f.nB[i] - 0.5) * 10 + (f.nL[i] - 0.5) * 8;
  // tief im Massiv verliert sich das Glas in der Leere
  if (fade > 36 || (fade > 29 && ((wx + wy) & 1))) return h > 0.9975 ? STAR[0] : alpha(VOIDC, 205);
  VT.at(wx, wy, seed + 3180);
  // Prismen von oben: ein Grat teilt jede Zelle in eine helle und eine dunkle Dachfläche
  const ra = (VT.id >>> 9) & 7, rs = VT.dx * TX[ra] + VT.dy * TY[ra];
  let t = (fade < 9 ? 3 : fade < 20 ? 2 : 1);
  if (VT.e < 0.7) t = 0;
  else if (rs > -0.7 && rs < 0.7) t += 2;
  else if (rs * (TX[ra] * 0.55 + TY[ra] * 0.6) < 0) t++;
  else t--;
  if (h > 0.996 && fade < 20) return RIM2;
  return TOPG[t < 0 ? 0 : t > 5 ? 5 : t];
}
function faceCol(c: Chunk, f: SF, i: number, wx: number, wy: number, h: number): number {
  const g = f.geom, v = g.fv[i], fh = g.fh[i], top = fh - v, seed = c.seed;
  if (top === 0) return h < 0.15 ? RIM2 : RIM;
  if (top === 1) return h < 0.4 ? GLASS[5] : GLASS[6];
  // hohe, schmale Facetten
  VF.at(wx, wy, seed + 3190);
  const id = VF.id;
  let t = 3 + ((id >>> 4) % 2), col: number;
  if (top < fh * 0.3) t++;
  if (v < fh * 0.25) t--;
  if (VF.e < 0.6) col = GLASS[cl7(VF.lit > 0 ? t + 2 : VF.lit < 0 ? t - 2 : t - 1)];
  else if (VF.e < 1.7 && VF.lit > 0) col = GLASS[cl7(t + 1)];
  else {
    // Brechungen im Inneren: schräge Lichtfäden in Magenta und Cyan
    const m = (id >>> 8) % 10, s = Math.abs(VF.dx + VF.dy * 0.55 + ((id >>> 12) & 3) - 1.5);
    if (m === 0 && s < 1.9) col = s < 0.8 ? MGG[3] : MGG[2];
    else if (m === 1 && s < 1.7) col = s < 0.8 ? CYG[3] : CYG[1];
    else if (m === 2 && s < 0.7) col = GLASS[cl7(t + 2)];
    else col = h > 0.988 ? RIM2 : GLASS[cl7(VF.dx < -1.6 ? t + 1 : t)];
  }
  if (top === 2) col = mix(col, SHADE, 0.4);
  if (v <= 2) col = mix(col, SHADE, v === 1 ? 0.6 : 0.42);
  else if (v <= 5) col = mix(col, SHADE, 0.2);
  if (!f.wallM[i - 1]) col = mix(col, RIM, 0.55);
  else if (!f.wallM[i + 1] || !f.wallM[i + 2]) col = mix(col, SHADE, 0.45);
  return col;
}

// ------------------------------------------------------------------ Lichtbrücke
function bridgeCol(c: Chunk, dirs: Uint8Array, wx: number, wy: number): number {
  const map = c.map, cx = wx >> 4, cy = wy >> 4, lx = wx & 15, ly = wy & 15, seed = c.seed;
  const dir = dirs[cy * map.w + cx] || 1;
  const liq = (x: number, y: number): boolean => tileAt(map, x, y) === LIQUID;
  const sideA = dir === 1 ? liq(cx, cy - 1) : liq(cx - 1, cy), sideB = dir === 1 ? liq(cx, cy + 1) : liq(cx + 1, cy);
  const u = dir === 1 ? wx : wy, across = dir === 1 ? ly : lx, m = Math.min(sideA ? across : 99, sideB ? 15 - across : 99);
  // Runenborte an den Rändern zur Leere
  if (m === 0) return GLOW[2];
  if (m === 1) return GLOW[4];
  if (m <= 4) {
    const k = Math.floor(u / 6), o = u - k * 6, hr = hash2(k, dir, seed + 3200);
    if (o < 5 && ((hr >>> ((m - 2) * 5 + o)) & 1)) return GLOW[3];
    return alpha(GLOW[0], 225);
  }
  if (m === 5) return GLOW[1];
  // Kante zum festen Boden: eine schlichte Lichtleiste
  const land = (x: number, y: number): boolean => { const q = tileAt(map, x, y); return q !== LIQUID && q !== BRIDGE; };
  if ((across === 0 && !sideA && (dir === 1 ? land(cx, cy - 1) : land(cx - 1, cy))) || (across === 15 && !sideB && (dir === 1 ? land(cx, cy + 1) : land(cx + 1, cy)))) return GLOW[1];
  // durchscheinende Tafeln
  const pk = Math.floor((u + 3) / 11), pi = u + 3 - pk * 11, row = dir === 1 ? cy : cx, hp = hash2(pk, row, seed + 3201);
  if (pi === 0) return alpha(GLOW[4], 215);
  if (pi === 10) return alpha(GLOW[0], 200);
  if ((((u + across * 2) % 13) + 13) % 13 === hp % 13) return alpha(WHITE, 215);
  return alpha(pi < 3 ? GLOW[3] : mix(GLOW[2], P.violet[4], 0.3), 160 + (hp >>> 8) % 3 * 22);
}

// ------------------------------------------------------------------ Bodendecker
function groundCover(c: Chunk, f: SF): void {
  const { W, kind } = c, seed = c.seed;
  c.cells((cx, cy) => {
    seedAt(cx, cy, seed + 3300);
    const x0 = cx * TS, y0 = cy * TS;
    // Abdrücke vergessener Leben im Staub
    {
      const wx = x0 + ri(16), wy = y0 + ri(16), r = rf(), i = (wy - c.y0) * W + (wx - c.x0);
      if (kind[i] === S_DUST) {
        if (r < 0.08) c.blitK(SS.foot[ri(SS.foot.length)], wx, wy, A_DUST);
        else if (r < 0.095) c.blitK(SS.ring[ri(SS.ring.length)], wx, wy, A_DUST);
        else if (r < 0.125) c.blitK(SS.wheel[ri(SS.wheel.length)], wx, wy, A_DUST);
      }
    }
    for (let k = 0; k < 8; k++) {
      const wx = x0 + ri(16), wy = y0 + ri(16), r = rf(), i = (wy - c.y0) * W + (wx - c.x0), kd = kind[i];
      const hv = hash2(wx, wy, seed + 3301);
      let q = r;
      if (kd === S_GROUND) {
        const nearWall = f.dWall[i] < 18;
        if ((q -= 0.035) < 0) c.blitK(SS.peb[hv % SS.peb.length], wx, wy, A_SOLID);
        else if ((q -= 0.05) < 0) c.blitK(SS.mote[hv % SS.mote.length], wx, wy, A_UP);
        else if ((q -= nearWall ? 0.06 : 0.012) < 0) c.blitK(SS.shard[hv % SS.shard.length], wx, wy, A_UP);
        else if ((q -= nearWall ? 0.05 : 0.015) < 0) c.blitK(SS.crack[hv % SS.crack.length], wx, wy, A_GROUND);
        else if ((q -= 0.003) < 0) c.blitK(SS.flower[hv % SS.flower.length], wx, wy, A_GROUND);
      } else if (kd === S_DUST) {
        if ((q -= 0.09) < 0) c.blitK(SS.flower[hv % SS.flower.length], wx, wy, A_DUST);
        else if ((q -= 0.03) < 0) c.blitK(SS.peb[hv % SS.peb.length], wx, wy, A_SOLID);
        else if ((q -= 0.05) < 0) c.blitK(SS.mote[hv % SS.mote.length], wx, wy, A_DUST);
      } else if (kd === S_GAP) {
        if (f.gw[i] > 1.6 && r < 0.12) c.blitK(SS.fragS[hv % SS.fragS.length], wx, wy, A_GAP);
      } else if (kd === S_PATH) {
        // die Ränder der Trittsteine zerfallen zu Flocken
        if (f.pl[i] > 4 && r < 0.5) c.blitK(SS.pmote[hv % SS.pmote.length], wx + ri(7) - 3, wy + ri(7) - 3, A_PATHS);
      } else if (kd === S_HAZ) {
        if (r < 0.1) c.blitK(SS.eye[hv % SS.eye.length], wx, wy, A_HAZ);
      } else if (kd === S_VOID) {
        // Bruchstücke treiben von der Kante fort: nah groß, weiter draußen klein
        const d = f.dLand[i];
        if (d > 4 && d < 13 && r < 0.14) c.blitK(SS.frag[hv % SS.frag.length], wx, wy, A_VOID);
        else if (d > 5 && d < 22 && r < 0.07) c.blitK(SS.fragS[hv % SS.fragS.length], wx, wy, A_VOID);
      } else if (kd === S_TOP) {
        const d = f.dTop[i];
        if (d > 5 && d < 26 && r < 0.03) c.blitK(SS.glint[hv % SS.glint.length], wx, wy, A_TOP);
      }
    }
  });
}

// ------------------------------------------------------------------ Aufbauten
function structures(c: Chunk, f: SF): void {
  const { W, kind, map } = c, seed = c.seed, g = f.geom;
  c.cells((cx, cy, t) => {
    const x0 = cx * TS, y0 = cy * TS;
    seedAt(cx, cy, seed + 3330);
    for (let k = 0; k < 3; k++) {
      const wx = x0 + ri(16), wy = y0 + ri(16), r = rf(), i = (wy - c.y0) * W + (wx - c.x0);
      if (kind[i] !== S_FACE) continue;
      const fv = g.fv[i], fromTop = g.fh[i] - fv;
      // verzerrte Spiegelungen im Glas; am Wandfuß splittert der Boden auf
      if (r < 0.1 && fv >= 10 && fromTop >= 10) c.blitK(SS.refl[ri(SS.refl.length)], wx, wy, A_FACE);
      else if (r < 0.42 && fv < 4) c.blitK(SS.cluster[ri(SS.cluster.length)], wx, wy + fv + 1, A_FOOT);
      else if (r < 0.6 && fv < 4) c.blitK(SS.shard[ri(SS.shard.length)], wx, wy + fv + 2, A_FOOT);
    }
    if (t !== BRIDGE) return;
    // Lichtschein unter der Brücke
    if (tileAt(map, cx, cy + 1) === LIQUID) for (let x = 0; x < 16; x++) for (let k = 0; k < 5; k++) c.setK(x0 + x, y0 + 16 + k, alpha(GLOW[1], k < 1 ? 150 : k < 3 ? 80 : 35), A_VOID);
    if (tileAt(map, cx + 1, cy) === LIQUID) for (let y = 0; y < 16; y++) for (let k = 0; k < 3; k++) c.setK(x0 + 16 + k, y0 + y, alpha(GLOW[1], k < 1 ? 110 : 45), A_VOID);
    if (tileAt(map, cx - 1, cy) === LIQUID) for (let y = 0; y < 16; y++) for (let k = 0; k < 3; k++) c.setK(x0 - 1 - k, y0 + y, alpha(GLOW[1], k < 1 ? 110 : 45), A_VOID);
  });
}

// ---------------------------------------------------------------------------------------------------- Maler
export const schatten: BiomePainter = {
  biome: 'schatten',
  paint(c) { if (c.map.dungeon) paintThron(c); else paintOverworld(c); },
  liquid: schattenLiquid,
};
