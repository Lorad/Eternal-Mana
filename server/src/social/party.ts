/**
 * Gruppenverwaltung (0.7): Einladen (mit Frist), Annehmen, Ablehnen, Verlassen, Entfernen, Ernennen, Auflösen,
 * „Zur Gruppe reisen“, Nachfolge des Anführers und freigehaltene Plätze nach einem Verbindungsabriss.
 *
 * Regeln in Kürze (im Spiel: Gruppenfenster, shared/src/social.ts → PARTY_RULES):
 *  - Wer einlädt, ohne in einer Gruppe zu sein, gründet sie und führt sie an. In einer Gruppe lädt nur der Anführer ein.
 *  - Der Anführer entfernt Mitglieder (nicht während eines Bosskampfs), ernennt einen Nachfolger, löst die Gruppe auf.
 *  - Verlässt der Anführer die Gruppe, verliert er die Verbindung oder bleibt er länger gefallen, führt das dienstälteste
 *    verbundene (und möglichst lebende) Mitglied weiter.
 *  - Mana-Riss: Der Riss gehört der Gruppe. Wer sie im laufenden Riss verlässt oder entfernt wird, steht wieder am Riss-Stein
 *    und kann nicht zurück. Aufgelöst wird nicht, solange jemand im Riss steckt.
 *  - Neuer Kreis: Die Gruppe spielt in der Welt ihres niedrigsten Kreises (Game.worldKreis). Ändert sich die Gruppe, wechseln
 *    alle in die passende Welt – wer gerade in einem Bosskampf steckt, erst danach.
 *  - Reißt die Verbindung ganz ab (Schonfrist vorbei), bleibt der Platz CFG.social.seatSec frei; wer in dieser Zeit die Welt
 *    wieder betritt, ist wieder in der Gruppe.
 */
import { CFG } from '../../../shared/src/config';
import { KREIS_NAME, kreisOf } from '../../../shared/src/data/rifts';
import { ZONES } from '../../../shared/src/data/zones';
import { getMap } from '../../../shared/src/maps/mapgen';
import type { ClientMsg, PartyInvite, PartyMember } from '../../../shared/src/types';
import { Party, type Game } from '../game';
import type { Player } from '../player';
import { Rift, riftHome } from '../rift';
import { present, reject, ss } from './state';

const S = CFG.social;
const size = (party: Party) => party.members.size + party.seats.size;
const inWorld = (g: Game, p: Player) => g.players.get(p.charId) === p;
const kreisLabel = (k: number) => KREIS_NAME[k] ?? `Kreis ${k + 1}`;
const sent = new WeakMap<Party, { sig: string; at: number }>();

// ------------------------------------------------------------------ Stand der Gruppe
export function partyMembers(party: Party): PartyMember[] {
  const lead = party.leader;
  const out: PartyMember[] = [...party.members].map(q => ({
    id: q.id, charId: q.charId, name: q.name, cls: q.char.cls, level: q.level, hp: Math.max(0, Math.round(q.hp)), maxHp: q.stats.maxHp, zone: q.zone.id, online: !q.linkdead,
    lead: q === lead ? 1 : undefined, dead: q.dead ? 1 : undefined, kreis: kreisOf(q.char) || undefined, inst: q.zone.key, rift: q.zone.rift ? q.zone.rift.stufe : undefined,
  }));
  for (const s of party.seats.values()) out.push({ id: 0, charId: s.charId, name: s.name, cls: s.cls, level: s.level, hp: 0, maxHp: 1, zone: '', online: false, away: 1, kreis: s.kreis || undefined });
  return out;
}
/** Schickt den Stand an alle Mitglieder. `onlyIfChanged`: höchstens alle 5 s, wenn sich nichts geändert hat (Takt). */
export function sendParty(g: Game, party: Party, onlyIfChanged = false) {
  const members = partyMembers(party);
  if (onlyIfChanged) {
    const sig = JSON.stringify(members), last = sent.get(party);
    if (last && last.sig === sig && g.now - last.at < 5) return;
    sent.set(party, { sig, at: g.now });
  } else sent.delete(party);
  for (const q of party.members) q.send({ t: 'party', members });
}
function tell(party: Party, s: string, kind: 'info' | 'good' | 'bad' = 'info', except?: Player) { for (const q of party.members) if (q !== except) q.toast(s, kind); }

