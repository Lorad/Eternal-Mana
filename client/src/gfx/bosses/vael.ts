/**
 * Vael, Hüter der Dunkelheit (Dunkel, Prüfung in Kapitel 9): ein Mensch, kein Ungeheuer – hager, tausend Jahre müde,
 * im verblichenen Ordensmantel. In der Hand die Laterne mit dem einen fahlen Licht; seine Angriffe sind der Schatten,
 * den dieses Licht wirft. Sein „Tod“ ist ein Nachgeben: Er senkt die Laterne und kniet. 96×96, Gestalt ca. 70 px hoch.
 */
import { Px, bez, tube } from '../draw';
import type { Pt } from '../draw';
import { P, INK, WHITE, alpha, mix, rnd2 } from '../palette';
import type { Ramp } from '../palette';
import { pk, R, clamp, glow, lay, lerp, rays, spark, spline } from './kit';
import type { BFr, BossDef } from './kit';
import { ik } from '../mobs/kit';

const GY = 89, CX = 45;
/** Ordensmantel: Indigo, ins Violette verblichen (die Rampen nutzt auch Vaels NPC-Erscheinung in chars/npcs.ts) */
export const MANT: Ramp = [mix(P.violet[0], P.blue[0], 0.5), mix(P.violet[1], P.blue[0], 0.45), mix(P.violet[1], P.blue[1], 0.5), mix(P.violet[2], P.blue[1], 0.45), mix(P.violet[3], P.steel[2], 0.45)];
/** Untergewand: graues Violett */
export const UNDER: Ramp = [P.shadow[0], P.shadow[1], mix(P.shadow[2], P.ash[2], 0.5), mix(P.shadow[3], P.ash[3], 0.5), mix(P.shadow[4], P.ash[4], 0.5)];
/** verblichenes Gold des Ordens */
export const OG: Ramp = [mix(P.gold[0], P.ash[1], 0.45), mix(P.gold[1], P.ash[3], 0.4), mix(P.gold[2], P.ash[4], 0.3), mix(P.gold[3], P.cream[2], 0.25), P.gold[4]];
export const SK: Ramp = [mix(P.skin[0], P.shadow[3], 0.5), mix(P.skin[1], P.bone[1], 0.5), mix(P.skin[2], P.bone[2], 0.5), mix(P.skin[3], P.bone[3], 0.45), mix(P.skin[4], P.bone[4], 0.5)];
export const HAIR: Ramp = [P.bone[0], P.bone[1], P.bone[2], P.bone[3], P.bone[4]];
export const LIRON: Ramp = [P.ash[0], P.steel[0], P.steel[1], P.steel[2], P.steel[3]];
/** das fahle Licht: kühles Weiß mit einem Rest Wärme */
export const PALE: Ramp = [mix(P.steel[2], P.shadow[3], 0.4), mix(P.ice[2], P.cream[2], 0.5), mix(P.ice[3], P.cream[3], 0.5), mix(P.ice[4], P.cream[4], 0.5), WHITE];
/** geworfener Schatten */
const SH: Ramp = [mix(INK, P.shadow[0], 0.5), P.shadow[0], P.shadow[1], mix(P.shadow[3], P.violet[1], 0.5), P.violet[2]];
export const HOODDARK = mix(INK, MANT[0], 0.45);

interface V { dy: number; lean: number; hd: Pt; bow: number; hand: Pt; free: Pt; sw: number; light: number; kn: number; ground: boolean; blink: boolean; open: boolean; heart: boolean; ph: number; f: BFr }

