/**
 * Mini-Tracker. Stücke sind lesbare Pattern-Strings:
 *
 *   Melodie-Token:  <note>[+<note>…]<dauer>[!]      z. B.  e5q   c4+e4+g4w   f#5q.   a4he   -q (Pause)
 *   Dauern:         w = ganze, h = halbe, q = Viertel, e = Achtel, s = Sechzehntel; "." = punktiert;
 *                   mehrere hintereinander = übergebunden (hq = halbe + Viertel). "!" = Akzent.
 *   "|"             Taktstrich (wird geprüft: muss auf einer Taktgrenze stehen)
 *   (…)*n           Wiederholung
 *   Schlagzeug:     ein Zeichen pro Sechzehntel: X = laut, x = normal, o = leise, . = Pause
 *
 * Ein Part, der kürzer als sein Abschnitt ist, wird wiederholt (Ostinato), sofern er glatt aufgeht.
 * Geplant wird mit Vorausschau auf der AudioContext-Zeit; verspätete Noten werden übersprungen statt nachgeholt.
 */
import type { Mixer } from './engine';
import { playDrum, playNote, type DrumName, type InstName } from './instruments';
import { hz } from './notes';

export interface ChannelDef {
  inst: InstName;
  vol: number;
  pan?: number;
  /** Hall-Anteil 0..1 */
  reverb?: number;
  /** Tiefpass auf dem Kanal (Hz) */
  cutoff?: number;
}

export interface SectionDef {
  bars: number;
  /** Kanalname → Pattern */
  parts: Record<string, string>;
  drums?: Partial<Record<DrumName, string>>;
}

export interface TrackDef {
  title: string;
  /** nur Dokumentation */
  key: string;
  /** Viertel pro Minute */
  bpm: number;
  /** Sechzehntel pro Takt: 16 = 4/4, 12 = 3/4 oder 6/8 */
  stepsPerBar?: number;
  channels: Record<string, ChannelDef>;
  drumVol?: number;
  drumReverb?: number;
  sections: Record<string, SectionDef>;
  form: string[];
  /** false = einmal abspielen (Jingle) */
  loop?: boolean;
  /** Gesamtpegel des Stücks */
  gain?: number;
}

interface Ev {
  step: number;
  len: number;
  ch: number; // -1 = Schlagzeug
  freqs: number[];
  drum?: DrumName;
  vel: number;
}

export interface Compiled {
  events: Ev[];
  steps: number;
  stepDur: number;
  channelNames: string[];
}

