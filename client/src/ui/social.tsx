/**
 * Gemeinsam (0.7): Gruppenrahmen und Anfragen im HUD (Einladung, Handel, geteilte Quest), das Menü zu einem anderen Spieler,
 * das Handelsfenster und „Spieler ansehen“. Alles hier zeigt nur an und schickt Absichten – geprüft wird auf dem Server
 * (server/src/social/*); die gemeinsamen Regeln stehen in shared/src/social.ts.
 */
import { useEffect, useState } from 'preact/hooks';
import { live } from '../state/live';
import { store, togglePanel, useStore } from '../state/store';
import { CFG, ELEMENT_NAME } from '../../../shared/src/config';
import { CLASSES } from '../../../shared/src/data/classes';
import { ITEMS, itemName } from '../../../shared/src/data/items';
import { LOOKS } from '../../../shared/src/data/looks';
import { PETS } from '../../../shared/src/data/pets';
import { QUESTS } from '../../../shared/src/data/quests';
import { KREIS_NAME } from '../../../shared/src/data/rifts';
import { SETS, SET_FULL } from '../../../shared/src/data/sets';
import { gsBracket } from '../../../shared/src/data/gsreq';
import { ZONES } from '../../../shared/src/data/zones';
import { tradeBlock } from '../../../shared/src/social';
import { SLOTS, SLOT_NAME } from '../../../shared/src/types';
import type { ItemInstance, PartyMember, TradeSide } from '../../../shared/src/types';
import { AmountSteps, Bar, Btn, ELEMENT_CSS, Face, GS_HELP, Gold, GsValue, ItemSlot, Portrait, SLOT_ICON, TextInput, Window, cx, fmtNum, send, sfx } from './common';

const S = CFG.social;
/** Re-Render zweimal je Sekunde (für Restzeiten) */
function useClock(on = true) {
  const [, f] = useState(0);
  useEffect(() => { if (!on) return; const i = window.setInterval(() => f(n => n + 1), 500); return () => clearInterval(i); }, [on]);
}
const secLeft = (until: number) => Math.max(0, Math.ceil((until - performance.now()) / 1000));
const kreisName = (k: number) => KREIS_NAME[k] ?? `Kreis ${k + 1}`;

/** Wo steckt dieses Gruppenmitglied? Gebiet, Mana-Riss mit Stufe, Welt eines anderen Kreises. `short`: für den schmalen Rahmen im HUD. */
export function whereIs(m: PartyMember, short = false): string {
  if (m.away) return 'Platz wird freigehalten';
  if (!m.online) return 'Verbindung getrennt';
  if (m.heim) return m.heim === m.name ? (short ? 'Eigener Hof' : 'Auf dem eigenen Hof') : short ? `Hof von ${m.heim}` : `Zu Besuch auf dem Hof von ${m.heim}`;
  const zone = ZONES[m.zone]?.name ?? m.zone;
  if (m.rift) return short ? `Mana-Riss · Stufe ${m.rift}` : `Mana-Riss ${zone} · Stufe ${m.rift}`;
  const k = /#k(\d+)$/.exec(m.inst ?? '');
  return k ? `${zone} · ${kreisName(+k[1])}` : zone;
}
export function openPlayerMenu(p: { id: number; name: string; cls: PartyMember['cls']; level: number }) {
  if (!p.id || p.id === store.state.myId) return;
  sfx('ui_click');
  store.set({ playerMenu: { id: p.id, name: p.name, cls: p.cls, level: p.level } });
}

