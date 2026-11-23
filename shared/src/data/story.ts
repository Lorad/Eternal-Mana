/**
 * Story-Engine (ab 0.3): Kapitel, Entscheidungen, Dialogbäume (Typen), Filmszenen, Echo-Begegnungen, Hüterschreine,
 * Orte und die Platzierung der Story-Objekte in der Welt. Reine Daten + kleine Hilfsfunktionen – die Prüfung aller
 * Aktionen liegt in server/src/story.ts, die Darstellung in client/src/game/cinematic.ts und client/src/ui/story.tsx.
 */
import type { CharData, Element } from '../types';
import { condOk, type Cond, type MemoryKey } from './cond';

// =====================================================================================================================
//  KAPITEL
// =====================================================================================================================
export interface ChapterDef { n: number; title: string; act: 1 | 2 }
export const CHAPTERS: ChapterDef[] = [
  { n: 1, title: 'Ein Flüstern im Wasser', act: 1 },
  { n: 2, title: 'Das singende Dunkel', act: 1 },
  { n: 3, title: 'Wo die Erde Feuer atmet', act: 1 },
  { n: 4, title: 'Stille über den Wolken', act: 1 },
  { n: 5, title: 'Was die Hüter zurückließen', act: 1 },
  { n: 6, title: 'Die Kehrseite der Quelle', act: 1 },
  { n: 7, title: 'Das falsche Lied', act: 2 },
  { n: 8, title: 'Die sieben Sitze', act: 2 },
  { n: 9, title: 'Der Wächter am Grund', act: 2 },
  { n: 10, title: 'Das Herz der Quelle', act: 2 },
  { n: 11, title: 'Nachklang', act: 2 },
];
export const EPILOG = 11;
export function chapterLabel(n: number): string {
  const c = CHAPTERS[n - 1];
  if (!c) return '';
  return n === EPILOG ? `Epilog · ${c.title}` : `Kapitel ${n} · ${c.title}`;
}
/** Kapitel der Hauptquests aus Akt I ergeben sich aus ihrer Zone. */
export const ZONE_CHAPTER: Record<string, number> = { gruenwald: 1, kristall: 2, glut: 3, frost: 4, ruinen: 5, schatten: 6 };

// =====================================================================================================================
//  ENTSCHEIDUNGEN  (gespeichert als Flag `d:<id>` = Wert der Option)
// =====================================================================================================================
export interface DecisionDef { id: string; title: string; who: string; options: { v: number; label: string; text: string }[] }
export const DECISIONS: Record<string, DecisionDef> = {
  borin: { id: 'borin', title: 'Keldas Geheimnis', who: 'Borin', options: [
    { v: 1, label: 'Die Wahrheit gesagt', text: 'Borin weiß, dass Kelda lebt – und wo. Er hat geschrieben. Sie hat geantwortet. Beide tun so, als sei das nichts.' },
    { v: 2, label: 'Geschwiegen', text: 'Borin hat den Hammer und Keldas Bitte bleibt gewahrt. Den ersten Brief hat sie selbst geschrieben, als sie so weit war.' }] },
  hedda: { id: 'hedda', title: 'Stollen sieben', who: 'Hedda', options: [
    { v: 1, label: 'Versiegelt', text: 'Stollen sieben bleibt ein Grab. Vor dem Eingang steht eine Tafel mit zwölf Namen.' },
    { v: 2, label: 'Wieder geöffnet', text: 'In Stollen sieben wird wieder gefördert. Über dem Eingang brennt Henriks Lampe.' }] },
  rakhan: { id: 'rakhan', title: 'Das Ende des Exils', who: 'Rakhan', options: [
    { v: 1, label: 'Heimkehr nach Kharrad', text: 'Die Glutsippen bauen an der Aschenschmiede. Nach tausend Jahren hat Kharrad wieder einen Schornstein.' },
    { v: 2, label: 'Ein Volk ist kein Ort', text: 'Die Glutsippen bleiben Wanderer – aber sie nennen es nicht mehr Exil.' }] },
  liora: { id: 'liora', title: 'Lioras Manuskript', who: 'Liora', options: [
    { v: 1, label: 'Veröffentlicht', text: '„Die Quelle ist ein Jemand“ liegt in drei Akademien. Man streitet. Laut. Liora ist begeistert.' },
    { v: 2, label: 'Verwahrt', text: 'Das Manuskript liegt in einer Kiste im Grabungslager und wartet auf eine Zeit, die es verträgt.' }] },
  sen: { id: 'sen', title: 'Sens Wache', who: 'Sen', options: [
    { v: 1, label: 'Abgelöst', text: 'Sen weiß, dass Morvain nicht mehr kommt. Seine Wache ist beendet. Er bleibt trotzdem – freiwillig.' },
    { v: 2, label: 'Wache bestätigt', text: 'Sen wartet weiter an der Schwelle, mit einem Gruß von seinem Freund im Ohr. Er ist zufrieden.' }] },
  ende: { id: 'ende', title: 'Das Herz der Quelle', who: 'Aetherion', options: [
    { v: 1, label: 'Versiegeln', text: 'Die Kristalle kehrten auf ihre Sitze zurück. Die Welt bleibt, wie sie war; die Quelle verblasst über Jahrhunderte. Vael wacht weiter.' },
    { v: 2, label: 'Befreien', text: 'Aetherion ist ganz. Mana ist wild und reich und gehört niemandem. Der Orden ist zu Ende; Vael durfte gehen.' },
    { v: 3, label: 'Das Lied vollenden', text: 'Aetherion bleibt aus freien Stücken – ein Brunnen, der zuhört. Vael hat nach tausend Jahren die Sonne gesehen.' }] },
};
/** Voraussetzungen der verborgenen dritten Antwort am Ende. */
export const LIED_COND: Cond = { minMem: 7, done: 'c_fenwick_3', all: [{ done: 'x_wiegenlied' }] };
/** Die drei Voraussetzungen einzeln (für Hinweise im Tagebuch). */
export const LIED_PARTS: { label: string; if: Cond }[] = [
  { label: 'Alle sieben Hüter-Erinnerungen', if: { minMem: 7 } },
  { label: 'Fenwicks ganzes Lied', if: { done: 'c_fenwick_3' } },
  { label: 'Maelis’ Wiegenlied', if: { done: 'x_wiegenlied' } },
];

