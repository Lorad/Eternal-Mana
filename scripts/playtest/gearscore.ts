/**
 * Ausrüstungswert (GS) entlang der Reise, gemessen mit den Charakteren des Spielermodells (chars.ts, runs.ts) – Grundlage der
 * Stufen und Empfehlungen in shared/src/data/gsreq.ts (GS_REF). Ausgabe: scripts/gearscore-calib.ts, Wächter: tests/balance.test.ts.
 */
import { CLASS_IDS } from '../../shared/src/data/classes';
import { charGS } from '../../shared/src/gearscore';
import type { CharData, ClassId } from '../../shared/src/types';
import { plausibleChar, topChar, type Gear } from './chars';
import { riftChar } from './runs';

/** Je Messpunkt: alle fünf Klassen mit diesen Würfel-Samen */
export const GS_SEEDS = [1, 2, 3, 4, 5, 6];
export interface GsPoint { mean: number; min: number; max: number; byClass: Record<ClassId, number> }
export function gsPoint(make: (cls: ClassId, seed: number) => CharData): GsPoint {
  const byClass = {} as Record<ClassId, number>, all: number[] = [];
  for (const cls of CLASS_IDS) {
    const v = GS_SEEDS.map(s => charGS(make(cls, s)));
    all.push(...v);
    byClass[cls] = Math.round(v.reduce((a, b) => a + b, 0) / v.length);
  }
  return { mean: Math.round(all.reduce((a, b) => a + b, 0) / all.length), min: Math.min(...all), max: Math.max(...all), byClass };
}
export const LEVEL_POINTS = [1, 5, 10, 15, 20, 25, 30, 35, 40];
export const RIFT_POINTS = [5, 10, 15, 20, 25, 30];
export interface GsMeasure {
  level: Record<Gear, Record<number, GsPoint>>;
  /** Ende der Geschichte (Stufe 40, typische Ausrüstung mit Set, Runen, Element) */
  story: GsPoint;
  /** Riss-Ausrüstung je Riss-Stufe (was die Risse bis zur Stufe davor abwerfen) */
  rift: Record<number, GsPoint>;
  /** alles Legendär +10 bzw. Mythisch +10 auf Gegenstandsstufe 70 */
  legend10: GsPoint; mythic10: GsPoint;
}
export function measureGS(): GsMeasure {
  const level = { karg: {}, typisch: {}, gut: {} } as GsMeasure['level'];
  for (const g of ['karg', 'typisch', 'gut'] as Gear[]) for (const L of LEVEL_POINTS) level[g][L] = gsPoint((cls, seed) => plausibleChar(cls, L, { gear: g, seed }));
  const rift: Record<number, GsPoint> = {};
  for (const s of RIFT_POINTS) rift[s] = gsPoint((cls, seed) => riftChar(cls, s, 'riss', seed));
  return {
    level, rift,
    story: gsPoint((cls, seed) => riftChar(cls, 1, 'geschichte', seed)),
    legend10: gsPoint((cls, seed) => topChar(cls, 4, seed)),
    mythic10: gsPoint((cls, seed) => topChar(cls, 5, seed)),
  };
}
