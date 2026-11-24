/** Einstellungen: Ton, Anzeige, Tastenbelegung, Gamepad, Profil-Schlüssel. Auch aus dem Hauptmenü erreichbar. */
import { useEffect, useState } from 'preact/hooks';
import { audio } from '../../audio';
import { ACTIONS, ACTION_LABEL, DEFAULT_PAD, getToken, keyName, resetKeys, setToken, settings, updateSettings } from '../../state/settings';
import type { Action } from '../../state/settings';
import { store, useStore } from '../../state/store';
import { Btn, Confirm, TextInput, Toggle, Window, copyText, cx, sfx, toggleFullscreen, useFullscreen, useSettings } from '../common';

// ---- Tastenerfassung: ein dauerhafter Capture-Listener, der nur aktiv ist, solange eine Taste neu belegt wird.
let capture: ((code: string | null) => void) | null = null;
let swallowClick = false;
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', e => {
    if (!capture) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const c = capture; capture = null;
    c(e.code === 'Escape' ? null : e.code);
  }, true);
  window.addEventListener('keyup', e => { if (capture) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  window.addEventListener('mousedown', e => {
    if (!capture || e.button > 2) return;
    e.preventDefault(); e.stopImmediatePropagation();
    swallowClick = true; window.setTimeout(() => { swallowClick = false; }, 300);
    const c = capture; capture = null;
    c('Mouse' + e.button);
  }, true);
  window.addEventListener('click', e => { if (swallowClick) { swallowClick = false; e.preventDefault(); e.stopImmediatePropagation(); } }, true);
}

export const PAD_NAME = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Back', 'Start', 'L3', 'R3', 'Steuerkreuz ↑', 'Steuerkreuz ↓', 'Steuerkreuz ←', 'Steuerkreuz →'];
const GROUPS: [string, Action[]][] = [
  ['Bewegung & Kampf', ['up', 'down', 'left', 'right', 'attack', 'dodge', 'interact']],
  ['Fähigkeiten & Tränke', ['skill1', 'skill2', 'skill3', 'skill4', 'potionHp', 'potionMp']],
  ['Fenster', ['inventory', 'character', 'skills', 'quests', 'map', 'party', 'ruf', 'chat', 'menu']],
];

function Slider(p: { label: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label class="slider-row">
      <span>{p.label}</span>
      <input type="range" min={p.min} max={p.max} step={p.step} value={p.value} onInput={e => p.onChange(+(e.target as HTMLInputElement).value)} />
      <output>{p.fmt(p.value)}</output>
    </label>
  );
}

function KeyBindings() {
  const s = useSettings();
  const [cap, setCap] = useState<Action | null>(null);
  useEffect(() => () => { capture = null; }, []);
  const start = (a: Action) => {
    sfx('ui_click');
    setCap(a);
    capture = code => {
      setCap(null);
      if (!code) return;
      const rest = (settings.keys[a] ?? []).slice(1).filter(k => k !== code);
      updateSettings({ keys: { ...settings.keys, [a]: [code, ...rest] } });
      sfx('ui_equip');
    };
  };
  const users = (code: string, self: Action) => ACTIONS.filter(a => a !== self && s.keys[a]?.includes(code));
  // Standard-Elemente: bekannte Missing-ACTIONS (falls künftig neue dazukommen) landen in der letzten Gruppe
  const grouped = new Set(GROUPS.flatMap(g => g[1]));
  const extra = ACTIONS.filter(a => !grouped.has(a));
  return (
    <div class="keys-wrap">
      {[...GROUPS, ...(extra.length ? [['Weitere', extra] as [string, Action[]]] : [])].map(([title, acts]) => (
        <div class="keys-group">
          <h4>{title}</h4>
          {acts.filter(a => ACTIONS.includes(a)).map(a => {
            const keys = s.keys[a] ?? [];
            const clash = keys[0] ? users(keys[0], a) : [];
            return (
              <div class="key-row">
                <span class="grow">{ACTION_LABEL[a]}{clash.length > 0 && <small class="bad"> · auch: {clash.map(c => ACTION_LABEL[c]).join(', ')}</small>}</span>
                {keys.slice(1).map(k => <span class="key-alt" title="Zweitbelegung">{keyName(k)}</span>)}
                <button type="button" class={cx('key-btn', cap === a && 'cap')} onClick={() => start(a)} aria-label={`${ACTION_LABEL[a]} neu belegen`}>
                  {cap === a ? 'Taste drücken …' : keys[0] ? keyName(keys[0]) : '—'}
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ProfileKey() {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imp, setImp] = useState('');
  const [err, setErr] = useState('');
  const [ask, setAsk] = useState(false);
  const token = getToken();
  const tryImport = () => {
    const t = imp.trim();
    if (!/^[a-zA-Z0-9_-]{16,80}$/.test(t)) { setErr('Das ist kein gültiger Profil-Schlüssel (16–80 Zeichen: Buchstaben, Ziffern, _ und -).'); sfx('ui_error'); return; }
    if (t === token) { setErr('Das ist bereits dein aktueller Schlüssel.'); return; }
    setErr(''); setAsk(true);
  };
  return (
    <div class="col">
      <p class="note"><b>Profil-Schlüssel</b> – damit findest du deine Charaktere von einem anderen Browser wieder; behandle ihn wie ein Passwort.</p>
      <div class="row wrap">
        <code class="token mono grow">{show ? token : '•'.repeat(Math.min(24, token.length))}</code>
        <Btn kind="small" onClick={() => setShow(v => !v)}>{show ? 'Verbergen' : 'Anzeigen'}</Btn>
        <Btn kind="small" onClick={async () => { if (await copyText(token)) { setCopied(true); window.setTimeout(() => setCopied(false), 1600); } }}>{copied ? 'Kopiert ✓' : 'Kopieren'}</Btn>
      </div>
      <div class="row wrap">
        <div class="grow"><TextInput value={imp} onInput={v => { setImp(v); setErr(''); }} placeholder="Schlüssel aus einem anderen Browser einfügen" onEnter={tryImport} mono ariaLabel="Profil-Schlüssel importieren" /></div>
        <Btn onClick={tryImport} disabled={!imp.trim()}>Übernehmen</Btn>
      </div>
      {err && <div class="error-box">{err}</div>}
      {ask && (
        <Confirm yes="Übernehmen und neu laden" onNo={() => setAsk(false)}
          onYes={() => { if (setToken(imp.trim())) location.reload(); else { setAsk(false); setErr('Der Schlüssel konnte nicht gespeichert werden.'); } }}
          text={<>Dieser Browser wechselt zum eingegebenen Profil. <b>Notiere dir vorher deinen jetzigen Schlüssel</b>, sonst erreichst du die aktuellen Charaktere von hier aus nicht mehr. Die Seite wird neu geladen.</>} />
      )}
    </div>
  );
}

export function SettingsPanel() {
  const s = useSettings();
  const screen = useStore(st => st.screen);
  const fs = useFullscreen();
  const [resetAsk, setResetAsk] = useState(false);
  const set = updateSettings;
  const close = () => store.set({ panel: screen === 'game' ? 'menu' : null });
  const pad = Object.entries(DEFAULT_PAD) as [Action, number][];
  return (
    <Window title="Einstellungen" onClose={close} class="win-settings" modal={screen !== 'game'}>
      <div class="setp">
        <section>
          <div class="sec-title">Ton</div>
          <Slider label="Musik" value={s.musicVolume} min={0} max={1} step={0.05} fmt={v => Math.round(v * 100) + ' %'} onChange={v => { audio.setMusicVolume(v); set({ musicVolume: v }); }} />
          <Slider label="Effekte" value={s.sfxVolume} min={0} max={1} step={0.05} fmt={v => Math.round(v * 100) + ' %'} onChange={v => { audio.setSfxVolume(v); set({ sfxVolume: v }); }} />
          <div class="row end"><Btn kind="small" onClick={() => undefined} sound="pickup_item">Effekt testen</Btn></div>

          <div class="sec-title">Anzeige</div>
          <Slider label="Größe der Oberfläche" value={s.uiScale} min={0.8} max={1.4} step={0.05} fmt={v => Math.round(v * 100) + ' %'} onChange={v => set({ uiScale: v })} />
          <div class="toggles">
            <Toggle label="Vollbild" on={fs} onChange={toggleFullscreen} />
            <Toggle label="Minimap" hint="Karte oben rechts" on={s.showMinimap} onChange={v => set({ showMinimap: v })} />
            <Toggle label="Schadenszahlen" on={s.damageNumbers} onChange={v => set({ damageNumbers: v })} />
            <Toggle label="Bildschirmwackeln" hint="bei schweren Treffern" on={s.screenShake} onChange={v => set({ screenShake: v })} />
            <Toggle label="Beleuchtung" hint="Tag-Nacht und Lichtquellen" on={s.lighting} onChange={v => set({ lighting: v })} />
            <Toggle label="Wettereffekte" on={s.weather} onChange={v => set({ weather: v })} />
            <Toggle label="Automatisch zielen" hint="Tastatur und Gamepad" on={s.autoAim} onChange={v => set({ autoAim: v })} />
          </div>

          <div class="sec-title">Profil</div>
          <ProfileKey />
        </section>

        <section>
          <div class="sec-title">Tastenbelegung</div>
          <p class="note">Klicke eine Belegung an und drücke die neue Taste oder Maustaste. <b>Esc</b> bricht ab.</p>
          <KeyBindings />
          <div class="row end"><Btn kind="small" onClick={() => setResetAsk(true)}>Standard wiederherstellen</Btn></div>

          <div class="sec-title">Gamepad</div>
          <p class="note">Jedes Gamepad mit Standard-Belegung wird automatisch erkannt. <b>Linker Stick</b> bewegt, <b>rechter Stick</b> zielt. In Fenstern wählst du mit Stick oder Steuerkreuz aus, <b>A</b> bestätigt, <b>B</b> schließt.</p>
          <ul class="pad-list">
            {pad.sort((a, b) => a[1] - b[1]).map(([a, b]) => <li><span class="key-alt pad">{PAD_NAME[b] ?? 'Taste ' + b}</span>{ACTION_LABEL[a]}</li>)}
          </ul>
        </section>
      </div>
      {resetAsk && <Confirm yes="Zurücksetzen" onNo={() => setResetAsk(false)} onYes={() => { resetKeys(); setResetAsk(false); }} text="Alle Tasten auf die Standardbelegung zurücksetzen?" />}
    </Window>
  );
}
