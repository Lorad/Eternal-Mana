/**
 * Lebendige Welt (0.6): Ruf und Fraktionen, Weltereignisse, Weltbosse, seltene Monster, Schätze, Begegnungen,
 * Tagesabläufe und Jahreszeiten – gegen ein echtes `Game` ohne Netzwerk (tests/helpers/sim.ts).
 * Nichts wartet auf echte Zeit: Ereignisse, Monster, Begegnungen und Jahreszeiten werden erzwungen (`World.start…`),
 * die Uhr läuft von Hand (`sim.step`).
 */
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sanitizeChar } from '../server/src/db';
import { Game } from '../server/src/game';
import { World } from '../server/src/world';
import { finishEvent, scheduleEvents, startEvent, tiersOf } from '../server/src/world/events';
import { rareAllowed, spawnRare } from '../server/src/world/rares';
import { routineOfNpc } from '../server/src/world/routines';
import type { Mob, Obj, Zone } from '../server/src/zone';
import { CFG } from '../shared/src/config';
import { ENEMIES } from '../shared/src/data/enemies';
import { EVENTS, EVENT_POOL, SEASON_NAMES, SEASON_NODES, eventPool, isNight, seasonAt, seasonWeathers } from '../shared/src/data/events';
import { FACTIONS, FACTION_LIST, RANK_NAMES, backfillRep, factionOfZone, factionStock, rankOf, repOf, shopPrice, titleOf } from '../shared/src/data/factions';
import { ITEMS, makeStack } from '../shared/src/data/items';
import { NPCS } from '../shared/src/data/npcs';
import { QUESTS } from '../shared/src/data/quests';
import { RARE_LIST, WORLD_BOSS_LIST } from '../shared/src/data/rares';
import { LEARNABLE, RECIPES, scrollOf } from '../shared/src/data/recipes';
import { ROUTINE_LIST, routineState } from '../shared/src/data/routines';
import { REGIONS, STAR, TROPHY_IDS, mapOf, trophyOf } from '../shared/src/data/worlditems';
import { ZONES } from '../shared/src/data/zones';
import { getMap } from '../shared/src/maps/mapgen';
import { newCharacter } from '../shared/src/stats';
import type { GameEvent, ServerMsg, WorldInfo } from '../shared/src/types';
import { Rng } from '../shared/src/util/rng';
import { activeTreasure, cellFree, treasureSpots } from '../shared/src/world';
import { Bot } from './helpers/bot';
import { Sim, type Tester } from './helpers/sim';

let sim: Sim;
beforeAll(() => { sim = new Sim(); World.setAuto(sim.game, false); });
afterAll(() => sim.close());

const zs = (z: Zone) => World.state.zone(z);
const setTod = (s: Sim, tod: number) => { (s.game as any).todOffset = tod - s.game.now / CFG.world.dayLengthSec; };
const kill = (z: Zone, t: Tester, mobs: Iterable<Mob>) => { for (const m of [...mobs]) { m.invuln = false; z.hitMob(m, t.p, 1e9, 'phys'); } };
const interact = (t: Tester, o: Obj) => { t.p.x = o.x; t.p.y = o.y + 8; t.send({ t: 'interact', id: o.id }); };
const world = (t: Tester): WorldInfo => (t.msgs.filter(m => m.t === 'world').at(-1) as Extract<ServerMsg, { t: 'world' }>).w;
const wobjs = (z: Zone, frame?: string) => [...z.objs.values()].filter(o => o.type === 'wobj' && (!frame || o.props?.frame === frame));
const toasted = (t: Tester, part: string) => t.toasts.some(s => s.includes(part));
/** frischer Spieler auf leerem Kampfplatz, unverwundbar – damit nur das Ereignis zählt */
function hero(name: string, zone: string, level = 12, cls: 'krieger' | 'magier' = 'krieger') {
  const t = sim.join(name, cls, level);
  if (t.p.zone.id !== zone) sim.travel(t, zone);
  const a = sim.arena(t);
  t.p.god = true;
  return { t, ...a };
}

// =====================================================================================================================
describe('Daten', () => {
  it('sechs Fraktionen mit fünf Rängen; Vorräte, Spenden und Zeilen verweisen auf Vorhandenes', () => {
    expect(FACTION_LIST.length).toBe(6);
    expect(RANK_NAMES.length).toBe(5);
    expect(CFG.living.rep.ranks.length).toBe(5);
    expect(new Set(FACTION_LIST.map(f => f.zone))).toEqual(new Set(REGIONS));
    for (const f of FACTION_LIST) {
      expect(NPCS[f.npc], f.id).toBeTruthy();
      expect(getMap(f.zone).objects.some(o => o.type === 'npc' && o.tag === f.npc), `${f.npc} steht in ${f.zone}`).toBe(true);
      expect(f.perks.length).toBe(5);
      for (const o of f.stock) { expect(ITEMS[o.item], `${f.id}: ${o.item}`).toBeTruthy(); expect(o.rank).toBeGreaterThanOrEqual(2); expect(o.price).toBeGreaterThan(ITEMS[o.item].price * CFG.loot.sellFactor); }
      for (const b in f.donate) expect(ITEMS[b], b).toBeTruthy();
      for (const npc in f.lines) expect(NPCS[npc], npc).toBeTruthy();
      // jede Fraktion führt Rezeptrollen aus 0.3 und mindestens ein neues Rezept
      expect(f.stock.some(o => o.item.startsWith('rs_f_master_'))).toBe(true);
      expect(f.stock.some(o => o.item.startsWith('rs_') && RECIPES[o.item.slice(3)]?.src === 'ruf')).toBe(true);
      expect(f.stock.filter(o => o.unique).length).toBe(1);
    }
    for (const z of ['wurzelgruft', 'quellgrund', 'herz']) expect(factionOfZone(z)?.id).toBe('quellhain');
    expect(factionOfZone('wacht')?.id).toBe('lichter');
    // neue Rezepte gibt es nur in der Lebendigen Welt, nie in der allgemeinen Beute; jedes ist irgendwo zu bekommen
    const neu = LEARNABLE.filter(r => r.src);
    expect(neu.length).toBeGreaterThanOrEqual(8);
    for (const r of neu.filter(x => x.src === 'ruf')) expect(FACTION_LIST.some(f => f.stock.some(o => o.item === scrollOf(r.id))), r.id).toBe(true);
    expect(neu.some(r => r.inputs.some(([b]) => b === STAR))).toBe(true);
  });
  it('zwölf seltene Monster (zwei je Region), drei Weltbosse, Ereignisse je Region – alles mit vorhandenen Sprites', () => {
    expect(RARE_LIST.length).toBe(12);
    for (const reg of REGIONS) expect(RARE_LIST.filter(r => r.zone === reg).length, reg).toBe(2);
    expect(new Set(RARE_LIST.map(r => r.trait)).size).toBe(12);
    for (const r of RARE_LIST) {
      const d = ENEMIES[r.mob];
      expect(d?.named, r.id).toBe(true);
      expect(ENEMIES[d.sprite!] && !ENEMIES[d.sprite!].sprite, `${r.id}: Sprite ${d.sprite}`).toBeTruthy();
      expect(d.tint).toBeDefined(); expect(d.scale).toBeGreaterThan(1);
      expect(ITEMS[trophyOf(r.id)]?.use?.trophy).toBe(r.id);
      for (const [poi] of r.spots) expect(ZONES[r.zone].pois!.some(p => p.id === poi), `${r.id}: ${poi}`).toBe(true);
      expect(r.spots.length).toBeGreaterThanOrEqual(3);
      if (r.adds) expect(ENEMIES[r.adds[0]]).toBeTruthy();
    }
    expect(RARE_LIST.some(r => r.night) && RARE_LIST.some(r => r.weather) && RARE_LIST.some(r => r.seasons)).toBe(true);
    expect(WORLD_BOSS_LIST.length).toBeGreaterThanOrEqual(3);
    expect(new Set(WORLD_BOSS_LIST.flatMap(b => b.zones))).toEqual(new Set(REGIONS));
    for (const b of WORLD_BOSS_LIST) { expect(ENEMIES[b.mob]?.scale).toBeGreaterThan(2); expect(ITEMS[trophyOf(b.id)]).toBeTruthy(); for (const a of b.adds) expect(ENEMIES[a]).toBeTruthy(); }
    expect(TROPHY_IDS.length).toBe(15);
    for (const reg of REGIONS) {
      expect(EVENT_POOL[reg].some(([k]) => k === 'woge') && EVENT_POOL[reg].some(([k]) => k === 'haendler'), reg).toBe(true);
      expect(ITEMS[mapOf(reg)]?.use?.tmap).toBe(reg);
      expect(treasureSpots(getMap(reg)).length, reg).toBeGreaterThanOrEqual(12);
    }
    // regionale Besonderheiten für mindestens drei Regionen; Sternenregen nur unter freiem Himmel
    expect(REGIONS.filter(reg => EVENT_POOL[reg].some(([k]) => k === 'einsturz' || k === 'aschesturm' || k === 'jagd')).length).toBeGreaterThanOrEqual(3);
    for (const reg of REGIONS) if (ZONES[reg].indoor) expect(EVENT_POOL[reg].some(([k]) => k === 'sterne'), reg).toBe(false);
    expect(EVENTS.sterne.night).toBe(true);
  });
  it('Tagesabläufe: jede Station ist begehbar; zwischen 7:30 und 11 Uhr steht jeder an seinem Stammplatz', () => {
    expect(ROUTINE_LIST.length).toBeGreaterThanOrEqual(10);
    for (const r of ROUTINE_LIST) {
      const map = getMap(r.zone);
      expect(map.objects.some(o => o.type === 'npc' && o.tag === r.npc && !o.props?.when), `${r.npc} in ${r.zone}`).toBe(true);
      for (const s of r.stops) {
        if (!s.at) continue;
        const poi = ZONES[r.zone].pois!.find(p => p.id === s.at![0])!;
        expect(poi, `${r.npc}: ${s.at[0]}`).toBeTruthy();
        let free = false;
        for (let dy = -4; dy <= 4 && !free; dy++) for (let dx = -4; dx <= 4 && !free; dx++) free = cellFree(map, poi.x + s.at[1] + dx, poi.y + s.at[2] + dy);
        expect(free, `${r.npc}: Station bei ${s.at.join(',')}`).toBe(true);
      }
      // Serverstart ist 7:40 Uhr: bis in den späten Vormittag bewegt sich niemand (Bots und Tests verlassen sich darauf)
      for (const h of [7.5, 8, 9, 10, 11]) { const st = r.stops.filter(s => s.from <= h).at(-1)!; expect(st.at, `${r.npc} um ${h}`).toBeUndefined(); }
      if (r.stops.some(s => s.sleep)) expect(r.sleepLine, r.npc).toBeTruthy();
    }
  });
});

