/** Schattenreich – Gewachsenes: verdrehter Baum, Leerenkristall, Schattendorne, Augenstiel, Schwebsplitter, Tentakel, Riss, Geisterblume. */
import { Px, Pt, bez, tube } from '../draw';
import { Frames, INK, MARK, P, Ramp, WHITE, alpha, barkFill, glow, hash2, limb, mix, rnd2, sw, vnoise } from './kit';
import { MAGENTA, jag, prism, twinkle, vein } from './kr_kit';
import { COLD, FLESH, NIGHT, SBARK, overS, rim, sAnim, sOne, sOutline } from './sc_kit';

const V = P.violet;

// ---------------------------------------------------------------- verdrehter Baum mit hängenden Lichtern
function twistedTree(p: Px, f: number): void {
  const tr = new Px(p.w, p.h);
  const t1 = bez([27, 77], [36, 62], [24, 48]), t2 = bez([24, 48], [16, 38], [28, 28]), t3 = bez([28, 28], [38, 20], [31, 10]);
  limb(tr, t1, 5.6, 4.2); limb(tr, t2, 4.2, 3); limb(tr, t3, 3, 1.4); limb(tr, bez([31, 10], [27, 3], [21, 6]), 1.4, 0.6); limb(tr, bez([21, 6], [19, 9], [22, 11]), 0.6, 0.5);
  // Wurzeln krallen sich in den Boden
  limb(tr, bez([24, 74], [15, 74], [8, 79]), 3.2, 1); limb(tr, bez([30, 74], [40, 75], [47, 79]), 3, 1); limb(tr, bez([27, 76], [26, 78], [22, 79]), 2.6, 1.4); limb(tr, bez([29, 76], [33, 78], [36, 79]), 2, 1);
  // Äste: gekrümmte Klauen
  limb(tr, bez([25, 47], [11, 46], [8, 31]), 3, 1.2); limb(tr, bez([8, 31], [6, 22], [13, 20]), 1.2, 0.5); limb(tr, bez([13, 43], [5, 41], [3, 48]), 1.2, 0.5);
  limb(tr, bez([26, 38], [41, 37], [47, 25]), 2.8, 1.2); limb(tr, bez([47, 25], [50, 16], [43, 13]), 1.2, 0.5); limb(tr, bez([41, 35], [49, 34], [53, 41]), 1.2, 0.5);
  limb(tr, bez([30, 58], [41, 54], [47, 60]), 2, 0.6); limb(tr, bez([27, 29], [17, 25], [16, 13]), 1.8, 0.6); limb(tr, bez([33, 19], [40, 14], [39, 6]), 1.2, 0.5);
  barkFill(tr, SBARK, 13, MARK, 3);
  // Drehwuchs-Furchen und Magenta-Adern, die im Takt pulsieren
  for (let k = 0; k < 8; k++) { const y0 = 46 + k * 3.8; for (let i = 0; i < 9; i++) { const x = 34 - i - Math.round(k * 0.3), y = Math.round(y0 + i * 0.8); if (tr.get(x, y) >>> 24 && tr.get(x + 1, y) >>> 24 && tr.get(x - 1, y) >>> 24) tr.set(x, y, SBARK[0]); } }
  const heat = [0.2, 0.45, 0.7, 0.45][f];
  vein(tr, [...jag([28, 77], [30, 62], 1.4, 3), ...jag([30, 62], [25, 49], 1.2, 4), ...jag([25, 49], [22, 39], 1, 5), ...jag([22, 39], [28, 29], 1, 6)], MAGENTA, heat, 7);
  vein(tr, jag([24, 47], [11, 42], 1, 8), MAGENTA, heat * 0.7, 9, false); vein(tr, jag([27, 37], [42, 33], 1, 10), MAGENTA, heat * 0.7, 11, false); vein(tr, jag([24, 75], [13, 76], 0.8, 12), MAGENTA, heat * 0.6, 13, false);
  tr.ell(27.5, 60, 1.8, 3, SBARK[0]); tr.ell(27.5, 60.4, 1, 2, INK); tr.set(27, 59, MAGENTA[3 + (f === 2 ? 1 : 0)]);
  rim(tr, P.ice[2], 0.36); sOutline(tr);
  p.draw(tr);
  // hängende violette Lichter an Fäden
  const L: Array<[number, number, number, number]> = [[8, 32, 12, 0.2], [13, 21, 9, 1.1], [4, 48, 8, 2], [47, 26, 14, 0.7], [43, 14, 8, 1.6], [52, 41, 9, 2.4], [45, 59, 2, 0.4], [17, 15, 10, 2.8], [38, 8, 7, 1.9]];
  const lg = new Px(p.w, p.h), pos: Array<[number, number, boolean]> = [];
  L.forEach(([x, y, len, ph], k) => {
    const o = sw(f, 1.3, ph), on = (k + f) % 4 < 2;
    for (let j = 0; j < len; j++) lg.set(x + Math.round(o * Math.pow(j / len, 1.6)), y + j, j % 2 ? V[1] : V[2]);
    const X = x + o, Y = y + len;
    lg.set(X, Y, V[2]); lg.rect(X - 1, Y + 1, 3, 3, V[3]); lg.set(X - 1, Y + 1, V[4]); lg.set(X, Y + 1, V[4]); lg.set(X, Y + 2, on ? WHITE : mix(V[4], WHITE, 0.4)); lg.set(X + 1, Y + 3, V[2]); lg.set(X, Y + 4, V[2]);
    pos.push([X, Y + 2, on]);
  });
  sOutline(lg); p.draw(lg);
  for (const [x, y, on] of pos) glow(p, x + 0.5, y + 0.5, on ? 5.5 : 4, V[3], on ? 78 : 44);
}

