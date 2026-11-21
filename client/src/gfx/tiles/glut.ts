/**
 * Glutlande – Bodenmaler v2 (Oberwelt „Die Erde atmet Feuer“).
 * Dungeon „Aschenschmiede“: glut_schmiede.ts · Stempel: glut_stamps.ts · Farben: glut_pal.ts · Lava: glut_liquid.ts
 *
 *   Boden      Ascheebene über dunklem Basalt: windgerippte Verwehungen, aufgebrochene Krustenplatten, Schlackebrocken;
 *              großräumiger Wechsel zwischen kalter grauer Asche und rostwarmem Grund
 *   Boden 2    Schlackefeld: poröse, rötlich-schwarze Klinker mit Glutpunkten in den Fugen
 *   Weg        Nomadenpfad aus festgetretener heller Asche mit Trittplatten und Steinmännchen am Rand
 *   Wand       Säulenbasalt-Klippen (zwei Kacheln hohe Front aus Säulen, abgebrochene Köpfe), Lavaadern in tiefen
 *              Spalten, Ruß; Oberseite aus Säulenköpfen und hitzerissigen Platten
 *   Lava       erkaltete schwarze Kruste mit glühendem Saum und Rissen, hitzeverfärbter Fels, Spritzsteine
 */
import { INK, alpha, hash2, mix, rnd2 } from '../palette';
import {
  BRIDGE, Chunk, GROUND2, HAZARD, LIQUID, PATH, SHADE, TS, VOID, WALL,
  allow, lut, rf, ri, seedAt, tileAt, voro, V, type BiomePainter, type WallGeom,
} from './core';
import {
  ASHZ, BAS, CRUST, HOT, IRON, PASH, SLABR, SLAG, VOIDR, VOIDR2,
  S_ASH, S_BANK, S_BRIDGE, S_FACE, S_HAZ, S_LAVA, S_PATH, S_SLAG, S_TOP, S_VOID,
} from './glut_pal';
import { GS, initGlutStamps } from './glut_stamps';
import { bridgeDirs } from './kristall_util';
import { paintSchmiede } from './glut_schmiede';
import { glutLiquid } from './glut_liquid';

const L_WALL = lut(WALL, VOID), L_VOID = lut(VOID), L_PATH = lut(PATH, BRIDGE), L_G2 = lut(GROUND2), L_HAZ = lut(HAZARD), L_LIQ = lut(LIQUID, BRIDGE), L_BRIDGE = lut(BRIDGE);
const A_FLOORS = allow(S_ASH, S_SLAG, S_PATH, S_HAZ, S_BANK);
const A_ASH = allow(S_ASH), A_OPEN = allow(S_ASH, S_SLAG, S_HAZ), A_PATH = allow(S_PATH), A_FACE = allow(S_FACE);
const A_UP = allow(S_ASH, S_SLAG, S_PATH, S_HAZ, S_BANK, S_FACE, S_TOP, S_LAVA);
const A_SHORE = allow(S_BANK, S_LAVA), A_FOOT = allow(S_ASH, S_SLAG, S_PATH, S_HAZ, S_FACE);

interface GFld {
  nA: Float32Array; nB: Float32Array; nC: Float32Array; nL: Float32Array; nM: Float32Array; nS: Float32Array; nZ2: Float32Array;
  zone: Uint8Array; wallM: Uint8Array; geom: WallGeom;
  dWall: Float32Array; dTop: Float32Array; dLand: Float32Array; dShore: Float32Array; dPath: Float32Array; dToPath: Float32Array; bankW: Float32Array; dWat: Float32Array;
}