// =====================================================================================================================
describe('Ruf und Fraktionen', () => {
  it('Quests bringen Ruf bei der Fraktion ihrer Region – auch die wiederholbaren', () => {
    const t = sim.join('Rufa', 'krieger', 10);
    sim.gotoNpc(t, 'mirelda');
    t.p.char.quests.m_erwachen = { s: 'active', p: [5] };
    t.send({ t: 'qTurnIn', id: 'm_erwachen', npc: 'mirelda' });
    expect(t.p.char.quests.m_erwachen.s).toBe('done');
    expect(repOf(t.p.char, 'quellhain')).toBe(CFG.living.rep.quest.main);
    const q = QUESTS.r_gruenwald;
    sim.gotoNpc(t, q.giver);
    for (let i = 0; i < 2; i++) {
      t.p.char.quests[q.id] = { s: 'active', p: q.objectives.map(o => ('n' in o ? o.n : 1)), n: i };
      for (const o of q.objectives) if (o.t === 'collect') t.give(o.item, o.n);
      t.send({ t: 'qTurnIn', id: q.id, npc: q.turnIn ?? q.giver });
    }
    expect(repOf(t.p.char, 'quellhain')).toBe(CFG.living.rep.quest.main + 2 * CFG.living.rep.quest.repeat);
    expect(repOf(t.p.char, 'grubenleute')).toBe(0);
  });
  it('Ränge: Schwellen, Aufstiegsmeldung, Titel ab Rang 4', () => {
    const R = CFG.living.rep.ranks;
    expect([0, R[1] - 1, R[1], R[2], R[3], R[4], 1e6].map(rankOf)).toEqual([1, 1, 2, 3, 4, 5, 5]);
    const t = sim.join('Rangi', 'krieger', 10);
    World.dev(sim.game, t.p, 'rep', ['grubenleute', String(R[2])]);
    expect(rankOf(repOf(t.p.char, 'grubenleute'))).toBe(3);
    expect(toasted(t, 'Rang „' + RANK_NAMES[2])).toBe(true);
    expect(titleOf(t.p.char)).toBeUndefined();
    t.send({ t: 'title', id: 'grubenleute' });               // noch nicht verdient
    expect(t.p.char.title).toBeFalsy();
    World.dev(sim.game, t.p, 'rep', ['grubenleute', String(R[3])]);
    expect(titleOf(t.p.char)).toBe(FACTIONS.grubenleute.title); // erster Titel wird automatisch getragen
    expect(sim.game.playerInfo(t.p).title).toBe(FACTIONS.grubenleute.title);
    t.send({ t: 'title', id: '' });
    expect(titleOf(t.p.char)).toBeUndefined();
    t.send({ t: 'title', id: 'lichter' });
    expect(titleOf(t.p.char)).toBeUndefined();
  });
  it('Freischaltung: ein Angebot über dem eigenen Rang wird abgelehnt; mit Rang gibt es Ware, Rezeptrolle und Nachlass', () => {
    const t = sim.join('Kunde', 'krieger', 10);
    const f = FACTIONS.quellhain;
    sim.gotoNpc(t, f.npc);
    t.p.char.gold = 5000;
    const stock = () => factionStock(t.p.char, f);
    const scroll = stock().findIndex(e => e.offer.item === scrollOf('f_master_1'));
    expect(stock()[scroll].offer.rank).toBe(3);
    expect(stock()[scroll].locked).toBe(true);
    t.send({ t: 'fbuy', npc: f.npc, idx: scroll });
    expect(t.count(scrollOf('f_master_1'))).toBe(0);
    expect(t.p.char.gold).toBe(5000);
    expect(toasted(t, 'erst ab Rang')).toBe(true);
    // Rang 3: dieselbe Nachricht geht durch – zum Preis mit Nachlass
    t.p.char.rep = { quellhain: CFG.living.rep.ranks[2] };
    const price = stock()[scroll].price;
    expect(price).toBe(Math.floor(stock()[scroll].offer.price * (1 - CFG.living.rep.discount[2])));
    t.send({ t: 'fbuy', npc: f.npc, idx: scroll });
    expect(t.count(scrollOf('f_master_1'))).toBe(1);
    expect(t.p.char.gold).toBe(5000 - price);
    // die Rolle ist eine echte Rezeptrolle aus 0.3
    t.send({ t: 'use', uid: t.p.char.inv.find(i => i.base === scrollOf('f_master_1'))!.uid });
    expect(t.p.char.recipes).toContain('f_master_1');
    // Rang 5 bleibt gesperrt; weit weg vom Ansprechpartner geht gar nichts
    const uniq = stock().findIndex(e => e.offer.unique);
    t.send({ t: 'fbuy', npc: f.npc, idx: uniq });
    expect(t.p.char.inv.some(i => i.name === 'Brunnenmünze')).toBe(false);
    const gold = t.p.char.gold;
    t.p.x += 400;
    t.send({ t: 'fbuy', npc: f.npc, idx: 0 });
    expect(t.p.char.gold).toBe(gold);
    // Nachlass gilt auch bei den gewöhnlichen Händlern der Region – und nur dort
    sim.gotoNpc(t, 'sella');
    const potion = makeStack('potion_hp1');
    expect(shopPrice(t.p.char, 'gruenwald', potion)).toBe(Math.floor(ITEMS.potion_hp1.price * (1 - CFG.living.rep.discount[2])));
    expect(shopPrice(t.p.char, 'kristall', potion)).toBe(ITEMS.potion_hp1.price);
    const before = t.p.char.gold;
    t.send({ t: 'buy', npc: 'sella', idx: 0, qty: 2 });
    expect(before - t.p.char.gold).toBe(2 * shopPrice(t.p.char, 'gruenwald', potion));
    // das Schmuckstück gibt es einmal
    t.p.char.rep = { quellhain: CFG.living.rep.ranks[4] }; t.p.char.gold = 5000;
    sim.gotoNpc(t, f.npc);
    t.send({ t: 'fbuy', npc: f.npc, idx: uniq });
    t.send({ t: 'fbuy', npc: f.npc, idx: uniq });
    expect(t.p.char.inv.filter(i => i.name === 'Brunnenmünze').length).toBe(1);
    expect(toasted(t, 'nur einmal')).toBe(true);
  });
  it('Spenden: Rohstoffe der Region bringen Ruf, anderes wird abgelehnt', () => {
    const t = sim.join('Spenda', 'krieger', 10);
    const f = FACTIONS.quellhain;
    sim.gotoNpc(t, f.npc);
    t.give('mm_chitin', 6); t.give('mat_frost', 3);
    t.send({ t: 'donate', npc: f.npc, item: 'mm_chitin', n: 5 });
    expect(t.count('mm_chitin')).toBe(1);
    expect(repOf(t.p.char, f.id)).toBe(5 * CFG.living.rep.donate.monster);
    t.send({ t: 'donate', npc: f.npc, item: 'mat_frost', n: 3 });
    expect(t.count('mat_frost')).toBe(3);
    t.send({ t: 'donate', npc: f.npc, item: 'mm_chitin', n: 99 });   // mehr als vorhanden: nur was da ist
    expect(t.count('mm_chitin')).toBe(0);
    expect(repOf(t.p.char, f.id)).toBe(6 * CFG.living.rep.donate.monster);
  });
  it('alter Spielstand: Ruf wird einmalig aus abgeschlossenen Quests nachgetragen', () => {
    const old: any = newCharacter('Veteran', 'magier');
    old.level = 20;
    old.quests = { m_erwachen: { s: 'done', p: [], n: 1 }, s_tobi: { s: 'done', p: [], n: 1 }, r_gruenwald: { s: 'done', p: [], n: 30 }, m_hedda: { s: 'done', p: [], n: 1 }, r_kristall: { s: 'active', p: [0], n: 2 }, s_pelz: { s: 'active', p: [0] } };
    expect('rep' in old).toBe(false);
    const Q = CFG.living.rep.quest;
    const want = { quellhain: Q.main + Q.side + Q.repeat * CFG.living.rep.backfillRepeats, grubenleute: Q.main + Q.repeat * 2 };
    expect(backfillRep(old, QUESTS)).toEqual(want);
    expect(sanitizeChar(JSON.parse(JSON.stringify(old)))!.rep).toEqual(want);
    // über die Datenbank: laden, speichern, erneut laden – der Nachtrag passiert genau einmal
    const t = sim.join('Veteran', 'magier', 1);
    const id = sim.db.listChars(t.s.account!.id)[0].id;
    sim.leave(t);
    sim.db.saveChar(id, old);
    sim.reenter(t);
    expect(t.p.char.rep).toEqual(want);
    sim.leave(t); sim.reenter(t);
    expect(t.p.char.rep).toEqual(want);
    expect(rankOf(repOf(t.p.char, 'quellhain'))).toBe(2);
    // unsinnige Werte werden bereinigt
    expect(sanitizeChar({ ...JSON.parse(JSON.stringify(old)), rep: { quellhain: 'viel', lichter: 300, gibtsnicht: 5 }, title: 'gibtsnicht' })).toMatchObject({ rep: { lichter: 300 } });
  });
});

