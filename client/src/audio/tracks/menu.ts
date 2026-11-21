import type { TrackDef } from '../sequencer';

/**
 * Titelthema „Eternal Mana“ – D-Dur, 72 bpm, 4/4. Form A (8 Takte) – B (8 Takte).
 * Das Kopfmotiv (a–d–fis · e–d | e — cis) kehrt im Finalkampf in d-Moll wieder.
 *   A:  D | A/C# | Bm | G | D/F# | G | Em7 | Asus4–A
 *   B:  Bm | F#m | G | D/F# | Em | G | Asus4 | A
 */
export const menu: TrackDef = {
  title: 'Eternal Mana',
  key: 'D-Dur',
  bpm: 72,
  gain: 0.52,
  channels: {
    flute: { inst: 'flute', vol: 0.9, reverb: 0.4 },
    harp: { inst: 'pluck', vol: 0.55, pan: -0.25, reverb: 0.3 },
    pad: { inst: 'pad', vol: 0.55, cutoff: 1100, reverb: 0.35 },
    bass: { inst: 'bass', vol: 0.5 },
    bell: { inst: 'bell', vol: 0.3, pan: 0.3, reverb: 0.6 },
  },
  sections: {
    A: {
      bars: 8,
      parts: {
        flute: `a4e d5e f#5q. e5e d5q | e5h. c#5q | b4e d5e f#5q. e5e d5q | b4h g4q a4q |
                a4e d5e a5q. g5e f#5q | g5q. f#5e e5q d5q | e5q. g5e f#5q e5q | d5h c#5h`,
        harp: `d3e a3e d4e f#4e a4e f#4e d4e a3e | c#3e a3e c#4e e4e a4e e4e c#4e a3e |
               b2e f#3e b3e d4e f#4e d4e b3e f#3e | g2e d3e g3e b3e d4e b3e g3e d3e |
               f#2e d3e f#3e a3e d4e a3e f#3e d3e | g2e d3e g3e b3e d4e b3e g3e d3e |
               e2e b2e e3e g3e d4e g3e e3e b2e | a2e e3e a3e d4e e4e d4e c#4e a3e`,
        pad: `d4+f#4+a4w | c#4+e4+a4w | b3+d4+f#4w | b3+d4+g4w |
              d4+f#4+a4w | d4+g4+b4w | d4+e4+g4w | d4+e4+a4h c#4+e4+a4h`,
        bass: `d3h. a2q | c#3w | b2w | g2w | f#2w | g2w | e2w | a2w`,
      },
    },
    B: {
      bars: 8,
      parts: {
        flute: `f#5q. d5e b4q d5q | c#5h. a4q | b4q. d5e g5q f#5q | f#5q e5q d5h |
                e5q. g5e b5q a5q | g5q. a5e b5h | a5h d5q e5q | e5h. -q`,
        harp: `b2e f#3e b3e d4e f#4e d4e b3e f#3e | f#2e c#3e f#3e a3e c#4e a3e f#3e c#3e |
               g2e d3e g3e b3e d4e b3e g3e d3e | f#2e d3e f#3e a3e d4e a3e f#3e d3e |
               e2e b2e e3e g3e b3e g3e e3e b2e | g2e d3e g3e b3e d4e b3e g3e d3e |
               a2e e3e a3e d4e e4e d4e a3e e3e | a2e e3e a3e c#4e e4e c#4e a3e e3e`,
        pad: `b3+d4+f#4w | a3+c#4+f#4w | b3+d4+g4w | a3+d4+f#4w |
              b3+e4+g4w | b3+d4+g4w | a3+d4+e4w | a3+c#4+e4w`,
        bass: `b2w | f#2w | g2w | f#2w | e2w | g2w | a2w | a2h. a2q`,
        bell: `-h f#6q -q | -w | -h d6q -q | -w | -h b6q -q | -h. d6q | -w | -h c#6q e6q`,
      },
    },
  },
  form: ['A', 'B'],
};
