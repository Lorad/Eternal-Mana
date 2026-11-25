/**
 * Expeditionen – Raumausstattung je Region (`exp_<biom>_a|b|c`), damit die großen Abschnitte eigenen Charakter haben.
 *   gruenwald  a Wurzelgeflecht · b Schreinstein · c umrankte Hüterlaterne
 *   kristall   a Kristallsäule · b Lore mit Kristallen · c Grubenstempel mit Laterne
 *   glut       a Schmiedeamboss · b Lavarinne (flach) · c Schlackenkübel an der Kette
 *   frost      a eingefrorene Statue · b Eiszapfengruppe · c vereistes Waffengestell
 *   ruinen     a Bücherregal · b gebrochene Säule · c Lesepult mit Schriftrollen
 *   schatten   a Leerenranken · b schwebende Ketten · c Leerenobelisk mit Auge
 * Alle Einzelbilder, Anker unten Mitte.
 */
import { Px, bez, crystal } from '../draw';
import { Frames, INK, MARK, P, Ramp, WHITE, alpha, barkFill, boulder, embers, flame, glow, hash2, limb, masonry, mix, moss, one, part, planks, rnd2, shadeArea } from './kit';
import { prism, CYAN, MAGENTA, MINEWOOD, RUST, CAVEROCK } from './kr_kit';
import { HOT, BASALT5 } from './gl_nature';
import { ICE, SNOW } from './fr_kit';
import { NIGHT5, FLESH } from './sc_kit';
import { SAND, ARC, TERRA, stoneFill } from './ru_kit';
import { DARK, MANA, SHADE } from './hub_kit';

const W = P.wood, S = P.stone, Y = P.gold, G = P.green, F = P.forest, I = P.steel;

// ================================================================ Grünwald
function gwRoots(p: Px): void {
  for (const [path, r0, r1] of [
    [bez([2, 27], [8, 14], [18, 12]), 3.2, 1.6], [bez([36, 26], [30, 12], [18, 12]), 3.4, 1.6], [bez([10, 28], [14, 20], [20, 18]), 2.2, 1],
    [bez([28, 28], [24, 20], [16, 17]), 2.2, 1], [bez([18, 12], [17, 6], [22, 2]), 1.8, 0.8], [bez([6, 22], [2, 18], [1, 12]), 1.6, 0.6],
  ] as const) limb(p, path, r0, r1);
  barkFill(p, [W[0], mix(W[1], S[1], 0.3), mix(W[2], S[2], 0.3), mix(W[3], P.tan[3], 0.4), mix(W[4], P.tan[4], 0.4)], 77, MARK, 3);
  moss(p, (x, y) => (y < 18 ? 0.55 : 0.25), 4);
  for (const [x, y] of [[8, 16], [27, 15], [19, 9]] as const) { p.set(x, y, G[4]); p.set(x + 1, y - 1, G[3]); }
  p.px([12, 22, 25, 21], P.pink[3]);
}
function gwShrineStone(p: Px): void {
  part(p, (l) => { boulder(l, 10, 32, 18, 30, { seed: 21, facets: 7, cracks: 0, moss: 0.5, ramp: [mix(S[0], F[0], 0.3), mix(S[1], F[1], 0.25), S[2], S[3], S[4]] }); });
  // geschnitzte Blattrune mit grünem Schimmer
  const rune = [[10, 8], [10, 9], [10, 10], [10, 11], [10, 12], [10, 13], [10, 14], [9, 10], [8, 9], [11, 10], [12, 9], [9, 13], [8, 12], [11, 13], [12, 12], [10, 15], [10, 16]];
  for (const [x, y] of rune) p.set(x, y, mix(G[4], WHITE, 0.3));
  glow(p, 10, 12, 8, G[4], 40);
  part(p, (l) => { l.ell(10, 31, 9, 2, mix(G[1], F[1], 0.4)); for (let k = 0; k < 7; k++) { const x = 3 + k * 2.2; l.set(x, 29 - (k & 1), G[3]); } l.px([4, 28, 15, 28], P.red[3]); });
}
function gwLantern(p: Px): void {
  part(p, (l) => {
    l.rect(8, 10, 3, 30, W[2]); l.rect(8, 10, 1, 30, W[3]); l.rect(10, 10, 1, 30, W[0]); l.rect(5, 38, 9, 3, S[2]); l.rect(5, 38, 9, 1, S[3]);
    l.rect(10, 9, 7, 2, W[2]); l.rect(14, 11, 1, 3, I[1]);
    l.rect(12, 14, 6, 8, I[1]); l.rect(13, 15, 4, 6, MANA[2]); l.rect(14, 16, 2, 3, MANA[4]); l.rect(11, 13, 8, 1, I[2]); l.rect(12, 22, 6, 1, I[1]);
  });
  // Ranke windet sich um den Pfosten
  for (let y = 12; y < 40; y++) { const x = 9 + Math.round(Math.sin(y * 0.55) * 2); p.set(x, y, F[2]); if (y % 3 === 0) { p.set(x + (y % 2 ? 1 : -1), y, G[3]); p.set(x + (y % 2 ? 2 : -2), y - 1, G[4]); } }
  p.px([7, 20, 11, 30, 7, 34], P.violet[3]);
  glow(p, 15, 18, 8, MANA[3], 60);
}

