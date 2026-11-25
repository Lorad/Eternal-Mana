/**
 * Handwerk (0.4): Stationen, Rezepte und Verzauberungen als Daten.
 * Keine Berufsstufen, keine eigene Währung – nur Rezept, Rohstoffe, Gold, Stufe und die richtige Station.
 * Wer welche Station anbietet, steht bewusst hier (und nicht in npcs.ts).
 */
import { CFG } from '../config';
import type { ClassId, Element, Mods } from '../types';
import { AETHER, ALL_CORES, BOSS_CORE, ECHO_FRAG, ESSENCE, TIER_INGREDIENT, TIER_MONSTER, TIER_ORE } from './materials';
import { SET_LIST, setPieceName, type SetPiece } from './sets';

export type StationId = 'forge' | 'alchemy' | 'cooking' | 'enchant';
export const STATION_NAME: Record<StationId, string> = { forge: 'Schmiede', alchemy: 'Alchemie', cooking: 'Kochstelle', enchant: 'Verzauberung' };
/** Eintrag im NPC-Gespräch: [Zeichen, Text] */
export const STATION_OPTION: Record<StationId, [string, string]> = {
  forge: ['⚒', 'Schmieden, umschmieden, Element einschmieden'], alchemy: ['⚗', 'Tränke und Elixiere brauen'],
  cooking: ['♨', 'Kochen'], enchant: ['✦', 'Ausrüstung verzaubern'],
};
/** Welcher NPC bietet welche Stationen an */
export const STATION_NPCS: Record<string, StationId[]> = {
  borin: ['forge'], hedda: ['forge'], rakhan: ['forge', 'cooking'], pim: ['forge', 'alchemy'],
  sella: ['alchemy'], ayla: ['cooking'], jorund: ['cooking'],
  fenwick: ['enchant'], liora: ['enchant'],
};
/** Stations-Kennung für Lagerfeuer in der Welt (statt einer NPC-ID) */
export const FIRE = 'fire';
/** 0.7: Stations-Kennung der Stationen auf einem ausgebauten Hof (alle vier; Regeln in data/home.ts) */
export const HOME_AT = 'heim';
export const HOME_STATIONS: StationId[] = ['forge', 'alchemy', 'cooking', 'enchant'];
/**
 * Kochstellen in der Welt: Zone → [POI-ID, dx, dy in Kacheln, Aussehen]. Der Server stellt dort beim Erzeugen der Zone
 * ein Lagerfeuer (Objekttyp `cookfire`) auf die nächste freie Kachel – die Karten selbst bleiben unverändert.
 * Im Schattenreich brennt kein Feuer.
 */
export const COOK_SPOTS: Record<string, [string, number, number, string][]> = {
  gruenwald: [['dorf', 2, -5, 'campfire'], ['lager', 0, 1, 'campfire']],
  kristall: [['lager', 0, 1, 'campfire']],
  glut: [['lager', 0, 1, 'nomad_brazier']],
  frost: [['lager', 0, 1, 'campfire']],
  ruinen: [['lager', 0, 1, 'campfire']],
};

export type GearKind = 'weapon' | 'offhand' | 'helm' | 'armor' | 'gloves' | 'legs' | 'boots' | 'ring' | 'amulet' | 'charm';
export type RecipeOut =
  | { k: 'item'; item: string; qty: number }
  /** Ausrüstung für die eigene Klasse auf der Materialstufe; `master` = Mindestseltenheit „Selten“ */
  | { k: 'gear'; kind: GearKind; tier: number; master?: boolean }
  | { k: 'set'; set: string; piece: SetPiece }
  | { k: 'legend' };

