/**
 * Expeditionen (ab 0.9): die großen Dungeons des Spiels – je Region eine mehrteilige Karte aus Abschnitten.
 * Leitlinie: docs/ROADMAP.md, Abschnitt 5. Gemeinsame Namen (Schwierigkeitsgrade, DungeonRecord): shared/src/data/hub.ts.
 *
 * Diese Datei enthält nur Daten und reine Regeln, die Server und Oberfläche gemeinsam benutzen:
 *   EXPEDITION_LIST   – je Expedition der handgeschriebene Abschnittsplan (Reihenfolge, Formen, Übergänge, Inhalte)
 *   EXP_DIFF          – was ein Schwierigkeitsgrad verändert (nicht nur Leben: Affixe, Wut, Zusatzgegner, Aufgaben, Beute)
 *   expUnlock         – Freischaltung (Hauptgeschichte, Bosse, Stufe, Gegenstände, Entdeckungen) mit Text für die Anzeige
 *   weeklyChallenge   – wöchentliche Herausforderung, deterministisch aus der ISO-Woche
 * Die Karte erzeugt shared/src/maps/expedition.ts aus dem Abschnittsplan, der Server lebt in server/src/expedition/.
 */
import { CFG, RARITY_NAME } from '../config';
import type { CharData, Element } from '../types';
import { condOk, type Cond } from './cond';
import { DIFFICULTIES, DIFFICULTY_NAME, type Difficulty, type DungeonRecord } from './hub';
import type { ZoneDef } from './zones';
import type { BiomeId } from '../maps/tiles';

// =====================================================================================================================
//  Abschnittsplan
// =====================================================================================================================
/** Form eines Abschnitts: große Halle, langer Gang, Höhle (organisch), kleine Kammer, Grotte (wie draußen, mit Wasser), Arena */
export type SectionShape = 'hall' | 'corridor' | 'cavern' | 'chamber' | 'grotto' | 'arena';
/** Was im Abschnitt passiert */
export type SectionRole = 'entrance' | 'explore' | 'combat' | 'trap' | 'puzzle' | 'mini' | 'elite' | 'event' | 'key' | 'prep' | 'boss' | 'reward' | 'treasure';
/** Übergang vom vorigen Abschnitt: Treppe, Brücke über einen Abgrund, Tor, enger Stollen, verschlossene Tür (Schlüssel), geheime Wand */
export type Transition = 'stairs' | 'bridge' | 'gate' | 'tunnel' | 'locked' | 'secret';
export type TrapKind = 'spikes' | 'turrets' | 'poison' | 'collapse';
/** Rätsel: Fackeln (Reihenfolge), Hebel (Muster), Platten (gleichzeitig), Runenscheiben (neu: drehen, bis das Bild stimmt) */
export type PuzzleKind = 'torches' | 'levers' | 'plates' | 'runes';
/** besonderes Ereignis je Expedition */
export type ExpEvent = 'ambush' | 'collapse' | 'darkness' | 'flood';

export interface SectionDef {
  id: string;
  name: string;
  shape: SectionShape;
  role: SectionRole;
  /** Übergang vom vorigen Abschnitt (beim ersten Abschnitt ohne Bedeutung) */
  via?: Transition;
  /** 1 = zweite Hälfte: andere Einrichtung und Gegnermischung */
  look?: 0 | 1;
  /** Gegnergruppen und davon von Erwachten angeführte */
  groups?: number; elites?: number;
  traps?: TrapKind[];
  puzzle?: PuzzleKind;
  /** Mini-Boss (MINIS) */
  mini?: string;
  /** enthält die Schlüsseltruhe */
  key?: boolean;
  event?: ExpEvent;
  /** seltene Abbaustellen, verborgenes Ausrüstungsversteck, Inschrift (Lore-Stelle) */
  nodes?: number; cache?: boolean; lore?: string;
  /** optionale Flügel, die von hier abzweigen */
  side?: SectionDef[];
  /** Schatzkammer hinter einer geheimen Wand */
  secret?: SectionDef;
}