// ================================================================ Kristallhöhlen
function krPillar(p: Px): void {
  part(p, (l) => { boulder(l, 12, 52, 22, 9, { seed: 5, ramp: CAVEROCK, facets: 5 }); });
  part(p, (l) => { prism(l, 12, 46, 11, 3, 5.4, CYAN, { seed: 3 }); prism(l, 6, 48, 2, 24, 2.6, CYAN, { seed: 4 }); prism(l, 18, 48, 22, 28, 2.4, MAGENTA, { seed: 5 }); });
  glow(p, 12, 26, 14, CYAN[3], 30);
  p.px([10, 12, 14, 20, 9, 33], WHITE);
}
function krCart(p: Px): void {
  part(p, (l) => { for (let x = 0; x < 32; x += 4) { l.rect(x, 23, 3, 2, MINEWOOD[1]); } l.rect(0, 22, 32, 1, I[2]); l.rect(0, 25, 32, 1, I[1]); });
  part(p, (l) => {
    l.poly([[3, 9], [29, 9], [26, 20], [6, 20]], RUST[2]); l.poly([[3, 9], [9, 9], [8, 20], [6, 20]], RUST[3]); l.rect(3, 9, 26, 2, RUST[4]); l.rect(6, 19, 20, 1, RUST[0]);
    for (const x of [10, 16, 22]) l.rect(x, 11, 1, 8, RUST[1]);
    for (const x of [9, 23]) { l.ell(x, 21, 3, 3, I[1]); l.ell(x, 21, 1.5, 1.5, I[3]); l.set(x, 21, DARK); }
  });
  part(p, (l) => { crystal(l, 9, 10, 7, 1, 2.4, CYAN); crystal(l, 15, 10, 16, 2, 3, MAGENTA); crystal(l, 22, 10, 25, 3, 2.4, CYAN); boulder(l, 12, 11, 8, 4, { seed: 8, ramp: CAVEROCK, facets: 3 }); });
  glow(p, 16, 6, 9, MAGENTA[3], 28);
}
function krSupport(p: Px): void {
  part(p, (l) => {
    for (const x of [2, 18]) { l.rect(x, 6, 4, 38, MARK); planks(l, x, 6, 4, 38, { ramp: MINEWOOD, pw: 4, vertical: true, seed: x, mark: MARK }); }
    l.rect(0, 3, 24, 5, MARK); planks(l, 0, 3, 24, 5, { ramp: MINEWOOD, pw: 5, seed: 9, mark: MARK }); l.rect(0, 3, 24, 1, MINEWOOD[4]);
    l.line(6, 8, 10, 14, MINEWOOD[2], 2); l.line(17, 8, 13, 14, MINEWOOD[1], 2);
    l.rect(11, 8, 1, 6, I[1]); l.rect(9, 14, 5, 7, I[1]); l.rect(10, 15, 3, 5, P.fire[3]); l.set(11, 16, P.fire[4]); l.rect(9, 13, 5, 1, I[2]);
  });
  glow(p, 11, 17, 9, P.fire[3], 60);
}

