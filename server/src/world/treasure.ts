/**
 * Verborgene Schätze (0.6): Schatzkarte lesen → Grabstelle der Region ist markiert → vor Ort graben.
 * Die Stelle ergibt sich deterministisch aus Charakter, Region und der Zahl schon gehobener Schätze
 * (shared/src/world.ts) – der Client kann sie anzeigen, entschieden wird hier: Karte gelesen, Karte noch im Besitz,
 * richtige Zone, richtige Stelle. Dazu die Trophäen-Sammlung (Flag `tr:<id>`).
 */
import { CFG } from '../../../shared/src/config';
import { ITEMS, generateGear, makeStack, rollRarity } from '../../../shared/src/data/items';
import { AETHER, BIOME_MATS, ESSENCE, TIER_ORE } from '../../../shared/src/data/materials';
import { REGIONS, STAR, TROPHY_IDS, mapOf } from '../../../shared/src/data/worlditems';
import { ZONES } from '../../../shared/src/data/zones';
import { getMap } from '../../../shared/src/maps/mapgen';
import type { ItemInstance } from '../../../shared/src/types';
import { activeTreasure, treasureHint, treasureIndex, treasureSpots } from '../../../shared/src/world';
import type { Player } from '../player';
import { worldScroll } from './events';
import { addZoneRep } from './rep';

const T = CFG.living.treasure;
function reject(p: Player, s: string) { p.toast(s, 'bad'); p.pev.push({ k: 'sfx', n: 'ui_error' }); return false; }

/** Schatzkarte benutzen: markiert die Grabstelle (die Karte bleibt im Rucksack, bis der Schatz gehoben ist). */
export function readMap(p: Player, it: ItemInstance): boolean {
  const zone = ITEMS[it.base].use!.tmap!, def = ZONES[zone];
  if (!def) return false;
  const map = getMap(zone), key = `tk:${zone}`;
  const active = activeTreasure(p.char, map);
  if (active) { p.toast(`Du folgst bereits einer Karte dieser Gegend. ${treasureHint(map, active)}`, 'info'); return false; }
  const idx = treasureIndex(p.char, map);
  if (!idx) return reject(p, 'Die Karte zeigt nichts, was es noch gäbe.');
  p.char.flags[key] = idx; p.sync('flags');
  p.toast(`Schatzkarte (${def.name}): ${treasureHint(map, treasureSpots(map)[idx - 1])}`, 'story', 'item_scroll');
  p.pev.push({ k: 'sfx', n: 'secret' });
  return true;
}
/** Graben: nur mit gelesener Karte im Besitz, in der richtigen Zone und an der richtigen Stelle. */
export function dig(p: Player): boolean {
  const z = p.zone, map = z.map, key = `tk:${z.id}`;
  if (p.dead) return false;
  const spot = activeTreasure(p.char, map);
  if (!spot) return reject(p, 'Du hast keine Schatzkarte dieser Gegend gelesen. Aufs Geratewohl graben macht nur Löcher.');
  if (!p.countItem(mapOf(z.id))) return reject(p, 'Ohne die Karte in der Hand gräbst du nur ein Loch. Ein schönes, aber leeres.');
  if (Math.hypot(spot.x - p.x, spot.y - p.y) > T.radius) return reject(p, `Hier ist nichts. ${treasureHint(map, spot)}`);
  p.removeItems(mapOf(z.id), 1);
  delete p.char.flags[key];
  p.char.flags[`tm:${z.id}`] = (p.char.flags[`tm:${z.id}`] ?? 0) + 1;
  p.sync('flags');
  // Belohnung
  const r = z.rng, lvl = z.def.level[1], bio = BIOME_MATS[z.def.biome], tier = Math.max(0, REGIONS.indexOf(z.id as any));
  p.gainGold(CFG.enemy.gold(lvl) * r.range(T.gold[0], T.gold[1]) * (1 + p.stats.goldPct / 100));
  p.give(generateGear(r, Math.min(z.ilvlCap, lvl + 1), Math.max(2, rollRarity(r, T.rarity)), p.char.cls)); // in Welten der Neuen Kreise auch über Stufe 40
  if (bio) { p.give(makeStack(bio.monster, r.int(3, 5))); p.give(makeStack(bio.ingredient, r.int(2, 4))); }
  p.give(makeStack(TIER_ORE[tier], r.int(2, 4)));
  p.give(makeStack(r.pick(Object.values(ESSENCE)), r.int(2, 3)));
  p.give(makeStack(STAR, r.int(1, 2)));
  if (r.chance(T.aether)) p.give(makeStack(AETHER));
  if (r.chance(T.scroll)) { const s = worldScroll(z, p); if (s) p.give(makeStack(s)); }
  addZoneRep(p, z.id, CFG.living.rep.treasure);
  p.toast('Schatz gehoben! Jemand hat sich viel Mühe gegeben, das hier nie wiederzufinden.', 'good');
  z.ev({ k: 'fx', n: 'rubble', x: spot.x, y: spot.y });
  z.ev({ k: 'fx', n: 'shard', x: spot.x, y: spot.y });
  p.pev.push({ k: 'sfx', n: 'chest_open' });
  return true;
}
/** Trophäe in die Sammlung aufnehmen */
export function useTrophy(p: Player, it: ItemInstance): boolean {
  const id = ITEMS[it.base].use!.trophy!, key = `tr:${id}`;
  if (p.char.flags[key]) { p.toast('Diese Trophäe steht schon in deiner Sammlung. Die zweite kannst du verkaufen – Sammler zahlen gut.', 'info'); return false; }
  p.char.flags[key] = 1; p.sync('flags');
  p.removeItems(it.base, 1);
  const n = TROPHY_IDS.filter(t => p.char.flags[`tr:${t}`]).length;
  p.toast(`${ITEMS[it.base].name} – in die Sammlung aufgenommen (${n}/${TROPHY_IDS.length}).`, 'good', 'item_' + ITEMS[it.base].icon);
  p.pev.push({ k: 'sfx', n: 'quest_progress' });
  return true;
}
