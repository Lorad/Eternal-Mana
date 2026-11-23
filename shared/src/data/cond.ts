/**
 * Bedingungen auf dem Charakterstand – gemeinsam genutzt von NPC-Zeilen, Dialogen, Quests, Filmszenen und Weltobjekten.
 * Alle Felder eines Objekts müssen zutreffen (UND); `any` verknüpft Alternativen (ODER).
 *
 * Story-Flags in `CharData.flags`:
 *   `d:<id>` Entscheidung (Wert = gewählte Option) · `l:<id>` Chronik-Dokument gefunden · `h:<element>` Hüter-Erinnerung ·
 *   `e:<id>` Echo-Begegnung bestanden · `v:<ort>` Ort besucht (Questziel) · `q:<name>` Gesprächs-Fortschritt ·
 *   `k:<id>` Filmszene gesehen · `ch` höchstes angezeigtes Kapitel
 */
import type { CharData } from '../types';

export interface Cond {
  /** Quest abgeschlossen / aktiv / nicht abgeschlossen */
  done?: string; active?: string; notDone?: string;
  /** Quest aktiv oder abgeschlossen / weder noch */
  started?: string; notStarted?: string;
  flag?: string; noFlag?: string;
  /** Entscheidung `id` hat den Wert `v` / hat ihn nicht */
  dec?: [string, number]; decNot?: [string, number];
  decided?: string; undecided?: string;
  /** mindestens so viele Hüter-Erinnerungen / Chronik-Dokumente */
  minMem?: number; minLore?: number;
  all?: Cond[]; any?: Cond[]; not?: Cond;
}

/** Die sieben Hüter-Erinnerungen (sechs Schreine + Vael). */
export const MEMORY_KEYS = ['earth', 'light', 'fire', 'water', 'wind', 'heart', 'dark'] as const;
export type MemoryKey = (typeof MEMORY_KEYS)[number];

export function countMemories(c: CharData): number {
  let n = 0;
  for (const k of MEMORY_KEYS) if (c.flags[`h:${k}`]) n++;
  return n;
}
export function countLore(c: CharData): number {
  let n = 0;
  for (const k in c.flags) if (k.startsWith('l:')) n++;
  return n;
}
export function decisionOf(c: CharData, id: string): number { return c.flags[`d:${id}`] ?? 0; }

export function condOk(c: CharData, cond: Cond | undefined): boolean {
  if (!cond) return true;
  const q = c.quests, f = c.flags;
  if (cond.done && q[cond.done]?.s !== 'done') return false;
  if (cond.active && q[cond.active]?.s !== 'active') return false;
  if (cond.notDone && q[cond.notDone]?.s === 'done') return false;
  if (cond.started && !q[cond.started]) return false;
  if (cond.notStarted && q[cond.notStarted]) return false;
  if (cond.flag && !f[cond.flag]) return false;
  if (cond.noFlag && f[cond.noFlag]) return false;
  if (cond.dec && (f[`d:${cond.dec[0]}`] ?? 0) !== cond.dec[1]) return false;
  if (cond.decNot && (f[`d:${cond.decNot[0]}`] ?? 0) === cond.decNot[1]) return false;
  if (cond.decided && !f[`d:${cond.decided}`]) return false;
  if (cond.undecided && f[`d:${cond.undecided}`]) return false;
  if (cond.minMem !== undefined && countMemories(c) < cond.minMem) return false;
  if (cond.minLore !== undefined && countLore(c) < cond.minLore) return false;
  if (cond.all && !cond.all.every(x => condOk(c, x))) return false;
  if (cond.any && !cond.any.some(x => condOk(c, x))) return false;
  if (cond.not && condOk(c, cond.not)) return false;
  return true;
}
