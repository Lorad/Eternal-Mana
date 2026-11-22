/**
 * Ruinen-Dungeon „Archiv der Stille“: eine Gewölbebibliothek, bewacht von einem Maschinen-Bibliothekar.
 *   Wände   zwei Kacheln hohe Fronten: zwischen Sandsteinpilastern Regalnischen voller Folianten und Schriftrollen,
 *           Messingleisten, dazwischen Runentafeln und Quaderfelder; Gesims mit Zahnschnitt, dunkler Marmorsockel.
 *   Boden   dunkler, polierter Marmor (24-px-Platten, feine Äderung, Glanzstreifen) mit Goldrauten an den Ecken,
 *           eingelegten Runenkreisen und einer Goldlinie entlang der Wände; raumbezogen (map.rooms): große
 *           Windrose/Runenscheibe in großen Räumen, konzentrische Index-Ringe mit Auge im Bossraum, abgetretene
 *           petrolfarbene Läufer in den Korridoren, Schwellen mit Messingleisten.
 *   Becken  Marmoreinfassung;  Gefahr: geborstener Boden, aus dessen Rissen arkanes Licht dringt.
 */
import { INK, P, WHITE, alpha, hash2, mix, rnd2 } from '../palette';
import { Chunk, HAZARD, SHADE, TS, VOID, WALL, allow, rf, ri, seedAt, stampRows, tileAt, voro, V, type Stamp } from './core';
import { D_FACE, D_FLOOR, D_HAZ, D_RIM, D_TOP, D_WATER, corridorAcross, dgFields, roomRect, type DG } from './frost_util';
import { ARC, BRASS, CR, GLYPHS, JADE, RS, RUNE, SA, STN, WD, initRuinStamps } from './ruinen_stamps';

/** dunkler Marmor: Fuge → Ader */
const MB = [mix(INK, P.steel[0], 0.35), mix(mix(P.steel[0], P.shadow[2], 0.35), P.teal[0], 0.15), mix(mix(P.steel[0], P.steel[1], 0.3), P.teal[0], 0.12), mix(mix(P.steel[1], P.stone[1], 0.45), P.teal[1], 0.08), mix(P.steel[1], P.steel[2], 0.4), mix(P.steel[2], P.stone[3], 0.4)];
/** Läufer in tiefem Petrol */
const CP = [mix(P.teal[0], INK, 0.25), mix(P.teal[1], P.blue[0], 0.25), mix(P.teal[1], P.teal[2], 0.4), mix(P.teal[2], P.stone[2], 0.3)];
const WDK = [mix(WD[0], INK, 0.35), WD[1], WD[2], WD[3], WD[4]];
/** Buchrücken (dunkel, mittel, hell), gedämpft */
const BOOKS: number[][] = [P.red, P.teal, P.gold, P.violet, P.forest, P.blue, P.tan, P.pink, P.stone].map((r) => [mix(r[0], WD[0], 0.25), mix(r[1], WD[1], 0.22), mix(r[2], WD[2], 0.2)]);
const TOPD = [mix(STN[0], INK, 0.55), mix(STN[0], INK, 0.32), mix(STN[0], INK, 0.1)];
const VOIDG = mix(WD[0], INK, 0.78);
const TAU = Math.PI * 2;

const A_FLOOR = allow(D_FLOOR, D_HAZ), A_FF = allow(D_FACE, D_FLOOR, D_HAZ), A_HAZ = allow(D_HAZ, D_FLOOR);

