/** Eingabe: Tastatur, Maus und Gamepad auf abstrakte Aktionen abgebildet. */
import { audio } from '../audio';
import { bus } from '../state/bus';
import { toggleTracker } from '../state/hud';
import { settings, updateSettings, type Action } from '../state/settings';
import { closeTop, store, togglePanel, uiBlocksGame, type Panel } from '../state/store';

const down = new Set<string>();
const pressedNow = new Set<Action>();
const padPrev: boolean[] = [];
let padAxis = { x: 0, y: 0 }, padAim = { x: 0, y: 0 };
let padHeld = new Set<Action>();
let navCooldown = 0;
export const pointer = { x: 0, y: 0, onCanvas: false };

const PANEL_ACTIONS: Partial<Record<Action, Panel>> = { inventory: 'inventory', character: 'character', skills: 'skills', quests: 'quests', map: 'map', party: 'party', ruf: 'ruf', sammlung: 'sammlung', help: 'help' };

function typing(): boolean {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}
function actionsFor(code: string): Action[] {
  const out: Action[] = [];
  for (const a in settings.keys) if (settings.keys[a as Action].includes(code)) out.push(a as Action);
  return out;
}
function trigger(a: Action) {
  const st = store.state;
  if (a === 'menu') { if (!closeTop() && st.screen === 'game') togglePanel('menu'); return; }
  if (st.screen !== 'game') return;
  if (st.cine) {
    // 0.8: Der „Weiter“-Knopf hat den Fokus – dann erledigt der Browser Enter und Leertaste selbst; sonst blättern diese Aktionen
    const onButton = (document.activeElement as HTMLElement | null)?.tagName === 'BUTTON';
    if ((a === 'interact' || a === 'attack') || (!onButton && (a === 'chat' || a === 'dodge'))) bus.emit('cine:next');
    return;
  }
  if (a === 'chat') { if (!st.chatOpen && !(st.cine || st.story || st.lore || st.dialog || st.sign)) store.set({ chatOpen: true }); return; } // Enter bestätigt in Gesprächen und Filmszenen, statt den Chat zu öffnen
  const panel = PANEL_ACTIONS[a];
  if (panel) { togglePanel(panel); audio.playSfx(store.state.panel ? 'ui_open' : 'ui_close'); return; }
  // 0.8: Schalter, die keine Spielaktion sind
  if (a === 'tracker') { toggleTracker(); audio.playSfx('ui_tab'); return; }
  if (a === 'perf') { updateSettings({ perfOverlay: !settings.perfOverlay }); return; }
  pressedNow.add(a);
}

export function initInput(canvasParent: HTMLElement) {
  window.addEventListener('keydown', e => {
    if (e.defaultPrevented) return;
    if (store.state.inputMode !== 'kbm') store.set({ inputMode: 'kbm' });
    if (typing()) { if (e.code === 'Escape') (document.activeElement as HTMLElement).blur(); return; }
    if (store.state.panel === 'settings' && e.code !== 'Escape') return;
    if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) { if (store.state.screen === 'game' && !uiBlocksGame()) e.preventDefault(); }
    if (e.repeat) return;
    down.add(e.code);
    const acts = actionsFor(e.code);
    if (/^F\d+$/.test(e.code) && acts.length) e.preventDefault();          // F1/F3 sollen nicht die Hilfe oder Suche des Browsers öffnen
    if (e.code === 'Escape' && !acts.includes('menu')) acts.push('menu');  // 0.8: Esc schließt immer – auch wenn „Menü“ umbelegt wurde
    for (const a of acts) trigger(a);
  });
  window.addEventListener('keyup', e => down.delete(e.code));
  window.addEventListener('blur', () => down.clear());
  canvasParent.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && store.state.inputMode !== 'kbm') store.set({ inputMode: 'kbm' });
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.onCanvas = true;
    const code = 'Mouse' + e.button;
    down.add(code);
    if (store.state.screen === 'game' && !uiBlocksGame()) for (const a of actionsFor(code)) trigger(a);
    (document.activeElement as HTMLElement | null)?.blur?.();
  });
  window.addEventListener('pointerup', e => down.delete('Mouse' + e.button));
  window.addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; });
  bus.on('ui:skill', (i: number) => pressedNow.add(('skill' + (i + 1)) as Action));
  bus.on('ui:quick', (k: string) => pressedNow.add(k === 'hp' ? 'potionHp' : 'potionMp'));
  bus.on('ui:interact', () => pressedNow.add('interact'));
}

const FOCUSABLE = 'button:not([disabled]), input, select, [tabindex="0"]';
/**
 * 0.8: Womit das Gamepad gerade arbeitet – das oberste Fenster (letzte Ebene im Dokument), sonst die ganze Oberfläche.
 * Ohne diese Eingrenzung wanderte der Fokus in das HUD hinter einem Fenster.
 */
