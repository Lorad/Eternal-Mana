/** Glutlande – Gebautes (v2): Schmiedenruine, Nomadenzelt, Banner, Feuerschale, Wasserschläuche, Steinmal. */
import { Px } from '../draw';
import { Frames, INK, MARK, P, Ramp, WHITE, anim, boulder, clamp, embers, flame, glow, hash2, inkOutline, masonry, mix, one, part, rnd2, shadeArea, texFill } from './kit';
import { ASH, BASALT, BASALT5, CHAR, HOT } from './gl_nature';

const A = P.ash, F = P.fire, Y = P.gold, T = P.tan, W = P.wood, C = P.cream;
const SHADE = P.shadow[1];
/** Rotocker-Tuch (5) */
const OCHRE: Ramp = [mix(P.red[0], W[0], 0.45), mix(P.red[1], W[2], 0.4), mix(P.red[2], F[1], 0.35), mix(P.red[3], Y[2], 0.35), mix(P.red[4], T[4], 0.45)];
/** Gehämmerte Bronze (5) */
const BRONZE: Ramp = [mix(Y[0], W[0], 0.5), mix(Y[1], W[2], 0.35), mix(Y[2], T[2], 0.3), mix(Y[3], T[3], 0.2), Y[4]];
/** Dunkles, sonnengebleichtes Stangenholz (5) */
const POLE: Ramp = [mix(W[0], A[0], 0.4), mix(W[1], A[2], 0.35), mix(W[2], A[3], 0.3), mix(W[3], A[4], 0.3), mix(W[4], C[2], 0.3)];
/** Heller Mal-/Werkstein (5) */
const SLAB: Ramp = [A[1], mix(A[3], P.stone[1], 0.5), mix(A[4], P.stone[2], 0.5), mix(P.stone[3], C[1], 0.3), mix(P.stone[4], C[2], 0.3)];

function pole(p: Px, x: number, y0: number, y1: number, w = 2, R: Ramp = POLE): void {
  p.rect(x, y0, w, y1 - y0 + 1, R[2]); p.rect(x, y0, 1, y1 - y0 + 1, R[3]); if (w > 1) p.rect(x + w - 1, y0, 1, y1 - y0 + 1, R[1]);
  for (let y = y0 + 3; y < y1 - 1; y += 5) p.set(x + (hash2(x, y, 2) % w), y, R[1]);
  p.rect(x, y0, w, 1, R[4]);
}

