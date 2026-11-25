/** Elemente (0.4): Schwächen/Resistenzen, Zustände je Element, Reaktionen, Zwei-Spieler-Bonus, Legendäre Wirkungen. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Mob, Zone } from '../server/src/zone';
import { CFG, ELEMENTS, elementMultiplier } from '../shared/src/config';
import { makeLegendary, makeSetPiece } from '../shared/src/craft';
import { CLASSES, CLASS_IDS } from '../shared/src/data/classes';
import { BOSSES, ENEMIES } from '../shared/src/data/enemies';
import { generateGear } from '../shared/src/data/items';
import { SET_PIECES } from '../shared/src/data/sets';
import { skillsOf } from '../shared/src/data/skills';
import { ELEM_STATUS, REACTIONS, affinities, affinityMul, reactionOf, resistFactor } from '../shared/src/elements';
import { computeStats, newCharacter } from '../shared/src/stats';
import type { ClassId, Element, GameEvent } from '../shared/src/types';
import { Rng } from '../shared/src/util/rng';
import { Sim, texts, type Tester } from './helpers/sim';

let sim: Sim;
beforeAll(() => { sim = new Sim(); });
afterAll(() => sim.close());

let seq = 0;
/** Frischer Spieler auf leerem Kampfplatz im Grünwald */
function fighter(cls: ClassId, level = 20): { t: Tester; z: Zone; x: number; y: number } {
  sim.clear();
  const t = sim.join('Probe' + String.fromCharCode(65 + (seq % 26)) + String.fromCharCode(65 + Math.floor(seq / 26)), cls, level);
  seq++;
  const a = sim.arena(t);
  return { t, ...a };
}
/** Ein Treffer mit festem Zufall; liefert die Schadensereignisse dieses Treffers. */
function hit(z: Zone, m: Mob, t: Tester | null, raw: number, el: Element, o: Parameters<Zone['hitMob']>[4] = {}, seed = 7): Extract<GameEvent, { k: 'dmg' }>[] {
  sim.seed(z, seed);
  z.events = [];
  z.hitMob(m, t ? t.p : null, raw, el, o);
  return z.events.filter(e => e.k === 'dmg') as Extract<GameEvent, { k: 'dmg' }>[];
}
const wait = (sec: number) => { sim.game.now += sec; };
const legend = (t: Tester) => { t.p.char.equip.weapon = makeLegendary(new Rng(1), t.p.char.cls, t.p.char.level); t.p.recalc(); };

