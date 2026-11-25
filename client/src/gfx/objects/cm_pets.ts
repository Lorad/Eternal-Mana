/**
 * Begleiter (v2), Präfix `pet_`. Je Begleiter 6 Frames à 20×20: `_0`, `_1` = Ruheschleife, `_2`…`_5` = Laufschleife.
 * Alle blicken nach rechts (die Engine spiegelt), Anker unten Mitte: Standfläche ist die Frame-Unterkante (Füße bei
 * y = 18, Kontur bei y = 19). Schwebende Begleiter (Irrlicht) halten ihren Abstand zum Boden im Frame selbst; das
 * Hüpfen der Schneeeule steckt ebenfalls in den Lauf-Frames. Lichtschein ist halbtransparent und ohne Kontur.
 */
import { Px, bez, tube } from '../draw';
import { Frames, INK, P, Ramp, WHITE, alpha, glow, inkOutline, mix } from './kit';

export const PET_W = 20, PET_H = 20, PET_FRAMES = 6;
export const PET_IDS = ['moosling', 'wisp', 'glutfuchs', 'schneeeule', 'runenkaefer', 'schattenkatze', 'quelldrachling', 'pilzling'] as const;

type Pet = (p: Px, f: number) => void;
/** Laufphase 0..3 (−1 = Ruhe) */
const ph = (f: number): number => (f >= 2 ? f - 2 : -1);
const dot = (p: Px, x: number, y: number, c: number, a: number): void => { if (p.get(x, y) >>> 24 === 0) p.set(x, y, alpha(c, a)); };

// ---------------------------------------------------------------- Moosling: Moosknäuel mit Blatt
const moosling: Pet = (p, f) => {
  // Helles, gelbliches Moos, cremefarbenes Gesicht, braune Wurzelfüße und eine kräftige dunkle Kontur: Auf Gras und unter
  // Blätterschatten ging der frühere, rein grüne Moosling unter.
  const G: Ramp = [P.forest[1], P.green[2], P.green[3], P.green[4], mix(P.green[4], P.gold[4], 0.55)], C = P.cream, R = P.wood;
  const w = ph(f), dy = w < 0 ? 0 : [0, -1, 0, -1][w], sq = w < 0 && f === 1 ? 1 : 0, lx = w < 0 ? f : [1, 0, -1, 0][w];
  const cy = 12.2 + dy + sq * 0.6, a = w < 0 ? 0 : [1, 0, -1, 0][w];
  for (const [x, up] of [[6 + a, w === 3], [11 - a, w === 1]] as const) { const y = 17 - (up ? 1 : 0); p.rect(x, y, 3, 2, R[2]); p.set(x, y, R[3]); p.set(x + 2, y + 1, R[1]); }
  p.ball(10, cy, 6.6, 5.2 - sq * 0.5, G, 1, 4);
  const t = Math.round(cy - 5 + sq * 0.5);
  p.px([5, t + 2, 7, t, 8, t + 1, 12, t, 6, t + 3], G[4]); p.px([13, t + 1, 15, t + 3, 10, t], G[3]); p.px([7, t + 8, 5, t + 6, 4, t + 5], G[0]);
  // Gesicht: heller Fleck vorn, große Augen, Wangen
  const ey = Math.round(cy - 0.8);
  p.ell(12.6, cy + 0.9, 3.5, 2.8, C[3]); p.ell(12.2, cy + 0.5, 2.7, 1.9, C[4]);
  p.rect(11, ey, 1, 2, INK); p.rect(14, ey, 1, 2, INK); p.set(10, ey + 2, P.pink[3]); p.set(15, ey + 2, P.pink[3]); p.px([12, ey + 2, 13, ey + 2], R[1]);
  // Trieb mit großem Blatt, das nachschwingt, und einer kleinen weißen Blüte
  p.rect(9, t - 2, 1, 3, R[2]);
  p.poly([[9.5, t - 1.5], [8, t - 5], [4 + lx, t - 5 + (lx > 0 ? 1 : 0)], [3 + lx, t - 3], [6, t - 1.5]], G[3]);
  p.line(9, t - 2, 5 + lx, t - 4, G[4]); p.set(4 + lx, t - 3, G[1]);
  p.px([11, t - 3, 13, t - 3, 12, t - 4, 12, t - 2], WHITE); p.set(12, t - 3, P.gold[3]); p.px([10, t - 2, 11, t - 2], G[2]);
  inkOutline(p, 0.74, 0.88);
};

