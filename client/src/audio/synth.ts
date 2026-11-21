/**
 * Kleine Baukasten-Schichten für Effekte und Ambience-Ereignisse:
 * tone (Oszillator mit Tonhöhen-/Lautstärke-Hüllkurve), noise (gefiltertes Rauschen), fm (metallisch/glockig),
 * dazu Stimmen-weites Echo und Hall-Send. Eine Stimme räumt sich nach ihrem Ende selbst ab.
 */
import { clamp, type Mixer } from './engine';

export interface Voice {
  m: Mixer;
  ctx: BaseAudioContext;
  /** Startzeit */
  t: number;
  /** Tonhöhen-Faktor */
  p: number;
  in: GainNode;
  out: GainNode;
  end: number;
  tail: number;
  nodes: AudioNode[];
  wetDest: AudioNode;
}

export interface VoiceOpts {
  dest: AudioNode;
  wet: AudioNode;
  volume?: number;
  pitch?: number;
  pan?: number;
}

export function openVoice(m: Mixer, t: number, o: VoiceOpts): Voice {
  const ctx = m.ctx;
  const inp = ctx.createGain();
  const out = ctx.createGain();
  out.gain.value = o.volume ?? 1;
  inp.connect(out);
  const nodes: AudioNode[] = [inp, out];
  if (o.pan) {
    const pn = ctx.createStereoPanner();
    pn.pan.value = clamp(o.pan, -1, 1);
    out.connect(pn);
    pn.connect(o.dest);
    nodes.push(pn);
  } else {
    out.connect(o.dest);
  }
  return { m, ctx, t, p: o.pitch ?? 1, in: inp, out, end: t, tail: 0, nodes, wetDest: o.wet };
}

/** Plant das Aufräumen der Stimme; `onDone` wird nach dem Trennen aller Knoten aufgerufen. */
export function closeVoice(s: Voice, onDone?: () => void): number {
  const end = s.end + s.tail + 0.05;
  const timer = s.ctx.createConstantSource();
  timer.offset.value = 0;
  timer.connect(s.in);
  timer.onended = () => {
    timer.disconnect();
    for (const n of s.nodes) n.disconnect();
    if (onDone) onDone();
  };
  timer.start(s.t);
  timer.stop(end);
  return end;
}

/** Anteil der Stimme in den gemeinsamen Hall. */
export function send(s: Voice, amount: number): void {
  const g = s.ctx.createGain();
  g.gain.value = amount;
  s.out.connect(g);
  g.connect(s.wetDest);
  s.nodes.push(g);
}

/** Kurzes Feedback-Echo auf der ganzen Stimme. */
export function echo(s: Voice, time: number, feedback: number, mix: number): void {
  const d = s.ctx.createDelay(1);
  d.delayTime.value = time;
  const fb = s.ctx.createGain();
  fb.gain.value = feedback;
  const w = s.ctx.createGain();
  w.gain.value = mix;
  s.in.connect(d);
  d.connect(fb);
  fb.connect(d);
  d.connect(w);
  w.connect(s.out);
  s.nodes.push(d, fb, w);
  s.tail = Math.max(s.tail, time * Math.ceil(Math.log(0.02) / Math.log(clamp(feedback, 0.05, 0.9))));
}

export interface LayerOpts {
  /** Startversatz in s */
  t?: number;
  /** Attack in s (Standard 3 ms) */
  a?: number;
  /** Haltezeit auf vollem Pegel in s */
  h?: number;
  /** „Rückwärts“-Hüllkurve: schwillt an und bricht ab */
  rev?: boolean;
  /** Tiefpass (Hz) hinter dem Oszillator */
  lp?: number;
  /** Vibrato [Rate Hz, Tiefe als Anteil der Frequenz] */
  vib?: [number, number];
  /** braunes statt weißes Rauschen */
  brown?: boolean;
  /** FM: Anteil der Dauer, in dem der Index abklingt */
  id?: number;
}

