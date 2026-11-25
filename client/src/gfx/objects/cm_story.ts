/**
 * Allgemein – Geschichte & Weltereignisse (v2): Hüterschrein, Fundstücke der Überlieferung, Riss-Stein,
 * Mana-Woge, Sternsplitter, Grabstelle, vergrabene Truhe. Alles biomneutral gehalten (steht in allen sechs Gebieten).
 */
import { Px } from '../draw';
import { Frames, INK, MARK, P, Ramp, TAU, WHITE, alpha, anim, boulder, clamp, glow, inkOutline, mix, one, part, planks, rnd2, shadeArea, sparkle, texFill } from './kit';
import { CYAN, TEALC, jag, prism, twinkle } from './kr_kit';
import { TERRA, glyph, slab, stoneFill } from './ru_kit';
import { xf } from '../mobs/kit';

const W = P.wood, S = P.stone, I = P.steel, Y = P.gold, TL = P.teal;
const DARK = P.shadow[0], SHADE = P.shadow[2];
/** neutraler Werkstein der Ersten Hüter: weder warm noch kalt */
export const SHRINE: Ramp = [mix(S[0], I[0], 0.35), mix(S[1], I[1], 0.3), mix(S[2], I[2], 0.25), mix(S[3], I[3], 0.2), mix(S[4], P.cream[4], 0.35)];
/** verblasstes Gold des alten Ordens */
export const OGOLD: Ramp = [mix(Y[0], S[1], 0.4), mix(Y[1], S[2], 0.35), mix(Y[2], S[3], 0.3), mix(Y[3], P.cream[3], 0.25), mix(Y[4], P.cream[4], 0.3)];
/** weiß-goldenes Licht */
export const WGOLD = mix(Y[4], WHITE, 0.5);
/** aufgeworfene Erde: in jedem Biom als dunkler Fleck lesbar */
export const EARTH: Ramp = [mix(W[0], S[0], 0.45), mix(W[1], S[1], 0.4), mix(W[2], S[1], 0.35), mix(W[3], S[2], 0.4), mix(P.tan[2], S[3], 0.45)];

