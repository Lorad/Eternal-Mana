/**
 * Frostgebirge – Farbtöne und vorgezeichnete Kleinmotive (Stempel) für Oberwelt und Gletscherdom.
 * Leitfarbe Schneeweiß/Eisblau, Gegenfarbe dunkles Tannengrün und Schiefer, Akzent warmes Laternenlicht.
 */
import { INK, P, WHITE, alpha, mix, rng } from '../palette';
import { Px, bez } from '../draw';
import { flipStamp, stampOf, stampRows, type Stamp } from './core';
import { many, mkTuft, type TuftPal } from './frost_util';

// ---------------------------------------------------------------------------------------------------- Palette
export const SN = P.snow, IC = P.ice;
const zCold = (c: number): number => mix(c, mix(IC[2], SN[1], 0.5), 0.24);
const zSun = (c: number): number => mix(c, P.cream[4], 0.32);
/** Schnee: Leeschatten (blauviolett) → Halbschatten → Fläche → helle Fläche → Glanz; je Lichtzone (0 schattig, 1 normal, 2 sonnig). */
export const SNOW_N = [mix(mix(SN[1], SN[2], 0.55), P.violet[4], 0.14), mix(SN[2], SN[3], 0.25), mix(SN[2], SN[3], 0.7), mix(SN[3], SN[4], 0.45), SN[4]];
export const SNOW = [SNOW_N.map(zCold), SNOW_N, SNOW_N.map(zSun)];
/** Firn / Tiefschnee: härter, blauer */
export const FIRN_N = [mix(IC[1], SN[1], 0.6), mix(IC[2], SN[2], 0.45), mix(IC[3], SN[2], 0.5), mix(IC[3], SN[3], 0.6), mix(IC[4], SN[4], 0.5)];
export const FIRN = [FIRN_N.map(zCold), FIRN_N, FIRN_N.map((c) => mix(c, P.cream[4], 0.18))];
/** Blankeis (dunkel → hell) */
export const ICE = [mix(IC[0], IC[1], 0.55), IC[1], mix(IC[1], IC[2], 0.55), IC[2], mix(IC[2], IC[3], 0.6), IC[3], IC[4]];
/** festgetretener Schnee des Passwegs */
export const PACK = [mix(SN[0], P.stone[1], 0.4), mix(SN[0], SN[1], 0.6), mix(SN[1], P.stone[3], 0.25), mix(mix(SN[1], SN[2], 0.55), P.stone[3], 0.15), mix(SN[2], P.stone[4], 0.15), mix(SN[2], SN[3], 0.6)];
export const ERD = [mix(P.wood[0], INK, 0.2), mix(P.wood[1], P.steel[0], 0.35), mix(P.wood[2], P.stone[1], 0.4), mix(P.tan[1], P.stone[2], 0.45)];
/** Schieferfels */
export const SLATE = [mix(P.steel[0], INK, 0.3), mix(P.steel[0], P.stone[1], 0.3), mix(P.steel[1], P.stone[1], 0.35), mix(P.steel[1], P.steel[2], 0.45), mix(P.steel[2], P.stone[2], 0.3), mix(P.steel[2], P.steel[3], 0.6)];
export const PLANK = [mix(P.wood[0], INK, 0.25), mix(P.wood[1], P.steel[0], 0.25), mix(P.wood[2], P.steel[1], 0.22), mix(mix(P.wood[2], P.wood[3], 0.5), P.stone[2], 0.2), mix(P.wood[3], P.stone[2], 0.2), mix(mix(P.wood[3], P.wood[4], 0.6), P.stone[3], 0.15), mix(P.wood[4], P.cream[3], 0.3)];
export const ROPE = [mix(P.tan[0], INK, 0.2), P.tan[1], P.tan[2], P.tan[3]];
export const VOIDC = mix(P.blue[0], INK, 0.72);
export const DEEP = mix(P.blue[0], P.teal[0], 0.4);
/** Schattenfarbe auf Schnee: klares Blau statt Grau */
export const SNSH = mix(SN[0], P.blue[1], 0.4);
export const THIN = [mix(P.teal[1], P.blue[1], 0.5), mix(IC[2], P.teal[3], 0.3), mix(IC[3], P.teal[4], 0.3), mix(IC[3], P.teal[4], 0.12), mix(IC[4], P.teal[4], 0.15)];

