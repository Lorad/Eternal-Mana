/** Zentraler UI-Zustand (reaktiv). Die Preact-Oberfläche liest ihn über `useStore`. */
import { useEffect, useState } from 'preact/hooks';
import type { CharData, CharSummary, ClassId, Element, EncDialog, ItemInstance, Mods, PartyMember, ServerInfo, WorldInfo } from '../../../shared/src/types';
import { bus } from './bus';

export type Panel = 'inventory' | 'character' | 'skills' | 'quests' | 'map' | 'settings' | 'party' | 'menu' | 'help' | 'ruf';
export interface Toast { id: number; s: string; kind: 'info' | 'good' | 'bad' | 'loot' | 'quest' | 'story'; icon?: string; item?: ItemInstance }
export interface ChatLine { id: number; from: string; s: string; ch: 'all' | 'party' | 'sys' }
/** Sichtbarer Zustand einer laufenden Filmszene (gesteuert von game/cinematic.ts) */
export interface CineView { id: string; bars: boolean; title: { s: string; sub?: string } | null; line: { who?: string; s: string } | null; fade: number; fadeMs: number }

export interface UiState {
  /** boot = Grafik wird erzeugt · menu = Hauptmenü · chars = Charakterauswahl · loading = Zone lädt · game = im Spiel */
  screen: 'boot' | 'menu' | 'chars' | 'loading' | 'game';
  bootProgress: number;            // 0..1
  conn: 'offline' | 'connecting' | 'online' | 'reconnecting';
  ping: number;                    // ms
  serverUrl: string;               // aktuelle WebSocket-Adresse
  serverInfo: ServerInfo | null;
  error: string | null;            // letzte Fehlermeldung des Servers (z. B. Name vergeben)
  chars: CharSummary[];
  online: { id: number; name: string; cls: ClassId; level: number; zone: string }[];
  char: CharData | null;
  charId: number;
  myId: number;                    // eigene Entity-ID
  me: { hp: number; maxHp: number; mp: number; maxMp: number; flags: number };
  zone: string;
  keys: number;                    // Schlüssel im aktuellen Dungeon
  /** Abklingzeiten: id → { until: performance.now()-Zeitpunkt, total: Sekunden }. Sonder-IDs: '_potion', '_dodge', '_attack' */
  cds: Record<string, { until: number; total: number }>;
  buffs: { id: string; name: string; glyph: string; until: number; icon?: string; desc?: string; mods?: Mods }[];
  party: PartyMember[];
  invite: { from: number; name: string } | null;
  boss: { id: number; name: string; hp: number; maxHp: number; phase: number; el: Element; weak?: Element[]; resist?: Element[] } | null;
  /** Gegner, den man gerade bekämpft oder anvisiert – mit Schwächen und Resistenzen (0.4) */
  target: { id: number; name: string; lvl: number; hp: number; maxHp: number; el: Element; elite: boolean; weak: Element[]; resist: Element[] } | null;
  /** offenes Handwerksfenster: `at` = NPC-ID oder 'fire' (Lagerfeuer), `station` = Art der Station */
  craft: { at: string; station: string } | null;
  toasts: Toast[];
  chat: ChatLine[];
  chatOpen: boolean;
  panel: Panel | null;
  /** offener NPC-Dialog (npc = NPC-ID aus shared/data/npcs) */
  dialog: { npc: string } | null;
  sign: string | null;             // Text eines Schildes / einer Inschrift
  story: { title: string; lines: string[] } | null;
  // ---- Story (ab 0.3)
  /** laufendes Gesprächsthema: vom Server bestätigter Knoten (seq zählt Wechsel, damit gleiche Knoten neu beginnen) */
  dlgNode: { npc: string; topic: string; node: string; seq: number } | null;
  /** laufende Filmszene */
  cine: CineView | null;
  /** geöffnetes Chronik-Dokument */
  lore: { id: string; first: boolean } | null;
  dead: { by: string } | null;
  /** Interaktionshinweis über dem HUD, z. B. "Truhe öffnen" */
  prompt: string | null;
  nearStone: boolean;              // steht an einem Quellstein → Weltkarte erlaubt Schnellreise
  tod: number;                     // Tageszeit 0..1 (0 = Mitternacht, 0.5 = Mittag)
  weather: string;
  inputMode: 'kbm' | 'pad';
  // ---- Lebendige Welt (0.6)
  /** Jahreszeit, laufende Ereignisse, Angebot der Fahrenden Händlerin; `worldAt` = performance.now() beim Empfang (für Restzeiten) */
  world: WorldInfo | null;
  worldAt: number;
  /** Gespräch einer Begegnung am Weg (der Server führt es) */
  enc: EncDialog | null;
  /** offenes Fenster: Vorräte / Spenden einer Fraktion oder Ware der Fahrenden Händlerin */
  wshop: { kind: 'faction' | 'donate' | 'trader'; npc: string } | null;
  saved: number;                   // Zeitstempel der letzten Speicherbestätigung
}

