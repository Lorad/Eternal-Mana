/**
 * Allgemein – Handwerk & Zuhause (v2): Alchemietisch, Kochkessel, Runentisch; Lagertruhe, Bett, Tisch, Regal,
 * Flickenteppich, Trophäenständer. Warmes Holz, Creme und Rot – bewusst wohnlicher als die Dungeon-Möbel (`d_*`).
 */
import { Px, bez } from '../draw';
import { Frames, MARK, P, Ramp, TAU, WHITE, alpha, anim, boulder, embers, flame, glow, hash2, inkOutline, mix, one, part, planks, rnd2, shadeArea, sparkle } from './kit';
import { RUNESTONE } from './cm_interact';
import { WGOLD } from './cm_story';
import { ARC, TERRA, slab } from './ru_kit';
import { TEALC, prism } from './kr_kit';

const W = P.wood, S = P.stone, I = P.steel, Y = P.gold, TL = P.teal, C = P.cream;
const DARK = P.shadow[0], SHADE = P.shadow[2];
/** dunkles, altes Truhenholz */
const DWOOD: Ramp = [mix(W[0], P.shadow[1], 0.45), mix(W[1], P.shadow[2], 0.3), mix(W[2], S[1], 0.3), mix(W[3], S[2], 0.35), mix(W[4], S[3], 0.4)];
/** Gusseisen */
const IRON: Ramp = [P.ash[0], I[0], I[1], I[2], I[3]];

/** Tischgestell in ¾-Sicht: Platte (top Zeilen hell), Stirnkante, zwei Beine. */
function tableFrame(p: Px, x: number, y: number, w: number, top: number, legH: number, seed: number, ramp: Ramp = W): void {
  for (const lx of [x + 1, x + w - 4]) { p.rect(lx, y + top, 3, legH + 2, ramp[2]); p.rect(lx, y + top, 1, legH + 2, ramp[3]); p.rect(lx + 2, y + top, 1, legH + 2, ramp[0]); }
  p.rect(x + 4, y + top + Math.round(legH * 0.55), w - 8, 1, ramp[1]);
  p.rect(x, y, w, top, MARK); planks(p, x, y, w, top, { ramp, pw: 3, seed, mark: MARK, worn: 0.3 }); shadeArea(p, (xx, yy) => yy >= y && yy < y + top && xx >= x && xx < x + w, WHITE, 0.14);
  p.rect(x, y, w, 1, ramp[4]); p.rect(x, y + top, w, 2, ramp[1]); p.rect(x, y + top + 1, w, 1, ramp[0]); p.set(x, y + top, ramp[2]);
}
/** Bauchiges Glas mit Hals: Flüssigkeit liq (5er-Rampe) bis zur Füllhöhe. */
function flask(l: Px, cx: number, cy: number, r: number, neck: number, liq: Ramp, fill = 0.6, cork = true): void {
  const G = P.ice;
  for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
    const u = (x + 0.5 - cx) / r, v = (y + 0.5 - cy) / r, d = u * u + v * v;
    if (d > 1) continue;
    const wet = v > 1 - fill * 2;
    l.set(x, y, wet ? liq[u * 0.5 + v * 0.6 > 0.42 ? 1 : v < 1 - fill * 2 + 0.3 ? 3 : 2] : G[u < -0.3 ? 3 : 2]);
  }
  const nx = Math.round(cx - 1), ny = Math.floor(cy - r);
  l.rect(nx, ny - neck, 2, neck + 1, G[2]); l.rect(nx, ny - neck, 1, neck + 1, G[4]); l.rect(nx - 1, ny - neck, 4, 1, G[3]);
  if (cork) { l.rect(nx, ny - neck - 2, 2, 2, P.tan[2]); l.set(nx, ny - neck - 2, P.tan[4]); }
  l.set(Math.round(cx - r * 0.55), Math.round(cy - r * 0.35), WHITE); l.set(Math.round(cx - r * 0.55), Math.round(cy - r * 0.35) + 1, liq[4]);
}