// ------------------------------------------------------------------ Welt des Kreises
/** Wechselt in die Welt des (Gruppen-)Kreises – wer gerade in einem Bosskampf steckt, erst wenn er vorbei ist. */
export function rehomeSoon(g: Game, p: Player) {
  if (!inWorld(g, p)) return;
  const z = p.zone, k = g.worldKreis(p);
  if (z.rift || z.key === (k > 0 ? `${z.id}#k${k}` : z.id)) return;
  if (z.boss?.active) {
    if (!ss(g).rehome.has(p)) p.toast(`Nach diesem Kampf wechselst du in die Welt, in der deine Gruppe spielt (${kreisLabel(k)}).`, 'info');
    ss(g).rehome.add(p);
    return;
  }
  g.rehome(p);
}

// ------------------------------------------------------------------ Einladen
function inviteInfo(g: Game, from: Player, to: Player): PartyInvite {
  return { from: from.id, name: from.name, sec: S.inviteSec, kreis: Math.min(g.worldKreis(from), kreisOf(to.char)), size: from.party ? size(from.party) : 1 };
}
function clearInvite(g: Game, to: Player) {
  const st = ss(g);
  if (!st.invites.delete(to)) return;
  if (present(g, to)) to.send({ t: 'party', members: to.party ? partyMembers(to.party) : [], invite: null });
}
function invite(g: Game, p: Player, id?: number) {
  const st = ss(g), now = g.now;
  const t = [...g.players.values()].find(q => q.id === id);
  if (!t || t === p || t.linkdead) return;
  if (t.party && t.party === p.party) return;
  if (p.party && p.party.leader !== p) return reject(p, 'Nur wer die Gruppe anführt, lädt ein.');
  if (t.party) return reject(p, `${t.name} ist bereits in einer Gruppe.`);
  if (p.party && size(p.party) >= S.partyMax) return reject(p, `Die Gruppe ist voll (max. ${S.partyMax}).`);
  const open = st.invites.get(t);
  if (open && open.until > now && present(g, open.from)) return reject(p, open.from === p ? `${t.name} hat deine Einladung noch nicht beantwortet.` : `${t.name} hat gerade eine andere Einladung offen.`);
  if ((st.inviteBlock.get(`${p.charId}>${t.charId}`) ?? 0) > now) return reject(p, `${t.name} hat gerade nicht angenommen – warte einen Moment.`);
  st.invites.set(t, { from: p, to: t, until: now + S.inviteSec });
  t.send({ t: 'party', members: t.party ? partyMembers(t.party) : [], invite: inviteInfo(g, p, t) });
  t.pev.push({ k: 'sfx', n: 'quest_accept' });
  p.toast(`Einladung an ${t.name} gesendet.`);
}
function accept(g: Game, p: Player) {
  const st = ss(g), inv = st.invites.get(p);
  if (!inv) return;
  clearInvite(g, p);
  const from = inv.from;
  if (p.party) return;
  if (inv.until <= g.now) return reject(p, 'Die Einladung ist abgelaufen.');
  if (!present(g, from) || (from.party && from.party.leader !== from)) return reject(p, 'Die Einladung gilt nicht mehr.');
  if (from.party && size(from.party) >= S.partyMax) return reject(p, 'Die Gruppe ist inzwischen voll.');
  const before = g.worldKreis(from);
  let party = from.party;
  if (!party) { party = from.party = new Party(); party.members.add(from); party.lead = from; }
  dropSeat(g, p.charId);
  party.members.add(p); p.party = party;
  for (const q of party.members) { q.toast(q === p ? `Du bist der Gruppe von ${from.name} beigetreten.` : `${p.name} ist der Gruppe beigetreten.`, 'good'); g.broadcastPlayerInfo(q); }
  const after = g.worldKreis(p);
  if (after !== before || after !== kreisOf(p.char)) tell(party, `Die Gruppe spielt in der Welt ihres niedrigsten Kreises: ${kreisLabel(after)}.`);
  for (const q of [...party.members]) rehomeSoon(g, q);
  sendParty(g, party);
}
function decline(g: Game, p: Player) {
  const st = ss(g), inv = st.invites.get(p);
  if (!inv) return;
  clearInvite(g, p);
  st.inviteBlock.set(`${inv.from.charId}>${p.charId}`, g.now + S.inviteCooldownSec);
  if (present(g, inv.from)) inv.from.toast(`${p.name} hat abgelehnt.`);
}
/** Alle offenen Einladungen von und an diesen Spieler verfallen (Verbindung weg, Welt verlassen). */
function dropInvites(g: Game, p: Player) {
  const st = ss(g);
  st.invites.delete(p);
  for (const [to, inv] of st.invites) if (inv.from === p) clearInvite(g, to);
}

