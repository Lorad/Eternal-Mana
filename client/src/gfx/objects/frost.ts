import type { Px } from '../draw';
import { Frames } from './kit';
import { frCamp } from './fr_camp';
import { frCritters } from './fr_critters';
import { frNature } from './fr_nature';
import { frTrees } from './fr_trees';

/** Objektgrafiken (v2) – Modul "frost" (Frostgebirge). Liefert benannte Frames; gleichnamige v1-Frames werden ersetzt. */
export function frostObjects(): Array<[string, Px]> {
  const out: Frames = [];
  frTrees(out);
  frNature(out);
  frCamp(out);
  frCritters(out);
  return out;
}
