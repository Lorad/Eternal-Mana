/** Waffenspuren und Treffer: handgesetzte Schmierbögen (helle Führungskante → zerfallender Schweif) und Einschläge. */
import type { Px, Pt } from '../draw';
import { P, WHITE, rnd2 } from '../palette';
import { DEG, G, TAU, W, WH, anim, arcSmear, at, burst, burstStar, cut, dissolve, ering, heatOf, heatW, hollow, kite, needle, puff, rock, streak, twinkle, withA } from './kit';
import type { Item } from './kit';

/** Einzelpixel entlang eines Ellipsenbogens (abgerissene Funken / Schweifreste). */
function arcDots(p: Px, cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number, seed: number, c: (i: number) => number, r0 = 0.9, r1 = 1.04): void {
  for (let i = 0; i < n; i++) {
    const a = (a0 + (a1 - a0) * rnd2(i, 1, seed)) * DEG, r = r0 + (r1 - r0) * rnd2(i, 2, seed);
    const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
    p.set(x, y, c(i));
    if (rnd2(i, 3, seed) < 0.3) p.set(x + 1, y, c(i));
  }
}

export function weaponItems(out: Item[]): void {
  // ------------------------------------------------------------ Schwert: breite Sichel, Drehpunkt (6,32)
  anim(out, 'slash_sword', 6, 64, 64, (p, k) => {
    const A = { cx: 6, cy: 32, rx: 54, ry: 29.5 };
    const a0 = [-84, -82, -66, -30, 6, 36][k], a1 = [-34, 26, 74, 80, 83, 84][k];
    const w = [6, 12, 13, 8, 5, 3][k], gain = [1.4, 1.4, 1.22, 0.92, 0.68, 0.5][k], br = [0, 0, 0.1, 0.42, 0.72, 0.9][k];
    if (k >= 1 && k <= 3) arcSmear(p, { ...A, rx: 39, ry: 21, a0: a0 + 16, a1: a1 - 12, w: 2.2, gain: gain * 0.62, breakup: 0.2 + k * 0.16, seed: 23, comb: 1 });
    arcSmear(p, { ...A, a0, a1, w, gain, breakup: br, seed: 11 });
    if (k === 1 || k === 2) arcDots(p, A.cx, A.cy, A.rx, A.ry, a1 + 2, a1 + 12, 4, 40 + k, () => WH, 0.86, 1.0);
    if (k >= 2) arcDots(p, A.cx, A.cy, A.rx, A.ry, a0 - 30, a0 + 4, [0, 0, 7, 10, 9, 7][k], 50 + k, (i) => G(0.62 + 0.3 * rnd2(i, 9, k), k >= 4 ? 200 : 255), 0.84, 1.03);
    if (k === 5) arcDots(p, A.cx, A.cy, A.rx, A.ry, 30, 84, 8, 77, (i) => G(0.6 + 0.3 * rnd2(i, 9, 5), 190), 0.8, 1.02);
  });

  // ------------------------------------------------------------ Schwerer Hieb: Doppelklinge, Geschwindigkeitslinien, Nachbild
  anim(out, 'slash_heavy', 7, 80, 80, (p, k) => {
    const A = { cx: 8, cy: 40, rx: 62, ry: 33 };
    const a0 = [-87, -86, -74, -46, -62, -30, 20][k], a1 = [-46, 4, 60, 82, 84, 85, 86][k];
    const w = [10, 21, 23, 18, 15, 12, 4][k], gain = [1.4, 1.45, 1.36, 1.1, 0.85, 0.66, 0.5][k], br = [0, 0, 0.06, 0.22, 0.25, 0.6, 0.9][k];
    // äußere Geschwindigkeitslinien (dünne Bögen knapp außerhalb)
    if (k >= 1 && k <= 4) for (let i = 0; i < 3; i++) {
      const s = 1.05 + i * 0.035, lag = 10 + i * 14;
      arcSmear(p, { ...A, rx: A.rx * s, ry: A.ry * s, a0: Math.max(-88, a0 - 6 + lag), a1: a1 - lag * 0.6, w: 1.7, gain: gain * 0.75, breakup: 0.3 + 0.15 * k, seed: 31 + i, comb: 0 });
    }
    // innere zweite Schneide (nachlaufend)
    if (k >= 1 && k <= 5) arcSmear(p, { ...A, rx: A.rx * 0.66, ry: A.ry * 0.66, a0: a0 + 10, a1: a1 - 16, w: at([0, 8, 11, 9, 6, 5], k), gain: gain * 0.9, breakup: br + 0.1, seed: 29, edge: k >= 4 });
    arcSmear(p, { ...A, a0, a1, w, gain, breakup: br, seed: 17, edge: k === 4 || k === 5 });
    if (k === 4) arcSmear(p, { ...A, rx: A.rx - 2, ry: A.ry - 2, a0: a0 + 6, a1: a1 - 4, w: 8, gain: 0.18, breakup: 0.55, seed: 19, heat: () => G(0.66, 120) });
    // Aufschlagfunke am Ende des Schwungs
    if (k === 2 || k === 3) {
      const ah = a1 * DEG, hx = A.cx + Math.cos(ah) * A.rx * 0.93, hy = A.cy + Math.sin(ah) * A.ry * 0.93;
      burstStar(p, hx, hy, 5, 2, k === 2 ? 6 : 8, 0.4 + k, WH, 3 + k);
      for (const pt of burst(61, 5, ah - 0.3, ah + 1.7)) { const r = (k - 1) * 5 * pt.v; p.set(hx + Math.cos(pt.a) * r, hy + Math.sin(pt.a) * r, WH); }
    }
    if (k >= 3) arcDots(p, A.cx, A.cy, A.rx, A.ry, a0 - 34, a0 + 6, [0, 0, 0, 9, 12, 12, 8][k], 80 + k, (i) => G(0.6 + 0.34 * rnd2(i, 9, k), k >= 5 ? 190 : 255), 0.78, 1.06);
    if (k === 6) arcDots(p, A.cx, A.cy, A.rx, A.ry, 0, 86, 14, 91, (i) => G(0.58 + 0.3 * rnd2(i, 9, 6), 180), 0.62, 1.05);
  });

  // ------------------------------------------------------------ Dolch: zwei schnelle, dünne Kreuzschnitte
  anim(out, 'slash_dagger', 5, 48, 40, (p, k) => {
    const A: [Pt, Pt, Pt] = [[7, 5], [31, 13], [45, 35]], B: [Pt, Pt, Pt] = [[7, 35], [31, 27], [45, 5]];
    const ca = [[0, 0.6, 1.5, 0], [0.12, 1, 1.45, 0], [0.5, 1, 0.85, 0.3], [0.8, 1, 0.55, 0.65]][k];
    const cb = [null, [0, 0.45, 1.5, 0], [0.04, 1, 1.5, 0], [0.5, 1, 0.9, 0.3], [0.78, 1, 0.55, 0.65]][k];
    if (ca) cut(p, A[0], A[1], A[2], 4.2, ca[0], ca[1], heatW, { gain: ca[2], breakup: ca[3], seed: 5 });
    if (cb) cut(p, B[0], B[1], B[2], 4.2, cb[0], cb[1], heatW, { gain: cb[2], breakup: cb[3], seed: 9 });
    if (k === 2) { twinkle(p, 30, 20, 3, WH, G(0.85)); p.set(45, 4, WH); p.set(46, 36, G(0.8)); }
    if (k === 1) { p.set(46, 36, WH); p.set(44, 37, G(0.8)); }
    if (k === 3) { twinkle(p, 30, 20, 1, G(0.9)); p.set(46, 3, G(0.85)); p.set(42, 2, G(0.7)); }
    if (k === 4) for (const [x, y, v] of [[44, 34, 0.8], [38, 28, 0.6], [45, 6, 0.9], [41, 9, 0.7], [36, 14, 0.55], [47, 37, 0.6]] as const) p.set(x, y, G(v, 210));
  });

  // ------------------------------------------------------------ Stich: Speerstreifen nach rechts
  anim(out, 'thrust', 4, 56, 20, (p, k) => {
    const x0 = [0, 2, 24, 40][k], x1 = [32, 55, 56, 56][k], wm = [4.2, 5, 3, 1.4][k], gain = [1.45, 1.45, 0.95, 0.6][k], br = [0, 0, 0.3, 0.7][k];
    for (let x = x0; x < x1; x++) {
      const t = (x - x0) / (x1 - x0 - 1), hw = wm * (t < 0.78 ? 0.16 + 0.84 * Math.pow(t / 0.78, 1.6) : Math.pow((1 - t) / 0.22, 0.85));
      for (let y = 0; y < 20; y++) {
        const d = Math.abs(y + 0.5 - 10);
        if (d > hw) continue;
        if (br > 0 && rnd2(Math.floor(x / 3), y, 3 + k) < br * (1.2 - t)) continue;
        p.set(x, y, heatW(gain * (0.35 + 0.65 * (1 - d / (hw + 0.3))) * (0.4 + 0.6 * t)));
      }
    }
    if (k === 1 || k === 2) for (const [y, a, b] of [[3, 6, 34], [6, 14, 44], [14, 10, 46], [17, 4, 30]] as const) streak(p, a + (k === 2 ? 14 : 0), y, b + (k === 2 ? 4 : 0), y, heatW, k === 1 ? 0.8 : 0.55, k === 1 ? 0.25 : 0.55, y);
    if (k === 0) { streak(p, 0, 5, 16, 5, heatW, 0.7, 0.2, 1); streak(p, 0, 15, 18, 15, heatW, 0.7, 0.2, 2); }
    if (k === 1) { twinkle(p, 53, 10, 3, WH, G(0.9)); }
    if (k === 3) for (const [x, y] of [[30, 6], [36, 14], [44, 4], [50, 16], [26, 10], [34, 9]] as const) p.set(x, y, G(0.7, 200));
  });

  // ------------------------------------------------------------ Hammerschlag (farbig gold-weiß): Einschlag, Bodenring, Staub, Splitter
  anim(out, 'smash_hammer', 7, 72, 56, (p, k) => {
    const g = P.gold, cx = 36, gy = 40;
    const dust = [P.tan[2], P.tan[3], P.cream[3], P.cream[4]];
    // Bodenring (hinten zuerst, damit der Ausbruch davor liegt)
    const rr = [0, 13, 22, 29, 33, 35, 0][k], rth = [0, 4, 3.4, 2.4, 1.6, 1.2, 0][k];
    if (rr) ering(p, cx, gy, rr, rr * 0.38, rth, (a, e) => {
      if (k >= 4 && rnd2(Math.floor((a + 4) * 6), 1, k) < (k - 3) * 0.3) return 0;
      if (k === 3 && rnd2(Math.floor((a + 4) * 5), 1, 3) < 0.12) return 0;
      return k <= 1 ? (e < 0.5 ? WHITE : g[4]) : k === 2 ? (e < 0.4 ? g[4] : g[3]) : k === 3 ? (e < 0.5 ? g[3] : g[2]) : k === 4 ? g[2] : withA(g[2], 190);
    });
    // Staubballen links/rechts, wandern nach außen und oben
    if (k >= 2) for (const [sx, s] of [[-1, 1], [1, 0.85], [-0.45, 0.6], [0.55, 0.7]] as const) {
      const t = k - 2, x = cx + sx * (14 + t * 5.4), y = gy - 2 - t * 1.6 - (1 - Math.abs(sx)) * 3;
      const r = s * [4, 6.4, 6, 4.4, 2.6][t];
      puff(p, x, y, r, dust, 7 + sx * 3, 4);
    }
    if (k >= 4) dissolve(p, (k - 3) * 0.2, 31 + k, 2);
    // Fallspur des Hammers + Einschlagstern
    if (k === 0) {
      for (let y = 4; y < 38; y++) { const t = (y - 4) / 34, hw = 0.6 + 3 * t * t; for (let x = -4; x <= 4; x++) if (Math.abs(x) <= hw && rnd2(x, Math.floor(y / 3), 4) > 0.5 - t) p.set(cx + x, y, Math.abs(x) < hw * 0.5 ? WHITE : g[4]); }
      burstStar(p, cx, gy - 3, 6, 4, 13, 0.3, g[3], 2); burstStar(p, cx, gy - 3, 6, 3, 9, 0.3, WHITE, 2);
    }
    if (k === 1 || k === 2) {
      const s = k === 1 ? 1 : 0.86;
      // Fächer aus Lichtsplittern nach oben/seitlich
      for (const pt of burst(21, 9, -168 * DEG, -12 * DEG)) { const len = (k === 1 ? 20 : 27) * (0.6 + 0.5 * pt.s) * (0.6 + 0.4 * Math.abs(Math.sin(pt.a))), r0 = k === 1 ? 5 : 11; needle(p, cx + Math.cos(pt.a) * r0, gy - 3 + Math.sin(pt.a) * r0, pt.a, len - r0, 3.4, pt.q > 0.5 ? g[3] : g[4]); }
      burstStar(p, cx, gy - 4, 9, 9 * s, 20 * s, 0.2, g[2], 6); burstStar(p, cx, gy - 4, 9, 7 * s, 16 * s, 0.2, g[3], 6);
      burstStar(p, cx, gy - 4, 8, 5 * s, 12 * s, 0.5, g[4], 7); burstStar(p, cx, gy - 4, 7, 3 * s, 8 * s, 0.1, WHITE, 8);
      if (k === 2) hollow(p, cx, gy - 4, 5, 2, 4);
    }
    if (k === 3) { for (const pt of burst(21, 9, -168 * DEG, -12 * DEG)) { const r = 20 + 9 * pt.s; kite(p, cx + Math.cos(pt.a) * r, gy - 3 + Math.sin(pt.a) * r * 0.95, pt.a, 5 + 3 * pt.q, 2, pt.q > 0.5 ? g[3] : g[4]); } twinkle(p, cx, gy - 5, 2, g[4], g[3]); }
    if (k === 4) for (const pt of burst(21, 9, -168 * DEG, -12 * DEG)) { const r = 27 + 9 * pt.s; p.set(cx + Math.cos(pt.a) * r, gy - 4 + Math.sin(pt.a) * r * 0.95, g[3]); if (pt.q > 0.5) p.set(cx + Math.cos(pt.a) * (r - 2), gy - 4 + Math.sin(pt.a) * (r - 2) * 0.95, g[2]); }
    // Steinsplitter auf Wurfbahnen
    if (k >= 1) for (const [i, pt] of burst(33, 8, -160 * DEG, -20 * DEG).entries()) {
      const t = k - 0.4, x = cx + Math.cos(pt.a) * pt.v * 5.6 * t, y = Math.min(gy + 3 + pt.q * 5, gy - 4 + Math.sin(pt.a) * pt.v * 9 * t + 1.25 * t * t);
      if (k === 6 && i % 2) continue;
      rock(p, x, y, k >= 5 ? 1.2 : 1.3 + pt.s * 1.6, k * 0.9 + i, [P.stone[1], P.stone[3], P.stone[4]], i);
    }
    if (k >= 5) for (const pt of burst(47, k === 5 ? 12 : 9)) { const r = 18 + 16 * pt.s; p.set(cx + Math.cos(pt.a) * r, gy - 3 + Math.sin(pt.a) * r * 0.4 - pt.q * 8, pt.q > 0.5 ? g[2] : dust[2]); }
  });

  // ------------------------------------------------------------ Klaue: drei parallele Risse
  anim(out, 'claw', 4, 40, 40, (p, k) => {
    for (let i = -1; i <= 1; i++) {
      const ox = i * 7.4, oy = -i * 5.4, lag = Math.abs(i) * 0.09 + (i === 1 ? 0.04 : 0);
      const seg = [[0, 0.56 - lag], [0.04 + lag * 0.5, 1 - lag * 0.6], [0.46 + lag, 1 - lag * 0.3], [0.76 + lag, 1]][k];
      const a: Pt = [9 + ox + Math.abs(i) * 2, 5 + oy + Math.abs(i) * 3], b: Pt = [30 + ox - Math.abs(i) * 1, 36 + oy - Math.abs(i) * 2], c: Pt = [25 + ox, 15 + oy];
      cut(p, a, c, b, i === 0 ? 5.4 : 4.4, seg[0], seg[1], heatW, { gain: [1.45, 1.45, 0.9, 0.58][k], breakup: [0, 0, 0.28, 0.66][k], seed: 3 + i, fat: 0.55 });
    }
    if (k === 1) for (const [x, y] of [[33, 37], [37, 30], [24, 38]] as const) p.set(x, y, WH);
    if (k >= 2) for (const pt of burst(5 + k, k === 2 ? 5 : 8, 20 * DEG, 100 * DEG)) p.set(22 + Math.cos(pt.a) * (10 + 9 * pt.s), 22 + Math.sin(pt.a) * (10 + 9 * pt.s), G(0.6 + 0.3 * pt.q, 210));
  });

  // ------------------------------------------------------------ Biss: zuschnappende Kieferbögen
  anim(out, 'bite', 4, 32, 32, (p, k) => {
    const gap = [11, 7, 3.4, 5][k], v = k === 3 ? 0.72 : 1, tc = k === 3 ? G(0.8) : WH, gc = G(0.62 * v, k === 3 ? 170 : 255);
    const jaw = (dirY: number, xs: readonly number[], ls: readonly number[]): void => {
      const base = (x: number): number => 16 + dirY * (gap + 5 - Math.pow(x / 13, 2) * 4.5);
      for (let x = -13; x <= 13; x++) p.set(16 + x, base(x), gc);
      xs.forEach((x, i) => {
        const y = base(x), l = ls[i] + (k === 1 ? 1 : 0);
        p.poly([[16 + x - 2.2, y], [16 + x + 2.2, y], [16 + x + (x < 0 ? 0.6 : -0.6), y - dirY * l]], tc);
        p.line(16 + x, y, 16 + x + (x < 0 ? 0.6 : -0.6), y - dirY * l, tc);
      });
    };
    jaw(-1, [-10, -5, 0, 5, 10], [4, 7, 4, 7, 4]);
    jaw(1, [-7.5, -2.5, 2.5, 7.5], [6, 4, 4, 6]);
    if (k === 0) for (const x of [-9, -3, 4, 10]) { streak(p, 16 + x, 0, 16 + x, 3, heatW, 0.6, 0.2, x); streak(p, 16 + x + 1, 31, 16 + x + 1, 28, heatW, 0.6, 0.2, x + 1); }
    if (k === 1) for (const x of [-11, -6, 1, 7, 12]) { streak(p, 16 + x, 1, 16 + x, 6, heatW, 0.7, 0.3, x); streak(p, 16 + x, 30, 16 + x, 25, heatW, 0.7, 0.3, x + 2); }
    if (k === 2) { kite(p, 16, 16, 0, 31, 1.8, WH); p.set(1, 16, WH); p.set(30, 16, WH); for (const pt of burst(9, 7)) p.set(16 + Math.cos(pt.a) * (12 + 3 * pt.s), 16 + Math.sin(pt.a) * (5 + 8 * pt.s), WH); }
    if (k === 3) { dissolve(p, 0.5, 4, 1); for (const pt of burst(19, 9)) p.set(16 + Math.cos(pt.a) * (11 + 4 * pt.s), 16 + Math.sin(pt.a) * (9 + 5 * pt.s), G(0.7, 200)); }
  });

  // ------------------------------------------------------------ Treffer (tintbar): Stern mit wegfliegenden Splittern
  anim(out, 'hit', 5, 32, 32, (p, k) => {
    const sh = burst(14, 7);
    if (k === 0) { burstStar(p, 16, 16, 4, 2.2, 9, 0.2, G(0.84), 1, 0.1); burstStar(p, 16, 16, 4, 1.4, 6, 0.2, WH, 1, 0.1); }
    if (k === 1) { burstStar(p, 16, 16, 7, 5.5, 15, 0.3, G(0.74), 2, 0.34); burstStar(p, 16, 16, 7, 4.2, 12, 0.3, WH, 2, 0.34); for (const s of sh) needle(p, 16 + Math.cos(s.a) * 8, 16 + Math.sin(s.a) * 8, s.a, 5 + 3 * s.s, 1, WH); }
    if (k === 2) {
      burstStar(p, 16, 16, 7, 7.5, 14.5, 0.3, G(0.8), 2, 0.34); hollow(p, 16, 16, 6.2, 1.5);
      for (const s of sh) kite(p, 16 + Math.cos(s.a) * 11.5, 16 + Math.sin(s.a) * 11.5, s.a, 6 + 2 * s.s, 2.2, WH);
    }
    if (k === 3) {
      burstStar(p, 16, 16, 7, 9, 14, 0.3, G(0.66, 220), 2, 0.34); hollow(p, 16, 16, 10.5, 2.5); dissolve(p, 0.35, 3);
      for (const s of sh) kite(p, 16 + Math.cos(s.a) * (12.5 + s.v), 16 + Math.sin(s.a) * (12.5 + s.v), s.a, 3.5, 1, G(0.92));
    }
    if (k === 4) for (const s of sh) { const r = 13 + s.v * 1.6; p.set(16 + Math.cos(s.a) * r, 16 + Math.sin(s.a) * r, G(0.72, 220)); if (s.q > 0.5) p.set(16 + Math.cos(s.a + 0.3) * (r - 3), 16 + Math.sin(s.a + 0.3) * (r - 3), G(0.58, 180)); }
  });

  // ------------------------------------------------------------ Kritischer Treffer (farbig): gelb-weißer Stern, rot-oranger Kranz, lange Spitzen
  anim(out, 'hit_crit', 6, 48, 48, (p, k) => {
    const f = P.fire, red = P.red[2], c = 24;
    const spikes = (len: number, w: number, col: number, diag: number): void => {
      for (let i = 0; i < 4; i++) needle(p, c, c, (i * TAU) / 4, len * (i % 2 ? 0.82 : 1), w, col);
      if (diag) for (let i = 0; i < 4; i++) needle(p, c, c, (i * TAU) / 4 + TAU / 8, diag, w * 0.8, col);
    };
    if (k === 0) { burstStar(p, c, c, 4, 3, 13, 0, f[3], 1, 0.05); burstStar(p, c, c, 4, 2, 9, 0, WHITE, 1, 0.05); }
    if (k === 1) {
      burstStar(p, c, c, 11, 8.5, 20, 0.15, red, 3); burstStar(p, c, c, 11, 7.5, 17, 0.15, f[2], 3); spikes(22, 5, f[2], 15);
      burstStar(p, c, c, 9, 5.5, 13.5, 0.4, f[3], 4); spikes(20, 3.2, f[4], 12); burstStar(p, c, c, 8, 3.2, 9, 0.2, WHITE, 5); spikes(15, 1.6, WHITE, 0);
    }
    if (k === 2) {
      burstStar(p, c, c, 11, 11, 23.5, 0.15, red, 3); burstStar(p, c, c, 11, 9.5, 20.5, 0.15, f[2], 3); spikes(24, 5.6, f[2], 19);
      burstStar(p, c, c, 9, 7.5, 16.5, 0.4, f[3], 4); spikes(24, 3.4, f[4], 16); burstStar(p, c, c, 8, 4.5, 11.5, 0.2, WHITE, 5); spikes(21, 1.8, WHITE, 11);
    }
    if (k === 3) {
      burstStar(p, c, c, 11, 13, 23.5, 0.15, red, 3); burstStar(p, c, c, 11, 11.5, 20, 0.15, f[2], 3); burstStar(p, c, c, 9, 9, 16, 0.4, f[3], 4);
      hollow(p, c, c, 8.5, 1.2);
      for (let i = 0; i < 8; i++) { const a = (i * TAU) / 8, r = i % 2 ? 15 : 18; kite(p, c + Math.cos(a) * r, c + Math.sin(a) * r, a, i % 2 ? 7 : 11, 2.4, i % 2 ? f[4] : WHITE); }
      twinkle(p, c, c, 2, WHITE, f[4]);
    }
    if (k === 4) {
      burstStar(p, c, c, 11, 15, 23.5, 0.15, red, 3); burstStar(p, c, c, 11, 14, 20.5, 0.15, f[2], 3); hollow(p, c, c, 14.5, 2.2); dissolve(p, 0.3, 8, 2);
      for (let i = 0; i < 8; i++) { const a = (i * TAU) / 8, r = i % 2 ? 18 : 21; kite(p, c + Math.cos(a) * r, c + Math.sin(a) * r, a, i % 2 ? 3 : 5, 1, i % 2 ? f[3] : f[4]); }
    }
    if (k >= 4) for (const s of burst(8, k === 4 ? 8 : 14)) { const r = (k === 4 ? 12 : 16) + 7 * s.s; p.set(c + Math.cos(s.a) * r, c + Math.sin(s.a) * r, s.q > 0.66 ? f[4] : s.q > 0.33 ? f[2] : red); }
  });

  // ------------------------------------------------------------ Magietreffer (tintbar): Ring und Funken
  anim(out, 'hit_magic', 5, 32, 32, (p, k) => {
    const sp = burst(27, 6);
    if (k === 0) { p.ell(16, 16, 4.5, 4.5, G(0.8)); p.ell(16, 16, 3, 3, WH); twinkle(p, 16, 16, 7, WH, G(0.8)); }
    if (k === 1) { ering(p, 16, 16, 8.5, 8.5, 3.2, (_a, e) => (e < 0.55 ? WH : G(0.78))); twinkle(p, 16, 16, 4, WH, G(0.85)); p.rect(15, 15, 3, 3, WH); for (const s of sp) p.set(16 + Math.cos(s.a) * 6, 16 + Math.sin(s.a) * 6, WH); }
    if (k === 2) { ering(p, 16, 16, 12, 12, 2.2, (_a, e) => (e < 0.5 ? WH : G(0.74))); for (const s of sp) twinkle(p, 16 + Math.cos(s.a + 0.4) * (7.5 + s.s), 16 + Math.sin(s.a + 0.4) * (7.5 + s.s), s.q > 0.5 ? 2 : 1, WH, G(0.8)); twinkle(p, 16, 16, 1, G(0.9)); }
    if (k === 3) { ering(p, 16, 16, 14.6, 14.6, 1.5, (a) => (Math.sin(a * 7 + 1) > -0.25 ? G(0.8) : 0)); for (const s of sp) twinkle(p, 16 + Math.cos(s.a + 0.8) * (10 + 2 * s.s), 16 + Math.sin(s.a + 0.8) * (10 + 2 * s.s), s.q > 0.5 ? 1 : 0, WH); }
    if (k === 4) { ering(p, 16, 16, 15.6, 15.6, 1.1, (a) => (Math.sin(a * 7 + 1.6) > 0.55 ? G(0.66, 200) : 0)); for (const s of sp) p.set(16 + Math.cos(s.a + 1.1) * (12 + 2 * s.s), 16 + Math.sin(s.a + 1.1) * (12 + 2 * s.s), G(0.85)); }
  });

  // ------------------------------------------------------------ Block (blass, eisweiß): Schildblitz
  anim(out, 'block', 4, 32, 32, (p, k) => {
    const ice = P.ice;
    const sh = (s: number): Pt[] => ([[-9, -11], [0, -13], [9, -11], [10, -1], [6, 8], [0, 13], [-6, 8], [-10, -1]] as const).map(([x, y]) => [16 + x * s, 16 + y * s] as Pt);
    if (k === 0) { p.poly(sh(0.72), ice[3]); p.poly(sh(0.56), WHITE); burstStar(p, 16, 15, 4, 2, 12, 0.78, WHITE, 1, 0.1); }
    if (k === 1) {
      p.poly(sh(1), WHITE); p.poly(sh(0.84), 0); p.poly(sh(0.84), withA(ice[2], 120));
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const c = p.get(x, y); if (c >>> 24 > 0 && c >>> 24 < 255) { const d = x + y; if ((d >= 22 && d <= 25) || d === 28) p.set(x, y, withA(WHITE, 215)); } }
      p.line(16, 4, 16, 27, withA(WHITE, 170)); p.line(8, 12, 24, 12, withA(WHITE, 170));
      burstStar(p, 16, 12, 5, 1.5, 6, 0.3, WHITE, 2, 0.2);
      for (const s of burst(3, 6)) p.set(16 + Math.cos(s.a) * 14.5, 16 + Math.sin(s.a) * 14.5, WHITE);
    }
    if (k === 2) { p.poly(sh(1.14), ice[3]); p.poly(sh(1.03), 0); dissolve(p, 0.26, 5, 2); for (const s of burst(3, 6)) p.set(16 + Math.cos(s.a + 0.2) * 12, 16 + Math.sin(s.a + 0.2) * 12, WHITE); for (const d of [22, 25]) for (let x = 9; x < 15; x += 2) p.set(x, d - x, withA(WHITE, 200)); }
    if (k === 3) { p.poly(sh(1.2), ice[2]); p.poly(sh(1.12), 0); dissolve(p, 0.68, 6, 1); for (const s of burst(13, 5)) p.set(16 + Math.cos(s.a) * 9, 16 + Math.sin(s.a) * 9, ice[3]); }
  });
}
void W; void heatOf; void TAU;