// ---------------------------------------------------------------------------------------------------- Stempel
const AS = { paper: [] as Stamp[], books: [] as Stamp[], crack: [] as Stamp[], glow: [] as Stamp[] };
function initArchivStamps(): void {
  if (AS.paper.length) return;
  initRuinStamps();
  const C = { c: CR[3], C: CR[4], d: CR[2], k: CR[1], x: alpha(INK, 100), r: BOOKS[0][2], R: BOOKS[0][1], t: BOOKS[1][2], T: BOOKS[1][1], g: BRASS[3], v: BOOKS[3][2], V: BOOKS[3][1], n: WDK[1], l: MB[5], L: MB[4], D: MB[0], a: ARC[2], A: ARC[3], b: alpha(ARC[1], 130) };
  // lose Blätter, aufgeschlagenes Buch, Schriftrolle
  AS.paper.push(
    stampRows(['.CCc', 'CkCc', 'CCkd', '.xxx'], C, 2, 2), stampRows(['Cc', 'kd', '.x'], C, 1, 1), stampRows(['cCC.', 'CkkC', '.Ccd', '..xx'], C, 2, 2), stampRows(['.kCCCk', 'kCcccd', '.xxxxx'], C, 3, 1),
    stampRows(['CCc.cCC', 'CkcnckC', 'CCcncCd', '.xxxxxx'], C, 3, 2), stampRows(['C'], C, 0, 0), stampRows(['Cc.', '.dC'], C, 1, 1),
  );
  // Bücherstapel am Wandfuß
  AS.books.push(
    stampRows(['.rrrrg.', 'RRRRRR.', 'ctttttc', 'TTTTTTx', '.xxxxxx'], C, 3, 3), stampRows(['vvvvg', 'VVVVV', '.xxxx'], C, 2, 1), stampRows(['.tgtt.', 'TTTTT.', 'rrrrrg', 'RRRRRR', 'vvvvv.', 'VVVVVx', '.xxxxx'], C, 3, 5),
    stampRows(['rR', 'rR', 'gR', 'rR', 'rR', 'xx'], C, 1, 4), stampRows(['.kCCCk.', 'kCcccdx'], C, 3, 1),
  );
  AS.crack.push(
    stampRows(['l.......', '.Dl.....', '..DD....', '...lD.l.', '....DDl.', '......D.', '......lD'], C, 3, 3), stampRows(['......l', '....lD.', '...DD..', '.lD....', 'DD.....', 'l......'], C, 3, 3),
    stampRows(['l..', 'DD.', '.l.', '.DD', '..l'], C, 1, 2), stampRows(['L..L', '.L..'], C, 1, 0), stampRows(['L'], C, 0, 0),
  );
  // arkane Lichtsplitter über den Rissen der Gefahrenfelder
  AS.glow.push(stampRows(['.b.', 'bAb', '.a.', '.b.'], C, 1, 1), stampRows(['b..', 'ab.', '.Ab', '..a'], C, 1, 1), stampRows(['.bab.', 'bAAab', '.bab.'], C, 2, 1), stampRows(['A'], C, 0, 0), stampRows(['a.', '.A', 'b.'], C, 0, 1));
}

// ---------------------------------------------------------------------------------------------------- Maler
export function paintArchiv(c: Chunk): void {
  initArchivStamps();
  const { W, kind, buf } = c, seed = c.seed;
  const f = dgFields(c, 520, 5);
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
  const sh = c.wallShadow(f.Fm, f.dWall, 11);
  for (let y = c.iy0; y < c.iy1; y++) for (let x = c.ix0; x < c.ix1; x++) {
    const i = y * W + x, s = sh[i];
    if (s <= 0 || kind[i] === D_WATER || kind[i] === D_RIM) continue;
    const j = s + (f.nC[i] - 0.5) * 0.2;
    c.darken(i, j > 0.7 ? 0.52 : j > 0.42 ? 0.36 : j > 0.16 ? 0.2 : 0.09);
  }
  wallDetails(c, f);
}

