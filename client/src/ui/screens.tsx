/** Bildschirme außerhalb des Spiels: Laden, Hauptmenü, Charakterauswahl (= Lobby), Zonenwechsel. */
import { useEffect, useState } from 'preact/hooks';
import { net } from '../net/net';
import { settings, updateSettings } from '../state/settings';
import { store, useStore } from '../state/store';
import { CFG, ELEMENT_NAME } from '../../../shared/src/config';
import { CLASSES, CLASS_IDS } from '../../../shared/src/data/classes';
import { SKILLS } from '../../../shared/src/data/skills';
import { ZONES } from '../../../shared/src/data/zones';
import { ATTR_NAME } from '../../../shared/src/types';
import type { AttrKey, CharSummary, ClassId } from '../../../shared/src/types';
import { ACLASS_NAME, WTYPE_NAME, Btn, Confirm, Icon, Portrait, TextInput, copyText, cx, fmtTime, sfx, toggleFullscreen, useFullscreen } from './common';

const MOTES = Array.from({ length: 26 }, (_, i) => {
  const r = (n: number) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  return { left: r(1) * 100, size: 2 + Math.floor(r(2) * 3), dur: 9 + r(3) * 14, delay: -r(4) * 20, drift: (r(5) - 0.5) * 80, hue: r(6) };
});

/** Animierter Hintergrund: Nachthimmel, Hügelsilhouetten, die leuchtende Quelle und aufsteigende Manafunken. Rein mit CSS. */
export function Scenery({ dim }: { dim?: boolean }) {
  return (
    <div class={cx('scenery', dim && 'scenery-dim')} aria-hidden="true">
      <div class="sc-stars" />
      <div class="sc-stars sc-stars2" />
      <div class="sc-moon" />
      <div class="sc-aurora" />
      <div class="sc-hill sc-hill3" />
      <div class="sc-hill sc-hill2" />
      <div class="sc-beam" />
      <div class="sc-hill sc-hill1" />
      <div class="sc-pool" />
      <div class="sc-motes">
        {MOTES.map(m => (
          <i style={{ left: m.left + '%', width: m.size + 'px', height: m.size + 'px', animationDuration: m.dur + 's', animationDelay: m.delay + 's', '--drift': m.drift + 'px', background: m.hue < 0.6 ? '#9fe8ff' : m.hue < 0.85 ? '#ffe7a6' : '#c9a4ff' } as any} />
        ))}
      </div>
      <div class="sc-vignette" />
    </div>
  );
}

function Logo({ small }: { small?: boolean }) {
  return (
    <div class={cx('logo', small && 'logo-small')}>
      <div class="logo-orn"><span /><i /><span /></div>
      <h1 class="logo-title"><span>Eternal</span> <span>Mana</span></h1>
      {!small && <div class="logo-sub">Die Legende der Ewigen Quelle</div>}
    </div>
  );
}

