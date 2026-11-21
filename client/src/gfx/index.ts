/**
 * Prozedurales Pixel-Art-Modul von Eternal Mana. Keine Phaser-Abhängigkeit – nur DOM-Canvas.
 * Öffentliche API: buildGfx(), paintGround(), iconUrl(), portraitUrl()  (siehe spec.ts → GfxApi).
 */
import { buildChars, buildCharSheet } from './chars';
import { buildMobs } from './mobs';
import { buildBosses } from './bosses';
import { buildObjects } from './objects/index';
import { buildFx } from './fx';
import { buildOverlays } from './fx2';
import { buildLiquids, paintGround as paintGroundImpl } from './tiles/index';
import { iconUrl as iconUrlImpl } from './icons';
import { CHAR_FRAME_H, CHAR_FRAME_W } from './spec';
import type { ElementKey, GfxApi, GfxBundle, PaintableMap, Sheet } from './spec';

let bundle: GfxBundle | null = null;

/** Erzeugt alle Sheets (einmalig; wiederholte Aufrufe liefern dasselbe Bundle). */
export function buildGfx(): GfxBundle {
  if (bundle) return bundle;
  const { mobs, mobMeta } = buildMobs();
  const { bosses, bossMeta } = buildBosses();
  bundle = { chars: buildChars(), mobs, mobMeta, bosses, bossMeta, obj: buildObjects(), fx: buildFx(), liquids: buildLiquids(), overlays: buildOverlays() };
  return bundle;
}

export function paintGround(ctx: CanvasRenderingContext2D, map: PaintableMap, tx0: number, ty0: number, tx1: number, ty1: number): void {
  paintGroundImpl(ctx, map, tx0, ty0, tx1, ty1);
}

export function iconUrl(key: string, element?: ElementKey): string {
  return iconUrlImpl(key, element);
}

const portraits = new Map<string, string>();
const loneSheets = new Map<string, Sheet>();
export function portraitUrl(key: string, scale = 2): string {
  const s = Math.max(1, Math.round(scale)), ck = `${key}|${s}`;
  let u = portraits.get(ck);
  if (u) return u;
  let sheet: Sheet | undefined = bundle?.chars[key] ?? loneSheets.get(key);
  if (!sheet) { try { sheet = buildCharSheet(key); loneSheets.set(key, sheet); } catch { sheet = undefined; } }
  const cv = document.createElement('canvas');
  cv.width = CHAR_FRAME_W * s; cv.height = CHAR_FRAME_H * s;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  if (sheet) { const f = sheet.frames['0']; ctx.drawImage(sheet.canvas, f.x, f.y, f.w, f.h, 0, 0, cv.width, cv.height); }
  u = cv.toDataURL('image/png');
  portraits.set(ck, u);
  return u;
}

const api: GfxApi = { buildGfx, paintGround, iconUrl, portraitUrl };
export default api;
