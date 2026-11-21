/** Animationslogik für die Sprite-Sheets (Layouts siehe client/src/gfx/spec.ts). */
import { BOSS_ANIMS, CHAR_ANIMS, CHAR_COLS, MOB_ANIMS, type AnimDef, type CharAnim } from '../gfx/spec';

/** Frame-Spalte einer Animation zu einer Laufzeit (ms seit Animationsbeginn). */
export function animCol(def: AnimDef, t: number): number {
  const i = Math.max(0, Math.floor((t * def.fps) / 1000));
  return def.start + (def.loop ? i % def.len : Math.min(def.len - 1, i));
}
export function animDone(def: AnimDef, t: number): boolean { return !def.loop && t >= (def.len * 1000) / def.fps; }
export function animDuration(def: AnimDef): number { return (def.len * 1000) / def.fps; }

/** Blickrichtung (rad) → [Zeile, gespiegelt] */
export function dirOf(a: number): [number, boolean] {
  const abs = Math.abs(a);
  if (abs < Math.PI * 0.3) return [1, false];
  if (abs > Math.PI * 0.7) return [1, true];
  return [a > 0 ? 0 : 2, false];
}
export function charFrame(anim: CharAnim, row: number, t: number): string {
  return String(row * CHAR_COLS + animCol(CHAR_ANIMS[anim], t));
}
export type MobAnim = keyof typeof MOB_ANIMS;
export type BossAnim = keyof typeof BOSS_ANIMS;
export function mobFrame(anim: MobAnim, t: number): string { return String(animCol(MOB_ANIMS[anim], t)); }
export function bossFrame(anim: BossAnim, t: number): string { return String(animCol(BOSS_ANIMS[anim], t)); }
export { BOSS_ANIMS, CHAR_ANIMS, MOB_ANIMS };
export type { CharAnim };
