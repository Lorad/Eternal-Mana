/**
 * Zuhause (0.7): der eigene Hof – Kauf, Ausbaustufen, Lagertruhe und Trophäen als Daten und reine Regeln, die Server
 * und Oberfläche gemeinsam benutzen. Geprüft und ausgeführt wird alles in server/src/home/*. Zahlen: CFG.home.
 *
 * Der Hof gehört dem PROFIL, nicht dem einzelnen Charakter: Lager, Ausbau, Trophäen, Begleiter, Erscheinungen und
 * Sammlung teilen sich alle Charaktere desselben Profils (`HomeData`, Tabelle `homes`). Ein Neuer Kreis berührt nichts davon.
 */
import { CFG } from '../config';
import type { CharData, HomeData, ItemInstance, Mods } from '../types';
import { BOSSES } from './enemies';
import { FACTIONS, RANK_NAMES, rankIn } from './factions';
import { ITEMS } from './items';
import { RIFT_DUNGEONS, kreisOf, seenEndings } from './rifts';
import { TROPHIES } from './worlditems';
import { HOME_ZONE } from './zones';

export const HOME_ID = HOME_ZONE.id;
export const HOME_NPC = 'mirelda';
/** Der Wegweiser zum Hof steht wie der Riss-Stein als Server-Objekt am Dorfrand von Quellhain (nächste freie Kachel) */
export const HOME_SIGN = { zone: 'gruenwald', poi: 'dorf', dx: 9, dy: 11 };

export function emptyHome(): HomeData {
  return { v: 1, owned: 0, level: 0, gold: 0, stash: [], stands: Array<string>(CFG.home.stands[CFG.home.stands.length - 1]).fill(''), pets: [], looks: [], kills: {}, seen: {}, ms: [] };
}

// ------------------------------------------------------------------ Fortschritt, an dem Freischaltungen hängen
/** Höchste abgeschlossene Riss-Stufe (aus den Bestleistungen; die freigeschaltete Stufe beweist die darunter) */
export function riftDone(c: CharData): number {
  let n = Math.max(0, (c.rift?.stufe ?? 1) - 1);
  for (const d of RIFT_DUNGEONS) n = Math.max(n, c.rift?.best?.[d]?.[0] ?? 0);
  return n;
}

// ------------------------------------------------------------------ Kauf und Ausbau
export interface HomeLevel {
  name: string; desc: string;
  gold: number; mats: [string, number][];
  /** Voraussetzung: [Fraktion, Rang] bzw. abgeschlossene Riss-Stufe */
  rep?: [string, number]; rift?: number;
  /** was die Stufe bringt (Anzeige) */
  adds: string[];
}
const S = CFG.home.slots, ST = CFG.home.stands;
/** Index = Ausbaustufe. Stufe 0 ist der Kauf bei Mirelda; die Stufen 1–3 baut man am Tisch auf dem Hof. */
export const HOME_LEVELS: HomeLevel[] = [
  { name: 'Hof am Waldrand', desc: 'Ein Haus, ein Zaun, ein Brunnen, der nicht singt. Mirelda sagt, es stehe leer, seit der letzte Besitzer „nur kurz Pilze holen“ ging.',
    gold: CFG.home.price, mats: [],
    adds: [`Lagertruhe mit ${S[0]} Plätzen – für alle Charaktere deines Profils`, `${ST[0]} Trophäenständer`, 'Quellstein, Kleiderschrank und ein Platz für Begleiter'] },
  { name: 'Vorratskammer', desc: 'Regale bis unter das Dach. Borin zimmert sie und verlangt dafür nur, dass du nicht zusiehst.',
    gold: 900, mats: [['mat_wood', 12], ['mat_crystal', 8], ['mm_chitin', 6]],
    adds: [`Lagertruhe: ${S[1]} Plätze`, `${ST[1]} Trophäenständer`] },
  { name: 'Werkhof', desc: 'Esse, Kessel, Herd und ein Runentisch. Alles, wofür man sonst durch drei Gebiete läuft – nur ohne das Gespräch.',
    gold: 3000, mats: [['mat_ember', 10], ['mat_frost', 8], ['mm_glimmer', 8], ['mm_ashclaw', 6]], rep: ['quellhain', 3],
    adds: ['Schmiede, Alchemie, Kochstelle und Verzauberung auf dem Hof', `Lagertruhe: ${S[2]} Plätze`, `${ST[2]} Trophäenständer`] },
  { name: 'Herdfeuer', desc: 'Ein richtiges Bett. Wer darin schläft, steht ausgeruht auf – ein Zustand, den Quellgänger nur vom Hörensagen kennen.',
    gold: 9000, mats: [['mat_rune', 10], ['mat_void', 8], ['mm_weave', 6], ['mat_star', 3], ['mat_aether', 1]], rift: 5,
    adds: [`Bett: „Ausgeruht“ – ${CFG.home.rest.xpPct} % mehr Erfahrung für ${CFG.home.rest.sec / 60} Minuten Spielzeit`, `Lagertruhe: ${S[3]} Plätze`, `${ST[3]} Trophäenständer`] },
];
export const HOME_MAX = HOME_LEVELS.length - 1;
export const baseSlots = (h: HomeData) => CFG.home.slots[Math.max(0, Math.min(HOME_MAX, h.level))];
export const homeStands = (h: HomeData) => (h.owned ? CFG.home.stands[Math.max(0, Math.min(HOME_MAX, h.level))] : 0);
export const hasStations = (h: HomeData) => !!h.owned && h.level >= 2;
export const hasBed = (h: HomeData) => !!h.owned && h.level >= 3;

