/** Magie und Statuseffekte: Runenkreise, Zauberaufbau, Lichtsäule, Heilung, Buffs, Schild, Stufenaufstieg, Statusschleifen. */
import type { Px, Pt } from '../draw';
import { P, WHITE, mix, INK, rnd2 } from '../palette';
import { DEG, G, TAU, W, WH, anim, burst, burstStar, dissolve, ering, flame, hollow, kite, one, puff, streak, twinkle, withA } from './kit';
import type { Item } from './kit';
import { bmp } from './particles';

const GLYPHS = [['#.#', '.#.', '#.#'], ['###', '#..', '###'], ['.#.', '###', '.#.'], ['#.#', '###', '..#'], ['##.', '.#.', '.##'], ['#..', '###', '..#'], ['###', '.#.', '.#.'], ['#.#', '#.#', '.#.']];

/** Runenkreis in ¾-Sicht: Ellipse rx × ry um (cx,cy). */
function runeCircle(p: Px, cx: number, cy: number, rx: number, ry: number, big: boolean): void {
  const q = ry / rx, pt = (a: number, r: number): Pt => [cx + Math.cos(a) * r, cy + Math.sin(a) * r * q];
  const ring = (r: number, th: number, c: number): void => ering(p, cx, cy, r, r * q, th, () => c);
  const star = (n: number, step: number, r: number, rot: number, c: number): void => {
    for (let i = 0; i < n; i++) { const a = pt(rot + (i * TAU) / n, r), b = pt(rot + ((i + step) * TAU) / n, r); p.line(a[0], a[1], b[0], b[1], c); }
  };
  // schwache Füllung
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) { const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry); if (d < 0.8) p.set(x, y, W(22)); else if (d < 0.98) p.set(x, y, W(40)); }
  const rIn = rx * (big ? 0.78 : 0.8), rBand = rx * (big ? 0.87 : 0.895);
  ring(rx, big ? 2 : 1.6, WH); ring(rIn, 1.2, WH);
  if (big) { ring(rx - 3.4, 1, G(0.8, 200)); for (let i = 0; i < 24; i++) { const a = pt((i * TAU) / 24, rx - 2); p.set(a[0], a[1], WH); } }
  // Runenband
  const n = big ? 18 : 12;
  for (let i = 0; i < n; i++) {
    const c = pt((i * TAU) / n + 0.13, rBand), g = GLYPHS[(i * 5 + (big ? 3 : 0)) % GLYPHS.length];
    bmp(p, Math.round(c[0]) - 1, Math.round(c[1]) - 1, g, { '#': i % 3 === 0 ? WH : G(0.86) });
  }
  if (big) {
    star(8, 3, rIn - 1.5, TAU / 16, G(0.9, 230)); ring(rx * 0.5, 1.2, WH); star(6, 2, rx * 0.49, -TAU / 4, WH); ring(rx * 0.5 - 2.4, 0.9, G(0.8, 170));
    for (let i = 0; i < 4; i++) { const c = pt((i * TAU) / 4, rx * 0.64); ering(p, c[0], c[1], 5, 5 * q, 1.2, () => WH); p.rect(Math.round(c[0]) - 1, Math.round(c[1]) - 1, 2, 2, WH); }
    for (let i = 0; i < 4; i++) { const c = pt((i * TAU) / 4 + TAU / 8, rx * 0.64); twinkle(p, c[0], c[1], 2, WH, G(0.8)); }
    ring(rx * 0.17, 1.2, WH); twinkle(p, cx, cy, 3, WH, G(0.85));
  } else {
    star(6, 2, rIn - 1, -TAU / 4, G(0.94, 240)); ring(rx * 0.36, 1.1, WH);
    for (let i = 0; i < 6; i++) { const c = pt(-TAU / 4 + (i * TAU) / 6, rIn - 1); p.rect(Math.round(c[0]) - 1, Math.round(c[1]) - 1, 2, 2, WH); }
    twinkle(p, cx, cy, 3, WH, G(0.85));
  }
}

