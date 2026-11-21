/**
 * Frostgebirge – „Stille über den Wolken“. Bodenmaler v2 (Oberwelt); Aufbau wie gruenwald.ts (siehe core.ts).
 * Der Dungeon „Gletscherdom“ liegt in frost_dom.ts, Farben und Stempel in frost_stamps.ts, das Eiswasser in frost_liquid.ts.
 *
 *   GROUND   Neuschnee: Wehen mit blauvioletten Leeschatten (aus einem Höhenfeld, Licht von oben links), Windrippel,
 *            Glitzerpixel, gefrorene Grasbüschel, Kiesel, Tierfährten; Lichtzonen (sonnig weiß ↔ schattig blau).
 *   GROUND2  Firn: härter und blauer, schräg laufende Windgangeln, Blankeisflecken mit Frostblumen.
 *   PATH     festgetretene Passspur: grauer Schnee, Kufenrillen, Stiefelabdrücke, freigelegte Erde, Schneewälle am Rand.
 *   WALL     Schieferfels mit Schneewechte, Eiszapfen, Eisfällen; Oberseite verschneit, innen schroffe Felsrippen.
 *   LIQUID   Ufer als Eisschelf mit Rissen und Schneeüberhang;  HAZARD dünnes, rissiges Eis;  BRIDGE Bohlensteg mit Seilen.
 */
import { INK, alpha, hash2, mix, rnd2 } from '../palette';
import {
  BRIDGE, Chunk, HAZARD, LIQUID, SHADE, TS, allow, clamp, rf, ri, seedAt, tileAt, voro, V, type BiomePainter,
} from './core';
import { S_BANK, S_BRIDGE, S_FACE, S_FLOOR, S_G, S_G2, S_HAZ, S_PATH, S_TOP, S_VOID, S_WATER, applyShadow, owFields, type OW } from './frost_util';
import { DEEP, ERD, FIRN, FS, ICE, PACK, PLANK, ROPE, SLATE, SN, SNOW, SNSH, THIN, VOIDC, initFrostStamps } from './frost_stamps';
import { paintDom } from './frost_dom';
import { frostLiquid } from './frost_liquid';

const A_SNOW = allow(S_G, S_G2), A_OPEN = allow(S_G, S_G2, S_PATH, S_HAZ, S_BANK), A_PATH = allow(S_PATH), A_TOP = allow(S_TOP);
/** Büschel und Hügel wachsen vom Fußpunkt nach oben und dürfen überdecken, was dahinter liegt. */
const A_TUFT = allow(S_G, S_G2, S_BANK, S_PATH, S_TOP, S_FACE, S_HAZ);
const A_WALL = allow(S_TOP, S_FACE), A_FACE = allow(S_FACE), A_SHORE = allow(S_BANK, S_WATER), A_ICE = allow(S_G2, S_HAZ);
const A_FOOT = allow(S_G, S_G2, S_PATH, S_HAZ, S_BANK, S_FACE), A_NOSHADE = allow(S_BRIDGE);

interface FF extends OW { hg: Float32Array }

function paintOverworld(c: Chunk): void {
  initFrostStamps();
  const { W, H, kind, buf } = c, n = W * H, seed = c.seed;
  const o = owFields(c, { salt: 400, masonry: false, bank: 5, bankVar: 2.5, bankBar: 46, liqFray: 1 });
  // Höhenfeld der Schneewehen: seine Ableitung in Lichtrichtung ergibt Lichtkante und Leeschatten
  const hg = new Float32Array(n);
  for (let i = 0; i < n; i++) hg[i] = o.nL[i] * 0.55 + o.nB[i] * 0.33 + o.nA[i] * 0.12;
  const f: FF = { ...o, hg };
  void H;
  for (let y = c.iy0; y < c.iy1; y++) for (let x = c.ix0; x < c.ix1; x++) {
    const i = y * W + x, wx = c.x0 + x, wy = c.y0 + y, z = f.zone[i], h = rnd2(wx, wy, seed);
    let col: number;
    switch (kind[i]) {
      case S_G: col = snowCol(c, f, i, wx, wy, z, h); break;
      case S_G2: col = firnCol(c, f, i, wx, wy, z, h); break;
      case S_PATH: col = pathCol(c, f, i, wx, wy, h); break;
      case S_HAZ: col = thinIce(c, i, wx, wy, h); break;
      case S_FLOOR: {
        voro(wx, wy, 9, 8, seed + 22);
        const hv = (V.id >>> 16) / 65536, s = V.dx + V.dy;
        col = V.edge < 1 ? (f.nB[i] > 0.5 ? SNOW[1][2] : SLATE[1]) : s < -2.6 ? SLATE[5] : s > 3 ? SLATE[2] : hv < 0.3 ? SLATE[3] : SLATE[4];
        if (f.nB[i] * 0.6 + f.nC[i] * 0.4 > 0.62) col = SNOW[1][h < 0.2 ? 2 : 3];
        break;
      }
      case S_BANK: col = bankCol(c, f, i, wx, wy, h); break;
      case S_WATER: col = waterCol(c, f, i, wx, wy); break;
      case S_TOP: col = topCol(c, f, i, wx, wy, h); break;
      case S_FACE: col = faceCol(c, f, i, wx, wy, h); break;
      case S_BRIDGE: col = bridgeCol(c, f, i, wx, wy, h); break;
      default: col = h > 0.993 ? mix(VOIDC, SN[0], 0.4) : VOIDC;
    }
    buf[i] = col;
  }
  groundCover(c, f);
  // lange, klar blaue Schatten am Wandfuß
  applyShadow(c, c.wallShadow(f.wallM, f.dWall, 17), f.nC, A_NOSHADE, [0.5, 0.36, 0.2], SNSH);
  structures(c, f);
}