describe('Schwächen und Resistenzen', () => {
  it('Kreislauf × ausdrückliche Schwäche/Resistenz', () => {
    const W = CFG.elements.weakMul, R = CFG.elements.resistMul;
    expect(affinityMul('fire', { element: 'earth', weak: ['fire'] })).toBeCloseTo(W);
    expect(affinityMul('wind', { element: 'earth', weak: ['fire'] })).toBeCloseTo(CFG.combat.elemStrong);
    expect(affinityMul('phys', { element: 'water', resist: ['phys'] })).toBeCloseTo(R);
    expect(affinityMul('earth', { element: 'water', weak: ['earth'] })).toBeCloseTo(CFG.combat.elemStrong * W);
    expect(affinityMul('water', { element: 'water', resist: ['water'] })).toBeCloseTo(CFG.combat.elemSame * R);
    expect(affinityMul('phys', { element: 'fire' })).toBe(1);
    const a = affinities(ENEMIES.tropfschleim);                  // Wasser, schwach gegen Wind, resistent gegen Physisch
    expect(a.weak.sort()).toEqual(['earth', 'wind']);
    expect(a.resist.sort()).toEqual(['fire', 'phys', 'water']);
    expect(resistFactor(20)).toBeCloseTo(0.8);
    expect(resistFactor(999)).toBeCloseTo(1 - CFG.elements.resCap / 100);
    expect(resistFactor(-5)).toBe(1);
  });
  it('Daten: alle Bosse und die meisten Gegner haben ausdrückliche Angaben, nichts widerspricht dem Kreislauf', () => {
    const all = [...Object.values(ENEMIES), ...Object.values(BOSSES)];
    for (const d of all) {
      for (const w of d.weak ?? []) expect(elementMultiplier(w, d.element), `${d.id} schwach ${w}`).toBeGreaterThanOrEqual(1);
      for (const r of d.resist ?? []) expect(elementMultiplier(r, d.element), `${d.id} resistent ${r}`).toBeLessThanOrEqual(1);
      if (d.element !== 'phys') expect(affinities(d).weak.length, d.id).toBeGreaterThan(0);
    }
    // die sechs Bosse des ersten Akts und mindestens zwanzig Gegner tragen ausdrückliche Angaben
    for (const id of ['dornenmutter', 'kristallkoloss', 'ignarok', 'ysolde', 'archivar', 'hohlkoenig']) expect(BOSSES[id].weak?.length, id).toBeGreaterThan(0);
    expect(Object.values(ENEMIES).filter(e => e.weak?.length).length).toBeGreaterThanOrEqual(20);
    expect(Object.values(ENEMIES).filter(e => e.resist?.includes('phys')).length).toBeGreaterThanOrEqual(3);
  });
  it('im Kampf: Schwäche, Resistenz und wechselndes Bosselement', () => {
    const { t, z, x, y } = fighter('krieger');
    const moos = sim.dummy(z, 'moosling', 5, x + 20, y);          // Erde, schwach gegen Feuer
    const phys = hit(z, moos, t, 1000, 'phys')[0].a;
    expect(hit(z, moos, t, 1000, 'fire')[0].a / phys).toBeCloseTo(CFG.elements.weakMul, 1);
    expect(hit(z, moos, t, 1000, 'wind')[0].a / phys).toBeCloseTo(CFG.combat.elemStrong, 1);
    expect(hit(z, moos, t, 1000, 'earth')[0].a / phys).toBeCloseTo(CFG.combat.elemSame, 1);
    // Der Hohle König wechselt in Phase 2 sein Element – seine ausdrückliche Feuerschwäche bleibt
    sim.travel(t, 'thron');
    const boss = t.p.zone.boss!.mob;
    boss.invuln = false;
    const bz = t.p.zone;
    const p0 = hit(bz, boss, t, 1000, 'phys')[0].a;
    expect(hit(bz, boss, t, 1000, 'fire')[0].a / p0).toBeCloseTo(CFG.elements.weakMul, 1);
    expect(hit(bz, boss, t, 1000, 'light')[0].a / p0).toBeCloseTo(CFG.combat.elemStrong, 1);
    boss.element = 'water';
    expect(hit(bz, boss, t, 1000, 'fire')[0].a / p0).toBeCloseTo(CFG.combat.elemWeak * CFG.elements.weakMul, 1);
    expect(hit(bz, boss, t, 1000, 'earth')[0].a / p0).toBeCloseTo(CFG.combat.elemStrong, 1);
  });
  it('Spieler-Resistenz mindert Elementarschaden und ist gedeckelt', () => {
    const { t, z } = fighter('paladin');
    const take = (el: Element) => { t.p.hp = t.p.stats.maxHp; t.p.iframesUntil = 0; sim.seed(z, 3); return z.hitPlayer(t.p, 200, el, 20, 'Test'); };
    const fire0 = take('fire'), water0 = take('water');
    expect(fire0).toBe(water0);
    const helm = generateGear(new Rng(5), 20, 0, 'paladin', 'helm'), armor = generateGear(new Rng(6), 20, 0, 'paladin', 'armor');
    helm.ench = 'schutz_fire'; armor.ench = 'schutz_fire';
    t.p.char.equip.helm = helm; t.p.char.equip.armor = armor; t.p.recalc();
    expect(t.p.stats.res.fire).toBe(20);
    const plain = (() => { const c = JSON.parse(JSON.stringify(t.p.char)); delete c.equip.helm.ench; delete c.equip.armor.ench; return computeStats(c); })();
    expect(plain.def).toBe(t.p.stats.def);                       // die Rune ändert nur die Resistenz
    const base = (() => { const d = t.p.stats.res.fire; t.p.stats.res.fire = 0; const v = take('fire'); t.p.stats.res.fire = d; return v; })();
    expect(take('fire') / base).toBeCloseTo(0.8, 1);
    expect(take('water')).toBe(base);                            // andere Elemente unberührt
    // Elixier dazu, dann weit über die Grenze
    t.give('elx_res_fire', 1);
    t.send({ t: 'use', uid: t.p.char.inv.find(i => i.base === 'elx_res_fire')!.uid });
    expect(t.p.stats.res.fire).toBe(40);
    t.p.addBuff({ id: 'x', name: 'x', glyph: 'x', until: sim.game.now + 99, mods: { resAll: 80 }, shield: 0 });
    expect(t.p.stats.res.fire).toBe(CFG.elements.resCap);
    expect(t.p.stats.res.dark).toBe(CFG.elements.resCap);
    expect(t.p.stats.res.phys).toBe(0);
    expect(take('fire') / base).toBeCloseTo(1 - CFG.elements.resCap / 100, 1);
  });
});

