import type { BiomeId } from '../maps/tiles';

export interface Poi {
  id: string;
  x: number; y: number; r: number;
  kind: 'village' | 'camp' | 'exit' | 'spot' | 'secret' | 'stone';
  /** exit: Zielzone */
  to?: string;
  /** exit: Kartenrand, zu dem ein Weg hinausführt */
  edge?: 'n' | 's' | 'e' | 'w';
  look?: 'edge' | 'cave' | 'portal' | 'stairs_down';
  /** exit: Quest, die abgeschlossen sein muss, sonst reqMsg */
  req?: string; reqMsg?: string;
  /** NPCs: [npcId, dx, dy] in Kacheln relativ zum POI */
  npcs?: [string, number, number][];
  /** secret: POI, in dessen Richtung der versteckte Zugang liegt */
  from?: string;
  label?: string;
}

export interface ZoneDef {
  id: string;
  name: string;
  subtitle: string;
  biome: BiomeId;
  kind: 'overworld' | 'dungeon';
  w: number; h: number;
  seed: number;
  level: [number, number];
  music: string;
  ambience: string;
  weathers: [string, number][];
  /** Grunddunkelheit 0..1 (Höhlen, Dungeons); Oberwelt folgt zusätzlich dem Tag-Nacht-Zyklus */
  dark: number;
  indoor: boolean;
  // ---- Oberwelt
  cave?: boolean;
  noise?: { ground2: number; liquid: number; wall: number; hazard: number };
  pois?: Poi[];
  links?: [string, string][];
  start?: string;
  groups?: number;
  chests?: number;
  nodes?: [string, number][];
  /** [Frame, Gewicht, solide] */
  decor?: [string, number, boolean][];
  decorDensity?: number;
  /** Bachlauf als Stützpunkte in Kacheln (wird vor den Wegen gegraben; Wege schlagen Brücken) */
  river?: [number, number][];
  // ---- Dungeon
  parent?: string;
  gx?: number; gy?: number; maxRooms?: number;
  puzzle?: 'torches' | 'levers' | 'plates';
  boss?: string;
  // ---- beide
  mobs: [string, number][];
  /** Position auf der Weltkarte (0..100) */
  mapPos: [number, number];
}

const Z = (z: ZoneDef) => z;

