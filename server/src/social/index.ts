/**
 * Gemeinsam (0.7) – Einstiegspunkt für die Kernklassen. `Game`, `Zone`, `BossCtl` und `Rift` rufen nur diese Funktionen auf;
 * die Systeme liegen daneben: party.ts (Gruppe), trade.ts (Handel), share.ts (Quest teilen), reward.ts (Gruppentruhe, Ansehen).
 * Nichts davon wird gespeichert; Kosten im Takt: ein Durchlauf über offene Geschäfte (4×/s) und Gruppen (1×/s).
 */
import type { ClientMsg } from '../../../shared/src/types';
import type { Game } from '../game';
import type { Player } from '../player';
import type { Obj, Zone } from '../zone';
import { partyDisconnect, partyEnter, partyMsg, partyReconnect, partyRemove, tickParty } from './party';
import { groupChestLoot, inspect, mayOpenGroupChest, spawnGroupChest } from './reward';
import { answerShare, dropShares, shareQuest, tickShares } from './share';
import { ss } from './state';
import { dropTrades, tickTrades, tradeMsg } from './trade';

type SocialMsg = Extract<ClientMsg, { t: 'party' | 'trade' | 'qShare' | 'qShareAns' | 'inspect' }>;

export const Social = {
  message(g: Game, p: Player, m: SocialMsg) {
    switch (m.t) {
      case 'party': return partyMsg(g, p, m);
      case 'trade': return tradeMsg(g, p, m);
      case 'qShare': return shareQuest(g, p, String(m.id ?? ''));
      case 'qShareAns': return answerShare(g, p, String(m.id ?? ''), !!m.ok);
      case 'inspect': return inspect(g, p, Number(m.id));
    }
  },
  /** Spieltakt (Game.tick) */
  tick(g: Game, dt: number) {
    const st = ss(g);
    if ((st.acc += dt) < 0.25) return;
    st.acc = 0;
    if (st.trades.size || st.tradeReq.size) tickTrades(g);
    if (++st.slow < 4) return;
    st.slow = 0;
    tickParty(g);
    if (st.offers.size) tickShares(g);
  },
  /** Zonen- oder Instanzwechsel: ein laufender Handel endet */
  onZoneChange(g: Game, p: Player) { const st = ss(g); if (st.trades.has(p) || st.tradeReq.size) dropTrades(g, p, 'Ihr seid nicht mehr am selben Ort.'); },
  /** Verbindung verloren (der Charakter bleibt noch in der Welt) */
  onDisconnect(g: Game, p: Player) { dropTrades(g, p, `${p.name} hat die Verbindung verloren.`); dropShares(g, p); partyDisconnect(g, p); },
  onReconnect(g: Game, p: Player) { p.send({ t: 'trade', tr: null, req: null }); partyReconnect(g, p); },
  /** Der Charakter betritt die Welt (frisch geladen) */
  onEnter(g: Game, p: Player) { partyEnter(g, p); },
  /** Der Charakter verlässt die Welt */
  onRemove(g: Game, p: Player, keepSeat: boolean) {
    const st = ss(g);
    dropTrades(g, p, `${p.name} hat die Welt verlassen.`); dropShares(g, p);
    st.tradeReqAt.delete(p); st.shareAt.delete(p); st.inspectAt.delete(p);
    partyRemove(g, p, keepSeat);
  },
  // ---- Gruppentruhe (Aufrufe aus boss.ts, rift.ts und zone.ts)
  groupChest(z: Zone, x: number, y: number) { return spawnGroupChest(z, x, y); },
  mayOpenChest(z: Zone, p: Player, o: Obj) { return mayOpenGroupChest(z, p, o); },
  chestLoot(z: Zone, p: Player) { groupChestLoot(z, p); },
  state: ss,
};
