/** Glutlande – Natur (v2): verkohlte Bäume, Basalt, Lavabrocken, Obsidian, Gebeine, Fumarolen, Feuergeysir, Risse. */
import { Px, Pt, bez } from '../draw';
import { Frames, INK, MARK, P, Ramp, WHITE, alpha, anim, barkFill, boulder, clamp, glow, hash2, inkOutline, limb, mix, one, part, rnd2, shadeArea, vnoise } from './kit';
import { jag, prism, puff, vein } from './kr_kit';
import { resample } from '../draw';

const A = P.ash, F = P.fire, SN = P.stone, B = P.bone;
/** Glut (6): dunkelrot → weißgelb */
export const HOT: Ramp = [P.red[0], F[0], F[1], F[2], F[3], F[4]];
/** Verkohltes Holz (5) */
export const CHAR: Ramp = [mix(A[0], INK, 0.35), A[1], mix(A[2], P.steel[0], 0.2), mix(A[3], P.steel[1], 0.25), mix(A[4], SN[3], 0.4)];
/** Basalt (7): dunkel → Lichtkante, kühl-anthrazit */
export const BASALT: Ramp = [mix(A[0], INK, 0.3), A[1], mix(A[2], P.steel[0], 0.35), mix(A[3], P.steel[1], 0.45), mix(A[4], P.steel[2], 0.45), mix(SN[3], P.steel[3], 0.4), mix(SN[4], P.steel[4], 0.35)];
export const BASALT5: Ramp = [BASALT[0], BASALT[1], BASALT[2], BASALT[3], BASALT[5]];
/** Asche (5), passend zum Boden */
export const ASH: Ramp = [A[2], A[3], A[4], mix(A[4], P.cream[1], 0.55), mix(P.cream[1], P.cream[2], 0.5)];
/** Obsidian (6): glasig schwarz, warmer Gegenschein, kalte Lichtkanten */
const OBS: Ramp = [mix(INK, P.shadow[0], 0.5), P.shadow[1], mix(P.shadow[3], P.red[1], 0.3), mix(P.violet[2], P.steel[2], 0.55), mix(P.steel[4], P.violet[4], 0.3), WHITE];
const SHADE = P.shadow[1];

/** Glimmende Punkte, die an (x,y) aufsteigen (Alpha) – Funken. */
function sparks(p: Px, pts: ReadonlyArray<readonly [number, number, number]>): void {
  for (const [x, y, lv] of pts) p.blend(x, y, alpha(HOT[clamp(3 + lv, 2, 5)], lv > 0 ? 255 : 190));
}