function paintOverworld(c: Chunk): void {
  initGlutStamps();
  const { W, H, kind, buf, map } = c, n = W * H, seed = c.seed;
  const nA = c.noise(6, 51), nB = c.noise(13, 52), nC = c.noise(3.3, 53), nL = c.noise(37, 54), nM = c.noise(21, 55), nS = c.noise(29, 56);
  const nZ1 = c.noise(96, 57), nZ2 = c.noise(41, 58);
  const cWall = c.cover(L_WALL, 'w'), cVoid = c.cover(L_VOID, 'v'), cPath = c.cover(L_PATH, 'p'), cG2 = c.cover(L_G2, 'm'), cHaz = c.cover(L_HAZ, 'h'), cLiq = c.cover(L_LIQ, 'l');
  const bm = c.cellMask(L_BRIDGE), wm = c.cellMask(L_WALL);
  const wallM = new Uint8Array(n), liqM = new Uint8Array(n), notLiq = new Uint8Array(n), notWall = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const e1 = nA[i] - 0.5, e2 = nB[i] - 0.5, e3 = nC[i] - 0.5;
    // Basaltklippen brechen kantiger als Erdböschungen: weniger Ausfransung
    let nz = e2 * 0.34 + e1 * 0.12 + e3 * 0.04;
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
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, e1 = nA[i] - 0.5, e2 = nB[i] - 0.5, e3 = nC[i] - 0.5;
    const zf = nZ1[i] * 0.6 + nZ2[i] * 0.4 + e3 * 0.05 + e1 * 0.03;
    zone[i] = zf < 0.44 ? 0 : zf > 0.56 ? 2 : 1;
    let k: number;
    if (bm[i]) k = S_BRIDGE;
    else if (wallM[i]) k = geom.fv[i] ? S_FACE : cVoid[i] + e1 * 0.2 > 0.8 ? S_VOID : S_TOP;
    else if (liqM[i]) {
      const ny = y > 0 && y < H - 1 ? (dLand[i + W] - dLand[i - W]) * 0.5 : 0;
      const bar = nL[i] * 0.6 + nB[i] * 0.4 - 0.52;
      const bw = 4.2 + nA[i] * 2.4 + (ny > 0 ? ny * 3.6 : ny * 1.2) + (bar > 0 ? bar * 46 : 0);
      bankW[i] = bw;
      k = dLand[i] <= bw ? S_BANK : S_LAVA;
    }
    else if (cPath[i] + e2 * 0.2 + e1 * 0.2 + e3 * 0.1 > 0.5) k = S_PATH;
    else if (cHaz[i] + e2 * 0.36 + e1 * 0.2 + (nL[i] - 0.5) * 0.34 > 0.5) k = S_HAZ;
    else if (cG2[i] + e2 * 0.34 + e1 * 0.16 + (nL[i] - 0.5) * 0.22 > 0.5) k = S_SLAG;
    else k = S_ASH;
    kind[i] = k;
  }
  const notPath = new Uint8Array(n), isPath = new Uint8Array(n), lava = new Uint8Array(n);
  for (let i = 0; i < n; i++) { const p = kind[i] === S_PATH || kind[i] === S_BRIDGE ? 1 : 0; isPath[i] = p; notPath[i] = 1 - p; lava[i] = kind[i] === S_LAVA ? 1 : 0; }
  const dPath = c.dist(notPath), dToPath = c.dist(isPath), dWat = c.dist(lava);
  const f: GFld = { nA, nB, nC, nL, nM, nS, nZ2, zone, wallM, geom, dWall, dTop, dLand, dShore, dPath, dToPath, bankW, dWat };

  const dirs = bridgeDirs(map);
  for (let y = c.iy0; y < c.iy1; y++) for (let x = c.ix0; x < c.ix1; x++) {
    const i = y * W + x, wx = c.x0 + x, wy = c.y0 + y, z = zone[i], h = rnd2(wx, wy, seed);
    let col = 0;
    switch (kind[i]) {
      case S_ASH: col = ashCol(c, f, i, wx, wy, z, h); break;
      case S_SLAG: col = slagCol(c, f, i, wx, wy, h); break;
      case S_PATH: col = pathCol(c, f, i, wx, wy, h); break;
      case S_HAZ: col = hazCol(c, f, i, wx, wy, h); break;
      case S_BANK: col = bankCol(c, f, i, wx, wy, h); break;
      case S_LAVA: col = lavaCol(c, f, i, wx, wy); break;
      case S_TOP: col = topCol(c, f, i, wx, wy, h); break;
      case S_FACE: col = faceCol(c, f, i, wx, wy, h); break;
      case S_BRIDGE: col = bridgeCol(c, dirs, wx, wy, h); break;
      default: col = h > 0.994 ? VOIDR2 : VOIDR;
    }
    buf[i] = col;
  }
  groundCover(c, f);
  // Licht: Wandschatten, dann der Glutschein der Lava auf dem Ufer (zwei harte Stufen)
  const sh = c.wallShadow(wallM, dWall, 14);
  for (let y = c.iy0; y < c.iy1; y++) for (let x = c.ix0; x < c.ix1; x++) {
    const i = y * W + x, s = sh[i], k = kind[i];
    if (s > 0 && k !== S_BRIDGE && k !== S_LAVA) { const j = s + (nC[i] - 0.5) * 0.25; c.darken(i, j > 0.66 ? 0.46 : j > 0.36 ? 0.3 : 0.15); }
    if (k !== S_LAVA && k !== S_BANK && !wallM[i]) {
      const d = dShore[i] + (nB[i] - 0.5) * 5;
      if (d < 5) c.tint(i, HOT[2], 0.26); else if (d < 10) c.tint(i, HOT[1], 0.15); else if (d < 15 && ((x + y) & 1)) c.tint(i, HOT[1], 0.1);
    }
  }
  structures(c, f, dirs);
}

