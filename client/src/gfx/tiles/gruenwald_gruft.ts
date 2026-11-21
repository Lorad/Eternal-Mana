/**
 * Grünwald-Dungeon „Wurzelgruft“: uralte, von Wurzeln durchbrochene Gruft.
 *   Wände   zwei Kacheln hohe Fronten aus alten Quadern, von Wurzeln und Erde zusammengehalten; dunkle Mauerkrone.
 *   Boden   ausgetretene Steinplatten wechselnder Größe mit Moosfugen, Erdflecken, Rissen und querenden Wurzeln;
 *           raumbezogen (map.rooms): Medaillon in großen Räumen, Rautenpflaster + Dornblüten-Rosette im Bossraum,
 *           Läuferverband in Korridoren, Schwellensteine an den Durchgängen.
 *   Becken  steingefasst, trübes Wasser;  Gefahr: Dornwurzeln, die das Pflaster aufbrechen.
 */
import { INK, P, WHITE, alpha, hash2, mix, rng, rnd2 } from '../palette';
import { Px, tube, type Pt } from '../draw';
import {
  Chunk, FLOOR, HAZARD, LIQUID, SHADE, TS, VOID, WALL, allow, clamp, lut, mapCache, rf, ri, seedAt, stampOf, stampRows, tileAt,
  type Stamp, type WallGeom,
} from './core';
import { EARTH as EARTH0, F, G, WD } from './gruenwald_pal';
import { ST, initStamps } from './gruenwald_stamps';
import type { PaintableMap } from '../spec';

const D_FLOOR = 1, D_FACE = 2, D_TOP = 3, D_WATER = 5, D_RIM = 6, D_HAZ = 7;
const ST0 = P.stone;
/** Mauerwerk (hell, damit die Front gegen den Boden steht) */
const DS = [mix(ST0[0], F[0], 0.4), mix(ST0[1], F[1], 0.22), mix(ST0[2], P.sand[1], 0.3), mix(ST0[2], P.sand[2], 0.45), mix(ST0[3], P.sand[3], 0.4), mix(ST0[4], P.sand[4], 0.4)];
/** Bodenplatten (etwas dunkler und wärmer) */
const FL = [mix(ST0[0], F[0], 0.3), mix(ST0[1], WD[1], 0.3), mix(mix(ST0[1], ST0[2], 0.45), P.sand[1], 0.3), mix(mix(ST0[1], ST0[2], 0.8), P.sand[2], 0.3), mix(ST0[2], P.sand[2], 0.42), mix(mix(ST0[2], ST0[3], 0.6), P.sand[3], 0.4)];
/** Schmuckstein der Medaillons (warm) */
const MD = [mix(P.sand[0], ST0[0], 0.3), mix(P.sand[1], WD[1], 0.25), mix(P.sand[2], P.tan[1], 0.3), mix(P.sand[2], P.tan[2], 0.4), mix(P.sand[3], P.tan[3], 0.3), mix(P.sand[4], P.tan[4], 0.3)];
const THORN = [mix(P.red[0], ST0[0], 0.45), mix(P.red[1], ST0[1], 0.5), mix(P.red[2], ST0[2], 0.55)];
const TOPD = [mix(DS[0], INK, 0.4), mix(DS[0], DS[1], 0.25), mix(DS[0], DS[1], 0.7)];
/** Gruftmoos: gedämpfter als im Freien */
const MOSS = [mix(F[1], ST0[0], 0.25), mix(F[1], F[2], 0.55), mix(F[2], G[2], 0.3), mix(F[2], G[2], 0.65), mix(F[3], G[3], 0.35)];
/** Erde in der Gruft: dunkler und grauer als draußen */
const EARTH = EARTH0.map((e) => mix(mix(e, ST0[1], 0.3), INK, 0.12));
const VOIDG = mix(F[0], INK, 0.78);
const MURK = mix(F[1], P.sand[0], 0.35);

const L_F = lut(WALL, VOID), L_LIQ = lut(LIQUID), L_HAZ = lut(HAZARD);
const A_FLOOR = allow(D_FLOOR, D_HAZ), A_FACE = allow(D_FACE), A_WALLS = allow(D_FACE, D_TOP), A_FF = allow(D_FACE, D_FLOOR, D_HAZ), A_HAZ = allow(D_HAZ, D_FLOOR), A_TOP = allow(D_TOP);

// ---------------------------------------------------------------------------------------------------- Plattenverbände
/** Verlegemuster für 32×32-px-Blöcke: Rechtecke (x, y, w, h), die den Block lückenlos füllen. */
const LAYOUTS: Array<Array<[number, number, number, number]>> = [
  [[0, 0, 16, 16], [16, 0, 16, 8], [16, 8, 16, 8], [0, 16, 8, 16], [8, 16, 8, 16], [16, 16, 16, 16]],
  [[0, 0, 24, 16], [24, 0, 8, 16], [0, 16, 12, 16], [12, 16, 20, 8], [12, 24, 10, 8], [22, 24, 10, 8]],
  [[0, 0, 10, 10], [10, 0, 22, 10], [0, 10, 16, 22], [16, 10, 16, 12], [16, 22, 8, 10], [24, 22, 8, 10]],
  [[0, 0, 20, 12], [20, 0, 12, 20], [0, 12, 8, 20], [8, 12, 12, 20], [20, 20, 12, 12]],
  [[0, 0, 12, 16], [12, 0, 12, 8], [24, 0, 8, 8], [12, 8, 20, 8], [0, 16, 20, 16], [20, 16, 12, 8], [20, 24, 12, 8]],
  [[0, 0, 16, 20], [16, 0, 16, 12], [16, 12, 8, 8], [24, 12, 8, 20], [0, 20, 24, 12]],
];
/** id = Plattenindex je Pixel, edge = Bits: 1 Oberkante, 2 linke Kante, 4 Unterkante (Fuge), 8 rechte Kante (Fuge) */
const LAYMAPS = LAYOUTS.map((rects) => {
  const id = new Uint8Array(1024), edge = new Uint8Array(1024);
  rects.forEach(([x, y, w, h], k) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      id[j * 32 + i] = k;
      edge[j * 32 + i] = (j === y ? 1 : 0) | (i === x ? 2 : 0) | (j === y + h - 1 ? 4 : 0) | (i === x + w - 1 ? 8 : 0);
    }
  });
  return { id, edge };
});

