/**
 * 24x24-Icons für das Zuhause (0.7/0.8): die acht Boss-Trophäen (`tro_b_<boss>`), die sieben Wegzeichen
 * (`tro_m_<zeichen>`), der Begleiter-Gegenstand „Pilzling im Topf“, sechs Wappen für die Boss-Unikate der Sammlung
 * (`uni_<boss>`) und die Buff-Kachel „Ausgeruht“. Aufbau wie icons_craft.ts / icons_world.ts: `HOME_ICONS` wird
 * gezeichnet und konturiert, `HOME_GLOW` legt danach Schein und Lichtpunkte darüber. Keys ohne `item_`-Präfix.
 */
import { Px, bez, crystal, tube } from './draw';
import type { Pt } from './draw';
import { P, Ramp, INK, WHITE, alpha, mix } from './palette';
import { halo, iconTile, onTile, spark } from './icons_craft';

type Fn = (p: Px) => void;

/** setzt nur auf freie Pixel (Schein nach der Kontur) */
const soft = (p: Px, x: number, y: number, c: number): void => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < 24 && y < 24 && p.get(x, y) >>> 24 === 0) p.set(x, y, c); };
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

export const TERRA: Ramp = [P.wood[0], mix(P.red[1], P.wood[1], 0.5), mix(P.red[2], P.tan[1], 0.55), mix(P.red[3], P.tan[2], 0.5), mix(P.fire[4], P.tan[4], 0.6)];
export const INDIGO: Ramp = [P.shadow[1], mix(P.violet[0], P.blue[0], 0.5), mix(P.violet[1], P.blue[1], 0.5), mix(P.violet[2], P.blue[2], 0.5), mix(P.violet[3], P.blue[3], 0.5)];
export const PALE = mix(P.gold[4], WHITE, 0.6);
/** angelaufenes Gold der Hohlen Krone */
export const TARNISH: Ramp = [P.shadow[1], mix(P.gold[0], P.shadow[2], 0.45), mix(P.gold[1], P.violet[1], 0.3), mix(P.gold[2], P.stone[2], 0.3), mix(P.gold[3], P.cream[3], 0.3)];
export const VOID: Ramp = [P.shadow[0], P.shadow[1], P.violet[1], P.violet[2], P.violet[4]];
/** die sieben Stimmen (wie elx_sieben): Stahl, Feuer, Licht, Erde, Wind, Wasser, Dunkel – [Schatten, Ton, Licht] */
export const SEVEN: ReadonlyArray<readonly [number, number, number]> = [
  [P.steel[2], P.steel[3], P.steel[4]], [P.fire[1], P.fire[2], P.fire[3]], [P.gold[2], P.gold[3], P.gold[4]], [P.green[2], P.green[3], P.green[4]],
  [P.teal[2], P.teal[3], P.teal[4]], [P.blue[2], P.blue[3], P.blue[4]], [P.violet[2], P.violet[3], P.violet[4]],
];

