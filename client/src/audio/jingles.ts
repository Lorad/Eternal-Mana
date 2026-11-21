/** Kurze Jingles (einmalig abgespielt, Musik wird währenddessen abgesenkt). */
import type { TrackDef } from './sequencer';
import type { JingleId } from './spec';

export const JINGLE_DEFS: Record<JingleId, TrackDef> = {
  // C-Dur-Fanfare: Aufstieg, IV–V, Schlussakkord (≈ 4 s)
  victory: {
    title: 'Sieg',
    key: 'C-Dur',
    bpm: 184,
    gain: 0.85,
    loop: false,
    channels: {
      lead: { inst: 'lead', vol: 0.7, cutoff: 3600, reverb: 0.3 },
      strings: { inst: 'strings', vol: 0.6, cutoff: 2200, reverb: 0.3 },
      bass: { inst: 'bass', vol: 0.55 },
      bell: { inst: 'bell', vol: 0.3, reverb: 0.5 },
    },
    drumVol: 0.5,
    sections: {
      A: {
        bars: 3,
        parts: {
          lead: `c5e e5e g5e c6e e6q d6e c6e | a5e c6e f6q g5e b5e d6q | c6w`,
          strings: `e4+g4+c5w | f4+a4+c5h g4+b4+d5h | e4+g4+c5+e5w`,
          bass: `c3h. c3q | f2h g2h | c3w`,
          bell: `-w | -w | c6e e6e g6e c7he`,
        },
        drums: { timp: 'x............... ........x...x.xx X...............', snare: '................ ............x.xx ................' },
      },
    },
    form: ['A'],
  },
  // d-Moll-Abstieg mit Trugschluss-Farbe (≈ 4 s)
  defeat: {
    title: 'Niederlage',
    key: 'd-Moll',
    bpm: 120,
    gain: 0.7,
    loop: false,
    channels: {
      flute: { inst: 'flute', vol: 0.8, reverb: 0.5 },
      pad: { inst: 'pad', vol: 0.6, cutoff: 900, reverb: 0.4 },
      bass: { inst: 'bass', vol: 0.5 },
    },
    drumVol: 0.4,
    sections: {
      A: {
        bars: 2,
        parts: {
          flute: `a4q. g4e f4q e4q | d4w`,
          pad: `d3+f3+a3h bb2+d3+g3q a2+c#3+e3q | a2+d3+f3w`,
          bass: `d2h g2q a2q | d2w`,
        },
        drums: { timp: 'x............... x...............' },
      },
    },
    form: ['A'],
  },
  // lydischer Glockenlauf nach oben (≈ 2,5 s)
  discovery: {
    title: 'Entdeckung',
    key: 'C-lydisch',
    bpm: 120,
    loop: false,
    channels: {
      bell: { inst: 'bell', vol: 0.5, reverb: 0.6 },
      harp: { inst: 'pluck', vol: 0.5, pan: -0.2, reverb: 0.4 },
      pad: { inst: 'pad', vol: 0.5, cutoff: 1400, reverb: 0.4 },
    },
    sections: {
      A: {
        bars: 1,
        parts: {
          bell: `c5s e5s g5s b5s d6s f#6s a6e b6h`,
          harp: `c3e g3e d4e f#4e b4h`,
          pad: `c4+e4+g4+b4w`,
        },
      },
    },
    form: ['A'],
  },
};