describe('Zustände', () => {
  it('jedes der sechs Elemente hat einen eigenen Zustand, den Elementartreffer auslösen', () => {
    expect(new Set(ELEMENTS.map(e => ELEM_STATUS[e]!.id)).size).toBe(6);
    for (const e of ELEMENTS) expect(CFG.combat.elemProc[e]).toBeGreaterThan(0);
    const { t, z, x, y } = fighter('magier');
    for (const el of ELEMENTS) {
      const m = sim.dummy(z, 'waldwolf', 5, x + 20, y);
      sim.seed(z, 11);
      for (let i = 0; i < 80 && !m.has(ELEM_STATUS[el]!.id, sim.game.now); i++) z.hitMob(m, t.p, 10, el);
      expect(m.has(ELEM_STATUS[el]!.id, sim.game.now), el).toBe(true);
      expect(m.statuses.get(ELEM_STATUS[el]!.id)!.el).toBe(el);  // Prägung für Reaktionen
      z.mobs.delete(m.id);
    }
    // physische Treffer lösen nichts aus
    const m = sim.dummy(z, 'waldwolf', 5, x + 20, y);
    for (let i = 0; i < 200; i++) z.hitMob(m, t.p, 10, 'phys');
    expect(m.statuses.size).toBe(0);
  });
  it('Entblößt (Wind): Treffer gegen das Ziel sind öfter kritisch', () => {
    const { t, z, x, y } = fighter('krieger');
    const m = sim.dummy(z, 'moosling', 5, x + 20, y);
    const crits = () => { sim.seed(z, 21); let n = 0; z.events = []; for (let i = 0; i < 1000; i++) z.hitMob(m, t.p, 10, 'phys'); for (const e of z.events) if (e.k === 'dmg' && e.c) n++; return n / 1000; };
    const base = crits();
    z.applyStatusMob(m, { id: 'expose', dur: 60 }, 0);
    const exposed = crits();
    expect(base).toBeCloseTo(t.p.stats.crit, 1);
    expect(exposed - base).toBeGreaterThan(CFG.combat.exposeCrit * 0.7);
    expect(exposed - base).toBeLessThan(CFG.combat.exposeCrit * 1.3);
  });
  it('Geschwächt (Licht) senkt den Schaden von Gegnern, bei Bossen halb so stark', () => {
    const { t, z, x, y } = fighter('paladin');
    t.p.god = true;
    const m = sim.dummy(z, 'waldwolf', 20, x + 14, y);
    const d0 = m.dmg;
    z.applyStatusMob(m, { id: 'weak', dur: 2 }, 0);
    sim.step(0.1);
    expect(m.dmg).toBeCloseTo(d0 * CFG.combat.weakDmgDealt, 5);
    sim.step(2.1);
    expect(m.dmg).toBeCloseTo(d0, 5);
    sim.travel(t, 'wurzelgruft');
    const boss = t.p.zone.boss!.mob, b0 = boss.dmg;
    t.p.zone.applyStatusMob(boss, { id: 'weak', dur: 2 }, 0);
    sim.step(0.1);
    expect(boss.dmg).toBeCloseTo(b0 * (1 + CFG.combat.weakDmgDealt) / 2, 5);
  });
  it('Eingefroren hält Gegner an, Verwurzelt hält sie fest; Bosse und frisch Befreite sind dagegen gefeit', () => {
    const { t, z, x, y } = fighter('krieger');
    const wolf = z.spawnMob('waldwolf', 20, x + 14, y);
    const hurt = (sec: number) => { t.p.hp = t.p.stats.maxHp; t.p.x = x; t.p.y = y; wolf.x = x + 14; wolf.y = y; sim.step(sec); return t.p.stats.maxHp - t.p.hp; };
    expect(hurt(3)).toBeGreaterThan(0);                          // er beißt
    z.applyStatusMob(wolf, { id: 'freeze', dur: 2 }, 0);
    expect(wolf.has('freeze', sim.game.now)).toBe(true);
    expect(hurt(1.9)).toBeLessThanOrEqual(0);                    // eingefroren: kein Angriff
    expect(hurt(3)).toBeGreaterThan(0);
    // nach dem Auftauen kurz immun
    z.applyStatusMob(wolf, { id: 'freeze', dur: 2 }, 0);
    z.applyStatusMob(wolf, { id: 'root', dur: 2 }, 0);
    expect(wolf.has('freeze', sim.game.now)).toBe(false);
    expect(wolf.has('root', sim.game.now)).toBe(false);
    wait(CFG.elements.freezeImmuneSec + 0.1);
    // verwurzelt: bleibt stehen, obwohl das Ziel wegläuft
    z.applyStatusMob(wolf, { id: 'root', dur: 2 }, 0);
    expect(wolf.has('root', sim.game.now)).toBe(true);
    wolf.x = x; wolf.y = y; wolf.kx = wolf.ky = 0;
    const dirs = [[60, 0], [-60, 0], [0, 60], [0, -60]].filter(([dx, dy]) => [0.25, 0.5, 0.75, 1].every(k => !z.solidWalk(Math.floor((x + dx * k) / 16), Math.floor((y + dy * k) / 16))));
    expect(dirs.length).toBeGreaterThan(0);
    t.p.god = true; t.p.x = x + dirs[0][0]; t.p.y = y + dirs[0][1];
    sim.step(1.5);
    expect(Math.hypot(wolf.x - x, wolf.y - y)).toBeLessThan(0.5);
    sim.step(1.5);                                                // Wurzeln weg: er läuft wieder
    expect(Math.hypot(wolf.x - x, wolf.y - y)).toBeGreaterThan(5);
    // Erwachte: kürzer; Bosse: gar nicht (auch keine Betäubung)
    const elite = sim.dummy(z, 'moosling', 5, x, y + 40); elite.elite = true;
    z.applyStatusMob(elite, { id: 'freeze', dur: 2 }, 0);
    expect(elite.statuses.get('freeze')!.until - sim.game.now).toBeCloseTo(2 * CFG.elements.eliteCcMul, 5);
    sim.travel(t, 'wurzelgruft');
    const boss = t.p.zone.boss!.mob;
    for (const id of ['freeze', 'root', 'stun'] as const) { t.p.zone.applyStatusMob(boss, { id, dur: 5 }, 0); expect(boss.statuses.has(id), id).toBe(false); }
    t.p.zone.applyStatusMob(boss, { id: 'slow', dur: 4 }, 0);
    expect(boss.statuses.get('slow')!.until - sim.game.now).toBeCloseTo(2, 5);
    // Spieler: Verwurzelt = kein Tempo, Eingefroren = handlungsunfähig
    t.p.statuses.set('root', { until: sim.game.now + 1, dps: 0 });
    expect(t.p.speed(sim.game.now)).toBe(0);
    t.p.statuses.clear(); t.p.statuses.set('freeze', { until: sim.game.now + 1, dps: 0 });
    expect(t.p.stunned(sim.game.now)).toBe(true);
  });
  it('Elementstufe der Waffe: mehr Schaden mit dem Waffenelement', () => {
    const { t, z, x, y } = fighter('krieger');
    const m = sim.dummy(z, 'waldwolf', 5, x + 20, y);
    const w = t.p.char.equip.weapon!;
    const dmg = (lvl: number, el: Element) => { w.element = 'water'; w.elv = lvl; t.p.recalc(); return hit(z, m, t, 1000, el)[0].a; };
    const l1 = dmg(1, 'water');
    expect(dmg(2, 'water') / l1).toBeCloseTo(1 + CFG.craft.infuseDmg[2], 2);
    expect(dmg(3, 'water') / l1).toBeCloseTo(1 + CFG.craft.infuseDmg[3], 2);
    expect(dmg(3, 'light')).toBe(dmg(1, 'light'));               // nur das Waffenelement profitiert
    delete w.elv;
    t.p.recalc();
    expect(t.p.stats.elemLvl).toBe(1);
  });
});

