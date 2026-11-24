/** Handwerk (0.4): Rezepte, Stationen, Umschmieden, Einschmieden, Verzaubern, Sets, Speisen/Elixiere, Rohstoff-Beute, alte Spielstände. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sanitizeChar } from '../server/src/db';
import { CFG } from '../shared/src/config';
import { craftBlock, infusePlan, makeSetPiece, recipeBase, reforgeCost, tierIlvl } from '../shared/src/craft';
import { CLASS_IDS } from '../shared/src/data/classes';
import { BOSSES } from '../shared/src/data/enemies';
import { ITEMS, generateGear, itemMods } from '../shared/src/data/items';
import { BIOME_MATS, BOSS_CORE, ESSENCE, LEGEND_TEXT } from '../shared/src/data/materials';
import { NPCS } from '../shared/src/data/npcs';
import { COOK_SPOTS, ENCHANT_LIST, LEARNABLE, RECIPES, RECIPE_LIST, STATION_NPCS, scrollOf } from '../shared/src/data/recipes';
import { SET_LIST, SET_PIECES } from '../shared/src/data/sets';
import { ZONE_LIST, ZONES } from '../shared/src/data/zones';
import { getMap } from '../shared/src/maps/mapgen';
import { computeStats, newCharacter } from '../shared/src/stats';
import type { CharData, ItemInstance } from '../shared/src/types';
import { Rng } from '../shared/src/util/rng';
import { Sim, type Tester } from './helpers/sim';

let sim: Sim;
beforeAll(() => { sim = new Sim(); });
afterAll(() => sim.close());

/** Schnappschuss von Inventar und Gold, um „nichts hat sich verändert“ zu prüfen */
const snap = (t: Tester) => JSON.stringify([t.p.char.gold, t.p.char.inv, t.p.char.equip, t.p.char.recipes ?? []]);
const noNegative = (c: CharData) => { expect(c.gold).toBeGreaterThanOrEqual(0); for (const i of c.inv) expect(i.qty ?? 1).toBeGreaterThan(0); };

describe('Daten', () => {
  it('Rezepte, Rollen, Verzauberungen und Sets verweisen nur auf existierende Dinge', () => {
    expect(RECIPE_LIST.length).toBeGreaterThan(60);
    expect(new Set(RECIPE_LIST.map(r => r.id)).size).toBe(RECIPE_LIST.length);
    for (const r of RECIPE_LIST) {
      for (const [b, n] of r.inputs) { expect(ITEMS[b], `${r.id}: ${b}`).toBeTruthy(); expect(n).toBeGreaterThan(0); }
      for (const cls of CLASS_IDS) expect(ITEMS[recipeBase(r, cls)], `${r.id}/${cls}`).toBeTruthy();
      for (const npc of r.npcs ?? []) expect(STATION_NPCS[npc]).toContain(r.station);
      expect(r.level).toBeGreaterThanOrEqual(1);
      expect(r.level).toBeLessThanOrEqual(CFG.player.maxLevel);
    }
    for (const r of LEARNABLE) expect(ITEMS[scrollOf(r.id)]?.use?.learn).toBe(r.id);
    for (const e of ENCHANT_LIST) for (const [b] of e.cost) expect(ITEMS[b], e.id).toBeTruthy();
    for (const s of SET_LIST) { expect(BOSSES[s.boss]).toBeTruthy(); expect(ZONES[s.dungeon]?.boss).toBe(s.boss); }
    // die sechs Bosse und Biome des ersten Akts haben Kern bzw. Rohstoffe; spätere Inhalte dürfen (noch) ohne sein
    for (const id of ['dornenmutter', 'kristallkoloss', 'ignarok', 'ysolde', 'archivar', 'hohlkoenig']) { expect(BOSSES[id], id).toBeTruthy(); expect(ITEMS[BOSS_CORE[id]], id).toBeTruthy(); }
    for (const b of ['gruenwald', 'kristall', 'glut', 'frost', 'ruinen', 'schatten']) { expect(ZONE_LIST.some(z => z.biome === b), b).toBe(true); expect(ITEMS[BIOME_MATS[b].monster]).toBeTruthy(); expect(ITEMS[BIOME_MATS[b].ingredient]).toBeTruthy(); }
    for (const b in BIOME_MATS) { expect(ITEMS[BIOME_MATS[b].monster], b).toBeTruthy(); expect(ITEMS[BIOME_MATS[b].ingredient], b).toBeTruthy(); }
    for (const id in BOSS_CORE) expect(ITEMS[BOSS_CORE[id]], id).toBeTruthy();
    for (const e of Object.values(ESSENCE)) expect(ITEMS[e]).toBeTruthy();
    expect(ITEMS.mat_aether).toBeTruthy();
    for (const cls of CLASS_IDS) { expect(ITEMS['leg_' + cls]?.legend).toBe(cls); expect(LEGEND_TEXT[cls].length).toBeGreaterThan(20); expect(RECIPES['f_legend_' + cls]).toBeTruthy(); }
  });
  it('jede Station hat einen NPC in der Welt, Kochstellen stehen frei und erreichbar', () => {
    const placed = new Set<string>();
    for (const z of ZONE_LIST) for (const o of getMap(z.id).objects) if (o.type === 'npc') placed.add(o.tag!);
    for (const npc in STATION_NPCS) { expect(NPCS[npc], npc).toBeTruthy(); expect(placed.has(npc), npc).toBe(true); }
    for (const st of ['forge', 'alchemy', 'cooking', 'enchant'] as const) expect(Object.values(STATION_NPCS).some(l => l.includes(st))).toBe(true);
    for (const zid in COOK_SPOTS) {
      const fires = [...sim.zone(zid).objs.values()].filter(o => o.type === 'cookfire');
      expect(fires.length, zid).toBe(COOK_SPOTS[zid].length);
      const m = getMap(zid);
      for (const f of fires) expect(m.solid[Math.floor(f.y / 16) * m.w + Math.floor(f.x / 16)]).toBe(0);
    }
  });
  it('alle Rohstoffe haben eine Verwendung, alle Rezepte eine Quelle', () => {
    const used = new Set<string>();
    for (const r of RECIPE_LIST) for (const [b] of r.inputs) used.add(b);
    for (const e of ENCHANT_LIST) for (const [b] of e.cost) used.add(b);
    for (const b of [...Object.values(BIOME_MATS).flatMap(x => [x.monster, x.ingredient]), ...Object.values(ESSENCE), ...Object.values(BOSS_CORE), 'mat_aether']) expect(used.has(b), b).toBe(true);
    // jede Materialstufe der Schmiede liegt im Stufenbereich ihres Gebiets
    for (let t = 1; t <= 6; t++) { expect(tierIlvl(t, 1)).toBe((t - 1) * 5 + 1); expect(tierIlvl(t, 40)).toBe(t === 6 ? 40 : t * 5); }
  });
});