// =====================================================================================================================
//  DIALOGBÄUME  (Inhalt: dialoge.ts)
// =====================================================================================================================
/** Wirkung einer Gesprächsoption oder eines Gesprächsknotens – wird ausschließlich vom Server angewandt. */
export interface DlgFx {
  /** Entscheidung treffen: [id, Wert] (unumkehrbar) */
  decide?: [string, number];
  flag?: string | string[];
  /** Quest starten (auch verborgene), sofern ihre Voraussetzungen erfüllt sind */
  quest?: string;
  /** Gegenstände geben: [itemId, Anzahl] – Questgegenstände nur, wenn noch nicht im Besitz */
  give?: [string, number][];
  cine?: string;
  /** Hüter-Erinnerung gewähren */
  mem?: MemoryKey;
  /** Story-Boss der Zone erneut herausfordern */
  boss?: 1;
}
export interface DlgOpt { s: string; if?: Cond; to?: string; fx?: DlgFx }
export interface DlgNode { who?: string; lines: string[]; opts?: DlgOpt[]; fx?: DlgFx }
export interface DlgTopic {
  id: string; npc: string; label: string;
  /** Markierung in der Themenliste: '!' wichtig (Quest), '…' Gespräch */
  mark?: '!' | '…';
  if?: Cond;
  /** Knoten; Einstieg ist immer `start` */
  nodes: Record<string, DlgNode>;
}

// =====================================================================================================================
//  ORTE  (Questziel „besuchen“ und Auslöser verborgener Quests) – bezogen auf einen POI der Zone
// =====================================================================================================================
export interface PlaceDef { zone: string; poi: string; dx?: number; dy?: number; /** Radius in Kacheln */ r?: number; name: string }
export const PLACES: Record<string, PlaceDef> = {
  weiher: { zone: 'gruenwald', poi: 'weiher', r: 5, name: 'Weiher im Grünwald' },
  brunnen: { zone: 'gruenwald', poi: 'dorf', dx: 3, dy: 5, r: 3, name: 'Brunnen von Quellhain' },
  brunnen_lied: { zone: 'gruenwald', poi: 'dorf', dx: 3, dy: 5, r: 3, name: 'Brunnen von Quellhain' },
  heimkehr: { zone: 'gruenwald', poi: 'dorf', dx: 3, dy: 5, r: 3, name: 'Brunnen von Quellhain' },
  weiher_bau: { zone: 'gruenwald', poi: 'weiher', r: 5, name: 'Weiher im Grünwald' },
  stollen7: { zone: 'kristall', poi: 'tief', r: 5, name: 'Stollen sieben' },
  karl: { zone: 'kristall', poi: 'nische2', r: 4, name: 'Nische hinter dem Spiegelsee' },
  klang_halle: { zone: 'kristall', poi: 'halle', r: 6, name: 'Kristallhalle' },
  klang_see: { zone: 'frost', poi: 'see', r: 6, name: 'Gefrorener See' },
  klang_traum: { zone: 'schatten', poi: 'mitte', r: 6, name: 'Mitte des Schattenreichs' },
  feld: { zone: 'glut', poi: 'feld', r: 6, name: 'Obsidianfeld' },
  krater: { zone: 'glut', poi: 'krater', r: 5, name: 'Krater der Schmiedezeichen' },
  see_tau: { zone: 'frost', poi: 'see', r: 6, name: 'Gefrorener See' },
  grund: { zone: 'quellgrund', poi: 'lager', r: 7, name: 'Lager am Quellgrund' },
};

