/**
 * Die Quellwarte (Hub) – Bodenmaler v2. Aufbau wie ruinen.ts (Felder aus frost_util.owFields, siehe core.ts).
 * Eine gepflegte Stadt aus warmem Werkstein: nichts ist verfallen, alles ist benutzt.
 *
 *   GROUND   Kopfsteinpflaster (Plätze, Höfe): runde Steine in drei Tönen, dunkle Fugen, ausgetretene helle Laufspuren,
 *            einzelne Grasbüschel in den Fugen, Kanaldeckel mit Hüterwappen, Rinnsteine.
 *   GROUND2  Gartenbeete und Rasen: niedrige Steinkante, gemähtes Gras, Blumengruppen, kleine Büsche.
 *   PATH     Straße: große Steinplatten im Läuferverband, Bordsteine, Mittelrinne.
 *   FLOOR    Hüterplatz (Portalplatz): helle Platten im Diagonalraster, Goldfugen, Türkis-Einlagen an den Kreuzungen.
 *   WALL     Stadtmauer: Quaderfront mit hellem Deckgesims und Schieferabdeckung, Efeu; Oberseite = Wehrgang mit
 *            Platten, im Inneren großer Mauerkörper bepflanzte Terrassen.
 *   LIQUID   gemauerter Kanal: zweilagige Kante aus hellem Stein, nasse Kanalwand am Nordufer; das Wasser selbst
 *            ist die Flüssigkeitsebene (türkis, quellwarte_liquid).
 *   BRIDGE   Steinplatten mit Brüstung · HAZARD Kiesfläche · VOID dunkel.
 */
import { INK, P, WHITE, alpha, hash2, mix, rng, rnd2 } from '../palette';
import { Px } from '../draw';
import { BRIDGE, Chunk, LIQUID, SHADE, TS, allow, clamp, flipStamp, rf, ri, seedAt, stampOf, stampRows, tileAt, voro, V, type BiomePainter, type Stamp } from './core';
import { S_BANK, S_BRIDGE, S_FACE, S_FLOOR, S_G, S_G2, S_HAZ, S_PATH, S_TOP, S_WATER, applyShadow, many, mkTuft, owFields, type OW } from './frost_util';
import { gruenwaldLiquid } from './gruenwald_liquid';

// ---------------------------------------------------------------------------------------------------- Farben
const ST = P.stone, TN = P.tan, CR = P.cream, G = P.green, F = P.forest, WD = P.wood, Y = P.gold, TL = P.teal;
const zShade = (c: number): number => mix(mix(c, P.violet[1], 0.1), P.blue[1], 0.06);
const zSun = (c: number): number => mix(c, mix(Y[4], CR[3], 0.5), 0.14);
const zones = (r: number[]): number[][] => [r.map(zShade), r, r.map(zSun)];
/** Pflastersteine: Fuge → Glanz (warmes Sandgrau) */
const COB_N = [mix(mix(WD[1], ST[1], 0.5), ST[2], 0.25), mix(ST[2], TN[1], 0.45), mix(ST[2], TN[2], 0.5), mix(mix(ST[3], TN[2], 0.5), ST[2], 0.3), mix(ST[3], TN[3], 0.5), mix(ST[4], CR[3], 0.45)];
const COB = zones(COB_N);
/** Straßenplatten: eine Spur heller und kühler */
const FLAG_N = COB_N.map((c, k) => mix(c, ST[Math.min(4, k)], 0.35));
const FLAG = zones(FLAG_N);
/** heller Zierstein (Kanten, Gesimse, Hüterplatz) */
const LST = [mix(ST[1], TN[1], 0.3), mix(ST[2], TN[2], 0.4), mix(ST[3], CR[3], 0.45), mix(ST[4], CR[3], 0.5), mix(CR[4], WHITE, 0.2)];
/** Rasen */
const LAWN_N = [mix(F[1], G[1], 0.5), G[1], mix(G[1], G[2], 0.6), G[2], mix(G[2], G[3], 0.55), mix(G[3], Y[3], 0.15)];
const LAWN = zones(LAWN_N);
const SOIL = [mix(WD[0], INK, 0.2), WD[1], mix(WD[1], WD[2], 0.5)];
/** Schiefer der Mauerabdeckung */
const SLT = [P.steel[0], mix(P.steel[1], ST[1], 0.35), mix(P.steel[2], ST[2], 0.35), mix(P.steel[3], ST[3], 0.35), mix(P.steel[4], ST[4], 0.3)];
const MANA = [TL[1], TL[2], TL[3], TL[4], mix(TL[4], WHITE, 0.55)];
const GOLD = [Y[1], Y[2], Y[3], Y[4]];
const VOIDC = mix(WD[0], INK, 0.6);
const WET = mix(TL[0], ST[0], 0.5);