// ---------------------------------------------------------------- Hüterschrein
function hueterschrein(p: Px, f: number): void {
  const R = SHRINE, k = [0.3, 0.65, 1, 0.65][f];
  part(p, (l) => {
    // zwei Stufen, Schaft, Konsole, Gehäuse
    slab(l, 4, 42, 24, 6, 2, 3, R); slab(l, 7, 38, 18, 4, 2, 5, R);
    slab(l, 11, 28, 10, 10, 0, 7, R);
    l.rect(10, 27, 12, 1, R[1]); l.rect(8, 26, 16, 1, R[2]); l.set(8, 26, R[3]); l.rect(22, 26, 2, 1, R[1]);
    slab(l, 6, 12, 20, 14, 0, 11, R);
    // Giebel: zwei Dachplatten über dem Giebelfeld
    for (let x = 3; x <= 28; x++) {
      const d = Math.abs(x + 0.5 - 16), top = 3 + Math.round(d * 0.74), left = x < 16;
      if (x >= 7 && x <= 24) for (let y = top + 3; y < 12; y++) l.set(x, y, R[x === 7 ? 3 : x >= 23 ? 1 : 2]);
      l.set(x, top, left ? R[4] : R[3]); l.set(x, top + 1, left ? R[3] : R[2]); l.set(x, top + 2, left ? R[1] : R[0]);
    }
    l.rect(15, 1, 2, 2, OGOLD[3]); l.set(15, 1, OGOLD[4]); l.set(16, 2, OGOLD[1]);
    l.rect(15, 7, 2, 2, OGOLD[2]); l.set(15, 7, OGOLD[4]); l.px([14, 8, 17, 8], R[1]);
    // Nische mit Rundbogen: dunkle Tiefe, helle Sohlbank, eingemeißelter Rahmen
    for (let y = 13; y <= 22; y++) for (let x = 10; x <= 21; x++) {
      const dx = Math.abs(x + 0.5 - 16), hw = y < 18 ? Math.sqrt(Math.max(0, 25 - (18 - y - 0.5) ** 2)) : 5;
      if (dx <= hw) l.set(x, y, y === 13 || x === 11 || (y < 18 && dx > hw - 1) ? INK : mix(DARK, R[0], 0.35 + (y - 13) * 0.04));
      else if (dx <= hw + 1 && x > 16) l.set(x, y, R[3]);
    }
    l.rect(11, 23, 10, 1, R[4]); l.rect(11, 22, 10, 1, mix(R[1], DARK, 0.3));
    // Band der sieben Sitze
    l.rect(6, 24, 20, 1, R[1]);
    for (const x of [7, 10, 13, 18, 21, 24]) l.set(x, 24, OGOLD[3]);
    l.rect(15, 24, 2, 1, OGOLD[4]);
    // Schaft: eingetiefte Zeichenleiste, Verwitterung
    l.rect(15, 30, 2, 6, R[1]); l.px([15, 31, 16, 33, 15, 35], OGOLD[2]); l.px([12, 29, 19, 34, 13, 36], R[1]); l.px([18, 30, 12, 33], R[3]);
    l.px([6, 12, 25, 25, 24, 38, 4, 47], 0); l.px([9, 16, 23, 20, 8, 21], R[1]); l.line(23, 13, 21, 16, R[0]); l.set(22, 17, R[0]);
    l.px([9, 44, 20, 45, 14, 40], R[1]); l.px([11, 46, 22, 47], R[0]);
    shadeArea(l, (x, y) => y >= 28 && y < 30, SHADE, 0.3);
  });
  // Lichtschein in der Nische und um den Schrein (weiß-gold)
  glow(p, 16, 18, 13 + k * 2, WGOLD, 14 + k * 16);
  glow(p, 16, 18, 6 + k * 2, WGOLD, 40 + k * 50, true);
  // Kristall in goldener Fassung
  const CR = [Y[2], Y[3], Y[4], WGOLD, WHITE];
  for (let y = 13; y <= 21; y++) {
    const hw = y <= 14 ? 1 : y === 15 ? 2 : y <= 18 ? 3 : y <= 20 ? 2 : 1;
    for (let x = 16 - hw; x < 16 + hw; x++) {
      const left = x < 16, up = y < 17;
      let t = left ? (up ? 4 : 3) : up ? 2 : 1;
      if (x === 15 && y > 14) t = up ? 3 : 2; else if (x === 16 && y > 14 && y < 20) t = up ? 3 : 1;
      if (k > 0.9) t++; else if (k < 0.5 && t > 1 && !(left && up)) t--;
      p.set(x, y, CR[clamp(t, 0, 4)]);
    }
  }
  p.set(14, 16, WHITE); p.set(15, 13, WHITE);
  p.rect(13, 22, 6, 1, OGOLD[2]); p.set(13, 22, OGOLD[4]); p.px([12, 21, 19, 21], OGOLD[3]); p.px([12, 22, 19, 22], OGOLD[1]);
  // aufsteigende Lichtpunkte
  for (let j = 0; j < 3; j++) {
    const t = ((f + j * 1.4) % 4) / 4, x = [12, 19, 16][j] + Math.round(Math.sin(t * TAU + j) * 1), y = Math.round(12 - t * 9);
    p.blend(x, y, alpha(WHITE, Math.round(230 * (1 - t)))); if (t < 0.5) p.blend(x, y + 1, alpha(WGOLD, 120));
  }
  if (f === 2) { p.blend(16, 12, alpha(WHITE, 200)); p.blend(10, 18, alpha(WGOLD, 150)); p.blend(21, 17, alpha(WGOLD, 150)); }
}

// ---------------------------------------------------------------- Überlieferung (Fundstücke)
/** Funkeln oben rechts: gemeinsames Erkennungszeichen aller Fundstücke */
function loreGlint(p: Px, x: number, y: number): void { sparkle(p, x, y, WGOLD); p.blend(x - 1, y - 1, alpha(WGOLD, 110)); p.blend(x + 1, y + 1, alpha(WGOLD, 110)); }