const DUR: Record<string, number> = { w: 16, h: 8, q: 4, e: 2, s: 1 };
const TOKEN = /^((?:[a-g][#b]?\d|-)(?:\+[a-g][#b]?\d)*)((?:[whqes]\.?)+)(!?)$/;

function expand(s: string): string {
  const re = /\(([^()]*)\)\*(\d+)/;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    s = s.slice(0, m.index) + Array(Number(m[2])).fill(m[1]).join(' ') + s.slice(m.index + m[0].length);
  }
  return s;
}

function parsePart(src: string, spb: number, where: string): { evs: Omit<Ev, 'ch'>[]; len: number } {
  const evs: Omit<Ev, 'ch'>[] = [];
  let pos = 0;
  for (const tok of expand(src).split(/\s+/)) {
    if (!tok) continue;
    if (tok === '|') {
      if (pos % spb !== 0) throw new Error(`${where}: Taktstrich bei Schritt ${pos} (Takt ${Math.floor(pos / spb) + 1}) liegt nicht auf der Taktgrenze`);
      continue;
    }
    const m = TOKEN.exec(tok);
    if (!m) throw new Error(`${where}: unlesbares Token "${tok}"`);
    let len = 0;
    for (const d of m[2].match(/[whqes]\.?/g)!) len += DUR[d[0]] * (d.length > 1 ? 1.5 : 1);
    if (m[1] !== '-') evs.push({ step: pos, len, freqs: m[1].split('+').map(hz), vel: m[3] ? 1.25 : 1 });
    pos += len;
  }
  return { evs, len: pos };
}

export function compileTrack(def: TrackDef, name = def.title): Compiled {
  const spb = def.stepsPerBar ?? 16;
  const channelNames = Object.keys(def.channels);
  const events: Ev[] = [];
  let offset = 0;
  for (const secName of def.form) {
    const sec = def.sections[secName];
    if (!sec) throw new Error(`${name}: Abschnitt "${secName}" fehlt`);
    const total = sec.bars * spb;
    for (const [chName, src] of Object.entries(sec.parts)) {
      const ch = channelNames.indexOf(chName);
      const where = `${name}/${secName}/${chName}`;
      if (ch < 0) throw new Error(`${where}: unbekannter Kanal`);
      const { evs, len } = parsePart(src, spb, where);
      if (len <= 0 || total % len !== 0) throw new Error(`${where}: Länge ${len} Schritte passt nicht in ${total}`);
      for (let rep = 0; rep < total / len; rep++) {
        for (const e of evs) events.push({ ...e, ch, step: offset + rep * len + e.step });
      }
    }
    for (const [drum, raw] of Object.entries(sec.drums ?? {})) {
      const pat = expand(raw).replace(/[\s|]/g, '');
      const where = `${name}/${secName}/${drum}`;
      if (!pat.length || total % pat.length !== 0) throw new Error(`${where}: Länge ${pat.length} passt nicht in ${total}`);
      for (let i = 0; i < total; i++) {
        const c = pat[i % pat.length];
        if (c === '.') continue;
        const vel = c === 'X' ? 1 : c === 'x' ? 0.75 : c === 'o' ? 0.4 : -1;
        if (vel < 0) throw new Error(`${where}: unbekanntes Zeichen "${c}"`);
        events.push({ step: offset + i, len: 1, ch: -1, freqs: [], drum: drum as DrumName, vel });
      }
    }
    offset += total;
  }
  events.sort((a, b) => a.step - b.step);
  return { events, steps: offset, stepDur: 60 / def.bpm / 4, channelNames };
}

export class TrackPlayer {
  readonly out: GainNode;
  readonly wet: GainNode;
  /** Länge eines Durchlaufs in Sekunden */
  readonly duration: number;
  done = false;
  private readonly c: Compiled;
  private readonly inputs: GainNode[] = [];
  private readonly drumIn: GainNode;
  private readonly nodes: AudioNode[] = [];
  private readonly loop: boolean;
  private readonly insts: InstName[];
  private readonly gain: number;
  private fadeState = { from: 1, to: 1, t: 0, dur: 0 };
  private t0 = 0;
  private idx = 0;
  private lap = 0;

  constructor(private readonly m: Mixer, def: TrackDef, dry: AudioNode, wetDest: AudioNode) {
    const ctx = m.ctx;
    this.c = compileTrack(def);
    this.loop = def.loop !== false;
    this.duration = this.c.steps * this.c.stepDur;
    this.out = ctx.createGain();
    this.wet = ctx.createGain();
    this.gain = def.gain ?? 1;
    this.insts = this.c.channelNames.map((n) => def.channels[n].inst);
    this.out.gain.value = this.gain;
    this.wet.gain.value = this.gain;
    this.out.connect(dry);
    this.wet.connect(wetDest);
    this.nodes.push(this.out, this.wet);
    const channel = (d: { vol: number; pan?: number; reverb?: number; cutoff?: number }): GainNode => {
      const inp = ctx.createGain();
      inp.gain.value = d.vol;
      let last: AudioNode = inp;
      if (d.cutoff) {
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = d.cutoff;
        f.Q.value = 0.5;
        last.connect(f);
        last = f;
        this.nodes.push(f);
      }
      if (d.pan) {
        const p = ctx.createStereoPanner();
        p.pan.value = d.pan;
        last.connect(p);
        last = p;
        this.nodes.push(p);
      }
      last.connect(this.out);
      if (d.reverb) {
        const s = ctx.createGain();
        s.gain.value = d.reverb;
        last.connect(s);
        s.connect(this.wet);
        this.nodes.push(s);
      }
      this.nodes.push(inp);
      return inp;
    };
    for (const name of this.c.channelNames) this.inputs.push(channel(def.channels[name]));
    this.drumIn = channel({ vol: def.drumVol ?? 0.7, reverb: def.drumReverb ?? 0.06 });
  }

  start(t0: number): void {
    this.t0 = t0;
    this.idx = 0;
    this.lap = 0;
    this.done = this.c.events.length === 0;
  }

  /** Plant alle Ereignisse vor `until` (AudioContext-Zeit). */
  schedule(until: number): void {
    if (this.done) return;
    const { events, steps, stepDur } = this.c;
    const now = this.m.ctx.currentTime;
    for (;;) {
      if (this.idx >= events.length) {
        if (!this.loop) {
          this.done = true;
          return;
        }
        this.idx = 0;
        this.lap++;
      }
      const e = events[this.idx];
      const t = this.t0 + (this.lap * steps + e.step) * stepDur;
      if (t >= until) return;
      if (t >= now - 0.01 && t >= 0) {
        if (e.drum) playDrum(this.m, this.drumIn, e.drum, t, e.vel);
        else for (const f of e.freqs) playNote(this.m, this.inputs[e.ch], this.insts[e.ch], f, t, e.len * stepDur, e.vel);
      }
      this.idx++;
    }
  }

  /** Aktueller Blendwert 0..1 (analytisch, damit ein Wechsel mitten in einer Blende nicht springt). */
  private level(t: number): number {
    const f = this.fadeState;
    if (t <= f.t) return f.from;
    if (t >= f.t + f.dur) return f.to;
    return f.from + ((f.to - f.from) * (t - f.t)) / f.dur;
  }

  /** Blendet linear auf `to` (0..1) über `dur` Sekunden ab Zeitpunkt `t`. */
  fade(to: number, t: number, dur: number, startFrom?: number): void {
    const from = startFrom ?? this.level(t);
    this.fadeState = { from, to, t, dur };
    for (const p of [this.out.gain, this.wet.gain]) {
      p.cancelScheduledValues(t);
      p.setValueAtTime(from * this.gain, t);
      p.linearRampToValueAtTime(to * this.gain, t + dur);
    }
  }

  dispose(): void {
    this.done = true;
    for (const n of this.nodes) n.disconnect();
  }
}
