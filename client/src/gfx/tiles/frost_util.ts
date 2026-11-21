/**
 * Gemeinsame Hilfen der Biom-Maler „Frostgebirge“ (frost.ts) und „Verlorene Ruinen“ (ruinen.ts):
 * Oberflächen-Klassifizierung der Oberwelt (owFields), Dungeon-Felder (dgFields), Raumzuordnung, Brückenrichtung,
 * Plattenverbände, Schattenauftrag und ein Büschel-Generator. Aufbau und Regeln: Kopfkommentar von core.ts.
 */
import { hash2, rng } from '../palette';
import { Px } from '../draw';
import {
  BRIDGE, Chunk, FLOOR, GROUND2, HAZARD, LIQUID, PATH, SHADE, TS, VOID, WALL, lut, mapCache, stampOf, tileAt,
  type Stamp, type WallGeom,
} from './core';
import type { PaintableMap } from '../spec';

// ---------------------------------------------------------------------------------------------------- Oberflächen
/** Oberwelt */
export const S_G = 1, S_G2 = 2, S_PATH = 3, S_HAZ = 4, S_FLOOR = 5, S_WATER = 6, S_BANK = 7, S_TOP = 8, S_FACE = 9, S_BRIDGE = 10, S_VOID = 11;
/** Dungeon */
export const D_FLOOR = 1, D_FACE = 2, D_TOP = 3, D_WATER = 5, D_RIM = 6, D_HAZ = 7;

const L_WALL = lut(WALL, VOID), L_VOID = lut(VOID), L_PATH = lut(PATH, BRIDGE), L_G2 = lut(GROUND2), L_HAZ = lut(HAZARD);
const L_LIQ = lut(LIQUID, BRIDGE), L_BRIDGE = lut(BRIDGE), L_FLOOR = lut(FLOOR), L_LIQ1 = lut(LIQUID);

