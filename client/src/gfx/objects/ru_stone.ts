/** Verlorene Ruinen – Stein: Säulen, Hüterstatue, Bogen, Runenstein, Obelisk, Urnen, Mosaike, Mauerrest, Sonnenuhr, Schutt. */
import { Px, resample } from '../draw';
import { Frames, INK, LEAF, MARK, MARK2, P, Ramp, WHITE, anim, boulder, clamp, glow, hash2, inkOutline, masonry, mix, moss, one, part, rnd2, shadeArea, texFill, vnoise } from './kit';
import { jag } from './kr_kit';
import { ARC, SAND, TERRA, VINE, glyph, over, shaft, shaftH, slab, stoneFill, vineStrand } from './ru_kit';

const Y = P.gold;
const SHADE = P.shadow[2];
const BRONZE: Ramp = [mix(Y[0], P.wood[0], 0.5), mix(Y[1], P.wood[2], 0.4), mix(Y[2], P.tan[1], 0.3), mix(Y[3], P.tan[3], 0.3), Y[4]];
const crack = (p: Px, a: readonly [number, number], b: readonly [number, number], seed: number): void => { for (const [x, y] of resample(jag(a, b, 1.2, seed, 3))) if (p.get(Math.floor(x), Math.floor(y)) >>> 24) p.set(x, y, SAND[0]); };

// ---------------------------------------------------------------- Säulen
function pillarBase(p: Px, y: number): void {
  slab(p, 3, y, 12, 2, 0, 3); p.rect(3, y, 12, 1, SAND[3]);
  slab(p, 1, y + 2, 16, 5, 1, 5);
}
function pillar(p: Px): void {
  shaft(p, 9, 8, 44, 5, 3);
  // Kapitell: Deckplatte in ¾-Sicht, Wulst, Halsring
  slab(p, 1, 0, 16, 5, 2, 7); p.rect(2, 5, 14, 2, SAND[2]); p.rect(2, 5, 14, 1, SAND[1]); p.rect(3, 7, 12, 1, SAND[3]); p.px([2, 6, 3, 6], SAND[3]); p.px([4, 3, 8, 3, 12, 3], SAND[1]); p.rect(3, 8, 12, 1, SAND[1]);
  pillarBase(p, 45);
  crack(p, [11, 12], [8, 26], 4); p.px([4, 20, 4, 21, 13, 33], 0);
  // Ranke windet sich um den Schaft
  for (let y = 43; y > 14; y--) { const x = 9 + Math.round(Math.sin(y * 0.36) * 4.4); p.set(x, y, VINE[y % 3 ? 2 : 1]); if (y % 3 === 0) p.set(x + (y % 2 ? 1 : -1), y - 1, VINE[y % 2 ? 3 : 4]); }
  moss(p, (x, y) => (y > 46 ? 0.5 - (x - 2) * 0.02 : y < 3 ? 0.3 : 0), 5);
}
function pillarBroken(p: Px): void {
  const top = (x: number): number => 7 + Math.round(vnoise(x * 0.6, 3, 8) * 5 + (x - 4) * 0.35);
  shaft(p, 9, 6, 22, 5, 6);
  for (let x = 4; x < 14; x++) { const t = top(x); for (let y = 6; y < t; y++) p.set(x, y, 0); p.set(x, t, SAND[4]); if (x % 3 !== 1) p.set(x, t + 1, SAND[3]); }
  pillarBase(p, 23);
  crack(p, [10, 12], [7, 21], 2);
  over(p, (l) => { boulder(l, 3, 30, 5, 4, { ramp: SAND, seed: 2, cracks: 0 }); boulder(l, 14.5, 30, 6, 4, { ramp: SAND, seed: 5, cracks: 0 }); });
  moss(p, (x, y) => (y > 24 ? 0.5 : y < 13 && x < 9 ? 0.3 : 0), 7);
  p.line(13, 22, 14, 16, VINE[2]); p.px([15, 17, 12, 19, 15, 20], VINE[4]);
}
function pillarFallen(p: Px): void {
  shaftH(p, 8, 20, 10, 5, 3, 13); shaftH(p, 22, 33, 11, 5, 5, 12); shaftH(p, 35, 42, 10.5, 5, 7, 20);
  // Stirnfläche links, Bruchkante rechts
  p.ell(8, 10, 3, 5.2, SAND[2]); p.ell(7.6, 9.8, 2.4, 4.4, SAND[4]); p.ell(7.6, 9.8, 1.2, 2.6, SAND[3]); p.set(7, 9, SAND[1]);
  for (let y = 6; y < 16; y++) { const n = Math.round(vnoise(y * 0.7, 1, 4) * 3); for (let k = 0; k < n; k++) p.set(42 - k, y, 0); p.set(42 - n, y, SAND[y < 10 ? 4 : 2]); }
  over(p, (l) => { boulder(l, 45, 18, 5, 4, { ramp: SAND, seed: 4, cracks: 0 }); boulder(l, 2.5, 18, 4, 3, { ramp: SAND, seed: 6, cracks: 0 }); });
  shadeArea(p, (x, y) => (x === 21 || x === 34) && y > 5 && y < 16, SHADE, 0.3);
  moss(p, (x, y) => (y < 8 ? 0.55 - Math.abs(x - 26) * 0.012 : y > 14 ? 0.35 : 0), 9);
  // Grasbüschel, Ranke
  p.line(14, 17, 13, 13, VINE[3]); p.line(16, 17, 17, 14, VINE[2]); p.line(30, 17, 30, 13, VINE[3]); p.line(32, 17, 33, 14, VINE[4]);
  for (let x = 23; x < 34; x++) if (x % 2) p.set(x, 6 + Math.round(Math.sin(x) * 1), VINE[x % 3 ? 2 : 4]);
}

