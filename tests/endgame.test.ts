/** Endspiel (0.5): Mana-Risse, Modifikatoren, Boss-Echos, Prüfung der Sieben, Quellstufen, Neuer Kreis, alte Spielstände. */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { sanitizeChar } from '../server/src/db';
import { ECHO_MECH } from '../server/src/echo';
import { questPoints } from '../server/src/endgame';
import { Rift, riftHome } from '../server/src/rift';
import type { Zone } from '../server/src/zone';
import { circleFree, lineClear } from '../shared/src/collision';
import { CFG, ELEMENTS } from '../shared/src/config';
import { craftBlock, makeLegendary, makeSetPiece } from '../shared/src/craft';
import { BOSSES, ENEMIES } from '../shared/src/data/enemies';
import { ITEMS, baseMods, equipLevel, generateGear, itemPrice, tierOf } from '../shared/src/data/items';
import { ECHO_FRAG } from '../shared/src/data/materials';
import { QUESTS, QUEST_LIST, questAvailable } from '../shared/src/data/quests';
import { ENCHANT_LIST, LEARNABLE, RECIPES, RECIPE_LIST, scrollOf } from '../shared/src/data/recipes';
import { ECHO_BOSS, ECHO_TINT, KREIS_QUEST, QUELL_MAX, QUELL_TRACKS, RIFT_DUNGEONS, RIFT_MOD_LIST, RIFT_UNLOCK_QUEST, TITLES, TRIAL_BOSSES, TRIAL_ID, TRIAL_RECIPE, attuneCap, attunePlan, counterOf, echoBossDef, kreisLevel, quellBonus, quellFree, riftMods, riftPar, riftRarity, riftRevives, riftUnlocked, seenEndings, trialUnlocked, type RiftModId } from '../shared/src/data/rifts';
import { ZONES } from '../shared/src/data/zones';
import { getMap, validateMap } from '../shared/src/maps/mapgen';
import { T, TILE } from '../shared/src/maps/tiles';
import { computeStats, newCharacter } from '../shared/src/stats';
import type { Element, RiftInfo, ServerMsg, ZoneInit } from '../shared/src/types';
import { Rng } from '../shared/src/util/rng';
import { Sim, type Tester } from './helpers/sim';

let sim: Sim;
beforeAll(() => { sim = new Sim(); });
afterAll(() => sim.close());

let n = 0;
/** Stellt den Spieler an den Riss-Stein von Quellhain. */
function toStone(t: Tester) {
  if (t.p.zone.id !== 'gruenwald' || t.p.zone.rift) sim.game.transfer(t.p, 'gruenwald', '');
  const o = [...t.p.zone.objs.values()].find(x => x.type === 'riftstone')!;
  t.p.x = o.x; t.p.y = o.y + 12;
}
/** Charakter auf Höchststufe, erster Akt abgeschlossen (Risse offen), am Riss-Stein. */
function hero(cls: 'krieger' | 'magier' | 'waldlaeufer' | 'paladin' | 'schattenjaeger' = 'krieger', stufe = 1): Tester {
  const t = sim.join('Held' + String.fromCharCode(65 + (n % 26)) + String.fromCharCode(65 + Math.floor(n / 26)), cls, 40);
  n++;
  t.p.char.quests[RIFT_UNLOCK_QUEST] = { s: 'done', p: [], n: 1 };
  t.p.char.rift = { stufe, seed: 1, best: {} };
  t.p.god = true;
  toStone(t);
  return t;
}
/** Sucht einen Zähler, bei dem der Riss genau diese Modifikatoren enthält (die Auswahl ist rein rechnerisch – wie in der Oberfläche). */
function seedFor(dungeon: string, stufe: number, want: RiftModId[], el?: Element, avoid: RiftModId[] = []): number {
  for (let s = 1; s < 20000; s++) {
    const r = riftMods(s, dungeon, stufe);
    if (want.every(m => r.mods.includes(m)) && !avoid.some(m => r.mods.includes(m)) && (!el || r.el === el)) return s;
  }
  throw new Error('kein passender Zähler für ' + want.join('+'));
}
/** Öffnet einen Riss mit einem bestimmten Modifikator (Stufe 1 hat genau einen). */
function open(t: Tester, dungeon = 'wurzelgruft', stufe = 1, mods: RiftModId[] = [], el?: Element, avoid: RiftModId[] = []): Zone {
  const st = t.p.char.rift!;
  st.stufe = Math.max(st.stufe, stufe);
  if (mods.length) st.seed = seedFor(dungeon, stufe, mods, el, avoid);
  toStone(t);
  t.send({ t: 'rift', a: 'start', dungeon, stufe });
  const z = t.p.zone;
  if (!z.rift) throw new Error('Riss nicht geöffnet: ' + t.toasts.at(-1));
  return z;
}
/** Ein Riss ohne Modifikatoren, die Gegnerwerte, Anzahl oder Element verändern (für Vergleichsläufe). */
const plain = (t: Tester, dungeon = 'wurzelgruft', stufe = 1) => open(t, dungeon, stufe, ['finsternis'], undefined, ['horde', 'hast', 'element', 'erwacht']);
const lastInit = (t: Tester) => (t.msgs.filter(m => m.t === 'zone').at(-1) as Extract<ServerMsg, { t: 'zone' }>).init as ZoneInit;
const lastRift = (t: Tester) => (t.msgs.filter(m => m.t === 'rift').at(-1) as Extract<ServerMsg, { t: 'rift' }> | undefined)?.r as RiftInfo | null | undefined;
/** Stellt den Spieler in den Bossraum, wartet den Kampfbeginn ab und erschlägt das Echo. */
function killBoss(t: Tester, z: Zone) {
  const b = z.boss!, room = z.map.bossRoom!;
  t.p.x = (room.cx + 0.5) * TILE; t.p.y = (room.cy + 3.5) * TILE;
  for (let i = 0; i < 80 && !b.active; i++) sim.step(0.05);
  expect(b.active, 'Bosskampf beginnt').toBe(true);
  b.mob.invuln = false;
  z.hitMob(b.mob, t.p, 1e9, 'phys');
  expect(b.mob.dead).toBe(true);
}
const riftChests = (z: Zone) => [...z.objs.values()].filter(o => o.type === 'chest' && o.props?.rift);

describe('Daten', () => {
  it('zwölf Modifikatoren mit Namen und Beschreibung; Auswahl ist eindeutig bestimmt und wächst mit der Stufe', () => {
    expect(RIFT_MOD_LIST.length).toBe(12);
    expect(new Set(RIFT_MOD_LIST.map(m => m.id)).size).toBe(12);
    for (const m of RIFT_MOD_LIST) { expect(m.name.length).toBeGreaterThan(3); expect(m.desc.length).toBeGreaterThan(20); }
    expect(riftMods(7, 'geode', 4)).toEqual(riftMods(7, 'geode', 4));
    for (const [s, k] of [[1, 1], [9, 1], [10, 2], [19, 2], [20, 3], [30, 3]]) {
      const r = riftMods(3, 'archiv', s);
      expect(r.mods.length, 'Stufe ' + s).toBe(k);
      expect(new Set(r.mods).size).toBe(k);
      expect(!!r.el).toBe(r.mods.includes('element'));
    }
    // über viele Zähler kommt jeder Modifikator vor, und die Auswahl hängt von Dungeon und Stufe ab
    const seen = new Set<string>();
    for (let s = 1; s < 200; s++) for (const m of riftMods(s, 'thron', 1).mods) seen.add(m);
    expect(seen.size).toBe(12);
    expect(new Set([1, 2, 3, 4, 5, 6].map(s => riftMods(s, 'thron', 25).mods.join())).size).toBeGreaterThan(3);
  });
  it('sechs Riss-Dungeons, sieben Echos mit Zusatzmechanik, Richtzeit und Seltenheit steigen mit der Stufe', () => {
    expect(RIFT_DUNGEONS.length).toBe(6);
    for (const d of RIFT_DUNGEONS) { expect(ZONES[d]?.kind).toBe('dungeon'); expect(ECHO_BOSS[ZONES[d].boss!], d).toBeTruthy(); }
    expect(TRIAL_BOSSES.length).toBe(7);
    for (const b of TRIAL_BOSSES) {
      expect(BOSSES[b], b).toBeTruthy();
      expect(ECHO_BOSS[b].mech.length).toBeGreaterThan(3);
      const m = ECHO_MECH[b];
      expect(m && (m.pattern || m.start || m.phase || (m.speed ?? 1) > 1), b + ': Zusatzmechanik').toBeTruthy();
      const e = echoBossDef(b, 60);
      expect(e.spared).toBeUndefined();
      expect(e.level).toBe(60 + CFG.rift.echo.levelPlus);
      expect(e.name).toBe(ECHO_BOSS[b].name);
    }
    expect(riftPar('thron', 1)).toBeGreaterThan(riftPar('wurzelgruft', 1));
    expect(riftPar('thron', 20)).toBeGreaterThan(riftPar('thron', 1));
    expect(riftRarity(1)).toEqual(CFG.rift.rarityLow);
    expect(riftRarity(CFG.rift.maxStufe)).toEqual(CFG.rift.rarityHigh);
    expect(riftRarity(15)[4]).toBeGreaterThan(riftRarity(1)[4]);
    expect(riftRevives(1)).toBe(CFG.rift.revives);
    expect(riftRevives(4)).toBe(CFG.rift.revives + 3 * CFG.rift.revivesPerExtra);
  });
  it('Echo-Fragmente haben Abnehmer im Handwerk; das Rezept der Prüfung wird nirgends zufällig gefunden', () => {
    expect(ITEMS[ECHO_FRAG]?.kind).toBe('material');
    expect(RECIPE_LIST.some(r => r.inputs.some(([b]) => b === ECHO_FRAG))).toBe(true);
    expect(ENCHANT_LIST.filter(e => e.cost.some(([b]) => b === ECHO_FRAG)).length).toBeGreaterThanOrEqual(4);
    expect(RECIPES[TRIAL_RECIPE]?.exclusive).toBe(true);
    expect(ITEMS[scrollOf(TRIAL_RECIPE)]).toBeTruthy();
    expect(LEARNABLE.filter(r => r.exclusive).map(r => r.id)).toEqual([TRIAL_RECIPE]);
    expect(TITLES.sieben.name.length).toBeGreaterThan(5);
  });
  it('Gegenstandsstufen über 40: Werte und Preise wachsen weiter, die Materialstufe bleibt die höchste, anlegbar ab Stufe 40', () => {
    expect(tierOf(41)).toBe(6); expect(tierOf(70)).toBe(6);
    expect(equipLevel(10)).toBe(8); expect(equipLevel(42)).toBe(40); expect(equipLevel(70)).toBe(40);
    const rng = new Rng(5);
    const a = generateGear(rng, 40, 3, 'krieger', 'weapon'), b = generateGear(rng, 55, 3, 'krieger', 'weapon'), c = generateGear(rng, 70, 3, 'krieger', 'weapon');
    for (const it of [a, b, c]) expect(ITEMS[it.base]?.tier).toBe(6);
    expect(baseMods(b).power!).toBeGreaterThan(baseMods(a).power!);
    expect(baseMods(c).power!).toBeGreaterThan(baseMods(b).power!);
    expect(itemPrice(c)).toBeGreaterThan(itemPrice(b));
    expect(itemPrice(b)).toBeGreaterThan(itemPrice(a));
    expect(CFG.upgrade.gold(70, 0)).toBeGreaterThan(CFG.upgrade.gold(40, 0));
    expect(CFG.rift.ilvl(CFG.rift.maxStufe)).toBeLessThanOrEqual(99); // sanitizeChar begrenzt auf 99
  });
});

