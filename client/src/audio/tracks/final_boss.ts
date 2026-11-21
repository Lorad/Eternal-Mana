import type { TrackDef } from '../sequencer';
import { transpose } from '../notes';

/**
 * Finalkampf – d-Moll, 152 bpm, 4/4. Das Titelthema (menu.ts) in der Mollvariante, doppelt so drängend:
 * dieselbe Melodie Ton für Ton auf die Molltonleiter übertragen (fis→f, h→b), über Achtelbass und Schlagzeug.
 * Form I (Glocken-Zitat über Pauken, 4 Takte) – A – A' (Lead oktaviert, Glocken dazu) – B (28 Takte).
 *   I:  Dm | A/C# | Bb | Gm–A
 *   A:  Dm | A/C# | Bb | Gm | Dm/F | Gm | Em7b5 | A (4–3-Vorhalt)
 *   B:  Bb | F | Gm | Dm/F | Em7b5 | Gm/Bb | Asus4 | A
 */
const drive = (n: string, hi: string): string => `(${n}e ${n}e ${hi}e ${n}e)*2`;
const arp = (a: string, b: string, c: string, d: string): string => `(${a}s ${b}s ${c}s ${d}s)*4`;
const DM = arp('d4', 'f4', 'a4', 'd5');
const AC = arp('c#4', 'e4', 'a4', 'c#5');
const BB = arp('d4', 'f4', 'bb4', 'd5');
const GM = arp('d4', 'g4', 'bb4', 'd5');
const DMF = arp('f4', 'a4', 'd5', 'f5');
const EDIM = arp('e4', 'g4', 'bb4', 'd5');
const ASUS = arp('d4', 'e4', 'a4', 'd5');
const FMAJ = arp('c4', 'f4', 'a4', 'c5');

// Titelthema Teil A in d-Moll
const THEME_A = `a4e d5e f5q. e5e d5q | e5h. c#5q | bb4e d5e f5q. e5e d5q | bb4h g4q a4q |
                 a4e d5e a5q. g5e f5q | g5q. f5e e5q d5q | e5q. g5e f5q e5q | d5h c#5h`;
// Titelthema Teil B in d-Moll
const THEME_B = `f5q. d5e bb4q d5q | c5h. a4q | bb4q. d5e g5q f5q | f5q e5q d5h |
                 e5q. g5e bb5q a5q | g5q. a5e bb5h | a5h d5q e5q | e5h. c#5q`;

const A_PARTS = {
  saw: THEME_A,
  pluck: `${DM} | ${AC} | ${BB} | ${GM} | ${DMF} | ${GM} | ${EDIM} | (d4s e4s a4s d5s)*2 (c#4s e4s a4s c#5s)*2`,
  strings: `a3+d4+f4w | a3+c#4+e4w | bb3+d4+f4w | bb3+d4+g4w | a3+d4+f4w | bb3+d4+g4w | bb3+d4+e4w | a3+d4+e4h a3+c#4+e4h`,
  bass: `${drive('d2', 'd3')} | ${drive('c#3', 'c#4')} | ${drive('bb2', 'bb3')} | ${drive('g2', 'g3')} |
         ${drive('f2', 'f3')} | ${drive('g2', 'g3')} | ${drive('e2', 'e3')} | ${drive('a2', 'a3')}`,
};

export const final_boss: TrackDef = {
  title: 'Ewiges Mana – Finale',
  key: 'd-Moll',
  bpm: 152,
  gain: 0.72,
  channels: {
    saw: { inst: 'saw', vol: 0.75, cutoff: 3400, reverb: 0.2 },
    lead: { inst: 'lead', vol: 0.4, pan: 0.2, cutoff: 3200, reverb: 0.2 },
    bell: { inst: 'bell', vol: 0.35, pan: -0.2, reverb: 0.5 },
    pluck: { inst: 'pluck', vol: 0.28, pan: 0.3, reverb: 0.1 },
    strings: { inst: 'strings', vol: 0.55, cutoff: 2100, reverb: 0.25 },
    bass: { inst: 'bass', vol: 0.55 },
  },
  drumVol: 0.6,
  sections: {
    I: {
      bars: 4,
      parts: {
        bell: `a5e d6e f6q. e6e d6q | e6h. c#6q | bb5e d6e f6q. e6e d6q | bb5h a5h`,
        strings: `d3+a3+d4w | c#3+a3+e4w | d3+bb3+f4w | d3+g3+bb3h c#3+a3+e4h`,
        bass: `d2w | c#2w | bb1w | g2h a2h`,
      },
      drums: { timp: 'X.......x....... X.......x....... X.......x...x... x...x...x.x.xxxx', ohat: '(................)*3 ............x...' },
    },
    A: {
      bars: 8,
      parts: A_PARTS,
      drums: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.o.x.o.x.o.x.o.', ohat: '(................)*7 ..............x.' },
    },
    A2: {
      bars: 8,
      parts: {
        ...A_PARTS,
        saw: transpose(THEME_A, 12),
        lead: THEME_A,
        bell: `-h. a6q | -h e6q -q | -h. f6q | -h d6q -q | -h. a6q | -h g6q -q | -h. e6q | -h a6q c#7q`,
      },
      drums: {
        kick: 'x..xx...x..xx...',
        snare: '(....x.......x...)*7 ....x.......x.xx',
        hat: 'x.oxx.oxx.oxx.ox',
        timp: 'x............... ................',
      },
    },
    B: {
      bars: 8,
      parts: {
        saw: THEME_B,
        lead: `d5w | c5w | d5w | a4w | bb4w | d5w | e5w | e5h. e5q`,
        pluck: `${BB} | ${FMAJ} | ${GM} | ${DMF} | ${EDIM} | ${GM} | ${ASUS} | ${AC}`,
        strings: `bb3+d4+f4w | a3+c4+f4w | bb3+d4+g4w | a3+d4+f4w | bb3+d4+e4w | bb3+d4+g4w | a3+d4+e4w | a3+c#4+e4w`,
        bass: `${drive('bb2', 'bb3')} | ${drive('f2', 'f3')} | ${drive('g2', 'g3')} | ${drive('f2', 'f3')} |
               ${drive('e2', 'e3')} | ${drive('bb2', 'bb3')} | ${drive('a2', 'a3')} | ${drive('a2', 'a3')}`,
      },
      drums: {
        kick: 'x.....x.x.....x.',
        snare: '(........x.......)*6 ....x.......x... x...x...x.x.xxxx',
        hat: 'x.x.x.x.x.x.x.x.',
        timp: 'x............... ................',
      },
    },
  },
  form: ['I', 'A', 'A2', 'B'],
};
