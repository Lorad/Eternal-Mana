/**
 * Verlorene Ruinen – „Was die Hüter zurückließen“. Bodenmaler v2 (Oberwelt); Aufbau wie gruenwald.ts (siehe core.ts).
 * Der Dungeon „Archiv der Stille“ liegt in ruinen_archiv.ts, Farben und Stempel in ruinen_stamps.ts, das Wasser in ruinen_liquid.ts.
 *
 *   GROUND   trockenes Grasland über altem Pflaster: Stroh- und Olivbüschel, sandige Kahlstellen, halb versunkene
 *            Platten und Scherben, Disteln, kleine gelbe Blüten.
 *   GROUND2  alter Platz: große verwitterte Platten mit Gras in den Fugen, verblichene Mosaikreste, Runenplatten.
 *   PATH     Prozessionsstraße: Bordsteine, zwei Plattenreihen mit Mittelrinne, Flugsand.
 *   WALL     Sandsteinmauern: Quaderfronten mit Wellenfries und Hüterreliefs, Halbsäulen, Nischen, Risse, Ranken;
 *            ausgebrochene Mauerkronen, Schutt, Säulenstümpfe; das Innere großer Massive ist überwuchert.
 *   LIQUID   gefasste Becken: Steinrand mit Stufe, Schwimmblätter;  HAZARD arkanes Brandfeld;  BRIDGE Steinplatten mit Balustrade.
 */
import { INK, alpha, hash2, mix, rnd2 } from '../palette';
import { BRIDGE, Chunk, LIQUID, SHADE, TS, allow, clamp, rf, ri, seedAt, tileAt, voro, V, type BiomePainter } from './core';
import { S_BANK, S_BRIDGE, S_FACE, S_FLOOR, S_G, S_G2, S_HAZ, S_PATH, S_TOP, S_VOID, S_WATER, SL, applyShadow, owFields, slabAt, type OW } from './frost_util';
import { ARC, ASH, GLYPHS, GRS, JADE, MOSS, PLZ, RS, RUNE, SAND, STN, TESS, TOPR, VOIDC, initRuinStamps } from './ruinen_stamps';
import { paintArchiv } from './ruinen_archiv';
import { ruinenLiquid } from './ruinen_liquid';

const A_GROUND = allow(S_G, S_G2, S_PATH, S_HAZ, S_BANK), A_GRASS = allow(S_G), A_PLAZA = allow(S_G2, S_FLOOR), A_PATH = allow(S_PATH), A_TOP = allow(S_TOP);
const A_TUFT = allow(S_G, S_G2, S_HAZ, S_BANK, S_PATH, S_TOP, S_FACE, S_FLOOR), A_SOFT = allow(S_G, S_G2, S_PATH, S_FLOOR);
const A_FACE = allow(S_FACE), A_WALL = allow(S_TOP, S_FACE), A_FOOT = allow(S_G, S_G2, S_PATH, S_HAZ, S_FACE, S_FLOOR), A_WATER = allow(S_WATER), A_SHORE = allow(S_BANK, S_WATER);
const A_HAZ = allow(S_HAZ), A_NOSHADE = allow(S_BRIDGE), A_ANY = allow(S_G, S_G2, S_PATH, S_HAZ, S_BANK, S_TOP, S_FACE, S_FLOOR);
const WAVE = [0, 1, 2, 2, 1, 0, -1, -2, -2, -1];
const zShade = (c: number): number => mix(c, mix(MOSS[0], INK, 0.3), 0.16), zSun = (c: number): number => mix(c, STN[5], 0.16);
const PLZZ = [PLZ.map(zShade), PLZ, PLZ.map(zSun)];
const ROAD = PLZ.map((c, k) => mix(c, STN[k], 0.55)), ROADZ = [ROAD.map(zShade), ROAD, ROAD.map(zSun)];

interface RF extends OW { nM: Float32Array }

function paintOverworld(c: Chunk): void {
  initRuinStamps();
  const { W, kind, buf } = c, seed = c.seed;
  const o = owFields(c, { salt: 500, masonry: true, bank: 8.5, bankVar: 1, bankBar: 0, liqFray: 0.35 });
  const f: RF = { ...o, nM: c.noise(33, 508) };
  for (let y = c.iy0; y < c.iy1; y++) for (let x = c.ix0; x < c.ix1; x++) {
    const i = y * W + x, wx = c.x0 + x, wy = c.y0 + y, z = f.zone[i], h = rnd2(wx, wy, seed);
    let col: number;
    switch (kind[i]) {
      case S_G: col = grassCol(c, f, i, wx, wy, z, h); break;
      case S_G2: case S_FLOOR: col = plazaCol(c, f, i, wx, wy, z, h); break;
      case S_PATH: col = roadCol(c, f, i, wx, wy, z, h); break;
      case S_HAZ: col = scorchCol(c, f, i, wx, wy, h); break;
      case S_BANK: col = rimCol(c, f, i, wx, wy, h); break;
      case S_WATER: col = waterCol(c, f, i, wx, wy); break;
      case S_TOP: col = topCol(c, f, i, wx, wy, h); break;
      case S_FACE: col = faceCol(c, f, i, wx, wy, h); break;
      case S_BRIDGE: col = bridgeCol(c, f, wx, wy, h); break;
      default: col = h > 0.993 ? mix(VOIDC, STN[1], 0.4) : VOIDC;
    }
    buf[i] = col;
  }
  groundCover(c, f);
  applyShadow(c, c.wallShadow(f.wallM, f.dWall, 14), f.nC, A_NOSHADE, [0.44, 0.3, 0.15]);
  structures(c, f);
}

