/**
 * Schattenreich – vorgezeichnete Kleinmotive: Knochenkiesel, Staubflocken, Glassplitter, treibende Plattenbruchstücke,
 * Abdrücke vergessener Leben (Fußspuren, Ringelreihen, Wagenspuren), Geisterblumen, Augen der Dunkelheit, verzerrte
 * Spiegelungen im Kristall; für den Thron der Leere: Königsbanner, leere Statuennischen, Schutt, Goldrisse.
 */
import { INK, P, WHITE, alpha, mix, rng } from '../palette';
import { Px } from '../draw';
import { stampOf, stampRows, type Stamp } from './core';
import { BONE, CARP, DUST, EYE, GLASS, GLOW, GOLDT, MARB, PLATE, RIM, RIM2, SLAB, TAR, VEIN, VGL } from './schatten_pal';

export const SS = {
  peb: [] as Stamp[], mote: [] as Stamp[], shard: [] as Stamp[], frag: [] as Stamp[], fragS: [] as Stamp[], foot: [] as Stamp[], ring: [] as Stamp[],
  wheel: [] as Stamp[], flower: [] as Stamp[], eye: [] as Stamp[], refl: [] as Stamp[], glint: [] as Stamp[], cluster: [] as Stamp[], crack: [] as Stamp[],
  banner: [] as Stamp[], niche: [] as Stamp[], rubble: [] as Stamp[], gcrack: [] as Stamp[], pmote: [] as Stamp[],
};
const SHD = alpha(INK, 90);

/** Aufrechter Glassplitter von (bx, by) nach oben. */
function spike(p: Px, bx: number, by: number, hh: number, hw: number, lean: number): void {
  for (let j = 0; j < hh; j++) {
    const f = hh > 1 ? j / (hh - 1) : 1, w = Math.round(hw * (f < 0.4 ? 1 : 1 - (f - 0.4) / 0.6)), cx = Math.round(bx + lean * f), y = by - j;
    for (let k = -w; k <= w; k++) p.set(cx + k, y, j === 0 ? GLASS[0] : k < 0 ? GLASS[5] : k === 0 ? GLASS[3] : w > 1 && k === w ? GLASS[0] : GLASS[1]);
    if (j === hh - 1) p.set(cx, y, RIM);
    else if (j === hh - 2 && hh > 3) p.set(cx - (w > 0 ? 1 : 0), y, RIM2);
  }
}
/** Treibendes Plattenbruchstück: kantiges Vieleck mit heller Randlinie, dunkler Stirnseite und Schatten. */
function mkFrag(seed: number, rad: number): Stamp {
  const r = rng(seed), w = Math.ceil(rad * 2.6) + 4, h = Math.ceil(rad * 1.7) + 7, p = new Px(w, h), top = new Px(w, h), cx = w / 2, cy = rad * 0.8 + 1.5;
  const n = 4 + ((r() * 3) | 0), pts: Array<[number, number]> = [], a0 = r() * 6.28;
  for (let k = 0; k < n; k++) { const a = a0 + (k / n) * 6.283 + (r() - 0.5) * 0.7, rr = rad * (0.65 + r() * 0.5); pts.push([cx + Math.cos(a) * rr * 1.25, cy + Math.sin(a) * rr * 0.8]); }
  const R = PLATE[seed & 1], t = 2 + ((r() * 3) | 0);
  top.poly(pts, R[t]);
  const on = (x: number, y: number): boolean => top.get(x, y) !== 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (on(x, y)) { p.set(x, y, !on(x, y - 1) || !on(x - 1, y) ? (r() < 0.8 ? RIM : RIM2) : !on(x, y + 1) ? R[t + 2] : x + y * 1.3 < cx + cy * 1.3 - 1 ? R[t + 1] : R[t]); continue; }
    // Stirnseite (2–3 px) und Schatten darunter
    let k = 0;
    for (let j = 1; j <= 5; j++) if (on(x, y - j)) { k = j; break; }
    if (k > 0 && k <= (rad > 3 ? 3 : 2)) p.set(x, y, k === 1 ? R[1] : R[0]);
    else if (k > 0) p.set(x, y, alpha(INK, k === 5 ? 50 : 100));
  }
  return stampOf(p, w >> 1, Math.round(cy));
}
/** Kleiner Fußabdruck im Staub (eingedrückt: Schatten oben links, Lichtkante unten rechts). */
function footprint(p: Px, x: number, y: number, small = false): void {
  const d = DUST[2], D = DUST[1], l = DUST[6];
  p.set(x, y, d); p.set(x + 1, y, D);
  if (!small) { p.set(x, y + 1, D); p.set(x + 1, y + 1, d); p.set(x + 1, y + 2, l); p.set(x, y + 3, d); p.set(x + 1, y + 4, l); }
  else { p.set(x, y + 1, d); p.set(x + 1, y + 2, l); }
}

