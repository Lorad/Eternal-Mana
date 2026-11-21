import type { Px } from './draw';

/** Effekte v2 (Kampf, Umgebung, Wetter). Liefert benannte Frames für den fx-Atlas. */
export function fx2Items(): Array<[string, Px]> { return []; }

/** Große, nahtlos kachelbare Overlay-Texturen (Nebel, Wolkenschatten, Blätterschatten). */
export function buildOverlays(): Record<string, HTMLCanvasElement> { return {}; }
