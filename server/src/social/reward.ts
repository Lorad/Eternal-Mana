/**
 * Gruppenbelohnung (0.7): die Gruppentruhe nach einem Dungeon- oder Riss-Boss – und „Spieler ansehen“.
 *
 * Die Gruppentruhe erscheint zusätzlich zur gewöhnlichen Belohnung, wenn mindestens CFG.social.groupChest.min Mitglieder
 * DERSELBEN Gruppe beim Sieg in der Instanz waren (auch Gefallene zählen, Getrennte nicht). Öffnen darf sie, wer dabei war;
 * der Inhalt wird für jeden einzeln gewürfelt – Beute bleibt persönlich.
 */
import { circleFree } from '../../../shared/src/collision';
import { CFG } from '../../../shared/src/config';
import { TIER_MATERIAL, generateGear, makeStack, rollRarity, tierOf } from '../../../shared/src/data/items';
import { BIOME_MATS, ECHO_FRAG } from '../../../shared/src/data/materials';
import { kreisOf, titleName } from '../../../shared/src/data/rifts';
import { TILE } from '../../../shared/src/maps/tiles';
import type { InspectInfo } from '../../../shared/src/types';
import type { Game, Party } from '../game';
import type { Player } from '../player';
import type { Obj, Zone } from '../zone';
import { ss } from './state';

const C = CFG.social.groupChest;

/** Wer hat gemeinsam gekämpft? Mitglieder von Gruppen, die mit mindestens `min` Leuten in der Instanz stehen. */
export function chestCrew(z: Zone): Set<number> {
  const by = new Map<Party, Player[]>();
  for (const p of z.players.values()) if (p.party && !p.linkdead) by.set(p.party, [...(by.get(p.party) ?? []), p]);
  const out = new Set<number>();
  for (const list of by.values()) if (list.length >= C.min) for (const p of list) out.add(p.charId);
  return out;
}
/** Stellt die Gruppentruhe neben die Boss-Belohnung (nächste freie Stelle um den Wunschplatz). Aufruf nach einem Bosssieg. */
export function spawnGroupChest(z: Zone, x: number, y: number): Obj | null {
  const crew = chestCrew(z);
  if (!crew.size) return null;
  let spot = { x, y };
  search: for (let r = 0; r <= 4; r++) for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++) {
    if (Math.max(Math.abs(ox), Math.abs(oy)) !== r) continue;
    const cx = x + ox * TILE, cy = y + oy * TILE;
    if (!circleFree(z.solidWalk, cx, cy, 7) || [...z.objs.values()].some(o => Math.hypot(o.x - cx, o.y - cy) < 24)) continue;
    spot = { x: cx, y: cy };
    break search;
  }
  const o = z.addDynamicObj('chest', spot.x, spot.y, { tier: 'silver', group: 1, label: 'Gruppentruhe' });
  ss(z.game).chests.set(o, crew);
  for (const p of z.players.values()) if (crew.has(p.charId)) p.toast('Gemeinsam geschafft: Eine Gruppentruhe ist erschienen. Jeder findet darin seine eigene Beute.', 'good');
  return o;
}
export function mayOpenGroupChest(z: Zone, p: Player, o: Obj): boolean {
  if (ss(z.game).chests.get(o)?.has(p.charId)) return true;
  p.toast('Diese Truhe gehört denen, die den Kampf gemeinsam bestritten haben.', 'bad');
  return false;
}
/** Persönlicher Inhalt der Gruppentruhe: Gold, ein Ausrüstungsteil für die eigene Klasse, Rohstoffe, Tränke – im Riss dazu Echo-Fragmente. */
export function groupChestLoot(z: Zone, p: Player) {
  const r = z.rng, lvl = z.rift ? z.rift.ilvl : Math.min(z.def.level[1], z.ilvlCap);
  const mobLvl = z.rift ? z.rift.lvl : z.def.level[1];
  p.gainGold(CFG.enemy.gold(mobLvl) * r.range(C.gold[0], C.gold[1]) * (1 + p.stats.goldPct / 100));
  p.give(generateGear(r, lvl, Math.max(C.gearMinRarity, rollRarity(r, CFG.loot.chestRarityWeights.silver)), p.char.cls));
  const bio = BIOME_MATS[z.def.biome];
  p.give(makeStack(bio ? bio.monster : TIER_MATERIAL[tierOf(Math.min(lvl, CFG.player.maxLevel)) - 1], r.int(C.mats[0], C.mats[1])));
  p.give(makeStack(mobLvl <= 8 ? 'potion_hp1' : mobLvl <= 20 ? 'potion_hp2' : 'potion_hp3', C.potions));
  if (z.rift) p.give(makeStack(ECHO_FRAG, C.fragments));
}

// ------------------------------------------------------------------ Spieler ansehen
export function inspect(g: Game, p: Player, id: number) {
  const st = ss(g);
  if (g.now - (st.inspectAt.get(p) ?? -99) < CFG.social.inspectCooldownSec) return;
  st.inspectAt.set(p, g.now);
  const t = [...g.players.values()].find(q => q.id === id);
  if (!t || t.linkdead) return;
  const c = t.char, s = t.stats;
  const i: InspectInfo = {
    id: t.id, name: t.name, cls: c.cls, level: t.level, title: titleName(c), kreis: kreisOf(c), quell: c.quell?.lvl ?? 0, riftStufe: c.rift?.stufe ?? 1,
    equip: c.equip, sets: s.sets, pet: c.pet, look: c.look,
    stats: { maxHp: s.maxHp, maxMp: s.maxMp, power: Math.round(s.power), def: Math.round(s.def), crit: Math.round(s.crit * 1000) / 10, el: s.attackElement },
  };
  p.send({ t: 'inspect', i });
}
