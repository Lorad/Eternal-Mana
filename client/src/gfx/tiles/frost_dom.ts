/**
 * Frost-Dungeon „Gletscherdom“: eine von einer Frostzauberin gewebte Eiskathedrale.
 *   Wände   zwei Kacheln hohe Fronten aus klarem, tiefblauem Eis: eine Arkade gotischer Spitzbogennischen zwischen
 *           schlanken Diensten, dazwischen Felder aus Eisquadern mit Reiffugen; in den Nischen ist allerlei eingefroren
 *           (Laub, ein Schwert, Luftblasen …), Reifgesims mit Zapfen, Eisblumen.
 *   Boden   bereifte Zierfliesen im Flechtverband (blasse Blautöne), Schmuckfliesen mit Schneestern und Knotenmuster,
 *           Reiffelder, die die Fugen überziehen; raumbezogen (map.rooms): Schneestern-Rosette in großen Räumen,
 *           gewebtes Mandala (das „Muster“ der Zauberin) im Bossraum, Läufer in Korridoren, Schwellen.
 *   Becken  Einfassung aus geschnittenem Eis;  Gefahr: Frostdornen, die durch gesprungene Fliesen wachsen.
 */
import { INK, P, WHITE, alpha, hash2, mix, rng, rnd2 } from '../palette';
import { Px } from '../draw';
import { Chunk, FLOOR, HAZARD, SHADE, TS, VOID, WALL, allow, rf, ri, seedAt, stampOf, stampRows, tileAt, type Stamp } from './core';
import { D_FACE, D_FLOOR, D_HAZ, D_RIM, D_TOP, D_WATER, corridorAcross, dgFields, many, roomRect, type DG } from './frost_util';
import { FS, IC, SN, SNSH, initFrostStamps } from './frost_stamps';

/** Wandeis: tief und klar (0 = Fuge im Schatten … 8 = Reif) */
const BK = [mix(P.blue[0], IC[0], 0.3), mix(P.blue[1], IC[0], 0.45), mix(IC[0], P.blue[1], 0.15), mix(IC[0], IC[1], 0.4), mix(IC[0], IC[1], 0.8), mix(IC[1], IC[2], 0.45), mix(IC[1], IC[2], 0.9), IC[3], IC[4]];
/** Bodenfliesen: bereift, blass */
const FT = [mix(IC[1], SN[0], 0.5), mix(IC[2], SN[1], 0.55), mix(IC[2], SN[2], 0.5), mix(IC[3], SN[2], 0.5), mix(IC[3], SN[3], 0.6), mix(IC[4], SN[4], 0.5)];
/** Faden der Zauberin (warmes Blassgold als Akzent) */
const TH = [mix(P.gold[1], IC[0], 0.35), mix(P.gold[2], P.cream[2], 0.35), mix(P.gold[3], P.cream[3], 0.4), mix(P.gold[4], WHITE, 0.4)];
const TOPD = [mix(BK[0], INK, 0.55), mix(BK[0], INK, 0.3), BK[0]];
const VOIDG = mix(P.blue[0], INK, 0.78);
const POOL = mix(P.blue[0], P.teal[0], 0.4);

const A_FLOOR = allow(D_FLOOR, D_HAZ), A_FACE = allow(D_FACE), A_FF = allow(D_FACE, D_FLOOR, D_HAZ), A_HAZ = allow(D_HAZ, D_FLOOR);

