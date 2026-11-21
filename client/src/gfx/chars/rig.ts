/**
 * Figuren-Rig v2 (32x40): Köpfe/Rümpfe als handgesetzte Pixelkarten, Gliedmaßen über Posen (Hände, Füße, Neigung).
 * Jede Ebene wird mit weicher Innenkontur aufgelegt, zum Schluss bekommt die Silhouette eine getönte Außenkontur.
 */
import { Px } from '../draw';
import type { Pt } from '../draw';
import { P, INK, INK2, WHITE, alpha, darker, mix, outlineOf } from '../palette';
import type { Ramp } from '../palette';
import { CHAR_FRAME_H, CHAR_FRAME_W } from '../spec';

export const FW = CHAR_FRAME_W, FH = CHAR_FRAME_H, CX = 16, FOOT = 35;
export type Dir = 0 | 1 | 2;
export type Face = 'n' | 'blink' | 'hurt';
export type Legend = Record<string, number>;
export type V2 = [number, number];
export type V3 = [number, number, number];

// ---------------------------------------------------------------- Pixelkarten
export interface Art { rows: string[]; w: number; ay: number }
/** Pixelkarte; `below` = Zeilen unterhalb der Ankerzeile (Kinn bzw. Hüfte). */
export function art(rows: string[], below = 0): Art {
  const w = rows[0].length;
  for (const r of rows) if (r.length !== w) throw new Error(`Art-Zeile ${r.length} statt ${w}: "${r}"`);
  if (w % 2) throw new Error(`Art-Breite ungerade: "${rows[0]}"`);
  return { rows, w, ay: rows.length - 1 - below };
}
/** Kopf-Overlay: `up` = Zeilen oberhalb der Schädeloberkante; die Kinnzeile ist Zeile up+9. */
export function head(rows: string[], up = 0): Art { return art(rows, rows.length - 1 - (up + 9)); }

const SLOTS = ['aAbB', 'cCdD', 'eEfF', 'gGhH', 'iIjJ', 'lLnN', 'pPqQ'];
const r4 = (r: Ramp): Ramp => (r.length > 4 ? r.slice(1, 5) : r);
export const lo = (r: Ramp): Ramp => r.slice(0, 4);
export const mixR = (a: Ramp, b: Ramp, t: number): Ramp => a.map((c, i) => mix(c, b[Math.min(i, b.length - 1)], t));
export const EYE = mix(P.violet[0], INK, 0.35);
/**
 * Legende: Haut sStT, Haar uUvV, Slots aAbB cCdD eEfF gGhH iIjJ lLnN pPqQ (je dunkel → hell),
 * Augen X/x (dunkel) o (Glanz), m Mund, r Wangenrot, W Weiß, k Tinte.
 */
export function legend(skin: Ramp, hair: Ramp, slots: Ramp[], extra: Legend = {}): Legend {
  const g: Legend = { W: WHITE, k: INK2, x: EYE, X: EYE, o: WHITE };
  const put = (keys: string, r: Ramp) => { const q = r4(r); for (let i = 0; i < 4; i++) g[keys[i]] = q[i]; };
  put('sStT', skin); put('uUvV', hair);
  slots.forEach((r, i) => put(SLOTS[i], r));
  g.r = mix(g.t, P.red[3], 0.42); g.m = g.t; g.M = mix(skin[0], P.red[0], 0.5);
  return { ...g, ...extra };
}

export interface StampOpt { face?: Face; shear?: (dy: number) => number; skip?: number }
export function stamp(l: Px, a: Art, cx: number, y: number, lg: Legend, o: StampOpt = {}): void {
  for (let r = 0; r < a.rows.length; r++) {
    const row = a.rows[r], dy0 = r - a.ay, sk = o.skip ?? 0;
    if (dy0 > 0 && dy0 <= sk) continue;
    const dy = dy0 > sk ? dy0 - sk : dy0, x0 = cx - a.w / 2 + (o.shear ? o.shear(dy0) : 0);
    for (let i = 0; i < a.w; i++) {
      let ch = row[i];
      if (ch === '.') continue;
      if (ch === ' ') { l.set(x0 + i, y + dy, 0); continue; }
      if (o.face && o.face !== 'n') {
        if (ch === 'X' || ch === 'o') ch = 'S';
        else if (ch === 'm' && o.face === 'hurt') ch = 'M';
      }
      const c = lg[ch];
      if (c === undefined) throw new Error(`Art-Zeichen "${ch}" unbekannt in "${row}"`);
      l.set(x0 + i, y + dy, c);
    }
  }
}

