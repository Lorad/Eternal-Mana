/**
 * Handwerk (0.4) – gemeinsame Regeln für Server und Oberfläche: Kosten, Prüfungen mit klaren Ablehnungsgründen
 * und das Erzeugen der Ergebnisse. Der Server prüft zusätzlich die Nähe zur Station (server/src/craft.ts).
 */
import { CFG } from './config';
import { CLASSES } from './data/classes';
import { ITEMS, TIER_MATERIAL, generateGear, isGear, newUid, rollAffixes, rollRarity, tierOf } from './data/items';
import { ELEMENT_CORE, ESSENCE, TIER_MONSTER } from './data/materials';
import { ENCHANTS, FIRE, HOME_AT, HOME_STATIONS, STATION_NPCS, type EnchantDef, type InfuseElement, type RecipeDef, type StationId } from './data/recipes';
import { SETS, setPieceName, type SetPiece } from './data/sets';
import type { CharData, ClassId, ItemInstance } from './types';
import type { Rng } from './util/rng';

export interface Cost { gold: number; mats: [string, number][] }

export function knowsRecipe(c: CharData, r: RecipeDef): boolean { return r.unlock === 'start' || !!c.recipes?.includes(r.id); }
export function countItem(c: CharData, base: string): number { let n = 0; for (const it of c.inv) if (it.base === base) n += it.qty ?? 1; return n; }
/** Stationen, die `at` (NPC-ID oder 'fire') anbietet */
export function stationsOf(at: string): StationId[] { return at === FIRE ? ['cooking'] : at === HOME_AT ? HOME_STATIONS : STATION_NPCS[at] ?? []; }

/** Gegenstandsstufe geschmiedeter Ausrüstung: die eigene Stufe, begrenzt auf den Bereich der Materialstufe. */
export function tierIlvl(tier: number, level: number): number {
  const lo = (tier - 1) * 5 + 1, hi = tier >= 6 ? CFG.player.maxLevel : tier * 5;
  return Math.max(lo, Math.min(hi, level));
}
export function legendIlvl(level: number): number { return Math.max(CFG.craft.legendMinIlvl, Math.min(CFG.player.maxLevel, level)); }

/** Basis-Gegenstand, den ein Rezept für diese Klasse ergibt (für Icon und Namen). */
export function recipeBase(r: RecipeDef, cls: ClassId): string {
  const c = CLASSES[cls], o = r.out;
  switch (o.k) {
    case 'item': return o.item;
    case 'legend': return 'leg_' + cls;
    case 'set': { const t = tierOf(SETS[o.set].ilvl); return o.piece === 'helm' ? `h_${c.armor}_${t}` : o.piece === 'armor' ? `a_${c.armor}_${t}` : `c_${o.piece}_${t}`; }
    case 'gear': return o.kind === 'weapon' ? `w_${c.weapon}_${o.tier}` : o.kind === 'helm' ? `h_${c.armor}_${o.tier}` : o.kind === 'armor' ? `a_${c.armor}_${o.tier}` : `c_${o.kind}_${o.tier}`;
  }
}
export function recipeLabel(r: RecipeDef, cls: ClassId): string {
  if (r.name) return r.name;
  const b = ITEMS[recipeBase(r, cls)];
  return (b?.name ?? r.id) + (r.out.k === 'item' && r.out.qty > 1 ? ` ×${r.out.qty}` : '');
}

/** Passt das Ergebnis ins Inventar, nachdem `consumed` entnommen wurde? */
export function invFits(c: CharData, base: string, slots: number, consumed: [string, number][]): boolean {
  let free = CFG.player.invSize - c.inv.length;
  for (const [b, n] of consumed) if (n > 0 && countItem(c, b) === n) free += c.inv.filter(i => i.base === b).length;
  if (ITEMS[base]?.stack && c.inv.some(i => i.base === base) && !consumed.some(([b, n]) => b === base && countItem(c, b) === n)) return true;
  return free >= slots;
}
function missing(c: CharData, cost: Cost): string | null {
  if (c.gold < cost.gold) return 'Nicht genug Gold.';
  for (const [b, n] of cost.mats) if (countItem(c, b) < n) return `Es fehlt: ${n}× ${ITEMS[b]?.name ?? b} (du hast ${countItem(c, b)}).`;
  return null;
}