// ---------------------------------------------------------------- Irrlicht: freundliches Flämmchen, schwebt
const wisp: Pet = (p, f) => {
  // Flammenleib durchgehend hell (außen Türkis, innen fast Weiß): die frühere dunkle Spitze las sich als Rübenblatt
  const O = P.teal[3], M = P.teal[4], L = mix(P.teal[4], WHITE, 0.6);
  const w = ph(f), dy = w < 0 ? -f : [0, -1, -1, 0][w], lean = w < 0 ? 0 : 1, fl = w < 0 ? (f ? 1 : -1) : [-1, -2, -1, -2][w];
  const cx = 10 + lean, cy = 11 + dy, tx = cx + fl * 1.1 - (w < 0 ? 0 : 1.2), ty = cy - 9;
  p.poly([[cx - 3.8, cy - 1], [cx - 2.4 + fl * 0.3, cy - 4.5], [tx, ty], [cx + 1.8 + fl * 0.5, cy - 4.5], [cx + 3.8, cy - 1]], O);
  p.ell(cx, cy, 4.5, 4.3, O);
  p.poly([[cx - 2.6, cy - 1], [cx - 1.4 + fl * 0.3, cy - 4], [tx + 0.2, ty + 2.4], [cx + 0.8 + fl * 0.4, cy - 4], [cx + 2.4, cy - 1]], M);
  p.ell(cx - 0.3, cy - 0.2, 3.5, 3.3, M); p.ell(cx - 0.6, cy - 0.6, 2.5, 2.4, L); p.ell(cx - 0.9, cy - 1, 1.5, 1.3, WHITE);
  p.px([cx + 2, cy + 3, cx + 3, cy + 2, cx + 1, cy + 3], P.teal[2]); p.set(Math.round(tx), Math.round(ty + 1), M);
  const ex = Math.round(cx), ey = Math.round(cy - 0.4);
  p.rect(ex, ey, 1, 2, P.teal[0]); p.rect(ex + 2, ey, 1, 2, P.teal[0]); p.set(ex + 1, ey + 2, P.teal[1]);
  if (w < 0 && f === 1) { p.rect(ex, ey, 1, 1, M); p.rect(ex + 2, ey, 1, 1, M); }
  inkOutline(p, 0.42, 0.58, P.teal[0]);
  glow(p, cx, cy, 8, P.teal[4], 70);
  // Funken: unter dem Irrlicht bzw. als Schweif hinter ihm
  if (w < 0) { dot(p, 9 + f, 17 + f, P.teal[4], 200); dot(p, 12 - f, 18, WHITE, 170); dot(p, 7, 16 - f, P.teal[3], 150); }
  else { dot(p, 5 - (w & 1), 13 + (w >> 1), P.teal[4], 210); dot(p, 3 + (w & 1), 11 + w % 3, WHITE, 170); dot(p, 6, 16 - (w & 1), P.teal[3], 160); dot(p, 2, 14, P.teal[3], 110); }
};

