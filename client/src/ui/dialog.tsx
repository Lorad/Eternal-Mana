/** NPC-Gespräch: Begrüßung, Quests, Handel, Ausrüstung verbessern, Zurücksetzen. */
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { store, useStore } from '../state/store';
import { CFG, RARITY_COLOR } from '../../../shared/src/config';
import { ITEMS, TIER_MATERIAL, baseMods, isGear, itemName, itemPrice, sellPrice, tierOf } from '../../../shared/src/data/items';
import { NPCS, shopStock } from '../../../shared/src/data/npcs';
import { TOPIC, topicsOf } from '../../../shared/src/data/dialoge';
import { QUEST_LIST, condOk, questAvailable, questComplete, questText } from '../../../shared/src/data/quests';
import type { QuestDef } from '../../../shared/src/data/quests';
import { ZONES } from '../../../shared/src/data/zones';
import { MOD_LABEL, SLOTS } from '../../../shared/src/types';
import type { CharData, ItemInstance, ModKey } from '../../../shared/src/types';
import { Btn, Confirm, Gold, INV_SIZE, Icon, ItemSlot, Portrait, Tabs, cx, fmtNum, hideTip, modEntries, send, sfx } from './common';
import { StationOptions } from './craft';
import { KreisOption } from './endgame';
import { kreisLevel } from '../../../shared/src/data/rifts';
import { WorldOptions, worldGreeting } from './world';
import { shopDiscount, shopPrice } from '../../../shared/src/data/factions';
import { Objectives, QUEST_TYPE, Rewards } from './panels/quests';

type View =
  | { k: 'main' }
  | { k: 'quest'; id: string; mode: 'offer' | 'turnin' | 'progress'; page: number }
  | { k: 'shop' } | { k: 'upgrade' } | { k: 'respec' };

export function NpcDialog() {
  const npc = useStore(s => s.dialog?.npc ?? null);
  if (!npc || !NPCS[npc]) return null;
  return <Dialog key={npc} npc={npc} />;
}

function Stepper({ v, min = 1, max, onChange }: { v: number; min?: number; max: number; onChange: (n: number) => void }) {
  return (
    <span class="stepper">
      <button type="button" disabled={v <= min} aria-label="weniger" onClick={() => { sfx('ui_click'); onChange(Math.max(min, v - 1)); }}>−</button>
      <b>{v}</b>
      <button type="button" disabled={v >= max} aria-label="mehr" onClick={() => { sfx('ui_click'); onChange(Math.min(max, v + 1)); }}>+</button>
      <button type="button" class="stepper-max" disabled={v >= max} onClick={() => { sfx('ui_click'); onChange(max); }}>max</button>
    </span>
  );
}

