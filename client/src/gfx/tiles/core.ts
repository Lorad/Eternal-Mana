/**
 * Boden-Renderer v2 – gemeinsame Maschinerie für alle Biom-Maler.
 * =====================================================================================================================
 *
 * WIE DER BODEN ENTSTEHT
 * ----------------------
 * Das Spiel ruft `paintGround(ctx, map, tx0, ty0, tx1, ty1)` je 32×32-Kachel-Chunk auf. `tiles/index.ts` legt dafür
 * einen `Chunk` an (dieses Modul) und übergibt ihn dem Biom-Maler. Der Chunk besitzt einen RGBA-Puffer (`buf`,
 * 0xAABBGGRR wie die Palette), der um `PAD` Pixel größer ist als der angeforderte Ausschnitt:
 *
 *      ┌──────────────────────────┐   Puffer  W × H   (Ursprung = Weltpixel x0,y0)
 *      │  PAD                     │   Felder (Rauschen, Abdeckung, Distanzen, kind) gelten für den GANZEN Puffer,
 *      │   ┌──────────────────┐   │   gemalt und ausgegeben wird nur der KERN  ix0..ix1 × iy0..iy1.
 *      │   │      KERN        │   │
 *      │   └──────────────────┘   │
 *      └──────────────────────────┘
 *
 * Nahtlosigkeit: Alles ist eine reine Funktion von Weltkoordinaten + map.seed. Zwei Nachbar-Chunks berechnen für
 * ein Pixel dieselben Felder und stempeln dieselben Details in derselben Reihenfolge – deshalb gibt es keine Fugen.
 *
 * WAS EIN BIOM-MODUL LIEFERN MUSS  (Vorlage: tiles/gruenwald.ts)
 * ---------------------------------------------------------------
 *   export const meinBiom: BiomePainter = {
 *     biome: 'kristall',
 *     paint(c) { if (c.map.dungeon) paintDungeon(c); else paintOverworld(c); },
 *     liquid() { return [...8 nahtlose 64×64-Px-Frames...]; },      // optional, sonst Legacy-Frames
 *   };
 * … und in tiles/index.ts in `PAINTERS` eintragen. Mehr nicht.
 *
 * Empfohlener Aufbau von paint(c) (so macht es Grünwald):
 *   1. FELDER holen:   c.cover(LUT) (weiche Abdeckung einer Kachelart, 0..1, 0.5 = Kachelgrenze),
 *                      c.noise(periode, salz) (Value-Noise 0..1), c.dist(maske) (Distanz in px zum nächsten Maskenpixel).
 *   2. KLASSIFIZIEREN: für jedes Pufferpixel eine Oberflächenart in `c.kind` schreiben (eigene Konstanten des Bioms,
 *                      z. B. Gras/Wiese/Weg/Ufer/Wasser/Wandfront/Wandoberseite). Organische Kanten entstehen durch
 *                      `cover + (rauschen-0.5)*amp > 0.5`. Wände: Fußabdruck-Maske bauen → `c.resolveWalls(F)` liefert
 *                      Frontfläche (bis 2 Kacheln hoch), Oberseite und Kantenabstände.
 *   3. GRUNDFARBE:     Schleife NUR über den Kern (`for y in iy0..iy1, x in ix0..ix1`), Farbe je nach `kind`.
 *   4. STEMPEL:        `c.cells((cx, cy, t) => …)` läuft zeilenweise über alle Zellen, die in den Kern hineinragen
 *                      können. Pro Zelle `seedAt(cx, cy, salz)` und dann `rf()/ri()` für Zufall; Stempel mit
 *                      `c.blit` / `c.blitK` (nur auf erlaubten Oberflächen) setzen.
 *   5. LICHT/SCHATTEN: `c.darken(i, t)` / `c.tint(i, farbe, t)`; Wandschatten über `c.wallShadow(F)`.
 *
 * REGELN
 * ------
 *   - Determinismus: kein Math.random/Date. Zufall nur über hash2/rnd2 (Weltkoordinaten!) bzw. seedAt/rf/ri.
 *     NIE Pufferkoordinaten oder Chunk-Indizes in Hashes stecken – immer Weltpixel (c.x0 + x) oder Zellkoordinaten.
 *   - Reichweite: Der Beitrag einer Zelle (Stempel, Linien) darf höchstens `BLEED` (16) px über ihren Rand ragen.
 *     Felder sind bis PAD (48) px um den Kern exakt; resolveWalls braucht davon 38 px (2 Kacheln Front + Lippe).
 *   - Nie aus `buf` Nachbarpixel LESEN, um etwas zu entscheiden (außerhalb des Kerns ist buf leer) – dafür `kind`
 *     oder Felder benutzen.
 *   - LIQUID bleibt transparent (Alpha 0) bzw. halbtransparent schattiert; Ufer werden deckend hineingemalt.
 *   - Leistung: Pro-Pixel-Arbeit im Kern einfach halten (Feldzugriffe, wenige Hashes). Alles Motivische (Büschel,
 *     Blüten, Steine, Wurzeln, Mauerblöcke) EINMAL als `Stamp` vorzeichnen (Modul-Cache, mit Px-Werkzeugen aus draw.ts)
 *     und nur noch blitten. Felder werden pro Chunk gecacht (gleiche Parameter → dasselbe Array, nicht verändern!).
 *     Richtwert: 128×128 Kacheln < 2,5 s.
 *   - Farben: nur Palettenrampen `P.*` und `mix()` daraus.
 */
