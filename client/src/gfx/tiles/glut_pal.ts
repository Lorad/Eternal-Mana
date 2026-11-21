/** Glutlande – Oberflächenarten und Farbtöne (gemeinsam für Oberwelt, Aschenschmiede und Stempel). */
import { INK, P, mix } from '../palette';
import { tones } from './core';

export const S_ASH = 1, S_SLAG = 2, S_PATH = 3, S_HAZ = 4, S_LAVA = 6, S_BANK = 7, S_TOP = 8, S_FACE = 9, S_BRIDGE = 10, S_VOID = 11;

const A = P.ash, SN = P.stone, F = P.fire;
/** Asche (7 Töne) in drei Zonen: 0 kaltgrau, 1 neutral, 2 rostig-warm. */
export const ASHN = tones(7, A[1], A[3], A[4], mix(A[4], P.cream[1], 0.55), mix(P.cream[1], P.cream[2], 0.5));
export const ASHZ = [ASHN.map((c) => mix(c, mix(SN[2], P.steel[2], 0.3), 0.42)), ASHN, ASHN.map((c) => mix(c, mix(P.red[1], P.wood[2], 0.5), 0.3))];
/** Basalt (7 Töne, dunkel → Lichtkante). */
export const BAS = tones(7, mix(A[0], INK, 0.3), A[1], mix(A[2], P.steel[0], 0.3), mix(A[3], P.steel[1], 0.35), mix(A[4], P.steel[2], 0.4), mix(SN[3], P.steel[3], 0.3));
/** Schlacke: rötlich-schwarz, porös. */
export const SLAG = tones(6, A[0], mix(A[1], P.red[0], 0.4), mix(A[2], P.red[1], 0.3), mix(A[3], F[0], 0.4), mix(A[4], P.red[3], 0.35));
/** Nomadenpfad: festgetretene helle Asche. */
export const PASH = tones(6, mix(A[3], P.wood[1], 0.3), mix(A[4], P.tan[1], 0.3), mix(P.cream[1], P.tan[2], 0.25), mix(P.cream[2], P.tan[3], 0.25), P.cream[3]);
/** Erkaltete Lavakruste. */
export const CRUST = tones(5, mix(A[0], INK, 0.4), A[0], A[1], mix(A[2], P.red[0], 0.25), mix(A[3], P.red[1], 0.2));
/** Glut: dunkelrot → weißgelb. */
export const HOT = [P.red[0], F[0], F[1], F[2], F[3], F[4]];
export const VOIDR = mix(INK, P.red[0], 0.22);
export const VOIDR2 = mix(VOIDR, A[1], 0.5);
export const IRON = [mix(P.steel[0], INK, 0.35), P.steel[0], mix(P.steel[0], P.steel[1], 0.6), P.steel[1], mix(P.steel[1], P.steel[2], 0.5), P.steel[2], P.steel[3]];
/** Steinplatten der Brücke und der Trittsteine. */
export const SLABR = tones(6, BAS[1], BAS[3], BAS[5], mix(SN[3], P.cream[2], 0.3));
