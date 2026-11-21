/** Allgemein – interaktive Objekte (v2): Truhen, Türen, Hebel, Feuer, Quellstein, Portal, Knoten, Beute … */
import { Px, crystal } from '../draw';
import {
  Frames, INK, MARK, MARK2, P, Ramp, TAU, WHITE, alpha, anim, band, boulder, clamp, embers, flame, glow, hash2, inkOutline, masonry, mix, moss, one, part, planks,
  rnd2, shadeArea, sparkle, texFill,
} from './kit';

const W = P.wood, S = P.stone, I = P.steel, Y = P.gold, TL = P.teal;
const SHADE = P.shadow[2], DARK = P.shadow[0];
/** kühler Werkstein für Magisches (Quellstein, Sockel) */
export const RUNESTONE: Ramp = [S[0], mix(S[1], I[1], 0.45), mix(S[2], I[2], 0.45), mix(S[3], I[3], 0.4), mix(S[4], I[4], 0.35)];

// ---------------------------------------------------------------- Truhen
interface ChestLook { body: Ramp; trim: Ramp; lining: number; gem?: Ramp; rich: number }
const CHESTS: Record<string, ChestLook> = {
  wood: { body: W, trim: I, lining: mix(W[0], P.red[0], 0.5), rich: 0 },
  silver: { body: [P.shadow[1], mix(P.blue[0], W[1], 0.25), mix(P.blue[1], W[2], 0.25), mix(P.blue[2], W[2], 0.2), mix(P.blue[3], P.steel[3], 0.3)], trim: [I[1], I[2], I[3], I[4], WHITE], lining: P.blue[0], gem: P.blue, rich: 1 },
  gold: { body: [P.red[0], mix(P.red[1], W[1], 0.3), mix(P.red[2], W[2], 0.25), P.red[3], P.red[4]], trim: [Y[0], Y[1], Y[2], Y[3], Y[4]], lining: P.violet[0], gem: TL, rich: 2 },
};
function chest(p: Px, L: ChestLook, state: number): void {
  const B = L.body, T = L.trim, x0 = 2, x1 = 17, w = x1 - x0 + 1;
  // Korpus
  p.rect(x0, 10, w, 9, MARK); planks(p, x0, 10, w, 9, { ramp: B, pw: 3, seed: 5 + L.rich, mark: MARK });
  shadeArea(p, (x, y) => y >= 10 && y < 12 && state === 0, SHADE, 0.3); shadeArea(p, (x, y) => x > 14 && y >= 10, SHADE, 0.18);
  p.rect(x0, 18, w, 1, B[0]);
  const bandV = (x: number, y: number, h: number): void => { p.rect(x, y, 2, h, T[1]); p.rect(x, y, 1, h, T[2]); for (let j = y + 1; j < y + h; j += 3) p.set(x, j, T[3]); };
  const corners = (y0: number, y1: number): void => { p.px([x0, y0, x0 + 1, y0, x0, y0 + 1, x1, y0, x1 - 1, y0, x1, y0 + 1], T[2]); p.px([x0, y1, x0 + 1, y1, x0, y1 - 1, x1, y1, x1 - 1, y1, x1, y1 - 1], T[1]); p.set(x0, y0, T[3]); };
  bandV(5, 11, 8); bandV(13, 11, 8); if (L.rich) corners(11, 18); else { p.px([x0, 18, x1, 18], T[1]); p.px([x0, 11, x1, 11], T[2]); }
  if (L.rich) { p.rect(x0, 14, w, 1, T[1]); p.px([8, 14, 11, 14], T[3]); }
  if (L.rich === 2) { p.px([x0, 19, x0 + 1, 19, x1, 19, x1 - 1, 19], T[2]); p.px([8, 12, 11, 12, 8, 16, 11, 16], T[2]); }
  const lock = (y: number): void => {
    p.rect(8, y, 4, 4, T[2]); p.rect(8, y, 4, 1, T[3]); p.rect(8, y + 3, 4, 1, T[1]); p.set(8, y, T[4]);
    if (L.gem) { p.rect(9, y + 1, 2, 2, L.gem[3]); p.set(9, y + 1, WHITE); p.set(10, y + 2, L.gem[1]); } else { p.set(9, y + 1, DARK); p.set(10, y + 1, DARK); p.set(9, y + 2, DARK); }
  };
  if (state === 0) {
    // gewölbter Deckel: helle Oberseite, Stirnkante, dunkle Fuge zum Korpus
    p.poly([[x0 + 1, 3], [x1, 3], [x1 + 1, 8], [x0, 8]], MARK); planks(p, x0, 3, w, 5, { ramp: B, pw: 5, seed: 9 + L.rich, mark: MARK, worn: 0.2 });
    shadeArea(p, (x, y) => y >= 3 && y < 6, WHITE, 0.26); shadeArea(p, (x, y) => y >= 6 && y < 8, WHITE, 0.1);
    p.rect(x0, 8, w, 2, B[2]); p.rect(x0, 8, w, 1, B[3]); p.rect(x0, 10, w, 1, B[0]);
    bandV(5, 3, 7); bandV(13, 3, 7); p.rect(x0 + 1, 3, w - 2, 1, T[3]); p.set(x0 + 1, 3, T[4]);
    p.px([x0, 8, x0, 9, x1, 8, x1, 9], T[1]); p.px([x0, 8], T[2]);
    lock(9);
    if (L.rich === 2) { p.px([9, 5, 10, 5], T[4]); p.px([8, 6, 11, 6, 9, 4, 10, 4, 9, 6, 10, 6], T[2]); p.rect(x0, 9, w, 1, T[1]); p.px([3, 9, 7, 9, 12, 9, 16, 9], T[3]); }
    if (L.rich === 1) { p.px([9, 5, 10, 5], T[3]); p.rect(x0, 9, w, 1, T[1]); }
  } else {
    const open = state === 2, ly = open ? 0 : 3, lh = open ? 8 : 4;
    // Innenraum
    p.rect(x0, open ? 8 : 7, w, open ? 3 : 4, DARK); p.rect(x0 + 1, 9, w - 2, 2, mix(L.lining, DARK, 0.3));
    if (open) {
      // Deckel steht: Innenseite mit Futter
      p.rect(x0, ly, w, lh, B[1]); p.rect(x0 + 1, ly + 1, w - 2, lh - 1, L.lining); p.rect(x0 + 1, ly + 1, w - 2, 1, mix(L.lining, WHITE, 0.18));
      p.rect(x0, ly, w, 1, T[3]); p.rect(x0, ly, 1, lh, T[2]); p.rect(x1, ly, 1, lh, T[1]); bandV(5, ly + 1, lh - 1); bandV(13, ly + 1, lh - 1);
      p.rect(9, ly + lh - 2, 2, 2, T[1]);
      // Schatz
      for (let x = x0 + 1; x < x1; x++) { const h = hash2(x, 3, 7 + L.rich); p.set(x, 9, h % 3 === 0 ? Y[4] : Y[3]); p.set(x, 10, h % 2 ? Y[2] : Y[1]); if (h % 4 === 0) p.set(x, 8, Y[3]); }
      p.px([7, 8, 8, 7, 12, 8], Y[4]);
      if (L.rich >= 1) { p.rect(14, 8, 2, 2, P.blue[3]); p.set(14, 8, WHITE); p.rect(4, 8, 2, 2, P.red[3]); p.set(4, 8, P.red[4]); }
      if (L.rich === 2) { p.rect(9, 7, 2, 2, TL[3]); p.set(9, 7, WHITE); p.px([11, 7, 6, 8], P.pink[3]); }
    } else {
      // halb geöffnet: Deckel schräg, Lichtspalt
      p.poly([[x0 + 1, ly], [x1, ly], [x1 + 1, ly + lh], [x0, ly + lh]], MARK); planks(p, x0, ly, w, lh, { ramp: B, pw: 3, seed: 9 + L.rich, mark: MARK });
      shadeArea(p, (x, y) => y === ly, WHITE, 0.2);
      p.rect(x0, ly + lh, w, 1, T[1]); bandV(5, ly, lh + 1); bandV(13, ly, lh + 1); p.rect(x0 + 1, ly, w - 2, 1, T[3]);
      p.rect(x0 + 1, 9, w - 2, 1, Y[2]); p.px([6, 9, 10, 9, 14, 9], Y[4]); p.rect(x0 + 2, 8, w - 4, 1, mix(Y[1], DARK, 0.5));
    }
    p.rect(x0, 11, w, 1, B[3]); lock(11);
  }
}
function chestGlint(p: Px, L: ChestLook, state: number): void {
  if (state === 2) { glow(p, 10, 8, 8 + L.rich, Y[3], 55 + L.rich * 15); sparkle(p, 6, 5, Y[4]); if (L.rich) sparkle(p, 14, 3, L.rich === 2 ? TL[4] : P.ice[4]); if (L.rich === 2) sparkle(p, 10, 2, Y[4], true); }
  else if (state === 1) glow(p, 10, 8, 6, Y[3], 40);
  else if (L.rich === 2) p.set(15, 4, WHITE);
}

