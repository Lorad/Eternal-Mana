/**
 * Zuhause (0.7): eigener Hof als Instanz, Lagertruhe des Profils, Ausbau, Stationen, Trophäen, Begleiter, Sammlung,
 * Erscheinungen, „Ausgeruht“ – gegen ein echtes `Game` ohne Netzwerk (tests/helpers/sim.ts).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Db, sanitizeChar } from '../server/src/db';
import { Game } from '../server/src/game';
import { Home } from '../server/src/home';
import { World } from '../server/src/world';
import { CFG } from '../shared/src/config';
import { makeLegendary, makeSetPiece } from '../shared/src/craft';
import { BEASTS, BESTIARY, COLL_CATS, FINDS, MILESTONES, collCount, dropSeen, milestoneFlag, sanitizeHome, stashSlots, studied } from '../shared/src/data/collection';
import { BOSSES, ENEMIES } from '../shared/src/data/enemies';
import { HOME_ID, HOME_LEVELS, HOME_TROPHIES, baseSlots, emptyHome, homeStands, trophyPerks } from '../shared/src/data/home';
import { ITEMS, generateGear, makeStack } from '../shared/src/data/items';
import { LOOK_LIST, LOOKS, OUTFIT_IDS, glowColor, outfitSheet } from '../shared/src/data/looks';
import { PET_ITEM, PET_LIST, PET_QUEST, PETS } from '../shared/src/data/pets';
import { QUEST_LIST } from '../shared/src/data/quests';
import { HOME_AT, LEARNABLE, RECIPES } from '../shared/src/data/recipes';
import { KREIS_QUEST, ownedTitles, titleName } from '../shared/src/data/rifts';
import { ZONE_LIST, ZONES } from '../shared/src/data/zones';
import { HOME_SPOTS } from '../shared/src/maps/homegen';
import { getMap, validateMap } from '../shared/src/maps/mapgen';
import { TILE } from '../shared/src/maps/tiles';
import { newCharacter } from '../shared/src/stats';
import type { CharData, ClientMsg, HomeData, ServerMsg, ZoneInit } from '../shared/src/types';
import { Rng } from '../shared/src/util/rng';
import { Sim, type Tester } from './helpers/sim';

let sim: Sim;
beforeAll(() => { sim = new Sim(); World.setAuto(sim.game, false); });
afterAll(() => sim.close());

type HomeMsg = Omit<Extract<ClientMsg, { t: 'home' }>, 't'>;
let n = 0;
const fresh = (cls: CharData['cls'] = 'krieger', level = 10) => sim.join('Hof' + String.fromCharCode(65 + (n % 26)) + String.fromCharCode(65 + Math.floor(n++ / 26)), cls, level);
const hs = (t: Tester, m: HomeMsg) => t.send({ t: 'home', ...m });
const home = (t: Tester): HomeData => Home.of(sim.game, t.p);
const lastInit = (t: Tester) => (t.msgs.filter(m => m.t === 'zone').at(-1) as Extract<ServerMsg, { t: 'zone' }>).init as ZoneInit;
const notes = (t: Tester) => t.msgs.filter(m => m.t === 'home').flatMap(m => (m as Extract<ServerMsg, { t: 'home' }>).note ?? []).map(x => x.s);
const hobj = (t: Tester, kind: string, idx?: number) => [...t.p.zone.objs.values()].find(o => o.type === 'hobj' && o.tag === kind && (idx === undefined || o.props?.idx === idx))!;
/** Stellt den Spieler an ein Möbel des Hofs (oder an den Wegweiser in Quellhain). */
function at(t: Tester, kind: string, idx?: number) { const o = hobj(t, kind, idx); if (!o) throw new Error('kein Hof-Objekt: ' + kind); t.p.x = o.x; t.p.y = o.y + 14; return o; }
/** Gibt dem Profil einen Hof der Stufe `level` und stellt den Spieler hinein. */
function settle(t: Tester, level = 0) { Home.dev(sim.game, t.p, 'hof', [String(level)]); expect(Home.owner(t.p.zone)?.acc).toBe(t.p.accountId); return t; }
const tick = () => sim.step(0.1);
/** Ändert etwas am Charakter und lässt die Sammlung mitlesen (wie nach jeder echten Änderung beim nächsten Abgleich). */
function prove(t: Tester, f: (c: CharData) => void, ...keys: (keyof CharData)[]) { f(t.p.char); t.p.sync(...(keys.length ? keys : (['flags'] as (keyof CharData)[]))); tick(); }
const gear = (lvl = 5, rarity = 1) => generateGear(new Rng(n * 97 + 5), lvl, rarity, 'krieger', 'weapon');
/** Zweiter Blick auf die Datenbank, wie ihn ein Neustart hätte */
function onDisk(t: Tester): { c: CharData; h: HomeData } {
  const db = new Db(sim.dir);
  try { return { c: db.loadChar(t.p.accountId, t.p.charId)!, h: db.loadHome(t.p.accountId) }; } finally { db.db.close(); }
}
const cnt = (list: { base: string; qty?: number }[], base: string) => list.filter(i => i.base === base).reduce((a, i) => a + (i.qty ?? 1), 0);

describe('Daten und Karte', () => {
  it('die Karte des Hofs ist gültig, alle Plätze sind erreichbar und solide; der Hof steht nicht auf der Weltkarte', () => {
    const m = getMap(HOME_ID);
    expect(validateMap(m)).toEqual([]);
    expect(m.spawns.length).toBe(0);
    expect(ZONES[HOME_ID].kind).toBe('home');
    expect(ZONE_LIST.some(z => z.id === HOME_ID)).toBe(false);
    expect(m.objects.filter(o => o.type === 'stone').length).toBe(1);
    expect(m.objects.filter(o => o.type === 'hobj').length).toBe(HOME_SPOTS.length + 1);
    for (const kind of ['stash', 'wardrobe', 'bed', 'table', 'stable', 'forge', 'alchemy', 'cooking', 'enchant', 'tor']) expect(m.objects.filter(o => o.tag === kind).length, kind).toBe(1);
    expect(m.objects.filter(o => o.tag === 'stand').length).toBe(CFG.home.stands.at(-1));
    for (const o of m.objects) expect(m.solid[Math.floor(o.y / TILE) * m.w + Math.floor(o.x / TILE)], o.tag).toBe(1);
    expect(m.solid[Math.floor(m.start.y / TILE) * m.w + Math.floor(m.start.x / TILE)]).toBe(0);
    // dieselbe Karte bei jedem Aufruf (Server und Client bauen sie getrennt)
    expect(getMap(HOME_ID)).toBe(m);
  });
  it('der Wegweiser steht frei am Dorfrand von Quellhain – in jeder Welt-Instanz, auf keiner anderen Karte', () => {
    const z = sim.zone('gruenwald'), m = z.map;
    const signs = [...z.objs.values()].filter(o => o.type === 'hobj' && o.tag === 'weg');
    expect(signs.length).toBe(1);
    const s = signs[0];
    expect(m.solid[Math.floor(s.y / TILE) * m.w + Math.floor(s.x / TILE)]).toBe(0);
    for (const o of z.objs.values()) if (o !== s) expect(Math.hypot(o.x - s.x, o.y - s.y), o.type).toBeGreaterThan(24);
    expect([...sim.game.zone('gruenwald', 1).objs.values()].filter(o => o.tag === 'weg').length).toBe(1);
    expect([...sim.zone('kristall').objs.values()].some(o => o.type === 'hobj')).toBe(false);
  });
  it('Stufen, Trophäen, Begleiter, Erscheinungen und Meilensteine verweisen nur auf Existierendes', () => {
    expect(HOME_LEVELS.length).toBe(4);
    for (const L of HOME_LEVELS) { for (const [b, k] of L.mats) { expect(ITEMS[b], b).toBeTruthy(); expect(k).toBeGreaterThan(0); } expect(L.adds.length).toBeGreaterThan(0); }
    expect(new Set(HOME_LEVELS.flatMap(L => L.mats.map(m => m[0]))).size).toBeGreaterThanOrEqual(8); // Rohstoffe aus mehreren Regionen
    expect(HOME_LEVELS.some(L => L.rep)).toBe(true); expect(HOME_LEVELS.some(L => L.rift)).toBe(true);
    for (let i = 1; i < 4; i++) { expect(CFG.home.slots[i]).toBeGreaterThan(CFG.home.slots[i - 1]); expect(CFG.home.stands[i]).toBeGreaterThan(CFG.home.stands[i - 1]); }
    expect(HOME_TROPHIES.length).toBe(15 + Object.keys(BOSSES).length + 7);
    expect(new Set(HOME_TROPHIES.map(t => t.id)).size).toBe(HOME_TROPHIES.length);
    expect(PET_LIST.map(p => p.id).sort()).toEqual(['glutfuchs', 'moosling', 'pilzling', 'quelldrachling', 'runenkaefer', 'schattenkatze', 'schneeeule', 'wisp']);
    expect(new Set(PET_LIST.map(p => p.how)).size).toBe(8);   // jeder aus einem anderen Winkel des Spiels
    expect(new Set(PET_LIST.map(p => p.perk)).size).toBe(8);  // jeder mit einer anderen Eigenheit
    expect(ITEMS[PET_ITEM]?.use?.pet).toBe('pilzling');
    expect(RECIPES.c_pilzling.out).toEqual({ k: 'item', item: PET_ITEM, qty: 1 });
    expect(LOOK_LIST.filter(l => l.kind === 'g').map(l => l.id).sort()).toEqual([...OUTFIT_IDS].sort());
    expect(LOOK_LIST.filter(l => l.kind === 'w').length).toBeGreaterThanOrEqual(6);
    expect(BESTIARY.length).toBe(Object.keys(ENEMIES).length + Object.keys(BOSSES).length);
    for (const b of BESTIARY) for (const d of b.drops) expect(ITEMS[d], `${b.id}: ${d}`).toBeTruthy();
    for (const m of MILESTONES) {
      if (m.pet) expect(PETS[m.pet]).toBeTruthy();
      if (m.look) expect(LOOKS[m.look]).toBeTruthy();
      const total = m.cat === 'alles' ? COLL_CATS.reduce((a, c) => a + collCount(emptyHome(), c.id)[1], 0) : collCount(emptyHome(), m.cat)[1];
      expect(m.need, m.id).toBeLessThanOrEqual(total);
    }
    // jeder Begleiter und jede Erscheinung hat eine Quelle: Beweis im Spielstand, Meilenstein oder Gegenstand
    for (const p of PET_LIST) expect(!!p.has || MILESTONES.some(m => m.pet === p.id) || p.id === ITEMS[PET_ITEM].use!.pet, p.id).toBe(true);
    for (const l of LOOK_LIST) expect(!!l.has || MILESTONES.some(m => m.look === l.id), l.id).toBe(true);
  });
});