// ================================================================ Glutlande
function glAnvil(p: Px): void {
  part(p, (l) => { boulder(l, 14, 24, 26, 10, { seed: 2, ramp: BASALT5, facets: 4 }); });
  part(p, (l) => {
    l.rect(6, 6, 18, 5, I[2]); l.rect(6, 6, 18, 1, I[4]); l.rect(2, 6, 5, 3, I[3]); l.set(1, 6, I[2]); l.rect(24, 6, 2, 3, I[1]);
    l.rect(10, 11, 10, 3, I[1]); l.rect(8, 14, 14, 3, I[0]); l.rect(8, 14, 14, 1, I[2]); l.set(9, 7, WHITE);
  });
  // glühendes Werkstück und Zange
  p.rect(12, 4, 8, 2, HOT[3]); p.rect(13, 4, 5, 1, HOT[5]); glow(p, 16, 5, 6, HOT[3], 70);
  p.line(19, 5, 27, 1, I[2]); p.line(19, 6, 27, 3, I[1]);
}
function glRunnel(p: Px): void {
  // flache Lavarinne zwischen Basaltkanten (Decal)
  for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) {
    const c = 8 + Math.sin(x * 0.35) * 2, d = Math.abs(y + 0.5 - c);
    if (d < 2.4) p.set(x, y, d < 1 ? HOT[(hash2(x >> 1, y, 3) & 1) ? 5 : 4] : HOT[3]);
    else if (d < 4.4) p.set(x, y, d < 3.4 ? BASALT5[3] : BASALT5[1]);
    else if (d < 5.2 && (hash2(x, y, 5) & 1)) p.set(x, y, BASALT5[2]);
  }
}
function glCrucible(p: Px): void {
  part(p, (l) => {
    for (let y = 0; y < 14; y++) { l.set(7, y, y % 2 ? I[1] : I[3]); l.set(17, y, y % 2 ? I[3] : I[1]); }
    l.line(7, 13, 4, 18, I[2]); l.line(17, 13, 20, 18, I[2]);
    l.ball(12, 23, 9, 8, [P.ash[0], P.ash[1], P.ash[2], P.ash[3], P.ash[4]], 0, 3); l.ell(12, 17, 8.4, 2.4, P.ash[3]);
    l.ell(12, 17.4, 7, 1.6, HOT[3]); l.ell(11, 17, 4, 1, HOT[5]);
    l.rect(4, 22, 17, 1, P.ash[1]);
  });
  p.px([10, 14, 14, 13, 12, 11], HOT[4]); glow(p, 12, 16, 9, HOT[3], 60);
  p.px([16, 30, 17, 31, 6, 31], HOT[2]);
}

