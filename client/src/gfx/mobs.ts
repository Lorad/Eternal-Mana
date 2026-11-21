/**
 * Gegner-Sprites v2: je Gegner eine Zeile mit 22 Frames laut MOB_ANIMS (idle 4, move 6, windup 2, attack 3, hit 2, death 5),
 * Blick nach rechts. Die Zeichenprogramme liegen je Biom in mobs/*.ts, gemeinsame Rigs in mobs/kit|slime|quad.ts.
 */
import { Px, gridSheet } from './draw';
import { P } from './palette';
import { MOB_ANIMS, MOB_FRAMES, MOB_IDS } from './spec';
import type { Sheet, SpriteMeta } from './spec';
import { ANIM_ORDER, TAU } from './mobs/kit';
import type { MobDef } from './mobs/kit';
import { GRUENWALD } from './mobs/gruenwald';
import { HOEHLEN } from './mobs/hoehlen';
import { GLUT } from './mobs/glut';
import { FROSTG } from './mobs/frost';
import { RUINEN } from './mobs/ruinen';
import { SCHATTEN } from './mobs/schatten';

const DEFS: Record<string, MobDef> = { ...GRUENWALD, ...HOEHLEN, ...GLUT, ...FROSTG, ...RUINEN, ...SCHATTEN };

/** Platzhalter, falls ein Gegner (noch) kein Zeichenprogramm hat – hält das Sheet-Raster stabil. */
const FALLBACK: MobDef = { w: 32, h: 32, fn: (p, fr) => { p.layer((l) => { l.ball(16, 21 + (fr.i & 1), 7, 6.5, P.stone, 1, 4); l.rect(16, 19, 2, 2, P.stone[0]); l.rect(20, 19, 2, 2, P.stone[0]); }); if (fr.a === 'death') p.alphaMul(1 - fr.i / 5); } };

export function buildMobFrames(id: string): { def: MobDef; frames: Px[] } {
  const def = DEFS[id] ?? FALLBACK, frames: Px[] = [];
  for (const a of ANIM_ORDER) {
    const n = MOB_ANIMS[a].len;
    for (let i = 0; i < n; i++) { const p = new Px(def.w, def.h); def.fn(p, { a, i, n, ph: (TAU * i) / n }); p.rect(0, def.h - 3, def.w, 3, 0); frames.push(p); }
  }
  return { def, frames };
}

export function buildMobs(): { mobs: Record<string, Sheet>; mobMeta: Record<string, SpriteMeta> } {
  const mobs: Record<string, Sheet> = {}, mobMeta: Record<string, SpriteMeta> = {};
  for (const id of MOB_IDS) {
    const { def, frames } = buildMobFrames(id);
    mobs[`mob_${id}`] = gridSheet(frames, MOB_FRAMES);
    mobMeta[id] = mobMeta[`mob_${id}`] = { w: def.w, h: def.h };
  }
  return { mobs, mobMeta };
}
