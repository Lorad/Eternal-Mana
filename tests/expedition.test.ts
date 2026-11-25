/**
 * Expeditionen (0.9): Karten, Freischaltung, Instanzen, Bereitschaft, Wiederverbindung, Abschluss genau einmal, Rückkehr,
 * Schwierigkeitsgrade, Herausforderung der Woche, alte Spielstände.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { EXPEDITION_LIST, EXPEDITIONS, EXP_DIFF, diffBlock, expUnlock, isoWeek, weeklyChallenge } from '../shared/src/data/expeditions';
import { getMap } from '../shared/src/maps/mapgen';
import { genExpedition, validateExpedition } from '../shared/src/maps/expedition';
import { TILE } from '../shared/src/maps/tiles';
import { Sim, type Tester } from './helpers/sim';
import type { Zone } from '../server/src/zone';

const sim = new Sim();
afterAll(() => sim.close());
beforeEach(() => sim.clear());

function atPortal(t: Tester) {
  sim.travel(t, 'gruenwald');
  const o = [...t.p.zone.objs.values()].find(x => x.props?.kind === 'portal')!;
  t.p.x = o.x; t.p.y = o.y + 20;
}
function unlockAll(t: Tester) { t.p.char.flags['z:gruenwald'] = 1; t.p.char.quests.m_wurzel = { s: 'active', p: [0] }; }
const expZone = (t: Tester): Zone | null => (t.p.zone.exp ? t.p.zone : null);
function killBoss(t: Tester) {
  const z = t.p.zone, b = z.boss!, r = z.map.bossRoom!;
  t.p.x = (r.cx + 0.5) * TILE; t.p.y = (r.cy + 3) * TILE; t.p.god = true;
  sim.step(0.2);
  expect(b.active).toBe(true);
  for (let i = 0; i < 40 && !b.mob.dead; i++) { b.mob.invuln = false; b.mob.vuln = 1; z.hitMob(b.mob, t.p, b.mob.maxHp, 'phys'); sim.step(0.1); }
  expect(b.mob.dead).toBe(true);
}
function startSolo(t: Tester, diff: 'normal' | 'schwer' = 'normal') { unlockAll(t); atPortal(t); t.send({ t: 'exp', a: 'select', id: 'exp_gruenwald', diff }); return t.p.zone; }

describe('Expeditionen – Karten', () => {
  it('jede Expedition ist gültig und vollständig spielbar (Weg über Schlüssel, Türen, Rätsel bis zur Arena; Geheimes nur durch die Wand)', () => {
    for (const x of EXPEDITION_LIST) {
      const m = getMap(x.id);
      expect(validateExpedition(m), x.id).toEqual([]);
      expect(m.exp!.sections.length).toBeGreaterThanOrEqual(x.sections.length);
      expect(m.bossRoom).toBeTruthy();
      expect(m.exp!.secrets.length).toBeGreaterThan(0);
      expect(m.exp!.puzzles.length).toBeGreaterThan(0);
      expect(m.exp!.minis.some(mi => mi.optional)).toBe(true);
    }
  });
  it('deterministisch: dieselbe Karte bei jedem Erzeugen', () => {
    const b = getMap('exp_gruenwald'), a = genExpedition(b.def);
    expect(Buffer.from(a.tiles).equals(Buffer.from(b.tiles))).toBe(true);
    expect(a.spawns.length).toBe(b.spawns.length);
  });
});

describe('Expeditionen – Freischaltung', () => {
  it('Bedingungen und Schwierigkeitsgrade', () => {
    const t = sim.join('Frei', 'krieger');
    expect(expUnlock(t.p.char, 'exp_gruenwald').ok).toBe(false);
    unlockAll(t);
    expect(expUnlock(t.p.char, 'exp_gruenwald').ok).toBe(true);
    expect(diffBlock(t.p.char, 'exp_gruenwald', 'schwer')).toMatch(/Normal/);
    t.p.char.expeditions = { exp_gruenwald: { clears: { normal: 1 } } };
    expect(diffBlock(t.p.char, 'exp_gruenwald', 'schwer')).toBeNull();
    expect(diffBlock(t.p.char, 'exp_gruenwald', 'albtraum')).toMatch(/Stufe/);
  });
  it('ohne Freischaltung kein Betreten', () => {
    const t = sim.join('Zu', 'krieger');
    atPortal(t);
    t.send({ t: 'exp', a: 'select', id: 'exp_gruenwald', diff: 'normal' });
    expect(expZone(t)).toBeNull();
    unlockAll(t);
    t.send({ t: 'exp', a: 'select', id: 'exp_gruenwald', diff: 'schwer' });
    expect(expZone(t)).toBeNull();
    t.send({ t: 'exp', a: 'select', id: 'exp_gruenwald', diff: 'normal' });
    expect(expZone(t)).not.toBeNull();
  });
});

describe('Expeditionen – Ablauf', () => {
  it('alter Dungeon-Eingang führt in die Expedition; ein Spielstand im alten Dungeon steht an dessen Eingang', () => {
    const t = sim.join('Ein', 'krieger');
    unlockAll(t);
    sim.travel(t, 'gruenwald');
    const ex = [...t.p.zone.objs.values()].find(o => o.type === 'exit' && o.props?.to === 'wurzelgruft')!;
    t.p.exitImmuneUntil = 0; t.p.x = ex.x; t.p.y = ex.y;
    sim.step(0.1);
    expect(t.p.zone.id).toBe('exp_gruenwald');
    sim.leave(t);
    const id = sim.db.listChars(t.s.account!.id)[0].id, c = sim.db.loadChar(t.s.account!.id, id)!;
    c.zone = 'wurzelgruft'; c.x = 100; c.y = 100;
    sim.db.saveChar(id, c);
    sim.reenter(t);
    expect(t.p.zone.id).toBe('gruenwald');
    const e = getMap('gruenwald').entries.wurzelgruft;
    expect(Math.hypot(t.p.x - e.x, t.p.y - e.y)).toBeLessThan(40);
  });

  it('Instanzen getrennt: zwei Gruppen, ein Außenstehender kommt nicht hinein', () => {
    const a = sim.join('GruppeA', 'krieger'), b = sim.join('GruppeB', 'magier'), o = sim.join('Fremd', 'paladin');
    for (const t of [a, b, o]) { unlockAll(t); atPortal(t); }
    sim.party(a); sim.party(b);
    a.send({ t: 'exp', a: 'select', id: 'exp_gruenwald', diff: 'normal' });
    b.send({ t: 'exp', a: 'select', id: 'exp_gruenwald', diff: 'normal' });
    expect(expZone(a)).not.toBeNull(); expect(expZone(b)).not.toBeNull();
    expect(a.p.zone).not.toBe(b.p.zone);
    o.send({ t: 'exp', a: 'join' });
    expect(expZone(o)).toBeNull();
  });

  it('Bereitschaftsprüfung: der Anführer startet erst, wenn alle bereit sind – dann gehen alle gemeinsam', () => {
    const a = sim.join('Leit', 'krieger'), b = sim.join('Mit', 'magier');
    for (const t of [a, b]) { unlockAll(t); atPortal(t); }
    sim.party(a, b);
    a.send({ t: 'exp', a: 'select', id: 'exp_gruenwald', diff: 'normal' });
    expect(expZone(a)).toBeNull();
    const lob = b.msgs.filter(m => m.t === 'exp' && (m as any).lobby).at(-1) as any;
    expect(lob.lobby.members.find((m: any) => m.name === 'Mit').ready).toBe(false);
    a.send({ t: 'exp', a: 'start' });
    expect(expZone(a)).toBeNull();
    b.p.x += 2000; // nicht am Portal: wird beim Start herbeigeholt
    b.send({ t: 'exp', a: 'ready' });
    a.send({ t: 'exp', a: 'start' });
    expect(expZone(a)).not.toBeNull();
    expect(b.p.zone).toBe(a.p.zone);
  });

  it('Wiederverbindung: kurz weg und nach Ablauf der Schonfrist – zurück in die Instanz an dieselbe Stelle', () => {
    const t = sim.join('Wieder', 'waldlaeufer');
    const z = startSolo(t);
    const s = z.map.exp!.sections[2];
    t.p.x = s.entry.x; t.p.y = s.entry.y;
    sim.drop(t); sim.step(1);
    sim.reconnect(t);
    expect(t.p.zone).toBe(z);
    sim.leave(t);
    sim.reenter(t);
    expect(t.p.zone).toBe(z);
    expect(Math.hypot(t.p.x - s.entry.x, t.p.y - s.entry.y)).toBeLessThan(4);
  });

  it('Abschluss: Belohnung genau einmal (doppeltes Bossende, erneutes Töten, Abbruch, Neustart), Rekord, gemeinsame Rückkehr', () => {
    const a = sim.join('Sieg', 'krieger', 6), b = sim.join('Mithelfer', 'magier', 6);
    for (const t of [a, b]) { unlockAll(t); atPortal(t); }
    sim.party(a, b);
    a.send({ t: 'exp', a: 'select', id: 'exp_gruenwald', diff: 'normal' });
    b.send({ t: 'exp', a: 'ready' });
    a.send({ t: 'exp', a: 'start' });
    const z = a.p.zone, r = z.map.bossRoom!;
    b.p.x = (r.cx + 0.5) * TILE; b.p.y = (r.cy + 3) * TILE; b.p.god = true;
    killBoss(a);
    const gold = a.p.char.gold, runs = a.p.char.expRuns!.length;
    expect(a.p.char.expeditions!.exp_gruenwald.clears.normal).toBe(1);
    expect(a.p.char.expeditions!.exp_gruenwald.best!.normal).toBeGreaterThan(0);
    expect(a.p.char.flags['b:dornenmutter']).toBe(1);
    expect(a.p.char.quests.m_wurzel.p[0]).toBe(1); // Questziel „boss“ zählt
    z.boss!.onDeath();
    z.killMob(z.boss!.mob);
    expect(a.p.char.gold).toBe(gold);
    expect(a.p.char.expRuns!.length).toBe(runs);
    sim.drop(b); sim.step(1); sim.reconnect(b);
    expect(b.p.zone).toBe(z);
    expect(b.p.char.expeditions!.exp_gruenwald.clears.normal).toBe(1);
    const saved = sim.db.loadChar(a.s.account!.id, sim.db.listChars(a.s.account!.id)[0].id)!;
    expect(saved.expRuns).toContain(z.exp!.key);
    expect(saved.expeditions!.exp_gruenwald.clears.normal).toBe(1);
    sim.step(4);
    expect(a.msgs.some(m => m.t === 'exp' && (m as any).result)).toBe(true);
    const portal = [...z.objs.values()].find(o => o.props?.kind === 'return')!;
    expect(portal).toBeTruthy();
    a.p.x = portal.x; a.p.y = portal.y + 10;
    a.send({ t: 'interact', id: portal.id });
    expect(a.p.zone).toBe(z); // wartet auf die Gruppe
    b.p.x = portal.x; b.p.y = portal.y + 10;
    b.send({ t: 'interact', id: portal.id });
    expect(a.p.zone).not.toBe(z);
    expect(b.p.zone).toBe(a.p.zone);
    expect(a.msgs.some(m => m.t === 'exp' && (m as any).summary)).toBe(true);
    a.send({ t: 'exp', a: 'join' });
    expect(a.p.zone.exp).toBeFalsy();
  });

  it('Rückkehr auch ohne Abstimmung nach dem Countdown', () => {
    const t = sim.join('Uhr', 'paladin', 6);
    const z = startSolo(t);
    killBoss(t);
    sim.step(70);
    expect(t.p.zone).not.toBe(z);
    expect(t.p.zone.exp).toBeFalsy();
  });
});

describe('Expeditionen – Schwierigkeitsgrade und Woche', () => {
  it('Schwierigkeitsgrade verändern Mechanik, nicht nur Leben', () => {
    expect(EXP_DIFF.schwer.affixes).toBeGreaterThan(0);
    expect(EXP_DIFF.albtraum.enrage).toBeGreaterThan(0);
    expect(EXP_DIFF.mythisch.bossAdds).toBeGreaterThan(EXP_DIFF.normal.bossAdds);
    expect(EXP_DIFF.schwer.noDeathChest && EXP_DIFF.albtraum.timedChest).toBe(true);
    const t = sim.join('Hart', 'krieger', 30);
    t.p.char.expeditions = { exp_gruenwald: { clears: { normal: 1 } } };
    const z = startSolo(t, 'schwer');
    expect(z.exp!.diff).toBe('schwer');
    expect(z.exp!.affix.size).toBeGreaterThan(0);
    const lv = [...z.mobs.values()].filter(m => !m.boss).map(m => m.lvl);
    expect(Math.min(...lv)).toBeGreaterThanOrEqual(EXPEDITIONS.exp_gruenwald.level[0] + 3);
  });
  it('Herausforderung der Woche: deterministisch je ISO-Woche', () => {
    expect(weeklyChallenge('2026-48')).toEqual(weeklyChallenge('2026-48'));
    expect(isoWeek(Date.UTC(2026, 10, 25))).toBe('2026-48');
    expect(isoWeek(Date.UTC(2027, 0, 1))).toBe('2026-53');
    const w = weeklyChallenge('2026-48');
    expect(EXPEDITIONS[w.exp]).toBeTruthy();
    expect(new Set(w.mods).size).toBe(2);
  });
});