/** Mini-Boss: vorhandenes Gegner-Sprite, eingefärbt und vergrößert, mit 2–3 eigenen Mustern */
export type MiniPattern = 'stomp' | 'ring' | 'rain' | 'lines' | 'adds' | 'charge' | 'pools';
export interface MiniDef {
  id: string; name: string; title: string;
  /** Gegnerart, deren Sprite benutzt wird */
  sprite: string; tint: number; scale: number;
  element: Element;
  hpMul: number; dmgMul: number; defMul: number; speed: number; radius: number;
  ai: 'chase' | 'ranged' | 'charge' | 'caster' | 'blink';
  pattern: MiniPattern[];
  /** Sekunden zwischen zwei Mustern */
  every: number;
  adds?: string[];
  intro: string;
}

export interface ExpeditionDef {
  id: string;
  name: string; subtitle: string;
  /** Region (Biom) und Oberwelt, in der der Eingang liegt */
  region: BiomeId; parent: string;
  /** alter Story-Dungeon dieser Region: sein Eingang führt jetzt hierher, seine Chronik-Dokumente liegen hier */
  legacy?: string;
  boss: string;
  /** Gegnerstufen vom Eingang bis zur Arena · empfohlene Stufe */
  level: [number, number]; rec: number;
  seed: number;
  /** Kurzbeschreibung (Auswahlfenster) und Einleitung (Schild am Eingang, Ansage beim Betreten) */
  desc: string; intro: string;
  /** Gegnermischung der ersten und der zweiten Hälfte */
  mobs: [[string, number][], [string, number][]];
  sections: SectionDef[];
  event: ExpEvent;
  /** Bossarena: Form der Hindernisse (Säulen, Lavarinnen, Eisfelder …) */
  arena: 'roots' | 'crystals' | 'lava' | 'ice' | 'grid' | 'void';
  /** Freischaltung (alle Bedingungen müssen zutreffen) */
  unlock: ExpReq[];
  /** geheime Expedition: steht erst in der Liste, wenn sie entdeckt ist */
  secret?: boolean;
  /** seltene Beute nur aus dieser Expedition (Gegenstand) */
  rare: string;
  dark: number;
  mapPos: [number, number];
}

/** Eine Freischaltbedingung mit Anzeige. Erfüllt, wenn `cond` zutrifft, die Stufe reicht und der Gegenstand im Rucksack liegt. */
export interface ExpReq { text: string; cond?: Cond; level?: number; item?: string }

// =====================================================================================================================
//  Zahlen
// =====================================================================================================================
export const EXP_CFG = {
  /** Erfahrung je gewöhnlichem Gegner in Expeditionen (die Expedition ist lang – die Geschichte soll nicht davonlaufen) */
  mobXp: 0.55,
  /** Abschluss: Erfahrung und Gold als Vielfaches der Boss-Werte; Wiederholungen bringen weniger */
  clearXp: 1.6, clearGold: 1.4, repeatMul: 0.55,
  /** Beute des Abschlusses: Teile, Rohstoffe der Region, Chance auf Legendär (zusätzlich zum Raritätswurf) */
  gear: 2, mats: [3, 6] as [number, number], legendary: 0.04, rare: 0.12,
  /** Wöchentliche Herausforderung: Faktor auf Erfahrung und Gold, zusätzliche Teile */
  weeklyMul: 1.5, weeklyGear: 2,
  /** Rückkehr: Sekunden bis zur gemeinsamen Rückkehr nach dem Abschluss, Pause vor der Statistik */
  returnSec: 60, revealSec: 3.2,
  /** Leere Instanz wird nach dieser Zeit verworfen (länger als ein Dungeon: Wiederverbindung) */
  emptySec: 300,
  /** Bereitschaftsprüfung verfällt nach so vielen Sekunden */
  lobbySec: 120,
  /** Kontrollpunkt: Heilung beim Rasten */
  checkpointHeal: 1,
  /** Bossphasen: Übergänge bei diesen Lebensanteilen (statt 66 % / 33 % der alten Dungeons) */
  phases: [0.6, 0.25] as [number, number],
  /** so viele Lauf-Schlüssel merkt sich ein Charakter (Schutz vor doppelter Belohnung) */
  keepRuns: 40,
} as const;