// ---------------------------------------------------------------- Türen
function doorFrame(p: Px, w: number, h: number, seed: number): void {
  p.rect(0, 0, w, h, MARK); masonry(p, 0, 0, w, h, { bh: 4, bw: 5, seed, rough: 0.5, mark: MARK });
  // Sturzbogen: Keilsteine
  for (let x = 0; x < w; x++) { p.set(x, 0, S[4]); p.set(x, 1, x % 4 === 3 ? S[1] : S[3]); p.set(x, 2, x % 4 === 3 ? S[1] : S[2]); p.set(x, 3, S[1]); }
  p.rect((w >> 1) - 1, 0, 3, 4, S[3]); p.rect((w >> 1) - 1, 0, 3, 1, S[4]); p.set((w >> 1) + 1, 3, S[1]);
  p.rect(0, 0, 1, h, S[3]); p.rect(w - 1, 4, 1, h - 4, S[1]);
}
function doorLeaf(p: Px, x: number, y: number, w: number, h: number, seed: number): void {
  p.rect(x, y, w, h, MARK2); planks(p, x, y, w, h, { ramp: W, pw: 3, vertical: true, seed, mark: MARK2, worn: 0.7 });
  p.px([x, y, x + w - 1, y], S[0]); p.px([x + 1, y, x, y + 1], W[1]);
  shadeArea(p, (xx, yy) => xx >= x && xx < x + w && yy >= y && yy < y + 2, SHADE, 0.35);
}
function door(p: Px, kind: 'closed' | 'locked' | 'open'): void {
  doorFrame(p, 16, 32, 3);
  if (kind === 'open') {
    for (let y = 4; y < 32; y++) for (let x = 2; x < 14; x++) p.set(x, y, y < 12 ? INK : y < 22 ? DARK : mix(DARK, P.shadow[1], (y - 22) / 10));
    p.px([2, 4, 13, 4], S[1]); p.rect(2, 30, 12, 2, mix(S[1], DARK, 0.4)); p.rect(4, 31, 9, 1, mix(S[2], DARK, 0.4));
    // aufgeschwungener Türflügel, von der Kante gesehen
    p.rect(2, 5, 3, 27, W[2]); p.rect(2, 5, 1, 27, W[3]); p.rect(4, 5, 1, 27, W[0]); for (const y of [9, 26]) { p.rect(2, y, 3, 2, I[2]); p.set(2, y, I[3]); }
    p.set(3, 18, I[3]);
    return;
  }
  doorLeaf(p, 2, 4, 12, 28, 7);
  band(p, 2, 8, 12, 2); band(p, 2, 25, 12, 2);
  p.rect(2, 8, 2, 2, I[3]); p.rect(2, 25, 2, 2, I[3]);
  if (kind === 'closed') {
    // Ringgriff
    p.px([10, 16, 11, 16, 9, 17, 12, 17, 9, 18, 12, 18, 10, 19, 11, 19], I[3]); p.px([10, 15, 11, 15], I[1]); p.set(9, 17, I[4]);
    p.px([5, 13, 5, 20], W[0]);
  } else {
    // Eisenbänder über Kreuz, Kette, Vorhängeschloss
    band(p, 2, 16, 12, 2); band(p, 7, 4, 2, 28); p.px([2, 16, 13, 16, 7, 5, 7, 30], I[4]);
    for (let k = 0; k < 6; k++) { p.set(3 + k * 2, 13 + (k % 2), I[3]); p.set(4 + k * 2, 20 - (k % 2), I[2]); }
    part(p, (l) => {
      l.px([6, 13, 7, 12, 8, 12, 9, 13, 6, 14, 9, 14], I[3]); l.rect(5, 15, 6, 6, Y[2]); l.rect(5, 15, 6, 1, Y[4]); l.rect(5, 15, 1, 6, Y[3]); l.rect(10, 16, 1, 5, Y[1]); l.rect(5, 20, 6, 1, Y[1]);
      l.set(8, 17, DARK); l.set(7, 17, DARK); l.set(8, 18, DARK); l.set(8, 19, DARK);
    });
  }
}
function gateBars(p: Px): void {
  doorFrame(p, 16, 32, 5);
  for (let y = 4; y < 32; y++) for (let x = 2; x < 14; x++) p.set(x, y, alpha(DARK, y < 14 ? 190 : 150));
  for (const x of [3, 6, 9, 12]) { p.rect(x, 4, 1, 27, I[2]); for (let y = 6; y < 30; y += 6) p.set(x, y, I[4]); p.set(x, 31, I[3]); p.set(x, 30, I[1]); }
  for (const y of [9, 18, 26]) { p.rect(2, y, 12, 1, I[1]); p.rect(2, y - 1, 12, 1, I[3]); for (const x of [3, 6, 9, 12]) p.set(x, y - 1, I[4]); }
}
const ELEM = [P.fire[2], P.blue[3], mix(P.green[3], Y[2], 0.4), TL[4], Y[4], P.violet[3]];
function doorBoss(p: Px): void {
  const D: Ramp = [P.ash[0], P.ash[1], mix(P.ash[2], P.violet[0], 0.3), mix(P.ash[3], P.violet[1], 0.25), mix(P.ash[4], I[2], 0.3)];
  // Rahmen: schwere Quader mit Bogen
  p.rect(0, 6, 32, 34, MARK); p.ell(16, 8, 16, 8, MARK); masonry(p, 0, 0, 32, 40, { bh: 5, bw: 6, seed: 9, rough: 0.4, mark: MARK });
  for (let k = 0; k <= 10; k++) { const a = Math.PI * (k / 10), x = 16 - Math.cos(a) * 14, y = 9 - Math.sin(a) * 7.4; p.rect(Math.round(x) - 1, Math.round(y) - 1, 3, 3, k % 2 ? S[3] : S[2]); p.set(Math.round(x) - 1, Math.round(y) - 1, S[4]); }
  p.rect(14, 0, 4, 4, S[3]); p.rect(14, 0, 4, 1, S[4]); p.px([15, 2, 16, 2], Y[3]);
  // Torflügel
  for (let y = 5; y < 40; y++) for (let x = 4; x < 28; x++) { const u = (x - 16) / 12, top = 9 - Math.sqrt(Math.max(0, 1 - u * u)) * 5; if (y >= top) p.set(x, y, MARK2); }
  planks(p, 4, 4, 24, 36, { ramp: D, pw: 4, vertical: true, seed: 11, mark: MARK2, worn: 0.4 });
  shadeArea(p, (x, y) => x >= 4 && x < 28 && y < 9, SHADE, 0.4);
  p.rect(15, 5, 2, 35, D[0]); p.rect(15, 5, 1, 35, INK);
  for (const y of [11, 34]) { p.rect(4, y, 24, 2, I[1]); p.rect(4, y, 24, 1, I[2]); for (let x = 5; x < 28; x += 3) p.set(x, y, I[3]); }
  p.rect(4, 5, 1, 35, I[1]); p.rect(27, 5, 1, 35, I[0]);
  // Siegel: sechs Segmente um einen Kern
  p.ell(16, 23, 8, 8, I[1]); p.ell(16, 23, 7, 7, Y[1]); p.ell(16, 23, 6, 6, D[0]);
  for (let y = 17; y < 30; y++) for (let x = 10; x < 23; x++) {
    const dx = x + 0.5 - 16, dy = y + 0.5 - 23, r = Math.hypot(dx, dy);
    if (r > 5.6 || r < 2.2) continue;
    const a = (Math.atan2(dy, dx) / TAU + 1.25) % 1, k = Math.floor(a * 6), fr = a * 6 - k;
    if (fr < 0.14 || fr > 0.86) continue;
    p.set(x, y, r > 4.4 ? mix(ELEM[k], DARK, 0.25) : r < 3 ? mix(ELEM[k], WHITE, 0.35) : ELEM[k]);
  }
  p.ell(16, 23, 2, 2, Y[2]); p.px([15, 22, 16, 22], WHITE); p.px([16, 23, 15, 23], Y[4]);
  p.px([9, 23, 22, 23, 16, 15, 16, 30], Y[3]);
  inkOutline(p);
  glow(p, 16, 23, 11, P.violet[3], 46, true);
}