// ---------------------------------------------------------------- Ebenen / Konturen
const op = (c: number): boolean => c >>> 24 >= 128;
const SEP = new Map<number, number>();
function sepCol(n: number): number {
  let c = SEP.get(n);
  if (c === undefined) { c = mix(darker(darker(n)), INK, 0.3); SEP.set(n, c); }
  return c;
}
/** Legt l über dst; wo l an bereits Gezeichnetes grenzt, entsteht eine weiche Trennlinie. */
export function over(dst: Px, l: Px, sep = true): void {
  const { w, h, d } = l;
  if (sep) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (op(d[i]) || !op(dst.d[i])) continue;
      const n = y + 1 < h && op(d[i + w]) ? d[i + w] : x + 1 < w && op(d[i + 1]) ? d[i + 1] : x > 0 && op(d[i - 1]) ? d[i - 1] : y > 0 && op(d[i - w]) ? d[i - w] : 0;
      if (n) dst.d[i] = sepCol(n);
    }
  }
  for (let i = 0; i < d.length; i++) if (d[i] >>> 24) dst.d[i] = d[i];
}
const EDGE = new Map<number, number>();
function edgeCol(n: number): number {
  let c = EDGE.get(n);
  if (c === undefined) { const o = outlineOf(n); c = o === INK ? mix(n, INK, 0.8) : o; EDGE.set(n, c); }
  return c;
}
/** Getönte 1px-Außenkontur (4er-Nachbarschaft). */
export function outlineAll(p: Px): void {
  const { w, h, d } = p, src = d.slice();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (op(src[i])) continue;
    const n = y + 1 < h && op(src[i + w]) ? src[i + w] : x + 1 < w && op(src[i + 1]) ? src[i + 1] : x > 0 && op(src[i - 1]) ? src[i - 1] : y > 0 && op(src[i - w]) ? src[i - w] : 0;
    if (n) d[i] = edgeCol(n);
  }
}