// ================================================================ Boss-Trophäen
const BOSS: Record<string, Fn> = {
  // Dorn der Dornenmutter: armlanger Dorn auf einem Stück Ranke, an der Spitze noch ein Tropfen
  tro_b_dornenmutter: (p) => {
    const V: Ramp = [P.forest[0], P.forest[1], P.green[1], P.green[2], P.green[3]], T: Ramp = [P.wood[0], mix(P.red[0], P.wood[1], 0.5), mix(P.red[1], P.wood[3], 0.45), mix(P.red[3], P.tan[3], 0.55), P.tan[4]];
    tube(p, bez([0, 18], [10, 24], [23, 17], 18), 3.2, 2.6, V, 1);
    p.px([3, 21, 9, 22, 15, 21, 20, 19], V[0]);
    // Dorn: breit am Fuß, nach rechts oben gebogen
    for (let y = 20; y >= 1; y--) {
      const t = (20 - y) / 19, cx = 9 + t * t * 9.5, hw = 4.2 * Math.pow(1 - t, 0.8) + 0.5;
      for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
        const u = (x + 0.5 - cx) / hw;
        if (Math.abs(u) > 1) continue;
        p.set(x, y, t > 0.82 ? (u < 0 ? P.red[2] : P.red[1]) : u < -0.45 ? T[4] : u < 0.1 ? T[3] : u < 0.6 ? T[2] : T[1]);
      }
    }
    p.px([7, 16, 8, 13, 9, 10], WHITE); p.px([11, 17, 12, 13, 13, 10], T[1]); p.rect(5, 19, 9, 1, T[1]); p.rect(6, 20, 7, 1, V[1]);
    // Blatt und Blütenrest
    p.poly([[15, 19], [19, 13], [23, 13], [21, 18]], V[3]); p.line(16, 18, 22, 14, V[4]); p.px([22, 16, 21, 17], V[2]);
    p.poly([[1, 17], [3, 13], [6, 15], [5, 18]], P.pink[2]); p.px([3, 14, 4, 15], P.pink[4]); p.set(2, 17, P.pink[1]);
    p.set(19, 2, P.red[2]);
  },
  // Splitter des Kolosses: schwerer Felsbrocken, darin ein großer Kristall und ein Rest der goldenen Brustfassung
  tro_b_kristallkoloss: (p) => {
    const S = P.stone, AMB: Ramp = [P.gold[0], P.gold[1], P.gold[2], P.gold[3], P.gold[4]];
    crystal(p, 15, 16, 20, 5, 2.4, P.pink);
    crystal(p, 10, 17, 8, 1, 4, P.teal);
    p.poly([[1, 22], [2, 16], [6, 12], [12, 14], [17, 12], [22, 16], [23, 22]], S[2]);
    p.poly([[1, 22], [2, 16], [6, 12], [10, 15], [7, 22]], S[3]); p.poly([[2, 16], [6, 12], [8, 14], [4, 17]], S[4]);
    p.poly([[15, 15], [17, 12], [22, 16], [23, 22], [17, 22]], S[1]); p.line(10, 15, 12, 22, S[1]); p.line(12, 14, 15, 17, S[1]);
    p.rect(1, 22, 22, 1, S[0]); p.px([4, 19, 5, 20, 19, 18, 20, 19, 9, 19], S[0]); p.px([3, 15, 6, 13], WHITE);
    p.poly([[13, 16], [16, 19], [13, 22], [10, 19]], AMB[2]); p.poly([[13, 16], [13, 22], [10, 19]], AMB[4]); p.poly([[13, 19], [16, 19], [13, 22]], AMB[1]); p.set(12, 18, WHITE);
    p.px([7, 3, 8, 6], WHITE);
  },
  // Schlackenschuppe: handtellergroße Schuppe aus erstarrter Schlacke, an Rand und Rissen glüht sie nach
  tro_b_ignarok: (p) => {
    const K: Ramp = [P.ash[0], P.ash[1], P.ash[2], P.ash[3], P.ash[4]], F = P.fire;
    // Tropfenform: oben rund (dort saß sie fest), unten spitz
    const hwAt = (y: number): number => (y < 9 ? 9.6 * Math.sqrt(Math.max(0, 1 - ((y + 0.5 - 9) / 8.4) ** 2)) : 9.6 * (1 - Math.pow((y + 0.5 - 9) / 14, 1.7)));
    const ins = (x: number, y: number): boolean => y >= 0 && y < 24 && Math.abs(x + 0.5 - 12) < hwAt(y);
    // Zuwachsringe: verkleinerte Umrisse um den Ansatz oben
    const lvl = (x: number, y: number): number => { for (let k = 0; k < 3; k++) { const s = [0.42, 0.7, 1][k]; if (ins(Math.floor(12 + (x + 0.5 - 12) / s), Math.floor(1 + (y - 1) / s))) return k; } return 3; };
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      if (!ins(x, y)) continue;
      const u = (x + 0.5 - 12) / hwAt(y), l = lvl(x, y), rim = !ins(x, y + 1) || !ins(x - 1, y) || !ins(x + 1, y);
      let t = (l === 0 ? 3 : 2) + (u < -0.25 ? 1 : u > 0.4 ? -1 : 0);
      if (lvl(x, y + 1) > l && !rim) t = 0; else if (lvl(x, y - 1) < l) t = Math.min(4, t + 1);
      p.set(x, y, rim && y > 11 ? (y > 19 ? F[3] : y > 15 ? F[2] : F[1]) : K[Math.max(0, Math.min(4, t))]);
    }
    p.line(12, 2, 12, 17, K[0]); p.line(11, 2, 11, 12, K[4]);
    p.px([12, 18, 13, 16, 12, 15, 14, 14, 11, 19], F[2]); p.px([12, 19, 12, 20], F[3]); p.px([12, 21, 12, 22], F[4]);
    p.px([6, 5, 5, 8, 7, 4], WHITE); p.px([16, 6, 17, 9], K[0]);
  },
  // Ysoldes Webschiffchen: helles Schiffchen mit Eisspitzen, auf der Spule ein Faden aus Eis
  tro_b_ysolde: (p) => {
    const W: Ramp = [P.wood[0], P.wood[2], P.tan[2], P.tan[3], P.cream[4]], I = P.ice;
    // u = längs (unten links → oben rechts), v = quer; beide Enden laufen spitz zu
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      const u = (x - 11.5 - (y - 11.5)) / Math.SQRT2, v = (x - 11.5 + (y - 11.5)) / Math.SQRT2;
      if (Math.abs(u) > 14) continue;
      const hw = 4.9 * (1 - Math.pow(Math.abs(u) / 14, 1.5)) + 0.2;
      if (Math.abs(v) > hw) continue;
      const tip = Math.abs(u) > 9.8, n = v / hw;
      if (Math.abs(u) < 5.6 && Math.abs(v) < 2.2) { p.set(x, y, Math.floor(u * 0.9 + 20) % 2 ? (v < 0 ? WHITE : I[3]) : v < 0 ? I[3] : I[1]); continue; }
      if (Math.abs(u) < 6.8 && Math.abs(v) < 3.1) { p.set(x, y, v < 0 ? W[0] : P.wood[1]); continue; }
      p.set(x, y, tip ? (n < -0.2 ? I[4] : n < 0.45 ? I[2] : I[1]) : n < -0.5 ? W[4] : n < 0.1 ? W[3] : n < 0.6 ? W[2] : W[1]);
    }
    p.px([5, 16, 16, 5], WHITE); p.px([4, 20, 20, 4], I[4]);
    // der Faden läuft aus der Öse und kringelt sich
    for (const [x, y] of bez([14, 13], [21, 13], [18, 19], 14)) p.set(x, y, WHITE);
    for (const [x, y] of bez([18, 19], [15, 23], [22, 22], 12)) p.set(x, y, I[3]);
    p.set(14, 13, P.blue[1]);
  },
  // Leeres Blatt des Archivars: ein einzelnes Blatt, das nicht ganz liegt – als Wasserzeichen ein müdes Auge
  tro_b_archivar: (p) => {
    const C = P.cream, Y = P.gold;
    for (let t = 2.2; t < 4.1; t += 0.04) p.set(12 + Math.cos(t) * 11, 13 + Math.sin(t) * 4.4, Y[1]);
    p.poly([[5, 2], [18, 1], [20, 16], [15, 22], [4, 21]], C[4]);
    p.poly([[16, 1], [18, 1], [20, 16], [15, 22], [14, 21], [18, 15]], C[3]);
    p.poly([[20, 16], [15, 22], [14, 16]], C[2]); p.line(14, 16, 20, 16, C[1]); p.line(14, 16, 15, 21, C[1]); p.px([15, 17, 16, 17], WHITE);
    p.line(5, 3, 4, 20, WHITE); p.rect(6, 2, 10, 1, WHITE); p.rect(5, 21, 9, 1, C[2]);
    // Wasserzeichen (kaum zu sehen): Lid und Iris
    p.px([8, 10, 9, 9, 10, 9, 11, 9, 12, 9, 13, 10, 9, 12, 10, 12, 11, 12, 12, 12], C[3]); p.px([10, 10, 11, 10, 10, 11, 11, 11], mix(C[3], P.teal[3], 0.35));
    p.px([7, 6, 12, 5, 9, 17, 12, 15], C[3]);
    for (let t = -0.75; t < 1.05; t += 0.04) { const x = Math.round(12 + Math.cos(t) * 11), y = Math.round(13 + Math.sin(t) * 4.4); p.set(x, y, t < 0 ? Y[3] : Y[4]); p.set(x, y + 1, Y[2]); }
    p.rect(1, 12, 2, 2, P.teal[3]); p.set(1, 12, P.teal[4]);
  },
  // Zacke der Hohlen Krone: eine abgebrochene Kronenzacke aus angelaufenem Gold, innen hohl
  tro_b_hohlkoenig: (p) => {
    const Y = TARNISH, V = P.violet;
    // Stück des Reifs (vorn tiefer), an beiden Enden gebrochen
    const yb = (x: number): number => Math.round(17.4 - ((x - 12) / 8) ** 2 * 2.2);
    for (let x = 3; x <= 20; x++) for (let k = 0; k < 5; k++) {
      const y = yb(x) + k;
      if ((x === 3 && k !== 2) || (x === 20 && (k === 0 || k === 3)) || (x === 4 && k === 4)) continue;
      p.set(x, y, k === 0 ? Y[4] : k === 4 ? Y[0] : x < 9 ? Y[3] : x > 15 ? Y[1] : Y[2]);
    }
    // Stümpfe der Nachbarzacken
    p.poly([[3, 15], [4, 9], [6, 13], [7, 10], [9, 16]], Y[3]); p.poly([[15, 16], [17, 10], [18, 13], [20, 9], [21, 15]], Y[1]); p.px([4, 10, 4, 11, 7, 11], Y[4]); p.px([17, 11, 20, 10], Y[2]);
    // die Zacke: hoch, innen hohl
    for (let y = 0; y <= 17; y++) {
      const h = y / 17, hw = 0.7 + 3.5 * Math.pow(h, 1.1);
      for (let x = Math.floor(12 - hw); x < 12 + hw; x++) {
        const u = (x + 0.5 - 12) / hw, hole = y > 6 && y < 15 && Math.abs(x + 0.5 - 12) < hw - 1.5;
        p.set(x, y, hole ? (y > 12 ? V[1] : P.shadow[0]) : u < -0.35 ? Y[4] : u < 0.3 ? Y[3] : Y[1]);
      }
    }
    p.px([12, 0, 11, 3, 10, 7, 9, 11], WHITE); p.px([11, 14, 12, 14], P.pink[3]); p.set(12, 13, V[3]); p.set(12, 10, V[1]);
    p.poly([[12, 17], [14, 18.5], [12, 20.5], [10, 18.5]], V[2]); p.set(11, 18, V[4]); p.set(12, 19, V[1]);
    p.px([6, 18, 17, 18], Y[4]); p.px([8, 21, 15, 21], Y[0]);
  },
  // Vaels Laterne: Ordenslaterne in Indigo und Gold, das Licht darin ist blass und brennt ruhig
  tro_b_vael: (p) => {
    const N = INDIGO, Y = P.gold;
    p.ell(12, 3, 3.4, 3, Y[2]); p.ell(12, 3, 1.8, 1.5, 0); p.px([10, 1, 9, 2], Y[4]); p.px([14, 4, 15, 3], Y[1]);
    p.poly([[9, 5], [15, 5], [19, 9], [5, 9]], N[2]); p.poly([[9, 5], [12, 5], [10, 9], [5, 9]], N[3]); p.poly([[14, 5], [15, 5], [19, 9], [16, 9]], N[1]);
    p.rect(9, 5, 6, 1, N[4]); p.rect(4, 9, 16, 2, Y[2]); p.rect(4, 9, 9, 1, Y[4]); p.rect(16, 10, 4, 1, Y[1]);
    // Glas mit Flamme
    p.rect(6, 11, 12, 9, mix(N[1], P.blue[1], 0.4)); p.rect(7, 11, 10, 9, mix(N[2], P.ice[1], 0.35));
    p.ell(12, 16, 4.4, 4, mix(P.gold[3], N[3], 0.45)); p.ell(12, 16.4, 3.2, 3.2, mix(P.gold[4], P.cream[4], 0.4));
    p.poly([[12, 11.5], [14.6, 16], [12, 19.5], [9.4, 16]], PALE); p.poly([[12, 13.5], [13.4, 16.4], [12, 18.6], [10.6, 16.4]], WHITE);
    p.rect(5, 11, 2, 9, Y[3]); p.rect(5, 11, 1, 9, Y[4]); p.rect(17, 11, 2, 9, Y[1]); p.rect(17, 11, 1, 9, Y[2]);
    p.rect(4, 20, 16, 2, Y[2]); p.rect(4, 20, 9, 1, Y[4]); p.rect(15, 21, 5, 1, Y[1]); p.rect(6, 22, 12, 1, N[1]); p.rect(6, 22, 5, 1, N[2]);
    p.px([8, 12, 8, 13, 8, 14], WHITE);
  },
  // Ein Ton des Wiegenlieds: unter der Glasglocke schwebt eine einzelne leuchtende Note
  tro_b_aetherion: (p) => {
    const G = P.ice, T = P.teal, Y = P.gold, IN = mix(P.blue[0], P.teal[0], 0.5);
    p.ell(12, 1.6, 1.8, 1.6, G[3]); p.set(11, 1, WHITE);
    dome(p, 12, 11, 8.4, 8.4, [G[1], G[2], G[3], G[4]], 0, 3); p.rect(4, 11, 16, 9, G[2]); p.rect(4, 11, 1, 9, G[4]); p.rect(19, 11, 1, 9, G[1]);
    dome(p, 12, 11.4, 7, 7, [IN, IN, mix(IN, T[1], 0.5), mix(IN, T[2], 0.4)], 0, 3); p.rect(5, 11, 14, 9, IN); p.rect(5, 11, 3, 9, mix(IN, T[2], 0.35)); p.rect(17, 11, 2, 9, P.shadow[1]);
    // Note
    p.ell(10.5, 16.5, 2.5, 2, T[4]); p.ell(10, 16.2, 1.5, 1.1, WHITE); p.rect(12, 8, 1, 9, WHITE);
    p.px([13, 8, 14, 9, 15, 10, 15, 11, 14, 12], T[4]); p.px([13, 9, 14, 10], WHITE); p.px([9, 18, 10, 18, 11, 18], T[3]);
    p.px([6, 8, 6, 9, 6, 10, 7, 6, 8, 5], WHITE); p.px([16, 15, 7, 13], T[3]);
    // Sockel
    p.rect(2, 20, 20, 3, Y[2]); p.rect(2, 20, 12, 1, Y[4]); p.rect(17, 21, 5, 2, Y[1]); p.rect(3, 22, 18, 1, Y[1]); p.px([2, 22, 21, 22], 0);
  },
};

