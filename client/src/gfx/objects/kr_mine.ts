/** Kristallhöhlen – Grubenbau (v2): Stollenportal, Lore, Gleis, Erzkiste, Hackengestell, Grubenlaterne. */
import { Px } from '../draw';
import { Frames, MARK, P, Ramp, WHITE, anim, boulder, clamp, glow, hash2, inkOutline, mix, moss, one, part, planks, rnd2, shadeArea, texFill } from './kit';
import { CAVEROCK, CYAN, MAGENTA, MINEWOOD, RUST, prism } from './kr_kit';

const MW = MINEWOOD, I = RUST, T = P.tan, Y = P.gold, TL = P.teal;
const SHADE = P.shadow[2];
const LICHEN: Ramp = [mix(TL[0], P.steel[0], 0.3), TL[1], TL[2], TL[3], TL[4]];

/** Kantholz senkrecht: Lichtkante links, Schattenkante rechts, Maserung, Schwundrisse. */
export function timberV(p: Px, x: number, y0: number, y1: number, w: number, R: Ramp = MW, seed = 1): void {
  for (let y = y0; y <= y1; y++) for (let i = 0; i < w; i++) {
    let tone = i === 0 ? 3 : i === w - 1 ? 1 : 2;
    const g = hash2(i, Math.floor((y + hash2(i, 1, seed) % 7) / 6), seed);
    if (i > 0 && i < w - 1) { if ((g & 255) < 56) tone = 1; else if (((g >> 8) & 255) < 30) tone = 3; }
    if (i === 0 && (g & 255) < 30) tone = 4;
    p.set(x + i, y, R[tone]);
  }
  p.rect(x, y0, w, 1, R[4]); p.set(x + w - 1, y0, R[3]);
}
/** Kantholz waagrecht: helle Oberseite, Front, dunkle Unterkante. */
export function timberH(p: Px, x0: number, x1: number, y: number, h: number, R: Ramp = MW, seed = 1): void {
  for (let x = x0; x <= x1; x++) for (let j = 0; j < h; j++) {
    let tone = j === 0 ? 4 : j === 1 && h > 3 ? 3 : j === h - 1 ? 1 : 2;
    const g = hash2(Math.floor((x + hash2(j, 2, seed) % 9) / 7), j, seed);
    if (j > 1 && j < h - 1) { if ((g & 255) < 60) tone = 1; else if (((g >> 8) & 255) < 36) tone = 3; }
    if (j === 0 && (g & 255) < 40) tone = 3;
    p.set(x, y + j, R[tone]);
  }
}
function bracket(p: Px, x: number, y: number, w: number, h: number): void {
  p.rect(x, y, w, h, I[2]); p.rect(x, y, w, 1, I[3]); p.rect(x, y + h - 1, w, 1, I[1]); p.rect(x + w - 1, y, 1, h, I[1]);
  p.set(x + 1, y + 1, I[4]); if (w > 3) p.set(x + w - 2, y + h - 2, I[4]);
}
/** Grubenlaterne: Eisenkäfig mit Glas, Flamme flackert (f 0..3). Oberkante des Käfigs bei (x, y), 5×8. */
function lantern(p: Px, x: number, y: number, f: number): void {
  p.rect(x + 1, y, 3, 1, I[3]); p.rect(x, y + 1, 5, 1, I[2]); p.set(x, y + 1, I[3]);
  p.rect(x, y + 2, 5, 5, Y[3]); p.rect(x, y + 2, 1, 5, I[2]); p.rect(x + 4, y + 2, 1, 5, I[1]);
  p.rect(x + 1, y + 2, 3, 1, mix(Y[2], I[1], 0.4));
  const fl = [0, 1, 0, -1][f & 3];
  p.rect(x + 2, y + 3 - (f === 1 ? 1 : 0), 1, 3, P.fire[4]); p.set(x + 2 + fl, y + 3, WHITE); p.set(x + 1, y + 5, P.fire[3]); p.set(x + 3, y + 5 - (f === 2 ? 1 : 0), P.fire[3]);
  p.px([x + 1, y + 6, x + 3, y + 6], P.fire[2]); p.set(x + 2, y + 6, P.fire[1]);
  p.rect(x, y + 7, 5, 1, I[1]); p.rect(x + 1, y + 7, 2, 1, I[2]);
}

