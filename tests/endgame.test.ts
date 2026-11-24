/** Endspiel (0.5): Mana-Risse, Modifikatoren, Boss-Echos, Prüfung der Sieben, Quellstufen, Neuer Kreis, alte Spielstände. */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { sanitizeChar } from '../server/src/db';
import { ECHO_MECH } from '../server/src/echo';
import { Rift, riftHome } from '../server/src/rift';
import type { Zone } from '../server/src/zone';
import { circleFree, lineClear } from '../shared/src/collision';
import { CFG, ELEMENTS } from '../shared/src/config';
import { makeLegendary, makeSetPiece } from '../shared/src/craft';
import { BOSSES, ENEMIES } from '../shared/src/data/enemies';
import { ITEMS, baseMods, equipLevel, generateGear, itemPrice, tierOf } from '../shared/src/data/items';
import { ECHO_FRAG } from '../shared/src/data/materials';
import { QUESTS, QUEST_LIST } from '../shared/src/data/quests';
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
      expect(m.maxHp).toBe(Math.round(CFG.enemy.hp(m.lvl) * m.def.hpMul));
      const b = z.boss!;
      expect(b.def.name).toBe(ECHO_BOSS.dornenmutter.name);
      expect(b.mob.lvl).toBe(CFG.rift.mobLevel(stufe) + CFG.rift.echo.levelPlus);
      expect(b.mob.maxHp).toBe(Math.round(CFG.enemy.hp(b.mob.lvl) * CFG.rift.echo.hpMul));
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
      t.p.exitImmuneUntil = 0; t.p.x = exit.x; t.p.y = exit.y;
      sim.step(0.1);
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
      for (let i = 0; i < 100 && m.state !== 'recover'; i++) sim.step(0.05);
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