describe('Herstellen', () => {
  it('gelingt mit Rohstoffen an der Station und verbraucht genau die Kosten', () => {
    const t = sim.join('Schmiedin', 'krieger', 3);
    sim.gotoNpc(t, 'borin');
    const r = RECIPES.f_weapon_1;
    t.p.char.gold = 500;
    t.give('mat_wood', 10); t.give('mm_chitin', 10);
    const inv0 = t.p.char.inv.length;
    t.send({ t: 'craft', id: r.id, at: 'borin' });
    expect(t.p.char.gold).toBe(500 - r.gold);
    expect(t.count('mat_wood')).toBe(10 - 6);
    expect(t.count('mm_chitin')).toBe(10 - 4);
    expect(t.p.char.inv.length).toBe(inv0 + 1);
    const made = t.p.char.inv.at(-1)!;
    expect(made.base).toBe('w_sword_1');
    expect(made.rarity).toBeGreaterThanOrEqual(1);          // garantierte Mindestseltenheit
    expect(made.ilvl).toBe(3);                               // eigene Stufe innerhalb der Materialstufe
    expect(made.element).toBeUndefined();
    expect(t.msgs.some(m => m.t === 'loot' && m.item.uid === made.uid)).toBe(true);
    noNegative(t.p.char);
  });
  it('scheitert sauber ohne Rohstoffe, ohne Gold, unter der Stufe – nichts wird verdoppelt oder negativ', () => {
    const t = sim.join('Habenichts', 'magier', 1);
    sim.gotoNpc(t, 'borin');
    const r = RECIPES.f_weapon_1;
    t.p.char.gold = 500;
    t.give('mat_wood', 5); t.give('mm_chitin', 4);          // ein Holz zu wenig
    let before = snap(t);
    for (let i = 0; i < 5; i++) t.send({ t: 'craft', id: r.id, at: 'borin' });
    expect(snap(t)).toBe(before);
    expect(t.toasts.at(-1)).toMatch(/Es fehlt: 6× Eisenholz/);
    t.give('mat_wood', 1); t.p.char.gold = r.gold - 1;       // jetzt fehlt nur Gold
    before = snap(t);
    t.send({ t: 'craft', id: r.id, at: 'borin' });
    expect(snap(t)).toBe(before);
    expect(t.toasts.at(-1)).toMatch(/Gold/);
    t.p.char.gold = 9999;
    before = snap(t);
    t.send({ t: 'craft', id: 'f_weapon_3', at: 'borin' });   // Stufe 11 nötig
    t.send({ t: 'craft', id: 'gibtsnicht', at: 'borin' });
    t.send({ t: 'craft', id: r.id, at: 'borin', n: -5 } as any);
    expect(t.p.char.inv.filter(i => i.base === 'w_staff_1').length).toBe(1); // n wird auf 1 begrenzt: genau eine Waffe
    expect(t.count('mat_wood')).toBe(0);
    noNegative(t.p.char);
    // Menge: stapelbare Ergebnisse lassen sich mehrfach herstellen, aber nie über den Vorrat hinaus
    sim.gotoNpc(t, 'sella');
    t.give('mat_herb', 5);
    t.send({ t: 'craft', id: 'a_hp1', at: 'sella', n: 3 });  // bräuchte 6 Kraut
    expect(t.count('mat_herb')).toBe(5);
    const hp0 = t.count('potion_hp1');
    t.send({ t: 'craft', id: 'a_hp1', at: 'sella', n: 2 });
    expect(t.count('mat_herb')).toBe(1);
    expect(t.count('potion_hp1')).toBe(hp0 + 4);
    noNegative(t.p.char);
  });
  it('volles Inventar: Ausrüstung wird abgelehnt, Stapelbares passt auf vorhandene Stapel', () => {
    const t = sim.join('Vollgepackt', 'waldlaeufer', 5);
    sim.gotoNpc(t, 'borin');
    t.p.char.gold = 5000;
    t.give('mat_wood', 40); t.give('mm_chitin', 40);
    const rng = new Rng(5);
    while (t.p.char.inv.length < CFG.player.invSize) t.p.char.inv.push(generateGear(rng, 3, 0, 'waldlaeufer', 'helm'));
    const before = snap(t);
    t.send({ t: 'craft', id: 'f_weapon_1', at: 'borin' });
    expect(snap(t)).toBe(before);
    expect(t.toasts.at(-1)).toBe('Inventar voll.');
    // genau aufgebrauchte Stapel machen Platz frei
    t.p.char.inv.find(i => i.base === 'mat_wood')!.qty = 6;
    t.send({ t: 'craft', id: 'f_weapon_1', at: 'borin' });
    expect(t.p.char.inv.some(i => i.base === 'w_bow_1')).toBe(true);
    expect(t.p.char.inv.length).toBe(CFG.player.invSize);
    // Tränke: vorhandener Stapel nimmt das Ergebnis auf
    sim.gotoNpc(t, 'sella');
    t.p.char.inv.find(i => i.base.startsWith('h_'))!.base = 'mat_herb';
    const herb = t.p.char.inv.find(i => i.base === 'mat_herb')!; herb.qty = 9; herb.rarity = 0; herb.affixes = [];
    const n0 = t.count('potion_hp1');
    expect(n0).toBeGreaterThan(0);
    t.send({ t: 'craft', id: 'a_hp1', at: 'sella' });
    expect(t.count('potion_hp1')).toBe(n0 + 2);
    expect(t.p.char.inv.length).toBeLessThanOrEqual(CFG.player.invSize);
  });
  it('abseits der Station, an der falschen Station und beim falschen NPC wird abgelehnt', () => {
    const t = sim.join('Fernschmied', 'krieger', 5);
    t.p.char.gold = 5000;
    t.give('mat_wood', 20); t.give('mm_chitin', 20); t.give('mat_herb', 10);
    const far = [...t.p.zone.objs.values()].find(o => o.type === 'npc' && o.tag === 'wache')!;
    t.p.x = far.x; t.p.y = far.y + 18;                       // bei Edda, weit weg von Borin
    let before = snap(t);
    t.send({ t: 'craft', id: 'f_weapon_1', at: 'borin' });
    t.send({ t: 'craft', id: 'f_weapon_1', at: 'wache' });   // Edda ist keine Schmiedin
    t.send({ t: 'craft', id: 'a_hp1', at: 'fire' });
    expect(snap(t)).toBe(before);
    expect(t.toasts.at(-1)).toMatch(/Station/);
    sim.gotoNpc(t, 'borin');
    t.send({ t: 'craft', id: 'a_hp1', at: 'borin' });        // Alchemie-Rezept an der Schmiede
    expect(snap(t)).toBe(before);
    sim.gotoNpc(t, 'sella');
    t.send({ t: 'craft', id: 'f_weapon_1', at: 'sella' });   // Schmiede-Rezept bei der Alchemistin
    t.send({ t: 'craft', id: 'f_weapon_1', at: 'borin' });   // Borin ist hier zu weit weg
    expect(snap(t)).toBe(before);
    t.send({ t: 'craft', id: 'a_hp1', at: 'sella' });
    expect(snap(t)).not.toBe(before);
    noNegative(t.p.char);
  });
  it('Kochen am Lagerfeuer und beim passenden NPC', () => {
    const t = sim.join('Koechin', 'paladin', 2);
    t.give('ing_berry', 9); t.give('mat_herb', 3);
    const fire = [...t.p.zone.objs.values()].find(o => o.type === 'cookfire')!;
    expect(fire).toBeTruthy();
    t.send({ t: 'craft', id: 'c_beeren', at: 'fire' });      // noch nicht am Feuer
    expect(t.count('food_beeren')).toBe(0);
    t.p.x = fire.x + 14; t.p.y = fire.y;
    t.send({ t: 'craft', id: 'c_beeren', at: 'fire' });
    expect(t.count('food_beeren')).toBe(2);
    sim.gotoNpc(t, 'ayla');
    t.p.x += 200;                                             // fern vom Feuer – aber auch fern von Ayla
    t.send({ t: 'craft', id: 'c_beeren', at: 'ayla' });
    expect(t.count('food_beeren')).toBe(2);
    sim.gotoNpc(t, 'ayla');
    t.send({ t: 'craft', id: 'c_beeren', at: 'ayla' });
    expect(t.count('food_beeren')).toBe(4);
    expect(t.count('ing_berry')).toBe(3);
  });
  it('Rezepte lernen: Rolle benutzen, erst danach herstellbar, zweite Rolle bleibt erhalten', () => {
    const t = sim.join('Lehrling', 'magier', 8);
    sim.gotoNpc(t, 'sella');
    t.p.char.gold = 1000;
    t.give('ess_earth', 6); t.give('ing_berry', 4);
    const r = RECIPES.a_res_earth;
    expect(craftBlock(t.p.char, r)).toMatch(/kennst du noch nicht/);
    let before = snap(t);
    t.send({ t: 'craft', id: r.id, at: 'sella' });
    expect(snap(t)).toBe(before);
    t.give(scrollOf(r.id), 2);
    const scroll = () => t.p.char.inv.find(i => i.base === scrollOf(r.id))!;
    t.send({ t: 'use', uid: scroll().uid });
    expect(t.p.char.recipes).toEqual([r.id]);
    expect(t.count(scrollOf(r.id))).toBe(1);
    t.send({ t: 'use', uid: scroll().uid });                 // schon bekannt → Rolle bleibt
    expect(t.p.char.recipes).toEqual([r.id]);
    expect(t.count(scrollOf(r.id))).toBe(1);
    t.send({ t: 'craft', id: r.id, at: 'sella' });
    expect(t.count('elx_res_earth')).toBe(1);
    t.p.flush();
    expect(t.msgs.some(m => m.t === 'char' && m.d.recipes?.includes(r.id))).toBe(true);
    // übersteht Speichern und Laden
    sim.leave(t); sim.reenter(t);
    expect(t.p.char.recipes).toEqual([r.id]);
  });
  it('Legendäre Waffe: nur mit allen sechs Bosskernen und Ätherstaub, nur bei Borin oder Rakhan, nur für die eigene Klasse', () => {
    const t = sim.join('Legende', 'paladin', 34);
    const r = RECIPES.f_legend_paladin;
    t.p.char.gold = 50000;
    for (const [b, n] of r.inputs) t.give(b, n);
    const cores = Object.values(BOSS_CORE);
    // ein Kern fehlt
    t.p.removeItems(cores[2], 1);
    sim.gotoNpc(t, 'borin');
    let before = snap(t);
    t.send({ t: 'craft', id: r.id, at: 'borin' });
    expect(snap(t)).toBe(before);
    t.give(cores[2], 1);
    before = snap(t);
    t.send({ t: 'craft', id: 'f_legend_krieger', at: 'borin' });      // fremde Klasse
    expect(snap(t)).toBe(before);
    sim.travel(t, 'kristall'); sim.gotoNpc(t, 'hedda');
    t.send({ t: 'craft', id: r.id, at: 'hedda' });                     // Hedda schmiedet, aber keine Legenden
    expect(snap(t)).toBe(before);
    sim.travel(t, 'gruenwald'); sim.gotoNpc(t, 'borin');
    t.send({ t: 'craft', id: r.id, at: 'borin' });
    const leg = t.p.char.inv.find(i => i.base === 'leg_paladin')!;
    expect(leg).toBeTruthy();
    expect(leg.rarity).toBe(4);
    expect(leg.affixes.length).toBe(4);
    expect(leg.ilvl).toBe(34);
    for (const c of cores) expect(t.count(c)).toBe(0);
    expect(t.count('mat_aether')).toBe(0);
    t.send({ t: 'equip', uid: leg.uid });
    expect(t.p.stats.legend).toBe('paladin');
  });
});