export function initSchattenStamps(): void {
  if (SS.peb.length) return;
  const pb = { h: BONE[3], l: BONE[2], m: BONE[1], d: BONE[0], s: SHD };
  SS.peb.push(
    stampRows(['.hl.', 'hlmd', '.dds'], pb), stampRows(['hl', 'md', '.s'], pb), stampRows(['hlm', 'mdd', '.ss'], pb), stampRows(['.h.', 'lmd', '.ds'], pb),
    stampRows(['hm', 'ds'], pb), stampRows(['.hhl.', 'hllmd', 'lmmdd', '.ddss'], pb), stampRows(['h', 's'], pb), stampRows(['hl.', '.sm'], pb),
  );
  // Staubflocken: blasse Punkte mit Schein
  const mt = { w: WHITE, d: DUST[5], a: alpha(DUST[5], 110), b: alpha(DUST[4], 60) };
  SS.mote.push(stampRows(['d'], mt, 0, 0), stampRows(['.b.', 'bwb', '.b.'], mt, 1, 1), stampRows(['d.', '.a'], mt, 0, 0), stampRows(['a.d', '...', '.d.'], mt, 1, 1), stampRows(['da'], mt, 0, 0), stampRows(['.a', 'd.', '.b'], mt, 0, 1));
  // Brösel der Trittsteine
  const pm = { h: SLAB[6], m: SLAB[4], d: SLAB[2], g: alpha(GLOW[2], 120), s: SHD };
  SS.pmote.push(stampRows(['h', 'd'], pm, 0, 0), stampRows(['hm', '.d'], pm, 0, 0), stampRows(['.h.', 'gmd', '.s.'], pm, 1, 1), stampRows(['h.m', '..d'], pm, 1, 0), stampRows(['hm.', 'mdg', '.s.'], pm, 1, 1), stampRows(['g.h', '..d', 'm..'], pm, 1, 1));
  // Glassplitter und Splittergruppen
  for (let k = 0; k < 10; k++) {
    const r = rng(9100 + k * 13), p = new Px(11, 13), n = 1 + ((r() * 3) | 0);
    for (let x = 3; x <= 7; x++) p.set(x, 11, SHD);
    for (let j = 0; j < n; j++) spike(p, 4 + j * 2 + ((r() * 2) | 0), 10, 3 + ((r() * 6) | 0), r() < 0.3 ? 1 : 0, ((r() * 3) | 0) - 1);
    SS.shard.push(stampOf(p, 5, 10));
  }
  for (let k = 0; k < 8; k++) {
    const r = rng(9200 + k * 17), p = new Px(24, 22), n = 4 + ((r() * 3) | 0);
    for (let x = 3; x < 21; x++) if (r() < 0.8) p.set(x, 19 + ((r() * 2) | 0), alpha(INK, 110));
    const xs = Array.from({ length: n }, (_, j) => 4 + (j / (n - 1)) * 15 + (r() - 0.5) * 2);
    xs.forEach((x, j) => spike(p, Math.round(x), 18 + (j % 2), 5 + ((r() * 12) | 0), r() < 0.5 ? 1 : 2, ((r() * 5) | 0) - 2));
    SS.cluster.push(stampOf(p, 12, 18));
  }
  for (let k = 0; k < 10; k++) { SS.frag.push(mkFrag(9300 + k * 19, 2.6 + (k % 5) * 0.9)); SS.fragS.push(mkFrag(9400 + k * 23, 1.2 + (k % 3) * 0.5)); }
  // feine Haarrisse mit Lichtkante
  const cp = { d: PLATE[0][0], D: PLATE[0][1], l: PLATE[0][6] };
  SS.crack.push(
    stampRows(['d.......', '.Dd.....', '..lD....', '...dD.d.', '....lDd.', '......D.', '......lD'], cp, 3, 3), stampRows(['......d', '....dD.', '...Dl..', '.dD....', 'Dl.....', 'd......'], cp, 3, 3),
    stampRows(['..d......', '.D.......', '.lDd.....', '...lDdD..', '......lDd', '....d....', '...D.....'], cp, 4, 3), stampRows(['d..', 'lD.', '.d.', '.lD', '..d'], cp, 1, 2),
  );
  // Fußspuren (vier Laufrichtungen), Ringelreihen, Wagenspuren
  for (let k = 0; k < 6; k++) {
    const p = new Px(22, 22), dx = [3, -3, 4, -4, 2, 0][k], dy = [-4, -4, -2, -2, -5, -5][k], small = k >= 4;
    for (let s = 0; s < 4; s++) footprint(p, 10 + dx * (s - 1.5) + (s & 1 ? 2 : -2), 10 + dy * (s - 1.5), small);
    SS.foot.push(stampOf(p, 11, 11));
  }
  for (let k = 0; k < 2; k++) {
    const p = new Px(26, 20), n = k ? 10 : 8;
    for (let s = 0; s < n; s++) { const a = (s / n) * 6.283 + k * 0.3; footprint(p, 12 + Math.cos(a) * (k ? 10 : 8), 8 + Math.sin(a) * (k ? 7 : 5.5), true); }
    p.set(12, 9, DUST[2]); p.set(13, 9, DUST[6]);
    SS.ring.push(stampOf(p, 13, 10));
  }
  for (let k = 0; k < 4; k++) {
    const p = new Px(30, 16), sl = [0, 0.25, -0.25, 0.12][k];
    for (let x = 0; x < 30; x++) {
      const y = 4 + sl * x + Math.sin(x * 0.2 + k) * 1.2;
      for (const o of [0, 7]) { if ((x + o) % 5 === 4) continue; p.set(x, y + o, DUST[2]); p.set(x, y + o + 1, x % 3 ? DUST[6] : DUST[5]); }
    }
    SS.wheel.push(stampOf(p, 15, 8));
  }
  // Geisterblumen: flach, weiß, mit kaltem Schein
  const gf = (c: number, g: number): Record<string, number> => ({ w: WHITE, c, a: alpha(g, 95), b: alpha(g, 45), s: DUST[2] });
  for (const pal of [gf(GLOW[1], P.ice[2]), gf(VEIN[3], P.pink[3]), gf(P.ice[2], P.ice[3])]) {
    SS.flower.push(
      stampRows(['.bab.', 'bawab', 'awcwa', 'bawab', '.bsb.'], pal, 2, 2), stampRows(['.b.', 'bwb', 'acs', '.b.'], pal, 1, 1), stampRows(['b.b', '.w.', 'bsb'], pal, 1, 1),
      stampRows(['.a...b.', 'awa.bwb', 'bcab.s.', '.sawa..', '..bcb..', '...s...'], pal, 3, 3), stampRows(['.bwb.', 'bwcwb', '.bwsb', '..b..'], pal, 2, 1),
    );
  }
  // Augen der Dunkelheit
  const ey = { e: EYE[1], E: EYE[2], w: EYE[3], g: alpha(EYE[1], 80), k: TAR[0] };
  SS.eye.push(
    stampRows(['.g..g.', 'gEg.Eg', '.g..g.'], ey, 2, 1), stampRows(['g.g', 'e.e'], ey, 1, 1), stampRows(['.g.', 'gwg', '.g.'], ey, 1, 1), stampRows(['.g...g.', 'gEkkkEg', '.g...g.'], ey, 3, 1),
    stampRows(['e', '.', 'e'], ey, 0, 1), stampRows(['.gg.', 'gEwg', '.gg.'], ey, 1, 1), stampRows(['E..E', '....', '.E..'], ey, 1, 1),
  );
  // verzerrte Spiegelungen im Glas: Gesichter und Bögen
  for (let k = 0; k < 6; k++) {
    const r = rng(9500 + k * 29), p = new Px(15, 19), face = k < 4, ph = r() * 6, amp = 1 + r() * 1.3;
    const lite = alpha(k % 2 ? VEIN[3] : P.ice[2], 85), lite2 = alpha(k % 2 ? VEIN[4] : P.ice[3], 130), dark = alpha(INK, 150);
    for (let y = 0; y < 18; y++) {
      const off = Math.round(Math.sin(y * 0.5 + ph) * amp), cx = 7 + off;
      if (face) {
        const hw = y < 9 ? 3.6 * Math.sqrt(1 - ((y - 5) / 6) ** 2 || 0) : 3.2 * (1 - (y - 9) / 9);
        if (!(hw > 0.4)) continue;
        for (let x = -Math.round(hw); x <= Math.round(hw); x++) p.set(cx + x, y, Math.abs(x) >= Math.round(hw) ? lite2 : lite);
        if (y === 5 || y === 6) { p.set(cx - 2, y, dark); p.set(cx + 2, y, dark); if (hw > 3) { p.set(cx - 1, y, y === 5 ? dark : lite); } }
        if (y >= 9 && y <= 11 + (k & 1) * 2) p.set(cx, y, dark);
      } else {
        const rise = y < 6 ? Math.sqrt(36 - (6 - y) ** 2) : 6;
        p.set(cx - Math.round(rise), y, lite2); p.set(cx + Math.round(rise), y, lite); if (y < 6) { p.set(cx - Math.round(rise) + 1, y, lite); p.set(cx + Math.round(rise) - 1, y, lite); }
        if (y === 0) for (let x = -1; x <= 1; x++) p.set(cx + x, 0, lite2);
      }
    }
    SS.refl.push(stampOf(p, 7, 9));
  }
  const gl = { a: GLASS[4], b: GLASS[3], c: RIM2, h: alpha(GLASS[5], 60), m: VEIN[2] };
  SS.glint.push(stampRows(['.h.', 'hch', '.b.'], gl, 1, 1), stampRows(['c', 'b'], gl, 0, 0), stampRows(['.a', 'cb', '.b'], gl, 0, 1), stampRows(['a.b', '.c.'], gl, 1, 0), stampRows(['m', 'b'], gl, 0, 0), stampRows(['.h.', 'hmh'], gl, 1, 1));

  // ------------------------------------------------------------------ Thron der Leere
  // Königsbanner: Stange, tiefes Purpur, angelaufenes Kronen-und-Quell-Emblem, zerfetzter Saum
  for (let k = 0; k < 4; k++) {
    const r = rng(9600 + k * 31), p = new Px(15, 28), len = 21 + ((r() * 5) | 0);
    for (let x = 0; x < 15; x++) { p.set(x, 0, x === 0 || x === 14 ? GOLDT[3] : GOLDT[2]); p.set(x, 1, GOLDT[0]); }
    for (let x = 2; x < 13; x++) {
      const tat = Math.round(len - 3 * Math.abs(Math.sin(x * 1.3 + k * 2)) - (r() < 0.25 ? 3 + r() * 5 : 0));
      for (let y = 2; y < tat; y++) {
        const fold = Math.sin(x * 0.9 + k) + (y > 12 ? Math.sin(x * 0.5 + y * 0.12) * 0.5 : 0);
        let col = x === 2 ? CARP[4] : x === 12 ? CARP[0] : fold > 0.5 ? CARP[4] : fold > -0.3 ? CARP[3] : CARP[2];
        if (x === 3 || x === 11) col = y % 4 === 3 ? CARP[2] : GOLDT[1];
        if (y === 2) col = CARP[1];
        if (y >= tat - 1) col = CARP[1];
        p.set(x, y, col);
      }
      p.set(x, tat, alpha(INK, 110));
    }
    for (let y = 3; y < len - 4; y++) p.set(13, y, alpha(INK, 90));
    // Löcher
    for (let j = 0; j < 2 + k; j++) { const hx = 4 + ((r() * 7) | 0), hy = 14 + ((r() * 6) | 0); p.set(hx, hy, MARB[1]); if (r() < 0.6) p.set(hx, hy + 1, MARB[1]); p.set(hx + 1, hy, CARP[1]); }
    // Emblem: Krone (drei Zacken) über einem Quelltropfen
    const g = GOLDT[3], G = GOLDT[2], d = GOLDT[0];
    p.px([5, 5, 7, 4, 9, 5], GOLDT[4]); p.px([5, 6, 6, 6, 7, 5, 7, 6, 8, 6, 9, 6], g); p.px([5, 7, 6, 7, 7, 7, 8, 7, 9, 7], G); p.px([5, 8, 6, 8, 7, 8, 8, 8, 9, 8], d);
    p.px([7, 10], g); p.px([6, 11, 7, 11, 8, 11], G); p.px([6, 12, 8, 12], G); p.px([7, 12], GOLDT[4]); p.px([7, 13], d);
    SS.banner.push(stampOf(p, 7, 0));
  }
  // leere Statuennische: Bogen, dunkle Höhlung, verwaister Sockel
  for (let k = 0; k < 3; k++) {
    const p = new Px(14, 24);
    for (let y = 0; y < 23; y++) {
      const hw = y < 6 ? Math.round(Math.sqrt(36 - (6 - y) ** 2)) : 6;
      for (let x = -hw; x <= hw; x++) {
        const ed = hw - Math.abs(x);
        let col = ed === 0 ? (x < 0 || y < 2 ? MARB[1] : MARB[5]) : ed === 1 && x < 0 ? MARB[0] : y < 3 + (ed < 3 ? 0 : 1) ? MARB[0] : x < -1 ? mix(MARB[0], INK, 0.5) : mix(MARB[1], VGL[0], 0.4);
        if (y === 22) col = MARB[4];
        p.set(7 + x, y, col);
      }
    }
    // Sockel
    for (let x = 3; x <= 11; x++) { p.set(x, 18, MARB[5]); p.set(x, 19, MARB[3]); p.set(x, 20, x > 9 ? MARB[1] : MARB[2]); p.set(x, 21, MARB[1]); }
    for (let x = 4; x <= 10; x++) p.set(x, 17, x < 6 ? MARB[4] : MARB[3]);
    if (k === 1) { p.px([5, 16, 6, 16, 6, 15], MARB[4]); p.px([7, 16, 9, 16], MARB[2]); }       // Fußreste der Statue
    else if (k === 2) { p.px([6, 16, 7, 16, 8, 16, 7, 15], GOLDT[1]); p.set(7, 14, GOLDT[3]); }  // vergessene Opfergabe
    SS.niche.push(stampOf(p, 7, 0));
  }
  for (let k = 0; k < 6; k++) {
    const r = rng(9700 + k * 37), p = new Px(14, 9), n = 2 + ((r() * 3) | 0);
    for (let j = 0; j < n; j++) {
      const x = 3 + j * (8 / n) + r() * 2, sw = 1.4 + r() * 2, sh = 1 + r() * 1.3, y = 5.6 - sh + r();
      p.ell(x + 0.6, y + sh * 0.5 + 0.8, sw, sh * 0.8, SHD);
      p.ball(x, y, sw, sh, j % 2 ? MARB : SLAB, 1, 6, 0.06);
    }
    SS.rubble.push(stampOf(p, 7, 6));
  }
  // haarfeine Goldrisse
  const gc = { g: GOLDT[2], G: GOLDT[3], d: MARB[0] };
  SS.gcrack.push(
    stampRows(['g.......', '.Gd.....', '..gG....', '...dg.g.', '....Gg..', '......g.', '......dG'], gc, 3, 3), stampRows(['......g', '....gG.', '...gd..', '.gG....', 'Gd.....', 'g......'], gc, 3, 3),
    stampRows(['..g......', '.G.......', '.dGg.....', '...dgGg..', '......dGg', '....g....', '...G.....'], gc, 4, 3), stampRows(['g..', 'dG.', '.g.', '.dG', '..g'], gc, 1, 2),
  );
}
