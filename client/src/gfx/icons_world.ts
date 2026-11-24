/**
 * 24x24-Icons für Endspiel und Lebendige Welt (0.5/0.6): Echo-Fragment, Sternsplitter, die fünfzehn Trophäen,
 * sechs Schatzkarten, neue Speisen und Elixiere sowie die benannten Schmuckstücke der Fraktionen und der
 * fahrenden Händlerin. Aufbau wie icons_craft.ts: `WORLD_ICONS` wird gezeichnet und konturiert, `WORLD_GLOW`
 * legt danach Schein und Lichtpunkte darüber. Keys ohne `item_`-Präfix.
 *
 * Präfixe: `mat_` Rohstoff · `tro_` Trophäe · `tmap_` Schatzkarte · `food_` Speise · `elx_` Elixier · `uq_` Unikat-Schmuck.
 */
import { Px, bez, crystal, tube } from './draw';
import type { Pt } from './draw';
import { P, Ramp, INK, WHITE, alpha, mix } from './palette';
import { flask, halo, spark } from './icons_craft';

type Fn = (p: Px) => void;

/** setzt nur auf freie Pixel (Schein und Geisterlinien nach der Kontur) */
const soft = (p: Px, x: number, y: number, c: number): void => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < 24 && y < 24 && p.get(x, y) >>> 24 === 0) p.set(x, y, c); };
const gline = (p: Px, pts: ReadonlyArray<Pt>, c: number): void => {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) || 1;
    for (let k = 0; k <= n; k++) soft(p, x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, c);
  }
};
/** Dampf-/Rauchfähnchen über einer Speise */
const steam = (p: Px, x: number, y: number, c: number = WHITE): void => {
  const s = alpha(c, 160), s2 = alpha(c, 90);
  for (const [dx, dy] of [[0, 0], [1, -1], [1, -2], [0, -3], [-1, -4]] as const) soft(p, x + dx, y + dy, s);
  soft(p, x, y - 5, s2); soft(p, x - 1, y + 1, s2);
};
/** Eiform (oben schmaler), schattiert wie Px.ball */
const egg = (p: Px, cx: number, cy: number, rx: number, ry: number, r: Ramp, lo: number, hi: number): void => {
  const n = hi - lo + 1;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    const ny = (y + 0.5 - cy) / ry;
    if (Math.abs(ny) > 1) continue;
    const w = rx * Math.sqrt(1 - ny * ny) * (1 + 0.2 * ny);
    for (let x = Math.floor(cx - rx - 2); x <= Math.ceil(cx + rx + 2); x++) {
      const nx = (x + 0.5 - cx) / w;
      if (Math.abs(nx) > 1) continue;
      const t = Math.max(0, Math.min(0.999, 0.56 - (nx * 0.42 + ny * 0.58) * 0.62 - (nx * nx + ny * ny) * 0.1));
      p.set(x, y, r[lo + Math.floor(t * n)]);
    }
  }
};
/** Kuppel: obere Hälfte einer Ellipse um (cx, cy) mit Bandschattierung */
const dome = (p: Px, cx: number, cy: number, rx: number, ry: number, r: Ramp, lo: number, hi: number): void => {
  const n = hi - lo + 1;
  for (let y = Math.floor(cy - ry); y < cy; y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, rr = nx * nx + ny * ny;
    if (rr > 1) continue;
    const t = Math.max(0, Math.min(0.999, 0.5 - (nx * 0.45 + ny * 0.75) * 0.55 - rr * 0.1));
    p.set(x, y, r[lo + Math.floor(t * n)]);
  }
};
/** Ringschiene (wie das Ring-Icon): Licht oben links, Schatten unten rechts */
const band = (p: Px, cx: number, cy: number, r: number, hole: number, m: Ramp): void => {
  p.ell(cx, cy, r, r, m[2]); p.ell(cx, cy, hole, hole, 0);
  for (let a = 0; a < 6.3; a += 0.06) {
    const lit = -(Math.cos(a) * 0.5 + Math.sin(a) * 0.7);
    if (lit > 0.45) p.set(cx + Math.cos(a) * (r - 0.9), cy + Math.sin(a) * (r - 0.9), m[4]);
    else if (lit < -0.5) p.set(cx + Math.cos(a) * (r - 0.9), cy + Math.sin(a) * (r - 0.9), m[1]);
    p.set(cx + Math.cos(a) * (hole + 0.2), cy + Math.sin(a) * (hole + 0.2), lit > 0 ? m[1] : m[3]);
  }
};
/** rote Talismankordel mit Schlaufe (wie beim Talisman-Icon) */
const cord = (p: Px, x: number, y1: number, c: number = P.red[2]): void => { p.line(x, 0, x, y1, c); p.ell(x, 2, 2, 2, c); p.ell(x, 2, 1, 1, 0); };
/** Halskette als Bogen (wie beim Amulett-Icon), Enden laufen zum Anhänger bei (12, yEnd) */
const chain = (p: Px, hi: number, lo: number, yEnd: number): void => {
  for (let a = 3.3; a < 6.2; a += 0.1) { p.set(12 + Math.cos(a) * 8.5, 11 + Math.sin(a) * 9.5, hi); p.set(12 + Math.cos(a) * 8.5, 12 + Math.sin(a) * 9.5, lo); }
  p.line(3, 10, 10, yEnd, hi); p.line(21, 10, 14, yEnd, lo);
};
const coin = (p: Px, x: number, y: number): void => {
  const Y = P.gold;
  p.ell(x, y + 1.2, 4, 2.3, Y[1]); p.ell(x, y, 4, 2.3, Y[3]); p.ell(x, y, 2.4, 1.2, Y[2]); p.rect(Math.round(x - 3), Math.round(y - 2), 3, 1, Y[4]);
};

// ================================================================ Rohstoffe
const ECHO: Ramp = [P.shadow[1], P.violet[1], mix(P.blue[2], P.violet[2], 0.5), mix(P.blue[3], P.violet[3], 0.45), mix(P.ice[3], P.violet[4], 0.35)];
const MATS: Record<string, Fn> = {
  // Echo-Fragment: gesplitterter Riss-Kristall; sein Umriss „hallt“ nach rechts nach (Geisterkanten im Schein)
  mat_echo: (p) => {
    const R = ECHO;
    p.poly([[8, 1], [13, 6], [12, 11], [15, 16], [10, 23], [5, 17], [6, 11], [4, 6]], R[2]);
    p.poly([[8, 1], [9, 12], [10, 23], [5, 17], [6, 11], [4, 6]], R[3]);
    p.poly([[8, 1], [8, 8], [4, 6]], R[4]);
    p.poly([[12, 11], [15, 16], [10, 23], [10, 14]], R[1]);
    p.line(7, 3, 6, 10, WHITE); p.px([6, 12, 6, 13], R[4]);
    p.line(9, 12, 10, 20, P.pink[3]); p.set(9, 12, P.pink[4]);
    p.px([11, 7, 12, 8, 11, 9], R[1]); p.px([12, 17, 12, 19], P.shadow[1]);
  },
  // Sternsplitter: kühler, silberblauer Zackenstern, eine Zacke abgebrochen
  mat_star: (p) => {
    const T: Ramp = [P.blue[1], P.blue[2], P.ice[1], P.ice[2], P.ice[3], P.ice[4], WHITE];
    const pts: Pt[] = [];
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k === 4 ? 6.4 : k % 2 ? 4.4 : 10.6; pts.push([12 + Math.cos(a) * r, 12.5 + Math.sin(a) * r]); }
    for (let k = 0; k < 10; k++) {
      const a = pts[k], b = pts[(k + 1) % 10], mx = (a[0] + b[0]) / 2 - 12, my = (a[1] + b[1]) / 2 - 12.5;
      const t = 3 - (mx * 0.42 + my * 0.58) * 0.42 + (k % 2 ? -0.9 : 0.9);
      p.poly([[12, 12.5], a, b], T[Math.max(0, Math.min(6, Math.round(t)))]);
    }
    p.line(12, 12, 12, 3, WHITE); p.line(12, 12, 3, 9, T[5]); p.line(12, 12, 20, 9, T[4]); p.line(12, 12, 6, 20, T[3]);
    p.ell(12, 12.5, 1.8, 1.8, WHITE);
    // Bruchkante und abgesprungener Splitter
    p.px([16, 17, 17, 18], P.blue[1]); p.rect(19, 20, 2, 2, T[3]); p.set(19, 20, T[5]); p.set(22, 22, T[2]);
  },
};