// ------------------------------------------------------------------ Boden
/** Polierter Marmor in 24-px-Platten. */
function marble(c: Chunk, f: DG, i: number, wx: number, wy: number, h: number): number {
  const sx = wx + 5, sy = wy + 3, bx = Math.floor(sx / 24), by = Math.floor(sy / 24), lx = sx - bx * 24, ly = sy - by * 24, hu = hash2(bx, by, c.seed + 610);
  // Goldraute auf jeder zweiten Fugenkreuzung
  const a = Math.abs(((lx + 13) % 24) - 12), b = Math.abs(((ly + 13) % 24) - 12);
  if (a + b <= 2 && (((lx >= 12 ? bx + 1 : bx) + (ly >= 12 ? by + 1 : by)) & 1) === 0) return a + b === 0 ? BRASS[4] : a + b === 1 ? BRASS[3] : BRASS[1];
  if (lx === 23 || ly === 23) return MB[0];
  const base = (bx + by) & 1 ? 2 : 3;
  if (hu % 13 === 0) {
    // eingelegter Runenkreis
    const dx = lx - 11, dy = ly - 11, r = Math.sqrt(dx * dx + dy * dy);
    if (Math.abs(r - 9) < 0.75) return BRASS[dx + dy < 0 ? 3 : 2];
    if (r < 9) {
      const gx = lx - 9, gy = ly - 8;
      if (gx >= 0 && gx < 5 && gy >= 0 && gy < 7 && GLYPHS[(hu >>> 8) % GLYPHS.length][gy * 5 + gx]) return h < 0.3 ? RUNE[2] : RUNE[1];
      return r > 7.6 ? MB[0] : h < 0.06 ? MB[2] : MB[1];
    }
  }
  if (lx === 0 || ly === 0) return MB[base + 1];
  // Äderung: Höhenlinien zweier Rauschfelder, je Platte versetzt
  const v1 = (f.nB[i] * 3.1 + ((hu >>> 12) & 15) / 16) % 1, v2 = (f.nL[i] * 5.3 + f.nA[i] * 0.6 + ((hu >>> 16) & 15) / 16) % 1;
  if (v1 < 0.022) return v1 < 0.008 ? MB[5] : MB[4];
  if (v2 < 0.014) return MB[base + 1];
  let t = base;
  // Politur: schräge Glanzstreifen
  const dg = lx + ly - ((hu >>> 20) % 14);
  if ((dg === 10 || dg === 11 || dg === 15) && h < 0.85) t++;
  if (h < 0.012) t--;
  return MB[t];
}
function floorCol(c: Chunk, f: DG, i: number, wx: number, wy: number, h: number): number {
  const map = c.map, cx = wx >> 4, cy = wy >> 4, ci = cy * map.w + cx, seed = c.seed;
  const room = f.ri.roomOf[ci], ck = f.ri.kind[ci];
  if (room) {
    const r = map.rooms![room - 1], boss = r.role === 'boss', q = roomRect(r);
    const dx = wx + 0.5 - q.mx, dy = (wy + 0.5 - q.my) / 0.84, rr = Math.sqrt(dx * dx + dy * dy);
    const medal = boss || (r.role !== 'trap' && r.role !== 'puzzle' && r.role !== 'secret' && q.rw >= 160 && q.rh >= 128);
    const R = boss ? 58 : 31;
    if (medal && rr < R + 1) return boss ? indexRings(dx, dy, rr, R, h) : compass(dx, dy, rr, R, h);
    // Goldlinie entlang der Wände
    const ix = Math.min(wx - r.x0 * TS, (r.x1 + 1) * TS - 1 - wx), iy = Math.min(wy - r.y0 * TS, (r.y1 + 1) * TS - 1 - wy), inset = Math.min(ix, iy);
    if (inset === 12) return h < 0.15 ? BRASS[1] : BRASS[2];
    if (inset === 13) return MB[0];
    if (boss && inset === 16) return BRASS[1];
    return marble(c, f, i, wx, wy, h);
  }
  if (ck === 1 || ck === 2) {
    // Korridor: abgetretener Läufer, links und rechts ein Marmorstreifen
    const hz = ck === 1, a = hz ? wx : wy, b = corridorAcross(map, cx, cy, wx, wy, hz);
    if (b >= 5 && b <= 26) {
      if (b === 5) return MB[4];
      if (b === 26) return mix(MB[0], INK, 0.3);
      if (b === 6 || b === 25) return CP[0];
      const worn = f.nL[i] * 0.5 + f.nB[i] * 0.5;
      if (b === 7 || b === 24) return worn > 0.58 && h < 0.6 ? CP[1] : BRASS[h < 0.25 ? 1 : 2];
      if (b === 8 || b === 23) return CP[1];
      const wv = (wx + wy) & 1;
      // fadenscheinige Stellen in der Laufspur
      if (worn > 0.6 && Math.abs(b - 15.5) < 6) return wv ? mix(CP[2], SA[2], worn > 0.66 ? 0.32 : 0.2) : mix(CP[3], SA[3], 0.2);
      const la = ((a % 12) + 12) % 12, dm = Math.abs(la - 5.5) + Math.abs(b - 15.5) * 0.8;
      if (dm < 1.6) return BRASS[2];
      if (dm > 3.3 && dm < 4.5) return CP[3];
      if (b === 10 || b === 21) return CP[3];
      return wv ? CP[2] : mix(CP[2], CP[1], 0.45);
    }
    const aa = a + (b < 5 ? 0 : 9), k = Math.floor(aa / 18), la = aa - k * 18, rb = b < 5 ? b : b - 27;
    if (la === 17 || rb === 4) return MB[0];
    if (la === 0 || rb === 0) return MB[4];
    return (f.nB[i] * 3.1 + k * 0.37) % 1 < 0.04 ? MB[5] : h < 0.04 ? MB[2] : MB[3];
  }
  if (ck === 3 || ck === 4) {
    // Schwelle: Marmorplatte mit zwei genieteten Messingleisten
    const hz = ck === 3, a = (hz ? wx : wy) & 15, b = corridorAcross(map, cx, cy, wx, wy, hz);
    if (a === 15 || b === 31) return MB[0];
    if (a === 0 || b === 0) return MB[5];
    if (a === 3 || a === 11) return (b % 6 + 6) % 6 === 2 ? BRASS[4] : BRASS[3];
    if (a === 4 || a === 12) return (b % 6 + 6) % 6 === 2 ? BRASS[2] : BRASS[1];
    if (a === 5 || a === 13) return MB[1];
    const dm = Math.abs(a - 7.5) + Math.abs(((b + 4) % 8) - 3.5);
    if (dm < 1.2) return BRASS[2];
    return h < 0.05 ? MB[3] : MB[4];
  }
  return marble(c, f, i, wx, wy, h);
}
/** Windrose mit Runenring (große Räume). dx/dy relativ zur Raummitte (dy perspektivisch gestreckt). */
function compass(dx: number, dy: number, r: number, R: number, h: number): number {
  if (r >= R) return MB[0];
  const lit = dx + dy < 0, a = Math.atan2(dy, dx) + TAU;
  if (r > R - 4) {
    if (r > R - 1.2) return BRASS[lit ? 3 : 1];
    if (r < R - 3) return BRASS[lit ? 1 : 3];
    return ((a * 32) / TAU) % 1 < 0.2 ? BRASS[0] : BRASS[2];
  }
  if (r > R - 5.2) return MB[0];
  if (r < 3.4) return r < 1.6 ? BRASS[4] : BRASS[lit ? 3 : 1];
  // Windrose: vier lange und vier kurze Strahlen, je zur Hälfte hell und dunkel
  for (let k = 0; k < 8; k++) {
    const kk = k < 4 ? k * 2 : (k - 4) * 2 + 1, ak = (kk * Math.PI) / 4, L = kk & 1 ? R * 0.4 : R * 0.64, w0 = kk & 1 ? R * 0.1 : R * 0.13;
    const u = dx * Math.cos(ak) + dy * Math.sin(ak), v = -dx * Math.sin(ak) + dy * Math.cos(ak), wv = w0 * (1 - u / L);
    if (u > 0 && u < L && Math.abs(v) < wv) return Math.abs(v) > wv - 0.9 || u > L - 1.5 ? BRASS[1] : v < 0 ? (kk & 1 ? BRASS[3] : CR[4]) : BRASS[2];
  }
  if (r > R * 0.68) {
    // Runenring: zwölf Felder mit Glyphenpunkten
    if (r < R * 0.68 + 1.1) return BRASS[2];
    const sg = (a * 12) / TAU, k = Math.floor(sg), sf = sg - k;
    if (sf < 0.05) return BRASS[1];
    const hk = hash2(k, 5, 631), gx = Math.floor((sf - 0.3) / 0.14), gy = Math.floor(r - R * 0.75);
    if (gx >= 0 && gx < 3 && gy >= 0 && gy < 3 && (hk >> (gy * 3 + gx)) & 1) return h < 0.3 ? RUNE[2] : RUNE[1];
    return k & 1 ? CP[1] : CP[0];
  }
  if (Math.abs(r - R * 0.44) < 0.7) return BRASS[1];
  return h < 0.04 ? MB[2] : r < R * 0.44 ? CP[1] : MB[1];
}
/** Bossraum: konzentrische Index-Ringe (Gradstriche, Karteifächer, Reiter) um ein mechanisches Auge. */
function indexRings(dx: number, dy: number, r: number, R: number, h: number): number {
  if (r >= R) return MB[0];
  const a = Math.atan2(dy, dx) + TAU, lit = dx + dy < 0;
  if (r > R * 0.9) {
    if (r > R - 1.3) return BRASS[lit ? 3 : 1];
    const tk = (a * 72) / TAU, long = Math.floor(tk) % 6 === 0;
    if (tk % 1 < 0.3 && (long || r > R * 0.95)) return BRASS[0];
    return BRASS[lit ? 3 : 2];
  }
  if (r > R * 0.9 - 1.3) return MB[0];
  if (r > R * 0.69) {
    // Karteiring: 24 Fächer, abwechselnd Petrol und Marmor, jedes mit einer Punktglyphe
    const sg = (a * 24) / TAU, k = Math.floor(sg), sf = sg - k;
    if (sf < 0.07) return BRASS[1];
    if (r < R * 0.69 + 1.2) return BRASS[2];
    const hk = hash2(k, 3, 620), gx = Math.floor((sf - 0.3) / 0.15), gy = Math.floor((r - R * 0.75) / 1.8);
    if (gx >= 0 && gx < 3 && gy >= 0 && gy < 3 && (hk >> (gy * 3 + gx)) & 1) return k & 1 ? BRASS[3] : h < 0.3 ? RUNE[2] : RUNE[1];
    return k & 1 ? CP[2] : MB[2];
  }
  if (r > R * 0.69 - 1.3) return MB[0];
  if (r > R * 0.44) {
    // Reiterring: zwölf Felder mit Messingbögen
    if (r < R * 0.44 + 1.2) return BRASS[lit ? 3 : 2];
    const sg = (a * 12) / TAU + 0.5, k = Math.floor(sg), sf = sg - k;
    if (sf < 0.04) return BRASS[2];
    if (Math.abs(r - R * 0.58) < 0.7 && sf > 0.2 && sf < 0.8) return BRASS[1];
    if (Math.abs(r - R * 0.63) < 1.3 && Math.abs(sf - 0.5) < 0.07) return RUNE[h < 0.3 ? 2 : 1];
    return k & 1 ? MB[1] : CP[0];
  }
  if (r > R * 0.44 - 1.3) return MB[0];
  // Auge: Lidspalt in poliertem Schwarz, Iris in Arkanblau
  const ew = R * 0.39, eh = R * 0.2, q = dx / ew, lid = eh * (1 - q * q);
  if (Math.abs(q) < 1 && Math.abs(dy) < lid) {
    if (Math.abs(dy) > lid - 1.4) return BRASS[dy < 0 ? 3 : 2];
    const ri2 = R * 0.15;
    if (r < R * 0.055) return dx < -0.5 && dx > -2.6 && dy < -0.5 && dy > -2.6 ? WHITE : MB[0];
    if (r < ri2 - 1) return Math.floor((a * 20) / TAU) & 1 ? RUNE[1] : mix(RUNE[1], P.blue[2], 0.6);
    if (r < ri2) return RUNE[0];
    if (r < ri2 + 1 && dx + dy > 0) return CR[2];
    return dy < -lid * 0.45 ? CR[2] : CR[h < 0.05 ? 3 : 4];
  }
  if (Math.abs(r - R * 0.36) < 0.7) return BRASS[1];
  return h < 0.03 ? MB[2] : MB[1];
}
function hazCol(c: Chunk, f: DG, i: number, wx: number, wy: number, h: number): number {
  // geborstener Marmor: verkippte Scherben, aus den Rissen dringt arkanes Licht
  voro(wx, wy, 9, 8, c.seed + 640);
  const hv = (V.id >>> 16) / 65536, s = V.dx + V.dy, gl = f.nB[i] * 0.55 + f.nC[i] * 0.45;
  if (V.edge < 1) return gl > 0.42 ? (V.edge < 0.5 || h < 0.3 ? ARC[3] : ARC[2]) : MB[0];
  if (V.edge < 2.2 && gl > 0.42) return mix(MB[2], ARC[1], 0.6);
  if (V.edge < 2 && s < 0) return MB[5];
  if (V.edge < 2 && s > 2) return MB[0];
  if (h > 0.985) return ARC[2];
  return MB[hv < 0.25 ? 1 : hv < 0.6 ? 2 : hv < 0.85 ? 3 : 4];
}