// ------------------------------------------------------------------ Grasland
function grassCol(c: Chunk, f: RF, i: number, wx: number, wy: number, z: number, h: number): number {
  const W = c.W, kind = c.kind, seed = c.seed;
  // sandige Kahlstellen mit dunklerem Saum
  const sd = f.nL[i] * 0.5 + f.nM[i] * 0.3 + f.nC[i] * 0.2;
  if (sd > 0.62 && f.dShore[i] > 4) {
    if (sd < 0.634) return GRS[z][h < 0.5 ? 0 : 1];
    const off = hash2(wy, 4, seed + 510) & 3, hd = rnd2((wx + off) >> 2, wy, seed + 511);
    if (h > 0.985) return PLZ[4];
    return SAND[z][hd < 0.14 ? 1 : hd > 0.86 ? 4 : sd > 0.69 ? 3 : 2];
  }
  const v = f.nB[i] * 0.45 + f.nA[i] * 0.2 + f.nC[i] * 0.2 + f.nL[i] * 0.15;
  let t = v < 0.39 ? 0 : v < 0.47 ? 1 : v < 0.55 ? 2 : v < 0.63 ? 3 : 4;
  if (h < 0.035 && t > 0) t--; else if (h > 0.97 && t < 4) t++;
  const ku = kind[i - W], kd = kind[i + W];
  if (kd === S_PATH || kd === S_BANK || kd === S_G2) return GRS[z][0];
  if (ku === S_PATH || ku === S_G2) return GRS[z][4];
  if (f.dShore[i] < 5 + f.nA[i] * 4) return GRS[z > 0 ? z - 1 : 0][t > 0 ? t - 1 : 0];
  return GRS[z][t];
}

// ------------------------------------------------------------------ Platz
function plazaCol(c: Chunk, f: RF, i: number, wx: number, wy: number, z: number, h: number): number {
  const seed = c.seed, ku = c.kind[i - c.W];
  // die Grasnarbe wirft einen schmalen Schatten auf die tiefer liegende Platte
  if (ku === S_G) return mix(PLZ[1], INK, 0.12);
  const mo = f.nM[i] * 0.7 + f.nB[i] * 0.3;
  if (mo > 0.685) return mosaic(c, wx, wy, mo, z);
  slabAt(wx, wy, seed + 500, true);
  const e = SL.e, id = SL.id, sh = (id & 1023) / 1023, sh2 = ((id >>> 10) & 1023) / 1023;
  const gr = f.nB[i] * 0.6 + f.nC[i] * 0.4;
  // Fugen: Gras, Moos oder dunkle Erde
  if (e & 12) return gr > 0.5 ? GRS[z][gr > 0.6 ? 2 : 1] : gr > 0.43 ? MOSS[1] : PLZ[0];
  let base = sh < 0.2 ? 2 : sh < 0.6 ? 3 : sh < 0.9 ? 4 : 3;
  if ((id >>> 20) % 13 === 0 && SL.w >= 12 && SL.h >= 12) {
    // Runenplatte: eingemeißelter Rahmen, in der Mitte eine Glyphe mit schwacher Glutlinie
    const gx = SL.lx - ((SL.w - 5) >> 1), gy = SL.ly - ((SL.h - 7) >> 1);
    if (gx >= 0 && gx < 5 && gy >= 0 && gy < 7 && GLYPHS[(id >>> 24) % GLYPHS.length][gy * 5 + gx]) return h < 0.3 ? RUNE[2] : RUNE[1];
    if (gx >= -1 && gx < 6 && gy >= -1 && gy < 8 && h < 0.5) return mix(PLZ[2], RUNE[0], 0.5);
    const fx = Math.min(SL.lx, SL.w - 1 - SL.lx), fy = Math.min(SL.ly, SL.h - 1 - SL.ly);
    if ((fx === 2 && fy >= 2) || (fy === 2 && fx >= 2)) return PLZ[1];
    base = 3;
  }
  if (e & 3) return gr > 0.68 && h < 0.5 ? MOSS[2] : PLZZ[z][base + 1];
  let t = base;
  if (f.nC[i] > 0.64 && sh2 > 0.45) t--;
  if (h < 0.04) t--; else if (h > 0.97) t++;
  return PLZZ[z][t];
}
/** Verblichener Mosaikrest: 2×2-Steinchen in Wellenbändern, viele ausgebrochen. */
function mosaic(c: Chunk, wx: number, wy: number, mo: number, z: number): number {
  const tx = Math.floor(wx / 3), ty = Math.floor(wy / 3), ht = hash2(tx, ty, c.seed + 520);
  if (mo < 0.697 + (ht & 7) * 0.003) return PLZ[ht & 8 ? 2 : 3];
  if (wx - tx * 3 === 2 || wy - ty * 3 === 2) return PLZ[ht & 16 ? 2 : 3];
  if (ht % 7 === 0) return PLZ[2];
  const wv = Math.round(Math.sin(tx * 0.62) * 1.7), band = (((ty + wv) % 10) + 10) % 10;
  let col = band < 2 ? TESS[1] : band === 3 ? TESS[2] : band === 5 ? TESS[3] : band === 7 ? TESS[0] : band === 8 ? TESS[1] : TESS[4];
  // kleine Rauten im Elfenbeinband
  if (band === 4 && ((tx + (ty >> 1)) % 4 + 4) % 4 === 0) col = TESS[5];
  col = mix(col, PLZ[4], 0.1 + ((ht >>> 8) & 3) * 0.07);
  return z === 0 ? zShade(col) : col;
}