// =====================================================================================================================
//  ECHO-BEGEGNUNGEN  (Gegnerwelle, die ein Riss oder Schrein freisetzt; bestanden = Flag `e:<id>`)
// =====================================================================================================================
export interface EchoDef {
  id: string; name: string;
  mobs: [string, number][];
  /** Anführer (Elite) mit eigenem Namen und Element */
  elite?: { mob: string; name: string; element?: Element };
  /** Stufenbereich; die Stufe folgt dem Auslöser */
  lvl?: [number, number];
  start: string; end: string;
}
const E = (e: EchoDef) => e;
export const ECHOES: Record<string, EchoDef> = Object.fromEntries([
  E({ id: 'woge1', name: 'Mana-Woge am Weiher', mobs: [['wogenling', 3], ['tiefenlicht', 1]], start: 'Die Luft reißt auf wie eine alte Naht. Was herausquillt, hat es eilig.', end: 'Die Woge fällt in sich zusammen. Der Weiher liegt wieder still – eine Handbreit höher als vorher.' }),
  E({ id: 'woge2', name: 'Mana-Woge am Holzfällerlager', mobs: [['wogenling', 3], ['tiefenlicht', 2]], start: 'Das Lagerfeuer brennt plötzlich blau. Etwas steigt aus der Glut, das nass ist.', end: 'Die Woge verebbt. Jemand wird den Holzfällern erklären müssen, warum ihre Äxte jetzt summen.' }),
  E({ id: 'woge3', name: 'Mana-Woge vor der Gruft', mobs: [['wogenling', 4], ['tiefenlicht', 2]], start: 'Vor der Gruft steht das Wasser in der Luft. Es hat sich das mit der Schwerkraft anders überlegt.', end: 'Die Woge sinkt zu Boden und versickert zwischen den Wurzeln. Der älteste Baum seufzt. Bäume dürfen das.' }),
  E({ id: 'graue', name: 'Echo der Grauen', mobs: [['wogenling', 2]], elite: { mob: 'wogenwolf', name: 'Echo der Grauen', element: 'water' }, start: 'Aus dem Riss tritt eine Wölfin aus Wasser und Licht. Sie hinkt auf dem linken Hinterlauf – genau wie die echte.', end: 'Die Wölfin aus Wasser legt sich hin, wie Wölfe es tun, und ist fort. Auf dem Boden bleibt eine nasse Fährte, die zum Weiher führt.' }),
  E({ id: 'albtraum1', name: 'Albtraum im Westen', mobs: [['erinnerter', 3], ['klagegeist', 1], ['albtraumross', 1]], start: 'Der Traum kippt. Für einen Moment riecht es nach Asche und nassem Eisen, und jemand ruft Befehle in sieben Sprachen.', end: 'Der Albtraum zieht sich zurück wie Wasser bei Ebbe. Das Spielzeug im Staub liegt wieder dort, wo es hingehört.' }),
  E({ id: 'stille1', name: 'Vorbote der Stille', mobs: [['stillefalter', 3], ['traumwaechter', 1]], elite: { mob: 'vorbote', name: 'Vorbote der Stille', element: 'wind' }, lvl: [35, 39], start: 'Es wird leise. Nicht friedlich – leise wie ein Zimmer, in dem jemand die Luft anhält.', end: 'Der Vorbote zerfällt zu Tropfen. Du hörst deinen eigenen Atem wieder und bist überrascht, wie laut er ist.' }),
  E({ id: 'guss', name: 'Echo des siebten Gusses', mobs: [['erinnerter', 2], ['traumwaechter', 1]], elite: { mob: 'hueterecho', name: 'Echo des siebten Lehrlings', element: 'fire' }, start: 'Im ausgekratzten Kreis glüht etwas nach. Eine Gestalt mit Schürze und ohne Gesicht hebt eine Gussform, die leer ist.', end: 'Die Gestalt stellt die leere Form ab, sorgfältig, wie ein Werkstück. Dann erkaltet sie.' }),
  // Hüterschreine
  E({ id: 'schrein_earth', name: 'Echo von Oda Wurzelhand', mobs: [['erinnerter', 2], ['wogenling', 2]], elite: { mob: 'hueterecho', name: 'Echo von Oda Wurzelhand', element: 'earth' }, start: 'Der Stein riecht plötzlich nach frischem Brot. Dann steht jemand davor, breit wie ein Scheunentor, und stemmt die Fäuste in die Hüften.', end: 'Das Echo nickt knapp – so, wie man einem Tagelöhner nickt, der mehr geschafft hat als erwartet.' }),
  E({ id: 'schrein_light', name: 'Echo von Kaspian Hellglas', mobs: [['tiefenlicht', 3], ['erinnerter', 1]], elite: { mob: 'hueterecho', name: 'Echo von Kaspian Hellglas', element: 'light' }, start: 'Sieben Farben fallen aus dem Stein. Eine Gestalt mit verbundenen Augen dreht den Kopf in deine Richtung und lacht – zum falschen Zeitpunkt.', end: 'Das Echo applaudiert. Es trifft die eigenen Hände nicht ganz. Es scheint ihm nichts auszumachen.' }),
  E({ id: 'schrein_fire', name: 'Echo von Rhuna Aschentochter', mobs: [['erinnerter', 3], ['traumwaechter', 1]], elite: { mob: 'hueterecho', name: 'Echo von Rhuna Aschentochter', element: 'fire' }, start: 'Der Stein glüht von innen. Jemand tritt heraus, den Hammer schon erhoben. Diese Frau hat noch nie gewartet, bis einer fertig geredet hat.', end: 'Das Echo senkt den Hammer und prüft dich wie eine Naht. Hält, sagt der Blick. Knapp.' }),
  E({ id: 'schrein_water', name: 'Echo von Nerys Tauwacht', mobs: [['wogenling', 3], ['klagegeist', 1]], elite: { mob: 'hueterecho', name: 'Echo von Nerys Tauwacht', element: 'water' }, start: 'Die Gebetsfahnen hängen still. Aus dem Stein steigt Nebel, und im Nebel steht eine Frau mit einem Ruder, das sie hält wie etwas, das man lange getragen hat.', end: 'Das Echo lehnt das Ruder an den Stein. Es sieht erleichtert aus – wie jemand, der endlich angelegt hat.' }),
  E({ id: 'schrein_wind', name: 'Echo von Corvin Aldermoor', mobs: [['klagegeist', 2], ['erinnerter', 2]], elite: { mob: 'hueterecho', name: 'Echo von Corvin Aldermoor', element: 'wind' }, start: 'Ein Windstoß blättert durch Seiten, die es nicht gibt. „Besucher“, sagt eine trockene Stimme. „Unangemeldet. Das wird protokolliert.“', end: 'Das Echo streicht eine unsichtbare Zeile, zögert – und lässt sie stehen. Vermutlich zum ersten Mal.' }),
  E({ id: 'schrein_heart', name: 'Echo von Alruna', mobs: [['erinnerter', 2], ['wachschatten', 2]], elite: { mob: 'hueterecho', name: 'Echo von Alruna', element: 'light' }, start: 'Der Stein, der bleibt, wird warm. Davor steht ein Mädchen von neunzehn Jahren mit einer Kette um den Hals und einem Gesicht, das zu früh alt geworden ist.', end: 'Das Echo öffnet die Hände. Sie sind leer. Es sieht aus, als sei das eine Erleichterung.' }),
].map(e => [e.id, e]));

// =====================================================================================================================
//  HÜTERSCHREINE  (je Region einer; Schrein → Echo → Erinnerung als Filmszene → Flag `h:<element>`)
// =====================================================================================================================
export interface ShrineDef { el: MemoryKey; zone: string; quest: string; guardian: string; people: string; seat: string }
export const SHRINES: Record<string, ShrineDef> = {
  earth: { el: 'earth', zone: 'gruenwald', quest: 'h_erde', guardian: 'Oda Wurzelhand', people: 'Hainleute von Tannreich', seat: 'Erde' },
  light: { el: 'light', zone: 'kristall', quest: 'h_licht', guardian: 'Kaspian Hellglas', people: 'Glasschleifer von Tiefenglanz', seat: 'Licht' },
  fire: { el: 'fire', zone: 'glut', quest: 'h_feuer', guardian: 'Rhuna Aschentochter', people: 'Schmiede von Kharrad', seat: 'Feuer' },
  water: { el: 'water', zone: 'frost', quest: 'h_wasser', guardian: 'Nerys Tauwacht', people: 'Fährleute vom Nebelfjord', seat: 'Wasser' },
  wind: { el: 'wind', zone: 'ruinen', quest: 'h_wind', guardian: 'Corvin Aldermoor', people: 'Kanzlei von Hochwind', seat: 'Wind' },
  heart: { el: 'heart', zone: 'schatten', quest: 'h_herz', guardian: 'Alruna von der Quellmark', people: 'Schlichter der Quellmark', seat: 'Gleichgewicht' },
};
/** Der siebte Sitz hat keinen Schrein – seine Erinnerung erzählt Vael selbst. */
export const MEMORY_NAMES: Record<MemoryKey, { guardian: string; seat: string }> = {
  earth: { guardian: 'Oda Wurzelhand', seat: 'Erde' }, light: { guardian: 'Kaspian Hellglas', seat: 'Licht' }, fire: { guardian: 'Rhuna Aschentochter', seat: 'Feuer' },
  water: { guardian: 'Nerys Tauwacht', seat: 'Wasser' }, wind: { guardian: 'Corvin Aldermoor', seat: 'Wind' }, heart: { guardian: 'Alruna von der Quellmark', seat: 'Gleichgewicht' },
  dark: { guardian: 'Vael', seat: 'Dunkelheit' },
};