describe('Riss-Stein und Freischaltung', () => {
  it('der Riss-Stein steht frei in Quellhain, abseits der Wege, und verändert die Karte nicht', () => {
    const m = getMap('gruenwald');
    expect(validateMap(m)).toEqual([]);
    expect(m.objects.some(o => o.type === 'riftstone')).toBe(false); // reines Server-Objekt
    const stones = [...sim.zone('gruenwald').objs.values()].filter(o => o.type === 'riftstone');
    expect(stones.length).toBe(1);
    const tx = Math.floor(stones[0].x / TILE), ty = Math.floor(stones[0].y / TILE);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const i = (ty + dy) * m.w + tx + dx;
      expect(m.solid[i]).toBe(0);
      expect(m.tiles[i] === T.PATH || m.tiles[i] === T.BRIDGE).toBe(false);
    }
    const dorf = m.def.pois!.find(p => p.id === 'dorf')!;
    expect(Math.hypot(tx - dorf.x, ty - dorf.y)).toBeLessThan(dorf.r + 6); // im Dorf
    expect(m.safe.some(s => Math.hypot(stones[0].x - s.x, stones[0].y - s.y) < s.r)).toBe(true);
    for (const o of m.objects) expect(Math.hypot(o.x - stones[0].x, o.y - stones[0].y)).toBeGreaterThan(20);
    expect(riftHome().zone).toBe('gruenwald');
    for (const id of ['kristall', 'wurzelgruft']) expect([...sim.zone(id).objs.values()].some(o => o.type === 'riftstone')).toBe(false);
  });
  it('erst nach dem Finale des ersten Akts, nur am Stein, nur freigeschaltete Stufen und Dungeons', () => {
    const t = sim.join('Neuling', 'krieger', 40);
    toStone(t);
    expect(riftUnlocked(t.p.char)).toBe(false);
    t.send({ t: 'rift', a: 'start', dungeon: 'wurzelgruft', stufe: 1 });
    expect(t.p.zone.rift).toBeNull();
    expect(t.toasts.at(-1)).toMatch(/Hohlen König/);
    // Akt I abschließen: der Stein erwacht
    t.p.char.quests[RIFT_UNLOCK_QUEST] = { s: 'done', p: [], n: 1 };
    expect(riftUnlocked(t.p.char)).toBe(true);
    // zu weit weg
    t.p.x += 200;
    t.send({ t: 'rift', a: 'start', dungeon: 'wurzelgruft', stufe: 1 });
    expect(t.p.zone.rift).toBeNull();
    expect(t.toasts.at(-1)).toMatch(/Riss-Stein/);
    toStone(t);
    // Stufe 2 ist noch zu, unbekannte Dungeons und Unsinn werden ignoriert
    for (const [dungeon, stufe] of [['wurzelgruft', 2], ['wurzelgruft', 0], ['wurzelgruft', -3], ['herz', 1], ['gruenwald', 1], ['gibtsnicht', 1], [TRIAL_ID, 1]] as [string, number][]) {
      t.send({ t: 'rift', a: 'start', dungeon, stufe });
      expect(t.p.zone.rift, `${dungeon}/${stufe}`).toBeNull();
    }
    t.send({ t: 'rift', a: 'join' });
    expect(t.p.zone.rift).toBeNull();
    t.send({ t: 'rift', a: 'start', dungeon: 'wurzelgruft', stufe: 1 });
    const z = t.p.zone;
    expect(z.rift).toBeTruthy();
    expect(z.id).toBe('wurzelgruft');
    const init = lastInit(t);
    expect(init.zone).toBe('wurzelgruft');
    expect(init.rift).toMatchObject({ dungeon: 'wurzelgruft', stufe: 1, par: riftPar('wurzelgruft', 1), revives: CFG.rift.revives });
    // die angezeigten Modifikatoren sind genau die vorher berechneten
    expect(init.rift!.mods).toEqual(riftMods(1, 'wurzelgruft', 1).mods);
    expect(Math.hypot(t.p.x - z.map.start.x, t.p.y - z.map.start.y)).toBeLessThan(2);
    // aus dem Riss heraus lässt sich kein weiterer öffnen
    t.send({ t: 'rift', a: 'start', dungeon: 'geode', stufe: 1 });
    expect(t.p.zone).toBe(z);
    t.send({ t: 'rift', a: 'leave' });
    expect(t.p.zone.id).toBe('gruenwald');
    expect(t.p.zone.rift).toBeNull();
    expect(Math.hypot(t.p.x - riftHome().x, t.p.y - riftHome().y)).toBeLessThan(2);
    // wer seinen Riss versehentlich verlassen hat, kann am Stein umkehren, solange die Instanz noch steht
    t.send({ t: 'rift', a: 'join' });
    expect(t.p.zone).toBe(z);
    t.send({ t: 'rift', a: 'leave' });
    sim.step(CFG.world.dungeonResetSec + 1);
    t.send({ t: 'rift', a: 'join' });
    expect(t.p.zone.rift).toBeNull();
    expect(t.toasts.at(-1)).toMatch(/kein Riss/);
    sim.clear();
  });
});

describe('Instanzen', () => {
  it('zwei Gruppen und der gewöhnliche Dungeon sehen einander nicht – weder Spieler noch Gegner noch Zustand', () => {
    const a = hero(), b = hero('magier'), c = sim.join('Wanderer', 'krieger', 20);
    const za = plain(a), zb = plain(b);
    sim.travel(c, 'wurzelgruft');
    const zc = c.p.zone;
    expect(new Set([za, zb, zc]).size).toBe(3);
    expect(zc).toBe(sim.zone('wurzelgruft'));           // der Story-Dungeon ist die gewohnte Instanz
    expect(zc.rift).toBeNull();
    for (const z of [za, zb]) { expect(z.id).toBe('wurzelgruft'); expect(z.key).not.toBe(z.id); expect(sim.game.zones.get(z.key)).toBe(z); }
    // jeder sieht nur sich selbst
    for (const [t, z] of [[a, za], [b, zb], [c, zc]] as [Tester, Zone][]) { expect([...z.players.values()]).toEqual([t.p]); expect(z.initFor(t.p).players).toEqual([]); }
    // getrennte Gegner mit eigenen Kennungen; der Story-Dungeon behält seine Stufen
    const ids = (z: Zone) => new Set([...z.mobs.keys()]);
    for (const id of ids(za)) { expect(ids(zb).has(id)).toBe(false); expect(ids(zc).has(id)).toBe(false); }
    expect(Math.max(...[...zc.mobs.values()].filter(m => !m.boss).map(m => m.lvl))).toBeLessThanOrEqual(ZONES.wurzelgruft.level[1]);
    expect(zc.boss!.def.name).toBe(BOSSES.dornenmutter.name);
    expect(zc.boss!.mob.lvl).toBe(BOSSES.dornenmutter.level);
    // ein Kampf in A lässt B und C unberührt
    const nb = zb.mobs.size, nc = zc.mobs.size;
    const victim = [...za.mobs.values()].find(m => !m.boss)!;
    za.hitMob(victim, a.p, 1e9, 'phys');
    expect(victim.dead).toBe(true);
    sim.step(0.2);
    expect(zb.mobs.size).toBe(nb); expect(zc.mobs.size).toBe(nc);
    // Türen und Schlüssel gehören zur Instanz
    za.keys = 3;
    expect(zb.keys).toBe(0); expect(zc.keys).toBe(0);
    const door = [...za.objs.values()].find(o => o.type === 'door' || o.type === 'bossdoor')!;
    za.setObjState(door, 1);
    const twin = [...zb.objs.values()].find(o => o.type === door.type && o.x === door.x && o.y === door.y)!;
    expect(twin.state).toBe(0);
    // der Sieg in A zählt nicht für B, und das Echo gibt weder Siegel noch Bossflagge noch Questfortschritt
    a.p.char.quests.m_wurzel = { s: 'active', p: [0] };
    killBoss(a, za);
    expect(za.rift!.done).toBeTruthy();
    expect(zb.rift!.done).toBeNull();
    expect(zb.boss!.mob.dead).toBe(false);
    expect(zc.boss!.mob.dead).toBe(false);
    expect(a.p.char.flags['b:dornenmutter']).toBeUndefined();
    expect(a.count('seal_earth')).toBe(0);
    expect(a.p.char.quests.m_wurzel.p[0] ?? 0).toBe(0);
    // Geschichte findet im Riss nicht statt: keine NPCs, Schreine oder Mana-Wogen
    expect([...za.objs.values()].some(o => o.type === 'npc' || o.type === 'shrine' || o.type === 'rift')).toBe(false);
    // verlassene Riss-Instanzen werden verworfen
    const key = za.key;
    a.send({ t: 'rift', a: 'leave' });
    sim.step(CFG.world.dungeonResetSec + 1);
    expect(sim.game.zones.has(key)).toBe(false);
    expect(sim.game.zones.has(zb.key)).toBe(true);
    sim.clear();
  });
  it('wer im Riss speichert oder die Welt verlässt, steht danach am Riss-Stein', () => {
    const t = hero();
    plain(t);
    const c = t.p.snapshotChar();
    expect(c.zone).toBe('gruenwald');
    expect(Math.hypot(c.x - riftHome().x, c.y - riftHome().y)).toBeLessThan(2);
    sim.leave(t); sim.reenter(t);
    expect(t.p.zone.id).toBe('gruenwald');
    expect(t.p.zone.rift).toBeNull();
    expect(Math.hypot(t.p.x - riftHome().x, t.p.y - riftHome().y)).toBeLessThan(2);
    sim.clear();
  });
  it('ein neuer Riss gibt den verlassenen auf; Umkehren führt immer in den jüngsten', () => {
    const t = hero(), z1 = plain(t, 'wurzelgruft'), key = z1.key;
    t.send({ t: 'rift', a: 'leave' });
    expect(sim.game.zones.has(key)).toBe(true);
    const z2 = plain(t, 'geode');
    expect(z2).not.toBe(z1);
    expect(sim.game.zones.has(key)).toBe(false);
    t.send({ t: 'rift', a: 'leave' });
    t.send({ t: 'rift', a: 'join' });
    expect(t.p.zone).toBe(z2);
    sim.clear();
  });
  it('Gruppe: nur der Anführer öffnet, Mitglieder am Stein kommen mit, Nachzügler können folgen', () => {
    const a = hero(), b = hero('magier'), c = hero('paladin'), d = hero('waldlaeufer');
    sim.party(a, b, c, d);
    d.p.char.quests = {};                                   // d hat den ersten Akt nicht abgeschlossen
    c.p.x += 2000; c.p.y += 600;                            // c steht weit weg
    b.send({ t: 'rift', a: 'start', dungeon: 'geode', stufe: 1 });
    expect(b.p.zone.rift).toBeNull();
    expect(b.toasts.at(-1)).toMatch(/anführt/);
    a.send({ t: 'rift', a: 'start', dungeon: 'geode', stufe: 1 });
    const z = a.p.zone;
    expect(z.rift).toBeTruthy();
    expect(b.p.zone).toBe(z);
    expect(c.p.zone.rift).toBeNull();
    expect(d.p.zone.rift).toBeNull();
    expect(z.rift!.revives).toBe(riftRevives(2));
    expect(z.initFor(a.p).players.map(p => p.name)).toEqual([b.p.name]);
    // c kommt nach, d darf nicht
    toStone(c);
    c.send({ t: 'rift', a: 'join' });
    expect(c.p.zone).toBe(z);
    d.send({ t: 'rift', a: 'join' });
    expect(d.p.zone.rift).toBeNull();
    // wer nicht zur Gruppe gehört, kann nicht folgen
    const e = hero('schattenjaeger');
    e.send({ t: 'rift', a: 'join' });
    expect(e.p.zone.rift).toBeNull();
    expect([...z.rift!.members].sort()).toEqual([a.p.charId, b.p.charId, c.p.charId].sort());
    sim.clear();
  });
});

describe('Skalierung und Belohnung', () => {
  it('Gegnerstufe, Leben und Schaden steigen mit der Riss-Stufe über die Höchststufe hinaus', () => {
    const t = hero();
    let prev = { lvl: 0, hp: 0, dmg: 0, boss: 0 };
    for (const stufe of [1, 10, 20, 30]) {
      const z = plain(t, 'wurzelgruft', stufe);
      const mobs = [...z.mobs.values()].filter(m => !m.boss && !m.elite && m.def.id === 'wurzelschleicher');
      expect(mobs.length).toBeGreaterThan(0);
      const m = mobs[0];
      expect(m.lvl).toBe(CFG.rift.mobLevel(stufe));
      expect(m.lvl).toBeGreaterThan(CFG.player.maxLevel);
      for (const o of z.mobs.values()) if (!o.boss) expect(o.lvl).toBe(CFG.rift.mobLevel(stufe));
      expect(m.maxHp).toBe(Math.round(Math.round(CFG.enemy.hp(m.lvl) * m.def.hpMul) * CFG.rift.hpMul(stufe)));
      expect(m.baseDmg).toBeCloseTo(CFG.enemy.dmg(m.lvl) * m.def.dmgMul * CFG.rift.dmgMul(stufe), 5);
      const b = z.boss!;
      expect(b.def.name).toBe(ECHO_BOSS.dornenmutter.name);
      expect(b.mob.lvl).toBe(CFG.rift.mobLevel(stufe) + CFG.rift.echo.levelPlus);
      expect(b.mob.maxHp).toBe(Math.round(CFG.enemy.hp(b.mob.lvl) * CFG.rift.echo.hpMul * CFG.rift.hpMul(stufe)));
      expect(b.mob.baseDmg).toBeCloseTo(CFG.enemy.dmg(b.mob.lvl) * CFG.rift.echo.dmgMul * CFG.rift.dmgMul(stufe), 5);
      expect(b.mob.info().tint).toBe(ECHO_TINT);
      expect(b.mob.info().name).toBe(ECHO_BOSS.dornenmutter.name);
      expect(m.lvl).toBeGreaterThan(prev.lvl); expect(m.maxHp).toBeGreaterThan(prev.hp); expect(m.baseDmg).toBeGreaterThan(prev.dmg); expect(b.mob.maxHp).toBeGreaterThan(prev.boss);
      prev = { lvl: m.lvl, hp: m.maxHp, dmg: m.baseDmg, boss: b.mob.maxHp };
      // Fallen und Gefahrenboden der Instanz richten sich nach der Riss-Stufe
      expect(z.def.level).toEqual([m.lvl, m.lvl]);
      t.send({ t: 'rift', a: 'leave' });
    }
    // alle sechs Echos sind gleich stark – unabhängig davon, wie stark das Original war
    const hps = RIFT_DUNGEONS.map(d => { const z = plain(t, d, 5); const hp = z.boss!.mob.maxHp; expect(z.boss!.def.name).toBe(ECHO_BOSS[ZONES[d].boss!].name); t.send({ t: 'rift', a: 'leave' }); return hp; });
    expect(new Set(hps).size).toBe(1);
    sim.clear();
  });
  it('Beute liegt auf der Gegenstandsstufe des Risses: Gegner, Dungeon-Truhen und die Belohnungstruhe', () => {
    const t = hero();
    for (const stufe of [1, 12, 30]) {
      const z = plain(t, 'geode', stufe), ilvl = CFG.rift.ilvl(stufe);
      expect(z.rift!.ilvl).toBe(ilvl);
      expect(ilvl).toBe(40 + stufe);
      // Gegner
      t.p.char.inv = [];
      sim.seed(z, 11);
      for (const m of [...z.mobs.values()].filter(m => !m.boss)) { m.hitters.add(t.p); z.killMob(m); }
      const gear = [...z.drops.values()].filter(d => d.item && ITEMS[d.item.base].tier);
      expect(gear.length).toBeGreaterThan(0);
      for (const d of gear) expect(d.item!.ilvl).toBe(ilvl);
      // gewöhnliche Truhe des Dungeons
      const chest = [...z.objs.values()].find(o => o.type === 'chest' && !o.props?.sealed && o.props?.guard === undefined && o.props?.tier !== 'wood')!;
      t.p.x = chest.x; t.p.y = chest.y + 10;
      t.send({ t: 'interact', id: chest.id });
      const got = t.p.char.inv.filter(i => ITEMS[i.base].tier && !i.set);
      expect(got.length).toBeGreaterThan(0);
      for (const it of got) expect(it.ilvl).toBe(ilvl);
      // Belohnungstruhe des Echos
      t.p.char.inv = [];
      killBoss(t, z);
      const rc = riftChests(z);
      expect(rc.length).toBeGreaterThanOrEqual(1);
      t.p.x = rc[0].x; t.p.y = rc[0].y + 10;
      t.send({ t: 'interact', id: rc[0].id });
      const loot = t.p.char.inv.filter(i => ITEMS[i.base].tier);
      expect(loot.length).toBeGreaterThanOrEqual(CFG.rift.chestGear);
      for (const it of loot) { expect(it.ilvl).toBe(ilvl); expect(it.rarity).toBeGreaterThanOrEqual(1); }
      expect(t.count(ECHO_FRAG)).toBe(CFG.rift.fragments(stufe));
      // die Truhe ist persönlich und nur einmal zu öffnen
      t.send({ t: 'interact', id: rc[0].id });
      expect(t.count(ECHO_FRAG)).toBe(CFG.rift.fragments(stufe));
      // und alles davon lässt sich auf Stufe 40 anlegen
      const w = t.p.char.inv.find(i => ITEMS[i.base].tier && ITEMS[i.base].kind !== 'accessory' && ITEMS[i.base].kind !== 'material');
      if (w) { t.send({ t: 'equip', uid: w.uid }); expect(Object.values(t.p.char.equip).some(e => e?.uid === w.uid)).toBe(true); }
      const exit = [...z.objs.values()].find(o => o.type === 'exit' && o.dynamic)!;
      expect(exit.props!.label).toBe('Quellhain');
      // das Portal nimmt niemanden versehentlich mit: erst beim Berühren geht es zurück
      t.p.exitImmuneUntil = 0; t.p.x = exit.x; t.p.y = exit.y;
      sim.step(0.3);
      expect(t.p.zone).toBe(z);
      t.send({ t: 'interact', id: exit.id });
      expect(t.p.zone.id).toBe('gruenwald');
      expect(t.p.zone.rift).toBeNull();
    }
    expect(CFG.rift.fragments(30)).toBeGreaterThan(CFG.rift.fragments(1));
    sim.clear();
  });
});