// ================================================================ Frostgebirge
function frStatue(p: Px): void {
  // Kriegerstatue, eingeschlossen in einem Eisblock
  part(p, (l) => { l.rect(3, 38, 16, 5, S[2]); l.rect(3, 38, 16, 1, S[4]); l.rect(3, 42, 16, 1, S[0]); });
  part(p, (l) => {
    l.ball(11, 9, 3.5, 3.5, S, 1, 4); l.rect(8, 6, 7, 2, S[3]);
    l.poly([[6, 13], [16, 13], [15, 28], [7, 28]], S[3]); l.poly([[6, 13], [9, 13], [8, 28], [7, 28]], S[4]); l.rect(7, 28, 3, 10, S[2]); l.rect(12, 28, 3, 10, S[1]);
    l.line(16, 14, 19, 4, I[3], 2); l.rect(15, 14, 5, 1, S[2]); l.line(6, 14, 3, 24, S[2], 2);
  });
  // Eisblock darüber (halbtransparent, mit Lichtkanten)
  for (let y = 2; y < 40; y++) for (let x = 1; x < 21; x++) {
    const edge = x === 1 || x === 20 || y === 2, c = edge ? ICE[4] : (x + y) % 9 === 0 ? ICE[5] : ICE[3];
    p.blend(x, y, alpha(c, edge ? 210 : x < 6 ? 85 : 55));
  }
  for (let k = 0; k < 6; k++) p.set(3 + k, 4 + k, alpha(WHITE, 200));
  part(p, (l) => { l.poly([[1, 38], [21, 38], [20, 34], [2, 33]], SNOW[3]); l.rect(1, 37, 20, 1, SNOW[2]); });
}
function frIcicles(p: Px): void {
  part(p, (l) => { boulder(l, 12, 30, 24, 7, { seed: 9, ramp: SNOW, facets: 3, cracks: 0 }); });
  part(p, (l) => { for (const [x, h, w] of [[5, 16, 2.4], [10, 26, 3.4], [15, 20, 2.8], [19, 12, 2], [13, 9, 1.6]] as const) prism(l, x, 28, x + 0.5, 28 - h, w, ICE, { seed: x }); });
  p.px([10, 4, 15, 9], WHITE);
}
function frRack(p: Px): void {
  part(p, (l) => {
    l.rect(2, 8, 3, 20, W[2]); l.rect(19, 8, 3, 20, W[1]); l.rect(2, 10, 20, 2, W[3]); l.rect(2, 20, 20, 2, W[2]);
    for (const [x, c] of [[7, I], [11, I], [15, Y]] as const) { l.rect(x, 3, 1, 17, c[4]); l.rect(x + 1, 4, 1, 16, c[2]); l.rect(x - 1, 19, 4, 1, W[3]); }
  });
  // Schnee auf den Querlatten, Eiszapfen darunter
  p.rect(2, 9, 20, 1, SNOW[4]); p.rect(2, 19, 20, 1, SNOW[4]); p.px([2, 8, 3, 8, 19, 7, 20, 7], SNOW[4]);
  for (const x of [4, 9, 13, 18]) { p.set(x, 12, ICE[4]); p.set(x, 13, ICE[3]); }
  part(p, (l) => { l.poly([[0, 28], [24, 28], [22, 24], [3, 23]], SNOW[3]); l.rect(1, 27, 22, 1, SNOW[2]); });
}