function envelope(p: AudioParam, t: number, dur: number, vol: number, o: LayerOpts): number {
  if (o.rev) {
    p.setValueAtTime(vol * 0.001, t);
    p.exponentialRampToValueAtTime(vol, t + dur - 0.04);
    p.linearRampToValueAtTime(0, t + dur);
    return t + dur;
  }
  const a = o.a ?? 0.003;
  const h = o.h ?? 0;
  const end = t + Math.max(dur, a + h + 0.012);
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(vol, t + a);
  if (h > 0) p.setValueAtTime(vol, t + a + h);
  p.exponentialRampToValueAtTime(vol * 0.002, end);
  p.linearRampToValueAtTime(0, end + 0.008);
  return end + 0.008;
}

/** Oszillator-Schicht: gleitet exponentiell von f0 nach f1 über `dur`. */
export function tone(s: Voice, type: OscillatorType, f0: number, f1: number, dur: number, vol: number, o: LayerOpts = {}): void {
  const ctx = s.ctx;
  const t = s.t + (o.t ?? 0);
  const osc = ctx.createOscillator();
  osc.type = type;
  const a = Math.max(1, f0 * s.p);
  const b = Math.max(1, f1 * s.p);
  osc.frequency.setValueAtTime(a, t);
  if (b !== a) osc.frequency.exponentialRampToValueAtTime(b, t + dur);
  const g = ctx.createGain();
  g.gain.value = 0;
  const end = envelope(g.gain, t, dur, vol, o);
  if (o.lp) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.lp;
    osc.connect(f);
    f.connect(g);
  } else {
    osc.connect(g);
  }
  if (o.vib) {
    const l = ctx.createOscillator();
    l.frequency.value = o.vib[0];
    const lg = ctx.createGain();
    lg.gain.value = a * o.vib[1];
    l.connect(lg);
    lg.connect(osc.frequency);
    l.start(t);
    l.stop(end);
  }
  g.connect(s.in);
  osc.start(t);
  osc.stop(end);
  s.end = Math.max(s.end, end);
}

/** Rausch-Schicht durch ein Filter, dessen Frequenz von f0 nach f1 gleitet. */
export function noise(s: Voice, ftype: BiquadFilterType, f0: number, f1: number, q: number, dur: number, vol: number, o: LayerOpts = {}): void {
  const ctx = s.ctx;
  const t = s.t + (o.t ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = o.brown ? s.m.brown : s.m.white;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = ftype;
  f.Q.value = q;
  const a = clamp(f0 * s.p, 20, 18000);
  const b = clamp(f1 * s.p, 20, 18000);
  f.frequency.setValueAtTime(a, t);
  if (b !== a) f.frequency.exponentialRampToValueAtTime(b, t + dur);
  const g = ctx.createGain();
  g.gain.value = 0;
  const end = envelope(g.gain, t, dur, vol, o);
  src.connect(f);
  f.connect(g);
  g.connect(s.in);
  src.start(t, Math.random() * 1.5);
  src.stop(end);
  s.end = Math.max(s.end, end);
}

/** FM-Schicht (Sinus-Träger, Sinus-Modulator mit abklingendem Index) – Glocken, Metall, Glas. */
export function fm(s: Voice, fc: number, ratio: number, index: number, dur: number, vol: number, o: LayerOpts = {}): void {
  const ctx = s.ctx;
  const t = s.t + (o.t ?? 0);
  const f = Math.max(1, fc * s.p);
  const car = ctx.createOscillator();
  car.frequency.value = f;
  const mod = ctx.createOscillator();
  mod.frequency.value = f * ratio;
  const mg = ctx.createGain();
  mg.gain.setValueAtTime(index * f * ratio, t);
  mg.gain.exponentialRampToValueAtTime(Math.max(0.01, index * f * ratio * 0.02), t + dur * (o.id ?? 0.6));
  mod.connect(mg);
  mg.connect(car.frequency);
  const g = ctx.createGain();
  g.gain.value = 0;
  const end = envelope(g.gain, t, dur, vol, o);
  car.connect(g);
  g.connect(s.in);
  car.start(t);
  mod.start(t);
  car.stop(end);
  mod.stop(end);
  s.end = Math.max(s.end, end);
}
