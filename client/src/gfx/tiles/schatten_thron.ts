/**
 * Schattenreich-Dungeon „Thron der Leere“: der Palast des hohlen Königs – er schwebt in der Leere.
 *   Wände   schwarzer Marmor mit Goldgesims und Sockel; Felder zwischen Pilastern: violette Rautenverglasung,
 *           zerschlissene Königsbanner (Krone über Quell), leere Statuennischen; Marmoradern und haarfeine Goldrisse;
 *           Pfeiler sind kannelierte Marmorsäulen mit Goldringen; hinter der Mauerkrone beginnt die Leere
 *   Boden   schwarzer und pflaumenfarbener Marmor – je Raum Harlekin-Rauten, Fischgrät oder Schachbrett mit Einlagen;
 *           ein abgetretener, eingerissener Königsläufer zieht durch die Gänge und von jeder Tür zur Raummitte;
 *           große Räume: zerbrochenes Kronenmosaik; Bossraum: riesiges Siegel mit sechs Elementfeldern um eine leere,
 *           dunkle Mitte (die geraubte Quelle); Schwellen aus hellem Stein mit Goldeinlage
 *   Becken  Marmorrand um sternenklare Leere;  Gefahr: der Boden löst sich in Dunkelheit auf
 */
import { INK, WHITE, alpha, hash2, mix, rnd2 } from '../palette';
import { Chunk, HAZARD, LIQUID, SHADE, TS, VOID, WALL, allow, lut, mapCache, rf, ri, seedAt, tileAt, type WallGeom } from './core';
import { CARP, ELEM, GLOW, GOLDT, MARB, MGG, PLM, SLAB, STAR, TAR, VGL, VOIDC } from './schatten_pal';
import { SS, initSchattenStamps } from './schatten_stamps';
import { Vor, bayer } from './schatten_util';
import { corridorOrigin, roomInfo, type RoomInfo } from './kristall_util';
import type { PaintableMap } from '../spec';

const D_FLOOR = 1, D_FACE = 2, D_TOP = 3, D_VOID = 5, D_RIM = 6, D_HAZ = 7;
const L_F = lut(WALL, VOID), L_LIQ = lut(LIQUID), L_HAZ = lut(HAZARD);
const A_FLOOR = allow(D_FLOOR), A_HAZ = allow(D_HAZ), A_FACE = allow(D_FACE), A_UP = allow(D_FLOOR, D_HAZ, D_FACE, D_TOP, D_RIM);
const VM = new Vor(4, 3.5);

/** Türen eines Raums: Mitte der Öffnung in Weltpixeln je Seite, -1 = keine. */
interface Doors { n: number; s: number; w: number; e: number }
function roomDoors(map: PaintableMap): Doors[] {
  return mapCache(map, 'schDoors', () => (map.rooms ?? []).map((r) => {
    const fl = (x: number, y: number): boolean => { const t = tileAt(map, x, y); return t !== WALL && t !== VOID; };
    const span = (horiz: boolean, fix: number): number => {
      let a = 1e9, b = -1e9;
      for (let k = horiz ? r.x0 : r.y0; k <= (horiz ? r.x1 : r.y1); k++) if (horiz ? fl(k, fix) : fl(fix, k)) { a = Math.min(a, k); b = Math.max(b, k); }
      return b < a ? -1 : (a + b + 1) * 8;
    };
    return { n: span(true, r.y0 - 1), s: span(true, r.y1 + 1), w: span(false, r.x0 - 1), e: span(false, r.x1 + 1) };
  }));
}

interface TF {
  nA: Float32Array; nB: Float32Array; nC: Float32Array; nL: Float32Array; nM: Float32Array; nV: Float32Array;
  Fm: Uint8Array; geom: WallGeom; dOut: Float32Array; dWall: Float32Array; dLiq: Float32Array; dHaz: Float32Array; ri: RoomInfo; doors: Doors[];
}

