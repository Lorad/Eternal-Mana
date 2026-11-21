/**
 * Glutlande-Dungeon „Aschenschmiede“: die uralte Schmiede, in der die Elementsiegel gegossen wurden.
 *   Wände   rußschwarzes Mauerwerk, mit genieteten Eisenplatten verstärkt, durchlaufendes Rohr mit Flanschen,
 *           Lüftungsgitter mit Glut dahinter, Amboss-/Hammer-/Siegelreliefs; Pfeiler mit Eisenbändern
 *   Boden   schwere, eisengebundene Steinplatten, Gießrinnen (dünne Linien aus glühendem oder erstarrtem Metall),
 *           Bodenroste, Brandflecken; große Räume: runde Gussform, Bossraum (Lavawyrm Ignarok): sechszählige
 *           Siegelform mit sechs Elementformen; Gänge: Lorengleis; Schwellen aus Riffelblech
 *   Becken  Lavabecken mit Einfassung aus Schamottziegeln;  Gefahr: rot glühende Bodenplatten
 */
import { INK, P, alpha, hash2, mix, rnd2 } from '../palette';
import { Chunk, FLOOR, HAZARD, LIQUID, SHADE, TS, VOID, WALL, allow, lut, rf, ri, seedAt, tileAt, tones, voro, V, type WallGeom } from './core';
import { HOT, IRON, VOIDR } from './glut_pal';
import { GS, initGlutStamps } from './glut_stamps';
import { SLAB, corridorOrigin, roomInfo, slabAt, type RoomInfo } from './kristall_util';

const D_FLOOR = 1, D_FACE = 2, D_TOP = 3, D_WATER = 5, D_RIM = 6, D_HAZ = 7;
const A = P.ash, SN = P.stone;
/** Bodenplatten (kühles Steingrau) */
const FL = tones(7, mix(SN[0], A[0], 0.5), mix(SN[1], A[2], 0.4), mix(SN[2], A[4], 0.4), mix(SN[3], P.cream[1], 0.3));
/** verrußtes Mauerwerk (warm, dunkel → helle Decksteine) */
const MAS = tones(7, mix(A[0], INK, 0.2), A[2], mix(A[3], P.wood[1], 0.25), mix(A[4], P.tan[1], 0.3), mix(P.cream[1], P.tan[2], 0.3));
/** Schamottziegel */
const BRICK = tones(5, mix(P.red[0], A[1], 0.5), mix(P.red[1], A[3], 0.5), mix(P.red[2], P.wood[2], 0.5), mix(P.red[3], P.tan[2], 0.45));
const TOPD = [mix(MAS[0], INK, 0.3), mix(MAS[0], MAS[1], 0.5), MAS[1]];
/** Leuchtfarben der sechs Elementsiegel: Feuer, Wasser, Erde, Wind, Licht, Dunkelheit */
const ELEM = [HOT[3], P.teal[3], P.green[3], P.ice[3], P.gold[4], P.violet[3]];

const L_F = lut(WALL, VOID), L_LIQ = lut(LIQUID), L_HAZ = lut(HAZARD);
const A_FLOOR = allow(D_FLOOR), A_FACE = allow(D_FACE), A_FF = allow(D_FACE, D_FLOOR, D_HAZ);

interface SF { nA: Float32Array; nB: Float32Array; nC: Float32Array; nL: Float32Array; nM: Float32Array; Fm: Uint8Array; geom: WallGeom; dOut: Float32Array; dWall: Float32Array; dLiq: Float32Array; ri: RoomInfo }

