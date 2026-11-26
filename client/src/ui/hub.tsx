/**
 * Quellwarte (0.9): die Fenster der Einrichtungen – Ausrüstungshändler, Meisterränge, Lagerhaus, Gerüchtebrett,
 * Gruppenbereich, Trophäenhalle, Übersicht – und die Einträge im Gespräch mit ihren Hütern. Regeln, Zahlen und Texte kommen
 * aus shared/src/data/{hubdata,rumours,hall}.ts; der Server prüft jede Aktion selbst (server/src/hub), hier wird nur
 * angezeigt, was geht und warum etwas nicht geht.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { store, useStore } from '../state/store';
import { CFG, RARITY_COLOR } from '../../../shared/src/config';
import { CLASSES } from '../../../shared/src/data/classes';
import { stashSlots } from '../../../shared/src/data/collection';
import { emptyHome } from '../../../shared/src/data/home';
import { fmtTime, hallData } from '../../../shared/src/data/hall';
import { DIFFICULTIES, DIFFICULTY_NAME, HUB_ZONE } from '../../../shared/src/data/hub';
import { EXPEDITION_LIST, fmtSec } from '../../../shared/src/data/expeditions';
import { FACILITIES, FACILITY_OF_NPC, FACILITY_ORDER, LFG_GOAL, LFG_GOALS, effRank, hubPeriod, lagerRows, masterable, masteredSkills, masteryBlock, masteryCost, masteryOf, rowBlock, rowPrice } from '../../../shared/src/data/hubdata';
import { ITEMS, itemName, sellPrice } from '../../../shared/src/data/items';
import { RUMOUR_KIND_NAME, boardRumours, rumourZone } from '../../../shared/src/data/rumours';
import { SKILL_LIST } from '../../../shared/src/data/skills';
import { ZONES } from '../../../shared/src/data/zones';
import type { CharData, ItemInstance } from '../../../shared/src/types';
import { Btn, Confirm, Gold, INV_SIZE, Icon, ItemSlot, Tabs, TextInput, Window, closePanel, cx, fmtNum, send, sfx } from './common';
import { ZoneMapCanvas } from './mapview';

/** Öffnet ein Fenster der Quellwarte (aus dem Gespräch oder vom Server nach einer Interaktion) */
export function openHub(tab: string) {
  if (tab === 'truhe') { store.set({ hof: { tab: 'lager' }, hubWin: null, dialog: null, panel: null, prompt: null }); return; }
  store.set({ hubWin: { tab: tab === 'vitrine' ? 'halle' : tab }, dialog: null, panel: null, prompt: null, craft: null, hof: null });
}
const TITLE: Record<string, string> = {
  haendler: 'Ottmars Ausrüstung', meister: 'Meisterränge', lager: 'Lagerhaus', geruechte: 'Gerüchtebrett', gesuche: 'Gruppenbereich', halle: 'Trophäenhalle', karte: 'Die Quellwarte',
};
const fmtLeft = (sec: number) => (sec >= 86400 ? `${Math.floor(sec / 86400)} T. ${Math.floor((sec % 86400) / 3600)} Std.` : sec >= 3600 ? `${Math.floor(sec / 3600)} Std. ${Math.floor((sec % 3600) / 60)} Min.` : `${Math.max(1, Math.floor(sec / 60))} Min.`);
const H = ({ children }: { children: ComponentChildren }) => <div class="sec-title">{children}</div>;

export function HubWindow() {
  const win = useStore(s => s.hubWin);
  const char = useStore(s => s.char);
  if (!win || !char) return null;
  const close = () => store.set({ hubWin: null });
  const t = win.tab;
  return (
    <Window title={TITLE[t] ?? 'Quellwarte'} onClose={close} class={cx('win-hub', 'win-hub-' + t)}>
      {t === 'haendler' ? <Trader char={char} />
        : t === 'meister' ? <Mastery char={char} />
        : t === 'lager' ? <Lagerhaus char={char} />
        : t === 'geruechte' ? <Rumours char={char} />
        : t === 'gesuche' ? <Groups char={char} />
        : t === 'halle' ? <Hall char={char} />
        : <Overview />}
    </Window>
  );
}