// ---------------------------------------------------------------------------------------------------- Stempel
const GS = { frozen: [] as Stamp[], fern: [] as Stamp[], spikes: [] as Stamp[], crack: [] as Stamp[], drift: [] as Stamp[] };
/** Eisblume: verzweigter Reif, der von unten nach oben wächst (Anker = unten Mitte). */
function mkFern(seed: number): Stamp {
  const r = rng(seed), w = 9, h = 11, p = new Px(w, h), a = alpha(IC[4], 200), b = alpha(IC[3], 150);
  const grow = (x: number, y: number, dx: number, len: number, lvl: number): void => {
    for (let s = 0; s < len; s++) {
      p.set(x, y, lvl ? b : a);
      if (lvl < 2 && s > 0 && s % 2 === 0) { grow(x - 1, y - 1, -1, Math.max(1, (len - s) >> 1), lvl + 1); grow(x + 1, y - 1, 1, Math.max(1, (len - s) >> 1), lvl + 1); }
      y--; if (dx && r() < 0.75) x += dx;
    }
  };
  grow(4, h - 1, 0, 7 + ((r() * 4) | 0), 0);
  return stampOf(p, 4, h - 1);
}
/** Frostdornen: Büschel kantiger Eisnadeln (Anker = Fußpunkt). */
function mkSpikes(seed: number): Stamp {
  const r = rng(seed), w = 20, h = 17, p = new Px(w, h), n = 3 + ((r() * 3) | 0);
  for (let x = 3; x < w - 3; x++) { p.set(x, h - 1, alpha(INK, 110)); if (x > 4 && x < w - 5) p.set(x, h - 2, alpha(INK, 80)); }
  const order = many(n, (k) => ({ x: 4 + ((k + r() * 0.8) / n) * (w - 8), hgt: 5 + r() * 9 })).sort((a, b) => b.hgt - a.hgt);
  for (const s of order) {
    const hw = s.hgt > 9 ? 2 : 1, lean = (r() - 0.5) * 3, by = h - 2;
    for (let j = 0; j < s.hgt; j++) {
      const q = 1 - j / s.hgt, wv = Math.max(0, Math.round(hw * q)), cx = Math.round(s.x + lean * (j / s.hgt));
      for (let dx = -wv; dx <= wv; dx++) p.set(cx + dx, by - j, dx < 0 ? IC[4] : dx === 0 ? (wv ? IC[3] : IC[4]) : IC[1]);
      if (wv > 0) p.set(cx + wv + 1, by - j, mix(IC[0], INK, 0.3));
    }
    p.set(Math.round(s.x + lean), by - Math.round(s.hgt), WHITE);
  }
  return stampOf(p, 10, h - 2);
}
function initDomStamps(): void {
  if (GS.frozen.length) return;
  initFrostStamps();
  // Eingefrorenes: Farben ins Eisblau getaucht
  const ice = (c: number): number => mix(c, IC[1], 0.34);
  const fp = {
    o: ice(P.fire[2]), O: ice(P.red[2]), y: ice(P.gold[3]), n: ice(P.wood[1]), s: ice(P.steel[3]), S: ice(P.steel[4]), d: ice(P.steel[1]), g: ice(P.gold[2]),
    W: IC[4], w: alpha(IC[4], 170), p: ice(P.pink[3]), P: ice(P.pink[2]), G: ice(P.forest[3]), f: ice(P.forest[2]), b: ice(P.bone[3]), k: mix(BK[0], INK, 0.2),
  };
  GS.frozen.push(
    // Herbstlaub
    stampRows(['..o..', '.oyo.', 'oyOyo', '.oOo.', '..O..', '..n..'], fp, 2, 3), stampRows(['.O...', 'OyO.o', '.OnoO', '..n.o', '.n...'], fp, 2, 2),
    // Schwert, Spitze nach unten
    stampRows(['..g..', '..n..', '.ggg.', '..S..', '..Sd.', '..Sd.', '..Sd.', '..Sd.', '..Sd.', '..Sd.', '..S..', '..s..'], fp, 2, 6),
    // Luftblasen
    stampRows(['.w.', 'w.w', '.w.', '...', '..W', '...', 'w..', '...', '.W.'], fp, 1, 4), stampRows(['W..', '...', '.ww', '.w.w', '..w.', '....', 'W...'], fp, 1, 3),
    // Rose
    stampRows(['.pP.', 'pPpP', '.Pp.', '..f.', '.Gf.', '..f.', '..fG', '..f.'], fp, 2, 4),
    // Schlüssel
    stampRows(['.gg.', 'g..g', '.gg.', '..g.', '..g.', '..gg', '..g.', '..gg'], fp, 2, 4),
    // Feder
    stampRows(['...b', '..bW', '.bWb', '.bW.', 'bWb.', 'bb..', 'k...'], fp, 2, 3),
    // kleiner Vogel
    stampRows(['.kk..', 'kdddy', '.ddSd', '..dd.', '..k.k'], fp, 2, 2),
  );
  GS.fern = many(8, (k) => mkFern(8700 + k * 9));
  GS.spikes = many(8, (k) => mkSpikes(8800 + k * 9));
  const cp = { d: FT[0], D: mix(FT[0], BK[2], 0.5), l: FT[5] };
  GS.crack.push(
    stampRows(['d.......', '.Dd.....', '..lD....', '...dD.d.', '....lDd.', '......D.', '......lD'], cp, 3, 3),
    stampRows(['......d', '....dD.', '...Dl..', '.dD....', 'Dl.....', 'd......'], cp, 3, 3),
    stampRows(['..d......', '.D.......', '.lDd.....', '...lDdD..', '......lDd', '....d....', '...D.....'], cp, 4, 3),
    stampRows(['d..', 'lD.', '.d.', '.lD', '..d'], cp, 1, 2),
  );
  // Schneeverwehungen am Wandfuß
  const dp = { W: SN[4], w: SN[3], s: mix(SN[2], IC[2], 0.4), a: alpha(SNSH, 90) };
  GS.drift.push(
    stampRows(['...WWWW....', '.WWWWWWWw..', 'WWWWWWwwwss', '.ssssssaaa.'], dp, 5, 3), stampRows(['.WWW.', 'WWWws', '.saa.'], dp, 2, 2),
    stampRows(['..WWWWWW...', 'WWWWWWWWWw.', 'WWWWWwwwwss', 'wwwssssssaa', '.aaaaaaaa..'], dp, 5, 4), stampRows(['.WWWWw.', 'WWWwwss', '.aaaaa.'], dp, 3, 2),
  );
}

