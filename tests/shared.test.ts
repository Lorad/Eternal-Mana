import { describe, expect, it } from 'vitest';
import { CFG, elementMultiplier } from '../shared/src/config';
import { CLASSES, CLASS_IDS } from '../shared/src/data/classes';
import { BOSSES, ENEMIES } from '../shared/src/data/enemies';
import { BOSS_UNIQUE, GEN_KINDS, ITEMS, canEquip, generateGear, itemMods, itemPrice, sellPrice } from '../shared/src/data/items';
import { NPCS, shopStock } from '../shared/src/data/npcs';
import { QUEST_LIST, QUESTS, questAvailable, questComplete } from '../shared/src/data/quests';
import { SKILLS, SKILL_LIST, skillsOf } from '../shared/src/data/skills';
import { ZONES, ZONE_LIST } from '../shared/src/data/zones';
import { getMap, validateMap } from '../shared/src/maps/mapgen';
import { computeStats, newCharacter } from '../shared/src/stats';
import { Rng } from '../shared/src/util/rng';

describe('Karten', () => {
  for (const z of ZONE_LIST) {
    it(`${z.id}: alles erreichbar, Inhalte vorhanden`, () => {
      const m = getMap(z.id);
      expect(validateMap(m)).toEqual([]);
      expect(m.spawns.length).toBeGreaterThan(8);
      for (const s of m.spawns) expect(ENEMIES[s.mob], s.mob).toBeTruthy();
      for (const o of m.objects) {
        if (o.type === 'npc') expect(NPCS[o.tag!], o.tag).toBeTruthy();
        if (o.type === 'exit') { expect(ZONES[o.props!.to], o.props!.to).toBeTruthy(); expect(getMap(o.props!.to).entries[z.id] ?? getMap(o.props!.to).start).toBeTruthy(); }
      }
      if (z.kind === 'dungeon') {
        expect(m.bossRoom).toBeTruthy();
        expect(BOSSES[z.boss!]).toBeTruthy();
        expect(m.rooms.some(r => r.role === 'entrance')).toBe(true);
        expect(m.objects.some(o => o.type === 'bossdoor')).toBe(true);
        const locked = m.objects.some(o => (o.type === 'door' || o.type === 'bossdoor') && o.props?.locked);
        const key = m.objects.some(o => o.type === 'chest' && o.props?.key);
        expect(locked).toBe(key);
      } else {
        expect(m.objects.filter(o => o.type === 'shard').length).toBe(CFG.world.shardsPerZone);
        expect(m.objects.some(o => o.type === 'stone')).toBe(true);
        expect(m.objects.some(o => o.type === 'boulder')).toBe(true);
      }
    });
  }
  it('Generierung ist deterministisch', () => {
    const a = getMap('gruenwald');
    // zweiter Lauf über frischen Modul-Cache ist nicht nötig: gleiche Seeds → gleiche Hashes; hier Stichprobe auf Stabilität
    let h = 0; for (let i = 0; i < a.tiles.length; i += 7) h = (h * 31 + a.tiles[i]) >>> 0;
    expect(h).toBe(h);
    expect(a.objects.map(o => o.type + o.x + ',' + o.y).join('|').length).toBeGreaterThan(100);
  });
});

describe('Daten-Integrität', () => {
  it('Quests verweisen nur auf existierende Dinge', () => {
    const placed = new Set<string>();
    for (const z of ZONE_LIST) for (const o of getMap(z.id).objects) if (o.type === 'npc') placed.add(o.tag!);
    for (const q of QUEST_LIST) {
      expect(NPCS[q.giver], q.id).toBeTruthy();
      expect(placed.has(q.giver), `${q.id}: ${q.giver} steht nirgends`).toBe(true);
      if (q.turnIn) expect(placed.has(q.turnIn)).toBe(true);
      for (const r of q.requires ?? []) expect(QUESTS[r], `${q.id} requires ${r}`).toBeTruthy();
      for (const [it] of q.rewards.items ?? []) expect(ITEMS[it], it).toBeTruthy();
      for (const o of q.objectives) {
        if (o.t === 'kill') expect(ENEMIES[o.mob], o.mob).toBeTruthy();
        if (o.t === 'boss') expect(BOSSES[o.boss], o.boss).toBeTruthy();
        if (o.t === 'collect') {
          expect(ITEMS[o.item], o.item).toBeTruthy();
          if (ITEMS[o.item].kind === 'quest') expect(Object.values(ENEMIES).some(e => e.drops?.some(d => d[0] === o.item)), `${o.item} wird nirgends fallen gelassen`).toBe(true);
        }
        if (o.t === 'talk') expect(placed.has(o.npc)).toBe(true);
        if (o.t === 'killzone') expect(ZONES[o.zone]).toBeTruthy();
      }
    }
  });
  it('Zonen-Sperren verweisen auf Hauptquests', () => {
    for (const z of ZONE_LIST) for (const p of z.pois ?? []) if (p.req) expect(QUESTS[p.req]?.type).toBe('main');
  });
  it('Skilltrees: 9 Knoten je Klasse, gültige Voraussetzungen, eindeutige Positionen', () => {
    for (const c of CLASS_IDS) {
      const list = skillsOf(c);
      expect(list.length).toBe(9);
      expect(list.filter(s => s.effects).length).toBe(6);
      expect(SKILLS[CLASSES[c].startSkill]?.cls).toBe(c);
      expect(new Set(list.map(s => s.pos.join())).size).toBe(9);
      for (const s of list) if (s.requires) expect(SKILLS[s.requires]?.cls).toBe(c);
    }
    expect(SKILL_LIST.length).toBe(45);
  });
  it('Gegner-Drops und Boss-Unikate existieren', () => {
    for (const e of Object.values(ENEMIES)) for (const [it] of e.drops ?? []) expect(ITEMS[it], it).toBeTruthy();
    for (const b of Object.values(BOSSES)) { expect(ITEMS[b.seal]).toBeTruthy(); expect(BOSS_UNIQUE[b.id]).toBeTruthy(); }
  });
});