// ---------------------------------------------------------------- Hüterstatue
function pedestal(p: Px, y: number): void {
  slab(p, 4, y + 2, 16, 6, 0, 3); slab(p, 3, y, 18, 3, 1, 4); slab(p, 2, y + 8, 20, 4, 1, 5);
  for (let k = 0; k < 3; k++) glyph(p, 7 + k * 4, y + 3, k + 2, SAND[1]);
  p.px([8, y + 4, 12, y + 5, 16, y + 4], mix(Y[2], SAND[2], 0.3));
}
function keeper(p: Px, cut = -1): void {
  // Gewand, Schultern, verschränkte Ärmel, Kapuze
  p.poly([[7, 19], [17, 19], [19, 40], [5, 40]], MARK); p.ell(12, 18, 6.6, 3.6, MARK); p.ell(12, 9.4, 4.2, 4.8, MARK); p.rect(9, 12, 6, 6, MARK);
  stoneFill(p, SAND, 11);
  if (cut < 0) {
    p.ell(12.4, 10.4, 2.3, 2.9, SAND[1]); p.ell(12.8, 10.8, 1.6, 2.2, SAND[0]); p.px([12, 10, 14, 10], mix(Y[3], SAND[2], 0.25));   // Gesicht im Kapuzenschatten, Augen aus Runengold
    p.px([9, 6, 10, 5, 11, 5], SAND[4]); p.line(8, 13, 9, 16, SAND[1]); p.line(16, 12, 15, 16, SAND[1]);
    // Ärmel treffen sich vor der Brust, Hände halten eine Schrifttafel
    p.rect(7, 21, 10, 3, SAND[3]); p.rect(7, 21, 10, 1, SAND[4]); p.rect(7, 24, 10, 1, SAND[1]); p.rect(15, 21, 2, 3, SAND[2]);
    p.rect(10, 22, 5, 6, SAND[2]); p.rect(10, 22, 5, 1, SAND[4]); p.rect(10, 27, 5, 1, SAND[0]); p.rect(14, 23, 1, 4, SAND[1]); glyph(p, 11, 22, 1, mix(Y[2], SAND[1], 0.35));
  }
  // Faltenwurf
  for (const [x, y0, y1, b] of [[8, 26, 39, -1], [11, 29, 39, 0], [14, 28, 39, 1], [17, 25, 39, 1]] as const) for (let y = y0; y <= y1; y++) { const X = x + Math.round(((y - y0) / 14) * b); p.set(X, y, SAND[1]); if (p.get(X - 1, y) >>> 24) p.set(X - 1, y, SAND[4]); }
  p.rect(6, 39, 13, 1, SAND[1]);
  if (cut >= 0) for (let x = 0; x < 24; x++) { const t = cut + Math.round(vnoise(x * 0.5, 2, 6) * 4 - (x - 6) * 0.25); for (let y = 0; y < t; y++) p.set(x, y, 0); if (p.get(x, t) >>> 24) { p.set(x, t, SAND[4]); if (p.get(x, t + 1) >>> 24 && x % 2) p.set(x, t + 1, SAND[3]); } }
}
function statue(p: Px): void {
  pedestal(p, 40);
  over(p, (l) => keeper(l));
  crack(p, [15, 14], [10, 30], 3); p.px([5, 34, 5, 35, 18, 31], 0);
  moss(p, (x, y) => (y < 7 ? 0.5 : y > 14 && y < 19 && x < 12 ? 0.42 : y > 38 && y < 42 ? 0.4 : y > 48 ? 0.45 - (x - 2) * 0.015 : 0), 4);
  vineStrand(p, 6, 17, 9, 0, 3, 0);
}
function statueBroken(p: Px): void {
  pedestal(p, 22);
  over(p, (l) => { const k = new Px(24, 52); keeper(k, 27); l.draw(k, 0, -18); });
  // abgeschlagener Kopf am Sockelfuß
  over(p, (l) => { l.ell(19, 30, 3.8, 3.2, MARK); stoneFill(l, SAND, 5); l.ell(20, 30.6, 1.8, 1.6, SAND[0]); l.px([17, 28, 18, 28], SAND[4]); l.set(20, 30, mix(Y[2], SAND[1], 0.4)); });
  moss(p, (x, y) => (y < 14 ? 0.4 : y > 30 ? 0.5 - (x - 2) * 0.02 : y > 20 && y < 24 ? 0.4 : 0), 6);
  p.line(3, 33, 2, 29, VINE[3]); p.line(4, 33, 5, 30, VINE[2]);
}
function rubble(p: Px): void {
  over(p, (l) => boulder(l, 15, 13, 12, 9, { ramp: SAND, seed: 3, cracks: 1 }));
  // Säulentrommel-Bruchstück
  over(p, (l) => { shaftH(l, 2, 11, 10.5, 4, 2, 30); l.ell(11, 10.5, 2, 4, SAND[4]); l.ell(11.2, 10.6, 1, 2.2, SAND[2]); });
  over(p, (l) => { boulder(l, 9, 16, 8, 5, { ramp: SAND, seed: 7, cracks: 0 }); boulder(l, 19, 16, 9, 6, { ramp: SAND, seed: 9, cracks: 0 }); });
  moss(p, (x, y) => (y < 8 ? 0.45 : y > 13 && x < 8 ? 0.4 : 0), 3);
  p.line(22, 15, 23, 11, VINE[3]); p.line(1, 15, 0, 12, VINE[2]);
}