export function paintThron(c: Chunk): void {
  initSchattenStamps();
  const { W, H, kind, buf, map } = c, n = W * H, seed = c.seed;
  const nA = c.noise(6, 71), nB = c.noise(13, 72), nC = c.noise(3.3, 73), nL = c.noise(31, 74), nM = c.noise(21, 75), nV = c.noise(17, 76);
  const Fm = c.cellMask(L_F), liq = c.cellMask(L_LIQ), haz = c.cellMask(L_HAZ);
  const notF = new Uint8Array(n), notLiq = new Uint8Array(n), notHaz = new Uint8Array(n);
  for (let i = 0; i < n; i++) { notF[i] = 1 - Fm[i]; notLiq[i] = 1 - liq[i]; notHaz[i] = 1 - haz[i]; }
  const geom = c.resolveWalls(Fm, 32, 6);
  const dOut = c.dist(notF), dWall = c.dist(Fm), dLiq = c.dist(notLiq), dHaz = c.dist(notHaz);
  for (let i = 0; i < n; i++) kind[i] = Fm[i] ? (geom.fv[i] ? D_FACE : D_TOP) : liq[i] ? (dLiq[i] <= 5 ? D_RIM : D_VOID) : haz[i] ? D_HAZ : D_FLOOR;
  const f: TF = { nA, nB, nC, nL, nM, nV, Fm, geom, dOut, dWall, dLiq, dHaz, ri: roomInfo(map), doors: roomDoors(map) };
  for (let y = c.iy0; y < c.iy1; y++) for (let x = c.ix0; x < c.ix1; x++) {
    const i = y * W + x, wx = c.x0 + x, wy = c.y0 + y, h = rnd2(wx, wy, seed);
    let col: number;
    switch (kind[i]) {
      case D_FLOOR: col = floorCol(c, f, i, wx, wy, h); break;
      case D_HAZ: {
        // der Boden wird von der Dunkelheit verschluckt: das Fliesenmuster löst sich gerastert auf
        const t = (dHaz[i] > 30 ? 30 : dHaz[i]) / 9 + (nB[i] - 0.5) * 0.9 + (nA[i] - 0.5) * 0.4;
        if (t > 1.2) col = h > 0.992 ? STAR[1] : alpha(VOIDC, 225);
        else if (bayer(wx, wy) < t - 0.12) col = t > 0.85 ? TAR[0] : TAR[1];
        else col = mix(floorCol(c, f, i, wx, wy, h), TAR[1], t < 0 ? 0 : t > 1 ? 0.6 : t * 0.6);
        break;
      }
      case D_FACE: col = faceCol(c, f, i, wx, wy, h); break;
      case D_TOP: col = topCol(c, f, i, wx, wy, h); break;
      case D_RIM: col = rimCol(c, f, i, wx, wy, h); break;
      default: col = poolCol(c, f, i);
    }
    buf[i] = col;
  }
  floorDetails(c, f);
  const sh = c.wallShadow(Fm, dWall, 11);
  for (let y = c.iy0; y < c.iy1; y++) for (let x = c.ix0; x < c.ix1; x++) {
    const i = y * W + x, s = sh[i];
    if (s <= 0 || kind[i] === D_VOID || kind[i] === D_RIM) continue;
    const j = s + (nC[i] - 0.5) * 0.2;
    c.darken(i, j > 0.7 ? 0.5 : j > 0.42 ? 0.34 : j > 0.16 ? 0.18 : 0.08);
  }
  wallDetails(c, f);
}

