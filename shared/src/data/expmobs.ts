/**
 * Gegner der Expeditionen (0.9): die Mini-Bosse (MINI_LIST in expeditions.ts) und die Helfer der Bossmechaniken.
 * Alle benutzen vorhandene Sprites (eingefärbt und vergrößert). enemies.ts hängt sie über `expEnemies` an die Gegnerliste an.
 */
import type { EnemyDef } from './enemies';
import { MINI_LIST } from './expeditions';

/** Helfer der Signaturmechaniken (server/src/expedition/bossmech.ts) – stehen still, sind aber angreifbar */
const MECH: EnemyDef[] = [
  { id: 'xm_knospe', name: 'Dornenknospe', element: 'earth', hpMul: 2.2, dmgMul: 0.9, defMul: 0.7, xpMul: 0.3, speed: 0, radius: 10, ai: 'ranged', aggro: 180,
    atk: { range: 170, windup: 0.9, cd: 3.2, proj: { spr: 'spore', speed: 80, count: 3, spread: 30 } }, sprite: 'pilzling', tint: 0xff6a8a, scale: 1.5, named: true, weak: ['fire'] },
  { id: 'xm_prisma', name: 'Prismensäule', element: 'light', hpMul: 9, dmgMul: 0, defMul: 4, xpMul: 0, speed: 0, radius: 12, ai: 'chase', aggro: 0,
    atk: { range: 0, windup: 9, cd: 99 }, sprite: 'kristallkrabbler', tint: 0xd8f8ff, scale: 1.6, named: true },
  { id: 'xm_folio', name: 'Lebender Foliant', element: 'wind', hpMul: 2.4, dmgMul: 1, defMul: 0.8, xpMul: 0.3, speed: 0, radius: 10, ai: 'ranged', aggro: 200,
    atk: { range: 180, windup: 0.8, cd: 2.8, proj: { spr: 'orb', speed: 90 } }, sprite: 'arkanauge', tint: 0xfff0c0, scale: 1.3, named: true },
  { id: 'xm_eisspiegel', name: 'Eisspiegel', element: 'water', hpMul: 2.6, dmgMul: 0.8, defMul: 1.2, xpMul: 0.3, speed: 0, radius: 10, ai: 'ranged', aggro: 200,
    atk: { range: 160, windup: 1, cd: 3, proj: { spr: 'shard', speed: 100 } }, sprite: 'frostwisp', tint: 0xffffff, scale: 1.6, named: true },
];

/** Gegnerdefinitionen der Mini-Bosse: Angriff der Sprite-Art, aber kräftiger; Name über dem Kopf */
export function expEnemies(base: EnemyDef[]): EnemyDef[] {
  const by = new Map(base.map(e => [e.id, e]));
  const minis = MINI_LIST.map((m): EnemyDef => {
    const src = by.get(m.sprite)!;
    return { id: m.id, name: m.name, element: m.element, hpMul: m.hpMul, dmgMul: m.dmgMul, defMul: m.defMul, xpMul: 7, speed: m.speed, radius: m.radius, ai: m.ai,
      move: src.move, flying: src.flying, aggro: 170, atk: { ...src.atk, mult: (src.atk.mult ?? 1) * 1.2 }, sprite: m.sprite, tint: m.tint, scale: m.scale, named: true,
      weak: src.element === m.element ? src.weak : undefined, resist: src.element === m.element ? src.resist : undefined };
  });
  return [...minis, ...MECH];
}
