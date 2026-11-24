/**
 * Rohstoffe und Verbrauchsgüter des Handwerks (0.4) sowie die Tabellen, woher sie stammen.
 * Bewusst ohne Laufzeit-Abhängigkeit zu items.ts: items.ts trägt `CRAFT_ITEMS` in die Gegenstandsliste ein.
 * Beutechancen: CFG.loot in config.ts.
 */
import { CFG } from '../config';
import type { ClassId, Element, Mods } from '../types';
import type { ItemBase } from './items';

type El = Exclude<Element, 'phys'>;
const EL: El[] = ['fire', 'water', 'earth', 'wind', 'light', 'dark'];
const EL_GEN: Record<El, string> = { fire: 'des Feuers', water: 'des Wassers', earth: 'der Erde', wind: 'des Windes', light: 'des Lichts', dark: 'der Dunkelheit' };
const EL_SCHUTZ: Record<El, string> = { fire: 'Feuerschutzes', water: 'Wasserschutzes', earth: 'Erdschutzes', wind: 'Windschutzes', light: 'Lichtschutzes', dark: 'Schattenschutzes' };
const RES: Record<El, keyof Mods> = { fire: 'resFire', water: 'resWater', earth: 'resEarth', wind: 'resWind', light: 'resLight', dark: 'resDark' };

/** Je Biom: Monster-Rohstoff (von allen Gegnern des Gebiets) und Zutat (Gegner + Abbaustellen). Index = Materialstufe − 1. */
export const BIOME_MATS: Record<string, { monster: string; ingredient: string }> = {
  gruenwald: { monster: 'mm_chitin', ingredient: 'ing_berry' },
  kristall: { monster: 'mm_glimmer', ingredient: 'ing_cavecap' },
  glut: { monster: 'mm_ashclaw', ingredient: 'ing_pepper' },
  frost: { monster: 'mm_fang', ingredient: 'ing_lichen' },
  ruinen: { monster: 'mm_bone', ingredient: 'ing_fig' },
  schatten: { monster: 'mm_weave', ingredient: 'ing_ghostbloom' },
};
export const TIER_MONSTER = ['mm_chitin', 'mm_glimmer', 'mm_ashclaw', 'mm_fang', 'mm_bone', 'mm_weave'];
export const TIER_INGREDIENT = ['ing_berry', 'ing_cavecap', 'ing_pepper', 'ing_lichen', 'ing_fig', 'ing_ghostbloom'];
/** Erz/Holz je Materialstufe (identisch mit TIER_MATERIAL in items.ts) */
export const TIER_ORE = ['mat_wood', 'mat_crystal', 'mat_ember', 'mat_frost', 'mat_rune', 'mat_void'];
/** Essenz je Element: von Gegnern dieses Elements, mehr von Erwachten und Bossen */
export const ESSENCE: Record<El, string> = { fire: 'ess_fire', water: 'ess_water', earth: 'ess_earth', wind: 'ess_wind', light: 'ess_light', dark: 'ess_dark' };
/** Bosskern je Boss: beim ersten Sieg garantiert, danach mit CFG.loot.bossCoreRepeat */
export const BOSS_CORE: Record<string, string> = {
  dornenmutter: 'core_dornenmutter', kristallkoloss: 'core_kristallkoloss', ignarok: 'core_ignarok',
  ysolde: 'core_ysolde', archivar: 'core_archivar', hohlkoenig: 'core_hohlkoenig',
};
/** Bosskern, den die höchste Elementstufe einer Waffe verlangt */
export const ELEMENT_CORE: Record<El, string> = {
  earth: 'core_dornenmutter', light: 'core_kristallkoloss', fire: 'core_ignarok', water: 'core_ysolde', wind: 'core_archivar', dark: 'core_hohlkoenig',
};
export const ALL_CORES = Object.values(BOSS_CORE);
export const AETHER = 'mat_aether';