// ------------------------------------------------------------------ Prozessionsstraße
function roadCol(c: Chunk, f: RF, i: number, wx: number, wy: number, z: number, h: number): number {
  const d = f.dPath[i], W = c.W, kind = c.kind, seed = c.seed, D = f.dPath;
  const ku = kind[i - W], kl = kind[i - 1];
  if (ku === S_G || ku === S_G2 || ku === S_HAZ) return mix(PLZ[1], INK, 0.15);
  if (kl === S_G) return PLZ[1];
  // Flugsand, der über die Platten weht
  const sd = f.nL[i] * 0.42 + f.nB[i] * 0.4 + f.nC[i] * 0.18;
  if (sd > 0.675 && d > 1.5) {
    if (sd < 0.69) return h < 0.5 ? SAND[z][2] : PLZ[3];
    const yy = wy + ((f.nB[i] * 9) | 0);
    return SAND[z][yy % 5 === 0 ? 2 : h > 0.96 ? 4 : 3];
  }
  const gx = D[i + 1] - D[i - 1], gy = D[i + W] - D[i - W], vert = Math.abs(gx) > Math.abs(gy);
  const along = vert ? wy : wx, side = (vert ? gx : gy) > 0 ? 0 : 1;
  if (d < 4.4) {
    // Bordsteine: leicht erhöht, innen eine Schattenfuge
    const m = (((along + side * 5) % 10) + 10) % 10;
    if (d >= 3.4) return PLZ[1];
    if (m === 0) return PLZ[1];
    const hs = rnd2(Math.floor((along + side * 5) / 10), side + (vert ? 2 : 0), seed + 530);
    if (d < 1.3) return side === 0 ? PLZ[5] : PLZ[3];
    return f.nB[i] > 0.66 && h < 0.6 ? MOSS[2] : PLZZ[z][hs < 0.3 ? 3 : 4];
  }
  // Mittelrinne entlang des Grats
  if (d > 9 && ((d >= D[i - 1] && d >= D[i + 1] && d > D[i - 2] && d > D[i + 2]) || (d >= D[i - W] && d >= D[i + W] && d > D[i - 2 * W] && d > D[i + 2 * W]))) return h < 0.2 ? PLZ[2] : PLZ[1];
  // Plattenreihen im Läuferverband: breite, ausgetretene Rechteckplatten, etwas wärmer als der Platz
  const row = Math.floor((wy + 4) / 11), ry = wy + 4 - row * 11, xx = wx + (row & 1) * 9 + (hash2(row, 3, seed + 531) % 5), k = Math.floor(xx / 19), m = xx - k * 19;
  const hs = rnd2(k, row, seed + 532), hs2 = rnd2(k, row, seed + 533);
  if (ry === 10 || m === 18) return f.nB[i] > 0.62 ? GRS[z][1] : ROAD[0];
  let t = hs < 0.25 ? 2 : hs < 0.7 ? 3 : 4;
  if (ry === 0 || m === 0) return ROADZ[z][t + 1];
  if (ry === 9 || m === 17) t--;
  // Verwitterungsflecken, ausgebrochene Ecke
  if (f.nC[i] > 0.66 && hs2 > 0.4) t--;
  if (hs2 < 0.14 && m + ry < 4) return ROAD[1];
  if (h < 0.04) t--; else if (h > 0.97) t++;
  return ROADZ[z][clamp(t, 1, 5)];
}

// ------------------------------------------------------------------ arkanes Brandfeld
function scorchCol(c: Chunk, f: RF, i: number, wx: number, wy: number, h: number): number {
  const ku = c.kind[i - c.W], kl = c.kind[i - 1];
  if (ku === S_G || ku === S_G2 || kl === S_G) return ASH[0];
  voro(wx, wy, 12, 10, c.seed + 540);
  const gl = f.nB[i] * 0.6 + f.nC[i] * 0.4, hv = (V.id >>> 16) / 65536, s = V.dx + V.dy;
  // Risse: stellenweise glimmt arkanes Licht heraus
  if (V.edge < 0.9) return gl > 0.5 ? (h < 0.3 ? ARC[3] : ARC[2]) : ASH[0];
  if (V.edge < 2.1 && gl > 0.5) return mix(ASH[1], ARC[1], 0.6);
  if (V.edge < 1.9 && s < 0) return ASH[3];
  if (h > 0.992) return ARC[2];
  let t = hv < 0.3 ? 1 : hv < 0.75 ? 2 : 3;
  if (h < 0.06) t--;
  return ASH[t];
}

