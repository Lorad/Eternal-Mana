/**
 * Allgemein – Hof (0.8): Wegweiser zum Hof (`home_sign`, 4 Frames), drei Bauplätze für noch nicht gebaute Ausbauten
 * (`bauplatz_a/b/c`), der Begleiterplatz (`begleiterplatz`) und die dreißig Trophäen-Miniaturen `trophy_<id>` (16×16), die
 * auf dem Kissen des Trophäenständers liegen (`trophy_stand_empty`, siehe cm_home.ts). Die Miniaturen sind verkleinerte
 * Fassungen ihrer Icons (icons_world.ts, icons_home.ts): gleiche Farben, gleiche Silhouette, weniger Einzelheiten.
 *
 * Miniaturen: Standfläche unten Mitte, Motiv zwischen x = 1…14 und y = 1…14; die Kontur liegt bei y = 15.
 * Im Spiel: Bild `trophy_stand_empty` bei (x, y + 8), darüber `trophy_<id>` bei (x, y + 8 − 22) – jeweils Ursprung unten Mitte.
 */
import { Px, bez, crystal, tube } from '../draw';
import type { Pt } from '../draw';
import { Frames, INK, MARK, P, Ramp, WHITE, alpha, anim, boulder, glow, inkOutline, mix, moss, one, part, planks, rings } from './kit';
import { post, rail } from './gw_village';
import { ROOF_RED } from './gw_houses';
import { soil } from './cm_story';
import { INDIGO, PALE, SEVEN, TARNISH, TERRA as TERRA_I } from '../icons_home';

const W = P.wood, S = P.stone, I = P.steel, Y = P.gold, C = P.cream, R = P.red, V = P.violet, T = P.teal, IC = P.ice, G = P.green, F = P.fire, A = P.ash, TN = P.tan, FO = P.forest;
const IRON: Ramp = [P.ash[0], I[0], I[1], I[2], I[3]];
const LICHEN: Ramp = [FO[1], mix(FO[3], IC[1], 0.5), mix(G[3], IC[2], 0.55), mix(G[4], IC[3], 0.5), IC[4]];

// ================================================================ Wegweiser zum Hof
/** Pfosten mit Querarm: rechts hängt ein Schild in Hausform, links eine kleine Laterne. */
function homeSign(p: Px, f: number): void {
  // Sockelsteine und Pfosten
  part(p, (l) => { boulder(l, 10, 37, 6, 4, { seed: 5, facets: 3, cracks: 0 }); boulder(l, 17, 37, 5, 3, { seed: 9, facets: 3, cracks: 0 }); });
  part(p, (l) => {
    post(l, 12, 4, 35, 3); l.rect(11, 3, 5, 1, W[3]); l.rect(12, 2, 3, 1, W[4]); l.set(13, 1, W[3]);
    rail(l, 3, 25, 7, 2); l.set(3, 7, W[4]); l.set(25, 8, W[1]);
    l.line(15, 15, 20, 10, W[2]); l.line(15, 14, 19, 10, W[3]); l.line(11, 13, 8, 10, W[1]);
    l.rect(12, 7, 3, 2, I[2]); l.set(12, 7, I[4]); l.set(13, 8, I[0]);
  });
  moss(p, (x, y) => (y > 30 && x < 15 ? 0.5 : 0), 8);
  // Kettchen
  p.px([18, 9, 18, 10, 24, 9, 24, 10, 6, 9, 6, 10], I[2]); p.px([18, 9, 24, 9, 6, 9], I[3]);
  // Schild in Hausform: Dach, Wand mit leuchtendem Fenster und Tür
  part(p, (l) => {
    l.poly([[17, 15], [26, 15], [26, 24], [17, 24]], MARK); planks(l, 17, 15, 9, 9, { ramp: [TN[0], TN[1], TN[2], TN[3], TN[4]], pw: 3, vertical: true, seed: 4, mark: MARK, worn: 0.2 });
    l.rect(17, 23, 9, 1, TN[1]); l.rect(25, 16, 1, 8, TN[1]);
    l.poly([[21.5, 10], [27.5, 16], [15.5, 16]], ROOF_RED[2]); l.poly([[21.5, 10], [21.5, 16], [15.5, 16]], ROOF_RED[3]);
    l.line(21, 10, 16, 15, ROOF_RED[4]); l.rect(16, 15, 11, 1, ROOF_RED[1]); l.px([19, 13, 21, 14, 23, 13, 24, 14], ROOF_RED[1]);
    l.rect(22, 19, 3, 5, W[1]); l.rect(22, 19, 1, 5, W[2]); l.set(24, 21, Y[4]); l.rect(22, 18, 3, 1, W[0]);
    l.rect(18, 18, 3, 3, Y[3]); l.rect(18, 18, 3, 1, Y[4]); l.set(19, 19, W[1]); l.px([18, 19, 20, 19, 19, 18, 19, 20], mix(Y[2], W[2], 0.4));
  });
  // Laterne
  part(p, (l) => {
    l.rect(4, 11, 5, 1, IRON[3]); l.rect(5, 10, 3, 1, IRON[2]); l.rect(4, 17, 5, 1, IRON[2]); l.rect(5, 18, 3, 1, IRON[1]);
    l.rect(4, 12, 5, 5, Y[3]); l.rect(4, 12, 1, 5, IRON[2]); l.rect(8, 12, 1, 5, IRON[1]);
  });
  const fl = [0, 1, 0, -1][f];
  p.rect(6, 13 - (f === 1 ? 1 : 0), 1, 3, F[4]); p.set(6 + (fl > 0 ? 1 : 0), 12, F[3]); p.set(5 + (fl < 0 ? 0 : 1), 15, F[2]); p.set(7, 15, F[2]); p.set(6, 14, WHITE);
  glow(p, 6.5, 14, 6 + (f & 1), Y[3], 64 + (f === 1 ? 14 : f === 3 ? -8 : 0));
  // Grasbüschel am Fuß
  p.px([7, 36, 8, 35, 20, 35, 21, 36], G[3]); p.px([8, 36, 20, 36], G[2]); p.set(7, 35, G[4]);
}

