/**
 * Quellwarte (Hub) – Baukasten der Stadt: Farben und wiederkehrende Bauteile aller Fassaden und Platzmöbel.
 * Stilmittel der Stadt (verbindlich für alle hub_*-Frames):
 *   warmer Werkstein (Sandgrau) · dunkles Fachwerkholz · blaugrauer Schiefer · Hütergold als Zierrat · Türkis-Manalicht
 *   in Laternen, Brunnen und Portal · warm erleuchtete Fenster.
 * Fassaden: Frontansicht in ¾-Sicht, Standfläche = Unterkante, Tür unten mittig (Schwelle in der untersten Zeile).
 */
import { Px } from '../draw';
import { MARK, MARK2, P, Ramp, WHITE, alpha, band, clamp, glow, hash2, masonry, mix, moss, planks, rnd2, shadeArea, texFill } from './kit';
import { ROOF_SLATE, roofTiles } from './gw_houses';

export const W = P.wood, S = P.stone, Y = P.gold, TL = P.teal, C = P.cream, I = P.steel;
export const SHADE = P.shadow[2], DARK = P.shadow[0];
/** warmer Werkstein der Quellwarte (sandgrau, leicht ocker) */
export const WSTONE: Ramp = [mix(S[0], W[0], 0.3), mix(S[1], P.tan[0], 0.32), mix(S[2], P.tan[1], 0.38), mix(S[3], P.tan[2], 0.4), mix(S[4], P.tan[3], 0.35)];
/** heller Zierstein (Gesimse, Säulen, Fensterlaibungen) */
export const LSTONE: Ramp = [mix(S[1], P.tan[1], 0.3), mix(S[2], P.tan[2], 0.4), mix(S[3], C[3], 0.45), mix(S[4], C[3], 0.5), mix(C[4], WHITE, 0.2)];
/** Schiefer der Quellwarte (wie Grünwald-Schiefer, eine Spur wärmer, damit er neben dem Werkstein nicht kalt wirkt) */
export const SLATE: Ramp = ROOF_SLATE.map((c, i) => mix(mix(c, P.violet[i], 0.1), S[i], 0.32));
/** Grünschiefer (Alchemie) */
export const SLATE_G: Ramp = [mix(P.forest[0], I[0], 0.4), mix(P.forest[1], I[1], 0.5), mix(P.teal[1], I[2], 0.55), mix(P.teal[2], I[3], 0.55), mix(P.teal[3], I[4], 0.5)];
/** Putz (warmes Weiß) */
export const PLASTER: Ramp = [mix(C[0], W[1], 0.2), C[1], C[2], C[3], mix(C[4], WHITE, 0.2)];
/** warmes Fensterlicht (dunkel → hell) */
export const LIT: Ramp = [mix(W[1], P.fire[0], 0.4), mix(P.fire[1], W[2], 0.3), P.fire[2], P.gold[3], P.gold[4]];
/** Hütergold */
export const GOLD: Ramp = Y;
/** Manalicht */
export const MANA: Ramp = [TL[1], TL[2], TL[3], TL[4], mix(TL[4], WHITE, 0.55)];
/** Hüterblau (Banner, Markisen, Tücher) */
export const HBLUE: Ramp = [mix(P.blue[0], P.violet[0], 0.3), P.blue[1], mix(P.blue[2], P.teal[2], 0.25), mix(P.blue[3], P.teal[3], 0.3), mix(P.blue[4], P.teal[4], 0.3)];
/** Weinrot (Gasthaus, Händler) */
export const WINE: Ramp = [mix(P.red[0], P.violet[0], 0.4), P.red[0], P.red[1], P.red[2], P.red[3]];