// ------------------------------------------------------------------ Marmorfliesen
/** Schattierung einer Fliese: edge 0 Fläche, 1 Lichtkante, 2 Schattenkante, 3 Fuge; sh = Zufall je Fliese. */
function marble(f: TF, i: number, plum: boolean, sh: number, edge: number, h: number): number {
  if (edge === 3) return MARB[0];
  const R = plum ? PLM : MARB;
  let t = sh < 0.3 ? 2 : sh < 0.8 ? 3 : 4;
  if (edge === 1) return R[t + 2];
  if (edge === 2) return R[t - 1];
  // Marmoradern
  const vn = Math.abs(f.nV[i] * 0.6 + f.nB[i] * 0.4 - 0.5);
  if (vn < 0.011) return R[t + 2];
  if (vn < 0.028 && h < 0.5) return R[t + 1];
  if (f.nL[i] * 0.6 + f.nA[i] * 0.4 > 0.64) t--;
  if (h < 0.03) t--; else if (h > 0.975) t++;
  return R[t];
}
function harlequin(c: Chunk, f: TF, i: number, wx: number, wy: number, h: number): number {
  const p = wx / 24 + wy / 18, q = wx / 24 - wy / 18, a = Math.floor(p), b = Math.floor(q), fp = p - a, fq = q - b;
  if ((fp < 0.1 || fp > 0.97) && (fq < 0.1 || fq > 0.97)) return GOLDT[fp < 0.1 && fq < 0.1 ? 3 : 1];
  const hh = hash2(a, b, c.seed + 4110), sv = Math.abs(fp - fq * 0.4 - 0.3 - ((hh >>> 12) & 3) * 0.08);
  return marble(f, i, ((a + b) & 1) === 1, sv < 0.03 ? 0.9 : (hh & 1023) / 1023, fp < 0.065 || fq < 0.065 ? 3 : fp < 0.15 ? 1 : fp > 0.93 ? 2 : 0, h);
}
function herring(c: Chunk, f: TF, i: number, wx: number, wy: number, h: number): number {
  const ix = Math.floor(wx / 8), jy = Math.floor(wy / 8), lx = wx - ix * 8, ly = wy - jy * 8, t6 = (((ix - jy) % 6) + 6) % 6;
  const hz = t6 < 3, pos = hz ? t6 : 5 - t6, X = hz ? pos * 8 + lx : lx, Y = hz ? ly : pos * 8 + ly, BW = hz ? 24 : 8, BH = hz ? 8 : 24;
  const hh = hash2(hz ? ix - pos : ix, hz ? jy : jy - pos, c.seed + 4111);
  return marble(f, i, !hz, (hh & 1023) / 1023, X === BW - 1 || Y === BH - 1 ? 3 : X === 0 || Y === 0 ? 1 : 0, h);
}
function chequer(c: Chunk, f: TF, i: number, wx: number, wy: number, h: number): number {
  const kx = Math.floor(wx / 20), ky = Math.floor(wy / 15), ux = wx - kx * 20, uy = wy - ky * 15, plum = ((kx + ky) & 1) === 1;
  const hh = hash2(kx, ky, c.seed + 4112);
  if (!plum) {
    // schwarze Felder tragen eine kleine Raute aus Pflaumenmarmor in Goldfassung
    const dm = Math.abs(ux - 9.5) + Math.abs(uy - 7) * 1.3;
    if (dm < 4.6) return dm > 3.5 ? GOLDT[ux < 9.5 ? 2 : 1] : PLM[ux + uy < 16 ? 5 : 4];
  }
  return marble(f, i, plum, (hh & 1023) / 1023, ux === 19 || uy === 14 ? 3 : ux === 0 || uy === 0 ? 1 : ux === 18 || uy === 13 ? 2 : 0, h);
}

// ------------------------------------------------------------------ Königsläufer
/** u = Abstand quer zur Laufrichtung (0 = Mitte), a = Lage längs; base = Bodenfarbe darunter (für Risse und Schatten). */
function carpet(f: TF, i: number, u: number, a: number, h: number, base: number): number {
  const au = Math.abs(u), tn = f.nB[i] * 0.5 + f.nL[i] * 0.5;
  if (au > 8.6 || tn > 0.665) return base;
  if (au > 7.6) return u > 0 ? mix(base, SHADE, 0.45) : base;
  if (tn > 0.642) return h < 0.55 ? CARP[0] : base;
  if (au > 6.6) return h < 0.1 ? base : CARP[0];
  const worn = f.nM[i] * 0.6 + f.nA[i] * 0.4 > 0.58;
  // Goldborte, an abgetretenen Stellen bis auf den Grund durchgescheuert
  if (au > 4.6) return worn ? (h < 0.5 ? CARP[2] : CARP[1]) : au > 5.6 ? GOLDT[1] : (Math.floor(a / 2) & 1) ? GOLDT[3] : GOLDT[2];
  if (au > 3.6) return CARP[1];
  const am = ((a % 18) + 18) % 18, m = au * 1.3 + Math.abs(am - 9) * 0.75;
  if (m < 1.3 && !worn) return GOLDT[3];
  let t = m < 3 ? 4 : m < 3.9 ? 2 : 3;
  if (worn) return h < 0.45 ? mix(CARP[4], MARB[4], 0.45) : CARP[t === 4 ? 3 : t];
  if (u < 0 && t === 3 && f.nC[i] > 0.72) t = 4;
  if (h < 0.06) t--;
  return CARP[t];
}

