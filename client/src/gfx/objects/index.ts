/** Objekt-Atlas: führt die Biom-Module zusammen (spätere Module überschreiben gleichnamige Frames). */
import { Px, atlasSheet } from '../draw';
import type { Sheet } from '../spec';
import { commonObjects } from './common';
import { frostObjects } from './frost';
import { glutObjects } from './glut';
import { gruenwaldObjects } from './gruenwald';
import { kristallObjects } from './kristall';
import { ruinenObjects } from './ruinen';
import { schattenObjects } from './schatten';

/** Herkunft jedes Frames (für den Asset-Katalog): Framename → Modul */
export const objSource = new Map<string, string>();

export function buildObjects(): Sheet {
  const merged = new Map<string, Px>();
  const add = (mod: string, list: Array<[string, Px]>) => { for (const [n, px] of list) { merged.set(n, px); objSource.set(n, mod); } };
  add('common', commonObjects());
  add('gruenwald', gruenwaldObjects());
  add('kristall', kristallObjects());
  add('glut', glutObjects());
  add('frost', frostObjects());
  add('ruinen', ruinenObjects());
  add('schatten', schattenObjects());
  // Animierte v2-Frames (`name_0..n`) ersetzen gleichnamige Einzelbilder aus v1
  for (const n of [...merged.keys()]) if (merged.has(n + '_0')) { merged.delete(n); objSource.delete(n); }
  return atlasSheet([...merged], 2048);
}
