/**
 * Zuhause (0.7) – Lagertruhe: einlagern, abheben, Gold, sortieren. Die Truhe gehört dem Profil; alle seine Charaktere
 * greifen auf dieselbe zu.
 *
 * Sicherheit: Jede Bewegung geschieht in einem Zug im Speicher (erst prüfen, dann beide Seiten ändern) und wird SOFORT
 * gespeichert – Charakter und Truhe in einer Transaktion (`Game.savePlayer` → `Home.save` → `Db.saveChar(.., home)`).
 * Reißt die Verbindung oder stürzt der Server ab, gilt der letzte gespeicherte Zustand beider Seiten: Ein Gegenstand ist
 * im Rucksack ODER in der Truhe, nie in beiden und nie in keinem. Der Aufrufer (index.ts) hat schon geprüft, dass der
 * Spieler auf seinem eigenen Hof an der Truhe steht.
 */
import { CFG } from '../../../shared/src/config';
import { stashSlots } from '../../../shared/src/data/collection';
import { fits, putInto, sortItems, stashBlock } from '../../../shared/src/data/home';
import { ITEMS, newUid } from '../../../shared/src/data/items';
import type { ClientMsg, ItemInstance } from '../../../shared/src/types';
import type { Game } from '../game';
import type { Player } from '../player';
import { acc, touch } from './state';

function reject(p: Player, s: string) { p.toast(s, 'bad'); p.pev.push({ k: 'sfx', n: 'ui_error' }); }
/** Trennt `n` Stück von einem Stapel ab (oder nimmt den ganzen Gegenstand): [abgetrennter Teil, bleibt etwas zurück?] */
function split(it: ItemInstance, n: number): [ItemInstance, boolean] {
  const q = it.qty ?? 1;
  if (!ITEMS[it.base]?.stack || n >= q) return [it, false];
  return [{ ...it, uid: newUid(), qty: n, affixes: it.affixes.map(a => [...a] as typeof a) }, true];
}
const amount = (it: ItemInstance, n: unknown) => Math.max(1, Math.min(it.qty ?? 1, Math.floor(Number(n ?? it.qty ?? 1)) || 1));

export function stashMessage(g: Game, p: Player, m: Extract<ClientMsg, { t: 'home' }>) {
  const c = p.char, h = acc(g, p.accountId).h;
  switch (m.a) {
    case 'put': {
      const i = c.inv.findIndex(x => x.uid === m.uid), it = c.inv[i];
      if (!it) return;
      const why = stashBlock(it);
      if (why) return reject(p, why);
      const n = amount(it, m.n), [part, rest] = split(it, n);
      if (!fits(h.stash, part, stashSlots(h))) return reject(p, 'Die Truhe ist voll. Mehr Platz bringen der Ausbau des Hofs und die Sammlung.');
      if (rest) it.qty = (it.qty ?? 1) - n; else c.inv.splice(i, 1);
      putInto(h.stash, part);
      break;
    }
    case 'take': {
      const i = h.stash.findIndex(x => x.uid === m.uid), it = h.stash[i];
      if (!it) return;
      const n = amount(it, m.n), [part, rest] = split(it, n);
      if (!fits(c.inv, part, CFG.player.invSize)) return reject(p, 'Inventar voll.');
      if (rest) it.qty = (it.qty ?? 1) - n; else h.stash.splice(i, 1);
      putInto(c.inv, part);
      break;
    }
    case 'gold': {
      let n = Math.trunc(Number(m.n) || 0);
      if (n > 0) n = Math.min(n, c.gold, CFG.home.goldCap - h.gold);
      else n = -Math.min(-n, h.gold);
      if (!n) return reject(p, Number(m.n) > 0 ? (c.gold > 0 ? 'Mehr Gold fasst die Truhe nicht.' : 'Du hast kein Gold bei dir.') : 'In der Truhe liegt kein Gold.');
      c.gold -= n; h.gold += n;
      p.sync('gold');
      touch(g, p.accountId, 'gold');
      p.pev.push({ k: 'sfx', n: n > 0 ? 'sell' : 'buy' });
      g.savePlayer(p);
      return;
    }
    case 'sort': sortItems(h.stash); touch(g, p.accountId, 'stash'); return;
    default: return;
  }
  p.sync('inv');
  touch(g, p.accountId, 'stash');
  p.pev.push({ k: 'sfx', n: 'ui_equip' });
  p.checkCollectQuests();
  g.savePlayer(p);
}