// ---------------------------------------------------------------- Leerenkristall
const VOIDC: Ramp = [P.shadow[0], P.shadow[1], mix(V[1], P.shadow[3], 0.4), V[2], mix(V[3], P.pink[3], 0.4), mix(P.pink[4], WHITE, 0.5)];
function voidCrystal(p: Px, f: number): void {
  const lv = [0, 1, 2, 1][f], dy = [0, 0, -1, -1][f];
  // Fels-Sockel, aus dem die Kristalle wachsen
  p.poly([[2, 32], [4, 27], [9, 25], [15, 26], [18, 29], [19, 32]], NIGHT[1]); p.line(4, 27, 9, 25, NIGHT[3]); p.line(9, 25, 15, 26, NIGHT[2]); p.px([6, 29, 12, 28, 15, 30], NIGHT[2]); p.px([8, 30, 13, 31], NIGHT[0]);
  overS(p, (l) => { prism(l, 5.5, 29, 3, 15, 2.4, VOIDC, { glass: true, seed: 2 }); prism(l, 15, 30, 17.5, 13, 2.6, VOIDC, { glass: true, seed: 3 }); }, 0.25);
  overS(p, (l) => {
    prism(l, 10, 30, 10, 5, 4.2, VOIDC, { glass: true, seed: 1 });
    // glühender Kern
    vein(l, jag([10, 27], [10, 11], 1.3, 5 + (f & 1)), MAGENTA, 0.3 + lv * 0.3, 3);
    if (lv === 2) l.set(10, 17, WHITE);
  }, 0.25);
  rim(p, P.ice[2], 0.2); sOutline(p);
  // losgelöste Splitter schweben über der Spitze
  const fr = new Px(p.w, p.h);
  for (const [x, y, o] of [[5, 6, 0], [15, 5, 1], [10, 1, 0]] as const) { const Y = y + (o ? -dy : dy) + (o ? -1 : 0) + 1; fr.px([x, Y, x, Y + 1], VOIDC[4]); fr.set(x - 1, Y + 1, VOIDC[3]); fr.set(x + 1, Y + 1, VOIDC[2]); fr.set(x, Y + 2, VOIDC[2]); }
  sOutline(fr); p.draw(fr);
  glow(p, 10, 17, 9 + lv, P.pink[2], 30 + lv * 16);
  if (f === 2) twinkle(p, 7, 9, P.pink[4]);
}