// ------------------------------------------------------------------ Becken: Steinrand mit Stufe
function rimCol(c: Chunk, f: RF, i: number, wx: number, wy: number, h: number): number {
  const d = f.dLand[i], dw = f.dWat[i], W = c.W, seed = c.seed;
  const ny = (f.dLand[i + W] - f.dLand[i - W]) * 0.5, nx = (f.dLand[i + 1] - f.dLand[i - 1]) * 0.5;
  const horiz = Math.abs(ny) >= Math.abs(nx), along = horiz ? wx : wy;
  const seg = (((along + (hash2(horiz ? wy >> 5 : wx >> 5, 5, seed + 550) % 11)) % 11) + 11) % 11;
  const lit = nx + ny > 0;
  // Randsteine
  if (d < 1.1) return PLZ[1];
  if (d < 5.2) {
    if (seg === 10) return f.nB[i] > 0.55 ? MOSS[1] : PLZ[1];
    if (d < 2.2) return lit ? PLZ[5] : PLZ[4];
    if (d >= 4.2) return lit ? PLZ[3] : PLZ[5];
    return f.nB[i] > 0.7 ? MOSS[2] : h < 0.08 ? PLZ[3] : PLZ[4];
  }
  if (d < 6.2) return ny > 0.3 ? mix(PLZ[1], INK, 0.25) : PLZ[1];
  // untere Stufe: nass, veralgt; am Nordufer sieht man zusätzlich die Beckenwand
  if (ny > 0.35 && dw > 2.2 && d < 9.5) return seg === 10 ? PLZ[0] : mix(PLZ[2], JADE, 0.25);
  if (dw <= 1.2) return ny > 0 ? mix(PLZ[1], JADE, 0.5) : mix(PLZ[4], MOSS[3], 0.3);
  const seg2 = (((along + 5) % 11) + 11) % 11;
  if (seg2 === 10) return mix(PLZ[0], JADE, 0.4);
  return f.nC[i] > 0.6 ? MOSS[h < 0.4 ? 1 : 2] : mix(PLZ[h < 0.1 ? 2 : 3], MOSS[2], 0.3);
}
function waterCol(c: Chunk, f: RF, i: number, wx: number, wy: number): number {
  const bw = f.bankW[i], d = f.dLand[i], dw = d - bw, W = c.W;
  const ny = (f.dLand[i + W] - f.dLand[i - W]) * 0.5;
  if (ny > 0.35) {
    if (dw < 1.6) return alpha(INK, 130);
    if (dw < 3) return alpha(JADE, 110);
    if (dw < 4 && rnd2(wx >> 1, wy, 77) > 0.4) return alpha(MOSS[4], 150);
  } else if (dw < 1.1 && rnd2(wx >> 1, wy >> 1, 78) > 0.3) return alpha(MOSS[4], 150);
  else if (dw < 2.2 && ny > -0.3) return alpha(JADE, 75);
  const dd = d + (f.nB[i] - 0.5) * 8 + (f.nL[i] - 0.5) * 7;
  if (dd > 30) return alpha(JADE, 105);
  if (dd > 20) return alpha(JADE, 60);
  return 0;
}

// ------------------------------------------------------------------ Mauer: Oberseite
function topCol(c: Chunk, f: RF, i: number, wx: number, wy: number, h: number): number {
  const g = f.geom, d = f.dTop[i], ts = g.ts[i], seed = c.seed;
  // Mauerkrone an der Abbruchkante: helle Decksteine
  if (ts <= 4) {
    if (ts === 4) return STN[1];
    const cj = (((wx + (hash2((wy + ts) >> 4, 2, seed + 560) % 13)) % 13) + 13) % 13;
    return cj === 0 ? STN[2] : ts === 1 ? STN[4] : h < 0.12 ? STN[4] : STN[5];
  }
  // übrige Kanten: Brüstungssteine, links hell, rechts dunkel
  if (d <= 4.01) {
    const wOpen = !f.wallM[i - 1] || !f.wallM[i - 2] || !f.wallM[i - 3], nOpen = g.tn[i] <= 3, eOpen = !f.wallM[i + 1] || !f.wallM[i + 2] || !f.wallM[i + 3];
    const along = nOpen ? wx : wy, cj = (((along + (hash2((nOpen ? wy : wx) >> 4, 3, seed + 561) % 11)) % 11) + 11) % 11;
    if (d > 3.01) return STN[1];
    if (cj === 0) return STN[1];
    if (d <= 1.01) return wOpen ? STN[5] : nOpen ? STN[4] : eOpen ? STN[2] : STN[3];
    return wOpen ? STN[4] : nOpen ? STN[4] : STN[3];
  }
  // dahinter Füllmauerwerk aus Bruchstein, das nach innen im Bewuchs verschwindet
  const veg = d + (f.nB[i] - 0.5) * 9 + (f.nA[i] - 0.5) * 4;
  if (veg < 10) {
    slabAt(wx, wy, seed + 565);
    if (SL.e & 12) return f.nC[i] > 0.5 ? MOSS[1] : STN[0];
    const sh = (SL.id & 255) / 255;
    if (SL.e & 3) return STN[3];
    return f.nC[i] > 0.7 ? MOSS[2] : STN[h < 0.06 ? 1 : sh < 0.4 ? 2 : 3];
  }
  if (veg < 11.2) return TOPR[2];
  const deep = clamp((d - 12) / 24, 0, 1), v = f.nB[i] * 0.5 + f.nC[i] * 0.3 + f.nL[i] * 0.2;
  let t = Math.round(6.6 - deep * 5.8 + (v - 0.5) * 2.8);
  if (h < 0.04) t--; else if (h > 0.965) t++;
  return TOPR[t < 0 ? 0 : t > 7 ? 7 : t];
}

