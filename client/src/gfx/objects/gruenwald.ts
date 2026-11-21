import type { Px } from '../draw';
import { gwTrees } from './gw_trees';
import { gwPlants } from './gw_plants';
import { gwHouses } from './gw_houses';

/** Objektgrafiken (v2) – Modul "gruenwald". Liefert benannte Frames; gleichnamige v1-Frames werden ersetzt. */
export function gruenwaldObjects(): Array<[string, Px]> {
  const out: Array<[string, Px]> = [];
  gwTrees(out);
  gwPlants(out);
  gwHouses(out);
  return out;
}