// ------------------------------------------------------------------ Schnee
/** Tonstufe 0..4 einer Schneefläche aus der Neigung des Höhenfelds (Licht von oben links). */
function drift(f: FF, i: number, W: number): number {
  const sl = f.hg[i + W + 1] - f.hg[i - W - 1];
  return sl < -0.058 ? 0 : sl < -0.03 ? 1 : sl > 0.052 ? 4 : sl > -0.006 ? 3 : 2;
}
function snowCol(c: Chunk, f: FF, i: number, wx: number, wy: number, z: number, h: number): number {
  const W = c.W, kind = c.kind, seed = c.seed;
  let t = drift(f, i, W);
  // Windrippel: kurze, dem Gelände folgende Querlinien auf den ruhigen Flächen
  if (t >= 2) {
    const yy = wy + ((f.nB[i] * 13) | 0) + ((f.nL[i] * 22) | 0), m = ((yy % 7) + 7) % 7;
    if (m === 0 && rnd2(wx >> 3, yy, seed + 41) < 0.34) t--;
    else if (m === 1 && t === 3 && rnd2(wx >> 3, yy - 1, seed + 41) < 0.12) t = 4;
  }
  // Schneewall entlang des Wegs: heller Kamm, außen (unten rechts) ein Schattenband
  const dp = f.dPathOut[i];
  if (dp < 5.2) {
    const g = f.dPathOut[i + W] - f.dPathOut[i - W] + f.dPathOut[i + 1] - f.dPathOut[i - 1];
    if (dp < 2.6 + (f.nA[i] - 0.5) * 1.6) t = 4;
    else if (g > 0.6) t = dp < 4 ? 1 : 2;
  }
  // Überhang zum Wasser und zum dünnen Eis
  if (f.dShore[i] < 2.2) t = 4;
  const kd = kind[i + W];
  if (kd === S_HAZ || kd === S_BANK) t = 4;
  if (h > 0.992) t = 4; else if (h < 0.006 && t > 1) t--;
  return SNOW[z][t];
}
function firnCol(c: Chunk, f: FF, i: number, wx: number, wy: number, z: number, h: number): number {
  const W = c.W, seed = c.seed;
  const ice = iceVal(f, i);
  if (ice > 0.615 && f.dPathOut[i] > 4) {
    // Blankeis liegt tiefer als der Firn: oben links Schattenkante, unten rechts heller Firnrand
    if (ice < 0.64) { const g = iceVal(f, i + W + 1) - iceVal(f, i - W - 1); return g > 0 ? ICE[1] : ICE[6]; }
    const k = wx + wy, m = ((k % 13) + 13) % 13;
    if (m < 2 && rnd2(Math.floor(k / 13), (wx - wy) >> 3, seed + 52) < 0.42) return m === 0 ? ICE[6] : ICE[5];
    const v = f.nC[i] * 0.6 + f.nA[i] * 0.4;
    let t = v < 0.36 ? 2 : v > 0.62 ? 4 : 3;
    if (ice > 0.7) t--;
    if (h > 0.985) t = 6;
    return ICE[t];
  }
  let t = drift(f, i, W);
  // Windgangeln: schräg laufende harte Rippen (Lichtkante + Schattenfuge)
  const u = wx + wy * 2 + ((f.nB[i] * 18) | 0), m = ((u % 10) + 10) % 10;
  if (f.nA[i] > 0.36) { if (m === 0 && t < 4) t++; else if (m === 1 && t > 0) t--; }
  const dp = f.dPathOut[i];
  if (dp < 2.6 + (f.nA[i] - 0.5) * 1.6) t = 4;
  if (h > 0.99) t = 4; else if (h < 0.012 && t > 0) t--;
  return FIRN[z][t];
}
function iceVal(f: FF, i: number): number { return f.nL[i] * 0.5 + f.nB[i] * 0.34 + f.nC[i] * 0.16; }