// ------------------------------------------------------------------ Asche, Schlacke, Pfad, Glutboden
function ashCol(c: Chunk, f: GFld, i: number, wx: number, wy: number, z: number, h: number): number {
  const R = ASHZ[z], seed = c.seed;
  // aufgebrochene Krustenplatten: der dunkle Basalt liegt frei
  const cm = f.nS[i] * 0.6 + f.nM[i] * 0.4;
  if (cm > 0.565) {
    if (cm < 0.58) return h < 0.5 ? R[5] : R[4];
    voro(wx, wy, 17, 11, seed + 3110);
    const s = V.dx * 0.6 + V.dy, hv = (V.id >>> 9) & 3;
    if (V.edge < 1) return f.nC[i] > 0.74 ? HOT[1] : BAS[0];
    let b = 2 + (hv === 0 ? 1 : 0);
    if (V.edge < 2.3 && s < -1) b += 2; else if (V.edge < 3 && s > 2) b--;
    if (h > 0.9) return R[h > 0.96 ? 3 : 2];
    if (h < 0.05) b--;
    return BAS[b];
  }
  const v = f.nL[i] * 0.4 + f.nB[i] * 0.35 + f.nC[i] * 0.25;
  let t = v < 0.42 ? 2 : v < 0.58 ? 3 : 4;
  // Windrippel in den Verwehungen
  const dm = f.nM[i] * 0.5 + f.nZ2[i] * 0.5;
  if (dm > 0.47) {
    const ph = wy + wx * 0.3 + f.nB[i] * 11 + f.nL[i] * 16, fr = ph - Math.floor(ph / 6) * 6;
    if (fr < 1.2) t++; else if (fr >= 4.8 && dm > 0.5) t--;
  } else if (dm < 0.4 && h < 0.1) t--;
  if (cm > 0.55) t--;
  if (h < 0.04) t--; else if (h > 0.965) t++;
  if (h > 0.9955) return h > 0.999 ? HOT[3] : BAS[1];
  return R[t < 1 ? 1 : t > 6 ? 6 : t];
}
function slagCol(c: Chunk, f: GFld, i: number, wx: number, wy: number, h: number): number {
  voro(wx, wy, 8, 6, c.seed + 3120);
  const s = V.dx * 0.6 + V.dy, hv = (V.id >>> 9) & 7;
  if (V.edge < 0.9) { const g = f.nA[i] * 0.35 + f.nM[i] * 0.65; return g > 0.62 && h < 0.45 ? HOT[2] : g > 0.56 && h < 0.3 ? HOT[1] : SLAG[0]; }
  // große Flecken: frischere, hellere Schlacke neben alter, fast schwarzer
  const big = f.nL[i] * 0.6 + f.nS[i] * 0.4;
  let t = 2 + (hv < 2 ? -1 : hv > 5 ? 1 : 0) + (big > 0.58 ? 1 : big < 0.42 ? -1 : 0);
  if (V.edge < 2 && s < -0.8) t++; else if (s > 1.6) t--;
  if (h < 0.08) return SLAG[0];
  if (h > 0.965) t++;
  return SLAG[t < 1 ? 1 : t > 5 ? 5 : t];
}
function pathCol(c: Chunk, f: GFld, i: number, wx: number, wy: number, h: number): number {
  const d = f.dPath[i], e = f.nA[i] - 0.5, W = c.W, kind = c.kind;
  const ku = kind[i - W], kl = kind[i - 1];
  if (ku !== S_PATH && ku !== S_BRIDGE) return PASH[0];
  if (kl !== S_PATH && kl !== S_BRIDGE) return PASH[1];
  if (d < 2.2 + e * 2.4) return h < 0.3 ? PASH[1] : PASH[2];
  const v = f.nL[i] * 0.4 + f.nB[i] * 0.42 + f.nC[i] * 0.18;
  let t = v < 0.43 ? 2 : v > 0.58 ? 4 : 3;
  if (d > 11 + f.nA[i] * 6 && t < 4) t++;
  // Schleifspuren der Lastschlitten
  const rut = d - (8.2 + (f.nB[i] - 0.5) * 3.5);
  if (rut > 0 && rut < 2.1 && f.nC[i] > 0.32) t = t > 2 ? t - 1 : 2;
  const off = hash2(wy, 3, c.seed + 3125) & 7, hd = rnd2((wx + off) >> 2, wy, c.seed + 3126);
  if (hd < 0.05) t = t > 2 ? t - 1 : 2; else if (hd > 0.96 && t < 5) t++;
  if (h > 0.992) return PASH[5];
  if (h < 0.01) return PASH[1];
  return PASH[t];
}
function hazCol(c: Chunk, f: GFld, i: number, wx: number, wy: number, h: number): number {
  // Glutboden: dunkle Platten, dazwischen hell glühende Spalten
  voro(wx, wy, 14, 9, c.seed + 3130);
  const s = V.dx * 0.6 + V.dy, hv = (V.id >>> 9) & 3;
  const heat = f.nB[i] * 0.5 + f.nM[i] * 0.5;
  if (V.edge < 0.9) return heat > 0.4 ? (h < 0.4 ? HOT[5] : HOT[4]) : HOT[2];
  if (V.edge < 1.9) return heat > 0.4 ? (h < 0.5 ? HOT[3] : HOT[2]) : HOT[1];
  if (V.edge < 3 && heat > 0.5) return h < 0.5 ? mix(CRUST[3], HOT[1], 0.6) : HOT[1];
  if (h > 0.985) return HOT[3];
  return CRUST[1 + (hv === 0 ? 1 : 0) + (s < -2 ? 1 : 0)];
}