/** Entfernt alle gewöhnlichen Gegner der Instanz (der Boss bleibt), damit eine Messung ungestört ist. */
function clearMobs(z: Zone) { for (const m of [...z.mobs.values()]) if (!m.boss) z.mobs.delete(m.id); }
/** Freier Platz in einem Kampfraum, an dem Spieler und ein Gegner in `d` Pixeln Abstand mit freier Sicht stehen können. */
function spot(z: Zone, d: number): { x: number; y: number; mx: number; my: number } {
  for (const s of z.map.spawns) for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2, mx = s.x + Math.cos(a) * d, my = s.y + Math.sin(a) * d;
    if (circleFree(z.solidWalk, s.x, s.y, 8) && circleFree(z.solidWalk, mx, my, 8) && lineClear(z.solidFly, s.x, s.y, mx, my) && lineClear(z.solidWalk, s.x, s.y, mx, my)) return { x: s.x, y: s.y, mx, my };
  }
  throw new Error('kein freier Platz');
}
const hostile = (z: Zone, kind: 'zone' | 'tele') => [...z.fx.values()].filter(f => f.hostile && f.kind === kind);
const shown = (t: Tester, mod: RiftModId) => expect(lastInit(t).rift!.mods, 'Anzeige: ' + mod).toContain(mod);

