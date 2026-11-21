/** Grünwald – Fachwerkhäuser (v2). Frame 80×100, Standfläche = untere Mitte 64×48, Dach darf überstehen. */
import { Px, Pt } from '../draw';
import { Frames, MARK, MARK2, P, Ramp, WHITE, band, clamp, hash2, inkOutline, masonry, mix, moss, one, part, planks, rnd2, shadeArea, texFill } from './kit';

const W = P.wood, C = P.cream, S = P.stone, G = P.green;
export const ROOF_RED: Ramp = [mix(P.red[0], W[0], 0.4), mix(P.red[1], W[1], 0.35), mix(P.red[2], P.fire[1], 0.45), mix(P.red[3], P.fire[2], 0.35), mix(P.red[4], P.tan[4], 0.4)];
export const ROOF_SLATE: Ramp = [P.steel[0], mix(P.steel[1], P.blue[1], 0.4), mix(P.steel[2], P.blue[2], 0.38), mix(P.steel[3], P.blue[3], 0.3), mix(P.steel[4], P.blue[4], 0.3)];
export const STRAW: Ramp = [mix(W[1], P.gold[0], 0.5), mix(P.tan[1], P.gold[1], 0.4), mix(P.tan[2], P.gold[2], 0.45), mix(P.tan[3], P.gold[3], 0.45), mix(P.tan[4], P.gold[4], 0.4)];
const SHADE = P.shadow[2];

