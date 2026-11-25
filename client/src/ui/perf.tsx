/** Leistungsanzeige (0.8, Standardtaste F3): Bilder pro Sekunde, Bildzeit, Verzögerung, Menge der Objekte – zum Eingrenzen von Rucklern. */
import { useRef } from 'preact/hooks';
import { live } from '../state/live';
import { store } from '../state/store';
import { useSettings, useTick } from './common';

export function PerfOverlay() {
  const s = useSettings();
  const ref = useRef<HTMLPreElement>(null);
  const at = useRef(0);
  useTick(now => {
    const el = ref.current;
    if (!el || now - at.current < 500) return;
    at.current = now;
    const p = live.perf, st = store.state;
    const mem = (performance as any).memory?.usedJSHeapSize;
    const lines = [
      `${p.fps.toFixed(0).padStart(3)} Bilder/s   ${p.ms.toFixed(1)} ms (längstes ${p.worst.toFixed(0)} ms)`,
      `Ping ${String(st.ping).padStart(3)} ms   ${p.snaps.toFixed(0)} Meldungen/s   ${p.inKb.toFixed(1)} kB/s`,
      `Gegner ${p.mobs} · Spieler ${p.players} · Objekte ${p.objs} · Geschosse ${p.projs}`,
      `gezeichnet ${p.draw} · Texturen ${p.tex}${mem ? ` · Speicher ${(mem / 1048576).toFixed(0)} MB` : ''}`,
    ];
    const t = lines.join('\n');
    if (el.textContent !== t) el.textContent = t;
    const slow = p.fps > 0 && p.fps < 30;
    if (el.classList.contains('slow') !== slow) el.classList.toggle('slow', slow);
  }, [s.perfOverlay]);
  if (!s.perfOverlay) return null;
  return <pre ref={ref} class="perf" aria-label="Leistungsanzeige" />;
}