// ---------------------------------------------------------------------------------------------------- Stempel
const QS = { tuft: [] as Stamp[], tiny: [] as Stamp[], flower: [] as Stamp[], bush: [] as Stamp[], pebble: [] as Stamp[], leaf: [] as Stamp[], ivy: [] as Stamp[], grate: [] as Stamp[], cover: [] as Stamp[], crack: [] as Stamp[], post: [] as Stamp[], moss: [] as Stamp[] };
let ready = false;
function initStamps(): void {
  if (ready) return;
  ready = true;
  const TP = { d: F[1], m: G[2], l: G[3], t: G[4], s: alpha(INK, 60) };
  QS.tuft = many(10, (k) => mkTuft(9100 + k, TP, 'short'));
  QS.tiny = many(8, (k) => mkTuft(9200 + k, { ...TP, s: 0 }, 'tiny'));
  // Blumengruppen: je Stempel eine Farbe, 5–8 Blüten mit Blättern
  const FLC = [P.red, Y, P.pink, P.violet, P.blue, [CR[1], CR[2], CR[3], CR[4], WHITE]];
  QS.flower = many(12, (k) => {
    const r = rng(9300 + k), R = FLC[k % FLC.length], p = new Px(13, 10), n = 5 + ((r() * 4) | 0);
    for (let j = 0; j < n; j++) { const x = 2 + ((r() * 9) | 0), y = 2 + ((r() * 6) | 0); p.set(x, y + 1, G[2]); p.set(x - 1, y + 1, G[3]); p.set(x + 1, y + 2, G[1]); }
    for (let j = 0; j < n; j++) { const x = 2 + ((r() * 9) | 0), y = 2 + ((r() * 5) | 0); p.set(x, y, R[3]); p.set(x + 1, y, R[2]); if (r() < 0.5) p.set(x, y - 1, R[4]); }
    p.set(6, 3, k % 2 ? WHITE : Y[4]);
    return stampOf(p, 6, 8);
  });
  QS.bush = many(6, (k) => {
    const r = rng(9400 + k), w = 12 + ((r() * 5) | 0), h = 9 + ((r() * 3) | 0), p = new Px(w + 2, h + 2), cx = (w + 2) / 2, cy = h / 2 + 1;
    for (let y = 0; y < h + 2; y++) for (let x = 0; x < w + 2; x++) {
      const u = (x + 0.5 - cx) / (w / 2), v = (y + 0.5 - cy) / (h / 2), d = u * u + v * v, n = rnd2(x >> 1, y, 9400 + k);
      if (d > 1 - n * 0.25) continue;
      const lit = -(u * 0.5 + v * 0.85) + (n - 0.5) * 0.5;
      p.set(x, y, lit > 0.55 ? G[4] : lit > 0.15 ? G[3] : lit > -0.35 ? G[2] : lit > -0.7 ? G[1] : F[1]);
    }
    for (let j = 0; j < 3; j++) { const x = 2 + ((r() * (w - 2)) | 0), y = 2 + ((r() * (h - 4)) | 0); p.set(x, y, k % 3 === 0 ? P.red[3] : k % 3 === 1 ? WHITE : P.pink[3]); }
    return stampOf(p, ((w + 2) / 2) | 0, h + 1);
  });
  QS.pebble = many(6, (k) => {
    const r = rng(9500 + k), p = new Px(5, 4), c = COB_N[3 + ((r() * 2) | 0)];
    p.set(1, 1, c); p.set(2, 1, mix(c, WHITE, 0.25)); p.set(1, 2, mix(c, INK, 0.25)); p.set(2, 2, mix(c, INK, 0.15)); if (r() < 0.5) p.set(3, 2, c);
    p.set(1, 3, alpha(INK, 60)); p.set(2, 3, alpha(INK, 60));
    return stampOf(p, 2, 2);
  });
  QS.leaf = many(6, (k) => { const r = rng(9600 + k), p = new Px(4, 3), c = [Y[3], P.fire[2], G[3], TN[3]][k % 4]; p.set(1, 1, c); p.set(2, 1, mix(c, INK, 0.2)); if (r() < 0.6) p.set(1, 0, mix(c, WHITE, 0.2)); p.set(2, 2, alpha(INK, 50)); return stampOf(p, 1, 1); });
  // Efeu hängt von der Mauerkrone (Anker = oben)
  QS.ivy = many(6, (k) => {
    const r = rng(9700 + k), len = 6 + ((r() * 9) | 0), p = new Px(9, len + 3);
    let x = 4;
    for (let y = 0; y < len; y++) { p.set(x, y, F[1]); if (r() < 0.6) p.set(x + (r() < 0.5 ? -1 : 1), y, r() < 0.4 ? G[3] : G[2]); if (r() < 0.3) p.set(x + (r() < 0.5 ? -2 : 2), y, G[4]); if (r() < 0.25) x += r() < 0.5 ? -1 : 1; x = clamp(x, 2, 6); }
    return stampOf(p, 4, 0);
  });
  // Gully (Eisengitter) und Kanaldeckel mit Hüterwappen
  QS.grate = [stampRows(['iiiiiii', 'iDiDiDi', 'iiiiiii', 'iDiDiDi', 'iiiiiii', 'sssssss'], { i: P.steel[1], D: INK, s: alpha(INK, 60) }, 3, 3)];
  QS.cover = [stampRows([
    '...oooo...', '.oiiiiiio.', 'oiigggiiio', 'oiggtggiio', 'oigtTtgiio', 'oiggtggiio', 'oiigggiiio', '.oiiiiiio.', '...oooo...',
  ], { o: mix(P.steel[0], INK, 0.3), i: P.steel[1], g: mix(Y[1], P.steel[1], 0.4), t: TL[1], T: TL[2] }, 5, 4)];
  QS.crack = many(4, (k) => { const r = rng(9800 + k), p = new Px(10, 6); let x = 1, y = 2 + ((r() * 2) | 0); for (let j = 0; j < 8; j++) { p.set(x, y, alpha(INK, 110)); x++; if (r() < 0.4) y = clamp(y + (r() < 0.5 ? -1 : 1), 0, 5); } return stampOf(p, 5, 3); });
  QS.moss = many(4, (k) => { const r = rng(9900 + k), p = new Px(7, 4); for (let j = 0; j < 7; j++) p.set(1 + ((r() * 5) | 0), 1 + ((r() * 2) | 0), r() < 0.5 ? F[2] : G[1]); return stampOf(p, 3, 2); });
  // Brückenpfosten mit Goldknauf
  const post = new Px(5, 9);
  post.rect(0, 2, 5, 7, LST[2]); post.rect(0, 2, 1, 7, LST[4]); post.rect(4, 2, 1, 7, LST[0]); post.rect(0, 1, 5, 1, LST[4]); post.rect(1, 0, 3, 1, Y[3]); post.set(1, 0, Y[4]);
  QS.post = [stampOf(post, 2, 8), flipStamp(stampOf(post, 2, 8))];
}