// =====================================================================================================================
describe('Weltereignisse', () => {
  it('Mana-Woge: Ansage, drei Wellen, persönliche Belohnung für jeden Beteiligten genau einmal, Aufräumen', () => {
    const { t, z, x, y } = hero('Wogena', 'gruenwald');
    const u = sim.join('Wogenb', 'magier', 12); u.p.x = x + 10; u.p.y = y; u.p.god = true;
    const v = sim.join('Wogenc', 'krieger', 12); v.p.x = x - 10; v.p.y = y; v.p.god = true;   // in t's Gruppe, tut nichts
    const far = sim.join('Wogend', 'krieger', 12); far.p.x = x + 900; far.p.y = y + 900;      // weit weg, tut nichts
    sim.party(t, v);
    const gold = [t, u, v, far].map(q => q.p.char.gold);
    const ev = World.startEvent(z, 'woge', { x: x + 50, y })!;
    expect(ev).toBeTruthy();
    expect(wobjs(z, 'mana_surge').length).toBe(1);
    expect(t.msgs.some(m => m.t === 'chat' && m.ch === 'sys' && m.s.includes('Mana-Woge'))).toBe(true);
    sim.step(0.6);
    expect(world(t).ev.find(e => e.id === ev.id)).toMatchObject({ kind: 'woge', zone: 'gruenwald', name: 'Mana-Woge' });
    for (let wave = 1; wave <= 3; wave++) {
      sim.step(0.6);
      expect(ev.st.wave, 'Welle').toBe(wave);
      expect(ev.mobs.size).toBeGreaterThan(0);
      if (wave === 3) expect([...ev.mobs].some(m => m.def.id === 'ev_wogenbrecher')).toBe(true);
      const mobs = [...ev.mobs];
      z.hitMob(mobs[0], u.p, 1, 'phys');                      // u hilft ein wenig
      kill(z, t, mobs);
      sim.step(3.5);
    }
    expect(zs(z).event).toBeNull();
    expect(wobjs(z).length).toBe(0);
    expect([...z.mobs.values()].filter(m => m.summoned).length).toBe(0);
    expect(tiersOf(ev).get(t.p)).toBe(3);
    expect(tiersOf(ev).get(v.p)).toBe(3);                     // Gruppenmitglied in der Nähe erbt die Stufe
    const gained = [t, u, v, far].map((q, i) => q.p.char.gold - gold[i]);
    expect(gained[0]).toBeGreaterThan(0); expect(gained[1]).toBeGreaterThan(0); expect(gained[2]).toBe(gained[0]); expect(gained[3]).toBe(0);
    expect(gained[1]).toBeLessThanOrEqual(gained[0]);
    for (const q of [t, u, v]) { expect(repOf(q.p.char, 'quellhain')).toBeGreaterThan(0); expect(toasted(q, 'Mana-Woge abgeschlossen')).toBe(true); expect(q.count('ess_water')).toBeGreaterThan(0); }
    expect(repOf(far.p.char, 'quellhain')).toBe(0);
    // kein zweites Mal
    const after = t.p.char.gold;
    finishEvent(ev, 'win');
    expect(t.p.char.gold).toBe(after);
    expect(zs(z).nextEventAt).toBeGreaterThan(sim.game.now + CFG.living.events.gap[0] - 1);
    sim.clear();
  });
  it('Mana-Woge: kommt niemand, verebbt sie von selbst und hinterlässt nichts', () => {
    const { t, z, x, y } = hero('Wogene', 'ruinen', 24);
    const ev = World.startEvent(z, 'woge', { x: x + 700, y: y })!;
    sim.step(CFG.living.events.arriveSec + 2);
    expect(ev.result).toBe('fail');
    expect(zs(z).event).toBeNull();
    expect(wobjs(z).length).toBe(0);
    expect(repOf(t.p.char, 'gesellschaft')).toBe(0);
    sim.clear();
  });
  it('Sternenregen: nur nachts; jeder sammelt dieselben Splitter für sich; am Ende Bonus und Aufräumen', () => {
    const { t, z, x, y } = hero('Sterna', 'gruenwald');
    const u = sim.join('Sternb', 'magier', 12); u.p.x = x; u.p.y = y + 12; u.p.god = true;
    setTod(sim, 0.5);
    expect(isNight(sim.game.tod())).toBe(false);
    expect(startEvent(z, 'sterne', { x, y })).toBeNull();                      // tagsüber fällt nichts
    zs(z).nextEventAt = 0;
    for (let i = 0; i < 40; i++) { scheduleEvents(z, sim.game.now); if (zs(z).event) { expect(zs(z).event!.def.kind).not.toBe('sterne'); finishEvent(zs(z).event!, 'fail', true); zs(z).nextEventAt = 0; } }
    setTod(sim, 0.95);
    const ev = startEvent(z, 'sterne', { x, y })!;
    expect(ev).toBeTruthy();
    let got = 0;
    for (let i = 0; i < 60 && got < CFG.living.events.stars.bonusAt; i++) {
      sim.step(2);
      for (const o of wobjs(z, 'star_shard')) {
        if (o.looted!.has(t.p.charId)) continue;
        const before = t.count(STAR);
        interact(t, o);
        expect(t.count(STAR)).toBeGreaterThan(before);
        interact(t, o);                                                        // zweimal aufheben geht nicht
        expect(t.count(STAR)).toBe(t.count(STAR));
        const mine = t.count(STAR);
        interact(t, o);
        expect(t.count(STAR)).toBe(mine);
        if (got === 0) { interact(u, o); expect(u.count(STAR)).toBeGreaterThan(0); expect(z.objStateFor(o, u.p)).toBe(1); }  // derselbe Splitter, eigener Fund
        expect(z.objStateFor(o, t.p)).toBe(1);
        got++;
      }
    }
    expect(got).toBeGreaterThanOrEqual(CFG.living.events.stars.bonusAt);
    sim.step(0.3);
    expect(world(t).ev.find(e => e.id === ev.id)!.prog).toEqual([CFG.living.events.stars.bonusAt, CFG.living.events.stars.bonusAt]);
    const stars = t.count(STAR), gold = t.p.char.gold;
    sim.step(CFG.living.events.stars.durSec + 3);
    expect(zs(z).event).toBeNull();
    expect(wobjs(z).length).toBe(0);
    expect(t.count(STAR)).toBeGreaterThan(stars);                              // Bonus für fleißige Sammler
    expect(t.p.char.gold).toBeGreaterThan(gold);
    expect(toasted(u, 'Sternenregen abgeschlossen')).toBe(true);
    setTod(sim, 0.4);
    sim.clear();
  });
  it('Fahrende Händlerin: wechselnde Ware, begrenzte Menge, Nachlass nach Ruf, Abschiedsgeschenk, zieht weiter', () => {
    const { t, z, x, y } = hero('Kaufa', 'frost', 18);
    t.p.char.gold = 20000;
    const ev = World.startEvent(z, 'haendler', { x: x + 30, y })!;
    const npc = [...z.objs.values()].find(o => o.type === 'npc' && o.tag === 'vesna')!;
    expect(npc).toBeTruthy();
    World.sendTo(t.p);
    const offers = world(t).trader!;
    expect(offers.length).toBeGreaterThanOrEqual(5);
    expect(offers.some(o => o.item.base === STAR) && offers.some(o => o.item.base === mapOf('frost'))).toBe(true);
    for (const o of offers) expect(o.price, o.item.base).toBeGreaterThan(Math.floor((ITEMS[o.item.base].price || 1) * CFG.loot.sellFactor)); // kein Gewinn durch Weiterverkauf
    const i = offers.findIndex(o => o.item.base === STAR), max = offers[i].left;
    t.p.x = npc.x + 300; t.p.y = npc.y;
    t.send({ t: 'wbuy', idx: i, qty: 1 });                                     // zu weit weg
    expect(t.count(STAR)).toBe(0);
    t.p.x = npc.x; t.p.y = npc.y + 16;
    t.send({ t: 'wbuy', idx: i, qty: 99 });                                    // mehr als vorrätig: nur der Rest
    expect(t.count(STAR)).toBe(max);
    expect(t.p.char.gold).toBe(20000 - max * offers[i].price);
    expect(world(t).trader![i].left).toBe(0);
    t.send({ t: 'wbuy', idx: i, qty: 1 });
    expect(t.count(STAR)).toBe(max);
    expect(repOf(t.p.char, 'wintersassen')).toBe(CFG.living.rep.trader);
    // mit Ruf wird es billiger
    const j = offers.findIndex(o => o.item.base === mapOf('frost'));
    t.p.char.rep = { wintersassen: CFG.living.rep.ranks[3] };
    World.sendTo(t.p);
    expect(world(t).trader![j].price).toBe(Math.floor(ev.st.offers[j].price * (1 - CFG.living.rep.discount[3])));
    sim.step(CFG.living.events.trader.durSec + 2);
    expect(zs(z).event).toBeNull();
    expect([...z.objs.values()].some(o => o.tag === 'vesna' || o.props?.frame === 'cart')).toBe(false);
    expect(t.count('food_bread')).toBe(2);
    expect(world(t).trader).toBeUndefined();
    sim.clear();
  });
  it('Stolleneinsturz (Kristallhöhlen): Geröll räumen befreit drei Kumpel', () => {
    const { t, z, x, y } = hero('Kumpela', 'kristall', 9);
    const ev = World.startEvent(z, 'einsturz', { x: x + 20, y })!;
    const piles = wobjs(z, 'rubble');
    expect(piles.length).toBe(3);
    const gold = t.p.char.gold;
    for (const o of piles) for (let k = 0; k < 40 && z.objs.has(o.id); k++) { interact(t, o); sim.step(0.7); kill(z, t, ev.mobs); }
    expect(ev.result).toBe('win');
    expect(zs(z).event).toBeNull();
    expect(wobjs(z).length).toBe(0);
    expect([...z.objs.values()].some(o => o.tag === 'kumpel')).toBe(false);    // die Geretteten gehen mit dem Ereignis
    expect(t.p.char.gold).toBeGreaterThan(gold);
    expect(repOf(t.p.char, 'grubenleute')).toBeGreaterThan(0);
    expect(t.count('mat_crystal')).toBeGreaterThan(0);
    sim.clear();
  });
  it('Aschesturm (Glutlande): das Wetter schlägt um, Aschenteufel vertreiben beendet ihn', () => {
    const { t, z, x, y } = hero('Ascha', 'glut', 14);
    const ev = World.startEvent(z, 'aschesturm', { x: x + 30, y })!;
    expect(z.weather).toBe('ash');
    expect(t.msgs.some(m => m.t === 'env' && m.weather === 'ash')).toBe(true);
    sim.step(0.6);
    expect(ev.st.need).toBe(8);
    for (let k = 0; k < 60 && !ev.result; k++) { sim.step(1); kill(z, t, ev.mobs); }
    expect(ev.result).toBe('win');
    expect(ev.st.kills).toBe(8);
    expect(zs(z).event).toBeNull();
    expect(wobjs(z).length).toBe(0);
    expect(repOf(t.p.char, 'aschennomaden')).toBeGreaterThan(0);
    expect(z.weatherUntil).toBeLessThanOrEqual(sim.game.now);                  // das Wetter darf sich wieder ändern
    sim.clear();
  });
  it('Schneesturmjagd (Frostgebirge): drei Fährten führen zum Weißen Leitwolf', () => {
    const { t, z, x, y } = hero('Jagda', 'frost', 19);
    const ev = World.startEvent(z, 'jagd', { x: x + 20, y })!;
    expect(z.weather).toBe('blizzard');
    for (let step = 1; step <= 3; step++) {
      const track = ev.st.track as Obj;
      expect(track).toBeTruthy();
      interact(t, track);
      expect(ev.st.step).toBe(step);
      expect(z.objs.has(track.id)).toBe(false);
    }
    const leader = ev.st.leader as Mob;
    expect(leader?.def.id).toBe('ev_sturmwolf');
    kill(z, t, [...ev.mobs].filter(m => m !== leader));
    expect(ev.result).toBeNull();
    kill(z, t, [leader]);
    expect(ev.result).toBe('win');
    expect(zs(z).event).toBeNull();
    expect(wobjs(z).length).toBe(0);
    expect([...z.mobs.values()].filter(m => m.summoned).length).toBe(0);
    expect(repOf(t.p.char, 'wintersassen')).toBeGreaterThan(0);
    sim.clear();
  });
  it('Zeitplan: beginnt von selbst, fern von allen Spielern; läuft nichts mehr, wenn die Zone leer ist', () => {
    const s = new Sim();
    try {
      const t = s.join('Planer', 'krieger', 10);
      s.step(1.5);
      const z = t.p.zone, st = World.state.zone(z);
      expect(st.nextEventAt).toBeGreaterThanOrEqual(CFG.living.events.firstDelay[0]);     // nicht sofort
      expect(st.event).toBeNull();
      st.nextEventAt = s.game.now;
      s.step(1.5);
      const ev = st.event!;
      expect(ev).toBeTruthy();
      expect(Math.hypot(ev.x - t.p.x, ev.y - t.p.y)).toBeGreaterThanOrEqual(CFG.living.events.minPlayerDist);
      // verlässt der letzte Spieler die Zone, räumt der Spieltakt das Ereignis nach kurzer Frist auf
      s.travel(t, 'kristall');
      s.step(CFG.living.events.abandonSec + 3);
      expect(st.event).toBeNull();
      expect([...z.objs.values()].some(o => o.type === 'wobj' || o.tag === 'vesna')).toBe(false);
    } finally { s.close(); }
  });
});