// ------------------------------------------------------------------ Mauer: Front
function faceCol(c: Chunk, f: RF, i: number, wx: number, wy: number, h: number): number {
  const g = f.geom, v = g.fv[i], fh = g.fh[i], top = fh - v, seed = c.seed, tall = fh >= 26;
  let col: number;
  if (top < 3) {
    // Decksteinreihe
    const cj = (((wx + (hash2((wy - top) >> 4, 2, seed + 560) % 13)) % 13) + 13) % 13;
    col = top === 2 ? STN[1] : cj === 0 ? STN[2] : top === 0 ? STN[4] : h < 0.15 ? STN[2] : STN[3];
  } else {
    // Halbsäulen in unregelmäßigen Abständen
    const cs = Math.floor((wx + 7) / 44), cl = wx + 7 - cs * 44 - 6 - (hash2(cs, 1, seed + 562) % 26);
    const hasCol = tall && hash2(cs, 2, seed + 563) % 4 !== 0;
    if (hasCol && cl >= -1 && cl <= 8 && (top <= 5 || v <= 3)) {
      // Kapitell und Basis kragen 1 px aus
      if (top <= 5) col = top === 3 ? STN[5] : top === 4 ? (cl < 5 ? STN[5] : STN[4]) : STN[2];
      else col = v === 3 ? STN[5] : v === 2 ? (cl < 5 ? STN[4] : STN[3]) : STN[1];
    } else if (hasCol && cl >= 0 && cl < 8) {
      let t = cl < 2 ? 5 : cl < 4 ? 4 : cl < 6 ? 3 : cl === 6 ? 2 : 1;
      if (cl === 2 || cl === 5) t--;
      if (((wy % 12) + 12) % 12 === 0) t -= 2;
      if (top === 6) t--;
      if (f.nB[i] > 0.7 && v < 12 && h < 0.6) col = MOSS[2]; else col = STN[t < 1 ? 1 : t];
    } else {
      const damp = f.nB[i] * 0.6 + f.nC[i] * 0.4;
      if (tall && top >= 7 && top <= 15) {
        // Relieffries: Rahmenleisten, dazwischen ein Wellenband
        if (top === 7) col = STN[5];
        else if (top === 15) col = STN[1];
        else if (top === 8 || top === 14) col = STN[3];
        else { const cr = WAVE[((wx % 10) + 10) % 10], yy = top - 11; col = yy === cr ? STN[5] : yy === cr + 1 ? STN[1] : h < 0.06 ? STN[3] : STN[2]; }
        if (damp > 0.74) col = MOSS[h < 0.4 ? 1 : 2];
      } else {
        // Quader: 8 px hohe Lagen, große Blöcke unregelmäßiger Breite
        const row = wy >> 3, ry = wy & 7;
        const xx = wx + (hash2(row, 0, seed + 564) % 19), k0 = Math.floor(xx / 19);
        let k = k0, start = k0 * 19 + (hash2(k0, row, seed + 565) % 9);
        if (xx < start) { k = k0 - 1; start = k * 19 + (hash2(k, row, seed + 565) % 9); }
        const end = (k + 1) * 19 + (hash2(k + 1, row, seed + 565) % 9), lx = xx - start, bw = end - start;
        const hb = rnd2(k, row, seed + 566), hb2 = rnd2(k, row, seed + 567);
        const base = hb < 0.25 ? 2 : hb < 0.7 ? 3 : 4;
        const mossy = damp + (hb2 > 0.7 ? 0.1 : 0) + (1 - v / fh) * 0.1 > 0.72;
        if (ry === 7 || lx === bw - 1) col = damp > 0.62 ? MOSS[0] : STN[0];
        else if (ry === 0) col = mossy ? MOSS[3] : STN[Math.min(5, base + 1)];
        else if (lx === 0) col = mossy ? MOSS[2] : STN[Math.min(5, base + 1)];
        else if (ry === 6 || (lx >= bw - 2 && ry > 3)) col = mossy ? MOSS[0] : STN[base - 1];
        else col = mossy ? (h < 0.3 ? MOSS[2] : MOSS[1]) : STN[base];
        // ausgebrochene Ecken, Verwitterungsnarben
        if (hb2 > 0.5 && hb2 < 0.62 && lx <= 2 && ry <= 1) col = STN[0];
        if (hb2 < 0.12 && lx >= bw - 4 && ry >= 5) col = STN[0];
        if (!mossy && ry !== 7) { if (h < 0.04) col = STN[base - 1]; else if (h > 0.975) col = STN[5]; }
      }
      // Schlagschatten der Halbsäule
      if (hasCol && (cl === 8 || cl === 9) && top > 5 && v > 3) col = mix(col, SHADE, cl === 8 ? 0.42 : 0.2);
    }
  }
  // Schatten unter den Decksteinen, dunkler Fuß, Enden
  if (top === 3 || (top === 4 && h < 0.35)) col = mix(col, SHADE, 0.36);
  if (v === 1) col = mix(col, SHADE, 0.45); else if (v <= 3) col = mix(col, SHADE, 0.22);
  if (!f.wallM[i - 1]) col = mix(col, STN[5], 0.5);
  else if (!f.wallM[i + 1]) col = mix(col, SHADE, 0.5);
  else if (!f.wallM[i + 2]) col = mix(col, SHADE, 0.25);
  return col;
}