/** Dachziegel/Schiefer auf Markerpixeln: versetzte Reihen, Schattenfuge, Lichtkante, Ton-Varianz, oben heller. */
export function roofTiles(p: Px, R: Ramp, y0: number, h: number, seed: number, rh = 4, tw = 5, mark: number = MARK): void {
  texFill(p, mark, (x, y) => {
    const r = Math.floor((y - y0) / rh), ty = y - y0 - r * rh, xs = x + (r & 1 ? tw >> 1 : 0), c = Math.floor(xs / tw), tx = xs - c * tw, hh = hash2(c, r, seed), k = (y - y0) / h;
    let tone = 2 + ((hh & 15) < 2 + (k < 0.4 ? 3 : 0) ? 1 : (hh & 15) > 12 - (k > 0.6 ? 2 : 0) ? -1 : 0);
    if (ty === rh - 1) tone = tx === 0 || tx === tw - 1 ? 0 : 1;
    else if (ty === 0) tone += tx < tw - 1 ? 1 : 0;
    else if (tx === tw - 1) tone -= 1;
    return R[clamp(tone, 0, 4)];
  });
}
/** Stroh/Reet auf Markerpixeln: Lagen mit dunkler Traufkante und hellen Halmen. */
export function thatch(p: Px, R: Ramp, seed: number, layer = 7, mark: number = MARK): void {
  texFill(p, mark, (x, y) => {
    const yy = y + ((hash2(x >> 1, 0, seed) & 3) === 0 ? 1 : 0), m = ((yy % layer) + layer) % layer, h = hash2(x, Math.floor(yy / 4), seed) & 15;
    let tone = 2 + (h < 3 ? 1 : h > 11 ? -1 : 0);
    if (m === layer - 1) tone = h < 5 ? 0 : 1; else if (m === 0) tone = 3 + (h < 4 ? 1 : 0); else if (m === layer - 2) tone -= 1;
    return R[clamp(tone, 0, 4)];
  });
}
function plaster(p: Px, x: number, y: number, w: number, h: number, seed: number): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const n = rnd2(x + i, y + j, seed), st = rnd2((x + i) >> 2, (y + j) >> 1, seed + 1);
    p.set(x + i, y + j, j > h - 7 && st < 0.3 ? C[2] : n < 0.05 ? C[2] : n > 0.93 ? C[4] : C[3]);
  }
}
function hbeam(p: Px, x: number, y: number, w: number, h = 3): void {
  p.rect(x, y, w, h, W[1]); p.rect(x, y, w, 1, W[2]); p.rect(x, y + h - 1, w, 1, W[0]);
  for (let i = x + 2; i < x + w - 2; i += 5) if (hash2(i, y, 3) & 1) p.set(i, y + 1, W[0]); else p.set(i + 1, y, W[3]);
}
function vbeam(p: Px, x: number, y: number, h: number, w = 3): void {
  p.rect(x, y, w, h, W[1]); p.rect(x, y, 1, h, W[2]); p.rect(x + w - 1, y, 1, h, W[0]);
  for (let j = y + 2; j < y + h - 2; j += 5) if (hash2(x, j, 4) & 1) p.set(x + 1, j, W[0]); else p.set(x, j + 1, W[3]);
}
function brace(p: Px, x0: number, y0: number, x1: number, y1: number): void {
  p.line(x0, y0, x1, y1, W[1], 2); p.line(x0, y0, x1, y1, W[2]); p.line(x0 + 1, y0 + 1, x1 + 1, y1 + 1, W[0]);
}
interface WinOpts { shutters?: number; box?: boolean; curtain?: boolean; panes?: number }
function win(p: Px, x: number, y: number, w: number, h: number, o: WinOpts = {}): void {
  p.rect(x - 1, y - 1, w + 2, h + 2, W[0]); p.rect(x - 1, y - 1, w + 2, 1, W[2]);
  const Gl = [P.blue[0], mix(P.blue[1], P.steel[1], 0.4), mix(P.blue[2], P.steel[2], 0.4), P.ice[2], P.ice[4]];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const d = i + j; p.set(x + i, y + j, d < 3 ? Gl[2] : d === 4 || d === 5 ? Gl[3] : d > w + h - 5 ? Gl[0] : Gl[1]); }
  p.set(x + 1, y + 1, Gl[4]);
  if (o.curtain) { p.px([x, y, x + 1, y, x, y + 1, x + w - 1, y, x + w - 2, y, x + w - 1, y + 1], C[4]); p.px([x, y + 2, x + w - 1, y + 2], C[2]); }
  const n = o.panes ?? 2;
  for (let k = 1; k < n; k++) p.rect(x + Math.round((w * k) / n) - (n === 2 ? 0 : 0), y, 1, h, W[1]);
  p.rect(x, y + (h >> 1), w, 1, W[1]);
  p.rect(x - 2, y + h + 1, w + 4, 1, W[3]); p.rect(x - 2, y + h + 2, w + 4, 1, W[1]);
  if (o.shutters) {
    const T = o.shutters === 1 ? [P.teal[0], P.teal[1], P.teal[2]] : [P.forest[0], P.forest[2], P.forest[3]];
    for (const sx of [x - 5, x + w + 1]) { p.rect(sx, y - 1, 4, h + 2, T[1]); p.rect(sx, y - 1, 1, h + 2, T[2]); p.rect(sx + 3, y - 1, 1, h + 2, T[0]); for (let j = y + 1; j < y + h; j += 2) p.rect(sx + 1, j, 2, 1, T[0]); p.set(sx + 1, y + (h >> 1), P.steel[3]); }
  }
  if (o.box) {
    const by = y + h + 2;
    p.rect(x - 2, by, w + 4, 3, W[2]); p.rect(x - 2, by, w + 4, 1, W[3]); p.rect(x - 2, by + 2, w + 4, 1, W[0]); p.set(x - 2, by + 1, W[1]); p.set(x + w + 1, by + 1, W[1]);
    const fl = [P.red[3], P.gold[3], P.pink[3], WHITE, P.red[2], P.gold[4]];
    for (let i = -2; i < w + 2; i++) {
      const hh = hash2(i, by, x);
      p.set(x + i, by - 1, hh & 1 ? G[2] : G[3]); if ((hh & 6) !== 0) p.set(x + i, by - 2, hh & 8 ? G[3] : G[4]);
      if (i % 2 === 0) p.set(x + i, by - 2 - ((hh >> 4) & 1), fl[(hh >> 5) % fl.length]);
    }
    p.px([x - 2, by + 3, x + w, by + 3, x + w, by + 4], G[2]); p.set(x + w, by + 5, G[3]);
  }
}
function door(p: Px, x: number, y: number, w: number, h: number, ramp: Ramp = P.tan, arch = true): void {
  p.rect(x - 2, y - 2, w + 4, h + 2, W[0]); p.rect(x - 2, y - 2, w + 4, 1, W[2]); p.rect(x - 2, y - 1, 1, h + 1, W[2]);
  p.rect(x, y, w, h, MARK2); planks(p, x, y, w, h, { ramp, pw: 4, vertical: true, seed: x, mark: MARK2, worn: 0.7 });
  if (arch) { p.px([x, y, x + 1, y, x, y + 1, x + w - 1, y, x + w - 2, y, x + w - 1, y + 1], W[0]); p.px([x + 2, y, x + 1, y + 1, x, y + 2], W[1]); }
  band(p, x, y + 4, w - 3, 2); band(p, x, y + h - 6, w - 3, 2);
  p.rect(x + w - 4, y + (h >> 1) - 1, 2, 3, P.gold[2]); p.set(x + w - 4, y + (h >> 1) - 1, P.gold[4]); p.set(x + w - 3, y + (h >> 1) + 1, P.gold[1]);
  // Schwelle
  p.rect(x - 3, y + h, w + 6, 2, S[3]); p.rect(x - 3, y + h, w + 6, 1, S[4]); p.rect(x - 3, y + h + 2, w + 6, 1, S[1]); p.set(x + 2, y + h + 1, S[2]); p.set(x + w, y + h + 1, S[2]);
}
function foundation(p: Px, x: number, y: number, w: number, h: number, seed: number): void {
  masonry(p, x, y, w, h, { bh: 3, bw: 6, seed, rough: 0.7 }); p.rect(x, y + h - 1, w, 1, S[0]);
  moss(p, (xx, yy) => (yy >= y && yy < y + h && (xx < x + 12 || xx > x + w - 9) ? 0.4 : 0), seed);
}
function chimney(p: Px, x: number, y: number, w: number, h: number, seed: number): void {
  masonry(p, x, y, w, h, { bh: 4, bw: 5, seed, rough: 0.5 });
  shadeArea(p, (xx, yy) => xx >= x + w - 2 && xx < x + w && yy >= y && yy < y + h, SHADE, 0.35);
  p.rect(x - 1, y, w + 2, 3, S[3]); p.rect(x - 1, y, w + 2, 1, S[4]); p.rect(x - 1, y + 2, w + 2, 1, S[1]); p.rect(x + 1, y - 1, w - 2, 1, S[1]); p.rect(x + 2, y - 1, w - 4, 1, P.ash[0]);
}
function eave(p: Px, x0: number, x1: number, y: number, R: Ramp, tw = 5): void {
  for (let x = x0; x <= x1; x++) { const m = (x - x0) % tw; p.set(x, y, m === tw - 1 ? R[0] : R[3]); p.set(x, y + 1, m === tw - 1 ? R[0] : R[1]); }
  p.rect(x0 + 2, y + 2, x1 - x0 - 3, 1, W[0]);
}
function wallShadow(p: Px, x0: number, x1: number, y: number, n = 4): void {
  shadeArea(p, (x, yy) => x >= x0 && x <= x1 && yy >= y && yy < y + n - (((x * 7) >> 2) & 1), SHADE, 0.34);
  shadeArea(p, (x, yy) => x >= x0 && x <= x1 && yy >= y + n - 1 && yy < y + n + 2, SHADE, 0.14);
}
function lantern(p: Px, x: number, y: number): void {
  p.px([x, y, x + 1, y], P.steel[1]); p.rect(x - 1, y + 1, 4, 1, P.steel[2]); p.rect(x, y + 2, 2, 3, P.gold[3]); p.set(x, y + 2, P.gold[4]); p.set(x + 1, y + 4, P.fire[2]);
  p.rect(x - 1, y + 2, 1, 3, P.steel[1]); p.rect(x + 2, y + 2, 1, 3, P.steel[0]); p.rect(x - 1, y + 5, 4, 1, P.steel[1]);
}

