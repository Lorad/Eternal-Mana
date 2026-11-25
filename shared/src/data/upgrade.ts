/**
 * Verbessern +0..+10 (0.9) – was jede Stufe bringt. Bewusst ohne Laufzeit-Abhängigkeit zu items.ts (items.ts rechnet die Boni ein).
 *   · jede Stufe: +8 % auf die Grundwerte (CFG.upgrade.statPerLevel)
 *   · +3, +6, +9: je eine feste Zusatzeigenschaft, abhängig von der Art des Teils – vorher sichtbar (Tooltip, Schmiede)
 *   · +10: eine kleine Passive je Art, wirksam im Kampf (server/src/zone.ts, game.ts) oder in den Werten (stats.ts)
 * Kosten (Gold, Rohstoffe, Essenzen, Bosskerne, Ätherstaub, Echo-Fragmente): CFG.upgrade und `upgradeCost` in shared/src/craft.ts.
 */
import { CFG } from '../config';
import type { ModKey, Mods } from '../types';

/** Art eines Ausrüstungsteils aus Sicht der Plätze: Talismane zählen als Amulett, beide Ringplätze als Ring */
export type SlotKind = 'weapon' | 'offhand' | 'helm' | 'armor' | 'gloves' | 'legs' | 'boots' | 'amulet' | 'ring';
export const SLOT_KINDS: SlotKind[] = ['weapon', 'offhand', 'helm', 'armor', 'gloves', 'legs', 'boots', 'amulet', 'ring'];
export const SLOT_KIND_NAME: Record<SlotKind, string> = {
  weapon: 'Hauptwaffe', offhand: 'Zweithand', helm: 'Helm', armor: 'Brust', gloves: 'Handschuhe', legs: 'Beine', boots: 'Schuhe', amulet: 'Amulett', ring: 'Ring',
};

/** Stufen mit Zusatzeigenschaft */
export const UPGRADE_BONUS_AT = [3, 6, 9] as const;
/** Zusatzeigenschaft bei +3 / +6 / +9 je Art – erst schützend, dann nützlich, zuletzt ein Stück Angriff */
export const UPGRADE_BONUS: Record<SlotKind, [ModKey, number][]> = {
  weapon: [['crit', 2], ['critDmg', 8], ['powerPct', 3]],
  offhand: [['resAll', 2], ['crit', 1.5], ['powerPct', 2]],
  helm: [['resAll', 2], ['mpPct', 4], ['cdr', 2]],
  armor: [['hpPct', 2], ['defPct', 4], ['resAll', 3]],
  gloves: [['hpRegen', 0.8], ['crit', 1.5], ['critDmg', 6]],
  legs: [['hpRegen', 1], ['hpPct', 3], ['defPct', 3]],
  boots: [['resAll', 2], ['dodgeCdr', 6], ['speedPct', 3]],
  amulet: [['mpRegen', 0.5], ['hpPct', 3], ['elemPct', 4]],
  ring: [['hpRegen', 0.5], ['critDmg', 4], ['crit', 1]],
};

/** Zusatzeigenschaften, die ein Teil dieser Art auf Stufe `up` trägt */
export function upgradeBonus(kind: SlotKind | null, up: number): Mods {
  const m: Mods = {};
  if (!kind) return m;
  UPGRADE_BONUS_AT.forEach((at, i) => { if (up >= at) { const [k, v] = UPGRADE_BONUS[kind][i]; m[k] = (m[k] ?? 0) + v; } });
  return m;
}
/** Die Zusatzeigenschaft, die genau beim Schritt auf Stufe `to` dazukommt (oder null) */
export function upgradeBonusAt(kind: SlotKind | null, to: number): [ModKey, number] | null {
  const i = (UPGRADE_BONUS_AT as readonly number[]).indexOf(to);
  return kind && i >= 0 ? UPGRADE_BONUS[kind][i] : null;
}

/** Passiven der Stufe +10 je Art. `id` ist der Schlüssel in Derived.gearFx.up10; Zahlen in CFG.gearFx */
export interface Up10Def { id: string; name: string; text: string; mods?: Mods }
const G = CFG.gearFx;
const pct = (x: number) => Math.round(x * 100) + ' %';
export const UP10: Record<SlotKind, Up10Def> = {
  weapon: { id: 'meister', name: 'Meisterschliff', text: `Jeder ${G.meister.every}. Treffer deiner Standardangriffe verursacht ${pct(G.meister.mult - 1)} mehr Schaden.` },
  offhand: { id: 'parade', name: 'Parade', text: `${pct(G.parade.chance)} Chance, einen gegnerischen Treffer auf ${pct(G.parade.mul)} abzuschwächen.` },
  helm: { id: 'klarheit', name: 'Klarer Kopf', text: `Schädliche Zustände wirken auf dich ${pct(1 - G.klarheit)} kürzer.` },
  armor: { id: 'atem', name: 'Zweiter Atem', text: `Fällt dein Leben unter ${pct(G.atem.below)}, erhältst du sofort ${pct(G.atem.heal)} zurück – höchstens einmal je ${G.atem.cd} Sekunden.` },
  gloves: { id: 'flink', name: 'Flinke Hände', text: `Deine Standardangriffe sind ${pct(1 - G.flink)} schneller bereit.` },
  legs: { id: 'standfest', name: 'Standfest', text: `Die Ausweichrolle ist ${G.standfest} % schneller wieder bereit.`, mods: { dodgeCdr: G.standfest } },
  boots: { id: 'leicht', name: 'Leichter Schritt', text: `+${G.leicht} % Tempo.`, mods: { speedPct: G.leicht } },
  amulet: { id: 'segen', name: 'Quellsegen', text: `Heiltränke und das Quellwasser-Elixier heilen dich ${pct(G.segen - 1)} stärker.` },
  ring: { id: 'funke', name: 'Manafunke', text: `Kritische Treffer geben dir ${G.funke} Mana zurück (je Ring auf +10).` },
};