export const ZONE_LIST: ZoneDef[] = [
  // =================================================================== GRÜNWALD
  Z({
    id: 'gruenwald', name: 'Grünwald', subtitle: 'Wo die Quelle noch flüstert', biome: 'gruenwald', kind: 'overworld', w: 110, h: 100, seed: 1101,
    level: [1, 5], music: 'gruenwald', ambience: 'forest', weathers: [['clear', 6], ['rain', 2], ['leaves', 3]], dark: 0, indoor: false,
    noise: { ground2: 0.58, liquid: 0.74, wall: 0.76, hazard: 0.9 },
    start: 'dorf',
    pois: [
      { id: 'dorf', x: 52, y: 54, r: 14, kind: 'village', label: 'Quellhain',
        npcs: [['mirelda', -2, -5], ['borin', -7, 1], ['sella', 6, 2], ['fenwick', 9, -3], ['tobi', -4, 6], ['ayla', 4, -6], ['wache', 1, 11]] },
      { id: 'ost', x: 103, y: 50, r: 4, kind: 'exit', to: 'kristall', edge: 'e', look: 'cave', label: 'Kristallhöhlen',
        req: 'm_wurzel', reqMsg: 'Wache Edda hält dich zurück: „Erst wenn Mirelda es erlaubt. Die Höhlen sind kein Ort für Anfänger.“' },
      { id: 'nord', x: 56, y: 5, r: 4, kind: 'exit', to: 'frost', edge: 'n', look: 'edge', label: 'Frostgebirge',
        req: 'm_glut', reqMsg: 'Ein eisiger Sturm fegt den Pass hinab. Ohne die Wärme des Feuersiegels kommst du hier nicht durch.' },
      { id: 'gruft', x: 17, y: 20, r: 5, kind: 'exit', to: 'wurzelgruft', look: 'cave', label: 'Wurzelgruft' },
      { id: 'schrein', x: 86, y: 82, r: 5, kind: 'spot', label: 'Alter Schrein' },
      { id: 'lager', x: 28, y: 72, r: 5, kind: 'camp', label: 'Holzfällerlager' },
      { id: 'hain1', x: 90, y: 14, r: 4, kind: 'secret', from: 'nord' },
      { id: 'hain2', x: 12, y: 86, r: 4, kind: 'secret', from: 'lager' },
      { id: 'weiher', x: 74, y: 28, r: 4, kind: 'spot' },
    ],
    links: [['dorf', 'ost'], ['dorf', 'nord'], ['dorf', 'gruft'], ['dorf', 'schrein'], ['dorf', 'lager'], ['weiher', 'nord'], ['weiher', 'ost'], ['lager', 'gruft']],
    groups: 26, chests: 7, nodes: [['herb', 9], ['wood', 8]],
    decor: [['tree_oak', 10, true], ['tree_oak2', 6, true], ['tree_pine', 6, true], ['tree_birch', 6, true], ['tree_dead', 0.5, true], ['sapling', 3, true],
      ['bush', 8, true], ['bush_berry', 3, true], ['bush_flower', 3, true], ['rock_s', 2, true], ['rock_m', 2, true], ['rock_l', 1, true], ['rock_moss', 2, true],
      ['stump', 2, true], ['stump_moss', 1, true], ['log', 1.5, true], ['log_moss', 1.5, true],
      ['fern', 10, false], ['flowers_a', 4, false], ['flowers_b', 4, false], ['flowers_c', 4, false], ['flowers_d', 4, false], ['flowers_e', 3, false], ['flowers_f', 3, false],
      ['tallgrass', 14, false], ['mushrooms', 3, false], ['mushroom_big', 1, false], ['clover', 4, false], ['pebbles', 3, false], ['leafpile', 3, false]],
    river: [[35, 3], [38, 20], [33, 38], [35, 56], [38, 76], [45, 97]],
    decorDensity: 0.24,
    mobs: [['moosling', 5], ['dornkaefer', 3], ['pilzling', 3], ['waldwolf', 2]],
    mapPos: [38, 62],
  }),
  Z({
    id: 'wurzelgruft', name: 'Wurzelgruft', subtitle: 'Unter dem ältesten Baum', biome: 'gruenwald', kind: 'dungeon', w: 0, h: 0, seed: 1201,
    level: [4, 6], music: 'dungeon', ambience: 'dungeon', weathers: [['spores', 1]], dark: 0.55, indoor: true,
    parent: 'gruenwald', gx: 3, gy: 3, maxRooms: 7, puzzle: 'torches', boss: 'dornenmutter',
    mobs: [['wurzelschleicher', 5], ['moosling', 2], ['pilzling', 3], ['dornkaefer', 2]],
    mapPos: [28, 50],
  }),
  // =================================================================== KRISTALLHÖHLEN
  Z({
    id: 'kristall', name: 'Kristallhöhlen', subtitle: 'Das singende Dunkel', biome: 'kristall', kind: 'overworld', w: 96, h: 96, seed: 2101,
    level: [6, 10], music: 'kristall', ambience: 'cave', weathers: [['motes', 1]], dark: 0.5, indoor: true, cave: true,
    noise: { ground2: 0.6, liquid: 0.72, wall: 0.5, hazard: 0.95 },
    start: 'west',
    pois: [
      { id: 'west', x: 5, y: 48, r: 4, kind: 'exit', to: 'gruenwald', edge: 'w', look: 'cave', label: 'Grünwald' },
      { id: 'lager', x: 17, y: 48, r: 7, kind: 'camp', label: 'Grubenlager', npcs: [['hedda', -2, -3], ['pim', 3, -2]] },
      { id: 'geode', x: 78, y: 16, r: 5, kind: 'exit', to: 'geode', look: 'stairs_down', label: 'Tiefe Geode' },
      { id: 'sued', x: 84, y: 91, r: 4, kind: 'exit', to: 'glut', edge: 's', look: 'cave', label: 'Glutlande',
        req: 'm_koloss', reqMsg: 'Ein Geröllsturz versperrt den Stollen. Hedda wollte ihn räumen lassen, sobald der Koloss keine Gefahr mehr ist.' },
      { id: 'see', x: 48, y: 50, r: 6, kind: 'spot', label: 'Spiegelsee' },
      { id: 'halle', x: 44, y: 20, r: 6, kind: 'spot' },
      { id: 'tief', x: 54, y: 80, r: 5, kind: 'spot' },
      { id: 'nische1', x: 26, y: 14, r: 4, kind: 'secret', from: 'halle' },
      { id: 'nische2', x: 88, y: 56, r: 4, kind: 'secret', from: 'see' },
    ],
    links: [['west', 'lager'], ['lager', 'see'], ['lager', 'halle'], ['halle', 'geode'], ['see', 'geode'], ['see', 'tief'], ['tief', 'sued'], ['lager', 'tief']],
    groups: 24, chests: 7, nodes: [['crystal', 14]],
    decor: [['stalagmite', 18, true], ['stalagmite_l', 8, true], ['stalagmite_cluster', 4, true], ['crystal_blue', 12, true], ['crystal_pink', 9, true], ['crystal_big', 3, true], ['crystal_teal', 6, true],
      ['crystal_shards', 8, false], ['glowshroom', 12, false], ['glowshroom_big', 4, true], ['cave_moss', 10, false], ['rock_cave_s', 6, true], ['rock_cave_m', 4, true], ['rock_cave_l', 2, true],
      ['bones', 3, false], ['puddle_cave', 4, false], ['drip_stone', 5, true]],
    decorDensity: 0.12,
    mobs: [['fledermaus', 4], ['kristallkrabbler', 3], ['glimmerwisp', 3], ['tropfschleim', 3]],
    mapPos: [58, 66],
  }),
  Z({
    id: 'geode', name: 'Tiefe Geode', subtitle: 'Herz aus Licht und Stein', biome: 'kristall', kind: 'dungeon', w: 0, h: 0, seed: 2201,
    level: [9, 11], music: 'dungeon', ambience: 'dungeon', weathers: [['motes', 1]], dark: 0.6, indoor: true,
    parent: 'kristall', gx: 4, gy: 3, maxRooms: 9, puzzle: 'levers', boss: 'kristallkoloss',
    mobs: [['kristallkrabbler', 4], ['glimmerwisp', 3], ['fledermaus', 3], ['tropfschleim', 2]],
    mapPos: [66, 56],
  }),
  // =================================================================== GLUTLANDE
  Z({
    id: 'glut', name: 'Glutlande', subtitle: 'Die Erde atmet Feuer', biome: 'glut', kind: 'overworld', w: 100, h: 96, seed: 3101,
    level: [11, 15], music: 'glut', ambience: 'volcano', weathers: [['ash', 4], ['embers', 3], ['clear', 1]], dark: 0.12, indoor: false,
    noise: { ground2: 0.56, liquid: 0.66, wall: 0.74, hazard: 0.78 },
    start: 'nord',
    pois: [
      { id: 'nord', x: 50, y: 5, r: 4, kind: 'exit', to: 'kristall', edge: 'n', look: 'cave', label: 'Kristallhöhlen' },
      { id: 'lager', x: 50, y: 17, r: 7, kind: 'camp', label: 'Aschenrast', npcs: [['rakhan', -3, -2], ['pim', 3, -2]] },
      { id: 'schmiede', x: 84, y: 78, r: 5, kind: 'exit', to: 'aschenschmiede', look: 'cave', label: 'Aschenschmiede' },
      { id: 'feld', x: 24, y: 80, r: 6, kind: 'spot', label: 'Obsidianfeld' },
      { id: 'mitte', x: 48, y: 50, r: 5, kind: 'spot' },
      { id: 'krater', x: 80, y: 36, r: 5, kind: 'spot' },
      { id: 'kessel1', x: 10, y: 44, r: 4, kind: 'secret', from: 'mitte' },
      { id: 'kessel2', x: 90, y: 12, r: 4, kind: 'secret', from: 'krater' },
    ],
    links: [['nord', 'lager'], ['lager', 'mitte'], ['mitte', 'feld'], ['mitte', 'krater'], ['krater', 'schmiede'], ['mitte', 'schmiede'], ['lager', 'krater']],
    groups: 26, chests: 7, nodes: [['ember', 14]],
    decor: [['dead_tree', 10, true], ['charred_stump', 5, true], ['basalt_column', 12, true], ['basalt_cluster', 5, true], ['lava_rock', 12, true], ['obsidian', 8, true], ['obsidian_big', 3, true],
      ['skull', 4, false], ['ribcage', 2, true], ['ember_vent', 5, false], ['fire_geyser', 2, false], ['ash_pile', 8, false], ['scorched_bush', 8, true], ['magma_crack', 8, false], ['cairn', 2, true]],
    decorDensity: 0.085,
    mobs: [['glutimp', 4], ['aschenhund', 3], ['magmaschleim', 4], ['schlackengolem', 1.5]],
    mapPos: [76, 82],
  }),
  Z({
    id: 'aschenschmiede', name: 'Aschenschmiede', subtitle: 'Wo die ersten Siegel gegossen wurden', biome: 'glut', kind: 'dungeon', w: 0, h: 0, seed: 3201,
    level: [14, 16], music: 'dungeon', ambience: 'dungeon', weathers: [['embers', 1]], dark: 0.45, indoor: true,
    parent: 'glut', gx: 4, gy: 3, maxRooms: 10, puzzle: 'plates', boss: 'ignarok',
    mobs: [['glutimp', 4], ['magmaschleim', 3], ['aschenhund', 3], ['schlackengolem', 1.5]],
    mapPos: [86, 74],
  }),
  // =================================================================== FROSTGEBIRGE
  Z({
    id: 'frost', name: 'Frostgebirge', subtitle: 'Stille über den Wolken', biome: 'frost', kind: 'overworld', w: 100, h: 100, seed: 4101,
    level: [16, 20], music: 'frost', ambience: 'blizzard', weathers: [['snow', 5], ['blizzard', 2], ['clear', 2]], dark: 0, indoor: false,
    noise: { ground2: 0.55, liquid: 0.75, wall: 0.7, hazard: 0.86 },
    start: 'sued',
    pois: [
      { id: 'sued', x: 50, y: 95, r: 4, kind: 'exit', to: 'gruenwald', edge: 's', look: 'edge', label: 'Grünwald' },
      { id: 'lager', x: 50, y: 83, r: 7, kind: 'camp', label: 'Jorunds Hütte', npcs: [['jorund', -3, -2], ['inga', 3, -1], ['pim', 5, 3]] },
      { id: 'dom', x: 20, y: 16, r: 5, kind: 'exit', to: 'gletscherdom', look: 'cave', label: 'Gletscherdom' },
      { id: 'ost', x: 95, y: 30, r: 4, kind: 'exit', to: 'ruinen', edge: 'e', look: 'edge', label: 'Verlorene Ruinen',
        req: 'm_ysolde', reqMsg: 'Eine Wand aus gewebtem Eis verschließt den Pass. Solange die Frostweberin lebt, hält ihr Muster.' },
      { id: 'grat', x: 52, y: 50, r: 5, kind: 'spot' },
      { id: 'see', x: 76, y: 62, r: 6, kind: 'spot', label: 'Gefrorener See' },
      { id: 'gipfel', x: 60, y: 18, r: 5, kind: 'spot' },
      { id: 'klamm1', x: 86, y: 86, r: 4, kind: 'secret', from: 'see' },
      { id: 'klamm2', x: 12, y: 56, r: 4, kind: 'secret', from: 'grat' },
    ],
    links: [['sued', 'lager'], ['lager', 'grat'], ['grat', 'dom'], ['grat', 'gipfel'], ['gipfel', 'ost'], ['grat', 'see'], ['see', 'ost'], ['gipfel', 'dom']],
    groups: 26, chests: 7, nodes: [['frost', 14]],
    decor: [['pine_snow', 14, true], ['pine_snow2', 10, true], ['pine_snow_small', 8, true], ['birch_bare', 5, true], ['ice_spike', 8, true], ['ice_spike_l', 4, true], ['ice_crystal', 5, true],
      ['snow_rock', 8, true], ['snow_rock_l', 3, true], ['frozen_bush', 10, true], ['snowman', 0.4, true], ['snowdrift', 14, false], ['icicle_log', 2, true], ['ice_crack', 4, false], ['frozen_statue', 0.6, true]],
    decorDensity: 0.13,
    mobs: [['frostwolf', 4], ['eiswicht', 3], ['schneebrute', 1.5], ['frostwisp', 3]],
    mapPos: [40, 30],
  }),
  Z({
    id: 'gletscherdom', name: 'Gletscherdom', subtitle: 'Ein Muster aus Eis und Schweigen', biome: 'frost', kind: 'dungeon', w: 0, h: 0, seed: 4201,
    level: [19, 21], music: 'dungeon', ambience: 'dungeon', weathers: [['snow', 1]], dark: 0.4, indoor: true,
    parent: 'frost', gx: 4, gy: 3, maxRooms: 10, puzzle: 'torches', boss: 'ysolde',
    mobs: [['eiswicht', 4], ['frostwisp', 3], ['frostwolf', 3], ['schneebrute', 1.5]],
    mapPos: [28, 18],
  }),
  // =================================================================== VERLORENE RUINEN
  Z({
    id: 'ruinen', name: 'Verlorene Ruinen', subtitle: 'Was die Hüter zurückließen', biome: 'ruinen', kind: 'overworld', w: 100, h: 96, seed: 5101,
    level: [21, 25], music: 'ruinen', ambience: 'ruins', weathers: [['clear', 3], ['motes', 4], ['rain', 1]], dark: 0.05, indoor: false,
    noise: { ground2: 0.5, liquid: 0.76, wall: 0.7, hazard: 0.93 },
    start: 'west',
    pois: [
      { id: 'west', x: 5, y: 48, r: 4, kind: 'exit', to: 'frost', edge: 'w', look: 'edge', label: 'Frostgebirge' },
      { id: 'lager', x: 17, y: 48, r: 7, kind: 'camp', label: 'Grabungslager', npcs: [['liora', -3, -2], ['sen', 4, 2], ['pim', 3, -3]] },
      { id: 'archiv', x: 52, y: 13, r: 5, kind: 'exit', to: 'archiv', look: 'stairs_down', label: 'Archiv der Stille' },
      { id: 'tor', x: 88, y: 76, r: 6, kind: 'exit', to: 'schatten', look: 'portal', label: 'Schattenreich',
        req: 'm_archivar', reqMsg: 'Das Tor ist nur ein leerer Steinbogen. Fünf Vertiefungen im Sockel warten auf fünf Siegel.' },
      { id: 'platz', x: 50, y: 50, r: 7, kind: 'spot', label: 'Platz der Hüter' },
      { id: 'garten', x: 30, y: 80, r: 5, kind: 'spot' },
      { id: 'turm', x: 82, y: 30, r: 5, kind: 'spot' },
      { id: 'kammer1', x: 12, y: 12, r: 4, kind: 'secret', from: 'archiv' },
      { id: 'kammer2', x: 60, y: 88, r: 4, kind: 'secret', from: 'garten' },
    ],
    links: [['west', 'lager'], ['lager', 'platz'], ['platz', 'archiv'], ['platz', 'tor'], ['platz', 'garten'], ['platz', 'turm'], ['turm', 'tor'], ['lager', 'garten']],
    groups: 26, chests: 8, nodes: [['rune', 14]],
    decor: [['pillar', 10, true], ['pillar_broken', 14, true], ['pillar_fallen', 5, true], ['statue', 3, true], ['statue_broken', 4, true], ['rubble', 12, true], ['arch', 1.5, true], ['rune_stone', 5, true],
      ['obelisk', 2, true], ['vine_tree', 8, true], ['cypress', 8, true], ['urn', 6, true], ['urn_broken', 5, false], ['mosaic', 8, false], ['wall_frag', 4, true], ['floating_rune', 4, false], ['sundial', 1, true]],
    decorDensity: 0.1,
    mobs: [['skelettkrieger', 4], ['fluchgeist', 3], ['arkanauge', 3], ['runenwaechter', 1.5]],
    mapPos: [68, 26],
  }),
  Z({
    id: 'archiv', name: 'Archiv der Stille', subtitle: 'Jedes Wort, das je verschwiegen wurde', biome: 'ruinen', kind: 'dungeon', w: 0, h: 0, seed: 5201,
    level: [24, 26], music: 'dungeon', ambience: 'dungeon', weathers: [['motes', 1]], dark: 0.5, indoor: true,
    parent: 'ruinen', gx: 4, gy: 4, maxRooms: 11, puzzle: 'levers', boss: 'archivar',
    mobs: [['arkanauge', 4], ['skelettkrieger', 3], ['fluchgeist', 3], ['runenwaechter', 1.5]],
    mapPos: [70, 14],
  }),
  // =================================================================== SCHATTENREICH
  Z({
    id: 'schatten', name: 'Schattenreich', subtitle: 'Die Kehrseite der Quelle', biome: 'schatten', kind: 'overworld', w: 96, h: 96, seed: 6101,
    level: [26, 30], music: 'schatten', ambience: 'void', weathers: [['void', 1]], dark: 0.35, indoor: true,
    noise: { ground2: 0.54, liquid: 0.66, wall: 0.72, hazard: 0.85 },
    start: 'tor',
    pois: [
      { id: 'tor', x: 48, y: 88, r: 5, kind: 'exit', to: 'ruinen', look: 'portal', label: 'Verlorene Ruinen' },
      { id: 'lager', x: 48, y: 76, r: 6, kind: 'camp', label: 'Letztes Licht', npcs: [['maelis', -2, -2], ['pim', 4, -1]] },
      { id: 'thron', x: 48, y: 10, r: 5, kind: 'exit', to: 'thron', look: 'portal', label: 'Thron der Leere',
        req: 'm_schatten', reqMsg: 'Das Portal weicht vor dir zurück wie ein scheues Tier. Maelis weiß vielleicht, wie man es bindet.' },
      { id: 'mitte', x: 48, y: 46, r: 6, kind: 'spot' },
      { id: 'westen', x: 16, y: 40, r: 5, kind: 'spot' },
      { id: 'osten', x: 80, y: 44, r: 5, kind: 'spot' },
      { id: 'riss1', x: 10, y: 80, r: 4, kind: 'secret', from: 'westen' },
      { id: 'riss2', x: 86, y: 14, r: 4, kind: 'secret', from: 'osten' },
    ],
    links: [['tor', 'lager'], ['lager', 'mitte'], ['mitte', 'thron'], ['mitte', 'westen'], ['mitte', 'osten'], ['westen', 'thron'], ['osten', 'thron']],
    groups: 26, chests: 8, nodes: [['void', 14]],
    decor: [['twisted_tree', 12, true], ['void_crystal', 10, true], ['tombstone', 6, true], ['tombstone_b', 5, true], ['shadow_spire', 9, true], ['shadow_spire_l', 4, true], ['eye_stalk', 5, true],
      ['floating_shard', 8, false], ['tendril', 8, false], ['void_rift', 2, true], ['chain_pillar', 3, true], ['ghost_flower', 12, false], ['broken_arch', 1.5, true], ['memory_frame', 2, false]],
    decorDensity: 0.1,
    mobs: [['schattenwandler', 4], ['leerenbrut', 4], ['nachtmahr', 2], ['hohlritter', 1.5]],
    mapPos: [86, 40],
  }),
  Z({
    id: 'thron', name: 'Thron der Leere', subtitle: 'Wo die Quelle schweigt', biome: 'schatten', kind: 'dungeon', w: 0, h: 0, seed: 6201,
    level: [29, 31], music: 'dungeon', ambience: 'dungeon', weathers: [['void', 1]], dark: 0.5, indoor: true,
    parent: 'schatten', gx: 4, gy: 4, maxRooms: 12, puzzle: 'plates', boss: 'hohlkoenig',
    mobs: [['hohlritter', 2.5], ['schattenwandler', 4], ['leerenbrut', 3], ['nachtmahr', 2]],
    mapPos: [92, 28],
  }),
];