describe('Schmiede: Umschmieden und Element einschmieden', () => {
  it('Umschmieden würfelt nur die Affixe neu', () => {
    const t = sim.join('Umschmied', 'krieger', 12);
    sim.gotoNpc(t, 'borin');
    const w = generateGear(new Rng(11), 12, 3, 'krieger', 'weapon');
    w.up = 4; w.element = 'fire'; w.elv = 2; w.ench = 'macht'; w.name = 'Probeklinge';
    t.p.char.inv.push(w);
    const cost = reforgeCost(w);
    t.p.char.gold = cost.gold + 7;
    for (const [b, n] of cost.mats) t.give(b, n + 1);
    const { affixes: a0, ...rest0 } = JSON.parse(JSON.stringify(w)) as ItemInstance;
    t.send({ t: 'reforge', uid: w.uid, at: 'borin' });
    const { affixes: a1, ...rest1 } = t.p.char.inv.find(i => i.uid === w.uid)!;
    expect(rest1).toEqual(rest0);                              // Basis, Seltenheit, Stufe, +4, Element, Rune, Name unverändert
    expect(a1.length).toBe(a0.length);
    expect(JSON.stringify(a1)).not.toBe(JSON.stringify(a0));
    expect(new Set(a1.map(a => a[0])).size).toBe(a1.length);
    expect(t.p.char.gold).toBe(7);
    for (const [b] of cost.mats) expect(t.count(b)).toBe(1);
    // ohne Rohstoffe, mit gewöhnlichem Gegenstand, mit Nicht-Ausrüstung: keine Änderung
    const before = snap(t);
    t.send({ t: 'reforge', uid: w.uid, at: 'borin' });
    const plain = generateGear(new Rng(2), 12, 0, 'krieger', 'helm');
    t.p.char.inv.push(plain);
    t.p.char.gold = 9999; for (const [b, n] of reforgeCost(plain).mats) t.give(b, n);
    const before2 = snap(t);
    t.send({ t: 'reforge', uid: plain.uid, at: 'borin' });
    t.send({ t: 'reforge', uid: t.p.char.inv.find(i => i.base === 'potion_hp1')!.uid, at: 'borin' });
    expect(snap(t)).toBe(before2);
    expect(before).not.toBe('');
    // angelegte Ausrüstung lässt sich ebenfalls umschmieden
    t.send({ t: 'equip', uid: w.uid });
    for (const [b, n] of cost.mats) t.give(b, n);
    const eq0 = JSON.stringify(t.p.char.equip.weapon!.affixes);
    t.send({ t: 'reforge', uid: w.uid, at: 'borin' });
    expect(JSON.stringify(t.p.char.equip.weapon!.affixes)).not.toBe(eq0);
    noNegative(t.p.char);
  });
  it('Element einschmieden: setzen, steigern, höchste Stufe nur mit Bosskern, Wechsel beginnt bei Stufe 1', () => {
    const t = sim.join('Glutschmied', 'schattenjaeger', 20);
    sim.gotoNpc(t, 'borin');
    const w = generateGear(new Rng(3), 20, 2, 'schattenjaeger', 'weapon');
    delete w.element;
    t.p.char.inv.push(w);
    t.send({ t: 'equip', uid: w.uid });
    t.p.char.gold = 100000;
    const E = CFG.craft.infuseEssences;
    t.give('ess_fire', E[0] + E[1] + E[2]); t.give('ess_water', E[0]);
    const { affixes, rarity, up, ilvl, base } = JSON.parse(JSON.stringify(w));
    const cur = () => t.p.char.equip.weapon!;
    expect(t.p.stats.attackElement).toBe('phys');
    t.send({ t: 'infuse', uid: w.uid, el: 'fire', at: 'borin' });
    expect([cur().element, cur().elv]).toEqual(['fire', 1]);
    expect(t.p.stats.attackElement).toBe('fire');
    expect(t.p.stats.elemLvl).toBe(1);
    t.send({ t: 'infuse', uid: w.uid, el: 'fire', at: 'borin' });
    expect(cur().elv).toBe(2);
    expect(t.count('ess_fire')).toBe(E[2]);
    // Stufe 3 braucht den Schlackenkern (Ignarok, Feuer)
    const before = snap(t);
    t.send({ t: 'infuse', uid: w.uid, el: 'fire', at: 'borin' });
    expect(snap(t)).toBe(before);
    expect(t.toasts.at(-1)).toMatch(/Schlackenkern/);
    t.give('core_ignarok', 1);
    t.send({ t: 'infuse', uid: w.uid, el: 'fire', at: 'borin' });
    expect(cur().elv).toBe(3);
    expect(t.p.stats.elemLvl).toBe(3);
    expect(t.count('core_ignarok')).toBe(0);
    expect(infusePlan(cur(), 'fire')).toBeNull();
    t.send({ t: 'infuse', uid: w.uid, el: 'fire', at: 'borin' });      // schon am Ende
    expect(cur().elv).toBe(3);
    // anderes Element: beginnt wieder bei Stufe 1
    t.send({ t: 'infuse', uid: w.uid, el: 'water', at: 'borin' });
    expect([cur().element, cur().elv]).toEqual(['water', 1]);
    // nur Element und Elementstufe haben sich geändert
    expect({ affixes: cur().affixes, rarity: cur().rarity, up: cur().up, ilvl: cur().ilvl, base: cur().base }).toEqual({ affixes, rarity, up, ilvl, base });
    // Rüstung trägt kein Element, „phys“ und Unsinn werden abgelehnt
    const helm = generateGear(new Rng(4), 20, 1, 'schattenjaeger', 'helm');
    t.p.char.inv.push(helm);
    t.give('ess_water', 30);
    const b3 = snap(t);
    t.send({ t: 'infuse', uid: helm.uid, el: 'water', at: 'borin' });
    t.send({ t: 'infuse', uid: w.uid, el: 'phys', at: 'borin' });
    t.send({ t: 'infuse', uid: w.uid, el: 'quark' as any, at: 'borin' });
    t.send({ t: 'infuse', uid: w.uid, el: 'water', at: 'sella' });
    expect(snap(t)).toBe(b3);
    noNegative(t.p.char);
  });
});

