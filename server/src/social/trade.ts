/**
 * Handel zwischen zwei Spielern (0.7). Ablauf: anfragen → annehmen → beide legen Gegenstände (Stapel mit Menge) und Gold →
 * beide sperren → beide bestätigen → der Server tauscht in einem Zug und speichert beide Charaktere sofort gemeinsam.
 *
 * Sicherungen:
 *  - Beide müssen leben, verbunden sein, in derselben Welt-Instanz und nah beieinander stehen – bei Anfrage, Annahme und Abschluss.
 *    Entfernen, Zonenwechsel, Tod und Verbindungsabriss brechen den Handel ab (Prüfung viermal je Sekunde und beim Abschluss).
 *  - Jede Änderung an einem Angebot hebt beide Sperren und Bestätigungen auf; danach lässt sich kurz nicht sperren
 *    (CFG.social.tradeLockDelaySec), damit niemand dem anderen im letzten Moment etwas unterschiebt.
 *  - Angeboten wird nur, was im Inventar liegt (nichts Angelegtes), handelbar ist (shared/src/social.ts) und in gültiger Menge.
 *    Beim Abschluss wird alles noch einmal geprüft: Besitz, Menge, Gold, Platz im Inventar beider Seiten.
 *  - Der Tausch selbst ist atomar: erst vollständig geprüft, dann ausgeführt; schlägt das gemeinsame Speichern fehl, wird der
 *    Zustand beider Inventare zurückgesetzt.
 *  - Gehandelt wird nur aus dem Rucksack des Charakters. Was dem Profil gehört (Lagertruhe, Gold in der Truhe, Begleiter,
 *    Erscheinungen, Sammlung – server/src/home), ist für den Handel unerreichbar; gespeichert wird über `Home.saveMany`,
 *    damit Charakter und Profil-Stand nie auseinanderlaufen.
 */
import { CFG } from '../../../shared/src/config';
import { ITEMS, itemName, newUid } from '../../../shared/src/data/items';
import { invFits, tradeBlock } from '../../../shared/src/social';
import { SLOTS } from '../../../shared/src/types';
import type { ClientMsg, ItemInstance, TradeSide, TradeView } from '../../../shared/src/types';
import type { Game } from '../game';
import { Home } from '../home';
import type { Player } from '../player';
import { dist, present, reject, ss, type Trade, type TradeSideState } from './state';

const S = CFG.social;
type TradeMsg = Extract<ClientMsg, { t: 'trade' }>;

// ------------------------------------------------------------------ Hilfen
/** Warum diese beiden (gerade) nicht handeln können – null = alles in Ordnung. `slack`: Spielraum beim Abstand für laufende Geschäfte. */
function pairBlock(g: Game, a: Player, b: Player, slack = 0): string | null {
  if (!present(g, a) || !present(g, b)) return 'Die Verbindung ist abgerissen.';
  if (a.dead || b.dead) return 'Zum Handeln müsst ihr beide am Leben sein.';
  if (a.zone !== b.zone) return 'Ihr seid nicht mehr am selben Ort.';
  if (dist(a, b) > S.tradeRadius + slack) return 'Ihr steht zu weit auseinander.';
  return null;
}
const sideOf = (tr: Trade, p: Player): [TradeSideState, TradeSideState] => (tr.a.p === p ? [tr.a, tr.b] : [tr.b, tr.a]);
function sideView(s: TradeSideState): TradeSide {
  const items: ItemInstance[] = [];
  for (const [uid, n] of s.items) {
    const it = s.p.char.inv.find(i => i.uid === uid);
    if (it) items.push({ ...it, affixes: it.affixes.map(a => [...a] as typeof a), qty: ITEMS[it.base]?.stack ? n : undefined });
  }
  return { items, gold: s.gold, locked: s.locked, ok: s.ok };
}
function view(g: Game, tr: Trade, me: Player): TradeView {
  const [mine, theirs] = sideOf(tr, me);
  const q = theirs.p;
  return { with: { id: q.id, name: q.name, cls: q.char.cls, level: q.level }, me: sideView(mine), them: sideView(theirs),
    wait: Math.max(0, Math.round((tr.changedAt + S.tradeLockDelaySec - g.now) * 10) / 10), full: tr.full ? (tr.full === me ? 'me' : 'them') : undefined };
}
function sendViews(g: Game, tr: Trade) { for (const s of [tr.a, tr.b]) s.p.send({ t: 'trade', tr: view(g, tr, s.p) }); }
/** Das Angebot hat sich geändert: Sperren und Bestätigungen beider Seiten fallen, die Sperrfrist beginnt neu. */
function changed(g: Game, tr: Trade) {
  tr.a.locked = tr.b.locked = tr.a.ok = tr.b.ok = false;
  tr.changedAt = g.now; tr.full = undefined;
  sendViews(g, tr);
}
function close(g: Game, tr: Trade) { const st = ss(g); st.trades.delete(tr.a.p); st.trades.delete(tr.b.p); }
/** Bricht den Handel ab; nichts wechselt den Besitzer. */
export function cancelTrade(g: Game, tr: Trade, why: string) {
  close(g, tr);
  for (const s of [tr.a, tr.b]) { s.p.send({ t: 'trade', tr: null }); s.p.toast(`Handel abgebrochen: ${why}`, 'info'); }
}
/** Handel und Anfragen dieses Spielers enden (Tod, Zonenwechsel, Verbindung weg, Welt verlassen). */
export function dropTrades(g: Game, p: Player, why: string) {
  const st = ss(g), tr = st.trades.get(p);
  if (tr) cancelTrade(g, tr, why);
  if (st.tradeReq.delete(p) && present(g, p)) p.send({ t: 'trade', req: null });
  for (const [to, r] of st.tradeReq) if (r.from === p) { st.tradeReq.delete(to); if (present(g, to)) to.send({ t: 'trade', req: null }); }
}
function open(g: Game, a: Player, b: Player) {
  const st = ss(g);
  const mk = (p: Player): TradeSideState => ({ p, items: new Map(), gold: 0, locked: false, ok: false, ops: 0, opsAt: 0 });
  const tr: Trade = { a: mk(a), b: mk(b), changedAt: g.now - S.tradeLockDelaySec };
  for (const p of [a, b]) {
    st.trades.set(p, tr);
    if (st.tradeReq.delete(p)) p.send({ t: 'trade', req: null });
    for (const [to, r] of st.tradeReq) if (r.from === p) { st.tradeReq.delete(to); if (present(g, to)) to.send({ t: 'trade', req: null }); }
  }
  sendViews(g, tr);
  for (const p of [a, b]) p.pev.push({ k: 'sfx', n: 'ui_open' });
}

