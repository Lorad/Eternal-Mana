import type { AttrKey, ClassId, Element } from '../types';

export interface ClassDef {
  id: ClassId;
  name: string;
  tagline: string;
  desc: string;
  baseAttrs: Record<AttrKey, number>;
  /** Gewichtung der Attribute für den Angriffswert */
  powerWeights: Partial<Record<AttrKey, number>>;
  baseHp: number; baseMp: number;
  hpPerVit: number; mpPerInt: number;
  weapon: 'sword' | 'staff' | 'bow' | 'hammer' | 'dagger';
  armor: 'heavy' | 'light' | 'robe';
  /** Standardangriff */
  attack: {
    kind: 'arc' | 'proj';
    cooldown: number;      // s zwischen Angriffen
    mult: number;
    range: number;         // px (Reichweite des Bogens bzw. Flugweite)
    arc?: number;          // Grad
    speed?: number;        // Geschoss-px/s
    sprite?: string;
    element: Element;
    mpGain: number;        // Mana je Treffer
    sfx: string;
  };
  defMul: number;
  speedMul: number;
  startSkill: string;
  difficulty: number; // 1..3 Sterne (Anzeige)
}

export const CLASSES: Record<ClassId, ClassDef> = {
  krieger: {
    id: 'krieger', name: 'Krieger', tagline: 'Klinge und Schild',
    desc: 'Steht in der ersten Reihe. Hohe Verteidigung, wuchtige Schwertkombos und ein Sturmangriff, der Gegner betäubt.',
    baseAttrs: { str: 10, dex: 6, int: 3, vit: 9 }, powerWeights: { str: 2, dex: 0.4 },
    baseHp: 130, baseMp: 40, hpPerVit: 13, mpPerInt: 5,
    weapon: 'sword', armor: 'heavy',
    attack: { kind: 'arc', cooldown: 0.42, mult: 1.25, range: 30, arc: 120, element: 'phys', mpGain: 3, sfx: 'swing_heavy' },
    defMul: 1.3, speedMul: 1, startSkill: 'kr_wucht', difficulty: 1,
  },
  magier: {
    id: 'magier', name: 'Magier', tagline: 'Herr der Elemente',
    desc: 'Zerbrechlich, aber verheerend. Beherrscht Feuer, Frost und Sturm und trifft ganze Gegnergruppen auf einmal.',
    baseAttrs: { str: 3, dex: 5, int: 12, vit: 6 }, powerWeights: { int: 2.2 },
    baseHp: 85, baseMp: 110, hpPerVit: 10, mpPerInt: 7,
    weapon: 'staff', armor: 'robe',
    attack: { kind: 'proj', cooldown: 0.5, mult: 0.85, range: 190, speed: 230, sprite: 'orb', element: 'phys', mpGain: 2, sfx: 'cast_light' },
    defMul: 0.75, speedMul: 1, startSkill: 'ma_feuerball', difficulty: 2,
  },
  waldlaeufer: {
    id: 'waldlaeufer', name: 'Waldläufer', tagline: 'Auge des Waldes',
    desc: 'Schneller Fernkämpfer. Hält Gegner mit Pfeilen, Fallen und flinken Rücksprüngen auf Abstand.',
    baseAttrs: { str: 5, dex: 11, int: 4, vit: 7 }, powerWeights: { dex: 2, str: 0.4 },
    baseHp: 100, baseMp: 60, hpPerVit: 11, mpPerInt: 5,
    weapon: 'bow', armor: 'light',
    attack: { kind: 'proj', cooldown: 0.46, mult: 0.8, range: 220, speed: 300, sprite: 'arrow', element: 'phys', mpGain: 2, sfx: 'bow_shot' },
    defMul: 0.9, speedMul: 1.08, startSkill: 'wl_faecher', difficulty: 2,
  },
  paladin: {
    id: 'paladin', name: 'Paladin', tagline: 'Licht der Quelle',
    desc: 'Beschützer der Gruppe. Heilt Verbündete, errichtet Schilde und zermalmt Gegner mit geweihtem Hammer.',
    baseAttrs: { str: 8, dex: 4, int: 7, vit: 9 }, powerWeights: { str: 1.6, int: 1 },
    baseHp: 120, baseMp: 75, hpPerVit: 12, mpPerInt: 6,
    weapon: 'hammer', armor: 'heavy',
    attack: { kind: 'arc', cooldown: 0.55, mult: 1.6, range: 28, arc: 110, element: 'phys', mpGain: 4, sfx: 'swing_heavy' },
    defMul: 1.2, speedMul: 0.97, startSkill: 'pa_lichtschlag', difficulty: 1,
  },
  schattenjaeger: {
    id: 'schattenjaeger', name: 'Schattenjäger', tagline: 'Zwei Klingen, kein Laut',
    desc: 'Blitzschnelle Dolchangriffe, hohe kritische Treffer und Schattenschritte – trifft hart, hält aber wenig aus.',
    baseAttrs: { str: 6, dex: 12, int: 4, vit: 6 }, powerWeights: { dex: 1.8, str: 0.6 },
    baseHp: 95, baseMp: 60, hpPerVit: 10, mpPerInt: 5,
    weapon: 'dagger', armor: 'light',
    attack: { kind: 'arc', cooldown: 0.27, mult: 0.62, range: 24, arc: 100, element: 'phys', mpGain: 2, sfx: 'swing_light' },
    defMul: 0.85, speedMul: 1.12, startSkill: 'sj_meuchel', difficulty: 3,
  },
};
export const CLASS_IDS = Object.keys(CLASSES) as ClassId[];
