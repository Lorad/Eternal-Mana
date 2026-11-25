/**
 * Quellwarte (0.9): Karte, Erreichbarkeit, gemeinsame Instanz, jede Einrichtung samt Ablehnung am falschen Ort,
 * Händler (Wechsel je Tag/Woche, Käufe), Meisterränge, Lagerhaus, Gerüchte, Trophäenhalle, alte Spielstände –
 * gegen ein echtes `Game` ohne Netzwerk (tests/helpers/sim.ts).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Db, sanitizeChar } from '../server/src/db';
import { Hub, gateSpot, hubClock } from '../server/src/hub';
import { Home } from '../server/src/home';
import { World } from '../server/src/world';
import { CFG } from '../shared/src/config';
import { stashSlots } from '../shared/src/data/collection';
import { emptyHome } from '../shared/src/data/home';
import { hallData, hallRecords } from '../shared/src/data/hall';
import { HUB_SPOTS, HUB_ZONE } from '../shared/src/data/hub';
import { HUB_FRAME_FALLBACK, HUB_LOOK_FALLBACK } from '../shared/src/data/hubart';
import { DAY_MS, FACILITIES, FACILITY_ORDER, effRank, hubPeriod, masterable, masteryBlock, masteryCost, sanitizeHubChar, traderStock } from '../shared/src/data/hubdata';
import { generateGear, makeStack } from '../shared/src/data/items';
import { NPCS } from '../shared/src/data/npcs';
import { QUESTS } from '../shared/src/data/quests';
import { HUB_MAIN_QUEST, HUB_NEW_FLAG, HUB_OLD_FLAG, QUESTS_HUB } from '../shared/src/data/quests_hub';
import { RUMOURS, boardRumours, rumourDone, rumourTarget } from '../shared/src/data/rumours';
import { SKILLS, SKILL_LIST } from '../shared/src/data/skills';
import { TOPICS } from '../shared/src/data/dialoge';
import { ZONES, ZONE_LIST } from '../shared/src/data/zones';
import { HUB_HOUSES, HUB_KEEPER, HUB_OBJECTS, HUB_WALKERS, HUB_LAYOUT } from '../shared/src/maps/hubgen';
import { getMap, validateMap } from '../shared/src/maps/mapgen';
import { T, TILE } from '../shared/src/maps/tiles';
import { newCharacter } from '../shared/src/stats';
import type { CharData, ClientMsg, ServerMsg } from '../shared/src/types';
import { Rng } from '../shared/src/util/rng';
import { Sim, type Tester } from './helpers/sim';

let sim: Sim;
beforeAll(() => { sim = new Sim(); World.setAuto(sim.game, false); });
afterAll(() => sim.close());

let n = 0;
const fresh = (cls: CharData['cls'] = 'krieger', level = 10) => sim.join('Warte' + String.fromCharCode(65 + (n % 26)) + String.fromCharCode(65 + Math.floor(n++ / 26)), cls, level);
type HubMsg = Omit<Extract<ClientMsg, { t: 'hub' }>, 't'>;
const hub = (t: Tester, m: HubMsg) => t.send({ t: 'hub', ...m });
const last = <K extends ServerMsg['t']>(t: Tester, k: K) => t.msgs.filter(m => m.t === k).at(-1) as Extract<ServerMsg, { t: K }> | undefined;
const toHub = (t: Tester) => { Hub.travel(sim.game, t.p, true); expect(t.p.zone.id).toBe(HUB_ZONE); };
/** Stellt den Spieler vor einen NPC der Quellwarte */
const at = (t: Tester, npc: string) => sim.gotoNpc(t, npc);
/** … oder irgendwohin, wo keine Einrichtung ist (Mitte des Portalplatzes) */
const away = (t: Tester) => { t.p.x = HUB_SPOTS.portal[0] * TILE + 8; t.p.y = HUB_SPOTS.portal[1] * TILE + 8; };
const tick = () => sim.step(0.1);