// ================================================================ Trophäen: je seltenem Monster und Weltboss eine
const LICHEN: Ramp = [P.forest[1], mix(P.forest[3], P.ice[1], 0.5), mix(P.green[3], P.ice[2], 0.55), mix(P.green[4], P.ice[3], 0.5), P.ice[4]];
const TROPHIES: Record<string, Fn> = {
  // Borkenkrone (Borkenkönig): Reif aus Rinde mit drei hohen Zacken, ein Moospolster, ein Zweig – und sie nadelt
  tro_borkenkoenig: (p) => {
    const W = P.wood, G = P.green;
    p.ell(12, 12.5, 9.4, 3.4, W[0]);
    p.poly([[7, 11], [9, 6], [11, 11]], W[1]); p.poly([[13, 11], [15, 6], [17, 11]], W[1]);
    p.poly([[2, 13], [22, 13], [22, 18], [19, 21], [5, 21], [2, 18]], W[2]);
    p.poly([[2, 14], [3, 3], [7, 14]], W[3]); p.poly([[9, 14], [12, 1], [15, 14]], W[2]); p.poly([[17, 14], [21, 4], [22, 14]], W[1]);
    p.poly([[9, 14], [12, 1], [12, 14]], W[3]);
    p.poly([[2, 13], [8, 13], [8, 21], [5, 21], [2, 18]], W[3]); p.poly([[17, 13], [22, 13], [22, 18], [19, 21], [17, 21]], W[1]);
    p.px([3, 5, 3, 7, 11, 5, 11, 7, 12, 3, 4, 15, 3, 14], W[4]);
    for (const [x, y0, y1] of [[4, 8, 12], [5, 15, 19], [10, 9, 13], [10, 16, 20], [13, 7, 12], [14, 15, 19], [18, 16, 20], [20, 8, 12], [21, 14, 17]] as const) p.line(x, y0, x, y1, W[x > 12 ? 0 : 1]);
    p.rect(5, 20, 14, 1, W[1]); p.rect(2, 13, 20, 1, W[1]); p.rect(3, 13, 5, 1, W[4]);
    p.poly([[3, 18], [5, 16], [8, 17], [10, 19], [6, 20]], G[2]); p.px([4, 17, 5, 17, 7, 18, 8, 18], G[3]); p.px([5, 16, 6, 17], G[4]); p.set(9, 19, G[1]);
    p.line(20, 7, 23, 2, W[3]); p.px([21, 3, 22, 5, 23, 4, 22, 1, 20, 5], G[3]); p.px([22, 2, 23, 5], G[4]);
    p.px([15, 22, 22, 22], G[3]);
  },
  // Hut des Alten Fliegenhuts: roter Hut mit weißen Tupfen, Lamellen, Manschette am Stielstumpf
  tro_fliegenhut: (p) => {
    const R = P.red, C = P.cream;
    p.rect(9, 15, 6, 7, C[3]); p.rect(9, 15, 2, 7, C[4]); p.rect(14, 15, 1, 7, C[2]);
    p.poly([[6, 17], [18, 17], [17, 20], [14, 18], [12, 20], [10, 18], [7, 20]], C[4]); p.px([16, 18, 17, 18, 15, 18], C[2]);
    p.ell(12, 22, 3.6, 1.2, C[2]);
    p.ell(12, 13.5, 10.6, 3, C[3]); for (let x = 3; x < 22; x += 2) p.set(x, 15, C[1]); p.px([4, 14, 8, 14, 12, 14, 16, 14, 20, 14], C[1]);
    dome(p, 12, 14, 11, 13, R, 1, 4);
    p.rect(2, 13, 20, 1, R[1]);
    p.rect(5, 6, 3, 2, C[4]); p.rect(11, 3, 3, 2, C[4]); p.rect(16, 7, 3, 2, C[4]); p.rect(9, 9, 2, 2, C[4]); p.rect(3, 10, 2, 1, C[4]); p.rect(19, 11, 2, 1, C[3]); p.rect(14, 11, 2, 1, C[3]);
    p.px([7, 3, 17, 4], C[4]); p.px([18, 8, 13, 4], C[2]);
  },
  // Tante Echos Schwinge: lila Fledermausflügel mit Fingerknochen und Daumenkralle
  tro_tante_echo: (p) => {
    const V: Ramp = [P.shadow[1], P.violet[1], P.violet[2], P.violet[3], P.violet[4]];
    p.poly([[5, 19], [7, 5], [21, 2], [19, 8], [22, 11], [18, 13], [20, 18], [14, 16], [11, 20], [8, 17]], V[2]);
    p.poly([[7, 5], [21, 2], [19, 8], [12, 9]], V[3]);
    p.poly([[12, 12], [18, 13], [20, 18], [14, 16], [11, 20], [9, 16]], V[1]);
    p.line(7, 5, 21, 2, V[4]); p.line(7, 6, 22, 11, V[4]); p.line(7, 6, 20, 18, V[3]); p.line(7, 7, 11, 20, V[3]);
    p.line(4, 21, 7, 5, V[3], 2); p.line(4, 20, 6, 6, V[4]);
    p.poly([[6, 5], [5, 1], [9, 4]], P.cream[3]); p.set(5, 2, P.cream[4]);
    p.px([21, 2, 22, 11, 20, 18, 11, 20], P.cream[3]);
    p.rect(2, 20, 4, 3, V[2]); p.px([2, 20, 3, 20], V[3]); p.px([5, 22, 4, 22], V[1]);
  },
  // Günthers Schere: blassrosa Kristallschere – großer Bogenfinger, kleiner Daumen, türkises Gelenk
  tro_guenther: (p) => {
    const C: Ramp = [P.pink[0], mix(P.pink[1], P.violet[2], 0.4), mix(P.pink[2], P.ice[2], 0.45), mix(P.pink[3], P.ice[3], 0.5), mix(P.pink[4], WHITE, 0.5)], T = P.teal;
    p.poly([[0, 23], [0, 19], [4, 16], [7, 20], [4, 23]], T[2]); p.px([1, 19, 2, 18, 3, 17], T[3]); p.px([4, 22, 5, 21, 3, 23], T[1]);
    tube(p, bez([10, 18], [20, 22], [21, 13], 16), 3, 0.8, C, 1);
    tube(p, bez([7, 10], [12, -2], [22, 8], 22), 3.8, 0.9, C, 2);
    p.ball(8, 14.5, 6.2, 5.8, C, 1, 4);
    p.px([13, 8, 15, 7, 17, 7, 19, 8, 14, 16, 16, 16, 18, 15], WHITE);
    p.px([21, 9, 22, 9, 21, 12], C[4]);
    p.ell(11.5, 13.5, 1.8, 1.8, T[3]); p.set(11, 13, T[4]); p.set(12, 14, T[1]);
    crystal(p, 4, 11, 2, 6, 1.5, P.teal); crystal(p, 7, 10, 6, 5, 1.2, P.ice);
    p.px([5, 16, 6, 18], C[4]);
  },
  // Meister Rußens Kelle: Schöpfkelle aus Schlacke, noch Glut darin
  tro_meister_russ: (p) => {
    const K: Ramp = [P.ash[0], P.ash[2], P.ash[3], P.ash[4], mix(P.ash[4], P.bone[2], 0.5)], F = P.fire;
    p.line(13, 11, 21, 3, K[2], 2); p.line(13, 11, 21, 3, K[3]); p.px([22, 2, 23, 3, 23, 4, 22, 5], K[2]); p.set(22, 2, K[4]);
    p.ball(9, 15.5, 7.6, 6.6, K, 0, 4);
    p.ell(9, 12.5, 7.2, 3, K[1]); p.ell(9, 12.5, 6, 2.2, F[1]); p.ell(8.5, 12.3, 4.4, 1.5, F[2]); p.ell(8, 12, 2.2, 0.9, F[3]); p.set(7, 12, F[4]);
    for (let a = 3.3; a < 4.9; a += 0.08) p.set(9 + Math.cos(a) * 6.9, 12.5 + Math.sin(a) * 2.8, K[4]);
    p.px([5, 17, 6, 18, 11, 19, 12, 18, 9, 20], K[0]); p.px([3, 15, 4, 14], K[4]);
    p.px([15, 16, 15, 17], F[2]); p.set(15, 19, F[1]);
    p.px([18, 12, 20, 15, 3, 6], K[2]);
  },
  // Warmer Stein der Glucke: eiförmiger, noch glimmender Stein im Schlackennest – ein wenig beleidigt
  tro_glucke: (p) => {
    const E: Ramp = [P.red[1], mix(P.fire[1], P.tan[1], 0.4), mix(P.fire[2], P.tan[2], 0.45), mix(P.fire[3], P.tan[3], 0.5), mix(P.fire[4], P.tan[4], 0.5)], A = P.ash;
    p.poly([[0, 19], [4, 14], [8, 20], [5, 23], [1, 23]], A[2]); p.poly([[16, 20], [20, 14], [23, 18], [22, 23], [18, 23]], A[1]);
    p.px([4, 15, 5, 17], A[4]); p.set(20, 15, A[3]);
    egg(p, 12, 11.5, 7.4, 9.5, E, 0, 4);
    p.px([15, 5, 16, 6, 16, 7], E[1]); p.px([7, 15, 8, 16, 8, 17], P.fire[4]);
    // gekränkte Miene: zwei schräge Brauen, zwei Augen
    p.px([8, 10, 9, 11, 10, 11, 16, 10, 15, 11, 14, 11], P.red[0]); p.px([10, 13, 14, 13], INK); p.px([11, 16, 12, 16, 13, 16], P.red[0]);
    p.poly([[3, 23], [5, 18], [9, 21], [12, 19], [15, 21], [19, 18], [21, 23]], A[2]);
    p.poly([[5, 18], [9, 21], [7, 23], [3, 23]], A[3]); p.px([5, 19, 6, 20, 19, 19], A[4]);
    p.px([10, 22, 13, 21, 17, 22], P.fire[2]); p.set(13, 22, P.fire[3]);
  },
  // Reifbart (Altvater Reif): Schnurrbart und Bart aus Eis, Strähnen laufen in Zapfen aus
  tro_altvater_reif: (p) => {
    const S = P.snow, I = P.ice;
    p.poly([[3, 7], [21, 7], [22, 12], [19, 17], [17, 15], [15, 22], [12, 18], [9, 23], [7, 16], [5, 18], [2, 12]], S[2]);
    p.poly([[3, 7], [10, 7], [9, 23], [7, 16], [5, 18], [2, 12]], S[3]);
    p.poly([[17, 7], [21, 7], [22, 12], [19, 17], [17, 15], [16, 18]], S[1]);
    for (const [x, y0, x1, y1] of [[6, 10, 5, 16], [9, 11, 9, 21], [12, 11, 12, 17], [15, 11, 15, 20], [18, 10, 19, 15]] as const) p.line(x, y0, x1, y1, I[1]);
    p.px([4, 9, 4, 11, 7, 11, 7, 13, 10, 13], S[4]);
    p.px([9, 22, 9, 21, 15, 21, 15, 20, 5, 17, 19, 16, 12, 17], I[3]); p.px([9, 23, 15, 22], I[2]);
    p.rect(10, 9, 4, 2, P.blue[0]); p.rect(11, 10, 2, 1, P.red[0]);
    p.ell(7, 6, 5.4, 2.8, S[3]); p.ell(17, 6, 5.4, 2.8, S[2]); p.ell(6, 5.4, 3.4, 1.4, S[4]); p.ell(16.6, 5.4, 3, 1.2, S[3]);
    p.px([1, 4, 2, 4, 22, 4, 21, 4], S[2]); p.px([1, 3, 22, 3], I[3]);
    p.rect(11, 5, 2, 3, S[1]);
  },
  // Gefangenes Nordlicht: Irrlicht im Einmachglas, zeigt als Pfeil nach Norden; darunter Polarlichtbänder
  tro_nordlicht: (p) => {
    const G = P.ice, N: Ramp = [P.teal[0], P.teal[1], P.teal[2], P.teal[3], P.teal[4]];
    p.rect(8, 1, 8, 3, P.tan[2]); p.rect(8, 1, 4, 1, P.tan[4]); p.rect(14, 2, 2, 2, P.tan[1]);
    p.rect(7, 4, 10, 2, P.steel[2]); p.rect(7, 4, 5, 1, P.steel[4]);
    p.rrect(4, 6, 16, 17, G[2]); p.rect(5, 7, 14, 15, P.blue[0]);
    for (let x = 5; x < 19; x++) {
      const y = Math.round(17 + Math.sin(x * 0.9) * 1.4), y2 = Math.round(20 + Math.sin(x * 0.8 + 2) * 1.1);
      p.set(x, y, N[3]); p.set(x, y + 1, N[1]); p.set(x, y2, P.pink[2]); if (x % 3 === 0) p.set(x, y - 1, N[2]);
    }
    p.poly([[12, 7.5], [16.5, 14], [12, 12.5], [7.5, 14]], N[3]); p.poly([[12, 7.5], [12, 12.5], [7.5, 14]], N[4]);
    p.rect(11, 13, 2, 2, N[3]); p.px([11, 9, 11, 10, 10, 11], WHITE);
    p.rect(5, 8, 1, 9, G[4]); p.set(6, 7, G[4]); p.rect(18, 9, 1, 11, G[1]); p.rect(5, 21, 14, 1, G[1]);
  },
  // Quills Mahnstempel: Holzknauf, Messingfuß mit Auge, feuchtes Rot – der Abdruck liegt daneben
  tro_quill: (p) => {
    const W = P.wood, Y = P.gold, C = P.cream;
    p.poly([[0, 19], [22, 18], [23, 22], [1, 23]], C[4]); p.rect(2, 22, 20, 1, C[2]);
    p.rect(1, 19, 6, 3, P.red[2]); p.rect(2, 20, 4, 1, C[4]);
    p.ball(15, 5, 4.2, 4.2, W, 1, 4); p.rect(13, 8, 4, 5, W[2]); p.rect(13, 8, 1, 5, W[3]); p.rect(16, 8, 1, 5, W[1]); p.rect(12, 9, 6, 1, Y[3]);
    p.poly([[9, 13], [21, 13], [22, 17], [8, 17]], Y[2]); p.poly([[9, 13], [13, 13], [12, 17], [8, 17]], Y[3]); p.rect(9, 13, 12, 1, Y[4]); p.poly([[19, 14], [21, 14], [22, 17], [19, 17]], Y[1]);
    p.rect(8, 17, 15, 2, P.red[1]); p.rect(8, 17, 6, 1, P.red[2]);
    p.rect(13, 15, 5, 1, WHITE); p.set(15, 15, INK); p.px([14, 14, 15, 14, 16, 14], Y[0]);
  },
  // Namensschild ohne Namen (Standbild auf dem falschen Sockel): Bronzeschild, der Name gründlich ausgemeißelt
  tro_sockel: (p) => {
    const B: Ramp = [P.wood[0], P.gold[0], P.gold[1], P.gold[2], P.gold[3]], S = P.stone;
    p.poly([[2, 5], [18, 5], [22, 9], [22, 19], [2, 19]], B[2]);
    p.rect(2, 5, 16, 1, B[4]); p.rect(2, 5, 1, 14, B[3]); p.rect(3, 18, 19, 1, B[1]); p.rect(21, 9, 1, 10, B[1]); p.line(18, 5, 21, 8, B[3]);
    p.rect(5, 8, 14, 8, S[2]); p.rect(5, 8, 14, 1, S[1]); p.rect(5, 8, 1, 8, S[1]); p.rect(5, 15, 14, 1, S[3]);
    for (const [x0, y0, x1, y1] of [[6, 10, 10, 14], [9, 9, 13, 14], [12, 10, 16, 14], [7, 14, 11, 9], [13, 14, 17, 10], [15, 9, 18, 12]] as const) p.line(x0, y0, x1, y1, S[0]);
    p.px([8, 11, 11, 12, 15, 11, 16, 13, 7, 13], S[4]);
    for (const [x, y] of [[3, 7], [3, 17], [20, 17]] as const) { p.set(x, y, B[4]); p.set(x + 1, y, B[1]); }
    p.px([21, 5, 22, 3], S[3]); p.px([9, 21, 14, 22, 17, 21], S[3]); p.px([10, 22, 5, 21], S[2]);
  },
  // Zeiger der Verlorenen Stunde: blasser Stundenzeiger mit Spatenblatt auf einem Bruchstück Zifferblatt
  tro_stunde: (p) => {
    const H: Ramp = [P.violet[0], P.ice[0], P.ice[1], P.ice[2], P.ice[4]], Y = P.gold, C = P.cream;
    const at = (u: number, v: number): Pt => [6.5 + u * 0.69 - v * 0.72, 17.5 - u * 0.72 - v * 0.69];
    p.ell(6.5, 17.5, 7.4, 7.4, Y[1]); p.ell(6.5, 17.5, 6.4, 6.4, C[2]); p.ell(6, 17, 5.6, 5.6, C[3]);
    for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; p.set(6.5 + Math.cos(a) * 4.8, 17.5 + Math.sin(a) * 4.8, P.wood[1]); }
    p.poly([[8, 24], [10, 20], [14, 21], [15, 16], [24, 17], [24, 24]], 0); p.px([10, 21, 13, 21, 14, 18], C[1]);
    p.poly([at(1, 1.1), at(9, 0.9), at(9, -0.9), at(1, -1.1)], H[2]);
    p.poly([at(8, 0.9), at(11, 3.4), at(14.5, 1.3), at(19.5, 0), at(14.5, -1.3), at(11, -3.4), at(8, -0.9)], H[2]);
    p.poly([at(8, 0.9), at(11, 3.4), at(14.5, 1.3), at(19.5, 0), at(8, 0)], H[4]);
    p.poly([at(11, -3.4), at(14.5, -1.3), at(17, -0.6), at(11, -1)], H[1]);
    p.poly([at(10, 1.6), at(12.6, 1.4), at(12.6, -1.4), at(10, -1.6)], H[0]);
    p.poly([at(-0.5, 0.8), at(-3.4, 0.8), at(-3.4, -0.8), at(-0.5, -0.8)], H[1]);
    p.ell(6.5, 17.5, 2.6, 2.6, Y[2]); p.ell(6.2, 17.2, 1.6, 1.6, Y[3]); p.set(6, 17, Y[4]); p.set(7, 18, Y[0]);
  },
  // Krönchen des Hohlprinzen: zu kleine, hohle Krone auf violettem Samtkissen
  tro_hohlprinz: (p) => {
    const Y: Ramp = [P.gold[0], P.gold[1], mix(P.gold[2], P.cream[3], 0.3), mix(P.gold[3], P.cream[4], 0.35), mix(P.gold[4], WHITE, 0.5)], V = P.violet;
    p.ball(12, 18, 10.6, 4.8, V, 1, 3); p.rect(4, 22, 16, 1, V[0]); p.px([5, 16, 6, 15, 7, 15], V[4]);
    p.rect(0, 18, 2, 4, P.gold[2]); p.set(0, 18, P.gold[4]); p.rect(22, 18, 2, 4, P.gold[1]); p.set(22, 18, P.gold[3]);
    p.ell(12, 10.5, 5, 2.2, P.shadow[0]); p.set(12, 11, P.teal[3]);
    p.poly([[7, 12], [7, 6], [10, 12]], Y[3]); p.poly([[10, 12], [12, 4], [15, 12]], Y[2]); p.poly([[14, 12], [18, 6], [18, 12]], Y[1]);
    p.poly([[10, 12], [12, 4], [12, 12]], Y[3]);
    p.rect(7, 12, 11, 4, Y[2]); p.rect(7, 12, 5, 4, Y[3]); p.rect(15, 12, 3, 4, Y[1]); p.rect(7, 12, 11, 1, Y[4]); p.rect(8, 15, 10, 1, Y[1]);
    p.px([7, 5, 12, 3, 18, 5], WHITE); p.px([7, 6, 12, 4], Y[4]);
    p.set(12, 14, P.pink[3]); p.set(9, 14, P.teal[3]); p.set(16, 14, P.teal[2]);
    p.ell(12, 17, 6, 1.2, V[1]);
  },
  // Moosgrimms Flechtenbart: buschiger grüner Bart mit hängenden Flechten, Blüten und einem Pilz – er wächst weiter
  tro_moosgrimm: (p) => {
    const G = P.green, F = P.forest, L = LICHEN;
    for (const [x, y, r] of [[6, 8, 5], [18, 8, 5], [12, 8, 5], [8, 14, 5], [16, 14, 5], [12, 19, 4]] as const) p.ball(x, y, r, r, F, 1, 3);
    for (const [x, y, r] of [[5, 7, 3.6], [19, 7, 3.2], [9, 12, 3.8], [15, 12, 3.4], [12, 17, 3.4]] as const) p.ball(x, y, r, r, G, 1, 4);
    p.ball(9, 5.5, 3.6, 2.6, G, 2, 4); p.ball(15, 5.5, 3.6, 2.6, G, 1, 4);
    p.ball(12, 21, 2.6, 2.2, G, 1, 4); tube(p, bez([11, 8], [7, 4], [2, 8], 10), 1.7, 0.6, L, 1); tube(p, bez([13, 8], [17, 4], [22, 8], 10), 1.7, 0.6, L, 1); p.rect(10, 9, 4, 2, P.forest[0]); p.rect(11, 10, 2, 1, P.wood[0]);
    for (const [x, y0, y1] of [[3, 10, 16], [21, 10, 15], [14, 19, 23], [9, 20, 22], [6, 16, 19], [18, 17, 20]] as const) { p.line(x, y0, x, y1, L[2]); p.set(x, y1, L[4]); p.set(x, y0, L[1]); }
    p.px([7, 10, 17, 11, 11, 15], WHITE); p.px([7, 11, 6, 10, 8, 10, 17, 12, 16, 11, 18, 11, 11, 16, 10, 15, 12, 15], P.pink[4]); p.px([7, 10, 17, 11, 11, 15], P.gold[4]);
    p.rect(14, 15, 3, 1, P.red[2]); p.set(15, 14, P.red[3]); p.set(15, 16, P.cream[4]);
    p.line(21, 5, 22, 2, G[3]); p.px([23, 2, 21, 1], G[4]);
  },
  // Aschenmauls Reißzahn: unterarmlanger, rußgrauer Zahn – die hohle Wurzel und die Risse glühen noch
  tro_aschenmaul: (p) => {
    const K: Ramp = [P.ash[1], P.ash[3], P.ash[4], mix(P.ash[4], P.bone[2], 0.6), P.bone[3]], F = P.fire;
    tube(p, bez([10, 5], [9, 15], [18, 22], 22), 5.2, 0.6, K, 1);
    p.ell(10, 4, 5.6, 2.8, K[1]); p.ell(10, 4, 4.4, 1.9, F[1]); p.ell(9.6, 3.8, 3, 1.2, F[2]); p.px([8, 3, 9, 3, 9, 4], F[3]);
    p.line(9, 8, 11, 12, F[2]); p.line(11, 12, 13, 15, F[1]); p.px([12, 9, 13, 11], F[2]); p.px([14, 17, 15, 19], F[1]); p.set(11, 12, F[3]);
    p.px([5, 7, 5, 9, 5, 11, 6, 13, 7, 15, 8, 17], K[4]); p.px([14, 13, 15, 15, 16, 18], K[0]);
    p.px([18, 8, 20, 12, 3, 16], K[2]); p.px([19, 6, 4, 19], F[2]);
  },
  // Marschbefehl ohne Absender (Feldwebel Niemand): gefalteter Befehl, violettes Wachssiegel, gesprungen
  tro_niemand: (p) => {
    const C = P.cream, V = P.violet;
    p.poly([[2, 6], [21, 4], [22, 19], [3, 21]], C[3]);
    p.poly([[2, 6], [21, 4], [12, 13]], C[4]); p.poly([[21, 4], [22, 19], [12, 13]], C[2]);
    p.line(2, 6, 12, 13, C[1]); p.line(21, 4, 12, 13, C[1]); p.line(3, 21, 11, 14, C[2]); p.line(22, 19, 13, 14, C[1]);
    p.rect(4, 20, 17, 1, C[1]);
    p.px([5, 17, 18, 8, 7, 9, 19, 16], C[2]); p.px([4, 8, 5, 8, 6, 9], WHITE);
    p.ell(12, 13.4, 4.2, 4.2, V[0]); p.ball(12, 13, 3.6, 3.6, V, 1, 4);
    p.px([11, 10, 11, 11, 12, 12, 12, 13, 13, 14, 13, 15, 13, 16], V[0]); p.px([10, 12, 10, 13], WHITE);
    p.px([16, 14, 17, 15, 8, 16, 7, 17], V[1]);
    p.set(2, 6, 0); p.set(22, 19, 0); p.px([21, 11, 3, 14], C[1]);
  },
};