// ------------------------------------------------------------------ Gespräch mit den Hütern
function Opt({ mark, children, onClick }: { mark: string; children: ComponentChildren; onClick: () => void }) {
  return <button type="button" class="opt opt-craft" onClick={() => { sfx('ui_click'); onClick(); }}><i class="opt-mark">{mark}</i><span class="grow">{children}</span></button>;
}
/** Einträge im NPC-Gespräch der Hüter der Quellwarte (die Stationen und Dienste kommen wie überall aus StationOptions/services). */
export function HubOptions({ npc }: { npc: string }) {
  const zone = useStore(s => s.zone);
  const fac = FACILITY_OF_NPC[npc];
  if (!fac || ZONES[zone]?.kind !== 'hub') return null;
  switch (fac) {
    case 'haendler': return <Opt mark="◈" onClick={() => { send({ t: 'hub', a: 'stock' }); openHub('haendler'); }}>Ware des Tages ansehen</Opt>;
    case 'meister': return <><Opt mark="✧" onClick={() => openHub('meister')}>Meisterränge lernen</Opt><Opt mark="❖" onClick={() => store.set({ dialog: null, panel: 'skills' })}>Fähigkeiten ansehen und verteilen</Opt></>;
    case 'lager': return <><Opt mark="▤" onClick={() => openHub('truhe')}>Truhe öffnen</Opt><Opt mark="▦" onClick={() => openHub('lager')}>Mehr Platz kaufen</Opt></>;
    case 'gasthaus': return <><Opt mark="✎" onClick={() => openHub('geruechte')}>Gerüchtebrett lesen</Opt><Opt mark="⌂" onClick={() => openHub('karte')}>Was gibt es hier alles?</Opt></>;
    case 'halle': return <Opt mark="♛" onClick={() => { send({ t: 'hub', a: 'halle' }); openHub('halle'); }}>Durch die Trophäenhalle gehen</Opt>;
    case 'gruppe': return <Opt mark="⚑" onClick={() => { send({ t: 'hub', a: 'board' }); openHub('gesuche'); }}>Gruppenbereich: Leute finden</Opt>;
  }
  return null;
}