// ------------------------------------------------------------------ Passweg
function pathCol(c: Chunk, f: FF, i: number, wx: number, wy: number, h: number): number {
  const d = f.dPath[i], e = f.nA[i] - 0.5, W = c.W, kind = c.kind, seed = c.seed;
  const ku = kind[i - W], kl = kind[i - 1];
  // der Schneewall wirft einen schmalen blauen Schatten auf die tiefer liegende Spur
  if (ku === S_G || ku === S_G2 || ku === S_HAZ) return mix(PACK[1], SNSH, 0.4);
  if (kl === S_G || kl === S_G2) return PACK[1];
  if (d < 2 + e * 2.2) return h < 0.3 ? PACK[3] : PACK[2];
  // freigetretene Erde mit Steinen in der Wegmitte
  const er = f.nL[i] * 0.44 + f.nB[i] * 0.4 + f.nC[i] * 0.16 + clamp((d - 8) / 40, 0, 0.1);
  if (d > 5.5 && er > 0.655) {
    if (er < 0.672) return PACK[0];
    const off = hash2(wy, 4, seed + 60) & 3, hd = rnd2((wx + off) >> 2, wy, seed + 61);
    if (h > 0.975) return SLATE[4];
    return hd < 0.18 ? ERD[0] : hd > 0.86 ? ERD[3] : hd > 0.5 ? ERD[2] : ERD[1];
  }
  const v = f.nL[i] * 0.4 + f.nB[i] * 0.42 + f.nC[i] * 0.18;
  let t = v < 0.4 ? 3 : v > 0.58 ? 5 : 4;
  // Kufenrillen: je Wegseite eine dunkle Rille mit hellem Wulst daneben
  const rut = d - (8.6 + (f.nB[i] - 0.5) * 3);
  if (f.nC[i] > 0.22) { if (rut > 0 && rut < 1.3) t = 1; else if (rut >= 1.3 && rut < 2.4) t = 5; else if (rut > 3.6 && rut < 4.7) t = 2; }
  // waagerechte Schleifspuren und Krümel
  const off = hash2(wy, 3, seed + 62) & 7, hd = rnd2((wx + off) >> 2, wy, seed + 63);
  if (hd < 0.05) t = t > 2 ? t - 1 : 2; else if (hd > 0.965 && t < 5) t++;
  if (h > 0.992) t = 5; else if (h < 0.008) t = 2;
  return PACK[t];
}

// ------------------------------------------------------------------ Ufer (Eisschelf) und Wasser
function bankCol(c: Chunk, f: FF, i: number, wx: number, wy: number, h: number): number {
  const d = f.dLand[i], dw = f.dWat[i], W = c.W, seed = c.seed;
  const ny = (f.dLand[i + W] - f.dLand[i - W]) * 0.5;
  // Schneeüberhang am Land; am Nordufer mit Schattenfuge darunter
  if (d < 1.5) return SN[4];
  if (ny > 0.3) { if (d < 2.6) return SNOW[1][h < 0.4 ? 3 : 4]; if (d < 3.7) return mix(ICE[2], SNSH, 0.45); }
  else if (d < 2.3) return SNOW[1][2];
  // Eisschelf: Platten mit Rissen; zum Wasser eine helle Bruchkante über dunkler Stirn
  if (dw <= 1.2) return ny > -0.2 ? ICE[1] : ICE[6];
  if (dw <= 2.3) return ICE[6];
  voro(wx, wy, 10, 7, seed + 70);
  const hv = (V.id >>> 16) / 65536;
  if (V.edge < 0.85) return hv < 0.5 ? ICE[2] : ICE[1];
  if (V.edge < 1.9 && V.dx + V.dy < 0) return ICE[6];
  // Schnee liegt in Flecken auf dem Schelf
  if (f.nB[i] * 0.6 + f.nC[i] * 0.4 > 0.6) return SNOW[1][h < 0.15 ? 2 : 3];
  if (h > 0.985) return SN[4];
  return hv < 0.3 ? THIN[2] : hv > 0.75 ? ICE[5] : THIN[3];
}
function waterCol(c: Chunk, f: FF, i: number, wx: number, wy: number): number {
  const bw = f.bankW[i], d = f.dLand[i], dw = d - bw, W = c.W;
  const ny = (f.dLand[i + W] - f.dLand[i - W]) * 0.5;
  if (ny > 0.35) {
    // Schlagschatten der Eiskante, davor Eisbrei
    if (dw < 1.6) return alpha(INK, 135);
    if (dw < 3) return alpha(DEEP, 110);
    if (dw < 4.4 && rnd2(wx >> 1, wy, 77) > 0.45) return alpha(ICE[5], 170);
  } else if (dw < 1.2 && rnd2(wx >> 1, wy >> 1, 78) > 0.3) return alpha(ICE[6], 190);
  else if (dw < 2.2 && ny > -0.3) return alpha(DEEP, 70);
  const dd = d + (f.nB[i] - 0.5) * 9 + (f.nL[i] - 0.5) * 8;
  if (dd > 27) return alpha(DEEP, 100);
  if (dd > 17) return alpha(DEEP, 55);
  // helleres Flachwasser über dem untergetauchten Schelf
  if (dw < 5 + f.nA[i] * 4) return alpha(ICE[2], 70);
  return 0;
}
/** Dünnes Eis (Gefahr): blasse türkise Schollen, dunkle Risse, stellenweise schon eingebrochen. */
function thinIce(c: Chunk, i: number, wx: number, wy: number, h: number): number {
  const ku = c.kind[i - c.W], kl = c.kind[i - 1];
  if (ku === S_G || ku === S_G2) return mix(THIN[1], SNSH, 0.4);
  if (kl === S_G || kl === S_G2) return THIN[1];
  voro(wx, wy, 11, 9, c.seed + 80);
  const hv = (V.id >>> 16) / 65536, s = V.dx + V.dy;
  if (V.edge < 0.9) return THIN[0];
  if (hv < 0.16) {
    // eingebrochene Scholle: Wasser mit hellem Eisrand
    if (V.edge < 2) return THIN[4];
    return V.edge < 3.2 ? mix(THIN[0], INK, 0.2) : h > 0.97 ? THIN[1] : mix(THIN[0], DEEP, 0.5);
  }
  if (V.edge < 1.9 && s < 0) return THIN[4];
  if (V.edge < 1.9 && s > 2) return THIN[1];
  const k = wx + wy, m = ((k % 11) + 11) % 11;
  if (m === 0 && rnd2(Math.floor(k / 11), (wx - wy) >> 3, c.seed + 81) < 0.4) return SN[4];
  if (h > 0.985) return SN[4];
  return hv < 0.45 ? THIN[2] : hv > 0.8 ? THIN[4] : THIN[3];
}