// ---------------------------------------------------------------------------------------------------- Maler
export function paintDom(c: Chunk): void {
  initDomStamps();
  const { W, kind, buf } = c, seed = c.seed;
  const f = dgFields(c, 420, 5);
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
  const sh = c.wallShadow(f.Fm, f.dWall, 12);
  for (let y = c.iy0; y < c.iy1; y++) for (let x = c.ix0; x < c.ix1; x++) {
    const i = y * W + x, s = sh[i];
    if (s <= 0 || kind[i] === D_WATER || kind[i] === D_RIM) continue;
    const j = s + (f.nC[i] - 0.5) * 0.2;
    c.darken(i, j > 0.7 ? 0.5 : j > 0.42 ? 0.36 : j > 0.16 ? 0.2 : 0.09, SNSH);
  }
  wallDetails(c, f);
}

// ------------------------------------------------------------------ Boden
/** Schneestern-Einlage einer Schmuckfliese (dx, dy relativ zur Fliesenmitte): 0 nichts, 1 Linie, 2 Mitte. */
function flakeMotif(dx: number, dy: number): number {
  const ax = Math.abs(dx), ay = Math.abs(dy);
  if (ax === 0 && ay === 0) return 2;
  if ((ay === 0 && ax <= 5) || (ax === 0 && ay <= 5) || (ax === ay && ax <= 3)) return 1;
  return (ax === 4 && ay === 1) || (ay === 4 && ax === 1) ? 1 : 0;
}
/** Knotenmuster („gewebter Faden“): Quadrat und Raute, an den Kreuzungen unterbrochen. */
function knotMotif(dx: number, dy: number): number {
  const ax = Math.abs(dx), ay = Math.abs(dy), sq = Math.max(ax, ay) === 4, di = ax + ay === 6;
  if (sq && di) return 0;
  if (ax === 0 && ay === 0) return 2;
  return sq || (di && ax <= 5 && ay <= 5) ? 1 : 0;
}
/** Schattierung einer Fliese: Fuge unten/rechts, Lichtkante oben/links, Reif überzieht Fugen und Fläche. */
function tileShade(f: DG, i: number, e: number, tid: number, h: number): number {
  const sh = (tid & 1023) / 1023, fr = f.nL[i] * 0.5 + f.nB[i] * 0.32 + f.nC[i] * 0.18;
  const base = sh < 0.25 ? 2 : sh < 0.7 ? 3 : 4;
  if (fr > 0.635) {
    // Reiffeld: Fugen scheinen nur noch durch
    if (e & 12) return FT[fr > 0.69 ? 4 : 2];
    if (fr < 0.655) return h < 0.5 ? FT[base] : FT[5];
    return h > 0.96 ? WHITE : h < 0.1 ? FT[4] : FT[5];
  }
  if (e & 12) return fr < 0.4 ? FT[0] : FT[1];
  if (e & 3) return FT[base + 1];
  let t = base;
  if (h < 0.04) t--; else if (h > 0.97) t++;
  return FT[t];
}
/** Flechtverband: abwechselnd zwei liegende und zwei stehende Fliesen je 16-px-Feld; jedes siebte Feld ist eine Schmuckfliese. */
function weave(c: Chunk, f: DG, i: number, wx: number, wy: number, h: number): number {
  const sx = wx + 5, sy = wy + 3, bx = sx >> 4, by = sy >> 4, lx = sx & 15, ly = sy & 15, hu = hash2(bx, by, c.seed + 300);
  let e: number, tid: number;
  if (hu % 7 === 0) {
    e = (ly === 0 ? 1 : 0) | (lx === 0 ? 2 : 0) | (ly === 15 ? 4 : 0) | (lx === 15 ? 8 : 0); tid = hu >>> 8;
    const fr = f.nL[i] * 0.5 + f.nB[i] * 0.32 + f.nC[i] * 0.18;
    if (!e && fr <= 0.63) {
      const m = (hu >>> 4) & 1 ? flakeMotif(lx - 7, ly - 7) : knotMotif(lx - 7, ly - 7);
      if (m === 2) return WHITE;
      if (m === 1) return h < 0.12 ? BK[6] : BK[5];
      // Schmuckfliesen sind eine Spur dunkler poliert, damit die Einlage steht
      if (flakeMotif(lx - 8, ly - 8) === 1 && (hu >>> 4) & 1) return FT[5];
      return FT[h < 0.05 ? 2 : 3];
    }
  } else if ((bx + by) & 1) { e = ((ly & 7) === 0 ? 1 : 0) | (lx === 0 ? 2 : 0) | ((ly & 7) === 7 ? 4 : 0) | (lx === 15 ? 8 : 0); tid = hash2(hu, ly >> 3, 3); }
  else { e = (ly === 0 ? 1 : 0) | ((lx & 7) === 0 ? 2 : 0) | (ly === 15 ? 4 : 0) | ((lx & 7) === 7 ? 8 : 0); tid = hash2(hu, lx >> 3, 3); }
  return tileShade(f, i, e, tid, h);
}
function floorCol(c: Chunk, f: DG, i: number, wx: number, wy: number, h: number): number {
  const map = c.map, cx = wx >> 4, cy = wy >> 4, ci = cy * map.w + cx, seed = c.seed;
  const room = f.ri.roomOf[ci], ck = f.ri.kind[ci];
  if (room) {
    const r = map.rooms![room - 1], boss = r.role === 'boss', q = roomRect(r);
    const dx = wx + 0.5 - q.mx, dy = (wy + 0.5 - q.my) / 0.84, rr = Math.sqrt(dx * dx + dy * dy);
    const medal = boss || (r.role !== 'trap' && r.role !== 'puzzle' && r.role !== 'secret' && q.rw >= 176 && q.rh >= 128);
    const R = boss ? 58 : 31;
    if (medal && rr < R + 1) return boss ? mandala(f, i, dx, dy, rr, R, h) : rosette(f, i, dx, dy, rr, R, h);
    if (boss) {
      // Fadenband entlang der Wände
      const ix = Math.min(wx - r.x0 * TS, (r.x1 + 1) * TS - 1 - wx), iy = Math.min(wy - r.y0 * TS, (r.y1 + 1) * TS - 1 - wy), inset = Math.min(ix, iy);
      if (inset >= 20 && inset <= 25) {
        if (inset === 20 || inset === 25) return FT[0];
        const along = ix < iy ? wy : wx, tw = (((along + (inset & 1) * 3) % 6) + 6) % 6;
        if (inset === 21 || inset === 24) return BK[5];
        return tw < 3 ? TH[inset === 22 ? 3 : 2] : TH[1];
      }
    }
    return weave(c, f, i, wx, wy, h);
  }
  if (ck === 1 || ck === 2) {
    // Korridor: Läufer aus tiefblauem Eis mit Fadenrauten, außen lange Randfliesen
    const hz = ck === 1, a = hz ? wx : wy, b = corridorAcross(map, cx, cy, wx, wy, hz);
    if (b >= 7 && b <= 24) {
      if (b === 7 || b === 24) return FT[0];
      if (b === 8 || b === 23) return FT[5];
      if (b === 9 || b === 22) return BK[4];
      const la = ((a % 16) + 16) % 16, dm = Math.abs(la - 7.5) + Math.abs(b - 15.5);
      if (dm < 1.2) return WHITE;
      if (dm > 3.4 && dm < 4.6) return TH[h < 0.2 ? 1 : 2];
      if ((b === 15 || b === 16) && dm > 5.5) return BK[5];
      const fr = f.nL[i] * 0.5 + f.nB[i] * 0.5;
      if (fr > 0.62) return h < 0.4 ? BK[7] : FT[4];
      return h < 0.05 ? BK[5] : h > 0.97 ? BK[8] : BK[6];
    }
    const row = b < 7 ? 0 : 1, aa = a + (hash2(row, hz ? 1 : 2, seed + 320) % 24), k = Math.floor(aa / 24), la = aa - k * 24, rb = b < 7 ? b : b - 25;
    const e = (rb === 0 ? 1 : 0) | (la === 0 ? 2 : 0) | (rb === 6 ? 4 : 0) | (la === 23 ? 8 : 0);
    return tileShade(f, i, e, hash2(k, row, seed + 321), h);
  }
  if (ck === 3 || ck === 4) {
    // Schwelle: helle Eisplatte mit eingelegtem Fadenwinkel
    const hz = ck === 3, a = (hz ? wx : wy) & 15, b = corridorAcross(map, cx, cy, wx, wy, hz);
    if (a === 15 || b === 31) return FT[0];
    if (a === 0 || b === 0) return WHITE;
    const bb = Math.abs(b - 15.5), ch = Math.abs(a - 7.5) + bb * 0.5;
    if (a === 1 || a === 14) return BK[5];
    if (ch > 5.2 && ch < 6.4 && a > 2 && a < 13) return TH[2];
    if (ch < 1.6) return BK[5];
    return h < 0.06 ? FT[3] : h > 0.95 ? WHITE : FT[bb < 8 ? 5 : 4];
  }
  return weave(c, f, i, wx, wy, h);
}
/** Schneestern-Rosette (große Räume). dx/dy relativ zur Raummitte (dy perspektivisch gestreckt). */
function rosette(f: DG, i: number, dx: number, dy: number, r: number, R: number, h: number): number {
  if (r >= R) return FT[0];
  if (r > R - 1.3) return WHITE;
  if (r > R - 3.2) return BK[h < 0.15 ? 4 : 5];
  if (r > R - 4.3) return FT[1];
  const sa = Math.PI / 3, a = Math.atan2(dy, dx) + Math.PI * 2 + sa / 2, da = (a % sa) - sa / 2;
  const u = r * Math.cos(da), v = Math.abs(r * Math.sin(da)), lit = dx + dy < 0;
  if (r < 2.4) return WHITE;
  if (r < 4.2) return TH[lit ? 3 : 2];
  let line = v < 1.15 && u < R * 0.8;
  for (let k = 0; k < 3 && !line; k++) {
    const p = (k === 0 ? 0.34 : k === 1 ? 0.52 : 0.68) * R, L = (k === 0 ? 0.25 : k === 1 ? 0.19 : 0.11) * R;
    const w = u - p, s = w * 0.5 + v * 0.866;
    if (Math.abs(v * 0.5 - w * 0.866) < 0.8 && s >= 0 && s <= L) line = true;
  }
  if (Math.abs(u - R * 0.2) < 0.8) line = true;
  if (Math.abs(u - R * 0.84) + v < 2.6) return Math.abs(u - R * 0.84) + v < 1.2 ? WHITE : BK[3];
  if (line) return lit ? BK[4] : BK[3];
  // polierte Scheibe: zwischen den Armen eine zarte zweite Tonstufe
  const fr = f.nB[i] * 0.6 + f.nC[i] * 0.4;
  if (fr > 0.66) return FT[5];
  return h < 0.04 ? FT[3] : Math.abs(da) > sa * 0.3 ? FT[4] : FT[lit ? 5 : 4];
}
/** Bossraum: das gewebte Mandala – zwölf verschlungene Fadenkreise auf tiefblauem Eis, geflochtener Rand, Sternauge. */
function mandala(f: DG, i: number, dx: number, dy: number, r: number, R: number, h: number): number {
  if (r >= R) return FT[0];
  const a = Math.atan2(dy, dx) + Math.PI * 2, lit = dx + dy < 0;
  if (r > R * 0.88) {
    // geflochtener Rand: zwei gegenläufig gedrehte Litzen
    if (r > R - 1.2 || r < R * 0.88 + 1.1) return TH[0];
    const t = (r - R * 0.88) / (R * 0.12), tw = ((a * 14 / Math.PI + (t > 0.5 ? 1 - t : t) * 3.2) % 2 + 2) % 2;
    if (Math.abs(t - 0.5) < 0.09) return TH[0];
    return tw < 1 ? TH[lit ? 3 : 2] : TH[1];
  }
  if (r > R * 0.88 - 1.2) return WHITE;
  if (r < R * 0.13) {
    // Sternauge
    if (r > R * 0.13 - 1.3) return TH[2];
    const fm = flakeMotif(Math.round(dx), Math.round(dy));
    return fm ? WHITE : r < 2.5 ? WHITE : BK[2];
  }
  // zwölf Fadenkreise, alle durch die Mitte
  const rc = R * 0.42;
  let on = 0, sh = false;
  for (let k = 0; k < 12; k++) {
    const ang = (k * Math.PI) / 6, ex = dx - rc * Math.cos(ang), ey = dy - rc * Math.sin(ang), dd = Math.sqrt(ex * ex + ey * ey) - rc;
    if (Math.abs(dd) < 0.85) on++;
    else if (dd > 0 && dd < 2) sh = sh || ex + ey > 0;
    else if (dd < 0 && dd > -2) sh = sh || ex + ey < 0;
  }
  if (on >= 2) return WHITE;
  if (on === 1) return TH[lit ? 3 : 2];
  // tiefes, poliertes Eis; zwischen den Fäden wechselnde Felder
  const ring = Math.floor((r / R) * 5 + a * (6 / Math.PI)) & 1;
  let t = ring ? 3 : 2;
  if (sh) t--;
  if (f.nB[i] * 0.6 + f.nC[i] * 0.4 > 0.64) t++;
  if (h > 0.985) return BK[7];
  return BK[t < 1 ? 1 : t];
}
function hazCol(c: Chunk, f: DG, i: number, wx: number, wy: number, h: number): number {
  // gesprungene Fliesen: Bruchstücke in dunklem Eisgrund
  const v = f.nB[i] * 0.6 + f.nC[i] * 0.4;
  if (v > 0.52) { const col = weave(c, f, i, wx, wy, h); return v < 0.55 ? BK[2] : mix(col, BK[5], 0.25); }
  const hd = rnd2(wx >> 1, wy, c.seed + 333);
  return hd < 0.2 ? BK[2] : hd > 0.9 ? BK[6] : h > 0.97 ? WHITE : BK[v < 0.36 ? 3 : 4];
}