describe('Verzauberung', () => {
  it('eine Rune je Ausrüstungsteil, nur passend zum Platz, nur bei Fenwick oder Liora', () => {
    const t = sim.join('Runenfreund', 'krieger', 15);
    const w = generateGear(new Rng(8), 15, 1, 'krieger', 'weapon');
    const helm = generateGear(new Rng(9), 15, 1, 'krieger', 'helm');
    t.p.char.inv.push(w, helm);
    t.send({ t: 'equip', uid: w.uid }); t.send({ t: 'equip', uid: helm.uid });
    t.p.char.gold = 10000;
    for (const e of Object.values(ESSENCE)) t.give(e, 30);
    const power0 = t.p.stats.power, hp0 = t.p.stats.maxHp;
    sim.gotoNpc(t, 'borin');
    const before = snap(t);
    t.send({ t: 'enchant', uid: w.uid, id: 'macht', at: 'borin' });    // Borin verzaubert nicht
    expect(snap(t)).toBe(before);
    sim.gotoNpc(t, 'fenwick');
    t.send({ t: 'enchant', uid: w.uid, id: 'vital', at: 'fenwick' });  // Rüstungsrune auf Waffe
    t.send({ t: 'enchant', uid: w.uid, id: 'unsinn', at: 'fenwick' });
    t.send({ t: 'enchant', uid: w.uid, id: 'sog', at: 'fenwick' });    // Stufe 22 nötig
    expect(snap(t)).toBe(before);
    t.send({ t: 'enchant', uid: w.uid, id: 'macht', at: 'fenwick' });
    expect(t.p.char.equip.weapon!.ench).toBe('macht');
    expect(t.p.stats.power).toBeGreaterThan(power0 * 1.03);
    expect(t.count('ess_fire')).toBe(30 - 6);
    const b2 = snap(t);
    t.send({ t: 'enchant', uid: w.uid, id: 'macht', at: 'fenwick' });  // dieselbe Rune noch einmal
    expect(snap(t)).toBe(b2);
    // neue Rune ersetzt die alte
    const power1 = t.p.stats.power;
    t.send({ t: 'enchant', uid: w.uid, id: 'fokus', at: 'fenwick' });
    expect(t.p.char.equip.weapon!.ench).toBe('fokus');
    expect(t.p.stats.power).toBeLessThan(power1);
    expect(t.p.stats.elemPct).toBeGreaterThanOrEqual(8);
    t.send({ t: 'enchant', uid: helm.uid, id: 'vital', at: 'fenwick' });
    expect(t.p.stats.maxHp).toBeGreaterThan(hp0);
    t.send({ t: 'enchant', uid: helm.uid, id: 'schutz_earth', at: 'fenwick' });
    expect(t.p.stats.res.earth).toBe(10);
    expect(t.p.stats.maxHp).toBe(hp0);
    expect(itemMods(t.p.char.equip.helm!).resEarth).toBe(10);
    noNegative(t.p.char);
  });
});