// ---------------------------------------------------------------- Alchemietisch
function stationAlchemy(p: Px): void {
  // unter dem Tisch: Kiste und Krug im Schatten
  part(p, (l) => { l.rect(7, 23, 8, 6, MARK); planks(l, 7, 23, 8, 6, { ramp: DWOOD, pw: 3, seed: 3, mark: MARK }); l.rect(7, 23, 8, 1, DWOOD[3]); l.px([9, 22, 12, 22], P.ice[3]); l.px([9, 21, 12, 21], P.tan[2]); });
  part(p, (l) => { l.ball(21, 26, 3.4, 3.2, TERRA, 1, 4); l.rect(20, 21, 3, 2, TERRA[2]); l.rect(19, 21, 5, 1, TERRA[3]); });
  shadeArea(p, (_x, y) => y >= 21, SHADE, 0.32);
  tableFrame(p, 1, 14, 30, 6, 8, 13);
  // Fleck und Brandspuren auf der Platte
  p.px([12, 17, 13, 17, 13, 18], mix(P.green[2], W[2], 0.5)); p.px([24, 18, 25, 18], W[0]);
  // links: großer Rundkolben mit rotem Trank
  part(p, (l) => { flask(l, 6.5, 11, 4.4, 3, P.red, 0.62); l.rect(4, 15, 5, 1, I[2]); l.set(4, 15, I[3]); });
  // Mitte: Destille auf Dreibein über blauer Flamme, Glasrohr zum Auffanggläschen
  part(p, (l) => {
    l.rect(13, 12, 8, 1, I[2]); l.set(13, 12, I[4]); l.line(13, 13, 12, 17, I[1]); l.line(20, 13, 21, 17, I[1]); l.line(17, 13, 17, 15, I[0]);
    l.rect(15, 16, 4, 2, I[1]); l.rect(15, 16, 4, 1, I[3]);
  });
  p.px([16, 15, 17, 15], P.blue[3]); p.px([16, 14, 17, 13], P.ice[4]); p.set(17, 14, WHITE); p.set(16, 13, P.blue[2]);
  part(p, (l) => {
    flask(l, 17, 8, 3.6, 0, TEALC, 0.7, false);
    l.px([15, 7, 18, 8], WHITE); l.set(17, 6, TL[4]);
    l.rect(16, 2, 2, 3, P.ice[2]); l.rect(16, 2, 1, 3, P.ice[4]); l.rect(15, 2, 4, 1, P.ice[3]);
  });
  part(p, (l) => { l.rect(23, 11, 4, 5, P.ice[2]); l.rect(23, 13, 4, 3, P.green[3]); l.rect(23, 13, 4, 1, P.green[4]); l.rect(26, 13, 1, 3, P.green[2]); l.rect(23, 11, 1, 2, P.ice[4]); l.rect(22, 10, 6, 1, P.ice[3]); });
  // rechts: hohe violette Flasche, Reagenzgläschen
  part(p, (l) => {
    l.rect(28, 7, 3, 9, P.violet[2]); l.rect(28, 7, 1, 9, P.violet[4]); l.rect(30, 8, 1, 8, P.violet[1]); l.rect(28, 5, 3, 2, P.ice[2]); l.set(28, 5, P.ice[4]); l.rect(29, 3, 2, 2, P.tan[2]); l.set(29, 3, P.tan[4]);
    l.rect(28, 10, 3, 2, C[3]); l.set(29, 11, P.violet[1]);
  });
  // vorn: Mörser mit Stößel, Kräuterbündel
  part(p, (l) => { l.poly([[9, 15], [15, 15], [14, 19], [10, 19]], S[2]); l.rect(9, 15, 6, 1, S[4]); l.rect(10, 16, 1, 3, S[3]); l.rect(13, 16, 1, 3, S[1]); l.line(13, 14, 16, 10, W[3]); l.set(16, 10, W[4]); l.px([11, 15, 12, 15], P.green[3]); });
  p.px([3, 18, 4, 17, 5, 18, 6, 17], P.green[3]); p.px([4, 18, 6, 18, 7, 17], P.green[2]); p.px([2, 18, 5, 17], P.green[4]); p.px([7, 18, 8, 18], P.tan[2]);
  inkOutline(p);
  glow(p, 17, 8, 6, TL[3], 40); glow(p, 16.5, 14, 3, P.blue[3], 70, true); p.set(17, 0, alpha(TL[4], 220)); p.set(15, 0, alpha(TL[4], 120)); p.set(19, 1, alpha(WHITE, 160));
}