// ================================================================ Verlorene Ruinen
function ruBookcase(p: Px): void {
  part(p, (l) => {
    l.rect(1, 2, 26, 37, mix(W[0], DARK, 0.3));
    for (const x of [0, 25]) { l.rect(x, 1, 3, 38, W[2]); l.rect(x, 1, 1, 38, W[3]); }
    l.rect(0, 0, 28, 3, W[3]); l.rect(0, 0, 28, 1, W[4]);
    for (const y of [12, 24, 36]) { l.rect(2, y, 24, 2, W[3]); l.rect(2, y, 24, 1, W[4]); }
    const cols = [P.red, ARC, P.green, Y, P.violet, TERRA];
    for (const y0 of [3, 15, 27]) { let x = 3; while (x < 24) { const h = hash2(x, y0, 3), w = 2 + (h & 1), c = cols[(h >>> 3) % cols.length], ht = 7 + ((h >>> 6) % 3); if ((h >>> 9) % 7 === 0) { x += 2; continue; } l.rect(x, y0 + 9 - ht, w, ht, c[2]); l.rect(x, y0 + 9 - ht, 1, ht, c[3]); l.set(x, y0 + 10 - ht + 1, Y[3]); x += w; } }
  });
  // Spinnweben und Staub
  for (let k = 0; k < 5; k++) { p.blend(3 + k, 3 + (k >> 1), alpha(WHITE, 90)); p.blend(3, 3 + k, alpha(WHITE, 90)); }
  p.px([10, 26, 11, 25], alpha(SAND[4], 200));
}
function ruPillar(p: Px): void {
  part(p, (l) => {
    l.rect(1, 31, 16, 5, MARK); l.poly([[3, 31], [15, 31], [14, 8], [12, 6], [9, 9], [6, 5], [4, 9]], MARK);
    stoneFill(l, SAND, 7);
    for (const x of [6, 9, 12]) for (let y = 9; y < 31; y++) l.set(x, y, mix(l.get(x, y), INK, 0.2));
    l.rect(1, 31, 16, 1, SAND[4]); l.rect(1, 35, 16, 1, SAND[0]);
  });
  moss(p, (x, y) => (y < 14 ? 0.5 : y > 26 && x < 6 ? 0.4 : 0), 3);
  part(p, (l) => { boulder(l, 15, 36, 6, 4, { seed: 3, ramp: SAND, facets: 3 }); });
}
function ruLectern(p: Px): void {
  part(p, (l) => {
    l.rect(8, 12, 4, 14, W[2]); l.rect(8, 12, 1, 14, W[3]); l.rect(4, 25, 12, 3, W[2]); l.rect(4, 25, 12, 1, W[3]);
    l.poly([[1, 6], [19, 6], [17, 12], [3, 12]], W[3]); l.rect(1, 6, 18, 1, W[4]);
    l.rect(3, 4, 7, 5, P.cream[4]); l.rect(10, 4, 7, 5, P.cream[3]); l.rect(9, 4, 2, 5, P.cream[1]); for (const y of [5, 7]) { l.rect(4, y, 4, 1, W[1]); l.rect(11, y, 5, 1, W[1]); }
    l.set(14, 6, ARC[3]);
  });
  part(p, (l) => { for (const [x, y] of [[1, 26], [15, 27]] as const) { l.rect(x, y, 5, 2, P.cream[3]); l.ell(x, y + 1, 1, 1, P.cream[2]); l.ell(x + 5, y + 1, 1, 1, P.cream[2]); l.set(x + 2, y, P.red[2]); } });
  glow(p, 14, 6, 4, ARC[3], 60);
}

