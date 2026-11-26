/**
 * Ausrüstung (0.9): zehn Plätze, verlustfreie Überführung alter Spielstände, Budget je Platz, Seltenheit „Mythisch“,
 * faire Verbesserung +0..+10 mit Zusatzeigenschaften und Passiven, Sets mit 2/4/6 Teilen, Vergleich für die Oberfläche.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sanitizeChar } from '../server/src/db';
import { CFG, MYTHIC, RARITY_COLOR, RARITY_MAX, RARITY_NAME } from '../shared/src/config';
import { makeLegendary, makeSetPiece, reforgeBlock, upgradeBlock, upgradeCost, upgradePreview } from '../shared/src/craft';
import { CLASSES, CLASS_IDS } from '../shared/src/data/classes';
import { sanitizeHome } from '../shared/src/data/collection';
import { AFFIX_SCALE, ARMOR_DEF_MUL, CLASS_OFFHAND, GEN_KINDS, ITEMS, baseMods, canEquip, gearBase, generateGear, itemMods, rollRarity, slotKind, slotsFor } from '../shared/src/data/items';
import { AETHER, BOSS_CORE, ECHO_FRAG, ESSENCE } from '../shared/src/data/materials';
import { GEAR_KINDS, RECIPES } from '../shared/src/data/recipes';
import { riftRarity } from '../shared/src/data/rifts';
import { diffRarity } from '../shared/src/data/expeditions';
import { traderStock } from '../shared/src/data/hubdata';
import { SETS, SET_FULL, SET_LIST, SET_PIECES, setCounts } from '../shared/src/data/sets';
import { SLOT_KINDS, UP10, UPGRADE_BONUS, upgradeBonus } from '../shared/src/data/upgrade';
import { compareItem, compareTargets, equippedItems, migrateEquip, normSlot, targetSlot } from '../shared/src/equip';
import { clampRarity, expeditionRarity, mythicKreisBoss, rarityTable } from '../shared/src/rarity';
import { computeStats, newCharacter } from '../shared/src/stats';
import type { CharData, ClassId, ItemInstance, Mods } from '../shared/src/types';
import { SLOTS } from '../shared/src/types';
import { Rng } from '../shared/src/util/rng';
import { Sim, type Tester } from './helpers/sim';
import * as GearFx from '../server/src/gearfx';

let sim: Sim;
beforeAll(() => { sim = new Sim(); });
afterAll(() => sim.close());

const it0 = (base: string, o: Partial<ItemInstance> = {}): ItemInstance => ({ uid: 'u' + Math.random().toString(36).slice(2), base, rarity: 0, ilvl: 1, up: 0, affixes: [], ...o });
const T = (L: number) => Math.max(1, Math.min(6, 1 + Math.floor((L - 1) / 5)));

/** Grundwerte bis 0.8 (fünf Plätze) – Referenz für die Kurve */
function oldBase(kind: 'weapon' | 'helm' | 'armor' | 'ring' | 'amulet', aclass: 'heavy' | 'light' | 'robe', L: number): Mods {
  const am = ARMOR_DEF_MUL[aclass];
  switch (kind) {
    case 'weapon': return { power: Math.round(5 + L * 3) };
    case 'helm': return aclass === 'robe' ? { def: Math.round((2 + L * 1.1) * am), mp: Math.round(4 + L * 1.5) } : { def: Math.round((2 + L * 1.1) * am) };
    case 'armor': {
      const m: Mods = { def: Math.round((4 + L * 1.9) * am) };
      if (aclass === 'heavy') m.hp = Math.round(6 + L * 2.5);
      if (aclass === 'robe') m.mp = Math.round(6 + L * 2);
      if (aclass === 'light') m.hp = Math.round(3 + L * 1.4);
      return m;
    }
    case 'ring': return { power: Math.round(1 + L * 0.6) };
    case 'amulet': return { hp: Math.round(10 + L * 5) };
  }
}
const sum = (ms: Mods[]) => { const o: Record<string, number> = {}; for (const m of ms) for (const k in m) o[k] = (o[k] ?? 0) + (m as any)[k]; return o; };