function pose(f: BFr): V {
  const i = f.i;
  const z: V = { dy: 0, lean: 0, hd: [0, 1], bow: 0, hand: [66, 48], free: [43, 54], sw: 0, light: 0.6, kn: 0, ground: false, blink: false, open: false, heart: false, ph: f.ph, f };
  switch (f.a) {
    case 'idle': z.dy = [0, 0, -1, -1, -1, 0][i]; z.hand = [66, 48 + z.dy]; z.free = [43, 54 + z.dy]; z.sw = [0, 1, 1, 0, -1, -1][i]; z.light = 0.6 + [0, 0.1, 0.2, 0.12, 0.02, -0.05][i]; z.blink = i === 4; break;
    case 'windup': z.open = true; z.lean = [-1, -2][i]; z.dy = [0, -1][i]; z.hd = pk([[0, 0], [0, -1]], i); z.hand = pk([[65, 36], [62, 23]], i); z.free = pk([[44, 52], [45, 50]], i); z.light = [1, 1.4][i]; z.sw = [-1, 0][i]; break;
    case 'attack': z.open = i < 3; z.lean = [1, 3, 3, 1][i]; z.dy = [0, 1, 1, 0][i]; z.hd = pk([[1, 1], [2, 2], [2, 2], [1, 1]], i); z.hand = pk([[67, 32], [71, 46], [70, 48], [67, 48]], i); z.sw = [2, 3, 1, 0][i]; z.light = [1.5, 1.2, 0.9, 0.7][i]; z.free = pk([[45, 51], [46, 53], [46, 54], [44, 54]], i); break;
    case 'special': z.open = true; z.dy = [-1, -2, -1, -2][i]; z.hd = [0, 0]; z.hand = pk([[63, 26], [63, 24], [63, 26], [63, 27]], i); z.free = pk([[28, 60], [27, 58], [28, 60], [29, 61]], i); z.light = [1.2, 1.5, 1.2, 1.5][i]; z.ph = i * 1.57; break;
    case 'hit': z.lean = [-3, -1][i]; z.hd = pk([[-2, 0], [-1, 1]], i); z.hand = pk([[67, 45], [66, 47]], i); z.sw = [3, 1][i]; z.light = 0.3; z.free = pk([[41, 52], [42, 54]], i); break;
    case 'death':
      // Nachgeben: Arm sinkt, er geht auf ein Knie, stellt die Laterne ab, legt die Hand aufs Herz und neigt den Kopf
      z.kn = [0, 0, 0.35, 0.75, 1, 1, 1, 1][i]; z.dy = R(z.kn * 18); z.lean = [-1, 0, 1, 1, 1, 1, 1, 1][i];
      z.bow = [0, 0.3, 0.45, 0.6, 0.8, 1, 1, 1][i]; z.hd = [R(z.bow * 2), 1 + R(z.bow * 3)];
      z.hand = pk([[65, 51], [64, 58], [64, 66], [65, 72], [66, 74], [66, 74], [66, 74], [66, 74]], i);
      z.free = pk([[43, 55], [43, 56], [43, 61], [43, 68], [43, 72], [43, 73], [43, 73], [43, 73]], i);
      z.ground = i >= 4; z.sw = [1, 0, 0, 0, 0, 0, 0, 0][i]; z.light = [0.35, 0.4, 0.45, 0.5, 0.55, 0.5, 0.6, 0.55][i]; z.ph = i * 0.5;
      break;
  }
  return z;
}

// ---------------------------------------------------------------- Laterne
/** Laterne; (x, y) = oberster Punkt des Tragrings. Liefert die Lichtmitte. */
function lantern(p: Px, x: number, y: number, L: number, sw: number): Pt {
  x = R(x); y = R(y);
  const bx = x + R(sw * 0.5), cx = x + R(sw);
  lay(p, (l) => {
    l.px([x, y, x - 1, y + 1, x + 1, y + 1, x, y + 2], LIRON[3]); l.set(x - 1, y + 1, LIRON[4]);
    l.rect(bx - 1, y + 3, 3, 1, OG[3]); l.rect(bx - 2, y + 4, 5, 1, OG[2]); l.set(bx - 2, y + 4, OG[4]); l.set(bx + 2, y + 4, OG[1]);
    l.rect(cx - 4, y + 5, 9, 1, LIRON[2]); l.set(cx - 4, y + 5, LIRON[4]); l.rect(cx + 2, y + 5, 3, 1, LIRON[1]);
    for (let j = 0; j < 6; j++) for (let i = -3; i <= 3; i++) {
      const d = Math.abs(i) * 0.9 + Math.abs(j - 2.5);
      let c: number;
      if (Math.abs(i) === 3) c = i < 0 ? LIRON[3] : LIRON[1];
      else if (L < 0.4) c = d < 0.8 ? PALE[3] : d < 2 ? PALE[1] : PALE[0];
      else c = d < 0.8 + L * 0.9 ? WHITE : d < 2.4 + L * 0.5 ? PALE[3] : PALE[L > 1 ? 3 : 2];
      l.set(cx + i, y + 6 + j, c);
    }
    l.rect(cx - 4, y + 12, 9, 1, LIRON[2]); l.set(cx - 4, y + 12, LIRON[4]); l.rect(cx - 3, y + 13, 7, 1, LIRON[1]); l.set(cx + 4, y + 12, LIRON[0]);
  });
  return [cx, y + 9];
}
function lanternLight(p: Px, c: Pt, L: number, rot: number): void {
  glow(p, c[0], c[1], 9 + L * 9, PALE[2], 20 + L * 22);
  glow(p, c[0], c[1], 5 + L * 3, PALE[3], 30 + L * 30);
  if (L > 0.9) rays(p, c[0], c[1], 6, 12 + L * 10, 10, rot, PALE[4], 90 + L * 40);
}