// ------------------------------------------------------------------ Wände
function faceCol(c: Chunk, f: DG, i: number, wx: number, wy: number, h: number): number {
  const g = f.geom, v = g.fv[i], fh = g.fh[i], top = fh - v, seed = c.seed, lx = wx & 15;
  if (fh < 16) {
    // Eispfeiler: facettierter Schaft, links Licht, rechts Schatten
    if (v === 1 || lx === 0 || lx === 15) return BK[0];
    if (v <= 3) return lx < 3 ? BK[8] : lx > 12 ? BK[4] : BK[v === 3 ? 7 : 6];
    if (top === 0) return WHITE;
    const t = (lx < 3 ? 8 : lx < 6 ? 7 : lx < 10 ? 6 : lx < 13 ? 5 : 4) - (lx === 5 || lx === 10 ? 1 : 0);
    return h > 0.97 ? WHITE : BK[t];
  }
  // Reifgesims mit kleinen Zapfen
  if (top === 0) return WHITE;
  if (top === 1) return h < 0.2 ? BK[7] : BK[8];
  if (top === 2) return BK[3];
  const tooth = hash2(wx, 2, seed + 401) % 5;
  if (top <= 4 && tooth === 0) return top === 4 ? BK[7] : BK[8];
  if (top === 5 && tooth === 0 && hash2(wx, 3, seed + 401) & 1) return WHITE;
  const bay = hash2(wx >> 4, (wy - top + 8) >> 4, seed + 400) % 6;
  let col: number;
  if (v <= 4 && top > 20) {
    // Sockel: Sohlbank und Quaderreihe
    if (v === 4) col = BK[8];
    else if (v === 1) col = BK[1];
    else col = lx === 7 || lx === 15 ? BK[3] : lx === 0 || lx === 8 ? BK[7] : BK[v === 3 ? 6 : 5];
  } else if (bay === 0 || fh < 30) {
    // Quaderfeld: klare Blöcke, Reif in den Fugen, Kern jedes Blocks dunkler
    const row = Math.floor((top - 3) / 9), ry = (top - 3) - row * 9, jx = row & 1 ? 4 : 11;
    const bx = (lx - jx + 16) % 16, hb = rnd2((wx - jx) >> 4, row + ((wy - top) >> 4) * 7, seed + 402);
    if (ry === 8 || bx === 0) col = hb > 0.5 || h < 0.5 ? BK[7] : BK[6];
    else if (ry === 0 || bx === 1) col = BK[6];
    else if (ry === 7 || bx === 15) col = BK[3];
    else { const core = Math.min(ry, 7 - ry, bx - 1, 15 - bx); col = BK[core >= 2 ? (hb < 0.4 ? 3 : 4) : 5]; if (h > 0.975) col = BK[7]; }
  } else {
    // Spitzbogennische (gleichseitiger Bogen: Radius = lichte Weite) zwischen schlanken Diensten
    const SPR = 14, SILL = fh - 5, dx = Math.abs(lx - 7.5), q = SPR - top;
    const hw = top >= SPR ? (top <= SILL ? 5 : -9) : q <= 8 ? Math.sqrt(100 - q * q) - 5 : -9;
    if (dx < hw - 0.6) {
      // Nische: tiefes Eis, oben und links im Schatten des Gewändes
      let t = top < 10 ? 1 : top < 17 ? 2 : 3;
      if (lx - 7.5 < -(hw - 2.4)) t--;
      else if (lx - 7.5 > hw - 1.7) t++;
      const st = hash2(wx, wx >> 4, seed + 403) % 6;
      if (st === 0 && h < 0.7) t++;
      if (h > 0.985) t += 3;
      col = BK[t < 0 ? 0 : t];
    } else if (dx < hw + 0.6) col = lx < 7.5 || top < 8 ? BK[8] : BK[6];
    else if (lx >= 14 || lx <= 1) {
      // Dienst mit Kapitell am Kämpfer
      if (top === 13) col = BK[8];
      else if (top === 14) col = BK[3];
      else col = lx === 14 ? BK[8] : lx === 15 ? BK[6] : lx === 0 ? BK[5] : BK[2];
    } else {
      // Zwickel
      if (top === 13 && (lx <= 2 || lx >= 13)) col = BK[8];
      else col = top === 8 && h < 0.8 ? BK[7] : h > 0.97 ? BK[8] : h < 0.05 ? BK[4] : BK[5];
    }
  }
  // Schatten unter dem Gesims, dunkler Fuß, Enden
  if (top === 3 || (top === 4 && h < 0.4)) col = mix(col, SHADE, 0.3);
  if (v === 1) col = mix(col, SHADE, 0.3);
  if (!f.Fm[i - 1]) col = mix(col, WHITE, 0.5);
  else if (!f.Fm[i + 1]) col = mix(col, SHADE, 0.5);
  else if (!f.Fm[i + 2]) col = mix(col, SHADE, 0.25);
  return col;
}
function topCol(c: Chunk, f: DG, i: number, wx: number, wy: number, h: number): number {
  const g = f.geom, d = f.dOut[i], ts = g.ts[i], seed = c.seed;
  // Pfeilerkopf: bereifte Deckplatte
  if (ts < 255 && g.tn[i] < 255 && ts + g.tn[i] <= 9) {
    const lx = wx & 15;
    if (lx === 0 || lx === 15) return BK[0];
    if (g.tn[i] === 1) return BK[3];
    if (g.tn[i] === 2 || lx === 1) return WHITE;
    if (ts === 1 || lx === 14) return BK[6];
    return h < 0.08 ? BK[7] : h > 0.9 ? WHITE : BK[8];
  }
  // Oberkante der Front: Reifkante
  if (ts <= 2) return ts === 1 ? BK[8] : h < 0.25 ? BK[8] : WHITE;
  if (ts === 3) return BK[2];
  if (d <= 3.01) {
    const wOpen = !f.Fm[i - 1] || !f.Fm[i - 2] || !f.Fm[i - 3], nOpen = g.tn[i] <= 3, eOpen = !f.Fm[i + 1] || !f.Fm[i + 2] || !f.Fm[i + 3];
    const along = nOpen ? wx : wy, cj = ((along + (hash2((nOpen ? wy : wx) >> 4, 3, seed + 350) % 12)) % 12 + 12) % 12;
    if (d <= 1.01) return cj === 0 ? BK[3] : wOpen ? BK[8] : nOpen ? BK[7] : eOpen ? BK[4] : BK[4];
    if (d <= 2.01) return cj === 0 ? BK[2] : wOpen ? BK[7] : nOpen ? BK[5] : BK[3];
    return BK[1];
  }
  // dunkles Eismassiv, verliert sich im Blauschwarz; einzelne Lichtpunkte tief im Eis
  const fade = d + (f.nA[i] - 0.5) * 6;
  if (fade > 20) return h > 0.9988 ? BK[3] : VOIDG;
  if (fade > 15 && ((wx + wy) & 1)) return VOIDG;
  const row = wy >> 3, xx = wx + (row & 1) * 8, bx = ((xx % 16) + 16) % 16, by = wy & 7, hb = rnd2(Math.floor(xx / 16), row, seed + 351);
  if (by === 7 || bx === 15) return TOPD[0];
  if (by === 0 || bx === 0) return fade < 8 ? BK[2] : TOPD[2];
  return hb < 0.3 ? TOPD[0] : h < 0.05 ? TOPD[0] : TOPD[1];
}