// ---------------------------------------------------------------- Hebel, Druckplatte, Stacheln
function lever(p: Px, st: number): void {
  // Steinsockel
  p.rect(2, 11, 12, 6, MARK); masonry(p, 2, 11, 12, 6, { bh: 3, bw: 6, seed: 3, mark: MARK }); p.rect(2, 17, 12, 1, S[0]);
  p.rect(2, 8, 12, 3, S[3]); p.rect(2, 8, 12, 1, S[4]); p.rect(3, 7, 10, 1, S[3]); p.px([2, 8, 13, 8], S[2]);
  p.rect(6, 8, 4, 2, DARK); p.set(6, 8, S[1]);
  // Anzeige-Stein
  const gem = st === 2 ? TL : st === 1 ? Y : P.red;
  p.rect(7, 13, 2, 2, gem[st === 2 ? 4 : 2]); p.set(7, 13, st === 2 ? WHITE : gem[3]); p.px([6, 13, 9, 14, 6, 14, 9, 13], Y[1]);
  // Hebelarm
  const tx = [3, 8, 13][st], ty = [3, 1, 3][st];
  part(p, (l) => { l.line(8, 9, tx, ty + 2, I[2], 2); l.line(8, 9, tx, ty + 2, I[3]); l.ell(tx + 0.5, ty + 1, 2, 2, Y[2]); l.set(tx, ty, Y[4]); l.set(tx + 1, ty + 2, Y[1]); });
  if (st === 2) { inkOutline(p); glow(p, 8, 14, 5, TL[3], 70, true); }
}
function spiralRune(p: Px, cx: number, cy: number, c: number, c2: number): void {
  p.px([cx, cy, cx + 1, cy, cx + 1, cy - 1, cx, cy - 2, cx - 1, cy - 2, cx - 2, cy - 1, cx - 2, cy, cx - 2, cy + 1, cx - 1, cy + 2, cx, cy + 2, cx + 1, cy + 2, cx + 2, cy + 1, cx + 3, cy, cx + 3, cy - 1], c);
  p.px([cx, cy, cx + 1, cy], c2);
}
function plate(p: Px, down: boolean): void {
  const R = S;
  p.poly([[3, 1], [13, 1], [15, 3], [15, 12], [13, 14], [3, 14], [1, 12], [1, 3]], R[1]);
  if (!down) {
    p.poly([[3, 1], [13, 1], [15, 3], [15, 10], [13, 12], [3, 12], [1, 10], [1, 3]], R[3]);
    p.line(3, 1, 13, 1, R[4]); p.line(1, 3, 1, 10, R[4]); p.line(1, 3, 3, 1, R[4]); p.line(3, 12, 13, 12, R[2]); p.line(15, 3, 15, 10, R[2]);
    p.px([4, 4, 11, 9, 12, 5, 5, 10], R[2]); p.px([10, 3, 6, 8], R[4]);
    p.rect(4, 13, 9, 1, R[0]);
    spiralRune(p, 8, 7, R[1], R[0]); p.px([3, 6, 13, 6], Y[2]);
  } else {
    p.poly([[3, 3], [13, 3], [15, 5], [15, 12], [13, 14], [3, 14], [1, 12], [1, 5]], R[2]);
    p.line(3, 3, 13, 3, R[0]); p.line(1, 5, 1, 12, R[0]); p.line(1, 5, 3, 3, R[0]); p.line(3, 14, 13, 14, R[3]); p.line(15, 5, 15, 12, R[3]);
    p.px([4, 6, 11, 11, 12, 7], R[1]);
    spiralRune(p, 8, 9, TL[3], WHITE); p.px([3, 8, 13, 8], TL[4]);
    glow(p, 8.5, 9, 6, TL[3], 55, true);
  }
}
function spikes(p: Px, f: number): void {
  const R = S;
  p.rect(1, 2, 14, 13, R[2]); p.rect(1, 2, 14, 1, R[3]); p.rect(1, 2, 1, 13, R[3]); p.rect(1, 14, 14, 1, R[1]); p.rect(14, 2, 1, 13, R[1]); p.px([1, 2, 14, 2, 1, 14, 14, 14], R[1]);
  p.px([5, 3, 10, 13, 3, 9, 12, 6], R[1]);
  const hgt = [0, 2, 4, 7][f];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
    const x = 3 + i * 4 + (j === 1 ? 1 : 0), y = 5 + j * 4;
    p.rect(x, y, 2, 1, DARK); p.set(x - 1, y, R[1]); p.set(x + 2, y, R[3]); p.rect(x, y + 1, 2, 1, R[3]);
    if (!hgt) continue;
    for (let k = 0; k < hgt; k++) { const yy = y - k; p.set(x, yy, k >= hgt - 1 ? WHITE : I[3]); if (k < hgt - 2 || hgt < 3) p.set(x + 1, yy, I[1]); else if (k < hgt - 1) p.set(x + 1, yy, I[2]); }
    if (hgt >= 4) p.set(x + 2, y + 1, DARK);
  }
}

// ---------------------------------------------------------------- Feuerschale, Fackeln
function brazier(p: Px, f: number): void {
  const B: Ramp = [P.ash[0], I[0], I[1], I[2], I[3]];
  part(p, (l) => {
    // Dreibein
    l.line(8, 14, 3, 27, B[1], 2); l.line(8, 14, 3, 27, B[3]); l.line(8, 14, 12, 27, B[1], 2); l.line(8, 14, 8, 26, B[2]); l.rect(4, 21, 9, 1, B[2]); l.px([2, 27, 3, 27, 12, 27, 13, 27, 7, 26, 8, 26], B[3]);
    // Schale
    l.poly([[1, 9], [15, 9], [13, 14], [10, 16], [6, 16], [3, 14]], B[2]); l.rect(1, 8, 14, 2, B[3]); l.rect(1, 8, 14, 1, B[4]); l.poly([[3, 11], [5, 11], [6, 15], [4, 14]], B[3]); l.poly([[11, 11], [14, 10], [13, 14], [10, 16]], B[1]);
    for (const x of [3, 6, 9, 12]) l.set(x, 9, Y[2]); l.set(7, 12, B[1]); l.set(8, 13, B[1]);
  });
  if (f < 0) { p.rect(3, 7, 10, 1, P.ash[2]); p.px([4, 6, 5, 6, 8, 6, 10, 6, 11, 6, 6, 7, 9, 7], P.ash[1]); p.px([7, 6, 12, 7], P.ash[3]); return; }
  embers(p, 3, 7, 10, 1, f, 3); p.px([4, 6, 7, 6, 10, 6, 12, 6], P.fire[1]);
  flame(p, 8, 8, 3.8, 8, f); flame(p, 5, 8, 1.6, 4, f + 1); flame(p, 11, 8, 1.6, 4, f + 2);
  glow(p, 8, 6, 8, P.fire[2], 58 + (f === 1 ? 12 : f === 3 ? -8 : 0));
}
function torch(p: Px, f: number): void {
  part(p, (l) => {
    l.rect(5, 12, 2, 16, W[2]); l.rect(5, 12, 1, 16, W[3]); l.px([6, 16, 6, 22], W[1]);
    l.rect(3, 27, 6, 2, S[2]); l.rect(3, 27, 6, 1, S[3]); l.rect(4, 26, 4, 1, S[3]); l.rect(3, 29, 6, 1, S[0]);
    l.rect(4, 9, 4, 4, P.tan[1]); l.rect(4, 9, 1, 4, P.tan[2]); l.px([5, 10, 6, 11, 4, 12, 7, 10], P.tan[0]); l.rect(4, 13, 4, 1, I[2]); l.rect(3, 8, 6, 1, I[1]); l.set(3, 8, I[3]);
  });
  flame(p, 6, 9, 2.6, 8, f);
  glow(p, 6, 6, 6, P.fire[2], 60 + (f === 1 ? 12 : f === 3 ? -8 : 0));
}
function wallTorch(p: Px, f: number): void {
  part(p, (l) => {
    // Wandplatte und Ring
    l.rect(4, 13, 4, 8, I[1]); l.rect(4, 13, 1, 8, I[2]); l.px([5, 14, 5, 19], I[4]); l.rect(3, 15, 6, 2, I[2]); l.rect(3, 15, 6, 1, I[3]);
    l.rect(5, 9, 2, 9, W[2]); l.rect(5, 9, 1, 9, W[3]); l.rect(4, 8, 4, 3, P.tan[1]); l.rect(4, 8, 1, 3, P.tan[2]); l.px([6, 9, 5, 10], P.tan[0]); l.rect(3, 7, 6, 1, I[1]); l.set(3, 7, I[3]);
    l.px([5, 21, 6, 21], I[0]);
  });
  flame(p, 6, 8, 2.4, 7, f);
  glow(p, 6, 5, 6, P.fire[2], 60 + (f === 1 ? 12 : f === 3 ? -8 : 0));
}

