/**
 * Musik-Instrumente. Jede Note baut einen kleinen Teilgraphen, der sich nach dem Ausklingen selbst trennt.
 * `dest` ist der Kanal-Eingang (Lautstärke, Filter, Panorama und Hall-Send liegen auf Kanalebene).
 */
import type { Mixer } from './engine';

export type InstName = 'lead' | 'saw' | 'bass' | 'pad' | 'strings' | 'pluck' | 'bell' | 'flute';
export type DrumName = 'kick' | 'snare' | 'hat' | 'ohat' | 'rim' | 'tomL' | 'tomH' | 'timp';

function adsr(p: AudioParam, t: number, dur: number, peak: number, a: number, d: number, s: number, r: number): number {
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + a);
  p.linearRampToValueAtTime(peak * s, t + a + d);
  const off = Math.max(t + a + d, t + dur);
  p.setValueAtTime(peak * s, off);
  p.linearRampToValueAtTime(0, off + r);
  return off + r;
}

function vibrato(ctx: BaseAudioContext, oscs: OscillatorNode[], f: number, t: number, end: number, depth: number, rate: number): void {
  const l = ctx.createOscillator();
  l.frequency.value = rate;
  const g = ctx.createGain();
  g.gain.value = 0;
  g.gain.setValueAtTime(0, t + 0.14);
  g.gain.linearRampToValueAtTime(f * depth, t + 0.34);
  l.connect(g);
  for (const o of oscs) g.connect(o.frequency);
  l.start(t);
  l.stop(end);
}

function finish(g: GainNode, dest: AudioNode, srcs: AudioScheduledSourceNode[], t: number, end: number): void {
  g.connect(dest);
  for (const s of srcs) {
    s.start(t);
    s.stop(end + 0.02);
  }
  srcs[0].onended = () => g.disconnect();
}

export function playNote(m: Mixer, dest: AudioNode, inst: InstName, freq: number, t: number, dur: number, vel: number): void {
  const ctx = m.ctx;
  const g = ctx.createGain();
  g.gain.value = 0;
  const osc = (type: OscillatorType | null, f: number, detune = 0): OscillatorNode => {
    const o = ctx.createOscillator();
    if (type) o.type = type;
    else o.setPeriodicWave(m.pulse);
    o.frequency.value = f;
    o.detune.value = detune;
    return o;
  };
  switch (inst) {
    case 'lead': {
      // Puls-Lead (25 % Tastverhältnis) mit verzögertem Vibrato
      const o = osc(null, freq);
      o.connect(g);
      const end = adsr(g.gain, t, dur * 0.94, 0.15 * vel, 0.008, 0.09, 0.7, 0.06);
      if (dur > 0.3) vibrato(ctx, [o], freq, t, end, 0.006, 5.6);
      finish(g, dest, [o], t, end);
      break;
    }
    case 'saw': {
      // kräftiger Säge-Lead, zwei leicht verstimmte Oszillatoren
      const a = osc('sawtooth', freq, -7);
      const b = osc('sawtooth', freq, 7);
      a.connect(g);
      b.connect(g);
      const end = adsr(g.gain, t, dur * 0.94, 0.1 * vel, 0.01, 0.1, 0.75, 0.07);
      if (dur > 0.3) vibrato(ctx, [a, b], freq, t, end, 0.005, 5.8);
      finish(g, dest, [a, b], t, end);
      break;
    }
    case 'bass': {
      const o = osc('triangle', freq);
      o.connect(g);
      const end = adsr(g.gain, t, dur * 0.9, 0.42 * vel, 0.006, 0.12, 0.75, 0.05);
      finish(g, dest, [o], t, end);
      break;
    }
    case 'pad':
    case 'strings': {
      // weiche Fläche: verstimmte Sägezähne, Tiefpass sitzt auf dem Kanal
      const soft = inst === 'pad';
      const a = osc('sawtooth', freq, -9);
      const b = osc('sawtooth', freq, 9);
      a.connect(g);
      b.connect(g);
      const att = soft ? Math.min(0.4, dur * 0.4) : 0.05;
      const end = adsr(g.gain, t, dur * 0.98, 0.06 * vel, att, 0.2, 0.85, soft ? 0.55 : 0.22);
      finish(g, dest, [a, b], t, end);
      break;
    }
    case 'pluck': {
      // Harfe/Zupfton: schneller Anschlag, exponentielles Ausklingen, tiefe Töne klingen länger
      const a = osc('triangle', freq);
      const b = osc('sine', freq * 2);
      const bg = ctx.createGain();
      bg.gain.setValueAtTime(0.35, t);
      bg.gain.setTargetAtTime(0, t, 0.06);
      a.connect(g);
      b.connect(bg);
      bg.connect(g);
      const tau = Math.min(0.5, Math.max(0.14, 0.1 + 55 / freq));
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.3 * vel, t + 0.004);
      g.gain.setTargetAtTime(0, t + 0.004, tau);
      const end = t + 0.004 + tau * 5;
      g.gain.setValueAtTime(0.3 * vel * Math.exp(-5), end);
      g.gain.linearRampToValueAtTime(0, end + 0.02);
      finish(g, dest, [a, b], t, end + 0.02);
      break;
    }
    case 'bell': {
      // FM-Glocke: Modulator bei 3,5-facher Frequenz, Index klingt schnell ab
      const car = osc('sine', freq);
      const mod = osc('sine', freq * 3.5);
      const mg = ctx.createGain();
      mg.gain.setValueAtTime(freq * 2.2, t);
      mg.gain.setTargetAtTime(freq * 0.15, t, 0.18);
      mod.connect(mg);
      mg.connect(car.frequency);
      car.connect(g);
      const tau = 0.45;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.2 * vel, t + 0.003);
      g.gain.setTargetAtTime(0, t + 0.003, tau);
      const end = t + tau * 5;
      g.gain.setValueAtTime(0.2 * vel * Math.exp(-5), end);
      g.gain.linearRampToValueAtTime(0, end + 0.02);
      finish(g, dest, [car, mod], t, end + 0.02);
      break;
    }
    case 'flute': {
      // Sinus + etwas Dreieck, Anblasgeräusch aus bandgefiltertem Rauschen
      const a = osc('sine', freq);
      const b = osc('triangle', freq);
      const bg = ctx.createGain();
      bg.gain.value = 0.3;
      a.connect(g);
      b.connect(bg);
      bg.connect(g);
      const end = adsr(g.gain, t, dur * 0.96, 0.26 * vel, 0.05, 0.12, 0.8, 0.12);
      const n = ctx.createBufferSource();
      n.buffer = m.white;
      n.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = Math.min(9000, freq * 2.5);
      bp.Q.value = 1.2;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.5, t);
      ng.gain.setTargetAtTime(0.1, t + 0.02, 0.07);
      n.connect(bp);
      bp.connect(ng);
      ng.connect(g);
      if (dur > 0.3) vibrato(ctx, [a, b], freq, t, end, 0.005, 5);
      g.connect(dest);
      a.start(t);
      b.start(t);
      n.start(t, Math.random() * 1.5);
      a.stop(end + 0.02);
      b.stop(end + 0.02);
      n.stop(end + 0.02);
      a.onended = () => g.disconnect();
      break;
    }
  }
}

