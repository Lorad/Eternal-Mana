/**
 * Explosionen je Element (64×64, 8 Phasen) + physischer Staubeinschlag (48×48, 6 Phasen).
 * Formensprache: Feuer züngelt nach oben, Eis sind kantige Splitter, Erde ist klobiger Schutt, Wind sind gebogene
 * Schlieren, Licht sind Strahlen/Kreuze, Dunkel implodiert und treibt Ranken. Jede endet in Einzelpixeln.
 */
import type { Px } from '../draw';
import { INK, P, WHITE, rnd2 } from '../palette';
import { DEG, TAU, anim, arcSmear, burst, burstStar, dissolve, ering, flame, heatOf, hollow, kite, needle, puff, rock, twinkle, withA } from './kit';
import type { Item } from './kit';
import { MINT } from './projectiles';

/** Gebogene, sich verjüngende Ranke vom Radius r0 aus; s0..s1 = sichtbarer Abschnitt. */
function tendril(p: Px, cx: number, cy: number, a: number, r0: number, len: number, curl: number, w: number, s0: number, s1: number, cols: readonly number[]): void {
  const n = Math.ceil(len * 1.5);
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i <= n; i++) {
    const s = i / n;
    if (s < s0 || s > s1) continue;
    const r = r0 + len * s, ang = a + curl * s * s, x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r, q = w * (1 - s) + 0.5;
    if (pass === 0) p.ell(x, y, q, q, cols[0]);
    else if (q > 1.1) p.ell(x - 0.3, y - 0.3, q * 0.5, q * 0.5, cols[1]); else if (s > 0.8) p.set(x, y, cols[2] ?? cols[1]);
  }
}