export function paintSchmiede(c: Chunk): void {
  initGlutStamps();
  const { W, H, kind, buf, map } = c, n = W * H, seed = c.seed;
  const nA = c.noise(6, 61), nB = c.noise(13, 62), nC = c.noise(3.3, 63), nL = c.noise(31, 64), nM = c.noise(21, 65);
  const Fm = c.cellMask(L_F), liq = c.cellMask(L_LIQ), haz = c.cellMask(L_HAZ);
  const notF = new Uint8Array(n), notLiq = new Uint8Array(n);
  for (let i = 0; i < n; i++) { notF[i] = 1 - Fm[i]; notLiq[i] = 1 - liq[i]; }
  const geom = c.resolveWalls(Fm, 32, 6);
  const dOut = c.dist(notF), dWall = c.dist(Fm), dLiq = c.dist(notLiq), dToLiq = c.dist(liq);
  for (let i = 0; i < n; i++) kind[i] = Fm[i] ? (geom.fv[i] ? D_FACE : D_TOP) : liq[i] ? (dLiq[i] <= 5 ? D_RIM : D_WATER) : haz[i] ? D_HAZ : D_FLOOR;
  const f: SF = { nA, nB, nC, nL, nM, Fm, geom, dOut, dWall, dLiq, ri: roomInfo(map) };
  for (let y = c.iy0; y < c.iy1; y++) for (let x = c.ix0; x < c.ix1; x++) {
    const i = y * W + x, wx = c.x0 + x, wy = c.y0 + y, h = rnd2(wx, wy, seed);
    let col: number;
    switch (kind[i]) {
      case D_FLOOR: col = floorCol(c, f, i, wx, wy, h); break;
      case D_HAZ: col = hotPlate(f, i, wx, wy, h); break;
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
    const i = y * W + x, s = sh[i], k = kind[i];
    if (s > 0 && k !== D_WATER && k !== D_RIM) { const j = s + (nC[i] - 0.5) * 0.2; c.darken(i, j > 0.7 ? 0.5 : j > 0.42 ? 0.34 : j > 0.16 ? 0.18 : 0.08); }
    // Glutschein um Lavabecken
    if (k === D_FLOOR || k === D_RIM) { const d = dToLiq[i]; if (d < 9) c.tint(i, HOT[2], 0.24); else if (d < 15) c.tint(i, HOT[1], 0.13); }
  }
  wallDetails(c, f);
}

// ------------------------------------------------------------------ Boden
function slabShade(f: SF, i: number, e: number, sh: number, sh2: number, h: number): number {
  let base = sh < 0.2 ? 2 : sh < 0.58 ? 3 : sh < 0.88 ? 4 : 3;
  // Ruß- und Brandzonen
  const soot = f.nL[i] * 0.6 + f.nB[i] * 0.4;
  if (soot > 0.62) base--;
  if (e & 12) return FL[0];
  if (e & 3) return FL[base + 1];
  let t = base;
  if (h < 0.04) t--; else if (h > 0.97) t++;
  if (sh2 > 0.8 && f.nC[i] > 0.62) t--;
  if (soot > 0.7 && h < 0.5) t--;
  return FL[t < 1 ? 1 : t];
}
/** Gießrinne: lat = Abstand von der Rinnenmitte (px), heat 0..1 (glühend ↔ erstarrt). */
function channel(lat: number, heat: number, h: number): number {
  if (lat >= 1.5) return IRON[0];
  if (heat > 0.52) return lat < 0.6 ? (h < 0.4 ? HOT[5] : HOT[4]) : HOT[3];
  if (heat > 0.42) return lat < 0.6 ? HOT[2] : HOT[1];
  return lat < 0.6 ? (h < 0.2 ? IRON[5] : IRON[3]) : IRON[2];
}
function floorCol(c: Chunk, f: SF, i: number, wx: number, wy: number, h: number): number {
  const map = c.map, cx = wx >> 4, cy = wy >> 4, ci = cy * map.w + cx, seed = c.seed;
  const room = f.ri.roomOf[ci], ck = f.ri.kind[ci], heat = f.nB[i] * 0.55 + f.nM[i] * 0.45;
  if (room) {
    const r = map.rooms![room - 1], boss = r.role === 'boss';
    const rw = (r.x1 - r.x0 + 1) * TS, rh = (r.y1 - r.y0 + 1) * TS, mx = r.x0 * TS + rw / 2, my = r.y0 * TS + rh / 2;
    const dx = wx + 0.5 - mx, dy = (wy + 0.5 - my) / 0.84, rr = Math.sqrt(dx * dx + dy * dy);
    const ix = Math.min(wx - r.x0 * TS, (r.x1 + 1) * TS - 1 - wx), iy = Math.min(wy - r.y0 * TS, (r.y1 + 1) * TS - 1 - wy), inset = Math.min(ix, iy);
    if (boss) {
      if (rr < 62) return sealMould(f, i, dx, dy, rr, h);
      // Eisenband entlang der Wände
      if (inset >= 7 && inset <= 11) { const st = (((ix < iy ? wy : wx) % 12) + 12) % 12; return inset === 7 || inset === 11 ? IRON[0] : inset === 9 && st === 5 ? IRON[6] : inset === 8 ? IRON[5] : inset === 10 ? IRON[2] : IRON[3]; }
    } else {
      const medal = r.role !== 'trap' && r.role !== 'puzzle' && r.role !== 'secret' && rw >= 176 && rh >= 128;
      if (medal && rr < 34) return castMould(f, i, dx, dy, rr, h);
      const style = hash2(room, 5, seed + 4304) % 3;
      // Gießrinnen: Kreuz durch die Raummitte bzw. umlaufender Rahmen
      if (style === 0 || medal) { const lat = Math.min(Math.abs(wx + 0.5 - mx), Math.abs(wy + 0.5 - my)); if (lat < 2.5 && inset > 5) return channel(lat, heat, h); }
      else if (style === 1 && inset >= 19 && inset <= 23) return channel(Math.abs(inset - 21), heat, h);
    }
    // Eisenbänder fassen je vier Platten: Raster 64 × 48, gegen die Kacheln versetzt
    const bx = ((wx + 23) % 64 + 64) % 64, by = ((wy + 9) % 48 + 48) % 48;
    const gx = Math.floor((wx + 23) / 64), gy = Math.floor((wy + 9) / 48);
    if ((bx < 3 && hash2(gx, gy, seed + 4302) % 3) || (by < 3 && hash2(gx, gy, seed + 4303) % 3)) {
      const k = bx < 3 ? bx : by, al = bx < 3 ? by : bx;
      if (bx < 3 && by < 3) return bx === 1 && by === 1 ? IRON[5] : IRON[3];
      if (k === 1 && al % 8 === 5) return IRON[5];
      return IRON[k === 0 ? 3 : k === 1 ? 2 : 0];
    }
    slabAt(wx, wy, seed + 4300);
    return slabShade(f, i, SLAB.e, SLAB.h1, SLAB.h2, h);
  }
  if (ck === 1 || ck === 2) {
    // Gang: Lorengleis auf Eisenschwellen
    const hz = ck === 1, a = hz ? wx : wy, b = (hz ? wy : wx) - corridorOrigin(map, cx, cy, hz);
    if (b === 10 || b === 21) return IRON[6];
    if (b === 11 || b === 22) return IRON[3];
    if (b === 12 || b === 23) return IRON[0];
    const sl = ((a % 10) + 10) % 10;
    if (b >= 7 && b <= 25 && sl < 4) return sl === 0 ? MAS[4] : sl === 3 ? MAS[0] : (b === 8 || b === 24) && sl === 1 ? IRON[6] : MAS[h < 0.2 ? 2 : 3];
    const row = b >> 3, rb = b & 7, aa = a + (hash2(row, hz ? 1 : 2, seed + 4305) % 26), k = Math.floor(aa / 26), la = aa - k * 26;
    const e = (rb === 0 ? 1 : 0) | (la === 0 ? 2 : 0) | (rb === 7 ? 4 : 0) | (la === 25 ? 8 : 0);
    return slabShade(f, i, e, rnd2(k, row, seed + 4306) * (b >= 13 && b <= 20 ? 0.5 : 1), rnd2(k, row, seed + 4307), h);
  }
  if (ck === 3 || ck === 4) {
    // Schwelle aus Riffelblech
    const hz = ck === 3, a = (hz ? wx : wy) & 15, b = (hz ? wy : wx) - corridorOrigin(map, cx, cy, hz);
    if (a === 0 || a === 15 || b === 0 || b === 31) return IRON[0];
    if (a === 1 || b === 1) return IRON[6];
    if (a === 14 || b === 30) return IRON[2];
    if ((a === 3 || a === 12) && (b === 3 || b === 28 || b === 15)) return IRON[6];
    const d1 = (a + b) & 7, d2 = (a - b + 64) & 7;
    return (d1 === 0 && (b & 4)) || (d2 === 0 && !(b & 4)) ? IRON[5] : (d1 === 1 && (b & 4)) || (d2 === 1 && !(b & 4)) ? IRON[2] : h < 0.06 ? IRON[3] : IRON[4];
  }
  slabAt(wx, wy, seed + 4300);
  return slabShade(f, i, SLAB.e, SLAB.h1, SLAB.h2, h);
}
/** Eisenring mit Nieten (r0..r1), lit = Lichtseite. */
function ironRing(a: number, r: number, r0: number, r1: number, rivets: number, lit: boolean, h: number): number {
  if (r < r0 + 1 || r > r1 - 1) return IRON[0];
  const sa = (Math.PI * 2) / rivets, da = ((a + sa / 2) % sa) - sa / 2, m = Math.hypot(da * r, r - (r0 + r1) / 2);
  if (m < 1.5) return m < 0.8 ? IRON[6] : IRON[1];
  if (r < r0 + 2.2) return lit ? IRON[6] : IRON[4];
  if (r > r1 - 2.2) return lit ? IRON[3] : IRON[1];
  return h < 0.08 ? IRON[3] : lit ? IRON[5] : IRON[4];
}
/** Runde Gussform großer Räume: Tiegel, Formmulde mit Relief, glühender Rinnenring, genieteter Eisenring. */
function castMould(f: SF, i: number, dx: number, dy: number, r: number, h: number): number {
  const R = 33, a = Math.atan2(dy, dx) + Math.PI, lit = dx + dy < 0, heat = f.nB[i] * 0.5 + f.nM[i] * 0.5;
  if (r >= R) return FL[0];
  if (r < 5) return r < 2.6 ? HOT[5] : lit ? HOT[4] : HOT[3];
  if (r < 7) return lit ? IRON[5] : IRON[1];
  if (r < 19) {
    // Formmulde: vertieft, mit acht Angüssen und einem Kranzrelief
    const sa = Math.PI / 4, da = ((a + sa / 2) % sa) - sa / 2;
    if (Math.abs(da) * r < 1.1) return heat > 0.45 ? (h < 0.4 ? HOT[4] : HOT[3]) : HOT[1];
    if (r < 8.2 && !lit) return FL[0];
    if (r > 17.6 && lit) return FL[0];
    if (Math.abs(r - 13) < 1 && Math.abs(da) * r > 2.6) return lit ? FL[1] : FL[4];
    return h < 0.06 ? FL[1] : FL[2];
  }
  if (r < 23) return channel(Math.abs(r - 21), heat + 0.08, h);
  if (r < 31) return ironRing(a, r, 22.5, 31, 12, lit, h);
  return lit ? FL[5] : FL[2];
}
/** Bossraum: sechszählige Siegelform – Tiegel in der Mitte, sechs Elementformen im Kreis, Sechseckrinne, Eisenring. */
function sealMould(f: SF, i: number, dx: number, dy: number, r: number, h: number): number {
  const a = Math.atan2(dy, dx) + Math.PI, lit = dx + dy < 0, heat = f.nB[i] * 0.5 + f.nM[i] * 0.5 + 0.1;
  if (r >= 61) return FL[0];
  if (r >= 53) return ironRing(a, r, 52.5, 61, 24, lit, h);
  if (r < 8) return r < 4 ? (h < 0.3 ? HOT[4] : HOT[5]) : r < 6.4 ? (lit ? HOT[4] : HOT[3]) : HOT[2];
  if (r < 10.5) return r > 9.5 ? IRON[0] : lit ? IRON[6] : IRON[2];
  // sechs Elementformen bei 30° + k·60°
  const sa = Math.PI / 3, ks = Math.floor(a / sa), ac = (ks + 0.5) * sa, da = a - ac;
  const ex = Math.cos(da) * r - 33, ey = Math.sin(da) * r, er = Math.hypot(ex, ey);
  if (er < 12.5) {
    const col = ELEM[((ks % 6) + 6) % 6];
    if (er > 11.5) return IRON[0];
    if (er > 9) return er < 10 && lit ? IRON[6] : lit ? IRON[5] : IRON[3];
    if (er > 8) return lit ? FL[0] : FL[3];
    // Siegelzeichen: Ring, Mittelpunkt und drei Kerben
    if (er < 1.6) return col;
    if (Math.abs(er - 4.6) < 0.9) return h < 0.25 ? mix(col, P.cream[4], 0.5) : col;
    const ea = Math.atan2(ey, ex) + ks, na = Math.PI * 2 / 3, nd = ((ea % na) + na) % na - na / 2;
    if (er > 5.5 && Math.abs(nd) * er < 0.7) return mix(col, FL[1], 0.35);
    return h < 0.08 ? FL[2] : FL[1];
  }
  // Rinne vom Tiegel zu jeder Form
  if (r < 21 && Math.abs(da) * r < 2.4) return channel(Math.abs(da) * r, heat, h);
  // Sechseckrinne (Ecken zwischen den Formen)
  const hm = Math.cos(da) * r;
  if (hm > 46 && hm < 51) return channel(Math.abs(hm - 48.5), heat - 0.04, h);
  if (hm >= 51) return lit ? FL[5] : FL[3];
  // radial verlegte Steine
  const k = r < 22 ? 0 : 1, segs = k ? 30 : 12, sg = (Math.PI * 2) / segs, s = Math.floor(a / sg), dj = a - s * sg;
  if (Math.min(dj, sg - dj) * r < 0.6 || Math.abs(r - 22) < 0.7) return FL[0];
  const hs = rnd2(s, k, 4391);
  let t = (hs < 0.3 ? 2 : hs < 0.75 ? 3 : 4) - (f.nL[i] > 0.6 ? 1 : 0);
  if (h < 0.04) t--; else if (h > 0.97) t++;
  return FL[t < 1 ? 1 : t];
}
function hotPlate(f: SF, i: number, wx: number, wy: number, h: number): number {
  // rot glühende Eisenplatte je Kachel
  const lx = wx & 15, ly = wy & 15, e = Math.min(lx, ly, 15 - lx, 15 - ly);
  if (e === 0) return IRON[0];
  if ((lx === 2 || lx === 13) && (ly === 2 || ly === 13)) return HOT[5];
  if (e === 1) return lx === 1 || ly === 1 ? HOT[2] : HOT[0];
  const d = Math.hypot(lx - 7.5, ly - 7.5) + (f.nA[i] - 0.5) * 5 + (f.nB[i] - 0.5) * 4;
  return d < 2 ? HOT[4] : d < 4.2 ? (h < 0.3 ? HOT[4] : HOT[3]) : d < 6.2 ? (h < 0.25 ? HOT[3] : HOT[2]) : h < 0.3 ? HOT[2] : HOT[1];
}

// ------------------------------------------------------------------ Wände
function faceCol(c: Chunk, f: SF, i: number, wx: number, wy: number, h: number): number {
  const g = f.geom, v = g.fv[i], fh = g.fh[i], top = fh - v, seed = c.seed, lx = wx & 15;
  if (fh < 16) {
    // Pfeiler: Steinschaft mit Eisenbändern
    if (v === 1 || lx === 0 || lx === 15) return MAS[0];
    if (v <= 3 || top <= 2) return (lx === 3 || lx === 12) && (v === 2 || top === 1) ? IRON[6] : lx < 3 ? IRON[5] : lx > 12 ? IRON[2] : IRON[v === 3 || top === 0 ? 4 : 3];
    return MAS[(lx < 3 ? 5 : lx < 8 ? 4 : lx < 12 ? 3 : 2) - (h < 0.06 ? 1 : 0)];
  }
  if (top < 3) {
    const cj = ((wx + (hash2(wy >> 4, 2, seed + 4340) % 13)) % 13 + 13) % 13;
    if (top === 0) return cj === 0 ? MAS[3] : MAS[6];
    if (top === 1) return cj === 0 ? MAS[1] : h < 0.15 ? MAS[4] : MAS[5];
    return MAS[0];
  }
  let col: number;
  // durchlaufendes Rohr mit Flanschen
  if (fh >= 26 && top >= 5 && top <= 10) {
    const fl = wx & 31;
    if (fl < 3) return top === 5 ? IRON[6] : top === 10 ? IRON[0] : fl === 1 && (top === 7 || top === 8) ? IRON[6] : fl === 2 ? IRON[2] : IRON[top < 8 ? 5 : 3];
    if (top >= 6 && top <= 9) return top === 6 ? IRON[5] : top === 7 ? (h < 0.1 ? IRON[5] : IRON[4]) : top === 8 ? IRON[2] : IRON[0];
    if (top === 10) return mix(MAS[1], INK, 0.3);
  }
  // genietete Eisenplatte auf jeder vierten Wandkachel
  const wr = (wy + v) >> 4, hp = hash2(wx >> 4, wr, seed + 4341);
  if (fh >= 26 && hp % 4 === 0 && lx >= 1 && lx <= 14 && v >= 4 && top >= 13) {
    const py = top - 13, ph = fh - 13 - 4;
    if (lx === 1 || lx === 14 || py === 0 || v === 4) return lx === 1 || py === 0 ? IRON[5] : IRON[0];
    if ((lx === 3 || lx === 12) && (py === 2 || py === ph - 3)) return IRON[6];
    if ((lx === 3 || lx === 12) && (py === 3 || py === ph - 2)) return IRON[0];
    col = IRON[((wx + (hash2(wy, 1, seed + 4342) & 3)) >> 2) & 1 ? 3 : 2];
    if (h < 0.05) col = IRON[1];
  } else {
    // Quaderlagen
    const row = wy >> 3, ry = wy & 7, xx = wx + (hash2(row, 0, seed + 4343) % 15), k0 = Math.floor(xx / 15);
    let k = k0, start = k0 * 15 + (hash2(k0, row, seed + 4344) % 8);
    if (xx < start) { k = k0 - 1; start = k * 15 + (hash2(k, row, seed + 4344) % 8); }
    const end = (k + 1) * 15 + (hash2(k + 1, row, seed + 4344) % 8), bx = xx - start, bw = end - start, hb = rnd2(k, row, seed + 4345);
    const base = hb < 0.3 ? 2 : hb < 0.72 ? 3 : 4;
    if (ry === 7 || bx === bw - 1) col = MAS[0];
    else if (ry === 0) col = MAS[base + 1];
    else if (bx === 0) col = MAS[base + 1];
    else if (ry === 6 || (bx >= bw - 2 && ry > 3)) col = MAS[base - 1];
    else col = MAS[base - (h < 0.05 ? 1 : 0)];
    if (hb > 0.9 && bw > 9 && ry > 0 && ry < 7 && Math.abs(bx - 2 - ry * 0.8 - (hash2(k, row, 5) % (bw - 8))) < 0.8) col = MAS[0];
  }
  // Ruß: nach oben hin dunkler
  if (top < 14 + f.nB[i] * 10 && (h < 0.6 || top < 6)) col = mix(col, INK, 0.2);
  if (top === 3) col = mix(col, SHADE, 0.38);
  if (v === 1) col = mix(MAS[0], SHADE, 0.35); else if (v <= 3) col = mix(col, SHADE, 0.3); else if (v <= 6 && h < 0.4) col = mix(col, SHADE, 0.16);
  if (!f.Fm[i - 1]) col = mix(col, MAS[6], 0.45);
  else if (!f.Fm[i + 1]) col = mix(col, SHADE, 0.5);
  else if (!f.Fm[i + 2]) col = mix(col, SHADE, 0.25);
  return col;
}
function topCol(c: Chunk, f: SF, i: number, wx: number, wy: number, h: number): number {
  const g = f.geom, d = f.dOut[i], ts = g.ts[i], seed = c.seed;
  if (ts < 255 && g.tn[i] < 255 && ts + g.tn[i] <= 9) {
    const lx = wx & 15;
    if (lx === 0 || lx === 15) return MAS[0];
    if (g.tn[i] === 1) return IRON[1];
    if (g.tn[i] === 2 || lx === 1) return IRON[6];
    if (ts === 1 || lx === 14) return IRON[3];
    return (lx === 3 || lx === 12) && (ts === 2 || g.tn[i] === 4) ? IRON[6] : h < 0.06 ? IRON[3] : IRON[4];
  }
  if (ts <= 2) { const cj = ((wx + (hash2(wy >> 4, 2, seed + 4340) % 13)) % 13 + 13) % 13; return cj === 0 ? MAS[3] : ts === 1 ? MAS[5] : MAS[4]; }
  if (ts === 3) return MAS[0];
  if (d <= 3.01) {
    const wOpen = !f.Fm[i - 1] || !f.Fm[i - 2] || !f.Fm[i - 3], nOpen = g.tn[i] <= 3;
    const al = nOpen ? wx : wy, cj = ((al + (hash2((nOpen ? wy : wx) >> 4, 3, seed + 4350) % 11)) % 11 + 11) % 11;
    if (d <= 1.01) return cj === 0 ? MAS[1] : wOpen ? MAS[5] : nOpen ? MAS[4] : MAS[2];
    if (d <= 2.01) return cj === 0 ? MAS[0] : wOpen ? MAS[4] : nOpen ? MAS[3] : MAS[1];
    return MAS[0];
  }
  const fade = d + (f.nA[i] - 0.5) * 6;
  if (fade > 19) return h > 0.9975 ? HOT[1] : VOIDR;
  if (fade > 14 && ((wx + wy) & 1)) return VOIDR;
  const row = wy >> 3, xx = wx + (row & 1) * 7, bx = ((xx % 14) + 14) % 14, by = wy & 7, hb = rnd2(Math.floor(xx / 14), row, seed + 4351);
  if (by === 7 || bx === 13) return TOPD[0];
  if (by === 0 || bx === 0) return TOPD[2];
  return hb < 0.3 || h < 0.05 ? TOPD[0] : TOPD[1];
}

// ------------------------------------------------------------------ Lavabecken
function rimCol(c: Chunk, f: SF, i: number, wx: number, wy: number, h: number): number {
  const d = f.dLiq[i], W = c.W, seed = c.seed;
  const ny = (f.dLiq[i + W] - f.dLiq[i - W]) * 0.5, nx = (f.dLiq[i + 1] - f.dLiq[i - 1]) * 0.5;
  const horiz = Math.abs(ny) >= Math.abs(nx), al = horiz ? wx : wy, rowI = d <= 2.51 ? 0 : 1;
  const seg = ((al + rowI * 4 + (hash2(horiz ? wy >> 4 : wx >> 4, 5, seed + 4360) % 8)) % 8 + 8) % 8, hb = rnd2((al + rowI * 4) >> 3, rowI + (horiz ? wy >> 4 : wx >> 4) * 2, seed + 4361);
  // zwei Reihen Schamottziegel im Verband, die innere vom Glutschein erhellt
  if (seg === 7 || d > 4.6 || (d > 2.01 && d <= 2.51)) return BRICK[0];
  const t = (hb < 0.3 ? 1 : hb < 0.8 ? 2 : 3) + (d <= 1.01 || (rowI === 1 && d <= 3.2) ? 1 : 0) - (h < 0.06 ? 1 : 0);
  const col = BRICK[t > 4 ? 4 : t];
  return rowI === 1 ? mix(col, HOT[3], 0.3) : col;
}
function poolCol(c: Chunk, f: SF, i: number, wx: number, wy: number): number {
  const d = f.dLiq[i], W = c.W, ny = (f.dLiq[i + W] - f.dLiq[i - W]) * 0.5;
  if (ny > 0.4) {
    if (d < 8.5) return d < 7.5 ? mix(BRICK[rnd2(wx >> 2, wy >> 1, c.seed + 4362) > 0.5 ? 1 : 0], HOT[1], 0.35) : HOT[1];
    if (d < 9.6) return alpha(HOT[5], 200);
  } else if (d < 6) return alpha(HOT[0], 190);
  else if (d < 7.2 && rnd2(wx >> 1, wy >> 1, c.seed + 4363) > 0.3) return alpha(HOT[5], 170);
  const dd = d + (f.nB[i] - 0.5) * 6;
  return dd < 11 ? alpha(HOT[0], 80) : 0;
}

// ------------------------------------------------------------------ Details
function floorDetails(c: Chunk, f: SF): void {
  const { W, kind, map } = c, seed = c.seed;
  c.cells((cx, cy, t) => {
    const x0 = cx * TS, y0 = cy * TS;
    seedAt(cx, cy, seed + 4370);
    const rk = cx >= 0 && cy >= 0 && cx < map.w && cy < map.h ? f.ri.roomOf[cy * map.w + cx] : 0;
    const boss = rk > 0 && map.rooms![rk - 1].role === 'boss';
    // Bodenroste: selten, nur in Räumen und nicht an der Wand
    if (t === FLOOR && rk > 0 && !boss && rf() < 0.022) {
      const i = (y0 + 8 - c.y0) * W + (x0 + 8 - c.x0);
      if (f.dWall[i] > 22) c.blitK(GS.grate[0], x0 + 8, y0 + 8, A_FLOOR);
    }
    for (let k = 0; k < 4; k++) {
      const wx = x0 + ri(16), wy = y0 + ri(16), r = rf(), i = (wy - c.y0) * W + (wx - c.x0);
      if (kind[i] !== D_FLOOR) continue;
      const near = f.dWall[i] < 14;
      let q = r * (boss ? 2 : 1);
      if ((q -= 0.045) < 0) c.blitK(GS.crack[ri(GS.crack.length)], wx, wy, A_FLOOR);
      else if ((q -= 0.035) < 0) c.blitK(GS.scorch[ri(GS.scorch.length)], wx, wy, A_FLOOR);
      else if ((q -= near ? 0.07 : 0.02) < 0) c.blitK(GS.rubble[ri(GS.rubble.length)], wx, wy, A_FLOOR);
      else if ((q -= near ? 0.05 : 0.02) < 0) c.blitK(GS.cinder[ri(GS.cinder.length)], wx, wy, A_FLOOR);
      else if ((q -= 0.012) < 0) c.blitK(GS.ember[ri(GS.ember.length)], wx, wy, A_FLOOR);
    }
  });
}
function wallDetails(c: Chunk, f: SF): void {
  const { W, kind, map } = c, seed = c.seed, g = f.geom;
  c.cells((cx, cy, t) => {
    if (t !== WALL) return;
    const below = tileAt(map, cx, cy + 1);
    if (below === WALL || below === VOID) return;
    const x0 = cx * TS, y0 = cy * TS, i = (y0 + 15 - c.y0) * W + (x0 + 8 - c.x0);
    if (kind[i] !== D_FACE) return;
    seedAt(cx, cy, seed + 4380);
    const fh = g.fh[i], r = rf();
    if (fh < 26) return;
    // Motive nur auf Mauerwerk (nicht auf den Eisenplatten)
    if (hash2(cx, cy + 1, seed + 4341) % 4 !== 0) {
      if (r < 0.2 && below === FLOOR) c.blitK(GS.vent[ri(GS.vent.length)], x0 + 8, y0 + 11, A_FACE);
      else if (r < 0.34) c.blitK(GS.relief[ri(GS.relief.length)], x0 + 8, y0 + 10, A_FACE);
    }
    for (let k = 0; k < 2; k++) {
      const wx = x0 + ri(16), r2 = rf();
      if (r2 < 0.2) c.blitK(GS.rubble[ri(GS.rubble.length)], wx, y0 + 17 + ri(2), A_FF);
      else if (r2 < 0.3) c.blitK(GS.cinder[ri(GS.cinder.length)], wx, y0 + 17 + ri(3), A_FF);
    }
  });
}