/** Was ein Schwierigkeitsgrad verändert. Faktoren wirken auf die Werte der Normal-Stufe. */
export interface DiffDef {
  id: Difficulty;
  /** Stufenaufschlag der Gegner · mindestens diese Stufe */
  lvlPlus: number; lvlMin: number;
  hpMul: number; dmgMul: number;
  /** Anteil Erwachter und Zahl der Affixe je Erwachtem */
  elite: number; affixes: number;
  /** Zusätzliche Gegner je Gruppe (Chance) */
  extra: number;
  /** Boss: zusätzlicher Angriff, Wut nach so vielen Sekunden (0 = nie), zusätzliche Helfer je Phase, Signaturmechanik öfter */
  bossExtra: boolean; enrage: number; bossAdds: number; sigFaster: number;
  /** Zusatzaufgaben: Truhe ohne Tod, Truhe unter der Richtzeit */
  noDeathChest: boolean; timedChest: boolean;
  /** Belohnung: Raritätsgewichte (wird auf RARITY_NAME.length gebracht), Gegenstandsstufe +, Faktor auf Erfahrung/Gold */
  rarity: number[]; ilvlPlus: number; rewardMul: number;
  /** Freischaltung (Text) */
  unlockText: string;
  desc: string;
}
export const EXP_DIFF: Record<Difficulty, DiffDef> = {
  normal: { id: 'normal', lvlPlus: 0, lvlMin: 0, hpMul: 1, dmgMul: 1, elite: 0.06, affixes: 0, extra: 0, bossExtra: false, enrage: 0, bossAdds: 0, sigFaster: 1,
    noDeathChest: false, timedChest: false, rarity: [10, 40, 35, 13, 2], ilvlPlus: 0, rewardMul: 1, unlockText: 'Von Anfang an.',
    desc: 'Die Expedition, wie die Geschichte sie kennt.' },
  schwer: { id: 'schwer', lvlPlus: 3, lvlMin: 0, hpMul: 1.4, dmgMul: 1.25, elite: 0.12, affixes: 1, extra: 0.25, bossExtra: true, enrage: 0, bossAdds: 0, sigFaster: 1,
    noDeathChest: true, timedChest: false, rarity: [0, 20, 45, 28, 7], ilvlPlus: 3, rewardMul: 1.5, unlockText: 'Nach einem Abschluss auf Normal.',
    desc: 'Erwachte mit einem Affix, mehr Gegner je Gruppe, der Boss kennt einen Angriff mehr. Truhe für einen Lauf ohne Tod.' },
  albtraum: { id: 'albtraum', lvlPlus: 6, lvlMin: 42, hpMul: 2.1, dmgMul: 1.55, elite: 0.18, affixes: 2, extra: 0.4, bossExtra: true, enrage: 300, bossAdds: 2, sigFaster: 1.25,
    noDeathChest: true, timedChest: true, rarity: [0, 0, 35, 45, 20], ilvlPlus: 6, rewardMul: 2.2, unlockText: 'Ab Stufe 40, nach einem Abschluss auf Schwer.',
    desc: 'Erwachte mit zwei Affixen, Helfer in jeder Bossphase, der Boss wird nach fünf Minuten wütend. Zusätzlich eine Truhe unter der Richtzeit.' },
  mythisch: { id: 'mythisch', lvlPlus: 9, lvlMin: 45, hpMul: 3, dmgMul: 1.9, elite: 0.26, affixes: 3, extra: 0.55, bossExtra: true, enrage: 220, bossAdds: 3, sigFaster: 1.6,
    noDeathChest: true, timedChest: true, rarity: [0, 0, 15, 45, 40], ilvlPlus: 9, rewardMul: 3, unlockText: 'Nach einem Abschluss auf Albtraum.',
    desc: 'Drei Affixe, Wut nach knapp vier Minuten, die Signatur des Bosses kommt deutlich öfter. Die beste Beute – bis zur höchsten Seltenheit.' },
};
/** Raritätsgewichte eines Schwierigkeitsgrads, auf die Zahl der Seltenheiten gebracht (eine neue höchste Seltenheit erbt das Gewicht der bisher höchsten, aber kleiner). */
export function diffRarity(d: Difficulty): number[] {
  const base = EXP_DIFF[d].rarity, n = RARITY_NAME.length, out: number[] = [];
  for (let i = 0; i < n; i++) out.push(i < base.length ? base[i] : 0);
  if (n > base.length) { const top = base[base.length - 1]; out[n - 1] = d === 'mythisch' ? top * 0.5 : d === 'albtraum' ? top * 0.15 : 0; }
  return out;
}
/** höchste Seltenheit, die es gibt (Equipment liefert ggf. „Mythisch“) */
export const TOP_RARITY = () => RARITY_NAME.length - 1;