// ------------------------------------------------------------------ Brücke: Steinplatten mit Balustrade
function bridgeCol(c: Chunk, f: RF, wx: number, wy: number, h: number): number {
  const map = c.map, cx = wx >> 4, cy = wy >> 4, lx = wx & 15, ly = wy & 15, seed = c.seed;
  const dir = f.dirs[cy * map.w + cx] || 1;
  const liq = (x: number, y: number): boolean => tileAt(map, x, y) === LIQUID;
  const nL = liq(cx, cy - 1), sL = liq(cx, cy + 1), wL = liq(cx - 1, cy), eL = liq(cx + 1, cy);
  const rail = (k: number, along: number): number => {
    const m = ((along % 4) + 4) % 4;
    return k === 0 ? STN[5] : k === 1 ? STN[4] : k === 2 ? (m < 2 ? STN[3] : mix(STN[0], INK, 0.3)) : k === 3 ? (m < 2 ? STN[2] : mix(STN[0], INK, 0.3)) : STN[1];
  };
  if (dir === 1) {
    if (nL && ly < 5) return rail(ly, wx);
    if (sL && ly > 10) return rail(ly - 11, wx);
  } else {
    if (wL && lx < 4) return lx === 0 ? STN[1] : lx === 1 ? STN[5] : lx === 2 ? STN[4] : STN[1];
    if (eL && lx > 11) return lx === 15 ? STN[1] : lx === 12 ? STN[1] : lx === 13 ? STN[4] : STN[2];
  }
  const u = dir === 1 ? wx : wy, vv = dir === 1 ? wy : wx, row = Math.floor(u / 9), ru = u - row * 9;
  const v2 = vv + (row & 1) * 7, k = Math.floor(v2 / 14), rv = v2 - k * 14, hs = rnd2(row, k, seed + 570);
  if (ru === 8 || rv === 13) return PLZ[0];
  let t = hs < 0.25 ? 2 : hs < 0.7 ? 3 : 4;
  if (ru === 0 || rv === 0) t++;
  if (h < 0.05) t--; else if (h > 0.97) t++;
  let col = PLZ[clamp(t, 1, 5)];
  if (dir === 1 ? nL && ly === 5 : wL && lx === 4) col = mix(col, SHADE, 0.4);
  return col;
}