// ---------------------------------------------------------------------------------------------------- Oberflächen-Zugriffe
const A_COB = allow(S_G), A_GARD = allow(S_G2), A_PATH = allow(S_PATH), A_FLOOR = allow(S_FLOOR), A_TOP = allow(S_TOP), A_FACE = allow(S_FACE);
const A_WALL = allow(S_TOP, S_FACE), A_PAVED = allow(S_G, S_PATH, S_FLOOR, S_HAZ), A_FOOT = allow(S_G, S_PATH, S_FLOOR, S_G2, S_HAZ, S_FACE);
const A_NOSHADE = allow(S_BRIDGE), A_SHORE = allow(S_BANK, S_WATER);

interface QF extends OW { dG2: Float32Array; inG2: Float32Array; nM: Float32Array; nW: Float32Array }

function paintOverworld(c: Chunk): void {
  initStamps();
  const { W, H, kind, buf } = c, seed = c.seed;
  const o = owFields(c, { salt: 700, masonry: true, bank: 5.5, bankVar: 0, bankBar: 0, liqFray: 0 });
  // Abstand der Beete zu ihrer Einfassung (innen) und des Pflasters zu Beeten (außen)
  const n = W * H, g2 = new Uint8Array(n), notG2 = new Uint8Array(n);
  for (let i = 0; i < n; i++) { const b = kind[i] === S_G2 ? 1 : 0; g2[i] = b; notG2[i] = 1 - b; }
  const f: QF = { ...o, dG2: c.dist(g2), inG2: c.dist(notG2), nM: c.noise(29, 708), nW: c.noise(9, 709) };
  for (let y = c.iy0; y < c.iy1; y++) for (let x = c.ix0; x < c.ix1; x++) {
    const i = y * W + x, wx = c.x0 + x, wy = c.y0 + y, z = f.zone[i], h = rnd2(wx, wy, seed);
    let col: number;
    switch (kind[i]) {
      case S_G: col = cobbleCol(c, f, i, wx, wy, z, h); break;
      case S_G2: col = gardenCol(c, f, i, wx, wy, z, h); break;
      case S_PATH: col = streetCol(c, f, i, wx, wy, z, h); break;
      case S_FLOOR: col = plazaCol(c, f, i, wx, wy, z, h); break;
      case S_HAZ: col = gravelCol(f, i, wx, wy, z, h); break;
      case S_BANK: col = rimCol(c, f, i, wx, wy, h); break;
      case S_WATER: col = waterCol(c, f, i, wx, wy); break;
      case S_TOP: col = topCol(c, f, i, wx, wy, z, h); break;
      case S_FACE: col = faceCol(c, f, i, wx, wy, h); break;
      case S_BRIDGE: col = bridgeCol(c, f, wx, wy, h); break;
      default: col = h > 0.993 ? mix(VOIDC, ST[1], 0.4) : VOIDC;
    }
    buf[i] = col;
  }
  groundCover(c, f);
  applyShadow(c, c.wallShadow(f.wallM, f.dWall, 14), f.nC, A_NOSHADE, [0.42, 0.28, 0.14]);
  structures(c, f);
}

