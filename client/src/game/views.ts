/** Darstellungsobjekte für Spieler, Gegner und Weltobjekte inkl. dynamischer Schlagschatten. */
import Phaser from 'phaser';
import { CHAR_FOOT_Y, CHAR_FRAME_H, type GfxBundle } from '../gfx/spec';
import { FLAG_DEAD, FLAG_ELITE, FLAG_INVULN, FLAG_ROLL, FLAG_SHIELD, STATUS_BIT } from '../../../shared/src/types';
import type { MobInfo, ObjInfo, PlayerInfo } from '../../../shared/src/types';
import { BOSS_ANIMS, CHAR_ANIMS, MOB_ANIMS, animDone, bossFrame, charFrame, dirOf, mobFrame, type BossAnim, type CharAnim, type MobAnim } from './anim';
import type { Fx, FxHandle } from './fxlib';

export interface Buf { t: number; x: number; y: number }
/** Schattenwurf: Drehung (rad), Längenfaktor, Deckkraft */
export interface ShadowCfg { rot: number; len: number; alpha: number }
export interface ViewCtx {
  scene: Phaser.Scene;
  gfx: GfxBundle;
  fx: Fx;
  text(x: number, y: number, s: string, color: string, size?: number): Phaser.GameObjects.Text;
  shadowAt(x: number, y: number): ShadowCfg;
  /** Animationsuhr (ms), steht bei Treffer-Stopps still */
  clock(): number;
}
const SHADOW_TINT = 0x0b1026;
const CHAR_ORIGIN_Y = CHAR_FOOT_Y / CHAR_FRAME_H;

/** Schlagschatten: dieselbe Silhouette, an der Standfläche gespiegelt, gestaucht und zur Lichtquelle weggedreht. */
export function makeShadow(scene: Phaser.Scene, key: string, frame: string, originY: number): Phaser.GameObjects.Image {
  return scene.add.image(0, 0, key, frame).setOrigin(0.5, originY).setTintFill(SHADOW_TINT).setDepth(4).setAlpha(0);
}
export function applyShadow(s: Phaser.GameObjects.Image, x: number, y: number, c: ShadowCfg, flipX = false, scale = 1) {
  if (c.alpha <= 0.01) { s.setVisible(false); return; }
  s.setVisible(true).setPosition(x, y).setScale(flipX ? -scale : scale, -c.len * scale).setRotation(c.rot).setAlpha(c.alpha);
}

const STATUS_FX: [number, string, number][] = [[STATUS_BIT.freeze, 'frost', -6], [STATUS_BIT.stun, 'stun', -30], [STATUS_BIT.burn, 'burn', -8], [STATUS_BIT.poison, 'poison', -8], [STATUS_BIT.slow, 'frost', -6], [STATUS_BIT.mark, 'mark', -34], [STATUS_BIT.weak, 'weak', -34]];
/** Zeigt den wichtigsten Zustand als animierten Effekt an der Figur. */
class StatusFx {
  private cur = ''; private h: FxHandle = null;
  update(ctx: ViewCtx, flags: number, pos: () => { x: number; y: number } | null, top: number) {
    let want = '', off = 0;
    for (const [bit, name, o] of STATUS_FX) if (flags & bit && ctx.fx.has(name)) { want = name; off = o < -20 ? -top - 4 : o; break; }
    if (want === this.cur) return;
    ctx.fx.stop(this.h); this.h = null; this.cur = want;
    if (want) this.h = ctx.fx.play(want, 0, 0, { loop: true, fps: 8, follow: () => { const p = pos(); return p ? { x: p.x, y: p.y + off } : null; } }, ctx.clock());
  }
  destroy(ctx: ViewCtx) { ctx.fx.stop(this.h); this.h = null; this.cur = ''; }
}