// ---------------------------------------------------------------- Kochstelle
function stationCook(p: Px, f: number): void {
  // hintere Steine, Scheite, Glut
  part(p, (l) => { for (const [x, s] of [[6, 3], [10, 5], [14, 7], [18, 9], [22, 11]] as const) boulder(l, x, 30, 5, 4, { seed: s, facets: 3, cracks: 0 }); });
  part(p, (l) => { l.line(7, 31, 20, 29, W[2], 2); l.line(7, 31, 20, 29, W[3]); l.line(8, 29, 21, 31, W[1], 2); l.px([20, 29, 21, 30], P.tan[3]); });
  embers(p, 9, 31, 10, 1, f, 5);
  // Dreibein: drei dünne Stangen, oben verschnürt
  part(p, (l) => {
    l.line(14, 3, 17, 27, W[1]);
    l.line(13, 3, 1, 33, W[3]); l.line(14, 3, 26, 33, W[2]); l.px([1, 33, 26, 33], W[1]); l.px([10, 12, 6, 22, 18, 12, 22, 23], W[1]);
    l.rect(12, 2, 4, 3, P.tan[2]); l.rect(12, 2, 4, 1, P.tan[4]); l.px([12, 4, 15, 3], P.tan[1]); l.px([13, 1, 15, 1], W[3]);
  });
  flame(p, 14, 32, 3.6, 8, f); flame(p, 9.5, 32, 1.8, 5, f + 1); flame(p, 18.5, 32, 1.8, 5, f + 2);
  // Kessel an der Kette
  part(p, (l) => {
    for (let y = 5; y < 10; y++) l.set(14, y, y % 2 ? IRON[4] : IRON[2]);
    for (const q of bez([9, 15], [14, 6], [19, 15], 22)) l.set(q[0], q[1], IRON[3]);
    l.ball(14, 19.6, 5.8, 4.6, IRON, 0, 4); l.ell(14, 15.6, 5.8, 2.2, IRON[3]); l.ell(14, 15.2, 5.2, 1.6, IRON[4]); l.ell(14, 15.8, 4.6, 1.5, IRON[1]);
    // Eintopf
    const ST = mix(P.fire[2], P.tan[1], 0.45);
    l.ell(14, 16, 4, 1.1, ST); l.rect(11, 15, 4, 1, mix(ST, WHITE, 0.25));
    l.set([11, 16, 13, 17][f], 16, P.green[3]); l.set([15, 12, 17, 11][f], 16, P.fire[3]);
    l.set([12, 16, 14, 10][f], [15, 16, 15, 16][f], WHITE);
    l.px([9, 19, 10, 18], IRON[4]); l.px([9, 20, 10, 21], IRON[3]);
  });
  shadeArea(p, (x, y) => y >= 22 && y <= 24 && x > 8 && x < 20, P.fire[2], 0.45); shadeArea(p, (x, y) => y === 24 && x > 9 && x < 19, P.fire[3], 0.4);
  // vordere Steine
  part(p, (l) => { for (const [x, s, w] of [[4, 13, 5], [8.5, 15, 6], [14, 17, 6], [19.5, 19, 6], [24, 21, 5]] as const) boulder(l, x, 34, w, 4, { seed: s, facets: 3, cracks: 0 }); });
  glow(p, 14, 30, 6.5 + (f & 1), P.fire[2], 46 + (f === 1 ? 12 : f === 3 ? -8 : 0));
  // Dampf
  for (let j = 0; j < 3; j++) {
    const t = ((f + j * 1.35) % 4) / 4, cx = 12 + j * 2 + Math.sin(t * TAU + j * 2) * 1.5, cy = 13 - t * 11, r = 1.2 + t * 2, a = 170 * (1 - t);
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r; if (d < 1) p.blend(x, y, alpha(WHITE, Math.round(a * (d < 0.55 ? 1 : 0.5)))); }
  }
}