// =====================================================================================================================
describe('Weltboss', () => {
  it('wird überall angesagt, wächst mit den Teilnehmern, lässt sich nicht festsetzen und belohnt alle Beteiligten', () => {
    const { t, z, x, y } = hero('Bossa', 'gruenwald', 12);
    const u = sim.join('Bossb', 'magier', 12); u.p.god = true; u.p.x = x + 900; u.p.y = y + 900;
    const fern = sim.join('Bossc', 'krieger', 30); sim.travel(fern, 'ruinen');
    const ev = World.startBoss(sim.game, 'moosgrimm', 'gruenwald', { x: x + 60, y })!;
    expect(ev).toBeTruthy();
    expect(World.startBoss(sim.game, 'moosgrimm', 'gruenwald')).toBeNull();    // es gibt ihn nur einmal
    const m = ev.bossMob!;
    expect(m.def.id).toBe('wb_moosgrimm');
    expect(m.lvl).toBe(ZONES.gruenwald.level[1] + 2);
    expect(fern.msgs.some(q => q.t === 'chat' && q.ch === 'sys' && q.s.includes('Moosgrimm') && q.s.includes('Grünwald'))).toBe(true);
    const base = m.maxHp;
    sim.step(1.2);
    expect(world(fern).ev.some(e => e.boss && e.zone === 'gruenwald')).toBe(true);     // steht für alle auf der Weltkarte
    z.hitMob(m, t.p, 10, 'phys');
    sim.step(0.6);
    expect(m.maxHp).toBe(base);                                                // allein: Grundwert
    expect(t.p.pev.concat(z.events).length).toBeGreaterThanOrEqual(0);
    // ein zweiter Spieler kommt dazu → mehr Leben, anteilig auch das aktuelle
    const frac = m.hp / m.maxHp;
    u.p.x = x + 20; u.p.y = y + 20;
    z.hitMob(m, u.p, 10, 'phys');
    sim.step(0.6);
    expect(m.maxHp).toBe(Math.round(base * (1 + CFG.living.boss.hpPerPlayer)));
    expect(m.hp / m.maxHp).toBeCloseTo(frac, 2);
    // festsetzen geht nicht
    z.applyStatusMob(m, { id: 'stun', dur: 5 }, 10, 'light', t.p);
    z.applyStatusMob(m, { id: 'freeze', dur: 5 }, 10, 'water', t.p);
    expect(m.has('stun', sim.game.now) || m.has('freeze', sim.game.now)).toBe(false);
    // er greift mit seinem Muster an (angekündigte Flächen, Geschosse oder Helfer)
    const fxBefore = z.fx.size + z.projs.size + ev.mobs.size;
    sim.step(12);
    expect(ev.st.step).toBeGreaterThanOrEqual(2);
    expect(z.fx.size + z.projs.size + ev.mobs.size + fxBefore).toBeGreaterThan(0);
    // Sieg
    const gold = [t, u].map(q => q.p.char.gold);
    sim.seed(z, 7);
    kill(z, t, [m]);
    expect(zs(z).boss).toBeNull();
    expect(z.mobs.has(m.id)).toBe(false);
    expect([...ev.mobs].length).toBe(0);
    for (const [i, q] of [t, u].entries()) {
      expect(q.p.char.gold, 'Gold').toBeGreaterThan(gold[i]);
      expect(q.p.char.flags['wb:moosgrimm']).toBe(1);
      expect(q.count(trophyOf('moosgrimm'))).toBe(1);
      expect(q.count('ess_earth')).toBeGreaterThan(0);
      expect(repOf(q.p.char, 'quellhain')).toBeGreaterThan(0);
      expect(q.p.char.inv.some(it => ITEMS[it.base].kind !== 'material' && ITEMS[it.base].kind !== 'consumable' && it.rarity >= 2), 'gute Ausrüstung').toBe(true);
    }
    expect(fern.msgs.some(q => q.t === 'chat' && q.s.includes('wieder Landschaft'))).toBe(true);
    sim.step(1.2);
    expect(world(fern).ev.some(e => e.boss)).toBe(false);
    // lange Pause bis zum nächsten Auftritt
    const G = World.state.game(sim.game);
    expect(G.bossNext.moosgrimm - (G.base + sim.game.now)).toBeGreaterThanOrEqual(CFG.living.boss.respawn[0] - 1);
    sim.clear();
  });
  it('zieht unbehelligt nach einer Weile weiter – auch wenn seine Zone leer ist', () => {
    const { t, z, x, y } = hero('Bossd', 'schatten', 30);
    const ev = World.startBoss(sim.game, 'niemand', 'schatten', { x: x + 80, y })!;
    sim.travel(t, 'ruinen');
    sim.step(5);
    expect(zs(z).boss).toBe(ev);
    ev.until = sim.game.now + 1;
    sim.step(3);
    expect(zs(z).boss).toBeNull();
    expect(z.mobs.has(ev.bossMob!.id)).toBe(false);
    expect(t.msgs.some(q => q.t === 'chat' && q.s.includes('weitermarschiert'))).toBe(true);
    sim.clear();
  });
});