// ---------------------------------------------------------------- Stollenportal
function mineSupport(p: Px): void {
  // hinterer Türstock (im Stollen, dunkler) und die Verzugsbretter der Firste
  const back = new Px(p.w, p.h);
  timberV(back, 11, 9, 46, 4, MW, 3); timberV(back, 33, 9, 46, 4, MW, 4);
  timberH(back, 8, 39, 6, 4, MW, 5);
  shadeArea(back, () => true, P.shadow[1], 0.5);
  inkOutline(back); p.draw(back);
  part(p, (l) => {
    l.poly([[9, 4], [39, 4], [46, 11], [2, 11]], MARK);
    texFill(l, MARK, (x, y) => {
      const u = (x - 24) / (15 + (y - 4) * 1), k = Math.floor((u + 1) * 4.5), m = (u + 1) * 4.5 - k, hb = hash2(k, 3, 9), base = 2 + ((hb & 3) === 0 ? 1 : (hb & 3) === 1 ? -1 : 0);
      const tone = m < 0.14 ? 0 : y === 4 ? 4 : m < 0.3 ? base + 1 : rnd2(x, y >> 1, 4) < 0.16 ? base - 1 : base;
      return MW[clamp(tone, 0, 4)];
    });
    shadeArea(l, (x, y) => y >= 9, SHADE, 0.25);
    // loses Brett steht über
    l.rect(30, 3, 5, 1, MW[3]); l.set(34, 3, MW[1]);
  });
  // vorderer Türstock: Stempel
  part(p, (l) => {
    timberV(l, 3, 15, 54, 6, MW, 11); timberV(l, 39, 15, 54, 6, MW, 12);
    // Kerben, Astlöcher, Wasserflecken
    l.px([5, 24, 5, 25, 6, 33, 41, 30, 42, 31, 43, 44], MW[0]); l.px([4, 40, 40, 22], MW[4]);
    shadeArea(l, (x, y) => y > 44, mix(P.teal[0], P.blue[0], 0.5), 0.28);
    moss(l, (x, y) => (y > 49 ? 0.6 : y > 44 ? 0.25 : 0), 4, LICHEN);
    // Fußkeile
    l.rect(1, 53, 3, 2, MW[2]); l.set(1, 53, MW[3]); l.rect(44, 53, 3, 2, MW[1]); l.set(44, 53, MW[2]);
  });
  // Kopfstreben
  part(p, (l) => {
    for (const s of [0, 1]) for (let i = 0; i < 9; i++) { const x = s ? 38 - i : 9 + i, y = 27 - i; l.rect(x, y, 1, 3, MW[2]); l.set(x, y, s ? MW[3] : MW[4]); l.set(x, y + 2, MW[1]); }
  });
  // Kappe (Querbalken) mit Hirnholz-Enden
  part(p, (l) => {
    timberH(l, 0, 47, 10, 7, MW, 21);
    for (const x of [0, 45]) { l.rect(x, 11, 3, 5, T[2]); l.rect(x, 11, 3, 1, T[3]); l.set(x + 1, 13, MW[1]); l.px([x, 15, x + 2, 12], MW[2]); }
    l.px([12, 13, 13, 13, 14, 14, 30, 14, 31, 13, 36, 15], MW[0]);                         // Schwundriss
    moss(l, (x, y) => (y < 12 && x > 34 ? 0.3 : 0), 6, LICHEN);
  });
  // Eisenwinkel und Seilbund an den Stößen
  part(p, (l) => { bracket(l, 2, 14, 8, 3); bracket(l, 38, 14, 8, 3); });
  for (const x of [3, 39]) { p.rect(x, 20, 6, 2, T[2]); p.rect(x, 20, 6, 1, T[3]); p.px([x + 1, 21, x + 3, 21, x + 5, 21], T[1]); p.set(x + 5, 22, T[2]); p.set(x + 5, 23, T[1]); }
  // Zunftschild: Brettchen mit Schlägel und Eisen
  part(p, (l) => {
    l.rect(20, 11, 9, 6, T[2]); l.rect(20, 11, 9, 1, T[4]); l.rect(20, 16, 9, 1, T[1]); l.rect(28, 12, 1, 5, T[1]);
    l.line(22, 15, 26, 12, MW[0]); l.line(26, 15, 22, 12, MW[0]); l.px([21, 12, 22, 12, 26, 12, 27, 12], I[4]); l.px([21, 13, 27, 13], I[2]);
    l.px([20, 11, 28, 11], I[3]);
  });
  // Laterne am Haken
  p.rect(15, 17, 1, 3, I[1]); p.set(14, 17, I[2]); p.set(16, 19, I[2]);
  part(p, (l) => lantern(l, 13, 20, 0));
  // Geröll am Fuß
  part(p, (l) => { boulder(l, 10.5, 55, 6, 4, { ramp: CAVEROCK, seed: 3, cracks: 0 }); boulder(l, 37, 55, 5, 3, { ramp: CAVEROCK, seed: 5, cracks: 0 }); });
  inkOutline(p);
  glow(p, 15.5, 24, 9, Y[3], 62);
  // Lichtsaum der Laterne auf Balken und Stempel
  for (let y = 15; y < 34; y++) for (let x = 6; x < 26; x++) { const c = p.get(x, y), d = Math.hypot(x - 15.5, y - 24); if (c >>> 24 >= 200 && d < 9 && d > 3 && (MW.includes(c) || T.includes(c))) p.set(x, y, mix(c, Y[3], d < 6 ? 0.3 : 0.15)); }
}

