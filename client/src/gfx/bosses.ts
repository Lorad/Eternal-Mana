/**
 * Bosse (v2) → Sheet-Key `boss_<id>`: eine Zeile mit 26 Frames laut BOSS_ANIMS
 * (idle 6 · windup 2 · attack 4 · special 4 · hit 2 · death 8), Blick nach rechts bzw. frontal.
 * Standpunkt unten Mitte, 6 px über der Unterkante; schwebende Bosse halten sichtbaren Abstand.
 * bossMeta ist nach Boss-Id geschlüsselt (wie mobMeta).
 */
import { gridSheet } from './draw';
import { BOSS_FRAMES, BOSS_IDS } from './spec';
import type { Sheet, SpriteMeta } from './spec';
import { buildBoss } from './bosses/kit';
import type { BossDef } from './bosses/kit';
import { dornenmutter } from './bosses/dornenmutter';
import { kristallkoloss } from './bosses/kristallkoloss';
import { ignarok } from './bosses/ignarok';
import { ysolde } from './bosses/ysolde';
import { archivar } from './bosses/archivar';
import { hohlkoenig } from './bosses/hohlkoenig';
import { vael } from './bosses/vael';
import { aetherion } from './bosses/aetherion';

const DEFS: Record<(typeof BOSS_IDS)[number], BossDef> = { dornenmutter, kristallkoloss, ignarok, ysolde, archivar, hohlkoenig, vael, aetherion };

export function buildBosses(): { bosses: Record<string, Sheet>; bossMeta: Record<string, SpriteMeta> } {
  const bosses: Record<string, Sheet> = {}, bossMeta: Record<string, SpriteMeta> = {};
  for (const id of BOSS_IDS) {
    const d = DEFS[id];
    bosses[`boss_${id}`] = gridSheet(buildBoss(d), BOSS_FRAMES);
    bossMeta[id] = { w: d.w, h: d.h };
  }
  return { bosses, bossMeta };
}