import { INK, hash2, mix, rnd2 } from '../palette';
import { Px } from '../draw';
import type { PaintableMap } from '../spec';
import type { BiomeId } from '../../../../shared/src/maps/tiles';

export const TS = 16;
/** Rand des Feldpuffers um den Kern (px). */
export const PAD = 48;
/** So weit darf der Beitrag einer Zelle über ihren Rand ragen (px). */
export const BLEED = 16;
export const VOID = 0, GROUND = 1, GROUND2 = 2, PATH = 3, FLOOR = 4, WALL = 5, LIQUID = 6, BRIDGE = 7, HAZARD = 8;

/** Schnittstelle eines Biom-Malers (siehe Kopfkommentar). */
export interface BiomePainter {
  biome: BiomeId;
  /** Malt den Kern des Chunks nach `c.buf`. Muss für Oberwelt (map.dungeon=false) und Dungeon funktionieren. */
  paint(c: Chunk): void;
  /** Optional: 8 nahtlos kachelbare 64×64-Frames der animierten Flüssigkeit. */
  liquid?(): Px[];
}

// ---------------------------------------------------------------------------------------------------- Zufall
let _s = 1;
/** Setzt den Zell-Zufallsgenerator (danach rf()/ri()/rr() aufrufen). */
export function seedAt(x: number, y: number, salt: number): void { _s = hash2(x, y, salt) | 1; }
/** 0..1 */
export function rf(): number { _s ^= _s << 13; _s ^= _s >>> 17; _s ^= _s << 5; return (_s >>> 0) / 4294967296; }
/** ganzzahlig 0..n-1 */
export function ri(n: number): number { return (rf() * n) | 0; }
/** ganzzahlig a..b (inklusive) */
export function rr(a: number, b: number): number { return a + ((rf() * (b - a + 1)) | 0); }

export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);