function floorCol(c: Chunk, f: TF, i: number, wx: number, wy: number, h: number): number {
  const map = c.map, cx = wx >> 4, cy = wy >> 4, ci = cy * map.w + cx, seed = c.seed;
  const room = f.ri.roomOf[ci], ck = f.ri.kind[ci];
  if (room) {
    const r = map.rooms![room - 1], boss = r.role === 'boss', dr = f.doors[room - 1];
    const x0 = r.x0 * TS, y0 = r.y0 * TS, x1 = (r.x1 + 1) * TS, y1 = (r.y1 + 1) * TS, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const dx = wx + 0.5 - mx, dy = (wy + 0.5 - my) / 0.84, rr = Math.sqrt(dx * dx + dy * dy);
    const big = !boss && r.role !== 'trap' && r.role !== 'secret' && x1 - x0 >= 176 && y1 - y0 >= 128;
    const R = boss ? 70 : big ? 31 : 11;
    if (rr < R) return boss ? seal(c, f, i, wx, wy, dx, dy, rr, R, h) : big ? crownMosaic(c, f, i, wx, wy, dx, dy, rr, R, h) : medallion(dx, dy, rr, h);
    const style = boss ? 0 : hash2(room, 3, seed + 4104) % 3;
    let base = style === 0 ? harlequin(c, f, i, wx, wy, h) : style === 1 ? herring(c, f, i, wx, wy, h) : chequer(c, f, i, wx, wy, h);
    // Zierband entlang der Wände
    const inset = Math.min(wx - x0, x1 - 1 - wx, wy - y0, y1 - 1 - wy);
    if (inset >= 5 && inset <= 8) {
      const al = Math.min(wx - x0, x1 - 1 - wx) < Math.min(wy - y0, y1 - 1 - wy) ? wy : wx;
      base = inset === 5 || inset === 8 ? MARB[0] : boss ? ((al >> 2) & 1 ? GOLDT[inset === 6 ? 3 : 2] : GOLDT[1]) : PLM[(al & 7) === 0 ? 2 : inset === 6 ? 5 : 4];
    }
    // Läufer von jeder Tür zur Raummitte
    const sy = R * 0.84 + 2, sx = R + 2, ux = wx + 0.5, uy = wy + 0.5;
    if (dr.n >= 0 && uy < my - sy && Math.abs(ux - dr.n) < 9) return carpet(f, i, ux - dr.n, wy, h, base);
    if (dr.s >= 0 && uy > my + sy && Math.abs(ux - dr.s) < 9) return carpet(f, i, ux - dr.s, wy, h, base);
    if (dr.w >= 0 && ux < mx - sx && Math.abs(uy - dr.w) < 9) return carpet(f, i, uy - dr.w, wx, h, base);
    if (dr.e >= 0 && ux > mx + sx && Math.abs(uy - dr.e) < 9) return carpet(f, i, uy - dr.e, wx, h, base);
    return base;
  }
  if (ck === 1 || ck === 2) {
    // Gang: Pflaumenbänder mit Goldlinie an den Wänden, schwarze Langfliesen, darauf der Läufer
    const hz = ck === 1, a = hz ? wx : wy, b = (hz ? wy : wx) - corridorOrigin(map, cx, cy, hz);
    let base: number;
    if (b < 4 || b > 27) base = marble(f, i, true, rnd2(a >> 4, b < 4 ? 0 : 1, seed + 4120), (a & 15) === 15 || b === 3 || b === 31 ? 3 : b === 0 || b === 28 ? 1 : 0, h);
    else if (b === 4 || b === 27) base = f.nM[i] > 0.62 ? MARB[1] : GOLDT[h < 0.3 ? 3 : 2];
    else {
      const row = b < 16 ? 0 : 1, aa = a + row * 13, k = Math.floor(aa / 26), la = aa - k * 26;
      base = marble(f, i, false, rnd2(k, row, seed + 4121), la === 25 || b === 15 || b === 26 ? 3 : la === 0 || b === 5 || b === 16 ? 1 : 0, h);
    }
    return carpet(f, i, b - 15.5, a, h, base);
  }
  if (ck === 3 || ck === 4) {
    // Schwelle: heller Stein mit Goldeinlage
    const hz = ck === 3, a = (hz ? wx : wy) & 15, b = (hz ? wy : wx) - corridorOrigin(map, cx, cy, hz);
    if (a === 15 || b === 31 || b === 0) return MARB[0];
    if (a === 0 || b === 1) return SLAB[6];
    if (a === 2 || a === 13 || b === 3 || b === 28) return GOLDT[h < 0.2 ? 1 : 2];
    const dm = Math.abs(a - 7.5) + Math.abs(b - 15.5) * 0.55;
    if (dm < 5) return dm > 4 ? GOLDT[3] : dm < 1.2 ? GOLDT[4] : a + b * 0.5 < 15 ? PLM[4] : PLM[3];
    const b2 = Math.abs(b - 15.5);
    if (b2 > 9 && b2 < 10) return GOLDT[1];
    return SLAB[h < 0.06 ? 3 : (b & 15) === 15 ? 2 : 4];
  }
  return herring(c, f, i, wx, wy, h);
}
/** Kleine Räume: runde Goldscheibe mit Pflaumenkern, an der die Läufer enden. */
function medallion(dx: number, dy: number, rr: number, h: number): number {
  const lit = dx + dy < 0;
  if (rr > 9.8) return MARB[0];
  if (rr > 7.4) return GOLDT[lit ? 3 : h < 0.3 ? 1 : 2];
  if (rr > 6.5) return MARB[0];
  if (rr < 1.6) return GOLDT[4];
  if (Math.abs(dx) < 0.8 || Math.abs(dy) < 0.8) return GOLDT[2];
  return PLM[lit ? 4 : 3];
}
/** Große Räume: Kronenmosaik – ein Riss geht hindurch, ein Keil Steinchen fehlt. */
function crownMosaic(c: Chunk, f: TF, i: number, wx: number, wy: number, dx: number, dy: number, rr: number, R: number, h: number): number {
  const lit = dx + dy < 0;
  const crack = dx * 0.45 + dy - 5 + (f.nA[i] - 0.5) * 5 + (f.nB[i] - 0.5) * 10;
  if (Math.abs(crack) < 0.9) return MARB[0];
  if (crack > 0 && crack < 10 && f.nM[i] * 0.6 + f.nB[i] * 0.4 > 0.5) return h < 0.08 ? GOLDT[1] : MARB[h < 0.35 ? 1 : 2];
  if (rr > R - 1.2) return MARB[0];
  VM.at(wx, wy, c.seed + 4130);
  const tv = (VM.id >>> 5) % 3;
  if (rr > R - 4.2) return VM.e < 0.4 ? GOLDT[0] : GOLDT[tv + (lit ? 1 : 0)];
  if (rr > R - 5.2) return MARB[0];
  if (VM.e < 0.42) return MARB[1];
  const X = dx, Y = dy;
  let gold = false, gem = 0;
  // Reif der Krone mit Steinen, darüber drei Zacken mit Kugeln
  if (Math.abs(X) < 13.5 && Y > 3 && Y < 10) { gold = true; if (Y > 5 && Y < 8 && ((Math.abs(X) + 1.5) % 6.5) < 2.4) gem = 1; }
  for (let k = -1; k <= 1; k++) {
    const cxk = k * 9.5, tip = k === 0 ? -12 : -8;
    if (Y <= 3 && Y > tip && Math.abs(X - cxk) < (4.8 * (Y - tip)) / (3 - tip)) gold = true;
    if ((X - cxk) * (X - cxk) + (Y - tip + 1.5) * (Y - tip + 1.5) < 4.5) gem = 2;
  }
  // der Quell unter der Krone
  if (Y > 13 && Y < 21 && Math.abs(X) < (Y < 17 ? (Y - 13) * 0.9 : (21 - Y) * 0.9)) return GLOW[tv === 0 ? 1 : 2];
  if (gem === 1) return tv === 0 ? MGG[2] : MGG[3];
  if (gem === 2) return tv === 0 ? GOLDT[3] : WHITE;
  if (gold) return GOLDT[1 + tv + (lit && tv < 2 ? 1 : 0)];
  return PLM[2 + tv];
}
/** Bossraum: Siegel der sechs Elemente um die leere Fassung der geraubten Quelle. */
function seal(c: Chunk, f: TF, i: number, wx: number, wy: number, dx: number, dy: number, rr: number, R: number, h: number): number {
  const lit = dx + dy < 0;
  if (rr < 17) {
    // die leere Fassung: ein Loch in die Leere
    if (rr > 15.6) return MARB[0];
    if (rr > 13.4 && !lit) return MARB[rr > 14.5 ? 4 : 3];
    return h > 0.992 ? STAR[1] : alpha(VOIDC, rr > 10 ? 232 : 205);
  }
  if (rr < 21.5) return rr < 18 || rr > 20.5 ? GOLDT[0] : GOLDT[lit ? 3 : 2];
  if (rr > R - 1.3) return MARB[0];
  const a = Math.atan2(dy, dx) + Math.PI;
  if (rr > R - 6.5) {
    // äußerer Runenring
    if (rr < R - 5.4) return GOLDT[0];
    const nn = Math.floor((a / (Math.PI * 2)) * 54), hr = hash2(nn, 7, c.seed + 4140);
    return rr > R - 4.6 && rr < R - 2.2 && (hr & 3) < 2 && Math.floor(rr * 2 + nn) % 3 !== 0 ? MARB[1] : GOLDT[lit ? 3 : h < 0.25 ? 1 : 2];
  }
  const sa = Math.PI / 3, k = Math.floor(a / sa) % 6, da = a - k * sa, lat = Math.min(da, sa - da) * rr;
  if (lat < 1.7) return lat < 0.75 ? GOLDT[lit ? 4 : 3] : GOLDT[0];
  // Risse strahlen von der Fassung aus
  if (Math.abs(f.nV[i] - 0.5) < 0.02 && rr < 24 + f.nL[i] * 44) return MARB[0];
  const E = ELEM[k], rm = (21.5 + R - 6.5) / 2, em = Math.hypot((da - sa / 2) * rr, rr - rm);
  // Elementstein in der Feldmitte
  if (em < 6) return em > 4.8 ? GOLDT[lit ? 3 : 1] : em < 1.7 ? WHITE : em < 3.2 === lit ? E[2] : E[1];
  if (Math.abs(rr - rm - 9.5) < 0.6 || Math.abs(rr - rm + 9.5) < 0.6) return GOLDT[1];
  VM.at(wx, wy, c.seed + 4131);
  if (VM.e < 0.4) return mix(E[0], MARB[0], 0.55);
  const tv = (VM.id >>> 5) % 4, band = Math.abs(rr - rm) > 9.5;
  const col = tv === 0 ? mix(E[0], E[1], 0.5) : tv === 3 && lit ? E[2] : E[1];
  // verblasst: die Kraft ist fort
  return mix(col, MARB[3], band ? 0.5 : 0.24);
}