// ---------------------------------------------------------------------------------------------------- Brücken
/** Je Brückenzelle: 1 = Steg verläuft West–Ost (Bohlen liegen in N–S-Richtung), 2 = Steg verläuft Nord–Süd. */
export function bridgeDirs(map: PaintableMap): Uint8Array {
  return mapCache(map, 'frBridgeDirs', () => {
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

// ---------------------------------------------------------------------------------------------------- Oberwelt-Felder
export interface OW {
  nA: Float32Array; nB: Float32Array; nC: Float32Array; nL: Float32Array;
  /** Lichtzone je Pixel: 0 = schattig, 1 = normal, 2 = sonnig */
  zone: Uint8Array;
  wallM: Uint8Array; geom: WallGeom;
  /** Abstand zur Wand · Abstand im Wandkörper zum Rand · Abstand im Wasser zum Land · Abstand an Land zum Wasser */
  dWall: Float32Array; dTop: Float32Array; dLand: Float32Array; dShore: Float32Array;
  /** Abstand im Weg zum Wegrand · Abstand außerhalb zum Weg · Abstand der Uferzone zum offenen Wasser · Uferbreite */
  dPath: Float32Array; dPathOut: Float32Array; dWat: Float32Array; bankW: Float32Array;
  dirs: Uint8Array;
}
export interface OWOpt {
  /** Salz für die Rauschfelder des Bioms */
  salt: number;
  /** true = gemauerte Wände (gerade Kanten mit ausgebrochenen Steinen), false = organisch ausgefranster Fels */
  masonry: boolean;
  /** Uferbreite: Grundwert, Rauschanteil, Zuschlag für breite Bänke */
  bank: number; bankVar: number; bankBar: number;
  /** Ausfransung der Wasserkante (1 = wie Grünwald) */
  liqFray: number;
}

/**
 * Klassifiziert jedes Pufferpixel der Oberwelt (schreibt c.kind mit S_*) und liefert die dabei entstandenen Felder.
 * Entspricht Schritt 1+2 des Grünwald-Malers; die Farbgebung bleibt Sache des Bioms.
 */
export function owFields(c: Chunk, o: OWOpt): OW {
  const { W, H, kind } = c, n = W * H, s = o.salt;
  const nA = c.noise(6, s + 1), nB = c.noise(13, s + 2), nC = c.noise(3.3, s + 3), nL = c.noise(37, s + 4), nZ1 = c.noise(96, s + 5), nZ2 = c.noise(41, s + 6);
  const cWall = c.cover(L_WALL, 'w'), cVoid = c.cover(L_VOID, 'v'), cPath = c.cover(L_PATH, 'p'), cG2 = c.cover(L_G2, 'm'), cHaz = c.cover(L_HAZ, 'h');
  const cLiq = c.cover(L_LIQ, 'l'), cFloor = c.cover(L_FLOOR, 'f');
  const bm = c.cellMask(L_BRIDGE), wm = c.cellMask(L_WALL);
  const wallM = new Uint8Array(n), liqM = new Uint8Array(n), notLiq = new Uint8Array(n), notWall = new Uint8Array(n);
  let dIn: Float32Array | null = null;
  if (o.masonry) { const nw = new Uint8Array(n); for (let i = 0; i < n; i++) nw[i] = 1 - wm[i]; dIn = c.dist(nw); }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, e1 = nA[i] - 0.5, e2 = nB[i] - 0.5, e3 = nC[i] - 0.5;
    let w = 0;
    if (dIn) {
      // Mauerwerk: gerade Kanten; einzelne Steine (6×5 px) sind 1–4 px tief ausgebrochen
      if (wm[i]) {
        const hb = hash2(Math.floor((c.x0 + x) / 6), Math.floor((c.y0 + y) / 5), c.seed + s) & 255;
        const bite = hb < 150 ? 0 : hb < 205 ? 1 : hb < 238 ? 2 : 4;
        w = dIn[i] > bite ? 1 : 0;
      }
    } else {
      // Fels: Rand kräftig ausgefranst, der Kern jeder Wandzelle (10×10 px) bleibt garantiert Wand
      let nz = e2 * 0.44 + e1 * 0.2 + e3 * 0.06;
      if (nz < -0.1) nz = -0.1 + (nz + 0.1) * 0.2;
      w = !bm[i] && cWall[i] + nz > 0.5 ? 1 : 0;
      if (!w && wm[i]) { const px = (c.x0 + x) & 15, py = (c.y0 + y) & 15; if (px > 2 && px < 13 && py > 2 && py < 13) w = 1; }
    }
    wallM[i] = w; notWall[i] = 1 - w;
    const l = !w && (bm[i] || cLiq[i] + (e2 * 0.3 + e1 * 0.17 + e3 * 0.06) * o.liqFray > 0.6) ? 1 : 0;
    liqM[i] = l; notLiq[i] = 1 - l;
  }
  const geom = c.resolveWalls(wallM, 32, 6, 6);
  const dWall = c.dist(wallM), dTop = c.dist(notWall), dLand = c.dist(notLiq), dShore = c.dist(liqM);
  const bankW = new Float32Array(n), zone = new Uint8Array(n);
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
      const bw = o.bank + nA[i] * o.bankVar + (ny > 0 ? ny * 3.6 : ny * 1.2) + (bar > 0 ? bar * o.bankBar : 0);
      bankW[i] = bw;
      k = dLand[i] <= bw ? S_BANK : S_WATER;
    }
    else if (cFloor[i] > 0.5) k = S_FLOOR;
    else if (cPath[i] + e2 * 0.2 + e1 * 0.2 + e3 * 0.1 > 0.5) k = S_PATH;
    else if (cHaz[i] + e2 * 0.3 + e1 * 0.2 > 0.5) k = S_HAZ;
    else if (cG2[i] + e2 * 0.3 + e1 * 0.14 > 0.5) k = S_G2;
    else k = S_G;
    kind[i] = k;
  }
  const notPath = new Uint8Array(n), isPath = new Uint8Array(n), water = new Uint8Array(n);
  for (let i = 0; i < n; i++) { const p = kind[i] === S_PATH || kind[i] === S_BRIDGE ? 1 : 0; isPath[i] = p; notPath[i] = 1 - p; water[i] = kind[i] === S_WATER ? 1 : 0; }
  const dPath = c.dist(notPath), dPathOut = c.dist(isPath), dWat = c.dist(water);
  return { nA, nB, nC, nL, zone, wallM, geom, dWall, dTop, dLand, dShore, dPath, dPathOut, dWat, bankW, dirs: bridgeDirs(c.map) };
}

