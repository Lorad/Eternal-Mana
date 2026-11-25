/**
 * Expeditionen (0.9): Auswahlfenster am Portal (Liste, Beschreibung, Schwierigkeitsgrade, Freischaltung, Bestzeiten,
 * Bereitschaftsprüfung der Gruppe, Beitreten, Mana-Risse), Anzeige im HUD während eines Laufs, Abschlussbildschirm in der
 * Belohnungskammer und Zusammenfassung nach der Rückkehr mit dem Weg zur Schmiede.
 * Was geht und warum nicht, kommt aus shared/src/data/expeditions.ts – der Server prüft alles selbst (server/src/expedition/).
 */
import { useRef, useState } from 'preact/hooks';
import { RARITY_COLOR } from '../../../shared/src/config';
import { BOSSES } from '../../../shared/src/data/enemies';
import { DIFFICULTIES, DIFFICULTY_NAME, EXPEDITION_LIST, EXPEDITIONS, EXP_DIFF, MINIS, WEEKLY_MOD, diffBlock, expUnlock, fmtSec, isExpedition, type WeeklyMod } from '../../../shared/src/data/expeditions';
import type { Difficulty } from '../../../shared/src/data/hub';
import { ITEMS } from '../../../shared/src/data/items';
import { BIOME_MATS } from '../../../shared/src/data/materials';
import { riftUnlocked } from '../../../shared/src/data/rifts';
import { ZONES } from '../../../shared/src/data/zones';
import type { CharData, ExpResult } from '../../../shared/src/types';
import { store, useStore, type UiState } from '../state/store';
import { Btn, Confirm, Icon, Window, cx, send, sfx, useTick } from './common';
import { openEndgame } from './endgame';
import { openExpeditionState } from './exp-net';
import './styles/expedition.css';

export const openExpedition = openExpeditionState;
const REGION: Record<string, string> = { gruenwald: 'Grünwald', kristall: 'Kristallhöhlen', glut: 'Glutlande', frost: 'Frostgebirge', ruinen: 'Verlorene Ruinen', schatten: 'Schattenreich' };