// =====================================================================================================================
//  STORY-OBJEKTE IN DER WELT  (werden vom Kartengenerator nach allem anderen platziert – siehe maps/storygen.ts)
// =====================================================================================================================
export interface StoryObj {
  zone: string;
  type: 'npc' | 'shrine' | 'rift' | 'exit';
  tag: string;
  /** Oberwelt: POI-Id · Dungeon: 'boss' (Mitte des Bossraums) */
  at: string;
  dx?: number; dy?: number;
  /** genau diese Zelle (sonst: nächste freie) */
  exact?: boolean;
  /** exit: Ankunftspunkt relativ zum POI */
  entry?: [number, number];
  props?: Record<string, any>;
}
export const STORY_OBJS: StoryObj[] = [
  // ---- Quellhain / Grünwald
  { zone: 'gruenwald', type: 'npc', tag: 'fremder', at: 'dorf', dx: 4, dy: 5, props: { when: { started: 'm_ueberlauf', notDone: 'm_pruefung' } as Cond } },
  { zone: 'gruenwald', type: 'npc', tag: 'vael', at: 'dorf', dx: 2, dy: 5, props: { when: { dec: ['ende', 3] } as Cond } },
  { zone: 'gruenwald', type: 'exit', tag: 'brunnen', at: 'dorf', dx: 3, dy: 4, exact: true, entry: [3, 6],
    props: { to: 'quellgrund', look: 'well', label: 'Quellgrund', manual: true, r: 0, req: 'm_pruefung', reqMsg: 'Der Brunnen ist ein Brunnen. Tief, nass, ohne Stufen.', when: { done: 'm_pruefung' } as Cond } },
  { zone: 'gruenwald', type: 'shrine', tag: 'earth', at: 'schrein', dx: 1, dy: 2 },
  { zone: 'gruenwald', type: 'rift', tag: 'woge1', at: 'weiher', dx: 2, dy: 2, props: { when: { active: 'm_ueberlauf' } as Cond } },
  { zone: 'gruenwald', type: 'rift', tag: 'woge2', at: 'lager', dx: 4, dy: -3, props: { when: { active: 'm_ueberlauf' } as Cond } },
  { zone: 'gruenwald', type: 'rift', tag: 'woge3', at: 'gruft', dx: 4, dy: 4, props: { when: { active: 'm_ueberlauf' } as Cond } },
  { zone: 'gruenwald', type: 'rift', tag: 'graue', at: 'schrein', dx: -6, dy: 4, props: { when: { active: 'c_ayla_1' } as Cond } },
  // ---- Kristallhöhlen
  { zone: 'kristall', type: 'shrine', tag: 'light', at: 'halle', dx: 1, dy: 1 },
  // ---- Glutlande
  { zone: 'glut', type: 'shrine', tag: 'fire', at: 'feld', dx: 2, dy: 2 },
  { zone: 'glut', type: 'npc', tag: 'kelda', at: 'lager', dx: -6, dy: 2 },
  { zone: 'glut', type: 'rift', tag: 'guss', at: 'krater', dx: 2, dy: 2, props: { when: { active: 'x_guss' } as Cond } },
  // ---- Frostgebirge
  { zone: 'frost', type: 'shrine', tag: 'water', at: 'gipfel', dx: 2, dy: 1 },
  // ---- Verlorene Ruinen
  { zone: 'ruinen', type: 'shrine', tag: 'wind', at: 'platz', dx: 0, dy: 1 },
  // ---- Schattenreich
  { zone: 'schatten', type: 'shrine', tag: 'heart', at: 'osten', dx: 1, dy: 1 },
  { zone: 'schatten', type: 'npc', tag: 'vael', at: 'lager', dx: -6, dy: 0, props: { when: { started: 'm_leerer_sitz', notStarted: 'm_abstieg' } as Cond } },
  { zone: 'schatten', type: 'exit', tag: 'wacht', at: 'lager', dx: 8, dy: -3, entry: [8, -1],
    props: { to: 'wacht', look: 'portal', label: 'Vaels Wacht', r: 13, req: 'm_spur', reqMsg: 'Das Portal ist höflich, aber bestimmt: Es lässt dich nicht ein. Vael öffnet es, wenn er so weit ist.', when: { started: 'm_traum' } as Cond } },
  { zone: 'schatten', type: 'rift', tag: 'albtraum1', at: 'westen', dx: 2, dy: 2, props: { when: { active: 'm_spur' } as Cond } },
  // ---- Vaels Wacht / Quellgrund / Herz der Quelle
  { zone: 'wacht', type: 'npc', tag: 'vael', at: 'boss', dx: 0, dy: 1, props: { anchor: true, when: { flag: 'b:vael' } as Cond } },
  { zone: 'quellgrund', type: 'npc', tag: 'vael', at: 'lager', dx: -3, dy: -2, props: { when: { started: 'm_abstieg', not: { any: [{ dec: ['ende', 2] }, { dec: ['ende', 3] }] } } as Cond } },
  { zone: 'quellgrund', type: 'rift', tag: 'stille1', at: 'herz', dx: 3, dy: 4, props: { when: { active: 'm_tor' } as Cond } },
  { zone: 'herz', type: 'npc', tag: 'aetherion', at: 'boss', dx: 0, dy: 1, props: { anchor: true, when: { flag: 'b:aetherion' } as Cond } },
];
/** Ist ein Weltobjekt für diesen Charakter vorhanden? (Bedingung `props.when`) */
export function objVisible(c: CharData | null | undefined, o: { props?: Record<string, any> }): boolean {
  const w = o.props?.when as Cond | undefined;
  return !w || (!!c && condOk(c, w));
}

// =====================================================================================================================
//  FILMSZENEN  (Schrittfolge; läuft im Client, der Server schützt den Zuschauer solange)
// =====================================================================================================================
export type CineStep = { if?: Cond } & (
  | { k: 'bars'; on: boolean }
  | { k: 'title'; s: string; sub?: string; ms?: number }
  /** Textzeile; ohne `who` spricht der Erzähler. Wartet auf Bestätigung. */
  | { k: 'say'; who?: string; s: string }
  | { k: 'wait'; ms: number }
  /** Kamerafahrt: zur eigenen Figur, zum nächsten Objekt (type/tag) oder zum Boss */
  | { k: 'pan'; to: 'me' | 'obj' | 'boss'; type?: string; tag?: string; dx?: number; dy?: number; ms?: number }
  | { k: 'fade'; out: boolean; ms?: number }
  | { k: 'flash'; color?: number; ms?: number }
  | { k: 'shake'; i?: number; ms?: number }
  | { k: 'sfx'; n: string }
  | { k: 'music'; n: string }
);
export interface CineDef { id: string; steps: CineStep[] }