describe('Der eigene Hof', () => {
  it('kaufen bei Mirelda: erst nach der Wurzelgruft, nur mit Gold, nur aus der Nähe, nur einmal', () => {
    const t = fresh('krieger', 6), c = t.p.char;
    sim.gotoNpc(t, 'mirelda');
    c.gold = 5000;
    hs(t, { a: 'buy' });
    expect(home(t).owned).toBe(0);
    expect(t.toasts.at(-1)).toMatch(/Wurzelgruft/);
    c.quests[CFG.home.buyQuest] = { s: 'done', p: [], n: 1 };
    c.gold = CFG.home.price - 1;
    hs(t, { a: 'buy' });
    expect(home(t).owned).toBe(0);
    expect(t.toasts.at(-1)).toMatch(/Gold/);
    c.gold = CFG.home.price + 77;
    t.p.x += 400;
    hs(t, { a: 'buy' });
    expect(home(t).owned).toBe(0);
    sim.gotoNpc(t, 'mirelda');
    hs(t, { a: 'buy' });
    expect(home(t).owned).toBe(1);
    expect(home(t).level).toBe(0);
    expect(c.gold).toBe(77);
    expect(c.flags['t:heim']).toBe(1);
    expect(onDisk(t).h.owned).toBe(1);                 // sofort gespeichert, zusammen mit dem bezahlten Gold
    expect(onDisk(t).c.gold).toBe(77);
    c.gold = 5000;
    hs(t, { a: 'buy' });
    expect(c.gold).toBe(5000);
    expect(t.toasts.at(-1)).toMatch(/gehört dir schon/);
    sim.clear();
  });
  it('betreten am Wegweiser, verlassen am Tor, reisen per Quellstein; ohne Hof bleibt man draußen', () => {
    const t = fresh(), u = fresh();
    Home.of(sim.game, t.p).owned = 1;
    // nicht aus der Ferne
    hs(t, { a: 'go' });
    expect(t.p.zone.id).toBe('gruenwald');
    expect(t.toasts.at(-1)).toMatch(/Wegweiser/);
    at(t, 'weg');
    hs(t, { a: 'go' });
    expect(t.p.zone.id).toBe(HOME_ID);
    expect(t.p.zone.key).toBe(`${HOME_ID}:${t.p.accountId}`);
    expect(lastInit(t).heim).toEqual({ owner: t.p.name, own: true, level: 0 });
    expect(lastInit(t).objs.filter(o => o.type === 'hobj').every(o => typeof o.props?.frame === 'string')).toBe(true);
    expect(t.p.zone.mobs.size).toBe(0);
    // über die normale Interaktion mit dem Tor geht es zurück – neben den Wegweiser
    t.send({ t: 'interact', id: at(t, 'tor').id });
    expect(t.p.zone.id).toBe('gruenwald');
    expect(Math.hypot(t.p.x - hobj(t, 'weg').x, t.p.y - hobj(t, 'weg').y)).toBeLessThan(40);
    // Quellstein: hin und zurück
    t.p.char.flags['t:heim'] = 1; t.p.char.flags['t:gruenwald'] = 1;
    const stone = [...t.p.zone.objs.values()].find(o => o.type === 'stone')!;
    t.p.x = stone.x; t.p.y = stone.y + 18;
    t.send({ t: 'teleport', zone: HOME_ID });
    expect(t.p.zone.key).toBe(`${HOME_ID}:${t.p.accountId}`);
    const hstone = [...t.p.zone.objs.values()].find(o => o.type === 'stone')!;
    expect(Math.hypot(t.p.x - hstone.x, t.p.y - hstone.y)).toBeLessThan(40);
    t.send({ t: 'interact', id: hstone.id });           // rasten: der Hof wird Rückkehrpunkt
    expect(t.p.char.respawn.zone).toBe(HOME_ID);
    t.send({ t: 'teleport', zone: 'gruenwald' });
    expect(t.p.zone.id).toBe('gruenwald');
    // wer keinen Hof hat, wird am Wegweiser abgewiesen – und landet mit einem Hof-Quellstein-Flag in Quellhain statt im Nichts
    at(u, 'weg');
    hs(u, { a: 'go' });
    expect(u.p.zone.id).toBe('gruenwald');
    expect(u.toasts.at(-1)).toMatch(/Verkauf/);
    u.p.char.flags['t:heim'] = 1;
    sim.travel(u, 'kristall');
    sim.game.transfer(u.p, HOME_ID, '');
    expect(u.p.zone.id).toBe('gruenwald');
    expect(sim.game.zones.has(HOME_ID)).toBe(false);    // es gibt nie eine Hof-Zone ohne Besitzer
    sim.clear();
  });
  it('jeder Hof ist eine eigene Instanz; Gruppenmitglieder dürfen zu Besuch – ohne an die Truhe zu kommen; nach der Gruppe ist der Besuch vorbei', () => {
    const a = settle(fresh()), b = settle(fresh()), v = fresh();
    expect(a.p.zone).not.toBe(b.p.zone);
    expect(a.p.zone.players.size).toBe(1);
    expect(b.p.zone.players.has(a.p.id)).toBe(false);
    // ohne Gruppe kein Besuch
    at(v, 'weg');
    hs(v, { a: 'go', owner: a.p.id });
    expect(v.p.zone.id).toBe('gruenwald');
    expect(v.toasts.at(-1)).toMatch(/Gruppe/);
    a.send({ t: 'party', a: 'invite', id: v.p.id });
    v.send({ t: 'party', a: 'accept' });
    expect(v.p.party).toBe(a.p.party);
    expect(a.p.zone.key).toBe(`${HOME_ID}:${a.p.accountId}`); // der Gastgeber bleibt beim Gruppenwechsel zu Hause
    at(v, 'weg');
    hs(v, { a: 'go', owner: b.p.id });                   // fremder Hof außerhalb der Gruppe
    expect(v.p.zone.id).toBe('gruenwald');
    hs(v, { a: 'go', owner: a.p.id });
    expect(v.p.zone).toBe(a.p.zone);
    expect(lastInit(v).heim).toEqual({ owner: a.p.name, own: false, level: 0 });
    expect(lastInit(v).players.some(p => p.id === a.p.id)).toBe(true);
    // die Truhe des Gastgebers bleibt zu, ausbauen und Trophäen stellen darf nur er
    at(v, 'stash');
    const it = v.p.char.inv[0];
    hs(v, { a: 'put', uid: it.uid });
    expect(v.p.char.inv).toContain(it);
    expect(v.toasts.at(-1)).toMatch(/Fremde Truhen/);
    home(a).gold = 500;
    hs(v, { a: 'gold', n: -100 });
    expect(home(a).gold).toBe(500);
    hs(v, { a: 'upgrade' }); hs(v, { a: 'trophy', slot: 0, id: 'borkenkoenig' });
    expect(home(a).level).toBe(0);
    expect(home(v).owned).toBe(0);
    // wer die Gruppe verlässt, steht wieder in Quellhain; der Gastgeber bleibt
    v.send({ t: 'party', a: 'leave' });
    expect(v.p.zone.id).toBe('gruenwald');
    expect(a.p.zone.key).toBe(`${HOME_ID}:${a.p.accountId}`);
    sim.clear();
  });
  it('wer auf einem Hof die Welt verlässt, erscheint auf dem eigenen wieder; leere Höfe werden verworfen und neu eingerichtet', () => {
    const t = settle(fresh(), 2);
    const key = t.p.zone.key;
    at(t, 'table');
    const [x, y] = [t.p.x, t.p.y];
    sim.leave(t);
    sim.step(CFG.world.dungeonResetSec + 2);
    expect(sim.game.zones.has(key)).toBe(false);
    sim.reenter(t);
    expect(t.p.zone.key).toBe(key);
    expect([Math.round(t.p.x), Math.round(t.p.y)]).toEqual([Math.round(x), Math.round(y)]);
    expect(hobj(t, 'forge').props!.station).toBe('forge'); // Einrichtung nach dem Stand des Besitzers
    sim.clear();
  });
});