// ------------------------------------------------------------------ Laden
export function BootScreen() {
  const p = useStore(s => s.bootProgress);
  const error = useStore(s => s.error);
  return (
    <div class="screen center-screen">
      <Scenery dim />
      <div class="boot-box">
        <Logo />
        {error ? <><div class="error-box" role="alert">{error}</div><p class="note boot-help">Meist hilft neu laden. Bleibt es dabei: beim Gastgeber im Launcher „Dateien prüfen“ wählen (repariert beschädigte Dateien) und den Server neu starten.</p><Btn kind="primary" autofocus onClick={() => location.reload()}>Seite neu laden</Btn></> : (
          <>
            <div class="boot-bar"><div style={{ width: Math.round(p * 100) + '%' }} /></div>
            <div class="boot-text">Die Welt wird gezeichnet … {Math.round(p * 100)} %</div>
          </>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Hauptmenü
export function MainMenu() {
  const conn = useStore(s => s.conn);
  const error = useStore(s => s.error);
  const url = useStore(s => s.serverUrl);
  const [name, setName] = useState(settings.playerName);
  const [addr, setAddr] = useState(settings.lastServer);
  const [join, setJoin] = useState(false);
  const fs = useFullscreen();
  const busy = conn === 'connecting' || conn === 'reconnecting';

  const saveName = () => updateSettings({ playerName: name.trim().slice(0, 16) });
  const play = () => { saveName(); net.connect(''); };
  const joinServer = () => { if (!addr.trim()) { sfx('ui_error'); return; } saveName(); net.connect(addr.trim()); };

  return (
    <div class="screen menu-screen">
      <Scenery />
      <div class="menu-layout">
        <Logo />
        <div class="menu-card">
          {busy ? (
            <div class="menu-busy">
              <div class="spinner" />
              <div>
                <b>{conn === 'reconnecting' ? 'Server antwortet nicht – neuer Versuch …' : 'Verbinde …'}</b>
                <div class="note mono">{url.replace(/^wss?:\/\//, '').replace(/\/ws$/, '')}</div>
              </div>
              <Btn onClick={() => net.disconnect()}>Abbrechen</Btn>
            </div>
          ) : (
            <>
              <label class="field">
                <span>Dein Name</span>
                <TextInput value={name} onInput={setName} maxLength={16} placeholder="Spieler" onEnter={play} ariaLabel="Dein Name" />
              </label>
              <Btn kind="primary" class="block menu-btn" onClick={play} autofocus>Spielen</Btn>
              <Btn class="block menu-btn" onClick={() => setJoin(j => !j)}>Server beitreten</Btn>
              {join && (
                <div class="join-box">
                  <div class="row">
                    <TextInput value={addr} onInput={setAddr} placeholder="100.101.102.103" onEnter={joinServer} autofocus ariaLabel="Serveradresse" mono />
                    <Btn kind="primary" onClick={joinServer}>Verbinden</Btn>
                  </div>
                  <div class="note">Tailscale-IP oder MagicDNS-Name des Gastgebers, z. B. 100.101.102.103</div>
                </div>
              )}
              <Btn class="block menu-btn" onClick={() => store.set({ panel: 'help' })}>Handbuch</Btn>
              <Btn class="block menu-btn" onClick={() => store.set({ panel: 'settings' })}>Einstellungen</Btn>
              <Btn class="block menu-btn" onClick={toggleFullscreen}>{fs ? 'Vollbild verlassen' : 'Vollbild'}</Btn>
            </>
          )}
          {error && <div class="error-box" role="alert">{error}</div>}
        </div>
      </div>
      <div class="menu-foot">Version {CFG.version} · Ein Abenteuer für 1–4 Spieler</div>
    </div>
  );
}

// ------------------------------------------------------------------ Charakterauswahl / Lobby
function Stars({ n }: { n: number }) {
  return <span class="stars" aria-label={`Schwierigkeit ${n} von 3`}>{'★'.repeat(n)}<i>{'★'.repeat(3 - n)}</i></span>;
}

function LobbyPanel() {
  const info = useStore(s => s.serverInfo);
  const online = useStore(s => s.online);
  const ping = useStore(s => s.ping);
  const [copied, setCopied] = useState('');
  const copy = async (u: string) => { if (await copyText(u)) { setCopied(u); window.setTimeout(() => setCopied(c => (c === u ? '' : c)), 1600); } };
  const KIND: Record<string, string> = { tailscale: 'Tailscale', lan: 'Heimnetz', local: 'Dieser PC' };
  const hasTs = !!info?.addresses.some(a => a.kind === 'tailscale');
  return (
    <aside class="lobby">
      <h3>{info?.name ?? 'Server'}</h3>
      <div class="note">Version {info?.version ?? CFG.version} · Port {info?.port ?? CFG.net.defaultPort}{ping ? ` · ${ping} ms` : ''}</div>

      <div class="sec-title">Freunde einladen</div>
      {info?.addresses.length ? (
        <ul class="addr-list">
          {[...info.addresses].sort((a, b) => (a.kind === 'tailscale' ? -1 : 0) - (b.kind === 'tailscale' ? -1 : 0)).map(a => (
            <li class={cx('addr', a.kind === 'tailscale' && 'addr-best')}>
              <div class="grow">
                <div class="addr-label">{a.label || KIND[a.kind]}{a.kind === 'tailscale' && <span class="pill gold-pill">für Freunde</span>}</div>
                <div class="addr-url mono">{a.url}</div>
              </div>
              <Btn kind="small" onClick={() => copy(a.url)}>{copied === a.url ? 'Kopiert ✓' : 'Kopieren'}</Btn>
            </li>
          ))}
        </ul>
      ) : <div class="note">Der Server hat keine Adressen gemeldet.</div>}
      <div class={cx('ts-status', info?.tailscale.available ? 'ok' : 'off')}>
        <i />
        {info?.tailscale.available
          ? <span><b>Tailscale aktiv.</b> {hasTs ? 'Schicke deinen Freunden die Tailscale-Adresse – sie öffnen sie im Browser oder tragen sie unter „Server beitreten“ ein.' : 'Freunde im selben Tailnet erreichen dich über die Tailscale-Adresse dieses PCs.'}</span>
          : <span><b>Tailscale nicht gefunden.</b> Im Heimnetz funktioniert die Heimnetz-Adresse. Für Freunde über das Internet: Tailscale auf dem Gastgeber-PC installieren und anmelden.</span>}
      </div>

      <div class="sec-title">Gerade in der Welt ({online.length})</div>
      {online.length === 0 ? <div class="note">Noch niemand unterwegs. Sei die oder der Erste!</div> : (
        <ul class="online-list scroll">
          {online.map(p => (
            <li>
              <Portrait k={'char_' + p.cls} scale={1} />
              <div class="grow"><b>{p.name}</b><div class="note">{CLASSES[p.cls]?.name} · Stufe {p.level}</div></div>
              <span class="note">{ZONES[p.zone]?.name ?? p.zone}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

function CharCard({ c, slot, onNew, onDelete }: { c?: CharSummary; slot: number; onNew: () => void; onDelete: (c: CharSummary) => void }) {
  if (!c) {
    return (
      <button type="button" class="char-card char-empty" onClick={() => { sfx('ui_click'); onNew(); }}>
        <span class="char-plus">+</span>
        <b>Neues Spiel</b>
        <small>Platz {slot + 1} ist frei</small>
      </button>
    );
  }
  const cls = CLASSES[c.cls];
  return (
    <div class="char-card">
      <div class="char-stage"><Portrait k={'char_' + c.cls} scale={3} /></div>
      <b class="char-name">{c.name}</b>
      <div class="char-meta">Stufe {c.level} · {cls?.name}</div>
      <div class="note">{ZONES[c.zone]?.name ?? c.zone}</div>
      <div class="note">Spielzeit: {fmtTime(c.playtime)}</div>
      <div class="char-actions">
        <Btn kind="primary" class="grow" onClick={() => net.enter(c.id)}>Betreten</Btn>
        <Btn kind="danger" title="Charakter löschen" ariaLabel={`${c.name} löschen`} onClick={() => onDelete(c)}>✕</Btn>
      </div>
    </div>
  );
}

const NAME_A = ['Al', 'Bran', 'Cael', 'Dor', 'El', 'Fen', 'Gar', 'Hel', 'Il', 'Jor', 'Kal', 'Lio', 'Mir', 'Nor', 'Or', 'Ren', 'Sel', 'Tam', 'Val', 'Wyn', 'Yso'];
const NAME_B = ['a', 'an', 'ara', 'dis', 'en', 'ia', 'ion', 'is', 'la', 'mar', 'na', 'or', 'ra', 'rik', 'ros', 'tha', 'wen', 'wick'];
function CharCreate({ slot, onBack }: { slot: number; onBack: () => void }) {
  const error = useStore(s => s.error);
  const [cls, setCls] = useState<ClassId>('krieger');
  const [name, setName] = useState(settings.playerName.slice(0, 16));
  const [sent, setSent] = useState(false);
  const def = CLASSES[cls];
  const skill = SKILLS[def.startSkill];
  const n = name.trim();
  const valid = n.length >= 2 && n.length <= 16;
  useEffect(() => { store.set({ error: null }); }, []);
  useEffect(() => { if (error) setSent(false); }, [error]);
  const create = () => { if (!valid) { sfx('ui_error'); return; } setSent(true); net.createChar(slot, n, cls); };
  // 0.8: Ein Name ohne Tastatur – wer nur ein Gamepad hat, käme sonst nicht über diesen Bildschirm hinaus
  const roll = () => { const a = NAME_A[Math.floor(Math.random() * NAME_A.length)], b = NAME_B[Math.floor(Math.random() * NAME_B.length)]; setName(a + b); };
  const maxAttr = 12;
  return (
    <div class="create">
      <div class="create-head">
        <h2>Neues Spiel</h2>
        <span class="note">Wähle deine Klasse – sie lässt sich später nicht mehr ändern.</span>
      </div>
      <div class="create-body">
        <div class="class-list" role="radiogroup" aria-label="Klasse">
          {CLASS_IDS.map(id => (
            <button type="button" role="radio" aria-checked={cls === id} class={cx('class-pick', cls === id && 'on')} onClick={() => { sfx('ui_tab'); setCls(id); }}>
              <Portrait k={'char_' + id} scale={2} />
              <span><b>{CLASSES[id].name}</b><small>{CLASSES[id].tagline}</small></span>
            </button>
          ))}
        </div>
        <div class="class-detail">
          <div class="class-hero">
            <div class="char-stage big"><Portrait k={'char_' + cls} scale={5} /></div>
            <div class="grow">
              <h3 class="class-name">{def.name}</h3>
              <div class="class-tag">{def.tagline}</div>
              <p class="class-desc">{def.desc}</p>
              <div class="class-facts">
                <span><small>Schwierigkeit</small><Stars n={def.difficulty} /></span>
                <span><small>Waffe</small><b>{WTYPE_NAME[def.weapon]}</b></span>
                <span><small>Rüstung</small><b>{ACLASS_NAME[def.armor]}</b></span>
                <span><small>Leben</small><b>{def.baseHp + def.baseAttrs.vit * def.hpPerVit + 8}</b></span>
                <span><small>Mana</small><b>{def.baseMp + def.baseAttrs.int * def.mpPerInt + 3}</b></span>
              </div>
            </div>
          </div>
          <div class="class-cols">
            <div>
              <div class="sec-title">Grundattribute</div>
              <ul class="attr-bars">
                {(Object.keys(ATTR_NAME) as AttrKey[]).map(a => (
                  <li><span>{ATTR_NAME[a]}</span><div class="attr-bar"><div style={{ width: (def.baseAttrs[a] / maxAttr) * 100 + '%' }} /></div><b>{def.baseAttrs[a]}</b></li>
                ))}
              </ul>
            </div>
            <div>
              <div class="sec-title">Startfähigkeit</div>
              {skill && (
                <div class="start-skill">
                  <Icon k={'skill_' + skill.glyph} el={skill.element} size={48} />
                  <div><b>{skill.name}</b> <span class="note">· {ELEMENT_NAME[skill.element]}</span><div class="note">{skill.desc}</div></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {error && <div class="error-box" role="alert">{error}</div>}
      <div class="create-foot">
        <Btn onClick={onBack}>Zurück</Btn>
        <label class="field field-inline grow">
          <span>Name</span>
          <TextInput value={name} onInput={v => setName(v.slice(0, 16))} maxLength={16} placeholder="2–16 Zeichen" onEnter={create} ariaLabel="Name des Charakters" />
        </label>
        <Btn onClick={roll} title="Schlägt einen Namen vor – praktisch ohne Tastatur">Name würfeln</Btn>
        <Btn kind="primary" disabled={!valid || sent} onClick={create}>{sent ? 'Wird erschaffen …' : 'Abenteuer beginnen'}</Btn>
      </div>
    </div>
  );
}

export function CharSelect() {
  const chars = useStore(s => s.chars);
  const error = useStore(s => s.error);
  const conn = useStore(s => s.conn);
  const [creating, setCreating] = useState<number | null>(null);
  const [del, setDel] = useState<CharSummary | null>(null);
  const slots = Array.from({ length: CFG.save.slots }, (_, i) => chars.find(c => c.slot === i));
  useEffect(() => { if (creating !== null && slots[creating]) setCreating(null); }, [chars]);
  const back = () => { net.disconnect(); store.set({ screen: 'menu', error: null }); };

  return (
    <div class="screen chars-screen">
      <Scenery dim />
      <div class="chars-layout">
        <header class="chars-head">
          <Logo small />
          <span class="grow" />
          {conn === 'reconnecting' && <span class="pill bad">Verbindung verloren – verbinde neu …</span>}
          <Btn onClick={back}>← Hauptmenü</Btn>
        </header>
        <div class="chars-main">
          <section class="chars-panel">
            {creating !== null ? <CharCreate slot={creating} onBack={() => { store.set({ error: null }); setCreating(null); }} /> : (
              <>
                <div class="create-head"><h2>Wähle deinen Helden</h2><span class="note">Bis zu {CFG.save.slots} Charaktere pro Profil. Der Spielstand wird automatisch gespeichert.</span></div>
                <div class="char-grid">
                  {slots.map((c, i) => <CharCard c={c} slot={i} onNew={() => setCreating(i)} onDelete={setDel} />)}
                </div>
                {error && <div class="error-box" role="alert">{error}</div>}
              </>
            )}
          </section>
          <LobbyPanel />
        </div>
      </div>
      {del && (
        <Confirm danger yes="Endgültig löschen" onNo={() => setDel(null)} onYes={() => { net.deleteChar(del.id); setDel(null); }}
          text={<>Soll <b>{del.name}</b> (Stufe {del.level} · {CLASSES[del.cls]?.name}) wirklich gelöscht werden? Das lässt sich nicht rückgängig machen.</>} />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Zonenwechsel
const TIPS = [
  'Die Ausweichrolle macht dich für einen Moment unverwundbar.',
  'Feuer schlägt Wind, Wind schlägt Erde, Erde schlägt Wasser, Wasser schlägt Feuer.',
  'Quellsteine heilen dich, setzen deinen Rückkehrpunkt und erlauben die Schnellreise.',
  'Brüchige Felsblockaden lassen sich mit Angriffen zertrümmern.',
  'Beute fällt für jeden Spieler einzeln – niemand nimmt dir etwas weg.',
  `Borin verbessert Ausrüstung gegen Gold und Material. Ab +${CFG.upgrade.chance.findIndex(c => c < 1) + 1} kann ein Versuch scheitern.`,
  'Das Handbuch (Taste H) erklärt jedes System auf einer Seite.',
  'Gefallene Verbündete kannst du wiederbeleben, indem du bei ihnen interagierst.',
  'Quellsplitter erhöhen dauerhaft Leben und Mana. In jeder Region sind fünf versteckt.',
];
export function LoadingScreen() {
  const zone = useStore(s => s.zone);
  const conn = useStore(s => s.conn);
  const fail = useStore(s => s.loadFail);
  const z = ZONES[zone];
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  // 0.8: Dauert das Laden ungewöhnlich lange (oder scheitert es), gibt es einen Ausweg statt eines stehenden Bildes
  const [slow, setSlow] = useState(false);
  useEffect(() => { const t = window.setTimeout(() => setSlow(true), 15000); return () => clearTimeout(t); }, []);
  const retry = () => { const id = store.state.charId; store.set({ loadFail: null }); setSlow(false); if (id) net.enter(id); };
  return (
    <div class="screen center-screen loading-screen">
      <Scenery dim />
      <div class="loading-box">
        <div class="logo-orn"><span /><i /><span /></div>
        <h1 class="zone-title">{z?.name ?? 'Betrete die Welt …'}</h1>
        {z && <div class="zone-sub">{z.subtitle}</div>}
        {z && <div class="note">{z.kind === 'dungeon' ? 'Dungeon' : 'Region'} · Stufe {z.level[0]}–{z.level[1]}</div>}
        <div class="spinner" />
        {conn === 'reconnecting' && <div class="error-box">Verbindung verloren – verbinde neu …</div>}
        {fail && <div class="error-box" role="alert">{fail}</div>}
        {(fail || slow) && (
          <div class="loading-out">
            {!fail && <span class="note">Das dauert länger als üblich.</span>}
            <Btn kind="primary" onClick={retry}>Erneut versuchen</Btn>
            <Btn onClick={() => net.quitToMenu()}>Zum Hauptmenü</Btn>
          </div>
        )}
        <div class="loading-tip"><b>Tipp:</b> {tip}</div>
      </div>
    </div>
  );
}