// ================================================================ Bauplätze
/** Abgestecktes Stück Erde: vier Pflöcke, rot-weiße Schnur, Fähnchen. `fn` legt das Baumaterial hinein. */
function bauplatz(seed: number, fn: (p: Px) => void): (p: Px) => void {
  return (p) => {
    soil(p, 16, 15.5, 15.4, 7.6, seed);
    // Schnur: hinten, Seiten
    const cord = (x0: number, y0: number, x1: number, y1: number): void => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let k = 0; k <= n; k++) p.set(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), (k >> 1) & 1 ? C[4] : R[2]); };
    cord(5, 8, 27, 8); cord(4, 9, 2, 17); cord(28, 9, 30, 17);
    part(p, (l) => { post(l, 3, 5, 11, 2, TN); post(l, 27, 5, 11, 2, TN); });
    fn(p);
    cord(3, 17, 29, 17);
    part(p, (l) => { post(l, 1, 14, 21, 2, TN); post(l, 29, 14, 21, 2, TN); });
    // Fähnchen am vorderen linken Pflock
    part(p, (l) => { l.poly([[3, 12], [8, 13.5], [3, 15]], R[2]); l.line(3, 12, 6, 13, R[3]); });
    p.px([9, 22, 22, 22, 14, 23], mix(G[2], W[2], 0.3));
  };
}
const log = (l: Px, x: number, y: number, r: number, k: number): void => { l.ell(x, y, r, r, W[1]); rings(l, x, y, r - 0.8, r - 0.8, TN, k); };
/** a: Balkenstapel mit Hammer (Bett, Esse) */
const bauA = bauplatz(4, (p) => {
  part(p, (l) => {
    for (const [y, x0, x1, s] of [[16, 8, 25, 1], [12, 9, 24, 2]] as const) { l.rect(x0, y, x1 - x0, 4, MARK); planks(l, x0, y, x1 - x0, 4, { ramp: W, pw: 2, seed: s, mark: MARK, worn: 0.4 }); l.rect(x0, y, x1 - x0, 1, W[4]); l.rect(x0, y + 3, x1 - x0, 1, W[0]); }
    log(l, 8, 18, 2.2, 1); log(l, 9, 14, 2.2, 2); log(l, 25, 18, 2.2, 3); log(l, 24, 14, 2.2, 4);
    l.rect(11, 9, 12, 3, TN[3]); l.rect(11, 9, 12, 1, TN[4]); l.rect(11, 11, 12, 1, TN[1]); l.px([14, 10, 19, 10], TN[2]);
  });
  part(p, (l) => { l.line(18, 8, 22, 3, W[3]); l.line(19, 8, 23, 3, W[1]); l.rect(20, 1, 5, 3, I[2]); l.rect(20, 1, 5, 1, I[4]); l.rect(24, 2, 1, 2, I[1]); });
});
/** b: Sägebock mit Brett, Säge und Nagelkiste (Alchemietisch, Runentisch) */
const bauB = bauplatz(7, (p) => {
  part(p, (l) => {
    // Bock: zwei gekreuzte Beinpaare, Holm
    for (const x of [9, 20]) { l.line(x - 2, 19, x + 2, 10, W[2]); l.line(x - 1, 19, x + 3, 10, W[3]); l.line(x + 4, 19, x, 10, W[1]); l.line(x + 5, 19, x + 1, 10, W[2]); }
    l.rect(7, 11, 18, 2, W[3]); l.rect(7, 11, 18, 1, W[4]);
    l.rect(5, 8, 22, 3, TN[3]); l.rect(5, 8, 22, 1, TN[4]); l.rect(5, 10, 22, 1, TN[1]); l.px([10, 9, 17, 9, 23, 9], TN[2]); l.rect(26, 8, 1, 3, TN[2]);
  });
  // Säge steckt im Brett
  part(p, (l) => { l.poly([[13, 8], [15, 2], [17, 2], [16, 8]], I[3]); l.line(13, 8, 15, 2, I[4]); l.px([16, 4, 16, 6], I[1]); l.rect(14, 0, 4, 2, W[2]); l.rect(14, 0, 4, 1, W[4]); });
  part(p, (l) => { l.rect(22, 15, 6, 5, MARK); planks(l, 22, 15, 6, 5, { ramp: W, pw: 2, seed: 3, mark: MARK }); l.rect(22, 15, 6, 1, W[4]); l.px([23, 14, 25, 14, 26, 13], I[3]); l.set(24, 13, I[4]); });
  p.px([6, 20, 8, 21, 12, 20, 15, 21], TN[3]); p.px([7, 20, 13, 21], TN[4]);
});
/** c: Feldsteine, Mörtelkübel und Kelle, Schaufel im Erdhaufen (Kochstelle) */
const bauC = bauplatz(11, (p) => {
  part(p, (l) => { for (const [x, y, w, h, s] of [[9, 20, 7, 5, 3], [15, 20, 6, 4, 5], [12, 16, 6, 4, 7], [20, 20, 5, 4, 9]] as const) boulder(l, x, y, w, h, { seed: s, facets: 3, cracks: 0 }); });
  // Schaufel
  part(p, (l) => { l.line(24, 13, 26, 2, W[3]); l.line(25, 13, 27, 2, W[1]); l.rect(25, 0, 3, 2, W[2]); l.set(25, 0, W[4]); l.poly([[22, 12], [27, 13], [26, 18], [23, 17]], I[2]); l.line(22, 12, 23, 17, I[4]); l.px([25, 15, 25, 16], I[1]); });
  // Kübel mit Mörtel
  part(p, (l) => { l.poly([[4, 13], [11, 13], [10, 19], [5, 19]], W[2]); l.poly([[4, 13], [6, 13], [6, 19], [5, 19]], W[3]); l.rect(4, 13, 7, 1, S[3]); l.rect(5, 14, 5, 1, S[4]); l.rect(4, 16, 7, 1, I[2]); l.set(4, 16, I[4]); l.line(8, 13, 12, 9, W[3]); l.px([12, 9, 13, 8], I[3]); });
});