function Dialog({ npc }: { npc: string }) {
  const def = NPCS[npc];
  const char = useStore(s => s.char);
  const zone = useStore(s => s.zone);
  const [view, setView] = useState<View>({ k: 'main' });
  const [greet] = useState(() => def.greet[Math.floor(Math.random() * def.greet.length)] ?? '…');
  // 0.6: Begrüßung nach Uhrzeit (wer schläft, antwortet mürrisch) und Ruf bei der Fraktion
  const [wg] = useState(() => (store.state.char ? worldGreeting(npc, store.state.char, store.state.zone, store.state.tod) : null));
  const dn = useStore(s => s.dlgNode);
  useEffect(() => { store.set({ dlgNode: null }); send({ t: 'talk', npc }); sfx('dialog_blip'); return () => hideTip(); }, []);
  if (!char) return null;
  const close = () => { sfx('ui_close'); store.set({ dialog: null, dlgNode: null }); };
  const main = () => setView({ k: 'main' });

  const turnIns = QUEST_LIST.filter(q => (q.turnIn ?? q.giver) === npc && questComplete(char, q));
  const offers = QUEST_LIST.filter(q => q.giver === npc && questAvailable(char, q));
  const running = QUEST_LIST.filter(q => char.quests[q.id]?.s === 'active' && ((q.turnIn ?? q.giver) === npc || q.giver === npc) && !questComplete(char, q));
  const line = wg?.sleep ? wg.text : def.talk?.find(t => condOk(char, t.if))?.text ?? wg?.text ?? greet;
  // Gesprächsthemen (Dialogbäume, ab 0.3): Der Server bestätigt jeden Knoten; `dn` ist der aktuell gültige.
  const topics = topicsOf(npc).filter(t => condOk(char, t.if));
  const talking = dn && dn.npc === npc && TOPIC[dn.topic]?.nodes[dn.node] ? dn : null;
  const wide = view.k === 'shop' || view.k === 'upgrade';

  let body: ComponentChildren;
  if (talking) {
    body = <TopicTalk key={talking.topic + talking.node + talking.seq} npc={npc} topic={talking.topic} node={talking.node} char={char} />;
  } else if (view.k === 'main') {
    body = (
      <>
        <Speech>{line}</Speech>
        <div class="dlg-options">
          {turnIns.map(q => <Opt mark="?" kind="turnin" onClick={() => setView({ k: 'quest', id: q.id, mode: 'turnin', page: 0 })}>{q.name} <small>abschließen</small></Opt>)}
          {offers.map(q => {
            const low = char.level < q.level - 3;
            return <Opt mark="!" kind="offer" disabled={low} onClick={() => setView({ k: 'quest', id: q.id, mode: 'offer', page: 0 })}>{q.name} <small>{low ? `Empfohlen ab Stufe ${q.level - 3}` : `${QUEST_TYPE[q.type]} · Stufe ${q.level}`}</small></Opt>;
          })}
          {running.map(q => <Opt mark="…" kind="progress" onClick={() => setView({ k: 'quest', id: q.id, mode: 'progress', page: 0 })}>{q.name} <small>läuft</small></Opt>)}
          {topics.map(t => { const hot = !!t.hot && condOk(char, t.hot); return <Opt mark={hot ? '!' : '❝'} kind={hot ? 'offer' : undefined} onClick={() => send({ t: 'dlgOpen', npc, topic: t.id })}>{t.label}</Opt>; })}
          {def.shop && <Opt mark="◈" onClick={() => setView({ k: 'shop' })}>Handeln</Opt>}
          {def.services?.includes('upgrade') && <Opt mark="⚒" onClick={() => setView({ k: 'upgrade' })}>Ausrüstung verbessern</Opt>}
          {def.services?.includes('respec') && <Opt mark="↺" onClick={() => setView({ k: 'respec' })}>Fähigkeiten und Attribute zurücksetzen</Opt>}
          <StationOptions npc={npc} />
          <KreisOption npc={npc} />
          <WorldOptions npc={npc} />
          <Opt mark="×" kind="bye" onClick={close} autofocus={!turnIns.length && !offers.length && !topics.length}>Auf Wiedersehen</Opt>
        </div>
      </>
    );
  } else if (view.k === 'quest') {
    body = <QuestTalk key={view.id + view.mode} q={QUEST_LIST.find(q => q.id === view.id)!} mode={view.mode} npc={npc} char={char} back={main} />;
  } else if (view.k === 'shop') {
    body = <Shop npc={npc} char={char} zone={zone} zoneLevel={kreisLevel(ZONES[zone]?.level[0] ?? 1, store.state.kreis) + 1} back={main} />;
  } else if (view.k === 'upgrade') {
    body = <Upgrade npc={npc} char={char} back={main} />;
  } else {
    body = <Respec npc={npc} char={char} back={main} />;
  }

  return (
    <div class={cx('backdrop', 'dlg-backdrop', wide && 'dlg-center')} onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
      <section class={cx('window', 'dlg', wide && 'dlg-wide')} role="dialog" aria-label={`Gespräch mit ${def.name}`}>
        <header class="dlg-head">
          <div class="dlg-portrait"><Portrait k={'npc_' + def.look} scale={wide ? 2 : 3} /></div>
          <div class="grow">
            <h2>{def.name}</h2>
            <div class="dlg-title">{def.title}</div>
          </div>
          {wide && <span class="dlg-gold">Dein Gold <Gold n={char.gold} /></span>}
          <button type="button" class="window-x" aria-label="Schließen" title="Schließen" onClick={close}>✕</button>
        </header>
        <div class="dlg-body">{body}</div>
      </section>
    </div>
  );
}