// ------------------------------------------------------------------ Ausrüstungshändler
function Trader({ char }: { char: CharData }) {
  const stock = useStore(s => s.hubStock);
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => { send({ t: 'hub', a: 'stock' }); }, [char.level]);
  const full = char.inv.length >= INV_SIZE;
  const item = char.inv.find(i => i.uid === sel) ?? null;
  const cells: (ItemInstance | null)[] = [...char.inv];
  while (cells.length < INV_SIZE) cells.push(null);
  const sellable = (it: ItemInstance) => ITEMS[it.base]?.kind !== 'quest';
  const daily = stock?.offers.filter(o => !o.weekly) ?? [], weekly = stock?.offers.find(o => o.weekly);
  const row = (o: NonNullable<typeof stock>['offers'][number], idx: number) => {
    const afford = char.gold >= o.price;
    return (
      <li class={cx('shop-row', o.got && 'got', o.weekly && 'weekly')}>
        <ItemSlot item={o.item} char={char} price={o.price} size="sm" dim={!!o.got} />
        <div class="grow shop-name"><b style={{ color: RARITY_COLOR[o.item.rarity] }}>{itemName(o.item)}</b><small>{o.weekly ? 'Stück der Woche · ' : ''}Gegenstandsstufe {o.item.ilvl}</small></div>
        <span class={cx('shop-price', !afford && !o.got && 'bad')}><Gold n={o.price} /></span>
        <Btn kind="primary" disabled={!!o.got || !afford || full} title={o.got ? 'Schon gekauft' : !afford ? 'Nicht genug Gold' : full ? 'Inventar voll' : undefined}
          onClick={() => send({ t: 'hub', a: 'buy', idx, day: stock!.day, lvl: stock!.lvl })} sound={null}>{o.got ? 'Verkauft' : 'Kaufen'}</Btn>
      </li>
    );
  };
  return (
    <div class="shop hub-shop">
      <div class="row between wrap">
        <Tabs tabs={[['buy', 'Kaufen'], ['sell', 'Verkaufen']]} value={tab} onChange={setTab} />
        <span class="note">Dein Gold <Gold n={char.gold} /> · Rucksack <b class={cx(full && 'bad')}>{char.inv.length} / {INV_SIZE}</b></span>
      </div>
      {tab === 'buy' ? (
        stock ? (
          <ul class="shop-list scroll">
            <li class="hub-sub">Tagesware für {CLASSES[char.cls].name}, Stufe {stock.lvl} <small>· neue Ware in {fmtLeft(stock.next)}</small></li>
            {daily.map((o, i) => row(o, i))}
            {weekly && <li class="hub-sub">Stück der Woche <small>· wechselt in {fmtLeft(stock.nextWeek)}</small></li>}
            {weekly && row(weekly, stock.offers.indexOf(weekly))}
          </ul>
        ) : <p class="note">Ottmar kramt im Regal …</p>
      ) : (
        <div class="shop-sell">
          <div class="inv-grid sm">
            {cells.map((it, i) => <ItemSlot key={it ? it.uid : 'e' + i} item={it} char={char} size="sm" selected={!!it && it.uid === sel} dim={!!it && !sellable(it)} onClick={it ? () => setSel(it.uid) : undefined}
              onAlt={() => { if (it && sellable(it)) { send({ t: 'sell', uid: it.uid, qty: it.qty ?? 1 }); setSel(null); } }} />)}
          </div>
          <div class="card sell-box">
            {item && sellable(item) ? (
              <>
                <div><b style={{ color: RARITY_COLOR[item.rarity] }}>{itemName(item)}</b>{(item.qty ?? 1) > 1 && <> ×{item.qty}</>}<div class="note">Stückpreis: <Gold n={sellPrice(item)} /></div></div>
                <Btn kind="primary" onClick={() => { send({ t: 'sell', uid: item.uid, qty: item.qty ?? 1 }); setSel(null); }} sound={null}>Verkaufen für {fmtNum(sellPrice(item) * (item.qty ?? 1))} Gold</Btn>
              </>
            ) : <div class="note">Gegenstand wählen – Doppelklick verkauft sofort. Ottmar zahlt {Math.round(CFG.loot.sellFactor * 100)} % des Wertes und behauptet, das sei großzügig.</div>}
          </div>
        </div>
      )}
      <p class="note">Jedes Stück gibt es für jeden Charakter einmal. Die Ware richtet sich nach Klasse und Stufe – wer aufsteigt, findet am selben Tag schon Besseres.</p>
    </div>
  );
}

// ------------------------------------------------------------------ Meisterränge
function Mastery({ char }: { char: CharData }) {
  const [ask, setAsk] = useState<string | null>(null);
  const M = CFG.hub.mastery, list = SKILL_LIST.filter(s => s.cls === char.cls && masterable(s));
  const used = masteredSkills(char).length;
  return (
    <div class="hub-master">
      <p class="note">Eine voll ausgebaute Technik lässt sich um bis zu {M.max} Meisterränge steigern – sie wirken wie gewöhnliche Ränge, solange die Technik voll gelernt ist. Höchstens {M.skills} Techniken zugleich (du: {used}). Rang 1 ab Stufe {M.ranks[0].level}, Rang 2 ab Stufe {M.ranks[1].level}. Zurücksetzen nimmt sie nicht weg.</p>
      <ul class="hub-list scroll">
        {list.map(s => {
          const r = char.skills[s.id] ?? 0, m = masteryOf(char, s.id), why = masteryBlock(char, s.id), next = Math.min(M.max, m + 1), cost = masteryCost(s, next);
          return (
            <li class={cx('hub-skill', m > 0 && 'mastered')}>
              <div class="grow">
                <b>{s.name}</b> <span class="pill">Rang {r}/{s.maxRank}{m > 0 && <> · Meister {m}</>}</span>
                <div class="note">{m > 0 ? `Wirkt wie Rang ${effRank(char, s.id)}.` : r < s.maxRank ? 'Noch nicht ausgebaut.' : 'Ausgebaut – bereit für den nächsten Schritt.'}</div>
                {m < M.max && <div class="note">Meisterrang {next}: <Gold n={cost.gold} /> · {cost.mats.map(([b, n]) => `${n}× ${ITEMS[b]?.name ?? b}`).join(', ')}</div>}
                {why && m < M.max && <div class="note bad">{why}</div>}
              </div>
              <Btn kind="primary" disabled={!!why} onClick={() => setAsk(s.id)}>{m >= M.max ? 'Gemeistert' : 'Lernen'}</Btn>
            </li>
          );
        })}
      </ul>
      <div class="row end"><Btn onClick={() => store.set({ hubWin: null, panel: 'skills' })}>Fähigkeiten-Fenster</Btn></div>
      {ask && <Confirm yes="Lernen" onNo={() => setAsk(null)} onYes={() => { send({ t: 'hub', a: 'master', id: ask }); setAsk(null); }}
        text={`${SKILL_LIST.find(s => s.id === ask)?.name}: Meisterrang ${masteryOf(char, ask) + 1} lernen? Gold und Rohstoffe sind danach fort.`} />}
    </div>
  );
}