describe('Plätze je Klasse', () => {
  it('zehn Plätze; Rüstung nach Rüstungsklasse, Zweithand nach Klasse, Schmuck für alle', () => {
    expect(SLOTS.length).toBe(10);
    expect(CLASS_OFFHAND).toEqual({ krieger: ['shield'], paladin: ['shield'], waldlaeufer: ['quiver'], magier: ['tome', 'focus'], schattenjaeger: ['offdagger'] });
    for (const cls of CLASS_IDS) for (const b of Object.values(ITEMS)) {
      if (b.kind === 'offhand') expect(canEquip(cls, b), `${cls} ${b.id}`).toBe(CLASS_OFFHAND[cls].includes(b.oh!));
      if (['helm', 'armor', 'gloves', 'legs', 'boots'].includes(b.kind)) expect(canEquip(cls, b), `${cls} ${b.id}`).toBe(b.aclass === CLASSES[cls].armor);
      if (b.kind === 'accessory') expect(canEquip(cls, b)).toBe(true);
    }
    // jede Art hat Grundgegenstände für alle sechs Stufen, mit Namen im Stil der alten
    for (const cls of CLASS_IDS) for (let t = 1; t <= 6; t++) for (const k of GEN_KINDS) {
      const b = ITEMS[gearBase(cls, k, t)];
      expect(b, `${cls} ${k} ${t}`).toBeTruthy();
      expect(canEquip(cls, b)).toBe(true);
    }
    expect(ITEMS.gl_heavy_3.name).toBe('Glutstahlstulpen');
    expect(ITEMS.oh_shield_1.name).toBe('Eisenholzschild');
    expect(ITEMS.bt_robe_5.name).toBe('Runensandalen');
    // Ringe passen auf beide Ringplätze, der Talisman auf den Amulettplatz
    expect(slotsFor(ITEMS.c_ring_2)).toEqual(['ring1', 'ring2']);
    expect(slotsFor(ITEMS.c_charm_2)).toEqual(['amulet']);
    expect(slotsFor(ITEMS.potion_hp1)).toEqual([]);
  });

  it('Anlegen: freie Ringplätze zuerst, gewünschter Platz (auch alte Namen), falsche Klasse abgelehnt', () => {
    const t = sim.join('Ringtraeger', 'waldlaeufer', 10);
    const c = t.p.char;
    const rings = [1, 2, 3].map(i => it0('c_ring_2', { uid: 'ring' + i, ilvl: 8 }));
    for (const r of rings) t.p.addItem(r);
    t.send({ t: 'equip', uid: 'ring1' });
    t.send({ t: 'equip', uid: 'ring2' });
    expect(c.equip.ring1?.uid).toBe('ring1');
    expect(c.equip.ring2?.uid).toBe('ring2');
    t.send({ t: 'equip', uid: 'ring3', slot: 'acc2' });            // alter Platzname eines alten Clients
    expect(c.equip.ring2?.uid).toBe('ring3');
    expect(c.inv.some(i => i.uid === 'ring2')).toBe(true);
    t.send({ t: 'unequip', slot: 'acc1' });
    expect(c.equip.ring1).toBeUndefined();
    t.p.addItem(it0('oh_shield_2', { uid: 'schild', ilvl: 8 }));
    t.send({ t: 'equip', uid: 'schild' });
    expect(c.equip.offhand?.uid).not.toBe('schild');               // Waldläufer führt keinen Schild
    t.p.addItem(it0('oh_quiver_2', { uid: 'koecher', ilvl: 8 }));
    t.send({ t: 'equip', uid: 'koecher' });
    expect(c.equip.offhand?.uid).toBe('koecher');
    for (const k of ['gloves', 'legs', 'boots'] as const) { const it = generateGear(new Rng(3), 9, 1, 'waldlaeufer', k); t.p.addItem(it); t.send({ t: 'equip', uid: it.uid }); expect(c.equip[k]?.uid).toBe(it.uid); }
    expect(targetSlot(c, 'c_ring_1')).toBe('ring1');
    expect(normSlot('acc2')).toBe('ring2');
    expect(normSlot('foo')).toBeNull();
  });

  it('neue Charaktere starten mit Waffe, Zweithand, Brust und Handschuhen', () => {
    for (const cls of CLASS_IDS) {
      const c = newCharacter('Neu', cls);
      expect(Object.keys(c.equip).sort()).toEqual(['armor', 'gloves', 'offhand', 'weapon']);
      for (const it of equippedItems(c)) expect(canEquip(cls, ITEMS[it.base])).toBe(true);
      expect(c.eqv).toBe(2);
      expect(sanitizeChar(JSON.parse(JSON.stringify(c)))!.equip).toEqual(c.equip); // nichts wird beigelegt
    }
  });
});

describe('Budget je Platz', () => {
  it('voll ausgerüstet: Angriff, Verteidigung, Leben und Mana wie die alten fünf Plätze (Stufe 10/20/30/40)', () => {
    for (const cls of CLASS_IDS) for (const L of [10, 20, 30, 40]) {
      const a = CLASSES[cls].armor, t = T(L);
      const old = sum([oldBase('weapon', a, L), oldBase('helm', a, L), oldBase('armor', a, L), oldBase('ring', a, L), oldBase('amulet', a, L)]);
      const kit = SLOTS.map(s => it0(gearBase(cls, s === 'ring1' || s === 'ring2' ? 'accessory' : s === 'amulet' ? 'accessory' : s as any, t, s === 'amulet' ? 'amulet' : s.startsWith('ring') ? 'ring' : undefined), { ilvl: L }));
      const now = sum(kit.map(baseMods));
      for (const k of ['power', 'def', 'hp', 'mp']) expect(Math.abs((now[k] ?? 0) - (old[k] ?? 0)), `${cls} L${L} ${k}: ${now[k]} statt ${old[k]}`).toBeLessThanOrEqual(3);
    }
  });
  it('Eigenschaften: zehn Plätze tragen zusammen so viel wie früher fünf', () => {
    // Faktor je Platz, Ringe doppelt: Summe 5 = fünf alte Plätze mit Faktor 1
    const total = SLOTS.reduce((s, sl) => s + AFFIX_SCALE[slotKind(ITEMS[gearBase('krieger', sl.startsWith('ring') || sl === 'amulet' ? 'accessory' : sl as any, 3, sl === 'amulet' ? 'amulet' : sl.startsWith('ring') ? 'ring' : undefined)])!], 0);
    expect(total).toBeCloseTo(5, 5);
    // gewürfelt: Stärke auf einer Waffe ist im Mittel 60 % so stark wie früher
    const rng = new Rng(77);
    let v = 0, n = 0;
    for (let i = 0; i < 3000; i++) for (const [k, x] of generateGear(rng, 30, 2, 'krieger', 'weapon').affixes) if (k === 'str') { v += x; n++; }
    expect(v / n / ((1 + 30 * 0.35) * 1.16 * 1.025)).toBeGreaterThan(0.55);
    expect(v / n / ((1 + 30 * 0.35) * 1.16 * 1.025)).toBeLessThan(0.65);
  });
  it('typischer Charakter (Spieltest-Modell): Angriff, Verteidigung und Leben im Mittel wie vor 0.9 (±6 %)', async () => {
    const { plausibleChar } = await import('../scripts/playtest/chars');
    // Mittelwerte vor 0.9 (fünf Plätze; 60 Würfe je Klasse und Stufe, scripts/playtest/chars.ts, Ausrüstung „typisch“): Angriff, Verteidigung, Leben
    const REF: Record<string, [number, number, number]> = {
      'krieger 10': [141, 111, 676], 'krieger 20': [278, 225, 1150], 'krieger 30': [419, 362, 1768], 'krieger 40': [627, 534, 2323],
      'magier 10': [143, 33, 438], 'magier 20': [267, 63, 738], 'magier 30': [394, 98, 1032], 'magier 40': [526, 136, 1351],
      'waldlaeufer 10': [139, 48, 515], 'waldlaeufer 20': [272, 97, 828], 'waldlaeufer 30': [417, 149, 1129], 'waldlaeufer 40': [601, 203, 1457],
      'paladin 10': [132, 95, 627], 'paladin 20': [254, 191, 1052], 'paladin 30': [383, 308, 1540], 'paladin 40': [564, 469, 2091],
      'schattenjaeger 10': [136, 47, 464], 'schattenjaeger 20': [258, 91, 768], 'schattenjaeger 30': [393, 142, 1077], 'schattenjaeger 40': [553, 191, 1401],
    };
    for (const cls of CLASS_IDS) for (const L of [10, 20, 30, 40]) {
      const acc = [0, 0, 0], N = 40;
      for (let s = 1; s <= N; s++) { const d = computeStats(plausibleChar(cls, L, { seed: s })); acc[0] += d.power; acc[1] += d.def; acc[2] += d.maxHp; }
      const ref = REF[`${cls} ${L}`];
      acc.forEach((x, i) => {
        const r = x / N / ref[i];
        expect(r, `${cls} L${L} ${['Angriff', 'Verteidigung', 'Leben'][i]}`).toBeGreaterThan(0.94);
        expect(r, `${cls} L${L} ${['Angriff', 'Verteidigung', 'Leben'][i]}`).toBeLessThan(1.07);
      });
    }
  });
});

