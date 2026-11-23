/**
 * VERTRAG für das prozedurale Pixel-Art-Modul (client/src/gfx).
 * Alle Grafiken werden zur Laufzeit im Browser auf Canvas gezeichnet – es gibt keine Bilddateien.
 * Das Modul ist frei von Phaser-Abhängigkeiten; die Registrierung in Phaser übernimmt game/textures.ts.
 */
import type { BiomeId } from '../../../shared/src/maps/tiles';

export interface FrameRect { x: number; y: number; w: number; h: number }

/** Ein Spritesheet: Canvas + benannte Frames. */
export interface Sheet {
  canvas: HTMLCanvasElement;
  frames: Record<string, FrameRect>;
}

/** Karte, wie sie der Boden-Maler sieht. tiles = T.* aus shared/src/maps/tiles.ts, zeilenweise. */
export interface PaintableMap {
  w: number; h: number;
  /** Dungeon-Räume in Kachelkoordinaten (inklusive Grenzen) – für raumbezogene Bodenmuster. */
  rooms?: { x0: number; y0: number; x1: number; y1: number; role: string }[];
  tiles: Uint8Array;
  biome: BiomeId;
  /** true = Dungeon-Stil (gemauert), false = Oberwelt */
  dungeon: boolean;
  seed: number;
}

// ---------------------------------------------------------------- Charaktere
/** Spielbare Klassen → Sheet-Key `char_<id>` */
export const CLASS_IDS = ['krieger', 'magier', 'waldlaeufer', 'paladin', 'schattenjaeger'] as const;
/** NPC-Looks → Sheet-Key `npc_<id>` (gleiches Layout wie Klassen, Angriffs-Frames dürfen Idle wiederholen) */
export const NPC_LOOKS = [
  'aelteste',      // Mirelda: alte Frau, grüne Robe, weißer Dutt, Stab
  'schmied',       // Borin: stämmig, Lederschürze, Bart
  'haendlerin',    // Sella: bunte Kleidung, Kopftuch
  'gelehrter',     // Fenwick: blaue Robe, Brille, Buch
  'kind',          // Tobi: klein, rote Mütze
  'jaegerin',      // Ayla: Lederkluft, Zopf, Bogen auf dem Rücken
  'wache',         // Dorfwache: Helm, Speer
  'bergfrau',      // Hedda: Grubenmeisterin, Helm mit Lampe
  'nomade',        // Rakhan: Aschennomade, Tuch vor dem Gesicht, rot/ocker
  'einsiedler',    // Jorund: Pelzmantel, langer grauer Bart
  'fellhaendlerin',// Inga: Pelzkapuze
  'archaeologin',  // Liora: Tropenhut, Umhängetasche
  'geist',         // Sen: halbtransparenter, bläulicher Wächtergeist
  'echo',          // Maelis: leuchtende, weiß-goldene Gestalt
  'kraemer',       // Pim: riesiger Rucksack, Schlapphut
] as const;

/**
 * Charakter-Sheet-Layout v2 (Klassen und NPCs): Frame 32x40 px, Standpunkt bei (16, 37).
 * 3 Zeilen: 0 = Blick nach unten, 1 = Blick nach rechts (links = gespiegelt), 2 = Blick nach oben.
 * Spalten je Animation laut CHAR_ANIMS; Frame-Name = Index als String, Index = zeile * CHAR_COLS + spalte.
 */
export const CHAR_FRAME_W = 32;
export const CHAR_FRAME_H = 40;
export const CHAR_FOOT_Y = 37;
export interface AnimDef { start: number; len: number; fps: number; loop: boolean }
export const CHAR_ANIMS = {
  idle: { start: 0, len: 4, fps: 5, loop: true },       // Atmen, Blinzeln, leichtes Gewichtverlagern
  walk: { start: 4, len: 6, fps: 10, loop: true },      // ruhiger Gang
  run: { start: 10, len: 6, fps: 13, loop: true },      // vorgebeugt, große Schritte, Haare/Umhang wehen
  attack: { start: 16, len: 4, fps: 16, loop: false },  // schneller Standardangriff mit der Klassenwaffe
  heavy: { start: 20, len: 5, fps: 13, loop: false },   // weites Ausholen, wuchtiger Schlag, Nachschwung
  dodge: { start: 25, len: 4, fps: 13, loop: false },   // Hechtrolle in Blickrichtung
  hit: { start: 29, len: 2, fps: 8, loop: false },      // Zurückzucken
  cast: { start: 31, len: 4, fps: 9, loop: true },      // Arme/Waffe erhoben, Energie sammelt sich
  interact: { start: 35, len: 3, fps: 8, loop: false }, // vorbeugen, Hand ausstrecken
  death: { start: 38, len: 5, fps: 8, loop: false },    // taumeln, auf die Knie, zu Boden (letzter Frame liegt)
} as const satisfies Record<string, AnimDef>;
export type CharAnim = keyof typeof CHAR_ANIMS;
export const CHAR_COLS = 43;