// ------------------------------------------------------------------ Anfrage
function request(g: Game, p: Player, id: number) {
  const st = ss(g), now = g.now;
  if (st.trades.has(p)) return;
  const t = p.zone.players.get(id);
  if (!t || t === p) return;
  const why = pairBlock(g, p, t);
  if (why) return reject(p, why);
  if (st.trades.has(t)) return reject(p, `${t.name} handelt gerade mit jemand anderem.`);
  // Hat der andere mich schon gefragt, ist das die Antwort
  const mine = st.tradeReq.get(p);
  if (mine && mine.from === t && mine.until > now) return open(g, t, p);
  if (now - (st.tradeReqAt.get(p) ?? -99) < S.tradeRequestCooldownSec) return reject(p, 'Einen Moment – du hast gerade erst angefragt.');
  const pending = st.tradeReq.get(t);
  if (pending && pending.until > now) return reject(p, pending.from === p ? `${t.name} hat deine Anfrage noch nicht beantwortet.` : `${t.name} hat gerade eine andere Anfrage offen.`);
  st.tradeReqAt.set(p, now);
  st.tradeReq.set(t, { from: p, until: now + S.tradeRequestSec });
  t.send({ t: 'trade', req: { from: p.id, name: p.name, sec: S.tradeRequestSec } });
  t.pev.push({ k: 'sfx', n: 'quest_accept' });
  p.toast(`Handelsanfrage an ${t.name} gesendet.`);
}
function answer(g: Game, p: Player, yes: boolean) {
  const st = ss(g), r = st.tradeReq.get(p);
  if (!r) return;
  st.tradeReq.delete(p);
  p.send({ t: 'trade', req: null });
  const from = r.from;
  if (!yes) { if (present(g, from)) from.toast(`${p.name} möchte gerade nicht handeln.`); return; }
  if (r.until <= g.now) return reject(p, 'Die Anfrage ist abgelaufen.');
  if (st.trades.has(p) || st.trades.has(from)) return reject(p, `${from.name} handelt gerade mit jemand anderem.`);
  const why = pairBlock(g, p, from);
  if (why) return reject(p, why);
  open(g, from, p);
}

