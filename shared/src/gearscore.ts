/**
 * Ausrüstungswert (GS, „Gear Score“) – EINE Formel für Server, Oberfläche, Tests und Skripte. Beschreibung, Konstanten,
 * Messtabelle und Stufen: docs/GEAR_SCORE.md. Empfehlungen für Inhalte (Expeditionen, Tiefen, Risse): data/gsreq.ts.
 *
 * Gespeichert wird nur die Ausrüstung; der Wert wird immer daraus berechnet (beim Laden, nach jeder Änderung). Ändert sich die
 * Formel, rechnen alte Charaktere von selbst mit der neuen.
 *
 *   Teil:      GS = Gewicht des Platzes × (Gegenstandsstufe + 2) × (Grundfaktor + 0,2 × Eigenschafts-Einheiten)
 *     Grundfaktor        = Seltenheitsfaktor × (1 + 8 % je Verbesserungsstufe) – genau der Faktor, mit dem das Spiel die
 *                          Grundwerte rechnet (data/items.ts, baseMods)
 *     Eigenschafts-Einh. = jede Eigenschaft im Verhältnis zu ihrer Normstärke auf dieser Stufe und diesem Platz (1 = eine
 *                          durchschnittlich gewürfelte Eigenschaft), dazu die Boni der Verbesserung (+3/+6/+9) und die Rune
 *                          auf dieselbe Weise, die Passive bei +10, die Elementstufe, die Sonderwirkung Legendärer Waffen und
 *                          benannte Unikate als feste Einheiten
 *     Gewicht des Platzes = Anteil des Platzes an den Eigenschaften (AFFIX_SCALE / 0,5, im Mittel 1). Er hängt nur am Platz,
 *                          nie an der Klasse: Schild, Köcher und Foliant zählen gleich, Robe wie Plattenpanzer.
 *   Charakter: Summe der zehn Plätze (leere zählen 0). Setboni zählen NICHT – sie zeigt die Oberfläche getrennt an.
 */
import { CFG, RARITY_COLOR } from './config';
import { AFFIX_SCALE, ITEMS, affixNominal, isGear, slotKind, slotsFor } from './data/items';
import { ENCHANTS } from './data/recipes';
import { upgradeBonus, type SlotKind } from './data/upgrade';
import { clampRarity } from './rarity';
import type { CharData, ItemInstance, ModKey, Mods, Slot } from './types';
import { SLOTS } from './types';

/** Alle Stellschrauben der Formel (docs/GEAR_SCORE.md erklärt jede) */
export const GS = {
  /** Versatz auf die Gegenstandsstufe – die Grundbudgets aller Plätze wachsen etwa mit (Stufe + 2) (GEAR_BUDGET) */
  levelOffset: 2,
  /** eine Eigenschaft in Normstärke ist so viel wert wie dieser Anteil des Grundbudgets eines gewöhnlichen Teils */
  affixUnit: 0.2,
  /** höchstens so viele Normstärken zählt eine einzelne Eigenschaft (sehr alte Teile, feste Resistenzen der Boss-Unikate) */
  affixCap: 2.5,
  /** Passive der Stufe +10 (data/upgrade.ts, UP10) – so viel wie eine Eigenschaft */
  up10: 1,
  /** Elementstufe einer Waffe 0..3 (eingeschmiedet oder gefunden) */
  element: [0, 0.5, 1, 1.5] as readonly number[],
  /** Sonderwirkung einer Legendären Waffe (LEGEND_TEXT) */
  legend: 3,
  /** benanntes Unikat (Boss-Unikate, Fraktionsstücke) – Setteile und Legendäre Waffen ausgenommen */
  unique: 0.5,
  /** Normstärken der Werte, die es nicht als würfelbare Eigenschaft gibt (aus Runen und Verbesserungsboni) */
  fixedNominal: { powerPct: 5, defPct: 6, hpPct: 4, mpPct: 6, resAll: 4, dodgeCdr: 8, healPct: 8 } as Partial<Record<ModKey, number>>,
} as const;

/** Gewicht eines Platzes: sein Anteil an den Eigenschaften (im Mittel über die zehn Plätze genau 1) */
export function slotWeight(k: SlotKind): number { return AFFIX_SCALE[k] / 0.5; }

/** Eine Eigenschaft (Schlüssel, Wert) in Normstärken auf Stufe L und diesem Platz */
function modUnits(k: ModKey, v: number, L: number, kind: SlotKind): number {
  if (!(v > 0)) return 0;
  const nom = affixNominal(k, L) ?? GS.fixedNominal[k];
  if (!nom) return 0;
  return Math.min(GS.affixCap, v / (nom * AFFIX_SCALE[kind]));
}
function modsUnits(m: Mods, L: number, kind: SlotKind): number {
  let u = 0;
  for (const k in m) u += modUnits(k as ModKey, m[k as ModKey]!, L, kind);
  return u;
}

