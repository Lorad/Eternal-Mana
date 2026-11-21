import type { TrackDef } from '../sequencer';

/**
 * Grünwald – G-Dur, 6/8 (punktierte Viertel = 84), warm und beschwingt.
 * Form A – A' (mit Gegenstimme) – B – A' (32 Takte).
 *   A:  G | C | G/B | D | Em | C | Am–D | G
 *   B:  C | G/B | Am | D | C | G/B | A7 | D7
 */
const A_FLUTE = `d5q b4e d5q g5e | e5q. g5q e5e | d5q b4e g4q b4e | a4q. a4e b4e c5e |
                 b4q e5e g5q f#5e | e5q c5e e5q g5e | a5q g5e f#5q a5e | g5q.q -e`;
const A_HARP = `g3e b3e d4e g4e d4e b3e | c3e g3e c4e e4e c4e g3e | b2e g3e b3e d4e b3e g3e | d3e a3e d4e f#4e d4e a3e |
                e3e g3e b3e e4e b3e g3e | c3e g3e c4e e4e c4e g3e | a2e e3e c4e d3e a3e f#4e | g3e b3e d4e g4e d4e b3e`;
const A_BASS = `g2q. d3q. | c3q. g2q. | b2q. g2q. | d3q. a2q. | e2q. b2q. | c3q. g2q. | a2q. d3q. | g2q. d2q.`;
const A_PAD = `g3+b3+d4hq | g3+c4+e4hq | g3+b3+d4hq | f#3+a3+d4hq | g3+b3+e4hq | g3+c4+e4hq | a3+c4+e4q. a3+d4+f#4q. | g3+b3+d4hq`;
const HAT = 'X.o.o.x.o.o.';

export const gruenwald: TrackDef = {
  title: 'Grünwald',
  key: 'G-Dur',
  bpm: 126,
  gain: 0.52,
  stepsPerBar: 12,
  channels: {
    flute: { inst: 'flute', vol: 0.85, reverb: 0.25 },
    lead: { inst: 'lead', vol: 0.5, pan: 0.2, cutoff: 3200, reverb: 0.2 },
    harp: { inst: 'pluck', vol: 0.55, pan: -0.25, reverb: 0.2 },
    pad: { inst: 'pad', vol: 0.4, cutoff: 1300, reverb: 0.25 },
    bass: { inst: 'bass', vol: 0.5 },
  },
  drumVol: 0.4,
  sections: {
    A: {
      bars: 8,
      parts: { flute: A_FLUTE, harp: A_HARP, bass: A_BASS, pad: A_PAD },
      drums: { hat: HAT, kick: 'x.....o.....' },
    },
    A2: {
      bars: 8,
      parts: {
        flute: A_FLUTE,
        harp: A_HARP,
        bass: A_BASS,
        pad: A_PAD,
        // Gegenstimme in Terzen/Sexten unter der Melodie
        lead: `b4q. b4q. | c5q. c5q. | g4q. d4q. | f#4q. f#4q. | g4q. b4q. | c5q. c5q. | c5q. d5q. | b4q.q -e`,
      },
      drums: { hat: HAT, kick: 'x.....o.....', rim: '......x.....' },
    },
    B: {
      bars: 8,
      parts: {
        lead: `e5q. c5q e5e | d5q. b4q d5e | c5q b4e a4q c5e | b4q a4e f#4q a4e |
               e5q. g5q e5e | d5q. g5q b5e | a5q g5e e5q c#5e | d5q. a4e b4e c5e`,
        harp: `c3e g3e c4e e4e c4e g3e | b2e g3e b3e d4e b3e g3e | a2e e3e a3e c4e a3e e3e | d3e a3e d4e f#4e d4e a3e |
               c3e g3e c4e e4e c4e g3e | b2e g3e b3e d4e b3e g3e | a2e e3e g3e c#4e g3e e3e | d3e a3e d4e f#4e d4e c4e`,
        bass: `c3q. g2q. | b2q. g2q. | a2q. e2q. | d3q. a2q. | c3q. g2q. | b2q. g2q. | a2q. c#3q. | d3q. d2q.`,
        pad: `g3+c4+e4hq | g3+b3+d4hq | a3+c4+e4hq | f#3+a3+d4hq | g3+c4+e4hq | g3+b3+d4hq | g3+a3+c#4hq | f#3+a3+c4hq`,
      },
      drums: { hat: HAT, kick: 'x.....x.....', rim: '......x.....' },
    },
  },
  form: ['A', 'A2', 'B', 'A2'],
};