// ------------------------------------------------------------------ Lagerhaus
function Lagerhaus({ char }: { char: CharData }) {
  const home = useStore(s => s.home) ?? emptyHome();
  const [ask, setAsk] = useState(false);
  const rows = lagerRows(home), why = rowBlock(char, home), L = CFG.hub.lager;
  return (
    <div class="hub-lager">
      <p>Fridolins Lagerhaus führt dieselbe Truhe wie dein Hof: Was hier liegt, erreicht jeder Charakter deines Profils – auch ohne Hof.</p>
      <ul class="upg-cost">
        <li><span>Plätze in der Truhe</span><b>{home.stash.length} / {stashSlots(home)}</b></li>
        <li><span>Gekaufte Regale</span><b>{rows} / {L.rowsMax}</b></li>
        {rows < L.rowsMax && <li class={cx(char.gold < rowPrice(home) && 'bad')}><span>Nächstes Regal (+{L.row} Plätze)</span><Gold n={rowPrice(home)} /></li>}
      </ul>
      {why && <p class="note bad">{why}</p>}
      <div class="row end">
        <Btn onClick={() => openHub('truhe')}>Truhe öffnen</Btn>
        <Btn kind="primary" disabled={!!why} onClick={() => setAsk(true)}>Regal kaufen</Btn>
      </div>
      {ask && <Confirm yes={`Für ${fmtNum(rowPrice(home))} Gold kaufen`} onNo={() => setAsk(false)} onYes={() => { send({ t: 'hub', a: 'row' }); setAsk(false); }} text={`Ein Regal mit ${L.row} Plätzen für die Truhe deines Profils kaufen?`} />}
    </div>
  );
}

