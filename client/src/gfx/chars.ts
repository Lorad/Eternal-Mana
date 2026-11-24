/**
 * Figuren-Sheets v2 (Klassen + NPCs): 43 Spalten × 3 Zeilen à 32×40 px, Standpunkt (16, 37).
 * Aufbau: chars/rig.ts (Rig), chars/poses.ts (Animationen), chars/classes.ts, chars/npcs.ts (Kostüme),
 * chars/outfits.ts (Gewand-Varianten der Klassen für die Garderobe).
 */
import { gridSheet } from './draw';
import { CHAR_COLS, CLASS_IDS, NPC_LOOKS } from './spec';
import type { Sheet } from './spec';
import { allFrames } from './chars/poses';
import { CLASSES } from './chars/classes';
import { NPCS } from './chars/npcs';
import { OUTFITS } from './chars/outfits';
import type { Costume } from './chars/rig';

const COSTUMES: Record<string, Costume> = { ...CLASSES, ...NPCS, ...OUTFITS };

export function buildCharSheet(key: string): Sheet {
  const c = COSTUMES[key];
  if (!c) throw new Error(`Unbekannte Figur: ${key}`);
  return gridSheet(allFrames(c), CHAR_COLS);
}

export function buildChars(): Record<string, Sheet> {
  const out: Record<string, Sheet> = {};
  for (const id of CLASS_IDS) out[`char_${id}`] = buildCharSheet(`char_${id}`);
  for (const id of NPC_LOOKS) out[`npc_${id}`] = buildCharSheet(`npc_${id}`);
  return out;
}

/** Die Gewand-Varianten (`char_<klasse>_<variante>`); eigener Satz, weil der Client sie erst bei Bedarf lädt. */
export function buildOutfits(): Record<string, Sheet> {
  const out: Record<string, Sheet> = {};
  for (const key of Object.keys(OUTFITS)) out[key] = buildCharSheet(key);
  return out;
}