// ================================================================ Wegzeichen
const MARKS: Record<string, Fn> = {
  // Riss-Scherbe: ein Stück Nichts mit scharfen Kanten – innen Sterne, die es hier nicht gibt
  tro_m_riss10: (p) => {
    const V = VOID, K = P.pink;
    const out: Pt[] = [[9, 1], [14, 7], [21, 9], [16, 14], [15, 22], [9, 17], [2, 13], [8, 9]];
    p.poly(out, V[3]);
    p.poly([[9, 3], [13, 8], [19, 10], [15, 14], [14, 20], [9, 16], [4, 13], [9, 9]], V[0]);
    for (let k = 0; k < out.length; k++) { const a = out[k], b = out[(k + 1) % out.length], lit = (b[0] - a[0]) * 0.7 - (b[1] - a[1]) * 0.5 > 0 || k === 7 || k === 6; p.line(a[0], a[1], b[0] - (b[0] > a[0] ? 1 : 0), b[1] - (b[1] > a[1] ? 1 : 0), lit ? K[3] : V[2]); }
    p.px([9, 1, 9, 2, 2, 13], K[4]); p.px([10, 6, 9, 12, 13, 15, 12, 10, 16, 11], WHITE); p.px([11, 13, 7, 13, 14, 18, 11, 8], P.teal[3]); p.px([12, 12, 10, 15, 14, 12], V[2]);
  },
  // Riss-Spiegel: Handspiegel, im Glas ein Riss – und jemand, der etwas ausgeruhter aussieht
  tro_m_riss20: (p) => {
    const S = P.steel, V = P.violet, G = P.ice;
    p.rect(11, 17, 3, 6, S[2]); p.rect(11, 17, 1, 6, S[4]); p.rect(13, 18, 1, 5, S[1]); p.rect(10, 22, 5, 1, S[2]); p.set(10, 22, S[4]); p.px([11, 19, 12, 19, 13, 19], V[2]);
    p.ell(12, 9.5, 9, 9.4, S[1]); p.ell(12, 9, 9, 9, S[2]);
    for (let a = 2.6; a < 5; a += 0.05) p.set(12 + Math.cos(a) * 8.4, 9 + Math.sin(a) * 8.4, S[4]);
    for (let a = -0.4; a < 1.6; a += 0.05) p.set(12 + Math.cos(a) * 8.4, 9 + Math.sin(a) * 8.4, S[1]);
    p.ell(12, 9, 6.8, 6.8, G[1]); p.ell(11.4, 8.4, 5.6, 5.6, G[2]); p.ell(10.4, 7.2, 3.4, 3, G[3]);
    // Spiegelbild: Kopf und Schultern
    p.ell(12, 8, 2, 2.1, mix(G[1], P.blue[1], 0.5)); p.poly([[8.5, 14], [10, 11], [14, 11], [15.5, 14], [12, 15.6]], mix(G[1], P.blue[1], 0.5)); p.set(11, 7, G[3]);
    // der Riss
    p.px([15, 3, 14, 4, 14, 5, 15, 6, 14, 7, 15, 8, 16, 9, 15, 10, 16, 11, 15, 12, 16, 13], V[3]); p.px([14, 5, 15, 8, 15, 12], P.pink[4]); p.px([13, 4, 16, 7, 17, 10], P.teal[4]);
    p.px([7, 5, 8, 4, 9, 4], WHITE); p.px([12, 0, 3, 9, 21, 9], V[3]); p.set(12, 0, V[4]);
  },
  // Der zugenähte Riss: violetter Spalt, mit Goldfaden Stich für Stich geschlossen – die Nadel hängt noch
  tro_m_riss30: (p) => {
    const V = VOID, Y = P.gold;
    // Spalt schräg von oben links nach unten rechts
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      const u = (x - 10.5 + (y - 11.5)) / Math.SQRT2, v = (x - 10.5 - (y - 11.5)) / Math.SQRT2;
      if (Math.abs(u) > 13.5) continue;
      const hw = 5 * Math.pow(1 - (u / 13.5) ** 2, 0.75) + 0.2, n = Math.abs(v) / hw;
      if (n > 1) continue;
      p.set(x, y, n > 0.74 ? (v < 0 ? P.pink[3] : V[3]) : n > 0.42 ? V[2] : V[0]);
    }
    p.px([7, 8, 12, 14, 15, 15], P.teal[3]); p.px([9, 10, 13, 12], WHITE);
    // fünf Stiche quer über den Spalt: heller Faden, darunter sein Schatten
    for (let k = -2; k <= 2; k++) {
      const cx = 10.5 + k * 3.4, cy = 11.5 + k * 3.4, h = 4.4 - Math.abs(k) * 0.9;
      p.line(cx + h, cy - h + 1, cx - h, cy + h + 1, V[0]);
      p.line(cx + h, cy - h, cx - h, cy + h, Y[4]);
      p.set(Math.round(cx + h), Math.round(cy - h), Y[2]); p.set(Math.round(cx - h), Math.round(cy + h), Y[2]);
    }
    // Fadenende mit Nadel
    for (const [x, y] of bez([18, 20], [23, 19], [20, 13], 12)) p.set(x, y, Y[3]);
    p.line(19, 12, 22, 5, P.steel[4]); p.line(20, 12, 23, 5, P.steel[2]); p.set(22, 4, WHITE); p.set(22, 5, 0); p.set(22, 6, P.steel[4]);
  },
  // Sieben Kerzen: eine je Sitz, in den Farben der Stimmen; die siebte in der Mitte brennt am längsten
  tro_m_sieben: (p) => {
    const Y = P.gold, W = P.wood;
    const top = [15, 13, 11, 8, 12, 14, 16], order = [0, 1, 2, 6, 3, 4, 5];
    for (let i = 0; i < 7; i++) {
      const x = 1 + i * 3 + (i > 3 ? 1 : 0), c = SEVEN[order[i]], y0 = top[i], big = i === 3;
      p.rect(x, y0, big ? 3 : 2, 20 - y0, c[1]); p.rect(x, y0, 1, 20 - y0, c[2]); p.rect(x + (big ? 2 : 1), y0 + 1, 1, 19 - y0, c[0]);
      if (big) { p.set(x + 1, y0 - 1, INK); p.poly([[x + 1.5, y0 - 7.5], [x + 3.6, y0 - 3.5], [x + 1.5, y0 - 1], [x - 0.6, y0 - 3.5]], P.fire[2]); p.poly([[x + 1.5, y0 - 5], [x + 2.5, y0 - 3], [x + 1.5, y0 - 1.4], [x + 0.5, y0 - 3]], P.fire[4]); }
      else { p.rect(x, y0 - 2, 2, 2, P.fire[2]); p.set(x, y0 - 3, P.fire[2]); p.set(x, y0 - 1, P.fire[4]); p.set(x + 1, y0 - 2, P.fire[3]); }
      if (i === 1 || i === 5) p.set(x + 1, y0 + 2, c[2]);
    }
    // Leuchterbrett
    p.rect(0, 20, 24, 3, W[2]); p.rect(0, 20, 24, 1, Y[3]); p.rect(0, 20, 10, 1, Y[4]); p.rect(0, 22, 24, 1, W[0]); p.rect(19, 21, 5, 1, W[1]);
    p.px([0, 22, 23, 22], 0); p.px([3, 21, 9, 21, 15, 21, 20, 21], W[3]);
  },
  // Versiegelter Krug: Tonkrug mit Wellenband, Korken unter rotem Wachs, das Siegel hängt an der Schnur
  tro_m_ende1: (p) => {
    const K = TERRA, R = P.red, B = P.blue;
    for (let a = -1.2; a < 1.3; a += 0.06) { const x = Math.round(18.5 + Math.cos(a) * 3.6), y = Math.round(12 + Math.sin(a) * 4.6); p.rect(x, y, 2, 2, a < -0.2 ? K[3] : K[1]); }
    p.ball(11.5, 15.5, 8.2, 7.4, K, 1, 4);
    p.rect(8, 7, 7, 4, K[2]); p.rect(8, 7, 2, 4, K[4]); p.rect(14, 7, 1, 4, K[1]); p.rect(7, 6, 9, 2, K[3]); p.rect(7, 6, 4, 1, K[4]); p.rect(14, 7, 2, 1, K[1]);
    // Wellenband
    for (let x = 4; x < 19; x++) { const y = 15 + ((x + 1) % 4 < 2 ? 0 : 1); if (p.get(x, y) && p.get(x, y + 1)) { p.set(x, y, x < 8 ? B[3] : x > 15 ? B[1] : B[2]); p.set(x, y + 1, x > 15 ? B[0] : B[1]); } }
    p.rect(6, 22, 11, 1, K[1]); p.px([5, 12, 5, 13, 6, 11], WHITE);
    // Wachs und Siegel
    p.rect(8, 2, 7, 4, R[2]); p.rect(9, 1, 5, 1, R[2]); p.rect(9, 2, 3, 1, R[4]); p.rect(8, 3, 1, 3, R[3]); p.rect(13, 3, 2, 3, R[1]);
    p.px([7, 6, 7, 7, 10, 6, 10, 7, 10, 8, 14, 6, 15, 6, 15, 7], R[2]); p.set(10, 9, R[1]); p.set(7, 8, R[1]);
    p.rect(8, 9, 7, 1, P.tan[3]); p.px([15, 10, 16, 11, 16, 12], P.tan[3]);
    p.ell(16.5, 14.5, 2.4, 2.4, R[2]); p.px([15, 13, 16, 13], R[4]); p.px([17, 16, 18, 15], R[1]); p.set(16, 14, P.gold[4]);
  },
  // Offenes Fenster: ein Fensterflügel, aufgeschwungen – durch ihn zieht es
  tro_m_ende2: (p) => {
    const W = P.wood, G = P.ice, T = P.teal;
    // Flügel in Schrägsicht: links (Bänder) hoch, rechts kürzer
    const yT = (x: number): number => 1 + ((x - 3) * 3) / 13, yB = (x: number): number => 22 - ((x - 3) * 2) / 13;
    for (let x = 3; x <= 16; x++) for (let y = Math.round(yT(x)); y <= Math.round(yB(x)); y++) {
      const t = (y - yT(x)) / (yB(x) - yT(x)), fr = x <= 4 || x >= 15 || t < 0.1 || t > 0.9 || Math.abs(t - 0.5) < 0.045 || x === 9 || x === 10;
      p.set(x, y, fr ? (x <= 3 || t < 0.05 ? W[4] : x >= 16 || t > 0.95 ? W[1] : x === 10 ? W[2] : W[3]) : (x - 5) + (t * 20) < 10 ? G[3] : (x + t * 20) % 7 < 2 ? G[4] : G[2]);
    }
    p.px([6, 5, 7, 4, 6, 14, 7, 13, 12, 7, 12, 15], WHITE);
    p.rect(1, 5, 3, 2, P.steel[2]); p.set(1, 5, P.steel[4]); p.rect(1, 17, 3, 2, P.steel[2]); p.set(1, 17, P.steel[4]);
    p.rect(14, 11, 2, 2, P.gold[3]); p.set(14, 11, P.gold[4]);
    // Luftzug: drei Böenstriche, ein Blatt treibt mit
    p.rect(18, 7, 5, 1, T[4]); p.set(23, 6, T[4]); p.rect(19, 12, 4, 1, T[3]); p.px([23, 11, 18, 13], T[3]); p.rect(18, 17, 3, 1, T[4]); p.set(21, 16, T[4]);
    p.px([21, 20, 22, 21, 22, 20], P.green[3]); p.set(21, 21, P.green[4]);
  },
  // Stimmgabel in Fis: schlanke Gabel aus hellem Gold; sie schwingt noch
  tro_m_ende3: (p) => {
    const Y: Ramp = [P.gold[0], P.gold[1], mix(P.gold[2], P.cream[3], 0.25), mix(P.gold[3], P.cream[4], 0.3), mix(P.gold[4], WHITE, 0.5)];
    for (const [x, c0, c1] of [[7, Y[4], Y[2]], [14, Y[3], Y[1]]] as const) { p.rect(x, 2, 3, 12, c0); p.rect(x + 2, 3, 1, 11, c1); p.rect(x, 1, 3, 1, Y[4]); }
    p.px([7, 3, 7, 5, 7, 7, 14, 3], WHITE);
    p.poly([[7, 14], [17, 14], [15, 17], [9, 17]], Y[2]); p.rect(7, 14, 4, 1, Y[3]); p.rect(10, 14, 4, 1, 0); p.rect(10, 15, 4, 1, Y[1]); p.px([15, 16, 14, 17], Y[1]);
    p.rect(11, 17, 3, 5, Y[2]); p.rect(11, 17, 1, 5, Y[4]); p.rect(13, 18, 1, 4, Y[1]);
    p.ell(12.5, 22, 2, 1.6, Y[3]); p.set(12, 21, WHITE); p.set(13, 23, Y[1]);
  },
};

