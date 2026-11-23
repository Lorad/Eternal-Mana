/**
 * Aetherion, der Träumer am Grund (Kapitel 10): das Wesen, das die Quelle IST – gezeigt als sein Albtraum vom Alten Krieg.
 * Ein gewaltiger Leib aus fließendem Wasserlicht und Kristall ragt aus dem Quellwasser, die Maske ruhig und geschlossen;
 * in der Brust die leere Fassung des Herzkristalls, um das Haupt kreisen die sechs Elementkristalle. Von der Wunde aus
 * breitet sich die „Stille“ aus: entfärbter Stein und dunkle Adern. Im „Tod“ bricht die Albtraumschale ab – zurück bleibt
 * ruhiges Licht (eine Erlösung, kein Sterben). 128×128, frontal.
 */
import { Px } from '../draw';
import type { Pt } from '../draw';
import { P, INK, WHITE, alpha, mix, rnd2 } from '../palette';
import type { Ramp } from '../palette';
import { pk, R, TAU, clamp, cracks, dissolve, glow, lay, lerp, rays, reramp, shatter, spark, spline } from './kit';
import type { BFr, BossDef } from './kit';
import { ik } from '../mobs/kit';
import { jag, prism } from '../objects/kr_kit';

const GY = 121, CX = 64;
/** Wasserlicht (6): tiefes Blaugrün → fast Weiß */
const WL: Ramp = [mix(P.blue[0], P.teal[0], 0.5), mix(P.blue[1], P.teal[1], 0.6), P.teal[2], mix(P.teal[3], P.blue[3], 0.18), P.teal[4], mix(P.teal[4], WHITE, 0.6)];
/** klarer Kristall (6) für prism() */
const CR: Ramp = [mix(P.blue[1], P.teal[1], 0.4), mix(P.blue[2], P.teal[2], 0.5), mix(P.ice[1], P.teal[3], 0.4), mix(P.ice[2], P.teal[4], 0.35), P.ice[4], WHITE];
/** Maske: fahles Porzellan (5) */
const MASK: Ramp = [mix(P.ice[0], P.teal[1], 0.45), mix(P.ice[1], P.steel[2], 0.3), P.ice[2], P.ice[3], mix(P.ice[4], P.cream[4], 0.45)];
/** Stille (6): entfärbter, toter Stein – gleiche Stufenzahl wie WL/CR zum Umfärben */
const STILL: Ramp = [mix(INK, P.shadow[1], 0.5), mix(P.shadow[2], P.stone[0], 0.5), mix(P.shadow[3], P.stone[1], 0.55), mix(P.stone[2], P.shadow[4], 0.4), mix(P.stone[3], P.violet[4], 0.18), mix(P.stone[4], P.ice[3], 0.4)];
const VEIN = mix(INK, P.shadow[0], 0.4), VEIN2 = mix(P.violet[1], P.shadow[2], 0.4);
const OG = [mix(P.gold[1], P.stone[2], 0.3), mix(P.gold[2], P.stone[3], 0.25), mix(P.gold[3], P.cream[3], 0.2), P.gold[4]];
/** die sechs Elementkristalle: Feuer, Wasser, Erde, Wind, Licht, Dunkelheit (vgl. ELEMENT_COLOR) */
const EL: Ramp[] = [
  [P.red[0], P.red[1], P.fire[1], P.fire[2], P.fire[3], P.fire[4]],
  [P.blue[0], P.blue[1], P.blue[2], P.blue[3], P.blue[4], mix(P.blue[4], WHITE, 0.6)],
  [P.wood[1], P.gold[0], P.gold[1], mix(P.gold[2], P.sand[3], 0.5), P.sand[4], mix(P.sand[4], WHITE, 0.5)],
  [P.forest[1], P.forest[2], mix(P.forest[3], P.teal[3], 0.4), mix(P.green[4], P.teal[4], 0.6), mix(P.teal[4], WHITE, 0.35), WHITE],
  [P.gold[1], P.gold[2], P.gold[3], P.gold[4], mix(P.gold[4], WHITE, 0.5), WHITE],
  [P.violet[0], P.violet[1], P.violet[2], P.violet[3], P.violet[4], mix(P.violet[4], WHITE, 0.5)],
];

interface A { dy: number; lean: number; hd: Pt; Rh: Pt | null; Lh: Pt | null; bend: number; fl: number; heart: number; still: number; eyes: number; f: BFr }