describe('Karte und Daten', () => {
  it('die Karte ist gültig, die feste Mitte des Portalplatzes ist frei, Häuser und Einrichtungen stehen', () => {
    const m = getMap(HUB_ZONE);
    expect(validateMap(m)).toEqual([]);
    expect(ZONES[HUB_ZONE].kind).toBe('hub');
    expect(ZONE_LIST.some(z => z.id === HUB_ZONE)).toBe(false);
    expect(m.spawns.length).toBe(0);
    expect(getMap(HUB_ZONE)).toBe(m);
    // Mitte des Portalplatzes: im Umkreis von 5 Kacheln frei und begehbar
    const [px, py] = HUB_SPOTS.portal;
    for (let y = py - 5; y <= py + 5; y++) for (let x = px - 5; x <= px + 5; x++) if (Math.hypot(x - px, y - py) <= 5) {
      expect(m.solid[y * m.w + x], `${x},${y}`).toBe(0);
      expect(m.objects.some(o => Math.floor(o.x / TILE) === x && Math.floor(o.y / TILE) === y), `Objekt auf ${x},${y}`).toBe(false);
    }
    for (const s of ['ankunft', 'rueckkehr'] as const) { const [x, y] = HUB_SPOTS[s]; expect(m.solid[y * m.w + x], s).toBe(0); }
    expect(Math.floor(m.start.x / TILE)).toBe(HUB_SPOTS.ankunft[0]);
    expect(Math.floor(m.start.y / TILE)).toBe(HUB_SPOTS.ankunft[1]);
    // jede Einrichtung hat ihr Haus und ihren Hüter vor der Tür; jedes Objekt steht
    for (const f of FACILITY_ORDER) if (f !== 'portal') {
      const npc = FACILITIES[f].npc!;
      expect(HUB_KEEPER[f as Exclude<typeof f, 'portal'>]).toBe(npc);
      expect(NPCS[npc], npc).toBeTruthy();
      expect(m.objects.filter(o => o.type === 'npc' && o.tag === npc).length, npc).toBe(1);
      expect(HUB_HOUSES.some(h => h.fac === f)).toBe(true);
    }
    for (const o of HUB_OBJECTS) expect(m.objects.some(x => x.type === 'qobj' && x.tag === o.tag), o.tag).toBe(true);
    expect(m.objects.filter(o => o.type === 'stone').length).toBe(1);
    for (const [id] of HUB_WALKERS) expect(m.objects.some(o => o.type === 'npc' && o.tag === id && o.props?.walker), id).toBe(true);
    // Straßen gibt es, Gärten auch
    expect([...m.tiles].filter(t => t === T.PATH).length).toBeGreaterThan(300);
    expect([...m.tiles].filter(t => t === T.GROUND2).length).toBeGreaterThan(100);
  });
  it('der Rückfall der Grafik nennt nur vorhandene Namen', () => {
    for (const k in HUB_FRAME_FALLBACK) expect(k.startsWith('hub_')).toBe(true);
    for (const look in HUB_LOOK_FALLBACK) expect(Object.values(NPCS).some(n => n.look === look), look).toBe(true);
  });
  it('Quests und Gespräche der Quellwarte verweisen auf Vorhandenes', () => {
    expect(QUESTS_HUB.filter(q => q.type === 'side').length).toBeGreaterThanOrEqual(4);
    for (const q of QUESTS_HUB) { expect(QUESTS[q.id]).toBe(q); expect(NPCS[q.giver], q.id).toBeTruthy(); }
    for (const npc of ['hanne', 'alrik', 'merle', 'lotte', 'rudger']) expect(TOPICS.filter(t => t.npc === npc).length, npc).toBeGreaterThan(0);
  });
  it('jedes Gerücht zeigt auf etwas, das es gibt; das Brett wechselt je Tag und nimmt Erledigtes ab', () => {
    for (const r of RUMOURS) expect(rumourTarget(r), r.id).toBe(true);
    expect(new Set(RUMOURS.map(r => r.id)).size).toBe(RUMOURS.length);
    for (const k of ['secret', 'rare', 'wboss', 'event', 'quest'] as const) expect(RUMOURS.some(r => r.kind === k), k).toBe(true);
    const c = newCharacter('Brett', 'magier'); c.level = 30;
    const a = boardRumours(c, 100).map(r => r.id), b = boardRumours(c, 100).map(r => r.id), d = boardRumours(c, 101).map(r => r.id);
    expect(a.length).toBe(5); expect(a).toEqual(b); expect(a).not.toEqual(d);
    const low = newCharacter('Brett', 'magier');
    expect(boardRumours(low, 100).every(r => r.level <= 3)).toBe(true);
    const r = RUMOURS.find(x => x.kind === 'rare')!;
    expect(rumourDone(c, r)).toBe(false); c.flags[`rk:${r.ref}`] = 1; expect(rumourDone(c, r)).toBe(true);
    for (let day = 0; day < 20; day++) expect(boardRumours(c, day).some(x => x.id === r.id)).toBe(false);
    const s = RUMOURS.find(x => x.kind === 'secret' && x.ref === 'hain1')!;
    c.flags['s:gruenwald:shard0'] = 1; expect(rumourDone(c, s)).toBe(true);
  });
});

