/**
 * 24x24-Icons für Handwerk & Elemente (Version 0.3): Monster-Rohstoffe, Zutaten, Essenzen, Bosskerne, Tränke,
 * Elixiere, Speisen, Legendäre Waffen, Rezeptrolle und zwei Buff-Kacheln.
 * `CRAFT_ICONS` wird wie die übrigen Item-Icons gezeichnet und danach konturiert; `CRAFT_GLOW` legt anschließend
 * Lichtpunkte und Schein darüber (bleiben ohne Kontur). Alle Keys ohne `item_`-Präfix.
 */
import { Px, bez, crystal, tube } from './draw';
import { P, Ramp, INK, WHITE, alpha, mix } from './palette';

type Fn = (p: Px) => void;
type El = 'fire' | 'water' | 'earth' | 'wind' | 'light' | 'dark';

/** Elementrampen passend zu ELEMENT_COLOR (shared/src/config.ts) */
const EARTH: Ramp = [P.wood[0], mix(P.sand[1], P.wood[2], 0.35), mix(P.sand[2], P.gold[2], 0.3), mix(P.sand[3], P.gold[3], 0.25), mix(P.sand[4], P.gold[4], 0.3)];
const WIND: Ramp = [P.teal[0], P.teal[1], P.teal[2], P.teal[3], P.teal[4]];
const EL: Record<El, Ramp> = { fire: P.fire, water: P.blue, earth: EARTH, wind: WIND, light: P.gold, dark: P.violet };
const ASH: Ramp = P.ash;

/** Funkelstern: weißer Kern mit farbigen Armen */
const spark = (p: Px, x: number, y: number, c: number, big = false): void => {
  p.set(x, y, WHITE); p.px([x - 1, y, x + 1, y, x, y - 1, x, y + 1], c);
  if (big) p.px([x - 2, y, x + 2, y, x, y - 2, x, y + 2], alpha(c, 150));
};
/** Weicher Schein, nur auf freien Pixeln */
const halo = (p: Px, cx: number, cy: number, r: number, c: number, a = 70): void => {
  for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
    if (d < 1 && p.get(x, y) >>> 24 === 0) p.set(x, y, alpha(c, Math.round(a * (d < 0.55 ? 1 : d < 0.8 ? 0.6 : 0.3))));
  }
};
/** Schräge Ellipsenbahn (für Ringe): ruft fn je Punkt, front = vordere Hälfte */
const orbit = (cx: number, cy: number, rx: number, ry: number, th: number, fn: (x: number, y: number, front: boolean, t: number) => void): void => {
  for (let t = 0; t < Math.PI * 2; t += 0.04) fn(Math.round(cx + Math.cos(t) * rx * Math.cos(th) - Math.sin(t) * ry * Math.sin(th)), Math.round(cy + Math.cos(t) * rx * Math.sin(th) + Math.sin(t) * ry * Math.cos(th)), Math.sin(t) > 0, t);
};

// ================================================================ Essenzen: je Element eigene Farbe UND Silhouette
const ESSENCES: Record<string, Fn> = {
  // Flamme mit drei Zungen
  mat_ess_fire: (p) => {
    const F = P.fire;
    p.poly([[12, 2], [15, 8], [17, 5], [20, 12], [19, 18], [16, 21], [12, 22], [8, 21], [5, 18], [4, 12], [7, 7], [9, 11], [10, 6]], F[1]);
    p.poly([[12, 6], [14, 11], [16, 9], [18, 13], [17, 18], [15, 20], [12, 21], [9, 20], [7, 18], [6, 13], [8, 11], [10, 13], [11, 9]], F[2]);
    p.poly([[12, 11], [14, 14], [15, 17], [14, 20], [10, 20], [9, 17], [10, 14]], F[3]);
    p.ell(12, 18, 1.6, 2, F[4]);
    p.px([5, 13, 5, 14, 6, 16, 8, 8, 10, 7], F[2]); p.px([19, 14, 19, 16, 18, 18, 17, 20], F[0]);
    p.px([3, 5, 21, 4], F[2]); p.set(20, 7, F[3]);
  },
  // glatter Tropfen mit Nebentröpfchen
  mat_ess_water: (p) => {
    const B = P.blue;
    p.poly([[12, 1], [18, 11], [6, 11]], B[3]); p.ball(12, 14, 7.4, 7.4, B, 1, 4);
    p.poly([[12, 2], [12, 9], [8, 9]], B[4]); p.px([12, 1, 12, 2, 11, 3, 11, 4], B[4]);
    p.rect(8, 11, 2, 1, WHITE); p.rect(7, 12, 1, 3, WHITE); p.set(8, 12, WHITE);
    p.px([15, 18, 16, 17, 14, 19], B[4]); p.px([16, 19, 17, 17], B[3]);
    p.rect(19, 4, 2, 2, B[3]); p.set(19, 4, B[4]); p.set(4, 6, B[3]); p.set(20, 3, B[3]);
  },
  // kantiger Brocken mit Moos und Keimling
  mat_ess_earth: (p) => {
    const E = EARTH, G = P.green;
    p.poly([[4, 21], [3, 13], [7, 8], [13, 6], [19, 9], [21, 15], [19, 21], [9, 22]], E[2]);
    p.poly([[3, 13], [7, 8], [13, 6], [11, 13], [6, 16]], E[3]); p.poly([[7, 8], [13, 6], [11, 10]], E[4]);
    p.poly([[13, 6], [19, 9], [21, 15], [19, 21], [15, 15]], E[1]); p.poly([[19, 9], [21, 15], [19, 21], [18, 15]], mix(E[1], E[0], 0.5));
    p.line(11, 13, 15, 15, E[1]); p.line(6, 16, 9, 22, E[1]); p.line(15, 15, 14, 21, mix(E[1], E[0], 0.4));
    p.px([8, 10, 9, 9], WHITE); p.px([8, 18, 12, 18, 11, 20], E[3]);
    p.rect(8, 7, 5, 1, G[3]); p.px([7, 8, 6, 9, 13, 6, 14, 6, 15, 7, 10, 8, 12, 8], G[2]); p.px([9, 7, 11, 7], G[4]);
    p.rect(14, 3, 1, 3, G[2]); p.px([15, 2, 16, 2, 16, 1], G[4]); p.px([13, 3, 12, 2], G[3]);
  },
  // Wirbel
  mat_ess_wind: (p) => {
    const T = WIND;
    for (let a = 0; a < 8.4; a += 0.06) {
      const r = 1 + a * 1.02, x = 12.5 + Math.cos(a + 0.9) * r, y = 12.5 + Math.sin(a + 0.9) * r * 0.94;
      const lit = Math.cos(a + 0.9) * 0.5 + Math.sin(a + 0.9) * 0.7;
      p.rect(Math.round(x - 1), Math.round(y - 1), 2, 2, lit < -0.35 ? T[4] : lit > 0.45 ? T[2] : T[3]);
    }
    p.rect(11, 12, 3, 2, T[4]); p.set(12, 12, WHITE);
    p.rect(1, 20, 5, 1, T[3]); p.rect(3, 22, 4, 1, T[2]); p.px([20, 2, 21, 2], T[3]); p.set(4, 3, T[4]);
  },
  // vierstrahliger Stern
  mat_ess_light: (p) => {
    const Y = P.gold;
    p.poly([[12, 1], [14.5, 9.5], [23, 12], [14.5, 14.5], [12, 23], [9.5, 14.5], [1, 12], [9.5, 9.5]], Y[3]);
    p.poly([[12, 1], [12, 12], [1, 12], [9.5, 9.5]], Y[4]); p.poly([[12, 12], [23, 12], [14.5, 14.5], [12, 23]], Y[2]);
    p.poly([[12, 12], [14.5, 14.5], [12, 23]], mix(Y[2], Y[1], 0.5));
    p.ell(12, 12, 3, 3, Y[4]); p.ell(12, 12, 2, 2, WHITE); p.line(12, 3, 12, 8, WHITE); p.line(4, 12, 8, 12, WHITE);
    for (const [x, y, c] of [[6, 6, Y[4]], [17, 6, Y[3]], [6, 17, Y[3]], [17, 17, Y[2]]] as const) { p.rect(x, y, 2, 2, c); }
    p.px([5, 5, 19, 5, 5, 19, 19, 19], Y[3]);
  },
  // Mondsichel mit Schattenfunken
  mat_ess_dark: (p) => {
    const V = P.violet;
    p.ell(11.5, 12, 9.4, 10, V[2]); p.ell(9.5, 11, 6.6, 8, V[3]); p.px([4, 8, 5, 6, 6, 5, 4, 10, 3, 12], V[4]); p.px([5, 8, 6, 6], WHITE);
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) { const dx = (x + 0.5 - 16) / 7.6, dy = (y + 0.5 - 9.4) / 7.9; if (dx * dx + dy * dy <= 1) p.set(x, y, 0); }
    p.px([13, 20, 15, 20, 17, 19, 18, 18, 11, 21, 12, 21], V[1]);
    p.set(16, 9, P.pink[4]); p.px([15, 9, 17, 9, 16, 8, 16, 10], P.pink[2]); p.set(20, 13, P.pink[3]); p.set(13, 5, V[3]);
  },
};