// ---------------------------------------------------------------- Haus A: rotes Ziegeldach, Schornstein, Blumenkästen
function houseA(p: Px): void {
  plaster(p, 10, 56, 60, 38, 1);
  hbeam(p, 10, 56, 60); hbeam(p, 10, 82, 22); hbeam(p, 48, 82, 22); hbeam(p, 10, 90, 60);
  for (const x of [10, 29, 48, 67]) vbeam(p, x, 56, 37);
  brace(p, 14, 89, 20, 85); brace(p, 26, 89, 21, 85); brace(p, 52, 89, 58, 85); brace(p, 65, 89, 59, 85);
  foundation(p, 9, 93, 62, 6, 5);
  win(p, 15, 65, 11, 11, { box: true, curtain: true }); win(p, 54, 65, 11, 11, { box: true, curtain: true });
  door(p, 34, 71, 12, 23); hbeam(p, 31, 66, 18, 2);
  lantern(p, 49, 70);
  // Dach
  part(p, (l) => {
    l.poly([[13, 10], [67, 10], [77, 56], [3, 56]], MARK); roofTiles(l, ROOF_RED, 10, 46, 11);
    moss(l, (x, y) => (y > 44 && x < 26 ? 0.34 : y < 18 && x > 60 ? 0.2 : 0), 3);
    // First
    for (let x = 12; x <= 67; x++) { const m = (x - 12) % 6; l.set(x, 8, m === 5 ? ROOF_RED[1] : ROOF_RED[4]); l.set(x, 9, m === 5 ? ROOF_RED[0] : ROOF_RED[3]); l.set(x, 10, ROOF_RED[1]); }
    // Ortgang
    l.line(12, 9, 2, 56, W[1], 2); l.line(12, 9, 2, 56, W[2]); l.line(67, 9, 77, 56, W[0], 2); l.line(67, 9, 77, 56, W[1]);
    eave(l, 3, 77, 56, ROOF_RED);
    // Gaube
    shadeArea(l, (x, y) => x >= 47 && x <= 52 && y >= 26 + (x - 47) && y <= 44, SHADE, 0.35);
    plaster(l, 33, 30, 14, 14, 2); vbeam(l, 33, 30, 14, 2); vbeam(l, 45, 30, 14, 2); hbeam(l, 33, 42, 14, 2);
    win(l, 37, 33, 6, 7, { panes: 2 });
    l.poly([[40, 19], [51, 32], [29, 32]], MARK2); roofTiles(l, ROOF_RED, 19, 13, 12, 3, 4, MARK2);
    l.line(40, 18, 28, 32, ROOF_RED[4]); l.line(40, 18, 52, 32, ROOF_RED[1]); l.rect(29, 32, 23, 1, ROOF_RED[0]);
    chimney(l, 58, 6, 8, 20, 9);
    shadeArea(l, (x, y) => x >= 66 && x <= 69 && y >= 12 && y <= 28, SHADE, 0.3);
  });
  wallShadow(p, 10, 69, 59);
}

