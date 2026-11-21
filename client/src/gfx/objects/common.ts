import type { Px } from '../draw';
import { cmInteract } from './cm_interact';
import { cmDungeon } from './cm_dungeon';

/** Objektgrafiken (v2) – Modul "common". Liefert benannte Frames; gleichnamige v1-Frames werden ersetzt. */
export function commonObjects(): Array<[string, Px]> {
  const out: Array<[string, Px]> = [];
  cmInteract(out);
  cmDungeon(out);
  return out;
}