// ------------------------------------------------------------------ Lavaufer
function bankCol(c: Chunk, f: GFld, i: number, wx: number, wy: number, h: number): number {
  const d = f.dLand[i], dw = f.dWat[i], W = c.W;
  const ny = (f.dLand[i + W] - f.dLand[i - W]) * 0.5;
  if (ny < -0.3) {
    if (d < 1.3) return BAS[4];
    return dw > 1.4 ? (h < 0.3 ? CRUST[1] : CRUST[2]) : HOT[2];
  }
  if (d < 1.25) return h < 0.3 ? BAS[5] : BAS[4];
  if (d < 2.4) return CRUST[3];
  if (dw <= 1.2) return h < 0.6 ? HOT[4] : HOT[5];
  if (dw <= 2.2) return h < 0.6 ? HOT[2] : HOT[3];
  // erkaltete Kruste: Schollen mit glühenden Rissen
  voro(wx, wy, 9, 6, c.seed + 3135);
  const s = V.dx * 0.6 + V.dy;
  if (V.edge < 0.9) return dw < 5.5 ? (h < 0.5 ? HOT[3] : HOT[2]) : f.nB[i] > 0.45 ? HOT[1] : CRUST[0];
  if (dw <= 3.3 && h < 0.5) return mix(CRUST[2], HOT[1], 0.5);
  let t = 1 + ((V.id >>> 9) & 1);
  if (V.edge < 2 && s < -0.8) t++; else if (s > 1.6) t--;
  return CRUST[t < 0 ? 0 : t];
}
function lavaCol(c: Chunk, f: GFld, i: number, wx: number, wy: number): number {
  const bw = f.bankW[i], d = f.dLand[i], dw = d - bw, W = c.W;
  const ny = (f.dLand[i + W] - f.dLand[i - W]) * 0.5;
  if (ny > 0.35) {
    // Stirnseite der Krustenbank, darunter der hellste Saum
    if (dw < 1.6) return CRUST[0];
    if (dw < 2.8) return alpha(HOT[1], 210);
    if (dw < 4 && rnd2(wx >> 1, wy, 3177) > 0.3) return alpha(HOT[5], 150);
  } else if (dw < 1.2 && rnd2(wx >> 1, wy >> 1, 3178) > 0.25) return alpha(HOT[5], 170);
  // am Ufer kühlt die Lava dunkler ab
  const cool = dw + (f.nB[i] - 0.5) * 7 + (f.nA[i] - 0.5) * 3;
  if (cool < 3.5) return alpha(HOT[0], 120);
  if (cool < 6.5 && ((wx + wy) & 1)) return alpha(HOT[0], 90);
  // ruhende Krusteninseln und große Hell-Dunkel-Zonen brechen die Wiederholung der Lavakachel
  const isl = f.nL[i] * 0.5 + f.nS[i] * 0.5;
  if (isl > 0.6 && dw > 4) {
    if (isl < 0.612) return HOT[1];
    voro(wx, wy, 10, 7, c.seed + 3136);
    if (V.edge < 0.9) return f.nC[i] > 0.5 ? HOT[2] : HOT[0];
    const s = V.dx * 0.6 + V.dy;
    return CRUST[1 + ((V.id >>> 9) & 1) + (V.edge < 2 && s < -0.8 ? 1 : 0)];
  }
  const big = f.nZ2[i] * 0.6 + f.nM[i] * 0.4;
  if (big < 0.42) return alpha(HOT[0], big < 0.36 ? 95 : 55);
  return 0;
}