// ------------------------------------------------------------------ Kopfsteinpflaster
function cobbleCol(c: Chunk, f: QF, i: number, wx: number, wy: number, z: number, h: number): number {
  // Einfassung zu Beeten: eine Reihe heller Bordsteine liegt auf der Pflasterseite
  const dg = f.dG2[i];
  if (dg < 3.2) { const seg = ((wx + wy) % 7 + 7) % 7; return dg < 1.2 ? LST[1] : seg === 0 ? LST[1] : dg < 2.2 ? LST[4] : LST[3]; }
  // Bogenpflaster: Zellen werden in Reihen leicht gestreckt
  voro(wx, wy + Math.round(Math.sin(wx * 0.11) * 2), 6.4, 5.2, c.seed + 701);
  const e = V.edge, id = V.id, s = V.dx + V.dy;
  const worn = f.nM[i] * 0.55 + f.nB[i] * 0.3 + f.nL[i] * 0.15;
  if (e < 0.6) {
    // Fuge; vereinzelt Moos oder Gras
    if (f.nW[i] > 0.72 && f.dWall[i] < 20 && h < 0.6) return mix(F[1], COB_N[1], 0.4);
    return COB[z][1];
  }
  const tone = (id >>> 8) % 10;
  let t = worn > 0.6 ? 4 : worn < 0.4 ? 2 : 3;
  if (tone === 0) t--; else if (tone === 9) t++;
  if (e < 1.4 && s > 0.8) t--;            // Unterkante im Schatten
  else if (e < 1.5 && s < -1.2) t++;       // Lichtkante oben links
  if (h < 0.03) t--; else if (h > 0.985) t++;
  return COB[z][clamp(t, 1, 5)];
}

// ------------------------------------------------------------------ Gartenbeet / Rasen
function gardenCol(c: Chunk, f: QF, i: number, wx: number, wy: number, z: number, h: number): number {
  const d = f.inG2[i], ku = c.kind[i - c.W];
  // dünne dunkle Erdkante unter der Bordsteinreihe
  if (d < 1.6) return ku !== S_G2 ? SOIL[0] : SOIL[1];
  if (d < 2.6 && h < 0.5) return SOIL[2];
  const v = f.nA[i] * 0.4 + f.nB[i] * 0.35 + f.nC[i] * 0.25;
  // Mähstreifen (diagonal, sehr sanft)
  const stripe = ((Math.floor((wx + wy) / 7) & 1) ? 0.04 : -0.04);
  let t = v + stripe < 0.38 ? 1 : v + stripe < 0.47 ? 2 : v + stripe < 0.56 ? 3 : v + stripe < 0.64 ? 4 : 5;
  if (h < 0.05 && t > 0) t--; else if (h > 0.96 && t < 5) t++;
  if (c.kind[i + c.W] !== S_G2) t = Math.max(0, t - 1);
  return LAWN[z][t];
}