// ---------------------------------------------------------------- Bogen
function arch(p: Px): void {
  const cx = 28, cy = 27, ri = 11.5, ro = 20;
  const cutY = (x: number): number => (x > 37 ? 5 + Math.floor((x - 37) / 5) * 6 + (hash2(x >> 1, 1, 3) & 1) : x < 8 ? 6 + ((8 - x) >> 1) : 5);
  for (let y = 5; y < 60; y++) for (let x = 3; x < 53; x++) {
    const r = Math.hypot(x + 0.5 - cx, y + 0.5 - cy), ring = y < cy && r >= ri && r < ro;
    if (y < cy ? r < ri : x >= 17 && x < 39) continue;               // Durchgang
    if (!ring && y < cutY(x)) continue;                               // abgebrochene Ecke
    if (!ring && y < cy && r >= ro && x > 44 && y < 20) continue;
    p.set(x, y, ring ? MARK2 : MARK);
  }
  masonry(p, 0, 0, 56, 64, { ramp: SAND, bh: 6, bw: 10, seed: 4, mark: MARK, rough: 0.5 });
  // Keilsteine
  texFill(p, MARK2, (x, y) => {
    const dx = x + 0.5 - cx, dy = cy - (y + 0.5), r = Math.hypot(dx, dy), a = (Math.atan2(dy, dx) / Math.PI) * 9, k = Math.floor(a), fr = a - k, hh = hash2(k, 3, 9), key = k === 4;
    let t = 3 + (key ? 1 : 0) - ((hh & 7) === 0 ? 1 : 0);
    if (fr < 0.13) t = 1; else if (fr < 0.26 && !key) t = 4;             // Fuge, daneben Lichtkante
    if (r < ri + 1.1) t = Math.min(t, 2); else if (r > ro - 1.1) t = 1; else if (r > ro - 2.2) t = Math.min(4, t + 1);
    if (rnd2(x, y, 5) < 0.035) t--;
    return SAND[clamp(t, 0, 4)];
  });
  glyph(p, 27, 9, 4, Y[3], Y[4]); p.rect(26, 15, 5, 1, SAND[1]);
  // Gesims in ¾-Sicht, Kämpferplatten, Sockel
  for (let x = 2; x < 54; x++) if (p.get(x, 5) >>> 24 || p.get(x, 6) >>> 24) { p.set(x, 3, SAND[4]); p.set(x, 4, SAND[4]); p.set(x, 5, SAND[3]); p.set(x, 6, SAND[1]); }
  slab(p, 2, 26, 16, 3, 1, 3); slab(p, 38, 26, 16, 3, 1, 4); slab(p, 2, 58, 16, 6, 1, 5); slab(p, 38, 58, 16, 6, 1, 6);
  shadeArea(p, (x, y) => (x === 16 || x === 39) && y > 28 && y < 58, SHADE, 0.3);
  shadeArea(p, (x, y) => x >= 3 && x < 53 && y >= 29 && y < 32, SHADE, 0.22);
  // Reliefband an den Pfeilern
  for (const x0 of [5, 41]) { p.rect(x0, 38, 10, 9, SAND[2]); p.rect(x0, 38, 10, 1, SAND[1]); p.rect(x0, 38, 1, 9, SAND[1]); p.rect(x0 + 9, 39, 1, 8, SAND[4]); p.rect(x0 + 1, 46, 9, 1, SAND[4]); glyph(p, x0 + 2, 40, x0, SAND[0]); glyph(p, x0 + 6, 40, x0 + 3, SAND[0]); }
  crack(p, [10, 8], [14, 24], 3); crack(p, [46, 30], [43, 44], 5);
  for (let x = 38; x < 53; x++) { const t = cutY(x); if (p.get(x, t) >>> 24 && !(p.get(x, t - 1) >>> 24)) p.set(x, t, SAND[4]); }
  moss(p, (x, y) => (y < 8 ? 0.55 : y < 30 && x > 38 && y < cutY(x) + 3 ? 0.6 : y > 57 ? 0.5 - Math.abs(x - 20) * 0.01 : y > 25 && y < 29 ? 0.3 : 0), 8);
  vineStrand(p, 19, 18, 13, 0, 2, 0); vineStrand(p, 22, 16, 8, 0, 5, 0, ARC[3]); vineStrand(p, 35, 17, 10, 0, 4, 0); vineStrand(p, 6, 6, 14, 0, 7, 0); vineStrand(p, 49, 24, 9, 0, 8, 0, ARC[3]);
  p.line(1, 63, 0, 58, VINE[3]); p.line(18, 63, 19, 59, VINE[2]); p.line(37, 63, 36, 60, VINE[3]); p.line(54, 63, 55, 59, VINE[2]);
}

