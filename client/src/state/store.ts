/** Zentraler UI-Zustand (reaktiv). Die Preact-Oberfläche liest ihn über `useStore`. */
import { useEffect, useState } from 'preact/hooks';
import type { CharData, CharSummary, ClassId, Element, EncDialog, HomeData, HubStock, LfgEntry, ExpLobbyInfo, ExpResult, ExpRunInfo, InspectInfo, ItemInstance, Mods, PartyInvite, PartyMember, RiftInfo, ServerInfo, TradeView, WorldInfo, ZoneInit } from '../../../shared/src/types';
import { bus } from './bus';

export type Panel = 'inventory' | 'character' | 'skills' | 'quests' | 'map' | 'settings' | 'party' | 'menu' | 'help' | 'ruf' | 'sammlung';
export interface Toast { id: number; s: string; kind: 'info' | 'good' | 'bad' | 'loot' | 'quest' | 'story'; icon?: string; item?: ItemInstance }
export interface ChatLine { id: number; from: string; s: string; ch: 'all' | 'party' | 'sys' }
/** Sichtbarer Zustand einer laufenden Filmszene (gesteuert von game/cinematic.ts) */
export interface CineView { id: string; bars: boolean; title: { s: string; sub?: string } | null; line: { who?: string; s: string } | null; fade: number; fadeMs: number; /** 0.8: Nachfrage „wirklich überspringen?“ läuft */ skipAsk?: boolean }

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
  /** offene Gruppeneinladung; `until` = performance.now()-Zeitpunkt, zu dem sie verfällt (0.7) */
  invite: (PartyInvite & { until?: number }) | null;
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
  // ---- Endspiel (0.5)
  /** laufender Mana-Riss und der Zeitpunkt (performance.now), zu dem `rift.t` galt – daraus läuft die Uhr im HUD */
  rift: RiftInfo | null; riftAt: number;
  /** Kreis der Welt, in der man gerade steht */
  kreis: number;
  /** offenes Endspiel-Fenster: Reiter; `stone` = am Riss-Stein geöffnet, `npc` = im Gespräch (Neuer Kreis bei Mirelda) */
  endgame: { tab: 'risse' | 'quell' | 'kreis'; stone?: boolean; npc?: string } | null;
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
  // ---- Gemeinsam (0.7)
  /** laufender Handel (`tradeAt` = performance.now() beim Empfang, für die Sperrfrist) und offene Handelsanfrage an mich */
  trade: TradeView | null; tradeAt: number;
  tradeReq: { from: number; name: string; until: number } | null;
  /** von Gruppenmitgliedern angebotene Quests */
  qOffers: { id: string; from: string; until: number }[];
  /** angesehener Spieler (nur lesen) */
  inspect: InspectInfo | null;
  /** kleines Menü zu einem anderen Spieler (Klick auf die Figur, den Gruppenrahmen oder die Online-Liste) */
  playerMenu: { id: number; name: string; cls: ClassId; level: number; near?: boolean } | null;
  // ---- Zuhause (0.7)
  /** Stand des Profils: Hof, Lagertruhe, Begleiter, Erscheinungen, Sammlung (der Server schickt geänderte Teile) */
  home: HomeData | null;
  /** man steht auf einem Hof: wem er gehört */
  heim: ZoneInit['heim'] | null;
  /** offenes Hof-Fenster: Reiter (lager, ausbau, trophaeen, schrank) oder 'weg' = Auswahl am Wegweiser; `slot` = angewählter Trophäenständer */
  hof: { tab: string; slot?: number } | null;
  /** Reiter, mit dem das Fenster „Sammlung“ aufgeht */
  sammlungTab: string;
  saved: number;                   // Zeitstempel der letzten Speicherbestätigung
  // ---- Feinschliff (0.8)
  /** Questverfolgung in dieser Zone von Hand aufgeklappt, obwohl sie sich (Mana-Riss, Bosskampf) von selbst einklappt */
  trackerOpen: boolean;
  /** gerade gezeigter Hinweis (ID aus state/hints.ts) */
  hint: string | null;
  /** Kapitel, mit dem das Handbuch aufgeht */
  helpTab: string;
  /** Zone ließ sich nicht aufbauen: Meldung auf dem Ladebildschirm mit Ausweg */
  loadFail: string | null;
  /** schwerer Fehler im Spiel selbst: bleibt als Leiste stehen, bis neu geladen oder weggeklickt wird */
  fatal: string | null;
  /** der Server läuft mit einer anderen Version als dieser Browser geladen hat (nach einem Update) */
  stale: string | null;
  // ---- Quellwarte (0.9)
  /** offenes Fenster einer Einrichtung der Quellwarte: Reiter (haendler, meister, lager, geruechte, gesuche, halle, karte) */
  hubWin: { tab: string } | null;
  /** Angebot des Ausrüstungshändlers (vom Server) und Gruppengesuche am Brett (`lfgAt` = performance.now() beim Empfang) */
  hubStock: HubStock | null;
  lfg: LfgEntry[]; lfgAt: number;
  // ---- Expeditionen (0.9; Oberfläche: ui/expedition.tsx)
  /** Auswahlfenster am Portal offen (`stone` = am Portal geöffnet) */
  expWin: { at: boolean } | null;
  expLobby: ExpLobbyInfo | null;
  /** laufender Lauf (HUD) und Zeitpunkt (performance.now), zu dem `t` galt */
  expRun: ExpRunInfo | null; expRunAt: number;
  /** Abschlussbildschirm (in der Belohnungskammer) und Zusammenfassung nach der Rückkehr */
  expResult: ExpResult | null; expSummary: ExpResult | null;
  /** laufende Instanz der eigenen Gruppe · Herausforderung der Woche */
  expParty: { exp: string; diff: string; n: number } | null;
  expWeekly: { week: string; exp: string; diff: string; mods: string[]; done: boolean } | null;
}