// ---------------------------------------------------------------- Schmiedenruine
function forgeRuin(p: Px): void {
  const MAS: Ramp = BASALT5;
  // Sockelblock
  part(p, (l) => {
    l.poly([[3, 24], [40, 24], [41, 46], [2, 46]], MARK); masonry(l, 2, 24, 40, 22, { ramp: MAS, bh: 5, bw: 8, seed: 27, rough: 0.5, mark: MARK });
    shadeArea(l, (x, y) => x > 33, SHADE, 0.35); shadeArea(l, (x, y) => x < 8 && y < 44, WHITE, 0.06);
    // ausgebrochene Ecke rechts oben
    for (const [x, y] of [[38, 24], [39, 24], [40, 24], [39, 25], [40, 25], [40, 26], [40, 27]] as const) l.set(x, y, 0);
    // Feuermaul: Rundbogen mit Keilsteinen, innen Restglut
    l.rect(15, 33, 13, 13, A[0]); l.ell(21.5, 33.5, 6.5, 4.5, A[0]);
    for (let k = 0; k <= 8; k++) { const a = Math.PI * (1 + k / 8), x = 21.5 + Math.cos(a) * 7.6, y = 34 + Math.sin(a) * 5.6; l.rect(x - 1, y - 1, 2, 2, k % 2 ? MAS[3] : MAS[4]); l.set(x, y, MAS[2]); }
    l.rect(13, 34, 2, 12, MAS[3]); l.rect(13, 34, 1, 12, MAS[4]); l.rect(28, 34, 2, 12, MAS[2]); l.px([13, 38, 14, 42, 28, 39, 29, 43], MAS[1]);
    embers(l, 16, 42, 11, 3, 1, 5); l.rect(15, 45, 13, 1, MAS[1]);
    l.px([17, 41, 22, 41, 25, 40], HOT[2]); l.set(20, 41, HOT[4]);
    // Rost aus Eisenstäben
    for (let x = 16; x < 28; x += 3) { l.rect(x, 37, 1, 5, mix(P.steel[0], INK, 0.2)); l.set(x, 37, P.steel[1]); }
    // Rußfahne über dem Maul
    shadeArea(l, (x, y) => y < 30 && y > 24 && Math.abs(x - 21.5) < 8 - (30 - y), INK, 0.4);
  });
  // Gesims
  part(p, (l) => { l.rect(1, 21, 37, 4, MAS[3]); l.rect(1, 21, 37, 1, MAS[4]); l.rect(1, 24, 37, 1, MAS[1]); for (let x = 5; x < 37; x += 7) l.set(x, 22, MAS[1]); l.rect(33, 21, 5, 4, MAS[2]); l.set(37, 21, 0); l.set(37, 22, 0); });
  // Esse: verjüngter Schlot, oben abgebrochen
  part(p, (l) => {
    l.poly([[8, 21], [11, 8], [12, 3], [15, 5], [17, 1], [20, 4], [23, 2], [25, 6], [28, 5], [29, 9], [32, 21]], MARK);
    masonry(l, 6, 0, 28, 21, { ramp: MAS, bh: 4, bw: 6, seed: 31, rough: 0.6, mark: MARK });
    shadeArea(l, (x, y) => x > 25 + (y > 9 ? (y - 9) * 0.3 : 0), SHADE, 0.35);
    l.px([12, 3, 17, 1, 23, 2, 28, 5], MAS[4]);
    // Riss mit Glutschimmer
    for (const [x, y] of [[26, 8], [26, 9], [25, 10], [25, 11], [26, 12], [26, 13], [27, 14]] as const) l.set(x, y, y > 11 ? HOT[1] : A[0]);
  });
  // Runentafel aus Bronze, schief hängend
  part(p, (l) => {
    l.poly([[14, 9], [25, 8], [26, 19], [15, 20]], BRONZE[1]); l.poly([[15, 10], [24, 9], [25, 18], [16, 19]], BRONZE[2]);
    l.line(14, 9, 25, 8, BRONZE[4]); l.line(14, 10, 15, 20, BRONZE[3]); l.line(15, 20, 26, 19, BRONZE[0]);
    l.px([15, 10, 24, 9, 16, 19, 25, 18], BRONZE[4]);
    // Grünspan
    l.px([23, 16, 24, 17, 22, 17, 17, 11], mix(BRONZE[2], P.teal[2], 0.55)); l.set(23, 17, mix(BRONZE[1], P.teal[1], 0.5));
    // glühende Runen: Flamme über Amboss, zwei Zeichen
    for (const [x, y] of [[20, 11], [19, 12], [20, 12], [21, 13], [19, 13], [20, 14], [18, 15], [19, 15], [20, 15], [21, 15], [22, 15], [20, 16], [19, 17], [21, 17]] as const) l.set(x, y, y < 13 ? HOT[5] : HOT[4]);
    l.px([17, 13, 17, 14, 23, 12, 23, 13], HOT[3]); l.px([20, 13], BRONZE[2]);
  });
  // Trümmer, Schlackehaufen, Amboss-Stumpf
  part(p, (l) => { boulder(l, 4, 47, 8, 6, { ramp: MAS, seed: 3, cracks: 0 }); boulder(l, 38.5, 47, 9, 7, { ramp: MAS, seed: 5, cracks: 0 }); boulder(l, 33, 47, 5, 4, { ramp: MAS, seed: 7, cracks: 0 }); });
  p.px([9, 46, 10, 46, 30, 46], MAS[2]); p.set(37, 43, HOT[1]);
  for (let x = 0; x < 44; x++) if (rnd2(x, 3, 9) < 0.3) p.set(x, 46, ASH[1 + (hash2(x, 1, 3) & 1)]);
  inkOutline(p);
  glow(p, 21.5, 41, 8, F[1], 44); glow(p, 20, 14, 7, F[2], 26);
  // Widerschein der Runen auf der Tafel
  for (let y = 9; y < 20; y++) for (let x = 15; x < 26; x++) { const c = p.get(x, y); if (c === BRONZE[2]) p.set(x, y, mix(c, F[2], Math.hypot(x - 20, y - 14) < 3.5 ? 0.3 : 0.1)); }
}