/** Affixe Erwachter in höheren Schwierigkeitsgraden */
export type EliteAffix = 'gepanzert' | 'eilig' | 'brennend' | 'teilend' | 'heilend';
export const ELITE_AFFIX: Record<EliteAffix, { name: string; desc: string }> = {
  gepanzert: { name: 'Gepanzert', desc: 'nimmt deutlich weniger Schaden' },
  eilig: { name: 'Eilig', desc: 'läuft und schlägt schneller' },
  brennend: { name: 'Brennend', desc: 'hinterlässt beim Tod einen brennenden Kreis' },
  teilend: { name: 'Teilend', desc: 'zerfällt beim Tod in zwei kleinere' },
  heilend: { name: 'Heilend', desc: 'heilt Verbündete in der Nähe' },
};
export const ELITE_AFFIXES = Object.keys(ELITE_AFFIX) as EliteAffix[];

// =====================================================================================================================
//  Mini-Bosse
// =====================================================================================================================
const M = (m: MiniDef) => m;
export const MINI_LIST: MiniDef[] = [
  // ---- Grünwald
  M({ id: 'xm_borkenmutter', name: 'Borkenmutter', title: 'Die ältere Schwester', sprite: 'wurzelschleicher', tint: 0xc89a60, scale: 2.1, element: 'earth',
    hpMul: 13, dmgMul: 1.35, defMul: 1.4, speed: 40, radius: 13, ai: 'chase', pattern: ['stomp', 'adds', 'rain'], every: 4.2, adds: ['moosling', 'wurzelschleicher'],
    intro: '„Die Kleine da unten hält sich für die Mutter von allem. Ich war vorher da.“' }),
  M({ id: 'xm_sporenkoenig', name: 'Sporenkönig Pfifferling', title: 'Herr des Pilzhains', sprite: 'pilzling', tint: 0xffb060, scale: 2.2, element: 'earth',
    hpMul: 10, dmgMul: 1.3, defMul: 0.9, speed: 30, radius: 12, ai: 'ranged', pattern: ['ring', 'pools', 'lines'], every: 3.6,
    intro: 'Ein Pilz mit Krone. Die Krone ist auch ein Pilz.' }),
  // ---- Kristallhöhlen
  M({ id: 'xm_glasmaul', name: 'Glasmaul', title: 'Der hungrige Spiegel', sprite: 'kristallkrabbler', tint: 0xb0e8ff, scale: 2.2, element: 'light',
    hpMul: 13, dmgMul: 1.35, defMul: 2, speed: 40, radius: 13, ai: 'charge', pattern: ['charge', 'ring', 'stomp'], every: 4,
    intro: 'Es frisst Licht. Deines sieht lecker aus.' }),
  M({ id: 'xm_glimmerkoenigin', name: 'Glimmerkönigin', title: 'Die singende Kuppel', sprite: 'glimmerwisp', tint: 0xffe0ff, scale: 2.4, element: 'light',
    hpMul: 9, dmgMul: 1.35, defMul: 0.8, speed: 50, radius: 11, ai: 'blink', pattern: ['lines', 'adds', 'ring'], every: 3.4, adds: ['glimmerwisp'],
    intro: 'Hedda sagt, wenn man sie singen hört, ist es schon zu spät. Hedda übertreibt gern. Diesmal nicht.' }),
  // ---- Glutlande
  M({ id: 'xm_schlackenvogt', name: 'Schlackenvogt', title: 'Aufseher der Gussrinnen', sprite: 'schlackengolem', tint: 0xff8040, scale: 1.7, element: 'fire',
    hpMul: 14, dmgMul: 1.4, defMul: 1.8, speed: 34, radius: 15, ai: 'chase', pattern: ['stomp', 'pools', 'rain'], every: 4.4,
    intro: '„Wer hier gießt, hat einen Passierschein. Hast du einen Passierschein?“' }),
  M({ id: 'xm_aschenrudel', name: 'Mutter Asche', title: 'Leittier der Aschenhunde', sprite: 'aschenhund', tint: 0x705050, scale: 1.9, element: 'fire',
    hpMul: 11, dmgMul: 1.4, defMul: 1, speed: 70, radius: 12, ai: 'charge', pattern: ['charge', 'adds', 'ring'], every: 3.8, adds: ['aschenhund'],
    intro: 'Sie bellt nicht. Sie hat Leute dafür.' }),
  // ---- Frostgebirge
  M({ id: 'xm_reifriese', name: 'Reifriese Hjalmar', title: 'Der Türsteher des Doms', sprite: 'schneebrute', tint: 0xc8e8ff, scale: 1.8, element: 'water',
    hpMul: 15, dmgMul: 1.4, defMul: 1.8, speed: 38, radius: 15, ai: 'charge', pattern: ['stomp', 'charge', 'rain'], every: 4.2,
    intro: '„Ysolde empfängt heute nicht. Ysolde empfängt nie. Geh.“' }),
  M({ id: 'xm_nordlicht', name: 'Die Weiße Wache', title: 'Wisp aus gewebtem Eis', sprite: 'frostwisp', tint: 0xe8ffff, scale: 2.3, element: 'water',
    hpMul: 10, dmgMul: 1.35, defMul: 0.9, speed: 60, radius: 11, ai: 'blink', pattern: ['lines', 'ring', 'pools'], every: 3.4,
    intro: 'Ein Muster, das sich selbst zu Ende gewebt hat.' }),
  // ---- Verlorene Ruinen
  M({ id: 'xm_kustos', name: 'Kustos Vierzehn', title: 'Unterarchivar mit Stempel', sprite: 'runenwaechter', tint: 0xd8c890, scale: 1.6, element: 'wind',
    hpMul: 15, dmgMul: 1.4, defMul: 2, speed: 34, radius: 15, ai: 'chase', pattern: ['lines', 'stomp', 'adds'], every: 4.2, adds: ['arkanauge'],
    intro: '„Antrag auf Durchgang: abgelehnt. Antrag auf Ablehnung des Antrags: ebenfalls abgelehnt.“' }),
  M({ id: 'xm_klageweib', name: 'Die Fußnote', title: 'Ein Geist, den niemand zitiert', sprite: 'fluchgeist', tint: 0xa0c8ff, scale: 2, element: 'dark',
    hpMul: 10, dmgMul: 1.4, defMul: 0.9, speed: 56, radius: 11, ai: 'blink', pattern: ['ring', 'rain', 'pools'], every: 3.5,
    intro: 'Sie steht ganz unten auf jeder Seite. Heute steht sie dir im Weg.' }),
  // ---- Schattenreich
  M({ id: 'xm_kronenritter', name: 'Ritter ohne Krone', title: 'Morvains letzter Getreuer', sprite: 'hohlritter', tint: 0xd0b0ff, scale: 1.6, element: 'dark',
    hpMul: 15, dmgMul: 1.45, defMul: 2, speed: 48, radius: 14, ai: 'charge', pattern: ['charge', 'lines', 'stomp'], every: 4,
    intro: '„Mein König schläft. Ich habe versprochen, dass ihn niemand weckt. Ich halte Versprechen. Das ist alles, was ich halte.“' }),
  M({ id: 'xm_mahrkoenigin', name: 'Die Mahrkönigin', title: 'Mutter der Albträume', sprite: 'nachtmahr', tint: 0xff90c0, scale: 1.7, element: 'dark',
    hpMul: 11, dmgMul: 1.4, defMul: 1, speed: 90, radius: 13, ai: 'charge', pattern: ['adds', 'ring', 'rain'], every: 3.6, adds: ['leerenbrut'],
    intro: 'Sie träumt dich gerade. Es ist kein schöner Traum.' }),
];
export const MINIS: Record<string, MiniDef> = Object.fromEntries(MINI_LIST.map(m => [m.id, m]));