// ------------------------------------------------------------------ Angebot
function add(g: Game, tr: Trade, me: TradeSideState, uid: string, qty: unknown) {
  const p = me.p, it = p.char.inv.find(i => i.uid === uid);
  if (!it) {
    if (SLOTS.some(s => p.char.equip[s]?.uid === uid)) reject(p, 'Angelegtes lässt sich nicht handeln – lege es zuerst ab.');
    return;
  }
  const block = tradeBlock(it);
  if (block) return reject(p, block);
  const have = it.qty ?? 1, n = ITEMS[it.base].stack ? (qty === undefined ? have : typeof qty === 'number' ? qty : NaN) : 1;
  if (!Number.isInteger(n) || n < 1 || n > have) return reject(p, 'Ungültige Menge.');
  if (p.char.inv.filter(i => i.uid === uid).length !== 1) return; // beschädigtes Inventar: Finger weg
  if (!me.items.has(uid) && me.items.size >= S.tradeSlots) return reject(p, `Mehr als ${S.tradeSlots} verschiedene Gegenstände passen nicht in einen Handel.`);
  if (me.items.get(uid) === n) return;
  me.items.set(uid, n);
  changed(g, tr);
}
function setGold(g: Game, tr: Trade, me: TradeSideState, gold: unknown) {
  const n = typeof gold === 'number' ? gold : NaN;
  if (!Number.isInteger(n) || n < 0 || n > me.p.char.gold) return reject(me.p, n > me.p.char.gold ? 'So viel Gold hast du nicht.' : 'Ungültiger Betrag.');
  if (me.gold === n) return;
  me.gold = n;
  changed(g, tr);
}
/** Stimmen die Angebote noch mit den Inventaren überein? Entfernt, was fehlt (Verkauf, Verbrauch …) – das zählt als Änderung. */
function prune(g: Game, tr: Trade): boolean {
  let dirty = false;
  for (const s of [tr.a, tr.b]) {
    for (const [uid, n] of s.items) {
      const it = s.p.char.inv.find(i => i.uid === uid);
      if (!it || n > (it.qty ?? 1) || tradeBlock(it)) { s.items.delete(uid); dirty = true; }
    }
    if (s.gold > s.p.char.gold) { s.gold = Math.max(0, Math.floor(s.p.char.gold)); dirty = true; }
  }
  if (dirty) { changed(g, tr); for (const s of [tr.a, tr.b]) s.p.toast('Ein Angebot hat sich geändert – bitte prüft es noch einmal.', 'info'); }
  return dirty;
}

// ------------------------------------------------------------------ Abschluss
function commit(g: Game, tr: Trade) {
  const A = tr.a, B = tr.b, a = A.p, b = B.p;
  const why = pairBlock(g, a, b, 20);
  if (why) return cancelTrade(g, tr, why);
  if (prune(g, tr)) return;
  if (!(A.locked && B.locked && A.ok && B.ok)) return;
  // 1) alles prüfen, nichts verändern
  const parts = new Map<TradeSideState, { it: ItemInstance; n: number }[]>();
  for (const s of [A, B]) {
    const list: { it: ItemInstance; n: number }[] = [];
    for (const [uid, n] of s.items) {
      const it = s.p.char.inv.find(i => i.uid === uid);
      if (!it || !Number.isInteger(n) || n < 1 || n > (it.qty ?? 1) || tradeBlock(it) || s.p.char.inv.filter(i => i.uid === uid).length !== 1) return cancelTrade(g, tr, 'Ein Angebot war nicht mehr vollständig.');
      list.push({ it, n });
    }
    if (!Number.isInteger(s.gold) || s.gold < 0 || s.gold > s.p.char.gold) return cancelTrade(g, tr, 'Ein Angebot war nicht mehr vollständig.');
    parts.set(s, list);
  }
  for (const [s, o] of [[A, B], [B, A]] as const) {
    if (s.p.char.gold - s.gold + o.gold > S.goldCap) { changed(g, tr); for (const q of [a, b]) q.toast(`${s.p.name} kann nicht so viel Gold tragen.`, 'bad'); return; }
    if (!invFits(s.p.char.inv, s.items, parts.get(o)!.map(e => e.it))) {
      changed(g, tr); tr.full = s.p; sendViews(g, tr);
      for (const q of [a, b]) q.toast(q === s.p ? 'Dein Inventar ist zu voll für diesen Handel.' : `${s.p.name} hat nicht genug Platz im Inventar.`, 'bad');
      return;
    }
  }
  // 2) ausführen – mit Sicherung beider Inventare, falls das Speichern scheitert
  const backup = [a, b].map(p => ({ p, inv: structuredClone(p.char.inv), gold: p.char.gold }));
  const summary: string[] = [];
  try {
    const moved = new Map<TradeSideState, ItemInstance[]>();
    for (const s of [A, B]) {
      const out: ItemInstance[] = [];
      for (const { it, n } of parts.get(s)!) {
        const have = it.qty ?? 1;
        if (n >= have) { s.p.char.inv.splice(s.p.char.inv.indexOf(it), 1); out.push(it); }
        else { it.qty = have - n; out.push({ ...it, affixes: it.affixes.map(x => [...x] as typeof x), uid: newUid(), qty: n }); }
      }
      moved.set(s, out);
    }
    for (const [s, o] of [[A, B], [B, A]] as const) {
      for (const it of moved.get(o)!) {
        // eine uid gibt es je Charakter nur einmal – trägt der Empfänger sie (aus welchem Grund auch immer) schon, bekommt das Stück eine neue
        if (s.p.char.inv.some(i => i.uid === it.uid) || SLOTS.some(sl => s.p.char.equip[sl]?.uid === it.uid)) it.uid = newUid();
        if (!s.p.addItem(it)) throw new Error('Inventar voll trotz Prüfung');
      }
      s.p.char.gold += o.gold - s.gold;
      summary.push(`${o.p.name} → ${s.p.name}: ${[...moved.get(o)!.map(it => itemName(it) + ((it.qty ?? 1) > 1 ? ` ×${it.qty}` : '')), ...(o.gold ? [`${o.gold} Gold`] : [])].join(', ') || 'nichts'}`);
    }
    Home.saveMany(g, [a, b]); // beide Charaktere – und ihr Profil-Stand (Hof, Truhe, Sammlung), falls er sich geändert hat – in EINER Transaktion
  } catch (e) {
    for (const s of backup) { s.p.char.inv = s.inv; s.p.char.gold = s.gold; s.p.sync('inv', 'gold'); }
    console.error('[handel] Tausch zurückgenommen:', e);
    return cancelTrade(g, tr, 'Der Tausch ließ sich nicht sichern und wurde vollständig zurückgenommen.');
  }
  close(g, tr);
  console.log('[handel] ' + summary.join(' · '));
  for (const s of [A, B]) {
    const p = s.p, o = s === A ? B : A;
    p.sync('inv', 'gold');
    p.checkCollectQuests();
    p.send({ t: 'trade', tr: null, done: 1 });
    p.toast(`Handel mit ${o.p.name} abgeschlossen.`, 'good');
    p.pev.push({ k: 'sfx', n: 'buy' });
  }
}