function pose(f: BFr): A {
  const i = f.i;
  const z: A = { dy: 0, lean: 0, hd: [0, 0], Rh: null, Lh: null, bend: 1, fl: f.n > 1 ? i / f.n : 0, heart: 0.35, still: 0.34, eyes: 0, f };
  switch (f.a) {
    case 'idle': z.dy = [0, 0, -1, -1, -1, 0][i]; z.hd = [0, [0, 0, 0, 1, 1, 0][i]]; z.heart = 0.3 + [0, 0.1, 0.2, 0.3, 0.2, 0.1][i]; break;
    case 'windup': z.lean = [-2, -3][i]; z.dy = [0, -1][i]; z.hd = pk([[-1, 0], [-1, -1]], i); z.Rh = pk([[108, 80], [108, 28]], i); z.heart = [0.5, 0.8][i]; z.eyes = [0.5, 1][i]; break;
    case 'attack': z.lean = [2, 4, 3, 1][i]; z.dy = [0, 2, 2, 1][i]; z.hd = pk([[1, 1], [2, 2], [1, 2], [0, 1]], i); z.Rh = i < 3 ? pk([[110, 62], [102, 104], [101, 109]], i) : null; z.heart = [0.8, 0.6, 0.45, 0.4][i]; z.eyes = [1, 1, 0.5, 0][i]; break;
    case 'special': z.dy = [-1, -2, -1, -2][i]; z.hd = [0, -1]; z.Lh = pk([[21, 84], [20, 82], [21, 84], [22, 85]], i); z.Rh = pk([[107, 84], [108, 82], [107, 84], [106, 85]], i); z.heart = [1.1, 1.5, 1.1, 1.5][i]; z.eyes = 1; z.still = [0.34, 0.4, 0.34, 0.4][i]; z.bend = -1; break;
    case 'hit': z.lean = [-3, -1][i]; z.hd = pk([[-2, -1], [-1, 0]], i); z.heart = 0.15; break;
    case 'death': { const k = Math.min(i, 3); z.dy = [1, 2, 3, 4][k]; z.hd = pk([[0, 1], [0, 2], [-1, 3], [-1, 4]], k); z.still = [0.55, 0.72, 0.9, 1.2][k]; z.heart = [0.5, 0.35, 0.2, 0.1][k]; z.fl = k / 8; break; }
  }
  return z;
}

// ---------------------------------------------------------------- Wasserlicht, Stille
/**
 * Wasserlicht-Körper: füllt die Maske zeilenweise wie einen Zylinder (Licht links) und legt fließende Lichtbahnen darüber,
 * die nach unten wandern; fl = 0..1 über die Schleife (nahtlos), per = Wellenlänge in px.
 */