// ---------------------------------------------------------------- Runentisch (Verzauberung)
const RUNE = ['...x...', '..x.x..', '.x...x.', 'x..x..x', '.x.x.x.', '..xxx..', '...x...', '...x...', '..x.x..'];
function stationEnchant(p: Px, f: number): void {
  const R = RUNESTONE, bob = [0, -1, -1, 0][f], k = [0.5, 0.8, 1, 0.7][f];
  part(p, (l) => {
    slab(l, 5, 33, 18, 5, 1, 3, R); slab(l, 8, 27, 12, 6, 0, 5, R); l.rect(8, 27, 12, 1, R[1]);
    slab(l, 1, 19, 26, 8, 5, 7, R);
    // Goldeinlage an den Kanten, Zeichen am Sockel
    l.rect(1, 25, 26, 1, mix(Y[2], R[2], 0.4)); for (let x = 3; x < 26; x += 4) l.set(x, 25, Y[3]);
    l.px([13, 29, 14, 29, 12, 30, 15, 30, 13, 31, 14, 31], R[0]); l.px([13, 30, 14, 30], ARC[3]);
    l.px([2, 20, 25, 20, 2, 22, 25, 22], Y[2]);
  });
  // Runenring auf der Platte
  for (let j = 0; j < 40; j++) {
    const a = (j / 40) * TAU, x = Math.round(13.5 + Math.cos(a) * 8.6 - 0.5), y = Math.round(21 + Math.sin(a) * 1.9);
    p.set(x, y, (j + f * 3) % 5 === 0 ? WHITE : (j + f) % 2 ? ARC[4] : ARC[3]);
  }
  p.px([11, 21, 16, 21, 13, 20, 14, 22], ARC[k > 0.9 ? 5 : 3]); p.px([13, 21, 14, 21], k > 0.7 ? WHITE : ARC[4]);
  glow(p, 13.5, 21, 9, ARC[3], 26 + k * 20, true);
  // Kerzen an den Tischenden
  part(p, (l) => { for (const [x, top] of [[3, 14], [23, 15]] as const) { l.rect(x, top, 2, 20 - top, C[3]); l.rect(x, top, 1, 20 - top, C[4]); l.set(x + 1, top + 2, C[2]); l.rect(x - 1, 20, 4, 1, Y[2]); l.set(x - 1, 20, Y[4]); } });
  for (const [x, top, ph] of [[3, 14, 0], [23, 15, 2]] as const) { const d = [0, 1, 0, -1][(f + ph) & 3]; p.set(x, top - 1, P.fire[4]); p.set(x, top - 2, P.fire[3]); p.set(x + d, top - 3, P.fire[2]); glow(p, x + 0.5, top - 2, 3.5, P.fire[2], 40); }
  // kleiner Kristall und Federkiel
  part(p, (l) => { prism(l, 7, 24, 6, 18, 1.5, TEALC, { seed: 3 }); l.rect(17, 22, 5, 2, P.red[2]); l.rect(17, 22, 5, 1, P.red[3]); l.rect(17, 24, 5, 1, C[3]); l.set(19, 22, Y[3]); });
  // Lichtsäule zwischen Ring und Zeichen
  for (let y = 15 + bob; y < 21; y++) for (let x = 10; x < 18; x++) if (Math.sin(x * 2.3 + (y + f * 2) * 0.9) > 0.35) p.blend(x, y, alpha(ARC[4], 40 + (y - 14) * 12));
  // schwebendes Zeichen
  const gx = 10, gy = 3 + bob;
  glow(p, 13.5, gy + 4.5, 8 + k, ARC[3], 30 + k * 26); glow(p, 13.5, gy + 4.5, 4.5, ARC[4], 30 + k * 30);
  RUNE.forEach((row, j) => { for (let i = 0; i < 7; i++) if (row[i] === 'x') { p.set(gx + i, gy + j, k > 0.9 || (i === 3 && j < 6) ? WHITE : ARC[5]); p.blend(gx + i + 1, gy + j + 1, alpha(ARC[2], 150)); } });
  RUNE.forEach((row, j) => { for (let i = 0; i < 7; i++) if (row[i] === 'x') p.set(gx + i, gy + j, k > 0.9 || (i === 3 && j < 6) ? WHITE : ARC[5]); });
  // umlaufende Funken
  for (let j = 0; j < 3; j++) { const a = (f / 4) * (TAU / 3) + (j / 3) * TAU, x = 13.5 + Math.cos(a) * 9, y = gy + 4.5 + Math.sin(a) * 3; p.set(x, y, WHITE); p.blend(x - Math.sign(Math.sin(a)) , y, alpha(ARC[4], 150)); }
}