// ---------------------------------------------------------------- Runenstein, Obelisk
function runeStone(p: Px, f: number): void {
  p.poly([[5, 32], [3, 22], [4, 10], [7, 3], [12, 1], [16, 5], [17.5, 16], [16.5, 32]], MARK);
  stoneFill(p, SAND, 7);
  p.line(7, 4, 5, 11, SAND[4]); p.line(12, 2, 15, 6, SAND[2]); shadeArea(p, (x, y) => x > 13 && y > 6, SHADE, 0.16);
  crack(p, [14, 8], [15, 20], 3);
  moss(p, (x, y) => (y > 26 ? 0.55 - (x - 3) * 0.02 : y < 6 ? 0.3 : 0), 4);
  const lv = [0, 1, 2, 1][f], G = [Y[2], Y[3], Y[4]][lv];
  for (let k = 0; k < 3; k++) { for (const [i, j] of [[-1, 0], [1, 0], [0, 1]] as const) glyph(p, 9 + i, 6 + k * 7 + j, k + (k === 2 ? 4 : 0), SAND[1]); glyph(p, 9, 6 + k * 7, k + (k === 2 ? 4 : 0), G, lv === 2 ? WHITE : undefined); }
  p.line(4, 31, 3, 27, VINE[3]); p.line(17, 31, 18, 28, VINE[2]);
  inkOutline(p);
  glow(p, 10.5, 15, 9 + lv, Y[3], 26 + lv * 22);
  if (lv) for (let k = 0; k < 3; k++) glow(p, 10.5, 8.5 + k * 7, 3.4, Y[4], 30 + lv * 20, true);
}
function obelisk(p: Px, f: number): void {
  // Stufensockel
  slab(p, 1, 50, 18, 6, 1, 3); slab(p, 3, 45, 14, 5, 1, 4);
  // Schaft mit heller Front und Schattenseite, Pyramidion aus Gold
  for (let y = 8; y < 45; y++) {
    const t = (y - 8) / 37, x0 = Math.round(7 - t * 2.4), x1 = Math.round(13 + t * 2.4), xs = x1 - 3;
    for (let x = x0; x < x1; x++) { let tone = x >= xs ? 2 : x === x0 ? 4 : 3; if (vnoise(x * 0.3, y * 0.14, 5) > 0.7) tone--; if (rnd2(x, y, 9) < 0.04) tone--; if ((y - 8) % 12 === 11) tone = Math.min(tone, 1); p.set(x, y, SAND[clamp(tone, 0, 4)]); }
  }
  const tw = f === 2 ? 1 : 0;
  p.poly([[7, 8], [10, 1], [13, 8]], Y[2]); p.poly([[7, 8], [10, 1], [10, 8]], Y[3]); p.line(10, 1, 8, 7, Y[4]); p.line(11, 4, 12, 7, Y[1]); p.set(10, 1, tw ? WHITE : Y[4]); p.rect(7, 8, 6, 1, Y[1]);
  crack(p, [11, 14], [9, 30], 6);
  moss(p, (x, y) => (y > 49 ? 0.5 - (x - 1) * 0.02 : y > 44 && y < 47 ? 0.4 : 0), 5);
  // Glyphensäule: ein Lichtpuls wandert nach oben
  for (let k = 0; k < 5; k++) {
    const on = (k + f) % 4 === 0, half = (k + f) % 4 === 1 || (k + f) % 4 === 3, y = 38 - k * 6.4;
    glyph(p, 8 - (k > 2 ? 0 : 1) + (k > 2 ? 0 : 1), Math.round(y), k + 3, on ? Y[4] : half ? Y[3] : mix(Y[2], SAND[1], 0.4), on ? WHITE : undefined);
  }
  p.line(2, 55, 1, 51, VINE[3]); p.line(17, 55, 18, 52, VINE[2]);
  inkOutline(p);
  glow(p, 10, 4, 5 + tw, Y[3], 40 + tw * 20);
  for (let k = 0; k < 5; k++) if ((k + f) % 4 === 0) { glow(p, 9.5, 40.5 - k * 6.4, 4, Y[4], 46, true); glow(p, 9.5, 40.5 - k * 6.4, 8, Y[3], 30); }
}