// ---------------------------------------------------------------- Schattendorne
function veinUp(l: Px, a: Pt, b: Pt, seed: number, heat = 0.45): void { vein(l, jag(a, b, 1.4, seed), MAGENTA, heat, seed + 1); }
function chip(l: Px, x: number, y: number, s: number): void {
  l.poly([[x, y - s], [x + s * 0.7, y], [x, y + s], [x - s * 0.7, y]], NIGHT[2]); l.poly([[x, y - s], [x, y + s], [x - s * 0.7, y]], NIGHT[4]); l.set(x, y - s, NIGHT[5]);
}
function shadowSpire(p: Px): void {
  overS(p, (l) => { prism(l, 5, 47, 2.5, 27, 2.7, NIGHT, { glass: true, seed: 3 }); prism(l, 15.5, 47, 18, 23, 3, NIGHT, { glass: true, seed: 4, skew: 0.5 }); }, 0.3);
  overS(p, (l) => { prism(l, 10, 47, 8.5, 9, 4.6, NIGHT, { glass: true, seed: 1, skew: -0.6 }); veinUp(l, [10, 46], [9, 20], 3); veinUp(l, [9, 30], [12, 24], 6, 0.3); }, 0.3);
  overS(p, (l) => { prism(l, 12.5, 47, 13.5, 37, 2.2, NIGHT, { glass: true, seed: 6 }); }, 0.3);
  // abgesprengte Spitze schwebt über dem Dorn
  overS(p, (l) => { prism(l, 8, 8, 7, 1, 1.8, NIGHT, { glass: true, seed: 8, clipY: 7 }); chip(l, 14, 12, 1.6); chip(l, 3.5, 18, 1.2); }, 0.5);
  p.px([8, 7, 9, 8], MAGENTA[3]); p.set(8, 8, MAGENTA[5]);
}
function shadowSpireL(p: Px): void {
  overS(p, (l) => { prism(l, 8, 71, 4, 31, 4.6, NIGHT, { glass: true, seed: 5, skew: -0.4 }); prism(l, 27.5, 71, 32, 27, 5, NIGHT, { glass: true, seed: 6, skew: 0.6 }); veinUp(l, [28, 70], [31, 38], 9, 0.35); }, 0.3);
  overS(p, (l) => {
    prism(l, 18, 71, 15.5, 15, 7.6, NIGHT, { glass: true, seed: 2, skew: -0.5 });
    veinUp(l, [18, 70], [17, 44], 3, 0.55); veinUp(l, [17, 44], [13, 28], 4, 0.5); veinUp(l, [17, 50], [22, 40], 5, 0.3); veinUp(l, [15, 36], [19, 26], 7, 0.3);
  }, 0.3);
  overS(p, (l) => { prism(l, 12, 71, 10, 52, 3.2, NIGHT, { glass: true, seed: 8 }); prism(l, 23.5, 71, 25.5, 49, 3, NIGHT, { glass: true, seed: 9 }); }, 0.3);
  // schwebende Spitze und Trümmer, dazwischen Magentaglimmen
  overS(p, (l) => { prism(l, 14.5, 12, 13, 1, 3, NIGHT, { glass: true, seed: 11, clipY: 12 }); l.poly([[12, 12], [17, 12], [15, 14], [13, 13]], NIGHT[1]); chip(l, 24, 14, 2.2); chip(l, 5, 22, 1.8); chip(l, 29, 20, 1.3); chip(l, 21, 6, 1.2); }, 0.5);
  p.px([14, 15, 15, 14, 16, 15], MAGENTA[3]); p.set(15, 15, MAGENTA[5]); p.set(10, 26, WHITE);
}