describe('Erreichbarkeit und eine Instanz für alle', () => {
  it('über jeden Quellstein (ohne ihn je berührt zu haben) und zurück', () => {
    const t = fresh();
    const stone = [...t.p.zone.objs.values()].find(o => o.type === 'stone')!;
    t.p.x = stone.x; t.p.y = stone.y + 18;
    t.send({ t: 'teleport', zone: HUB_ZONE });
    expect(t.p.zone.id).toBe(HUB_ZONE);
    expect(Math.floor(t.p.y / TILE)).toBe(HUB_SPOTS.ankunft[1]);
    // fern vom Stein: abgelehnt
    sim.travel(t, 'gruenwald'); t.p.x = stone.x + 400;
    t.send({ t: 'teleport', zone: HUB_ZONE });
    expect(t.p.zone.id).toBe('gruenwald');
    // zurück über den Stein der Warte
    toHub(t);
    const hs = [...t.p.zone.objs.values()].find(o => o.type === 'stone')!;
    t.send({ t: 'interact', id: hs.id });
    expect(t.p.char.flags[`t:${HUB_ZONE}`]).toBe(1);
    t.p.char.flags['t:gruenwald'] = 1;
    t.send({ t: 'teleport', zone: 'gruenwald' });
    expect(t.p.zone.id).toBe('gruenwald');
  });
  it('das Tor in Quellhain führt hin, das Tor der Warte zurück', () => {
    const t = fresh();
    const g = [...t.p.zone.objs.values()].find(o => o.type === 'qobj' && o.tag === 'qw_tor')!;
    expect(g).toBeTruthy();
    const s = gateSpot()!, m = getMap('gruenwald');
    expect(m.solid[Math.floor(s.y / TILE) * m.w + Math.floor(s.x / TILE)]).toBe(0);
    t.p.x = g.x + 100; t.send({ t: 'interact', id: g.id }); expect(t.p.zone.id).toBe('gruenwald'); // zu weit weg
    t.p.x = g.x; t.p.y = g.y + 14; t.send({ t: 'interact', id: g.id });
    expect(t.p.zone.id).toBe(HUB_ZONE);
    const back = [...t.p.zone.objs.values()].find(o => o.type === 'qobj' && o.tag === 'tor')!;
    expect(Math.floor(back.x / TILE)).toBe(HUB_LAYOUT.gate[0]);
    t.p.x = back.x; t.p.y = back.y - 18; t.send({ t: 'interact', id: back.id });
    expect(t.p.zone.id).toBe('gruenwald');
    expect(Math.hypot(t.p.x - g.x, t.p.y - g.y)).toBeLessThan(40);
  });
  it('alle – auch aus einem Neuen Kreis – stehen in derselben Instanz, ohne Gegner und ohne Wegfelder', () => {
    const a = fresh(), b = fresh(), c = fresh();
    c.p.char.kreis = 1;
    for (const t of [a, b, c]) toHub(t);
    expect(a.p.zone).toBe(b.p.zone); expect(a.p.zone).toBe(c.p.zone);
    expect(a.p.zone.key).toBe(HUB_ZONE);
    expect(a.p.zone.mobs.size).toBe(0);
    sim.party(a, c); sim.game.rehome(c.p);
    expect(c.p.zone.key).toBe(HUB_ZONE);
    tick();
    expect((a.p.zone as any).flow.size).toBe(0);
    // Spaziergänger gehen ihre Runde
    const w = [...a.p.zone.objs.values()].find(o => o.props?.walker)!, x0 = w.x, y0 = w.y;
    sim.step(14);
    expect(w.x !== x0 || w.y !== y0).toBe(true);
    // Leere Quellwarte wird nicht verworfen
    for (const t of [a, b, c]) sim.travel(t, 'gruenwald');
    sim.step(CFG.world.dungeonResetSec + 2);
    expect(sim.game.zones.has(HUB_ZONE)).toBe(true);
  });
});