// ---------------------------------------------------------------- Linien / Gliedmaßen
export function linePts(x0: number, y0: number, x1: number, y1: number): V2[] {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const out: V2[] = [], dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx + dy;
  for (let n = 0; n < 200; n++) {
    out.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
  return out;
}
/** Dicke Linie (w×w-Stempel): linke Spalte hell (c[0]), Rest mittel (c[1]), ab w=3 rechte Spalte dunkel (c[2]). */
export function seg(l: Px, x0: number, y0: number, x1: number, y1: number, w: number, c: ReadonlyArray<number>): void {
  const pts = linePts(x0, y0, x1, y1);
  for (const [x, y] of pts) l.rect(x, y, w, w, c[1]);
  if (w >= 3 && c.length > 2) for (const [x, y] of pts) l.rect(x + w - 1, y, 1, w, c[2]);
  for (const [x, y] of pts) l.rect(x, y, 1, w > 2 ? w : 1, c[0]);
}
/** Gelenk (Ellbogen/Knie) für zwei Segmente der Gesamtlänge len; pref = bevorzugte Ausweichrichtung. */
export function joint(s: Pt, h: Pt, len: number, pref: V2): V2 {
  const dx = h[0] - s[0], dy = h[1] - s[1], d = Math.hypot(dx, dy), mx = (s[0] + h[0]) / 2, my = (s[1] + h[1]) / 2;
  if (d >= len - 0.5 || d < 0.01) return [Math.round(mx), Math.round(my)];
  const k = Math.sqrt((len / 2) ** 2 - (d / 2) ** 2), px = -dy / d, py = dx / d;
  const sgn = px * pref[0] + py * pref[1] >= 0 ? 1 : -1;
  return [Math.round(mx + px * k * sgn), Math.round(my + py * k * sgn)];
}

export interface ArmCols { up: V2; low: V2; hand: V2; w?: number }
export interface LegCols { c: V3; boot: V3; bootH?: number; robe?: boolean; none?: boolean; cuff?: number }
const dk2 = (c: ReadonlyArray<number>): number[] => c.map((v) => darker(v));

export function drawArm(l: Px, s: Pt, h: Pt, len: number, pref: V2, a: ArmCols, far = false): void {
  const e = joint(s, h, len, pref);
  const up = far ? dk2(a.up) : a.up, low = far ? dk2(a.low) : a.low, hand = far ? dk2(a.hand) : a.hand;
  const w = a.w ?? 2;
  seg(l, s[0], s[1], e[0], e[1], w, [up[0], up[1], up[1]]);
  seg(l, e[0], e[1], h[0], h[1], w, [low[0], low[1], low[1]]);
  l.rect(h[0], h[1], 2, 2, hand[1]); l.set(h[0], h[1], hand[0]);
}

// ---------------------------------------------------------------- Pose
export interface Pose {
  x: number; y: number; lean: number; hx: number; hy: number; face: Face;
  /** Hände relativ zur jeweiligen Schulter (Bildschirmkoordinaten) */
  mh: V2; oh: V2;
  /** Waffenwinkel in Grad (0 = rechts, 90 = unten, -90 = oben) */
  wa: number; wa2: number;
  /** Füße: [x-Versatz, Anheben, vor(+1)/zurück(-1)] – a = Bein der Waffenhand bzw. kameranahes Bein */
  fa: V3; fb: V3;
  /** Nebenhand greift die Hauptwaffe im Abstand `two` entlang der Achse */
  two: number | null;
  /** Ebene der Waffe / des Nebenhand-Gegenstands: 1 = vor dem Körper, 0 = dahinter; null = je Blickrichtung */
  wz: 0 | 1 | null; oz: 0 | 1 | null;
  /** Nachschwingen: sw = Pendel (-2..2), tr = Fahrtwind (0..3), up = Auftrieb (0..2) */
  sw: number; tr: number; up: number;
  bow: number; arrow: boolean; glint: number; flare: number; kneel: boolean;
  /** frei für klassenspezifische Schalter: two, wtop, oglint, lie, grip … */
  tag: string;
  /** abweichende Zeichenrichtung (Drehungen) und Spiegelung */
  rdir: Dir | null; flip: boolean;
  label: string;
}
export const mkPose = (o: Partial<Pose> = {}): Pose => ({
  x: 0, y: 0, lean: 0, hx: 0, hy: 0, face: 'n', mh: [0, 6], oh: [0, 6], wa: 90, wa2: 90, fa: [0, 0, 0], fb: [0, 0, 0],
  two: null, wz: null, oz: null, sw: 0, tr: 0, up: 0, bow: 0, arrow: false, glint: 0, flare: 0, kneel: false, tag: '', rdir: null, flip: false, label: '', ...o,
});

// ---------------------------------------------------------------- Kostüm
export interface Build { leg: number; torso: number; shX: number; shY: number; arm: number; legX: number; legW: number; headFwd: number; neck: number; sideLeg: number }
export const BUILD: Build = { leg: 7, torso: 9, shX: 6, shY: 1, arm: 7, legX: 4, legW: 3, headFwd: 0, neck: 0, sideLeg: 0 };

export interface K {
  c: Costume; dir: Dir; ps: Pose; lg: Legend; B: Build;
  cx: number; hipY: number; topX: number; shTop: number; neckY: number; headX: number;
  ms: V2; os: V2; mh: V2; oh: V2;
  /** Waffenspitze (von der Waffenfunktion gesetzt) für Glanzlichter */
  tip: V2 | null;
}
export type LayerFn = (fn: (l: Px) => void, sep?: boolean) => void;
export type Hook = (k: K, L: LayerFn) => void;
export type ItemFn = (l: Px, k: K, hx: number, hy: number, ang: number) => void;

export interface Costume {
  key: string; lg: Legend; B: Build;
  /** Kopf: Overlay über dem Standardgesicht (Front/Seite) bzw. vollständige Rückansicht */
  head: [Art, Art, Art];
  /** true = Kopfkarten sind vollständig (kein Standardgesicht darunter) */
  fullHead?: boolean;
  torso: [Art, Art, Art];
  arm: ArmCols; leg: LegCols;
  stoop?: number;
  weapon?: ItemFn; off?: ItemFn;
  pauldron?: (l: Px, k: K, s: V2, far: boolean, side: number) => void;
  under?: Hook; mid?: Hook; top?: Hook;
  /** nach der Kontur: Leuchten, Transparenz */
  post?: (p: Px, k: K) => void;
  carry: (dir: Dir) => Partial<Pose>;
  /** Waffe steht am Boden: die Waffenhand macht das Auf und Ab des Körpers nicht mit */
  plant?: boolean;
  anim?: (anim: string, dir: Dir, f: number) => Partial<Pose> | null;
  /** Armschwung beim Gehen [Waffenhand, Nebenhand] 0..1 */
  swing?: V2;
  reach?: 'm' | 'o';
  npc?: boolean;
  /** Geisterwesen: Tod = Verblassen statt Hinfallen */
  fade?: boolean;
}

const FRONT_BASE = art([
  '...tTTttttS...',
  '..tTTtttttSS..',
  '.tTTtttttttSS.',
  '.tTttttttttSS.',
  '.tttttttttttS.',
  '.ttoXttttoXtS.',
  '.ttxxttttxxSS.',
  '.ttrttttttrSS.',
  '..StttmmttSs..',
  '...SSttttSs...',
]);
const SIDE_BASE = art([
  '...tTTttttt...',
  '..tTTttttttt..',
  '.tTttttttttTt.',
  '.tttttttttttT.',
  '.tttttttttttt.',
  '.ttttSSttoXtt.',
  '.ttttSsttxxttt',
  '.SttttttttrtS.',
  '..SSttttttmS..',
  '...sSSSttSS...',
]);

function legFront(l: Px, k: K, side: number, f: V3): void {
  const { B, c } = k, q = c.leg;
  if (q.none) return;
  const x0 = (side < 0 ? k.cx - B.legX : k.cx + B.legX - B.legW) + f[0];
  const top = k.hipY + 1, bot = FOOT - f[1];
  if (k.ps.kneel) {
    for (let y = top; y <= FOOT; y++) for (let i = 0; i < B.legW; i++) l.set(x0 + i + side, y, i === 0 ? q.c[0] : i === B.legW - 1 ? q.c[2] : q.c[1]);
    l.rect(x0 + side, FOOT, B.legW, 1, q.c[2]);
    l.rect(x0 + side * 2 + (side > 0 ? 1 : 0), FOOT - 1, 2, 2, q.boot[2]);
    return;
  }
  const bh = q.robe ? 2 : (q.bootH ?? 3) + (f[2] > 0 ? 1 : f[2] < 0 ? -1 : 0);
  const by = Math.max(top, bot - bh + 1), back = f[2] < 0;
  const lc = back ? [q.c[1], q.c[2], q.c[2]] : q.c, bc = back ? [q.boot[1], q.boot[2], q.boot[2]] : q.boot;
  if (!q.robe) for (let y = top; y < by; y++) for (let i = 0; i < B.legW; i++) l.set(x0 + i, y, i === 0 ? lc[0] : i === B.legW - 1 ? lc[2] : lc[1]);
  for (let y = by; y <= bot; y++) for (let i = 0; i < B.legW; i++) l.set(x0 + i, y, i === 0 ? bc[0] : i === B.legW - 1 ? bc[2] : bc[1]);
  if (!q.robe && q.cuff !== undefined && by > top) l.rect(x0, by, B.legW, 1, q.cuff);
  // Sohle steht nach außen über, vorderer Fuß zeigt die Kappe
  l.set(side < 0 ? x0 - 1 : x0 + B.legW, bot, bc[side < 0 ? 1 : 2]);
  if (f[2] > 0) { l.set(side < 0 ? x0 - 1 : x0 + B.legW, bot - 1, bc[side < 0 ? 1 : 2]); l.rect(x0, bot - 1, 2, 1, bc[0]); }
  l.rect(x0 + (side < 0 ? 0 : 1), bot, B.legW - 1, 1, bc[2]);
}

function legSide(l: Px, k: K, f: V3, far: boolean): void {
  const { B, c } = k, q = c.leg;
  if (q.none) return;
  const lc = far ? dk2(q.c) : q.c, bc = far ? dk2(q.boot) : q.boot;
  const hx = k.cx - 2 + B.sideLeg, hy = k.hipY;
  if (k.ps.kneel) {
    const kx = hx + 3 + (far ? -2 : 0), ky = FOOT - 2;
    if (!q.robe) { seg(l, hx, hy, kx, ky, 3, lc); seg(l, kx, ky, kx - 5, ky, 3, lc); }
    l.rect(kx - 8, FOOT - 2, 4, 3, bc[1]); l.rect(kx - 8, FOOT - 2, 4, 1, bc[0]); l.set(kx - 9, FOOT, bc[2]);
    return;
  }
  const fx = hx + (q.robe ? Math.round(f[0] * 0.6) : f[0]), bot = FOOT - (q.robe ? Math.min(1, f[1]) : f[1]);
  const ax = fx, ay = bot - 3;
  if (!q.robe) {
    const kn = joint([hx, hy], [ax, ay], B.leg - 1.5, [1, -0.3]);
    seg(l, hx, hy, kn[0], kn[1], 3, lc);
    seg(l, kn[0], kn[1], ax, ay, 3, lc);
  }
  // Stiefel: Schaft + Spitze nach vorn; angehoben und hinten = Spitze hängt
  const tilt = f[1] > 1 && f[0] <= 0;
  const bh = q.robe ? 2 : (q.bootH ?? 3);
  if (tilt) {
    l.rect(ax, bot - bh, 3, bh, bc[1]); l.rect(ax, bot - bh, 1, bh, bc[0]);
    l.rect(ax + 1, bot, 2, 2, bc[1]); l.set(ax + 2, bot + 1, bc[2]); l.set(ax, bot, bc[2]);
  } else {
    l.rect(ax, bot - bh + 1, 3, bh, bc[1]); l.rect(ax, bot - bh + 1, 1, bh - 1, bc[0]);
    l.rect(ax + 3, bot - 1, 1, 2, bc[1]); l.set(ax + 4, bot, bc[1]);
    l.rect(ax, bot, 5, 1, bc[2]); l.set(ax + 3, bot - 1, bc[0]);
    if (!q.robe && q.cuff !== undefined) l.rect(ax, bot - bh + 1, 3, 1, q.cuff);
  }
}

/** Protokoll der vom Sicherheitsrand abgeschnittenen Pixel (für die Vorschau). */
export const clipLog: string[] = [];
/** Zeichnet einen Frame der Figur in der gegebenen Pose. */
export function drawFrame(c: Costume, dir: Dir, ps: Pose): Px {
  const p = new Px(FW, FH), B = c.B, lg = c.lg, stoop = c.stoop ?? 0;
  const cx = CX + ps.x, hipY = FOOT - B.leg + ps.y;
  const lean = ps.lean + (dir === 1 ? stoop : 0);
  const shTop = hipY - B.torso + 1, topX = cx + lean;
  const neckY = shTop - 1 + ps.hy + B.neck + (dir !== 1 ? stoop : 0), headX = topX + ps.hx + (dir === 1 ? B.headFwd + stoop : 0);
  const sy = shTop + B.shY;
  const left: V2 = [topX - B.shX, sy], right: V2 = [topX + B.shX - 2, sy], mid: V2 = [topX - 1, sy];
  const ms = dir === 0 ? left : dir === 2 ? right : mid, os = dir === 0 ? right : dir === 2 ? left : mid;
  const mh: V2 = [ms[0] + ps.mh[0], ms[1] + ps.mh[1]];
  let oh: V2 = [os[0] + ps.oh[0], os[1] + ps.oh[1]];
  if (ps.two !== null) { const a = (ps.wa * Math.PI) / 180; oh = [Math.round(mh[0] + Math.cos(a) * ps.two), Math.round(mh[1] + Math.sin(a) * ps.two)]; }
  const k: K = { c, dir, ps, lg, B, cx, hipY, topX, shTop, neckY, headX, ms, os, mh, oh, tip: null };
  const L: LayerFn = (fn, sep = true) => { const l = new Px(FW, FH); fn(l); over(p, l, sep); };

  const wz = ps.wz ?? (dir === 2 ? 0 : 1), oz = ps.oz ?? (dir === 0 ? 1 : 0);
  const weapon = (l: Px) => c.weapon?.(l, k, mh[0], mh[1], ps.wa);
  const offItem = (l: Px) => c.off?.(l, k, oh[0], oh[1], ps.wa2);
  const hand = (l: Px, h: V2, far = false) => { const hc = far ? dk2(c.arm.hand) : c.arm.hand; l.rect(h[0], h[1], 2, 2, hc[1]); l.set(h[0], h[1], hc[0]); };
  const torsoArt = c.torso[dir], below = torsoArt.rows.length - 1 - torsoArt.ay;
  const shear = (dy: number): number => (dy <= 0 ? Math.round((lean * -dy) / (B.torso - 1)) : Math.round((ps.sw * dy) / Math.max(3, below)));
  // Roben stauchen sich beim Ducken: obere Rockzeilen entfallen, der Saum bleibt
  const skip = c.leg.robe ? Math.max(0, Math.min(below - 1, hipY + below - (FOOT - 2))) : 0;
  const torso = () => L((l) => stamp(l, torsoArt, cx, hipY, lg, { shear, skip }), true);
  const headL = () => L((l) => {
    if (!c.fullHead && dir !== 2) stamp(l, dir === 0 ? FRONT_BASE : SIDE_BASE, headX, neckY, lg, { face: ps.face });
    stamp(l, c.head[dir], headX, neckY, lg, { face: ps.face });
  });

  if (dir === 1) {
    const pref: V2 = [-1, 0.6];
    L((l) => { if (!oz) offItem(l); drawArm(l, os, oh, B.arm, pref, c.arm, true); c.pauldron?.(l, k, os, true, 0); if (oz) { offItem(l); hand(l, oh, true); } });
    if (!wz) L(weapon);
    c.under?.(k, L);
    L((l) => legSide(l, k, ps.fb, true));
    L((l) => legSide(l, k, ps.fa, false));
    torso();
    c.mid?.(k, L);
    headL();
    c.top?.(k, L);
    L((l) => { if (wz) weapon(l); drawArm(l, ms, mh, B.arm, pref, c.arm); c.pauldron?.(l, k, ms, false, 0); if (wz && ps.tag.includes('grip')) hand(l, mh); });
  } else {
    const armM = (l: Px) => { drawArm(l, ms, mh, B.arm, [dir === 0 ? -1 : 1, 0.7], c.arm); c.pauldron?.(l, k, ms, false, dir === 0 ? -1 : 1); };
    const armO = (l: Px) => { drawArm(l, os, oh, B.arm, [dir === 0 ? 1 : -1, 0.7], c.arm); c.pauldron?.(l, k, os, false, dir === 0 ? 1 : -1); };
    const raisedM = dir === 0 && mh[1] < ms[1] + 1, raisedO = dir === 0 && oh[1] < os[1] + 1;
    const hidM = dir === 2 && mh[0] > topX - 5 && mh[0] < topX + 3 && mh[1] < hipY, hidO = dir === 2 && oh[0] > topX - 5 && oh[0] < topX + 3 && oh[1] < hipY;
    if (!wz) L(weapon);
    if (!oz) L(offItem);
    if (dir === 0) c.under?.(k, L);
    if (hidM) L((l) => { if (wz) weapon(l); armM(l); });
    if (hidO) L(armO);
    L((l) => { legFront(l, k, dir === 0 ? -1 : 1, ps.fa); legFront(l, k, dir === 0 ? 1 : -1, ps.fb); });
    torso();
    if (dir === 2) c.under?.(k, L);
    if (!hidO && !raisedO && !(oz && dir === 0)) L(armO);
    const wtop = ps.tag.includes('wtop');
    const lateM = raisedM || (dir === 0 && wz === 1);
    if (!hidM && !lateM && !wtop) L((l) => { if (wz) weapon(l); armM(l); if (wz) hand(l, mh); });
    c.mid?.(k, L);
    headL();
    c.top?.(k, L);
    if (lateM && !wtop) L((l) => { if (wz) weapon(l); armM(l); if (wz) hand(l, mh); });
    if (raisedO || (oz && dir === 0)) L((l) => { armO(l); if (oz) { offItem(l); if (ps.tag.includes('ohand')) hand(l, oh); } });
    else if (oz) L((l) => { offItem(l); });
    if (wtop) L((l) => { if (wz) weapon(l); armM(l); if (wz) hand(l, mh); });
  }
  // Sicherheitsrand: nichts ragt unter die Standlinie oder bis an die Framekante (Kontur braucht 1 px)
  let cut = 0, cutB = 0;
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) if ((y > FOOT || y < 2 || x < 2 || x > FW - 3) && p.d[y * FW + x] >>> 24) { p.d[y * FW + x] = 0; if (y > FOOT) cutB++; else cut++; }
  if (cut || cutB > 3) clipLog.push(`${c.key} r${dir} ${ps.label}: Rand ${cut} px, unten ${cutB} px beschnitten`);
  outlineAll(p);
  if (ps.glint) glint(p, k);
  c.post?.(p, k);
  return ps.flip ? p.flipX() : p;
}