function countInv(c: CharData, base: string): number { let n = 0; for (const it of c.inv) if (it.base === base) n += it.qty ?? 1; return n; }
/** Darf dieser Charakter den Hof kaufen? Rückgabe: Ablehnungsgrund oder null. */
export function buyBlock(c: CharData, h: HomeData): string | null {
  if (h.owned) return 'Der Hof gehört dir schon.';
  if (c.quests[CFG.home.buyQuest]?.s !== 'done' && kreisOf(c) === 0) return '„Erst die Wurzelgruft, dann der Grundbesitz“, sagt Mirelda. „In dieser Reihenfolge überlebt man beides.“';
  if (c.gold < CFG.home.price) return `Mirelda verlangt ${CFG.home.price} Gold. Sie nennt das einen Freundschaftspreis und meint es fast.`;
  return null;
}
/** Grund, warum der nächste Ausbau (noch) nicht geht – oder null. */
export function upgradeBlock(c: CharData, h: HomeData): string | null {
  if (!h.owned) return 'Dafür brauchst du erst einen Hof.';
  const L = HOME_LEVELS[h.level + 1];
  if (!L) return 'Mehr passt nicht aufs Grundstück.';
  if (L.rep && rankIn(c, L.rep[0]) < L.rep[1]) return `Braucht Ruf: ${FACTIONS[L.rep[0]].short}, Rang „${RANK_NAMES[L.rep[1] - 1]}“.`;
  if (L.rift && riftDone(c) < L.rift) return `Braucht einen abgeschlossenen Mana-Riss der Stufe ${L.rift}.`;
  if (c.gold < L.gold) return 'Nicht genug Gold.';
  for (const [b, n] of L.mats) { const have = countInv(c, b); if (have < n) return `Es fehlt: ${n}× ${ITEMS[b]?.name ?? b} (du hast ${have}).`; }
  return null;
}