describe('Lagertruhe', () => {
  it('einlagern und abheben: Gegenstände, Teilstapel, Gold – nur auf dem eigenen Hof an der Truhe', () => {
    const t = settle(fresh()), c = t.p.char, h = home(t);
    const sword = gear(); t.p.addItem(sword);
    t.give('mat_wood', 10);
    c.gold = 300;
    // nicht aus der Ferne, nicht von unterwegs
    at(t, 'tor');
    hs(t, { a: 'put', uid: sword.uid });
    expect(h.stash.length).toBe(0);
    expect(t.toasts.at(-1)).toMatch(/Lagertruhe stehen/);
    at(t, 'stash');
    hs(t, { a: 'put', uid: sword.uid });
    expect(h.stash).toEqual([sword]);
    expect(c.inv.some(i => i.uid === sword.uid)).toBe(false);
    // Teilstapel: 4 von 10, dann noch 3 – in der Truhe ein Stapel
    const wood = c.inv.find(i => i.base === 'mat_wood')!;
    hs(t, { a: 'put', uid: wood.uid, n: 4 });
    expect([t.count('mat_wood'), cnt(h.stash, 'mat_wood')]).toEqual([6, 4]);
    hs(t, { a: 'put', uid: wood.uid, n: 3 });
    expect([t.count('mat_wood'), cnt(h.stash, 'mat_wood'), h.stash.filter(i => i.base === 'mat_wood').length]).toEqual([3, 7, 1]);
    // unsinnige Mengen werden begrenzt
    const sw = h.stash.find(i => i.base === 'mat_wood')!;
    hs(t, { a: 'take', uid: sw.uid, n: -5 });
    expect([t.count('mat_wood'), cnt(h.stash, 'mat_wood')]).toEqual([4, 6]);
    hs(t, { a: 'take', uid: sw.uid, n: 999 });
    expect([t.count('mat_wood'), cnt(h.stash, 'mat_wood')]).toEqual([10, 0]);
    expect(c.inv.filter(i => i.base === 'mat_wood').length).toBe(1);
    hs(t, { a: 'take', uid: 'gibtsnicht' }); hs(t, { a: 'put', uid: 'gibtsnicht' });
    // Gold
    hs(t, { a: 'gold', n: 120 });
    expect([c.gold, h.gold]).toEqual([180, 120]);
    hs(t, { a: 'gold', n: 9999 });
    expect([c.gold, h.gold]).toEqual([0, 300]);
    hs(t, { a: 'gold', n: 50 });
    expect(t.toasts.at(-1)).toMatch(/kein Gold/);
    hs(t, { a: 'gold', n: -100 });
    expect([c.gold, h.gold]).toEqual([100, 200]);
    hs(t, { a: 'gold', n: -5000 });
    expect([c.gold, h.gold]).toEqual([300, 0]);
    hs(t, { a: 'gold', n: -1 });
    expect(t.toasts.at(-1)).toMatch(/kein Gold/);
    hs(t, { a: 'gold', n: NaN }); hs(t, { a: 'gold', n: 0.4 });
    expect([c.gold, h.gold]).toEqual([300, 0]);
    // Questgegenstände bleiben beim Charakter
    t.p.addItem(makeStack('seal_earth'));
    hs(t, { a: 'put', uid: c.inv.find(i => i.base === 'seal_earth')!.uid });
    expect(t.count('seal_earth')).toBe(1);
    expect(t.toasts.at(-1)).toMatch(/Questgegenstände/);
    // unterwegs geht nichts
    hs(t, { a: 'leave' });
    hs(t, { a: 'take', uid: sword.uid });
    expect(h.stash).toEqual([sword]);
    expect(t.toasts.at(-1)).toMatch(/auf deinem Hof/);
    // der Client hat jede Änderung der Truhe bekommen
    const sent = t.msgs.filter(m => m.t === 'home').map(m => (m as any).h as Partial<HomeData>);
    expect(sent.filter(x => x.stash).at(-1)!.stash!.map(i => i.uid)).toEqual([sword.uid]);
    expect(sent.filter(x => x.gold !== undefined).at(-1)!.gold).toBe(0);
    sim.clear();
  });
  it('volle Truhe und volles Inventar: nichts geht verloren, Stapel verschmelzen trotzdem; Sortieren ordnet', () => {
    const t = settle(fresh()), c = t.p.char, h = home(t);
    at(t, 'stash');
    expect(stashSlots(h)).toBe(CFG.home.slots[0]);
    c.inv = [];
    for (let i = 0; i < stashSlots(h) - 1; i++) h.stash.push(gear(3 + (i % 5), i % 3));
    t.give('mat_wood', 5); t.give('mat_herb', 2);
    const g1 = gear(), g2 = gear(); t.p.addItem(g1); t.p.addItem(g2);
    hs(t, { a: 'put', uid: c.inv.find(i => i.base === 'mat_wood')!.uid, n: 2 });   // letzter freier Platz
    expect(h.stash.length).toBe(stashSlots(h));
    hs(t, { a: 'put', uid: g1.uid });
    expect(c.inv).toContain(g1);
    expect(t.toasts.at(-1)).toMatch(/Truhe ist voll/);
    hs(t, { a: 'put', uid: c.inv.find(i => i.base === 'mat_herb')!.uid });          // neuer Stapel: kein Platz
    expect(t.count('mat_herb')).toBe(2);
    hs(t, { a: 'put', uid: c.inv.find(i => i.base === 'mat_wood')!.uid });          // vorhandener Stapel: passt
    expect([t.count('mat_wood'), cnt(h.stash, 'mat_wood')]).toEqual([0, 5]);
    expect(h.stash.length).toBe(stashSlots(h));
    // volles Inventar
    while (c.inv.length < CFG.player.invSize) c.inv.push(gear());
    const inTruhe = h.stash.find(i => ITEMS[i.base].kind === 'weapon')!;
    hs(t, { a: 'take', uid: inTruhe.uid });
    expect(h.stash).toContain(inTruhe);
    expect(c.inv.length).toBe(CFG.player.invSize);
    expect(t.toasts.at(-1)).toBe('Inventar voll.');
    hs(t, { a: 'take', uid: h.stash.find(i => i.base === 'mat_wood')!.uid, n: 2 }); // neuer Stapel: kein Platz
    expect(cnt(h.stash, 'mat_wood')).toBe(5);
    c.inv.pop(); t.give('mat_wood', 1);
    hs(t, { a: 'take', uid: h.stash.find(i => i.base === 'mat_wood')!.uid, n: 2 }); // vorhandener Stapel: passt
    expect([t.count('mat_wood'), cnt(h.stash, 'mat_wood')]).toEqual([3, 3]);
    // keine Kennung doppelt, weder hier noch dort
    const uids = [...c.inv, ...h.stash].map(i => i.uid);
    expect(new Set(uids).size).toBe(uids.length);
    hs(t, { a: 'sort' });
    const kinds = h.stash.map(i => ITEMS[i.base].kind);
    expect(kinds.indexOf('material')).toBe(kinds.lastIndexOf('weapon') + 1);
    sim.clear();
  });
  it('die Truhe gehört dem Profil: ein zweiter Charakter desselben Profils holt ab, was der erste eingelagert hat', () => {
    const t = settle(fresh()), acc = t.s.account!.id;
    const sword = gear(8, 3); t.p.addItem(sword);
    t.p.char.gold = 900;
    at(t, 'stash');
    hs(t, { a: 'put', uid: sword.uid }); hs(t, { a: 'gold', n: 650 });
    const first = t.p.charId;
    sim.leave(t);
    t.send({ t: 'charCreate', slot: 1, name: 'Zweit' + t.p.name.slice(3), cls: 'magier' });
    const second = sim.db.listChars(acc).find(c => c.id !== first)!;
    t.send({ t: 'enter', id: second.id });
    t.p = t.s.player!;
    expect(t.p.charId).toBe(second.id);
    expect(t.p.accountId).toBe(acc);
    expect(home(t).stash.map(i => i.uid)).toEqual([sword.uid]);
    expect(t.p.char.flags['t:heim']).toBe(1);            // der Weg nach Hause gilt für jeden Charakter des Profils
    const full = t.msgs.filter(m => m.t === 'home').at(-1) as Extract<ServerMsg, { t: 'home' }>;
    expect(full.h.owned).toBe(1); expect(full.h.stash!.length).toBe(1);
    at(t, 'weg');
    hs(t, { a: 'go' });
    expect(lastInit(t).heim!.own).toBe(true);
    at(t, 'stash');
    hs(t, { a: 'take', uid: sword.uid }); hs(t, { a: 'gold', n: -650 });
    expect(t.p.char.inv.some(i => i.uid === sword.uid)).toBe(true);
    expect(t.p.char.gold).toBe(25 + 650);
    expect(home(t).stash.length).toBe(0);
    // und auf der Platte steht dasselbe – beim ersten Charakter ist das Schwert weg
    const db = new Db(sim.dir);
    expect(db.loadChar(acc, first)!.inv.some(i => i.uid === sword.uid)).toBe(false);
    expect(db.loadChar(acc, second.id)!.inv.some(i => i.uid === sword.uid)).toBe(true);
    expect(db.loadHome(acc).stash.length).toBe(0);
    db.db.close();
    sim.clear();
  });
  it('nichts verdoppelt sich: nach jeder Bewegung stimmen Rucksack und Truhe auf der Platte – auch wenn die Verbindung reißt oder der Server abstürzt', () => {
    const t = settle(fresh()), c = t.p.char, h = home(t);
    const sword = gear(9, 2); t.p.addItem(sword);
    t.give('mat_crystal', 12);
    c.gold = 1000;
    sim.game.savePlayer(t.p);
    at(t, 'stash');
    const total = (x: { c: CharData; h: HomeData }, base: string) => cnt(x.c.inv, base) + cnt(x.h.stash, base);
    const check = () => {
      const d = onDisk(t);
      expect(total(d, 'mat_crystal')).toBe(12);
      expect(d.c.inv.filter(i => i.uid === sword.uid).length + d.h.stash.filter(i => i.uid === sword.uid).length).toBe(1);
      expect(d.c.gold + d.h.gold).toBe(1000);
      expect([cnt(d.c.inv, 'mat_crystal'), cnt(d.h.stash, 'mat_crystal'), d.c.gold, d.h.gold]).toEqual([t.count('mat_crystal'), cnt(h.stash, 'mat_crystal'), c.gold, h.gold]);
    };
    const crystal = () => c.inv.find(i => i.base === 'mat_crystal')!.uid;
    hs(t, { a: 'put', uid: sword.uid }); check();
    hs(t, { a: 'put', uid: crystal(), n: 5 }); check();
    hs(t, { a: 'gold', n: 400 }); check();
    hs(t, { a: 'take', uid: h.stash.find(i => i.base === 'mat_crystal')!.uid, n: 2 }); check();
    hs(t, { a: 'take', uid: sword.uid }); check();
    hs(t, { a: 'put', uid: sword.uid }); check();
    hs(t, { a: 'gold', n: -150 }); check();
    // Verbindung reißt mitten im Hantieren: der Charakter bleibt 30 s stehen, dann wird er entfernt – der Stand bleibt stimmig
    hs(t, { a: 'put', uid: crystal(), n: 3 });
    sim.game.onClose(t.s);
    expect(t.p.linkdead).toBe(true);
    check();
    sim.step(CFG.net.reconnectGraceMs / 1000 + 1);
    expect(sim.game.players.has(t.p.charId)).toBe(false);
    const d = onDisk(t);
    expect(d.h.stash.filter(i => i.uid === sword.uid).length).toBe(1);
    expect(d.c.inv.some(i => i.uid === sword.uid)).toBe(false);
    expect([cnt(d.c.inv, 'mat_crystal'), cnt(d.h.stash, 'mat_crystal'), d.c.gold, d.h.gold]).toEqual([6, 6, 750, 250]);
  });
  it('Absturz ohne Speichern und Neustart: Was in der Truhe lag, liegt in der Truhe; der Charakter fällt auf seinen letzten Stand zurück – ohne das Eingelagerte', () => {
    const s2 = new Sim();
    World.setAuto(s2.game, false);
    const t = s2.join('Absturz', 'paladin', 12);
    Home.dev(s2.game, t.p, 'hof', ['1']);
    const sword = gear(11, 3); t.p.addItem(sword);
    t.give('mat_ember', 9);
    t.p.char.gold = 500;
    s2.game.savePlayer(t.p);
    const o = [...t.p.zone.objs.values()].find(x => x.tag === 'stash')!;
    t.p.x = o.x; t.p.y = o.y + 14;
    t.send({ t: 'home', a: 'put', uid: sword.uid });
    t.send({ t: 'home', a: 'put', uid: t.p.char.inv.find(i => i.base === 'mat_ember')!.uid, n: 4 });
    t.send({ t: 'home', a: 'gold', n: 200 });
    // danach Ungespeichertes: Beute im Rucksack, ein Sieg fürs Bestiarium
    t.give('mat_frost', 3);
    Home.of(s2.game, t.p).kills.moosling = 5;
    const token = t.s.account!.token, charId = t.p.charId;
    // „Absturz“: der Prozess ist weg, ohne saveAll. Ein neuer Server öffnet dieselbe Datenbank.
    const db = new Db(s2.dir), g2 = new Game(db, s2.game.info);
    const msgs: ServerMsg[] = [];
    const ses = g2.onConnect({ readyState: 1, send: (raw: string) => msgs.push(JSON.parse(raw)), close() {} } as any);
    g2.onMessage(ses, JSON.stringify({ t: 'hello', token, name: 'Absturz', v: 'test' }));
    g2.onMessage(ses, JSON.stringify({ t: 'enter', id: charId }));
    const p = ses.player!, h = Home.of(g2, p);
    expect(p.zone.key).toBe(`${HOME_ID}:${p.accountId}`);  // stand auf dem Hof, steht auf dem Hof
    expect([h.owned, h.level, h.gold]).toEqual([1, 1, 200]);
    expect(h.stash.filter(i => i.uid === sword.uid).length).toBe(1);
    expect(p.char.inv.some(i => i.uid === sword.uid)).toBe(false);
    expect([p.countItem('mat_ember'), cnt(h.stash, 'mat_ember'), p.char.gold]).toEqual([5, 4, 300]);
    expect(p.countItem('mat_frost')).toBe(0);              // war nie gespeichert
    expect(h.kills.moosling).toBeUndefined();
    // abheben nach dem Neustart
    const o2 = [...p.zone.objs.values()].find(x => x.tag === 'stash')!;
    p.x = o2.x; p.y = o2.y + 14;
    g2.onMessage(ses, JSON.stringify({ t: 'home', a: 'take', uid: sword.uid }));
    expect(p.char.inv.some(i => i.uid === sword.uid)).toBe(true);
    expect(h.stash.some(i => i.uid === sword.uid)).toBe(false);
    db.close();
    s2.close();
  });
  it('beschädigter Profil-Stand: Prüfsumme greift, Snapshot springt ein; Unsinn wird begrenzt, nichts Gültiges gekürzt', () => {
    const t = fresh(), acc = t.p.accountId;
    const sword = gear(); t.p.addItem(sword);
    Home.of(sim.game, t.p).stash.push(sword);
    settle(t, 1);                                        // erstes Speichern des Profil-Stands: Stand samt Snapshot
    expect(onDisk(t).h.stash.map(i => i.uid)).toEqual([sword.uid]);
    sim.db.db.prepare('UPDATE homes SET data = ? WHERE account_id = ?').run('{"owned":1,"level":3,"gold":1e99,"stash":"kaputt"}', acc);
    const h = sim.db.loadHome(acc);                      // Prüfsumme passt nicht → jüngster intakter Snapshot
    expect([h.owned, h.level, h.gold, h.stash.map(i => i.uid)]).toEqual([1, 1, 0, [sword.uid]]);
    // ganz ohne Snapshot: so viel retten wie möglich
    const s = sanitizeHome({ owned: 1, level: 99, gold: -5, stash: [{ base: 'gibtsnicht', uid: 'x' }, { base: 'mat_wood', uid: 'a', qty: 3 }, null], pets: ['moosling', 'einhorn', 'moosling'], looks: ['wald', 7],
      stands: ['borkenkoenig', 'nix'], seen: { 't:borkenkoenig': 1, 'böse<script>': 1 }, kills: { moosling: 4, gibtsnicht: 9, pilzling: -3 }, ms: ['best10', 'best10', 'x'] });
    expect([s.level, s.gold, s.stash.length, s.pets, s.looks, s.ms]).toEqual([3, 0, 1, ['moosling'], ['wald'], ['best10']]);
    expect(s.stands.length).toBe(CFG.home.stands.at(-1));
    expect(s.stands.slice(0, 2)).toEqual(['borkenkoenig', '']);
    expect(s.kills).toEqual({ moosling: 4 });
    expect(Object.keys(s.seen)).toEqual(['t:borkenkoenig']);
    expect(sanitizeHome(null)).toEqual(emptyHome());
    expect(sanitizeHome('quatsch').owned).toBe(0);
    const many = sanitizeHome({ owned: 1, stash: Array.from({ length: 300 }, (_, i) => ({ base: 'mat_wood', uid: 'u' + i })) });
    expect(many.stash.length).toBe(300);                 // über dem Platz, aber abholbar
    // der Charakter: unbekannter Begleiter und unbekannte Erscheinung werden entfernt
    const c = sanitizeChar({ ...newCharacter('Alt', 'krieger'), pet: 'einhorn', look: { g: 'w_glut', w: 'w_glut' }, rest: 'bald', cv: 'x' })!;
    expect(c.pet).toBeUndefined();
    expect(c.look).toEqual({ w: 'w_glut' });
    expect(c.rest).toBeUndefined();
    sim.clear();
  });
});