/** Kleine weiße Energiefunken an Waffenspitze und Händen (Zaubern). */
function glint(p: Px, k: K): void {
  const ph = k.ps.glint, hot = WHITE, pale = mix(WHITE, P.ice[3], 0.5);
  const og = k.ps.tag.includes('oglint');
  const pts: V2[] = og ? [[k.oh[0], k.oh[1] - 2]] : [k.tip ?? [k.mh[0], k.mh[1] - 3]];
  if (k.ps.two === null && !og && !k.ps.tag.includes('tipglint')) pts.push([k.oh[0] + (k.dir === 1 ? 2 : 0), k.oh[1] - 2]);
  pts.forEach(([x, y0], n) => {
    const q = (ph + n * 2) % 4, y = Math.min(y0, FOOT - 3);
    p.set(x, y, hot);
    if (q === 1 || q === 3) { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.set(x + dx, y + dy, pale); }
    if (q === 2) { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.set(x + dx, y + dy, hot); for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) p.blend(x + dx, y + dy, alpha(pale, 200)); }
    const orb: V2[] = [[-3, -2], [3, -3], [2, 3], [-2, 3]];
    const o = orb[(q + n) % 4], o2 = orb[(q + n + 2) % 4];
    if (x > 3 && x < 28 && y > 4) { p.blend(x + o[0], y + o[1], alpha(hot, 230)); p.blend(x + o2[0], y + o2[1] - 1, alpha(pale, 170)); }
  });
}

