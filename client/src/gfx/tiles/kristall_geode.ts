/**
 * Kristallhöhlen-Dungeon „Tiefe Geode“: das Innere einer riesigen Geode, zu Hallen ausgebaut.
 *   Wände   dunkler Fels, dicht mit Drusenrasen (Facettenfeldern) und großen Kristallen besetzt, leuchtende Adern;
 *           Pfeiler sind Kristallsäulen
 *   Boden   geschliffene, polierte Steinfliesen mit Kristalleinlagen; je Raum ein anderes Muster (Sechseck mit Sternen,
 *           Achteck mit Kristallrauten, Plattenverband mit Leuchtfugen); Mandala in großen Räumen, strahlende Sonne
 *           aus Gold- und Kristalleinlagen im Bossraum (Kristallkoloss des Lichts), Läufer mit Leuchtlinie in Gängen
 *   Becken  polierte Einfassung mit Kristallknäufen;  Gefahr: Kristallwuchs durch zerbrochene Fliesen
 */
import { INK, P, WHITE, alpha, hash2, mix, rnd2 } from '../palette';
import { Chunk, HAZARD, LIQUID, SHADE, TS, VOID, WALL, allow, lut, rf, ri, seedAt, tileAt, tones, voro, V, type WallGeom } from './core';
import { CYR, DEEP, MGR, VIR } from './kristall_pal';
import { KS, initKristallStamps } from './kristall_stamps';
import { HX, SLAB, corridorOrigin, hexAt, roomInfo, slabAt, type RoomInfo } from './kristall_util';

const D_FLOOR = 1, D_FACE = 2, D_TOP = 3, D_WATER = 5, D_RIM = 6, D_HAZ = 7;
const ST = P.steel;
/** polierter Fliesenstein (Lavendelgrau) */
const GF = tones(7, mix(ST[0], P.violet[0], 0.3), mix(ST[1], P.blue[1], 0.2), mix(ST[2], P.violet[2], 0.1), mix(ST[3], P.ice[2], 0.25));
/** Geodenfels der Wände */
const DS = tones(6, mix(INK, P.violet[0], 0.45), mix(ST[0], P.violet[0], 0.3), mix(ST[1], P.violet[1], 0.25), mix(ST[2], P.violet[2], 0.15), ST[3]);
const TOPD = [mix(DS[0], INK, 0.3), DS[1], mix(DS[1], DS[2], 0.5)];
const VOIDG = mix(INK, P.blue[0], 0.22);
const GOLD = P.gold;

const L_F = lut(WALL, VOID), L_LIQ = lut(LIQUID), L_HAZ = lut(HAZARD);
const A_FLOOR = allow(D_FLOOR, D_HAZ), A_FACE = allow(D_FACE), A_FF = allow(D_FACE, D_FLOOR, D_HAZ), A_UP = allow(D_FLOOR, D_HAZ, D_FACE, D_TOP, D_RIM), A_TOP = allow(D_TOP);

interface GF_ { nA: Float32Array; nB: Float32Array; nC: Float32Array; nL: Float32Array; nM: Float32Array; nV: Float32Array; Fm: Uint8Array; geom: WallGeom; dOut: Float32Array; dWall: Float32Array; dLiq: Float32Array; ri: RoomInfo }

