/** Pausenmenü: Weiterspielen, Speichern, alle Fenster (auch für das Gamepad), offene Anfragen, Einstellungen, Handbuch. */
import { useEffect, useState } from 'preact/hooks';
import { net } from '../../net/net';
import { openHelp, store, togglePanel, useStore, type Panel } from '../../state/store';
import { CFG } from '../../../../shared/src/config';
import { QUESTS } from '../../../../shared/src/data/quests';
import { Btn, Window, closePanel, send } from '../common';
import { openSammlung } from '../home';

const WINDOWS: [Panel, string][] = [
  ['inventory', 'Inventar'], ['character', 'Charakter'], ['skills', 'Fähigkeiten'], ['quests', 'Questlog'],
  ['map', 'Weltkarte'], ['party', 'Gruppe'], ['ruf', 'Ruf und Welt'], ['sammlung', 'Sammlung'],
];

/**
 * Offene Anfragen (0.8): Einladung, Handelsanfrage und geteilte Quests erscheinen sonst nur als Meldung im HUD – dort
 * erreicht sie ein Gamepad nicht. Hier lassen sie sich wie jeder andere Knopf annehmen oder ablehnen.
 */
function Requests() {
  const invite = useStore(s => s.invite);
  const req = useStore(s => s.tradeReq);
  const offers = useStore(s => s.qOffers);
  if (!invite && !req && !offers.length) return null;
  return (
    <div class="pause-req">
      <div class="sec-title">Offene Anfragen</div>
      {invite && (
        <div class="pause-req-row"><span class="grow"><b>{invite.from}</b> lädt dich in die Gruppe ein.</span>
          <Btn kind="small" onClick={() => { send({ t: 'party', a: 'decline' }); store.set({ invite: null }); }}>Ablehnen</Btn>
          <Btn kind="primary" onClick={() => { send({ t: 'party', a: 'accept' }); store.set({ invite: null, panel: null }); }}>Annehmen</Btn></div>
      )}
      {req && (
        <div class="pause-req-row"><span class="grow"><b>{req.name}</b> möchte mit dir handeln.</span>
          <Btn kind="small" onClick={() => { send({ t: 'trade', a: 'decline' }); store.set({ tradeReq: null }); }}>Ablehnen</Btn>
          <Btn kind="primary" onClick={() => { send({ t: 'trade', a: 'accept' }); store.set({ tradeReq: null, panel: null }); }}>Annehmen</Btn></div>
      )}
      {offers.map(o => (
        <div class="pause-req-row" key={o.id}><span class="grow"><b>{o.from}</b> teilt die Quest „{QUESTS[o.id]?.name ?? o.id}“.</span>
          <Btn kind="small" onClick={() => { send({ t: 'qShareAns', id: o.id, ok: false }); store.set({ qOffers: store.state.qOffers.filter(x => x.id !== o.id) }); }}>Ablehnen</Btn>
          <Btn kind="primary" onClick={() => { send({ t: 'qShareAns', id: o.id, ok: true }); store.set({ qOffers: store.state.qOffers.filter(x => x.id !== o.id) }); }}>Annehmen</Btn></div>
      ))}
    </div>
  );
}

export function PausePanel() {
  const saved = useStore(s => s.saved);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setSaving(false); }, [saved]);
  const ago = saved ? Math.max(0, Math.round((Date.now() - saved) / 1000)) : -1;
  const open = (p: Panel) => { if (p === 'sammlung') openSammlung(); else { store.set({ panel: null }); togglePanel(p); } };
  return (
    <Window title="Menü" onClose={closePanel} class="win-pause">
      <div class="pause">
        <div class="pause-main">
          <Btn kind="primary" class="block menu-btn" autofocus onClick={closePanel}>Weiterspielen</Btn>
          <Btn class="block menu-btn" disabled={saving} onClick={() => { setSaving(true); send({ t: 'save' }); window.setTimeout(() => setSaving(false), 3000); }}>{saving ? 'Speichere …' : 'Speichern'}</Btn>
          <Btn class="block menu-btn" onClick={() => openHelp()}>Handbuch</Btn>
          <Btn class="block menu-btn" onClick={() => store.set({ panel: 'settings' })}>Einstellungen</Btn>
          <span class="pause-sep" />
          <Btn class="block menu-btn" onClick={() => net.leaveWorld()}>Zur Charakterauswahl</Btn>
          <Btn class="block menu-btn" kind="danger" onClick={() => net.quitToMenu()}>Zum Hauptmenü</Btn>
        </div>
        <div class="pause-side">
          <Requests />
          <div class="sec-title">Fenster</div>
          <div class="pause-wins">{WINDOWS.map(([p, label]) => <Btn kind="small" onClick={() => open(p)}>{label}</Btn>)}</div>
          <p class="note pause-note">Das Spiel läuft im Hintergrund weiter. Gespeichert wird automatisch alle {CFG.save.autosaveSec} Sekunden{ago >= 0 ? ` – zuletzt bestätigt vor ${ago < 60 ? ago + ' s' : Math.round(ago / 60) + ' min'}` : ''}.</p>
        </div>
      </div>
    </Window>
  );
}
