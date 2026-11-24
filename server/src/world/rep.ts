/**
 * Ruf und Fraktionen (0.6), Serverseite: Ruf verbuchen, Rangaufstieg melden, Spenden, Fraktionsvorräte, Titel.
 * Alles wird hier geprüft – Nähe zum Ansprechpartner, Rang, Gold, Besitz. Regeln und Zahlen: shared/src/data/factions.ts.
 */
import { CFG } from '../../../shared/src/config';
import { FACTIONS, RANK_NAMES, TITLE_RANK, factionOfNpc, factionOfZone, factionStock, questRep, rankOf, repOf } from '../../../shared/src/data/factions';
import { ITEMS, newUid } from '../../../shared/src/data/items';
import type { QuestDef } from '../../../shared/src/data/quests';
import type { ItemInstance } from '../../../shared/src/types';
import type { Game } from '../game';
import type { Player } from '../player';

/** Verbucht Ruf bei einer Fraktion und meldet einen Rangaufstieg. */
export function addRep(p: Player, faction: string, n: number, quiet = false) {
  const f = FACTIONS[faction];
  n = Math.round(n * p.perk.rep); // 0.7: Begleiter „Runenkäfer“, ausgestellte Weltboss-Trophäe
  if (!f || n <= 0) return;
  const rep = (p.char.rep ??= {});
  const before = repOf(p.char, faction), after = before + n;
  rep[faction] = after;
  p.sync('rep');
  if (!quiet) p.pev.push({ k: 'txt', x: p.x, y: p.y - 34, s: `+${n} Ruf · ${f.short}`, col: '#9fe8c8' });
  const r0 = rankOf(before), r1 = rankOf(after);
  if (r1 > r0) {
    p.toast(`${f.name}: Rang „${RANK_NAMES[r1 - 1]}“ erreicht. ${f.perks[r1 - 1]}`, 'story');
    p.pev.push({ k: 'sfx', n: 'quest_complete' });
    // den ersten Titel trägt man gleich (wählen: Fenster „Ruf und Welt“ oder das Endspiel-Fenster)
    if (r1 >= TITLE_RANK && r0 < TITLE_RANK && !p.char.title) { p.char.title = f.id; p.sync('title'); p.zone.game.broadcastPlayerInfo(p); }
  }
}
/** Ruf bei der Fraktion der Zone, in der etwas geschah */
export function addZoneRep(p: Player, zoneId: string, n: number) {
  const f = factionOfZone(zoneId);
  if (f) addRep(p, f.id, n);
}
export function onQuestDone(p: Player, q: QuestDef) {
  const r = questRep(q);
  if (r) addRep(p, r.faction, r.n);
}

function reject(p: Player, s: string) { p.toast(s, 'bad'); p.pev.push({ k: 'sfx', n: 'ui_error' }); }

/** Rohstoffe der Region beim Ansprechpartner spenden */
export function donate(g: Game, p: Player, npc: string, item: string, n: number) {
  const f = factionOfNpc(String(npc));
  if (!f || p.dead || !g.nearNpc(p, f.npc)) return;
  const per = f.donate[String(item)];
  if (!per) return reject(p, 'Das können sie hier nicht gebrauchen.');
  n = Math.max(1, Math.min(CFG.living.rep.donateMax, Math.floor(n) || 1, p.countItem(item)));
  if (!p.removeItems(item, n)) return reject(p, 'Davon hast du nichts bei dir.');
  addRep(p, f.id, per * n);
  p.toast(`${n}× ${ITEMS[item].name} gespendet.`, 'good', 'item_' + ITEMS[item].icon);
  p.pev.push({ k: 'sfx', n: 'sell' });
  p.checkCollectQuests();
}

/** Kauf aus den Vorräten der Fraktion: Rang, Gold und Platz werden geprüft; Schmuckstücke gibt es einmal je Charakter. */
export function factionBuy(g: Game, p: Player, npc: string, idx: number, qty: number) {
  const f = factionOfNpc(String(npc));
  if (!f || p.dead || !g.nearNpc(p, f.npc)) return;
  const e = factionStock(p.char, f)[idx];
  if (!e) return;
  if (e.locked) return reject(p, `Das gibt es erst ab Rang „${RANK_NAMES[e.offer.rank - 1]}“.`);
  if (e.owned) return reject(p, 'Das gibt es nur einmal – und du hast deins schon.');
  const stack = !!ITEMS[e.item.base].stack && !e.offer.unique;
  qty = stack ? Math.max(1, Math.min(20, Math.floor(qty) || 1)) : 1;
  const price = e.price * qty;
  if (p.char.gold < price) return reject(p, 'Nicht genug Gold.');
  const it: ItemInstance = { ...e.item, affixes: e.item.affixes.map(a => [...a] as typeof a), uid: newUid(), qty: stack ? qty : undefined };
  if (!p.addItem(it)) return reject(p, 'Inventar voll.');
  p.char.gold -= price; p.sync('gold');
  if (e.offer.unique) { p.char.flags[`fu:${f.id}`] = 1; p.sync('flags'); }
  p.send({ t: 'loot', item: it });
  p.pev.push({ k: 'sfx', n: 'buy' });
  p.checkCollectQuests();
}