// ---------------------------------------------------------------- Felsblockade, Schiebeblock
function boulderWall(p: Px): void {
  const R: Ramp = [S[0], mix(S[1], W[1], 0.25), mix(S[2], P.tan[1], 0.3), mix(S[3], P.tan[2], 0.3), mix(S[4], P.tan[4], 0.3)];
  part(p, (l) => boulder(l, 8, 14, 13, 13, { ramp: R, seed: 31, cracks: 0 }));
  part(p, (l) => boulder(l, 4.5, 27, 9, 14, { ramp: R, seed: 33, cracks: 0 }));
  part(p, (l) => boulder(l, 11.5, 27, 9, 12, { ramp: R, seed: 35, cracks: 0 }));
  part(p, (l) => boulder(l, 8, 21, 10, 9, { ramp: R, seed: 37, cracks: 0 }));
  // breite Risse mit hellem Bruchrand → "zerbrechlich"
  const crack = (pts: number[]): void => { for (let k = 0; k + 3 < pts.length; k += 2) { p.line(pts[k], pts[k + 1], pts[k + 2], pts[k + 3], INK); p.line(pts[k] - 1, pts[k + 1], pts[k + 2] - 1, pts[k + 3], R[4]); p.line(pts[k], pts[k + 1], pts[k + 2], pts[k + 3], INK); } };
  crack([8, 3, 7, 7, 9, 10, 8, 14, 10, 17, 8, 21, 9, 25]); crack([9, 10, 12, 12, 13, 15]); crack([8, 14, 5, 16, 4, 20]); crack([10, 17, 13, 20]);
  p.px([8, 8, 9, 15, 9, 22], P.shadow[1]);
  // lose Steine und Splitter
  for (const [x, s] of [[1, 3], [14, 5]] as const) part(p, (l) => boulder(l, x + 1, 28, 3, 3, { ramp: R, seed: s, facets: 2, cracks: 0 }));
  p.px([6, 27, 10, 27, 12, 26], R[3]); p.px([7, 27, 11, 26], R[1]);
}
function pushBlock(p: Px): void {
  const R = RUNESTONE;
  p.rect(1, 1, 14, 7, R[3]); p.rect(1, 1, 14, 1, R[4]); p.rect(1, 1, 1, 7, R[4]); p.rect(3, 3, 10, 3, R[2]); p.rect(3, 3, 10, 1, R[1]); p.rect(3, 3, 1, 3, R[1]); p.rect(4, 5, 9, 1, R[3]);
  p.rect(1, 8, 14, 13, MARK); masonry(p, 1, 8, 14, 13, { ramp: R, bh: 13, bw: 14, seed: 4, rough: 0, mark: MARK });
  p.rect(1, 8, 14, 13, R[2]); p.rect(1, 8, 14, 1, R[1]); p.rect(1, 20, 14, 1, R[0]); p.rect(14, 9, 1, 12, R[1]); p.rect(1, 9, 1, 11, R[3]);
  p.rect(3, 10, 10, 9, R[1]); p.rect(4, 11, 9, 8, R[2]); p.rect(4, 18, 9, 1, R[3]);
  // vier Pfeile + Kern
  p.px([8, 12, 7, 13, 9, 13, 8, 17, 7, 16, 9, 16, 5, 15, 6, 14, 6, 16, 11, 15, 10, 14, 10, 16], R[0]); p.rect(8, 14, 1, 2, TL[3]); p.set(8, 14, TL[4]); p.px([7, 15, 9, 14], Y[2]);
  p.px([1, 1, 14, 1], R[2]); p.px([2, 9, 12, 19, 5, 2, 11, 6], R[1]); p.px([13, 3, 2, 12], R[0]);
  for (let k = 0; k < 5; k++) p.set(2 + (hash2(k, 1, 9) % 12), 9 + (hash2(k, 2, 9) % 11), R[3]);
}

// ---------------------------------------------------------------- Quellstein
const QPATH: Array<[number, number]> = (() => {
  const out: Array<[number, number]> = [];
  for (let y = 43; y >= 30; y--) out.push([16, y]);
  // Spirale (außen → innen), Mitte (16, 24)
  let last = '';
  for (let k = 0; k <= 80; k++) { const t = k / 80, a = Math.PI / 2 + t * TAU * 2.1, r = 5.4 * (1 - t) + 0.4, x = Math.round(16 + Math.cos(a) * r), y = Math.round(24 + Math.sin(a) * r * 0.95), key = `${x},${y}`; if (key !== last) { out.push([x, y]); last = key; } }
  for (let y = 16; y >= 10; y--) out.push([16, y]);
  out.push([15, 8], [17, 8], [16, 7], [16, 6]);
  return out;
})();
function quellstein(p: Px, f: number): void {
  const R = RUNESTONE, on = f >= 0;
  // runder Stufensockel
  part(p, (l) => {
    l.ell(16, 46.5, 14, 5, MARK); l.rect(2, 44, 28, 3, MARK); masonry(l, 2, 41, 28, 11, { ramp: R, bh: 4, bw: 7, seed: 5, rough: 0.5, mark: MARK });
    l.ell(16, 44, 14, 4.4, R[3]); l.ell(16, 43.6, 13, 3.8, R[4]); l.ell(16, 44, 11, 3, R[3]);
    for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; l.set(16 + Math.cos(a) * 12, 43.8 + Math.sin(a) * 3.3, k % 3 === 0 ? (on ? TL[3] : Y[2]) : R[2]); }
    shadeArea(l, (x, y) => x > 22 && y > 44, SHADE, 0.25);
    moss(l, (x, y) => (x < 11 && y > 42 ? 0.5 : x > 24 && y > 46 ? 0.35 : 0), 7);
  });
  // Monolith
  part(p, (l) => {
    l.poly([[10, 45], [9, 22], [10, 9], [13, 4], [17, 2], [21, 5], [23, 11], [24, 24], [23, 45]], MARK);
    texFill(l, MARK, (x, y) => {
      const u = (x - 9) / 15, n = rnd2(x, y, 11), band2 = rnd2(0, y >> 2, 13);
      let t = u < 0.16 ? 3 : u < 0.62 ? 2 : u < 0.84 ? 1 : 0;
      if (y < 7 + (x - 13) * 0.4 && u < 0.7) t += 1;
      if (n < 0.05) t -= 1; else if (n > 0.95) t += 1;
      if ((y & 3) === 0 && band2 < 0.25 && u > 0.2) t -= 1;
      return R[clamp(t, 0, 4)];
    });
    // Facettenkante oben, Goldband, Kerben
    l.line(13, 4, 15, 12, R[3]); l.line(15, 12, 15, 17, R[3]);
    for (let x = 10; x < 24; x++) { const c = l.get(x, 36); if (c >>> 24) { l.set(x, 36, x < 13 ? Y[3] : x > 20 ? Y[1] : Y[2]); l.set(x, 37, mix(R[0], Y[0], 0.5)); } }
    l.px([12, 36, 18, 36], Y[4]);
    l.line(20, 12, 22, 17, R[0]); l.line(11, 28, 12, 33, R[0]); l.px([21, 30, 22, 31, 10, 14], R[0]); l.px([19, 6, 11, 40], R[4]);
    moss(l, (x, y) => (y > 38 && x < 15 ? 0.45 : y < 8 && x < 16 ? 0.4 : y > 26 && y < 31 && x > 20 ? 0.3 : 0), 9);
    // Gravur
    const n = QPATH.length, head = on ? ((f / 6) * n * 1.15) % (n * 1.15) : -99;
    QPATH.forEach(([x, y], i) => {
      let c = on ? TL[2] : R[0];
      if (on) { const d = head - i; if (d >= 0 && d < 5) c = WHITE; else if (d >= 5 && d < 14) c = TL[4]; else if (d >= 14 && d < 26) c = TL[3]; else if ((i + f * 3) % 11 === 0) c = TL[3]; }
      l.set(x, y, c);
      if (!on && i % 9 === 4) l.set(x, y, mix(R[0], TL[1], 0.6));
    });
    // Lichtkante neben der Gravur (eingemeißelt)
    if (!on) for (const [x, y] of QPATH) if (l.get(x + 1, y + 1) !== R[0] && l.get(x + 1, y + 1) >>> 24 && rnd2(x, y, 3) < 0.4) l.set(x + 1, y + 1, R[3]);
  });
  if (on) {
    glow(p, 16, 24, 11 + (f % 2), TL[3], 52 + (f % 3) * 8, true); glow(p, 16, 7, 5, TL[3], 60, true); glow(p, 16, 44, 14, TL[3], 26);
    // aufsteigende Tröpfchen
    for (let k = 0; k < 5; k++) {
      const ph = (f / 6 + k * 0.23) % 1, x = Math.round([5, 27, 8, 25, 3][k] + Math.sin(ph * TAU + k) * 1.5), y = Math.round(40 - ph * 30 - k * 2);
      if (y < 1) continue;
      p.set(x, y, ph > 0.8 ? TL[2] : TL[4]); if (ph < 0.6) { p.set(x, y + 1, TL[3]); p.set(x, y - 1, WHITE); }
    }
  }
}