describe('Modifikatoren', () => {
  it('Glutspur: besiegte Gegner hinterlassen brennenden Boden, der Schaden macht', () => {
    const t = hero(), z = open(t, 'wurzelgruft', 1, ['brand']);
    shown(t, 'brand');
    const m = [...z.mobs.values()].find(o => !o.boss)!, pos = { x: m.x, y: m.y };
    clearMobs(z); z.mobs.set(m.id, m);
    expect(hostile(z, 'zone').length).toBe(0);
    z.hitMob(m, t.p, 1e9, 'phys');
    const f = hostile(z, 'zone');
    expect(f.length).toBe(1);
    expect(f[0]).toMatchObject({ el: 'fire', r: CFG.rift.brand.radius });
    expect(Math.hypot(f[0].x - pos.x, f[0].y - pos.y)).toBeLessThan(1);
    // wer darin steht, brennt; wer daneben steht, nicht
    t.p.god = false; t.p.x = pos.x; t.p.y = pos.y; t.p.iframesUntil = 0;
    const hp = t.p.hp;
    sim.step(1.5);
    expect(t.p.hp).toBeLessThan(hp);
    t.p.statuses.clear(); t.p.x = pos.x + CFG.rift.brand.radius + 20; t.p.hp = t.p.stats.maxHp;
    sim.step(1.5);
    expect(t.p.hp).toBe(t.p.stats.maxHp);
    // nach Ablauf ist der Boden wieder frei
    sim.step(CFG.rift.brand.dur);
    expect(hostile(z, 'zone').length).toBe(0);
    // ohne den Modifikator bleibt nichts zurück
    t.p.god = true;
    t.send({ t: 'rift', a: 'leave' });
    const z2 = open(t, 'wurzelgruft', 1, ['versiegt']);
    z2.hitMob([...z2.mobs.values()].find(o => !o.boss)!, t.p, 1e9, 'phys');
    expect(hostile(z2, 'zone').length + hostile(z2, 'tele').length).toBe(0);
    sim.clear();
  });
  it('Berstend: Gegner zerplatzen kurz nach dem Tod – wer weggeht, bleibt heil', () => {
    const t = hero(), z = open(t, 'wurzelgruft', 1, ['bersten']);
    shown(t, 'bersten');
    const list = [...z.mobs.values()].filter(o => !o.boss).slice(0, 2);
    clearMobs(z);
    const boom = (stay: boolean) => {
      const m = list.pop()!; z.mobs.set(m.id, m);
      t.p.god = true;
      z.hitMob(m, t.p, 1e9, 'phys');
      const f = hostile(z, 'tele');
      expect(f.length).toBe(1);
      expect(f[0].r).toBe(CFG.rift.bersten.radius);
      expect(f[0].dur).toBeCloseTo(CFG.rift.bersten.delay, 5);
      t.p.god = false; t.p.iframesUntil = 0; t.p.hp = t.p.stats.maxHp;
      t.p.x = m.x + (stay ? 6 : CFG.rift.bersten.radius + 30); t.p.y = m.y;
      sim.step(CFG.rift.bersten.delay - 0.2);
      expect(t.p.hp).toBe(t.p.stats.maxHp);                 // angekündigt, noch kein Schaden
      sim.step(0.4);
      expect(hostile(z, 'tele').length).toBe(0);
      return t.p.stats.maxHp - t.p.hp;
    };
    expect(boom(true)).toBeGreaterThan(0);
    expect(boom(false)).toBe(0);
    sim.clear();
  });
  it('Elementwoche: alle Gegner und das Echo tragen ein Element, widerstehen ihm und sind für das Gegenelement anfällig', () => {
    for (const el of ['fire', 'light'] as Element[]) {
      const t = hero(), z = open(t, 'geode', 1, ['element'], el);
      shown(t, 'element');
      expect(lastInit(t).rift!.el).toBe(el);
      expect(z.rift!.el).toBe(el);
      for (const m of z.mobs.values()) expect(m.element, m.name).toBe(el);
      expect(z.boss!.def.element).toBe(el);
      const counter = counterOf(el)!;
      expect(ELEMENTS).toContain(counter);
      const m = [...z.mobs.values()].find(o => !o.boss && o.def.id === 'kristallkrabbler')!; // sonst: Erde, schwach gegen Dunkelheit
      m.maxHp = m.hp = 1e9;
      const hit = (e: Element) => z.hitMob(m, null, 1000, e, { dot: true });
      const same = 1000 * CFG.combat.elemSame * CFG.elements.resistMul, strong = 1000 * CFG.combat.elemStrong * CFG.elements.weakMul;
      expect(hit('phys')).toBe(1000);
      expect(hit(el)).toBe(Math.round(same));
      expect(hit(counter)).toBe(Math.round(strong));
      if (el === 'fire') expect(hit('dark')).toBe(1000);     // die alte Schwäche der Art gilt in dieser Woche nicht
      // das Echo ebenso; später beschworene Gegner auch
      const b = z.boss!.mob; b.invuln = false; b.maxHp = b.hp = 1e9;
      expect(z.hitMob(b, null, 1000, el, { dot: true })).toBe(Math.round(same));
      expect(z.hitMob(b, null, 1000, counter, { dot: true })).toBe(Math.round(strong));
      const add = z.spawnMob('fledermaus', z.rift!.lvl, m.x, m.y);
      expect(add.element).toBe(el);
      // der Schaden der Gegner trägt das Element: Resistenz dagegen hilft
      t.p.god = false; t.p.iframesUntil = 0;
      sim.seed(z, 3); const raw = z.hitPlayer(t.p, 200, m.element, 40, 'Test');
      t.p.addBuff({ id: 'x', name: 'x', glyph: 'x', until: 1e9, mods: { resAll: 40 }, shield: 0 });
      t.p.hp = t.p.stats.maxHp; t.p.iframesUntil = 0;
      sim.seed(z, 3); const res = z.hitPlayer(t.p, 200, m.element, 40, 'Test');
      expect(res).toBeLessThan(raw * 0.65);
      sim.clear();
    }
  });
  it('Finsternis: Gegner bemerken den Spieler erst aus der Nähe; die Anzeige erhält den Modifikator für das Licht', () => {
    const dist = 100;
    const probe = (mods: RiftModId[]) => {
      const t = hero(), z = open(t, 'wurzelgruft', 1, mods);
      clearMobs(z);
      const s = spot(z, dist);
      const m = z.spawnMob('wurzelschleicher', z.rift!.lvl, s.mx, s.my, false);
      m.hx = m.x; m.hy = m.y; m.wanderT = 1e9; m.wx = m.x; m.wy = m.y;
      t.p.x = s.x; t.p.y = s.y;
      sim.step(0.5);
      const r = { state: m.state, aggro: z.mod.aggro, t };
      return r;
    };
    const aggro = ENEMIES.wurzelschleicher.aggro;
    expect(aggro * CFG.rift.finsternis.aggro).toBeLessThan(dist);
    expect(aggro).toBeGreaterThan(dist);
    const dark = probe(['finsternis']);
    shown(dark.t, 'finsternis');
    expect(dark.aggro).toBe(CFG.rift.finsternis.aggro);
    expect(dark.state).toBe('idle');
    const lit = probe(['versiegt']);
    expect(lit.aggro).toBe(1);
    expect(lit.state).not.toBe('idle');
    expect(CFG.rift.finsternis.light).toBeLessThan(1);
    sim.clear();
  });
  it('Versiegt: Tränke, Heilzauber, Lebensraub und Regeneration wirken nur zur Hälfte', () => {
    const half = CFG.rift.versiegt.heal;
    const t = hero('paladin'), z = open(t, 'wurzelgruft', 1, ['versiegt']);
    shown(t, 'versiegt');
    clearMobs(z);
    expect(z.mod.heal).toBe(half);
    t.p.hp = 100; t.p.heal(200);
    expect(t.p.hp).toBeCloseTo(100 + 200 * half, 5);
    // Trank
    t.p.hp = 100; t.give('potion_hp1', 1);
    t.send({ t: 'use', uid: t.p.char.inv.find(i => i.base === 'potion_hp1')!.uid });
    expect(t.p.hp).toBeCloseTo(100 + ITEMS.potion_hp1.use!.hp! * half, 5);
    // Regeneration (außerhalb des Kampfes vierfach)
    t.p.hp = 100; t.p.lastHurtAt = -99;
    sim.step(2);
    expect(t.p.hp).toBeCloseTo(100 + t.p.stats.hpRegen * 4 * 2 * half, 1);
    // Lebensraub
    t.p.addBuff({ id: 'ls', name: 'x', glyph: 'x', until: 1e9, mods: { lifesteal: 10 }, shield: 0 });
    const d = sim.dummy(z, 'wurzelschleicher', 40, t.p.x + 20, t.p.y);
    t.p.hp = 100;
    const dealt = z.hitMob(d, t.p, 500, 'phys');
    expect(t.p.hp).toBeCloseTo(100 + dealt * 0.1 * half, 5);
    // zum Vergleich ein Riss ohne den Modifikator
    t.send({ t: 'rift', a: 'leave' });
    const z2 = open(t, 'wurzelgruft', 1, ['finsternis']);
    expect(z2.mod.heal).toBe(1);
    t.p.hp = 100; t.p.heal(200);
    expect(t.p.hp).toBeCloseTo(300, 5);
    sim.clear();
  });
  it('Horden und Erwachte Schar: mehr, aber schwächere Gegner bzw. deutlich mehr Erwachte', () => {
    const rnd = vi.spyOn(Math, 'random').mockReturnValue(0.4217); // gleicher Zufall für alle drei Instanzen
    try {
      const t = hero();
      const census = (mods: RiftModId[], avoid: RiftModId[]) => {
        const z = open(t, 'thron', 1, mods, undefined, avoid);
        const mobs = [...z.mobs.values()].filter(m => !m.boss);
        const plainMob = mobs.find(m => !m.elite)!;
        const r = { n: mobs.length, elites: mobs.filter(m => m.elite).length, hp: plainMob.maxHp, dmg: plainMob.baseDmg, base: Math.round(CFG.enemy.hp(plainMob.lvl) * plainMob.def.hpMul), baseDmg: CFG.enemy.dmg(plainMob.lvl) * plainMob.def.dmgMul, spawns: z.map.spawns.length, z, mods: lastInit(t).rift!.mods };
        t.send({ t: 'rift', a: 'leave' });
        return r;
      };
      const base = census(['finsternis'], []);
      expect(base.n).toBe(base.spawns);
      expect(base.hp).toBe(base.base);
      const horde = census(['horde'], []);
      expect(horde.mods).toContain('horde');
      expect(horde.n).toBeGreaterThan(base.n * 1.5);
      expect(horde.n).toBeLessThanOrEqual(base.n * 2);
      expect(horde.hp).toBe(Math.round(horde.base * CFG.rift.horde.hp));
      expect(horde.dmg).toBeCloseTo(horde.baseDmg * CFG.rift.horde.dmg, 5);
      const elite = census(['erwacht'], []);
      expect(elite.mods).toContain('erwacht');
      expect(elite.n).toBe(base.n);
      expect(elite.elites).toBeGreaterThan(base.elites * 2);
      expect(elite.elites / elite.n).toBeGreaterThan(0.2);
    } finally { rnd.mockRestore(); }
    sim.clear();
  });
  it('Wuchernd: unbehelligte Gegner heilen; Brennen hält die Wunde offen', () => {
    const t = hero(), z = open(t, 'wurzelgruft', 1, ['wucher']), R = CFG.rift.wucher;
    shown(t, 'wucher');
    clearMobs(z);
    const d = sim.dummy(z, 'wurzelschleicher', 40, t.p.x + 30, t.p.y, 1e6);
    z.hitMob(d, t.p, 1, 'phys', { extra: true });
    d.hp = 5e5;
    sim.step(R.calm - 0.5);
    expect(d.hp).toBe(5e5);                                   // noch in der Schonfrist
    sim.step(1.5);
    expect(d.hp).toBeGreaterThan(5e5 + 1e6 * R.regen * 0.8);
    expect(d.hp).toBeLessThan(5e5 + 1e6 * R.regen * 1.3);
    // Brennen (auch Gift) unterbricht die Heilung
    z.applyStatusMob(d, { id: 'burn', dur: 30 }, 0);
    const hp = d.hp;
    sim.step(2);
    expect(d.hp).toBe(hp);
    // ohne den Modifikator heilt niemand
    t.send({ t: 'rift', a: 'leave' });
    const z2 = open(t, 'wurzelgruft', 1, ['finsternis']);
    clearMobs(z2);
    const d2 = sim.dummy(z2, 'wurzelschleicher', 40, t.p.x + 30, t.p.y, 1e6);
    d2.hp = 5e5;
    sim.step(R.calm + 2);
    expect(d2.hp).toBe(5e5);
    sim.clear();
  });
  it('Gehetzt: Gegner laufen schneller und greifen häufiger an (auch beschworene und das Echo)', () => {
    const t = hero(), z = open(t, 'geode', 1, ['hast']), H = CFG.rift.hast;
    shown(t, 'hast');
    for (const m of z.mobs.values()) if (!m.boss) { expect(m.speed).toBeCloseTo(m.def.speed * H.speed, 5); expect(m.cdMul).toBe(H.cd); }
    expect(z.boss!.def.speed).toBeCloseTo(BOSSES.kristallkoloss.speed * H.speed, 5);
    expect(z.spawnMob('fledermaus', 42, t.p.x, t.p.y).cdMul).toBe(H.cd);
    // Angriffspause nach einem Schlag
    const pause = (zz: Zone) => {
      clearMobs(zz);
      const s = spot(zz, 14);
      t.p.x = s.x; t.p.y = s.y;
      const m = zz.spawnMob('kristallkrabbler', 42, s.mx, s.my);
      m.target = t.p; m.state = 'chase';
      for (let i = 0; i < 100 && (m.state as string) !== 'recover'; i++) sim.step(0.05);
      expect(m.state).toBe('recover');
      return m.cdUntil - sim.game.now;
    };
    const fast = pause(z);
    t.send({ t: 'rift', a: 'leave' });
    const slow = pause(open(t, 'geode', 1, ['finsternis']));
    expect(fast / slow).toBeCloseTo(H.cd, 1);
    sim.clear();
  });
  it('Gläsern: mehr erlittener Schaden, dafür kürzere Abklingzeiten', () => {
    const G = CFG.rift.glas;
    const measure = (mods: RiftModId[]) => {
      const t = hero(), z = open(t, 'wurzelgruft', 1, mods);
      clearMobs(z);
      t.p.god = false; t.p.iframesUntil = 0;
      sim.seed(z, 9);
      const dmg = z.hitPlayer(t.p, 300, 'phys', 42, 'Test');
      const skill = t.p.char.hotbar[0]!;
      t.p.mp = t.p.stats.maxMp;
      t.send({ t: 'skill', id: skill, ang: 0, tx: t.p.x + 20, ty: t.p.y });
      const cd = (t.msgs.filter(m => m.t === 'cd' && m.id === skill).at(-1) as Extract<ServerMsg, { t: 'cd' }>).cd;
      return { dmg, cd, t, z };
    };
    const glass = measure(['glas']), normal = measure(['finsternis']);
    shown(glass.t, 'glas');
    expect(glass.z.mod).toMatchObject({ dmgTaken: G.dmgTaken, cd: G.cd });
    expect(glass.dmg / normal.dmg).toBeCloseTo(G.dmgTaken, 1);
    expect(glass.cd / normal.cd).toBeCloseTo(G.cd, 5);
    expect(glass.cd).toBeLessThan(normal.cd);
    sim.clear();
  });
  it('Manasturm: regelmäßig schlägt ein angekündigter Blitz dort ein, wo der Spieler steht', () => {
    const t = hero(), z = open(t, 'wurzelgruft', 1, ['sturm']), S = CFG.rift.sturm;
    shown(t, 'sturm');
    clearMobs(z);
    expect(hostile(z, 'tele').length).toBe(0);
    sim.step(S.every + 2.1);
    let f = hostile(z, 'tele');
    expect(f.length).toBe(1);
    expect(f[0].r).toBe(S.radius);
    expect(Math.hypot(f[0].x - t.p.x, f[0].y - t.p.y)).toBeLessThan(1);
    // stehen bleiben tut weh
    t.p.god = false; t.p.iframesUntil = 0;
    const hp = t.p.hp;
    sim.step(S.delay + 0.1);
    expect(t.p.hp).toBeLessThan(hp);
    // beim nächsten Einschlag ausweichen
    t.p.hp = t.p.stats.maxHp; t.p.lastHurtAt = -99;
    sim.step(S.every - S.delay - 0.2 + 0.2);
    f = hostile(z, 'tele');
    expect(f.length).toBe(1);
    t.p.x += S.radius + 20;
    if (!circleFree(z.solidWalk, t.p.x, t.p.y, 5)) t.p.x -= 2 * (S.radius + 20);
    sim.step(S.delay + 0.1);
    expect(t.p.hp).toBe(t.p.stats.maxHp);
    sim.clear();
  });
  it('Manadürre: halbe Mana-Regeneration, doppeltes Mana durch Standardangriffe', () => {
    const D = CFG.rift.duerre;
    const measure = (mods: RiftModId[]) => {
      const t = hero('krieger'), z = open(t, 'wurzelgruft', 1, mods);
      clearMobs(z);
      t.p.mp = 0;
      sim.step(2);
      const regen = t.p.mp;
      sim.dummy(z, 'wurzelschleicher', 40, t.p.x + 14, t.p.y);
      t.p.mp = 0;
      t.send({ t: 'atk', ang: 0 });
      return { regen, gain: t.p.mp, t, z, rate: t.p.stats.mpRegen };
    };
    const dry = measure(['duerre']), normal = measure(['finsternis']);
    shown(dry.t, 'duerre');
    expect(dry.z.mod).toMatchObject({ mpRegen: D.regen, mpGain: D.gain });
    expect(normal.regen).toBeCloseTo(normal.rate * 2, 1);
    expect(dry.regen).toBeCloseTo(dry.rate * 2 * D.regen, 1);
    expect(normal.gain).toBeGreaterThan(0);
    expect(dry.gain).toBeCloseTo(normal.gain * D.gain, 5);
    sim.clear();
  });
  it('höhere Stufen tragen mehrere Modifikatoren zugleich – alle wirken', () => {
    const t = hero(), z = open(t, 'archiv', 20, ['glas', 'versiegt', 'hast']);
    expect(lastInit(t).rift!.mods.length).toBe(3);
    expect(z.mod).toMatchObject({ dmgTaken: CFG.rift.glas.dmgTaken, heal: CFG.rift.versiegt.heal });
    for (const m of z.mobs.values()) if (!m.boss) expect(m.cdMul).toBe(CFG.rift.hast.cd);
    expect(Rift.modNames(z.rift!).length).toBe(3);
    sim.clear();
  });
});

/** Stellt den Spieler in den Bossraum und wartet, bis der Kampf läuft. */
function fight(t: Tester, z: Zone) {
  const b = z.boss!, room = z.map.bossRoom!;
  t.p.x = (room.cx + 0.5) * TILE; t.p.y = (room.cy + 3.5) * TILE;
  for (let i = 0; i < 80 && !b.active; i++) sim.step(0.05);
  expect(b.active, 'Bosskampf beginnt').toBe(true);
  return b;
}
const summoned = (z: Zone, mob: string) => [...z.mobs.values()].filter(m => m.summoned && m.def.id === mob).length;
/** Lässt ein Muster vollständig ablaufen (ohne Wartezeiten) und zählt, was es an Ankündigungen und Flächen hinterlässt. */
function runPattern(z: Zone, gen: Generator<number, void, void>) {
  const before = new Set(z.fx.keys()), projs = z.projs.size;
  for (const _ of gen) void _;
  const fresh = [...z.fx.values()].filter(f => !before.has(f.id) && f.hostile);
  return { tele: fresh.filter(f => f.kind === 'tele'), pools: fresh.filter(f => f.kind === 'zone'), projs: z.projs.size - projs };
}