// ------------------------------------------------------------------ Wände
const FLUTE = [5, 6, 5, 4, 2, 4, 4, 3, 1, 3, 3, 2, 2, 1];
function faceCol(c: Chunk, f: TF, i: number, wx: number, wy: number, h: number): number {
  const g = f.geom, v = g.fv[i], fh = g.fh[i], top = fh - v, seed = c.seed;
  let col: number;
  if (fh < 16) {
    // Pfeiler: kannelierte Marmorsäule mit Goldringen
    const lx = wx & 15;
    if (lx === 0 || lx === 15 || v === 1) return MARB[0];
    if (top === 0) return MARB[6];
    if (top === 1 || v === 3) return GOLDT[lx < 5 ? 3 : lx < 10 ? 2 : 1];
    col = MARB[FLUTE[lx - 1]];
    if (top === 2) col = mix(col, SHADE, 0.4);
    return v === 2 ? MARB[lx < 8 ? 4 : 2] : col;
  }
  if (top === 0) return MARB[6];
  if (top === 1) return MARB[5];
  // Goldgesims, stellenweise abgeblättert
  if (top === 2) return ((wx % 11) + 11) % 11 === 0 ? GOLDT[0] : f.nM[i] > 0.63 ? MARB[2] : GOLDT[h < 0.3 ? 3 : 2];
  if (top === 3) return MARB[0];
  if (v <= 4) {
    // Sockel
    col = v === 4 ? MARB[5] : v === 1 ? MARB[0] : ((wx + 5) & 15) === 0 ? MARB[1] : MARB[v === 3 ? 3 : 2];
  } else {
    const bx = ((wx % 32) + 32) % 32, bay = Math.floor(wx / 32), rowK = (wy + v) >> 4, hb = hash2(bay, rowK, seed + 4200);
    if (bx < 3 || bx > 28) col = MARB[bx === 0 || bx === 29 ? 5 : bx === 2 || bx === 31 ? 2 : 4];
    else if (bx === 3 || bx === 28) col = MARB[0];
    else {
      const type = hb % 4, fx = bx - 4, fy = top - 4;
      if (type < 2 && fx >= 2 && fx <= 21 && fy >= 2 && v >= 7 && fh >= 26) {
        // violette Rautenverglasung in Goldrahmen
        if (fx === 2 || fx === 21 || fy === 2 || v === 7) col = GOLDT[fx === 2 || fy === 2 ? 2 : 0];
        else {
          const d1 = (((fx + fy) % 8) + 8) % 8, d2 = (((fx - fy) % 8) + 8) % 8;
          if (d1 === 0 || d2 === 0) col = mix(VGL[0], INK, 0.4);
          else {
            const hp = hash2(Math.floor((fx + fy) / 8) + bay * 31, Math.floor((fx - fy + 64) / 8) + rowK * 7, seed + 4201);
            let t = 1 + (hp % 3);
            if (((fx + fy * 0.7 + (hb >>> 8) % 17) % 17) < 3) t++;
            col = hp % 11 === 0 ? mix(VGL[4], GLOW[2], 0.45) : hp % 7 === 0 ? MGG[3] : VGL[t];
            if (d1 === 1) col = mix(col, VGL[4], 0.4);
          }
        }
      } else {
        // schwarzer Marmor mit Adern und haarfeinen Goldrissen
        const vn = Math.abs(f.nV[i] - 0.5);
        col = MARB[f.nL[i] > 0.55 ? 3 : 2];
        if (vn < 0.012) col = MARB[5]; else if (vn < 0.03) col = MARB[4];
        if (Math.abs(f.nB[i] * 0.5 + f.nL[i] * 0.5 - 0.5) < 0.007 && f.nM[i] > 0.45) col = GOLDT[h < 0.3 ? 3 : 2];
        if (fx === 0 || fy === 0) col = MARB[1]; else if (fx === 23 || v === 5) col = MARB[4];
        if (h < 0.03) col = MARB[1];
      }
    }
  }
  if (top === 4) col = mix(col, SHADE, 0.4);
  if (v <= 2) col = mix(col, SHADE, 0.35);
  if (!f.Fm[i - 1]) col = mix(col, MARB[6], 0.5);
  else if (!f.Fm[i + 1]) col = mix(col, SHADE, 0.5);
  else if (!f.Fm[i + 2]) col = mix(col, SHADE, 0.25);
  return col;
}
function topCol(c: Chunk, f: TF, i: number, wx: number, wy: number, h: number): number {
  const g = f.geom, d = f.dOut[i], ts = g.ts[i];
  if (ts < 255 && g.tn[i] < 255 && ts + g.tn[i] <= 9) {
    // Säulenkopf von oben: quadratisches Kapitell mit Goldeinlage
    const lx = wx & 15, tn = g.tn[i], m = Math.min(lx, 15 - lx, tn - 1, ts + 1);
    if (m === 0) return lx === 0 || tn === 1 ? MARB[6] : MARB[1];
    if (m === 2) return GOLDT[lx < 8 ? 3 : 1];
    return MARB[m === 1 ? 5 : 4];
  }
  if (ts <= 2) return ts === 1 ? MARB[5] : MARB[4];
  if (ts === 3) return MARB[0];
  if (d <= 4.01) {
    const wOpen = !f.Fm[i - 1] || !f.Fm[i - 2] || !f.Fm[i - 3] || !f.Fm[i - 4], nOpen = g.tn[i] <= 4;
    const al = nOpen ? wx : wy, cj = ((al % 13) + 13) % 13;
    if (d <= 1.01) return wOpen ? MARB[5] : nOpen ? MARB[4] : MARB[3];
    if (d <= 3.01) return cj === 0 ? MARB[0] : d <= 2.01 && (wOpen || nOpen) ? MARB[3] : MARB[2];
    return MARB[0];
  }
  // hinter der Mauerkrone: der Palast schwebt in der Leere
  const fade = d + (f.nA[i] - 0.5) * 4 + (f.nB[i] - 0.5) * 6;
  if (fade < 8) return h < 0.05 ? MARB[2] : MARB[1];
  if (fade < 13 && bayer(wx, wy) > (fade - 8) / 5) return MARB[fade < 10 ? 1 : 0];
  // ruhende Schleier brechen die Wiederholung der Sternenkachel
  const big = f.nL[i] * 0.55 + f.nM[i] * 0.45;
  return alpha(VOIDC, fade < 30 ? 200 : big > 0.6 ? 120 : big < 0.4 ? 215 : 165);
}