// ---------------------------------------------------------------- Gestalt
/** Gesicht 7×12 im Kapuzenschatten: d Schatten, t tiefer Hautschatten, s/m/l Haut, b Braue, E Lid, p fahler Augenglanz, o Mund, w/g/G Bart */
const FACE = [
  'ddddddd',
  'dtmmmtd',
  'tGGmGGt',
  'tEEmEEt',
  'tsslsst',
  '.smlms.',
  '.tmlmt.',
  '.gwowg.',
  '.wwwww.',
  '.wgwwG.',
  '..wwG..',
  '...g...',
];
function head(l: Px, hx: number, hy: number, z: V): void {
  // hx,hy = linke obere Ecke der 13×19-Kapuzenbox
  const at = (q: Pt): Pt => [hx + q[0], hy + q[1]];
  const hood = new Px(l.w, l.h);
  hood.poly(([[1, 19], [0, 12], [1, 5], [3, 1], [6, 0], [9, 0], [11, 2], [12, 7], [12, 13], [11, 19]] as Pt[]).map(at), 1);
  cloth(l, hood, MANT, 5, 0.6, hy, hy + 19, 0.5);
  // Kapuzennaht, Zipfel nach hinten
  l.line(hx + 6, hy + 1, hx + 3, hy + 5, MANT[4]); l.line(hx + 10, hy + 2, hx + 11, hy + 7, MANT[1]); l.px([hx + 1, hy + 9, hx + 1, hy + 12], MANT[3]);
  l.poly(([[3, 18], [2, 11], [3, 6], [5, 4], [8, 4], [10, 6], [10, 12], [9, 18]] as Pt[]).map(at), HOODDARK);
  const T = mix(SK[1], HOODDARK, 0.3);
  const col: Record<string, number> = { d: HOODDARK, t: T, s: SK[1], m: SK[2], l: SK[3], b: mix(SK[0], INK, 0.5), E: mix(SK[0], INK, 0.3), p: PALE[2], o: mix(SK[0], P.shadow[2], 0.6), w: HAIR[3], g: HAIR[2], G: HAIR[1] };
  const drop = R(z.bow * 6);
  FACE.forEach((row, j) => {
    if (j < drop) return;
    for (let i = 0; i < 7; i++) {
      let ch = row[i];
      if (ch === '.') continue;
      if (ch === 'E' && z.open && !z.blink && z.bow < 0.4 && (i === 2 || i === 5)) ch = 'p';
      l.set(hx + 3 + i, hy + 5 + j, col[ch]);
    }
  });
  // zwei dünne graue Strähnen fallen aus der Kapuze
  for (const [dx, y0, len] of [[2, 11, 9], [10, 12, 7]] as const) for (let k = 0; k < len; k++) l.set(hx + dx, hy + y0 + k, HAIR[k % 3 === 0 ? 3 : dx < 6 ? 2 : 1]);
  // die Kapuze sinkt beim Verneigen über das Gesicht
  if (drop > 0) { l.poly(([[2, 7], [3, 5], [5, 4], [8, 4], [10, 6], [11, 5 + drop], [2, 5 + drop]] as Pt[]).map(at), MANT[2]); l.rect(hx + 2, hy + 5 + drop, 10, 1, MANT[0]); l.rect(hx + 4, hy + 5, 5, 1, MANT[3]); l.rect(hx + 3, hy + 4 + drop, 8, 1, OG[1]); }
  // verblichene Goldborte am Kapuzenrand
  else for (const [x, y] of [[2, 8], [2, 10], [3, 6], [10, 7], [10, 9], [10, 11]] as const) l.set(hx + x, hy + y, x < 6 ? OG[2] : OG[1]);
}
/**
 * Tuchschattierung: füllt die Maske m zeilenweise, Licht von links oben, senkrechte Falten (zum Saum hin tiefer).
 * folds = Faltendichte, ph = Phase (Bewegung), y0..y1 = Höhe des Stoffstücks, bias hellt insgesamt auf.
 */