// ---------------------------------------------------------------- Nomadenzelt
function nomadTent(p: Px): void {
  const K = OCHRE;
  // Rückwärtige Stangen, die durch das Dach stoßen
  pole(p, 13, 1, 12); pole(p, 33, 2, 12);
  p.px([13, 0, 14, 0], Y[3]); p.px([33, 1, 34, 1], Y[2]); p.px([12, 3, 15, 4, 32, 4, 35, 5], T[2]);    // Wimpelschnüre
  // Dachbahn: First hängt zwischen den Stangen durch, Traufe weit ausgestellt
  part(p, (l) => {
    const ridge = (x: number): number => 9 + Math.round(Math.sin(((x - 13) / 21) * Math.PI) * 1.6), eave = (x: number): number => 22 + Math.round(Math.sin(((x - 1) / 46) * Math.PI * 3) * 0.8);
    for (let x = 1; x < 47; x++) {
      const yt = x < 13 ? 9 + (13 - x) * 1.05 : x > 34 ? 9 + (x - 34) * 1.05 : ridge(x);
      for (let y = Math.round(yt); y <= eave(x); y++) l.set(x, y, MARK);
    }
    texFill(l, MARK, (x, y) => {
      const v = (y - 9) / 13, u = (x - 24) / 23, seam = Math.abs(((x - 24) * (1 - v * 0.22) + 48) % 8) < 1;
      const band = y >= 17 && y <= 19, n = rnd2(x >> 1, y >> 1, 3);
      let tone = u < -0.25 ? 3 : u < 0.35 ? 2 : 1;
      if (v < 0.2) tone += 1; if (seam) tone -= 1; else if (n > 0.86) tone += 1; else if (n < 0.1) tone -= 1;
      if (band) { const z = (x + (y - 17)) % 4; return y === 18 ? (z < 2 ? C[3] : P.teal[2]) : u > 0.35 ? Y[1] : Y[2]; }
      return K[clamp(tone, 0, 4)];
    });
    // Traufsaum mit Fransen
    for (let x = 1; x < 47; x++) { const y = eave(x); l.set(x, y, x % 3 === 0 ? Y[3] : K[1]); if (x % 3 === 0) l.set(x, y + 1, Y[2]); else if (x % 3 === 1) l.set(x, y + 1, K[0]); }
    // Flicken und Brandloch
    l.rect(37, 14, 3, 3, mix(K[1], C[1], 0.4)); l.px([37, 14, 39, 16], K[0]); l.px([7, 15, 8, 15, 8, 16], A[0]); l.set(7, 16, HOT[1]);
  });
  // Vorderwand unter der Traufe
  part(p, (l) => {
    l.poly([[4, 23], [44, 23], [45, 41], [3, 41]], MARK);
    texFill(l, MARK, (x, y) => { const u = (x - 24) / 21, seam = x % 7 === 3, n = rnd2(x >> 1, y >> 1, 7); let tone = u < -0.3 ? 2 : u < 0.4 ? 2 : 1; if (y < 26) tone -= 1; if (seam) tone -= 1; else if (n > 0.88) tone += 1; return K[clamp(tone, 0, 4)]; });
    // Zierborte am Boden
    for (let x = 3; x < 46; x++) if (l.get(x, 39) >>> 24) { l.set(x, 38, x % 4 < 2 ? Y[2] : C[3]); l.set(x, 39, K[0]); }
    // Eingang: dunkles Inneres, Teppich, Lampenschimmer
    l.poly([[18, 41], [19, 26], [29, 26], [30, 41]], P.shadow[0]); l.poly([[20, 41], [21, 29], [27, 29], [28, 41]], mix(P.shadow[1], P.red[0], 0.4));
    l.rect(22, 36, 3, 3, mix(F[1], P.shadow[1], 0.45)); l.set(23, 36, F[3]); l.set(23, 35, F[2]);
    l.rect(19, 40, 11, 1, P.teal[1]); l.px([20, 40, 23, 40, 26, 40, 29, 40], Y[2]);
    // zurückgeschlagene Zeltbahn links, hängende rechts
    l.poly([[19, 26], [22, 26], [20, 34], [17, 41], [15, 41], [17, 33]], K[3]); l.line(19, 26, 15, 41, K[4]); l.line(22, 27, 18, 40, K[1]); l.px([18, 33, 19, 33], T[2]);
    l.poly([[27, 26], [30, 26], [31, 41], [29, 41]], K[1]); l.line(30, 26, 31, 41, K[0]);
  });
  // Eckstangen vorn, Abspannseile, Pflöcke
  pole(p, 3, 22, 41, 2); pole(p, 44, 22, 41, 2);
  p.line(2, 23, 0, 41, T[2]); p.line(46, 23, 47, 41, T[1]); p.rect(0, 41, 2, 2, POLE[2]); p.set(0, 41, POLE[4]); p.rect(46, 41, 2, 2, POLE[1]);
  // Gepäck: Wasserkrug und Deckenrolle neben dem Eingang
  part(p, (l) => { l.ball(36.5, 38.5, 3, 3.4, [W[0], mix(F[0], W[1], 0.5), mix(F[1], T[1], 0.5), mix(F[2], T[2], 0.5), T[4]], 1, 4); l.rect(35, 34, 3, 2, mix(F[1], T[1], 0.5)); l.rect(35, 34, 3, 1, T[3]); });
  part(p, (l) => { l.rect(7, 38, 7, 4, P.teal[1]); l.rect(7, 38, 7, 1, P.teal[2]); l.px([9, 38, 9, 39, 9, 40, 9, 41, 12, 38, 12, 39, 12, 40, 12, 41], C[3]); l.set(7, 38, P.teal[3]); });
}

