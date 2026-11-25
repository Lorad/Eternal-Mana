/** HUD während des Spiels. Jede Komponente abonniert nur den Zustandsausschnitt, den sie braucht. */
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { net } from '../net/net';
import { bus } from '../state/bus';
import { toggleTracker } from '../state/hud';
import { settings } from '../state/settings';
import type { Action } from '../state/settings';
import { keyHint } from '../state/settings';
import { openHelp, store, togglePanel, useStore } from '../state/store';
import type { Panel } from '../state/store';
import { CFG, RARITY_COLOR } from '../../../shared/src/config';
import { CLASSES } from '../../../shared/src/data/classes';
import { ITEMS } from '../../../shared/src/data/items';
import { NPCS } from '../../../shared/src/data/npcs';
import { QUEST_LIST, objectiveProgress, objectiveTarget, questComplete } from '../../../shared/src/data/quests';
import { SKILLS, skillMp } from '../../../shared/src/data/skills';
import { ZONES } from '../../../shared/src/data/zones';
import { FLAG_SHIELD, STATUS_BIT, STATUS_MASK, STATUS_NAME } from '../../../shared/src/types';
import type { CharData, StatusId } from '../../../shared/src/types';
import { Bar, Btn, ELEMENT_CSS, Face, Icon, Kbd, cx, fmtNum, send, sfx, tipProps, uiScale, useSettings, useTick } from './common';
import { HintCard, useHintWatcher } from './hints';
import { planColumn, type ColumnPlan } from './hudlayout';
import { PerfOverlay } from './perf';
import { Affinity, TargetInfo } from './elements';
import { EndgamePill, RiftHud } from './endgame';
import { QUELL_MAX, titleName } from '../../../shared/src/data/rifts';
import { MinimapCanvas } from './mapview';
import { PartyFrames, PlayerMenu, SocialPopups } from './social';
import { EventTracker, FarEvents, hudEvents, seasonLabel } from './world';

// ------------------------------------------------------------------ Tastenhinweise (Tastatur oder Gamepad)
const PAD_NAME = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Back', 'Start', 'L3', 'R3', '↑', '↓', '←', '→'];
export function useHint(): (a: Action) => string {
  const mode = useStore(s => s.inputMode);
  useSettings();
  return a => {
    if (mode === 'pad') { const b = settings.pad[a]; if (b !== undefined && PAD_NAME[b]) return PAD_NAME[b]; }
    return keyHint(a);
  };
}