function cloth(l: Px, m: Px, r: Ramp, folds: number, ph: number, y0: number, y1: number, bias = 0): void {
  for (let y = 0; y < m.h; y++) {
    let xl = -1, xr = -1;
    for (let x = 0; x < m.w; x++) if (m.d[y * m.w + x]) { if (xl < 0) xl = x; xr = x; }
    if (xl < 0) continue;
    const v = clamp((y - y0) / Math.max(1, y1 - y0));
    for (let x = xl; x <= xr; x++) {
      if (!m.d[y * m.w + x]) continue;
      const u = (x - xl) / Math.max(1, xr - xl), fold = Math.sin(u * folds + v * 1.3 + ph);
      const t = 2.55 + bias - u * 1.7 + fold * (0.5 + v * 0.85) + (u < 0.07 ? 0.7 : 0) - (u > 0.93 ? 0.7 : 0);
      l.set(x, y, r[clamp(Math.floor(t), 0, r.length - 1)]);
    }
  }
}

function sleeve(l: Px, sh: Pt, hand: Pt, dir: number, lit: number): void {
  const el = ik(sh, hand, 12, 12, dir);
  tube(l, [sh, el], 3.1, 2.7, MANT, 1 + lit); tube(l, [el, hand], 2.7, 2.3, MANT, 1 + lit);
  // weiter Ärmel, Goldborte am Saum
  const mx = lerp(el[0], hand[0], 0.55), my = lerp(el[1], hand[1], 0.55);
  l.poly([[el[0], el[1] + 2], [hand[0] - 1, hand[1] + 2], [hand[0] - 3, hand[1] + 7], [mx - 2, my + 6]], MANT[1 + lit]);
  l.line(hand[0] - 1, hand[1] + 3, hand[0] - 3, hand[1] + 7, OG[2]); l.set(hand[0] - 3, hand[1] + 7, OG[3]);
  const hx = R(hand[0]), hy = R(hand[1]);
  l.rect(hx - 2, hy - 2, 4, 1, OG[2]); l.set(hx - 2, hy - 2, OG[3]);
  l.rect(hx - 1, hy - 1, 3, 3, SK[2]); l.set(hx - 1, hy - 1, SK[4]); l.px([hx + 1, hy + 1, hx, hy + 1], SK[1]);
}

/** verblichene Stola (3) */
export const STOLE: Ramp = [mix(MANT[3], P.bone[1], 0.5), mix(MANT[4], P.bone[2], 0.55), mix(MANT[4], P.bone[3], 0.6)];
const ROPE = mix(P.tan[2], P.ash[3], 0.4), ROPE_D = mix(P.tan[1], P.ash[2], 0.4);