// ---------------------------------------------------------------- Lagertruhe
function stashChest(p: Px): void {
  const D = DWOOD, x0 = 2, w = 28;
  // Füße, Korpus, flacher Deckel
  for (const x of [3, 25]) { p.rect(x, 23, 4, 2, IRON[2]); p.rect(x, 23, 4, 1, IRON[3]); }
  p.rect(x0, 13, w, 10, MARK); planks(p, x0, 13, w, 10, { ramp: D, pw: 4, seed: 7, mark: MARK, worn: 0.7 });
  shadeArea(p, (x, y) => y >= 13 && y < 15, SHADE, 0.35); shadeArea(p, (x, y) => x > 24 && y >= 13, SHADE, 0.2);
  p.rect(x0, 10, w, 3, D[2]); p.rect(x0, 10, w, 1, D[4]); p.rect(x0, 12, w, 1, D[0]);
  p.rect(x0 + 1, 4, w - 2, 6, MARK); p.px([x0, 5, x0 + w - 1, 5], 0); p.rect(x0, 6, w, 4, MARK); planks(p, x0, 4, w, 6, { ramp: D, pw: 3, seed: 11, mark: MARK, worn: 0.3 });
  shadeArea(p, (x, y) => y >= 4 && y < 10, WHITE, 0.2); p.rect(x0 + 1, 4, w - 2, 1, D[4]);
  // Eisenbänder mit Nieten über Deckel und Front
  for (const bx of [6, 23]) {
    p.rect(bx, 4, 3, 19, IRON[2]); p.rect(bx, 4, 1, 19, IRON[3]); p.rect(bx + 2, 5, 1, 18, IRON[1]); p.rect(bx, 4, 3, 6, IRON[3]); p.rect(bx, 4, 1, 6, IRON[4]);
    for (const y of [5, 8, 11, 15, 18, 21]) p.set(bx + 1, y, y < 10 ? WHITE : IRON[4]);
    p.rect(bx, 12, 3, 1, IRON[0]);
  }
  p.rect(x0, 22, w, 1, IRON[1]); p.rect(x0, 13, w, 1, IRON[1]); for (let x = x0 + 2; x < x0 + w; x += 4) { p.set(x, 22, IRON[3]); }
  // Eckbeschläge
  for (const [cx, sg] of [[x0, 1], [x0 + w - 1, -1]] as const) { for (let j = 0; j < 4; j++) { p.rect(sg > 0 ? cx : cx - (3 - j), 19 + j, 4 - j === 0 ? 1 : 4 - (3 - j), 1, IRON[2]); } p.rect(sg > 0 ? cx : cx - 2, 10, 3, 2, IRON[3]); p.set(sg > 0 ? cx : cx - 2, 10, IRON[4]); p.rect(cx, 13, 1, 10, IRON[sg > 0 ? 3 : 1]); }
  // Schlossplatte mit Überwurf und Vorhängeschloss
  part(p, (l) => {
    l.rect(13, 8, 6, 5, IRON[3]); l.rect(13, 8, 6, 1, IRON[4]); l.rect(18, 9, 1, 4, IRON[1]); l.set(15, 10, WHITE);
    l.rect(12, 13, 8, 7, IRON[2]); l.rect(12, 13, 8, 1, IRON[4]); l.rect(12, 13, 1, 7, IRON[3]); l.rect(19, 14, 1, 6, IRON[0]); l.rect(12, 19, 8, 1, IRON[1]);
    l.rect(15, 15, 2, 2, DARK); l.rect(15, 17, 1, 2, DARK); l.px([13, 14, 18, 18], IRON[4]);
  });
  // Ringgriffe
  for (const x of [10, 21]) { p.set(x, 15, IRON[4]); p.px([x - 1, 16, x + 1, 16, x - 1, 17, x + 1, 17, x, 18], IRON[3]); p.set(x + 1, 17, IRON[1]); }
  p.px([4, 7, 11, 6, 20, 8, 26, 6], D[1]); p.px([4, 17, 26, 20, 11, 20], D[0]);
}