// ---------------------------------------------------------------- Glutfuchs: Fuchswelpe mit glimmender Schwanzspitze
const FOX: Ramp = [P.red[0], P.fire[0], P.fire[1], P.fire[2], P.fire[3]];
function foxHead(p: Px, hx: number, hy: number, blink: boolean, ear = 0): void {
  const F = FOX, C = P.cream, D = P.wood[0];
  p.poly([[hx - 3, hy - 1], [hx - 3 - ear, hy - 6], [hx - 0.5, hy - 2.5]], F[2]); p.poly([[hx, hy - 2.5], [hx + 2, hy - 6], [hx + 3, hy - 1]], F[2]);
  p.set(hx - 3 - ear, hy - 5, D); p.set(hx + 1, hy - 5, D); p.set(hx + 1, hy - 4, C[3]); p.set(hx - 2, hy - 4, F[1]);
  p.ell(hx, hy, 3.5, 3, F[2]); p.ell(hx - 0.6, hy - 0.8, 2.4, 1.6, F[3]);
  p.ell(hx + 2.6, hy + 1.3, 2, 1.3, C[4]); p.px([hx - 1, hy + 2, hx, hy + 2, hx + 1, hy + 2], C[3]);
  p.set(hx + 4, hy + 0.6, INK);
  if (blink) p.rect(hx + 1, hy, 2, 1, D); else { p.rect(hx + 1, hy - 1, 1, 2, INK); p.set(hx + 1, hy - 1, D); p.set(hx + 2, hy - 1, WHITE); }
}
const glutfuchs: Pet = (p, f) => {
  const F = FOX, C = P.cream, D = P.wood[0], E = P.fire, w = ph(f);
  let tx = 0, ty = 0;
  if (w < 0) {
    // sitzt: Schwanz um die Flanke gelegt, Spitze glimmt
    p.ell(4.6, 15.6, 3, 2.6, F[2]); p.ell(4, 15, 2, 1.6, F[3]); p.ell(3, 12.6, 1.9, 2.3, F[2]); p.ell(3 + f * 0.6, 10.4, 1.5, 1.7, E[3]); p.set(3 + f, 8.6, E[4]); p.set(2 + f, 10, E[4]);
    tx = 3 + f; ty = 9.5;
    p.ell(8.6, 14.6, 3.8, 3.5, F[2]); p.ell(7.8, 13.6, 2.4, 2.2, F[3]); p.ell(11.4, 13, 2.4, 3.6, F[2]); p.ell(12.4, 13.8, 1.3, 2.6, C[4]);
    p.rect(11, 15, 2, 4, F[2]); p.rect(13, 16, 1, 3, F[1]); p.rect(11, 17, 2, 2, D); p.set(13, 18, D); p.rect(6, 18, 4, 1, D); p.set(6, 17, F[1]);
    foxHead(p, 12.4, 8.6, f === 1, f);
  } else {
    const dy = [0, -1, 0, -1][w], a = [1, 0, -1, 0][w], tw = [0, -1, 0, 1][w];
    // Schwanz weht hinterher
    p.ell(4.4, 11.6 + dy, 2.2, 2, F[2]); p.ell(2.8, 9.6 + dy + tw, 2.2, 2.2, F[2]); p.ell(2.6, 9.2 + dy + tw, 1.3, 1.3, F[3]); p.ell(2.2, 7.4 + dy + tw, 1.5, 1.7, E[3]); p.set(2, 5.6 + dy + tw, E[4]); p.set(1, 7 + dy + tw, E[4]);
    tx = 2.2; ty = 6.8 + dy + tw;
    // ferne Läufe, Rumpf, nahe Läufe
    p.rect(11 - a, 15 + dy, 1, 4 - dy, F[1]); p.rect(7 + a, 15 + dy, 1, 4 - dy, F[1]); p.set(11 - a, 18, D); p.set(7 + a, 18, D);
    p.ell(9, 13 + dy, 4.8, 2.9, F[2]); p.ell(8.4, 12.2 + dy, 3.6, 1.6, F[3]); p.ell(10.4, 14.6 + dy, 2.6, 1, C[3]);
    const lift = (k: number): number => (w === k ? 1 : 0);
    p.rect(12 + a, 15 + dy, 2, 4 - dy - lift(1), F[2]); p.rect(12 + a, 17 - lift(1), 2, 2, D);
    p.rect(5 - a, 15 + dy, 2, 4 - dy - lift(3), F[2]); p.rect(5 - a, 17 - lift(3), 2, 2, D);
    foxHead(p, 14.4, 9.8 + dy, false);
  }
  inkOutline(p);
  glow(p, tx, ty, 4.5, E[3], 80);
  dot(p, tx + (f & 1 ? 2 : -1), ty - 4 - (f % 3), E[3], 220); dot(p, tx + (f & 1 ? -2 : 1), ty - 2 - (f & 1), E[2], 170);
  void C;
};