// ------------------------------------------------------------------ Straße
function streetCol(c: Chunk, f: QF, i: number, wx: number, wy: number, z: number, h: number): number {
  const d = f.dPath[i], W = c.W, D = f.dPath, kind = c.kind;
  const ku = kind[i - W];
  if (ku === S_G2) return SOIL[0];
  // Richtung der Straße aus dem Gradienten
  const gx = D[i + 1] - D[i - 1], gy = D[i + W] - D[i - W], vert = Math.abs(gx) > Math.abs(gy);
  const along = vert ? wy : wx, side = (vert ? gx : gy) > 0 ? 0 : 1;
  if (d < 4.2) {
    // Bordsteine in 9-px-Stücken, Lichtkante zur Straße hin
    const m = (((along + side * 4) % 9) + 9) % 9;
    if (d >= 3.2) return FLAG_N[1];
    if (m === 0) return FLAG_N[1];
    if (d < 1.2) return side === 0 ? LST[4] : LST[2];
    return h < 0.08 ? LST[2] : LST[3];
  }
  // Rinne in der Straßenmitte
  if (d > 8 && ((d >= D[i - 1] && d >= D[i + 1] && d > D[i - 2] && d > D[i + 2]) || (d >= D[i - W] && d >= D[i + W] && d > D[i - 2 * W] && d > D[i + 2 * W]))) return h < 0.3 ? FLAG_N[1] : mix(FLAG_N[1], FLAG_N[2], 0.5);
  // Platten im Läuferverband quer zur Laufrichtung
  const u = vert ? wy : wx, v = vert ? wx : wy;
  const row = Math.floor((u + 3) / 9), ru = u + 3 - row * 9, vv = v + (row & 1) * 7 + (hash2(row, 5, c.seed + 711) % 5), k = Math.floor(vv / 14), rv = vv - k * 14;
  const hs = rnd2(k, row, c.seed + 712), hs2 = rnd2(k, row, c.seed + 713);
  if (ru === 8 || rv === 13) return FLAG[z][0];
  let t = hs < 0.25 ? 2 : hs < 0.7 ? 3 : 4;
  if (ru === 0 || rv === 0) t++;
  else if (ru === 7 || rv === 12) t--;
  if (f.nC[i] > 0.66 && hs2 > 0.4) t--;
  if (f.nM[i] > 0.64) t++;                 // ausgetretene Mitte
  if (h < 0.04) t--; else if (h > 0.97) t++;
  return FLAG[z][clamp(t, 1, 5)];
}

// ------------------------------------------------------------------ Hüterplatz
function plazaCol(c: Chunk, f: QF, i: number, wx: number, wy: number, z: number, h: number): number {
  // Diagonalraster: Rauten aus hellen Platten, alle 32 px eine Goldfuge, an den Kreuzungen Türkis-Einlagen
  const a = wx + wy, b = wx - wy, ma = ((a % 16) + 16) % 16, mb = ((b % 16) + 16) % 16;
  const A2 = ((a % 32) + 32) % 32, B2 = ((b % 32) + 32) % 32;
  const ca = Math.floor(a / 16), cb = Math.floor(b / 16), hs = hash2(ca, cb, c.seed + 721) & 7;
  // Kreuzungspunkte der Goldfugen: kleine Türkisraute
  const da = Math.min(A2, 32 - A2), db = Math.min(B2, 32 - B2);
  if (da + db < 4) return da + db < 2 ? (h < 0.5 ? MANA[3] : MANA[4]) : MANA[1];
  if (A2 === 0 || B2 === 0) return GOLD[(wx + wy) & 1 ? 1 : 0];
  if (ma === 0 || mb === 0) return LST[1];
  if (ma === 1 || mb === 1) return LST[3];
  let t = hs < 5 ? 3 : hs < 7 ? 2 : 4;
  if (ma === 15 || mb === 15) t = 1;
  if (f.nC[i] > 0.68) t--;
  if (h < 0.03) t--; else if (h > 0.98) t = 4;
  const col = LST[clamp(t, 0, 4)];
  return z === 0 ? zShade(col) : z === 2 ? zSun(col) : col;
}

// ------------------------------------------------------------------ Kies
function gravelCol(f: QF, i: number, wx: number, wy: number, z: number, h: number): number {
  const g = rnd2(wx >> 1, wy >> 1, 731), t = g < 0.2 ? 1 : g < 0.6 ? 2 : g < 0.9 ? 3 : 4;
  return COB[z][clamp(t + (h > 0.95 ? 1 : 0) - (f.nC[i] > 0.7 ? 1 : 0), 0, 5)];
}

// ------------------------------------------------------------------ Kanal: Steinkante und nasse Wand
function rimCol(c: Chunk, f: QF, i: number, wx: number, wy: number, h: number): number {
  const d = f.dLand[i], W = c.W, seed = c.seed;
  const ny = (f.dLand[i + W] - f.dLand[i - W]) * 0.5, nx = (f.dLand[i + 1] - f.dLand[i - 1]) * 0.5;
  const horiz = Math.abs(ny) >= Math.abs(nx), along = horiz ? wx : wy;
  const seg = (((along + (hash2(horiz ? wy >> 4 : wx >> 4, 5, seed + 741) % 9)) % 9) + 9) % 9;
  if (d < 1.1) return LST[0];
  if (d < 4.2) {
    // Kantensteine: Lichtseite am Nordufer oben (Wasser liegt südlich → ny > 0)
    if (seg === 8) return LST[1];
    if (d < 2.2) return ny > 0.3 ? LST[4] : LST[3];
    return h < 0.06 ? LST[2] : LST[3];
  }
  if (d < 5.2) return mix(LST[0], INK, 0.2);
  // nasse Kanalwand (nur am Nordufer sichtbar), sonst schmale Stufe
  if (ny > 0.35) return seg === 8 || ((wy & 3) === 3) ? mix(WET, INK, 0.25) : mix(LST[1], WET, 0.45);
  return mix(LST[1], WET, 0.35);
}
function waterCol(c: Chunk, f: QF, i: number, wx: number, wy: number): number {
  const d = f.dLand[i], bw = f.bankW[i], dw = d - bw, W = c.W;
  const ny = (f.dLand[i + W] - f.dLand[i - W]) * 0.5;
  if (ny > 0.35 && dw < 3) return alpha(INK, dw < 1.5 ? 120 : 70);       // Schatten der Kanalwand
  if (dw < 1.2) return alpha(WHITE, (hash2(wx >> 1, wy, 751) & 3) === 0 ? 90 : 40);  // heller Saum am Stein
  if (d > 18 + f.nB[i] * 6) return alpha(mix(TL[0], P.blue[0], 0.3), 70);
  return 0;
}

