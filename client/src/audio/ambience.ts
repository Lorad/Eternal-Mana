/**
 * Generative Ambience-Betten: durchlaufende Rausch-/Drone-Schichten plus zufällige Ereignisse (Vögel, Tropfen …).
 * Ereignisse werden – wie die Musik – mit Vorausschau auf der AudioContext-Zeit geplant.
 */
import type { Mixer } from './engine';
import { hz } from './notes';
import type { AmbienceId } from './spec';
import { closeVoice, echo, fm, noise, openVoice, send, tone, type Voice } from './synth';

const rnd = (a: number, b: number): number => a + Math.random() * (b - a);
const pick = <T>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

interface Gen {
  next: number;
  min: number;
  max: number;
  fire: (t: number) => void;
}

class Bed {
  readonly out: GainNode;
  readonly wet: GainNode;
  private readonly sources: AudioScheduledSourceNode[] = [];
  private readonly nodes: AudioNode[] = [];
  private readonly gens: Gen[] = [];
  private stopped = false;
  /** Gesamtpegel des Betts */
  level = 1;

  constructor(readonly m: Mixer, readonly t0: number) {
    this.out = m.ctx.createGain();
    this.wet = m.ctx.createGain();
    this.out.connect(m.sfxIn);
    this.wet.connect(m.sfxWetIn);
    this.nodes.push(this.out, this.wet);
  }

  /** Dauer-Rauschen durch ein Filter; liefert Filter und Pegel für LFOs. */
  noise(kind: 'white' | 'brown', type: BiquadFilterType, freq: number, q: number, gain: number, reverb = 0): { f: BiquadFilterNode; g: GainNode } {
    const ctx = this.m.ctx;
    const src = ctx.createBufferSource();
    src.buffer = kind === 'white' ? this.m.white : this.m.brown;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(f);
    f.connect(g);
    g.connect(this.out);
    if (reverb) this.sendTo(g, reverb);
    src.start(this.t0, Math.random() * 1.5);
    this.sources.push(src);
    this.nodes.push(f, g);
    return { f, g };
  }

  drone(type: OscillatorType, freq: number, gain: number, lp = 0, reverb = 0): GainNode {
    const ctx = this.m.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = gain;
    if (lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lp;
      o.connect(f);
      f.connect(g);
      this.nodes.push(f);
    } else {
      o.connect(g);
    }
    g.connect(this.out);
    if (reverb) this.sendTo(g, reverb);
    o.start(this.t0);
    this.sources.push(o);
    this.nodes.push(g);
    return g;
  }

  lfo(rate: number, depth: number, param: AudioParam): void {
    const ctx = this.m.ctx;
    const o = ctx.createOscillator();
    o.frequency.value = rate;
    const g = ctx.createGain();
    g.gain.value = depth;
    o.connect(g);
    g.connect(param);
    o.start(this.t0);
    this.sources.push(o);
    this.nodes.push(g);
  }

  private sendTo(node: AudioNode, amount: number): void {
    const s = this.m.ctx.createGain();
    s.gain.value = amount;
    node.connect(s);
    s.connect(this.wet);
    this.nodes.push(s);
  }

  /** Zufälliges Ereignis alle min..max Sekunden. */
  every(min: number, max: number, fn: (s: Voice) => void, vol = 1): void {
    this.gens.push({
      next: this.t0 + rnd(min, max) * 0.6,
      min,
      max,
      fire: (t) => {
        const s = openVoice(this.m, t, { dest: this.out, wet: this.wet, volume: vol, pan: rnd(-0.7, 0.7) });
        fn(s);
        closeVoice(s);
      },
    });
  }

  schedule(until: number): void {
    if (this.stopped) return;
    const now = this.m.ctx.currentTime;
    for (const g of this.gens) {
      while (g.next < until) {
        if (g.next >= now) g.fire(g.next);
        g.next += rnd(g.min, g.max);
      }
    }
  }

  fadeIn(t: number, dur: number): void {
    for (const p of [this.out.gain, this.wet.gain]) {
      p.setValueAtTime(0, t);
      p.linearRampToValueAtTime(this.level, t + dur);
    }
  }

  /** Blendet aus, stoppt danach alle Quellen und trennt den Teilgraphen. */
  stop(t: number, dur: number): void {
    if (this.stopped) return;
    this.stopped = true;
    for (const p of [this.out.gain, this.wet.gain]) {
      if (typeof p.cancelAndHoldAtTime === 'function') p.cancelAndHoldAtTime(t);
      else p.cancelScheduledValues(t);
      p.setTargetAtTime(0, t, dur / 4);
    }
    const end = t + dur + 0.1;
    for (const s of this.sources) s.stop(end);
    const first = this.sources[0];
    const cleanup = (): void => {
      for (const n of this.nodes) n.disconnect();
    };
    if (first) first.onended = cleanup;
    else cleanup();
  }
}