// =====================================================================================================================
describe('Seltene Monster', () => {
  it('Bedingungen: Nacht, Wetter und Jahreszeit', () => {
    const by = (id: string) => RARE_LIST.find(r => r.id === id)!;
    expect(rareAllowed(by('fliegenhut'), 0.5, 'clear', 0)).toBe(false);
    expect(rareAllowed(by('fliegenhut'), 0.95, 'clear', 0)).toBe(true);
    expect(rareAllowed(by('meister_russ'), 0.5, 'clear', 0)).toBe(false);
    expect(rareAllowed(by('meister_russ'), 0.5, 'ash', 0)).toBe(true);
    expect(rareAllowed(by('guenther'), 0.5, 'motes', 3)).toBe(false);
    expect(rareAllowed(by('guenther'), 0.5, 'motes', 1)).toBe(true);
    expect(rareAllowed(by('borkenkoenig'), 0.5, 'rain', 3)).toBe(true);
  });
  it('erscheint nur unter seinen Bedingungen und nicht vor den Augen der Spieler; Hinweis erst in der Nähe', () => {
    const { t, z } = hero('Selta', 'gruenwald', 10);
    setTod(sim, 0.5);
    expect(spawnRare(z, 'fliegenhut')).toBeNull();                             // tagsüber nicht
    setTod(sim, 0.95);
    const def = RARE_LIST.find(r => r.id === 'fliegenhut')!;
    // steht an jedem möglichen Ort ein Spieler, erscheint es nicht
    const poi = (id: string) => ZONES.gruenwald.pois!.find(p => p.id === id)!;
    const others = def.spots.slice(1).map(([p, dx, dy], i) => { const o = sim.join('Selt' + 'bcd'[i], 'krieger', 10); o.p.x = (poi(p).x + dx) * 16; o.p.y = (poi(p).y + dy) * 16; return o; });
    t.p.x = (poi(def.spots[0][0]).x + def.spots[0][1]) * 16; t.p.y = (poi(def.spots[0][0]).y + def.spots[0][2]) * 16;
    expect(spawnRare(z, 'fliegenhut')).toBeNull();
    t.p.x += 600;
    const m = spawnRare(z, 'fliegenhut')!;
    expect(m).toBeTruthy();
    expect(m.def.named).toBe(true);
    expect(m.name).toBe('Der Alte Fliegenhut');
    expect(spawnRare(z, 'fliegenhut')).toBeNull();                             // es gibt nur einen
    expect(toasted(t, def.hint)).toBe(false);
    for (const o of others) sim.leave(o);
    t.p.x = m.x + 200; t.p.y = m.y;
    sim.step(1.3);
    expect(toasted(t, def.hint)).toBe(true);
    expect(t.msgs.some(q => q.t === 'chat' && q.s.includes('Fliegenhut'))).toBe(false);   // keine Ansage
    setTod(sim, 0.4);
    sim.clear();
  });
  it('Beute: sichere Rohstoffe, Trophäe beim ersten Sieg, Ruf; die Trophäe wandert in die Sammlung', () => {
    const { t, z } = hero('Beutea', 'kristall', 12);
    const m = World.spawnRare(z, 'tante_echo')!;
    expect(m).toBeTruthy();
    t.p.x = m.x + 20; t.p.y = m.y;
    // Besonderheit: unter 40 % rasend
    const dmg = m.baseDmg;
    z.hitMob(m, t.p, 1, 'phys');
    m.hp = Math.round(m.maxHp * 0.3);
    sim.step(0.6);
    expect(m.baseDmg).toBeCloseTo(dmg * 1.5, 3);
    kill(z, t, [m]);
    expect(t.count(trophyOf('tante_echo'))).toBe(1);
    expect(t.count('mm_glimmer')).toBeGreaterThanOrEqual(CFG.living.rare.mats[0]);
    expect(t.count('ess_wind')).toBeGreaterThanOrEqual(CFG.living.rare.essences[0]);
    expect(t.p.char.flags['rk:tante_echo']).toBe(1);
    expect(repOf(t.p.char, 'grubenleute')).toBe(CFG.living.rep.rare);
    const st = zs(z).rares!.get('tante_echo')!;
    expect(st.mob).toBeNull();
    expect(st.nextAt).toBeGreaterThanOrEqual(sim.game.now + CFG.living.rare.respawn[0] - 1);
    // Trophäe benutzen → Sammlung
    const uid = t.p.char.inv.find(i => i.base === trophyOf('tante_echo'))!.uid;
    t.send({ t: 'use', uid });
    expect(t.p.char.flags['tr:tante_echo']).toBe(1);
    expect(t.count(trophyOf('tante_echo'))).toBe(0);
    t.give(trophyOf('tante_echo'));
    t.send({ t: 'use', uid: t.p.char.inv.find(i => i.base === trophyOf('tante_echo'))!.uid });
    expect(t.count(trophyOf('tante_echo'))).toBe(1);                           // die zweite bleibt (zum Verkaufen)
    // zerfällt beim Tod: Günther
    const g = World.spawnRare(z, 'guenther')!;
    z.hitMob(g, t.p, 1, 'phys');
    const before = z.mobs.size;
    kill(z, t, [g]);
    expect(z.mobs.size).toBe(before - 1 + 3);
    sim.clear();
  });
});

// =====================================================================================================================
describe('Schatzkarten', () => {
  it('lesen markiert eine feste Stelle; graben nur dort, nur mit Karte, nur in der richtigen Region', () => {
    const { t, z } = hero('Schatza', 'gruenwald', 8);
    const map = z.map;
    expect(activeTreasure(t.p.char, map)).toBeNull();
    t.send({ t: 'dig' });
    expect(toasted(t, 'keine Schatzkarte dieser Gegend')).toBe(true);
    t.give(mapOf('gruenwald'), 2);
    const use = () => t.send({ t: 'use', uid: t.p.char.inv.find(i => i.base === mapOf('gruenwald'))!.uid });
    use();
    const spot = activeTreasure(t.p.char, map)!;
    expect(spot).toBeTruthy();
    expect(treasureSpots(map)).toContainEqual(spot);
    expect(t.count(mapOf('gruenwald'))).toBe(2);                               // die Karte bleibt, bis der Schatz gehoben ist
    expect(toasted(t, 'Schatzkarte (Grünwald)')).toBe(true);
    use();                                                                     // zweite Karte derselben Gegend: erst die erste
    expect(activeTreasure(t.p.char, map)).toEqual(spot);
    const snap = () => JSON.stringify([t.p.char.gold, t.p.char.inv.length, t.p.char.flags]);
    // falsche Stelle
    let s0 = snap();
    t.p.x = spot.x + 200; t.p.y = spot.y;
    t.send({ t: 'dig' });
    expect(snap()).toBe(s0);
    expect(toasted(t, 'Hier ist nichts')).toBe(true);
    // richtige Stelle, aber in einer anderen Region
    sim.travel(t, 'kristall');
    t.p.x = spot.x; t.p.y = spot.y;
    s0 = snap();
    t.send({ t: 'dig' });
    expect(snap()).toBe(s0);
    sim.travel(t, 'gruenwald');
    // richtige Stelle ohne Karte im Rucksack
    t.p.x = spot.x + 6; t.p.y = spot.y - 4;
    t.p.removeItems(mapOf('gruenwald'), 2);
    s0 = snap();
    t.send({ t: 'dig' });
    expect(snap()).toBe(s0);
    expect(toasted(t, 'Ohne die Karte')).toBe(true);
    // mit Karte: Schatz
    t.give(mapOf('gruenwald'), 2);
    const gold = t.p.char.gold;
    t.send({ t: 'dig' });
    expect(t.p.char.gold).toBeGreaterThan(gold + CFG.enemy.gold(5) * CFG.living.treasure.gold[0] - 1);
    expect(t.count(mapOf('gruenwald'))).toBe(1);
    expect(t.p.char.flags['tm:gruenwald']).toBe(1);
    expect(activeTreasure(t.p.char, map)).toBeNull();
    expect(t.p.char.inv.some(it => it.rarity >= 2)).toBe(true);
    expect(t.count(STAR)).toBeGreaterThan(0);
    expect(repOf(t.p.char, 'quellhain')).toBe(CFG.living.rep.treasure);
    t.send({ t: 'dig' });                                                      // dieselbe Stelle noch einmal: nichts
    expect(t.p.char.flags['tm:gruenwald']).toBe(1);
    sim.clear();
  });
});