// ---------------------------------------------------------------- Verkohltes Holz
function deadTree(p: Px): void {
  limb(p, bez([22, 59], [19, 46], [24, 32]), 5.4, 3.8);
  limb(p, bez([19, 56], [13, 59], [8, 62]), 3, 1.2); limb(p, bez([25, 56], [31, 59], [37, 62]), 3, 1.2); limb(p, [[22, 58], [22, 62]], 3, 2);
  limb(p, bez([23, 35], [15, 29], [7, 25]), 3, 1.3); limb(p, bez([10, 26], [6, 21], [7, 13]), 1.2, 0.5); limb(p, bez([14, 29], [10, 32], [4, 32]), 1, 0.5); limb(p, bez([8, 19], [5, 17], [2, 17]), 0.6, 0.5);
  limb(p, bez([24, 34], [32, 28], [36, 14]), 3, 1); limb(p, bez([34, 21], [39, 19], [42, 11]), 1.1, 0.5); limb(p, bez([31, 28], [37, 30], [41, 27]), 1, 0.5); limb(p, bez([36, 16], [33, 11], [34, 6]), 0.7, 0.5);
  limb(p, bez([24, 33], [21, 23], [24, 12]), 2.8, 1.4); limb(p, bez([23, 20], [19, 13], [17, 5]), 1, 0.5);
  // abgebrochener Wipfel: gezackte Bruchkante
  p.poly([[22, 13], [22, 8], [23, 11], [24, 6], [25, 10], [26, 8], [26, 13]], MARK);
  // Aststumpf rechts am Stamm
  limb(p, [[25, 45], [30, 42]], 1.8, 1.2);
  barkFill(p, CHAR, 71, MARK, 3);
  // Schuppige Holzkohle: Querrisse und helle Aschekanten
  for (let k = 0; k < 16; k++) { const y = 34 + k * 1.5 + (hash2(k, 1, 5) % 2), x = 18 + (hash2(k, 2, 5) % 8); if (p.get(x, y) >>> 24 >= 200) { p.set(x, y, CHAR[0]); if (p.get(x + 1, y) >>> 24 >= 200) p.set(x + 1, y, CHAR[0]); if (p.get(x, y - 1) >>> 24 >= 200 && k % 2) p.set(x, y - 1, CHAR[4]); } }
  shadeArea(p, (x, y) => x > 24 && y > 30, SHADE, 0.3);
  p.set(30, 42, CHAR[4]); p.set(31, 41, HOT[2]); p.set(30, 41, HOT[4]);
  // Glutrisse: vom Wurzelansatz den Stamm hinauf, in die Hauptäste verzweigt
  vein(p, jag([21, 58], [20, 44], 1.3, 3), HOT, 0.75, 1); vein(p, jag([20, 44], [23, 34], 1.1, 4), HOT, 0.55, 2);
  vein(p, jag([24, 52], [25, 44], 0.8, 5, 2), HOT, 0.45, 3); vein(p, jag([23, 35], [15, 29], 0.6, 6, 2), HOT, 0.4, 4);
  vein(p, jag([25, 34], [32, 27], 0.6, 7, 2), HOT, 0.45, 5); vein(p, jag([24, 31], [23, 21], 0.6, 8, 2), HOT, 0.3, 6);
  vein(p, jag([19, 57], [12, 60], 0.5, 9, 2), HOT, 0.5, 7); vein(p, jag([25, 57], [31, 60], 0.5, 10, 2), HOT, 0.35, 8);
  // glimmende Bruchstellen
  p.px([24, 7, 22, 9], HOT[3]); p.set(24, 6, HOT[5]); p.px([7, 13, 42, 11, 2, 17, 34, 6, 17, 5], HOT[2]); p.px([4, 32, 41, 27], HOT[1]);
  inkOutline(p);
  glow(p, 21.5, 50, 10, F[1], 46); glow(p, 23, 36, 7, F[1], 30); glow(p, 24, 8, 4, F[2], 46);
  sparks(p, [[27, 3, 1], [20, 1, 0], [30, 9, 0], [14, 20, 0], [31, 38, 1], [12, 46, 0], [33, 50, 0]]);
}
function charredStump(p: Px): void {
  p.poly([[4, 7], [5, 3], [7, 6], [8, 2], [10, 5], [11, 1], [13, 4], [14, 7], [14, 11], [15, 14], [3, 14], [4, 11]], MARK);
  limb(p, [[4, 12], [1, 14]], 1.6, 1); limb(p, [[14, 12], [17, 14]], 1.6, 1); limb(p, [[9, 13], [9, 15]], 2, 1.4);
  barkFill(p, CHAR, 33, MARK, 3);
  shadeArea(p, (x, y) => x > 11 && y > 5, SHADE, 0.3);
  // glühender Hohlkern hinter der Bruchkante
  for (let x = 6; x < 13; x++) for (let y = 4; y < 8; y++) { const d = ((x + 0.5 - 9.5) / 3.4) ** 2 + ((y + 0.5 - 6.4) / 1.7) ** 2; if (d < 1 && p.get(x, y) >>> 24 >= 200) p.set(x, y, d < 0.25 ? HOT[5] : d < 0.6 ? HOT[4] : HOT[2]); }
  p.px([7, 7, 11, 7], HOT[1]); p.set(9, 5, HOT[4]);
  vein(p, jag([8, 8], [6, 13], 0.8, 3, 2), HOT, 0.5, 1); vein(p, jag([11, 8], [12, 13], 0.7, 4, 2), HOT, 0.3, 2);
  p.px([5, 3, 8, 2, 11, 1], CHAR[4]);
  inkOutline(p);
  glow(p, 9.5, 5.5, 6, F[2], 56);
  sparks(p, [[7, 0, 0], [13, 1, 1]]);
}
function scorchedBush(p: Px): void {
  const tw = (pts: Pt[], r0 = 0.8): void => limb(p, pts, r0, 0.5);
  tw(bez([10, 15], [9, 10], [6, 4]), 1.2); tw(bez([10, 15], [12, 9], [14, 2]), 1.2); tw(bez([9, 15], [5, 12], [1, 8])); tw(bez([11, 15], [15, 12], [18, 7]));
  tw(bez([8, 9], [5, 7], [3, 3])); tw(bez([12, 8], [15, 6], [17, 3])); tw(bez([5, 11], [3, 12], [1, 12])); tw(bez([15, 11], [17, 12], [19, 11])); tw(bez([10, 12], [10, 8], [10, 5]));
  for (let y = 0; y < 16; y++) for (let x = 0; x < 20; x++) if (p.get(x, y) === MARK) {
    const lit = p.get(x - 1, y) !== MARK && p.get(x, y - 1) !== MARK;
    p.set(x, y, lit ? CHAR[rnd2(x, y, 3) < 0.4 ? 4 : 3] : rnd2(x, y, 4) < 0.3 ? CHAR[1] : CHAR[2]);
  }
  // Dornen
  for (const [x, y, d] of [[7, 7, -1], [13, 6, 1], [4, 9, -1], [16, 9, 1], [9, 6, 1], [11, 10, -1], [5, 5, 1], [15, 4, -1], [3, 10, 1]] as const) if (p.get(x, y) >>> 24) p.set(x + d, y - 1, CHAR[3]);
  // glimmende Zweigspitzen
  p.px([6, 4, 14, 2, 17, 3], HOT[3]); p.px([1, 8, 18, 7, 10, 5], HOT[2]); p.set(14, 2, HOT[5]);
  p.rect(8, 15, 5, 1, CHAR[1]);
  inkOutline(p);
  glow(p, 14, 3, 3, F[2], 40); glow(p, 6, 4, 2.5, F[2], 34);
}