const state: UiState = {
  screen: 'boot', bootProgress: 0, conn: 'offline', ping: 0, serverUrl: '', serverInfo: null, error: null,
  chars: [], online: [], char: null, charId: 0, myId: 0,
  me: { hp: 1, maxHp: 1, mp: 0, maxMp: 1, flags: 0 }, zone: '', keys: 0,
  cds: {}, buffs: [], party: [], invite: null, boss: null, target: null, craft: null, toasts: [], chat: [], chatOpen: false,
  panel: null, dialog: null, sign: null, story: null, dlgNode: null, cine: null, lore: null, dead: null, prompt: null, nearStone: false,
  tod: 0.4, weather: 'clear', inputMode: 'kbm', saved: 0, world: null, worldAt: 0, enc: null, wshop: null,
};

const listeners = new Set<() => void>();
let scheduled = false;
function notify() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => { scheduled = false; for (const fn of [...listeners]) fn(); });
}

export const store = {
  get state(): Readonly<UiState> { return state; },
  /** Flaches Zusammenführen; löst ein Re-Render aller betroffenen Komponenten aus. */
  set(patch: Partial<UiState>) {
    let changed = false;
    for (const k in patch) if ((state as any)[k] !== (patch as any)[k]) { (state as any)[k] = (patch as any)[k]; changed = true; }
    if (changed) notify();
  },
  subscribe(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); },
};

/** Hook: abonniert einen Ausschnitt des Zustands. Re-Render nur, wenn sich der Ausschnitt (===) ändert. */
export function useStore<T>(sel: (s: UiState) => T): T {
  const [v, setV] = useState(() => sel(state));
  useEffect(() => {
    const check = () => setV(sel(state));
    check();
    return store.subscribe(check) as unknown as () => void;
  }, []);
  return v;
}

let toastId = 1;
export function pushToast(s: string, kind: Toast['kind'] = 'info', icon?: string, item?: ItemInstance) {
  const t: Toast = { id: toastId++, s, kind, icon, item };
  store.set({ toasts: [...state.toasts.slice(-5), t] });
  setTimeout(() => store.set({ toasts: state.toasts.filter(x => x.id !== t.id) }), kind === 'story' ? 9000 : kind === 'quest' ? 4500 : 3800);
}
let chatId = 1;
export function pushChat(from: string, s: string, ch: ChatLine['ch']) {
  store.set({ chat: [...state.chat.slice(-60), { id: chatId++, from, s, ch }] });
}
/** Öffnet/schließt ein Fenster (gleiches Fenster erneut = schließen). */
export function togglePanel(p: Panel) {
  if (state.screen !== 'game' || state.cine) return;
  store.set({ panel: state.panel === p ? null : p, dialog: null, sign: null, craft: null, lore: null, wshop: null });
}
/** Schließt das oberste offene Element. Gibt true zurück, wenn etwas geschlossen wurde. */
export function closeTop(): boolean {
  if (state.cine) { bus.emit('cine:skip'); return true; }
  if (state.lore) { store.set({ lore: null }); return true; }
  if (state.story) { store.set({ story: null }); return true; }
  if (state.sign) { store.set({ sign: null }); return true; }
  if (state.enc) { store.set({ enc: null }); return true; }
  if (state.wshop) { store.set({ wshop: null }); return true; }
  if (state.craft) { store.set({ craft: null }); return true; }
  if (state.dialog) { store.set({ dialog: null, dlgNode: null }); return true; }
  if (state.panel) { store.set({ panel: null }); return true; }
  if (state.chatOpen) { store.set({ chatOpen: false }); return true; }
  return false;
}
/** true, wenn ein Fenster offen ist, das Spieleingaben (Angriff usw.) blockieren soll */
export function uiBlocksGame(): boolean {
  return !!(state.panel || state.dialog || state.craft || state.sign || state.story || state.chatOpen || state.dead || state.cine || state.lore || state.enc || state.wshop);
}