// ================================================================ Begleiterplatz
function petPlace(p: Px): void {
  // Sitzstange für die Eule, daran ein Glöckchen
  part(p, (l) => { post(l, 25, 3, 23, 2); rail(l, 20, 31, 3, 2); l.set(20, 3, W[4]); l.rect(24, 23, 4, 1, W[1]); });
  p.px([22, 5, 22, 6], I[2]); p.rect(21, 7, 3, 2, Y[3]); p.set(21, 7, Y[4]); p.set(22, 9, Y[1]);
  p.px([29, 5, 29, 6, 30, 7], C[4]); p.set(29, 7, IC[2]);
  // Weidenkorb mit Decke
  part(p, (l) => {
    for (let y = 9; y < 24; y++) for (let x = 0; x < 24; x++) {
      const u = (x + 0.5 - 11.5) / 11.4, v = (y + 0.5 - 15) / 5.4, v2 = (y + 0.5 - 18) / 5.6;
      const rim = u * u + v * v <= 1, body = u * u + v2 * v2 <= 1 && y >= 15;
      if (!rim && !body) continue;
      const inner = ((x + 0.5 - 11.5) / 9.4) ** 2 + ((y + 0.5 - 15) / 3.8) ** 2 <= 1;
      if (inner) { const chk = ((x >> 1) + (y >> 1)) & 1; l.set(x, y, y < 13 ? (chk ? R[1] : C[2]) : chk ? R[2] : C[3]); continue; }
      const weave = ((x + (y & 1) * 2) % 4 < 2), lit = u < -0.35 ? 1 : u > 0.5 ? -1 : 0;
      l.set(x, y, rim && y < 15 + 3 && !body ? TN[3 + (lit > 0 ? 1 : 0)] : TN[(weave ? 2 : 1) + lit]);
    }
    for (let x = 1; x < 23; x++) { const u = (x + 0.5 - 11.5) / 11.4, y = Math.round(15 + Math.sqrt(Math.max(0, 1 - u * u)) * 5.4 - 0.5); if (l.get(x, y) >>> 24) l.set(x, y, TN[u < 0 ? 4 : 3]); }
    // Deckenfalte und ein Pfotenabdruck als Flicken
    l.px([7, 14, 8, 15, 9, 15, 10, 16, 15, 16, 16, 15], mix(R[1], W[0], 0.4)); l.px([12, 13, 13, 13], C[4]);
  });
  // Napf, Ball, Knochen
  part(p, (l) => { l.poly([[18, 20], [27, 20], [26, 24], [19, 24]], P.blue[2]); l.rect(18, 20, 9, 1, P.blue[3]); l.rect(19, 20, 7, 1, TN[2]); l.px([20, 20, 23, 20], TN[4]); l.rect(25, 21, 2, 3, P.blue[1]); l.set(19, 21, P.blue[4]); l.rect(20, 22, 5, 1, C[4]); });
  part(p, (l) => { l.ball(3.5, 22.5, 2.6, 2.6, T, 1, 4); l.set(3, 21, WHITE); });
  p.px([29, 23, 30, 23, 31, 22], P.bone[3]); p.px([28, 22, 31, 24], P.bone[4]);
}

// ================================================================ Trophäen-Miniaturen (16×16)
type Fn = (p: Px) => void;
const dome = (p: Px, cx: number, cy: number, rx: number, ry: number, r: Ramp, lo: number, hi: number): void => {
  const n = hi - lo + 1;
  for (let y = Math.floor(cy - ry); y < cy; y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, rr = nx * nx + ny * ny;
    if (rr > 1) continue;
    p.set(x, y, r[lo + Math.floor(Math.max(0, Math.min(0.999, 0.5 - (nx * 0.45 + ny * 0.75) * 0.55 - rr * 0.1)) * n)]);
  }
};
const egg = (p: Px, cx: number, cy: number, rx: number, ry: number, r: Ramp, lo: number, hi: number): void => {
  const n = hi - lo + 1;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    const ny = (y + 0.5 - cy) / ry;
    if (Math.abs(ny) > 1) continue;
    const w = rx * Math.sqrt(1 - ny * ny) * (1 + 0.2 * ny);
    for (let x = Math.floor(cx - rx - 2); x <= Math.ceil(cx + rx + 2); x++) {
      const nx = (x + 0.5 - cx) / w;
      if (Math.abs(nx) > 1) continue;
      p.set(x, y, r[lo + Math.floor(Math.max(0, Math.min(0.999, 0.56 - (nx * 0.42 + ny * 0.58) * 0.62 - (nx * nx + ny * ny) * 0.1)) * n)]);
    }
  }
};
const dot = (p: Px, x: number, y: number, c: number, a: number): void => { if (p.get(x, y) >>> 24 === 0) p.set(x, y, alpha(c, a)); };
const VV: Ramp = [P.shadow[1], V[1], V[2], V[3], V[4]];
const CRAB: Ramp = [P.pink[0], mix(P.pink[1], V[2], 0.4), mix(P.pink[2], IC[2], 0.45), mix(P.pink[3], IC[3], 0.5), mix(P.pink[4], WHITE, 0.5)];
const SLAG: Ramp = [A[0], A[2], A[3], A[4], mix(A[4], P.bone[2], 0.5)];
const WARM: Ramp = [R[1], mix(F[1], TN[1], 0.4), mix(F[2], TN[2], 0.45), mix(F[3], TN[3], 0.5), mix(F[4], TN[4], 0.5)];
const BRONZE: Ramp = [W[0], Y[0], Y[1], Y[2], Y[3]];
const HAND: Ramp = [V[0], IC[0], IC[1], IC[2], IC[4]];
const PGOLD: Ramp = [Y[0], Y[1], mix(Y[2], C[3], 0.3), mix(Y[3], C[4], 0.35), mix(Y[4], WHITE, 0.5)];
const FANG: Ramp = [A[1], A[3], A[4], mix(A[4], P.bone[2], 0.6), P.bone[3]];
const VINE: Ramp = [FO[0], FO[1], G[1], G[2], G[3]];
const THORN: Ramp = [W[0], mix(R[0], W[1], 0.5), mix(R[1], W[3], 0.45), mix(R[3], TN[3], 0.55), TN[4]];
const BIRCH: Ramp = [W[0], W[2], TN[2], TN[3], C[4]];
const JAR_IN = mix(P.blue[0], T[0], 0.5);