// ------------------------------------------------------------------ Stadtmauer: Oberseite (Wehrgang, Terrasse)
function topCol(c: Chunk, f: QF, i: number, wx: number, wy: number, z: number, h: number): number {
  const g = f.geom, d = f.dTop[i], ts = g.ts[i], seed = c.seed;
  // Schieferabdeckung an der Abbruchkante (über der Front)
  if (ts <= 4) {
    if (ts === 4) return SLT[0];
    const m = (((wx + (wy >> 4) * 3) % 5) + 5) % 5;
    return m === 4 ? SLT[1] : ts === 1 ? SLT[2] : ts === 2 ? SLT[4] : SLT[3];
  }
  if (d <= 3.01) {
    const nOpen = g.tn[i] <= 3, along = nOpen ? wx : wy, cj = (((along + (hash2((nOpen ? wy : wx) >> 4, 3, seed + 761) % 9)) % 9) + 9) % 9;
    if (cj === 0 || d > 2.01) return LST[0];
    return d <= 1.01 ? LST[4] : LST[3];
  }
  // Wehrgang aus Platten, tiefer im Mauerkörper eine bepflanzte Terrasse
  const veg = d + (f.nB[i] - 0.5) * 8;
  if (veg < 12) {
    const row = Math.floor(wy / 7), xx = wx + (row & 1) * 5, k = Math.floor(xx / 11), ry = wy - row * 7, rx = xx - k * 11, hs = rnd2(k, row, seed + 762);
    if (ry === 6 || rx === 10) return FLAG[z][0];
    let t = hs < 0.3 ? 2 : hs < 0.75 ? 3 : 4; if (ry === 0 || rx === 0) t++; if (h < 0.05) t--;
    return FLAG[z][clamp(t, 1, 5)];
  }
  if (veg < 13.2) return SOIL[1];
  const v = f.nA[i] * 0.5 + f.nC[i] * 0.5;
  return LAWN[z][clamp(Math.round(1 + v * 3 + (h > 0.96 ? 1 : 0)), 0, 5)];
}

// ------------------------------------------------------------------ Stadtmauer: Front
function faceCol(c: Chunk, f: QF, i: number, wx: number, wy: number, h: number): number {
  const g = f.geom, v = g.fv[i], fh = g.fh[i], top = fh - v, seed = c.seed;
  let col: number;
  if (top < 4) {
    // Deckgesims aus hellem Stein
    col = top === 0 ? LST[4] : top === 1 ? LST[3] : top === 2 ? LST[2] : LST[0];
    if (top < 3 && (((wx + (hash2((wy - top) >> 4, 2, seed + 771) % 11)) % 11) + 11) % 11 === 0) col = LST[1];
  } else {
    // Quaderwerk: Lagen 6 px, Steine 10–15 px, Ton je Stein
    const y0 = wy - top, ly = top - 4, row = Math.floor(ly / 6), m = ly - row * 6;
    const off = hash2(row, (y0 >> 4) & 1023, seed + 772) % 13, xx = wx + off, bwid = 12, k = Math.floor(xx / bwid), mx = xx - k * bwid, hs = hash2(k, row, seed + 773);
    let t = 2 + ((hs & 3) === 0 ? 1 : (hs & 3) === 1 ? -1 : 0);
    if (m === 5 || mx === bwid - 1) t = 0; else if (m === 0 || mx === 0) t++; else if (m === 4) t--;
    if (h < 0.05) t--; else if (h > 0.97) t++;
    col = COB_N[clamp(t + 1, 0, 5)];
    // goldenes Band unter dem Gesims an hohen Mauern
    if (fh >= 26 && top === 5) col = (wx & 7) < 4 ? GOLD[1] : GOLD[2];
  }
  if (top === 4) col = mix(col, SHADE, 0.4);
  if (v === 1) col = mix(col, SHADE, 0.45); else if (v <= 3) col = mix(col, SHADE, 0.2);
  if (!f.wallM[i - 1]) col = mix(col, LST[4], 0.4);
  else if (!f.wallM[i + 1]) col = mix(col, SHADE, 0.45);
  return col;
}