export interface RecipeDef {
  id: string;
  station: StationId;
  /** Anzeigename; bei Ausrüstung leer – dann nennt `recipeLabel` (shared/craft.ts) den Gegenstand der eigenen Klasse */
  name: string;
  /** Filtergruppe in der Oberfläche */
  cat: string;
  inputs: [string, number][];
  gold: number;
  level: number;
  out: RecipeOut;
  /** start = von Anfang an bekannt · learn = muss über eine Rezeptrolle (`rs_<id>`) gelernt werden */
  unlock: 'start' | 'learn';
  /** nur diese Klasse */
  cls?: ClassId;
  /** nur bei diesen NPCs herstellbar */
  npcs?: string[];
  /** Rezeptrolle gibt es nur als besondere Belohnung (nie als Zufallsfund) */
  exclusive?: boolean;
  /** 0.6: Rolle stammt nur aus der Lebendigen Welt (`ruf` = Fraktionshändler, `welt` = Ereignisse, seltene Monster, Fahrende Händlerin) – nie aus der allgemeinen Beute */
  src?: 'ruf' | 'welt';
}
export const CAT_NAME: Record<string, string> = {
  weapon: 'Waffen', offhand: 'Zweithand', armor: 'Rüstung', acc: 'Schmuck', set: 'Sets', special: 'Meisterstücke', potion: 'Tränke', elixir: 'Elixiere', food: 'Speisen',
};
export const STATION_CATS: Record<StationId, string[]> = { forge: ['weapon', 'offhand', 'armor', 'acc', 'set', 'special'], alchemy: ['potion', 'elixir'], cooking: ['food'], enchant: [] };

const TIER_LEVEL = [1, 6, 11, 16, 21, 26];
const TIER_ADJ = ['Eisenholz', 'Kristall', 'Glutstahl', 'Frostsilber', 'Runen', 'Schatten'];
const R: RecipeDef[] = [];

// ------------------------------------------------------------------ Schmiede
// 0.9: Schmiederezepte für alle zehn Plätze (Zweithand, Handschuhe, Beine, Schuhe neu; IDs `f_<art>_<stufe>`)
const GEAR_COST: Record<GearKind, [number, number]> = { weapon: [6, 4], offhand: [4, 3], armor: [6, 3], helm: [4, 2], gloves: [3, 2], legs: [4, 2], boots: [3, 2], ring: [3, 3], amulet: [3, 3], charm: [3, 3] };
const GEAR_CAT: Record<GearKind, string> = { weapon: 'weapon', offhand: 'offhand', helm: 'armor', armor: 'armor', gloves: 'armor', legs: 'armor', boots: 'armor', ring: 'acc', amulet: 'acc', charm: 'acc' };
export const GEAR_KINDS: GearKind[] = ['weapon', 'offhand', 'helm', 'armor', 'gloves', 'legs', 'boots', 'ring', 'amulet', 'charm'];
for (let t = 1; t <= 6; t++) {
  for (const kind of GEAR_KINDS) {
    const [ore, mon] = GEAR_COST[kind];
    R.push({ id: `f_${kind}_${t}`, station: 'forge', name: '', cat: GEAR_CAT[kind],
      inputs: [[TIER_ORE[t - 1], ore], [TIER_MONSTER[t - 1], mon]], gold: CFG.craft.gearGold(t), level: TIER_LEVEL[t - 1], out: { k: 'gear', kind, tier: t }, unlock: 'start' });
  }
  // Meisterstück: Waffe mit Mindestseltenheit „Selten“ – das Rezept muss gefunden werden
  const el = (['earth', 'light', 'fire', 'water', 'wind', 'dark'] as const)[t - 1];
  R.push({ id: `f_master_${t}`, station: 'forge', name: `Meisterstück: ${TIER_ADJ[t - 1]}waffe`, cat: 'special',
    inputs: [[TIER_ORE[t - 1], 10], [TIER_MONSTER[t - 1], 8], [ESSENCE[el], 4]], gold: CFG.craft.gearGold(t) * 3, level: TIER_LEVEL[t - 1] + 2, out: { k: 'gear', kind: 'weapon', tier: t, master: true }, unlock: 'learn' });
}
for (const s of SET_LIST) for (const piece of ['helm', 'armor', 'gloves', 'boots'] as SetPiece[]) { // 0.9: auch Handschutz und Schritt
  R.push({ id: `f_set_${s.id}_${piece}`, station: 'forge', name: setPieceName(s, piece), cat: 'set',
    inputs: [[BOSS_CORE[s.boss], 1], [TIER_ORE[s.tier - 1], 8], [TIER_MONSTER[s.tier - 1], 6], [ESSENCE[s.element as keyof typeof ESSENCE], 5]],
    gold: CFG.craft.gearGold(s.tier) * 2, level: Math.max(1, s.ilvl - 2), out: { k: 'set', set: s.id, piece }, unlock: 'start' });
}
for (const cls of ['krieger', 'magier', 'waldlaeufer', 'paladin', 'schattenjaeger'] as ClassId[]) {
  R.push({ id: 'f_legend_' + cls, station: 'forge', name: '', cat: 'special', cls, npcs: ['borin', 'rakhan'],
    inputs: [...ALL_CORES.map(c => [c, 1] as [string, number]), [AETHER, 3], ['mat_void', 12]], gold: 12000, level: CFG.craft.legendMinIlvl, out: { k: 'legend' }, unlock: 'start' });
}