// ---------------------------------------------------------------- Basalt
/** Sechskantsäule in ¾-Sicht: helle Deckfläche, drei Mantelflächen, Querklüfte. x = linke Kante, bot exklusiv. */
function column(l: Px, x: number, w: number, top: number, bot: number, seed: number, R: Ramp = BASALT): void {
  const th = Math.max(3, Math.round(w * 0.44)), a = 0.27, b = 0.73;
  for (let px = x; px < x + w; px++) {
    const fx = (px - x + 0.5) / w, e = fx < a ? 1 - fx / a : fx > b ? (fx - b) / (1 - b) : 0;
    const y0 = Math.round(top + (th / 2) * e), yl = Math.round(top + th - (th / 2) * e), face = fx < a ? 0 : fx > b ? 2 : 1;
    for (let y = y0; y < bot; y++) {
      let tone: number;
      if (y < yl) {
        tone = 5; if (y === y0 && fx < 0.6) tone = 6; else if (y === yl - 1 && fx > 0.35) tone = 4;
        const cr = hash2(px, y, seed); if ((cr & 15) === 0) tone = 4; if (((px - x) * 2 + (y - top) * 3 + seed) % 11 === 0 && y > y0) tone = 3;      // Kluft in der Deckfläche
      } else {
        tone = [4, 3, 1][face];
        if (y === yl) tone += face === 2 ? 0 : 1;                                                   // Lichtkante unter der Deckfläche
        const k = Math.floor((y + (hash2(face, 1, seed) % 9)) / (5 + (hash2(face, 2, seed) % 4))), kr = hash2(k, face, seed + 3);
        const yy = (y + (hash2(face, 1, seed) % 9)) % (5 + (hash2(face, 2, seed) % 4));
        if (yy === 0 && (kr & 3) !== 0) tone -= 1; else if (yy === 1 && (kr & 3) !== 0 && face < 2) tone += 1;   // Querkluft mit Lichtsaum
        else if (((kr >> 4) & 7) === 0) tone -= 1;
        if (px === Math.round(x + w * a) || px === Math.round(x + w * b)) tone = Math.min(tone, face === 2 ? 0 : 2); // Säulenkanten
        if (px === Math.round(x + w * a) + 1 && face === 1 && (kr & 8)) tone += 1;
        if (rnd2(px, y, seed + 9) < 0.04) tone -= 1;
        if (bot - y <= 2) tone -= 1;
      }
      l.set(px, y, R[clamp(tone, 0, R.length - 1)]);
    }
  }
}
type Col = readonly [x: number, w: number, top: number, bot: number];
function columns(p: Px, cols: ReadonlyArray<Col>, seed: number): void {
  [...cols].map((c, k) => [c, k] as const).sort((a, b) => a[0][3] - b[0][3] || b[0][2] - a[0][2]).forEach(([c, k]) => {
    part(p, (l) => column(l, c[0], c[1], c[2], c[3], seed + k * 13));
    // Schlagschatten der vorderen Säule auf die hinteren entfällt (Engine); dafür Kontaktschatten rechts unten
  });
  // warmer Widerschein der Glut von unten
  shadeArea(p, (x, y) => y >= p.h - 6 && BASALT.includes(p.get(x, y)), F[0], 0.16);
}
function basaltColumn(p: Px): void {
  columns(p, [[6, 9, 1, 40], [12, 8, 10, 41], [0, 8, 15, 41], [4, 8, 26, 43], [11, 8, 31, 43], [17, 3, 37, 42]], 3);
  // Bruchstücke am Fuß
  part(p, (l) => { boulder(l, 2.5, 43, 5, 4, { ramp: BASALT5, seed: 3, cracks: 0 }); });
  p.px([8, 36, 9, 37], HOT[1]); p.set(8, 37, HOT[2]);
}
function basaltCluster(p: Px): void {
  columns(p, [
    [22, 9, 1, 34], [14, 9, 6, 35], [30, 9, 9, 35], [6, 9, 12, 35],
    [26, 8, 16, 37], [18, 9, 20, 37], [10, 8, 23, 37], [1, 8, 21, 36], [33, 7, 22, 37],
    [22, 8, 28, 39], [14, 8, 31, 39], [30, 8, 30, 39], [5, 9, 32, 39],
  ], 7);
  part(p, (l) => { boulder(l, 3, 39, 6, 4, { ramp: BASALT5, seed: 5, cracks: 0 }); boulder(l, 37, 39, 5, 3, { ramp: BASALT5, seed: 6, cracks: 0 }); });
  // Glut in einer Fuge
  p.px([21, 33, 21, 34, 22, 35], HOT[2]); p.set(21, 34, HOT[4]); p.px([13, 36, 29, 36], HOT[1]);
}

