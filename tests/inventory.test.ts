/** Verkaufsfeld im Inventar (0.12.1): mehrere Gegenstände auf einmal verkaufen – überall, auch in einer Expedition. */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { Sim } from './helpers/sim';
import { generateGear, makeStack, sellPrice } from '../shared/src/data/items';
import { Rng } from '../shared/src/util/rng';
import { EXPEDITIONS } from '../shared/src/data/expeditions';
import { Expedition } from '../server/src/expedition';

const sim = new Sim();
afterAll(() => sim.close());
beforeEach(() => sim.clear());

describe('Verkaufsfeld', () => {
  it('verkauft alles in einem Zug, auch in einer Expedition; Questgegenstände, fremde und doppelte Kennungen zählen nicht', () => {
    const t = sim.join('Haendlerin', 'krieger', 8);
    const rng = new Rng(11);
    const a = generateGear(rng, 8, 1, 'krieger'), b = generateGear(rng, 8, 2, 'krieger'), herbs = makeStack('mat_herb', 7), seal = makeStack('seal_earth');
    t.p.char.inv = [a, b, herbs, seal];
    // in eine Expedition (Entwicklerbefehl startet sie hier) – fernab jedes Händlers
    t.p.char.flags['z:gruenwald'] = 1;
    Expedition.dev(sim.game, t.p, 'exp', ['exp_gruenwald']);
    expect(t.p.zone.exp?.exp).toBe(EXPEDITIONS.exp_gruenwald.id);
    const gold0 = t.p.char.gold;
    const want = sellPrice(a) + sellPrice(b) + sellPrice(herbs) * 7;
    t.send({ t: 'sellMany', uids: [a.uid, b.uid, herbs.uid, seal.uid, a.uid, 'gibtsnicht', 42 as any] });
    expect(t.p.char.gold - gold0).toBe(want);
    expect(t.p.char.inv.map(i => i.uid)).toEqual([seal.uid]);
    expect(t.toasts.some(s => /3 Gegenstände für/.test(s))).toBe(true);
    // gespeichert
    const saved = sim.db.loadChar(t.s.account!.id, sim.db.listChars(t.s.account!.id)[0].id)!;
    expect(saved.gold).toBe(t.p.char.gold);
    expect(saved.inv.map(i => i.uid)).toEqual([seal.uid]);
    // ein zweites Mal: nichts mehr da, nichts passiert
    t.send({ t: 'sellMany', uids: [a.uid] });
    expect(t.p.char.gold - gold0).toBe(want);
    t.send({ t: 'sellMany', uids: 'kaputt' as any });
    expect(t.p.char.inv.length).toBe(1);
  });
});
