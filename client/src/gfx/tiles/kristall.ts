/**
 * Kristallhöhlen – Bodenmaler v2 (Oberwelt „Das singende Dunkel“: eine weite Naturhöhle).
 * Dungeon „Tiefe Geode“: kristall_geode.ts · Stempel: kristall_stamps.ts · Farben: kristall_pal.ts · Wasser: kristall_liquid.ts
 *
 *   Boden      geschichtete Schieferplatten (Höhenstufen mit Lichtkante und Stirnseite), Risse, Sedimentlinsen, nasse
 *              Zonen mit Pfützen, Kristallgrus; drei Gesteinszonen (Schiefer, Glimmerschiefer, Sinter)
 *   Boden 2    Flechtenpolster mit Leuchtpilzen und Kristallsplittern
 *   Weg        Grubenpfad aus hellem Kies mit Karrenspuren, Bohlenstegen und Erzkrümeln
 *   Wand       zwei Kacheln hohe Felsfront mit Schichtung, Kristalladern, Drusen, Nässestreifen und Sintervorhängen;
 *              dunkle, zerklüftete Oberseite mit heller Abbruchkante
 *   See        glatter nasser Felsrand, Sinterterrassen, Kalksaum an der Wasserlinie, Tiefenschattierung
 */
import { INK, P, WHITE, alpha, hash2, mix, rnd2 } from '../palette';
import {
  BRIDGE, Chunk, GROUND2, HAZARD, LIQUID, PATH, SHADE, TS, VOID, WALL,
  allow, clamp, lut, rf, ri, seedAt, tileAt, voro, V, type BiomePainter, type WallGeom,
} from './core';
import {
  BRN, CYR, DEEP, FACE, FLOWST, GRAV, LICH, MGR, PLANK, ROCKW, ROCKZ, ROPE, SCUM, SED, TOP, VOID2, VOIDC, WETC,
  S_BANK, S_BRIDGE, S_FACE, S_GROUND, S_HAZ, S_LICHEN, S_PATH, S_TOP, S_VOID, S_WATER,
} from './kristall_pal';
import { KS, initKristallStamps } from './kristall_stamps';
import { bridgeDirs } from './kristall_util';
import { paintGeode } from './kristall_geode';
import { kristallLiquid } from './kristall_liquid';

const L_WALL = lut(WALL, VOID), L_VOID = lut(VOID), L_PATH = lut(PATH, BRIDGE), L_G2 = lut(GROUND2), L_HAZ = lut(HAZARD), L_LIQ = lut(LIQUID, BRIDGE), L_BRIDGE = lut(BRIDGE);
const A_FLOORS = allow(S_GROUND, S_LICHEN, S_PATH, S_HAZ, S_BANK);
const A_ROCK = allow(S_GROUND, S_LICHEN, S_HAZ);
const A_GROUND = allow(S_GROUND), A_LICHEN = allow(S_LICHEN), A_PATH = allow(S_PATH), A_FACE = allow(S_FACE), A_TOP = allow(S_TOP);
const A_UP = allow(S_GROUND, S_LICHEN, S_PATH, S_HAZ, S_BANK, S_FACE, S_TOP, S_WATER);
const A_SHORE = allow(S_BANK, S_WATER), A_STONE = allow(S_BANK, S_WATER, S_GROUND, S_LICHEN);
const A_FOOT = allow(S_GROUND, S_LICHEN, S_PATH, S_HAZ, S_FACE);

interface KF {
  nA: Float32Array; nB: Float32Array; nC: Float32Array; nL: Float32Array; nM: Float32Array; nV: Float32Array; nS: Float32Array; nZ2: Float32Array;
  zone: Uint8Array; lev: Uint8Array; wallM: Uint8Array; geom: WallGeom;
  dWall: Float32Array; dTop: Float32Array; dLand: Float32Array; dShore: Float32Array; dPath: Float32Array; dToPath: Float32Array; bankW: Float32Array; dWat: Float32Array;
}
const LEVSHIFT = [0, -1, 0, 1, 0, 0, -1, 1];

