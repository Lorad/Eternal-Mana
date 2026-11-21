import type { TrackDef } from '../sequencer';

/**
 * Frostgipfel – fis-Moll, 3/4, 92 bpm. Weit, klar, melancholisch: Glockenmelodie über Harfe und Fläche.
 * Form A – A' (mit Flöten-Mittelstimme) – B – A' (32 Takte).
 *   A:  F#m | D | A | E | F#m | D | Bm | C#sus4–C#
 *   B:  A | E/G# | F#m | C#m | D | A/C# | Bm | C#
 */
const A_BELL = `c#5h f#5q | e5q d5h | c#5h e5q | b4h. | c#5h a5q | g#5q f#5h | d5q e5q f#5q | f#5h f5q`;
const A_HARP = `f#3e c#4e a4e c#4e f#4e c#4e | d3e a3e f#4e a3e d4e a3e | a2e e3e c#4e e3e a3e e3e | e3e b3e g#4e b3e e4e b3e |
                f#3e c#4e a4e c#4e f#4e c#4e | d3e a3e f#4e a3e d4e a3e | b2e f#3e d4e f#3e b3e f#3e | c#3e g#3e f#4e g#3e f4e g#3e`;
const A_PAD = `f#3+a3+c#4h. | f#3+a3+d4h. | e3+a3+c#4h. | e3+g#3+b3h. | f#3+a3+c#4h. | f#3+a3+d4h. | f#3+b3+d4h. | f#3+g#3+c#4h f3+g#3+c#4q`;
const A_BASS = `f#2h. | d2h. | a2h. | e2h. | f#2h. | d2h. | b2h. | c#3h.`;

export const frost: TrackDef = {
  title: 'Frostgipfel',
  key: 'fis-Moll',
  bpm: 92,
  gain: 0.95,
  stepsPerBar: 12,
  channels: {
    bell: { inst: 'bell', vol: 0.5, pan: 0.15, reverb: 0.55 },
    flute: { inst: 'flute', vol: 0.6, pan: -0.15, reverb: 0.5 },
    harp: { inst: 'pluck', vol: 0.45, pan: -0.2, reverb: 0.4 },
    pad: { inst: 'pad', vol: 0.5, cutoff: 1200, reverb: 0.45 },
    bass: { inst: 'bass', vol: 0.42 },
  },
  sections: {
    A: { bars: 8, parts: { bell: A_BELL, harp: A_HARP, pad: A_PAD, bass: A_BASS } },
    A2: {
      bars: 8,
      parts: {
        bell: A_BELL,
        harp: A_HARP,
        pad: A_PAD,
        bass: A_BASS,
        flute: `a4h. | a4h. | a4h. | g#4h. | a4h. | a4h. | b4h. | g#4h.`,
      },
    },
    B: {
      bars: 8,
      parts: {
        flute: `e5h c#5q | b4h e5q | a5h g#5q | e5h. | f#5h a5q | e5h c#5q | d5q c#5q b4q | c#5h.`,
        harp: `a2e e3e c#4e e3e a3e e3e | g#2e e3e b3e e3e g#3e e3e | f#3e c#4e a4e c#4e f#4e c#4e | c#3e g#3e e4e g#3e c#4e g#3e |
               d3e a3e f#4e a3e d4e a3e | c#3e a3e e4e a3e c#4e a3e | b2e f#3e d4e f#3e b3e f#3e | c#3e g#3e f4e g#3e c#4e g#3e`,
        pad: `e3+a3+c#4h. | e3+g#3+b3h. | f#3+a3+c#4h. | e3+g#3+c#4h. | f#3+a3+d4h. | e3+a3+c#4h. | f#3+b3+d4h. | f3+g#3+c#4h.`,
        bass: `a2h. | g#2h. | f#2h. | c#3h. | d3h. | c#3h. | b2h. | c#3h.`,
        bell: `-h a5q | -h. | -h c#6q | -h g#5q | -h d6q | -h. | -h. | -q f5q g#5q`,
      },
    },
  },
  form: ['A', 'A2', 'B', 'A2'],
};
