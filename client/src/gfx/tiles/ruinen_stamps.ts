/**
 * Verlorene Ruinen – Farbtöne und vorgezeichnete Kleinmotive (Stempel) für Oberwelt und „Archiv der Stille“.
 * Leitfarbe Sandstein/Oliv, Gegenfarbe Moosgrün, Akzente Runengold und Arkanblau.
 */
import { INK, P, WHITE, alpha, mix, rng } from '../palette';
import { Px, bez } from '../draw';
import { flipStamp, stampOf, stampRows, type Stamp } from './core';
import { many, mkTuft, type TuftPal } from './frost_util';

// ---------------------------------------------------------------------------------------------------- Palette
export const SA = P.sand, TN = P.tan, CR = P.cream, G = P.green, F = P.forest, WD = P.wood;
const zShade = (c: number): number => mix(mix(c, F[1], 0.22), P.blue[1], 0.06);
const zSun = (c: number): number => mix(c, mix(P.gold[4], CR[3], 0.5), 0.22);
const zones = (r: number[]): number[][] => [r.map(zShade), r, r.map(zSun)];
/** trockenes Grasland: dunkles Oliv → Strohgelb */
export const GRS_N = [mix(SA[1], G[1], 0.35), mix(SA[2], G[2], 0.34), mix(mix(SA[2], SA[3], 0.4), G[3], 0.24), mix(SA[3], G[3], 0.17), mix(SA[3], SA[4], 0.32)];
export const GRS = zones(GRS_N);
/** Sand */
export const SAND_N = [mix(TN[1], SA[1], 0.5), mix(TN[2], SA[2], 0.5), mix(TN[3], SA[3], 0.5), mix(mix(TN[3], TN[4], 0.5), SA[4], 0.45), mix(TN[4], SA[4], 0.55)];
export const SAND = zones(SAND_N);
/** Sandstein (Mauern, Säulen): Fuge → Glanzlicht */
export const STN = [mix(TN[0], P.stone[0], 0.5), mix(TN[1], P.stone[1], 0.45), mix(TN[2], SA[2], 0.4), mix(TN[3], SA[3], 0.45), mix(TN[3], CR[3], 0.5), mix(TN[4], CR[4], 0.5)];
/** verwitterte Platten (Platz, Straße): grauer und kühler als die Mauern */
export const PLZ = STN.map((c, k) => mix(c, P.stone[Math.min(4, k)], 0.3));
export const MOSS = [mix(F[1], SA[0], 0.3), mix(F[2], G[1], 0.4), mix(F[2], G[2], 0.6), mix(F[3], G[3], 0.45), mix(G[3], SA[3], 0.3)];
/** Überwuchertes Mauerinneres: Dickicht (dunkel) → schattiges Gras */
export const TOPR = [mix(F[0], SA[0], 0.5), mix(F[1], SA[0], 0.4), mix(F[1], SA[1], 0.45), mix(F[2], SA[1], 0.5), mix(SA[1], G[1], 0.4), GRS[0][0], GRS[0][1], GRS[1][1]];
/** Mosaiksteinchen: Petrol, Terrakotta, Gold, Elfenbein (verblichen) */
export const TESS = [mix(P.teal[1], SA[1], 0.3), mix(P.teal[2], SA[2], 0.35), mix(P.red[2], TN[2], 0.5), mix(P.gold[2], SA[3], 0.3), mix(CR[3], SA[3], 0.3), mix(P.red[1], TN[1], 0.5)];
export const RUNE = [mix(P.blue[1], STN[1], 0.4), P.blue[3], P.ice[3]];
export const ARC = [mix(P.violet[1], P.blue[1], 0.4), mix(P.violet[2], P.blue[2], 0.5), mix(P.violet[3], P.blue[3], 0.5), mix(P.violet[4], P.ice[3], 0.5)];
/** verbrannter Boden des arkanen Felds */
export const ASH = [mix(P.ash[0], P.violet[0], 0.4), mix(P.ash[1], P.violet[0], 0.3), mix(P.ash[2], P.violet[1], 0.2), mix(P.ash[3], SA[1], 0.3), mix(P.ash[4], SA[2], 0.35)];
export const VOIDC = mix(WD[0], INK, 0.62);
export const JADE = mix(P.teal[0], F[0], 0.45);
export const BRASS = [mix(P.gold[0], INK, 0.25), mix(P.gold[1], TN[0], 0.25), mix(P.gold[2], TN[2], 0.25), P.gold[3], P.gold[4]];