// =====================================================================================================================
describe('Begegnungen am Weg', () => {
  const dlg = (t: Tester) => (t.msgs.filter(m => m.t === 'encdlg').at(-1) as Extract<ServerMsg, { t: 'encdlg' }> | undefined)?.d ?? null;
  it('Hinterhalt: alle besiegen → kleine Belohnung und Ruf', () => {
    const { t, z } = hero('Wega', 'ruinen', 24);
    const gold = t.p.char.gold;
    const e = World.startEncounter(t.p, 'hinterhalt')!;
    expect(e.mobs.size).toBe(3);
    kill(z, t, e.mobs);
    sim.step(0.4);
    expect(zs(z).encounters.size).toBe(0);
    expect(t.p.char.gold).toBeGreaterThan(gold);
    expect(repOf(t.p.char, 'gesellschaft')).toBe(CFG.living.rep.encounter);
    sim.clear();
  });
  it('Verirrter Reisender: mit einem Heiltrank oder mit Geleit bis zur Weggabelung', () => {
    const { t, z, x, y } = hero('Wegb', 'gruenwald', 8);
    t.p.char.inv = t.p.char.inv.filter(i => !i.base.startsWith('potion_hp'));
    let e = World.startEncounter(t.p, 'reisender', { x: x + 30, y })!;
    const npc = e.objs[0];
    expect(npc.type).toBe('npc'); expect(npc.tag).toBe('reisender');
    interact(t, npc);
    expect(dlg(t)).toMatchObject({ id: e.id, who: 'Odo Kleinschritt' });
    expect(dlg(t)!.opts[1].off).toBeTruthy();                                  // kein Trank dabei
    t.send({ t: 'enc', id: e.id, opt: 1 });
    expect(zs(z).encounters.has(e)).toBe(true);                                // abgelehnt, nichts passiert
    t.send({ t: 'enc', id: e.id, opt: 7 });
    t.give('potion_hp1', 2);
    interact(t, npc);
    expect(dlg(t)!.opts[1].off).toBeUndefined();
    t.p.x = npc.x + 300;                                                       // zu weit weg zum Reden
    t.send({ t: 'enc', id: e.id, opt: 1 });
    expect(t.count('potion_hp1')).toBe(2);
    t.p.x = npc.x; t.p.y = npc.y + 10;
    t.send({ t: 'enc', id: e.id, opt: 1 });
    expect(t.count('potion_hp1')).toBe(1);
    expect(zs(z).encounters.size).toBe(0);
    expect(z.objs.has(npc.id)).toBe(false);
    expect(repOf(t.p.char, 'quellhain')).toBe(CFG.living.rep.encounter);
    // Geleit
    e = World.startEncounter(t.p, 'reisender', { x: t.p.x + 20, y: t.p.y })!;
    const odo = e.objs[0];
    interact(t, odo);
    t.send({ t: 'enc', id: e.id, opt: 0 });
    expect(e.stage).toBe('escort');
    const { tx, ty } = e.st;
    expect(e.objs.some(o => o.props?.frame === 'signpost')).toBe(true);
    for (let k = 0; k < 200 && !e.done; k++) {
      const d = Math.hypot(tx - t.p.x, ty - t.p.y);
      if (d > 12) { t.p.x += ((tx - t.p.x) / d) * Math.min(d, 30); t.p.y += ((ty - t.p.y) / d) * Math.min(d, 30); }
      sim.step(0.5);
      kill(z, t, e.mobs);
      expect(Math.hypot(odo.x - t.p.x, odo.y - t.p.y)).toBeLessThan(260);                            // er bleibt dran, auch quer durchs Gelände
    }
    expect(e.done).toBe(true);
    expect(repOf(t.p.char, 'quellhain')).toBeGreaterThan(CFG.living.rep.encounter * 2);
    expect(zs(z).encounters.size).toBe(0);
    expect([...z.objs.values()].some(o => o.tag === 'reisender' || o.props?.frame === 'signpost')).toBe(false);
    sim.clear();
  });
  it('Verletztes Tier: verbinden oder Wache halten', () => {
    const { t, z, x, y } = hero('Wegc', 'frost', 18);
    let e = World.startEncounter(t.p, 'tier', { x: x + 30, y })!;
    expect(e.objs[0].props!.frame).toBe('pet_schneeeule');
    interact(t, e.objs[0]);
    expect(dlg(t)!.opts[0].off).toBeTruthy();
    t.send({ t: 'enc', id: e.id, opt: 0 });                                    // ohne Quellkraut
    expect(e.done).toBe(false);
    t.give('mat_herb', 1);
    interact(t, e.objs[0]);
    t.send({ t: 'enc', id: e.id, opt: 0 });
    expect(e.done).toBe(true);
    expect(t.count('mat_herb')).toBe(0);
    expect(t.count('ing_lichen')).toBeGreaterThanOrEqual(2);
    const rep = repOf(t.p.char, 'wintersassen');
    expect(rep).toBeGreaterThan(0);
    e = World.startEncounter(t.p, 'tier', { x: t.p.x + 30, y: t.p.y })!;
    interact(t, e.objs[0]);
    t.send({ t: 'enc', id: e.id, opt: 1 });
    expect(e.stage).toBe('guard');
    expect(e.mobs.size).toBe(2);
    kill(z, t, e.mobs);
    sim.step(7);
    expect(e.done).toBe(true);
    expect(repOf(t.p.char, 'wintersassen')).toBeGreaterThan(rep);
    sim.clear();
  });
  it('Herausforderer: Zweikampf, bis er sich ergibt; ablehnen kostet nichts', () => {
    const { t, z, x, y } = hero('Wegd', 'glut', 14);
    let e = World.startEncounter(t.p, 'duell', { x: x + 40, y })!;
    const knight = e.st.knight as Mob;
    expect(knight.invuln).toBe(true);
    z.hitMob(knight, t.p, 1e6, 'phys');
    expect(knight.hp).toBe(knight.maxHp);                                      // vor dem Duell unangreifbar
    interact(t, e.objs[0]);
    expect(dlg(t)!.who).toContain('Kunibert');
    t.send({ t: 'enc', id: e.id, opt: 1 });
    expect(e.stage).toBe('left');
    sim.step(31);
    expect(zs(z).encounters.size).toBe(0);
    expect(z.mobs.has(knight.id)).toBe(false);
    e = World.startEncounter(t.p, 'duell', { x: t.p.x + 40, y: t.p.y })!;
    const k2 = e.st.knight as Mob;
    interact(t, e.objs[0]);
    t.send({ t: 'enc', id: e.id, opt: 0 });
    expect(e.stage).toBe('fight');
    expect(k2.invuln).toBe(false);
    expect(k2.target).toBe(t.p);
    const gold = t.p.char.gold;
    k2.hp = Math.round(k2.maxHp * 0.25);
    z.hitMob(k2, t.p, 1, 'phys');
    k2.hp = Math.round(k2.maxHp * 0.15);
    sim.step(0.4);
    expect(e.done).toBe(true);
    expect(t.p.char.gold).toBeGreaterThan(gold);
    expect(repOf(t.p.char, 'aschennomaden')).toBeGreaterThan(CFG.living.rep.encounter);
    expect(z.mobs.has(k2.id)).toBe(false);
    sim.clear();
  });
  it('entstehen von selbst nur beim Laufen auf Wegen – nicht durch Teleport, nicht im Lager', () => {
    const s = new Sim();
    try {
      const t = s.join('Wanderer', 'krieger', 5);
      const z = t.p.zone, m = z.map, st = World.state.zone(z);
      s.seed(z, 3);
      // ein langes Stück Weg außerhalb des Dorfs suchen
      const cells: { x: number; y: number }[] = [];
      for (let ty = 2; ty < m.h - 2; ty++) for (let tx = 2; tx < m.w - 2; tx++) {
        const tile = m.tiles[ty * m.w + tx];
        if (tile === 3 && !m.solid[ty * m.w + tx] && !m.safe.some(sf => Math.hypot(tx * 16 - sf.x, ty * 16 - sf.y) < sf.r + 60)) cells.push({ x: tx * 16 + 8, y: ty * 16 + 8 });
      }
      expect(cells.length).toBeGreaterThan(40);
      t.p.god = true;
      // Teleportieren zählt nicht
      for (let k = 0; k < 30; k++) { const c = cells[(k * 37) % cells.length]; t.p.x = c.x; t.p.y = c.y; s.step(1); }
      expect(st.encounters.size).toBe(0);
      // Laufen schon: Schritt für Schritt über benachbarte Wegzellen
      (World.state as any).zone(z);
      let cur = cells[0];
      for (let k = 0; k < 1500 && !st.encounters.size; k++) {
        const next = cells.filter(c => c !== cur && Math.hypot(c.x - cur.x, c.y - cur.y) <= 70).sort((a, b) => ((a.x * 7 + a.y * 13 + k * 31) % 97) - ((b.x * 7 + b.y * 13 + k * 31) % 97))[0] ?? cells[(k * 11) % cells.length];
        if (Math.hypot(next.x - cur.x, next.y - cur.y) > 200) { cur = next; t.p.x = cur.x; t.p.y = cur.y; s.step(1); continue; }
        cur = next; t.p.x = cur.x; t.p.y = cur.y;
        s.step(1);
      }
      expect(st.encounters.size).toBe(1);
      expect([...st.encounters][0].owner).toBe(t.p);
    } finally { s.close(); }
  });
});