// ------------------------------------------------------------------ Alchemie
const item = (id: string, station: StationId, cat: string, out: string, qty: number, level: number, gold: number, inputs: [string, number][], unlock: 'start' | 'learn' = 'start') =>
  R.push({ id, station, name: '', cat, inputs, gold, level, out: { k: 'item', item: out, qty }, unlock });
const [BERRY, CAP, PEPPER, LICHEN, FIG, BLOOM] = TIER_INGREDIENT;
item('a_hp1', 'alchemy', 'potion', 'potion_hp1', 2, 1, 5, [['mat_herb', 2]]);
item('a_mp1', 'alchemy', 'potion', 'potion_mp1', 2, 1, 5, [['mat_herb', 1], [BERRY, 1]]);
item('a_hp2', 'alchemy', 'potion', 'potion_hp2', 2, 8, 15, [[CAP, 2], ['mat_herb', 1]]);
item('a_mp2', 'alchemy', 'potion', 'potion_mp2', 2, 8, 15, [[CAP, 2], ['mm_glimmer', 1]]);
item('a_cleanse', 'alchemy', 'potion', 'potion_cleanse', 2, 6, 12, [['mat_herb', 2], [ESSENCE.water, 1]]);
item('a_hp3', 'alchemy', 'potion', 'potion_hp3', 2, 18, 40, [[LICHEN, 3], [PEPPER, 1]]);
item('a_mp3', 'alchemy', 'potion', 'potion_mp3', 2, 18, 40, [[LICHEN, 2], ['mm_fang', 1]]);
item('a_elixir', 'alchemy', 'potion', 'elixir', 1, 15, 60, [[PEPPER, 2], [LICHEN, 2], [ESSENCE.water, 2]]);
item('a_hp4', 'alchemy', 'potion', 'potion_hp4', 2, 28, 90, [[BLOOM, 3], [FIG, 1], [ESSENCE.light, 1]]);
item('a_mp4', 'alchemy', 'potion', 'potion_mp4', 2, 28, 90, [[BLOOM, 2], [FIG, 2], [ESSENCE.water, 1]]);
item('a_guard', 'alchemy', 'elixir', 'elx_guard', 1, 3, 15, [[ESSENCE.earth, 2], ['mm_chitin', 2], ['mat_herb', 1]]);
item('a_speed', 'alchemy', 'elixir', 'elx_speed', 1, 5, 20, [[ESSENCE.wind, 2], [BERRY, 2], ['mat_herb', 1]]);
item('a_crit', 'alchemy', 'elixir', 'elx_crit', 1, 8, 30, [[ESSENCE.light, 2], ['mm_glimmer', 2], [CAP, 1]]);
item('a_power', 'alchemy', 'elixir', 'elx_power', 1, 11, 40, [[ESSENCE.fire, 2], ['mm_ashclaw', 2], [PEPPER, 1]]);
const RES_LEVEL: Record<string, number> = { earth: 3, wind: 5, light: 8, fire: 10, water: 15, dark: 20 };
const RES_ING: Record<string, string> = { earth: BERRY, wind: BERRY, light: CAP, fire: PEPPER, water: LICHEN, dark: FIG };
for (const el of ['fire', 'water', 'earth', 'wind', 'light', 'dark'] as const)
  item('a_res_' + el, 'alchemy', 'elixir', 'elx_res_' + el, 1, RES_LEVEL[el], 30, [[ESSENCE[el], 3], [RES_ING[el], 2]], 'learn');

