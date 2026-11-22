import type { Px } from '../draw';
import { Frames } from './kit';
import { ruCamp } from './ru_camp';
import { ruCritters } from './ru_critters';
import { ruNature } from './ru_nature';
import { ruStone } from './ru_stone';

/** Objektgrafiken (v2) – Modul "ruinen" (Verlorene Ruinen). Liefert benannte Frames; gleichnamige v1-Frames werden ersetzt. */
export function ruinenObjects(): Array<[string, Px]> {
  const out: Frames = [];
  ruNature(out);
  ruStone(out);
  ruCamp(out);
  ruCritters(out);
  return out;
}