// ---------------------------------------------------------------- Lavabrocken & Obsidian
function lavaRock(p: Px, f: number): void {
  const heat = [0.25, 0.55, 0.9, 0.55][f];
  part(p, (l) => {
    boulder(l, 10, 19, 18, 17, { ramp: BASALT5, seed: 61, cracks: 0 });
    vein(l, jag([4, 9], [10, 13], 1, 3, 2), HOT, heat, 1); vein(l, jag([10, 13], [16, 8], 1, 4, 2), HOT, heat * 0.9, 2); vein(l, jag([10, 13], [9, 18], 0.8, 5, 2), HOT, heat * 0.8, 3);
    vein(l, jag([13, 4], [15, 9], 0.6, 6, 2), HOT, heat * 0.6, 4); vein(l, jag([5, 15], [2, 17], 0.5, 7, 2), HOT, heat * 0.5, 5);
    if (f === 2) { l.set(10, 13, HOT[5]); l.set(9, 13, HOT[5]); } else if (f !== 0) l.set(10, 13, HOT[4]);
  });
  part(p, (l) => { boulder(l, 18, 19, 7, 7, { ramp: BASALT5, seed: 63, cracks: 0 }); vein(l, jag([16, 15], [20, 17], 0.5, 8, 2), HOT, heat * 0.7, 6); });
  glow(p, 10, 12, 9 + (f === 2 ? 1 : 0), F[1], 24 + heat * 40);
  if (f === 2) sparks(p, [[12, 1, 0]]); else if (f === 3) sparks(p, [[13, 0, -1]]);
}
type Sh = readonly [bx: number, by: number, tx: number, ty: number, hw: number, sh?: number, skew?: number];
function obsidianSet(p: Px, back: ReadonlyArray<Sh>, rocks: ReadonlyArray<readonly [number, number, number, number]>, front: ReadonlyArray<Sh>): void {
  const sh = (s: Sh, k: number): void => { part(p, (l) => prism(l, s[0], s[1], s[2], s[3], s[4], OBS, { glass: true, clipY: p.h - 1, seed: k * 5 + 2, sh: s[5] ?? 0.5, skew: s[6] ?? 0 })); };
  back.forEach(sh);
  for (const [cx, w, h, seed] of rocks) part(p, (l) => boulder(l, cx, p.h - 1, w, h, { ramp: BASALT5, seed, flat: true, cracks: 0 }));
  front.forEach((s, k) => sh(s, k + back.length));
  // Glutschein von rechts unten auf den Schattenflächen
  shadeArea(p, (x, y) => y >= p.h - 9 && p.get(x, y) === OBS[0], P.red[0], 0.5);
}
function obsidian(p: Px): void {
  obsidianSet(p, [[9, 24, 8.5, 1.5, 3.9, 0.42, -0.2], [4.5, 24, 2, 11, 2.5, 0.5, -0.4], [13.5, 24, 16, 8, 2.6, 0.45, 0.4]], [[9, 15, 5, 11], [14.5, 5, 3, 12]], [[6.5, 25, 4.5, 17.5, 1.7], [12, 25, 13.5, 18, 1.5]]);
  p.set(7, 9, WHITE); p.set(1, 24, OBS[3]); p.set(16, 24, OBS[2]);
}
function obsidianBig(p: Px): void {
  obsidianSet(p,
    [[17, 45, 15, 1.5, 6.6, 0.5, -0.25], [22, 44, 24, 7, 3.6, 0.5, 0.4], [26.5, 45, 31, 13, 4.6, 0.48, 0.35], [8.5, 45, 3.5, 20, 4.1, 0.5, -0.4]],
    [[18, 30, 9, 21], [5, 9, 5, 22], [31, 9, 5, 23]],
    [[12, 46, 9, 31, 2.9, 0.5, -0.2], [22.5, 46, 25.5, 32, 2.7, 0.5, 0.3], [30.5, 46, 34, 37, 2], [4, 46, 1.5, 39, 1.5], [17, 46, 17.5, 39, 1.6]]);
  p.set(12, 17, WHITE); p.set(13, 16, OBS[4]); p.set(11, 18, OBS[4]); p.set(28, 22, WHITE);
  // Splitter am Boden
  p.px([1, 46, 35, 46], OBS[3]);
}