/** Wandschatten in zwei, drei harten Stufen auftragen (ausgefranste Grenzen); `skip` = LUT der ausgenommenen Oberflächen. */
export function applyShadow(c: Chunk, sh: Float32Array, nz: Float32Array, skip: Uint8Array, lv: [number, number, number], col = SHADE): void {
  const { W, kind } = c;
  for (let y = c.iy0; y < c.iy1; y++) for (let x = c.ix0; x < c.ix1; x++) {
    const i = y * W + x, s = sh[i];
    if (s <= 0 || skip[kind[i]]) continue;
    const j = s + (nz[i] - 0.5) * 0.25;
    c.darken(i, j > 0.66 ? lv[0] : j > 0.36 ? lv[1] : lv[2], col);
  }
}

// ---------------------------------------------------------------------------------------------------- Dungeon-Felder
export interface DG {
  nA: Float32Array; nB: Float32Array; nC: Float32Array; nL: Float32Array; Fm: Uint8Array; geom: WallGeom;
  /** Abstand im Wandkörper zum Raum · Abstand im Raum zur Wand · Abstand im Becken zum Rand */
  dOut: Float32Array; dWall: Float32Array; dLiq: Float32Array; ri: RoomInfo;
}
/** Klassifiziert den Dungeon (schreibt c.kind mit D_*); rim = Breite der Beckeneinfassung in px. */
export function dgFields(c: Chunk, salt: number, rim: number): DG {
  const { W, H, kind } = c, n = W * H;
  const nA = c.noise(6, salt + 1), nB = c.noise(13, salt + 2), nC = c.noise(3.3, salt + 3), nL = c.noise(31, salt + 4);
  const Fm = c.cellMask(L_WALL), liq = c.cellMask(L_LIQ1), haz = c.cellMask(L_HAZ);
  const notF = new Uint8Array(n), notLiq = new Uint8Array(n);
  for (let i = 0; i < n; i++) { notF[i] = 1 - Fm[i]; notLiq[i] = 1 - liq[i]; }
  const geom = c.resolveWalls(Fm, 32, 6);
  const dOut = c.dist(notF), dWall = c.dist(Fm), dLiq = c.dist(notLiq);
  for (let i = 0; i < n; i++) kind[i] = Fm[i] ? (geom.fv[i] ? D_FACE : D_TOP) : liq[i] ? (dLiq[i] <= rim ? D_RIM : D_WATER) : haz[i] ? D_HAZ : D_FLOOR;
  void H;
  return { nA, nB, nC, nL, Fm, geom, dOut, dWall, dLiq, ri: roomInfo(c.map) };
}