// ---------------------------------------------------------------- Portal (weiß/grau → einfärbbar)
function portal(p: Px, f: number): void {
  const cx = 20, cy = 29, rx = 16, ry = 24, ph = (f / 8) * TAU;
  const g = (v: number, a = 255): number => alpha(mix(INK, WHITE, v), a);
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, r = Math.hypot(u, v), a = Math.atan2(v, u);
    if (r > 1.16) continue;
    if (r > 1) { const s = Math.sin(a * 5 + ph * 2) + Math.sin(a * 3 - ph); if (s > 0.9 - (1.16 - r) * 3) p.set(x, y, g(0.9, r > 1.08 ? 120 : 200)); continue; }
    const s = Math.sin(a * 3 + r * 8 - ph), s2 = Math.sin(a * 2 - r * 5 + ph * 2 + 1);
    let c: number;
    if (r > 0.88) c = s > -0.3 ? g(1) : g(0.8);
    else if (r > 0.8) c = g(0.45, 240);
    else if (r < 0.14) c = g(1);
    else if (s > 0.55) c = g(0.95, 250);
    else if (s > 0.1) c = g(0.7, 235);
    else if (s2 > 0.6) c = g(0.55, 220);
    else c = g(0.25 + r * 0.15, 200);
    p.set(x, y, c);
  }
  // umlaufende Funken
  for (let k = 0; k < 6; k++) { const a = ph + (k / 6) * TAU, rr = 1.05 + (k % 2) * 0.08, x = cx + Math.cos(a) * rx * rr, y = cy + Math.sin(a) * ry * rr; p.set(x, y, WHITE); p.set(x + 1, y, g(0.8, 180)); p.set(x, y + 1, g(0.8, 180)); }
  for (let k = 0; k < 4; k++) { const t = ((f + k * 2) % 8) / 8; p.set(cx - 12 + k * 8, 54 - t * 8, g(1, Math.round(255 * (1 - t)))); }
}

// ---------------------------------------------------------------- Höhleneingang, Treppen
function caveEntrance(p: Px): void {
  const R: Ramp = [S[0], mix(S[1], W[1], 0.2), mix(S[2], W[2], 0.15), mix(S[3], P.tan[2], 0.15), S[4]];
  // Felsrahmen: hintere Masse, dann einzelne Brocken
  part(p, (l) => { l.poly([[1, 43], [0, 20], [6, 8], [16, 2], [30, 1], [41, 6], [47, 18], [47, 43]], MARK); masonry(l, 0, 0, 48, 44, { ramp: R, bh: 7, bw: 11, seed: 3, rough: 1, mark: MARK }); shadeArea(l, () => true, SHADE, 0.15); });
  // Höhlenmund
  for (let y = 12; y < 44; y++) for (let x = 10; x < 38; x++) { const u = (x + 0.5 - 24) / 12.5, top = 14 + (1 - Math.sqrt(Math.max(0, 1 - u * u))) * 16 + (hash2(x >> 1, 0, 7) % 2); if (Math.abs(u) < 1 && y >= top) p.set(x, y, y < top + 6 ? INK : y > 38 ? mix(DARK, P.shadow[1], (y - 38) / 6) : DARK); }
  p.px([19, 40, 20, 41, 27, 39, 28, 40, 23, 42], P.shadow[2]);
  // Stalaktiten-Zähne
  for (const [x, h] of [[16, 4], [20, 6], [25, 3], [29, 5], [33, 3]] as const) { const u = (x - 24) / 12.5, top = Math.round(14 + (1 - Math.sqrt(1 - u * u)) * 16); for (let k = 0; k < h; k++) { p.set(x, top + k, R[k < 2 ? 2 : 1]); if (k < h - 2) p.set(x + 1, top + k, R[1]); } }
  part(p, (l) => boulder(l, 7, 43, 14, 22, { ramp: R, seed: 11, cracks: 1 })); part(p, (l) => boulder(l, 41, 43, 13, 20, { ramp: R, seed: 13, cracks: 1 }));
  part(p, (l) => boulder(l, 12, 24, 13, 12, { ramp: R, seed: 15 })); part(p, (l) => boulder(l, 37, 23, 12, 12, { ramp: R, seed: 17 }));
  part(p, (l) => boulder(l, 24, 13, 20, 11, { ramp: R, seed: 19, cracks: 2 })); part(p, (l) => boulder(l, 4, 43, 7, 7, { ramp: R, seed: 21 })); part(p, (l) => boulder(l, 45, 43, 6, 6, { ramp: R, seed: 23 }));
}
function stairs(p: Px, down: boolean): void {
  const R = S;
  p.rect(0, 0, 32, 32, MARK); masonry(p, 0, 0, 32, 32, { bh: 4, bw: 7, seed: down ? 3 : 5, mark: MARK });
  p.rect(0, 0, 32, 1, R[4]); p.rect(0, 0, 1, 32, R[3]); p.rect(31, 0, 1, 32, R[1]); p.rect(0, 31, 32, 1, R[0]);
  if (down) {
    p.rect(3, 3, 26, 27, DARK);
    for (let k = 0; k < 6; k++) {
      const y = 26 - k * 4, t = k / 5, top = mix(R[3], DARK, t * 0.85), edge = mix(R[4], DARK, t * 0.8), riser = mix(R[1], INK, 0.3 + t * 0.6);
      p.rect(4 + (k > 3 ? 1 : 0), y, 24 - (k > 3 ? 2 : 0), 3, top); p.rect(4 + (k > 3 ? 1 : 0), y, 24 - (k > 3 ? 2 : 0), 1, edge); p.rect(4, y + 3, 24, 1, riser);
      if (k < 4) { p.set(7 + k * 5, y + 1, mix(R[2], DARK, t * 0.8)); p.set(20 - k * 3, y + 2, mix(R[2], DARK, t * 0.8)); }
    }
    p.rect(3, 3, 1, 27, INK); p.rect(3, 3, 26, 2, INK); p.rect(28, 3, 1, 27, mix(R[1], DARK, 0.6));
    p.rect(3, 30, 26, 1, R[4]);
  } else {
    p.rect(3, 2, 26, 29, R[1]);
    for (let k = 0; k < 6; k++) {
      const y = 26 - k * 4.6, t = k / 5, top = mix(R[2], R[4], t), riser = mix(R[0], R[2], t * 0.7);
      p.rect(5, Math.round(y), 22, 2, top); p.rect(5, Math.round(y), 22, 1, mix(top, WHITE, 0.25)); p.rect(5, Math.round(y) + 2, 22, 3, riser); p.rect(5, Math.round(y) + 4, 22, 1, mix(riser, INK, 0.35));
      p.set(8 + k * 3, Math.round(y) + 3, mix(riser, INK, 0.3));
    }
    // Wangen
    p.rect(3, 2, 2, 29, R[3]); p.rect(3, 2, 1, 29, R[4]); p.rect(27, 2, 2, 29, R[2]); p.rect(28, 2, 1, 29, R[1]); p.rect(3, 2, 26, 1, R[4]);
    for (let y = 6; y < 30; y += 6) { p.set(4, y, R[1]); p.set(27, y + 2, R[0]); }
  }
}