// ------------------------------------------------------------------ Wand: Oberseite
function topCol(c: Chunk, f: FF, i: number, wx: number, wy: number, h: number): number {
  const g = f.geom, d = f.dTop[i], ts = g.ts[i], W = c.W;
  // Wechte an der Abbruchkante: gleißender Rand, dahinter eine weiche Mulde
  if (ts <= 3) return ts === 3 && h < 0.35 ? SNOW[2][3] : SN[4];
  if (ts < 255 && ts <= 5 + f.nA[i] * 4) return SNOW[1][ts <= 5 ? 1 : 2];
  // Nord- und Westkanten fangen das Licht, Ostkanten bekommen eine blaue Kontur
  const lit = g.tn[i] <= 2 || !f.wallM[i - 1] || !f.wallM[i - 2];
  if (lit) return (g.tn[i] === 1 || !f.wallM[i - 1]) && f.nC[i] > 0.3 ? SN[4] : SNOW[2][3];
  if (d <= 1.01 && ts === 255) return SNOW[0][0];
  if (!f.wallM[i + 2] || !f.wallM[i + 3]) return SNOW[0][1];
  // Hochfläche: nach innen schattiger; im Inneren stoßen Felsrippen durch den Schnee
  const deep = clamp((d - 12) / 26, 0, 1), sl = f.hg[i + W + 1] - f.hg[i - W - 1];
  const rk = f.nL[i] * 0.5 + f.nB[i] * 0.36 + f.nC[i] * 0.14;
  if (d > 7 && rk > 0.63 - deep * 0.13) {
    // Fels: dem Licht zugewandte Flanken tragen Schnee, die übrigen zeigen gebänderten Schiefer
    if (sl > 0.02) return SNOW[deep > 0.5 ? 0 : 1][sl > 0.06 ? 4 : 3];
    if (rk < 0.645 - deep * 0.13) return SLATE[0];
    const yy = wy + ((f.nB[i] * 9) | 0), band = ((yy % 5) + 5) % 5;
    let t = sl < -0.06 ? 1 : sl < -0.025 ? 2 : 3;
    if (band === 0) t--; else if (band === 1 && h < 0.5) t++;
    if (h > 0.97) t++;
    return SLATE[clamp(t, 0, 5)];
  }
  let t = sl < -0.058 ? 0 : sl < -0.03 ? 1 : sl > 0.052 ? 4 : sl > -0.006 ? 3 : 2;
  if (h > 0.992) t = 4;
  const z = deep > 0.55 + (f.nA[i] - 0.5) * 0.3 ? 0 : 1;
  if (z === 0 && t > 0 && deep > 0.85 && t < 4) t--;
  return SNOW[z][t];
}

