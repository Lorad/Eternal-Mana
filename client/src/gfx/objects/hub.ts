/** Objektgrafiken (v2) – Modul "hub": Quellwarte (Fassaden, Platzmöbel) und Expeditionen (Portale, Siegel, Regionsdeko). */
import type { Px } from '../draw';
import { hubBuildings } from './hub_buildings';
import { hubProps } from './hub_props';
import { expObjects } from './exp_objects';

export function hubObjects(): Array<[string, Px]> {
  const out: Array<[string, Px]> = [];
  hubBuildings(out);
  hubProps(out);
  expObjects(out);
  return out;
}