describe('Boss-Echos', () => {
  it('Schlackenbrut (Ignarok) und Kronenschatten (Hohler König): Verstärkung von Beginn an, die das Original nicht hat', () => {
    const t = hero(), z = plain(t, 'aschenschmiede', 3);
    expect(summoned(z, 'glutimp')).toBe(0);
    const b = fight(t, z);
    expect(b.def.name).toBe(ECHO_BOSS.ignarok.name);
    expect(summoned(z, 'glutimp')).toBe(2);
    for (const m of z.mobs.values()) if (m.summoned) expect(m.lvl).toBe(b.def.level - 2);
    // Phasenwechsel ruft weitere
    b.mob.hp = b.mob.maxHp * 0.6;
    sim.step(1.5);
    expect(b.phase).toBe(2);
    expect(summoned(z, 'glutimp')).toBeGreaterThanOrEqual(4);
    t.send({ t: 'rift', a: 'leave' });
    // das Original im Story-Dungeon ruft zu Beginn niemanden
    const o = sim.join('Vergleich', 'krieger', 40); o.p.god = true;
    sim.travel(o, 'aschenschmiede');
    const zo = o.p.zone;
    fight(o, zo);
    expect(zo.boss!.def.name).toBe(BOSSES.ignarok.name);
    expect(summoned(zo, 'glutimp')).toBe(0);
    // Hohler König: Leerenbrut zu Beginn und der sich schließende Ring
    const z2 = plain(t, 'thron', 3), b2 = fight(t, z2);
    expect(summoned(z2, 'leerenbrut')).toBe(2);
    const r = runPattern(z2, ECHO_MECH.hohlkoenig.pattern!(b2.kit()));
    expect(r.tele.length).toBeGreaterThanOrEqual(24);
    const radii = new Set(r.tele.map(f => Math.round(Math.hypot(f.x - b2.cx, f.y - b2.cy))));
    expect(radii.size).toBe(3);                               // drei Ringe, von außen nach innen
    sim.clear();
  });
  it('Dornensaat, Prismengitter und Spiegelschritt: zusätzliche Muster, die in der Rotation des Echos stehen', () => {
    const t = hero();
    // Dornenmutter: Ankündigungen werden zu Giftlachen
    let z = plain(t, 'wurzelgruft', 2), b = fight(t, z);
    let r = runPattern(z, ECHO_MECH.dornenmutter.pattern!(b.kit()));
    expect(r.tele.length).toBe(4 + b.phase);
    expect(r.pools.length).toBe(4 + b.phase);
    for (const p of r.pools) expect(z.inRoom(b.room, p.x, p.y)).toBe(true);
    // das Zusatzmuster ist Teil der Rotation: nach den gewöhnlichen Mustern kommt es an die Reihe
    const own = (b as any).patterns().length;
    (b as any).idx = own;
    const before = hostile(z, 'zone').length;
    for (const _ of (b as any).next() as Generator<number>) void _;
    expect(hostile(z, 'zone').length).toBe(before + 4 + b.phase);
    // … und im Story-Dungeon gibt es dieses Muster nicht
    const o = sim.join('Zeugin', 'krieger', 40); o.p.god = true;
    sim.travel(o, 'wurzelgruft');
    const bo = fight(o, o.p.zone);
    (bo as any).idx = (bo as any).patterns().length;
    const zb = hostile(o.p.zone, 'zone').length;
    for (const _ of (bo as any).next() as Generator<number>) void _;
    expect(hostile(o.p.zone, 'zone').length).toBe(zb);
    t.send({ t: 'rift', a: 'leave' });
    // Kristallkoloss: waagrechte Lichtbahnen über die ganze Raumbreite, in zwei Wellen
    z = plain(t, 'geode', 2); b = fight(t, z);
    r = runPattern(z, ECHO_MECH.kristallkoloss.pattern!(b.kit()));
    expect(r.tele.length).toBeGreaterThanOrEqual(4);
    for (const f of r.tele) { expect(f.shape).toBe('line'); expect(f.y).toBe(f.y2); expect(Math.abs(f.x2! - f.x)).toBeGreaterThan((b.room.x1 - b.room.x0) * TILE); expect(f.el).toBe('light'); }
    expect(new Set(r.tele.map(f => f.y)).size).toBe(r.tele.length);   // jede Reihe genau einmal
    t.send({ t: 'rift', a: 'leave' });
    // Ysolde: zwei Sprünge, an jedem verlassenen Ort ein Frostfeld, dazu Splitterringe
    z = plain(t, 'gletscherdom', 2); b = fight(t, z);
    const at = { x: b.mob.x, y: b.mob.y };
    r = runPattern(z, ECHO_MECH.ysolde.pattern!(b.kit()));
    expect(r.pools.length).toBe(2);
    expect(Math.hypot(r.pools[0].x - at.x, r.pools[0].y - at.y)).toBeLessThan(2);
    expect(Math.hypot(b.mob.x - at.x, b.mob.y - at.y)).toBeGreaterThan(1);
    expect(r.projs).toBeGreaterThanOrEqual(20);
    sim.clear();
  });
  it('Schnellschrift (Archivar): die Muster folgen um ein Viertel schneller aufeinander als im Original', () => {
    const t = hero(), z = plain(t, 'archiv', 2), b = fight(t, z);
    const o = sim.join('Leserin', 'krieger', 40); o.p.god = true;
    sim.travel(o, 'archiv');
    const bo = fight(o, o.p.zone);
    (b as any).gen = null; (b as any).wait = 100; (bo as any).gen = null; (bo as any).wait = 100;
    sim.step(2);
    expect(100 - (bo as any).wait).toBeCloseTo(2, 1);
    expect(100 - (b as any).wait).toBeCloseTo(2 * ECHO_MECH.archivar.speed!, 1);
    expect(ECHO_MECH.archivar.speed).toBe(1.25);
    sim.clear();
  });
});

describe('Richtzeit, Stufen und Lebensfunken', () => {
  it('unter der Richtzeit erscheint eine Bonustruhe; langsam zu sein beendet den Riss nicht', () => {
    const t = hero();
    let z = plain(t, 'wurzelgruft', 1);
    sim.step(3);
    expect(z.initFor(t.p).rift!.t).toBe(3);
    killBoss(t, z);
    expect(z.rift!.done!.bonus).toBe(true);
    expect(z.rift!.done!.sec).toBeLessThan(riftPar('wurzelgruft', 1));
    expect(lastRift(t)!.done).toEqual(z.rift!.done);
    expect(riftChests(z).map(o => o.props!.rift).sort()).toEqual([1, 2]);
    // Bonustruhe: mindestens episch, auf Riss-Stufe, dazu Fragmente
    const bonus = riftChests(z).find(o => o.props!.rift === 2)!;
    t.p.char.inv = [];
    t.p.x = bonus.x; t.p.y = bonus.y + 10;
    t.send({ t: 'interact', id: bonus.id });
    const gear = t.p.char.inv.filter(i => ITEMS[i.base].tier);
    expect(gear.length).toBe(CFG.rift.bonusGear);
    for (const it of gear) { expect(it.rarity).toBeGreaterThanOrEqual(3); expect(it.ilvl).toBe(CFG.rift.ilvl(1)); }
    expect(t.count(ECHO_FRAG)).toBe(CFG.rift.bonusFragments(1));
    // die Uhr steht nach dem Abschluss
    const sec = z.rift!.done!.sec;
    sim.step(5);
    expect(z.initFor(t.p).rift!.t).toBe(sec);
    t.send({ t: 'rift', a: 'leave' });
    // zu langsam: kein Scheitern, nur keine Bonustruhe – freigeschaltet wird trotzdem
    z = plain(t, 'wurzelgruft', 2);
    z.rift!.startAt -= riftPar('wurzelgruft', 2) + 30;
    sim.step(1);
    expect(z.rift!.failed).toBe(false);
    expect(t.p.zone).toBe(z);
    expect(z.initFor(t.p).rift!.t).toBeGreaterThan(riftPar('wurzelgruft', 2));
    killBoss(t, z);
    expect(z.rift!.done!.bonus).toBe(false);
    expect(riftChests(z).map(o => o.props!.rift)).toEqual([1]);
    expect(t.p.char.rift!.stufe).toBe(3);
    sim.clear();
  });
  it('Stufe n schaltet n+1 frei – je Charakter, bis zur höchsten Stufe; Bestzeiten und Zähler werden geführt und gespeichert', () => {
    const t = hero();
    t.send({ t: 'rift', a: 'start', dungeon: 'geode', stufe: 2 });
    expect(t.p.zone.rift).toBeNull();
    expect(t.toasts.at(-1)).toMatch(/noch nicht freigeschaltet/);
    let z = plain(t, 'geode', 1);
    const seed = t.p.char.rift!.seed;
    sim.step(20);
    killBoss(t, z);
    expect(t.p.char.rift!.stufe).toBe(2);
    expect(t.p.char.rift!.seed).toBe(seed + 1);                // neue Modifikatoren für die nächsten Risse
    expect(t.p.char.rift!.best.geode[0]).toBe(1);
    const first = t.p.char.rift!.best.geode[1];
    expect(first).toBeGreaterThanOrEqual(20);
    sim.step(0.1);
    expect(t.msgs.some(m => m.t === 'char' && (m.d as any).rift?.stufe === 2)).toBe(true);   // der Client erfährt den Fortschritt
    t.send({ t: 'rift', a: 'leave' });
    // dieselbe Stufe noch einmal: schaltet nichts weiter frei; eine langsamere Zeit ersetzt die Bestzeit nicht, eine schnellere schon
    z = plain(t, 'geode', 1); sim.step(40); killBoss(t, z);
    expect(t.p.char.rift!.stufe).toBe(2);
    expect(t.p.char.rift!.best.geode).toEqual([1, first]);
    t.send({ t: 'rift', a: 'leave' });
    z = plain(t, 'geode', 1); sim.step(2); killBoss(t, z);
    expect(t.p.char.rift!.best.geode[1]).toBeLessThan(first);
    t.send({ t: 'rift', a: 'leave' });
    // eine höhere Stufe zählt mehr als eine schnellere Zeit
    z = plain(t, 'geode', 2); sim.step(60); killBoss(t, z);
    expect(t.p.char.rift!.stufe).toBe(3);
    expect(t.p.char.rift!.best.geode[0]).toBe(2);
    expect(t.p.char.rift!.best.wurzelgruft).toBeUndefined();   // Bestzeiten je Dungeon
    t.send({ t: 'rift', a: 'leave' });
    // Obergrenze
    const max = CFG.rift.maxStufe;
    z = plain(t, 'geode', max); killBoss(t, z);
    expect(t.p.char.rift!.stufe).toBe(max);
    t.send({ t: 'rift', a: 'leave' });
    t.send({ t: 'rift', a: 'start', dungeon: 'geode', stufe: max + 1 });
    expect(t.p.zone.rift).toBeNull();
    // übersteht Speichern und Laden
    const saved = JSON.parse(JSON.stringify(t.p.char.rift));
    sim.leave(t); sim.reenter(t);
    expect(t.p.char.rift).toEqual(saved);
    // in der Gruppe rückt jedes Mitglied auf die Stufe nach dem Abschluss vor – auch wer selbst erst weiter unten stand
    t.p.god = true;
    const b = hero('magier');
    sim.party(t, b);
    toStone(t); toStone(b);
    t.p.char.rift!.seed = seedFor('archiv', 7, ['finsternis'], undefined, ['horde']);
    t.send({ t: 'rift', a: 'start', dungeon: 'archiv', stufe: 7 });
    z = t.p.zone;
    expect(b.p.zone).toBe(z);
    killBoss(t, z);
    expect(t.p.char.rift!.stufe).toBe(max);                    // der Anführer stand schon höher
    expect(b.p.char.rift!.stufe).toBe(8);
    expect(b.p.char.rift!.best.archiv[0]).toBe(7);
    sim.clear();
  });
  it('Lebensfunken: Wiederkehr kostet einen Funken; ohne Funken stößt der Riss aus, und fällt die ganze Gruppe, schließt er sich', () => {
    const t = hero(), z = plain(t, 'wurzelgruft', 1);
    clearMobs(z);
    t.p.god = false;
    t.p.x += 40;
    for (let left = CFG.rift.revives - 1; left >= 0; left--) {
      z.killPlayer(t.p, 'Test');
      expect(t.p.dead).toBe(true);
      sim.step(0.2);
      expect(z.rift!.failed).toBe(false);                      // solange ein Funke bleibt, läuft der Riss
      t.send({ t: 'respawn' });
      expect(t.p.dead).toBe(false);
      expect(t.p.zone).toBe(z);
      expect(Math.hypot(t.p.x - z.map.start.x, t.p.y - z.map.start.y)).toBeLessThan(2);
      expect(z.rift!.revives).toBe(left);
      expect(lastRift(t)!.revives).toBe(left);
    }
    // kein Funke mehr: der nächste Tod beendet den Riss (allein = ganze Gruppe)
    z.killPlayer(t.p, 'Test');
    sim.step(0.2);
    expect(z.rift!.failed).toBe(true);
    expect(lastRift(t)!.failed).toBe(true);
    sim.step(4.2);
    expect(t.p.zone.id).toBe('gruenwald');
    expect(t.p.dead).toBe(false);
    expect(t.p.char.rift!.stufe).toBe(1);                      // nichts freigeschaltet
    // Gruppe: ein Funke mehr je Mitglied; Aufhelfen durch Mitspieler kostet nichts
    const a = hero(), b = hero('paladin');
    sim.party(a, b);
    a.p.char.rift!.seed = seedFor('wurzelgruft', 1, ['finsternis']);
    a.send({ t: 'rift', a: 'start', dungeon: 'wurzelgruft', stufe: 1 });
    const zg = a.p.zone;
    expect(zg.rift!.revives).toBe(CFG.rift.revives + CFG.rift.revivesPerExtra);
    clearMobs(zg);
    a.p.god = false;
    zg.killPlayer(a.p, 'Test');
    b.p.x = a.p.x + 10; b.p.y = a.p.y;
    b.send({ t: 'revive', id: a.p.id });
    expect(a.p.dead).toBe(false);
    expect(zg.rift!.revives).toBe(CFG.rift.revives + CFG.rift.revivesPerExtra);
    // ohne Funken: der Gefallene wird ausgestoßen, die anderen kämpfen weiter
    zg.rift!.revives = 0;
    zg.killPlayer(a.p, 'Test');
    sim.step(0.5);
    expect(zg.rift!.failed).toBe(false);                       // b steht noch
    a.send({ t: 'respawn' });
    expect(a.p.zone.id).toBe('gruenwald');
    expect(a.p.dead).toBe(false);
    expect(a.toasts.at(-1)).toMatch(/Lebensfunke/);
    expect(b.p.zone).toBe(zg);
    // … und kommt auch über den Riss-Stein nicht zurück (sonst wäre der Tod ohne Funken folgenlos)
    toStone(a); a.send({ t: 'rift', a: 'join' });
    expect(a.p.zone.rift).toBeNull();
    expect(a.toasts.at(-1)).toMatch(/ausgestoßen/);
    // wer lebend geht, darf dagegen umkehren – auch allein
    b.send({ t: 'rift', a: 'leave' });
    expect(b.p.zone.id).toBe('gruenwald');
    b.send({ t: 'rift', a: 'join' });
    expect(b.p.zone).toBe(zg);
    sim.clear();
    // der Sieg holt Gefallene zurück, und nach dem Abschluss kostet Wiederkehr nichts mehr
    const c = hero(), d = hero('magier');
    sim.party(c, d);
    c.p.char.rift!.seed = seedFor('wurzelgruft', 1, ['finsternis']);
    c.send({ t: 'rift', a: 'start', dungeon: 'wurzelgruft', stufe: 1 });
    const zv = c.p.zone;
    expect(d.p.zone).toBe(zv);
    c.p.god = false;
    zv.killPlayer(c.p, 'Test');
    killBoss(d, zv);
    expect(c.p.dead).toBe(false);
    expect(c.p.char.rift!.stufe).toBe(2);
    expect(d.p.char.rift!.stufe).toBe(2);
    const sparks = zv.rift!.revives;
    zv.killPlayer(c.p, 'Test');
    c.send({ t: 'respawn' });
    expect(c.p.zone).toBe(zv);
    expect(zv.rift!.revives).toBe(sparks);
    sim.clear();
  });
});