// Endspiel (0.5): Echo-Fragmente zu Ätherstaub verdichten; das Elixier der Sieben (Rezept nur aus der Prüfung der Sieben)
item('a_aether', 'alchemy', 'potion', AETHER, 1, 30, 400, [[ECHO_FRAG, 6]]);
item('a_sieben', 'alchemy', 'elixir', 'elx_sieben', 1, 40, 150, [[ECHO_FRAG, 1], ...(['fire', 'water', 'earth', 'wind', 'light', 'dark'] as const).map(el => [ESSENCE[el], 1] as [string, number])], 'learn');
R[R.length - 1].exclusive = true;

// ------------------------------------------------------------------ Kochen
item('c_beeren', 'cooking', 'food', 'food_beeren', 2, 1, 0, [[BERRY, 3], ['mat_herb', 1]]);
item('c_pilz', 'cooking', 'food', 'food_pilz', 2, 6, 0, [[CAP, 3], [BERRY, 1]]);
item('c_spiess', 'cooking', 'food', 'food_spiess', 2, 11, 0, [[PEPPER, 3], [CAP, 1]]);
item('c_eintopf', 'cooking', 'food', 'food_eintopf', 2, 16, 0, [[LICHEN, 3], [PEPPER, 1]]);
item('c_feigen', 'cooking', 'food', 'food_feigen', 2, 21, 0, [[FIG, 3], [BERRY, 2]]);
item('c_tee', 'cooking', 'food', 'food_tee', 2, 26, 0, [[BLOOM, 3], [LICHEN, 1]]);
item('c_fest', 'cooking', 'food', 'food_fest', 1, 21, 0, [[BERRY, 2], [CAP, 2], [PEPPER, 2], [LICHEN, 2], [FIG, 2]], 'learn');

// ------------------------------------------------------------------ Lebendige Welt (0.6): Sternsplitter- und Fraktionsrezepte
const STAR = 'mat_star';
const world = (id: string, station: StationId, cat: string, out: string, qty: number, level: number, gold: number, inputs: [string, number][], src: 'ruf' | 'welt') =>
  R.push({ id, station, name: '', cat, inputs, gold, level, out: { k: 'item', item: out, qty }, unlock: 'learn', src });