describe('Ausbau, Stationen, Bett', () => {
  /** legt Gold und Rohstoffe der nächsten Stufe in den Rucksack */
  function stock(t: Tester) { const L = HOME_LEVELS[home(t).level + 1]; t.p.char.gold = L.gold; for (const [b, k] of L.mats) t.give(b, k); return L; }
  it('Stufe 1 braucht Gold und Rohstoffe; Stufe 2 dazu Ruf in Quellhain; Stufe 3 einen abgeschlossenen Riss – jede bringt Platz und Ständer', () => {
    const t = settle(fresh('krieger', 40)), c = t.p.char, h = home(t);
    expect([baseSlots(h), homeStands(h)]).toEqual([CFG.home.slots[0], CFG.home.stands[0]]);
    // ohne Rohstoffe
    c.gold = 99999;
    hs(t, { a: 'upgrade' });
    expect(h.level).toBe(0);
    expect(t.toasts.at(-1)).toMatch(/Es fehlt: 12× /);
    c.inv = []; const L1 = stock(t); c.gold = L1.gold - 1;
    hs(t, { a: 'upgrade' });
    expect(t.toasts.at(-1)).toMatch(/Gold/);
    c.gold = L1.gold;
    hs(t, { a: 'upgrade' });
    expect(h.level).toBe(1);
    expect(c.gold).toBe(0);
    for (const [b] of L1.mats) expect(t.count(b), b).toBe(0);
    expect([baseSlots(h), homeStands(h)]).toEqual([CFG.home.slots[1], CFG.home.stands[1]]);
    expect(onDisk(t).h.level).toBe(1);
    expect(hobj(t, 'stand', 2).props!.frame).toBe('trophy_stand');
    expect(hobj(t, 'stand', 3).props!.frame).not.toBe('trophy_stand');
    // Stufe 2: Ruf
    stock(t);
    c.rep = { quellhain: CFG.living.rep.ranks[2] - 1 };
    hs(t, { a: 'upgrade' });
    expect(h.level).toBe(1);
    expect(t.toasts.at(-1)).toMatch(/Ruf: Quellhain, Rang „Geachtet“/);
    c.rep.quellhain = CFG.living.rep.ranks[2];
    hs(t, { a: 'upgrade' });
    expect(h.level).toBe(2);
    expect(baseSlots(h)).toBe(CFG.home.slots[2]);
    // Stufe 3: Riss
    stock(t);
    c.rift = { stufe: 5, seed: 1, best: {} };            // Stufe 5 freigeschaltet = Stufe 4 abgeschlossen
    hs(t, { a: 'upgrade' });
    expect(h.level).toBe(2);
    expect(t.toasts.at(-1)).toMatch(/Mana-Riss der Stufe 5/);
    c.rift.best.geode = [5, 300];
    hs(t, { a: 'upgrade' });
    expect(h.level).toBe(3);
    expect([baseSlots(h), homeStands(h)]).toEqual([CFG.home.slots[3], CFG.home.stands[3]]);
    for (let i = 0; i < 8; i++) expect(hobj(t, 'stand', i).props!.frame).toBe('trophy_stand');
    c.gold = 1e6;
    hs(t, { a: 'upgrade' });
    expect(h.level).toBe(3);
    expect(t.toasts.at(-1)).toMatch(/Mehr passt nicht/);
    // nur vor Ort
    hs(t, { a: 'leave' });
    home(t).level = 1;
    stock(t); c.gold = 1e6;
    hs(t, { a: 'upgrade' });
    expect(home(t).level).toBe(1);
    sim.clear();
  });
  it('Stationen auf dem Hof gibt es erst ab Stufe 2 – dann alle vier, wie bei den NPCs, auch für Besuch; die Legendäre Waffe schmiedet weiter nur Borin', () => {
    const t = settle(fresh('krieger', 40), 1), c = t.p.char;
    t.give('ing_berry', 9); t.give('mat_herb', 3);
    at(t, 'cooking');
    expect(hobj(t, 'cooking').props!.station).toBeNull();
    expect(hobj(t, 'cooking').props!.label).toBe('Bauplatz');
    t.send({ t: 'craft', id: 'c_beeren', at: HOME_AT });
    expect(t.count('food_beeren')).toBe(0);
    expect(t.toasts.at(-1)).toMatch(/Station/);
    for (const s of ['forge', 'alchemy', 'cooking', 'enchant'] as const) { at(t, s); expect(Home.atStation(t.p, s), s).toBe(false); }
    // Ausbau zum Werkhof: die Bauplätze werden zu Stationen, alle Anwesenden erfahren es
    const before = t.p.zone.events.length;
    c.rep = { quellhain: 5000 };
    c.gold = HOME_LEVELS[2].gold; for (const [b, k] of HOME_LEVELS[2].mats) t.give(b, k);
    hs(t, { a: 'upgrade' });
    expect(home(t).level).toBe(2);
    expect(t.p.zone.events.slice(before).filter(e => e.k === 'obj' && e.props?.station).length).toBe(4);
    expect(hobj(t, 'forge').props).toMatchObject({ frame: 'forge', station: 'forge', label: null });
    for (const s of ['forge', 'alchemy', 'cooking', 'enchant'] as const) { at(t, s); expect(Home.atStation(t.p, s), s).toBe(true); }
    at(t, 'cooking');
    t.send({ t: 'craft', id: 'c_beeren', at: HOME_AT });
    expect(t.count('food_beeren')).toBe(2);
    // nicht aus der Ferne, nicht die falsche Station, nicht von außerhalb
    at(t, 'tor');
    t.send({ t: 'craft', id: 'c_beeren', at: HOME_AT });
    expect(t.count('food_beeren')).toBe(2);
    at(t, 'cooking');
    expect(Home.atStation(t.p, 'forge')).toBe(false);
    // Esse: verbessern wie bei Borin
    const w = c.equip.weapon!;
    c.gold = 5000; t.give('mat_wood', 5);
    at(t, 'forge');
    t.send({ t: 'upgrade', uid: w.uid, npc: HOME_AT });
    expect(w.up).toBe(1);
    at(t, 'cooking');
    t.send({ t: 'upgrade', uid: w.uid, npc: HOME_AT });
    expect(w.up).toBe(1);
    // Legendäre Waffe: nur bei Borin oder Rakhan
    at(t, 'forge');
    expect(RECIPES['f_legend_krieger'].npcs).not.toContain(HOME_AT);
    t.send({ t: 'craft', id: 'f_legend_krieger', at: HOME_AT });
    expect(c.inv.some(i => ITEMS[i.base].legend)).toBe(false);
    // Besuch darf mitkochen
    const v = fresh();
    sim.party(t, v);
    at(v, 'weg'); hs(v, { a: 'go', owner: t.p.id });
    v.give('ing_berry', 3); v.give('mat_herb', 1);
    at(v, 'cooking');
    v.send({ t: 'craft', id: 'c_beeren', at: HOME_AT });
    expect(v.count('food_beeren')).toBe(2);
    // unterwegs gilt die Hof-Kennung nichts
    hs(t, { a: 'leave' });
    sim.gotoNpc(t, 'ayla');
    t.send({ t: 'craft', id: 'c_beeren', at: HOME_AT });
    expect(t.count('food_beeren')).toBe(2);
    sim.clear();
  });
  it('das Bett (Stufe 3) macht „Ausgeruht“: mehr Erfahrung für begrenzte Spielzeit – übersteht Abmelden, läuft nur beim Spielen ab; Wegzeichen-Trophäen verlängern', () => {
    const t = settle(fresh('magier', 20), 2), c = t.p.char;
    const sec0 = CFG.home.rest.sec;
    CFG.home.rest.sec = 400;                             // der Test muss keine halbe Stunde nachspielen
    at(t, 'bed');
    expect(hobj(t, 'bed').props!.frame).not.toBe('bed');
    hs(t, { a: 'sleep' });
    expect(t.p.buffs.some(b => b.id === 'rest')).toBe(false);
    expect(t.toasts.at(-1)).toMatch(/Herdfeuer/);
    home(t).level = 3; Home.dress(sim.game, t.p.zone);
    expect(hobj(t, 'bed').props!.frame).toBe('bed');
    at(t, 'stash');
    hs(t, { a: 'sleep' });
    expect(t.p.buffs.some(b => b.id === 'rest')).toBe(false);   // nicht aus der Ferne
    at(t, 'bed');
    t.p.hp = 5;
    const xp0 = t.p.stats.xpPct;
    hs(t, { a: 'sleep' });
    const R = CFG.home.rest;
    expect(t.p.stats.xpPct).toBe(xp0 + R.xpPct);
    expect(t.p.hp).toBe(t.p.stats.maxHp);
    expect(c.rest).toBe(Math.round(c.playtime + R.sec));
    const before = c.xp; t.p.gainXp(1000);
    expect(c.xp - before).toBe(Math.round(1000 * (1 + (xp0 + R.xpPct) / 100)));
    // Tod nimmt die Ruhe nicht; Abmelden auch nicht – die Uhr läuft nur beim Spielen
    sim.step(100);
    sim.leave(t);
    sim.step(500);
    sim.reenter(t);
    const b = t.p.buffs.find(x => x.id === 'rest')!;
    expect(b).toBeTruthy();
    expect(b.until - sim.game.now).toBeGreaterThan(R.sec - 110);
    expect(b.until - sim.game.now).toBeLessThan(R.sec - 95);
    expect(t.p.stats.xpPct).toBe(xp0 + R.xpPct);
    sim.step(R.sec - 90);
    expect(t.p.buffs.some(x => x.id === 'rest')).toBe(false);
    expect(t.p.stats.xpPct).toBe(xp0);
    sim.leave(t); sim.reenter(t);
    expect(t.p.buffs.some(x => x.id === 'rest')).toBe(false);
    expect(t.p.char.rest).toBeUndefined();
    // ein ausgestelltes Wegzeichen: die Ruhe hält länger
    prove(t, ch => { ch.rift = { stufe: 1, seed: 1, best: {}, trial: 1 }; }, 'rift');
    hs(t, { a: 'trophy', slot: 0, id: 'm_sieben' });
    expect(trophyPerks(home(t)).rest).toBe(CFG.home.trophy.zeichen.rest);
    at(t, 'bed');
    hs(t, { a: 'sleep' });
    expect(t.p.char.rest).toBe(Math.round(t.p.char.playtime + R.sec * (1 + CFG.home.trophy.zeichen.rest)));
    // Besuch darf im Gästebett schlafen
    const v = fresh();
    sim.party(t, v);
    at(v, 'weg'); hs(v, { a: 'go', owner: t.p.id });
    at(v, 'bed'); hs(v, { a: 'sleep' });
    expect(v.p.buffs.some(x => x.id === 'rest')).toBe(true);
    CFG.home.rest.sec = sec0;
    sim.clear();
  });
});