function paintOverworld(c: Chunk): void {
  initKristallStamps();
  const { W, H, kind, buf, map } = c, n = W * H, seed = c.seed;
  // ---------------------------------------------------------------- 1. Felder
  const nA = c.noise(6, 31), nB = c.noise(13, 32), nC = c.noise(3.3, 33), nL = c.noise(37, 34), nM = c.noise(21, 35), nV = c.noise(17, 36), nS = c.noise(29, 37);
  const nZ1 = c.noise(96, 38), nZ2 = c.noise(41, 39);
  const cWall = c.cover(L_WALL, 'w'), cVoid = c.cover(L_VOID, 'v'), cPath = c.cover(L_PATH, 'p'), cG2 = c.cover(L_G2, 'm'), cHaz = c.cover(L_HAZ, 'h'), cLiq = c.cover(L_LIQ, 'l');
  const bm = c.cellMask(L_BRIDGE), wm = c.cellMask(L_WALL);
  const wallM = new Uint8Array(n), liqM = new Uint8Array(n), notLiq = new Uint8Array(n), notWall = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const e1 = nA[i] - 0.5, e2 = nB[i] - 0.5, e3 = nC[i] - 0.5;
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
  const bankW = new Float32Array(n), zone = new Uint8Array(n), lev = new Uint8Array(n);
  // ---------------------------------------------------------------- 2. Oberflächenart
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, e1 = nA[i] - 0.5, e2 = nB[i] - 0.5, e3 = nC[i] - 0.5;
    const zf = nZ1[i] * 0.6 + nZ2[i] * 0.4 + e3 * 0.03;
    zone[i] = zf < 0.5 ? 0 : zf < 0.585 ? 1 : 2;
    lev[i] = ((nL[i] * 0.6 + nM[i] * 0.4) * 8) | 0;
    let k: number;
    if (bm[i]) k = S_BRIDGE;
    else if (wallM[i]) k = geom.fv[i] ? S_FACE : cVoid[i] + e1 * 0.2 > 0.8 ? S_VOID : S_TOP;
    else if (liqM[i]) {
      const ny = y > 0 && y < H - 1 ? (dLand[i + W] - dLand[i - W]) * 0.5 : 0;
      const bar = nL[i] * 0.6 + nB[i] * 0.4 - 0.55;
      const bw = 4.6 + nA[i] * 2.2 + (ny > 0 ? ny * 4.2 : ny * 1.6) + (bar > 0 ? bar * 40 : 0);
      bankW[i] = bw;
      k = dLand[i] <= bw ? S_BANK : S_WATER;
    }
    else if (cPath[i] + e2 * 0.22 + e1 * 0.2 + e3 * 0.1 > 0.5) k = S_PATH;
    else if (cHaz[i] + e2 * 0.3 + e1 * 0.2 > 0.5) k = S_HAZ;
    else if (cG2[i] + e2 * 0.34 + e1 * 0.16 > 0.5) k = S_LICHEN;
    else k = S_GROUND;
    kind[i] = k;
  }
  const notPath = new Uint8Array(n), isPath = new Uint8Array(n), water = new Uint8Array(n);
  for (let i = 0; i < n; i++) { const p = kind[i] === S_PATH || kind[i] === S_BRIDGE ? 1 : 0; isPath[i] = p; notPath[i] = 1 - p; water[i] = kind[i] === S_WATER ? 1 : 0; }
  const dPath = c.dist(notPath), dToPath = c.dist(isPath), dWat = c.dist(water);
  const f: KF = { nA, nB, nC, nL, nM, nV, nS, nZ2, zone, lev, wallM, geom, dWall, dTop, dLand, dShore, dPath, dToPath, bankW, dWat };

  // ---------------------------------------------------------------- 3. Grundfarbe
  const dirs = bridgeDirs(map);
  for (let y = c.iy0; y < c.iy1; y++) for (let x = c.ix0; x < c.ix1; x++) {
    const i = y * W + x, wx = c.x0 + x, wy = c.y0 + y, z = zone[i], h = rnd2(wx, wy, seed);
    let col = 0;
    switch (kind[i]) {
      case S_GROUND: col = groundCol(c, f, i, wx, wy, z, h); break;
      case S_LICHEN: col = lichenCol(c, f, i, z, h); break;
      case S_PATH: col = pathCol(c, f, i, wx, wy, h); break;
      case S_HAZ: {
        // dunkler, zersprungener Fels unter dem Scherbenfeld
        voro(wx, wy, 11, 8, seed + 1130);
        const s = V.dx * 0.6 + V.dy;
        col = V.edge < 1 ? ROCKW[0][0] : V.edge < 2.2 && s < -1 ? ROCKW[0][4] : V.edge < 2.2 && s > 1.5 ? ROCKW[0][1] : ROCKW[0][(V.id >>> 9) % 3 === 0 ? 3 : 2];
        if (h > 0.985) col = CYR[3];
        break;
      }
      case S_BANK: col = bankCol(c, f, i, wx, wy, z, h); break;
      case S_WATER: col = waterCol(c, f, i, wx, wy); break;
      case S_TOP: col = topCol(c, f, i, wx, wy, h); break;
      case S_FACE: col = faceCol(c, f, i, wx, wy, h); break;
      case S_BRIDGE: col = bridgeCol(c, dirs, wx, wy, h); break;
      default: col = h > 0.994 ? VOID2 : VOIDC;
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
    const j = s + (nC[i] - 0.5) * 0.25;
    c.darken(i, j > 0.66 ? 0.46 : j > 0.36 ? 0.3 : 0.15);
  }
  // ---------------------------------------------------------------- 6. Aufbauten
  structures(c, f, dirs);
}

