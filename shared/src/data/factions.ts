/**
 * Ruf und Fraktionen (0.6): sechs Fraktionen, eine je Region. Ruf entsteht aus Quests der Region (auch den
 * wiederholbaren), Ereignissen, seltenen Monstern, Begegnungen, Schätzen und Rohstoffspenden – Zahlen in CFG.living.rep.
 * Ränge schalten Vorräte beim Ansprechpartner der Fraktion, Preisnachlässe bei allen Händlern der Region,
 * Rezeptrollen, zusätzliche Gesprächszeilen und einen Titel frei. Server und Oberfläche benutzen dieselben Funktionen.
 */
import { CFG } from '../config';
import type { CharData, ItemInstance, ModKey } from '../types';
import { ITEMS, itemPrice, makeStack } from './items';
import { BIOME_MATS, ESSENCE, TIER_ORE } from './materials';
import type { QuestDef } from './quests';
import { scrollOf } from './recipes';
import { REGIONS, mapOf, type RegionId } from './worlditems';
import { ZONES } from './zones';

export const RANK_NAMES = ['Fremd', 'Bekannt', 'Geachtet', 'Vertraut', 'Unentbehrlich'];
export const MAX_RANK = RANK_NAMES.length;

/** Vorrat beim Ansprechpartner: Gegenstand ab Rang; `unique` = benanntes Schmuckstück, einmal je Charakter */
export interface FactionOffer {
  item: string; rank: number; price: number;
  unique?: { name: string; acc: 'ring' | 'amulet' | 'charm'; affixes: [ModKey, number][] };
}
export interface FactionDef {
  id: string; zone: RegionId;
  name: string; short: string; desc: string;
  /** Ansprechpartner: führt die Vorräte, nimmt Spenden */
  npc: string;
  /** Titel ab Rang 4 */
  title: string;
  /** Spenden: Gegenstand → Ruf je Stück */
  donate: Record<string, number>;
  stock: FactionOffer[];
  /** zusätzliche Begrüßungen: NPC → [ab Rang, Text] (die höchste passende gilt) */
  lines: Record<string, [number, string][]>;
  /** Was der jeweilige Rang bringt (Anzeige), Index = Rang − 1 */
  perks: string[];
}

const D = CFG.living.rep.donate;
const donate = (zone: RegionId, extra: string[] = []): Record<string, number> => {
  const i = REGIONS.indexOf(zone), bio = BIOME_MATS[zone];
  const out: Record<string, number> = { [TIER_ORE[i]]: D.node, [bio.ingredient]: D.ingredient, [bio.monster]: D.monster };
  for (const e of extra) out[e] = D.node;
  return out;
};
const pct = (r: number) => Math.round(CFG.living.rep.discount[r - 1] * 100);
const perks = (zoneName: string, r3: string, r4: string, r5: string): string[] => [
  'Man kennt dich noch nicht. Das lässt sich ändern.',
  `Vorräte der Fraktion: Rohstoffe der Region und ein Schutzelixier-Rezept · ${pct(2)} % Nachlass bei allen Händlern (${zoneName})`,
  `${r3} · ${pct(3)} % Nachlass`,
  `${r4} · ${pct(4)} % Nachlass`,
  `${r5} · ${pct(5)} % Nachlass`,
];
const stock = (zone: RegionId, el: keyof typeof ESSENCE, p: number[], extra: FactionOffer[]): FactionOffer[] => {
  const i = REGIONS.indexOf(zone), bio = BIOME_MATS[zone];
  return [
    { item: bio.ingredient, rank: 2, price: Math.ceil(ITEMS[bio.ingredient].price * 1.5) },
    { item: bio.monster, rank: 2, price: Math.ceil(ITEMS[bio.monster].price * 1.5) },
    { item: scrollOf('a_res_' + el), rank: 2, price: p[0] },
    { item: scrollOf('f_master_' + (i + 1)), rank: 3, price: p[1] },
    { item: ESSENCE[el], rank: 3, price: Math.ceil(ITEMS[ESSENCE[el]].price * 1.8) },
    { item: mapOf(zone), rank: 4, price: p[2] },
    ...extra,
  ].sort((a, b) => a.rank - b.rank);
};

