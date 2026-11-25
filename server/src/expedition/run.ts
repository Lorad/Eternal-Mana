/**
 * Expeditionen (0.9): Zustand eines Laufs. Ein Lauf ist eine eigene `Zone` (Schlüssel `exp:<n>`) mit diesem `ExpRun`.
 * Alles hier ist Serverzustand – Gegner, Mini-Bosse, Rätsel, Ereignisse, Fortschritt – und wird nie gespeichert;
 * gespeichert wird nur, was ein Abschluss in den Charakter schreibt (reward.ts).
 */
import type { Difficulty } from '../../../shared/src/data/hub';
import type { EliteAffix, Weekly } from '../../../shared/src/data/expeditions';
import type { ExpResult } from '../../../shared/src/types';
import type { Game, Party } from '../game';
import type { Player } from '../player';
import type { Mob, Obj, Zone } from '../zone';

export interface MiniState { id: string; mob: Mob; nextAt: number; step: number; shown: Set<Player>; n: number; base: number; sec: string; optional: boolean; charge?: { x: number; y: number; at: number } }
export interface PuzzleState { sec: string; kind: string; order?: number[]; bits?: number[]; runes?: number[]; time?: number; progress: number; solved: boolean }
export interface EventState { kind: string; sec: string; state: 'idle' | 'running' | 'done'; wave: number; waves: number; mobs: Set<Mob>; barriers: Obj[]; at: number; next: number; pools: number[]; end?: { x: number; y: number }; front?: number }

export interface ExpRun {
  id: number;
  /** Lauf-Schlüssel: Belohnung genau einmal je Lauf und Charakter (CharData.expRuns) */
  key: string;
  exp: string; diff: Difficulty;
  weekly: Weekly | null;
  party: Party | null;
  /** charIds aller, die diesen Lauf betreten haben */
  members: Set<number>;
  /** wohin jeder zurückkehrt, der den Lauf verlässt (Portal im Hub oder Eingang in der Oberwelt) */
  from: Map<number, { zone: string; x: number; y: number }>;
  startAt: number;
  kills: number;
  deaths: Map<number, number>;
  secrets: Set<string>;
  minis: Set<string>;
  /** aktueller Abschnitt je Spieler (HUD) und bereits betretene Abschnitte */
  where: Map<number, string>; seen: Set<string>;
  checkpoint: { x: number; y: number } | null;
  puzzles: Map<string, PuzzleState>;
  events: Map<string, EventState>;
  miniMobs: Map<number, MiniState>;
  affix: Map<number, EliteAffix[]>;
  /** Bosskampf: Beginn (für die Wut) */
  bossAt: number;
  done: { sec: number; at: number; revealed: boolean } | null;
  results: Map<number, ExpResult>;
  returnAt: number; votes: Set<number>; returned: boolean;
  infoAt: number;
  /** Neuer Kreis der Gruppe (hebt die Stufen) · Tode je Charakter beim Betreten (Zähler im Lauf = Differenz) */
  kreis: number; d0: Map<number, number>;
}

let NEXT = 1;
/** Sitzungskennung des Servers: Lauf-Schlüssel bleiben über Neustarts hinweg eindeutig */
const BOOT = Date.now().toString(36);
export function newRun(exp: string, diff: Difficulty, party: Party | null, now: number, weekly: Weekly | null): ExpRun {
  const id = NEXT++;
  return {
    id, key: `${BOOT}-${id}`, exp, diff, weekly, party, members: new Set(), from: new Map(), startAt: now, kills: 0, deaths: new Map(), secrets: new Set(), minis: new Set(),
    where: new Map(), seen: new Set(), checkpoint: null, puzzles: new Map(), events: new Map(), miniMobs: new Map(), affix: new Map(), bossAt: 0,
    done: null, results: new Map(), returnAt: 0, votes: new Set(), returned: false, infoAt: 0, kreis: 0, d0: new Map(),
  };
}

/** Zustand je Spiel: offene Bereitschaftsprüfungen (je Gruppe) */
export interface Lobby { exp: string; diff: Difficulty; party: Party; lead: Player; ready: Set<number>; until: number }
const lobbies = new WeakMap<Game, Map<Party, Lobby>>();
export const lobbiesOf = (g: Game) => { let m = lobbies.get(g); if (!m) { m = new Map(); lobbies.set(g, m); } return m; };

/** alle laufenden Expeditions-Instanzen */
export function runs(g: Game): Zone[] { return [...g.zones.values()].filter(z => !!z.exp); }