// ---------------------------------------------------------------------------------------------------- Stempel
export const FS = {
  tuft: [] as Stamp[], tuftDry: [] as Stamp[], tiny: [] as Stamp[], pebble: [] as Stamp[], mound: [] as Stamp[], track: [] as Stamp[], flake: [] as Stamp[],
  shard: [] as Stamp[], twig: [] as Stamp[], boot: [] as Stamp[], stone: [] as Stamp[], icicle: [] as Stamp[], ledge: [] as Stamp[], floe: [] as Stamp[],
  clump: [] as Stamp[], post: [] as Stamp[], sparkle: [] as Stamp[], needle: [] as Stamp[], faceIce: [] as Stamp[], crack: [] as Stamp[], grit: [] as Stamp[],
};

const SHA = alpha(SNSH, 105);
const C: Record<string, number> = {
  W: SN[4], w: SNOW_N[3], v: SNOW_N[2], s: SNOW_N[1], S: SNOW_N[0], b: mix(SN[1], IC[1], 0.45), a: SHA,
  i: IC[3], I: IC[2], j: IC[1], J: IC[0], k: SLATE[1], K: SLATE[0], r: SLATE[3], R: SLATE[4], q: SLATE[5],
  n: P.wood[1], N: P.wood[2], o: P.wood[3], g: mix(P.forest[1], INK, 0.2), G: P.forest[2], h: P.forest[3],
  e: ERD[1], E: ERD[2], p: PACK[1], P: PACK[0], l: PACK[5], x: alpha(INK, 90),
};
const rows = (r: string[], ax?: number, ay?: number): Stamp => stampRows(r, C, ax, ay);

/** Tierfährte: eine leicht gebogene Reihe kleiner Abdrücke (Paare = Hase, Einzelspur = Fuchs, Dreizack = Vogel). */
function mkTrack(seed: number): Stamp {
  const r = rng(seed), w = 30, h = 20, p = new Px(w, h), type = (r() * 3) | 0;
  const a: [number, number] = [2, 3 + r() * 14], b: [number, number] = [w - 3, 3 + r() * 14], m: [number, number] = [w / 2, 2 + r() * 15];
  const pts = bez(a, m, b, 40), step = type === 0 ? 9 : type === 1 ? 5 : 6;
  for (let k = 2; k < pts.length - 1; k += step) {
    const x = Math.round(pts[k][0]), y = Math.round(pts[k][1]);
    if (type === 0) { p.set(x, y, C.S); p.set(x, y + 1, C.b); p.set(x + 2, y + 2, C.S); p.set(x + 2, y + 3, C.b); p.set(x - 2, y + 4, C.b); p.set(x - 3, y + 4, C.S); }
    else if (type === 1) { const o = (k / step) & 1; p.set(x, y + o, C.b); p.set(x + 1, y + o, C.S); p.set(x + 1, y + o + 1, C.W); }
    else { p.set(x, y, C.b); p.set(x - 1, y - 1, C.S); p.set(x - 1, y + 1, C.S); p.set(x + 1, y, C.S); }
  }
  return stampOf(p, 15, 10);
}
/** Eiszapfen (Anker = Ansatz oben Mitte). */
function mkIcicle(seed: number): Stamp {
  const r = rng(seed), len = 5 + ((r() * 10) | 0), p = new Px(3, len);
  const l1 = Math.max(1, Math.round(len * (0.25 + r() * 0.25))), l3 = Math.max(2, Math.round(len * (0.45 + r() * 0.3)));
  for (let y = 0; y < len; y++) {
    if (y < l1) p.set(0, y, y === 0 ? WHITE : IC[4]);
    p.set(1, y, y > len - 3 ? IC[4] : y < 2 ? IC[4] : IC[3]);
    if (y < l3) p.set(2, y, y === l3 - 1 ? IC[2] : mix(IC[1], IC[2], 0.6));
  }
  p.set(1, len - 1, WHITE);
  return stampOf(p, 1, 0);
}
/** Schneeband auf einem Felsabsatz (Anker = Mitte). */
function mkLedge(seed: number): Stamp {
  const r = rng(seed), w = 5 + ((r() * 8) | 0), p = new Px(w, 4);
  for (let x = 0; x < w; x++) {
    const edge = x === 0 || x === w - 1;
    if (!edge) p.set(x, 0, r() < 0.7 ? C.W : C.w);
    p.set(x, 1, edge ? C.s : x > w * 0.6 ? C.w : C.W);
    if (r() < 0.8) p.set(x, 2, edge ? alpha(INK, 60) : C.S);
    p.set(x, 3, alpha(INK, edge ? 40 : 80));
  }
  return stampOf(p, w >> 1, 1);
}
/** Eisfläche an der Felswand: gefrorener Rinnsal-Streifen (Anker = oben Mitte). */
function mkFaceIce(seed: number): Stamp {
  const r = rng(seed), w = 4 + ((r() * 4) | 0), h = 8 + ((r() * 6) | 0), p = new Px(w, h);
  for (let x = 0; x < w; x++) {
    const len = Math.round(h * (0.5 + r() * 0.5)), tone = x === 0 ? ICE[6] : x === w - 1 ? ICE[2] : r() < 0.4 ? ICE[5] : ICE[4];
    for (let y = 0; y < len; y++) p.set(x, y, y === len - 1 ? ICE[6] : y % 5 === 4 && r() < 0.6 ? ICE[3] : tone);
  }
  return stampOf(p, w >> 1, 0);
}