describe('Überführung alter Spielstände', () => {
  /** Ein Charakter, wie er vor 0.9 gespeichert wurde: fünf Plätze, Schmuck auf acc1/acc2, kein `eqv` */
  function oldSave(cls: ClassId, acc1: string | null, acc2: string | null): any {
    const c: any = JSON.parse(JSON.stringify(newCharacter('Alt', cls)));
    delete c.eqv;
    const C = CLASSES[cls];
    c.level = 24;
    c.equip = {
      weapon: it0(`w_${C.weapon}_5`, { uid: 'w', rarity: 3, ilvl: 22, up: 6, affixes: [['crit', 3]], element: 'fire', elv: 2, ench: 'macht' }),
      helm: it0(`h_${C.armor}_4`, { uid: 'h', rarity: 2, ilvl: 20, up: 3, set: 'frostweberin', name: 'Kopfschutz der Frostweberin' }),
      armor: it0(`a_${C.armor}_4`, { uid: 'a', rarity: 4, ilvl: 22, up: 10, affixes: [['hp', 60], ['vit', 7]] }),
    };
    if (acc1) c.equip.acc1 = it0(acc1, { uid: 'acc1', rarity: 3, ilvl: 21, up: 4, affixes: [['crit', 4], ['resFire', 9]], ench: 'eile' });
    if (acc2) c.equip.acc2 = it0(acc2, { uid: 'acc2', rarity: 2, ilvl: 20, up: 7, affixes: [['hp', 40]], set: 'frostweberin', name: 'Anhänger der Frostweberin' });
    return c;
  }
  const strip = (it: ItemInstance) => JSON.stringify({ ...it });

  it('Ring → Ring, Amulett und Talisman → Amulett; jede Eigenschaft, Stufe, Rune und Set bleibt; jede Klasse', () => {
    for (const cls of CLASS_IDS) for (const [a1, a2, want1, want2] of [
      ['c_ring_5', 'c_amulet_4', 'ring1', 'amulet'],
      ['c_charm_5', 'c_ring_4', 'amulet', 'ring1'],
      ['c_ring_5', 'c_ring_4', 'ring1', 'ring2'],
      ['c_amulet_5', null, 'amulet', null],
      [null, 'c_charm_4', null, 'amulet'],
    ] as const) {
      const raw = oldSave(cls, a1, a2);
      const before = JSON.parse(JSON.stringify(raw));
      const c = sanitizeChar(raw)!;
      expect(c.equip.acc1).toBeUndefined(); expect(c.equip.acc2).toBeUndefined();
      expect(c.eqv).toBe(2);
      if (want1) expect(strip(c.equip[want1]!)).toBe(strip(before.equip.acc1));
      if (want2) expect(strip(c.equip[want2]!)).toBe(strip(before.equip.acc2));
      for (const s of ['weapon', 'helm', 'armor'] as const) expect(strip(c.equip[s]!)).toBe(strip(before.equip[s]));
      expect(c.equip.weapon!.up).toBe(6); expect(c.equip.armor!.up).toBe(10);
      // Borin legt Stücke für die neuen, leeren Plätze bei – ohne Eigenschaften, Seltenheit höchstens die der Spender (0.11)
      for (const s of ['offhand', 'gloves', 'legs', 'boots'] as const) {
        const g = c.equip[s]!;
        expect(g, `${cls} ${s}`).toBeTruthy(); expect(g.affixes).toEqual([]); expect(g.gift).toBe(1); expect(g.up).toBeLessThanOrEqual(9);
        expect(g.rarity).toBeLessThanOrEqual(4); expect(canEquip(cls, ITEMS[g.base])).toBe(true);
      }
      // ein zweiter Lauf ändert nichts mehr
      const again = sanitizeChar(JSON.parse(JSON.stringify(c)))!;
      expect(again.equip).toEqual(c.equip);
      expect(again.inv.length).toBe(c.inv.length);
    }
  });

  it('zwei Amulette: das zweite wandert in den Rucksack – auch wenn der voll ist', () => {
    for (const cls of CLASS_IDS) {
      const raw = oldSave(cls, 'c_amulet_5', 'c_charm_4');
      raw.inv = Array.from({ length: CFG.player.invSize }, (_, i) => it0('mat_wood', { uid: 'm' + i, qty: 2 }));
      const c = sanitizeChar(raw)!;
      expect(c.equip.amulet!.uid).toBe('acc1');
      expect(c.inv.length).toBe(CFG.player.invSize + 1);
      expect(c.inv.at(-1)!.uid).toBe('acc2');
      expect(c.inv.at(-1)!.up).toBe(7);
      const again = sanitizeChar(JSON.parse(JSON.stringify(c)))!;      // bleibt beim nächsten Laden erhalten
      expect(again.inv.some(i => i.uid === 'acc2')).toBe(true);
    }
  });

  it('nach dem Laden steht ein alter Charakter so stark da wie vorher, aber nie stärker (Grundwerte −6 % … ±0, 0.11; bis 0.10: −20 %)', () => {
    for (const cls of CLASS_IDS) {
      const raw = oldSave(cls, 'c_ring_5', 'c_amulet_4');
      // alte Werte: Grundwerte nach der alten Formel + Eigenschaften, Runen und Zustände wie damals
      const c = sanitizeChar(JSON.parse(JSON.stringify(raw)))!;
      const d = computeStats(c);
      const ref = newCharacter('Ref', cls); ref.level = 24; ref.attrs = c.attrs; ref.equip = {};
      const refStats = computeStats(ref);
      const L = (it: any) => it.ilvl, mul = (it: any) => CFG.loot.rarityStatMul[it.rarity] * (1 + CFG.upgrade.statPerLevel * it.up);
      const e = raw.equip, a = CLASSES[cls].armor;
      const oldPow = Math.round((5 + 3 * L(e.weapon)) * mul(e.weapon)) + Math.round((1 + 0.6 * L(e.acc1)) * mul(e.acc1));
      const newPow = equippedItems(c).reduce((s, it) => s + (baseMods(it).power ?? 0), 0);
      expect(newPow / oldPow, `${cls} Angriff aus Grundwerten`).toBeGreaterThan(0.94); // 0.10: 0.85 – Borins Stücke waren gewöhnlich
      expect(newPow / oldPow, `${cls} Angriff aus Grundwerten`).toBeLessThan(1.02);
      const oldDef = Math.round((2 + 1.1 * L(e.helm)) * ARMOR_DEF_MUL[a] * mul(e.helm)) + Math.round((4 + 1.9 * L(e.armor)) * ARMOR_DEF_MUL[a] * mul(e.armor));
      const newDef = equippedItems(c).reduce((s, it) => s + (baseMods(it).def ?? 0), 0);
      expect(newDef / oldDef, `${cls} Verteidigung aus Grundwerten`).toBeGreaterThan(0.94); // hier: legendäre Brust +10 – 0.10: 0.8
      expect(newDef / oldDef, `${cls} Verteidigung aus Grundwerten`).toBeLessThan(1.02);
      expect(d.power).toBeGreaterThan(refStats.power);
    }
  });

  it('Borins Beigabe in allen Lagen: alles gewöhnlich +0 bleibt gewöhnlich, alles legendär +10 verliert höchstens 6 %, nie ein Gewinn; nicht umschmiedbar', () => {
    const oldDefOf = (raw: any, a: string) => { const L = (it: any) => it.ilvl, mul = (it: any) => CFG.loot.rarityStatMul[it.rarity] * (1 + CFG.upgrade.statPerLevel * it.up); return Math.round((2 + 1.1 * L(raw.equip.helm)) * ARMOR_DEF_MUL[a as 'heavy'] * mul(raw.equip.helm)) + Math.round((4 + 1.9 * L(raw.equip.armor)) * ARMOR_DEF_MUL[a as 'heavy'] * mul(raw.equip.armor)); };
    const oldPowOf = (raw: any) => { const L = (it: any) => it.ilvl, mul = (it: any) => CFG.loot.rarityStatMul[it.rarity] * (1 + CFG.upgrade.statPerLevel * it.up); return Math.round((5 + 3 * L(raw.equip.weapon)) * mul(raw.equip.weapon)) + (raw.equip.acc1 ? Math.round((1 + 0.6 * L(raw.equip.acc1)) * mul(raw.equip.acc1)) : 0); };
    for (const cls of CLASS_IDS) for (const [rarity, up, ilvl] of [[0, 0, 8], [4, 10, 30], [2, 5, 18], [3, 8, 39], [1, 1, 3]] as const) {
      const raw = oldSave(cls, 'c_ring_5', null);
      for (const k of ['weapon', 'helm', 'armor', 'acc1']) Object.assign(raw.equip[k], { rarity, up, ilvl, affixes: [] });
      const before = JSON.parse(JSON.stringify(raw)), c = sanitizeChar(raw)!, a = CLASSES[cls].armor;
      const def = equippedItems(c).reduce((s, it) => s + (baseMods(it).def ?? 0), 0), pow = equippedItems(c).reduce((s, it) => s + (baseMods(it).power ?? 0), 0);
      const tag = `${cls} ${RARITY_NAME[rarity]} +${up} L${ilvl}`;
      // nie stärker als vorher – bis auf die Rundung der Grundwerte je Teil (höchstens ein halber Punkt je Stück)
      const od = oldDefOf(before, a), op = oldPowOf(before);
      expect(def / od, tag + ' Verteidigung').toBeGreaterThan(0.94);
      expect(def, tag + ' Verteidigung').toBeLessThanOrEqual(od * 1.01 + 2.5);
      expect(pow / op, tag + ' Angriff').toBeGreaterThan(0.94);
      expect(pow, tag + ' Angriff').toBeLessThanOrEqual(op * 1.01 + 2.5);
      const gifts = equippedItems(c).filter(it => it.gift);
      expect(gifts.length, tag).toBe(5); // Zweithand, Handschuhe, Beine, Schuhe, zweiter Ring
      for (const g of gifts) {
        expect(g.rarity, tag).toBeLessThanOrEqual(rarity); expect(g.affixes).toEqual([]); expect(g.up).toBeLessThanOrEqual(9);
        expect(Math.abs(g.ilvl - ilvl), tag).toBeLessThanOrEqual(1);
        expect(reforgeBlock(c, g), 'Beigabe nicht umschmiedbar').toMatch(/Borin/);
      }
      if (rarity === 0 && up === 0) for (const g of gifts) { expect(g.rarity).toBe(0); expect(g.up).toBe(0); }
    }
  });

  it('Lager auf dem Hof: alte Stücke bleiben unverändert, Mythisch bleibt, Unsinn wird begrenzt', () => {
    const stash = [
      it0('c_charm_3', { uid: 's1', rarity: 4, ilvl: 14, up: 7, affixes: [['powerPct', 4]], name: 'Feuerstein der Sippe' }),
      it0('c_ring_6', { uid: 's2', rarity: 3, ilvl: 33, up: 2, set: 'hohlekrone', name: 'Reif der Hohlen Krone' }),
      it0('gl_heavy_4', { uid: 's3', rarity: 5, ilvl: 50, up: 10 }),
      it0('w_sword_6', { uid: 's4', rarity: 9, ilvl: 40 }),
    ];
    const h = sanitizeHome({ owned: 1, level: 1, gold: 0, stash: JSON.parse(JSON.stringify(stash)), stands: [], pets: [], looks: [], kills: {}, seen: {}, ms: [] });
    expect(h.stash[0]).toEqual(stash[0]);
    expect(h.stash[1]).toEqual(stash[1]);
    expect(h.stash[2].rarity).toBe(MYTHIC);
    expect(h.stash[3].rarity).toBe(RARITY_MAX);
  });

  it('Handel: ein alter Talisman in einem laufenden Handel kommt unverändert an und passt auf den Amulettplatz', () => {
    const a = sim.join('Altverkauf', 'krieger', 20), b = sim.join('Neukauf', 'magier', 20);
    b.p.x = a.p.x + 10; b.p.y = a.p.y;
    const charm = it0('c_charm_4', { uid: 'tal', rarity: 3, ilvl: 18, up: 5, affixes: [['resWater', 8], ['hp', 40]], ench: 'glueck' });
    a.p.addItem(JSON.parse(JSON.stringify(charm)));
    sim.step(CFG.social.tradeRequestCooldownSec + 0.1);
    a.send({ t: 'trade', a: 'request', id: b.p.id });
    b.send({ t: 'trade', a: 'accept' });
    a.send({ t: 'trade', a: 'add', uid: 'tal' });
    // während der Handel offen ist, wird der Stand des Verkäufers gespeichert und neu geladen (z. B. Autosave)
    const reloaded = sanitizeChar(JSON.parse(JSON.stringify(a.p.char)))!;
    expect(reloaded.inv.find(i => i.uid === 'tal')).toEqual(charm);
    sim.step(CFG.social.tradeLockDelaySec + 0.1);
    a.send({ t: 'trade', a: 'lock' }); b.send({ t: 'trade', a: 'lock' });
    a.send({ t: 'trade', a: 'confirm' }); b.send({ t: 'trade', a: 'confirm' });
    const got = b.p.char.inv.find(i => i.base === 'c_charm_4')!;
    expect(got).toBeTruthy();
    expect({ ...got, uid: 'tal' }).toEqual(charm);
    b.send({ t: 'equip', uid: got.uid });
    expect(b.p.char.equip.amulet?.uid).toBe(got.uid);
  });
});

