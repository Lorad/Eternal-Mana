/** Kleine Schalter des HUD, die Einstellungen und flüchtigen Zustand zusammen brauchen (0.8). */
import { settings, updateSettings } from './settings';
import { store } from './store';

/** Ist die Questverfolgung gerade von selbst eingeklappt (Mana-Riss oder Bosskampf)? */
export function trackerBusy(): boolean { const s = store.state; return !!s.rift || !!s.boss; }
/**
 * Klappt die Questverfolgung um – immer bezogen auf das, was man gerade sieht: Ist sie zu (von Hand oder von selbst),
 * geht sie auf und bleibt in dieser Zone offen; ist sie offen, geht sie zu und bleibt es überall.
 */
export function toggleTracker() {
  const shut = settings.trackerCollapsed || (trackerBusy() && !store.state.trackerOpen);
  if (shut) { updateSettings({ trackerCollapsed: false }); store.set({ trackerOpen: true }); }
  else { updateSettings({ trackerCollapsed: true }); store.set({ trackerOpen: false }); }
}