export interface RoomInfo { roomOf: Int16Array; kind: Uint8Array }
/** Je Zelle: Raumindex+1 (0 = kein Raum) und Korridorart (1 = waagerecht, 2 = senkrecht, 3 = Schwelle waagerecht, 4 = Schwelle senkrecht). */
export function roomInfo(map: PaintableMap): RoomInfo {
  return mapCache(map, 'frRooms', () => {
    const { w, h } = map, roomOf = new Int16Array(w * h), kind = new Uint8Array(w * h), rooms = map.rooms ?? [];
    rooms.forEach((r, k) => { for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) if (x >= 0 && y >= 0 && x < w && y < h) roomOf[y * w + x] = k + 1; });
    if (!rooms.length) return { roomOf, kind };
    const fl = (x: number, y: number): boolean => { const t = tileAt(map, x, y); return t !== WALL && t !== VOID; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (roomOf[y * w + x] || !fl(x, y)) continue;
      const horiz = fl(x - 1, y) && fl(x + 1, y);
      const rm = (xx: number, yy: number): boolean => xx >= 0 && yy >= 0 && xx < w && yy < h && roomOf[yy * w + xx] > 0;
      if (horiz) kind[y * w + x] = rm(x - 1, y) || rm(x + 1, y) ? 3 : 1;
      else kind[y * w + x] = rm(x, y - 1) || rm(x, y + 1) ? 4 : 2;
    }
    return { roomOf, kind };
  });
}
/** Querkoordinate (px ab der ersten Korridorreihe) in einem Korridor; hz = Korridor verläuft waagerecht. */
export function corridorAcross(map: PaintableMap, cx: number, cy: number, wx: number, wy: number, hz: boolean): number {
  const first = tileAt(map, hz ? cx : cx - 1, hz ? cy - 1 : cy), cb = hz ? cy : cx;
  return (hz ? wy : wx) - (first === WALL || first === VOID ? cb : cb - 1) * TS;
}
/** Raum-Geometrie für Schmuckböden: Mittelpunkt (Weltpixel) und Größe. */
export function roomRect(r: { x0: number; y0: number; x1: number; y1: number }): { mx: number; my: number; rw: number; rh: number } {
  const rw = (r.x1 - r.x0 + 1) * TS, rh = (r.y1 - r.y0 + 1) * TS;
  return { mx: r.x0 * TS + rw / 2, my: r.y0 * TS + rh / 2, rw, rh };
}

// ---------------------------------------------------------------------------------------------------- Plattenverbände
/** Verlegemuster für 32×32-px-Blöcke: Rechtecke (x, y, w, h), die den Block lückenlos füllen. */
const LAYOUTS: Array<Array<[number, number, number, number]>> = [
  [[0, 0, 16, 16], [16, 0, 16, 8], [16, 8, 16, 8], [0, 16, 8, 16], [8, 16, 8, 16], [16, 16, 16, 16]],
  [[0, 0, 24, 16], [24, 0, 8, 16], [0, 16, 12, 16], [12, 16, 20, 8], [12, 24, 10, 8], [22, 24, 10, 8]],
  [[0, 0, 10, 10], [10, 0, 22, 10], [0, 10, 16, 22], [16, 10, 16, 12], [16, 22, 8, 10], [24, 22, 8, 10]],
  [[0, 0, 20, 12], [20, 0, 12, 20], [0, 12, 8, 20], [8, 12, 12, 20], [20, 20, 12, 12]],
  [[0, 0, 12, 16], [12, 0, 12, 8], [24, 0, 8, 8], [12, 8, 20, 8], [0, 16, 20, 16], [20, 16, 12, 8], [20, 24, 12, 8]],
  [[0, 0, 16, 20], [16, 0, 16, 12], [16, 12, 8, 8], [24, 12, 8, 20], [0, 20, 24, 12]],
  [[0, 0, 32, 14], [0, 14, 18, 18], [18, 14, 14, 18]],
  [[0, 0, 18, 18], [18, 0, 14, 18], [0, 18, 32, 14]],
];
const LAYMAPS = LAYOUTS.map((rects) => {
  const id = new Uint8Array(1024), edge = new Uint8Array(1024), lx = new Uint8Array(1024), ly = new Uint8Array(1024), sw = new Uint8Array(1024), sh = new Uint8Array(1024);
  rects.forEach(([x, y, w, h], k) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      const o = j * 32 + i;
      id[o] = k; lx[o] = i - x; ly[o] = j - y; sw[o] = w; sh[o] = h;
      edge[o] = (j === y ? 1 : 0) | (i === x ? 2 : 0) | (j === y + h - 1 ? 4 : 0) | (i === x + w - 1 ? 8 : 0);
    }
  });
  return { id, edge, lx, ly, sw, sh };
});
/** Ergebnis von slabAt(): Kantenbits (1 oben, 2 links, 4 unten = Fuge, 8 rechts = Fuge), Platten-Hash, Lage in der Platte, Plattengröße. */
export const SL = { e: 0, id: 0, lx: 0, ly: 0, w: 0, h: 0 };
/**
 * Unregelmäßiger Plattenverband (32-px-Blöcke aus 3–7 Platten, Blockspalten gegeneinander versetzt, zufällig gespiegelt).
 * `big` = nur die großformatigen Muster verwenden. Ergebnis in `SL`.
 */