// ------------------------------------------------------------------ Becken
function rimCol(c: Chunk, f: TF, i: number, wx: number, wy: number, h: number): number {
  const d = f.dLiq[i], W = c.W;
  const ny = (f.dLiq[i + W] - f.dLiq[i - W]) * 0.5, nx = (f.dLiq[i + 1] - f.dLiq[i - 1]) * 0.5;
  const al = Math.abs(ny) >= Math.abs(nx) ? wx : wy, seg = ((al % 12) + 12) % 12;
  if (d <= 1.01) return seg === 11 ? MARB[1] : nx + ny > 0 ? MARB[6] : MARB[4];
  if (d <= 2.01) return seg === 11 ? MARB[0] : GOLDT[h < 0.25 ? 3 : 2];
  if (d <= 4.01) return seg === 11 ? MARB[0] : nx + ny > 0 ? MARB[4] : MARB[3];
  return MARB[0];
}
function poolCol(c: Chunk, f: TF, i: number): number {
  const d = f.dLiq[i], W = c.W, ny = (f.dLiq[i + W] - f.dLiq[i - W]) * 0.5;
  // Innenwand unter dem Nordrand, sonst nur ein Schatten – darunter die Leere
  if (ny > 0.4 && d < 12) return d < 9 ? MARB[1] : d < 11 ? MARB[0] : alpha(INK, 140);
  if (d < 7.5) return alpha(INK, 120);
  return 0;
}