describe('Rüstungssets', () => {
  it('Boni greifen bei 2 und 4 Teilen und verschwinden beim Ablegen', () => {
    const c = newCharacter('Setträger', 'krieger');
    c.level = 20;
    const rng = new Rng(21);
    const piece = (p: (typeof SET_PIECES)[number]) => makeSetPiece(rng, 'aschenglut', p, 'krieger', 2);
    const base = computeStats(c);
    c.equip.helm = piece('helm');
    const one = computeStats(c);
    expect(one.sets.aschenglut).toBe(1);
    c.equip.armor = piece('armor');
    const two = computeStats(c);
    expect(two.sets.aschenglut).toBe(2);
    c.equip.acc1 = piece('ring');
    c.equip.acc2 = piece('ring');                              // zwei gleiche Teile zählen einmal
    expect(computeStats(c).sets.aschenglut).toBe(3);
    c.equip.acc2 = piece('amulet');
    const four = computeStats(c);
    expect(four.sets.aschenglut).toBe(4);
    // Vergleich gegen dieselbe Ausrüstung ohne Set-Kennung
    const strip = (n: number) => { const d: CharData = JSON.parse(JSON.stringify(c)); let k = 0; for (const s of ['helm', 'armor', 'acc1', 'acc2'] as const) if (k++ >= n) delete d.equip[s]!.set; return computeStats(d); };
    const plain = strip(0);
    expect(strip(1).power).toBe(plain.power);
    expect(strip(2).power).toBeCloseTo(plain.power * 1.04, 0);  // 2 Teile: +4 % Angriff
    expect(strip(3).power).toBe(strip(2).power);
    expect(plain.res.fire).toBe(0);
    expect(four.res.fire).toBe(15);                            // 4 Teile: Feuerresistenz
    expect(four.critDmg).toBeCloseTo(plain.critDmg + 0.15, 5);
    expect(four.power).toBe(strip(2).power);
    // ablegen: Bonus weg
    delete c.equip.acc2;
    const three = computeStats(c);
    expect(three.res.fire).toBe(0);
    expect(three.sets.aschenglut).toBe(3);
    delete c.equip.helm; delete c.equip.armor;
    expect(computeStats(c).sets.aschenglut).toBe(1);
    expect(base.res.fire).toBe(0);
    expect(one.power).toBeGreaterThanOrEqual(base.power);
  });
  it('Setteile passen zu jeder Klasse und lassen sich mit Bosskern schmieden', () => {
    for (const cls of CLASS_IDS) for (const s of SET_LIST) for (const p of SET_PIECES) {
      const it = makeSetPiece(new Rng(1), s.id, p, cls);
      expect(it.set).toBe(s.id);
      expect(it.ilvl).toBe(s.ilvl);
      expect(it.rarity).toBeGreaterThanOrEqual(2);
      expect(it.name).toContain(s.gen);
    }
    const t = sim.join('Setschmied', 'magier', 12);
    sim.gotoNpc(t, 'borin');
    const r = RECIPES.f_set_prismenglanz_helm;
    t.p.char.gold = 5000;
    for (const [b, n] of r.inputs) t.give(b, n);
    t.p.removeItems('core_kristallkoloss', 1);
    const before = snap(t);
    t.send({ t: 'craft', id: r.id, at: 'borin' });
    expect(snap(t)).toBe(before);
    t.give('core_kristallkoloss', 1);
    t.send({ t: 'craft', id: r.id, at: 'borin' });
    const it = t.p.char.inv.find(i => i.set === 'prismenglanz')!;
    expect(it.base).toBe('h_robe_3');
    t.send({ t: 'equip', uid: it.uid });
    expect(t.p.stats.sets.prismenglanz).toBe(1);
    t.send({ t: 'unequip', slot: 'helm' });
    expect(t.p.stats.sets.prismenglanz).toBeUndefined();
  });
});

