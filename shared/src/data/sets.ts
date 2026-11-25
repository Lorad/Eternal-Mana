/**
 * Rüstungssets (0.4). Ein Set besteht aus Kopf, Rüstung und zwei Schmuckstücken (Reif, Anhänger).
 * Setteile sind gewöhnliche, zur Klasse passende Ausrüstungsteile mit `set`-Kennung und eigenem Namen;
 * die Boni für 2 und 4 angelegte Teile sind reine Modifikatoren und werden in stats.ts eingerechnet.
 * Herkunft: Bosstruhe und Truhen des zugehörigen Dungeons; Kopf und Rüstung lassen sich mit einem Bosskern schmieden.
 */
import type { CharData, Element, Mods } from '../types';
import { SLOTS } from '../types';

export type SetPiece = 'helm' | 'armor' | 'ring' | 'amulet';
export const SET_PIECES: SetPiece[] = ['helm', 'armor', 'ring', 'amulet'];
export const SET_PIECE_NAME: Record<SetPiece, string> = { helm: 'Kopfschutz', armor: 'Gewand', ring: 'Reif', amulet: 'Anhänger' };

export interface SetDef {
  id: string;
  name: string;
  /** Genitiv für die Teilenamen: „Kopfschutz der Wurzelwacht“ */
  gen: string;
  element: Element;
  /** Materialstufe des Gebiets (1..6): bestimmt Erz und Monster-Rohstoff beim Schmieden */
  tier: number;
  ilvl: number;
  boss: string;
  /** Dungeon, in dessen Truhen Teile liegen können */
  dungeon: string;
  bonus2: Mods;
  bonus4: Mods;
}

export const SET_LIST: SetDef[] = [
  { id: 'wurzelwacht', name: 'Wurzelwacht', gen: 'der Wurzelwacht', element: 'earth', tier: 1, ilvl: 7, boss: 'dornenmutter', dungeon: 'wurzelgruft',
    bonus2: { hpPct: 6 }, bonus4: { defPct: 8, hpRegen: 1, resEarth: 15 } },
  { id: 'prismenglanz', name: 'Prismenglanz', gen: 'des Prismenglanzes', element: 'light', tier: 2, ilvl: 12, boss: 'kristallkoloss', dungeon: 'geode',
    bonus2: { mpPct: 8, mpRegen: 0.5 }, bonus4: { elemPct: 8, resLight: 15 } },
  { id: 'aschenglut', name: 'Aschenglut', gen: 'der Aschenglut', element: 'fire', tier: 3, ilvl: 17, boss: 'ignarok', dungeon: 'aschenschmiede',
    bonus2: { powerPct: 4 }, bonus4: { critDmg: 15, resFire: 15 } },
  { id: 'frostweberin', name: 'Frostweberin', gen: 'der Frostweberin', element: 'water', tier: 4, ilvl: 22, boss: 'ysolde', dungeon: 'gletscherdom',
    bonus2: { defPct: 8 }, bonus4: { cdr: 6, resWater: 15 } },
  { id: 'stilleschrift', name: 'Stille Schrift', gen: 'der Stillen Schrift', element: 'wind', tier: 5, ilvl: 27, boss: 'archivar', dungeon: 'archiv',
    bonus2: { speedPct: 4, dodgeCdr: 8 }, bonus4: { crit: 5, resWind: 15 } },
  { id: 'hohlekrone', name: 'Hohle Krone', gen: 'der Hohlen Krone', element: 'dark', tier: 6, ilvl: 33, boss: 'hohlkoenig', dungeon: 'thron',
    bonus2: { powerPct: 5 }, bonus4: { lifesteal: 1, critDmg: 12, resDark: 15 } },
];
export const SETS: Record<string, SetDef> = Object.fromEntries(SET_LIST.map(s => [s.id, s]));
export const SET_BY_BOSS: Record<string, SetDef> = Object.fromEntries(SET_LIST.map(s => [s.boss, s]));
export const SET_BY_DUNGEON: Record<string, SetDef> = Object.fromEntries(SET_LIST.map(s => [s.dungeon, s]));

export function setPieceName(set: SetDef, piece: SetPiece): string { return `${SET_PIECE_NAME[piece]} ${set.gen}`; }

/** Angelegte Teile je Set. Zwei gleiche Teile (z. B. zwei Reife) zählen nur einmal. */
export function setCounts(c: Pick<CharData, 'equip'>): Record<string, number> {
  const seen: Record<string, Set<string>> = {};
  for (const s of SLOTS) {
    const it = c.equip[s];
    if (!it?.set || !SETS[it.set]) continue;
    (seen[it.set] ??= new Set()).add(it.base);
  }
  const out: Record<string, number> = {};
  for (const id in seen) out[id] = seen[id].size;
  return out;
}
/** Aktive Setboni als Liste von Modifikatoren. */
export function setMods(counts: Record<string, number>): Mods[] {
  const out: Mods[] = [];
  for (const id in counts) {
    const s = SETS[id];
    if (!s) continue;
    if (counts[id] >= 2) out.push(s.bonus2);
    if (counts[id] >= 4) out.push(s.bonus4);
  }
  return out;
}