function figure(p: Px, z: V): void {
  const S: Pt = [CX + z.lean, 38 + z.dy], kn = z.kn, hemL = 17 + kn * 5, hemR = 13 + kn * 5, hx = S[0] - 5 + z.hd[0], hy = S[1] - 19 + z.hd[1];
  const backArm = (): void => { lay(p, (l) => sleeve(l, [S[0] - 8, S[1] + 3], z.free, 1, 0)); };
  // hinterer Arm (hält den Mantel zusammen)
  if (!z.heart) backArm();
  // Mantel: fällt gerade, Saum abgewetzt; beim Knien breitet er sich aus
  lay(p, (l) => {
    const m = new Px(l.w, l.h);
    m.poly([[S[0] - 9, S[1]], [S[0] - 5, S[1] - 4], [S[0] + 5, S[1] - 4], [S[0] + 9, S[1]], [S[0] + 11, S[1] + 12], [CX + lerp(12, 17, kn), lerp(66, 80, kn)], [CX + hemR, GY + 1], [CX - hemL, GY + 1], [CX - hemL + 1, GY - 3], [CX - lerp(14, 19, kn), lerp(70, 80, kn)], [S[0] - 11, S[1] + 12]], 1);
    if (kn > 0.3) { m.ell(CX - 16, GY - 3, 11 * kn, 3.6, 1); m.ell(CX + 10, GY - 9 * kn, 8 * kn, 8 * kn, 1); m.rect(CX + 2, GY - R(9 * kn), R(16 * kn), R(9 * kn) + 1, 1); }
    for (let x = 0; x < m.w; x++) { const h = rnd2(x >> 1, 3, 17); if (h < 0.34) m.set(x, GY, 0); if (h < 0.1) m.set(x, GY - 1, 0); }
    for (let y = GY + 1; y < m.h; y++) for (let x = 0; x < m.w; x++) m.set(x, y, 0);
    cloth(l, m, MANT, 13, 0.4 + Math.sin(z.ph) * 0.3, S[1], GY, 0);
    // Flicken und Risse, Reste der Goldborte am Saum
    for (const [x, y] of [[-9, 60], [9, 71], [-11, 77], [8, 55]] as const) { const yy = lerp(y, y + 10, kn); if (yy < GY - 4) { l.line(CX + x, yy, CX + x + 1, yy + 3, MANT[0]); l.set(CX + x - 1, yy + 1, MANT[3]); } }
    for (let x = -R(hemL) + 1; x < hemR; x++) if (m.get(CX + x, GY - 3) && rnd2(x, 5, 7) < 0.45) l.set(CX + x, GY - 3, rnd2(x, 6, 7) < 0.3 ? OG[2] : OG[1]);
    if (kn > 0.5) { bez([CX + 3, GY - 3], [CX + 9, GY - 20 * kn], [CX + 17, GY - 4], 16).forEach((q, k) => { l.set(q[0], q[1], MANT[k < 9 ? 4 : 2]); }); l.line(CX + 11, GY - 12, CX + 13, GY - 4, MANT[0]); }
  });
  // Untergewand in der Mantelöffnung, Stola mit den sieben Sitzen, Strick
  lay(p, (l) => {
    const y0 = S[1] + 9, y1 = GY - 1, mid = (y: number): number => lerp(S[0] + 1, CX + 1 + kn * 3, clamp((y - y0) / (y1 - y0)));
    for (let y = y0; y <= y1; y++) {
      const t = clamp((y - y0) / (y1 - y0)), m = mid(y), half = 1.6 + t * 3, a = R(m - half), b = R(m + half), c = R(m);
      for (let x = a; x <= b; x++) l.set(x, y, UNDER[x === a ? 3 : x >= b - 1 ? 1 : 2]);
      l.set(c - 1, y, STOLE[2]); l.set(c, y, STOLE[1]); l.set(c + 1, y, STOLE[0]);
      if (y % 4 !== 0) l.set(a - 1, y, OG[y % 8 === 1 ? 2 : 1]); if (y % 4 !== 2) l.set(b + 1, y, OG[0]);
    }
    for (let k = 0; k < 7; k++) { const y = y0 + 3 + k * 5 - R(kn * k * 1.8); if (y < y1 - 1) { const c = R(mid(y)); l.set(c, y, OG[3]); l.set(c, y + 1, OG[1]); } }
    const by = S[1] + 18, bm = R(mid(by));
    l.rect(bm - 3, by, 7, 1, ROPE); l.rect(bm - 3, by + 1, 7, 1, ROPE_D); l.px([bm + 2, by + 2, bm + 2, by + 3, bm + 3, by + 4, bm + 3, by + 5], ROPE); l.set(bm + 3, by + 6, ROPE_D);
  }, false);
  // Schulterkragen mit Goldsaum und Ordensschließe
  lay(p, (l) => {
    const m = new Px(l.w, l.h);
    m.poly([[S[0] - 12, S[1] + 6], [S[0] - 10, S[1] - 1], [S[0] - 6, S[1] - 5], [S[0] + 6, S[1] - 5], [S[0] + 10, S[1] - 1], [S[0] + 12, S[1] + 6], [S[0] + 7, S[1] + 9], [S[0], S[1] + 10], [S[0] - 7, S[1] + 9]], 1);
    cloth(l, m, MANT, 9, 1.2, S[1] - 5, S[1] + 22, 1);
    for (let x = -11; x <= 11; x++) { const y = R(S[1] + 8.6 - ((x * x) / 121) * 3); if (m.get(S[0] + x, y)) l.set(S[0] + x, y, (x + 12) % 4 === 0 ? OG[3] : (x + 12) % 4 === 2 ? OG[1] : OG[2]); }
    // Schließe: Scheibe mit hellem Stein
    l.rect(S[0], S[1] + 1, 3, 3, OG[2]); l.px([S[0] + 1, S[1], S[0] + 1, S[1] + 4, S[0] - 1, S[1] + 2, S[0] + 3, S[1] + 2], OG[2]); l.set(S[0] + 1, S[1] + 2, PALE[3]); l.set(S[0], S[1] + 1, OG[4]); l.set(S[0] + 2, S[1] + 3, OG[1]);
  });
  lay(p, (l) => head(l, hx, hy, z));
  // vorderer Arm mit der Laterne (bzw. beide Hände am Ring, bzw. Hand aufs Herz)
  const sh: Pt = [S[0] + 8, S[1] + 3];
  if (z.heart) backArm();
  lay(p, (l) => sleeve(l, sh, z.hand, 1, 1));
}