// ------------------------------------------------------------------ Bodendecker
const SX = new Int32Array(16), SY = new Int32Array(16), SR = new Float32Array(16);
function groundCover(c: Chunk, f: RF): void {
  const { W, kind } = c, seed = c.seed;
  c.cells((cx, cy) => {
    seedAt(cx, cy, seed + 200);
    const N = 11;
    for (let k = 0; k < N; k++) {
      const x = cx * TS + ri(16), y = cy * TS + ri(16), r = rf();
      let j = k;
      while (j > 0 && SY[j - 1] > y) { SX[j] = SX[j - 1]; SY[j] = SY[j - 1]; SR[j] = SR[j - 1]; j--; }
      SX[j] = x; SY[j] = y; SR[j] = r;
    }
    for (let k = 0; k < N; k++) {
      const wx = SX[k], wy = SY[k], r = SR[k], i = (wy - c.y0) * W + (wx - c.x0), kd = kind[i], z = f.zone[i];
      const hv = hash2(wx, wy, seed + 201);
      if (kd === S_G) {
        const sandy = f.nL[i] * 0.5 + f.nM[i] * 0.3 + f.nC[i] * 0.2 > 0.62;
        // Büscheldichte schwankt; Stroh in hellen, Oliv in dunklen Flecken
        const dens = sandy ? 0.1 : 0.4 + 0.5 * clamp((f.nB[i] * 0.6 + f.nA[i] * 0.4 - 0.3) * 2.4, 0, 1);
        if (r > dens) continue;
        const q = r / dens, v = f.nB[i] * 0.45 + f.nL[i] * 0.2 + (q - 0.5) * 0.5 + 0.17;
        if (q > 0.9) c.blitK(RS.tall[z][hv % RS.tall[z].length], wx, wy, A_TUFT);
        else { const set = RS.tuft[z][v > 0.52 ? 1 : 0]; c.blitK(set[hv % set.length], wx, wy, A_TUFT); }
      } else if (kd === S_G2 || kd === S_FLOOR) {
        // Gras sitzt in den Fugen
        slabAt(wx, wy, seed + 500, true);
        if ((SL.e & 12) && r < 0.5 && f.nM[i] * 0.7 + f.nB[i] * 0.3 <= 0.685) c.blitK((r < 0.2 ? RS.tuft[z][hv & 1] : RS.tiny[z])[hv % 8], wx, wy + 1, A_TUFT);
      } else if (kd === S_PATH) {
        const d = f.dPath[i];
        if (d < 3 ? r < 0.3 : r < 0.035) { const set = d < 3 && r < 0.15 ? RS.tuft[z][1] : RS.tiny[z]; c.blitK(set[hv % set.length], wx, wy, A_GROUND); }
      } else if (kd === S_TOP) {
        const d = f.dTop[i];
        if (d > 7 && r < 0.5) { const set = d > 14 ? RS.tuft[0][0] : RS.tuft[0][r < 0.2 ? 1 : 0]; c.blitK(set[hv % set.length], wx, wy, A_TOP); }
      } else if (kd === S_BANK) {
        if (f.dLand[i] < 1.5 && r < 0.4) c.blitK(RS.tuft[z][hv & 1][hv % 12], wx, wy, A_ANY);
      }
    }
  });
  c.cells((cx, cy) => {
    seedAt(cx, cy, seed + 210);
    const x0 = cx * TS, y0 = cy * TS;
    for (let k = 0; k < 6; k++) {
      const wx = x0 + ri(16), wy = y0 + ri(16), r = rf(), i = (wy - c.y0) * W + (wx - c.x0), kd = kind[i];
      const hv = hash2(wx, wy, seed + 212), nearWall = f.dWall[i] < 20;
      let q = r;
      if (kd === S_G) {
        // altes Pflaster schaut in Nestern heraus
        const pv = clamp((f.nM[i] - 0.42) * 3, 0, 1);
        if ((q -= 0.003 + pv * pv * 0.06) < 0) c.blitK(RS.slab[hv % RS.slab.length], wx, wy, A_GRASS);
        else if ((q -= 0.07) < 0) c.blitK(RS.bloom[hv % RS.bloom.length], wx, wy, A_GRASS);
        else if ((q -= 0.016) < 0) c.blitK(RS.thistle[hv % RS.thistle.length], wx, wy, A_TUFT);
        else if ((q -= 0.03) < 0) c.blitK(RS.pebble[hv % RS.pebble.length], wx, wy, A_GROUND);
        else if ((q -= 0.02) < 0) c.blitK(RS.shard[hv % RS.shard.length], wx, wy, A_GROUND);
        else if ((q -= nearWall ? 0.05 : 0.004) < 0) c.blitK(RS.rubble[hv % 6], wx, wy, A_SOFT);
        else if ((q -= 0.04) < 0) c.blitK(RS.grit[hv % RS.grit.length], wx, wy, A_GROUND);
      } else if (kd === S_G2 || kd === S_FLOOR) {
        if ((q -= 0.035) < 0) c.blitK(RS.crack[hv % RS.crack.length], wx, wy, A_PLAZA);
        else if ((q -= 0.025) < 0) c.blitK(RS.mossBlob[hv % RS.mossBlob.length], wx, wy, A_PLAZA);
        else if ((q -= 0.02) < 0) c.blitK(RS.pebble[hv % RS.pebble.length], wx, wy, A_PLAZA);
        else if ((q -= 0.025) < 0) c.blitK(RS.shard[hv % RS.shard.length], wx, wy, A_PLAZA);
        else if ((q -= 0.02) < 0) c.blitK(RS.bloom[hv % RS.bloom.length], wx, wy, A_PLAZA);
        else if ((q -= nearWall ? 0.04 : 0.006) < 0) c.blitK(RS.rubble[hv % 6], wx, wy, A_SOFT);
        else if ((q -= 0.05) < 0) c.blitK(RS.grit[hv % RS.grit.length], wx, wy, A_PLAZA);
      } else if (kd === S_PATH) {
        if ((q -= 0.04) < 0) c.blitK(RS.crack[hv % RS.crack.length], wx, wy, A_PATH);
        else if ((q -= 0.03) < 0) c.blitK(RS.pebble[hv % RS.pebble.length], wx, wy, A_PATH);
        else if ((q -= 0.08) < 0) c.blitK(RS.grit[hv % RS.grit.length], wx, wy, A_PATH);
        else if ((q -= 0.015) < 0) c.blitK(RS.mossBlob[hv % RS.mossBlob.length], wx, wy, A_PATH);
      } else if (kd === S_TOP) {
        const d = f.dTop[i];
        if (d > 5 && d < 16 && (q -= 0.1) < 0) c.blitK(RS.rubble[hv % RS.rubble.length], wx, wy, A_TOP);
        else if (d > 5 && (q -= 0.05) < 0) c.blitK(RS.mossBlob[hv % RS.mossBlob.length], wx, wy, A_TOP);
        else if (d > 9 && (q -= 0.04) < 0) c.blitK(RS.pebble[hv % RS.pebble.length], wx, wy, A_TOP);
        else if (d > 12 && (q -= 0.03) < 0) c.blitK(RS.bloom[hv % RS.bloom.length], wx, wy, A_TOP);
      } else if (kd === S_HAZ) {
        if ((q -= 0.1) < 0) c.blitK(RS.glyph[hv % RS.glyph.length], wx, wy, A_HAZ);
        else if ((q -= 0.12) < 0) c.blitK(RS.scorch[hv % RS.scorch.length], wx, wy, A_HAZ);
      }
    }
  });
}

