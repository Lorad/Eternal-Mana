import { CFG, ELEMENTS } from './config';
import { CLASSES } from './data/classes';
import { ITEMS, itemMods } from './data/items';
import { setCounts, setMods } from './data/sets';
import { SKILLS } from './data/skills';
import type { AttrKey, CharData, Derived, Element, Mods } from './types';
import { RES_KEY, SLOTS } from './types';

export function addMods(into: Mods, m: Mods | undefined, mul = 1): void {
  if (!m) return;
  for (const k in m) (into as any)[k] = ((into as any)[k] ?? 0) + (m as any)[k] * mul;
}

export function countShards(c: CharData): number {
  let n = 0;
  for (const k in c.flags) if (k.startsWith('s:')) n++;
  return n;
}

/** Berechnet alle abgeleiteten Werte eines Charakters. `buffs` = aktive temporäre Modifikatoren. */
export function computeStats(c: CharData, buffs?: Mods[]): Derived {
  const cls = CLASSES[c.cls];
  const m: Mods = {};
  for (const s of SLOTS) { const it = c.equip[s]; if (it) addMods(m, itemMods(it)); }
  const sets = setCounts(c);
  for (const b of setMods(sets)) addMods(m, b);
  for (const id in c.skills) { const sk = SKILLS[id]; if (sk?.passive) addMods(m, sk.passive, c.skills[id]); }
  if (buffs) for (const b of buffs) addMods(m, b);
  const attrs: Record<AttrKey, number> = {
    str: c.attrs.str + (m.str ?? 0), dex: c.attrs.dex + (m.dex ?? 0),
    int: c.attrs.int + (m.int ?? 0), vit: c.attrs.vit + (m.vit ?? 0),
  };
  const shards = countShards(c);
  let power = c.level + (m.power ?? 0);
  for (const a in cls.powerWeights) power += attrs[a as AttrKey] * (cls.powerWeights as any)[a];
  power *= 1 + (m.powerPct ?? 0) / 100;
  const def = (attrs.vit * 0.5 + attrs.str * 0.25 + (m.def ?? 0)) * cls.defMul * (1 + (m.defPct ?? 0) / 100);
  const maxHp = (cls.baseHp + attrs.vit * cls.hpPerVit + c.level * 8 + (m.hp ?? 0) + shards * 4) * (1 + (m.hpPct ?? 0) / 100);
  const maxMp = (cls.baseMp + attrs.int * cls.mpPerInt + c.level * 3 + (m.mp ?? 0) + shards * 2) * (1 + (m.mpPct ?? 0) / 100);
  const res = { phys: 0 } as Record<Element, number>;
  for (const e of ELEMENTS) res[e] = Math.min(CFG.elements.resCap, Math.round((m[RES_KEY[e as keyof typeof RES_KEY]] ?? 0) + (m.resAll ?? 0)));
  const weapon = c.equip.weapon;
  return {
    maxHp: Math.round(maxHp), maxMp: Math.round(maxMp),
    power: Math.round(power * 10) / 10, def: Math.round(def * 10) / 10,
    crit: Math.min(0.75, CFG.combat.baseCrit + attrs.dex * 0.004 + (m.crit ?? 0) / 100),
    critDmg: CFG.combat.baseCritDmg + (m.critDmg ?? 0) / 100,
    speed: CFG.player.baseSpeed * cls.speedMul * (1 + Math.min(40, m.speedPct ?? 0) / 100),
    hpRegen: 0.5 + attrs.vit * 0.05 + (m.hpRegen ?? 0),
    mpRegen: 1 + attrs.int * 0.06 + (m.mpRegen ?? 0),
    cdr: Math.min(40, m.cdr ?? 0), lifesteal: m.lifesteal ?? 0,
    elemPct: m.elemPct ?? 0, healPct: m.healPct ?? 0, goldPct: m.goldPct ?? 0, xpPct: m.xpPct ?? 0,
    dodgeCd: CFG.player.dodgeCooldown * (1 - Math.min(50, m.dodgeCdr ?? 0) / 100),
    attackElement: weapon?.element ?? cls.attack.element,
    attrs,
    res,
    elemLvl: weapon?.element ? Math.max(1, Math.min(3, weapon.elv ?? 1)) : 0,
    legend: weapon ? ITEMS[weapon.base]?.legend : undefined,
    sets,
  };
}

/** Neuer Charakter mit Startausrüstung. */
export function newCharacter(name: string, clsId: CharData['cls']): CharData {
  const cls = CLASSES[clsId];
  const c: CharData = {
    v: 1, name, cls: clsId, level: 1, xp: 0, gold: 25,
    attrs: { ...cls.baseAttrs }, attrPoints: 0, skillPoints: 0,
    skills: { [cls.startSkill]: 1 }, hotbar: [cls.startSkill, null, null, null],
    inv: [
      { uid: 'start-hp', base: 'potion_hp1', rarity: 0, ilvl: 1, up: 0, affixes: [], qty: 3 },
      { uid: 'start-mp', base: 'potion_mp1', rarity: 0, ilvl: 1, up: 0, affixes: [], qty: 2 },
    ],
    equip: {
      weapon: { uid: 'start-w', base: `w_${cls.weapon}_1`, rarity: 0, ilvl: 1, up: 0, affixes: [] },
      armor: { uid: 'start-a', base: `a_${cls.armor}_1`, rarity: 0, ilvl: 1, up: 0, affixes: [] },
    },
    quests: {}, flags: {},
    zone: 'gruenwald', x: 0, y: 0, respawn: { zone: 'gruenwald', x: 0, y: 0 },
    hp: 1, mp: 1, playtime: 0, kills: 0, deaths: 0,
  };
  const d = computeStats(c);
  c.hp = d.maxHp; c.mp = d.maxMp;
  return c;
}