// ------------------------------------------------------------------ Herstellen
export function recipeCost(r: RecipeDef, n = 1): Cost { return { gold: r.gold * n, mats: r.inputs.map(([b, q]) => [b, q * n]) }; }
/** Grund, warum `n`-mal Herstellen nicht geht – oder null. */
export function craftBlock(c: CharData, r: RecipeDef, n = 1): string | null {
  if (!knowsRecipe(c, r)) return 'Dieses Rezept kennst du noch nicht.';
  if (r.cls && r.cls !== c.cls) return `Nur für die Klasse ${CLASSES[r.cls].name}.`;
  if (c.level < r.level) return `Benötigt Stufe ${r.level}.`;
  const cost = recipeCost(r, n);
  const miss = missing(c, cost);
  if (miss) return miss;
  if (!invFits(c, recipeBase(r, c.cls), r.out.k === 'item' ? 1 : n, cost.mats)) return 'Inventar voll.';
  return null;
}
export function makeSetPiece(rng: Rng, setId: string, piece: SetPiece, cls: ClassId, rarity?: number): ItemInstance {
  const s = SETS[setId];
  const acc = piece === 'ring' || piece === 'amulet' ? piece : undefined;
  const it = generateGear(rng, s.ilvl, rarity ?? rollRarity(rng, CFG.craft.setWeights), cls, acc ? 'accessory' : (piece as 'helm' | 'armor'), acc);
  delete it.element;
  it.set = setId; it.name = setPieceName(s, piece);
  return it;
}
export function makeLegendary(rng: Rng, cls: ClassId, level: number): ItemInstance {
  const ilvl = legendIlvl(level);
  return { uid: newUid(), base: 'leg_' + cls, rarity: 4, ilvl, up: 0, affixes: rollAffixes(rng, ilvl, 4, cls, true) };
}
/** Erzeugt das Ergebnis eines Rezepts (ohne Kosten abzuziehen). */
export function makeCrafted(rng: Rng, r: RecipeDef, c: CharData, n = 1): ItemInstance {
  const o = r.out;
  switch (o.k) {
    case 'item': return { uid: newUid(), base: o.item, rarity: 0, ilvl: 1, up: 0, affixes: [], qty: o.qty * n };
    case 'legend': return makeLegendary(rng, c.cls, c.level);
    case 'set': return makeSetPiece(rng, o.set, o.piece, c.cls);
    case 'gear': {
      const acc = o.kind === 'ring' || o.kind === 'amulet' || o.kind === 'charm' ? o.kind : undefined;
      const it = generateGear(rng, tierIlvl(o.tier, c.level), rollRarity(rng, o.master ? CFG.craft.masterWeights : CFG.craft.gearWeights), c.cls, acc ? 'accessory' : (o.kind as 'weapon' | 'helm' | 'armor'), acc);
      delete it.element; // das Element bestimmt der Schmied erst beim Einschmieden
      return it;
    }
  }
}

// ------------------------------------------------------------------ Umschmieden
export function reforgeCost(it: ItemInstance): Cost {
  const t = tierOf(it.ilvl) - 1;
  return { gold: CFG.craft.reforgeGold(it.ilvl, it.rarity), mats: [[TIER_MATERIAL[t], CFG.craft.reforgeMats], [TIER_MONSTER[t], CFG.craft.reforgeMats]] };
}
export function reforgeBlock(c: CharData, it: ItemInstance): string | null {
  const b = ITEMS[it.base];
  if (!b || !isGear(b)) return 'Nur Ausrüstung lässt sich umschmieden.';
  if (CFG.loot.affixCount[it.rarity] < 1) return 'Gewöhnliche Gegenstände haben keine Eigenschaften, die sich neu würfeln ließen.';
  return missing(c, reforgeCost(it));
}

// ------------------------------------------------------------------ Element einschmieden
/** Zielstufe und Kosten, wenn `el` in die Waffe geschmiedet wird; null = nicht möglich. */
export function infusePlan(it: ItemInstance, el: InfuseElement): { level: number; cost: Cost } | null {
  if (ITEMS[it.base]?.kind !== 'weapon' || !ESSENCE[el]) return null;
  const level = it.element === el ? Math.max(1, it.elv ?? 1) + 1 : 1;
  if (level > 3) return null;
  const mats: [string, number][] = [[ESSENCE[el], CFG.craft.infuseEssences[level - 1]]];
  if (level === 3) mats.push([ELEMENT_CORE[el], 1]);
  return { level, cost: { gold: CFG.craft.infuseGold(it.ilvl, level), mats } };
}
export function infuseBlock(c: CharData, it: ItemInstance, el: InfuseElement): string | null {
  if (ITEMS[it.base]?.kind !== 'weapon') return 'Nur Waffen können ein Element tragen.';
  const plan = infusePlan(it, el);
  if (!plan) return 'Die höchste Elementstufe ist bereits erreicht.';
  return missing(c, plan.cost);
}

// ------------------------------------------------------------------ Verzaubern
export function enchantCost(e: EnchantDef): Cost { return { gold: e.gold, mats: e.cost }; }
export function enchantFits(it: ItemInstance, e: EnchantDef): boolean { const k = ITEMS[it.base]?.kind; return !!k && (e.slots as string[]).includes(k); }
export function enchantBlock(c: CharData, it: ItemInstance, id: string): string | null {
  const e = ENCHANTS[id], b = ITEMS[it.base];
  if (!e || !b || !isGear(b)) return 'Das lässt sich nicht verzaubern.';
  if (!enchantFits(it, e)) return 'Diese Rune passt nicht auf diesen Gegenstand.';
  if (it.ench === id) return 'Der Gegenstand trägt diese Rune bereits.';
  if (c.level < e.level) return `Benötigt Stufe ${e.level}.`;
  return missing(c, enchantCost(e));
}