// ------------------------------------------------------------------ Brücke
function bridgeCol(c: Chunk, f: QF, wx: number, wy: number, h: number): number {
  const map = c.map, cx = wx >> 4, cy = wy >> 4, lx = wx & 15, ly = wy & 15, seed = c.seed;
  const dir = f.dirs[cy * map.w + cx] || 1;
  const liq = (x: number, y: number): boolean => tileAt(map, x, y) === LIQUID;
  const nL = liq(cx, cy - 1), sL = liq(cx, cy + 1), wL = liq(cx - 1, cy), eL = liq(cx + 1, cy);
  const rail = (k: number): number => (k === 0 ? LST[4] : k === 1 ? LST[3] : k === 2 ? LST[2] : k === 3 ? LST[1] : LST[0]);
  if (dir === 1) { if (nL && ly < 5) return rail(ly); if (sL && ly > 10) return rail(ly - 11); }
  else { if (wL && lx < 4) return lx === 0 ? LST[0] : rail(lx - 1); if (eL && lx > 11) return lx === 15 ? LST[0] : rail(15 - lx); }
  const u = dir === 1 ? wx : wy, vv = dir === 1 ? wy : wx, row = Math.floor(u / 9), ru = u - row * 9;
  const v2 = vv + (row & 1) * 7, k = Math.floor(v2 / 14), rv = v2 - k * 14, hs = rnd2(row, k, seed + 781);
  if (ru === 8 || rv === 13) return FLAG_N[0];
  let t = hs < 0.25 ? 2 : hs < 0.7 ? 3 : 4;
  if (ru === 0 || rv === 0) t++;
  if (h < 0.05) t--; else if (h > 0.97) t++;
  return FLAG_N[clamp(t, 1, 5)];
}

// ------------------------------------------------------------------ Bodendecker
function groundCover(c: Chunk, f: QF): void {
  const { W, kind } = c, seed = c.seed;
  c.cells((cx, cy) => {
    seedAt(cx, cy, seed + 790);
    const x0 = cx * TS, y0 = cy * TS;
    for (let k = 0; k < 7; k++) {
      const wx = x0 + ri(16), wy = y0 + ri(16), r = rf(), i = (wy - c.y0) * W + (wx - c.x0), kd = kind[i];
      const hv = hash2(wx, wy, seed + 791);
      let q = r;
      if (kd === S_G) {
        const nearWall = f.dWall[i] < 14;
        if ((q -= nearWall ? 0.05 : 0.012) < 0) c.blitK(QS.tiny[hv % QS.tiny.length], wx, wy, A_COB);
        else if ((q -= 0.012) < 0) c.blitK(QS.pebble[hv % QS.pebble.length], wx, wy, A_COB);
        else if ((q -= 0.008) < 0) c.blitK(QS.leaf[hv % QS.leaf.length], wx, wy, A_PAVED);
        else if ((q -= nearWall ? 0.03 : 0.004) < 0) c.blitK(QS.moss[hv % QS.moss.length], wx, wy, A_COB);
      } else if (kd === S_G2) {
        const d = f.inG2[i];
        if (d < 5) continue;
        if ((q -= 0.05) < 0) c.blitK(QS.flower[hv % QS.flower.length], wx, wy, A_GARD);
        else if ((q -= 0.08) < 0) c.blitK(QS.tuft[hv % QS.tuft.length], wx, wy, A_GARD);
      } else if (kd === S_PATH) {
        if ((q -= 0.02) < 0) c.blitK(QS.crack[hv % QS.crack.length], wx, wy, A_PATH);
        else if ((q -= 0.012) < 0) c.blitK(QS.pebble[hv % QS.pebble.length], wx, wy, A_PATH);
        else if ((q -= 0.006) < 0) c.blitK(QS.leaf[hv % QS.leaf.length], wx, wy, A_PATH);
      } else if (kd === S_FLOOR) {
        if ((q -= 0.006) < 0) c.blitK(QS.leaf[hv % QS.leaf.length], wx, wy, A_FLOOR);
      } else if (kd === S_TOP) {
        if (f.dTop[i] > 14 && (q -= 0.06) < 0) c.blitK(QS.flower[hv % QS.flower.length], wx, wy, A_TOP);
        else if (f.dTop[i] > 14 && (q -= 0.1) < 0) c.blitK(QS.tuft[hv % QS.tuft.length], wx, wy, A_TOP);
      }
    }
    // Büsche in Beeten (eine Chance je Zelle, nur tief im Beet), Gully und Kanaldeckel im Pflaster
    const wx = x0 + 8, wy = y0 + 10, i = (wy - c.y0) * W + (wx - c.x0), hv = hash2(cx, cy, seed + 792);
    if (kind[i] === S_G2 && f.inG2[i] > 9 && hv % 4 === 0) c.blitK(QS.bush[hv % QS.bush.length], wx + ((hv >> 4) % 5) - 2, wy, A_GARD);
    else if (kind[i] === S_G && f.dWall[i] > 6 && f.dWall[i] < 12 && hv % 23 === 0) c.blitK(QS.grate[0], wx, wy, A_COB);
    else if (kind[i] === S_PATH && f.dPath[i] > 6 && hv % 37 === 0) c.blitK(QS.cover[0], wx, wy - 2, A_PATH);
  });
}