// ------------------------------------------------------------------ Höhlenboden
/** Kante der Plattenstufen: 1 Stirnseite, 2 Schattenwurf, 3 helle Abbruchkante, 4 schwache Lichtkante, 0 Fläche. */
function terr(lev: Uint8Array, i: number, W: number): number {
  const l0 = lev[i];
  if (lev[i - W] > l0) return 1;
  if (lev[i - 2 * W] > l0 || lev[i - 1] > l0) return 2;
  if (lev[i + W] < l0) return 3;
  if (lev[i - W] < l0 || lev[i - 1] < l0) return 4;
  return 0;
}
function groundCol(c: Chunk, f: KF, i: number, wx: number, wy: number, z: number, h: number): number {
  const W = c.W, seed = c.seed;
  // Sedimentlinsen: feiner brauner Schlamm in flachen Mulden
  const sd = f.nS[i] * 0.62 + f.nB[i] * 0.38;
  if (sd > 0.66) {
    if (f.nS[i - W] * 0.62 + f.nB[i - W] * 0.38 <= 0.66 || f.nS[i - 1] * 0.62 + f.nB[i - 1] * 0.38 <= 0.66) return SED[0];
    if (sd < 0.675 && ((wx + wy) & 1)) return ROCKZ[z][2];
    const hd = rnd2(wx >> 1, wy, seed + 1101);
    let t = sd > 0.72 ? 3 : 2;
    if (hd < 0.14) t--; else if (hd > 0.88) t++;
    if (h > 0.992) return GRAV[4];
    return SED[t];
  }
  const wet = f.nZ2[i] * 0.5 + f.nM[i] * 0.5 > 0.6, R = wet ? ROCKW[z] : ROCKZ[z];
  const te = terr(f.lev, i, W);
  if (te === 1) return R[1];
  if (te === 2) return h < 0.6 ? R[1] : R[2];
  const v = f.nL[i] * 0.4 + f.nB[i] * 0.35 + f.nC[i] * 0.25;
  let t = 3 + LEVSHIFT[f.lev[i] & 7] + (v < 0.42 ? -1 : v > 0.6 ? 1 : 0);
  if (t < 2) t = 2; else if (t > 4) t = 4;
  if (te === 3) return R[t + 2];
  if (te === 4) t++;
  else if (f.nM[i] > 0.46) {
    // Plattenrisse in den spröden Zonen
    voro(wx, wy, 25, 14, seed + 1110);
    if (V.edge < 1 && f.nA[i] > 0.28) return R[1];
    if (V.edge < 2.3) { const s = V.dx * 0.55 + V.dy; if (s < -1.5) t++; else if (s > 2) t--; }
  }
  if (h < 0.04) t--; else if (h > 0.965) t++;
  // Kristallgrus funkelt
  if (h > 0.9968) return f.nA[i] > 0.62 ? MGR[3] : CYR[4];
  if (wet && h > 0.975) return mix(R[5], P.teal[3], 0.3);
  return R[t < 1 ? 1 : t > 6 ? 6 : t];
}
function lichenCol(c: Chunk, f: KF, i: number, z: number, h: number): number {
  const W = c.W, te = terr(f.lev, i, W);
  // nackter Fels schaut durch
  const bare = f.nA[i] * 0.45 + f.nC[i] * 0.3 + f.nM[i] * 0.25;
  if (bare < 0.41) { const R = ROCKW[z]; return te === 1 || bare > 0.395 ? R[1] : te === 3 ? R[5] : R[h < 0.2 ? 2 : 3]; }
  if (te === 1) return LICH[0];
  if (te === 2) return h < 0.5 ? LICH[0] : LICH[1];
  const v = f.nL[i] * 0.35 + f.nB[i] * 0.4 + f.nC[i] * 0.25;
  let t = v < 0.4 ? 1 : v < 0.52 ? 2 : v < 0.64 ? 3 : 4;
  if (te === 3) t += 1; else if (te === 4 && t < 4) t++;
  if (h < 0.05 && t > 0) t--; else if (h > 0.96 && t < 5) t++;
  if (h > 0.9955) return CYR[4];
  return LICH[t > 5 ? 5 : t];
}
function pathCol(c: Chunk, f: KF, i: number, wx: number, wy: number, h: number): number {
  const d = f.dPath[i], e = f.nA[i] - 0.5, W = c.W, kind = c.kind, seed = c.seed;
  const ku = kind[i - W], kl = kind[i - 1];
  // der Kies liegt in einer flachen Rinne: Felskante wirft einen schmalen Schatten
  if (ku !== S_PATH && ku !== S_BRIDGE) return GRAV[0];
  if (kl !== S_PATH && kl !== S_BRIDGE) return GRAV[1];
  const g = rnd2(wx >> 1, wy + ((wx >> 1) & 1), seed + 1120);
  if (d < 2.2 + e * 2.4) return g < 0.4 ? GRAV[1] : GRAV[2];
  const v = f.nL[i] * 0.4 + f.nB[i] * 0.4 + f.nC[i] * 0.2;
  let t = v < 0.44 ? 2 : 3;
  if (d > 11 + f.nA[i] * 6 && v > 0.5) t = 4;
  // Karrenspuren
  const rut = d - (8.2 + (f.nB[i] - 0.5) * 3.5);
  if (rut > 0 && rut < 2.1 && f.nC[i] > 0.3) t = t > 2 ? t - 1 : 1;
  if (g < 0.15) t--; else if (g > 0.85) t++;
  if (h > 0.993) return GRAV[5];
  if (h < 0.012) return GRAV[0];
  return GRAV[t < 1 ? 1 : t > 5 ? 5 : t];
}