// ------------------------------------------------------------------ Gruppenrahmen im HUD
export function PartyFrames() {
  const party = useStore(s => s.party);
  const charId = useStore(s => s.charId);
  const me = party.find(m => m.charId === charId);
  const others = party.filter(m => m.charId !== charId);
  if (!others.length) return null;
  return (
    <div class="party-frames">
      {others.map(m => {
        const apart = !!me && m.online && m.inst !== me.inst;
        return (
          <button type="button" key={m.charId} class={cx('party-frame', !m.online && 'offline', m.dead && 'down')} title={`${m.name} · ${whereIs(m)} – klicken für Aktionen`}
            onClick={() => (m.id ? openPlayerMenu(m) : togglePanel('party'))}>
            <Face k={'char_' + m.cls} size={32} />
            <div class="grow">
              <div class="party-name"><b>{m.lead && <i class="pf-lead" title="führt die Gruppe an">★</i>}{m.name}</b><span>St. {m.level}{m.gs !== undefined && <> · <GsValue gs={m.gs} /></>}</span></div>
              <Bar kind="hp" v={m.online ? m.hp : 0} max={m.maxHp} label={false} class="thin" />
              <div class={cx('party-zone', apart && 'apart')}>{m.dead ? (apart ? 'Gefallen · ' + whereIs(m, true) : 'Gefallen – hilf auf!') : (apart ? '↗ ' : '') + whereIs(m, true)}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ Anfragen (oben in der Mitte)
function InvitePopup() {
  const inv = useStore(s => s.invite);
  const myKreis = useStore(s => s.char?.kreis ?? 0);
  useClock(!!inv);
  if (!inv) return null;
  const left = inv.until ? secLeft(inv.until) : 0;
  const answer = (a: 'accept' | 'decline') => { sfx('ui_click'); send({ t: 'party', a }); store.set({ invite: null }); };
  return (
    <div class="invite" role="alertdialog">
      <div><b>{inv.name}</b> lädt dich in {(inv.size ?? 1) > 1 ? `eine Gruppe (${inv.size} Mitglieder)` : 'eine Gruppe'} ein.</div>
      {inv.kreis !== undefined && inv.kreis !== myKreis && <div class="note">Die Gruppe spielt in der Welt ihres niedrigsten Kreises: <b>{kreisName(inv.kreis)}</b>. Du wechselst beim Beitritt dorthin.</div>}
      <div class="note">Beute bleibt persönlich – jeder würfelt für sich.</div>
      <div class="row end">
        {left > 0 && <span class="note grow">noch {left} s</span>}
        <button type="button" class="btn btn-small" onClick={() => answer('decline')}>Ablehnen</button>
        <button type="button" class="btn btn-small btn-primary" onClick={() => answer('accept')}>Annehmen</button>
      </div>
    </div>
  );
}
function TradeRequestPopup() {
  const req = useStore(s => s.tradeReq);
  useClock(!!req);
  if (!req) return null;
  const answer = (a: 'accept' | 'decline') => { sfx('ui_click'); send({ t: 'trade', a }); store.set({ tradeReq: null }); };
  return (
    <div class="invite" role="alertdialog">
      <div><b>{req.name}</b> möchte mit dir handeln.</div>
      <div class="row end">
        <span class="note grow">noch {secLeft(req.until)} s</span>
        <button type="button" class="btn btn-small" onClick={() => answer('decline')}>Ablehnen</button>
        <button type="button" class="btn btn-small btn-primary" onClick={() => answer('accept')}>Handeln</button>
      </div>
    </div>
  );
}
function QuestOfferPopup() {
  const offers = useStore(s => s.qOffers);
  useClock(offers.length > 0);
  const o = offers[0], q = o ? QUESTS[o.id] : undefined;
  if (!o || !q) return null;
  const answer = (ok: boolean) => { sfx('ui_click'); send({ t: 'qShareAns', id: o.id, ok }); store.set({ qOffers: store.state.qOffers.filter(x => x.id !== o.id) }); };
  return (
    <div class="invite qoffer" role="alertdialog">
      <div><b>{o.from}</b> teilt eine Quest mit dir:</div>
      <div class="qoffer-q"><b>{q.name}</b><span class="note"> · Stufe {q.level} · {ZONES[q.zone]?.name ?? q.zone}</span></div>
      <div class="note">{q.summary}</div>
      <div class="note">Belohnung: {fmtNum(q.rewards.xp)} Erfahrung{q.rewards.gold ? `, ${fmtNum(q.rewards.gold)} Gold` : ''}{q.rewards.gear !== undefined ? ', Ausrüstung' : ''}</div>
      <div class="row end">
        <span class="note grow">noch {secLeft(o.until)} s{offers.length > 1 ? ` · ${offers.length - 1} weitere` : ''}</span>
        <button type="button" class="btn btn-small" onClick={() => answer(false)}>Ablehnen</button>
        <button type="button" class="btn btn-small btn-primary" onClick={() => answer(true)}>Annehmen</button>
      </div>
    </div>
  );
}
export function SocialPopups() { return <><InvitePopup /><TradeRequestPopup /><QuestOfferPopup /></>; }

// ------------------------------------------------------------------ Menü zu einem anderen Spieler
export function PlayerMenu() {
  const pm = useStore(s => s.playerMenu);
  const party = useStore(s => s.party);
  const charId = useStore(s => s.charId);
  const nearStone = useStore(s => s.nearStone);
  const trading = useStore(s => !!s.trade);
  useClock(!!pm);
  if (!pm || trading) return null;
  const me = party.find(m => m.charId === charId), member = party.find(m => m.id === pm.id);
  const lead = !!me?.lead, inParty = party.length > 1 || !!me;
  const near = live.players.some(p => p.name === pm.name);
  const close = () => store.set({ playerMenu: null });
  const act = (fn: () => void) => () => { fn(); close(); };
  const canInvite = !member && (!inParty || lead) && party.length < S.partyMax;
  return (
    <div class="pmenu" role="dialog" aria-label={'Spieler: ' + pm.name}>
      <div class="pmenu-head">
        <Face k={'char_' + pm.cls} size={36} />
        <div class="grow"><b>{pm.name}</b><div class="note">Stufe {pm.level} · {CLASSES[pm.cls]?.name}{member?.lead ? ' · führt an' : ''}</div></div>
        <button type="button" class="window-x" aria-label="Schließen" onClick={close}>✕</button>
      </div>
      <Btn kind="small" onClick={act(() => send({ t: 'inspect', id: pm.id }))}>Ansehen</Btn>
      <Btn kind="small" disabled={!near} title={near ? undefined : 'Dafür müsst ihr nah beieinander stehen.'} onClick={act(() => send({ t: 'trade', a: 'request', id: pm.id }))}>Handeln</Btn>
      {!member && <Btn kind="small" disabled={!canInvite} title={canInvite ? undefined : inParty && !lead ? 'Nur wer die Gruppe anführt, lädt ein.' : 'Die Gruppe ist voll.'} onClick={act(() => send({ t: 'party', a: 'invite', id: pm.id }))}>In die Gruppe einladen</Btn>}
      {member && <Btn kind="small" disabled={!nearStone} title={nearStone ? undefined : 'Reisen kannst du nur von einem Quellstein aus.'} onClick={act(() => send({ t: 'party', a: 'travel', id: pm.id }))}>Zum Quellstein bei {pm.name} reisen</Btn>}
      {member && lead && <Btn kind="small" onClick={act(() => send({ t: 'party', a: 'promote', id: pm.id }))}>Zum Anführer ernennen</Btn>}
      {member && lead && <Btn kind="small" class="btn-danger" onClick={act(() => send({ t: 'party', a: 'kick', id: pm.id }))}>Aus der Gruppe entfernen</Btn>}
      {!near && <div class="note">{pm.name} ist nicht in deiner Nähe.</div>}
    </div>
  );
}

// ------------------------------------------------------------------ Handel
function OfferSide({ title, side, mine, onRemove }: { title: string; side: TradeSide; mine?: boolean; onRemove?: (uid: string) => void }) {
  const char = useStore(s => s.char);
  const cells: (ItemInstance | null)[] = [...side.items];
  while (cells.length < S.tradeSlots) cells.push(null);
  return (
    <div class={cx('trade-side card', side.locked && 'locked', side.ok && 'ok')}>
      <div class="sec-title">{title} <span class={cx('pill', side.ok ? 'gold-pill' : side.locked && 'trade-locked')}>{side.ok ? 'bestätigt' : side.locked ? 'gesperrt' : 'offen'}</span></div>
      <div class="trade-grid">
        {cells.map((it, i) => <ItemSlot key={it ? it.uid : 'e' + i} item={it} size="sm" char={char} onClick={it && mine && onRemove ? () => onRemove(it.uid) : undefined} label={mine ? 'Leerer Platz' : 'Leerer Platz im Angebot'} />)}
      </div>
      <div class="trade-gold">Gold: <Gold n={side.gold} /></div>
    </div>
  );
}
/** 0.8: Im Handel verdeckt das Fenster den Chat – hier stehen die letzten Zeilen und ein eigenes Eingabefeld. */
function TradeChat() {
  const chat = useStore(s => s.chat);
  const [text, setText] = useState('');
  const submit = () => { const s = text.trim(); if (s) { send({ t: 'chat', s: s.slice(0, 200) }); sfx('chat'); } setText(''); };
  const lines = chat.filter(l => l.ch !== 'sys').slice(-3);
  return (
    <div class="trade-chat">
      {lines.length > 0 && <div class="trade-chat-log">{lines.map(l => <div key={l.id} class={'chat-line ch-' + l.ch}>{l.ch === 'party' && <i>[Gruppe] </i>}<b>{l.from}: </b>{l.s}</div>)}</div>}
      <div class="row"><div class="grow"><TextInput value={text} onInput={setText} onEnter={submit} maxLength={200} placeholder="Nachricht … (Enter sendet, /p Text nur an die Gruppe)" ariaLabel="Chat-Nachricht" /></div><Btn kind="small" disabled={!text.trim()} onClick={submit}>Senden</Btn></div>
    </div>
  );
}
export function TradeWindow() {
  const tr = useStore(s => s.trade);
  const at = useStore(s => s.tradeAt);
  const char = useStore(s => s.char);
  const [pick, setPick] = useState<{ uid: string; n: number } | null>(null);
  const [gold, setGold] = useState('');
  useClock(!!tr && tr.wait > 0);
  useEffect(() => { setGold(tr && tr.me.gold ? String(tr.me.gold) : ''); }, [tr?.me.gold]);
  if (!tr || !char) return null;
  const wait = Math.max(0, tr.wait - (performance.now() - at) / 1000);
  const offered = new Map(tr.me.items.map(i => [i.uid, i.qty ?? 1]));
  const picked = pick ? char.inv.find(i => i.uid === pick.uid) : undefined;
  const cancel = () => send({ t: 'trade', a: 'cancel' });
  const add = (it: ItemInstance) => {
    if (tradeBlock(it)) { sfx('ui_error'); return; }
    const have = it.qty ?? 1, cur = offered.get(it.uid) ?? 0;
    if (ITEMS[it.base]?.stack && have > 1) { setPick({ uid: it.uid, n: cur || have }); return; }
    if (cur) send({ t: 'trade', a: 'remove', uid: it.uid }); else send({ t: 'trade', a: 'add', uid: it.uid, qty: 1 });
  };
  const sendGold = () => { const n = Math.max(0, Math.min(char.gold, Math.floor(Number(gold) || 0))); setGold(n ? String(n) : ''); if (n !== tr.me.gold) send({ t: 'trade', a: 'gold', gold: n }); };
  const both = tr.me.locked && tr.them.locked;
  const status = tr.full === 'me' ? 'Dein Inventar ist zu voll für diesen Handel.' : tr.full === 'them' ? `${tr.with.name} hat nicht genug Platz im Inventar.`
    : tr.me.ok ? `Warte auf die Bestätigung von ${tr.with.name} …` : both ? 'Beide haben gesperrt. Prüfe das Angebot ein letztes Mal und bestätige.'
    : tr.me.locked ? `Warte, bis ${tr.with.name} sperrt …` : wait > 0 ? 'Das Angebot hat sich geändert – sieh es dir in Ruhe an.' : tr.them.locked ? `${tr.with.name} hat gesperrt. Sperre, wenn du einverstanden bist.` : 'Legt beide euer Angebot hinein und sperrt es.';
  return (
    <Window title={'Handel mit ' + tr.with.name} onClose={cancel} class="win-trade" modal>
      <div class="trade">
        <div class="trade-offers">
          <OfferSide title="Du gibst" side={tr.me} mine onRemove={uid => send({ t: 'trade', a: 'remove', uid })} />
          <div class="trade-arrow" aria-hidden="true">⇄</div>
          <OfferSide title={`${tr.with.name} gibt`} side={tr.them} />
        </div>
        <div class={cx('trade-status', (tr.full || wait > 0) && 'warn', both && 'ready')} aria-live="polite">{status}</div>
        <div class="trade-mine">
          <div class="sec-title">Dein Rucksack <span class="pill">anklicken zum Anbieten</span></div>
          <div class="trade-inv scroll">
            {char.inv.map(it => {
              // was schon im Angebot liegt, ist hervorgehoben; von Stapeln zeigt der Rucksack den Rest
              const off = offered.get(it.uid) ?? 0, bound = !!tradeBlock(it), have = it.qty ?? 1;
              const shown = off > 0 && have > off ? { ...it, qty: have - off } : it;
              return <ItemSlot key={it.uid} item={shown} size="sm" char={char} dim={bound || off >= have} selected={off > 0} onClick={() => add(it)} />;
            })}
            {char.inv.length === 0 && <div class="note">Dein Rucksack ist leer.</div>}
          </div>
          {pick && picked && (
            <div class="trade-qty card">
              <span class="grow"><b>{itemName(picked)}</b> – wie viele? <span class="note">(du hast {picked.qty ?? 1})</span></span>
              <input class="input" type="number" min={1} max={picked.qty ?? 1} value={pick.n} aria-label="Menge"
                onInput={e => setPick({ uid: pick.uid, n: Math.max(1, Math.min(picked.qty ?? 1, Math.floor(Number((e.target as HTMLInputElement).value) || 1))) })}
                onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') { send({ t: 'trade', a: 'add', uid: pick.uid, qty: pick.n }); setPick(null); } }} onKeyUp={e => e.stopPropagation()} />
              <Btn kind="small" ariaLabel="eins weniger" disabled={pick.n <= 1} onClick={() => setPick({ uid: pick.uid, n: Math.max(1, pick.n - 1) })}>−</Btn>
              <Btn kind="small" ariaLabel="eins mehr" disabled={pick.n >= (picked.qty ?? 1)} onClick={() => setPick({ uid: pick.uid, n: Math.min(picked.qty ?? 1, pick.n + 1) })}>+</Btn>
              <Btn kind="small" onClick={() => setPick({ uid: pick.uid, n: picked.qty ?? 1 })}>Alle</Btn>
              <Btn kind="small" onClick={() => { send({ t: 'trade', a: 'add', uid: pick.uid, qty: pick.n }); setPick(null); }}>Anbieten</Btn>
              {offered.has(pick.uid) && <Btn kind="small" onClick={() => { send({ t: 'trade', a: 'remove', uid: pick.uid }); setPick(null); }}>Zurücknehmen</Btn>}
              <Btn kind="small" onClick={() => setPick(null)}>✕</Btn>
            </div>
          )}
          <div class="trade-goldrow">
            <span>Gold anbieten <span class="note">(du hast <Gold n={char.gold} />)</span></span>
            <input class="input" type="number" min={0} max={char.gold} value={gold} placeholder="0" aria-label="Gold anbieten"
              onInput={e => setGold((e.target as HTMLInputElement).value)} onBlur={sendGold}
              onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') sendGold(); }} onKeyUp={e => e.stopPropagation()} />
            <Btn kind="small" onClick={sendGold}>Setzen</Btn>
            <AmountSteps value={Math.max(0, Math.floor(Number(gold) || 0))} max={char.gold} onChange={v => { setGold(v ? String(v) : ''); if (v !== tr.me.gold) send({ t: 'trade', a: 'gold', gold: v }); }} />
          </div>
          <TradeChat />
        </div>
        <div class="trade-foot">
          <div class="note grow">Erst sperren beide, dann bestätigen beide. Jede Änderung hebt die Sperren wieder auf. Getauscht wird in einem Zug – oder gar nicht. Gebundene Gegenstände (ausgegraut) lassen sich nicht handeln.</div>
          <Btn onClick={cancel}>Abbrechen</Btn>
          {tr.me.locked
            ? <Btn onClick={() => send({ t: 'trade', a: 'unlock' })}>Entsperren</Btn>
            : <Btn kind="primary" disabled={wait > 0} onClick={() => send({ t: 'trade', a: 'lock' })}>{wait > 0 ? `Sperren (${Math.ceil(wait)})` : 'Sperren'}</Btn>}
          <Btn kind="primary" disabled={!both || tr.me.ok} onClick={() => send({ t: 'trade', a: 'confirm' })}>{tr.me.ok ? 'Bestätigt' : 'Bestätigen'}</Btn>
        </div>
      </div>
    </Window>
  );
}

// ------------------------------------------------------------------ Spieler ansehen
export function InspectWindow() {
  const i = useStore(s => s.inspect);
  const char = useStore(s => s.char);
  if (!i) return null;
  const close = () => store.set({ inspect: null });
  const sets = Object.entries(i.sets).filter(([id, n]) => n >= 2 && SETS[id]);
  return (
    <Window title={'Ansehen: ' + i.name} onClose={close} class="win-inspect">
      <div class="insp">
        <div class="insp-doll">
          <div class="char-stage"><Portrait k={'char_' + i.cls} scale={3} /></div>
          <div class="doll-name"><b>{i.name}</b>{i.title && <small class="insp-title">{i.title}</small>}<small>Stufe {i.level} · {CLASSES[i.cls]?.name}</small></div>
          <div class="doll-gs" title={GS_HELP}><small>Ausrüstungswert</small><GsValue gs={i.gs} /><small class="doll-gs-b" style={{ color: gsBracket(i.gs).color }}>{gsBracket(i.gs).name}</small></div>
          <ul class="insp-facts note">
            {i.kreis > 0 && <li>{kreisName(i.kreis)}</li>}
            {i.quell > 0 && <li>Quellstufe {i.quell}</li>}
            {i.riftStufe > 1 && <li>Mana-Risse bis Stufe {i.riftStufe}</li>}
            <li>Leben {fmtNum(i.stats.maxHp)} · Mana {fmtNum(i.stats.maxMp)}</li>
            <li>Angriff {fmtNum(i.stats.power)} · Verteidigung {fmtNum(i.stats.def)}</li>
            <li>Krit {String(i.stats.crit).replace('.', ',')} %{i.stats.el !== 'phys' && <> · <span style={{ color: ELEMENT_CSS[i.stats.el] }}>{ELEMENT_NAME[i.stats.el]}</span></>}</li>
            {sets.map(([id, n]) => <li>Set: {SETS[id].name} ({n}/{SET_FULL})</li>)}
            {i.pet && PETS[i.pet] && <li>Begleiter: {PETS[i.pet].name}</li>}
            {i.look?.g && LOOKS[i.look.g] && <li>Gewand: {LOOKS[i.look.g].name}</li>}
            {i.look?.w && LOOKS[i.look.w] && <li>Waffenglanz: {LOOKS[i.look.w].name}</li>}
          </ul>
        </div>
        <div class="insp-gear">
          <div class="sec-title">Ausrüstung</div>
          <ul class="equip-list">
            {SLOTS.map(s => {
              const it = i.equip[s];
              return (
                <li>
                  <ItemSlot item={it} placeholder={SLOT_ICON[s]} label={SLOT_NAME[s] + ' (leer)'} char={char} gs />
                  <div class="grow"><small>{SLOT_NAME[s]}</small><div class={cx('equip-name', it && 'rc' + it.rarity)}>{it ? itemName(it) : '—'}</div></div>
                </li>
              );
            })}
          </ul>
          <div class="note">Nur zum Ansehen – fremde Ausrüstung lässt sich nicht verändern.</div>
        </div>
      </div>
    </Window>
  );
}