function loreBook(p: Px): void {
  const C = P.red, PG = P.cream, row = (y: number): number => 2 + Math.round((8 - y) * 0.45);
  const quad = (dy: number, fn: (x: number, y: number, u: number) => number): void => { for (let y = 3; y <= 8; y++) for (let i = 0; i < 10; i++) p.set(row(y) + i, y + dy, fn(i, y, i / 9)); };
  quad(3, (i) => (i > 7 ? C[0] : C[1]));
  quad(2, (i, y) => (i === 0 ? C[1] : (i + y) % 3 === 0 ? PG[1] : PG[2]));
  quad(1, (i, y) => (i === 0 ? C[2] : (i + y) % 4 === 0 ? PG[2] : PG[3]));
  quad(0, (i, y) => (i <= 1 ? C[1] : y === 3 ? C[3] : i === 9 || y === 8 ? C[1] : C[2]));
  // Buchrücken mit Bünden, Eckbeschläge, Zeichen der Sieben
  for (const y of [4, 7]) { p.set(row(y), y, Y[3]); p.set(row(y) + 1, y, Y[2]); }
  p.px([row(3) + 2, 3, row(3) + 9, 3, row(8) + 9, 8, row(8) + 2, 8], Y[3]); p.set(row(3) + 2, 3, Y[4]);
  const cx = row(5) + 5;
  p.px([cx, 4, cx - 1, 5, cx + 1, 5, cx, 7, cx - 1, 6, cx + 1, 6], Y[3]); p.px([cx, 5, cx, 6], TL[3]); p.set(cx, 4, Y[4]);
  p.set(row(4) + 4, 4, C[4]); p.set(row(4) + 5, 4, C[3]);
  // Lesebändchen
  p.px([8, 12, 8, 13], TL[3]); p.set(9, 13, TL[2]);
  inkOutline(p);
  loreGlint(p, 14, 2);
}
function loreTablet(p: Px): void {
  const R = TERRA, x0 = (y: number): number => 3 + Math.round((15 - y) * 0.16);
  for (let y = 2; y <= 15; y++) {
    const inset = y === 2 ? 2 : y === 3 ? 1 : 0, a = x0(y) + inset, b = x0(y) + 9 - inset;
    for (let x = a; x <= b; x++) p.set(x, y, R[x === a ? 4 : y === 2 + (inset ? 0 : 9) ? 3 : x >= b - 1 ? 1 : (rnd2(x, y, 7) < 0.12 ? 2 : 3)]);
    p.set(b + 1, y + 1, R[0]);
  }
  for (let x = x0(2) + 2; x <= x0(2) + 7; x++) p.set(x, 2, R[4]);
  // Keilschriftzeilen (eingedrückt: dunkle Kerbe, heller Grat darunter)
  for (const [y, pat] of [[5, 0b1011011], [7, 0b1101101], [9, 0b0110111], [11, 0b1011010]] as const) for (let i = 0; i < 7; i++) if ((pat >> i) & 1) { p.set(x0(y) + 1 + i, y, R[0]); p.set(x0(y) + 1 + i, y + 1, R[4]); }
  p.px([x0(7) + 4, 7, x0(9) + 4, 9], WGOLD); p.set(x0(8) + 4, 8, Y[3]);
  // abgeschlagene Ecke, Riss
  p.px([x0(14), 14, x0(15), 15, x0(15) + 1, 15, x0(15), 13], 0); p.line(x0(3) + 7, 3, x0(6) + 8, 6, R[0]);
  // im Boden: Erdwall, Kiesel
  p.rect(3, 15, 10, 2, EARTH[2]); p.rect(2, 16, 12, 1, EARTH[1]); p.px([4, 15, 8, 15, 11, 15], EARTH[4]); p.px([6, 16, 12, 16], EARTH[0]);
  p.px([1, 16, 14, 16], S[3]);
  inkOutline(p);
  loreGlint(p, 13, 2);
}
function loreScroll(p: Px): void {
  const C = P.cream;
  // halb entrollt: zwei Wickel, dazwischen das beschriebene Blatt
  const roll = (y: number, h: number): void => {
    for (let j = 0; j < h; j++) p.rect(2, y + j, 12, 1, C[j === 0 ? 4 : j === h - 1 ? 1 : j === h - 2 && h > 3 ? 2 : 3]);
    p.px([2, y, 13, y], C[3]); p.px([5, y + 1, 9, y + 1], C[4]); p.set(13, y + 1, C[2]);
    for (const x of [0, 14]) { p.rect(x, y + 1, 2, h - 2, W[2]); p.set(x, y + 1, W[4]); p.set(x + 1, y + h - 2, W[1]); }
    p.set(0, y + 1, Y[4]); p.set(15, y + 1, Y[3]);
  };
  p.rect(3, 6, 10, 5, C[3]); p.rect(3, 6, 1, 5, C[4]); p.rect(12, 6, 1, 5, C[2]); p.rect(3, 6, 10, 1, C[1]);
  for (const [y, a, b] of [[7, 4, 11], [9, 4, 8]] as const) for (let x = a; x < b; x++) if (x % 4 !== 2) p.set(x, y, mix(W[1], C[1], 0.3));
  p.rect(9, 8, 3, 3, P.red[2]); p.set(9, 8, P.red[4]); p.set(11, 10, P.red[1]); p.set(10, 9, Y[3]);
  roll(2, 4); roll(10, 3);
  p.px([7, 13, 8, 13], P.red[2]); p.set(9, 13, P.red[1]);
  inkOutline(p);
  loreGlint(p, 14, 1);
}
/** warmer, heller Stein des Gedenksteins – bewusst nicht das kühle Grau der Grabsteine */
const MEMO: Ramp = [mix(S[0], W[0], 0.45), mix(S[1], P.tan[0], 0.4), mix(S[2], P.tan[2], 0.42), mix(S[3], P.cream[2], 0.5), mix(S[4], P.cream[4], 0.55)];
function loreStone(p: Px): void {
  // Gedenkstein: schlanker Obelisk mit vergoldeter Spitze auf zwei Sockelplatten; die Zeilen sind vergoldet und halten noch Licht
  const R = MEMO;
  part(p, (l) => { slab(l, 1, 16, 16, 3, 1, 3, R); slab(l, 3, 14, 12, 3, 1, 5, R); });
  part(p, (l) => {
    l.poly([[5, 15], [6, 5], [9.5, 0], [13, 5], [14, 15]], MARK); stoneFill(l, R, 5, MARK);
    for (let y = 1; y < 15; y++) { let a = 0; while (a < 18 && !(l.get(a, y) >>> 24)) a++; let b = 17; while (b > 0 && !(l.get(b, y) >>> 24)) b--; if (a < b) { l.set(a, y, R[4]); l.set(b, y, R[1]); } }
    l.rect(6, 5, 7, 1, R[1]); l.px([9, 0, 9, 1, 8, 2], WGOLD); l.px([10, 1, 10, 2, 9, 2, 11, 3, 8, 3], Y[3]); l.px([10, 3, 11, 4, 12, 4], Y[2]); l.px([9, 3, 8, 4, 7, 4], Y[4]);
    // vier vergoldete Zeilen
    for (const [y, a, b, hi] of [[7, 7, 11, 8], [9, 7, 12, 10], [11, 7, 11, 7], [13, 7, 12, 9]] as const) for (let x = a; x < b; x++) if (x % 3 !== 0 || y === 11) { l.set(x, y, x === hi ? WGOLD : Y[3]); l.set(x, y - 1, R[1]); }
  });
  p.px([2, 15, 3, 15, 2, 14], P.green[2]); p.set(3, 14, P.green[3]); p.px([14, 17, 15, 16], P.green[2]);
  inkOutline(p);
  glow(p, 9.5, 9, 6.5, WGOLD, 30, true);
  loreGlint(p, 14, 2);
}