// ---------------------------------------------------------------- Hilfen für Kostüme
/** Flatterband (Schal, Stirnbandzipfel, Zopf): n Schritte ab (x,y) in Richtung d, Welle senkrecht dazu. */
export function ribbon(l: Px, x: number, y: number, n: number, d: V2, wave: number, phase: number, w: number, cA: number, cB: number, droop = 0): V2 {
  const horiz = Math.abs(d[0]) >= Math.abs(d[1]);
  let lx = x, ly = y;
  for (let i = 0; i <= n; i++) {
    const t = i / Math.max(1, n), wv = Math.sin(i * 0.9 + phase * 1.6) * wave * t;
    const px = Math.round(x + d[0] * i + (horiz ? 0 : wv)), py = Math.round(y + d[1] * i + (horiz ? wv : 0) + droop * i * i);
    if (i > 0) for (const [qx, qy] of linePts(lx, ly, px, py)) {
      l.set(qx, qy, cA);
      if (w > 1) { if (horiz) l.set(qx, qy + 1, cB); else l.set(qx + 1, qy, cB); }
    }
    lx = px; ly = py;
  }
  return [lx, ly];
}

/** Umhang: Rückenansicht deckend, Frontansicht als Schattenfläche hinter dem Körper, Seitenansicht hinter dem Rücken. */
export function cape(l: Px, k: K, r: Ramp, len: number, o: { half?: number; flare?: number; ragged?: boolean; trim?: number } = {}): void {
  const { dir, ps } = k, q = r4(r), half = o.half ?? 5, flare = (o.flare ?? 1) + ps.tr * 0.5 + ps.up, y0 = k.shTop + 1;
  const n = Math.max(2, len - (ps.up > 1 ? 1 : 0));
  if (dir === 1) {
    for (let i = 0; i <= n; i++) {
      const t = i / n, back = Math.round(t * t * (1.5 + ps.tr * 2.4 + ps.up) + Math.sin(i * 0.8 + ps.sw * 1.5) * t * (0.6 + ps.tr * 0.4));
      const wd = 3 + Math.round(t * (1 + ps.tr * 0.5)), xr = k.topX - 3 + Math.round((k.cx - k.topX) * t) - back + (i < 2 ? 1 : 0);
      const lift = Math.round(t * t * ps.tr * 1.2);
      for (let j = 0; j < wd; j++) l.set(xr - j, y0 + i - lift, j === wd - 1 ? q[2] : j === 0 ? q[0] : q[1]);
      if (i === n && o.trim !== undefined) for (let j = 0; j < wd; j++) l.set(xr - j, y0 + i - lift, o.trim);
    }
    return;
  }
  for (let i = 0; i <= n; i++) {
    const t = i / n, hw = half + Math.round(t * flare), xo = Math.round((k.cx - k.topX) * t + ps.sw * t * 1.2), xc = k.topX + xo;
    for (let x = xc - hw; x < xc + hw; x++) {
      const u = (x - (xc - hw)) / (2 * hw - 1);
      if (o.ragged && i === n && ((x + ps.sw) & 1)) continue;
      let c: number;
      if (dir === 0) c = u < 0.15 ? q[1] : u > 0.85 ? q[0] : q[0];
      else {
        c = u < 0.14 ? q[2] : u > 0.8 ? q[0] : q[1];
        const fold = (x - xc + 2 * hw + (i > n / 2 ? ps.sw : 0)) % 4;
        if (fold === 0 && i > 2 && u < 0.8) c = q[0];
        else if (fold === 1 && i > 2 && u < 0.6) c = q[2];
        if (i < 2) c = u < 0.5 ? q[2] : q[1];
      }
      l.set(x, y0 + i, c);
    }
    if (i === n && o.trim !== undefined && dir === 2) for (let x = xc - hw; x < xc + hw; x++) if (!(o.ragged && ((x + ps.sw) & 1))) l.set(x, y0 + i, o.trim);
  }
}