// ------------------------------------------------------------------ Auswahlfenster
export function ExpeditionWindow() {
  const win = useStore(s => s.expWin);
  const char = useStore(s => s.char);
  const lobby = useStore(s => s.expLobby);
  const party = useStore(s => s.party);
  const running = useStore(s => s.expParty);
  const weekly = useStore(s => s.expWeekly);
  const charId = useStore(s => s.charId);
  const list = EXPEDITION_LIST.filter(x => char && expUnlock(char, x.id).visible);
  const [sel, setSel] = useState<string>(lobby?.exp ?? list.find(x => char && expUnlock(char, x.id).ok && !(char.expeditions?.[x.id]?.clears.normal))?.id ?? list[0]?.id);
  const [diff, setDiff] = useState<Difficulty>((lobby?.diff as Difficulty) ?? 'normal');
  if (!win || !char) return null;
  const x = EXPEDITIONS[lobby?.exp ?? sel] ?? list[0];
  if (!x) return null;
  const u = expUnlock(char, x.id), rec = char.expeditions?.[x.id], boss = BOSSES[x.boss];
  const inParty = party.length > 1, lead = !inParty || party.find(m => m.lead)?.charId === charId;
  const close = () => store.set({ expWin: null });
  const minis = new Set<string>();
  const walk = (s: typeof x.sections[number]) => { if (s.mini) minis.add(s.mini); for (const w of s.side ?? []) walk(w); };
  x.sections.forEach(walk);
  const block = diffBlock(char, x.id, diff);
  return (
    <Window title="Expeditionen" onClose={close} class="win-exp" icon="map">
      {weekly && <WeeklyBanner w={weekly} />}
      {running && (
        <div class="xp-running card">
          <span>Deine Gruppe ist in <b>{EXPEDITIONS[running.exp]?.name}</b> ({DIFFICULTY_NAME[running.diff as Difficulty]}) – {running.n} drin.</span>
          <Btn kind="primary" disabled={!win.at} title={win.at ? '' : 'Am Portal beitreten'} onClick={() => { send({ t: 'exp', a: 'join' }); close(); }}>Beitreten</Btn>
        </div>
      )}
      <div class="xp">
        <div class="xp-list">
          <div class="sec-title">Expedition</div>
          {list.map(e => {
            const ok = expUnlock(char, e.id).ok, r = char.expeditions?.[e.id], n = r ? Object.values(r.clears).reduce((a, b) => a + (b ?? 0), 0) : 0;
            return (
              <button type="button" class={cx('craft-row', e.id === x.id && 'on', !ok && 'locked')} disabled={!!lobby && lobby.exp !== e.id} onClick={() => { sfx('ui_click'); setSel(e.id); setDiff('normal'); }}>
                <span class="craft-name grow"><b>{e.name}{e.secret ? ' ✦' : ''}</b><small class="note">{REGION[e.region]} · ab Stufe {e.rec}{n ? ` · ${n}× abgeschlossen` : ok ? '' : ' · verschlossen'}</small></span>
              </button>
            );
          })}
          <div class="sec-title">Mana-Risse</div>
          <Btn kind="small" disabled={!riftUnlocked(char)} title={riftUnlocked(char) ? '' : 'Erst nach dem Hohlen König'} onClick={() => { close(); openEndgame('risse', { stone: true }); }}>Zu den Mana-Rissen …</Btn>
        </div>
        <div class="xp-detail card">
          <div class="xp-head"><h3>{x.name}</h3><span class="note">{x.subtitle}</span></div>
          <p class="xp-desc">{x.desc}</p>
          <dl class="xp-facts">
            <div><dt>Region</dt><dd>{REGION[x.region]}</dd></div>
            <div><dt>Empfohlen</dt><dd>Stufe {x.rec}</dd></div>
            <div><dt>Endboss</dt><dd>{boss.name}</dd></div>
            <div><dt>Mini-Bosse</dt><dd>{[...minis].map(m => MINIS[m]?.name).join(', ')}</dd></div>
          </dl>
          <div class="xp-reward note">Belohnung: Ausrüstung, {ITEMS[BIOME_MATS[x.region]?.monster]?.name ?? 'Rohstoffe'}, Bosskern, die Trophäe des Bosses, selten {ITEMS[x.rare]?.name ?? 'ein besonderer Fund'} – und mit Glück Legendäres.</div>
          {!u.ok && (
            <ul class="xp-reqs">{u.reqs.map(r => <li class={r.ok ? 'ok' : 'no'}>{r.ok ? '✓' : '✗'} {r.text}</li>)}</ul>
          )}
          <div class="sec-title">Schwierigkeit</div>
          <div class="xp-diffs">
            {DIFFICULTIES.map(d => {
              const b = diffBlock(char, x.id, d), best = rec?.best?.[d], n = rec?.clears?.[d] ?? 0;
              return (
                <button type="button" class={cx('xp-diff', 'd-' + d, diff === d && 'on', !!b && 'locked')} disabled={!!lobby} title={b ?? EXP_DIFF[d].desc} onClick={() => { sfx('ui_click'); setDiff(d); }}>
                  <b>{DIFFICULTY_NAME[d]}</b>
                  <small>{b ? '🔒 ' + EXP_DIFF[d].unlockText : n ? `${n}× · Bestzeit ${best ? fmtSec(best) : '–'}` : 'noch nicht geschafft'}</small>
                </button>
              );
            })}
          </div>
          <p class="note xp-diffdesc">{EXP_DIFF[diff].desc}</p>
          {lobby ? <LobbyBox /> : (
            <div class="xp-actions">
              <Btn kind="primary" disabled={!!block || !win.at || !!running || !lead} onClick={() => send({ t: 'exp', a: 'select', id: x.id, diff })}>
                {inParty ? 'Gruppe zur Bereitschaft rufen' : 'Allein aufbrechen'}
              </Btn>
              <span class="note">{block ?? (!win.at ? 'Wählen und starten nur am Expeditionsportal.' : running ? 'Erst den laufenden Lauf beenden.' : !lead ? 'Die Gruppe wählt, wer sie anführt.' : inParty ? 'Jedes Mitglied bestätigt seine Bereitschaft, dann startet die Anführung.' : 'Eine Gruppe bildest du im Gruppenfenster (P).')}</span>
            </div>
          )}
          {u.ok && rec && <div class="note">Geheimnisse gefunden: {rec.secrets?.length ?? 0} · Mini-Bosse besiegt: {rec.minis?.length ?? 0}</div>}
        </div>
      </div>
    </Window>
  );
}
function WeeklyBanner({ w }: { w: NonNullable<UiState['expWeekly']> }) {
  return (
    <div class={cx('xp-weekly', w.done && 'done')}>
      <b>Herausforderung der Woche</b>
      <span>{EXPEDITIONS[w.exp]?.name} · {DIFFICULTY_NAME[w.diff as Difficulty]} · {w.mods.map(m => WEEKLY_MOD[m as WeeklyMod]?.name).join(' + ')}</span>
      <small>{w.done ? 'Diese Woche schon geschafft.' : 'Einmal je Woche: anderthalbfache Belohnung und zwei Teile mehr.'}</small>
    </div>
  );
}
function LobbyBox() {
  const l = useStore(s => s.expLobby)!;
  const me = useStore(s => s.charId);
  const at = useStore(s => s.expWin?.at);
  const lead = l.lead === me, mine = l.members.find(m => m.charId === me);
  const all = l.members.filter(m => m.online).every(m => m.ready);
  return (
    <div class="xp-lobby">
      <div class="sec-title">Bereitschaft · {EXPEDITIONS[l.exp]?.name} ({DIFFICULTY_NAME[l.diff]})</div>
      <ul>{l.members.map(m => (
        <li class={cx(m.ready && 'ready', !m.online && 'off')}>
          <i>{m.ready ? '✓' : '…'}</i><b>{m.name}</b>{m.charId === l.lead && <small> (führt)</small>}
          <span class="note">{!m.online ? 'getrennt' : m.ready ? (m.here ? 'bereit, am Portal' : 'bereit – wird beim Start geholt') : 'wartet'}</span>
        </li>
      ))}</ul>
      <div class="xp-actions">
        {lead ? <Btn kind="primary" disabled={!all || !at} onClick={() => { send({ t: 'exp', a: 'start' }); store.set({ expWin: null }); }}>Aufbrechen</Btn>
          : <Btn kind="primary" onClick={() => send({ t: 'exp', a: mine?.ready ? 'unready' : 'ready' })}>{mine?.ready ? 'Doch nicht bereit' : 'Bereit'}</Btn>}
        <Btn kind="ghost" onClick={() => send({ t: 'exp', a: 'cancel' })}>{lead ? 'Abbrechen' : 'Austreten'}</Btn>
        <span class="note">{all ? (lead ? 'Alle sind bereit.' : 'Alle sind bereit – die Anführung startet.') : 'Warten auf alle …'}</span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ HUD während eines Laufs
export function ExpHud() {
  const r = useStore(s => s.expRun);
  const zone = useStore(s => s.zone);
  const clock = useRef<HTMLSpanElement>(null);
  const [ask, setAsk] = useState(false);
  useTick(now => {
    const el = clock.current, cur = store.state.expRun;
    if (!el || !cur) return;
    const sec = cur.done ?? cur.t + (now - store.state.expRunAt) / 1000;
    const txt = fmtSec(sec);
    if (el.textContent !== txt) el.textContent = txt;
  }, [r]);
  if (!r || !isExpedition(zone)) return null;
  const x = EXPEDITIONS[r.exp];
  const ret = r.ret !== undefined ? Math.max(0, Math.round(r.ret - (performance.now() - store.state.expRunAt) / 1000)) : undefined;
  return (
    <div class={cx('exp-hud', 'd-' + r.diff, r.done !== undefined && 'done')}>
      <div class="exp-hud-top"><b>{x?.name}</b><small>{DIFFICULTY_NAME[r.diff]}</small><span class="exp-clock"><span ref={clock}>{fmtSec(r.t)}</span>{r.par ? <small> / {fmtSec(r.par)}</small> : null}</span></div>
      <div class="exp-sec">{r.sec}</div>
      <div class="exp-goal">▸ {r.goal}</div>
      {r.event && <div class="exp-event">{r.event.text}: Welle {r.event.wave}/{r.event.waves}</div>}
      {r.enrage !== undefined && <div class={cx('exp-enrage', r.enrage <= 0 && 'on')}>{r.enrage > 0 ? `Wut in ${fmtSec(r.enrage)}` : 'Der Boss rast!'}</div>}
      <div class="exp-foot">
        <span title="Geheimnisse">✦ {r.secrets[0]}/{r.secrets[1]}</span>
        <span title="Mini-Bosse">☠ {r.minis[0]}/{r.minis[1]}</span>
        <span title="Besiegte Gegner">⚔ {r.kills}</span>
        {r.deaths > 0 && <span class="bad" title="Tode">✝ {r.deaths}</span>}
        {r.weekly && <span class="exp-weekly" title={r.weekly.map(m => WEEKLY_MOD[m as WeeklyMod]?.desc).join(' ')}>Woche</span>}
      </div>
      {r.done !== undefined && r.ret !== undefined ? (
        <div class="exp-return">
          <Btn kind="primary" onClick={() => send({ t: 'exp', a: 'return' })}>Gemeinsam heimkehren{r.votes ? ` (${r.votes[0]}/${r.votes[1]})` : ''}</Btn>
          <small>Rückkehr in {ret ?? r.ret} s</small>
        </div>
      ) : (
        <div class="exp-leave"><button type="button" class="link" onClick={() => setAsk(true)}>Expedition verlassen</button></div>
      )}
      {ask && <Confirm text="Die Expedition verlassen? Solange deine Gruppe drin ist, kannst du am Portal zurück." yes="Verlassen" danger onYes={() => { setAsk(false); send({ t: 'exp', a: 'leave' }); }} onNo={() => setAsk(false)} />}
    </div>
  );
}

// ------------------------------------------------------------------ Abschluss und Zusammenfassung
function ResultBody({ r }: { r: ExpResult }) {
  const x = EXPEDITIONS[r.exp];
  return (
    <div class="xr">
      <div class="xr-title"><span>{x?.name}</span><small class={'d-' + r.diff}>{DIFFICULTY_NAME[r.diff]}</small></div>
      <dl class="xr-stats">
        <div><dt>Zeit</dt><dd>{fmtSec(r.sec)}{r.best && <em> Bestzeit!</em>}</dd></div>
        <div><dt>Gegner</dt><dd>{r.kills}</dd></div>
        <div><dt>Bosse</dt><dd>{r.bosses}</dd></div>
        <div><dt>Erfahrung</dt><dd>+{r.xp.toLocaleString('de-DE')}</dd></div>
        <div><dt>Gold</dt><dd>+{r.gold.toLocaleString('de-DE')}</dd></div>
        <div><dt>Geheimnisse</dt><dd>{r.secrets[0]}/{r.secrets[1]}</dd></div>
        <div><dt>Mini-Bosse</dt><dd>{r.minis[0]}/{r.minis[1]}</dd></div>
        <div><dt>Tode</dt><dd>{r.deaths}</dd></div>
      </dl>
      {r.feats.length > 0 && <div class="xr-feats">{r.feats.map(f => <span>{f}</span>)}</div>}
      <div class="xr-items">
        {r.items.map(it => (
          <div class="xr-item" style={{ '--c': RARITY_COLOR[it.rarity] ?? '#ddd' } as any}><Icon k={'item_' + it.icon} size={30} /><span>{it.name}{it.qty > 1 ? ` ×${it.qty}` : ''}</span></div>
        ))}
      </div>
    </div>
  );
}
export function ExpResultScreen() {
  const r = useStore(s => s.expResult);
  const run = useStore(s => s.expRun);
  if (!r) return null;
  return (
    <Window title="Expedition abgeschlossen" onClose={() => store.set({ expResult: null })} class="win-exp-result" modal>
      <ResultBody r={r} />
      <div class="row end xp-actions">
        <span class="note grow">{run?.ret !== undefined ? 'Das Portal in der Kammer bringt euch gemeinsam zurück.' : ''}</span>
        <Btn kind={run ? 'ghost' : 'primary'} onClick={() => store.set({ expResult: null })}>{run ? 'Umsehen' : 'Schließen'}</Btn>
        {run && <Btn kind="primary" autofocus onClick={() => { store.set({ expResult: null }); send({ t: 'exp', a: 'return' }); }}>Gemeinsam heimkehren</Btn>}
      </div>
    </Window>
  );
}
export function ExpSummary() {
  const r = useStore(s => s.expSummary);
  if (!r) return null;
  const x = EXPEDITIONS[r.exp];
  return (
    <div class="exp-summary card" role="status">
      <div class="exp-summary-head"><b>Zurück aus {x?.name}</b><button type="button" class="window-x" aria-label="Schließen" onClick={() => store.set({ expSummary: null })}>✕</button></div>
      <div class="note">{DIFFICULTY_NAME[r.diff]} · {fmtSec(r.sec)}{r.best ? ' (Bestzeit)' : ''} · +{r.xp.toLocaleString('de-DE')} EP · +{r.gold.toLocaleString('de-DE')} Gold · {r.items.length} Funde</div>
      {r.feats.length > 0 && <div class="xr-feats small">{r.feats.map(f => <span>{f}</span>)}</div>}
      <div class="row">
        <Btn kind="primary" onClick={() => send({ t: 'exp', a: 'forge' })}>Zur Schmiede</Btn>
        <Btn kind="ghost" onClick={() => store.set({ expResult: r })}>Statistik</Btn>
      </div>
    </div>
  );
}
/** für Tests und das Handbuch: Text der Freischaltung */
export function unlockText(c: CharData, id: string): string[] { return expUnlock(c, id).reqs.map(r => `${r.ok ? '✓' : '✗'} ${r.text}`); }
void ZONES;