function water(l: Px, m: Px, fl: number, per = 24, bias = 0): void {
  for (let y = 0; y < m.h; y++) {
    let x = 0;
    while (x < m.w) {
      if (!m.d[y * m.w + x]) { x++; continue; }
      let e = x; while (e + 1 < m.w && m.d[y * m.w + e + 1]) e++;
      const n = e - x + 1;
      for (let i = x; i <= e; i++) {
        const u = (i - x + 0.5) / n;
        let t = (n < 4 ? (i === x ? 4 : 2) : u < 0.1 ? 3 : u < 0.36 ? 4 : u < 0.62 ? 3 : u < 0.86 ? 2 : 1) + bias;
        const h = rnd2(i, 7, 3), s = Math.sin(((y - fl * per) / per) * TAU + h * TAU * 3);
        if (h < 0.36 && s > 0.4) t++; else if (h > 0.78 && s < -0.45) t--;
        l.set(i, y, WL[clamp(t, 0, 5)]);
      }
      x = e + 1;
    }
  }
}
const blob = (m: Px, path: ReadonlyArray<Pt>, r0: number, r1: number): void => { const n = path.length - 1 || 1; path.forEach((q, i) => { const r = r0 + ((r1 - r0) * i) / n; m.ell(q[0], q[1], r, r, 1); }); };
/** Stille: färbt Wasserlicht und Kristall im Umkreis der Wunde zu totem Stein um (Rand unregelmäßig). */
function stillPass(p: Px, c: Pt, amt: number): void {
  if (amt <= 0) return;
  const rad = amt * 56;
  const test = (x: number, y: number): boolean => Math.hypot((x - c[0]) * (x < c[0] ? 0.82 : 1.25), (y - c[1]) * 0.8) + (rnd2(x >> 1, y >> 1, 5) - 0.5) * 5 + Math.sin(x * 0.5 + y * 0.31) * 3.5 < rad;
  reramp(p, WL, STILL, test); reramp(p, CR, STILL, test);
}
/** Dunkle Adern der Stille von der Wunde aus; nur auf deckenden Pixeln. */
const VEINS: Array<[Pt, number, number]> = [
  [[CX - 27, 50], 3, 0], [[CX - 37, 84], 5, 0.08], [[CX + 20, 52], 7, 0.1], [[CX - 3, 43], 9, 0], [[CX - 9, 100], 11, 0.03], [[CX + 10, 92], 13, 0.1],
  [[CX - 18, 70], 15, 0.15], [[CX + 17, 72], 17, 0.35], [[CX + 30, 70], 19, 0.5], [[CX - 16, 108], 21, 0.45], [[CX + 14, 106], 23, 0.6],
];
function veins(p: Px, c: Pt, amt: number, off: Pt): void {
  for (const [end, seed, min] of VEINS) {
    const k = clamp((amt - min) * 3.2); if (k <= 0) continue;
    const e: Pt = [c[0] + (end[0] + off[0] - c[0]) * k, c[1] + (end[1] + off[1] - c[1]) * k];
    const pts = jag(c, e, 2.2, seed, 4);
    for (let s = 0; s + 1 < pts.length; s++) {
      const a = pts[s], b = pts[s + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
      for (let q = 0; q <= n; q++) {
        const x = Math.floor(a[0] + ((b[0] - a[0]) * q) / n), y = Math.floor(a[1] + ((b[1] - a[1]) * q) / n);
        if (p.get(x, y) >>> 24 < 200) continue;
        p.set(x, y, VEIN); if (p.get(x - 1, y) >>> 24 >= 200 && p.get(x - 1, y) !== VEIN && (s + q) % 3 !== 0) p.set(x - 1, y, VEIN2);
        // feine Seitenäste
        if (q === 0 && s > 0 && s % 2 === 0) { const sg = s % 4 ? 1 : -1; for (let j = 1; j < 4; j++) { const X = x + sg * j, Y = y + j; if (p.get(X, Y) >>> 24 >= 200) p.set(X, Y, j < 3 ? VEIN : VEIN2); } }
      }
    }
  }
}

// ---------------------------------------------------------------- Einzelteile
/** Doppelspitziger Elementkristall mit eigenem Schein. */
function shard(p: Px, x: number, y: number, k: number, s: number, lit: number): void {
  glow(p, x, y, 6 + lit * 4, EL[k][3], 44 + lit * 34);
  lay(p, (l) => {
    l.poly([[x - 2.7 * s, y + 4 * s], [x, y + 10 * s], [x + 2.7 * s, y + 4 * s]], EL[k][1]); l.line(x - 2 * s, y + 5 * s, x, y + 9 * s, EL[k][2]);
    prism(l, x, y + 6 * s, x + 0.4, y - 9 * s, 3 * s, EL[k], { seed: k + 2, lift: lit > 0.9 ? 1 : 0 });
  });
  if (lit > 0.7) spark(p, x, y - 9 * s, WHITE, alpha(EL[k][4], 220), 1);
}
interface Sh { x: number; y: number; front: boolean; s: number; lit: number }
function shardAt(f: BFr, k: number, dy: number): Sh {
  let a = (k / 6) * TAU, rx = 54, ry = 10, cy = 40, lit = 0.5;
  const bob = Math.sin(f.ph + k * 1.7) * 1.5;
  switch (f.a) {
    case 'idle': a += Math.sin(f.ph) * 0.16; break;
    case 'windup': a += 0.14 + f.i * 0.1; rx = 54 - f.i * 3; lit = 0.8; break;
    case 'attack': a += [0.32, 0.44, 0.36, 0.2][f.i]; rx = [51, 56, 55, 54][f.i]; break;
    case 'special': a += Math.sin(f.ph) * 0.1 + 0.26; ry = 7; cy = 31; rx = 48; lit = [1, 1.3, 1, 1.3][f.i]; break;
    case 'hit': rx = [57, 56][f.i]; a -= [0.12, 0.06][f.i]; break;
    case 'death': a += 0.05 * f.i; rx = 54 - Math.min(f.i, 3) * 2; lit = 0.5 + Math.min(f.i, 3) * 0.1; break;
  }
  const sa = Math.sin(a);
  return { x: CX + Math.cos(a) * rx, y: cy + dy * 0.5 + sa * ry + bob, front: sa > 0, s: sa > 0 ? 1.05 : 0.88, lit };
}
/** Ruheplatz der Kristalle nach der Erlösung: ein stiller Bogen über dem Haupt. */
function shardRest(k: number): Pt { const a = ((200 + k * 28) / 360) * TAU; return [CX + Math.cos(a) * 38, 55 + Math.sin(a) * 37]; }

/** Die Maske: ruhig, Augen geschlossen (eyes 0) oder Lichtschlitze (1); crack = Riss der Stille über dem linken Auge. */
function mask(l: Px, mx: number, my: number, eyes: number, crack: number, calm = false): void {
  const hw = (j: number): number => (j < 3 ? [3.6, 6.4, 8][j] : j <= 12 ? (j >= 6 ? 10 : 9) : j <= 22 ? lerp(10, 6.4, (j - 12) / 10) : lerp(6.4, 0.6, (j - 22) / 7));
  for (let j = 0; j < 30; j++) {
    const w = hw(j);
    for (let x = Math.ceil(-w); x < w; x++) {
      const u = (x + 0.5) / w;
      let t = u < -0.55 ? 4 : u < 0.3 ? 3 : u < 0.72 ? 2 : 1;
      if (j < 2 && u < 0.4) t = 4; else if (j > 20 && u > -0.2) t = Math.max(1, t - 1);
      if (u < -0.86) t = 3;                                              // linke Kante leicht abgesetzt
      l.set(mx + x, my + j, MASK[clamp(t, 0, 4)]);
    }
  }
  // Brauenbogen und Nasengrat
  for (let x = -8; x <= 7; x++) { const y = my + 9 + R((x * x) / 40); if (Math.abs(x) > 1) l.set(mx + x, y, MASK[x < 0 ? 2 : 1]); }
  for (let j = 10; j < 20; j++) { l.set(mx - 1, my + j, MASK[4]); l.set(mx, my + j, MASK[j < 18 ? 2 : 1]); }
  l.px([mx - 1, my + 20, mx, my + 20], MASK[1]); l.set(mx - 2, my + 19, MASK[4]);
  // Stirnzeichen: leere, goldgefasste Raute
  l.px([mx - 1, my + 2, mx, my + 2, mx - 2, my + 3, mx + 1, my + 3, mx - 2, my + 4, mx + 1, my + 4, mx - 1, my + 5, mx, my + 5], OG[1]); l.set(mx - 1, my + 2, OG[3]);
  l.px([mx - 1, my + 3, mx, my + 3, mx - 1, my + 4, mx, my + 4], calm ? WHITE : WL[1]);
  // Augen
  for (const sg of [-1, 1]) {
    const ex = mx + sg * 5 - (sg > 0 ? 1 : 0);
    if (eyes >= 0.9) { l.rect(ex - 2, my + 12, 5, 1, WHITE); l.px([ex - 2, my + 13, ex + 2, my + 13], WL[4]); l.rect(ex - 1, my + 13, 3, 1, WL[5]); }
    else if (eyes > 0.3) { l.rect(ex - 2, my + 13, 5, 1, WL[0]); l.rect(ex - 1, my + 13, 3, 1, WL[5]); }
    else { l.px([ex - 2, my + 12, ex - 1, my + 13, ex, my + 13, ex + 1, my + 13, ex + 2, my + 12], calm ? MASK[0] : WL[0]); l.px([ex - 1, my + 14, ex + 1, my + 14], MASK[2]); }
    // Lichtbahn unter dem Auge (Tränenspur)
    for (let j = 15; j < 26; j++) { const x = ex - sg * R((j - 15) * 0.32); if (Math.abs(x - mx) < hw(j) - 1) l.set(x, my + j, j % 5 === 4 ? MASK[3] : calm ? WL[5] : j < 19 ? WL[4] : WL[3]); }
  }
  // Wangenschatten, Kinn
  l.px([mx + 6, my + 17, mx + 6, my + 18, mx + 5, my + 20], MASK[1]); l.px([mx - 1, my + 27, mx, my + 28], MASK[1]);
  if (crack > 0) {
    // Riss vom Rand über das linke Auge, ein Splitter fehlt
    const pts = jag([mx - 9, my + 5], [mx - 2, my + 5 + 14 * crack], 1.4, 31, 3);
    for (let s = 0; s + 1 < pts.length; s++) { l.line(pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1], VEIN); l.set(pts[s][0] + 1, pts[s][1], MASK[1]); }
    l.px([mx - 9, my + 4, mx - 10, my + 6, mx - 9, my + 6, mx - 10, my + 7], 0);
    if (crack > 0.5) { const b = jag([mx - 5, my + 11], [mx - 8, my + 19], 1, 33, 3); for (let s = 0; s + 1 < b.length; s++) l.line(b[s][0], b[s][1], b[s + 1][0], b[s + 1][1], VEIN); }
    if (crack > 0.9) { const b = jag([mx - 3, my + 16], [mx + 5, my + 23], 1.2, 35, 3); for (let s = 0; s + 1 < b.length; s++) l.line(b[s][0], b[s][1], b[s + 1][0], b[s + 1][1], VEIN); l.line(mx + 2, my + 1, mx + 6, my + 8, VEIN); }
  }
}

