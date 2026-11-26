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
import { CFG } from '../shared/src/config';
import { BOSSES, ENEMIES } from '../shared/src/data/enemies';
import { EXP_CFG } from '../shared/src/data/expeditions';
import { Expedition } from '../server/src/expedition';
import type { Zone } from '../server/src/zone';
import { acc } from '../server/src/home/state';
import { ITEMS, generateGear } from '../shared/src/data/items';
import { Rng } from '../shared/src/util/rng';
import { circleFree } from '../shared/src/collision';

const sim = new Sim();
afterAll(() => sim.close());
beforeEach(() => sim.clear());

function atPortal(t: Tester) {
  sim.travel(t, 'gruenwald');
  const o = [...t.p.zone.objs.values()].find(x => x.props?.kind === 'portal')!;
  t.p.x = o.x; t.p.y = o.y + 20;
}
function unlockAll(t: Tester) {
  t.p.char.flags['z:gruenwald'] = 1; t.p.char.quests.m_wurzel = { s: 'active', p: [0] };
  for (const x of EXPEDITION_LIST) if (!x.secret) for (const r of x.unlock) { if (r.cond?.flag) t.p.char.flags[r.cond.flag] = 1; for (const a of r.cond?.any ?? []) if (a.started && !t.p.char.quests[a.started]) t.p.char.quests[a.started] = { s: 'active', p: [0] }; }
}
const expZone = (t: Tester): Zone | null => (t.p.zone.exp ? t.p.zone : null);
function killBoss(t: Tester) {
  const z = t.p.zone, b = z.boss!, r = z.map.bossRoom!;
  t.p.x = (r.cx + 0.5) * TILE; t.p.y = (r.cy + 3) * TILE; t.p.god = true;
  sim.step(0.2);
  expect(b.active).toBe(true);
  for (let i = 0; i < 40 && !b.mob.dead; i++) { b.mob.invuln = false; b.mob.vuln = 1; z.hitMob(b.mob, t.p, b.mob.maxHp, 'phys'); sim.step(0.1); }
  expect(b.mob.dead).toBe(true);
}
function startSolo(t: Tester, diff: 'normal' | 'schwer' | 'albtraum' = 'normal', id = 'exp_gruenwald') { unlockAll(t); if (EXPEDITIONS[id].secret) { t.p.char.flags['xs:' + id] = 1; t.p.char.flags['b:hohlkoenig'] = 1; } atPortal(t); t.send({ t: 'exp', a: 'select', id, diff }); return t.p.zone; }

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
  it('geheime Expedition: unsichtbar, bis die Spur in den Unteren Archiven gefunden ist', () => {
    const t = sim.join('Geheim', 'magier', 34);
    unlockAll(t); t.p.char.flags['b:hohlkoenig'] = 1;
    expect(expUnlock(t.p.char, 'exp_gestrichen').visible).toBe(false);
    const z = startSolo(t, 'normal', 'exp_ruinen');
    const o = [...z.objs.values()].find(x => x.props?.kind === 'discover')!;
    expect(o.props!.exp).toBe('exp_gestrichen');
    t.p.x = o.x; t.p.y = o.y + 14;
    t.send({ t: 'interact', id: o.id });
    expect(expUnlock(t.p.char, 'exp_gestrichen')).toMatchObject({ ok: true, visible: true });
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
    const b0 = a.p.char.flags['b:dornenmutter'] ?? 0;
    killBoss(a);
    const gold = a.p.char.gold, runs = a.p.char.expRuns!.length;
    expect(a.p.char.expeditions!.exp_gruenwald.clears.normal).toBe(1);
    expect(a.p.char.expeditions!.exp_gruenwald.best!.normal).toBeGreaterThan(0);
    expect(a.p.char.flags['b:dornenmutter']).toBe(b0 + 1);
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

  it('voller Rucksack: die Belohnung landet in der Lagertruhe statt am Boden der Belohnungskammer', () => {
    const t = sim.join('Vollgepackt', 'krieger', 6);
    startSolo(t);
    const z = t.p.zone;
    t.p.char.inv = [];
    const rng = new Rng(7);
    for (let i = 0; i < CFG.player.invSize; i++) t.p.char.inv.push(generateGear(rng, 5, 0, 'krieger'));
    const stash0 = acc(sim.game, t.p.accountId).h.stash.length;
    killBoss(t);
    expect(t.p.char.expeditions!.exp_gruenwald.clears.normal).toBe(1);
    const h = acc(sim.game, t.p.accountId).h;
    expect(h.stash.length).toBeGreaterThan(stash0);
    expect(t.p.char.inv.some(it => it.base === BOSSES.dornenmutter.seal)).toBe(true); // Siegel (Questgegenstand) bleibt beim Spieler
    expect(t.msgs.some(m => m.t === 'toast' && /Lagertruhe/.test((m as any).s))).toBe(true);
    expect(z.exp).toBeTruthy();
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
  it('Albtraum: Beute auf der Stufe der Gegner (mindestens 42), auch in der ersten Expedition', () => {
    const t = sim.join('Alb', 'krieger', 40);
    t.p.char.expeditions = { exp_gruenwald: { clears: { normal: 1, schwer: 1 } } };
    const z = startSolo(t, 'albtraum');
    expect(z.exp!.diff).toBe('albtraum');
    const old = new Set(t.p.char.inv.map(i => i.uid));
    killBoss(t);
    const gear = t.p.char.inv.filter(i => !old.has(i.uid) && !i.name && !['consumable', 'material', 'quest'].includes(ITEMS[i.base]?.kind)); // ohne die benannten Boss-Unikate (eigene Stufe)
    expect(gear.length).toBeGreaterThan(0);
    for (const g of gear) expect(g.ilvl, g.base).toBeGreaterThanOrEqual(EXP_DIFF.albtraum.lvlMin);
  });
  it('Herausforderung der Woche: Bonus genau einmal je Woche und Charakter', () => {
    const t = sim.join('Woche', 'krieger', 6);
    const w = { week: '2026-48', exp: 'exp_gruenwald', diff: 'normal' as const, mods: ['horde', 'glas'] as any };
    const z1 = startSolo(t); z1.exp!.weekly = w; killBoss(t);
    const r1 = z1.exp!.results.get(t.p.charId)!;
    expect(r1.weekly).toBe(true);
    expect(t.p.char.flags['xw:2026-48']).toBe(1);
    sim.step(70);
    const z2 = startSolo(t); z2.exp!.weekly = w; killBoss(t);
    expect(z2.exp!.results.get(t.p.charId)!.weekly).toBe(false);
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

describe('Expeditionen – Ereignisse und Bosse', () => {
  it('jede Expedition hat ihr Ereignis, und es lässt sich bestehen (Hinterhalt, Finsternis, Flut, Einsturz)', () => {
    for (const x of EXPEDITION_LIST) {
      const t = sim.join('Ev' + x.id.slice(4, 9), 'krieger', x.rec);
      const z = startSolo(t, 'normal', x.id);
      expect(z.exp, x.id).toBeTruthy();
      t.p.god = true;
      const info = z.map.exp!, evd = info.events[0];
      expect(evd?.kind).toBe(x.event);
      const s = info.sections.find(q => q.id === evd.sec)!;
      t.p.x = (s.cx + 0.5) * TILE; t.p.y = (s.cy + 0.5) * TILE;
      sim.step(0.6);
      const ev = z.exp!.events.get(s.id)!;
      expect(ev.state, x.id).toBe('running');
      if (evd.kind === 'darkness' || evd.kind === 'flood') {
        expect(t.msgs.filter(m => m.t === 'exp' && (m as any).run).some(m => evd.kind !== 'darkness' || (m as any).run.dark === 1)).toBe(true);
        for (const o of [...z.objs.values()].filter(o => o.props?.sec === s.id && (o.props?.kind === 'lightstone' || o.props?.kind === 'valve'))) { t.p.x = o.x; t.p.y = o.y + 14; t.send({ t: 'interact', id: o.id }); }
      } else if (evd.kind === 'ambush') {
        for (let i = 0; i < 400 && ev.state === 'running'; i++) { for (const m of [...ev.mobs]) z.killMob(m); sim.step(0.5); }
      } else {
        sim.step(2); t.p.x = ev.end!.x; t.p.y = ev.end!.y; sim.step(0.5);
      }
      expect(ev.state, x.id).toBe('done');
      sim.leave(t);
    }
  });
  it('Endbosse: Phasen bei 60 % und 25 %, Signaturmechanik je Boss', () => {
    for (const x of EXPEDITION_LIST) {
      const t = sim.join('Bo' + x.id.slice(4, 9), 'paladin', x.rec);
      const z = startSolo(t, 'normal', x.id), b = z.boss!, r = z.map.bossRoom!;
      t.p.god = true; t.p.x = (r.cx + 0.5) * TILE; t.p.y = (r.cy + 3) * TILE;
      sim.step(0.3);
      expect(b.active, x.id).toBe(true);
      expect((b as any).echo?.phases).toEqual([0.6, 0.25]);
      b.mob.hp = Math.round(b.mob.maxHp * 0.62); sim.step(0.2); expect(b.phase).toBe(1);
      b.mob.hp = Math.round(b.mob.maxHp * 0.58); sim.step(0.2); expect(b.phase).toBe(2);
      sim.step(0.8); expect(b.mob.invuln, 'Filmmoment beim Phasenwechsel').toBe(true);
      b.mob.hp = Math.round(b.mob.maxHp * 0.24); sim.step(0.2); expect(b.phase).toBe(3);
      sim.step(30);
      sim.leave(t);
    }
  });
  it('Signaturen greifen: Knospen schützen, Säulen panzern, Kühlkette kühlt, Stillstand bestraft Bewegung, Eintrag ohne Tinte wird gelöscht', () => {
    const run = (id: string, cls: 'paladin' = 'paladin') => { const t = sim.join('Si' + id.slice(4, 9), cls, EXPEDITIONS[id].rec); const z = startSolo(t, 'normal', id), r = z.map.bossRoom!; t.p.god = true; t.p.x = (r.cx + 0.5) * TILE; t.p.y = (r.cy + 3) * TILE; sim.step(0.4); return { t, z, b: z.boss! }; };
    { const { t, z, b } = run('exp_gruenwald'); expect([...z.mobs.values()].some(m => m.def.id === 'xm_knospe')).toBe(true); expect(b.mob.vuln).toBeLessThan(0.5);
      for (const m of [...z.mobs.values()]) if (m.def.id === 'xm_knospe') z.killMob(m); sim.step(0.2); expect(b.mob.vuln).toBe(1); sim.leave(t); }
    { const { t, z, b } = run('exp_glut'); const chain = [...z.objs.values()].find(o => o.props?.kind === 'chain')!; expect(chain).toBeTruthy();
      sim.step(9); t.p.x = chain.x; t.p.y = chain.y + 12; t.send({ t: 'interact', id: chain.id }); sim.step(0.1); expect(b.mob.vuln).toBeGreaterThan(1.5); sim.leave(t); }
    { const { t } = run('exp_frost'); sim.step(14); t.p.god = false; t.p.char.level = 40; t.p.recalc();
      let hit = false; for (let i = 0; i < 200 && !hit; i++) { t.p.x += i % 2 ? 8 : -8; t.p.iframesUntil = 0; t.p.hp = t.p.stats.maxHp; sim.step(0.05); hit = t.p.statuses.has('freeze'); }
      expect(hit, 'Bewegung im Stillstand friert ein').toBe(true); sim.leave(t); }
    { const { t, z, b } = run('exp_kristall'); const r = z.map.bossRoom!, mech = (b as any).echo, kit = b.kit();
      const pillars = () => [...z.mobs.values()].filter(m => m.def.id === 'xm_prisma' && !m.dead);
      expect(b.mob.vuln).toBeLessThan(0.5); expect(pillars().length).toBe(4);
      // Der Ansturm endet in jeder Richtung auf begehbarem Boden – die Arena ist nicht rechteckig
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        b.mob.x = (r.cx + 0.5) * TILE; b.mob.y = (r.cy + 0.5) * TILE; t.p.x = b.mob.x + Math.cos(a) * 50; t.p.y = b.mob.y + Math.sin(a) * 50;
        const g = mech.pattern(kit); g.next(); g.next();
        expect(circleFree(z.solidWalk, b.mob.x, b.mob.y, 8), `Ansturm Richtung ${i}`).toBe(true);
      }
      // auch der Ansturm aus Phase 2/3 zerschlägt eine Säule (dann taumelt er) – ohne Säule hält der Panzer
      sim.step(6); for (const m of pillars()) z.killMob(m); mech.phase(kit, 2); sim.step(0.1);
      const p0 = pillars()[0], n = pillars().length, x0 = p0.x + (r.cx * TILE - p0.x) * 0.6, y0 = p0.y + (r.cy * TILE - p0.y) * 0.6;
      expect(mech.charged(kit, x0, y0, p0.x + (p0.x - x0) * 0.2, p0.y + (p0.y - y0) * 0.2)).toBeGreaterThan(3);
      expect(pillars().length).toBe(n - 1); sim.step(0.1); expect(b.mob.vuln).toBeGreaterThan(1.5);
      sim.step(6); expect(mech.charged(kit, x0, y0, x0 + 1, y0 + 1)).toBeGreaterThan(0); sim.step(0.1); expect(b.mob.vuln).toBeLessThan(0.5);
      sim.leave(t); }
    { const { t, z } = run('exp_ruinen'); sim.step(10.5); const mech = (z.boss as any); expect(t.p.statuses.has('mark')).toBe(true);
      const ink = [...z.objs.values()].find(o => o.props?.kind === 'ink')!; t.p.x = ink.x; t.p.y = ink.y + 10; sim.step(0.2); expect(t.p.statuses.has('mark')).toBe(false); void mech; sim.leave(t); }
  });
});

describe('Expeditionen – Tempo der Geschichte', () => {
  it('eine Expedition auf Normal hebt bei empfohlener Stufe um höchstens drei Stufen (die Geschichte läuft nicht davon)', () => {
    for (const x of EXPEDITION_LIST) {
      const t = sim.join('Xp' + x.id.slice(4, 9), 'krieger', x.rec);
      const z = startSolo(t, 'normal', x.id), f = Expedition.mobXp(z);
      let lvl = x.rec, xp = 0;
      const add = (n: number) => { xp += n; while (xp >= CFG.xpToNext(lvl)) { xp -= CFG.xpToNext(lvl); lvl++; } };
      for (const s of z.map.spawns) add(CFG.enemy.xp(s.lvl) * ENEMIES[s.mob].xpMul * f * (s.elite ? 3 : 1) * CFG.enemy.xpLevelPenalty(lvl, s.lvl));
      add(BOSSES[x.boss].xp * EXP_CFG.clearXp);
      expect(lvl - x.rec, x.id).toBeLessThanOrEqual(3);
      expect(lvl - x.rec, x.id).toBeGreaterThanOrEqual(1);
      sim.leave(t);
    }
  });
});
