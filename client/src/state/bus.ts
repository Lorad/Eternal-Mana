/** Winziger Ereignisbus zwischen Netzwerk, Spielszene und Oberfläche. */
type Fn = (...a: any[]) => void;
const map = new Map<string, Set<Fn>>();
export const bus = {
  on(ev: string, fn: Fn) { let s = map.get(ev); if (!s) map.set(ev, (s = new Set())); s.add(fn); return () => s!.delete(fn); },
  off(ev: string, fn: Fn) { map.get(ev)?.delete(fn); },
  emit(ev: string, ...a: any[]) { const s = map.get(ev); if (s) for (const fn of [...s]) fn(...a); },
};
/**
 * Ereignisse:
 *  UI → Spiel:   'ui:skill'(slot 0-3) · 'ui:quick'('hp'|'mp') · 'ui:interact' · 'ui:fullscreen'
 *  Netz → Spiel: 'net:entered'(ZoneInit) · 'net:zone'(ZoneInit) · 'net:snap'(msg) · 'net:pos'(msg) · 'net:drop+'(DropInfo) · 'net:drop-'(id, got) · 'net:env' · 'net:left'
 *  Spiel → UI:   'game:ready' (Zone geladen und sichtbar)
 */