function birds(b: Bed, min: number, max: number, vol: number): void {
  b.every(min, max, (s) => {
    const base = rnd(2400, 4600);
    const n = 2 + Math.floor(Math.random() * 4);
    const up = Math.random() < 0.6;
    const gap = rnd(0.09, 0.16);
    for (let i = 0; i < n; i++) {
      const f = base * (1 + rnd(-0.06, 0.06));
      tone(s, 'sine', f, f * (up ? 1.28 : 0.8), rnd(0.05, 0.09), 0.5, { t: i * gap, a: 0.012 });
    }
    send(s, 0.35);
  }, vol);
}

function drips(b: Bed, min: number, max: number, vol: number): void {
  b.every(min, max, (s) => {
    const f = rnd(1100, 2300);
    tone(s, 'sine', f, f * 1.6, 0.05, 0.5, { a: 0.004 });
    tone(s, 'sine', f * 0.5, f * 0.62, 0.03, 0.2, { t: 0.012 });
    echo(s, rnd(0.16, 0.24), 0.35, 0.4);
    send(s, 0.8);
  }, vol);
}

const BEDS: Record<Exclude<AmbienceId, 'none'>, (b: Bed) => void> = {
  forest: (b) => {
    const wind = b.noise('white', 'bandpass', 520, 0.5, 0.05);
    b.lfo(0.1, 0.02, wind.g.gain);
    b.lfo(0.06, 150, wind.f.frequency);
    const leaves = b.noise('white', 'highpass', 4200, 0.7, 0.012);
    b.lfo(0.17, 0.007, leaves.g.gain);
    birds(b, 2.5, 7, 0.06);
    birds(b, 6, 15, 0.035);
  },
  village: (b) => {
    const wind = b.noise('white', 'bandpass', 420, 0.5, 0.03);
    b.lfo(0.08, 0.012, wind.g.gain);
    b.noise('white', 'highpass', 5000, 0.7, 0.005);
    birds(b, 5, 12, 0.04);
    // Taubenruf: zwei tiefe, weiche Töne
    b.every(11, 24, (s) => {
      tone(s, 'sine', 640, 560, 0.28, 0.5, { a: 0.06 });
      tone(s, 'sine', 560, 500, 0.4, 0.5, { a: 0.06, t: 0.36 });
      send(s, 0.4);
    }, 0.035);
  },
  cave: (b) => {
    const d1 = b.drone('sine', 55, 0.07);
    b.drone('sine', 82.6, 0.03);
    b.lfo(0.05, 0.03, d1.gain);
    const air = b.noise('brown', 'lowpass', 220, 0.7, 0.16, 0.3);
    b.lfo(0.07, 0.06, air.g.gain);
    drips(b, 1.5, 6, 0.1);
  },
  volcano: (b) => {
    const rumble = b.noise('brown', 'lowpass', 130, 0.7, 0.5);
    b.lfo(0.15, 0.18, rumble.g.gain);
    b.lfo(0.4, 0.07, rumble.g.gain);
    b.drone('sine', 38, 0.08);
    b.noise('white', 'bandpass', 320, 0.4, 0.025);
    b.every(0.12, 0.9, (s) => {
      noise(s, 'highpass', rnd(2000, 4500), 3000, 0.7, rnd(0.008, 0.03), rnd(0.3, 1));
    }, 0.09);
    b.every(3, 9, (s) => {
      tone(s, 'sine', rnd(80, 110), 45, 0.3, 0.8);
      noise(s, 'lowpass', 500, 150, 0.7, 0.3, 0.5, { brown: true });
      send(s, 0.3);
    }, 0.2);
  },
  blizzard: (b) => {
    const howl = b.noise('white', 'bandpass', 620, 4, 0.11, 0.15);
    b.lfo(0.13, 300, howl.f.frequency);
    b.lfo(0.31, 120, howl.f.frequency);
    b.lfo(0.09, 0.05, howl.g.gain);
    const whistle = b.noise('white', 'bandpass', 1500, 7, 0.04, 0.2);
    b.lfo(0.08, 520, whistle.f.frequency);
    b.lfo(0.21, 0.025, whistle.g.gain);
    b.noise('white', 'highpass', 5200, 0.7, 0.012);
    b.noise('brown', 'lowpass', 200, 0.7, 0.12);
    b.every(6, 14, (s) => {
      noise(s, 'bandpass', rnd(400, 600), rnd(1200, 1800), 3, 2.6, 1, { a: 1.2 });
      send(s, 0.2);
    }, 0.1);
  },
  ruins: (b) => {
    const hollow = b.noise('white', 'bandpass', 350, 8, 0.11, 0.25);
    b.lfo(0.08, 90, hollow.f.frequency);
    b.lfo(0.05, 0.05, hollow.g.gain);
    const upper = b.noise('white', 'bandpass', 705, 10, 0.035, 0.25);
    b.lfo(0.045, 140, upper.f.frequency);
    b.noise('brown', 'lowpass', 160, 0.7, 0.07);
    b.every(9, 22, (s) => {
      const scale = ['d5', 'e5', 'g5', 'a5', 'c6', 'd6'];
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) fm(s, hz(pick(scale)), 3.5, 0.9, 1.6, 0.5, { t: i * rnd(0.25, 0.6) });
      send(s, 1);
    }, 0.045);
  },
  void: (b) => {
    b.drone('sine', 41.2, 0.1);
    b.drone('sine', 41.9, 0.1);
    const saw = b.drone('sawtooth', 82.4, 0.02, 220, 0.3);
    b.drone('sawtooth', 83.3, 0.02, 220, 0.3);
    b.lfo(0.04, 0.012, saw.gain);
    const air = b.noise('brown', 'lowpass', 150, 0.7, 0.1);
    b.lfo(0.06, 0.05, air.g.gain);
    b.every(4, 10, (s) => {
      const f = pick([110, 116.5, 155.6, 164.8, 233.1]);
      const dur = rnd(2, 3.5);
      tone(s, 'triangle', f, f * 1.01, dur, 0.5, { rev: true });
      tone(s, 'sine', f * 2.02, f * 2, dur, 0.2, { rev: true });
      noise(s, 'bandpass', f * 4, f * 8, 4, dur, 0.5, { rev: true });
      send(s, 0.7);
    }, 0.07);
  },
  dungeon: (b) => {
    const d = b.drone('sine', 49, 0.07);
    b.lfo(0.045, 0.03, d.gain);
    b.drone('triangle', 73.6, 0.02, 300);
    const air = b.noise('brown', 'lowpass', 180, 0.7, 0.12, 0.2);
    b.lfo(0.06, 0.04, air.g.gain);
    drips(b, 5, 13, 0.07);
    b.every(12, 30, (s) => {
      const f = rnd(70, 95);
      tone(s, 'sawtooth', f, f * 1.5, 0.7, 0.5, { a: 0.15, h: 0.3, lp: 600, vib: [rnd(11, 17), 0.18] });
      noise(s, 'bandpass', 500, 900, 6, 0.7, 0.4, { a: 0.2 });
      send(s, 0.7);
    }, 0.045);
  },
};

