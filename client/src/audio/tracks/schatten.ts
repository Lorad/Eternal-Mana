import type { TrackDef } from '../sequencer';

/**
 * Schattenreich – c-Moll mit phrygischer Sekunde und Tritonus (Db, Gb), 100 bpm, 4/4.
 * Pulsierender Bass, Sekundreibungen in den Glocken. Form A – B (16 Takte).
 *   A:  Cm(add9) | Cm | Db | Cm | Fm | Fm | Gb | G
 *   B:  Ab | Ab | Bbm | Bbm | Ab | Gb | Fm6 | G
 */
const pulse = (n: string, hi: string): string => `(${n}e ${n}e ${hi}e ${n}e)*2`;

export const schatten: TrackDef = {
  title: 'Schattenreich',
  key: 'c-Moll',
  bpm: 100,
  gain: 0.85,
  channels: {
    lead: { inst: 'lead', vol: 0.6, cutoff: 2600, reverb: 0.4 },
    saw: { inst: 'saw', vol: 0.6, cutoff: 2400, reverb: 0.35 },
    bell: { inst: 'bell', vol: 0.22, pan: 0.35, reverb: 0.7 },
    pad: { inst: 'pad', vol: 0.5, cutoff: 800, reverb: 0.4 },
    bass: { inst: 'bass', vol: 0.5 },
  },
  drumVol: 0.5,
  drumReverb: 0.15,
  sections: {
    A: {
      bars: 8,
      parts: {
        lead: `g4h. ab4q | g4h eb4h | f4h. ab4q | g4w | c5h. db5q | c5h ab4h | bb4h. db5q | b4h d5h`,
        bell: `-h. d6e eb6e | -w | -h. c6e db6e | -w | -h. g5e ab5e | -w | -h. f5e gb5e | -w`,
        pad: `c3+d3+eb3+g3w | c3+eb3+g3w | db3+f3+ab3w | c3+eb3+g3w | c3+f3+ab3w | c3+f3+ab3w | db3+gb3+bb3w | d3+g3+b3w`,
        bass: `${pulse('c2', 'c3')} | ${pulse('c2', 'c3')} | ${pulse('db2', 'db3')} | ${pulse('c2', 'c3')} |
               ${pulse('f2', 'f3')} | ${pulse('f2', 'f3')} | ${pulse('gb2', 'gb3')} | ${pulse('g2', 'g3')}`,
      },
      drums: { kick: 'x.....x.x.......', hat: '..o...o...o...o.', rim: '............x...' },
    },
    B: {
      bars: 8,
      parts: {
        saw: `eb5q. c5e ab4q c5q | eb5h. f5q | f5q. db5e bb4q db5q | f5h. gb5q |
              ab5q. eb5e c5q eb5q | gb5h. db5q | f5q. eb5e d5q c5q | d5h b4h`,
        bell: `-w | -h. g6q | -w | -h. a6e bb6e | -w | -h. f6q | -w | -h g6e ab6e -q`,
        pad: `c3+eb3+ab3w | c3+eb3+ab3w | db3+f3+bb3w | db3+f3+bb3w | c3+eb3+ab3w | db3+gb3+bb3w | c3+d3+f3+ab3w | d3+g3+b3w`,
        bass: `${pulse('ab2', 'ab3')} | ${pulse('ab2', 'ab3')} | ${pulse('bb2', 'bb3')} | ${pulse('bb2', 'bb3')} |
               ${pulse('ab2', 'ab3')} | ${pulse('gb2', 'gb3')} | ${pulse('f2', 'f3')} | ${pulse('g2', 'g3')}`,
      },
      drums: { kick: 'x...x...x...x...', snare: '....o.......x...', hat: 'x.o.x.o.x.o.x.o.' },
    },
  },
  form: ['A', 'B'],
};