// ------------------------------------------------------------------ Aufbauten
function structures(c: Chunk, f: QF): void {
  const { W, kind, map } = c, seed = c.seed, g = f.geom, dirs = f.dirs;
  c.cells((cx, cy, t) => {
    const x0 = cx * TS, y0 = cy * TS;
    seedAt(cx, cy, seed + 795);
    // Efeu an den Mauerfronten (Anker an der Gesimsunterkante), Grasbüschel am Mauerfuß
    for (let k = 0; k < 2; k++) {
      const wx = x0 + ri(16), wy = y0 + ri(16), r = rf(), i = (wy - c.y0) * W + (wx - c.x0);
      if (kind[i] !== S_FACE) continue;
      const fromTop = g.fh[i] - g.fv[i];
      if (fromTop <= 12 && r < 0.22) c.blitK(QS.ivy[ri(QS.ivy.length)], wx, wy - fromTop + 4, A_WALL);
      else if (g.fv[i] < 5 && r < 0.5) c.blitK(QS.tiny[ri(QS.tiny.length)], wx, wy + g.fv[i], A_FOOT);
    }
    if (t !== BRIDGE) return;
    const liq = (x: number, y: number): boolean => tileAt(map, x, y) === LIQUID;
    const br = (x: number, y: number): boolean => tileAt(map, x, y) === BRIDGE;
    const nL = liq(cx, cy - 1), sL = liq(cx, cy + 1), wL = liq(cx - 1, cy), eL = liq(cx + 1, cy), dir = dirs[cy * map.w + cx];
    if (sL) for (let x = 0; x < 16; x++) {
      const wx = x0 + x;
      c.setK(wx, y0 + 16, LST[3], A_SHORE); c.setK(wx, y0 + 17, wx % 9 === 0 ? LST[1] : LST[2], A_SHORE); c.setK(wx, y0 + 18, LST[0], A_SHORE);
      for (let k = 0; k < 5; k++) c.setK(wx + (k >> 1), y0 + 19 + k, alpha(INK, k < 2 ? 120 : 60), A_SHORE);
    }
    const end = (x: number, y: number): boolean => !br(x, y);
    if (dir === 1) {
      if (nL && end(cx - 1, cy)) c.blit(QS.post[0], x0 + 2, y0 + 5);
      if (nL && end(cx + 1, cy)) c.blit(QS.post[1], x0 + 13, y0 + 5);
      if (sL && end(cx - 1, cy)) c.blit(QS.post[0], x0 + 2, y0 + 16);
      if (sL && end(cx + 1, cy)) c.blit(QS.post[1], x0 + 13, y0 + 16);
    } else {
      if (wL && end(cx, cy - 1)) c.blit(QS.post[0], x0 + 2, y0 + 6);
      if (eL && end(cx, cy - 1)) c.blit(QS.post[1], x0 + 13, y0 + 6);
      if (wL && end(cx, cy + 1)) c.blit(QS.post[0], x0 + 2, y0 + 16);
      if (eL && end(cx, cy + 1)) c.blit(QS.post[1], x0 + 13, y0 + 16);
    }
  });
  void A_FACE;
}

// ---------------------------------------------------------------------------------------------------- Maler
export const quellwarte: BiomePainter = {
  biome: 'quellwarte',
  // Die Quellwarte hat keinen Dungeon; falls doch, wird derselbe Stadtboden gemalt.
  paint(c) { paintOverworld(c); },
  liquid: quellwarteLiquid,
};

/** Kanalwasser: das Grünwald-Wasser, eine Spur kühler und klarer (Quellwasser). */
let LQ: Px[] | null = null;
function quellwarteLiquid(): Px[] {
  if (LQ) return LQ;
  LQ = gruenwaldLiquid().map((fr) => {
    const o = new Px(fr.w, fr.h);
    for (let k = 0; k < fr.d.length; k++) { const v = fr.d[k]; o.d[k] = v >>> 24 ? ((mix(v, TL[2], 0.18) & 0xffffff) | (v & 0xff000000)) >>> 0 : 0; }
    return o;
  });
  return LQ;
}