export function paintGeode(c: Chunk): void {
  initKristallStamps();
  const { W, H, kind, buf, map } = c, n = W * H, seed = c.seed;
  const nA = c.noise(6, 41), nB = c.noise(13, 42), nC = c.noise(3.3, 43), nL = c.noise(31, 44), nM = c.noise(21, 45), nV = c.noise(17, 46);
  const Fm = c.cellMask(L_F), liq = c.cellMask(L_LIQ), haz = c.cellMask(L_HAZ);
  const notF = new Uint8Array(n), notLiq = new Uint8Array(n);
  for (let i = 0; i < n; i++) { notF[i] = 1 - Fm[i]; notLiq[i] = 1 - liq[i]; }
  const geom = c.resolveWalls(Fm, 32, 6);
  const dOut = c.dist(notF), dWall = c.dist(Fm), dLiq = c.dist(notLiq);
  for (let i = 0; i < n; i++) kind[i] = Fm[i] ? (geom.fv[i] ? D_FACE : D_TOP) : liq[i] ? (dLiq[i] <= 5 ? D_RIM : D_WATER) : haz[i] ? D_HAZ : D_FLOOR;
  const f: GF_ = { nA, nB, nC, nL, nM, nV, Fm, geom, dOut, dWall, dLiq, ri: roomInfo(map) };
  for (let y = c.iy0; y < c.iy1; y++) for (let x = c.ix0; x < c.ix1; x++) {
    const i = y * W + x, wx = c.x0 + x, wy = c.y0 + y, h = rnd2(wx, wy, seed);
    let col: number;
    switch (kind[i]) {
      case D_FLOOR: col = floorCol(c, f, i, wx, wy, h); break;
      case D_HAZ: {
        const v = f.nB[i] * 0.6 + f.nC[i] * 0.4;
        col = v > 0.5 ? (v < 0.53 ? GF[0] : mix(floorCol(c, f, i, wx, wy, h), DS[0], 0.3)) : h < 0.2 ? DS[0] : h > 0.93 ? CYR[2] : DS[1];
        break;
      }
      case D_FACE: col = faceCol(c, f, i, wx, wy, h); break;
      case D_TOP: col = topCol(c, f, i, wx, wy, h); break;
      case D_RIM: col = rimCol(c, f, i, wx, wy, h); break;
      default: col = poolCol(c, f, i, wx, wy);
    }
    buf[i] = col;
  }
  floorDetails(c, f);
  const sh = c.wallShadow(Fm, dWall, 11);
  for (let y = c.iy0; y < c.iy1; y++) for (let x = c.ix0; x < c.ix1; x++) {
    const i = y * W + x, s = sh[i];
    if (s <= 0 || kind[i] === D_WATER || kind[i] === D_RIM) continue;
    const j = s + (nC[i] - 0.5) * 0.2;
    c.darken(i, j > 0.7 ? 0.5 : j > 0.42 ? 0.34 : j > 0.16 ? 0.18 : 0.08);
  }
  wallDetails(c, f);
}

