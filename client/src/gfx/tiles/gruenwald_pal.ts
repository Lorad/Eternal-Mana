/** Grünwald – Oberflächenarten und Farbtöne (gemeinsam für Oberwelt, Gruft und Stempel). */
import { INK, P, WHITE, mix } from '../palette';
import { tones } from './core';

// ---------------------------------------------------------------------------------------------------- Oberflächen
export const S_GRASS = 1, S_MEADOW = 2, S_PATH = 3, S_HAZ = 4, S_FLOOR = 5, S_WATER = 6, S_BANK = 7, S_TOP = 8, S_FACE = 9, S_BRIDGE = 10, S_VOID = 11;

// ---------------------------------------------------------------------------------------------------- Palette
export const G = P.green, F = P.forest, WD = P.wood;
/** Lichtzonen: 0 = Waldschatten, 1 = normal, 2 = Sonnenfleck. */
export const zShade = (c: number): number => mix(mix(c, F[1], 0.3), P.blue[1], 0.07);
export const zSun = (c: number): number => mix(c, mix(G[4], P.gold[3], 0.22), 0.2);
export const zones = (r: number[]): number[][] => [r.map(zShade), r, r.map(zSun)];

export const GRASS_N = [mix(G[2], G[3], 0.3), mix(G[2], G[3], 0.55), mix(G[2], G[3], 0.78), mix(G[3], G[4], 0.04), mix(G[3], G[4], 0.26)];
export const GRASS = zones(GRASS_N);
export const YG = mix(G[4], P.gold[3], 0.45);
export const MEADOW_N = tones(5, mix(G[3], YG, 0.3), mix(G[3], YG, 0.62), mix(G[3], YG, 0.95));
/** Wiese im Schatten: sattes dunkleres Grün statt Oliv. */
export const zShadeM = (c: number): number => mix(c, mix(G[2], F[2], 0.25), 0.42);
export const MEADOW = [MEADOW_N.map(zShadeM), MEADOW_N, MEADOW_N.map(zSun)];
export const PATH_N = [mix(P.tan[0], WD[2], 0.55), mix(P.tan[1], P.gold[1], 0.5), mix(P.tan[2], P.gold[2], 0.42), mix(mix(P.tan[2], P.tan[3], 0.5), P.gold[3], 0.33), mix(P.tan[3], P.gold[3], 0.4), mix(P.tan[4], P.gold[4], 0.3)];
export const PATHZ = zones(PATH_N);
export const HAZ_N = [mix(F[1], WD[0], 0.35), mix(F[1], G[1], 0.5), mix(G[1], G[2], 0.4), mix(G[2], F[2], 0.35)];
/** Waldboden auf den Geländestufen: dunkel im Waldesinneren → mittelgrün am Rand (7 Töne). */
export const TOPC = tones(7, mix(F[0], F[1], 0.45), F[1], mix(F[1], F[2], 0.7), mix(F[2], G[2], 0.3), mix(F[2], G[2], 0.62));
export const ROCK = [mix(P.stone[0], F[0], 0.35), mix(P.stone[1], WD[1], 0.22), mix(P.stone[2], P.sand[1], 0.25), mix(P.stone[2], P.sand[3], 0.4), mix(P.stone[3], P.sand[3], 0.35), mix(P.stone[4], P.sand[4], 0.35)];
export const EARTH = [mix(WD[0], INK, 0.15), WD[1], mix(WD[1], WD[2], 0.55), mix(WD[2], P.tan[1], 0.5), mix(WD[3], P.tan[2], 0.4)];
export const MOSS = [mix(F[1], G[1], 0.4), mix(F[2], G[2], 0.3), mix(F[2], G[2], 0.7), mix(F[3], G[3], 0.45), mix(F[4], G[4], 0.35)];
export const PLANK = [mix(WD[0], INK, 0.25), mix(WD[1], P.red[0], 0.12), mix(WD[2], P.red[1], 0.1), mix(mix(WD[2], WD[3], 0.5), P.red[1], 0.08), WD[3], mix(WD[3], WD[4], 0.6), WD[4]];
/** Geländestufe von innen (dunkler Waldboden) nach außen (schattiges Gras). */
export const TOPR = [...TOPC.slice(0, 5), GRASS[0][1], GRASS[1][1], GRASS[1][2]];
export const VOIDC = mix(F[0], INK, 0.6);
export const DEEP = mix(P.teal[0], P.blue[0], 0.45);
export const FOAM = mix(P.teal[4], WHITE, 0.55);
export const WET = mix(WD[0], P.teal[0], 0.45);

