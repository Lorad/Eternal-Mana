/** Frostgebirge – gemeinsame Rampen und Maler: Schnee, Eis, kühle Kontur. */
import { Px } from '../draw';
import { Frames, INK, P, Ramp, anim, inkOutline, mix, one, rnd2, vnoise } from './kit';

const W = P.wood, ST = P.steel;
/** Schnee (5): blauer Schatten → reines Weiß */
export const SNOW: Ramp = [mix(P.snow[0], P.ice[0], 0.3), P.snow[1], P.snow[2], P.snow[3], P.snow[4]];
/** Eis (6) für prism(): tiefes Blau → Weiß */
export const ICE: Ramp = [mix(P.ice[0], P.blue[1], 0.35), P.ice[0], P.ice[1], P.ice[2], P.ice[3], P.ice[4]];
/** dunkles Tannengrün (7) */
export const FIR: Ramp = [mix(P.forest[0], INK, 0.35), P.forest[0], mix(P.forest[0], P.forest[1], 0.6), P.forest[1], mix(P.forest[1], P.forest[2], 0.55), P.forest[2], mix(P.forest[2], P.forest[3], 0.6)];
/** frostiges, graues Holz (5) und warmes Blockhausholz (5) */
export const FWOOD: Ramp = [mix(W[0], P.shadow[1], 0.3), mix(W[1], ST[0], 0.3), mix(W[2], P.stone[1], 0.25), mix(W[3], P.stone[2], 0.25), mix(W[4], P.stone[3], 0.3)];
export const LOG: Ramp = [mix(W[0], P.shadow[1], 0.25), W[1], mix(W[2], P.red[1], 0.12), mix(W[3], P.tan[2], 0.3), mix(W[4], P.tan[3], 0.4)];
/** kalter Fels (5) */
export const FROCK: Ramp = [mix(P.stone[0], P.blue[0], 0.4), mix(P.stone[1], ST[1], 0.5), mix(P.stone[2], ST[2], 0.5), mix(P.stone[3], ST[3], 0.45), mix(P.stone[4], P.ice[3], 0.4)];
export const FOUT = mix(P.ice[0], INK, 0.62);

/** Kontur mit kühlem Blaustich (Schnee bekommt so einen weichen, blaugrauen Rand statt eines schwarzen). */
export function fOutline(p: Px, soft = false): Px { return soft ? inkOutline(p, 0.3, 0.46, FOUT) : inkOutline(p, 0.56, 0.74, FOUT); }
export function fOne(out: Frames, name: string, w: number, h: number, fn: (p: Px) => void, outline = true): void {
  one(out, name, w, h, (p) => { fn(p); if (outline) fOutline(p); }, false);
}
export function fAnim(out: Frames, name: string, n: number, w: number, h: number, fn: (p: Px, f: number) => void, outline = true): void {
  anim(out, name, n, w, h, (p, f) => { fn(p, f); if (outline) fOutline(p); }, false);
}

/** Schneehaufen: Halbellipse mit flacher Standlinie by (exklusiv); bucklige Kontur, Licht oben links, blauer Schatten unten rechts. */
export function mound(p: Px, cx: number, by: number, rx: number, ry: number, seed = 1): void {
  for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const u = (x + 0.5 - cx) / rx; if (Math.abs(u) >= 1) continue;
    const hgt = Math.sqrt(1 - u * u) * ry * (0.8 + vnoise(x * 0.35, seed * 1.7, seed) * 0.4), top = Math.round(by - hgt);
    for (let y = top; y < by; y++) {
      const v = (by - y) / Math.max(1, by - top), lit = -u * 0.6 + v * 0.9;
      let t = y === top ? (u > 0.5 ? 3 : 4) : lit > 0.8 ? 4 : lit > 0.05 ? 3 : lit > -0.36 ? 2 : 1;
      if (y === by - 1 && t > 1 && u > -0.4) t--;
      if (rnd2(x, y, seed + 3) > 0.96 && t < 4) t++;
      p.set(x, y, SNOW[t]);
    }
  }
}

export interface CapOpts { seed?: number; /** Schnee ragt so viele px über die Kante hinaus */ raise?: number; /** auch tiefer liegende Oberkanten (Äste) */ all?: boolean; x0?: number; x1?: number; y0?: number; y1?: number }
/**
 * Schneeauflage auf allen Oberkanten deckender Pixel: Dicke th (Zahl oder Funktion; ≤ 0 = kein Schnee),
 * oben weiß, innen hell, Unterkante bläulich; nach rechts abfallende Stellen liegen im Schatten.
 */
export function snowCap(p: Px, th: number | ((x: number, y: number) => number), o: CapOpts = {}): void {
  const { w, h } = p, src = p.d.slice(), seed = o.seed ?? 1, raise = o.raise ?? 0;
  const op = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < w && y < h && src[y * w + x] >>> 24 >= 200;
  for (let x = o.x0 ?? 0; x <= (o.x1 ?? w - 1); x++) {
    let first = true;
    for (let y = o.y0 ?? 0; y <= (o.y1 ?? h - 1); y++) {
      if (!op(x, y) || op(x, y - 1)) continue;
      if (!first && !o.all) break;
      first = false;
      let d = typeof th === 'number' ? th : th(x, y);
      if (d <= 0) continue;
      d = Math.max(1, Math.round(d + (vnoise(x * 0.45, y * 0.2, seed) - 0.5) * Math.min(2, d)));
      const fallR = !op(x + 1, y) && !op(x + 1, y + 1), n = d + raise;
      for (let k = 0; k < n; k++) {
        const Y = y - raise + k;
        if (Y > y && !op(x, Y)) break;
        let t = k === 0 ? 4 : k === n - 1 && n >= 3 ? 2 : 3;
        if (fallR) t--;
        p.set(x, Y, SNOW[t]);
      }
    }
  }
}
/** Eiszapfen, die an der Linie y(x) hängen (deterministisch verteilt). */
export function icicles(p: Px, x0: number, x1: number, y: number | ((x: number) => number), seed = 1, maxLen = 6, gap = 3): void {
  for (let x = x0; x <= x1; x += 1 + Math.floor(rnd2(x, 7, seed) * gap)) {
    const y0 = typeof y === 'number' ? y : y(x), r = rnd2(x, 8, seed), len = 2 + Math.floor(r * r * maxLen);
    for (let k = 0; k < len; k++) p.set(x, y0 + k, k === 0 ? ICE[5] : k < len - 1 ? ICE[4] : ICE[3]);
    if (len >= 5) for (let k = 0; k < len >> 1; k++) p.set(x + 1, y0 + k, ICE[3]);
  }
}
/** Wie part(): eigene Ebene mit Kontur – die Kontur bleibt aber nur dort stehen, wo sie über dem Sprite liegt (keine Doppelkontur außen). */
export function partIn(p: Px, fn: (l: Px) => void, ol: (l: Px) => Px = fOutline): Px {
  const l = new Px(p.w, p.h);
  fn(l);
  const raw = l.d.slice();
  ol(l);
  for (let i = 0; i < l.d.length; i++) if (!(raw[i] >>> 24) && p.d[i] >>> 24 < 200) l.d[i] = 0;
  return p.draw(l);
}
