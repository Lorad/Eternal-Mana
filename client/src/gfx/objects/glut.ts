import type { Px } from '../draw';
import { Frames } from './kit';
import { glCamp } from './gl_camp';
import { glCritters } from './gl_critters';
import { glNature } from './gl_nature';

/** Objektgrafiken (v2) – Modul "glut" (Glutlande). Liefert benannte Frames; gleichnamige v1-Frames werden ersetzt. */
export function glutObjects(): Array<[string, Px]> {
  const out: Frames = [];
  glNature(out);
  glCamp(out);
  glCritters(out);
  return out;
}