/** Die leere Fassung des Herzkristalls. */
function hollow(p: Px, x: number, y: number, light: number): void {
  const rim: Pt[] = [[x, y - 13], [x + 9, y - 4], [x + 6, y + 8], [x, y + 13], [x - 6, y + 8], [x - 9, y - 4]];
  lay(p, (l) => {
    l.poly(rim, CR[2]);
    l.poly([[x, y - 13], [x, y - 10], [x - 6.5, y - 3], [x - 4, y + 7], [x - 6, y + 8], [x - 9, y - 4]], CR[4]);
    l.poly([[x + 9, y - 4], [x + 6, y + 8], [x, y + 13], [x, y + 10], [x + 4, y + 7], [x + 6.5, y - 3]], CR[0]);
    l.poly([[x, y - 10], [x + 6.5, y - 3], [x + 4, y + 7], [x, y + 10], [x - 4, y + 7], [x - 6.5, y - 3]], mix(INK, P.blue[0], 0.25));
    l.poly([[x, y - 4], [x + 4, y], [x + 2.5, y + 6], [x, y + 8], [x - 2.5, y + 6], [x - 4, y]], mix(INK, P.blue[0], 0.5));
    // Facettenkanten der Fassung, in denen der Kristall saß
    l.line(x, y - 10, x, y - 5, WL[1]); l.line(x - 6, y - 3, x - 3, y - 1, WL[1]); l.line(x + 4, y + 6, x + 2, y + 4, WL[0]);
    l.set(x - 8, y - 4, WHITE); l.set(x, y - 13, WHITE);
  });
  // Lichtfäden tasten in die Leere und erreichen einander nicht
  const n = 5;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU + 0.5, len = 3 + light * 2.2 + (k % 2);
    for (let d = 0; d < len; d++) p.blend(x + Math.cos(a) * (6.5 - d) * 0.95, y + Math.sin(a) * (8.5 - d * 1.2), alpha(d > len - 2 ? WHITE : WL[4], 230 - d * 22));
  }
  if (light > 0.75) {
    glow(p, x, y, 5 + light * 5, WL[4], 50 + light * 40);
    lay(p, (l) => { l.ell(x, y, 1.4 + light * 1.2, 2.4 + light * 2, WL[5]); l.ell(x, y, 0.6 + light * 0.7, 1.2 + light * 1.2, WHITE); }, false);
  } else { p.blend(x - 1, y + 2, alpha(WL[4], 120 + light * 200)); p.blend(x + 2, y - 3, alpha(WL[3], 90 + light * 160)); }
}