/** Quaderwerk aus Werkstein; rough 0 = Ashlar (Hallen), 0.7 = Bruchstein (Sockel, Schmiede). */
export function stoneWall(p: Px, x: number, y: number, w: number, h: number, seed: number, o: { R?: Ramp; bh?: number; bw?: number; rough?: number; mark?: number; moss?: number } = {}): void {
  masonry(p, x, y, w, h, { ramp: o.R ?? WSTONE, bh: o.bh ?? 5, bw: o.bw ?? 9, seed, rough: o.rough ?? 0.35, mark: o.mark });
  if (o.moss) moss(p, (xx, yy) => (yy >= y + h - 6 && yy < y + h && xx >= x && xx < x + w && (xx < x + 8 || xx > x + w - 7) ? o.moss! : 0), seed);
}
/** Putzfläche mit Spritzsockel. */
export function plaster(p: Px, x: number, y: number, w: number, h: number, seed: number, R: Ramp = PLASTER): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const n = rnd2(x + i, y + j, seed), st = rnd2((x + i) >> 2, (y + j) >> 1, seed + 1);
    p.set(x + i, y + j, j > h - 6 && st < 0.32 ? R[2] : n < 0.05 ? R[2] : n > 0.94 ? R[4] : R[3]);
  }
}
export function hbeam(p: Px, x: number, y: number, w: number, h = 3, R: Ramp = W): void {
  p.rect(x, y, w, h, R[1]); p.rect(x, y, w, 1, R[2]); p.rect(x, y + h - 1, w, 1, R[0]);
  for (let i = x + 2; i < x + w - 2; i += 5) if (hash2(i, y, 3) & 1) p.set(i, y + 1, R[0]); else p.set(i + 1, y, R[3]);
}
export function vbeam(p: Px, x: number, y: number, h: number, w = 3, R: Ramp = W): void {
  p.rect(x, y, w, h, R[1]); p.rect(x, y, 1, h, R[2]); p.rect(x + w - 1, y, 1, h, R[0]);
  for (let j = y + 2; j < y + h - 2; j += 5) if (hash2(x, j, 4) & 1) p.set(x + 1, j, R[0]); else p.set(x, j + 1, R[3]);
}
export function brace(p: Px, x0: number, y0: number, x1: number, y1: number): void {
  p.line(x0, y0, x1, y1, W[1], 2); p.line(x0, y0, x1, y1, W[2]); p.line(x0 + 1, y0 + 1, x1 + 1, y1 + 1, W[0]);
}
/** Gesims / Sohlbank aus hellem Stein. */
export function cornice(p: Px, x: number, y: number, w: number, h = 3, R: Ramp = LSTONE): void {
  p.rect(x, y, w, h, R[2]); p.rect(x, y, w, 1, R[4]); p.rect(x, y + h - 1, w, 1, R[0]);
  if (h > 2) for (let i = x + 3; i < x + w - 1; i += 6) p.set(i, y + h - 2, R[1]);
  p.set(x, y + h - 1, R[1]);
}