// ------------------------------------------------------------------ Seeufer
function bankCol(c: Chunk, f: KF, i: number, wx: number, wy: number, z: number, h: number): number {
  const d = f.dLand[i], dw = f.dWat[i], W = c.W, R = ROCKW[z];
  const ny = (f.dLand[i + W] - f.dLand[i - W]) * 0.5;
  if (ny < -0.3) {
    // Südufer: Blick von hinten über die Felskante
    if (d < 1.3) return ROCKZ[z][5];
    return dw > 1.4 ? (h < 0.3 ? R[1] : R[2]) : mix(R[1], INK, 0.3);
  }
  // glatter, nasser Rand → Sinterterrassen → Kalksaum an der Wasserlinie
  if (d < 1.25) return h < 0.25 ? FLOWST[6] : ROCKZ[z][5];
  if (d < 2.4) return R[h < 0.3 ? 3 : 4];
  if (dw <= 1.3) return h < 0.7 ? SCUM : FLOWST[4];
  if (dw <= 2.3) return mix(FLOWST[2], WETC, 0.35);
  const q = (dw + (f.nA[i] - 0.5) * 2.2 + (f.nB[i] - 0.5) * 3) / 2.6, k = Math.floor(q), fr = q - k;
  const TR = k % 2 ? FLOWST : ROCKZ[z];
  if (fr < 0.3) return mix(TR[2], WETC, 0.3);
  if (fr > 0.72) return TR[h < 0.2 ? 5 : 6];
  return h < 0.08 ? TR[3] : h > 0.95 ? TR[5] : TR[4];
}
function waterCol(c: Chunk, f: KF, i: number, wx: number, wy: number): number {
  const bw = f.bankW[i], d = f.dLand[i], dw = d - bw, W = c.W;
  const ny = (f.dLand[i + W] - f.dLand[i - W]) * 0.5;
  if (ny > 0.35) {
    if (dw < 1.5) return alpha(INK, 140);
    if (dw < 3) return alpha(DEEP, 110);
    if (dw < 4.2 && rnd2(wx >> 1, wy, 1177) > 0.45) return alpha(SCUM, 120);
  } else if (dw < 1.1 && rnd2(wx >> 1, wy >> 1, 1178) > 0.3) return alpha(SCUM, 150);
  else if (dw < 2.2 && ny > -0.3) return alpha(DEEP, 80);
  const dd = d + (f.nB[i] - 0.5) * 9 + (f.nL[i] - 0.5) * 8;
  if (dd > 30) return alpha(INK, 120);
  if (dd > 22) return alpha(DEEP, 120);
  if (dd > 14) return alpha(DEEP, 70);
  // seichtes Wasser über hellem Sinter
  if (dw < 5 + f.nA[i] * 4) return alpha(P.teal[3], 70);
  // ruhende Tiefenflecken brechen die Wiederholung der Wasserkachel
  const big = f.nS[i] * 0.6 + f.nZ2[i] * 0.4;
  if (big < 0.4) return alpha(DEEP, 60);
  if (big > 0.62) return alpha(P.teal[2], 45);
  return 0;
}