describe('Einrichtungen (jede Aktion nur vor Ort)', () => {
  it('Schmiede und Alchemie öffnen die vorhandenen Stationen; Verbessern bei Gunda, Zurücksetzen bei Corvin', () => {
    const t = fresh('krieger', 12); toHub(t);
    t.give('mat_wood', 10); t.give('mm_chitin', 10); t.p.char.gold = 50000;
    const before = t.p.char.inv.length;
    away(t); t.send({ t: 'craft', id: 'f_weapon_1', at: 'gunda' });
    expect(t.p.char.inv.length).toBe(before);
    at(t, 'gunda'); t.send({ t: 'craft', id: 'f_weapon_1', at: 'gunda' });
    expect(t.p.char.inv.length).toBe(before + 1);
    // Verbessern
    const it = generateGear(new Rng(5), 10, 1, 'krieger', 'weapon'); t.p.addItem(it); t.give('mat_crystal', 5); t.give('mat_wood', 5);
    away(t); t.send({ t: 'upgrade', uid: it.uid, npc: 'gunda' }); expect(it.up).toBe(0);
    at(t, 'gunda'); t.send({ t: 'upgrade', uid: it.uid, npc: 'gunda' }); expect(it.up).toBe(1);
    // Alchemie
    t.give('mat_herb', 10); t.give('ing_berry', 10);
    const pots = t.count('potion_hp1');
    away(t); t.send({ t: 'craft', id: 'a_hp1', at: 'irmela', n: 1 }); expect(t.count('potion_hp1')).toBe(pots);
    // Zurücksetzen
    t.p.char.skillPoints = 0; t.p.char.skills = { kr_wucht: 3 };
    away(t); t.send({ t: 'respec', npc: 'corvin' }); expect(t.p.char.skills.kr_wucht).toBe(3);
    at(t, 'corvin'); t.send({ t: 'respec', npc: 'corvin' }); expect(t.p.char.skills.kr_wucht).toBe(1);
  });
  it('Händler: Angebot nur vor Ort; Tageware und Wochenstück wechseln deterministisch; jedes Stück einmal; Gold und Platz werden geprüft', () => {
    const now = Date.UTC(2026, 10, 25, 12);
    hubClock.now = () => now;
    try {
      const per = hubPeriod(now);
      expect(per.day).toBe(Math.floor(now / DAY_MS));
      expect(hubPeriod(now + DAY_MS).day).toBe(per.day + 1);
      // dieselbe Woche: Mittwoch → Sonntag; neue Woche am Montag
      const mon = Date.UTC(2026, 10, 30, 1);
      expect(hubPeriod(Date.UTC(2026, 10, 29, 23)).week).toBe(per.week);
      expect(hubPeriod(mon).week).toBe(per.week + 1);
      expect(JSON.stringify(traderStock('krieger', 10, per.day, per.week))).toBe(JSON.stringify(traderStock('krieger', 10, per.day, per.week)));
      expect(JSON.stringify(traderStock('krieger', 10, per.day + 1, per.week))).not.toBe(JSON.stringify(traderStock('krieger', 10, per.day, per.week)));
      const st = traderStock('krieger', 10, per.day, per.week);
      expect(st.length).toBe(CFG.hub.trader.daily + 1);
      expect(st.at(-1)!.weekly).toBe(1); expect(st.at(-1)!.item.rarity).toBeGreaterThanOrEqual(3);
      expect(st.every(o => o.price > 0 && o.item.ilvl >= 10)).toBe(true);

      const t = fresh('krieger', 10); toHub(t);
      away(t); hub(t, { a: 'stock' }); expect(last(t, 'hub')?.stock).toBeUndefined();
      at(t, 'ottmar'); hub(t, { a: 'stock' });
      const stock = last(t, 'hub')!.stock!;
      expect(stock.day).toBe(per.day); expect(stock.offers.length).toBe(st.length);
      expect(JSON.stringify(stock.offers.map(o => o.item))).toBe(JSON.stringify(st.map(o => o.item)));
      t.p.char.gold = 0;
      const inv0 = t.p.char.inv.length;
      hub(t, { a: 'buy', idx: 0, day: per.day, lvl: 10 }); expect(t.p.char.inv.length).toBe(inv0);
      t.p.char.gold = 1e6;
      hub(t, { a: 'buy', idx: 0, day: per.day - 1, lvl: 10 }); expect(t.p.char.hubShop).toBeUndefined();          // veralteter Tag
      hub(t, { a: 'buy', idx: 0, day: per.day, lvl: 11 }); expect(t.p.char.hubShop).toBeUndefined();              // andere Stufe
      away(t); hub(t, { a: 'buy', idx: 0, day: per.day, lvl: 10 }); expect(t.p.char.hubShop).toBeUndefined();    // nicht beim Händler
      at(t, 'ottmar');
      hub(t, { a: 'buy', idx: 0, day: per.day, lvl: 10 });
      expect(t.p.char.gold).toBe(1e6 - st[0].price);
      const bought = t.p.char.inv.at(-1)!;
      expect(bought.base).toBe(st[0].item.base); expect(bought.uid).not.toBe('hub');
      hub(t, { a: 'buy', idx: 0, day: per.day, lvl: 10 }); expect(t.p.char.gold).toBe(1e6 - st[0].price);   // nur einmal
      expect(last(t, 'hub')!.stock!.offers[0].got).toBe(1);
      const w = st.length - 1;
      hub(t, { a: 'buy', idx: w, day: per.day, lvl: 10 });
      hub(t, { a: 'buy', idx: w, day: per.day, lvl: 10 });
      expect(t.p.char.gold).toBe(1e6 - st[0].price - st[w].price);
      // am nächsten Tag: neue Tagesware, das Wochenstück bleibt gekauft
      hubClock.now = () => now + DAY_MS;
      hub(t, { a: 'stock' });
      const s2 = last(t, 'hub')!.stock!;
      expect(s2.offers[0].got).toBeUndefined(); expect(s2.offers[w].got).toBe(1);
      // volles Inventar
      while (t.p.char.inv.length < CFG.player.invSize) t.p.addItem(generateGear(new Rng(t.p.char.inv.length), 5, 0, 'krieger', 'helm'));
      const g0 = t.p.char.gold;
      hub(t, { a: 'buy', idx: 1, day: s2.day, lvl: 10 }); expect(t.p.char.gold).toBe(g0);
      // gespeichert
      sim.leave(t); sim.reenter(t);
      expect(t.p.char.hubShop?.wgot).toBe(1);
    } finally { hubClock.now = () => Date.now(); }
  });
  it('Meisterränge: nur ausgebaute aktive Fähigkeiten, Stufe, Hauptquest, Kosten, Höchstzahl; wirken nur, solange ausgebaut', () => {
    const t = fresh('krieger', 20); toHub(t);
    const c = t.p.char, sk = SKILLS.kr_wucht;
    expect(masterable(sk)).toBe(true);
    expect(masterable(SKILLS.kr_p_eisen)).toBe(false);
    expect(masterable(SKILLS.ma_blinzeln)).toBe(false);
    c.skills = { kr_wucht: 4 };
    expect(masteryBlock(c, 'kr_wucht')).toMatch(/ganz lernen/);
    c.skills.kr_wucht = 5;
    expect(masteryBlock(c, 'kr_wucht')).toMatch(/Schlackenwurm/);
    c.quests.m_glut = { s: 'done', p: [] };
    expect(masteryBlock(c, 'kr_wucht')).toBe('Nicht genug Gold.');
    const cost = masteryCost(sk, 1);
    c.gold = cost.gold;
    expect(masteryBlock(c, 'kr_wucht')).toBe('Es fehlen Rohstoffe.');
    for (const [b, k] of cost.mats) t.give(b, k);
    expect(masteryBlock(c, 'ma_feuerball')).toMatch(/Klasse/);
    away(t); hub(t, { a: 'master', id: 'kr_wucht' }); expect(c.mastery).toBeUndefined();
    at(t, 'corvin'); hub(t, { a: 'master', id: 'kr_wucht' });
    expect(c.mastery?.kr_wucht).toBe(1); expect(c.gold).toBe(0);
    expect(effRank(c, 'kr_wucht')).toBe(6);
    // Rang 2 braucht Stufe und das Ende von Akt I
    c.gold = 1e6; for (const [b, k] of masteryCost(sk, 2).mats) t.give(b, k);
    expect(masteryBlock(c, 'kr_wucht')).toMatch(/Stufe/);
    c.level = 32; c.quests.m_koenig = { s: 'done', p: [] };
    hub(t, { a: 'master', id: 'kr_wucht' }); expect(c.mastery?.kr_wucht).toBe(2);
    hub(t, { a: 'master', id: 'kr_wucht' }); expect(c.mastery?.kr_wucht).toBe(2);
    expect(masteryBlock(c, 'kr_wucht')).toMatch(/Mehr kann/);
    // Höchstzahl der gemeisterten Techniken
    c.mastery = { kr_wucht: 1, kr_wirbel: 1, kr_sturm: 1 };
    c.skills = { kr_wucht: 5, kr_wirbel: 5, kr_sturm: 5, kr_erdspalter: 5 };
    expect(masteryBlock(c, 'kr_erdspalter')).toMatch(/Höchstens/);
    // ohne Ausbau (z. B. nach dem Zurücksetzen) wirken sie nicht – sie bleiben aber gelernt
    c.skills.kr_wucht = 1;
    expect(effRank(c, 'kr_wucht')).toBe(1);
    c.skills.kr_wucht = 5;
    expect(effRank(c, 'kr_wucht')).toBe(6);
    // beschädigte Werte werden bereinigt
    const d = newCharacter('X', 'krieger'); d.mastery = { kr_wucht: 9, ma_feuerball: 1, kr_p_eisen: 1, gibtsnicht: 2 } as any;
    sanitizeHubChar(d);
    expect(d.mastery).toEqual({ kr_wucht: CFG.hub.mastery.max });
  });
  it('Meisterränge wirken im Kampf', () => {
    const t = fresh('krieger', 30);
    t.p.char.skills = { kr_wucht: 5 }; t.p.char.hotbar = ['kr_wucht', null, null, null]; t.p.recalc();
    const { z, x, y } = sim.arena(t);
    sim.seed(z, 1);
    const m1 = sim.dummy(z, 'moosling', 30, x + 20, y);
    t.p.mp = 999; t.send({ t: 'skill', id: 'kr_wucht', ang: 0, tx: x + 20, ty: y });
    const d1 = 1e7 - m1.hp; z.mobs.delete(m1.id);
    t.p.char.mastery = { kr_wucht: 2 }; t.p.cds.clear();
    sim.seed(z, 1);
    const m2 = sim.dummy(z, 'moosling', 30, x + 20, y);
    t.p.mp = 999; t.send({ t: 'skill', id: 'kr_wucht', ang: 0, tx: x + 20, ty: y });
    const d2 = 1e7 - m2.hp;
    expect(d1).toBeGreaterThan(0);
    expect(d2 / d1).toBeGreaterThan(1.1);
    expect(d2 / d1).toBeLessThan(1.3);
  });
  it('Lagerhaus: dieselbe Profil-Truhe ohne Hof, nur vor Ort; Regale kosten Gold, sind gedeckelt und bleiben gespeichert', () => {
    const t = fresh(); toHub(t);
    const h = Home.of(sim.game, t.p);
    expect(h.owned).toBe(0);
    t.give('mat_wood', 5);
    const wood = t.p.char.inv.find(i => i.base === 'mat_wood')!;
    away(t); t.send({ t: 'home', a: 'put', uid: wood.uid }); expect(t.count('mat_wood')).toBe(5);
    at(t, 'fridolin'); t.send({ t: 'home', a: 'put', uid: wood.uid });
    expect(t.count('mat_wood')).toBe(0); expect(h.stash.some(i => i.base === 'mat_wood')).toBe(true);
    // auch an der Truhe des Lagerhauses
    const chest = [...t.p.zone.objs.values()].find(o => o.type === 'qobj' && o.tag === 'truhe')!;
    t.p.x = chest.x; t.p.y = chest.y + 16;
    t.send({ t: 'home', a: 'take', uid: h.stash.find(i => i.base === 'mat_wood')!.uid });
    expect(t.count('mat_wood')).toBe(5);
    // Regale
    const base = stashSlots(h);
    t.p.char.gold = 0;
    at(t, 'fridolin'); hub(t, { a: 'row' }); expect(h.rows ?? 0).toBe(0);
    t.p.char.gold = 1e7;
    away(t); hub(t, { a: 'row' }); expect(h.rows ?? 0).toBe(0);
    at(t, 'fridolin');
    for (let i = 0; i < CFG.hub.lager.rowsMax + 2; i++) hub(t, { a: 'row' });
    expect(h.rows).toBe(CFG.hub.lager.rowsMax);
    expect(stashSlots(h)).toBe(base + CFG.hub.lager.rowsMax * CFG.hub.lager.row);
    let paid = 0; for (let i = 0; i < CFG.hub.lager.rowsMax; i++) paid += CFG.hub.lager.gold(i);
    expect(t.p.char.gold).toBe(1e7 - paid);
    const db = new Db(sim.dir);
    try { expect(db.loadHome(t.p.accountId).rows).toBe(CFG.hub.lager.rowsMax); } finally { db.db.close(); }
  });
  it('Gruppenbereich: Gesuch nur in der Warte, mit Fähnchen für alle; Einladen über die vorhandene Gruppe', () => {
    const a = fresh(), b = fresh();
    hub(a, { a: 'lfg', goal: 'riss', note: 'Stufe 10+ <b>' });
    expect(Hub.lfgList(sim.game).some(e => e.id === a.p.id)).toBe(false);
    toHub(a); toHub(b);
    hub(a, { a: 'lfg', goal: 'gibtsnicht' }); expect(Hub.lfgList(sim.game).some(e => e.id === a.p.id)).toBe(false);
    hub(a, { a: 'lfg', goal: 'riss', note: 'Stufe 10+ <b>' });
    const e = Hub.lfgList(sim.game).find(x => x.id === a.p.id)!;
    expect(e.goal).toBe('riss'); expect(e.note).toBe('Stufe 10+ b');
    expect(sim.game.playerInfo(a.p).lfg).toBe('riss');
    tick();
    expect(b.msgs.some(m => m.t === 's' && m.ev?.some(v => v.k === 'pl+' && v.p.id === a.p.id && v.p.lfg === 'riss'))).toBe(true);
    // Brett am Gruppenbereich öffnet das Fenster samt Liste
    const board = [...a.p.zone.objs.values()].find(o => o.type === 'qobj' && o.tag === 'gesuche')!;
    b.p.x = board.x; b.p.y = board.y + 16; b.send({ t: 'interact', id: board.id });
    expect(b.msgs.some(m => m.t === 'hub' && m.open === 'gesuche')).toBe(true);
    expect(last(b, 'hub')!.open === 'gesuche' || b.msgs.filter(m => m.t === 'hub').some(m => m.lfg?.some(x => x.id === a.p.id))).toBe(true);
    // Einladung über die Gruppe aus 0.7
    b.send({ t: 'party', a: 'invite', id: a.p.id }); a.send({ t: 'party', a: 'accept' });
    expect(a.p.party).toBe(b.p.party);
    tick();
    expect(Hub.lfgList(sim.game).some(x => x.id === a.p.id)).toBe(false); // nicht mehr Anführer → Gesuch hängt ab
    // Gesuche verfallen und verschwinden mit dem Spieler
    hub(b, { a: 'lfg', goal: 'quests' });
    expect(Hub.lfgList(sim.game).some(x => x.id === b.p.id)).toBe(true);
    sim.step(CFG.hub.lfgSec + 1);
    expect(Hub.lfgList(sim.game).some(x => x.id === b.p.id)).toBe(false);
  });
  it('Bretter, Vitrine und Übersicht öffnen ihr Fenster nur aus der Nähe', () => {
    const t = fresh(); toHub(t);
    for (const tag of ['geruechte', 'vitrine', 'karte', 'truhe']) {
      const o = [...t.p.zone.objs.values()].find(x => x.type === 'qobj' && x.tag === tag)!;
      t.msgs.length = 0;
      t.p.x = o.x + 200; t.send({ t: 'interact', id: o.id });
      expect(t.msgs.some(m => m.t === 'hub' && m.open === tag), tag + ' von fern').toBe(false);
      t.p.x = o.x; t.p.y = o.y + 16; t.send({ t: 'interact', id: o.id });
      expect(t.msgs.some(m => m.t === 'hub' && m.open === tag), tag).toBe(true);
    }
  });
});