// ---------------------------------------------------------------- Bett
const QUILT = [mix(P.red[2], W[2], 0.25), mix(Y[2], P.tan[2], 0.4), mix(P.forest[3], P.tan[1], 0.2), mix(P.blue[2], P.stone[2], 0.3), C[2]];
function bed(p: Px): void {
  // Kopfteil mit geschwungener Oberkante und Pfosten
  part(p, (l) => {
    for (let x = 4; x <= 21; x++) { const u = (x + 0.5 - 13) / 9, top = 3 + Math.round(u * u * 3); for (let y = top; y < 12; y++) l.set(x, y, MARK); }
    planks(l, 4, 2, 18, 10, { ramp: W, pw: 4, vertical: true, seed: 3, mark: MARK, worn: 0.4 });
    for (let x = 4; x <= 21; x++) { const u = (x + 0.5 - 13) / 9, top = 3 + Math.round(u * u * 3); l.set(x, top, W[4]); }
    for (const x of [1, 22]) { l.rect(x, 3, 3, 10, W[2]); l.rect(x, 3, 1, 10, W[3]); l.rect(x + 2, 3, 1, 10, W[1]); l.rect(x, 1, 3, 2, W[3]); l.set(x, 1, W[4]); l.set(x + 2, 2, W[1]); }
  });
  // Matratze: Kissen, umgeschlagenes Laken, Flickendecke
  part(p, (l) => {
    l.rect(2, 10, 22, 24, W[1]);
    l.rect(3, 10, 20, 7, C[3]);
    l.rect(3, 17, 20, 3, C[4]); l.rect(3, 19, 20, 1, C[2]); l.rect(21, 17, 2, 3, C[2]);
    for (let y = 20; y < 34; y++) for (let x = 3; x < 23; x++) {
      const cxk = Math.floor((x - 3) / 4), cyk = Math.floor((y - 20) / 4), mx = (x - 3) % 4, my = (y - 20) % 4, c = QUILT[hash2(cxk, cyk, 7) % QUILT.length];
      let col = mx === 3 || my === 3 ? mix(c, DARK, 0.35) : mx === 0 && my === 0 ? mix(c, WHITE, 0.3) : c;
      if (x >= 21) col = mix(col, DARK, 0.22); else if (x <= 3) col = mix(col, WHITE, 0.12);
      l.set(x, y, col);
    }
    // Faltenwurf der Decke
    for (const [fx, ph] of [[9, 0], [16, 2]] as const) for (let y = 21; y < 33; y++) { const x = fx + Math.round(Math.sin(y * 0.5 + ph)); l.set(x, y, mix(l.get(x, y), DARK, 0.22)); l.set(x - 1, y, mix(l.get(x - 1, y), WHITE, 0.14)); }
  });
  part(p, (l) => { l.rrect(6, 10, 14, 6, C[4]); l.rect(7, 15, 12, 1, C[2]); l.rect(18, 11, 2, 4, C[3]); l.px([11, 12, 12, 13, 13, 12], C[3]); l.set(7, 11, WHITE); });
  // Fußteil
  part(p, (l) => {
    l.rect(3, 33, 20, 5, MARK); planks(l, 3, 33, 20, 5, { ramp: W, pw: 3, seed: 9, mark: MARK }); l.rect(3, 33, 20, 1, W[4]); l.rect(3, 37, 20, 1, W[0]);
    for (const x of [1, 22]) { l.rect(x, 31, 3, 9, W[2]); l.rect(x, 31, 1, 9, W[3]); l.rect(x + 2, 32, 1, 8, W[0]); l.rect(x, 30, 3, 1, W[4]); }
  });
}

// ---------------------------------------------------------------- Esstisch
function houseTable(p: Px): void {
  tableFrame(p, 1, 9, 30, 6, 8, 5);
  // karierter Läufer über der Mitte
  for (let y = 9; y < 19; y++) for (let x = 11; x < 21; x++) {
    if (y >= 17 && (x & 1)) continue;
    const chk = ((x >> 1) + (y >> 1)) & 1, c = chk ? mix(P.red[2], W[2], 0.15) : C[3];
    p.set(x, y, y >= 15 ? mix(c, DARK, 0.25) : y === 9 ? mix(c, WHITE, 0.25) : c);
  }
  // Tonkrug mit Blumen
  part(p, (l) => {
    l.ball(6, 9.5, 2.8, 3, TERRA, 1, 4); l.rect(5, 5, 3, 2, TERRA[2]); l.rect(4, 5, 5, 1, TERRA[3]); l.px([9, 8, 9, 9], TERRA[2]);
    l.line(6, 5, 4, 1, P.green[2]); l.line(6, 5, 7, 0, P.green[2]); l.line(7, 5, 10, 2, P.green[2]); l.px([5, 3, 9, 3], P.green[4]);
  });
  p.px([3, 0, 4, 0, 3, 1], P.red[3]); p.set(4, 1, Y[3]); p.px([7, 0, 8, 0, 7, 1], WHITE); p.set(8, 1, Y[3]); p.px([10, 1, 11, 2, 10, 2], Y[3]); p.set(11, 1, Y[4]);
  // Brotlaib, Krug, Käse auf dem Teller
  part(p, (l) => { l.ell(15.5, 10.6, 4, 2.2, P.tan[1]); l.ell(15.4, 10.2, 3.6, 1.7, P.tan[2]); l.ell(15, 9.8, 2.6, 1, P.tan[3]); l.px([13, 9, 15, 9, 17, 9], P.tan[4]); });
  part(p, (l) => { l.rect(22, 7, 4, 5, W[3]); l.rect(22, 7, 1, 5, W[4]); l.rect(25, 7, 1, 5, W[1]); l.rect(22, 8, 4, 1, I[2]); l.rect(22, 11, 4, 1, I[2]); l.px([26, 8, 27, 9, 26, 10], W[2]); l.rect(22, 6, 4, 1, C[4]); });
  part(p, (l) => { l.ell(27, 13, 3, 1.4, C[3]); l.rect(25, 12, 4, 1, C[4]); l.poly([[26, 12], [29, 12], [29, 10]], Y[3]); l.set(28, 11, Y[1]); });
  inkOutline(p);
}

