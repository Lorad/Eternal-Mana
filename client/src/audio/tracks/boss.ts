import type { TrackDef } from '../sequencer';
import { transpose } from '../notes';

/**
 * Bosskampf – h-Moll, 164 bpm, 4/4. Schnell und dramatisch: Säge-Lead, Sechzehntel-Arpeggien, treibender Bass.
 * Form A – A' (Lead oktaviert gedoppelt) – B (24 Takte).
 *   A:  Bm | Bm | G | A | Bm | Bm | G | F#
 *   B:  Em | Bm | Em | F#7 | G | A | Bm | F#
 */
const drive = (n: string, hi: string): string => `(${n}e ${n}e ${hi}e ${n}e)*2`;
const arp = (a: string, b: string, c: string, d: string): string => `(${a}s ${b}s ${c}s ${d}s)*4`;
const BM = arp('b3', 'd4', 'f#4', 'b4');
const G = arp('b3', 'd4', 'g4', 'b4');
const A = arp('c#4', 'e4', 'a4', 'c#5');
const FS = arp('a#3', 'c#4', 'f#4', 'a#4');
const EM = arp('b3', 'e4', 'g4', 'b4');

const A_LEAD = `b4e d5e f#5e b5q a5e f#5q | g5e f#5e e5e f#5q. d5q | g4e b4e d5e g5q f#5e d5q | e5e d5e c#5e e5q. a5q |
                b5q. a5e f#5e d5e f#5q | b5q. c#6e d6q c#6e b5e | d6q. b5e g5q b5q | a#5q. f#5e c#5q f#5q`;
const A_PARTS = {
  saw: A_LEAD,
  pluck: `${BM} | ${BM} | ${G} | ${A} | ${BM} | ${BM} | ${G} | ${FS}`,
  strings: `b3+d4+f#4w | b3+d4+f#4w | b3+d4+g4w | a3+c#4+e4w | b3+d4+f#4w | b3+d4+f#4w | b3+d4+g4w | a#3+c#4+f#4w`,
  bass: `${drive('b2', 'b3')} | ${drive('b2', 'b3')} | ${drive('g2', 'g3')} | ${drive('a2', 'a3')} |
         ${drive('b2', 'b3')} | ${drive('b2', 'b3')} | ${drive('g2', 'g3')} | ${drive('f#2', 'f#3')}`,
};

export const boss: TrackDef = {
  title: 'Bosskampf',
  key: 'h-Moll',
  bpm: 164,
  gain: 0.7,
  channels: {
    saw: { inst: 'saw', vol: 0.75, cutoff: 3400, reverb: 0.15 },
    lead: { inst: 'lead', vol: 0.4, pan: 0.2, cutoff: 3000, reverb: 0.15 },
    pluck: { inst: 'pluck', vol: 0.3, pan: -0.3, reverb: 0.1 },
    strings: { inst: 'strings', vol: 0.5, cutoff: 2000, reverb: 0.2 },
    bass: { inst: 'bass', vol: 0.55 },
  },
  drumVol: 0.6,
  sections: {
    A: {
      bars: 8,
      parts: A_PARTS,
      drums: { kick: 'x..x..x.x..x..x.', snare: '....x.......x...', hat: 'x.o.x.o.x.o.x.o.' },
    },
    A2: {
      bars: 8,
      parts: { ...A_PARTS, lead: transpose(A_LEAD, -12) },
      drums: {
        kick: 'x..x..x.x..x..x.',
        snare: '(....x.......x...)*7 ....x.......x.xx',
        hat: 'x.oxx.oxx.oxx.ox',
        tomL: '(................)*7 ..........x...x.',
      },
    },
    B: {
      bars: 8,
      parts: {
        saw: `g5h e5q b5q | f#5h. d5q | g5h e5q g5q | f#5q e5q c#5q a#4q |
              b5h g5q d6q | c#6h. a5q | d6q c#6q b5q f#5q | a#5h c#6h`,
        pluck: `${EM} | ${BM} | ${EM} | ${FS} | ${G} | ${A} | ${BM} | ${FS}`,
        strings: `b3+e4+g4w | b3+d4+f#4w | b3+e4+g4w | a#3+c#4+e4w | b3+d4+g4w | a3+c#4+e4w | b3+d4+f#4w | a#3+c#4+f#4w`,
        bass: `${drive('e2', 'e3')} | ${drive('b2', 'b3')} | ${drive('e2', 'e3')} | ${drive('f#2', 'f#3')} |
               ${drive('g2', 'g3')} | ${drive('a2', 'a3')} | ${drive('b2', 'b3')} | ${drive('f#2', 'f#3')}`,
      },
      drums: {
        kick: 'x.....x.x.....x.',
        snare: '(....x.......x...)*7 ....x...x.x.xxxx',
        hat: 'x.x.x.x.x.x.x.x.',
        ohat: '..............x.',
      },
    },
  },
  form: ['A', 'A2', 'B'],
};