// ------------------------------------------------------------------ Säulenbasalt
const COL = { k: 0, lx: 0, bw: 0 };
function colAt(wx: number, seed: number): void {
  const k0 = Math.floor(wx / 8);
  let k = k0, start = k0 * 8 + (hash2(k0, 0, seed + 3150) % 5);
  if (wx < start) { k = k0 - 1; start = k * 8 + (hash2(k, 0, seed + 3150) % 5); }
  COL.k = k; COL.lx = wx - start; COL.bw = (k + 1) * 8 + (hash2(k + 1, 0, seed + 3150) % 5) - start;
}
/** Höhenversatz der Säule k gegenüber der Abbruchkante (−3 … +4 px). */
function colOff(k: number, seed: number): number { const hk = hash2(k, 1, seed + 3151) % 9; return hk < 3 ? 0 : hk < 5 ? -1 - (hk & 1) * 2 : hk - 4; }
/** Front einer Basaltsäule (nach colAt): Fugen, Lichtkante links, Querbrüche. */
function colFace(f: GFld, i: number, wx: number, wy: number, h: number, seed: number, glowOk: boolean): number {
  const k = COL.k, lx = COL.lx, bw = COL.bw, hk = hash2(k, 2, seed + 3152);
  const glow = f.nL[i] * 0.55 + f.nM[i] * 0.45;
  if (lx === 0) return glowOk && glow > 0.6 ? (glow > 0.66 ? (h < 0.35 ? HOT[5] : HOT[4]) : h < 0.5 ? HOT[3] : HOT[2]) : BAS[0];
  const per = 11 + ((hk >>> 12) % 9), yy = wy + ((hk >>> 8) % 17), seg = Math.floor(yy / per), jy = yy - seg * per;
  const base = 2 + (hash2(k, seg, seed + 3153) % 3);
  let col: number;
  if (jy === 0) col = BAS[h < 0.8 ? 0 : 1];
  else if (jy === 1) col = BAS[lx < bw * 0.5 ? base + 2 : base + 1];
  else if (lx === 1) col = BAS[base + 2];
  else if (lx <= bw * 0.45) col = BAS[base + 1];
  else if (lx >= bw - 2) col = BAS[base - 1];
  else col = BAS[base - (h < 0.06 ? 1 : 0)];
  if (glowOk && glow > 0.6 && (lx === 1 || lx === bw - 1)) col = mix(col, HOT[2], glow > 0.66 ? 0.5 : 0.3);
  return col;
}
function faceCol(c: Chunk, f: GFld, i: number, wx: number, wy: number, h: number): number {
  const g = f.geom, v = g.fv[i], fh = g.fh[i], top = fh - v, seed = c.seed;
  colAt(wx, seed);
  const off = colOff(COL.k, seed);
  // kürzere Säulen: ihr Kopf liegt unter der Kante
  if (off < 0 && top < -off) return top === -off - 1 ? BAS[6] : COL.lx === 0 ? BAS[1] : BAS[4];
  let col = colFace(f, i, wx, wy, h, seed, v < fh * 0.85 && v > 1);
  if (off >= 0 && top === 0) col = mix(col, BAS[6], 0.5);
  // Ruß unter der Kante, dunkler Fuß
  if (top < 5 + f.nB[i] * 9 && (h < 0.55 || top < 3)) col = mix(col, INK, 0.22);
  if (v <= 2) col = mix(col, SHADE, v === 1 ? 0.55 : 0.32);
  else if (v <= 4 && h < 0.5) col = mix(col, SHADE, 0.2);
  if (!f.wallM[i - 1]) col = mix(col, BAS[6], 0.4);
  else if (!f.wallM[i + 1] || !f.wallM[i + 2]) col = mix(col, SHADE, 0.42);
  return col;
}
function topCol(c: Chunk, f: GFld, i: number, wx: number, wy: number, h: number): number {
  const g = f.geom, d = f.dTop[i], ts = g.ts[i], seed = c.seed;
  if (ts <= 6) {
    // höhere Säulen ragen über die Kante; darüber ihr heller Kopf
    colAt(wx, seed);
    const off = Math.max(0, colOff(COL.k, seed));
    if (ts <= off) return colFace(f, i, wx, wy, h, seed, false);
    if (ts === off + 1) return COL.lx === 0 ? BAS[3] : BAS[6];
    if (ts === off + 2) return COL.lx === 0 ? BAS[1] : h < 0.3 ? BAS[4] : BAS[5];
  }
  const lit = g.tn[i] <= 2 || !f.wallM[i - 1] || !f.wallM[i - 2];
  if (lit) return g.tn[i] === 1 || !f.wallM[i - 1] ? BAS[5] : BAS[4];
  if (d <= 1.01 && ts === 255) return BAS[0];
  // über einer Front zählt der Abstand zur Abbruchkante (ts ist nur bis 15 px exakt, deshalb auf die Staffelung gedehnt)
  const fade = (ts < 255 && ts * 2.4 < d ? ts * 2.4 : d) + (f.nB[i] - 0.5) * 10 + (f.nL[i] - 0.5) * 8;
  if (fade < 15) {
    // Säulenköpfe von oben: kleine Vielecke
    voro(wx, wy, 9, 7, seed + 3160);
    const s = V.dx * 0.6 + V.dy, hv = (V.id >>> 9) & 3;
    if (V.edge < 0.9) return BAS[0];
    let t = (fade < 7 ? 3 : 2) + (hv === 0 ? 1 : hv === 3 ? -1 : 0);
    if (V.edge < 2.1 && s < -0.8) t++; else if (s > 1.8) t--;
    return BAS[t < 1 ? 1 : t];
  }
  if (fade > 36) return f.nL[i] * 0.5 + f.nM[i] * 0.5 > 0.57 && ((wx + wy) & 1) ? VOIDR2 : VOIDR;
  // hitzerissige Platten, zum Inneren hin im Schwarzrot verlöschend
  voro(wx, wy, 20, 13, seed + 3161);
  if (V.edge < 1) return f.nC[i] * 0.5 + f.nM[i] * 0.5 > 0.62 ? (h < 0.4 ? HOT[2] : HOT[1]) : BAS[0];
  if (fade > 29 && ((wx + wy) & 1)) return VOIDR;
  const s = V.dx * 0.6 + V.dy;
  return V.edge < 2.4 && s < -1.5 ? BAS[fade < 24 ? 3 : 2] : s > 3 || h < 0.05 ? BAS[1] : BAS[fade < 24 ? 2 : 1];
}

