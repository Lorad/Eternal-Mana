/** Endspiel (0.5): Mana-Risse, Modifikatoren, Boss-Echos, Prüfung der Sieben, Quellstufen, Neuer Kreis, alte Spielstände. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sanitizeChar } from '../server/src/db';
import { ECHO_MECH } from '../server/src/echo';
import { Rift, riftHome } from '../server/src/rift';
import type { Zone } from '../server/src/zone';
import { CFG, ELEMENTS } from '../shared/src/config';
import { makeLegendary, makeSetPiece } from '../shared/src/craft';
import { BOSSES } from '../shared/src/data/enemies';
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
function seedFor(dungeon: string, stufe: number, want: RiftModId[], el?: Element): number {
  for (let s = 1; s < 20000; s++) {
    const r = riftMods(s, dungeon, stufe);
    if (want.every(m => r.mods.includes(m)) && (!el || r.el === el)) return s;
  }
  throw new Error('kein passender Zähler für ' + want.join('+'));
}
/** Öffnet einen Riss mit einem bestimmten Modifikator (Stufe 1 hat genau einen). */
function open(t: Tester, dungeon = 'wurzelgruft', stufe = 1, mods: RiftModId[] = [], el?: Element): Zone {
  const st = t.p.char.rift!;
  st.stufe = Math.max(st.stufe, stufe);
  if (mods.length) st.seed = seedFor(dungeon, stufe, mods, el);
  toStone(t);
  t.send({ t: 'rift', a: 'start', dungeon, stufe });
  const z = t.p.zone;
  if (!z.rift) throw new Error('Riss nicht geöffnet: ' + t.toasts.at(-1));
  return z;
}
/** Ein Modifikator, der die gemessene Größe nicht verändert (für Vergleichsläufe). */
const plain = (t: Tester, dungeon = 'wurzelgruft', stufe = 1) => open(t, dungeon, stufe, ['finsternis']);
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