// ------------------------------------------------------------------ Becken
function rimCol(c: Chunk, f: DG, i: number, wx: number, wy: number, h: number): number {
  const d = f.dLiq[i], W = c.W, seed = c.seed;
  const ny = (f.dLiq[i + W] - f.dLiq[i - W]) * 0.5, nx = (f.dLiq[i + 1] - f.dLiq[i - 1]) * 0.5;
  const horiz = Math.abs(ny) >= Math.abs(nx), along = horiz ? wx : wy;
  const seg = ((along + (hash2(horiz ? wy >> 4 : wx >> 4, 5, seed + 360) % 10)) % 10 + 10) % 10;
  // Einfassung aus geschnittenem Eis: helle Blöcke, zur Wasserseite eine Schattenfuge
  if (d <= 1.01) return seg === 9 ? BK[3] : nx + ny > 0 ? WHITE : BK[7];
  if (d <= 3.01) return seg === 9 ? BK[4] : h < 0.1 ? BK[7] : h > 0.93 ? WHITE : BK[8];
  if (d <= 4.01) return seg === 9 ? BK[3] : nx + ny > 0 ? BK[5] : BK[6];
  return BK[1];
}
function poolCol(c: Chunk, f: DG, i: number, wx: number, wy: number): number {
  const d = f.dLiq[i], W = c.W, ny = (f.dLiq[i + W] - f.dLiq[i - W]) * 0.5;
  // Nordrand: Innenwand des Beckens, davor Schatten; sonst Schattenfuge und heller Eissaum
  if (ny > 0.4) {
    if (d < 9) return d < 6 ? BK[5] : d < 8 ? (rnd2(wx >> 1, wy >> 1, c.seed + 361) > 0.75 ? BK[6] : BK[4]) : BK[2];
    if (d < 11) return alpha(INK, 150);
    if (d < 12 && rnd2(wx >> 1, wy, c.seed + 362) > 0.35) return alpha(IC[3], 160);
  } else if (d < 6.5) return alpha(INK, 140);
  else if (d < 7.6 && rnd2(wx >> 1, wy >> 1, c.seed + 363) > 0.4) return alpha(IC[3], 140);
  const dd = d + (f.nB[i] - 0.5) * 6;
  return alpha(POOL, dd > 15 ? 120 : dd > 10 ? 80 : 40);
}