// ------------------------------------------------------------------ Spielerrahmen
const STATUS_COLOR: Record<StatusId, string> = { burn: '#ff7a3c', poison: '#8fd14a', slow: '#7fc8ff', stun: '#ffe14a', weak: '#b9a0c8', mark: '#ff5a8a', expose: '#8ef0c0', root: '#c9a85a', freeze: '#bfe9ff' };
function StatusChips() {
  const flags = useStore(s => s.me.flags & (STATUS_MASK | FLAG_SHIELD));
  if (!flags) return null;
  return (
    <div class="status-row">
      {(Object.keys(STATUS_BIT) as StatusId[]).filter(k => flags & STATUS_BIT[k]).map(k => (
        <span class="status-chip" style={{ '--c': STATUS_COLOR[k] } as any}><i />{STATUS_NAME[k]}</span>
      ))}
      {(flags & FLAG_SHIELD) !== 0 && <span class="status-chip" style={{ '--c': '#9fe8ff' } as any}><i />Schild</span>}
    </div>
  );
}
function BuffIcon({ b }: { b: { id: string; name: string; glyph: string; until: number; icon?: string; desc?: string } }) {
  const ref = useRef<HTMLSpanElement>(null);
  useTick(now => {
    const el = ref.current; if (!el) return;
    const sec = Math.max(0, Math.ceil((b.until - now) / 1000));
    const t = sec > 99 ? Math.ceil(sec / 60) + 'm' : sec + '';   // Speisen und Elixiere laufen minutenlang
    if (el.textContent !== t) el.textContent = t;
  }, [b.until]);
  return (
    <div class="buff" {...tipProps(() => <div class="tip-text"><b>{b.name}</b>{b.desc}</div>)}>
      {b.icon ? <Icon k={b.icon} size={30} /> : <Icon k={'skill_' + b.glyph} el="light" size={30} />}
      <span ref={ref} class="buff-t" />
    </div>
  );
}
function Buffs() {
  const buffs = useStore(s => s.buffs);
  if (!buffs.length) return null;
  return <div class="buff-row">{buffs.map(b => <BuffIcon key={b.id + b.until} b={b} />)}</div>;
}
function PlayerFrame() {
  const name = useStore(s => s.char?.name ?? '');
  const cls = useStore(s => s.char?.cls);
  const level = useStore(s => s.char?.level ?? 1);
  const hp = useStore(s => Math.ceil(s.me.hp)), maxHp = useStore(s => s.me.maxHp);
  const mp = useStore(s => Math.floor(s.me.mp)), maxMp = useStore(s => s.me.maxMp);
  const ap = useStore(s => s.char?.attrPoints ?? 0), sp = useStore(s => s.char?.skillPoints ?? 0);
  const title = useStore(s => (s.char ? titleName(s.char) : undefined));
  if (!cls) return null;
  const low = maxHp > 0 && hp / maxHp < 0.25;
  return (
    <div class="hud-tl">
      <div class={cx('pframe', low && 'low')}>
        <button type="button" class="pframe-face" title="Charakter" onClick={() => togglePanel('character')}>
          <Face k={'char_' + cls} size={56} />
          <span class="pframe-lvl">{level}</span>
        </button>
        <div class="pframe-main">
          <div class="pframe-name"><b>{name}</b><span>{title ?? CLASSES[cls].name}</span></div>
          <Bar kind="hp" v={hp} max={maxHp} />
          <Bar kind="mp" v={mp} max={maxMp} class="mpbar" />
        </div>
      </div>
      {(ap > 0 || sp > 0) && (
        <div class="points-row">
          {ap > 0 && <button type="button" class="points-pill" onClick={() => togglePanel('character')}>＋{ap} Attributspunkt{ap > 1 ? 'e' : ''}</button>}
          {sp > 0 && <button type="button" class="points-pill" onClick={() => togglePanel('skills')}>＋{sp} Fähigkeitspunkt{sp > 1 ? 'e' : ''}</button>}
        </div>
      )}
      <EndgamePill />
      <StatusChips />
      <Buffs />
      <PartyFrames />
    </div>
  );
}