// ---------------------------------------------------------------- Haus B: Reetdach, Rundfenster, Gelehrtenwerkstatt
function houseB(p: Px): void {
  // seitlicher Feldsteinkamin
  part(p, (l) => { chimney(l, 66, 18, 9, 80, 14); moss(l, (x, y) => (y > 84 ? 0.4 : 0), 6); });
  plaster(p, 12, 54, 56, 40, 3);
  hbeam(p, 12, 54, 56); hbeam(p, 12, 90, 56); hbeam(p, 12, 84, 30, 2);
  for (const x of [12, 41, 65]) vbeam(p, x, 54, 37);
  brace(p, 44, 60, 49, 54); brace(p, 62, 60, 57, 54);
  foundation(p, 11, 93, 58, 6, 7);
  // Werkstattfenster mit vielen Scheiben, Bücher auf dem Sims
  win(p, 18, 63, 19, 14, { panes: 4 });
  p.rect(16, 79, 23, 2, W[3]); p.rect(16, 81, 23, 1, W[0]);
  for (const [x, c, h] of [[18, P.red, 4], [20, P.blue, 5], [22, P.gold, 3], [24, P.violet, 5], [27, P.teal, 4]] as const) { p.rect(x, 79 - h, 2, h, c[2]); p.rect(x, 79 - h, 1, h, c[3]); p.set(x, 79 - h + 1, P.gold[4]); }
  p.rect(31, 77, 5, 2, C[4]); p.rect(31, 78, 5, 1, C[2]); p.set(36, 77, P.red[2]); // aufgeschlagenes Buch
  door(p, 47, 69, 12, 25, [W[0], W[1], W[2], W[3], W[4]]);
  p.ell(53, 75.5, 2, 2, P.blue[1]); p.px([52, 75, 53, 74], P.ice[3]); p.set(54, 76, P.gold[2]); // Türfenster
  lantern(p, 43, 66);
  // Dach: breites Reet mit Giebelwand
  part(p, (l) => {
    l.poly([[40, 3], [80, 58], [0, 58]], MARK);
    thatch(l, STRAW, 21);
    // Giebelwand
    l.poly([[40, 21], [64, 56], [16, 56]], MARK2);
    texFill(l, MARK2, (x, y) => { const n = rnd2(x, y, 9); return n < 0.05 ? C[2] : n > 0.93 ? C[4] : C[3]; });
    shadeArea(l, (x, y) => y >= 21 && y < 56 && l.get(x, y) !== 0 && Math.abs(x - 40) > (y - 21) * 0.69 - 3.2 && Math.abs(x - 40) < (y - 21) * 0.69 + 0.5, SHADE, 0.32);
    l.line(40, 21, 16, 56, W[1], 2); l.line(40, 21, 64, 56, W[1], 2); l.line(40, 20, 15, 56, W[2]); l.line(41, 21, 65, 56, W[0]);
    hbeam(l, 17, 54, 47, 3); hbeam(l, 26, 44, 29, 2); vbeam(l, 39, 22, 23, 2);
    // Rundfenster
    l.ell(40, 36, 5.6, 5.6, W[0]); l.ell(40, 36, 4.6, 4.6, W[2]); l.ell(40, 36, 3.6, 3.6, mix(P.blue[1], P.steel[1], 0.4)); l.ell(39, 35, 2, 2, mix(P.blue[2], P.steel[2], 0.4));
    l.px([38, 34, 39, 33], P.ice[3]); l.rect(40, 32, 1, 8, W[1]); l.rect(36, 36, 8, 1, W[1]);
    // First: Strohwulst und Windbretter
    l.line(40, 2, 46, 10, STRAW[4], 2); l.line(39, 2, 33, 10, STRAW[3], 2); l.px([39, 1, 40, 1, 40, 0], W[1]); l.line(37, 0, 43, 6, W[2]); l.line(43, 0, 37, 6, W[1]);
    // Traufkante: herabhängende Halme
    for (let x = 1; x < 80; x++) if (hash2(x, 0, 5) % 3 !== 0) l.set(x, 58, STRAW[x % 4 === 0 ? 3 : 1]);
    for (let x = 2; x < 79; x += 2) if (hash2(x, 1, 5) & 1) l.set(x, 59, STRAW[1]);
    moss(l, (x, y) => (y > 40 && x < 14 + (y - 40) * 0.2 ? 0.4 : y > 46 && x > 70 ? 0.3 : 0), 8);
  });
  wallShadow(p, 12, 65, 60);
  // Bücherstapel und Fernrohr neben der Tür
  part(p, (l) => {
    for (const [y, c, w] of [[96, P.red, 7], [94, P.teal, 6], [92, P.gold, 7]] as const) { l.rect(64, y, w, 2, c[2]); l.rect(64, y, w, 1, c[3]); l.rect(64 + w - 1, y, 1, 2, C[4]); }
    // Fernrohr auf Dreibein
    l.line(73, 97, 75, 88, W[2]); l.line(78, 97, 76, 88, W[1]); l.line(75, 97, 75, 89, W[0]);
    l.line(70, 89, 79, 83, P.gold[2], 2); l.line(70, 89, 79, 83, P.gold[3]); l.px([79, 82, 79, 83], P.gold[4]); l.px([70, 90, 69, 90], P.gold[1]); l.set(78, 82, WHITE);
  });
}