// ------------------------------------------------------------------ Nachfolge, Auflösen, Plätze
/** Übergibt die Führung an das dienstälteste verbundene Mitglied (Lebende zuerst). Gibt es niemanden, bleibt alles, wie es ist. */
function passLead(g: Game, party: Party, why: string): boolean {
  const cur = party.lead && party.members.has(party.lead) ? party.lead : undefined;
  const cand = [...party.members].filter(q => q !== cur && !q.linkdead);
  const next = cand.find(q => !q.dead) ?? cand[0];
  if (!next) return false;
  party.lead = next; party.leadDeadSince = 0;
  for (const q of party.members) q.toast(q === next ? `Du führst jetzt die Gruppe an${why}.` : `${next.name} führt jetzt die Gruppe an${why}.`, 'info');
  void g;
  return true;
}
function dropSeat(g: Game, charId: number) {
  const st = ss(g), party = st.seatOf.get(charId);
  st.seatOf.delete(charId);
  return party?.seats.delete(charId) ? party : undefined;
}
function dissolve(g: Game, party: Party, quiet = false) {
  for (const c of [...party.seats.keys()]) dropSeat(g, c);
  const rest = [...party.members];
  party.members.clear(); party.lead = null;
  for (const q of rest) {
    q.party = null;
    q.send({ t: 'party', members: [] });
    if (!quiet) q.toast('Die Gruppe hat sich aufgelöst.');
    if (inWorld(g, q)) { g.broadcastPlayerInfo(q); rehomeSoon(g, q); }
  }
}
/** Nach jeder Änderung: Gruppe auflösen, wenn niemand mehr übrig ist, sonst Führung klären, Stand schicken, Welt angleichen. */
function settle(g: Game, party: Party) {
  if (!party.members.size || size(party) <= 1) return dissolve(g, party);
  if (!party.lead || !party.members.has(party.lead)) { party.lead = null; passLead(g, party, ''); }
  for (const q of [...party.members]) rehomeSoon(g, q);
  sendParty(g, party);
}
/** Der Riss gehört der Gruppe: Wer sie verlässt, verliert den Zugang – und steht, wenn er gerade darin ist, wieder am Riss-Stein. */
function leaveRifts(g: Game, p: Player, party: Party) {
  for (const z of g.zones.values()) {
    const r = z.rift;
    if (!r || r.party !== party || r.done || r.failed) continue;
    r.members.delete(p.charId);
    if (inWorld(g, p) && p.zone === z) {
      if (p.dead) { p.dead = false; p.hp = Math.round(p.stats.maxHp * 0.5); }
      p.toast('Der Riss gehört der Gruppe – du stehst wieder am Riss-Stein.', 'info');
      Rift.leave(g, p);
    }
  }
}
/** Nimmt ein Mitglied aus seiner Gruppe: `leave` = selbst gegangen, `kick` = entfernt, `gone` = hat die Welt verlassen. */
export function removeMember(g: Game, p: Player, why: 'leave' | 'kick' | 'gone', by?: Player) {
  const party = p.party;
  if (!party) return;
  party.members.delete(p); p.party = null;
  const here = inWorld(g, p);
  if (here) p.send({ t: 'party', members: [] });
  leaveRifts(g, p, party);
  tell(party, why === 'kick' ? `${p.name} wurde aus der Gruppe entfernt.` : `${p.name} hat die Gruppe verlassen.`);
  if (why === 'kick' && here) p.toast(`${by?.name ?? 'Der Anführer'} hat dich aus der Gruppe entfernt.`, 'bad');
  if (why === 'leave' && here) p.toast('Du hast die Gruppe verlassen.');
  settle(g, party);
  if (here) { g.broadcastPlayerInfo(p); rehomeSoon(g, p); }
}
const inRunningRift = (party: Party) => [...party.members].some(q => q.zone.rift && q.zone.rift.party === party && !q.zone.rift.done && !q.zone.rift.failed);