// ================================================================ Schatzkarten: ein gefaltetes Blatt, je Region Papier, Tinte und Zeichen
const tmap = (paper: Ramp, ink: number, cross: number, deco: Fn): Fn => (p) => {
  // dreifach gefalzt (Leporello); paper: [Falzschatten, Schattenfeld, Feld, helles Feld, Lichtkante]
  p.poly([[2, 5], [9, 3], [9, 19], [2, 21]], paper[3]);
  p.poly([[9, 3], [16, 5], [16, 21], [9, 19]], paper[1]);
  p.poly([[16, 5], [22, 3], [22, 19], [16, 21]], paper[2]);
  p.line(2, 6, 2, 20, paper[4]); p.line(3, 5, 8, 4, paper[4]); p.line(16, 6, 16, 20, paper[4]); p.line(9, 4, 9, 18, paper[0]);
  p.line(3, 20, 8, 19, paper[2]); p.line(10, 19, 15, 20, paper[0]); p.line(17, 20, 21, 19, paper[1]);
  // Weg (gestrichelt) über alle drei Felder, am Ende das Kreuz
  p.px([4, 17, 5, 16, 7, 15, 8, 15, 10, 16, 11, 17, 13, 17, 14, 16, 17, 14, 18, 13, 19, 11], ink);
  p.px([18, 6, 19, 7, 20, 8, 20, 6, 18, 8], cross);
  deco(p);
};
const MAPS: Record<string, Fn> = {
  // Birkenrinde, Kohlestrich; der Zeichner konnte Bäume
  tmap_gruenwald: tmap([P.cream[1], P.cream[2], P.cream[3], P.cream[4], WHITE], P.ash[2], P.red[2], (p) => {
    p.px([3, 14, 4, 14, 12, 7, 13, 7, 18, 17, 19, 17, 11, 12, 12, 12, 6, 18], P.cream[0]);
    p.poly([[5.5, 5.5], [8.5, 12], [2.5, 12]], P.green[2]); p.poly([[5.5, 5.5], [5.5, 12], [2.5, 12]], P.green[3]); p.px([5, 12, 5, 13], P.wood[1]);
    p.px([12, 10, 13, 9, 14, 10], P.green[2]); p.set(13, 10, P.wood[1]);
  }),
  // Grubenskizze auf grauem Papier, Kristallzeichen, Stollenstriche
  tmap_kristall: tmap([P.steel[1], P.steel[2], mix(P.steel[3], P.stone[3], 0.4), P.steel[3], P.steel[4]], P.blue[1], P.red[2], (p) => {
    crystal(p, 5, 12, 5, 6, 2, P.teal); crystal(p, 7.5, 12, 8, 9, 1.1, P.pink);
    p.px([11, 8, 12, 8, 13, 9, 13, 10, 14, 11], P.blue[1]); p.px([11, 13, 12, 13], P.blue[1]); p.px([20, 16, 19, 17], P.teal[3]);
  }),
  // auf Leder gebrannt, Ecke verkohlt
  tmap_glut: tmap([P.wood[1], P.tan[1], P.tan[2], P.tan[3], P.tan[4]], P.wood[0], P.red[1], (p) => {
    p.poly([[3, 12], [3, 10], [5.5, 6], [8, 10], [8, 12]], P.fire[1]); p.poly([[4.5, 12], [5.5, 9], [7, 12]], P.fire[3]);
    p.poly([[18, 20.5], [22, 16], [22, 19]], P.ash[1]); p.px([17, 20, 21, 15, 20, 17], P.ash[2]); p.px([19, 18, 21, 17], P.fire[2]);
    p.px([11, 8, 12, 9, 13, 8, 12, 12], P.wood[1]); p.set(22, 19, 0); p.set(21, 19, 0);
  }),
  // steif gefroren, das Kreuz eingeritzt
  tmap_frost: tmap([P.ice[0], P.ice[1], P.ice[2], P.ice[3], P.ice[4]], P.blue[1], P.blue[0], (p) => {
    p.poly([[2.5, 12], [5.5, 6], [8.5, 12]], P.blue[2]); p.poly([[4.5, 8], [5.5, 6], [6.5, 8], [5.5, 9]], WHITE);
    p.px([2, 5, 3, 5, 2, 6, 20, 18, 21, 18, 21, 17, 21, 4, 20, 4, 10, 4, 15, 19, 14, 20], WHITE); p.px([12, 9, 13, 11, 11, 12], P.ice[3]);
  }),
  // saubere Kanzleischrift, Säulenzeichen, rotes Aktenfähnchen
  tmap_ruinen: tmap([P.sand[1], P.sand[2], P.sand[3], P.sand[4], mix(P.sand[4], WHITE, 0.5)], P.wood[1], P.red[2], (p) => {
    p.rect(4, 7, 3, 5, P.gold[2]); p.rect(4, 7, 1, 5, P.gold[4]); p.rect(3, 6, 5, 1, P.gold[3]); p.rect(3, 12, 5, 1, P.gold[1]);
    p.rect(10, 7, 5, 1, P.sand[0]); p.rect(10, 9, 4, 1, P.sand[0]); p.rect(10, 11, 5, 1, P.sand[0]); p.rect(10, 13, 3, 1, P.sand[0]);
    p.rect(21, 11, 2, 4, P.red[2]); p.set(21, 11, P.red[3]); p.set(22, 14, P.red[1]);
  }),
  // dunkles Blatt, Linien wandern – nur das Kreuz bleibt
  tmap_schatten: tmap([P.shadow[1], P.violet[0], P.violet[1], P.violet[2], P.violet[3]], P.pink[3], WHITE, (p) => {
    p.ell(5.5, 9, 2.8, 2.8, P.violet[4]); p.ell(6.6, 8.2, 2.3, 2.3, P.violet[2]); p.set(3, 9, WHITE);
    p.px([11, 8, 12, 9, 13, 9, 14, 8, 11, 12, 12, 13, 13, 12], P.violet[3]); p.px([19, 16, 20, 15, 6, 18], P.pink[2]);
  }),
};
// ================================================================ Speisen und Elixiere (Sternsplitter- und Fraktionsrezepte)
const NIGHT: Ramp = [P.shadow[1], P.blue[0], mix(P.blue[1], P.violet[1], 0.5), mix(P.blue[2], P.violet[2], 0.45), mix(P.blue[3], P.violet[3], 0.4)];
const STEW: Ramp = [P.wood[0], P.wood[1], mix(P.wood[2], P.red[1], 0.3), mix(P.wood[3], P.fire[1], 0.3), P.tan[3]];
const CONSUMABLES: Record<string, Fn> = {
  // Elixier der klaren Nacht: Sternenlicht im Kolben
  elx_stern: (p) => { flask(NIGHT, 'star')(p); p.px([8, 20, 16, 19, 17, 16], P.ice[3]); p.px([6, 20, 15, 14], P.violet[4]); },
  // Tinte der Gesellschaft: Tintenfass mit Etikett, die Feder steckt noch darin
  elx_gelehrt: (p) => {
    const K: Ramp = [P.shadow[0], P.shadow[1], P.blue[0], P.blue[1], P.blue[2]], C = P.cream;
    p.poly([[12, 9], [14, 3], [20, 0], [22, 2], [19, 7], [14, 10]], C[4]); p.poly([[14, 10], [22, 2], [19, 7]], C[2]);
    p.line(11, 11, 21, 1, C[1]); p.px([16, 3, 18, 2, 15, 6, 20, 5, 18, 7], C[2]); p.px([15, 4, 17, 2], WHITE);
    p.rect(8, 9, 7, 3, P.ice[3]); p.rect(8, 9, 2, 3, P.ice[4]); p.rect(7, 8, 9, 1, P.ice[4]);
    p.poly([[8, 12], [15, 12], [20, 15], [20, 21], [18, 23], [5, 23], [3, 21], [3, 15]], P.ice[3]);
    p.poly([[4, 15], [19, 15], [19, 21], [18, 22], [5, 22], [4, 21]], K[2]);
    p.rect(4, 15, 3, 7, K[3]); p.rect(17, 15, 2, 7, K[1]); p.rect(4, 14, 15, 1, K[4]);
    p.rect(8, 16, 8, 5, C[4]); p.rect(15, 16, 1, 5, C[2]); p.px([9, 17, 10, 17, 11, 17, 13, 17, 9, 19, 10, 19, 12, 19, 13, 19], K[2]);
    p.px([4, 13, 5, 12, 5, 16, 5, 17], WHITE);
  },
  // Laternenöl: tropfenförmiges Fläschchen im Indigo der Wacht, verblichenes Goldband, innen ein kleines blasses Licht
  elx_laterne: (p) => {
    const N: Ramp = [P.shadow[1], P.violet[0], mix(P.violet[1], P.blue[1], 0.5), mix(P.violet[2], P.blue[2], 0.45), P.violet[3]], Y = P.gold, L = mix(P.gold[4], WHITE, 0.6);
    p.rect(11, 0, 3, 3, P.tan[2]); p.rect(11, 0, 2, 1, P.tan[4]); p.set(13, 2, P.tan[1]);
    p.rect(10, 3, 5, 6, N[2]); p.rect(10, 3, 1, 6, N[3]); p.rect(14, 3, 1, 6, N[1]);
    p.rect(9, 5, 7, 2, Y[2]); p.rect(9, 5, 3, 1, Y[3]); p.rect(14, 6, 2, 1, Y[1]);
    p.px([16, 4, 17, 4, 18, 5, 19, 6, 20, 7, 20, 8, 20, 9, 19, 10, 18, 11], Y[2]); p.px([17, 4, 18, 5], Y[3]); p.px([20, 9, 19, 10], Y[1]);
    egg(p, 12, 15, 7.4, 7.4, N, 0, 4);
    p.rect(7, 21, 10, 1, N[1]); p.rect(6, 22, 12, 1, Y[1]); p.rect(6, 22, 5, 1, Y[2]);
    p.ell(12, 16, 4.6, 3.8, mix(P.gold[2], P.violet[1], 0.4)); p.ell(12, 16, 3.8, 3, mix(P.gold[3], P.cream[4], 0.5)); p.ell(12, 16, 2.6, 2, L); p.ell(11.5, 15.6, 1.3, 1, WHITE);
    p.px([6, 12, 6, 13, 5, 15], P.violet[4]);
  },
  // Grubenlicht: Grubenlampe als Flasche – Glaszylinder im Schutzkorb, Tragering
  elx_grube: (p) => {
    const S = P.steel, Y = P.gold;
    p.ell(12, 3.5, 3.4, 3.4, S[2]); p.ell(12, 3.5, 1.7, 1.7, 0); p.px([10, 1, 9, 2], S[4]);
    p.rect(9, 5, 6, 1, S[3]); p.rect(7, 6, 10, 3, S[2]); p.rect(7, 6, 5, 1, S[4]); p.rect(15, 7, 2, 2, S[1]);
    p.rect(7, 9, 10, 10, Y[3]); p.rect(7, 9, 3, 10, Y[4]); p.rect(15, 9, 2, 10, Y[2]); p.rect(7, 9, 10, 1, mix(Y[4], WHITE, 0.5));
    p.ell(12, 14, 2.4, 3.4, mix(Y[4], WHITE, 0.7)); p.ell(12, 14.5, 1.2, 2, WHITE);
    p.rect(6, 9, 1, 10, S[1]); p.rect(17, 9, 1, 10, S[0]); p.rect(9, 9, 1, 10, S[2]); p.rect(14, 9, 1, 10, S[1]); p.rect(6, 13, 12, 1, S[2]); p.set(6, 13, S[4]);
    p.rect(6, 19, 12, 3, S[2]); p.rect(6, 19, 6, 1, S[4]); p.rect(15, 20, 3, 2, S[1]); p.rect(5, 22, 14, 1, S[1]); p.rect(5, 22, 4, 1, S[3]);
  },
  // Elixier der Sieben: sieben Schichten in einer Flasche – eine je Stimme
  elx_sieben: (p) => {
    const Y = P.gold, MARKER = 1;
    const base = [P.steel[4], P.fire[2], P.gold[3], P.green[3], P.teal[3], P.blue[3], P.violet[3]];
    const dark = [P.steel[2], P.fire[1], P.gold[2], P.green[2], P.teal[2], P.blue[2], P.violet[2]];
    const lite = [WHITE, P.fire[3], P.gold[4], P.green[4], P.teal[4], P.blue[4], P.violet[4]];
    p.poly([[12, 0], [15, 2], [12, 4], [9, 2]], Y[3]); p.poly([[12, 0], [12, 4], [9, 2]], Y[4]);
    p.rect(10, 4, 4, 3, P.ice[3]); p.rect(10, 4, 1, 3, P.ice[4]);
    p.poly([[9, 8], [15, 8], [19, 11], [19, 20], [17, 22], [7, 22], [5, 20], [5, 11]], MARKER);
    for (let y = 8; y < 22; y++) {
      const i = (y - 8) >> 1; let x0 = 4, x1 = 20;
      while (x0 < 20 && p.get(x0, y) !== MARKER) x0++;
      while (x1 > 4 && p.get(x1, y) !== MARKER) x1--;
      for (let x = x0; x <= x1; x++) p.set(x, y, x < x0 + 2 ? lite[i] : x > x1 - 2 ? dark[i] : base[i]);
    }
    p.rect(9, 6, 6, 2, Y[3]); p.rect(9, 6, 3, 1, Y[4]); p.rect(13, 7, 2, 1, Y[1]);
    p.px([7, 11, 7, 12, 7, 14, 7, 15], WHITE);
  },
  // Sternschnuppen-Kompott: dunkles Kompott mit Sternfrüchten im Glaskelch – es knistert
  food_stern: (p) => {
    const G = P.ice, N = NIGHT, Y = P.gold;
    p.line(16, 8, 21, 2, P.steel[3], 2); p.set(21, 2, P.steel[4]);
    p.ell(12, 21.6, 6, 1.6, G[2]); p.ell(11.5, 21.2, 4, 0.9, G[4]); p.rect(11, 17, 2, 4, G[3]); p.set(11, 17, G[4]);
    p.poly([[2, 8], [22, 8], [20, 14], [16, 18], [8, 18], [4, 14]], G[3]);
    p.poly([[4, 10], [20, 10], [19, 14], [15, 17], [9, 17], [5, 14]], N[2]);
    p.poly([[4, 10], [8, 10], [10, 17], [9, 17], [5, 14]], N[3]); p.poly([[17, 10], [20, 10], [19, 14], [15, 17], [14, 17]], N[1]);
    p.ell(12, 8.5, 10.2, 2.6, G[2]); p.ell(12, 8.5, 8.8, 1.8, N[2]); p.ell(11, 8.2, 6, 1, N[3]);
    p.px([8, 7, 7, 8, 9, 8, 8, 9], Y[3]); p.set(8, 8, Y[4]); p.px([14, 8, 13, 9, 15, 9], Y[3]); p.set(14, 9, Y[4]);
    p.px([9, 13, 14, 12, 12, 15], Y[2]); p.px([10, 13, 9, 12, 14, 13], Y[1]); p.px([16, 13, 7, 12], N[4]);
    p.px([3, 9, 4, 11, 5, 13], WHITE); p.set(19, 12, G[4]); p.set(3, 8, G[4]);
  },
  // Mireldas Brunnenkresse-Suppe: Steingutschale mit blauem Streifen, grüne Suppe, Kresse und ein Klecks Sahne
  food_kresse: (p) => {
    const C = P.cream, G = P.green, S = P.steel;
    p.line(16, 9, 21, 2, S[3], 2); p.line(17, 9, 22, 2, S[2]); p.set(21, 2, S[4]);
    p.poly([[2, 12], [22, 12], [20, 18], [16, 22], [8, 22], [4, 18]], C[3]);
    p.poly([[2, 12], [7, 12], [9, 22], [8, 22], [4, 18]], C[4]); p.poly([[18, 12], [22, 12], [20, 18], [16, 22], [15, 22], [17, 17]], C[2]);
    p.rect(4, 16, 16, 1, P.blue[2]); p.rect(4, 16, 4, 1, P.blue[3]); p.rect(17, 16, 3, 1, P.blue[1]); p.rect(8, 21, 8, 1, C[1]);
    p.ell(12, 12, 10.4, 3, C[4]); p.ell(12, 12, 9, 2.2, G[1]); p.ell(12, 11.4, 8, 2.6, G[2]); p.ell(10.5, 10.8, 5, 1.6, G[3]);
    p.px([7, 11, 8, 10, 9, 10, 10, 11, 11, 12, 12, 12], C[4]); p.set(9, 11, C[3]);
    p.px([14, 9, 15, 8, 16, 10, 13, 10, 5, 11, 6, 10], G[4]); p.px([15, 9, 15, 10, 14, 10], G[3]); p.px([17, 11, 4, 12], G[1]);
    p.px([3, 11, 4, 10, 5, 10], WHITE);
  },
  // Aschenfladen: drei dünne Fladen aus der Glut, Brandblasen, mit Asche bestäubt
  food_fladen: (p) => {
    const T = P.tan, A = P.ash;
    const fl = (cx: number, cy: number, rx: number): void => { p.ell(cx, cy + 1.8, rx, 3.4, T[1]); p.ell(cx, cy + 0.8, rx, 3.4, T[2]); p.ell(cx, cy, rx, 3.2, T[3]); };
    fl(12.5, 17, 10.6); p.px([4, 19, 8, 21, 14, 21, 20, 19], P.wood[1]);
    fl(11.5, 13.5, 10.2); p.px([3, 15, 7, 17, 13, 18, 19, 16], P.wood[1]);
    fl(12, 10, 10.6); p.ell(11, 9.4, 7.6, 1.9, T[4]);
    p.ell(7.5, 9.6, 1.7, 0.9, P.wood[2]); p.ell(14.5, 9, 1.9, 1, P.wood[2]); p.ell(17.5, 11.2, 1.4, 0.8, P.wood[1]); p.ell(10.5, 11.6, 1.4, 0.7, P.wood[2]); p.px([7, 9, 14, 9], A[2]);
    p.px([5, 9, 10, 8, 12, 10, 16, 10, 19, 10, 9, 11, 4, 11, 13, 12], P.stone[3]); p.px([11, 9, 17, 9, 6, 11], P.stone[4]);
    p.rect(0, 20, 3, 3, A[2]); p.set(0, 20, A[4]); p.rect(21, 21, 3, 2, A[2]); p.set(21, 21, A[3]);
    p.px([1, 21, 22, 22], P.fire[2]); p.set(2, 22, P.fire[3]);
  },
  // Ingas Wetteinsatz: Jagdeintopf im Holznapf, ein Knochen ragt heraus – daneben liegt der Einsatz
  food_wette: (p) => {
    const W = P.wood, B = P.bone;
    p.line(12, 9, 16, 4, B[2], 3); p.line(12, 9, 16, 4, B[3], 2); p.rect(16, 1, 2, 3, B[4]); p.rect(18, 3, 3, 2, B[3]); p.set(18, 2, B[4]); p.set(17, 4, B[4]);
    p.poly([[1, 11], [19, 11], [17, 17], [14, 21], [6, 21], [3, 17]], W[2]);
    p.poly([[1, 11], [5, 11], [7, 21], [6, 21], [3, 17]], W[3]); p.poly([[15, 11], [19, 11], [17, 17], [14, 21], [13, 21], [15, 16]], W[1]);
    p.line(6, 14, 7, 19, W[1]); p.line(10, 14, 10, 20, W[1]); p.px([3, 13, 4, 15], W[4]); p.rect(6, 21, 8, 1, W[0]);
    p.ell(10, 11, 9.4, 3, W[3]); p.ell(10, 11, 8.2, 2.2, STEW[1]); p.ell(10, 10.4, 7, 2.4, STEW[2]); p.ell(9, 10, 4.4, 1.4, STEW[3]);
    p.rect(5, 9, 2, 2, P.fire[2]); p.set(5, 9, P.fire[3]); p.rect(8, 11, 2, 2, STEW[4]); p.set(15, 11, P.fire[2]); p.px([7, 9, 11, 10], P.green[3]);
    p.px([2, 10, 3, 9, 4, 9], W[4]);
    coin(p, 19.5, 20.5); coin(p, 18, 17.5);
  },
};