describe('Trophäen', () => {
  it('aufstellen nur, was das Profil besitzt, nur auf vorhandene Ständer; Besucher sehen sie; je Art ein kleiner Bonus – einmal', () => {
    const t = settle(fresh('krieger', 30), 1), h = home(t);
    const gold0 = t.p.stats.goldPct, xp0 = t.p.stats.xpPct;
    hs(t, { a: 'trophy', slot: 0, id: 'borkenkoenig' });
    expect(h.stands[0]).toBe('');
    expect(t.toasts.at(-1)).toMatch(/hast du nicht/);
    // Trophäe eines seltenen Monsters (0.6: benutzen), eines Bosses (Sieg), eines Weltbosses
    t.give('tro_borkenkoenig'); t.give('tro_guenther');
    for (const b of ['tro_borkenkoenig', 'tro_guenther']) t.send({ t: 'use', uid: t.p.char.inv.find(i => i.base === b)!.uid });
    prove(t, c => { c.flags['b:dornenmutter'] = 1; c.flags['tr:moosgrimm'] = 1; });
    expect(['t:borkenkoenig', 't:guenther', 't:b_dornenmutter', 't:moosgrimm'].every(k => h.seen[k])).toBe(true);
    expect(notes(t).filter(s => /Trophäe für den Hof/.test(s)).length).toBe(4);
    hs(t, { a: 'trophy', slot: 0, id: 'borkenkoenig' });
    expect(h.stands[0]).toBe('borkenkoenig');
    expect(hobj(t, 'stand', 0).props).toMatchObject({ frame: 'trophy_stand', tro: 'borkenkoenig', label: 'Borkenkrone' });
    expect(t.p.stats.goldPct).toBe(gold0 + CFG.home.trophy.jagd.goldPct);
    hs(t, { a: 'trophy', slot: 1, id: 'guenther' });      // zweite Jagdtrophäe: kein zweiter Bonus
    expect(t.p.stats.goldPct).toBe(gold0 + CFG.home.trophy.jagd.goldPct);
    hs(t, { a: 'trophy', slot: 2, id: 'b_dornenmutter' });
    expect(t.p.stats.xpPct).toBe(xp0 + CFG.home.trophy.boss.xpPct);
    expect(trophyPerks(h).cats.sort()).toEqual(['boss', 'jagd']);
    // Ständer 3 gibt es auf Stufe 1 noch nicht
    hs(t, { a: 'trophy', slot: 3, id: 'moosgrimm' });
    expect(h.stands[3]).toBe('');
    hs(t, { a: 'trophy', slot: -1, id: 'moosgrimm' }); hs(t, { a: 'trophy', slot: 1.5 as any, id: 'gibtsnicht' });
    // umstellen: dieselbe Trophäe steht nie zweimal
    hs(t, { a: 'trophy', slot: 1, id: 'borkenkoenig' });
    expect(h.stands.slice(0, 3)).toEqual(['', 'borkenkoenig', 'b_dornenmutter']);
    hs(t, { a: 'trophy', slot: 0, id: 'moosgrimm' });
    expect(t.p.perk.rep).toBeCloseTo(1 + CFG.home.trophy.welt.rep);
    // Besuch sieht die Ständer mit Namen
    const v = fresh();
    sim.party(t, v);
    at(v, 'weg'); hs(v, { a: 'go', owner: t.p.id });
    const seen = lastInit(v).objs.filter(o => o.tag === 'stand' && o.props?.tro).map(o => [o.props!.idx, o.props!.tro, o.props!.label]);
    expect(seen.sort()).toEqual([[0, 'moosgrimm', 'Moosgrimms Flechtenbart'], [1, 'borkenkoenig', 'Borkenkrone'], [2, 'b_dornenmutter', 'Dorn der Dornenmutter']]);
    expect(v.p.stats.goldPct).toBe(0);                  // der Bonus gilt dem Profil des Besitzers
    // abräumen: Bonus weg, Ständer leer – und der Besuch bekommt die Änderung
    const ev0 = t.p.zone.events.length;
    hs(t, { a: 'trophy', slot: 1, id: '' });
    expect(t.p.stats.goldPct).toBe(gold0);
    expect(t.p.zone.events.slice(ev0).some(e => e.k === 'obj' && e.props?.tro === null)).toBe(true);
    // gespeichert wird mit dem nächsten Speichern des Charakters
    sim.game.savePlayer(t.p);
    expect(onDisk(t).h.stands.slice(0, 3)).toEqual(['moosgrimm', '', 'b_dornenmutter']);
    // ein Neuer Kreis löscht die Bosssiege des Charakters – die Trophäe bleibt dem Profil
    prove(t, c => { delete c.flags['b:dornenmutter']; });
    expect(h.seen['t:b_dornenmutter']).toBe(1);
    sim.clear();
  });
});

