/** Notennamen ↔ Frequenzen. Schreibweise: c4, f#3, bb5 (a4 = 440 Hz). */
const SEMI: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const NAMES = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];

export function noteToMidi(n: string): number {
  const m = /^([a-g])([#b]?)(\d)$/.exec(n);
  if (!m) throw new Error(`bad note "${n}"`);
  return 12 * (Number(m[3]) + 1) + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

export function midiToFreq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export function hz(n: string): number {
  return midiToFreq(noteToMidi(n));
}

/** Transponiert alle Noten eines Pattern-Strings um `semis` Halbtöne (z. B. 12 = Oktave höher). */
export function transpose(pattern: string, semis: number): string {
  return pattern.replace(/([a-g][#b]?\d)/g, (n) => {
    const m = noteToMidi(n) + semis;
    return NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
  });
}