function focusScope(): HTMLElement | null {
  const layers = document.querySelectorAll<HTMLElement>('#ui .backdrop, #ui .death, #ui .story, #ui .lore-layer, #ui .cine, #ui .pmenu, #ui .reconnect, #ui .fatal');
  for (let i = layers.length - 1; i >= 0; i--) if (layers[i].offsetParent !== null || layers[i].getClientRects().length) return layers[i];
  return document.getElementById('ui');
}
function focusables(): HTMLElement[] {
  const scope = focusScope();
  return scope ? [...scope.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(el => el.offsetParent !== null) : [];
}
/** Setzt den Fokus in das oberste Fenster, falls er woanders (oder nirgends) liegt: zuerst der Hauptknopf, sonst das erste Element. */
function focusIntoScope(all: HTMLElement[]): boolean {
  const cur = document.activeElement as HTMLElement | null;
  if (cur && all.includes(cur)) return false;
  const first = all.find(el => el.classList.contains('btn-primary')) ?? all.find(el => !el.classList.contains('window-x')) ?? all[0];
  first?.focus({ preventScroll: true });
  return true;
}
/** Räumliche Fokus-Navigation für Gamepads in Menüs. */
function navigate(dx: number, dy: number) {
  const all = focusables();
  if (!all.length) return;
  if (focusIntoScope(all)) return;
  const cur = document.activeElement as HTMLElement;
  const r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let best: HTMLElement | null = null, bs = 1e9;
  for (const el of all) {
    if (el === cur) continue;
    const q = el.getBoundingClientRect(), ex = q.left + q.width / 2 - cx, ey = q.top + q.height / 2 - cy;
    const along = ex * dx + ey * dy, across = Math.abs(ex * dy) + Math.abs(ey * dx);
    if (along <= 4) continue;
    const s = along + across * 2.5;
    if (s < bs) { bs = s; best = el; }
  }
  if (best) { best.focus(); best.scrollIntoView({ block: 'nearest' }); audio.playSfx('ui_hover'); }
}

/** Einmal pro Frame aufrufen: fragt das Gamepad ab. */
export function pollInput(dtMs: number) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let pad: Gamepad | null = null;
  for (const p of pads) if (p && p.connected && p.mapping === 'standard') { pad = p; break; }
  if (!pad) for (const p of pads) if (p && p.connected) { pad = p; break; }
  padHeld = new Set();
  padAxis = { x: 0, y: 0 }; padAim = { x: 0, y: 0 };
  if (!pad) return;
  const dz = (v: number) => (Math.abs(v) < 0.22 ? 0 : v);
  let ax = dz(pad.axes[0] ?? 0), ay = dz(pad.axes[1] ?? 0);
  const b = (i: number) => !!pad!.buttons[i]?.pressed;
  // 0.8: auch das kleine Spieler-Menü (Gruppe, Handel, Ansehen) wird mit dem Gamepad wie ein Fenster bedient
  const inMenu = store.state.screen !== 'game' || uiBlocksGame() || !!store.state.playerMenu;
  const dpx = (b(15) ? 1 : 0) - (b(14) ? 1 : 0), dpy = (b(13) ? 1 : 0) - (b(12) ? 1 : 0);
  let any = ax !== 0 || ay !== 0;
  for (let i = 0; i < pad.buttons.length; i++) {
    const now = b(i), was = padPrev[i] ?? false;
    padPrev[i] = now;
    if (now) any = true;
    if (!now || was) continue;
    if (inMenu) {
      if (i === 0) { const all = focusables(); if (!focusIntoScope(all)) (document.activeElement as HTMLElement | null)?.click?.(); }
      else if (i === 1 || i === 9) trigger('menu');
      else if (i >= 12 && i <= 15) { navigate(dpx, dpy); navCooldown = 220; }
      continue;
    }
    for (const a in settings.pad) if (settings.pad[a as Action] === i) trigger(a as Action);
  }
  if (any && store.state.inputMode !== 'pad') store.set({ inputMode: 'pad' });
  if (inMenu) {
    if (store.state.inputMode === 'pad' && !typing()) { const all = focusables(); if (all.length) focusIntoScope(all); } // Fenster geht auf → Fokus hinein
    navCooldown -= dtMs;
    if (navCooldown <= 0 && (Math.abs(ax) > 0.5 || Math.abs(ay) > 0.5)) { navigate(Math.abs(ax) > Math.abs(ay) ? Math.sign(ax) : 0, Math.abs(ay) >= Math.abs(ax) ? Math.sign(ay) : 0); navCooldown = 200; }
    return;
  }
  for (const a in settings.pad) if (b(settings.pad[a as Action]!)) padHeld.add(a as Action);
  padAxis = { x: ax, y: ay };
  padAim = { x: dz(pad.axes[2] ?? 0), y: dz(pad.axes[3] ?? 0) };
}

export const input = {
  held(a: Action): boolean {
    if (padHeld.has(a)) return true;
    for (const k of settings.keys[a]) if (down.has(k)) return true;
    return false;
  },
  /** Flanke seit dem letzten Aufruf (verbraucht das Ereignis). */
  pressed(a: Action): boolean { const h = pressedNow.has(a); pressedNow.delete(a); return h; },
  clearPressed() { pressedNow.clear(); },
  /** Bewegungsvektor, Länge ≤ 1 */
  move(): { x: number; y: number } {
    let x = padAxis.x, y = padAxis.y;
    if (!typing()) {
      if (input.heldKey('left')) x -= 1; if (input.heldKey('right')) x += 1;
      if (input.heldKey('up')) y -= 1; if (input.heldKey('down')) y += 1;
    }
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    return { x, y };
  },
  heldKey(a: Action): boolean { for (const k of settings.keys[a]) if (down.has(k)) return true; return false; },
  padAim(): { x: number; y: number } | null { return Math.hypot(padAim.x, padAim.y) > 0.35 ? padAim : null; },
};
