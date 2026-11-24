/**
 * Lebendige Welt (0.6) als Daten: Jahreszeiten, Weltereignisse, Ware der Fahrenden Händlerin und die Begegnungen am Weg.
 * Die Abläufe stehen in server/src/world/*, die Zahlen in CFG.living.
 */
import { CFG } from '../config';
import type { ModKey } from '../types';
import { ESSENCE, TIER_MONSTER } from './materials';
import type { Season } from './rares';
import { scrollOf } from './recipes';
import { REGIONS, STAR, mapOf, type RegionId } from './worlditems';
import type { ZoneDef } from './zones';

// =====================================================================================================================
//  JAHRESZEITEN
// =====================================================================================================================
export const SEASON_NAMES = ['Frühling', 'Sommer', 'Herbst', 'Winter'];
export const SEASON_GLYPH = ['❀', '☀', '❦', '❄'];
/** Einblendung beim Wechsel */
export const SEASON_TEXT = [
  'Der Frühling kommt. Es regnet öfter, das Quellkraut schießt ins Kraut, und Sella verkauft Gummistiefel, die sie immer noch nicht hat.',
  'Der Sommer ist da. Lange, klare Tage – an den Abbaustellen findet sich jetzt mehr als sonst.',
  'Der Herbst zieht ein. Blätter und Asche treiben im Wind, und im Wald wachsen Pilze, die dort nichts zu suchen haben.',
  'Der Winter kommt. Selbst im Grünwald fällt Schnee, die Stürme am Pass werden härter, und an den Abbaustellen ist weniger zu holen.',
];
export const SEASON_EFFECT = [
  'Mehr Regen · Abbaustellen geben zusätzlich Quellkraut und mehr Zutaten',
  'Klares Wetter · Abbaustellen geben deutlich mehr Zutaten; am Hochpass reifen Waldbeeren',
  'Blätterwehen und Ascheregen · im Grünwald wachsen Leuchtpilze, in den Ruinen reifen die Feigen',
  'Schnee bis in den Grünwald, härtere Stürme · weniger Zutaten, dafür Wasseressenz im Frost der Abbaustellen',
];
/** Lichtstimmung der Oberwelt (wird mit dem Himmelslicht multipliziert) */
export const SEASON_TINT = [0xf0fff0, 0xfff8e2, 0xffe8cc, 0xe0eaff];
export function seasonAt(worldSec: number): { season: Season; sp: number } {
  const L = CFG.living.season.lengthSec, t = ((worldSec % (L * 4)) + L * 4) % (L * 4);
  return { season: Math.floor(t / L) as Season, sp: (t % L) / L };
}
/** Faktor auf die Wettergewichte einer Zone je Jahreszeit */
const SEASON_WEATHER: Record<string, number>[] = [
  { rain: 2.2, leaves: 0.6, snow: 0.7, blizzard: 0.4 },
  { clear: 2, rain: 0.5, embers: 1.6, snow: 0.7, blizzard: 0.3 },
  { leaves: 2.6, rain: 1.4, ash: 1.5, clear: 0.8 },
  { clear: 0.7, rain: 0.3, leaves: 0.3, snow: 1.5, blizzard: 2.2 },
];
/** Wetterlagen, die es in einer Zone nur zu dieser Jahreszeit gibt */
const SEASON_EXTRA: Partial<Record<string, [string, number][]>>[] = [{}, {}, { ruinen: [['leaves', 2]] }, { gruenwald: [['snow', 5]], ruinen: [['snow', 2]] }];
/** Wetter einer Zone unter Berücksichtigung der Jahreszeit (nur unter freiem Himmel) */
export function seasonWeathers(def: ZoneDef, season: number): [string, number][] {
  if (def.indoor || def.kind !== 'overworld') return def.weathers;
  const mul = SEASON_WEATHER[season] ?? {};
  return [...def.weathers.map(([w, n]) => [w, n * (mul[w] ?? 1)] as [string, number]), ...(SEASON_EXTRA[season]?.[def.id] ?? [])];
}
/** Abbaustellen je Jahreszeit: Faktor auf die Zutat des Bioms und Sonderfunde [Gegenstand, Chance] je Zone ('*' = überall) */
export const SEASON_NODES: { ingredient: number; extra: Record<string, [string, number][]> }[] = [
  { ingredient: 1.4, extra: { '*': [['mat_herb', 0.25]] } },
  { ingredient: 1.8, extra: { frost: [['ing_berry', 0.25]] } },
  { ingredient: 1, extra: { gruenwald: [['ing_cavecap', 0.25]], ruinen: [['ing_fig', 0.3]] } },
  { ingredient: 0.4, extra: { '*': [[ESSENCE.water, 0.12]], gruenwald: [['ing_lichen', 0.2]] } },
];
export function isNight(tod: number): boolean { return tod < 0.2 || tod >= 0.85; }

