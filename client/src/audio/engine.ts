/**
 * Mixer-Graph. Funktioniert auf jedem BaseAudioContext (live oder Offline-Rendering).
 *
 *   musicIn (Duck) ─► musicBus (Vol) ─┐
 *   jingleIn ───────► musicBus        ├─► master ─► Kompressor ─► Trim ─► Softclip ─► Ausgang
 *   sfxIn ──────────► sfxBus (Vol) ───┤
 *   *WetIn ─► *Wet (Vol) ─► Hall ─────┘
 */
export interface Mixer {
  ctx: BaseAudioContext;
  master: GainNode;
  musicIn: GainNode;
  musicWetIn: GainNode;
  jingleIn: GainNode;
  jingleWetIn: GainNode;
  sfxIn: GainNode;
  sfxWetIn: GainNode;
  musicBus: GainNode;
  musicWet: GainNode;
  sfxBus: GainNode;
  sfxWet: GainNode;
  white: AudioBuffer;
  brown: AudioBuffer;
  pulse: PeriodicWave;
}

export const DEFAULT_MUSIC_VOLUME = 0.5;
export const DEFAULT_SFX_VOLUME = 0.7;

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function makeWhite(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function makeBrown(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let v = 0;
  let peak = 0;
  for (let i = 0; i < len; i++) {
    v = (v + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = v;
  }
  // Schleifenende an den Anfang angleichen (kein Knacken beim Loopen), dann normalisieren.
  const drift = d[len - 1] - d[0];
  for (let i = 0; i < len; i++) {
    d[i] -= (drift * i) / len;
    peak = Math.max(peak, Math.abs(d[i]));
  }
  for (let i = 0; i < len; i++) d[i] /= peak || 1;
  return buf;
}

/** Hall-Impulsantwort: exponentiell abklingendes Rauschen, das mit der Zeit dunkler wird. */
function makeImpulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(2, len, sr);
  const pre = Math.floor(sr * 0.012);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let lp = 0;
    for (let i = pre; i < len; i++) {
      const x = (i - pre) / (len - pre);
      const env = Math.pow(1 - x, 2) * Math.exp(-3.2 * x);
      const k = 0.75 - 0.6 * x; // Tiefpass-Koeffizient: später = dunkler
      lp += k * (Math.random() * 2 - 1 - lp);
      d[i] = lp * env;
    }
  }
  return buf;
}

function makePulse(ctx: BaseAudioContext, duty: number): PeriodicWave {
  const n = 32;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let i = 1; i < n; i++) real[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
  return ctx.createPeriodicWave(real, imag);
}

function softClipCurve(): Float32Array<ArrayBuffer> {
  const n = 4097;
  const c = new Float32Array(n);
  const knee = 0.7;
  const room = 0.29;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const a = Math.abs(x);
    const y = a <= knee ? a : knee + room * Math.tanh((a - knee) / room);
    c[i] = Math.sign(x) * y;
  }
  return c;
}

export function createMixer(ctx: BaseAudioContext, musicVolume = DEFAULT_MUSIC_VOLUME, sfxVolume = DEFAULT_SFX_VOLUME): Mixer {
  const g = (v: number): GainNode => {
    const n = ctx.createGain();
    n.gain.value = v;
    return n;
  };
  const master = g(1);
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 10;
  comp.ratio.value = 5;
  comp.attack.value = 0.004;
  comp.release.value = 0.22;
  const trim = g(0.62); // gleicht die automatische Aufholverstärkung des Kompressors aus
  const clip = ctx.createWaveShaper();
  clip.curve = softClipCurve();
  master.connect(comp);
  comp.connect(trim);
  trim.connect(clip);
  clip.connect(ctx.destination);

  const reverb = ctx.createConvolver();
  reverb.buffer = makeImpulse(ctx, 2.4);
  const reverbOut = g(0.9);
  reverb.connect(reverbOut);
  reverbOut.connect(master);

  const musicBus = g(musicVolume);
  const musicWet = g(musicVolume);
  const sfxBus = g(sfxVolume);
  const sfxWet = g(sfxVolume);
  musicBus.connect(master);
  sfxBus.connect(master);
  musicWet.connect(reverb);
  sfxWet.connect(reverb);

  const musicIn = g(1);
  const musicWetIn = g(1);
  const jingleIn = g(1);
  const jingleWetIn = g(1);
  const sfxIn = g(1);
  const sfxWetIn = g(1);
  musicIn.connect(musicBus);
  jingleIn.connect(musicBus);
  musicWetIn.connect(musicWet);
  jingleWetIn.connect(musicWet);
  sfxIn.connect(sfxBus);
  sfxWetIn.connect(sfxWet);

  return {
    ctx, master, musicIn, musicWetIn, jingleIn, jingleWetIn, sfxIn, sfxWetIn,
    musicBus, musicWet, sfxBus, sfxWet,
    white: makeWhite(ctx, 2),
    brown: makeBrown(ctx, 3),
    pulse: makePulse(ctx, 0.25),
  };
}

export function setMusicVolume(m: Mixer, v: number, smooth = 0.05): void {
  const t = m.ctx.currentTime;
  m.musicBus.gain.setTargetAtTime(v, t, smooth);
  m.musicWet.gain.setTargetAtTime(v, t, smooth);
}

export function setSfxVolume(m: Mixer, v: number, smooth = 0.05): void {
  const t = m.ctx.currentTime;
  m.sfxBus.gain.setTargetAtTime(v, t, smooth);
  m.sfxWet.gain.setTargetAtTime(v, t, smooth);
}

/** Senkt die laufende Musik für `dur` Sekunden ab (für Jingles). */
export function duckMusic(m: Mixer, t: number, dur: number, depth = 0.18): void {
  for (const p of [m.musicIn.gain, m.musicWetIn.gain]) {
    p.cancelScheduledValues(t);
    p.setTargetAtTime(depth, t, 0.06);
    p.setTargetAtTime(1, t + dur, 0.35);
  }
}