// ================================================================ Bosskerne: erinnern an ihren Boss
const CORES: Record<string, Fn> = {
  // Dornenmutter: verholztes Herz, Dornenranke, rosa Knospe
  mat_core_dornenmutter: (p) => {
    const W = P.wood, G = P.green;
    p.ball(8, 11, 5, 5, W, 1, 4); p.ball(16, 11, 5, 5, W, 1, 3); p.poly([[3, 12], [21, 12], [12, 23]], W[2]);
    p.poly([[3, 12], [9, 12], [10, 21]], W[3]); p.poly([[15, 13], [21, 12], [13, 22]], W[1]);
    p.line(8, 9, 10, 19, W[1]); p.line(13, 12, 12, 20, W[1]); p.px([6, 9, 5, 11, 6, 13], W[4]); p.line(16, 9, 15, 15, W[0]);
    // Ranke quer, Dornen
    p.line(2, 16, 8, 14, G[2], 2); p.line(8, 14, 15, 15, G[2], 2); p.line(15, 15, 21, 12, G[1], 2); p.px([3, 16, 5, 15, 9, 14, 12, 14], G[3]);
    p.px([5, 13, 11, 13, 17, 13, 7, 17, 14, 17, 20, 15], P.cream[4]);
    // Trieb
    p.rect(12, 5, 1, 4, G[2]); p.px([13, 6, 14, 5, 15, 5], G[4]); p.set(11, 7, G[3]);
    p.ell(12, 3, 2.6, 2.6, P.pink[2]); p.px([11, 2, 11, 3, 12, 1], P.pink[3]); p.set(11, 1, P.pink[4]); p.px([13, 4, 14, 3], P.pink[1]);
  },
  // Kristallkoloss: goldenes Brustprisma in Fels mit Kristallen
  mat_core_kristallkoloss: (p) => {
    const Y = P.gold, S = P.stone;
    crystal(p, 5, 19, 2, 8, 2.4, P.teal); crystal(p, 19, 19, 22, 9, 2.4, P.ice);
    p.poly([[12, 2], [19, 12], [12, 22], [5, 12]], Y[3]);
    p.poly([[12, 2], [12, 12], [5, 12]], Y[4]); p.poly([[12, 12], [19, 12], [12, 22]], Y[1]); p.poly([[5, 12], [12, 12], [12, 22]], Y[2]);
    p.line(11, 4, 7, 11, WHITE); p.rect(5, 12, 14, 1, Y[2]); p.rect(12, 3, 1, 19, mix(Y[3], Y[2], 0.5));
    // Lichtbrechung
    p.px([9, 9, 10, 8], P.pink[4]); p.px([14, 9, 15, 10], P.teal[4]); p.px([9, 15, 10, 16], P.blue[3]); p.px([14, 15, 15, 14], P.pink[3]); p.set(13, 6, WHITE);
    p.poly([[3, 22], [4, 18], [8, 16], [12, 19], [16, 16], [20, 18], [21, 22]], S[2]); p.poly([[4, 18], [8, 16], [11, 18], [6, 20]], S[3]);
    p.poly([[14, 18], [16, 16], [20, 18], [21, 22], [16, 22]], S[1]); p.px([5, 18, 6, 17], S[4]); p.line(12, 19, 12, 22, S[1]);
  },
  // Ignarok: glühende Kugel zwischen zwei Schlackehörnern
  mat_core_ignarok: (p) => {
    const F = P.fire, A = ASH;
    p.poly([[5, 14], [2, 9], [3, 2], [6, 8], [8, 13]], A[3]); p.poly([[19, 14], [22, 9], [21, 2], [18, 8], [16, 13]], A[2]);
    p.px([3, 3, 3, 5, 4, 7, 5, 9], A[4]); p.px([21, 4, 21, 6, 20, 8], A[3]); p.px([4, 11, 5, 12, 20, 11, 19, 12], F[1]);
    p.ball(12, 13, 6.4, 6.4, F, 0, 4); p.ell(11, 12, 2.6, 2.6, F[4]); p.px([10, 11, 11, 11, 10, 12], WHITE);
    p.poly([[3, 15], [6, 20], [12, 23], [18, 20], [21, 15], [18, 17], [12, 19], [6, 17]], A[2]);
    p.poly([[3, 15], [6, 17], [9, 18], [7, 21]], A[3]); p.poly([[15, 18.5], [18, 17], [21, 15], [18, 20], [13, 22.5]], A[1]);
    p.px([8, 19, 9, 20, 10, 20, 12, 21], F[2]); p.px([15, 20, 16, 19, 17, 19], F[1]); p.set(12, 20, F[3]);
    p.px([12, 4, 9, 3], F[2]); p.set(15, 5, F[3]);
  },
  // Ysolde: vollkommen regelmäßiger Eisknoten
  mat_core_ysolde: (p) => {
    const I = P.ice, B = P.blue;
    const hex = (r: number): [number, number][] => [0, 1, 2, 3, 4, 5].map((k) => [12 + Math.cos(-Math.PI / 2 + (k * Math.PI) / 3) * r, 12 + Math.sin(-Math.PI / 2 + (k * Math.PI) / 3) * r * 1.02]);
    const o = hex(10.4), m = hex(6.4);
    p.poly(o, B[2]);
    const tone = [I[3], I[2], B[2], B[1], B[2], I[4]];
    for (let k = 0; k < 6; k++) p.poly([o[k], o[(k + 1) % 6], m[(k + 1) % 6], m[k]], tone[k]);
    p.poly(m, B[1]); p.poly(hex(4.4), B[2]);
    for (let k = 0; k < 6; k++) { p.line(12, 12, m[k][0] - (m[k][0] > 12 ? 1 : 0), m[k][1] - (m[k][1] > 12 ? 1 : 0), k === 0 || k === 5 || k === 4 ? I[4] : I[2]); }
    p.rect(11, 11, 2, 2, WHITE); p.px([11, 10, 10, 11, 13, 12, 12, 13], I[4]);
    p.line(5, 7, 11, 3, WHITE); p.px([4, 9, 4, 10], WHITE);
    p.px([12, 0, 21, 6, 21, 17, 12, 23, 2, 17, 2, 6], I[3]);
  },
  // Archivar: lidschweres Auge, goldene Bahnringe, ein Blatt
  mat_core_archivar: (p) => {
    const S = P.steel, Y = P.gold, T = P.teal;
    orbit(12, 12.5, 10.5, 3.6, -0.5, (x, y, f) => { if (!f) p.rect(x, y, 1, 1, Y[1]); });
    orbit(12, 12.5, 10, 3.2, 0.62, (x, y, f) => { if (!f) p.rect(x, y, 1, 1, Y[1]); });
    p.ball(12, 12.5, 6.6, 6.6, S, 1, 4);
    p.ell(12, 13, 3.4, 3.2, INK); p.ell(12, 13.4, 2.8, 2.4, T[3]); p.ell(12, 13.6, 1.4, 1.4, P.teal[0]); p.set(11, 12, WHITE);
    p.rect(8, 10, 8, 2, S[3]); p.rect(9, 9, 6, 1, S[4]); p.rect(8, 12, 8, 1, S[1]); p.px([8, 13, 15, 13], S[1]);
    orbit(12, 12.5, 10.5, 3.6, -0.5, (x, y, f, t) => { if (f) { p.rect(x, y, 1, 2, t > 0.5 && t < 1.7 ? Y[4] : Y[3]); p.set(x, y + 1, Y[2]); } });
    orbit(12, 12.5, 10, 3.2, 0.62, (x, y, f, t) => { if (f && (t < 1.1 || t > 2.2)) { p.set(x, y, Y[3]); } });
    p.rect(2, 16, 2, 2, T[3]); p.set(2, 16, T[4]);
    p.rect(17, 1, 4, 5, P.cream[4]); p.rect(20, 2, 1, 4, P.cream[2]); p.px([18, 2, 19, 2, 18, 4], P.wood[1]);
  },
  // Hohlkönig: leere Schale, türkiser Rest, Kronenzacken
  mat_core_hohlkoenig: (p) => {
    const V: Ramp = [P.shadow[1], P.violet[0], P.violet[1], P.violet[2], P.violet[3]], Y = P.gold;
    p.ball(12, 14, 8.6, 8.4, V, 0, 4);
    p.ell(12.6, 14.6, 5, 5, P.shadow[0]); p.ell(12, 14, 4.4, 4.4, INK);
    for (let a = 0.1; a < 1.9; a += 0.08) p.set(12.6 + Math.cos(a) * 4.9, 14.6 + Math.sin(a) * 4.9, P.violet[3]);
    p.line(16, 11, 19, 8, P.shadow[0]); p.px([19, 9, 17, 9], P.shadow[1]);
    p.px([12, 15, 12, 16, 13, 16], P.teal[3]); p.set(12, 14, P.teal[4]); p.set(11, 16, P.teal[2]); p.set(12, 12, P.teal[1]);
    p.rect(8, 5, 9, 2, Y[2]); p.rect(8, 5, 4, 1, Y[3]);
    for (const x of [8, 12, 16]) { p.rect(x, 2, 1, 3, Y[3]); p.set(x, x === 12 ? 1 : 2, Y[4]); }
    p.px([10, 4, 14, 4], Y[2]); p.set(12, 5, P.pink[3]); p.set(6, 9, P.violet[4]);
  },
};