export const FACTION_LIST: FactionDef[] = [
  { id: 'quellhain', zone: 'gruenwald', name: 'Brunnengemeinde von Quellhain', short: 'Quellhain', npc: 'sella', title: 'Brunnenpate',
    desc: 'Ein Dorf, ein Brunnen und eine Älteste, die alles weiß und das Wenigste sagt. Wer hier hilft, bekommt Honigbrot und Widerworte.',
    donate: donate('gruenwald', ['mat_herb']),
    stock: stock('gruenwald', 'earth', [120, 250, 180], [
      { item: scrollOf('c_kresse'), rank: 3, price: 150 }, { item: scrollOf('c_fest'), rank: 4, price: 450 },
      { item: 'c_charm_1', rank: 5, price: 900, unique: { name: 'Brunnenmünze', acc: 'charm', affixes: [['hpRegen', 1.5], ['goldPct', 12], ['resEarth', 8]] } }]),
    perks: perks('Grünwald', 'Rezepte: Meisterstück der Eisenholzwaffe, Mireldas Brunnenkresse-Suppe · Erdessenzen', 'Rezept: Quellhainer Festmahl · Schatzkarten · Titel „Brunnenpate“', 'Die Brunnenmünze – ein Schmuckstück, das es nur einmal gibt'),
    lines: {
      sella: [[2, 'Ah, das bekannte Gesicht! Für dich mache ich den Preis, den ich sonst nur mir selbst mache. Fast.'],
        [3, 'Freundschaftspreis! Der ist wie der normale, nur dass ich dabei lächle. Und er ist wirklich billiger. Frag nicht, mir tut es weh.'],
        [4, 'Ich hab dir was zurückgelegt. Unter dem Tisch. Nein, nicht DER Tisch. Der andere.'],
        [5, 'Ohne dich gäbe es das halbe Dorf nicht mehr und mein Sortiment auch nicht. Nimm, was du brauchst. Zahlen musst du trotzdem – ich bin gerührt, nicht verrückt.']],
      mirelda: [[3, 'Das Dorf redet gut über dich. Ich hab ihnen gesagt, sie sollen aufhören, sonst wirst du eingebildet.'],
        [5, 'Brunnenpate. Den Titel gab es dreihundert Jahre nicht. Der Letzte bekam ihn, weil er hineingefallen ist. Du hast ihn dir verdient.']],
      borin: [[4, 'Hm. Für dich leg ich das gute Eisen zurück. … Sag’s keinem.']],
      tobi: [[3, 'Mama sagt, du gehörst jetzt zum Dorf! Musst du dann auch um sieben ins Bett?']],
    } },
  { id: 'grubenleute', zone: 'kristall', name: 'Grubenleute von Stollen sieben', short: 'Grubenleute', npc: 'hedda', title: 'Ehrenkumpel',
    desc: 'Heddas Schicht: laut, rußig, abergläubisch und die Einzigen, die wissen, welcher Balken trägt. Respekt verdient man sich hier unter Tage.',
    donate: donate('kristall'),
    stock: stock('kristall', 'light', [160, 400, 260], [
      { item: scrollOf('a_grube'), rank: 3, price: 260 }, { item: scrollOf('a_stern'), rank: 4, price: 300 },
      { item: 'c_ring_2', rank: 5, price: 1400, unique: { name: 'Schichtmarke', acc: 'ring', affixes: [['crit', 4], ['goldPct', 12], ['resLight', 8]] } }]),
    perks: perks('Kristallhöhlen', 'Rezepte: Meisterstück der Kristallwaffe, Grubenlicht · Lichtessenzen', 'Rezept: Elixier der klaren Nacht · Schatzkarten · Titel „Ehrenkumpel“', 'Die Schichtmarke – ein Ring, den sonst nur trägt, wer dreißig Jahre eingefahren ist'),
    lines: {
      hedda: [[2, 'Du trägst den Helm richtig herum. Mehr verlang ich von Neuen nicht.'],
        [3, 'Die Jungs haben dir einen Haken in der Kaue freigemacht. Das ist bei uns ein Heiratsantrag. Fast.'],
        [4, 'Wenn du was aus dem Magazin brauchst: Du weißt, wo der Schlüssel hängt. Ich hab nichts gesagt.'],
        [5, 'Ehrenkumpel. Dein Name kommt auf die Schichttafel. Unten rechts. Da, wo keiner wischt.']],
    } },
  { id: 'aschennomaden', zone: 'glut', name: 'Die Aschennomaden', short: 'Aschennomaden', npc: 'rakhan', title: 'Glutgefährte',
    desc: 'Rakhans Sippe zieht, seit Kharrad fiel. Sie teilen Feuer, Wasser und Sprichwörter – in dieser Reihenfolge, und vom Wasser am wenigsten.',
    donate: donate('glut'),
    stock: stock('glut', 'fire', [200, 600, 340], [
      { item: scrollOf('c_fladen'), rank: 3, price: 340 },
      { item: 'c_charm_3', rank: 5, price: 2000, unique: { name: 'Feuerstein der Sippe', acc: 'charm', affixes: [['powerPct', 4], ['resFire', 12], ['hp', 80]] } }]),
    perks: perks('Glutlande', 'Rezepte: Meisterstück der Glutstahlwaffe, Aschenfladen · Feueressenzen', 'Schatzkarten · Titel „Glutgefährte“', 'Der Feuerstein der Sippe – wer ihn trägt, hat an jedem Nomadenfeuer einen Platz'),
    lines: {
      rakhan: [[2, 'Die Asche kennt jetzt deinen Schritt. Sie knirscht freundlicher.'],
        [3, 'Setz dich ans Feuer. Nicht dorthin – das ist der Platz für Gäste. Du sitzt jetzt hier.'],
        [4, 'Die Kinder spielen „Quellgänger“. Wer dich spielt, gewinnt immer. Ich habe versucht, das zu ändern. Vergeblich.'],
        [5, 'Glutgefährte. Wir haben kein Wort für „bleiben“. Für dich hat die Sippe eins erfunden. Es klingt wie Husten, aber es ist ein Kompliment.']],
      kelda: [[3, 'Für dich nehm ich den guten Hammer. Der andere ist auch gut. Aber der hier weiß es.']],
    } },
  { id: 'wintersassen', zone: 'frost', name: 'Die Wintersassen vom Hochpass', short: 'Wintersassen', npc: 'inga', title: 'Überwinterer',
    desc: 'Einsiedler, Fallensteller und eine Fellhändlerin, die auf alles wettet. Sie sind oben geblieben, als alle anderen hinuntergingen – aus Trotz, sagen sie. Es ist Trotz.',
    donate: donate('frost'),
    stock: stock('frost', 'water', [260, 850, 420], [
      { item: scrollOf('c_wette'), rank: 3, price: 420 }, { item: scrollOf('c_stern'), rank: 4, price: 360 },
      { item: 'c_amulet_4', rank: 5, price: 2800, unique: { name: 'Ingas Wettschein', acc: 'amulet', affixes: [['xpPct', 8], ['goldPct', 15], ['resWater', 12]] } }]),
    perks: perks('Frostgebirge', 'Rezepte: Meisterstück der Frostsilberwaffe, Ingas Wetteinsatz · Wasseressenzen', 'Rezept: Sternschnuppen-Kompott · Schatzkarten · Titel „Überwinterer“', 'Ingas Wettschein – die einzige Wette, die sie je verloren gab'),
    lines: {
      inga: [[2, 'Wetten, du kommst wieder? … Gewonnen. Macht vier Prozent.'],
        [3, 'Ich hab mit Jorund gewettet, dass du den Winter durchhältst. Er hat dagegengehalten. Enttäusch mich nicht, es geht um Tee.'],
        [4, 'Dein Fell hängt jetzt am Haken neben der Tür. Das heißt, du darfst ohne Klopfen rein. Klopf trotzdem. Jorund erschrickt sonst.'],
        [5, 'Überwinterer. Den Titel gibt es eigentlich erst nach vierzig Wintern. Ich hab gewettet, dass du es schneller schaffst.']],
      jorund: [[3, 'Der Kessel hat nach dir gefragt. Ich habe ihm gesagt, er soll sich nicht so anstellen.']],
    } },
  { id: 'gesellschaft', zone: 'ruinen', name: 'Gesellschaft der Sieben Sockel', short: 'Die Gesellschaft', npc: 'liora', title: 'Achter Sockel',
    desc: 'Lioras Grabung: sechs Mitglieder, ein Maultier, ein Geist auf der Lohnliste und die feste Überzeugung, dass man alles beschriften kann.',
    donate: donate('ruinen'),
    stock: stock('ruinen', 'wind', [300, 1100, 520], [
      { item: scrollOf('a_gelehrt'), rank: 3, price: 520 }, { item: scrollOf('a_aether'), rank: 4, price: 900 },
      { item: 'c_charm_5', rank: 5, price: 3600, unique: { name: 'Fundnummer 4 471', acc: 'charm', affixes: [['cdr', 5], ['xpPct', 8], ['resWind', 12]] } }]),
    perks: perks('Verlorene Ruinen', 'Rezepte: Meisterstück der Runenwaffe, Tinte der Gesellschaft · Windessenzen', 'Rezept: Ätherstaub verdichten · Schatzkarten · Titel „Achter Sockel“', 'Fundnummer 4 471 – ein Talisman mit eigenem Eintrag im Katalog'),
    lines: {
      liora: [[2, 'Du bist katalogisiert! Fundnummer 4 471: „Besucher, hilfsbereit, tritt nichts kaputt“. Das ist die höchste Kategorie.'],
        [3, 'Ich habe dich in der Danksagung erwähnt! Seite neun. Zwischen dem Maultier und dem Mann, der die Schaufeln geliehen hat.'],
        [4, 'Du darfst jetzt die Funde ANFASSEN. Mit Handschuhen. Mit meinen Handschuhen. Ich schaue dabei zu.'],
        [5, 'Die Gesellschaft hat sieben Sockel und sechs Mitglieder. Du bist der Achte Sockel. Das ergibt keinen Sinn. Ich liebe es.']],
      sen: [[3, 'Ihr werdet erwartet, Reisender. Ich habe Euch auf die Wachliste gesetzt. Ihr steht ganz oben. Es hat sonst niemand überlebt.']],
    } },
  { id: 'lichter', zone: 'schatten', name: 'Die Letzten Lichter', short: 'Letzte Lichter', npc: 'maelis', title: 'Laternenträger',
    desc: 'Was im Schattenreich noch leuchtet, sammelt sich um ein einzelnes Lager: ein Echo, ein paar Erinnerungen, die niemand abholt, und ein Krämer, der nicht weiß, wie er hergekommen ist.',
    donate: donate('schatten'),
    stock: stock('schatten', 'dark', [360, 1400, 640], [
      { item: scrollOf('a_laterne'), rank: 3, price: 640 },
      { item: 'c_amulet_6', rank: 5, price: 4500, unique: { name: 'Docht vom Letzten Licht', acc: 'amulet', affixes: [['crit', 5], ['hpRegen', 3], ['resDark', 14]] } }]),
    perks: perks('Schattenreich', 'Rezepte: Meisterstück der Schattenwaffe, Laternenöl · Dunkelessenzen', 'Schatzkarten · Titel „Laternenträger“', 'Der Docht vom Letzten Licht – er brennt nicht ab'),
    lines: {
      maelis: [[2, 'Du kommst wieder. Die anderen Lichter sind nie wiedergekommen. Ich merke mir dein Gesicht. Ich übe.'],
        [3, 'Das Licht brennt ruhiger, wenn du da bist. Ich glaube, es mag dich. Es mag sonst nur mich und Motten.'],
        [4, 'Ich habe dir etwas aufgehoben. Es ist eine Erinnerung an Honig. Nicht meine. Aber sie ist gut.'],
        [5, 'Laternenträger. So hießen die, die früher den Weg gezeigt haben. Es gibt keinen Weg mehr. Aber es gibt wieder jemanden, der ihn zeigt.']],
    } },
];
export const FACTIONS: Record<string, FactionDef> = Object.fromEntries(FACTION_LIST.map(f => [f.id, f]));
const BY_ZONE: Record<string, FactionDef> = Object.fromEntries(FACTION_LIST.map(f => [f.zone, f]));
const BY_NPC: Record<string, FactionDef> = Object.fromEntries(FACTION_LIST.map(f => [f.npc, f]));

