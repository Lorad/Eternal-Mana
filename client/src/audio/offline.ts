/**
 * Offline-Rendering über OfflineAudioContext – für automatische Prüfungen (Pegel, Clipping) ohne Lautsprecher.
 */
import { createAmbience } from './ambience';
import { createMixer, duckMusic } from './engine';
import { JINGLE_DEFS } from './jingles';
import { createTrackPlayer } from './music';
import { compileTrack } from './sequencer';
import { renderSfx } from './sfx';
import { JINGLES, MUSIC, type AmbienceId, type JingleId, type MusicId, type SfxName } from './spec';
import { TRACKS } from './tracks';

export interface Stats {
  /** Spitzenpegel (linear, 1.0 = Vollaussteuerung) */
  peak: number;
  rms: number;
  /** Anteil der Samples oberhalb des Softclip-Knies (0.7) */
  hot: number;
  seconds: number;
}

const SR = 44100;

function analyse(buf: AudioBuffer): Stats {
  let peak = 0;
  let sum = 0;
  let hot = 0;
  let n = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) {
      const a = Math.abs(d[i]);
      if (a > peak) peak = a;
      if (a > 0.7) hot++;
      sum += a * a;
    }
    n += d.length;
  }
  const r = (x: number): number => Math.round(x * 10000) / 10000;
  return { peak: r(peak), rms: r(Math.sqrt(sum / n)), hot: r(hot / n), seconds: r(buf.duration) };
}

function offline(seconds: number): OfflineAudioContext {
  return new OfflineAudioContext(2, Math.ceil(SR * seconds), SR);
}

export async function renderSfxStats(name: SfxName, seconds = 2.5): Promise<Stats> {
  const ctx = offline(seconds);
  const m = createMixer(ctx);
  renderSfx(m, name, 0.02);
  return analyse(await ctx.startRendering());
}

/** Viele Treffer gleichzeitig – prüft, dass dichter Kampf nicht übersteuert. */
export async function renderSfxStress(names: SfxName[], count = 24, seconds = 2.5): Promise<Stats> {
  const ctx = offline(seconds);
  const m = createMixer(ctx);
  for (let i = 0; i < count; i++) renderSfx(m, names[i % names.length], 0.02 + i * 0.035);
  return analyse(await ctx.startRendering());
}

export async function renderMusicStats(id: MusicId, seconds = 10, from = 0): Promise<Stats> {
  const ctx = offline(seconds);
  const m = createMixer(ctx);
  const p = createTrackPlayer(m, TRACKS[id]);
  p.start(0.05 - from);
  // Im Offline-Kontext steht currentTime auf 0: Ereignisse vor `from` liegen in der Vergangenheit und entfallen.
  p.schedule(seconds);
  return analyse(await ctx.startRendering());
}

export async function renderJingleStats(id: JingleId, withMusic: MusicId | null = null, seconds = 6): Promise<Stats> {
  const ctx = offline(seconds);
  const m = createMixer(ctx);
  if (withMusic) {
    const bg = createTrackPlayer(m, TRACKS[withMusic]);
    bg.start(0.05);
    bg.schedule(seconds);
  }
  const p = createTrackPlayer(m, JINGLE_DEFS[id], true);
  p.start(0.1);
  p.schedule(seconds);
  duckMusic(m, 0.05, p.duration + 0.6);
  return analyse(await ctx.startRendering());
}

export async function renderAmbienceStats(id: Exclude<AmbienceId, 'none'>, seconds = 10): Promise<Stats> {
  const ctx = offline(seconds);
  const m = createMixer(ctx);
  const bed = createAmbience(m, id, 0.02);
  bed.schedule(seconds);
  return analyse(await ctx.startRendering());
}

/** Prüft alle Stücke auf Notationsfehler; liefert Länge und Ereigniszahl je Stück. */
export function validateTracks(): { id: string; ok: boolean; error?: string; bars?: number; seconds?: number; events?: number }[] {
  const all: [string, (typeof TRACKS)[MusicId]][] = [
    ...MUSIC.map((id) => [id, TRACKS[id]] as [string, (typeof TRACKS)[MusicId]]),
    ...JINGLES.map((id) => [`jingle:${id}`, JINGLE_DEFS[id]] as [string, (typeof TRACKS)[MusicId]]),
  ];
  return all.map(([id, def]) => {
    try {
      const c = compileTrack(def, id);
      return { id, ok: true, bars: c.steps / (def.stepsPerBar ?? 16), seconds: Math.round(c.steps * c.stepDur * 10) / 10, events: c.events.length };
    } catch (e) {
      return { id, ok: false, error: String(e) };
    }
  });
}