// ------------------------------------------------------------------ Boden
/** Schattierung einer polierten Fliese: e = Kantenbits (1 oben, 2 links, 4/8 Fuge), sh/sh2 Zufall je Fliese, pol = Lage des Glanzstreifens. */
function tile(f: GF_, i: number, e: number, sh: number, sh2: number, h: number, pol: number): number {
  let base = sh < 0.22 ? 2 : sh < 0.62 ? 3 : sh < 0.9 ? 4 : 3;
  // staubige, stumpfe Zonen
  if (f.nL[i] * 0.6 + f.nB[i] * 0.4 > 0.63) base--;
  if (e & 12) return sh2 > 0.86 ? (h < 0.25 ? CYR[4] : CYR[2]) : GF[0];
  if (e & 3) return GF[base + 1 + (sh2 < 0.5 ? 1 : 0)];
  let t = base;
  if (pol === 0 || (pol === 1 && sh2 < 0.6)) t++;
  if (h < 0.03) t--; else if (h > 0.975) t++;
  return GF[t < 1 ? 1 : t];
}
function hexFloor(c: Chunk, f: GF_, i: number, wx: number, wy: number, h: number): number {
  hexAt(wx, wy, 11, 0.8);
  const hh = hash2(HX.q, HX.r, c.seed + 2301), lx = HX.lx, ly = HX.ly;
  // Fugen; entlang geschwungener Bahnen sind sie mit Leuchtkristall ausgegossen
  if (HX.e < 0.85) return Math.abs(f.nL[i] - 0.5) < 0.04 ? (h < 0.25 ? CYR[4] : CYR[3]) : Math.abs(f.nL[i] - 0.5) < 0.06 ? CYR[1] : GF[0];
  const r2 = lx * lx + ly * ly;
  if (hh % 7 === 0) {
    // eingelegter Sechsstern
    const R = (hh >>> 8) & 1 ? MGR : CYR;
    if (r2 < 3) return WHITE;
    if (r2 < 52 && (Math.abs(ly) < 0.75 || Math.abs(lx * 0.866 - ly * 0.5) < 0.75 || Math.abs(lx * 0.866 + ly * 0.5) < 0.75)) return r2 < 14 ? R[4] : R[3];
    if (r2 < 9) return R[2];
  } else if (hh % 5 === 0 && r2 < 3.4) return r2 < 1.2 ? CYR[4] : CYR[2];
  const lit = HX.e < 2.1 && lx * 0.5 + ly < 0, sv = Math.abs(lx + ly * 1.2 + ((hh >>> 4) % 9) - 4);
  return tile(f, i, lit ? 1 : 0, (hh & 1023) / 1023, ((hh >>> 10) & 1023) / 1023, h, sv < 0.8 ? 0 : sv < 2.4 ? 1 : 2);
}
function starFloor(c: Chunk, f: GF_, i: number, wx: number, wy: number, h: number): number {
  const kx = Math.floor(wx / 20), ky = wy >> 4, ux = wx - kx * 20, uy = (wy & 15) * 1.25;
  const ex = ux < 10 ? ux : 19 - ux, ey = uy < 10 ? uy : 18.75 - uy, dm = ex + ey;
  if (dm < 6.2) {
    // Kristallraute auf der Fliesenecke (gehört vier Achtecken gemeinsam)
    const qx = ux < 10 ? kx : kx + 1, qy = uy < 10 ? ky : ky + 1, hq = hash2(qx, qy, c.seed + 2308), R = hq % 3 === 0 ? CYR : hq % 7 === 0 ? MGR : VIR;
    if (dm > 5) return GF[0];
    const sx = ux < 10 ? 1 : -1, sy = uy < 10 ? 1 : -1;
    // nur ein Teil der Ecksteine ist Kristall (in Nestern), die übrigen sind dunkler Stein
    if (f.nL[i] * 0.6 + f.nM[i] * 0.4 + ((hq >>> 8) & 15) / 60 < 0.62) return sx + sy > 0 ? GF[1] : sx + sy < 0 ? GF[3] : GF[2];
    return dm < 1.2 ? WHITE : sx + sy > 0 ? R[1] : sx + sy < 0 ? R[3] : sx > 0 ? R[2] : R[4];
  }
  const hh = hash2(kx, ky, c.seed + 2302);
  const e = (ey < 1.2 && uy < 10 ? 1 : 0) | (ex < 1 && ux < 10 ? 2 : 0) | (ey < 1.2 && uy >= 10 ? 4 : 0) | (ex < 1 && ux >= 10 ? 8 : 0);
  const lit = dm < 7.6 && ux < 10 && uy < 10 ? 1 : 0, sv = Math.abs(ux - 10 + (uy - 10) * 1.1 + ((hh >>> 4) % 7) - 3);
  return tile(f, i, e | lit, (hh & 1023) / 1023, e & 12 ? 0 : ((hh >>> 10) & 1023) / 1023, h, sv < 0.8 ? 0 : sv < 2.6 ? 1 : 2);
}
function slabFloor(c: Chunk, f: GF_, i: number, wx: number, wy: number, h: number): number {
  slabAt(wx, wy, c.seed + 2303);
  const sv = Math.abs(((SLAB.lx + SLAB.ly * 1.3 + SLAB.h1 * 40) % 23) - 11);
  return tile(f, i, SLAB.e, SLAB.h1, SLAB.h2, h, sv < 0.8 ? 0 : sv < 2.5 ? 1 : 2);
}
function floorCol(c: Chunk, f: GF_, i: number, wx: number, wy: number, h: number): number {
  const map = c.map, cx = wx >> 4, cy = wy >> 4, ci = cy * map.w + cx, seed = c.seed;
  const room = f.ri.roomOf[ci], ck = f.ri.kind[ci];
  if (room) {
    const r = map.rooms![room - 1], boss = r.role === 'boss';
    const rw = (r.x1 - r.x0 + 1) * TS, rh = (r.y1 - r.y0 + 1) * TS, mx = r.x0 * TS + rw / 2, my = r.y0 * TS + rh / 2;
    const dx = wx + 0.5 - mx, dy = (wy + 0.5 - my) / 0.84, rr = Math.sqrt(dx * dx + dy * dy);
    if (boss) {
      const ix = Math.min(wx - r.x0 * TS, (r.x1 + 1) * TS - 1 - wx), iy = Math.min(wy - r.y0 * TS, (r.y1 + 1) * TS - 1 - wy);
      return sunburst(f, i, dx, dy, rr, Math.min(ix, iy), ix < iy ? wy : wx, room, h);
    }
    const medal = r.role !== 'trap' && r.role !== 'puzzle' && r.role !== 'secret' && rw >= 176 && rh >= 128;
    if (medal && rr < 33) return mandala(f, i, dx, dy, rr, 32, room, h);
    const style = hash2(room, 3, seed + 2304) % 3;
    return style === 0 ? hexFloor(c, f, i, wx, wy, h) : style === 1 ? starFloor(c, f, i, wx, wy, h) : slabFloor(c, f, i, wx, wy, h);
  }
  if (ck === 1 || ck === 2) {
    // Läufer: lange Fliesen in Laufrichtung, in der Mitte eine Leuchtlinie mit Knoten
    const hz = ck === 1, a = hz ? wx : wy, b = (hz ? wy : wx) - corridorOrigin(map, cx, cy, hz);
    if (b === 15 || b === 16) { const nd = ((a % 24) + 24) % 24; return nd === 11 || nd === 12 ? WHITE : nd >= 9 && nd <= 14 ? CYR[4] : b === 15 ? CYR[3] : CYR[2]; }
    if (b === 14 || b === 17) return GF[0];
    if (b === 13 || b === 18) { const nd = ((a % 24) + 24) % 24; if (nd >= 10 && nd <= 13) return CYR[2]; }
    const row = b < 14 ? (b < 6 ? 0 : 1) : b < 26 ? 2 : 3, rb = b < 6 ? b : b < 14 ? b - 6 : b < 26 ? b - 18 : b - 26, last = row === 0 ? 5 : row === 3 ? 5 : 7;
    const aa = a + (hash2(row, hz ? 1 : 2, seed + 2305) % 26), k = Math.floor(aa / 26), la = aa - k * 26;
    const e = (rb === 0 ? 1 : 0) | (la === 0 ? 2 : 0) | (rb === last ? 4 : 0) | (la === 25 ? 8 : 0);
    return tile(f, i, e, rnd2(k, row, seed + 2306), rnd2(k, row, seed + 2307) * 0.85, h, Math.abs(la - rb - 9) < 1 ? 0 : 2);
  }
  if (ck === 3 || ck === 4) {
    // Schwelle: heller Stein mit Kristallraute
    const hz = ck === 3, a = (hz ? wx : wy) & 15, b = (hz ? wy : wx) - corridorOrigin(map, cx, cy, hz);
    if (a === 15 || b === 31 || b === 15) return GF[0];
    if (a === 0 || b === 0 || b === 16) return GF[6];
    const dm = Math.abs(a - 7.5) + Math.abs((b & 15) - 7.5) * 0.8;
    if (dm < 4.4) return dm < 1 ? WHITE : dm > 3.5 ? MGR[0] : a < 7.5 ? MGR[3] : MGR[2];
    return h < 0.05 ? GF[4] : GF[5];
  }
  return slabFloor(c, f, i, wx, wy, h);
}
/** Ring aus Steinsegmenten (für Mandala und Sonnenboden). */
function ring(f: GF_, i: number, a: number, r: number, r0: number, r1: number, segs: number, offs: number, k: number, lit: boolean, h: number): number {
  if (r < r0 + 1) return GF[0];
  const sa = (Math.PI * 2) / segs, s = Math.floor((a + offs * sa) / sa), da = a + offs * sa - s * sa;
  if (Math.min(da, sa - da) * r < 0.6) return GF[0];
  const hs = rnd2(s, k, 2391);
  if (r < r0 + 2.1 && lit) return GF[6];
  if (r > r1 - 1.2 && !lit) return GF[2];
  let t = (hs < 0.3 ? 3 : hs < 0.75 ? 4 : 5) - (f.nL[i] * 0.6 + f.nB[i] * 0.4 > 0.63 ? 1 : 0);
  if (h < 0.04) t--; else if (h > 0.97) t++;
  return GF[t];
}
/** Kristallmandala großer Räume: Sechsstern aus Cyan-Kristall, Ring mit Magenta-Knäufen, Leuchtring. */
function mandala(f: GF_, i: number, dx: number, dy: number, r: number, R: number, room: number, h: number): number {
  if (r >= R) return GF[0];
  const a = Math.atan2(dy, dx) + Math.PI, lit = dx + dy < 0;
  if (r < 3.2) return r < 1.8 ? WHITE : CYR[4];
  const pet = Math.abs(Math.cos(3 * a)), sr = R * (0.2 + 0.36 * pet * pet);
  if (r < sr) {
    if (r > sr - 1.1) return CYR[0];
    if (Math.abs(Math.sin(3 * a)) * r < 0.65) return CYR[4];
    return Math.sin(6 * a) > 0 === lit ? CYR[3] : h < 0.05 ? CYR[1] : CYR[2];
  }
  if (r < R * 0.6) {
    // Feld zwischen den Sternspitzen: Magenta-Knäufe
    const sa = Math.PI / 3, da = ((a + sa / 2) % sa) - sa / 2, m = Math.hypot(da * r, r - R * 0.44);
    if (m < 2.6) return m < 1 ? WHITE : m > 1.9 ? MGR[0] : lit ? MGR[3] : MGR[2];
    if (r > R * 0.6 - 1) return GF[0];
    return h < 0.05 ? GF[3] : lit ? GF[5] : GF[4];
  }
  if (r < R * 0.66) return r < R * 0.6 + 1 ? CYR[4] : h < 0.3 ? CYR[4] : CYR[3];
  if (r < R * 0.93) return ring(f, i, a, r, R * 0.66, R * 0.93, 18, room * 0.37, room * 16 + 1, lit, h);
  return r < R * 0.93 + 1 ? GF[0] : lit ? MGR[3] : MGR[1];
}
/** Bossraum: strahlende Sonne aus Gold- und Kristalleinlagen, drumherum radial verlegte Fliesenringe. */
function sunburst(f: GF_, i: number, dx: number, dy: number, r: number, inset: number, along: number, room: number, h: number): number {
  // Zierband entlang der Wände
  if (inset >= 7 && inset <= 11) {
    if (inset === 7 || inset === 11) return GF[0];
    const st = ((along % 16) + 16) % 16;
    return st >= 6 && st <= 9 && inset === 9 ? (st === 6 ? WHITE : CYR[4]) : inset === 8 ? GOLD[3] : inset === 10 ? GOLD[1] : GOLD[2];
  }
  const a = Math.atan2(dy, dx) + Math.PI, lit = dx + dy < 0;
  if (r < 9) return r < 3.4 ? WHITE : r < 6 ? (lit ? GOLD[4] : GOLD[3]) : r < 8 ? (lit ? GOLD[3] : GOLD[2]) : GOLD[0];
  // 16 Strahlen: lange goldene und kürzere aus Kristall im Wechsel
  const sa = Math.PI / 8, ks = Math.floor((a + sa / 2) / sa), da = a + sa / 2 - ks * sa - sa / 2, long = (ks & 1) === 0;
  const len = long ? 78 : 50, wd = (long ? 5.2 : 4) * (1 - (r - 9) / (len - 9)), lat = Math.abs(da) * r;
  if (r < len && lat < wd) {
    const R = long ? GOLD : ks % 4 === 1 ? CYR : MGR;
    if (lat > wd - 1) return R[0];
    if (lat < 0.6) return long ? WHITE : R[4];
    return da < 0 === (dx > 0) ? R[3] : R[2];
  }
  if (r >= 30 && r < 33) return r < 31 || r >= 32 ? GF[0] : lit ? CYR[4] : CYR[3];
  if (r >= 60 && r < 64) return r < 61 || r >= 63 ? GF[0] : h < 0.3 ? GOLD[4] : lit ? GOLD[3] : GOLD[2];
  // radial verlegte Ringe, nach außen dunkler
  const k = r < 30 ? 0 : r < 60 ? 1 + (((r - 33) / 13.5) | 0) : 3 + (((r - 64) / 15) | 0);
  const r0 = k === 0 ? 9 : k < 3 ? 33 + (k - 1) * 13.5 : 64 + (k - 3) * 15, r1 = k === 0 ? 30 : k < 3 ? r0 + 13.5 : r0 + 15;
  const col = ring(f, i, a, r, r0 - 1, k === 0 || k === 2 ? r1 + 2 : r1, 12 + k * 6, rnd2(k, room, 2392), room * 16 + k, lit, h);
  return r > 64 && col !== GF[0] && ((k & 1) || f.nM[i] > 0.6) ? mix(col, GF[1], 0.22) : col;
}