// ---------------------------------------------------------------- Gegner
/**
 * Gegner → Sheet-Key `mob_<id>`. Eine Zeile mit 22 Frames laut MOB_ANIMS, Blick nach rechts (links = gespiegelt).
 * Framegröße je Gegner (32x32 klein, 48x40 Vierbeiner, 48x48 groß) steht in mobMeta; Standpunkt unten Mitte, 3 px über der Unterkante.
 * Kommentar = Archetyp / Aussehen / Element.
 */
export const MOB_IDS = [
  // Grünwald
  'moosling',          // Schleim aus Moos mit Blättchen, grün (Erde)
  'dornkaefer',        // gepanzerter Käfer mit Dornen, braun/grün (Erde)
  'pilzling',          // laufender Pilz mit rotem Hut, spuckt Sporen (Erde)
  'waldwolf',          // grauer Wolf (Wind), 32x24
  'wurzelschleicher',  // krabbelndes Wurzelgeflecht mit glühenden Augen (Erde)
  // Kristallhöhlen
  'fledermaus',        // Höhlenfledermaus, violett (Wind)
  'kristallkrabbler',  // Krabbe mit Kristallpanzer, türkis (Erde)
  'glimmerwisp',       // schwebendes Irrlicht, gelb-weiß (Licht)
  'tropfschleim',      // durchscheinender Wasserschleim, blau (Wasser)
  // Glutlande
  'glutimp',           // kleiner gehörnter Feuerkobold, rot (Feuer)
  'aschenhund',        // schwarzer Hund mit glühenden Rissen (Feuer), 32x24
  'magmaschleim',      // Schleim aus Lava, orange mit dunkler Kruste (Feuer)
  'schlackengolem',    // massiger Golem aus Basalt und Glut (Feuer/Erde), 32x32
  // Frostgebirge
  'frostwolf',         // weißer Wolf mit Eiskamm (Wasser), 32x24
  'eiswicht',          // blauer Eiskobold, wirft Eiszapfen (Wasser)
  'schneebrute',       // zotteliger Yeti-artiger Koloss (Wasser), 32x32
  'frostwisp',         // Irrlicht aus Eis, hellblau (Wind)
  // Verlorene Ruinen
  'runenwaechter',     // steinerner Konstrukt mit leuchtenden Runen (Licht), 32x32
  'skelettkrieger',    // Skelett mit rostigem Schwert und Schild (Dunkel)
  'fluchgeist',        // zerfetzter Geist, violett-transparent (Dunkel)
  'arkanauge',         // schwebendes Auge mit Tentakeln/Runenring (Licht)
  // Schattenreich
  'schattenwandler',   // schlanke Schattengestalt mit Klauen, weiße Augen (Dunkel)
  'leerenbrut',        // amorphe Leerenkreatur mit vielen Augen (Dunkel)
  'nachtmahr',         // geisterhaftes Ross/Bestie mit violetter Flammenmähne (Dunkel), 32x32
  'hohlritter',        // leere schwarze Rüstung mit violettem Leuchten (Dunkel), 32x32
] as const;

/**
 * Bosse → Sheet-Key `boss_<id>`. Eine Zeile mit 26 Frames laut BOSS_ANIMS, Blick nach rechts bzw. frontal.
 * Größe 96x96 bis 128x128 (bossMeta); Standpunkt unten Mitte, 6 px über der Unterkante.
 */