// ------------------------------------------------------------------ Wand: Front (Schieferbänke, Eisfälle, Schneewechte)
function faceCol(c: Chunk, f: FF, i: number, wx: number, wy: number, h: number): number {
  const g = f.geom, v = g.fv[i], fh = g.fh[i], seed = c.seed, top = fh - v;
  // Schneewechte hängt bogig über die Oberkante
  const hang = 2 + (hash2(wx >> 2, 7, seed + 104) % 3) + (hash2(wx >> 1, 9, seed + 105) % 6 === 0 ? 2 : 0);
  if (top < hang) return top === hang - 1 ? SNOW[1][h < 0.5 ? 0 : 1] : top === 0 ? SN[4] : SNOW[1][h < 0.25 ? 2 : 3];
  // Schneekeil am Wandfuß
  const pile = hash2(wx >> 2, 11, seed + 113) % 4;
  if (v <= pile) return v === pile ? SNOW[1][3] : SNOW[0][h < 0.4 ? 1 : 2];
  let col: number;
  const en = f.nL[i] * 0.62 + f.nB[i] * 0.38;
  if (en > 0.6) {
    // Eisfall: senkrechte Bahnen mit Wülsten
    if (en < 0.614) col = ICE[1];
    else {
      const cs = hash2(wx, 3, seed + 111) & 7, cs2 = hash2(wx >> 1, 5, seed + 112) & 3;
      let t = cs === 0 ? 6 : cs < 3 ? 5 : cs < 6 ? 4 : cs === 6 ? 3 : 2;
      const m = (((wy + cs2 * 2) % 9) + 9) % 9;
      if (m === 0 && t < 6) t++; else if (m === 1) t--;
      if (h > 0.98) t = 6;
      col = ICE[clamp(t, 1, 6)];
    }
  } else {
    // Schichten: Zeilen leicht gewellt, Blockbreiten unregelmäßig
    const yy = wy + Math.round((f.nB[i] - 0.5) * 6), row = Math.floor(yy / 7), ry = yy - row * 7;
    const xx = wx + (hash2(row, 0, seed + 101) % 13), k0 = Math.floor(xx / 13);
    let k = k0, start = k0 * 13 + (hash2(k0, row, seed + 102) % 7);
    if (xx < start) { k = k0 - 1; start = k * 13 + (hash2(k, row, seed + 102) % 7); }
    const end = (k + 1) * 13 + (hash2(k + 1, row, seed + 102) % 7), lx = xx - start, bw = end - start;
    const hb = rnd2(k, row, seed + 103), hb2 = rnd2(k, row, seed + 107);
    const base = hb < 0.16 ? 1 : hb < 0.52 ? 2 : hb < 0.86 ? 3 : 4, snowy = hb2 > 0.5;
    if (ry === 6 || lx === bw - 1) col = SLATE[0];
    else if (ry === 0) col = snowy ? SN[4] : SLATE[Math.min(5, base + 2)];
    else if (ry === 1 && snowy && lx > 0 && lx < bw - 2 && h < 0.7) col = SNOW[1][2];
    else if (lx === 0) col = SLATE[base + 1];
    else if (ry >= 4 && lx >= bw - 3) col = SLATE[base - 1];
    else col = SLATE[base + (ry === 5 ? -1 : 0)];
    // Risse und Reif
    if (hb2 < 0.16 && bw > 8 && Math.abs(lx - 3 - ry - (hash2(k, row, 5) & 3)) < 1 && ry > 0 && ry < 6) col = SLATE[0];
    if (!(ry === 0 && snowy)) { if (h < 0.035 && ry !== 6) col = SLATE[base - 1]; else if (h > 0.972 && ry !== 6) col = SNOW[0][2]; }
  }
  // Schatten unter der Wechte, kühler dunkler Fuß
  if (top === hang || (top === hang + 1 && h < 0.5)) col = mix(col, SHADE, 0.45);
  if (v <= pile + 2) col = mix(col, SHADE, v === pile + 1 ? 0.4 : 0.2);
  // seitliche Enden: links Lichtkante, rechts Schattenkante
  if (!f.wallM[i - 1]) col = mix(col, SN[3], 0.45);
  else if (!f.wallM[i + 1] || !f.wallM[i + 2]) col = mix(col, SHADE, 0.4);
  return col;
}