// ------------------------------------------------------------------ Details
function floorDetails(c: Chunk, f: DG): void {
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
      let q = r * (boss ? 2.2 : 1);
      if ((q -= 0.035) < 0) c.blitK(GS.crack[ri(GS.crack.length)], wx, wy, A_FLOOR);
      else if ((q -= near ? 0.1 : 0.012) < 0) c.blitK(GS.drift[ri(GS.drift.length)], wx, wy, A_FLOOR);
      else if ((q -= near ? 0.05 : 0.012) < 0) c.blitK(FS.shard[ri(FS.shard.length)], wx, wy, A_FLOOR);
      else if ((q -= 0.03) < 0) c.blitK(FS.sparkle[ri(FS.sparkle.length)], wx, wy, A_FLOOR);
      else if ((q -= 0.012) < 0) c.blitK(FS.flake[ri(FS.flake.length)], wx, wy, A_FLOOR);
    }
    if (t === HAZARD) {
      c.blitK(GS.spikes[ri(GS.spikes.length)], x0 + 6 + ri(5), y0 + 8 + ri(3), A_HAZ);
      c.blitK(GS.spikes[ri(GS.spikes.length)], x0 + 7 + ri(5), y0 + 15 + ri(2), A_HAZ);
      if (rf() < 0.7) c.blitK(GS.crack[ri(GS.crack.length)], x0 + 8, y0 + 8, A_HAZ);
    }
  });
  void FLOOR;
}
function wallDetails(c: Chunk, f: DG): void {
  const { W, kind, map } = c, seed = c.seed, g = f.geom;
  c.cells((cx, cy, t) => {
    if (t !== WALL) return;
    const below = tileAt(map, cx, cy + 1);
    if (below === WALL || below === VOID) return;
    const x0 = cx * TS, y0 = cy * TS, i = (y0 + 15 - c.y0) * W + (x0 + 8 - c.x0);
    if (kind[i] !== D_FACE) return;
    seedAt(cx, cy, seed + 380);
    const fh = g.fh[i], lipY = y0 + 16 - fh, r = rf();
    if (fh >= 30) {
      const bay = hash2(cx, (lipY + 8) >> 4, seed + 400) % 6;
      if (bay !== 0) {
        // etwas Eingefrorenes schwebt in der Nische, sonst wächst eine Eisblume vom Sims
        if (r < 0.4) c.blitK(GS.frozen[ri(GS.frozen.length)], x0 + 8, lipY + 19, A_FACE);
        else if (r < 0.75) c.blitK(GS.fern[ri(GS.fern.length)], x0 + 5 + ri(6), lipY + 26, A_FACE);
      } else if (r < 0.6) c.blitK(GS.fern[ri(GS.fern.length)], x0 + 4 + ri(8), lipY + 20 + ri(6), A_FACE);
      // Zapfen am Gesims, bevorzugt vor den Diensten
      for (let k = 0; k < 2; k++) if (rf() < 0.55) c.blitK(FS.icicle[ri(FS.icicle.length)], x0 + (rf() < 0.6 ? (k ? 15 : 0) : ri(16)), lipY + 3, A_FACE);
    }
    // Schneeverwehung am Wandfuß
    if (rf() < 0.3) c.blitK(GS.drift[ri(GS.drift.length)], x0 + ri(16), y0 + 17 + ri(2), A_FF);
  });
}