// ---------------------------------------------------------------- Riss-Stein
/** dunkler, kühler Stein der Riss-Steine */
const RIFT: Ramp = [mix(S[0], P.shadow[1], 0.55), mix(S[1], P.violet[0], 0.35), mix(S[2], I[1], 0.45), mix(S[3], I[2], 0.4), mix(S[4], I[4], 0.45)];
const RIFT_MAIN: Array<[number, number]> = (() => {
  const out: Array<[number, number]> = [];
  for (const [a, b, s] of [[[14, 7], [12, 13], 3], [[12, 13], [15, 21], 5], [[15, 21], [13, 30], 7], [[13, 30], [14, 37], 9]] as const) for (const q of jag(a, b, 1.1, s, 3)) out.push([q[0], q[1]]);
  return out;
})();
function rissStein(p: Px, f: number): void {
  const R = RIFT;
  // instabiles Licht: Farbe und Weite des Risses wechseln je Frame
  const HUE = [TL[4], mix(TL[4], P.violet[4], 0.6), WHITE, P.violet[4]][f], RIM = [TL[3], mix(TL[3], P.violet[3], 0.5), TL[4], P.violet[3]][f], wide = [1, 0, 2, 1][f];
  const crackX = (y: number): number => { let bx = 14, bd = 99; for (const q of RIFT_MAIN) { const d = Math.abs(q[1] - y); if (d < bd) { bd = d; bx = q[0]; } } return bx; };
  part(p, (l) => { boulder(l, 14, 44, 24, 8, { ramp: R, seed: 13, cracks: 0, flat: true }); boulder(l, 5, 44, 7, 5, { ramp: R, seed: 15, cracks: 0, facets: 3 }); boulder(l, 23, 44, 6, 4, { ramp: R, seed: 17, cracks: 0, facets: 3 }); });
  part(p, (l) => {
    const m = new Px(l.w, l.h);
    m.poly([[6, 41], [4, 30], [5, 17], [8, 8], [11, 4], [13, 5], [14, 9], [15, 4], [18, 2], [21, 6], [22, 13], [24, 26], [23, 41]], MARK);
    texFill(m, MARK, (x, y) => {
      const u = (x - 4) / 20, n = rnd2(x, y, 11), bandN = rnd2(1, y >> 2, 17);
      let t = u < 0.14 ? 3 : u < 0.5 ? 2 : u < 0.8 ? 1 : 0;
      if (y < 9 + (x - 10) * 0.5 && u < 0.75) t++;
      if (n < 0.07) t--; else if (n > 0.94) t++;
      if ((y & 3) === 1 && bandN < 0.3 && u > 0.15) t--;
      return R[clamp(t, 0, 4)];
    });
    m.line(8, 8, 10, 15, R[3]); m.line(10, 15, 9, 24, R[3]); m.line(20, 9, 22, 18, R[0]); m.px([7, 33, 8, 34, 21, 30, 20, 36, 18, 8], R[0]); m.px([6, 26, 17, 5], R[4]);
    // alte Ritzzeichen, fast verwittert
    m.px([7, 20, 8, 21, 7, 22, 20, 24, 21, 25, 20, 26], R[0]);
    // die rechte Hälfte ist oberhalb der Mitte abgerissen und steht einen Pixel versetzt
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const c = m.d[y * m.w + x]; if (!c) continue; if (y < 21 && x > crackX(y)) l.set(x + 1, y - 1, c); else l.set(x, y, c); }
  });
  // Riss: breit geöffnet oben, feine Äste, heller Kern
  const solid = (x: number, y: number): boolean => p.get(x, y) >>> 24 >= 200;
  const lit = (x: number, y: number, c: number): void => { if (solid(Math.floor(x), Math.floor(y))) p.set(x, y, c); };
  const branches: Array<Array<[number, number]>> = [jag([12, 12], [8, 16], 0.8, 21, 2) as Array<[number, number]>, jag([15, 21], [20, 18], 0.8, 23, 2) as Array<[number, number]>, jag([13, 30], [9, 33], 0.7, 25, 2) as Array<[number, number]>, jag([14, 9], [18, 12], 0.7, 27, 2) as Array<[number, number]>];
  const path = (pts: Array<[number, number]>, main: boolean): void => {
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
      for (let s = 0; s <= n; s++) {
        const x = a[0] + ((b[0] - a[0]) * s) / n, y = a[1] + ((b[1] - a[1]) * s) / n, open = main ? (y < 14 ? 1.5 : y < 26 ? 0.5 : 0) + wide * 0.5 : 0;
        for (const [i2, j2] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0]] as const) { const X = Math.floor(x) + i2, Y2 = Math.floor(y) + j2; if (solid(X, Y2) && (Math.abs(i2) < 2 || open >= 1)) p.set(X, Y2, mix(p.get(X, Y2), RIM, Math.abs(i2) === 2 ? 0.3 : 0.5)); }
      }
    }
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
      for (let s = 0; s <= n; s++) {
        const x = a[0] + ((b[0] - a[0]) * s) / n, y = a[1] + ((b[1] - a[1]) * s) / n, open = main ? (y < 14 ? 1.5 : y < 26 ? 0.5 : 0) + wide * 0.5 : 0;
        lit(x, y, main ? WHITE : HUE);
        if (open >= 1) { lit(x + 1, y, HUE); if (open >= 2) lit(x - 1, y, HUE); }
      }
    }
  };
  for (const b of branches) path(b, false);
  path(RIFT_MAIN, true);
  // Licht leckt nach oben und außen
  glow(p, 13.5, 14, 12 + wide, RIM, 30 + wide * 8); glow(p, 14, 8, 6 + wide, HUE, 40, true);
  for (let j = 0; j < 9; j++) { const a = 200 - j * 22; p.blend(14 + Math.round(Math.sin(j * 0.9 + f * 1.6) * 1.2), 2 - j + (f & 1), alpha(HUE, a)); }
  // schwebende Splitter um die Bruchstelle
  for (const [bx, by, ph, s] of [[3, 9, 0, 2], [25, 7, 1.6, 2], [24, 18, 3.1, 1], [2, 22, 4.4, 1]] as const) {
    const dy = Math.round(Math.sin((f / 4) * TAU + ph) * 1.2);
    part(p, (l) => { if (s > 1) { l.poly([[bx, by + dy + 2], [bx + 1, by + dy], [bx + 3, by + dy + 1], [bx + 2, by + dy + 3.2]], R[2]); l.set(bx + 1, by + dy, R[4]); l.set(bx + 1, by + dy + 1, R[3]); } else { l.set(bx, by + dy, R[3]); l.set(bx + 1, by + dy + 1, R[1]); } });
    p.blend(bx + (bx < 14 ? s : -1), by + dy + s, alpha(RIM, 150));
  }
  // Funken
  for (let j = 0; j < 4; j++) {
    const t = ((f + j * 1.7) % 4) / 4, x = Math.round(14 + [-5, 6, -2, 4][j] * (0.4 + t)), y = Math.round(13 - t * 12 + [0, 3, -2, 5][j]);
    if (y > 0) { p.set(x, y, t < 0.5 ? WHITE : HUE); if (t < 0.3) p.blend(x, y + 1, alpha(RIM, 160)); }
  }
}