/** 2 px breiter Balken (Klinge, Schaft): Hauptlinie cA, Nebenlinie zur Schattenseite cB. */
export function bar(l: Px, x0: number, y0: number, x1: number, y1: number, cA: number, cB: number): void {
  const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
  for (const [x, y] of linePts(x0, y0, x1, y1)) { l.set(x + (steep ? 1 : 0), y + (steep ? 0 : 1), cB); }
  for (const [x, y] of linePts(x0, y0, x1, y1)) l.set(x, y, cA);
}
/** Achsenhelfer für Waffen: Punkt t entlang des Winkels, s senkrecht dazu (ab Handmitte). */
export function axis(hx: number, hy: number, ang: number): (t: number, s?: number) => V2 {
  const a = (ang * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a);
  return (t, s = 0) => [Math.round(hx + 0.5 + dx * t - dy * s), Math.round(hy + 0.5 + dy * t + dx * s)];
}

// ---------------------------------------------------------------- Bildtransformationen (Rolle, Liegen)
export function bbox(p: Px): [number, number, number, number] | null {
  let x0 = p.w, y0 = p.h, x1 = -1, y1 = -1;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.d[y * p.w + x] >>> 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : [x0, y0, x1, y1];
}
/** Dreht den Inhalt um q Vierteldrehungen im Uhrzeigersinn und setzt ihn mit Unterkante `bottom`, Mitte `cxT` in einen neuen Frame. */
export function rotPlace(p: Px, q: number, cxT: number, bottom: number): Px {
  const o = new Px(FW, FH), b = bbox(p);
  if (!b) return o;
  const [x0, y0, x1, y1] = b, w = x1 - x0 + 1, h = y1 - y0 + 1, rw = q % 2 ? h : w, rh = q % 2 ? w : h;
  const ox = Math.max(0, Math.min(FW - rw, Math.round(cxT - rw / 2))), oy = Math.max(0, bottom - rh + 1);
  for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) {
    let sx: number, sy: number;
    if (q === 1) { sx = y; sy = h - 1 - x; } else if (q === 2) { sx = w - 1 - x; sy = h - 1 - y; } else if (q === 3) { sx = w - 1 - y; sy = x; } else { sx = x; sy = y; }
    const c = p.d[(y0 + sy) * p.w + x0 + sx];
    if (c >>> 24) o.set(ox + x, oy + y, c);
  }
  return o;
}