export class PlayerView {
  sprite: Phaser.GameObjects.Sprite; blob: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Image;
  label?: Phaser.GameObjects.Text; bar?: Phaser.GameObjects.Graphics;
  buf: Buf[] = []; x = 0; y = 0; facing = Math.PI / 2; hp = 1; maxHp = 1; flags = 0; flashUntil = 0;
  anim: CharAnim = 'idle'; animStart = 0; lockUntil = 0; alive = true;
  private status = new StatusFx(); private shield: FxHandle = null;
  constructor(private ctx: ViewCtx, public info: PlayerInfo, public self: boolean) {
    const sc = ctx.scene, key = 'char_' + info.cls;
    this.blob = sc.add.image(0, 0, 'fx', 'shadow').setDepth(4).setAlpha(0.45);
    this.shadow = makeShadow(sc, key, '0', CHAR_ORIGIN_Y);
    this.sprite = sc.add.sprite(0, 0, key, '0').setOrigin(0.5, CHAR_ORIGIN_Y);
    if (!self) { this.label = ctx.text(0, 0, info.name, '#e8f4ff').setOrigin(0.5, 1); this.bar = sc.add.graphics(); }
  }
  /** Setzt eine Animation; `lock` (ms) schützt sie vor Überschreiben durch Snapshot-Zustände. */
  play(a: CharAnim, lock = 0, restart = false) {
    const now = this.ctx.clock();
    if (now < this.lockUntil && !lock) return;
    if (a !== this.anim || restart) { this.anim = a; this.animStart = now; }
    if (lock) this.lockUntil = now + lock;
  }
  animOver(): boolean { return animDone(CHAR_ANIMS[this.anim], this.ctx.clock() - this.animStart); }
  draw(now: number) {
    const clock = this.ctx.clock();
    const [row, flip] = dirOf(this.facing);
    const frame = charFrame(this.anim, row, clock - this.animStart);
    const px = Math.round(this.x), py = Math.round(this.y + 2);
    this.sprite.setFrame(frame).setFlipX(flip).setPosition(px, py).setDepth(this.y);
    const dead = this.anim === 'death';
    this.blob.setPosition(px, py).setVisible(!dead);
    this.shadow.setFrame(frame);
    applyShadow(this.shadow, px, py, this.ctx.shadowAt(this.x, this.y), flip);
    const inv = (this.flags & FLAG_INVULN) && !(this.flags & FLAG_ROLL) && !dead;
    this.sprite.setAlpha(inv ? 0.6 + 0.3 * Math.sin(now / 60) : 1);
    if (now < this.flashUntil) this.sprite.setTintFill(0xffffff);
    else if (this.flags & STATUS_BIT.burn) this.sprite.setTint(0xffc0a0);
    else if (this.flags & STATUS_BIT.poison) this.sprite.setTint(0xc0ffa0);
    else if (this.flags & STATUS_BIT.slow) this.sprite.setTint(0xb0d0ff);
    else this.sprite.clearTint();
    this.status.update(this.ctx, dead ? 0 : this.flags, () => (this.alive ? { x: this.x, y: this.y } : null), 30);
    const sh = !!(this.flags & FLAG_SHIELD) && !dead;
    if (sh && !this.shield) this.shield = this.ctx.fx.play(this.ctx.fx.pick('shield'), 0, 0, { loop: true, fps: 8, tint: 0xfff0b0, alpha: 0.7, add: true, follow: () => (this.alive ? { x: this.x, y: this.y - 12 } : null) }, clock);
    else if (!sh && this.shield) { this.ctx.fx.stop(this.shield); this.shield = null; }
    if (this.label) {
      this.label.setPosition(px, Math.round(this.y - 32));
      this.bar!.clear();
      if (!(this.flags & FLAG_DEAD)) {
        this.bar!.fillStyle(0x10131c, 0.8).fillRect(px - 10, this.y - 32, 20, 3);
        this.bar!.fillStyle(0x58d058, 1).fillRect(px - 9, this.y - 31, 18 * Math.max(0, this.hp / this.maxHp), 1);
      }
    }
  }
  destroy() { this.alive = false; this.sprite.destroy(); this.blob.destroy(); this.shadow.destroy(); this.label?.destroy(); this.bar?.destroy(); this.status.destroy(this.ctx); this.ctx.fx.stop(this.shield); }
}