// ================================================================ Monster-Rohstoffe (je Biom einer)
const MONSTER: Record<string, Fn> = {
  // Dornchitin: gewölbte Panzerplatte mit Segmentrillen und Dornen
  mat_chitin: (p) => {
    const G: Ramp = [P.forest[0], P.forest[2], P.green[2], P.green[3], P.green[4]], C = P.cream;
    p.poly([[7, 2], [5, 7], [9, 7]], C[3]); p.poly([[14, 0], [12, 5], [16, 5]], C[3]); p.poly([[21, 3], [17, 7], [20, 9]], C[2]);
    p.px([7, 3, 7, 4, 14, 1, 14, 2], C[4]); p.px([8, 6, 15, 4, 20, 6], C[1]);
    p.poly([[6, 6], [14, 4], [20, 8], [21, 15], [17, 20], [10, 22], [4, 17], [3, 10]], G[2]);
    p.poly([[6, 6], [14, 4], [14, 9], [5, 12], [3, 10]], G[3]); p.poly([[20, 8], [21, 15], [17, 20], [10, 22], [14, 16], [18, 11]], G[1]);
    p.line(4, 12, 12, 10, G[1]); p.line(12, 10, 20, 10, G[0]); p.line(5, 17, 12, 15, G[1]); p.line(12, 15, 20, 15, G[0]);
    p.line(4, 13, 12, 11, G[3]); p.line(6, 18, 12, 16, G[3]); p.px([6, 7, 7, 6, 8, 6, 5, 9], G[4]); p.px([7, 8, 8, 8], WHITE);
    p.line(5, 19, 10, 22, P.tan[1]); p.line(11, 22, 17, 20, P.wood[1]);
    p.poly([[2, 14], [0, 12], [3, 12]], C[3]); p.poly([[21, 17], [23, 19], [19, 19]], C[2]);
  },
  // Glimmerstaub: funkelndes Häufchen, Cyan mit Magentakörnern
  mat_glimmer: (p) => {
    const T = P.teal, I = P.ice;
    p.poly([[2, 22], [5, 17], [9, 13], [13, 12], [17, 15], [20, 18], [22, 22]], T[3]);
    p.poly([[5, 17], [9, 13], [13, 12], [11, 16], [7, 20], [3, 22], [2, 22]], I[3]); p.poly([[15, 16], [17, 15], [20, 18], [22, 22], [16, 22]], T[2]);
    for (let y = 12; y < 23; y++) for (let x = 2; x < 23; x++) {
      if (p.get(x, y) >>> 24 === 0) continue;
      const h = (x * 7 + y * 13 + ((x * y) % 5)) % 11;
      if (h === 0) p.set(x, y, WHITE); else if (h === 3) p.set(x, y, P.pink[3]); else if (h === 6) p.set(x, y, T[4]); else if (h === 8 && x > 12) p.set(x, y, T[1]);
    }
    p.px([10, 12, 12, 11, 13, 11], I[4]); p.px([1, 22, 23, 22, 20, 17], T[4]);
    p.px([4, 14, 19, 12], P.pink[3]); p.set(15, 10, I[3]);
  },
  // Aschenkralle: gekrümmte Kralle mit glühender Wurzel
  mat_ashclaw: (p) => {
    const K: Ramp = [P.ash[1], P.ash[3], P.ash[4], mix(P.ash[4], P.bone[2], 0.55), P.bone[3]], F = P.fire;
    tube(p, [...bez([6, 19], [4, 6], [15, 5], 14), ...bez([15, 5], [22, 5], [20, 16], 10)], 3.6, 0.5, K, 1);
    p.px([20, 15, 20, 16, 20, 17], K[2]); p.set(20, 18, K[3]);
    p.px([9, 8, 10, 7, 12, 6, 14, 5], K[4]); p.line(8, 17, 10, 12, K[0]); p.line(11, 11, 15, 9, K[0]);
    p.ell(6, 19.5, 4, 3, F[1]); p.ell(5.6, 19.2, 2.8, 2, F[2]); p.px([5, 19, 6, 19, 5, 18], F[3]); p.set(5, 19, F[4]);
    p.px([8, 16, 9, 15, 7, 15], F[2]); p.px([9, 13, 11, 14], F[1]);
    p.px([2, 14, 3, 11], F[2]); p.set(12, 21, F[1]); p.rect(14, 20, 3, 2, P.ash[3]); p.set(14, 20, P.ash[4]); p.set(16, 21, F[1]);
  },
  // Frostfang: Reißzahn mit Eisspitze und Reif an der Wurzel
  mat_fang: (p) => {
    const S = P.snow, I = P.ice, big = bez([13, 5], [13, 15], [5, 21], 20), small = bez([19, 9], [20, 15], [16, 20], 12);
    // Wurzeln (bläulich), dann die Zähne als verjüngte Bögen
    p.ell(11, 4.5, 3, 2.6, S[1]); p.ell(15.5, 4.5, 3, 2.6, S[1]); p.px([10, 3, 11, 3, 15, 3], S[2]); p.rect(13, 2, 1, 3, I[0]);
    p.ell(19, 8.5, 2.4, 2, S[1]); p.set(18, 7, S[2]);
    tube(p, small, 2.3, 0.4, [I[1], S[1], S[2], S[3]], 1);
    tube(p, big, 4.6, 0.5, S, 2);
    p.px([16, 8, 16, 10, 15, 13, 13, 16, 11, 18, 9, 20], S[1]); p.px([15, 15, 12, 18], I[1]);
    // Eisspitze und Reif
    p.px([7, 20, 6, 21, 5, 21, 8, 19], I[3]); p.px([6, 20, 7, 19], I[4]); p.set(5, 22, I[2]);
    p.px([10, 7, 10, 8, 10, 9, 10, 10], WHITE); p.px([8, 5, 14, 6, 18, 9], I[2]);
    p.px([3, 8, 21, 4, 22, 17], I[4]); p.px([3, 7, 3, 9, 2, 8, 4, 8], I[2]);
  },
  // Ahnenknochen: Knochen mit eingeritzten Runen, daneben ein Runensplitter
  mat_bone: (p) => {
    const B = P.bone, R = P.blue;
    p.line(6, 16, 16, 6, B[2], 4); p.line(6, 15, 16, 5, B[3], 3); p.line(6, 15, 15, 6, B[4]);
    p.ball(4.5, 16.5, 3, 3, B, 1, 4); p.ball(7.5, 19.5, 3, 3, B, 1, 4); p.ball(16.5, 4.5, 3, 3, B, 1, 4); p.ball(19.5, 7.5, 3, 3, B, 1, 4);
    p.px([9, 14, 10, 13, 10, 14], R[2]); p.px([12, 11, 13, 10, 12, 10, 13, 12], R[2]); p.px([15, 8, 15, 9], R[2]); p.px([10, 12, 13, 9], R[3]);
    p.poly([[15, 22], [14, 17], [18, 14], [22, 17], [21, 22]], P.sand[2]); p.poly([[14, 17], [18, 14], [18, 19], [15, 21]], P.sand[3]); p.px([15, 17, 16, 16], P.sand[4]);
    p.px([19, 17, 19, 18, 20, 18, 19, 20], P.gold[4]); p.set(18, 19, P.gold[3]);
  },
  // Schattengespinst: gedrehter Strang aus violetten Fäden, Enden lösen sich auf
  mat_weave: (p) => {
    const V: Ramp = [P.shadow[1], P.violet[1], P.violet[2], P.violet[3], P.violet[4]];
    // Spindelform schräg von unten links nach oben rechts; u = längs, v = quer; Drall als Streifen
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      const u = (x - 11.5 - (y - 11.5)) / Math.SQRT2, v = (x - 11.5 + (y - 11.5)) / Math.SQRT2;
      if (Math.abs(u) > 11) continue;
      const hw = 4.6 * Math.sqrt(1 - (u / 11) ** 2) + 0.4;
      if (Math.abs(v) > hw) continue;
      const s = Math.floor((u + v * 1.1 + 44) / 2.4) % 2, lit = v / hw;
      p.set(x, y, lit < -0.4 ? (s ? V[4] : V[3]) : lit < 0.4 ? (s ? V[3] : V[2]) : s ? V[2] : V[1]);
    }
    p.line(9, 9, 14, 14, P.pink[3]); p.line(10, 9, 15, 14, P.pink[2]); p.set(9, 9, P.pink[4]);
    // lose Fäden lösen sich auf
    p.px([20, 2, 21, 1, 22, 3, 2, 21, 1, 22, 3, 22], V[3]); p.px([22, 5, 19, 1, 4, 20, 1, 19], V[2]); p.px([18, 3, 5, 18], V[4]);
    p.px([16, 16, 18, 13, 6, 6], V[2]); p.set(17, 15, P.pink[3]);
  },
};