// ------------------------------------------------------------------ Wände
function faceCol(c: Chunk, f: GF_, i: number, wx: number, wy: number, h: number): number {
  const g = f.geom, v = g.fv[i], fh = g.fh[i], top = fh - v, seed = c.seed;
  if (fh < 16) {
    // Pfeiler: Kristallsäule mit senkrechten Facetten
    const lx = wx & 15, R = hash2(wx >> 4, (wy + v) >> 4, seed + 2310) & 1 ? CYR : VIR;
    if (lx === 0 || lx === 15 || v === 1) return R[0];
    if (top === 0) return R[4];
    let col = lx < 5 ? R[3] : lx === 5 ? R[4] : lx < 11 ? R[2] : lx === 11 ? R[3] : R[1];
    if ((lx + top * 2) % 13 === 0 || h > 0.985) col = WHITE;
    if (v <= 3) col = mix(col, SHADE, 0.35);
    return col;
  }
  if (top < 2) { const cj = ((wx + (hash2(wy >> 4, 2, seed + 2311) % 13)) % 13 + 13) % 13; return cj === 0 ? DS[2] : top === 0 ? DS[5] : DS[4]; }
  if (top === 2) return DS[0];
  // Fels: flache, gewellte Lagen
  const yy = wy + Math.round((f.nB[i] - 0.5) * 6), row = Math.floor(yy / 6), ry = yy - row * 6, hb = rnd2(row, wx >> 5, seed + 2312);
  let col = ry === 5 ? DS[0] : ry === 0 ? DS[3] : DS[hb < 0.4 ? 1 : 2];
  if (ry > 0 && ry < 5 && h < 0.08) col = DS[1];
  // Drusenrasen: Facettenfeld, in der Wandmitte am dichtesten
  const mid = 1 - Math.abs(v / fh - 0.5) * 2, dm = f.nM[i] * 0.5 + f.nL[i] * 0.3 + f.nA[i] * 0.08 + mid * 0.16;
  if (dm > 0.5) {
    if (dm < 0.515) col = DS[0];
    else {
      voro(wx, wy, 6, 6, seed + 2313);
      const fam = f.nV[i] * 0.7 + ((V.id >>> 20) & 15) / 50, R = fam < 0.42 ? MGR : fam < 0.72 ? CYR : VIR, s = V.dx + V.dy, tn = (V.id >>> 8) & 3;
      col = V.edge < 0.75 ? R[0] : s < -1.6 ? (tn === 0 ? WHITE : R[4]) : s < 0 ? R[3] : tn === 1 ? R[1] : R[2];
    }
  } else {
    // leuchtende Adern
    const vn = Math.abs(f.nV[i] - 0.5);
    if (vn < 0.012) col = h < 0.3 ? WHITE : CYR[4]; else if (vn < 0.03) col = mix(col, CYR[3], 0.55); else if (vn < 0.05) col = mix(col, CYR[2], 0.25);
  }
  if (top === 3) col = mix(col, SHADE, 0.4);
  if (v === 1) col = mix(DS[0], SHADE, 0.3); else if (v <= 3) col = mix(col, SHADE, 0.34); else if (v <= 6 && h < 0.4) col = mix(col, SHADE, 0.16);
  if (!f.Fm[i - 1]) col = mix(col, DS[5], 0.5);
  else if (!f.Fm[i + 1]) col = mix(col, SHADE, 0.5);
  else if (!f.Fm[i + 2]) col = mix(col, SHADE, 0.25);
  return col;
}
function topCol(c: Chunk, f: GF_, i: number, wx: number, wy: number, h: number): number {
  const g = f.geom, d = f.dOut[i], ts = g.ts[i], seed = c.seed;
  if (ts < 255 && g.tn[i] < 255 && ts + g.tn[i] <= 9) {
    // Säulenkopf: Kristallspitze von oben
    const lx = wx & 15, R = hash2(wx >> 4, (wy + ts + 6) >> 4, seed + 2310) & 1 ? CYR : VIR;
    if (lx === 0 || lx === 15 || g.tn[i] === 1) return R[0];
    // vier Facetten, die sich in der Spitze treffen
    const fx = (lx - 7.5) / 7.5, fy = (g.tn[i] - (g.tn[i] + ts) / 2) / ((g.tn[i] + ts) / 2);
    if (Math.abs(fx) < 0.14 && Math.abs(fy) < 0.3) return WHITE;
    if (Math.abs(Math.abs(fx) - Math.abs(fy)) < 0.12) return fx + fy < 0 ? R[4] : R[0];
    return Math.abs(fx) > Math.abs(fy) ? (fx < 0 ? R[3] : R[1]) : fy < 0 ? R[4] : R[2];
  }
  if (ts <= 2) { const cj = ((wx + (hash2(wy >> 4, 2, seed + 2311) % 13)) % 13 + 13) % 13; return cj === 0 ? DS[2] : ts === 1 ? DS[4] : DS[3]; }
  if (ts === 3) return DS[0];
  if (d <= 3.01) {
    const wOpen = !f.Fm[i - 1] || !f.Fm[i - 2] || !f.Fm[i - 3], nOpen = g.tn[i] <= 3;
    const al = nOpen ? wx : wy, cj = ((al + (hash2((nOpen ? wy : wx) >> 4, 3, seed + 2314) % 11)) % 11 + 11) % 11;
    if (d <= 1.01) return cj === 0 ? DS[1] : wOpen ? DS[4] : nOpen ? DS[3] : DS[2];
    if (d <= 2.01) return cj === 0 ? DS[0] : wOpen ? DS[3] : nOpen ? DS[2] : DS[1];
    return DS[0];
  }
  const fade = d + (f.nA[i] - 0.5) * 6 + (f.nB[i] - 0.5) * 6;
  if (fade > 20) return h > 0.9975 ? CYR[1] : VOIDG;
  if (fade > 15 && ((wx + wy) & 1)) return VOIDG;
  voro(wx, wy, 12, 8, seed + 2315);
  const s = V.dx * 0.6 + V.dy;
  if (V.edge < 1) return TOPD[0];
  // einzelne Brocken sind Kristall
  if ((V.id >>> 9) % 6 === 0 && fade < 13) { const R = (V.id >>> 5) & 1 ? CYR : MGR; return s < -1.5 ? R[3] : s > 2 ? R[0] : R[1]; }
  return V.edge < 2.3 && s < -1 ? TOPD[2] : h < 0.06 ? TOPD[0] : TOPD[1];
}