// ------------------------------------------------------------------ Lagertruhe
const SORT = ['weapon', 'helm', 'armor', 'accessory', 'consumable', 'material', 'quest'];
export function sortItems(list: ItemInstance[]): void {
  list.sort((a, b) => SORT.indexOf(ITEMS[a.base].kind) - SORT.indexOf(ITEMS[b.base].kind) || b.rarity - a.rarity || b.ilvl - a.ilvl || a.base.localeCompare(b.base));
}
/** Passt `it` in eine Liste mit `cap` Plätzen? (Stapel verschmelzen mit vorhandenen) */
export function fits(list: ItemInstance[], it: ItemInstance, cap: number): boolean {
  return (!!ITEMS[it.base]?.stack && list.some(x => x.base === it.base)) || list.length < cap;
}
/** Legt `it` in die Liste (Stapel verschmelzen). Vorher mit `fits` prüfen. */
export function putInto(list: ItemInstance[], it: ItemInstance): void {
  const ex = ITEMS[it.base]?.stack ? list.find(x => x.base === it.base) : undefined;
  if (ex) ex.qty = (ex.qty ?? 1) + (it.qty ?? 1); else list.push(it);
}
/** Warum darf dieser Gegenstand nicht in die Truhe? */
export function stashBlock(it: ItemInstance): string | null {
  return ITEMS[it.base]?.kind === 'quest' ? 'Questgegenstände bleiben bei dir. Die Truhe ist kein Versteck vor der Geschichte.' : null;
}