// ---------------------------------------------------------------- Geschützkopf
function turret(p: Px): void {
  const R = RUNESTONE;
  p.rect(2, 20, 12, 5, MARK); masonry(p, 2, 20, 12, 5, { ramp: R, bh: 3, bw: 6, seed: 3, mark: MARK }); p.rect(1, 24, 14, 1, R[1]); p.rect(1, 25, 14, 1, R[0]); p.rect(1, 19, 14, 1, R[3]);
  part(p, (l) => {
    l.poly([[2, 19], [2, 6], [4, 2], [10, 1], [13, 4], [14, 9], [15, 11], [14, 13], [14, 19]], R[2]);
    l.poly([[2, 19], [2, 6], [4, 2], [7, 2], [6, 19]], R[3]); l.line(2, 6, 4, 2, R[4]); l.line(4, 2, 10, 1, R[4]); l.rect(2, 6, 1, 13, R[4]);
    // Brauenwulst, Auge, Nase
    l.rect(7, 5, 7, 2, R[3]); l.rect(7, 5, 7, 1, R[4]); l.rect(8, 7, 6, 1, R[0]);
    l.rect(9, 8, 4, 2, DARK); l.rect(10, 8, 2, 2, P.fire[2]); l.set(11, 8, P.fire[4]);
    l.px([14, 10, 15, 11, 14, 11, 14, 12], R[3]); l.set(15, 12, R[1]);
    // Maul: dunkle Röhre mit Zähnen
    l.rect(9, 13, 6, 5, DARK); l.rect(10, 14, 5, 3, INK); l.px([10, 13, 12, 13, 14, 13], R[4]); l.px([11, 17, 13, 17], R[4]); l.rect(9, 18, 6, 1, R[3]); l.rect(14, 15, 1, 1, P.fire[1]);
    // Gravuren und Verwitterung
    l.px([4, 9, 4, 10, 5, 11, 4, 12, 4, 15, 5, 16], R[1]); l.px([3, 9, 3, 14], TL[2]); l.line(8, 2, 9, 4, R[1]); l.px([12, 3, 6, 17], R[1]);
    l.rect(2, 18, 12, 1, R[1]);
  });
  glow(p, 11, 9, 3, P.fire[2], 80, true);
}

// ---------------------------------------------------------------- Ressourcenknoten
function nodeHerb(p: Px): void {
  const G = P.green, B = P.ice;
  for (const [x, top, lean] of [[8, 3, 0], [5, 6, -2], [11, 5, 2], [3, 10, -2], [13, 9, 2]] as const) {
    for (let y = top + 2; y < 17; y++) p.set(Math.round(x - (lean * (y - top)) / (17 - top) + lean), y, y % 3 ? G[2] : G[1]);
    p.rect(x + lean - 1, top, 3, 2, B[3]); p.px([x + lean, top - 1, x + lean - 1, top + 1], B[4]); p.set(x + lean, top, WHITE); p.set(x + lean + 1, top + 1, P.blue[3]); p.set(x + lean, top + 2, P.blue[2]);
  }
  for (const [x, y, d] of [[6, 13, -1], [10, 12, 1], [7, 15, -1], [10, 15, 1], [4, 15, -1]] as const) { p.px([x, y, x + d, y - 1, x + d * 2, y - 1], G[3]); p.set(x + d * 2, y, G[2]); p.set(x + d, y - 2, G[4]); }
  inkOutline(p);
  glow(p, 8, 6, 8, B[3], 46, true); glow(p, 8, 5, 4, WHITE, 26, true);
}
function nodeWood(p: Px): void {
  const IW: Ramp = [mix(W[0], I[0], 0.5), mix(W[1], I[1], 0.45), mix(W[2], I[1], 0.4), mix(W[3], I[2], 0.35), mix(W[4], I[3], 0.3)];
  p.poly([[5, 6], [15, 6], [16, 18], [18, 22], [2, 22], [4, 18]], MARK); p.rect(1, 21, 3, 2, MARK); p.rect(17, 21, 2, 2, MARK);
  planks(p, 0, 6, 20, 18, { ramp: IW, pw: 3, vertical: true, seed: 5, mark: MARK, worn: 0.8 });
  shadeArea(p, (x) => x > 12, SHADE, 0.28);
  p.ell(10, 6, 5.6, 2.6, IW[1]); p.ell(10, 5.6, 4.8, 2, mix(P.tan[3], I[3], 0.3)); p.ell(10, 5.6, 3, 1.2, mix(P.tan[4], I[4], 0.3)); p.set(10, 5, IW[1]); p.px([7, 5, 12, 6], IW[2]);
  // Axtkerbe
  p.poly([[4, 11], [9, 13], [4, 15]], INK); p.line(4, 11, 9, 13, mix(P.tan[4], I[4], 0.2)); p.px([5, 13, 6, 13], mix(P.tan[3], I[3], 0.3)); p.px([3, 17, 2, 18], P.tan[3]);
  // Markierung: türkis-goldenes Band
  for (let x = 4; x < 17; x++) if (p.get(x, 17) >>> 24) { p.set(x, 17, x > 12 ? TL[1] : TL[3]); p.set(x, 18, x % 3 === 0 ? Y[3] : x > 12 ? TL[0] : TL[2]); }
  // Trieb
  p.px([14, 4, 14, 3, 15, 2], P.green[2]); p.px([16, 1, 17, 1, 13, 2], P.green[4]); p.px([16, 2], P.green[3]);
  moss(p, (x, y) => (y > 19 && x < 9 ? 0.4 : 0), 5);
}
function nodeCrystal(p: Px): void {
  part(p, (l) => boulder(l, 10, 21, 18, 9, { seed: 5, cracks: 0, flat: true }));
  part(p, (l) => { crystal(l, 6, 17, 3, 6, 2.4, TL); crystal(l, 15, 18, 18, 8, 2.2, P.ice); });
  part(p, (l) => crystal(l, 10, 18, 11, 1, 3.4, TL));
  part(p, (l) => { crystal(l, 13, 19, 15, 13, 1.6, P.ice); crystal(l, 6, 19, 5, 14, 1.4, TL); });
  glow(p, 10, 10, 9, TL[3], 44, true); sparkle(p, 9, 6, TL[4]); p.set(16, 9, WHITE);
}
function nodeEmber(p: Px): void {
  const A: Ramp = [P.ash[0], P.ash[1], P.ash[2], P.ash[3], P.ash[4]];
  part(p, (l) => boulder(l, 9, 19, 17, 15, { ramp: A, seed: 9, cracks: 0 })); part(p, (l) => boulder(l, 16, 19, 7, 7, { ramp: A, seed: 11, cracks: 0 }));
  const vein = (pts: number[]): void => { for (let k = 0; k + 3 < pts.length; k += 2) p.line(pts[k], pts[k + 1], pts[k + 2], pts[k + 3], P.fire[2]); for (let k = 0; k < pts.length; k += 2) p.set(pts[k], pts[k + 1], P.fire[4]); };
  vein([4, 9, 7, 11, 8, 14, 11, 15, 12, 18]); vein([8, 6, 10, 8, 13, 9, 14, 12]); vein([7, 11, 5, 14, 5, 17]); vein([15, 15, 17, 17]);
  p.px([8, 13, 10, 9], P.fire[3]);
  glow(p, 9, 12, 8, P.fire[2], 54, true); p.set(12, 3, P.fire[3]); p.set(5, 4, P.fire[2]);
}
function nodeFrost(p: Px): void {
  const F: Ramp = [I[0], I[1], mix(I[2], P.ice[1], 0.4), mix(I[3], P.ice[2], 0.4), P.ice[3]];
  part(p, (l) => boulder(l, 10, 19, 18, 13, { ramp: F, seed: 13, cracks: 1 }));
  // Erzadern und Raureifkappe
  p.px([5, 13, 6, 14, 9, 12, 13, 15, 14, 14, 8, 16], P.ice[4]); p.px([6, 13, 10, 12, 13, 14], WHITE);
  part(p, (l) => { crystal(l, 7, 10, 5, 2, 1.8, P.ice); crystal(l, 12, 10, 14, 4, 1.6, P.ice); crystal(l, 10, 9, 10, 0, 1.4, P.snow); });
  for (let x = 3; x < 17; x++) if (p.get(x, 8 + Math.abs(x - 10) * 0.45) >>> 24 && hash2(x, 1, 5) % 3) { p.set(x, 8 + Math.abs(x - 10) * 0.45, P.snow[4]); }
  glow(p, 10, 8, 8, P.ice[3], 40, true); p.set(4, 5, WHITE); p.set(16, 7, P.ice[4]);
}
function nodeRune(p: Px): void {
  const R: Ramp = [S[0], S[1], mix(S[2], P.sand[2], 0.35), mix(S[3], P.sand[3], 0.35), mix(S[4], P.sand[4], 0.3)];
  // zerbrochene Tafel, schräg im Boden
  part(p, (l) => {
    l.poly([[4, 21], [3, 8], [6, 3], [10, 5], [13, 2], [16, 6], [15, 21]], MARK); masonry(l, 0, 0, 20, 22, { ramp: R, bh: 22, bw: 20, seed: 3, rough: 0, mark: MARK });
    texFill(l, R[2], (x, y) => (x < 6 ? R[3] : x > 13 ? R[1] : rnd2(x, y, 5) < 0.06 ? R[1] : R[2]));
    l.line(3, 8, 6, 3, R[4]); l.line(10, 5, 13, 2, R[4]); l.line(10, 5, 9, 10, R[0]); l.line(9, 10, 11, 14, R[0]);
    // goldene Runen
    for (const [x, y] of [[6, 8], [6, 9], [7, 10], [6, 11], [6, 13], [7, 13], [8, 13], [6, 15], [8, 15], [7, 16], [12, 8], [13, 9], [12, 10], [13, 11], [12, 13], [13, 13], [12, 15], [13, 16], [12, 17]] as const) l.set(x, y, (x + y) % 3 === 0 ? Y[4] : Y[3]);
  });
  part(p, (l) => { l.poly([[15, 21], [15, 17], [18, 16], [19, 21]], R[2]); l.line(15, 17, 18, 16, R[4]); l.set(17, 19, Y[3]); l.poly([[0, 21], [1, 19], [3, 19], [4, 21]], R[1]); l.set(2, 19, R[3]); });
  glow(p, 9, 12, 8, Y[3], 40, true);
}
function nodeVoid(p: Px): void {
  const V = P.violet, K = P.pink;
  // Riss
  const rift: number[] = [10, 2, 9, 5, 11, 8, 8, 11, 10, 14, 9, 17, 10, 20];
  for (let k = 0; k + 3 < rift.length; k += 2) { p.line(rift[k], rift[k + 1], rift[k + 2], rift[k + 3], V[2], 3); }
  for (let k = 0; k + 3 < rift.length; k += 2) { p.line(rift[k], rift[k + 1], rift[k + 2], rift[k + 3], K[3], 2); }
  for (let k = 0; k + 3 < rift.length; k += 2) { p.line(rift[k], rift[k + 1] + 1, rift[k + 2], rift[k + 3] - 1, INK); }
  p.px([10, 2, 10, 20], K[4]); p.px([9, 8, 10, 12], WHITE);
  // schwebende Splitter, Boden-Scherben
  for (const [x, y] of [[4, 6], [15, 9], [5, 14], [16, 16], [14, 3]] as const) { p.set(x, y, V[3]); p.set(x, y + 1, V[1]); p.set(x + 1, y, K[4]); }
  p.rect(6, 20, 8, 1, P.shadow[1]); p.px([5, 21, 8, 21, 12, 21, 14, 20], P.shadow[2]);
  glow(p, 10, 11, 9, K[2], 48, true); glow(p, 10, 11, 4, V[4], 36, true);
}
function nodeEmpty(p: Px): void {
  p.ell(8, 6.5, 7, 3, mix(W[1], S[1], 0.5)); p.ell(8, 6, 5.4, 2, mix(W[0], DARK, 0.4)); p.ell(7.5, 6, 3, 1, DARK);
  for (const [x, y, w] of [[1, 6, 3], [12, 7, 3], [5, 8, 2], [10, 3, 2]] as const) { p.rect(x, y, w, 2, S[2]); p.rect(x, y, w, 1, S[3]); p.set(x + w - 1, y + 1, S[1]); }
  p.px([3, 4, 13, 4, 8, 9], mix(W[2], S[2], 0.5));
}