// ---------------------------------------------------------------- Gebeine
function skull(p: Px): void {
  // Tierschädel mit Horn, halb in der Asche
  part(p, (l) => {
    l.ball(4.5, 5, 3.6, 3.4, B, 2, 4); l.rect(6, 4, 5, 4, B[3]); l.rect(6, 4, 5, 1, B[4]); l.rect(10, 5, 1, 3, B[2]); l.rect(7, 7, 4, 1, B[2]);
    l.rect(4, 4, 2, 2, mix(INK, P.red[0], 0.3)); l.set(4, 4, INK); l.set(9, 5, INK); l.px([7, 8, 9, 8], B[3]); l.set(8, 6, B[2]);
    // Horn
    l.px([2, 2, 1, 1, 1, 0, 3, 2], B[3]); l.set(2, 1, B[4]); l.set(0, 0, B[2]); l.px([7, 2, 8, 1], B[3]); l.set(9, 0, B[2]); l.set(7, 3, B[2]);
    l.set(2, 6, B[1]); l.set(3, 7, B[1]);
  });
  for (let x = 0; x < 12; x++) { const h = hash2(x, 1, 7); if (x > 0 && x < 11) p.set(x, 9, ASH[1 + (h & 1)]); if ((h & 3) === 0 && x > 1 && x < 10) p.set(x, 8, ASH[3]); }
}
function ribcage(p: Px): void {
  const BN: Ramp = [mix(B[0], A[1], 0.4), mix(B[1], A[3], 0.3), B[2], B[3], B[4]];
  // hintere Rippen (Schattenseite)
  part(p, (l) => { for (let k = 0; k < 6; k++) { const x = 5 + k * 4, h = [7, 9, 10, 10, 8, 6][k]; for (const [qx, qy] of resample(bez([x, 17], [x + 0.5, 17 - h * 1.25], [x + 4.5, 17 - h * 0.86]))) { l.set(qx, qy, BN[1]); } } });
  // Wirbelsäule
  part(p, (l) => {
    for (let x = 2; x < 28; x++) { const y = 16 + Math.round(Math.sin(x * 0.22 + 0.4) * 1.2 + (x > 22 ? (x - 22) * 0.4 : 0)); l.set(x, y, BN[3]); l.set(x, y + 1, BN[1]); if (x % 3 === 0) { l.set(x, y - 1, BN[4]); l.set(x, y + 1, BN[2]); } }
  });
  // vordere Rippen: Bögen, die über den Rücken nach vorn fallen
  for (let k = 0; k < 6; k++) part(p, (l) => {
    const x = 3 + k * 4, h = [8, 11, 13, 13, 11, 8][k], end: Pt = [x + 6.5, 20 - (k === 0 || k === 5 ? 1 : 0)];
    const pts = resample([...bez([x, 16], [x - 1.5, 16 - h * 1.15], [x + 3.5, 16 - h]), ...bez([x + 3.5, 16 - h], [x + 7, 16 - h * 0.8], end)]);
    pts.forEach(([qx, qy], i) => { const t = i / pts.length; l.set(qx, qy, t < 0.45 ? BN[3] : t < 0.7 ? BN[4] : BN[3]); l.set(qx + 1, qy, t < 0.5 ? BN[2] : BN[1]); });
    l.set(end[0], end[1], BN[2]);
    if (k === 2) { l.set(x + 6, 12, 0); l.set(x + 7, 12, 0); l.set(x + 6, 13, 0); l.set(x + 7, 13, 0); }      // gebrochene Rippe
  });
  // Aschewehe begräbt den Fuß
  part(p, (l) => {
    for (let x = 0; x < 30; x++) { const top = 19 - Math.round(Math.sin((x / 29) * Math.PI) * 1.6 + vnoise(x * 0.4, 1, 5) * 1.6); for (let y = top; y < 21; y++) l.set(x, y, ASH[clamp((y === top ? 3 : y === top + 1 ? 2 : 1) + (rnd2(x, y, 3) > 0.85 ? 1 : rnd2(x, y, 3) < 0.12 ? -1 : 0), 0, 4)]); }
  });
  p.px([4, 19, 17, 18, 25, 19], B[3]); p.set(12, 19, CHAR[2]);
}