export function initFrostStamps(): void {
  if (FS.tuft.length) return;
  const tp: TuftPal = { d: mix(P.forest[1], P.wood[1], 0.45), m: mix(P.sand[2], P.forest[2], 0.4), l: mix(P.sand[3], SN[2], 0.35), t: SN[4], s: SHA };
  const td: TuftPal = { d: mix(P.wood[1], P.steel[0], 0.3), m: mix(P.tan[1], P.sand[1], 0.5), l: mix(P.tan[2], P.sand[3], 0.5), t: mix(P.cream[3], SN[4], 0.5), s: SHA };
  FS.tuft = many(12, (k) => mkTuft(8000 + k * 7, tp, 'short'));
  FS.tuftDry = many(10, (k) => mkTuft(8100 + k * 7, td, k % 3 === 0 ? 'tall' : 'short'));
  FS.tiny = many(8, (k) => mkTuft(8200 + k * 7, k & 1 ? tp : td, 'tiny'));
  FS.track = many(9, (k) => mkTrack(8300 + k * 11));
  FS.icicle = many(14, (k) => mkIcicle(8400 + k * 5));
  FS.ledge = many(8, (k) => mkLedge(8500 + k * 5));
  FS.faceIce = many(8, (k) => mkFaceIce(8600 + k * 5));
  FS.pebble.push(
    rows(['.WW.', 'wRrk', '.kKa']), rows(['WW', 'rk', '.a']), rows(['.WWw.', 'WqRrk', 'RrrkK', '.kKaa']), rows(['W.', 'rk']), rows(['.Ww', 'qRk', 'rka']),
    rows(['..WWW..', '.WWWWw.', 'wqRRrrk', 'RRrrrkK', '.rkkKKa', '..aaaa.']),
  );
  FS.mound.push(
    rows(['..wWWw...', '.WWWWWWs.', 'wWWWWWwss', '.sssssSS.'], 4, 2), rows(['.WWW..', 'WWWWws', '.sssS.'], 3, 1), rows(['...WWWWw....', '.wWWWWWWWws.', 'WWWWWWWWwwss', '.wwssssssSS.', '...SSSSS....'], 6, 2),
    rows(['.WWWW.', 'WWWWWs', 'wWWwss', '.sSS..'], 3, 2), rows(['..WWWWW...', 'wWWWWWWWs.', '.sssssSSS.'], 5, 1), rows(['.WW.', 'WWws', '.sS.'], 2, 1),
  );
  FS.flake.push(
    rows(['...W...', '.W.i.W.', '..iWi..', 'WiWWWiW', '..iWi..', '.W.i.W.', '...W...'], 3, 3), rows(['..W..', '.iWi.', 'WWWWW', '.iWi.', '..W..'], 2, 2),
    rows(['.W.', 'WiW', '.W.'], 1, 1), rows(['W.W', '.W.', 'W.W'], 1, 1), rows(['..W..', 'W.W.W', '.WWW.', 'W.W.W', '..W..'], 2, 2),
    rows(['.i.W.i.', '..iWi..', 'WWWWWWW', '..iWi..', '.i.W.i.'], 3, 2),
  );
  FS.sparkle.push(rows(['.W.', 'WWW', '.W.'], 1, 1), rows(['W'], 0, 0), rows(['..W..', '.....', 'W.W.W', '.....', '..W..'], 2, 2), rows(['W.', '.W'], 0, 0));
  FS.shard.push(
    rows(['.W.', '.iW', 'jiW', 'jIi', 'aja'], 1, 4), rows(['..W', '.iW', '.Ii', 'jIi', 'aaa'], 1, 4), rows(['.W...', '.iW.W', 'jiW.i', 'jIijI', 'aajaa'], 2, 4), rows(['W.', 'iW', 'ja'], 0, 2),
    rows(['...W..', '..iW..', '.jiWW.', '.jIiiW', 'jjIIii', 'aaaaaa'], 3, 5),
  );
  FS.twig.push(rows(['n....', '.NW..', '..NNW', '...n.'], 2, 2), rows(['..WN', '.Nn.', 'N...'], 2, 1), rows(['n.n', '.N.', '.NW', '..n'], 1, 2), rows(['gG.', '.gh', 'Gg.'], 1, 1), rows(['.g', 'Gh', 'g.'], 0, 1));
  FS.needle.push(rows(['g.G', '.g.', 'G..'], 1, 1), rows(['.NN.', 'NonN', 'NooN', '.NN.'], 2, 3), rows(['G..g', '.gG.'], 2, 1), rows(['g', 'G'], 0, 1));
  FS.boot.push(
    rows(['PP...', 'PP...', 'pl...', '...PP', '...PP', '...pl'], 2, 3), rows(['PPl....', 'PPp....', '.......', '....PPl', '....PPp'], 3, 2),
    rows(['...PP', '...PP', '...pl', 'PP...', 'PP...', 'pl...'], 2, 3), rows(['PP', 'PP', 'pl'], 1, 1), rows(['....PPl', '....PPp', '.......', 'PPl....', 'PPp....'], 3, 2),
  );
  FS.stone.push(
    rows(['.qR.', 'RrrK', '.kKx']), rows(['qR', 'rK', '.x']), rows(['.qqR..', 'qRrrk.', 'RrrrkK', '.kkKKx']), rows(['qr', 'kK']), rows(['.eE.', 'eEEe', '.ee.']), rows(['qRr.', 'rrkK', '.Kxx']),
  );
  FS.grit.push(rows(['p.', '..', '.P']), rows(['P..p']), rows(['.p', 'P.']), rows(['l.p', '...', '.P.']), rows(['e..', '..p']), rows(['r']), rows(['k.', '.r']));
  FS.crack.push(rows(['j....', '.Jj..', '...Jj', '....j'], 2, 1), rows(['..j', '.J.', 'jJ.', '.j.'], 1, 2), rows(['j.....', '.JJ...', '...jJ.', '.....j'], 3, 1), rows(['J', 'j', 'J'], 0, 1));
  FS.floe.push(
    rows(['.WWWw.', 'WiiiIj', '.xxxx.'], 3, 1), rows(['.WW.', 'WiIj', '.xx.'], 2, 1), rows(['..WWWWw..', '.WiiiiiI.', 'WiiiIIIIj', '.jxxxxxj.'], 4, 2), rows(['Ww', 'ij'], 1, 0), rows(['.WWw', 'WiIj', 'iIjx', '.xx.'], 2, 1),
  );
  FS.clump.push(
    rows(['.WWW.', 'WWWWw', 'wWwss', '.aaa.'], 2, 2), rows(['.WW.', 'WWws', '.aa.'], 2, 1), rows(['..WWWW..', '.WWWWWWs', 'WWWWwwss', '.saaaaa.'], 4, 2), rows(['WW', 'wa'], 1, 0),
    rows(['.qR.', 'WWWK', 'RrkK', '.xx.'], 2, 2), rows(['.WWw.', 'WqRrk', 'rrkKx', '.xxx.'], 2, 2),
  );
  // Brückenpfosten mit Schneehaube (0 = hinten, 1 = vorn mit Schlagschatten)
  const pc = { ...C, c: PLANK[4], d: PLANK[2], D: PLANK[0], t: ROPE[2], T: ROPE[0] };
  FS.post.push(
    stampRows(['.WW.', 'WWWw', 'DcdD', 'DtTD', 'DcdD', 'DcdD', 'DcdD', 'DddD', '.DD.'], pc, 2, 8),
    stampRows(['.WW.', 'WWWw', 'DcdD', 'DtTD', 'DcdD', 'DcdD', 'DcdD', 'DcdD', 'DddD', '.DDx', '..xx'], pc, 2, 9),
  );
  for (const key of ['twig', 'shard', 'track', 'crack'] as const) FS[key].push(...FS[key].map(flipStamp));
}