// ------------------------------------------------------------------ Wand
function topCol(c: Chunk, f: KF, i: number, wx: number, wy: number, h: number): number {
  const g = f.geom, d = f.dTop[i], ts = g.ts[i], seed = c.seed;
  // helle Abbruchkante nach Süden
  if (ts <= 2) return ts === 1 ? (h < 0.3 ? FACE[5] : FACE[6]) : h < 0.35 ? FACE[4] : FACE[5];
  if (ts === 3) return TOP[1];
  const lit = g.tn[i] <= 2 || !f.wallM[i - 1] || !f.wallM[i - 2];
  if (lit) return g.tn[i] === 1 || !f.wallM[i - 1] ? (f.nC[i] > 0.35 ? FACE[4] : FACE[3]) : TOP[5];
  if (d <= 1.01 && ts === 255) return TOP[0];
  // über einer Front zählt der Abstand zur Abbruchkante (ts ist nur bis 15 px exakt, deshalb auf die Staffelung gedehnt)
  const fade = (ts < 255 && ts * 2 < d ? ts * 2 : d) + (f.nB[i] - 0.5) * 12 + (f.nL[i] - 0.5) * 8;
  if (fade > 30) {
    // tiefes Dunkel: kaum sichtbare Felsschollen
    const v = f.nL[i] * 0.5 + f.nM[i] * 0.5;
    return v > 0.57 && ((wx + wy) & 1) ? VOID2 : h > 0.9985 ? CYR[1] : VOIDC;
  }
  // zerklüftete Blöcke, zum Inneren hin dunkler
  voro(wx, wy, 13, 9, seed + 1140);
  const s = V.dx * 0.6 + V.dy, hv = (V.id >>> 12) & 3;
  let t = (fade < 8 ? 4 : fade < 15 ? 3 : fade < 23 ? 2 : 1) - (hv === 0 ? 1 : 0);
  if (V.edge < 1) t = 0;
  else if (V.edge < 2.4 && s < -1) t++;
  else if (s > 2.5) t--;
  if (h < 0.05) t--;
  if (fade > 24 && ((wx + wy) & 1)) return VOIDC;
  return TOP[t < 0 ? 0 : t > 5 ? 5 : t];
}
/** Schichtdicken der Felsfront (px), periodisch nach 61 px. */
const STRAT = [5, 3, 7, 4, 6, 3, 8, 4, 5, 6, 3, 7];
const STR_ID = new Uint8Array(61), STR_ROW = new Uint8Array(61), STR_H = new Uint8Array(61);
{ let y = 0; STRAT.forEach((t, k) => { for (let j = 0; j < t; j++, y++) { STR_ID[y] = k; STR_ROW[y] = j; STR_H[y] = t; } }); }
function faceCol(c: Chunk, f: KF, i: number, wx: number, wy: number, h: number): number {
  const g = f.geom, v = g.fv[i], fh = g.fh[i], top = fh - v, seed = c.seed;
  // überhängende, helle Kante
  const lipH = 1 + (hash2(wx >> 2, 7, seed + 1150) & 1);
  if (top < lipH) return top === 0 ? FACE[6] : FACE[5];
  // gewellte Schichten wechselnder Dicke
  const yy = wy + Math.round((f.nB[i] - 0.5) * 7 + (f.nL[i] - 0.5) * 10), per = Math.floor(yy / 61), o = yy - per * 61;
  const sid = STR_ID[o] + per * 12, ry = STR_ROW[o], sth = STR_H[o], hs = rnd2(sid, 3, seed + 1151);
  const R = hs < 0.2 ? BRN : FACE, base = hs < 0.2 ? 3 : hs < 0.45 ? 2 : hs < 0.8 ? 3 : 4;
  let col: number;
  // senkrechte Klüfte in dicken Bänken
  const xx = wx + (hash2(sid, 1, seed + 1152) % 19), k = Math.floor(xx / 19), lx = xx - k * 19 - (hash2(k, sid, seed + 1153) % 7);
  if (ry === sth - 1) col = h < 0.82 ? R[0] : R[1];
  else if (ry === 0) col = R[base + 2];
  else if (sth >= 5 && lx === 0 && hash2(k, sid, seed + 1154) % 3) col = R[1];
  else if (sth >= 5 && lx === 1) col = R[base + 1];
  else {
    const off = hash2(wy, 4, seed + 1155) & 3, hd = rnd2((wx + off) >> 2, wy, seed + 1156);
    col = R[base + (hd < 0.18 ? -1 : hd > 0.86 ? 1 : 0) + (ry === 1 ? 1 : 0) - (ry === sth - 2 && sth > 3 ? 1 : 0)];
  }
  // Kristalladern: gewundene, leuchtende Linien
  const vn = Math.abs(f.nV[i] - 0.5), vc = f.nZ2[i] > 0.5 ? CYR : MGR;
  if (f.nM[i] > 0.42) { if (vn < 0.011) col = h < 0.3 ? WHITE : vc[4]; else if (vn < 0.026) col = h < 0.5 ? vc[3] : mix(col, vc[2], 0.5); else if (vn < 0.045) col = mix(col, vc[2], 0.22); }
  // Schatten unter der Kante, feuchter dunkler Fuß
  if (top === lipH || (top === lipH + 1 && h < 0.5)) col = mix(col, SHADE, 0.45);
  if (v <= 2) col = mix(col, SHADE, v === 1 ? 0.55 : 0.34);
  else if (v <= 5) col = mix(col, WETC, h < 0.5 ? 0.3 : 0.18);
  else if (top > fh * 0.55 && h < 0.3) col = mix(col, WETC, 0.14);
  if (!f.wallM[i - 1]) col = mix(col, FACE[6], 0.45);
  else if (!f.wallM[i + 1] || !f.wallM[i + 2]) col = mix(col, SHADE, 0.42);
  return col;
}

