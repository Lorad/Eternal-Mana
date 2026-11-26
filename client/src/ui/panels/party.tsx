/** Gruppe: Mitglieder mit Aufenthaltsort, Anführer-Aktionen, Einladen aus der Online-Liste, die Regeln des gemeinsamen Spiels. */
import { useState } from 'preact/hooks';
import { useStore } from '../../state/store';
import { CFG } from '../../../../shared/src/config';
import { CLASSES } from '../../../../shared/src/data/classes';
import { KREIS_NAME } from '../../../../shared/src/data/rifts';
import { ZONES } from '../../../../shared/src/data/zones';
import { PARTY_RULES } from '../../../../shared/src/social';
import type { PartyMember } from '../../../../shared/src/types';
import { Bar, Btn, Confirm, Face, GsValue, Window, closePanel, cx, send } from '../common';
import { whereIs } from '../social';

export function PartyPanel() {
  const party = useStore(s => s.party);
  const online = useStore(s => s.online);
  const charId = useStore(s => s.charId);
  const myName = useStore(s => s.char?.name ?? '');
  const myKreis = useStore(s => s.char?.kreis ?? 0);
  const nearStone = useStore(s => s.nearStone);
  const [ask, setAsk] = useState<{ kind: 'kick' | 'disband' | 'leave'; m?: PartyMember } | null>(null);
  const inParty = party.length > 1;
  const me = party.find(m => m.charId === charId);
  const lead = !!me?.lead;
  const names = new Set(party.map(m => m.name));
  const others = online.filter(p => p.name !== myName);
  const full = party.length >= CFG.social.partyMax;
  // Die Gruppe spielt in der Welt ihres niedrigsten Kreises
  const kreise = party.map(m => m.kreis ?? 0), world = kreise.length ? Math.min(...kreise) : myKreis;
  const mixed = inParty && kreise.some(k => k !== world);
  const inRift = party.some(m => m.rift);
  return (
    <Window title="Gruppe" onClose={closePanel} class="win-party">
      <div class="pp">
        <div class="pp-col">
          <div class="sec-title">Deine Gruppe {inParty && <span class="pill">{party.length} / {CFG.social.partyMax}</span>}</div>
          {!inParty ? <div class="card note">Du bist allein unterwegs. Lade rechts andere Spieler ein – oder geh zu jemandem hin und drücke Interagieren. Wer einlädt, führt die Gruppe an.</div> : (
            <ul class="pp-list">
              {party.map(m => (
                <li class={cx('card pp-member', !m.online && 'offline', m.dead && 'down')} key={m.charId}>
                  <Face k={'char_' + m.cls} size={40} />
                  <div class="grow">
                    <div class="row between">
                      <b>{m.lead && <i class="pf-lead" title="führt die Gruppe an">★</i>}{m.name}{m.charId === charId && <span class="note"> (du)</span>}{m.lead && <span class="note"> · führt an</span>}</b>
                      <span class="note">Stufe {m.level} · {CLASSES[m.cls]?.name}{m.gs !== undefined && <> · <GsValue gs={m.gs} /></>}</span>
                    </div>
                    <Bar kind="hp" v={m.online ? m.hp : 0} max={m.maxHp} class="thin" label={false} />
                    <div class="note">{m.dead ? 'Gefallen · ' : ''}{whereIs(m)}{(m.kreis ?? 0) > 0 && !m.rift ? ` (eigener Kreis: ${KREIS_NAME[m.kreis!] ?? m.kreis})` : ''}{me && m.online && m.charId !== charId && m.inst !== me.inst ? ' – nicht bei dir' : ''}</div>
                    {m.charId !== charId && (
                      <div class="row wrap pp-actions">
                        {m.id > 0 && <Btn kind="small" onClick={() => send({ t: 'inspect', id: m.id })}>Ansehen</Btn>}
                        {m.id > 0 && <Btn kind="small" disabled={!nearStone} title={nearStone ? 'Reist zum Quellstein des Gebiets, in dem das Mitglied ist (du musst ihn aktiviert haben).' : 'Reisen kannst du nur von einem Quellstein aus.'} onClick={() => { send({ t: 'party', a: 'travel', id: m.id }); closePanel(); }}>Hinreisen</Btn>}
                        {lead && m.id > 0 && m.online && <Btn kind="small" onClick={() => send({ t: 'party', a: 'promote', id: m.id })}>Ernennen</Btn>}
                        {lead && <Btn kind="small" class="btn-danger" onClick={() => setAsk({ kind: 'kick', m })}>Entfernen</Btn>}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {mixed && <div class="card note pp-kreis">Ihr seid in verschiedenen Kreisen. Die Gruppe spielt in der Welt des niedrigsten: <b>{KREIS_NAME[world] ?? world}</b>.</div>}
          {inRift && <div class="card note pp-kreis">Ein Mana-Riss läuft. Wer die Gruppe jetzt verlässt oder entfernt wird, steht wieder am Riss-Stein und kann nicht zurück. Wer neu dazukommt, folgt am Riss-Stein.</div>}
          {inParty && (
            <div class="row end">
              {lead && <Btn kind="danger" onClick={() => setAsk({ kind: 'disband' })}>Gruppe auflösen</Btn>}
              <Btn kind="danger" onClick={() => setAsk({ kind: 'leave' })}>Gruppe verlassen</Btn>
            </div>
          )}
          <div class="card note pp-help">
            <b>So spielt ihr gemeinsam</b>
            <ul>{PARTY_RULES.map(([h, t]) => <li><b>{h}:</b> {t}</li>)}</ul>
          </div>
        </div>
        <div class="pp-col">
          <div class="sec-title">Spieler online <span class="pill">{others.length}</span></div>
          {inParty && !lead && <div class="card note">Nur wer die Gruppe anführt, lädt ein.</div>}
          {others.length === 0 ? <div class="card note">Außer dir ist gerade niemand auf diesem Server. Die Adresse für Freunde findest du in der Charakterauswahl.</div> : (
            <ul class="pp-list">
              {others.map(p => (
                <li class="card" key={p.id}>
                  <Face k={'char_' + p.cls} size={40} />
                  <div class="grow"><b>{p.name}</b><div class="note">Stufe {p.level} · {CLASSES[p.cls]?.name}{p.gs !== undefined && <> · <GsValue gs={p.gs} /></>} · {ZONES[p.zone]?.name ?? p.zone}</div></div>
                  <Btn kind="small" onClick={() => send({ t: 'inspect', id: p.id })}>Ansehen</Btn>
                  {names.has(p.name) ? <span class="pill gold-pill">in deiner Gruppe</span>
                    : <Btn kind="small" disabled={(inParty && !lead) || full} title={full ? 'Die Gruppe ist voll.' : undefined} onClick={() => send({ t: 'party', a: 'invite', id: p.id })}>Einladen</Btn>}
                </li>
              ))}
            </ul>
          )}
          <div class="card note">Handeln könnt ihr, wenn ihr nebeneinandersteht: zum Spieler gehen, <b>Interagieren</b> drücken (oder die Figur anklicken) und „Handeln“ wählen.</div>
        </div>
      </div>
      {ask && (
        <Confirm danger yes={ask.kind === 'kick' ? 'Entfernen' : ask.kind === 'disband' ? 'Auflösen' : 'Verlassen'} onNo={() => setAsk(null)}
          onYes={() => { if (ask.kind === 'kick' && ask.m) send({ t: 'party', a: 'kick', id: ask.m.id, char: ask.m.charId }); else send({ t: 'party', a: ask.kind === 'disband' ? 'disband' : 'leave' }); setAsk(null); }}
          text={ask.kind === 'kick' ? <><b>{ask.m?.name}</b> aus der Gruppe entfernen?{inRift ? ' Im laufenden Mana-Riss steht er danach am Riss-Stein und kann nicht zurück.' : ''}</>
            : ask.kind === 'disband' ? <>Die Gruppe für alle auflösen?</>
            : <>Die Gruppe verlassen?{inRift ? ' Im laufenden Mana-Riss stehst du danach am Riss-Stein und kannst nicht zurück.' : ''}{lead ? ' Die Führung geht an das dienstälteste Mitglied.' : ''}</>} />
      )}
    </Window>
  );
}