const say = (s: string, who?: string, cond?: Cond): CineStep => ({ k: 'say', s, who, if: cond });
const open = (to?: CineStep): CineStep[] => [{ k: 'bars', on: true }, ...(to ? [to] : []), { k: 'wait', ms: 500 }];
const close = (): CineStep[] => [{ k: 'pan', to: 'me', ms: 700 }, { k: 'bars', on: false }];

function memory(el: MemoryKey, color: number, lines: string[]): CineDef {
  const m = MEMORY_NAMES[el];
  return { id: `mem_${el}`, steps: [
    ...open(el === 'dark' ? { k: 'pan', to: 'obj', type: 'npc', tag: 'vael', ms: 900 } : { k: 'pan', to: 'obj', type: 'shrine', tag: el, ms: 900 }),
    { k: 'sfx', n: 'secret' }, { k: 'flash', color, ms: 500 },
    { k: 'title', s: 'Hüter-Erinnerung', sub: `${m.guardian} · Sitz ${m.seat === 'Gleichgewicht' ? 'des Gleichgewichts' : m.seat === 'Dunkelheit' ? 'der Dunkelheit' : m.seat === 'Erde' ? 'der Erde' : 'des ' + (m.seat === 'Licht' ? 'Lichts' : m.seat === 'Feuer' ? 'Feuers' : m.seat === 'Wasser' ? 'Wassers' : 'Windes')}`, ms: 2600 },
    ...lines.map(l => say(l, m.guardian.split(' ')[0])),
    { k: 'flash', color, ms: 400 },
    say(el === 'dark' ? 'Vael schweigt. Die Laterne in seiner Hand brennt ruhig. Sie hat tausend Jahre Übung.' : 'Die Erinnerung verblasst. Der Stein ist wieder nur ein Stein – aber einer, der gegrüßt werden will.'),
    ...close(),
  ] };
}
function chapterCard(n: number, lines: string[] = [], pan?: CineStep): CineDef {
  const c = CHAPTERS[n - 1];
  return { id: `ch${n}`, steps: [
    ...open(pan), { k: 'sfx', n: 'quest_accept' },
    { k: 'title', s: n === EPILOG ? 'Epilog' : `Kapitel ${n}`, sub: c.title, ms: lines.length ? 3000 : 3400 },
    ...lines.map(l => say(l)), ...close(),
  ] };
}

