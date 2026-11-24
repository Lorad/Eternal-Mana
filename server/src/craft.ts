/**
 * Handwerk (0.4) auf dem Server: Herstellen, Umschmieden, Element einschmieden, Verzaubern, Rezepte lernen,
 * Speisen und Elixiere. Jede Aktion wird hier geprüft – Rezept bekannt, Rohstoffe und Gold vorhanden,
 * Nähe zur Station, Platz im Inventar. Die Regeln selbst stehen in shared/src/craft.ts.
 */
import { CFG, ELEMENTS, ELEMENT_NAME } from '../../shared/src/config';
import { craftBlock, enchantBlock, enchantCost, infuseBlock, infusePlan, knowsRecipe, makeCrafted, makeLegendary, makeSetPiece, recipeCost, recipeLabel, reforgeBlock, reforgeCost, stationsOf, type Cost } from '../../shared/src/craft';
import { ITEMS, itemName, makeStack, rollAffixes } from '../../shared/src/data/items';
import { AETHER, ALL_CORES, ESSENCE, TIER_INGREDIENT, TIER_MONSTER, TIER_ORE } from '../../shared/src/data/materials';
import { COOK_SPOTS, ENCHANTS, FIRE, HOME_AT, LEARNABLE, RECIPES, type InfuseElement, type StationId } from '../../shared/src/data/recipes';
import { SETS, SET_PIECES } from '../../shared/src/data/sets';
import type { GameMap } from '../../shared/src/maps/mapgen';
import { TILE } from '../../shared/src/maps/tiles';
import { MOD_LABEL, SLOTS } from '../../shared/src/types';
import type { ClientMsg, ItemInstance, ModKey, Mods } from '../../shared/src/types';
import type { Game } from './game';
import { Home } from './home';
import { nextId, type Player } from './player';
import type { Obj } from './zone';

export type CraftMsg = Extract<ClientMsg, { t: 'craft' | 'reforge' | 'infuse' | 'enchant' }>;

// ------------------------------------------------------------------ Stationen
/** Lagerfeuer der Zone: je Eintrag in COOK_SPOTS die nächste freie Kachel neben dem Lagerplatz. */
export function cookFires(map: GameMap): Obj[] {
  const out: Obj[] = [];
  for (const [poiId, dx, dy, look] of COOK_SPOTS[map.id] ?? []) {
    const poi = map.def.pois?.find(p => p.id === poiId);
    if (!poi) continue;
    const taken = (tx: number, ty: number) => map.objects.some(o => Math.abs(Math.floor(o.x / TILE) - tx) <= 1 && Math.abs(Math.floor(o.y / TILE) - ty) <= 1);
    let best: [number, number] | null = null;
    for (let r = 0; r <= 4 && !best; r++) for (let oy = -r; oy <= r && !best; oy++) for (let ox = -r; ox <= r && !best; ox++) {
      if (Math.max(Math.abs(ox), Math.abs(oy)) !== r) continue;
      const tx = poi.x + dx + ox, ty = poi.y + dy + oy;
      if (tx < 1 || ty < 1 || tx >= map.w - 1 || ty >= map.h - 1 || map.solid[ty * map.w + tx] || taken(tx, ty)) continue;
      best = [tx, ty];
    }
    if (!best) continue;
    out.push({ id: nextId(), type: 'cookfire', x: best[0] * TILE + TILE / 2, y: best[1] * TILE + TILE / 2, state: 0, props: { look, sid: 'fire' + out.length } });
  }
  return out;
}
/** Steht der Spieler an `at` (NPC-ID oder 'fire') und bietet diese Stelle die Station an? */
export function atStation(g: Game, p: Player, at: string, station: StationId): boolean {
  if (typeof at !== 'string' || !stationsOf(at).includes(station)) return false;
  if (at === HOME_AT) return Home.atStation(p, station); // 0.7: Stationen auf einem ausgebauten Hof
  if (at === FIRE) { for (const o of p.zone.objs.values()) if (o.type === 'cookfire' && Math.hypot(o.x - p.x, o.y - p.y) <= CFG.craft.fireRadius) return true; return false; }
  return g.nearNpc(p, at);
}

function reject(p: Player, s: string) { p.toast(s, 'bad'); p.pev.push({ k: 'sfx', n: 'ui_error' }); }
function pay(p: Player, cost: Cost) {
  p.char.gold -= cost.gold;
  for (const [b, n] of cost.mats) p.removeItems(b, n);
  p.sync('gold', 'inv');
}
function findGear(p: Player, uid: string): ItemInstance | undefined {
  return p.char.inv.find(i => i.uid === uid) ?? SLOTS.map(s => p.char.equip[s]).find(i => i?.uid === uid);
}
const AWAY = 'Dafür musst du an der passenden Station stehen.';