describe('Mythisch', () => {
  it('sechste Seltenheit: alle Tabellen haben die volle Länge', () => {
    expect(RARITY_NAME.length).toBe(6);
    expect(RARITY_NAME[MYTHIC]).toBe('Mythisch');
    for (const t of [RARITY_COLOR, CFG.loot.rarityStatMul, CFG.loot.affixCount, CFG.loot.elementChance]) expect(t.length).toBe(RARITY_NAME.length);
    expect(rarityTable([1, 2])).toEqual([1, 2, 0, 0, 0, 0]);
    expect(rarityTable([1, 2], 3)[MYTHIC]).toBe(3);
    expect(clampRarity(7)).toBe(RARITY_MAX); expect(clampRarity(-1)).toBe(0); expect(clampRarity('x')).toBe(0);
    const m = generateGear(new Rng(5), 45, MYTHIC, 'paladin', 'armor');
    expect(m.rarity).toBe(MYTHIC);
    expect(m.affixes.length).toBe(CFG.loot.affixCount[MYTHIC]);
    expect(baseMods(m).def!).toBeGreaterThan(baseMods({ ...m, rarity: 4 }).def!);
    expect(generateGear(new Rng(5), 45, 99, 'paladin', 'armor').rarity).toBe(RARITY_MAX);
  });
  it('nur aus dem schwersten Inhalt: nie aus normalen Tabellen, ab hohen Riss-Stufen, Kreis-Bossen und schweren Expeditionen', () => {
    const rng = new Rng(9);
    const plain = [CFG.loot.rarityWeights, CFG.loot.eliteRarityWeights, CFG.loot.bossRarityWeights, ...Object.values(CFG.loot.chestRarityWeights), CFG.craft.gearWeights, CFG.craft.masterWeights, CFG.craft.setWeights, CFG.living.boss.rarity, CFG.living.treasure.rarity];
    for (const w of plain) for (let i = 0; i < 2000; i++) expect(rollRarity(rng, w)).toBeLessThan(MYTHIC);
    for (let s = 1; s < CFG.loot.mythic.riftFrom; s++) expect(riftRarity(s)[MYTHIC]).toBe(0);
    expect(riftRarity(CFG.loot.mythic.riftFrom)[MYTHIC]).toBeGreaterThan(0);
    expect(riftRarity(CFG.rift.maxStufe)[MYTHIC]).toBeCloseTo(CFG.loot.mythic.riftMax, 5);
    expect(riftRarity(20).length).toBe(RARITY_NAME.length);
    let hits = 0; for (let i = 0; i < 4000; i++) if (rollRarity(rng, riftRarity(30)) === MYTHIC) hits++;
    expect(hits).toBeGreaterThan(0);
    expect(mythicKreisBoss(0)).toBe(0); expect(mythicKreisBoss(1)).toBe(0); expect(mythicKreisBoss(2)).toBeGreaterThan(0);
    for (const d of ['normal', 'schwer', 'albtraum', 'mythisch'] as const) for (const k of ['chest', 'boss'] as const) expect(expeditionRarity(d, k).length).toBe(RARITY_NAME.length);
    expect(expeditionRarity('normal', 'boss')[MYTHIC]).toBe(0);
    expect(expeditionRarity('schwer', 'boss')[MYTHIC]).toBe(0);
    expect(expeditionRarity('albtraum', 'chest')[MYTHIC]).toBe(0);
    expect(expeditionRarity('albtraum', 'boss')[MYTHIC]).toBeGreaterThan(0);
    expect(expeditionRarity('mythisch', 'chest')[MYTHIC]).toBeGreaterThan(0);
    // die Expeditionen (shared/src/data/expeditions.ts) nutzen dieselben Gewichte für „Mythisch“
    expect(diffRarity('normal')[MYTHIC]).toBe(0); expect(diffRarity('schwer')[MYTHIC]).toBe(0);
    expect(diffRarity('albtraum')[MYTHIC]).toBe(expeditionRarity('albtraum', 'boss')[MYTHIC]);
    expect(diffRarity('mythisch')[MYTHIC]).toBe(expeditionRarity('mythisch', 'boss')[MYTHIC]);
    expect(diffRarity('mythisch').length).toBe(RARITY_NAME.length);
    // Beute ohne festgelegte Art fällt für alle zehn Plätze
    const kinds = new Set<string>(); for (let i = 0; i < 600; i++) kinds.add(slotKind(ITEMS[generateGear(rng, 30, 2, 'magier').base])!);
    expect([...kinds].sort()).toEqual([...SLOT_KINDS].sort());
    // Händler der Quellwarte: über ein paar Tage alle Arten, nie Mythisch
    const hub = new Set<string>();
    for (let d = 0; d < 4; d++) for (const o of traderStock('paladin', 30, 20000 + d, 2857)) { hub.add(slotKind(ITEMS[o.item.base])!); expect(o.item.rarity).toBeLessThan(MYTHIC); expect(canEquip('paladin', ITEMS[o.item.base])).toBe(true); }
    expect([...hub].sort()).toEqual([...SLOT_KINDS].sort());
  });
  it('Bosstruhe im Neuen Kreis 2 kann Mythisch enthalten, im ersten Durchgang nie', () => {
    const t = sim.join('Mythenjaeger', 'schattenjaeger', 40);
    let found0 = 0, found2 = 0;
    const z = sim.zone('wurzelgruft');
    const chest = z.addDynamicObj('chest', t.p.x, t.p.y, { tier: 'gold', boss: true });
    for (const [kreis, add] of [[0, (n: number) => { found0 += n; }], [2, (n: number) => { found2 += n; }]] as const) for (let i = 0; i < 120; i++) {
      (z as any).kreis = kreis;
      sim.seed(z, 1000 + i);
      t.p.char.inv = [];
      chest.looted?.clear(); delete t.p.char.flags[`c:wurzelgruft:${chest.props!.sid}`];
      (z as any).openChest(t.p, chest);
      add(t.p.char.inv.filter(it => it.rarity === MYTHIC).length);
    }
    (z as any).kreis = 0;
    expect(found0).toBe(0);
    expect(found2).toBeGreaterThan(0);
  });
});