// ---------------------------------------------------------------- Quellsplitter
function shard(p: Px, f: number): void {
  const bob = [0, -1, -1, 0, 1, 1][f], ph = (f / 6) * Math.PI, cx = 8, cy = 12 + bob;
  const hw = 1.6 + Math.abs(Math.cos(ph)) * 3.2, split = Math.sin(ph) * hw * 0.8;   // Kante wandert → Drehung
  for (let y = cy - 9; y <= cy + 9; y++) {
    const t = Math.abs(y - cy) / 9, w = hw * (1 - t), up = y < cy;
    for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) {
      const left = x - cx < split * (1 - t);
      p.set(x, y, left ? (up ? TL[4] : TL[3]) : up ? TL[2] : TL[1]);
    }
    if (w >= 0.5) { p.set(Math.round(cx + split * (1 - t)), y, up ? WHITE : TL[4]); }
  }
  // Goldfassung in der Mitte, Kappe
  for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) { p.set(x, cy, x - cx < split ? Y[4] : Y[2]); p.set(x, cy + 1, x - cx < split ? Y[2] : Y[1]); }
  p.set(cx, cy - 9, WHITE); p.set(cx, cy + 9, TL[2]);
  inkOutline(p);
  glow(p, cx, cy, 8, TL[3], 50); glow(p, cx, cy, 4, WHITE, 24);
  const sp = [[3, 4], [13, 7], [2, 16], [12, 19], [4, 10], [13, 14]][f]; sparkle(p, sp[0], sp[1] + bob, TL[4]);
  p.set(cx, 25, alpha(TL[3], 90)); p.set(cx - 1, 25, alpha(TL[3], 50)); p.set(cx + 1, 25, alpha(TL[3], 50));
}

