/** Hinweise im Spiel (0.8): eine kleine Karte über der Aktionsleiste. Regeln und Texte: state/hints.ts. */
import { useEffect, useRef } from 'preact/hooks';
import { HINT, hintBlocked, hintText, markSeen, nextHint } from '../state/hints';
import { settings, updateSettings } from '../state/settings';
import { openHelp, store, useStore } from '../state/store';
import { Btn, sfx, useSettings } from './common';
import { useHint } from './hud';

/** so lange bleibt ein Hinweis stehen, wenn ihn niemand wegklickt (Gamepad-Spieler können ihn nicht anklicken) */
const SHOW_MS = 18000;
/** Pause zwischen zwei Hinweisen */
const GAP_MS = 6000;
/**
 * `?hinweise=aus` in der Adresse schaltet die Hinweise für diesen Seitenaufruf ab, ohne die Einstellung zu ändern –
 * so laufen die Browser-Durchläufe (tests/e2e, über scripts/e2e-all.mjs) unbeeinflusst von Karten, die sich über Knöpfe legen.
 */
const OFF = typeof location !== 'undefined' && /[?&]hinweise=aus\b/.test(location.search);

function done(id: string) {
  if (store.state.hint === id) store.set({ hint: null });
  if (!settings.hintsSeen.includes(id)) updateSettings({ hintsSeen: markSeen(settings.hintsSeen, id) });
}

/**
 * Beobachtet den Zustand (zweimal je Sekunde – billig und träge genug, damit nichts aufflackert) und zeigt den nächsten
 * fälligen Hinweis. Ein Hinweis gilt als gesehen, sobald er weggeklickt wurde oder seine Zeit abgelaufen ist.
 */
export function useHintWatcher() {
  const s = useSettings();
  const last = useRef<{ cand: string | null; shownAt: number; freeAt: number }>({ cand: null, shownAt: 0, freeAt: 0 });
  useEffect(() => {
    const t = window.setInterval(() => {
      const st = store.state, now = performance.now(), l = last.current;
      if (st.hint) {
        const cur = HINT[st.hint];
        if (!settings.hints || OFF || !cur) { store.set({ hint: null }); return; }
        // Fenster-Hinweis: Das Fenster ist zu → erledigt. Karte im HUD: Solange etwas darüber liegt, läuft ihre Zeit nicht.
        let still = true;
        try { still = cur.when(st); } catch { still = false; }
        if (cur.win && !still) { done(st.hint); l.freeAt = now + GAP_MS; return; }
        if (!cur.win && hintBlocked(st)) {
          // Ein Fenster liegt darüber: Gehört ein Hinweis in dieses Fenster, geht er vor. Die Karte bleibt ungesehen und kommt später wieder.
          const w = nextHint(st, settings.hintsSeen, settings.hints && !OFF);
          if (w?.win) { l.cand = null; l.shownAt = now; l.freeAt = 0; store.set({ hint: w.id }); sfx('ui_tab'); return; }
          l.shownAt += 500; return;
        }
        if (now - l.shownAt > SHOW_MS) { done(st.hint); l.freeAt = now + GAP_MS; }
        return;
      }
      if (l.shownAt && !l.freeAt) l.freeAt = now + GAP_MS;   // gerade weggeklickt: kurze Pause
      if (now < l.freeAt) return;
      const h = nextHint(st, settings.hintsSeen, settings.hints && !OFF);
      // erst zeigen, wenn die Bedingung zwei Abfragen lang gilt – kurze Zwischenzustände lösen nichts aus
      if (h && l.cand === h.id) { l.cand = null; l.shownAt = now; l.freeAt = 0; store.set({ hint: h.id }); sfx('ui_tab'); }
      else l.cand = h?.id ?? null;
    }, 500);
    return () => clearInterval(t);
  }, [s.hints]);
}

/** Karte über der Aktionsleiste – für alles, was nicht in ein Fenster gehört */
export function HintCard() {
  const id = useStore(s => s.hint);
  const key = useHint();
  const h = id ? HINT[id] : null;
  if (!h || h.win) return null;
  return (
    <div class="hint" role="status" aria-live="polite">
      <i class="hint-mark">i</i>
      <div class="hint-body">
        <b>{h.title}</b>
        <p>{hintText(h, key)}</p>
        <div class="hint-foot">
          {h.topic && <button type="button" class="hint-link" onClick={() => { done(h.id); openHelp(h.topic); }}>Mehr im Handbuch</button>}
          <button type="button" class="hint-link dim" title="Lässt sich in den Einstellungen wieder einschalten" onClick={() => { done(h.id); updateSettings({ hints: false }); }}>Hinweise abschalten</button>
          <span class="grow" />
          <Btn kind="small" onClick={() => done(h.id)}>Verstanden</Btn>
        </div>
      </div>
    </div>
  );
}

/**
 * Zeile unter dem Fensterkopf – für Hinweise, die zu einem offenen Fenster gehören (Handwerk, Lagertruhe, Handel …).
 * `Window` und das NPC-Gespräch binden sie ein; ohne fälligen Fenster-Hinweis nimmt sie keinen Platz ein.
 */
export function WindowHint() {
  const id = useStore(s => s.hint);
  const key = useHint();
  const h = id ? HINT[id] : null;
  if (!h || !h.win) return null;
  return (
    <div class="hint-strip" role="status" aria-live="polite">
      <i class="hint-mark">i</i>
      <p><b>{h.title}:</b> {hintText(h, key)}</p>
      <Btn kind="small" onClick={() => done(h.id)}>Verstanden</Btn>
    </div>
  );
}