export function playDrum(m: Mixer, dest: AudioNode, drum: DrumName, t: number, vel: number): void {
  const ctx = m.ctx;
  const out = ctx.createGain();
  out.gain.value = vel;
  out.connect(dest);
  let longest: AudioScheduledSourceNode | null = null;
  let longestEnd = 0;
  const track = (src: AudioScheduledSourceNode, end: number): void => {
    if (end > longestEnd) {
      longestEnd = end;
      longest = src;
    }
  };
  const sweep = (type: OscillatorType, f0: number, f1: number, glide: number, decay: number, vol: number): void => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + glide);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.002);
    g.gain.exponentialRampToValueAtTime(vol * 0.002, t + decay);
    g.gain.linearRampToValueAtTime(0, t + decay + 0.01);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + decay + 0.02);
    track(o, t + decay + 0.02);
  };
  const burst = (type: BiquadFilterType, f: number, q: number, decay: number, vol: number): void => {
    const n = ctx.createBufferSource();
    n.buffer = m.white;
    n.loop = true;
    const flt = ctx.createBiquadFilter();
    flt.type = type;
    flt.frequency.value = f;
    flt.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.001);
    g.gain.exponentialRampToValueAtTime(vol * 0.002, t + decay);
    g.gain.linearRampToValueAtTime(0, t + decay + 0.01);
    n.connect(flt);
    flt.connect(g);
    g.connect(out);
    n.start(t, Math.random() * 1.5);
    n.stop(t + decay + 0.02);
    track(n, t + decay + 0.02);
  };
  switch (drum) {
    case 'kick':
      sweep('sine', 155, 46, 0.09, 0.24, 0.9);
      burst('lowpass', 1800, 0.7, 0.012, 0.25);
      break;
    case 'snare':
      sweep('triangle', 210, 150, 0.06, 0.1, 0.4);
      burst('highpass', 1400, 0.7, 0.15, 0.45);
      break;
    case 'hat':
      burst('highpass', 7500, 0.7, 0.045, 0.22);
      break;
    case 'ohat':
      burst('highpass', 6500, 0.7, 0.26, 0.2);
      break;
    case 'rim':
      sweep('triangle', 820, 780, 0.02, 0.03, 0.35);
      burst('bandpass', 2400, 2, 0.02, 0.25);
      break;
    case 'tomL':
      sweep('sine', 125, 78, 0.12, 0.3, 0.75);
      burst('lowpass', 900, 0.7, 0.02, 0.2);
      break;
    case 'tomH':
      sweep('sine', 190, 125, 0.1, 0.24, 0.65);
      burst('lowpass', 1200, 0.7, 0.02, 0.2);
      break;
    case 'timp':
      sweep('sine', 92, 73, 0.08, 0.7, 0.85);
      sweep('triangle', 147, 146, 0.05, 0.35, 0.15);
      burst('lowpass', 500, 0.7, 0.05, 0.35);
      break;
  }
  if (longest) (longest as AudioScheduledSourceNode).onended = () => out.disconnect();
}
