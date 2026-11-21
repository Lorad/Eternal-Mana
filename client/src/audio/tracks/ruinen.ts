import type { TrackDef } from '../sequencer';

/**
 * Versunkene Ruinen – d-dorisch (mit h statt b), 96 bpm, 4/4. Flöte, Harfe, Rahmentrommel.
 * Form A – B (16 Takte).
 *   A:  Dm | G/D | Dm | C | Dm | G | Am | Dm
 *   B:  F | C | G | Dm | F | G | Am | Am(sus2)
 */
const DMh = 'd3e a3e d4e a3e f4e a3e d4e a3e';
const GD = 'd3e b3e d4e b3e g4e b3e d4e b3e';
const Ch = 'c3e g3e c4e g3e e4e g3e c4e g3e';
const Gh = 'g2e d3e g3e d3e b3e d3e g3e d3e';
const AMh = 'a2e e3e a3e e3e c4e e3e a3e e3e';
const Fh = 'f2e c3e f3e c3e a3e c3e f3e c3e';

export const ruinen: TrackDef = {
  title: 'Versunkene Ruinen',
  key: 'd-dorisch',
  bpm: 96,
  gain: 0.55,
  channels: {
    flute: { inst: 'flute', vol: 0.8, reverb: 0.45 },
    harp: { inst: 'pluck', vol: 0.5, pan: -0.25, reverb: 0.35 },
    bell: { inst: 'bell', vol: 0.25, pan: 0.3, reverb: 0.6 },
    pad: { inst: 'pad', vol: 0.4, cutoff: 900, reverb: 0.4 },
    bass: { inst: 'bass', vol: 0.45 },
  },
  drumVol: 0.4,
  drumReverb: 0.25,
  sections: {
    A: {
      bars: 8,
      parts: {
        flute: `d5q. e5e f5q a5q | g5q. f5e d5q b4q | d5q. e5e f5e g5e a5q | g5h e5q c5q |
                f5q. e5e d5q a4q | b4q. c5e d5q g5q | e5q. d5e c5q e5q | d5h. -q`,
        harp: `${DMh} | ${GD} | ${DMh} | ${Ch} | ${DMh} | ${Gh} | ${AMh} | ${DMh}`,
        pad: `d3+a3+d4w | d3+g3+b3w | d3+a3+d4w | c3+g3+c4w | d3+a3+d4w | d3+g3+b3w | e3+a3+c4w | d3+a3+d4w`,
        bass: `d2w | d2w | d2w | c2w | d2w | g2w | a2w | d2w`,
      },
      drums: { tomL: 'x.....x...x.....', tomH: '....o.......x.o.', hat: '..o...o...o...o.' },
    },
    B: {
      bars: 8,
      parts: {
        flute: `a5h f5q c5q | g5h e5q c5q | b5q. a5e g5q d5q | f5h d5h |
                a5q. g5e f5q a5q | b5q. a5e g5q b5q | c6h b5q a5q | e5h. -q`,
        harp: `${Fh} | ${Ch} | ${Gh} | ${DMh} | ${Fh} | ${Gh} | ${AMh} | ${AMh}`,
        bell: `-h. c6q | -w | -h. d6q | -w | -h. c6q | -w | -h. e6q | -h b5q a5q`,
        pad: `f3+a3+c4w | e3+g3+c4w | d3+g3+b3w | d3+f3+a3w | f3+a3+c4w | d3+g3+b3w | e3+a3+c4w | e3+a3+b3w`,
        bass: `f2w | c2w | g2w | d2w | f2w | g2w | a2w | a2w`,
      },
      drums: { tomL: 'x.....x...x.....', tomH: '....o.......x.o.', hat: '..o...o...o...o.', rim: '........o.......' },
    },
  },
  form: ['A', 'B'],
};