// ------------------------------------------------------------------ Becken
function rimCol(c: Chunk, f: GF_, i: number, wx: number, wy: number, h: number): number {
  const d = f.dLiq[i], W = c.W, seed = c.seed;
  const ny = (f.dLiq[i + W] - f.dLiq[i - W]) * 0.5, nx = (f.dLiq[i + 1] - f.dLiq[i - 1]) * 0.5;
  const horiz = Math.abs(ny) >= Math.abs(nx), al = horiz ? wx : wy;
  const seg = ((al + (hash2(horiz ? wy >> 4 : wx >> 4, 5, seed + 2320) % 9)) % 9 + 9) % 9;
  if (d <= 1.01) return seg === 8 ? GF[0] : nx + ny > 0 ? GF[6] : GF[4];
  if (d <= 3.01) return seg === 8 ? GF[0] : seg >= 3 && seg <= 4 ? (d <= 2.01 && seg === 3 ? WHITE : (wx + wy) & 8 ? CYR[4] : MGR[3]) : h < 0.1 ? GF[4] : GF[5];
  if (d <= 4.01) return seg === 8 ? GF[0] : nx + ny > 0 ? GF[3] : GF[4];
  return GF[0];
}
function poolCol(c: Chunk, f: GF_, i: number, wx: number, wy: number): number {
  const d = f.dLiq[i], W = c.W, ny = (f.dLiq[i + W] - f.dLiq[i - W]) * 0.5;
  if (ny > 0.4) {
    if (d < 9) return d < 8 ? (rnd2(wx >> 1, wy >> 1, c.seed + 2321) > 0.75 ? CYR[2] : mix(GF[2], DEEP, 0.4)) : mix(GF[0], INK, 0.3);
    if (d < 11) return alpha(INK, 150);
    if (d < 12 && rnd2(wx >> 1, wy, c.seed + 2322) > 0.35) return alpha(CYR[4], 150);
  } else if (d < 6.5) return alpha(INK, 150);
  else if (d < 7.6 && rnd2(wx >> 1, wy >> 1, c.seed + 2323) > 0.4) return alpha(CYR[4], 130);
  const dd = d + (f.nB[i] - 0.5) * 6;
  return dd > 16 ? alpha(DEEP, 90) : dd > 11 ? alpha(DEEP, 40) : alpha(P.teal[3], 55);
}