// =====================================================================================================================
//  Die Expeditionen
// =====================================================================================================================
const X = (x: ExpeditionDef) => x;
const S = (s: SectionDef) => s;
const mq = (id: string, text: string): ExpReq => ({ text, cond: { any: [{ started: id }, { done: id }] } });
const boss = (id: string, name: string): ExpReq => ({ text: `${name} besiegt`, cond: { flag: 'b:' + id } });

export const EXPEDITION_LIST: ExpeditionDef[] = [
  // =================================================================== GRÜNWALD
  X({
    id: 'exp_gruenwald', name: 'Die Wurzeltiefe', subtitle: 'Unter dem ältesten Baum ist noch ein Baum', region: 'gruenwald', parent: 'gruenwald', legacy: 'wurzelgruft',
    boss: 'dornenmutter', level: [4, 7], rec: 5, seed: 91101, dark: 0.55, mapPos: [28, 50], event: 'ambush', arena: 'roots', rare: 'xr_wurzelherz',
    desc: 'Die Wurzelgruft war nur das Dach. Darunter: ein Pilzhain, eine Halle der alten Wächter, die Tiefe Gruft – und ganz unten die Dornenmutter in ihrem Wurzelherz.',
    intro: 'Eingeritzt in die Rinde: „Die Mutter schläft unten. Weck sie nicht mit Feuer – weck sie gar nicht.“ Darunter, frischer: „Zu spät. – B.“',
    mobs: [[['moosling', 4], ['pilzling', 3], ['dornkaefer', 2.5], ['waldwolf', 1.5], ['wurzelschleicher', 2]],
      [['wurzelschleicher', 5], ['dornkaefer', 3], ['pilzling', 2], ['fledermaus', 1.5]]],
    unlock: [{ text: 'Den Grünwald betreten', cond: { flag: 'z:gruenwald' } }, mq('m_wurzel', 'Hauptquest „Was unter dem Baum schläft“ angenommen')],
    sections: [
      S({ id: 'tor', name: 'Das Wurzeltor', shape: 'chamber', role: 'entrance' }),
      S({ id: 'moosgang', name: 'Moosgang', shape: 'corridor', role: 'explore', via: 'stairs', groups: 2, nodes: 1, lore: 'Kratzspuren an der Wand. Jemand hat hier Tage gezählt und irgendwann aufgehört.' }),
      S({ id: 'pilzhain', name: 'Der Pilzhain', shape: 'grotto', role: 'explore', via: 'tunnel', groups: 3, nodes: 2,
        side: [S({ id: 'sporenhof', name: 'Sporenhof', shape: 'cavern', role: 'mini', via: 'gate', mini: 'xm_sporenkoenig', groups: 1 })] }),
      S({ id: 'waechterhalle', name: 'Halle der Wurzelwächter', shape: 'hall', role: 'combat', via: 'gate', groups: 5, elites: 1,
        secret: S({ id: 'gruftschatz', name: 'Vergessene Schatzkammer', shape: 'chamber', role: 'treasure', via: 'secret', cache: true, lore: 'Ein Brief, nie abgeschickt: „Liebe Mirelda, ich habe den Schlüssel unter die Wurzel gelegt, wie du gesagt hast. Wenn du das liest, war ich zu neugierig. – Aldo“' }) }),
      S({ id: 'dornengang', name: 'Der Dornengang', shape: 'corridor', role: 'trap', via: 'gate', groups: 1, traps: ['spikes', 'poison', 'turrets'] }),
      S({ id: 'schluesselgrab', name: 'Grab des Gärtners', shape: 'chamber', role: 'key', via: 'tunnel', groups: 1, elites: 1, key: true }),
      S({ id: 'fackelkreis', name: 'Der Fackelkreis', shape: 'chamber', role: 'puzzle', via: 'gate', puzzle: 'torches' }),
      S({ id: 'abstieg', name: 'Die Wurzeltreppe', shape: 'corridor', role: 'combat', via: 'stairs', groups: 2, look: 1 }),
      S({ id: 'tiefe', name: 'Die Tiefe Gruft', shape: 'cavern', role: 'event', via: 'locked', event: 'ambush', look: 1, groups: 1,
        side: [S({ id: 'borkenhof', name: 'Hof der Borkenmutter', shape: 'hall', role: 'mini', via: 'gate', mini: 'xm_borkenmutter', look: 1, groups: 1 })] }),
      S({ id: 'runenbruecke', name: 'Brücke über den Wurzelbach', shape: 'corridor', role: 'puzzle', via: 'bridge', puzzle: 'runes', look: 1, groups: 1 }),
      S({ id: 'dornensaal', name: 'Saal der Erwachten', shape: 'hall', role: 'elite', via: 'gate', groups: 4, elites: 2, look: 1, nodes: 1 }),
      S({ id: 'rast', name: 'Letzte Rast', shape: 'chamber', role: 'prep', via: 'tunnel', look: 1 }),
      S({ id: 'wurzelherz', name: 'Das Wurzelherz', shape: 'arena', role: 'boss', via: 'gate', look: 1 }),
      S({ id: 'bluetenkammer', name: 'Blütenkammer', shape: 'chamber', role: 'reward', via: 'gate', look: 1 }),
    ],
  }),
];
export const EXPEDITIONS: Record<string, ExpeditionDef> = Object.fromEntries(EXPEDITION_LIST.map(x => [x.id, x]));
/** alter Dungeon → Expedition, die seinen Eingang übernimmt */
export const EXP_BY_LEGACY: Record<string, string> = Object.fromEntries(EXPEDITION_LIST.filter(x => x.legacy).map(x => [x.legacy!, x.id]));
export const isExpedition = (zoneId: string | undefined) => !!zoneId && !!EXPEDITIONS[zoneId];