// ------------------------------------------------------------------ Anführer-Aktionen
function kick(g: Game, p: Player, id?: number, charId?: number) {
  const party = p.party;
  if (!party) return;
  if (party.leader !== p) return reject(p, 'Nur wer die Gruppe anführt, kann jemanden entfernen.');
  const seat = charId ? party.seats.get(charId) : undefined;
  if (seat) { // freigehaltener Platz
    dropSeat(g, seat.charId);
    tell(party, `${seat.name} wurde aus der Gruppe entfernt.`);
    return settle(g, party);
  }
  const t = [...party.members].find(q => q.id === id);
  if (!t || t === p) return;
  if (t.zone.boss?.active && !t.linkdead) return reject(p, 'Während eines Bosskampfs wird niemand aus der Gruppe entfernt.');
  removeMember(g, t, 'kick', p);
}
function promote(g: Game, p: Player, id?: number) {
  const party = p.party;
  if (!party) return;
  if (party.leader !== p) return reject(p, 'Nur wer die Gruppe anführt, kann die Führung abgeben.');
  const t = [...party.members].find(q => q.id === id);
  if (!t || t === p) return;
  if (t.linkdead) return reject(p, `${t.name} ist gerade nicht verbunden.`);
  party.lead = t; party.leadDeadSince = 0;
  for (const q of party.members) q.toast(q === t ? `${p.name} hat dir die Führung der Gruppe übergeben.` : `${t.name} führt jetzt die Gruppe an.`, 'info');
  sendParty(g, party);
}
function disband(g: Game, p: Player) {
  const party = p.party;
  if (!party) return;
  if (party.leader !== p) return reject(p, 'Nur wer die Gruppe anführt, kann sie auflösen.');
  if (inRunningRift(party)) return reject(p, 'Solange jemand von euch im Mana-Riss steckt, bleibt die Gruppe zusammen. Verlasst zuerst den Riss.');
  tell(party, `${p.name} hat die Gruppe aufgelöst.`, 'info', p);
  p.toast('Du hast die Gruppe aufgelöst.');
  dissolve(g, party, true);
}
/**
 * „Zur Gruppe reisen“: eine gewöhnliche Quellstein-Reise, deren Ziel das Gebiet eines Mitglieds ist (steckt es in einem
 * Dungeon oder Riss: das Gebiet davor). Es gelten dieselben Bedingungen wie für jede Reise – am Quellstein stehen, Ziel-Quellstein
 * aktiviert –, deshalb lässt sich damit nichts überspringen.
 */
function travel(g: Game, p: Player, id?: number) {
  const party = p.party;
  if (!party || p.dead) return;
  const t = [...party.members].find(q => q.id === id);
  if (!t || t === p) return;
  if (p.zone.rift) return reject(p, 'Aus einem Mana-Riss führt nur der Ausgang.');
  const z = t.zone;
  const dest = z.rift ? riftHome().zone : z.def.kind === 'dungeon' ? z.def.parent ?? z.id : z.id;
  if (!ZONES[dest] || !getMap(dest).objects.some(o => o.type === 'stone')) return reject(p, `Dort, wo ${t.name} ist, steht kein Quellstein.`);
  if (dest === p.zone.id) return reject(p, `${t.name} ist in deinem Gebiet${z.id !== dest || z.rift ? ' – nur eine Tür weiter' : ''}.`);
  if (!p.char.flags[`t:${dest}`]) return reject(p, `Den Quellstein „${ZONES[dest].name}“ hast du noch nicht aktiviert.`);
  g.teleport(p, dest); // prüft, dass man an einem Quellstein steht
}

// ------------------------------------------------------------------ Einstieg
export function partyMsg(g: Game, p: Player, m: Extract<ClientMsg, { t: 'party' }>) {
  switch (m.a) {
    case 'invite': return invite(g, p, Number(m.id));
    case 'accept': return accept(g, p);
    case 'decline': return decline(g, p);
    case 'leave': return removeMember(g, p, 'leave');
    case 'kick': return kick(g, p, Number(m.id), Number(m.char) || undefined);
    case 'promote': return promote(g, p, Number(m.id));
    case 'disband': return disband(g, p);
    case 'travel': return travel(g, p, Number(m.id));
  }
}