/** Pegelabgleich der Betten (aus den Offline-Messungen): Ambience bleibt deutlich unter der Musik. */
const LEVEL: Record<Exclude<AmbienceId, 'none'>, number> = { forest: 1.2, village: 1.8, cave: 0.4, volcano: 0.26, blizzard: 0.9, ruins: 1, void: 0.32, dungeon: 0.4 };

export type AmbienceHandle = Bed;

/** Baut ein Ambience-Bett ab Zeit `t0` (auch im OfflineAudioContext nutzbar). */
export function createAmbience(m: Mixer, id: Exclude<AmbienceId, 'none'>, t0: number): AmbienceHandle {
  const b = new Bed(m, t0);
  b.level = LEVEL[id];
  b.out.gain.value = b.level;
  b.wet.gain.value = b.level;
  BEDS[id](b);
  return b;
}

/** Live-Verwaltung mit Überblendung. */
export class AmbienceManager {
  private current: AmbienceId = 'none';
  private bed: Bed | null = null;
  constructor(private readonly m: Mixer) {}

  set(id: AmbienceId): void {
    if (id === this.current) return;
    this.current = id;
    const t = this.m.ctx.currentTime;
    if (this.bed) this.bed.stop(t, 1.5);
    this.bed = null;
    if (id !== 'none' && BEDS[id]) {
      this.bed = createAmbience(this.m, id, t + 0.02);
      this.bed.fadeIn(t + 0.02, 1.5);
    }
  }

  tick(): void {
    if (this.bed) this.bed.schedule(this.m.ctx.currentTime + 0.4);
  }
}
