/**
 * 2D-Lichtsystem: Eine Lichtkarte in Weltauflösung wird mit der Umgebungsfarbe gefüllt, farbige Lichtquellen
 * werden additiv hineingezeichnet, und die Karte wird multiplizierend über die Szene gelegt.
 * Ergebnis: farbige Dunkelheit (Nacht, Höhlen), warme Fackelkreise, kaltes Kristallleuchten – alles im Pixelraster.
 */
import Phaser from 'phaser';
import { settings } from '../state/settings';

export interface LightSrc { x: number; y: number; r: number; color: number; i: number; flicker?: number }

export class Lighting {
  private rt?: Phaser.GameObjects.RenderTexture;
  private stamp: Phaser.GameObjects.Image;
  constructor(private scene: Phaser.Scene) {
    this.stamp = scene.make.image({ key: 'fx', frame: 'glow', add: false }).setBlendMode(Phaser.BlendModes.ADD);
  }
  reset() { this.rt?.destroy(); this.rt = undefined; }

  update(view: Phaser.Geom.Rectangle, ambient: number, lights: LightSrc[], now: number) {
    const r = (ambient >> 16) & 255, g = (ambient >> 8) & 255, b = ambient & 255;
    if (r >= 250 && g >= 250 && b >= 250) { this.rt?.setVisible(false); return; }
    const w = Math.ceil(view.width) + 4, h = Math.ceil(view.height) + 4;
    if (!this.rt || this.rt.width !== w || this.rt.height !== h) {
      this.rt?.destroy();
      this.rt = this.scene.add.renderTexture(0, 0, w, h).setOrigin(0).setDepth(9000).setBlendMode(Phaser.BlendModes.MULTIPLY);
    }
    const rt = this.rt;
    const ox = Math.floor(view.x) - 2, oy = Math.floor(view.y) - 2;
    rt.setVisible(true).setPosition(ox, oy);
    rt.fill(ambient, 1);
    rt.beginDraw();
    const calm = settings.reduceFlash ? 0.35 : 1;
    for (let k = 0; k < lights.length; k++) {
      const l = lights[k];
      if (l.x < view.x - l.r || l.x > view.right + l.r || l.y < view.y - l.r || l.y > view.bottom + l.r) continue;
      // Flackern: Die Phase hängt am Ort des Lichts (nicht an seiner Stelle in der Liste) – so springt nichts, wenn Lichter ins
      // Bild kommen oder es verlassen. Mit „Blitze reduzieren“ flackert es nur noch schwach.
      const ph = l.x * 0.37 + l.y * 0.23, fl = l.flicker ? l.flicker * calm : 0;
      const f = fl ? 1 + Math.sin(now / 83 + ph * 2.4) * fl + Math.sin(now / 37 + ph) * fl * 0.5 : 1;
      this.stamp.setScale((l.r * f) / 64).setTint(l.color).setAlpha(Math.min(1, l.i));
      rt.batchDraw(this.stamp, l.x - ox, l.y - oy);
    }
    rt.endDraw();
  }
}

const lerpC = (a: number, b: number, t: number) => {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255, br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
};
export const mulC = (a: number, b: number) =>
  (Math.round((((a >> 16) & 255) * ((b >> 16) & 255)) / 255) << 16) | (Math.round((((a >> 8) & 255) * ((b >> 8) & 255)) / 255) << 8) | Math.round(((a & 255) * (b & 255)) / 255);
export { lerpC };

/** Himmelslicht im Tagesverlauf: [Tageszeit 0..1, Farbe] */
const SKY: [number, number][] = [
  [0, 0x4a5a9c], [0.2, 0x4c5ca0], [0.255, 0xc88a8c], [0.3, 0xffe9d6], [0.36, 0xffffff],
  [0.66, 0xffffff], [0.72, 0xffd9a8], [0.775, 0xf08a6a], [0.83, 0x5a5a9c], [0.9, 0x4a5a9c], [1, 0x4a5a9c],
];
export function skyColor(tod: number): number {
  for (let i = 0; i + 1 < SKY.length; i++) if (tod <= SKY[i + 1][0]) return lerpC(SKY[i][1], SKY[i + 1][1], (tod - SKY[i][0]) / (SKY[i + 1][0] - SKY[i][0]));
  return SKY[0][1];
}
/** 0 = Nacht, 1 = voller Tag */
export function daylight(tod: number): number {
  if (tod < 0.22 || tod > 0.84) return 0;
  if (tod < 0.34) return (tod - 0.22) / 0.12;
  if (tod > 0.7) return (0.84 - tod) / 0.14;
  return 1;
}