const mat = (id: string, name: string, icon: string, price: number, desc: string): ItemBase => ({ id, name, kind: 'material', icon, stack: true, price, desc });
const use = (id: string, name: string, icon: string, price: number, desc: string, u: NonNullable<ItemBase['use']>): ItemBase => ({ id, name, kind: 'consumable', icon, stack: true, price, desc, use: u });
const food = (id: string, name: string, price: number, desc: string, mods: Mods, dur = CFG.craft.foodSec, party?: number) => use(id, name, 'food', price, desc, { buff: { slot: 'food', dur, mods, party } });
const elixir = (id: string, name: string, price: number, desc: string, mods: Mods) => use(id, name, 'potion_elixir', price, desc, { buff: { slot: 'elixir', dur: CFG.craft.elixirSec, mods } });
const legend = (cls: ClassId, wtype: ItemBase['wtype'], name: string, desc: string): ItemBase => ({ id: 'leg_' + cls, name, kind: 'weapon', icon: wtype === 'dagger' ? 'dagger' : wtype!, tier: 6, wtype, price: 0, desc, legend: cls });

/** Alle neuen Gegenstände der Version 0.4 (Icons vorerst aus dem vorhandenen Bestand). */
export const CRAFT_ITEMS: ItemBase[] = [
  // ---- Monster-Rohstoffe
  mat('mm_chitin', 'Dornchitin', 'mat_wood', 8, 'Panzerplatten und Dornen der Geschöpfe des Grünwalds. Borin nennt es „Rüstung, die noch nicht weiß, dass sie eine ist“.'),
  mat('mm_glimmer', 'Glimmerstaub', 'mat_crystal', 14, 'Feiner, leuchtender Staub von den Bewohnern der Kristallhöhlen. Niest man hinein, sieht man es noch tagelang.'),
  mat('mm_ashclaw', 'Aschenkralle', 'mat_ember', 22, 'Krallen und Schlacke der Glutlande. Riecht nach Lagerfeuer und schlechten Entscheidungen.'),
  mat('mm_fang', 'Frostfang', 'mat_frost', 32, 'Zähne und Eisdornen aus dem Frostgebirge. Bleiben kalt, egal wie lange man sie in der Tasche trägt.'),
  mat('mm_bone', 'Ahnenknochen', 'mat_rune', 44, 'Gebein und Runensplitter der Wächter der Ruinen. Liora bittet darum, sie „mit Respekt“ zu verarbeiten.'),
  mat('mm_weave', 'Schattengespinst', 'mat_void', 62, 'Fäden aus dem, woraus die Geschöpfe des Schattenreichs gemacht sind. Wiegt weniger als nichts.'),
  // ---- Zutaten
  mat('ing_berry', 'Waldbeeren', 'mat_herb', 4, 'Süß, ein wenig sauer. Tobi behauptet, er habe „nur drei“ gegessen.'),
  mat('ing_cavecap', 'Leuchtpilz', 'food', 9, 'Schmeckt besser, als er aussieht. Leuchtet auch noch im Magen, sagt Hedda.'),
  mat('ing_pepper', 'Feuerschote', 'food', 15, 'Wächst nur dort, wo der Boden glüht. Die Nomaden essen sie roh. Die Nomaden sind seltsam.'),
  mat('ing_lichen', 'Gletscherflechte', 'mat_herb', 22, 'Jorund kocht daraus Tee. Der Tee schmeckt nach Flechte.'),
  mat('ing_fig', 'Sonnenfeige', 'food', 30, 'Aus den verwilderten Gärten der Hüter. Vierhundert Jahre ohne Gärtner und immer noch süß.'),
  mat('ing_ghostbloom', 'Geisterblüte', 'mat_herb', 42, 'Blüht nur im Schattenreich. Duftet nach etwas, an das man sich fast erinnert.'),
  // ---- Essenzen
  ...EL.map((e, i) => mat('ess_' + e, 'Essenz ' + EL_GEN[e], 'shard', 16 + i * 2, 'Gebundenes Mana ' + EL_GEN[e] + '. Zum Einschmieden, Verzaubern und Brauen.')),
  // ---- Bosskerne
  mat('core_dornenmutter', 'Dornenkern', 'seal_earth', 120, 'Das verholzte Herz der Dornenmutter. Es treibt noch aus.'),
  mat('core_kristallkoloss', 'Prismenkern', 'seal_light', 220, 'Ein Splitter aus der Brust des Kristallkolosses. Bricht das Licht in zu viele Farben.'),
  mat('core_ignarok', 'Schlackenkern', 'seal_fire', 340, 'Ein Stück von Ignaroks Glut. Nicht in die Hosentasche stecken.'),
  mat('core_ysolde', 'Frostkern', 'seal_water', 480, 'Der Knoten, an dem Ysoldes Muster hing. Vollkommen regelmäßig.'),
  mat('core_archivar', 'Stiller Kern', 'seal_wind', 640, 'Der letzte Eintrag des Archivars. Man hört darin, wie jemand Luft holt und nichts sagt.'),
  mat('core_hohlkoenig', 'Hohler Kern', 'seal_dark', 900, 'Was vom Hohlen König blieb. Er ist leichter, als er sein dürfte.'),
  mat('mat_aether', 'Ätherstaub', 'gem', 400, 'Staub aus reinem Mana, wie er nur bei den mächtigsten Geschöpfen zurückbleibt. Borin fasst ihn nur mit der Zange an.'),
  // ---- Tränke
  use('potion_hp4', 'Quellheiltrank', 'potion_hp', 320, 'Stellt 1100 Leben wieder her.', { hp: 1100 }),
  use('potion_mp4', 'Quellmanatrank', 'potion_mp', 290, 'Stellt 480 Mana wieder her.', { mp: 480 }),
  use('potion_cleanse', 'Läuterungstrank', 'potion_elixir', 60, 'Beendet Brennen, Gift, Verlangsamung und alle anderen schädlichen Zustände.', { cleanse: true }),
  // ---- Elixiere (eines gleichzeitig, 5 Minuten)
  elixir('elx_guard', 'Elixier der Eisenrinde', 70, 'Elixier (5 Minuten): härtet die Haut. Es kann immer nur ein Elixier wirken.', { defPct: 15 }),
  elixir('elx_speed', 'Elixier des Rückenwinds', 80, 'Elixier (5 Minuten): macht leichtfüßig. Es kann immer nur ein Elixier wirken.', { speedPct: 10, dodgeCdr: 10 }),
  elixir('elx_crit', 'Elixier des Falkenauges', 110, 'Elixier (5 Minuten): schärft den Blick. Es kann immer nur ein Elixier wirken.', { crit: 6 }),
  elixir('elx_power', 'Elixier der Glut', 130, 'Elixier (5 Minuten): schürt die Kraft. Es kann immer nur ein Elixier wirken.', { powerPct: 6 }),
  ...EL.map(e => elixir('elx_res_' + e, 'Elixier des ' + EL_SCHUTZ[e], 120, 'Elixier (5 Minuten): schützt vor Schaden ' + EL_GEN[e] + '. Es kann immer nur ein Elixier wirken.', { [RES[e]]: 20 })),
  // ---- Speisen (eine gleichzeitig, 15 Minuten)
  food('food_beeren', 'Beerengrütze', 20, 'Speise (15 Minuten). Macht satt und zäh. Es kann immer nur eine Speise wirken.', { hpPct: 5, hpRegen: 1 }),
  food('food_pilz', 'Leuchtpilzpfanne', 34, 'Speise (15 Minuten). Klärt den Kopf. Es kann immer nur eine Speise wirken.', { mpPct: 8, mpRegen: 0.8 }),
  food('food_spiess', 'Feuerschoten-Spieß', 52, 'Speise (15 Minuten). Brennt zweimal, hilft einmal. Es kann immer nur eine Speise wirken.', { powerPct: 4 }),
  food('food_eintopf', 'Jorunds Flechteneintopf', 74, 'Speise (15 Minuten). Schmeckt nach Flechte, hält aber warm. Es kann immer nur eine Speise wirken.', { defPct: 8, hpRegen: 1.5 }),
  food('food_feigen', 'Honigfeigen', 96, 'Speise (15 Minuten). Wer gut isst, lernt schneller und findet mehr. Es kann immer nur eine Speise wirken.', { xpPct: 8, goldPct: 10 }),
  food('food_tee', 'Geisterblütentee', 128, 'Speise (15 Minuten). Macht ruhig und sehr, sehr genau. Es kann immer nur eine Speise wirken.', { crit: 4, critDmg: 10 }),
  food('food_fest', 'Quellhainer Festmahl', 260, 'Festmahl (20 Minuten) für dich und alle Gruppenmitglieder in der Nähe. Es kann immer nur eine Speise wirken.', { powerPct: 4, hpPct: 5, defPct: 5 }, CFG.craft.feastSec, CFG.craft.feastRadius),
  // ---- Legendäre Waffen (eine je Klasse; Sonderwirkung: LEGEND_TEXT)
  legend('krieger', 'sword', 'Sechsklang', '„Sechs Kerne, eine Klinge. Schwing sie nicht in der Schmiede.“ – Borin'),
  legend('magier', 'staff', 'Wogenruf', '„Er summt. In Fis. Meistens.“ – Fenwick'),
  legend('waldlaeufer', 'bow', 'Echosehne', '„Leiser als du. Das ist keine Kunst.“ – Ayla'),
  legend('paladin', 'hammer', 'Morgenwacht', '„Der Stiel ist aus dem Balken über dem Brunnen. Sag’s Mirelda nicht.“ – Borin'),
  legend('schattenjaeger', 'dagger', 'Zwielichtfänge', '„Zwei Klingen. Ich hab sie nicht geschärft. Sie waren schon so.“ – Borin'),
];

