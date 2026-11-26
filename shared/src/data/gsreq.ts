/**
 * Ausrüstungswert (GS) im Spiel: gemessene Messpunkte, Farbstufen und Empfehlungen für Inhalte. Formel: shared/src/gearscore.ts,
 * Beschreibung mit allen Tabellen: docs/GEAR_SCORE.md.
 *
 *   GS_REF       Messpunkte des Spielermodells (scripts/gearscore-calib.ts --ref; tests/balance.test.ts wacht darüber, dass sie
 *                zum Modell passen). Keine Empfehlung hier ist von Hand getippt – alle folgen aus diesen Punkten.
 *   Empfehlung   je Inhalt: empfohlener und Mindestwert, empfohlene Stufe, Belohnungsstufe, Beute. Unter dem Mindestwert warnt die
 *                Oberfläche (für Gruppen: wer darunter liegt) – gesperrt wird nur, wenn ein Inhalt es ausdrücklich verlangt (`hard`).
 *                Es gibt keine Raids. Die schwersten Inhalte (Mythisch, Tiefen, Prüfung der Sieben, Risse ab Stufe 20) tragen die
 *                Belohnungsstufe „Raid-Endgame“; ein späterer Raid legt nur `GsReqDecl` fest und bekommt dieselbe Anzeige.
 */
import { CFG, RARITY_NAME } from '../config';
import { bracketOf, gsBrackets, type GsBracket } from '../gearscore';
import { rarityTable } from '../rarity';
import type { CharData } from '../types';
import { BOSSES } from './enemies';
import { EXPEDITIONS, EXP_DIFF, diffRarity } from './expeditions';
import { depthScale } from './expeditions_endgame';
import type { Difficulty } from './hub';
import { kreisLevel, kreisOf } from './rifts';

// =====================================================================================================================
//  Messpunkte (scripts/gearscore-calib.ts --ref) – Mittel über alle fünf Klassen und sechs Würfel-Samen
// =====================================================================================================================
export const GS_REF = {
  levels: [1, 5, 10, 15, 20, 25, 30, 35, 40],
  karg: [42, 54, 121, 188, 255, 322, 391, 456, 524],
  typisch: [47, 90, 168, 244, 335, 414, 518, 604, 747],
  gut: [81, 186, 315, 446, 576, 706, 837, 966, 1097],
  story: 784,
  /** Riss-Stufe 1–4 liegt zwischen dem Ende der Geschichte und Stufe 5 (das Modell rüstet für Stufe 1 schon wie für 5 aus) */
  rift: { 5: 1396, 10: 1706, 15: 1993, 20: 2235, 25: 2496, 30: 2687 } as Record<number, number>,
  legend10: 3672, mythic10: 4159,
};
export type GearLevel = 'karg' | 'typisch' | 'gut';
/** GS des Spielermodells auf Stufe L (linear zwischen den Messpunkten) */
export function gsAtLevel(gear: GearLevel, L: number): number {
  const xs = GS_REF.levels, ys = GS_REF[gear];
  const l = Math.max(xs[0], Math.min(xs[xs.length - 1], L));
  let i = 0;
  while (i < xs.length - 2 && l > xs[i + 1]) i++;
  return Math.round(ys[i] + ((ys[i + 1] - ys[i]) * (l - xs[i])) / (xs[i + 1] - xs[i]));
}
/**
 * Endspiel-Stufe → GS: 0 = Ende der Geschichte, 1..30 = Riss-Ausrüstung dieser Stufe, 35 = alles Legendär +10,
 * 40 = alles Mythisch +10 (linear dazwischen).
 */
export function stagePoints(): [number, number][] {
  return [[0, GS_REF.story], ...Object.entries(GS_REF.rift).map(([s, v]) => [+s, v] as [number, number]).sort((a, b) => a[0] - b[0]), [35, GS_REF.legend10], [40, GS_REF.mythic10]];
}
export function gsAtStage(s: number): number {
  const pts = stagePoints(), x = Math.max(0, Math.min(40, s));
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, va] = pts[i], [b, vb] = pts[i + 1];
    if (x <= b) return Math.round(va + ((vb - va) * (x - a)) / (b - a));
  }
  return pts[pts.length - 1][1];
}

// =====================================================================================================================
//  Farbstufen
// =====================================================================================================================
/** Schwellen: grün ab typisch Stufe 15, blau ab typisch Stufe 30, violett ab dem Ende der Geschichte, gold ab Riss-Ausrüstung 20 */
export const GS_BRACKETS: GsBracket[] = gsBrackets({ erprobt: gsAtLevel('typisch', 15), gefestigt: gsAtLevel('typisch', 30), meister: GS_REF.story, endspiel: GS_REF.rift[20] });
export const gsBracket = (gs: number) => bracketOf(GS_BRACKETS, gs);
export const gsColor = (gs: number) => gsBracket(gs).color;

