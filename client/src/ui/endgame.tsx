/**
 * Endspiel (0.5): Fenster für Mana-Risse, Quellstufen und den Neuen Kreis, die Riss-Anzeige im HUD,
 * der Reiter „Angleichen“ der Schmiede und der Einstieg im Gespräch mit Mirelda.
 * Alle Zahlen und Texte stammen aus shared/src/data/rifts.ts bzw. CFG – der Server prüft jede Aktion selbst
 * (server/src/rift.ts, endgame.ts); hier wird nur angezeigt, was geht und warum etwas nicht geht.
 */
import { useRef, useState } from 'preact/hooks';
import { store, useStore } from '../state/store';
import { CFG, ELEMENT_NAME, RARITY_COLOR, RARITY_NAME } from '../../../shared/src/config';
import { ITEMS } from '../../../shared/src/data/items';
import { ECHO_FRAG } from '../../../shared/src/data/materials';
import { NPCS } from '../../../shared/src/data/npcs';
import { ECHO_BOSS, KREIS_NAME, KREIS_NPC, QUELL_MAX, QUELL_TRACKS, RIFT_DUNGEONS, RIFT_MODS, TITLES, TRIAL_BOSSES, TRIAL_ID, TRIAL_NAME, attunable, attuneBlock, attuneCap, attunePlan, fmtTime, kreisBlock, kreisLevel, kreisOf, nextKreis, ownedTitles, quellBonus, quellFree, quellState, riftModName, riftMods, riftPar, riftRevives, riftState, riftUnlocked, seenEndings, trialUnlocked, type RiftModId } from '../../../shared/src/data/rifts';
import { DECISIONS } from '../../../shared/src/data/story';
import { ZONES } from '../../../shared/src/data/zones';
import { MOD_LABEL } from '../../../shared/src/types';
import type { CharData, Element } from '../../../shared/src/types';
import { Bar, Btn, Confirm, ELEMENT_CSS, Icon, Tabs, Window, cx, fmtNum, send, sfx, tipProps, useTick } from './common';
import { CostList, GearPicker, ItemTitle, useGear } from './craft';

type Tab = 'risse' | 'quell' | 'kreis';
export function openEndgame(tab: Tab, o: { stone?: boolean; npc?: string } = {}) { store.set({ endgame: { tab, ...o }, dialog: null, panel: null, craft: null, prompt: null }); }
/** Hat der Charakter schon etwas vom Endspiel? (Höchststufe, offene Risse oder ein Neuer Kreis) */
export function endgameOpen(c: CharData | null): boolean { return !!c && (c.level >= CFG.player.maxLevel || riftUnlocked(c) || kreisOf(c) > 0); }
const dec = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 1 });

// ------------------------------------------------------------------ gemeinsame Bausteine
function ModChip({ id, el }: { id: string; el?: Element }) {
  const m = RIFT_MODS[id as RiftModId];
  if (!m) return null;
  const color = id === 'element' && el ? ELEMENT_CSS[el] : m.color;
  return (
    <span class="eg-mod" style={{ '--c': color } as any} {...tipProps(() => <div class="tip-text"><b>{riftModName(id, el)}</b>{m.desc}</div>)}>
      <i />{riftModName(id, el)}
    </span>
  );
}
function ModList({ mods, el }: { mods: string[]; el?: Element }) {
  return (
    <ul class="eg-modlist">
      {mods.map(id => { const m = RIFT_MODS[id as RiftModId]; return m ? <li style={{ '--c': id === 'element' && el ? ELEMENT_CSS[el] : m.color } as any}><b><i />{riftModName(id, el)}</b><span>{m.desc}</span></li> : null; })}
    </ul>
  );
}

// ------------------------------------------------------------------ Fenster
export function EndgameWindow() {
  const eg = useStore(s => s.endgame);
  const char = useStore(s => s.char);
  if (!eg || !char) return null;
  const free = quellFree(char);
  const tabs: [Tab, string, (number | string)?][] = [['risse', 'Mana-Risse'], ['quell', 'Quellstufen', free || undefined], ['kreis', 'Neuer Kreis']];
  return (
    <Window title="Endspiel" onClose={() => store.set({ endgame: null })} class="win-endgame"
      head={<Tabs tabs={tabs} value={eg.tab} onChange={t => store.set({ endgame: { ...eg, tab: t } })} />}>
      {eg.tab === 'risse' ? <RiftTab char={char} stone={!!eg.stone} /> : eg.tab === 'quell' ? <QuellTab char={char} /> : <KreisTab char={char} npc={eg.npc} />}
    </Window>
  );
}