// ---------------------------------------------------------------- Fumarole, Geysir
/** Schlot: flacher Kraterwall aus Schlackebrocken um ein Glutloch. Mitte (cx), Unterkante by (exklusiv). heat 0..1. */
function crater(p: Px, cx: number, by: number, heat: number, seed: number): void {
  part(p, (l) => {
    l.ell(cx, by - 4, 7.4, 3.9, BASALT[2]); l.ell(cx - 0.6, by - 4.6, 6.4, 3, BASALT[3]);
    // Wallbrocken
    for (let k = 0; k < 9; k++) { const a = (k / 9) * 6.283 + 0.3, x = cx + Math.cos(a) * 6, y = by - 4 + Math.sin(a) * 2.9, up = Math.sin(a) < 0; l.rect(x - 1, y - 1, 3, 2, BASALT[up ? 3 : 2]); l.set(x - 1, y - 1, BASALT[up ? 5 : 4]); l.set(x + 1, y, BASALT[1]); if (hash2(k, 1, seed) & 1) l.set(x, y - 2, BASALT[up ? 4 : 3]); }
    l.rect(cx - 6, by - 1, 12, 1, BASALT[1]);
  });
  // Glutloch
  p.ell(cx, by - 4.6, 4.1, 2.1, BASALT[0]); p.ell(cx, by - 4.2, 3.4, 1.6, HOT[clamp(Math.round(1 + heat * 2), 1, 3)]); p.ell(cx - 0.3, by - 4.1, 2.2, 1, HOT[clamp(Math.round(2 + heat * 2.4), 2, 5)]);
  if (heat > 0.75) p.rect(cx - 1, by - 5, 2, 1, HOT[5]);
  p.set(cx - 3, by - 5, HOT[1]); p.set(cx + 3, by - 4, HOT[0]);
  // Glutschein auf dem Wallinneren
  for (let x = cx - 7; x <= cx + 7; x++) for (let y = by - 8; y < by - 4; y++) { const c = p.get(x, y); if (BASALT.includes(c) && Math.abs(x - cx) < 5) p.set(x, y, mix(c, F[1], 0.25 + heat * 0.3)); }
}
function emberVent(p: Px, f: number): void {
  const heat = [0.5, 0.8, 1, 0.7][f];
  crater(p, 8, 19, heat, 3);
  inkOutline(p);
  glow(p, 8, 14, 8, F[2], 40 + heat * 30);
  // aufsteigende Funken (4er-Schleife: jede Bahn rückt je Frame 3 px höher) und Rauch
  for (let k = 0; k < 5; k++) {
    const ph = (f + k * 1.6) % 4, x = 8 + [-2, 1, 3, -1, 0][k] + Math.round(Math.sin(ph * 1.6 + k) * 1.2), y = 12 - ph * 3.2;
    p.blend(x, y, alpha(ph < 1.2 ? HOT[5] : ph < 2.4 ? HOT[4] : HOT[2], ph < 3 ? 255 : 150));
    if (ph < 1.5 && k % 2 === 0) p.blend(x, y + 1, alpha(HOT[3], 200));
  }
  const sm = mix(A[3], A[4], 0.5);
  puff(p, 7 + [0, 1, 1, 0][f], 6 - f * 0.8, 2.6, sm, 70 - f * 8); puff(p, 10 - [0, 0, 1, 1][f], 2.5 - (f % 2), 2, sm, 44); if (f > 1) puff(p, 6, 9, 1.8, sm, 60);
}
/** Flammenstrahl: schlanke Säule mit wandernden Einschnürungen, Kern weißgelb; top/bot = Ausdehnung, w = halbe Breite. */
function jet(p: Px, cx: number, bot: number, h: number, w: number, f: number): void {
  const layer = (sc: number, hs: number, c: number, sh: number): void => {
    const H = h * hs;
    for (let i = 0; i < H; i++) {
      const tt = i / H, prof = (tt < 0.12 ? 0.55 + (tt / 0.12) * 0.35 : tt < 0.55 ? 0.9 + Math.sin(tt * 14 - f * 2.1 + sh) * 0.14 : Math.pow(1 - (tt - 0.55) / 0.45, 0.8) * (0.95 + Math.sin(tt * 14 - f * 2.1 + sh) * 0.12));
      const xc = cx + Math.sin(tt * 6.5 - f * 1.9 + sh * 0.5) * tt * 1.3, hw = Math.max(0.5, w * sc * prof);
      for (let x = Math.floor(xc - hw); x < Math.ceil(xc + hw); x++) if (Math.abs(x + 0.5 - xc) <= hw) p.set(x, bot - 1 - i, c);
    }
  };
  layer(1, 1, HOT[2], 0); layer(0.74, 0.88, HOT[3], 0.6); layer(0.48, 0.7, HOT[4], 1.2); layer(0.24, 0.46, HOT[5], 1.8);
  // losgelöste Zungen an der Spitze, seitliche Fetzen
  const tip = bot - h;
  p.set(cx + [1, -1, 0, 1, -1, 0][f % 6], tip - 2, HOT[3]); p.set(cx + [-1, 1, 1, -2, 0, 1][f % 6], tip - 4, HOT[2]);
  if (h > 16) { p.set(cx - w - 1, bot - h * 0.4 + (f & 1), HOT[2]); p.set(cx + w + 1, bot - h * 0.62 - (f & 1), HOT[3]); p.set(cx + w, bot - h * 0.3, HOT[2]); }
}
function fireGeyser(p: Px, f: number): void {
  const heat = [0.15, 0.8, 1, 1, 1, 0.5][f], H = [0, 9, 22, 32, 30, 13][f], W = [0, 1.8, 2.8, 3.5, 3.3, 2][f];
  crater(p, 8, 39, heat, 9);
  inkOutline(p);
  if (H) { const l = new Px(p.w, p.h); jet(l, 8, 35, H, W, f); p.draw(l); }
  glow(p, 8, 34, 8, F[2], 30 + heat * 46);
  if (H > 16) glow(p, 8, 35 - H * 0.5, 8, F[2], 34);
  const sm = mix(A[3], A[4], 0.5);
  if (f === 0) { puff(p, 8, 30, 2, sm, 50); puff(p, 9, 26, 1.6, sm, 30); p.blend(7, 31, alpha(HOT[3], 200)); }
  if (f === 1) sparks(p, [[5, 24, 0], [11, 22, 1], [8, 20, 0]]);
  if (f === 2) sparks(p, [[4, 18, 0], [12, 14, 1], [3, 26, -1], [13, 24, 0]]);
  if (f === 3) sparks(p, [[3, 8, 1], [13, 5, 0], [2, 18, 0], [14, 15, 1], [5, 1, 0], [12, 27, -1]]);
  if (f === 4) sparks(p, [[2, 5, 0], [14, 9, 1], [1, 14, -1], [13, 1, 0], [15, 21, 0], [3, 24, -1]]);
  if (f === 5) { puff(p, 8, 17, 3, sm, 66); puff(p, 6, 11, 2.6, sm, 50); puff(p, 10, 6, 2.2, sm, 34); sparks(p, [[4, 20, 0], [12, 16, 0], [8, 13, 1], [2, 28, -1], [14, 27, -1]]); p.set(8, 19, HOT[3]); p.set(7, 17, HOT[2]); }
}

