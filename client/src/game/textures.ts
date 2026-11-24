import Phaser from 'phaser';
import { lazyCharKeys, loadCharSheet } from '../gfx/runtime';
import type { GfxBundle, Sheet } from '../gfx/spec';

function addTo(tm: Phaser.Textures.TextureManager, key: string, sheet: Sheet) {
  if (tm.exists(key)) tm.remove(key);
  const tex = tm.addCanvas(key, sheet.canvas)!;
  for (const name in sheet.frames) { const f = sheet.frames[name]; tex.add(name, 0, f.x, f.y, f.w, f.h); }
}
function addSheet(scene: Phaser.Scene, key: string, sheet: Sheet) { addTo(scene.textures, key, sheet); }

/**
 * Gewand (0.7): Die Sheets der Garderobe (`char_<klasse>_<variante>`) werden nicht beim Start geladen, sondern erst,
 * wenn jemand sie trägt oder im Kleiderschrank ansieht. Rückgabe: true = Textur ist da. Sonst wird sie – wenn es das
 * Sheet gibt – nachgeladen und registriert; `onReady` meldet das (bei unbekanntem Schlüssel oder Ladefehler nie).
 * Bis dahin gilt der Rückfall aus `outfitSheet` (shared/src/data/looks.ts).
 */
export function ensureCharTexture(tm: Phaser.Textures.TextureManager, key: string, onReady?: () => void): boolean {
  if (tm.exists(key)) return true;
  if (!lazyCharKeys().includes(key)) return false;
  void loadCharSheet(key).then(sheet => {
    if (!sheet) return;
    if (!tm.exists(key)) addTo(tm, key, sheet);
    onReady?.();
  });
  return false;
}

/** Registriert alle prozedural erzeugten Sheets als Phaser-Texturen. */
export function registerTextures(scene: Phaser.Scene, g: GfxBundle) {
  for (const k in g.chars) addSheet(scene, k, g.chars[k]);
  for (const k in g.mobs) addSheet(scene, k, g.mobs[k]);
  for (const k in g.bosses) addSheet(scene, k, g.bosses[k]);
  addSheet(scene, 'obj', g.obj);
  addSheet(scene, 'fx', g.fx);
  for (const biome in g.liquids) g.liquids[biome as keyof typeof g.liquids].forEach((c, i) => {
    const key = `liq_${biome}_${i}`;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, c);
  });
  for (const k in g.overlays ?? {}) { if (scene.textures.exists('ov_' + k)) scene.textures.remove('ov_' + k); scene.textures.addCanvas('ov_' + k, g.overlays[k]); }
}