/** Aufschlüsselung des Werts eines Teils (für Tests, Doku und den Tooltip). null = keine Ausrüstung. */
export interface GsParts { kind: SlotKind; weight: number; level: number; base: number; affix: number; upgrade: number; rune: number; special: number; gs: number }
export function itemGSParts(it: ItemInstance | null | undefined): GsParts | null {
  if (!it) return null;
  const b = ITEMS[it.base];
  if (!b || !isGear(b)) return null;
  const kind = slotKind(b)!;
  const L = Math.max(1, Number(it.ilvl) || 1), up = Math.max(0, Math.min(CFG.upgrade.max, Math.floor(Number(it.up) || 0)));
  const r = clampRarity(it.rarity);
  const base = (CFG.loot.rarityStatMul[r] ?? 1) * (1 + CFG.upgrade.statPerLevel * up);
  let affix = 0;
  for (const a of Array.isArray(it.affixes) ? it.affixes : []) affix += modUnits(a[0], a[1], L, kind);
  const upgrade = modsUnits(upgradeBonus(kind, up), L, kind) + (up >= CFG.upgrade.max ? GS.up10 : 0);
  const en = it.ench ? ENCHANTS[it.ench] : undefined;
  const rune = en ? modsUnits(en.mods, L, kind) : 0;
  const elv = b.kind === 'weapon' && it.element ? Math.max(1, Math.min(3, it.elv ?? 1)) : 0;
  const special = GS.element[elv] + (b.legend ? GS.legend : 0) + (it.name && !it.set && !b.legend ? GS.unique : 0);
  const weight = slotWeight(kind), level = L + GS.levelOffset;
  const gs = Math.round(weight * level * (base + GS.affixUnit * (affix + upgrade + rune + special)));
  return { kind, weight, level, base, affix, upgrade, rune, special, gs };
}
/** Ausrüstungswert eines Teils (0 für alles, was keine Ausrüstung ist) */
export function itemGS(it: ItemInstance | null | undefined): number { return itemGSParts(it)?.gs ?? 0; }

/** Wert je Platz (leere Plätze 0) */
export function slotGS(c: Pick<CharData, 'equip'>): Record<Slot, number> {
  const out = {} as Record<Slot, number>;
  for (const s of SLOTS) out[s] = itemGS(c.equip[s]);
  return out;
}
/** Ausrüstungswert des Charakters: Summe über die zehn Plätze. Alte Plätze (acc1/acc2) zählen nicht – sanitizeChar überführt sie. */
export function charGS(c: Pick<CharData, 'equip'>): number {
  let n = 0;
  for (const s of SLOTS) n += itemGS(c.equip[s]);
  return n;
}

/**
 * Vergleich für den Tooltip: was der Charakter-Wert täte, wenn `it` auf einen seiner Plätze käme (Ringe: beide Ringplätze,
 * auch freie). `old` = Wert des Teils, das dort liegt (0 = frei), `delta` = Änderung des Charakter-Werts.
 */
export interface GsSwap { slot: Slot; old: number; gs: number; delta: number; total: number }
export function gsCompare(c: Pick<CharData, 'equip'>, it: ItemInstance): GsSwap[] {
  const now = charGS(c), mine = itemGS(it);
  return slotsFor(ITEMS[it.base]).map(slot => {
    const cur = c.equip[slot], old = itemGS(cur);
    const delta = cur?.uid === it.uid ? 0 : mine - old;
    return { slot, old, gs: mine, delta, total: now + delta };
  });
}

// ------------------------------------------------------------------ Stufen (Farben) – Schwellen aus der Messung, data/gsreq.ts
export interface GsBracket { id: 'grund' | 'erprobt' | 'gefestigt' | 'meister' | 'endspiel'; name: string; min: number; color: string }
/**
 * Farbstufen des Werts. Die Schwellen sind Messpunkte des Spielermodells (GS_REF in data/gsreq.ts, Tabelle in
 * docs/GEAR_SCORE.md) – grün ab dem typischen Stand der Mitte von Akt I, blau zum Ende von Akt I, violett am Ende der Geschichte,
 * gold ab Riss-Ausrüstung der Stufe 20. Farben wie die Seltenheiten (gleiche Bedeutung: grau → gold), Mythisch-Türkis bleibt
 * den Gegenständen vorbehalten.
 */
export function gsBrackets(ref: { erprobt: number; gefestigt: number; meister: number; endspiel: number }): GsBracket[] {
  return [
    { id: 'grund', name: 'Grundausstattung', min: 0, color: RARITY_COLOR[0] },
    { id: 'erprobt', name: 'Erprobt', min: ref.erprobt, color: RARITY_COLOR[1] },
    { id: 'gefestigt', name: 'Gefestigt', min: ref.gefestigt, color: RARITY_COLOR[2] },
    { id: 'meister', name: 'Meisterlich', min: ref.meister, color: RARITY_COLOR[3] },
    { id: 'endspiel', name: 'Endspiel', min: ref.endspiel, color: RARITY_COLOR[4] },
  ];
}
export function bracketOf(list: GsBracket[], gs: number): GsBracket {
  let b = list[0];
  for (const x of list) if (gs >= x.min) b = x;
  return b;
}
/** Zahl im deutschen Format (Tausenderpunkt) */
export const fmtGS = (n: number) => Math.round(n).toLocaleString('de-DE');