// =====================================================================================================================
//  Empfehlungen
// =====================================================================================================================
export type RewardTier = 'abenteuer' | 'veteran' | 'endspiel' | 'raid';
export const TIER_NAME: Record<RewardTier, string> = { abenteuer: 'Abenteuer', veteran: 'Veteran', endspiel: 'Endspiel', raid: 'Raid-Endgame' };
/** Was ein Inhalt selbst festlegen darf (alles optional – sonst gilt die abgeleitete Empfehlung). Für künftige Raids genügt das. */
export interface GsReqDecl { recGS?: number; minGS?: number; recLevel?: number; tier?: RewardTier; hard?: boolean }
export interface GsReq {
  recLevel: number; recGS: number; minGS: number;
  /** wer unter dem Mindestwert liegt, darf nicht hinein – nur wenn der Inhalt es ausdrücklich festlegt */
  hard: boolean;
  tier: RewardTier; tierName: string;
  /** Beute in Worten (Gegenstandsstufe, höchste Seltenheit) */
  reward: string;
  /** woraus die Zahlen stammen (Anzeige im Tooltip, Doku) */
  basis: string;
}
function finish(r: Omit<GsReq, 'tierName' | 'hard'> & { hard?: boolean }, decl?: GsReqDecl): GsReq {
  const o = { ...r, hard: !!r.hard, ...(decl ?? {}) };
  return { ...o, minGS: Math.min(o.minGS, o.recGS), tierName: TIER_NAME[o.tier], hard: !!o.hard };
}

/** Nächster Schwierigkeitsgrad (Endspiel-Expeditionen belohnen eine Stufe besser) */
const NEXT: Record<Difficulty, Difficulty> = { normal: 'schwer', schwer: 'albtraum', albtraum: 'mythisch', mythisch: 'mythisch' };
/**
 * Raritätsgewichte des Abschlusses einer Expedition (0.11): wie der Schwierigkeitsgrad – in Endspiel-Expeditionen wie der
 * nächsthöhere, in Tiefen mit einem Gewicht für „Mythisch“, das je Tiefe steigt (DEPTH_CFG.mythic). Server: expedition/reward.ts.
 */
export function rewardRarity(exp: string, diff: Difficulty, depth = 0): number[] {
  const x = EXPEDITIONS[exp], d = x?.endgame ? NEXT[diff] : diff;
  if (!depth && !(x?.endgame && diff === 'mythisch')) return diffRarity(d);
  const mythic = (CFG.loot.mythic.expedition.mythisch?.[1] ?? 0) * depthScale(depth).mythic * (x?.endgame ? 1.5 : 1);
  return rarityTable(EXP_DIFF.mythisch.rarity, mythic);
}
/** Gegenstandsstufe der Beute des Abschlusses (Albtraum und Mythisch heben frühe Expeditionen auf 42/45, EXP_DIFF.lvlMin) */
export function rewardIlvl(exp: string, diff: Difficulty, depth = 0, kreis = 0): number {
  const x = EXPEDITIONS[exp], d = EXP_DIFF[diff], boss = BOSSES[x.boss];
  return Math.min(CFG.player.maxLevel + 20, Math.max(d.lvlMin, kreisLevel(boss.level, kreis) + d.ilvlPlus) + depthScale(depth).ilvl);
}
const topRarity = (w: number[]) => { let t = 0; w.forEach((v, i) => { if (v > 0) t = i; }); return t; };

/**
 * Empfehlung für eine Expedition auf einem Grad (und einer Tiefe über Mythisch). Herleitung (docs/GEAR_SCORE.md):
 *   Geschichte, Normal   empfohlen = typischer Spieler auf der empfohlenen Stufe, Mindestwert = karger Spieler
 *   Geschichte, Schwer   Gegner drei Stufen höher: empfohlen = Mitte aus typischer und guter Ausrüstung drei Stufen weiter,
 *                        Mindestwert = typische auf der empfohlenen Stufe (was ein Normal-Abschluss voraussetzt)
 *   Endspiel, Normal     Ende der Geschichte / karg auf Stufe 40 · Endspiel, Schwer: Riss-Ausrüstung 5 / Ende der Geschichte
 *   Albtraum             Riss-Ausrüstung 10 / 5 · Mythisch: Riss 20 / 10 (so misst scripts/exp-playtest.ts --endspiel)
 *   Tiefe t              Riss-Stufe 20 + t / 15 + t (Tiefe 10 = Riss 30, Tiefe 20 = alles Mythisch +10)
 */
