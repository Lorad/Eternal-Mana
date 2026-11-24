/**
 * Gegenstände der Lebendigen Welt (0.6): Sternsplitter, Schatzkarten, Trophäen seltener Monster und einige neue
 * Speisen und Elixiere (Fraktions- und Sternsplitter-Rezepte). Ohne Laufzeit-Abhängigkeit zu items.ts –
 * items.ts trägt `WORLD_ITEMS` in die Gegenstandsliste ein. Icons: ausschließlich vorhandene.
 */
import { CFG } from '../config';
import type { Mods } from '../types';
import type { ItemBase } from './items';

export const STAR = 'mat_star';
/** Die sechs Regionen der Oberwelt in Reihenfolge der Materialstufen */
export const REGIONS = ['gruenwald', 'kristall', 'glut', 'frost', 'ruinen', 'schatten'] as const;
export type RegionId = (typeof REGIONS)[number];
export const mapOf = (zone: string) => 'tmap_' + zone;
export const trophyOf = (id: string) => 'tro_' + id;

const REGION_GEN: Record<RegionId, string> = { gruenwald: 'Grünwald', kristall: 'Kristallhöhlen', glut: 'Glutlande', frost: 'Frostgebirge', ruinen: 'Verlorene Ruinen', schatten: 'Schattenreich' };
const MAP_DESC: Record<RegionId, string> = {
  gruenwald: 'Mit Kohle auf Birkenrinde gezeichnet. Der Zeichner konnte Bäume. Sonst nichts.',
  kristall: 'Eine Grubenskizze mit einem Kreuz und dem Vermerk „NICHT Stollen sieben“.',
  glut: 'Auf Leder gebrannt. Riecht nach Rauch und nach jemandem, der es eilig hatte.',
  frost: 'Steif gefroren. Das Kreuz ist mit etwas eingeritzt, das ein Zahn gewesen sein könnte.',
  ruinen: 'Sauberste Kanzleischrift, vierhundert Jahre alt. Am Rand: „Ablage unbekannt“.',
  schatten: 'Die Linien verändern sich, wenn man nicht hinsieht. Das Kreuz bleibt. Meistens.',
};

const food = (id: string, name: string, icon: string, price: number, desc: string, mods: Mods): ItemBase =>
  ({ id, name, kind: 'consumable', icon, stack: true, price, desc: `Speise (15 Minuten). ${desc} Es kann immer nur eine Speise wirken.`, use: { buff: { slot: 'food', dur: CFG.craft.foodSec, mods } } });
const elixir = (id: string, name: string, icon: string, price: number, desc: string, mods: Mods): ItemBase =>
  ({ id, name, kind: 'consumable', icon, stack: true, price, desc: `Elixier (5 Minuten): ${desc} Es kann immer nur ein Elixier wirken.`, use: { buff: { slot: 'elixir', dur: CFG.craft.elixirSec, mods } } });

/** Trophäen: [Kennung, Name, Icon, Beschreibung] – je seltenem Monster und Weltboss eine */
export const TROPHIES: [string, string, string, string][] = [
  ['borkenkoenig', 'Borkenkrone', 'helm_heavy', 'Die Krone des Borkenkönigs. Sie ist aus Rinde, und sie nadelt.'],
  ['fliegenhut', 'Hut des Alten Fliegenhuts', 'hood', 'Rot mit weißen Punkten. Sella bietet dreißig Gold und will nicht sagen, wofür.'],
  ['tante_echo', 'Tante Echos Schwinge', 'mat_void', 'Wenn man hineinruft, ruft sie zurück. Eine halbe Stunde später.'],
  ['guenther', 'Günthers Schere', 'mat_crystal', 'Von Günther dem Kleinen. Hedda hat kurz geschluckt, als sie sie sah.'],
  ['meister_russ', 'Meister Rußens Kelle', 'hammer', 'Eine Schöpfkelle aus Schlacke. Wofür ein Imp eine Kelle braucht, will niemand wissen.'],
  ['glucke', 'Warmer Stein der Glucke', 'mat_ember', 'Sie hat darauf gesessen. Sehr lange. Er ist immer noch warm und ein wenig beleidigt.'],
  ['altvater_reif', 'Reifbart', 'mat_frost', 'Ein Bart aus Eis, der nicht schmilzt. Jorund sagt, seiner sei schöner.'],
  ['nordlicht', 'Gefangenes Nordlicht', 'potion_mp', 'Ein Irrlicht im Glas. Es zeigt stur nach Norden, auch wenn man es dreht.'],
  ['quill', 'Quills Mahnstempel', 'scroll', '„Dritte und letzte Mahnung.“ Die Tinte ist noch feucht. Nach vierhundert Jahren.'],
  ['sockel', 'Namensschild ohne Namen', 'seal_wind', 'Vom Standbild auf dem falschen Sockel. Jemand hat sehr gründlich gemeißelt, was hier nicht stehen soll.'],
  ['stunde', 'Zeiger der Verlorenen Stunde', 'dagger', 'Er geht nach. Um genau eine Stunde. Immer.'],
  ['hohlprinz', 'Krönchen des Hohlprinzen', 'ring', 'Zu klein für einen König. Er hat darauf bestanden, dass es trotzdem zählt.'],
  ['moosgrimm', 'Moosgrimms Flechtenbart', 'mat_herb', 'Vom Wandernden Hügel. Es wächst weiter. Nicht neben das Bett legen.'],
  ['aschenmaul', 'Aschenmauls Reißzahn', 'mat_fang', 'So lang wie ein Unterarm und innen noch glutrot.'],
  ['niemand', 'Marschbefehl ohne Absender', 'scroll', 'Feldwebel Niemand trug ihn tausend Jahre bei sich. Der Befehl lautet: „Halten.“'],
];
export const TROPHY_IDS = TROPHIES.map(t => t[0]);