/** Runen-Glyphen 5×7 (1 = Kerbe) */
export const GLYPHS: number[][] = [
  ['..#..', '.#.#.', '#...#', '#####', '#...#', '..#..', '..#..'],
  ['#...#', '#...#', '.#.#.', '..#..', '..#..', '.###.', '..#..'],
  ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'],
  ['#.#.#', '#.#.#', '.###.', '..#..', '.###.', '#...#', '#...#'],
  ['..#..', '..#..', '#####', '..#..', '.#.#.', '#...#', '.....'],
  ['##...', '.#...', '.###.', '...#.', '...##', '...#.', '.###.'],
  ['.#.#.', '#####', '.#.#.', '.#.#.', '#####', '.#.#.', '.....'],
  ['#####', '#....', '#.##.', '#..#.', '#.##.', '#....', '#####'],
].map((rows) => rows.flatMap((r) => [...r].map((ch) => (ch === '#' ? 1 : 0))));

// ---------------------------------------------------------------------------------------------------- Stempel
export const RS = {
  tuft: [] as Stamp[][][], tall: [] as Stamp[][], tiny: [] as Stamp[][], thistle: [] as Stamp[], bloom: [] as Stamp[], slab: [] as Stamp[], pebble: [] as Stamp[],
  shard: [] as Stamp[], vine: [] as Stamp[], mossBlob: [] as Stamp[], rubble: [] as Stamp[], stump: [] as Stamp[], keeper: [] as Stamp[], niche: [] as Stamp[],
  lily: [] as Stamp[], glyph: [] as Stamp[], post: [] as Stamp[], crack: [] as Stamp[], grit: [] as Stamp[], scorch: [] as Stamp[], reed: [] as Stamp[], faceCrack: [] as Stamp[],
};
const SH = alpha(mix(F[0], INK, 0.4), 75);