describe('Speisen und Elixiere', () => {
  it('je eine Speise und ein Elixier gleichzeitig; neue ersetzen alte; beides läuft ab', () => {
    const t = sim.join('Feinschmecker', 'krieger', 10);
    t.give('food_spiess', 2); t.give('food_beeren', 1); t.give('elx_power', 1); t.give('elx_guard', 1);
    const use = (base: string) => t.send({ t: 'use', uid: t.p.char.inv.find(i => i.base === base)!.uid });
    const power0 = t.p.stats.power, hp0 = t.p.stats.maxHp, def0 = t.p.stats.def;
    use('food_spiess');
    expect(t.p.buffs.map(b => b.id)).toEqual(['food']);
    expect(t.p.stats.power).toBeCloseTo(power0 * 1.04, 0);
    expect(t.count('food_spiess')).toBe(1);
    use('elx_power');
    expect(t.p.buffs.map(b => b.id).sort()).toEqual(['elixir', 'food']);
    expect(t.p.stats.power).toBeCloseTo(power0 * 1.10, 0);     // 4 % + 6 %
    // zweite Speise ersetzt die erste, zweites Elixier das erste
    use('food_beeren');
    expect(t.p.buffs.filter(b => b.id === 'food').length).toBe(1);
    expect(t.p.buffs.find(b => b.id === 'food')!.item).toBe('food_beeren');
    expect(t.p.stats.maxHp).toBeGreaterThan(hp0);
    expect(t.p.stats.power).toBeCloseTo(power0 * 1.06, 0);
    use('elx_guard');
    expect(t.p.buffs.filter(b => b.id === 'elixir').length).toBe(1);
    expect(t.p.stats.power).toBeCloseTo(power0, 0);
    expect(t.p.stats.def).toBeGreaterThan(def0 * 1.1);
    // die Anzeige bekommt Icon und Beschreibung
    t.p.flush();
    const shown = (t.msgs.filter(m => m.t === 'buffs').at(-1) as any).b as { id: string; icon?: string; desc?: string; dur: number }[];
    expect(shown.find(b => b.id === 'food')!.icon).toBe('item_food');
    expect(shown.find(b => b.id === 'elixir')!.desc).toMatch(/Verteidigung/);
    // Elixier läuft nach 5 Minuten ab, die Speise hält 15
    sim.step(CFG.craft.elixirSec + 1);
    expect(t.p.buffs.map(b => b.id)).toEqual(['food']);
    expect(t.p.stats.def).toBeCloseTo(def0, 0);
    sim.step(CFG.craft.foodSec - CFG.craft.elixirSec);
    expect(t.p.buffs.length).toBe(0);
    expect(t.p.stats.maxHp).toBe(hp0);
  });
  it('Speise übersteht Tod, Abmelden und Laden; das Festmahl stärkt Gruppenmitglieder in der Nähe', () => {
    const a = sim.join('Gastgeber', 'paladin', 22), b = sim.join('Gast', 'magier', 22), c = sim.join('Fremder', 'krieger', 22);
    sim.party(a, b);
    for (const t of [b, c]) { t.p.x = a.p.x + 20; t.p.y = a.p.y; }
    a.give('food_fest', 1);
    a.send({ t: 'use', uid: a.p.char.inv.find(i => i.base === 'food_fest')!.uid });
    expect(a.p.buffs.some(x => x.item === 'food_fest')).toBe(true);
    expect(b.p.buffs.some(x => x.item === 'food_fest')).toBe(true);
    expect(c.p.buffs.length).toBe(0);                            // nicht in der Gruppe
    expect(a.count('food_fest')).toBe(0);
    // Tod: Speise bleibt
    a.p.zone.killPlayer(a.p, 'Test');
    expect(a.p.buffs.some(x => x.item === 'food_fest')).toBe(true);
    a.send({ t: 'respawn' });
    sim.step(60);
    // Abmelden und Laden: Restdauer bleibt (abzüglich der gespielten Minute)
    sim.leave(a); sim.reenter(a);
    const food = a.p.buffs.find(x => x.id === 'food')!;
    expect(food.item).toBe('food_fest');
    const left = food.until - sim.game.now;
    expect(left).toBeGreaterThan(CFG.craft.feastSec - 70);
    expect(left).toBeLessThan(CFG.craft.feastSec - 55);
    expect(a.p.stats.power).toBeGreaterThan(computeStats(a.p.char).power);
  });
  it('bessere Tränke und Läuterung', () => {
    const t = sim.join('Trinker', 'krieger', 30);
    t.give('potion_hp4', 2); t.give('potion_cleanse', 2);
    t.p.hp = 10;
    t.send({ t: 'quick', kind: 'hp' });
    expect(t.p.hp).toBe(Math.min(t.p.stats.maxHp, 10 + 1100));
    expect(t.count('potion_hp4')).toBe(1);
    const cleanse = () => t.send({ t: 'use', uid: t.p.char.inv.find(i => i.base === 'potion_cleanse')!.uid });
    sim.step(CFG.player.potionCooldown + 0.1);
    cleanse();                                                   // nichts zu läutern → bleibt erhalten
    expect(t.count('potion_cleanse')).toBe(2);
    t.p.statuses.set('burn', { until: sim.game.now + 10, dps: 5 });
    t.p.statuses.set('slow', { until: sim.game.now + 10, dps: 0 });
    cleanse();
    expect(t.p.statuses.size).toBe(0);
    expect(t.count('potion_cleanse')).toBe(1);
  });
});