/** Woher Ruf kommt (Anzeige in der Rufübersicht) */
export const REP_SOURCES: string[] = [
  `Quests der Region: Hauptquest ${CFG.living.rep.quest.main}, Nebenquest ${CFG.living.rep.quest.side}, Gruppenquest ${CFG.living.rep.quest.group}, wiederholbarer Auftrag ${CFG.living.rep.quest.repeat}`,
  `Ereignisse in der Region: bis zu ${CFG.living.rep.event[3]} je nach Beitrag · Weltboss ${CFG.living.rep.worldBoss}`,
  `Seltene Monster ${CFG.living.rep.rare} · gehobene Schätze ${CFG.living.rep.treasure} · Begegnungen am Weg ${CFG.living.rep.encounter}`,
  `Rohstoffe der Region beim Ansprechpartner spenden: ${D.node}–${D.monster} je Stück`,
];

/** Fraktion einer Zone: Dungeons zählen zur Region, in der sie liegen; der Quellgrund liegt unter Quellhain. */
export function factionOfZone(zoneId: string): FactionDef | undefined {
  let z = ZONES[zoneId];
  for (let i = 0; i < 3 && z; i++) {
    if (BY_ZONE[z.id]) return BY_ZONE[z.id];
    if (z.id === 'quellgrund') return FACTIONS.quellhain;
    z = z.parent ? ZONES[z.parent] : (undefined as any);
  }
  return undefined;
}
/** Fraktion, deren Ansprechpartner dieser NPC ist */
export function factionOfNpc(npc: string): FactionDef | undefined { return BY_NPC[npc]; }
export function repOf(c: CharData, faction: string): number { return Math.max(0, Math.floor(c.rep?.[faction] ?? 0)); }
/** Rang 1..5 zu einem Rufwert */
export function rankOf(rep: number): number { const R = CFG.living.rep.ranks; let r = 1; for (let i = 1; i < R.length; i++) if (rep >= R[i]) r = i + 1; return r; }
export function rankIn(c: CharData, faction: string): number { return rankOf(repOf(c, faction)); }
/** Fortschritt zum nächsten Rang: [erreicht, nötig] innerhalb des aktuellen Rangs; null = höchster Rang */
export function rankProgress(rep: number): [number, number] | null {
  const R = CFG.living.rep.ranks, r = rankOf(rep);
  return r >= R.length ? null : [rep - R[r - 1], R[r] - R[r - 1]];
}
/** Ruf, den der Abschluss einer Quest bringt */
export function questRep(q: QuestDef): { faction: string; n: number } | null {
  const f = factionOfZone(q.zone), n = CFG.living.rep.quest[q.type] ?? 0;
  return f && n > 0 ? { faction: f.id, n } : null;
}
/**
 * Nachtrag für Spielstände von vor 0.6: Ruf aus allen bereits abgeschlossenen Quests. Wiederholbare zählen mit ihrer
 * Anzahl (gedeckelt). `quests` kommt als Parameter, damit dieses Modul nicht von quests.ts abhängt.
 */