// ---------------------------------------------------------------- Urnen
function urn(p: Px): void {
  p.ball(7, 10.4, 5.4, 5.8, TERRA); p.rect(5, 15, 4, 2, TERRA[1]); p.rect(4, 16, 6, 2, TERRA[2]); p.rect(4, 16, 6, 1, TERRA[3]); p.rect(4, 17, 6, 1, TERRA[0]);
  p.rect(5, 2, 4, 3, TERRA[2]); p.rect(5, 2, 1, 3, TERRA[3]); p.rect(8, 2, 1, 3, TERRA[1]); p.rect(4, 0, 6, 2, TERRA[3]); p.rect(4, 0, 6, 1, TERRA[4]); p.rect(5, 1, 4, 1, TERRA[0]);
  // Henkel, Bemalung
  p.px([2, 5, 1, 6, 1, 7, 2, 8, 3, 4], TERRA[3]); p.px([11, 5, 12, 6, 12, 7, 11, 8, 10, 4], TERRA[1]);
  for (let x = 2; x < 12; x++) if (p.get(x, 9) >>> 24) { p.set(x, 8, x < 6 ? ARC[3] : ARC[2]); p.set(x, 9, x % 2 ? P.cream[3] : ARC[1]); p.set(x, 10, x < 6 ? ARC[2] : ARC[1]); }
  for (let x = 3; x < 11; x++) if (p.get(x, 12) >>> 24) p.set(x, 12, x < 6 ? Y[3] : Y[2]);
  p.set(5, 6, TERRA[4]); p.px([9, 13, 8, 14], TERRA[0]);
}
function urnBroken(p: Px): void {
  // halbe Urne auf der Seite, Scherben
  p.ball(6.5, 7, 5.6, 4.4, TERRA); p.ell(10.6, 7.2, 2.2, 3.6, TERRA[0]); p.ell(11, 7.4, 1.4, 2.6, mix(TERRA[0], INK, 0.5));
  p.px([8, 3, 9, 2, 10, 3, 12, 4, 13, 5, 12, 10, 11, 11], TERRA[3]); p.px([9, 3, 12, 5], TERRA[4]);
  for (let y = 4; y < 11; y++) if (p.get(4, y) >>> 24) { p.set(4, y, ARC[2]); p.set(5, y, y % 2 ? P.cream[3] : ARC[1]); }
  p.rect(1, 6, 2, 3, TERRA[2]); p.set(0, 7, TERRA[3]);
  over(p, (l) => { l.poly([[12, 9], [15, 10], [14, 12], [11, 11]], TERRA[2]); l.set(13, 10, TERRA[4]); l.px([1, 11, 2, 10, 2, 11, 3, 11], TERRA[3]); l.px([7, 11, 8, 11], TERRA[1]); l.set(15, 6, TERRA[2]); });
}