// ---------------------------------------------------------------------------------------------------- Raumzuordnung
interface RoomInfo { roomOf: Int16Array; kind: Uint8Array }
/** Je Zelle: Raumindex+1 (0 = kein Raum) und Korridorart (1 = waagerecht, 2 = senkrecht, 3 = Schwelle waagerecht, 4 = Schwelle senkrecht). */
function roomInfo(map: PaintableMap): RoomInfo {
  return mapCache(map, 'gruftRooms', () => {
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

// ---------------------------------------------------------------------------------------------------- Stempel
const GS = {
  wallRoot: [] as Stamp[], floorRoot: [] as Stamp[], niche: [] as Stamp[], crack: [] as Stamp[], rubble: [] as Stamp[], thorn: [] as Stamp[],
  curb: [] as Stamp[], drip: [] as Stamp[],
};
const ROOTR = [mix(WD[0], INK, 0.2), WD[1], WD[2], mix(WD[2], WD[3], 0.6), mix(WD[3], WD[4], 0.4)];
function initGruftStamps(): void {
  if (GS.wallRoot.length) return;
  initStamps();
  // dicke Wurzeln, die aus der Mauerkrone über die Front bis auf den Boden wachsen (Anker = Oberkante der Front)
  for (let k = 0; k < 8; k++) {
    const r = rng(6000 + k * 13), w = 22, h = 46, p = new Px(w, h);
    const x0 = 8 + r() * 6, pts: Pt[] = [[x0, 0]];
    let x = x0;
    for (let y = 6; y <= 36; y += 6) { x = clamp(x + (r() - 0.5) * 7, 4, w - 5); pts.push([x, y]); }
    pts.push([x + (r() < 0.5 ? -4 : 4), 42]);
    const sh = new Px(w, h);
    tube(sh, pts.map((q) => [q[0] + 1.5, q[1] + 0.5] as Pt), 2.6, 1.2, [alpha(INK, 95), alpha(INK, 95), alpha(INK, 95)], 0);
    p.draw(sh);
    tube(p, pts, 2.4, 1.1, ROOTR, 1);
    // Seitenwurzel
    const b = pts[2 + ((r() * 3) | 0)], dir = r() < 0.5 ? -1 : 1;
    tube(p, [[b[0], b[1]], [b[0] + dir * 4, b[1] + 5], [b[0] + dir * 6, b[1] + 12]], 1.3, 0.6, ROOTR, 1);
    // Rindenkerben
    for (let j = 0; j < 7; j++) { const q = pts[1 + ((r() * (pts.length - 2)) | 0)]; p.set(q[0] + (r() - 0.5) * 2, q[1] + (r() - 0.5) * 5, ROOTR[0]); }
    GS.wallRoot.push(stampOf(p, 11, 0));
  }
  // Wurzeln quer über den Boden
  for (let k = 0; k < 8; k++) {
    const r = rng(6100 + k * 17), w = 40, h = 16, p = new Px(w, h);
    const pts: Pt[] = [[2, 4 + r() * 8]];
    for (let x = 9; x <= 37; x += 7) pts.push([x, clamp(pts[pts.length - 1][1] + (r() - 0.5) * 8, 3, h - 4)]);
    const sh = new Px(w, h);
    tube(sh, pts.map((q) => [q[0] + 0.5, q[1] + 1.6] as Pt), 2, 0.9, [alpha(INK, 90), alpha(INK, 90), alpha(INK, 90)], 0);
    p.draw(sh);
    tube(p, pts, 1.9, 0.7, ROOTR, 1);
    const b = pts[1 + ((r() * 3) | 0)];
    tube(p, [[b[0], b[1]], [b[0] + 4, b[1] + (r() < 0.5 ? -4 : 4)], [b[0] + 9, b[1] + (r() < 0.5 ? -5 : 5)]], 1.1, 0.5, ROOTR, 1);
    const s = stampOf(p, 20, 8);
    GS.floorRoot.push(s);
  }
  // Wandnischen (Anker = Unterkante Mitte)
  const np = { o: DS[0], k: mix(DS[0], INK, 0.55), d: mix(DS[0], INK, 0.3), l: DS[5], m: DS[4], b: P.bone[2], B: P.bone[3], e: INK, c: P.cream[3], f: P.fire[2], g: P.fire[3], w: MOSS[2] };
  GS.niche.push(
    // Schädel
    stampRows(['...mllllm...', '..mooooool..', '.mokkkkkkol.', '.lokkkkkkol.', '.lokkkkkkol.', '.lokBBBBkol.', '.lokBeBeBol.', '.lokBBBBkol.', '.lokdBeBdol.', '.loddddddol.', '.mooooooool.', 'mlllllllllld'], np, 6, 11),
    // Kerzenstummel
    stampRows(['...mllllm...', '..mooooool..', '.mokkkkkkol.', '.lokkkkkkol.', '.lokkkgkkol.', '.lokkgfgkol.', '.lokkkfkkol.', '.lokkkckkol.', '.lokkcccdol.', '.loddcccdol.', '.mooooooool.', 'mlllllllllld'], np, 6, 11),
    // leer, bemoost
    stampRows(['...mllllm...', '..mooooool..', '.mokkkkkkol.', '.lokkkkkkol.', '.lokkkkkkol.', '.lokkkkkkol.', '.lokkkkkwol.', '.lokkkkwwol.', '.lokdkwwwol.', '.loddwwwwol.', '.mooooooool.', 'mllllwwllwld'], np, 6, 11),
  );
  // Risse im Pflaster
  const cp = { d: FL[0], D: mix(FL[0], INK, 0.3), l: FL[5] };
  GS.crack.push(
    stampRows(['d.......', '.Dd.....', '..lD....', '...dD.d.', '....lDd.', '......D.', '......lD'], cp, 3, 3),
    stampRows(['......d', '....dD.', '...Dl..', '.dD....', 'Dl.....', 'd......'], cp, 3, 3),
    stampRows(['..d......', '.D.......', '.lDd.....', '...lDdD..', '......lDd', '....d....', '...D.....'], cp, 4, 3),
    stampRows(['d..', 'lD.', '.d.', '.lD', '..d'], cp, 1, 2),
  );
  const rb = { h: FL[5], l: FL[4], m: FL[3], d: FL[1], s: alpha(INK, 90) };
  GS.rubble.push(
    stampRows(['.hl.', 'lmmd', '.dds'], rb), stampRows(['hl', 'md', '.s'], rb), stampRows(['.hhl..', 'hlmmd.', 'lmmmdd', '.dddss'], rb),
    stampRows(['hl..h.', 'ds.lmd', '....ds'], rb), stampRows(['.h', 'ld', '.s'], rb),
  );
  // Dornwurzeln (Gefahrenfelder)
  for (let k = 0; k < 8; k++) {
    const r = rng(6200 + k * 19), w = 28, h = 18, p = new Px(w, h);
    const a: Pt = [2 + r() * 4, 6 + r() * 8], b: Pt = [w - 3 - r() * 4, 5 + r() * 9], m: Pt = [w / 2 + (r() - 0.5) * 8, (r() < 0.5 ? 1 : h - 3) + r() * 3];
    const sh = new Px(w, h);
    tube(sh, [[a[0], a[1] + 1.6], [m[0], m[1] + 1.6], [b[0], b[1] + 1.6]], 2, 1.2, [alpha(INK, 100), alpha(INK, 100), alpha(INK, 100)], 0);
    p.draw(sh);
    const R2 = [mix(WD[0], P.violet[0], 0.4), mix(WD[1], P.pink[0], 0.25), mix(WD[2], P.red[0], 0.25), mix(WD[3], P.red[1], 0.25), WD[4]];
    const pts = tube(p, [a, m, b], 1.9, 1.1, R2, 1);
    for (let i = 3; i < pts.length - 2; i += 4) {
      const q = pts[i], up = (i >> 2) % 2 === 0, x = Math.round(q[0]), y = Math.round(q[1]);
      if (up) { p.set(x, y - 2, P.bone[3]); p.set(x, y - 3, P.red[2]); p.set(x + (i % 8 < 4 ? 1 : -1), y - 4, P.red[3]); }
      else { p.set(x, y + 2, P.bone[2]); p.set(x + (i % 8 < 4 ? 1 : -1), y + 3, P.red[2]); }
    }
    GS.thorn.push(stampOf(p, 14, 9));
  }
  // Tropfspuren/Flechten an Wandfronten
  const dp = { a: alpha(MOSS[1], 200), b: alpha(MOSS[2], 220), c: alpha(F[0], 110) };
  GS.drip.push(stampRows(['ab', 'ba', 'a.', 'b.', 'a.', 'c.', 'c.'], dp, 0, 0), stampRows(['bab', 'ab.', '.a.', '.c.', '.c.'], dp, 1, 0), stampRows(['a', 'b', 'a', 'c', 'c', 'c', '.', 'c'], dp, 0, 0));
}

// ---------------------------------------------------------------------------------------------------- Maler
interface GF { nA: Float32Array; nB: Float32Array; nC: Float32Array; nL: Float32Array; Fm: Uint8Array; geom: WallGeom; dOut: Float32Array; dWall: Float32Array; dLiq: Float32Array; ri: RoomInfo }

export function paintGruft(c: Chunk): void {
  initGruftStamps();
  const { W, H, kind, buf, map } = c, n = W * H, seed = c.seed;
  const nA = c.noise(6, 21), nB = c.noise(13, 22), nC = c.noise(3.3, 23), nL = c.noise(31, 24);
  const Fm = c.cellMask(L_F), liq = c.cellMask(L_LIQ), haz = c.cellMask(L_HAZ);
  const notF = new Uint8Array(n), notLiq = new Uint8Array(n);
  for (let i = 0; i < n; i++) { notF[i] = 1 - Fm[i]; notLiq[i] = 1 - liq[i]; }
  const geom = c.resolveWalls(Fm, 32, 6);
  const dOut = c.dist(notF), dWall = c.dist(Fm), dLiq = c.dist(notLiq);
  for (let i = 0; i < n; i++) kind[i] = Fm[i] ? (geom.fv[i] ? D_FACE : D_TOP) : liq[i] ? (dLiq[i] <= 5 ? D_RIM : D_WATER) : haz[i] ? D_HAZ : D_FLOOR;
  const f: GF = { nA, nB, nC, nL, Fm, geom, dOut, dWall, dLiq, ri: roomInfo(map) };

  for (let y = c.iy0; y < c.iy1; y++) for (let x = c.ix0; x < c.ix1; x++) {
    const i = y * W + x, wx = c.x0 + x, wy = c.y0 + y, h = rnd2(wx, wy, seed);
    let col: number;
    switch (kind[i]) {
      case D_FLOOR: col = floorCol(c, f, i, wx, wy, h); break;
      case D_HAZ: col = hazCol(c, f, i, wx, wy, h); break;
      case D_FACE: col = faceCol(c, f, i, wx, wy, h); break;
      case D_TOP: col = topCol(c, f, i, wx, wy, h); break;
      case D_RIM: col = rimCol(c, f, i, wx, wy, h); break;
      default: col = poolCol(c, f, i, wx, wy);
    }
    buf[i] = col;
  }
  floorDetails(c, f);
  // Schatten: Wandfuß, Schlagschatten nach rechts unten
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
function slabCol(c: Chunk, f: GF, i: number, wx: number, wy: number, h: number, R: number[]): number {
  // Blockspalten sind gegeneinander versetzt, damit keine durchlaufenden Querfugen entstehen
  const seed = c.seed, sx = wx + 5, bx = sx >> 5, sy = wy + 3 + (hash2(bx, 0, seed + 301) & 3) * 8, by = sy >> 5, hs = hash2(bx, by, seed + 300);
  const lay = LAYMAPS[hs % LAYMAPS.length], fx = (hs >>> 8) & 1, fy = (hs >>> 9) & 1;
  const lx = fx ? 31 - (sx & 31) : sx & 31, ly = fy ? 31 - (sy & 31) : sy & 31, o = ly * 32 + lx;
  let e = lay.edge[o];
  if (fx) e = (e & 5) | ((e & 2) << 2) | ((e & 8) >> 2);
  if (fy) e = (e & 10) | ((e & 1) << 2) | ((e & 4) >> 2);
  const sh = rnd2(hs, lay.id[o], 7), sh2 = rnd2(hs, lay.id[o], 8);
  return slabShade(f, i, e, sh, sh2, h, R);
}
/** Gemeinsame Schattierung einer Platte: Fuge unten/rechts (mit Moos), Lichtkante oben/links, Tonwert je Platte. */
function slabShade(f: GF, i: number, e: number, sh: number, sh2: number, h: number, R: number[]): number {
  const base = sh < 0.2 ? 2 : sh < 0.58 ? 3 : sh < 0.88 ? 4 : 3;
  if (e & 12) {
    const m = f.nB[i] * 0.65 + f.nC[i] * 0.35;
    return m > 0.7 ? MOSS[2] : m > 0.6 ? MOSS[1] : m > 0.55 ? MOSS[0] : R[0];
  }
  if (e & 3) {
    if (f.nB[i] * 0.65 + f.nC[i] * 0.35 > 0.72 && h < 0.5) return MOSS[1];
    return sh2 < 0.12 ? R[base] : R[base + 1];
  }
  // leichte Wölbung: abgetretene Mitte heller, selten dunkle Poren
  let t = base;
  if (h < 0.035) t--; else if (h > 0.97) t++;
  if (sh2 > 0.8 && f.nC[i] > 0.62) t--;
  return R[t];
}
function floorCol(c: Chunk, f: GF, i: number, wx: number, wy: number, h: number): number {
  const map = c.map, cx = wx >> 4, cy = wy >> 4, ci = cy * map.w + cx, seed = c.seed;
  const room = f.ri.roomOf[ci], ck = f.ri.kind[ci];
  // Erdflecken, wo das Pflaster fehlt (nicht auf Schmuckböden)
  const dirt = f.nL[i] * 0.55 + f.nB[i] * 0.3 + f.nA[i] * 0.15;
  let col: number;
  if (room) {
    const r = map.rooms![room - 1], boss = r.role === 'boss';
    const rw = (r.x1 - r.x0 + 1) * TS, rh = (r.y1 - r.y0 + 1) * TS, mx = (r.x0 * TS) + rw / 2, my = (r.y0 * TS) + rh / 2;
    const dx = wx + 0.5 - mx, dy = (wy + 0.5 - my) / 0.84, rr = Math.sqrt(dx * dx + dy * dy);
    const medal = boss || (r.role !== 'trap' && r.role !== 'puzzle' && r.role !== 'secret' && rw >= 176 && rh >= 128);
    const R = boss ? 58 : 31;
    if (medal && rr < R + 1) return medallion(f, i, dx, dy, rr, R, boss, room, h);
    if (boss) {
      // Zierband entlang der Wände, innen Rautenpflaster
      const ix = Math.min(wx - r.x0 * TS, (r.x1 + 1) * TS - 1 - wx), iy = Math.min(wy - r.y0 * TS, (r.y1 + 1) * TS - 1 - wy), inset = Math.min(ix, iy);
      if (inset >= 20 && inset <= 25) {
        if (inset === 20 || inset === 25) return FL[0];
        const along = ix < iy ? wy : wx, stud = ((along % 16) + 16) % 16;
        if (inset === 21) return MD[4];
        if (stud >= 6 && stud <= 9 && inset >= 22 && inset <= 23) return stud === 6 || inset === 22 ? MOSS[3] : MOSS[1];
        return inset === 24 ? MD[1] : MD[h < 0.2 ? 2 : 3];
      }
      if (inset > 25) {
        const u = wx + wy, v = wx - wy + 4096, uu = ((u % 22) + 22) % 22, vv = v % 22, id = hash2(Math.floor(u / 22), Math.floor(v / 22), seed + 310);
        const sh = (id & 1023) / 1023, sh2 = ((id >>> 10) & 1023) / 1023;
        const e = (uu <= 1 ? 1 : 0) | (vv <= 1 ? 2 : 0) | (uu >= 20 ? 4 : 0) | (vv >= 20 ? 8 : 0);
        col = slabShade(f, i, e === 0 ? 0 : (uu >= 20 || vv >= 20 ? 4 : 1), sh, sh2, h, FL);
        return dirt > 0.76 ? earth(c, wx, wy, h) : col;
      }
    }
    col = slabCol(c, f, i, wx, wy, h, FL);
  } else if (ck === 1 || ck === 2) {
    // Korridor: Läuferverband in Laufrichtung, die beiden mittleren Reihen heller ausgetreten
    const hz = ck === 1, a = hz ? wx : wy, b = hz ? wy : wx, cb = hz ? cy : cx;
    const first = tileAt(map, hz ? cx : cx - 1, hz ? cy - 1 : cy);
    const top = (first === WALL || first === VOID ? cb : cb - 1) * TS, rowIn = (b - top) >> 3, row = b >> 3, rb = b & 7;
    const aa = a + (hash2(row, hz ? 1 : 2, seed + 320) % 26), k = Math.floor(aa / 26), la = aa - k * 26;
    const sh = rnd2(k, row, seed + 321), sh2 = rnd2(k, row, seed + 322);
    const e = (rb === 0 ? 1 : 0) | (la === 0 ? 2 : 0) | (rb === 7 ? 4 : 0) | (la === 25 ? 8 : 0);
    col = slabShade(f, i, e, rowIn === 1 || rowIn === 2 ? 0.3 + sh * 0.6 : sh * 0.4, sh2, h, FL);
  } else if (ck === 3 || ck === 4) {
    // Schwelle am Durchgang: zwei breite Schwellensteine quer zur Laufrichtung mit eingelegter Raute
    const hz = ck === 3, a = (hz ? wx : wy) & 15, cb = hz ? cy : cx;
    const first = tileAt(map, hz ? cx : cx - 1, hz ? cy - 1 : cy);
    const b = (hz ? wy : wx) - (first === WALL || first === VOID ? cb : cb - 1) * TS;
    const la = a & 7, stone = a >> 3;
    if (la === 7 || b === 31 || b === 15) return f.nB[i] > 0.6 ? MOSS[1] : FL[0];
    if (la === 0 || b === 0 || b === 16) return MD[4];
    const bb = (b & 15) - 8, dm = Math.abs(la - 3.5) + Math.abs(bb + 0.5) * 0.55;
    if (dm < 2.2) return dm < 1.1 ? MOSS[3] : MD[1];
    col = MD[stone === 0 ? 2 : 3];
    if (h < 0.05) col = MD[1]; else if (h > 0.96) col = MD[4];
    return col;
  } else col = slabCol(c, f, i, wx, wy, h, FL);
  if (dirt > 0.755) return dirt < 0.772 ? FL[0] : earth(c, wx, wy, h);
  return col;
}
function earth(c: Chunk, wx: number, wy: number, h: number): number {
  const off = hash2(wy, 4, c.seed + 330) & 3, hd = rnd2((wx + off) >> 2, wy, c.seed + 331);
  if (h > 0.985) return FL[4];
  return hd < 0.16 ? EARTH[1] : hd > 0.88 ? EARTH[3] : h < 0.04 ? EARTH[0] : EARTH[2];
}
/** Rundes Bodenmedaillon; boss = große Dornblüten-Rosette. dx/dy relativ zur Raummitte (dy bereits perspektivisch gestreckt). */
function medallion(f: GF, i: number, dx: number, dy: number, r: number, R: number, boss: boolean, room: number, h: number): number {
  if (r >= R) return FL[0];
  const a = Math.atan2(dy, dx) + Math.PI, lit = dx + dy < 0;
  const ring = (r0: number, r1: number, segs: number, offs: number, k: number): number => {
    if (r < r0 + 1) return f.nB[i] > 0.62 ? MOSS[1] : MD[0];
    const sa = (Math.PI * 2) / segs, s = Math.floor((a + offs * sa) / sa), da = (a + offs * sa) - s * sa;
    if (Math.min(da, sa - da) * r < 0.62) return f.nB[i] > 0.6 ? MOSS[2] : MD[0];
    const hs = rnd2(s, room * 16 + k, 91);
    if (r < r0 + 2.1 && lit) return MD[5];
    if (r > r1 - 1.2 && !lit) return MD[1];
    let t = hs < 0.3 ? 2 : hs < 0.75 ? 3 : 4;
    if (h < 0.04) t--; else if (h > 0.97) t++;
    return MD[t];
  };
  if (!boss) {
    if (r < R * 0.22) {
      // Mittelstein mit eingemeißeltem Blatt
      const lf = Math.abs(dx + dy) < 1 && Math.abs(dx - dy) < R * 0.24;
      if (lf) return MD[0];
      if (Math.abs(dx - dy * 0.5) + Math.abs(dy) < R * 0.13 && dx - dy > -1) return MD[4];
      return h < 0.05 ? MD[2] : MD[3];
    }
    if (r < R * 0.58) return ring(R * 0.22, R * 0.58, 8, 0, 1);
    if (r < R * 0.9) return ring(R * 0.58, R * 0.9, 14, 0.5, 2);
    if (r < R * 0.9 + 1) return MD[0];
    return f.nB[i] > 0.58 ? MOSS[1] : lit && r < R * 0.9 + 2 ? MD[2] : MD[1];
  }
  // Bossraum: Dornblüte
  const pet = Math.pow(Math.abs(Math.cos(4 * a)), 0.75), pr = R * (0.17 + 0.4 * pet);
  if (r < R * 0.1) return r < R * 0.1 - 1.2 ? (lit ? P.gold[3] : P.gold[2]) : P.gold[0];
  if (r < pr) {
    if (r > pr - 1.2) return THORN[0];
    if (Math.abs(Math.sin(4 * a)) * r < 0.7 && r > R * 0.14) return THORN[0];
    return r > pr - 2.6 && lit ? THORN[2] : h < 0.06 ? THORN[0] : THORN[1];
  }
  if (r < R * 0.6) {
    // Feld zwischen den Blütenblättern: Dornenspitzen
    if (Math.abs(Math.cos(4 * a)) * r < 0.9 && r < R * 0.46) return r > R * 0.4 ? P.red[2] : THORN[1];
    if (r > R * 0.6 - 1) return MD[0];
    return h < 0.05 ? MD[2] : lit ? MD[4] : MD[3];
  }
  if (r < R * 0.82) return ring(R * 0.6, R * 0.82, 16, 0, 3);
  if (r < R * 0.82 + 1) return MD[0];
  // Außenring mit Knäufen
  const sa = Math.PI / 8, da = ((a + sa / 2) % sa) - sa / 2, mid = R * 0.91;
  if (Math.abs(da) * r < 2.2 && Math.abs(r - mid) < 2.2) return Math.abs(da) * r < 1.2 && Math.abs(r - mid) < 1.2 ? P.gold[3] : P.gold[1];
  return f.nB[i] > 0.6 ? MOSS[1] : lit && r < R * 0.82 + 2.2 ? MD[2] : MD[1];
}
function hazCol(c: Chunk, f: GF, i: number, wx: number, wy: number, h: number): number {
  // aufgebrochenes Pflaster: Plattenreste in dunkler Erde
  const v = f.nB[i] * 0.6 + f.nC[i] * 0.4;
  if (v > 0.54) { const col = slabCol(c, f, i, wx, wy, h, FL); return v < 0.57 ? FL[0] : mix(col, EARTH[0], 0.25); }
  const off = hash2(wy, 4, c.seed + 332) & 3, hd = rnd2((wx + off) >> 2, wy, c.seed + 333);
  return hd < 0.2 ? EARTH[0] : hd > 0.9 ? EARTH[2] : mix(EARTH[1], F[0], 0.25);
}

// ------------------------------------------------------------------ Wände
function faceCol(c: Chunk, f: GF, i: number, wx: number, wy: number, h: number): number {
  const g = f.geom, v = g.fv[i], fh = g.fh[i], top = fh - v, seed = c.seed;
  if (fh < 16) {
    // Pfeiler / dünne Mauer: glatter Schaft, links Licht, rechts Schatten, unten ein Sockel
    const lx = wx & 15;
    if (v === 1 || lx === 0 || lx === 15) return DS[0];
    if (v <= 3) return lx < 3 ? DS[5] : lx > 12 ? DS[2] : DS[v === 3 ? 4 : 3];
    if (top === 0) return DS[1];
    const flute = lx === 5 || lx === 10 ? -1 : 0;
    const t = (lx < 3 ? 5 : lx < 8 ? 4 : lx < 12 ? 3 : 2) + flute - (h < 0.05 ? 1 : 0);
    return (f.nB[i] > 0.66 && v < 6) ? MOSS[1] : DS[t];
  }
  // Decksteinreihe an der Oberkante
  if (top < 3) {
    const cj = ((wx + (hash2(wy >> 4, 2, seed + 340) % 13)) % 13 + 13) % 13;
    if (top === 0) return cj === 0 ? DS[3] : DS[5];
    if (top === 1) return cj === 0 ? DS[1] : h < 0.15 ? DS[3] : DS[4];
    return DS[0];
  }
  // Quaderlagen: 8 px hoch, Breiten unregelmäßig, jede zweite Lage versetzt
  const row = wy >> 3, ry = wy & 7;
  const xx = wx + (hash2(row, 0, seed + 341) % 15), k0 = Math.floor(xx / 15);
  let k = k0, start = k0 * 15 + (hash2(k0, row, seed + 342) % 8);
  if (xx < start) { k = k0 - 1; start = k * 15 + (hash2(k, row, seed + 342) % 8); }
  const end = (k + 1) * 15 + (hash2(k + 1, row, seed + 342) % 8), lx = xx - start, bw = end - start;
  const hb = rnd2(k, row, seed + 343), hb2 = rnd2(k, row, seed + 344);
  const damp = f.nB[i] * 0.6 + f.nC[i] * 0.4;
  let col: number;
  if (hb < 0.085) {
    // herausgefallener Quader: gepresste Erde mit Steinchen und Wurzelfasern
    const hd = rnd2(wx >> 1, wy, seed + 345);
    col = ry === 0 || lx === 0 ? EARTH[0] : hd < 0.15 ? EARTH[3] : hd > 0.9 ? DS[3] : hd > 0.6 ? EARTH[1] : EARTH[2];
    if ((wx + (hash2(k, row, 3) & 3)) % 5 === 0 && ry > 1 && hd > 0.3) col = WD[2];
  } else {
    const base = hb < 0.3 ? 2 : hb < 0.7 ? 3 : 4;
    // Moos liegt als Polster über den Quadern (Fugen und Kanten bleiben lesbar), unten und auf feuchten Steinen dichter
    const mossy = damp + (hb2 > 0.7 ? 0.1 : 0) + (1 - v / fh) * 0.08 > 0.68;
    if (ry === 7 || lx === bw - 1) col = damp > 0.6 ? MOSS[0] : DS[0];
    else if (ry === 0) col = mossy ? MOSS[3] : DS[Math.min(5, base + 1)];
    else if (lx === 0) col = mossy ? MOSS[2] : DS[base + 1 > 5 ? 5 : base + 1];
    else if (ry === 6 || (lx >= bw - 2 && ry > 3)) col = mossy ? MOSS[0] : DS[base - 1];
    else col = mossy ? (h < 0.3 ? MOSS[2] : MOSS[1]) : DS[base];
    // Risse und ausgebrochene Ecken
    if (hb2 < 0.15 && bw > 9 && ry > 0 && ry < 7 && Math.abs(lx - 2 - ry * 0.8 - (hash2(k, row, 5) % (bw - 8))) < 0.8) col = DS[0];
    if (hb2 > 0.5 && hb2 < 0.6 && lx <= 1 && ry <= 1) col = DS[0];
    if (h < 0.035 && ry !== 7 && !mossy) col = DS[base - 1]; else if (h > 0.975 && !mossy && ry !== 7) col = DS[5];
  }
  // Schatten unter den Decksteinen, feuchter grüner Fuß
  if (top === 3) col = mix(col, SHADE, 0.38);
  if (v === 1) col = mix(damp > 0.5 ? MOSS[0] : DS[0], SHADE, 0.35);
  else if (v <= 3) col = damp > 0.52 ? MOSS[v === 2 ? 1 : 2] : mix(col, SHADE, 0.3);
  else if (v <= 6 && h < 0.4) col = mix(col, SHADE, 0.16);
  if (!f.Fm[i - 1]) col = mix(col, DS[5], 0.5);
  else if (!f.Fm[i + 1]) col = mix(col, SHADE, 0.5);
  else if (!f.Fm[i + 2]) col = mix(col, SHADE, 0.25);
  return col;
}
function topCol(c: Chunk, f: GF, i: number, wx: number, wy: number, h: number): number {
  const g = f.geom, d = f.dOut[i], ts = g.ts[i], W = c.W, seed = c.seed;
  // Pfeilerkopf: helle Deckplatte mit Fase
  if (ts < 255 && g.tn[i] < 255 && ts + g.tn[i] <= 9) {
    const lx = wx & 15;
    if (lx === 0 || lx === 15) return DS[0];
    if (g.tn[i] === 1) return DS[1];
    if (g.tn[i] === 2 || lx === 1) return DS[5];
    if (ts === 1 || lx === 14) return DS[3];
    return h < 0.06 ? DS[3] : f.nB[i] > 0.7 ? MOSS[2] : DS[4];
  }
  // Oberkante der Front: helle Deckplatte
  if (ts <= 2) { const cj = ((wx + (hash2(wy >> 4, 2, seed + 340) % 13)) % 13 + 13) % 13; return cj === 0 ? DS[2] : ts === 1 ? DS[4] : DS[3]; }
  if (ts === 3) return DS[0];
  // Kanten zu Räumen: links (Lichtseite) hell, oben mittel, rechts dunkel
  if (d <= 3.01) {
    const wOpen = !f.Fm[i - 1] || !f.Fm[i - 2] || !f.Fm[i - 3], nOpen = g.tn[i] <= 3, eOpen = !f.Fm[i + 1] || !f.Fm[i + 2] || !f.Fm[i + 3];
    const along = nOpen ? wx : wy, cj = ((along + (hash2((nOpen ? wy : wx) >> 4, 3, seed + 350) % 11)) % 11 + 11) % 11;
    if (d <= 1.01) return cj === 0 ? DS[1] : wOpen ? DS[4] : nOpen ? DS[3] : eOpen ? DS[2] : DS[2];
    if (d <= 2.01) return cj === 0 ? DS[0] : wOpen ? DS[3] : nOpen ? DS[2] : DS[1];
    return DS[0];
  }
  // dunkle Mauerkrone aus großen Quadern, verliert sich im Schwarz
  const fade = d + (f.nA[i] - 0.5) * 6;
  if (fade > 19) return h > 0.994 ? TOPD[0] : VOIDG;
  if (fade > 14 && ((wx + wy) & 1)) return VOIDG;
  const row = wy >> 3, xx = wx + (row & 1) * 7, bx = ((xx % 14) + 14) % 14, by = wy & 7, hb = rnd2(Math.floor(xx / 14), row, seed + 351);
  if (by === 7 || bx === 13) return TOPD[0];
  if (by === 0 || bx === 0) return TOPD[2];
  return hb < 0.3 ? TOPD[0] : h < 0.05 ? TOPD[0] : TOPD[1];
}

// ------------------------------------------------------------------ Becken
function rimCol(c: Chunk, f: GF, i: number, wx: number, wy: number, h: number): number {
  const d = f.dLiq[i], W = c.W, seed = c.seed;
  const ny = (f.dLiq[i + W] - f.dLiq[i - W]) * 0.5, nx = (f.dLiq[i + 1] - f.dLiq[i - 1]) * 0.5;
  const horiz = Math.abs(ny) >= Math.abs(nx), along = horiz ? wx : wy;
  const seg = ((along + (hash2(horiz ? wy >> 4 : wx >> 4, 5, seed + 360) % 9)) % 9 + 9) % 9;
  // Einfassung: Randsteine 4 px breit, zur Wasserseite eine Schattenfuge
  if (d <= 1.01) return seg === 8 ? FL[0] : nx + ny > 0 ? DS[5] : DS[3];
  if (d <= 3.01) return seg === 8 ? FL[0] : f.nB[i] > 0.66 ? MOSS[2] : h < 0.1 ? DS[3] : DS[4];
  if (d <= 4.01) return seg === 8 ? FL[0] : nx + ny > 0 ? DS[2] : DS[3];
  return DS[0];
}
function poolCol(c: Chunk, f: GF, i: number, wx: number, wy: number): number {
  const d = f.dLiq[i], W = c.W, ny = (f.dLiq[i + W] - f.dLiq[i - W]) * 0.5;
  // Nordrand: Innenwand des Beckens, davor Schatten; sonst Schattenfuge und helle Wasserkante
  if (ny > 0.4) {
    if (d < 9) return rnd2(wx >> 1, wy >> 1, c.seed + 361) > 0.7 ? MOSS[0] : d < 8 ? mix(DS[1], MURK, 0.4) : mix(DS[0], INK, 0.3);
    if (d < 11) return alpha(INK, 150);
    if (d < 12 && rnd2(wx >> 1, wy, c.seed + 362) > 0.35) return alpha(mix(P.teal[4], MOSS[4], 0.5), 150);
  } else if (d < 6.5) return alpha(INK, 150);
  else if (d < 7.6 && rnd2(wx >> 1, wy >> 1, c.seed + 363) > 0.4) return alpha(mix(P.teal[4], MOSS[4], 0.5), 130);
  // trübes, grünliches Wasser, zur Mitte dunkler
  const dd = d + (f.nB[i] - 0.5) * 6;
  return alpha(MURK, dd > 15 ? 150 : dd > 10 ? 125 : 100);
}

// ------------------------------------------------------------------ Details
function floorDetails(c: Chunk, f: GF): void {
  const { W, kind, map } = c, seed = c.seed;
  c.cells((cx, cy, t) => {
    const x0 = cx * TS, y0 = cy * TS;
    seedAt(cx, cy, seed + 370);
    const rk = cx >= 0 && cy >= 0 && cx < map.w && cy < map.h ? f.ri.roomOf[cy * map.w + cx] : 0;
    const boss = rk > 0 && map.rooms![rk - 1].role === 'boss';
    for (let k = 0; k < 4; k++) {
      const wx = x0 + ri(16), wy = y0 + ri(16), r = rf(), i = (wy - c.y0) * W + (wx - c.x0);
      if (kind[i] !== D_FLOOR) continue;
      const near = f.dWall[i] < 14;
      let q = r * (boss ? 1.8 : 1);
      if ((q -= 0.05) < 0) c.blitK(GS.crack[ri(GS.crack.length)], wx, wy, A_FLOOR);
      else if ((q -= near ? 0.07 : 0.02) < 0) c.blitK(GS.rubble[ri(GS.rubble.length)], wx, wy, A_FLOOR);
      else if ((q -= near ? 0.05 : 0.01) < 0) c.blitK(ST.mossBlob[ri(ST.mossBlob.length)], wx, wy, A_FLOOR);
      else if ((q -= near ? 0.04 : 0.008) < 0) c.blitK(ST.tuft[0][ri(2)][ri(14)], wx, wy, A_FLOOR);
      else if ((q -= 0.01) < 0) c.blitK(ST.shroom[ri(ST.shroom.length)], wx, wy, A_FLOOR);
      else if ((q -= 0.012) < 0) c.blitK(ST.leaf[ri(ST.leaf.length)], wx, wy, A_FLOOR);
    }
    // einzelne Wurzel quer über den Boden
    if (t === FLOOR && rf() < (boss ? 0.012 : 0.035)) c.blitK(GS.floorRoot[ri(GS.floorRoot.length)], x0 + 8, y0 + 8, A_FLOOR);
    if (t === HAZARD) {
      c.blitK(GS.thorn[ri(GS.thorn.length)], x0 + 5 + ri(6), y0 + 4 + ri(3), A_HAZ);
      c.blitK(GS.thorn[ri(GS.thorn.length)], x0 + 5 + ri(6), y0 + 11 + ri(3), A_HAZ);
      if (rf() < 0.6) c.blitK(ST.brambleS[ri(ST.brambleS.length)], x0 + 8, y0 + 9, A_HAZ);
    }
  });
}
function wallDetails(c: Chunk, f: GF): void {
  const { W, kind, map } = c, seed = c.seed, g = f.geom;
  c.cells((cx, cy, t) => {
    if (t !== WALL) return;
    const below = tileAt(map, cx, cy + 1);
    if (below === WALL || below === VOID) return;
    const x0 = cx * TS, y0 = cy * TS, i = (y0 + 15 - c.y0) * W + (x0 + 8 - c.x0);
    if (kind[i] !== D_FACE) return;
    seedAt(cx, cy, seed + 380);
    const fh = g.fh[i], lipY = y0 + 16 - fh, r = rf();
    if (fh >= 26) {
      if (r < 0.3) c.blitK(GS.wallRoot[ri(GS.wallRoot.length)], x0 + 4 + ri(8), lipY, A_FF);
      else if (r < 0.4 && below === FLOOR) c.blitK(GS.niche[ri(GS.niche.length)], x0 + 8, y0 + 9, A_FACE);
      else if (r < 0.58) c.blitK(ST.vine[ri(ST.vine.length)], x0 + ri(16), lipY + 1, A_FACE);
    }
    for (let k = 0; k < 2; k++) {
      const wx = x0 + ri(16), r2 = rf();
      if (r2 < 0.22) c.blitK(GS.drip[ri(GS.drip.length)], wx, lipY + 3 + ri(8), A_FACE);
      else if (r2 < 0.36) c.blitK(ST.mossBlob[ri(ST.mossBlob.length)], wx, y0 + 6 + ri(9), A_FACE);
      else if (r2 < 0.55) c.blitK(ST.tuft[0][ri(2)][ri(14)], wx, y0 + 16 + ri(2), A_FF);
      else if (r2 < 0.62) c.blitK(ST.vine[ri(ST.vine.length)], wx, lipY, A_WALLS);
    }
  });
}
