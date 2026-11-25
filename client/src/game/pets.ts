/**
 * Begleiter (0.7): läuft seinem Besitzer nach. Der Server schickt nur, WELCHER Begleiter mitläuft (Spieler-Info bzw.
 * eigener Charakter) – wo er gerade ist, rechnet jeder Client selbst aus der Position des Besitzers. Im Snapshot kostet
 * ein Begleiter deshalb nichts, und er kämpft nicht, blockiert nichts und wird von nichts getroffen.
 *
 * Grafik: Objekt-Atlas `pet_<id>_0..5` (20×20) – 0–1 Ruhe, 2–5 Laufen, Blick nach rechts (links = gespiegelt),
 * Standpunkt unten Mitte.
 */
import Phaser from 'phaser';

/** Begleiter, die schweben: kein Schritt, sondern ein leichtes Auf und Ab */
const FLY = new Set(['wisp', 'schneeeule', 'quelldrachling']);
const LIGHT: Record<string, number> = { wisp: 0x9fe8ff, glutfuchs: 0xffa060, quelldrachling: 0x70ffe0 };

export class PetView {
  sprite: Phaser.GameObjects.Image; blob: Phaser.GameObjects.Image;
  x = 0; y = 0; private placed = false; private left = false; private movingUntil = 0; private phase = 0;
  constructor(scene: Phaser.Scene, public id: string) {
    this.blob = scene.add.image(0, 0, 'fx', 'shadow').setDepth(4).setAlpha(0.3).setScale(0.55);
    this.sprite = scene.add.image(0, 0, 'obj', `pet_${id}_0`).setOrigin(0.5, 1);
  }
  static exists(scene: Phaser.Scene, id: string): boolean { return scene.textures.get('obj').has(`pet_${id}_0`); }
  /** Farbe und Standort seines Lichts (nur leuchtende Begleiter) */
  get light(): number | undefined { return LIGHT[this.id]; }
  /** `ox`,`oy`,`facing`: Besitzer. Der Begleiter hält sich schräg hinter ihm und holt auf, wenn er zurückfällt. */
  update(ox: number, oy: number, facing: number, dt: number, now: number, visible: boolean) {
    const tx = ox - Math.cos(facing) * 15 - Math.sin(facing) * 7, ty = oy - Math.sin(facing) * 11 + 3;
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy);
    if (!this.placed || d > 180) { this.x = tx; this.y = ty; this.placed = true; }
    else if (d > 5) {
      const step = Math.min(d, Math.min(150, 28 + d * 3.2) * dt);
      this.x += (dx / d) * step; this.y += (dy / d) * step;
      if (Math.abs(dx) > 1.5) this.left = dx < 0;
      this.movingUntil = now + 140;
      // 0.8: Schrittfolge hängt an der zurückgelegten Strecke (ein Bild je 7 px, höchstens 9 Bilder/s) – beim langsamen
      // Aufschließen zappeln die Beine nicht mehr schneller, als der Begleiter vorankommt.
      this.phase += Math.min(step / 7, dt * 9);
    }
    const fly = FLY.has(this.id), moving = now < this.movingUntil;
    const frame = moving ? 2 + (Math.floor(this.phase) & 3) : Math.floor(now / 460) % 2;
    const px = Math.round(this.x), py = Math.round(this.y);
    this.sprite.setFrame(`pet_${this.id}_${frame}`).setFlipX(this.left).setPosition(px, py - (fly ? 7 + Math.round(Math.sin(now / 330) * 1.6) : 0)).setDepth(this.y).setVisible(visible);
    this.blob.setPosition(px, py - 1).setVisible(visible);
  }
  destroy() { this.sprite.destroy(); this.blob.destroy(); }
}
