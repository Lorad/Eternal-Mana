import Phaser from 'phaser';
import type { GfxBundle, Sheet } from '../gfx/spec';

function addSheet(scene: Phaser.Scene, key: string, sheet: Sheet) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.addCanvas(key, sheet.canvas)!;
  for (const name in sheet.frames) { const f = sheet.frames[name]; tex.add(name, 0, f.x, f.y, f.w, f.h); }
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
    if (!scene.textures.exists(key)) scene.textures.addCanvas(key, c);
  });
}