// ================================================================ Schattenreich
function scTendrils(p: Px): void {
  for (const [path, r0] of [[bez([12, 40], [3, 24], [10, 3]), 3.6], [bez([12, 40], [21, 26], [18, 9]), 3.2], [bez([11, 40], [7, 33], [2, 22]), 2.4]] as const) limb(p, path, r0, 0.6);
  barkFill(p, FLESH, 41, MARK, 3);
  for (const [x, y] of [[9, 12], [17, 18], [5, 26], [14, 30]] as const) { p.set(x, y, P.pink[4]); p.blend(x + 1, y, alpha(P.pink[3], 180)); }
  glow(p, 12, 20, 12, P.violet[3], 26);
  part(p, (l) => { l.ell(12, 39, 9, 2, NIGHT5[1]); l.ell(12, 38.6, 6, 1, P.violet[2]); });
}
function scChains(p: Px): void {
  // Ketten hängen aus dem Nichts, ein schwebender Ring hält sie
  for (const [x0, top, len] of [[5, 2, 30], [10, 0, 22], [15, 4, 34]] as const) for (let k = 0; k < len / 3; k++) {
    const y = top + k * 3, x = x0 + Math.round(Math.sin(k * 0.6) * 0.6);
    if (k % 2 === 0) { p.rect(x, y, 1, 3, I[3]); p.rect(x + 1, y, 1, 3, I[1]); } else { p.px([x - 1, y, x - 1, y + 1, x - 1, y + 2], I[2]); p.px([x + 2, y, x + 2, y + 1, x + 2, y + 2], I[0]); p.set(x - 1, y, I[4]); }
  }
  part(p, (l) => { for (let a = 0; a < Math.PI * 2; a += 0.05) { const x = 10 + Math.cos(a) * 8, y = 18 + Math.sin(a) * 2.6; l.set(x, y, Math.sin(a) < 0 ? I[1] : I[3]); l.set(x, y + 1, Math.sin(a) < 0 ? I[0] : I[2]); } l.rect(7, 30, 6, 5, I[2]); l.rect(7, 30, 6, 1, I[4]); l.rect(8, 27, 4, 3, I[1]); l.rect(9, 28, 2, 2, 0); l.set(10, 32, DARK); });
  for (let k = 0; k < 4; k++) p.blend(10 + [-6, 6, -2, 3][k], 40 - k * 2, alpha(P.violet[3], 150));
  glow(p, 10, 18, 9, P.violet[3], 34);
  p.px([1, 0, 0, 0], 0);
}
function scObelisk(p: Px): void {
  part(p, (l) => {
    l.poly([[6, 36], [16, 36], [14, 6], [11, 1], [8, 6]], NIGHT5[2]); l.poly([[6, 36], [10, 36], [10, 6], [11, 1], [8, 6]], NIGHT5[3]); l.line(11, 1, 14, 36, NIGHT5[1]);
    l.rect(3, 36, 16, 4, NIGHT5[1]); l.rect(3, 36, 16, 1, NIGHT5[3]);
    // Auge
    l.ell(11, 16, 3, 2, mix(WHITE, P.violet[4], 0.3)); l.ell(11, 16, 1.4, 1.6, P.pink[2]); l.set(11, 16, DARK); l.set(10, 15, WHITE);
    for (const y of [24, 28, 32]) { l.set(10, y, P.violet[4]); l.set(12, y - 1, P.violet[3]); }
  });
  glow(p, 11, 16, 8, P.pink[3], 60);
  for (const [x, y] of [[3, 10], [19, 6], [18, 22]] as const) { p.set(x, y, P.violet[4]); p.blend(x, y + 1, alpha(P.violet[2], 180)); }
}

export function expDressing(out: Frames): void {
  one(out, 'exp_gruenwald_a', 38, 30, gwRoots);
  one(out, 'exp_gruenwald_b', 20, 34, gwShrineStone, false);
  one(out, 'exp_gruenwald_c', 20, 42, gwLantern, false);
  one(out, 'exp_kristall_a', 26, 54, krPillar, false);
  one(out, 'exp_kristall_b', 32, 26, krCart, false);
  one(out, 'exp_kristall_c', 24, 44, krSupport, false);
  one(out, 'exp_glut_a', 30, 26, glAnvil, false);
  one(out, 'exp_glut_b', 32, 16, glRunnel, false);
  one(out, 'exp_glut_c', 24, 32, glCrucible, false);
  one(out, 'exp_frost_a', 22, 44, frStatue);
  one(out, 'exp_frost_b', 24, 32, frIcicles);
  one(out, 'exp_frost_c', 24, 30, frRack);
  one(out, 'exp_ruinen_a', 28, 40, ruBookcase);
  one(out, 'exp_ruinen_b', 18, 38, ruPillar);
  one(out, 'exp_ruinen_c', 20, 30, ruLectern, false);
  one(out, 'exp_schatten_a', 24, 42, scTendrils, false);
  one(out, 'exp_schatten_b', 20, 42, scChains, false);
  one(out, 'exp_schatten_c', 22, 42, scObelisk, false);
}
void embers; void flame; void rnd2; void shadeArea; void HOT; void SHADE; void MANA;