// ---------------------------------------------------------------- Regal
function houseShelf(p: Px): void {
  // Rückwand, Seiten, Böden
  p.rect(2, 7, 22, 29, mix(W[0], DARK, 0.4));
  for (const x of [1, 23]) { p.rect(x, 6, 2, 31, W[2]); p.rect(x, 6, 1, 31, W[x === 1 ? 4 : 3]); p.rect(x + 1, 7, 1, 30, W[1]); }
  p.rect(0, 5, 26, 2, W[3]); p.rect(0, 5, 26, 1, W[4]); p.rect(1, 7, 24, 1, W[0]);
  for (const y of [16, 26, 34]) { p.rect(2, y, 22, 2, W[3]); p.rect(2, y, 22, 1, W[4]); p.rect(3, y + 2, 20, 1, DARK); }
  p.rect(1, 36, 3, 2, W[1]); p.rect(22, 36, 3, 2, W[1]);
  // oben: Topfpflanze, liegende Bücher
  part(p, (l) => { l.rect(4, 2, 4, 3, TERRA[2]); l.rect(4, 2, 4, 1, TERRA[4]); l.rect(7, 3, 1, 2, TERRA[1]); l.px([5, 1, 6, 0, 4, 0, 8, 1, 3, 1], P.green[3]); l.px([5, 0, 7, 1], P.green[4]); l.px([6, 1, 2, 2, 9, 2], P.green[2]); });
  part(p, (l) => { l.rect(13, 3, 9, 2, P.blue[1]); l.rect(13, 3, 9, 1, P.blue[2]); l.rect(21, 3, 1, 2, C[3]); l.rect(14, 1, 7, 2, P.red[1]); l.rect(14, 1, 7, 1, P.red[2]); l.rect(20, 1, 1, 2, C[3]); l.set(16, 1, Y[3]); });
  // Fach 1: stehende Teller, Becher
  part(p, (l) => {
    for (const x of [4, 8]) { l.ell(x + 1.5, 12, 1.6, 3.4, C[3]); l.ell(x + 1.2, 12, 0.8, 2.4, C[4]); l.set(x + 2, 14, C[1]); }
    for (const [x, c] of [[14, P.blue], [18, TERRA]] as const) { l.rect(x, 11, 3, 5, c[2]); l.rect(x, 11, 1, 5, c[3]); l.rect(x, 11, 3, 1, c[4]); l.px([x + 3, 12, x + 3, 14], c[2]); l.set(x + 4, 13, c[2]); }
  });
  // Fach 2: Einmachgläser
  part(p, (l) => {
    for (const [x, c] of [[3, P.red], [9, Y], [15, P.green], [20, P.violet]] as const) {
      const w2 = x === 20 ? 3 : 4;
      l.rect(x, 20, w2, 6, c[2]); l.rect(x, 20, 1, 6, c[4]); l.rect(x + w2 - 1, 21, 1, 5, c[1]); l.rect(x, 20, w2, 1, P.ice[3]); l.rect(x, 18, w2, 2, C[2]); l.rect(x, 18, w2, 1, C[4]); l.set(x + 1, 22, WHITE);
    }
  });
  // Fach 3: gefaltete Wäsche, Korb
  part(p, (l) => {
    for (let j = 0; j < 3; j++) { const c = [C[3], mix(P.blue[2], S[2], 0.3), C[4]][j]; l.rect(3, 32 - j * 2, 9, 2, c); l.rect(3, 33 - j * 2, 9, 1, mix(c, DARK, 0.25)); l.set(3, 32 - j * 2, mix(c, WHITE, 0.4)); }
    l.poly([[14, 29], [23, 29], [22, 34], [15, 34]], P.tan[2]); l.rect(14, 29, 9, 1, P.tan[4]); for (let x = 15; x < 22; x++) for (let y = 30; y < 34; y++) if ((x + y) & 1) l.set(x, y, P.tan[1]);
    l.px([16, 28, 18, 27, 20, 28], P.red[2]); l.px([17, 28, 19, 28], P.red[3]);
  });
  inkOutline(p);
}