// ------------------------------------------------------------------ Aktionsleiste
function Cooldown({ id }: { id: string }) {
  const cd = useStore(s => s.cds[id]);
  const ref = useRef<HTMLDivElement>(null), txt = useRef<HTMLSpanElement>(null);
  useTick(now => {
    const el = ref.current; if (!el) return;
    const left = cd ? cd.until - now : 0;
    if (left <= 0) { if (el.style.display !== 'none') { el.style.display = 'none'; el.parentElement?.classList.add('cd-ready'); window.setTimeout(() => el.parentElement?.classList.remove('cd-ready'), 350); } return; }
    if (el.style.display !== 'block') el.style.display = 'block';
    el.style.setProperty('--p', (Math.min(1, left / (cd!.total * 1000)) * 100).toFixed(1) + '%');
    const t = left > 9950 ? Math.ceil(left / 1000) + '' : (Math.ceil(left / 100) / 10).toFixed(1).replace('.', ','); // deutsches Dezimalkomma wie überall sonst
    if (txt.current && txt.current.textContent !== t) txt.current.textContent = t;
  }, [cd]);
  return <div ref={ref} class="cd" style={{ display: 'none' }}><span ref={txt} /></div>;
}
function SkillSlot({ i }: { i: number }) {
  const id = useStore(s => s.char?.hotbar[i] ?? null);
  // Hinweis: useStore-Selektoren dürfen nicht von veränderlichen Werten abhängen (sie werden nur einmal gebunden).
  const skills = useStore(s => s.char?.skills);
  const mp = useStore(s => Math.floor(s.me.mp));
  const rank = (id && skills?.[id]) || 1;
  const sk = id ? SKILLS[id] : null;
  const cost = sk ? skillMp(sk, rank) : 0;
  const noMana = mp < cost;
  const hint = useHint();
  const key = hint(('skill' + (i + 1)) as Action);
  return (
    <button type="button" class={cx('hslot', !sk && 'empty', noMana && 'nomana')} aria-label={sk ? sk.name : `Fähigkeitsplatz ${i + 1} (leer)`}
      onClick={() => { if (sk) bus.emit('ui:skill', i); else togglePanel('skills'); }}
      {...tipProps(() => sk
        ? <div class="tip-text"><b>{sk.name}</b>{sk.desc}<div class="tip-sub">{cost} Mana · Rang {rank}</div></div>
        : <div class="tip-text"><b>Freier Platz</b>Im Fähigkeiten-Fenster belegen.</div>)}>
      {sk ? <Icon k={'skill_' + sk.glyph} el={sk.element} size={48} /> : <span class="hslot-plus">+</span>}
      {id && <Cooldown key={id} id={id} />}
      {key && <span class="hslot-key">{key}</span>}
      {sk && <span class="hslot-cost">{cost}</span>}
    </button>
  );
}
function countPotions(c: CharData | null, kind: 'hp' | 'mp'): number {
  if (!c) return 0;
  let n = 0;
  for (const it of c.inv) if (it.base.startsWith('potion_' + kind)) n += it.qty ?? 1;
  return n;
}
function PotionSlot({ kind }: { kind: 'hp' | 'mp' }) {
  const n = useStore(s => countPotions(s.char, kind));
  const elixirs = useStore(s => s.char?.inv.reduce((a, it) => a + (it.base === 'elixir' ? it.qty ?? 1 : 0), 0) ?? 0);
  const hint = useHint();
  const key = hint(kind === 'hp' ? 'potionHp' : 'potionMp');
  const total = n || elixirs;
  return (
    <button type="button" class={cx('hslot potion', total === 0 && 'nomana')} aria-label={kind === 'hp' ? 'Heiltrank trinken' : 'Manatrank trinken'}
      onClick={() => bus.emit('ui:quick', kind)}
      {...tipProps(() => <div class="tip-text"><b>{kind === 'hp' ? 'Heiltrank' : 'Manatrank'}</b>Trinkt den passenden Trank aus dem Inventar.{n === 0 && elixirs > 0 ? ' Keine Tränke mehr – nimmt ein Elixier.' : ''}<div class="tip-sub">Abklingzeit {CFG.player.potionCooldown} s</div></div>)}>
      <Icon k={n === 0 && elixirs > 0 ? 'item_potion_elixir' : 'item_potion_' + kind} size={40} />
      <Cooldown id="_potion" />
      {key && <span class="hslot-key">{key}</span>}
      <span class="hslot-n">{total}</span>
    </button>
  );
}
function XpBar() {
  const xp = useStore(s => s.char?.xp ?? 0), level = useStore(s => s.char?.level ?? 1);
  const max = level >= CFG.player.maxLevel;
  const need = CFG.xpToNext(level);
  // 0.5: auf der Höchststufe füllt Erfahrung die Quellstufen
  const qLvl = useStore(s => s.char?.quell?.lvl ?? 0), qXp = useStore(s => s.char?.quell?.xp ?? 0);
  if (max && qLvl < QUELL_MAX) return (
    <div class="xpbar xpbar-quell" title="Quell-Erfahrung">
      <Bar kind="xp" v={qXp} max={CFG.quell.xpToNext(qLvl)} label={false} class="thin" />
      <span class="xp-text">Quellstufe {qLvl} · {fmtNum(Math.floor(qXp))} / {fmtNum(CFG.quell.xpToNext(qLvl))} EP</span>
    </div>
  );
  return (
    <div class="xpbar" title="Erfahrung">
      <Bar kind="xp" v={max ? 1 : xp} max={max ? 1 : need} label={false} class="thin" />
      <span class="xp-text">{max ? 'Höchststufe erreicht' : `Stufe ${level} · ${fmtNum(Math.floor(xp))} / ${fmtNum(need)} EP`}</span>
    </div>
  );
}
function Hotbar() {
  return (
    <div class="hotbar-wrap">
      <div class="hotbar">
        {Array.from({ length: CFG.player.hotbarSize }, (_, i) => <SkillSlot i={i} />)}
        <span class="hotbar-sep" />
        <PotionSlot kind="hp" />
        <PotionSlot kind="mp" />
      </div>
      <XpBar />
    </div>
  );
}
function Prompt() {
  const prompt = useStore(s => s.prompt);
  const hint = useHint();
  if (!prompt) return null;
  return (
    <button type="button" class="prompt" onClick={() => bus.emit('ui:interact')}>
      <Kbd>{hint('interact')}</Kbd><span>{prompt}</span>
    </button>
  );
}