// ================================================================ Begleiter-Gegenstand
const ITEMS: Record<string, Fn> = {
  // Pilzling im Topf: Tontopf, darin ein kleiner roter Pilz, der zurückschaut
  pet_pilzling: (p) => {
    const K = TERRA, R = P.red, C = P.cream;
    // Stiel mit Gesicht, Hut
    p.rect(8, 9, 8, 6, C[3]); p.rect(8, 9, 2, 6, C[4]); p.rect(15, 10, 1, 5, C[2]);
    p.rect(10, 11, 1, 2, INK); p.rect(13, 11, 1, 2, INK); p.px([9, 13, 14, 13], P.pink[3]); p.px([11, 13, 12, 13], P.wood[1]);
    dome(p, 12, 9.4, 9.4, 8.4, R, 1, 4); p.rect(3, 9, 18, 1, R[1]); p.rect(5, 10, 14, 1, P.tan[2]); p.px([6, 10, 9, 10, 12, 10, 15, 10, 18, 10], P.tan[1]);
    p.rect(6, 4, 3, 2, WHITE); p.rect(12, 2, 2, 2, WHITE); p.rect(16, 5, 3, 2, C[4]); p.px([4, 7, 10, 6, 19, 8], C[4]);
    // Topf: Rand, Bauch, Erde
    p.rect(4, 14, 16, 3, K[3]); p.rect(4, 14, 9, 1, K[4]); p.rect(16, 15, 4, 2, K[1]); p.rect(5, 14, 14, 1, P.wood[0]); p.rect(4, 14, 16, 1, K[4]); p.rect(6, 14, 12, 1, mix(P.wood[1], P.forest[1], 0.3));
    p.poly([[5, 17], [19, 17], [17, 23], [7, 23]], K[2]); p.poly([[5, 17], [9, 17], [9, 23], [7, 23]], K[3]); p.poly([[16, 17], [19, 17], [17, 23], [15, 23]], K[1]);
    p.rect(5, 17, 14, 1, K[1]); p.px([7, 19, 7, 20], WHITE); p.px([11, 20, 12, 20, 13, 20, 12, 21], K[1]);
    p.px([7, 14, 16, 14], P.green[3]); p.set(17, 13, P.green[4]);
  },
};

