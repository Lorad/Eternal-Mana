/**
 * Quest teilen (0.7): Ein Mitglied bietet eine seiner aktiven Quests der Gruppe an. Wer sie annehmen dürfte – geprüft wird
 * genau wie beim Auftraggeber (questAvailable) –, bekommt eine Anfrage und kann annehmen, ohne zum Auftraggeber zu laufen.
 * Hauptquests und Geheimquests lassen sich nicht teilen (shared/src/social.ts).
 */
import { CFG } from '../../../shared/src/config';
import { QUESTS } from '../../../shared/src/data/quests';
import { shareBlock, shareTargetBlock } from '../../../shared/src/social';
import type { Game } from '../game';
import type { Player } from '../player';
import { present, reject, ss } from './state';

const S = CFG.social;

export function shareQuest(g: Game, p: Player, id: string) {
  const st = ss(g), now = g.now, q = QUESTS[id];
  if (!q || p.char.quests[id]?.s !== 'active') return;
  const party = p.party;
  if (!party) return reject(p, 'Zum Teilen brauchst du eine Gruppe.');
  const why = shareBlock(q);
  if (why) return reject(p, why);
  if (now - (st.shareAt.get(p) ?? -99) < S.shareCooldownSec) return reject(p, 'Einen Moment – du hast gerade erst eine Quest geteilt.');
  st.shareAt.set(p, now);
  const yes: string[] = [], no: string[] = [];
  for (const m of party.members) {
    if (m === p) continue;
    if (m.linkdead) { no.push(`${m.name} ist nicht verbunden`); continue; }
    const block = shareTargetBlock(m.char, q);
    if (block) { no.push(`${m.name} ${block}`); continue; }
    let mine = st.offers.get(m);
    if (!mine) st.offers.set(m, (mine = new Map()));
    mine.set(id, { from: p, until: now + S.shareSec });
    m.send({ t: 'qOffer', id, from: p.name, sec: S.shareSec });
    m.pev.push({ k: 'sfx', n: 'quest_accept' });
    yes.push(m.name);
  }
  p.toast(`„${q.name}“ ${yes.length ? 'angeboten: ' + yes.join(', ') : 'kann gerade niemand annehmen'}.${no.length ? ' ' + no.join('; ') + '.' : ''}`, yes.length ? 'quest' : 'info');
}

export function answerShare(g: Game, p: Player, id: string, ok: boolean) {
  const st = ss(g), mine = st.offers.get(p), offer = mine?.get(id), q = QUESTS[id];
  if (!offer || !q) return;
  mine!.delete(id);
  const from = offer.from, there = present(g, from);
  if (!ok) { if (there) from.toast(`${p.name} hat „${q.name}“ abgelehnt.`); return; }
  if (offer.until <= g.now) return reject(p, 'Das Angebot ist abgelaufen.');
  // Das Angebot gilt nur innerhalb der Gruppe – und nur, solange der Anbieter die Quest selbst noch hat
  if (!p.party || from.party !== p.party || from.char.quests[id]?.s !== 'active') return reject(p, 'Das Angebot gilt nicht mehr.');
  if (shareTargetBlock(p.char, q)) return reject(p, 'Diese Quest kannst du gerade nicht annehmen.');
  g.acceptQuest(p, q);
  if (there) from.toast(`${p.name} hat „${q.name}“ angenommen.`, 'quest');
}

/** Einmal je Sekunde: abgelaufene Angebote zurückziehen. */
export function tickShares(g: Game) {
  const st = ss(g), now = g.now;
  for (const [p, mine] of st.offers) {
    for (const [id, o] of mine) if (o.until <= now) { mine.delete(id); if (present(g, p)) p.send({ t: 'qOffer', id, from: o.from.name, sec: 0 }); }
    if (!mine.size) st.offers.delete(p);
  }
}
/** Alle Angebote von und an diesen Spieler verfallen. */
export function dropShares(g: Game, p: Player) {
  const st = ss(g);
  st.offers.delete(p);
  for (const [to, mine] of st.offers) for (const [id, o] of mine) if (o.from === p) { mine.delete(id); if (present(g, to)) to.send({ t: 'qOffer', id, from: p.name, sec: 0 }); }
}