// ------------------------------------------------------------------ Seilbrücke der Grubenleute
function bridgeCol(c: Chunk, dirs: Uint8Array, wx: number, wy: number, h: number): number {
  const map = c.map, cx = wx >> 4, cy = wy >> 4, lx = wx & 15, ly = wy & 15, seed = c.seed;
  const dir = dirs[cy * map.w + cx] || 1;
  const liq = (x: number, y: number): boolean => tileAt(map, x, y) === LIQUID;
  const sideA = dir === 1 ? liq(cx, cy - 1) : liq(cx - 1, cy), sideB = dir === 1 ? liq(cx, cy + 1) : liq(cx + 1, cy);
  const u = dir === 1 ? wx + 2 : wy + 2, across = dir === 1 ? ly : lx, vv = dir === 1 ? wy : wx;
  const pk = Math.floor(u / 5), pi = u - pk * 5, hp = rnd2(pk, dir, seed + 1200), hq = rnd2(pk, dir, seed + 1203);
  const a = sideA ? across : 99, b = sideB ? 15 - across : 99;
  // Seile: zweireihig gedreht, darunter Schatten auf den Bohlen
  const tw = ((u + (across & 1) * 2) & 3) < 2;
  if (a === 2 || b === 3) return tw ? ROPE[3] : ROPE[2];
  if (a === 3 || b === 2) return tw ? ROPE[1] : ROPE[0];
  // Lücken zwischen den Bohlen, ungleich lange Bohlenenden
  if (pi === 4) return a < 2 || b < 2 ? 0 : alpha(INK, 165);
  if (a < (hash2(pk, 5, seed + 1204) % 3) || (dir === 2 && b < (hash2(pk, 6, seed + 1204) % 3))) return 0;
  // Auflagebalken am Brückenkopf
  const open = (x: number, y: number): boolean => { const q = tileAt(map, x, y); return q !== LIQUID && q !== BRIDGE; };
  const along = dir === 1 ? lx : ly;
  if ((along < 3 && open(dir === 1 ? cx - 1 : cx, dir === 1 ? cy : cy - 1)) || (along > 12 && open(dir === 1 ? cx + 1 : cx, dir === 1 ? cy : cy + 1))) {
    const kk = along < 3 ? along : along - 13;
    return kk === 0 ? PLANK[5] : kk === 1 ? PLANK[rnd2(vv >> 2, 1, seed + 1205) < 0.3 ? 2 : 3] : PLANK[0];
  }
  let t = hp < 0.2 ? 2 : hp < 0.55 ? 3 : hp < 0.85 ? 4 : 5;
  const joint = 7 + (hash2(pk, 3, seed + 1201) % 34), vj = ((vv % 48) + 48) % 48;
  if (hq > 0.55 && vj === joint) return PLANK[0];
  if (hq > 0.55 && vj > joint) t = t > 2 ? t - 1 : t + 1;
  if (pi === 0) t = Math.min(6, t + 1); else if (pi === 3) t--;
  if (rnd2(u, (vv + (hash2(pk, 1, seed) & 7)) >> 3, seed + 1202) < 0.16) t--;
  if (h < 0.03) t--;
  let col = PLANK[Math.max(1, t)];
  if (a === 0 || b === 0) col = PLANK[1];
  if (a === 4 || b === 1) col = mix(col, SHADE, 0.4);
  else if ((a === 5 || b === 4) && pi === 2) col = PLANK[0];
  return col;
}