describe('Verbessern', () => {
  it('Kosten steigen, Rohstoffe werden seltener: Erz → Essenzen → Bosskern → Ätherstaub (Risse: Echo-Fragmente)', () => {
    const it = generateGear(new Rng(1), 18, 2, 'krieger', 'helm');
    let lastGold = 0;
    for (let up = 0; up < 10; up++) {
      const c = upgradeCost({ ...it, up })!;
      expect(c.gold).toBeGreaterThan(lastGold); lastGold = c.gold;
      const has = (b: string) => c.mats.some(([x]) => x === b);
      expect(has('mat_frost')).toBe(true);                                  // Erz der Stufe 4 (Gegenstandsstufe 18)
      expect(has(ESSENCE.water)).toBe(up >= 3);
      expect(has(BOSS_CORE.ysolde)).toBe(up >= 6);
      expect(has(AETHER)).toBe(up === 9);
      expect(has(ECHO_FRAG)).toBe(false);
    }
    expect(upgradeCost({ ...it, up: 10 })).toBeNull();
    const rift = { ...generateGear(new Rng(2), 55, 3, 'krieger', 'weapon'), up: 9 };
    expect(upgradeCost(rift)!.mats.some(([b]) => b === ECHO_FRAG)).toBe(true);
  });
  it('jede Stufe gelingt am Amboss, kostet genau das Angekündigte; +3/+6/+9 bringen eine Eigenschaft, +10 eine Passive', () => {
    const t = sim.join('Fairschmied', 'krieger', 30);
    sim.gotoNpc(t, 'borin');
    const c = t.p.char;
    const w = c.equip.weapon!;
    w.ilvl = 23; w.up = 0;                                               // Materialstufe 5: Runenstaub, Ahnenknochen, Wind, Archivar
    c.gold = 1e7;
    for (const b of ['mat_rune', 'mm_bone', ESSENCE.wind, BOSS_CORE.archivar, AETHER]) t.give(b, 99);
    for (let up = 0; up < 10; up++) {
      const cost = upgradeCost(w)!, pre = upgradePreview(w)!;
      const before = Object.fromEntries(cost.mats.map(([b]) => [b, t.count(b)])), gold = c.gold;
      t.send({ t: 'upgrade', uid: w.uid, npc: 'borin' });
      expect(c.equip.weapon!.up).toBe(up + 1);
      expect(c.gold).toBe(gold - cost.gold);
      for (const [b, n] of cost.mats) expect(t.count(b)).toBe(before[b] - n);
      if ([3, 6, 9].includes(up + 1)) expect(pre.bonus).toEqual(UPGRADE_BONUS.weapon[[3, 6, 9].indexOf(up + 1)]);
      else expect(pre.bonus).toBeNull();
      expect(!!pre.passive).toBe(up + 1 === 10);
    }
    expect(itemMods(w).critDmg).toBeGreaterThanOrEqual(UPGRADE_BONUS.weapon[1][1]);
    expect(t.p.stats.gearFx!.up10.meister).toBe(1);
    // ohne Material: nichts passiert, nichts geht verloren
    const helm = generateGear(new Rng(4), 28, 1, 'krieger', 'helm');
    t.p.addItem(helm);
    c.inv = c.inv.filter(i => i.base !== 'mat_rune');
    const snap = JSON.stringify([c.gold, c.inv]);
    t.send({ t: 'upgrade', uid: helm.uid, npc: 'borin' });
    expect(helm.up).toBe(0);
    expect(JSON.stringify([c.gold, c.inv])).toBe(snap);
    expect(upgradeBlock(c, helm)).toMatch(/Es fehlt/);
  });
  it('Boni und Passiven sind für jede Art festgelegt; alte Stufen bleiben erhalten', () => {
    for (const k of SLOT_KINDS) { expect(UPGRADE_BONUS[k].length).toBe(3); expect(UP10[k].text.length).toBeGreaterThan(10); }
    expect(new Set(SLOT_KINDS.map(k => UP10[k].id)).size).toBe(SLOT_KINDS.length);
    expect(upgradeBonus('ring', 2)).toEqual({});
    expect(Object.keys(upgradeBonus('ring', 9)).length).toBe(3);
    // Schuhe +10: +5 % Tempo, Beine +10: schnellere Rolle – reine Werte
    const c = newCharacter('P', 'magier');
    const base = computeStats(c);
    c.equip.boots = it0('bt_robe_1', { up: 10 }); c.equip.legs = it0('lg_robe_1', { up: 10 });
    const d = computeStats(c);
    expect(d.speed).toBeGreaterThan(base.speed);
    expect(d.dodgeCd).toBeLessThan(base.dodgeCd);
    expect(d.gearFx!.up10).toEqual({ leicht: 1, standfest: 1 });
  });
  it('Passiven im Kampf: Zweiter Atem (Brust +10) und Manafunke (Ring +10)', () => {
    const t = sim.join('Atemzug', 'paladin', 20);
    const { z, x, y } = sim.arena(t);
    t.p.char.equip.armor = { ...generateGear(new Rng(6), 20, 2, 'paladin', 'armor'), up: 10 };
    t.p.recalc();
    t.p.hp = t.p.stats.maxHp;
    z.hitPlayer(t.p, t.p.stats.maxHp * 2.2, 'phys', 1, 'Probe');       // knapp über null: unter 30 % → sofort zurück
    if (!t.p.dead) expect(t.p.hp).toBeGreaterThan(t.p.stats.maxHp * CFG.gearFx.atem.heal * 0.9);
    const hp1 = t.p.hp;
    z.hitPlayer(t.p, 1, 'phys', 1, 'Probe');
    expect(t.p.hp).toBeLessThanOrEqual(hp1);                             // höchstens einmal je Minute
    t.p.char.equip.ring1 = it0('c_ring_4', { up: 10, ilvl: 20 }); t.p.recalc();
    t.p.mp = 0;
    const m = sim.dummy(z, 'waldwolf', 20, x + 10, y);
    t.p.stats.crit = 1;
    z.hitMob(m, t.p, 10, 'phys');
    expect(t.p.mp).toBeGreaterThanOrEqual(CFG.gearFx.funke);
  });
});