// ------------------------------------------------------------------ Einstieg
export function tradeMsg(g: Game, p: Player, m: TradeMsg) {
  const st = ss(g);
  if (m.a === 'request') return request(g, p, Number(m.id));
  if (m.a === 'accept' || m.a === 'decline') return answer(g, p, m.a === 'accept');
  const tr = st.trades.get(p);
  if (!tr) return;
  const [me, other] = sideOf(tr, p);
  // Schutz vor Dauerfeuer: mehr als ein paar Handgriffe je Sekunde sind kein Handel
  const sec = Math.floor(g.now);
  if (sec !== me.opsAt) { me.opsAt = sec; me.ops = 0; }
  if (++me.ops > S.tradeOpsPerSec) return;
  switch (m.a) {
    case 'cancel': return cancelTrade(g, tr, `${p.name} hat abgebrochen.`);
    case 'add': return add(g, tr, me, String(m.uid ?? ''), m.qty);
    case 'remove': if (me.items.delete(String(m.uid ?? ''))) changed(g, tr); return;
    case 'gold': return setGold(g, tr, me, m.gold);
    case 'unlock': if (me.locked || me.ok || other.ok) { me.locked = false; me.ok = other.ok = false; sendViews(g, tr); } return;
    case 'lock': {
      if (me.locked) return;
      if (g.now < tr.changedAt + S.tradeLockDelaySec) return reject(p, 'Das Angebot hat sich gerade geändert – sieh es dir in Ruhe an.');
      if (prune(g, tr)) return;
      me.locked = true;
      return sendViews(g, tr);
    }
    case 'confirm': {
      if (!me.locked || !other.locked) return reject(p, 'Erst wenn beide gesperrt haben, lässt sich der Handel bestätigen.');
      me.ok = true;
      if (other.ok) return commit(g, tr);
      return sendViews(g, tr);
    }
  }
}
/** Viermal je Sekunde: laufende Geschäfte auf Abstand, Tod, Zonenwechsel und veränderte Inventare prüfen; Anfragen verfallen lassen. */
export function tickTrades(g: Game) {
  const st = ss(g), now = g.now, seen = new Set<Trade>();
  for (const tr of st.trades.values()) {
    if (seen.has(tr)) continue;
    seen.add(tr);
    const why = pairBlock(g, tr.a.p, tr.b.p, 20);
    if (why) cancelTrade(g, tr, why); else prune(g, tr);
  }
  for (const [to, r] of st.tradeReq) {
    if (r.until > now && present(g, r.from) && present(g, to) && !pairBlock(g, r.from, to, 20)) continue;
    st.tradeReq.delete(to);
    if (present(g, to)) to.send({ t: 'trade', req: null });
    if (present(g, r.from) && r.until <= now) r.from.toast(`${to.name} hat auf die Handelsanfrage nicht geantwortet.`);
  }
}