// =====================================================================================================================
//  WELTEREIGNISSE
// =====================================================================================================================
export type EventKind = 'woge' | 'sterne' | 'haendler' | 'einsturz' | 'aschesturm' | 'jagd';
export interface EventDef {
  kind: EventKind; name: string;
  /** Kartenzeichen auf Minimap und Weltkarte */
  glyph: string;
  night?: boolean;
  /** Ansage (davor steht der Ort), Ziel, Ausgang */
  start: string; goal: string; win: string; fail: string;
  /** Faktor auf Gold/XP/Ruf der Abschlussbelohnung */
  mul: number;
}
export const EVENTS: Record<EventKind, EventDef> = {
  woge: { kind: 'woge', name: 'Mana-Woge', glyph: '≋', mul: 1,
    start: 'Die Luft reißt auf wie eine alte Naht – eine Mana-Woge bricht hervor!', goal: 'Schlagt die Wellen zurück',
    win: 'Die Woge fällt in sich zusammen. Zurück bleibt eine Pfütze, die nach Gewitter riecht.', fail: 'Die Woge verebbt von selbst. Was sie ausgespuckt hat, verläuft sich im Gelände.' },
  sterne: { kind: 'sterne', name: 'Sternenregen', glyph: '✦', night: true, mul: 0.6,
    start: 'Sternenregen! Am Himmel löst sich etwas, und es fällt genau hierher.', goal: 'Sammelt Sternsplitter, bevor sie verglühen',
    win: 'Der Himmel ist wieder ordentlich. Ein paar Sterne fehlen. Niemand wird sie vermissen – außer Fenwick, der mitzählt.', fail: 'Die Splitter verglühen ungesehen im Gras.' },
  haendler: { kind: 'haendler', name: 'Fahrende Händlerin', glyph: '◈', mul: 0,
    start: 'Vesna Langweg hat ihren Karren abgestellt. Sie bleibt nicht lange – sie bleibt nie lange.', goal: 'Seht euch ihre Ware an',
    win: 'Vesna spannt an und zieht weiter. Wohin, sagt sie nicht. Sie weiß es selbst erst, wenn sie ankommt.', fail: 'Vesna spannt an und zieht weiter.' },
  einsturz: { kind: 'einsturz', name: 'Stolleneinsturz', glyph: '▲', mul: 1.1,
    start: 'Der Berg hat aufgehört zu singen. Dann hat es gekracht – drei Kumpel sind verschüttet!', goal: 'Räumt das Geröll weg und holt die Kumpel heraus',
    win: 'Alle drei sind draußen. Hedda brüllt sie eine Stunde lang an. Das ist bei ihr Erleichterung.', fail: 'Hedda holt die Verschütteten mit der Reservemannschaft heraus. Sie ist nicht begeistert. Sie ist nie begeistert, aber heute besonders.' },
  aschesturm: { kind: 'aschesturm', name: 'Aschesturm', glyph: '♨', mul: 1.1,
    start: 'Ein Aschesturm zieht auf! In seinem Auge tanzen Aschenteufel und schüren die Glut.', goal: 'Vertreibt die Aschenteufel aus dem Auge des Sturms',
    win: 'Der Sturm verliert die Lust. Die Asche legt sich und tut, als sei nichts gewesen.', fail: 'Der Sturm tobt sich aus und zieht weiter. Die Nomaden klopfen ihre Zelte ab und sagen nichts.' },
  jagd: { kind: 'jagd', name: 'Schneesturmjagd', glyph: '❄', mul: 1.1,
    start: 'Im Schneesturm heult etwas, das kein Wind ist. Inga hat schon Wetten angenommen.', goal: 'Folgt den Fährten und stellt den Weißen Leitwolf',
    win: 'Der Weiße Leitwolf ist gestellt. Inga zahlt ihre Wettschulden nicht, behauptet aber, sie hätte auf euch gesetzt.', fail: 'Der Sturm verweht die Fährte. Der Weiße heult noch einmal – es klingt nach Auslachen.' },
};
/** Ereignisse je Region mit Gewicht. Unter Tage und im Schattenreich fällt kein Sternenregen. */
export const EVENT_POOL: Record<RegionId, [EventKind, number][]> = {
  gruenwald: [['woge', 3], ['sterne', 3], ['haendler', 2]],
  kristall: [['woge', 2], ['einsturz', 3], ['haendler', 2]],
  glut: [['woge', 2], ['aschesturm', 3], ['sterne', 2], ['haendler', 2]],
  frost: [['woge', 2], ['jagd', 3], ['sterne', 3], ['haendler', 2]],
  ruinen: [['woge', 3], ['sterne', 3], ['haendler', 2]],
  schatten: [['woge', 3], ['haendler', 2]],
};
/** Faktor auf das Gewicht je Jahreszeit (0 = fällt in dieser Jahreszeit aus): im Sommer gibt es keine Schneesturmjagd, im Winter kaum Aschestürme, klare Winternächte bringen mehr Sternenregen */
export const EVENT_SEASON: Partial<Record<EventKind, number[]>> = {
  woge: [1.5, 1, 1, 1], sterne: [1, 1.3, 1, 2], aschesturm: [1, 1.5, 2, 0.4], jagd: [0.6, 0, 1, 2.5],
};
/** Ereignisse, die in dieser Region zu dieser Jahres- und Tageszeit beginnen können, mit Gewicht */
export function eventPool(zone: RegionId, season: number, night: boolean): [EventKind, number][] {
  return EVENT_POOL[zone].map(([k, w]) => [k, w * (EVENT_SEASON[k]?.[season] ?? 1)] as [EventKind, number]).filter(([k, w]) => w > 0 && (night || !EVENTS[k].night));
}
export const isRegion = (zone: string): zone is RegionId => (REGIONS as readonly string[]).includes(zone);