// ---------------------------------------------------------------- Mana-Woge
function manaSurge(p: Px, f: number): void {
  const E = EARTH;
  // aufgebrochener Boden mit leuchtenden Rissen
  part(p, (l) => {
    l.ell(16, 36.5, 13, 3.4, E[1]); l.ell(15, 36, 10, 2.4, E[2]);
    for (let j = 0; j < 9; j++) { const a = (j / 9) * TAU + 0.3, x = 16 + Math.cos(a) * 11, y = 36.5 + Math.sin(a) * 2.8; l.rect(Math.round(x) - 1, Math.round(y) - 1, 2 + (j % 2), 2, E[j % 3 === 0 ? 3 : 1]); l.set(Math.round(x) - 1, Math.round(y) - 1, E[4]); }
  });
  for (let j = 0; j < 7; j++) { const a = (j / 7) * TAU + 0.6; for (let d = 3; d < 11; d++) { const x = 16 + Math.cos(a) * d + Math.sin(d * 1.3 + j) * 0.6, y = 36.5 + Math.sin(a) * d * 0.26; if (p.get(Math.floor(x), Math.floor(y)) >>> 24) p.set(x, y, d < 6 ? TL[4] : (d + f) % 3 === 0 ? TL[4] : TL[2]); } }
  // Lichtsäule hinter den Kristallen
  for (let y = 0; y < 35; y++) for (let x = 8; x < 24; x++) {
    const u = Math.abs(x + 0.5 - 16) / (4 + y * 0.12), v = y / 35;
    if (u > 1) continue;
    const streak = Math.sin(x * 2.1 + (y + f * 3) * 0.55) > 0.5 ? 1 : 0, a = (70 + 150 * v * v) * (1 - u * u) * (0.55 + 0.45 * streak) * (v < 0.15 ? v / 0.15 : 1);
    if (a > 10) p.blend(x, y, alpha(u < 0.35 && streak ? WHITE : TL[4], Math.round(a)));
  }
  // Kristalle brechen durch (hinten → vorn)
  const lift = f === 2 ? 1 : 0, sh = [0, 1, 1, 0][f];
  part(p, (l) => { prism(l, 9, 36, 3, 21 + sh, 2.6, CYAN, { seed: 3 }); prism(l, 23, 36, 29, 19 + sh, 2.8, CYAN, { seed: 5, lift: f === 1 ? 1 : 0 }); });
  part(p, (l) => prism(l, 16, 37, 16.5, 12 - sh, 4.2, TEALC, { seed: 7, lift }));
  part(p, (l) => { prism(l, 12, 38, 8, 26, 2.4, TEALC, { seed: 9, lift: f === 3 ? 1 : 0 }); prism(l, 20, 38, 24, 25 + sh, 2.4, TEALC, { seed: 11 }); });
  part(p, (l) => { prism(l, 14, 39, 13, 31, 1.7, CYAN, { seed: 13 }); prism(l, 18.5, 39, 20, 32, 1.6, CYAN, { seed: 15, lift }); prism(l, 6, 38, 4, 33, 1.3, TEALC, { seed: 17 }); prism(l, 26, 38, 28, 33, 1.3, TEALC, { seed: 19 }); });
  glow(p, 16, 30, 15, TL[3], 30); glow(p, 16, 20, 7, TL[4], 30 + lift * 20, true);
  // aufsteigende Lichtperlen und Splitter
  for (let j = 0; j < 7; j++) {
    const t = ((f + j * 1.31) % 4) / 4, x = Math.round(16 + [-9, 8, -4, 5, -12, 11, 0][j] * (0.7 + 0.3 * Math.sin(t * TAU + j))), y = Math.round(30 - t * 30 - j);
    if (y < 1 || y > 38) continue;
    p.set(x, y, t > 0.75 ? TL[3] : WHITE); if (t < 0.6) { p.blend(x, y + 1, alpha(TL[4], 190)); p.blend(x, y + 2, alpha(TL[3], 90)); }
  }
  twinkle(p, [16, 4, 28, 9][f], [11, 22, 20, 27][f], TL[4], f === 0 || f === 2);
  // Lichtfäden steigen über die Spitzen hinaus
  for (const [x, ph] of [[13, 0], [16, 2], [19, 1], [11, 3], [21, 2.5]] as const) { const t = ((f + ph) % 4) / 4, y0 = Math.round(12 - t * 11); for (let j = 0; j < 4; j++) if (y0 + j >= 0) p.blend(x, y0 + j, alpha(j === 0 ? WHITE : TL[4], Math.round((230 - j * 50) * (1 - t * 0.6)))); }
}