// ---------------------------------------------------------------- Banner
function nomadBanner(p: Px, f: number): void {
  pole(p, 2, 3, 43, 2); p.rect(1, 43, 4, 1, POLE[1]);
  // Hornspitze und Querstange mit Federn
  p.px([2, 2, 3, 1, 3, 0], P.bone[3]); p.set(2, 1, P.bone[4]); p.set(3, 2, P.bone[2]);
  p.rect(2, 5, 13, 1, POLE[3]); p.rect(2, 6, 13, 1, POLE[1]); p.set(14, 5, Y[3]);
  const fo = [0, 1, 0, -1][f];
  p.px([14, 7, 14, 8, 14 + fo, 9], P.bone[3]); p.set(14 + fo, 10, P.red[2]);
  // Tuch: zerfetzter Saum (Spaltenlängen), Brandlöcher; Spalten mit wanderndem Wellenversatz
  const LEN = [24, 27, 21, 26, 28, 19, 25, 22, 26];
  for (let x = 5; x < 14; x++) {
    const u = (x - 5) / 8, ph = (f * Math.PI) / 2 - u * 2.3, dy = Math.round(Math.sin(ph) * (0.4 + u * 1.4)), light = Math.cos(ph), len = LEN[x - 5];
    for (let j = 0; j < len; j++) {
      const y = 7 + j + (j > 3 ? dy : 0);
      if ((x === 11 && j > 13 && j < 16) || (x === 10 && j === 14) || (x === 7 && j === 21)) continue;                  // Löcher
      let c = light > 0.45 ? P.red[3] : light < -0.45 ? P.red[1] : P.red[2];
      if (x === 5 || x === 13) c = light > 0 ? Y[2] : Y[1];
      else if (j === 2 || j === 3) c = j === 2 ? Y[2] : mix(P.red[1], INK, 0.2);
      else if (j >= len - 2) c = mix(c, A[1], j === len - 1 ? 0.7 : 0.4);                                              // versengter Saum
      p.set(x, y, c);
    }
    // Sonnen-/Flammenzeichen
    const e = (dx: number, dyy: number, c: number): void => { if (x === 9 + dx) p.set(x, 17 + dyy + dy, c); };
    for (const [dx, dyy] of [[0, -1], [-1, 0], [0, 0], [1, 0], [0, 1], [0, -3], [0, 3], [-3, 0], [3, 0], [-2, -2], [2, -2], [-2, 2], [2, 2]] as const) e(dx, dyy, Math.abs(dx) + Math.abs(dyy) > 1 ? Y[3] : Y[4]);
    e(0, 0, WHITE);
  }
  // Schnurwicklung an der Stange
  p.rect(2, 20, 2, 1, T[2]); p.rect(2, 22, 2, 1, T[1]);
}