// ---------------------------------------------------------------- Schneeeule: flauschiges Eulenküken, hüpft flatternd
const schneeeule: Pet = (p, f) => {
  const S = P.snow, Y = P.gold, w = ph(f);
  const hop = w < 0 ? 0 : [0, 3, 4, 1][w], sq = w === 0 ? 1 : w < 0 && f === 1 ? 0.5 : 0, wing = w < 0 ? 0 : [0, 2, -1, 1][w];
  const cy = 12.4 - hop + sq * 0.6, ry = 5.4 - sq * 0.7;
  // Füße (im Sprung angezogen)
  if (hop === 0) { p.rect(8, 18, 2, 1, Y[2]); p.rect(12, 18, 2, 1, Y[2]); } else { p.set(9, Math.round(cy + ry), Y[2]); p.set(12, Math.round(cy + ry), Y[2]); }
  // Schwingen: angelegt, oben, unten, halb
  if (wing === 0) { p.ell(6.4, cy + 1, 2.4, 3.4, S[1]); }
  else if (wing === 2) { p.poly([[6, cy], [1, cy - 6], [3, cy - 1], [5, cy + 2]], S[2]); p.poly([[14, cy], [19, cy - 6], [17, cy - 1], [15, cy + 2]], S[1]); p.px([1, cy - 5, 2, cy - 3], S[4]); p.set(19, cy - 5, S[3]); }
  else if (wing === -1) { p.poly([[6, cy - 1], [1, cy + 3], [3, cy + 4], [6, cy + 3]], S[2]); p.poly([[14, cy - 1], [19, cy + 3], [17, cy + 4], [14, cy + 3]], S[1]); p.set(2, cy + 3, S[4]); }
  else { p.poly([[6, cy - 1], [1, cy - 1], [2, cy + 1], [6, cy + 2]], S[2]); p.poly([[14, cy - 1], [19, cy - 1], [18, cy + 1], [14, cy + 2]], S[1]); p.set(2, cy - 1, S[4]); }
  // Körper: graublau gesprenkelt, damit das weiße Gesicht davor steht
  p.ball(10, cy, 5.6, ry, [S[0], S[1], S[2], S[3], S[3]], 1, 4, 0.06);
  const t = Math.round(cy - ry);
  p.px([6, t + 1, 13, t + 1], S[4]); p.set(5, t, S[3]); p.set(14, t, S[3]);
  if (wing === 0) { p.ell(6.2, cy + 1.4, 1.8, 2.8, S[2]); p.px([6, cy + 3, 5, cy + 1, 7, cy + 4], S[1]); }
  p.px([9, cy + 3, 11, cy + 4, 13, cy + 3, 10, cy + 5, 12, cy + 5], S[1]);
  // Gesichtsschleier, große Augen mit Goldring, Schnabel
  const ey = Math.round(cy - 2.4);
  p.ell(11.5, cy - 1.2, 4.2, 2.9, S[4]); p.px([8, ey - 1, 15, ey - 1], S[4]);
  if (w < 0 && f === 1) { p.rect(8, ey + 1, 3, 1, P.steel[1]); p.rect(12, ey + 1, 3, 1, P.steel[1]); }
  else for (const x of [8, 12]) { p.rect(x, ey, 3, 3, Y[3]); p.rect(x + 1, ey, 2, 2, INK); p.set(x + 1, ey, WHITE); p.set(x, ey + 2, Y[2]); }
  p.rect(11, ey + 2, 1, 2, P.fire[2]); p.set(11, ey + 2, Y[4]);
  inkOutline(p, 0.5, 0.66, P.blue[0]);
};

