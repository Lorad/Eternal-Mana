/** Live-Musikverwaltung: Vorausschau-Scheduler, Überblendung beim Trackwechsel, Jingles mit Ducking. */
import { duckMusic, type Mixer } from './engine';
import { JINGLE_DEFS } from './jingles';
import { TrackPlayer, type TrackDef } from './sequencer';
import type { JingleId, MusicId } from './spec';
import { TRACKS } from './tracks';

export const LOOKAHEAD = 0.2;
const CROSSFADE = 1.5;

export function createTrackPlayer(m: Mixer, def: TrackDef, jingle = false): TrackPlayer {
  return new TrackPlayer(m, def, jingle ? m.jingleIn : m.musicIn, jingle ? m.jingleWetIn : m.musicWetIn);
}

export class MusicManager {
  private currentId: MusicId | null = null;
  private current: TrackPlayer | null = null;
  /** ausblendende Tracks und laufende Jingles mit Entsorgungszeit */
  private readonly leaving: { p: TrackPlayer; until: number }[] = [];
  constructor(private readonly m: Mixer) {}

  play(id: MusicId | null): void {
    if (id === this.currentId) return;
    const t = this.m.ctx.currentTime;
    const had = this.current;
    if (had) {
      had.fade(0, t, CROSSFADE);
      this.leaving.push({ p: had, until: t + CROSSFADE + 0.3 });
    }
    this.current = null;
    this.currentId = id;
    if (id && TRACKS[id]) {
      const p = createTrackPlayer(this.m, TRACKS[id]);
      p.fade(1, t, had ? CROSSFADE : 0.4, 0);
      p.start(t + 0.06);
      this.current = p;
    }
    this.tick();
  }

  jingle(id: JingleId): void {
    const def = JINGLE_DEFS[id];
    if (!def) return;
    const t = this.m.ctx.currentTime + 0.05;
    const p = createTrackPlayer(this.m, def, true);
    p.start(t + 0.08);
    duckMusic(this.m, t, p.duration + 0.6);
    this.leaving.push({ p, until: t + p.duration + 4 });
    this.tick();
  }

  tick(): void {
    const now = this.m.ctx.currentTime;
    const until = now + LOOKAHEAD;
    if (this.current) this.current.schedule(until);
    for (let i = this.leaving.length - 1; i >= 0; i--) {
      const l = this.leaving[i];
      if (now >= l.until) {
        l.p.dispose();
        this.leaving.splice(i, 1);
      } else {
        l.p.schedule(until);
      }
    }
  }
}
