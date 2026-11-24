/** Pausenmenü und Hilfe. */
import { useEffect, useState } from 'preact/hooks';
import { net } from '../../net/net';
import { ACTION_LABEL, DEFAULT_PAD, keyName } from '../../state/settings';
import type { Action } from '../../state/settings';
import { store, useStore } from '../../state/store';
import { CFG, ELEMENT_NAME } from '../../../../shared/src/config';
import type { Element } from '../../../../shared/src/types';
import { Btn, ELEMENT_CSS, Kbd, Window, closePanel, send, useSettings } from '../common';
import { PAD_NAME } from './settings';

export function PausePanel() {
  const saved = useStore(s => s.saved);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setSaving(false); }, [saved]);
  const ago = saved ? Math.max(0, Math.round((Date.now() - saved) / 1000)) : -1;
  return (
    <Window title="Menü" onClose={closePanel} class="win-pause">
      <div class="pause">
        <Btn kind="primary" class="block menu-btn" autofocus onClick={closePanel}>Weiterspielen</Btn>
        <Btn class="block menu-btn" disabled={saving} onClick={() => { setSaving(true); send({ t: 'save' }); window.setTimeout(() => setSaving(false), 3000); }}>{saving ? 'Speichere …' : 'Speichern'}</Btn>
        <Btn class="block menu-btn" onClick={() => store.set({ panel: 'settings' })}>Einstellungen</Btn>
        <Btn class="block menu-btn" onClick={() => store.set({ panel: 'help' })}>Steuerung / Hilfe</Btn>
        <span class="pause-sep" />
        <Btn class="block menu-btn" onClick={() => net.leaveWorld()}>Zur Charakterauswahl</Btn>
        <Btn class="block menu-btn" kind="danger" onClick={() => net.quitToMenu()}>Zum Hauptmenü</Btn>
        <p class="note pause-note">Das Spiel läuft im Hintergrund weiter. Gespeichert wird automatisch alle {CFG.save.autosaveSec} Sekunden{ago >= 0 ? ` – zuletzt bestätigt vor ${ago < 60 ? ago + ' s' : Math.round(ago / 60) + ' min'}` : ''}.</p>
      </div>
    </Window>
  );
}

const HELP_GROUPS: [string, Action[]][] = [
  ['Kampf', ['up', 'down', 'left', 'right', 'attack', 'dodge', 'interact', 'skill1', 'skill2', 'skill3', 'skill4', 'potionHp', 'potionMp']],
  ['Fenster', ['inventory', 'character', 'skills', 'quests', 'map', 'party', 'ruf', 'chat', 'menu']],
];
const CYCLE: Element[] = ['fire', 'wind', 'earth', 'water'];
const El = ({ e }: { e: Element }) => <b style={{ color: ELEMENT_CSS[e] }}>{ELEMENT_NAME[e]}</b>;

