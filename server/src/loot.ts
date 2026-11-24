/**
 * Handwerks-Beute (0.4): Rohstoffe von Gegnern, Bossen, Truhen und Abbaustellen.
 * Beute bleibt persönlich – jede Funktion würfelt für genau einen Spieler. Chancen: CFG.loot.
 */
import { CFG } from '../../shared/src/config';
import { knowsRecipe, makeSetPiece } from '../../shared/src/craft';
import { makeStack } from '../../shared/src/data/items';
import { AETHER, BIOME_MATS, BOSS_CORE, ESSENCE } from '../../shared/src/data/materials';
import { LEARNABLE, RECIPES, scrollOf } from '../../shared/src/data/recipes';
import { SET_BY_BOSS, SET_BY_DUNGEON, type SetPiece } from '../../shared/src/data/sets';
import type { Element } from '../../shared/src/types';
import type { Player } from './player';
import type { Mob, Zone } from './zone';

const essenceOf = (el: Element): string | undefined => (ESSENCE as Record<string, string>)[el];

/** Eine Rezeptrolle, die der Spieler noch nicht kennt und nicht schon bei sich trägt (passend zur Stufe des Gebiets). */
export function pickScroll(z: Zone, p: Player, prefer?: string): string | null {
  const maxLvl = z.def.level[1] + 4;
  const open = LEARNABLE.filter(r => !knowsRecipe(p.char, r) && !p.countItem(scrollOf(r.id)) && r.level <= maxLvl && (!r.cls || r.cls === p.char.cls));
  if (!open.length) return null;
  if (prefer && open.some(r => r.id === prefer)) return scrollOf(prefer);
  return scrollOf(z.rng.pick(open).id);
}

/** Rohstoffe eines besiegten Gegners: Monster-Rohstoff und Zutat des Bioms, Essenz seines Elements, selten Ätherstaub. */
export function rollMaterials(z: Zone, p: Player, m: Mob) {
  const L = CFG.loot, r = z.rng, k = m.elite ? L.eliteMatMul : 1;
  const at = () => [m.x + r.range(-10, 10), m.y + r.range(-8, 8)] as const;
  const bio = BIOME_MATS[z.def.biome];
  if (bio) {
    if (r.chance(L.monsterMatChance * k)) z.dropItemFor(p, makeStack(bio.monster, m.elite ? r.int(1, 2) : 1), ...at());
    if (r.chance(L.ingredientChance * k)) z.dropItemFor(p, makeStack(bio.ingredient), ...at());
  }
  const ess = essenceOf(m.def.element);
  if (ess) {
    if (m.elite) z.dropItemFor(p, makeStack(ess, r.int(L.eliteEssence[0], L.eliteEssence[1])), ...at());
    else if (r.chance(L.essenceChance)) z.dropItemFor(p, makeStack(ess), ...at());
  }
  if (!m.elite) return;
  if (r.chance(L.aetherElite)) z.dropItemFor(p, makeStack(AETHER), ...at());
  if (r.chance(L.scrollElite)) { const s = pickScroll(z, p); if (s) z.dropItemFor(p, makeStack(s), ...at()); }
}

/** Belohnung für einen Bosssieg: Bosskern (erster Sieg garantiert), Essenzen, selten Ätherstaub. */
export function bossLoot(z: Zone, p: Player, bossId: string, element: Element, first: boolean) {
  const L = CFG.loot, r = z.rng;
  const core = BOSS_CORE[bossId];
  if (core && (first || r.chance(L.bossCoreRepeat))) p.give(makeStack(core));
  const ess = essenceOf(element);
  if (ess) p.give(makeStack(ess, r.int(L.bossEssence[0], L.bossEssence[1])));
  if (r.chance(L.aetherBoss)) p.give(makeStack(AETHER));
}

/** Zusätzlicher Truheninhalt: Monster-Rohstoffe, Rezeptrollen und – in Dungeons – Teile des dortigen Sets. */
export function chestExtras(z: Zone, p: Player, tier: string, boss: boolean) {
  const L = CFG.loot, r = z.rng;
  const bio = BIOME_MATS[z.def.biome];
  if (bio && tier !== 'wood') p.give(makeStack(bio.monster, r.int(1, tier === 'gold' ? 3 : 2)));
  if (bio && r.chance(0.5)) p.give(makeStack(bio.ingredient, r.int(1, 2)));
  const set = (z.def.boss && SET_BY_BOSS[z.def.boss]) || SET_BY_DUNGEON[z.id];
  if (boss) {
    if (set) {
      // erstes Öffnen: garantiert ein Schmuckstück des Sets, danach mit Chance ein beliebiges Teil
      const key = `sd:${set.id}`;
      const first = !p.char.flags[key];
      if (first || r.chance(L.setPieceBoss)) {
        const piece: SetPiece = first ? r.pick(['ring', 'amulet']) : r.weighted([['ring', 3], ['amulet', 3], ['helm', 1], ['armor', 1]] as const);
        p.char.flags[key] = 1; p.sync('flags');
        p.give(makeSetPiece(r, set.id, piece, p.char.cls));
      }
    }
    if (r.chance(L.scrollBoss)) {
      const master = set ? `f_master_${set.tier}` : undefined;
      const s = pickScroll(z, p, master && RECIPES[master] ? master : undefined);
      if (s) p.give(makeStack(s));
    }
    return;
  }
  if (set && r.chance(L.setPieceChest[tier] ?? 0)) p.give(makeSetPiece(r, set.id, r.pick(['ring', 'amulet']), p.char.cls));
  if (r.chance(L.scrollChest[tier] ?? 0)) { const s = pickScroll(z, p); if (s) p.give(makeStack(s)); }
}

/** Zutat des Bioms als Beifang beim Abbauen einer Rohstoffstelle. */
export function nodeBonus(z: Zone, p: Player) {
  const bio = BIOME_MATS[z.def.biome];
  if (bio && z.rng.chance(CFG.loot.nodeBonusChance)) p.give(makeStack(bio.ingredient));
}
