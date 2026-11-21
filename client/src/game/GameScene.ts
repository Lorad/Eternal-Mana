/**
 * Die Spielszene: stellt die Welt dar, sagt die eigene Bewegung voraus und interpoliert alles andere
 * aus den Server-Snapshots. Spielentscheidungen trifft ausschließlich der Server.
 */
import Phaser from 'phaser';
import { circleFree, moveCircle } from '../../../shared/src/collision';
import { CFG, ELEMENT_COLOR } from '../../../shared/src/config';
import { CLASSES } from '../../../shared/src/data/classes';
import { NPCS } from '../../../shared/src/data/npcs';
import { npcMarker } from '../../../shared/src/data/quests';
import { SKILLS, skillMp } from '../../../shared/src/data/skills';
import { ZONES } from '../../../shared/src/data/zones';
import { getMap, type GameMap } from '../../../shared/src/maps/mapgen';
import { TILE } from '../../../shared/src/maps/tiles';
import { computeStats } from '../../../shared/src/stats';
import { Anim, FLAG_DEAD, FLAG_ELITE, FLAG_INVULN, FLAG_ROLL, FLAG_SHIELD, STATUS_BIT } from '../../../shared/src/types';
import type { CharData, Derived, DropInfo, Element, GameEvent, MobInfo, ObjInfo, PlayerInfo, ProjInfo, ServerMsg, ZoneFx, ZoneInit } from '../../../shared/src/types';
import { audio } from '../audio';
import type { AmbienceId, MusicId, SfxName } from '../audio/spec';
import { paintGround } from '../gfx';
import type { GfxBundle } from '../gfx/spec';
import { net } from '../net/net';
import { bus } from '../state/bus';
import { live } from '../state/live';
import { settings } from '../state/settings';
import { store, uiBlocksGame } from '../state/store';
import { input, pointer, pollInput } from './input';

type Snap = Extract<ServerMsg, { t: 's' }>;
interface Buf { t: number; x: number; y: number }

const FONT = '"Trebuchet MS", Verdana, sans-serif';
const FLAT = new Set(['flowers_a', 'flowers_b', 'mushrooms', 'bones', 'skull', 'glowshroom', 'plate_up', 'plate_down']);
const LIGHTS: Record<string, [number, number]> = {
  campfire: [80, 0xffa040], brazier: [72, 0xffa040], lamp: [64, 0xffd890], torch: [60, 0xffa040],
  crystal_blue: [36, 0x60c0ff], crystal_pink: [36, 0xff80d0], crystal_big: [56, 0x80e0ff], glowshroom: [30, 0x60ffd0],
  ember_vent: [44, 0xff6020], void_crystal: [40, 0xb060ff], rune_stone: [40, 0xffe080], floating_shard: [30, 0xc080ff], lava_rock: [26, 0xff5010],
};
const WEATHER: Record<string, { frame: string; n: number; vx: number; vy: number; tint: number; alpha: number; scale: number; add?: boolean; sway?: number }> = {
  rain: { frame: 'raindrop', n: 90, vx: -40, vy: 260, tint: 0xa8c8ff, alpha: 0.6, scale: 1 },
  leaves: { frame: 'leaf', n: 14, vx: 22, vy: 18, tint: 0xc8e070, alpha: 0.9, scale: 1, sway: 14 },
  snow: { frame: 'snowflake', n: 60, vx: -8, vy: 28, tint: 0xffffff, alpha: 0.9, scale: 1, sway: 10 },
  blizzard: { frame: 'snowflake', n: 150, vx: -150, vy: 60, tint: 0xffffff, alpha: 0.85, scale: 1, sway: 6 },
  ash: { frame: 'mote', n: 40, vx: 6, vy: 14, tint: 0x9a9088, alpha: 0.7, scale: 1, sway: 8 },
  embers: { frame: 'ember', n: 34, vx: 8, vy: -26, tint: 0xffa040, alpha: 0.95, scale: 1, add: true, sway: 10 },
  motes: { frame: 'mote', n: 30, vx: 3, vy: -5, tint: 0xbfe8ff, alpha: 0.7, scale: 1, add: true, sway: 8 },
  spores: { frame: 'mote', n: 26, vx: 4, vy: -6, tint: 0xb8ff90, alpha: 0.6, scale: 1, add: true, sway: 8 },
  void: { frame: 'mote', n: 40, vx: 0, vy: -14, tint: 0xc070ff, alpha: 0.8, scale: 1, add: true, sway: 12 },
};
const STEP_SFX: Record<string, SfxName> = { gruenwald: 'step_grass', kristall: 'step_stone', glut: 'step_ash', frost: 'step_snow', ruinen: 'step_stone', schatten: 'step_stone' };
const PORTAL_TINT: Record<string, number> = { gruenwald: 0x80ff90, kristall: 0x70d0ff, glut: 0xff8040, frost: 0xc0f0ff, ruinen: 0xffe080, schatten: 0xb060ff };

function dirOf(a: number): [number, boolean] {
  const abs = Math.abs(a);
  if (abs < Math.PI * 0.3) return [1, false];
  if (abs > Math.PI * 0.7) return [1, true];
  return [a > 0 ? 0 : 2, false];
}
function charFrame(anim: Anim, row: number, t: number, start: number): string {
  let col = 0;
  switch (anim) {
    case Anim.Idle: col = Math.floor(t / 520) % 2; break;
    case Anim.Move: col = 2 + (Math.floor(t / 105) % 4); break;
    case Anim.Attack: col = 6 + Math.min(2, Math.floor((t - start) / 75)); break;
    case Anim.Cast: col = 9 + (Math.floor(t / 150) % 2); break;
    case Anim.Hurt: col = 11; break;
    case Anim.Roll: col = 12 + (Math.floor((t - start) / 75) % 4); break;
    case Anim.Dead: return '48';
    default: col = 0;
  }
  return String(row * 16 + col);
}

class PlayerView {
  sprite: Phaser.GameObjects.Sprite; shadow: Phaser.GameObjects.Image; label?: Phaser.GameObjects.Text; bar?: Phaser.GameObjects.Graphics;
  buf: Buf[] = []; x = 0; y = 0; facing = Math.PI / 2; anim = Anim.Idle; animStart = 0; hp = 1; maxHp = 1; flags = 0; flashUntil = 0;
  constructor(scene: GameScene, public info: PlayerInfo, self: boolean) {
    this.shadow = scene.add.image(0, 0, 'fx', 'shadow').setDepth(1).setAlpha(0.7);
    this.sprite = scene.add.sprite(0, 0, 'char_' + info.cls, '0').setOrigin(0.5, 1);
    if (!self) {
      this.label = scene.text(0, 0, info.name, '#e8f4ff').setOrigin(0.5, 1);
      this.bar = scene.add.graphics();
    }
  }
  setAnim(a: Anim, now: number) { if (a !== this.anim) { this.anim = a; this.animStart = now; } }
  draw(now: number) {
    const [row, flip] = dirOf(this.facing);
    this.sprite.setFrame(charFrame(this.anim, row, now, this.animStart)).setFlipX(flip).setPosition(Math.round(this.x), Math.round(this.y + 3)).setDepth(this.y);
    this.shadow.setPosition(Math.round(this.x), Math.round(this.y + 2)).setVisible(this.anim !== Anim.Dead);
    const inv = (this.flags & FLAG_INVULN) && !(this.flags & FLAG_ROLL);
    this.sprite.setAlpha(inv ? 0.55 + 0.3 * Math.sin(now / 60) : 1);
    if (now < this.flashUntil) this.sprite.setTintFill(0xffffff);
    else if (this.flags & STATUS_BIT.burn) this.sprite.setTint(0xffb090);
    else if (this.flags & STATUS_BIT.poison) this.sprite.setTint(0xb0ff90);
    else if (this.flags & STATUS_BIT.slow) this.sprite.setTint(0xa0c8ff);
    else if (this.flags & FLAG_SHIELD) this.sprite.setTint(0xfff0b0);
    else this.sprite.clearTint();
    if (this.label) {
      this.label.setPosition(Math.round(this.x), Math.round(this.y - 30)).setDepth(this.y + 2000);
      this.bar!.clear().setDepth(this.y + 2000);
      if (!(this.flags & FLAG_DEAD)) {
        this.bar!.fillStyle(0x000000, 0.7).fillRect(this.x - 10, this.y - 30, 20, 3);
        this.bar!.fillStyle(0x58d058, 1).fillRect(this.x - 9, this.y - 29, 18 * Math.max(0, this.hp / this.maxHp), 1);
      }
    }
  }
  destroy() { this.sprite.destroy(); this.shadow.destroy(); this.label?.destroy(); this.bar?.destroy(); }
}