/** Quellwasser am Grund, aus dem der Leib ragt. */
function pool(p: Px, fl: number, calm = 0): void {
  lay(p, (l) => {
    l.ell(CX, 116, 53, 5.6, WL[1]); l.ell(CX, 115.6, 50, 4.6, WL[2]); l.ell(CX - 3, 115, 40, 3.2, WL[calm ? 4 : 3]);
    for (let x = 10; x < 118; x++) if (l.get(x, GY) >>> 24) l.set(x, GY, WL[0]);
  });
  // wandernde Ringe (nahtlos über die Schleife)
  for (let k = 0; k < 3; k++) {
    const t = (k + fl) / 3, rx = 22 + t * 30, ry = 1.6 + t * 3.6;
    for (let a = 0; a < TAU; a += 0.035) { const x = CX + Math.cos(a) * rx, y = 115.5 + Math.sin(a) * ry; if (p.get(Math.floor(x), Math.floor(y)) >>> 24 >= 200 && rnd2(Math.floor(a * 9), k, 3) < 0.7) p.set(x, y, t < 0.5 ? WL[5] : WL[4]); }
  }
}
function poolFront(p: Px, fl: number, pts: ReadonlyArray<number>): void {
  // Schaumsaum, wo Leib und Arme ins Wasser tauchen
  for (const cx of pts) for (let x = cx - 9; x <= cx + 9; x++) {
    const u = (x - cx) / 9, y = 114 + R(Math.sqrt(Math.max(0, 1 - u * u)) * 2.4), f = Math.sin(x * 1.3 + fl * TAU);
    p.set(x, y, f > 0.2 ? WHITE : WL[5]); if (f > 0.5) p.set(x, y - 1, WL[5]); if (f < -0.3) p.set(x, y + 1, WL[4]);
  }
}

/** Arm aus Wasserlicht; hand = null → ruht mit der Hand im Quellwasser. */
function arm(p: Px, z: A, sg: number, hand: Pt | null): void {
  const sh: Pt = [CX + z.lean + sg * 28, 55 + z.dy];
  const el: Pt = hand ? ik(sh, hand, 22, 30, sg * z.bend * (hand[1] < sh[1] ? 1 : -1)) : [CX + sg * 38 + z.lean * 0.5, 84 + z.dy * 0.5];
  lay(p, (l) => {
    const m = new Px(l.w, l.h);
    if (!hand) blob(m, spline([sh, el, [CX + sg * 34, 101], [CX + sg * 32, 116]], 8), 7.6, 6);
    else { blob(m, spline([sh, el], 8), 7.6, 6.4); blob(m, spline([el, hand], 8), 6.4, 5.2); m.ell(hand[0], hand[1], 6.6, 6.6, 1); }
    water(l, m, z.fl);
  });
  if (hand) {
    // Kristallklauen und Armschiene
    const ang = Math.atan2(hand[1] - el[1], hand[0] - el[0]);
    lay(p, (l) => {
      for (const da of [-0.62, 0, 0.62]) { const c = Math.cos(ang + da), s = Math.sin(ang + da), len = da === 0 ? 15 : 12; prism(l, hand[0] + c * 4, hand[1] + s * 4, hand[0] + c * len, hand[1] + s * len, 2.5, CR, { seed: 5 + R(da * 3), clipY: 999 }); }
      const w: Pt = [lerp(el[0], hand[0], 0.62), lerp(el[1], hand[1], 0.62)], nx = -Math.sin(ang), ny = Math.cos(ang);
      prism(l, w[0] + nx * sg * 4, w[1] + ny * sg * 4, w[0] + nx * sg * 13 - Math.cos(ang) * 5, w[1] + ny * sg * 13 - Math.sin(ang) * 5, 2.4, CR, { seed: 9, clipY: 999 });
    });
  }
}