// =====================================================================================================================
describe('Tagesabläufe', () => {
  it('NPCs stehen je nach Uhrzeit woanders, gehen sichtbar dorthin – und bleiben ansprechbar, auch wenn sie schlafen', () => {
    const t = sim.join('Tagdieb', 'krieger', 5);
    const z = t.p.zone;
    setTod(sim, 0.4);
    sim.step(1);
    const obj = (tag: string) => [...z.objs.values()].find(o => o.type === 'npc' && o.tag === tag && !o.props?.when)!;
    const home = Object.fromEntries(['sella', 'borin', 'tobi', 'mirelda'].map(n => [n, { x: obj(n).x, y: obj(n).y }]));
    for (const n in home) { const src = z.map.objects.find(o => o.type === 'npc' && o.tag === n)!; expect(home[n]).toEqual({ x: src.x, y: src.y }); }   // vormittags am Stammplatz
    // 12:15 Uhr: Tobi löst Edda ab – er läuft los, in kurzen Etappen
    const from = t.msgs.length;
    setTod(sim, 12.25 / 24);
    sim.step(0.6);
    const moves = t.msgs.slice(from).flatMap(m => (m.t === 's' ? m.ev ?? [] : [])).filter(e => e.k === 'omv' && e.id === obj('tobi').id) as Extract<GameEvent, { k: 'omv' }>[];
    expect(moves.length).toBeGreaterThan(0);
    expect(moves[0].t).toBeGreaterThan(0);
    expect(Math.hypot(obj('tobi').x - home.tobi.x, obj('tobi').y - home.tobi.y)).toBeLessThanOrEqual(CFG.living.routine.segment + 1);
    sim.step(20);                                                                                             // ein Spieltag dauert zwölf Minuten – eine Stunde ist eine halbe Minute
    const tobi = routineOfNpc(z, 'tobi')!;
    expect(tobi.path).toBeNull();
    expect({ x: obj('tobi').x, y: obj('tobi').y }).toEqual(tobi.stops[tobi.cur]);
    expect(Math.hypot(obj('tobi').x - obj('wache').x, obj('tobi').y - obj('wache').y)).toBeLessThan(60);     // bei Edda
    expect(obj('sella')).toMatchObject(home.sella);                                                           // Sella verkauft weiter
    // 21:40 Uhr: Sella ist nach Hause gegangen und schläft – handeln kann man trotzdem, dort wo sie jetzt ist
    setTod(sim, 21.2 / 24);
    sim.step(25);
    expect(Math.hypot(obj('sella').x - home.sella.x, obj('sella').y - home.sella.y)).toBeGreaterThan(80);
    expect(routineState('gruenwald', 'sella', sim.game.tod())).toMatchObject({ sleep: true });
    expect(routineState('gruenwald', 'sella', sim.game.tod()).line).toContain('Nachtzuschlag');
    expect(routineState('gruenwald', 'borin', sim.game.tod()).sleep).toBe(false);                             // sitzt noch auf der Bank
    t.p.char.gold = 500;
    const potions = t.count('potion_hp1');
    t.p.x = home.sella.x; t.p.y = home.sella.y + 18;
    t.send({ t: 'buy', npc: 'sella', idx: 0, qty: 1 });
    expect(t.count('potion_hp1')).toBe(potions);                                                                    // am leeren Stand kauft man nichts
    sim.gotoNpc(t, 'sella');
    t.send({ t: 'buy', npc: 'sella', idx: 0, qty: 1 });
    expect(t.count('potion_hp1')).toBe(potions + 1);
    t.p.char.quests.s_pilze = { s: 'active', p: [0] };
    t.send({ t: 'talk', npc: 'sella' });
    expect(sim.game.nearNpc(t.p, 'sella')).toBe(true);
    // Zone verlassen, Zeit vergeht, wiederkommen: alle stehen sofort richtig (kein Nachlaufen)
    sim.travel(t, 'kristall');
    const frozen = { x: obj('sella').x, y: obj('sella').y };
    setTod(sim, 0.4);
    sim.step(30);
    expect({ x: obj('sella').x, y: obj('sella').y }).toEqual(frozen);                                         // leere Zone: nichts bewegt sich
    sim.travel(t, 'gruenwald');
    const init = (t.msgs.filter(m => m.t === 'zone').at(-1) as Extract<ServerMsg, { t: 'zone' }>).init;
    expect(init.objs.find(o => o.id === obj('sella').id)).toMatchObject(home.sella);
    for (const n in home) expect({ x: obj(n).x, y: obj(n).y }).toEqual(home[n]);
    sim.clear();
  });
  it('Story-NPCs mit Bedingung bleiben, wo die Geschichte sie hinstellt', () => {
    const t = sim.join('Storyfest', 'krieger', 5);
    const z = t.p.zone;
    const story = [...z.objs.values()].filter(o => o.type === 'npc' && o.props?.when);
    expect(story.length).toBeGreaterThan(0);
    const pos = story.map(o => [o.x, o.y]);
    setTod(sim, 0.95); sim.step(60); setTod(sim, 0.55); sim.step(60);
    expect(story.map(o => [o.x, o.y])).toEqual(pos);
    setTod(sim, 0.4); sim.step(1);
    sim.clear();
  });
});

// =====================================================================================================================
describe('Jahreszeiten', () => {
  it('vier Jahreszeiten laufen auf der Serveruhr um, werden angesagt und überdauern einen Neustart', () => {
    const s = new Sim();
    try {
      World.setAuto(s.game, false);
      const t = s.join('Kalender', 'krieger', 5);
      const L = CFG.living.season.lengthSec;
      expect(SEASON_NAMES.length).toBe(4);
      expect([0, L - 1, L, 2 * L, 3 * L, 4 * L, 4 * L + 5].map(x => seasonAt(x).season)).toEqual([0, 0, 1, 2, 3, 0, 0]);
      s.step(1.2);
      expect(World.season(s.game)).toBe(0);
      expect(world(t).season).toBe(0);
      // kurz vor dem Wechsel: die Uhr vorstellen statt zwanzig Minuten zu warten
      World.state.game(s.game).base += L - 3;
      s.step(5);
      expect(World.season(s.game)).toBe(1);
      expect(world(t).season).toBe(1);
      expect(t.msgs.some(m => m.t === 'chat' && m.ch === 'sys' && m.s.includes('Sommer'))).toBe(true);
      World.setSeason(s.game, 3);
      s.step(1.2);
      expect(World.season(s.game)).toBe(3);
      expect(world(t).sp).toBeLessThan(0.05);
      // Neustart: neues Spiel auf derselben Datenbank
      const G = World.state.game(s.game);
      G.bossNext.moosgrimm = 123456;
      s.game.saveAll();
      const g2 = new Game(s.db, { name: 'sim2', version: CFG.version, port: 0, addresses: [], tailscale: { available: false } });
      (g2 as any).tick(1.1);
      expect(World.season(g2)).toBe(3);
      expect(World.state.game(g2).base).toBeGreaterThanOrEqual(3 * L);
      expect(World.state.game(g2).bossNext.moosgrimm).toBe(123456);
    } finally { s.close(); }
  });
  it('Wirkung: Wetter, Abbaustellen und seltene Monster hängen an der Jahreszeit', () => {
    const w = (zone: string, season: number) => Object.fromEntries(seasonWeathers(ZONES[zone], season));
    expect(w('gruenwald', 3).snow).toBeGreaterThan(0);                         // Schnee im Grünwald nur im Winter
    expect(w('gruenwald', 1).snow).toBeUndefined();
    expect(w('gruenwald', 0).rain).toBeGreaterThan(w('gruenwald', 1).rain);
    expect(w('gruenwald', 2).leaves).toBeGreaterThan(w('gruenwald', 1).leaves);
    expect(w('frost', 3).blizzard).toBeGreaterThan(w('frost', 1).blizzard);
    expect(seasonWeathers(ZONES.kristall, 3)).toEqual(ZONES.kristall.weathers);    // unter Tage gibt es kein Wetter
    expect(seasonWeathers(ZONES.wurzelgruft, 3)).toEqual(ZONES.wurzelgruft.weathers);
    // Zone würfelt ihr Wetter aus der Tabelle der Jahreszeit
    const { t, z } = hero('Wettera', 'gruenwald', 5);
    World.setSeason(sim.game, 3);
    let snow = 0;
    for (let i = 0; i < 60; i++) { z.weatherUntil = 0; sim.step(0.1); if (z.weather === 'snow') snow++; }
    expect(snow).toBeGreaterThan(5);
    // Abbaustellen: im Sommer deutlich mehr Zutaten als im Winter, im Winter dafür Wasseressenz
    const node = [...z.objs.values()].find(o => o.type === 'node')!;
    const harvest = (season: number, n: number) => {
      World.setSeason(sim.game, season);
      t.p.char.inv = [];
      sim.seed(z, 99);
      t.p.x = node.x; t.p.y = node.y + 8;
      for (let i = 0; i < n; i++) { node.harvested!.clear(); z.interact(t.p, node.id); }   // direkt: der Server nimmt höchstens 240 Nachrichten je Sekunde an
      return { berry: t.count('ing_berry'), herb: t.count('mat_herb'), water: t.count('ess_water'), lichen: t.count('ing_lichen'), cap: t.count('ing_cavecap') };
    };
    const summer = harvest(1, 300), winter = harvest(3, 300), autumn = harvest(2, 300);
    expect(summer.berry).toBeGreaterThan(winter.berry * 2.5);
    expect(SEASON_NODES[1].ingredient).toBeGreaterThan(SEASON_NODES[3].ingredient);
    expect(winter.water).toBeGreaterThan(10); expect(summer.water).toBe(0);
    expect(winter.lichen).toBeGreaterThan(20); expect(summer.lichen).toBe(0);
    expect(autumn.cap).toBeGreaterThan(30); expect(summer.cap).toBe(0);
    // Ereignisse: im Sommer gibt es keine Schneesturmjagd, Sternenregen nur nachts und im Winter häufiger
    const pool = (season: number, night: boolean) => Object.fromEntries(eventPool('frost', season, night));
    expect(pool(1, true).jagd).toBeUndefined();
    expect(pool(3, true).jagd).toBeGreaterThan(pool(2, true).jagd);
    expect(pool(3, false).sterne).toBeUndefined();
    expect(pool(3, true).sterne).toBeGreaterThan(pool(0, true).sterne);
    // seltene Monster: der Hohlprinz zeigt sich nur in Herbst und Winter
    sim.travel(t, 'schatten');
    World.setSeason(sim.game, 1);
    expect(spawnRare(t.p.zone, 'hohlprinz')).toBeNull();
    World.setSeason(sim.game, 2);
    t.p.x = t.p.zone.map.start.x; t.p.y = t.p.zone.map.start.y;
    expect(spawnRare(t.p.zone, 'hohlprinz')).toBeTruthy();
    World.setSeason(sim.game, 0);
    sim.step(1.2);
    sim.clear();
  });
});