// ================================================================ Wappen der Boss-Unikate (Sammlung → Fundstücke)
/** Wappenschild in Bossfarbe mit Zeichen; `fg` hell, `sh` dunkel */
const crest = (r: Ramp, sign: Fn): Fn => (p) => {
  const Y = P.gold;
  p.poly([[3, 2], [21, 2], [21, 12], [17, 19], [12, 23], [7, 19], [3, 12]], Y[2]);
  p.rect(3, 2, 18, 1, Y[4]); p.rect(3, 3, 1, 9, Y[4]); p.px([4, 13, 5, 15, 6, 17], Y[3]); p.px([20, 12, 19, 15, 17, 18, 15, 20], Y[1]);
  p.poly([[5, 4], [19, 4], [19, 12], [16, 17.5], [12, 21], [8, 17.5], [5, 12]], r[2]);
  p.poly([[5, 4], [9, 4], [9, 18.5], [8, 17.5], [5, 12]], r[3]); p.poly([[16, 4], [19, 4], [19, 12], [16, 17.5], [14, 19.4], [16, 13]], r[1]);
  p.rect(5, 4, 14, 1, r[4]);
  const q = new Px(24, 24); sign(q);
  for (let i = 0; i < q.d.length; i++) if (q.d[i]) { const x = i % 24, y = (i / 24) | 0; if (p.get(x + 1, y + 1) === r[2] || p.get(x + 1, y + 1) === r[1] || p.get(x + 1, y + 1) === r[3]) p.set(x + 1, y + 1, r[0]); }
  p.draw(q);
};
const ROCK: Ramp = [P.stone[0], P.stone[1], P.stone[2], P.stone[3], P.stone[4]];
const UNIQUE: Record<string, Fn> = {
  // Dornenmutter: Blüte mit Dornenkranz
  uni_dornenmutter: crest([P.forest[0], P.forest[1], P.green[1], P.green[2], P.green[4]], (q) => {
    for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k * Math.PI * 2) / 5; q.ell(12 + Math.cos(a) * 3.6, 11 + Math.sin(a) * 3.6, 2.3, 2.3, k < 2 || k === 4 ? P.pink[3] : P.pink[2]); }
    q.ell(12, 11, 1.8, 1.8, P.gold[4]); q.set(11, 10, WHITE); q.px([12, 16, 12, 17, 12, 18], P.green[4]); q.px([10, 17, 14, 16], P.green[4]);
  }),
  // Kristallkoloss: Kristall auf Fels
  uni_kristallkoloss: crest(ROCK, (q) => { crystal(q, 12, 17, 12, 5, 3.4, P.teal); q.poly([[12, 13], [14, 15.5], [12, 18], [10, 15.5]], P.gold[3]); q.poly([[12, 13], [12, 18], [10, 15.5]], P.gold[4]); }),
  // Ignarok: Flamme über Schlacke
  uni_ignarok: crest([P.ash[0], P.ash[1], P.ash[2], P.ash[3], P.ash[4]], (q) => {
    q.poly([[12, 5], [15, 10], [16, 8], [17, 13], [15, 17], [9, 17], [7, 13], [8, 9], [10, 11]], P.fire[2]); q.poly([[12, 9], [14, 13], [13, 16], [11, 16], [10, 13]], P.fire[3]); q.px([12, 14, 12, 15], P.fire[4]);
  }),
  // Ysolde: Eiskristall
  uni_ysolde: crest([P.blue[0], P.blue[1], P.blue[2], P.blue[3], P.ice[3]], (q) => {
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 - Math.PI / 2, x = 12 + Math.cos(a) * 5.4, y = 11.5 + Math.sin(a) * 5.4; q.line(12, 11.5, x, y, WHITE); const mx = 12 + Math.cos(a) * 3.4, my = 11.5 + Math.sin(a) * 3.4; q.set(mx + Math.cos(a + 1.2) * 1.5, my + Math.sin(a + 1.2) * 1.5, P.ice[4]); q.set(mx + Math.cos(a - 1.2) * 1.5, my + Math.sin(a - 1.2) * 1.5, P.ice[4]); }
    q.rect(11, 11, 2, 2, WHITE);
  }),
  // Archivar: Auge im Bahnring
  uni_archivar: crest([P.blue[0], mix(P.blue[1], P.steel[1], 0.5), mix(P.blue[2], P.steel[2], 0.6), P.steel[3], P.steel[4]], (q) => {
    for (let t = 0; t < 6.3; t += 0.06) q.set(12 + Math.cos(t) * 5.6, 11.5 + Math.sin(t) * 3, P.gold[4]);
    q.ell(12, 11.5, 2.4, 2.4, WHITE); q.ell(12, 11.5, 1.4, 1.4, P.teal[2]); q.set(11, 11, P.teal[4]);
    q.px([12, 16, 12, 17], P.gold[4]); q.px([12, 6, 12, 7], P.gold[4]);
  }),
  // Hohlkönig: hohle Krone
  uni_hohlkoenig: crest([P.shadow[0], P.shadow[2], P.violet[1], P.violet[2], P.violet[3]], (q) => {
    q.poly([[7, 15], [7, 8], [10, 12], [12, 6], [14, 12], [17, 8], [17, 15]], P.gold[3]); q.poly([[7, 15], [7, 8], [10, 12], [12, 6], [12, 15]], P.gold[4]); q.rect(7, 14, 11, 2, P.gold[2]); q.rect(7, 14, 5, 1, P.gold[3]);
    q.poly([[12, 9], [13.5, 12.5], [10.5, 12.5]], P.shadow[0]); q.set(12, 12, P.pink[4]);
  }),
};