// ---------------------------------------------------------------- Runenkäfer: Panzer mit leuchtender Glyphe
const runenkaefer: Pet = (p, f) => {
  // Käfer statt Schildkröte: ovaler Hinterleib mit Flügeldeckennaht, abgesetzter heller Halsschild, Kopf mit Gabelhorn,
  // fünf sichtbare, abgewinkelte Beine im Dreifußgang.
  const B: Ramp = [P.shadow[1], P.blue[0], P.blue[1], mix(P.blue[2], P.violet[2], 0.35), mix(P.blue[3], P.ice[2], 0.4)], S = P.steel, Y = P.gold, w = ph(f);
  const dy = w === 1 || w === 3 ? -1 : 0, o = w < 0 ? 0 : [1, 0, -1, 0][w];
  // ferne Beine
  p.line(6, 14 + dy, 6 - o, 18, S[0]); p.line(10, 14 + dy, 10 + o, 18, S[0]);
  // nahe Beine: Hüfte → Knie → Fuß
  for (const [x, kx, fx] of [[4, 2, 1 + o], [8, 8, 8 - o], [12, 14, 15 + o]] as const) { p.line(x, 14 + dy, kx, 16 + dy, S[2]); p.line(kx, 16 + dy, fx, 18, S[1]); p.set(kx, 15 + dy, S[3]); }
  // Hinterleib
  const cy = 10.6 + dy;
  for (let y = 4; y < 17; y++) for (let x = 0; x < 15; x++) {
    const nx = (x + 0.5 - 7.4) / 6.2, ny = (y + 0.5 - cy) / 4.9, rr = nx * nx + ny * ny;
    if (rr > 1) continue;
    const t = 0.58 - (nx * 0.45 + ny * 0.7) * 0.62 - rr * 0.14;
    p.set(x, y, B[Math.max(1, Math.min(4, 1 + Math.floor(t * 3.6)))]);
  }
  // Naht der Flügeldecken über den Rücken, Glanz
  for (const [x, y] of [[12, 7], [11, 7], [10, 6], [9, 6], [8, 6], [7, 6], [6, 7], [5, 7], [4, 8], [3, 9], [2, 10]] as const) p.set(x, y + dy + 1, B[0]);
  p.px([5, 6 + dy, 6, 6 + dy, 4, 7 + dy], WHITE); p.px([3, 13 + dy, 5, 14 + dy, 8, 15 + dy], B[0]);
  // Halsschild mit Goldkante, Kopf, Gabelhorn, Taster
  p.ell(14.2, 11.4 + dy, 2.5, 3.5, S[2]); p.ell(13.8, 10.6 + dy, 1.5, 2, S[3]); p.px([13, 9 + dy, 14, 9 + dy], S[4]);
  for (let y = 8; y <= 14; y++) p.set(12, y + dy, y < 11 ? Y[4] : y < 13 ? Y[3] : Y[2]);
  p.ell(16.9, 13 + dy, 1.9, 1.9, S[1]); p.set(17, 12 + dy, P.teal[4]); p.set(16, 12 + dy, S[2]);
  const an = w < 0 ? f : w & 1;
  p.line(17, 11 + dy, 18, 8 + dy - an, S[2]); p.px([19, 7 + dy - an, 17, 7 + dy - an], S[3]); p.set(18, 8 + dy - an, S[3]);
  p.px([18, 15 + dy, 19, 14 + dy], S[2]);
  // Glyphe (ein Runenzeichen mit zwei Ästen): pulsiert in der Ruhe
  const dim = w < 0 && f === 1, R = dim ? P.teal[3] : P.teal[4], gy = 9 + dy;
  p.rect(7, gy, 1, 4, dim ? P.teal[4] : WHITE); p.px([6, gy + 1, 5, gy, 8, gy + 1, 9, gy, 7, gy - 1], R);
  inkOutline(p);
  glow(p, 7.5, gy + 1, dim ? 4 : 5.5, P.teal[4], dim ? 45 : 75);
  if (!dim) { dot(p, 7, gy - 5, P.teal[4], 200); dot(p, 2, gy - 3, P.teal[4], 120); }
};

