/** Geschosse (zeigen nach rechts; die Engine dreht sie). Farbige tragen ihre Elementpalette, tintbare sind weiß/grau. */
import { Px } from '../draw';
import { INK, P, WHITE, hex, mix, rnd2 } from '../palette';
import { DEG, G, TAU, WH, anim, arcSmear, heatOf, kite, needle, one, rock, twinkle, withA } from './kit';
import type { Item } from './kit';

export const MINT = [P.teal[1], P.teal[3], P.teal[4], hex('#d2f8e6'), WHITE] as const;

export function projectileItems(out: Item[]): void {
  // ------------------------------------------------------------ Pfeil (farbig)
  one(out, 'arrow', 16, 7, (p) => {
    p.rect(3, 3, 9, 1, P.tan[3]); p.px([4, 3, 7, 3, 10, 3], P.tan[2]);
    p.px([11, 2, 12, 2, 12, 3, 13, 3, 14, 3], P.steel[4]); p.px([11, 3], P.steel[3]); p.px([11, 4, 12, 4], P.steel[2]);
    p.px([1, 1, 2, 1, 1, 2, 2, 2, 3, 2], P.red[3]); p.px([2, 2], P.red[4]); p.px([1, 4, 2, 4, 3, 4, 1, 5, 2, 5], P.red[2]); p.px([1, 3, 2, 3], P.tan[1]);
    p.outline();
  });
  // Luftspur des Pfeils (tintbar), drei Flackerbilder
  anim(out, 'arrow_trail', 3, 24, 5, (p, k) => {
    for (let x = 1; x < 24; x++) {
      const t = x / 23;
      if (t < 0.55 && rnd2(Math.floor((x + k * 2) / 2), 0, 7) < 0.75 - t) continue;
      p.set(x, 2, t > 0.72 ? WH : t > 0.45 ? G(0.86) : G(0.7, 210));
    }
    const o = [0, 3, 6][k];
    for (let x = 12 + (o % 4); x < 22; x++) if ((x + o) % 5 !== 0) { p.set(x, 1, G(0.8, x > 17 ? 255 : 190)); }
    for (let x = 9 + ((o + 2) % 5); x < 21; x++) if ((x + o) % 4 !== 1) { p.set(x, 3, G(0.72, x > 16 ? 240 : 170)); }
    p.set([5, 2, 7][k], 0, G(0.7, 160)); p.set([3, 8, 4][k], 4, G(0.7, 160));
  });
  // ------------------------------------------------------------ Wurfdolch (farbig)
  one(out, 'dagger', 14, 7, (p) => {
    p.px([1, 3], P.gold[2]); p.rect(2, 3, 2, 1, P.wood[3]); p.px([3, 3], P.wood[2]);
    p.rect(4, 2, 1, 3, P.gold[3]); p.px([4, 2], P.gold[4]);
    p.rect(5, 2, 5, 1, P.steel[4]); p.rect(5, 3, 8, 1, P.steel[3]); p.rect(5, 4, 4, 1, P.steel[2]); p.px([10, 2, 11, 3, 12, 3], P.steel[4]); p.px([9, 4], P.steel[2]);
    p.outline();
  });

  // ------------------------------------------------------------ Feuerball mit flackerndem Schweif
  anim(out, 'bolt_fire', 4, 24, 16, (p, k) => {
    const f = P.fire, hx = 16.5, hy = 8;
    const wob = [[-3, 2, 0], [2, -3, 1], [-1, 3, -2], [3, -1, 2]][k], len = [[13, 10, 15], [15, 12, 11], [11, 15, 13], [14, 11, 15]][k];
    // drei Flammenzungen nach hinten
    [-3.2, 3.2, 0].forEach((oy, i) => {
      const a = Math.atan2(wob[i] * 0.5, -len[i]);
      needle(p, hx - 2, hy + oy, a, len[i], 5.5, f[1]);
      needle(p, hx - 2, hy + oy * 0.8, a, len[i] * 0.72, 3.6, f[2]);
      if (i === 2) needle(p, hx - 1, hy, a, len[i] * 0.5, 2.4, f[3]);
    });
    p.ell(hx, hy, 6, 6, f[1]); p.ell(hx + 0.2, hy, 5, 5, f[2]); p.ell(hx + 0.8, hy - 0.4, 3.8, 3.8, f[3]); p.ell(hx + 1.4, hy - 0.8, 2.4, 2.4, f[4]);
    p.rect(Math.round(hx + 1), Math.round(hy - 2), 2, 2, WHITE);
    // Lücken im Flammenkranz + Glutpunkte
    p.set(hx - 5, hy + [-5, 5, -4, 4][k], 0);
    for (let i = 0; i < 3; i++) p.set(1 + ((i * 3 + k * 2) % 7), 3 + ((i * 5 + k * 3) % 10), i === 0 ? f[4] : f[2]);
    p.set(hx + 6, hy + [-2, 1, 2, -1][k], f[2]);
  });

  // ------------------------------------------------------------ Eissplitter mit Frostglanz
  anim(out, 'bolt_water', 4, 24, 14, (p, k) => {
    const ic = P.ice, o = P.blue[1];
    // Eisbröckchen im Schlepp
    const ch = [[2, 4, 5, 10], [1, 9, 4, 3], [3, 5, 6, 11], [1, 10, 5, 4]][k];
    kite(p, ch[0] + 1, ch[1], 0.3, 3.4, 2, ic[2], ic[4]); kite(p, ch[2] + 1, ch[3], -0.2, 2.6, 1.4, ic[3]);
    p.set([7, 8, 6, 9][k], [2, 12, 12, 1][k], ic[4]); p.set([0, 2, 1, 3][k], 7, ic[3]);
    // Hauptkristall: kantige Raute mit Facetten
    p.poly([[23.5, 7], [15, 2.2], [6, 5.4], [4, 7], [6, 8.6], [15, 11.8]], o);
    p.poly([[22.5, 7], [15, 3.2], [7, 6], [5.4, 7]], ic[3]);
    p.poly([[22.5, 7], [15, 10.8], [7, 8], [5.4, 7]], ic[1]);
    p.poly([[20, 7], [15, 4.4], [10, 6.2], [14, 7]], ic[4]);
    p.poly([[18, 7.6], [14.5, 9.6], [10, 8], [13, 7.4]], ic[2]);
    p.line(6, 7, 22, 7, WHITE); p.set(22, 7, WHITE); p.set(23, 7, ic[4]);
    p.line(15, 3, 13, 6, ic[4]);
    // wandernder Glanz
    const gx = [18, 14, 10, 20][k];
    twinkle(p, gx, k % 2 ? 5 : 7, k === 3 ? 1 : 2, WHITE, ic[4]);
  });

  // ------------------------------------------------------------ Taumelnder Felsbrocken mit Staub
  anim(out, 'bolt_earth', 4, 18, 16, (p, k) => {
    const l = new Px(18, 16);
    rock(l, 10.5, 8, 5.6, k * (TAU / 4) + 0.3, [P.wood[1], P.tan[1], P.tan[3]], 4);
    // Moosfleck und Riss drehen mit
    const a = k * (TAU / 4);
    l.set(10.5 + Math.cos(a + 2.2) * 3, 8 + Math.sin(a + 2.2) * 3, P.green[2]); l.set(10.5 + Math.cos(a + 2.5) * 2, 8 + Math.sin(a + 2.5) * 2.4, P.green[3]);
    l.set(10.5 + Math.cos(a + 5) * 2, 8 + Math.sin(a + 5) * 2, P.wood[1]); l.set(10.5 + Math.cos(a + 5.2) * 3.2, 8 + Math.sin(a + 5.2) * 3.2, P.wood[1]);
    l.outline(mix(P.wood[0], INK, 0.4));
    // Staubfahne und Krümel
    const d = [P.tan[2], P.tan[3], P.cream[3]];
    p.rect([1, 0, 2, 0][k], [5, 9, 6, 10][k], 2, 2, d[1]); p.set([1, 0, 2, 0][k], [5, 9, 6, 10][k], d[2]);
    p.rect([3, 2, 0, 3][k], [10, 4, 9, 5][k], 2, 1, d[0]); p.set([0, 3, 1, 2][k], [8, 12, 3, 13][k], d[1]);
    p.set([4, 1, 3, 1][k], [2, 7, 13, 7][k], P.tan[1]);
    p.draw(l);
  });

  // ------------------------------------------------------------ Windsichel: rotierende Mintklinge
  anim(out, 'bolt_wind', 4, 24, 18, (p, k) => {
    const heat = heatOf(MINT), a0 = k * 90 - 30;
    // Zugluft nach hinten
    for (const [y, x0, x1] of [[3, 0, 7], [9, 0, 5], [14, 1, 8]] as const) for (let x = x0 + (k % 2); x < x1; x++) if ((x + k) % 3) p.set(x, y + (k % 2), x > x1 - 3 ? MINT[2] : withA(MINT[1], 200));
    arcSmear(p, { cx: 14.5, cy: 9, rx: 8.6, ry: 8.6, a0, a1: a0 + 235, w: 4.6, heat, gain: 1.35, comb: 0.5, seed: 3, fat: 0.6 });
    arcSmear(p, { cx: 14.5, cy: 9, rx: 4, ry: 4, a0: a0 + 150, a1: a0 + 330, w: 1.6, heat, gain: 0.9, comb: 0, seed: 5 });
    p.set(14, 9, WHITE); p.set(15, 9, MINT[3]);
    const ah = (a0 + 242) * DEG; p.set(14.5 + Math.cos(ah) * 8.4, 9 + Math.sin(ah) * 8.4, WHITE);
  });

  // ------------------------------------------------------------ Lichtlanze: gold-weißer Stern
  anim(out, 'bolt_light', 4, 26, 14, (p, k) => {
    const g = P.gold, cx = 17, v = [12, 9, 13, 8][k];
    kite(p, 13, 7, 0, 25, 5.6, g[2]); kite(p, 13.5, 7, 0, 23, 3.6, g[3]);
    kite(p, cx, 7, Math.PI / 2, v, 3.2, g[3]); kite(p, cx, 7, Math.PI / 2, v - 2, 1.4, g[4]);
    for (const s of [-1, 1]) for (const t of [-1, 1]) { const d = k % 2 ? 3 : 4; p.line(cx + s * 2, 7 + t * 2, cx + s * d, 7 + t * d, g[3]); }
    kite(p, 14, 7, 0, 20, 1.6, g[4]); p.line(8, 7, 24, 7, WHITE); p.rect(cx - 2, 6, 4, 3, WHITE); p.rect(cx - 1, 5, 2, 5, WHITE);
    p.set(25, 7, g[4]);
    twinkle(p, [3, 6, 2, 5][k], [3, 11, 10, 2][k], 1, g[4], g[3]); p.set([7, 2, 6, 1][k], [11, 4, 3, 9][k], g[3]); p.set([1, 4, 0, 3][k], 7, g[2]);
  });

  // ------------------------------------------------------------ Leerenkugel: dunkler Kern, kreisende Funken
  anim(out, 'bolt_dark', 4, 22, 18, (p, k) => {
    const v = P.violet, m = P.pink, cx = 13.5, cy = 9;
    const motes = [0, 1, 2].map((i) => { const a = k * (TAU / 4) + (i * TAU) / 3 + 0.5; return [cx + Math.cos(a) * 7.6, cy + Math.sin(a) * 4.2 + Math.cos(a) * 2, Math.sin(a)] as const; });
    // Schlieren nach hinten
    for (const [oy, ph] of [[-3, 0], [3, 1.6], [0, 3.1]] as const) for (let x = 0; x < 9; x++) {
      const y = cy + oy + Math.sin(x * 0.9 + k * 1.57 + ph) * 1.4;
      if (x < 3 && (x + k) % 2) continue;
      p.set(x, y, x > 5 ? v[3] : x > 2 ? v[2] : withA(v[2], 190));
    }
    for (const [x, y, z] of motes) if (z < 0) p.set(x, y, v[2]);
    p.ell(cx, cy, 6.6, 6.6, m[2]); p.ell(cx, cy, 5.8, 5.8, v[2]); p.ell(cx + 0.3, cy + 0.3, 4.8, 4.8, v[1]); p.ell(cx + 0.4, cy + 0.4, 3.6, 3.6, P.shadow[0]);
    // Magenta-Lichtsaum oben links, kleiner Wirbel im Kern
    for (let a = 190; a <= 280; a += 6) p.set(cx + Math.cos(a * DEG) * 5.6, cy + Math.sin(a * DEG) * 5.6, a > 215 && a < 255 ? m[4] : m[3]);
    const sa = k * (TAU / 4); p.set(cx + 0.4 + Math.cos(sa) * 1.6, cy + 0.4 + Math.sin(sa) * 1.6, v[3]); p.set(cx + 0.4 - Math.cos(sa) * 1.6, cy + 0.4 - Math.sin(sa) * 1.6, v[2]);
    p.set(cx + 6.2, cy + [-2, 2, 0, -1][k], m[3]);
    for (const [x, y, z] of motes) if (z >= 0) { p.set(x, y, WHITE); p.set(x - 1, y, m[3]); p.set(x, y - 1, m[3]); p.set(x + 1, y, m[2]); }
  });

  // ------------------------------------------------------------ Arkankugel (tintbar)
  anim(out, 'bolt_arcane', 4, 20, 16, (p, k) => {
    const cx = 13.5, cy = 8, wob = [-2, 1.5, 2, -1.5][k];
    const a = Math.atan2(wob * 0.5, -12);
    needle(p, cx - 2, cy - 2, a - 0.08, [12, 10, 13, 11][k], 4.4, G(0.62)); needle(p, cx - 2, cy + 2, a + 0.1, [10, 13, 11, 12][k], 4.4, G(0.62));
    needle(p, cx - 1, cy, a, [11, 12, 10, 12][k], 4, G(0.84)); needle(p, cx, cy, a, 7, 2, WH);
    p.ell(cx, cy, 5.6, 5.6, G(0.66)); p.ell(cx, cy, 4.7, 4.7, G(0.86)); p.ell(cx - 0.3, cy - 0.3, 3.5, 3.5, WH);
    p.set(cx + 2, cy + 2, G(0.86)); p.set(cx + 1, cy + 3, G(0.86));
    const oa = k * (TAU / 4) + 0.6; twinkle(p, cx + Math.cos(oa) * 5.6, cy + Math.sin(oa) * 5.6, 1, WH, G(0.9));
    p.set([1, 3, 0, 2][k], [5, 11, 9, 4][k], G(0.7, 200)); p.set([4, 1, 3, 0][k], [12, 3, 2, 12][k], G(0.6, 180));
  });

  // ------------------------------------------------------------ Spore (farbig gelbgrün)
  anim(out, 'spore', 2, 8, 8, (p, k) => {
    const g = P.green, y = hex('#e4f070');
    p.ell(4, 4, 2.6, 2.6, g[2]); p.ell(3.8, 3.8, 2, 2, g[4]); p.rect(3, 3, 2, 1, y); p.set(3, 2, WHITE); p.set(5, 5, g[1]);
    if (k === 0) p.px([4, 0, 0, 4, 7, 3, 3, 7], g[3]); else p.px([1, 1, 6, 1, 1, 6, 6, 6], g[3]);
    p.set(k ? 4 : 6, k ? 7 : 0, withA(y, 200));
  });

  // ------------------------------------------------------------ Lanze: durchschlagender Strahlbolzen (tintbar)
  anim(out, 'lance', 3, 48, 12, (p, k) => {
    for (let x = 0; x < 48; x++) {
      const t = x / 47;
      const hw = t > 0.84 ? 3.6 * Math.pow((1 - t) / 0.16, 0.8) : 1 + 2.6 * Math.pow(t / 0.84, 1.4) + (((x + k * 3) % 9) < 2 ? 0.9 : 0);
      for (let y = 0; y < 12; y++) {
        const d = Math.abs(y + 0.5 - 6);
        if (d > hw) continue;
        if (t < 0.35 && rnd2(Math.floor((x + k * 4) / 3), y, 2) < 0.7 - t * 2) continue;
        p.set(x, y, d < 1 ? WH : d < hw * 0.55 ? G(0.9) : G(0.72, t < 0.4 ? 200 : 255));
      }
    }
    for (let i = 0; i < 3; i++) { const x = 14 + ((i * 11 + k * 5) % 28); p.set(x, 6 - 4, G(0.86)); p.set(x, 6 + 3, G(0.86)); p.set(x + 1, 6 - 5, G(0.7, 200)); p.set(x + 1, 6 + 4, G(0.7, 200)); }
    twinkle(p, 43, 6, k === 1 ? 3 : 2, WH, G(0.9));
    p.set([6, 2, 9][k], [2, 9, 10][k], G(0.7, 190)); p.set([11, 5, 3][k], [10, 1, 3][k], G(0.6, 170));
  });
}