/** [Zeichnung, Schein nach der Kontur] je Trophäe; Schlüssel = Trophäen-Id (shared/src/data/home.ts) */
const MINIS: Record<string, [Fn, Fn?]> = {
  // ---- Jagdtrophäen
  borkenkoenig: [(p) => {
    p.rect(2, 9, 12, 5, W[2]); p.rect(2, 9, 4, 5, W[3]); p.rect(11, 9, 3, 5, W[1]);
    p.poly([[2, 10], [3, 3], [6, 10]], W[3]); p.poly([[6, 10], [8, 1], [10, 10]], W[2]); p.poly([[6, 10], [8, 1], [8, 10]], W[3]); p.poly([[10, 10], [13, 3], [14, 10]], W[1]);
    p.px([3, 4, 8, 2, 3, 6], W[4]); p.px([4, 11, 8, 12, 12, 11, 9, 6, 6, 12], W[0]); p.rect(2, 13, 12, 1, W[1]);
    p.rect(2, 12, 4, 2, G[2]); p.px([2, 12, 3, 12, 4, 11], G[3]); p.set(3, 11, G[4]);
    p.px([14, 2, 15, 1], G[3]); p.set(14, 3, W[3]);
  }],
  fliegenhut: [(p) => {
    p.rect(6, 9, 4, 5, C[3]); p.rect(6, 9, 1, 5, C[4]); p.rect(9, 10, 1, 4, C[2]); p.rect(5, 13, 6, 1, C[2]);
    dome(p, 8, 10, 7.4, 8.4, R, 1, 4); p.rect(1, 9, 14, 1, R[1]); p.rect(3, 10, 10, 1, C[2]); p.px([4, 10, 7, 10, 10, 10], C[1]);
    p.rect(3, 6, 2, 1, WHITE); p.rect(7, 3, 2, 2, WHITE); p.rect(11, 6, 2, 1, C[4]); p.set(5, 4, WHITE); p.set(10, 8, C[4]); p.set(12, 4, C[4]);
  }],
  tante_echo: [(p) => {
    p.poly([[3, 13], [4, 3], [14, 1], [12, 5], [14, 8], [11, 9], [12, 13], [8, 11], [6, 14]], VV[2]);
    p.poly([[4, 3], [14, 1], [12, 5], [8, 6]], VV[3]); p.poly([[8, 8], [11, 9], [12, 13], [8, 11], [6, 14], [6, 10]], VV[1]);
    p.line(4, 3, 14, 1, VV[4]); p.line(4, 4, 14, 8, VV[4]); p.line(4, 4, 12, 13, VV[3]); p.line(4, 5, 6, 14, VV[3]);
    p.line(2, 14, 4, 3, VV[3]); p.line(3, 13, 4, 4, VV[4]); p.px([3, 2, 4, 1], C[4]); p.px([14, 1, 14, 8, 12, 13], C[3]);
  }],
  guenther: [(p) => {
    tube(p, bez([6, 12], [12, 15], [14, 10], 10), 1.9, 0.6, CRAB, 1);
    tube(p, bez([5, 8], [6, 0], [14, 5], 14), 2.6, 0.7, CRAB, 2);
    p.ball(5, 10.5, 3.8, 3.6, CRAB, 1, 4);
    p.rect(1, 13, 3, 2, T[2]); p.px([1, 13, 2, 13], T[3]); p.set(7, 10, T[3]); p.px([8, 3, 11, 3, 4, 8], WHITE);
  }],
  meister_russ: [(p) => {
    p.line(9, 7, 13, 2, SLAG[2], 2); p.line(9, 7, 13, 2, SLAG[3]); p.px([14, 1, 15, 2], SLAG[2]);
    p.ball(6, 10.6, 5.4, 4.2, SLAG, 0, 4);
    p.ell(6, 8.6, 5, 2, SLAG[1]); p.ell(6, 8.6, 4, 1.3, F[1]); p.ell(5.6, 8.4, 2.8, 0.8, F[2]); p.px([5, 8, 4, 8], F[4]);
    p.px([2, 8, 3, 7, 4, 7], SLAG[4]); p.px([4, 12, 8, 13], SLAG[0]);
  }, (p) => { glow(p, 6, 7, 4.5, F[2], 60); }],
  glucke: [(p) => {
    p.poly([[0, 15], [2, 10], [5, 13], [3, 15]], A[2]); p.poly([[11, 13], [14, 10], [16, 15], [12, 15]], A[1]);
    egg(p, 8, 7.4, 5.2, 6.6, WARM, 0, 4);
    p.px([5, 6, 6, 7, 11, 6, 10, 7], R[0]); p.px([6, 8, 10, 8], INK); p.px([7, 11, 8, 11, 9, 11], R[0]);
    p.poly([[1, 15], [3, 12], [6, 14], [8, 13], [10, 14], [13, 12], [15, 15]], A[2]); p.px([3, 13, 4, 14, 13, 13], A[4]); p.px([7, 14, 11, 14], F[2]);
  }, (p) => { glow(p, 8, 7, 7.5, F[2], 40); }],
  altvater_reif: [(p) => {
    const SN = P.snow;
    p.poly([[2, 5], [14, 5], [15, 8], [13, 11], [12, 10], [10, 14], [8, 12], [6, 15], [5, 10], [3, 12], [1, 8]], SN[2]);
    p.poly([[2, 5], [7, 5], [6, 15], [5, 10], [3, 12], [1, 8]], SN[3]); p.poly([[12, 5], [14, 5], [15, 8], [13, 11], [12, 10]], SN[1]);
    p.px([4, 7, 4, 9, 6, 8, 8, 8, 8, 10, 10, 8, 10, 11, 12, 7], IC[1]); p.px([3, 7, 5, 8], SN[4]);
    p.ell(5, 4, 3.8, 2.2, SN[3]); p.ell(11, 4, 3.8, 2.2, SN[2]); p.ell(4.4, 3.6, 2.4, 1, SN[4]); p.rect(7, 4, 2, 2, SN[1]);
    p.rect(7, 6, 2, 1, P.blue[0]); p.px([6, 14, 10, 13, 3, 11, 13, 10], IC[3]); p.px([1, 2, 14, 2], SN[2]);
  }],
  nordlicht: [(p) => {
    p.rect(5, 1, 6, 2, TN[2]); p.rect(5, 1, 3, 1, TN[4]); p.rect(4, 3, 8, 1, I[2]); p.rect(4, 3, 4, 1, I[4]);
    p.rrect(3, 4, 10, 11, IC[2]); p.rect(4, 5, 8, 9, P.blue[0]);
    p.poly([[8, 5.5], [11, 10], [8, 9], [5, 10]], T[3]); p.poly([[8, 5.5], [8, 9], [5, 10]], T[4]); p.set(7, 7, WHITE); p.rect(7, 9, 2, 2, T[3]);
    p.px([4, 12, 5, 11, 6, 12, 7, 12, 8, 12, 9, 11, 10, 12, 11, 11], T[3]); p.px([5, 13, 7, 13, 9, 13, 11, 13], P.pink[2]);
    p.rect(4, 5, 1, 6, IC[4]); p.rect(11, 6, 1, 8, IC[1]);
  }, (p) => { glow(p, 8, 9, 8, T[4], 40); }],
  quill: [(p) => {
    p.ball(8, 3.6, 3.3, 3.3, W, 1, 4); p.rect(7, 6, 3, 3, W[2]); p.set(7, 6, W[3]); p.rect(9, 7, 1, 2, W[1]); p.rect(6, 7, 5, 1, Y[3]);
    p.poly([[4, 9], [12, 9], [13, 12], [3, 12]], Y[2]); p.poly([[4, 9], [7, 9], [6, 12], [3, 12]], Y[3]); p.rect(4, 9, 8, 1, Y[4]); p.rect(11, 10, 2, 2, Y[1]);
    p.rect(2, 12, 12, 3, R[1]); p.rect(2, 12, 6, 1, R[2]); p.rect(2, 14, 12, 1, R[0]);
    p.rect(7, 10, 3, 1, WHITE); p.set(8, 10, INK);
  }],
  sockel: [(p) => {
    p.poly([[1, 4], [12, 4], [15, 7], [15, 14], [1, 14]], BRONZE[2]); p.rect(1, 4, 11, 1, BRONZE[4]); p.rect(1, 4, 1, 10, BRONZE[3]); p.rect(2, 13, 13, 1, BRONZE[1]); p.rect(14, 7, 1, 7, BRONZE[1]); p.line(12, 4, 14, 6, BRONZE[3]);
    p.rect(3, 6, 10, 6, S[2]); p.rect(3, 6, 10, 1, S[1]); p.rect(3, 6, 1, 6, S[1]); p.rect(3, 11, 10, 1, S[3]);
    p.line(4, 8, 6, 10, S[0]); p.line(6, 7, 9, 10, S[0]); p.line(9, 8, 11, 10, S[0]); p.line(5, 10, 8, 7, S[0]); p.line(10, 10, 12, 8, S[0]);
    p.px([5, 8, 8, 9, 11, 8], S[4]); p.px([2, 5, 2, 12, 13, 12], BRONZE[4]);
  }],
  stunde: [(p) => {
    p.ell(5.5, 10.5, 5, 5, Y[1]); p.ell(5.5, 10.5, 4.2, 4.2, C[2]); p.ell(5.1, 10.1, 3.4, 3.4, C[3]);
    p.px([5, 7, 8, 10, 5, 13, 2, 10], W[1]);
    p.poly([[8, 15], [9, 12], [11, 12], [11, 9], [16, 10], [16, 16]], 0);
    p.line(5, 10, 10, 5, HAND[2], 2); p.line(5, 10, 10, 5, HAND[4]);
    p.poly([[9, 4], [14, 1], [13, 7], [11, 6]], HAND[2]); p.poly([[9, 4], [14, 1], [11, 5]], HAND[4]); p.set(11, 5, HAND[0]); p.set(14, 1, WHITE);
    p.ell(5.5, 10.5, 1.5, 1.5, Y[3]); p.set(5, 10, Y[4]);
  }],
  hohlprinz: [(p) => {
    p.ball(8, 12, 7.4, 3.2, V, 1, 3); p.rect(3, 14, 10, 1, V[0]); p.px([3, 11, 4, 10], V[4]); p.px([0, 12, 15, 12], Y[3]);
    p.poly([[4, 8], [4, 3], [6, 7], [8, 2], [10, 7], [12, 3], [12, 8]], PGOLD[2]); p.poly([[4, 8], [4, 3], [6, 7], [8, 2], [8, 8]], PGOLD[3]); p.poly([[10, 7], [12, 3], [12, 8]], PGOLD[1]);
    p.rect(4, 8, 9, 3, PGOLD[2]); p.rect(4, 8, 4, 3, PGOLD[3]); p.rect(11, 8, 2, 3, PGOLD[1]); p.rect(4, 8, 9, 1, PGOLD[4]); p.rect(5, 10, 8, 1, PGOLD[1]);
    p.px([4, 3, 8, 2, 12, 3], WHITE); p.set(8, 9, P.pink[3]); p.set(6, 9, T[3]); p.set(10, 9, T[2]);
  }],
  // ---- Weltbosse
  moosgrimm: [(p) => {
    for (const [x, y, r] of [[4, 5, 3.2], [12, 5, 3.2], [8, 5, 3.4], [5.5, 9, 3.2], [10.5, 9, 3.2], [8, 12, 2.8]] as const) p.ball(x, y, r, r, FO, 1, 3);
    for (const [x, y, r] of [[3.6, 4.4, 2.2], [12.2, 4.6, 2], [6, 8, 2.4], [10, 8, 2.2], [8, 11.4, 2.2]] as const) p.ball(x, y, r, r, G, 1, 4);
    tube(p, bez([7, 5], [4, 2], [1, 5], 8), 1.3, 0.5, LICHEN, 1); tube(p, bez([9, 5], [12, 2], [15, 5], 8), 1.3, 0.5, LICHEN, 1); p.rect(7, 6, 3, 1, FO[0]);
    for (const [x, y0, y1] of [[2, 8, 11], [14, 8, 10], [9, 13, 15], [6, 12, 14], [4, 10, 13], [12, 11, 13]] as const) { p.line(x, y0, x, y1, LICHEN[2]); p.set(x, y1, LICHEN[4]); }
    p.px([5, 7, 11, 8, 8, 10], P.pink[4]); p.set(10, 11, R[2]);
  }],
  aschenmaul: [(p) => {
    tube(p, bez([6, 3.5], [5, 10], [12, 14], 14), 3.5, 0.5, FANG, 1);
    p.ell(6, 2.8, 3.8, 1.9, FANG[1]); p.ell(6, 2.8, 2.8, 1.2, F[1]); p.ell(5.6, 2.6, 1.7, 0.7, F[2]); p.set(5, 2, F[4]);
    p.px([6, 6, 7, 8, 8, 10], F[2]); p.px([3, 5, 3, 7, 4, 9], FANG[4]); p.px([9, 9, 10, 11], FANG[0]);
  }, (p) => { glow(p, 6, 2.5, 4, F[2], 60); }],
  niemand: [(p) => {
    p.poly([[1, 4], [14, 3], [15, 12], [2, 14]], C[3]); p.poly([[1, 4], [14, 3], [8, 9]], C[4]); p.poly([[14, 3], [15, 12], [8, 9]], C[2]);
    p.line(1, 4, 8, 9, C[1]); p.line(14, 3, 8, 9, C[1]); p.line(2, 14, 7, 10, C[2]); p.line(15, 12, 9, 10, C[1]); p.rect(3, 13, 11, 1, C[1]);
    p.ell(8, 9.2, 2.9, 2.9, V[0]); p.ball(8, 9, 2.5, 2.5, V, 1, 4); p.px([8, 7, 8, 8, 9, 9, 9, 10], V[0]); p.set(7, 8, WHITE);
  }],
  // ---- Hüter und Bosse
  b_dornenmutter: [(p) => {
    tube(p, bez([0, 12], [7, 16], [15, 11], 12), 2.2, 1.8, VINE, 1);
    for (let y = 13; y >= 1; y--) {
      const t = (13 - y) / 12, cx = 6 + t * t * 6.5, hw = 2.9 * Math.pow(1 - t, 0.8) + 0.5;
      for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) { const u = (x + 0.5 - cx) / hw; if (Math.abs(u) <= 1) p.set(x, y, t > 0.8 ? R[2] : u < -0.4 ? THORN[4] : u < 0.2 ? THORN[3] : u < 0.65 ? THORN[2] : THORN[1]); }
    }
    p.poly([[10, 12], [13, 8], [15, 9], [14, 12]], VINE[3]); p.set(13, 9, VINE[4]); p.rect(1, 10, 2, 2, P.pink[2]); p.set(1, 10, P.pink[4]);
  }],
  b_kristallkoloss: [(p) => {
    crystal(p, 10, 10, 13, 3, 1.6, P.pink); crystal(p, 6.5, 11, 5.5, 0, 2.6, T);
    p.poly([[1, 14], [2, 10], [4, 8], [8, 9], [11, 8], [14, 10], [15, 14]], S[2]); p.poly([[1, 14], [2, 10], [4, 8], [7, 10], [5, 14]], S[3]); p.poly([[10, 10], [11, 8], [14, 10], [15, 14], [11, 14]], S[1]);
    p.px([3, 9, 4, 9], S[4]); p.rect(1, 14, 14, 1, S[0]);
    p.poly([[8.5, 10], [10.5, 12], [8.5, 14], [6.5, 12]], Y[2]); p.poly([[8.5, 10], [8.5, 14], [6.5, 12]], Y[4]);
  }],
  b_ignarok: [(p) => {
    const hwAt = (y: number): number => (y < 6 ? 6.6 * Math.sqrt(Math.max(0, 1 - ((y + 0.5 - 6) / 5.4) ** 2)) : 6.6 * (1 - Math.pow((y + 0.5 - 6) / 9.6, 1.7)));
    const ins = (x: number, y: number): boolean => y >= 0 && y < 16 && Math.abs(x + 0.5 - 8) < hwAt(y);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (!ins(x, y)) continue;
      const u = (x + 0.5 - 8) / hwAt(y), rim = !ins(x, y + 1) || !ins(x - 1, y) || !ins(x + 1, y);
      p.set(x, y, rim && y > 7 ? (y > 11 ? F[3] : F[2]) : u < -0.3 ? A[4] : u > 0.35 ? A[1] : A[y === 5 || y === 9 ? 1 : 3]);
    }
    p.line(8, 2, 8, 11, A[0]); p.line(7, 2, 7, 8, A[4]); p.px([8, 12, 8, 13], F[4]); p.px([4, 4, 5, 3], WHITE);
  }, (p) => { glow(p, 8, 12, 5.5, F[2], 60); }],
  b_ysolde: [(p) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const u = (x - 7.5 - (y - 7.5)) / Math.SQRT2, v = (x - 7.5 + (y - 7.5)) / Math.SQRT2;
      if (Math.abs(u) > 9.6) continue;
      const hw = 3.3 * (1 - Math.pow(Math.abs(u) / 9.6, 1.5)) + 0.2, n = v / hw;
      if (Math.abs(v) > hw) continue;
      if (Math.abs(u) < 3.8 && Math.abs(v) < 1.5) { p.set(x, y, Math.floor(u + 20) % 2 ? WHITE : IC[2]); continue; }
      p.set(x, y, Math.abs(u) > 6.6 ? (n < 0 ? IC[4] : IC[2]) : n < -0.4 ? BIRCH[4] : n < 0.3 ? BIRCH[3] : BIRCH[1]);
    }
    p.px([10, 9, 11, 10, 12, 11, 12, 12, 11, 13, 12, 14, 13, 14], WHITE);
  }],
  b_archivar: [(p) => {
    for (let t = 2.3; t < 4; t += 0.07) p.set(8 + Math.cos(t) * 7.4, 8.5 + Math.sin(t) * 3, Y[1]);
    p.poly([[3, 1], [12, 1], [13, 10], [10, 14], [3, 14]], C[4]); p.poly([[11, 1], [12, 1], [13, 10], [10, 14], [9, 13], [12, 9]], C[3]); p.poly([[13, 10], [10, 14], [9, 10]], C[2]);
    p.line(9, 10, 13, 10, C[1]); p.rect(3, 1, 1, 13, WHITE); p.rect(3, 14, 6, 1, C[2]);
    p.px([5, 6, 6, 5, 7, 5, 8, 6, 6, 7, 7, 7], C[3]);
    for (let t = -0.9; t < 1.15; t += 0.07) p.set(8 + Math.cos(t) * 7.4, 8.5 + Math.sin(t) * 3, t < 0 ? Y[3] : Y[4]);
  }],
  b_hohlkoenig: [(p) => {
    const TY = TARNISH;
    for (let x = 2; x <= 13; x++) for (let k = 0; k < 4; k++) p.set(x, Math.round(11.4 - ((x - 7.5) / 5.5) ** 2 * 1.6) + k, k === 0 ? TY[4] : k === 3 ? TY[0] : x < 6 ? TY[3] : x > 10 ? TY[1] : TY[2]);
    p.poly([[2, 10], [3, 6], [4, 9], [5, 7], [6, 10]], TY[3]); p.poly([[10, 10], [11, 7], [12, 9], [13, 6], [14, 10]], TY[1]); p.px([3, 7, 5, 8], TY[4]);
    for (let y = 0; y <= 11; y++) {
      const hw = 0.6 + 2.5 * (y / 11);
      for (let x = Math.floor(8 - hw); x < 8 + hw; x++) { const u = (x + 0.5 - 8) / hw, hole = y > 4 && y < 10 && Math.abs(x + 0.5 - 8) < hw - 1.2; p.set(x, y, hole ? P.shadow[0] : u < -0.3 ? TY[4] : u < 0.3 ? TY[3] : TY[1]); }
    }
    p.set(8, 9, P.pink[3]); p.rect(7, 12, 2, 2, V[2]); p.set(7, 12, V[4]); p.px([8, 0, 7, 3], WHITE);
  }, (p) => { dot(p, 3, 3, V[4], 200); dot(p, 13, 2, P.pink[3], 170); }],
  b_vael: [(p) => {
    const N = INDIGO;
    p.rect(7, 0, 3, 1, Y[3]); p.px([6, 1, 10, 1], Y[2]); p.set(7, 0, Y[4]);
    p.poly([[6, 2], [11, 2], [14, 5], [3, 5]], N[2]); p.poly([[6, 2], [8, 2], [6, 5], [3, 5]], N[3]); p.rect(6, 2, 5, 1, N[4]);
    p.rect(3, 5, 11, 1, Y[3]); p.rect(3, 5, 5, 1, Y[4]);
    p.rect(4, 6, 9, 7, mix(N[2], IC[1], 0.35)); p.ell(8.5, 9.5, 3.2, 3.2, mix(Y[4], C[4], 0.4)); p.poly([[8.5, 6.5], [10.6, 9.6], [8.5, 12.4], [6.4, 9.6]], PALE); p.rect(8, 9, 1, 2, WHITE);
    p.rect(4, 6, 1, 7, Y[4]); p.rect(12, 6, 1, 7, Y[1]);
    p.rect(3, 13, 11, 2, Y[2]); p.rect(3, 13, 6, 1, Y[4]); p.rect(10, 14, 4, 1, Y[1]);
  }, (p) => { glow(p, 8.5, 9.5, 8, PALE, 50); }],
  b_aetherion: [(p) => {
    p.rect(7, 0, 2, 1, IC[3]);
    dome(p, 8, 7, 6.2, 6.2, [IC[1], IC[2], IC[3], IC[4]], 0, 3); p.rect(2, 7, 12, 5, IC[2]); p.rect(2, 7, 1, 5, IC[4]); p.rect(13, 7, 1, 5, IC[1]);
    dome(p, 8, 7.4, 5, 5, [JAR_IN, JAR_IN, JAR_IN, mix(JAR_IN, T[2], 0.4)], 0, 3); p.rect(3, 7, 10, 5, JAR_IN); p.rect(3, 7, 2, 5, mix(JAR_IN, T[2], 0.35));
    p.rect(6, 9, 2, 2, T[4]); p.set(6, 9, WHITE); p.rect(8, 4, 1, 6, WHITE); p.px([9, 4, 10, 5, 10, 6], T[4]); p.px([4, 5, 4, 6], WHITE);
    p.rect(1, 12, 14, 3, Y[2]); p.rect(1, 12, 8, 1, Y[4]); p.rect(11, 13, 4, 2, Y[1]); p.rect(2, 14, 12, 1, Y[1]);
  }, (p) => { glow(p, 8, 8, 8, T[4], 34); }],
  // ---- Wegzeichen
  m_riss10: [(p) => {
    const out: Pt[] = [[6, 1], [9, 5], [14, 6], [11, 9], [10, 14], [6, 11], [1, 9], [5, 6]];
    p.poly(out, V[3]); p.poly([[6, 3], [9, 6], [12, 7], [10, 9], [9, 12], [6, 10], [3, 9], [6, 6]], P.shadow[0]);
    p.line(6, 1, 5, 6, P.pink[3]); p.line(5, 6, 1, 9, P.pink[3]); p.line(6, 1, 8, 4, P.pink[3]); p.set(6, 1, P.pink[4]);
    p.px([7, 5, 6, 8, 9, 9], WHITE); p.px([8, 7, 7, 10], T[3]);
  }, (p) => { glow(p, 7.5, 8, 8, V[3], 44); }],
  m_riss20: [(p) => {
    p.rect(7, 11, 2, 4, I[2]); p.rect(7, 11, 1, 4, I[4]); p.rect(6, 14, 4, 1, I[2]); p.set(6, 14, I[4]);
    p.ell(8, 6, 6.4, 6.4, I[2]);
    for (let a = 2.6; a < 5; a += 0.08) p.set(8 + Math.cos(a) * 5.8, 6 + Math.sin(a) * 5.8, I[4]);
    for (let a = -0.4; a < 1.6; a += 0.08) p.set(8 + Math.cos(a) * 5.8, 6 + Math.sin(a) * 5.8, I[1]);
    p.ell(8, 6, 4.6, 4.6, IC[1]); p.ell(7.6, 5.6, 3.6, 3.6, IC[2]); p.ell(6.8, 4.8, 1.9, 1.6, IC[3]);
    p.rect(7, 5, 2, 2, mix(IC[1], P.blue[1], 0.5)); p.rect(6, 8, 4, 2, mix(IC[1], P.blue[1], 0.5));
    p.px([10, 2, 10, 3, 11, 4, 10, 5, 11, 6, 10, 7, 11, 8, 10, 9], V[3]); p.px([10, 4, 11, 7], P.pink[4]); p.set(5, 3, WHITE);
  }],
  m_riss30: [(p) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const u = (x - 7 + (y - 7.5)) / Math.SQRT2, v = (x - 7 - (y - 7.5)) / Math.SQRT2;
      if (Math.abs(u) > 9.4) continue;
      const hw = 3.4 * Math.pow(1 - (u / 9.4) ** 2, 0.75) + 0.2, n = Math.abs(v) / hw;
      if (n <= 1) p.set(x, y, n > 0.68 ? (v < 0 ? P.pink[3] : V[3]) : P.shadow[0]);
    }
    for (let k = -1; k <= 1; k++) { const cx = 7 + k * 3.4, cy = 7.5 + k * 3.4, h = 3 - Math.abs(k) * 0.7; p.line(cx + h, cy - h, cx - h, cy + h, Y[4]); p.set(Math.round(cx - h), Math.round(cy + h), Y[2]); }
    p.px([12, 12, 13, 11, 14, 10], Y[3]); p.line(13, 9, 15, 4, I[4]);
  }, (p) => { glow(p, 7, 7.5, 7, V[3], 36); }],
  m_sieben: [(p) => {
    const top = [10, 9, 7, 4, 8, 9, 11], order = [0, 1, 2, 6, 3, 4, 5];
    for (let i = 0; i < 7; i++) {
      const x = 1 + i * 2 + (i > 3 ? 1 : 0), c = SEVEN[order[i]], y0 = top[i];
      if (i === 3) { p.rect(x, y0, 2, 13 - y0, c[1]); p.rect(x, y0, 1, 13 - y0, c[2]); p.rect(x, y0 - 3, 2, 3, F[2]); p.px([x, y0 - 1, x + 1, y0 - 2], F[4]); p.set(x, y0 - 4, F[2]); }
      else { p.rect(x, y0, 1, 13 - y0, c[1]); p.set(x, y0, c[2]); p.set(x, y0 - 1, F[3]); p.set(x, y0 - 2, F[2]); }
    }
    p.rect(0, 13, 16, 2, W[2]); p.rect(0, 13, 16, 1, Y[3]); p.rect(0, 13, 7, 1, Y[4]); p.px([0, 14, 15, 14], 0);
  }, (p) => { glow(p, 8, 2, 3.5, F[3], 70); }],
  m_ende1: [(p) => {
    const K = TERRA_I;
    for (let a = -1.2; a < 1.3; a += 0.1) p.set(12.2 + Math.cos(a) * 2.4, 8.5 + Math.sin(a) * 3, a < 0 ? K[3] : K[1]);
    p.ball(7.5, 10, 5.6, 4.8, K, 1, 4); p.rect(5, 4, 5, 3, K[2]); p.rect(5, 4, 1, 3, K[4]); p.rect(9, 5, 1, 2, K[1]); p.rect(4, 4, 7, 1, K[3]);
    p.px([3, 10, 4, 10, 5, 11, 6, 11, 7, 10, 8, 10, 9, 11, 10, 11, 11, 10, 12, 10], P.blue[2]); p.px([3, 10, 4, 10], P.blue[3]);
    p.rect(5, 1, 5, 3, R[2]); p.rect(6, 0, 3, 1, R[2]); p.set(6, 1, R[4]); p.rect(9, 2, 1, 2, R[1]); p.px([4, 4, 7, 4, 7, 5, 10, 4], R[2]);
    p.rect(4, 14, 7, 1, K[1]); p.px([3, 8, 4, 7], WHITE);
  }],
  m_ende2: [(p) => {
    const yT = (x: number): number => 1 + ((x - 2) * 2) / 9, yB = (x: number): number => 14 - ((x - 2) * 1.4) / 9;
    for (let x = 2; x <= 11; x++) for (let y = Math.round(yT(x)); y <= Math.round(yB(x)); y++) {
      const t = (y - yT(x)) / (yB(x) - yT(x)), fr = x <= 2 || x >= 11 || t < 0.09 || t > 0.91 || Math.abs(t - 0.5) < 0.06 || x === 6 || x === 7;
      p.set(x, y, fr ? (x <= 2 || t < 0.06 ? W[4] : x >= 11 || t > 0.94 ? W[1] : x === 7 ? W[2] : W[3]) : (x + t * 14) % 5 < 1.5 ? IC[4] : x < 6 ? IC[3] : IC[2]);
    }
    p.px([1, 4, 1, 11], I[3]); p.set(10, 8, Y[4]);
    p.rect(12, 5, 3, 1, T[4]); p.set(15, 4, T[4]); p.rect(13, 9, 3, 1, T[3]); p.rect(12, 12, 2, 1, T[4]);
  }],
  m_ende3: [(p) => {
    p.rect(5, 1, 2, 8, PGOLD[4]); p.rect(6, 2, 1, 7, PGOLD[2]); p.rect(9, 1, 2, 8, PGOLD[3]); p.rect(10, 2, 1, 7, PGOLD[1]);
    p.rect(5, 9, 6, 2, PGOLD[2]); p.rect(5, 9, 3, 1, PGOLD[3]); p.rect(7, 9, 2, 1, 0); p.px([5, 2, 5, 4], WHITE);
    p.rect(7, 11, 2, 3, PGOLD[2]); p.rect(7, 11, 1, 3, PGOLD[4]); p.rect(6, 14, 4, 1, PGOLD[3]); p.set(6, 14, PGOLD[4]); p.set(9, 14, PGOLD[1]);
  }, (p) => { for (const y of [2, 4, 6]) { dot(p, 3, y, Y[4], y === 4 ? 230 : 150); dot(p, 12, y, Y[4], y === 4 ? 230 : 150); } dot(p, 2, 3, Y[4], 120); dot(p, 2, 5, Y[4], 120); dot(p, 13, 3, Y[4], 120); dot(p, 13, 5, Y[4], 120); }],
};
export const TROPHY_MINI_IDS = Object.keys(MINIS);

export function cmHof(out: Frames): void {
  anim(out, 'home_sign', 4, 30, 38, homeSign, false);
  one(out, 'bauplatz_a', 32, 24, bauA, false); one(out, 'bauplatz_b', 32, 24, bauB, false); one(out, 'bauplatz_c', 32, 24, bauC, false);
  one(out, 'begleiterplatz', 32, 26, petPlace, false);
  for (const id of TROPHY_MINI_IDS) { const p = new Px(16, 16); MINIS[id][0](p); inkOutline(p); MINIS[id][1]?.(p); out.push([`trophy_${id}`, p]); }
}