// ================================================================ Zutaten
const INGREDIENTS: Record<string, Fn> = {
  // Waldbeeren: rote und blaue Beeren am Blatt
  mat_berry: (p) => {
    const G = P.green, BL: Ramp = [P.blue[0], P.blue[1], mix(P.blue[2], P.violet[2], 0.45), P.blue[3], P.ice[3]];
    p.poly([[12, 8], [6, 2], [2, 6], [6, 10]], G[3]); p.poly([[12, 8], [18, 2], [22, 6], [18, 10]], G[2]);
    p.line(11, 8, 5, 4, G[4]); p.line(13, 8, 19, 5, G[3]); p.px([3, 6, 4, 8], G[2]); p.rect(11, 5, 2, 4, P.wood[2]); p.set(11, 5, P.wood[3]);
    p.ball(7.5, 14, 5, 5, P.red, 1, 4); p.ball(16.5, 14, 5, 5, BL, 1, 4); p.ball(12, 18.5, 4.6, 4.6, P.red, 1, 4);
    p.px([5, 12, 6, 11], WHITE); p.px([14, 12, 15, 11], WHITE); p.px([10, 17, 11, 16], WHITE);
    p.set(9, 17, P.red[0]); p.set(18, 17, BL[0]); p.set(13, 22, P.red[0]);
  },
  // Leuchtpilz: türkiser Hut mit Leuchtflecken, kleiner Nachbar
  mat_cavecap: (p) => {
    const T = P.teal, C = P.cream;
    for (let y = 2; y < 12; y++) for (let x = 3; x < 22; x++) {
      const nx = (x + 0.5 - 12.5) / 9, ny = (y + 0.5 - 11.5) / 9, rr = nx * nx + ny * ny;
      if (rr > 1) continue;
      const t = 0.5 - (nx * 0.45 + ny * 0.75) * 0.55 - rr * 0.1;
      p.set(x, y, T[1 + Math.max(0, Math.min(3, Math.floor(t * 4)))]);
    }
    p.rect(4, 11, 17, 1, T[1]); p.rect(6, 12, 13, 1, P.teal[0]);
    p.rect(10, 13, 5, 7, C[3]); p.rect(10, 13, 2, 7, C[4]); p.rect(14, 13, 1, 7, C[2]); p.ell(12.5, 20, 3.6, 2.2, C[3]); p.px([10, 20, 11, 21], C[4]); p.px([14, 21, 15, 20], C[2]);
    p.rect(10, 13, 5, 1, C[1]);
    p.rect(7, 6, 2, 2, WHITE); p.rect(13, 4, 2, 1, WHITE); p.rect(16, 7, 2, 2, P.ice[4]); p.px([11, 8, 5, 9, 19, 10, 10, 4], P.ice[4]);
    p.ell(4.5, 19, 2.6, 1.6, T[3]); p.px([3, 18, 4, 18], T[4]); p.rect(4, 20, 2, 2, C[3]); p.set(5, 19, WHITE);
  },
  // Feuerschote: gebogene Schote, glimmende Spitze
  mat_pepper: (p) => {
    const R = P.red, G = P.green;
    tube(p, bez([8, 7], [8, 18], [20, 19], 18), 3.8, 0.7, R, 1);
    p.px([6, 9, 6, 10, 6, 11, 7, 13], R[4]); p.px([6, 8, 7, 12], WHITE); p.px([11, 18, 13, 20, 15, 20], R[0]);
    p.px([20, 19, 21, 19], P.fire[2]); p.set(21, 20, P.fire[3]); p.px([22, 17, 21, 15], P.fire[2]); p.set(22, 14, P.fire[3]);
    p.ell(8, 5.5, 3.4, 2, G[2]); p.px([6, 5, 7, 4], G[3]); p.px([5, 7, 8, 7, 11, 7], G[1]);
    p.line(8, 4, 11, 1, G[2], 2); p.px([11, 1, 9, 3], G[4]); p.set(12, 2, G[1]);
  },
  // Gletscherflechte: blasse Rosette auf grauem Stein, Reif
  mat_lichen: (p) => {
    const L: Ramp = [P.forest[1], mix(P.forest[3], P.ice[1], 0.5), mix(P.green[3], P.ice[2], 0.55), mix(P.green[4], P.ice[3], 0.5), P.ice[4]], S = P.steel;
    p.ell(12, 19, 10, 4, S[2]); p.ell(10, 18, 7, 2.4, S[3]); p.rect(5, 21, 14, 1, S[1]); p.px([15, 20, 17, 19, 19, 20], S[1]); p.px([4, 18, 5, 17], P.snow[3]);
    for (const [x, y, rx, ry] of [[7, 13, 4.6, 3.6], [17, 13, 4.4, 3.4], [12, 9.5, 5.2, 4.2], [12, 15, 4.6, 3]] as const) { p.ell(x, y, rx, ry, L[1]); p.ell(x - 0.4, y - 0.5, rx - 0.9, ry - 0.9, L[2]); p.ell(x - 1, y - 1, rx - 2.2, ry - 2, L[3]); }
    p.px([8, 6, 10, 5, 13, 5, 16, 6, 3, 12, 4, 10, 20, 11, 21, 13, 9, 17, 15, 17], L[4]);
    p.px([11, 9, 6, 13, 17, 13], L[1]); p.px([12, 9, 7, 13, 18, 13, 12, 15], L[0]); p.px([10, 8, 5, 12, 16, 12], WHITE);
    p.px([20, 7, 2, 16], P.ice[4]); p.set(22, 9, P.ice[3]);
  },
  // Sonnenfeige: goldene Frucht, daneben eine aufgeschnittene Hälfte
  mat_fig: (p) => {
    const Y: Ramp = [P.wood[1], P.gold[1], P.gold[2], P.gold[3], P.gold[4]];
    p.poly([[9, 4], [12, 10], [6, 10]], Y[2]); p.ball(9, 14, 6, 6.4, Y, 1, 4); p.rect(8, 2, 2, 3, P.wood[2]); p.set(8, 2, P.wood[3]);
    p.px([6, 11, 5, 13], WHITE); p.px([11, 19, 12, 18, 9, 20], mix(Y[1], P.red[1], 0.5));
    p.poly([[13, 3], [18, 1], [21, 4], [17, 6]], P.green[3]); p.line(13, 4, 19, 3, P.green[4]); p.px([20, 5, 18, 6], P.green[2]);
    p.poly([[16, 9], [19, 13], [13, 13]], Y[2]); p.ell(16, 17, 5.6, 5.6, Y[2]); p.ell(16, 17, 4.6, 4.6, P.cream[4]);
    p.ell(16, 17.4, 3.6, 3.6, P.red[2]); p.ell(16, 17.6, 2.2, 2.4, P.pink[3]); p.px([16, 16, 15, 18, 17, 19, 14, 16, 18, 16, 16, 20], Y[4]); p.px([16, 12, 16, 13], P.cream[4]);
    p.px([20, 20, 19, 21], Y[1]);
  },
  // Geisterblüte: bleiche Blüte an dunklem Stiel
  mat_ghostbloom: (p) => {
    const W: Ramp = [P.violet[1], P.violet[2], P.violet[3], P.violet[4], mix(P.violet[4], WHITE, 0.65)], S = P.shadow;
    p.line(12, 12, 11, 22, S[3], 2); p.px([12, 13, 12, 15, 11, 18], P.violet[1]);
    p.poly([[11, 18], [6, 15], [4, 18], [8, 20]], P.violet[1]); p.line(10, 18, 6, 17, P.violet[2]); p.poly([[13, 20], [17, 17], [19, 19], [16, 21]], S[3]);
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k * Math.PI * 2) / 5, x = 12 + Math.cos(a) * 4.6, y = 8 + Math.sin(a) * 4.4;
      p.ell(x, y, 3.3, 3.3, W[2]); p.ell(x - 0.5, y - 0.5, 2.5, 2.5, W[3]); p.ell(x - 1, y - 1, 1.3, 1.3, W[4]);
    }
    for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + ((k + 0.5) * Math.PI * 2) / 5; p.line(12 + Math.cos(a) * 2, 8 + Math.sin(a) * 2, 12 + Math.cos(a) * 4.4, 8 + Math.sin(a) * 4.4, W[1]); }
    p.ell(12, 8, 2.2, 2.2, P.teal[3]); p.ell(12, 8, 1.2, 1.2, P.teal[4]); p.set(11, 7, WHITE);
    p.px([3, 4, 21, 12], W[3]); p.set(20, 3, W[2]);
  },
  // Ätherstaub: Samtbeutel mit Goldkordel, daraus steigt reines Mana
  mat_aether: (p) => {
    const V: Ramp = [P.shadow[1], P.blue[0], P.blue[1], mix(P.blue[2], P.violet[2], 0.5), mix(P.blue[3], P.violet[3], 0.5)], Y = P.gold;
    p.poly([[6, 10], [8, 6], [11, 8], [13, 6], [16, 8], [18, 10]], V[2]); p.px([8, 7, 9, 7, 13, 7], V[4]); p.px([16, 9, 17, 10], V[1]);
    p.ball(12, 16.5, 8, 6.4, V, 1, 4); p.rect(8, 10, 9, 2, V[3]);
    p.line(8, 13, 7, 20, V[1]); p.line(13, 12, 14, 22, V[1]); p.px([5, 14, 6, 13, 6, 15], V[4]);
    p.rect(8, 10, 9, 2, Y[2]); p.rect(8, 10, 5, 1, Y[3]); p.set(9, 10, Y[4]); p.line(17, 11, 19, 15, Y[2]); p.rect(18, 15, 2, 2, Y[3]); p.set(18, 15, Y[4]);
    p.px([11, 16, 10, 17, 12, 17, 11, 18], Y[3]); p.set(11, 17, Y[4]);
    p.px([10, 8, 12, 9, 14, 8], P.teal[4]); p.px([11, 9, 13, 9, 12, 8], WHITE);
  },
};