// ------------------------------------------------------------------ Brücke (Bohlensteg mit Seilgeländer, verschneit)
function bridgeCol(c: Chunk, f: FF, i: number, wx: number, wy: number, h: number): number {
  const map = c.map, cx = wx >> 4, cy = wy >> 4, lx = wx & 15, ly = wy & 15, seed = c.seed;
  const dir = f.dirs[cy * map.w + cx] || 1;
  const liq = (x: number, y: number): boolean => tileAt(map, x, y) === LIQUID;
  const nL = liq(cx, cy - 1), sL = liq(cx, cy + 1), wL = liq(cx - 1, cy), eL = liq(cx + 1, cy);
  // Tragseile an den Längsseiten, an Stufen nur ein Randbrett
  if (dir === 1) {
    if (nL && ly < 4) return rope(ly, wx);
    if (sL && ly > 11) return rope(ly - 12, wx);
    if (wL && lx < 2) return lx === 0 ? PLANK[0] : PLANK[5];
    if (eL && lx > 13) return lx === 15 ? PLANK[0] : PLANK[2];
  } else {
    if (wL && lx < 4) return rope(lx, wy);
    if (eL && lx > 11) return rope(lx - 12, wy);
    if (nL && ly < 2) return ly === 0 ? PLANK[0] : PLANK[5];
    if (sL && ly > 13) return ly === 15 ? PLANK[0] : PLANK[2];
  }
  // Bohlen quer zur Laufrichtung
  const u = dir === 1 ? wx + 2 : wy + 2, vv = dir === 1 ? wy : wx;
  const pk = Math.floor(u / 5), pi = u - pk * 5, hp = rnd2(pk, dir, seed + 120), hq = rnd2(pk, dir, seed + 123);
  if (pi === 4) return alpha(PLANK[0], 220);
  // Schnee liegt in Flecken auf den Bohlen (zur Laufmitte abgetreten)
  const mid = dir === 1 ? Math.abs(ly - 7.5) : Math.abs(lx - 7.5);
  const sn = f.nB[i] * 0.55 + f.nC[i] * 0.45 + (hq - 0.5) * 0.12;
  if (sn > 0.56) return sn < 0.585 ? SNOW[1][1] : pi === 0 || h > 0.9 ? SN[4] : SNOW[1][3];
  let t = hp < 0.2 ? 2 : hp < 0.55 ? 3 : hp < 0.85 ? 4 : 5;
  const joint = 7 + (hash2(pk, 3, seed + 121) % 34), vj = ((vv % 48) + 48) % 48;
  if (hq > 0.5 && vj === joint) return PLANK[1];
  if (hq > 0.5 && vj > joint) t = t > 2 ? t - 1 : t + 1;
  if (pi === 0) t = Math.min(6, t + 1); else if (pi === 3) t--;
  if (rnd2(u, (vv + (hash2(pk, 1, seed) & 7)) >> 3, seed + 122) < 0.16) t--;
  if (h < 0.03) t--;
  let col = PLANK[Math.max(1, t)];
  if (mid > 5 && h > 0.6) col = mix(col, SN[3], 0.45);
  // Schatten des Nord-/Westseils auf den Bohlen
  if (dir === 1 ? nL && ly === 4 : wL && lx === 4) col = mix(col, SHADE, 0.4);
  return col;
}
/** Seil, k = 0..3 quer: dunkle Kontur, gedrehte Litzen, Schattenkante. */
function rope(k: number, along: number): number {
  const tw = (((along + k) % 4) + 4) % 4;
  if (k === 0) return tw === 0 ? SN[4] : ROPE[0];
  if (k === 1) return tw === 0 ? ROPE[1] : tw === 1 ? SN[3] : ROPE[3];
  if (k === 2) return tw === 0 ? ROPE[0] : ROPE[2];
  return ROPE[0];
}