/** Einmal je Sekunde: Fristen, Nachfolge, verschobene Weltwechsel, Stand an alle Gruppen. */
export function tickParty(g: Game) {
  const st = ss(g), now = g.now;
  for (const [to, inv] of [...st.invites]) {
    if (inv.until > now && present(g, inv.from) && present(g, to)) continue;
    clearInvite(g, to);
    st.inviteBlock.set(`${inv.from.charId}>${to.charId}`, now + S.inviteCooldownSec);
    if (present(g, inv.from)) inv.from.toast(`${to.name} hat auf die Einladung nicht geantwortet.`);
  }
  for (const [k, until] of st.inviteBlock) if (until <= now) st.inviteBlock.delete(k);
  for (const p of [...st.rehome]) {
    if (!inWorld(g, p)) { st.rehome.delete(p); continue; }
    if (p.zone.boss?.active) continue;
    st.rehome.delete(p); g.rehome(p);
  }
  // verwaiste Plätze (Gruppe hat sich inzwischen aufgelöst oder die Frist ist um)
  for (const [c, party] of [...st.seatOf]) {
    const s = party.seats.get(c);
    if (s && s.until > now && party.members.size) continue;
    dropSeat(g, c);
    if (s && party.members.size) { tell(party, `Der Platz von ${s.name} in der Gruppe ist verfallen.`); settle(g, party); }
  }
  const done = new Set<Party>();
  for (const p of g.players.values()) {
    const party = p.party;
    if (!party || done.has(party)) continue;
    done.add(party);
    const lead = party.leader;
    if (!lead) continue;
    if (lead.linkdead) passLead(g, party, ` – ${lead.name} ist nicht verbunden`);
    else if (lead.dead) {
      if (!party.leadDeadSince) party.leadDeadSince = now;
      else if (now - party.leadDeadSince >= S.deadLeaderSec && [...party.members].some(q => q !== lead && !q.dead && !q.linkdead)) passLead(g, party, ` – ${lead.name} ist gefallen`);
    } else party.leadDeadSince = 0;
    sendParty(g, party, true);
  }
}

// ------------------------------------------------------------------ Verbindung
/** Verbindung verloren: Einladungen verfallen, ein verbundenes Mitglied übernimmt die Führung. */
export function partyDisconnect(g: Game, p: Player) {
  dropInvites(g, p);
  const party = p.party;
  if (!party) return;
  if (party.leader === p) passLead(g, party, ` – ${p.name} hat die Verbindung verloren`);
  sendParty(g, party);
}
export function partyReconnect(g: Game, p: Player) {
  if (p.party) sendParty(g, p.party);
  else p.send({ t: 'party', members: [], invite: null });
}
/** Der Charakter verlässt die Welt. `keepSeat`: die Verbindung ist abgerissen – sein Platz bleibt eine Weile frei. */
export function partyRemove(g: Game, p: Player, keepSeat: boolean) {
  const st = ss(g);
  dropInvites(g, p);
  st.rehome.delete(p);
  const party = p.party;
  if (!party) return;
  if (!keepSeat || party.members.size < 2) return removeMember(g, p, 'gone');
  party.members.delete(p); p.party = null;
  party.seats.set(p.charId, { charId: p.charId, name: p.name, cls: p.char.cls, level: p.level, kreis: kreisOf(p.char), until: g.now + S.seatSec });
  st.seatOf.set(p.charId, party);
  tell(party, `${p.name} ist nicht mehr verbunden. Der Platz in der Gruppe bleibt ${Math.round(S.seatSec / 60)} Minuten frei.`);
  settle(g, party);
}
/** Der Charakter betritt die Welt: Hält seine Gruppe noch einen Platz frei, ist er wieder dabei. */
export function partyEnter(g: Game, p: Player) {
  const st = ss(g), party = st.seatOf.get(p.charId);
  if (!party) return;
  const seat = party.seats.get(p.charId);
  dropSeat(g, p.charId);
  if (!seat || seat.until <= g.now || !party.members.size) return;
  party.members.add(p); p.party = party;
  for (const q of party.members) { q.toast(q === p ? 'Du bist zurück in deiner Gruppe.' : `${p.name} ist zurück in der Gruppe.`, 'good'); g.broadcastPlayerInfo(q); }
  settle(g, party);
  if (Rift.runOf(g, p)) p.toast('Deine Gruppe steckt in einem Mana-Riss. Am Riss-Stein kannst du folgen.', 'info');
}