// ================================================================ Unikat-Schmuck (Fraktionen und fahrende Händlerin)
const COPPER: Ramp = [P.wood[0], mix(P.red[1], P.wood[2], 0.5), mix(P.red[2], P.gold[2], 0.5), mix(P.red[3], P.gold[3], 0.55), mix(P.red[4], P.gold[4], 0.6)];
const UNIQUES: Record<string, Fn> = {
  // Brunnenmünze (Quellhain): alte Goldmünze mit Tropfenprägung, Grünspan und Moos vom Brunnengrund
  uq_brunnenmuenze: (p) => {
    const Y = P.gold, G = P.green, T = P.teal;
    cord(p, 12, 5);
    p.ell(12, 14.4, 9, 9, Y[1]); p.ball(12, 14, 8.6, 8.6, Y, 1, 4);
    for (let a = 0; a < 6.3; a += 0.05) { const lit = -(Math.cos(a) * 0.5 + Math.sin(a) * 0.7); p.set(12 + Math.cos(a) * 6.6, 14 + Math.sin(a) * 6.6, lit > 0.2 ? Y[2] : Y[1]); }
    p.set(12, 7, P.gold[0]); p.set(12, 6, P.red[2]);
    p.poly([[12, 10], [15, 15], [12, 18], [9, 15]], T[2]); p.ell(12, 15.4, 3, 3, T[2]); p.poly([[12, 10.5], [12, 17], [9.5, 15]], T[3]); p.px([11, 14, 10, 15], WHITE); p.px([13, 17, 14, 16], T[1]);
    p.px([4, 16, 5, 18, 5, 19, 6, 20, 7, 21, 8, 21, 4, 17], G[2]); p.px([5, 17, 6, 19, 7, 20], G[4]); p.px([17, 20, 18, 19, 19, 17], T[1]);
    p.px([21, 21, 21, 22], T[4]);
  },
  // Schichtmarke (Kumpel): Eisenring mit Messingmarke – Schlägel und Eisen, darunter die Schichtnummer
  uq_schichtmarke: (p) => {
    const S = P.steel, Y = P.gold, D = P.wood[0];
    band(p, 12, 16.5, 6.8, 4.4, S);
    p.rrect(5, 1, 14, 10, Y[2]); p.rect(6, 1, 12, 1, Y[4]); p.rect(5, 2, 1, 8, Y[3]); p.rect(18, 2, 1, 8, Y[1]); p.rect(6, 10, 12, 1, Y[1]);
    p.set(7, 3, D); p.set(16, 3, D);
    p.line(8, 4, 11, 8, D); p.line(11, 4, 8, 8, D); p.px([7, 4, 12, 4], Y[4]);
    p.px([14, 5, 14, 6, 14, 7, 14, 8, 16, 5, 16, 6, 16, 7, 16, 8], D); p.px([13, 5, 15, 5], Y[4]);
  },
  // Feuerstein der Sippe (Aschennomaden): muschelig gebrochener Feuerstein, Schlageisen, ein Funke
  uq_feuerstein: (p) => {
    const S: Ramp = [P.steel[0], P.steel[1], mix(P.steel[2], P.stone[2], 0.5), P.stone[3], P.steel[4]], F = P.fire;
    cord(p, 8, 5);
    p.poly([[3, 12], [7, 5], [13, 6], [16, 11], [14, 19], [8, 22], [3, 18]], S[2]);
    p.poly([[3, 12], [7, 5], [10, 9], [7, 14]], S[3]); p.poly([[7, 5], [13, 6], [10, 9]], S[4]);
    p.poly([[12, 14], [16, 11], [14, 19], [8, 22], [10, 18]], S[1]); p.poly([[14, 19], [8, 22], [10, 18]], S[0]);
    p.line(7, 14, 10, 9, S[4]); p.px([5, 15, 6, 17, 8, 18, 5, 13], S[1]); p.px([5, 10, 6, 8], WHITE);
    for (let a = -1.25; a <= 1.25; a += 0.05) { const x = Math.round(16.5 + Math.cos(a) * 5), y = Math.round(15 + Math.sin(a) * 6.6); p.rect(x, y, 2, 2, a < -0.3 ? P.steel[4] : a < 0.6 ? P.steel[3] : P.steel[2]); }
    p.px([19, 21, 20, 20], P.steel[1]); p.px([17, 5, 19, 3, 21, 6, 15, 3], F[3]); p.set(18, 4, F[4]); p.set(20, 8, F[2]);
  },
  // Ingas Wettschein (Fellhändler): Zettel am Lederband, Wolfszahn, rotes Siegel
  uq_wettschein: (p) => {
    const L = P.wood, C = P.cream;
    chain(p, L[3], L[2], 11);
    p.poly([[4, 10], [7, 11], [4, 16]], P.bone[3]); p.set(5, 11, P.bone[4]); p.set(4, 15, P.bone[2]);
    p.poly([[8, 10], [18, 11], [17, 22], [7, 21]], C[4]); p.poly([[15, 11], [18, 11], [17, 22], [14, 22]], C[3]);
    p.set(12, 12, L[0]); p.line(9, 14, 15, 15, L[1]); p.line(9, 16, 14, 17, L[1]); p.line(9, 18, 11, 18, L[1]);
    p.ell(15, 19.5, 2, 2, P.red[2]); p.set(14, 18, P.red[4]); p.set(16, 20, P.red[1]);
    p.px([7, 21, 8, 21], C[2]); p.set(18, 11, 0);
  },
  // Fundnummer 4 471 (Gelehrte Gesellschaft): bemalte Tonscherbe mit angebundenem Fundzettel
  uq_fundnummer: (p) => {
    const T: Ramp = [P.wood[0], P.wood[1], mix(P.red[2], P.tan[1], 0.55), mix(P.red[3], P.tan[2], 0.5), P.tan[3]], C = P.cream;
    cord(p, 9, 4);
    p.poly([[3, 8], [9, 4], [15, 6], [18, 11], [15, 16], [9, 18], [4, 15]], T[2]);
    p.poly([[3, 8], [9, 4], [11, 8], [6, 12]], T[3]); p.poly([[9, 4], [15, 6], [11, 8]], T[4]); p.poly([[13, 12], [18, 11], [15, 16], [9, 18], [10, 15]], T[1]);
    p.line(4, 11, 17, 9, P.blue[2]); p.line(4, 12, 17, 10, C[3]); p.px([6, 13, 8, 12, 10, 12, 12, 11, 14, 11], P.blue[1]);
    p.px([5, 7, 6, 6], WHITE);
    p.line(13, 14, 15, 16, P.tan[4]);
    p.poly([[13, 16], [22, 15], [23, 22], [14, 23]], C[4]); p.poly([[20, 15], [22, 15], [23, 22], [21, 22]], C[3]); p.set(15, 17, P.wood[1]);
    p.px([15, 19, 15, 20, 16, 20, 16, 21, 16, 19, 18, 19, 18, 20, 18, 21, 20, 19, 20, 20, 20, 21, 19, 19, 22, 20, 22, 21], P.wood[0]);
  },
  // Docht vom Letzten Licht: Glasröhrchen mit Goldkappen an goldener Kette, darin ein Docht mit blasser Flamme
  uq_docht: (p) => {
    const Y = P.gold, G = P.ice, L = mix(P.gold[4], WHITE, 0.6), N = P.violet;
    chain(p, Y[3], Y[1], 9);
    p.rect(11, 7, 2, 2, Y[2]); p.rect(8, 9, 8, 2, Y[3]); p.rect(8, 9, 4, 1, Y[4]); p.rect(14, 10, 2, 1, Y[1]);
    p.rect(8, 11, 8, 10, mix(N[1], P.blue[1], 0.5)); p.rect(8, 11, 1, 10, G[3]); p.rect(15, 11, 1, 10, G[1]); p.rect(9, 12, 1, 8, mix(N[2], G[2], 0.5));
    p.rect(12, 16, 1, 5, P.cream[1]); p.set(12, 17, P.wood[0]);
    p.poly([[12.5, 11], [14.6, 14.5], [12.5, 16.6], [10.4, 14.5]], P.gold[3]); p.poly([[12.5, 12], [13.6, 14.5], [12.5, 16], [11.4, 14.5]], L); p.px([12, 14, 12, 15], WHITE);
    p.rect(8, 21, 8, 2, Y[2]); p.rect(8, 21, 4, 1, Y[3]); p.rect(10, 23, 4, 1, Y[1]);
  },
  // Kompass der Umwege (fahrende Händlerin): Messingkompass, die Nadel nimmt nicht den geraden Weg
  uq_kompass: (p) => {
    const Y = P.gold, C = P.cream;
    p.ell(12, 2.6, 2.6, 2.6, Y[2]); p.ell(12, 2.6, 1.2, 1.2, 0); p.set(11, 1, Y[4]);
    p.ell(12, 14.4, 9.4, 9.2, Y[1]); p.ball(12, 14, 9, 9, Y, 1, 4);
    p.ell(12, 14, 6.8, 6.8, Y[1]); p.ell(12, 14, 6, 6, C[3]); p.ell(11.4, 13.4, 5, 5, C[4]);
    p.px([12, 9, 12, 19, 7, 14, 17, 14], P.wood[1]); p.px([9, 11, 15, 11, 9, 17, 15, 17], C[2]);
    p.px([8, 17, 9, 17, 10, 16, 11, 16, 11, 15], P.steel[1]);
    p.px([13, 14, 14, 13, 13, 12, 13, 11, 14, 10, 15, 10], P.red[2]); p.px([16, 10, 15, 9, 15, 11], P.red[1]);
    p.set(12, 14, Y[3]); p.px([5, 9, 6, 8, 7, 7], WHITE);
  },
  // Vesnas Glückspfennig: Kupferpfennig mit Kleeblatt als Ringkopf
  uq_pfennig: (p) => {
    const K = COPPER, Y = P.gold;
    band(p, 12, 16.5, 6.8, 4.4, Y);
    p.ell(12, 7.4, 6.2, 6.2, K[1]); p.ball(12, 7, 5.8, 5.8, K, 1, 4);
    p.rect(10, 4, 2, 2, P.green[3]); p.rect(13, 4, 2, 2, P.green[2]); p.rect(10, 7, 2, 2, P.green[2]); p.rect(13, 7, 2, 2, P.green[1]);
    p.set(10, 4, P.green[4]); p.set(12, 6, P.green[1]); p.px([12, 9, 13, 10], P.green[1]);
    p.px([8, 4, 9, 3], WHITE);
  },
};

