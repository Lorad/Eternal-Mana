/** Frostgebirge – Eis und Schnee: Eiszacken, Kristall, Schneefelsen, Schneemann, Wehe, Eiszapfen-Stamm, Riss, Eisstatue. */
import { Px, resample } from '../draw';
import { Frames, INK, MARK, P, Ramp, WHITE, alpha, boulder, glow, mix, part, rings, rnd2, texFill, vnoise } from './kit';
import { jag, prism, twinkle } from './kr_kit';
import { FROCK, FWOOD, ICE, SNOW, fAnim, fOne, fOutline, icicles, mound, snowCap } from './fr_kit';

function iceSpike(p: Px): void {
  prism(p, 11.5, 27, 13.5, 12, 2.3, ICE, { seed: 2 }); prism(p, 4.5, 27, 2.5, 15, 2, ICE, { seed: 3 });
  prism(p, 8, 27, 7.5, 1, 3.7, ICE, { seed: 1 });
  p.line(8, 9, 9, 15, ICE[5]); p.set(8, 17, ICE[5]); p.set(6, 6, WHITE);
  mound(p, 8, 28, 7.6, 3.4, 4);
}
function iceSpikeL(p: Px): void {
  prism(p, 21, 47, 25, 14, 3.8, ICE, { seed: 7 }); prism(p, 6, 47, 3, 21, 3.3, ICE, { seed: 8 });
  prism(p, 13.5, 47, 12, 1, 5.6, ICE, { seed: 6 });
  part(p, (l) => { prism(l, 9, 47, 7, 33, 2.5, ICE, { seed: 9 }); prism(l, 18, 47, 19.5, 36, 2.3, ICE, { seed: 10 }); });
  // eingeschlossene Risse und Reif
  p.line(13, 12, 15, 22, ICE[5]); p.line(15, 22, 14, 28, ICE[4]); p.px([11, 30, 12, 31, 16, 17], ICE[5]); p.set(10, 8, WHITE); p.set(24, 19, WHITE);
  mound(p, 14, 48, 13.4, 4.8, 5); mound(p, 5, 48, 4, 3, 11);
}
const CRY: Ramp = [ICE[1], mix(ICE[2], P.teal[2], 0.25), mix(ICE[3], P.teal[3], 0.25), ICE[4], mix(ICE[5], WHITE, 0.4), WHITE];
function iceCrystal(p: Px, f: number): void {
  prism(p, 5, 24, 2.5, 11, 2.5, CRY, { seed: 5, lift: f === 3 ? 1 : 0 }); prism(p, 15.5, 24, 17.5, 9, 2.6, CRY, { seed: 6, lift: f === 1 ? 1 : 0 });
  prism(p, 10, 24, 10, 2, 4, CRY, { seed: 4, lift: f === 2 ? 1 : 0 });
  part(p, (l) => prism(l, 7.5, 24, 6.5, 16, 1.8, CRY, { seed: 3 }));
  // wandernder Glanzstreifen auf dem Hauptprisma
  const gy = [18, 13, 8, 4][f];
  for (let i = 0; i < 3; i++) if (p.get(8 + i, gy - i) >>> 24) p.set(8 + i, gy - i, WHITE);
  mound(p, 10, 26, 8.4, 2.6, 6);
  fOutline(p);
  const [tx, ty] = [[9, 6], [17, 11], [11, 3], [3, 13]][f];
  twinkle(p, tx, ty, P.ice[3], f % 2 === 0);
  glow(p, 10, 13, 10.5, P.ice[2], 30 + (f & 1) * 8);
}
function snowRock(p: Px): void {
  boulder(p, 12, 18, 22, 13, { ramp: FROCK, seed: 4, cracks: 1 });
  snowCap(p, (x) => 3.6 - Math.abs(x - 11) * 0.16, { raise: 1, seed: 2 });
  p.px([5, 13, 16, 12], FROCK[4]);
}
function snowRockL(p: Px): void {
  boulder(p, 20, 28, 33, 22, { ramp: FROCK, seed: 9, cracks: 2 });
  snowCap(p, (x) => 5 - Math.abs(x - 18) * 0.18, { raise: 1, seed: 3 });
  part(p, (l) => { boulder(l, 9, 28, 14, 10, { ramp: FROCK, seed: 12, cracks: 0 }); snowCap(l, 2.4, { raise: 1, seed: 5 }); }, false);
  icicles(p, 24, 33, (x) => 14 + Math.round(Math.abs(x - 28) * 0.3), 6, 5, 3);
  mound(p, 31, 28, 5, 2.4, 14);
}
function snowman(p: Px): void {
  const S = SNOW;
  p.line(4, 12, 1, 8, FWOOD[2]); p.px([1, 7, 0, 9], FWOOD[2]); p.line(14, 12, 17, 9, FWOOD[1]); p.px([17, 8, 16, 8], FWOOD[1]);
  p.ball(9, 19.6, 6.6, 6, S, 1, 4); p.ball(9, 11.5, 4.8, 4.4, S, 1, 4); p.ball(9.2, 5.8, 3.5, 3.3, S, 1, 4);
  p.px([4, 24, 5, 25, 13, 25, 14, 24], S[1]);
  // Schal, Kohleaugen, Möhre, Knöpfe, Topfhut
  p.rect(6, 8, 7, 1, P.red[2]); p.px([6, 8, 7, 8], P.red[3]); p.rect(12, 9, 2, 3, P.red[2]); p.set(13, 11, P.red[1]); p.set(12, 12, P.red[1]);
  p.set(9, 5, INK); p.set(11, 5, INK); p.rect(11, 6, 3, 1, P.fire[2]); p.set(13, 6, P.fire[1]); p.set(11, 6, P.fire[3]); p.px([9, 7, 10, 7], S[1]);
  p.px([10, 11, 10, 13, 10, 17, 10, 20], P.ash[1]);
  p.rect(7, 0, 5, 3, P.steel[1]); p.rect(7, 0, 5, 1, P.steel[3]); p.rect(6, 3, 7, 1, P.steel[2]); p.set(11, 1, P.steel[0]); p.set(7, 1, P.steel[2]);
}
function snowdrift(p: Px): void {
  mound(p, 10.5, 10, 10.6, 7.2, 3); mound(p, 17, 10, 7, 4.8, 5);
  // windgeformter Grat und dürre Halme
  for (let x = 4; x < 15; x++) p.set(x, 5 + Math.round((x - 4) * 0.28), SNOW[x < 9 ? 2 : 1]);
  p.line(3, 9, 2, 5, P.tan[2]); p.line(5, 9, 6, 6, P.tan[1]); p.set(2, 4, P.tan[3]);
  fOutline(p, true);
}
function icicleLog(p: Px): void {
  const B = FWOOD;
  p.rect(6, 6, 29, 9, MARK); p.ell(35, 10.5, 2.4, 4.5, MARK);
  texFill(p, MARK, (x, y) => {
    let t = [3, 3, 2, 2, 2, 1, 1, 0, 0][y - 6] ?? 1;
    const g = rnd2((x + (y & 1) * 3) >> 2, y, 7);
    if (g < 0.2) t--; else if (g > 0.86) t++;
    return B[Math.max(0, Math.min(4, t))];
  });
  p.line(22, 6, 24, 2, B[2]); p.line(23, 6, 25, 2, B[1]); p.set(24, 1, B[3]);
  p.ell(6, 10.5, 3.2, 4.6, B[1]); rings(p, 6, 10.5, 2.4, 3.8, P.tan, 3);
  snowCap(p, (x) => (x < 4 ? 1 : 3), { raise: 1, seed: 4 });
  icicles(p, 9, 34, (x) => 8 + ((x * 7) % 3 === 0 ? 1 : 0), 3, 6, 3);
  mound(p, 4, 18, 4, 2.6, 2); mound(p, 20, 18, 6, 2.2, 5); mound(p, 34, 18, 5, 3, 8);
}
function iceCrack(p: Px): void {
  const DEEP = mix(P.ice[0], P.blue[0], 0.5);
  for (let y = 0; y < 14; y++) for (let x = 0; x < 24; x++) {
    const d = Math.hypot((x + 0.5 - 12) / 11.6, (y + 0.5 - 7) / 6.6) + (vnoise(x * 0.4, y * 0.4, 3) - 0.5) * 0.3;
    if (d < 1) p.set(x, y, alpha(P.ice[4], d < 0.6 ? 80 : 44));
  }
  [[1, 4], [6, 13], [16, 13], [23, 9], [19, 1], [9, 0]].forEach(([ex, ey], k) => {
    const pts = resample(jag([12, 7], [ex, ey], 1.5, 20 + k, 3));
    pts.forEach(([x, y], i) => { const t = i / pts.length; p.blend(x, y + 1, alpha(WHITE, t > 0.7 ? 110 : 180)); });
    pts.forEach(([x, y], i) => { const t = i / pts.length; p.set(x, y, alpha(DEEP, t > 0.75 ? 170 : 240)); });
  });
  for (const [a, b] of [[[7, 5], [5, 1]], [[17, 10], [21, 13]], [[15, 4], [13, 1]]] as const) for (const [x, y] of resample(jag(a, b, 0.8, 5, 2))) p.set(x, y, alpha(DEEP, 190));
  p.ell(12, 7.5, 1.7, 1.2, DEEP); p.px([10, 6, 14, 9], alpha(WHITE, 220));
}
function frozenStatue(p: Px): void {
  // Wanderer mit Kapuze, Rucksack und Stab – im Eisblock erstarrt
  const fig = new Px(p.w, p.h), C = P.red, T = P.tan, K = P.wood;
  fig.rect(7, 30, 2, 6, K[1]); fig.rect(11, 30, 2, 6, K[1]); fig.rect(6, 35, 3, 2, K[0]); fig.rect(11, 35, 3, 2, K[0]);
  fig.rect(13, 18, 3, 8, T[1]); fig.rect(13, 18, 3, 1, T[3]); fig.rect(13, 16, 3, 2, P.cream[2]);
  fig.poly([[6, 17], [14, 17], [15, 31], [5, 31]], C[1]); fig.rect(6, 18, 3, 12, C[2]); fig.rect(9, 24, 1, 7, C[0]); fig.rect(12, 20, 1, 10, C[0]);
  fig.ell(10, 13.5, 3.4, 3.6, C[1]); fig.ell(9.5, 12.8, 2.4, 2.4, C[2]); fig.rect(8, 13, 4, 3, P.skin[2]); fig.px([9, 14, 11, 14], INK); fig.rect(8, 16, 4, 1, P.cream[3]);
  fig.line(6, 20, 3, 15, C[2]); fig.rect(3, 14, 2, 2, P.skin[2]); fig.line(3, 6, 3, 36, K[2]); fig.px([3, 5, 4, 5, 2, 6], K[3]);
  fig.outline(); fig.tint(ICE[2], 0.52);
  p.poly([[4, 7], [9, 2], [15, 4], [18, 11], [18.5, 35], [16, 39], [3, 39], [1, 34], [1.5, 13]], MARK);
  texFill(p, MARK, (x, y) => {
    const u = x - (y < 12 ? (12 - y) * 0.3 : 0);
    let t = u < 5 ? 4 : u < 14 ? 3 : 2;
    if (y < 8 - (x - 9) * 0.3 && x > 5) t = 5;                         // Deckfläche
    if (y > 34) t--;
    if (rnd2(x >> 1, y >> 2, 6) > 0.86) t++;
    return ICE[Math.max(1, Math.min(5, t))];
  });
  p.draw(fig);
  // Lichtstreifen im Eis laufen über die Figur hinweg
  for (const [x0, y0, n] of [[4, 22, 9], [9, 34, 7], [12, 14, 5], [15, 26, 4]] as const) for (let i = 0; i < n; i++) { const x = x0 + i * 0.5, y = y0 - i; if (p.get(x, y) >>> 24) p.set(x, y, mix(p.get(Math.floor(x), y), WHITE, 0.6)); }
  p.line(5, 9, 2, 14, ICE[5]); p.line(2, 14, 2, 30, ICE[5]); p.line(15, 5, 18, 11, ICE[4]); p.px([6, 8, 3, 16], WHITE);
  for (const [x, y] of resample(jag([14, 12], [16, 27], 1.2, 4, 3))) p.set(x, y, ICE[5]);
  snowCap(p, (x) => 2.6 - Math.abs(x - 10) * 0.1, { raise: 1, seed: 9, y1: 12 });
  icicles(p, 15, 18, 12, 3, 4, 2);
  mound(p, 5, 40, 5, 3, 3); mound(p, 15, 40, 4.6, 2.4, 4);
}

export function frNature(out: Frames): void {
  fOne(out, 'ice_spike', 16, 28, iceSpike);
  fOne(out, 'ice_spike_l', 28, 48, iceSpikeL);
  fAnim(out, 'ice_crystal', 4, 20, 26, iceCrystal, false);
  fOne(out, 'snow_rock', 24, 18, snowRock);
  fOne(out, 'snow_rock_l', 38, 28, snowRockL);
  fOne(out, 'snowman', 18, 26, snowman);
  fOne(out, 'snowdrift', 24, 10, snowdrift, false);
  fOne(out, 'icicle_log', 40, 18, icicleLog);
  fOne(out, 'ice_crack', 24, 14, iceCrack, false);
  fOne(out, 'frozen_statue', 20, 40, frozenStatue);
}
