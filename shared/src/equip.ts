/**
 * Ausrüstung mit zehn Plätzen (0.9): Platzregeln, Überführung alter Spielstände und der Vergleich für die Oberfläche.
 * Grundwerte und Budgets je Platz: data/items.ts (GEAR_BUDGET, AFFIX_SCALE) · Verbessern: data/upgrade.ts · Sets: data/sets.ts
 *
 * Plätze je Klasse (Rüstungsklasse und Zweithand aus CLASS_OFFHAND):
 *   Krieger      Schwert · Schild           · schwere Rüstung (Helm, Brust, Handschuhe, Beine, Schuhe)
 *   Paladin      Hammer  · Schild           · schwere Rüstung
 *   Waldläufer   Bogen   · Köcher           · leichte Rüstung
 *   Schattenj.   Dolche  · Parierdolch      · leichte Rüstung
 *   Magier       Stab    · Foliant o. Fokus · Stoffrüstung
 *   alle         Amulett (auch Talisman) · zwei Ringe
 *
 * Überführung (bis 0.8 gab es `acc1`/`acc2` für Ring, Amulett und Talisman):
 *   Ring → `ring1`, ein zweiter Ring → `ring2` · Amulett und Talisman → `amulet` (der Talisman bleibt, was er ist – er belegt
 *   jetzt den Amulettplatz) · ein zweites Amulett/Talisman → Rucksack (auch über die Rucksackgröße hinaus; nichts geht verloren).
 *   Werte, Eigenschaften, Verbesserungsstufe, Element, Rune und Set bleiben unverändert. Weil Hauptwaffe, Helm, Brust und Ring
 *   ihr Grundbudget mit den neuen Plätzen teilen, legt Borin jedem überführten Charakter für die neuen, noch leeren Plätze
 *   einfache Stücke (gewöhnlich, ohne Eigenschaften, mit Gegenstands- und Verbesserungsstufe der bisherigen Ausrüstung im Mittel) bei – so steht er nach dem Laden so stark da wie vorher.
 */
import { CFG } from './config';
import { CLASS_OFFHAND, ITEMS, generateGear, gearBase, itemMods, newUid, slotKind, slotsFor, tierOf, type GenKind } from './data/items';
import type { AnySlot, CharData, ItemInstance, LegacySlot, ModKey, Mods, Slot } from './types';
import { LEGACY_SLOTS, MOD_LABEL, SLOTS } from './types';

/** Aktueller Stand des Ausrüstungsmodells (CharData.eqv) */
export const EQUIP_VERSION = 2;

/** Alle angelegten Teile – auch solche auf alten Plätzen, falls ein Stand noch nicht überführt ist */
export function equippedItems(c: Pick<CharData, 'equip'>): ItemInstance[] {
  const out: ItemInstance[] = [];
  for (const s of SLOTS) { const it = c.equip[s]; if (it) out.push(it); }
  for (const s of LEGACY_SLOTS) { const it = c.equip[s]; if (it) out.push(it); }
  return out;
}
/** Platz, auf dem ein Teil mit dieser uid angelegt ist */
export function equippedSlot(c: Pick<CharData, 'equip'>, uid: string): AnySlot | undefined {
  return [...SLOTS, ...LEGACY_SLOTS].find(s => c.equip[s]?.uid === uid);
}
/** Alter Platzname → neuer (für Nachrichten alter Clients): `acc1` → `ring1`, `acc2` → `ring2` */
export function normSlot(s: unknown): Slot | null {
  if (s === 'acc1') return 'ring1';
  if (s === 'acc2') return 'ring2';
  return (SLOTS as unknown[]).includes(s) ? (s as Slot) : null;
}

/**
 * Wohin kommt ein Teil beim Anlegen? `want` = gewünschter Platz (Ringe: `ring1`/`ring2`, alte Namen erlaubt).
 * Ringe: gewünschter Platz, sonst der erste freie, sonst `ring1`. null = passt nirgends hin.
 */
export function targetSlot(c: Pick<CharData, 'equip'>, base: string, want?: unknown): Slot | null {
  const slots = slotsFor(ITEMS[base]);
  if (!slots.length) return null;
  const w = normSlot(want);
  if (w && slots.includes(w)) return w;
  return slots.find(s => !c.equip[s]) ?? slots[0];
}

// ------------------------------------------------------------------ Vergleich (ohne Oberfläche, für Tooltips und Tests)
/** Angelegte Teile, mit denen `it` zu vergleichen ist: derselbe Platz – bei Ringen beide Ringe (nur belegte). */
export function compareTargets(c: Pick<CharData, 'equip'>, it: ItemInstance): { slot: Slot; item: ItemInstance }[] {
  const out: { slot: Slot; item: ItemInstance }[] = [];
  for (const s of slotsFor(ITEMS[it.base])) { const e = c.equip[s]; if (e && e.uid !== it.uid) out.push({ slot: s, item: e }); }
  return out;
}
/** Unterschied der Werte (a − b) je Eigenschaft, gerundet auf eine Nachkommastelle, ohne Nullen; Reihenfolge wie MOD_LABEL */
export function modDelta(a: Mods, b: Mods): [ModKey, number][] {
  return (Object.keys(MOD_LABEL) as ModKey[]).map(k => [k, Math.round(((a[k] ?? 0) - (b[k] ?? 0)) * 10) / 10] as [ModKey, number]).filter(e => e[1] !== 0);
}
/** Vergleich eines Teils mit allem, was es ersetzen könnte. Ein leerer Platz zählt als `free` (dann ist anlegen immer ein Gewinn). */
export function compareItem(c: Pick<CharData, 'equip'>, it: ItemInstance): { free: Slot | null; rows: { slot: Slot; item: ItemInstance; delta: [ModKey, number][] }[] } {
  const slots = slotsFor(ITEMS[it.base]);
  const free = slots.find(s => !c.equip[s]) ?? null;
  const mine = itemMods(it);
  return { free, rows: compareTargets(c, it).map(t => ({ ...t, delta: modDelta(mine, itemMods(t.item)) })) };
}

