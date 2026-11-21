/**
 * Laufzeit-Zugriff auf die Grafiken: lädt die von der Asset-Pipeline exportierten PNG-Sheets und Atlanten
 * (client/public/assets, siehe docs/ASSETS.md). Die Zeichenprogramme selbst werden nicht mit ausgeliefert –
 * einzige Ausnahme ist der Geländemaler, weil der Boden jeder Zone aus der Karte heraus gemalt wird.
 */
import type { BiomeId } from '../../../shared/src/maps/tiles';
import type { ElementKey, FrameRect, GfxBundle, Sheet } from './spec';
import { CHAR_FRAME_H, CHAR_FRAME_W } from './spec';
export { paintGround } from './tiles/index';

const BASE = import.meta.env.BASE_URL + 'assets/';
let bundle: GfxBundle | null = null;
let icons: Sheet | null = null;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Grafik konnte nicht geladen werden: ' + url));
    img.src = url;
  });
}
function toCanvas(img: CanvasImageSource, sx: number, sy: number, w: number, h: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, sx, sy, w, h, 0, 0, w, h);
  return cv;
}

/** Lädt alle Spielgrafiken. onProgress: 0..1 */
export async function loadGfx(onProgress: (p: number) => void = () => {}): Promise<GfxBundle> {
  if (bundle) return bundle;
  const res = await fetch(BASE + 'manifest.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Die Spielgrafiken fehlen (assets/manifest.json). Bitte „npm run assets“ und „npm run build“ ausführen.');
  const man = await res.json();
  const jobs: Promise<void>[] = [];
  let done = 0;
  const track = <T>(p: Promise<T>): Promise<T> => { jobs.push(p.then(() => { done++; onProgress(done / jobs.length); })); return p; };
  const chars: Record<string, Sheet> = {}, mobs: Record<string, Sheet> = {}, bosses: Record<string, Sheet> = {};
  for (const key in man.sheets) {
    const m = man.sheets[key];
    track(loadImage(BASE + m.file)).then(img => {
      const frames: Record<string, FrameRect> = {};
      for (let i = 0; i < m.cols * m.rows; i++) frames[String(i)] = { x: (i % m.cols) * m.fw, y: Math.floor(i / m.cols) * m.fh, w: m.fw, h: m.fh };
      const sheet = { canvas: toCanvas(img, 0, 0, img.width, img.height), frames };
      (key.startsWith('mob_') ? mobs : key.startsWith('boss_') ? bosses : chars)[key] = sheet;
    });
  }
  const atlas: Record<string, Sheet> = {};
  for (const name in man.atlases) {
    const m = man.atlases[name];
    track(Promise.all([loadImage(BASE + m.file), fetch(BASE + m.json).then(r => r.json())])).then(([img, json]) => {
      const frames: Record<string, FrameRect> = {};
      for (const n in json.frames) frames[n] = json.frames[n].frame;
      atlas[name] = { canvas: toCanvas(img, 0, 0, img.width, img.height), frames };
    });
  }
  const liquids = {} as Record<BiomeId, HTMLCanvasElement[]>;
  for (const b in man.liquids) {
    const m = man.liquids[b];
    track(loadImage(BASE + m.file)).then(img => { liquids[b as BiomeId] = Array.from({ length: m.frames }, (_, i) => toCanvas(img, i * m.fw, 0, m.fw, m.fh)); });
  }
  const overlays: Record<string, HTMLCanvasElement> = {};
  for (const n in man.overlays) track(loadImage(BASE + man.overlays[n].file)).then(img => { overlays[n] = toCanvas(img, 0, 0, img.width, img.height); });
  await Promise.all(jobs);
  // sichtbare Höhe jedes Gegners (Frame 0) messen – für Lebensbalken und Effekte über dem Kopf
  const measure = (sheets: Record<string, Sheet>, meta: Record<string, { w: number; h: number; top?: number }>, prefix: string, foot: number) => {
    for (const key in sheets) {
      const id = key.slice(prefix.length), m = meta[id];
      if (!m) continue;
      const data = sheets[key].canvas.getContext('2d')!.getImageData(0, 0, m.w, m.h).data;
      let first = m.h;
      outer: for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (data[(y * m.w + x) * 4 + 3] > 40) { first = y; break outer; }
      m.top = Math.max(8, m.h - foot - first);
    }
  };
  measure(mobs, man.mobMeta, 'mob_', 3);
  measure(bosses, man.bossMeta, 'boss_', 6);
  icons = atlas.icons ?? null;
  bundle = { chars, mobs, mobMeta: man.mobMeta, bosses, bossMeta: man.bossMeta, obj: atlas.obj, fx: atlas.fx, liquids, overlays };
  return bundle;
}

const EMPTY = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
const cache = new Map<string, string>();
function cut(sheet: Sheet, frame: string, scale: number): string | null {
  const f = sheet.frames[frame];
  if (!f) return null;
  const cv = document.createElement('canvas');
  cv.width = f.w * scale; cv.height = f.h * scale;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet.canvas, f.x, f.y, f.w, f.h, 0, 0, cv.width, cv.height);
  return cv.toDataURL('image/png');
}
/** Data-URL eines 24x24-Icons. key = `item_<name>` oder `skill_<glyph>`; element färbt Skill-Hintergründe. */
export function iconUrl(key: string, element: ElementKey = 'phys'): string {
  if (!icons) return EMPTY;
  const name = key.startsWith('skill_') ? `${key}_${element}` : key;
  let u = cache.get(name);
  if (!u) { u = cut(icons, name, 1) ?? cut(icons, 'item_gem', 1) ?? EMPTY; cache.set(name, u); }
  return u;
}
/** Data-URL eines Charakter-Porträts (Standbild, Blick nach unten), ganzzahlig vergrößert. */
export function portraitUrl(key: string, scale = 2): string {
  const sheet = bundle?.chars[key];
  if (!sheet) return EMPTY;
  const s = Math.max(1, Math.round(scale)), ck = `p|${key}|${s}`;
  let u = cache.get(ck);
  if (!u) { u = cut(sheet, '0', s) ?? EMPTY; cache.set(ck, u); }
  return u;
}
export const PORTRAIT_W = CHAR_FRAME_W, PORTRAIT_H = CHAR_FRAME_H;