// ------------------------------------------------------------------ Brücke: Steinplatten in Eisenbändern, Ketten
function bridgeCol(c: Chunk, dirs: Uint8Array, wx: number, wy: number, h: number): number {
  const map = c.map, cx = wx >> 4, cy = wy >> 4, lx = wx & 15, ly = wy & 15, seed = c.seed;
  const dir = dirs[cy * map.w + cx] || 1;
  const liq = (x: number, y: number): boolean => tileAt(map, x, y) === LIQUID;
  const sideA = dir === 1 ? liq(cx, cy - 1) : liq(cx - 1, cy), sideB = dir === 1 ? liq(cx, cy + 1) : liq(cx + 1, cy);
  const u = dir === 1 ? wx : wy, across = dir === 1 ? ly : lx, vv = dir === 1 ? wy : wx, ul = u & 15;
  const a = sideA ? across : 99, b = sideB ? 15 - across : 99;
  // Ketten entlang der Längsseiten
  const cl = ((u % 6) + 6) % 6;
  if (a === 2 || b === 3) return cl < 4 ? IRON[6] : IRON[4];
  if (a === 3 || b === 2) return cl === 1 || cl === 2 ? IRON[0] : cl < 4 ? IRON[3] : IRON[2];
  if (a === 0 || b === 0) return BAS[1];
  if (a === 1 || b === 1) return BAS[sideA && a === 1 ? 5 : 2];
  // Eisenband mit Nieten quer über jede Plattenfuge
  if (ul <= 2 || ul === 15) {
    if (ul === 15) return IRON[0];
    const rv = ((vv % 8) + 8) % 8;
    if (ul === 1 && rv === 3) return IRON[6];
    if (ul === 2 && rv === 3) return IRON[0];
    return IRON[ul === 0 ? 5 : ul === 1 ? 3 : 2];
  }
  const sk = u >> 4, vk = Math.floor((vv + (sk & 1) * 12) / 24), hs = hash2(sk, vk, seed + 3200);
  const vl = vv + (sk & 1) * 12 - vk * 24;
  if (vl === 23) return SLABR[0];
  let t = 1 + (hs % 3);
  if (ul === 3 || vl === 0) t += 2; else if (ul === 14 || vl === 22) t--;
  // Sprung in einzelnen Platten
  if ((hs >>> 6) % 4 === 0 && Math.abs(vl - 4 - (ul - 3) * 1.3 - ((hs >>> 9) & 7)) < 0.7) return SLABR[0];
  if (h < 0.05) t--; else if (h > 0.97) t++;
  let col = SLABR[t < 1 ? 1 : t > 5 ? 5 : t];
  if (a === 4 || b === 1) col = mix(col, SHADE, 0.38);
  return col;
}