// ---------------------------------------------------------------- Bodenmosaike (flach)
function mosaic(p: Px, k: number): void {
  const CR = P.cream, B = ARC, col = (r: Ramp | readonly number[], i: number): number => r[i];
  for (let cy = 0; cy < 12; cy++) for (let cx = 0; cx < 16; cx++) {
    const X = cx * 2, Y0 = cy * 2, u = cx - 7.5, v = (cy - 5.5) * 1.35, hh = hash2(cx, cy, 31 + k * 7);
    const edge = Math.max(Math.abs(u) / 8, Math.abs(v) / 7.6) + (vnoise(cx * 0.5, cy * 0.5, 4 + k) - 0.5) * 0.5 + ((cx + cy * (k + 1)) % 7 === 0 ? 0.12 : 0);
    if (edge > 1 || (k === 1 && cx > 11 && cy < 3) || (k === 2 && cx < 4 && cy > 8) || (k === 0 && cx > 12 && cy > 9)) continue;
    let c: number, lost = (hh & 31) < 3 || (edge > 0.82 && (hh & 7) < 3);
    const d = Math.hypot(u, v), a = Math.atan2(v, u);
    if (k === 0) {                                                      // Sonnenrad
      c = d < 1.6 ? Y[4] : d < 2.8 ? Y[3] : d < 3.8 ? B[1] : d < 6.4 ? (Math.floor((a / Math.PI) * 6 + 12.5) % 2 ? Y[2] : CR[3]) : d < 7.5 ? B[2] : CR[2];
    } else if (k === 1) {                                               // Wellenband
      const w = Math.round(Math.sin(cx * 0.9) * 1.5);
      c = Math.abs(v) > 5.6 ? B[1] : Math.abs(v) > 4.6 ? Y[2] : Math.abs(cy - 5.5 + w) < 1 ? B[3] : Math.abs(cy - 5.5 + w) < 2.2 ? B[2] : (cx + cy) % 4 === 0 ? TERRA[3] : CR[3];
    } else {                                                            // Rauten-Auge
      const m = Math.abs(u) + Math.abs(v) * 1.1, b = Math.floor(m / 1.7);
      c = m < 1.4 ? Y[4] : b === 1 ? B[3] : b === 2 ? CR[3] : b === 3 ? TERRA[2] : b === 4 ? B[1] : CR[2];
    }
    if (lost) c = mix(SAND[2], P.sand[2], 0.5);
    const v2 = (hh >> 8) & 3;
    p.set(X, Y0, lost ? c : mix(c, WHITE, v2 === 0 ? 0.3 : 0.16)); p.set(X + 1, Y0, c); p.set(X, Y0 + 1, c); p.set(X + 1, Y0 + 1, mix(c, INK, lost ? 0.06 : v2 === 1 ? 0.3 : 0.18));
    void col;
  }
  // Sandverwehung und Randschatten
  for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) {
    const c = p.get(x, y); if (!(c >>> 24)) continue;
    if (!(p.get(x, y + 1) >>> 24) || !(p.get(x + 1, y) >>> 24)) p.set(x, y, mix(c, SAND[0], 0.45));
    else if (vnoise(x * 0.22, y * 0.3, 9 + k) > 0.74) p.set(x, y, mix(c, P.sand[3], 0.6));
  }
}