// ------------------------------------------------------------------ Bodendecker
const SX = new Int32Array(16), SY = new Int32Array(16), SR = new Float32Array(16);
function groundCover(c: Chunk, f: FF): void {
  const { W, kind } = c, seed = c.seed;
  c.cells((cx, cy) => {
    seedAt(cx, cy, seed + 200);
    const N = 9;
    for (let k = 0; k < N; k++) {
      const x = cx * TS + ri(16), y = cy * TS + ri(16), r = rf();
      let j = k;
      while (j > 0 && SY[j - 1] > y) { SX[j] = SX[j - 1]; SY[j] = SY[j - 1]; SR[j] = SR[j - 1]; j--; }
      SX[j] = x; SY[j] = y; SR[j] = r;
    }
    for (let k = 0; k < N; k++) {
      const wx = SX[k], wy = SY[k], r = SR[k], i = (wy - c.y0) * W + (wx - c.x0), kd = kind[i];
      const hv = hash2(wx, wy, seed + 201), nearWall = f.dWall[i] < 20;
      if (kd === S_G) {
        // Gras stößt nur in Flecken durch den Schnee
        const gp = clamp((f.nB[i] * 0.55 + f.nL[i] * 0.45 - 0.5) * 5, 0, 1);
        let q = r;
        if ((q -= 0.02 + gp * 0.2) < 0) c.blitK(q < -0.11 ? FS.tuftDry[hv % FS.tuftDry.length] : FS.tuft[hv % FS.tuft.length], wx, wy, A_TUFT);
        else if ((q -= 0.07) < 0) c.blitK(FS.mound[hv % FS.mound.length], wx, wy, A_SNOW);
        else if ((q -= 0.05) < 0) c.blitK(FS.sparkle[hv % FS.sparkle.length], wx, wy, A_SNOW);
        else if ((q -= 0.02 + gp * 0.04) < 0) c.blitK(FS.pebble[hv % FS.pebble.length], wx, wy, A_OPEN);
        else if ((q -= nearWall ? 0.05 : 0.008) < 0) c.blitK(FS.twig[hv % FS.twig.length], wx, wy, A_OPEN);
        else if ((q -= nearWall ? 0.05 : 0.01) < 0) c.blitK(FS.needle[hv % FS.needle.length], wx, wy, A_OPEN);
        else if ((q -= 0.012) < 0) c.blitK(FS.shard[hv % FS.shard.length], wx, wy, A_TUFT);
        else if ((q -= 0.03) < 0) c.blitK(FS.tiny[hv % FS.tiny.length], wx, wy, A_TUFT);
      } else if (kd === S_G2) {
        const onIce = iceVal(f, i) > 0.64;
        let q = r;
        if (onIce) {
          if ((q -= 0.2) < 0) c.blitK(FS.flake[hv % FS.flake.length], wx, wy, A_ICE);
          else if ((q -= 0.07) < 0) c.blitK(FS.crack[hv % FS.crack.length], wx, wy, A_ICE);
          else if ((q -= 0.03) < 0) c.blitK(FS.shard[hv % FS.shard.length], wx, wy, A_TUFT);
        } else if ((q -= 0.09) < 0) c.blitK(FS.mound[hv % FS.mound.length], wx, wy, A_SNOW);
        else if ((q -= 0.06) < 0) c.blitK(FS.sparkle[hv % FS.sparkle.length], wx, wy, A_SNOW);
        else if ((q -= 0.035) < 0) c.blitK(FS.shard[hv % FS.shard.length], wx, wy, A_TUFT);
        else if ((q -= 0.03) < 0) c.blitK(FS.flake[2 + (hv % 2)], wx, wy, A_SNOW);
        else if ((q -= 0.02) < 0) c.blitK(FS.tiny[hv % FS.tiny.length], wx, wy, A_TUFT);
        else if ((q -= 0.012) < 0) c.blitK(FS.pebble[hv % FS.pebble.length], wx, wy, A_OPEN);
      } else if (kd === S_PATH) {
        const d = f.dPath[i];
        let q = r;
        if (d < 3.5) { if (q < 0.12) c.blitK(FS.tuftDry[hv % FS.tuftDry.length], wx, wy, A_OPEN); else if (q < 0.3) c.blitK(FS.clump[hv % 4], wx, wy, A_OPEN); }
        else if ((q -= d > 6 ? 0.045 : 0.01) < 0) c.blitK(FS.boot[hv % FS.boot.length], wx, wy, A_PATH);
        else if ((q -= 0.05) < 0) c.blitK(FS.stone[hv % FS.stone.length], wx, wy, A_PATH);
        else if ((q -= 0.12) < 0) c.blitK(FS.grit[hv % FS.grit.length], wx, wy, A_PATH);
        else if ((q -= 0.02) < 0) c.blitK(FS.tiny[hv % FS.tiny.length], wx, wy, A_PATH);
        else if ((q -= 0.012) < 0) c.blitK(FS.mound[hv % FS.mound.length], wx, wy, A_PATH);
      } else if (kd === S_TOP) {
        const d = f.dTop[i];
        if (d < 5) continue;
        if (r < 0.08) c.blitK(FS.mound[hv % FS.mound.length], wx, wy, A_TOP);
        else if (r < 0.12) c.blitK(FS.shard[hv % FS.shard.length], wx, wy, A_TOP);
        else if (r < 0.16) c.blitK(FS.sparkle[hv % FS.sparkle.length], wx, wy, A_TOP);
        else if (r < 0.19) c.blitK(FS.pebble[hv % FS.pebble.length], wx, wy, A_TOP);
      } else if (kd === S_HAZ) {
        if (r < 0.1) c.blitK(FS.flake[hv % FS.flake.length], wx, wy, A_ICE);
        else if (r < 0.16) c.blitK(FS.sparkle[hv % FS.sparkle.length], wx, wy, A_ICE);
      }
    }
    // Tierfährten: höchstens eine je Zelle, nur über offenem Schnee
    seedAt(cx, cy, seed + 205);
    if (rf() < 0.07) {
      const wx = cx * TS + 8, wy = cy * TS + 8, i = (wy - c.y0) * W + (wx - c.x0);
      if (kind[i] === S_G && f.dPathOut[i] > 12 && f.dWall[i] > 10) c.blitK(FS.track[ri(FS.track.length)], wx, wy, A_SNOW);
    }
  });
}