// ------------------------------------------------------------------ Bodendecker
function groundCover(c: Chunk, f: GFld): void {
  const { W, kind } = c, seed = c.seed;
  // Trittplatten in der Wegmitte
  c.cells((cx, cy, t) => {
    if (t !== PATH) return;
    seedAt(cx, cy, seed + 3300);
    for (let k = 0; k < 2; k++) {
      const wx = cx * TS + 3 + ri(10), wy = cy * TS + 3 + ri(10), r = rf(), i = (wy - c.y0) * W + (wx - c.x0);
      if (kind[i] === S_PATH && f.dPath[i] > 9 && r < 0.3) c.blitK(GS.slab[ri(GS.slab.length)], wx, wy, A_PATH);
    }
  });
  c.cells((cx, cy) => {
    seedAt(cx, cy, seed + 3310);
    const x0 = cx * TS, y0 = cy * TS;
    for (let k = 0; k < 9; k++) {
      const wx = x0 + ri(16), wy = y0 + ri(16), r = rf(), i = (wy - c.y0) * W + (wx - c.x0), kd = kind[i];
      const hv = hash2(wx, wy, seed + 3311);
      if (kd === S_ASH) {
        const nearWall = f.dWall[i] < 20, dp = f.dToPath[i], nearLava = f.dShore[i] < 12;
        let q = r;
        if ((q -= dp > 2 && dp < 7 ? 0.03 : 0) < 0) c.blitK(GS.cairn[hv % GS.cairn.length], wx, wy, A_UP);
        else if ((q -= dp < 8 ? 0.1 : 0) < 0) c.blitK(GS.peb[hv % GS.peb.length], wx, wy, A_FLOORS);
        else if ((q -= 0.085) < 0) c.blitK(GS.cinder[hv % GS.cinder.length], wx, wy, A_FLOORS);
        else if ((q -= nearWall ? 0.1 : 0.03) < 0) c.blitK(GS.peb[hv % GS.peb.length], wx, wy, A_FLOORS);
        else if ((q -= nearWall ? 0.03 : 0.006) < 0) c.blitK(GS.pebL[hv % GS.pebL.length], wx, wy, A_FLOORS);
        else if ((q -= 0.03) < 0) c.blitK(GS.crack[hv % GS.crack.length], wx, wy, A_ASH);
        else if ((q -= 0.02) < 0) c.blitK(GS.scorch[hv % GS.scorch.length], wx, wy, A_ASH);
        else if ((q -= 0.03) < 0) c.blitK(GS.ripple[hv % GS.ripple.length], wx, wy, A_ASH);
        else if ((q -= 0.014) < 0) c.blitK(GS.twig[hv % GS.twig.length], wx, wy, A_FLOORS);
        else if ((q -= 0.005) < 0) c.blitK(GS.bone[hv % GS.bone.length], wx, wy, A_FLOORS);
        else if ((q -= nearLava ? 0.06 : 0.004) < 0) c.blitK(GS.spatter[hv % GS.spatter.length], wx, wy, A_FLOORS);
        else if ((q -= nearLava ? 0.04 : 0.006) < 0) c.blitK(GS.ember[hv % GS.ember.length], wx, wy, A_OPEN);
      } else if (kd === S_SLAG) {
        let q = r;
        if ((q -= 0.05) < 0) c.blitK(GS.cinder[hv % GS.cinder.length], wx, wy, A_FLOORS);
        else if ((q -= 0.035) < 0) c.blitK(GS.ember[hv % GS.ember.length], wx, wy, A_OPEN);
        else if ((q -= 0.02) < 0) c.blitK(GS.pebL[hv % GS.pebL.length], wx, wy, A_FLOORS);
      } else if (kd === S_PATH) {
        let q = r;
        if ((q -= 0.03) < 0) c.blitK(GS.peb[hv % GS.peb.length], wx, wy, A_PATH);
        else if ((q -= 0.03) < 0) c.blitK(GS.cinder[hv % GS.cinder.length], wx, wy, A_PATH);
        else if ((q -= f.dPath[i] > 6 ? 0.012 : 0) < 0) c.blitK(GS.crack[hv % GS.crack.length], wx, wy, A_PATH);
      } else if (kd === S_HAZ) {
        if (r < 0.14) c.blitK(GS.ember[hv % GS.ember.length], wx, wy, A_OPEN);
        else if (r < 0.19) c.blitK(GS.spatter[hv % GS.spatter.length], wx, wy, A_OPEN);
      }
    }
  });
}