// ---------------------------------------------------------------- Mauerrest mit Relief
function wallFrag(p: Px): void {
  const top = (x: number): number => (x < 20 ? 5 : x < 31 ? 9 : x < 40 ? 15 : 21) + (hash2(x >> 2, 2, 7) & 1);
  for (let x = 2; x < 46; x++) for (let y = top(x); y < 30; y++) p.set(x, y, MARK);
  masonry(p, 0, 0, 48, 30, { ramp: SAND, bh: 5, bw: 9, seed: 6, mark: MARK, rough: 0.5 });
  for (let x = 2; x < 46; x++) { const t = top(x); p.set(x, t, SAND[4]); p.set(x, t + 1, SAND[4]); p.set(x, t + 2, SAND[3]); if (x % 4 === 0) p.set(x, t + 1, SAND[2]); }
  p.rect(2, 28, 44, 2, SAND[1]); p.rect(2, 27, 44, 1, SAND[2]);
  // Relieftafel: Sonnenscheibe über Wellen, zwei kniende Gestalten
  p.rect(5, 10, 23, 15, SAND[1]); p.rect(6, 11, 21, 13, SAND[3]); p.rect(6, 11, 21, 1, SAND[1]); p.rect(6, 11, 1, 13, SAND[1]); p.rect(27, 11, 1, 14, SAND[4]); p.rect(6, 24, 22, 1, SAND[4]);
  p.ell(16.5, 15, 2.6, 2.6, SAND[4]); p.ell(17, 15.4, 2, 2, mix(Y[2], SAND[3], 0.35)); p.px([15, 13, 16, 13], WHITE);
  for (const [dx, dy] of [[-4, 0], [4, 0], [0, -3], [-3, -2], [3, -2], [-3, 2], [3, 2]] as const) { p.set(16.5 + dx, 15 + dy, SAND[4]); p.set(17.5 + dx, 15.6 + dy, SAND[1]); }
  for (let x = 8; x < 26; x++) { const y = 21 + Math.round(Math.sin(x * 1.1) * 0.8); p.set(x, y, SAND[4]); p.set(x, y + 1, SAND[1]); }
  for (const [x, s] of [[9, 1], [24, -1]] as const) { p.rect(x, 15, 2, 4, SAND[4]); p.set(x, 14, SAND[4]); p.set(x + s, 14, SAND[4]); p.set(x + s * 2, 16, SAND[4]); p.set(x + s * 3, 15, SAND[4]); p.rect(x + (s > 0 ? 1 : 0), 16, 1, 3, SAND[1]); p.set(x - s, 18, SAND[4]); }
  crack(p, [22, 9], [26, 26], 2); crack(p, [36, 16], [33, 28], 4);
  moss(p, (x, y) => (y < top(x) + 3 ? 0.62 : y > 25 ? 0.4 - Math.abs(x - 12) * 0.01 : 0), 3);
  vineStrand(p, 33, 15, 9, 0, 3, 0, ARC[3]); vineStrand(p, 43, 22, 6, 0, 5, 0); vineStrand(p, 3, 7, 8, 0, 8, 0);
  over(p, (l) => { boulder(l, 43, 30, 7, 5, { ramp: SAND, seed: 8, cracks: 0 }); });
  void LEAF;
}