describe('Reaktionen', () => {
  it('es gibt acht Reaktionen mit eindeutigen Paaren; jede Klasse hat mindestens zwei erreichbare Stile', () => {
    expect(REACTIONS.length).toBe(8);
    expect(new Set(REACTIONS.map(r => [...r.pair].sort().join('+'))).size).toBe(8);
    for (const r of REACTIONS) { expect(reactionOf(r.pair[0], r.pair[1])).toBe(r); expect(reactionOf(r.pair[1], r.pair[0])).toBe(r); expect(r.pair[0]).not.toBe(r.pair[1]); }
    expect(reactionOf('fire', 'fire')).toBeUndefined();
    expect(reactionOf('phys', 'fire')).toBeUndefined();
    for (const cls of CLASS_IDS) {
      // Elemente der schadenden Fähigkeiten; die Waffe darf ein beliebiges Element tragen (Einschmieden)
      const own = new Set<Element>();
      for (const s of skillsOf(cls)) if (s.element !== 'phys' && s.effects?.some(e => 'mult' in e && e.mult > 0)) own.add(s.element);
      const native = REACTIONS.filter(r => own.has(r.pair[0]) && own.has(r.pair[1]));
      const styles = REACTIONS.filter(r => own.has(r.pair[0]) || own.has(r.pair[1]));
      expect(styles.length, cls).toBeGreaterThanOrEqual(2);
      if (cls !== 'paladin') expect(native.length, cls + ' ohne Einschmieden').toBeGreaterThanOrEqual(1);
      // physische Fähigkeiten und Standardangriffe übernehmen das Waffenelement
      expect(skillsOf(cls).some(s => s.element === 'phys' && s.effects) || CLASSES[cls].attack.element === 'phys').toBe(true);
    }
  });
  for (const r of REACTIONS) it(`${r.name}: ${r.pair[0]} + ${r.pair[1]} (beide Reihenfolgen)`, () => {
    for (const [first, second] of [r.pair, [r.pair[1], r.pair[0]]] as [Element, Element][]) {
      const { t, z, x, y } = fighter('magier');
      const m = sim.dummy(z, 'waldwolf', 5, x + 20, y), near = sim.dummy(z, 'waldwolf', 5, x + 44, y), far = sim.dummy(z, 'waldwolf', 5, x + 220, y);
      const ally = sim.join('Helfer' + String.fromCharCode(65 + seq++ % 26) + first, 'krieger', 20);
      ally.p.x = x + 30; ally.p.y = y; ally.p.hp = 1;
      // ohne Zustand des ersten Elements passiert nichts
      hit(z, m, t, 100, second, { status: undefined });
      expect(texts(z).join()).not.toContain(r.name);
      for (const s of m.statuses.values()) s.until = 0;
      z.applyStatusMob(m, { id: ELEM_STATUS[first]!.id, dur: 6 }, 10, first, t.p);
      const ev = hit(z, m, t, 100, second);
      expect(texts(z)).toContain(r.name + '!');
      expect(z.events.some(e => e.k === 'sfx' && e.n === r.sfx)).toBe(true);
      expect(z.events.some(e => e.k === 'fx' && e.n === 'explosion')).toBe(true);
      // Reaktionsschaden als zweiter Treffer auf das Ziel, im Element der Reaktion
      const onTarget = ev.filter(e => e.id === m.id);
      expect(onTarget.length).toBe(2);
      expect(onTarget[1].el).toBe(r.el === 'trigger' ? second : r.el);
      expect(onTarget[1].c).toBeUndefined();
      // Flächenwirkung trifft den Nachbarn, nie den weit Entfernten
      expect(ev.some(e => e.id === near.id)).toBe(!!r.radius);
      expect(ev.some(e => e.id === far.id)).toBe(false);
      const now = sim.game.now;
      for (const who of r.radius ? [m, near] : [m]) {
        if (r.status) expect(who.has(r.status.id, now), r.status.id).toBe(true);
        if (r.dot) expect(who.statuses.get(r.dot.id)!.dps).toBeCloseTo((t.p.stats.power * r.dot.total) / r.dot.dur, 3);
      }
      if (r.status) expect(far.has(r.status.id, now)).toBe(false);
      if (r.heal) expect(ally.p.hp).toBeGreaterThan(1 + ally.p.stats.maxHp * r.heal.hpPct * 0.9); else expect(ally.p.hp).toBe(1);
      // die Prägung ist verbraucht, das Ziel reagiert erst nach der Sperrzeit wieder
      expect([...m.statuses.values()].some(s => s.el === first)).toBe(false);
      z.applyStatusMob(m, { id: ELEM_STATUS[first]!.id, dur: 6 }, 10, first, t.p);
      hit(z, m, t, 100, second);
      expect(texts(z)).not.toContain(r.name + '!');
      wait(CFG.elements.reactCd + 0.01);
      z.applyStatusMob(m, { id: ELEM_STATUS[first]!.id, dur: 6 }, 10, first, t.p);
      hit(z, m, t, 100, second);
      expect(texts(z)).toContain(r.name + '!');
    }
  });
  it('keine Reaktion durch Schaden über Zeit, Folgetreffer, gleiches Element oder Paare ohne Eintrag', () => {
    const { t, z, x, y } = fighter('magier');
    const m = sim.dummy(z, 'waldwolf', 5, x + 20, y);
    const tag = (el: Element) => { for (const s of m.statuses.values()) s.until = 0; m.reactAt = 0; z.applyStatusMob(m, { id: 'slow', dur: 6 }, 10, el, t.p); };
    tag('fire'); hit(z, m, t, 100, 'wind', { dot: true }); expect(texts(z).length).toBe(0);
    tag('fire'); hit(z, m, t, 100, 'wind', { extra: true }); expect(texts(z).length).toBe(0);
    tag('fire'); hit(z, m, t, 100, 'fire'); expect(texts(z).length).toBe(0);
    tag('fire'); hit(z, m, t, 100, 'light'); expect(texts(z).length).toBe(0);
    tag('fire'); hit(z, m, t, 100, 'phys'); expect(texts(z).length).toBe(0);
    tag('fire'); hit(z, m, null, 100, 'wind'); expect(texts(z).length).toBe(0);      // ohne Urheber (Fallen o. Ä.)
    tag('fire'); hit(z, m, t, 100, 'wind'); expect(texts(z)).toEqual(['Feuersturm!']);
    // Zustände physischer Treffer tragen keine Prägung
    for (const s of m.statuses.values()) s.until = 0; m.reactAt = 0;
    z.applyStatusMob(m, { id: 'stun', dur: 3 }, 10, 'phys', t.p);
    hit(z, m, t, 100, 'wind'); expect(texts(z).length).toBe(0);
    // Reaktionen lösen keine Kettenreaktion aus: höchstens ein Text je Treffer, auch mit vielen Zielen
    const others = [1, 2, 3].map(i => sim.dummy(z, 'waldwolf', 5, x + 20 + i * 8, y));
    for (const o of [m, ...others]) { for (const s of o.statuses.values()) s.until = 0; o.reactAt = 0; z.applyStatusMob(o, { id: 'burn', dur: 6 }, 10, 'fire', t.p); }
    hit(z, m, t, 100, 'wind');
    expect(texts(z)).toEqual(['Feuersturm!']);
  });
  it('Zwei-Spieler-Synergie: deutlich stärker, beide erhalten „Einklang“', () => {
    const { t: a, z, x, y } = fighter('magier');
    const b = sim.join('Partnerin', 'paladin', 20);
    b.p.x = x - 20; b.p.y = y;
    const react = (by: Tester, trigger: Tester) => {
      const m = sim.dummy(z, 'waldwolf', 5, x + 20, y);
      z.applyStatusMob(m, { id: 'weak', dur: 6 }, 10, 'light', by.p);
      const ev = hit(z, m, trigger, 100, 'dark').filter(e => e.id === m.id);
      z.mobs.delete(m.id);
      return { dmg: ev[1].a, text: texts(z) };
    };
    const solo = react(a, a);
    expect(solo.text).toEqual(['Zwielicht!']);
    expect(a.p.buffs.some(x => x.id === 'einklang')).toBe(false);
    const power0 = a.p.stats.power, bp0 = b.p.stats.power;
    const duo = react(b, a);
    expect(duo.text).toEqual(['Zwielicht ×2!']);
    expect(duo.dmg / solo.dmg).toBeCloseTo(CFG.elements.duoMul, 1);
    for (const who of [a, b]) expect(who.p.buffs.find(x => x.id === 'einklang')!.until - sim.game.now).toBeCloseTo(CFG.elements.duoBuff.dur, 3);
    expect(a.p.stats.power).toBeCloseTo(power0 * (1 + CFG.elements.duoBuff.powerPct / 100), 0);
    expect(b.p.stats.power).toBeCloseTo(bp0 * (1 + CFG.elements.duoBuff.powerPct / 100), 0);
    // Zustände halten bei der Synergie länger
    const m = sim.dummy(z, 'waldwolf', 5, x + 20, y);
    z.applyStatusMob(m, { id: 'slow', dur: 6 }, 10, 'water', b.p);
    hit(z, m, a, 100, 'wind');
    expect(m.statuses.get('freeze')!.until - sim.game.now).toBeCloseTo(1.6 * 1.25, 3);
    // „Einklang“ läuft ab; ein toter oder abgereister Partner zählt nicht
    a.p.god = b.p.god = true;
    sim.step(CFG.elements.duoBuff.dur + 0.2);
    expect(a.p.buffs.some(x => x.id === 'einklang')).toBe(false);
    b.p.dead = true;
    expect(react(b, a).text).toEqual(['Zwielicht!']);
    b.p.dead = false;
    sim.travel(b, 'kristall');
    expect(react(b, a).text).toEqual(['Zwielicht!']);
  });
  it('Bosse reagieren – mit Grenzen: kein Einfrieren, längere Sperrzeit', () => {
    const { t } = fighter('magier', 12);
    sim.travel(t, 'wurzelgruft');
    const z = t.p.zone, boss = z.boss!.mob;
    boss.invuln = false;
    z.applyStatusMob(boss, { id: 'slow', dur: 6 }, 10, 'water', t.p);
    hit(z, boss, t, 100, 'wind');
    expect(texts(z)).toEqual(['Frost!']);
    expect(boss.has('freeze', sim.game.now)).toBe(false);        // stattdessen verlangsamt
    expect(boss.has('slow', sim.game.now)).toBe(true);
    expect(boss.reactAt - sim.game.now).toBeCloseTo(CFG.elements.reactCdBoss, 5);
    z.applyStatusMob(boss, { id: 'slow', dur: 6 }, 10, 'water', t.p);
    hit(z, boss, t, 100, 'earth');
    expect(texts(z).length).toBe(0);                             // noch gesperrt
    wait(CFG.elements.reactCdBoss + 0.01);
    z.applyStatusMob(boss, { id: 'slow', dur: 6 }, 10, 'water', t.p);
    hit(z, boss, t, 100, 'earth');
    expect(texts(z)).toEqual(['Schlamm!']);
    expect(boss.has('root', sim.game.now)).toBe(false);
  });
  it('im echten Kampfablauf: Feuerball, dann Frostfächer ergibt Dampf', () => {
    const { t, z, x, y } = fighter('magier', 10);
    t.p.char.skills = { ma_feuerball: 1, ma_frost: 1 };
    const m = sim.dummy(z, 'waldwolf', 10, x + 50, y);
    t.p.god = true;
    const seen: string[] = [];
    const ev = z.ev.bind(z);
    z.ev = e => { if (e.k === 'txt') seen.push(e.s); ev(e); };
    t.send({ t: 'skill', id: 'ma_feuerball', ang: 0, tx: m.x, ty: m.y });
    sim.step(1);
    expect(m.statuses.get('burn')?.el).toBe('fire');
    t.send({ t: 'skill', id: 'ma_frost', ang: 0, tx: m.x, ty: m.y });
    sim.step(1);
    expect(seen).toContain('Dampf!');
    expect(m.has('weak', sim.game.now)).toBe(true);
  });
});