/** Leib, Mähne, Krone, Schultern; liefert die Mitte der Wunde. */
function figure(p: Px, z: A, sh: Sh[]): Pt {
  const sx = CX + z.lean, by = z.dy, mx = sx + z.hd[0], my = 18 + by + z.hd[1], H: Pt = [sx, 64 + by];
  // Krone aus Kristall hinter dem Haupt
  lay(p, (l) => {
    for (const [bx, b2, tx, ty, hw, sd] of [[-11, 14, -21, 5, 2.2, 3], [11, 14, 21, 5, 2.2, 4], [-9, 9, -16, -4, 2.6, 5], [9, 9, 16, -4, 2.6, 6], [-5, 6, -8, -9, 2.8, 7], [5, 6, 8, -9, 2.8, 8], [0, 5, 0, -12, 3.4, 9]] as const)
      prism(l, mx + bx, my + b2, mx + tx, my + ty, hw, CR, { seed: sd, clipY: 999 });
  });
  for (let k = 0; k < 6; k++) if (!sh[k].front) shard(p, sh[k].x, sh[k].y, k, sh[k].s, sh[k].lit);
  arm(p, z, -1, z.Lh); arm(p, z, 1, z.Rh);
  // Mähne: zwei Ströme Wasserlicht vom Haupt über die Schultern
  lay(p, (l) => {
    const m = new Px(l.w, l.h);
    for (const sg of [-1, 1]) blob(m, spline([[mx + sg * 7, my + 4], [mx + sg * 14, my + 15], [sx + sg * 18, 40 + by], [sx + sg * 25, 53 + by]], 8), 4.2, 6);
    water(l, m, z.fl, 16);
  });
  // Leib: Brust, Taille, Wasserfall ins Quellwasser
  lay(p, (l) => {
    const m = new Px(l.w, l.h), wx = CX + z.lean * 0.5;
    m.poly([[sx - 31, 53 + by], [sx - 23, 46 + by], [sx - 8, 44 + by], [sx + 8, 44 + by], [sx + 23, 46 + by], [sx + 31, 53 + by], [sx + 29, 63 + by], [sx + 21, 77 + by], [wx + 13, 90], [wx - 13, 90], [sx - 21, 77 + by], [sx - 29, 63 + by]], 1);
    m.rect(sx - 5, 40 + by, 10, 6, 1);
    for (let y = 88; y < 117; y++) { const v = (y - 88) / 28, hw = 13 + v * v * 14 + Math.sin(y * 0.6) * 0.6; m.rect(R(wx - hw), y, R(hw * 2), 1, 1); }
    water(l, m, z.fl);
  });
  // Brustplatten aus Kristall beiderseits der Fassung
  lay(p, (l) => {
    const y = by;
    l.poly([[sx - 30, 53 + y], [sx - 22, 47 + y], [sx - 9, 46 + y], [sx - 11, 60 + y], [sx - 9, 72 + y], [sx - 20, 76 + y], [sx - 28, 64 + y]], CR[3]);
    l.poly([[sx - 30, 53 + y], [sx - 22, 47 + y], [sx - 9, 46 + y], [sx - 10, 52 + y], [sx - 24, 55 + y]], CR[4]);
    l.poly([[sx - 11, 60 + y], [sx - 9, 72 + y], [sx - 20, 76 + y], [sx - 22, 66 + y]], CR[2]);
    l.line(sx - 24, 55 + y, sx - 10, 52 + y, CR[5]); l.line(sx - 22, 66 + y, sx - 11, 60 + y, CR[4]); l.line(sx - 28, 64 + y, sx - 22, 66 + y, CR[1]); l.line(sx - 24, 55 + y, sx - 22, 66 + y, CR[2]);
    l.poly([[sx + 30, 53 + y], [sx + 22, 47 + y], [sx + 9, 46 + y], [sx + 11, 60 + y], [sx + 9, 72 + y], [sx + 20, 76 + y], [sx + 28, 64 + y]], CR[2]);
    l.poly([[sx + 30, 53 + y], [sx + 22, 47 + y], [sx + 9, 46 + y], [sx + 10, 52 + y], [sx + 24, 55 + y]], CR[3]);
    l.poly([[sx + 11, 60 + y], [sx + 9, 72 + y], [sx + 20, 76 + y], [sx + 22, 66 + y]], CR[1]);
    l.line(sx + 24, 55 + y, sx + 10, 52 + y, CR[4]); l.line(sx + 22, 66 + y, sx + 11, 60 + y, CR[3]); l.line(sx + 28, 64 + y, sx + 22, 66 + y, CR[0]); l.line(sx + 24, 55 + y, sx + 22, 66 + y, CR[1]);
  });
  stillPass(p, H, z.still);
  veins(p, H, z.still, [z.lean, by]);
  hollow(p, H[0], H[1], z.heart);
  // Schulterkristalle: links (wunde Seite) tot und abgebrochen, rechts klar
  lay(p, (l) => {
    const L = z.still > 0.15 ? STILL : CR, Rr = z.still > 0.95 ? STILL : CR;
    prism(l, sx - 31, 57 + by, sx - 43, 54 + by, 3, L, { seed: 21, clipY: 999, sh: 0.86, skew: -0.7 }); prism(l, sx - 27, 53 + by, sx - 36, 44 + by, 3.6, L, { seed: 22, clipY: 999, sh: 0.88, skew: 0.8 }); prism(l, sx - 23, 50 + by, sx - 27, 42 + by, 2.8, L, { seed: 23, clipY: 999 });
    prism(l, sx + 31, 57 + by, sx + 47, 51 + by, 3, Rr, { seed: 24, clipY: 999 }); prism(l, sx + 27, 53 + by, sx + 42, 37 + by, 3.8, Rr, { seed: 25, clipY: 999 }); prism(l, sx + 23, 50 + by, sx + 29, 36 + by, 3, Rr, { seed: 26, clipY: 999 });
  });
  // Halsring und Maske
  lay(p, (l) => { l.rect(sx - 6, 43 + by, 12, 2, OG[1]); l.rect(sx - 6, 43 + by, 6, 1, OG[2]); l.px([sx - 3, 43 + by, sx + 2, 44 + by], OG[3]); });
  lay(p, (l) => mask(l, mx, my, z.eyes, z.f.a === 'death' ? clamp(0.5 + z.f.i * 0.2) : 0.5));
  if (z.eyes > 0.5) for (const sg of [-1, 1]) glow(p, mx + sg * 5, my + 12.5, 4, WL[5], 60);
  return H;
}