// ------------------------------------------------------------------ Nachrichten
export function handleCraft(g: Game, p: Player, m: CraftMsg) {
  if (p.dead) return;
  const rng = p.zone.rng;
  switch (m.t) {
    case 'craft': {
      const r = RECIPES[m.id];
      if (!r) return;
      if (!atStation(g, p, m.at, r.station) || (r.npcs && !r.npcs.includes(m.at))) return reject(p, AWAY);
      const n = r.out.k === 'item' ? Math.max(1, Math.min(CFG.craft.maxBatch, Math.floor(Number(m.n) || 1))) : 1;
      const why = craftBlock(p.char, r, n);
      if (why) return reject(p, why);
      pay(p, recipeCost(r, n));
      const it = makeCrafted(rng, r, p.char, n);
      p.give(it);
      p.pev.push({ k: 'sfx', n: r.station === 'forge' ? 'upgrade_success' : r.station === 'cooking' ? 'harvest' : 'potion' });
      if (r.out.k === 'legend') { p.toast(`${itemName(it)} ist geschmiedet. Sechs Kerne, eine Waffe.`, 'good'); p.zone.ev({ k: 'fx', n: 'levelup', x: p.x, y: p.y }); }
      return;
    }
    case 'reforge': {
      const it = findGear(p, m.uid);
      if (!it) return;
      if (!atStation(g, p, m.at, 'forge')) return reject(p, AWAY);
      const why = reforgeBlock(p.char, it);
      if (why) return reject(p, why);
      pay(p, reforgeCost(it));
      it.affixes = rollAffixes(rng, it.ilvl, it.rarity, p.char.cls, ITEMS[it.base].kind === 'weapon');
      p.recalc(); p.sync('inv', 'equip');
      p.toast(`${itemName(it)} wurde umgeschmiedet.`, 'good');
      p.pev.push({ k: 'sfx', n: 'upgrade_success' });
      return;
    }
    case 'infuse': {
      const it = findGear(p, m.uid);
      if (!it || !ELEMENTS.includes(m.el)) return;
      if (!atStation(g, p, m.at, 'forge')) return reject(p, AWAY);
      const el = m.el as InfuseElement;
      const why = infuseBlock(p.char, it, el);
      if (why) return reject(p, why);
      const plan = infusePlan(it, el)!;
      pay(p, plan.cost);
      it.element = el; it.elv = plan.level;
      p.recalc(); p.sync('inv', 'equip');
      p.toast(`${itemName(it)}: ${ELEMENT_NAME[el]} eingeschmiedet (Elementstufe ${plan.level}).`, 'good');
      p.pev.push({ k: 'sfx', n: 'upgrade_success' });
      return;
    }
    case 'enchant': {
      const it = findGear(p, m.uid), e = ENCHANTS[m.id];
      if (!it || !e) return;
      if (!atStation(g, p, m.at, 'enchant')) return reject(p, AWAY);
      const why = enchantBlock(p.char, it, m.id);
      if (why) return reject(p, why);
      pay(p, enchantCost(e));
      it.ench = e.id;
      p.recalc(); p.sync('inv', 'equip');
      p.toast(`${itemName(it)} trägt nun die ${e.name}.`, 'good');
      p.pev.push({ k: 'sfx', n: 'buff' });
      return;
    }
  }
}