// =====================================================================================================================
describe('Leere Zonen kosten nichts', () => {
  it('ohne Spieler: keine Ereignisse, keine Monster, keine Wege – Dungeons werden ganz übersprungen', () => {
    const s = new Sim();
    try {
      const t = s.join('Einsam', 'krieger', 30);
      s.step(2);
      expect(s.game.zones.has('frost')).toBe(false);                           // nie betretene Zonen existieren gar nicht
      const gw = t.p.zone, st = World.state.zone(gw);
      expect(st.routines!.length).toBeGreaterThan(0);
      expect(st.rares!.size).toBe(2);
      s.travel(t, 'ruinen');
      // Grünwald ist jetzt leer: alles fällige wird fällig gestellt – und trotzdem passiert nichts
      st.nextEventAt = 0;
      for (const r of st.rares!.values()) r.nextAt = 0;
      const last = st.lastTick, objs = gw.objs.size, mobs = gw.mobs.size;
      const npcs = [...gw.objs.values()].filter(o => o.type === 'npc').map(o => [o.x, o.y]);
      (s.game as any).todOffset += 0.5;                                         // es wird Nacht
      let updates = 0;
      const orig = gw.update.bind(gw);
      gw.update = (dt: number) => { updates++; orig(dt); };
      s.step(120);
      expect(updates).toBe(0);
      expect(st.lastTick).toBe(last);
      expect(st.event).toBeNull();
      expect([...st.rares!.values()].every(r => r.mob === null)).toBe(true);
      expect(gw.objs.size).toBe(objs); expect(gw.mobs.size).toBe(mobs);
      expect([...gw.objs.values()].filter(o => o.type === 'npc').map(o => [o.x, o.y])).toEqual(npcs);
      // im Dungeon gibt es keinen Weltzustand
      s.travel(t, 'archiv');
      s.step(3);
      const dz = World.state.zone(t.p.zone);
      expect(dz.routines).toBeNull(); expect(dz.rares).toBeNull(); expect(dz.event).toBeNull(); expect(dz.nextEventAt).toBe(-1);
      // der Spieltakt selbst prüft nur Weltbosse und laufende Ereignisse
      expect(World.state.game(s.game).events.size).toBe(0);
    } finally { s.close(); }
  });
});

// =====================================================================================================================
describe('Über das Netz (echter Serverprozess)', () => {
  const PORT = 8200 + Math.floor(Math.random() * 150), URL = `ws://127.0.0.1:${PORT}/ws`;
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'em-welt-'));
  let proc: ChildProcess;
  async function startServer() {
    proc = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', '--import', 'tsx', 'server/src/index.ts'], { env: { ...process.env, EM_PORT: String(PORT), EM_DATA: dataDir, EM_DEV: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    proc.stdout!.on('data', d => (out += d)); proc.stderr!.on('data', d => (out += d));
    for (let i = 0; i < 100; i++) { if (out.includes('läuft')) return; await new Promise(r => setTimeout(r, 100)); }
    throw new Error('Server startet nicht:\n' + out);
  }
  async function stopServer() { proc.kill('SIGINT'); await new Promise(r => proc.once('exit', r)); }
  beforeAll(startServer, 30000);
  afterAll(async () => { await stopServer(); fs.rmSync(dataDir, { recursive: true, force: true }); });
  const lastWorld = (b: Bot) => (b.msgs.filter(m => m.t === 'world').at(-1) as Extract<ServerMsg, { t: 'world' }> | undefined)?.w;
  const until = async (ok: () => boolean, ms = 6000) => { const t0 = Date.now(); while (!ok() && Date.now() - t0 < ms) await new Promise(r => setTimeout(r, 50)); return ok(); };

  it('Weltzustand, Ereignis, Händlerin und wandernde NPCs kommen beim Client an; die Jahreszeit übersteht den Neustart', async () => {
    const b = new Bot(URL, 'Netzwelt');
    await b.connect();
    await b.createAndEnter('krieger');
    expect(await until(() => !!lastWorld(b))).toBe(true);                      // Weltzustand gleich beim Betreten
    expect(lastWorld(b)).toMatchObject({ season: 0, ev: [] });
    await b.dev('/welt aus'); await b.dev('/god'); await b.dev('/gold 5000');
    await b.dev('/season 2');
    expect(await until(() => lastWorld(b)?.season === 2)).toBe(true);
    expect(b.msgs.some(m => m.t === 'chat' && m.ch === 'sys' && m.s.includes('Herbst'))).toBe(true);
    // Ereignis: Ansage, Weltzustand, Objekt in der Welt
    await b.dev('/event woge', 400);
    expect(await until(() => lastWorld(b)?.ev.some(e => e.kind === 'woge' && e.zone === 'gruenwald') === true)).toBe(true);
    expect(await until(() => !!b.obj('wobj'))).toBe(true);
    expect(b.obj('wobj')!.props).toMatchObject({ frame: 'mana_surge', mark: 'event' });
    // Händlerin löst die Woge ab (ein Ereignis je Zone): das Wogen-Objekt verschwindet, die Händlerin steht da und verkauft
    await b.dev('/event haendler', 400);
    expect(await until(() => !!b.obj('npc', 'vesna') && !!lastWorld(b)?.trader)).toBe(true);
    expect([...b.objs.values()].some(o => o.props?.frame === 'mana_surge')).toBe(false);
    const offers = lastWorld(b)!.trader!, i = offers.findIndex(o => o.item.base === STAR);
    await b.gotoNpc('vesna');
    const purse = b.char.gold;
    b.send({ t: 'wbuy', idx: i, qty: 1 });
    expect(await until(() => b.char.inv.some(it => it.base === STAR))).toBe(true);
    expect(b.char.gold).toBe(purse - offers[i].price);
    expect(await until(() => lastWorld(b)!.trader![i].left === offers[i].left - 1)).toBe(true);
    // Abend: NPCs gehen los (Ereignis `omv`), der Bot folgt ihnen und kann weiter handeln
    const sella = b.obj('npc', 'sella')!, home = { x: sella.x, y: sella.y };
    await b.dev('/time 0.9', 300);
    expect(await until(() => b.events.some(e => e.k === 'omv' && e.id === sella.id), 4000)).toBe(true);
    await until(() => Math.hypot(sella.x - home.x, sella.y - home.y) > 90, 12000);
    expect(Math.hypot(sella.x - home.x, sella.y - home.y)).toBeGreaterThan(90);
    await b.gotoNpc('sella');
    const gold = b.char.gold;
    b.send({ t: 'buy', npc: 'sella', idx: 0, qty: 1 });
    expect(await until(() => b.char.gold < gold)).toBe(true);
    b.close();
    // Neustart: Herbst bleibt Herbst
    await stopServer();
    await startServer();
    const c = new Bot(URL, 'Netzwelt', b.token);
    await c.connect();
    const e = c.waitFor('entered');
    c.send({ t: 'enter', id: c.chars[0].id });
    await e;
    expect(await until(() => !!lastWorld(c))).toBe(true);
    expect(lastWorld(c)!.season).toBe(2);
    expect(c.char.inv.some(it => it.base === STAR)).toBe(true);
    c.close();
  }, 60000);
});
void Rng;
