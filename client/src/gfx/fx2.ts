/**
 * Effekte v2 (Kampf, Magie, Umgebung, Wetter): handgesetzte Pixel-Animationen, Frame für Frame gezeichnet.
 * Aufbau: fx2/kit.ts (Werkzeuge), weapons.ts, projectiles.ts, explosions.ts, magic.ts, ground.ts, particles.ts,
 * markers.ts, overlays.ts. Gleichnamige v1-Frames aus fx.ts werden überschrieben.
 */
import type { Px } from './draw';
import type { Item } from './fx2/kit';
import { weaponItems } from './fx2/weapons';
import { projectileItems } from './fx2/projectiles';
import { explosionItems } from './fx2/explosions';
import { magicItems } from './fx2/magic';
import { groundItems } from './fx2/ground';
import { particleItems } from './fx2/particles';
import { markerItems } from './fx2/markers';
import { buildOverlaysImpl } from './fx2/overlays';

/** Animationen/Einzelbilder, die weiß→grau gezeichnet sind und von der Engine eingefärbt werden. */
export const FX2_TINTABLE: ReadonlySet<string> = new Set([
  'slash_sword', 'slash_heavy', 'slash_dagger', 'thrust', 'claw', 'bite', 'hit', 'hit_magic',
  'arrow_trail', 'bolt_arcane', 'lance',
  'rune_circle', 'rune_circle_big', 'tele_ring', 'cast', 'pillar', 'buff', 'shield', 'blink', 'spawn', 'death_poof',
  'dust', 'dust_run', 'dodge_trail', 'ripple', 'sparkle', 'footprint', 'crack', 'shockwave',
  'px', 'spark', 'star', 'smoke', 'mote', 'snowflake', 'raindrop', 'rain_splash', 'ash', 'drip', 'heat',
  'godray', 'glow', 'glow_small', 'target',
]);

let cache: Item[] | null = null;
/** Liefert benannte Frames für den fx-Atlas. */
export function fx2Items(): Array<[string, Px]> {
  if (cache) return cache;
  const out: Item[] = [];
  weaponItems(out);
  projectileItems(out);
  explosionItems(out);
  magicItems(out);
  groundItems(out);
  particleItems(out);
  markerItems(out);
  cache = out;
  return out;
}

export interface Fx2Entry { name: string; frames: number; w: number; h: number; tintable: boolean }
/** Katalog aller v2-Effekte (für Vorschau, Doku und Engine-Anbindung). frames = 1 ⇒ Einzelbild ohne Suffix. */
export function fx2Catalog(): Fx2Entry[] {
  const m = new Map<string, Fx2Entry>();
  for (const [n, p] of fx2Items()) {
    const mt = /^(.*)_(\d+)$/.exec(n), base = mt ? mt[1] : n;
    const e = m.get(base);
    if (e) e.frames++; else m.set(base, { name: base, frames: mt ? 1 : 0, w: p.w, h: p.h, tintable: FX2_TINTABLE.has(base) });
  }
  return [...m.values()];
}

/** Große, nahtlos kachelbare Overlay-Texturen (Nebel, Wolkenschatten, Blätterschatten). */
let ovCache: Record<string, HTMLCanvasElement> | null = null;
export function buildOverlays(): Record<string, HTMLCanvasElement> { return (ovCache ??= buildOverlaysImpl()); }