// ---------------------------------------------------------------- Haus C: Schieferdach mit Zwerchgiebel, Steinsockel, Aushängeschild
function houseC(p: Px): void {
  // Hauptwand
  plaster(p, 12, 54, 58, 22, 5);
  hbeam(p, 12, 54, 58); hbeam(p, 12, 73, 58);
  for (const x of [38, 53, 67]) vbeam(p, x, 54, 20);
  p.rect(12, 76, 58, 18, MARK); masonry(p, 12, 76, 58, 18, { bh: 4, bw: 7, seed: 31, rough: 0.7, mark: MARK });
  foundation(p, 11, 93, 60, 6, 9);
  win(p, 57, 59, 8, 10, { shutters: 1, curtain: true });
  // Tür mit Steinbogen
  p.rect(40, 68, 18, 26, S[1]);
  for (let k = 0; k < 7; k++) { const a = Math.PI * (k / 6), x = 49 - Math.cos(a) * 8, y = 76 - Math.sin(a) * 8; p.rect(Math.round(x) - 1, Math.round(y) - 1, 3, 3, k % 2 ? S[3] : S[2]); p.set(Math.round(x) - 1, Math.round(y) - 1, S[4]); }
  p.rect(40, 78, 3, 16, S[2]); p.rect(40, 78, 1, 16, S[3]); p.rect(55, 78, 3, 16, S[2]); p.rect(57, 78, 1, 16, S[1]); p.px([40, 83, 41, 83, 55, 87, 56, 87], S[0]);
  door(p, 44, 72, 10, 22, [mix(W[0], P.teal[0], 0.3), mix(W[1], P.teal[1], 0.5), mix(W[2], P.teal[2], 0.5), mix(W[3], P.teal[3], 0.45), mix(W[4], P.teal[4], 0.4)]);
  // Hauptdach
  part(p, (l) => {
    l.poly([[28, 14], [70, 14], [78, 54], [20, 54]], MARK); roofTiles(l, ROOF_SLATE, 14, 40, 41, 4, 4);
    for (let x = 28; x <= 70; x++) { const m = (x - 28) % 5; l.set(x, 12, m === 4 ? ROOF_SLATE[1] : ROOF_SLATE[4]); l.set(x, 13, m === 4 ? ROOF_SLATE[0] : ROOF_SLATE[3]); }
    l.line(70, 13, 78, 54, W[0], 2); l.line(70, 13, 78, 54, W[1]);
    eave(l, 22, 78, 54, ROOF_SLATE, 4);
    chimney(l, 60, 4, 7, 18, 19);
    shadeArea(l, (x, y) => x >= 67 && x <= 69 && y >= 12 && y <= 24, SHADE, 0.3);
    moss(l, (x, y) => (y > 44 && x > 62 ? 0.3 : 0), 12);
  });
  wallShadow(p, 38, 69, 57);
  // vorspringender Zwerchgiebel links
  part(p, (l) => {
    plaster(l, 6, 46, 32, 30, 6);
    hbeam(l, 6, 73, 32); hbeam(l, 5, 58, 34); vbeam(l, 6, 46, 28); vbeam(l, 35, 46, 28); brace(l, 10, 72, 15, 62); brace(l, 32, 72, 27, 62);
    l.rect(8, 76, 28, 18, MARK); masonry(l, 8, 76, 28, 18, { bh: 4, bw: 7, seed: 33, rough: 0.7, mark: MARK });
    l.rect(6, 76, 2, 2, W[0]); l.rect(36, 76, 2, 2, W[0]); // Balkenköpfe der Auskragung
    win(l, 17, 62, 9, 9, { shutters: 1, curtain: true });
    win(l, 16, 80, 11, 9, { panes: 3 });
    foundation(l, 7, 93, 30, 6, 10);
    // Giebeldreieck
    l.poly([[22, 12], [42, 50], [2, 50]], MARK2);
    texFill(l, MARK2, (x, y) => { const n = rnd2(x, y, 9); return n < 0.05 ? C[2] : n > 0.93 ? C[4] : C[3]; });
    vbeam(l, 21, 30, 20, 2); hbeam(l, 12, 40, 21, 2); win(l, 19, 30, 6, 7);
    // Schieferflächen des Giebels (schmale Streifen links/rechts, von schräg oben gesehen)
    l.poly([[22, 6], [26, 6], [46, 48], [41, 50]], MARK); l.poly([[22, 6], [18, 6], [-2, 48], [3, 50]], MARK);
    roofTiles(l, ROOF_SLATE, 6, 44, 43, 4, 4);
    shadeArea(l, (x, y) => x > 22 && y < 51 && l.get(x, y) !== 0 && x - 22 > (y - 6) * 0.42, SHADE, 0.25);
    l.line(22, 6, 2, 50, ROOF_SLATE[4]); l.line(22, 11, 42, 50, W[0]); l.line(21, 11, 2, 50, W[0]);
    l.px([21, 5, 22, 4, 23, 5, 22, 3], ROOF_SLATE[3]); l.set(22, 2, P.gold[3]);
    shadeArea(l, (x, y) => y >= 46 && y < 50 && x >= 6 && x <= 37 && l.get(x, y) !== 0 && false, SHADE, 0.3);
  });
  shadeArea(p, (x, y) => x >= 7 && x <= 37 && y >= 51 && y < 55, SHADE, 0.3);
  shadeArea(p, (x, y) => x >= 38 && x <= 41 && y >= 57 && y < 94, SHADE, 0.22);
  // Aushängeschild an schmiedeeisernem Arm
  part(p, (l) => {
    l.rect(60, 73, 13, 1, P.steel[1]); l.line(61, 79, 67, 74, P.steel[1]); l.set(73, 74, P.steel[2]); l.px([64, 74, 70, 74, 64, 75, 70, 75], P.steel[0]);
    l.rect(62, 76, 11, 10, W[2]); l.rect(62, 76, 11, 1, W[3]); l.rect(62, 85, 11, 1, W[0]); l.rect(62, 76, 1, 10, W[3]); l.rect(72, 76, 1, 10, W[1]);
    // Emblem: goldener Krug
    l.rect(65, 79, 4, 5, P.gold[3]); l.rect(65, 79, 4, 1, WHITE); l.rect(65, 80, 1, 4, P.gold[4]); l.rect(68, 80, 1, 4, P.gold[2]); l.px([69, 80, 70, 81, 70, 82, 69, 83], P.gold[2]);
  });
}

export function gwHouses(out: Frames): void {
  one(out, 'house_a', 80, 100, houseA);
  one(out, 'house_b', 80, 100, houseB);
  one(out, 'house_c', 80, 100, houseC);
}
void inkOutline; void band;
export type { Pt };