// =====================================================================================================================
//  FAHRENDE HÄNDLERIN
// =====================================================================================================================
export interface TraderGood {
  item: string; price: number; max: number; w: number;
  /** benanntes Schmuckstück, einmal je Charakter (Flag `vu:<key>`) */
  unique?: { key: string; name: string; affixes: [ModKey, number][] };
}
/** Ware für einen Besuch in dieser Region. `tier` = Index der Region. Feste Posten zuerst, danach wird gewürfelt. */
export function traderGoods(zone: RegionId): { fixed: TraderGood[]; pool: TraderGood[] } {
  const t = REGIONS.indexOf(zone), other = TIER_MONSTER[(t + 2) % 6], k = 1 + t * 0.5;
  const ess = Object.values(ESSENCE);
  return {
    fixed: [
      { item: STAR, price: 90, max: 3, w: 1 },
      { item: mapOf(zone), price: Math.round(150 * k), max: 1, w: 1 },
    ],
    pool: [
      ...ess.map(e => ({ item: e, price: 44, max: 5, w: 1 })),
      { item: other, price: Math.round(30 * k), max: 5, w: 3 },
      { item: 'mat_aether', price: 1100, max: 1, w: 1.5 },
      { item: scrollOf('a_stern'), price: 320, max: 1, w: 2 },
      { item: scrollOf('c_stern'), price: 280, max: 1, w: 2 },
      { item: scrollOf('a_sternaether'), price: 950, max: 1, w: 1 },
      { item: scrollOf('c_fest'), price: 520, max: 1, w: 1 },
      { item: 'elx_stern', price: 190, max: 2, w: 2 },
      { item: 'potion_cleanse', price: 70, max: 4, w: 2 },
      { item: `c_charm_${t + 1}`, price: Math.round(700 * k), max: 1, w: 2, unique: { key: 'kompass', name: 'Kompass der Umwege', affixes: [['speedPct', 5], ['goldPct', 10], ['xpPct', 5]] } },
      { item: `c_ring_${t + 1}`, price: Math.round(800 * k), max: 1, w: 2, unique: { key: 'pfennig', name: 'Vesnas Glückspfennig', affixes: [['crit', 3], ['goldPct', 20]] } },
    ],
  };
}
export const TRADER_SLOTS = 6;

