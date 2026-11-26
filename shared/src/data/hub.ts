/**
 * Quellwarte (Hub) und Expeditionen (ab 0.9) – gemeinsame Namen und Datenformate.
 *
 * Diese Datei ist der Vertrag zwischen den Teilen, die parallel entstehen: der Hub selbst (Karte, Einrichtungen),
 * die Expeditionen (Dungeon-Portal, Dungeons, Bosse, Abschluss) und die Ausrüstung. Namen hier nie umbenennen.
 * Leitlinie: docs/ROADMAP.md, Abschnitt 5.
 */

/** Zone der Quellwarte. Es gibt genau eine Hub-Instanz für alle Spieler (kein Kampf, Treffpunkt). */
export const HUB_ZONE = 'quellwarte';

/**
 * Feste Stellen im Hub in Kachelkoordinaten. Die Hub-Karte legt sie fest; wer etwas an einer dieser Stellen platziert
 * (z. B. das Dungeon-Portal), liest sie von hier.
 *   ankunft    – wo man per Quellstein ankommt
 *   portal     – Mittelpunkt des Portalplatzes (das Dungeon-Portal steht hier)
 *   rueckkehr  – wo Spieler nach einer Expedition erscheinen (vor dem Portal, frei begehbar)
 */
export type HubSpot = 'ankunft' | 'portal' | 'rueckkehr';
export const HUB_SPOTS: Record<HubSpot, [number, number]> = {
  ankunft: [38, 53],
  portal: [38, 19],
  rueckkehr: [38, 24],
};

/** Die Einrichtungen der Quellwarte (Schlüssel für Karte, NPCs, Hinweise und Handbuch). */
export type Facility = 'portal' | 'schmiede' | 'haendler' | 'alchemie' | 'meister' | 'lager' | 'gasthaus' | 'halle' | 'gruppe';

/** Schwierigkeitsgrade der Expeditionen */
export type Difficulty = 'normal' | 'schwer' | 'albtraum' | 'mythisch';
export const DIFFICULTIES: Difficulty[] = ['normal', 'schwer', 'albtraum', 'mythisch'];
export const DIFFICULTY_NAME: Record<Difficulty, string> = { normal: 'Normal', schwer: 'Schwer', albtraum: 'Albtraum', mythisch: 'Mythisch' };

/**
 * Fortschritt eines Charakters in einer Expedition. Liegt in `CharData.expeditions[dungeonId]` (optional; alte
 * Spielstände haben das Feld nicht). Die Trophäenhalle liest es, die Expeditionen schreiben es – nur der Server.
 */
export interface DungeonRecord {
  /** Abschlüsse je Schwierigkeitsgrad */
  clears: Partial<Record<Difficulty, number>>;
  /** Bestzeit in Sekunden je Schwierigkeitsgrad */
  best?: Partial<Record<Difficulty, number>>;
  /** gefundene Geheimnisse (IDs innerhalb der Expedition) */
  secrets?: string[];
  /** besiegte Mini-Bosse (IDs) */
  minis?: string[];
  /** Zeitpunkt (ms) des ersten Abschlusses */
  first?: number;
  /** 0.11: tiefste abgeschlossene Tiefe (über Mythisch) und die Zeit dieses Laufs in Sekunden (data/expeditions_endgame.ts) */
  deep?: number; deepSec?: number;
}