// ---------------------------------------------------------------- Schattenkatze: Kätzchen aus Schatten, blasse Augen
const CAT: Ramp = [P.shadow[1], P.shadow[2], P.shadow[3], P.shadow[4], P.violet[3]];
function catHead(p: Px, hx: number, hy: number, blink: boolean): void {
  const K = CAT;
  p.poly([[hx - 3, hy - 1], [hx - 3, hy - 6], [hx - 0.5, hy - 2.5]], K[2]); p.poly([[hx + 0.5, hy - 2.5], [hx + 3, hy - 6], [hx + 3, hy - 1]], K[2]);
  p.set(hx - 3, hy - 5, K[4]); p.set(hx + 2, hy - 4, P.pink[2]);
  p.ell(hx, hy, 3.4, 2.9, K[2]); p.ell(hx - 0.8, hy - 1, 2.2, 1.4, K[3]); p.set(hx - 2, hy - 2, K[4]);
  if (blink) { p.rect(hx - 1, hy, 2, 1, P.violet[4]); p.rect(hx + 2, hy, 2, 1, P.violet[4]); }
  else { p.rect(hx - 1, hy - 1, 1, 2, WHITE); p.rect(hx + 2, hy - 1, 1, 2, WHITE); p.set(hx - 1, hy - 1, P.ice[3]); p.set(hx + 2, hy - 1, P.ice[3]); }
  p.set(hx + 3.4, hy + 1, P.pink[2]);
}
const schattenkatze: Pet = (p, f) => {
  const K = CAT, w = ph(f);
  let wx = 0, wy = 0;
  if (w < 0) {
    // sitzt: Schwanz als Fragezeichen, Spitze verweht
    p.line(5, 17, 3, 14, K[2], 2); p.line(3, 14, 3, 10, K[2], 2); p.line(3, 10, 5 + f, 8, K[2], 2); p.px([3, 13, 3, 11], K[3]);
    wx = 6 + f; wy = 7;
    p.ell(8.4, 14.8, 3.6, 3.4, K[2]); p.ell(7.6, 13.8, 2.2, 2, K[3]); p.ell(11, 13.4, 2.2, 3.4, K[2]);
    p.rect(10, 15, 2, 4, K[2]); p.rect(12, 16, 1, 3, K[1]); p.rect(6, 18, 3, 1, K[1]); p.set(10, 15, K[3]);
    catHead(p, 11.6, 8.8, f === 1);
  } else {
    const dy = [0, -1, 0, -1][w], a = [1, 0, -1, 0][w], tw = [0, 1, 0, -1][w];
    p.line(5, 12 + dy, 3, 10 + dy, K[2], 2); p.line(3, 10 + dy, 2 + tw, 6 + dy, K[2], 2); p.set(3, 9 + dy, K[3]);
    wx = 2 + tw; wy = 5 + dy;
    p.rect(11 - a, 15 + dy, 1, 4 - dy, K[1]); p.rect(7 + a, 15 + dy, 1, 4 - dy, K[1]);
    p.ell(9, 13 + dy, 4.8, 2.6, K[2]); p.ell(8.4, 12.2 + dy, 3.6, 1.4, K[3]); p.px([5, 12 + dy, 6, 11 + dy], K[4]);
    const lift = (k: number): number => (w === k ? 1 : 0);
    p.rect(12 + a, 15 + dy, 1, 4 - dy - lift(1), K[2]); p.rect(6 - a, 15 + dy, 1, 4 - dy - lift(3), K[2]);
    catHead(p, 14.2, 9.8 + dy, false);
  }
  // Kantenlicht oben links, damit die dunkle Gestalt auch auf dunklem Boden lesbar bleibt
  const src = p.d.slice(), op = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < p.w && y < p.h && src[y * p.w + x] >>> 24 >= 200;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) { const c = src[y * p.w + x]; if ((c === K[2] || c === K[3]) && (!op(x, y - 1) || (!op(x - 1, y) && !op(x - 1, y - 1)))) p.set(x, y, c === K[3] ? K[4] : P.violet[2]); }
  inkOutline(p, 0.5, 0.7, P.shadow[0]);
  dot(p, wx, wy - 1, P.violet[3], 190); dot(p, wx + 1, wy - 3, P.violet[3], 130); dot(p, wx - 1, wy - 2 - (f & 1), P.violet[2], 150); dot(p, wx + (f & 1 ? 2 : -2), wy - 4, P.violet[4], 90);
};