const state: UiState = {
  screen: 'boot', bootProgress: 0, conn: 'offline', ping: 0, serverUrl: '', serverInfo: null, error: null,
  chars: [], online: [], char: null, charId: 0, myId: 0,
  me: { hp: 1, maxHp: 1, mp: 0, maxMp: 1, flags: 0 }, zone: '', keys: 0,
  cds: {}, buffs: [], party: [], invite: null, boss: null, target: null, craft: null, toasts: [], chat: [], chatOpen: false,
  panel: null, dialog: null, sign: null, story: null, dlgNode: null, cine: null, lore: null, dead: null, prompt: null, nearStone: false,
  rift: null, riftAt: 0, kreis: 0, endgame: null,
  tod: 0.4, weather: 'clear', inputMode: 'kbm', saved: 0, world: null, worldAt: 0, enc: null, wshop: null,
  trade: null, tradeAt: 0, tradeReq: null, qOffers: [], inspect: null, playerMenu: null,
  home: null, heim: null, hof: null, sammlungTab: 'uebersicht',
  trackerOpen: false, hint: null, helpTab: 'start', loadFail: null, fatal: null, stale: null,
  hubWin: null, hubStock: null, lfg: [], lfgAt: 0,
  expWin: null, expLobby: null, expRun: null, expRunAt: 0, expResult: null, expSummary: null, expParty: null, expWeekly: null,
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
/** Öffnet das Handbuch (0.8), auf Wunsch gleich mit einem bestimmten Kapitel. */
export function openHelp(tab?: string) {
  if (state.screen !== 'game' || state.cine || state.trade) return;
  store.set({ ...(tab ? { helpTab: tab } : {}), panel: 'help', dialog: null, sign: null, craft: null, lore: null, endgame: null, wshop: null, hof: null, inspect: null, playerMenu: null, hubWin: null });
}
/** Öffnet/schließt ein Fenster (gleiches Fenster erneut = schließen). */
export function togglePanel(p: Panel) {
  if (state.screen !== 'game' || state.cine) return;
  if (state.trade) return; // erst den Handel beenden
  store.set({ panel: state.panel === p ? null : p, dialog: null, sign: null, craft: null, lore: null, endgame: null, wshop: null, hof: null, inspect: null, playerMenu: null, hubWin: null });
}
/** Schließt das oberste offene Element. Gibt true zurück, wenn etwas geschlossen wurde. */
export function closeTop(): boolean {
  if (state.cine) { bus.emit('cine:skip'); return true; }
  if (state.lore) { store.set({ lore: null }); return true; }
  if (state.story) { store.set({ story: null }); return true; }
  if (state.sign) { store.set({ sign: null }); return true; }
  if (state.playerMenu) { store.set({ playerMenu: null }); return true; }
  if (state.inspect) { store.set({ inspect: null }); return true; }
  if (state.trade) { bus.emit('ui:tradeCancel'); return true; }
  if (state.enc) { store.set({ enc: null }); return true; }
  if (state.wshop) { store.set({ wshop: null }); return true; }
  if (state.hof) { store.set({ hof: null }); return true; }
  if (state.hubWin) { store.set({ hubWin: null }); return true; }
  if (state.craft) { store.set({ craft: null }); return true; }
  if (state.expResult) { store.set({ expResult: null }); return true; }
  if (state.expWin) { store.set({ expWin: null }); return true; }
  if (state.expSummary) { store.set({ expSummary: null }); return true; }
  if (state.endgame) { store.set({ endgame: null }); return true; }
  if (state.dialog) { store.set({ dialog: null, dlgNode: null }); return true; }
  if (state.panel) { store.set({ panel: null }); return true; }
  if (state.chatOpen) { store.set({ chatOpen: false }); return true; }
  return false;
}
/** true, wenn ein Fenster offen ist, das Spieleingaben (Angriff usw.) blockieren soll */
export function uiBlocksGame(): boolean {
  return !!(state.panel || state.dialog || state.craft || state.endgame || state.sign || state.story || state.chatOpen || state.dead || state.cine || state.lore || state.enc || state.wshop || state.hof || state.trade || state.inspect || state.hubWin || state.expWin || state.expResult);
}