// ================================================================ Buff-Kachel
const BUFFS: Record<string, Fn> = {
  // Ausgeruht: pralles Kissen im Herdfeuerlicht, darüber zwei Z
  buff_ausgeruht: (p) => {
    const H: Ramp = [P.wood[0], mix(P.red[1], P.wood[1], 0.5), mix(P.fire[1], P.wood[2], 0.45), mix(P.fire[2], P.tan[2], 0.5), P.gold[4]], C = P.cream;
    iconTile(p, H);
    onTile(p, P.wood[0], (q) => {
      // Kissen
      q.poly([[3, 14], [6, 12], [18, 12], [21, 14], [20, 19], [18, 21], [6, 21], [4, 19]], C[3]);
      q.poly([[3, 14], [6, 12], [14, 12], [10, 17], [4, 19]], C[4]); q.poly([[17, 15], [21, 14], [20, 19], [18, 21], [13, 21]], C[2]);
      q.px([3, 14, 21, 14], C[4]); q.px([2, 13, 22, 13, 3, 20, 21, 20], P.gold[3]);
      q.line(8, 16, 12, 17, C[2]); q.line(12, 17, 16, 15, C[2]); q.px([6, 13, 7, 13, 8, 13], WHITE);
      // Z z
      q.rect(12, 3, 6, 1, WHITE); q.px([17, 4, 16, 5, 15, 6, 14, 7, 13, 8], WHITE); q.rect(12, 9, 6, 1, WHITE);
      q.rect(5, 6, 4, 1, P.gold[4]); q.px([8, 7, 7, 8, 6, 9], P.gold[4]); q.rect(5, 10, 4, 1, P.gold[4]);
    });
  },
};
/** Icons, die ihren Rahmen selbst mitbringen (keine Außenkontur) */
export const HOME_FLAT = new Set(Object.keys(BUFFS));

