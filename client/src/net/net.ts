/** WebSocket-Verbindung zum Spielserver inkl. automatischer Wiederverbindung. */
import { CFG } from '../../../shared/src/config';
import { emptyHome } from '../../../shared/src/data/home';
import { itemName } from '../../../shared/src/data/items';
import type { ClassId, ClientMsg, ServerMsg } from '../../../shared/src/types';
import { bus } from '../state/bus';
import { live } from '../state/live';
import { adoptServerSettings, getToken, setServerSync, settings, updateSettings } from '../state/settings';
import { pushChat, pushToast, store, type UiState } from '../state/store';
import { onExpMsg } from '../ui/exp-net';

let ws: WebSocket | null = null;
let wantOpen = false;
let retry = 0;
let retryTimer: number | undefined;
let pingTimer: number | undefined;
let resumeChar = 0;

/** Wandelt eine Nutzereingabe ("100.64.1.2", "mein-pc:7777", "http://…") in eine WebSocket-Adresse um. '' = dieser Server. */
export function toWsUrl(input: string): string {
  let s = input.trim();
  if (!s) return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
  let secure = false;
  if (/^https:\/\//i.test(s) || /^wss:\/\//i.test(s)) secure = true;
  s = s.replace(/^[a-z]+:\/\//i, '').replace(/\/.*$/, '');
  if (!/:\d+$/.test(s) && !secure) s += ':' + CFG.net.defaultPort;
  return `${secure ? 'wss' : 'ws'}://${s}/ws`;
}

function open() {
  const url = store.state.serverUrl;
  store.set({ conn: retry ? 'reconnecting' : 'connecting' });
  let sock: WebSocket;
  try { sock = new WebSocket(url); } catch { scheduleRetry(); return; }
  ws = sock;
  sock.onopen = () => {
    retry = 0;
    sock.send(JSON.stringify({ t: 'hello', token: getToken(), name: settings.playerName || 'Spieler', v: CFG.version } satisfies ClientMsg));
    clearInterval(pingTimer);
    lastRx = performance.now();
    let lastTick = lastRx;
    pingTimer = window.setInterval(() => {
      // 0.8: Antwortet der Server lange nicht (Kabel gezogen, Rechner im Ruhezustand), meldet der Browser das oft gar nicht –
      // dann stünde die Welt einfach still. Nach ein paar ausgebliebenen Antworten gilt die Verbindung als verloren.
      // Kam dieser Takt selbst verspätet (die Seite hing beim Laden einer Zone oder lag im Hintergrund), sagt die Stille
      // nichts über den Server: Dann beginnt die Frist neu, statt eine gesunde Verbindung zu kappen.
      const now = performance.now(), stalled = now - lastTick > CFG.net.pingIntervalMs * 2.5;
      lastTick = now;
      if (stalled || document.hidden) lastRx = now;
      else if (now - lastRx > SILENCE_MS && ws === sock) { try { sock.close(); } catch { /* egal */ } lost(sock); return; }
      net.send({ t: 'ping', c: now });
    }, CFG.net.pingIntervalMs);
  };
  sock.onmessage = ev => {
    rxBytes += typeof ev.data === 'string' ? ev.data.length : 0; rxMsgs++; lastRx = performance.now();
    try { handle(JSON.parse(ev.data)); } catch (e) { console.error('Nachricht fehlerhaft', e); }
  };
  sock.onclose = ev => {
    if (ev.code === 4000 && ws === sock) { ws = null; clearInterval(pingTimer); wantOpen = false; store.set({ conn: 'offline', screen: 'menu', error: 'Dieses Profil wurde in einem anderen Fenster angemeldet.' }); bus.emit('net:left'); return; }
    lost(sock);
  };
  sock.onerror = () => { /* onclose folgt */ };
}
// Leistungsanzeige (0.8): empfangene Meldungen und Bytes je Sekunde
let rxBytes = 0, rxMsgs = 0, rxAt = performance.now();
window.setInterval(() => {
  const now = performance.now(), sec = Math.max(0.001, (now - rxAt) / 1000);
  live.perf.inKb = rxBytes / 1024 / sec; live.perf.snaps = rxMsgs / sec;
  rxBytes = 0; rxMsgs = 0; rxAt = now;
}, 1000);
/** so lange darf der Server schweigen (er antwortet sonst alle zwei Sekunden auf ein Ping und schickt 20 Meldungen je Sekunde) */
const SILENCE_MS = 9000;
let lastRx = 0;
/** Die Verbindung `sock` ist weg (geschlossen oder verstummt): neu verbinden, falls gewünscht. */
function lost(sock: WebSocket) {
  if (ws !== sock) return;
  ws = null;
  clearInterval(pingTimer);
  if (wantOpen) scheduleRetry(); else store.set({ conn: 'offline' });
}
function scheduleRetry() {
  retry++;
  store.set({ conn: 'reconnecting' });
  clearTimeout(retryTimer);
  retryTimer = window.setTimeout(open, Math.min(8000, 500 * 2 ** Math.min(retry, 4)));
}

function handle(m: ServerMsg) {
  const st = store.state;
  switch (m.t) {
    case 's': bus.emit('net:snap', m); break;
    case 'pong': store.set({ ping: Math.round(performance.now() - m.c) }); break;
    case 'welcome':
      adoptServerSettings(m.settings);
      store.set({ conn: 'online', chars: m.chars, serverInfo: m.server, error: null,
        // 0.8: Nach einem Update des Servers passt der schon geladene Client nicht mehr – das sagen, statt seltsam weiterzulaufen
        stale: m.server?.version && m.server.version !== CFG.version
          ? `Der Server läuft mit Version ${m.server.version}, hier ist noch Version ${CFG.version} geladen. ${store.state.serverUrl.includes(location.host) ? 'Lade die Seite neu, damit beide zusammenpassen.' : 'Bringt beide Installationen auf denselben Stand (Launcher) und ladet neu.'}`
          : null });
      if (st.screen === 'game' || st.screen === 'loading') {
        // Wiederverbindung: Der Server schickt 'entered', falls der Charakter noch in der Welt steht – sonst neu betreten.
        window.setTimeout(() => { if (store.state.conn === 'online' && resumeChar && !resumed) net.send({ t: 'enter', id: resumeChar }); }, 400);
        resumed = false;
      } else store.set({ screen: 'chars' });
      break;
    case 'chars': store.set({ chars: m.chars, error: null }); if (st.screen === 'game' || st.screen === 'loading') { store.set({ screen: 'chars', char: null, panel: null, dialog: null, boss: null, dead: null }); bus.emit('net:left'); } break;
    case 'entered':
      resumed = true; resumeChar = m.charId;
      store.set({ char: m.char, charId: m.charId, myId: m.init.you, zone: m.init.zone, screen: 'loading', dead: null, boss: null, target: null, craft: null, tod: m.init.tod, weather: m.init.weather, cds: {}, buffs: [], panel: null, dialog: null, dlgNode: null, lore: null,
        rift: m.init.rift ?? null, riftAt: performance.now(), kreis: m.init.kreis ?? 0, endgame: null, heim: m.init.heim ?? null, hof: null,
        trade: null, tradeReq: null, qOffers: [], inspect: null, playerMenu: null, invite: null, trackerOpen: false, loadFail: null });
      bus.emit('net:entered', m.init);
      break;
    case 'zone':
      store.set({ zone: m.init.zone, myId: m.init.you, screen: 'loading', boss: null, target: null, craft: null, dead: null, tod: m.init.tod, weather: m.init.weather, dialog: null, dlgNode: null, lore: null, sign: null, keys: 0,
        rift: m.init.rift ?? null, riftAt: performance.now(), kreis: m.init.kreis ?? 0, endgame: null, enc: null, wshop: null, heim: m.init.heim ?? null, hof: null, inspect: null, playerMenu: null, trackerOpen: false, loadFail: null });
      bus.emit('net:zone', m.init);
      break;
    case 'pos': bus.emit('net:pos', m); break;
    case 'char': if (st.char) store.set({ char: { ...st.char, ...m.d } }); break;
    case 'cd': store.set({ cds: { ...st.cds, [m.id]: { until: performance.now() + m.cd * 1000, total: m.cd } } }); break;
    case 'buffs': store.set({ buffs: m.b.map(b => ({ id: b.id, name: b.name, glyph: b.glyph, until: performance.now() + b.dur * 1000, icon: b.icon, desc: b.desc, mods: b.mods })) }); break;
    case 'drop+': bus.emit('net:drop+', m.d); break;
    case 'drop-': bus.emit('net:drop-', m.id, m.got); break;
    case 'toast': pushToast(m.s, m.kind ?? 'info', m.icon); break;
    case 'loot': pushToast(itemName(m.item) + ((m.item.qty ?? 1) > 1 ? ` ×${m.item.qty}` : ''), 'loot', undefined, m.item); break;
    case 'chat': pushChat(m.from, m.s, m.ch); break;
    // invite gesetzt = neue Einladung, null = erloschen; eine Gruppenliste räumt eine alte Einladung weg
    case 'party': store.set({ party: m.members, invite: m.invite !== undefined ? (m.invite ? { ...m.invite, until: performance.now() + (m.invite.sec ?? 30) * 1000 } : null) : m.members.length ? null : st.invite }); break;
    case 'dead': store.set({ dead: { by: m.by }, panel: null, dialog: null, craft: null, endgame: null, inspect: null, playerMenu: null }); break;
    case 'story': store.set({ story: { title: m.title ?? '', lines: m.lines } }); break;
    // ---- Story (ab 0.3)
    case 'dlg': store.set({ dlgNode: m.node ? { npc: m.npc, topic: m.topic, node: m.node, seq: (st.dlgNode?.seq ?? 0) + 1 } : null }); break;
    case 'cine': bus.emit('cine:play', m.id); break;
    case 'lore': store.set({ lore: { id: m.id, first: !!m.first }, sign: null, prompt: null }); break;
    case 'rift': store.set({ rift: m.r, riftAt: performance.now() }); break; // Endspiel (0.5)
    case 'exp': onExpMsg(m); break; // Expeditionen (0.9)
    // ---- Lebendige Welt (0.6)
    case 'world': store.set({ world: m.w, worldAt: performance.now(), ...(st.wshop?.kind === 'trader' && !m.w.trader ? { wshop: null } : {}) }); break;
    case 'encdlg': store.set(m.d ? { enc: m.d, dialog: null, panel: null, prompt: null } : { enc: null }); break;
    // ---- Gemeinsam (0.7)
    case 'trade': {
      const patch: Partial<UiState> = {};
      if (m.tr !== undefined) Object.assign(patch, { trade: m.tr, tradeAt: performance.now() }, m.tr && !st.trade ? { panel: null, dialog: null, craft: null, endgame: null, wshop: null, inspect: null, playerMenu: null, chatOpen: false, tradeReq: null } : {});
      if (m.req !== undefined) patch.tradeReq = m.req ? { from: m.req.from, name: m.req.name, until: performance.now() + m.req.sec * 1000 } : null;
      store.set(patch);
      break;
    }
    case 'qOffer': store.set({ qOffers: [...st.qOffers.filter(o => o.id !== m.id), ...(m.sec > 0 ? [{ id: m.id, from: m.from, until: performance.now() + m.sec * 1000 }] : [])] }); break;
    case 'inspect': store.set({ inspect: m.i, playerMenu: null }); break;
    // ---- Zuhause (0.7): geänderte Teile des Profil-Stands; Hinweise der Sammlung erscheinen wie Toasts
    case 'home': store.set({ home: { ...(st.home ?? emptyHome()), ...m.h } }); for (const x of m.note ?? []) pushToast(x.s, x.kind, x.icon); break;
    case 'env': store.set({ ...(m.weather !== undefined ? { weather: m.weather } : {}), ...(m.tod !== undefined ? { tod: m.tod } : {}) }); bus.emit('net:env'); break;
    case 'online': store.set({ online: m.players }); break;
    case 'saved': store.set({ saved: Date.now() }); pushToast('Spielstand gespeichert.', 'good'); break;
    case 'err':
      // 0.8: Fehler des Servers erreichen den Spieler auf jedem Bildschirm – im Spiel als Meldung, beim Laden mit Rückweg
      if (st.screen === 'game') pushToast(m.s, 'bad');
      else if (st.screen === 'loading') { store.set({ error: m.s, screen: st.chars.length || st.conn === 'online' ? 'chars' : 'menu', char: null }); bus.emit('net:left'); }
      else store.set({ error: m.s });
      break;
  }
}
let resumed = false;

export const net = {
  /** Verbindet mit einem Server. address '' = der Server, von dem die Seite geladen wurde. */
  connect(address = '') {
    net.disconnect();
    updateSettings({ lastServer: address });
    wantOpen = true; retry = 0; resumeChar = 0;
    store.set({ serverUrl: toWsUrl(address), error: null });
    open();
  },
  disconnect() {
    wantOpen = false;
    clearTimeout(retryTimer); clearInterval(pingTimer);
    const s = ws; ws = null;
    try { s?.close(); } catch { /* egal */ }
    store.set({ conn: 'offline' });
  },
  send(m: ClientMsg) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); },
  get connected() { return !!ws && ws.readyState === 1; },
  /** Kappt die Verbindung, als wäre sie abgerissen – das Spiel verbindet danach von selbst neu (für die Browser-Durchläufe). */
  dropForTest() { const s = ws; if (s) { try { s.close(); } catch { /* egal */ } lost(s); } },
  createChar(slot: number, name: string, cls: ClassId) { store.set({ error: null }); net.send({ t: 'charCreate', slot, name, cls }); },
  deleteChar(id: number) { net.send({ t: 'charDelete', id }); },
  enter(id: number) { resumeChar = id; store.set({ screen: 'loading' }); net.send({ t: 'enter', id }); },
  /** Zurück zur Charakterauswahl (speichert serverseitig). */
  leaveWorld() { resumeChar = 0; net.send({ t: 'leave' }); },
  /** Verbindung trennen und zurück ins Hauptmenü. */
  quitToMenu() { resumeChar = 0; net.send({ t: 'leave' }); window.setTimeout(() => { net.disconnect(); store.set({ screen: 'menu', char: null, panel: null }); bus.emit('net:left'); }, 150); },
};
setServerSync(json => net.send({ t: 'settings', data: json }));
bus.on('ui:tradeCancel', () => net.send({ t: 'trade', a: 'cancel' })); // Esc im Handelsfenster