class MobView {
  sprite: Phaser.GameObjects.Sprite; shadow: Phaser.GameObjects.Image; bar: Phaser.GameObjects.Graphics; label?: Phaser.GameObjects.Text;
  buf: Buf[] = []; x: number; y: number; left = 0; anim = Anim.Idle; hp: number; flags = 0; flashUntil = 0; seen = false; h: number; boss: boolean;
  constructor(scene: GameScene, public info: MobInfo) {
    this.boss = !!info.boss;
    const key = (this.boss ? 'boss_' : 'mob_') + info.mob;
    const meta = (this.boss ? scene.gfx.bossMeta : scene.gfx.mobMeta)[info.mob] ?? { w: 24, h: 24 };
    this.h = meta.h;
    this.x = info.x; this.y = info.y; this.hp = info.hp;
    this.shadow = scene.add.image(0, 0, 'fx', meta.w > 28 ? 'shadow_l' : 'shadow').setDepth(1).setAlpha(0.7);
    if (this.boss) this.shadow.setScale(meta.w / 44);
    this.sprite = scene.add.sprite(info.x, info.y, key, '0').setOrigin(0.5, 1);
    if (info.elite) { this.sprite.setScale(1.18); this.label = scene.text(0, 0, info.name ?? '', '#ffd070').setOrigin(0.5, 1); }
    this.bar = scene.add.graphics();
  }
  draw(now: number) {
    let f = 0;
    if (this.boss) f = this.anim === Anim.Windup ? 4 : this.anim === Anim.Attack ? 5 : this.anim === Anim.Special ? 6 + (Math.floor(now / 180) % 2) : this.anim === Anim.Hurt ? 8 : Math.floor(now / 190) % 4;
    else f = this.anim === Anim.Windup ? 4 : this.anim === Anim.Attack ? 5 : this.anim === Anim.Hurt ? 6 : this.anim === Anim.Move ? Math.floor(now / 120) % 4 : Math.floor(now / 260) % 4;
    const oy = this.boss ? Math.round(this.h * 0.18) : 5;
    this.sprite.setFrame(String(f)).setFlipX(!!this.left).setPosition(Math.round(this.x), Math.round(this.y + oy)).setDepth(this.y);
    this.shadow.setPosition(Math.round(this.x), Math.round(this.y + oy - 1));
    if (now < this.flashUntil) this.sprite.setTintFill(0xffffff);
    else if (this.flags & STATUS_BIT.stun) this.sprite.setTint(0xffff90);
    else if (this.flags & STATUS_BIT.burn) this.sprite.setTint(0xffa080);
    else if (this.flags & STATUS_BIT.poison) this.sprite.setTint(0xa8ff80);
    else if (this.flags & STATUS_BIT.slow) this.sprite.setTint(0x90c0ff);
    else if (this.flags & STATUS_BIT.mark) this.sprite.setTint(0xd090ff);
    else if (this.flags & FLAG_ELITE) this.sprite.setTint(0xffe8c0);
    else this.sprite.clearTint();
    this.sprite.setAlpha(this.flags & FLAG_INVULN && !this.boss ? 0.6 : 1);
    this.bar.clear();
    const top = this.y + oy - this.h * (this.info.elite ? 1.18 : 1) - 3;
    if (!this.boss && this.hp < this.info.maxHp && this.hp > 0) {
      const w = this.info.elite ? 24 : 18;
      this.bar.setDepth(this.y + 2000);
      this.bar.fillStyle(0x000000, 0.75).fillRect(this.x - w / 2 - 1, top, w + 2, 3);
      this.bar.fillStyle(this.info.elite ? 0xffb030 : 0xe04848, 1).fillRect(this.x - w / 2, top + 1, w * Math.max(0, this.hp / this.info.maxHp), 1);
    }
    this.label?.setPosition(Math.round(this.x), Math.round(top - 1)).setDepth(this.y + 2000);
  }
  destroy() { this.sprite.destroy(); this.shadow.destroy(); this.bar.destroy(); this.label?.destroy(); }
}

class ObjView {
  parts: Phaser.GameObjects.Image[] = []; label?: Phaser.GameObjects.Text; marker?: Phaser.GameObjects.Image; glow?: Phaser.GameObjects.Image;
  light: [number, number] | null = null;
  constructor(public o: ObjInfo) {}
  destroy() { for (const p of this.parts) p.destroy(); this.label?.destroy(); this.marker?.destroy(); this.glow?.destroy(); }
}

export class GameScene extends Phaser.Scene {
  gfx!: GfxBundle;
  private init0!: ZoneInit;
  private map!: GameMap;
  private ready = false;
  private zoomLevel = 3;
  // Welt
  private liquid?: Phaser.GameObjects.TileSprite;
  private liquidFrame = 0;
  private animDecor: { s: Phaser.GameObjects.Image; base: string; n: number; off: number }[] = [];
  private staticLights: { x: number; y: number; r: number }[] = [];
  private groundKeys: string[] = [];
  private blocked = new Set<number>();
  // Entitäten
  private me!: PlayerView;
  private players = new Map<number, PlayerView>();
  private mobs = new Map<number, MobView>();
  private objs = new Map<number, ObjView>();
  private drops = new Map<number, { d: DropInfo; s: Phaser.GameObjects.Image; label?: Phaser.GameObjects.Text }>();
  private projs = new Map<number, { p: ProjInfo; s: Phaser.GameObjects.Image; x: number; y: number; born: number; trail: number }>();
  private zfx = new Map<number, { z: ZoneFx; g: Phaser.GameObjects.Graphics; born: number; rune?: Phaser.GameObjects.Image }>();
  // lokale Simulation
  private epoch = 0;
  private stats!: Derived;
  private statsFor: CharData | null = null;
  private rollUntil = 0; private rollDir = 0; private dodgeReady = 0; private atkReady = 0; private combo = 0; private comboAt = 0;
  private lastSend = 0; private sentMoving = false; private sentX = 0; private sentY = 0; private sentF = 0;
  private localAnimUntil = 0; private stepAt = 0;
  private timeOffset: number | null = null;
  private target: ObjView | PlayerView | null = null;
  private hoverCheck = 0;
  // Darstellung
  private darkRT?: Phaser.GameObjects.RenderTexture;
  private stamp!: Phaser.GameObjects.Image;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private smoke!: Phaser.GameObjects.Particles.ParticleEmitter;
  private stars!: Phaser.GameObjects.Particles.ParticleEmitter;
  private weatherKind = '';
  private weather: { s: Phaser.GameObjects.Image; vx: number; vy: number; ph: number }[] = [];
  private liveAt = 0; private bossAt = 0; private markerChar: CharData | null = null;
  private aim = Math.PI / 2;

  constructor() { super('game'); }

  init(data: { init: ZoneInit; gfx: GfxBundle }) { this.init0 = data.init; this.gfx = data.gfx; this.ready = false; }

  text(x: number, y: number, s: string, color: string, size = 8) {
    return this.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', color, stroke: '#10131c', strokeThickness: 2, resolution: Math.max(2, this.zoomLevel) }).setDepth(5000);
  }

