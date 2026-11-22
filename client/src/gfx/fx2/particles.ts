/** Partikel, Wetter, Licht und Schatten. Tintbar (weiß/grau), wenn nicht anders vermerkt. */
import type { Px } from '../draw';
import { P, WHITE, rnd2 } from '../palette';
import { G, K, W, WH, anim, dissolve, hollow, kite, one, puff, twinkle, withA } from './kit';
import type { Item } from './kit';

/** Kleines Bitmap aus Zeichenzeilen ('.' = leer). */
export function bmp(p: Px, x: number, y: number, rows: readonly string[], map: Record<string, number>): void {
  rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const c = map[r[i]]; if (c !== undefined) p.set(x + i, y + j, c); } });
}

/** Weicher Lichtkreis ohne harte Stufen: fällt stufenlos bis auf null ab, damit kein Rand sichtbar wird. */
function radial(p: Px, peak: number, pow: number): void {
  const c = p.w / 2;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const d = Math.hypot(x + 0.5 - c, y + 0.5 - c) / (c - 1);
    if (d >= 1) continue;
    // feines Rauschen gegen Farbstufen im dunklen Auslauf
    const n = (((x * 7 + y * 13) ^ (x * 3 + y * 5)) & 3) / 4 - 0.375;
    const a = Math.floor(peak * Math.pow(1 - d, pow) * (1 - d * d * d * 0.35) + n + 0.5);
    if (a >= 1) p.set(x, y, W(Math.min(255, a)));
  }
}
function softShadow(p: Px): void {
  const { w, h } = p;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const nx = (x + 0.5 - w / 2) / (w / 2), ny = (y + 0.5 - h / 2) / (h / 2), d = nx * nx + ny * ny;
    if (d >= 1) continue;
    // drei Bänder, der äußere Saum im Schachbrett aufgelöst
    const a = d < 0.42 ? 118 : d < 0.72 ? 92 : d < 0.9 ? 62 : (x + y) % 2 ? 44 : 0;
    if (a) p.set(x, y, K(a));
  }
}