// ---------------------------------------------------------------- Sternsplitter
/** Sternenglas (6): nachtblauer Kern → warmes Weiß */
const STAR: Ramp = [P.blue[0], mix(P.blue[1], P.violet[2], 0.5), mix(P.blue[3], P.violet[3], 0.4), mix(P.ice[3], P.violet[4], 0.25), mix(Y[4], WHITE, 0.6), WHITE];
function starShard(p: Px, f: number): void {
  // Schwebender Sternsplitter: vierzackiger Stern mit kurzen Zwischenzacken, die rechte Zacke abgebrochen – wie das Icon
  // `mat_star`. Kein Kristallhaufen und kein Krater: Die Engine lässt das ganze Bild auf und ab schweben.
  const cx = 9, cy = 8.5, pulse = f === 1 ? 1 : 0;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 4, r = i % 2 ? 2.7 : i === 0 ? 8 : i === 4 ? 7.4 : i === 2 ? 3.6 : 6.4; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  part(p, (l) => {
    for (let i = 0; i < 8; i++) {
      const a = pts[i], b = pts[(i + 1) % 8], mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy, lit = -(mx * 0.42 + my * 0.58) / 3.4;
      l.poly([[cx, cy], a, b], STAR[clamp(Math.round(2 + lit * 1.5 + (i % 2 ? -0.6 : 0.6)), 0, 4)]);
    }
    // Grate entlang der Zacken, heller Kern
    l.line(cx, cy, cx, 1, WHITE); l.line(cx, cy, 3, cy, STAR[4]); l.line(cx, cy, cx, 15, STAR[3]); l.line(cx, cy, 12, cy, STAR[3]);
    l.rect(8, 7, 2, 2 + pulse, WHITE); l.px([7, 8, 10, 8], STAR[4]);
    // Bruchkante rechts und der abgesprungene Splitter
    l.px([13, 8, 13, 9], STAR[1]);
  });
  part(p, (l) => { l.rect(15, 10 + (f === 3 ? 1 : 0), 2, 2, STAR[3]); l.set(15, 10 + (f === 3 ? 1 : 0), STAR[5]); });
  glow(p, cx, cy, 9, WGOLD, 26 + (f & 1) * 10); glow(p, cx, cy, 4.5, WHITE, 30 + (f === 1 ? 26 : 0), true);
  // Funkeln wandert, Sternenstaub rieselt nach unten
  const tw: Array<[number, number, boolean]> = [[13, 3, false], [13, 3, true], [4, 13, false], [15, 15, true]];
  twinkle(p, tw[f][0], tw[f][1], WGOLD, tw[f][2]);
  for (let j = 0; j < 4; j++) { const t = ((f + j) % 4) / 4, x = [6, 11, 8, 12][j], y = Math.round(15 + t * 4); if (y < 20) p.blend(x, y, alpha(j % 2 ? WGOLD : P.ice[4], Math.round(230 * (1 - t)))); }
}