  create() {
    this.players.clear(); this.mobs.clear(); this.objs.clear(); this.drops.clear(); this.projs.clear(); this.zfx.clear();
    this.animDecor = []; this.staticLights = []; this.weather = []; this.weatherKind = ''; this.blocked.clear(); this.darkRT = undefined; this.target = null;
    this.timeOffset = null; this.markerChar = null;
    this.applyZoom();
    this.scale.on('resize', this.applyZoom, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.applyZoom, this));
    this.buildWorld().catch(e => console.error("Zone konnte nicht aufgebaut werden", e));
  }

  private applyZoom = () => {
    const h = this.scale.height, w = this.scale.width;
    this.zoomLevel = Phaser.Math.Clamp(Math.round(Math.min(h / 250, w / 400)), 2, 6);
    this.cameras.main.setZoom(this.zoomLevel);
    if (this.darkRT) { this.darkRT.destroy(); this.darkRT = undefined; }
  };

  private async buildWorld() {
    const i = this.init0;
    const map = (this.map = getMap(i.zone));
    const def = map.def;
    const frame = () => new Promise<void>(r => requestAnimationFrame(() => r()));
    for (const k of this.groundKeys) if (this.textures.exists(k)) this.textures.remove(k);
    this.groundKeys = [];
    const W = map.w * TILE, H = map.h * TILE;
    this.cameras.main.setBounds(0, 0, W, H).setBackgroundColor(0x07080d).setRoundPixels(true);
    // Flüssigkeit unter dem Boden
    this.liquid = this.add.tileSprite(0, 0, W, H, `liq_${map.biome}_0`).setOrigin(0).setDepth(-20);
    // Boden in Kacheln von 32x32 Feldern malen
    const pm = { w: map.w, h: map.h, tiles: map.tiles, biome: map.biome, dungeon: map.dungeon, seed: map.seed };
    const C = 32;
    let n = 0;
    for (let cy = 0; cy < map.h; cy += C) for (let cx = 0; cx < map.w; cx += C) {
      const x1 = Math.min(map.w, cx + C), y1 = Math.min(map.h, cy + C);
      const cv = document.createElement('canvas');
      cv.width = (x1 - cx) * TILE; cv.height = (y1 - cy) * TILE;
      const ctx = cv.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.translate(-cx * TILE, -cy * TILE);
      paintGround(ctx, pm, cx, cy, x1, y1);
      const key = `ground_${n++}`;
      this.textures.addCanvas(key, cv);
      this.groundKeys.push(key);
      this.add.image(cx * TILE, cy * TILE, key).setOrigin(0).setDepth(-10);
      if (n % 2 === 0) await frame();
      if (this.init0 !== i || !this.sys.settings.active) return;
    }
    // Deko
    const objTex = this.textures.get('obj');
    for (const d of map.decor) {
      let f = d.f, anim = 0;
      if (!objTex.has(f)) { if (objTex.has(f + '_0')) { let k = 0; while (objTex.has(`${f}_${k}`)) k++; anim = k; f = f + '_0'; } else continue; }
      const s = this.add.image(d.x, d.y, 'obj', f).setOrigin(0.5, 1).setDepth(FLAT.has(d.f) ? 3 : d.y);
      if (anim) this.animDecor.push({ s, base: d.f, n: anim, off: (d.x * 7 + d.y * 13) % 400 });
      const L = LIGHTS[d.f];
      if (L) { this.staticLights.push({ x: d.x, y: d.y - 8, r: L[0] }); this.add.image(d.x, d.y - 8, 'fx', 'glow').setScale(L[0] / 90).setTint(L[1]).setAlpha(0.22).setBlendMode(Phaser.BlendModes.ADD).setDepth(d.y + 1); }
    }
    await frame();
    // Partikel
    this.sparks = this.add.particles(0, 0, 'fx', { frame: 'spark', lifespan: { min: 220, max: 520 }, speed: { min: 20, max: 90 }, scale: { start: 1, end: 0 }, alpha: { start: 1, end: 0 }, emitting: false, blendMode: 'ADD' }).setDepth(6000);
    this.smoke = this.add.particles(0, 0, 'fx', { frame: 'smoke', lifespan: { min: 300, max: 600 }, speed: { min: 6, max: 28 }, scale: { start: 0.5, end: 1.3 }, alpha: { start: 0.7, end: 0 }, emitting: false }).setDepth(6000);
    this.stars = this.add.particles(0, 0, 'fx', { frame: 'star', lifespan: { min: 400, max: 800 }, speedY: { min: -50, max: -15 }, speedX: { min: -18, max: 18 }, scale: { start: 1, end: 0.2 }, alpha: { start: 1, end: 0 }, emitting: false, blendMode: 'ADD' }).setDepth(6000);
    this.stamp = this.make.image({ key: 'fx', frame: 'glow', add: false });
    // Entitäten
    const st = store.state;
    this.me = new PlayerView(this, { id: i.you, name: st.char!.name, cls: st.char!.cls, level: st.char!.level, party: 0 }, true);
    this.me.x = i.x; this.me.y = i.y; this.epoch = i.epoch;
    for (const p of i.players) this.addPlayer(p);
    for (const m of i.mobs) this.addMob(m);
    for (const o of i.objs) this.addObj(o);
    for (const d of i.drops) this.addDrop(d);
    for (const z of i.zones) this.addZoneFx(z);
    this.cameras.main.startFollow(this.me.sprite, true, 0.14, 0.14, 0, 14);
    this.cameras.main.centerOn(i.x, i.y);
    audio.setAmbience(def.ambience as AmbienceId);
    if (i.boss) { store.set({ boss: { id: i.boss.id, name: i.boss.name, phase: i.boss.phase, el: i.boss.el, hp: 1, maxHp: 1 } }); audio.playMusic(def.boss === 'hohlkoenig' ? 'final_boss' : 'boss'); }
    else audio.playMusic(def.music as MusicId);
    live.zone = i.zone;
    this.sentX = i.x; this.sentY = i.y;
    this.ready = true;
    input.clearPressed();
    store.set({ screen: 'game', keys: 0 });
    bus.emit('game:ready');
    this.cameras.main.fadeIn(350, 7, 8, 13);
  }

  // ------------------------------------------------------------------ Entitäten anlegen
  private addPlayer(p: PlayerInfo) {
    if (p.id === this.me.info.id) { this.me.info = p; return; }
    const old = this.players.get(p.id);
    if (old) { old.info = p; old.label?.setText(p.name).setColor(this.inMyParty(p) ? '#9dffb0' : '#e8f4ff'); return; }
    const v = new PlayerView(this, p, false);
    v.label?.setColor(this.inMyParty(p) ? '#9dffb0' : '#e8f4ff');
    v.x = -999; v.y = -999;
    this.players.set(p.id, v);
  }
  private inMyParty(p: PlayerInfo) { return p.party !== 0 && store.state.party.some(m => m.id === p.id); }
  private addMob(m: MobInfo) {
    this.mobs.get(m.id)?.destroy();
    this.mobs.set(m.id, new MobView(this, m));
  }
  private cellXY(c: number): [number, number] { return [(c % this.map.w) * TILE + 8, Math.floor(c / this.map.w) * TILE + 8]; }
  private addObj(o: ObjInfo) {
    this.objs.get(o.id)?.destroy();
    const v = new ObjView(o);
    this.objs.set(o.id, v);
    const img = (x: number, y: number, f: string, depth?: number) => { const s = this.add.image(x, y, 'obj', f).setOrigin(0.5, 1).setDepth(depth ?? y); v.parts.push(s); return s; };
    const pr = o.props ?? {};
    switch (o.type) {
      case 'npc': {
        const def = NPCS[o.tag!];
        const s = this.add.sprite(o.x, o.y + 7, 'npc_' + (def?.look ?? 'wache'), '0').setOrigin(0.5, 1).setDepth(o.y);
        v.parts.push(s, this.add.image(o.x, o.y + 6, 'fx', 'shadow').setDepth(1).setAlpha(0.7));
        v.label = this.text(o.x, o.y - 26, def?.name ?? '', '#ffe9a8').setOrigin(0.5, 1);
        v.marker = this.add.image(o.x, o.y - 46, 'fx', 'exclaim').setDepth(5001).setVisible(false);
        break;
      }
      case 'chest': img(o.x, o.y + 7, 'chest_wood_closed'); break;
      case 'door': case 'bossdoor': case 'boulder': {
        const cells: number[] = pr.cells ?? [];
        if (o.type === 'bossdoor') img(pr.orient === 'v' ? o.x - 8 : o.x, o.y + 8, 'door_boss');
        else for (const c of cells) { const [x, y] = this.cellXY(c); img(x, y + 8, o.type === 'boulder' ? 'boulder_wall' : 'door_closed'); }
        break;
      }
      case 'lever': img(o.x, o.y + 7, 'lever_off'); break;
      case 'plate': img(o.x, o.y + 8, 'plate_up', 3); break;
      case 'brazier': img(o.x, o.y + 7, 'brazier_unlit'); v.glow = this.add.image(o.x, o.y - 4, 'fx', 'glow').setScale(0.8).setTint(0xffa040).setAlpha(0.25).setBlendMode(Phaser.BlendModes.ADD).setDepth(o.y + 1).setVisible(false); break;
      case 'stone': img(o.x, o.y + 7, 'quellstein_off'); v.glow = this.add.image(o.x, o.y - 12, 'fx', 'glow').setScale(0.9).setTint(0x60ffe0).setAlpha(0.3).setBlendMode(Phaser.BlendModes.ADD).setDepth(o.y + 1).setVisible(false); break;
      case 'exit': {
        const look = pr.look;
        if (look === 'cave') img(o.x, o.y + 12, 'cave_entrance', o.y - 4);
        else if (look === 'stairs_down') img(o.x, o.y + 12, 'stairs_down', 4);
        else if (look === 'stairs_up') img(o.x, o.y + 12, 'stairs_up', 4);
        else if (look === 'portal') { img(o.x, o.y + 10, 'portal_0').setTint(PORTAL_TINT[ZONES[pr.to]?.biome ?? 'schatten']); v.light = [70, 0]; v.glow = this.add.image(o.x, o.y - 10, 'fx', 'glow').setTint(PORTAL_TINT[ZONES[pr.to]?.biome ?? 'schatten']).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD).setDepth(o.y + 1); }
        const arrow = look === 'edge' ? ({ n: '▲ ', s: '▼ ', e: '', w: '◀ ' } as any)[pr.dir] + pr.label + (pr.dir === 'e' ? ' ▶' : '') : pr.label;
        let lx = o.x, ly = o.y - (look === 'edge' ? 2 : 34);
        if (look === 'edge') { if (pr.dir === 'n') ly = o.y + 22; if (pr.dir === 's') ly = o.y - 18; if (pr.dir === 'e') lx = o.x - 30; if (pr.dir === 'w') lx = o.x + 30; }
        v.label = this.text(lx, ly, arrow ?? '', '#bfe9ff').setOrigin(0.5, 1);
        break;
      }
      case 'spikes': for (const c of (pr.cells ?? []) as number[]) { const [x, y] = this.cellXY(c); img(x, y + 8, 'spikes_0', 3); } break;
      case 'turret': img(o.x, o.y + 7, 'turret').setFlipX(Math.cos(pr.dir) < 0); break;
      case 'node': img(o.x, o.y + 7, 'node_' + pr.kind); break;
      case 'shard': img(o.x, o.y + 4, 'shard_0'); v.glow = this.add.image(o.x, o.y - 6, 'fx', 'glow').setScale(0.5).setTint(0x70ffe8).setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD).setDepth(o.y + 1); v.light = [36, 0]; break;
      case 'sign': img(o.x, o.y + 7, 'signpost'); break;
    }
    this.applyObjState(v);
  }
  private applyObjState(v: ObjView) {
    const o = v.o, pr = o.props ?? {}, s0 = v.parts[0];
    const w = this.map.w;
    const setCells = (on: boolean) => { for (const c of (pr.cells ?? []) as number[]) { if (on) this.blocked.add(c); else this.blocked.delete(c); } };
    switch (o.type) {
      case 'chest': s0.setFrame(`chest_${pr.tier ?? 'wood'}_${o.state ? 'open' : 'closed'}`); if (pr.sealed && !o.state) s0.setTint(0xc8a0ff); else s0.clearTint(); break;
      case 'door': setCells(o.state === 0); for (const p of v.parts) p.setFrame(o.state ? 'door_open' : pr.locked && !pr.unlocked ? 'door_locked' : 'door_closed').setDepth(o.state ? 3 : p.y); break;
      case 'bossdoor': setCells(o.state === 0); s0.setVisible(o.state === 0); break;
      case 'boulder': setCells(o.state === 0); for (const p of v.parts) p.setVisible(o.state === 0); break;
      case 'lever': s0.setFrame(o.state ? 'lever_on' : 'lever_off'); break;
      case 'plate': s0.setFrame(o.state ? 'plate_down' : 'plate_up'); break;
      case 'brazier': v.light = o.state ? [70, 0] : null; v.glow?.setVisible(!!o.state); if (!o.state) s0.setFrame('brazier_unlit'); break;
      case 'stone': v.light = o.state ? [60, 0] : null; v.glow?.setVisible(!!o.state); if (!o.state) s0.setFrame('quellstein_off'); break;
      case 'node': s0.setFrame(o.state ? 'node_empty' : 'node_' + pr.kind); break;
      case 'shard': s0.setVisible(!o.state); v.glow?.setVisible(!o.state); if (o.state) v.light = null; break;
    }
    void w;
  }
  private addDrop(d: DropInfo) {
    const f = d.kind === 'gold' ? 'drop_gold' : d.icon.startsWith('potion') || d.icon === 'food' ? 'drop_potion' : d.icon === 'key' ? 'drop_key' : d.icon.startsWith('mat') || d.icon === 'gem' || d.icon === 'scroll' || d.icon === 'charm' && d.rarity === 0 ? 'drop_bag' : 'drop_gear';
    const s = this.add.image(d.x, d.y, 'obj', f).setOrigin(0.5, 1).setDepth(d.y);
    const col = [0, 0x70e070, 0x60b0ff, 0xd090ff, 0xffb040][d.rarity];
    let label: Phaser.GameObjects.Text | undefined;
    if (d.rarity >= 1 && d.kind === 'item') { s.setTint(Phaser.Display.Color.IntegerToColor(col).lighten(40).color); label = this.text(d.x, d.y - 14, d.name, '#' + col.toString(16).padStart(6, '0'), 7).setOrigin(0.5, 1); }
    this.tweens.add({ targets: s, y: d.y - 10, duration: 180, yoyo: true, ease: 'Quad.out' });
    this.drops.set(d.id, { d, s, label });
  }
  private addZoneFx(z: ZoneFx) {
    const g = this.add.graphics().setDepth(2);
    let rune: Phaser.GameObjects.Image | undefined;
    if (z.kind === 'zone' && !z.hostile) rune = this.add.image(z.x, z.y, 'fx', 'rune_circle').setDepth(2).setTint(ELEMENT_COLOR[z.el]).setAlpha(0.55).setScale((z.r * 2) / 64).setBlendMode(Phaser.BlendModes.ADD);
    this.zfx.set(z.id, { z, g, born: performance.now(), rune });
    if (z.kind === 'tele' && z.hostile && z.dur > 0.3) this.sfxAt('telegraph', z.x, z.y, 0.5);
  }

  // ------------------------------------------------------------------ Netzwerkereignisse
  onSnap(m: Snap) {
    if (!this.ready) return;
    const nowP = performance.now();
    const off = m.n - nowP;
    this.timeOffset = this.timeOffset === null ? off : Math.abs(off - this.timeOffset) > 400 ? off : this.timeOffset * 0.93 + off * 0.07;
    for (const s of m.p) {
      const [id, x, y, f, anim, hp, maxHp, flags] = s;
      if (id === this.me.info.id) {
        this.me.hp = hp; this.me.maxHp = maxHp; this.me.flags = flags;
        this.serverAnim = anim;
        continue;
      }
      const v = this.players.get(id);
      if (!v) continue;
      if (v.x < -900) { v.x = x; v.y = y; }
      v.buf.push({ t: m.n, x, y }); if (v.buf.length > 8) v.buf.shift();
      v.facing = f / 100; v.setAnim(anim, nowP); v.hp = hp; v.maxHp = maxHp; v.flags = flags;
    }
    for (const s of m.m) {
      const v = this.mobs.get(s[0]);
      if (!v) continue;
      if (!v.seen || Math.hypot(s[1] - v.x, s[2] - v.y) > 120) { v.x = s[1]; v.y = s[2]; v.buf = []; v.seen = true; }
      v.buf.push({ t: m.n, x: s[1], y: s[2] }); if (v.buf.length > 8) v.buf.shift();
      v.left = s[3]; v.anim = s[4]; v.hp = s[5]; v.flags = s[6];
    }
    if (m.ev) for (const e of m.ev) this.onEvent(e);
    if (m.me) {
      const me = store.state.me;
      if (me.hp !== m.me[0] || me.maxHp !== m.me[1] || me.mp !== m.me[2] || me.maxMp !== m.me[3] || me.flags !== m.me[4]) store.set({ me: { hp: m.me[0], maxHp: m.me[1], mp: m.me[2], maxMp: m.me[3], flags: m.me[4] } });
      if (store.state.dead && m.me[0] > 0 && !(m.me[4] & FLAG_DEAD)) store.set({ dead: null });
    }
    if (m.k !== undefined && m.k !== store.state.keys) store.set({ keys: m.k });
  }
  private serverAnim: Anim = Anim.Idle;
  onPos(m: Extract<ServerMsg, { t: 'pos' }>) {
    if (!this.ready) return;
    if (m.dash) this.smoke.explode(6, this.me.x, this.me.y);
    this.me.x = m.x; this.me.y = m.y; this.epoch = m.e; this.sentX = m.x; this.sentY = m.y;
  }
  onDrop(d: DropInfo) { if (this.ready) this.addDrop(d); }
  onDropGone(id: number, got?: number) {
    const d = this.drops.get(id);
    if (!d) return;
    this.drops.delete(id);
    d.label?.destroy();
    if (got) this.tweens.add({ targets: d.s, x: this.me.x, y: this.me.y - 10, alpha: 0, duration: 160, onComplete: () => d.s.destroy() });
    else d.s.destroy();
  }

  private entityPos(id: number): { x: number; y: number; h: number } | null {
    if (id === this.me.info.id) return { x: this.me.x, y: this.me.y, h: 26 };
    const p = this.players.get(id); if (p) return { x: p.x, y: p.y, h: 26 };
    const m = this.mobs.get(id); if (m) return { x: m.x, y: m.y, h: m.h };
    return null;
  }
  sfxAt(n: string, x?: number, y?: number, vol = 1) {
    if (x === undefined || y === undefined) { audio.playSfx(n as SfxName, { volume: vol }); return; }
    const d = Math.hypot(x - this.me.x, y - this.me.y);
    if (d > 340) return;
    audio.playSfx(n as SfxName, { volume: vol * (1 - d / 400), pan: Phaser.Math.Clamp((x - this.me.x) / 200, -0.8, 0.8) });
  }
  private floatText(x: number, y: number, s: string, color: string, size = 8, big = false) {
    const t = this.text(x + Phaser.Math.Between(-5, 5), y, s, color, size).setOrigin(0.5, 1).setDepth(7000);
    if (big) { t.setScale(1.5); this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.out' }); }
    this.tweens.add({ targets: t, y: y - 20, duration: 750, ease: 'Cubic.out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 500, duration: 280, onComplete: () => t.destroy() });
  }
  private burst(em: Phaser.GameObjects.Particles.ParticleEmitter, n: number, x: number, y: number, tint: number) { em.setParticleTint(tint); em.explode(n, x, y); }
  private slash(x: number, y: number, ang: number, range: number, tint: number, thrust = false) {
    const frames = thrust ? ['thrust_0', 'thrust_1', 'thrust_2'] : ['slash_0', 'slash_1', 'slash_2', 'slash_3'];
    const s = this.add.image(x + Math.cos(ang) * range * 0.45, y - 8 + Math.sin(ang) * range * 0.45, 'fx', frames[0]).setRotation(ang).setTint(tint).setDepth(y + 30).setScale(Math.max(0.6, range / 32)).setBlendMode(Phaser.BlendModes.ADD);
    let i = 0;
    this.time.addEvent({ delay: 38, repeat: frames.length - 1, callback: () => { i++; if (i >= frames.length) s.destroy(); else s.setFrame(frames[i]); } });
  }
  private ring(x: number, y: number, r: number, tint: number, dur = 320) {
    const s = this.add.image(x, y, 'fx', 'ring').setTint(tint).setDepth(y + 20).setScale(0.15).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: s, scale: (r * 2) / 64, alpha: 0, duration: dur, ease: 'Cubic.out', onComplete: () => s.destroy() });
  }
  private shake(i: number, d = 120) { if (settings.screenShake) this.cameras.main.shake(d, i / this.zoomLevel); }

  private onEvent(e: GameEvent) {
    const nowP = performance.now();
    switch (e.k) {
      case 'dmg': {
        const mine = e.id === this.me.info.id;
        const v = mine ? this.me : (this.players.get(e.id) ?? this.mobs.get(e.id));
        if (v) v.flashUntil = nowP + 80;
        const h = v instanceof MobView ? v.h : 26;
        if (settings.damageNumbers) {
          const col = e.pl ? '#ff6a5a' : e.c ? '#ffe45a' : '#' + ELEMENT_COLOR[e.el].toString(16).padStart(6, '0');
          this.floatText(e.x, e.y - h + 4, (e.c ? '✦' : '') + e.a, col, e.c ? 10 : 8, !!e.c);
        }
        this.burst(this.sparks, e.c ? 9 : 4, e.x, e.y - h / 2, e.pl ? 0xff5040 : ELEMENT_COLOR[e.el]);
        if (mine) { this.sfxAt('player_hurt'); this.shake(0.012); }
        else this.sfxAt(e.c ? 'hit_crit' : e.el === 'phys' ? 'hit_flesh' : 'hit_magic', e.x, e.y, 0.9);
        if (e.c && !e.pl) this.shake(0.006, 80);
        break;
      }
      case 'heal': this.floatText(e.x, e.y - 24, '+' + e.a, '#7dff8a'); this.burst(this.stars, 5, e.x, e.y - 10, 0x90ff90); break;
      case 'txt': this.floatText(e.x, e.y, e.s, e.col ?? '#ffffff'); break;
      case 'atk': {
        if (e.id === this.me.info.id && e.kind !== 'skill') break;
        const p = this.entityPos(e.id);
        if (!p) break;
        const tint = e.el === 'phys' ? 0xffffff : ELEMENT_COLOR[e.el];
        if (e.kind === 'bow') this.sfxAt('bow_shot', p.x, p.y);
        else if (e.kind === 'staff') this.sfxAt('cast_light', p.x, p.y, 0.6);
        else { this.slash(p.x, p.y, e.ang, e.range ?? 26, tint, e.kind === 'dagger' && e.combo !== 2); this.sfxAt(e.kind === 'sword' || e.kind === 'hammer' || e.kind === 'skill' ? 'swing_heavy' : 'swing_light', p.x, p.y, 0.8); }
        break;
      }
      case 'cast': { const p = this.entityPos(e.id); if (p) { this.ring(p.x, p.y - 8, 22, ELEMENT_COLOR[e.el], 260); this.burst(this.stars, 6, p.x, p.y - 12, ELEMENT_COLOR[e.el]); } break; }
      case 'fx': this.playFx(e); break;
      case 'sfx': this.sfxAt(e.n, e.x, e.y); break;
      case 'mob+': this.addMob(e.m); break;
      case 'mob-': {
        const v = this.mobs.get(e.id);
        if (!v) break;
        this.mobs.delete(e.id);
        if (e.died) {
          this.sfxAt(v.boss ? 'boss_die' : 'enemy_die', v.x, v.y);
          this.burst(this.smoke, v.boss ? 30 : 8, v.x, v.y - v.h / 3, 0xffffff);
          this.burst(this.sparks, v.boss ? 40 : 6, v.x, v.y - v.h / 3, 0xffe0a0);
          v.bar.destroy(); v.shadow.destroy(); v.label?.destroy();
          v.sprite.setTintFill(0xffffff);
          this.tweens.add({ targets: v.sprite, alpha: 0, scaleX: 1.3, scaleY: 0.3, duration: 220, onComplete: () => v.sprite.destroy() });
        } else v.destroy();
        break;
      }
      case 'proj+': {
        const p = e.p;
        const frame = p.spr === 'orb' ? 'orb_0' : p.spr;
        const s = this.add.image(p.x, p.y, 'fx', frame).setDepth(p.y + 40).setRotation(Math.atan2(p.vy, p.vx));
        if (p.spr !== 'arrow' && p.spr !== 'dagger') s.setTint(p.hostile && p.el === 'phys' ? 0xff7060 : ELEMENT_COLOR[p.el]).setBlendMode(p.spr === 'rock' ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);
        if (p.spr === 'orb') s.setScale(Math.max(1, p.r / 5));
        // Vorlauf: Der Server hat das Geschoss schon etwas bewegt, bis die Nachricht ankam.
        this.projs.set(p.id, { p, s, x: p.x, y: p.y, born: nowP, trail: 0 });
        break;
      }
      case 'proj-': {
        const v = this.projs.get(e.id);
        if (!v) break;
        this.projs.delete(e.id);
        if (e.hit) this.burst(this.sparks, 5, v.x, v.y, v.p.el === 'phys' ? 0xffffff : ELEMENT_COLOR[v.p.el]);
        v.s.destroy();
        break;
      }
      case 'zone+': this.addZoneFx(e.z); break;
      case 'zone-': { const v = this.zfx.get(e.id); if (v) { v.g.destroy(); v.rune?.destroy(); this.zfx.delete(e.id); } break; }
      case 'obj': { const v = this.objs.get(e.id); if (v) { v.o.state = e.state; if (e.props) v.o.props = { ...v.o.props, ...e.props }; this.applyObjState(v); } break; }
      case 'obj+': this.addObj(e.o); if (e.o.type === 'chest') { this.burst(this.stars, 16, e.o.x, e.o.y, 0xffe080); } break;
      case 'obj-': this.objs.get(e.id)?.destroy(); this.objs.delete(e.id); break;
      case 'pl+': this.addPlayer(e.p); break;
      case 'pl-': this.players.get(e.id)?.destroy(); this.players.delete(e.id); break;
      case 'boss': {
        const cur = store.state.boss;
        const v = this.mobs.get(e.id);
        store.set({ boss: { id: e.id, name: e.name, phase: e.phase, el: e.el, hp: v?.hp ?? cur?.hp ?? 1, maxHp: v?.info.maxHp ?? cur?.maxHp ?? 1 } });
        if (!cur) { audio.playMusic(this.map.def.boss === 'hohlkoenig' ? 'final_boss' : 'boss'); this.shake(0.02, 400); }
        break;
      }
      case 'bossend': store.set({ boss: null }); audio.playMusic(this.map.def.music as MusicId); if (e.won) { audio.playJingle('victory'); this.cameras.main.flash(500, 255, 250, 220); } break;
    }
  }
  private playFx(e: Extract<GameEvent, { k: 'fx' }>) {
    const tint = e.el ? ELEMENT_COLOR[e.el] : 0xffffff;
    switch (e.n) {
      case 'explosion': this.ring(e.x, e.y, e.r ?? 30, tint, 380); this.burst(this.sparks, 16, e.x, e.y, tint); this.burst(this.smoke, 6, e.x, e.y, 0xffffff); if (Math.hypot(e.x - this.me.x, e.y - this.me.y) < 140) this.shake(0.01, 150); break;
      case 'spin': this.ring(e.x, e.y - 6, e.r ?? 40, tint, 260); for (let k = 0; k < 4; k++) this.slash(e.x, e.y, (k * Math.PI) / 2, (e.r ?? 40) * 0.8, tint); break;
      case 'blink': this.burst(this.smoke, 8, e.x, e.y - 8, tint); this.burst(this.stars, 8, e.x, e.y - 8, tint); break;
      case 'dash': this.burst(this.smoke, 6, e.x, e.y, 0xffffff); this.slash(e.x - Math.cos(e.ang ?? 0) * 20, e.y, e.ang ?? 0, 40, tint, true); break;
      case 'buff': this.burst(this.stars, 12, e.x, e.y - 6, tint); this.ring(e.x, e.y - 6, 24, tint, 400); break;
      case 'heal': this.burst(this.stars, 10, e.x, e.y - 6, 0x90ffa0); break;
      case 'levelup': this.ring(e.x, e.y - 8, 60, 0xffe27a, 700); this.burst(this.stars, 30, e.x, e.y - 8, 0xffe27a); this.sfxAt('levelup', e.x, e.y); break;
      case 'spawn': this.burst(this.smoke, 8, e.x, e.y - 6, tint); break;
      case 'rubble': this.burst(this.smoke, 14, e.x, e.y - 6, 0xc0b8a8); this.shake(0.008); break;
      case 'shard': this.ring(e.x, e.y - 8, 34, 0x70ffe8, 500); this.burst(this.stars, 18, e.x, e.y - 8, 0x70ffe8); break;
      case 'bossdeath': for (let k = 0; k < 5; k++) this.time.delayedCall(k * 140, () => { this.ring(e.x + Phaser.Math.Between(-20, 20), e.y - 20 + Phaser.Math.Between(-20, 20), 70, tint, 600); this.burst(this.sparks, 30, e.x, e.y - 20, tint); }); this.shake(0.03, 800); break;
      case 'beam': {
        const g = this.add.graphics().setDepth(e.y + 500).setBlendMode(Phaser.BlendModes.ADD);
        const len = e.d ?? 100, a = e.ang ?? 0;
        g.lineStyle(10, tint, 0.9).lineBetween(e.x, e.y, e.x + Math.cos(a) * len, e.y + Math.sin(a) * len);
        g.lineStyle(4, 0xffffff, 1).lineBetween(e.x, e.y, e.x + Math.cos(a) * len, e.y + Math.sin(a) * len);
        this.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
        break;
      }
    }
  }

  // ------------------------------------------------------------------ Frame-Update
  private solid = (tx: number, ty: number) => {
    const m = this.map;
    if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return true;
    const i = ty * m.w + tx;
    return m.solid[i] !== 0 || this.blocked.has(i);
  };
  private getStats(): Derived {
    const c = store.state.char!;
    if (this.statsFor !== c) { this.statsFor = c; this.stats = computeStats(c); }
    return this.stats;
  }
  private worldPointer(): { x: number; y: number } {
    const cam = this.cameras.main;
    const rect = this.game.canvas.getBoundingClientRect();
    const sx = ((pointer.x - rect.left) / rect.width) * this.scale.width, sy = ((pointer.y - rect.top) / rect.height) * this.scale.height;
    const p = cam.getWorldPoint(sx, sy);
    return { x: p.x, y: p.y };
  }
  /** Zielrichtung: Maus, rechter Stick oder (Tastatur/Gamepad) automatisch der nächste Gegner in Blickrichtung. */
  private aimInfo(range = 150): { ang: number; tx: number; ty: number } {
    const me = this.me;
    if (store.state.inputMode === 'kbm') {
      const p = this.worldPointer();
      return { ang: Math.atan2(p.y - (me.y - 6), p.x - me.x), tx: p.x, ty: p.y };
    }
    const stick = input.padAim();
    let ang = stick ? Math.atan2(stick.y, stick.x) : this.aim;
    let tx = me.x + Math.cos(ang) * 90, ty = me.y + Math.sin(ang) * 90;
    if (settings.autoAim && !stick) {
      let best: MobView | null = null, bs = 1e9;
      for (const m of this.mobs.values()) {
        const d = Math.hypot(m.x - me.x, m.y - me.y);
        if (d > range || m.flags & FLAG_INVULN) continue;
        let da = Math.abs(Math.atan2(m.y - me.y, m.x - me.x) - ang); if (da > Math.PI) da = Math.PI * 2 - da;
        if (da > 1.3 && d > 50) continue;
        const s = d + da * 60;
        if (s < bs) { bs = s; best = m; }
      }
      if (best) { ang = Math.atan2(best.y - 5 - (me.y - 6), best.x - me.x); tx = best.x; ty = best.y; }
    }
    return { ang, tx, ty };
  }

  update(_t: number, dtMs: number) {
    pollInput(dtMs);
    if (!this.ready) return;
    const now = performance.now();
    const dt = Math.min(0.05, dtMs / 1000);
    const st = store.state;
    live.serverNow = () => performance.now() + (this.timeOffset ?? 0);
    this.updateSelf(now, dt);
    // andere Spieler & Gegner interpolieren
    const rt = now + (this.timeOffset ?? 0) - CFG.net.interpDelayMs;
    for (const v of this.players.values()) { this.interp(v, rt); v.draw(now); }
    for (const v of this.mobs.values()) { this.interp(v, rt); v.draw(now); }
    this.updateProjs(dt, now);
    this.updateZoneFx(now);
    this.updateObjs(now);
    this.updateInteraction(now);
    // animierte Flüssigkeit & Deko
    const lf = Math.floor(now / 230) % 4;
    if (lf !== this.liquidFrame && this.liquid) { this.liquidFrame = lf; this.liquid.setTexture(`liq_${this.map.biome}_${lf}`); }
    if (this.liquid) this.liquid.tilePositionX = Math.sin(now / 4000) * 6;
    for (const a of this.animDecor) a.s.setFrame(`${a.base}_${Math.floor((now + a.off) / 130) % a.n}`);
    this.updateWeather(dt, now);
    this.updateLighting(now);
    // Boss-Anzeige & Minimap-Daten
    if (st.boss && now - this.bossAt > 120) {
      this.bossAt = now;
      const b = this.mobs.get(st.boss.id);
      if (b && (b.hp !== st.boss.hp || b.info.maxHp !== st.boss.maxHp)) store.set({ boss: { ...st.boss, hp: b.hp, maxHp: b.info.maxHp } });
    }
    if (now - this.liveAt > 150) {
      this.liveAt = now;
      live.x = this.me.x; live.y = this.me.y; live.fps = this.game.loop.actualFps;
      live.players = [...this.players.values()].map(p => ({ x: p.x, y: p.y, name: p.info.name, party: this.inMyParty(p.info) }));
      live.mobs = [...this.mobs.values()].filter(m => m.seen && Math.hypot(m.x - this.me.x, m.y - this.me.y) < 420).map(m => ({ x: m.x, y: m.y, boss: m.boss }));
      const c = st.char!;
      live.objs = [...this.objs.values()].filter(v => ['npc', 'exit', 'stone', 'chest', 'shard', 'node', 'board'].includes(v.o.type)).map(v => ({ x: v.o.x, y: v.o.y, type: v.o.type, state: v.o.state, mark: v.o.type === 'npc' ? npcMarker(c, v.o.tag!) : null, label: v.o.props?.label }));
    }
  }

  private interp(v: PlayerView | MobView, rt: number) {
    const b = v.buf;
    if (!b.length) return;
    if (b.length === 1 || rt <= b[0].t) { v.x = b[0].x; v.y = b[0].y; return; }
    const last = b[b.length - 1];
    if (rt >= last.t) { v.x += (last.x - v.x) * 0.5; v.y += (last.y - v.y) * 0.5; return; }
    for (let i = b.length - 2; i >= 0; i--) if (b[i].t <= rt) {
      const a = b[i], c = b[i + 1], k = (rt - a.t) / Math.max(1, c.t - a.t);
      v.x = a.x + (c.x - a.x) * k; v.y = a.y + (c.y - a.y) * k;
      return;
    }
  }

  private updateSelf(now: number, dt: number) {
    const me = this.me, st = store.state, c = st.char!;
    const stats = this.getStats();
    const dead = !!(me.flags & FLAG_DEAD) || !!st.dead;
    const stunned = !!(me.flags & STATUS_BIT.stun);
    const blocked = uiBlocksGame();
    const cls = CLASSES[c.cls];
    let moving = false;
    if (!dead && !stunned) {
      const mv = blocked ? { x: 0, y: 0 } : input.move();
      const ml = Math.hypot(mv.x, mv.y);
      if (ml > 0.1) this.aim = Math.atan2(mv.y, mv.x);
      // Ausweichrolle
      if (!blocked && input.pressed('dodge') && now >= this.dodgeReady && now >= this.rollUntil) {
        this.rollDir = ml > 0.1 ? Math.atan2(mv.y, mv.x) : store.state.inputMode === 'kbm' ? this.aimInfo().ang : this.aim;
        this.rollUntil = now + CFG.player.dodgeDuration * 1000;
        this.dodgeReady = now + stats.dodgeCd * 1000;
        net.send({ t: 'dodge', ang: this.rollDir });
        store.set({ cds: { ...store.state.cds, _dodge: { until: this.dodgeReady, total: stats.dodgeCd } } });
        this.burst(this.smoke, 4, me.x, me.y, 0xffffff);
      }
      let vx = 0, vy = 0;
      let speed = stats.speed * (me.flags & STATUS_BIT.slow ? CFG.combat.slowFactor : 1);
      if (now < this.rollUntil) { speed *= CFG.player.dodgeSpeedMul; vx = Math.cos(this.rollDir) * speed; vy = Math.sin(this.rollDir) * speed; }
      else if (ml > 0.1 && now >= this.localAnimUntil - 120) { vx = mv.x * speed; vy = mv.y * speed; }
      if (vx || vy) {
        const r = moveCircle(this.solid, me.x, me.y, vx * dt, vy * dt, CFG.player.radius);
        moving = Math.hypot(r.x - me.x, r.y - me.y) > 0.01;
        me.x = r.x; me.y = r.y;
        if (now >= this.localAnimUntil) me.facing = now < this.rollUntil ? this.rollDir : Math.atan2(vy, vx);
      }
      if (!blocked) this.handleActions(now, stats, cls);
    } else { input.clearPressed(); }
    // Animation
    if (dead) me.setAnim(Anim.Dead, now);
    else if (now < this.rollUntil) me.setAnim(Anim.Roll, now);
    else if (this.serverAnim === Anim.Cast || (this.serverAnim === Anim.Hurt && now >= this.localAnimUntil)) me.setAnim(this.serverAnim, now);
    else if (now < this.localAnimUntil) me.setAnim(Anim.Attack, now);
    else me.setAnim(moving ? Anim.Move : Anim.Idle, now);
    me.draw(now);
    if (moving && now >= this.stepAt && now >= this.rollUntil) { this.stepAt = now + 300; audio.playSfx(STEP_SFX[this.map.biome], { volume: 0.5 }); }
    // Position melden
    if (now - this.lastSend >= 1000 / CFG.net.moveSendRate) {
      const changed = Math.abs(me.x - this.sentX) > 0.05 || Math.abs(me.y - this.sentY) > 0.05 || moving !== this.sentMoving || Math.abs(me.facing - this.sentF) > 0.05;
      if (changed && !dead) {
        this.lastSend = now; this.sentX = me.x; this.sentY = me.y; this.sentMoving = moving; this.sentF = me.facing;
        net.send({ t: 'm', x: Math.round(me.x * 10) / 10, y: Math.round(me.y * 10) / 10, f: Math.round(me.facing * 100) / 100, e: this.epoch, mv: moving ? 1 : 0 });
      }
    }
  }

  private handleActions(now: number, stats: Derived, cls: (typeof CLASSES)[keyof typeof CLASSES]) {
    const me = this.me, st = store.state, c = st.char!;
    // Angriff (gehalten = Dauerfeuer)
    const wantAtk = input.pressed('attack') || input.held('attack');
    if (wantAtk && now >= this.atkReady && now >= this.rollUntil) {
      const atk = cls.attack;
      const a = this.aimInfo(atk.kind === 'arc' ? 70 : atk.range);
      this.atkReady = now + atk.cooldown * 1000;
      this.combo = now - this.comboAt < (CFG.player.comboWindow + atk.cooldown) * 1000 ? (this.combo + 1) % 3 : 0;
      this.comboAt = now;
      me.facing = a.ang; this.aim = a.ang;
      this.localAnimUntil = now + Math.min(260, atk.cooldown * 1000);
      me.animStart = now; me.anim = Anim.Attack;
      net.send({ t: 'atk', ang: a.ang });
      const el: Element = stats.attackElement;
      const tint = el === 'phys' ? 0xffffff : ELEMENT_COLOR[el];
      if (atk.kind === 'arc') {
        const fin = this.combo === 2;
        this.slash(me.x, me.y, a.ang, atk.range * (fin ? 1.3 : 1), fin ? 0xffe9a0 : tint, cls.weapon === 'dagger' && !fin);
        audio.playSfx(atk.sfx as SfxName, { pitch: fin ? 0.85 : 1 });
      } else audio.playSfx(atk.sfx as SfxName, { volume: 0.8 });
    }
    // Fähigkeiten
    for (let i = 0; i < 4; i++) {
      if (!input.pressed(('skill' + (i + 1)) as any)) continue;
      const id = c.hotbar[i];
      if (!id) continue;
      const sk = SKILLS[id], rank = c.skills[id] ?? 0;
      const cd = st.cds[id];
      if (!sk || rank < 1) continue;
      if (cd && cd.until > now + 60) { audio.playSfx('ui_error', { volume: 0.5 }); continue; }
      if (st.me.mp < skillMp(sk, rank)) { audio.playSfx('ui_error', { volume: 0.5 }); this.floatText(me.x, me.y - 28, 'Zu wenig Mana', '#6fb7ff'); continue; }
      const a = this.aimInfo(220);
      me.facing = a.ang; this.aim = a.ang;
      if (sk.anim !== 'cast') { this.localAnimUntil = now + 280; me.animStart = now; me.anim = Anim.Attack; }
      net.send({ t: 'skill', id, ang: a.ang, tx: Math.round(a.tx), ty: Math.round(a.ty) });
    }
    if (input.pressed('potionHp')) net.send({ t: 'quick', kind: 'hp' });
    if (input.pressed('potionMp')) net.send({ t: 'quick', kind: 'mp' });
  }

  private updateProjs(dt: number, now: number) {
    for (const [id, v] of this.projs) {
      v.x += v.p.vx * dt; v.y += v.p.vy * dt;
      v.s.setPosition(v.x, v.y).setDepth(v.y + 40);
      if (v.p.spr === 'orb') v.s.setFrame('orb_' + (Math.floor(now / 90) % 3));
      if (v.p.spr === 'rock' || v.p.spr === 'spore') v.s.rotation += dt * 8;
      if (now - v.trail > 50 && v.p.spr !== 'arrow' && v.p.spr !== 'dagger') { v.trail = now; this.sparks.setParticleTint(v.p.hostile && v.p.el === 'phys' ? 0xff7060 : ELEMENT_COLOR[v.p.el]); this.sparks.emitParticleAt(v.x, v.y, 1); }
      if (now - v.born > v.p.life * 1000 + 400) { v.s.destroy(); this.projs.delete(id); }
    }
  }
  private updateZoneFx(now: number) {
    for (const v of this.zfx.values()) {
      const z = v.z, g = v.g;
      const k = Phaser.Math.Clamp((now - v.born) / Math.max(1, z.dur * 1000), 0, 1);
      const col = z.hostile ? 0xff3838 : ELEMENT_COLOR[z.el];
      g.clear();
      if (z.kind === 'tele') {
        if (z.shape === 'line') {
          const a = Math.atan2(z.y2! - z.y, z.x2! - z.x), len = Math.hypot(z.x2! - z.x, z.y2! - z.y), w = z.w!;
          const nx = (-Math.sin(a) * w) / 2, ny = (Math.cos(a) * w) / 2;
          const poly = (f: number) => [z.x + nx, z.y + ny, z.x + Math.cos(a) * len * f + nx, z.y + Math.sin(a) * len * f + ny, z.x + Math.cos(a) * len * f - nx, z.y + Math.sin(a) * len * f - ny, z.x - nx, z.y - ny];
          const pts = (arr: number[]) => { const out: Phaser.Types.Math.Vector2Like[] = []; for (let i = 0; i < arr.length; i += 2) out.push({ x: arr[i], y: arr[i + 1] }); return out; };
          g.fillStyle(col, 0.16).fillPoints(pts(poly(1)), true);
          g.fillStyle(col, 0.3).fillPoints(pts(poly(k)), true);
          g.lineStyle(1, col, 0.8).strokePoints(pts(poly(1)), true);
        } else {
          g.fillStyle(col, z.r > 150 ? 0.1 : 0.16).fillCircle(z.x, z.y, z.r);
          g.fillStyle(col, z.r > 150 ? 0.14 : 0.32).fillCircle(z.x, z.y, z.r * k);
          g.lineStyle(1, col, 0.85).strokeCircle(z.x, z.y, z.r);
        }
      } else {
        const pulse = 0.14 + 0.06 * Math.sin(now / 160);
        if (z.hostile) { g.fillStyle(col, pulse + 0.1).fillCircle(z.x, z.y, z.r); g.lineStyle(1, col, 0.8).strokeCircle(z.x, z.y, z.r); }
        else if (z.el === 'light' && !v.rune) { g.fillStyle(0xfff6c0, 0.3).fillCircle(z.x, z.y, z.r); g.lineStyle(2, 0xffffff, 0.9).strokeCircle(z.x, z.y, z.r); }
        else { g.fillStyle(col, pulse).fillCircle(z.x, z.y, z.r); g.lineStyle(1, col, 0.6).strokeCircle(z.x, z.y, z.r); }
        if (v.rune) { v.rune.rotation = now / 900; }
        if (Math.random() < 0.25) { const a = Math.random() * 6.28, d = Math.random() * z.r; this.sparks.setParticleTint(col); this.sparks.emitParticleAt(z.x + Math.cos(a) * d, z.y + Math.sin(a) * d, 1); }
      }
    }
  }
  private updateObjs(now: number) {
    const c = store.state.char!;
    const refreshMarks = this.markerChar !== c;
    this.markerChar = c;
    const sn = (now + (this.timeOffset ?? 0)) / 1000;
    for (const v of this.objs.values()) {
      const o = v.o;
      switch (o.type) {
        case 'npc': {
          const s = v.parts[0] as Phaser.GameObjects.Sprite;
          const d = Math.hypot(this.me.x - o.x, this.me.y - o.y);
          const [row, flip] = d < 60 ? dirOf(Math.atan2(this.me.y - o.y, this.me.x - o.x)) : [0, false];
          s.setFrame(String((row as number) * 16 + (Math.floor((now + o.id * 137) / 560) % 2))).setFlipX(flip as boolean);
          if (refreshMarks) {
            const m = npcMarker(c, o.tag!);
            v.marker!.setVisible(!!m);
            if (m) v.marker!.setFrame(m === 'turnin' ? 'question' : m === 'offer' ? 'exclaim' : 'question_grey');
          }
          if (v.marker!.visible) v.marker!.y = o.y - 46 + Math.sin(now / 250) * 1.5;
          break;
        }
        case 'brazier': if (o.state) v.parts[0].setFrame('brazier_' + (Math.floor(now / 120) % 3)); break;
        case 'stone': if (o.state) v.parts[0].setFrame('quellstein_' + (Math.floor(now / 160) % 4)); break;
        case 'shard': if (!o.state) { v.parts[0].setFrame('shard_' + (Math.floor(now / 140) % 4)); v.parts[0].y = o.y + 4 + Math.sin(now / 300) * 2; } break;
        case 'exit': if (o.props?.look === 'portal') v.parts[0].setFrame('portal_' + (Math.floor(now / 110) % 4)); break;
        case 'spikes': {
          const pr = o.props!;
          const ph = ((sn + pr.offset) % pr.period) / pr.period;
          const f = ph >= 0.6 ? 2 : ph >= 0.42 ? 1 : 0;
          for (const p of v.parts) p.setFrame('spikes_' + f);
          break;
        }
      }
    }
  }
  private updateInteraction(now: number) {
    if (now - this.hoverCheck < 100) { if (input.pressed('interact')) this.doInteract(); return; }
    this.hoverCheck = now;
    const me = this.me;
    let best: ObjView | PlayerView | null = null, bd = CFG.player.interactRadius, prompt: string | null = null, nearStone = false;
    for (const v of this.objs.values()) {
      const o = v.o;
      const d = Math.hypot(o.x - me.x, o.y - me.y);
      if (o.type === 'stone' && d < 60) nearStone = true;
      let text: string | null = null;
      switch (o.type) {
        case 'npc': text = `Mit ${NPCS[o.tag!]?.name ?? '???'} sprechen`; break;
        case 'chest': if (!o.state) text = 'Truhe öffnen'; break;
        case 'door': if (!o.state) text = o.props?.locked && !o.props?.unlocked ? 'Tür aufschließen' : 'Tür öffnen'; break;
        case 'bossdoor': if (!o.state) text = 'Bosstor öffnen'; break;
        case 'lever': text = 'Hebel umlegen'; break;
        case 'brazier': if (!o.state) text = 'Feuerschale entzünden'; break;
        case 'stone': text = o.state ? 'Quellstein: rasten & reisen' : 'Quellstein berühren'; break;
        case 'shard': if (!o.state) text = 'Quellsplitter aufheben'; break;
        case 'node': if (!o.state) text = `${o.props?.name ?? 'Rohstoff'} abbauen`; break;
        case 'sign': text = 'Lesen'; break;
        case 'board': text = 'Auftragsbrett ansehen'; break;
      }
      if (!text) continue;
      const reach = o.type === 'door' || o.type === 'bossdoor' ? d - 12 : d;
      if (reach < bd) { bd = reach; best = v; prompt = text; }
    }
    for (const p of this.players.values()) if (p.flags & FLAG_DEAD) {
      const d = Math.hypot(p.x - me.x, p.y - me.y);
      if (d < bd + 6) { bd = d; best = p; prompt = `${p.info.name} wiederbeleben`; }
    }
    this.target = best;
    const st = store.state;
    if (st.prompt !== prompt || st.nearStone !== nearStone) store.set({ prompt: uiBlocksGame() ? null : prompt, nearStone });
    if (input.pressed('interact')) this.doInteract();
  }
  private doInteract() {
    const t = this.target;
    if (!t || uiBlocksGame()) return;
    if (t instanceof PlayerView) { net.send({ t: 'revive', id: t.info.id }); return; }
    const o = t.o;
    audio.playSfx('ui_click');
    if (o.type === 'npc') { store.set({ dialog: { npc: o.tag! }, panel: null, prompt: null }); return; }
    if (o.type === 'board') { store.set({ dialog: { npc: 'ayla' }, panel: null, prompt: null }); return; }
    if (o.type === 'sign') { store.set({ sign: o.props?.text ?? '', prompt: null }); return; }
    net.send({ t: 'interact', id: o.id });
    if (o.type === 'stone') this.time.delayedCall(250, () => store.set({ panel: 'map', nearStone: true }));
  }

  private updateWeather(dt: number, now: number) {
    const kind = settings.weather ? store.state.weather : 'clear';
    const view = this.cameras.main.worldView;
    if (kind !== this.weatherKind) {
      this.weatherKind = kind;
      for (const w of this.weather) w.s.destroy();
      this.weather = [];
      const W = WEATHER[kind];
      if (W) for (let i = 0; i < W.n; i++) {
        const s = this.add.image(view.x + Math.random() * view.width, view.y + Math.random() * view.height, 'fx', W.frame).setDepth(8000).setTint(W.tint).setAlpha(W.alpha * (0.5 + Math.random() * 0.5));
        if (W.add) s.setBlendMode(Phaser.BlendModes.ADD);
        if (W.frame === 'raindrop') s.setRotation(Math.atan2(W.vy, W.vx) - Math.PI / 2);
        const k = 0.7 + Math.random() * 0.6;
        this.weather.push({ s, vx: W.vx * k, vy: W.vy * k, ph: Math.random() * 6.28 });
      }
    }
    const W = WEATHER[kind];
    if (!W) return;
    const m = 12;
    for (const w of this.weather) {
      let x = w.s.x + (w.vx + (W.sway ? Math.sin(now / 700 + w.ph) * W.sway : 0)) * dt, y = w.s.y + w.vy * dt;
      if (x < view.x - m) x += view.width + m * 2; else if (x > view.right + m) x -= view.width + m * 2;
      if (y < view.y - m) y += view.height + m * 2; else if (y > view.bottom + m) y -= view.height + m * 2;
      w.s.setPosition(x, y);
    }
  }

  private updateLighting(now: number) {
    const def = this.map.def, cam = this.cameras.main, view = cam.worldView;
    const n = Math.cos(store.state.tod * Math.PI * 2);
    const night = def.indoor ? 0 : Phaser.Math.Clamp((n + 0.2) / 0.8, 0, 1);
    let alpha = settings.lighting ? Math.min(0.82, def.dark + night * 0.62) : 0;
    if (store.state.weather === 'blizzard' || store.state.weather === 'rain') alpha = Math.max(alpha, settings.lighting ? 0.14 : 0);
    if (alpha < 0.03) { this.darkRT?.setVisible(false); return; }
    const w = Math.ceil(view.width) + 4, h = Math.ceil(view.height) + 4;
    if (!this.darkRT) this.darkRT = this.add.renderTexture(0, 0, w, h).setOrigin(0).setDepth(9000);
    const rt = this.darkRT;
    rt.setVisible(true).setPosition(Math.floor(view.x) - 2, Math.floor(view.y) - 2);
    const dusk = def.indoor ? 0 : Phaser.Math.Clamp(1 - Math.abs(n + 0.05) / 0.35, 0, 1);
    const col = def.indoor ? (def.biome === 'glut' ? 0x1a0805 : def.biome === 'schatten' ? 0x0c0418 : 0x05070f) : Phaser.Display.Color.GetColor(Math.round(10 + 70 * dusk), Math.round(14 + 20 * dusk), Math.round(40 - 10 * dusk));
    rt.clear();
    rt.fill(col, alpha);
    const ox = rt.x, oy = rt.y;
    const light = (x: number, y: number, r: number) => {
      if (x < view.x - r || x > view.right + r || y < view.y - r || y > view.bottom + r) return;
      this.stamp.setPosition(x - ox, y - oy).setScale(r / 60);
      rt.erase(this.stamp);
    };
    const flick = 1 + Math.sin(now / 90) * 0.03;
    light(this.me.x, this.me.y - 8, 78);
    for (const p of this.players.values()) light(p.x, p.y - 8, 70);
    for (const l of this.staticLights) light(l.x, l.y, l.r * flick);
    for (const v of this.objs.values()) if (v.light) light(v.o.x, v.o.y - 8, v.light[0] * flick);
    for (const v of this.projs.values()) if (v.p.spr !== 'arrow' && v.p.spr !== 'dagger' && v.p.spr !== 'rock') light(v.x, v.y, 26);
    for (const v of this.zfx.values()) if (v.z.kind === 'zone' || v.z.r < 150) light(v.z.x, v.z.y, Math.min(90, v.z.r + 14));
    for (const m of this.mobs.values()) if (m.boss) light(m.x, m.y - 20, 110);
  }
}