describe('Begleiter', () => {
  const stat = (t: Tester) => ({ ...t.p.stats, res: { ...t.p.stats.res } });
  it('Moosling: Belohnung von Tobis Quest; läuft gleich mit und sammelt Beute in weitem Umkreis', () => {
    const t = fresh('krieger', 5), z = t.p.zone;
    sim.gotoNpc(t, 'tobi');
    t.send({ t: 'qAccept', id: PET_QUEST, npc: 'tobi' });
    t.give('q_puppe');
    const far = CFG.player.pickupRadius * 2;
    z.dropGoldFor(t.p, 7, t.p.x + far, t.p.y);
    let gold = t.p.char.gold;
    tick();
    expect(t.p.char.gold).toBe(gold);                   // zu weit weg
    t.send({ t: 'qTurnIn', id: PET_QUEST, npc: 'tobi' });
    expect(t.p.char.quests[PET_QUEST].s).toBe('done');
    gold = t.p.char.gold;                               // Questlohn eingerechnet
    tick();
    expect(home(t).pets).toEqual(['moosling']);
    expect(t.p.char.pet).toBe('moosling');
    tick();
    expect(notes(t).some(s => /Neuer Begleiter: Moosling/.test(s))).toBe(true);
    expect(t.p.perk.pickup).toBe(PETS.moosling.pickup);
    expect(t.p.char.gold).toBe(gold + 7);               // der Moosling hat es geholt
    hs(t, { a: 'pet', id: '' });                        // ohne Begleiter wieder der normale Radius
    expect(t.p.perk.pickup).toBe(1);
    sim.clear();
  });
  it('Pilzling: an der Kochstelle angesetzt, dann aufgenommen – ein zweiter Topf bleibt ein Topf', () => {
    const t = fresh('krieger', 10), r = RECIPES.c_pilzling;
    for (const [b, k] of r.inputs) t.give(b, k * 2);
    t.p.char.gold = r.gold * 2;
    const fire = [...t.p.zone.objs.values()].find(o => o.type === 'cookfire')!;
    t.p.x = fire.x + 10; t.p.y = fire.y;
    t.send({ t: 'craft', id: 'c_pilzling', at: 'fire' }); t.send({ t: 'craft', id: 'c_pilzling', at: 'fire' });
    expect(t.count(PET_ITEM)).toBe(2);
    const regen = t.p.stats.hpRegen;
    t.send({ t: 'use', uid: t.p.char.inv.find(i => i.base === PET_ITEM)!.uid });
    expect(home(t).pets).toEqual(['pilzling']);
    expect(t.count(PET_ITEM)).toBe(1);
    expect(t.p.stats.hpRegen).toBeCloseTo(regen + 1.5);
    t.send({ t: 'use', uid: t.p.char.inv.find(i => i.base === PET_ITEM)!.uid });
    expect(t.count(PET_ITEM)).toBe(1);
    expect(t.toasts.at(-1)).toMatch(/wohnt schon bei dir/);
    sim.clear();
  });
  it('Glutfuchs (Ruf), Schneeeule (Schatz), Schattenkatze (seltenes Monster), Irrwisch (Weltboss), Quelldrachling (verborgenes Ende oder Prüfung): Quelle und Wirkung', () => {
    // Glutfuchs: Rang 3 bei den Aschennomaden
    let t = fresh('krieger', 20), s0 = stat(t);
    prove(t, c => { c.rep = { aschennomaden: CFG.living.rep.ranks[2] - 1 }; }, 'rep');
    expect(home(t).pets).toEqual([]);
    World.dev(sim.game, t.p, 'rep', ['aschennomaden', '1']);
    tick();
    expect(home(t).pets).toEqual(['glutfuchs']);
    expect(t.p.stats.res.fire).toBe(s0.res.fire + 10);
    expect(home(t).looks).toContain('w_glut');           // derselbe Ruf bringt auch den Waffenglanz (ab Rang 2)
    // Schneeeule: ein gehobener Schatz im Frostgebirge; Schatzkarten doppelt so oft
    t = fresh('waldlaeufer', 20);
    prove(t, c => { c.flags['tm:gruenwald'] = 2; });
    expect(home(t).pets).toEqual([]);
    prove(t, c => { c.flags['tm:frost'] = 1; });
    expect(home(t).pets).toEqual(['schneeeule']);
    expect(t.p.perk.maps).toBe(2);
    const maps = (who: Tester) => { const z = who.p.zone; sim.seed(z, 4711); const b = who.count('tmap_gruenwald'); who.p.char.inv = who.p.char.inv.filter(i => i.base === 'tmap_gruenwald'); for (let i = 0; i < 1500; i++) World.onChest(z, who.p, 'gold'); return who.count('tmap_gruenwald') - b; };
    const withOwl = maps(t);
    hs(t, { a: 'pet', id: '' });
    const without = maps(t);
    expect(withOwl / without).toBeGreaterThan(1.6);
    expect(withOwl / without).toBeLessThan(2.5);
    // Schattenkatze: ein seltenes Monster des Schattenreichs – echt besiegt
    t = fresh('krieger', 35); s0 = stat(t);
    sim.travel(t, 'schatten');
    const m = World.spawnRare(t.p.zone, 'stunde')!;
    t.p.x = m.x + 20; t.p.y = m.y;
    t.p.zone.hitMob(m, t.p, 1e9, 'phys');
    tick();
    expect(t.p.char.flags['rk:stunde']).toBe(1);
    expect(home(t).pets).toEqual(['schattenkatze']);
    expect(t.p.stats.goldPct).toBe(s0.goldPct + 8);
    expect(home(t).kills.r_stunde).toBe(1);              // und im Bestiarium steht es auch
    // Irrwisch: ein Weltboss
    t = fresh('magier', 20); s0 = stat(t);
    prove(t, c => { c.flags['wb:moosgrimm'] = 1; });
    expect(home(t).pets).toEqual(['wisp']);
    expect(t.p.stats.mpRegen).toBeCloseTo(s0.mpRegen + 1);
    // Quelldrachling: das verborgene Ende …
    t = fresh('paladin', 40); s0 = stat(t);
    prove(t, c => { c.flags['d:ende'] = 2; });
    expect(home(t).pets).toEqual([]);
    prove(t, c => { c.flags['d:ende'] = 3; });
    expect(home(t).pets).toEqual(['quelldrachling']);
    expect(t.p.stats.xpPct).toBe(s0.xpPct + 5);
    // … oder die Prüfung der Sieben
    t = fresh('schattenjaeger', 40);
    prove(t, c => { c.rift = { stufe: 20, seed: 1, best: {}, trial: 1 }; }, 'rift');
    expect(home(t).pets).toEqual(['quelldrachling']);
    sim.clear();
  });
  it('Runenkäfer: Meilenstein der Sammlung (25 Wesen) – mehr Ruf; wechseln geht überall, aber nur zu Begleitern, die man hat', () => {
    const t = fresh('krieger', 30), h = home(t);
    const z = sim.arena(t).z;
    const kinds = BESTIARY.filter(b => b.kind === 'mob').slice(0, 25);
    for (const b of kinds.slice(0, 24)) z.hitMob(sim.dummy(z, b.id, 5, t.p.x + 20, t.p.y, 10), t.p, 1e6, 'phys');
    expect(collCount(h, 'best')[0]).toBe(24);
    expect(h.pets).toEqual([]);
    z.hitMob(sim.dummy(z, kinds[24].id, 5, t.p.x + 20, t.p.y, 10), t.p, 1e6, 'phys');
    expect(h.pets).toEqual(['runenkaefer']);
    expect(h.ms).toEqual(['best10', 'best25']);
    expect(t.p.char.pet).toBe('runenkaefer');
    expect(t.p.perk.rep).toBeCloseTo(1.1);
    const rep = t.p.char.rep?.quellhain ?? 0;
    World.dev(sim.game, t.p, 'rep', ['quellhain', '100']);
    expect(t.p.char.rep!.quellhain).toBe(rep + 110);
    // wechseln
    hs(t, { a: 'pet', id: 'quelldrachling' });
    expect(t.p.char.pet).toBe('runenkaefer');
    expect(t.toasts.at(-1)).toMatch(/kennst du noch nicht/);
    Home.unlockPet(sim.game, t.p, 'wisp');
    expect(t.p.char.pet).toBe('runenkaefer');            // ein neuer Begleiter verdrängt den aktiven nicht
    hs(t, { a: 'pet', id: 'wisp' });
    expect(t.p.char.pet).toBe('wisp');
    expect(t.p.perk.rep).toBe(1);
    hs(t, { a: 'pet', id: 'einhorn' });
    expect(t.p.char.pet).toBe('wisp');
    sim.clear();
  });
  it('andere sehen den Begleiter: in der Spieler-Info beim Betreten und bei jedem Wechsel – nicht in jedem Snapshot', () => {
    const a = fresh(), b = fresh();
    Home.unlockPet(sim.game, a.p, 'glutfuchs'); Home.unlockPet(sim.game, a.p, 'schneeeule');
    expect(sim.game.playerInfo(a.p).pet).toBe('glutfuchs');
    expect(sim.game.playerInfo(b.p).pet).toBeUndefined();
    sim.travel(b, 'kristall'); sim.travel(b, 'gruenwald');
    expect(lastInit(b).players.find(p => p.id === a.p.id)!.pet).toBe('glutfuchs');
    tick();
    b.msgs.length = 0;
    hs(a, { a: 'pet', id: 'schneeeule' });
    tick();
    const snaps = b.msgs.filter(m => m.t === 's') as Extract<ServerMsg, { t: 's' }>[];
    const pl = snaps.flatMap(s => s.ev ?? []).filter(e => e.k === 'pl+' && e.p.id === a.p.id);
    expect(pl.length).toBe(1);
    expect((pl[0] as any).p.pet).toBe('schneeeule');
    expect(snaps.every(s => s.p.every(row => row.length === 8))).toBe(true);
    // gespeichert und wieder da
    sim.leave(a); sim.reenter(a);
    expect(a.p.char.pet).toBe('schneeeule');
    expect(sim.game.playerInfo(a.p).pet).toBe('schneeeule');
    // ein Begleiter, den das Profil (nicht mehr) kennt, läuft nicht mit
    a.p.char.pet = 'wisp';
    sim.leave(a); sim.reenter(a);
    expect(a.p.char.pet).toBeUndefined();
    sim.clear();
  });
});

