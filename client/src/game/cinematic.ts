/**
 * Filmszenen (ab 0.3): kleiner, schrittweiser Sequenzer. Die Schrittfolgen stehen als Daten in shared/src/data/story.ts,
 * der Server löst sie aus (`cine`) und schützt die Spielfigur, solange sie laufen – die Welt selbst läuft weiter.
 *
 * Aufgabenteilung: Dieser Sequenzer hält den Ablauf und schreibt Balken, Titel, Textzeile und Blende in den UI-Zustand
 * (`store.cine`, dargestellt von ui/story.tsx). Kamera, Blitz, Wackeln und Musik laufen über den Ereignisbus an die
 * Spielszene. Jede Szene ist überspringbar; danach meldet der Client `cineEnd`, damit der Schutz endet.
 */
import { condOk } from '../../../shared/src/data/cond';
import { CINES, type CineDef, type CineStep } from '../../../shared/src/data/story';
import { audio } from '../audio';
import type { MusicId, SfxName } from '../audio/spec';
import { net } from '../net/net';
import { bus } from '../state/bus';
import { store, type CineView } from '../state/store';

const queue: string[] = [];
let running: { id: string; cancelled: boolean } | null = null;
/** offene Wartepunkte des laufenden Schritts (werden beim Überspringen sofort aufgelöst) */
const pending = new Set<() => void>();
let confirm: (() => void) | null = null;

const view = (): CineView => store.state.cine ?? { id: '', bars: false, title: null, line: null, fade: 0, fadeMs: 0 };
const set = (patch: Partial<CineView>) => { if (running) store.set({ cine: { ...view(), id: running.id, ...patch } }); };

function wait(ms: number): Promise<void> {
  return new Promise(res => {
    const done = () => { clearTimeout(t); pending.delete(done); res(); };
    const t = window.setTimeout(done, ms);
    pending.add(done);
  });
}
function waitConfirm(): Promise<void> {
  return new Promise(res => {
    const done = () => { pending.delete(done); if (confirm === done) confirm = null; res(); };
    confirm = done;
    pending.add(done);
  });
}

async function step(s: CineStep, tok: { cancelled: boolean }) {
  switch (s.k) {
    case 'bars': set({ bars: s.on }); await wait(380); break;
    case 'title': set({ title: { s: s.s, sub: s.sub }, line: null }); await wait(s.ms ?? 3000); if (!tok.cancelled) set({ title: null }); await wait(250); break;
    case 'say': set({ line: { who: s.who, s: s.s } }); audio.playSfx('dialog_blip', { volume: 0.6 }); await waitConfirm(); if (!tok.cancelled) set({ line: null }); break;
    case 'wait': await wait(s.ms); break;
    case 'pan': bus.emit('cine:pan', s); await wait(s.ms ?? 800); break;
    case 'fade': set({ fade: s.out ? 1 : 0, fadeMs: s.ms ?? 600 }); await wait(s.ms ?? 600); break;
    case 'flash': bus.emit('cine:flash', s.color ?? 0xffffff, s.ms ?? 400); break;
    case 'shake': bus.emit('cine:shake', s.i ?? 0.008, s.ms ?? 600); break;
    case 'sfx': audio.playSfx(s.n as SfxName); break;
    case 'music': audio.playMusic(s.n as MusicId); break;
  }
}

async function run(def: CineDef) {
  const tok = (running = { id: def.id, cancelled: false });
  // Zonenwechsel abwarten: Filmszenen spielen nur über der fertig geladenen Welt
  for (let k = 0; k < 100 && store.state.screen !== 'game' && !tok.cancelled; k++) await wait(100);
  store.set({ cine: { id: def.id, bars: false, title: null, line: null, fade: 0, fadeMs: 0 }, panel: null, dialog: null, sign: null, lore: null, prompt: null });
  bus.emit('cine:start');
  const c = store.state.char;
  for (const s of def.steps) {
    if (tok.cancelled) break;
    if (s.if && (!c || !condOk(c, s.if))) continue;
    await step(s, tok);
  }
  running = null;
  store.set({ cine: null });
  bus.emit('cine:end');
  const next = queue.shift();
  if (next && CINES[next]) void run(CINES[next]);
  else net.send({ t: 'cineEnd', id: def.id });
}

export const cinematic = {
  /** Reiht eine Filmszene ein (vom Server ausgelöst). */
  play(id: string) {
    const def = CINES[id];
    if (!def) return;
    if (running) { queue.push(id); return; }
    void run(def);
  },
  /** Nächste Textzeile (Bestätigen). */
  next() { confirm?.(); },
  /** Bricht die laufende und alle wartenden Szenen ab. */
  skip() {
    if (!running) return;
    queue.length = 0;
    running.cancelled = true;
    for (const f of [...pending]) f();
  },
  get active() { return !!running; },
};
bus.on('cine:play', (id: string) => cinematic.play(id));
bus.on('cine:skip', () => cinematic.skip());
bus.on('net:left', () => cinematic.skip());