// ---------------------------------------------------------------------------------------------------- Farbe
/** Kühle Schattenfarbe (Art Bible: Schatten ins Blau-Violette). */
export const SHADE = mix(INK, 0xff5a2a1c >>> 0, 0.25);
/** src-over zweier gepackter Farben (auch halbtransparentes Ziel). */
export function over(dst: number, src: number): number {
  const sa = src >>> 24;
  if (sa === 255) return src;
  if (sa === 0) return dst;
  const da = dst >>> 24;
  if (da === 0) return src;
  if (da === 255) {
    const t = sa / 255, dr = dst & 255, dg = (dst >> 8) & 255, db = (dst >> 16) & 255;
    const r = (dr + ((src & 255) - dr) * t) | 0, g = (dg + (((src >> 8) & 255) - dg) * t) | 0, b = (db + (((src >> 16) & 255) - db) * t) | 0;
    return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
  }
  const fs = sa / 255, fd = (da / 255) * (1 - fs), oa = fs + fd;
  const ch = (sh: number): number => Math.round((((src >> sh) & 255) * fs + ((dst >> sh) & 255) * fd) / oa);
  return ((Math.round(oa * 255) << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)) >>> 0;
}
/** n gleichmäßig abgestufte Töne zwischen den Stützfarben (linear durch die Liste). */
export function tones(n: number, ...stops: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const f = (i / (n - 1)) * (stops.length - 1), k = Math.min(stops.length - 2, Math.floor(f));
    out.push(mix(stops[k], stops[k + 1], f - k));
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------- Stempel
/** Vorgezeichnetes Motiv. (ax, ay) = Ankerpunkt im Stempel (typisch: Fußpunkt unten Mitte). */
export interface Stamp { w: number; h: number; ax: number; ay: number; d: Uint32Array }

export function stampOf(p: Px, ax = Math.floor(p.w / 2), ay = p.h - 1): Stamp {
  return { w: p.w, h: p.h, ax, ay, d: p.d };
}
/**
 * Stempel aus Textzeilen: jedes Zeichen wird über `pal` in eine Farbe übersetzt, '.' und ' ' sind transparent.
 * Praktisch für handgesetzte Kleinmotive (Blüten, Kiesel, Klee).
 */
export function stampRows(rows: string[], pal: Record<string, number>, ax?: number, ay?: number): Stamp {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length)), p = new Px(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) { const c = pal[rows[y][x]]; if (c) p.d[y * w + x] = c; }
  return stampOf(p, ax, ay);
}
export function flipStamp(s: Stamp): Stamp {
  const d = new Uint32Array(s.d.length);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) d[y * s.w + x] = s.d[y * s.w + s.w - 1 - x];
  return { w: s.w, h: s.h, ax: s.w - 1 - s.ax, ay: s.ay, d };
}

// ---------------------------------------------------------------------------------------------------- Voronoi
/** Ergebnis von voro(): Zell-Hash, Kantenabstand (px), Versatz zum Zellkern. */
export const V = { id: 0, edge: 0, dx: 0, dy: 0 };
/** Jittered-Grid-Voronoi; sx/sy = Zellgröße in px (anisotrop möglich). Ergebnis in `V`. */
export function voro(x: number, y: number, sx: number, sy: number, seed: number): void {
  const gx = Math.floor(x / sx), gy = Math.floor(y / sy);
  let d1 = 1e9, d2 = 1e9;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = gx + i, cy = gy + j, h = hash2(cx, cy, seed);
    const px = (cx + 0.15 + ((h & 255) / 255) * 0.7) * sx, py = (cy + 0.15 + (((h >> 8) & 255) / 255) * 0.7) * sy;
    const dx = x - px, dy = y - py, dd = dx * dx + dy * dy;
    if (dd < d1) { d2 = d1; d1 = dd; V.id = h; V.dx = dx; V.dy = dy; } else if (dd < d2) d2 = dd;
  }
  V.edge = Math.sqrt(d2) - Math.sqrt(d1);
}

// ---------------------------------------------------------------------------------------------------- Karten-Cache
const MAP_CACHE = new WeakMap<Uint8Array, Map<string, unknown>>();
/** Einmalige Vorberechnung pro Karte (z. B. Brückenrichtung, Raumzuordnung); Schlüssel frei wählbar. */
export function mapCache<T>(map: PaintableMap, key: string, build: () => T): T {
  let m = MAP_CACHE.get(map.tiles);
  if (!m) { m = new Map(); MAP_CACHE.set(map.tiles, m); }
  const k = `${key}|${map.seed}|${map.dungeon ? 1 : 0}|${map.rooms?.length ?? -1}`;
  if (!m.has(k)) m.set(k, build());
  return m.get(k) as T;
}
export function tileAt(m: PaintableMap, x: number, y: number): number {
  return x < 0 || y < 0 || x >= m.w || y >= m.h ? VOID : m.tiles[y * m.w + x];
}
/** LUT über Kachelarten (Index = T.*), z. B. lut(WALL, VOID) → 1 für Wand und Leere. */
export function lut(...kinds: number[]): Uint8Array { const l = new Uint8Array(16); for (const k of kinds) l[k] = 1; return l; }