/** Zonen der Expeditionen. Bewusst NICHT in ZONE_LIST (keine Weltkarte, keine Weltsysteme), aber über ZONES/getMap erreichbar. */
export function expZoneDef(x: ExpeditionDef): ZoneDef {
  return {
    id: x.id, name: x.name, subtitle: x.subtitle, biome: x.region, kind: 'dungeon', w: 0, h: 0, seed: x.seed, level: x.level,
    music: 'dungeon', ambience: 'dungeon', weathers: [[x.region === 'glut' ? 'embers' : x.region === 'frost' ? 'snow' : x.region === 'schatten' ? 'void' : x.region === 'gruenwald' ? 'spores' : 'motes', 1]],
    dark: x.dark, indoor: true, parent: x.parent, boss: x.boss, mobs: x.mobs[0], mapPos: x.mapPos, exp: x.id,
  };
}
export const EXPEDITION_ZONES: ZoneDef[] = EXPEDITION_LIST.map(expZoneDef);

// =====================================================================================================================
//  Freischaltung
// =====================================================================================================================
export interface ReqState { text: string; ok: boolean }
export function reqOk(c: CharData, r: ExpReq): boolean {
  if (r.level !== undefined && c.level < r.level) return false;
  if (r.item && !c.inv.some(i => i.base === r.item)) return false;
  return condOk(c, r.cond);
}
/** Ist die Expedition (auf Normal) freigeschaltet? Mit Begründung je Bedingung für die Anzeige. */
export function expUnlock(c: CharData, id: string): { ok: boolean; reqs: ReqState[]; visible: boolean } {
  const x = EXPEDITIONS[id];
  if (!x) return { ok: false, reqs: [], visible: false };
  const reqs = x.unlock.map(r => ({ text: r.text, ok: reqOk(c, r) }));
  const ok = reqs.every(r => r.ok);
  return { ok, reqs, visible: !x.secret || ok || !!c.flags[secretFlag(id)] };
}
export const secretFlag = (id: string) => 'xs:' + id;
/** Schwierigkeitsgrad freigeschaltet? Rückgabe: Ablehnungsgrund oder null */
export function diffBlock(c: CharData, id: string, d: Difficulty): string | null {
  if (!expUnlock(c, id).ok) return 'Diese Expedition ist noch nicht freigeschaltet.';
  const r = c.expeditions?.[id], cl = (k: Difficulty) => (r?.clears?.[k] ?? 0) > 0;
  if (d === 'normal') return null;
  if (d === 'schwer') return cl('normal') ? null : 'Erst nach einem Abschluss auf Normal.';
  if (d === 'albtraum') return c.level < CFG.player.maxLevel ? `Erst ab Stufe ${CFG.player.maxLevel}.` : cl('schwer') ? null : 'Erst nach einem Abschluss auf Schwer.';
  return cl('albtraum') ? null : 'Erst nach einem Abschluss auf Albtraum.';
}