describe('Legendäre Waffen', () => {
  it('Krieger – Sechsklang: jeder vierte Treffer entfesselt eine Schockwelle', () => {
    const { t, z, x, y } = fighter('krieger', 34);
    legend(t);
    expect(t.p.stats.legend).toBe('krieger');
    const front = sim.dummy(z, 'waldwolf', 30, x + 20, y), behind = sim.dummy(z, 'waldwolf', 30, x - 30, y);
    const C = CFG.legend.krieger;
    const swing = () => { wait(1); z.events = []; z.playerAttack(t.p, 0); return z.events; };
    for (let n = 1; n <= 8; n++) {
      const ev = swing();
      const wave = ev.some(e => e.k === 'fx' && e.n === 'spin' && e.r === C.radius);
      expect(wave, 'Schlag ' + n).toBe(n % C.every === 0);
      expect(ev.some(e => e.k === 'dmg' && e.id === behind.id), 'Schlag ' + n).toBe(n % C.every === 0);   // der Gegner im Rücken wird nur von der Welle erfasst
      expect(ev.filter(e => e.k === 'dmg' && e.id === front.id).length).toBe(n % C.every === 0 ? 2 : 1);
    }
    // Schläge ins Leere zählen nicht
    z.mobs.delete(front.id); z.mobs.delete(behind.id);
    for (let n = 0; n < 6; n++) expect(swing().some(e => e.k === 'fx' && e.n === 'spin')).toBe(false);
    // ohne die Waffe keine Welle
    t.p.char.equip.weapon = generateGear(new Rng(1), 34, 2, 'krieger', 'weapon'); t.p.recalc();
    sim.dummy(z, 'waldwolf', 30, x + 20, y);
    for (let n = 0; n < 8; n++) expect(swing().some(e => e.k === 'fx' && e.n === 'spin')).toBe(false);
  });
  it('Magier – Wogenruf: Reaktionen treffen härter und das Ziel reagiert früher wieder', () => {
    const { t, z, x, y } = fighter('magier', 34);
    const react = () => {
      const m = sim.dummy(z, 'waldwolf', 30, x + 20, y);
      z.applyStatusMob(m, { id: 'weak', dur: 6 }, 10, 'light', t.p);
      const ev = hit(z, m, t, 100, 'dark').filter(e => e.id === m.id);
      const cd = m.reactAt - sim.game.now;
      z.mobs.delete(m.id);
      return { dmg: ev[1].a, cd };
    };
    legend(t);
    const withLegend = react();
    const power = t.p.stats.power;
    // Vergleich: gleiche Angriffskraft ohne die Sonderwirkung
    t.p.stats.legend = undefined;
    expect(t.p.stats.power).toBe(power);
    const without = react();
    expect(withLegend.dmg / without.dmg).toBeCloseTo(CFG.legend.magier.reactMul, 1);
    expect(without.cd).toBeCloseTo(CFG.elements.reactCd, 5);
    expect(withLegend.cd).toBeCloseTo(CFG.elements.reactCd - CFG.legend.magier.reactCdCut, 5);
  });
  it('Waldläufer – Echosehne: kritische Treffer prallen ab oder hallen nach', () => {
    const { t, z, x, y } = fighter('waldlaeufer', 34);
    legend(t);
    const C = CFG.legend.waldlaeufer;
    const a = sim.dummy(z, 'waldwolf', 30, x + 40, y), b = sim.dummy(z, 'waldwolf', 30, x + 40 + 60, y), far = sim.dummy(z, 'waldwolf', 30, x + 40 + C.range + 80, y);
    t.p.stats.crit = 1;
    /** Verhältnis Folgetreffer zu Haupttreffer, über viele Würfe gemittelt (jeder Treffer streut um ±10 %) */
    const ratio = () => { let first = 0, second = 0; for (let s = 1; s <= 200; s++) { const e = hit(z, a, t, 100, 'phys', {}, s); first += e[0].a; second += e[1].a; } return second / first; };
    let ev = hit(z, a, t, 100, 'phys');
    expect(ev.map(e => e.id)).toEqual([a.id, b.id]);             // Abpraller auf den nächsten Gegner, nicht auf den fernen
    expect(ev[0].c).toBe(1);
    expect(ev[1].c).toBeUndefined();                             // der Abpraller ist nie kritisch – keine Kette
    expect(z.events.some(e => e.k === 'fx' && e.n === 'beam')).toBe(true);
    expect(ratio()).toBeCloseTo(C.ricochet, 1);
    // allein: der Treffer hallt am selben Ziel nach
    z.mobs.delete(b.id);
    ev = hit(z, a, t, 100, 'phys');
    expect(ev.map(e => e.id)).toEqual([a.id, a.id]);
    expect(ratio()).toBeCloseTo(C.echo, 1);
    // ohne kritischen Treffer nichts
    t.p.stats.crit = 0;
    expect(hit(z, a, t, 100, 'phys').length).toBe(1);
    expect(far.hp).toBe(far.maxHp);
    // im echten Ablauf: Pfeil trifft kritisch und springt weiter
    const c = sim.dummy(z, 'waldwolf', 30, x + 40, y + 50);
    t.p.stats.crit = 1; t.p.god = true;
    const hp0 = c.hp;
    t.send({ t: 'atk', ang: 0 });
    t.p.stats.crit = 1;
    sim.step(0.5);
    expect(a.hp).toBeLessThan(a.maxHp);
    expect(c.hp).toBeLessThan(hp0);
  });
  it('Paladin – Morgenwacht: Heilungen legen einen Schild auf alle Geheilten', () => {
    const { t, z, x, y } = fighter('paladin', 34);
    const ally = sim.join('Schuetzling', 'magier', 34);
    ally.p.x = x + 30; ally.p.y = y;
    t.p.char.skills = { pa_heilung: 1, pa_weihe: 1 };
    t.p.mp = t.p.stats.maxMp;
    const C = CFG.legend.paladin;
    // ohne die Waffe: kein Schild
    t.send({ t: 'skill', id: 'pa_heilung', ang: 0, tx: x, ty: y });
    expect(ally.p.buffs.length).toBe(0);
    legend(t);
    t.p.cds.clear(); t.p.mp = t.p.stats.maxMp;
    // 0.8: Heilwert aus den Daten (die Zahl wurde im Feinschliff gesenkt); Angriff VOR dem Wirken – Morgenwacht stärkt ihn danach
    const power = t.p.stats.power, mult = (skillsOf('paladin').find(s => s.id === 'pa_heilung')!.effects![0] as { mult: number }).mult;
    t.send({ t: 'skill', id: 'pa_heilung', ang: 0, tx: x, ty: y });
    for (const who of [t, ally]) {
      const b = who.p.buffs.find(q => q.id === 'morgenwacht')!;
      expect(b, who.p.name).toBeTruthy();
      const heal = power * mult * (1 + t.p.stats.healPct / 100);
      expect(b.mods.powerPct).toBe(C.power);
      expect(b.shield).toBe(Math.min(Math.round(who.p.stats.maxHp * C.cap), Math.round(heal * C.shield)));
      expect(b.until - sim.game.now).toBeCloseTo(C.dur, 3);
    }
    // der Schild fängt Schaden ab
    const s0 = ally.p.buffs.find(q => q.id === 'morgenwacht')!.shield, hp0 = ally.p.hp;
    ally.p.iframesUntil = 0;
    z.hitPlayer(ally.p, 30, 'phys', 30, 'Test');
    expect(ally.p.hp).toBe(hp0);
    expect(ally.p.buffs.find(q => q.id === 'morgenwacht')!.shield).toBeLessThan(s0);
    // Weihe füllt den Schild in kleinen Schritten bis zur Obergrenze, und er läuft ab
    t.p.god = ally.p.god = true;
    sim.step(C.dur + 0.5);
    expect(ally.p.buffs.some(q => q.id === 'morgenwacht')).toBe(false);
    ally.p.x = x + 10;
    t.send({ t: 'skill', id: 'pa_weihe', ang: 0, tx: x, ty: y });
    sim.step(1.2);
    const w1 = ally.p.buffs.find(q => q.id === 'morgenwacht')!.shield;
    expect(w1).toBeGreaterThan(0);
    sim.step(5);
    const w2 = ally.p.buffs.find(q => q.id === 'morgenwacht')!.shield;
    expect(w2).toBeGreaterThan(w1);
    expect(w2).toBeLessThanOrEqual(Math.round(ally.p.stats.maxHp * C.cap));
  });
  it('Schattenjäger – Zwielichtfänge: gezeichnete Ziele detonieren', () => {
    const { t, z, x, y } = fighter('schattenjaeger', 34);
    legend(t);
    const C = CFG.legend.schattenjaeger;
    const m = sim.dummy(z, 'waldwolf', 30, x + 20, y), near = sim.dummy(z, 'waldwolf', 30, x + 20 + 30, y), far = sim.dummy(z, 'waldwolf', 30, x + 20 + C.radius + 60, y);
    t.p.stats.crit = 0;
    // ungezeichnet: nichts
    expect(hit(z, m, t, 100, 'phys').length).toBe(1);
    z.applyStatusMob(m, { id: 'mark', dur: 30 }, 0);
    let ev = hit(z, m, t, 100, 'phys');
    expect(ev.filter(e => e.id === m.id).length).toBe(2);
    expect(ev.find(e => e.id === near.id)!.el).toBe('dark');
    expect(ev.some(e => e.id === far.id)).toBe(false);
    expect(z.events.some(e => e.k === 'fx' && e.n === 'explosion' && e.el === 'dark' && e.r === C.radius)).toBe(true);
    // Sperrzeit je Ziel
    expect(hit(z, m, t, 100, 'phys').length).toBe(1);
    wait(C.cd + 0.01);
    ev = hit(z, m, t, 100, 'phys');
    expect(ev.length).toBe(3);
    // die Detonation selbst zählt nicht als Treffer, der erneut detoniert (auch wenn der Nachbar gezeichnet ist)
    z.applyStatusMob(near, { id: 'mark', dur: 30 }, 0);
    wait(C.cd + 0.01);
    ev = hit(z, m, t, 100, 'phys');
    expect(ev.filter(e => e.id === near.id).length).toBe(1);
    // ohne die Waffe keine Detonation
    t.p.char.equip.weapon = generateGear(new Rng(1), 34, 2, 'schattenjaeger', 'weapon'); t.p.recalc(); t.p.stats.crit = 0;
    wait(C.cd + 0.01);
    expect(hit(z, m, t, 100, 'phys').length).toBe(1);
  });
});