// ---------------------------------------------------------------------------------------------------- Wandgeometrie
export interface WallGeom {
  /** Frontfläche: Höhe über dem Wandfuß (1 = unterste Zeile … fh = oberste); 0 = keine Front. */
  fv: Uint8Array;
  /** Gesamthöhe der Front in dieser Spalte (für Front-Pixel). */
  fh: Uint8Array;
  /** Oberseite: Abstand zur Nordkante des Wandkörpers (1 = Kante … 40; 255 = weiter/unbekannt); 0 = keine Oberseite. */
  tn: Uint8Array;
  /** Oberseite: Abstand zur Abbruchkante im Süden (1 = direkt an der Lippe … 15; 255 = weiter/keine Front darunter). */
  ts: Uint8Array;
}

// ---------------------------------------------------------------------------------------------------- Chunk
const B3 = new Float32Array(48);
for (let l = 0; l < 16; l++) { const t = (l + 0.5) / 16 - 0.5; B3[l * 3] = 0.5 * (0.5 - t) * (0.5 - t); B3[l * 3 + 1] = 0.75 - t * t; B3[l * 3 + 2] = 0.5 * (0.5 + t) * (0.5 + t); }

export class Chunk {
  readonly map: PaintableMap;
  readonly seed: number;
  /** Weltpixel des Puffer-Ursprungs */
  readonly x0: number; readonly y0: number;
  readonly W: number; readonly H: number;
  /** Kern (Pufferkoordinaten, ix1/iy1 exklusiv) */
  readonly ix0: number; readonly iy0: number; readonly ix1: number; readonly iy1: number;
  readonly buf: Uint32Array;
  /** Oberflächenart je Pixel – Bedeutung legt der Biom-Maler fest. */
  readonly kind: Uint8Array;
  private cache = new Map<string, Float32Array>();

  constructor(map: PaintableMap, tx0: number, ty0: number, tx1: number, ty1: number) {
    this.map = map; this.seed = map.seed | 0;
    this.x0 = tx0 * TS - PAD; this.y0 = ty0 * TS - PAD;
    this.W = (tx1 - tx0) * TS + 2 * PAD; this.H = (ty1 - ty0) * TS + 2 * PAD;
    this.ix0 = PAD; this.iy0 = PAD; this.ix1 = this.W - PAD; this.iy1 = this.H - PAD;
    this.buf = new Uint32Array(this.W * this.H);
    this.kind = new Uint8Array(this.W * this.H);
  }

  tile(cx: number, cy: number): number { return tileAt(this.map, cx, cy); }

  /** Value-Noise 0..1 über den ganzen Puffer (Weltkoordinaten, also chunk-übergreifend stetig). Gecacht. */
  noise(period: number, salt: number): Float32Array {
    const key = `n${period}|${salt}`;
    let out = this.cache.get(key);
    if (out) return out;
    const { W, H, x0, y0 } = this, seed = this.seed + salt * 7919;
    out = new Float32Array(W * H);
    for (let py = 0; py < H; py++) {
      const fy = (y0 + py) / period, yi = Math.floor(fy);
      let ty = fy - yi; ty = ty * ty * (3 - 2 * ty);
      let lastXi = NaN, a = 0, b = 0, c = 0, d = 0;
      for (let px = 0; px < W; px++) {
        const fx = (x0 + px) / period, xi = Math.floor(fx);
        if (xi !== lastXi) { a = rnd2(xi, yi, seed); b = rnd2(xi + 1, yi, seed); c = rnd2(xi, yi + 1, seed); d = rnd2(xi + 1, yi + 1, seed); lastXi = xi; }
        let tx = fx - xi; tx = tx * tx * (3 - 2 * tx);
        out[py * W + px] = a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
      }
    }
    this.cache.set(key, out);
    return out;
  }

