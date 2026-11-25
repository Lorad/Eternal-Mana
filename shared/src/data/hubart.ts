/**
 * Quellwarte (0.9) – EINZIGE Stelle für den Rückfall der Hub-Grafik.
 *
 * Die eigene Grafik der Quellwarte (Fassaden, Brunnen, Laternen, Banner, Marktstand, Platz-Boden, Figuren der Hüter der
 * Einrichtungen) entsteht parallel in der Asset-Pipeline. Bis sie im Objekt-Atlas bzw. als Figuren-Sheet vorliegt, zeigt das
 * Spiel vorhandene Grafik. Sobald ein Frame existiert, wird er benutzt – hier muss danach nichts geändert werden.
 *
 *   Frame im Objekt-Atlas (Deko, Objekte)  →  vorhandener Frame
 *   Figuren-Look `npc_<look>`              →  vorhandener Look
 *   Biom `quellwarte` (Boden des Platzes)  →  `gruenwald`
 */
import type { BiomeId } from '../maps/tiles';

/** Fassaden (80–112 px breit), Brunnen (animiert `_0.._3`), Laterne, Banner (`_0.._3`), Marktstand, Baum, Bank, Blumen */
export const HUB_FRAME_FALLBACK: Record<string, string> = {
  hub_schmiede: 'house_a',
  hub_haendler: 'house_b',
  hub_alchemie: 'house_c',
  hub_meister: 'house_b',
  hub_lager: 'cabin',
  hub_gasthaus: 'house_a',
  hub_halle: 'house_c',
  hub_gruppe: 'cabin',
  hub_brunnen: 'well',
  hub_laterne: 'lamp',
  hub_banner: 'banner',
  hub_stand: 'stall',
  hub_baum: 'tree_oak',
  hub_bank: 'bench',
  hub_blumen: 'bush_flower',
};
/** Figuren der Einrichtungen → vorhandener Look */
export const HUB_LOOK_FALLBACK: Record<string, string> = {
  wirtin: 'fellhaendlerin',
  haendler_hub: 'kraemer',
  meister: 'nomade',
  lagerverwalter: 'einsiedler',
  hallenwart: 'gelehrter',
  schmiedin: 'bergfrau',
  alchemistin: 'haendlerin',
};
/** Biom (Bodenmaler) der Quellwarte: `quellwarte`, sobald es den Maler gibt – sonst Grünwald mit Wegen als Pflaster */
export const HUB_BIOME: BiomeId = 'quellwarte'; // Maler vorhanden (client/src/gfx/tiles/quellwarte.ts); vorher: 'gruenwald'

/** Fassaden – sie werden nicht durchsichtig, wenn man dahinter steht (wie die Häuser in Quellhain), und manche rauchen */
export const HUB_BUILDINGS = new Set(['hub_schmiede', 'hub_haendler', 'hub_alchemie', 'hub_meister', 'hub_lager', 'hub_gasthaus', 'hub_halle', 'hub_gruppe']);
export const HUB_SMOKE = new Set(['hub_schmiede', 'hub_gasthaus', 'hub_alchemie']);

/** Frame (ohne Animationsnummer) für die Anzeige: eigener, falls vorhanden – sonst der Rückfall. `has(name)` prüft den Atlas. */
export function hubFrame(name: string, has: (f: string) => boolean): string {
  if (has(name) || has(name + '_0')) return name;
  return HUB_FRAME_FALLBACK[name] ?? name;
}
/** Look einer Figur: eigener, falls das Sheet `npc_<look>` geladen ist – sonst der Rückfall. */
export function hubLook(look: string, has: (key: string) => boolean): string {
  if (has('npc_' + look)) return look;
  return HUB_LOOK_FALLBACK[look] ?? look;
}
