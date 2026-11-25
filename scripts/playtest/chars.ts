/**
 * Charaktere für den Spieltest: so ausgerüstet, wie ein Spieler an dieser Stelle der Reise plausibel dasteht –
 * Questbelohnungen, durchschnittliche Beute, Schmiede und Händler der Region. Nicht das Beste, was es gibt.
 */
import { CFG } from '../../shared/src/config';
import { CLASSES } from '../../shared/src/data/classes';
import { generateGear, makeStack, type GenKind } from '../../shared/src/data/items';
import { skillsOf } from '../../shared/src/data/skills';
import { newCharacter } from '../../shared/src/stats';
import type { CharData, ClassId, ItemInstance, Slot } from '../../shared/src/types';
import { Rng } from '../../shared/src/util/rng';

/** Leiste: die vier Fähigkeiten, die ein Spieler dieser Klasse am ehesten einpackt (in dieser Reihenfolge, soweit schon gelernt) */
export const LOADOUT: Record<ClassId, string[]> = {
  krieger: ['kr_glut', 'kr_erdspalter', 'kr_schrei', 'kr_wirbel', 'kr_wucht', 'kr_sturm'],
  magier: ['ma_meteor', 'ma_eissturm', 'ma_lanze', 'ma_feuerball', 'ma_frost', 'ma_blinzeln'],
  waldlaeufer: ['wl_sturmpfeil', 'wl_hagel', 'wl_gift', 'wl_faecher', 'wl_falle', 'wl_sprung'],
  paladin: ['pa_zorn', 'pa_heilung', 'pa_hammer', 'pa_lichtschlag', 'pa_weihe', 'pa_schild'],
  schattenjaeger: ['sj_tanz', 'sj_mal', 'sj_toxin', 'sj_meuchel', 'sj_faecher', 'sj_schritt'],
};

export type Gear = 'karg' | 'typisch' | 'gut';
export interface CharOpt {
  /** karg = alles „Ungewöhnlich“, drei Stufen hinterher, nichts verbessert · typisch = Waffe und Rüstung „Selten“, eine Stufe hinterher, leicht verbessert · gut = „Episch“, auf Stufe, +5 */
  gear?: Gear;
  seed?: number;
  /** Heil- und Manatränke im Gepäck (Stufe passend zur Region) */
  potions?: [number, number];
  /** zusätzliche Attributs-/Fähigkeitspunkte aus Quests bis hierher */
  bonusAttr?: number; bonusSkill?: number;
}

export function potionTier(level: number): number { return level <= 8 ? 1 : level <= 20 ? 2 : 3; }

/** Attribute (zwei Punkte ins Hauptattribut, einer in Vitalität) und Fähigkeiten (reihum, Leisten-Fähigkeiten und Passive zuerst). */
export function levelUp(c: CharData, level: number, bonusAttr = 0, bonusSkill = 0) {
  const cls = CLASSES[c.cls];
  c.level = level;
  const main = Object.entries(cls.powerWeights).sort((a, b) => b[1]! - a[1]!)[0][0] as 'str';
  const pts = (level - 1) * CFG.player.attrPointsPerLevel + bonusAttr;
  const vit = Math.floor(pts / 3);
  c.attrs = { ...cls.baseAttrs };
  c.attrs[main] += pts - vit; c.attrs.vit += vit;
  c.skills = { [cls.startSkill]: 1 };
  let sp = level - 1 + bonusSkill;
  const order = [...LOADOUT[c.cls].slice(0, 4), ...skillsOf(c.cls).filter(s => s.passive).map(s => s.id), ...LOADOUT[c.cls].slice(4)].map(id => skillsOf(c.cls).find(s => s.id === id)!);
  for (let round = 0; round < 6 && sp > 0; round++) for (const s of order) {
    if (sp <= 0) break;
    const r = c.skills[s.id] ?? 0;
    if (r >= s.maxRank || level < s.reqLevel + r * 2) continue;
    if (s.requires && !c.skills[s.requires]) continue;
    c.skills[s.id] = r + 1; sp--;
  }
  const act = LOADOUT[c.cls].filter(id => c.skills[id]);
  c.hotbar = [0, 1, 2, 3].map(i => act[i] ?? null);
}

export function gearUp(c: CharData, level: number, gear: Gear, seed: number) {
  const rng = new Rng(seed * 7919 + level * 131 + c.cls.length);
  const [rw, ra, rx, lag, up] = gear === 'karg' ? [1, 1, 1, 3, 0] : gear === 'gut' ? [3, 3, 3, 0, 5] : [2, 2, 1, 1, Math.floor(level / 10)];
  const il = Math.max(1, level - lag);
  const mk = (kind: GenKind, rar: number, acc?: 'ring' | 'amulet'): ItemInstance => { const it = generateGear(rng, il, rar, c.cls, kind, acc); delete it.element; return it; };
  // 0.9: zehn Plätze im selben Verhältnis wie bisher (2 von 5 Teilen in der besseren Seltenheit → 4 von 10: Waffe, Zweithand, Brust, Beine)
  c.equip = {};
  c.equip.weapon = mk('weapon', rw); c.equip.weapon.up = up;
  for (const [s, k, r, acc] of [['offhand', 'offhand', rw], ['helm', 'helm', rx], ['armor', 'armor', ra], ['gloves', 'gloves', rx], ['legs', 'legs', ra], ['boots', 'boots', rx],
    ['amulet', 'accessory', rx, 'amulet'], ['ring1', 'accessory', rx, 'ring'], ['ring2', 'accessory', rx, 'ring']] as [Slot, GenKind, number, ('ring' | 'amulet')?][]) {
    const it = mk(k, r, acc);
    if (s !== 'amulet' && s !== 'ring1' && s !== 'ring2') it.up = Math.max(0, up - 1);
    c.equip[s] = it;
  }
}

/** Ein plausibler Charakter dieser Klasse und Stufe. */
export function plausibleChar(cls: ClassId, level: number, o: CharOpt = {}): CharData {
  const c = newCharacter('Probe', cls);
  levelUp(c, level, o.bonusAttr ?? 0, o.bonusSkill ?? 0);
  gearUp(c, level, o.gear ?? 'typisch', o.seed ?? 1);
  const t = potionTier(level), [hp, mp] = o.potions ?? [6, 3];
  c.inv = [];
  // ab Akt II braut man sich Quellheiltränke (Rezept von Anfang an bekannt, Zutaten aus dem Schattenreich): die Hälfte des Vorrats
  const strong = level >= 34 ? Math.floor(hp / 2) : 0;
  if (strong) c.inv.push(makeStack('potion_hp4', strong));
  if (hp - strong) c.inv.push(makeStack(`potion_hp${t}`, hp - strong));
  if (mp) c.inv.push(makeStack(`potion_mp${t}`, mp));
  return c;
}