// ------------------------------------------------------------------ Wände
function faceCol(c: Chunk, f: DG, i: number, wx: number, wy: number, h: number): number {
  const g = f.geom, v = g.fv[i], fh = g.fh[i], top = fh - v, seed = c.seed, lx = wx & 15;
  if (fh < 16) {
    // Pfeiler: kannelierter Sandsteinschaft mit Messingreif
    if (v === 1 || lx === 0 || lx === 15) return STN[0];
    if (v <= 3) return lx < 4 ? BRASS[3] : lx > 11 ? BRASS[1] : BRASS[2];
    if (top === 0) return BRASS[3];
    const t = (lx < 3 ? 5 : lx < 7 ? 4 : lx < 11 ? 3 : 2) - (lx === 5 || lx === 10 ? 1 : 0);
    return STN[t];
  }
  // Gesims: Deckplatte, Zahnschnitt, Messingleiste
  if (top === 0) return STN[5];
  if (top === 1) return (wx & 3) < 2 ? STN[4] : STN[2];
  if (top === 2) return h < 0.15 ? BRASS[3] : BRASS[2];
  let col: number;
  if (v <= 4 && top > 20) {
    // Sockel aus dunklem Marmor, darüber eine Messingleiste
    if (v === 4) col = BRASS[h < 0.2 ? 1 : 2];
    else if (v === 1) col = MB[0];
    else col = lx === 15 || lx === 7 ? MB[1] : lx === 0 || lx === 8 ? MB[5] : MB[v === 3 ? 4 : 3];
  } else if (lx >= 14 || lx <= 1) {
    // Pilaster mit Messingkapitell
    if (top <= 5) col = lx === 14 ? BRASS[4] : lx === 1 ? BRASS[1] : top === 5 ? BRASS[1] : BRASS[3];
    else col = lx === 14 ? STN[5] : lx === 15 ? STN[4] : lx === 0 ? STN[3] : STN[1];
  } else {
    const bayId = hash2(wx >> 4, (wy - top + 8) >> 4, seed + 600), bay = fh < 30 ? 1 : bayId % 8, bx = lx - 2;
    if (bay === 0) {
      // Runentafel: Messingrahmen, dunkler Stein, glimmende Glyphe
      const gx = bx - 3, gy = top - 12, gl = GLYPHS[(bayId >>> 8) % GLYPHS.length];
      const on = (x: number, y: number): boolean => x >= 0 && x < 5 && y >= 0 && y < 7 && gl[y * 5 + x] === 1;
      if (top < 7 || top > 24 || bx < 1 || bx > 10) col = top === 6 || top === 25 ? STN[2] : h < 0.05 ? STN[2] : STN[3];
      else if (top === 7 || top === 24 || bx === 1 || bx === 10) col = top === 7 || bx === 1 ? BRASS[3] : BRASS[1];
      else if (on(gx, gy)) col = h < 0.3 ? RUNE[2] : RUNE[1];
      else if (on(gx - 1, gy) || on(gx + 1, gy) || on(gx, gy - 1) || on(gx, gy + 1)) col = mix(MB[1], RUNE[0], 0.6);
      else col = top === 8 || bx === 2 ? MB[0] : MB[h < 0.05 ? 2 : 1];
    } else if (bay === 1) {
      // Quaderfeld
      const row = top >> 3, ry = top & 7, xx = bx + (row & 1) * 6, hb = rnd2((wx - lx) + (xx >= 12 ? 1 : 0), row, seed + 601);
      const jx = xx % 12;
      if (ry === 7 || jx === 11) col = STN[0];
      else if (ry === 0 || jx === 0) col = STN[4];
      else col = STN[hb < 0.4 ? 2 : 3];
      if (h < 0.04 && ry !== 7) col = STN[1];
    } else {
      // Bücherregal: Rahmen, drei Fächer (Böden bei 12, 20 und 27)
      if (bx === 0) col = WDK[1];
      else if (bx === 11) col = WDK[3];
      else if (top === 4) col = WDK[3];
      else if (top === 12 || top === 20 || top === 27) col = bx === 1 ? WDK[2] : (wx + top) % 7 === 0 ? WDK[3] : WDK[4];
      else {
        const k = top < 12 ? 0 : top < 20 ? 1 : 2, yb = (k === 0 ? 11 : k === 1 ? 19 : 26) - top, hs = hash2(bayId, k, 78);
        if (top === 5 || top === 13 || top === 21) col = WDK[0];
        else if (hs % 5 === 0) {
          // Schriftrollen, quer gestapelt
          const pile = 2 + ((hs >>> 4) % 3), sx = (bx - 1 + yb * 2 + (hs >>> 8)) % 5;
          col = yb >= pile ? WDK[0] : sx === 4 ? WDK[1] : sx === 1 && (hs >>> 12) & 1 ? BOOKS[0][2] : yb & 1 ? CR[2] : CR[3];
        } else {
          const sh0 = (hs >>> 6) & 1, slot = (bx - 1 + sh0) >> 1, par = (bx - 1 + sh0) & 1, hb = hash2(bayId, k * 8 + slot, 77);
          const hgt = 3 + (hb % 3) + (k < 2 && (hb >>> 3) % 3 === 0 ? 1 : 0), bk = BOOKS[(hb >>> 8) % BOOKS.length];
          if (hb % 11 === 0 || yb >= hgt) col = hb % 11 === 0 && yb === 0 && par ? CR[2] : WDK[0];
          else if (yb === hgt - 1) col = par ? bk[1] : bk[2];
          else if (yb === 1 && (hb >>> 12) & 1) col = par ? BRASS[1] : BRASS[3];
          else col = par ? bk[0] : bk[1];
        }
      }
    }
  }
  // Schatten unter dem Gesims, Enden
  if (top === 3) col = mix(col, SHADE, 0.45); else if (top === 4 && h < 0.5) col = mix(col, SHADE, 0.25);
  if (v === 1) col = mix(col, SHADE, 0.3);
  if (!f.Fm[i - 1]) col = mix(col, STN[5], 0.5);
  else if (!f.Fm[i + 1]) col = mix(col, SHADE, 0.5);
  else if (!f.Fm[i + 2]) col = mix(col, SHADE, 0.25);
  return col;
}
function topCol(c: Chunk, f: DG, i: number, wx: number, wy: number, h: number): number {
  const g = f.geom, d = f.dOut[i], ts = g.ts[i], seed = c.seed;
  // Pfeilerkopf: Sandsteinplatte mit Messingkante
  if (ts < 255 && g.tn[i] < 255 && ts + g.tn[i] <= 9) {
    const lx = wx & 15;
    if (lx === 0 || lx === 15) return STN[0];
    if (g.tn[i] === 1) return STN[1];
    if (g.tn[i] === 2 || lx === 1) return STN[5];
    if (ts === 1 || lx === 14) return BRASS[2];
    return h < 0.06 ? STN[3] : STN[4];
  }
  if (ts <= 2) { const cj = (((wx + (hash2(wy >> 4, 2, seed + 650) % 13)) % 13) + 13) % 13; return cj === 0 ? STN[2] : ts === 1 ? STN[4] : STN[5]; }
  if (ts === 3) return STN[0];
  if (d <= 3.01) {
    const wOpen = !f.Fm[i - 1] || !f.Fm[i - 2] || !f.Fm[i - 3], nOpen = g.tn[i] <= 3, eOpen = !f.Fm[i + 1] || !f.Fm[i + 2] || !f.Fm[i + 3];
    const along = nOpen ? wx : wy, cj = (((along + (hash2((nOpen ? wy : wx) >> 4, 3, seed + 651) % 11)) % 11) + 11) % 11;
    if (d <= 1.01) return cj === 0 ? STN[1] : wOpen ? STN[4] : nOpen ? STN[3] : eOpen ? STN[2] : STN[2];
    if (d <= 2.01) return cj === 0 ? STN[0] : wOpen ? STN[3] : nOpen ? STN[2] : STN[1];
    return STN[0];
  }
  // dunkle Mauerkrone, verliert sich im Sepiaschwarz
  const fade = d + (f.nA[i] - 0.5) * 6;
  if (fade > 19) return h > 0.994 ? TOPD[0] : VOIDG;
  if (fade > 14 && ((wx + wy) & 1)) return VOIDG;
  const row = wy >> 3, xx = wx + (row & 1) * 7, bx = ((xx % 14) + 14) % 14, by = wy & 7, hb = rnd2(Math.floor(xx / 14), row, seed + 652);
  if (by === 7 || bx === 13) return TOPD[0];
  if (by === 0 || bx === 0) return TOPD[2];
  return hb < 0.3 ? TOPD[0] : h < 0.05 ? TOPD[0] : TOPD[1];
}