export interface WinOpts { panes?: number; arch?: boolean; lit?: boolean; shutters?: Ramp; box?: boolean; frame?: Ramp; sill?: boolean; curtain?: number }
/** Fenster: erleuchtet (warm) oder dunkel spiegelnd; Rundbogen optional; Laibung aus hellem Stein. */
export function win(p: Px, x: number, y: number, w: number, h: number, o: WinOpts = {}): void {
  const F = o.frame ?? W, lit = o.lit ?? true;
  const r = o.arch ? w / 2 : 0, cx = x + w / 2;
  const inside = (i: number, j: number): boolean => { if (!o.arch || j >= r) return true; const dx = i + 0.5 - w / 2, dy = r - j - 0.5; return dx * dx + dy * dy <= r * r; };
  // Laibung
  for (let j = -2; j < h + 1; j++) for (let i = -2; i < w + 2; i++) {
    const ok = !o.arch || j >= r - 1 || ((i + 0.5 - w / 2) ** 2 + (r - j - 0.5) ** 2 <= (r + 2) ** 2);
    if (ok) p.set(x + i, y + j, j < 0 || i < 0 ? F[0] : F[0]);
  }
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (!inside(i, j)) continue;
    let c: number;
    if (lit) {
      const v = j / h, d = i + j;
      c = v < 0.18 ? LIT[1] : v < 0.4 ? LIT[2] : LIT[3];
      if (d < 3) c = LIT[4]; else if (i === w - 1 || (j === h - 1)) c = LIT[1];
      if ((o.curtain ?? 0) > 0 && (i < o.curtain! || i >= w - o.curtain!) && j < h - 1) c = mix(c, WINE[2], 0.55);
    } else {
      const Gl = [P.blue[0], mix(P.blue[1], I[1], 0.4), mix(P.blue[2], I[2], 0.4), P.ice[2], P.ice[4]], d = i + j;
      c = d < 3 ? Gl[2] : d === 4 || d === 5 ? Gl[3] : d > w + h - 5 ? Gl[0] : Gl[1];
    }
    p.set(x + i, y + j, c);
  }
  const n = o.panes ?? 2;
  for (let k = 1; k < n; k++) { const xx = x + Math.round((w * k) / n); for (let j = 0; j < h; j++) if (inside(xx - x, j)) p.set(xx, y + j, F[1]); }
  if (h > 6) for (let i = 0; i < w; i++) if (inside(i, h >> 1)) p.set(x + i, y + (h >> 1), F[1]);
  if (o.arch) for (let i = 0; i < w; i++) for (let j = 0; j < r; j++) if (inside(i, j) && !inside(i, j - 1)) p.set(x + i, y + j, F[1]);
  if (o.sill ?? true) { p.rect(x - 2, y + h, w + 4, 2, LSTONE[3]); p.rect(x - 2, y + h, w + 4, 1, LSTONE[4]); p.rect(x - 2, y + h + 1, w + 4, 1, LSTONE[1]); }
  if (o.shutters) {
    const T = o.shutters;
    for (const sx of [x - 5, x + w + 1]) { p.rect(sx, y - 1, 4, h + 1, T[2]); p.rect(sx, y - 1, 1, h + 1, T[3]); p.rect(sx + 3, y - 1, 1, h + 1, T[1]); for (let j = y + 1; j < y + h - 1; j += 2) p.rect(sx + 1, j, 2, 1, T[1]); p.set(sx + (sx < x ? 3 : 0), y + (h >> 1), I[3]); }
  }
  if (o.box) {
    const by = y + h + 2;
    p.rect(x - 2, by, w + 4, 3, W[2]); p.rect(x - 2, by, w + 4, 1, W[3]); p.rect(x - 2, by + 2, w + 4, 1, W[0]);
    const fl = [P.red[3], Y[3], P.pink[3], WHITE, P.red[2], P.violet[3]];
    for (let i = -2; i < w + 2; i++) {
      const hh = hash2(i, by, x);
      p.set(x + i, by - 1, hh & 1 ? P.green[2] : P.green[3]); if ((hh & 6) !== 0) p.set(x + i, by - 2, hh & 8 ? P.green[3] : P.green[4]);
      if (i % 2 === 0) p.set(x + i, by - 2 - ((hh >> 4) & 1), fl[(hh >>> 5) % fl.length]);
    }
    p.px([x - 1, by + 3, x + w, by + 3, x + w, by + 4], P.green[2]);
  }
  void cx;
}
/** Lichtschein vor erleuchteten Fenstern (halbtransparent, nur außerhalb des Sprites → kaum sichtbar; dient der Nachtwirkung). */
export function winGlow(p: Px, x: number, y: number, w: number, h: number): void { glow(p, x + w / 2, y + h / 2, Math.max(w, h) * 0.9, LIT[3], 26); }