const pct = (x: number) => Math.round(x * 100) + ' %';
const sec = (x: number) => String(x).replace('.', ',');
const LG = CFG.legend;
/** Beschreibung der Sonderwirkung der Legendären Waffen – die Zahlen stammen aus CFG.legend */
export const LEGEND_TEXT: Record<ClassId, string> = {
  krieger: `Jeder ${LG.krieger.every}. Treffer deiner Standardangriffe entfesselt eine Schockwelle, die alle Gegner um dich trifft (${pct(LG.krieger.mult)} deines Angriffs).`,
  magier: `Reaktionen, die du auslöst, treffen ${LG.magier.reactMul === 2 ? 'doppelt so hart' : pct(LG.magier.reactMul - 1) + ' härter'}, und das Ziel kann ${sec(LG.magier.reactCdCut)} Sekunden früher erneut reagieren.`,
  waldlaeufer: `Kritische Treffer prallen auf einen weiteren Gegner in der Nähe ab (${pct(LG.waldlaeufer.ricochet)} Schaden). Steht keiner dort, hallt der Treffer am selben Ziel nach (${pct(LG.waldlaeufer.echo)}).`,
  paladin: `Deine Heilungen legen einen Schild auf alle Geheilten (${pct(LG.paladin.shield)} des Heilwerts, höchstens ${pct(LG.paladin.cap)} ihres Lebens).`,
  schattenjaeger: `Triffst du ein gezeichnetes Ziel, detoniert das Mal: Schaden im Element deiner Waffe (ohne Element: Dunkelheit) für alle Gegner im Umkreis – ${pct(LG.schattenjaeger.mult)} deines Angriffs, höchstens alle ${sec(LG.schattenjaeger.cd)} Sekunden je Ziel.`,
};