// ------------------------------------------------------------------ Aufbauten
function structures(c: Chunk, f: FF): void {
  const { W, kind, map } = c, seed = c.seed, g = f.geom, dirs = f.dirs;
  c.cells((cx, cy, t) => {
    const x0 = cx * TS, y0 = cy * TS;
    seedAt(cx, cy, seed + 230);
    // Wandfronten: Eiszapfen an der Wechte, Schneebänder auf Absätzen, Eisstreifen, Schneehaufen am Fuß
    for (let k = 0; k < 4; k++) {
      const wx = x0 + ri(16), wy = y0 + ri(16), r = rf(), i = (wy - c.y0) * W + (wx - c.x0);
      if (kind[i] !== S_FACE) continue;
      // (Reichweite: nur von Zellen aus verankern, die höchstens 12 px unter der Oberkante liegen → ≤ BLEED)
      const fromTop = g.fh[i] - g.fv[i];
      if (fromTop <= 12 && r < 0.5) { if (g.fh[i] >= 14) c.blitK(FS.icicle[ri(FS.icicle.length)], wx, wy - fromTop + 3, A_FACE); }
      else if (fromTop <= 12 && r < 0.6) { if (g.fh[i] >= 26) c.blitK(FS.faceIce[ri(FS.faceIce.length)], wx, wy - fromTop + 3, A_FACE); }
      else if (r < 0.8 && g.fv[i] < 5) c.blitK(FS.clump[ri(4)], wx, wy + g.fv[i], A_FOOT);
      else if (r < 0.32 && fromTop > 6 && g.fv[i] > 4) c.blitK(FS.ledge[ri(FS.ledge.length)], wx, wy, A_FACE);
    }
    // Eisschollen und Schneeklumpen an der Wasserlinie
    if (t === LIQUID) {
      seedAt(cx, cy, seed + 231);
      for (let k = 0; k < 3; k++) {
        const wx = x0 + ri(16), wy = y0 + ri(16), r = rf(), i = (wy - c.y0) * W + (wx - c.x0);
        const dw = f.dLand[i] - f.bankW[i];
        if (kind[i] === S_BANK && r < 0.3) c.blitK(FS.clump[ri(FS.clump.length)], wx, wy, A_SHORE);
        else if (kind[i] === S_BANK && r < 0.42) c.blitK(FS.shard[ri(FS.shard.length)], wx, wy, A_SHORE);
        else if (kind[i] === S_WATER && dw < 7 && r < 0.3) c.blitK(FS.floe[ri(FS.floe.length)], wx, wy, A_SHORE);
      }
    }
    if (t !== BRIDGE) return;
    // Brücke: Stirnseite der Bohlen + Schlagschatten auf dem Wasser, Pfosten an den Seilenden
    const liq = (x: number, y: number): boolean => tileAt(map, x, y) === LIQUID;
    const br = (x: number, y: number): boolean => tileAt(map, x, y) === BRIDGE;
    const nL = liq(cx, cy - 1), sL = liq(cx, cy + 1), wL = liq(cx - 1, cy), eL = liq(cx + 1, cy), dir = dirs[cy * map.w + cx];
    if (sL) for (let x = 0; x < 16; x++) {
      const wx = x0 + x, u = wx + 2, pi = u - Math.floor(u / 5) * 5;
      c.setK(wx, y0 + 16, dir === 1 && pi === 4 ? PLANK[0] : PLANK[2], A_SHORE);
      c.setK(wx, y0 + 17, dir === 1 && pi === 4 ? PLANK[0] : PLANK[1], A_SHORE);
      c.setK(wx, y0 + 18, PLANK[0], A_SHORE);
      // Eiszapfen an der Brückenkante
      if (hash2(wx, cy, seed + 232) % 5 === 0) { const len = 1 + (hash2(wx, cy, seed + 233) % 4); for (let q = 0; q < len; q++) c.setK(wx, y0 + 19 + q, q === len - 1 ? SN[4] : ICE[5], A_SHORE); }
      for (let k = 0; k < 6; k++) c.setK(wx + (k >> 1), y0 + 19 + k, alpha(INK, k < 2 ? 120 : k < 4 ? 80 : 40), A_SHORE);
    }
    if (eL) for (let y = 0; y < 16; y++) for (let k = 0; k < 4; k++) c.setK(x0 + 16 + k, y0 + y + 2, alpha(INK, k < 2 ? 100 : 55), A_SHORE);
    const post = FS.post, end = (x: number, y: number): boolean => !br(x, y);
    if (dir === 1) {
      if (nL && end(cx - 1, cy)) c.blit(post[0], x0 + 2, y0 + 4);
      if (nL && end(cx + 1, cy)) c.blit(post[0], x0 + 13, y0 + 4);
      if (sL && end(cx - 1, cy)) c.blit(post[1], x0 + 2, y0 + 17);
      if (sL && end(cx + 1, cy)) c.blit(post[1], x0 + 13, y0 + 17);
    } else {
      if (wL && end(cx, cy - 1)) c.blit(post[0], x0 + 2, y0 + 6);
      if (eL && end(cx, cy - 1)) c.blit(post[0], x0 + 13, y0 + 6);
      if (wL && end(cx, cy + 1)) c.blit(post[1], x0 + 2, y0 + 16);
      if (eL && end(cx, cy + 1)) c.blit(post[1], x0 + 13, y0 + 16);
    }
  });
  void HAZARD;
}

// ---------------------------------------------------------------------------------------------------- Maler
export const frost: BiomePainter = {
  biome: 'frost',
  paint(c) { if (c.map.dungeon) paintDom(c); else paintOverworld(c); },
  liquid: frostLiquid,
};