export const BOSS_IDS = [
  'dornenmutter',   // riesige fleischfressende Blüte auf Dornenranken (Erde)
  'kristallkoloss', // Golem aus Fels und großen Kristallen (Erde/Licht)
  'ignarok',        // Schlackenwurm/Feuerdrache, der aus Lava ragt (Feuer)
  'ysolde',         // Frostweberin: schwebende Eishexe mit Kristallkrone (Wasser)
  'archivar',       // schwebender arkaner Konstrukt aus Buchseiten, Ringen und einem zentralen Auge (Licht)
  'hohlkoenig',     // Der Hohle König: hagere gekrönte Gestalt in zerfließendem Schattenmantel, leere Brust mit Lichtfunken (Dunkel), 96x96
  'vael',           // Vael, Hüter der Dunkelheit: hagerer Mensch im verblichenen Ordensmantel mit Laterne; „Tod“ = er kniet nieder (Dunkel), 96x96, Gestalt ca. 70 px
] as const;

export const MOB_ANIMS = {
  idle: { start: 0, len: 4, fps: 5, loop: true },
  move: { start: 4, len: 6, fps: 10, loop: true },
  windup: { start: 10, len: 2, fps: 6, loop: false },   // deutliche Ankündigung (Ausholen, Aufblähen, Aufleuchten)
  attack: { start: 12, len: 3, fps: 14, loop: false },
  hit: { start: 15, len: 2, fps: 8, loop: false },
  death: { start: 17, len: 5, fps: 10, loop: false },   // artgerechtes Vergehen (zerfließen, zerbröckeln, verpuffen); letzter Frame fast leer
} as const satisfies Record<string, AnimDef>;
export const MOB_FRAMES = 22;
export const BOSS_ANIMS = {
  idle: { start: 0, len: 6, fps: 6, loop: true },
  windup: { start: 6, len: 2, fps: 5, loop: false },
  attack: { start: 8, len: 4, fps: 12, loop: false },
  special: { start: 12, len: 4, fps: 8, loop: true },   // Zaubern/Aufladen
  hit: { start: 16, len: 2, fps: 8, loop: false },
  death: { start: 18, len: 8, fps: 8, loop: false },
} as const satisfies Record<string, AnimDef>;
export const BOSS_FRAMES = 26;

export interface SpriteMeta { w: number; h: number; /** sichtbare Höhe über dem Standpunkt (zur Laufzeit gemessen) */ top?: number }

// ---------------------------------------------------------------- Objekte
/**
 * Objekt-Atlas, Sheet-Key `obj`. Jeder Name unten ist ein Frame (animierte: `<name>_0`, `<name>_1`, …; Anzahl in Klammern).
 * Fußpunkt = unten Mitte. Größen sind Richtwerte.
 */