// ---------------------------------------------------------------- Grabstelle, vergrabene Truhe
export function soil(p: Px, cx: number, cy: number, rx: number, ry: number, seed: number): void {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, d = u * u + v * v, n = rnd2(x, y, seed), n2 = rnd2(x >> 1, y >> 1, seed + 1);
    if (d > 1 - n * 0.3) continue;
    let t = 2 + (-(u * 0.4 + v * 0.8) > 0.35 ? 1 : -(u * 0.4 + v * 0.8) < -0.45 ? -1 : 0);
    if (n2 < 0.22) t--; else if (n2 > 0.8) t++;
    if (d > 0.62 && n < 0.5) t = Math.min(t, 1);
    p.set(x, y, EARTH[clamp(t, 0, 4)]);
  }
}
function digSpot(p: Px): void {
  soil(p, 11, 7, 10.6, 6.4, 3);
  // Kiesel-X: zwei gekreuzte Reihen heller Steinchen, an den Enden und in der Mitte größere
  for (const [x, y, big] of [[5, 2, 1], [7, 4, 0], [9, 5, 0], [10, 6, 1], [13, 8, 0], [14, 9, 0], [16, 10, 1], [16, 2, 1], [14, 4, 0], [13, 5, 0], [8, 8, 0], [7, 9, 0], [5, 10, 1]] as const) {
    if (big) { p.rect(x, y, 2, 2, S[3]); p.set(x, y, WHITE); p.set(x + 1, y, S[4]); p.set(x + 1, y + 1, S[2]); p.rect(x, y + 2, 2, 1, EARTH[0]); }
    else { p.set(x, y, S[4]); p.set(x, y + 1, EARTH[0]); }
  }
}
function chestBuried(p: Px): void {
  soil(p, 11, 13.5, 10.4, 4, 5);
  // Truhe schräg im Erdreich
  const c = new Px(22, 18), T = I;
  c.rect(4, 6, 14, 10, MARK); planks(c, 4, 6, 14, 10, { ramp: W, pw: 3, seed: 5, mark: MARK });
  c.poly([[5, 1], [17, 1], [18, 6], [4, 6]], MARK); planks(c, 4, 1, 15, 5, { ramp: W, pw: 5, seed: 9, mark: MARK, worn: 0.3 });
  shadeArea(c, (x, y) => y < 3, WHITE, 0.24); c.rect(4, 6, 14, 1, W[0]);
  for (const x of [6, 14]) { c.rect(x, 1, 2, 15, T[1]); c.rect(x, 1, 1, 15, T[2]); c.px([x, 3, x, 9, x, 13], T[3]); }
  c.rect(5, 1, 12, 1, T[3]); c.rect(10, 5, 3, 4, Y[2]); c.rect(10, 5, 3, 1, Y[4]); c.set(11, 7, DARK); c.set(12, 8, Y[1]);
  inkOutline(c);
  p.draw(xf(c, { rot: -0.3, ax: 11, ay: 12, dx: 0, dy: -1 }));
  // vorderer Erdwall deckt die Unterkante, lose Brocken
  for (let y = 12; y < 18; y++) for (let x = 0; x < 22; x++) {
    const u = (x + 0.5 - 11) / 10.4, top = 12.6 + (1 - Math.sqrt(Math.max(0, 1 - u * u))) * 2 + Math.sin(x * 1.3) * 0.7 + (x - 11) * 0.12, v = (y - 13.5) / 4;
    if (Math.abs(u) < 1 && y >= top && u * u + v * v < 1 - rnd2(x, y, 5) * 0.3) p.set(x, y, EARTH[clamp(y < top + 1 ? 3 : rnd2(x >> 1, y, 8) < 0.25 ? 1 : 2, 0, 4)]);
  }
  p.px([3, 12, 18, 13], EARTH[4]); p.px([2, 14, 19, 15, 9, 16], S[3]); p.px([2, 15, 19, 16, 9, 17], EARTH[0]);
  sparkle(p, 12, 6, WGOLD);
}

export function cmStory(out: Frames): void {
  anim(out, 'hueterschrein', 4, 32, 48, hueterschrein, false);
  one(out, 'lore_book', 16, 14, loreBook, false); one(out, 'lore_tablet', 16, 18, loreTablet, false); one(out, 'lore_scroll', 16, 14, loreScroll, false); one(out, 'lore_stone', 18, 20, loreStone, false);
  anim(out, 'riss_stein', 4, 28, 44, rissStein, false);
  anim(out, 'mana_surge', 4, 32, 40, manaSurge, false);
  anim(out, 'star_shard', 4, 18, 20, starShard, false);
  one(out, 'dig_spot', 22, 14, digSpot, false);
  one(out, 'chest_buried', 22, 18, chestBuried, false);
}