// ------------------------------------------------------------------ Details
function floorDetails(c: Chunk, f: GF_): void {
  const { W, kind, map } = c, seed = c.seed;
  c.cells((cx, cy, t) => {
    const x0 = cx * TS, y0 = cy * TS;
    seedAt(cx, cy, seed + 2330);
    const rk = cx >= 0 && cy >= 0 && cx < map.w && cy < map.h ? f.ri.roomOf[cy * map.w + cx] : 0;
    const boss = rk > 0 && map.rooms![rk - 1].role === 'boss';
    for (let k = 0; k < 4; k++) {
      const wx = x0 + ri(16), wy = y0 + ri(16), r = rf(), i = (wy - c.y0) * W + (wx - c.x0);
      if (kind[i] !== D_FLOOR) continue;
      const near = f.dWall[i] < 14, ci = f.nV[i] < 0.42 ? 1 : f.nV[i] < 0.6 ? 0 : 2;
      let q = r * (boss ? 2.2 : 1);
      if ((q -= 0.04) < 0) c.blitK(KS.crack[ri(KS.crack.length)], wx, wy, A_FLOOR);
      else if ((q -= near ? 0.07 : 0.012) < 0) c.blitK(KS.shard[ci][ri(8)], wx, wy, A_UP);
      else if ((q -= near ? 0.04 : 0.004) < 0) c.blitK(KS.grow[ci][ri(6)], wx, wy, A_UP);
      else if ((q -= near ? 0.05 : 0.015) < 0) c.blitK(KS.peb[ri(6)], wx, wy, A_FLOOR);
      else if ((q -= 0.008) < 0) c.blitK(KS.puddle[ri(KS.puddle.length)], wx, wy, A_FLOOR);
      else if ((q -= 0.02) < 0) c.blitK(KS.fungi[ri(4)], wx, wy, A_FLOOR);
    }
    if (t === HAZARD) {
      c.blitK(KS.haz[ri(KS.haz.length)], x0 + 5 + ri(6), y0 + 8 + ri(3), A_UP);
      c.blitK(KS.haz[ri(KS.haz.length)], x0 + 5 + ri(6), y0 + 15 + ri(3), A_UP);
    }
  });
}
function wallDetails(c: Chunk, f: GF_): void {
  const { W, kind, map } = c, seed = c.seed, g = f.geom;
  c.cells((cx, cy, t) => {
    const x0 = cx * TS, y0 = cy * TS;
    seedAt(cx, cy, seed + 2340);
    if (t === VOID || t === WALL) for (let k = 0; k < 2; k++) {
      const wx = x0 + ri(16), wy = y0 + ri(16), r = rf(), i = (wy - c.y0) * W + (wx - c.x0);
      if (kind[i] === D_TOP && f.dOut[i] > 6 && f.dOut[i] < 26 && r < 0.05) c.blitK(KS.glint[ri(KS.glint.length)], wx, wy, A_TOP);
    }
    if (t !== WALL) return;
    const below = tileAt(map, cx, cy + 1);
    if (below === WALL || below === VOID) return;
    const i = (y0 + 15 - c.y0) * W + (x0 + 8 - c.x0);
    if (kind[i] !== D_FACE) return;
    const fh = g.fh[i], lipY = y0 + 16 - fh;
    if (fh < 26) return;
    for (let k = 0; k < 3; k++) {
      const wx = x0 + ri(16), r = rf(), ci = ri(3);
      if (r < 0.3) c.blitK(KS.druse[ci][ri(6)], wx, lipY + 9 + ri(14), A_FACE);
      else if (r < 0.5) c.blitK(KS.grow[ci][ri(6)], wx, y0 + 16 + ri(2), A_FF);
      else if (r < 0.62) c.blitK(KS.druseS[ci][ri(6)], wx, lipY + 6 + ri(20), A_FACE);
      else if (r < 0.7) c.blitK(KS.streak[ri(KS.streak.length)], wx, lipY + 3, A_FACE);
    }
  });
}