/** v1-Liste (wird durch die v2-Listen unten ersetzt) */
export const OBJ_FRAMES = [
  // Grünwald
  'tree_oak', 'tree_oak2', 'tree_pine',      // ~32x48
  'bush', 'bush_berry', 'stump', 'log',      // ~16x16 / 32x16
  'rock_s', 'rock_l',                        // 16x16, 32x24 (neutral grau, in allen Biomen nutzbar)
  'flowers_a', 'flowers_b', 'tallgrass', 'mushrooms', // Boden-Deko 16x16
  'fence_h', 'fence_v',                      // 16x16
  'house_a', 'house_b', 'house_c',           // ~64x72 Fachwerkhäuser mit Dach (verschiedene Dachfarben)
  'well', 'stall', 'barrel', 'crate', 'lamp', 'signpost', 'bounty_board', 'anvil', 'haystack', 'tent', 'banner',
  // Kristallhöhlen
  'stalagmite', 'stalagmite_l', 'crystal_blue', 'crystal_pink', 'crystal_big', 'glowshroom', 'bones',
  // Glutlande
  'dead_tree', 'basalt_column', 'lava_rock', 'obsidian', 'skull', 'ember_vent_0', 'ember_vent_1', 'ember_vent_2', // (3)
  // Frostgebirge
  'pine_snow', 'pine_snow2', 'ice_spike', 'ice_spike_l', 'snow_rock', 'frozen_bush', 'snowman',
  // Verlorene Ruinen
  'pillar', 'pillar_broken', 'statue', 'rubble', 'arch', 'rune_stone', 'vine_tree', 'urn',
  // Schattenreich
  'twisted_tree', 'void_crystal', 'tombstone', 'shadow_spire', 'eye_stalk', 'floating_shard',
  // Interaktives (alle Biome)
  'chest_wood_closed', 'chest_wood_open', 'chest_silver_closed', 'chest_silver_open', 'chest_gold_closed', 'chest_gold_open',
  'door_locked', 'door_closed', 'door_open',       // 16x32 Dungeon-Tür (locked = mit Schloss; open = geöffneter Durchgang)
  'door_boss',                                      // 32x32 großes Bosstor mit Siegel
  'gate_bars',                                      // 16x32 Gitter (Arena-Sperre)
  'lever_off', 'lever_on',
  'plate_up', 'plate_down',                         // Druckplatte 16x16 (flach, Boden)
  'brazier_unlit', 'brazier_0', 'brazier_1', 'brazier_2', // Feuerschale (3 Frames brennend)
  'torch_0', 'torch_1', 'torch_2',                  // Wandfackel/Standfackel (3)
  'boulder_wall',                                   // 16x24 brüchige Felsblockade (zerstörbar), rissig
  'push_block',                                     // 16x20 verschiebbarer Steinblock
  'quellstein_off', 'quellstein_0', 'quellstein_1', 'quellstein_2', 'quellstein_3', // Teleportstein 24x40: Monolith mit Spiralrune; aktiv pulsierend türkis (4)
  'portal_0', 'portal_1', 'portal_2', 'portal_3',   // 32x40 wirbelndes Portal (weiß gezeichnet, wird eingefärbt) (4)
  'cave_entrance', 'stairs_down', 'stairs_up',      // 32x32
  'spikes_0', 'spikes_1', 'spikes_2',               // Stachelfalle 16x16: eingefahren, halb, ausgefahren
  'turret',                                         // 16x24 Steinkopf, der Geschosse speit
  'campfire_0', 'campfire_1', 'campfire_2',         // (3)
  'node_herb', 'node_wood', 'node_crystal', 'node_ember', 'node_frost', 'node_rune', 'node_void', 'node_empty', // Ressourcenknoten 16x16-16x24
  'shard_0', 'shard_1', 'shard_2', 'shard_3',       // Quellsplitter: schwebender türkis-goldener Kristall 16x24 (4)
  'drop_bag', 'drop_gold', 'drop_potion', 'drop_gear', 'drop_key', // Loot am Boden 16x16
  'grave',                                          // Markierung eines gefallenen Spielers
  'seal_pedestal',                                  // 24x32 Sockel für Elementarsiegel
] as const;

// ---------------------------------------------------------------- Effekte
/**
 * Effekt-Sheet, Key `fx`. Alles in Weiß/Graustufen gezeichnet, damit es per Tint eingefärbt werden kann (außer anders vermerkt).
 */
export const FX_FRAMES = [
  'slash_0', 'slash_1', 'slash_2', 'slash_3',     // 48x48 Schwungbogen, nach rechts gerichtet (wird rotiert)
  'thrust_0', 'thrust_1', 'thrust_2',             // 48x16 Stich nach rechts
  'arrow',                                        // 16x8 Pfeil nach rechts (farbig: Holz/Stahl)
  'dagger',                                       // 12x6 Wurfdolch nach rechts (farbig)
  'orb_0', 'orb_1', 'orb_2',                      // 16x16 Magiekugel, pulsierend
  'shard',                                        // 16x8 Splitter/Eiszapfen nach rechts
  'rock',                                         // 12x12 Felsbrocken
  'spore',                                        // 8x8
  'lance',                                        // 32x8 Lichtlanze nach rechts
  'px',                                           // 2x2 weiß
  'spark',                                        // 8x8 weicher Funke
  'star',                                         // 8x8 vierzackiger Stern
  'smoke',                                        // 16x16 weiche Rauchwolke
  'ring',                                         // 64x64 Schockwellenring
  'glow',                                         // 128x128 radialer Lichtverlauf (weiß → transparent)
  'shadow',                                       // 24x10 Schattenellipse (schwarz, halbtransparent)
  'shadow_l',                                     // 48x18
  'leaf', 'snowflake', 'raindrop', 'ember', 'mote', // Wetter-Partikel 4-8 px
  'heal_plus',                                    // 8x8 Pluszeichen
  'rune_circle',                                  // 64x64 magischer Kreis (Telegraph/Zauber)
  'exclaim', 'question', 'question_grey',         // 12x16 Questmarker (gelb !, gelb ?, grau ?) – farbig
  'bubble',                                       // 16x14 Sprechblase "…" – farbig
  'target',                                       // 24x12 Ziel-/Auswahl-Ellipse
  'status_burn', 'status_slow', 'status_stun', 'status_poison', 'status_buff', 'status_shield', // 8x8 Status-Icons – farbig
] as const;

