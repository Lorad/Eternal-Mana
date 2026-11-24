/**
 * Lebendige Welt (0.6): Rufübersicht mit Rangbelohnungen, Fraktionsvorräte und Spenden, Ware der Fahrenden Händlerin,
 * Ereignisanzeige im HUD, Gespräche der Begegnungen am Weg und die Zusätze im NPC-Gespräch.
 * Alle Regeln stammen aus shared/src/data/factions.ts – der Server entscheidet, hier wird angezeigt (auch, warum etwas nicht geht).
 */
import type { ComponentChildren } from 'preact';
import { useRef, useState } from 'preact/hooks';
import { live } from '../state/live';
import { store, togglePanel, useStore } from '../state/store';
import { CFG, RARITY_COLOR } from '../../../shared/src/config';
import { ENEMIES } from '../../../shared/src/data/enemies';
import { EVENTS, SEASON_EFFECT, SEASON_GLYPH, SEASON_NAMES } from '../../../shared/src/data/events';
import { FACTION_LIST, RANK_NAMES, REP_SOURCES, factionOfNpc, factionOfZone, factionStock, rankOf, rankProgress, repLine, repOf, shopDiscount, titlesOf, type FactionDef } from '../../../shared/src/data/factions';
import { ITEMS, itemName } from '../../../shared/src/data/items';
import { NPCS } from '../../../shared/src/data/npcs';
import { TRADER_NPC } from '../../../shared/src/data/npcs_welt';
import { RARE_LIST, TRAIT_TEXT, WORLD_BOSS_LIST } from '../../../shared/src/data/rares';
import { routineState } from '../../../shared/src/data/routines';
import { TROPHIES, trophyOf } from '../../../shared/src/data/worlditems';
import { ZONES } from '../../../shared/src/data/zones';
import { getMap } from '../../../shared/src/maps/mapgen';
import type { CharData, WorldEventInfo } from '../../../shared/src/types';
import { activeTreasure, treasureHint } from '../../../shared/src/world';
import { Btn, Gold, Icon, ItemSlot, Portrait, Tabs, Window, closePanel, cx, fmtNum, send, sfx, useTick } from './common';

