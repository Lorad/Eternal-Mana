/**
 * Seltenheiten (0.9): Tabellen über alle Stufen und die Quellen der sechsten Stufe „Mythisch“.
 * Jede Gewichtstabelle wird über `rarityTable` auf die Länge von RARITY_NAME gebracht – kürzere Tabellen (wie alle aus der
 * Zeit vor 0.9) bekommen für die fehlenden Stufen das Gewicht 0. „Mythisch“ hängen nur die Funktionen unten an:
 * Mana-Risse hoher Stufen, Bosse der Neuen Kreise und – für die Expeditionen – `expeditionRarity`.
 * Zahlen: CFG.loot.mythic, CFG.loot.expeditionChest/expeditionBoss.
 */
import { CFG, MYTHIC, RARITY_MAX, RARITY_NAME } from './config';
import type { Difficulty } from './data/hub';

export const RARITY_COUNT = RARITY_NAME.length;

/** Gewichtstabelle in voller Länge; `mythic` wird zum Gewicht der Stufe „Mythisch“ addiert. */
export function rarityTable(w: readonly number[], mythic = 0): number[] {
  const out: number[] = [];
  for (let i = 0; i < RARITY_COUNT; i++) out.push(Math.max(0, w[i] ?? 0));
  out[MYTHIC] += Math.max(0, mythic);
  return out;
}
/** Seltenheit auf den gültigen Bereich begrenzen (alte oder beschädigte Werte) */
export function clampRarity(r: unknown): number {
  return typeof r === 'number' && isFinite(r) ? Math.max(0, Math.min(RARITY_MAX, Math.floor(r))) : 0;
}

/** Gewicht für „Mythisch“ in einem Mana-Riss dieser Stufe (0 unterhalb von `riftFrom`). */
export function mythicRift(stufe: number): number {
  const M = CFG.loot.mythic, top = CFG.rift.maxStufe;
  if (stufe < M.riftFrom) return 0;
  return M.riftMax * Math.min(1, (stufe - M.riftFrom + 1) / Math.max(1, top - M.riftFrom + 1));
}
/** Gewicht für „Mythisch“ in der Bosstruhe eines Story-Bosses in diesem Neuen Kreis */
export function mythicKreisBoss(kreis: number): number {
  const M = CFG.loot.mythic;
  return kreis >= M.kreisBoss ? M.kreisBossWeight * (kreis - M.kreisBoss + 1) : 0;
}

/**
 * Für die Expeditionen: Seltenheitsgewichte je Schwierigkeitsgrad – `chest` für Truhen und Belohnungskammer, `boss` für den
 * Endboss. „Mythisch“ fällt nur auf Albtraum (Endboss) und Mythisch (Truhe und Endboss). Ergebnis hat immer volle Länge.
 * Nutzung: `generateGear(rng, ilvl, rollRarity(rng, expeditionRarity('albtraum', 'boss')), cls)`.
 */
export function expeditionRarity(diff: Difficulty, kind: 'chest' | 'boss'): number[] {
  const L = CFG.loot, base = (kind === 'boss' ? L.expeditionBoss : L.expeditionChest)[diff] ?? L.expeditionChest.normal;
  const m = L.mythic.expedition[diff] ?? [0, 0];
  return rarityTable(base, kind === 'boss' ? m[1] : m[0]);
}