// ---------------------------------------------------------------- Beute, Grab, Siegelsockel
function dropBag(p: Px): void {
  const B = P.tan;
  p.ball(7, 9, 5.2, 4.4, B, 1, 4); p.rect(3, 12, 8, 1, B[1]); p.rect(5, 3, 4, 2, B[3]); p.px([4, 2, 6, 1, 9, 2, 7, 2], B[3]); p.rect(5, 5, 4, 1, P.red[2]); p.set(9, 6, P.red[2]); p.set(10, 7, P.red[1]);
  p.px([5, 9, 6, 10, 8, 8], B[1]); p.rect(10, 11, 3, 2, Y[3]); p.set(10, 11, Y[4]); p.set(12, 12, Y[1]);
}
function dropGold(p: Px): void {
  const coin = (x: number, y: number): void => { p.rect(x, y, 5, 2, Y[3]); p.rect(x + 1, y - 1, 3, 1, Y[4]); p.rect(x, y + 2, 5, 1, Y[1]); p.set(x + 1, y, Y[4]); p.set(x + 4, y + 1, Y[2]); };
  coin(1, 9); coin(8, 10); coin(4, 6); coin(5, 10); coin(3, 3 + 0);
  p.rect(10, 5, 3, 3, Y[3]); p.set(10, 5, Y[4]); p.set(12, 7, Y[1]); p.set(11, 6, Y[2]);
  inkOutline(p); sparkle(p, 6, 2, WHITE);
}
function dropPotion(p: Px): void {
  const R = P.red, Gl = P.ice;
  p.ball(7, 9, 4.4, 4, R, 1, 4); p.rect(3, 6, 8, 1, Gl[2]); p.px([3, 7, 10, 7], Gl[1]); p.rect(4, 5, 6, 1, Gl[3]);
  p.rect(6, 2, 3, 3, Gl[2]); p.rect(6, 2, 1, 3, Gl[4]); p.rect(5, 2, 5, 1, Gl[3]); p.rect(6, 0, 3, 2, P.tan[2]); p.set(6, 0, P.tan[4]);
  p.px([5, 8, 5, 9], WHITE); p.set(9, 11, R[1]); p.set(8, 8, R[4]);
}
function dropGear(p: Px): void {
  // Klinge ragt aus dem Bündel
  part(p, (l) => { l.line(6, 7, 12, 1, I[3], 2); l.line(6, 7, 12, 1, WHITE); l.px([12, 0, 13, 0], I[4]); l.line(8, 7, 13, 2, I[1]); });
  part(p, (l) => {
    l.poly([[1, 8], [8, 5], [12, 8], [11, 12], [3, 13]], P.cream[2]); l.poly([[1, 8], [8, 5], [9, 7], [3, 10]], P.cream[3]); l.line(1, 8, 8, 5, P.cream[4]); l.poly([[9, 10], [12, 8], [11, 12], [8, 12]], P.cream[1]);
    l.line(4, 7, 6, 12, W[2]); l.line(8, 6, 10, 11, W[2]); l.px([5, 9, 9, 8], W[3]); l.px([3, 11, 7, 10], P.cream[1]);
  });
}
function dropKey(p: Px): void {
  p.ell(4.5, 4.5, 3.4, 3.4, Y[3]); p.ell(4.5, 4.5, 1.4, 1.4, 0); p.px([2, 3, 3, 2, 4, 1], Y[4]); p.px([6, 6, 7, 5], Y[1]);
  p.line(6, 6, 11, 11, Y[3], 2); p.line(6, 6, 11, 11, Y[4]); p.px([10, 12, 9, 13, 12, 10, 12, 12, 11, 13], Y[2]); p.set(12, 11, Y[1]);
  p.set(4, 4, TL[3]); p.set(5, 4, TL[4]);
}
function grave(p: Px): void {
  // Erdhügel, Stein
  p.ell(8, 17, 7, 2.6, mix(W[1], S[1], 0.4)); p.ell(7.5, 16.6, 5.5, 1.8, mix(W[2], S[2], 0.4)); p.px([4, 17, 11, 18, 7, 16], mix(W[0], S[0], 0.4));
  part(p, (l) => {
    l.rect(4, 6, 9, 11, S[2]); l.ell(8.5, 6, 4.5, 4, S[2]); l.rect(4, 6, 2, 11, S[3]); l.ell(7.5, 5.4, 3.2, 2.6, S[3]); l.px([5, 3, 6, 2, 7, 2], S[4]); l.rect(11, 6, 2, 11, S[1]);
    l.rect(8, 6, 1, 6, S[0]); l.rect(6, 8, 5, 1, S[0]); l.px([9, 7, 9, 9, 11, 9], S[3]); l.px([6, 14, 7, 14, 9, 14, 10, 14], S[1]); l.line(11, 3, 12, 6, S[0]);
  });
  moss(p, (x, y) => (y > 12 && x < 8 ? 0.4 : 0), 5);
  p.px([13, 15, 14, 14], P.green[3]); p.set(14, 13, WHITE); p.set(13, 13, P.ice[3]);
}
function sealPedestal(p: Px): void {
  const R = RUNESTONE;
  p.rect(2, 26, 20, 5, MARK); p.rect(4, 22, 16, 4, MARK); masonry(p, 2, 22, 20, 9, { ramp: R, bh: 4, bw: 7, seed: 5, mark: MARK }); p.rect(2, 31, 20, 1, R[0]);
  p.rect(2, 26, 20, 1, R[4]); p.rect(4, 22, 16, 1, R[4]);
  // Schaft
  p.rect(7, 10, 10, 12, MARK); texFill(p, MARK, (x, y) => (x < 9 ? R[3] : x > 14 ? R[1] : (y & 3) === 1 && rnd2(x, y, 3) < 0.4 ? R[1] : R[2]));
  p.rect(7, 10, 1, 12, R[4]); for (const x of [10, 13]) p.rect(x, 11, 1, 10, R[1]);
  p.rect(6, 15, 12, 2, Y[2]); p.rect(6, 15, 12, 1, Y[3]); p.px([8, 15, 12, 15, 16, 15], Y[4]);
  // Schale mit sechseckiger Fassung
  part(p, (l) => {
    l.poly([[3, 6], [21, 6], [19, 10], [5, 10]], R[2]); l.rect(3, 5, 18, 2, R[3]); l.rect(3, 5, 18, 1, R[4]); l.poly([[15, 7], [21, 6], [19, 10], [14, 10]], R[1]);
    l.ell(12, 5, 7.5, 2.6, R[3]); l.ell(12, 4.8, 6.4, 2, R[1]); l.ell(12, 5, 5, 1.5, DARK);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + 0.5; l.set(12 + Math.cos(a) * 5.6, 4.9 + Math.sin(a) * 1.8, ELEM[k]); }
    l.px([11, 5, 12, 5], Y[2]); l.set(12, 4, Y[4]);
  });
  p.px([5, 28, 17, 24, 19, 29], R[1]); p.px([9, 19, 15, 12], R[0]);
  glow(p, 12, 4, 6, Y[3], 30, true);
}

export function cmInteract(out: Frames): void {
  for (const [name, L] of Object.entries(CHESTS)) {
    (['closed', 'mid', 'open'] as const).forEach((st, k) => one(out, `chest_${name}_${st}`, 20, 20, (p) => { chest(p, L, k); inkOutline(p); chestGlint(p, L, k); }, false));
  }
  one(out, 'door_closed', 16, 32, (p) => door(p, 'closed')); one(out, 'door_locked', 16, 32, (p) => door(p, 'locked')); one(out, 'door_open', 16, 32, (p) => door(p, 'open'));
  one(out, 'door_boss', 32, 40, doorBoss, false);
  one(out, 'gate_bars', 16, 32, gateBars);
  one(out, 'lever_off', 16, 18, (p) => lever(p, 0)); one(out, 'lever_mid', 16, 18, (p) => lever(p, 1)); one(out, 'lever_on', 16, 18, (p) => lever(p, 2));
  one(out, 'plate_up', 16, 16, (p) => plate(p, false), false); one(out, 'plate_down', 16, 16, (p) => plate(p, true), false);
  one(out, 'brazier_unlit', 16, 28, (p) => brazier(p, -1), false); anim(out, 'brazier', 4, 16, 28, brazier, false);
  anim(out, 'torch', 4, 12, 30, torch, false); anim(out, 'wall_torch', 4, 12, 22, wallTorch, false);
  one(out, 'boulder_wall', 16, 28, boulderWall, false);
  one(out, 'push_block', 16, 22, pushBlock);
  one(out, 'quellstein_off', 32, 52, (p) => quellstein(p, -1), false); anim(out, 'quellstein', 6, 32, 52, quellstein, false);
  anim(out, 'portal', 8, 40, 56, portal, false);
  one(out, 'cave_entrance', 48, 44, caveEntrance, false);
  one(out, 'stairs_down', 32, 32, (p) => stairs(p, true), false); one(out, 'stairs_up', 32, 32, (p) => stairs(p, false), false);
  anim(out, 'spikes', 4, 16, 16, spikes, false);
  one(out, 'turret', 16, 26, turret);
  one(out, 'node_herb', 16, 18, nodeHerb, false); one(out, 'node_wood', 20, 24, nodeWood); one(out, 'node_crystal', 20, 22, nodeCrystal, false); one(out, 'node_ember', 20, 20, nodeEmber, false);
  one(out, 'node_frost', 20, 20, nodeFrost, false); one(out, 'node_rune', 20, 22, nodeRune, false); one(out, 'node_void', 20, 22, (p) => { nodeVoid(p); }, false); one(out, 'node_empty', 16, 10, nodeEmpty);
  anim(out, 'shard', 6, 16, 26, shard, false);
  one(out, 'drop_bag', 14, 14, dropBag); one(out, 'drop_gold', 14, 14, dropGold, false); one(out, 'drop_potion', 14, 14, dropPotion); one(out, 'drop_gear', 14, 14, dropGear, false); one(out, 'drop_key', 14, 14, dropKey);
  one(out, 'grave', 16, 20, grave);
  one(out, 'seal_pedestal', 24, 32, sealPedestal);
}