// ---------------------------------------------------------------- Icons (für die HTML-UI, als Data-URL)
/** Item-Icons 24x24, Key `item_<name>` */
export const ITEM_ICONS = [
  'sword', 'axe', 'staff', 'bow', 'hammer', 'dagger',
  'helm_heavy', 'helm_light', 'hood', 'armor_heavy', 'armor_light', 'robe',
  'ring', 'amulet', 'charm',
  'potion_hp', 'potion_mp', 'potion_elixir', 'food', 'scroll',
  'mat_wood', 'mat_herb', 'mat_crystal', 'mat_ember', 'mat_frost', 'mat_rune', 'mat_void',
  'key', 'bosskey', 'shard', 'gold', 'gem',
  'seal_fire', 'seal_water', 'seal_earth', 'seal_wind', 'seal_light', 'seal_dark',
] as const;

/** Skill-Glyphen 24x24. Icon = Glyphe (hell) auf elementfarbenem Hintergrund mit Rahmen. */
export const SKILL_GLYPHS = [
  'slash', 'cleave', 'whirl', 'shield', 'shout', 'charge', 'quake',
  'bolt', 'fireball', 'frost', 'nova', 'meteor', 'blink', 'barrier', 'chain',
  'arrow', 'multishot', 'rain', 'trap', 'roll', 'eagle',
  'heal', 'smite', 'aura', 'hammer', 'holy',
  'stab', 'fan', 'vanish', 'poison', 'mark',
  'p_str', 'p_int', 'p_dex', 'p_vit', 'p_crit', 'p_mana', 'p_speed', 'p_def', 'p_element',
] as const;

export type ElementKey = 'phys' | 'fire' | 'water' | 'earth' | 'wind' | 'light' | 'dark';

/** Das, was `buildGfx()` liefert. */
export interface GfxBundle {
  /** `char_<classId>` und `npc_<lookId>` */
  chars: Record<string, Sheet>;
  /** `mob_<id>` */
  mobs: Record<string, Sheet>;
  mobMeta: Record<string, SpriteMeta>;
  /** `boss_<id>` */
  bosses: Record<string, Sheet>;
  bossMeta: Record<string, SpriteMeta>;
  obj: Sheet;
  fx: Sheet;
  /** Pro Biom 8 nahtlos kachelbare 64x64-Frames der animierten Flüssigkeit (v1-Biome: 4 Frames 32x32). */
  liquids: Record<BiomeId, HTMLCanvasElement[]>;
  /** Große nahtlose Overlay-Texturen: `fog`, `cloud_shadow`, `leaf_shadow` (je 256x256, Alpha) */
  overlays: Record<string, HTMLCanvasElement>;
}

export interface GfxApi {
  /** Erzeugt alle Sheets (einmalig beim Start; darf ~1 s dauern). */
  buildGfx(): GfxBundle;
  /**
   * Malt die Bodenebene der Karte (Kacheln tx0..tx1-1, ty0..ty1-1) in den Kontext, 16 px pro Kachel, Ursprung = Kachel (0,0) bei Pixel (0,0).
   * Nachbarschaftsbewusst (Übergänge, Wandkanten, Ufer). LIQUID-Zellen bleiben TRANSPARENT (darunter läuft die animierte Flüssigkeit),
   * nur der Uferrand wird hineingemalt. Deterministisch aus map.seed.
   */
  paintGround(ctx: CanvasRenderingContext2D, map: PaintableMap, tx0: number, ty0: number, tx1: number, ty1: number): void;
  /** Data-URL eines 24x24-Icons. key = `item_<name>` oder `skill_<glyph>`; element färbt Skill-Hintergründe. Gecacht. */
  iconUrl(key: string, element?: ElementKey): string;
  /** Data-URL eines Charakter-Porträts (Frame 0, Blick nach unten, skaliert um `scale`). key = `char_<id>` / `npc_<id>`. */
  portraitUrl(key: string, scale?: number): string;
}