// =====================================================================================================================
//  Fortschritt (CharData.expeditions) und Schutz vor doppelter Belohnung (CharData.expRuns)
// =====================================================================================================================
export function expRecord(c: CharData, id: string): DungeonRecord {
  const all = (c.expeditions ??= {});
  return (all[id] ??= { clears: {} });
}
export function totalClears(r: DungeonRecord | undefined): number { let n = 0; for (const d of DIFFICULTIES) n += r?.clears?.[d] ?? 0; return n; }
/** Bereinigt die Expeditionsfelder eines geladenen Spielstands (unbekannte Werte fallen weg; alte Stände haben die Felder nicht). */
export function sanitizeExp(c: CharData) {
  const num = (v: any, max = 1e9) => (typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0);
  if (c.expeditions !== undefined) {
    const out: Record<string, DungeonRecord> = {};
    const raw: any = c.expeditions && typeof c.expeditions === 'object' ? c.expeditions : {};
    for (const id in raw) {
      const r = raw[id];
      if (!r || typeof r !== 'object' || typeof id !== 'string' || id.length > 40) continue;
      const rec: DungeonRecord = { clears: {} };
      for (const d of DIFFICULTIES) { const n = num(r.clears?.[d]); if (n) rec.clears[d] = n; const b = num(r.best?.[d], 1e7); if (b) (rec.best ??= {})[d] = b; }
      if (Array.isArray(r.secrets)) rec.secrets = [...new Set(r.secrets.filter((s: any) => typeof s === 'string' && s.length < 40))].slice(0, 40) as string[];
      if (Array.isArray(r.minis)) rec.minis = [...new Set(r.minis.filter((s: any) => typeof s === 'string' && s.length < 40))].slice(0, 40) as string[];
      if (num(r.first, 1e15)) rec.first = num(r.first, 1e15);
      out[id] = rec;
    }
    c.expeditions = out;
  }
  if (c.expRuns !== undefined) c.expRuns = (Array.isArray(c.expRuns) ? c.expRuns.filter(k => typeof k === 'string' && k.length < 64) : []).slice(-EXP_CFG.keepRuns);
}