/** Was bleibt: ruhiges Licht – ein schmaler Schleier unter der unversehrten Maske. t = Erscheinen 0..1 */
function calmLight(p: Px, t: number, fl: number): void {
  const my = 22;
  glow(p, CX, 62, 46, WL[3], 12 * t); glow(p, CX, 56, 28, WL[4], 22 * t);
  for (let y = 46; y < 116; y++) {
    const v = (y - 46) / 70, hw = 5 + v * v * 21 + Math.sin(y * 0.22 + fl * TAU) * 1.3 * v;
    for (let x = R(CX - hw); x <= R(CX + hw); x++) {
      const u = Math.abs(x + 0.5 - CX) / hw, s = Math.sin(((y - fl * 24) / 24) * TAU + rnd2(x >> 1, 7, 3) * TAU * 3);
      const a = (u < 0.35 ? 240 : u < 0.7 ? 200 : 130) * t * (1 - v * 0.2);
      p.blend(x, y, alpha(u < 0.3 ? (s > 0.2 ? WHITE : WL[5]) : u < 0.7 ? (s > 0.6 ? WL[5] : WL[4]) : WL[3], R(a)));
    }
  }
  // Mandorla: zwei Lichtbögen umschließen die Gestalt vom Haupt bis zum Wasser
  for (const sg of [-1, 1]) for (const q of spline([[CX + sg * 3, 46], [CX + sg * 20, 54], [CX + sg * 33, 76], [CX + sg * 30, 100], [CX + sg * 20, 115]], 12)) {
    const d = Math.abs((q[1] - 46) / 69 - 0.45) * 1.6;
    for (let w = -1; w <= 1; w++) p.blend(q[0] + w, q[1], alpha(w === 0 ? WHITE : WL[5], R((w === 0 ? 200 : 110) * t * (1 - d * 0.55))));
  }
  // Herzlicht
  glow(p, CX, 63, 10, WHITE, 50 * t);
  if (t > 0.5) lay(p, (l) => { l.poly([[CX, 57], [CX + 4, 62], [CX, 69], [CX - 4, 62]], WL[5]); l.poly([[CX, 59], [CX + 2, 62], [CX, 66], [CX - 2, 62]], WHITE); }, false);
  if (t > 0.3) { lay(p, (l) => mask(l, CX, my, 0, 0, true)); glow(p, CX, my + 4, 5, WHITE, 40 * t); }
}