// ---------------------------------------------------------------- Quelldrachling: Wasserkristall-Drache, der seltenste
const quelldrachling: Pet = (p, f) => {
  // Ruhiger als zuvor: ein Farbton für den Leib, ein heller Flossenflügel, zwei kurze Hörner, ein Tropfen an der
  // Schwanzspitze – keine Kristallzacken und kein wanderndes Funkeln mehr.
  const A: Ramp = [P.blue[0], P.blue[1], mix(P.blue[2], P.teal[2], 0.5), mix(P.blue[3], P.teal[3], 0.55), mix(P.ice[3], P.teal[4], 0.4)], T = P.teal, I = P.ice, w = ph(f);
  const dy = w < 0 ? 0 : [0, -1, 0, -1][w], a = w < 0 ? 0 : [1, 0, -1, 0][w], fl = w < 0 ? f : [0, 1, 2, 1][w], tw = w < 0 ? f : [0, 1, 0, -1][w];
  // Schwanz: ein Bogen nach oben, an der Spitze der Tropfen
  const ty = 9 + dy - tw;
  tube(p, bez([6, 15 + dy], [1, 17 + dy], [2.5, ty + 2], 8), 1.5, 0.9, A, 1);
  p.ell(2.5, ty, 1.7, 2, T[4]); p.set(2, ty - 2, T[4]); p.set(2, ty - 1, WHITE); p.set(3, ty + 1, T[3]);
  // ferne Beine
  p.rect(11 - a, 16 + dy, 1, 3 - dy, A[1]); p.rect(7 + a, 16 + dy, 1, 3 - dy, A[1]);
  // ein Flossenflügel (schlägt beim Laufen)
  const wy = 7 + dy - fl;
  p.poly([[6.5, 12.5 + dy], [5, wy], [9.5, wy + 2], [10.5, 12.5 + dy]], I[3]); p.line(6, 12 + dy, 5, wy, I[4]); p.line(8, 12 + dy, 7, wy + 2, I[2]);
  // Rumpf, heller Bauch
  p.ell(8.8, 14 + dy, 4.2, 2.8, A[2]); p.ell(8.2, 13.2 + dy, 3, 1.5, A[3]); p.rect(8, 16 + dy, 4, 1, A[4]);
  // Hals, großer Kopf mit Schnauze, zwei kurze Hörner
  p.ell(12.2, 12.2 + dy, 1.9, 2.4, A[2]); p.px([13, 13 + dy, 13, 14 + dy], A[4]);
  const hx = 14, hy = 9 + dy;
  p.px([hx - 2, hy - 3, hx - 3, hy - 4, hx - 3, hy - 5], I[4]); p.px([hx, hy - 3, hx, hy - 4], I[3]);
  p.ell(hx, hy, 3.3, 2.9, A[2]); p.ell(hx - 0.6, hy - 0.9, 2.2, 1.4, A[3]); p.ell(hx + 2.9, hy + 1, 1.8, 1.3, A[3]); p.px([hx + 1, hy + 2, hx + 2, hy + 2], A[4]);
  p.rect(hx + 1, hy - 1, 1, 2, INK); p.set(hx + 2, hy - 1, WHITE); p.set(hx + 4, hy + 0.5, A[0]);
  // nahe Beine
  const lift = (k: number): number => (w === k ? 1 : 0);
  p.rect(12 + a, 15 + dy, 2, 4 - dy - lift(1), A[2]); p.rect(5 - a, 15 + dy, 2, 4 - dy - lift(3), A[2]);
  p.set(13 + a, 18 - lift(1), A[4]); p.set(6 - a, 18 - lift(3), A[4]);
  inkOutline(p, 0.5, 0.68, P.blue[0]);
  glow(p, 2.5, ty, 3.6, T[4], 85);
};