// ------------------------------------------------------------------ Becken
function rimCol(c: Chunk, f: DG, i: number, wx: number, wy: number, h: number): number {
  const d = f.dLiq[i], W = c.W, seed = c.seed;
  const ny = (f.dLiq[i + W] - f.dLiq[i - W]) * 0.5, nx = (f.dLiq[i + 1] - f.dLiq[i - 1]) * 0.5;
  const horiz = Math.abs(ny) >= Math.abs(nx), along = horiz ? wx : wy;
  const seg = (((along + (hash2(horiz ? wy >> 4 : wx >> 4, 5, seed + 660) % 11)) % 11) + 11) % 11;
  // Einfassung aus hellem Marmor mit Messingfuge zur Wasserseite
  if (d <= 1.01) return seg === 10 ? CR[1] : nx + ny > 0 ? CR[4] : CR[2];
  if (d <= 3.01) return seg === 10 ? CR[1] : (f.nB[i] * 4 + f.nC[i]) % 1 < 0.06 ? CR[2] : h < 0.06 ? CR[2] : CR[3];
  if (d <= 4.01) return seg === 10 ? CR[0] : BRASS[nx + ny > 0 ? 1 : 3];
  return MB[0];
}
function poolCol(c: Chunk, f: DG, i: number, wx: number, wy: number): number {
  const d = f.dLiq[i], W = c.W, ny = (f.dLiq[i + W] - f.dLiq[i - W]) * 0.5;
  if (ny > 0.4) {
    if (d < 9) return d < 8 ? (rnd2(wx >> 2, wy >> 1, c.seed + 661) > 0.75 ? mix(CR[1], JADE, 0.5) : mix(CR[2], JADE, 0.4)) : mix(CR[0], INK, 0.3);
    if (d < 11) return alpha(INK, 150);
    if (d < 12 && rnd2(wx >> 1, wy, c.seed + 662) > 0.35) return alpha(mix(P.teal[4], SA[4], 0.5), 140);
  } else if (d < 6.5) return alpha(INK, 145);
  else if (d < 7.6 && rnd2(wx >> 1, wy >> 1, c.seed + 663) > 0.4) return alpha(mix(P.teal[4], SA[4], 0.5), 120);
  const dd = d + (f.nB[i] - 0.5) * 6;
  return alpha(JADE, dd > 15 ? 120 : dd > 10 ? 80 : 40);
}

