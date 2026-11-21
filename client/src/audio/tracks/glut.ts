import type { TrackDef } from '../sequencer';

/**
 * Glutschlund – e-phrygisch (mit harmonischer Dominante H), 138 bpm, 4/4. Treibender Bass, Toms.
 * Form A – B (16 Takte).
 *   A:  Em | Em | F | Em | Am | Am | F | H7
 *   B:  C | Dm | Em | Em | C | Dm | H | H
 */
const EM = 'e2e e2e e3e e2e g2e e2e d2e e2e';
const F = 'f2e f2e f3e f2e a2e f2e e2e f2e';
const AM = 'a2e a2e a3e a2e c3e a2e g2e a2e';
const B7 = 'b2e b2e b3e b2e d#3e b2e a2e b2e';
const C = 'c3e c3e c4e c3e e3e c3e b2e c3e';
const DM = 'd3e d3e d4e d3e f3e d3e c3e d3e';

export const glut: TrackDef = {
  title: 'Glutschlund',
  key: 'e-phrygisch',
  bpm: 138,
  gain: 0.72,
  channels: {
    saw: { inst: 'saw', vol: 0.75, cutoff: 3000, reverb: 0.15 },
    lead: { inst: 'lead', vol: 0.6, pan: 0.15, cutoff: 3500, reverb: 0.15 },
    strings: { inst: 'strings', vol: 0.5, cutoff: 1800, reverb: 0.2 },
    bass: { inst: 'bass', vol: 0.55 },
  },
  drumVol: 0.6,
  sections: {
    A: {
      bars: 8,
      parts: {
        saw: `e5q. g5e f5e e5e b4q | e5q. g5e a5e g5e e5q | f5q. a5e c6q a5q | b5h. -q |
              a5q. c6e b5e a5e e5q | a5q. c6e d6e c6e a5q | c6q. a5e f5q a5q | b5q. a5e f#5q d#5q`,
        strings: `e3+g3+b3w | e3+g3+b3w | f3+a3+c4w | e3+g3+b3w | a3+c4+e4w | a3+c4+e4w | f3+a3+c4w | f#3+a3+b3+d#4w`,
        bass: `${EM} | ${EM} | ${F} | ${EM} | ${AM} | ${AM} | ${F} | ${B7}`,
      },
      drums: {
        kick: 'x..x..x.x..x..x.',
        snare: '....x.......x...',
        hat: 'x.o.x.o.x.o.x.o.',
        tomL: '................ ..............xx',
        tomH: '................ ............xx..',
      },
    },
    B: {
      bars: 8,
      parts: {
        lead: `g5h e5q g5q | a5h f5q a5q | b5q. a5e g5q e5q | e5h. -q |
               c6h g5q c6q | d6h a5q d6q | d#6q. c6e b5q a5q | b5h f#5q b4q`,
        strings: `e3+g3+c4w | f3+a3+d4w | e3+g3+b3w | e3+g3+b3w | e3+g3+c4w | f3+a3+d4w | f#3+a3+b3w | f#3+a3+d#4w`,
        bass: `${C} | ${DM} | ${EM} | ${EM} | ${C} | ${DM} | ${B7} | ${B7}`,
      },
      drums: {
        kick: 'x.......x..x....',
        snare: '........x.......',
        hat: 'x.x.x.x.x.x.x.x.',
        tomL: '......x.......x. ......x.....x.xx',
        tomH: '....x.......x... ....x.......x...',
        timp: 'x...............',
      },
    },
  },
  form: ['A', 'B'],
};