// ------------------------------------------------------------------ Überführung alter Spielstände
/** Platz eines Teils von einem alten Schmuckplatz */
function legacyTarget(c: CharData, it: ItemInstance): Slot | null {
  const k = slotKind(ITEMS[it.base]);
  if (k === 'ring') return !c.equip.ring1 ? 'ring1' : !c.equip.ring2 ? 'ring2' : null;
  if (k) { const s = slotsFor(ITEMS[it.base])[0]; return !c.equip[s] ? s : null; }
  return null;
}

/**
 * Überführt die Ausrüstung eines Standes von vor 0.9 (in place). Gibt die Teile zurück, die in den Rucksack wandern mussten,
 * und die Teile, die Borin beigelegt hat. Idempotent: ein Stand mit `eqv` ≥ 2 wird nur noch von alten Platzschlüsseln befreit.
 */
export function migrateEquip(c: CharData): { toBag: ItemInstance[]; granted: ItemInstance[] } {
  const toBag: ItemInstance[] = [], granted: ItemInstance[] = [];
  const legacy = !(c.eqv && c.eqv >= EQUIP_VERSION);
  const ilvls: number[] = [], ups: number[] = [];
  for (const s of [...SLOTS, ...LEGACY_SLOTS]) { const it = c.equip[s]; if (it && ITEMS[it.base]) { ilvls.push(it.ilvl); ups.push(Math.max(0, Math.min(CFG.upgrade.max, it.up | 0))); } }
  for (const s of LEGACY_SLOTS as LegacySlot[]) {
    const it = c.equip[s];
    if (!it) { delete c.equip[s]; continue; }
    delete c.equip[s];
    const to = legacyTarget(c, it);
    if (to) c.equip[to] = it; else toBag.push(it);
  }
  // Teile, die auf einem Platz liegen, der nicht zu ihnen passt (beschädigte Stände), wandern in den Rucksack
  for (const s of SLOTS) {
    const it = c.equip[s];
    if (it && !slotsFor(ITEMS[it.base]).includes(s)) { delete c.equip[s]; toBag.push(it); }
  }
  if (legacy && ilvls.length) {
    const ilvl = Math.max(1, Math.round(ilvls.reduce((a, b) => a + b, 0) / ilvls.length));
    // Verbesserungsstufe wie die bisherige Ausrüstung im Mittel (höchstens +9: die Passiven der Stufe +10 verdient man sich)
    const up = Math.min(CFG.upgrade.max - 1, Math.round(ups.reduce((a, b) => a + b, 0) / ups.length));
    const grant = (slot: Slot, kind: GenKind, sub?: string) => {
      if (c.equip[slot]) return;
      const it: ItemInstance = { uid: newUid(), base: gearBase(c.cls, kind, tierOf(ilvl), sub), rarity: 0, ilvl, up, affixes: [] };
      if (!ITEMS[it.base]) return;
      c.equip[slot] = it; granted.push(it);
    };
    grant('offhand', 'offhand', CLASS_OFFHAND[c.cls][0]);
    grant('gloves', 'gloves'); grant('legs', 'legs'); grant('boots', 'boots');
    if (c.equip.ring1) grant('ring2', 'accessory', 'ring');
  }
  c.eqv = EQUIP_VERSION;
  return { toBag, granted };
}

/** Startausrüstung neuer Charaktere (0.9): Waffe, Zweithand, Brust, Handschuhe – zusammen so stark wie früher Waffe und Rüstung */
export function starterGear(cls: CharData['cls']): Partial<Record<Slot, ItemInstance>> {
  const mk = (uid: string, kind: GenKind) => ({ uid, base: gearBase(cls, kind, 1, CLASS_OFFHAND[cls][0]), rarity: 0, ilvl: 1, up: 0, affixes: [] as ItemInstance['affixes'] });
  return { weapon: mk('start-w', 'weapon'), offhand: mk('start-o', 'offhand'), armor: mk('start-a', 'armor'), gloves: mk('start-g', 'gloves') };
}

/** Für Entwickler und Tests: ein voller Satz zufälliger Ausrüstung (alle zehn Plätze) */
export function fullKit(rng: Parameters<typeof generateGear>[0], ilvl: number, rarity: number, cls: CharData['cls']): Partial<Record<Slot, ItemInstance>> {
  const g = (k: GenKind, acc?: 'ring' | 'amulet') => generateGear(rng, ilvl, rarity, cls, k, acc);
  return { weapon: g('weapon'), offhand: g('offhand'), helm: g('helm'), armor: g('armor'), gloves: g('gloves'), legs: g('legs'), boots: g('boots'),
    amulet: g('accessory', 'amulet'), ring1: g('accessory', 'ring'), ring2: g('accessory', 'ring') };
}
/** Größe des Rucksacks inklusive der Plätze, die eine Überführung zusätzlich belegen darf */
export const INV_MIGRATION_SLACK = LEGACY_SLOTS.length;
export const invCap = () => CFG.player.invSize + INV_MIGRATION_SLACK;