describe('Prüfung der Sieben', () => {
  it('öffnet sich ab hoher Riss-Stufe: sieben Echos nacheinander in einem Raum, Titel und einmaliges Rezept als Lohn', () => {
    const t = hero('krieger', 10), T7 = CFG.rift.trial;
    expect(trialUnlocked(t.p.char)).toBe(false);
    t.send({ t: 'rift', a: 'start', dungeon: TRIAL_ID });
    expect(t.p.zone.rift).toBeNull();
    expect(t.toasts.at(-1)).toMatch(new RegExp('Riss-Stufe ' + T7.unlock));
    t.send({ t: 'title', id: 'sieben' });
    expect(t.p.char.title).toBeUndefined();                    // Titel muss verdient sein
    t.p.char.rift!.stufe = T7.unlock + 1;
    expect(trialUnlocked(t.p.char)).toBe(true);
    t.send({ t: 'rift', a: 'start', dungeon: TRIAL_ID });
    const z = t.p.zone, run = z.rift!;
    expect(run.trial).toBe(true);
    expect(z.id).toBe('wacht');
    expect(run.mods.size).toBe(0);
    expect(run.revives).toBe(T7.revives);
    expect([...z.mobs.values()].filter(m => !m.boss).length).toBe(0);   // kein Weg, nur die Echos
    expect(z.inRoom(z.map.bossRoom!, t.p.x, t.p.y)).toBe(true);
    expect(lastInit(t).rift!.trial).toEqual([0, 7]);
    for (let i = 0; i < TRIAL_BOSSES.length; i++) {
      const b = z.boss!;
      expect(b.def.id).toBe(TRIAL_BOSSES[i]);
      expect(b.def.name).toBe(ECHO_BOSS[TRIAL_BOSSES[i]].name);
      expect(b.mob.maxHp).toBe(Math.round(CFG.enemy.hp(b.def.level) * CFG.rift.echo.hpMul * CFG.rift.hpMul(T7.stufe) * T7.hpMul));
      expect(b.mob.info().tint).toBe(ECHO_TINT);
      fight(t, z);
      if (b.def.id === 'vael') expect(summoned(z, 'wachschatten')).toBe(2);
      b.mob.invuln = false;
      z.hitMob(b.mob, t.p, 1e9, 'phys');
      expect(b.mob.dead).toBe(true);                           // auch Vaels Echo vergeht – es ist nur ein Echo
      if (i < TRIAL_BOSSES.length - 1) {
        expect(run.done).toBeNull();
        expect(lastRift(t)!.trial).toEqual([i + 1, 7]);
        expect(riftChests(z).length).toBe(0);
        sim.step(T7.pause + 0.2);
        expect(z.boss).not.toBe(b);
        expect(z.boss!.mob.dead).toBe(false);
        expect(z.mobs.has(z.boss!.mob.id)).toBe(true);
      }
    }
    expect(run.done).toBeTruthy();
    expect(lastRift(t)!.trial).toEqual([7, 7]);
    expect(t.p.char.flags['b:vael']).toBeUndefined();
    expect(t.p.char.rift!.trial).toBe(1);
    expect(t.p.char.rift!.best[TRIAL_ID][0]).toBe(T7.stufe);
    expect(t.p.char.rift!.stufe).toBe(T7.unlock + 1);          // die Prüfung schaltet keine Stufen frei
    // Titel steht hinter dem Namen
    expect(t.p.char.title).toBe('sieben');
    expect(sim.game.playerInfo(t.p).title).toBe(TITLES.sieben.name);
    // Truhe: Rezept (nur beim ersten Mal), Fragmente, Ätherstaub, ein Setteil auf Riss-Stufe
    const chest = riftChests(z);
    expect(chest.length).toBe(1);
    t.p.char.inv = [];
    t.p.x = chest[0].x; t.p.y = chest[0].y + 10;
    t.send({ t: 'interact', id: chest[0].id });
    expect(t.count(scrollOf(TRIAL_RECIPE))).toBe(1);
    expect(t.count(ECHO_FRAG)).toBe(T7.fragments);
    expect(t.count('mat_aether')).toBe(T7.aether);
    const piece = t.p.char.inv.find(i => i.set)!;
    expect(piece.ilvl).toBe(CFG.rift.ilvl(T7.stufe));
    t.send({ t: 'use', uid: t.p.char.inv.find(i => i.base === scrollOf(TRIAL_RECIPE))!.uid });
    expect(t.p.char.recipes).toContain(TRIAL_RECIPE);
    for (const [b, k] of RECIPES[TRIAL_RECIPE].inputs) t.give(b, k);
    expect(craftBlock(t.p.char, RECIPES[TRIAL_RECIPE])).toBeNull();
    // Titel ablegen und wieder führen; Unsinn wird ignoriert
    t.send({ t: 'title', id: '' });
    expect(t.p.char.title).toBeUndefined();
    expect(sim.game.playerInfo(t.p).title).toBeUndefined();
    t.send({ t: 'title', id: 'quatsch' });
    expect(t.p.char.title).toBeUndefined();
    t.send({ t: 'title', id: 'sieben' });
    expect(t.p.char.title).toBe('sieben');
    // übersteht Speichern und Laden
    sim.leave(t); sim.reenter(t);
    expect(t.p.char.title).toBe('sieben');
    expect(t.p.char.rift!.trial).toBe(1);
    sim.clear();
  });
});

describe('Quellstufen', () => {
  it('Erfahrung über Stufe 40 füllt Quellstufen; Punkte lassen sich auf Bahnen setzen und wirken genau wie angegeben', () => {
    const t = sim.join('Quellkind', 'krieger', 39), c = t.p.char;
    c.xp = CFG.xpToNext(39) - 10;
    t.p.gainXp(30);
    expect(c.level).toBe(40);
    expect(c.quell?.lvl ?? 0).toBe(0);                         // bis Stufe 40 läuft alles wie bisher
    const ap = c.attrPoints, sp = c.skillPoints;
    const need = CFG.quell.xpToNext(0);
    t.p.gainXp(need - 1);
    expect(c.quell).toMatchObject({ lvl: 0, xp: need - 1 });
    expect(quellFree(c)).toBe(0);
    t.send({ t: 'quell', track: 'kraft' });
    expect(c.quell!.pts.kraft).toBeUndefined();
    expect(t.toasts.at(-1)).toMatch(/Kein freier Quellpunkt/);
    t.p.gainXp(1);
    expect(c.quell).toMatchObject({ lvl: 1, xp: 0 });
    expect(c.level).toBe(40); expect(c.attrPoints).toBe(ap); expect(c.skillPoints).toBe(sp);
    expect(quellFree(c)).toBe(1);
    expect(CFG.quell.xpToNext(5)).toBeGreaterThan(need);       // jede Stufe kostet mehr
    // Gegner geben nach Stufe 40 Quell-Erfahrung (mit Erfahrungsbonus)
    t.p.addBuff({ id: 'xp', name: 'x', glyph: 'x', until: 1e9, mods: { xpPct: 50 }, shield: 0 });
    t.p.gainXp(100);
    expect(c.quell!.xp).toBe(150);
    t.p.buffs = []; t.p.recalc();
    // ein Punkt auf „Quellkraft“: Angriff steigt genau um den angegebenen Prozentwert
    const kraft = QUELL_TRACKS.find(q => q.id === 'kraft')!;
    const before = computeStats(c);
    t.send({ t: 'quell', track: 'kraft' });
    expect(c.quell!.pts.kraft).toBe(1);
    expect(quellFree(c)).toBe(0);
    const bare = { ...c, quell: undefined };
    expect(computeStats(bare)).toEqual(before);
    expect(t.p.stats).toEqual(computeStats(bare, [{ powerPct: quellBonus(kraft, 1) }]));
    expect(t.p.stats.power).toBeGreaterThan(before.power);
    expect(t.p.stats.maxHp).toBe(before.maxHp);
    // unbekannte Bahn: nichts passiert
    t.p.gainQuellXp(CFG.quell.xpToNext(1));
    t.send({ t: 'quell', track: 'unsinn' });
    expect(quellFree(c)).toBe(1);
    // jede Bahn wirkt auf genau ihren Wert
    for (let i = 0; i < 20; i++) t.p.gainQuellXp(CFG.quell.xpToNext(c.quell!.lvl));
    for (const q of QUELL_TRACKS) {
      const n0 = c.quell!.pts[q.id] ?? 0;
      t.send({ t: 'quell', track: q.id }); t.send({ t: 'quell', track: q.id });
      expect(c.quell!.pts[q.id]).toBe(n0 + 2);
    }
    const mods = Object.fromEntries(QUELL_TRACKS.map(q => [q.mod, quellBonus(q, c.quell!.pts[q.id])]));
    expect(t.p.stats).toEqual(computeStats(bare, [mods]));
    // übersteht Speichern und Laden
    const saved = JSON.parse(JSON.stringify(c.quell));
    sim.leave(t); sim.reenter(t);
    expect(t.p.char.quell).toEqual(saved);
    expect(t.p.stats.power).toBe(computeStats(t.p.char).power);
    sim.clear();
  });
  it('Bahnen haben abnehmenden Zuwachs und eine Obergrenze; alle Quellstufen zusammen bleiben bescheiden', () => {
    const cap = CFG.quell.trackCap;
    for (const q of QUELL_TRACKS) {
      expect(quellBonus(q, 0)).toBe(0);
      expect(quellBonus(q, cap)).toBe(q.max);
      expect(quellBonus(q, cap + 5)).toBe(q.max);
      const first = quellBonus(q, 1), last = quellBonus(q, cap) - quellBonus(q, cap - 1);
      expect(first).toBeGreaterThan(last * 2);                 // der erste Punkt bringt deutlich mehr als der letzte
      for (let k = 1; k <= cap; k++) expect(quellBonus(q, k)).toBeGreaterThan(quellBonus(q, k - 1));
    }
    expect(QUELL_MAX).toBe(QUELL_TRACKS.length * cap);
    const t = sim.join('Quellgreis', 'krieger', 40), c = t.p.char;
    const base = computeStats(c);
    t.p.gainQuellXp(1e12);                                     // weit mehr, als es Stufen gibt
    expect(c.quell).toMatchObject({ lvl: QUELL_MAX, xp: 0 });
    t.p.gainQuellXp(5000);
    expect(c.quell!.xp).toBe(0);
    for (const q of QUELL_TRACKS) {
      for (let k = 0; k < cap; k++) t.send({ t: 'quell', track: q.id });
      expect(c.quell!.pts[q.id]).toBe(cap);
      t.send({ t: 'quell', track: q.id });
      expect(c.quell!.pts[q.id]).toBe(cap);                    // voll ist voll
    }
    expect(quellFree(c)).toBe(0);
    const full = t.p.stats;
    // voll ausgebaut: höchstens +6 % Angriff, +8 % Leben und Verteidigung – ein Vorteil, kein Freifahrtschein
    expect(full.power / base.power).toBeGreaterThan(1.04); expect(full.power / base.power).toBeLessThan(1.07);
    expect(full.maxHp / base.maxHp).toBeLessThan(1.09);
    expect(full.def / base.def).toBeLessThan(1.09);
    expect(full.cdr - base.cdr).toBeLessThanOrEqual(5);
    expect(full.res.fire).toBe(6);
    sim.clear();
  });
});

/** Charakter, der die ganze Geschichte abgeschlossen hat – mit allem, was ein Neuer Kreis behalten oder zurücksetzen muss. */
function finished(name: string, ende = 1): Tester {
  const t = sim.join(name, 'krieger', 40), c = t.p.char;
  for (const q of QUEST_LIST) if (q.type === 'main') c.quests[q.id] = { s: 'done', p: [], n: 1 };
  c.quests.s_splitter1 = { s: 'done', p: [], n: 1 };
  c.quests.s_splitter2 = { s: 'active', p: [0] };
  Object.assign(c.flags, { 'd:ende': ende, 'd:borin': 2, 'h:earth': 1, 'e:woge1': 1, 'v:heimkehr': 1, 'q:mirelda': 1, 'k:ende1': 1, ch: 11, 'b:dornenmutter': 3, 'b:vael': 1,
    'c:gruenwald:5': 1, 't:gruenwald': 1, 't:frost': 1, 'l:brunnenbuch': 1, 's:gruenwald:shard0': 1, 'z:frost': 1, 'x:gruenwald:9': 1, 'u:dornenmutter': 1, 'sd:wurzelwacht': 1, intro: 1 });
  c.gold = 4321; c.attrs.str += 30; c.attrPoints = 2; c.skillPoints = 1;
  c.equip.weapon = makeLegendary(new Rng(3), 'krieger', 40);
  t.give('seal_earth', 1); t.give('q_herzton', 1); t.give('mat_void', 9); t.give(ECHO_FRAG, 4);
  c.recipes = ['c_fest'];
  c.rift = { stufe: 9, seed: 4, best: { geode: [8, 300] } };
  c.quell = { lvl: 5, xp: 123, pts: { kraft: 3, leben: 1 } };
  t.p.recalc();
  sim.gotoNpc(t, 'mirelda');
  return t;
}