world('a_stern', 'alchemy', 'elixir', 'elx_stern', 1, 10, 40, [[STAR, 2], [ESSENCE.light, 2], ['mat_herb', 2]], 'welt');
world('c_stern', 'cooking', 'food', 'food_stern', 2, 10, 0, [[STAR, 2], [BERRY, 3], [FIG, 1]], 'welt');
// (nicht zu verwechseln mit `a_aether` aus 0.5: Ätherstaub aus Echo-Fragmenten)
R.push({ id: 'a_sternaether', station: 'alchemy', name: 'Ätherstaub aus Sternsplittern', cat: 'potion', inputs: [[STAR, 12], [ESSENCE.light, 4], [ESSENCE.dark, 4]], gold: 300, level: 25, out: { k: 'item', item: AETHER, qty: 1 }, unlock: 'learn', src: 'welt' });
world('c_kresse', 'cooking', 'food', 'food_kresse', 2, 4, 0, [['mat_herb', 4], [BERRY, 2]], 'ruf');
world('a_grube', 'alchemy', 'elixir', 'elx_grube', 1, 9, 35, [['mm_glimmer', 3], [CAP, 2], [ESSENCE.light, 1]], 'ruf');
world('c_fladen', 'cooking', 'food', 'food_fladen', 2, 13, 0, [[PEPPER, 3], ['mm_ashclaw', 1], [BERRY, 1]], 'ruf');
world('c_wette', 'cooking', 'food', 'food_wette', 2, 18, 0, [[LICHEN, 3], ['mm_fang', 1], [PEPPER, 1]], 'ruf');
world('a_gelehrt', 'alchemy', 'elixir', 'elx_gelehrt', 1, 23, 70, [[FIG, 3], ['mat_rune', 2], [ESSENCE.wind, 2]], 'ruf');
world('a_laterne', 'alchemy', 'elixir', 'elx_laterne', 1, 28, 90, [[BLOOM, 3], [STAR, 1], [ESSENCE.light, 2]], 'ruf');
// Zuhause (0.7): ein Begleiter aus dem Kochtopf (PET_ITEM in data/pets.ts) – von Anfang an bekannt, an jeder Kochstelle
item('c_pilzling', 'cooking', 'food', 'pet_pilzling', 1, 6, 150, [[CAP, 12], ['mm_chitin', 6], [ESSENCE.earth, 4], [BERRY, 4]]);

export const RECIPE_LIST: RecipeDef[] = R;
export const RECIPES: Record<string, RecipeDef> = Object.fromEntries(R.map(r => [r.id, r]));
/** Gegenstands-ID der Rezeptrolle eines lernbaren Rezepts */
export const scrollOf = (recipeId: string) => 'rs_' + recipeId;
export const LEARNABLE = R.filter(r => r.unlock === 'learn');

// ------------------------------------------------------------------ Verzauberungen
/** Runen-Plätze: Waffe, Helm, Brust und Schmuck. Zweithand, Handschuhe, Beine und Schuhe (0.9) tragen bewusst keine Rune –
 *  sonst verdoppelte sich mit zehn Plätzen die Wirkung der Runen. */