// ------------------------------------------------------------------ kleine Helfer
export function seasonLabel(season: number): string { return `${SEASON_GLYPH[season] ?? ''} ${SEASON_NAMES[season] ?? ''}`; }
const fmtLeft = (sec: number) => { const s = Math.max(0, Math.round(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
/** Restzeit eines Ereignisses (läuft zwischen zwei Meldungen des Servers lokal weiter) */
function Countdown({ until }: { until: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useTick(now => { const el = ref.current; if (!el) return; const t = fmtLeft(until - (now - store.state.worldAt) / 1000); if (el.textContent !== t) el.textContent = t; }, [until]);
  return <span ref={ref} class="ev-time" />;
}
/**
 * Begrüßung, die von Uhrzeit und Ruf abhängt: Wer schläft, antwortet trotzdem – mürrisch. An Feierabend- und Mittagsplätzen
 * haben manche einen eigenen Satz; sonst gelegentlich die Zeile zum Ruf bei der Fraktion.
 */
export function worldGreeting(npc: string, char: CharData, zone: string, tod: number): { text: string; sleep: boolean } | null {
  const r = routineState(zone, npc, tod);
  if (r.line && (r.sleep || Math.random() < 0.7)) return { text: r.line, sleep: r.sleep };
  const l = repLine(char, npc);
  return l && Math.random() < 0.6 ? { text: l, sleep: false } : null;
}

// ------------------------------------------------------------------ HUD: Ereignisse der Zone, Weltbosse überall, aktive Schatzkarte
function EventRow({ e, here }: { e: WorldEventInfo; here: boolean }) {
  const def = EVENTS[e.kind as keyof typeof EVENTS];
  return (
    <li class={cx('ev-row', e.boss && 'boss', !here && 'far')}>
      <i class="ev-glyph">{e.boss ? '☠' : def?.glyph ?? '✦'}</i>
      <div class="grow">
        <b>{e.name}{!here && <small> · {ZONES[e.zone]?.name}</small>}</b>
        {here && e.goal && <span>{e.goal}{e.prog ? ` (${e.prog[0]}/${e.prog[1]})` : ''}</span>}
      </div>
      <Countdown until={e.until} />
    </li>
  );
}
export function EventTracker() {
  const world = useStore(s => s.world);
  const zone = useStore(s => s.zone);
  const flags = useStore(s => s.char?.flags);
  const char = store.state.char;
  const evs = (world?.ev ?? []).filter(e => e.zone === zone || e.boss);
  let hint: string | null = null;
  if (char && flags && flags[`tk:${zone}`] && ZONES[zone]?.kind === 'overworld') { const m = getMap(zone), s = activeTreasure(char, m); if (s) hint = treasureHint(m, s); }
  if (!evs.length && !hint) return null;
  return (
    <ul class="evt" aria-label="Ereignisse">
      {evs.map(e => <EventRow key={e.id} e={e} here={e.zone === zone} />)}
      {hint && <li class="ev-row map"><i class="ev-glyph">✗</i><div class="grow"><b>Schatzkarte</b><span>{hint}</span></div></li>}
    </ul>
  );
}

// ------------------------------------------------------------------ Zusätze im NPC-Gespräch
function openShop(kind: 'faction' | 'donate' | 'trader', npc: string) { sfx('ui_click'); store.set({ dialog: null, dlgNode: null, panel: null, prompt: null, wshop: { kind, npc } }); }
/** Zeilen im Gespräch: Vorräte und Spenden beim Ansprechpartner einer Fraktion, Ware bei der Fahrenden Händlerin */
export function WorldOptions({ npc }: { npc: string }) {
  const char = useStore(s => s.char);
  const hasTrader = useStore(s => !!s.world?.trader);
  const f = factionOfNpc(npc);
  if (!char) return null;
  return (
    <>
      {npc === TRADER_NPC && hasTrader && <button type="button" class="opt opt-world" onClick={() => openShop('trader', npc)}><i class="opt-mark">◈</i><span class="grow">Fahrende Ware ansehen</span></button>}
      {f && <button type="button" class="opt opt-world" onClick={() => openShop('faction', npc)}><i class="opt-mark">⚑</i><span class="grow">Vorräte: {f.short} <small>Rang „{RANK_NAMES[rankOf(repOf(char, f.id)) - 1]}“</small></span></button>}
      {f && <button type="button" class="opt opt-world" onClick={() => openShop('donate', npc)}><i class="opt-mark">♥</i><span class="grow">Rohstoffe spenden</span></button>}
    </>
  );
}

// ------------------------------------------------------------------ Fenster: Fraktionsvorräte, Spenden, Fahrende Händlerin
function RankBar({ char, f }: { char: CharData; f: FactionDef }) {
  const rep = repOf(char, f.id), rank = rankOf(rep), pr = rankProgress(rep);
  return (
    <div class="rep-bar" title={`${fmtNum(rep)} Ruf`}>
      <div class="rep-bar-fill" style={{ width: (pr ? Math.min(100, (pr[0] / pr[1]) * 100) : 100) + '%' }} />
      <span>{RANK_NAMES[rank - 1]}{pr ? ` · ${fmtNum(pr[0])} / ${fmtNum(pr[1])}` : ' · höchster Rang'}</span>
    </div>
  );
}
function FactionStore({ f, char }: { f: FactionDef; char: CharData }) {
  const stock = factionStock(char, f);
  return (
    <ul class="shop-list scroll wshop-list">
      {stock.map((e, idx) => {
        const b = ITEMS[e.item.base], afford = char.gold >= e.price;
        return (
          <li class={cx('shop-row', e.locked && 'locked')}>
            <ItemSlot item={e.item} char={char} price={e.price} size="sm" />
            <div class="grow shop-name"><b style={{ color: RARITY_COLOR[e.item.rarity] }}>{itemName(e.item)}</b>
              <small>{e.locked ? `ab Rang „${RANK_NAMES[e.offer.rank - 1]}“` : e.owned ? 'hast du schon' : e.offer.unique ? 'nur einmal erhältlich' : b.desc ?? ''}</small></div>
            <span class={cx('shop-price', !afford && !e.locked && 'bad')}><Gold n={e.price} /></span>
            <Btn kind="primary" disabled={e.locked || e.owned || !afford} title={e.locked ? 'Dein Rang reicht noch nicht' : !afford ? 'Nicht genug Gold' : undefined} onClick={() => send({ t: 'fbuy', npc: f.npc, idx, qty: 1 })} sound={null}>Kaufen</Btn>
          </li>
        );
      })}
    </ul>
  );
}
function Donate({ f, char }: { f: FactionDef; char: CharData }) {
  const rows = Object.entries(f.donate).map(([item, per]) => ({ item, per, have: char.inv.reduce((a, i) => a + (i.base === item ? i.qty ?? 1 : 0), 0) }));
  return (
    <>
      <p class="note">„{NPCS[f.npc]?.name}“ nimmt Rohstoffe der Region für die {f.short === 'Die Gesellschaft' ? 'Gesellschaft' : f.short}. Es gibt kein Gold dafür – nur Ruf.</p>
      <ul class="shop-list wshop-list">
        {rows.map(r => (
          <li class={cx('shop-row', !r.have && 'locked')}>
            <Icon k={'item_' + ITEMS[r.item].icon} size={36} />
            <div class="grow shop-name"><b>{ITEMS[r.item].name}</b><small>{r.per} Ruf je Stück · du hast {r.have}</small></div>
            <Btn disabled={r.have < 1} onClick={() => send({ t: 'donate', npc: f.npc, item: r.item, n: 1 })} sound={null}>1 spenden</Btn>
            <Btn kind="primary" disabled={r.have < 2} onClick={() => send({ t: 'donate', npc: f.npc, item: r.item, n: Math.min(r.have, CFG.living.rep.donateMax) })} sound={null}>{Math.min(r.have, CFG.living.rep.donateMax) || ''} spenden</Btn>
          </li>
        ))}
      </ul>
    </>
  );
}
function TraderStore({ char }: { char: CharData }) {
  const offers = useStore(s => s.world?.trader);
  const zone = useStore(s => s.zone);
  const disc = shopDiscount(char, zone);
  if (!offers) return <p class="note">Vesna ist weitergezogen.</p>;
  return (
    <>
      <p class="note">Was Vesna dabeihat, wechselt mit jedem Halt – und von allem gibt es nur wenig.{disc > 0 && <> Dein Ruf in dieser Gegend bringt dir <b>{Math.round(disc * 100)} %</b> Nachlass.</>}</p>
      <ul class="shop-list scroll wshop-list">
        {offers.map((o, idx) => {
          const b = ITEMS[o.item.base], afford = char.gold >= o.price;
          return (
            <li class={cx('shop-row', o.left < 1 && 'locked')}>
              <ItemSlot item={o.item} char={char} price={o.price} size="sm" />
              <div class="grow shop-name"><b style={{ color: RARITY_COLOR[o.item.rarity] }}>{itemName(o.item)}</b><small>{o.left > 0 ? `noch ${o.left} für dich` : 'ausverkauft'}{b?.desc && o.left > 0 ? ' · ' + b.desc : ''}</small></div>
              <span class={cx('shop-price', !afford && 'bad')}><Gold n={o.price} /></span>
              <Btn kind="primary" disabled={o.left < 1 || !afford} title={!afford ? 'Nicht genug Gold' : undefined} onClick={() => send({ t: 'wbuy', idx, qty: 1 })} sound={null}>Kaufen</Btn>
            </li>
          );
        })}
      </ul>
    </>
  );
}
export function WorldShop() {
  const w = useStore(s => s.wshop);
  const char = useStore(s => s.char);
  if (!w || !char) return null;
  const f = factionOfNpc(w.npc);
  const close = () => store.set({ wshop: null });
  const title = w.kind === 'trader' ? 'Fahrende Händlerin · Vesna Langweg' : `${w.kind === 'donate' ? 'Spenden' : 'Vorräte'} · ${f?.name ?? ''}`;
  return (
    <Window title={title} onClose={close} class="win-wshop"
      head={<>
        {f && <Tabs tabs={[['faction', 'Vorräte'], ['donate', 'Spenden']]} value={w.kind as 'faction' | 'donate'} onChange={k => store.set({ wshop: { kind: k, npc: w.npc } })} />}
        <span class="dlg-gold craft-gold">Gold <Gold n={char.gold} /></span>
      </>}>
      {f && <div class="wshop-rank"><RankBar char={char} f={f} /><Btn kind="small" onClick={() => { close(); togglePanel('ruf'); }}>Ruf ansehen</Btn></div>}
      {w.kind === 'trader' ? <TraderStore char={char} /> : f ? (w.kind === 'donate' ? <Donate f={f} char={char} /> : <FactionStore f={f} char={char} />) : null}
    </Window>
  );
}

// ------------------------------------------------------------------ Begegnungen am Weg
export function EncounterDialog() {
  const d = useStore(s => s.enc);
  const [page, setPage] = useState(0);
  if (!d) return null;
  const last = page >= d.lines.length - 1;
  const close = () => { sfx('ui_close'); store.set({ enc: null }); };
  return (
    <div class="backdrop dlg-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
      <section class="window dlg" role="dialog" aria-label={`Begegnung: ${d.who}`}>
        <header class="dlg-head">
          {d.look && <div class="dlg-portrait"><Portrait k={'npc_' + d.look} scale={3} /></div>}
          <div class="grow"><h2>{d.who}</h2><div class="dlg-title">Begegnung am Weg</div></div>
          <button type="button" class="window-x" aria-label="Schließen" title="Schließen" onClick={close}>✕</button>
        </header>
        <div class="dlg-body">
          <div class={cx('speech', !d.look && 'narr')}><p><span key={page} class="speech-line">{d.lines[Math.min(page, d.lines.length - 1)]}</span></p></div>
          {!last && <div class="row end dlg-actions"><Btn kind="primary" autofocus onClick={() => { sfx('dialog_blip'); setPage(p => p + 1); }} sound={null}>Weiter</Btn></div>}
          {last && (
            <div class="dlg-options">
              {d.opts.map((o, i) => (
                <button type="button" class={cx('opt', i === d.opts.length - 1 && 'opt-bye')} disabled={!!o.off} onClick={() => { sfx('ui_click'); send({ t: 'enc', id: d.id, opt: i }); }}>
                  <i class="opt-mark">{i === d.opts.length - 1 ? '×' : '›'}</i><span class="grow">{o.s}{o.off && <small> {o.off}</small>}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ Fenster „Ruf und Welt“
function FactionDetail({ f, char }: { f: FactionDef; char: CharData }) {
  const rep = repOf(char, f.id), rank = rankOf(rep);
  const titles = titlesOf(char);
  const stock = factionStock(char, f);
  return (
    <div class="rep-detail card">
      <div class="qp-type">{ZONES[f.zone].name} · Ansprechpartner: {NPCS[f.npc]?.name}</div>
      <h3 class="qp-name">{f.name}</h3>
      <p class="winfo-sub">{f.desc}</p>
      <RankBar char={char} f={f} />
      <div class="sec-title">Was die Ränge bringen</div>
      <ol class="rep-ranks">
        {f.perks.map((p, i) => (
          <li class={cx(rank > i && 'on', rank === i + 1 && 'cur')}>
            <b>{RANK_NAMES[i]}</b><small>ab {fmtNum(CFG.living.rep.ranks[i])} Ruf</small>
            <span>{p}</span>
          </li>
        ))}
      </ol>
      <div class="sec-title">Vorräte bei {NPCS[f.npc]?.name}</div>
      <div class="rep-stock">
        {stock.map(e => <span class={cx('rep-item', e.locked && 'locked')} title={`${itemName(e.item)} – ab Rang „${RANK_NAMES[e.offer.rank - 1]}“`}><ItemSlot item={e.item} char={char} price={e.price} size="sm" /><i>{e.offer.rank}</i></span>)}
      </div>
      {titles[f.id] && (
        <div class="row between rep-title">
          <span>Titel: <b>{f.title}</b></span>
          {char.title === f.id ? <Btn kind="small" onClick={() => send({ t: 'title', id: '' })}>Ablegen</Btn> : <Btn kind="small" onClick={() => send({ t: 'title', id: f.id })}>Tragen</Btn>}
        </div>
      )}
    </div>
  );
}
function WorldTab({ char }: { char: CharData }) {
  const world = useStore(s => s.world);
  const zone = useStore(s => s.zone);
  const season = world?.season ?? 0;
  const treasures = Object.keys(char.flags).filter(k => k.startsWith('tk:')).map(k => k.slice(3)).filter(z => ZONES[z]);
  const dug = Object.keys(char.flags).filter(k => k.startsWith('tm:')).reduce((a, k) => a + char.flags[k], 0);
  return (
    <div class="rep-world">
      <div class="card rep-season">
        <div class="qp-type">Jahreszeit</div>
        <h3 class="qp-name">{seasonLabel(season)}</h3>
        <div class="rep-bar thin"><div class="rep-bar-fill" style={{ width: Math.round((world?.sp ?? 0) * 100) + '%' }} /></div>
        <p class="note">{SEASON_EFFECT[season]}</p>
        <ul class="rep-seasons">{SEASON_NAMES.map((n, i) => <li class={cx(i === season && 'on')} title={SEASON_EFFECT[i]}>{SEASON_GLYPH[i]} {n}</li>)}</ul>
        <div class="sec-title">Gerade los</div>
        {(world?.ev.length ?? 0) > 0
          ? <ul class="evt in-panel">{world!.ev.map(e => <EventRow key={e.id} e={e} here={e.zone === zone} />)}</ul>
          : <p class="note">Im Augenblick ist es ruhig. Das bleibt nie lange so.</p>}
        <div class="sec-title">Schätze</div>
        {treasures.length ? <ul class="rep-list">{treasures.map(z => { const m = getMap(z), s = activeTreasure(char, m); return <li><b>{ZONES[z].name}:</b> {s ? treasureHint(m, s) : ''}</li>; })}</ul>
          : <p class="note">Keine Schatzkarte gelesen. Karten stammen von Erwachten, aus Truhen, von Ereignissen und von Händlern.</p>}
        {dug > 0 && <p class="note">Gehobene Schätze: <b>{dug}</b></p>}
      </div>
      <div class="card rep-trophies">
        <div class="qp-type">Sammlung</div>
        <h3 class="qp-name">Trophäen {TROPHIES.filter(t => char.flags[`tr:${t[0]}`]).length} / {TROPHIES.length}</h3>
        <ul class="rep-tro">
          {TROPHIES.map(([id, name, icon]) => {
            const has = !!char.flags[`tr:${id}`], rare = RARE_LIST.find(r => r.id === id), boss = WORLD_BOSS_LIST.find(b => b.id === id);
            const seen = has || !!char.flags[`rk:${id}`] || !!char.flags[`wb:${id}`] || char.inv.some(i => i.base === trophyOf(id));
            const who = rare ? ENEMIES[rare.mob]?.name ?? '' : boss?.name ?? '';
            const where = rare ? ZONES[rare.zone].name : boss ? boss.zones.map(z => ZONES[z].name).join(' / ') : '';
            const cond = rare ? [rare.night && 'nur nachts', rare.weather && 'nur bei bestimmtem Wetter', rare.seasons && 'nur in ' + rare.seasons.map(s => SEASON_NAMES[s]).join(', ')].filter(Boolean).join(' · ') : 'Weltboss';
            return (
              <li class={cx(has && 'on')} title={rare && seen ? TRAIT_TEXT[rare.trait] : undefined}>
                <Icon k={'item_' + icon} size={30} />
                <div class="grow"><b>{has ? name : seen || boss ? who : '???'}</b><small>{has ? who + ' · ' : ''}{where}{cond ? ' · ' + cond : ''}</small></div>
                {has ? <i class="rep-ok">✓</i> : char.inv.some(i => i.base === trophyOf(id)) ? <Btn kind="small" onClick={() => send({ t: 'use', uid: char.inv.find(i => i.base === trophyOf(id))!.uid })}>Aufnehmen</Btn> : null}
              </li>
            );
          })}
        </ul>
        <p class="note">Seltene Monster kündigen sich nicht an. Wer in ihre Nähe kommt, sieht sie auf der Minimap – und merkt es meistens auch so.</p>
      </div>
    </div>
  );
}
export function RepPanel() {
  const char = useStore(s => s.char);
  const zone = useStore(s => s.zone);
  const [tab, setTab] = useState<'ruf' | 'welt'>('ruf');
  const [sel, setSel] = useState(() => factionOfZone(zone)?.id ?? FACTION_LIST[0].id);
  if (!char) return null;
  const f = FACTION_LIST.find(x => x.id === sel) ?? FACTION_LIST[0];
  return (
    <Window title="Ruf und Welt" onClose={closePanel} class="win-rep" head={<Tabs tabs={[['ruf', 'Fraktionen'], ['welt', 'Welt und Sammlung']]} value={tab} onChange={setTab} />}>
      {tab === 'ruf' ? (
        <div class="rep">
          <div class="rep-left">
            <ul class="rep-factions">
              {FACTION_LIST.map(x => {
                const rep = repOf(char, x.id), rank = rankOf(rep), pr = rankProgress(rep);
                return (
                  <li>
                    <button type="button" class={cx('rep-f', x.id === sel && 'on', 'b-' + x.zone)} onClick={() => { sfx('ui_click'); setSel(x.id); }}>
                      <span class="rep-f-head"><b>{x.short}</b><small>{ZONES[x.zone].name}</small></span>
                      <span class="rep-f-rank">{RANK_NAMES[rank - 1]}</span>
                      <span class="rep-bar thin"><span class="rep-bar-fill" style={{ width: (pr ? (pr[0] / pr[1]) * 100 : 100) + '%' }} /></span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div class="card rep-how">
              <div class="sec-title">So wächst dein Ruf</div>
              <ul class="rep-list">{REP_SOURCES.map(s => <li>{s}</li>)}</ul>
            </div>
          </div>
          <FactionDetail f={f} char={char} />
        </div>
      ) : <WorldTab char={char} />}
    </Window>
  );
}
void live;
export type { ComponentChildren };