function hexEdge(x: number, y: number, s: number): number {
  // Abstand zur nächsten Sechseckkante (spitze Ausrichtung), in px
  const qx = ((Math.sqrt(3) / 3) * x - y / 3) / s, qy = ((2 / 3) * y) / s;
  let rx = Math.round(qx), ry = Math.round(qy); const rz = Math.round(-qx - qy);
  const dx = Math.abs(rx - qx), dy = Math.abs(ry - qy), dz = Math.abs(rz + qx + qy);
  if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz;
  const cx = s * Math.sqrt(3) * (rx + ry / 2), cy = s * 1.5 * ry, ax = Math.abs(x - cx), ay = Math.abs(y - cy);
  return s * (Math.sqrt(3) / 2) - Math.max(ax, ax * 0.5 + ay * (Math.sqrt(3) / 2));
}

export function magicItems(out: Item[]): void {
  one(out, 'rune_circle', 64, 64, (p) => runeCircle(p, 32, 32, 31.6, 21.8, false));
  one(out, 'rune_circle_big', 112, 80, (p) => runeCircle(p, 56, 40, 55.6, 39.6, true));
  // Warnring (Telegraph): gestrichelt, mit Zacken nach innen
  one(out, 'tele_ring', 64, 64, (p) => {
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (Math.hypot(x + 0.5 - 32, y + 0.5 - 32) < 27) p.set(x, y, W(26));
    ering(p, 32, 32, 31.6, 31.6, 3.2, (a, e) => { const u = (((a / TAU) * 16) % 1 + 1) % 1; return u < 0.66 ? (e < 0.6 ? WH : G(0.78)) : 0; });
    ering(p, 32, 32, 26.4, 26.4, 1.1, () => W(190));
    for (let i = 0; i < 4; i++) { const a = (i * TAU) / 4 + TAU / 8, x = 32 + Math.cos(a) * 25.5, y = 32 + Math.sin(a) * 25.5; p.poly([[x - Math.sin(a) * 3.4, y + Math.cos(a) * 3.4], [x + Math.sin(a) * 3.4, y - Math.cos(a) * 3.4], [x - Math.cos(a) * 6, y - Math.sin(a) * 6]], WH); }
  });

  // Zauberaufbau: Funken spiralen nach innen, dann Kernblitz
  anim(out, 'cast', 6, 40, 40, (p, k) => {
    const c = 20, sp = burst(11, 8);
    const pos = (s: { a: number; v: number }, t: number): Pt => { const r = Math.max(0, 18.5 - t * 4.6 * (0.85 + 0.2 * s.v)); const a = s.a + t * 0.75; return [c + Math.cos(a) * r, c + Math.sin(a) * r]; };
    if (k <= 4) sp.forEach((s, i) => {
      const t = k === 4 ? 3.6 : k;
      for (let j = 4; j >= 1; j--) { const q = pos(s, t - j * 0.22); p.set(q[0], q[1], G(0.9 - j * 0.09, j > 2 ? 190 : 255)); }
      const h = pos(s, t); twinkle(p, h[0], h[1], k === 4 ? 0 : i % 2 ? 1 : 2, WH, G(0.85));
    });
    if (k === 2) p.set(c, c, WH);
    if (k === 3) { twinkle(p, c, c, 2, WH, G(0.85)); ering(p, c, c, 9, 9, 1, (a) => (Math.sin(a * 5 + 1) > 0 ? G(0.7, 190) : 0)); }
    if (k === 4) { ering(p, c, c, 7, 7, 1.2, () => G(0.8)); p.ell(c, c, 3.6, 3.6, WH); twinkle(p, c, c, 7, WH, G(0.85)); }
    if (k === 5) {
      burstStar(p, c, c, 8, 5, 16, 0.2, G(0.76), 3, 0.3); burstStar(p, c, c, 8, 4, 12, 0.2, WH, 3, 0.3); hollow(p, c, c, 2.2, 1);
      for (const s of sp) { p.set(c + Math.cos(s.a) * 17, c + Math.sin(s.a) * 17, WH); p.set(c + Math.cos(s.a + 0.3) * 14, c + Math.sin(s.a + 0.3) * 14, G(0.8)); }
    }
  });

  // Lichtsäule (Anker unten Mitte): Stufenaufstieg, heilige Schläge
  anim(out, 'pillar', 7, 32, 96, (p, k) => {
    const cx = 16, gy = 91, hw = [1, 3.5, 7, 9.5, 6.5, 4.5, 0][k], top = [44, 0, 0, 0, 0, 0, 0][k], bot = [gy, gy, gy, gy, gy - 8, gy - 30, 0][k];
    const br = [0, 0, 0, 0.04, 0.3, 0.58, 1][k];
    if (k >= 1 && k <= 5) { const rx = [0, 9, 13, 14.5, 15, 15.5][k]; ering(p, cx, gy, rx, rx * 0.3, k <= 3 ? 20 : k === 4 ? 2 : 1.2, (a, e) => (k === 5 && Math.sin(a * 6) > 0 ? 0 : k <= 3 ? (e > 0.4 ? WH : G(0.8)) : G(0.8, k === 5 ? 180 : 255))); }
    if (k === 0) p.ell(cx, gy, 6, 2, WH);
    if (hw) for (let y = top; y <= bot; y++) for (let dx = -Math.ceil(hw); dx < Math.ceil(hw); dx++) {
      const d = Math.abs(dx + 0.5), fl = hw + (k >= 2 && k <= 3 && rnd2(Math.floor(y / 4), dx < 0 ? 0 : 1, k) > 0.6 ? 1 : 0);
      if (d > fl) continue;
      if (br && rnd2(dx, Math.floor((y + dx * 3) / 7), 5 + k) < br) continue;
      const e = d / hw;
      let c = e < 0.42 ? WH : e < 0.72 ? G(0.9) : G(0.74);
      if (k >= 2 && e < 0.42 && (dx === -2 || dx === 1) && (y + k * 9 + dx * 5) % 13 < 5) c = G(0.9);
      p.set(cx + dx, y, c);
    }
    // aufsteigende Striche neben der Säule
    if (k >= 2 && k <= 5) for (const [dx, ph] of [[-12, 0], [-10, 31], [10, 17], [13, 47], [-14, 60], [11, 70]] as const) {
      const y0 = (((ph - k * 23) % 90) + 90) % 90;
      for (let j = 0; j < 9; j++) if (y0 + j < gy - 2) p.set(cx + dx, y0 + j, G(j < 3 ? 0.95 : 0.72, j < 6 ? 255 : 180));
    }
    if (k === 0) twinkle(p, cx, top, 3, WH, G(0.8));
    if (k >= 4) for (const [i, s] of burst(7, 9).entries()) { const y = 80 - s.s * 70 - (k - 4) * 6, x = cx + (s.q - 0.5) * 22; if (y > 2) twinkle(p, x, y, k === 6 ? (i % 3 === 0 ? 1 : 0) : (i + k) % 3, WH, G(0.8)); }
  });

  // Heilung (farbig grün-gold): aufsteigende Pluszeichen und Blätter
  anim(out, 'heal', 6, 32, 48, (p, k) => {
    const g = P.green, au = P.gold;
    if (k <= 3) { const rx = [8, 11, 13, 14][k]; ering(p, 16, 43, rx, rx * 0.3, k < 2 ? 2 : 1.2, (a) => (k === 3 && Math.sin(a * 5) > 0 ? 0 : Math.sin(a) > 0 ? au[4] : au[2])); }
    for (const [x, y0, ph] of [[10, 44, 0], [23, 47, 1], [5, 30, 2]] as const) for (let j = 0; j < 7; j++) { const y = y0 - k * 5 - j - ph * 3; if (y > 1 && (j + k) % 4 !== 3) p.set(x, y, withA(g[4], j < 3 ? 255 : 150)); }
    const plus = (x: number, y: number, s: number): void => {
      if (y < 1) return;
      if (s <= 0) { p.set(x, y, g[4]); return; }
      const o = mix(g[1], INK, 0.2);
      if (s === 1) { p.rect(x - 1, y - 2, 3, 5, o); p.rect(x - 2, y - 1, 5, 3, o); p.rect(x, y - 1, 1, 3, g[4]); p.rect(x - 1, y, 3, 1, g[4]); p.set(x, y, WHITE); return; }
      p.rect(x - 2, y - 4, 5, 9, o); p.rect(x - 4, y - 2, 9, 5, o);
      p.rect(x - 1, y - 3, 3, 7, g[3]); p.rect(x - 3, y - 1, 7, 3, g[3]); p.rect(x - 1, y - 3, 2, 6, g[4]); p.rect(x - 3, y - 1, 6, 2, g[4]); p.rect(x - 1, y - 1, 2, 2, WHITE); p.set(x - 1, y - 3, au[4]); p.set(x - 3, y - 1, au[4]);
    };
    const P4 = [[8, 38, 2, 0], [23, 42, 2, 1], [15, 34, 1, 0], [26, 30, 1, 2], [5, 26, 1, 1]] as const;
    for (const [x, y0, s, d] of P4) { const t = k - d; if (t < 0) continue; plus(x + Math.round(Math.sin(t * 1.3 + x) * 1), y0 - t * 6, t >= 4 ? s - 2 : t >= 3 ? s - 1 : s); }
    for (const [x0, y0, ph] of [[20, 40, 0], [11, 44, 2], [27, 36, 4]] as const) { const y = y0 - k * 6.4, x = x0 + Math.sin(k * 1.2 + ph) * 3.4; if (y > 2) kite(p, x, y, k * 0.9 + ph, 4.4, 2.6, g[2], g[4]); }
    for (const s of burst(3, 6)) { const y = 44 - s.s * 30 - k * 5.5; if (y > 1) p.set(4 + s.q * 24, y, (k + Math.floor(s.s * 9)) % 2 ? au[4] : WHITE); }
  });

  // Buff (tintbar): aufsteigende Winkel
  anim(out, 'buff', 5, 32, 40, (p, k) => {
    const chev = (y: number, hw: number, v: number, a: number): void => {
      if (y < 1 || y > 39) return;
      for (let i = 0; i <= hw; i++) for (const s of [-1, 1]) { const x = 16 + s * i - (s > 0 ? 1 : 0), yy = y + Math.round(i * 0.62); p.set(x, yy, G(v, a)); p.set(x, yy + 1, G(v, a)); if (v > 0.9) p.set(x, yy + 2, G(0.7, a)); }
    };
    chev(31 - k * 7, 9, 1, 255); chev(38 - k * 7, 10, 0.86, 255); chev(24 - k * 7, 7, 0.8, 215); chev(17 - k * 7, 5, 0.7, 170);
    if (k >= 2) chev(45 - k * 7, 9, 0.78, 200);
    for (const [x, y0, ph] of [[4, 30, 0], [27, 34, 1], [8, 16, 2], [24, 12, 0], [29, 22, 1]] as const) { const y = y0 - k * 5; if (y > 2) twinkle(p, x, y, (k + ph) % 3, WH, G(0.8)); }
    for (const x of [2, 29]) for (let j = 0; j < 8; j++) { const y = 36 - k * 6 - j + (x > 10 ? 5 : 0); if (y > 0 && y < 40) p.set(x, y, G(0.8, j < 4 ? 220 : 130)); }
  });

  // Schild (tintbar): durchscheinende Wabenblase mit wanderndem Schimmer
  anim(out, 'shield', 4, 40, 44, (p, k) => {
    const cx = 20, cy = 22, rx = 18.6, ry = 20.6;
    for (let y = 0; y < 44; y++) for (let x = 0; x < 40; x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, d = Math.hypot(nx, ny);
      if (d > 1) continue;
      const dd = x + y - (k * 21 - 6), band = dd >= 0 && dd < 11, band2 = dd >= 16 && dd < 19;
      const rim = (1 - d) * rx;
      const he = hexEdge((x - cx) * (1 + d * d * 0.35), (y - cy) * (1 + d * d * 0.35), 4.6);
      let a = band ? 58 : 24;
      if (he < 0.55) a = band ? 215 : band2 ? 150 : d > 0.55 ? 96 : 62;
      if (rim < 1.25) a = nx + ny < -0.5 ? 255 : 225; else if (rim < 2.4) a = Math.max(a, 120);
      p.set(x, y, W(a));
    }
    // Glanzbogen oben links und Funkeln auf dem Schimmerband
    for (let a = 200; a <= 250; a += 2) { p.set(cx + Math.cos(a * DEG) * (rx - 4), cy + Math.sin(a * DEG) * (ry - 4), WH); if (a > 212 && a < 240) p.set(cx + Math.cos(a * DEG) * (rx - 5), cy + Math.sin(a * DEG) * (ry - 5), WH); }
    const sx = [9, 17, 25, 31][k]; twinkle(p, sx, k * 21 - 1 - sx + 5 < 3 ? 6 + k * 9 : Math.min(40, k * 21 - sx), 2, WH, G(0.9));
  });

  // Stufenaufstieg (farbig gold): aufsteigender Ring, Lichtschwingen, Funkeln
  anim(out, 'levelup', 8, 64, 64, (p, k) => {
    const g = P.gold, cx = 32;
    const ry = [56, 47, 38, 29, 21, 14, 0, 0][k], rr = [15, 16, 15, 13, 10, 6, 0, 0][k];
    const ringAt = (y: number, r: number, front: boolean, ghost: boolean): void => ering(p, cx, y, r, r * 0.32, ghost ? 1.1 : 2.4, (a, e) => {
      if (Math.sin(a) > 0 !== front) return 0;
      if (ghost) return Math.sin(a * 7 + y) > 0 ? g[2] : 0;
      return front ? (e < 0.5 ? WHITE : g[4]) : g[2];
    });
    if (k === 0) { p.ell(cx, 56, 12, 3.6, g[3]); for (const s of burst(3, 7, -150 * DEG, -30 * DEG)) streak(p, cx + Math.cos(s.a) * 8, 55, cx + Math.cos(s.a) * 10, 55 - 6 - 8 * s.s, () => g[4]); }
    if (rr) { ringAt(ry, rr, false, false); if (k >= 1) { ringAt(ry + 9, rr + 1, false, true); ringAt(ry + 9, rr + 1, true, true); } if (k >= 2) { ringAt(ry + 18, rr + 1, true, true); } }
    // Lichtsäulen-Fäden zwischen Boden und Ring
    if (k >= 1 && k <= 5) for (const dx of [-9, -4, 3, 8]) for (let y = ry + 3; y < 57; y++) if ((y + dx * 3 + k * 5) % 6 < 3) p.set(cx + dx, y, (y + dx) % 4 ? g[3] : g[4]);
    // Schwingen
    if (k >= 2 && k <= 6) {
      const L = [0, 0, 9, 17, 23, 24, 25][k], sy = 35;
      for (const side of [-1, 1]) for (const [ang, f, w] of [[-12, 1, 5], [-30, 0.94, 5], [-48, 0.8, 4.4], [-66, 0.6, 4], [8, 0.62, 4], [26, 0.38, 3.4]] as const) {
        const a = (side > 0 ? ang : 180 - ang) * DEG, len = L * f, x = cx + side * 5 + Math.cos(a) * (len / 2 + 2), y = sy + Math.sin(a) * (len / 2 + 2);
        if (len < 3) continue;
        if (k <= 4) { kite(p, x, y, a, len + 2, w + 2, g[1]); kite(p, x, y, a, len, w, g[3], k === 4 ? WHITE : g[4]); if (k >= 3) p.line(x - Math.cos(a) * len * 0.3, y - Math.sin(a) * len * 0.3, x + Math.cos(a) * len * 0.4, y + Math.sin(a) * len * 0.4, WHITE); }
        else { kite(p, x, y, a, len, w, k === 5 ? g[3] : g[2], k === 5 ? g[4] : g[3]); }
      }
      if (k >= 5) dissolve(p, k === 5 ? 0.3 : 0.62, 21 + k, k === 5 ? 2 : 1);
    }
    if (rr) ringAt(ry, rr, true, false);
    if (k === 4 || k === 5) { burstStar(p, cx, 11, 4, 2, k === 4 ? 9 : 7, 0, g[3], 1, 0.05); burstStar(p, cx, 11, 4, 1.4, k === 4 ? 7 : 5, 0, WHITE, 1, 0.05); }
    if (k >= 2) for (const [i, s] of burst(17, 10).entries()) {
      if (k === 7 && i % 2) continue;
      const x = cx + (s.q - 0.5) * 54, y = 52 - s.s * 26 - (k - 2) * 5.5;
      if (y > 2) twinkle(p, x, y, k >= 6 ? (i + k) % 2 : (i + k) % 3 + (i % 4 === 0 ? 1 : 0), (i + k) % 2 ? WHITE : g[4], g[3]);
    }
    if (k >= 6) for (const s of burst(29, k === 6 ? 14 : 12)) p.set(cx + (s.q - 0.5) * 52, 10 + s.s * 36 - (k - 6) * 5, s.v > 1 ? g[4] : g[2]);
  });

  // Teleport (tintbar): Silhouette zieht sich zusammen und verpufft
  anim(out, 'blink', 6, 32, 40, (p, k) => {
    const cx = 16, cy = 22;
    if (k === 0) { p.ell(cx, cy, 7.5, 15, G(0.78)); p.ell(cx, cy, 6.2, 13.6, WH); for (const y of [12, 22, 31]) { p.rect(cx - 8, y, 2, 1, 0); p.rect(cx + 6, y + 3, 2, 1, 0); } }
    if (k === 1) { p.ell(cx, cy, 4.4, 17.5, G(0.8)); p.ell(cx, cy, 3, 16.5, WH); for (const [y, l] of [[8, 7], [15, 9], [22, 10], [29, 9], [35, 6]] as const) { streak(p, cx - 6 - l, y, cx - 5, y, undefined, 1.1, 0.15, y); streak(p, cx + 6 + l, y + 1, cx + 5, y + 1, undefined, 1.1, 0.15, y + 2); } }
    if (k === 2) { p.rect(cx - 2, 2, 4, 37, G(0.8)); p.rect(cx - 1, 1, 2, 39, WH); kite(p, cx, cy, 0, 30, 4.6, G(0.8)); kite(p, cx, cy, 0, 26, 2.4, WH); p.ell(cx, cy, 3, 3, WH); }
    if (k === 3) { p.rect(cx - 1, 11, 2, 22, G(0.9)); kite(p, cx, cy, 0, 18, 2.4, WH); twinkle(p, cx, cy, 3, WH, G(0.8)); for (const y of [4, 7, 36, 38]) p.set(cx - (y % 2), y, G(0.8)); }
    if (k === 4) { twinkle(p, cx, cy, 2, WH, G(0.85)); for (const s of burst(5, 9)) p.set(cx + Math.cos(s.a) * (6 + 3 * s.s), cy + Math.sin(s.a) * (9 + 5 * s.s), s.q > 0.5 ? WH : G(0.75)); }
    if (k === 5) for (const s of burst(5, 9)) if (s.q > 0.3) p.set(cx + Math.cos(s.a) * (9 + 4 * s.s), cy + Math.sin(s.a) * (13 + 5 * s.s) - 2, G(0.7, 200));
  });

  // Erscheinen (tintbar): dunkler Rauch zieht sich zusammen und öffnet sich
  anim(out, 'spawn', 6, 32, 32, (p, k) => {
    const sm = [G(0.26), G(0.44), G(0.66)], c = 16;
    const ringP = (n: number, r: number, pr: number, rot: number): void => { for (let i = 0; i < n; i++) { const a = rot + (i * TAU) / n; puff(p, c + Math.cos(a) * r, c + 1 + Math.sin(a) * r * 0.9, pr * (0.8 + 0.4 * rnd2(i, 1, 3)), sm, i + 2, 3); } };
    if (k === 0) { ringP(6, 12.5, 2.4, 0.2); for (const s of burst(3, 6)) p.set(c + Math.cos(s.a) * 9, c + Math.sin(s.a) * 9, sm[1]); }
    if (k === 1) { ringP(6, 9.5, 3.6, 0.7); for (let i = 0; i < 6; i++) { const a = 0.2 + (i * TAU) / 6; p.set(c + Math.cos(a) * 13.5, c + 1 + Math.sin(a) * 12, sm[0]); } }
    if (k === 2) { ringP(6, 6, 4.8, 1.2); puff(p, c, c, 4.5, sm, 9, 4); }
    if (k === 3) { puff(p, c, c, 11, sm, 4, 7); twinkle(p, c, c, 2, WH, G(0.8)); p.set(c - 4, c + 3, sm[0]); p.set(c + 5, c - 2, sm[0]); }
    if (k === 4) { puff(p, c, c - 1, 11.5, sm, 5, 7); hollow(p, c, c, 5.6, 2, 7); dissolve(p, 0.1, 3, 2); }
    if (k === 5) { ringP(5, 12, 2.6, 0.5); dissolve(p, 0.3, 4); for (const s of burst(8, 7)) p.set(c + Math.cos(s.a) * (8 + 6 * s.s), c - 2 + Math.sin(s.a) * (8 + 6 * s.s), sm[1]); }
  });

  // Todeswölkchen: weißer Rauch mit Sternen
  anim(out, 'death_poof', 6, 32, 32, (p, k) => {
    const sm = [G(0.66), G(0.86), WH], c = 16, st = [[6, 7], [26, 10], [22, 26], [8, 24]] as const;
    const ringP = (n: number, r: number, pr: number): void => { for (let i = 0; i < n; i++) { const a = 0.5 + (i * TAU) / n; puff(p, c + Math.cos(a) * r, c + Math.sin(a) * r * 0.92 - (k - 2), pr * (0.8 + 0.4 * rnd2(i, 1, 5)), sm, i + 2, 4); } };
    if (k === 0) { burstStar(p, c, c, 6, 4, 9, 0.2, sm[1], 1); puff(p, c, c, 5, sm, 3, 4); }
    if (k === 1) puff(p, c, c, 10, sm, 4, 7);
    if (k === 2) { ringP(5, 7, 5.6); hollow(p, c, c, 2.6, 1); }
    if (k === 3) ringP(5, 10.5, 4);
    if (k === 4) { ringP(5, 12.5, 2.7); dissolve(p, 0.2, 5); }
    if (k === 5) for (const s of burst(9, 9)) p.set(c + Math.cos(s.a) * (11 + 4 * s.s), c - 3 + Math.sin(s.a) * (10 + 4 * s.s), G(0.8, 200));
    if (k >= 2) st.forEach(([x, y], i) => { if (k === 5 && i > 1) return; twinkle(p, x + (x < 16 ? -1 : 1) * (k - 2), y - (k - 2), [2, 3, 1, 0][k - 2 + (i % 2 && k < 5 ? 0 : 0)], WH, G(0.85)); });
  });

  // ------------------------------------------------------------ Statusschleifen auf der Figur (farbig)
  anim(out, 'burn', 4, 16, 20, (p, k) => {
    const f = P.fire, c3 = [f[1], f[2], f[3]];
    const h = [[8, 13, 9], [11, 10, 12], [7, 14, 8], [10, 9, 13]][k], l = [[-1, 1, 2], [1, -1, 1], [-2, 2, -1], [1, 1, -2]][k];
    flame(p, 3.5, 19, 5.5, h[0], l[0], c3); flame(p, 12.5, 19, 5.5, h[2], l[2], c3); flame(p, 8, 19, 7, h[1], l[1], [f[1], f[2], f[3], f[4]]);
    p.set([4, 11, 6, 13][k], [5, 3, 2, 6][k], f[3]); p.set([12, 3, 10, 2][k], [2, 6, 1, 4][k], f[2]); p.set([8, 7, 9, 8][k], [3, 5, 2, 4][k] - 1, f[4]);
  });
  anim(out, 'poison', 4, 16, 20, (p, k) => {
    const g = P.green, o = mix(P.forest[0], INK, 0.3);
    const bub = (x: number, y: number, r: number): void => {
      if (r < 1) { p.set(x, y, g[4]); return; }
      p.ell(x, y, r + 1, r + 1, o); p.ell(x, y, r, r, g[2]); if (r > 1.4) p.ell(x - 0.3, y - 0.3, r - 0.9, r - 0.9, g[3]);
      p.set(x - r * 0.4 - 0.5, y - r * 0.4 - 0.5, WHITE);
    };
    for (const [x, y0, r, sp] of [[4, 17, 2.4, 5], [11, 22, 1.6, 5], [8, 12, 1.4, 5], [13, 9, 1, 5]] as const) {
      const y = ((((y0 - k * sp) % 20) + 20) % 20);
      if (y < 3) { for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [-1, 2], [1, -1]] as const) p.set(x + dx, y + 1 + dy, g[4]); } else bub(x + Math.round(Math.sin(k * 1.6 + x)), y, r);
    }
    p.set([2, 14, 6, 10][k], [8, 15, 4, 18][k], g[3]);
  });
  anim(out, 'frost', 4, 16, 20, (p, k) => {
    const ic = P.ice, o = P.blue[1];
    const cr = (x: number, h: number, lean: number, w: number): void => {
      p.poly([[x - w - 1, 19.6], [x - w - 0.6, 19 - h * 0.45], [x + lean, 18 - h - 1], [x + w + 0.8, 19 - h * 0.4], [x + w + 1, 19.6]], o);
      p.poly([[x - w, 19.6], [x - w + 0.2, 19 - h * 0.45], [x + lean, 19 - h], [x + lean * 0.5, 19.6]], ic[3]);
      p.poly([[x + lean * 0.5, 19.6], [x + lean, 19 - h], [x + w, 19 - h * 0.4], [x + w, 19.6]], ic[1]);
      p.line(x - w + 1, 18, x + lean, 19 - h + 1, ic[4]);
    };
    const pu = [0, 1, 0, -1][k];
    cr(3.5, 8 + pu, -1.5, 2); cr(12.5, 10 - pu, 2, 2.2); cr(8, 14 + (k === 1 ? 1 : 0), 0.5, 2.8);
    const tw = [[8, 5], [13, 9], [3, 11], [9, 12]][k]; twinkle(p, tw[0], tw[1], k % 2 ? 1 : 2, WHITE, ic[4]);
    p.set([2, 14, 5, 11][k], [4, 3, 2, 1][k], WHITE); p.set([13, 1, 10, 4][k], [6, 7, 3, 6][k], ic[3]);
  });
  // Benommen: drei Sterne auf einer Umlaufbahn (4 Bilder = 120° ⇒ nahtlose Schleife)
  anim(out, 'stun', 4, 24, 12, (p, k) => {
    const g = P.gold, o = mix(g[0], INK, 0.4);
    const stars = [0, 1, 2].map((i) => { const a = (i * TAU) / 3 + (k * TAU) / 12; return [12 + Math.cos(a) * 9, 6 + Math.sin(a) * 3.4, Math.sin(a), a] as const; });
    for (const [x, y, z, a] of stars) if (z < 0) { const X = Math.round(x), Y = Math.round(y); p.set(X, Y, g[2]); p.set(X - 1, Y, g[1]); p.set(X + 1, Y, g[1]); p.set(X, Y - 1, g[1]); p.set(12 + Math.cos(a - 0.5) * 9, 6 + Math.sin(a - 0.5) * 3.4, g[1]); }
    for (const [x, y, z, a] of stars) if (z >= 0) {
      const X = Math.round(x), Y = Math.round(y);
      p.set(12 + Math.cos(a - 0.45) * 9, 6 + Math.sin(a - 0.45) * 3.4, g[3]); p.set(12 + Math.cos(a - 0.8) * 9, 6 + Math.sin(a - 0.8) * 3.4, g[2]);
      p.rect(X - 1, Y - 3, 3, 7, o); p.rect(X - 3, Y - 1, 7, 3, o); p.rect(X - 2, Y - 2, 5, 5, o);
      p.rect(X, Y - 2, 1, 5, g[4]); p.rect(X - 2, Y, 5, 1, g[4]); p.rect(X - 1, Y - 1, 3, 3, g[3]); p.set(X, Y, WHITE); p.set(X - 1, Y - 1, g[4]);
    }
  });
  anim(out, 'mark', 2, 16, 16, (p, k) => {
    const m = P.pink, r = k ? 5 : 6;
    ering(p, 8, 8, r, r, 1.5, (a) => (Math.abs(Math.sin(a * 2)) > 0.3 ? (k ? m[4] : m[3]) : 0));
    for (let i = 0; i < 4; i++) { const a = (i * TAU) / 4, d = k ? 3 : 4; p.line(8 + Math.cos(a) * d - (i === 0 ? 1 : 0), 8 + Math.sin(a) * d - (i === 1 ? 1 : 0), 8 + Math.cos(a) * (d + 3) - (i === 0 ? 1 : 0), 8 + Math.sin(a) * (d + 3) - (i === 1 ? 1 : 0), k ? WHITE : m[4]); }
    p.rect(7, 7, 2, 2, k ? WHITE : m[4]);
    p.outline(mix(m[0], INK, 0.5));
  });
  anim(out, 'weak', 2, 16, 16, (p, k) => {
    const b = P.blue;
    bmp(p, 2, 1 + k, ['...hmmmms...', '...hmmmms...', '...hmmmms...', '...hmmmms...', '...hmmmms...', 'hhhhmmmmssss', '.hmmmmmmmms.', '..hmmmmmms..', '...hmmmms...', '....hmms....', '.....ms.....'], { h: b[4], m: b[3], s: b[2] });
    p.set(7, 2 + k, b[1]); p.set(8, 3 + k, b[1]); p.set(7, 4 + k, b[1]);
    p.outline(mix(b[0], INK, 0.5));
    if (k) { p.set(2, 2, b[4]); p.set(13, 3, b[4]); } else { p.set(2, 13, b[3]); p.set(13, 14, b[3]); }
  });
}
void puff;