describe('Neuer Kreis', () => {
  it('nur bei Mirelda und erst nach dem Epilog; setzt die Geschichte zurück und behält alles, was der Charakter kann und besitzt', () => {
    const t = finished('Kreislauf'), c = t.p.char;
    const keep = () => JSON.stringify([c.level, c.xp, c.gold, c.attrs, c.attrPoints, c.skillPoints, c.skills, c.hotbar, c.equip, c.recipes, c.rift, c.quell, c.inv.filter(i => ITEMS[i.base].kind !== 'quest'), c.kills, c.deaths]);
    const kept = keep(), stats = JSON.stringify(t.p.stats);
    // nicht ohne Epilog
    c.quests[KREIS_QUEST] = { s: 'active', p: [0] };
    t.send({ t: 'kreis' });
    expect(c.kreis ?? 0).toBe(0);
    expect(t.toasts.at(-1)).toMatch(/Nachklang/);
    c.quests[KREIS_QUEST] = { s: 'done', p: [], n: 1 };
    // nicht aus der Ferne
    t.p.x += 400;
    t.send({ t: 'kreis' });
    expect(c.kreis ?? 0).toBe(0);
    expect(t.toasts.at(-1)).toMatch(/Mirelda/);
    sim.gotoNpc(t, 'mirelda');
    expect(seenEndings(c)).toEqual([1]);
    t.send({ t: 'kreis' });
    expect(c.kreis).toBe(1);
    // die Entscheidungen des abgeschlossenen Kreises sind festgehalten
    expect(c.kreise).toEqual([{ ende: 1, dec: { ende: 1, borin: 2 } }]);
    expect(seenEndings(c)).toEqual([1]);
    // zurückgesetzt: alle Quests und der Story-Fortschritt
    expect(c.quests).toEqual({});
    for (const k of ['d:ende', 'd:borin', 'h:earth', 'e:woge1', 'v:heimkehr', 'q:mirelda', 'k:ende1', 'ch', 'b:dornenmutter', 'b:vael', 'c:gruenwald:5', 't:frost']) expect(c.flags[k], k).toBeUndefined();
    // behalten: Chronik, Quellsplitter, Karte, Merker – und der Quellstein der Heimat
    for (const k of ['l:brunnenbuch', 's:gruenwald:shard0', 'z:frost', 'x:gruenwald:9', 'u:dornenmutter', 'sd:wurzelwacht', 'intro', 't:gruenwald']) expect(c.flags[k], k).toBe(1);
    expect(c.inv.some(i => ITEMS[i.base].kind === 'quest')).toBe(false);
    expect(t.count('mat_void')).toBe(9); expect(t.count(ECHO_FRAG)).toBe(4);
    expect(keep()).toBe(kept);
    expect(JSON.stringify(t.p.stats)).toBe(stats);
    expect(c.respawn.zone).toBe('gruenwald');
    // die Mana-Risse bleiben offen, obwohl der Hohle König in diesem Kreis noch lebt
    expect(c.quests[RIFT_UNLOCK_QUEST]).toBeUndefined();
    expect(riftUnlocked(c)).toBe(true);
    // die Geschichte beginnt von vorn: erste Hauptquest ist wieder zu haben, die Wege sind wieder versperrt
    expect(questAvailable(c, QUESTS.m_erwachen)).toBe(true);
    expect(questAvailable(c, QUESTS.m_borin)).toBe(false);
    t.send({ t: 'qAccept', id: 'm_erwachen', npc: 'mirelda' });
    expect(c.quests.m_erwachen?.s).toBe('active');
    t.send({ t: 'teleport', zone: 'frost' });
    expect(t.p.zone.id).toBe('gruenwald');
    // die Welt des neuen Kreises: eigene Instanz mit höheren Stufen
    const z = t.p.zone;
    expect(z.kreis).toBe(1);
    expect(z.key).toBe('gruenwald#k1');
    expect(z).not.toBe(sim.zone('gruenwald'));
    expect((t.msgs.filter(m => m.t === 'zone').at(-1) as any).init.kreis).toBe(1);
    for (const m of z.mobs.values()) expect(m.lvl).toBeGreaterThanOrEqual(CFG.kreis.floor + CFG.kreis.levelPer);
    expect(z.def.level).toEqual([kreisLevel(1, 1), kreisLevel(5, 1)]);
    for (const m of sim.zone('gruenwald').mobs.values()) expect(m.lvl).toBeLessThanOrEqual(6);   // die Welt des ersten Durchgangs bleibt, wie sie war
    // Truhen sind wieder verschlossen und geben Beute der neuen Stufe
    const chest = [...z.objs.values()].find(o => o.type === 'chest' && o.props?.tier === 'silver' && o.props?.guard === undefined && !o.props?.sealed)!;
    expect(z.objStateFor(chest, t.p)).toBe(0);
    c.inv = c.inv.filter(i => !ITEMS[i.base].tier);
    t.p.x = chest.x; t.p.y = chest.y + 10; t.send({ t: 'interact', id: chest.id });
    const loot = c.inv.filter(i => ITEMS[i.base].tier && !i.set);
    expect(loot.length).toBeGreaterThan(0);
    for (const it of loot) expect(it.ilvl).toBeGreaterThanOrEqual(40);
    // Quests geben ab jetzt Echo-Fragmente statt Attribut- und Fähigkeitspunkten
    const frag = t.count(ECHO_FRAG), ap = c.attrPoints, sp = c.skillPoints;
    questPoints(t.p, 1, 2);
    expect(t.count(ECHO_FRAG)).toBe(frag + 3 * CFG.kreis.pointFragments);
    expect([c.attrPoints, c.skillPoints]).toEqual([ap, sp]);
    // übersteht Speichern und Laden – und man landet wieder in der Welt seines Kreises
    const snap = JSON.stringify([c.kreis, c.kreise, c.rift, c.quell, c.flags]);
    sim.leave(t); sim.reenter(t);
    const d = t.p.char;
    expect(JSON.stringify([d.kreis, d.kreise, d.rift, d.quell, d.flags])).toBe(snap);
    expect(t.p.zone.kreis).toBe(1);
    expect(t.p.zone.key).toBe('gruenwald#k1');
    sim.clear();
  });
  it('im ersten Durchgang geben Quests weiterhin Punkte; weitere Kreise merken sich jedes Ende; nach dem dritten wird die Welt nicht mehr härter', () => {
    const t = finished('Rundgang', 2), c = t.p.char;
    const ap = c.attrPoints, sp = c.skillPoints, frag = t.count(ECHO_FRAG);
    questPoints(t.p, 1, 2);
    expect([c.attrPoints, c.skillPoints]).toEqual([ap + 2, sp + 1]);
    expect(t.count(ECHO_FRAG)).toBe(frag);
    const endings = [2, 3, 1, 3, 2];
    for (let i = 0; i < endings.length; i++) {
      for (const q of QUEST_LIST) if (q.type === 'main') c.quests[q.id] = { s: 'done', p: [], n: 1 };
      c.flags['d:ende'] = endings[i];
      sim.gotoNpc(t, 'mirelda');
      t.send({ t: 'kreis' });
      expect(c.kreis).toBe(Math.min(CFG.kreis.max, i + 1));
      expect(c.kreise!.length).toBe(i + 1);
      expect(c.kreise!.at(-1)!.ende).toBe(endings[i]);
      expect(t.p.zone.kreis).toBe(c.kreis);
    }
    expect(c.kreis).toBe(CFG.kreis.max);
    expect(seenEndings(c)).toEqual([1, 2, 3]);                 // alle drei Enden gesehen
    // jeder Kreis hebt die Stufen weiter
    expect(kreisLevel(3, 0)).toBe(3);
    expect(kreisLevel(3, 1)).toBe(CFG.kreis.floor + CFG.kreis.levelPer);
    expect(kreisLevel(40, 1)).toBe(40 + CFG.kreis.levelPer);
    expect(kreisLevel(3, 3)).toBeGreaterThan(kreisLevel(3, 2));
    expect(kreisLevel(3, 2)).toBeGreaterThan(kreisLevel(3, 1));
    // Dungeon des Kreises: Boss auf der Stufe des Kreises, mit Belohnung, die dazu passt – und er zählt für die Geschichte
    sim.travel(t, 'wurzelgruft');
    const z = t.p.zone;
    expect(z.kreis).toBe(3);
    expect(z.rift).toBeNull();
    expect(z.boss!.def.level).toBe(kreisLevel(BOSSES.dornenmutter.level, 3));
    expect(z.boss!.def.name).toBe(BOSSES.dornenmutter.name);
    expect(z.boss!.def.xp).toBeGreaterThan(BOSSES.dornenmutter.xp * 5);
    t.p.god = true;
    killBoss(t, z);
    expect(c.flags['b:dornenmutter']).toBe(1);
    expect(t.count('seal_earth')).toBe(1);
    expect(sim.zone('wurzelgruft').boss!.def.level).toBe(BOSSES.dornenmutter.level);
    sim.clear();
  });
  it('gemischte Gruppen spielen in der Welt des niedrigsten Kreises; die Welten der Kreise beeinflussen einander nicht', () => {
    const mk = (name: string, k: number) => { const t = sim.join(name, 'krieger', 40); t.p.char.kreis = k; t.p.char.quests[RIFT_UNLOCK_QUEST] = { s: 'done', p: [], n: 1 }; sim.game.rehome(t.p); return t; };
    const a = mk('Dritte', 2), b = mk('Erste', 0), c = mk('Zweite', 1);
    const w0 = sim.zone('gruenwald'), w1 = sim.game.zone('gruenwald', 1), w2 = sim.game.zone('gruenwald', 2);
    expect(new Set([w0, w1, w2]).size).toBe(3);
    expect([a.p.zone, b.p.zone, c.p.zone]).toEqual([w2, w0, w1]);
    expect(sim.game.worldKreis(a.p)).toBe(2);
    // allein sieht jeder nur seine Welt
    expect(w2.initFor(a.p).players).toEqual([]);
    expect(w0.players.has(a.p.id)).toBe(false);
    // dieselbe Karte, andere Stufen
    const lv = (z: Zone) => [...z.mobs.values()].map(m => m.lvl);
    const base = lv(w0);
    expect(Math.max(...base)).toBeLessThanOrEqual(6);
    expect(Math.min(...lv(w1))).toBe(kreisLevel(1, 1));
    expect(Math.min(...lv(w2))).toBe(kreisLevel(1, 2));
    // ein Kampf in der Welt des dritten Kreises ändert die anderen nicht
    const n0 = w0.mobs.size, n1 = w1.mobs.size;
    const victim = [...w2.mobs.values()][0];
    w2.hitMob(victim, a.p, 1e9, 'phys');
    expect(victim.dead).toBe(true);
    expect(w0.mobs.size).toBe(n0); expect(w1.mobs.size).toBe(n1);
    // Gruppe aus Kreis 2 und Kreis 0: beide spielen in Kreis 0 – niemand wird in eine zu schwere Welt gezogen
    a.send({ t: 'party', a: 'invite', id: b.p.id });
    b.send({ t: 'party', a: 'accept' });
    expect(a.p.party).toBeTruthy();
    expect(sim.game.worldKreis(a.p)).toBe(0);
    expect(a.p.zone).toBe(w0); expect(b.p.zone).toBe(w0);
    expect(w0.initFor(b.p).players.map(p => p.name)).toEqual([a.p.name]);
    expect(lv(w0)).toEqual(base);                              // die Welt des Neulings bleibt unverändert
    expect(a.p.char.kreis).toBe(2);                            // der eigene Kreis bleibt, wie er ist
    // Zonenwechsel der Gruppe: wieder die Welt des niedrigsten Kreises
    sim.travel(a, 'kristall'); sim.travel(b, 'kristall');
    expect(a.p.zone).toBe(sim.zone('kristall')); expect(b.p.zone).toBe(a.p.zone);
    expect(a.p.zone.kreis).toBe(0);
    // ein drittes Mitglied aus Kreis 1 ändert daran nichts
    a.send({ t: 'party', a: 'invite', id: c.p.id });
    c.send({ t: 'party', a: 'accept' });
    expect(c.p.zone).toBe(w0);
    expect(sim.game.worldKreis(c.p)).toBe(0);
    // b verlässt die Gruppe: a und c rücken gemeinsam in Kreis 1 (den niedrigsten der Verbliebenen), b bleibt in seiner Welt
    b.send({ t: 'party', a: 'leave' });
    expect(b.p.zone).toBe(sim.zone('kristall'));
    expect(a.p.zone.kreis).toBe(1); expect(a.p.zone.id).toBe('kristall');
    expect(c.p.zone).toBe(w1);
    // die Gruppe löst sich auf: jeder steht wieder in seiner eigenen Welt
    c.send({ t: 'party', a: 'leave' });
    expect(a.p.party).toBeNull();
    expect(a.p.zone.kreis).toBe(2);
    expect(c.p.zone).toBe(w1);
    // Tod und Wiederkehr führen in die eigene Welt
    sim.travel(a, 'gruenwald');
    a.p.zone.killPlayer(a.p, 'Test');
    a.send({ t: 'respawn' });
    expect(a.p.zone).toBe(w2);
    // Mana-Risse hängen nicht vom Kreis ab, und der Rückweg führt in die eigene Welt
    a.p.char.rift = { stufe: 1, seed: seedFor('geode', 1, ['finsternis']), best: {} };
    const o = [...a.p.zone.objs.values()].find(x => x.type === 'riftstone')!;
    a.p.x = o.x; a.p.y = o.y + 12;
    a.send({ t: 'rift', a: 'start', dungeon: 'geode', stufe: 1 });
    expect(a.p.zone.rift).toBeTruthy();
    expect([...a.p.zone.mobs.values()].find(m => !m.boss)!.lvl).toBe(CFG.rift.mobLevel(1));
    a.send({ t: 'rift', a: 'leave' });
    expect(a.p.zone).toBe(w2);
    // leere Welten höherer Kreise werden verworfen, die Grundwelt bleibt
    sim.clear();
    sim.step(CFG.world.dungeonResetSec + 1);
    expect(sim.game.zones.has('gruenwald#k2')).toBe(false);
    expect(sim.game.zones.has('gruenwald')).toBe(true);
  });
});