export class MobView {
  sprite: Phaser.GameObjects.Sprite; blob: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Image; bar: Phaser.GameObjects.Graphics; label?: Phaser.GameObjects.Text;
  buf: Buf[] = []; x: number; y: number; left = 0; hp: number; flags = 0; flashUntil = 0; seen = false; h: number; w: number; boss: boolean;
  anim = 'idle'; animStart = 0; alive = true; dying = false; scale = 1;
  private key: string; private originY: number; private foot: number; private status = new StatusFx();
  constructor(private ctx: ViewCtx, public info: MobInfo) {
    const sc = ctx.scene;
    this.boss = !!info.boss;
    this.key = (this.boss ? 'boss_' : 'mob_') + info.mob;
    const meta = (this.boss ? ctx.gfx.bossMeta : ctx.gfx.mobMeta)[info.mob] ?? { w: 32, h: 32 };
    this.w = meta.w; this.h = meta.h; this.visTop = meta.top ?? 0;
    this.foot = this.boss ? 6 : 3;
    this.originY = (meta.h - this.foot) / meta.h;
    this.x = info.x; this.y = info.y; this.hp = info.hp;
    this.scale = info.elite ? 1.2 : 1;
    this.blob = sc.add.image(0, 0, 'fx', meta.w > 40 ? 'shadow_l' : 'shadow').setDepth(4).setAlpha(0.45);
    if (this.boss) this.blob.setScale(meta.w / 56);
    this.shadow = makeShadow(sc, this.key, '0', this.originY);
    this.sprite = sc.add.sprite(info.x, info.y, this.key, '0').setOrigin(0.5, this.originY).setScale(this.scale);
    if (info.elite) this.label = ctx.text(0, 0, info.name ?? '', '#ffd070').setOrigin(0.5, 1);
    this.bar = sc.add.graphics();
  }
  /** sichtbare Höhe über dem Standpunkt */
  private visTop = 0;
  get top() { return (this.visTop || (this.h - this.foot) * 0.8) * this.scale; }
  play(a: string, restart = false) { if (this.dying) return; if (a !== this.anim || restart) { this.anim = a; this.animStart = this.ctx.clock(); } }
  die() { this.dying = true; this.anim = 'death'; this.animStart = this.ctx.clock(); this.bar.destroy(); this.label?.destroy(); this.label = undefined; this.status.destroy(this.ctx); }
  deathDone(): boolean { const d = this.boss ? BOSS_ANIMS.death : MOB_ANIMS.death; return animDone(d, this.ctx.clock() - this.animStart); }
  draw(now: number) {
    const t = this.ctx.clock() - this.animStart;
    const frame = this.boss ? bossFrame((this.anim in BOSS_ANIMS ? this.anim : 'idle') as BossAnim, t) : mobFrame((this.anim in MOB_ANIMS ? this.anim : 'idle') as MobAnim, t);
    const px = Math.round(this.x), py = Math.round(this.y + (this.boss ? 8 : 4));
    this.sprite.setFrame(frame).setFlipX(!!this.left).setPosition(px, py).setDepth(this.y);
    this.blob.setPosition(px, py).setVisible(!this.dying);
    this.shadow.setFrame(frame);
    const sc = this.ctx.shadowAt(this.x, this.y);
    applyShadow(this.shadow, px, py, this.dying ? { ...sc, alpha: 0 } : sc, !!this.left, this.scale);
    if (this.dying) { this.sprite.clearTint(); return; }
    if (now < this.flashUntil) this.sprite.setTintFill(0xffffff);
    else if (this.flags & STATUS_BIT.freeze) this.sprite.setTint(0x88ccff);
    else if (this.flags & STATUS_BIT.stun) this.sprite.setTint(0xffffa0);
    else if (this.flags & STATUS_BIT.root) this.sprite.setTint(0xc8a878);
    else if (this.flags & STATUS_BIT.burn) this.sprite.setTint(0xffb090);
    else if (this.flags & STATUS_BIT.poison) this.sprite.setTint(0xb0ff90);
    else if (this.flags & STATUS_BIT.slow) this.sprite.setTint(0xa0c8ff);
    else if (this.flags & STATUS_BIT.mark) this.sprite.setTint(0xe0a0ff);
    else if (this.flags & STATUS_BIT.expose) this.sprite.setTint(0xb8ffd8);
    else if (this.flags & FLAG_ELITE) this.sprite.setTint(0xffecc8);
    else this.sprite.clearTint();
    this.sprite.setAlpha(this.flags & FLAG_INVULN && !this.boss ? 0.6 : 1);
    this.status.update(this.ctx, this.flags, () => (this.alive && !this.dying ? { x: this.x, y: this.y } : null), this.top);
    this.bar.clear();
    const top = py - this.top - 6;
    if (!this.boss && this.hp < this.info.maxHp && this.hp > 0) {
      const w = this.info.elite ? 26 : 18;
      this.bar.fillStyle(0x10131c, 0.8).fillRect(px - w / 2 - 1, top, w + 2, 3);
      this.bar.fillStyle(this.info.elite ? 0xffb030 : 0xe04848, 1).fillRect(px - w / 2, top + 1, w * Math.max(0, this.hp / this.info.maxHp), 1);
    }
    this.label?.setPosition(px, Math.round(top - 1));
  }
  destroy() { this.alive = false; this.sprite.destroy(); this.blob.destroy(); this.shadow.destroy(); this.bar.destroy(); this.label?.destroy(); this.status.destroy(this.ctx); }
}

export class ObjView {
  parts: Phaser.GameObjects.Image[] = []; shadows: Phaser.GameObjects.Image[] = [];
  label?: Phaser.GameObjects.Text; marker?: Phaser.GameObjects.Image; glow?: Phaser.GameObjects.Image;
  /** [Radius, Farbe, Stärke] */
  light: [number, number, number] | null = null;
  constructor(public o: ObjInfo) {}
  destroy() { for (const p of this.parts) p.destroy(); for (const s of this.shadows) s.destroy(); this.label?.destroy(); this.marker?.destroy(); this.glow?.destroy(); }
}