describe('Sammlung', () => {
  it('Bestiarium: Siege zählen für alle Beteiligten; Schwächen zeigen sich nach einigen Siegen, Beute, sobald man sie besessen hat', () => {
    const t = fresh('krieger', 20), mate = fresh('magier', 20), h = home(t);
    sim.party(t, mate);
    const z = sim.arena(t).z;
    mate.p.x = t.p.x + 30; mate.p.y = t.p.y;
    const beast = BEASTS.moosling;
    expect(collCount(h, 'best')).toEqual([0, BESTIARY.length]);
    const slay = () => z.hitMob(sim.dummy(z, 'moosling', 3, t.p.x + 80, t.p.y, 10), t.p, 1e6, 'phys'); // Beute fällt außer Reichweite
    slay();
    expect(h.kills.moosling).toBe(1);
    expect(home(mate).kills.moosling).toBe(1);           // Gruppenmitglied in der Nähe
    expect(collCount(h, 'best')[0]).toBe(1);
    expect(studied(h, beast)).toBe(false);
    for (let i = 1; i < CFG.home.study; i++) slay();
    expect(h.kills.moosling).toBe(CFG.home.study);
    expect(studied(h, beast)).toBe(true);
    tick();
    expect(notes(t).filter(s => /Bestiarium: Moosling eingetragen/.test(s)).length).toBe(1);
    expect(notes(t).filter(s => /Schwächen von „Moosling“/.test(s)).length).toBe(1);
    // Beute
    expect(beast.drops).toContain('mm_chitin');
    expect(dropSeen(h, 'mm_chitin')).toBe(false);
    t.give('mm_chitin'); t.p.sync('inv'); tick();
    expect(dropSeen(h, 'mm_chitin')).toBe(true);
    // Bosse und benannte Gegner: bekannt ab dem ersten Sieg; gezählt über die Sieg-Zähler des Charakters
    prove(t, c => { c.flags['b:ignarok'] = 1; });
    prove(t, c => { c.flags['b:ignarok'] = 3; c.flags['rk:glucke'] = 1; });
    expect(h.kills['b:ignarok']).toBe(3);
    expect(h.kills.r_glucke).toBe(1);
    expect(studied(h, BEASTS['b:ignarok'])).toBe(true);
    expect(collCount(h, 'best')[0]).toBe(3);
    // der Client bekommt die Zahlen (gebündelt, nicht je Treffer)
    const sent = t.msgs.filter(m => m.t === 'home').map(m => (m as any).h as Partial<HomeData>).filter(x => x.kills);
    expect(sent.at(-1)!.kills).toEqual(h.kills);
    expect(sent.length).toBeLessThan(CFG.home.study);
    sim.clear();
  });
  it('Fundstücke, Rezepte, Trophäen, Begleiter, Erscheinungen zählen je Profil; Meilensteine zahlen genau einmal – Titel, Lagerplätze, Erscheinung', () => {
    const t = fresh('krieger', 40), h = home(t), c = t.p.char;
    const rng = new Rng(7);
    expect(collCount(h, 'fund')).toEqual([0, FINDS.length]);
    // sechs Fundstücke: Setteile, eine Legendäre Waffe, ein Boss-Unikat (über den Merker des Charakters)
    for (const piece of ['helm', 'armor', 'ring', 'amulet'] as const) t.p.addItem(makeSetPiece(rng, 'wurzelwacht', piece, 'krieger'));
    t.p.addItem(makeLegendary(rng, 'krieger', 40));
    tick();
    expect(collCount(h, 'fund')[0]).toBe(5);
    expect(h.ms).toEqual([]);
    expect(stashSlots(h)).toBe(baseSlots(h));
    prove(t, ch => { ch.flags['u:ysolde'] = 1; });
    expect(collCount(h, 'fund')[0]).toBe(6);
    expect(h.ms).toEqual(['fund6']);
    expect(stashSlots(h)).toBe(baseSlots(h) + CFG.home.slotBonus);
    // weggeben ändert nichts: einmal besessen bleibt gesammelt
    c.inv = c.inv.filter(i => !i.set); t.p.sync('inv'); tick();
    expect(collCount(h, 'fund')[0]).toBe(6);
    // Rezepte
    prove(t, ch => { ch.recipes = LEARNABLE.slice(0, 8).map(r => r.id); }, 'recipes');
    expect(collCount(h, 'rez')).toEqual([8, LEARNABLE.length]);
    expect(h.ms).toEqual(['fund6', 'rez8']);
    expect(stashSlots(h)).toBe(baseSlots(h) + 2 * CFG.home.slotBonus);
    // Trophäen: sechs → Titel
    expect(ownedTitles(c)).not.toContain('trophaeenjaeger');
    prove(t, ch => { for (const id of ['borkenkoenig', 'fliegenhut', 'tante_echo', 'guenther', 'glucke']) ch.flags['tr:' + id] = 1; });
    expect(collCount(h, 'tro')[0]).toBe(5);
    prove(t, ch => { ch.flags['b:dornenmutter'] = 1; });
    expect(collCount(h, 'tro')[0]).toBe(6);
    expect(h.ms).toContain('tro6');
    expect(c.flags[milestoneFlag('tro6')]).toBe(1);
    expect(ownedTitles(c)).toContain('trophaeenjaeger');
    t.send({ t: 'title', id: 'trophaeenjaeger' });
    expect(titleName(c)).toBe('Trophäenjäger');
    expect(sim.game.playerInfo(t.p).title).toBe('Trophäenjäger');
    // genau einmal: nichts wird ein zweites Mal ausgezahlt, egal wie oft die Sammlung neu liest
    const paid = () => notes(t).filter(s => /^Sammlung – /.test(s)).length;
    const [n0, ms0] = [paid(), [...h.ms]];
    expect(n0).toBe(3);
    for (let i = 0; i < 5; i++) { t.p.sync('flags', 'inv', 'recipes'); tick(); }
    Home.absorb(sim.game, t.p); Home.absorb(sim.game, t.p, true);
    tick();
    expect(h.ms).toEqual(ms0);
    expect(paid()).toBe(n0);
    expect(stashSlots(h)).toBe(baseSlots(h) + 2 * CFG.home.slotBonus);
    // die zusätzlichen Plätze sind echte Plätze
    Home.dev(sim.game, t.p, 'hof', ['0']);
    at(t, 'stash');
    c.inv = [];
    for (let i = 0; i < stashSlots(h); i++) { const g = gear(); c.inv.push(g); hs(t, { a: 'put', uid: g.uid }); }
    expect(h.stash.length).toBe(CFG.home.slots[0] + 2 * CFG.home.slotBonus);
    const extra = gear(); c.inv.push(extra); hs(t, { a: 'put', uid: extra.uid });
    expect(h.stash.length).toBe(CFG.home.slots[0] + 2 * CFG.home.slotBonus);
    // ein zweiter Charakter desselben Profils: führt den Titel, bekommt nichts doppelt
    const acc = t.s.account!.id, first = t.p.charId;
    sim.leave(t);
    t.msgs.length = 0;
    t.send({ t: 'charCreate', slot: 2, name: 'Erbe' + c.name.slice(3), cls: 'waldlaeufer' });
    t.send({ t: 'enter', id: sim.db.listChars(acc).find(x => x.id !== first)!.id });
    t.p = t.s.player!;
    expect(ownedTitles(t.p.char)).toContain('trophaeenjaeger');
    expect(home(t).ms).toEqual(ms0);
    expect(paid()).toBe(0);
    expect(collCount(home(t), 'fund')[0]).toBe(6);
    sim.clear();
  });
  it('große Meilensteine: 10 Wesen → Waffenglanz, 45 → Titel, 90 Einträge insgesamt → Goldenes Gewand', () => {
    const t = fresh('krieger', 40), h = home(t);
    Home.dev(sim.game, t.p, 'bestiarium', ['9']);
    expect(h.looks).toEqual([]);
    Home.dev(sim.game, t.p, 'bestiarium', ['10']);
    expect(h.looks).toEqual(['w_smaragd']);
    Home.dev(sim.game, t.p, 'bestiarium', ['45']);
    expect(h.ms).toEqual(['best10', 'best25', 'best45']);
    expect(ownedTitles(t.p.char)).toContain('naturkundler');
    expect(h.looks).not.toContain('gold');
    Home.dev(sim.game, t.p, 'trophaeen', []);
    Home.dev(sim.game, t.p, 'bestiarium', []);
    expect(h.looks).toContain('gold');
    expect(h.ms).toContain('alles90');
    sim.clear();
  });
  it('alter Spielstand: Beim ersten Betreten wird nachgetragen, was er beweist – einmal, auch für das Bestiarium der Bosse', () => {
    const t = fresh('krieger', 30), acc = t.p.accountId, id = t.p.charId;
    sim.leave(t);
    // ein Stand, wie ihn 0.6 geschrieben hätte: ohne `cv`, `pet`, `look` – mit allem, was die Sammlung lesen kann
    const old = sim.db.loadChar(acc, id)! as CharData;
    delete old.cv; delete old.pet; delete old.look; delete old.rest;
    old.quests[PET_QUEST] = { s: 'done', p: [], n: 1 };
    Object.assign(old.flags, { 'b:dornenmutter': 2, 'b:vael': 1, 'rk:borkenkoenig': 3, 'wb:aschenmaul': 1, 'tr:borkenkoenig': 1, 'u:dornenmutter': 1, 'tm:frost': 2, 'd:ende': 1 });
    old.rep = { quellhain: 900, aschennomaden: 300 };
    old.rift = { stufe: 12, seed: 3, best: { geode: [11, 400] }, trial: 0 };
    old.recipes = LEARNABLE.slice(0, 3).map(r => r.id);
    old.inv.push(makeSetPiece(new Rng(3), 'hohlekrone', 'ring', 'krieger'));
    sim.db.saveChar(id, old);
    sim.db.db.prepare('DELETE FROM homes WHERE account_id = ?').run(acc);
    // (der Profil-Stand im Speicher des laufenden Servers gehört zu diesem Test nicht dazu: neuer Server)
    const g2 = new Game(sim.db, sim.game.info), msgs: ServerMsg[] = [];
    const ses = g2.onConnect({ readyState: 1, send: (raw: string) => msgs.push(JSON.parse(raw)), close() {} } as any);
    g2.onMessage(ses, JSON.stringify({ t: 'hello', token: t.s.account!.token, name: 'Alt', v: 'test' }));
    g2.onMessage(ses, JSON.stringify({ t: 'enter', id }));
    const p = ses.player!, h = Home.of(g2, p);
    expect(p.char.cv).toBe(1);
    expect(h.kills).toEqual({ 'b:dornenmutter': 2, 'b:vael': 1, r_borkenkoenig: 3, wb_aschenmaul: 1 });
    expect(['t:borkenkoenig', 't:b_dornenmutter', 't:b_vael', 't:m_riss10', 't:m_ende1', 'f:uni:dornenmutter', 'f:set:hohlekrone:ring', 'r:' + LEARNABLE[0].id, 'i:potion_hp1'].filter(k => !h.seen[k])).toEqual([]);
    expect(h.seen['t:m_riss20']).toBeUndefined();
    expect([...h.pets].sort()).toEqual(['moosling', 'schneeeule', 'wisp']);
    expect([...h.looks].sort()).toEqual(['glut', 'schatten', 'w_glut', 'w_riss', 'w_stille', 'wald']);
    expect(h.owned).toBe(0);                             // ein Hof wird nicht verschenkt
    const note = msgs.filter(m => m.t === 'home').flatMap(m => (m as any).note ?? []).map((x: any) => x.s as string);
    expect(note.filter(s => /nachgetragen/.test(s)).length).toBe(1);
    expect(note.some(s => /Neuer Begleiter/.test(s))).toBe(false);   // eine Zusammenfassung statt zwanzig Meldungen
    // gespeichert – und beim nächsten Betreten zählt nichts doppelt
    g2.onMessage(ses, JSON.stringify({ t: 'leave' }));
    const g3 = new Game(sim.db, sim.game.info);
    const ses3 = g3.onConnect({ readyState: 1, send() {}, close() {} } as any);
    g3.onMessage(ses3, JSON.stringify({ t: 'hello', token: t.s.account!.token, name: 'Alt', v: 'test' }));
    g3.onMessage(ses3, JSON.stringify({ t: 'enter', id }));
    const h3 = Home.of(g3, ses3.player!);
    expect(h3.kills).toEqual(h.kills);
    expect([...h3.pets].sort()).toEqual(['moosling', 'schneeeule', 'wisp']);
    // ein weiterer Sieg zählt ab jetzt genau einmal
    ses3.player!.char.flags['b:dornenmutter'] = 3; ses3.player!.sync('flags');
    (g3 as any).tick(0.05);
    expect(h3.kills['b:dornenmutter']).toBe(3);
    g3.onMessage(ses3, JSON.stringify({ t: 'leave' }));
  });
});