/** Kantenlicht der Laterne: Pixel direkt hinter der Kontur, die dem Licht zugewandt sind. */
function litEdge(p: Px, c: Pt, r: number, t: number): void {
  const src = p.d.slice(), op = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < p.w && y < p.h && src[y * p.w + x] >>> 24 >= 200;
  for (let y = 1; y < p.h - 1; y++) for (let x = 2; x < p.w - 2; x++) {
    if (!op(x, y)) continue;
    const dx = c[0] - x, dy = c[1] - y, d = Math.hypot(dx, dy);
    if (d > r || d < 3) continue;
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
    const edge = Math.abs(dx) > Math.abs(dy) * 0.6 ? op(x + sx, y) && !op(x + 2 * sx, y) : op(x, y + sy) && !op(x, y + 2 * sy);
    if (edge) p.d[y * p.w + x] = (0xff000000 | (mix(src[y * p.w + x], PALE[3], t * (d < r * 0.55 ? 1 : 0.6)) & 0xffffff)) >>> 0;
  }
}

// ---------------------------------------------------------------- Schatten
/** Füllt eine Maske als Schatten: dunkler Kern, violetter Lichtsaum oben links, ausgefranster Rand. */
function shadowFill(p: Px, m: Px, seed: number, a = 240): void {
  const on = (x: number, y: number): boolean => m.get(x, y) !== 0;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (!on(x, y)) continue;
    const edge = !on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1), lit = !on(x - 1, y) || !on(x, y - 1);
    if (edge && rnd2(x, y, seed) < 0.22) continue;
    const deep = on(x - 2, y) && on(x + 2, y) && on(x, y - 2) && on(x, y + 2);
    p.blend(x, y, alpha(edge ? (lit ? P.violet[3] : P.violet[1]) : deep ? SH[0] : SH[1], edge ? a - 20 : a));
  }
  for (let k = 0; k < 26; k++) { const x = R(rnd2(k, 1, seed) * m.w), y = R(rnd2(k, 2, seed) * m.h); if (!on(x, y) && (on(x + 2, y) || on(x - 2, y) || on(x, y + 2))) p.blend(x, y, alpha(SH[3], 170)); }
}
const blob = (m: Px, path: ReadonlyArray<Pt>, r0: number, r1: number): void => { const n = path.length - 1 || 1; path.forEach((q, i) => { const r = r0 + ((r1 - r0) * i) / n; m.ell(q[0], q[1], r, r, 1); }); };

/**
 * Der Schatten, den die Laterne hinter ihn wirft, richtet sich auf: t = Größe 0..1, arm = Ziel der Klaue (oder null),
 * wave = Phase der Wellenkontur.
 */