describe('Rohstoffe aus der Welt', () => {
  it('Gegner lassen Monster-Rohstoff, Zutat und Essenz ihres Bioms/Elements fallen; Erwachte garantiert Essenzen', () => {
    const t = sim.join('Sammler', 'krieger', 12);
    sim.travel(t, 'glut');
    const { z, x, y } = sim.arena(t);
    sim.seed(z, 99);
    const got: Record<string, number> = {};
    const orig = z.dropItemFor.bind(z);
    z.dropItemFor = (p, item, dx, dy) => { got[item.base] = (got[item.base] ?? 0) + (item.qty ?? 1); orig(p, item, dx, dy); };
    for (let i = 0; i < 400; i++) { const m = z.spawnMob('glutimp', 12, x + 20, y, false); z.hitMob(m, t.p, 1e7, 'phys'); }
    expect(got.mm_ashclaw).toBeGreaterThan(400 * CFG.loot.monsterMatChance * 0.6);
    expect(got.mm_ashclaw).toBeLessThan(400 * CFG.loot.monsterMatChance * 1.5);
    expect(got.ing_pepper).toBeGreaterThan(400 * CFG.loot.ingredientChance * 0.5);
    expect(got.ess_fire).toBeGreaterThan(400 * CFG.loot.essenceChance * 0.5);
    expect(got.ess_water ?? 0).toBe(0);
    expect(got.mat_aether ?? 0).toBe(0);                         // normale Gegner: nie Ätherstaub
    // Erwachte: jedes Mal Essenzen, mehr Rohstoffe, sehr selten Ätherstaub und Rezeptrollen
    for (const k in got) delete got[k];
    for (let i = 0; i < 300; i++) { const m = z.spawnMob('glutimp', 12, x + 20, y, false); m.elite = true; z.hitMob(m, t.p, 1e7, 'phys'); }
    expect(got.ess_fire).toBeGreaterThanOrEqual(300 * CFG.loot.eliteEssence[0]);
    expect(got.mm_ashclaw).toBeGreaterThan(300 * CFG.loot.monsterMatChance * CFG.loot.eliteMatMul * 0.6);
    expect(got.mat_aether).toBeGreaterThan(0);
    expect(got.mat_aether).toBeLessThan(300 * CFG.loot.aetherElite * 3);
    expect(Object.keys(got).some(k => k.startsWith('rs_'))).toBe(true);
    // beschworene Gegner geben nichts
    for (const k in got) delete got[k];
    for (let i = 0; i < 50; i++) { const m = z.spawnMob('glutimp', 12, x + 20, y, true); z.hitMob(m, t.p, 1e7, 'phys'); }
    expect(Object.keys(got).length).toBe(0);
  });
  it('Abbaustellen geben zusätzlich die Zutat des Gebiets', () => {
    const t = sim.join('Pflueckerin', 'waldlaeufer', 3);
    const z = t.p.zone;
    sim.seed(z, 5);
    let herbs = 0;
    for (const o of z.objs.values()) {
      if (o.type !== 'node') continue;
      t.p.x = o.x; t.p.y = o.y + 12;
      t.send({ t: 'interact', id: o.id });
      herbs++;
    }
    expect(herbs).toBeGreaterThan(10);
    expect(t.count('mat_herb') + t.count('mat_wood')).toBeGreaterThanOrEqual(herbs);
    expect(t.count('ing_berry')).toBeGreaterThan(0);
    expect(t.count('ing_berry')).toBeLessThan(herbs);
  });
  it('Bosse: Bosskern beim ersten Sieg garantiert, Essenzen; Bosstruhe mit Setteil', () => {
    const t = sim.join('Bossjaegerin', 'magier', 12);
    sim.travel(t, 'wurzelgruft');
    const z = t.p.zone;
    sim.seed(z, 1234);
    const room = z.map.bossRoom!;
    t.p.x = room.cx * 16; t.p.y = (room.y1 - 1) * 16; t.p.god = true;
    sim.step(0.5);
    expect(z.boss!.active).toBe(true);
    z.hitMob(z.boss!.mob, t.p, 1e9, 'phys');
    expect(t.count('core_dornenmutter')).toBe(1);
    expect(t.count('ess_earth')).toBeGreaterThanOrEqual(CFG.loot.bossEssence[0]);
    const chest = [...z.objs.values()].find(o => o.type === 'chest' && o.props?.boss)!;
    t.p.x = chest.x; t.p.y = chest.y + 12;
    t.send({ t: 'interact', id: chest.id });
    const setPiece = t.p.char.inv.find(i => i.set === 'wurzelwacht');
    expect(setPiece).toBeTruthy();                               // erstes Öffnen: garantiert ein Schmuckstück
    expect(['c_ring_2', 'c_amulet_2']).toContain(setPiece!.base);
    expect(t.p.char.flags['sd:wurzelwacht']).toBe(1);
  });
});