  /**
   * Weiche Abdeckung einer Kachelmenge (quadratischer B-Spline über 3×3 Zellen): 1 tief im Inneren, 0 weit außerhalb,
   * genau 0.5 auf einer geraden Kachelgrenze; Ecken werden rund. `l` = LUT über Kachelarten (siehe lut()). Gecacht.
   */
  cover(l: Uint8Array, key: string): Float32Array {
    const k = 'c' + key;
    let out = this.cache.get(k);
    if (out) return out;
    const { W, H, x0, y0, map } = this;
    const gx0 = Math.floor(x0 / TS) - 1, gy0 = Math.floor(y0 / TS) - 1;
    const gw = Math.floor((x0 + W - 1) / TS) + 1 - gx0 + 1, gh = Math.floor((y0 + H - 1) / TS) + 1 - gy0 + 1;
    const m = new Float32Array(gw * gh);
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) m[j * gw + i] = l[tileAt(map, gx0 + i, gy0 + j)];
    const tmp = new Float32Array(gh * W);
    for (let j = 0; j < gh; j++) for (let px = 0; px < W; px++) {
      const wx = x0 + px, ci = (wx >> 4) - gx0, b = (wx & 15) * 3, o = j * gw + ci;
      tmp[j * W + px] = B3[b] * m[o - 1] + B3[b + 1] * m[o] + B3[b + 2] * m[o + 1];
    }
    out = new Float32Array(W * H);
    for (let py = 0; py < H; py++) {
      const wy = y0 + py, cj = (wy >> 4) - gy0, b = (wy & 15) * 3, w0 = B3[b], w1 = B3[b + 1], w2 = B3[b + 2];
      const r0 = (cj - 1) * W, r1 = cj * W, r2 = (cj + 1) * W, o = py * W;
      for (let px = 0; px < W; px++) out[o + px] = w0 * tmp[r0 + px] + w1 * tmp[r1 + px] + w2 * tmp[r2 + px];
    }
    this.cache.set(k, out);
    return out;
  }

  /** Exakte Kachelmaske auf Pixelebene (1 wo die Kachelart in der LUT liegt). */
  cellMask(l: Uint8Array): Uint8Array {
    const { W, H, x0, y0, map } = this, out = new Uint8Array(W * H);
    for (let py = 0; py < H; py++) {
      const cy = (y0 + py) >> 4;
      for (let px = 0; px < W; px++) out[py * W + px] = l[tileAt(map, (x0 + px) >> 4, cy)];
    }
    return out;
  }

  /** Distanz (px, Chamfer) jedes Pixels zum nächsten Pixel mit mask≠0; innerhalb der Maske 0. Deckel: 64. */
  dist(mask: Uint8Array): Float32Array {
    const { W, H } = this, out = new Float32Array(W * H), D = 1.4142;
    for (let i = 0; i < out.length; i++) out[i] = mask[i] ? 0 : 64;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; let v = out[i];
      if (v === 0) continue;
      if (x > 0 && out[i - 1] + 1 < v) v = out[i - 1] + 1;
      if (y > 0) {
        if (out[i - W] + 1 < v) v = out[i - W] + 1;
        if (x > 0 && out[i - W - 1] + D < v) v = out[i - W - 1] + D;
        if (x < W - 1 && out[i - W + 1] + D < v) v = out[i - W + 1] + D;
      }
      out[i] = v;
    }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x; let v = out[i];
      if (v === 0) continue;
      if (x < W - 1 && out[i + 1] + 1 < v) v = out[i + 1] + 1;
      if (y < H - 1) {
        if (out[i + W] + 1 < v) v = out[i + W] + 1;
        if (x < W - 1 && out[i + W + 1] + D < v) v = out[i + W + 1] + D;
        if (x > 0 && out[i + W - 1] + D < v) v = out[i + W - 1] + D;
      }
      out[i] = v;
    }
    return out;
  }

  /**
   * Zerlegt eine Wand-Fußabdruckmaske F (1 = Wandkörper) in ¾-Sicht: Die südlichen `h` Pixel jeder Spalte sind die
   * Frontfläche (h = min(hmax, Tiefe − lip); bei ≥ 2 Kacheln Tiefe also 2 Kacheln hoch), der Rest ist Oberseite.
   * minFaceW > 1 unterdrückt Frontstücke, die waagerecht schmaler sind (sinnvoll bei organisch ausgefransten Masken).
   */
  resolveWalls(F: Uint8Array, hmax = 32, lip = 6, minFaceW = 1): WallGeom {
    const { W, H } = this, n = W * H;
    const fv = new Uint8Array(n), fh = new Uint8Array(n), tn = new Uint8Array(n), ts = new Uint8Array(n);
    for (let x = 0; x < W; x++) {
      let y = H - 1;
      while (y >= 0) {
        if (!F[y * W + x]) { y--; continue; }
        const yS = y;
        while (y >= 0 && F[y * W + x]) y--;
        const yN = y + 1, R = yS - yN + 1, openS = yS < H - 1, openN = yN > 0;
        let h = 0;
        if (openS) { h = openN ? Math.min(hmax, R - lip) : hmax; if (h < 4) h = Math.min(R, 4); }
        for (let yy = yS; yy >= yN; yy--) {
          const sd = yS - yy + 1, i = yy * W + x;
          if (sd <= h) { fv[i] = sd; fh[i] = h; }
          else { const a = yy - yN + 1, b = sd - h; tn[i] = openN && a <= 40 ? a : 255; ts[i] = openS && b <= 15 ? b : 255; }
        }
      }
    }
    // schmale Frontsplitter (ausgefranste senkrechte Kanten) gehören zur Oberseite
    if (minFaceW > 1) for (let y = 0; y < H; y++) {
      let x = 0;
      while (x < W) {
        if (!fv[y * W + x]) { x++; continue; }
        const xa = x;
        while (x < W && fv[y * W + x]) x++;
        if (x - xa < minFaceW && xa > 0 && x < W) for (let k = xa; k < x; k++) { const i = y * W + k; fv[i] = 0; fh[i] = 0; tn[i] = tn[i - 1] || tn[i + 1] ? 255 : 1; ts[i] = 255; }
      }
    }
    return { fv, fh, tn, ts };
  }

  /**
   * Schlagschatten des Wandkörpers F auf den Boden (Licht von oben links → Schatten nach unten rechts).
   * Ergebnis 0..1 je Pixel (0 = kein Schatten); `near` = Distanzfeld zu F (c.dist(F)), `len` = Schattenlänge in px.
   */
  wallShadow(F: Uint8Array, near: Float32Array, len = 9): Float32Array {
    const { W, H } = this, out = new Float32Array(W * H);
    for (let y = this.iy0; y < this.iy1; y++) for (let x = this.ix0; x < this.ix1; x++) {
      const i = y * W + x;
      if (F[i] || near[i] > len + 1) continue;
      let s = 0;
      for (let k = 1; k <= len; k++) {
        const sx = x - ((k * 0.55) | 0), sy = y - k;
        if (sx < 0 || sy < 0) break;
        if (F[sy * W + sx]) { s = 1 - (k - 1) / len; break; }
      }
      // Kontaktschatten am Wandfuß (unter Fronten) und rechts neben Wänden – nicht auf der Lichtseite
      let ao = 0;
      if (near[i] < 3.5) {
        for (let k = 1; k <= 3; k++) {
          if ((y >= k && F[i - k * W]) || (x >= k && F[i - k])) { ao = 0.62 - k * 0.14; break; }
        }
      }
      out[i] = s > ao ? s : ao;
    }
    return out;
  }

  // ------------------------------------------------------------------ Malen
  /** Dunkelt Pixel i Richtung kühler Schattenfarbe ab (bei transparenten Pixeln: halbtransparenter Schatten). */
  darken(i: number, t: number, col = SHADE): void {
    const c = this.buf[i];
    if (c >>> 24 === 255) this.buf[i] = (mix(c, col, t) | 0xff000000) >>> 0;
    else this.buf[i] = over(c, (((Math.round(t * 255) & 255) << 24) | (col & 0xffffff)) >>> 0);
  }
  /** Mischt Pixel i Richtung Farbe (nur deckende Pixel). */
  tint(i: number, col: number, t: number): void {
    const c = this.buf[i];
    if (c >>> 24 === 255) this.buf[i] = (mix(c, col, t) | 0xff000000) >>> 0;
  }
  /** Setzt ein Weltpixel (auf den Kern beschnitten). */
  set(wx: number, wy: number, col: number): void {
    const x = wx - this.x0, y = wy - this.y0;
    if (x >= this.ix0 && y >= this.iy0 && x < this.ix1 && y < this.iy1) this.buf[y * this.W + x] = over(this.buf[y * this.W + x], col);
  }
  /** Wie set(), aber nur auf erlaubten Oberflächen. */
  setK(wx: number, wy: number, col: number, allow: Uint8Array): void {
    const x = wx - this.x0, y = wy - this.y0;
    if (x >= this.ix0 && y >= this.iy0 && x < this.ix1 && y < this.iy1 && allow[this.kind[y * this.W + x]]) this.buf[y * this.W + x] = over(this.buf[y * this.W + x], col);
  }
  /** Oberflächenart am Weltpixel (auch im PAD-Bereich gültig; außerhalb des Puffers 0). */
  kindAt(wx: number, wy: number): number {
    const x = wx - this.x0, y = wy - this.y0;
    return x >= 0 && y >= 0 && x < this.W && y < this.H ? this.kind[y * this.W + x] : 0;
  }
  /** Stempelt mit Anker auf Weltpixel (wx, wy); auf den Kern beschnitten. */
  blit(s: Stamp, wx: number, wy: number): void {
    const bx = wx - s.ax - this.x0, by = wy - s.ay - this.y0;
    const xa = Math.max(this.ix0, bx), xb = Math.min(this.ix1, bx + s.w), ya = Math.max(this.iy0, by), yb = Math.min(this.iy1, by + s.h);
    if (xa >= xb || ya >= yb) return;
    const { buf, W } = this, d = s.d;
    for (let y = ya; y < yb; y++) {
      let si = (y - by) * s.w + (xa - bx), i = y * W + xa;
      for (let x = xa; x < xb; x++, si++, i++) {
        const c = d[si];
        if (c === 0) continue;
        buf[i] = c >>> 24 === 255 ? c : over(buf[i], c);
      }
    }
  }
  /** Wie blit(), aber nur auf Pixeln, deren `kind` in `allow` (LUT 256) erlaubt ist. */
  blitK(s: Stamp, wx: number, wy: number, allow: Uint8Array): void {
    const bx = wx - s.ax - this.x0, by = wy - s.ay - this.y0;
    const xa = Math.max(this.ix0, bx), xb = Math.min(this.ix1, bx + s.w), ya = Math.max(this.iy0, by), yb = Math.min(this.iy1, by + s.h);
    if (xa >= xb || ya >= yb) return;
    const { buf, W, kind } = this, d = s.d;
    for (let y = ya; y < yb; y++) {
      let si = (y - by) * s.w + (xa - bx), i = y * W + xa;
      for (let x = xa; x < xb; x++, si++, i++) {
        const c = d[si];
        if (c === 0 || !allow[kind[i]]) continue;
        buf[i] = c >>> 24 === 255 ? c : over(buf[i], c);
      }
    }
  }
  /**
   * Ruft fn für jede Zelle auf, deren Beiträge (≤ BLEED px Überstand) den Kern erreichen können – zeilenweise von
   * oben nach unten, damit Überlappungen in allen Chunks gleich ausfallen. t = Kachelart (VOID außerhalb der Karte).
   */
  cells(fn: (cx: number, cy: number, t: number) => void): void {
    const cx0 = ((this.x0 + this.ix0 - BLEED) >> 4), cx1 = ((this.x0 + this.ix1 - 1 + BLEED) >> 4);
    const cy0 = ((this.y0 + this.iy0 - BLEED) >> 4), cy1 = ((this.y0 + this.iy1 - 1 + BLEED) >> 4);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) fn(cx, cy, tileAt(this.map, cx, cy));
  }
}

/** LUT über Oberflächenarten (kind) für blitK/setK. */
export function allow(...kinds: number[]): Uint8Array { const l = new Uint8Array(256); for (const k of kinds) l[k] = 1; return l; }