export const HOME_ICONS: Record<string, Fn> = { ...BOSS, ...MARKS, ...ITEMS, ...UNIQUE, ...BUFFS };

/** Lichtpunkte/Schein nach der Kontur */
export const HOME_GLOW: Record<string, Fn> = {
  tro_b_dornenmutter: (p) => { soft(p, 21, 4, alpha(P.red[3], 230)); soft(p, 21, 6, alpha(P.red[2], 170)); soft(p, 1, 11, alpha(P.pink[4], 200)); },
  tro_b_kristallkoloss: (p) => {
    spark(p, 21, 3, P.teal[4]);
    for (const [r, a] of [[3, 200], [5, 120]] as const) for (let t = -0.9; t < 0.3; t += 0.12) soft(p, 14 + Math.cos(t) * (r + 4), 6 + Math.sin(t) * (r + 4), alpha(P.gold[4], a));
  },
  tro_b_ignarok: (p) => { halo(p, 12, 19, 8, P.fire[2], 60); soft(p, 3, 21, alpha(P.fire[3], 220)); soft(p, 20, 22, alpha(P.fire[2], 200)); },
  tro_b_ysolde: (p) => { spark(p, 4, 4, P.ice[4]); soft(p, 21, 7, alpha(WHITE, 220)); soft(p, 9, 22, alpha(P.ice[4], 200)); },
  tro_b_archivar: (p) => { spark(p, 22, 6, P.gold[4]); soft(p, 2, 20, alpha(P.teal[4], 200)); soft(p, 22, 20, alpha(P.gold[4], 170)); },
  tro_b_hohlkoenig: (p) => { halo(p, 12, 9, 6, P.violet[4], 46); soft(p, 3, 6, alpha(P.violet[4], 220)); soft(p, 20, 9, alpha(P.pink[3], 190)); soft(p, 2, 23, alpha(P.violet[3], 160)); },
  tro_b_vael: (p) => { halo(p, 12, 16, 11.5, PALE, 46); },
  tro_b_aetherion: (p) => { halo(p, 11, 14, 12, P.teal[4], 30); spark(p, 21, 5, P.teal[4]); soft(p, 2, 4, alpha(WHITE, 210)); },
  tro_m_riss10: (p) => { halo(p, 11, 12, 12, P.violet[3], 40); soft(p, 20, 3, alpha(P.pink[4], 220)); soft(p, 4, 20, alpha(P.teal[4], 200)); soft(p, 21, 18, alpha(P.violet[4], 180)); },
  tro_m_riss20: (p) => { spark(p, 20, 20, P.violet[4]); soft(p, 3, 19, alpha(P.teal[4], 200)); },
  tro_m_riss30: (p) => { halo(p, 11, 11.5, 9, P.violet[3], 36); soft(p, 3, 21, alpha(P.gold[4], 210)); soft(p, 2, 2, alpha(P.pink[4], 190)); },
  tro_m_sieben: (p) => { halo(p, 11.5, 4, 5.5, P.fire[3], 70); },
  tro_m_ende1: (p) => { spark(p, 3, 4, P.blue[4]); soft(p, 21, 21, alpha(P.blue[3], 200)); },
  tro_m_ende2: (p) => { soft(p, 22, 3, alpha(WHITE, 200)); soft(p, 18, 22, alpha(P.teal[3], 170)); },
  tro_m_ende3: (p) => {
    // Schwingungsbögen neben den Zinken, ein kleines Kreuz (Fis)
    for (const [r, a] of [[2.5, 220], [5, 130]] as const) for (let t = -0.8; t <= 0.8; t += 0.1) { soft(p, 17.5 + Math.cos(t) * r, 6 + Math.sin(t) * r * 1.6, alpha(P.gold[4], a)); soft(p, 6.5 - Math.cos(t) * r, 6 + Math.sin(t) * r * 1.6, alpha(P.gold[4], a)); }
    for (const y of [17, 19]) for (let x = 18; x <= 22; x++) soft(p, x, y, alpha(WHITE, 230));
    for (const x of [19, 21]) for (let y = 15; y <= 21; y++) soft(p, x, y, alpha(WHITE, 230));
  },
  pet_pilzling: (p) => { soft(p, 2, 3, alpha(WHITE, 210)); soft(p, 21, 11, alpha(P.red[4], 190)); },
};