// ---------------------------------------------------------------- Pilzling: kleiner Pilz auf Füßen
const pilzling: Pet = (p, f) => {
  const R = P.red, C = P.cream, T = P.tan, w = ph(f);
  const dy = w < 0 ? 0 : [0, -1, 0, -1][w], bob = w < 0 ? f : 0, tilt = w < 0 ? 0 : [1, 0, -1, 0][w], a = w < 0 ? 0 : [1, 0, -1, 0][w];
  p.rect(6 + a, 17 - (w === 3 ? 1 : 0), 3, 2, T[1]); p.rect(11 - a, 17 - (w === 1 ? 1 : 0), 3, 2, T[1]);
  // Stiel mit Gesicht
  p.rect(7, 11 + dy, 7, 7 - dy, C[3]); p.rect(7, 11 + dy, 2, 7 - dy, C[4]); p.rect(13, 12 + dy, 1, 6 - dy, C[2]); p.rect(8, 17, 5, 1, C[2]); p.set(7, 17, C[3]);
  const ey = 13 + dy + bob;
  p.rect(10, ey, 1, 2, INK); p.rect(13, ey, 1, 2, INK); p.set(11, ey + 2, P.pink[3]); p.set(12, ey + 2, P.pink[3]); p.set(9, ey + 2, P.pink[4]);
  // Hut (wippt), Lamellenkante, Tupfen
  const cy = 10.4 + dy + bob, cx = 10 + tilt * 0.5;
  for (let y = 2; y < 13; y++) for (let x = 0; x < 20; x++) {
    const nx = (x + 0.5 - cx) / 8, ny = (y + 0.5 - cy) / 6.6, rr = nx * nx + ny * ny;
    if (rr > 1 || y + 0.5 > cy) continue;
    const t = 0.55 - (nx * 0.45 + ny * 0.7) * 0.6 - rr * 0.12;
    p.set(x, y, R[Math.max(1, Math.min(4, 1 + Math.floor(t * 3.4)))]);
  }
  const by = Math.round(cy - 0.5);
  p.rect(Math.round(cx - 7.5), by, 15, 1, R[1]); p.rect(Math.round(cx - 6), by + 1, 12, 1, T[2]); p.px([cx - 5, by + 1, cx - 2, by + 1, cx + 1, by + 1, cx + 4, by + 1], T[1]);
  const d = Math.round(cx - 10);
  p.rect(5 + d, by - 4, 2, 2, WHITE); p.rect(10 + d, by - 6, 2, 1, WHITE); p.rect(13 + d, by - 3, 2, 2, C[4]); p.set(3 + d, by - 2, WHITE); p.set(8 + d, by - 2, C[4]); p.set(16 + d, by - 1, C[3]);
  inkOutline(p);
};

const PETS: Record<(typeof PET_IDS)[number], Pet> = { moosling, wisp, glutfuchs, schneeeule, runenkaefer, schattenkatze, quelldrachling, pilzling };

export function cmPets(out: Frames): void {
  for (const id of PET_IDS) for (let f = 0; f < PET_FRAMES; f++) { const p = new Px(PET_W, PET_H); PETS[id](p, f); out.push([`pet_${id}_${f}`, p]); }
}