// ------------------------------------------------------------------ Aufbauten
function structures(c: Chunk, f: RF): void {
  const { W, kind, map } = c, seed = c.seed, g = f.geom, dirs = f.dirs;
  c.cells((cx, cy, t) => {
    const x0 = cx * TS, y0 = cy * TS;
    seedAt(cx, cy, seed + 230);
    // Mauerfronten: Ranken von der Krone, Reliefs im Fries, Nischen, Risse, Schutt und Gras am Fuß
    for (let k = 0; k < 3; k++) {
      const wx = x0 + ri(16), wy = y0 + ri(16), r = rf(), i = (wy - c.y0) * W + (wx - c.x0);
      if (kind[i] !== S_FACE) continue;
      // (Reichweite: nur von Zellen aus verankern, die höchstens 12 px unter der Oberkante liegen → ≤ BLEED)
      const fromTop = g.fh[i] - g.fv[i], tall = g.fh[i] >= 26;
      if (fromTop <= 12 && r < 0.3) c.blitK(RS.vine[ri(RS.vine.length)], wx, wy - fromTop + 1, A_WALL);
      else if (fromTop <= 12 && r < 0.42 && tall) c.blitK(RS.keeper[ri(RS.keeper.length)], wx, wy - fromTop + 11, A_FACE);
      else if (r < 0.5 && tall && fromTop >= 14 && fromTop <= 16 && k === 0) c.blitK(RS.niche[ri(RS.niche.length)], wx, wy - fromTop + 28, A_FACE);
      else if (r < 0.62 && fromTop > 15) c.blitK(RS.faceCrack[ri(RS.faceCrack.length)], wx, wy, A_FACE);
      else if (r < 0.8 && g.fv[i] < 5) { if (r < 0.7) c.blitK(RS.tuft[0][ri(2)][ri(12)], wx, wy + g.fv[i], A_FOOT); else c.blitK(RS.rubble[ri(6)], wx, wy + g.fv[i] + 1, A_FOOT); }
      else if (r < 0.9) c.blitK(RS.mossBlob[ri(RS.mossBlob.length)], wx, wy, A_FACE);
    }
    // Säulenstümpfe in Reihen auf der Mauerkrone
    if (hash2(cx >> 2, cy, seed + 232) % 3 === 0) {
      const wx = x0 + 8, wy = y0 + 8, i = (wy - c.y0) * W + (wx - c.x0), ts = g.ts[i];
      if (kind[i] === S_TOP && ts < 255) c.blitK(RS.stump[hash2(cx, cy, seed + 233) % RS.stump.length], wx, wy + ts - 6, A_TOP);
    }
    // Schwimmblätter und Schilf im Becken
    if (t === LIQUID) {
      seedAt(cx, cy, seed + 231);
      for (let k = 0; k < 3; k++) {
        const wx = x0 + ri(16), wy = y0 + ri(16), r = rf(), i = (wy - c.y0) * W + (wx - c.x0);
        const dw = f.dLand[i] - f.bankW[i];
        if (kind[i] === S_WATER && dw > 2 && dw < 14 && r < 0.45) c.blitK(RS.lily[ri(RS.lily.length)], wx, wy, A_WATER);
        else if (kind[i] === S_BANK && f.dWat[i] < 2.5 && r < 0.25) c.blitK(RS.reed[ri(RS.reed.length)], wx, wy, A_SHORE);
        else if (kind[i] === S_BANK && r < 0.2) c.blitK(RS.mossBlob[ri(RS.mossBlob.length)], wx, wy, A_SHORE);
      }
    }
    if (t !== BRIDGE) return;
    // Brücke: Stirnseite der Platten + Schlagschatten auf dem Wasser, Pfosten an den Geländerenden
    const liq = (x: number, y: number): boolean => tileAt(map, x, y) === LIQUID;
    const br = (x: number, y: number): boolean => tileAt(map, x, y) === BRIDGE;
    const nL = liq(cx, cy - 1), sL = liq(cx, cy + 1), wL = liq(cx - 1, cy), eL = liq(cx + 1, cy), dir = dirs[cy * map.w + cx];
    if (sL) for (let x = 0; x < 16; x++) {
      const wx = x0 + x;
      c.setK(wx, y0 + 16, STN[3], A_SHORE); c.setK(wx, y0 + 17, wx % 9 === 0 ? STN[1] : STN[2], A_SHORE); c.setK(wx, y0 + 18, STN[1], A_SHORE); c.setK(wx, y0 + 19, STN[0], A_SHORE);
      for (let k = 0; k < 6; k++) c.setK(wx + (k >> 1), y0 + 20 + k, alpha(INK, k < 2 ? 125 : k < 4 ? 85 : 45), A_SHORE);
    }
    if (eL) for (let y = 0; y < 16; y++) for (let k = 0; k < 4; k++) c.setK(x0 + 16 + k, y0 + y + 2, alpha(INK, k < 2 ? 100 : 55), A_SHORE);
    const post = RS.post, end = (x: number, y: number): boolean => !br(x, y);
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
  void S_VOID;
}

// ---------------------------------------------------------------------------------------------------- Maler
export const ruinen: BiomePainter = {
  biome: 'ruinen',
  paint(c) { if (c.map.dungeon) paintArchiv(c); else paintOverworld(c); },
  liquid: ruinenLiquid,
};