// ------------------------------------------------------------------ Trophäen
export type TrophyCat = 'jagd' | 'welt' | 'boss' | 'zeichen';
export const TROPHY_CATS: { id: TrophyCat; name: string; perk: string; color: number }[] = [
  { id: 'jagd', name: 'Jagdtrophäen', perk: `+${CFG.home.trophy.jagd.goldPct} % Goldfund`, color: 0xffd070 },
  { id: 'welt', name: 'Weltbosse', perk: `+${Math.round(CFG.home.trophy.welt.rep * 100)} % Ruf`, color: 0x9fe8c8 },
  { id: 'boss', name: 'Hüter und Bosse', perk: `+${CFG.home.trophy.boss.xpPct} % Erfahrung`, color: 0xc8a0ff },
  { id: 'zeichen', name: 'Wegzeichen', perk: `„Ausgeruht“ hält ${Math.round(CFG.home.trophy.zeichen.rest * 100)} % länger`, color: 0x8fdcff },
];
export interface HomeTrophy {
  id: string; name: string; cat: TrophyCat; icon: string; desc: string;
  /** woher sie stammt (Anzeige, solange sie fehlt) */
  how: string;
  /** beweist dieser Spielstand die Trophäe? */
  has(c: CharData): boolean;
}
const flag = (k: string) => (c: CharData) => !!c.flags[k];
const BOSS_TROPHY: Record<string, [string, string, string]> = {
  dornenmutter: ['Dorn der Dornenmutter', 'seal_earth', 'Er sticht noch. Aus Prinzip.'],
  kristallkoloss: ['Splitter des Kolosses', 'seal_light', 'Wiegt mehr, als er sollte, und summt, wenn niemand hinhört.'],
  ignarok: ['Schlackenschuppe', 'seal_fire', 'Von Ignarok. Als Untersetzer ungeeignet – Borin hat es probiert.'],
  ysolde: ['Ysoldes Webschiffchen', 'seal_water', 'Der Faden daran ist aus Eis und reißt nicht. Inga hat schon gefragt, was er kostet.'],
  archivar: ['Leeres Blatt des Archivars', 'seal_wind', 'Es steht nichts darauf. Das war die ganze Arbeit.'],
  hohlkoenig: ['Zacke der Hohlen Krone', 'seal_dark', 'Morvains. Man stellt sie nicht aus, um zu prahlen.'],
  vael: ['Vaels Laterne', 'potion_mp', 'Geliehen. Er sagt, tausend Jahre lang habe sie niemand ausgemacht, und du sollst nicht der Erste sein.'],
  aetherion: ['Ein Ton des Wiegenlieds', 'shard', 'Im Glas. Wenn es still ist, summt es vier Töne und hört vor dem fünften auf.'],
};
const ENDE_TROPHY: [string, string, string][] = [
  ['Versiegelter Krug', 'potion_elixir', 'Ende „Versiegeln“ – das Wasser darin wird über Jahrhunderte weniger. Man sieht es nicht. Man weiß es nur.'],
  ['Offenes Fenster', 'mat_ess_wind', 'Ende „Befreien“ – ein Fensterflügel ohne Fenster. Es zieht trotzdem.'],
  ['Stimmgabel in Fis', 'mat_ess_light', 'Ende „Das Lied vollenden“ – Fenwick behauptet, sie antworte, wenn man sie anschlägt. Er schlägt sie oft an.'],
];
export const HOME_TROPHIES: HomeTrophy[] = [
  ...TROPHIES.map(([id, name, icon, desc], i): HomeTrophy => ({ id, name, cat: i < 12 ? 'jagd' : 'welt', icon, desc,
    how: i < 12 ? 'Trophäe eines seltenen Monsters (benutzen, um sie aufzunehmen)' : 'Trophäe eines Weltbosses (benutzen, um sie aufzunehmen)', has: flag(`tr:${id}`) })),
  ...Object.keys(BOSS_TROPHY).map((b): HomeTrophy => ({ id: 'b_' + b, name: BOSS_TROPHY[b][0], cat: 'boss', icon: BOSS_TROPHY[b][1], desc: BOSS_TROPHY[b][2],
    how: `${BOSSES[b].name} ${BOSSES[b].spared !== undefined ? 'bestehen' : 'besiegen'}`, has: flag(`b:${b}`) })),
  ...[10, 20, 30].map((n, i): HomeTrophy => ({ id: 'm_riss' + n, name: ['Riss-Scherbe', 'Riss-Spiegel', 'Der zugenähte Riss'][i], cat: 'zeichen', icon: 'mat_void',
    desc: ['Ein Stück Nichts mit scharfen Kanten.', 'Zeigt dich, wie du vor dem Riss warst. Etwas ausgeruhter.', 'Stufe dreißig. Jemand hat die Naht sehr sorgfältig gesetzt. Du warst das.'][i],
    how: `Mana-Riss der Stufe ${n} abschließen`, has: c => riftDone(c) >= n })),
  { id: 'm_sieben', name: 'Sieben Kerzen', cat: 'zeichen', icon: 'seal_dark', desc: 'Eine für jeden Sitz. Die siebte brennt am längsten.', how: 'Die Prüfung der Sieben bestehen', has: c => (c.rift?.trial ?? 0) > 0 },
  ...ENDE_TROPHY.map(([name, icon, desc], i): HomeTrophy => ({ id: 'm_ende' + (i + 1), name, cat: 'zeichen', icon, desc, how: i === 2 ? 'Ein Ende, das nicht auf dem Wegweiser steht' : 'Die Geschichte zu Ende erzählen', has: c => seenEndings(c).includes(i + 1) })),
];
export const HOME_TROPHY: Record<string, HomeTrophy> = Object.fromEntries(HOME_TROPHIES.map(t => [t.id, t]));
/** Kennung in `HomeData.seen` */
export const trophySeen = (id: string) => 't:' + id;
export const ownsTrophy = (h: HomeData, id: string) => !!h.seen[trophySeen(id)];

/** Wirkung der ausgestellten Trophäen: je Art höchstens einmal, egal wie viele Ständer sie füllt. */
export function trophyPerks(h: HomeData): { mods: Mods; rep: number; rest: number; cats: TrophyCat[] } {
  const cats = new Set<TrophyCat>();
  for (const id of h.stands.slice(0, homeStands(h))) { const t = HOME_TROPHY[id]; if (t && ownsTrophy(h, id)) cats.add(t.cat); }
  const T = CFG.home.trophy, mods: Mods = {};
  if (cats.has('jagd')) mods.goldPct = T.jagd.goldPct;
  if (cats.has('boss')) mods.xpPct = T.boss.xpPct;
  return { mods, rep: cats.has('welt') ? T.welt.rep : 0, rest: cats.has('zeichen') ? T.zeichen.rest : 0, cats: [...cats] };
}