function shade(p: Px, t: number, arm: Pt | null, wave: number, seed: number, fade = 1, lift = 16): void {
  const m = new Px(p.w, p.h), top = GY - 66 * t, lx = CX - 20;
  // Lache am Boden, Leib, Kapuzenkopf
  m.ell(CX - 12, GY - 1.5, 20 + t * 4, 2.6, 1);
  const body = spline([[CX - 6, GY - 3], [lx + 2 + Math.sin(wave) * 2, GY - 24 * t], [lx - 2 + Math.sin(wave + 1.5) * 2, GY - 46 * t], [lx + 2, top + 4]], 8);
  blob(m, body, 9 * (0.6 + 0.4 * t), 6.5 * t + 1);
  if (t > 0.4) { m.poly([[lx - 6, top + 6], [lx - 5, top - 2], [lx, top - 7], [lx + 6, top - 5], [lx + 9, top + 2], [lx + 8, top + 8]], 1); m.poly([[lx - 14 * t, top + 10], [lx - 4, top + 6], [lx + 8, top + 7], [lx + 16 * t, top + 13], [lx + 9, top + 20], [lx - 9, top + 19]], 1); }
  let tip: Pt | null = null;
  if (arm && t > 0.5) {
    const shd: Pt = [lx + 10, top + 12], mid: Pt = [lerp(shd[0], arm[0], 0.5) + 2, Math.max(5, Math.min(shd[1], arm[1]) - lift)];
    const path = spline([shd, mid, arm], 10);
    blob(m, path, 4.6, 3.2);
    // drei Klauen
    const a = path[path.length - 1], b = path[Math.max(0, path.length - 6)], ang = Math.atan2(a[1] - b[1], a[0] - b[0]);
    m.ell(a[0], a[1], 4, 4, 1);
    for (const da of [-0.7, 0, 0.7]) { const ca = Math.cos(ang + da), sa = Math.sin(ang + da), len = da === 0 ? 14 : 11; m.poly([[a[0] - sa * 2.6, a[1] + ca * 2.6], [a[0] + ca * len, a[1] + sa * len], [a[0] + sa * 2.6, a[1] - ca * 2.6]], 1); }
    tip = [a[0] + Math.cos(ang) * 14, a[1] + Math.sin(ang) * 14];
  }
  for (let y = GY + 1; y < m.h; y++) for (let x = 0; x < m.w; x++) m.d[y * m.w + x] = 0;
  shadowFill(p, m, seed, R(240 * fade));
  // zwei fahle Augen
  if (t > 0.6 && fade > 0.6) { p.set(lx - 1, top + 2, PALE[3]); p.set(lx + 4, top + 3, PALE[3]); p.set(lx, top + 2, PALE[1]); p.set(lx + 5, top + 3, PALE[1]); }
  if (tip) { p.blend(tip[0], tip[1], alpha(P.violet[4], 230)); }
}

