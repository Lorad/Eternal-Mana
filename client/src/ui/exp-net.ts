/** Expeditionen (0.9): Nachrichten des Servers in den Zustand übernehmen (ohne Preact – net.ts bindet das ein). */
import type { ServerMsg, UiStatePatch } from './exp-types';
import { pushToast, store } from '../state/store';
import { net } from '../net/net';

export function openExpeditionState() {
  if (store.state.screen !== 'game' || store.state.cine || store.state.trade) return;
  store.set({ expWin: { at: true }, panel: null, dialog: null, craft: null, endgame: null, prompt: null, sign: null });
  net.send({ t: 'exp', a: 'info' });
}

export function onExpMsg(m: Extract<ServerMsg, { t: 'exp' }>) {
  const p: UiStatePatch = {};
  if (m.lobby !== undefined) p.expLobby = m.lobby;
  if (m.run !== undefined) { p.expRun = m.run; p.expRunAt = performance.now(); }
  if (m.result) p.expResult = m.result;
  if (m.summary) { p.expSummary = m.summary; p.expResult = null; }
  if (m.party !== undefined) p.expParty = m.party;
  if (m.weekly) p.expWeekly = m.weekly;
  if (m.forge) { p.expSummary = null; p.expWin = null; p.dialog = { npc: m.forge }; pushToast('Die Schmiede. Borin wischt sich die Hände an der Schürze ab.', 'info'); }
  // eine neue Bereitschaftsprüfung, an der ich teilnehme: das Fenster öffnen, damit ich bereit melden kann
  if (m.lobby && !store.state.expLobby && m.lobby.lead !== store.state.charId && !store.state.expWin) p.expWin = { at: false };
  store.set(p);
}