export const ZONES: Record<string, ZoneDef> = Object.fromEntries(ZONE_LIST.map(z => [z.id, z]));
export const OVERWORLD_IDS = ZONE_LIST.filter(z => z.kind === 'overworld').map(z => z.id);
/** Verbindungen für die Weltkarte */
export const WORLD_LINKS: [string, string][] = [
  ['gruenwald', 'wurzelgruft'], ['gruenwald', 'kristall'], ['kristall', 'geode'], ['kristall', 'glut'], ['glut', 'aschenschmiede'],
  ['gruenwald', 'frost'], ['frost', 'gletscherdom'], ['frost', 'ruinen'], ['ruinen', 'archiv'], ['ruinen', 'schatten'], ['schatten', 'thron'],
];
/** Ressourcenknoten: Typ → [Item, Objekt-Frame] */
export const NODE_TYPES: Record<string, { item: string; name: string }> = {
  herb: { item: 'mat_herb', name: 'Quellkraut' }, wood: { item: 'mat_wood', name: 'Eisenholz' }, crystal: { item: 'mat_crystal', name: 'Kristallader' },
  ember: { item: 'mat_ember', name: 'Glutsteinader' }, frost: { item: 'mat_frost', name: 'Frosterzader' }, rune: { item: 'mat_rune', name: 'Runenfragment' }, void: { item: 'mat_void', name: 'Leerenriss' },
};