// ------------------------------------------------------------------ Details
function floorDetails(c: Chunk, f: TF): void {
  const { W, kind } = c, seed = c.seed;
  c.cells((cx, cy, t) => {
    const x0 = cx * TS, y0 = cy * TS;
    seedAt(cx, cy, seed + 4300);
    for (let k = 0; k < 4; k++) {
      const wx = x0 + ri(16), wy = y0 + ri(16), r = rf(), i = (wy - c.y0) * W + (wx - c.x0);
      if (kind[i] !== D_FLOOR) continue;
      const near = f.dWall[i] < 14;
      let q = r;
      if ((q -= 0.03) < 0) c.blitK(SS.gcrack[ri(SS.gcrack.length)], wx, wy, A_FLOOR);
      else if ((q -= near ? 0.022 : 0.004) < 0) c.blitK(SS.rubble[ri(SS.rubble.length)], wx, wy, A_UP);
      else if ((q -= near ? 0.02 : 0.004) < 0) c.blitK(SS.shard[ri(SS.shard.length)], wx, wy, A_UP);
      else if ((q -= 0.03) < 0) c.blitK(SS.mote[ri(SS.mote.length)], wx, wy, A_FLOOR);
    }
    if (t === HAZARD) for (let k = 0; k < 2; k++) {
      const wx = x0 + ri(16), wy = y0 + ri(16);
      if (rf() < 0.6) c.blitK(SS.eye[ri(SS.eye.length)], wx, wy, A_HAZ);
    }
  });
}
function wallDetails(c: Chunk, f: TF): void {
  const { W, kind, map } = c, seed = c.seed, g = f.geom;
  const open = (x: number, y: number): boolean => { const t = tileAt(map, x, y); return t !== WALL && t !== VOID; };
  c.cells((cx, cy, t) => {
    if (t !== WALL || (cx & 1) || !open(cx, cy + 1) || tileAt(map, cx + 1, cy) !== WALL || !open(cx + 1, cy + 1)) return;
    const x0 = cx * TS, y0 = cy * TS, i = (y0 + 15 - c.y0) * W + (x0 + 15 - c.x0);
    if (kind[i] !== D_FACE || g.fh[i] < 26 || kind[i + 1] !== D_FACE || g.fh[i + 1] < 26) return;
    // Felder zwischen den Pilastern: Typ wie in faceCol (2 = Banner, 3 = Nische)
    const hb = hash2(cx >> 1, cy + 1, seed + 4200), type = hb % 4, lipY = y0 + 16 - g.fh[i];
    if (type === 2) c.blitK(SS.banner[(hb >>> 4) % SS.banner.length], x0 + 16, lipY + 4, A_FACE);
    else if (type === 3) c.blitK(SS.niche[(hb >>> 4) % SS.niche.length], x0 + 16, lipY + 5, A_FACE);
  });
}