/** Halb versunkene Bodenplatte / Bruchstück: unregelmäßiges Vieleck mit Lichtkante oben links, unten von Gras überwachsen. */
function mkSlab(seed: number): Stamp {
  const r = rng(seed), w = 7 + ((r() * 10) | 0), h = 5 + ((r() * 6) | 0), p = new Px(w + 2, h + 3);
  const cut = [1 + ((r() * 3) | 0), (r() * 3) | 0, (r() * 4) | 0, 1 + ((r() * 3) | 0)], base = 2 + ((r() * 2) | 0);
  const inside = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < w && y < h && x + y >= cut[0] && (w - 1 - x) + y >= cut[1] && x + (h - 1 - y) >= cut[2] && (w - 1 - x) + (h - 1 - y) >= cut[3];
  const crackX = 2 + ((r() * (w - 4)) | 0), cracked = r() < 0.45;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!inside(x, y)) continue;
    let col = PLZ[base + 1];
    if (!inside(x, y - 1) || !inside(x - 1, y)) col = PLZ[base + 2];
    else if (!inside(x, y + 1) || !inside(x + 1, y)) col = PLZ[base];
    else if (r() < 0.08) col = PLZ[base];
    if (cracked && Math.abs(x - crackX - ((y * 0.6) | 0)) < 1 && y > 0) col = PLZ[0];
    p.set(x + 1, y, col);
    if (!inside(x, y + 1)) { p.set(x + 1, y + 1, PLZ[1]); p.set(x + 1, y + 2, SH); }
  }
  // Grasnarbe wächst von unten über die Kante
  for (let x = 0; x < w + 2; x++) if (r() < 0.5) { const gh = 1 + ((r() * 3) | 0); for (let k = 0; k < gh; k++) p.set(x, h + 1 - k, k === gh - 1 ? GRS_N[3] : GRS_N[1]); }
  return stampOf(p, (w + 2) >> 1, h);
}
/** Distel: graugrüner Stängel mit Stachelblättern und violettem Kopf (Anker = Fuß). */
function mkThistle(seed: number): Stamp {
  const r = rng(seed), h = 9 + ((r() * 4) | 0), p = new Px(9, h + 1), gs = mix(F[2], P.stone[2], 0.4), gl = mix(F[3], SA[3], 0.4);
  for (let y = 2; y < h; y++) p.set(4, y, y > h - 3 ? F[1] : gs);
  for (let k = 0; k < 3; k++) { const y = h - 2 - k * 2 - ((r() * 2) | 0), d = k & 1 ? 1 : -1; p.set(4 + d, y, gl); p.set(4 + 2 * d, y - 1, gs); if (r() < 0.6) p.set(4 + 3 * d, y - 1, gl); }
  p.set(3, 1, P.violet[2]); p.set(4, 1, P.violet[3]); p.set(5, 1, P.violet[2]); p.set(4, 0, P.pink[3]); p.set(3, 0, P.violet[3]); p.set(5, 0, P.violet[3]); p.set(4, 2, gl);
  p.set(4, h, SH); p.set(5, h, SH);
  return stampOf(p, 4, h - 1);
}
/** Hängende Ranke mit kleinen Blättern (Anker = oben). */
function mkVine(seed: number): Stamp {
  const r = rng(seed), len = 7 + ((r() * 9) | 0), p = new Px(7, len);
  let x = 3;
  for (let y = 0; y < len; y++) {
    p.set(x, y, y === len - 1 ? MOSS[3] : MOSS[1]);
    if (r() < 0.5) { const d = r() < 0.5 ? -1 : 1; p.set(x + d, y, MOSS[r() < 0.5 ? 3 : 2]); if (r() < 0.35) p.set(x + 2 * d, y + 1, MOSS[4]); }
    if (r() < 0.3) x = Math.max(1, Math.min(5, x + (r() < 0.5 ? -1 : 1)));
  }
  return stampOf(p, 3, 0);
}
/** Schutthaufen aus Sandsteinbrocken (Anker = unten Mitte). */
function mkRubble(seed: number, big: boolean): Stamp {
  const r = rng(seed), w = big ? 18 : 10, h = big ? 10 : 6, p = new Px(w, h), n = big ? 7 : 3;
  for (let k = 0; k < n; k++) {
    const bw = 3 + ((r() * (big ? 5 : 3)) | 0), bh = 2 + ((r() * 3) | 0), x = (r() * (w - bw)) | 0, y = h - 1 - bh - ((r() * (h - bh - 1) * (big ? 0.7 : 0.4)) | 0), base = 2 + ((r() * 2) | 0);
    for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) {
      if ((i === 0 || i === bw - 1) && (j === 0 || j === bh - 1) && r() < 0.7) continue;
      p.set(x + i, y + j, j === 0 || i === 0 ? STN[base + 2] : j === bh - 1 || i === bw - 1 ? STN[base] : STN[base + 1]);
    }
    for (let i = 1; i < bw; i++) p.blend(x + i, y + bh, alpha(INK, 85));
  }
  return stampOf(p, w >> 1, h - 1);
}
/** Säulenstumpf in ¾-Sicht: Bruchfläche oben, kannelierter Schaft, Basisring (Anker = unten Mitte). */
function mkStump(seed: number): Stamp {
  const r = rng(seed), hgt = 5 + ((r() * 7) | 0), w = 12, h = hgt + 8, p = new Px(w, h);
  for (let x = 1; x < w - 1; x++) p.set(x + 1, h - 1, alpha(INK, 90));
  // Basis
  for (let x = 0; x < w; x++) { p.set(x, h - 2, x === 0 || x === w - 1 ? STN[1] : STN[2]); p.set(x, h - 3, x < 3 ? STN[5] : x > 8 ? STN[2] : STN[4]); }
  // Schaft
  const tone = [1, 5, 5, 4, 4, 3, 4, 3, 2, 1];
  for (let y = 4; y < h - 3; y++) for (let x = 1; x < w - 1; x++) p.set(x, y, STN[(y % 6 === 5 ? Math.max(1, tone[x - 1] - 1) : tone[x - 1])]);
  // schräge Bruchfläche
  const tilt = r() < 0.5 ? 1 : -1;
  for (let x = 1; x < w - 1; x++) {
    const o = Math.round(((x - 5.5) / 5) * tilt * 1.4), edge = x === 1 || x === w - 2;
    if (!edge) { p.set(x, 1 + o, STN[5]); p.set(x, 2 + o, r() < 0.3 ? STN[3] : STN[4]); }
    p.set(x, 3 + o, edge ? STN[4] : STN[r() < 0.25 ? 3 : 4]); if (o > 0) p.set(x, 3, STN[4]);
    for (let y = 0; y < 1 + o; y++) p.set(x, y, 0);
  }
  if (r() < 0.6) { p.set(2, h - 4, MOSS[2]); p.set(3, h - 4, MOSS[3]); p.set(2, h - 5, MOSS[3]); }
  return stampOf(p, w >> 1, h - 2);
}
/** Glyphenbruchstück des arkanen Felds: leuchtende Kerben mit weichem Schein. */
function mkGlyph(seed: number): Stamp {
  const r = rng(seed), g = GLYPHS[(r() * GLYPHS.length) | 0], p = new Px(9, 11), keep = 0.55 + r() * 0.4;
  const on = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < 5 && y < 7 && g[y * 5 + x] === 1;
  const lit: boolean[] = [];
  for (let k = 0; k < 35; k++) lit.push(r() < keep);
  for (let y = -1; y < 8; y++) for (let x = -1; x < 6; x++) {
    if (on(x, y) && lit[y * 5 + x]) p.set(x + 2, y + 2, r() < 0.3 ? ARC[3] : ARC[2]);
    else if ((on(x - 1, y) && lit[y * 5 + x - 1]) || (on(x + 1, y) && lit[y * 5 + x + 1]) || (on(x, y - 1) && lit[(y - 1) * 5 + x]) || (on(x, y + 1) && lit[(y + 1) * 5 + x])) p.set(x + 2, y + 2, alpha(ARC[1], 120));
  }
  return stampOf(p, 4, 5);
}