describe('Echo-Fragmente im Handwerk', () => {
  it('Angleichen hebt Legendäre Waffen, Setteile und Unikate schrittweise auf die Stufe des höchsten abgeschlossenen Risses', () => {
    const t = hero('krieger', 12), c = t.p.char, A = CFG.rift.attune;
    expect(attuneCap(c)).toBe(CFG.rift.ilvl(11));              // Stufe 11 ist abgeschlossen, 12 freigeschaltet
    const leg = makeLegendary(new Rng(8), 'krieger', 40);
    expect(leg.ilvl).toBe(40);
    c.equip.weapon = leg; t.p.recalc();
    const plan = attunePlan(c, leg)!;
    expect(plan.to).toBe(40 + A.step);
    expect(plan.mats).toEqual([[ECHO_FRAG, A.step * A.legendFrags], ['mat_aether', A.legendAether]]);
    sim.gotoNpc(t, 'borin');
    c.gold = 0;
    const snap = () => JSON.stringify([c.gold, c.inv, c.equip]);
    // ohne Gold, ohne Fragmente, nicht an der Schmiede: jeweils abgelehnt, nichts verändert
    let s0 = snap();
    t.send({ t: 'attune', uid: leg.uid, at: 'borin' });
    expect(snap()).toBe(s0); expect(t.toasts.at(-1)).toMatch(/Gold/);
    c.gold = 1e6; s0 = snap();
    t.send({ t: 'attune', uid: leg.uid, at: 'borin' });
    expect(snap()).toBe(s0); expect(t.toasts.at(-1)).toMatch(/Echo-Fragment/);
    t.give(ECHO_FRAG, 100); t.give('mat_aether', 10); s0 = snap();
    t.send({ t: 'attune', uid: leg.uid, at: 'sella' });         // Sella ist keine Schmiedin
    expect(snap()).toBe(s0);
    t.p.x += 500;
    t.send({ t: 'attune', uid: leg.uid, at: 'borin' });
    expect(snap()).toBe(s0);
    sim.gotoNpc(t, 'borin');
    // jetzt gelingt es: genau die Kosten, Werte und Affixe steigen
    const power = t.p.stats.power, aff = leg.affixes.map(a => a[1]), base = baseMods(leg).power!;
    t.send({ t: 'attune', uid: leg.uid, at: 'borin' });
    expect(leg.ilvl).toBe(45);
    expect(c.gold).toBe(1e6 - plan.gold);
    expect(t.count(ECHO_FRAG)).toBe(100 - A.step * A.legendFrags);
    expect(t.count('mat_aether')).toBe(10 - A.legendAether);
    expect(baseMods(leg).power!).toBeGreaterThan(base);
    leg.affixes.forEach((a, i) => expect(a[1]).toBeGreaterThanOrEqual(aff[i]));
    expect(t.p.stats.power).toBeGreaterThan(power);
    expect(ITEMS[leg.base].legend).toBe('krieger');            // bleibt dieselbe Waffe
    // weiter bis zur Obergrenze des Charakters, dann ist Schluss
    t.send({ t: 'attune', uid: leg.uid, at: 'borin' });
    expect(leg.ilvl).toBe(50);
    t.send({ t: 'attune', uid: leg.uid, at: 'borin' });
    expect(leg.ilvl).toBe(51);
    const frags = t.count(ECHO_FRAG);
    t.send({ t: 'attune', uid: leg.uid, at: 'borin' });
    expect(leg.ilvl).toBe(51);
    expect(t.count(ECHO_FRAG)).toBe(frags);
    expect(t.toasts.at(-1)).toMatch(/höhere Stufe/);
    // Setteil: bleibt Teil seines Sets
    const helm = makeSetPiece(new Rng(2), 'wurzelwacht', 'helm', 'krieger', 3), ring = makeSetPiece(new Rng(3), 'wurzelwacht', 'ring', 'krieger', 3);
    c.equip.helm = helm; c.equip.acc1 = ring; t.p.recalc();
    expect(t.p.stats.sets.wurzelwacht).toBe(2);
    const il = helm.ilvl, baseId = helm.base;
    t.send({ t: 'attune', uid: helm.uid, at: 'borin' });
    expect(helm.ilvl).toBe(il + A.step);
    expect(helm.base).toBe(baseId); expect(helm.set).toBe('wurzelwacht');
    expect(t.p.stats.sets.wurzelwacht).toBe(2);
    expect(t.count(ECHO_FRAG)).toBe(frags - A.step * A.frags);
    // gewöhnliche Beute lässt sich nicht angleichen
    const plainGear = generateGear(new Rng(4), 40, 3, 'krieger', 'armor');
    c.inv.push(plainGear);
    t.send({ t: 'attune', uid: plainGear.uid, at: 'borin' });
    expect(plainGear.ilvl).toBe(40);
    // ohne offene Mana-Risse gibt es nichts anzugleichen
    const u = sim.join('Unwissend', 'krieger', 40);
    u.p.char.equip.weapon = makeLegendary(new Rng(9), 'krieger', 40); u.p.char.gold = 1e6; u.give(ECHO_FRAG, 50); u.give('mat_aether', 5);
    sim.gotoNpc(u, 'borin');
    u.send({ t: 'attune', uid: u.p.char.equip.weapon.uid, at: 'borin' });
    expect(u.p.char.equip.weapon.ilvl).toBe(40);
    sim.clear();
  });
  it('Echo-Runen und Ätherstaub: Fragmente fließen in die stärksten Verzauberungen und lassen sich verdichten', () => {
    const t = hero('krieger', 5), c = t.p.char;
    c.gold = 1e6;
    c.equip.weapon = generateGear(new Rng(6), 40, 2, 'krieger', 'weapon'); t.p.recalc();
    const rune = ENCHANT_LIST.find(e => e.id === 'echo_macht')!;
    for (const [b, k] of rune.cost) t.give(b, k);
    sim.gotoNpc(t, 'fenwick');
    const before = t.p.stats.power;
    t.send({ t: 'enchant', uid: c.equip.weapon.uid, id: 'echo_macht', at: 'fenwick' });
    expect(c.equip.weapon.ench).toBe('echo_macht');
    expect(t.count(ECHO_FRAG)).toBe(0);
    expect(t.p.stats.power).toBeGreaterThan(before * 1.07);
    // stärker als jede Rune aus 0.3 für denselben Platz
    for (const e of ENCHANT_LIST) if (!e.id.startsWith('echo_')) expect(e.mods.powerPct ?? 0).toBeLessThan(rune.mods.powerPct!);
    // sechs Fragmente → ein Ätherstaub (Alchemie)
    const r = RECIPES.a_aether;
    t.give(ECHO_FRAG, r.inputs[0][1]);
    sim.gotoNpc(t, 'sella');
    t.send({ t: 'craft', id: 'a_aether', at: 'sella' });
    expect(t.count('mat_aether')).toBe(1);
    expect(t.count(ECHO_FRAG)).toBe(0);
    sim.clear();
  });
});

describe('Alte Spielstände (vor 0.5)', () => {
  it('ein Stand ohne die neuen Felder lädt mit Standardwerten und kann sofort ins Endspiel', () => {
    const t = sim.join('Veteranin', 'magier', 1);
    const id = sim.db.listChars(t.s.account!.id)[0].id;
    sim.leave(t);
    const old: any = newCharacter('Veteranin', 'magier');
    for (const k of ['rift', 'quell', 'kreis', 'kreise', 'title']) expect(k in old, k).toBe(false);   // neue Charaktere tragen die Felder nicht
    old.level = 40; old.xp = 777; old.gold = 999;
    old.quests = { m_koenig: { s: 'done', p: [], n: 1 }, m_epilog: { s: 'done', p: [], n: 1 } };
    old.flags = { 'd:ende': 2, 'b:hohlkoenig': 1, intro: 1 };
    old.equip.weapon = { uid: 'old-w', base: 'w_staff_6', rarity: 3, ilvl: 40, up: 4, affixes: [['int', 12]], element: 'dark', name: 'Zepter der Leere' };
    sim.db.saveChar(id, old);
    sim.reenter(t);
    const c = t.p.char;
    expect(c.level).toBe(40); expect(c.xp).toBe(777); expect(c.gold).toBe(999);
    expect(c.equip.weapon).toMatchObject({ uid: 'old-w', ilvl: 40, up: 4, name: 'Zepter der Leere' });
    expect(c.rift).toEqual({ stufe: 1, seed: 1, best: {} });
    expect(c.quell).toEqual({ lvl: 0, xp: 0, pts: {} });
    expect(c.kreis).toBe(0); expect(c.kreise).toEqual([]);
    expect(c.title).toBeUndefined();
    expect(t.p.zone.kreis).toBe(0);
    expect(t.p.stats).toEqual(computeStats({ ...c, quell: undefined, rift: undefined }));   // die neuen Felder ändern keine Werte
    // und es geht sofort los: Riss öffnen, Quell-Erfahrung sammeln, Neuen Kreis beginnen
    expect(riftUnlocked(c)).toBe(true);
    t.p.god = true;
    toStone(t);
    t.send({ t: 'rift', a: 'start', dungeon: 'thron', stufe: 1 });
    expect(t.p.zone.rift).toBeTruthy();
    const m = [...t.p.zone.mobs.values()].find(x => !x.boss)!;
    t.p.zone.hitMob(m, t.p, 1e9, 'phys');
    expect(c.quell!.xp).toBeGreaterThan(0);
    expect(c.xp).toBe(777);
    t.send({ t: 'rift', a: 'leave' });
    sim.gotoNpc(t, 'mirelda');
    t.send({ t: 'kreis' });
    expect(c.kreis).toBe(1);
    expect(c.kreise).toEqual([{ ende: 2, dec: { ende: 2 } }]);
    sim.leave(t); sim.reenter(t);
    expect(t.p.char.kreis).toBe(1);
    sim.clear();
  });
  it('beschädigte Werte in den neuen Feldern werden begrenzt oder verworfen', () => {
    const raw: any = newCharacter('Kaputt', 'krieger');
    raw.level = 40;
    raw.rift = { stufe: 999, seed: -5, best: { geode: [99, -1], quatsch: [1, 1], thron: 'x', archiv: [3, 250] }, trial: 'ja' };
    raw.quell = { lvl: 500, xp: -3, pts: { kraft: 99, unsinn: 5, leben: 99, schutz: 99, fluss: 99, gleichmut: 99, fund: 99 } };
    raw.kreis = 77; raw.kreise = [{ ende: 9, dec: { borin: 2, x: 'y' } }, null, 'unsinn'];
    raw.title = 'sieben';
    raw.inv.push({ uid: 'hoch', base: 'w_sword_6', rarity: 4, ilvl: 70, up: 0, affixes: [] }, { uid: 'zuhoch', base: 'w_sword_6', rarity: 4, ilvl: 5000, up: 0, affixes: [] });
    const c = sanitizeChar(raw)!;
    expect(c.rift).toEqual({ stufe: CFG.rift.maxStufe, seed: 1, best: { geode: [CFG.rift.maxStufe, 0], archiv: [3, 250] } });
    expect(c.quell!.lvl).toBe(QUELL_MAX);
    expect(c.quell!.xp).toBe(0);
    for (const q of QUELL_TRACKS) expect(c.quell!.pts[q.id]).toBe(CFG.quell.trackCap);
    expect(c.quell!.pts.unsinn).toBeUndefined();
    expect(c.kreis).toBe(CFG.kreis.max);
    expect(c.kreise).toEqual([{ ende: 3, dec: { borin: 2 } }]);
    expect(c.title).toBeUndefined();                           // Titel ohne bestandene Prüfung
    expect(c.inv.find(i => i.uid === 'hoch')!.ilvl).toBe(70);  // Beute aus hohen Rissen bleibt, wie sie ist
    expect(c.inv.find(i => i.uid === 'zuhoch')!.ilvl).toBe(99);
    expect(() => computeStats(c)).not.toThrow();
    // mehr Punkte verteilt, als es Quellstufen gibt: der Überschuss verfällt
    const cheat: any = newCharacter('Schummel', 'krieger');
    cheat.quell = { lvl: 3, xp: 10, pts: { kraft: 10, leben: 10 } };
    const s = sanitizeChar(cheat)!;
    expect(Object.values(s.quell!.pts).reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(3);
    // Müll statt Objekt
    const junk: any = newCharacter('Muell', 'krieger');
    junk.rift = 'ja'; junk.quell = 7; junk.kreis = 'drei'; junk.kreise = 'viele'; junk.title = 5;
    const j = sanitizeChar(junk)!;
    expect(j.rift).toEqual({ stufe: 1, seed: 1, best: {} });
    expect(j.quell).toEqual({ lvl: 0, xp: 0, pts: {} });
    expect(j.kreis).toBe(0); expect(j.kreise).toEqual([]); expect(j.title).toBeUndefined();
  });
});