// ------------------------------------------------------------------ Bodendecker
function groundCover(c: Chunk, f: KF): void {
  const { W, kind, map } = c, seed = c.seed;
  const isP = (x: number, y: number): boolean => tileAt(map, x, y) === PATH;
  // Bohlenstege auf dem Grubenpfad (zuerst, damit Kies und Krümel darüber liegen)
  c.cells((cx, cy, t) => {
    if (t !== PATH) return;
    seedAt(cx, cy, seed + 1300);
    const r = rf(), x0 = cx * TS + 8, y0 = cy * TS + 8, i = (y0 - c.y0) * W + (x0 - c.x0);
    if (kind[i] !== S_PATH || f.dPath[i] < 8) return;
    const wetHere = f.nZ2[i] * 0.5 + f.nM[i] * 0.5 > 0.56;
    if (r > (wetHere ? 0.14 : 0.02)) return;
    let hr = 0, vr = 0;
    for (let k = 1; k <= 3; k++) { if (isP(cx - k, cy)) hr++; if (isP(cx + k, cy)) hr++; if (isP(cx, cy - k)) vr++; if (isP(cx, cy + k)) vr++; }
    if (hr >= vr + 2) c.blitK(KS.boardV[ri(KS.boardV.length)], x0, y0, A_FLOORS);
    else if (vr >= hr + 2) c.blitK(KS.boardH[ri(KS.boardH.length)], x0, y0, A_FLOORS);
  });
  c.cells((cx, cy) => {
    seedAt(cx, cy, seed + 1310);
    const x0 = cx * TS, y0 = cy * TS;
    for (let k = 0; k < 9; k++) {
      const wx = x0 + ri(16), wy = y0 + ri(16), r = rf(), i = (wy - c.y0) * W + (wx - c.x0), kd = kind[i];
      const hv = hash2(wx, wy, seed + 1311);
      if (kd === S_GROUND) {
        const nearWall = f.dWall[i] < 20, wet = f.nZ2[i] * 0.5 + f.nM[i] * 0.5 > 0.6, nearPath = f.dToPath[i] < 7;
        let q = r;
        if ((q -= nearPath ? 0.3 : 0) < 0) c.blitK(KS.grit[hv % KS.grit.length], wx, wy, A_ROCK);
        else if ((q -= 0.05) < 0) c.blitK(KS.crack[hv % KS.crack.length], wx, wy, A_GROUND);
        else if ((q -= nearWall ? 0.11 : 0.045) < 0) c.blitK(KS.peb[hv % KS.peb.length], wx, wy, A_FLOORS);
        else if ((q -= nearWall ? 0.03 : 0.008) < 0) c.blitK(KS.pebL[hv % KS.pebL.length], wx, wy, A_FLOORS);
        else if ((q -= wet ? 0.035 : 0.002) < 0) c.blitK(KS.puddle[hv % KS.puddle.length], wx, wy, A_GROUND);
        else if ((q -= wet ? 0.02 : 0) < 0) c.blitK(KS.ring[hv % KS.ring.length], wx, wy, A_GROUND);
        else if ((q -= 0.012) < 0) c.blitK(KS.shard[f.nA[i] > 0.6 ? 1 : 0][hv % 8], wx, wy, A_UP);
        else if ((q -= nearWall ? 0.02 : 0.006) < 0) c.blitK(KS.nub[hv % KS.nub.length], wx, wy, A_UP);
        else if ((q -= f.dShore[i] < 10 ? 0.06 : 0) < 0) c.blitK(KS.peb[hv % KS.peb.length], wx, wy, A_FLOORS);
        else if ((q -= 0.004) < 0) c.blitK(KS.fungi[hv % KS.fungi.length], wx, wy, A_ROCK);
      } else if (kd === S_LICHEN) {
        let q = r;
        if ((q -= 0.24) < 0) c.blitK(KS.cushion[hv % KS.cushion.length], wx, wy, A_LICHEN);
        else if ((q -= 0.07) < 0) c.blitK(KS.fungi[hv % KS.fungi.length], wx, wy, A_ROCK);
        else if ((q -= 0.05) < 0) c.blitK(KS.shard[hv % 7 === 0 ? 1 : hv % 5 === 0 ? 2 : 0][(hv >>> 4) % 8], wx, wy, A_UP);
        else if ((q -= 0.02) < 0) c.blitK(KS.peb[hv % KS.peb.length], wx, wy, A_FLOORS);
      } else if (kd === S_PATH) {
        const d = f.dPath[i];
        let q = r;
        if ((q -= 0.05) < 0) c.blitK(KS.peb[6 + (hv % 3)], wx, wy, A_PATH);
        else if ((q -= 0.14) < 0) c.blitK(KS.grit[hv % KS.grit.length], wx, wy, A_PATH);
        else if ((q -= d > 6 ? 0.012 : 0) < 0) c.blitK(KS.ore[hv % KS.ore.length], wx, wy, A_PATH);
        else if ((q -= d > 8 ? 0.006 : 0) < 0) c.blitK(KS.pebL[hv % KS.pebL.length], wx, wy, A_PATH);
        else if ((q -= d > 9 ? 0.005 : 0) < 0) c.blitK(KS.puddle[hv % 2], wx, wy, A_PATH);
      } else if (kd === S_TOP) {
        const d = f.dTop[i];
        if (d > 7 && r < 0.012) c.blitK(KS.glint[hv % KS.glint.length], wx, wy, A_TOP);
        else if (d > 4 && d < 20 && r < 0.03) c.blitK(KS.shard[hv % 3][(hv >>> 4) % 8], wx, wy, A_TOP);
      }
    }
  });
  // Scherbenfelder
  c.cells((cx, cy, t) => {
    if (t !== HAZARD) return;
    seedAt(cx, cy, seed + 1320);
    const x0 = cx * TS, y0 = cy * TS;
    if (c.kindAt(x0 + 8, y0 + 8) !== S_HAZ) return;
    c.blitK(KS.haz[ri(KS.haz.length)], x0 + 5 + ri(7), y0 + 8 + ri(3), A_UP);
    c.blitK(KS.haz[ri(KS.haz.length)], x0 + 5 + ri(7), y0 + 15 + ri(3), A_UP);
    if (rf() < 0.6) c.blitK(KS.shard[ri(3)][ri(8)], x0 + ri(16), y0 + 12 + ri(4), A_UP);
  });
}

