/** Kristallhöhlen – Oberflächenarten und Farbtöne (gemeinsam für Höhle, Geode und Stempel). */
import { INK, P, WHITE, mix } from '../palette';
import { tones } from './core';

// ---------------------------------------------------------------------------------------------------- Oberflächen
export const S_GROUND = 1, S_LICHEN = 2, S_PATH = 3, S_HAZ = 4, S_WATER = 6, S_BANK = 7, S_TOP = 8, S_FACE = 9, S_BRIDGE = 10, S_VOID = 11;

// ---------------------------------------------------------------------------------------------------- Palette
const ST = P.steel, TL = P.teal, BL = P.blue, SN = P.stone;
/** Gesteinszonen des Höhlenbodens (je 7 Töne): 0 bläulicher Schiefer, 1 grünlicher Glimmerschiefer, 2 heller Sinter. */
export const SLATE = tones(7, mix(ST[0], TL[0], 0.45), mix(ST[1], TL[1], 0.35), mix(ST[2], TL[2], 0.25), mix(ST[3], TL[4], 0.3));
export const SCHIST = SLATE.map((c) => mix(c, mix(P.forest[2], P.sand[2], 0.45), 0.5));
export const FLOWST = tones(7, mix(SN[0], ST[0], 0.5), mix(SN[1], ST[1], 0.45), mix(P.bone[1], ST[2], 0.4), mix(P.bone[3], ST[3], 0.45));
export const ROCKZ = [SLATE, SCHIST, FLOWST];
/** Nasses Gestein: dunkler, ins Blaugrüne. */
export const WETC = mix(TL[0], BL[0], 0.35);
export const ROCKW = ROCKZ.map((r) => r.map((c) => mix(mix(c, WETC, 0.34), TL[1], 0.1)));
/** Sedimentlinsen (warmes Braun). */
export const SED = tones(5, mix(P.wood[0], ST[0], 0.4), mix(P.wood[1], SN[1], 0.4), mix(P.wood[2], SN[2], 0.5), mix(P.tan[2], SN[3], 0.45));
/** Flechtenpolster des Kristallmoos-Bodens (GROUND2). */
export const LICH = tones(6, mix(TL[0], P.forest[0], 0.5), mix(TL[1], P.forest[2], 0.35), mix(TL[2], P.forest[3], 0.3), mix(TL[3], P.green[4], 0.2), mix(TL[4], WHITE, 0.15));
/** Kies des Grubenpfads. */
export const GRAV = tones(6, mix(SN[1], ST[1], 0.5), mix(SN[2], ST[2], 0.45), mix(P.bone[2], ST[3], 0.4), mix(P.bone[2], ST[4], 0.3));
/** Felswand-Front (Indigo) und warme Zwischenschichten. */
export const FACE = tones(7, mix(ST[0], P.violet[0], 0.4), mix(ST[1], P.violet[1], 0.22), mix(ST[2], BL[2], 0.15), mix(ST[3], P.ice[3], 0.3));
export const BRN = tones(7, mix(P.wood[0], ST[0], 0.3), mix(P.wood[1], ST[1], 0.3), mix(P.wood[2], SN[2], 0.35), mix(P.tan[2], SN[3], 0.3));
/** Wandoberseite: dunkel, verliert sich im Schwarzblau. */
export const TOP = tones(6, mix(INK, BL[0], 0.35), mix(ST[0], BL[0], 0.3), mix(ST[0], ST[1], 0.5), mix(ST[1], TL[1], 0.2));
export const VOIDC = mix(INK, BL[0], 0.3);
export const VOID2 = mix(VOIDC, ST[0], 0.4);
/** Kristallrampen: [dunkel, Schatten, Körper, Lichtfacette, Glanz]. */
export const CYR = [TL[0], mix(TL[1], BL[1], 0.4), mix(TL[2], BL[2], 0.35), mix(TL[3], P.ice[2], 0.35), mix(TL[4], P.ice[4], 0.5)];
export const MGR = [P.pink[0], mix(P.pink[1], P.violet[1], 0.4), mix(P.pink[2], P.violet[2], 0.3), mix(P.pink[3], P.violet[3], 0.15), P.pink[4]];
export const VIR = [P.violet[0], P.violet[1], P.violet[2], P.violet[3], P.violet[4]];
export const DEEP = mix(TL[0], BL[0], 0.5);
/** Kalkablagerung an der Wasserlinie. */
export const SCUM = mix(P.bone[3], TL[4], 0.35);
export const PLANK = [mix(P.wood[0], INK, 0.25), mix(P.wood[1], ST[0], 0.15), P.wood[2], mix(P.wood[2], P.wood[3], 0.5), P.wood[3], mix(P.wood[3], P.wood[4], 0.55), P.wood[4]].map((c) => mix(c, SN[2], 0.12));
export const ROPE = [mix(P.tan[0], INK, 0.2), P.tan[1], P.tan[2], P.tan[3]];