describe('Alte Spielstände', () => {
  it('ein Stand aus 0.2 ohne die neuen Felder lädt und funktioniert', () => {
    const t = sim.join('Altlast', 'krieger', 1);
    const id = sim.db.listChars(t.s.account!.id)[0].id;
    sim.leave(t);
    // so sah ein Charakter vor 0.4 aus: keine recipes/timed, Gegenstände ohne elv/ench/set
    const old: any = newCharacter('Altlast', 'krieger');
    delete old.recipes; delete old.timed;
    old.level = 14; old.gold = 321; old.attrs.str = 30;
    old.equip.weapon = { uid: 'old-w', base: 'w_sword_3', rarity: 3, ilvl: 13, up: 5, affixes: [['str', 6], ['crit', 3]], element: 'fire', name: 'Schlackenbrand' };
    old.inv.push({ uid: 'old-m', base: 'mat_ember', rarity: 0, ilvl: 1, up: 0, affixes: [], qty: 7 });
    old.flags = { 'b:dornenmutter': 2, 'u:dornenmutter': 1, intro: 1 };
    expect('recipes' in old).toBe(false);
    sim.db.saveChar(id, old);
    sim.reenter(t);
    const c = t.p.char;
    expect(c.level).toBe(14);
    expect(c.gold).toBe(321);
    expect(c.equip.weapon).toMatchObject({ uid: 'old-w', element: 'fire', up: 5, name: 'Schlackenbrand' });
    expect(c.equip.weapon!.elv).toBeUndefined();
    expect(c.recipes).toBeUndefined();
    expect(t.p.stats.attackElement).toBe('fire');
    expect(t.p.stats.elemLvl).toBe(1);                           // altes Element zählt als Stufe 1
    expect(t.p.stats.res.fire).toBe(0);
    expect(t.p.stats.sets).toEqual({});
    expect(t.p.buffs.length).toBe(0);
    // und er kann sofort handwerken: die alte Elementwaffe auf Stufe 2 bringen
    sim.gotoNpc(t, 'borin');
    t.p.char.gold = 100000; t.give('ess_fire', CFG.craft.infuseEssences[1]);
    t.send({ t: 'infuse', uid: 'old-w', el: 'fire', at: 'borin' });
    expect(c.equip.weapon!.elv).toBe(2);
    t.give(scrollOf('c_fest'), 1);
    t.send({ t: 'use', uid: c.inv.find(i => i.base === scrollOf('c_fest'))!.uid });
    expect(c.recipes).toEqual(['c_fest']);
    sim.leave(t); sim.reenter(t);
    expect(t.p.char.equip.weapon!.elv).toBe(2);
    expect(t.p.char.recipes).toEqual(['c_fest']);
  });
  it('unbekannte oder beschädigte Werte in den neuen Feldern werden bereinigt', () => {
    const raw: any = newCharacter('Kaputt', 'magier');
    raw.recipes = ['c_fest', 'c_fest', 'gibtsnicht', 7];
    raw.timed = { food: ['food_spiess', 400], elixir: ['food_spiess', 100], quatsch: ['x', 1] };
    raw.equip.weapon = { ...raw.equip.weapon, element: 'fire', elv: 99, ench: 'gibtsnicht', set: 'auchnicht' };
    raw.inv.push({ uid: 'x1', base: 'h_robe_1', rarity: 1, ilvl: 3, up: 0, affixes: [], elv: 2, ench: 'vital', set: 'wurzelwacht' });
    const c = sanitizeChar(raw)!;
    expect(c.recipes).toEqual(['c_fest']);
    expect(c.timed).toEqual({ food: ['food_spiess', 400] });
    expect(c.equip.weapon).toMatchObject({ element: 'fire', elv: 3 });
    expect(c.equip.weapon!.ench).toBeUndefined();
    expect(c.equip.weapon!.set).toBeUndefined();
    const helm = c.inv.find(i => i.uid === 'x1')!;
    expect(helm.elv).toBeUndefined();                            // ohne Element keine Elementstufe
    expect(helm.ench).toBe('vital');
    expect(helm.set).toBe('wurzelwacht');
    expect(() => computeStats(c)).not.toThrow();
  });
});