// ------------------------------------------------------------------ Aufbauten
function structures(c: Chunk, f: KF, dirs: Uint8Array): void {
  const { W, kind, map } = c, seed = c.seed, g = f.geom;
  c.cells((cx, cy, t) => {
    const x0 = cx * TS, y0 = cy * TS;
    seedAt(cx, cy, seed + 1330);
    for (let k = 0; k < 3; k++) {
      const wx = x0 + ri(16), wy = y0 + ri(16), r = rf(), i = (wy - c.y0) * W + (wx - c.x0);
      if (kind[i] !== S_FACE) continue;
      const fromTop = g.fh[i] - g.fv[i], fh = g.fh[i], ci = f.nZ2[i] > 0.5 ? (r * 97 % 1 < 0.8 ? 0 : 2) : 1;
      if (fromTop <= 12 && r < 0.16 && fh >= 20) c.blitK(KS.curtain[ri(KS.curtain.length)], wx, wy - fromTop + 1, A_FACE);
      else if (fromTop <= 12 && r < 0.3) c.blitK(KS.streak[ri(KS.streak.length)], wx, wy - fromTop + 2, A_FACE);
      else if (r < 0.42 && g.fv[i] >= 7 && fromTop >= 7 && f.nM[i] > 0.4) c.blitK(KS.druse[ci][ri(6)], wx, wy, A_FACE);
      else if (r < 0.6 && g.fv[i] >= 4 && fromTop >= 4) c.blitK(KS.druseS[ci][ri(6)], wx, wy, A_FACE);
      else if (r < 0.7 && fromTop >= 3 && fromTop <= 14) c.blitK(KS.crackV[ri(KS.crackV.length)], wx, wy, A_FACE);
      else if (r < 0.86 && g.fv[i] < 5) c.blitK(KS.talus[ri(KS.talus.length)], wx, wy + g.fv[i] + 1, A_FOOT);
      else if (r < 0.93 && g.fv[i] < 5) c.blitK(KS.grow[ci][ri(6)], wx, wy + g.fv[i] + 1, A_FOOT);
    }
    // Ufersteine, Tropfringe
    if (t === LIQUID) {
      seedAt(cx, cy, seed + 1331);
      for (let k = 0; k < 3; k++) {
        const wx = x0 + ri(16), wy = y0 + ri(16), r = rf(), i = (wy - c.y0) * W + (wx - c.x0);
        const dw = f.dLand[i] - f.bankW[i];
        if (kind[i] === S_BANK && r < 0.3) c.blitK(KS.stone[ri(KS.stone.length)], wx, wy, A_STONE);
        else if (kind[i] === S_BANK && r < 0.38) c.blitK(KS.shard[ri(2)][ri(8)], wx, wy, A_STONE);
        else if (kind[i] === S_WATER && dw < 5 && r < 0.18) c.blitK(KS.stoneWet[ri(KS.stoneWet.length)], wx, wy, A_SHORE);
        else if (kind[i] === S_WATER && r < 0.07) c.blitK(KS.ring[ri(KS.ring.length)], wx, wy, A_SHORE);
      }
    }
    if (t !== BRIDGE) return;
    const liq = (x: number, y: number): boolean => tileAt(map, x, y) === LIQUID;
    const br = (x: number, y: number): boolean => tileAt(map, x, y) === BRIDGE;
    const nL = liq(cx, cy - 1), sL = liq(cx, cy + 1), wL = liq(cx - 1, cy), eL = liq(cx + 1, cy), dir = dirs[cy * map.w + cx];
    if (sL) for (let x = 0; x < 16; x++) {
      const wx = x0 + x, u = wx + 2, pi = u - Math.floor(u / 5) * 5, gap = dir === 1 && pi === 4;
      if (!gap) { c.setK(wx, y0 + 16, PLANK[2], A_SHORE); c.setK(wx, y0 + 17, PLANK[0], A_SHORE); }
      for (let k = 0; k < 6; k++) c.setK(wx + (k >> 1), y0 + 18 + k, alpha(INK, k < 2 ? 125 : k < 4 ? 85 : 45), A_SHORE);
    }
    if (eL) for (let y = 0; y < 16; y++) for (let k = 0; k < 4; k++) c.setK(x0 + 16 + k, y0 + y + 2, alpha(INK, k < 2 ? 100 : 55), A_SHORE);
    const post = KS.post, end = (x: number, y: number): boolean => !br(x, y);
    if (dir === 1) {
      if (nL && end(cx - 1, cy)) c.blit(post[0], x0 + 2, y0 + 4);
      if (nL && end(cx + 1, cy)) c.blit(post[0], x0 + 13, y0 + 4);
      if (sL && end(cx - 1, cy)) c.blit(post[1], x0 + 2, y0 + 16);
      if (sL && end(cx + 1, cy)) c.blit(post[1], x0 + 13, y0 + 16);
    } else {
      if (wL && end(cx, cy - 1)) c.blit(post[0], x0 + 2, y0 + 6);
      if (eL && end(cx, cy - 1)) c.blit(post[0], x0 + 13, y0 + 6);
      if (wL && end(cx, cy + 1)) c.blit(post[1], x0 + 2, y0 + 16);
      if (eL && end(cx, cy + 1)) c.blit(post[1], x0 + 13, y0 + 16);
    }
  });
}

// ---------------------------------------------------------------------------------------------------- Maler
export const kristall: BiomePainter = {
  biome: 'kristall',
  paint(c) { if (c.map.dungeon) paintGeode(c); else paintOverworld(c); },
  liquid: kristallLiquid,
};