// ---------------------------------------------------------------- Flaches: Asche, Risse
function ashPile(p: Px): void {
  for (let x = 0; x < 20; x++) {
    const u = ((x + 0.5) / 20) * 2 - 1, top = Math.round(8.5 - 7 * Math.pow(Math.max(0, 1 - u * u), 0.7) * (0.82 + vnoise(x * 0.5, 2, 9) * 0.3));
    for (let y = Math.max(0, top); y < 10; y++) {
      const d = y - top, r = rnd2(x, y, 5);
      let tone = d === 0 ? 4 : d < 2 ? 3 : u > 0.25 ? 1 : 2;
      if (r > 0.9) tone += 1; else if (r < 0.14) tone -= 1;
      if (y === 9) tone = Math.min(tone, 1);
      if (y === 9 && (x < 2 || x > 17)) continue;
      p.set(x, y, ASH[clamp(tone, 0, 4)]);
    }
  }
  // Holzkohlestücke, Restglut
  p.px([5, 6, 6, 6, 13, 7, 9, 4], CHAR[1]); p.px([5, 5, 13, 6], CHAR[3]); p.set(10, 4, HOT[3]); p.set(14, 7, HOT[2]); p.set(6, 7, HOT[1]);
  inkOutline(p, 0.45, 0.6, A[1]);
}
function magmaCrack(p: Px, v: number): void {
  const paths: Pt[][] = v === 0
    ? [jag([1, 10], [12, 6], 1.4, 3), jag([12, 6], [22, 3], 1.2, 4), jag([12, 6], [16, 12], 1, 5, 2), jag([6, 8], [4, 3], 0.8, 6, 2)]
    : v === 1 ? [jag([3, 2], [11, 7], 1.2, 7), jag([11, 7], [21, 10], 1.3, 8), jag([11, 7], [8, 12], 0.8, 9, 2), jag([16, 9], [19, 4], 0.8, 10, 2)]
      : [jag([2, 6], [9, 8], 1, 11), jag([9, 8], [14, 5], 0.9, 12, 2), jag([14, 5], [22, 8], 1.2, 13), jag([9, 8], [11, 12], 0.7, 14, 2), jag([14, 5], [13, 1], 0.6, 15, 2)];
  const core: Array<readonly [number, number, number]> = [];
  paths.forEach((pa, k) => { const pts = resample(pa); pts.forEach(([x, y], i) => { const t = i / pts.length; core.push([x, y, k === 0 || (k === 1 && v !== 2) || (v === 2 && k === 2) ? (t > 0.15 && t < 0.85 ? 1.1 : 0.6) : 0.45]); }); });
  const CR = mix(A[0], P.red[0], 0.35);
  for (let y = 0; y < 14; y++) for (let x = 0; x < 24; x++) {
    let d = 9, wd = 0;
    for (const [cx, cy, w] of core) { const q = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - w; if (q < d) { d = q; wd = w; } }
    const r = rnd2(x, y, 3 + v);
    if (d < -0.35 && wd > 1) p.set(x, y, r > 0.75 ? WHITE : HOT[5]);
    else if (d < 0.25) p.set(x, y, wd > 0.9 ? HOT[4] : r > 0.5 ? HOT[4] : HOT[3]);
    else if (d < 1.1) p.set(x, y, r > 0.6 ? HOT[1] : r > 0.25 ? CR : HOT[2]);
    else if (d < 2) p.set(x, y, alpha(CR, r > 0.5 ? 200 : 130));
    else if (d < 3.4) p.set(x, y, alpha(F[1], r > 0.5 ? 46 : 30));
    else if (d < 4.6) p.set(x, y, alpha(F[1], 16));
  }
}

export function glNature(out: Frames): void {
  one(out, 'dead_tree', 44, 64, deadTree, false);
  one(out, 'charred_stump', 18, 16, charredStump, false);
  one(out, 'scorched_bush', 20, 16, scorchedBush, false);
  one(out, 'basalt_column', 20, 44, basaltColumn, false);
  one(out, 'basalt_cluster', 40, 40, basaltCluster, false);
  anim(out, 'lava_rock', 4, 22, 20, lavaRock, false);
  one(out, 'obsidian', 18, 26, obsidian, false);
  one(out, 'obsidian_big', 36, 48, obsidianBig, false);
  one(out, 'skull', 12, 10, skull, false);
  one(out, 'ribcage', 30, 22, ribcage, false);
  anim(out, 'ember_vent', 4, 16, 20, emberVent, false);
  anim(out, 'fire_geyser', 6, 16, 40, fireGeyser, false);
  one(out, 'ash_pile', 20, 10, ashPile, false);
  for (let v = 0; v < 3; v++) one(out, `magma_crack_${v}`, 24, 14, (p) => magmaCrack(p, v), false);
}