export function initRuinStamps(): void {
  if (RS.tuft.length) return;
  const zf = [zShade, (c: number): number => c, zSun];
  // Büschel je Lichtzone: 0 = oliv, 1 = strohig
  for (let z = 0; z < 3; z++) {
    const m = zf[z];
    const olive: TuftPal = { d: m(mix(SA[0], F[1], 0.5)), m: m(GRS_N[1]), l: m(GRS_N[3]), t: m(mix(GRS_N[4], G[4], 0.2)), s: SH };
    const straw: TuftPal = { d: m(mix(SA[1], TN[0], 0.4)), m: m(mix(SA[2], TN[2], 0.3)), l: m(mix(SA[3], P.gold[3], 0.2)), t: m(mix(SA[4], CR[4], 0.4)), s: SH };
    RS.tuft.push([many(12, (k) => mkTuft(9000 + z * 100 + k * 7, olive, 'short')), many(12, (k) => mkTuft(9050 + z * 100 + k * 7, straw, 'short'))]);
    RS.tall.push(many(10, (k) => mkTuft(9300 + z * 100 + k * 7, k & 1 ? straw : olive, 'tall')));
    RS.tiny.push(many(8, (k) => mkTuft(9600 + z * 100 + k * 7, k & 1 ? straw : olive, 'tiny')));
  }
  RS.slab = many(14, (k) => mkSlab(9900 + k * 13));
  RS.thistle = many(6, (k) => mkThistle(9950 + k * 13));
  RS.vine = many(10, (k) => mkVine(10000 + k * 13));
  RS.rubble = [...many(6, (k) => mkRubble(10100 + k * 13, false)), ...many(5, (k) => mkRubble(10200 + k * 13, true))];
  RS.stump = many(6, (k) => mkStump(10300 + k * 13));
  RS.glyph = many(10, (k) => mkGlyph(10400 + k * 13));
  const C: Record<string, number> = {
    y: P.gold[3], Y: P.gold[4], o: P.gold[2], g: GRS_N[1], G: MOSS[3], h: MOSS[2], H: MOSS[1], m: MOSS[4], a: SH,
    s: PLZ[4], S: PLZ[5], t: PLZ[3], d: PLZ[2], D: PLZ[1], k: PLZ[0], r: TESS[2], R: TESS[5], c: CR[3], C: CR[4], T: TESS[1],
    l: STN[5], L: STN[4], n: STN[3], N: STN[2], q: STN[1], Q: STN[0], x: alpha(INK, 90), w: WHITE, p: P.pink[3], P: P.pink[4],
    e: SAND_N[1], E: SAND_N[3], v: ARC[1], V: ARC[2], b: RUNE[1], B: RUNE[2], K: mix(STN[0], INK, 0.5), j: mix(STN[0], INK, 0.25),
    f: mix(G[2], F[2], 0.4), F: mix(G[3], F[3], 0.4), u: mix(G[3], G[4], 0.4), U: mix(G[1], F[1], 0.5),
  };
  const rows = (r: string[], ax?: number, ay?: number): Stamp => stampRows(r, C, ax, ay);
  // gelbe Blüten (Fingerkraut, Hahnenfuß)
  RS.bloom.push(
    rows(['.Y.', 'YoY', '.g.'], 1, 2), rows(['y'], 0, 0), rows(['Y.y', '.g.', 'y..'], 1, 1), rows(['.y.', 'yYy', '.y.', '.g.', '.g.'], 1, 4), rows(['y.', '.Y'], 0, 1),
    rows(['.w.', 'wyw', '.g.'], 1, 2), rows(['Y..y', '.g..', '..Yg'], 2, 1),
  );
  RS.pebble.push(rows(['.St.', 'sttd', '.dDa']), rows(['St', 'dD']), rows(['.SSt.', 'Ssttd', 'sttdD', '.dDaa']), rows(['s.', 'Da']), rows(['.lL', 'LnN', 'Nqa']), rows(['St.', 'tdD', '.aa']));
  // Scherben: Terrakotta, Mosaiksteinchen
  RS.shard.push(rows(['r.', 'Rr']), rows(['.rr', 'rR.']), rows(['T']), rows(['c.r', '...', '.T.']), rows(['o']), rows(['rr.', 'R.r', '..R']), rows(['T.c']));
  RS.grit.push(rows(['d.', '..', '.t']), rows(['D..d']), rows(['.t', 'd.']), rows(['S.d', '...', '.D.']), rows(['e..', '..E']), rows(['E']));
  RS.crack.push(rows(['k....', '.Dk..', '...Dk', '....k'], 2, 1), rows(['..k', '.D.', 'kD.', '.k.'], 1, 2), rows(['k.....', '.DD...', '...kD.', '.....k'], 3, 1), rows(['D', 'k', 'D'], 0, 1), rows(['k..', '.Dk', '..D', '.k.', 'k..'], 1, 2));
  RS.mossBlob.push(rows(['.GG.', 'GhhG', 'hHHh', '.HH.'], 2, 2), rows(['Gh', 'hH'], 1, 1), rows(['.GGG..', 'GGhhG.', 'hhhHhG', '.HHHH.'], 3, 2), rows(['.mG', 'GhH', '.H.'], 1, 1), rows(['G.', 'hG', 'Hh'], 1, 1));
  RS.faceCrack.push(rows(['Q....', '.Qq..', '..Q..', '..qQ.', '....Q', '...Q.'], 2, 0), rows(['..Q', '.Q.', '.q.', 'Q..', 'Q..'], 1, 0), rows(['Q.....', '.QQ...', '...Q..', '...qQ.', '.....Q'], 3, 0), rows(['.Q.', 'Q..', '.Q.', '.Qq', '..Q', '..Q', '.Q.'], 1, 0));
  // Hüterfigur als Flachrelief (Kopf mit Reif, erhobene Arme) und Wellenrosette
  RS.keeper.push(
    rows(['...lll...', '..lNNNq..', '..lNlNq..', 'l..lLq..l', 'lL.lLq.Lq', '.lLLLLLq.', '...lLq...', '..lLLLq..', '..lq.lq..'], 4, 4),
    rows(['..lllll..', '.lNqqqNq.', 'lNq.l.qNq', 'lq.lLq.lq', 'lNq.q.lNq', '.lNlllNq.', '..qqqqq..'], 4, 3),
    rows(['....l....', '...lLq...', '..lL.Lq..', '.lL.l.Lq.', 'lLqlLqlLq', '.lL.q.Lq.', '..lL.Lq..', '...lLq...', '....q....'], 4, 4),
  );
  // Wandnischen (Anker = Unterkante Mitte): leer mit Moos, Urne, Runenstein
  const np = { ...C, O: STN[0], z: mix(STN[0], INK, 0.55), Z: mix(STN[0], INK, 0.3) };
  RS.niche.push(
    stampRows(['...LllllL...', '..LOOOOOOl..', '.LOzzzzzzOl.', '.lOzzzzzzOl.', '.lOzzzzzzOl.', '.lOzzzzzzOl.', '.lOzzzzzGOl.', '.lOzzzzGGOl.', '.lOzZzGhGOl.', '.lOZZGhhHOl.', '.LOOOOOOOOl.', 'LllllGGllGlN'], np, 6, 11),
    stampRows(['...LllllL...', '..LOOOOOOl..', '.LOzzzzzzOl.', '.lOzzzzzzOl.', '.lOzzrrzzOl.', '.lOzrrrRzOl.', '.lOzzrRzzOl.', '.lOzrrrRzOl.', '.lOzrrRRzOl.', '.lOZZRRZZOl.', '.LOOOOOOOOl.', 'LllllllllllN'], np, 6, 11),
    stampRows(['...LllllL...', '..LOOOOOOl..', '.LOzzzzzzOl.', '.lOzzbzzzOl.', '.lOzbBbzzOl.', '.lOzzbzbzOl.', '.lOzzbBbzOl.', '.lOzzzbzzOl.', '.lOzzzbzzOl.', '.lOZZZZZZOl.', '.LOOOOOOOOl.', 'LllllllllllN'], np, 6, 11),
  );
  // Schwimmblätter (seerosenartig), teils mit Blüte
  RS.lily.push(
    rows(['.Fuu.', 'FFFuu', 'fFF.u', '.ffF.'], 2, 2), rows(['.uu', 'FFu', 'fF.'], 1, 1), rows(['.FFu..', 'FFFFuu', 'fFFpPu', '.ffPwF', '..ff..'], 3, 2), rows(['Fu', 'fF'], 1, 1),
    rows(['..Fuu.', '.FF.uu', 'FFFFFu', 'fFFFF.', '.fff..'], 3, 2), rows(['.Fu.', 'FwYu', 'fFF.'], 2, 1),
  );
  RS.reed.push(rows(['.u.', '.F.', 'uF.', 'FFu', '.F.', '.f.', '.fa'], 1, 6), rows(['u..', 'F.u', 'F.F', 'fF.', '.fa'], 1, 4), rows(['..u', '.uF', '.F.', 'uF.', 'F..', 'fa.'], 1, 5));
  // Brandflecken des arkanen Felds
  RS.scorch.push(rows(['.jj.', 'jKKj', '.jK.'], 2, 1), rows(['j.', 'Kj', '.j'], 1, 1), rows(['..jjj.', '.jKKKj', 'jKKvKj', '.jKKj.'], 3, 2), rows(['v'], 0, 0), rows(['V.', '.v'], 0, 0));
  // Geländerpfosten der Steinbrücke (0 = hinten, 1 = vorn mit Schatten)
  RS.post.push(
    rows(['.ll.', 'lLLq', 'lLNq', 'lLNq', 'lLNq', 'lNNq', 'QqqQ'], 2, 6), rows(['.ll.', 'lLLq', 'lLNq', 'lLNq', 'lLNq', 'lLNq', 'lNNq', 'QqqQ', '.xxx'], 2, 7),
  );
  for (const key of ['vine', 'crack', 'faceCrack', 'slab'] as const) RS[key].push(...RS[key].map(flipStamp));
  void bez;
}