// ---------------------------------------------------------------- Flickenteppich (flach)
function rug(p: Px): void {
  const cx = 20, cy = 13, rx = 19.4, ry = 12.4;
  const RING = [C[3], mix(P.red[2], W[2], 0.2), mix(Y[2], P.tan[2], 0.4), mix(P.red[1], W[1], 0.2), mix(P.forest[2], P.tan[1], 0.25), mix(P.red[2], W[2], 0.2), C[2], mix(P.red[1], W[1], 0.35)];
  for (let y = 0; y < 26; y++) for (let x = 0; x < 40; x++) {
    const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, d = Math.sqrt(u * u + v * v);
    if (d > 1 - (rnd2(x, y, 3) < 0.25 ? 0.03 : 0)) continue;
    const ring = Math.min(7, Math.floor(d * 8)), a = Math.atan2(v, u), seg = Math.floor(((a / TAU) + 1) * (8 + ring * 7));
    let c = RING[ring];
    // Zopfmuster: jede zweite Masche dunkler, Ringgrenzen als feine Naht
    if ((seg + ring) % 2) c = mix(c, DARK, 0.2);
    if (d * 8 - ring < 0.16 && ring > 0) c = mix(c, DARK, 0.4);
    if (-(u * 0.5 + v * 0.8) > 0.55) c = mix(c, WHITE, 0.1); else if (u * 0.5 + v * 0.8 > 0.6) c = mix(c, DARK, 0.14);
    const n = rnd2(x >> 1, y, 9);
    if (n < 0.07) c = mix(c, DARK, 0.2); else if (n > 0.95) c = mix(c, WHITE, 0.14);
    p.set(x, y, c);
  }
}

// ---------------------------------------------------------------- Trophäenständer
function trophyStand(p: Px): void {
  // Sockel: Fuß, Schaft mit Füllung und Messingschild, Deckplatte
  part(p, (l) => {
    l.rect(3, 29, 14, 4, W[2]); l.rect(3, 29, 14, 1, W[4]); l.rect(3, 32, 14, 1, W[0]); l.rect(15, 30, 2, 3, W[1]); l.rect(2, 32, 16, 1, W[1]);
    l.rect(5, 16, 10, 13, MARK); planks(l, 5, 16, 10, 13, { ramp: W, pw: 5, vertical: true, seed: 3, mark: MARK, worn: 0.3 });
    l.rect(7, 19, 6, 8, W[1]); l.rect(8, 20, 5, 7, W[2]); l.rect(8, 26, 5, 1, W[3]);
    l.rect(8, 21, 4, 3, Y[2]); l.rect(8, 21, 4, 1, Y[4]); l.px([9, 22, 10, 22], Y[0]); l.set(11, 23, Y[1]);
    l.rect(3, 13, 14, 3, W[3]); l.rect(3, 13, 14, 1, W[4]); l.rect(3, 15, 14, 1, W[1]); l.rect(4, 16, 12, 1, W[0]);
  });
  // Samtkissen mit Quasten
  part(p, (l) => { l.rrect(4, 10, 12, 4, P.red[2]); l.rect(5, 10, 10, 1, P.red[3]); l.rect(5, 13, 10, 1, P.red[1]); l.rect(13, 11, 2, 2, P.red[1]); l.px([4, 13, 15, 13], Y[3]); l.px([3, 14, 16, 14], Y[2]); l.set(6, 11, P.red[4]); });
  // Pokal mit Henkeln und Quellstein
  part(p, (l) => {
    l.rect(8, 9, 4, 1, Y[1]); l.rect(9, 7, 2, 2, Y[2]); l.set(9, 7, Y[4]);
    l.poly([[6, 2], [14, 2], [12, 7], [8, 7]], Y[2]); l.poly([[6, 2], [9, 2], [9, 7], [8, 7]], Y[3]); l.rect(6, 1, 8, 1, Y[4]); l.rect(12, 3, 1, 3, Y[1]); l.set(7, 2, WHITE);
    l.px([5, 2, 4, 3, 4, 4, 5, 5, 6, 5], Y[3]); l.px([14, 2, 15, 3, 15, 4, 14, 5, 13, 5], Y[1]);
    l.rect(9, 3, 2, 2, TL[3]); l.set(9, 3, WHITE); l.set(10, 4, TL[1]);
  });
  sparkle(p, 13, 1, WGOLD);
}

export function cmHome(out: Frames): void {
  one(out, 'station_alchemy', 32, 30, stationAlchemy, false);
  anim(out, 'station_cook', 4, 28, 35, stationCook, false);
  anim(out, 'station_enchant', 4, 28, 38, stationEnchant, false);
  one(out, 'stash_chest', 32, 26, stashChest);
  one(out, 'bed', 26, 41, bed, false);
  one(out, 'house_table', 32, 24, houseTable, false);
  one(out, 'house_shelf', 26, 38, houseShelf, false);
  one(out, 'rug', 40, 26, rug, false);
  one(out, 'trophy_stand', 20, 34, trophyStand, false);
}
