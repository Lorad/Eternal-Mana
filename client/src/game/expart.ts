/**
 * Expeditionen (0.9) – EINZIGE Rückfalltabelle für die Grafik der Expeditionen.
 *
 * Die Zeichnungen entstehen parallel in der Asset-Pipeline (Objekt-Atlas). Solange ein Frame dort fehlt, zeichnet der
 * Client den ersten vorhandenen Ersatz aus dieser Liste (animierte Varianten `<name>_0..n` werden wie üblich erkannt).
 * Ist die echte Grafik da, wird sie ohne weitere Änderung benutzt.
 */
import { ELITE_AFFIX } from '../../../shared/src/data/expeditions';

export const EXP_ART_FALLBACK: Record<string, string[]> = {
  expedition_portal: ['portal'],            // großes, animiertes Portal (~64×80, 6 Bilder) → wirbelndes Portal
  portal_small: ['portal'],                 // kleines Portal (nur ohne Quellwarte, 4 Bilder)
  boss_seal: ['door_boss', 'rune_stone'],   // Siegel, das die Arena verschließt (4 Bilder)
  reward_altar: ['shrine', 'd_statue', 'signpost'],
  checkpoint: ['quellstein', 'brazier'],    // Rastplatz vor der Arena (4 Bilder)
  secret_wall: ['boulder_wall'],            // rissige Wand, die man einschlagen kann
  secret_wall_open: ['d_rubble'],
  collapse_floor_0: ['d_grate', 'plate_up'],// brüchiger Boden: ganz · knackt · eingebrochen
  collapse_floor_1: ['d_crack', 'plate_down'],
  collapse_floor_2: ['d_rubble', 'd_crack'],
  rune_stone: ['rune_stone', 'd_statue'],   // Runenscheibe (Rätsel)
  // Einrichtung je Region (exp_<biom>_a|b|c)
  exp_gruenwald_a: ['mushroom_big', 'stump_moss'], exp_gruenwald_b: ['tree_dead', 'log_moss'], exp_gruenwald_c: ['d_roots', 'bush_flower'],
  exp_kristall_a: ['crystal_big', 'crystal_teal'], exp_kristall_b: ['glowshroom_big', 'stalagmite_l'], exp_kristall_c: ['stalagmite_cluster', 'crystal_pink'],
  exp_glut_a: ['obsidian_big', 'basalt_cluster'], exp_glut_b: ['fire_geyser', 'ember_vent'], exp_glut_c: ['ribcage', 'charred_stump'],
  exp_frost_a: ['frozen_statue', 'ice_spike_l'], exp_frost_b: ['icicle_log', 'snow_rock_l'], exp_frost_c: ['ice_crystal', 'snowman'],
  exp_ruinen_a: ['statue', 'obelisk'], exp_ruinen_b: ['arch', 'pillar_fallen'], exp_ruinen_c: ['sundial', 'rune_stone'],
  exp_schatten_a: ['shadow_spire_l', 'void_crystal'], exp_schatten_b: ['chain_pillar', 'eye_stalk'], exp_schatten_c: ['broken_arch', 'void_rift'],
};
export function expArtFallback(name: string): string[] { return EXP_ART_FALLBACK[name] ?? []; }

/**
 * Erwachte mit Affixen (Expeditionen ab Schwer): Der Server nennt sie „Brennend, Eilig, Heilend: Erwachter Glimmerwisp“.
 * Über dem Kopf steht daraus der Name und darunter die Affixe – halb so breit, damit eine Gruppe auf Mythisch lesbar bleibt.
 */
const AFFIX_NAMES = new Set(Object.values(ELITE_AFFIX).map(a => a.name));
export function eliteLabel(name: string): { text: string; lines: number } {
  const i = name.indexOf(': ');
  const aff = i > 0 ? name.slice(0, i).split(', ') : [];
  if (!aff.length || !aff.every(a => AFFIX_NAMES.has(a))) return { text: name, lines: 1 };
  return { text: `${name.slice(i + 2)}\n${aff.join(' · ')}`, lines: 2 };
}