/** Bohlentür mit Rundbogen, Beschlägen, Steingewände und Schwelle (Schwelle endet in Zeile y+h+1). */
export function door(p: Px, x: number, y: number, w: number, h: number, o: { R?: Ramp; arch?: boolean; frame?: Ramp; double?: boolean; open?: boolean } = {}): void {
  const R = o.R ?? P.tan, Fr = o.frame ?? LSTONE, arch = o.arch ?? true, r = w / 2;
  const inArch = (i: number, j: number, rr: number) => { if (!arch || j >= rr) return true; const dx = i + 0.5 - w / 2, dy = rr - j - 0.5; return dx * dx + dy * dy <= rr * rr; };
  // Gewände: Keilsteine im Bogen, Quader an den Seiten
  const open = (i: number, j: number) => i >= 0 && i < w && j >= 0 && j < h && inArch(i, j, r);
  for (let j = -4; j < h; j++) for (let i = -3; i < w + 3; i++) {
    if (open(i, j)) continue;
    const dx = i + 0.5 - w / 2, dy = r - j - 0.5, d = Math.sqrt(dx * dx + dy * dy);
    const ring = arch && j < r;
    if (ring ? d > r + 3 : j < -3) continue;
    let c: number;
    if (ring) {
      const a = Math.atan2(dy, dx) / Math.PI * 7, seg = Math.floor(a);
      c = Fr[seg % 2 ? 2 : 3]; if (d > r + 2) c = Fr[1]; else if (d < r + 1) c = Fr[seg % 2 ? 1 : 2]; if (Math.abs(a - Math.round(a)) < 0.1) c = Fr[0];
      if (seg === 3) c = d < r + 2 ? Y[3] : Y[2]; // Schlussstein in Gold
    } else if (j < 0) c = j === -3 ? Fr[4] : j === -1 ? Fr[0] : Fr[2];
    else { const row = Math.floor(j / 5), m = j % 5, L = i < 0; c = m === 4 ? Fr[0] : (row + (L ? 0 : 1)) % 2 ? Fr[2] : Fr[3]; if (i === -3 || i === w) c = Fr[4]; if (i === w + 2 || i === -1) c = Fr[1]; }
    p.set(x + i, y + j, c);
  }
  if (o.open) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (inArch(i, j, r)) p.set(x + i, y + j, mix(DARK, LIT[0], clamp((j / h) * 0.9, 0, 1)));
  } else {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (inArch(i, j, r)) p.set(x + i, y + j, MARK2);
    planks(p, x, y, w, h, { ramp: R, pw: 4, vertical: true, seed: x * 3 + y, mark: MARK2, worn: 0.6 });
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (inArch(i, j, r) && !inArch(i, j - 1, r)) p.set(x + i, y + j, R[1]);
    band(p, x, y + Math.max(4, Math.round(r)), w, 2, I); band(p, x, y + h - 6, w, 2, I);
    if (o.double) { p.rect(x + (w >> 1), y + Math.round(r * 0.4), 1, h - Math.round(r * 0.4), R[0]); p.rect(x + (w >> 1) - 3, y + (h >> 1), 2, 2, Y[3]); p.rect(x + (w >> 1) + 2, y + (h >> 1), 2, 2, Y[3]); p.set(x + (w >> 1) - 3, y + (h >> 1), Y[4]); p.set(x + (w >> 1) + 2, y + (h >> 1), Y[4]); }
    else { p.rect(x + w - 4, y + (h >> 1) - 1, 2, 3, Y[2]); p.set(x + w - 4, y + (h >> 1) - 1, Y[4]); p.set(x + w - 3, y + (h >> 1) + 1, Y[1]); }
  }
  // Schwelle
  p.rect(x - 4, y + h, w + 8, 2, LSTONE[3]); p.rect(x - 4, y + h, w + 8, 1, LSTONE[4]); p.rect(x - 4, y + h + 1, w + 8, 1, LSTONE[1]); p.set(x + 2, y + h + 1, LSTONE[2]);
}