describe('Sets mit sechs Teilen', () => {
  it('jedes Set: sechs Teile für jede Klasse, 4er-Bonus verändert eine eigene Fähigkeit, volle Wirkung je Set verschieden', () => {
    expect(SET_PIECES.length).toBe(SET_FULL);
    expect(new Set(SET_LIST.map(s => s.full.id)).size).toBe(SET_LIST.length);
    for (const s of SET_LIST) for (const cls of CLASS_IDS) {
      const sk = s.skill4[cls];
      expect(sk.skill.startsWith({ krieger: 'kr_', magier: 'ma_', waldlaeufer: 'wl_', paladin: 'pa_', schattenjaeger: 'sj_' }[cls]), `${s.id} ${cls}`).toBe(true);
      expect((sk.dmg ?? 0) + (sk.cd ?? 0)).toBeGreaterThan(0);
      for (const p of SET_PIECES) { const it = makeSetPiece(new Rng(2), s.id, p, cls); expect(canEquip(cls, ITEMS[it.base])).toBe(true); expect(it.set).toBe(s.id); }
      // Handschutz und Schritt lassen sich schmieden
      expect(RECIPES[`f_set_${s.id}_gloves`]).toBeTruthy(); expect(RECIPES[`f_set_${s.id}_boots`]).toBeTruthy();
    }
    // Schmiederezepte für jede Art und Stufe
    for (const k of GEAR_KINDS) for (let t = 1; t <= 6; t++) expect(RECIPES[`f_${k}_${t}`], `${k} ${t}`).toBeTruthy();
  });
  it('alte Setteile (Kopfschutz, Gewand, Reif, Anhänger) zählen weiter; volle Wirkung im Kampf: Rindenhaut und Aschenregen', () => {
    const t = sim.join('Wurzeltraeger', 'krieger', 12);
    const { z, x, y } = sim.arena(t);
    const c = t.p.char, rng = new Rng(8);
    c.equip.helm = makeSetPiece(rng, 'wurzelwacht', 'helm', 'krieger'); c.equip.armor = makeSetPiece(rng, 'wurzelwacht', 'armor', 'krieger');
    c.equip.ring1 = makeSetPiece(rng, 'wurzelwacht', 'ring', 'krieger'); c.equip.amulet = makeSetPiece(rng, 'wurzelwacht', 'amulet', 'krieger');
    t.p.recalc();
    expect(setCounts(c).wurzelwacht).toBe(4);
    expect(t.p.stats.gearFx!.skill.kr_erdspalter.dmg).toBe(25);
    sim.step(0.2);
    expect(t.p.buffs.some(b => b.id === 'rinde')).toBe(false);
    c.equip.gloves = makeSetPiece(rng, 'wurzelwacht', 'gloves', 'krieger'); c.equip.boots = makeSetPiece(rng, 'wurzelwacht', 'boots', 'krieger');
    t.p.recalc();
    sim.step(0.2);
    const r = t.p.buffs.find(b => b.id === 'rinde');
    expect(r?.shield).toBe(Math.round(t.p.stats.maxHp * CFG.gearFx.rinde.shield));
    // Aschenregen: dasselbe mit Aschenglut – ein besiegter Gegner trifft seinen Nachbarn
    for (const p of SET_PIECES) { const it = makeSetPiece(rng, 'aschenglut', p, 'krieger'); (c.equip as any)[{ helm: 'helm', armor: 'armor', gloves: 'gloves', boots: 'boots', ring: 'ring1', amulet: 'amulet' }[p]] = it; }
    t.p.recalc();
    expect(t.p.stats.gearFx!.setFull).toEqual({ asche: 1 });
    const victim = sim.dummy(z, 'waldwolf', 12, x + 20, y, 5), next = sim.dummy(z, 'waldwolf', 12, x + 30, y);
    z.hitMob(victim, t.p, 1e6, 'phys');
    expect(next.hp).toBeLessThan(next.maxHp);
    // ablegen: Wirkung weg
    delete c.equip.boots; t.p.recalc();
    expect(t.p.stats.gearFx!.setFull).toEqual({});
    expect(SETS.aschenglut.bonus2.resFire).toBeGreaterThan(0);
  });
  it('die übrigen Passiven und vollen Sets wirken (Meisterschliff, Flinke Hände, Parade, Klarer Kopf, Quellsegen, Lichtbrechung, Frostspur, Stille, Krone)', () => {
    const t = sim.join('Wirkprobe', 'krieger', 30);
    const { z, x, y } = sim.arena(t);
    const p = t.p, G = CFG.gearFx;
    const fx = (up10: Record<string, number>, setFull: Record<string, number> = {}) => { p.stats.gearFx = { up10, setFull, skill: {} }; };
    fx({ meister: 1 });
    const muls = Array.from({ length: G.meister.every * 2 }, () => GearFx.attackMul(p));
    expect(muls.filter(m => m > 1).length).toBe(2);
    fx({ flink: 1 }); expect(GearFx.attackCdMul(p)).toBe(G.flink);
    fx({ parade: 1 }); sim.seed(z, 3);
    expect(Array.from({ length: 400 }, () => GearFx.takenMul(z, p)).filter(m => m < 1).length).toBeGreaterThan(10);
    fx({ klarheit: 1 }); expect(GearFx.statusDurMul(p)).toBe(G.klarheit);
    fx({ segen: 1 }); expect(GearFx.potionMul(p)).toBe(G.segen);
    fx({}); expect([GearFx.attackCdMul(p), GearFx.statusDurMul(p), GearFx.potionMul(p)]).toEqual([1, 1, 1]);
    // volle Sets
    const m = sim.dummy(z, 'waldwolf', 30, x + 20, y);
    fx({}, { prisma: 1 });
    for (let i = 0; i < G.prisma.every; i++) GearFx.afterSkill(z, p);
    expect(m.hp).toBeLessThan(m.maxHp);
    const hp1 = m.hp;
    fx({}, { frost: 1 }); GearFx.onDodge(z, p, sim.game.now);
    expect(m.hp).toBeLessThan(hp1);
    expect(m.statuses.has('slow')).toBe(true);
    const hp2 = m.hp; GearFx.onDodge(z, p, sim.game.now);                // Abklingzeit: keine zweite Nova
    expect(m.hp).toBe(hp2);
    fx({}, { stille: 1 }); GearFx.onDodge(z, p, sim.game.now);
    expect(GearFx.critBonus(p, sim.game.now).crit).toBe(1);
    expect(GearFx.critBonus(p, sim.game.now).crit).toBe(0);               // verbraucht
    fx({}, { krone: 1 }); p.hp = p.stats.maxHp;
    expect(GearFx.dealtMul(p)).toBe(1);
    p.hp = p.stats.maxHp * 0.2;
    expect(GearFx.dealtMul(p)).toBe(G.krone.dmg);
    expect(GearFx.lifesteal(p)).toBeLessThanOrEqual(CFG.combat.lifestealCap);
    expect(GearFx.lifesteal(p)).toBeGreaterThan(0);
  });
  it('4er-Bonus: kürzere Abklingzeit der Fähigkeit (Magier, Wurzelwacht → Blinzeln)', () => {
    const t = sim.join('Blinzler', 'magier', 12);
    sim.arena(t);
    t.p.char.skills.ma_blinzeln = 1; t.p.mp = 999;
    const cast = () => { t.p.cds.clear(); t.msgs.length = 0; t.send({ t: 'skill', id: 'ma_blinzeln', ang: 0, tx: t.p.x + 40, ty: t.p.y }); return (t.msgs.find(m => m.t === 'cd') as any).cd as number; };
    const plain = cast();
    const rng = new Rng(3), c = t.p.char;
    const sp = (p: (typeof SET_PIECES)[number]) => makeSetPiece(rng, 'wurzelwacht', p, 'magier', 0); // ohne Eigenschaften (keine Abklingzeit-Affixe)
    c.equip.helm = sp('helm'); c.equip.armor = sp('armor'); c.equip.gloves = sp('gloves'); c.equip.boots = sp('boots');
    t.p.recalc(); t.p.mp = 999;
    expect(cast()).toBeCloseTo(plain * 0.7, 2);
  });
});