describe('Balance-Leitplanke', () => {
  it('Set, Runen, Speise und Elixier zusammen heben den Angriff nur maßvoll', () => {
    for (const cls of CLASS_IDS) for (const lvl of [10, 20, 30, 40]) {
      const c = newCharacter('B', cls);
      c.level = lvl;
      const main = Object.entries(CLASSES[cls].powerWeights).sort((a, b) => b[1]! - a[1]!)[0][0] as 'str';
      c.attrs[main] += (lvl - 1) * 2; c.attrs.vit += lvl - 1;
      const rng = new Rng(lvl);
      c.equip.weapon = generateGear(rng, lvl, 2, cls, 'weapon');
      c.equip.helm = generateGear(rng, lvl, 2, cls, 'helm');
      c.equip.armor = generateGear(rng, lvl, 2, cls, 'armor');
      c.equip.acc1 = generateGear(rng, lvl, 2, cls, 'accessory', 'ring');
      c.equip.acc2 = generateGear(rng, lvl, 2, cls, 'accessory', 'amulet');
      const base = computeStats(c);
      // dieselbe Ausrüstung als Hohle-Krone-Set mit den stärksten Angriffsrunen, dazu Speise und Elixier
      for (const s of ['helm', 'armor', 'acc1', 'acc2'] as const) c.equip[s]!.set = 'hohlekrone';
      c.equip.weapon.ench = 'macht'; c.equip.helm.ench = 'vital'; c.equip.armor.ench = 'vital';
      const all = computeStats(c, [{ powerPct: 4 }, { powerPct: 6 }]);
      expect(all.power / base.power, `${cls} ${lvl}`).toBeGreaterThan(1.1);
      expect(all.power / base.power, `${cls} ${lvl}`).toBeLessThan(1.25);
      expect(all.maxHp / base.maxHp).toBeLessThan(1.12);
    }
    expect(SET_PIECES.length).toBe(4);
    expect(makeSetPiece(new Rng(2), 'hohlekrone', 'ring', 'krieger').set).toBe('hohlekrone');
  });
});