// ------------------------------------------------------------------ Details
function floorDetails(c: Chunk, f: DG): void {
  const { W, kind, map } = c, seed = c.seed;
  c.cells((cx, cy, t) => {
    const x0 = cx * TS, y0 = cy * TS;
    seedAt(cx, cy, seed + 670);
    const rk = cx >= 0 && cy >= 0 && cx < map.w && cy < map.h ? f.ri.roomOf[cy * map.w + cx] : 0;
    const boss = rk > 0 && map.rooms![rk - 1].role === 'boss';
    for (let k = 0; k < 4; k++) {
      const wx = x0 + ri(16), wy = y0 + ri(16), r = rf(), i = (wy - c.y0) * W + (wx - c.x0);
      if (kind[i] !== D_FLOOR) continue;
      const near = f.dWall[i] < 14;
      let q = r * (boss ? 2 : 1);
      if ((q -= 0.035) < 0) c.blitK(AS.crack[ri(AS.crack.length)], wx, wy, A_FLOOR);
      else if ((q -= near ? 0.06 : 0.015) < 0) c.blitK(AS.paper[ri(AS.paper.length)], wx, wy, A_FLOOR);
      else if ((q -= near ? 0.02 : 0) < 0) c.blitK(RS.rubble[ri(6)], wx, wy, A_FLOOR);
    }
    if (t === HAZARD) for (let k = 0; k < 3; k++) c.blitK(AS.glow[ri(AS.glow.length)], x0 + ri(16), y0 + ri(16), A_HAZ);
  });
}
function wallDetails(c: Chunk, f: DG): void {
  const { W, kind, map } = c, seed = c.seed;
  c.cells((cx, cy, t) => {
    if (t !== WALL) return;
    const below = tileAt(map, cx, cy + 1);
    if (below === WALL || below === VOID) return;
    const x0 = cx * TS, y0 = cy * TS, i = (y0 + 15 - c.y0) * W + (x0 + 8 - c.x0);
    if (kind[i] !== D_FACE) return;
    seedAt(cx, cy, seed + 680);
    const r = rf();
    // Bücherstapel und lose Blätter am Wandfuß
    if (r < 0.16) c.blitK(AS.books[ri(AS.books.length)], x0 + 3 + ri(10), y0 + 18 + ri(2), A_FF);
    else if (r < 0.3) c.blitK(AS.paper[ri(AS.paper.length)], x0 + ri(16), y0 + 18 + ri(3), A_FF);
  });
}