// ---------------------------------------------------------------- Feuerschale
function nomadBrazier(p: Px, f: number): void {
  const IR: Ramp = [mix(P.steel[0], INK, 0.3), P.steel[0], mix(P.steel[1], A[3], 0.3), P.steel[2]];
  // Dreibein
  part(p, (l) => {
    l.line(5, 14, 2, 24, IR[2]); l.line(6, 14, 3, 24, IR[1]); l.line(10, 14, 13, 24, IR[1]); l.line(11, 14, 14, 24, IR[0]); l.line(8, 15, 8, 23, IR[1]); l.line(7, 15, 7, 23, IR[2]);
    l.rect(4, 19, 9, 1, IR[1]); l.px([4, 19, 7, 19], IR[3]); l.px([2, 24, 3, 24, 13, 24, 14, 24, 7, 23, 8, 23], IR[0]);
  });
  // Schale: gehämmerte Bronze, Zackenrand
  part(p, (l) => {
    for (let y = 9; y <= 15; y++) { const t = (y - 9) / 6, hw = 7 * Math.sqrt(1 - t * t * 0.86) - (y === 15 ? 1 : 0); for (let x = Math.round(8 - hw); x < Math.round(8 + hw); x++) {
      const u = (x + 0.5 - 8) / hw, lit = -(u * 0.6 + (t - 0.3) * 0.8);
      let tone = lit > 0.5 ? 4 : lit > 0.15 ? 3 : lit > -0.35 ? 2 : 1;
      if (((x * 3 + y * 5) % 7 === 0) && tone > 1) tone -= 1; else if ((x * 5 + y * 3) % 11 === 0 && tone < 4) tone += 1;      // Hammerschlag
      l.set(x, y, BRONZE[tone]);
    } }
    l.rect(1, 8, 14, 1, BRONZE[3]); l.rect(1, 9, 14, 1, BRONZE[1]); l.px([1, 8, 2, 8, 5, 8], BRONZE[4]); l.px([13, 8, 14, 8], BRONZE[2]);
    for (let x = 1; x < 15; x += 2) l.set(x, 7, x < 7 ? BRONZE[4] : BRONZE[2]);
    // Punzband
    for (let x = 3; x < 13; x += 2) l.set(x, 11, BRONZE[0]); l.px([4, 12, 8, 13, 11, 12], HOT[2]);
  });
  embers(p, 3, 7, 10, 1, f, 3); p.px([2, 7, 13, 7], BRONZE[3]);
  const fl = new Px(p.w, p.h); flame(fl, 8, 8, 3.2, 8, f); flame(fl, 5, 8, 1.5, 4, f + 1); flame(fl, 11, 8, 1.4, 3, f + 3);
  inkOutline(p); p.draw(fl);
  glow(p, 8, 5, 8 + (f & 1), F[2], 60 + (f === 1 ? 12 : 0));
  // Feuerschein auf dem Schalenrand
  for (let x = 2; x < 14; x++) { const c = p.get(x, 8); if (BRONZE.includes(c)) p.set(x, 8, mix(c, F[4], 0.4)); }
}

