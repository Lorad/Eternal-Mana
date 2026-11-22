/** Schattenreich – gemeinsame Rampen und Maler: Nachtstein, kaltes Kantenlicht, dunkle Kontur. */
import { Px } from '../draw';
import { Frames, INK, P, Ramp, WHITE, anim, inkOutline, mix, one } from './kit';
import { partIn } from './fr_kit';

/** Nachtstein (6): fast schwarz → fahles Blauviolett (auch für prism() im Glasmodus) */
export const NIGHT: Ramp = [mix(P.shadow[0], P.blue[0], 0.3), mix(P.shadow[1], P.blue[0], 0.5), mix(P.shadow[3], P.blue[1], 0.35), mix(P.shadow[4], P.steel[1], 0.45), mix(P.violet[3], P.steel[2], 0.55), mix(P.violet[4], P.ice[2], 0.5)];
/** dieselbe Rampe mit 5 Stufen für slab()/stoneFill() */
export const NIGHT5: Ramp = [NIGHT[0], NIGHT[1], NIGHT[2], NIGHT[3], NIGHT[4]];
/** Schattenholz (5) */
export const SBARK: Ramp = [P.shadow[0], mix(P.shadow[1], P.blue[0], 0.3), mix(P.shadow[2], P.violet[1], 0.45), mix(P.shadow[3], P.violet[2], 0.4), mix(P.shadow[4], P.violet[3], 0.45)];
/** fremdes Fleisch (5) */
export const FLESH: Ramp = [P.shadow[1], P.violet[1], mix(P.violet[2], P.pink[1], 0.4), mix(P.violet[3], P.pink[2], 0.3), P.violet[4]];
/** kaltes Weißlicht (5) */
export const COLD: Ramp = [P.steel[2], P.ice[2], P.ice[3], P.ice[4], WHITE];
export const SOUT = mix(P.shadow[0], INK, 0.5);

export function sOutline(p: Px): Px { return inkOutline(p, 0.62, 0.8, SOUT); }
/** Kaltes Kantenlicht von oben links auf alle deckenden Pixel an einer freien Ober-/Linkskante. */
export function rim(p: Px, c: number = P.ice[2], t = 0.42): void {
  const { w, h } = p, src = p.d.slice();
  const op = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < w && y < h && src[y * w + x] >>> 24 >= 200;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!op(x, y)) continue;
    const up = !op(x, y - 1), lf = !op(x - 1, y);
    if (!up && !lf) continue;
    p.d[y * w + x] = (0xff000000 | (mix(src[y * w + x], c, up && lf ? Math.min(1, t * 1.4) : up ? t : t * 0.6) & 0xffffff)) >>> 0;
  }
}
export function sOne(out: Frames, name: string, w: number, h: number, fn: (p: Px) => void, outline = true, rimT = 0.42): void {
  one(out, name, w, h, (p) => { fn(p); if (outline) { if (rimT) rim(p, P.ice[2], rimT); sOutline(p); } }, false);
}
export function sAnim(out: Frames, name: string, n: number, w: number, h: number, fn: (p: Px, f: number) => void, outline = true, rimT = 0.42): void {
  anim(out, name, n, w, h, (p, f) => { fn(p, f); if (outline) { if (rimT) rim(p, P.ice[2], rimT); sOutline(p); } }, false);
}
/** Überlagertes Einzelteil mit Kantenlicht und Kontur nur innerhalb des Sprites. */
export function overS(p: Px, fn: (l: Px) => void, rimT = 0.42): Px { return partIn(p, (l) => { fn(l); if (rimT) rim(l, P.ice[2], rimT); }, sOutline); }
