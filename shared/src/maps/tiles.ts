/** Kachel-Arten der Spielwelt. Eine Karte ist ein Raster dieser Werte (Uint8Array, zeilenweise). */
export const TILE = 16; // Pixel pro Kachel

export const enum T {
  VOID = 0,    // außerhalb der Welt, unpassierbar
  GROUND = 1,  // Grundboden des Bioms (Gras, Höhlenboden, Asche, Schnee …)
  GROUND2 = 2, // Variante (hohes Gras, Moos, Schlacke, Tiefschnee, Mosaik …)
  PATH = 3,    // Weg
  FLOOR = 4,   // gemauerter Boden (Dungeons, Innenräume)
  WALL = 5,    // Wand / Klippe / Dickicht – unpassierbar, blockt Geschosse
  LIQUID = 6,  // Wasser / Lava / Leere – unpassierbar, Geschosse fliegen darüber
  BRIDGE = 7,  // Brücke über Flüssigkeit
  HAZARD = 8,  // begehbar, verursacht Schaden (Dornen, Glutboden, …)
}

export type BiomeId = 'gruenwald' | 'kristall' | 'glut' | 'frost' | 'ruinen' | 'schatten';
export const BIOMES: BiomeId[] = ['gruenwald', 'kristall', 'glut', 'frost', 'ruinen', 'schatten'];

export function isWalkableTile(t: number): boolean {
  return t === T.GROUND || t === T.GROUND2 || t === T.PATH || t === T.FLOOR || t === T.BRIDGE || t === T.HAZARD;
}
export function blocksProjectile(t: number): boolean {
  return t === T.WALL || t === T.VOID;
}