export function explosionItems(out: Item[]): void {
  // ============================================================ FEUER: Feuerball → rollende Flammen → Rauch
  anim(out, 'explosion_fire', 8, 64, 64, (p, k) => {
    const f = P.fire, sm = [P.ash[2], P.ash[3], P.ash[4], P.stone[2]], cx = 32, cy = 34;
    const fl3 = [f[1], f[2], f[3]], fl2 = [f[1], f[2]];
    if (k === 0) { burstStar(p, cx, cy, 6, 4, 13, 0.2, f[2], 1, 0.2); burstStar(p, cx, cy, 6, 3, 10, 0.2, f[4], 1, 0.2); burstStar(p, cx, cy, 4, 2, 7, 0.6, WHITE, 2, 0.1); }
    if (k === 1) {
      burstStar(p, cx, cy, 11, 13, 24, 0.1, f[1], 3, 0.3); burstStar(p, cx, cy, 11, 12, 21, 0.1, f[2], 3, 0.3);
      p.ell(cx, cy, 14, 14, f[2]); burstStar(p, cx, cy, 9, 10, 17, 0.4, f[3], 4, 0.25); p.ell(cx, cy, 11, 11, f[3]);
      burstStar(p, cx, cy, 8, 7, 12, 0.2, f[4], 5, 0.2); p.ell(cx, cy, 8, 8, WHITE);
      for (const s of burst(5, 8)) needle(p, cx + Math.cos(s.a) * 20, cy + Math.sin(s.a) * 20, s.a, 5 + 4 * s.s, 1, f[4]);
    }
    if (k === 2) {
      // Flammenzungen am oberen Rand hinter dem Ball
      for (const [x, y, w, h, l] of [[17, 26, 9, 15, -3], [27, 17, 10, 14, 2], [38, 18, 10, 16, 3], [48, 28, 8, 13, 4], [12, 38, 7, 9, -3], [52, 40, 7, 9, 3]] as const) flame(p, x, y, w, h, l, fl2);
      puff(p, cx, cy, 23, [f[0]], 9, 7); puff(p, cx, cy, 21.5, fl3, 9, 7);
      p.ell(cx - 2, cy - 2, 11, 10, f[3]); p.ell(cx - 3, cy - 3, 8.5, 8, f[4]); p.ell(cx - 4, cy - 4, 5.5, 5, WHITE);
      p.ell(cx + 9, cy + 10, 4, 3, f[1]); p.ell(cx - 12, cy + 9, 3, 2.4, f[1]);
    }
    if (k === 3) {
      for (const [x, y, w, h, l] of [[14, 24, 10, 16, -4], [25, 13, 11, 13, -1], [37, 12, 11, 14, 3], [49, 24, 10, 15, 5], [9, 38, 8, 10, -4], [55, 38, 8, 11, 4]] as const) flame(p, x, y, w, h, l, fl3);
      puff(p, cx, cy - 2, 24, [f[0]], 12, 7); puff(p, cx, cy - 2, 22.5, fl3, 12, 7);
      p.ell(cx - 3, cy - 6, 10, 8, f[3]); p.ell(cx - 5, cy - 8, 6.5, 5, f[4]);
      // erste dunkle Rauchwalzen von unten rechts
      puff(p, cx + 10, cy + 9, 9, [f[0], sm[0], sm[1]], 4, 5); puff(p, cx - 11, cy + 11, 6.5, [f[0], sm[0], sm[1]], 6, 4);
      p.ell(cx + 1, cy + 5, 4, 3, f[1]);
    }
    if (k === 4) {
      // Flammen lösen sich in einzelne Zungen auf, Rauch übernimmt die Mitte
      for (const [x, y, w, h, l] of [[11, 30, 10, 17, -4], [21, 15, 10, 13, -2], [42, 13, 11, 14, 3], [53, 30, 9, 16, 4], [31, 9, 9, 9, 1]] as const) flame(p, x, y, w, h, l, fl3);
      puff(p, cx - 9, cy + 2, 12, [f[0], f[1], f[2]], 15, 5); puff(p, cx + 12, cy - 2, 11, [f[0], f[1], f[2]], 17, 5);
      puff(p, cx + 1, cy - 8, 15, [sm[0], sm[1], sm[2]], 21, 6); puff(p, cx + 8, cy + 8, 9, [sm[0], sm[1], sm[2]], 23, 5);
      flame(p, cx - 6, cy + 13, 9, 11, -1, fl3); flame(p, cx + 4, cy + 10, 6, 7, 1, [f[2], f[3]]);
      p.ell(cx - 14, cy + 5, 3, 3, f[3]); p.ell(cx + 16, cy + 1, 2.5, 2.5, f[3]);
    }
    if (k === 5) {
      puff(p, cx, cy - 10, 16, [sm[0], sm[1], sm[2], sm[3]], 31, 6); puff(p, cx - 15, cy + 2, 7.5, [sm[0], sm[1], sm[2]], 33, 4); puff(p, cx + 15, cy, 8.5, [sm[0], sm[1], sm[2]], 35, 5);
      // Glutreste glimmen von unten in den Rauch
      p.ell(cx - 3, cy + 1, 6, 3.4, f[1]); p.ell(cx - 4, cy + 0.6, 3.4, 1.8, f[2]);
      flame(p, cx - 12, cy + 13, 7, 9, -2, fl3); flame(p, cx + 9, cy + 12, 6, 8, 2, fl2); flame(p, cx + 20, cy + 9, 4, 6, 2, fl2); flame(p, cx - 1, cy + 14, 5, 6, 0, [f[2], f[3]]);
    }
    if (k === 6) {
      puff(p, cx - 2, cy - 15, 11, [sm[0], sm[1], sm[2]], 41, 5); puff(p, cx + 13, cy - 6, 6.5, [sm[0], sm[1], sm[2]], 43, 4); puff(p, cx - 14, cy - 4, 5.5, [sm[0], sm[1]], 45, 4); puff(p, cx + 3, cy + 2, 4, [sm[0], sm[1]], 47, 3);
      hollow(p, cx - 1, cy - 14, 3.4, 5, 3); dissolve(p, 0.16, 5, 2);
      flame(p, cx - 9, cy + 13, 4, 5, -1, [f[1], f[2]]); p.set(cx + 6, cy + 12, f[2]); p.set(cx + 7, cy + 11, f[1]);
    }
    if (k === 7) {
      puff(p, cx - 4, cy - 19, 5.5, [sm[0], sm[1]], 51, 4); puff(p, cx + 12, cy - 11, 3.4, [sm[0], sm[1]], 53, 3); puff(p, cx - 14, cy - 9, 2.6, [sm[1], sm[2]], 55, 3);
      dissolve(p, 0.42, 9, 1);
      for (const s of burst(57, 7)) p.set(cx + Math.cos(s.a) * (10 + 12 * s.s), cy - 8 + Math.sin(s.a) * (8 + 10 * s.s), sm[1 + Math.floor(s.q * 2)]);
    }
    // Funkenflug auf festen Bahnen (leicht aufsteigend)
    if (k >= 1 && k <= 6) for (const [i, s] of burst(71, 12).entries()) {
      if (k >= 5 && i % 2) continue;
      const r = 8 + k * 4.6 * s.v, x = cx + Math.cos(s.a) * r, y = cy + Math.sin(s.a) * r * 0.9 - k * 1.2;
      const c = k <= 2 ? f[4] : k <= 4 ? (s.q > 0.5 ? f[3] : f[2]) : f[1];
      p.set(x, y, c); if (k <= 3 && s.s > 0.5) p.set(x - Math.cos(s.a), y - Math.sin(s.a), f[2]);
    }
  });

  // ============================================================ WASSER/EIS: Splitterkranz, Frostnebel
  anim(out, 'explosion_water', 8, 64, 64, (p, k) => {
    const ic = P.ice, c = 32, sh = burst(13, 9);
    const mist = [ic[1], ic[2], ic[3]];
    const shardAt = (s: { a: number; v: number; s: number; q: number }, r: number, len: number, w: number): void => {
      const x = c + Math.cos(s.a) * r, y = c + Math.sin(s.a) * r;
      kite(p, x, y, s.a, len + 2, w + 2, P.blue[1]);
      kite(p, x, y, s.a, len, w, Math.cos(s.a + 0.9) > 0 ? ic[1] : ic[2], Math.cos(s.a + 0.9) > 0 ? ic[3] : ic[4]);
      if (len > 7) p.line(x - Math.cos(s.a) * len * 0.3, y - Math.sin(s.a) * len * 0.3, x + Math.cos(s.a) * len * 0.42, y + Math.sin(s.a) * len * 0.42, WHITE);
    };
    if (k === 0) { burstStar(p, c, c, 4, 3, 13, 0.3, ic[2], 1, 0.1); burstStar(p, c, c, 4, 2.2, 10, 0.3, WHITE, 1, 0.1); burstStar(p, c, c, 4, 1.5, 6, 1.1, ic[4], 1, 0.1); }
    if (k === 1) {
      burstStar(p, c, c, 7, 7, 24, 0.5, P.blue[1], 3, 0.35); burstStar(p, c, c, 7, 6, 22, 0.5, ic[2], 3, 0.35);
      burstStar(p, c, c, 7, 5, 17, 0.5, ic[3], 3, 0.35); burstStar(p, c, c, 6, 4, 12, 0.2, ic[4], 4, 0.3); burstStar(p, c, c, 5, 3, 8, 0.8, WHITE, 5, 0.2);
    }
    if (k === 2) {
      ering(p, c, c, 17, 17, 1.6, (a) => (Math.sin(a * 9) > -0.3 ? ic[3] : 0));
      for (const s of sh) shardAt(s, 15 + 2 * s.v, 17 + 8 * s.s, 5.5 + 2 * s.q);
      p.poly([[c - 8, c], [c - 4, c - 7], [c + 4, c - 7], [c + 8, c], [c + 4, c + 7], [c - 4, c + 7]], ic[2]);
      p.poly([[c - 6, c - 0.5], [c - 3, c - 5.5], [c + 3, c - 5.5], [c + 5, c - 1]], ic[4]); p.poly([[c - 4, c - 1], [c - 2, c - 4.4], [c + 2, c - 4.4]], WHITE);
    }
    if (k >= 3 && k <= 6) {
      // Frostnebel: flache, kantig abgestufte Schwaden unten, dazu der zerfallende Kranz
      const t = k - 3, mr = [9, 11, 10, 7][t];
      for (const [mx, my, s] of [[-13, 11, 1], [11, 13, 1.1], [-1, 17, 0.9], [22, 8, 0.7], [-23, 6, 0.6]] as const) {
        const x = c + mx * (1 + t * 0.16), y = c + my - t * 0.5, rx = mr * s * 1.25, ry = Math.max(1.6, mr * s * 0.36);
        p.ell(x, y, rx, ry, mist[0]); p.ell(x - rx * 0.1, y - ry * 0.3, rx * 0.8, ry * 0.66, mist[1]); p.ell(x - rx * 0.25, y - ry * 0.5, rx * 0.45, Math.max(1, ry * 0.36), mist[2]);
      }
      if (k >= 4) dissolve(p, [0, 0.2, 0.4, 0.62][t], 3 + k, 2);
      for (const s of sh) shardAt(s, 21 + t * 4.6 * (0.7 + 0.4 * s.v), Math.max(2.5, (15 + 6 * s.s) * [0.95, 0.66, 0.42, 0.2][t]), Math.max(1, (5 + 2 * s.q) * [0.9, 0.7, 0.5, 0.3][t]));
      if (k === 3) { ering(p, c, c, 22, 22, 1.4, (a) => (Math.sin(a * 9 + 1) > 0.1 ? ic[3] : 0)); twinkle(p, c, c, 3, WHITE, ic[4]); }
    }
    if (k >= 3) {
      // Eiskrümel und Frostglitzern
      for (const [i, s] of burst(29, 11).entries()) {
        if (k >= 6 && i % 2) continue;
        const r = 9 + (k - 2) * 4.4 * s.v, x = c + Math.cos(s.a) * r, y = c + Math.sin(s.a) * r + (k - 3) * 0.7;
        if (k <= 5 && s.s > 0.6) kite(p, x, y, s.a + 1, 3, 2, ic[2], ic[4]); else p.set(x, y, s.q > 0.5 ? WHITE : ic[3]);
      }
      const tw = [[14, 16], [50, 20], [44, 48], [18, 44], [32, 10]] as const;
      tw.forEach(([x, y], i) => { const ph = (k + i) % 3; if (k === 7 && i > 2) return; twinkle(p, x, y, ph === 0 ? 3 : ph === 1 ? 1 : 2, WHITE, ic[3]); });
    }
    if (k === 7) for (const s of burst(37, 9)) p.set(c + Math.cos(s.a) * (16 + 13 * s.s), c + Math.sin(s.a) * (14 + 12 * s.s) + 3, s.q > 0.5 ? ic[3] : ic[2]);
  });

  // ============================================================ ERDE: Schuttsäule, Staub, Erdklumpen
  anim(out, 'explosion_earth', 8, 64, 64, (p, k) => {
    const cx = 32, gy = 49;
    const dust = [P.tan[1], P.tan[2], P.tan[3], P.cream[3]], dustL = [P.tan[2], P.tan[3], P.cream[3]];
    const rk = [P.wood[0], P.tan[1], P.tan[3]], clod = [P.green[0], P.green[2], P.green[3]];
    // Bodenstaub, der nach außen wegrollt
    if (k >= 1 && k <= 6) for (const sx of [-1, 1]) {
      const x = cx + sx * (6 + k * 4.2), r = [0, 5, 7, 7.5, 6.5, 5, 3][k];
      puff(p, x, gy - 2 - (k > 3 ? k - 3 : 0), r, dustL, 5 + sx, 4);
      if (k >= 2 && k <= 5) puff(p, cx + sx * (2 + k * 2.2), gy - 1, r * 0.6, dustL, 9 + sx, 3);
    }
    if (k === 0) {
      p.ell(cx, gy - 1, 11, 3.4, P.tan[3]); p.ell(cx, gy - 1.4, 7, 2, P.cream[4]);
      for (const [x, h] of [[-7, 6], [-3, 10], [1, 13], [5, 8], [9, 5]] as const) needle(p, cx + x, gy - 2, -Math.PI / 2 + x * 0.04, h, 3, x === 1 ? P.cream[4] : P.tan[3]);
      for (const x of [-12, 13]) p.rect(cx + x, gy - 1, 3, 1, P.wood[1]);
    }
    if (k === 1) {
      p.poly([[cx - 10, gy], [cx - 7, gy - 16], [cx - 2, gy - 25], [cx + 3, gy - 21], [cx + 8, gy - 14], [cx + 10, gy]], dust[0]);
      puff(p, cx - 1, gy - 9, 10, dust, 3, 5); puff(p, cx, gy - 20, 7, dust, 4, 4);
      for (const [x, y] of [[-6, 31], [1, 35], [7, 29]] as const) p.rect(cx + x, gy - y, 2, 2, P.tan[3]);
    }
    if (k === 2) {
      p.poly([[cx - 9, gy], [cx - 8, gy - 20], [cx - 5, gy - 36], [cx + 5, gy - 36], [cx + 8, gy - 20], [cx + 9, gy]], dust[0]);
      puff(p, cx, gy - 7, 10.5, dust, 3, 5); puff(p, cx - 1, gy - 19, 9, dust, 5, 5); puff(p, cx + 1, gy - 30, 8.5, dust, 6, 5); puff(p, cx, gy - 40, 6.5, dust, 7, 4);
      for (const [x, h] of [[-3, 20], [3, 16]] as const) needle(p, cx + x, gy - 26, -Math.PI / 2, h, 2.6, P.cream[4]);
    }
    if (k === 3) {
      p.poly([[cx - 7, gy], [cx - 6, gy - 30], [cx + 6, gy - 30], [cx + 7, gy]], dust[0]);
      puff(p, cx, gy - 6, 8.5, dust, 3, 5); puff(p, cx + 1, gy - 18, 7.5, dust, 5, 4); puff(p, cx - 1, gy - 28, 7.5, dust, 6, 4);
      // Pilzkopf
      puff(p, cx - 8, gy - 38, 8.5, dust, 11, 5); puff(p, cx + 9, gy - 37, 8, dust, 12, 5); puff(p, cx, gy - 42, 9.5, dust, 13, 5);
    }
    if (k === 4) {
      puff(p, cx, gy - 5, 6.5, dust, 3, 4); puff(p, cx + 2, gy - 17, 5.5, dust, 5, 4);
      puff(p, cx - 13, gy - 36, 8, dust, 11, 5); puff(p, cx + 14, gy - 34, 7.5, dust, 12, 5); puff(p, cx + 1, gy - 43, 8, dust, 13, 5); puff(p, cx - 3, gy - 29, 5, dustL, 14, 4);
      dissolve(p, 0.1, 3, 2);
    }
    if (k === 5) {
      puff(p, cx - 17, gy - 35, 6.5, dustL, 11, 4); puff(p, cx + 18, gy - 32, 6, dustL, 12, 4); puff(p, cx + 2, gy - 45, 6, dustL, 13, 4); puff(p, cx - 2, gy - 24, 4, dustL, 14, 3); puff(p, cx + 1, gy - 8, 4, dustL, 15, 3);
      dissolve(p, 0.26, 4, 2);
    }
    if (k === 6) {
      puff(p, cx - 20, gy - 35, 4.5, dustL, 11, 3); puff(p, cx + 21, gy - 31, 4, dustL, 12, 3); puff(p, cx + 3, gy - 47, 3.6, dustL, 13, 3);
      dissolve(p, 0.45, 5, 2);
    }
    if (k === 7) { for (const s of burst(17, 12)) p.set(cx + Math.cos(s.a) * (14 + 12 * s.s), gy - 26 + Math.sin(s.a) * (16 + 6 * s.s), dustL[Math.floor(s.q * 3)]); dissolve(p, 0.3, 6); }
    // Brocken und Grassoden auf Wurfbahnen
    if (k >= 1) for (const [i, s] of burst(41, 11, -152 * DEG, -28 * DEG).entries()) {
      const t = k - 0.45, land = gy + 2 + s.q * 6;
      const x = cx + Math.cos(s.a) * (0.5 + s.v) * 4.3 * t, y = gy - 6 + Math.sin(s.a) * (0.75 + 0.3 * s.v) * 12.5 * t + 1.3 * t * t;
      if (y >= land) { if (k < 7 || i % 2) { p.rect(Math.round(x), Math.round(land), 2, 1, rk[1]); p.set(x, land - 1, rk[2]); } continue; }
      const isClod = i % 3 === 0, r = (k >= 6 ? 1.6 : 2.6 + s.s * 2.8);
      rock(p, x, y, r, t * 0.9 + i, isClod ? clod : rk, i);
      if (isClod && r > 2) p.set(x, y + 1, P.wood[1]);
    }
  });

  // ============================================================ WIND: aufweitender Wirbelring, Schlieren, Blätter
  anim(out, 'explosion_wind', 8, 64, 64, (p, k) => {
    const heat = heatOf(MINT), c = 32;
    const R = [7, 13, 19, 24, 27.5, 29.5, 30, 30][k], w = [3.4, 5.6, 6.6, 6, 4.8, 3.4, 2.2, 1.4][k], sweep = [170, 165, 160, 150, 135, 110, 80, 44][k];
    const br = [0, 0, 0.05, 0.16, 0.34, 0.52, 0.7, 0.86][k], gain = [1.5, 1.45, 1.3, 1.15, 1, 0.85, 0.7, 0.55][k], rot = k * 46;
    if (k >= 1 && k <= 6) for (let i = 0; i < 3; i++) arcSmear(p, { cx: c, cy: c, rx: R * 0.42, ry: R * 0.42, a0: rot * 1.4 + i * 120 + 60, a1: rot * 1.4 + i * 120 + 60 + sweep * 0.5, w: Math.max(1.2, w * 0.38), heat, gain: gain * 0.8, breakup: br + 0.15, seed: 7 + i, comb: 1 });
    // drei exzentrische Sicheln = Windrad (kein geschlossener Ring)
    for (let i = 0; i < 3; i++) {
      const th = rot + i * 120, R2 = Math.min(R, 30) * 0.7, off = Math.min(R, 30) * 0.33;
      arcSmear(p, { cx: c + Math.cos(th * DEG) * off, cy: c + Math.sin(th * DEG) * off, rx: R2, ry: R2, a0: th - sweep * 0.72, a1: th + sweep * 0.36, w: w * 1.15, heat, gain, breakup: br, seed: 3 + i, comb: 1, fat: 0.72 });
    }
    if (k >= 2 && k <= 6) for (let i = 0; i < 3; i++) arcSmear(p, { cx: c, cy: c, rx: Math.min(31, R * 1.06), ry: Math.min(31, R * 1.06), a0: rot + i * 120 + 50, a1: rot + i * 120 + 50 + sweep * 0.3, w: 1.2, heat, gain: gain * 0.7, breakup: br + 0.2, seed: 13 + i, comb: 0 });
    if (k === 0) { p.ell(c, c, 3, 3, WHITE); twinkle(p, c, c, 5, WHITE, MINT[3]); }
    if (k === 1) twinkle(p, c, c, 3, WHITE, MINT[2]);
    // Blätter im Sog (drehen und wandern nach außen)
    if (k >= 1) for (const [i, s] of burst(23, 7).entries()) {
      if (k === 7 && i > 2) continue;
      const a = s.a + k * 0.62, r = Math.min(30, 5 + k * 3.9 * (0.75 + 0.3 * s.v)), x = c + Math.cos(a) * r, y = c + Math.sin(a) * r;
      kite(p, x, y, a + 1.9 + k * 0.8, 4, 2.4, i % 2 ? P.green[3] : P.green[2], i % 2 ? P.green[4] : P.green[3]);
    }
    if (k >= 5) for (const s of burst(31, k === 7 ? 12 : 8)) p.set(c + Math.cos(s.a + k) * (22 + 9 * s.s), c + Math.sin(s.a + k) * (22 + 9 * s.s), s.q > 0.5 ? MINT[3] : MINT[1]);
  });

  // ============================================================ LICHT: Kreuzblitz mit Strahlen und Funkeln
  anim(out, 'explosion_light', 8, 64, 64, (p, k) => {
    const g = P.gold, c = 32;
    const cross = (lh: number, lv: number, w: number, col: number): void => { kite(p, c, c, 0, lh, w, col); kite(p, c + 0.01, c, Math.PI / 2, lv, w, col); };
    const sparks = burst(19, 9);
    if (k === 0) { cross(26, 20, 3.4, g[3]); cross(20, 14, 1.6, WHITE); p.ell(c, c, 3.5, 3.5, g[4]); p.ell(c, c, 2.2, 2.2, WHITE); }
    if (k === 1) {
      for (let i = 0; i < 8; i++) needle(p, c, c, (i * TAU) / 8 + TAU / 16, 17, 4.4, g[2]);
      cross(54, 44, 8.4, g[2]); cross(50, 40, 5.6, g[3]); p.ell(c, c, 9.5, 9.5, g[3]); for (let i = 0; i < 4; i++) needle(p, c, c, (i * TAU) / 4 + TAU / 8, 15, 4, g[4]);
      cross(44, 34, 3.2, g[4]); p.ell(c, c, 7.5, 7.5, g[4]); cross(36, 26, 1.6, WHITE); p.ell(c, c, 5.5, 5.5, WHITE);
    }
    if (k === 2) {
      ering(p, c, c, 19, 19, 1.6, () => g[3]);
      for (let i = 0; i < 16; i++) { const a = (i * TAU) / 16 + TAU / 32, l = i % 2 ? 25 : 19; needle(p, c + Math.cos(a) * 8, c + Math.sin(a) * 8, a, l - 8, 3.4, i % 2 ? g[3] : g[2]); }
      cross(64, 58, 9.6, g[2]); cross(62, 54, 6.4, g[3]); p.ell(c, c, 13, 13, g[2]); p.ell(c, c, 11.5, 11.5, g[3]);
      for (let i = 0; i < 4; i++) needle(p, c, c, (i * TAU) / 4 + TAU / 8, 20, 4.4, g[4]);
      cross(58, 48, 3.6, g[4]); p.ell(c, c, 9.5, 9.5, g[4]); cross(50, 40, 1.8, WHITE); p.ell(c, c, 7.5, 7.5, WHITE);
    }
    if (k === 3) {
      for (let i = 0; i < 16; i++) { const a = (i * TAU) / 16 + TAU / 32, r = i % 2 ? 23 : 17; kite(p, c + Math.cos(a) * r, c + Math.sin(a) * r, a, i % 2 ? 11 : 7, 2.2, i % 2 ? g[3] : g[4]); }
      ering(p, c, c, 23, 23, 2.6, (_a, e) => (e < 0.5 ? g[4] : g[2]));
      cross(64, 60, 4.6, g[3]); cross(60, 54, 2, g[4]); cross(40, 34, 1, WHITE);
      burstStar(p, c, c, 4, 2.5, 9, 0.78, g[4], 2, 0.1); twinkle(p, c, c, 3, WHITE);
    }
    if (k === 4) {
      ering(p, c, c, 27.5, 27.5, 1.8, (a) => (Math.sin(a * 10) > -0.5 ? g[3] : 0));
      for (let i = 0; i < 4; i++) { const a = (i * TAU) / 4; for (let r = 6; r < 31; r++) if (rnd2(r, i, 3) > 0.34) p.set(c + Math.cos(a) * r, c + Math.sin(a) * r, r < 18 ? g[4] : g[3]); }
      for (let i = 0; i < 8; i++) { const a = (i * TAU) / 8 + TAU / 16; kite(p, c + Math.cos(a) * 25, c + Math.sin(a) * 25, a, 5, 1, g[3]); }
    }
    if (k === 5) ering(p, c, c, 30.5, 30.5, 1.2, (a) => (Math.sin(a * 10 + 1) > 0.2 ? g[2] : 0));
    if (k >= 3) sparks.forEach((s, i) => {
      if (k === 7 && i % 2) return;
      const r = 9 + (k - 2) * 3.8 * (0.7 + 0.4 * s.v), ph = (k + i) % 3, sz = k >= 6 ? (ph === 0 ? 1 : 0) : ph === 0 ? 3 : ph === 1 ? 2 : 1;
      twinkle(p, c + Math.cos(s.a) * r, c + Math.sin(s.a) * r - (k - 3), sz, k >= 6 ? g[4] : WHITE, g[3]);
    });
    if (k >= 5) for (const s of burst(43, k === 5 ? 10 : k === 6 ? 14 : 9)) p.set(c + Math.cos(s.a) * (10 + 20 * s.s), c + Math.sin(s.a) * (10 + 20 * s.s) - (k - 5) * 2, s.q > 0.6 ? WHITE : s.q > 0.3 ? g[3] : g[2]);
  });

  // ============================================================ DUNKEL: Implosion, dann berstende Leere mit Ranken
  anim(out, 'explosion_dark', 8, 64, 64, (p, k) => {
    const v = P.violet, m = P.pink, sd = P.shadow, c = 32, tn = burst(53, 8);
    if (k <= 1) {
      // Schlieren werden nach innen gerissen
      for (const [i, s] of burst(9, 12).entries()) {
        const r1 = k === 0 ? 29 : 19, r0 = k === 0 ? 13 + 4 * s.s : 6;
        needle(p, c + Math.cos(s.a) * r1, c + Math.sin(s.a) * r1, s.a + Math.PI + 0.25, r1 - r0, i % 3 === 0 ? 3 : 2, i % 3 === 0 ? m[2] : v[2]);
        p.set(c + Math.cos(s.a + 0.2) * (r0 + 1), c + Math.sin(s.a + 0.2) * (r0 + 1), m[4]);
      }
      ering(p, c, c, k === 0 ? 30 : 22, k === 0 ? 30 : 22, 1.4, (a) => (Math.sin(a * 6 + k) > 0.3 ? v[1] : 0));
      const r = k === 0 ? 4 : 7; p.ell(c, c, r + 1.6, r + 1.6, m[2]); p.ell(c, c, r + 0.6, r + 0.6, v[1]); p.ell(c, c, r - 0.6, r - 0.6, sd[0]);
      if (k === 1) twinkle(p, c - 2, c - 2, 1, m[4]);
    }
    if (k === 2) {
      burstStar(p, c, c, 9, 6, 19, 0.2, v[1], 3, 0.3); burstStar(p, c, c, 9, 5, 16, 0.2, m[2], 3, 0.3); burstStar(p, c, c, 8, 4.5, 12, 0.5, m[3], 4, 0.25); burstStar(p, c, c, 6, 3.5, 9, 0.1, WHITE, 5, 0.2);
      p.ell(c, c, 4.4, 4.4, sd[0]); p.set(c - 2, c - 2, m[4]);
      for (let i = 0; i < 4; i++) needle(p, c, c, (i * TAU) / 4 + 0.3, 24, 1.6, m[3]);
    }
    if (k >= 3 && k <= 6) {
      const t = k - 3, len = [11, 19, 22, 23][t], r0 = [12, 15, 17, 20][t], s0 = [0, 0, 0.3, 0.62][t];
      tn.forEach((s, i) => tendril(p, c, c, s.a, r0, len * (0.7 + 0.4 * s.s), (i % 2 ? 1 : -1) * (0.9 + 0.7 * s.q), [3, 3.2, 2.4, 1.6][t], s0, 1, [k >= 5 ? v[1] : v[0], v[2], m[3]]));
    }
    if (k === 3) {
      p.ell(c, c, 16, 16, v[0]); burstStar(p, c, c, 10, 13, 18.5, 0.3, v[2], 7, 0.2); p.ell(c, c, 14.5, 14.5, v[2]); p.ell(c, c, 13, 13, v[1]); p.ell(c + 0.5, c + 0.5, 11, 11, sd[1]); p.ell(c + 1, c + 1, 7.5, 7.5, sd[0]);
      for (let a = 185; a <= 285; a += 4) p.set(c + Math.cos(a * DEG) * 13.6, c + Math.sin(a * DEG) * 13.6, a > 212 && a < 262 ? m[4] : m[3]);
      for (const s of burst(61, 6)) p.set(c + Math.cos(s.a) * 7 * s.s, c + Math.sin(s.a) * 7 * s.s, v[2]);
    }
    if (k === 4) {
      p.ell(c, c, 19, 19, v[0]); p.ell(c, c, 17.6, 17.6, v[2]); p.ell(c, c, 16, 16, v[1]); p.ell(c + 0.5, c + 0.5, 13.5, 13.5, sd[1]); p.ell(c + 1, c + 1, 9, 9, sd[0]);
      for (let a = 180; a <= 290; a += 3) p.set(c + Math.cos(a * DEG) * 16.8, c + Math.sin(a * DEG) * 16.8, a > 215 && a < 258 ? m[4] : m[3]);
      // Risse: die Leere beginnt aufzubrechen
      for (const [a, r] of [[0.6, 9], [2.4, 11], [4.3, 8], [5.5, 12]] as const) { const x = c + Math.cos(a) * r, y = c + Math.sin(a) * r; p.ell(x, y, 2.6, 2.6, 0); p.set(x + 3, y, m[3]); p.set(x - 2, y - 2, m[2]); }
      p.ell(c, c, 3, 3, 0); twinkle(p, c, c, 1, m[4]);
    }
    if (k === 5) {
      p.ell(c, c, 20.5, 20.5, v[1]); p.ell(c, c, 19, 19, v[2]); p.ell(c, c, 17.4, 17.4, sd[1]); hollow(p, c, c, 13.5, 3.1);
      dissolve(p, 0.2, 13, 2);
      for (let a = 0; a < 360; a += 5) if (rnd2(a, 1, 5) > 0.5) p.set(c + Math.cos(a * DEG) * 18.4, c + Math.sin(a * DEG) * 18.4, m[3]);
    }
    if (k === 6) { p.ell(c, c, 22, 22, v[1]); hollow(p, c, c, 19.5, 4.4); dissolve(p, 0.5, 17, 2); }
    if (k >= 3) for (const [i, s] of burst(67, 12).entries()) {
      if (k === 7 && i % 3 === 0) continue;
      const r = 12 + (k - 2) * 3.9 * s.v, a = s.a + (k - 3) * 0.14, x = c + Math.cos(a) * r, y = c + Math.sin(a) * r;
      if (k <= 5 && s.s > 0.55) { p.set(x, y, WHITE); p.set(x + 1, y, m[3]); p.set(x, y + 1, m[2]); } else p.set(x, y, s.q > 0.5 ? m[3] : v[3]);
    }
    if (k === 7) for (const s of tn) { const r = 26 + 4 * s.s; p.set(c + Math.cos(s.a + 0.8) * r, c + Math.sin(s.a + 0.8) * r, v[2]); p.set(c + Math.cos(s.a + 0.9) * (r - 2), c + Math.sin(s.a + 0.9) * (r - 2), v[1]); }
  });

  // ============================================================ PHYSISCH: staubiger Einschlag
  anim(out, 'explosion_phys', 6, 48, 48, (p, k) => {
    const c = 24, st = P.steel, du = [P.stone[2], P.stone[3], P.stone[4], WHITE], sh = burst(5, 8);
    if (k === 0) { burstStar(p, c, c, 4, 3, 13, 0.4, st[3], 1, 0.1); burstStar(p, c, c, 4, 2.2, 10, 0.4, WHITE, 1, 0.1); burstStar(p, c, c, 4, 2, 6, 1.2, st[4], 2, 0.1); }
    if (k === 1) {
      burstStar(p, c, c, 9, 8, 19, 0.2, st[2], 3, 0.35); burstStar(p, c, c, 9, 7, 17, 0.2, st[4], 3, 0.35); burstStar(p, c, c, 7, 5, 11, 0.5, WHITE, 4, 0.2);
      for (const s of sh) needle(p, c + Math.cos(s.a) * 14, c + Math.sin(s.a) * 14, s.a, 6 + 3 * s.s, 1, WHITE);
    }
    if (k >= 2) {
      const t = k - 2, n = 6, r = [9.5, 14, 17, 19][t], pr = [7, 6.4, 4.6, 2.6][t];
      for (let i = 0; i < n; i++) { const a = (i * TAU) / n + 0.4 + t * 0.1; puff(p, c + Math.cos(a) * r, c + Math.sin(a) * r * 0.86 - t, pr * (0.8 + 0.3 * rnd2(i, 1, 9)), t >= 2 ? du.slice(0, 3) : du, 3 + i, 4); }
      if (k === 2) { burstStar(p, c, c, 7, 4, 9, 0.3, WHITE, 5, 0.3); hollow(p, c, c, 2.5, 1); }
      if (k >= 3) hollow(p, c, c - t, [0, 7.5, 11.5, 14][t], 2 + t);
      if (k >= 4) dissolve(p, k === 4 ? 0.25 : 0.55, 7 + k, k === 4 ? 2 : 1);
      for (const [i, s] of sh.entries()) { const rr = 12 + (t + 1) * 3.6 * s.v, x = c + Math.cos(s.a) * rr, y = c + Math.sin(s.a) * rr; if (k <= 3) rock(p, x, y, 1.2 + s.s * 1.4, i + k, [st[1], st[3], st[4]], i); else p.set(x, y, st[3]); }
    }
    if (k === 5) for (const s of burst(15, 8)) p.set(c + Math.cos(s.a) * (14 + 7 * s.s), c + Math.sin(s.a) * (12 + 7 * s.s) - 3, du[1 + Math.floor(s.q * 2)]);
  });
}
void INK; void flame;