export const WORLD_ITEMS: ItemBase[] = [
  { id: STAR, name: 'Sternsplitter', kind: 'material', icon: 'shard', stack: true, price: 36, desc: 'Vom Himmel gefallen und noch kühl. Fenwick sagt, er klingt wie ein A. Die Quellsplitter klingen wie Fis. Er ist seitdem unruhig.' },
  ...REGIONS.map((z, i): ItemBase => ({ id: mapOf(z), name: 'Schatzkarte: ' + REGION_GEN[z], kind: 'consumable', icon: 'scroll', stack: true, price: 80 + i * 60,
    desc: MAP_DESC[z] + ' Benutzen, um die Stelle zu markieren – gegraben wird vor Ort.', use: { tmap: z } })),
  ...TROPHIES.map(([id, name, icon, desc]): ItemBase => ({ id: trophyOf(id), name: 'Trophäe: ' + name, kind: 'consumable', icon, stack: true, price: 160,
    desc: desc + ' Benutzen, um sie in deine Sammlung aufzunehmen.', use: { trophy: id } })),
  // ---- Sternsplitter-Rezepte
  elixir('elx_stern', 'Elixier der klaren Nacht', 'elx_crit', 150, 'ein Schluck Sternenlicht – man trifft genauer und begreift schneller.', { crit: 4, xpPct: 6 }),
  food('food_stern', 'Sternschnuppen-Kompott', 'food_feigen', 110, 'Knistert auf der Zunge. Fähigkeiten sind schneller wieder bereit.', { cdr: 5, mpRegen: 1 }),
  // ---- Fraktionsrezepte
  food('food_kresse', 'Mireldas Brunnenkresse-Suppe', 'food_eintopf', 60, '„Iss. Du siehst aus wie ein ausgewrungenes Handtuch.“', { hpRegen: 2.5, healPct: 10 }),
  elixir('elx_grube', 'Grubenlicht', 'elx_res_light', 120, 'die Kumpel schwören darauf – man sieht, was glänzt, und steht fester.', { goldPct: 15, defPct: 5 }),
  food('food_fladen', 'Aschenfladen', 'food_spiess', 90, 'In der Glut gebacken, mit Asche bestäubt. Die Nomaden nennen das „gewürzt“.', { powerPct: 5, resFire: 10 }),
  food('food_wette', 'Ingas Wetteinsatz', 'food_eintopf', 120, 'Ein Jagdeintopf. Inga wettet, dass du ihn nicht aufisst. Sie verliert gern.', { hpPct: 8, resWater: 10 }),
  elixir('elx_gelehrt', 'Tinte der Gesellschaft', 'elx_speed', 160, 'eigentlich zum Schreiben gedacht. Liora trinkt sie trotzdem.', { xpPct: 12 }),
  elixir('elx_laterne', 'Laternenöl', 'elx_res_dark', 170, 'ein Tropfen vom Letzten Licht. Die Dunkelheit weicht einen Schritt zurück.', { resDark: 15, crit: 3 }),
];
