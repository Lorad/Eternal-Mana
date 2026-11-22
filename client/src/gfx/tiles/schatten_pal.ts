/** Schattenreich – Oberflächenarten und Farbtöne (gemeinsam für Oberwelt, Thron der Leere, Stempel und Leere). */
import { INK, P, WHITE, mix } from '../palette';
import { tones } from './core';

// ---------------------------------------------------------------------------------------------------- Oberflächen
export const S_GROUND = 1, S_DUST = 2, S_PATH = 3, S_HAZ = 4, S_GAP = 5, S_VOID = 6, S_PGAP = 7, S_TOP = 8, S_FACE = 9, S_BRIDGE = 10;

// ---------------------------------------------------------------------------------------------------- Palette
const SH = P.shadow, VI = P.violet, ST = P.steel, BL = P.blue, PK = P.pink;
/** Obsidianplatten (je 7 Töne): 0 kalte, blauschwarze Zone, 1 warme Pflaumenzone. */
export const PLATE = [
  tones(7, mix(SH[1], BL[0], 0.45), mix(SH[3], BL[1], 0.42), mix(VI[2], ST[2], 0.55), mix(VI[3], P.ice[1], 0.55)),
  tones(7, mix(SH[1], PK[0], 0.3), mix(SH[3], PK[0], 0.38), mix(VI[2], PK[1], 0.32), mix(VI[3], PK[3], 0.3)),
];
/** Die Leere: fast schwarzes Violett. */
export const VOIDC = mix(mix(SH[0], INK, 0.3), BL[0], 0.15);
export const STAR = [mix(VOIDC, P.ice[2], 0.4), mix(VOIDC, P.ice[3], 0.7), P.ice[4]];
/** Lichtadern (Kintsugi): Magenta bis Weiß. */
export const VEIN = [PK[0], PK[1], PK[2], PK[3], PK[4]];
/** Erinnerungsstaub (GROUND2): blasse Asche. */
export const DUST = tones(7, mix(ST[1], VI[1], 0.4), mix(ST[2], VI[2], 0.28), mix(P.bone[2], ST[3], 0.5), mix(P.bone[3], P.snow[2], 0.45), mix(P.bone[4], P.snow[3], 0.5));
/** Runen-Trittsteine des Wegs: helles Lavendelgrau. */
export const SLAB = tones(7, mix(ST[0], VI[1], 0.45), mix(ST[1], VI[2], 0.35), mix(ST[2], VI[3], 0.3), mix(ST[3], VI[4], 0.35), mix(P.snow[3], P.ice[3], 0.4));
/** Kaltes Licht (Glyphen, Fugen, Brücke): Blau bis Weiß. */
export const GLOW = [mix(BL[2], VI[2], 0.45), mix(BL[3], P.ice[2], 0.4), P.ice[3], P.ice[4], WHITE];
/** Schattenkristall der Massive: dunkles Glas. */
export const GLASS = tones(7, mix(INK, BL[0], 0.45), mix(SH[2], BL[0], 0.5), mix(VI[1], BL[1], 0.5), mix(VI[2], BL[2], 0.45), mix(VI[3], P.ice[1], 0.5), mix(P.ice[2], VI[4], 0.35));
export const TOPG = tones(6, mix(INK, SH[0], 0.5), mix(SH[1], BL[0], 0.4), mix(SH[2], BL[0], 0.45), mix(SH[3], BL[1], 0.42), mix(VI[2], BL[1], 0.5));
export const RIM = P.ice[4], RIM2 = P.ice[3];
/** Brechungen im Glas: [dunkel, Körper, Licht, Glanz]. */
export const CYG = [P.teal[1], mix(P.teal[2], BL[2], 0.4), mix(P.teal[3], P.ice[2], 0.3), mix(P.teal[4], P.ice[4], 0.5)];
export const MGG = [mix(PK[0], VI[0], 0.3), mix(PK[1], VI[1], 0.3), mix(PK[2], VI[2], 0.2), PK[3]];
/** Kriechende Dunkelheit (Gefahr). */
export const TAR = [mix(INK, SH[0], 0.75), mix(INK, SH[1], 0.5), mix(SH[2], INK, 0.25), mix(SH[3], VI[1], 0.5), mix(SH[4], VI[3], 0.45)];
export const EYE = [P.red[1], P.red[2], PK[3], PK[4]];
export const BONE = [P.bone[1], P.bone[2], P.bone[3], P.bone[4]];

// ---------------------------------------------------------------------------------------------------- Thron der Leere
/** Schwarzer Marmor (7 Töne). */
export const MARB = tones(7, mix(INK, SH[0], 0.5), mix(SH[1], ST[0], 0.45), mix(SH[2], ST[0], 0.55), mix(ST[1], SH[3], 0.45), mix(ST[2], VI[2], 0.3), mix(ST[3], VI[4], 0.3));
/** Pflaumenmarmor (7 Töne). */
export const PLM = tones(7, mix(SH[1], PK[0], 0.3), mix(SH[2], PK[0], 0.45), mix(SH[3], PK[0], 0.5), mix(VI[1], PK[1], 0.38), mix(VI[2], PK[1], 0.4), mix(VI[3], PK[3], 0.35));
/** Angelaufenes Gold. */
export const GOLDT = [mix(P.gold[0], SH[2], 0.45), mix(P.gold[1], P.stone[1], 0.3), mix(P.gold[2], P.sand[2], 0.3), mix(P.gold[3], P.sand[3], 0.25), P.gold[4]];
/** Königsläufer: tiefes Weinviolett. */
export const CARP = tones(6, mix(VI[0], P.red[0], 0.6), mix(P.red[0], VI[1], 0.3), mix(P.red[1], VI[1], 0.25), mix(P.red[2], VI[2], 0.25));
export const VGL = [VI[0], VI[1], VI[2], VI[3], VI[4]];
/** Elementfarben des Siegels: Feuer, Wasser, Erde, Wind, Licht, Dunkelheit – je [dunkel, Körper, Licht]. */
export const ELEM = [
  [P.fire[0], P.fire[2], P.fire[3]], [BL[1], BL[2], BL[3]], [P.green[1], P.green[2], P.green[3]],
  [P.teal[2], P.teal[3], P.teal[4]], [P.gold[1], P.gold[3], P.gold[4]], [VI[1], VI[2], VI[3]],
];