describe('Trophäenhalle', () => {
  it('ohne Expeditionen: Statistik, Bosse, Trophäen, Vitrinen', () => {
    const c = newCharacter('Halle', 'paladin');
    c.kills = 1234; c.deaths = 3; c.playtime = 3725; c.earned = 9876;
    c.flags['b:dornenmutter'] = 2; c.flags['rk:borkenkoenig'] = 1; c.flags['wb:moosgrimm'] = 3;
    const ep = generateGear(new Rng(1), 20, 4, 'paladin', 'weapon'), rare = generateGear(new Rng(2), 20, 3, 'paladin', 'helm'), low = generateGear(new Rng(3), 20, 1, 'paladin', 'armor');
    c.inv.push(low, rare); c.equip.weapon = ep;
    const h = emptyHome(); h.stash.push(generateGear(new Rng(4), 25, 3, 'paladin', 'accessory'));
    const d = hallData(c, h);
    expect(d.expeditions).toEqual([]);
    expect(d.bosses.find(b => b.id === 'dornenmutter')!.wins).toBe(2);
    expect(d.stats.find(s => s.label === 'Besiegte Gegner')!.value).toBe('1.234');
    expect(d.stats.find(s => s.label === 'Verdientes Gold')!.value).toBe('9.876');
    expect(d.stats.find(s => s.label === 'Weltbosse')!.value).toMatch(/^3 Siege/);
    expect(d.showcase.map(i => i.uid)).toEqual([ep.uid, h.stash[0].uid, rare.uid]);
    expect(d.trophies.find(t => t.id === 'b_dornenmutter')!.owned).toBe(true);
    expect(hallData(c, null).milestones).toEqual([]);
  });
  it('mit Expeditionen: Abschlüsse und Bestzeiten je Schwierigkeit; kaputte Einträge stören nicht', () => {
    const c = newCharacter('Halle', 'magier');
    c.expeditions = {
      wurzelgruft: { clears: { normal: 3, schwer: 1 }, best: { normal: 1234, schwer: 1900 }, secrets: ['a', 'b'], minis: ['m'], first: 1 },
      kaputt: null as any,
      neu_im_test: { clears: {} },
    };
    const r = hallRecords(c);
    expect(r.length).toBe(2);
    expect(r[0].id).toBe('wurzelgruft'); expect(r[0].name).toBe('Wurzelgruft'); expect(r[0].clears).toBe(4);
    expect(r[0].best.map(b => [b.diff, b.clears, b.sec])).toEqual([['normal', 3, 1234], ['schwer', 1, 1900]]);
    expect(r[0].secrets).toBe(2); expect(r[0].minis).toBe(1);
    expect(hallData(c, emptyHome()).expeditions.length).toBe(2);
  });
  it('verdientes Gold zählt ab jetzt mit', () => {
    const t = fresh(); const g = t.p.char.earned ?? 0;
    t.p.gainGold(150);
    expect(t.p.char.earned).toBe(g + 150);
  });
});