export function expRequirement(id: string, diff: Difficulty, depth = 0, kreis = 0): GsReq {
  const x = EXPEDITIONS[id];
  const ilvl = rewardIlvl(id, diff, depth, kreis), top = topRarity(rewardRarity(id, diff, depth));
  const reward = `Gegenstandsstufe ${ilvl}, bis ${RARITY_NAME[top]}`;
  const decl = x.gsReq?.[diff];
  const top40 = CFG.player.maxLevel;
  if (depth > 0) return finish({ recLevel: top40, recGS: gsAtStage(20 + depth), minGS: gsAtStage(15 + depth), tier: 'raid', reward, basis: `Riss-Ausrüstung ${20 + depth} empfohlen, ${15 + depth} mindestens` }, decl);
  if (diff === 'mythisch') return finish({ recLevel: top40, recGS: gsAtStage(20), minGS: gsAtStage(10), tier: 'raid', reward, basis: 'Riss-Ausrüstung 20 empfohlen, 10 mindestens' }, decl);
  if (diff === 'albtraum') return finish({ recLevel: top40, recGS: gsAtStage(10), minGS: gsAtStage(5), tier: 'endspiel', reward, basis: 'Riss-Ausrüstung 10 empfohlen, 5 mindestens' }, decl);
  if (x.endgame) return diff === 'normal'
    ? finish({ recLevel: x.rec, recGS: GS_REF.story, minGS: gsAtLevel('karg', top40), tier: 'endspiel', reward, basis: 'Ausrüstung vom Ende der Geschichte empfohlen, karge Stufe 40 mindestens' }, decl)
    : finish({ recLevel: x.rec, recGS: gsAtStage(5), minGS: GS_REF.story, tier: 'endspiel', reward, basis: 'Riss-Ausrüstung 5 empfohlen, Ende der Geschichte mindestens' }, decl);
  if (diff === 'schwer') {
    const L = Math.min(top40, x.rec + EXP_DIFF.schwer.lvlPlus);
    return finish({ recLevel: L, recGS: Math.round((gsAtLevel('typisch', L) + gsAtLevel('gut', L)) / 2), minGS: gsAtLevel('typisch', x.rec), tier: 'veteran', reward,
      basis: `zwischen typischer und guter Ausrüstung der Stufe ${L} empfohlen, typische der Stufe ${x.rec} mindestens` }, decl);
  }
  return finish({ recLevel: x.rec, recGS: gsAtLevel('typisch', x.rec), minGS: gsAtLevel('karg', x.rec), tier: 'abenteuer', reward, basis: `typische Ausrüstung der Stufe ${x.rec} empfohlen, karge mindestens` }, decl);
}
/** Empfehlung für einen Mana-Riss der Stufe s: Riss-Ausrüstung dieser Stufe, mindestens fünf Stufen darunter */
export function riftRequirement(s: number): GsReq {
  const ilvl = CFG.rift.ilvl(s);
  return finish({ recLevel: CFG.player.maxLevel, recGS: gsAtStage(s), minGS: gsAtStage(s - 5), tier: s >= 20 ? 'raid' : 'endspiel',
    reward: `Gegenstandsstufe ${ilvl}`, basis: `Riss-Ausrüstung ${s} empfohlen, ${Math.max(0, s - 5) || 'Ende der Geschichte'} mindestens` });
}
/** Prüfung der Sieben: auf ihrer Riss-Stufe, mindestens die Stufe, ab der sie offen ist */
export function trialRequirement(): GsReq {
  const T = CFG.rift.trial;
  return finish({ recLevel: CFG.player.maxLevel, recGS: gsAtStage(T.stufe), minGS: gsAtStage(T.unlock), tier: 'raid', reward: `Gegenstandsstufe ${CFG.rift.ilvl(T.stufe)}`, basis: `Riss-Ausrüstung ${T.stufe} empfohlen, ${T.unlock} mindestens` });
}

// =====================================================================================================================
//  Prüfung für eine Gruppe (Bereitschaft, Portal, Server)
// =====================================================================================================================
export interface GsCheck { below: { name: string; gs: number }[]; under: { name: string; gs: number }[]; blocked: boolean }
/** Wer liegt unter dem Mindestwert (`below`), wer unter der Empfehlung (`under`)? `blocked` nur bei harter Grenze. */
export function gsCheck(req: GsReq, members: { name: string; gs: number }[]): GsCheck {
  const below = members.filter(m => m.gs < req.minGS), under = members.filter(m => m.gs >= req.minGS && m.gs < req.recGS);
  return { below, under, blocked: req.hard && below.length > 0 };
}
/** Text der Warnung (oder null) */
export function gsWarning(req: GsReq, chk: GsCheck, solo: boolean): string | null {
  if (!chk.below.length) return null;
  const who = chk.below.map(m => `${m.name} (${m.gs.toLocaleString('de-DE')})`).join(', ');
  if (req.hard) return solo ? `Dein Ausrüstungswert liegt unter dem verlangten Mindestwert von ${req.minGS.toLocaleString('de-DE')}.` : `Unter dem verlangten Mindestwert von ${req.minGS.toLocaleString('de-DE')}: ${who}.`;
  return solo ? `Dein Ausrüstungswert liegt unter dem Mindestwert von ${req.minGS.toLocaleString('de-DE')} – möglich, aber sehr hart.` : `Unter dem Mindestwert von ${req.minGS.toLocaleString('de-DE')}: ${who} – möglich, aber sehr hart.`;
}
/** Kreis des Charakters (Gegenstandsstufe der Beute in Neuen Kreisen) */
export const reqKreis = (c: CharData) => kreisOf(c);
