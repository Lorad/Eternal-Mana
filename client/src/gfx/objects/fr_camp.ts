/** Frostgebirge – Gebautes: Blockhütte, Fellgestell, Schlitten, Holzstoß, Laterne, Gebetsfahnen. */
import { Px } from '../draw';
import { Frames, MARK, MARK2, P, Ramp, WHITE, band, boulder, glow, hash2, masonry, mix, part, planks, rings, rnd2, shadeArea, texFill, vnoise } from './kit';
import { roofTiles } from './gw_houses';
import { FROCK, FWOOD, ICE, LOG, SNOW, fAnim, fOne, fOutline, icicles, mound, partIn, snowCap } from './fr_kit';

const T = P.tan, I = P.steel, Y = P.gold;
const SHADE = P.shadow[2];
const SHINGLE: Ramp = [mix(P.wood[0], I[0], 0.6), mix(P.wood[1], I[0], 0.6), mix(P.wood[1], I[1], 0.6), mix(P.wood[2], I[1], 0.55), mix(P.wood[3], I[2], 0.55)];

/** Rundes Stirnholz eines Blockbalkens. */
function logEnd(p: Px, cx: number, cy: number, seed: number): void {
  p.ell(cx, cy, 2.6, 2.6, LOG[1]); p.ell(cx, cy, 1.9, 1.9, T[seed & 1 ? 3 : 2]); p.ell(cx - 0.3, cy - 0.3, 1, 1, T[3]); p.set(cx, cy, T[1]);
}
/** Warm leuchtendes Fenster mit Sprossen, Reif in den Ecken und Schnee auf dem Sims. */
function warmWin(p: Px, x: number, y: number, w: number, h: number): void {
  p.rect(x - 1, y - 1, w + 2, h + 2, LOG[0]); p.rect(x - 1, y - 1, w + 2, 1, LOG[2]);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const d = i + j; p.set(x + i, y + j, d < 3 ? P.fire[4] : d < w ? Y[3] : d < w + 4 ? P.fire[3] : P.fire[2]); }
  p.rect(x + (w >> 1), y, 1, h, mix(LOG[1], P.fire[1], 0.35)); p.rect(x, y + (h >> 1), w, 1, mix(LOG[1], P.fire[1], 0.35));
  p.px([x, y + h - 1, x + 1, y + h - 1, x, y + h - 2, x + w - 1, y + h - 1, x + w - 1, y], ICE[4]); p.px([x + w - 2, y + h - 1, x + w - 1, y + h - 2], ICE[5]);
  // Läden
  for (const sx of [x - 4, x + w + 1]) { p.rect(sx, y - 1, 3, h + 2, P.forest[1]); p.rect(sx, y - 1, 1, h + 2, P.forest[2]); p.rect(sx + 2, y - 1, 1, h + 2, P.forest[0]); p.rect(sx, y + 2, 3, 1, P.forest[0]); p.rect(sx, y + h - 3, 3, 1, P.forest[0]); p.rect(sx, y - 2, 3, 1, SNOW[4]); }
  p.rect(x - 2, y + h + 1, w + 4, 2, LOG[3]); p.rect(x - 2, y + h + 2, w + 4, 1, LOG[1]);
  p.rect(x - 2, y + h, w + 4, 1, SNOW[4]); p.rect(x - 1, y + h - 1, 3, 1, SNOW[4]); p.rect(x + w - 3, y + h + 1, 4, 1, SNOW[2]);
}
function cabin(p: Px): void {
  const wx0 = 9, wx1 = 70, wy0 = 52, rows = 8;
  // Blockwand: liegende Rundstämme, je 5 px
  for (let y = wy0; y < wy0 + rows * 5; y++) for (let x = wx0; x <= wx1; x++) {
    const r = Math.floor((y - wy0) / 5), m = (y - wy0) % 5, hh = hash2(r, 3, 17), g = hash2((x + (hh & 7)) >> 2, r * 5 + m, 23) & 15;
    let tone = [3, 3, 2, 1, 0][m];
    if (m === 0) tone = g < 3 ? 2 : g > 12 ? 4 : 3;
    else if (m === 1 || m === 2) tone += g < 3 ? -1 : g > 13 ? 1 : 0;
    if ((x + (hh >> 4)) % 31 === 0 && m > 0 && m < 4) tone = 0;       // Stoßfuge
    p.set(x, y, LOG[Math.max(0, Math.min(4, tone))]);
  }
  for (const [x, y] of [[20, 85], [58, 60], [29, 64], [63, 86]] as const) { p.px([x, y, x + 1, y], LOG[0]); p.set(x, y - 1, LOG[3]); }
  // Sockel aus Feldsteinen
  masonry(p, wx0 - 1, 92, wx1 - wx0 + 3, 6, { ramp: FROCK, bh: 3, bw: 7, seed: 5, rough: 0.7 }); p.rect(wx0 - 1, 97, wx1 - wx0 + 3, 1, FROCK[0]);
  // verkämmte Ecken: Stirnhölzer abwechselnd versetzt
  for (let r = 0; r < rows; r++) for (const [cx, s] of [[wx0 - 1, -1], [wx1 + 2, 1]] as const) {
    const cy = wy0 + r * 5 + 2.5;
    if (r & 1) logEnd(p, cx + s * 0.5, cy, r); else { p.rect(cx - 2, cy - 2, 5, 4, LOG[2]); p.rect(cx - 2, cy - 2, 5, 1, LOG[3]); p.rect(cx - 2, cy + 1, 5, 1, LOG[1]); p.set(cx + s * 2, cy, LOG[4]); }
  }
  // Tür mit Eisenbändern, Schwelle, Lichtspalt
  const dx = 34, dy = 67, dw = 12, dh = 25;
  p.rect(dx - 2, dy - 2, dw + 4, dh + 2, LOG[0]); p.rect(dx - 2, dy - 2, dw + 4, 1, LOG[3]); p.rect(dx - 2, dy - 1, 1, dh + 1, LOG[2]);
  p.rect(dx, dy, dw, dh, MARK2); planks(p, dx, dy, dw, dh, { ramp: T, pw: 4, vertical: true, seed: 3, mark: MARK2, worn: 0.8 });
  band(p, dx, dy + 4, dw - 2, 2); band(p, dx, dy + dh - 7, dw - 2, 2);
  p.rect(dx + dw - 3, dy + 12, 2, 3, I[2]); p.set(dx + dw - 3, dy + 12, I[4]);
  p.rect(dx + 3, dy + 3, 4, 4, P.fire[3]); p.rect(dx + 3, dy + 3, 4, 1, P.fire[4]); p.rect(dx + 5, dy + 3, 1, 4, LOG[1]); p.px([dx + 3, dy + 6, dx + 6, dy + 3], ICE[4]);
  p.rect(dx, dy + dh - 1, dw, 1, P.fire[2]);
  p.rect(dx - 3, 92, dw + 6, 3, FROCK[3]); p.rect(dx - 3, 92, dw + 6, 1, SNOW[4]); p.rect(dx - 3, 95, dw + 6, 1, FROCK[1]); p.rect(dx + 1, 92, 8, 1, FROCK[4]);
  warmWin(p, 16, 66, 10, 10); warmWin(p, 54, 66, 10, 10);
  // Geweih über der Tür, Schneeschuhe an der Wand
  p.px([38, 62, 41, 62, 37, 61, 42, 61, 36, 59, 43, 59, 36, 60, 43, 60, 35, 61, 44, 61, 38, 60, 41, 60], P.bone[3]); p.rect(39, 62, 2, 2, P.bone[2]); p.px([36, 58, 43, 58], P.bone[4]);
  for (const x of [48, 51]) { p.ell(x + 1, 82, 1.6, 5.4, T[2]); p.ell(x + 1, 82, 0.6, 4, LOG[0]); p.px([x + 1, 79, x + 1, 82, x + 1, 85], T[3]); p.line(x + 1, 87, x + 1, 90, T[1]); }
  // Schatten unter der Traufe
  shadeArea(p, (x, y) => x >= wx0 - 3 && x <= wx1 + 3 && y >= wy0 && y < wy0 + 5 - ((x * 7) >> 2 & 1), SHADE, 0.36);
  shadeArea(p, (x, y) => x >= wx0 - 3 && x <= wx1 + 3 && y >= wy0 + 4 && y < wy0 + 7, SHADE, 0.14);
  // Schneewehen am Wandfuß, Brennholz
  for (const [x, y] of [[24, 94], [28.4, 94], [26.2, 90.4]] as const) { p.ell(x, y, 2.4, 2.4, LOG[1]); rings(p, x, y, 1.7, 1.7, T, Math.round(x)); }
  mound(p, 13, 100, 11, 6.4, 3); mound(p, 69, 100, 10, 5.4, 4); mound(p, 31, 100, 6, 2.4, 6); mound(p, 52, 100, 7, 3, 8);
  // Dach: dicke Schneedecke über Schindeln
  partIn(p, (l) => {
    const eave = (x: number): number => 53 + Math.round(vnoise(x * 0.2, 1, 5) * 3);
    l.poly([[12, 14], [67, 14], [79, 58], [0, 58]], MARK);
    for (let x = 0; x < 80; x++) for (let y = eave(x) + 1; y < 60; y++) if (l.get(x, y) === MARK) l.set(x, y, 0);
    // Schmelzfleck rund um den Schornstein: nasse Schindeln
    for (let y = 22; y < 42; y++) for (let x = 44; x < 72; x++) if (l.get(x, y) === MARK && Math.hypot((x - 58.5) / 7.6, (y - 33) / (3.6 + vnoise(x * 0.5, 2, 9) * 1.6)) < 1) l.set(x, y, MARK2);
    roofTiles(l, SHINGLE, 14, 44, 7, 4, 5, MARK2);
    texFill(l, MARK, (x, y) => {
      const de = eave(x) - y, n = vnoise(x * 0.13, y * 0.3, 9), le = x - (12 - ((y - 14) * 12) / 44), re = 67 + ((y - 14) * 12) / 44 - x;
      let t = 3;
      if (de === 0) t = 1; else if (de === 1) t = 2; else if (de === 2 || de === 3) t = 4;
      else if (y < 17) t = 4;
      else if (re < 2.5) t = 2; else if (le < 3) t = 4;
      else if (n > 0.62) t = 2; else if (n < 0.3 && y < 44) t = 4;
      else if ((y - 14) % 9 === 7 && vnoise(x * 0.3, y, 4) > 0.42) t = 2;   // Schichtlinien der Schneedecke
      if (SHINGLE.includes(l.get(x, y - 1))) t = 4;   // Schneekante unter dem Schmelzfleck
      return SNOW[t];
    });
    for (let y = 22; y < 42; y++) for (let x = 44; x < 72; x++) if (SNOW.includes(l.get(x, y)) && SHINGLE.includes(l.get(x, y + 1))) l.set(x, y, SNOW[1]);
    // Firstwulst
    for (let x = 11; x <= 67; x++) { const hgt = 1 + Math.round(vnoise(x * 0.3, 4, 2) * 1.4); for (let k = 0; k <= hgt; k++) l.set(x, 13 - k, k === hgt ? SNOW[4] : SNOW[3]); }
    // Firstpfetten-Köpfe und Eiszapfen an der Traufe
    logEnd(l, 10, 15, 1); logEnd(l, 69, 15, 2); l.px([9, 12, 10, 12, 11, 12, 68, 12, 69, 12, 70, 12], SNOW[4]);
    icicles(l, 2, 77, (x) => eave(x) + 1, 11, 7, 3);
    // Schornstein aus Feldstein
    masonry(l, 54, 9, 9, 24, { ramp: FROCK, bh: 4, bw: 5, seed: 9, rough: 0.5 });
    shadeArea(l, (x, y) => x >= 61 && x < 63 && y >= 9 && y < 33, SHADE, 0.35);
    l.rect(53, 8, 11, 3, FROCK[3]); l.rect(53, 8, 11, 1, FROCK[4]); l.rect(53, 10, 11, 1, FROCK[1]);
    l.rect(53, 6, 11, 2, SNOW[4]); l.rect(54, 5, 4, 1, SNOW[4]); l.rect(60, 7, 4, 1, SNOW[2]); l.rect(56, 6, 5, 2, P.ash[0]); l.px([57, 7, 58, 7], P.fire[1]); l.set(59, 7, P.fire[2]);
    shadeArea(l, (x, y) => x >= 63 && x <= 66 && y >= 14 && y <= 35 && SHINGLE.includes(l.get(x, y)), SHADE, 0.3);
  });
  fOutline(p);
  // warmer Schein der Fenster und der Türluke auf Wand und Schnee
  glow(p, 21, 71, 11, Y[3], 46, true); glow(p, 59, 71, 11, Y[3], 46, true); glow(p, 39, 72, 6, Y[3], 40, true);
  glow(p, 21, 71, 15, Y[3], 26); glow(p, 59, 71, 15, Y[3], 26);
}
function pelt(p: Px, x: number, y: number, w: number, h: number, R: Ramp, seed: number): void {
  for (let j = 0; j < h; j++) {
    const k = j / (h - 1), ext = j === 0 || j === h - 3 ? 1 : 0, hw = (w / 2) * (k < 0.75 ? 1 - k * 0.2 : 0.8 - (k - 0.75) * 2.2) + ext;
    for (let i = -Math.ceil(hw); i <= Math.ceil(hw); i++) {
      if (Math.abs(i) > hw) continue;
      const u = i / Math.max(1, hw), n = rnd2(x + i, (y + j) >> 1, seed);
      p.set(x + i, y + j, R[Math.max(0, Math.min(4, Math.round(2.4 - u * 1.4 + (n > 0.75 ? 1 : n < 0.25 ? -1 : 0))))]);
    }
  }
  p.px([x, y + h, x, y + h + 1], R[1]); p.rect(x - 1, y - 1, 2, 1, T[3]);
}
function furRack(p: Px): void {
  for (const x of [5, 22]) { p.line(x - 3, 29, x, 3, FWOOD[1], 2); p.line(x - 3, 29, x, 3, FWOOD[3]); p.line(x + 3, 29, x, 3, FWOOD[1], 2); p.line(x + 3, 29, x + 1, 5, FWOOD[2]); p.rect(x - 1, 5, 3, 2, T[2]); p.set(x - 1, 5, T[4]); }
  p.rect(2, 5, 25, 2, FWOOD[2]); p.rect(2, 5, 25, 1, FWOOD[4]); p.px([1, 5, 27, 6], FWOOD[1]);
  partIn(p, (l) => {
    pelt(l, 9, 8, 6, 15, [P.wood[0], P.wood[1], P.wood[2], P.wood[3], T[3]], 3);
    pelt(l, 19, 8, 6, 13, [P.stone[0], P.stone[1], P.stone[2], P.stone[3], P.stone[4]], 5);
    pelt(l, 14, 8, 5, 17, [SNOW[0], SNOW[1], SNOW[2], P.cream[3], WHITE], 7);
  });
  snowCap(p, (x) => (x > 6 && x < 21 ? 0 : 1), { raise: 1, y1: 6, seed: 2 }); p.rect(10, 4, 8, 1, SNOW[4]); p.rect(12, 3, 4, 1, SNOW[4]);
  mound(p, 3, 30, 3.4, 2, 2); mound(p, 24, 30, 3.6, 2.2, 3);
}
function sled(p: Px): void {
  const R = FWOOD;
  // hintere Kufe, Streben, vordere Kufe mit aufgebogenem Horn
  p.line(6, 12, 25, 12, R[1]); p.line(25, 12, 28, 9, R[1]);
  for (const x of [7, 14, 21]) { p.rect(x, 8, 2, 6, R[2]); p.rect(x, 8, 1, 6, R[3]); }
  p.rect(3, 14, 22, 1, R[3]); p.rect(3, 15, 22, 1, R[1]); p.px([25, 14, 26, 13, 27, 12, 28, 11, 28, 10, 28, 9, 27, 8, 26, 8], R[3]); p.px([25, 15, 26, 14, 27, 13], R[1]); p.px([3, 14, 24, 14], I[3]);
  p.rect(3, 7, 23, 2, R[3]); p.rect(3, 7, 23, 1, R[4]); p.px([8, 8, 15, 8, 21, 8], R[1]); p.line(26, 8, 27, 8, T[2]);
  // Ladung: Fellrolle und Kiste, verschnürt, Schnee obenauf
  partIn(p, (l) => {
    l.rect(15, 2, 8, 5, P.wood[2]); l.rect(15, 2, 8, 1, P.wood[4]); l.rect(15, 4, 8, 1, P.wood[1]); l.rect(22, 2, 1, 5, P.wood[1]);
    l.ball(9, 4.6, 5, 2.6, [P.wood[0], P.wood[1], P.wood[2], T[2], T[3]]); l.ell(4.6, 4.6, 1.2, 2.2, T[3]); l.set(4, 4, T[1]);
    l.rect(8, 2, 1, 5, T[4]); l.rect(12, 2, 1, 5, T[4]); l.rect(18, 2, 1, 5, T[3]);
  });
  p.rect(15, 1, 7, 1, SNOW[4]); p.rect(16, 0, 4, 1, SNOW[4]); p.px([7, 1, 8, 1, 9, 1, 10, 1, 11, 1, 8, 0, 9, 0], SNOW[4]); p.px([21, 1, 12, 2], SNOW[2]);
  p.line(28, 9, 29, 14, T[2]); p.set(29, 15, T[1]);
}
function woodpileSnow(p: Px): void {
  for (const x of [1, 25]) { p.rect(x, 5, 2, 14, FWOOD[2]); p.rect(x, 5, 1, 14, FWOOD[3]); p.set(x, 4, SNOW[4]); p.set(x + 1, 4, SNOW[3]); }
  const lg = (x: number, y: number, r: number, k: number): void => { p.ell(x, y, r, r, FWOOD[1]); rings(p, x, y, r - 0.8, r - 0.8, T, k); p.set(x - 1, y - r + 1, FWOOD[3]); };
  for (let i = 0; i < 4; i++) lg(6.5 + i * 5.2, 16, 2.9, i);
  for (let i = 0; i < 3; i++) lg(9 + i * 5.2, 11.2, 2.9, i + 4);
  lg(11.8, 6.8, 2.7, 8); lg(17, 6.6, 2.6, 9);
  snowCap(p, (x) => (x < 3 || x > 24 ? 0 : 3.2 - Math.abs(x - 14) * 0.1), { raise: 2, seed: 6, x0: 3, x1: 24 });
  icicles(p, 5, 9, 9, 4, 3, 2); icicles(p, 20, 23, 10, 5, 3, 2);
  mound(p, 5, 20, 5, 2.4, 2); mound(p, 23, 20, 4.4, 2, 3);
}
function lanternFrost(p: Px, f: number): void {
  const B: Ramp = [P.ash[0], I[0], I[1], I[2], I[3]];
  // Pfahl mit Seilwicklung, Konsole
  p.rect(6, 14, 3, 20, FWOOD[2]); p.rect(6, 14, 1, 20, FWOOD[3]); p.rect(8, 14, 1, 20, FWOOD[1]); for (let y = 18; y < 32; y += 5) p.set(7, y, FWOOD[1]);
  p.rect(6, 22, 3, 1, T[2]); p.rect(6, 24, 3, 1, T[3]); p.set(9, 25, T[2]); p.set(9, 26, T[1]);
  p.rect(4, 13, 7, 1, B[2]); p.px([5, 14, 9, 14], B[1]);
  // Laternenkäfig, Eisendach mit Schneehaube und Eiszapfen
  p.rect(4, 5, 7, 8, Y[3]); p.rect(4, 5, 1, 8, B[1]); p.rect(10, 5, 1, 8, B[0]); p.rect(7, 5, 1, 8, mix(Y[2], B[1], 0.45)); p.rect(4, 12, 7, 1, B[1]);
  p.rect(3, 4, 9, 1, B[2]); p.rect(3, 3, 9, 1, SNOW[4]); p.rect(4, 2, 7, 1, SNOW[4]); p.rect(6, 1, 3, 1, SNOW[4]); p.px([11, 3, 10, 2, 8, 1], SNOW[2]);
  p.set(3, 5, ICE[5]); p.set(3, 6, ICE[3]); p.set(11, 5, ICE[4]); p.set(11, 6, ICE[4]); p.set(11, 7, ICE[3]);
  const fl = [0, 1, 0, -1][f];
  p.rect(5, 8 - (f === 1 ? 1 : 0), 2, 3, P.fire[4]); p.set(8, 9 + fl, P.fire[4]); p.set(9, 9, P.fire[3]); p.px([5, 11, 6, 11, 8, 11, 9, 11], P.fire[2]); p.set(5, 7, f === 1 ? P.fire[3] : WHITE);
  p.px([5, 5, 9, 5], ICE[4]);
  mound(p, 7.5, 36, 4.4, 2.8, 4);
  fOutline(p);
  glow(p, 7.5, 9, 7 + (f & 1) * 0.5, Y[3], 74 + (f === 1 ? 14 : f === 3 ? -8 : 0));
}
function prayerFlags(p: Px, f: number): void {
  // Steinhaufen mit Stangen
  for (const [x, y0] of [[4, 3], [43, 7]] as const) { p.rect(x, y0, 2, 37 - y0, FWOOD[2]); p.rect(x, y0, 1, 37 - y0, FWOOD[3]); p.px([x, y0 - 1, x + 1, y0 - 1], SNOW[4]); p.set(x, y0 - 2, SNOW[4]); p.rect(x, y0 + 3, 2, 1, T[3]); }
  partIn(p, (l) => { boulder(l, 5, 40, 9, 5, { ramp: FROCK, seed: 3, cracks: 0 }); boulder(l, 44, 40, 8, 5, { ramp: FROCK, seed: 5, cracks: 0 }); snowCap(l, 1.4, { raise: 1, seed: 2 }); });
  const rope = (x: number): number => { const t = (x - 5) / 38; return 6 + 4 * t + 26 * t * (1 - t) * 1; };
  const COL: Ramp[] = [[P.blue[1], P.blue[2], P.blue[3]], [P.cream[2], P.cream[3], P.cream[4]], [P.red[1], P.red[2], P.red[3]], [P.forest[1], P.forest[2], P.forest[3]], [P.gold[1], P.gold[2], P.gold[3]]];
  for (let x = 5; x <= 43; x++) p.set(x, rope(x), T[x % 3 === 0 ? 1 : 2]);
  for (let i = 0; i < 6; i++) {
    const x0 = 8 + i * 6, C = COL[i % 5];
    for (let c = 0; c < 5; c++) {
      const x = x0 + c, ph = (f * Math.PI) / 2 + i * 1.1 - c * 0.8, wave = Math.sin(ph), len = 7 + Math.round(wave * 0.9) - (i === 3 && c > 2 ? 3 : 0), y0 = Math.round(rope(x)) + 1;
      for (let j = 0; j < len; j++) p.set(x + (j > 3 ? Math.round(wave * 0.6) : 0), y0 + j, C[Math.cos(ph) > 0.4 ? 2 : Math.cos(ph) < -0.4 ? 0 : 1]);
      if (c === 2) p.set(x, y0 + 2, i % 5 === 1 ? P.red[2] : P.cream[4]);
    }
  }
  p.px([4, 6, 5, 6, 43, 10, 44, 10], T[3]);
}

export function frCamp(out: Frames): void {
  fOne(out, 'cabin', 80, 100, cabin, false);
  fOne(out, 'fur_rack', 28, 30, furRack);
  fOne(out, 'sled', 30, 16, sled);
  fOne(out, 'woodpile_snow', 28, 20, woodpileSnow);
  fAnim(out, 'lantern_frost', 4, 14, 36, lanternFrost, false);
  fAnim(out, 'prayer_flags', 4, 48, 40, prayerFlags);
}
