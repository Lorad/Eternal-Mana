/**
 * Wenn etwas schiefgeht (0.8): eine Leiste am oberen Rand, die sagt, was los ist, und einen Weg weiter anbietet –
 * statt eines stehenden Bildes. Zwei Fälle: der Server läuft mit einer anderen Version (`stale`) oder das Spiel selbst
 * meldet wiederholt Fehler (`fatal`).
 */
import { store, useStore } from '../state/store';
import { Btn } from './common';

export function FatalBar() {
  const fatal = useStore(s => s.fatal);
  const stale = useStore(s => s.stale);
  if (!fatal && !stale) return null;
  return (
    <div class="fatal" role="alert">
      <div class="grow">
        <b>{stale ? 'Neue Version' : 'Etwas ist schiefgegangen'}</b>
        <span>{stale ?? fatal}</span>
      </div>
      <Btn kind="primary" onClick={() => location.reload()}>Seite neu laden</Btn>
      <Btn onClick={() => store.set(stale ? { stale: null } : { fatal: null })}>{stale ? 'Später' : 'Weiterspielen'}</Btn>
    </div>
  );
}

/** Meldet unerwartete Fehler der Seite als Leiste (höchstens einmal je Minute, nie für Kleinigkeiten des Browsers). */
export function watchErrors() {
  let last = -1e9;
  const report = (msg: string) => {
    if (/ResizeObserver|AbortError|NotAllowedError|play\(\) request|Script error/i.test(msg)) return;
    const now = performance.now(), st = store.state;
    if (now - last < 60000 || st.fatal || (st.screen !== 'game' && st.screen !== 'loading')) return;
    last = now;
    store.set({ fatal: `Im Spiel ist ein Fehler aufgetreten (${msg.slice(0, 140)}). Wenn etwas hängt, lade die Seite neu – dein Spielstand liegt sicher beim Server.` });
  };
  window.addEventListener('error', e => report(e.message || String(e.error ?? 'unbekannt')));
  window.addEventListener('unhandledrejection', e => report(String((e.reason && (e.reason.message ?? e.reason)) ?? 'unbekannt')));
}