const CINE_LIST: CineDef[] = [
  // ---------------------------------------------------------------------------------------------- Kapitelauftakte
  ...[1, 2, 3, 4, 5, 6].map(n => chapterCard(n)),
  chapterCard(7, [
    'Drei Tage, nachdem die Siegel auf dem Brunnenrand lagen, begann der Brunnen von Quellhain überzulaufen.',
    'Erst eine Handbreit. Dann so viel, dass Sella Gummistiefel verkaufte, die sie gar nicht besaß.',
    'Nachts flüstert das Wasser lauter als je zuvor. Es ist immer noch derselbe Name. Aber es klingt nicht mehr wie eine Bitte.',
  ], { k: 'pan', to: 'obj', type: 'exit', tag: 'brunnen', ms: 1200 }),
  chapterCard(8, [
    'Sieben Reiche. Sieben Hüter. Sieben Sitze, von denen einer immer leer blieb.',
    'Die Chroniken nennen ihre Namen nicht mehr. Die Steine schon – man muss sie nur wecken.',
  ], { k: 'pan', to: 'obj', type: 'npc', tag: 'fremder', ms: 1000 }),
  chapterCard(9, [
    'Am Rand des Letzten Lichts steht eine Laterne, die nicht zu diesem Licht gehört.',
    'Wer sie hält, hat tausend Jahre an einer Tür gesessen. Aufgestanden ist er in all der Zeit ein einziges Mal: für ein krankes Kind.',
  ], { k: 'pan', to: 'obj', type: 'npc', tag: 'vael', ms: 1000 }),
  chapterCard(10, [
    'Unter Quellhain liegt kein Grundwasser. Unter Quellhain liegt jemand.',
    'Der Brunnen hat jetzt Stufen.',
  ]),
  chapterCard(EPILOG, ['Was auch immer du entschieden hast: Die Welt hat zugehört.']),

  // ---------------------------------------------------------------------------------------------- Kapitel 7
  { id: 'name', steps: [
    ...open({ k: 'pan', to: 'obj', type: 'exit', tag: 'brunnen', ms: 1200 }),
    say('Für einen Augenblick steht ganz Quellhain still. Hühner, Hämmer, Sella mitten im Satz.'),
    { k: 'shake', i: 0.006, ms: 900 }, { k: 'sfx', n: 'boss_phase' },
    say('Dann sagt der Brunnen es. Nicht geflüstert, nicht gerauscht. Gesagt.'),
    { k: 'flash', color: 0x70ffe8, ms: 600 },
    say('Ae … the … ri … on.', 'Das Wasser'),
    say('Irgendwo sehr tief unter deinen Füßen dreht sich jemand im Schlaf um.'),
    say('Der Fremde am Brunnen hat die Augen geschlossen. Er sieht aus wie ein Mann, der tausend Jahre lang gehofft hat, ein bestimmtes Wort nie wieder zu hören – und es trotzdem vermisst hat.'),
    ...close(),
  ] },

  // ---------------------------------------------------------------------------------------------- Kapitel 8: die Erinnerungen
  memory('earth', 0xb9a05a, [
    'Ich bin Oda. Bäuerin. Schreib nicht „Hüterin“ – das Wort kam später, als es wieder was zu ernten gab.',
    'Sieben Reiche haben aus derselben Quelle geschöpft, und jedes hatte recht, wenn man es fragte. Meine Leute auch. Wir hatten Felder. Die Felder hatten Durst.',
    'Dann kam die Große Stille. Das Korn stand, aber es wuchs nicht mehr. Hast du je einen Apfelbaum den Atem anhalten sehen?',
    'In der Nacht am Quellrand hab ich Brot mitgebracht. Sieben Leute, ein Weltuntergang, und keiner hatte an Essen gedacht.',
    'Der Dunkle – Vael – hat gefragt, ob jemand es gefragt hat. Das Ding im Wasser. Ich hab gesagt: Man fragt den Acker nicht, bevor man pflügt.',
    'Mein Tal hab ich dafür gegeben. Das erste Siegel brauchte Wurzeln, und Wurzeln brauchen einen Garten, der nie wieder trägt. Unter dem ältesten Baum liegt, was mal mein Obsthain war.',
    'Ich bereu es nicht. Aber ich hab einem Brunnen nie Danke gesagt. Das hätte nichts gekostet. Das war der Fehler.',
  ]),
  memory('light', 0xfff2a0, [
    'Kaspian Hellglas. Linsenschleifer, Sternzähler, zu neugierig für einen Krieg. Man hat mich trotzdem mitgenommen. Jemand musste hinsehen.',
    'Die anderen sprachen von der Quelle wie von einem Brunnen, einem Acker, einer Waffe. Ich habe eine Linse hineingehalten. Da war ein Herzschlag. Sehr langsam. Sehr groß.',
    'Ich habe in der Nacht am Quellrand gelacht. Zum falschen Zeitpunkt, sagt Corvin. Aber wir standen vor dem größten Rätsel der Welt und wollten es mit einem Hammer lösen – das ist doch komisch!',
    'Vael fragte, ob jemand es gefragt habe. Ich hätte gern. Ich kannte nur seine Sprache nicht. Also habe ich wenigstens nicht weggesehen, als Rhuna zuschlug.',
    'Es hat zurückgesehen. Sieben Farben. Dann eine achte, für die ich keinen Namen habe.',
    'Das war das Letzte, was ich je sah. Kein schlechter Tausch, ehrlich gesagt. Die meisten Leute sehen ihr Leben lang nichts so Schönes.',
    'Eine Bitte an den, der das hört: Sieh hin. Wir haben geteilt, was wir nicht verstanden. Versteh es wenigstens du.',
  ]),
  memory('fire', 0xff7a3c, [
    'Rhuna. Schmiedemeisterin von Kharrad. Ich habe die Fassungen gegossen, die ihr Siegel nennt. Gute Arbeit. Sie halten seit tausend Jahren. Bitte sehr.',
    'Die anderen haben geredet. Reden ist, was man tut, während das Eisen kalt wird. Draußen verdorrten sieben Reiche, und die Stille nahm sich jeden Tag einen Atemzug mehr.',
    'Der Dunkle fragte, ob jemand es gefragt habe. Ich schlug zu, bevor einer antworten konnte. Einer musste. Ich war die mit dem Hammer.',
    'Das Herz sprang in sieben Stücke, wie ich es berechnet hatte. Was ich nicht berechnet hatte: Der Berg über Kharrad nahm es übel.',
    'Ich hatte eine Stunde. Die Fassungen oder die Stadt. Ich habe die Fassungen aus dem Feuer getragen.',
    'Mein Volk zieht seither durch die Asche und nennt es Exil. Sie sollen es nennen, wie sie wollen. Sie leben, weil die Siegel halten.',
    'Ob ich es wieder täte? Frag mich etwas Schweres.',
  ]),
  memory('water', 0x5fb4ff, [
    'Ich heiße Nerys. Ich war Fährfrau auf dem Nebelfjord. Im Krieg habe ich Verwundete übergesetzt – alle sieben Farben. Mein Boot hat nie gefragt.',
    'Wasser trägt Stimmen. Darum habe ich es gehört, lange vor den anderen: Unter der Quelle hat jemand geatmet. Und als die Stille kam, hat er die Luft angehalten. Wie ein Kind, das wütend ist. Oder Angst hat.',
    'In der Nacht am Quellrand hielt ich Alrunas Hand. Sie war die Jüngste, und sie zitterte. Oda verteilte Brot, als wäre das eine Antwort.',
    'Vael fragte, ob jemand es gefragt habe. Es hat geantwortet. Nicht mit Worten – das Wasser wurde warm um meine Knöchel. Ich habe so getan, als verstünde ich es nicht.',
    'Wer einen Ertrinkenden festhält, sieht vom Ufer aus wie jemand, der ihn untertaucht. Das habe ich mir gesagt. Tausendmal.',
    'Mein Fjord ist dafür gefroren, bis auf den Grund. Eine Fährfrau ohne Wasser. Unter dem Eis treibt noch Licht – hast du es gesehen? Es atmet. Ganz langsam.',
    'Wenn du ihm begegnest: Sag ihm, die Frau mit dem Boot hat es gehört. Sie war nur zu feige, es zuzugeben.',
  ]),
  memory('wind', 0x8ef0c0, [
    'Protokoll, letzte Fassung. Verfasser: Corvin Aldermoor, Kanzler von Hochwind. Anwesend: sieben. Entschuldigt: niemand. Wetter: Asche.',
    'Zur Sache. Ein Wesen, das einer ganzen Welt den Atem leiht, ist kein Nachbar. Es ist ein Erpresser, der es nur noch nicht weiß. Ich habe das früh verstanden. Man hat mich dafür nie gemocht.',
    'Die Frage des Hüters der Dunkelheit – ob man „es“ gefragt habe – wurde nicht protokolliert. Ich habe die Zeile gestrichen. Es war die erste von vielen.',
    'Denn merkt Euch: Menschen, die wissen, dass ihr Brunnen ein Jemand ist, werden ihn anbeten oder ausweiden. Beides hatten wir gerade. Man nannte es Krieg.',
    'Also habe ich den Namen entfernt. Aus den Chroniken, aus den Liedern, aus den Köpfen der Schreiber, wo es nötig war. Ich habe ein Archiv gebaut, das vergisst, damit ich es nicht eigenhändig tun muss.',
    'Was ich geopfert habe? Die Wahrheit. Anderer Leute Wahrheit, genau genommen. Die eigene habe ich behalten – einer muss ja wissen, was fehlt.',
    'Ihr dürft mich verabscheuen. Dass Ihr dafür tausend Jahre Frieden brauchtet, um es Euch leisten zu können: gern geschehen.',
  ]),
  memory('heart', 0xffffff, [
    'Ich war die Jüngste. Alruna, Schlichterin der Quellmark – des kleinsten Reichs, kaum mehr als ein Dorf um einen Brunnen. Man nahm mich mit, weil die Quelle bei uns lag.',
    'Drei Stimmen dafür, drei dagegen. Dann sahen sie mich an. Ich war neunzehn. Ich sagte: „Tut es.“ Zwei Wörter. Ich habe sie mein Leben lang gehört.',
    'Rhuna schlug zu. Sechs Stücke ließen sich fassen. Das siebte nicht – das Herz vom Herzen. Keiner wollte es tragen. Also gaben sie es der, die „Tut es“ gesagt hatte.',
    'Ich trug es an einer Kette, sechzig Jahre. Es war warm. Es hat nie aufgehört zu weinen. Leise. Höflich beinahe, wie jemand, der nicht stören will.',
    'Wir nannten es Orden. Wir nannten es Gleichgewicht. Ich nannte es nachts beim Namen und bat um Verzeihung. Es hat nie geantwortet. Das war das Schlimmste: dass es nicht einmal zornig war.',
    'Am Ende bin ich in den Traum gegangen, zu Vael, und habe meine Erinnerung hiergelassen. Wo sie nur findet, wer sucht.',
    'Wenn du die Wahl hast, die ich hatte: Nimm dir mehr als zwei Wörter Zeit. Und frag. Bei allen Quellen – frag.',
  ]),
  memory('dark', 0xb070ff, [
    'Ihr wollt die siebte hören. Gut. Sie ist kurz. Ich habe nicht viel getan.',
    'Ich war Totenwächter in den Dämmerlanden. Wir sitzen bei denen, die sterben, damit keiner allein ist. Das ist das ganze Amt. Man lernt dabei, zuzuhören und wenig zu sagen.',
    'In der Nacht am Quellrand habe ich eine einzige Frage gestellt: ob jemand es gefragt hat. Oda sprach von Äckern. Corvin strich die Zeile. Rhuna hob den Hammer.',
    'Es schrie nicht, als das Herz brach. Es wurde nur sehr still. Ich kenne diese Stille. So klingt jemand, der beschlossen hat, es allein durchzustehen.',
    'Also bin ich mitgegangen. Hinunter in den Traum, mit dem Schatten meines Kristalls als Laterne. Ich sagte: Ich bleibe, bis du schläfst.',
    'Das war vor tausend Jahren. Es schläft schlecht.',
    'Ich weiß nicht mehr, ob ich sein Wärter bin oder sein Freund. Ich fürchte, von seiner Seite der Tür aus gibt es da keinen Unterschied.',
  ]),

  // ---------------------------------------------------------------------------------------------- Kapitel 9
  { id: 'vael', steps: [
    ...open({ k: 'pan', to: 'obj', type: 'npc', tag: 'vael', ms: 1000 }),
    say('Der Fremde tritt einen Schritt näher ans Licht. Zum ersten Mal wirft er einen eigenen Schatten.'),
    { k: 'flash', color: 0xb070ff, ms: 500 },
    { k: 'title', s: 'Vael', sub: 'Hüter der Dunkelheit · der siebte Sitz', ms: 2800 },
    say('Vael. So hieß ich, als Namen noch etwas bedeuteten. Hüter der Dunkelheit. Der siebte Sitz – der mit dem Staub.', 'Vael'),
    say('Der Orden hielt meinen Stuhl für leer. Er war es nie. Ich bin nur nie nach Hause gegangen.', 'Vael'),
    say('Was Ihr Schattenreich nennt, ist kein Reich. Es ist ein Traum. Seiner. Alles, was die Quelle vergessen musste, seit wir ihr Herz zerteilt haben, liegt hier herum wie Spielzeug in einem Kinderzimmer.', 'Vael'),
    say('Ich bin sein Wärter. Ich bin auch der Einzige, mit dem es je gesprochen hat. Rechnet selbst aus, was das aus einem macht.', 'Vael'),
    ...close(),
  ] },

  // ---------------------------------------------------------------------------------------------- Kapitel 10
  { id: 'erwachen', steps: [
    ...open({ k: 'pan', to: 'boss', ms: 1000 }),
    say('Das Wasser steht still. Dann steht es auf.'),
    { k: 'shake', i: 0.01, ms: 1200 }, { k: 'sfx', n: 'boss_roar' },
    say('… ♪ … wer … Hände. Wieder Hände.', '???'),
    say('Es sieht dich nicht. Es sieht eine Nacht aus Asche, sieben Gestalten und einen Hammer – so wie jede Nacht seit tausend Jahren.'),
    say('NICHT … NOCH … EINMAL.', 'Aetherion'),
    { k: 'flash', color: 0xffffff, ms: 700 },
    say('Was sich erhebt, ist nicht der Träumer. Es ist sein Albtraum: die Große Stille. Weck ihn auf.'),
    ...close(),
  ] },
  { id: 'ende1', steps: [
    ...open({ k: 'pan', to: 'boss', ms: 900 }), { k: 'music', n: 'menu' },
    { k: 'title', s: 'Versiegeln', sub: 'Die Kristalle kehren auf ihre Sitze zurück', ms: 3000 },
    say('Sechs Kristalle heben sich vom Brunnenrand von Quellhain wie Zugvögel, die sich an eine alte Route erinnern.'),
    say('Erde in die Wurzeln. Licht in den Berg. Feuer in die Esse. Wasser ins Eis. Wind ins Archiv. Dunkelheit in den Traum.'),
    say('Und der siebte – die Splitter – bleibt, wo er ist: verstreut. In Brunnen, in Steinen, in dir.'),
    say('Aetherion schließt die Augen. Diesmal ist es kein Zwang. Es ist eine Abmachung. Das ist nicht dasselbe wie Freiheit. Es ist aber auch nicht dasselbe wie vorher.'),
    say('Dann bleibe ich. Nein, schaut nicht so. Jemand muss ihm sagen, wie oben das Wetter ist. Und es hat sich an meine Stimme gewöhnt.', 'Vael'),
    say('Die Quelle wird verblassen. Nicht heute. Nicht in hundert Jahren. Aber sie wird – und zum ersten Mal weiß die Welt, bei wem sie sich dafür zu bedanken hat.'),
    { k: 'fade', out: true, ms: 900 }, { k: 'wait', ms: 500 }, { k: 'fade', out: false, ms: 900 },
    ...close(),
  ] },
  { id: 'ende2', steps: [
    ...open({ k: 'pan', to: 'boss', ms: 900 }), { k: 'music', n: 'menu' },
    { k: 'title', s: 'Befreien', sub: 'Aetherion wird ganz', ms: 3000 },
    say('Du nimmst die Hände weg. Mehr ist es nicht. Tausend Jahre Orden enden mit einer Geste, die jedes Kind beherrscht: loslassen.'),
    say('Sechs Kristalle zerspringen auf dem Brunnenrand von Quellhain – und setzen sich im Fallen zusammen. Der siebte singt in dir, laut, ein einziges Mal, und fliegt mit.'),
    { k: 'flash', color: 0x70ffe8, ms: 800 }, { k: 'shake', i: 0.012, ms: 1200 },
    say('Aetherion atmet ein. Die ganze Welt hält den Atem an, weil es ihrer ist.'),
    say('Dann atmet es aus. Im Grünwald blühen die Bäume im Herbst. In den Glutlanden regnet es. Im Frostgebirge taut ein Fjord, der tausend Jahre geschlafen hat.'),
    say('Die Tür ist offen. Ich … weiß gar nicht, wohin man geht, wenn man gehen darf. Ich glaube, ich fange mit „weg“ an und sehe dann weiter.', 'Vael'),
    say('Lebt wohl, Quellgänger. Und danke – auch von ihm. Es kann es noch nicht sagen. Es übt.', 'Vael'),
    say('Mana wird wild sein von nun an, und reich, und niemandes Eigentum. Ob das ein Segen ist, muss die Welt herausfinden. Zum ersten Mal seit tausend Jahren darf sie.'),
    { k: 'fade', out: true, ms: 900 }, { k: 'wait', ms: 500 }, { k: 'fade', out: false, ms: 900 },
    ...close(),
  ] },
  { id: 'ende3', steps: [
    ...open({ k: 'pan', to: 'boss', ms: 900 }), { k: 'music', n: 'menu' },
    { k: 'title', s: 'Das Lied vollenden', sub: 'Ein Brunnen, der zuhört', ms: 3000 },
    say('Du singst nicht gut. Das macht nichts. Vier Töne, die ein krankes Kind erfunden hat, damit die Nacht kürzer wird.'),
    say('Die Splitter antworten: dreißig Stimmen, ein ganzes Lied. Und darunter sieben Erinnerungen – eine Bäuerin, ein Blinder, eine Schmiedin, eine Fährfrau, ein Kanzler, ein Mädchen von neunzehn Jahren und ein Mann mit einer Laterne.'),
    say('Hat dich je jemand gefragt? – Dann frage ich. Was willst du?', 'Du'),
    say('Es ist sehr lange still. Die kleine Stille. Die, in der jemand nachdenkt.'),
    say('… Bleiben. Aber wach. Aber gefragt. Ich will … dass jemand „Guten Morgen“ sagt, bevor er den Eimer hinunterlässt.', 'Aetherion'),
    { k: 'flash', color: 0xfff2a0, ms: 800 },
    say('Die sechs Kristalle auf dem Brunnenrand hören auf, Schlüssel zu sein. Sie werden, was sie immer waren: sein Herz. Es lässt es offen. Freiwillig.'),
    say('Tausend Jahre habe ich gewacht, damit es schläft. Niemand hat mir gesagt, dass man es auch einfach hätte wecken und fragen können. … Doch. Ich. Ich habe nur nicht auf mich gehört.', 'Vael'),
    say('Vael steigt die Stufen hinauf. Oben ist Morgen. Am Brunnenrand bleibt er stehen und hält die Hand vor die Augen – nicht, weil die Sonne blendet. Weil sie warm ist.'),
    { k: 'fade', out: true, ms: 900 }, { k: 'wait', ms: 500 }, { k: 'fade', out: false, ms: 900 },
    ...close(),
  ] },

  // ---------------------------------------------------------------------------------------------- Epilog
  { id: 'epilog', steps: [
    ...open({ k: 'pan', to: 'obj', type: 'exit', tag: 'brunnen', ms: 1200 }), { k: 'music', n: 'menu' },
    { k: 'title', s: 'Nachklang', sub: 'Was aus allem wurde', ms: 3000 },
    say('In Borins Schmiede hängen zwei Hämmer am Haken. Einer kommt zweimal im Jahr mit der Aschenkarawane zu Besuch und kritisiert die Esse.', undefined, { dec: ['borin', 1] }),
    say('In Borins Schmiede hängt ein Hammer an einem Haken, der zwanzig Jahre leer war. Manchmal liegt ein Brief ohne Absender daneben. Die Schrift kennt er.', undefined, { dec: ['borin', 2] }),
    say('Vor Stollen sieben steht eine Tafel mit zwölf Namen. Der letzte steht ganz oben. Die Kumpel nehmen dort den Helm ab.', undefined, { dec: ['hedda', 1] }),
    say('In Stollen sieben wird wieder gefördert. Über dem Eingang hängt eine Lampe, die nie ausgeht. Keiner weiß, wer das Öl nachfüllt. Alle wissen es.', undefined, { dec: ['hedda', 2] }),
    say('Über der Aschenschmiede steigt wieder Rauch auf. Nach tausend Jahren hat Kharrad seinen ersten Schornstein.', undefined, { dec: ['rakhan', 1] }),
    say('Die Glutsippen ziehen weiter durch die Asche. Aber sie nennen es nicht mehr Exil. Sie nennen es den Weg.', undefined, { dec: ['rakhan', 2] }),
    say('In drei Akademien streitet man über ein Manuskript aus den Verlorenen Ruinen. Es heißt „Die Quelle ist ein Jemand“. Die Verfasserin schreit vor Freude. Meistens.', undefined, { dec: ['liora', 1] }),
    say('In einer Kiste im Grabungslager liegt ein Manuskript unter drei Scherben und einem Hut. Es wartet auf eine Zeit, die es verträgt. Seine Verfasserin sieht jeden Abend nach, ob es noch da ist.', undefined, { dec: ['liora', 2] }),
    say('An der Schwelle der Ruinen steht ein Geist ohne Wache. Er bleibt trotzdem. Freiwillig, sagt er, und das sei etwas völlig anderes.', undefined, { dec: ['sen', 1] }),
    say('An der Schwelle der Ruinen hält ein Geist Wache und wartet auf einen Freund, der ihm Grüße ausrichten ließ. Er ist glücklich. Ob das genügt, machst du mit dir selbst aus.', undefined, { dec: ['sen', 2] }),
    say('Am Letzten Licht summt ein Nachklang vier Töne. Sie hat jetzt jemanden, der die zweite Stimme kennt.', undefined, { done: 'x_wiegenlied' }),
    say('Und tief unter Quellhain sagt eine müde, höfliche Stimme jeden Abend, wie das Wetter war.', undefined, { dec: ['ende', 1] }),
    say('Und irgendwo, auf einer Straße, die er nicht kennt, geht ein sehr alter Mann ohne Laterne in den Tag.', undefined, { dec: ['ende', 2] }),
    say('Und jeden Morgen sagt jemand in Quellhain „Guten Morgen“ in einen Brunnen. Meistens Tobi. Der Brunnen antwortet. In Fis.', undefined, { dec: ['ende', 3] }),
    { k: 'title', s: 'Eternal Mana', sub: 'Akt II · Ende', ms: 3600 },
    ...close(),
  ] },
];
export const CINES: Record<string, CineDef> = Object.fromEntries(CINE_LIST.map(c => [c.id, c]));

/** Grobe Laufzeit einer Filmszene in Sekunden (für die Schutzfrist des Servers). */
export function cineSeconds(def: CineDef): number {
  let ms = 0;
  for (const s of def.steps) {
    if (s.k === 'say') ms += 2500 + s.s.length * 70;
    else if (s.k === 'title') ms += s.ms ?? 3000;
    else if (s.k === 'wait' || s.k === 'pan' || s.k === 'fade') ms += s.ms ?? 600;
  }
  return Math.min(240, ms / 1000 + 5);
}