export function particleItems(out: Item[]): void {
  one(out, 'px', 2, 2, (p) => p.rect(0, 0, 2, 2, WH));
  one(out, 'spark', 5, 5, (p) => bmp(p, 0, 0, ['..g..', '.gWg.', 'gWWWg', '.gWg.', '..g..'], { W: WH, g: G(0.82) }));
  one(out, 'star', 7, 7, (p) => bmp(p, 0, 0, ['...g...', '...W...', '..gWg..', 'gWWWWWg', '..gWg..', '...W...', '...g...'], { W: WH, g: G(0.78) }));

  // Rauch: vier klobige Ballenformen (dicht → zerfasert), für Partikel-Lebenszyklen
  const sm = [G(0.56), G(0.78), WH];
  anim(out, 'smoke', 4, 16, 16, (p, k) => {
    if (k === 0) puff(p, 8, 8.5, 6.4, sm, 3, 5);
    if (k === 1) { puff(p, 7.5, 8.5, 6.2, sm, 8, 6); hollow(p, 11.5, 11.5, 2, 1); }
    if (k === 2) { puff(p, 5.5, 9.5, 4.2, sm, 5, 4); puff(p, 11, 6, 3.6, sm, 6, 4); p.set(12, 12, sm[1]); p.set(3, 3, sm[0]); }
    if (k === 3) { puff(p, 4.5, 10.5, 2.6, sm.slice(0, 2), 5, 3); puff(p, 11.5, 5, 2.4, sm.slice(0, 2), 6, 3); puff(p, 10, 12, 1.5, sm, 7, 3); dissolve(p, 0.22, 3); p.set(6, 4, sm[0]); p.set(13, 9, sm[0]); }
  });

  // Glut (farbig)
  anim(out, 'ember', 2, 3, 3, (p, k) => {
    const f = P.fire;
    if (k === 0) bmp(p, 0, 0, ['.o.', 'oyo', '.r.'], { o: f[2], y: f[4], r: f[1] });
    else bmp(p, 0, 0, ['.r.', '.yo', '...'], { o: f[2], y: f[3], r: f[1] });
  });
  one(out, 'mote', 3, 3, (p) => bmp(p, 0, 0, ['aba', 'bWb', 'aba'], { W: WH, b: W(150), a: W(48) }));

  // Blatt, taumelnd (farbig grün; die Engine tönt es für Herbst um)
  anim(out, 'leaf', 4, 8, 8, (p, k) => {
    const m = { d: P.green[1], g: P.green[2], l: P.green[3], h: P.green[4] };
    bmp(p, 0, 0, [
      ['........', '....dll.', '...glhhl', '..glhhl.', '.dglhl..', '.dggl...', 'd.dd....', '........'],
      ['........', '..d.....', '..dg....', '..glg...', '..glhl..', '...lhhl.', '....llh.', '.......d'],
      ['........', '........', '.....ll.', '...llhh.', '.dgghl..', 'd.dd....', '........', '........'],
      ['........', '.dd.....', '.dggd...', '..gglg..', '..dgllg.', '...dglld', '....ddg.', '........'],
    ][k], m);
  });
  anim(out, 'petal', 2, 5, 5, (p, k) => {
    const m = { d: P.pink[2], p: P.pink[3], l: P.pink[4], w: WHITE };
    bmp(p, 0, 0, [['.pl..', 'pllw.', 'plll.', '.dpp.', '..d..'], ['.....', '..plw', '.pll.', 'dpp..', '.....']][k], m);
  });
  // Schneeflocken in drei Größen (3, 5, 7 px), alle im 7×7-Frame zentriert
  anim(out, 'snowflake', 3, 7, 7, (p, k) => {
    const m = { W: WH, g: G(0.86, 220), a: W(120) };
    bmp(p, 0, 0, [
      ['.......', '.......', '...g...', '..gWg..', '...g...', '.......', '.......'],
      ['.......', '.g.W.g.', '..gWg..', '.WWWWW.', '..gWg..', '.g.W.g.', '.......'],
      ['...W...', '.g.W.g.', '..aWa..', 'WWWWWWW', '..aWa..', '.g.W.g.', '...W...'],
    ][k], m);
  });
  one(out, 'raindrop', 2, 10, (p) => { for (let y = 0; y < 10; y++) p.set(1, y, y < 3 ? W(70) : y < 6 ? W(140) : W(215)); p.set(0, 7, W(120)); p.set(0, 8, WH); p.set(0, 9, WH); p.set(1, 9, WH); });
  anim(out, 'rain_splash', 3, 8, 5, (p, k) => {
    const m = { W: WH, g: G(0.85, 200), a: W(110) };
    bmp(p, 0, 0, [
      ['........', '........', '...W....', '..gWWg..', '...gg...'],
      ['..W..W..', '.g....g.', '..W..W..', '.gWaaWg.', '..aWWa..'],
      ['.g....g.', '........', 'g......g', '.Wa..aW.', '..ggaa..'],
    ][k], m);
  });
  anim(out, 'ash', 2, 4, 4, (p, k) => bmp(p, 0, 0, [['.gW.', 'gWWd', '.dg.', '....'], ['....', '.dg.', 'gWg.', '.d..']][k], { W: G(0.9), g: G(0.7), d: G(0.5, 210) }));
  // Höhlentropfen: fällt, schlägt auf, Spritzer
  anim(out, 'drip', 4, 6, 14, (p, k) => {
    const m = { W: WH, g: G(0.84), a: W(120) };
    if (k === 0) bmp(p, 2, 0, ['a.', 'W.', 'Wg', 'WW', 'gW'], m);
    if (k === 1) bmp(p, 2, 4, ['a.', 'a.', 'W.', 'Wg', 'WW', 'WW', 'g.'], m);
    if (k === 2) bmp(p, 0, 8, ['..a...', '..W...', 'g....g', '.W..W.', '.gWWg.', '..gg..'], m);
    if (k === 3) bmp(p, 0, 8, ['g....g', '......', '......', 'a....a', 'Wa..aW', '.gaag.'], m);
  });
  // Hitzeflimmern: sehr schwache Wellenlinien
  anim(out, 'heat', 4, 16, 24, (p, k) => {
    for (const [x0, ph, a] of [[3, 0, 44], [8, 2.1, 60], [12, 4.2, 40]] as const) for (let y = 1; y < 23; y++) {
      const x = x0 + Math.round(Math.sin(y * 0.55 + ph + k * 1.5708) * 1.6), e = Math.min(1, Math.min(y, 23 - y) / 6);
      if ((y + k * 2 + x0) % 7 === 0) continue;
      p.set(x, y, W(a * e));
      if (e > 0.9 && (y + x0) % 3 === 0) p.set(x + 1, y, W(a * 0.45));
    }
  });
  anim(out, 'void_mote', 3, 5, 5, (p, k) => {
    const m = { W: WHITE, p: P.pink[3], v: P.violet[3], d: P.violet[2], a: withA(P.violet[2], 150) };
    bmp(p, 0, 0, [['..v..', '.vpv.', 'vpWpv', '.vpv.', '..d..'], ['.....', '..p..', '.pWv.', '..v..', '.....'], ['a...a', '..v..', '.vWp.', '..d..', 'a...a']][k], m);
  });

  // Sonnenstrahl: schräg (oben links → unten rechts), in Bänder quantisiert, für additives Blending
  one(out, 'godray', 48, 160, (p) => {
    for (let y = 0; y < 160; y++) {
      const v = y / 159, cx = 13 + v * 21, hw = 7 + v * 5.5;
      const fade = Math.min(1, v / 0.12) * Math.min(1, (1 - v) / 0.4);
      for (let x = 0; x < 48; x++) {
        const u = (x + 0.5 - cx) / hw;
        if (Math.abs(u) >= 1) continue;
        // drei Teilstrahlen unterschiedlicher Stärke
        const sub = Math.abs(u + 0.45) < 0.2 ? 0.75 : Math.abs(u - 0.5) < 0.16 ? 0.6 : Math.abs(u) < 0.22 ? 1 : 0.38;
        const a = Math.floor((1 - Math.abs(u)) * sub * fade * 6 + 0.35) / 6;
        if (a > 0) p.set(x, y, W(a * 120));
      }
    }
  });
  one(out, 'glow', 128, 128, (p) => radial(p, 255, 2));
  one(out, 'glow_small', 48, 48, (p) => radial(p, 255, 1.8));
  one(out, 'shadow', 24, 10, softShadow);
  one(out, 'shadow_l', 48, 18, softShadow);
}
void kite; void twinkle; void rnd2;
