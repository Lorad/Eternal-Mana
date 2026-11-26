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
import { rarityTable } from '../rarity';
import type { CharData, Element } from '../types';
import { condOk, type Cond } from './cond';
import { DIFFICULTIES, DIFFICULTY_NAME, type Difficulty, type DungeonRecord } from './hub';
import type { ZoneDef } from './zones';
import type { BiomeId } from '../maps/tiles';
import { ENDGAME_LIST, ENDGAME_MINIS } from './expeditions_endgame';

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
  /** Spur zu einer geheimen Expedition (wer sie berührt, hat sie entdeckt) */
  discover?: string;
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
  /** Endboss unter anderem Namen und mit eigener Farbe (gleiche Muster wie `boss`) */
  bossName?: string; bossTint?: number;
  /** seltene Beute nur aus dieser Expedition (Gegenstand) */
  rare: string;
  dark: number;
  mapPos: [number, number];
  /** 0.11: Endspiel-Expedition (Stufe 40, Bosse aus Akt II): eigene Belohnung, nicht in der Wochen-Herausforderung */
  endgame?: boolean;
  /** 0.11: alter Dungeon, an dem sich die Erfahrung der Gegner bemisst, ohne dessen Eingang zu übernehmen (Endspiel) */
  xpRef?: string;
}

/** Eine Freischaltbedingung mit Anzeige. Erfüllt, wenn `cond` zutrifft, die Stufe reicht und der Gegenstand im Rucksack liegt. */
export interface ExpReq { text: string; cond?: Cond; level?: number; item?: string; /** 0.11: diese Expedition mindestens einmal abgeschlossen */ exp?: string }

// =====================================================================================================================
//  Zahlen
// =====================================================================================================================
export const EXP_CFG = {
  /** Erfahrung aus gewöhnlichen Gegnern: alle Gegner einer Expedition zusammen bringen so viel wie die des alten Dungeons
   *  ihrer Region mal diesen Faktor (die Expedition ist zehnmal so lang – die Geschichte soll trotzdem nicht davonlaufen).
   *  0.11: 2 → 1,25 und Abschluss 1,2 → 1,0 – ein erster Abschluss auf Normal bringt bei empfohlener Stufe knapp zwei Stufen,
   *  mit Nebenaufgaben steht man am Endboss 0 bis 2 Stufen über ihm (Tempo-Test: tests/balance.test.ts, docs/GAME_DESIGN.md) */
  mobXpVsOld: 1.25,
  /** 0.11: Gold, das gewöhnliche Gegner in Expeditionen fallen lassen (dreihundert Gegner statt zwanzig – sonst druckt die
   *  Expedition Gold; mit 0,6 bringt Akt I rund die Hälfte mehr als bis 0.8, weil zehn Plätze doppelt so viel Verbessern kosten) */
  mobGold: 0.6,
  /** Faktor auf die Gegnergruppen jedes Abschnitts (Feinabstimmung der Spieldauer, gemessen mit scripts/exp-playtest.ts) */
  groupMul: 1.8,
  /** Abschluss: Erfahrung und Gold als Vielfaches der Boss-Werte; Wiederholungen bringen weniger */
  clearXp: 1, clearGold: 1.4, repeatMul: 0.55,
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
  normal: { id: 'normal', lvlPlus: 0, lvlMin: 0, hpMul: 1.25, dmgMul: 1, elite: 0.06, affixes: 0, extra: 0, bossExtra: false, enrage: 0, bossAdds: 0, sigFaster: 1,
    noDeathChest: false, timedChest: false, rarity: [10, 40, 35, 13, 2], ilvlPlus: 0, rewardMul: 1, unlockText: 'Von Anfang an.',
    desc: 'Die Expedition, wie die Geschichte sie kennt.' },
  schwer: { id: 'schwer', lvlPlus: 3, lvlMin: 0, hpMul: 1.75, dmgMul: 1.25, elite: 0.12, affixes: 1, extra: 0.25, bossExtra: true, enrage: 0, bossAdds: 0, sigFaster: 1,
    noDeathChest: true, timedChest: false, rarity: [0, 20, 45, 28, 7], ilvlPlus: 3, rewardMul: 1.5, unlockText: 'Nach einem Abschluss auf Normal.',
    desc: 'Erwachte mit einem Affix, mehr Gegner je Gruppe, der Boss kennt einen Angriff mehr. Truhe für einen Lauf ohne Tod.' },
  albtraum: { id: 'albtraum', lvlPlus: 6, lvlMin: 42, hpMul: 2.6, dmgMul: 1.55, elite: 0.18, affixes: 2, extra: 0.4, bossExtra: true, enrage: 300, bossAdds: 2, sigFaster: 1.25,
    noDeathChest: true, timedChest: true, rarity: [0, 0, 35, 45, 20], ilvlPlus: 6, rewardMul: 2.2, unlockText: 'Ab Stufe 40, nach einem Abschluss auf Schwer.',
    desc: 'Erwachte mit zwei Affixen, Helfer in jeder Bossphase, der Boss wird nach fünf Minuten wütend. Zusätzlich eine Truhe unter der Richtzeit.' },
  mythisch: { id: 'mythisch', lvlPlus: 9, lvlMin: 45, hpMul: 3.75, dmgMul: 1.9, elite: 0.26, affixes: 3, extra: 0.55, bossExtra: true, enrage: 220, bossAdds: 3, sigFaster: 1.6,
    noDeathChest: true, timedChest: true, rarity: [0, 0, 15, 45, 40], ilvlPlus: 9, rewardMul: 3, unlockText: 'Nach einem Abschluss auf Albtraum.',
    desc: 'Drei Affixe, Wut nach knapp vier Minuten, die Signatur des Bosses kommt deutlich öfter. Die beste Beute – bis zur höchsten Seltenheit.' },
};
/**
 * Raritätsgewichte eines Schwierigkeitsgrads in voller Länge (RARITY_NAME). „Mythisch“ (0.9) nur auf Albtraum und Mythisch,
 * mit dem Gewicht aus CFG.loot.mythic.expedition (Endboss) – dieselbe Quelle wie `expeditionRarity` in shared/src/rarity.ts.
 */