// ------------------------------------------------------------------ Gerüchtebrett
function Rumours({ char }: { char: CharData }) {
  const per = hubPeriod(Date.now()), list = boardRumours(char, per.day);
  return (
    <div class="hub-board">
      <p class="note">Hanne schreibt auf, was am Tresen erzählt wird. Jeden Tag hängen andere Zettel – was du schon erledigt hast, nimmt sie ab. Neue Zettel in {fmtLeft(per.next).replace(/\.$/, '')}.</p>
      <ul class="hub-notes scroll">
        {list.map(r => { const z = rumourZone(r); return (
          <li class={cx('hub-note', 'k-' + r.kind)}>
            <div class="hub-note-kind">{RUMOUR_KIND_NAME[r.kind]}{z && ZONES[z] && <> · {ZONES[z].name}</>}</div>
            <p>„{r.text}“</p>
            <div class="hub-note-who">— {r.who}</div>
          </li>
        ); })}
        {!list.length && <li class="note">Heute hängt nichts Neues. Entweder ist die Welt ruhig, oder du warst schon überall. Hanne tippt auf Letzteres.</li>}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------------ Gruppenbereich
function Groups({ char }: { char: CharData }) {
  const online = useStore(s => s.online), myId = useStore(s => s.myId), party = useStore(s => s.party), lfg = useStore(s => s.lfg);
  const mine = lfg.find(e => e.id === myId);
  const [goal, setGoal] = useState(mine?.goal ?? 'expedition');
  const [note, setNote] = useState(mine?.note ?? '');
  useEffect(() => { send({ t: 'hub', a: 'board' }); const h = setInterval(() => send({ t: 'hub', a: 'board' }), 5000); return () => clearInterval(h); }, []);
  const here = online.filter(p => p.zone === HUB_ZONE && p.id !== myId);
  const inParty = (id: number) => party.some(m => m.id === id);
  const lead = !party.length || party.some(m => m.id === myId && m.lead);
  return (
    <div class="hub-groups">
      <div class="hub-col">
        <H>In der Quellwarte <span class="pill">{here.length + 1}</span></H>
        <ul class="hub-list scroll">
          <li class="hub-pl me"><b>{char.name}</b> <span class="note">{CLASSES[char.cls].name} · Stufe {char.level}</span></li>
          {here.map(p => { const e = lfg.find(x => x.id === p.id); return (
            <li class="hub-pl">
              <div class="grow"><b>{e && '⚑ '}{p.name}</b> <span class="note">{CLASSES[p.cls]?.name} · Stufe {p.level}{inParty(p.id) && ' · in deiner Gruppe'}</span>{e && <div class="note">sucht: {LFG_GOAL[e.goal]}{e.note && ` – „${e.note}“`}</div>}</div>
              {!inParty(p.id) && lead && party.length < CFG.social.partyMax && <Btn kind="small" onClick={() => send({ t: 'party', a: 'invite', id: p.id })}>Einladen</Btn>}
            </li>
          ); })}
          {!here.length && <li class="note">Gerade ist sonst niemand hier. Häng ein Gesuch aus – Gesuche sehen alle, auch draußen in der Welt.</li>}
        </ul>
        <div class="row"><Btn kind="small" onClick={() => store.set({ hubWin: null, panel: 'party' })}>Gruppenfenster ({party.length || 1}/{CFG.social.partyMax})</Btn></div>
      </div>
      <div class="hub-col">
        <H>Dein Gesuch</H>
        <div class="hub-goals">{LFG_GOALS.map(([id, name]) => <button type="button" class={cx('chip', goal === id && 'on')} onClick={() => { sfx('ui_click'); setGoal(id); }}>{name}</button>)}</div>
        <TextInput value={note} onInput={setNote} placeholder="Notiz (z. B. „Stufe 20+, Heiler gesucht“)" maxLength={60} ariaLabel="Notiz zum Gesuch" />
        <div class="row end">
          {mine && <Btn onClick={() => send({ t: 'hub', a: 'lfg' })}>Abhängen</Btn>}
          <Btn kind="primary" disabled={!lead} title={lead ? undefined : 'Für die Gruppe sucht, wer sie anführt'} onClick={() => send({ t: 'hub', a: 'lfg', goal, note })}>{mine ? 'Gesuch ändern' : 'Gesuch aushängen'}</Btn>
        </div>
        <H>Am Brett <span class="pill">{lfg.length}</span></H>
        <ul class="hub-list scroll">
          {lfg.map(e => (
            <li class="hub-pl">
              <div class="grow"><b>⚑ {e.name}</b> <span class="note">{CLASSES[e.cls]?.name} · Stufe {e.level} · Gruppe {e.size}/{CFG.social.partyMax}{e.zone !== HUB_ZONE && ` · ${ZONES[e.zone]?.name ?? ''}`}</span>
                <div class="note">{LFG_GOAL[e.goal]}{e.note && ` – „${e.note}“`} · seit {fmtTime(e.sec)}</div></div>
              {e.id !== myId && !inParty(e.id) && lead && e.size < CFG.social.partyMax && e.size === 1 && <Btn kind="small" onClick={() => send({ t: 'party', a: 'invite', id: e.id })}>Einladen</Btn>}
            </li>
          ))}
          {!lfg.length && <li class="note">Das Brett ist leer.</li>}
        </ul>
        <p class="note">Wer eine Gruppe anführt, wählt am Portal das Ziel. Wer ein Gesuch aushängt, trägt ein ⚑ über dem Kopf.</p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Trophäenhalle
function Hall({ char }: { char: CharData }) {
  const home = useStore(s => s.home);
  const board = useStore(s => s.expBoard);
  const [tab, setTab] = useState<'stats' | 'bosse' | 'zeiten' | 'rekorde' | 'stuecke'>('stats');
  const d = hallData(char, home);
  const owned = d.trophies.filter(t => t.owned).length;
  const records = EXPEDITION_LIST.filter(x => board?.[x.id] && (Object.keys(board[x.id].best).length || board[x.id].deep));
  return (
    <div class="hub-hall">
      <Tabs tabs={[['stats', 'Statistik'], ['bosse', 'Bosse und Erfolge'], ['zeiten', 'Bestzeiten', d.expeditions.length], ['rekorde', 'Bestenliste', records.length], ['stuecke', 'Vitrinen', d.showcase.length]]} value={tab} onChange={setTab} />
      {tab === 'stats' && <dl class="hub-stats">{d.stats.map(s => <><dt>{s.label}</dt><dd>{s.value}</dd></>)}</dl>}
      {tab === 'bosse' && (
        <div class="hub-cols scroll">
          <div>
            <H>Bosse</H>
            <ul class="hub-list">{d.bosses.map(b => <li class={cx('hub-boss', !b.wins && 'dim')}><span class="grow">{b.wins ? b.name : '???'}</span><b>{b.wins ? `${b.wins}×` : '–'}</b></li>)}</ul>
            <H>Titel</H>
            <p class="note">{d.titles.length ? d.titles.join(' · ') : 'Noch keiner. Bertram hält Platz frei.'}</p>
          </div>
          <div>
            <H>Trophäen <span class="pill">{owned} / {d.trophies.length}</span></H>
            <div class="hub-tro">{d.trophies.map(t => <span class={cx('hub-tro-i', !t.owned && 'dim')} title={t.owned ? `${t.name} – ${t.desc}` : t.how}><Icon k={t.icon} size={32} /></span>)}</div>
            {d.milestones.length > 0 && <><H>Meilensteine der Sammlung</H><ul class="hub-list">{d.milestones.map(m => <li class={cx(!m.done && 'dim')}><span class="grow">{m.name} <small class="note">{m.reward}</small></span><b>{m.have}/{m.need}</b></li>)}</ul></>}
          </div>
        </div>
      )}
      {tab === 'zeiten' && (
        d.expeditions.length ? (
          <ul class="hub-list scroll">{d.expeditions.map(r => (
            <li class="hub-rec"><div class="grow"><b>{r.name}</b> <span class="note">{r.clears} Abschlüsse{r.secrets ? ` · ${r.secrets} Geheimnisse` : ''}{r.minis ? ` · ${r.minis} Wächter` : ''}</span>
              <div class="hub-diffs">{r.best.map(b => <span class={cx('pill', 'd-' + b.diff)}>{b.name}: {b.clears}×{b.sec ? ` · ${fmtTime(b.sec)}` : ''}</span>)}{r.deep ? <span class="pill d-mythisch">Tiefe {r.deep}{r.deepSec ? ` · ${fmtTime(r.deepSec)}` : ''}</span> : null}</div></div></li>
          ))}</ul>
        ) : <p class="note">Noch keine Expedition abgeschlossen. Das Portal auf dem Platz wartet – Bertram hat die Tafel schon gestrichen.</p>
      )}
      {tab === 'rekorde' && (
        records.length ? (
          <ul class="hub-list scroll hub-board">{records.map(x => { const row = board![x.id]; return (
            <li class="hub-rec"><div class="grow"><b>{x.name}</b>
              {DIFFICULTIES.filter(dd => row.best[dd]).map(dd => <div class="hub-board-row"><span class={cx('pill', 'd-' + dd)}>{DIFFICULTY_NAME[dd]}</span><b>{fmtSec(row.best[dd]!.sec)}</b><span class="note">{row.best[dd]!.names.join(', ')}</span></div>)}
              {row.deep && <div class="hub-board-row"><span class="pill d-mythisch">Tiefe {row.deep.depth}</span><b>{fmtSec(row.deep.sec)}</b><span class="note">{row.deep.names.join(', ')}</span></div>}
            </div></li>
          ); })}</ul>
        ) : <p class="note">{board ? 'Die Tafel der Quellwarte ist noch leer. Wer als Erster eine Expedition abschließt, steht hier – mit Zeit und Gruppe.' : 'Bertram holt die Tafel …'}</p>
      )}
      {tab === 'stuecke' && (
        d.showcase.length ? <div class="hub-vitrine">{d.showcase.map(it => <div class="hub-ped"><ItemSlot item={it} char={char} size="sm" /><small style={{ color: RARITY_COLOR[it.rarity] }}>{itemName(it)}</small></div>)}</div>
          : <p class="note">Bertram stellt hier deine epischen und legendären Stücke aus – aus Rucksack, Ausrüstung und Truhe. Die Vitrinen sind noch leer. Sie sind sehr sauber.</p>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Übersicht (Karte und Legende)
function Overview() {
  return (
    <div class="hub-over">
      <div class="hub-over-map"><ZoneMapCanvas zone={HUB_ZONE} /></div>
      <ul class="hub-legend scroll">
        {FACILITY_ORDER.map(f => <li><b><i class="hub-glyph">{FACILITIES[f].glyph}</i>{FACILITIES[f].name}</b><div class="note">{FACILITIES[f].desc}</div></li>)}
        <li><b><i class="hub-glyph">◆</i>Quellstein und Tor</b><div class="note">Der Quellstein am Ankunftsplatz bringt dich überallhin, wo du schon warst. Das Tor im Süden führt zu Fuß nach Quellhain.</div></li>
      </ul>
    </div>
  );
}

/** Handbuch-Kapitel „Die Quellwarte“ */
export function HubHelp() {
  const M = CFG.hub.mastery;
  return (
    <>
      <p>Die <b>Quellwarte</b> ist die alte Wache der Hüter über dem Netz der Quellsteine – heute der Treffpunkt aller Quellgänger. Hin kommst du von jedem Quellstein (Weltkarte → „Zur Quellwarte“) und durch das Tor am Rand von Quellhain; zurück über den Quellstein am Ankunftsplatz oder das Tor im Süden. In der Warte wird nicht gekämpft.</p>
      <ul class="tips">{FACILITY_ORDER.map(f => <li><b>{FACILITIES[f].name}:</b> {FACILITIES[f].desc}</li>)}</ul>
      <div class="sec-title">Gut zu wissen</div>
      <ul class="tips">
        <li>Ottmars Ware wechselt jeden Tag um Mitternacht (Weltzeit UTC), das Stück der Woche montags. Jedes Stück gibt es für jeden Charakter einmal.</li>
        <li>Meisterränge: bis zu {M.max} zusätzliche Ränge für höchstens {M.skills} voll ausgebaute Techniken – ab Stufe {M.ranks[0].level} bzw. {M.ranks[1].level}.</li>
        <li>Das Lagerhaus führt die Truhe deines Profils (dieselbe wie auf dem Hof); bis zu {CFG.hub.lager.rowsMax} Regale mit je {CFG.hub.lager.row} Plätzen lassen sich dazukaufen.</li>
        <li>Gruppengesuche hängen {Math.round(CFG.hub.lfgSec / 60)} Minuten; wer eines aushängt, trägt ein ⚑ über dem Kopf.</li>
      </ul>
    </>
  );
}

/** Weltkarte, am Quellstein: Reise in die Quellwarte (sie ist kein Gebiet der Karte, aber jeder Stein kennt sie). */
export function HubTravel() {
  const near = useStore(s => s.nearStone), zone = useStore(s => s.zone);
  if (zone === HUB_ZONE) return null;
  return <Btn kind="small" disabled={!near} title={near ? undefined : 'Nur an einem Quellstein'} sound="teleport" onClick={() => { send({ t: 'teleport', zone: HUB_ZONE }); closePanel(); }}>⛫ Zur Quellwarte reisen</Btn>;
}