// ================================================================ Tränke & Elixiere
/** 7×7-Zeichen aus Textzeilen: X = Farbe c, o = Farbe c2; (x, y) = Mitte */
const glyph = (p: Px, x: number, y: number, rows: string[], c: number, c2 = INK): void => {
  rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== '.') p.set(x - 3 + i, y - 3 + j, r[i] === 'X' ? c : c2); });
};
/** wie glyph, mit dunklem Schlagschatten für helle Flüssigkeiten */
const emboss = (p: Px, x: number, y: number, rows: string[], sh: number, fg: number = WHITE): void => { glyph(p, x + 1, y + 1, rows, sh, sh); glyph(p, x, y, rows, fg); };
const MARK: Record<string, string[]> = {
  fire: ['...X...', '...XX..', '..XXX..', '.XXXXX.', '.XX.XX.', '.XXXXX.', '..XXX..'],
  water: ['...X...', '..XXX..', '..XXX..', '.XXXXX.', '.XXXXX.', '.XXXXX.', '..XXX..'],
  earth: ['.......', '..X....', '.XXX.X.', '.XXXXXX', 'XXXXXXX', 'XXXXXXX', '.......'],
  wind: ['...XX..', '.....X.', 'XXXXX..', '.......', 'XXXXXX.', '......X', '....XX.'],
  light: ['...X...', '.X...X.', '..XXX..', 'X.XXX.X', '..XXX..', '.X...X.', '...X...'],
  dark: ['..XXX..', '.XX....', 'XX.....', 'XX.....', 'XX.....', '.XX..X.', '..XXX..'],
  guard: ['XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '.XXXXX.', '..XXX..', '...X...'],
  speed: ['..XX...', '...XX..', 'X...XX.', 'XX...XX', 'X...XX.', '...XX..', '..XX...'],
  crit: ['.......', '..XXX..', '.XXoXX.', 'XXoooXX', '.XXoXX.', '..XXX..', '.......'],
  power: ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', '..XXX..', '..XXX..', '..XXX..'],
};
/** Quelltrank: facettierte Karaffe mit Goldkragen und Kristallstopfen (höchste Trankstufe) */
const quell = (r: Ramp): Fn => (p) => {
  const Y = P.gold, T = P.teal;
  p.poly([[12, 0], [15, 3], [12, 5], [9, 3]], T[3]); p.poly([[12, 0], [12, 5], [9, 3]], T[4]); p.set(11, 2, WHITE);
  p.rect(10, 5, 4, 3, P.ice[3]); p.rect(10, 5, 1, 3, P.ice[4]);
  p.poly([[8, 9], [16, 9], [21, 14], [21, 18], [17, 22], [7, 22], [3, 18], [3, 14]], P.ice[3]);
  p.poly([[6, 12], [18, 12], [21, 14], [21, 18], [17, 22], [7, 22], [3, 18], [3, 14]], r[2]);
  p.poly([[6, 12], [10, 12], [8, 22], [7, 22], [3, 18], [3, 14]], r[3]); p.poly([[17, 12], [18, 12], [21, 14], [21, 18], [17, 22], [15, 22], [18, 15]], r[1]);
  p.rect(6, 11, 12, 1, mix(r[4], WHITE, 0.45)); p.rect(8, 9, 2, 2, P.ice[4]);
  p.rect(9, 7, 6, 2, Y[3]); p.rect(9, 7, 3, 1, Y[4]); p.rect(13, 8, 2, 1, Y[1]);
  p.px([5, 14, 5, 15, 5, 16, 6, 13], WHITE); p.px([16, 19, 17, 18], r[4]); p.px([12, 15, 11, 16, 13, 16, 12, 17], mix(r[4], WHITE, 0.3)); p.set(12, 16, WHITE);
  p.rect(8, 21, 8, 1, Y[2]); p.rect(8, 21, 3, 1, Y[3]);
};
/** Elixier (Wert): Kegelkolben mit Korken, Zeichen auf der Flüssigkeit */
const flask = (r: Ramp, mark: string): Fn => (p) => {
  p.rect(10, 1, 4, 2, P.tan[2]); p.rect(10, 1, 2, 1, P.tan[4]);
  p.rect(10, 3, 4, 6, P.ice[3]); p.rect(10, 3, 1, 6, P.ice[4]); p.rect(9, 3, 6, 1, P.ice[4]);
  p.poly([[10, 9], [14, 9], [21, 19], [20, 22], [4, 22], [3, 19]], P.ice[3]);
  p.poly([[8, 12], [16, 12], [21, 19], [20, 22], [4, 22], [3, 19]], r[2]);
  p.poly([[8, 12], [10, 12], [7, 22], [4, 22], [3, 19]], r[3]); p.poly([[15, 12], [16, 12], [21, 19], [20, 22], [17, 22]], r[1]);
  p.rect(8, 11, 8, 1, mix(r[4], WHITE, 0.45)); p.px([7, 14, 6, 16, 5, 18], WHITE); p.rect(5, 21, 14, 1, r[1]);
  emboss(p, 12, 17, MARK[mark], r[0]);
};
/** Schutzelixier: schildförmige Phiole in Goldfassung, Elementfarbe und Elementzeichen */
const ward = (r: Ramp, mark: string, fg: number = WHITE, sh: number = r[0]): Fn => (p) => {
  const Y = P.gold;
  p.rect(10, 0, 4, 2, P.tan[2]); p.rect(10, 0, 2, 1, P.tan[4]);
  p.rect(10, 2, 4, 4, P.ice[3]); p.rect(10, 2, 1, 4, P.ice[4]);
  p.poly([[5, 5], [19, 5], [21, 7], [21, 14], [18, 19], [12, 23], [6, 19], [3, 14], [3, 7]], Y[2]);
  p.poly([[5, 5], [19, 5], [21, 7], [3, 7]], Y[3]); p.rect(5, 5, 7, 1, Y[4]); p.px([3, 8, 3, 9, 3, 10, 4, 15, 5, 17], Y[3]); p.px([20, 12, 20, 14, 18, 18, 16, 20], Y[1]);
  p.poly([[5, 8], [19, 8], [19, 14], [17, 18], [12, 21.5], [7, 18], [5, 14]], r[2]);
  p.poly([[5, 8], [8, 8], [8, 19], [7, 18], [5, 14]], r[3]); p.poly([[17, 8], [19, 8], [19, 14], [17, 18], [14, 20], [17, 14]], r[1]);
  p.rect(5, 8, 14, 1, mix(r[4], WHITE, 0.45)); p.px([6, 10, 6, 11, 6, 12], WHITE);
  emboss(p, 12, 13, MARK[mark], sh, fg);
};
const IRONBARK: Ramp = [P.wood[0], mix(P.wood[1], P.steel[1], 0.5), mix(P.wood[2], P.steel[2], 0.55), mix(P.tan[2], P.steel[3], 0.6), P.steel[4]];
const GLUT: Ramp = [P.red[0], P.red[1], P.red[2], P.fire[2], P.fire[3]];
const MINT: Ramp = [P.teal[0], P.teal[1], P.teal[2], P.teal[3], P.teal[4]];
const POTIONS: Record<string, Fn> = {
  potion_hp4: quell(P.red), potion_mp4: quell(P.blue),
  // Läuterungstrank: schlanke Phiole, helles Mint, Blatt am Hals, aufsteigende Perlen
  potion_cleanse: (p) => {
    const M: Ramp = [P.teal[1], P.teal[2], P.teal[3], P.teal[4], mix(P.teal[4], WHITE, 0.6)], G = P.green;
    p.rect(10, 1, 4, 2, P.tan[2]); p.rect(10, 1, 2, 1, P.tan[4]);
    p.rect(10, 3, 4, 5, P.ice[3]); p.rect(10, 3, 1, 5, P.ice[4]); p.rect(9, 3, 6, 1, P.ice[4]);
    p.poly([[10, 8], [14, 8], [17, 11], [17, 20], [15, 22], [9, 22], [7, 20], [7, 11]], P.ice[3]);
    p.poly([[7, 12], [17, 12], [17, 20], [15, 22], [9, 22], [7, 20]], M[2]); p.rect(7, 12, 3, 9, M[3]); p.rect(15, 12, 2, 9, M[1]); p.rect(9, 21, 6, 1, M[1]);
    p.rect(7, 11, 10, 1, M[4]); p.rect(8, 9, 1, 2, WHITE); p.px([8, 13, 8, 14, 8, 15], WHITE);
    p.px([12, 14, 13, 18, 11, 19, 14, 15], M[4]); p.px([12, 17, 11, 13], WHITE);
    p.rect(9, 7, 6, 1, P.tan[3]); p.poly([[15, 7], [20, 4], [22, 7], [19, 10]], G[3]); p.line(15, 8, 20, 6, G[4]); p.px([21, 8, 19, 9], G[2]);
    p.px([4, 6, 20, 15], M[4]);
  },
  elx_guard: flask(IRONBARK, 'guard'), elx_speed: flask(MINT, 'speed'), elx_crit: flask(P.gold, 'crit'), elx_power: flask(GLUT, 'power'),
  elx_res_fire: ward(P.fire, 'fire'), elx_res_water: ward(P.blue, 'water'), elx_res_earth: ward(EARTH, 'earth'),
  elx_res_wind: ward(WIND, 'wind'), elx_res_dark: ward(P.violet, 'dark'),
  elx_res_light: ward([P.gold[1], P.gold[3], P.gold[4], mix(P.gold[4], WHITE, 0.5), WHITE], 'light', P.gold[1], WHITE),
};

// ================================================================ Speisen
const LICHEN: Ramp = [P.forest[1], mix(P.forest[3], P.ice[1], 0.5), mix(P.green[3], P.ice[2], 0.55), mix(P.green[4], P.ice[3], 0.5), P.ice[4]];
const FOODS: Record<string, Fn> = {
  // Beerengrütze: Holzschale, rote Grütze mit Sahne und Beeren, Löffel
  food_beeren: (p) => {
    const W = P.wood, R: Ramp = [P.red[0], P.red[1], mix(P.red[2], P.pink[2], 0.4), mix(P.red[3], P.pink[3], 0.5), P.pink[4]];
    p.line(15, 8, 20, 1, W[3], 2); p.line(16, 9, 21, 2, W[2]); p.set(20, 1, W[4]);
    p.poly([[2, 12], [22, 12], [20, 18], [16, 22], [8, 22], [4, 18]], W[2]);
    p.poly([[2, 12], [7, 12], [9, 22], [8, 22], [4, 18]], W[3]); p.poly([[18, 12], [22, 12], [20, 18], [16, 22], [15, 22], [17, 17]], W[1]);
    p.line(7, 15, 9, 20, W[1]); p.line(12, 15, 12, 21, W[1]); p.px([4, 14, 5, 16], W[4]);
    p.ell(12, 12, 10.4, 3, W[3]); p.ell(12, 12, 9, 2.2, R[1]); p.px([3, 11, 4, 10, 5, 10], W[4]);
    p.ell(12, 10.8, 7.6, 3.2, R[2]); p.ell(10.5, 10, 5, 2, R[3]);
    p.px([8, 10, 9, 9, 10, 9, 11, 10, 12, 11, 13, 11, 14, 10], P.cream[4]); p.px([9, 10, 13, 10], P.cream[3]);
    p.rect(14, 8, 2, 2, P.blue[2]); p.set(14, 8, P.ice[3]); p.rect(6, 10, 2, 2, P.blue[2]); p.set(6, 10, P.ice[3]); p.rect(11, 7, 2, 2, R[1]); p.set(11, 7, R[4]);
    p.px([9, 7, 8, 8], P.green[4]);
  },
  // Leuchtpilzpfanne: Eisenpfanne mit türkisen Pilzen
  food_pilz: (p) => {
    const S = P.steel, T = P.teal, C = P.cream;
    p.line(17, 9, 21, 3, P.wood[2], 3); p.line(17, 9, 21, 3, P.wood[3]); p.px([22, 2, 21, 2], P.wood[4]);
    p.ell(10.5, 15, 10, 7, S[1]); p.ell(10.5, 14.2, 10, 6.4, S[2]); p.ell(10.5, 14.2, 8.4, 5, P.ash[1]); p.ell(10.5, 15, 7.6, 4, P.ash[2]);
    for (let a = 3.3; a < 4.9; a += 0.06) p.set(10.5 + Math.cos(a) * 9.4, 14.2 + Math.sin(a) * 5.8, S[4]);
    for (const [x, y, s] of [[6, 14, 1], [11, 16, 1], [14, 12, 0], [9, 11, 0]] as const) {
      p.rect(x, y, 2, 2 + s, C[3]); p.set(x, y, C[4]);
      p.ell(x + 1, y - 0.2, 2.8 + s * 0.4, 1.9, T[2]); p.ell(x + 0.6, y - 0.6, 2 + s * 0.4, 1.2, T[3]); p.set(x, y - 1, WHITE); p.set(x + 2, y - 1, T[4]);
    }
    p.px([4, 16, 8, 18, 15, 16, 12, 12], P.green[3]); p.px([7, 17, 14, 15], P.gold[4]);
  },
  // Feuerschoten-Spieß: Fleisch und Schoten im Wechsel
  food_spiess: (p) => {
    const W = P.wood, M: Ramp = [P.wood[0], P.wood[1], mix(P.tan[1], P.red[1], 0.25), P.tan[2], P.tan[3]], R = P.red;
    p.line(1, 22, 22, 1, W[3]); p.px([22, 1, 21, 2], W[4]); p.line(1, 22, 3, 20, W[2], 2);
    const meat = (x: number, y: number): void => { p.poly([[x, y - 4], [x + 4, y], [x, y + 4], [x - 4, y]], M[2]); p.poly([[x, y - 4], [x + 1, y - 1], [x - 2, y + 1], [x - 4, y]], M[3]); p.poly([[x + 4, y], [x, y + 4], [x, y + 2], [x + 2, y]], M[1]); p.line(x - 1, y - 1, x + 1, y + 1, M[0]); p.set(x - 1, y - 2, M[4]); };
    meat(6.5, 17.5); p.ball(10.5, 13.5, 2.8, 2.8, R, 1, 4); meat(14.5, 9.5); p.ball(18.5, 5.5, 2.8, 2.8, R, 1, 4);
    p.px([9, 12, 17, 4], WHITE); p.px([12, 12, 20, 4], P.green[3]);
    p.px([21, 7, 22, 5], P.fire[2]); p.set(22, 6, P.fire[3]);
  },
  // Flechteneintopf: gusseiserner Kessel, graugrüner Eintopf, Kelle
  food_eintopf: (p) => {
    const K: Ramp = [P.ash[0], P.ash[2], P.steel[1], P.steel[2], P.steel[3]], L = LICHEN;
    p.line(15, 9, 20, 2, P.wood[3], 2); p.line(16, 9, 21, 2, P.wood[2]); p.set(20, 2, P.wood[4]);
    p.rect(1, 12, 3, 3, K[3]); p.set(2, 13, 0); p.rect(20, 12, 3, 3, K[2]); p.set(21, 13, 0);
    p.ball(12, 15.5, 9.4, 6.8, K, 0, 4, -0.08);
    p.rect(5, 21, 2, 2, K[2]); p.rect(17, 21, 2, 2, K[1]); p.rect(11, 22, 2, 1, K[1]);
    p.ell(12, 10.5, 9.6, 3, K[3]); p.ell(12, 10.5, 8.2, 2.1, L[1]); p.ell(11, 10.3, 6, 1.4, L[2]);
    for (let a = 3.3; a < 5; a += 0.06) p.set(12 + Math.cos(a) * 9.2, 10.5 + Math.sin(a) * 2.7, K[4]);
    p.px([7, 10, 10, 11, 13, 10], L[4]); p.px([9, 10, 15, 11], P.fire[2]); p.px([11, 9, 6, 11], L[3]); p.set(17, 10, P.cream[3]);
    p.px([6, 15, 5, 17], K[4]); p.line(8, 14, 7, 19, K[3]);
  },
  // Honigfeigen: zwei Feigenhälften auf dem Teller, Honiglöffel
  food_feigen: (p) => {
    const Y = P.gold, C = P.cream, SK = mix(P.gold[1], P.violet[1], 0.3);
    p.ell(12, 19, 11.4, 3.8, C[2]); p.ell(12, 18.4, 11.4, 3.4, C[4]); p.ell(12, 18.4, 8.4, 2, C[3]);
    p.line(18, 6, 22, 1, P.wood[3], 2); p.ell(17, 7.5, 2.6, 2.8, Y[3]); p.px([16, 6, 16, 8, 18, 7, 18, 9], Y[1]); p.set(16, 7, Y[4]);
    const half = (x: number, y: number): void => {
      p.poly([[x, y - 6.5], [x + 3, y - 3], [x - 3, y - 3]], SK); p.ell(x, y, 4.8, 5, SK); p.ell(x, y, 4, 4.2, C[4]);
      p.ell(x, y + 0.2, 3.1, 3.3, P.red[2]); p.ell(x, y + 0.4, 1.8, 2, P.pink[3]); p.px([x, y - 1.5, x - 2, y + 0.5, x + 1, y + 2, x + 2, y], Y[4]);
    };
    half(7.5, 12.5); half(15.5, 14);
    p.px([4, 9, 5, 10, 6, 11, 8, 11, 9, 12, 10, 13, 12, 13, 13, 14, 14, 15], Y[4]); p.px([7, 11, 11, 13], Y[3]);
    p.px([16, 10, 16, 11, 17, 12], Y[4]); p.px([4, 17, 4, 18, 11, 18, 11, 19, 19, 18], Y[3]); p.px([4, 16, 11, 17], Y[4]);
  },
  // Geisterblütentee: Tasse mit lila Tee, Blüte auf der Untertasse
  food_tee: (p) => {
    const C = P.cream, V = P.violet;
    p.ell(11.5, 20.6, 10.4, 2.6, C[2]); p.ell(11.5, 20, 10.4, 2.2, C[4]); p.ell(11.5, 20, 6, 1, C[3]);
    p.ell(18.5, 14, 3.6, 3.6, C[3]); p.ell(18.2, 14, 1.8, 1.9, 0); p.px([20, 12, 21, 13], C[4]);
    p.poly([[4, 10], [19, 10], [17, 17], [14, 20], [9, 20], [6, 17]], C[4]);
    p.poly([[15, 10], [19, 10], [17, 17], [14, 20], [13, 20], [15, 15]], C[2]); p.poly([[12, 12], [15, 12], [15, 15], [13, 20], [11, 20]], C[3]);
    p.ell(11.5, 10, 7.8, 2.6, C[3]); p.ell(11.5, 10, 6.6, 1.7, V[2]); p.px([7, 10, 8, 9, 9, 9, 10, 9], V[3]); p.px([5, 9, 6, 8], WHITE);
    p.px([12, 10, 13, 10], WHITE); p.set(13, 9, V[4]);
    p.px([6, 14, 8, 15, 10, 16, 12, 16, 14, 15], V[3]); p.px([7, 13, 9, 14, 11, 15, 13, 15], V[2]);
    p.px([3, 20, 4, 19], V[4]); p.set(3, 19, WHITE); p.set(2, 20, V[3]);
  },
  // Quellhainer Festmahl: Braten mit Keulen auf silberner Platte, Beilagen
  food_fest: (p) => {
    const S = P.steel, R: Ramp = [P.wood[1], P.wood[2], mix(P.tan[2], P.fire[1], 0.4), mix(P.tan[3], P.fire[2], 0.4), P.tan[4]], G = P.green;
    p.ell(12, 19.6, 11.6, 3.4, S[1]); p.ell(12, 19, 11.6, 3, S[3]); p.ell(12, 19, 9, 1.8, S[2]); p.px([2, 18, 3, 17, 4, 17], S[4]);
    p.line(17, 9, 20, 4, P.bone[3], 2); p.rect(20, 2, 2, 2, P.bone[4]); p.rect(21, 4, 2, 2, P.bone[3]);
    p.line(13, 7, 14, 3, P.bone[2], 2); p.rect(13, 1, 2, 2, P.bone[4]); p.set(15, 2, P.bone[3]);
    p.ball(10.5, 13, 8.4, 6, R, 1, 4); p.ell(16.5, 11.5, 3.6, 3, R[2]); p.ell(16, 11, 2.4, 1.8, R[3]); p.ell(12.5, 9, 2.6, 2.2, R[3]);
    p.px([6, 10, 7, 9], WHITE); p.px([5, 12, 8, 9, 12, 8], R[4]); p.line(9, 13, 13, 15, R[1]); p.line(8, 16, 12, 17, R[1]);
    p.px([2, 17, 3, 16, 4, 18, 5, 19, 3, 19], G[3]); p.px([3, 17, 4, 19], G[4]); p.px([6, 20, 1, 18], G[2]);
    p.rect(18, 17, 2, 2, P.red[2]); p.set(18, 17, P.red[4]); p.rect(20, 16, 2, 2, P.red[2]); p.set(20, 16, P.red[4]); p.rect(16, 19, 2, 2, P.red[1]); p.set(16, 19, P.red[3]);
    p.rect(11, 20, 3, 1, P.gold[4]); p.set(12, 21, P.gold[3]);
  },
};

// ================================================================ Legendäre Waffen (eine je Klasse)
const LEGENDS: Record<string, Fn> = {
  // Sechsklang (Krieger): breite Klinge, sechs Elementsteine in der Hohlkehle
  leg_krieger: (p) => {
    const S = P.steel, Y = P.gold;
    p.poly([[22, 1], [21, 6], [11, 16], [7, 12], [17, 2]], S[3]); p.poly([[22, 1], [17, 2], [7, 12], [9, 14]], S[4]); p.poly([[21, 5], [21, 6], [11, 16], [10, 15]], S[2]);
    p.line(18, 2, 8, 12, WHITE); p.set(21, 2, WHITE);
    const gems = [P.fire[2], P.blue[3], EARTH[3], P.teal[4], P.gold[4], P.violet[3]];
    gems.forEach((c, i) => { p.set(10 + i * 2, 13 - i * 2, c); p.set(11 + i * 2, 12 - i * 2, S[1]); });
    p.line(3, 10, 12, 19, Y[2], 2); p.line(3, 10, 11, 18, Y[3], 2); p.px([3, 10, 4, 10, 5, 12], Y[4]); p.rect(2, 8, 3, 3, Y[3]); p.set(2, 8, Y[4]); p.rect(12, 18, 3, 3, Y[2]); p.set(12, 18, Y[3]);
    p.rect(7, 14, 2, 2, P.teal[3]); p.set(7, 14, P.teal[4]);
    p.line(6, 17, 3, 20, P.blue[1], 2); p.px([5, 17, 4, 19], P.blue[3]);
    p.rect(1, 20, 3, 3, Y[3]); p.set(1, 20, Y[4]); p.set(2, 21, P.teal[4]);
  },
  // Wogenruf (Magier): Stab, dessen Kopf als Welle eine Wasserkugel umschließt
  leg_magier: (p) => {
    const B = P.blue, T = P.teal, Y = P.gold;
    p.line(3, 22, 12, 11, B[1], 2); p.line(3, 22, 12, 10, B[2]); p.px([5, 19, 6, 18, 8, 15, 9, 14], Y[3]); p.px([5, 20, 8, 16], Y[1]); p.rect(2, 21, 2, 2, Y[3]);
    p.rect(11, 9, 3, 3, Y[3]); p.set(11, 9, Y[4]); p.set(13, 11, Y[1]);
    for (let a = 2.2; a < 7.4; a += 0.05) {
      const r = 6.4 - (a > 6 ? (a - 6) * 2.2 : 0), x = 15.5 + Math.cos(a) * r, y = 7.5 + Math.sin(a) * r, w = a < 3 ? 1 : 2;
      p.rect(Math.round(x - w / 2), Math.round(y - w / 2), w, w, a > 5.6 ? T[4] : a > 3.6 ? T[3] : T[2]);
    }
    p.px([20, 5, 21, 7, 19, 4], WHITE); p.px([11, 4, 13, 2, 16, 1], T[4]);
    p.ball(15.5, 7.5, 3.4, 3.4, B, 1, 4); p.px([14, 6, 15, 5], WHITE);
  },
  // Echosehne (Waldläufer): heller Bogen mit leuchtender Sehne, die nachklingt
  leg_waldlaeufer: (p) => {
    const C = P.cream, Y = P.gold, G = P.green;
    const at = (t: number): [number, number] => [3 + t * 15 + Math.sin(t * Math.PI) * 7, 20 - t * 17 + Math.sin(t * Math.PI) * 7];
    for (let i = 0; i <= 60; i++) { const t = i / 60, [x, y] = at(t), w = t < 0.1 || t > 0.9 ? 2 : 3; p.rect(Math.round(x), Math.round(y), w, w, t < 0.14 || t > 0.86 ? Y[2] : C[2]); }
    for (let i = 0; i <= 60; i++) { const t = i / 60, [x, y] = at(t), tip = t < 0.14 || t > 0.86; p.rect(Math.round(x), Math.round(y), 2, 2, tip ? Y[3] : C[3]); }
    for (let i = 0; i <= 60; i++) { const t = i / 60, [x, y] = at(t); p.set(Math.round(x), Math.round(y), t < 0.14 || t > 0.86 ? Y[4] : C[4]); }
    p.px([2, 19, 3, 19, 17, 2, 17, 3], Y[4]);
    // Griff mit Blattwicklung, Blätter an den Wurfarmen
    p.rect(14, 13, 4, 4, G[2]); p.px([14, 13, 15, 13, 14, 14], G[4]); p.px([17, 16, 16, 16, 17, 15], G[1]); p.set(15, 14, Y[4]);
    p.px([9, 20, 10, 21, 11, 20], G[3]); p.set(10, 20, G[4]); p.px([20, 9, 21, 10, 20, 11], G[3]); p.set(20, 10, G[4]);
    p.line(3, 20, 18, 3, P.teal[4]); p.px([3, 20, 18, 3], WHITE);
  },
  // Morgenwacht (Paladin): goldener Hammerkopf mit Sonnenscheibe, Stiel aus altem Brunnenbalken
  leg_paladin: (p) => {
    const Y = P.gold, W = P.wood, S = P.steel;
    p.line(4, 21, 13, 11, W[1], 3); p.line(4, 21, 13, 10, W[3]); p.px([6, 18, 7, 17, 9, 14, 10, 13], Y[3]); p.rect(2, 20, 3, 3, Y[3]); p.set(2, 20, Y[4]);
    p.poly([[8, 6], [14, 0], [23, 9], [17, 15]], Y[3]); p.poly([[8, 6], [14, 0], [16, 2], [10, 8]], Y[4]); p.poly([[21, 7], [23, 9], [17, 15], [15, 13]], Y[1]);
    p.poly([[8, 6], [10, 4], [13, 7], [11, 9]], S[4]); p.poly([[10, 8], [11, 9], [13, 7], [12, 6]], S[2]); p.poly([[19, 9], [21, 7], [23, 9], [21, 11]], S[3]); p.poly([[19, 13], [21, 11], [20, 10], [18, 12]], S[1]);
    p.ell(15.5, 7.5, 2.6, 2.6, Y[4]); p.ell(15.5, 7.5, 1.6, 1.6, WHITE);
    p.px([15, 3, 12, 7, 19, 7, 15, 11, 13, 5, 18, 5, 13, 10, 18, 10], WHITE);
  },
  // Zwielichtfänge (Schattenjäger): zwei gekreuzte, gebogene Klingen – Dämmerung und Morgenrot
  leg_schattenjaeger: (p) => {
    const V = P.violet, K = P.pink, S = P.steel, Y = P.gold;
    const fang = (flip: boolean, r: Ramp, edge: number): void => {
      const X = (x: number): number => (flip ? 23 - x : x);
      const pts = bez([7, 16], [9, 7], [20, 2], 20);
      pts.forEach(([x, y], i) => { const w = 3.2 * (1 - i / 22); p.ell(X(x) + (flip ? -0.2 : 0.2), y, w * 0.62 + 0.5, w * 0.62 + 0.5, r[2]); });
      pts.forEach(([x, y], i) => { const w = 3.2 * (1 - i / 22); if (w > 1.2) p.ell(X(x - 0.6), y - 0.6, w * 0.34, w * 0.34, r[3]); });
      pts.forEach(([x, y]) => p.set(X(x - 1.2) , y - 1.4, edge));
      p.line(X(4), 14, X(9), 19, Y[2], 2); p.set(X(4), 14, Y[4]); p.set(X(5), 15, Y[3]);
      p.line(X(6), 18, X(3), 21, P.teal[1], 2); p.set(X(5), 18, P.teal[3]); p.rect(flip ? 20 : 2, 21, 2, 2, Y[3]);
    };
    fang(true, [S[1], S[2], mix(S[3], K[3], 0.35), mix(S[4], K[4], 0.4), WHITE], Y[4]);
    fang(false, [P.shadow[1], V[1], V[2], V[3], V[4]], K[3]);
    p.set(20, 2, K[4]); p.set(3, 2, WHITE);
  },
};

// ================================================================ Rezeptrolle
const MISC: Record<string, Fn> = {
  // vergilbtes Blatt mit Skizze (Kolben + Hammer), Eselsohr, türkises Band
  recipe: (p) => {
    const T = P.tan, I = P.wood[1];
    p.poly([[4, 4], [20, 4], [20, 18], [16, 22], [4, 22]], T[4]); p.rect(17, 5, 3, 13, T[3]); p.rect(4, 21, 12, 1, T[3]); p.poly([[20, 18], [16, 22], [16, 18]], T[2]); p.px([16, 18, 17, 18], T[1]);
    p.rrect(2, 1, 20, 4, P.cream[4]); p.rect(3, 4, 18, 1, T[2]); p.rect(3, 1, 12, 1, WHITE); p.rect(1, 2, 2, 2, P.wood[2]); p.rect(21, 2, 2, 2, P.wood[2]);
    // Kolben
    p.rect(7, 7, 2, 2, I); p.px([6, 9, 5, 10, 5, 11, 6, 12, 7, 12, 8, 12, 9, 12, 10, 11, 10, 10, 9, 9], I); p.px([7, 10, 8, 10, 7, 11, 8, 11, 6, 11, 9, 11, 9, 10, 6, 10], P.red[2]);
    // Plus, Hammer
    p.px([12, 9, 12, 10, 12, 11, 11, 10, 13, 10], I);
    p.rect(14, 7, 4, 2, P.steel[1]); p.line(16, 9, 15, 12, I);
    for (const [y, w] of [[15, 9], [17, 7], [19, 5]] as const) p.rect(6, y, w, 1, T[1]);
    p.rect(12, 16, 3, 5, P.teal[2]); p.rect(12, 16, 1, 5, P.teal[3]); p.px([12, 21, 14, 21], P.teal[2]); p.set(13, 21, 0);
  },
};

// ================================================================ Buff-Kacheln (gerahmt wie Fähigkeiten-Icons, ohne Außenkontur)
/** Hintergrundkachel der Fähigkeiten-Icons: Verlauf von oben links nach unten rechts, Lichtkante, dunkler Rahmen */
export function iconTile(p: Px, r: Ramp): void {
  p.rrect(0, 0, 24, 24, r[0]); p.rect(1, 1, 22, 22, r[2]);
  for (let y = 1; y < 23; y++) for (let x = 1; x < 23; x++) { const d = x + y; p.set(x, y, d < 16 ? r[3] : d > 34 ? r[1] : d > 24 && ((x + y) & 1) && d < 28 ? r[1] : d < 20 && ((x + y) & 1) ? r[3] : r[2]); }
  p.rect(1, 1, 22, 1, r[4]); p.rect(1, 1, 1, 22, r[4]); p.rect(1, 22, 22, 1, r[0]); p.rect(22, 1, 1, 22, r[0]); p.rect(2, 21, 20, 1, r[1]); p.rect(21, 2, 1, 20, r[1]);
  p.px([1, 1, 22, 1, 1, 22, 22, 22], r[0]);
}
/** Zeichnet fn mit dunklem Schlagschatten (1px nach unten rechts und Kontur) auf die Kachel */
const onTile = (p: Px, sh: number, fn: Fn): void => {
  const q = new Px(24, 24); fn(q);
  for (const [dx, dy] of [[1, 1], [0, 1], [1, 0], [-1, 0], [0, -1]] as const) for (let y = 2; y < 22; y++) for (let x = 2; x < 22; x++) if (q.get(x - dx, y - dy) >>> 24) p.set(x, y, sh);
  for (let y = 2; y < 22; y++) for (let x = 2; x < 22; x++) { const c = q.get(x, y); if (c >>> 24) p.set(x, y, c); }
};
const ring = (q: Px, cx: number, cy: number, r: number, c: number, c2: number, a0 = 0, a1 = Math.PI * 2): void => {
  for (let a = a0; a < a1; a += 0.04) { const x = Math.round(cx + Math.cos(a) * r - 1), y = Math.round(cy + Math.sin(a) * r - 1); q.rect(x, y, 2, 2, Math.sin(a) * 0.7 + Math.cos(a) * 0.5 > 0.35 ? c2 : c); }
};
const BUFFS: Record<string, Fn> = {
  // Einklang: zwei Elemente, zwei verschlungene Ringe
  buff_einklang: (p) => {
    const N: Ramp = [P.shadow[1], P.blue[0], mix(P.blue[1], P.violet[1], 0.5), mix(P.blue[2], P.violet[2], 0.5), P.ice[3]];
    iconTile(p, N);
    onTile(p, P.shadow[0], (q) => {
      const drop = (a0: number, r: Ramp): void => {
        const at = (t: number): [number, number, number] => { const a = a0 + t * 3.1, R = 3.3 + t * 4.9; return [12 + Math.cos(a) * R, 12 + Math.sin(a) * R, 3.1 * Math.pow(1 - t, 0.75) + 0.55]; };
        for (let t = 0; t <= 1; t += 0.02) { const [x, y, w] = at(t); q.ell(x, y, w, w, r[2]); }
        for (let t = 0; t <= 0.7; t += 0.02) { const [x, y, w] = at(t); q.ell(x - 0.7, y - 0.8, w * 0.55, w * 0.55, r[3]); }
        const [hx, hy] = at(0); q.set(hx - 1.5, hy - 1.5, WHITE);
      };
      drop(-2.5, P.fire); drop(-2.5 + Math.PI, [P.blue[0], P.blue[1], P.blue[3], P.blue[4], WHITE]);
    });
  },
  // Morgenwacht: Lichtschild mit aufgehender Sonne vor Morgenhimmel
  buff_morgenwacht: (p) => {
    const D: Ramp = [P.blue[0], P.blue[1], mix(P.blue[2], P.violet[2], 0.25), mix(P.blue[3], P.pink[3], 0.4), P.gold[4]], Y = P.gold;
    iconTile(p, D);
    onTile(p, P.blue[0], (q) => {
      q.poly([[5, 4], [19, 4], [19, 12], [12, 20], [5, 12]], Y[2]); q.poly([[5, 4], [12, 4], [12, 20], [5, 12]], Y[3]); q.poly([[17, 4], [19, 4], [19, 12], [12, 20], [12, 18], [17, 12]], Y[1]);
      q.rect(5, 4, 14, 1, Y[4]); q.rect(5, 5, 1, 7, Y[4]); q.rect(7, 14, 10, 1, Y[1]);
      for (let y = 10; y < 14; y++) for (let x = 8; x < 16; x++) { const dx = x + 0.5 - 12, dy = y + 0.5 - 14; if (dx * dx + dy * dy <= 12.5) q.set(x, y, WHITE); }
      q.px([11, 7, 12, 7, 11, 8, 12, 8, 8, 9, 15, 9, 7, 12, 16, 12], WHITE); q.px([10, 16, 12, 17, 13, 16], Y[1]);
    });
  },
};
/** Icons, die ihren Rahmen selbst mitbringen (keine Außenkontur) */
export const CRAFT_FLAT = new Set(Object.keys(BUFFS));

export const CRAFT_ICONS: Record<string, Fn> = { ...ESSENCES, ...CORES, ...MONSTER, ...INGREDIENTS, ...POTIONS, ...FOODS, ...LEGENDS, ...MISC, ...BUFFS };

/** Lichtpunkte/Schein nach der Kontur */
export const CRAFT_GLOW: Record<string, Fn> = {
  mat_ess_light: (p) => { halo(p, 12, 12, 7, P.gold[4], 60); },
  mat_core_ignarok: (p) => { halo(p, 12, 12, 9, P.fire[2], 55); },
  mat_core_kristallkoloss: (p) => { spark(p, 20, 4, P.gold[4]); },
  mat_glimmer: (p) => { spark(p, 7, 7, P.teal[4]); spark(p, 17, 5, P.pink[4], true); p.set(12, 3, WHITE); p.set(21, 10, P.teal[4]); p.set(3, 11, alpha(P.ice[4], 200)); },
  mat_cavecap: (p) => { halo(p, 12.5, 8, 11, P.teal[4], 50); p.set(21, 4, alpha(P.teal[4], 220)); p.set(2, 5, alpha(P.teal[4], 160)); },
  mat_ghostbloom: (p) => { halo(p, 12, 8, 10, P.violet[4], 45); },
  mat_ashclaw: (p) => { halo(p, 6, 19.5, 6, P.fire[2], 60); },
  potion_hp4: (p) => { spark(p, 20, 6, P.red[4]); p.set(3, 9, alpha(P.red[4], 200)); },
  potion_mp4: (p) => { spark(p, 20, 6, P.blue[4]); p.set(3, 9, alpha(P.blue[4], 200)); },
  potion_cleanse: (p) => { spark(p, 4, 5, P.teal[4]); p.set(20, 14, WHITE); p.set(5, 17, alpha(P.teal[4], 200)); },
  elx_power: (p) => { p.set(12, 0, alpha(P.fire[3], 230)); p.set(15, 1, alpha(P.fire[2], 200)); p.set(8, 2, alpha(P.fire[2], 180)); },
  food_pilz: (p) => { halo(p, 10, 13, 12, P.teal[4], 36); },
  food_eintopf: (p) => { const s = alpha(WHITE, 150), s2 = alpha(WHITE, 90); p.px([7, 6, 8, 5, 7, 4, 8, 3], s); p.px([11, 6, 12, 5, 11, 4, 10, 3, 11, 2], s); p.px([8, 2, 11, 1, 7, 7], s2); },
  food_tee: (p) => { const s = alpha(mix(P.violet[4], WHITE, 0.5), 190), s2 = alpha(P.violet[4], 110); p.px([10, 6, 11, 5, 11, 4, 10, 3, 9, 2, 10, 1], s); p.px([14, 6, 15, 5, 14, 4, 14, 3], s); p.px([11, 0, 15, 2, 9, 6], s2); },
  food_fest: (p) => { spark(p, 4, 6, P.gold[4]); p.set(8, 3, alpha(P.gold[4], 200)); },
  leg_krieger: (p) => { halo(p, 15, 8, 8, P.teal[4], 34); spark(p, 19, 9, P.teal[4]); p.set(13, 3, WHITE); p.set(22, 5, alpha(P.teal[4], 220)); },
  leg_magier: (p) => { halo(p, 15.5, 7.5, 9.5, P.blue[4], 40); spark(p, 21, 12, P.blue[4]); p.set(8, 5, WHITE); p.set(22, 2, alpha(P.teal[4], 220)); },
  leg_waldlaeufer: (p) => { for (let i = 0; i <= 13; i++) { p.set(3 + i, 17 - Math.round(i * 1.2), alpha(P.teal[4], 150)); if (i > 1 && i < 12) p.set(2 + i, 14 - Math.round(i * 1.2), alpha(P.teal[4], 80)); } spark(p, 11, 12, P.teal[4]); p.set(21, 8, WHITE); },
  leg_paladin: (p) => { halo(p, 15.5, 7.5, 10, P.gold[4], 48); spark(p, 21, 2, P.gold[4]); p.set(7, 2, WHITE); },
  leg_schattenjaeger: (p) => { halo(p, 12, 11, 5, P.pink[3], 60); spark(p, 12, 4, P.pink[4]); p.set(1, 6, alpha(WHITE, 220)); p.set(22, 6, alpha(P.pink[4], 220)); },
  recipe: (p) => { spark(p, 20, 9, P.gold[4]); },
  mat_aether: (p) => { halo(p, 12, 5, 6.5, P.teal[4], 70); spark(p, 12, 4, P.teal[4]); p.set(8, 3, P.pink[4]); p.set(16, 2, P.gold[4]); p.set(18, 5, alpha(WHITE, 220)); p.set(6, 6, alpha(P.teal[4], 200)); p.set(12, 1, alpha(WHITE, 200)); },
};
void EL; void spark;