export function backfillRep(c: CharData, quests: Record<string, QuestDef>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id in c.quests) {
    const st = c.quests[id], q = quests[id];
    if (!q) continue;
    const times = q.type === 'repeat' || q.type === 'group' ? Math.min(CFG.living.rep.backfillRepeats, st.n ?? 0) : st.s === 'done' ? 1 : 0;
    const r = questRep(q);
    if (r && times > 0) out[r.faction] = (out[r.faction] ?? 0) + r.n * times;
  }
  return out;
}

// ------------------------------------------------------------------ Handel
/** Preisnachlass (0..1) bei den Händlern der Zone */
export function shopDiscount(c: CharData, zoneId: string): number {
  const f = factionOfZone(zoneId);
  return f ? CFG.living.rep.discount[rankIn(c, f.id) - 1] ?? 0 : 0;
}
export function discounted(price: number, discount: number): number { return Math.max(1, Math.floor(price * (1 - discount))); }
/** Kaufpreis eines Händlerangebots in dieser Zone für diesen Charakter */
export function shopPrice(c: CharData, zoneId: string, it: ItemInstance): number { return discounted(itemPrice(it), shopDiscount(c, zoneId)); }

export interface FactionEntry { offer: FactionOffer; item: ItemInstance; price: number; locked: boolean; owned: boolean }
/** Schmuckstück eines Rang-5-Angebots (feste Eigenschaften, Stufe der Region) */
export function makeFactionUnique(f: FactionDef, o: FactionOffer): ItemInstance {
  const it = makeStack(o.item);
  delete it.qty;
  it.rarity = 3; it.ilvl = ZONES[f.zone].level[1] + 1; it.name = o.unique!.name;
  it.affixes = o.unique!.affixes.map(a => [...a] as [ModKey, number]);
  return it;
}
/** Vorräte der Fraktion aus Sicht eines Charakters (gesperrte Einträge bleiben sichtbar) */
export function factionStock(c: CharData, f: FactionDef): FactionEntry[] {
  const rank = rankIn(c, f.id), disc = CFG.living.rep.discount[rank - 1] ?? 0;
  return f.stock.map(o => {
    const item = o.unique ? makeFactionUnique(f, o) : makeStack(o.item);
    item.uid = 'shop';
    return { offer: o, item, price: discounted(o.price, disc), locked: rank < o.rank, owned: !!o.unique && !!c.flags[`fu:${f.id}`] };
  });
}
/** Zusätzliche Begrüßung eines NPCs je nach Ruf bei seiner Fraktion */
export function repLine(c: CharData, npc: string): string | undefined {
  for (const f of FACTION_LIST) {
    const l = f.lines[npc];
    if (!l) continue;
    const rank = rankIn(c, f.id);
    let best: string | undefined;
    for (const [r, text] of l) if (rank >= r) best = text;
    return best;
  }
  return undefined;
}
/** Titel, die der Charakter tragen darf: Fraktions-ID → Titel */
export function titlesOf(c: CharData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of FACTION_LIST) if (rankIn(c, f.id) >= 4) out[f.id] = f.title;
  return out;
}
export function titleOf(c: CharData): string | undefined { return c.title && titlesOf(c)[c.title] ? FACTIONS[c.title].title : undefined; }