// ------------------------------------------------------------------ Aufbauten
function structures(c: Chunk, f: GFld, dirs: Uint8Array): void {
  const { W, kind, map } = c, seed = c.seed, g = f.geom;
  c.cells((cx, cy, t) => {
    const x0 = cx * TS, y0 = cy * TS;
    seedAt(cx, cy, seed + 3330);
    for (let k = 0; k < 3; k++) {
      const wx = x0 + ri(16), wy = y0 + ri(16), r = rf(), i = (wy - c.y0) * W + (wx - c.x0);
      if (kind[i] !== S_FACE) continue;
      const fromTop = g.fh[i] - g.fv[i];
      if (r < 0.1 && fromTop >= 5 && fromTop <= 12 && g.fh[i] >= 24) c.blitK(GS.vein[ri(GS.vein.length)], wx, wy, A_FACE);
      else if (r < 0.5 && g.fv[i] < 5) c.blitK(GS.talus[ri(GS.talus.length)], wx, wy + g.fv[i] + 1, A_FOOT);
      else if (r < 0.6 && g.fv[i] < 5) c.blitK(GS.pebL[ri(GS.pebL.length)], wx, wy + g.fv[i] + 2, A_FOOT);
    }
    if (t === LIQUID) {
      seedAt(cx, cy, seed + 3331);
      for (let k = 0; k < 3; k++) {
        const wx = x0 + ri(16), wy = y0 + ri(16), r = rf(), i = (wy - c.y0) * W + (wx - c.x0);
        if (kind[i] === S_BANK && r < 0.22) c.blitK(GS.spatter[ri(GS.spatter.length)], wx, wy, A_SHORE);
        else if (kind[i] === S_BANK && r < 0.3) c.blitK(GS.ember[ri(GS.ember.length)], wx, wy, A_SHORE);
        else if (kind[i] === S_LAVA && f.dLand[i] - f.bankW[i] < 6 && r < 0.12) c.blitK(GS.spatter[ri(GS.spatter.length)], wx, wy, A_SHORE);
      }
    }
    if (t !== BRIDGE) return;
    const liq = (x: number, y: number): boolean => tileAt(map, x, y) === LIQUID;
    const br = (x: number, y: number): boolean => tileAt(map, x, y) === BRIDGE;
    const nL = liq(cx, cy - 1), sL = liq(cx, cy + 1), wL = liq(cx - 1, cy), eL = liq(cx + 1, cy), dir = dirs[cy * map.w + cx];
    if (sL) for (let x = 0; x < 16; x++) {
      const wx = x0 + x, band = dir === 1 && (x <= 2 || x === 15);
      c.setK(wx, y0 + 16, band ? IRON[3] : BAS[3], A_SHORE); c.setK(wx, y0 + 17, band ? IRON[2] : BAS[2], A_SHORE); c.setK(wx, y0 + 18, band ? IRON[0] : BAS[1], A_SHORE); c.setK(wx, y0 + 19, BAS[0], A_SHORE);
      for (let k = 0; k < 5; k++) c.setK(wx + (k >> 1), y0 + 20 + k, alpha(INK, k < 2 ? 130 : k < 4 ? 85 : 45), A_SHORE);
    }
    if (eL) for (let y = 0; y < 16; y++) for (let k = 0; k < 4; k++) c.setK(x0 + 16 + k, y0 + y + 2, alpha(INK, k < 2 ? 100 : 55), A_SHORE);
    const post = GS.post, end = (x: number, y: number): boolean => !br(x, y);
    if (dir === 1) {
      if (nL && end(cx - 1, cy)) c.blit(post[0], x0 + 2, y0 + 4);
      if (nL && end(cx + 1, cy)) c.blit(post[0], x0 + 13, y0 + 4);
      if (sL && end(cx - 1, cy)) c.blit(post[1], x0 + 2, y0 + 15);
      if (sL && end(cx + 1, cy)) c.blit(post[1], x0 + 13, y0 + 15);
    } else {
      if (wL && end(cx, cy - 1)) c.blit(post[0], x0 + 2, y0 + 6);
      if (eL && end(cx, cy - 1)) c.blit(post[0], x0 + 13, y0 + 6);
      if (wL && end(cx, cy + 1)) c.blit(post[1], x0 + 2, y0 + 16);
      if (eL && end(cx, cy + 1)) c.blit(post[1], x0 + 13, y0 + 16);
    }
  });
}

// ---------------------------------------------------------------------------------------------------- Maler
export const glut: BiomePainter = {
  biome: 'glut',
  paint(c) { if (c.map.dungeon) paintSchmiede(c); else paintOverworld(c); },
  liquid: glutLiquid,
};
