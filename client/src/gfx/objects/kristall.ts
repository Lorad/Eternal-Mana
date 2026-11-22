import type { Px } from '../draw';
import { Frames } from './kit';
import { krCritters } from './kr_critters';
import { krMine } from './kr_mine';
import { krNature } from './kr_nature';

/** Objektgrafiken (v2) – Modul "kristall" (Kristallhöhlen). Liefert benannte Frames; gleichnamige v1-Frames werden ersetzt. */
export function kristallObjects(): Array<[string, Px]> {
  const out: Frames = [];
  krNature(out);
  krMine(out);
  krCritters(out);
  return out;
}