export function HelpPanel() {
  const s = useSettings();
  const move = (['up', 'left', 'down', 'right'] as Action[]).map(a => keyName(s.keys[a]?.[0] ?? ''));
  return (
    <Window title="Steuerung & Hilfe" onClose={() => store.set({ panel: 'menu' })} class="win-help">
      <div class="helpp">
        <section>
          <div class="sec-title">Tastatur & Maus</div>
          <div class="help-keys">
            <div class="key-row"><span class="grow">Bewegen</span>{move.map(k => <Kbd>{k}</Kbd>)}</div>
            <div class="key-row"><span class="grow">Zielen</span><span class="note">Mauszeiger</span></div>
            {HELP_GROUPS.map(([title, acts]) => (
              <>
                <h4>{title}</h4>
                {acts.filter(a => !['up', 'down', 'left', 'right'].includes(a)).map(a => (
                  <div class="key-row"><span class="grow">{ACTION_LABEL[a]}</span>{(s.keys[a] ?? []).map(k => <Kbd>{keyName(k)}</Kbd>)}</div>
                ))}
              </>
            ))}
          </div>
          <p class="note">Alle Tasten lassen sich in den Einstellungen ändern.</p>
        </section>
        <section>
          <div class="sec-title">Gamepad</div>
          <div class="help-keys">
            <div class="key-row"><span class="grow">Bewegen</span><Kbd>Linker Stick</Kbd></div>
            <div class="key-row"><span class="grow">Zielen</span><Kbd>Rechter Stick</Kbd></div>
            {(Object.entries(DEFAULT_PAD) as [Action, number][]).sort((a, b) => a[1] - b[1]).map(([a, b]) => (
              <div class="key-row"><span class="grow">{ACTION_LABEL[a]}</span><Kbd>{PAD_NAME[b] ?? b}</Kbd></div>
            ))}
          </div>

          <div class="sec-title">Gut zu wissen</div>
          <div class="elem-cycle card">
            <div class="cycle-row">{CYCLE.map(e => <><El e={e} /><i>›</i></>)}<El e="fire" /></div>
            <div class="cycle-row"><El e="light" /><i>↔</i><El e="dark" /></div>
            <small>Ein überlegenes Element verursacht {Math.round(CFG.combat.elemStrong * 100)} % Schaden, ein unterlegenes nur {Math.round(CFG.combat.elemWeak * 100)} %. Gleiches gegen Gleiches: {Math.round(CFG.combat.elemSame * 100)} %.</small>
          </div>
          <ul class="tips">
            <li><b>Ausweichrolle:</b> Während der Rolle bist du kurz unverwundbar – rolle durch Angriffe hindurch, nicht davon weg.</li>
            <li><b>Kombos:</b> Mehrere Standardangriffe hintereinander enden in einem stärkeren Abschlusshieb. Treffer füllen Mana auf.</li>
            <li><b>Brüchige Felsblockaden</b> lassen sich mit Angriffen zertrümmern. Dahinter liegen oft Truhen oder Abkürzungen.</li>
            <li><b>Quellsteine</b> heilen dich, setzen deinen Rückkehrpunkt und erlauben die Schnellreise über die Weltkarte.</li>
            <li><b>Beute ist für jeden Spieler einzeln.</b> Was du siehst, gehört dir.</li>
            <li><b>Zustände:</b> Feuer entzündet, Wasser verlangsamt, Erde betäubt, Wind entblößt (mehr kritische Treffer), Licht schwächt, Dunkelheit zeichnet (mehr erlittener Schaden).</li>
            <li><b>Reaktionen:</b> Trägt ein Gegner den Zustand eines Elements und trifft ihn ein zweites, reagieren beide – etwa Feuer + Wind zum Feuersturm oder Wasser + Wind zu Frost. Kommen die Elemente von zwei Spielern, wirkt es deutlich stärker.</li>
            <li><b>Schwächen:</b> Oben im Bild steht, wogegen dein Ziel schwach ist und was es abwehrt. Beim Schmied lässt sich ein Element in die Waffe schmieden.</li>
            <li><b>Handwerk:</b> Schmiede, Alchemistin, Lagerfeuer und Gelehrte verarbeiten Rohstoffe zu Ausrüstung, Tränken, Speisen und Runen. Es wirkt immer nur eine Speise und ein Elixier.</li>
            <li><b>Ruf:</b> Quests, Ereignisse, seltene Monster und gespendete Rohstoffe bringen Ruf bei der Fraktion der Region. Ränge öffnen Vorräte, Rezepte und Nachlässe – Übersicht mit der Taste U.</li>
            <li><b>Ereignisse:</b> Mana-Wogen, Sternenregen, Weltbosse und mehr werden angesagt und stehen auf der Karte. Wer mithilft, bekommt seine eigene Belohnung – niemand nimmt jemandem etwas weg.</li>
            <li><b>Tag, Nacht und Jahreszeit:</b> Dorfbewohner gehen abends nach Hause (und antworten trotzdem). Manches zeigt sich nur nachts, bei bestimmtem Wetter oder zu einer Jahreszeit.</li>
            <li><b>Verbessern:</b> Schmiede werten Ausrüstung bis +{CFG.upgrade.max} auf. Scheitert ein Versuch, sind nur Gold und Material verloren.</li>
            <li><b>Niederlage:</b> Du erwachst am letzten Quellstein und verlierst {Math.round(CFG.player.deathGoldLoss * 100)} % deines Goldes. Verbündete können dich vorher aufhelfen.</li>
          </ul>
        </section>
      </div>
    </Window>
  );
}