function Speech({ children }: { children: ComponentChildren }) {
  return <div class="speech"><p>{children}</p></div>;
}
function Opt(p: { mark: string; kind?: string; onClick: () => void; children: ComponentChildren; disabled?: boolean; autofocus?: boolean }) {
  return (
    <button type="button" class={cx('opt', p.kind && 'opt-' + p.kind)} disabled={p.disabled} ref={el => { if (el && p.autofocus && !el.dataset.f) { el.dataset.f = '1'; el.focus({ preventScroll: true }); } }}
      onClick={() => { sfx('ui_click'); p.onClick(); }}>
      <i class="opt-mark">{p.mark}</i><span class="grow">{p.children}</span>
    </button>
  );
}

// ------------------------------------------------------------------ Gesprächsthema (Dialogbaum, ab 0.3)
function TopicTalk({ npc, topic, node, char }: { npc: string; topic: string; node: string; char: CharData }) {
  const t = TOPIC[topic], n = t.nodes[node];
  const [page, setPage] = useState(0);
  const last = page >= n.lines.length - 1;
  const who = n.who ?? NPCS[npc].name;
  const opts = (n.opts ?? []).map((o, i) => ({ o, i })).filter(x => condOk(char, x.o.if));
  const end = () => store.set({ dlgNode: null });
  return (
    <>
      <div class="dlg-qhead"><span class="opt-mark">❝</span><b class="dlg-topic">{t.label}</b>{n.lines.length > 1 && <span class="dlg-page">{page + 1} / {n.lines.length}</span>}</div>
      <div class={cx('speech', !who && 'narr')}><p><span key={page} class="speech-line">{n.lines[Math.min(page, n.lines.length - 1)]}</span></p></div>
      {!last && <div class="row end dlg-actions"><Btn kind="primary" autofocus onClick={() => { sfx('dialog_blip'); setPage(p => p + 1); }} sound={null}>Weiter</Btn></div>}
      {last && (
        <div class="dlg-options">
          {opts.map(({ o, i }, k) => <Opt mark={o.fx?.decide ? '!' : o.to ? '›' : '×'} kind={o.fx?.decide ? 'offer' : !o.to && !o.fx ? 'bye' : undefined} autofocus={k === 0} onClick={() => send({ t: 'dlgPick', npc, topic, node, opt: i })}>{o.s}</Opt>)}
          {opts.length === 0 && <Opt mark="×" kind="bye" autofocus onClick={end}>Zurück</Opt>}
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------------ Quests im Gespräch
function QuestTalk({ q, mode, npc, char, back }: { q: QuestDef; mode: 'offer' | 'turnin' | 'progress'; npc: string; char: CharData; back: () => void }) {
  const txt = questText(char, q);
  const lines = mode === 'offer' ? txt.offer : mode === 'turnin' ? txt.done : [txt.progress];
  const [page, setPage] = useState(0);
  const last = page >= lines.length - 1;
  const next = () => { sfx('dialog_blip'); setPage(p => p + 1); };
  // Falls sich der Zustand inzwischen geändert hat (z. B. Quest abgegeben), zurück zur Übersicht
  const stillValid = mode === 'offer' ? questAvailable(char, q) : mode === 'turnin' ? questComplete(char, q) : char.quests[q.id]?.s === 'active';
  useEffect(() => { if (!stillValid) back(); }, [stillValid]);
  return (
    <>
      <div class="dlg-qhead"><span class={cx('opt-mark', mode === 'progress' && 'grey')}>{mode === 'offer' ? '!' : '?'}</span><b>{q.name}</b><small>{QUEST_TYPE[q.type]} · Stufe {q.level}</small>{lines.length > 1 && <span class="dlg-page">{page + 1} / {lines.length}</span>}</div>
      <Speech><span key={page} class="speech-line">{lines[Math.min(page, lines.length - 1)]}</span></Speech>
      {last && (
        <div class="dlg-qinfo">
          {mode === 'offer' && <p class="qp-sum">{q.summary}</p>}
          {mode !== 'turnin' && <div><div class="sec-title">Ziele</div><Objectives q={q} char={char} /></div>}
          <div><div class="sec-title">Belohnung</div><Rewards q={q} char={char} /></div>
        </div>
      )}
      <div class="row end dlg-actions">
        {!last && <Btn kind="ghost" onClick={() => setPage(lines.length - 1)}>Überspringen</Btn>}
        {!last && <Btn kind="primary" autofocus onClick={next} sound={null}>Weiter</Btn>}
        {last && mode === 'offer' && <><Btn onClick={back}>Später</Btn><Btn kind="primary" onClick={() => { send({ t: 'qAccept', id: q.id, npc }); back(); }} sound={null}>Annehmen</Btn></>}
        {last && mode === 'turnin' && <><Btn onClick={back}>Zurück</Btn><Btn kind="primary" onClick={() => { send({ t: 'qTurnIn', id: q.id, npc }); back(); }} sound={null}>Abschließen</Btn></>}
        {last && mode === 'progress' && <Btn onClick={back}>Zurück</Btn>}
      </div>
    </>
  );
}

// ------------------------------------------------------------------ Handel
function Shop({ npc, char, zone, zoneLevel, back }: { npc: string; char: CharData; zone: string; zoneLevel: number; back: () => void }) {
  const disc = shopDiscount(char, zone);
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [qty, setQty] = useState<Record<number, number>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [sellQty, setSellQty] = useState(1);
  const stock = shopStock(npc, char.cls, zoneLevel);
  const full = char.inv.length >= INV_SIZE;
  const item = char.inv.find(i => i.uid === sel) ?? null;
  const stack = item?.qty ?? 1;
  useEffect(() => { setSellQty(stack); }, [sel]);
  const sellable = (it: ItemInstance) => ITEMS[it.base]?.kind !== 'quest';
  const sell = (it: ItemInstance, n: number) => { if (!sellable(it)) { sfx('ui_error'); return; } send({ t: 'sell', uid: it.uid, qty: n }); if (n >= (it.qty ?? 1)) setSel(null); };
  const cells: (ItemInstance | null)[] = [...char.inv];
  while (cells.length < INV_SIZE) cells.push(null);
  const n = Math.min(sellQty, stack);
  return (
    <div class="shop">
      <div class="row between wrap">
        <Tabs tabs={[['buy', 'Kaufen'], ['sell', 'Verkaufen']]} value={tab} onChange={setTab} />
        <span class="note">{disc > 0 && <>Nachlass durch deinen Ruf: <b class="good">{Math.round(disc * 100)} %</b> · </>}Rucksack: <b class={cx(full && 'bad')}>{char.inv.length} / {INV_SIZE}</b></span>
      </div>
      {tab === 'buy' ? (
        <ul class="shop-list scroll">
          {stock.map((e, idx) => {
            const b = ITEMS[e.item.base];
            if (!b) return null;
            const price = shopPrice(char, zone, e.item), q = b.stack ? qty[idx] ?? 1 : 1, total = price * q;
            const afford = char.gold >= total;
            return (
              <li class="shop-row">
                <ItemSlot item={e.item} char={char} price={price} size="sm" />
                <div class="grow shop-name"><b style={{ color: RARITY_COLOR[e.item.rarity] }}>{itemName(e.item)}</b><small>{b.desc ?? (isGear(b) ? `Gegenstandsstufe ${e.item.ilvl}` : '')}</small></div>
                {b.stack && <Stepper v={q} max={20} onChange={v => setQty({ ...qty, [idx]: v })} />}
                <span class={cx('shop-price', !afford && 'bad')}><Gold n={total} /></span>
                <Btn kind="primary" disabled={!afford} title={!afford ? 'Nicht genug Gold' : undefined} onClick={() => send({ t: 'buy', npc, idx, qty: q })} sound={null}>Kaufen</Btn>
              </li>
            );
          })}
          {stock.length === 0 && <li class="note">Heute gibt es nichts zu kaufen.</li>}
        </ul>
      ) : (
        <div class="shop-sell">
          <div class="inv-grid sm">
            {cells.map((it, i) => (
              <ItemSlot key={it ? it.uid : 'e' + i} item={it} char={char} size="sm" selected={!!it && it.uid === sel} dim={!!it && !sellable(it)}
                onClick={it ? () => setSel(it.uid) : undefined} onAlt={() => it && sell(it, it.qty ?? 1)} />
            ))}
          </div>
          <div class="card sell-box">
            {item ? (
              sellable(item) ? (
                <>
                  <div><b style={{ color: RARITY_COLOR[item.rarity] }}>{itemName(item)}</b><div class="note">Stückpreis: <Gold n={sellPrice(item)} /></div></div>
                  {stack > 1 && <Stepper v={n} max={stack} onChange={setSellQty} />}
                  <Btn kind="primary" onClick={() => sell(item, n)} sound={null}>Verkaufen für {fmtNum(sellPrice(item) * n)} Gold</Btn>
                </>
              ) : <div class="note"><b>{itemName(item)}</b> ist ein Questgegenstand und kann nicht verkauft werden.</div>
            ) : <div class="note">Wähle einen Gegenstand aus deinem Rucksack. Doppelklick oder Rechtsklick verkauft den ganzen Stapel sofort. Händler zahlen {Math.round(CFG.loot.sellFactor * 100)} % des Wertes.</div>}
          </div>
        </div>
      )}
      <div class="row dlg-actions"><Btn onClick={back}>← Zurück</Btn></div>
    </div>
  );
}

// ------------------------------------------------------------------ Verbessern
function Upgrade({ npc, char, back }: { npc: string; char: CharData; back: () => void }) {
  const equipped = SLOTS.map(s => char.equip[s]).filter(Boolean) as ItemInstance[];
  const bag = char.inv.filter(i => ITEMS[i.base] && isGear(ITEMS[i.base]));
  const all = [...equipped, ...bag];
  const [sel, setSel] = useState<string | null>(equipped[0]?.uid ?? bag[0]?.uid ?? null);
  const it = all.find(i => i.uid === sel) ?? null;
  const maxed = !!it && it.up >= CFG.upgrade.max;
  const gold = it ? CFG.upgrade.gold(it.ilvl, it.up) : 0;
  const matId = it ? TIER_MATERIAL[tierOf(it.ilvl) - 1] : '';
  const mat = ITEMS[matId];
  const need = it ? CFG.upgrade.mats(it.up) : 0;
  const have = char.inv.reduce((a, i) => a + (i.base === matId ? i.qty ?? 1 : 0), 0);
  const chance = it && !maxed ? CFG.upgrade.chance[it.up] ?? 0 : 0;
  const cur = it ? baseMods(it) : {};
  const nxt = it && !maxed ? baseMods({ ...it, up: it.up + 1 }) : {};
  const ok = !!it && !maxed && char.gold >= gold && have >= need;
  return (
    <div class="upg">
      <div class="upg-pick">
        <div class="sec-title">Angelegt</div>
        <div class="upg-grid">{equipped.length ? equipped.map(i => <ItemSlot key={i.uid} item={i} char={char} equipped size="sm" selected={i.uid === sel} onClick={() => setSel(i.uid)} />) : <span class="note">Nichts angelegt.</span>}</div>
        <div class="sec-title">Im Rucksack</div>
        <div class="upg-grid scroll">{bag.length ? bag.map(i => <ItemSlot key={i.uid} item={i} char={char} size="sm" selected={i.uid === sel} onClick={() => setSel(i.uid)} />) : <span class="note">Keine weitere Ausrüstung.</span>}</div>
      </div>
      <div class="upg-main card">
        {it ? (
          <>
            <div class="upg-title">
              <span class={cx('slot slot-static', 'r' + it.rarity)}><Icon k={'item_' + ITEMS[it.base].icon} /></span>
              <div>
                <b style={{ color: RARITY_COLOR[it.rarity] }}>{itemName(it)}</b>
                <div class="upg-arrow">{maxed ? 'Höchste Verbesserungsstufe erreicht' : <>+{it.up} <i>➜</i> <b>+{it.up + 1}</b></>}</div>
              </div>
            </div>
            {!maxed && (
              <>
                <ul class="upg-stats">
                  {modEntries(cur).map(([k, v]) => <li><span>{MOD_LABEL[k as ModKey]}</span><span>{v}</span><i>➜</i><b class="good">{(nxt as any)[k] ?? v}</b></li>)}
                </ul>
                <ul class="upg-cost">
                  <li class={cx(char.gold < gold && 'bad')}><span>Kosten</span><Gold n={gold} /></li>
                  <li class={cx(have < need && 'bad')}><span>Material</span><span class="row"><Icon k={'item_' + (mat?.icon ?? 'mat_wood')} size={24} />{need}× {mat?.name ?? matId} <small>(du hast {have})</small></span></li>
                  <li><span>Erfolgschance</span><b class={chance >= 0.9 ? 'good' : chance >= 0.6 ? 'warn' : 'bad'}>{Math.round(chance * 100)} %</b></li>
                </ul>
                <p class="note">Misslingt der Versuch, sind nur Gold und Material verloren – der Gegenstand bleibt unversehrt.</p>
                <Btn kind="primary" class="block" disabled={!ok} onClick={() => send({ t: 'upgrade', uid: it.uid, npc })} sound={null}>
                  {char.gold < gold ? 'Nicht genug Gold' : have < need ? 'Material fehlt' : 'Verbessern'}
                </Btn>
              </>
            )}
            {maxed && <p class="note">Mehr geht nicht. Selbst der beste Schmied hat Grenzen.</p>}
          </>
        ) : <p class="note">Wähle links ein Ausrüstungsteil aus.</p>}
      </div>
      <div class="row dlg-actions upg-back"><Btn onClick={back}>← Zurück</Btn></div>
    </div>
  );
}

// ------------------------------------------------------------------ Zurücksetzen
function Respec({ npc, char, back }: { npc: string; char: CharData; back: () => void }) {
  const [ask, setAsk] = useState(false);
  const cost = CFG.respecGold(char.level);
  const ok = char.gold >= cost;
  return (
    <>
      <Speech>Ich kann entwirren, was du gelernt hast – jede Fähigkeit, jedes Attribut. Du bekommst alle Punkte zurück und verteilst sie neu. Meine Notizen dazu sind allerdings nicht billig.</Speech>
      <ul class="upg-cost respec">
        <li class={cx(!ok && 'bad')}><span>Kosten</span><Gold n={cost} /></li>
        <li><span>Dein Gold</span><Gold n={char.gold} /></li>
      </ul>
      <p class="note">Alle Fähigkeitspunkte und alle verteilten Attributspunkte werden zurückerstattet. Deine Startfähigkeit bleibt gelernt; die Aktionsleiste wird geleert.</p>
      <div class="row end dlg-actions">
        <Btn onClick={back}>Zurück</Btn>
        <Btn kind="primary" disabled={!ok} onClick={() => setAsk(true)}>{ok ? 'Zurücksetzen' : 'Nicht genug Gold'}</Btn>
      </div>
      {ask && <Confirm yes={`Für ${fmtNum(cost)} Gold zurücksetzen`} onNo={() => setAsk(false)} onYes={() => { send({ t: 'respec', npc }); setAsk(false); back(); }}
        text="Wirklich alle Fähigkeiten und Attribute zurücksetzen?" />}
    </>
  );
}