// ---------------------------------------------------------------- Augenstiel
function eyeStalk(p: Px, f: number): void {
  // Wurzelfäden
  p.line(6, 26, 2, 27, FLESH[1]); p.line(8, 26, 12, 27, FLESH[1]); p.line(7, 26, 7, 27, FLESH[2]); p.px([3, 26, 11, 26], FLESH[2]);
  overS(p, (l) => { tube(l, [...bez([7, 27], [3, 21], [8, 15]), [7.5, 11]], 2.5, 1.7, FLESH, 1); for (const [x, y] of [[5, 22], [6, 18], [8, 14]] as const) l.set(x, y, MAGENTA[3]); l.px([8, 24, 5, 19], FLESH[0]); }, 0.2);
  overS(p, (l) => {
    const cx = 7, cy = 6.5;
    l.ell(cx, cy, 5.2, 5.2, FLESH[1]); l.ell(cx - 0.4, cy - 0.4, 4.4, 4.4, FLESH[2]);
    const open = [1, 1, 0.45, 0][f], look = f === 1 ? 1 : 0;
    if (open > 0) {
      const ry = 3.6 * open + 0.4;
      l.ell(cx, cy, 4, ry, COLD[2]); l.ell(cx - 0.6, cy - 0.5, 3, Math.max(0.8, ry - 1), COLD[3]); if (open === 1) l.px([cx - 2, cy - 3], WHITE);
      l.ell(cx + 0.5 + look, cy + 0.2, 2.1, Math.min(2.1, ry), P.pink[2]); l.ell(cx + 0.5 + look, cy + 0.2, 1.3, Math.min(1.5, ry), P.pink[3]);
      l.rect(cx + look, cy - Math.min(1.6, ry - 0.4) + 0.4, 1, Math.max(1, Math.round(Math.min(3, ry * 2 - 1))), INK); if (open === 1) l.set(cx - 1 + look, cy - 1, WHITE);
      if (open === 1) l.px([3, 8, 10, 4], P.pink[4]);
      l.rect(2, cy + ry, 10, 1, FLESH[0]);
    } else { l.rect(3, 7, 8, 1, FLESH[0]); l.px([2, 6, 11, 6], FLESH[0]); l.rect(4, 8, 6, 1, FLESH[3]); }
    l.px([4, 2, 5, 2, 6, 1], FLESH[4]);
  }, 0.3);
}

// ---------------------------------------------------------------- Schwebsplitter
function floatingShard(p: Px, f: number): void {
  const dy = [0, -1, -2, -1][f], lv = [0, 1, 2, 1][f];
  // Geröll am Boden bleibt liegen
  overS(p, (l) => { chip(l, 4, 26, 1.4); chip(l, 12, 26.4, 1.2); l.px([8, 27, 9, 27], NIGHT[2]); }, 0.3);
  const s = new Px(p.w, p.h);
  prism(s, 8, 16 + dy, 8.5, 1 + dy, 4.2, NIGHT, { glass: true, seed: 3, skew: 0.4 });
  // Unterseite: nach unten zulaufend, glüht magenta
  for (let j = 0; j < 8; j++) { const hw = 4.2 * (1 - j / 8) ** 0.8; for (let x = Math.round(8 - hw); x < Math.round(8 + hw); x++) { const u = (x + 0.5 - 8) / Math.max(1, hw); s.set(x, 16 + dy + j, j < 1 ? NIGHT[1] : u < -0.3 ? MAGENTA[Math.min(5, 3 + lv - (j > 5 ? 0 : 1))] : u < 0.4 ? MAGENTA[2 + (lv > 1 ? 1 : 0)] : MAGENTA[1]); } }
  s.set(8, 23 + dy, MAGENTA[5]);
  vein(s, jag([8, 15 + dy], [8, 5 + dy], 1.2, 4), MAGENTA, 0.2 + lv * 0.2, 5, false);
  rim(s, P.ice[2], 0.4); sOutline(s);
  p.draw(s);
  // Krümel kreisen, Licht fällt nach unten
  const a = (f / 4) * Math.PI * 2;
  p.set(8 + Math.cos(a) * 6.5, 12 + dy + Math.sin(a) * 2.2, NIGHT[4]); p.set(8 - Math.cos(a) * 6.5, 14 + dy - Math.sin(a) * 2.2, NIGHT[3]);
  glow(p, 8, 21 + dy, 6.5, P.pink[2], 50 + lv * 14);
  for (let x = 4; x < 12; x++) p.blend(x, 27, alpha(P.pink[3], 30 + lv * 16 - Math.abs(x - 7.5) * 6));
}