export type EnchSlot = 'weapon' | 'helm' | 'armor' | 'accessory';
export interface EnchantDef {
  id: string;
  name: string;
  slots: EnchSlot[];
  mods: Mods;
  cost: [string, number][];
  gold: number;
  level: number;
}
const E = ESSENCE;
const ARMOR: EnchSlot[] = ['helm', 'armor'];
const EL_NAME: Record<string, string> = { fire: 'Feuerschutzes', water: 'Wasserschutzes', earth: 'Erdschutzes', wind: 'Windschutzes', light: 'Lichtschutzes', dark: 'Schattenschutzes' };
const RES_MOD: Record<string, keyof Mods> = { fire: 'resFire', water: 'resWater', earth: 'resEarth', wind: 'resWind', light: 'resLight', dark: 'resDark' };
export const ENCHANT_LIST: EnchantDef[] = [
  { id: 'fokus', name: 'Rune des Fokus', slots: ['weapon'], mods: { elemPct: 8 }, cost: [[E.light, 5], [E.wind, 3]], gold: 150, level: 6 },
  { id: 'macht', name: 'Rune der Macht', slots: ['weapon'], mods: { powerPct: 5 }, cost: [[E.fire, 6], [E.earth, 4]], gold: 300, level: 11 },
  { id: 'schaerfe', name: 'Rune der Schärfe', slots: ['weapon'], mods: { crit: 4, critDmg: 8 }, cost: [[E.wind, 6], [E.water, 4]], gold: 500, level: 16 },
  { id: 'sog', name: 'Rune des Sogs', slots: ['weapon'], mods: { lifesteal: 1 }, cost: [[E.dark, 8], [E.water, 4]], gold: 800, level: 22 },
  { id: 'vital', name: 'Rune der Lebenskraft', slots: ARMOR, mods: { hpPct: 4 }, cost: [[E.earth, 5], [E.water, 2]], gold: 120, level: 4 },
  { id: 'bollwerk', name: 'Rune des Bollwerks', slots: ARMOR, mods: { defPct: 6 }, cost: [[E.earth, 6]], gold: 120, level: 4 },
  { id: 'geist', name: 'Rune des Geistes', slots: ARMOR, mods: { mpPct: 6, mpRegen: 0.5 }, cost: [[E.light, 4], [E.water, 3]], gold: 160, level: 8 },
  ...(['earth', 'wind', 'light', 'fire', 'water', 'dark'] as const).map((el, i): EnchantDef => (
    { id: 'schutz_' + el, name: 'Rune des ' + EL_NAME[el], slots: ARMOR, mods: { [RES_MOD[el]]: 10 }, cost: [[E[el], 8]], gold: 100 + i * 60, level: RES_LEVEL[el] })),
  { id: 'eile', name: 'Rune der Eile', slots: ['accessory'], mods: { speedPct: 3 }, cost: [[E.wind, 6]], gold: 150, level: 5 },
  { id: 'weitsicht', name: 'Rune der Weitsicht', slots: ['accessory'], mods: { cdr: 3 }, cost: [[E.light, 5], [E.water, 3]], gold: 250, level: 10 },
  { id: 'glueck', name: 'Rune des Glücks', slots: ['accessory'], mods: { goldPct: 8, xpPct: 4 }, cost: [[E.earth, 4], [E.light, 4]], gold: 200, level: 6 },
  // 0.6: Sternsplitter – vom Himmel gefallen, in Ausrüstung gefasst
  { id: 'sternlicht', name: 'Rune des Sternenlichts', slots: ['weapon'], mods: { crit: 3, elemPct: 6 }, cost: [['mat_star', 6], [E.light, 4]], gold: 450, level: 14 },
  { id: 'nachtwache', name: 'Rune der Nachtwache', slots: ARMOR, mods: { resAll: 3, hpRegen: 1 }, cost: [['mat_star', 5], [E.dark, 3]], gold: 350, level: 12 },
  { id: 'wanderer', name: 'Rune des Wanderers', slots: ['accessory'], mods: { speedPct: 2, xpPct: 5 }, cost: [['mat_star', 4], [E.wind, 4]], gold: 300, level: 10 },
  { id: 'harmonie', name: 'Rune der Harmonie', slots: ['accessory'], mods: { resAll: 4 }, cost: (Object.values(E) as string[]).map(e => [e, 2] as [string, number]), gold: 600, level: 20 },
  // Echo-Runen (0.5): die stärksten Runen – brauchen Echo-Fragmente und Ätherstaub aus den Mana-Rissen
  { id: 'echo_macht', name: 'Echo-Rune der Macht', slots: ['weapon'], mods: { powerPct: 8, elemPct: 6 }, cost: [[ECHO_FRAG, 12], [AETHER, 2], [E.fire, 10]], gold: 4000, level: 40 },
  { id: 'echo_schaerfe', name: 'Echo-Rune der Schärfe', slots: ['weapon'], mods: { crit: 6, critDmg: 14 }, cost: [[ECHO_FRAG, 12], [AETHER, 2], [E.wind, 10]], gold: 4000, level: 40 },
  { id: 'echo_wacht', name: 'Echo-Rune der Wacht', slots: ARMOR, mods: { hpPct: 7, defPct: 6 }, cost: [[ECHO_FRAG, 8], [AETHER, 1], [E.earth, 10]], gold: 2500, level: 40 },
  { id: 'echo_einklang', name: 'Echo-Rune des Einklangs', slots: ['accessory'], mods: { resAll: 7, cdr: 3 }, cost: [[ECHO_FRAG, 8], [AETHER, 1], [E.light, 6], [E.dark, 6]], gold: 2500, level: 40 },
];
export const ENCHANTS: Record<string, EnchantDef> = Object.fromEntries(ENCHANT_LIST.map(e => [e.id, e]));
export type InfuseElement = Exclude<Element, 'phys'>;
