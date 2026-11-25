import type { Px } from '../draw';
import { cmInteract } from './cm_interact';
import { cmDungeon } from './cm_dungeon';
import { cmStory } from './cm_story';
import { cmHome } from './cm_home';
import { cmPets } from './cm_pets';
import { cmHof } from './cm_hof';

/** Objektgrafiken (v2) – Modul "common". Liefert benannte Frames; gleichnamige v1-Frames werden ersetzt. */
export function commonObjects(): Array<[string, Px]> {
  const out: Array<[string, Px]> = [];
  cmInteract(out);
  cmDungeon(out);
  cmStory(out);
  cmHome(out);
  cmPets(out);
  cmHof(out);
  return out;
}