// ------------------------------------------------------------------ Verbrauchsgüter: Rezeptrollen, Speisen, Elixiere, Läuterung
export function modsText(mods: Mods): string {
  return (Object.keys(mods) as ModKey[]).map(k => `${mods[k]! > 0 ? '+' : ''}${mods[k]} ${MOD_LABEL[k]}`).join(' · ');
}
/** Legt Speise oder Elixier als Buff an (ein Platz je Art: ein neuer ersetzt den alten). */
export function applyTimed(p: Player, base: string, secs: number) {
  const b = ITEMS[base], u = b?.use?.buff;
  if (!b || !u) return;
  p.addBuff({ id: u.slot, name: b.name, glyph: u.slot === 'food' ? 'p_vit' : 'p_mana', icon: 'item_' + b.icon, until: p.zone.game.now + secs, mods: u.mods, shield: 0, keep: true, item: base,
    desc: (u.slot === 'food' ? 'Speise – ' : 'Elixier – ') + modsText(u.mods) });
}
/** Stellt beim Betreten der Welt die gespeicherte Speise / das gespeicherte Elixier wieder her. */
export function restoreTimed(p: Player) {
  for (const slot in p.char.timed ?? {}) {
    const [base, left] = p.char.timed![slot];
    const u = ITEMS[base]?.use?.buff;
    if (u && u.slot === slot && left > 0) applyTimed(p, base, Math.min(left, u.dur));
  }
}
/** Benutzt ein Verbrauchsgut mit Sonderwirkung. Rückgabe: true = verbraucht. */
export function useSpecial(g: Game, p: Player, it: ItemInstance): boolean {
  const b = ITEMS[it.base], u = b.use!;
  if (u.learn) {
    const r = RECIPES[u.learn];
    if (!r) return false;
    if (knowsRecipe(p.char, r)) { p.toast('Dieses Rezept kennst du bereits.'); return false; }
    (p.char.recipes ??= []).push(r.id);
    p.removeItems(it.base, 1);
    p.sync('recipes', 'inv');
    p.toast(`Rezept gelernt: ${recipeLabel(r, p.char.cls)}`, 'good', 'item_recipe');
    p.pev.push({ k: 'sfx', n: 'quest_progress' });
    return true;
  }
  if (u.buff) {
    const targets = [p];
    if (u.buff.party && p.party) for (const q of p.party.members) if (q !== p && q.zone === p.zone && !q.dead && Math.hypot(q.x - p.x, q.y - p.y) <= u.buff.party) targets.push(q);
    for (const q of targets) {
      applyTimed(q, it.base, u.buff.dur);
      p.zone.ev({ k: 'fx', n: 'buff', x: Math.round(q.x), y: Math.round(q.y), el: 'light' });
      if (q !== p) q.toast(`${p.name} teilt mit dir: ${b.name}.`, 'good', 'item_' + b.icon);
    }
    p.removeItems(it.base, 1);
    p.pev.push({ k: 'sfx', n: 'potion' });
    return true;
  }
  if (u.cleanse) {
    if (g.now < p.potionReadyAt) { p.toast('Tränke sind noch nicht wieder bereit.', 'bad'); return false; }
    if (![...p.statuses.values()].some(s => s.until > g.now)) { p.toast('Das brauchst du gerade nicht.'); return false; }
    p.statuses.clear();
    p.potionReadyAt = g.now + CFG.player.potionCooldown;
    p.removeItems(it.base, 1);
    p.zone.ev({ k: 'fx', n: 'heal', x: Math.round(p.x), y: Math.round(p.y), el: 'water' });
    p.pev.push({ k: 'sfx', n: 'potion' });
    p.send({ t: 'cd', id: '_potion', cd: CFG.player.potionCooldown });
    return true;
  }
  return false;
}

// ------------------------------------------------------------------ Entwickler-Befehle (EM_DEV=1)
const GROUPS: Record<string, string[]> = {
  ore: [...TIER_ORE, 'mat_herb'], mon: TIER_MONSTER, ing: TIER_INGREDIENT, ess: Object.values(ESSENCE), core: [...ALL_CORES, AETHER],
};
/** /mats <ore|mon|ing|ess|core|all> [n] · /recipes · /legend · /setitem <set> · /elem <element> [stufe] · /status <zustand> [s] */
export function devCraft(g: Game, p: Player, cmd: string, a: string[]): boolean {
  if (cmd === 'mats') {
    const ids = a[0] === 'all' || !a[0] ? Object.values(GROUPS).flat() : GROUPS[a[0]] ?? [];
    for (const id of ids) p.give(makeStack(id, +a[1] || 20), false);
  } else if (cmd === 'recipes') { p.char.recipes = LEARNABLE.map(r => r.id); p.sync('recipes'); }
  else if (cmd === 'legend') p.give(makeLegendary(p.zone.rng, p.char.cls, p.char.level));
  else if (cmd === 'setitem' && SETS[a[0]]) { for (const piece of SET_PIECES) p.give(makeSetPiece(p.zone.rng, a[0], piece, p.char.cls, 2)); }
  else if (cmd === 'elem') { const w = p.char.equip.weapon; if (w && ELEMENTS.includes(a[0] as any)) { w.element = a[0] as InfuseElement; w.elv = Math.max(1, Math.min(3, +a[1] || 1)); p.recalc(); p.sync('equip'); } }
  else if (cmd === 'status') { for (const m of p.zone.mobs.values()) if (Math.hypot(m.x - p.x, m.y - p.y) < 120) p.zone.applyStatusMob(m, { id: a[0] as any, dur: +a[1] || 5 }, p.stats.power, p.stats.attackElement, p); }
  else return false;
  return true;
}