// ------------------------------------------------------------------ Mana-Risse
function RiftTab({ char, stone }: { char: CharData; stone: boolean }) {
  const st = riftState(char);
  const party = useStore(s => s.party);
  const charId = useStore(s => s.charId);
  const running = useStore(s => s.rift);
  const [sel, setSel] = useState<string>(RIFT_DUNGEONS[0]);
  const [stufe, setStufe] = useState(st.stufe);
  if (!riftUnlocked(char)) return (
    <div class="eg-locked card">
      <h3>Der Riss-Stein schweigt</h3>
      <p class="note">Mana-Risse öffnen sich erst, wenn der Hohle König im Thron der Leere bezwungen ist. Dann führt der Riss-Stein in Quellhain zurück in die sechs Dungeons – tiefer, härter und jedes Mal anders.</p>
    </div>
  );
  if (running) return (
    <div class="eg-locked card">
      <h3>{running.dungeon === TRIAL_ID ? TRIAL_NAME : `Mana-Riss ${ZONES[running.dungeon]?.name ?? ''} · Stufe ${running.stufe}`}</h3>
      {running.mods.length > 0 && <ModList mods={running.mods} el={running.el} />}
      <p class="note">{running.done ? 'Der Riss ist geschlossen. Die Truhen warten beim Portal.' : `Lebensfunken: ${running.revives}. Wer geht, kann am Riss-Stein wieder folgen, solange die Gruppe drin ist.`}</p>
      <Btn kind="danger" onClick={() => { send({ t: 'rift', a: 'leave' }); store.set({ endgame: null }); }}>Riss verlassen</Btn>
    </div>
  );
  const trial = sel === TRIAL_ID;
  const max = st.stufe, s = trial ? CFG.rift.trial.stufe : Math.max(1, Math.min(max, stufe));
  const { mods, el } = trial ? { mods: [] as RiftModId[], el: undefined } : riftMods(st.seed, sel, s);
  const leader = !party.length || party[0]?.charId === charId;
  const others = party.filter(m => m.charId !== charId).length;
  const why = !stone ? 'Nur am Riss-Stein in Quellhain' : !leader ? 'Nur der Anführer der Gruppe öffnet den Riss' : trial && !trialUnlocked(char) ? `Erst nach Riss-Stufe ${CFG.rift.trial.unlock}` : null;
  const boss = trial ? null : ZONES[sel]?.boss;
  return (
    <div class="eg">
      <div class="eg-list">
        <div class="sec-title">Dungeon</div>
        {RIFT_DUNGEONS.map(d => {
          const b = st.best[d];
          return (
            <button type="button" class={cx('craft-row', sel === d && 'on')} onClick={() => { sfx('ui_click'); setSel(d); }}>
              <span class="craft-name grow"><b>{ZONES[d].name}</b><small class="note">{b ? `Bestleistung: Stufe ${b[0]} in ${fmtTime(b[1])}` : 'noch nicht abgeschlossen'}</small></span>
            </button>
          );
        })}
        <div class="sec-title">Herausforderung</div>
        <button type="button" class={cx('craft-row', trial && 'on', !trialUnlocked(char) && 'locked')} onClick={() => { sfx('ui_click'); setSel(TRIAL_ID); }}>
          <span class="craft-name grow"><b>{TRIAL_NAME}</b><small class="note">{st.best[TRIAL_ID] ? `Bestzeit ${fmtTime(st.best[TRIAL_ID][1])} · ${st.trial ?? 0}× bestanden` : trialUnlocked(char) ? 'sieben Echos, ein Raum' : `ab abgeschlossener Stufe ${CFG.rift.trial.unlock}`}</small></span>
        </button>
        <p class="note eg-hint">Freigeschaltet bis <b>Stufe {max}</b> von {CFG.rift.maxStufe}. Jede abgeschlossene Stufe öffnet die nächste. Nach jedem Abschluss mischen sich die Modifikatoren neu.</p>
      </div>
      <div class="eg-detail card">
        {trial ? (
          <>
            <h3>{TRIAL_NAME}</h3>
            <p class="note">Sieben Echos nacheinander im Raum vor Vaels Tür – ohne Weg dorthin, ohne Modifikatoren, mit kurzer Atempause zwischen den Kämpfen. Gegnerstufe {CFG.rift.mobLevel(s)}, {CFG.rift.trial.revives} Lebensfunken für die ganze Gruppe.</p>
            <ol class="eg-trial">{TRIAL_BOSSES.map(b => <li><b>{ECHO_BOSS[b].name}</b><span>{ECHO_BOSS[b].mech}</span></li>)}</ol>
            <div class="sec-title">Lohn</div>
            <p class="note">Beim ersten Sieg: der Titel <b>„{TITLES.sieben.name}“</b> und das Rezept <b>{ITEMS.elx_sieben?.name}</b>, das es nur hier gibt. Jedes Mal: {CFG.rift.trial.fragments} Echo-Fragmente, {CFG.rift.trial.aether} Ätherstaub, ein Setteil und Beute der Stufe {CFG.rift.ilvl(s)}.</p>
          </>
        ) : (
          <>
            <div class="eg-head">
              <h3>{ZONES[sel].name}</h3>
              <div class="eg-stufe">
                <Btn kind="small" disabled={s <= 1} onClick={() => setStufe(s - 1)} ariaLabel="Stufe senken">−</Btn>
                <span class="eg-stufe-n" title="Riss-Stufe">Stufe <b>{s}</b></span>
                <Btn kind="small" disabled={s >= max} onClick={() => setStufe(s + 1)} ariaLabel="Stufe erhöhen">+</Btn>
                <Btn kind="small" disabled={s >= max} onClick={() => setStufe(max)}>Höchste</Btn>
              </div>
            </div>
            <dl class="eg-facts">
              <div><dt>Gegnerstufe</dt><dd>{CFG.rift.mobLevel(s)}</dd></div>
              <div><dt>Beutestufe</dt><dd>{CFG.rift.ilvl(s)}</dd></div>
              <div><dt>Richtzeit</dt><dd>{fmtTime(riftPar(sel, s))}</dd></div>
              <div><dt>Lebensfunken</dt><dd>{riftRevives(1 + others)}</dd></div>
            </dl>
            <div class="sec-title">Modifikatoren</div>
            <ModList mods={mods} el={el} />
            {boss && ECHO_BOSS[boss] && <>
              <div class="sec-title">Boss-Echo</div>
              <p class="eg-echo"><b>{ECHO_BOSS[boss].name}</b> – {ECHO_BOSS[boss].mech}: {ECHO_BOSS[boss].desc}</p>
            </>}
            <div class="sec-title">Lohn</div>
            <p class="note">Truhe für jeden: {CFG.rift.chestGear} Ausrüstungsteile der Stufe {CFG.rift.ilvl(s)}, <b>{CFG.rift.fragments(s)} Echo-Fragmente</b>, mit Glück Ätherstaub, ein Setteil, eine Rezeptrolle oder das Boss-Unikat.
              Unter der Richtzeit erscheint eine <b>Bonustruhe</b> (mindestens episch, +{CFG.rift.bonusFragments(s)} Fragmente). Zu langsam zu sein beendet nichts.</p>
          </>
        )}
        <div class="eg-actions">
          <Btn kind="primary" class="grow" disabled={!!why} onClick={() => { send({ t: 'rift', a: 'start', dungeon: sel, stufe: s }); store.set({ endgame: null }); }}>{why ?? (trial ? 'Prüfung beginnen' : 'Riss öffnen')}</Btn>
          {stone && others > 0 && <Btn onClick={() => { send({ t: 'rift', a: 'join' }); store.set({ endgame: null }); }} title="Betritt den Riss, den deine Gruppe gerade offen hat">Der Gruppe folgen</Btn>}
        </div>
        {others > 0 && <p class="note">Mitglieder deiner Gruppe, die am Riss-Stein stehen, kommen mit. Wer danach die Stufe abschließt, schaltet die nächste frei.</p>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Quellstufen
function QuellTab({ char }: { char: CharData }) {
  const q = quellState(char), free = quellFree(char), cap = CFG.quell.trackCap;
  const maxed = q.lvl >= QUELL_MAX, need = CFG.quell.xpToNext(q.lvl);
  if (char.level < CFG.player.maxLevel) return (
    <div class="eg-locked card">
      <h3>Quellstufen</h3>
      <p class="note">Ab Stufe {CFG.player.maxLevel} verfällt Erfahrung nicht mehr: Sie füllt Quellstufen. Jede Quellstufe gibt einen Punkt für einen kleinen, dauerhaften Bonus.</p>
    </div>
  );
  return (
    <div class="eg-quell">
      <div class="card eg-quell-head">
        <div class="eg-quell-lvl"><span>Quellstufe</span><b>{q.lvl}</b><small>von {QUELL_MAX}</small></div>
        <div class="grow">
          <Bar kind="xp" v={maxed ? 1 : q.xp} max={maxed ? 1 : need} label={maxed ? 'Alle Quellstufen erreicht' : `${fmtNum(q.xp)} / ${fmtNum(need)} EP`} />
          <p class="note">{free > 0 ? <><b>{free} freie{free === 1 ? 'r' : ''} Quellpunkt{free === 1 ? '' : 'e'}.</b> Jeder weitere Punkt auf derselben Bahn bringt etwas weniger als der vorige.</> : 'Erfahrung von Gegnern, Bossen und Quests füllt die nächste Quellstufe.'}</p>
        </div>
      </div>
      <div class="eg-tracks">
        {QUELL_TRACKS.map(t => {
          const n = q.pts[t.id] ?? 0, cur = quellBonus(t, n), next = quellBonus(t, n + 1);
          return (
            <div class="card eg-track">
              <div class="eg-track-head"><b>{t.name}</b><span class="eg-track-val">+{dec(cur)} {MOD_LABEL[t.mod]}</span></div>
              <div class="eg-pips" aria-label={`${n} von ${cap} Punkten`}>{Array.from({ length: cap }, (_, i) => <i class={cx(i < n && 'on')} />)}</div>
              <div class="eg-track-foot">
                <small class="note">{n >= cap ? `Voll ausgebaut (höchstens +${dec(t.max)}).` : `Nächster Punkt: +${dec(next - cur)} · voll: +${dec(t.max)}`}</small>
                <Btn kind="small" disabled={free < 1 || n >= cap} sound={null} onClick={() => send({ t: 'quell', track: t.id })} ariaLabel={`${t.name} ausbauen`}>+</Btn>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Neuer Kreis
const KEPT = ['Stufe, Attribute und Fähigkeiten', 'Ausrüstung, Inventar und Gold', 'Rezepte und Verzauberungen', 'Chronik und Quellsplitter', 'Quellstufen und Riss-Fortschritt', 'Titel'];
const RESET = ['alle Haupt- und Nebenquests', 'Entscheidungen und Hüter-Erinnerungen', 'Bosssiege – die Siegel liegen wieder in den Dungeons', 'Quellsteine außer Quellhain, Truhen der Oberwelt', 'Questgegenstände im Inventar'];
function KreisTab({ char, npc }: { char: CharData; npc?: string }) {
  const [ask, setAsk] = useState(false);
  const k = kreisOf(char), next = nextKreis(char), seen = seenEndings(char), block = kreisBlock(char);
  const titles = ownedTitles(char);
  const atMirelda = npc === KREIS_NPC;
  const why = block ?? (atMirelda ? null : `Sprich mit ${NPCS[KREIS_NPC]?.name ?? 'Mirelda'} in Quellhain`);
  return (
    <div class="eg eg-kreis">
      <div class="eg-list">
        <div class="card">
          <div class="sec-title">Dein Weg</div>
          <p class="eg-kreis-now"><b>{KREIS_NAME[k]}</b>{k > 0 && <span> · Gegner mindestens Stufe {kreisLevel(1, k)}</span>}</p>
          <ul class="eg-endings">
            {DECISIONS.ende.options.map(o => <li class={cx(seen.includes(o.v) && 'on')}><i>{seen.includes(o.v) ? '✓' : '?'}</i><span><b>{seen.includes(o.v) ? o.label : 'Ein Ende, das du noch nicht kennst'}</b>{seen.includes(o.v) && <small>{o.text}</small>}</span></li>)}
          </ul>
        </div>
        {(char.kreise?.length ?? 0) > 0 && (
          <div class="card">
            <div class="sec-title">Abgeschlossene Kreise</div>
            <ol class="eg-past">
              {char.kreise!.map((e, i) => (
                <li>
                  <b>{i < KREIS_NAME.length ? KREIS_NAME[Math.min(i, CFG.kreis.max)] : `Kreis ${i + 1}`}: {DECISIONS.ende.options.find(o => o.v === e.ende)?.label ?? '–'}</b>
                  <small class="note">{Object.entries(e.dec).filter(([id]) => id !== 'ende' && DECISIONS[id]).map(([id, v]) => `${DECISIONS[id].who}: ${DECISIONS[id].options.find(o => o.v === v)?.label ?? '?'}`).join(' · ') || 'keine weiteren Entscheidungen'}</small>
                </li>
              ))}
            </ol>
          </div>
        )}
        {titles.length > 0 && (
          <div class="card">
            <div class="sec-title">Titel</div>
            <div class="eg-titles">
              <Btn kind="small" class={cx(!char.title && 'on')} onClick={() => send({ t: 'title', id: '' })}>ohne</Btn>
              {titles.map(id => <Btn kind="small" class={cx(char.title === id && 'on')} title={TITLES[id].desc} onClick={() => send({ t: 'title', id })}>{TITLES[id].name}</Btn>)}
            </div>
          </div>
        )}
      </div>
      <div class="eg-detail card">
        <h3>Neuer Kreis</h3>
        <p class="note">Die Geschichte beginnt von vorn – mit allem, was du kannst. So lassen sich alle drei Enden erleben. {k >= CFG.kreis.max
          ? <>Härter, als sie jetzt ist, wird die Welt nicht mehr.</>
          : <><b>{KREIS_NAME[next]}:</b> Kein Gegner ist schwächer als Stufe <b>{kreisLevel(1, next)}</b>, Bosse und Beute steigen mit.</>}</p>
        <div class="eg-cols">
          <div><div class="sec-title">Das bleibt</div><ul class="eg-keep">{KEPT.map(s => <li>{s}</li>)}</ul></div>
          <div><div class="sec-title">Das beginnt neu</div><ul class="eg-reset">{RESET.map(s => <li>{s}</li>)}</ul></div>
        </div>
        <p class="note">Quests geben ab dem zweiten Kreis <b>Echo-Fragmente</b> statt Attribut- und Fähigkeitspunkten. In einer Gruppe spielt ihr in der Welt des Mitglieds mit dem <b>niedrigsten</b> Kreis.</p>
        <Btn kind="primary" class="block" disabled={!!why} onClick={() => setAsk(true)}>{why ?? `${KREIS_NAME[next]} beginnen`}</Btn>
      </div>
      {ask && <Confirm danger yes="Ja, neu beginnen" text={<><b>{KREIS_NAME[next]} beginnen?</b><br />Alle Quests und Entscheidungen dieses Durchgangs werden zurückgesetzt. Stufe, Ausrüstung, Rezepte, Chronik, Quellstufen und Riss-Fortschritt bleiben. Das lässt sich nicht rückgängig machen.</>}
        onNo={() => setAsk(false)} onYes={() => { setAsk(false); send({ t: 'kreis' }); store.set({ endgame: null }); }} />}
    </div>
  );
}
/** Eintrag im Gespräch mit Mirelda (erscheint, sobald die Geschichte zu Ende erzählt ist). */
export function KreisOption({ npc }: { npc: string }) {
  const char = useStore(s => s.char);
  if (npc !== KREIS_NPC || !char || kreisBlock(char)) return null;
  return (
    <button type="button" class="opt opt-craft" onClick={() => { sfx('ui_click'); openEndgame('kreis', { npc }); }}>
      <i class="opt-mark">↻</i><span class="grow">Einen Neuen Kreis beginnen …</span>
    </button>
  );
}

// ------------------------------------------------------------------ HUD
/** Laufender Mana-Riss: Stufe, Uhr gegen die Richtzeit, Modifikatoren, Lebensfunken. */
export function RiftHud() {
  const r = useStore(s => s.rift);
  const at = useStore(s => s.riftAt);
  const clock = useRef<HTMLSpanElement>(null);
  useTick(now => {
    const el = clock.current, cur = store.state.rift;
    if (!el || !cur) return;
    const sec = cur.done ? cur.done.sec : cur.t + (now - store.state.riftAt) / 1000;
    const txt = fmtTime(sec);
    if (el.textContent !== txt) el.textContent = txt;
    const late = !cur.done && cur.par > 0 && sec > cur.par;
    if (el.classList.contains('late') !== late) el.classList.toggle('late', late);
  }, [r, at]);
  if (!r) return null;
  const trial = r.dungeon === TRIAL_ID;
  return (
    <div class={cx('rift-hud', r.done && 'done', r.failed && 'failed')}>
      <div class="rift-hud-top">
        <b>{trial ? TRIAL_NAME : `Riss · Stufe ${r.stufe}`}</b>
        {trial && r.trial && <span class="rift-step">{r.trial[0]} / {r.trial[1]}</span>}
        <span class="rift-clock"><span ref={clock}>{fmtTime(r.t)}</span>{r.par > 0 && <small> / {fmtTime(r.par)}</small>}</span>
      </div>
      {r.mods.length > 0 && <div class="rift-mods">{r.mods.map(id => <ModChip id={id} el={r.el} />)}</div>}
      <div class="rift-hud-foot">
        <span class="rift-sparks" title="Lebensfunken: so oft kann die Gruppe am Eingang wiederkehren">{Array.from({ length: Math.max(r.revives, 0) }, () => <i />)}{r.revives <= 0 && <em>kein Lebensfunke</em>}</span>
        {r.failed ? <span class="bad">Der Riss schließt sich</span>
          : r.done ? <span class="good">{trial ? 'Bestanden' : r.done.bonus ? 'Geschlossen – Bonustruhe!' : 'Geschlossen'}</span>
          : r.el ? <span style={{ color: ELEMENT_CSS[r.el] }}>{ELEMENT_NAME[r.el]}</span> : null}
      </div>
    </div>
  );
}
/** Knopf unter dem Spielerrahmen: öffnet das Endspiel-Fenster; zeigt freie Quellpunkte und den Kreis der Welt. */
export function EndgamePill() {
  const show = useStore(s => endgameOpen(s.char));
  const free = useStore(s => (s.char ? quellFree(s.char) : 0));
  const lvl = useStore(s => s.char?.quell?.lvl ?? 0);
  const kreis = useStore(s => s.kreis);
  if (!show) return null;
  return (
    <div class="points-row">
      <button type="button" class={cx('points-pill eg-pill', free > 0 && 'has')} onClick={() => { sfx('ui_click'); openEndgame(free > 0 ? 'quell' : 'risse'); }}
        {...tipProps(() => <div class="tip-text"><b>Endspiel</b>Mana-Risse, Quellstufen und Neuer Kreis.{kreis > 0 && <div class="tip-sub">Du stehst in der Welt des Kreises: {KREIS_NAME[kreis]}</div>}</div>)}>
        {free > 0 ? `＋${free} Quellpunkt${free > 1 ? 'e' : ''}` : `Quellstufe ${lvl}`}{kreis > 0 && <span class="eg-pill-k">{KREIS_NAME[kreis]}</span>}
      </button>
    </div>
  );
}

// ------------------------------------------------------------------ Schmiede: Angleichen
/** Echo-Fragmente heben Legendäre Waffen, Setteile und Boss-Unikate schrittweise auf die Stufe des höchsten abgeschlossenen Risses. */
export function Attune({ char, at }: { char: CharData; at: string }) {
  const [it, sel, setSel] = useGear(char, attunable);
  const cap = attuneCap(char);
  const plan = it ? attunePlan(char, it) : null;
  const why = it ? attuneBlock(char, it) : null;
  const have = char.inv.reduce((a, i) => a + (i.base === ECHO_FRAG ? i.qty ?? 1 : 0), 0);
  return (
    <div class="upg">
      <GearPicker char={char} sel={sel} onSel={setSel} filter={attunable} empty="Nichts Passendes angelegt." />
      <div class="upg-main card">
        {it ? (
          <>
            <ItemTitle it={it} sub={<><span style={{ color: RARITY_COLOR[it.rarity] }}>{RARITY_NAME[it.rarity]}</span> · Gegenstandsstufe {it.ilvl}{plan && <> → <b class="good">{plan.to}</b></>}</>} />
            <p class="note">Angleichen hebt die Gegenstandsstufe um bis zu {CFG.rift.attune.step} – Grundwerte und Eigenschaften wachsen mit, alles andere bleibt. Die Obergrenze ist die Beutestufe deines höchsten abgeschlossenen Risses{cap > 0 ? <> (derzeit <b>{cap}</b>)</> : null}.</p>
            {plan && <>
              <div class="sec-title">Kosten</div>
              <CostList cost={{ gold: plan.gold, mats: plan.mats }} char={char} />
            </>}
            <Btn kind="primary" class="block" disabled={!!why} onClick={() => send({ t: 'attune', uid: it.uid, at })} sound={null}>{why ?? `Angleichen auf Stufe ${plan?.to}`}</Btn>
          </>
        ) : <p class="note">Angleichen lassen sich Legendäre Waffen, Setteile und Boss-Unikate – Stücke, die man nicht einfach neu findet. Du hast {have} {ITEMS[ECHO_FRAG]?.name ?? 'Echo-Fragmente'}.</p>}
      </div>
    </div>
  );
}