// ---------------------------------------------------------------- Sonnenuhr
function sundial(p: Px): void {
  slab(p, 3, 14, 18, 6, 1, 4);
  p.rect(2, 7, 20, 7, MARK); p.ell(12, 14, 10, 2.4, MARK); stoneFill(p, SAND, 5); p.rect(3, 13, 18, 1, SAND[1]);
  // Scheibe mit Stundenmarken und Goldring
  p.ell(12, 7, 10.6, 5.2, SAND[3]); p.ell(12, 6.6, 10, 4.6, SAND[4]);
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2, x = 12 + Math.cos(a) * 8.4, y = 6.6 + Math.sin(a) * 3.7; p.set(x, y, k % 3 === 0 ? ARC[2] : SAND[1]); }
  for (let k = 0; k < 40; k++) { const a = (k / 40) * Math.PI * 2; if (k % 5 !== 2) p.set(12 + Math.cos(a) * 5.6, 6.6 + Math.sin(a) * 2.4, k % 2 ? Y[3] : Y[2]); }
  // Zeiger aus Bronze und sein Schatten
  p.line(13, 7, 19, 9, SAND[1]); p.line(14, 8, 18, 9, SAND[2]);
  over(p, (l) => { l.poly([[11, 7], [11, 0], [16, 7]], BRONZE[2]); l.line(11, 0, 11, 6, BRONZE[4]); l.line(12, 2, 15, 6, BRONZE[1]); l.set(12, 5, BRONZE[3]); });
  moss(p, (x, y) => (y > 15 ? 0.5 - (x - 3) * 0.02 : y > 9 && y < 14 && x < 7 ? 0.4 : 0), 6);
  p.set(5, 5, SAND[2]); p.px([18, 4, 19, 5], SAND[2]);
}

export function ruStone(out: Frames): void {
  one(out, 'pillar', 18, 52, pillar); one(out, 'pillar_broken', 18, 30, pillarBroken); one(out, 'pillar_fallen', 48, 18, pillarFallen);
  one(out, 'statue', 24, 52, statue); one(out, 'statue_broken', 24, 34, statueBroken); one(out, 'rubble', 24, 16, rubble);
  one(out, 'arch', 56, 64, arch);
  anim(out, 'rune_stone', 4, 20, 32, runeStone, false); anim(out, 'obelisk', 4, 20, 56, obelisk, false);
  one(out, 'urn', 14, 18, urn); one(out, 'urn_broken', 16, 12, urnBroken);
  for (let k = 0; k < 3; k++) one(out, `mosaic_${k}`, 32, 24, (p) => mosaic(p, k), false);
  one(out, 'wall_frag', 48, 30, wallFrag); one(out, 'sundial', 24, 20, sundial);
}
