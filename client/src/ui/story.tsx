/**
 * Oberfläche der Story-Engine (ab 0.3): Filmszenen (Balken, Titelkarte, Textzeile), Chronik-Leser und die
 * Chronik-Ansicht im Questlog (Dokumente nach Kategorie, Hüter-Erinnerungen, Entscheidungen).
 */
import { useState } from 'preact/hooks';
import { DOCS, LORE_CATS, LORE_DOCS, loreProgress, type LoreDoc } from '../../../shared/src/data/chronik';
import { MEMORY_KEYS, condOk, countMemories } from '../../../shared/src/data/cond';
import { chapterOf } from '../../../shared/src/data/quests';
import { DECISIONS, LIED_PARTS, MEMORY_NAMES, chapterLabel } from '../../../shared/src/data/story';
import { ZONES } from '../../../shared/src/data/zones';
import type { CharData } from '../../../shared/src/types';
import { cinematic } from '../game/cinematic';
import { store, useStore } from '../state/store';
import { Btn, cx, sfx } from './common';
import './styles/story.css';

// ------------------------------------------------------------------ Filmszene
export function CineOverlay() {
  const c = useStore(s => s.cine);
  if (!c) return null;
  return (
    <div class={cx('cine', c.bars && 'bars')} role="dialog" aria-label="Filmszene">
      <div class="cine-bar top" /><div class="cine-bar bottom" />
      <div class="cine-fade" style={{ opacity: c.fade, transitionDuration: c.fadeMs + 'ms' }} />
      {c.title && (
        <div class="cine-title" key={c.title.s + (c.title.sub ?? '')}>
          <div class="logo-orn"><span /><i /><span /></div>
          <h1>{c.title.s}</h1>
          {c.title.sub && <h2>{c.title.sub}</h2>}
        </div>
      )}
      {c.line && (
        <div class={cx('cine-line', !c.line.who && 'narr')} key={c.line.s}>
          {c.line.who && <b class="cine-who">{c.line.who}</b>}
          <p>{c.line.s}</p>
          <Btn kind="primary" class="cine-next" autofocus onClick={() => cinematic.next()} sound={null}>Weiter</Btn>
        </div>
      )}
      <button type="button" class={cx('cine-skip', c.skipAsk && 'ask')} onClick={() => { sfx('ui_close'); cinematic.askSkip(); }}>{c.skipAsk ? 'Nochmal drücken: Szene überspringen' : 'Überspringen (Esc)'}</button>
    </div>
  );
}

// ------------------------------------------------------------------ Chronik-Dokument lesen
const LOOK_NAME: Record<LoreDoc['look'], string> = { book: 'Buch', tablet: 'Tafel', scroll: 'Schriftstück', stone: 'Fundstück' };
function DocText({ doc }: { doc: LoreDoc }) {
  return <div class="lore-text">{doc.text.split('\n').map(l => (l ? <p>{l}</p> : <div class="lore-gap" />))}</div>;
}
export function LoreOverlay() {
  const lore = useStore(s => s.lore);
  const doc = lore ? DOCS[lore.id] : null;
  if (!lore || !doc) return null;
  const close = () => { sfx('ui_close'); store.set({ lore: null }); };
  return (
    <div class="backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
      <div class={cx('sign', 'lore', 'lore-' + doc.look)} role="dialog" aria-label={doc.title}>
        <div class="lore-cat">{LOOK_NAME[doc.look]} · {LORE_CATS.find(c => c.id === doc.cat)?.name}{lore.first && <span class="pill gold-pill">Neu in der Chronik</span>}</div>
        <h2 class="lore-title">{doc.title}</h2>
        <div class="scroll lore-scroll"><DocText doc={doc} /></div>
        <Btn class="sign-btn" autofocus onClick={close} sound={null}>Schließen</Btn>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Chronik im Questlog
export function loreTotals(char: CharData) { return loreProgress(char); }

export function ChronikTab({ char }: { char: CharData }) {
  const [sel, setSel] = useState<string | null>(null);
  const doc = sel ? DOCS[sel] : null;
  const all = loreProgress(char);
  const mem = countMemories(char);
  const decided = Object.values(DECISIONS).filter(d => char.flags[`d:${d.id}`]);
  const showLied = !!char.quests.m_albtraum && !char.flags['d:ende'];
  return (
    <div class="qp chronik">
      <div class="qp-list scroll">
        <div class="chr-head">{chapterLabel(chapterOf(char))}</div>
        <div>
          <div class="sec-title">Hüter-Erinnerungen <span class="pill">{mem} / {MEMORY_KEYS.length}</span></div>
          <ul class="chr-mem">
            {MEMORY_KEYS.map(k => {
              const has = !!char.flags[`h:${k}`];
              return <li class={cx(has && 'on')}><i>{has ? '◆' : '◇'}</i><span>{has ? MEMORY_NAMES[k].guardian : '???'}</span><small>Sitz: {MEMORY_NAMES[k].seat}</small></li>;
            })}
          </ul>
        </div>
        {LORE_CATS.map(cat => {
          const p = loreProgress(char, cat.id);
          const docs = LORE_DOCS.filter(d => d.cat === cat.id);
          const missing = docs.filter(d => !char.flags[`l:${d.id}`] && !d.when);
          return (
            <div>
              <div class="sec-title">{cat.name} <span class="pill">{p.found} / {p.total}</span></div>
              {docs.filter(d => char.flags[`l:${d.id}`]).map(d => (
                <button type="button" class={cx('qp-item', sel === d.id && 'on')} onClick={() => { sfx('ui_click'); setSel(d.id); }}>
                  <span class="grow">{d.title}</span><small>{ZONES[d.zone]?.name}</small>
                </button>
              ))}
              {missing.length > 0 && <div class="note chr-missing">Noch nicht gefunden: {missing.length} ({[...new Set(missing.map(d => ZONES[d.zone]?.name ?? d.zone))].join(', ')})</div>}
            </div>
          );
        })}
      </div>
      <div class="qp-detail card scroll">
        {doc ? (
          <>
            <div class="qp-type">{LORE_CATS.find(c => c.id === doc.cat)?.name} · {ZONES[doc.zone]?.name}</div>
            <h3 class="qp-name">{doc.title}</h3>
            <DocText doc={doc} />
          </>
        ) : (
          <>
            <div class="qp-type">Chronik</div>
            <h3 class="qp-name">{all.found} von {all.total} Schriftstücken gefunden</h3>
            <p class="note">Überall in der Welt liegen Bücher, Tafeln, Schriftrollen und beschriftete Steine. Was du liest, steht danach hier – wähle links einen Eintrag, um ihn erneut zu lesen.</p>
            {decided.length > 0 && (
              <>
                <div class="sec-title">Deine Entscheidungen</div>
                <ul class="chr-dec">
                  {decided.map(d => {
                    const o = d.options.find(x => x.v === char.flags[`d:${d.id}`]);
                    return <li><b>{d.title}: {o?.label}</b><span>{o?.text}</span></li>;
                  })}
                </ul>
              </>
            )}
            {showLied && (
              <>
                <div class="sec-title">Was das Wasser noch nicht gehört hat</div>
                <ul class="objectives">
                  {LIED_PARTS.map(p => { const ok = condOk(char, p.if); return <li class={cx(ok && 'done')}><i>{ok ? '✓' : '○'}</i><span class="grow">{p.label}</span></li>; })}
                </ul>
                <p class="note">Manche Antworten gibt es nur für den, der zuerst zugehört hat.</p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