// =====================================================================================================================
//  BEGEGNUNGEN AM WEG
// =====================================================================================================================
export type EncounterKind = 'hinterhalt' | 'reisender' | 'tier' | 'duell';
export const ENCOUNTER_KINDS: [EncounterKind, number][] = [['hinterhalt', 3], ['reisender', 2], ['tier', 2], ['duell', 2]];
/** Verletzte Tiere je Region: [Frame im Objekt-Atlas, Name, Einleitung] */
export const ANIMALS: Record<RegionId, [string, string, string]> = {
  gruenwald: ['pet_moosling', 'Mooslingjunges', 'Ein Mooslingjunges sitzt am Wegrand und hält eine Pfote hoch. Es sieht dich an, als wärst du schuld. Du bist es wahrscheinlich nicht.'],
  kristall: ['pet_wisp', 'Flackerndes Wisplein', 'Ein winziges Wisp flackert zwischen den Steinen wie eine Kerze im Zug. Es hat sich an einer Kristallkante das Licht aufgeschürft.'],
  glut: ['pet_glutfuchs', 'Glutfuchs', 'Ein Glutfuchs liegt im Schatten eines Basaltblocks und leckt sich die Flanke. Die Glut in seinem Fell ist fast aus.'],
  frost: ['pet_schneeeule', 'Schneeeule', 'Eine Schneeeule hockt im Schnee und lässt einen Flügel hängen. Sie dreht den Kopf zu dir. Ganz herum. Das ist bei Eulen kein Vorwurf. Wahrscheinlich.'],
  ruinen: ['pet_runenkaefer', 'Runenkäfer', 'Ein Runenkäfer liegt auf dem Rücken und strampelt. Die Zeichen auf seinem Panzer blinken „Hilfe“. Oder „Gefahr“. Es ist dieselbe Rune.'],
  schatten: ['pet_schattenkatze', 'Schattenkatze', 'Eine Schattenkatze liegt am Weg, halb da, halb nicht. Die Hälfte, die da ist, hinkt.'],
};
export const ENC_TEXT = {
  hinterhalt: {
    start: 'Hinterhalt! Im Gelände raschelt es – und zwar von allen Seiten.',
    win: 'Der Weg ist wieder frei. Jemand hatte hier einen Plan. Er war nicht gut.',
  },
  reisender: {
    who: 'Odo Kleinschritt',
    start: ['Oh! Ein Mensch! Verzeiht – ich bin Kartenzeichner. Ich habe mich verlaufen. Das ist beruflich sehr unangenehm.',
      'Die Karte stimmt, das möchte ich betonen. Nur die Gegend hält sich nicht daran. Könntet Ihr mich ein Stück begleiten? Oder habt Ihr wenigstens etwas zu essen? Ich zeichne schlecht auf leeren Magen.'],
    optEscort: 'Komm mit. Ich bringe dich bis zur Weggabelung.',
    optItem: 'Hier, nimm einen Heiltrank.',
    optItemOff: 'Du hast keinen Heiltrank bei dir.',
    optLeave: 'Viel Glück mit der Gegend.',
    escort: 'Odo heftet sich an deine Fersen und zeichnet im Gehen. Bring ihn bis zum Wegweiser.',
    ambush: 'Etwas hat den Kartenzeichner gewittert!',
    done: ['Die Weggabelung! Sie ist genau da, wo ich sie eingezeichnet habe. Ungefähr. Ab hier finde ich allein.', 'Nehmt das. Ich brauche es nicht mehr – ich zeichne sowieso eine neue.'],
    fed: ['Ein Heiltrank! Schmeckt nach Kirsche und nach Reue. Jetzt sehe ich klarer – die Gabelung ist dort drüben. Sie war die ganze Zeit dort drüben.', 'Nehmt das zum Dank.'],
    lost: 'Odo Kleinschritt hat sich wieder verlaufen. Diesmal gründlich.',
  },
  tier: {
    optHerb: 'Mit Quellkraut verbinden (1 Quellkraut)',
    optHerbOff: 'Du hast kein Quellkraut bei dir.',
    optGuard: 'Wache halten, bis es sich erholt hat',
    optLeave: 'Weitergehen',
    guard: 'Du bleibst bei dem Tier. Etwas im Gelände hat das gerochen.',
    healed: 'Das Tier schüttelt sich, sieht dich lange an und scharrt etwas aus dem Boden – offenbar bist du jetzt bezahlt. Dann ist es fort.',
    lost: 'Das Tier schleppt sich ins Gelände davon.',
  },
  duell: {
    who: 'Ritter Kunibert von Ungefähr',
    start: ['Halt! Ich bin Ritter Kunibert von Ungefähr, und ich fordere jeden heraus, der diesen Weg benutzt. Gestern versehentlich auch einen Wegweiser. Er hat sich wacker geschlagen.',
      'Ein ehrlicher Zweikampf, bis einer aufgibt! Vorzugsweise Ihr.'],
    optFight: 'Angenommen.',
    optLeave: 'Heute nicht, Herr Ritter.',
    fight: '„En garde! … So sagt man doch?“',
    yield: '„Genug! Ich ergebe mich – in aller Form und mit Würde. Ihr kämpft gut. Besser als der Wegweiser.“',
    lose: '„Ha! Unbesiegt seit … heute. Nehmt es nicht schwer, ich erzähle es nur jedem.“',
    leave: '„Dann eben nicht. Ich warte hier. Der Wegweiser kommt bestimmt wieder.“',
  },
};