// ------------------------------------------------------------------ Minimap, Uhr, Wetter
const WEATHER: Record<string, string> = {
  clear: 'Klar', rain: 'Regen', leaves: 'Blätterwehen', spores: 'Sporenflug', motes: 'Lichtstaub', ash: 'Ascheregen', embers: 'Funkenflug', snow: 'Schneefall', blizzard: 'Schneesturm', void: 'Stille der Leere',
};
function dayPart(h: number) { return h < 5 ? 'Nacht' : h < 8 ? 'Morgen' : h < 12 ? 'Vormittag' : h < 14 ? 'Mittag' : h < 18 ? 'Nachmittag' : h < 21.5 ? 'Abend' : 'Nacht'; }
function MinimapBox() {
  const zone = useStore(s => s.zone);
  const clock = useStore(s => Math.floor((((s.tod % 1) + 1) % 1) * 144));  // 10-Minuten-Schritte
  const weather = useStore(s => s.weather);
  const keys = useStore(s => s.keys);
  const season = useStore(s => s.world?.season ?? -1);
  const s = useSettings();
  const z = ZONES[zone];
  const h = Math.floor(clock / 6), m = (clock % 6) * 10;
  const night = h < 6 || h >= 20;
  return (
    <div class="mm">
      {s.showMinimap && (
        <button type="button" class="mm-frame" title="Karte öffnen" onClick={() => togglePanel('map')}>
          {z && <MinimapCanvas zone={zone} size={148} />}
          <span class="mm-n">N</span>
        </button>
      )}
      <div class="mm-info">
        <b>{z?.name ?? ''}</b>
        <span><i class={cx('sun', night && 'moon')} />{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')} · {dayPart(h + m / 60)}{z && !z.indoor ? ' · ' + (WEATHER[weather] ?? weather) : WEATHER[weather] && weather !== 'clear' ? ' · ' + WEATHER[weather] : ''}</span>
        {season >= 0 && z?.kind === 'overworld' && <span class="mm-season">{seasonLabel(season)}</span>}
      </div>
      {keys > 0 && <div class="keys" title="Schlüssel in diesem Dungeon"><Icon k="item_key" size={24} /><b>× {keys}</b></div>}
    </div>
  );
}

// ------------------------------------------------------------------ Questverfolgung
const TYPE_ORDER = { main: 0, group: 1, side: 2, repeat: 3 } as const;
type ActiveQuest = { q: (typeof QUEST_LIST)[number]; ready: boolean };
function activeQuests(char: CharData): ActiveQuest[] {
  return QUEST_LIST.filter(q => char.quests[q.id]?.s === 'active')
    .map(q => ({ q, ready: questComplete(char, q) }))
    .sort((a, b) => TYPE_ORDER[a.q.type] - TYPE_ORDER[b.q.type] || +b.ready - +a.ready || a.q.level - b.q.level);
}
/**
 * Questverfolgung (0.8): Kopfzeile zum Ein- und Ausklappen, darunter so viele Quests, wie die Spalte Platz hat (hudlayout.ts).
 * Gezeigt werden nur offene Ziele – Erledigtes steht im Questlog.
 */
function QuestTracker({ active, plan }: { active: ActiveQuest[]; plan: ColumnPlan }) {
  const char = useStore(s => s.char);
  const hint = useHint();
  if (!char || !active.length) return null;
  const shown = plan.collapsed ? [] : active.slice(0, plan.quests);
  const ready = active.filter(a => a.ready).length;
  const why = plan.why === 'kampf' ? 'Im Mana-Riss und im Bosskampf klappt sie sich von selbst ein.' : plan.why === 'platz' ? 'Gerade ist kein Platz – oben läuft Wichtigeres.' : '';
  return (
    <div class={cx('qt', plan.collapsed && 'shut')}>
      <button type="button" class="qt-head" aria-expanded={!plan.collapsed} onClick={() => { sfx('ui_tab'); toggleTracker(); }}
        {...tipProps(() => <div class="tip-text"><b>Questverfolgung</b>{plan.collapsed ? 'Aufklappen' : 'Einklappen'}{hint('tracker') && <span> · Taste: {hint('tracker')}</span>}{why && <div class="tip-sub">{why}</div>}</div>)}>
        {ready > 0 && plan.collapsed && <span class="qt-rdy">{ready} abgabebereit</span>}
        <span>Quests</span><span class="qt-n">{active.length}</span><i class="qt-chev">{plan.collapsed ? '◂' : '▾'}</i>
      </button>
      {shown.map(({ q, ready }) => {
        const open = q.objectives.map((o, i) => ({ o, p: objectiveProgress(char, q, i), t: objectiveTarget(o) })).filter(x => x.p < x.t);
        return (
          <button type="button" class={cx('qt-q', q.type, ready && 'ready')} onClick={() => togglePanel('quests')}>
            <b><i class="qt-mark">{q.type === 'main' ? '◆' : '◇'}</i>{q.name}</b>
            {ready
              ? <span class="qt-ready">Abgeben bei {npcName(q.turnIn ?? q.giver)}</span>
              : open.slice(0, 2).map(({ o, p, t }) => <span class="qt-o">{o.label}{t > 1 ? ` ${p}/${t}` : ''}</span>)}
            {!ready && open.length > 2 && <span class="qt-o qt-rest">+ {open.length - 2} weitere Ziele</span>}
          </button>
        );
      })}
      {!plan.collapsed && active.length > shown.length && <span class="qt-more">+ {active.length - shown.length} weitere im Questlog</span>}
    </div>
  );
}
/**
 * Rechte Spalte (0.8) in fester Rangfolge: Karte → Riss-Anzeige → Ereignisse hier → Questverfolgung → Weltbosse anderswo.
 * Wie viel die Questverfolgung zeigt, rechnet `planColumn` aus der Fensterhöhe und dem, was darüber steht.
 */
function RightColumn() {
  const char = useStore(s => s.char);
  const rift = useStore(s => s.rift);
  const boss = useStore(s => !!s.boss);
  const world = useStore(s => s.world);
  const zone = useStore(s => s.zone);
  const opened = useStore(s => s.trackerOpen);
  const s = useSettings();
  const active = char ? activeQuests(char) : [];
  const ev = hudEvents(world, zone, char);
  const plan = planColumn({
    h: uiScale.h, narrow: uiScale.w < 860, minimap: s.showMinimap, rift: !!rift, riftMods: rift?.mods.length ?? 0, boss,
    events: ev.here.length + (ev.hint ? 1 : 0), far: ev.far.length, quests: active.length, collapsed: s.trackerCollapsed, opened,
  });
  return <div class="hud-tr"><MinimapBox /><RiftHud /><EventTracker /><QuestTracker active={active} plan={plan} /><FarEvents max={plan.far} /></div>;
}
function npcName(id: string) { return NPCS[id]?.name ?? id; }

// ------------------------------------------------------------------ Boss
function BossBar() {
  const boss = useStore(s => s.boss);
  if (!boss) return null;
  const col = ELEMENT_CSS[boss.el];
  const calm = useSettings().reduceFlash; // 0.8 „Blitze reduzieren“: der Balken wechselt seine Farbe nicht mit dem Element
  return (
    <div class="boss" style={{ '--el': col } as any}>
      <div class="boss-name"><span class="boss-gem" />{boss.name}<span class="boss-gem" /></div>
      <Bar kind="boss" v={boss.hp} max={boss.maxHp} label={`${Math.max(0, Math.ceil((boss.hp / Math.max(1, boss.maxHp)) * 100))} %`} color={calm ? undefined : `linear-gradient(90deg, color-mix(in srgb, ${col} 45%, #400), ${col})`} />
      <div class="boss-pips" aria-label={`Phase ${boss.phase} von 3`}>{[1, 2, 3].map(n => <i class={cx(n <= boss.phase && 'on')} />)}<span>Phase {boss.phase}</span></div>
      <Affinity weak={boss.weak} resist={boss.resist} />
    </div>
  );
}

// ------------------------------------------------------------------ Zonentitel
function ZoneBanner() {
  const zone = useStore(s => s.zone);
  const [show, setShow] = useState<string | null>(null);
  useEffect(() => {
    if (!zone) return;
    setShow(zone);
    const t = window.setTimeout(() => setShow(null), 4200);
    return () => clearTimeout(t);
  }, [zone]);
  const z = show ? ZONES[show] : null;
  if (!z) return null;
  return (
    <div class="zone-banner" key={show!}>
      <div class="logo-orn"><span /><i /><span /></div>
      <b>{z.name}</b>
      <span>{z.subtitle}</span>
    </div>
  );
}

// ------------------------------------------------------------------ Meldungen
function Toasts() {
  const toasts = useStore(s => s.toasts);
  const side = toasts.filter(t => t.kind !== 'story');
  return (
    <>
      <div class="toasts" aria-live="polite">
        {side.map(t => {
          const b = t.item ? ITEMS[t.item.base] : null;
          const icon = b ? 'item_' + b.icon : t.icon ? (t.icon.includes('_') && (t.icon.startsWith('item_') || t.icon.startsWith('skill_')) ? t.icon : 'item_' + t.icon) : null;
          return (
            <div key={t.id} class={cx('toast', 'toast-' + t.kind)} style={t.item ? { '--rc': RARITY_COLOR[t.item.rarity] } as any : undefined}>
              {icon && <Icon k={icon} size={24} />}
              {t.kind === 'quest' && !icon && <i class="toast-q">!</i>}
              <span style={t.item ? { color: RARITY_COLOR[t.item.rarity] } : undefined}>{t.kind === 'loot' && <em>Erhalten: </em>}{t.s}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function StoryToasts() {
  const toasts = useStore(s => s.toasts);
  const story = toasts.filter(t => t.kind === 'story');
  if (!story.length) return null;
  return <div class="story-toasts">{story.slice(-2).map(t => <div key={t.id} class="toast-story">{t.s}</div>)}</div>;
}

// ------------------------------------------------------------------ Chat
function Chat() {
  const chat = useStore(s => s.chat);
  const open = useStore(s => s.chatOpen);
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null), log = useRef<HTMLDivElement>(null);
  const hint = useHint();
  useEffect(() => { if (open) input.current?.focus({ preventScroll: true }); else input.current?.blur(); }, [open]);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [chat, open]);
  const close = () => { if (store.state.chatOpen) store.set({ chatOpen: false }); };
  const submit = () => {
    const s = text.trim();
    if (s) { send({ t: 'chat', s: s.slice(0, 200) }); sfx('chat'); }
    setText(''); close();
  };
  const lines = open ? chat : chat.slice(-7);
  return (
    <div class={cx('chat', open && 'open')}>
      <div ref={log} class={cx('chat-log', open && 'scroll')}>
        {lines.map(l => (
          <div key={l.id} class={cx('chat-line', 'ch-' + l.ch)}>
            {l.ch === 'party' && <i>[Gruppe] </i>}{l.ch === 'sys' ? <i>{l.from ? l.from + ': ' : ''}</i> : <b>{l.from}: </b>}{l.s}
          </div>
        ))}
      </div>
      {open ? (
        <div class="chat-input">
          <input ref={input} class="input" type="text" value={text} maxLength={200} placeholder="Nachricht …" spellcheck={false} autocomplete="off"
            onInput={e => setText((e.target as HTMLInputElement).value)}
            onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); submit(); } else if (e.key === 'Escape') { e.preventDefault(); setText(''); close(); } }}
            onKeyUp={e => e.stopPropagation()} onBlur={close} />
          <div class="chat-hint">Enter = senden · /p Text = nur an die Gruppe</div>
        </div>
      ) : (
        <button type="button" class="chat-open" onClick={() => store.set({ chatOpen: true })} title="Chat öffnen"><Kbd>{hint('chat')}</Kbd> Chat</button>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Menüleiste & Verbindung
function Svg({ children }: { children: ComponentChildren }) { return <svg viewBox="0 0 16 16" width="20" height="20" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true">{children}</svg>; }
const MENU_ICON: Record<string, ComponentChildren> = {
  inventory: <Svg><path d="M5 1h6v2h-1V2H6v1H5zM3 4h10v2H3zM2 6h12v8H2zM7 8h2v3H7z" fill-rule="evenodd" /></Svg>,
  character: <Svg><path d="M6 1h4v4H6zM4 6h8v5h-2v4H6v-4H4z" /></Svg>,
  skills: <Svg><path d="M7 0h2v5l3-3 2 2-3 3h5v2h-5l3 3-2 2-3-3v5H7v-5l-3 3-2-2 3-3H0V7h5L2 4l2-2 3 3z" /></Svg>,
  quests: <Svg><path d="M3 1h9v2h2v3h-2v9H3zM5 4h5v1H5zM5 7h5v1H5zM5 10h4v1H5z" fill-rule="evenodd" /></Svg>,
  map: <Svg><path d="M1 3l4-2 6 2 4-2v12l-4 2-6-2-4 2zM5 3v9l1 .3V3.3zM10 4.7v9l1 .3V5z" fill-rule="evenodd" /></Svg>,
  party: <Svg><path d="M2 3h4v4H2zM10 3h4v4h-4zM1 8h6v6H1zM9 8h6v6H9z" /></Svg>,
  ruf: <Svg><path d="M3 1h2v14H3zM5 2h8l-2 3 2 3H5z" /></Svg>,
  sammlung: <Svg><path d="M2 2h5l1 1 1-1h5v11H9l-1 1-1-1H2zM4 4v7h3V4zM9 4v7h3V4z" fill-rule="evenodd" /></Svg>,
  help: <Svg><path d="M5 2h6v1h1v4h-1v1h-1v1H9v2H7V8h1V7h1V6h1V4H6v2H4V3h1zM7 12h2v2H7z" /></Svg>,
  menu: <Svg><path d="M2 3h12v2H2zM2 7h12v2H2zM2 11h12v2H2z" /></Svg>,
};
const MENU: [Panel, string, Action][] = [
  ['inventory', 'Inventar', 'inventory'], ['character', 'Charakter', 'character'], ['skills', 'Fähigkeiten', 'skills'], ['quests', 'Quests', 'quests'],
  ['map', 'Karte', 'map'], ['party', 'Gruppe', 'party'], ['ruf', 'Ruf und Welt', 'ruf'], ['sammlung', 'Sammlung und Begleiter', 'sammlung'], ['help', 'Handbuch', 'help'], ['menu', 'Menü', 'menu'],
];
function MenuBar() {
  const panel = useStore(s => s.panel);
  const ap = useStore(s => s.char?.attrPoints ?? 0), sp = useStore(s => s.char?.skillPoints ?? 0);
  const invFull = useStore(s => (s.char?.inv.length ?? 0) >= CFG.player.invSize);
  const hint = useHint();
  return (
    <nav class="menubar" aria-label="Menü">
      {MENU.map(([p, label, act]) => {
        const badge = p === 'character' ? ap : p === 'skills' ? sp : 0;
        return (
          <button type="button" class={cx('mbtn', panel === p && 'on')} aria-label={label} onClick={() => { sfx('ui_click'); if (p === 'help' && panel !== 'help') openHelp(); else togglePanel(p); }}
            {...tipProps(() => <div class="tip-text"><b>{label}</b>{hint(act) && <span>Taste: {hint(act)}</span>}{p === 'inventory' && invFull && <div class="bad">Inventar voll</div>}</div>)}>
            {MENU_ICON[p]}
            <span class="mbtn-key">{hint(act)}</span>
            {badge > 0 && <span class="mbtn-badge">{badge}</span>}
            {p === 'inventory' && invFull && <span class="mbtn-badge bad-badge">!</span>}
          </button>
        );
      })}
    </nav>
  );
}
function ConnIndicator() {
  const ping = useStore(s => s.ping);
  const conn = useStore(s => s.conn);
  const q = conn !== 'online' ? 'off' : ping < 90 ? 'good' : ping < 200 ? 'mid' : 'poor';
  return (
    <div class={cx('conn', 'conn-' + q)} title="Verbindung zum Server">
      <span class="conn-bars"><i /><i /><i /></span>
      {conn === 'online' ? `${ping} ms` : 'getrennt'}
    </div>
  );
}
/**
 * Verbindung verloren (0.8): zählt die Schonfrist herunter, sagt danach, was mit dem Charakter geschehen ist, und bietet
 * nach ein paar Sekunden einen Ausweg an – der Bildschirm bleibt nie einfach stehen.
 */
function ReconnectOverlay() {
  const conn = useStore(s => s.conn);
  const [since, setSince] = useState(0);
  const [, tick] = useState(0);
  useEffect(() => {
    if (conn !== 'reconnecting') { setSince(0); return; }
    setSince(performance.now());
    const t = window.setInterval(() => tick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, [conn]);
  if (conn !== 'reconnecting') return null;
  const sec = since ? Math.floor((performance.now() - since) / 1000) : 0;
  const left = Math.round(CFG.net.reconnectGraceMs / 1000) - sec;
  return (
    <div class="reconnect" role="alert">
      <div class="spinner" />
      <div>
        <b>Verbindung verloren – verbinde neu …</b>
        <span>{left > 0
          ? `Dein Charakter bleibt noch ${left} Sekunden geschützt in der Welt stehen.`
          : 'Dein Charakter wurde gespeichert und aus der Welt genommen. Sobald der Server wieder antwortet, geht es an dieser Stelle weiter.'}</span>
        {sec >= 6 && <div class="reconnect-acts"><span class="note">Läuft der Server noch? Beim Gastgeber nachfragen – das Spiel versucht es weiter.</span><Btn kind="small" onClick={() => net.quitToMenu()}>Zum Hauptmenü</Btn></div>}
      </div>
    </div>
  );
}
export function Hud() {
  useHintWatcher();
  return (
    <div class="hud">
      <PlayerFrame />
      <RightColumn />
      <div class="hud-tc"><BossBar /><TargetInfo /><SocialPopups /></div>
      <PlayerMenu />
      <ZoneBanner />
      <StoryToasts />
      <div class="hud-bc"><HintCard /><Prompt /><Hotbar /></div>
      <PerfOverlay />
      <div class="hud-bl"><Chat /></div>
      <div class="hud-br"><Toasts /><div class="hud-br-row"><ConnIndicator /><MenuBar /></div></div>
      <ReconnectOverlay />
    </div>
  );
}