// =====================================================================================================================
//  Wöchentliche Herausforderung
// =====================================================================================================================
export type WeeklyMod = 'horde' | 'erwacht' | 'glas' | 'versiegt' | 'hast' | 'finster';
export const WEEKLY_MOD: Record<WeeklyMod, { name: string; desc: string }> = {
  horde: { name: 'Horde', desc: 'Jede Gruppe hat zwei Gegner mehr.' },
  erwacht: { name: 'Erwacht', desc: 'Doppelt so viele Erwachte.' },
  glas: { name: 'Glaskanone', desc: 'Du teilst mehr aus und steckst schlechter ein: Abklingzeiten −20 %, erlittener Schaden +30 %.' },
  versiegt: { name: 'Versiegt', desc: 'Heilung wirkt nur zu 60 %.' },
  hast: { name: 'Hast', desc: 'Gegner laufen und schlagen schneller.' },
  finster: { name: 'Finsternis', desc: 'Gegner bemerken dich später – aber du siehst auch weniger.' },
};
export const WEEKLY_MODS = Object.keys(WEEKLY_MOD) as WeeklyMod[];
/** ISO-Woche als Schlüssel „JJJJ-WW“ (Montag beginnt die Woche, Zeitzone UTC) */
export function isoWeek(ms: number): string {
  const d = new Date(ms);
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-${String(wk).padStart(2, '0')}`;
}
function hashStr(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export interface Weekly { week: string; exp: string; diff: Difficulty; mods: WeeklyMod[] }
/** Die Herausforderung einer Woche: eine (nicht geheime) Expedition, ein Schwierigkeitsgrad (Normal oder Schwer) und zwei Modifikatoren. */
export function weeklyChallenge(week: string): Weekly {
  const pool = EXPEDITION_LIST.filter(x => !x.secret);
  const h = hashStr('woche:' + week);
  const exp = pool[h % pool.length].id;
  const diff: Difficulty = (h >>> 8) % 3 === 0 ? 'schwer' : 'normal';
  const a = (h >>> 12) % WEEKLY_MODS.length;
  let b = (h >>> 18) % (WEEKLY_MODS.length - 1); if (b >= a) b++;
  return { week, exp, diff, mods: [WEEKLY_MODS[a], WEEKLY_MODS[b]] };
}
export const weeklyFlag = (week: string) => 'xw:' + week;

// =====================================================================================================================
//  Anzeige
// =====================================================================================================================
export function fmtSec(sec: number): string { const s = Math.max(0, Math.floor(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
export { DIFFICULTIES, DIFFICULTY_NAME };
/** Richtzeit (Sekunden) für die Zeittruhe – aus der Länge des Plans */
export function expPar(x: ExpeditionDef): number {
  let n = 0;
  const walk = (s: SectionDef) => { n += s.role === 'boss' ? 180 : s.role === 'reward' ? 0 : 50 + (s.groups ?? 0) * 25; for (const w of s.side ?? []) walk(w); };
  for (const s of x.sections) walk(s);
  return Math.round(n);
}