describe('Vergleich (ohne Oberfläche)', () => {
  it('derselbe Platz; bei Ringen beide Ringe; freier Platz wird gemeldet', () => {
    const c = newCharacter('V', 'schattenjaeger');
    const r1 = it0('c_ring_3', { uid: 'r1', ilvl: 11 }), r2 = it0('c_ring_3', { uid: 'r2', ilvl: 14, affixes: [['crit', 3]] });
    c.equip.ring1 = r1;
    const cand = it0('c_ring_3', { uid: 'cand', ilvl: 15 });
    let cmp = compareItem(c, cand);
    expect(cmp.free).toBe('ring2');
    expect(cmp.rows.map(r => r.slot)).toEqual(['ring1']);
    c.equip.ring2 = r2;
    cmp = compareItem(c, cand);
    expect(cmp.free).toBeNull();
    expect(cmp.rows.map(r => r.item.uid)).toEqual(['r1', 'r2']);
    expect(cmp.rows[1].delta.find(([k]) => k === 'crit')![1]).toBe(-3);
    expect(cmp.rows[0].delta.find(([k]) => k === 'power')![1]).toBeGreaterThan(0);
    expect(compareTargets(c, it0('oh_offdagger_3')).map(r => r.slot)).toEqual(['offhand']);
    expect(compareTargets(c, c.equip.offhand!)).toEqual([]);           // nicht mit sich selbst
    expect(slotKind(ITEMS.c_charm_1)).toBe('amulet');
    const leg = makeLegendary(new Rng(1), 'schattenjaeger', 40);
    expect(compareItem(c, leg).rows[0].slot).toBe('weapon');
  });
  it('Überführung ist eine reine Funktion: migrateEquip auf einem Stand ohne alte Plätze tut nichts', () => {
    const c = newCharacter('M', 'krieger');
    const before = JSON.stringify(c.equip);
    expect(migrateEquip(c)).toEqual({ toBag: [], granted: [] });
    expect(JSON.stringify(c.equip)).toBe(before);
  });
});
