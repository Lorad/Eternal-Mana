import type { TrackDef } from '../sequencer';

/**
 * Verlies – g-Moll, 88 bpm, 4/4. Gespannt und sparsam: Zupf-Ostinato, wenige Melodietöne, tickende Hi-Hat.
 * Form A – B (16 Takte).
 *   A:  Gm | Gm | Gm | Gm | Eb/G | Eb/G | Cm/G | D/F#
 *   B:  Cm | Cm | Gm | Gm | Ab (neapolitanisch) | Ab | Dsus4 | D
 */
const GM = 'g3e d4e bb3e d4e g3e eb4e bb3e d4e';
const EB = 'g3e eb4e bb3e eb4e g3e eb4e bb3e eb4e';
const CM = 'g3e eb4e c4e eb4e g3e eb4e c4e eb4e';
const D = 'f#3e d4e a3e d4e f#3e d4e c4e d4e';
const AB = 'ab3e eb4e c4e eb4e ab3e eb4e c4e eb4e';
const DSUS = 'g3e d4e a3e d4e g3e d4e a3e d4e';

export const dungeon: TrackDef = {
  title: 'Verlies',
  key: 'g-Moll',
  bpm: 88,
  gain: 0.85,
  channels: {
    flute: { inst: 'flute', vol: 0.6, reverb: 0.55 },
    bell: { inst: 'bell', vol: 0.3, pan: 0.2, reverb: 0.6 },
    pluck: { inst: 'pluck', vol: 0.42, pan: -0.2, reverb: 0.3 },
    pad: { inst: 'pad', vol: 0.4, cutoff: 750, reverb: 0.4 },
    bass: { inst: 'bass', vol: 0.5 },
  },
  drumVol: 0.35,
  drumReverb: 0.2,
  sections: {
    A: {
      bars: 8,
      parts: {
        flute: `-w | -w | -h d5q. c5e | bb4h. -q | -w | -h g5q. f5e | eb5h. d5q | d5h. -q`,
        pluck: `${GM} | ${GM} | ${GM} | ${GM} | ${EB} | ${EB} | ${CM} | ${D}`,
        pad: `g3+bb3+d4w | g3+bb3+d4w | g3+bb3+d4w | g3+bb3+d4w | g3+bb3+eb4w | g3+bb3+eb4w | g3+c4+eb4w | f#3+a3+d4w`,
        bass: `g2h. -e g2e | g2h. f2q | g2h. -e g2e | g2h. bb2q | eb2h. -e eb2e | eb2h. bb2q | c2h. -e c2e | d2h. d2q`,
      },
      drums: { hat: 'x...o...x...o.o.', kick: 'x.........o.....' },
    },
    B: {
      bars: 8,
      parts: {
        bell: `g5h. eb5q | c5h. -q | d5h. bb4q | g4h. -q | c5h. eb5q | ab5h. g5q | g5w | f#5h. -q`,
        pluck: `${CM} | ${CM} | ${GM} | ${GM} | ${AB} | ${AB} | ${DSUS} | ${D}`,
        pad: `g3+c4+eb4w | g3+c4+eb4w | g3+bb3+d4w | g3+bb3+d4w | ab3+c4+eb4w | ab3+c4+eb4w | g3+a3+d4w | f#3+a3+d4w`,
        bass: `c2h. -e c2e | c2h. eb2q | g2h. -e g2e | g2h. g2q | ab2h. -e ab2e | ab2h. eb2q | d2h. -e d2e | d2h. d2q`,
      },
      drums: { hat: 'x...o...x...o.o.', kick: 'x.........o.....', rim: '........o.......' },
    },
  },
  form: ['A', 'B'],
};
