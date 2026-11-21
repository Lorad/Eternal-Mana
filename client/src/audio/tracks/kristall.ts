import type { TrackDef } from '../sequencer';

/**
 * Kristallgrotte – a-Moll mit Farbtönen (None, lydische Quarte, chromatische Mediante), 84 bpm, 4/4.
 * Glitzernde Glocken-Arpeggien, viel Hall. Form A – B (16 Takte).
 *   A:  Am(add9) | Fmaj7 | Am(add9) | Fmaj7(#11) | Dm9 | Em7 | Fmaj7 | E
 *   B:  Fmaj7 | G | Em7 | Am | Fmaj7 | G | Abmaj7 | E
 */
export const kristall: TrackDef = {
  title: 'Kristallgrotte',
  key: 'a-Moll',
  bpm: 84,
  gain: 0.65,
  channels: {
    flute: { inst: 'flute', vol: 0.7, reverb: 0.6 },
    bell: { inst: 'bell', vol: 0.34, pan: 0.25, reverb: 0.6 },
    harp: { inst: 'pluck', vol: 0.4, pan: -0.3, reverb: 0.5 },
    pad: { inst: 'pad', vol: 0.5, cutoff: 1000, reverb: 0.5 },
    bass: { inst: 'bass', vol: 0.4, reverb: 0.1 },
  },
  sections: {
    A: {
      bars: 8,
      parts: {
        flute: `e5h. b4q | c5h a4h | e5h. b5q | a5h. e5q | f5q. e5e d5h | g5q. e5e b4h | c5q. e5e a5h | g#5h. e5q`,
        bell: `a4e e5e b5e c6e b5e e5e c5e e5e | f4e c5e e5e a5e e5e c5e a4e c5e |
               a4e e5e b5e c6e b5e e5e c5e e5e | f4e c5e e5e b5e a5e e5e c5e e5e |
               d4e a4e e5e f5e e5e a4e f4e a4e | e4e b4e d5e g5e d5e b4e g4e b4e |
               f4e c5e e5e a5e e5e c5e a4e c5e | e4e b4e e5e g#5e e5e b4e g#4e b4e`,
        pad: `a3+c4+e4w | a3+c4+e4w | a3+b3+e4w | a3+b3+e4w | a3+d4+f4w | g3+b3+d4w | a3+c4+e4w | g#3+b3+e4w`,
        bass: `a2w | f2w | a2w | f2w | d2w | e2w | f2w | e2w`,
      },
    },
    B: {
      bars: 8,
      parts: {
        flute: `a5q. g5e e5h | d5q. e5e g5h | b5q. a5e g5h | e5h. c5q | a5q. g5e e5q c6q | b5h. d6q | c6h eb6q c6q | b5w`,
        harp: `f3e c4e e4e a4e e4e c4e a3e c4e | g3e d4e g4e b4e g4e d4e b3e d4e |
               e3e b3e d4e g4e d4e b3e g3e b3e | a3e e4e a4e c5e a4e e4e c4e e4e |
               f3e c4e e4e a4e e4e c4e a3e c4e | g3e d4e g4e b4e g4e d4e b3e d4e |
               ab3e eb4e g4e c5e g4e eb4e c4e eb4e | e3e b3e e4e g#4e e4e b3e g#3e b3e`,
        bell: `-q c6q -h | -q b5q -h | -q d6q -h | -q e6q -h | -q c6q -h | -q d6q -h | -q eb6q -q g6q | -q g#6q -h`,
        pad: `a3+c4+e4w | g3+b3+d4w | g3+b3+d4w | a3+c4+e4w | a3+c4+e4w | g3+b3+d4w | ab3+c4+eb4w | g#3+b3+e4w`,
        bass: `f2w | g2w | e2w | a2w | f2w | g2w | ab2w | e2w`,
      },
    },
  },
  form: ['A', 'B'],
};