// ---------------------------------------------------------------- Tentakel
const TEND: Ramp = [P.shadow[0], mix(P.shadow[3], V[1], 0.4), mix(V[2], P.shadow[4], 0.4), mix(V[3], P.pink[2], 0.25), V[4]];
function tendril(p: Px, f: number): void {
  // Riss im Boden, aus dem er wächst
  p.ell(8, 28.4, 6, 1.6, P.shadow[0]); p.px([3, 28, 13, 28, 5, 29, 11, 29], MAGENTA[2]); p.px([2, 28, 14, 28], MAGENTA[1]);
  const path: Pt[] = [];
  for (let i = 0; i <= 26; i++) { const t = i / 26; path.push([8 + Math.sin(t * 4.4 + (f * Math.PI) / 2) * 3.4 * Math.pow(t, 0.8) + (t > 0.85 ? (t - 0.85) * 14 : 0), 28 - t * 25 + (t > 0.9 ? (t - 0.9) * 22 : 0)]); }
  overS(p, (l) => {
    const pts = tube(l, path, 2.9, 0.7, TEND, 1);
    // Saugnäpfe mit Magentaschimmer auf der Schattenseite
    for (let i = 4; i < pts.length - 6; i += 5) { const r = 2.9 - (2.2 * i) / pts.length; l.set(pts[i][0] + r * 0.6, pts[i][1] + 0.5, MAGENTA[i % 10 === 4 ? 4 : 3]); }
    for (let i = 9; i < pts.length - 4; i += 9) l.set(pts[i][0] - 1, pts[i][1], TEND[0]);
  }, 0.45);
}

// ---------------------------------------------------------------- Leerenriss
function voidRift(p: Px, f: number): void {
  const cxAt = (y: number): number => 14 + Math.sin(y * 0.33) * 1.6 + Math.sin(y * 0.9 + 1) * 0.6;
  const hwAt = (y: number): number => { const t = (y - 2) / 36; return t <= 0 || t >= 1 ? 0 : 8.2 * Math.pow(Math.sin(Math.PI * t), 0.75) + (rnd2(y, f & 1, 5) - 0.5) * 1.3 + Math.sin(y * 1.7 + f * 1.57) * 0.5; };
  glow(p, 14, 20, 13.5, V[2], 44 + (f & 1) * 10); glow(p, 14, 12, 9, P.pink[2], 30); glow(p, 14, 28, 9, P.pink[2], 30);
  for (let y = 2; y < 39; y++) {
    const cx = cxAt(y), hw = hwAt(y); if (hw <= 0.3) { if (y > 2 && y < 38) p.set(cx, y, P.pink[4]); continue; }
    const x0 = Math.round(cx - hw), x1 = Math.round(cx + hw);
    for (let x = x0 - 2; x <= x1 + 2; x++) {
      const e = Math.min(x - x0, x1 - x);
      if (e < -1) p.blend(x, y, alpha(P.pink[2], 110));
      else if (e === -1) p.set(x, y, (x + y + f) % 5 === 0 ? V[3] : P.pink[2]);
      else if (e === 0) p.set(x, y, (x * 3 + y + f) % 7 === 0 ? WHITE : P.pink[4]);
      else if (e === 1) p.set(x, y, mix(P.pink[1], V[1], 0.5));
      else {
        // das Dahinter: Sternenleere mit Nebelschlieren
        const n = vnoise(x * 0.3 + 3, y * 0.18, 9);
        let c = n > 0.68 ? mix(V[1], P.blue[0], 0.5) : n > 0.5 ? mix(P.shadow[1], P.blue[0], 0.5) : P.shadow[0];
        const h = hash2(x, y, 77);
        if ((h & 63) === 0) c = ((h >> 6) + f) % 4 === 0 ? WHITE : P.ice[2]; else if ((h & 63) === 1) c = ((h >> 6) + f) % 4 < 2 ? V[3] : V[1];
        p.set(x, y, c);
      }
    }
  }
  // ferner Lichtpunkt, Kantenblitze, angesaugte Trümmer
  twinkle(p, 14 + [0, 1, 0, -1][f], 19, P.ice[3], f % 2 === 0);
  for (const [a, b, k] of [[[14, 2], [10, 0], 1], [[14, 38], [18, 39], 2], [[6, 18], [1, 15], 3], [[22, 24], [27, 27], 4]] as const) if ((k + f) % 2 === 0) for (const [x, y] of jag(a, b, 0.9, k + f, 2)) p.blend(x, y, alpha(P.pink[3], 190));
  const o = [0, 1, 2, 1][f];
  p.px([3 + o, 30, 4 + o, 30], NIGHT[3]); p.set(3 + o, 31, NIGHT[1]); p.px([24 - o, 9, 25 - o, 10], NIGHT[3]); p.set(25 - o, 9, NIGHT[4]); p.set(2 + (o >> 1), 8, NIGHT[4]);
}

