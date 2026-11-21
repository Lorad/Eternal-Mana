/** Questlog mit aktiven und abgeschlossenen Quests. */
import { useState } from 'preact/hooks';
import { useStore } from '../../state/store';
import { ITEMS } from '../../../../shared/src/data/items';
import { NPCS } from '../../../../shared/src/data/npcs';
import { QUEST_LIST, objectiveProgress, objectiveTarget, questComplete } from '../../../../shared/src/data/quests';
import type { QuestDef } from '../../../../shared/src/data/quests';
import { ZONES } from '../../../../shared/src/data/zones';
import type { CharData } from '../../../../shared/src/types';
import { Btn, Confirm, Gold, Icon, Tabs, Window, closePanel, cx, fmtNum, send, sfx } from '../common';

export const QUEST_TYPE: Record<QuestDef['type'], string> = { main: 'Hauptquest', side: 'Nebenquest', repeat: 'Wiederholbar', group: 'Gruppe' };
const ORDER: QuestDef['type'][] = ['main', 'side', 'repeat', 'group'];

export function Rewards({ q }: { q: QuestDef }) {
  const r = q.rewards;
  return (
    <ul class="rewards">
      <li><i class="rw-xp">EP</i>{fmtNum(r.xp)} Erfahrung</li>
      {r.gold > 0 && <li><Gold n={r.gold} /> Gold</li>}
      {r.items?.map(([id, n]) => <li><Icon k={'item_' + (ITEMS[id]?.icon ?? 'scroll')} size={24} />{n > 1 ? `${n}× ` : ''}{ITEMS[id]?.name ?? id}</li>)}
      {r.gear !== undefined && <li><Icon k="item_armor_light" size={24} />Ausrüstung für deine Klasse{r.gear >= 2 ? ' (selten oder besser)' : ''}</li>}
      {r.skillPoints ? <li><i class="rw-xp">FP</i>{r.skillPoints} Fähigkeitspunkt{r.skillPoints > 1 ? 'e' : ''}</li> : null}
      {r.attrPoints ? <li><i class="rw-xp">AP</i>{r.attrPoints} Attributspunkt{r.attrPoints > 1 ? 'e' : ''}</li> : null}
    </ul>
  );
}
export function Objectives({ q, char }: { q: QuestDef; char: CharData }) {
  return (
    <ul class="objectives">
      {q.objectives.map((o, i) => {
        const p = objectiveProgress(char, q, i), t = objectiveTarget(o), done = p >= t;
        return <li class={cx(done && 'done')}><i>{done ? '✓' : '○'}</i><span class="grow">{o.label}</span>{t > 1 && <b>{Math.min(p, t)} / {t}</b>}</li>;
      })}
    </ul>
  );
}

export function QuestPanel() {
  const char = useStore(s => s.char);
  const [tab, setTab] = useState<'active' | 'done'>('active');
  const [selId, setSel] = useState<string | null>(null);
  const [abandon, setAbandon] = useState<QuestDef | null>(null);
  if (!char) return null;
  const active = QUEST_LIST.filter(q => char.quests[q.id]?.s === 'active');
  const done = QUEST_LIST.filter(q => char.quests[q.id]?.s === 'done');
  const list = tab === 'active' ? active : done;
  const sel = list.find(q => q.id === selId) ?? list[0] ?? null;
  const ready = sel && tab === 'active' && questComplete(char, sel);
  const times = sel ? char.quests[sel.id]?.n ?? 0 : 0;

  return (
    <Window title="Questlog" onClose={closePanel} class="win-quests"
      head={<Tabs tabs={[['active', 'Aktiv', active.length], ['done', 'Abgeschlossen', done.length]]} value={tab} onChange={t => { setTab(t); setSel(null); }} />}>
      <div class="qp">
        <div class="qp-list scroll">
          {list.length === 0 && <div class="note qp-none">{tab === 'active' ? 'Keine aktiven Quests. Sprich mit Leuten, über deren Kopf ein goldenes „!“ schwebt.' : 'Noch keine Quest abgeschlossen.'}</div>}
          {ORDER.map(type => {
            const qs = list.filter(q => q.type === type);
            if (!qs.length) return null;
            return (
              <div>
                <div class="sec-title">{QUEST_TYPE[type]}</div>
                {qs.map(q => {
                  const r = tab === 'active' && questComplete(char, q);
                  return (
                    <button type="button" class={cx('qp-item', sel?.id === q.id && 'on', r && 'ready', q.type)} onClick={() => { sfx('ui_click'); setSel(q.id); }}>
                      <span class="grow">{q.name}</span>
                      {r ? <span class="pill gold-pill">abgeben</span> : <small>St. {q.level}</small>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div class="qp-detail card scroll">
          {sel ? (
            <>
              <div class="qp-type">{QUEST_TYPE[sel.type]} · Stufe {sel.level} · {ZONES[sel.zone]?.name ?? sel.zone}</div>
              <h3 class="qp-name">{sel.name}</h3>
              <p class="qp-sum">{sel.summary}</p>
              {tab === 'active' && (
                <>
                  <div class="sec-title">Ziele</div>
                  <Objectives q={sel} char={char} />
                  {ready && <div class="qp-ready">Alle Ziele erfüllt – kehre zu <b>{NPCS[sel.turnIn ?? sel.giver]?.name}</b> zurück.</div>}
                </>
              )}
              {tab === 'done' && <div class="note">Abgeschlossen{times > 1 ? ` (${times}×)` : ''}.{(sel.type === 'repeat' || sel.type === 'group') ? ' Diese Quest kann erneut angenommen werden.' : ''}</div>}
              <div class="sec-title">Belohnung</div>
              <Rewards q={sel} />
              <div class="qp-meta note">
                Auftraggeber: <b>{NPCS[sel.giver]?.name ?? sel.giver}</b>{NPCS[sel.giver] ? `, ${NPCS[sel.giver].title}` : ''}
                {sel.turnIn && sel.turnIn !== sel.giver && <> · Abgabe bei <b>{NPCS[sel.turnIn]?.name ?? sel.turnIn}</b></>}
              </div>
              {tab === 'active' && sel.type !== 'main' && <div class="row end"><Btn kind="danger" onClick={() => setAbandon(sel)}>Aufgeben</Btn></div>}
              {tab === 'active' && sel.type === 'main' && <div class="note">Hauptquests können nicht aufgegeben werden.</div>}
            </>
          ) : <div class="note">Wähle links eine Quest aus.</div>}
        </div>
      </div>
      {abandon && (
        <Confirm danger yes="Quest aufgeben" onNo={() => setAbandon(null)} onYes={() => { send({ t: 'qAbandon', id: abandon.id }); setAbandon(null); setSel(null); }}
          text={<><b>{abandon.name}</b> wirklich aufgeben? Der bisherige Fortschritt geht verloren. Du kannst die Quest später erneut annehmen.</>} />
      )}
    </Window>
  );
}