export const WORLD_ICONS: Record<string, Fn> = { ...MATS, ...TROPHIES, ...MAPS, ...CONSUMABLES, ...UNIQUES };

/** Lichtpunkte/Schein nach der Kontur */
export const WORLD_GLOW: Record<string, Fn> = {
  mat_echo: (p) => {
    for (const [dx, a] of [[4, 200], [7, 120], [10, 60]] as const) gline(p, [[13 + dx, 6], [12 + dx, 11], [15 + dx, 16], [11 + dx, 22]], alpha(P.violet[4], a));
    spark(p, 2, 3, P.pink[4]); soft(p, 19, 3, alpha(WHITE, 200));
  },
  mat_star: (p) => { halo(p, 12, 12, 11, P.ice[3], 46); spark(p, 20, 3, P.ice[4], true); soft(p, 3, 3, alpha(WHITE, 220)); soft(p, 2, 20, alpha(P.ice[4], 200)); },
  tro_borkenkoenig: (p) => { soft(p, 2, 23, alpha(P.green[3], 200)); },
  tro_fliegenhut: (p) => { soft(p, 21, 2, INK); soft(p, 20, 1, alpha(P.ice[4], 220)); soft(p, 22, 1, alpha(P.ice[4], 220)); },
  tro_tante_echo: (p) => {
    for (const [r, a] of [[4, 190], [7, 110]] as const) for (let t = 3.3; t < 4.6; t += 0.08) soft(p, 24 + Math.cos(t) * r, 24 + Math.sin(t) * r, alpha(P.violet[4], a));
  },
  tro_guenther: (p) => { spark(p, 21, 18, P.pink[4]); soft(p, 2, 3, alpha(P.teal[4], 220)); },
  tro_meister_russ: (p) => { halo(p, 9, 11, 7, P.fire[2], 50); soft(p, 6, 7, alpha(P.ash[4], 200)); soft(p, 10, 5, alpha(P.ash[3], 200)); soft(p, 8, 3, alpha(P.ash[4], 130)); },
  tro_glucke: (p) => { halo(p, 12, 11, 11.5, P.fire[2], 40); steam(p, 5, 6); steam(p, 19, 7); },
  tro_altvater_reif: (p) => { spark(p, 21, 21, P.ice[4]); soft(p, 2, 20, alpha(WHITE, 220)); soft(p, 4, 22, alpha(P.ice[4], 180)); },
  tro_nordlicht: (p) => { halo(p, 12, 13, 12, P.teal[4], 44); soft(p, 2, 3, alpha(P.teal[4], 220)); soft(p, 21, 2, alpha(P.pink[4], 200)); },
  tro_quill: (p) => { spark(p, 4, 5, P.gold[4]); },
  tro_stunde: (p) => {
    // Zifferblattbogen und der Schatten des Zeigers – eine Stunde zurück
    for (let k = 0; k < 5; k++) { const a = -1.5 + k * 0.42; soft(p, 6.5 + Math.cos(a) * 16.5, 17.5 + Math.sin(a) * 16.5, alpha(P.violet[4], 210)); }
    gline(p, [[11, 15], [21, 11]], alpha(P.violet[3], 150)); soft(p, 22, 11, alpha(P.violet[4], 200));
  },
  tro_hohlprinz: (p) => { halo(p, 12, 9, 7.5, P.violet[4], 40); soft(p, 20, 4, alpha(P.violet[4], 220)); soft(p, 4, 6, alpha(WHITE, 200)); },
  tro_moosgrimm: (p) => { soft(p, 1, 20, alpha(P.green[4], 200)); soft(p, 22, 19, alpha(P.green[3], 180)); },
  tro_aschenmaul: (p) => { halo(p, 10, 4, 6, P.fire[2], 60); soft(p, 21, 17, alpha(P.fire[3], 220)); soft(p, 16, 12, alpha(P.fire[2], 200)); },
  tro_niemand: (p) => { soft(p, 21, 1, alpha(P.violet[4], 200)); soft(p, 1, 22, alpha(P.violet[3], 160)); },
  tmap_kristall: (p) => { spark(p, 3, 2, P.teal[4]); },
  tmap_glut: (p) => { soft(p, 22, 22, alpha(P.fire[3], 220)); soft(p, 23, 19, alpha(P.fire[2], 180)); },
  tmap_frost: (p) => { spark(p, 21, 2, P.ice[4]); soft(p, 1, 21, alpha(WHITE, 200)); },
  tmap_ruinen: (p) => { spark(p, 2, 2, P.gold[4]); },
  tmap_schatten: (p) => { soft(p, 1, 3, alpha(P.pink[4], 200)); soft(p, 22, 22, alpha(P.violet[4], 200)); soft(p, 23, 9, alpha(P.pink[3], 140)); },
  elx_stern: (p) => { spark(p, 19, 5, P.ice[4], true); soft(p, 4, 7, alpha(WHITE, 220)); soft(p, 6, 3, alpha(P.ice[4], 180)); },
  elx_laterne: (p) => { halo(p, 12, 16, 11, mix(P.gold[4], WHITE, 0.5), 40); soft(p, 3, 8, alpha(WHITE, 200)); soft(p, 21, 14, alpha(P.gold[4], 180)); soft(p, 4, 4, alpha(P.violet[4], 160)); },
  elx_grube: (p) => { halo(p, 12, 14, 11, P.gold[4], 50); },
  elx_sieben: (p) => { spark(p, 20, 5, P.gold[4]); soft(p, 3, 6, alpha(P.violet[4], 220)); soft(p, 2, 16, alpha(P.teal[4], 200)); soft(p, 21, 14, alpha(P.fire[3], 200)); },
  elx_gelehrt: (p) => { soft(p, 2, 10, alpha(P.blue[3], 220)); soft(p, 1, 12, alpha(P.blue[2], 160)); },
  food_stern: (p) => { spark(p, 6, 3, P.gold[4]); spark(p, 12, 1, P.ice[4]); soft(p, 9, 5, alpha(WHITE, 220)); soft(p, 15, 4, alpha(P.gold[4], 200)); soft(p, 3, 5, alpha(P.ice[4], 160)); },
  food_kresse: (p) => { steam(p, 8, 7); steam(p, 12, 6); },
  food_fladen: (p) => { steam(p, 7, 5, P.stone[4]); steam(p, 15, 4, P.stone[4]); },
  food_wette: (p) => { steam(p, 6, 6); spark(p, 22, 14, P.gold[4]); },
  uq_brunnenmuenze: (p) => { spark(p, 20, 6, P.gold[4]); soft(p, 3, 9, alpha(P.teal[4], 200)); },
  uq_schichtmarke: (p) => { spark(p, 21, 2, P.gold[4]); },
  uq_feuerstein: (p) => { halo(p, 18, 4, 4.5, P.fire[3], 70); },
  uq_wettschein: (p) => { soft(p, 21, 16, alpha(P.gold[4], 200)); },
  uq_fundnummer: (p) => { spark(p, 20, 3, P.gold[4]); },
  uq_docht: (p) => { halo(p, 12.5, 14, 9, mix(P.gold[4], WHITE, 0.5), 60); },
  uq_kompass: (p) => { spark(p, 21, 5, P.gold[4]); },
  uq_pfennig: (p) => { spark(p, 20, 3, P.gold[4]); soft(p, 3, 5, alpha(P.green[4], 200)); },
};