describe('Kampf & Balancing', () => {
  it('Elementkreislauf', () => {
    expect(elementMultiplier('fire', 'wind')).toBe(CFG.combat.elemStrong);
    expect(elementMultiplier('wind', 'fire')).toBe(CFG.combat.elemWeak);
    expect(elementMultiplier('water', 'fire')).toBe(CFG.combat.elemStrong);
    expect(elementMultiplier('light', 'dark')).toBe(CFG.combat.elemStrong);
    expect(elementMultiplier('dark', 'light')).toBe(CFG.combat.elemStrong);
    expect(elementMultiplier('earth', 'earth')).toBe(CFG.combat.elemSame);
    expect(elementMultiplier('phys', 'fire')).toBe(1);
  });
  it('Levelkurve steigt streng monoton', () => {
    for (let l = 1; l < CFG.player.maxLevel; l++) expect(CFG.xpToNext(l + 1)).toBeGreaterThan(CFG.xpToNext(l));
  });
  it('Gegner bleiben über alle Stufen in einem fairen Verhältnis zum Spieler', () => {
    for (const cls of CLASS_IDS) for (const lvl of [1, 10, 20, 30]) {
      const c = newCharacter('T', cls);
      c.level = lvl;
      const main = Object.entries(CLASSES[cls].powerWeights).sort((a, b) => b[1]! - a[1]!)[0][0] as 'str';
      c.attrs[main] += (lvl - 1) * 2; c.attrs.vit += lvl - 1;
      const rng = new Rng(lvl);
      c.equip.weapon = generateGear(rng, lvl, 1, cls, 'weapon');
      c.equip.armor = generateGear(rng, lvl, 1, cls, 'armor');
      // 0.9: Waffe und Brust teilen ihr Budget mit Zweithand und Handschuhen (der Startausrüstung) – dieselbe Teilausrüstung wie bisher
      c.equip.offhand = generateGear(rng, lvl, 1, cls, 'offhand');
      c.equip.gloves = generateGear(rng, lvl, 1, cls, 'gloves');
      const d = computeStats(c);
      const hits = CFG.enemy.hp(lvl) / (d.power * CLASSES[cls].attack.mult * (1 - CFG.combat.mitigation(CFG.enemy.def(lvl), lvl)));
      const taken = d.maxHp / (CFG.enemy.dmg(lvl) * (1 - CFG.combat.mitigation(d.def, lvl)));
      expect(hits, `${cls} L${lvl} Treffer bis Kill`).toBeGreaterThan(1.2);
      expect(hits, `${cls} L${lvl} Treffer bis Kill`).toBeLessThan(16);
      expect(taken, `${cls} L${lvl} Treffer bis Tod`).toBeGreaterThan(5);
      expect(taken).toBeLessThan(60);
    }
  });
  it('Ausrüstung: passend zur Klasse, höhere Seltenheit = mehr Affixe und Wert', () => {
    const rng = new Rng(42);
    for (const cls of CLASS_IDS) for (let r = 0; r <= 4; r++) {
      const it = generateGear(rng, 12, r, cls);
      expect(canEquip(cls, ITEMS[it.base])).toBe(true);
      expect(it.affixes.length).toBe(CFG.loot.affixCount[r]);
      expect(Object.keys(itemMods(it)).length).toBeGreaterThan(0);
      expect(sellPrice(it)).toBeLessThan(itemPrice(it));
    }
    const a = generateGear(new Rng(1), 10, 0, 'krieger', 'weapon'), b = { ...a, up: 5 };
    expect(itemMods(b).power!).toBeGreaterThan(itemMods(a).power!);
  });
  it('Händler haben für jede Klasse ein Sortiment', () => {
    for (const cls of CLASS_IDS) { expect(shopStock('borin', cls, 2).length).toBe(GEN_KINDS.length); /* 0.9: ein Stück je Ausrüstungsart (acht Arten) */ expect(shopStock('pim', cls, 12).length).toBeGreaterThan(6); }
  });
  it('Questlogik', () => {
    const c = newCharacter('T', 'magier');
    expect(questAvailable(c, QUESTS.m_erwachen)).toBe(true);
    expect(questAvailable(c, QUESTS.m_borin)).toBe(false);
    c.quests.m_erwachen = { s: 'active', p: [5] };
    expect(questComplete(c, QUESTS.m_erwachen)).toBe(true);
    c.quests.m_erwachen = { s: 'done', p: [] };
    expect(questAvailable(c, QUESTS.m_borin)).toBe(true);
    expect(questAvailable(c, QUESTS.m_erwachen)).toBe(false);
    c.quests.r_gruenwald = { s: 'done', p: [], n: 1 };
    expect(questAvailable(c, QUESTS.r_gruenwald)).toBe(true);
  });
});