export function slabAt(wx: number, wy: number, seed: number, big = false): void {
  const sx = wx + 5, bx = sx >> 5, sy = wy + 3 + (hash2(bx, 0, seed + 1) & 3) * 8, by = sy >> 5, hs = hash2(bx, by, seed);
  const lay = LAYMAPS[big ? 3 + (hs % 5) : hs % 6], fx = (hs >>> 8) & 1, fy = (hs >>> 9) & 1;
  const lx = fx ? 31 - (sx & 31) : sx & 31, ly = fy ? 31 - (sy & 31) : sy & 31, o = ly * 32 + lx;
  let e = lay.edge[o];
  if (fx) e = (e & 5) | ((e & 2) << 2) | ((e & 8) >> 2);
  if (fy) e = (e & 10) | ((e & 1) << 2) | ((e & 4) >> 2);
  SL.e = e; SL.id = hash2(hs, lay.id[o], 7); SL.w = lay.sw[o]; SL.h = lay.sh[o];
  SL.lx = fx ? lay.sw[o] - 1 - lay.lx[o] : lay.lx[o]; SL.ly = fy ? lay.sh[o] - 1 - lay.ly[o] : lay.ly[o];
}

// ---------------------------------------------------------------------------------------------------- Stempel
export interface TuftPal { d: number; m: number; l: number; t: number; s: number }
/** Grasbüschel: Halme fächern aus einem Fußpunkt auf – dunkler Fuß, helle Spitzen (Anker = Fußpunkt). */
export function mkTuft(seed: number, pal: TuftPal, kindOf: 'short' | 'tall' | 'tiny'): Stamp {
  const r = rng(seed), tall = kindOf === 'tall', tiny = kindOf === 'tiny';
  const w = 15, h = tall ? 14 : 10, p = new Px(w, h), by = h - 2, cx = 7;
  const n = tiny ? 1 + ((r() * 2) | 0) : tall ? 3 + ((r() * 3) | 0) : 2 + ((r() * 3) | 0);
  if (pal.s) for (let k = tiny ? 0 : -1; k <= (n > 3 ? 2 : 1); k++) p.set(cx + k, by + 1, pal.s);
  for (let k = 0; k < n; k++) {
    const off = k - (n - 1) / 2;
    const bx = cx + Math.round(off * (0.9 + r() * 0.6));
    const hgt = Math.max(2, (tiny ? 2 : tall ? 5 : 3) + ((r() * (tiny ? 2 : tall ? 5 : 3)) | 0) - (Math.abs(off) > 1 ? 1 : 0));
    const lean = off < -0.4 ? -1 : off > 0.4 ? 1 : r() < 0.5 ? 0 : r() < 0.5 ? -1 : 1;
    const bendAt = 1 + ((r() * 2) | 0);
    let x = bx;
    for (let j = 0; j < hgt; j++) {
      const col = j === 0 ? pal.d : j === hgt - 1 ? pal.t : j < hgt * 0.45 ? pal.m : pal.l;
      p.set(x, by - j, col);
      if (lean && j >= bendAt && (j - bendAt) % 2 === 0) x += lean;
    }
  }
  return stampOf(p, cx, by);
}
/** n Varianten eines Stempels aus fortlaufenden Seeds. */
export function many<T>(n: number, fn: (k: number) => T): T[] { const o: T[] = []; for (let k = 0; k < n; k++) o.push(fn(k)); return o; }