describe('Geschichte und alte Spielstände', () => {
  it('neue Charaktere bekommen den Schritt in die Quellwarte; er führt zu Hanne', () => {
    const t = fresh('magier', 1);
    expect(t.p.char.flags[HUB_NEW_FLAG]).toBe(1);
    expect(t.msgs.some(m => m.t === 'story' && m.id === 'quellwarte')).toBe(false);
    t.p.char.quests.m_erwachen = { s: 'done', p: [], n: 1 };
    sim.gotoNpc(t, 'mirelda');
    t.send({ t: 'qAccept', id: HUB_MAIN_QUEST, npc: 'mirelda' });
    expect(t.p.char.quests[HUB_MAIN_QUEST]?.s).toBe('active');
    toHub(t);
    at(t, 'hanne'); t.send({ t: 'talk', npc: 'hanne' });
    t.send({ t: 'qTurnIn', id: HUB_MAIN_QUEST, npc: 'hanne' });
    expect(t.p.char.quests[HUB_MAIN_QUEST]?.s).toBe('done');
  });
  it('ein alter Spielstand lädt, bekommt EINMAL den Hinweis statt der Quest und ist sauber', () => {
    const t = fresh('waldlaeufer', 1);
    const acc = t.p.accountId, id = t.p.charId;
    sim.leave(t);
    // Spielstand von vor 0.9: ohne die neuen Felder, Geschichte schon begonnen
    const old: any = JSON.parse(JSON.stringify(sim.db.loadChar(acc, id)));
    for (const k of ['mastery', 'earned', 'hubShop', 'expeditions']) delete old[k];
    for (const k of Object.keys(old.flags)) if (k.startsWith('qw:')) delete old.flags[k];
    old.level = 12; old.quests = { m_erwachen: { s: 'done', p: [], n: 1 }, m_borin: { s: 'done', p: [], n: 1 } };
    const clean = sanitizeChar(old)!;
    expect(clean.mastery).toBeUndefined(); expect(clean.hubShop).toBeUndefined();
    sim.db.saveChar(id, old);
    t.msgs.length = 0;
    sim.reenter(t);
    expect(t.p.char.flags[HUB_OLD_FLAG]).toBe(1);
    expect(t.msgs.filter(m => m.t === 'story' && m.id === 'quellwarte').length).toBe(1);
    sim.gotoNpc(t, 'mirelda'); t.send({ t: 'qAccept', id: HUB_MAIN_QUEST, npc: 'mirelda' });
    expect(t.p.char.quests[HUB_MAIN_QUEST]).toBeUndefined();
    sim.leave(t); t.msgs.length = 0; sim.reenter(t);
    expect(t.msgs.some(m => m.t === 'story' && m.id === 'quellwarte')).toBe(false);
    // beschädigte neue Felder werden verworfen
    const bad: any = { ...old, mastery: 'x', earned: -5, hubShop: { day: 'a', got: [1, 99, 'x', 1], wgot: 1 } };
    const s = sanitizeChar(bad)!;
    expect(s.mastery).toBeUndefined(); expect(s.earned).toBeUndefined();
    expect(s.hubShop).toEqual({ day: 0, week: 0, got: [1], wgot: 1 });
  });
  it('wer in der Quellwarte gespeichert wurde, erscheint dort wieder', () => {
    const t = fresh(); toHub(t);
    sim.leave(t); sim.reenter(t);
    expect(t.p.zone.id).toBe(HUB_ZONE);
    expect(t.p.zone.key).toBe(HUB_ZONE);
  });
});

void makeStack; void SKILL_LIST;