export function diffRarity(d: Difficulty): number[] {
  return rarityTable(EXP_DIFF[d].rarity, CFG.loot.mythic.expedition[d]?.[1] ?? 0);
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
    hpMul: 39, dmgMul: 1.35, defMul: 1.4, speed: 40, radius: 13, ai: 'chase', pattern: ['stomp', 'adds', 'rain'], every: 4.2, adds: ['moosling', 'wurzelschleicher'],
    intro: '„Die Kleine da unten hält sich für die Mutter von allem. Ich war vorher da.“' }),
  M({ id: 'xm_sporenkoenig', name: 'Sporenkönig Pfifferling', title: 'Herr des Pilzhains', sprite: 'pilzling', tint: 0xffb060, scale: 2.2, element: 'earth',
    hpMul: 30, dmgMul: 1.3, defMul: 0.9, speed: 30, radius: 12, ai: 'ranged', pattern: ['ring', 'pools', 'lines'], every: 3.6,
    intro: 'Ein Pilz mit Krone. Die Krone ist auch ein Pilz.' }),
  // ---- Kristallhöhlen
  M({ id: 'xm_glasmaul', name: 'Glasmaul', title: 'Der hungrige Spiegel', sprite: 'kristallkrabbler', tint: 0xb0e8ff, scale: 2.2, element: 'light',
    hpMul: 39, dmgMul: 1.35, defMul: 2, speed: 40, radius: 13, ai: 'charge', pattern: ['charge', 'ring', 'stomp'], every: 4,
    intro: 'Es frisst Licht. Deines sieht lecker aus.' }),
  M({ id: 'xm_glimmerkoenigin', name: 'Glimmerkönigin', title: 'Die singende Kuppel', sprite: 'glimmerwisp', tint: 0xffe0ff, scale: 2.4, element: 'light',
    hpMul: 27, dmgMul: 1.35, defMul: 0.8, speed: 50, radius: 11, ai: 'blink', pattern: ['lines', 'adds', 'ring'], every: 3.4, adds: ['glimmerwisp'],
    intro: 'Hedda sagt, wenn man sie singen hört, ist es schon zu spät. Hedda übertreibt gern. Diesmal nicht.' }),
  // ---- Glutlande
  M({ id: 'xm_schlackenvogt', name: 'Schlackenvogt', title: 'Aufseher der Gussrinnen', sprite: 'schlackengolem', tint: 0xff8040, scale: 1.7, element: 'fire',
    hpMul: 42, dmgMul: 1.4, defMul: 1.8, speed: 34, radius: 15, ai: 'chase', pattern: ['stomp', 'pools', 'rain'], every: 4.4,
    intro: '„Wer hier gießt, hat einen Passierschein. Hast du einen Passierschein?“' }),
  M({ id: 'xm_aschenrudel', name: 'Mutter Asche', title: 'Leittier der Aschenhunde', sprite: 'aschenhund', tint: 0x705050, scale: 1.9, element: 'fire',
    hpMul: 33, dmgMul: 1.4, defMul: 1, speed: 70, radius: 12, ai: 'charge', pattern: ['charge', 'adds', 'ring'], every: 3.8, adds: ['aschenhund'],
    intro: 'Sie bellt nicht. Sie hat Leute dafür.' }),
  // ---- Frostgebirge
  M({ id: 'xm_reifriese', name: 'Reifriese Hjalmar', title: 'Der Türsteher des Doms', sprite: 'schneebrute', tint: 0xc8e8ff, scale: 1.8, element: 'water',
    hpMul: 45, dmgMul: 1.4, defMul: 1.8, speed: 38, radius: 15, ai: 'charge', pattern: ['stomp', 'charge', 'rain'], every: 4.2,
    intro: '„Ysolde empfängt heute nicht. Ysolde empfängt nie. Geh.“' }),
  M({ id: 'xm_nordlicht', name: 'Die Weiße Wache', title: 'Wisp aus gewebtem Eis', sprite: 'frostwisp', tint: 0xe8ffff, scale: 2.3, element: 'water',
    hpMul: 30, dmgMul: 1.35, defMul: 0.9, speed: 60, radius: 11, ai: 'blink', pattern: ['lines', 'ring', 'pools'], every: 3.4,
    intro: 'Ein Muster, das sich selbst zu Ende gewebt hat.' }),
  // ---- Verlorene Ruinen
  M({ id: 'xm_kustos', name: 'Kustos Vierzehn', title: 'Unterarchivar mit Stempel', sprite: 'runenwaechter', tint: 0xd8c890, scale: 1.6, element: 'wind',
    hpMul: 45, dmgMul: 1.4, defMul: 2, speed: 34, radius: 15, ai: 'chase', pattern: ['lines', 'stomp', 'adds'], every: 4.2, adds: ['arkanauge'],
    intro: '„Antrag auf Durchgang: abgelehnt. Antrag auf Ablehnung des Antrags: ebenfalls abgelehnt.“' }),
  M({ id: 'xm_klageweib', name: 'Die Fußnote', title: 'Ein Geist, den niemand zitiert', sprite: 'fluchgeist', tint: 0xa0c8ff, scale: 2, element: 'dark',
    hpMul: 30, dmgMul: 1.4, defMul: 0.9, speed: 56, radius: 11, ai: 'blink', pattern: ['ring', 'rain', 'pools'], every: 3.5,
    intro: 'Sie steht ganz unten auf jeder Seite. Heute steht sie dir im Weg.' }),
  // ---- Schattenreich
  M({ id: 'xm_kronenritter', name: 'Ritter ohne Krone', title: 'Morvains letzter Getreuer', sprite: 'hohlritter', tint: 0xd0b0ff, scale: 1.6, element: 'dark',
    hpMul: 45, dmgMul: 1.45, defMul: 2, speed: 48, radius: 14, ai: 'charge', pattern: ['charge', 'lines', 'stomp'], every: 4,
    intro: '„Mein König schläft. Ich habe versprochen, dass ihn niemand weckt. Ich halte Versprechen. Das ist alles, was ich halte.“' }),
  M({ id: 'xm_mahrkoenigin', name: 'Die Mahrkönigin', title: 'Mutter der Albträume', sprite: 'nachtmahr', tint: 0xff90c0, scale: 1.7, element: 'dark',
    hpMul: 33, dmgMul: 1.4, defMul: 1, speed: 90, radius: 13, ai: 'charge', pattern: ['adds', 'ring', 'rain'], every: 3.6, adds: ['leerenbrut'],
    intro: 'Sie träumt dich gerade. Es ist kein schöner Traum.' }),
  // ---- Endspiel (0.11): data/expeditions_endgame.ts
  ...ENDGAME_MINIS,
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
      S({ id: 'moosgang', name: 'Moosgang', shape: 'corridor', role: 'explore', via: 'stairs', groups: 3, nodes: 1, lore: 'Kratzspuren an der Wand. Jemand hat hier Tage gezählt und irgendwann aufgehört.' }),
      S({ id: 'pilzhain', name: 'Der Pilzhain', shape: 'grotto', role: 'explore', via: 'tunnel', groups: 5, nodes: 2,
        side: [S({ id: 'sporenhof', name: 'Sporenhof', shape: 'cavern', role: 'mini', via: 'gate', mini: 'xm_sporenkoenig', groups: 2 })] }),
      S({ id: 'waechterhalle', name: 'Halle der Wurzelwächter', shape: 'hall', role: 'combat', via: 'gate', groups: 7, elites: 1,
        secret: S({ id: 'gruftschatz', name: 'Vergessene Schatzkammer', shape: 'chamber', role: 'treasure', via: 'secret', cache: true, lore: 'Ein Brief, nie abgeschickt: „Liebe Mirelda, ich habe den Schlüssel unter die Wurzel gelegt, wie du gesagt hast. Wenn du das liest, war ich zu neugierig. – Aldo“' }) }),
      S({ id: 'wurzelkeller', name: 'Der Wurzelkeller', shape: 'cavern', role: 'combat', via: 'tunnel', groups: 5, nodes: 1 }),
      S({ id: 'gaertnerhalle', name: 'Halle der Gärtner', shape: 'hall', role: 'combat', via: 'stairs', groups: 6, elites: 1 }),
      S({ id: 'dornengang', name: 'Der Dornengang', shape: 'corridor', role: 'trap', via: 'gate', groups: 2, traps: ['spikes', 'poison', 'turrets'] }),
      S({ id: 'schluesselgrab', name: 'Grab des Gärtners', shape: 'chamber', role: 'key', via: 'tunnel', groups: 2, elites: 1, key: true }),
      S({ id: 'fackelkreis', name: 'Der Fackelkreis', shape: 'chamber', role: 'puzzle', via: 'gate', puzzle: 'torches', groups: 1 }),
      S({ id: 'abstieg', name: 'Die Wurzeltreppe', shape: 'corridor', role: 'combat', via: 'stairs', groups: 3, look: 1 }),
      S({ id: 'tiefe', name: 'Die Tiefe Gruft', shape: 'cavern', role: 'event', via: 'locked', event: 'ambush', look: 1, groups: 2,
        side: [S({ id: 'borkenhof', name: 'Hof der Borkenmutter', shape: 'hall', role: 'mini', via: 'gate', mini: 'xm_borkenmutter', look: 1, groups: 3 })] }),
      S({ id: 'wurzeldom', name: 'Der Wurzeldom', shape: 'grotto', role: 'explore', via: 'tunnel', look: 1, groups: 5, nodes: 2, lore: 'Hier unten wächst alles nach innen. Die Wurzeln umarmen etwas, das nicht umarmt werden will.' }),
      S({ id: 'runenbruecke', name: 'Brücke über den Wurzelbach', shape: 'corridor', role: 'puzzle', via: 'bridge', puzzle: 'runes', look: 1, groups: 2 }),
      S({ id: 'kriechgang', name: 'Der Kriechgang', shape: 'corridor', role: 'trap', via: 'tunnel', look: 1, groups: 2, traps: ['collapse', 'spikes'] }),
      S({ id: 'dornensaal', name: 'Saal der Erwachten', shape: 'hall', role: 'elite', via: 'gate', groups: 6, elites: 2, look: 1, nodes: 1 }),
      S({ id: 'rast', name: 'Letzte Rast', shape: 'chamber', role: 'prep', via: 'tunnel', look: 1 }),
      S({ id: 'wurzelherz', name: 'Das Wurzelherz', shape: 'arena', role: 'boss', via: 'gate', look: 1 }),
      S({ id: 'bluetenkammer', name: 'Blütenkammer', shape: 'chamber', role: 'reward', via: 'gate', look: 1 }),
    ],
  }),
  // =================================================================== KRISTALLHÖHLEN
  X({
    id: 'exp_kristall', name: 'Die Singende Tiefe', subtitle: 'Unter Stollen sieben klingt der Berg', region: 'kristall', parent: 'kristall', legacy: 'geode',
    boss: 'kristallkoloss', level: [9, 12], rec: 10, seed: 92101, dark: 0.6, mapPos: [66, 56], event: 'darkness', arena: 'crystals', rare: 'xr_prismenstaub',
    desc: 'Hedda nennt es „den Keller unter dem Keller“. Ein verlassener Förderstollen, ein Spiegelsee, Gänge, in denen das Licht ausgeht – und die Geode, in der der Kristallkoloss Wache hält.',
    intro: 'Auf einem Grubenschild, mit Kreide: „Stollen 7 – GESPERRT“. Jemand hat „GESPERRT“ durchgestrichen und „gut gemeint“ darunter geschrieben.',
    mobs: [[['kristallkrabbler', 4], ['fledermaus', 3], ['glimmerwisp', 2.5], ['tropfschleim', 3]],
      [['kristallkrabbler', 3], ['glimmerwisp', 4], ['tropfschleim', 2], ['schlackengolem', 0.6], ['fledermaus', 2]]],
    unlock: [boss('dornenmutter', 'Die Dornenmutter'), { text: 'Stufe 8', level: 8 }],
    sections: [
      S({ id: 'foerderkorb', name: 'Der Förderkorb', shape: 'chamber', role: 'entrance' }),
      S({ id: 'stollen', name: 'Stollen sieben', shape: 'corridor', role: 'explore', via: 'stairs', groups: 3, nodes: 2, lore: 'Ein Grubenhelm, innen beschriftet: „Günther“. Der Helm ist sehr klein.' }),
      S({ id: 'spiegelsee', name: 'Der Spiegelsee', shape: 'grotto', role: 'explore', via: 'gate', groups: 5, nodes: 2,
        secret: S({ id: 'glasgrab', name: 'Kammer der Glasschleifer', shape: 'chamber', role: 'treasure', via: 'secret', cache: true, lore: 'Messprotokoll, letzte Zeile: „Der Berg antwortet auf Fis. Wir sollten aufhören zu fragen.“' }) }),
      S({ id: 'gleishalle', name: 'Die Gleishalle', shape: 'hall', role: 'combat', via: 'tunnel', groups: 7, elites: 1,
        side: [S({ id: 'glasmaul', name: 'Das Glasmaul-Nest', shape: 'cavern', role: 'mini', via: 'gate', mini: 'xm_glasmaul', groups: 2 })] }),
      S({ id: 'loren', name: 'Der Lorenfriedhof', shape: 'cavern', role: 'combat', via: 'tunnel', groups: 5, nodes: 1 }),
      S({ id: 'drusengang', name: 'Der Drusengang', shape: 'corridor', role: 'trap', via: 'gate', groups: 2, traps: ['turrets', 'collapse'] }),
      S({ id: 'vorarbeiter', name: 'Vorarbeiterstube', shape: 'chamber', role: 'key', via: 'tunnel', groups: 2, elites: 1, key: true }),
      S({ id: 'hebelwerk', name: 'Das Hebelwerk', shape: 'chamber', role: 'puzzle', via: 'gate', puzzle: 'levers', groups: 1 }),
      S({ id: 'dunkelgang', name: 'Wo das Licht ausgeht', shape: 'cavern', role: 'event', via: 'locked', event: 'darkness', look: 1, groups: 2 }),
      S({ id: 'kuppel', name: 'Die Singende Kuppel', shape: 'hall', role: 'combat', via: 'stairs', look: 1, groups: 6,
        side: [S({ id: 'koeniginnenhof', name: 'Hof der Glimmerkönigin', shape: 'grotto', role: 'mini', via: 'tunnel', mini: 'xm_glimmerkoenigin', look: 1, groups: 2 })] }),
      S({ id: 'echohalle', name: 'Die Echohalle', shape: 'hall', role: 'explore', via: 'gate', look: 1, groups: 5, nodes: 1, lore: 'Wer hier ruft, hört sich dreimal antworten. Beim vierten Mal antwortet jemand anderes.' }),
      S({ id: 'prismensteg', name: 'Der Prismensteg', shape: 'corridor', role: 'puzzle', via: 'bridge', puzzle: 'plates', look: 1, groups: 2 }),
      S({ id: 'drusendom', name: 'Der Drusendom', shape: 'cavern', role: 'elite', via: 'gate', look: 1, groups: 6, elites: 2, nodes: 2 }),
      S({ id: 'gruben_rast', name: 'Heddas Notlager', shape: 'chamber', role: 'prep', via: 'tunnel', look: 1 }),
      S({ id: 'geodenherz', name: 'Das Geodenherz', shape: 'arena', role: 'boss', via: 'gate', look: 1 }),
      S({ id: 'lichtkammer', name: 'Die Lichtkammer', shape: 'chamber', role: 'reward', via: 'gate', look: 1 }),
    ],
  }),
  // =================================================================== GLUTLANDE
  X({
    id: 'exp_glut', name: 'Die Gießerei der Ersten', subtitle: 'Wo die Siegel gegossen wurden', region: 'glut', parent: 'glut', legacy: 'aschenschmiede',
    boss: 'ignarok', level: [14, 17], rec: 15, seed: 93101, dark: 0.45, mapPos: [86, 74], event: 'collapse', arena: 'lava', rare: 'xr_urglut',
    desc: 'Hinter der Aschenschmiede liegt die eigentliche Werkstatt der Ersten Hüter: Gussrinnen, Schlackenhalden, ein Steg über die Lava – und der Wurm, der sich in der Esse eingerichtet hat.',
    intro: 'Schmiederegel Nr. 1: „Was hier gegossen wird, verlässt die Schmiede nur mit Siegel – oder gar nicht.“ Regel Nr. 2 ist abgebrochen. Man ahnt, warum.',
    mobs: [[['glutimp', 4], ['aschenhund', 3], ['magmaschleim', 3], ['schlackengolem', 1.2]],
      [['schlackengolem', 2.2], ['magmaschleim', 3], ['glutimp', 3], ['aschenhund', 2]]],
    unlock: [boss('kristallkoloss', 'Der Kristallkoloss'), mq('m_glut', 'Hauptquest „Der Schlackenwurm“ angenommen')],
    sections: [
      S({ id: 'aschentor', name: 'Das Aschentor', shape: 'chamber', role: 'entrance' }),
      S({ id: 'schlackenhalde', name: 'Die Schlackenhalde', shape: 'grotto', role: 'explore', via: 'tunnel', groups: 5, nodes: 2 }),
      S({ id: 'gussrinnen', name: 'Die Gussrinnen', shape: 'corridor', role: 'trap', via: 'gate', groups: 2, traps: ['spikes', 'poison'],
        side: [S({ id: 'vogtei', name: 'Die Vogtei', shape: 'hall', role: 'mini', via: 'gate', mini: 'xm_schlackenvogt', groups: 2 })] }),
      S({ id: 'formenlager', name: 'Das Formenlager', shape: 'hall', role: 'combat', via: 'stairs', groups: 7, elites: 1,
        secret: S({ id: 'siebteform', name: 'Die siebte Gussform', shape: 'chamber', role: 'treasure', via: 'secret', cache: true, lore: 'Sieben Mulden in einer Form. Sechs sind benutzt. Die siebte ist kleiner – wie für ein Herz.' }) }),
      S({ id: 'kesselraum', name: 'Der Kesselraum', shape: 'cavern', role: 'combat', via: 'tunnel', groups: 5 }),
      S({ id: 'schlackengrube', name: 'Die Schlackengrube', shape: 'grotto', role: 'explore', via: 'stairs', groups: 5, nodes: 2 }),
      S({ id: 'kohlenbunker', name: 'Der Kohlenbunker', shape: 'chamber', role: 'key', via: 'gate', groups: 2, elites: 1, key: true }),
      S({ id: 'lavasteg', name: 'Der einstürzende Steg', shape: 'corridor', role: 'event', via: 'bridge', event: 'collapse', groups: 1 }),
      S({ id: 'blasebalg', name: 'Der Blasebalg', shape: 'chamber', role: 'puzzle', via: 'locked', puzzle: 'torches', look: 1, groups: 1 }),
      S({ id: 'essenhalle', name: 'Die Essenhalle', shape: 'hall', role: 'combat', via: 'stairs', look: 1, groups: 6,
        side: [S({ id: 'rudelhoehle', name: 'Die Rudelhöhle', shape: 'cavern', role: 'mini', via: 'tunnel', mini: 'xm_aschenrudel', look: 1, groups: 2 })] }),
      S({ id: 'kuehlbecken', name: 'Die Kühlbecken', shape: 'cavern', role: 'combat', via: 'tunnel', look: 1, groups: 5 }),
      S({ id: 'gluehgang', name: 'Der Glühgang', shape: 'corridor', role: 'trap', via: 'gate', look: 1, groups: 2, traps: ['turrets', 'collapse', 'spikes'] }),
      S({ id: 'ambosshalle', name: 'Halle der Ambosse', shape: 'hall', role: 'elite', via: 'tunnel', look: 1, groups: 6, elites: 2, nodes: 1 }),
      S({ id: 'abkuehlraum', name: 'Der Abkühlraum', shape: 'chamber', role: 'prep', via: 'gate', look: 1 }),
      S({ id: 'esse', name: 'Die Große Esse', shape: 'arena', role: 'boss', via: 'gate', look: 1 }),
      S({ id: 'siegelkammer', name: 'Die Siegelkammer', shape: 'chamber', role: 'reward', via: 'gate', look: 1 }),
    ],
  }),
  // =================================================================== FROSTGEBIRGE
  X({
    id: 'exp_frost', name: 'Der Webstuhl aus Eis', subtitle: 'Ein Muster, das sich selbst webt', region: 'frost', parent: 'frost', legacy: 'gletscherdom',
    boss: 'ysolde', level: [19, 22], rec: 20, seed: 94101, dark: 0.4, mapPos: [28, 18], event: 'flood', arena: 'ice', rare: 'xr_stillfaden',
    desc: 'Der Gletscherdom ist nur der Vorhof. Dahinter webt Ysolde seit vierzig Wintern an einem Muster aus Eis – mit Schmelzwasserkammern, gefrorenen Hallen und einem Reifriesen an der Tür.',
    intro: 'In Eis gewebt: „Ordnung ist Gnade. Stillstand ist Frieden. – Y.“ Darunter, mit dem Finger ins Reif gemalt: „Kalt ist es trotzdem. – J.“',
    mobs: [[['eiswicht', 4], ['frostwolf', 3], ['frostwisp', 3], ['schneebrute', 1.2]],
      [['frostwisp', 4], ['eiswicht', 3], ['schneebrute', 2], ['fluchgeist', 0.8]]],
    unlock: [boss('ignarok', 'Ignarok'), { text: 'Stufe 17', level: 17 }],
    sections: [
      S({ id: 'eispforte', name: 'Die Eispforte', shape: 'chamber', role: 'entrance' }),
      S({ id: 'reifgang', name: 'Der Reifgang', shape: 'corridor', role: 'explore', via: 'stairs', groups: 3, nodes: 2 }),
      S({ id: 'vorhalle', name: 'Die Vorhalle des Doms', shape: 'hall', role: 'mini', via: 'gate', mini: 'xm_reifriese', groups: 3 }),
      S({ id: 'eisgarten', name: 'Der Eisgarten', shape: 'grotto', role: 'explore', via: 'tunnel', groups: 5, nodes: 2,
        secret: S({ id: 'jorunds_versteck', name: 'Jorunds altes Versteck', shape: 'chamber', role: 'treasure', via: 'secret', cache: true, lore: 'Ein Becher, zwei Löffel, ein Brief an Ysolde. Er beginnt mit „Es tut mir leid“ und hört dort auch auf.' }) }),
      S({ id: 'eisbruch', name: 'Der Eisbruch', shape: 'cavern', role: 'combat', via: 'stairs', groups: 5, nodes: 1 }),
      S({ id: 'spulenraum', name: 'Der Spulenraum', shape: 'chamber', role: 'puzzle', via: 'gate', puzzle: 'runes', groups: 1 }),
      S({ id: 'schmelzkammer', name: 'Die Schmelzkammer', shape: 'cavern', role: 'event', via: 'tunnel', event: 'flood', groups: 2 }),
      S({ id: 'frosthalle', name: 'Die Gefrorene Halle', shape: 'hall', role: 'combat', via: 'stairs', look: 1, groups: 7, elites: 1,
        side: [S({ id: 'weisse_wache', name: 'Wache aus Weiß', shape: 'cavern', role: 'mini', via: 'gate', mini: 'xm_nordlicht', look: 1, groups: 2 })] }),
      S({ id: 'faedenhalle', name: 'Die Halle der Fäden', shape: 'grotto', role: 'explore', via: 'tunnel', look: 1, groups: 5, nodes: 2, lore: 'Tausend Fäden aus Eis, alle zu einem Punkt gespannt, der leer ist. Hier hat jemand gewartet.' }),
      S({ id: 'zapfengang', name: 'Der Zapfengang', shape: 'corridor', role: 'trap', via: 'gate', look: 1, groups: 2, traps: ['spikes', 'collapse', 'poison'] }),
      S({ id: 'webermeisterei', name: 'Die Webermeisterei', shape: 'chamber', role: 'key', via: 'tunnel', look: 1, groups: 2, elites: 1, key: true }),
      S({ id: 'gletscherbruecke', name: 'Die Gletscherbrücke', shape: 'corridor', role: 'combat', via: 'bridge', look: 1, groups: 3 }),
      S({ id: 'musterhalle', name: 'Die Musterhalle', shape: 'hall', role: 'elite', via: 'locked', look: 1, groups: 6, elites: 2, nodes: 1 }),
      S({ id: 'kamin', name: 'Der kalte Kamin', shape: 'chamber', role: 'prep', via: 'tunnel', look: 1 }),
      S({ id: 'webstuhl', name: 'Der Webstuhl', shape: 'arena', role: 'boss', via: 'gate', look: 1 }),
      S({ id: 'fadenkammer', name: 'Die Fadenkammer', shape: 'chamber', role: 'reward', via: 'gate', look: 1 }),
    ],
  }),
  // =================================================================== VERLORENE RUINEN
  X({
    id: 'exp_ruinen', name: 'Die Unteren Archive', subtitle: 'Jedes Wort, das je verschwiegen wurde', region: 'ruinen', parent: 'ruinen', legacy: 'archiv',
    boss: 'archivar', level: [24, 27], rec: 25, seed: 95101, dark: 0.5, mapPos: [70, 14], event: 'ambush', arena: 'grid', rare: 'xr_tintenstein',
    desc: 'Unter dem Archiv der Stille liegen die Magazine: endlose Regalgänge, ein Lesesaal, ein Kustos mit Stempel – und der Archivar, der jedes Wort berichtigt, auch deines.',
    intro: 'Am Eingang ein Schild: „Ruhe. Ruhe. RUHE.“ Jemand hat ein viertes „Ruhe“ angefangen und ist dabei offenbar eingeschlafen.',
    mobs: [[['skelettkrieger', 4], ['arkanauge', 3], ['fluchgeist', 3], ['runenwaechter', 1.2]],
      [['fluchgeist', 4], ['arkanauge', 3], ['runenwaechter', 2], ['skelettkrieger', 2]]],
    unlock: [boss('ysolde', 'Ysolde'), mq('m_archivar', 'Hauptquest „Archiv der Stille“ angenommen')],
    sections: [
      S({ id: 'pforte', name: 'Die Pförtnerloge', shape: 'chamber', role: 'entrance' }),
      S({ id: 'regalgang', name: 'Der Regalgang', shape: 'corridor', role: 'explore', via: 'stairs', groups: 3, nodes: 2, lore: 'Ein Zettel im Regal: „Signatur fehlt. Buch fehlt. Regal fehlt? – Nein, Regal da.“' }),
      S({ id: 'lesesaal', name: 'Der Lesesaal', shape: 'hall', role: 'combat', via: 'gate', groups: 7, elites: 1,
        secret: S({ id: 'verbotenes', name: 'Die verbotene Abteilung', shape: 'chamber', role: 'treasure', via: 'secret', cache: true, discover: 'exp_gestrichen', lore: 'Ein Katalog der gestrichenen Namen. Der erste Eintrag ist ausradiert. So gründlich, dass das Papier durchscheint.' }) }),
      S({ id: 'kartei', name: 'Die Kartei', shape: 'chamber', role: 'puzzle', via: 'tunnel', puzzle: 'levers', groups: 1 }),
      S({ id: 'magazin', name: 'Das Magazin', shape: 'cavern', role: 'event', via: 'gate', event: 'ambush', groups: 2,
        side: [S({ id: 'kustodie', name: 'Die Kustodie', shape: 'hall', role: 'mini', via: 'gate', mini: 'xm_kustos', groups: 2 })] }),
      S({ id: 'staubgang', name: 'Der Staubgang', shape: 'corridor', role: 'trap', via: 'stairs', look: 1, groups: 2, traps: ['turrets', 'spikes', 'poison'] }),
      S({ id: 'siegelstube', name: 'Die Siegelstube', shape: 'chamber', role: 'key', via: 'tunnel', look: 1, groups: 2, elites: 1, key: true }),
      S({ id: 'fussnoten', name: 'Die Fußnoten', shape: 'grotto', role: 'explore', via: 'gate', look: 1, groups: 5, nodes: 2,
        side: [S({ id: 'anmerkung', name: 'Die letzte Anmerkung', shape: 'cavern', role: 'mini', via: 'tunnel', mini: 'xm_klageweib', look: 1, groups: 1 })] }),
      S({ id: 'indexbruecke', name: 'Die Indexbrücke', shape: 'corridor', role: 'puzzle', via: 'bridge', puzzle: 'runes', look: 1, groups: 2 }),
      S({ id: 'scriptorium', name: 'Das Scriptorium', shape: 'hall', role: 'elite', via: 'locked', look: 1, groups: 7, elites: 2 }),
      S({ id: 'leseecke', name: 'Die Leseecke', shape: 'chamber', role: 'prep', via: 'tunnel', look: 1 }),
      S({ id: 'katalog', name: 'Der Große Katalog', shape: 'arena', role: 'boss', via: 'gate', look: 1 }),
      S({ id: 'ablage', name: 'Die Ablage', shape: 'chamber', role: 'reward', via: 'gate', look: 1 }),
    ],
  }),
  // =================================================================== SCHATTENREICH
  X({
    id: 'exp_schatten', name: 'Der Hof der Hohlen Krone', subtitle: 'Wo die Quelle schweigt', region: 'schatten', parent: 'schatten', legacy: 'thron',
    boss: 'hohlkoenig', level: [29, 32], rec: 30, seed: 96101, dark: 0.5, mapPos: [92, 28], event: 'collapse', arena: 'void', rare: 'xr_kronensplitter',
    desc: 'Der Thron der Leere ist das Ende eines langen Hofes: Gärten aus Erinnerung, ein Spiegelsaal, eine Brücke, die nur hält, solange man nicht stehen bleibt – und am Ende Morvain auf seinem Thron.',
    intro: 'Über dem Tor, in einer Schrift, die sich beim Lesen umordnet: „Hier wird niemand vergessen.“ Darunter, frischer: „Doch. – V.“',
    mobs: [[['schattenwandler', 4], ['leerenbrut', 4], ['nachtmahr', 2], ['hohlritter', 1.2]],
      [['hohlritter', 2.4], ['schattenwandler', 3], ['nachtmahr', 2.5], ['leerenbrut', 3]]],
    unlock: [boss('archivar', 'Der Archivar'), mq('m_koenig', 'Hauptquest „Der Hohle König“ angenommen')],
    sections: [
      S({ id: 'leeres_tor', name: 'Das leere Tor', shape: 'chamber', role: 'entrance' }),
      S({ id: 'erinnerungsgarten', name: 'Der Erinnerungsgarten', shape: 'grotto', role: 'explore', via: 'stairs', groups: 5, nodes: 2,
        secret: S({ id: 'maelis_zimmer', name: 'Maelis’ Zimmer', shape: 'chamber', role: 'treasure', via: 'secret', cache: true, lore: 'Ein Kinderbett aus Schatten. Auf dem Kissen vier Noten, mit Kreide. Die fünfte fehlt.' }) }),
      S({ id: 'wandelgang', name: 'Der Wandelgang', shape: 'corridor', role: 'trap', via: 'gate', groups: 2, traps: ['spikes', 'turrets'] }),
      S({ id: 'spiegelsaal', name: 'Der Spiegelsaal', shape: 'hall', role: 'combat', via: 'tunnel', groups: 7, elites: 1,
        side: [S({ id: 'mahrstall', name: 'Der Mahrstall', shape: 'cavern', role: 'mini', via: 'gate', mini: 'xm_mahrkoenigin', groups: 2 })] }),
      S({ id: 'traumgarten', name: 'Die Traumbeete', shape: 'cavern', role: 'combat', via: 'stairs', groups: 5, nodes: 1 }),
      S({ id: 'kronschatz', name: 'Die Kronkammer', shape: 'chamber', role: 'key', via: 'gate', groups: 2, elites: 1, key: true }),
      S({ id: 'traumbruecke', name: 'Die zerfallende Brücke', shape: 'corridor', role: 'event', via: 'bridge', event: 'collapse', groups: 1 }),
      S({ id: 'sternwarte', name: 'Die schwarze Sternwarte', shape: 'chamber', role: 'puzzle', via: 'locked', puzzle: 'plates', look: 1, groups: 1 }),
      S({ id: 'hofstaat', name: 'Der Hofstaat', shape: 'hall', role: 'combat', via: 'stairs', look: 1, groups: 7,
        side: [S({ id: 'wachstube', name: 'Die letzte Wachstube', shape: 'hall', role: 'mini', via: 'gate', mini: 'xm_kronenritter', look: 1, groups: 2 })] }),
      S({ id: 'gedaechtnishalle', name: 'Die Halle des Vergessens', shape: 'grotto', role: 'explore', via: 'tunnel', look: 1, groups: 5, nodes: 2, lore: 'Lauter Rahmen ohne Bilder. An einem hängt noch ein Zettel: „Maelis, sechs Jahre“.' }),
      S({ id: 'leerengang', name: 'Der Leerengang', shape: 'corridor', role: 'trap', via: 'tunnel', look: 1, groups: 2, traps: ['collapse', 'poison', 'spikes'] }),
      S({ id: 'thronvorplatz', name: 'Der Thronvorplatz', shape: 'cavern', role: 'elite', via: 'gate', look: 1, groups: 6, elites: 2, nodes: 2 }),
      S({ id: 'letztes_licht', name: 'Das letzte Licht', shape: 'chamber', role: 'prep', via: 'tunnel', look: 1 }),
      S({ id: 'thronsaal', name: 'Der Thronsaal', shape: 'arena', role: 'boss', via: 'gate', look: 1 }),
      S({ id: 'kronschrein', name: 'Der Kronschrein', shape: 'chamber', role: 'reward', via: 'gate', look: 1 }),
    ],
  }),
  // =================================================================== GEHEIM: DIE GESTRICHENEN SEITEN
  X({
    id: 'exp_gestrichen', name: 'Die Gestrichenen Seiten', subtitle: 'Was der Windhüter löschen ließ', region: 'ruinen', parent: 'ruinen', secret: true,
    boss: 'archivar', bossName: 'Der Erste Schreiber', bossTint: 0xffc890, level: [33, 36], rec: 34, seed: 97101, dark: 0.6, mapPos: [60, 10], event: 'darkness', arena: 'grid', rare: 'xr_tintenstein',
    desc: 'Hinter der verbotenen Abteilung liegt ein Archiv, das es nicht gibt: Seiten über Aetherion, mit so viel Mühe gestrichen, dass die Striche selbst zu Wänden wurden. Und jemand schreibt dort noch.',
    intro: 'Auf dem Boden, in sehr kleiner Schrift, immer wieder dasselbe Wort, immer wieder durchgestrichen. Man kann es fast lesen.',
    mobs: [[['fluchgeist', 4], ['arkanauge', 3], ['skelettkrieger', 2], ['schattenwandler', 2]],
      [['runenwaechter', 2], ['fluchgeist', 3], ['nachtmahr', 2], ['leerenbrut', 2]]],
    unlock: [boss('hohlkoenig', 'Der Hohle König'), { text: 'Den verborgenen Zugang entdeckt (eine Spur in den Unteren Archiven)', cond: { flag: 'xs:exp_gestrichen' } }],
    sections: [
      S({ id: 'randnotiz', name: 'Die Randnotiz', shape: 'chamber', role: 'entrance' }),
      S({ id: 'streichgang', name: 'Der Streichgang', shape: 'corridor', role: 'explore', via: 'stairs', groups: 3, nodes: 1, lore: 'Jeder Stein hier ist ein Wort. Jedes Wort ist durchgestrichen. Die Striche sind sorgfältig. Sie sind sehr, sehr sorgfältig.' }),
      S({ id: 'palimpsest', name: 'Das Palimpsest', shape: 'hall', role: 'combat', via: 'gate', groups: 7, elites: 1,
        side: [S({ id: 'fussnote2', name: 'Die verschwiegene Fußnote', shape: 'cavern', role: 'mini', via: 'tunnel', mini: 'xm_klageweib', groups: 2 })] }),
      S({ id: 'tintensee', name: 'Der Tintensee', shape: 'grotto', role: 'explore', via: 'bridge', groups: 5, nodes: 2,
        secret: S({ id: 'erste_seite', name: 'Die erste Seite', shape: 'chamber', role: 'treasure', via: 'secret', cache: true, lore: '„Sein Name war —“. Mehr steht nicht da. Der Rest ist so gründlich ausradiert, dass man darunter den Tisch sieht.' }) }),
      S({ id: 'schwaerzung', name: 'Die Schwärzung', shape: 'cavern', role: 'combat', via: 'stairs', groups: 5 }),
      S({ id: 'zensur', name: 'Die Zensurkammer', shape: 'chamber', role: 'key', via: 'tunnel', groups: 2, elites: 1, key: true }),
      S({ id: 'leere_zeilen', name: 'Die leeren Zeilen', shape: 'cavern', role: 'event', via: 'locked', event: 'darkness', look: 1, groups: 2 }),
      S({ id: 'satzspiegel', name: 'Der Satzspiegel', shape: 'chamber', role: 'puzzle', via: 'gate', puzzle: 'runes', look: 1, groups: 1 }),
      S({ id: 'register', name: 'Das Register', shape: 'hall', role: 'elite', via: 'stairs', look: 1, groups: 7, elites: 2,
        side: [S({ id: 'kustodie2', name: 'Die zweite Kustodie', shape: 'hall', role: 'mini', via: 'gate', mini: 'xm_kustos', look: 1, groups: 2 })] }),
      S({ id: 'loeschgang', name: 'Der Löschgang', shape: 'corridor', role: 'trap', via: 'tunnel', look: 1, groups: 2, traps: ['collapse', 'turrets', 'spikes'] }),
      S({ id: 'schreibpult', name: 'Am Schreibpult', shape: 'chamber', role: 'prep', via: 'gate', look: 1 }),
      S({ id: 'urschrift', name: 'Die Urschrift', shape: 'arena', role: 'boss', via: 'gate', look: 1 }),
      S({ id: 'nachwort', name: 'Das Nachwort', shape: 'chamber', role: 'reward', via: 'gate', look: 1 }),
    ],
  }),
  // =================================================================== ENDSPIEL (0.11): Die Lange Wacht, Das Atmende Herz – data/expeditions_endgame.ts
  ...ENDGAME_LIST,
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
  if (r.exp && !totalClears(c.expeditions?.[r.exp])) return false;
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
      if (num(r.deep, 99)) { rec.deep = num(r.deep, 99); if (num(r.deepSec, 1e7)) rec.deepSec = num(r.deepSec, 1e7); } // 0.11: Tiefen
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
  const pool = EXPEDITION_LIST.filter(x => !x.secret && !x.endgame); // 0.11: Endspiel-Expeditionen nicht – nicht jeder kommt hinein
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
