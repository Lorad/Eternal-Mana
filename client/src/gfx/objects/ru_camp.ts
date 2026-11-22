/** Verlorene Ruinen – Grabungslager und Arkanes: Zelt, Kartentisch, Kisten, blaue Feuerschale, schwebende Rune. */
import { Px } from '../draw';
import { Frames, INK, MARK, P, Ramp, WHITE, alpha, anim, flame, glow, hash2, inkOutline, mix, one, planks, rnd2, texFill } from './kit';
import { ARC, SAND, TERRA, glyph, over, slab, stoneFill } from './ru_kit';

const W = P.wood, T = P.tan, C = P.cream, Y = P.gold, I = P.steel;
const K: Ramp = [mix(C[0], P.shadow[2], 0.3), C[1], C[2], C[3], C[4]];
const BRONZE: Ramp = [mix(Y[0], W[0], 0.5), mix(Y[1], W[2], 0.4), mix(Y[2], T[1], 0.3), mix(Y[3], T[3], 0.3), Y[4]];

function digTent(p: Px): void {
  // Giebelstangen und Firstwimpel
  p.rect(23, 1, 2, 8, W[2]); p.rect(23, 1, 1, 8, W[3]); p.poly([[25, 1], [31, 3], [25, 5]], ARC[2]); p.line(25, 1, 30, 3, ARC[3]); p.set(26, 3, Y[3]);
  // Vorderwand mit offenem Eingang
  for (let y = 20; y < 41; y++) for (let x = 5; x < 43; x++) { const n = rnd2(x >> 1, y >> 1, 5), sh = x > 30; p.set(x, y, (x - 5) % 9 === 8 ? K[sh ? 1 : 2] : n > 0.88 ? K[sh ? 3 : 4] : K[sh ? 2 : 3]); }
  p.poly([[24, 21], [33, 41], [15, 41]], P.shadow[0]); p.poly([[24, 25], [29, 41], [19, 41]], P.shadow[1]);
  // Blick ins Innere: Kiste, Laterne
  p.rect(20, 34, 6, 6, W[1]); p.rect(20, 34, 6, 1, W[3]); p.rect(22, 34, 1, 6, W[0]); p.rect(26, 30, 2, 3, Y[3]); p.set(26, 30, WHITE); p.rect(26, 29, 2, 1, I[1]); p.rect(26, 33, 2, 1, I[1]);
  p.poly([[24, 20], [17, 34], [13, 41], [16, 41], [21, 32]], K[4]); p.line(24, 20, 14, 41, K[2]); p.poly([[24, 20], [31, 34], [35, 41], [32, 41], [27, 32]], K[2]); p.line(24, 20, 34, 41, K[0]);
  p.px([18, 33, 30, 33], T[1]); p.px([18, 34, 30, 34], T[3]);
  for (let x = 5; x < 43; x++) if (p.get(x, 39) >>> 24 && !(x > 13 && x < 36)) { p.set(x, 38, x % 4 < 2 ? ARC[1] : ARC[2]); p.set(x, 39, ARC[0]); p.set(x, 40, K[1]); }
  p.rect(36, 27, 4, 4, mix(K[1], TERRA[1], 0.5)); p.px([36, 27, 39, 30], K[0]); p.rect(8, 30, 3, 3, K[2]); p.set(8, 30, K[0]);
  // Dachplane mit verblichenen Streifen, durchhängende Traufe
  over(p, (l) => {
    l.poly([[10, 7], [38, 7], [46, 21], [2, 21]], MARK);
    texFill(l, MARK, (x, y) => {
      const t = (y - 7) / 14, xl = 10 - t * 8, xr = 38 + t * 8, s = (x - xl) / (xr - xl), st = Math.floor(s * 9), n = rnd2(x >> 1, y >> 1, 3), sag = Math.sin(s * 9 * Math.PI) > 0.6 ? 1 : 0;
      if (y >= 21 - sag && y > 19) return 0;
      let tone = 3 + (s < 0.3 ? 1 : s > 0.72 ? -1 : 0) - (y > 18 ? 1 : 0);
      if (n > 0.9) tone--;
      const c = K[Math.max(0, Math.min(4, tone))];
      return st % 2 ? mix(c, ARC[2], 0.34) : c;
    });
    for (let x = 10; x <= 38; x++) { l.set(x, 6, K[4]); l.set(x, 7, K[x % 5 === 0 ? 2 : 3]); }
    l.rect(27, 12, 4, 3, mix(K[2], TERRA[2], 0.4)); l.px([27, 12, 30, 14], K[0]);
  });
  // Eckstangen, Spannseile, Heringe, Sandsäcke
  p.rect(4, 20, 2, 21, W[2]); p.rect(4, 20, 1, 21, W[3]); p.rect(42, 20, 2, 21, W[1]); p.rect(42, 20, 1, 21, W[2]);
  p.line(2, 21, 0, 41, T[3]); p.line(46, 21, 47, 41, T[2]); p.rect(0, 41, 2, 2, W[2]); p.rect(46, 41, 2, 2, W[1]);
  over(p, (l) => { l.ball(9, 41, 4, 2.4, [T[0], T[1], T[2], T[3], T[4]]); l.ball(39, 41.4, 3.6, 2.2, [T[0], T[1], T[2], T[3], T[4]]); l.px([7, 40, 38, 41], T[1]); });
}
function digTable(p: Px): void {
  // Böcke und Platte
  for (const x of [4, 25]) { p.line(x, 23, x + 2, 16, W[1], 2); p.line(x + 4, 23, x + 2, 16, W[1], 2); p.line(x, 23, x + 2, 16, W[3]); p.rect(x, 20, 5, 1, W[2]); }
  p.rect(1, 9, 30, 7, MARK); planks(p, 1, 9, 30, 7, { ramp: T, pw: 4, seed: 4, mark: MARK, worn: 0.6 }); p.rect(1, 16, 30, 2, W[2]); p.rect(1, 16, 30, 1, W[1]); p.rect(1, 9, 30, 1, T[4]);
  // Karte mit Tintenlinien und Markierung, Steine als Beschwerer
  p.rect(3, 10, 14, 5, C[3]); p.rect(3, 10, 14, 1, C[4]); p.rect(3, 14, 14, 1, C[2]); p.px([16, 10, 16, 11], C[1]); p.set(17, 10, C[3]);
  p.line(5, 13, 8, 11, ARC[2]); p.line(8, 11, 11, 12, ARC[2]); p.line(11, 12, 14, 11, ARC[1]); p.px([6, 11, 12, 13], T[2]); p.px([13, 12, 14, 13, 14, 11, 12, 13], P.red[2]); p.set(13, 12, P.red[3]); p.rect(3, 13, 2, 2, SAND[2]); p.set(3, 13, SAND[4]);
  // Funde: kleine Amphore, Goldamulett, Scherbe; Pinsel und Lupe
  over(p, (l) => { l.ball(22.5, 8, 2.4, 3, TERRA); l.rect(22, 3, 2, 2, TERRA[3]); l.rect(21, 3, 4, 1, TERRA[4]); l.rect(21, 7, 4, 1, ARC[2]); l.rect(22, 11, 2, 1, TERRA[1]); });
  p.px([27, 12, 28, 11, 29, 12, 28, 13], Y[3]); p.set(28, 12, ARC[4]); p.set(27, 11, Y[4]); p.px([26, 14, 27, 14], TERRA[3]);
  p.line(18, 14, 20, 12, W[3]); p.set(21, 11, C[4]); p.px([18, 11, 19, 10, 20, 11, 19, 12], I[3]); p.set(19, 11, alpha(P.ice[3], 255));
  // Hocker mit Notizbuch
  p.rect(12, 19, 8, 2, W[3]); p.rect(12, 19, 8, 1, W[4]); p.rect(13, 21, 1, 3, W[1]); p.rect(18, 21, 1, 3, W[1]); p.rect(14, 18, 4, 1, ARC[1]); p.set(14, 18, ARC[3]);
}
function crate(l: Px, x: number, y: number, w: number, h: number, seed: number): void {
  l.rect(x, y, w, h, MARK); planks(l, x, y, w, h, { ramp: T, pw: 4, seed, mark: MARK, worn: 0.7 });
  l.rect(x, y, w, 2, T[3]); l.rect(x, y, w, 1, T[4]); l.rect(x, y + h - 1, w, 1, W[1]); l.rect(x, y, 1, h, W[2]); l.rect(x + w - 1, y, 1, h, W[1]);
  l.line(x + 1, y + 2, x + w - 2, y + h - 2, W[2]); l.px([x + 1, y + 1, x + w - 2, y + 1, x + 1, y + h - 2, x + w - 2, y + h - 2], I[2]);
}
function digCrates(p: Px): void {
  over(p, (l) => crate(l, 13, 11, 10, 11, 5));
  over(p, (l) => { crate(l, 1, 9, 14, 13, 3); glyph(l, 6, 13, 3, ARC[1]); });
  // offene Kiste obenauf: Stroh und ein Fund mit blauer Glasur
  over(p, (l) => {
    crate(l, 4, 3, 10, 7, 8); l.rect(5, 2, 8, 2, Y[2]);
    for (let x = 4; x < 14; x++) { const h = hash2(x, 1, 6) & 3; l.set(x, 2 - (h === 0 ? 1 : 0), h & 1 ? Y[3] : Y[2]); if (h === 2) l.set(x, 1, Y[4]); }
    l.ball(9, 0.6, 2.2, 2.4, [ARC[0], ARC[1], ARC[2], ARC[3], ARC[4]]); l.rect(8, 2, 3, 1, Y[3]);
  });
  // Spaten lehnt an
  over(p, (l) => { l.line(22, 2, 21, 15, W[3]); l.line(23, 2, 22, 15, W[1]); l.rect(21, 0, 3, 2, W[2]); l.set(21, 0, W[4]); l.poly([[19, 15], [24, 15], [23, 21], [21, 22], [20, 21]], I[2]); l.line(20, 16, 20, 20, I[4]); l.line(23, 16, 23, 20, I[1]); });
  p.px([2, 21, 16, 21], SAND[2]);
}
function brazierBlue(p: Px, f: number): void {
  // Sockel mit Runenband, Bronzeschale
  slab(p, 3, 23, 10, 5, 1, 3);
  p.rect(5, 14, 6, 9, MARK); stoneFill(p, SAND, 4); p.rect(5, 14, 6, 1, SAND[1]); p.rect(4, 21, 8, 2, SAND[3]); p.rect(4, 22, 8, 1, SAND[1]);
  glyph(p, 7, 16, f, f === 1 ? ARC[4] : ARC[3], f === 1 ? WHITE : undefined);
  over(p, (l) => {
    l.poly([[1, 9], [15, 9], [12, 14], [4, 14]], BRONZE[2]); l.poly([[1, 9], [6, 9], [6, 14], [4, 14]], BRONZE[3]); l.poly([[12, 9], [15, 9], [12, 14], [11, 14]], BRONZE[1]);
    l.rect(1, 8, 14, 2, BRONZE[3]); l.rect(1, 8, 14, 1, BRONZE[4]); l.rect(3, 8, 10, 1, ARC[1]); l.px([3, 11, 7, 12, 11, 11], BRONZE[4]); l.px([4, 12, 8, 11, 12, 12], BRONZE[0]);
  });
  flame(p, 8, 9, 4.2, 8, f, [ARC[0], ARC[1], ARC[2], ARC[3], mix(ARC[5], WHITE, 0.5)]);
  inkOutline(p);
  glow(p, 8, 5, 8 + (f & 1), ARC[3], 62 + (f === 1 ? 14 : f === 3 ? -8 : 0));
  glow(p, 8, 10, 5, ARC[4], 34, true);
}
function floatingRune(p: Px, f: number): void {
  // Fassung im Boden
  over(p, (l) => { l.ell(6, 14.4, 4, 1.6, SAND[2]); l.rect(3, 13, 6, 1, SAND[4]); l.px([4, 14, 7, 14], Y[2]); l.set(6, 14, ARC[3]); });
  inkOutline(p);
  const dy = [0, -1, -2, -1][f], lv = [0, 1, 2, 1][f], G = [ARC[3], ARC[4], ARC[5]][lv], y = 4 + dy;
  glow(p, 6, y + 3, 5.5 + lv * 0.5, ARC[2], 60 + lv * 14);
  // Zeichen: Raute mit Mittelstab und Querhaken
  const pts = [[5, 0], [6, 0], [4, 1], [7, 1], [3, 2], [8, 2], [4, 3], [7, 3], [5, 4], [6, 4], [5, 5], [6, 5], [4, 6], [5, 6], [6, 6], [7, 6], [5, 7], [6, 7], [5, 2], [6, 2]];
  for (const [x, yy] of pts) for (const [i, j] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) p.blend(x + i, y + yy + j, alpha(ARC[2], 150));
  for (const [x, yy] of pts) p.set(x, y + yy, x === 5 ? G : mix(G, ARC[2], 0.3));
  p.set(5, y + 2, WHITE); if (lv === 2) p.set(6, y + 5, WHITE);
  // kreisende Funken, Lichtfaden zur Fassung
  const a = (f / 4) * Math.PI * 2;
  p.set(6 + Math.cos(a) * 5, y + 4 + Math.sin(a) * 2.4, alpha(ARC[5], 230)); p.set(6 - Math.cos(a) * 5, y + 4 - Math.sin(a) * 2.4, alpha(ARC[3], 200));
  p.blend(6, 12, alpha(ARC[3], 90 + lv * 30)); p.blend(6, 13 - (f & 1), alpha(ARC[4], 120));
  void INK;
}

export function ruCamp(out: Frames): void {
  one(out, 'dig_tent', 48, 44, digTent); one(out, 'dig_table', 32, 24, digTable); one(out, 'dig_crates', 24, 22, digCrates);
  anim(out, 'brazier_blue', 4, 16, 28, brazierBlue, false); anim(out, 'floating_rune', 4, 12, 16, floatingRune, false);
}