// ---------------------------------------------------------------- Geisterblume
function ghostFlower(p: Px, f: number): void {
  const o = [0, 1, 0, -1][f], lv = [1, 0, 1, 2][f];
  // Blätter am Boden (fest), Stiel pendelt oben
  p.px([4, 14, 3, 13, 5, 15, 6, 15], mix(V[1], P.shadow[3], 0.5)); p.px([7, 14, 8, 13, 9, 13], mix(V[2], P.shadow[3], 0.5)); p.set(2, 13, V[2]);
  for (let y = 15; y > 6; y--) { const t = (15 - y) / 9; p.set(6 + Math.round(o * t * t + Math.sin(t * 3) * 0.8), y, y % 3 ? mix(V[2], COLD[0], 0.4) : mix(V[1], COLD[0], 0.3)); }
  const X = 6 + o;
  const fl = new Px(p.w, p.h);
  // nickende Glockenblüte: fahle Blütenblätter, leuchtendes Herz
  fl.ell(X + 0.5, 4.2, 3, 2.8, COLD[1]); fl.ell(X, 3.6, 2.2, 1.9, COLD[2]); fl.px([X - 1, 2, X, 2], COLD[3]); fl.px([X - 2, 6, X, 7, X + 2, 6, X + 3, 5], COLD[2]); fl.px([X - 1, 6, X + 1, 6], COLD[0]);
  fl.set(X, 5, lv === 2 ? WHITE : COLD[3]); fl.set(X + 1, 4, mix(P.pink[4], WHITE, 0.4)); fl.set(X, 1, COLD[1]);
  inkLight(fl); p.draw(fl);
  glow(p, X + 0.5, 4.5, 4.6 + lv * 0.5, mix(V[4], COLD[2], 0.5), 44 + lv * 16);
  // Lichtstaub
  p.set(X + [3, 4, 3, 2][f], [9, 8, 7, 8][f], alpha(COLD[3], 170)); p.set(X - 3, [8, 9, 10, 9][f], alpha(COLD[2], 120));
}
/** zarte, violette Kontur für Leuchtendes (statt der fast schwarzen Schattenkontur) */
function inkLight(l: Px): void { const src = l.d.slice(); sOutline(l); for (let i = 0; i < l.d.length; i++) if (!(src[i] >>> 24) && l.d[i] >>> 24) l.d[i] = mix(V[2], P.shadow[3], 0.4); }

export function scNature(out: Frames): void {
  sAnim(out, 'twisted_tree', 4, 56, 80, twistedTree, false);
  sAnim(out, 'void_crystal', 4, 20, 32, voidCrystal, false);
  sOne(out, 'shadow_spire', 20, 48, shadowSpire, true, 0); sOne(out, 'shadow_spire_l', 36, 72, shadowSpireL, true, 0);
  sAnim(out, 'eye_stalk', 4, 14, 28, eyeStalk, true, 0);
  sAnim(out, 'floating_shard', 4, 16, 28, floatingShard, false);
  sAnim(out, 'tendril', 4, 16, 30, tendril, true, 0);
  sAnim(out, 'void_rift', 4, 28, 40, voidRift, false);
  sAnim(out, 'ghost_flower', 4, 12, 16, ghostFlower, false);
}
