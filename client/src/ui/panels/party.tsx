/** Gruppe: Mitglieder, Einladungen, Erklärung. */
import { useStore } from '../../state/store';
import { CFG } from '../../../../shared/src/config';
import { CLASSES } from '../../../../shared/src/data/classes';
import { ZONES } from '../../../../shared/src/data/zones';
import { Bar, Btn, Face, Window, closePanel, cx, send } from '../common';

export function PartyPanel() {
  const party = useStore(s => s.party);
  const online = useStore(s => s.online);
  const charId = useStore(s => s.charId);
  const myName = useStore(s => s.char?.name ?? '');
  const inParty = party.length > 1;
  const names = new Set(party.map(m => m.name));
  const others = online.filter(p => p.name !== myName);
  return (
    <Window title="Gruppe" onClose={closePanel} class="win-party">
      <div class="pp">
        <div class="pp-col">
          <div class="sec-title">Deine Gruppe {inParty && <span class="pill">{party.length}</span>}</div>
          {!inParty ? <div class="card note">Du bist allein unterwegs. Lade rechts andere Spieler ein – gemeinsam geht alles leichter, und manche Aufträge sind nur für Gruppen.</div> : (
            <ul class="pp-list">
              {party.map(m => (
                <li class={cx('card', !m.online && 'offline')}>
                  <Face k={'char_' + m.cls} size={40} />
                  <div class="grow">
                    <div class="row between"><b>{m.name}{m.charId === charId && <span class="note"> (du)</span>}</b><span class="note">Stufe {m.level} · {CLASSES[m.cls]?.name}</span></div>
                    <Bar kind="hp" v={m.hp} max={m.maxHp} class="thin" label={false} />
                    <div class="note">{m.online ? ZONES[m.zone]?.name ?? m.zone : 'Verbindung getrennt'}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {inParty && <Btn kind="danger" onClick={() => send({ t: 'party', a: 'leave' })}>Gruppe verlassen</Btn>}
          <div class="card note pp-help">
            <b>So funktioniert die Gruppe</b>
            <ul>
              <li><b>Geteilte Erfahrung:</b> Alle in der Nähe erhalten Erfahrung – plus {Math.round(CFG.combat.partyXpBonus * 100)} % Bonus je weiterem Mitglied.</li>
              <li><b>Eigene Beute:</b> Jeder sieht und sammelt seine eigenen Gegenstände. Niemand nimmt dir etwas weg.</li>
              <li><b>Gruppenquests:</b> Bosse und Gruppenaufträge zählen für alle Mitglieder in der Zone.</li>
              <li><b>Wiederbeleben:</b> Gefallene Mitglieder hilfst du auf, indem du bei ihnen interagierst.</li>
              <li><b>Gruppenchat:</b> „/p Text“ schreibt nur an deine Gruppe.</li>
            </ul>
          </div>
        </div>
        <div class="pp-col">
          <div class="sec-title">Spieler online <span class="pill">{others.length}</span></div>
          {others.length === 0 ? <div class="card note">Außer dir ist gerade niemand auf diesem Server. Die Adresse für Freunde findest du in der Charakterauswahl.</div> : (
            <ul class="pp-list">
              {others.map(p => (
                <li class="card">
                  <Face k={'char_' + p.cls} size={40} />
                  <div class="grow"><b>{p.name}</b><div class="note">Stufe {p.level} · {CLASSES[p.cls]?.name} · {ZONES[p.zone]?.name ?? p.zone}</div></div>
                  {names.has(p.name) ? <span class="pill gold-pill">in deiner Gruppe</span> : <Btn kind="small" onClick={() => send({ t: 'party', a: 'invite', id: p.id })}>Einladen</Btn>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Window>
  );
}