describe('Erscheinungen', () => {
  it('freischalten über Ruf, Risse, Enden; anlegen am Kleiderschrank eines Hofs; andere sehen Gewand und Waffenglanz', () => {
    const t = settle(fresh('waldlaeufer', 30)), c = t.p.char, h = home(t), b = fresh();
    at(t, 'wardrobe');
    hs(t, { a: 'look', g: 'wald' });
    expect(c.look).toBeUndefined();
    expect(t.toasts.at(-1)).toMatch(/noch nicht freigeschaltet/);
    prove(t, ch => { ch.rep = { quellhain: CFG.living.rep.ranks[2], wintersassen: CFG.living.rep.ranks[2], grubenleute: CFG.living.rep.ranks[2] }; }, 'rep');
    expect([...h.looks].sort()).toEqual(['frost', 'w_kristall', 'wald']);
    prove(t, ch => { ch.rift = { stufe: 21, seed: 1, best: {} }; ch.flags['d:ende'] = 2; }, 'rift', 'flags');
    expect([...h.looks].sort()).toEqual(['frost', 'glut', 'schatten', 'w_kristall', 'w_riss', 'w_stern', 'w_wild', 'wald']);
    expect(notes(t).filter(s => /Neue Erscheinung/.test(s)).length).toBe(8);
    // nur am Schrank
    at(t, 'tor');
    hs(t, { a: 'look', g: 'wald' });
    expect(c.look).toBeUndefined();
    at(t, 'wardrobe');
    hs(t, { a: 'look', g: 'wald', w: 'w_stern' });
    expect(c.look).toEqual({ g: 'wald', w: 'w_stern' });
    // Gewand ist kein Waffenglanz und umgekehrt; Unbekanntes wird abgelehnt, ohne das Vorige zu ändern
    hs(t, { a: 'look', g: 'w_riss' }); hs(t, { a: 'look', w: 'frost' }); hs(t, { a: 'look', g: 'gold' }); hs(t, { a: 'look', w: 'quatsch' });
    expect(c.look).toEqual({ g: 'wald', w: 'w_stern' });
    hs(t, { a: 'look', w: 'w_riss' });                   // nur eines ändern
    expect(c.look).toEqual({ g: 'wald', w: 'w_riss' });
    expect(sim.game.playerInfo(t.p)).toMatchObject({ g: 'wald', w: 'w_riss' });
    expect(glowColor(c.look!.w)).toBe(LOOKS.w_riss.color);
    // ein Besucher sieht es beim Betreten und bei jedem Wechsel
    sim.party(t, b);
    at(b, 'weg'); hs(b, { a: 'go', owner: t.p.id });
    expect(lastInit(b).players.find(p => p.id === t.p.id)).toMatchObject({ g: 'wald', w: 'w_riss' });
    b.msgs.length = 0;
    hs(t, { a: 'look', g: 'frost', w: '' });
    tick();
    const pl = (b.msgs.filter(m => m.t === 's') as Extract<ServerMsg, { t: 's' }>[]).flatMap(s => s.ev ?? []).filter(e => e.k === 'pl+') as any[];
    expect(pl.at(-1).p.g).toBe('frost');
    expect(pl.at(-1).p.w).toBeUndefined();
    // der Besucher zieht sich am Schrank des Gastgebers um – mit seinen eigenen Erscheinungen
    at(b, 'wardrobe');
    hs(b, { a: 'look', g: 'frost' });
    expect(b.p.char.look).toBeUndefined();
    Home.unlockLook(sim.game, b.p, 'glut');
    hs(b, { a: 'look', g: 'glut' });
    expect(b.p.char.look).toEqual({ g: 'glut' });
    // ablegen, speichern, laden
    hs(t, { a: 'look', g: '' });
    expect(c.look).toBeUndefined();
    hs(t, { a: 'look', g: 'schatten', w: 'w_wild' });
    sim.leave(t); sim.reenter(t);
    expect(t.p.char.look).toEqual({ g: 'schatten', w: 'w_wild' });
    sim.clear();
  });
  it('fehlt das Sheet eines Gewands, wird das Grund-Sheet der Klasse eingefärbt – ist es da, wird es benutzt (eine einzige Stelle)', () => {
    for (const g of OUTFIT_IDS) {
      expect(outfitSheet(() => false, 'magier', g)).toEqual({ key: 'char_magier', tint: LOOKS[g].color });
      expect(outfitSheet(k => k === 'char_magier_' + g, 'magier', g)).toEqual({ key: 'char_magier_' + g });
      expect(outfitSheet(k => k === 'char_krieger_' + g, 'magier', g).key).toBe('char_magier'); // das Sheet einer anderen Klasse hilft nicht
    }
    expect(outfitSheet(() => true, 'paladin')).toEqual({ key: 'char_paladin' });
    expect(outfitSheet(() => true, 'paladin', 'w_stern')).toEqual({ key: 'char_paladin' });      // ein Waffenglanz ist kein Gewand
    expect(outfitSheet(() => true, 'paladin', 'gibtsnicht')).toEqual({ key: 'char_paladin' });
    expect(glowColor(undefined)).toBeUndefined();
    expect(glowColor('wald')).toBeUndefined();
  });
});

describe('Neuer Kreis', () => {
  it('behält Hof, Lager, Begleiter, Sammlung, Erscheinungen, Trophäen und den Weg nach Hause', () => {
    const t = settle(fresh('krieger', 40), 3), c = t.p.char, h = home(t);
    const sword = gear(30, 3); t.p.addItem(sword);
    c.gold = 5000;
    at(t, 'stash'); hs(t, { a: 'put', uid: sword.uid }); hs(t, { a: 'gold', n: 1234 });
    for (const q of QUEST_LIST) if (q.type === 'main') c.quests[q.id] = { s: 'done', p: [], n: 1 };
    c.quests[KREIS_QUEST] = { s: 'done', p: [], n: 1 };
    c.quests[PET_QUEST] = { s: 'done', p: [], n: 1 };
    Object.assign(c.flags, { 'd:ende': 3, 'b:hohlkoenig': 2, 'b:aetherion': 1, 'tr:quill': 1, 'rk:quill': 1, 't:frost': 1 });
    c.rep = { quellhain: 2500 };
    t.p.sync('flags', 'quests', 'rep'); tick();
    Home.dev(sim.game, t.p, 'bestiarium', ['12']);
    at(t, 'wardrobe'); hs(t, { a: 'look', g: 'schatten', w: 'w_lied' });
    hs(t, { a: 'pet', id: 'quelldrachling' });
    hs(t, { a: 'trophy', slot: 0, id: 'b_hohlkoenig' }); hs(t, { a: 'trophy', slot: 5, id: 'm_ende3' });
    at(t, 'bed'); hs(t, { a: 'sleep' });
    expect(h.pets).toEqual(expect.arrayContaining(['moosling', 'quelldrachling']));
    expect(h.ms).toContain('best10');
    const snap = JSON.stringify(h), stats = [t.p.stats.xpPct, t.p.perk.rep];
    hs(t, { a: 'leave' });
    sim.gotoNpc(t, 'mirelda');
    t.send({ t: 'kreis' });
    tick();
    expect(c.kreis).toBe(1);
    expect(c.quests[PET_QUEST]).toBeUndefined();          // die Geschichte beginnt neu …
    expect(c.flags['b:hohlkoenig']).toBeUndefined();
    expect(c.flags['t:frost']).toBeUndefined();
    expect(JSON.stringify(home(t))).toBe(snap);          // … der Profil-Stand bleibt, wie er war
    expect([c.pet, c.look, c.flags['t:heim']]).toEqual(['quelldrachling', { g: 'schatten', w: 'w_lied' }, 1]);
    expect(c.rest).toBeGreaterThan(c.playtime);
    expect([t.p.stats.xpPct, t.p.perk.rep]).toEqual(stats);
    expect(sim.game.playerInfo(t.p)).toMatchObject({ pet: 'quelldrachling', g: 'schatten', w: 'w_lied' });
    expect(t.p.zone.key).toBe('gruenwald#k1');
    // der Wegweiser steht auch in der Welt des neuen Kreises; der Hof ist derselbe
    at(t, 'weg'); hs(t, { a: 'go' });
    expect(t.p.zone.key).toBe(`${HOME_ID}:${t.p.accountId}`);
    expect(hobj(t, 'stand', 0).props!.tro).toBe('b_hohlkoenig');
    at(t, 'stash'); hs(t, { a: 'take', uid: sword.uid });
    expect(c.inv.some(i => i.uid === sword.uid)).toBe(true);
    expect(home(t).gold).toBe(1234);
    // zurück geht es in die Welt des eigenen Kreises
    hs(t, { a: 'leave' });
    expect(t.p.zone.key).toBe('gruenwald#k1');
    // Sieg-Zähler des neuen Kreises zählen wieder ab eins weiter
    prove(t, ch => { ch.flags['b:hohlkoenig'] = 1; });
    expect(home(t).kills['b:hohlkoenig']).toBe(3);
    // und nach Abmelden und Laden ist alles noch da
    sim.leave(t); sim.reenter(t);
    expect([t.p.char.pet, t.p.char.look, t.p.char.kreis]).toEqual(['quelldrachling', { g: 'schatten', w: 'w_lied' }, 1]);
    expect(home(t).level).toBe(3);
    sim.clear();
  });
});