const fn = (p: Px, f: BFr): void => {
  const z = pose(f), i = f.i;
  // --- hinter der Gestalt: geworfener Schatten
  if (f.a === 'windup') shade(p, [0.6, 1][i], i === 1 ? [CX + 7, 15] : null, i * 0.9, 31 + i, 1, 3);
  if (f.a === 'attack') {
    const tgt: Pt[] = [[80, 26], [82, GY - 18], [80, GY - 12], [0, 0]];
    shade(p, [1, 1, 0.85, 0.45][i], i < 3 ? tgt[i] : null, 1.8 + i * 0.7, 41 + i, [1, 1, 0.75, 0.5][i]);
  }
  if (f.a === 'special') {
    // die Dunkelheit sammelt sich um das eine Licht: Lache und aufsteigende Schattenzungen
    const m = new Px(p.w, p.h);
    m.ell(CX + 2, GY - 1.5, 40 + (i % 2) * 3, 3, 1);
    for (const [x, h, ph] of [[-34, 26, 0], [-24, 38, 1.3], [-15, 22, 2.2], [24, 30, 0.6], [34, 40, 1.9], [42, 22, 2.8]] as const) {
      const hh = h * (0.75 + 0.25 * Math.sin(z.ph + ph)), sway = Math.sin(z.ph * 1 + ph * 2) * 3;
      blob(m, spline([[CX + x, GY - 2], [CX + x + sway, GY - hh * 0.5], [CX + x - sway * 0.6 + (x < 0 ? 3 : -3), GY - hh]], 8), 3.4, 0.8);
    }
    for (let y = GY + 1; y < m.h; y++) for (let x = 0; x < m.w; x++) m.d[y * m.w + x] = 0;
    shadowFill(p, m, 51 + i);
  }
  figure(p, z);
  // --- Laterne und Licht
  let lc: Pt;
  const lpos: Pt = z.ground ? [66, GY - 14] : [z.hand[0], z.hand[1] + 2];
  {
    const tmp = new Px(p.w, p.h);
    lc = lantern(tmp, lpos[0], lpos[1], z.light, z.ground ? 0 : z.sw);
    lanternLight(p, lc, z.light, f.a === 'special' ? i * 0.16 : i * 0.3);
    litEdge(p, lc, 15 + z.light * 9, 0.2 + Math.min(0.25, z.light * 0.18));
    p.draw(tmp);
  }
  // Hand über dem Ring
  if (!z.ground) lay(p, (l) => { const hx = R(z.hand[0]), hy = R(z.hand[1]); l.rect(hx - 1, hy, 3, 2, SK[3]); l.set(hx - 1, hy, SK[4]); l.set(hx + 1, hy + 1, SK[1]); });
  if (z.ground) lay(p, (l) => { const hx = R(z.hand[0]), hy = R(z.hand[1]); l.rect(hx - 1, hy - 1, 3, 2, SK[3]); l.set(hx - 1, hy - 1, SK[4]); l.set(hx + 1, hy, SK[1]); });
  // --- vor der Gestalt
  if (f.a === 'windup') { spark(p, lc[0], lc[1], WHITE, PALE[3], 1 + i); for (let k = 0; k < 6; k++) { const a = k * 1.05 + i * 0.5, d = 13 - i * 4; p.blend(lc[0] + Math.cos(a) * d, lc[1] + Math.sin(a) * d, alpha(k % 2 ? WHITE : PALE[3], 220)); } }
  if (f.a === 'attack') {
    if (i === 0) spark(p, lc[0], lc[1], WHITE, PALE[4], 3);
    if (i === 1 || i === 2) {
      // Einschlag der Schattenklaue: Schattendorne brechen aus dem Boden
      const k = i === 1 ? 1 : 0.6;
      lay(p, (l) => {
        for (const [x, h, lean] of [[70, 16, -3], [77, 24, 1], [84, 30, 4], [90, 16, 5]] as const) {
          const hh = h * k, tx = Math.min(93, x + lean * k), ty = GY - hh;
          l.poly([[x - 3, GY], [x - 1.5, GY - hh * 0.45], [tx, ty], [x + 2, GY - hh * 0.4], [x + 3, GY]], SH[1]);
          l.poly([[x - 1, GY], [tx, ty + 4], [x + 2, GY]], SH[0]);
          l.line(x - 3, GY - 1, tx, ty, SH[4]); l.set(tx, ty, P.violet[4]);
        }
      }, false);
      for (let j = 0; j < 9; j++) { const x = 64 + rnd2(j, i, 5) * 28, y = GY - 4 - rnd2(j, i, 6) * 30 * k; p.blend(x, y, alpha(j % 3 === 0 ? P.violet[4] : SH[3], 230 - j * 10)); }
      glow(p, 80, GY - 6, 12, P.violet[2], i === 1 ? 46 : 24);
    }
    if (i === 3) for (let j = 0; j < 7; j++) p.blend(68 + j * 4, GY - 3 - rnd2(j, 2, 9) * 14, alpha(SH[3], 200 - j * 16));
  }
  if (f.a === 'special') {
    for (let k = 0; k < 10; k++) { const cyc = (k * 5 + i * 5) % 20, x = CX - 34 + k * 8 + Math.sin(k * 2.1) * 3; p.blend(x, GY - 6 - cyc * 2, alpha(k % 3 ? PALE[3] : WHITE, 220 - cyc * 9)); }
    spark(p, lc[0], lc[1], WHITE, PALE[4], 2 + (i % 2));
  }
  if (f.a === 'idle') for (let k = 0; k < 3; k++) { const cyc = (k * 4 + i * 2) % 12; p.blend(lc[0] - 3 + k * 3 + Math.sin(k + i) * 1, lc[1] - 8 - cyc, alpha(PALE[3], 200 - cyc * 15)); }
  if (f.a === 'death' && i >= 5) for (let k = 0; k < 3; k++) { const cyc = (k * 4 + i * 3) % 12; p.blend(lc[0] - 2 + k * 2, lc[1] - 8 - cyc, alpha(PALE[3], 190 - cyc * 14)); }
};

export const vael: BossDef = { w: 96, h: 96, fn };