// ---------------------------------------------------------------- Wasserschläuche, Steinmal
function waterSkins(p: Px): void {
  const L: Ramp = [mix(W[0], A[0], 0.3), mix(W[1], P.red[0], 0.25), mix(W[2], T[1], 0.4), mix(T[2], W[3], 0.4), mix(T[3], C[2], 0.3)];
  part(p, (l) => { pole(l, 1, 2, 14, 2); pole(l, 13, 3, 14, 2); l.px([0, 1, 3, 1, 12, 2, 15, 2], POLE[3]); l.rect(0, 3, 16, 1, POLE[3]); l.rect(0, 4, 16, 1, POLE[1]); l.px([1, 3, 13, 3], T[2]); l.px([1, 15, 2, 15, 13, 15, 14, 15], POLE[1]); });
  const skin = (x: number, y: number, w: number, h: number, k: number): void => { part(p, (l) => {
    l.rect(x + (w >> 1), y - 2, 1, 2, T[1]);
    l.ball(x + w / 2, y + h * 0.6, w / 2, h * 0.45, L, 1, 4); l.rect(x + (w >> 1) - 1, y, 2, Math.round(h * 0.4), L[2]); l.set(x + (w >> 1) - 1, y, L[4]);
    l.rect(x + (w >> 1) - 1, y, 2, 1, k === 1 ? Y[2] : W[1]); l.set(x + 1, y + h - 2, L[1]); l.set(x + (w >> 1), y + h - 1, L[0]);
    for (let j = 2; j < h - 1; j += 2) l.set(x + w - 2, y + j, L[1]);                       // Naht
  }); };
  skin(3, 6, 4, 7, 0); skin(7, 6, 5, 9, 1); skin(10, 6, 3, 6, 2);
  p.set(9, 15, P.ice[2]);
}
function cairn(p: Px): void {
  const st = (cx: number, y: number, w: number, h: number, k: number): void => { part(p, (l) => {
    const x0 = Math.round(cx - w / 2);
    l.rrect(x0, y, w, h, SLAB[2]); l.rect(x0 + 1, y, w - 2, 1, SLAB[4]); l.rect(x0 + 1, y + 1, Math.max(1, Math.round(w * 0.5)), 1, SLAB[3]); l.rect(x0 + 1, y + h - 1, w - 2, 1, SLAB[1]); l.rect(x0 + w - 1, y + 1, 1, h - 2, SLAB[1]);
    if (w > 5) { l.set(x0 + 2 + (hash2(k, 1, 3) % (w - 4)), y + (h >> 1), SLAB[1]); if (k % 2) l.set(x0 + w - 3, y + 1, SLAB[3]); }
  }); };
  st(7, 15, 12, 4, 0); st(6.5, 11, 10, 4, 1); st(7.5, 8, 8, 3, 2); st(7, 5, 6, 3, 3); st(7.5, 3, 4, 2, 4); st(7, 1, 2, 2, 5);
  // rotes Stoffband um den vierten Stein
  p.rect(4, 6, 6, 1, P.red[2]); p.set(4, 6, P.red[3]); p.px([10, 7, 11, 8, 11, 9], P.red[2]); p.set(12, 9, P.red[1]); p.set(10, 6, P.red[1]);
  p.px([1, 18, 12, 18], ASH[2]); p.set(2, 18, ASH[3]);
  shadeArea(p, (x, y) => y > 16 && SLAB.includes(p.get(x, y)), F[0], 0.14);
}
void BASALT; void CHAR;

export function glCamp(out: Frames): void {
  one(out, 'forge_ruin', 44, 48, forgeRuin, false);
  one(out, 'nomad_tent', 48, 44, nomadTent);
  anim(out, 'nomad_banner', 4, 16, 44, nomadBanner);
  anim(out, 'nomad_brazier', 4, 16, 26, nomadBrazier, false);
  one(out, 'water_skins', 16, 16, waterSkins, false);
  one(out, 'cairn', 14, 20, cairn, false);
}
