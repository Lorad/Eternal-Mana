/** Bewegung und Boden: Staub, Spritzer, Wellen, Risse, Brandfleck, Schockwelle. */
import type { Pt } from '../draw';
import { P, WHITE, rnd2, rng, vnoise } from '../palette';
import { DEG, G, K, TAU, W, WH, anim, burst, dissolve, ering, hollow, needle, one, puff, streak, twinkle } from './kit';
import type { Item } from './kit';
import { bmp } from './particles';

export function groundItems(out: Item[]): void {
  const du = [G(0.6), G(0.8), WH];
  anim(out, 'dust', 5, 16, 16, (p, k) => {
    if (k === 0) puff(p, 8, 11.5, 3.2, du, 2, 3);
    if (k === 1) puff(p, 8, 9.5, 5.2, du, 3, 5);
    if (k === 2) { puff(p, 8, 8, 6.2, du, 4, 5); hollow(p, 9, 10, 1.8, 1); }
    if (k === 3) { puff(p, 4.5, 7, 3.4, du, 5, 4); puff(p, 11.5, 6, 3, du, 6, 4); puff(p, 8.5, 11.5, 1.8, du, 7, 3); dissolve(p, 0.12, 2); }
    if (k === 4) { puff(p, 3.5, 5, 1.8, du, 5, 3); puff(p, 12.5, 4, 1.6, du, 6, 3); for (const [x, y] of [[7, 3], [9, 9], [2, 9], [13, 8], [6, 12]] as const) p.set(x, y, G(0.7, 200)); }
  });
  anim(out, 'dust_run', 4, 12, 8, (p, k) => {
    if (k === 0) { p.rect(8, 5, 2, 2, du[1]); p.set(8, 5, du[2]); p.set(10, 6, du[0]); }
    if (k === 1) { puff(p, 6.5, 4.5, 2.4, du, 2, 3); p.set(9, 6, du[0]); }
    if (k === 2) { puff(p, 4.5, 3.5, 2.6, du, 3, 3); dissolve(p, 0.15, 4); p.set(8, 5, du[0]); p.set(7, 1, du[1]); }
    if (k === 3) for (const [x, y, v] of [[2, 2, 0.8], [4, 4, 0.6], [5, 1, 0.7], [1, 5, 0.6], [7, 3, 0.55]] as const) p.set(x, y, G(v, 200));
  });
  // Ausweichspur: Geschwindigkeitsstreifen, Köpfe rechts
  anim(out, 'dodge_trail', 4, 32, 24, (p, k) => {
    const rows = [[3, 10, 0.7], [6, 2, 0.9], [9, 6, 1.2], [12, 0, 1.4], [15, 4, 1.2], [18, 1, 0.9], [21, 8, 0.7]] as const;
    for (const [y, x0, g] of rows) {
      const a = x0 + k * 3, b = 31 - k * [2, 5, 3, 6, 4, 5, 2][rows.findIndex((r) => r[0] === y)];
      if (b - a < 3) continue;
      streak(p, a, y, b, y, undefined, g * [1.1, 0.95, 0.75, 0.55][k], [0.1, 0.3, 0.55, 0.8][k], y);
      if (g > 1 && k < 2) streak(p, a + 6, y + 1, b - 1, y + 1, undefined, g * 0.8, 0.2 + k * 0.2, y + 3);
    }
    if (k === 0) for (const y of [9, 12, 15]) p.rect(29, y, 3, 2, WH);
    if (k === 3) for (const [x, y] of [[20, 5], [25, 13], [16, 17], [28, 8]] as const) p.set(x, y, G(0.7, 190));
  });
  // Wasserspritzer (farbig)
  anim(out, 'splash', 5, 16, 16, (p, k) => {
    const t = P.teal, b = P.blue[2];
    if (k === 0) { p.ell(8, 13, 3, 1.4, t[3]); p.rect(7, 10, 2, 3, WHITE); p.set(8, 9, t[4]); }
    if (k === 1) { p.ell(8, 13, 4.6, 1.8, b); p.ell(8, 12.8, 4, 1.3, t[3]); needle(p, 8, 13, -90 * DEG, 8, 3.4, t[4]); needle(p, 5, 13, -112 * DEG, 5, 2.6, t[4]); needle(p, 11, 13, -68 * DEG, 5, 2.6, t[4]); p.line(8, 6, 8, 11, WHITE); }
    if (k === 2) {
      ering(p, 8, 13, 6.5, 2.4, 1.4, (a) => (Math.sin(a) > 0 ? t[4] : t[2]));
      needle(p, 8, 13, -90 * DEG, 10, 3, t[3]); needle(p, 4.5, 13, -116 * DEG, 8, 2.6, t[3]); needle(p, 11.5, 13, -64 * DEG, 8, 2.6, t[3]);
      p.line(8, 4, 8, 10, WHITE); p.set(8, 1, WHITE); p.set(2, 4, WHITE); p.set(13, 4, WHITE); p.set(1, 6, t[4]); p.set(14, 6, t[4]); p.set(5, 2, t[4]); p.set(11, 3, t[4]);
    }
    if (k === 3) { ering(p, 8, 13, 7.6, 2.6, 1.1, (a) => (Math.sin(a) > 0 ? t[4] : t[2])); for (const [x, y] of [[8, 5], [3, 6], [13, 7], [0, 9], [15, 10], [6, 8], [10, 9]] as const) p.set(x, y, y < 7 ? WHITE : t[4]); p.rect(7, 10, 2, 2, t[3]); }
    if (k === 4) { ering(p, 8, 13, 8, 2.8, 1, (a) => (Math.sin(a * 5) > 0.2 ? t[3] : 0)); p.set(2, 11, t[4]); p.set(13, 12, t[4]); p.set(8, 10, WHITE); }
  });
  anim(out, 'ripple', 4, 16, 10, (p, k) => {
    const rx = [2.4, 4.4, 6.4, 7.8][k];
    ering(p, 8, 5, rx, rx * 0.56, k < 2 ? 1.3 : 1, (a) => (k === 3 && Math.sin(a * 4 + 0.5) > 0.1 ? 0 : k === 2 && Math.sin(a * 6) > 0.6 ? 0 : Math.sin(a) > 0 ? (k < 2 ? WH : G(0.9, k === 3 ? 170 : 230)) : G(0.72, k === 3 ? 130 : 200)));
    if (k === 0) p.set(8, 5, WH);
  });
  anim(out, 'sparkle', 4, 8, 8, (p, k) => {
    if (k === 0) p.set(4, 4, WH);
    if (k === 1) twinkle(p, 4, 4, 1, WH);
    if (k === 2) { twinkle(p, 4, 4, 3, WH, G(0.8)); }
    if (k === 3) { twinkle(p, 4, 4, 2, G(0.9), G(0.7, 180)); p.set(4, 4, WH); }
  });
  // Fußabdruck: hell gezeichnet (tintbar) – die Engine färbt ihn dunkel ein
  one(out, 'footprint', 6, 5, (p) => bmp(p, 0, 0, ['...ab.', 'ab.bbb', 'bb.bbb', 'ab.bbb', '...ab.'], { b: W(200), a: W(130) }));

  // Bodenrisse (flach, ¾): dunkel mit heller Glutlinie, drei Ausbaustufen
  anim(out, 'crack', 3, 48, 32, (p, k) => {
    const R = rng(77), glow: Pt[][] = [];
    const n = [4, 6, 8][k], reach = [9, 15, 21][k];
    for (let i = 0; i < 8; i++) {
      let a = (i / 8) * TAU + 0.3 + (R() - 0.5) * 0.5, x = 24, y = 16;
      const len = reach * (0.6 + 0.5 * R()), path: Pt[] = [[x, y]];
      const jit = Array.from({ length: 8 }, () => [R(), R(), R()]);
      if (i >= n) continue;
      for (let s = 0, d = 0; d < len; s++) {
        const st = 2.5 + jit[s % 8][0] * 3; a += (jit[s % 8][1] - 0.5) * 1.1; d += st;
        const nx = x + Math.cos(a) * st, ny = y + Math.sin(a) * st * 0.62, wide = d < len * 0.45;
        p.line(x, y, nx, ny, K(235), wide ? 2 : 1);
        if (k > 0 && jit[s % 8][2] > 0.62) { const b = a + (jit[s % 8][1] > 0.5 ? 0.9 : -0.9); p.line(nx, ny, nx + Math.cos(b) * 4, ny + Math.sin(b) * 2.6, K(200)); }
        x = nx; y = ny; if (wide) path.push([x, y]);
      }
      p.set(x, y, K(150)); glow.push(path);
    }
    p.ell(24, 16, [2.4, 3.4, 4.6][k], [1.6, 2.2, 3][k], K(245));
    for (const path of glow) for (let i = 0; i + 1 < path.length; i++) p.line(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1], G(0.86, 150));
    p.ell(24, 16, [1.2, 2, 3][k], [0.8, 1.2, 1.8][k], G(0.95, 190));
    for (const s of burst(5 + k, 4 + k * 3)) p.set(24 + Math.cos(s.a) * reach * (0.5 + 0.6 * s.s), 16 + Math.sin(s.a) * reach * 0.62 * (0.5 + 0.6 * s.s), K(170));
  });
  // Brandfleck (flach, dunkel)
  one(out, 'scorch', 40, 28, (p) => {
    for (let y = 0; y < 28; y++) for (let x = 0; x < 40; x++) {
      const nx = (x + 0.5 - 20) / 19, ny = (y + 0.5 - 14) / 13, a = Math.atan2(ny, nx);
      const d = Math.hypot(nx, ny) / (0.8 + 0.2 * Math.sin(a * 5 + 1) + 0.12 * Math.sin(a * 11)) + (vnoise(x / 4, y / 4, 3) - 0.5) * 0.3;
      if (d < 0.38) p.set(x, y, K(200)); else if (d < 0.62) p.set(x, y, K(150)); else if (d < 0.82) p.set(x, y, K(96));
      else if (d < 1 && (x + y) % 2 === 0 && rnd2(x, y, 5) > 0.25) p.set(x, y, K(80));
    }
    for (const s of burst(9, 9)) { const r = 0.3 + 0.4 * s.s; p.set(20 + Math.cos(s.a) * 19 * r, 14 + Math.sin(s.a) * 13 * r, K(235)); }
    for (const [x, y] of [[17, 12], [23, 15], [20, 17]] as const) p.set(x, y, P.ash[4]);
  });
  // Boss-Schockwelle (tintbar, ¾): heller Wellenkamm außen, aufspritzende Zacken, zerfällt in Striche
  anim(out, 'shockwave', 6, 96, 72, (p, k) => {
    const cx = 48, cy = 39, rx = [13, 24, 33, 40, 44.5, 47][k], ry = rx * 0.66, th = [13, 7, 6, 4.6, 3, 1.6][k], sp = burst(31, 18);
    const spike = (front: boolean): void => {
      if (k < 1 || k > 3) return;
      for (const s of sp) {
        if (Math.sin(s.a) > 0 !== front) continue;
        const x = cx + Math.cos(s.a) * (rx - 1), y = cy + Math.sin(s.a) * (ry - 1), h = [0, 9, 11, 6][k] * (0.5 + 0.7 * s.s) * (front ? 1 : 0.7);
        needle(p, x, y + 1, -Math.PI / 2 + Math.cos(s.a) * 0.3, h, 3.4, front ? G(0.8) : G(0.62));
        if (front) needle(p, x, y + 1, -Math.PI / 2 + Math.cos(s.a) * 0.3, h * 0.6, 1.4, WH);
      }
    };
    spike(false);
    ering(p, cx, cy, rx, ry, th, (a, e) => {
      const br = [0, 0, 0.06, 0.2, 0.42, 0.66][k];
      if (br && rnd2(Math.floor((a + 4) * rx * 0.3), Math.floor(e * 3), 3 + k) < br) return 0;
      if (k === 0) return e < 0.3 ? G(0.8) : WH;
      return e < 0.34 ? WH : e < 0.62 ? G(0.84) : e < 0.85 ? G(0.66) : G(0.5, 200);
    });
    spike(true);
    if (k >= 2) for (const [i, s] of sp.entries()) {
      if (i % 2) continue;
      const x = cx + Math.cos(s.a + 0.2) * (rx - 4), y = cy + Math.sin(s.a + 0.2) * (ry - 3) - (k - 2) * 1.5;
      puff(p, x, y, [0, 0, 2.6, 3.4, 3, 2][k] * (0.7 + 0.5 * s.q), [G(0.5, 220), G(0.7), G(0.9)], i, 3);
    }
    if (k >= 4) { dissolve(p, k === 4 ? 0.12 : 0.3, 9, 2); for (const s of burst(41, 14)) p.set(cx + Math.cos(s.a) * rx * (0.8 + 0.2 * s.s), cy + Math.sin(s.a) * ry * (0.8 + 0.2 * s.s) - s.q * 6, G(0.75, 210)); }
  });
}
