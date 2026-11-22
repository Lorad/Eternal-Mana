import type { Px } from '../draw';
import { Frames } from './kit';
import { scCritters } from './sc_critters';
import { scNature } from './sc_nature';
import { scRelics } from './sc_relics';

/** Objektgrafiken (v2) – Modul "schatten" (Schattenreich). Liefert benannte Frames; gleichnamige v1-Frames werden ersetzt. */
export function schattenObjects(): Array<[string, Px]> {
  const out: Frames = [];
  scNature(out);
  scRelics(out);
  scCritters(out);
  return out;
}
