/** Spielt die handanimierten Effekte aus dem fx-Atlas ab (Frames `<name>_0..n`). */
import Phaser from 'phaser';

export interface FxOpts {
  fps?: number; rot?: number; tint?: number; scale?: number; scaleY?: number; depth?: number; add?: boolean;
  flipX?: boolean; alpha?: number; originX?: number; originY?: number;
  /** Endlosschleife – Rückgabe-Handle per stop() beenden */
  loop?: boolean;
  /** folgt einer beweglichen Position */
  follow?: () => { x: number; y: number } | null;
  /** letzten Frame halten und in ms ausblenden */
  fade?: number;
  delay?: number;
}
interface Active { img: Phaser.GameObjects.Image; name: string; n: number; fps: number; t0: number; o: FxOpts; dead?: boolean }

export class Fx {
  private counts = new Map<string, number>();
  private active: Active[] = [];
  private tex: Phaser.Textures.Texture;
  constructor(private scene: Phaser.Scene, key = 'fx') {
    this.tex = scene.textures.get(key);
    for (const name of this.tex.getFrameNames()) {
      const m = /^(.*)_(\d+)$/.exec(name);
      if (m) this.counts.set(m[1], Math.max(this.counts.get(m[1]) ?? 0, +m[2] + 1));
    }
  }
  /** Anzahl Frames einer Animation (0 = unbekannt) */
  frames(name: string): number { return this.counts.get(name) ?? 0; }
  has(name: string): boolean { return this.counts.has(name) || this.tex.has(name); }
  /** Erster vorhandener Name aus einer Liste (für Rückfallebenen). */
  pick(...names: string[]): string | null { for (const n of names) if (this.has(n)) return n; return null; }

  play(name: string | null, x: number, y: number, o: FxOpts = {}, clock = 0): Active | null {
    if (!name) return null;
    const n = this.frames(name);
    const frame = n ? `${name}_0` : name;
    if (!this.tex.has(frame)) return null;
    // leuchtende (additive) Effekte liegen über der Lichtkarte, damit sie nachts und in Höhlen strahlen
    const img = this.scene.add.image(x, y, 'fx', frame).setDepth(o.depth ?? (o.add ? 9100 : y + 30)).setOrigin(o.originX ?? 0.5, o.originY ?? 0.5);
    if (o.rot) img.setRotation(o.rot);
    if (o.tint !== undefined) img.setTint(o.tint);
    if (o.scale) img.setScale(o.scale, o.scaleY ?? o.scale);
    if (o.add) img.setBlendMode(Phaser.BlendModes.ADD);
    if (o.flipX) img.setFlipX(true);
    if (o.alpha !== undefined) img.setAlpha(o.alpha);
    const a: Active = { img, name, n: Math.max(1, n), fps: o.fps ?? 18, t0: clock + (o.delay ?? 0), o };
    if (o.delay) img.setVisible(false);
    this.active.push(a);
    return a;
  }
  stop(a: Active | null | undefined) { if (a && !a.dead) { a.dead = true; a.img.destroy(); } }

  /** clock = Animationsuhr in ms (steht bei Treffer-Stopps kurz still) */
  update(clock: number) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const a = this.active[i];
      if (a.dead) { this.active.splice(i, 1); continue; }
      const t = clock - a.t0;
      if (t < 0) continue;
      if (!a.img.visible) a.img.setVisible(true);
      const idx = Math.floor((t * a.fps) / 1000);
      if (a.o.follow) { const p = a.o.follow(); if (!p) { a.dead = true; a.img.destroy(); this.active.splice(i, 1); continue; } a.img.setPosition(p.x, p.y); if (a.o.depth === undefined && !a.o.add) a.img.setDepth(p.y + 30); }
      if (a.o.loop) { if (a.n > 1) a.img.setFrame(`${a.name}_${idx % a.n}`); continue; }
      if (idx >= a.n) {
        if (a.o.fade) { const k = (t - (a.n * 1000) / a.fps) / a.o.fade; if (k < 1) { a.img.setAlpha((a.o.alpha ?? 1) * (1 - k)); continue; } }
        a.dead = true; a.img.destroy(); this.active.splice(i, 1);
        continue;
      }
      if (a.n > 1) a.img.setFrame(`${a.name}_${idx}`);
    }
  }
  clear() { for (const a of this.active) a.img.destroy(); this.active = []; }
}
export type FxHandle = ReturnType<Fx['play']>;