const fn = (p: Px, f: BFr): void => {
  const z = pose(f), i = f.i;
  const sh: Sh[] = [0, 1, 2, 3, 4, 5].map((k) => shardAt(f, k, z.dy));
  if (f.a === 'death' && i >= 4) {
    // die Albtraumschale bricht ab; das Licht darunter ist ruhig
    const t = [0.3, 0.62, 0.9, 1][i - 4], z3 = pose({ ...f, i: 3 });
    pool(p, i / 8, 1);
    calmLight(p, [0.55, 0.85, 1, 1][i - 4], i / 8);
    if (i < 7) {
      const snap = new Px(p.w, p.h);
      figure(snap, z3, [0, 1, 2, 3, 4, 5].map((k) => ({ ...shardAt({ ...f, i: 3 }, k, z3.dy), front: true, x: -99 })));
      const s = shatter(snap, t, GY, 23, { cell: 7, spread: 0.7, heap: 6, pop: 6, cx: CX });
      for (let y = 0; y < s.h; y++) for (const x of [0, 1, 2, s.w - 3, s.w - 2, s.w - 1]) s.d[y * s.w + x] = 0;
      if (i >= 5) dissolve(s, i === 5 ? 0.35 : 0.72, 5);
      if (i === 6) s.alphaMul(0.7);
      p.draw(s);
    }
    poolFront(p, i / 8, [CX]);
    // die sechs Kristalle finden ihren Bogen
    const k2 = [0.3, 0.7, 1, 1][i - 4];
    for (let k = 0; k < 6; k++) { const a = shardAt({ ...f, i: 3 }, k, 4), b = shardRest(k); shard(p, lerp(a.x, b[0], k2), lerp(a.y, b[1], k2) + (i === 7 ? 0 : Math.sin(k + i) * 1), k, 1, 0.8); }
    if (i === 4) { glow(p, CX, 60, 40, WHITE, 60); rays(p, CX, 60, 14, 52, 18, 0.2, WHITE, 150); }
    if (i === 5) rays(p, CX, 60, 16, 40, 14, 0.5, WL[5], 90);
    for (let k = 0; k < 12; k++) { const cyc = (k * 5 + i * 4) % 22, x = CX - 40 + k * 7.4 + Math.sin(k * 1.9) * 3; p.blend(x, 104 - cyc * 3.2, alpha(k % 3 ? WL[5] : WHITE, 210 - cyc * 8)); }
    return;
  }
  glow(p, CX, 62, 50, WL[2], 14 + z.heart * 10);
  if (f.a === 'special') { rays(p, CX + z.lean, 63 + z.dy, 14, 50 + (i % 2) * 6, 18, i * 0.18, WL[4], 110); }
  pool(p, z.fl);
  const H = figure(p, z, sh);
  poolFront(p, z.fl, z.Lh ? [CX] : z.Rh && f.a !== 'attack' ? [CX, CX - 35] : [CX, CX - 35].concat(z.Rh ? [] : [CX + 35]));
  // Lichtbänder von den sechs Kristallen in die leere Fassung (Aufladen)
  if (f.a === 'special') for (let k = 0; k < 6; k++) {
    const n = 40;
    for (let q = 2; q < n; q++) { const t = q / n, x = lerp(sh[k].x, H[0], t), y = lerp(sh[k].y, H[1], t) - Math.sin(t * Math.PI) * 6; if ((q + i * 3 + k) % 5 !== 0) { p.blend(x, y, alpha(t > 0.8 ? WHITE : EL[k][4], R(240 - t * 40))); p.blend(x, y + 1, alpha(EL[k][3], R(150 - t * 60))); } }
  }
  for (let k = 0; k < 6; k++) if (sh[k].front) shard(p, sh[k].x, sh[k].y, k, sh[k].s, sh[k].lit);
  // --- Effekte je Animation
  if (f.a === 'idle') for (let k = 0; k < 8; k++) { const cyc = (k * 5 + i * 3) % 18, x = CX - 30 + k * 8.6 + Math.sin(k * 2.3) * 3; p.blend(x, 108 - cyc * 2.2, alpha(WL[5], 200 - cyc * 10)); }
  if (f.a === 'windup' && z.Rh) {
    const h = z.Rh;
    glow(p, h[0], h[1], 8 + i * 5, WL[4], 70); spark(p, h[0], h[1], WHITE, WL[5], 2 + i * 2);
    // Wasser rinnt vom gehobenen Arm
    for (let k = 0; k < 7; k++) { const x = h[0] - 13 + k * 4 + R(rnd2(k, 1, 6) * 2), y0 = h[1] + 8 + R(rnd2(k, 2, 6) * 16) + i * 9, n = 3 + R(rnd2(k, 3, 6) * 5); for (let j = 0; j < n; j++) if (y0 + j < 112) p.blend(x, y0 + j, alpha(j === n - 1 ? WHITE : WL[j > n - 3 ? 5 : 4], 120 + j * (130 / n))); }
    if (i === 0) for (let k = 0; k < 10; k++) p.blend(100 + k * 2.4, 112 - Math.sin((k / 9) * Math.PI) * 7, alpha(WHITE, 220));
  }
  if (f.a === 'attack' && z.Rh) {
    const h = z.Rh;
    if (i === 0) { for (let a = -1.45; a < 0.1; a += 0.02) for (let r = 36; r < 50; r += 1) { const t = (a + 1.45) / 1.55, x = 94 + Math.cos(a) * r * 0.62, y = 62 + Math.sin(a) * r; if (x < 124 && y > 2) p.blend(x, y, alpha(r > 46 ? WHITE : r > 41 ? WL[5] : WL[4], R(120 * t * t))); } spark(p, h[0], h[1], WHITE, WL[5], 3); }
    if (i >= 1) {
      // Aufschlag: Fontäne aus Wasserlicht, Kristallsplitter, Stoßwelle
      const k = i === 1 ? 1 : 0.75, cx = 101;
      for (let j = 0; j < 46; j++) { const a = -Math.PI * rnd2(j, 1, 8), d = (8 + rnd2(j, 2, 8) * 26) * (i === 1 ? 0.7 : 1), x = cx + Math.cos(a) * d * 0.8, y = 113 + Math.sin(a) * d * (0.9 + rnd2(j, 3, 8) * 0.6); if (x > 2 && x < 124 && y > 2) { p.set(x, y, j % 4 === 0 ? WHITE : WL[j % 3 ? 5 : 4]); if (j % 3 === 0) p.set(x, y + 1, WL[4]); } }
      lay(p, (l) => { for (const [dx, hh, ln] of [[-13, 20, -4], [-4, 30, -1], [6, 34, 3], [15, 22, 6]] as const) prism(l, cx + dx, 116, cx + dx + ln * k, 116 - hh * k, 2.8, CR, { seed: 40 + dx, clipY: 999 }); });
      for (let x = cx - 30; x < Math.min(124, cx + 23); x++) { const u = (x - cx) / 30, y = 119 - R((1 - u * u) * (i === 1 ? 4 : 2)); if (Math.abs(u) < 0.95 && (x + i) % 5 !== 0) { p.blend(x, y, alpha(WHITE, R(255 * (1 - u * u * 0.7)))); p.blend(x, y + 1, alpha(WL[4], R(200 * (1 - u * u)))); } }
      glow(p, cx, 108, 18, WL[4], i === 1 ? 70 : 36);
    }
  }
  if (f.a === 'attack' && i === 3) for (let j = 0; j < 14; j++) p.blend(88 + rnd2(j, 1, 9) * 36, 112 - rnd2(j, 2, 9) * 30, alpha(j % 2 ? WHITE : WL[5], 200 - j * 10));
  if (f.a === 'special') {
    for (const h of [z.Lh, z.Rh]) if (h) { glow(p, h[0], h[1] - 6, 7, WL[4], 70); spark(p, h[0], h[1] - 9, WHITE, WL[5], 1 + (i % 2)); }
    for (let k = 0; k < 14; k++) { const cyc = (k * 4 + i * 5) % 20, x = CX - 44 + k * 6.8; p.blend(x, 110 - cyc * 3.4, alpha(k % 3 ? WL[5] : WHITE, 220 - cyc * 9)); }
  }
  if (f.a === 'death') {
    // Risse reißen auf, darunter bricht Licht hervor
    cracks(p, [[CX, 30], [CX - 20, 56], [CX + 22, 60], [CX - 6, 84], [CX + 10, 98], [CX - 34, 84], [CX + 34, 88], [CX, 50]], [0.3, 0.55, 0.8, 1][i], 27, i >= 2 ? WHITE : WL[5], undefined, 26);
    if (i >= 2) glow(p, CX, 62, 30, WHITE, i === 3 ? 44 : 22);
    if (i === 3) rays(p, CX, 62, 10, 44, 14, 0.3, WHITE, 120);
  }
  void INK;
};

export const aetherion: BossDef = { w: 128, h: 128, fn };