/** Sockel aus Bruchstein (unterste Zeilen jeder Fassade). */
export function plinth(p: Px, x: number, y: number, w: number, h: number, seed: number): void {
  masonry(p, x, y, w, h, { ramp: WSTONE, bh: 3, bw: 6, seed, rough: 0.7 }); p.rect(x, y + h - 1, w, 1, WSTONE[0]);
  moss(p, (xx, yy) => (yy >= y && yy < y + h && (xx < x + 10 || xx > x + w - 8) ? 0.35 : 0), seed);
}
/** Satteldach (Front = Traufseite) als Trapez, Schiefer, First und Ortgang. */
export function roof(p: Px, x0: number, x1: number, top: number, eaveY: number, over: number, seed: number, R: Ramp = SLATE, mark: number = MARK): void {
  p.poly([[x0, top], [x1, top], [x1 + over, eaveY], [x0 - over, eaveY]], mark); roofTiles(p, R, top, eaveY - top, seed, 4, 5, mark);
  for (let x = x0; x <= x1; x++) { const m = (x - x0) % 6; p.set(x, top - 2, m === 5 ? R[1] : R[4]); p.set(x, top - 1, m === 5 ? R[0] : R[3]); }
  p.line(x0, top - 1, x0 - over, eaveY, W[2], 2); p.line(x0, top - 1, x0 - over, eaveY, W[3]);
  p.line(x1, top - 1, x1 + over, eaveY, W[0], 2); p.line(x1, top - 1, x1 + over, eaveY, W[1]);
  eave(p, x0 - over, x1 + over, eaveY, R);
}
export function eave(p: Px, x0: number, x1: number, y: number, R: Ramp, tw = 5): void {
  for (let x = x0; x <= x1; x++) { const m = (x - x0) % tw; p.set(x, y, m === tw - 1 ? R[0] : R[3]); p.set(x, y + 1, m === tw - 1 ? R[0] : R[1]); }
  p.rect(x0 + 2, y + 2, x1 - x0 - 3, 1, W[0]);
}
/** Kontaktschatten unter Traufe/Vorsprung auf der Wand. */
export function wallShadow(p: Px, x0: number, x1: number, y: number, n = 4): void {
  shadeArea(p, (x, yy) => x >= x0 && x <= x1 && yy >= y && yy < y + n - (((x * 7) >> 2) & 1), SHADE, 0.34);
  shadeArea(p, (x, yy) => x >= x0 && x <= x1 && yy >= y + n - 1 && yy < y + n + 2, SHADE, 0.14);
}
export function chimney(p: Px, x: number, y: number, w: number, h: number, seed: number, glowTop = false): void {
  masonry(p, x, y, w, h, { ramp: WSTONE, bh: 4, bw: 5, seed, rough: 0.5 });
  shadeArea(p, (xx, yy) => xx >= x + w - 2 && xx < x + w && yy >= y && yy < y + h, SHADE, 0.35);
  p.rect(x - 1, y, w + 2, 3, LSTONE[2]); p.rect(x - 1, y, w + 2, 1, LSTONE[4]); p.rect(x - 1, y + 2, w + 2, 1, LSTONE[0]); p.rect(x + 1, y - 1, w - 2, 1, S[1]); p.rect(x + 2, y - 1, w - 4, 1, glowTop ? P.fire[2] : P.ash[0]);
  if (glowTop) { p.set(x + 2, y - 1, P.fire[3]); p.set(x + w - 3, y - 1, P.fire[1]); }
}
/** Hängeschild an schmiedeeisernem Arm; `emblem` = Pixelkarte (Zeichen → Farbe). side = 1: Arm nach rechts. */
export function hangSign(p: Px, x: number, y: number, w: number, h: number, emblem: string[], pal: Record<string, number>, side: 1 | -1 = 1, board: Ramp = W): void {
  const ax = side > 0 ? x - 3 : x + w + 2;
  p.rect(Math.min(ax, x), y - 3, w + 3, 1, I[1]); p.set(ax, y - 4, I[2]); p.set(ax, y - 2, I[2]);
  p.line(ax, y + 3, ax + side * 5, y - 2, I[1]);
  p.px([x + 2, y - 2, x + w - 3, y - 2, x + 2, y - 1, x + w - 3, y - 1], I[0]);
  p.rect(x, y, w, h, board[2]); p.rect(x, y, w, 1, board[3]); p.rect(x, y + h - 1, w, 1, board[0]); p.rect(x, y, 1, h, board[3]); p.rect(x + w - 1, y, 1, h, board[1]);
  p.rect(x + 1, y + 1, w - 2, 1, Y[2]); p.rect(x + 1, y + h - 2, w - 2, 1, Y[1]);
  stampArt(p, x + ((w - emblem[0].length) >> 1), y + ((h - emblem.length) >> 1), emblem, pal);
}
/** Pixelkarte setzen ('.' = frei). */
export function stampArt(p: Px, x: number, y: number, rows: string[], pal: Record<string, number>): void {
  rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const c = pal[row[i]]; if (c !== undefined && row[i] !== '.') p.set(x + i, y + j, c); } });
}
/** Wandlaterne mit Türkisflamme (Hüterlicht). */
export function manaLamp(p: Px, x: number, y: number): void {
  p.rect(x - 2, y, 3, 1, I[1]); p.set(x - 2, y + 1, I[1]);
  p.rect(x - 1, y + 1, 4, 1, I[2]); p.rect(x, y + 2, 2, 3, MANA[3]); p.set(x, y + 2, MANA[4]); p.set(x + 1, y + 4, MANA[1]);
  p.rect(x - 1, y + 2, 1, 3, I[1]); p.rect(x + 2, y + 2, 1, 3, I[0]); p.rect(x - 1, y + 5, 4, 1, I[1]); p.set(x, y, Y[3]);
}
/** Wappenschild der Quellwarte: Türkistropfen im goldenen Ring auf Hüterblau. 9×11 px. */
export function crest(p: Px, x: number, y: number): void {
  const rows = [
    '.ggggggg.',
    'gBbbbbbBg',
    'gbbbtbbBg',
    'gbbtTtbBg',
    'gbbtTTtBg',
    'gbtTWTtBg',
    'gbbtTtbBg',
    '.gbbtbbg.',
    '.gBbbbBg.',
    '..gBbBg..',
    '...ggg...',
  ];
  stampArt(p, x, y, rows, { g: Y[3], B: HBLUE[1], b: HBLUE[2], t: MANA[2], T: MANA[3], W: WHITE });
  p.set(x + 1, y, Y[4]); p.set(x, y + 1, Y[4]); p.set(x + 8, y + 2, Y[1]); p.set(x + 7, y + 8, Y[1]);
}
/** Hängendes Bannertuch (statisch) mit Zickzacksaum. */
export function hangBanner(p: Px, x: number, y: number, w: number, h: number, R: Ramp = HBLUE, emblem = true): void {
  p.rect(x - 1, y - 1, w + 2, 1, W[2]); p.set(x - 1, y - 1, Y[3]); p.set(x + w, y - 1, Y[3]);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const tail = j - (h - 3), mid = Math.abs(i + 0.5 - w / 2);
    if (tail > 0 && mid < tail * 1.2) continue;
    p.set(x + i, y + j, i === 0 ? R[3] : i === w - 1 ? R[1] : (i + (j >> 2)) % 5 === 0 ? R[1] : R[2]);
  }
  p.rect(x + 1, y + 1, w - 2, 1, Y[3]); p.rect(x, y + h - 5, w, 1, Y[2]);
  if (emblem && w >= 6) { const cx = x + (w >> 1); p.px([cx - 1, y + 4, cx, y + 3, cx, y + 5, cx - 1, y + 6, cx, y + 6], MANA[3]); p.set(cx - 1, y + 5, MANA[4]); p.px([cx - 2, y + 5, cx + 1, y + 5], Y[3]); }
}
/** Streifenmarkise (Front) mit Volant. */
export function awning(p: Px, x: number, y: number, w: number, h: number, A: Ramp, B: Ramp, stripe = 4): void {
  for (let j = 0; j < h; j++) {
    const sl = Math.round((h - j) * 0.25);
    for (let i = -sl; i < w + sl; i++) { const s = Math.floor((i + sl * 0) / stripe) & 1, R = s ? A : B, k = j / h; p.set(x + i, y + j, R[k < 0.25 ? 3 : k < 0.75 ? 2 : 1]); }
  }
  for (let i = 0; i < w; i += stripe) {
    const R = Math.floor(i / stripe) & 1 ? A : B;
    for (let k = 0; k < stripe; k++) { p.set(x + i + k, y + h, R[2]); if (k > 0 && k < stripe - 1) p.set(x + i + k, y + h + 1, R[1]); }
    p.set(x + i + (stripe >> 1), y + h + 2, R[1]);
  }
  p.rect(x - Math.round(h * 0.25), y, w + Math.round(h * 0.25) * 2, 1, mix(A[4], WHITE, 0.2));
}
export { alpha, glow, texFill, mix };