// ---------------------------------------------------------------- Erz
/** Erzhaufen: Brocken mit eingewachsenen Kristallspitzen, oberer Umriss gewölbt. Füllt x0..x1 über der Linie y. */
function oreHeap(p: Px, x0: number, x1: number, y: number, h: number, seed: number): void {
  const w = x1 - x0 + 1, R = CAVEROCK;
  part(p, (l) => {
    for (let x = x0; x <= x1; x++) {
      const u = ((x - x0 + 0.5) / w) * 2 - 1, top = Math.round(y - h * Math.sqrt(Math.max(0, 1 - u * u)) * (0.75 + rnd2(x >> 1, 1, seed) * 0.3));
      for (let yy = top; yy <= y; yy++) {
        const cell = hash2((x + (yy >> 1)) >> 1, yy >> 1, seed), lit = (yy - top) / Math.max(1, y - top);
        let tone = yy === top ? 4 : lit < 0.4 ? 3 : 2;
        if ((cell & 7) === 0) tone -= 1; else if ((cell & 7) === 1) tone += 1;
        if (u > 0.5) tone -= 1;
        l.set(x, yy, R[clamp(tone, 0, 4)]);
      }
    }
  });
  const n = Math.max(3, Math.round(w / 4));
  for (let k = 0; k < n; k++) {
    const x = x0 + 1.5 + ((k + 0.5) / n) * (w - 3) + (rnd2(k, 2, seed) - 0.5) * 2, u = ((x - x0) / w) * 2 - 1, yy = y - h * Math.sqrt(Math.max(0, 1 - u * u)) * 0.7;
    const R2 = k % 3 === 1 ? MAGENTA : CYAN, len = 2.5 + rnd2(k, 3, seed) * 2.5;
    part(p, (l) => prism(l, x, yy + 1, x + u * 2.2, yy - len, 1.25, R2, { clipY: Math.round(yy + 2), seed: seed + k, sh: 0.5 }));
  }
}
function mineCart(p: Px): void {
  oreHeap(p, 6, 24, 8, 6.5, 5);
  // Kasten
  part(p, (l) => {
    l.poly([[2, 8], [28, 8], [25, 19], [5, 19]], MARK);
    planks(l, 2, 8, 26, 11, { ramp: MW, pw: 4, vertical: true, seed: 7, mark: MARK, worn: 0.7 });
    shadeArea(l, (x, y) => x > 20 && y > 8, SHADE, 0.24); shadeArea(l, (x, y) => y > 16, SHADE, 0.18);
    // Eisenbänder: Randreif, zwei Spanten, Bodenreif
    for (let x = 2; x < 28; x++) { if (l.get(x, 8) >>> 24) { l.set(x, 8, x < 10 ? I[4] : x > 22 ? I[2] : I[3]); l.set(x, 9, I[1]); } if (l.get(x, 18) >>> 24) l.set(x, 18, x > 20 ? I[1] : I[2]); }
    for (const [x0, lean] of [[8, 0.12], [20, -0.12]] as const) for (let y = 9; y < 19; y++) { const x = Math.round(x0 + (y - 9) * lean); l.set(x, y, I[3]); l.set(x + 1, y, I[1]); if (y % 3 === 1) l.set(x, y, I[4]); }
    l.px([4, 11, 25, 11, 14, 17], I[4]); l.px([14, 12, 15, 13], MW[0]);
  });
  // Kupplungshaken
  p.rect(28, 13, 2, 1, I[2]); p.set(29, 14, I[2]); p.set(28, 15, I[1]); p.set(1, 13, I[2]); p.set(0, 13, I[1]);
  // Fahrgestell und Räder
  p.rect(6, 19, 18, 1, I[0]); p.rect(7, 20, 16, 1, I[1]);
  const wheel = (cx: number): void => { part(p, (l) => { l.ell(cx, 20, 3.1, 3.1, I[1]); l.ell(cx, 20, 2.2, 2.2, I[2]); l.ell(cx - 0.3, 19.7, 1.2, 1.2, I[0]); l.set(cx - 2, 18, I[4]); l.set(cx - 1, 18, I[3]); l.set(cx, 20, I[3]); l.set(cx + 1, 22, I[0]); }); };
  wheel(9); wheel(21);
  inkOutline(p);
  glow(p, 15, 4, 8, CYAN[3], 32);
  p.set(11, 1, WHITE); p.set(19, 2, mix(MAGENTA[4], WHITE, 0.5));
}
function mineRails(p: Px): void {
  // Schwellen (¾-Sicht: Oberseite + Südkante), Schotter, zwei Schienen
  for (let k = 0; k < 4; k++) {
    const x = 2 + k * 8, sd = hash2(k, 1, 3);
    p.rect(x, 1, 4, 9, MW[2]); p.rect(x, 1, 1, 9, MW[3]); p.rect(x + 3, 1, 1, 9, MW[1]); p.rect(x, 10, 4, 1, MW[0]); p.rect(x, 1, 4, 1, MW[3]);
    p.set(x + 1 + (sd & 1), 5 + ((sd >> 2) & 1), MW[1]); p.set(x + 2, 7 - ((sd >> 3) & 1), MW[4]);
    if (k === 2) { p.set(x + 3, 1, 0); p.set(x, 9, MW[1]); }
  }
  for (const [x, y] of [[0, 6], [7, 5], [8, 9], [15, 2], [16, 6], [23, 9], [24, 5], [31, 6], [14, 10], [30, 2]] as const) { p.set(x, y, CAVEROCK[2]); if ((x + y) % 3 === 0) p.set(x, y - 1, CAVEROCK[3]); }
  for (const y of [2, 7]) {
    p.rect(0, y, 32, 1, I[4]); p.rect(0, y + 1, 32, 1, I[2]); p.rect(0, y + 2, 32, 1, I[0]);
    for (let x = 0; x < 32; x++) { const r = rnd2(x >> 1, y, 5); if (r < 0.22) p.set(x, y, I[3]); else if (r > 0.9) p.set(x, y, WHITE); if (rnd2(x, y, 6) < 0.2) p.set(x, y + 1, mix(I[2], P.fire[0], 0.4)); }
    for (let k = 0; k < 4; k++) { p.set(3 + k * 8, y + 2, I[3]); p.set(4 + k * 8, y - 1, I[1]); }   // Schienennägel
  }
  inkOutline(p);
}
function oreCrate(p: Px): void {
  oreHeap(p, 3, 12, 8, 5.5, 9);
  part(p, (l) => {
    l.rect(1, 8, 14, 9, MARK); planks(l, 1, 8, 14, 9, { ramp: MW, pw: 3, seed: 13, mark: MARK, worn: 0.8 });
    // Rahmenleisten, Eisenecken, Brandzeichen
    l.rect(1, 8, 14, 1, T[3]); l.rect(1, 9, 14, 1, MW[0]); l.rect(1, 9, 2, 8, MW[1]); l.rect(13, 9, 2, 8, MW[1]); l.rect(1, 9, 1, 8, MW[3]); l.rect(1, 16, 14, 1, MW[0]);
    l.px([1, 8, 2, 8], T[4]); l.px([1, 10, 14, 10, 1, 15, 14, 15], I[4]); l.px([2, 10, 13, 10], I[2]);
    l.px([8, 11, 7, 12, 9, 12, 8, 13, 8, 14], MW[0]); l.set(8, 12, CYAN[3]);
  });
  p.px([4, 8, 7, 8, 11, 8], CAVEROCK[2]); p.set(15, 16, CAVEROCK[2]);
  inkOutline(p);
  glow(p, 8, 4, 6, CYAN[3], 28);
}
function pickaxeRack(p: Px): void {
  const DK: Ramp = [MW[0], MW[0], MW[1], MW[2], MW[3]], HD: Ramp = [P.steel[0], P.steel[1], P.steel[2], P.steel[3], P.steel[4]];
  // niedriges Gestell: zwei Pfosten, ein Holm
  part(p, (l) => { timberV(l, 1, 12, 24, 2, DK, 3); timberV(l, 17, 12, 24, 2, DK, 4); timberH(l, 0, 19, 14, 2, DK, 5); l.px([0, 24, 3, 24, 16, 24, 19, 24], DK[1]); });
  // Spitzhacken: heller Stiel, Stahlblatt mit zwei Spitzen
  const pick = (x0: number, x1: number, top: number, flip: number): void => { part(p, (l) => {
    l.line(x0, 24, x1, top + 1, T[3]); l.line(x0 + 1, 24, x1 + 1, top + 1, T[1]); l.set(x1, top + 4, T[4]); l.set(x0, 23, T[2]);
    const h = [[-5, 3], [-4, 1], [-3, 0], [-2, 0], [-1, -1], [0, -1], [1, -1], [2, 0], [3, 0], [4, 1], [5, 2]] as const;
    for (const [dx, dy] of h) { const X = x1 + dx * flip; l.set(X, top + dy, dx * flip < -1 ? HD[4] : dx * flip > 2 ? HD[2] : HD[3]); if (Math.abs(dx) < 4) l.set(X, top + 1 + dy, HD[1]); }
    l.set(x1, top - 1, WHITE); l.rect(x1, top + 1, 2, 1, HD[0]);
  }); };
  pick(11, 13, 8, -1); pick(6, 6, 3, 1);
  // Seilrolle über dem rechten Pfosten
  part(p, (l) => {
    const RP: Ramp = [T[1], T[2], T[3], P.cream[3]];
    l.ell(16.5, 17.5, 3, 4.2, RP[1]); l.ell(16.5, 17.5, 1.1, 2.2, MW[0]);
    for (let k = 0; k < 16; k++) { const a = (k / 16) * 6.283, x = 16.5 + Math.cos(a) * 2.3, y = 17.5 + Math.sin(a) * 3.4; l.set(x, y, k % 2 ? RP[3] : RP[2]); }
    l.px([18, 21, 19, 22], RP[1]); l.set(19, 23, RP[0]); l.px([15, 13, 16, 13, 17, 13], RP[2]);
  });
  inkOutline(p);
}
function lanternPost(p: Px, f: number): void {
  part(p, (l) => {
    timberV(l, 3, 5, 33, 2, MW, 7); l.px([3, 34, 4, 34], MW[1]);
    l.px([4, 14, 3, 22, 4, 27], MW[0]);
    moss(l, (x, y) => (y > 29 ? 0.5 : 0), 3, LICHEN);
  });
  // Steinkranz am Fuß
  part(p, (l) => { boulder(l, 2.5, 35, 4, 3, { ramp: CAVEROCK, seed: 2, cracks: 0 }); boulder(l, 6, 35, 4, 3, { ramp: CAVEROCK, seed: 4, cracks: 0 }); });
  // Eisenarm mit Haken, Strebe
  part(p, (l) => {
    l.rect(2, 3, 9, 1, I[3]); l.rect(2, 4, 4, 1, I[1]); l.set(11, 4, I[2]); l.set(10, 5, I[1]); l.px([5, 5, 6, 4, 7, 4], I[2]); l.px([3, 2, 4, 1], I[2]); l.set(4, 0, I[3]);
    l.rect(2, 8, 4, 1, I[2]); l.set(2, 8, I[4]);
  });
  p.rect(9, 5, 1, 2, I[2]);
  part(p, (l) => lantern(l, 7, 7, f));
  inkOutline(p);
  glow(p, 9.5, 11, 7 + (f & 1), Y[3], 66 + (f === 1 ? 14 : f === 3 ? -8 : 0));
  // Widerschein am Pfosten
  for (let y = 6; y < 20; y++) for (let x = 3; x < 5; x++) { const c = p.get(x, y); if (MW.includes(c)) p.set(x, y, mix(c, Y[3], x === 4 ? 0.34 : 0.16)); }
}

export function krMine(out: Frames): void {
  one(out, 'mine_support', 48, 56, mineSupport, false);
  one(out, 'mine_cart', 30, 24, mineCart, false);
  one(out, 'mine_rails', 32, 12, mineRails, false);
  one(out, 'ore_crate', 16, 18, oreCrate, false);
  one(out, 'pickaxe_rack', 20, 26, pickaxeRack, false);
  anim(out, 'lantern_post', 4, 14, 36, lanternPost, false);
}
