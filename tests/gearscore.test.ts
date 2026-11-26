/**
 * Ausrüstungswert (GS): Formel (shared/src/gearscore.ts), Vergleich, Überführung alter Stände, Empfehlungen und Warnungen
 * (shared/src/data/gsreq.ts) und dass der Server nur seinen eigenen Wert benutzt. Die Messpunkte selbst bewacht
 * tests/balance.test.ts. Beschreibung: docs/GEAR_SCORE.md.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { CFG, MYTHIC } from '../shared/src/config';
import { makeLegendary, makeSetPiece, upgradeCost } from '../shared/src/craft';
import { CLASS_IDS } from '../shared/src/data/classes';
import { DIFFICULTIES } from '../shared/src/data/hub';
import { EXPEDITIONS, EXPEDITION_LIST } from '../shared/src/data/expeditions';
import { DEPTH_CFG } from '../shared/src/data/expeditions_endgame';
import { GS_BRACKETS, GS_REF, TIER_NAME, expRequirement, gsAtLevel, gsAtStage, gsBracket, gsCheck, gsWarning, riftRequirement, trialRequirement } from '../shared/src/data/gsreq';
import { GEN_KINDS, ITEMS, generateGear, gearBase, type GenKind } from '../shared/src/data/items';
import { SET_PIECES } from '../shared/src/data/sets';
import { fullKit, migrateEquip } from '../shared/src/equip';
import { GS, charGS, gsCompare, itemGS, itemGSParts, slotGS, slotWeight } from '../shared/src/gearscore';
import { newCharacter } from '../shared/src/stats';
import type { CharData, ClassId, ItemInstance, ServerMsg } from '../shared/src/types';
import { SLOTS } from '../shared/src/types';
import { Rng } from '../shared/src/util/rng';
import { sanitizeChar } from '../server/src/db';
import { Sim, type Tester } from './helpers/sim';

const bare = (cls: ClassId, kind: GenKind, ilvl: number, rarity: number, up = 0, sub?: string): ItemInstance =>
  ({ uid: `t-${cls}-${kind}-${ilvl}-${rarity}-${up}-${sub ?? ''}`, base: gearBase(cls, kind, Math.max(1, Math.min(6, 1 + Math.floor((ilvl - 1) / 5))), sub), rarity, ilvl, up, affixes: [] });
const kit = (seed: number, ilvl: number, rarity: number, cls: ClassId) => fullKit(new Rng(seed), ilvl, rarity, cls);
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

describe('Ausrüstungswert – Formel', () => {
  it('leerer Charakter: 0; leere Plätze zählen 0; der Charakter-Wert ist genau die Summe der zehn Plätze', () => {
    const c = newCharacter('Leer', 'krieger');
    c.equip = {};
    expect(charGS(c)).toBe(0);
    c.equip = kit(1, 20, 2, 'krieger');
    const per = slotGS(c);
    expect(charGS(c)).toBe(SLOTS.reduce((a, s) => a + per[s], 0));
    const all = charGS(c), ring = itemGS(c.equip.ring2);
    delete c.equip.ring2;
    expect(charGS(c)).toBe(all - ring);
    expect(slotGS(c).ring2).toBe(0);
    // Verbrauchsgüter und Rohstoffe haben keinen Wert
    expect(itemGS({ uid: 'p', base: 'potion_hp1', rarity: 0, ilvl: 1, up: 0, affixes: [], qty: 3 })).toBe(0);
    expect(itemGS(undefined)).toBe(0);
  });
  it('Anfänger: die Startausrüstung ergibt genau die Formel (Gewicht × (Stufe + 2) × Grundfaktor)', () => {
    const c = newCharacter('Neu', 'magier');
    const want = (['weapon', 'offhand', 'armor', 'gloves'] as const).reduce((a, s) => a + Math.round(slotWeight(s === 'weapon' ? 'weapon' : s) * (1 + GS.levelOffset) * 1), 0);
    expect(charGS(c)).toBe(want);
    expect(charGS(c)).toBeGreaterThan(0);
    expect(charGS(c)).toBeLessThan(GS_REF.typisch[0]);
    expect(gsBracket(charGS(c)).id).toBe('grund');
  });
  it('Seltenheit, Stufe und Eigenschaften heben den Wert; seltene Beute liegt über gewöhnlicher derselben Stufe', () => {
    for (const cls of CLASS_IDS) for (const k of GEN_KINDS) {
      const common = itemGS(generateGear(new Rng(3), 20, 0, cls, k)), rare = mean([1, 2, 3, 4].map(s => itemGS(generateGear(new Rng(s), 20, 2, cls, k))));
      expect(rare, `${cls} ${k}`).toBeGreaterThan(common * 1.4);
      expect(itemGS(generateGear(new Rng(3), 30, 0, cls, k))).toBeGreaterThan(common);
    }
  });
  it('Verbessern: jeder Schritt +0 → +10 hebt den Wert, mindestens um den Zuwachs der Grundwerte; +3/+6/+9 und +10 etwas mehr', () => {
    for (const cls of CLASS_IDS) for (const k of GEN_KINDS) for (const r of [0, 2, 4, MYTHIC]) {
      const it = generateGear(new Rng(11), 35, r, cls, k);
      let prev = itemGSParts(it)!;
      for (let up = 1; up <= CFG.upgrade.max; up++) {
        it.up = up;
        const p = itemGSParts(it)!;
        expect(p.gs, `${cls} ${k} r${r} +${up}`).toBeGreaterThan(prev.gs);
        expect(p.base - prev.base).toBeCloseTo((CFG.loot.rarityStatMul[r]) * CFG.upgrade.statPerLevel, 6);
        if ([3, 6, 9, 10].includes(up)) expect(p.upgrade).toBeGreaterThan(prev.upgrade);
        prev = p;
      }
    }
  });
  it('Seltenheit ist nicht alles: niedrigere Seltenheit mit Verbesserung schlägt höhere ohne', () => {
    const avg = (r: number, up: number) => mean(CLASS_IDS.flatMap(cls => GEN_KINDS.flatMap(k => [1, 2, 3].map(s => { const it = generateGear(new Rng(s * 31), 30, r, cls, k); it.up = up; return itemGS(it); }))));
    expect(avg(0, 10)).toBeGreaterThan(avg(1, 0));    // gewöhnlich +10 > ungewöhnlich +0
    expect(avg(2, 10)).toBeGreaterThan(avg(4, 0));    // selten +10 > legendär +0
    expect(avg(3, 10)).toBeGreaterThan(avg(MYTHIC, 0)); // episch +10 > mythisch +0
    // und Stufe zählt: ein gutes Teil drei Stufen höher schlägt das gleiche Teil ein Seltenheit besser zehn Stufen tiefer
    expect(itemGS(bare('krieger', 'helm', 30, 2))).toBeGreaterThan(itemGS(bare('krieger', 'helm', 20, 3)));
  });
  it('keine Klasse wird bevorzugt: gleiche Ausrüstung ohne Eigenschaften ergibt je Platz denselben Wert – Schild wie Köcher, Robe wie Panzer', () => {
    for (const k of GEN_KINDS) for (const r of [0, 3, MYTHIC]) for (const up of [0, 7]) {
      const vals = CLASS_IDS.map(cls => itemGS(bare(cls, k, 33, r, up)));
      expect(new Set(vals).size, `${k} r${r} +${up}: ${vals}`).toBe(1);
    }
    // Magier: Foliant und Fokus gleich
    expect(itemGS(bare('magier', 'offhand', 25, 2, 4, 'tome'))).toBe(itemGS(bare('magier', 'offhand', 25, 2, 4, 'focus')));
  });
  it('keine Klasse wird bevorzugt: gewürfelte Ausrüstung gleicher Stufe und Seltenheit liegt bei allen Klassen innerhalb von 3 %', () => {
    for (const [ilvl, r] of [[10, 1], [25, 2], [40, 3], [60, 4], [70, MYTHIC]] as const) {
      const per = CLASS_IDS.map(cls => mean([...Array(12)].map((_, s) => charGS({ equip: kit(s + 1, ilvl, r, cls) }))));
      expect(Math.max(...per) / Math.min(...per), `Stufe ${ilvl}, Seltenheit ${r}: ${per.map(Math.round)}`).toBeLessThan(1.03);
    }
  });
  it('Element, Rune, Legendäre Waffe und Unikate zählen; die Rune zählt wie die Werte, die sie gibt', () => {
    const w = generateGear(new Rng(5), 40, 3, 'krieger', 'weapon');
    delete w.element; const g0 = itemGS(w);
    w.element = 'fire'; w.elv = 1; const g1 = itemGS(w);
    w.elv = 3; const g3 = itemGS(w);
    expect(g1).toBeGreaterThan(g0); expect(g3).toBeGreaterThan(g1);
    w.ench = 'macht'; const gr = itemGS(w);
    w.ench = 'echo_macht';
    expect(itemGS(w)).toBeGreaterThan(gr); expect(gr).toBeGreaterThan(g3);
    const leg = makeLegendary(new Rng(2), 'krieger', 40), plain = { ...leg, base: gearBase('krieger', 'weapon', 6) };
    expect(itemGS(leg) - itemGS(plain)).toBe(Math.round(slotWeight('weapon') * (40 + GS.levelOffset) * GS.affixUnit * GS.legend));
    const named = generateGear(new Rng(5), 20, 3, 'krieger', 'boots');
    const before = itemGS(named); named.name = 'Eisblumentritt';
    expect(itemGS(named)).toBeGreaterThan(before);
  });
  it('Setteile: das Anlegen eines Sets lässt den Wert nicht springen – jedes Teil zählt nur sich selbst, mit und ohne Set gleich', () => {
    const c = newCharacter('Set', 'paladin');
    c.equip = {};
    let last = 0;
    const rng = new Rng(7);
    for (const piece of SET_PIECES) {
      const it = makeSetPiece(rng, 'hohlekrone', piece, 'paladin', 3);
      const noSet = { ...it, set: undefined, name: undefined };
      expect(itemGS(it)).toBe(itemGS(noSet));
      const slot = piece === 'ring' ? 'ring1' : piece;
      c.equip[slot] = it;
      expect(charGS(c) - last).toBe(itemGS(it)); // auch beim 2., 4. und 6. Teil kein Aufschlag
      last = charGS(c);
    }
  });
  it('Vergleich: Wert des neuen Teils, Änderung des Charakter-Werts – bei Ringen für beide Ringplätze, freie Plätze zählen 0', () => {
    const c = newCharacter('Ring', 'waldlaeufer');
    c.equip = kit(4, 30, 2, 'waldlaeufer');
    const ring = generateGear(new Rng(99), 38, 4, 'waldlaeufer', 'accessory', 'ring');
    const rows = gsCompare(c, ring);
    expect(rows.map(r => r.slot)).toEqual(['ring1', 'ring2']);
    for (const r of rows) {
      expect(r.old).toBe(itemGS(c.equip[r.slot]));
      expect(r.gs).toBe(itemGS(ring));
      expect(r.delta).toBe(itemGS(ring) - itemGS(c.equip[r.slot]));
      const after = { equip: { ...c.equip, [r.slot]: ring } };
      expect(r.total).toBe(charGS(after));
    }
    delete c.equip.ring2;
    expect(gsCompare(c, ring)[1]).toMatchObject({ slot: 'ring2', old: 0, delta: itemGS(ring) });
    // schlechteres Teil: negative Änderung
    const worse = generateGear(new Rng(1), 5, 0, 'waldlaeufer', 'helm');
    expect(gsCompare(c, worse)[0].delta).toBeLessThan(0);
    // ein angelegtes Teil mit sich selbst: keine Änderung
    expect(gsCompare(c, c.equip.helm!)[0].delta).toBe(0);
  });
});

describe('Ausrüstungswert – alte Spielstände', () => {
  it('Überführung (acc1/acc2 → zehn Plätze mit Borins Beigaben) rechnet den Wert neu; nichts davon wird gespeichert', () => {
    const c = newCharacter('Alt', 'krieger');
    const rng = new Rng(3);
    c.equip = { weapon: generateGear(rng, 30, 3, 'krieger', 'weapon'), helm: generateGear(rng, 30, 2, 'krieger', 'helm'), armor: generateGear(rng, 30, 3, 'krieger', 'armor') };
    c.equip.acc1 = generateGear(rng, 30, 2, 'krieger', 'accessory', 'ring');
    c.equip.acc2 = generateGear(rng, 30, 2, 'krieger', 'accessory', 'amulet');
    delete c.eqv;
    const before = charGS(c); // alte Plätze zählen nicht
    expect(before).toBe(itemGS(c.equip.weapon) + itemGS(c.equip.helm) + itemGS(c.equip.armor));
    const raw = JSON.parse(JSON.stringify(c)) as CharData;
    const { granted } = migrateEquip(c);
    expect(granted.length).toBeGreaterThan(0);
    expect(charGS(c)).toBe(before + itemGS(c.equip.ring1) + itemGS(c.equip.amulet) + granted.reduce((a, it) => a + itemGS(it), 0));
    // derselbe Stand über den Ladeweg des Servers: gleicher Wert, und der Wert steht nirgends im Stand
    const loaded = sanitizeChar(raw)!;
    expect(charGS(loaded)).toBe(SLOTS.reduce((a, s) => a + itemGS(loaded.equip[s]), 0));
    expect(JSON.stringify(loaded)).not.toMatch(/"gs"/);
  });
  it('eine geänderte Formel gilt sofort für alte Teile: der Wert hängt nur an den Gegenständen', () => {
    const it = generateGear(new Rng(8), 25, 2, 'magier', 'armor');
    const copy = JSON.parse(JSON.stringify(it)) as ItemInstance;
    expect(itemGS(copy)).toBe(itemGS(it));
    const old = { ...it, affixes: it.affixes.map(([k, v]) => [k, v * 2] as [typeof k, number]) }; // Teile von vor 0.9 würfelten stärker
    expect(itemGS(old)).toBeGreaterThan(itemGS(it));
  });
});

describe('Ausrüstungswert – Empfehlungen und Warnungen', () => {
  it('jede Expedition hat für jeden Grad empfohlenen und Mindestwert aus den Messpunkten; schwerer ist teurer', () => {
    for (const x of EXPEDITION_LIST) {
      let prev = 0;
      for (const d of DIFFICULTIES) {
        const r = expRequirement(x.id, d);
        expect(r.minGS, `${x.id} ${d}`).toBeLessThanOrEqual(r.recGS);
        expect(r.minGS).toBeGreaterThan(0);
        expect(r.recGS, `${x.id} ${d}`).toBeGreaterThan(prev);
        expect(r.hard).toBe(false); // keine harte Grenze im Spiel – nur Warnungen
        expect(r.tierName).toBe(TIER_NAME[r.tier]);
        expect(r.reward).toMatch(/Gegenstandsstufe \d+/);
        prev = r.recGS;
      }
      if (!x.endgame) expect(expRequirement(x.id, 'normal')).toMatchObject({ recGS: gsAtLevel('typisch', x.rec), minGS: gsAtLevel('karg', x.rec), recLevel: x.rec, tier: 'abenteuer' });
      expect(expRequirement(x.id, 'mythisch').tierName).toBe('Raid-Endgame');
    }
    let prev = expRequirement('exp_wacht', 'mythisch').recGS;
    for (let t = 1; t <= DEPTH_CFG.max; t++) {
      const r = expRequirement('exp_wacht', 'mythisch', t);
      expect(r.recGS).toBeGreaterThan(prev); expect(r.tier).toBe('raid');
      prev = r.recGS;
    }
    expect(expRequirement('exp_wacht', 'mythisch', DEPTH_CFG.max).recGS).toBe(GS_REF.mythic10);
    expect(expRequirement('exp_wacht', 'mythisch', 10).recGS).toBe(GS_REF.rift[30]);
    for (let s = 2; s <= CFG.rift.maxStufe; s++) expect(riftRequirement(s).recGS).toBeGreaterThanOrEqual(riftRequirement(s - 1).recGS);
    expect(riftRequirement(20).tier).toBe('raid'); expect(riftRequirement(10).tier).toBe('endspiel');
    expect(trialRequirement()).toMatchObject({ tier: 'raid', recGS: gsAtStage(CFG.rift.trial.stufe) });
  });
  it('die Farbstufen steigen und liegen auf den Messpunkten', () => {
    for (let i = 1; i < GS_BRACKETS.length; i++) expect(GS_BRACKETS[i].min).toBeGreaterThan(GS_BRACKETS[i - 1].min);
    expect(gsBracket(GS_REF.story).id).toBe('meister');
    expect(gsBracket(GS_REF.mythic10).id).toBe('endspiel');
    expect(gsBracket(gsAtLevel('typisch', 20)).id).toBe('erprobt');
  });
  it('unter dem Mindestwert: Warnung (für Gruppen mit Namen), keine Sperre – außer ein Inhalt verlangt es ausdrücklich', () => {
    const r = expRequirement('exp_kristall', 'normal');
    const solo = gsCheck(r, [{ name: 'Ich', gs: r.minGS - 1 }]);
    expect(solo.blocked).toBe(false);
    expect(gsWarning(r, solo, true)).toMatch(/unter dem Mindestwert/);
    expect(gsWarning(r, gsCheck(r, [{ name: 'Ich', gs: r.minGS }]), true)).toBeNull();
    const grp = gsCheck(r, [{ name: 'Ada', gs: r.recGS + 5 }, { name: 'Bo', gs: r.minGS - 20 }, { name: 'Cy', gs: r.minGS + 1 }]);
    expect(grp.below.map(m => m.name)).toEqual(['Bo']);
    expect(grp.under.map(m => m.name)).toEqual(r.minGS + 1 < r.recGS ? ['Cy'] : []);
    expect(gsWarning(r, grp, false)).toMatch(/Bo \(/);
    // Inhalte können selbst festlegen – auch eine harte Grenze (für künftige Raids)
    const x = EXPEDITIONS.exp_kristall, keep = x.gsReq;
    try {
      x.gsReq = { normal: { minGS: 500, recGS: 800, hard: true, tier: 'raid' } };
      const h = expRequirement('exp_kristall', 'normal');
      expect(h).toMatchObject({ minGS: 500, recGS: 800, hard: true, tierName: 'Raid-Endgame' });
      expect(gsCheck(h, [{ name: 'Ich', gs: 499 }]).blocked).toBe(true);
      expect(gsWarning(h, gsCheck(h, [{ name: 'Ich', gs: 499 }]), true)).toMatch(/verlangten Mindestwert/);
    } finally { x.gsReq = keep; }
  });
});

// ------------------------------------------------------------------ Server
const sim = new Sim();
afterAll(() => sim.close());
beforeEach(() => sim.clear());
const last = <T extends ServerMsg['t']>(t: Tester, k: T) => t.msgs.filter(m => m.t === k).at(-1) as Extract<ServerMsg, { t: T }> | undefined;
function atPortal(t: Tester) {
  sim.travel(t, 'quellwarte');
  const o = [...t.p.zone.objs.values()].find(x => x.props?.kind === 'portal')!;
  t.p.x = o.x; t.p.y = o.y + 20;
}

describe('Ausrüstungswert – Server', () => {
  it('rechnet nach jeder Änderung (anlegen, ablegen, verbessern) aus seinen Gegenständen – ein Wert vom Client zählt nie', () => {
    const t = sim.join('Wertig', 'krieger', 30);
    expect(t.p.gs).toBe(charGS(t.p.char));
    const helm = generateGear(new Rng(2), 28, 3, 'krieger', 'helm');
    t.p.addItem(helm);
    t.send({ t: 'equip', uid: helm.uid, gs: 99999 } as any);
    expect(t.p.char.equip.helm?.uid).toBe(helm.uid);
    expect(t.p.gs).toBe(charGS(t.p.char));
    expect(t.p.gs).toBeLessThan(99999);
    const g1 = t.p.gs;
    sim.gotoNpc(t, 'borin');
    t.p.char.gold = 1e7;
    for (const [b] of upgradeCost(helm)!.mats) t.give(b, 50);
    t.send({ t: 'upgrade', uid: helm.uid, npc: 'borin', gs: 1 } as any);
    expect(helm.up).toBe(1);
    expect(t.p.gs).toBe(charGS(t.p.char));
    expect(t.p.gs).toBeGreaterThan(g1);
    const g2 = t.p.gs;
    t.send({ t: 'unequip', slot: 'helm' });
    expect(t.p.gs).toBe(charGS(t.p.char));
    expect(t.p.gs).toBe(g2 - itemGS(helm));
  });
  it('Gruppe, Ansehen, Online-Liste und Bereitschaft tragen den Wert des Servers', () => {
    const a = sim.join('Erster', 'magier', 20), b = sim.join('Zweite', 'paladin', 20);
    a.p.char.equip = kit(1, 20, 2, 'magier'); a.p.recalc();
    b.p.char.equip = kit(2, 18, 1, 'paladin'); b.p.recalc();
    a.send({ t: 'party', a: 'invite', id: b.p.id }); b.send({ t: 'party', a: 'accept' });
    sim.step(0.2);
    const mem = last(a, 'party')!.members;
    expect(mem.find(m => m.name === 'Zweite')!.gs).toBe(charGS(b.p.char));
    expect(mem.find(m => m.name === 'Erster')!.gs).toBe(charGS(a.p.char));
    b.send({ t: 'inspect', id: a.p.id });
    expect(last(b, 'inspect')!.i.gs).toBe(charGS(a.p.char));
    sim.step(4.2);
    expect(last(a, 'online')!.players.find(p => p.name === 'Zweite')!.gs).toBe(charGS(b.p.char));
    // Bereitschaft am Portal: jedes Mitglied mit seinem Wert, der Server warnt beim Start (Startausrüstung liegt unter dem Mindestwert)
    for (const t of [a, b]) { t.p.char.flags['z:gruenwald'] = 1; t.p.char.quests.m_wurzel = { s: 'active', p: [0] }; atPortal(t); }
    b.p.char.equip = {}; b.p.recalc();
    a.send({ t: 'exp', a: 'select', id: 'exp_gruenwald', diff: 'normal' });
    const lob = last(b, 'exp')!.lobby!;
    expect(lob.members.find(m => m.name === 'Zweite')!.gs).toBe(0);
    expect(lob.members.find(m => m.name === 'Erster')!.gs).toBe(charGS(a.p.char));
    b.send({ t: 'exp', a: 'ready' });
    a.send({ t: 'exp', a: 'start' });
    expect(a.p.zone.exp).toBeTruthy(); // keine Sperre …
    expect(a.toasts.some(s => /Mindestwert.*Zweite \(0\)/.test(s))).toBe(true); // … aber eine Warnung mit Namen
  });
});
