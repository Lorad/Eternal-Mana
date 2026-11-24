/** Gemeinsame Bausteine der Oberfläche: Knöpfe, Balken, Icons, Fenster, Tooltips, Hilfsfunktionen. */
import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { audio } from '../audio';
import type { SfxName } from '../audio';
import { iconUrl, portraitUrl } from '../gfx/runtime';
import { net } from '../net/net';
import { onSettingsChange, settings } from '../state/settings';
import { store } from '../state/store';
import { CFG, ELEMENT_NAME, RARITY_COLOR, RARITY_NAME } from '../../../shared/src/config';
import { CLASSES } from '../../../shared/src/data/classes';
import { ITEMS, baseMods, canEquip, isGear, itemMods, itemName, sellPrice, slotOf } from '../../../shared/src/data/items';
import type { ItemBase } from '../../../shared/src/data/items';
import { MOD_LABEL } from '../../../shared/src/types';
import type { CharData, ClientMsg, Element, ItemInstance, ModKey, Mods, Slot } from '../../../shared/src/types';
import { ItemExtras } from './itemextra';

// ------------------------------------------------------------------ Hilfsfunktionen
export function sfx(n: SfxName) { try { audio.playSfx(n); } catch { /* Audio noch gesperrt */ } }
export function send(m: ClientMsg) { net.send(m); }
export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const fmtNum = (n: number) => Math.round(n).toLocaleString('de-DE');
export function fmtDec(n: number, d = 1) { return (Math.round(n * 10 ** d) / 10 ** d).toLocaleString('de-DE', { maximumFractionDigits: d }); }
export function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h} Std ${m} Min` : `${m} Min`;
}
export const ELEMENT_CSS: Record<Element, string> = {
  phys: '#e8e4d8', fire: '#ff7a3c', water: '#5fb4ff', earth: '#c9a85a', wind: '#8ef0c0', light: '#fff2a0', dark: '#b070ff',
};
export async function copyText(s: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(s); return true; } catch { /* Fallback unten */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = s; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch { return false; }
}
export function toggleFullscreen() {
  try {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  } catch { /* nicht unterstützt */ }
}
export function useFullscreen(): boolean {
  const [fs, setFs] = useState(!!document.fullscreenElement);
  useEffect(() => {
    const h = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);
  return fs;
}
/** Re-Render, sobald sich die Einstellungen ändern. */
export function useSettings() {
  const [, set] = useState(0);
  useEffect(() => onSettingsChange(() => set(n => n + 1)) as unknown as () => void, []);
  return settings;
}

// ------------------------------------------------------------------ gemeinsamer Animations-Takt (ein einziges rAF für alle Timer)
type Tick = (now: number) => void;
const ticks = new Set<Tick>();
let raf = 0;
function loop() {
  const now = performance.now();
  for (const t of [...ticks]) t(now);
  raf = ticks.size ? requestAnimationFrame(loop) : 0;
}
export function onTick(fn: Tick): () => void {
  ticks.add(fn);
  if (!raf) raf = requestAnimationFrame(loop);
  return () => { ticks.delete(fn); };
}
export function useTick(fn: Tick, deps: unknown[]) {
  useEffect(() => onTick(fn), deps);
}

// ------------------------------------------------------------------ UI-Maßstab
/** Aktueller Gesamtmaßstab der Oberfläche (Einstellung × automatische Anpassung an die Fenstergröße). */
export const uiScale = { s: 1, w: 1280, h: 720 };

// ------------------------------------------------------------------ Knöpfe & Eingaben
interface BtnProps {
  onClick?: (e: MouseEvent) => void;
  children?: ComponentChildren;
  kind?: 'primary' | 'ghost' | 'danger' | 'small' | 'plain';
  class?: string;
  disabled?: boolean;
  title?: string;
  sound?: SfxName | null;
  autofocus?: boolean;
  ariaLabel?: string;
}
export function Btn(p: BtnProps) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (p.autofocus) ref.current?.focus({ preventScroll: true }); }, []);
  return (
    <button ref={ref} type="button" class={cx('btn', p.kind && 'btn-' + p.kind, p.class)} disabled={p.disabled} title={p.title} aria-label={p.ariaLabel}
      onClick={e => { if (p.sound !== null) sfx(p.sound ?? 'ui_click'); p.onClick?.(e); }}>
      {p.children}
    </button>
  );
}
/** Texteingabe, die Tastendrücke nicht an die Spielsteuerung durchreicht. */
export function TextInput(p: { value: string; onInput: (v: string) => void; onEnter?: () => void; placeholder?: string; maxLength?: number; class?: string; autofocus?: boolean; ariaLabel?: string; mono?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (p.autofocus) ref.current?.focus({ preventScroll: true }); }, []);
  return (
    <input ref={ref} class={cx('input', p.mono && 'mono', p.class)} type="text" value={p.value} placeholder={p.placeholder} maxLength={p.maxLength} aria-label={p.ariaLabel}
      spellcheck={false} autocomplete="off" autocapitalize="off"
      onInput={e => p.onInput((e.target as HTMLInputElement).value)}
      onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') p.onEnter?.(); if (e.key === 'Escape') (e.target as HTMLInputElement).blur(); }}
      onKeyUp={e => e.stopPropagation()} />
  );
}
export function Toggle(p: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" class={cx('toggle', p.on && 'on')} role="switch" aria-checked={p.on} onClick={() => { sfx('ui_click'); p.onChange(!p.on); }}>
      <span class="toggle-box"><span class="toggle-knob" /></span>
      <span class="toggle-text"><b>{p.label}</b>{p.hint && <small>{p.hint}</small>}</span>
    </button>
  );
}
export function Kbd({ children }: { children: ComponentChildren }) { return children ? <kbd class="kbd">{children}</kbd> : null; }

// ------------------------------------------------------------------ Balken
export function Bar(p: { v: number; max: number; kind: 'hp' | 'mp' | 'xp' | 'boss' | 'cast'; label?: string | false; class?: string; color?: string }) {
  const f = p.max > 0 ? clamp(p.v / p.max, 0, 1) : 0;
  const w = (f * 100).toFixed(1) + '%';
  return (
    <div class={cx('bar', 'bar-' + p.kind, p.class)} role="progressbar" aria-valuenow={Math.round(p.v)} aria-valuemax={Math.round(p.max)}>
      {(p.kind === 'hp' || p.kind === 'boss') && <div class="bar-ghost" style={{ width: w }} />}
      <div class="bar-fill" style={{ width: w, ...(p.color ? { background: p.color } : {}) }} />
      {p.label !== false && <span class="bar-label">{p.label ?? `${fmtNum(Math.max(0, p.v))} / ${fmtNum(p.max)}`}</span>}
    </div>
  );
}

// ------------------------------------------------------------------ Icons & Porträts
export function Icon({ k, el, size = 48, class: c }: { k: string; el?: Element; size?: number; class?: string }) {
  return <img class={cx('px', c)} src={iconUrl(k, el)} width={size} height={size} alt="" draggable={false} />;
}
export function Portrait({ k, scale = 2, class: c }: { k: string; scale?: number; class?: string }) {
  // Sprite-Frames sind 32×40 px; gezeigt wird der Ausschnitt 24×32 um die Figur (ganzzahlig vergrößert → scharfe Pixel)
  return (
    <span class={cx('portrait', c)} style={{ display: 'inline-block', overflow: 'hidden', width: 24 * scale + 'px', height: 32 * scale + 'px' }}>
      <img class="px" src={portraitUrl(k, 2)} alt="" draggable={false} style={{ display: 'block', maxWidth: 'none', width: 32 * scale + 'px', height: 40 * scale + 'px', marginLeft: -4 * scale + 'px', marginTop: -6 * scale + 'px' }} />
    </span>
  );
}
/** Nur Kopf und Schultern eines Charakter-Sprites (für Rahmen im HUD). */
export function Face({ k, size = 48, class: c }: { k: string; size?: number; class?: string }) {
  const s = size / 16; // sichtbarer Ausschnitt: 16×16 px des 32×40-Frames (Kopfbereich)
  return (
    <span class={cx('face', c)} style={{ width: size + 'px', height: size + 'px' }}>
      <img class="px" src={portraitUrl(k, 2)} alt="" draggable={false} style={{ maxWidth: 'none', width: 32 * s + 'px', height: 40 * s + 'px', marginLeft: -8 * s + 'px', marginTop: -8 * s + 'px' }} />
    </span>
  );
}

// ------------------------------------------------------------------ Gegenstände
export const WTYPE_NAME: Record<string, string> = { sword: 'Schwert', staff: 'Stab', bow: 'Bogen', hammer: 'Hammer', dagger: 'Dolche' };
export const ACLASS_NAME: Record<string, string> = { heavy: 'Schwere Rüstung', light: 'Leichte Rüstung', robe: 'Stoffrüstung' };
export const ACC_NAME: Record<string, string> = { ring: 'Ring', amulet: 'Amulett', charm: 'Talisman' };
export function itemTypeName(b: ItemBase): string {
  switch (b.kind) {
    case 'weapon': return 'Waffe · ' + (WTYPE_NAME[b.wtype ?? ''] ?? '');
    case 'helm': return 'Kopf · ' + (ACLASS_NAME[b.aclass ?? ''] ?? '');
    case 'armor': return 'Rüstung · ' + (ACLASS_NAME[b.aclass ?? ''] ?? '');
    case 'accessory': return 'Accessoire · ' + (ACC_NAME[b.acc ?? ''] ?? '');
    case 'consumable': return 'Verbrauchsgut';
    case 'material': return 'Material';
    case 'quest': return 'Questgegenstand';
  }
}
/** Klassen, die einen Ausrüstungsgegenstand tragen können (leer = alle). */
export function classesFor(b: ItemBase): string[] {
  if (b.kind === 'accessory' || !isGear(b)) return [];
  return Object.values(CLASSES).filter(c => canEquip(c.id, b)).map(c => c.name);
}
export function fmtMod(k: ModKey, v: number): string {
  const n = fmtDec(Math.abs(v), 1);
  return `${v < 0 ? '−' : '+'}${n} ${MOD_LABEL[k]}`;
}
const MOD_ORDER = Object.keys(MOD_LABEL) as ModKey[];
export function modEntries(m: Mods): [ModKey, number][] {
  return MOD_ORDER.filter(k => m[k]).map(k => [k, m[k]!]);
}
/** Welcher angelegte Gegenstand wäre der Vergleich für `it`? */
export function compareTarget(char: CharData, it: ItemInstance): ItemInstance | null {
  const b = ITEMS[it.base];
  if (!b || !isGear(b)) return null;
  const slot = slotOf(b)!;
  if (b.kind === 'accessory') {
    if (!char.equip.acc1 || !char.equip.acc2) return null;
    return char.equip.acc1;
  }
  return char.equip[slot] ?? null;
}
export function modDeltas(a: Mods, b: Mods): [ModKey, number][] {
  return MOD_ORDER.map(k => [k, Math.round(((a[k] ?? 0) - (b[k] ?? 0)) * 10) / 10] as [ModKey, number]).filter(e => e[1] !== 0);
}

interface SlotProps {
  item?: ItemInstance | null;
  onClick?: () => void;
  onAlt?: () => void;           // Doppelklick / Rechtsklick
  selected?: boolean;
  dim?: boolean;
  placeholder?: string;         // Icon-Key für leere Ausrüstungsplätze
  label?: string;
  char?: CharData | null;       // für Vergleich im Tooltip
  equipped?: boolean;
  price?: number;
  size?: 'sm';
}
export function ItemSlot(p: SlotProps) {
  const it = p.item;
  const b = it ? ITEMS[it.base] : null;
  const ref = useRef<HTMLButtonElement>(null);
  const show = () => { if (it && ref.current) showTip(ref.current, <ItemDetails item={it} char={p.char ?? null} equipped={p.equipped} price={p.price} />); };
  useEffect(() => () => { if (ref.current) hideTip(ref.current); }, []);
  return (
    <button ref={ref} type="button" class={cx('slot', p.size === 'sm' && 'slot-sm', it && 'r' + it.rarity, p.selected && 'sel', p.dim && 'dim', !it && 'empty')}
      aria-label={it ? itemName(it) : p.label ?? 'Leerer Platz'}
      onClick={() => { if (it || p.onClick) sfx('ui_click'); p.onClick?.(); }}
      onDblClick={() => { if (it) p.onAlt?.(); }}
      onContextMenu={e => { e.preventDefault(); if (it) p.onAlt?.(); }}
      onMouseEnter={show} onFocus={show}
      onMouseLeave={() => ref.current && hideTip(ref.current)} onBlur={() => ref.current && hideTip(ref.current)}>
      {it && b ? <Icon k={'item_' + b.icon} size={p.size === 'sm' ? 36 : 48} /> : p.placeholder ? <Icon k={p.placeholder} class="ghost-icon" size={p.size === 'sm' ? 36 : 48} /> : null}
      {it && (it.qty ?? 1) > 1 && <span class="slot-qty">{it.qty}</span>}
      {it && it.up > 0 && <span class="slot-up">+{it.up}</span>}
      {it?.element && <span class="slot-el" style={{ background: ELEMENT_CSS[it.element] }} />}
      {it?.set && <span class="slot-set" title="Setteil" />}
      {p.equipped && it && <span class="slot-eq">A</span>}
    </button>
  );
}

export function Gold({ n, class: c }: { n: number; class?: string }) {
  return <span class={cx('gold', c)}><i class="coin" />{fmtNum(n)}</span>;
}

/** Vollständige Beschreibung eines Gegenstands (Tooltip-Inhalt und Detailbereich). */
export function ItemDetails({ item: it, char, equipped, price, compare = true }: { item: ItemInstance; char: CharData | null; equipped?: boolean; price?: number; compare?: boolean }) {
  const b = ITEMS[it.base];
  if (!b) return <div class="tip-item"><b>???</b></div>;
  const gear = isGear(b);
  const base = gear ? modEntries(baseMods(it)) : [];
  const cls = classesFor(b);
  const usable = !char || !gear || canEquip(char.cls, b);
  const lvlReq = gear ? Math.max(1, it.ilvl - 2) : 0;
  const other = compare && char && gear && !equipped && usable ? compareTarget(char, it) : null;
  const deltas = other ? modDeltas(itemMods(it), itemMods(other)) : [];
  const sell = sellPrice(it);
  return (
    <div class="tip-item">
      <div class="tip-head">
        <span class={cx('slot slot-static', 'r' + it.rarity)}><Icon k={'item_' + b.icon} size={48} /></span>
        <div>
          <b class="tip-name" style={{ color: RARITY_COLOR[it.rarity] }}>{itemName(it)}{(it.qty ?? 1) > 1 ? ` ×${it.qty}` : ''}</b>
          <div class="tip-sub">{gear ? RARITY_NAME[it.rarity] + ' · ' : ''}{itemTypeName(b)}</div>
          {gear && <div class="tip-sub">Gegenstandsstufe {it.ilvl}{it.up > 0 ? ` · Verbesserung +${it.up}` : ''}{equipped ? ' · angelegt' : ''}</div>}
        </div>
      </div>
      {base.length > 0 && <ul class="tip-stats base">{base.map(([k, v]) => <li>{fmtMod(k, v)}</li>)}</ul>}
      {it.affixes.length > 0 && <ul class="tip-stats affix">{it.affixes.map(([k, v]) => <li>{fmtMod(k, v)}</li>)}</ul>}
      {it.element && <div class="tip-el" style={{ color: ELEMENT_CSS[it.element] }}>◆ Element: {ELEMENT_NAME[it.element]}{b.kind === 'weapon' ? ' – Angriffe verursachen Elementarschaden' : ''}</div>}
      <ItemExtras item={it} char={char} />
      {b.desc && <p class="tip-desc">{b.desc}</p>}
      {gear && char && lvlReq > 1 && <div class={cx('tip-req', char.level < lvlReq && 'bad')}>Benötigt Stufe {lvlReq}</div>}
      {cls.length > 0 && <div class={cx('tip-req', !usable && 'bad')}>Klasse: {cls.join(', ')}</div>}
      {other && (
        <div class="tip-cmp">
          <div class="tip-cmp-h">Im Vergleich zu <span style={{ color: RARITY_COLOR[other.rarity] }}>{itemName(other)}</span></div>
          {deltas.length === 0 ? <div class="tip-sub">Gleichwertig.</div> : <ul class="tip-stats">{deltas.map(([k, v]) => <li class={v > 0 ? 'good' : 'bad'}>{fmtMod(k, v)}</li>)}</ul>}
        </div>
      )}
      {compare && char && gear && !equipped && usable && !other && <div class="tip-cmp"><div class="tip-sub">Der Platz ist noch frei.</div></div>}
      <div class="tip-foot">
        {price !== undefined ? <span>Preis: <Gold n={price} /></span> : b.kind === 'quest' ? <span>Kann weder verkauft noch weggeworfen werden.</span> : <span>Verkaufswert: <Gold n={sell} />{(it.qty ?? 1) > 1 ? ' je Stück' : ''}</span>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ schwebender Tooltip
interface Tip { el: HTMLElement; content: ComponentChildren }
let tip: Tip | null = null;
const tipSubs = new Set<() => void>();
export function showTip(el: HTMLElement, content: ComponentChildren) { tip = { el, content }; for (const f of tipSubs) f(); }
export function hideTip(el?: HTMLElement) { if (!tip || (el && tip.el !== el)) return; tip = null; for (const f of tipSubs) f(); }
/** Einfacher Text-Tooltip für beliebige Elemente. */
export function tipProps(content: () => ComponentChildren): JSX.HTMLAttributes<any> {
  return {
    onMouseEnter: (e: MouseEvent) => showTip(e.currentTarget as HTMLElement, content()),
    onFocus: (e: FocusEvent) => showTip(e.currentTarget as HTMLElement, content()),
    onMouseLeave: (e: MouseEvent) => hideTip(e.currentTarget as HTMLElement),
    onBlur: (e: FocusEvent) => hideTip(e.currentTarget as HTMLElement),
  } as any;
}
export function TooltipLayer({ root }: { root: () => HTMLElement | null }) {
  const [, force] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { const f = () => force(n => n + 1); tipSubs.add(f); return () => { tipSubs.delete(f); }; }, []);
  useLayoutEffect(() => {
    const el = box.current, r = root();
    if (!el || !tip || !r) return;
    if (!tip.el.isConnected) { hideTip(); return; }
    const s = uiScale.s, rr = r.getBoundingClientRect(), a = tip.el.getBoundingClientRect();
    const ax = (a.left - rr.left) / s, ay = (a.top - rr.top) / s, aw = a.width / s, ah = a.height / s;
    const W = rr.width / s, H = rr.height / s, w = el.offsetWidth, h = el.offsetHeight;
    let x = ax + aw + 8;
    if (x + w > W - 6) x = ax - w - 8;
    if (x < 6) x = clamp(ax + aw / 2 - w / 2, 6, Math.max(6, W - w - 6));
    let y = clamp(ay - 6, 6, Math.max(6, H - h - 6));
    if (x < ax + aw && x + w > ax && y < ay + ah && y + h > ay) y = ay + ah + 8 + h < H ? ay + ah + 8 : Math.max(6, ay - h - 8);
    el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px'; el.style.visibility = 'visible';
  });
  if (!tip) return null;
  return <div ref={box} class="tooltip" style={{ visibility: 'hidden' }}>{tip.content}</div>;
}

// ------------------------------------------------------------------ Fenster
export function Window(p: { title: string; onClose: () => void; children: ComponentChildren; class?: string; icon?: string; wide?: boolean; head?: ComponentChildren; modal?: boolean }) {
  useEffect(() => { sfx('ui_open'); return () => { hideTip(); }; }, []);
  const close = () => { sfx('ui_close'); p.onClose(); };
  return (
    <div class={cx('backdrop', p.modal && 'backdrop-dark')} onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
      <section class={cx('window', p.class)} role="dialog" aria-label={p.title}>
        <header class="window-head">
          <span class="window-orn" />
          <h2>{p.title}</h2>
          {p.head}
          <button type="button" class="window-x" aria-label="Schließen" title="Schließen" onClick={close}>✕</button>
        </header>
        <div class="window-body">{p.children}</div>
      </section>
    </div>
  );
}
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: [T, string, (number | string)?][]; value: T; onChange: (t: T) => void }) {
  return (
    <div class="tabs" role="tablist">
      {tabs.map(([id, label, n]) => (
        <button type="button" role="tab" aria-selected={value === id} class={cx('tab', value === id && 'on')} onClick={() => { if (value !== id) { sfx('ui_tab'); onChange(id); } }}>
          {label}{n !== undefined && n !== 0 && n !== '' && <span class="tab-n">{n}</span>}
        </button>
      ))}
    </div>
  );
}
export function Confirm(p: { text: ComponentChildren; yes: string; no?: string; danger?: boolean; onYes: () => void; onNo: () => void }) {
  return (
    <div class="backdrop backdrop-dark confirm-layer" onMouseDown={e => { if (e.target === e.currentTarget) p.onNo(); }}>
      <div class="window confirm" role="alertdialog">
        <div class="confirm-text">{p.text}</div>
        <div class="row end">
          <Btn onClick={p.onNo} autofocus>{p.no ?? 'Abbrechen'}</Btn>
          <Btn kind={p.danger ? 'danger' : 'primary'} onClick={p.onYes}>{p.yes}</Btn>
        </div>
      </div>
    </div>
  );
}
export function closePanel() { store.set({ panel: null }); }
export const INV_SIZE = CFG.player.invSize;
export const SLOT_ICON: Record<Slot, string> = { weapon: 'item_sword', helm: 'item_helm_heavy', armor: 'item_armor_heavy', acc1: 'item_ring', acc2: 'item_amulet' };
