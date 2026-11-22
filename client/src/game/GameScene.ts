/**
 * Die Spielszene: stellt die Welt dar, sagt die eigene Bewegung voraus und interpoliert alles andere
 * aus den Server-Snapshots. Spielentscheidungen trifft ausschließlich der Server.
 *
 * Ebenen (depth): -20 Flüssigkeit · -10 Boden · 2–3 Bodenmarkierungen/Decals · 4 Schlagschatten ·
 * y (Weltkoordinate) alle stehenden Sprites · 6000 Partikel · 8200–8400 Lichtstrahlen, Wolkenschatten, Nebel, Wetter ·
 * 9000 Lichtkarte (multiplizierend) · 9400+ Beschriftungen und Schadenszahlen.
 */
import Phaser from 'phaser';
import { moveCircle } from '../../../shared/src/collision';
import { CFG, ELEMENT_COLOR } from '../../../shared/src/config';
import { CLASSES } from '../../../shared/src/data/classes';
import { NPCS } from '../../../shared/src/data/npcs';
import { npcMarker } from '../../../shared/src/data/quests';
import { SKILLS, skillMp } from '../../../shared/src/data/skills';
import { ZONES } from '../../../shared/src/data/zones';
import { getMap, type GameMap } from '../../../shared/src/maps/mapgen';
import { T, TILE } from '../../../shared/src/maps/tiles';
import { computeStats } from '../../../shared/src/stats';
import { Anim, FLAG_DEAD, FLAG_INVULN, STATUS_BIT } from '../../../shared/src/types';
import type { CharData, Derived, DropInfo, Element, GameEvent, MobInfo, ObjInfo, PlayerInfo, ProjInfo, ServerMsg, ZoneFx, ZoneInit } from '../../../shared/src/types';
import { audio } from '../audio';
import type { AmbienceId, MusicId, SfxName } from '../audio/spec';
import { paintGround } from '../gfx/runtime';
import type { GfxBundle } from '../gfx/spec';
import { net } from '../net/net';
import { bus } from '../state/bus';
import { live } from '../state/live';
import { settings } from '../state/settings';
import { store, uiBlocksGame } from '../state/store';
import { Ambient } from './ambient';
import { CHAR_ANIMS, animDuration, dirOf } from './anim';
import { Fx } from './fxlib';
import { input, pointer, pollInput } from './input';
import { Lighting, daylight, lerpC, mulC, skyColor, type LightSrc } from './lighting';
import { MobView, ObjView, PlayerView, applyShadow, makeShadow, type ShadowCfg, type ViewCtx } from './views';

type Snap = Extract<ServerMsg, { t: 's' }>;

const FONT = '"Trebuchet MS", Verdana, sans-serif';
/** flach auf dem Boden liegende Deko (unter Figuren, ohne Schatten) */
const FLAT = /^(clover|pebbles|leafpile|lilypad|lily_flower|bones|skull|d_rug|d_crack|d_moss|d_puddle|d_grate|d_bones|plate_|cave_moss|puddle_cave|crystal_shards|mine_rails|ash_pile|magma_crack|snowdrift|ice_crack|mosaic|urn_broken|lost_toy)/;
/** kleine oder massenhaft vorkommende Deko ohne eigenen Schlagschatten */
const NO_SHADOW = /^(wheat|reeds|cattail|tallgrass|fern|flowers|mushrooms|glowshroom|wall_torch|d_banner|d_chains|d_cobweb|d_roots|d_candles|d_mushroom|d_skull|fence_h|floating_shard|ember_vent|fire_geyser|floating_rune|ghost_flower|tendril|memory_frame|glowshroom_big|prayer_flags)/;
/** Flammen flackern schnell, alles andere wiegt sich langsam */
const FLICKER = /^(campfire|brazier|torch|wall_torch|lamp|forge|d_candles|ember_vent|fire_geyser|nomad_brazier|lantern|last_light|brazier_blue)/;
/** [Radius, Farbe, Stärke, Flackern] */
const LIGHTS: Record<string, [number, number, number, number]> = {
  campfire: [100, 0xffb060, 1, 0.07], brazier: [92, 0xffac58, 1, 0.07], lamp: [84, 0xffd89a, 0.9, 0.03], torch: [84, 0xffb870, 0.95, 0.07], wall_torch: [84, 0xffb870, 0.95, 0.07],
  forge: [72, 0xff9040, 0.9, 0.06], d_candles: [48, 0xffd890, 0.7, 0.06], crystal_blue: [52, 0x60c8ff, 0.7, 0], crystal_pink: [52, 0xff80d8, 0.7, 0], crystal_big: [76, 0x80e8ff, 0.85, 0],
  glowshroom: [42, 0x60ffd0, 0.6, 0], d_mushroom_glow: [36, 0x70ffc0, 0.5, 0], ember_vent: [58, 0xff7030, 0.8, 0.06], void_crystal: [54, 0xb070ff, 0.7, 0], rune_stone: [54, 0xffe090, 0.7, 0],
  floating_shard: [42, 0xc090ff, 0.6, 0], lava_rock: [36, 0xff6020, 0.5, 0.03], crystal_teal: [46, 0x60ffe0, 0.65, 0], glowshroom_big: [50, 0x60ffd0, 0.7, 0], cave_moss: [26, 0x60ffc0, 0.35, 0],
  lantern_post: [84, 0xffd08a, 0.95, 0.04], nomad_brazier: [96, 0xffa850, 1, 0.07], fire_geyser: [60, 0xff8030, 0.8, 0.08], magma_crack: [30, 0xff6a20, 0.5, 0.03], forge_ruin: [50, 0xff8040, 0.5, 0.04],
  ice_crystal: [40, 0xa0e8ff, 0.5, 0], lantern_frost: [84, 0xffd8a0, 0.95, 0.04], cabin: [70, 0xffcf90, 0.6, 0.02], brazier_blue: [84, 0x70b0ff, 0.95, 0.06], obelisk: [50, 0xffe090, 0.6, 0], floating_rune: [34, 0x80c8ff, 0.6, 0],
  void_rift: [60, 0xc070ff, 0.8, 0.04], ghost_flower: [24, 0xd8c8ff, 0.4, 0], last_light: [120, 0xfff0c0, 1, 0.03], eye_stalk: [0, 0, 0, 0], house_a: [60, 0xffd8a0, 0.5, 0], house_b: [60, 0xffd8a0, 0.5, 0], house_c: [60, 0xffd8a0, 0.5, 0],
};
const INDOOR: Record<string, [number, number]> = { // [Oberwelt (falls überdacht), Dungeon]
  gruenwald: [0xffffff, 0x6c7a62], kristall: [0x5e6eaa, 0x566296], glut: [0xffffff, 0x82523f], frost: [0xffffff, 0x60749a], ruinen: [0xffffff, 0x766c56], schatten: [0x5c4c90, 0x604f92],
};
const STEP_SFX: Record<string, SfxName> = { gruenwald: 'step_grass', kristall: 'step_stone', glut: 'step_ash', frost: 'step_snow', ruinen: 'step_stone', schatten: 'step_stone' };
const PORTAL_TINT: Record<string, number> = { gruenwald: 0x80ff90, kristall: 0x70d0ff, glut: 0xff8040, frost: 0xc0f0ff, ruinen: 0xffe080, schatten: 0xb060ff };
const hexStr = (c: number) => '#' + c.toString(16).padStart(6, '0');
const elTint = (el: Element) => (el === 'phys' ? 0xffffff : ELEMENT_COLOR[el]);

export class GameScene extends Phaser.Scene {
  gfx!: GfxBundle;
  fx!: Fx;
  private ctx!: ViewCtx;
  private init0!: ZoneInit;
  private map!: GameMap;
  private ready = false;
  private zoomLevel = 2;
  // Welt
  private liquid?: Phaser.GameObjects.TileSprite;
  private liquidFrame = -1;
  private animDecor: { s: Phaser.GameObjects.Image; base: string; n: number; period: number; off: number; last: number }[] = [];
  private decorShadows: { s: Phaser.GameObjects.Image; x: number; y: number; indoor: ShadowCfg }[] = [];
  private fadeDecor: { s: Phaser.GameObjects.Image; hw: number; h: number }[] = [];
  private staticLights: LightSrc[] = [];
  private flashes: (LightSrc & { until: number; dur: number; i0: number })[] = [];
  private smokeSpots: { x: number; y: number }[] = [];
  private groundKeys: string[] = [];
  private blocked = new Set<number>();
  private objTex!: Phaser.Textures.Texture;
  private frameCounts = new Map<string, number>();
  // Entitäten
  private me!: PlayerView;
  private players = new Map<number, PlayerView>();
  private mobs = new Map<number, MobView>();
  private dying: MobView[] = [];
  private objs = new Map<number, ObjView>();
  private drops = new Map<number, { d: DropInfo; s: Phaser.GameObjects.Image; label?: Phaser.GameObjects.Text }>();
  private projs = new Map<number, { p: ProjInfo; s: Phaser.GameObjects.Image; x: number; y: number; born: number; trail: number; anim: string; n: number; tint: number }>();
  private zfx = new Map<number, { z: ZoneFx; g: Phaser.GameObjects.Graphics; born: number; rune?: Phaser.GameObjects.Image }>();
  // lokale Simulation
  private epoch = 0;
  private stats!: Derived;
  private statsFor: CharData | null = null;
  private rollUntil = 0; private rollDir = 0; private dodgeReady = 0; private atkReady = 0; private combo = 0; private comboAt = 0;
  private lastSend = 0; private sentMoving = false; private sentX = 0; private sentY = 0; private sentF = 0;
  private moveLockUntil = 0; private stepAt = 0; private dustAt = 0; private stepDist = 0; private stepSide = 1;
  private timeOffset: number | null = null;
  private target: ObjView | PlayerView | null = null;
  private hoverCheck = 0;
  private serverAnim: Anim = Anim.Idle;
  private aim = Math.PI / 2;
  // Darstellung
  private lighting!: Lighting;
  private ambient!: Ambient;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private smoke!: Phaser.GameObjects.Particles.ParticleEmitter;
  private stars!: Phaser.GameObjects.Particles.ParticleEmitter;
  private animClock = 0; private hitStopUntil = 0;
  private sun: ShadowCfg = { rot: -0.5, len: 0.5, alpha: 0 };
  private sunKey = '';
  private liveAt = 0; private bossAt = 0; private smokeAt = 0; private markerChar: CharData | null = null;

  constructor() { super('game'); }

  init(data: { init: ZoneInit; gfx: GfxBundle }) { this.init0 = data.init; this.gfx = data.gfx; this.ready = false; }

  text(x: number, y: number, s: string, color: string, size = 8) {
    return this.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', color, stroke: '#10131c', strokeThickness: 2, resolution: Math.max(2, this.zoomLevel) }).setDepth(9400);
  }

  create() {
    this.players.clear(); this.mobs.clear(); this.objs.clear(); this.drops.clear(); this.projs.clear(); this.zfx.clear();
    this.animDecor = []; this.decorShadows = []; this.fadeDecor = []; this.staticLights = []; this.flashes = []; this.smokeSpots = []; this.dying = [];
    this.blocked.clear(); this.frameCounts.clear(); this.target = null; this.timeOffset = null; this.markerChar = null; this.sunKey = ''; this.liquidFrame = -1;
    this.objTex = this.textures.get('obj');
    this.fx = new Fx(this);
    this.lighting = new Lighting(this);
    this.ctx = { scene: this, gfx: this.gfx, fx: this.fx, text: (x, y, s, c, sz) => this.text(x, y, s, c, sz), shadowAt: (x, y) => this.shadowAt(x, y), clock: () => this.animClock };
    this.applyZoom();
    this.scale.on('resize', this.applyZoom, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.applyZoom, this));
    this.buildWorld().catch(e => console.error('Zone konnte nicht aufgebaut werden', e));
  }

  /** Ganzzahliger Zoom, sodass etwa 640×360 Weltpixel sichtbar sind (keine verzerrten Pixel). */
  private applyZoom = () => {
    const h = this.scale.height, w = this.scale.width;
    this.zoomLevel = Phaser.Math.Clamp(Math.round(Math.min(h / 360, w / 600)), 2, 6);
    this.cameras.main.setZoom(this.zoomLevel);
    this.lighting?.reset();
  };

  /** Löst einen Deko-Namen in einen Atlas-Frame auf (animierte Varianten `_0..n` haben Vorrang). */
  private resolveFrame(f: string): { frame: string; n: number } | null {
    if (this.objTex.has(f + '_0')) return { frame: f + '_0', n: this.countFrames(f) };
    if (this.objTex.has(f)) return { frame: f, n: 0 };
    return null;
  }
  private countFrames(name: string): number {
    let n = this.frameCounts.get(name);
    if (n === undefined) { n = 0; while (this.objTex.has(`${name}_${n}`)) n++; this.frameCounts.set(name, n); }
    return n;
  }

  private async buildWorld() {
    const i = this.init0;
    const map = (this.map = getMap(i.zone));
    const def = map.def;
    const frame = () => new Promise<void>(r => requestAnimationFrame(() => r()));
    for (const k of this.groundKeys) if (this.textures.exists(k)) this.textures.remove(k);
    this.groundKeys = [];
    const W = map.w * TILE, H = map.h * TILE;
    this.cameras.main.setBounds(0, 0, W, H).setBackgroundColor(0x07080d).setRoundPixels(true);
    this.liquid = this.add.tileSprite(0, 0, W, H, `liq_${map.biome}_0`).setOrigin(0).setDepth(-20);
    // Boden in Kacheln von 32x32 Feldern malen
    const pm = { w: map.w, h: map.h, tiles: map.tiles, biome: map.biome, dungeon: map.dungeon, seed: map.seed, rooms: map.rooms };
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
    const rayAnchors: { x: number; y: number }[] = [];
    let bigCount = 0;
    for (const d of map.decor) {
      const r = this.resolveFrame(d.f);
      if (!r) continue;
      const flat = FLAT.test(d.f);
      // flache Decals mit Nummer sind Varianten, keine Animation
      if (flat && r.n > 1) { r.frame = `${d.f}_${(Math.floor(d.x) * 7 + Math.floor(d.y) * 13) % r.n}`; r.n = 0; }
      const s = this.add.image(d.x, d.y, 'obj', r.frame).setOrigin(0.5, 1).setDepth(flat ? 3 : d.y);
      const fh = s.height, fw = s.width;
      const flick = FLICKER.test(d.f);
      if (r.n > 1) this.animDecor.push({ s, base: d.f, n: r.n, period: flick ? 110 : 300, off: flick ? (d.x * 7 + d.y * 13) % 440 : d.x * 5 + d.y * 3, last: 0 });
      if (!flat && fh >= 14 && !NO_SHADOW.test(d.f)) this.decorShadows.push({ s: makeShadow(this, 'obj', r.frame, 1), x: d.x, y: d.y, indoor: { rot: 0, len: 0, alpha: 0 } });
      if (fh >= 60 && !d.f.startsWith('house') && d.f !== 'cabin') {
        this.fadeDecor.push({ s, hw: fw * 0.42, h: fh });
        if (d.f.startsWith('tree') && bigCount++ % 5 === 0) rayAnchors.push({ x: d.x, y: d.y });
      }
      if (d.f === 'house_a' || d.f === 'house_c' || d.f === 'cabin') this.smokeSpots.push({ x: d.x + 18, y: d.y - fh + 8 });
      const L = LIGHTS[d.f];
      if (L && L[0] > 0) {
        const ly = d.y - Math.min(fh * 0.6, 22);
        this.staticLights.push({ x: d.x, y: ly, r: L[0], color: L[1], i: L[2], flicker: L[3] });
        this.add.image(d.x, ly, 'fx', 'glow').setScale(L[0] / 110).setTint(L[1]).setAlpha(0.2).setBlendMode(Phaser.BlendModes.ADD).setDepth(d.y + 1);
      }
    }
    // glühende Flüssigkeiten (Lava, Leere) leuchten
    if (map.biome === 'glut' || map.biome === 'schatten') {
      const col = map.biome === 'glut' ? 0xff7a30 : 0x9a60ff;
      for (let y = 1; y < map.h; y += 3) for (let x = 1; x < map.w; x += 3) if (map.tiles[y * map.w + x] === T.LIQUID) this.staticLights.push({ x: x * TILE + 8, y: y * TILE + 8, r: 70, color: col, i: map.biome === 'glut' ? 0.55 : 0.35, flicker: 0.03 });
    }
    await frame();
    // Schatten in Innenräumen hängen von festen Lichtquellen ab → einmalig berechnen
    for (const ds of this.decorShadows) ds.indoor = this.lightShadow(ds.x, ds.y);
    const fxTex = this.textures.get('fx');
    const pick = (...names: string[]) => names.find(f => fxTex.has(f)) ?? 'px';
    this.sparks = this.add.particles(0, 0, 'fx', { frame: pick('spark'), lifespan: { min: 220, max: 520 }, speed: { min: 20, max: 95 }, scale: { start: 1, end: 0.3 }, alpha: { start: 1, end: 0 }, emitting: false, blendMode: 'ADD' }).setDepth(9100);
    this.smoke = this.add.particles(0, 0, 'fx', { frame: [pick('smoke_1', 'smoke_0'), pick('smoke_2', 'smoke_0'), pick('smoke_3', 'smoke_0')], lifespan: { min: 350, max: 700 }, speed: { min: 6, max: 26 }, scale: { start: 0.6, end: 1.1 }, alpha: { start: 0.75, end: 0 }, emitting: false }).setDepth(6000);
    this.stars = this.add.particles(0, 0, 'fx', { frame: pick('star'), lifespan: { min: 400, max: 800 }, speedY: { min: -52, max: -15 }, speedX: { min: -18, max: 18 }, scale: { start: 1, end: 0.3 }, alpha: { start: 1, end: 0 }, emitting: false, blendMode: 'ADD' }).setDepth(9100);
    this.ambient = new Ambient(this, map, this.fx, rayAnchors);
    // Entitäten
    const st = store.state;
    this.me = new PlayerView(this.ctx, { id: i.you, name: st.char!.name, cls: st.char!.cls, level: st.char!.level, party: 0 }, true);
    this.me.x = i.x; this.me.y = i.y; this.epoch = i.epoch;
    for (const p of i.players) this.addPlayer(p);
    for (const m of i.mobs) this.addMob(m);
    for (const o of i.objs) this.addObj(o);
    for (const d of i.drops) this.addDrop(d);
    for (const z of i.zones) this.addZoneFx(z);
    this.cameras.main.startFollow(this.me.sprite, true, 0.14, 0.14, 0, 10);
    this.cameras.main.centerOn(i.x, i.y);
    try { if (this.game.renderer.type === Phaser.WEBGL) { this.cameras.main.postFX.clear(); this.cameras.main.postFX.addVignette(0.5, 0.5, 0.92, def.indoor ? 0.42 : 0.26); } } catch { /* Canvas-Renderer: ohne Vignette */ }
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

  // ------------------------------------------------------------------ Licht & Schatten
  private isDay(): number { return this.map.def.indoor ? 0 : daylight(store.state.tod); }
  private ambientColor(): number {
    if (!settings.lighting) return 0xffffff;
    const def = this.map.def, w = store.state.weather;
    if (def.indoor) return INDOOR[def.biome][this.map.dungeon ? 1 : 0];
    let c = skyColor(store.state.tod);
    if (def.dark > 0) c = mulC(c, lerpC(0xffffff, def.biome === 'glut' ? 0xd0a090 : 0xc8c8d8, Math.min(1, def.dark * 4)));
    if (w === 'rain' || w === 'blizzard') c = mulC(c, 0xc4ccdc);
    return c;
  }
  /** Schatten durch die nächste feste Lichtquelle (Innenräume, Nacht) */
  private lightShadow(x: number, y: number): ShadowCfg {
    let best: LightSrc | null = null, bd = 150;
    for (const l of this.staticLights) {
      if (l.flicker === 0.03 && l.r === 70) continue; // Flächenlicht von Lava/Leere wirft keinen gerichteten Schatten
      const d = Math.hypot(l.x - x, l.y + 8 - y);
      if (d < bd && d > 6) { bd = d; best = l; }
    }
    if (!best) return { rot: 0, len: 0, alpha: 0 };
    return { rot: Math.atan2(-(x - best.x), y - (best.y + 8)), len: 0.5 + bd / 300, alpha: 0.3 * (1 - bd / 150) };
  }
  private shadowAt(x: number, y: number): ShadowCfg {
    if (this.sun.alpha > 0.04) return this.sun;
    return this.lightShadow(x, y);
  }
  private updateSun() {
    const def = this.map.def, tod = store.state.tod;
    const day = settings.lighting ? this.isDay() : def.indoor ? 0 : 1;
    const p = Phaser.Math.Clamp((tod - 0.25) / 0.5, 0, 1);
    const bad = store.state.weather === 'rain' || store.state.weather === 'blizzard';
    this.sun = def.indoor ? { rot: 0, len: 0, alpha: 0 } : { rot: -0.2 - 0.75 * p, len: 0.4 + 0.42 * Math.abs(2 * p - 1) + 0.1 * p, alpha: 0.3 * day * (bad ? 0.45 : 1) };
    const key = `${this.sun.rot.toFixed(2)}|${this.sun.len.toFixed(2)}|${this.sun.alpha.toFixed(2)}`;
    if (key === this.sunKey) return;
    this.sunKey = key;
    const sunny = this.sun.alpha > 0.04;
    for (const d of this.decorShadows) applyShadow(d.s, d.x, d.y, sunny ? this.sun : d.indoor);
  }
  private flash(x: number, y: number, r: number, color: number, i = 1, dur = 260) { this.flashes.push({ x, y, r, color, i, i0: i, until: performance.now() + dur, dur }); }
  private collectLights(now: number): LightSrc[] {
    const out: LightSrc[] = this.staticLights.slice();
    const dim = this.map.def.indoor || this.isDay() < 0.6;
    if (dim) { out.push({ x: this.me.x, y: this.me.y - 10, r: 92, color: 0xffeccc, i: 0.85 }); for (const p of this.players.values()) out.push({ x: p.x, y: p.y - 10, r: 86, color: 0xffeccc, i: 0.8 }); }
    for (const v of this.objs.values()) if (v.light) out.push({ x: v.o.x, y: v.o.y - 10, r: v.light[0], color: v.light[1], i: v.light[2], flicker: 0.05 });
    for (const v of this.projs.values()) if (v.p.spr !== 'arrow' && v.p.spr !== 'dagger' && v.p.spr !== 'rock') out.push({ x: v.x, y: v.y, r: 34, color: v.tint, i: 0.8 });
    for (const v of this.zfx.values()) if (v.z.r < 150 && (v.z.kind === 'zone' || !v.z.hostile)) out.push({ x: v.z.x, y: v.z.y, r: Math.min(96, v.z.r + 20), color: ELEMENT_COLOR[v.z.el], i: 0.6 });
    for (const m of this.mobs.values()) if (m.boss) out.push({ x: m.x, y: m.y - 24, r: 130, color: lerpC(ELEMENT_COLOR[store.state.boss?.el ?? 'phys'], 0xffffff, 0.5), i: 0.75 });
    for (let k = this.flashes.length - 1; k >= 0; k--) {
      const f = this.flashes[k];
      if (now >= f.until) { this.flashes.splice(k, 1); continue; }
      f.i = f.i0 * ((f.until - now) / f.dur);
      out.push(f);
    }
    return out;
  }

  // ------------------------------------------------------------------ Entitäten anlegen
  private addPlayer(p: PlayerInfo) {
    if (p.id === this.me.info.id) { this.me.info = p; return; }
    const old = this.players.get(p.id);
    if (old) { old.info = p; old.label?.setText(p.name).setColor(this.inMyParty(p) ? '#9dffb0' : '#e8f4ff'); return; }
    const v = new PlayerView(this.ctx, p, false);
    v.label?.setColor(this.inMyParty(p) ? '#9dffb0' : '#e8f4ff');
    v.x = -999; v.y = -999;
    this.players.set(p.id, v);
  }
  private inMyParty(p: PlayerInfo) { return p.party !== 0 && store.state.party.some(m => m.id === p.id); }
  private addMob(m: MobInfo) {
    this.mobs.get(m.id)?.destroy();
    this.mobs.set(m.id, new MobView(this.ctx, m));
  }
  private cellXY(c: number): [number, number] { return [(c % this.map.w) * TILE + 8, Math.floor(c / this.map.w) * TILE + 8]; }
  private addObj(o: ObjInfo) {
    this.objs.get(o.id)?.destroy();
    const v = new ObjView(o);
    this.objs.set(o.id, v);
    const img = (x: number, y: number, f: string, depth?: number, shadow = true) => {
      const s = this.add.image(x, y, 'obj', f).setOrigin(0.5, 1).setDepth(depth ?? y);
      v.parts.push(s);
      if (shadow && depth === undefined && s.height >= 14) { const sh = makeShadow(this, 'obj', f, 1); v.shadows.push(sh); sh.setData('x', x).setData('y', y); }
      return s;
    };
    const pr = o.props ?? {};
    switch (o.type) {
      case 'npc': {
        const def = NPCS[o.tag!];
        const key = 'npc_' + (def?.look ?? 'wache');
        const s = this.add.sprite(o.x, o.y + 6, key, '0').setOrigin(0.5, 37 / 40).setDepth(o.y);
        const sh = makeShadow(this, key, '0', 37 / 40); sh.setData('x', o.x).setData('y', o.y + 6);
        v.shadows.push(sh);
        v.parts.push(s, this.add.image(o.x, o.y + 6, 'fx', 'shadow').setDepth(4).setAlpha(0.45));
        v.label = this.text(o.x, o.y - 30, def?.name ?? '', '#ffe9a8').setOrigin(0.5, 1);
        v.marker = this.add.image(o.x, o.y - 50, 'fx', 'exclaim').setDepth(9401).setVisible(false);
        break;
      }
      case 'chest': img(o.x, o.y + 7, 'chest_wood_closed'); break;
      case 'door': case 'bossdoor': case 'boulder': {
        const cells: number[] = pr.cells ?? [];
        if (o.type === 'bossdoor') img(pr.orient === 'v' ? o.x - 8 : o.x, o.y + 8, 'door_boss', undefined, false);
        else for (const c of cells) { const [x, y] = this.cellXY(c); img(x, y + 8, o.type === 'boulder' ? 'boulder_wall' : 'door_closed', undefined, o.type === 'boulder'); }
        break;
      }
      case 'lever': img(o.x, o.y + 7, 'lever_off'); break;
      case 'plate': img(o.x, o.y + 8, 'plate_up', 3); break;
      case 'brazier': img(o.x, o.y + 7, 'brazier_unlit'); v.glow = this.add.image(o.x, o.y - 8, 'fx', 'glow').setScale(0.8).setTint(0xffa040).setAlpha(0.25).setBlendMode(Phaser.BlendModes.ADD).setDepth(o.y + 1).setVisible(false); break;
      case 'stone': img(o.x, o.y + 7, 'quellstein_off'); v.glow = this.add.image(o.x, o.y - 16, 'fx', 'glow').setScale(0.9).setTint(0x60ffe0).setAlpha(0.3).setBlendMode(Phaser.BlendModes.ADD).setDepth(o.y + 1).setVisible(false); break;
      case 'exit': {
        const look = pr.look;
        const tint = PORTAL_TINT[ZONES[pr.to]?.biome ?? 'schatten'];
        if (look === 'cave') img(o.x, o.y + 12, 'cave_entrance', o.y - 4);
        else if (look === 'stairs_down') img(o.x, o.y + 12, 'stairs_down', 4);
        else if (look === 'stairs_up') img(o.x, o.y + 12, 'stairs_up', 4);
        else if (look === 'portal') { img(o.x, o.y + 10, 'portal_0', undefined, false).setTint(tint); v.light = [90, tint, 0.9]; v.glow = this.add.image(o.x, o.y - 14, 'fx', 'glow').setTint(tint).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD).setDepth(o.y + 1); }
        const arrow = look === 'edge' ? ({ n: '▲ ', s: '▼ ', e: '', w: '◀ ' } as any)[pr.dir] + pr.label + (pr.dir === 'e' ? ' ▶' : '') : pr.label;
        let lx = o.x, ly = o.y - (look === 'edge' ? 2 : look === 'portal' ? 52 : 40);
        if (look === 'edge') { if (pr.dir === 'n') ly = o.y + 22; if (pr.dir === 's') ly = o.y - 18; if (pr.dir === 'e') lx = o.x - 30; if (pr.dir === 'w') lx = o.x + 30; }
        v.label = this.text(lx, ly, arrow ?? '', '#bfe9ff').setOrigin(0.5, 1);
        break;
      }
      case 'spikes': for (const c of (pr.cells ?? []) as number[]) { const [x, y] = this.cellXY(c); img(x, y + 8, 'spikes_0', 3); } break;
      case 'turret': img(o.x, o.y + 7, 'turret').setFlipX(Math.cos(pr.dir) < 0); break;
      case 'node': img(o.x, o.y + 7, 'node_' + pr.kind); break;
      case 'shard': img(o.x, o.y + 4, 'shard_0', undefined, false); v.glow = this.add.image(o.x, o.y - 8, 'fx', 'glow').setScale(0.5).setTint(0x70ffe8).setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD).setDepth(o.y + 1); v.light = [46, 0x70ffe8, 0.7]; break;
      case 'sign': img(o.x, o.y + 7, 'signpost'); break;
    }
    this.applyObjState(v, true);
  }
  private applyObjState(v: ObjView, initial = false) {
    const o = v.o, pr = o.props ?? {}, s0 = v.parts[0];
    const setCells = (on: boolean) => { for (const c of (pr.cells ?? []) as number[]) { if (on) this.blocked.add(c); else this.blocked.delete(c); } };
    switch (o.type) {
      case 'chest': {
        const tier = pr.tier ?? 'wood';
        if (o.state && !initial && this.objTex.has(`chest_${tier}_mid`)) {
          s0.setFrame(`chest_${tier}_mid`);
          this.time.delayedCall(90, () => { if (s0.active) s0.setFrame(`chest_${tier}_open`); });
          this.burst(this.stars, 10, o.x, o.y - 6, 0xffe080); this.flash(o.x, o.y - 6, 60, 0xffe090, 0.8, 400);
        } else s0.setFrame(`chest_${tier}_${o.state ? 'open' : 'closed'}`);
        if (pr.sealed && !o.state) s0.setTint(0xc8a0ff); else s0.clearTint();
        break;
      }
      case 'door': setCells(o.state === 0); for (const p of v.parts) p.setFrame(o.state ? 'door_open' : pr.locked && !pr.unlocked ? 'door_locked' : 'door_closed').setDepth(o.state ? 3 : p.y); break;
      case 'bossdoor': setCells(o.state === 0); s0.setVisible(o.state === 0); break;
      case 'boulder': setCells(o.state === 0); for (const p of v.parts) p.setVisible(o.state === 0); for (const s of v.shadows) s.setVisible(o.state === 0).setData('off', o.state !== 0); break;
      case 'lever':
        if (!initial && this.objTex.has('lever_mid')) { s0.setFrame('lever_mid'); this.time.delayedCall(70, () => { if (s0.active) s0.setFrame(o.state ? 'lever_on' : 'lever_off'); }); }
        else s0.setFrame(o.state ? 'lever_on' : 'lever_off');
        break;
      case 'plate': s0.setFrame(o.state ? 'plate_down' : 'plate_up'); break;
      case 'brazier': v.light = o.state ? [92, 0xffac58, 1] : null; v.glow?.setVisible(!!o.state); if (!o.state) s0.setFrame('brazier_unlit'); break;
      case 'stone': v.light = o.state ? [80, 0x70ffe8, 0.85] : null; v.glow?.setVisible(!!o.state); if (!o.state) s0.setFrame('quellstein_off'); break;
      case 'node': s0.setFrame(o.state ? 'node_empty' : 'node_' + pr.kind); break;
      case 'shard': s0.setVisible(!o.state); v.glow?.setVisible(!o.state); if (o.state) v.light = null; break;
    }
  }
  private addDrop(d: DropInfo) {
    const f = d.kind === 'gold' ? 'drop_gold' : d.icon.startsWith('potion') || d.icon === 'food' ? 'drop_potion' : d.icon === 'key' ? 'drop_key' : d.icon.startsWith('mat') || d.icon === 'gem' || d.icon === 'scroll' || (d.icon === 'charm' && d.rarity === 0) ? 'drop_bag' : 'drop_gear';
    const s = this.add.image(d.x, d.y, 'obj', f).setOrigin(0.5, 1).setDepth(d.y);
    const col = [0, 0x70e070, 0x60b0ff, 0xd090ff, 0xffb040][d.rarity];
    let label: Phaser.GameObjects.Text | undefined;
    if (d.rarity >= 1 && d.kind === 'item') {
      label = this.text(d.x, d.y - 14, d.name, hexStr(col), 7).setOrigin(0.5, 1);
      this.fx.play(this.fx.pick('pillar'), d.x, d.y, { originY: 1, tint: col, add: true, alpha: 0.7, scale: 0.6, depth: d.y - 1, fps: 14 }, this.animClock);
    }
    this.tweens.add({ targets: s, y: d.y - 10, duration: 180, yoyo: true, ease: 'Quad.out' });
    this.drops.set(d.id, { d, s, label });
  }
  private addZoneFx(z: ZoneFx) {
    const g = this.add.graphics().setDepth(2);
    let rune: Phaser.GameObjects.Image | undefined;
    const fxTex = this.textures.get('fx');
    if (z.shape !== 'line' && z.r < 150) {
      if (!z.hostile && fxTex.has('rune_circle')) rune = this.add.image(z.x, z.y, 'fx', 'rune_circle').setTint(ELEMENT_COLOR[z.el]).setAlpha(0.75).setBlendMode(Phaser.BlendModes.ADD);
      else if (z.hostile && fxTex.has('tele_ring')) rune = this.add.image(z.x, z.y, 'fx', 'tele_ring').setTint(0xff5050).setAlpha(0.85);
      rune?.setDepth(2).setScale((z.r * 2) / rune.width);
    }
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
      if (id === this.me.info.id) { this.me.hp = hp; this.me.maxHp = maxHp; this.me.flags = flags; this.serverAnim = anim; continue; }
      const v = this.players.get(id);
      if (!v) continue;
      if (v.x < -900) { v.x = x; v.y = y; }
      v.buf.push({ t: m.n, x, y }); if (v.buf.length > 8) v.buf.shift();
      v.facing = f / 100; v.hp = hp; v.maxHp = maxHp; v.flags = flags;
      if (anim === Anim.Dead) { v.lockUntil = 0; v.play('death'); }
      else if (anim === Anim.Roll) { v.lockUntil = 0; v.play('dodge'); }
      else v.play(anim === Anim.Move ? (flags & STATUS_BIT.slow ? 'walk' : 'run') : anim === Anim.Cast ? 'cast' : anim === Anim.Hurt ? 'hit' : 'idle');
    }
    for (const s of m.m) {
      const v = this.mobs.get(s[0]);
      if (!v) continue;
      if (!v.seen || Math.hypot(s[1] - v.x, s[2] - v.y) > 120) { v.x = s[1]; v.y = s[2]; v.buf = []; v.seen = true; }
      v.buf.push({ t: m.n, x: s[1], y: s[2] }); if (v.buf.length > 8) v.buf.shift();
      v.left = s[3]; v.hp = s[5]; v.flags = s[6];
      const a = s[4];
      v.play(a === Anim.Move ? 'move' : a === Anim.Windup ? 'windup' : a === Anim.Attack ? 'attack' : a === Anim.Hurt ? 'hit' : a === Anim.Special ? 'special' : 'idle');
    }
    if (m.ev) for (const e of m.ev) this.onEvent(e);
    if (m.me) {
      const me = store.state.me;
      if (me.hp !== m.me[0] || me.maxHp !== m.me[1] || me.mp !== m.me[2] || me.maxMp !== m.me[3] || me.flags !== m.me[4]) store.set({ me: { hp: m.me[0], maxHp: m.me[1], mp: m.me[2], maxMp: m.me[3], flags: m.me[4] } });
      if (store.state.dead && m.me[0] > 0 && !(m.me[4] & FLAG_DEAD)) store.set({ dead: null });
    }
    if (m.k !== undefined && m.k !== store.state.keys) store.set({ keys: m.k });
  }
  onPos(m: Extract<ServerMsg, { t: 'pos' }>) {
    if (!this.ready) return;
    if (m.dash) {
      this.fx.play(this.fx.pick('dodge_trail'), this.me.x, this.me.y - 8, { rot: Math.atan2(m.y - this.me.y, m.x - this.me.x), tint: 0xffffff, alpha: 0.8 }, this.animClock);
      this.burst(this.smoke, 5, this.me.x, this.me.y, 0xffffff);
    }
    this.me.x = m.x; this.me.y = m.y; this.epoch = m.e; this.sentX = m.x; this.sentY = m.y;
  }
  onDrop(d: DropInfo) { if (this.ready) this.addDrop(d); }
  onDropGone(id: number, got?: number) {
    const d = this.drops.get(id);
    if (!d) return;
    this.drops.delete(id);
    d.label?.destroy();
    if (got) {
      this.tweens.add({ targets: d.s, x: this.me.x, y: this.me.y - 10, alpha: 0, duration: 160, onComplete: () => d.s.destroy() });
      this.fx.play(this.fx.pick('sparkle'), d.d.x, d.d.y - 6, { tint: 0xffe890, add: true }, this.animClock);
    } else d.s.destroy();
  }

  private entityPos(id: number): { x: number; y: number; h: number } | null {
    if (id === this.me.info.id) return { x: this.me.x, y: this.me.y, h: 28 };
    const p = this.players.get(id); if (p) return { x: p.x, y: p.y, h: 28 };
    const m = this.mobs.get(id); if (m) return { x: m.x, y: m.y, h: m.top };
    return null;
  }
  private playerView(id: number): PlayerView | undefined { return id === this.me.info.id ? this.me : this.players.get(id); }
  sfxAt(n: string, x?: number, y?: number, vol = 1) {
    if (x === undefined || y === undefined) { audio.playSfx(n as SfxName, { volume: vol }); return; }
    const d = Math.hypot(x - this.me.x, y - this.me.y);
    if (d > 360) return;
    audio.playSfx(n as SfxName, { volume: vol * (1 - d / 420), pan: Phaser.Math.Clamp((x - this.me.x) / 220, -0.8, 0.8) });
  }
  private floatText(x: number, y: number, s: string, color: string, size = 8, big = false) {
    const t = this.text(x + Phaser.Math.Between(-5, 5), y, s, color, size).setOrigin(0.5, 1).setDepth(9500);
    if (big) { t.setScale(1.7); this.tweens.add({ targets: t, scale: 1, duration: 180, ease: 'Back.out' }); }
    this.tweens.add({ targets: t, y: y - 20, duration: 750, ease: 'Cubic.out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 500, duration: 280, onComplete: () => t.destroy() });
  }
  private burst(em: Phaser.GameObjects.Particles.ParticleEmitter, n: number, x: number, y: number, tint: number) { em.setParticleTint(tint); em.explode(n, x, y); }
  private ring(x: number, y: number, r: number, tint: number, dur = 320) {
    const s = this.add.image(x, y, 'fx', 'ring').setTint(tint).setDepth(y + 20).setScale(0.15).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: s, scale: (r * 2) / 64, alpha: 0, duration: dur, ease: 'Cubic.out', onComplete: () => s.destroy() });
  }
  private shake(i: number, d = 120) { if (settings.screenShake) this.cameras.main.shake(d, i / this.zoomLevel); }
  private hitStop(ms: number) { this.hitStopUntil = Math.max(this.hitStopUntil, performance.now() + ms); }
  private decal(name: string, x: number, y: number, tint: number, life = 5000) {
    const n = this.fx.frames(name);
    const f = n ? `${name}_${Math.floor(Math.random() * n)}` : name;
    if (!this.textures.get('fx').has(f)) return;
    const s = this.add.image(x, y, 'fx', f).setDepth(2).setTint(tint).setAlpha(0.8);
    this.tweens.add({ targets: s, alpha: 0, delay: life * 0.6, duration: life * 0.4, onComplete: () => s.destroy() });
  }

  /** Waffenspur eines Angriffs – jede Klasse hat ihre eigene Handschrift. */
  private attackFx(x: number, y: number, ang: number, kind: string, el: Element, combo: number, range: number, own: boolean) {
    const c = this.animClock, tint = elTint(el), fin = combo === 2;
    const dx = Math.cos(ang), dy = Math.sin(ang), hy = y - 9;
    // Drehpunkte laut Effekt-Katalog: Schwertbögen links-mittig, Dolchschnitte kreuzen vor der Figur
    const arc = (name: string | null, scale: number, t = tint) => {
      const ox = name === 'slash_dagger' ? 0.3 : name === 'thrust' ? 0 : 0.1;
      return this.fx.play(name, x + dx * 3, hy + dy * 3, { rot: ang, tint: t, scale, originX: ox, add: true, fps: 24 }, c);
    };
    switch (kind) {
      case 'sword':
        if (fin) { arc(this.fx.pick('slash_heavy', 'slash'), Math.max(0.55, range / 56), el === 'phys' ? 0xfff0c8 : tint); if (own) this.shake(0.006, 90); }
        else arc(this.fx.pick('slash_sword', 'slash'), Math.max(0.5, range / 44));
        this.sfxAt('swing_heavy', x, y, 0.8); break;
      case 'hammer':
        if (fin) {
          const px = x + dx * range * 0.7, py = y + dy * range * 0.7;
          this.fx.play(this.fx.pick('smash_hammer', 'explosion_phys'), px, py - 6, { fps: 18, depth: py + 20 }, c);
          this.fx.play(this.fx.pick('shockwave'), px, py, { tint: 0xffe9a0, add: true, scale: 0.55, depth: 3, fps: 20 }, c);
          this.flash(px, py, 70, 0xffe0a0, 0.8, 200);
          if (own) this.shake(0.012, 140);
        } else arc(this.fx.pick('slash_sword', 'slash'), Math.max(0.5, range / 46), el === 'phys' ? 0xffe9b0 : tint);
        this.sfxAt('swing_heavy', x, y, 0.9); break;
      case 'dagger':
        arc(this.fx.pick(fin ? 'thrust' : 'slash_dagger', 'thrust', 'slash'), Math.max(0.55, range / 34), el === 'phys' ? 0xe8c8ff : tint);
        if (fin) arc(this.fx.pick('slash_dagger', 'slash'), Math.max(0.6, range / 30), el === 'phys' ? 0xd090ff : tint);
        this.sfxAt('swing_light', x, y, 0.8); break;
      case 'bow': this.fx.play(this.fx.pick('dust_run'), x + dx * 8, hy + dy * 8, { rot: ang, alpha: 0.7, depth: y + 20 }, c); this.sfxAt('bow_shot', x, y); break;
      case 'staff': this.fx.play(this.fx.pick('cast', 'sparkle'), x + dx * 10, hy + dy * 10 - 4, { tint: el === 'phys' ? 0xc8b0ff : tint, add: true, scale: 0.6, fps: 26, depth: y + 30 }, c); this.sfxAt('cast_light', x, y, 0.6); break;
      case 'skill': arc(this.fx.pick('slash_heavy', 'slash'), Math.max(0.6, range / 52)); this.flash(x + dx * 16, hy + dy * 16, 60, tint, 0.7, 180); this.sfxAt('swing_heavy', x, y, 0.8); break;
      default: // Gegner: Klaue oder Biss
        this.fx.play(this.fx.pick((Math.round(x) + Math.round(y)) % 3 === 0 ? 'bite' : 'claw', 'claw', 'slash'), x + dx * range * 0.6, hy + dy * range * 0.6 + 4, { rot: ang, tint: el === 'phys' ? 0xffd8d0 : tint, fps: 20, depth: y + 30 }, c);
        this.sfxAt('swing_light', x, y, 0.7);
    }
  }

  private onEvent(e: GameEvent) {
    const nowP = performance.now(), c = this.animClock;
    switch (e.k) {
      case 'dmg': {
        const mine = e.id === this.me.info.id;
        const pv = this.playerView(e.id), mv = this.mobs.get(e.id);
        const v = pv ?? mv;
        if (v) v.flashUntil = nowP + 80;
        const h = mv ? mv.top : 28;
        const hx = e.x + Phaser.Math.Between(-3, 3), hy = e.y - h * 0.55;
        const tint = e.pl ? 0xff6050 : elTint(e.el);
        if (settings.damageNumbers) this.floatText(e.x, e.y - h - 2, (e.c ? '✦' : '') + e.a, e.pl ? '#ff6a5a' : e.c ? '#ffe45a' : hexStr(ELEMENT_COLOR[e.el]), e.c ? 11 : 8, !!e.c);
        if (e.c) {
          this.fx.play(this.fx.pick('hit_crit', 'hit'), hx, hy, { fps: 20, depth: 9100, scale: mv?.boss ? 1.4 : 1 }, c);
          this.flash(hx, hy, 60, 0xffe890, 0.9, 200);
          if (!e.pl) { this.hitStop(55); this.shake(0.007, 90); }
        } else this.fx.play(this.fx.pick(e.el === 'phys' ? 'hit' : 'hit_magic', 'hit'), hx, hy, { tint, fps: 22, depth: 9100, rot: Math.random() * 6.28 }, c);
        this.burst(this.sparks, e.c ? 8 : 3, hx, hy, tint);
        if (mv && !mv.boss) this.tweens.add({ targets: mv.sprite, scaleX: mv.scale * 1.18, scaleY: mv.scale * 0.86, duration: 55, yoyo: true });
        if (mine) {
          this.sfxAt('player_hurt'); this.shake(0.012); this.flash(this.me.x, this.me.y - 10, 80, 0xff4030, 0.7, 220);
          if (this.animClock >= this.me.lockUntil) this.me.play('hit', 180, true);
        } else this.sfxAt(e.c ? 'hit_crit' : e.el === 'phys' ? 'hit_flesh' : 'hit_magic', e.x, e.y, 0.9);
        break;
      }
      case 'heal':
        this.floatText(e.x, e.y - 26, '+' + e.a, '#7dff8a');
        if (!this.fx.play(this.fx.pick('heal'), e.x, e.y - 14, { fps: 12, depth: e.y + 30 }, c)) this.burst(this.stars, 5, e.x, e.y - 10, 0x90ff90);
        break;
      case 'txt': this.floatText(e.x, e.y, e.s, e.col ?? '#ffffff'); break;
      case 'atk': {
        const pv = this.playerView(e.id);
        const own = e.id === this.me.info.id;
        if (pv && !own) { pv.facing = e.ang; const heavy = e.combo === 2 || e.kind === 'skill'; pv.play(heavy ? 'heavy' : 'attack', animDuration(CHAR_ANIMS[heavy ? 'heavy' : 'attack']), true); }
        if (own && e.kind !== 'skill') break;
        const p = this.entityPos(e.id);
        if (p) this.attackFx(p.x, p.y, e.ang, e.kind, e.el, e.combo ?? 0, e.range ?? 26, own);
        break;
      }
      case 'cast': {
        const p = this.entityPos(e.id);
        if (!p) break;
        const tint = elTint(e.el);
        this.fx.play(this.fx.pick('cast'), p.x, p.y - 14, { tint, add: true, fps: 16, depth: p.y + 30 }, c);
        if (this.textures.get('fx').has('rune_circle')) {
          const r = this.add.image(p.x, p.y + 2, 'fx', 'rune_circle').setTint(tint).setDepth(3).setScale(0.3).setAlpha(0.9).setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({ targets: r, scale: 0.62, alpha: 0, duration: 520, ease: 'Cubic.out', onComplete: () => r.destroy() });
        }
        this.flash(p.x, p.y - 10, 70, tint, 0.8, 300);
        break;
      }
      case 'fx': this.playFx(e); break;
      case 'sfx': this.sfxAt(e.n, e.x, e.y); break;
      case 'mob+': this.addMob(e.m); break;
      case 'mob-': {
        const v = this.mobs.get(e.id);
        if (!v) break;
        this.mobs.delete(e.id);
        if (e.died) {
          this.sfxAt(v.boss ? 'boss_die' : 'enemy_die', v.x, v.y);
          this.burst(this.sparks, v.boss ? 40 : 5, v.x, v.y - v.top / 2, 0xffe0a0);
          v.die();
          this.dying.push(v);
        } else v.destroy();
        break;
      }
      case 'proj+': this.addProj(e.p, nowP); break;
      case 'proj-': {
        const v = this.projs.get(e.id);
        if (!v) break;
        this.projs.delete(e.id);
        if (e.hit) {
          this.burst(this.sparks, 4, v.x, v.y, v.tint);
          if (v.p.spr === 'arrow' || v.p.spr === 'dagger') this.fx.play(this.fx.pick('hit'), v.x, v.y, { tint: 0xffffff, scale: 0.6, add: true, fps: 24 }, c);
        }
        v.s.destroy();
        break;
      }
      case 'zone+': this.addZoneFx(e.z); break;
      case 'zone-': { const v = this.zfx.get(e.id); if (v) { v.g.destroy(); v.rune?.destroy(); this.zfx.delete(e.id); } break; }
      case 'obj': { const v = this.objs.get(e.id); if (v) { v.o.state = e.state; if (e.props) v.o.props = { ...v.o.props, ...e.props }; this.applyObjState(v); } break; }
      case 'obj+':
        this.addObj(e.o);
        if (e.o.type === 'chest' || e.o.type === 'exit') {
          this.fx.play(this.fx.pick('pillar'), e.o.x, e.o.y + 8, { originY: 1, tint: 0xffe9a0, add: true, fps: 12, depth: e.o.y + 2 }, c);
          this.burst(this.stars, 16, e.o.x, e.o.y, 0xffe080);
        }
        break;
      case 'obj-': this.objs.get(e.id)?.destroy(); this.objs.delete(e.id); break;
      case 'pl+': this.addPlayer(e.p); break;
      case 'pl-': this.players.get(e.id)?.destroy(); this.players.delete(e.id); break;
      case 'boss': {
        const cur = store.state.boss;
        const v = this.mobs.get(e.id);
        store.set({ boss: { id: e.id, name: e.name, phase: e.phase, el: e.el, hp: v?.hp ?? cur?.hp ?? 1, maxHp: v?.info.maxHp ?? cur?.maxHp ?? 1 } });
        if (!cur) { audio.playMusic(this.map.def.boss === 'hohlkoenig' ? 'final_boss' : 'boss'); this.shake(0.02, 400); }
        if (v && (!cur || cur.phase !== e.phase || cur.el !== e.el)) {
          const tint = elTint(e.el);
          this.fx.play(this.fx.pick('shockwave'), v.x, v.y, { tint, add: true, depth: 3, fps: 14, scale: 1.4 }, c);
          this.flash(v.x, v.y - 20, 220, tint, 1, 600);
          this.cameras.main.flash(180, (tint >> 16) & 255, (tint >> 8) & 255, tint & 255);
          this.decal('crack', v.x, v.y + 6, tint, 6000);
          this.shake(0.018, 350);
        }
        break;
      }
      case 'bossend':
        store.set({ boss: null });
        audio.playMusic(this.map.def.music as MusicId);
        if (e.won) { audio.playJingle('victory'); this.cameras.main.flash(500, 255, 250, 220); }
        break;
    }
  }

  private addProj(p: ProjInfo, nowP: number) {
    const tex = this.textures.get('fx');
    const hostilePhys = p.hostile && p.el === 'phys';
    let anim = '', frame = p.spr, coloured = false;
    const el = p.el === 'phys' ? 'arcane' : p.el;
    if (p.spr === 'orb') { anim = this.fx.pick(`bolt_${el}`, 'bolt_arcane') ?? ''; coloured = anim !== 'bolt_arcane' && anim !== ''; }
    else if (p.spr === 'shard') { anim = this.fx.pick('bolt_water') ?? ''; coloured = !!anim; }
    else if (p.spr === 'rock') { anim = this.fx.pick('bolt_earth') ?? ''; coloured = !!anim; }
    else if (p.spr === 'lance') { anim = this.fx.pick(p.el === 'light' ? 'bolt_light' : p.el === 'wind' ? 'bolt_wind' : 'lance', 'lance') ?? ''; coloured = anim.startsWith('bolt_'); }
    else if (p.spr === 'spore') { anim = this.fx.frames('spore') ? 'spore' : ''; coloured = !!anim; }
    else coloured = true; // Pfeil, Dolch
    const n = anim ? this.fx.frames(anim) : 0;
    if (anim) frame = n ? `${anim}_0` : anim;
    if (!tex.has(frame)) frame = tex.has(p.spr) ? p.spr : 'bolt_arcane_0';
    const tint = hostilePhys ? 0xff7060 : elTint(p.el);
    const emissive = p.spr !== 'arrow' && p.spr !== 'dagger' && p.spr !== 'rock';
    const s = this.add.image(p.x, p.y, 'fx', frame).setDepth(emissive ? 9100 : p.y + 40).setRotation(Math.atan2(p.vy, p.vx));
    if (!coloured) s.setTint(tint).setBlendMode(Phaser.BlendModes.ADD);
    if (p.r > 6) s.setScale(Math.min(2, p.r / 5));
    this.projs.set(p.id, { p, s, x: p.x, y: p.y, born: nowP, trail: 0, anim, n, tint });
  }

  private playFx(e: Extract<GameEvent, { k: 'fx' }>) {
    const tint = e.el ? elTint(e.el) : 0xffffff, c = this.animClock;
    switch (e.n) {
      case 'explosion': {
        const r = e.r ?? 30, el = e.el ?? 'phys';
        const name = this.fx.pick(`explosion_${el}`, 'explosion_phys');
        if (name) this.fx.play(name, e.x, e.y - 4, { scale: Math.max(0.6, r / 26), fps: 16, depth: 9100 }, c); else this.ring(e.x, e.y, r, tint, 380);
        this.burst(this.sparks, 12, e.x, e.y, tint);
        this.flash(e.x, e.y, r * 2.4, tint, 1, 320);
        if (r >= 24) this.decal(el === 'fire' ? 'scorch' : 'crack', e.x, e.y + 2, el === 'fire' ? 0xffffff : tint);
        if (r > 48) this.fx.play(this.fx.pick('shockwave'), e.x, e.y, { tint, add: true, depth: 3, fps: 18, scale: r / 44 }, c);
        if (Math.hypot(e.x - this.me.x, e.y - this.me.y) < 150) this.shake(r > 48 ? 0.016 : 0.009, 150);
        break;
      }
      case 'spin': {
        const r = e.r ?? 40;
        if (!this.fx.play(this.fx.pick('shockwave'), e.x, e.y, { tint, add: true, depth: 3, fps: 22, scale: r / 44 }, c)) this.ring(e.x, e.y - 6, r, tint, 260);
        for (let k = 0; k < 3; k++) this.fx.play(this.fx.pick('slash_heavy', 'slash'), e.x, e.y - 9, { rot: (k * Math.PI * 2) / 3, tint, originX: 0.1, add: true, scale: r / 52, fps: 22, delay: k * 40 }, c);
        this.shake(0.008, 120);
        break;
      }
      case 'blink':
        if (!this.fx.play(this.fx.pick('blink'), e.x, e.y - 12, { tint, add: true, fps: 18 }, c)) this.burst(this.smoke, 8, e.x, e.y - 8, tint);
        this.flash(e.x, e.y - 10, 60, tint, 0.8, 220);
        break;
      case 'dash':
        this.fx.play(this.fx.pick('dodge_trail', 'thrust'), e.x - Math.cos(e.ang ?? 0) * 18, e.y - 9, { rot: e.ang ?? 0, tint, add: true, fps: 18 }, c);
        this.fx.play(this.fx.pick('dust'), e.x, e.y, { depth: 5 }, c);
        break;
      case 'buff':
        if (!this.fx.play(this.fx.pick('buff'), e.x, e.y - 14, { tint, add: true, fps: 12 }, c)) this.burst(this.stars, 12, e.x, e.y - 6, tint);
        this.flash(e.x, e.y - 10, 70, tint, 0.7, 320);
        break;
      case 'heal':
        if (!this.fx.play(this.fx.pick('heal'), e.x, e.y - 14, { fps: 12 }, c)) this.burst(this.stars, 10, e.x, e.y - 6, 0x90ffa0);
        this.flash(e.x, e.y - 10, 70, 0x90ffa0, 0.6, 320);
        break;
      case 'levelup':
        this.fx.play(this.fx.pick('pillar'), e.x, e.y + 4, { originY: 1, tint: 0xffe27a, add: true, fps: 12, depth: e.y + 1 }, c);
        if (!this.fx.play(this.fx.pick('levelup'), e.x, e.y - 16, { fps: 12, depth: e.y + 40 }, c)) this.ring(e.x, e.y - 8, 60, 0xffe27a, 700);
        this.burst(this.stars, 24, e.x, e.y - 8, 0xffe27a); this.flash(e.x, e.y - 10, 140, 0xffe9a0, 1, 700); this.sfxAt('levelup', e.x, e.y);
        this.playerNear(e.x, e.y)?.play('cast', 600, true);
        break;
      case 'spawn':
        if (!this.fx.play(this.fx.pick('spawn'), e.x, e.y - 8, { tint: lerpC(tint, 0x202030, 0.4), fps: 14 }, c)) this.burst(this.smoke, 8, e.x, e.y - 6, tint);
        break;
      case 'rubble':
        this.fx.play(this.fx.pick('explosion_earth', 'explosion_phys'), e.x, e.y - 6, { fps: 16, scale: 0.8 }, c);
        this.burst(this.smoke, 10, e.x, e.y - 6, 0xc0b8a8); this.shake(0.01);
        break;
      case 'shard':
        this.fx.play(this.fx.pick('pillar'), e.x, e.y + 6, { originY: 1, tint: 0x70ffe8, add: true, fps: 12 }, c);
        this.ring(e.x, e.y - 8, 34, 0x70ffe8, 500); this.burst(this.stars, 18, e.x, e.y - 8, 0x70ffe8); this.flash(e.x, e.y - 8, 120, 0x70ffe8, 1, 600);
        break;
      case 'bossdeath':
        for (let k = 0; k < 6; k++) this.time.delayedCall(k * 150, () => {
          const x = e.x + Phaser.Math.Between(-28, 28), y = e.y - 24 + Phaser.Math.Between(-26, 22);
          this.fx.play(this.fx.pick(`explosion_${e.el ?? 'phys'}`, 'explosion_phys'), x, y, { fps: 14, scale: 1.3, depth: e.y + 60 }, this.animClock);
          this.flash(x, y, 160, tint, 1, 300); this.burst(this.sparks, 20, x, y, tint);
        });
        this.time.delayedCall(900, () => {
          this.fx.play(this.fx.pick('pillar'), e.x, e.y + 6, { originY: 1, tint: 0xffffff, add: true, fps: 9, scale: 2 }, this.animClock);
          this.fx.play(this.fx.pick('shockwave'), e.x, e.y, { tint, add: true, depth: 3, fps: 12, scale: 2 }, this.animClock);
        });
        this.shake(0.03, 900);
        break;
      case 'beam': {
        const g = this.add.graphics().setDepth(e.y + 500).setBlendMode(Phaser.BlendModes.ADD);
        const len = e.d ?? 100, a = e.ang ?? 0, ex = e.x + Math.cos(a) * len, ey = e.y + Math.sin(a) * len;
        g.lineStyle(12, tint, 0.85).lineBetween(e.x, e.y, ex, ey);
        g.lineStyle(4, 0xffffff, 1).lineBetween(e.x, e.y, ex, ey);
        this.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
        for (let k = 0; k <= 4; k++) this.flash(e.x + ((ex - e.x) * k) / 4, e.y + ((ey - e.y) * k) / 4, 60, tint, 0.9, 260);
        break;
      }
    }
  }
  private playerNear(x: number, y: number): PlayerView | undefined {
    if (Math.hypot(this.me.x - x, this.me.y - y) < 6) return this.me;
    for (const p of this.players.values()) if (Math.hypot(p.x - x, p.y - y) < 10) return p;
    return undefined;
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
    if (now >= this.hitStopUntil) this.animClock += Math.min(50, dtMs);
    const st = store.state;
    live.serverNow = () => performance.now() + (this.timeOffset ?? 0);
    this.updateSun();
    this.updateSelf(now, dt);
    const rt = now + (this.timeOffset ?? 0) - CFG.net.interpDelayMs;
    for (const v of this.players.values()) { this.interp(v, rt); v.draw(now); }
    for (const v of this.mobs.values()) { this.interp(v, rt); v.draw(now); }
    for (let k = this.dying.length - 1; k >= 0; k--) {
      const v = this.dying[k];
      v.draw(now);
      if (!v.deathDone()) continue;
      this.dying.splice(k, 1);
      if (!this.fx.play(this.fx.pick('death_poof'), v.x, v.y - v.top * 0.4, { fps: 16, scale: v.boss ? 2.4 : v.w > 40 ? 1.4 : 1 }, this.animClock)) this.burst(this.smoke, 8, v.x, v.y - 6, 0xffffff);
      v.blob.destroy(); v.shadow.destroy();
      this.tweens.add({ targets: v.sprite, alpha: 0, duration: 260, onComplete: () => v.sprite.destroy() });
    }
    this.updateProjs(dt, now);
    this.updateZoneFx(now);
    this.updateObjs(now);
    this.updateInteraction(now);
    this.fx.update(this.animClock);
    // animierte Flüssigkeit & Deko
    const liq = this.gfx.liquids[this.map.biome]?.length ?? 4;
    const lf = Math.floor(now / (liq > 4 ? 140 : 230)) % liq;
    if (lf !== this.liquidFrame && this.liquid) { this.liquidFrame = lf; this.liquid.setTexture(`liq_${this.map.biome}_${lf}`); }
    const view = this.cameras.main.worldView;
    for (const a of this.animDecor) {
      const s = a.s;
      if (s.x < view.x - 70 || s.x > view.right + 70 || s.y < view.y - 20 || s.y > view.bottom + 130) continue;
      const idx = Math.floor((now + a.off * 6) / a.period) % a.n;
      if (idx !== a.last) { a.last = idx; s.setFrame(`${a.base}_${idx}`); }
    }
    // Kronen ausblenden, wenn die eigene Figur dahinter steht
    const mx = this.me.x, my = this.me.y;
    for (const f of this.fadeDecor) {
      const s = f.s;
      if (Math.abs(s.x - mx) > 80 || Math.abs(s.y - my) > 140) { if (s.alpha !== 1) s.setAlpha(Math.min(1, s.alpha + dt * 4)); continue; }
      const behind = Math.abs(mx - s.x) < f.hw && my < s.y - 4 && my > s.y - f.h * 0.92;
      const target = behind ? 0.4 : 1;
      if (s.alpha !== target) s.setAlpha(s.alpha + Math.sign(target - s.alpha) * Math.min(Math.abs(target - s.alpha), dt * 4));
    }
    // Schornsteinrauch
    if (now > this.smokeAt && this.smokeSpots.length && settings.weather) {
      this.smokeAt = now + 420;
      const fxTex = this.textures.get('fx');
      for (const sp of this.smokeSpots) if (Math.abs(sp.x - mx) < 400 && Math.abs(sp.y - my) < 300) {
        const f = ['smoke_' + Math.floor(Math.random() * 4), 'smoke_0', 'smoke'].find(n => fxTex.has(n));
        if (!f) continue;
        const s = this.add.image(sp.x, sp.y, 'fx', f).setDepth(sp.y + 200).setAlpha(0.55).setTint(0xe8e4dc);
        this.tweens.add({ targets: s, y: sp.y - 34, x: sp.x + 10 + Math.random() * 10, alpha: 0, scale: 1.6, duration: 2400, onComplete: () => s.destroy() });
      }
    }
    const day = settings.lighting ? this.isDay() : this.map.def.indoor ? 0 : 1;
    this.ambient.update(dt, now, st.weather, day, mx, my);
    this.lighting.update(view, this.ambientColor(), this.collectLights(now), now);
    // Boss-Anzeige & Minimap-Daten
    if (st.boss && now - this.bossAt > 120) {
      this.bossAt = now;
      const b = this.mobs.get(st.boss.id);
      if (b && (b.hp !== st.boss.hp || b.info.maxHp !== st.boss.maxHp)) store.set({ boss: { ...st.boss, hp: b.hp, maxHp: b.info.maxHp } });
    }
    if (now - this.liveAt > 150) {
      this.liveAt = now;
      live.x = mx; live.y = my; live.fps = this.game.loop.actualFps;
      live.players = [...this.players.values()].map(p => ({ x: p.x, y: p.y, name: p.info.name, party: this.inMyParty(p.info) }));
      live.mobs = [...this.mobs.values()].filter(m => m.seen && Math.hypot(m.x - mx, m.y - my) < 420).map(m => ({ x: m.x, y: m.y, boss: m.boss }));
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
    let moving = false, slowGait = false;
    if (!dead && !stunned) {
      const mv = blocked ? { x: 0, y: 0 } : input.move();
      const ml = Math.hypot(mv.x, mv.y);
      if (ml > 0.1) this.aim = Math.atan2(mv.y, mv.x);
      if (!blocked && input.pressed('dodge') && now >= this.dodgeReady && now >= this.rollUntil) {
        this.rollDir = ml > 0.1 ? Math.atan2(mv.y, mv.x) : store.state.inputMode === 'kbm' ? this.aimInfo().ang : this.aim;
        this.rollUntil = now + CFG.player.dodgeDuration * 1000;
        this.dodgeReady = now + stats.dodgeCd * 1000;
        this.moveLockUntil = 0;
        net.send({ t: 'dodge', ang: this.rollDir });
        store.set({ cds: { ...store.state.cds, _dodge: { until: this.dodgeReady, total: stats.dodgeCd } } });
        me.lockUntil = 0; me.facing = this.rollDir; me.play('dodge', 0, true);
        this.fx.play(this.fx.pick('dust'), me.x, me.y, { depth: 5 }, this.animClock);
        const until = this.rollUntil;
        this.fx.play(this.fx.pick('dodge_trail'), me.x, me.y - 9, { rot: this.rollDir, tint: 0xffffff, alpha: 0.6, fps: 16, follow: () => (performance.now() < until ? { x: this.me.x - Math.cos(this.rollDir) * 10, y: this.me.y - 9 } : null) }, this.animClock);
      }
      let vx = 0, vy = 0;
      let speed = stats.speed * (me.flags & STATUS_BIT.slow ? CFG.combat.slowFactor : 1);
      if (now < this.rollUntil) { speed *= CFG.player.dodgeSpeedMul; vx = Math.cos(this.rollDir) * speed; vy = Math.sin(this.rollDir) * speed; }
      else if (ml > 0.1 && now >= this.moveLockUntil) { vx = mv.x * speed; vy = mv.y * speed; slowGait = ml < 0.6 || !!(me.flags & STATUS_BIT.slow); }
      if (vx || vy) {
        const r = moveCircle(this.solid, me.x, me.y, vx * dt, vy * dt, CFG.player.radius);
        const dist = Math.hypot(r.x - me.x, r.y - me.y);
        moving = dist > 0.01;
        me.x = r.x; me.y = r.y;
        if (this.animClock >= me.lockUntil) me.facing = now < this.rollUntil ? this.rollDir : Math.atan2(vy, vx);
        this.stepDist += dist;
      }
      if (!blocked) this.handleActions(now, stats, cls);
    } else { input.clearPressed(); }
    // Animation
    if (dead) { me.lockUntil = 0; me.play('death'); }
    else if (now < this.rollUntil) me.play('dodge');
    else if (this.serverAnim === Anim.Cast) me.play('cast');
    else me.play(moving ? (slowGait ? 'walk' : 'run') : 'idle');
    me.draw(now);
    if (moving && now >= this.rollUntil) {
      if (now >= this.stepAt) { this.stepAt = now + (slowGait ? 380 : 290); audio.playSfx(STEP_SFX[this.map.biome], { volume: 0.5 }); }
      const tile = this.map.tiles[Math.floor(me.y / TILE) * this.map.w + Math.floor(me.x / TILE)];
      if (!slowGait && now >= this.dustAt && (tile === T.PATH || this.map.biome === 'glut' || this.map.biome === 'ruinen')) {
        this.dustAt = now + 240;
        this.fx.play(this.fx.pick('dust_run'), me.x, me.y + 1, { depth: 5, alpha: 0.7, flipX: Math.cos(me.facing) > 0 }, this.animClock);
      }
      if (this.stepDist > 9) {
        this.stepDist = 0; this.stepSide = -this.stepSide;
        if (this.map.biome === 'frost' && !this.map.dungeon && (tile === T.GROUND || tile === T.GROUND2)) this.ambient.footprint(me.x, me.y + 1, me.facing, this.stepSide, 0x7088b8, now);
        else if (this.map.biome === 'glut' && !this.map.dungeon && tile === T.GROUND) this.ambient.footprint(me.x, me.y + 1, me.facing, this.stepSide, 0x18121a, now);
      }
    }
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
    const wantAtk = input.pressed('attack') || input.held('attack');
    if (wantAtk && now >= this.atkReady && now >= this.rollUntil) {
      const atk = cls.attack;
      const a = this.aimInfo(atk.kind === 'arc' ? 70 : atk.range);
      this.atkReady = now + atk.cooldown * 1000;
      this.combo = now - this.comboAt < (CFG.player.comboWindow + atk.cooldown) * 1000 ? (this.combo + 1) % 3 : 0;
      this.comboAt = now;
      const fin = this.combo === 2 && atk.kind === 'arc';
      me.facing = a.ang; this.aim = a.ang;
      const anim = fin ? 'heavy' : 'attack';
      const dur = Math.min(animDuration(CHAR_ANIMS[anim]), atk.cooldown * 1000 + (fin ? 120 : 0));
      me.play(anim, dur, true);
      this.moveLockUntil = now + Math.min(dur, atk.cooldown * 1000) - 110;
      net.send({ t: 'atk', ang: a.ang });
      this.attackFx(me.x, me.y, a.ang, cls.weapon, stats.attackElement, fin ? 2 : this.combo, atk.range * (fin ? 1.3 : 1), true);
    }
    for (let i = 0; i < 4; i++) {
      if (!input.pressed(('skill' + (i + 1)) as any)) continue;
      const id = c.hotbar[i];
      if (!id) continue;
      const sk = SKILLS[id], rank = c.skills[id] ?? 0;
      const cd = st.cds[id];
      if (!sk || rank < 1) continue;
      if (cd && cd.until > now + 60) { audio.playSfx('ui_error', { volume: 0.5 }); continue; }
      if (st.me.mp < skillMp(sk, rank)) { audio.playSfx('ui_error', { volume: 0.5 }); this.floatText(me.x, me.y - 30, 'Zu wenig Mana', '#6fb7ff'); continue; }
      const a = this.aimInfo(220);
      me.facing = a.ang; this.aim = a.ang;
      if (sk.anim !== 'cast') { me.play('heavy', animDuration(CHAR_ANIMS.heavy), true); this.moveLockUntil = now + 240; }
      else me.play('cast', 380, true);
      net.send({ t: 'skill', id, ang: a.ang, tx: Math.round(a.tx), ty: Math.round(a.ty) });
    }
    if (input.pressed('potionHp')) net.send({ t: 'quick', kind: 'hp' });
    if (input.pressed('potionMp')) net.send({ t: 'quick', kind: 'mp' });
  }

  private updateProjs(dt: number, now: number) {
    for (const [id, v] of this.projs) {
      v.x += v.p.vx * dt; v.y += v.p.vy * dt;
      v.s.setPosition(v.x, v.y);
      if (v.s.depth < 9000) v.s.setDepth(v.y + 40);
      if (v.n > 1) v.s.setFrame(`${v.anim}_${Math.floor((now - v.born) / 70) % v.n}`);
      if (now - v.trail > 45) {
        v.trail = now;
        if (v.p.spr === 'arrow' || v.p.spr === 'dagger') this.fx.play(this.fx.pick('arrow_trail'), v.x - v.p.vx * 0.03, v.y - v.p.vy * 0.03, { rot: v.s.rotation, tint: v.tint, alpha: 0.5, fps: 30, add: true }, this.animClock);
        else { this.sparks.setParticleTint(v.tint); this.sparks.emitParticleAt(v.x, v.y, 1); }
      }
      if (now - v.born > v.p.life * 1000 + 400) { v.s.destroy(); this.projs.delete(id); }
    }
  }
  private updateZoneFx(now: number) {
    for (const v of this.zfx.values()) {
      const z = v.z, g = v.g;
      const k = Phaser.Math.Clamp((now - v.born) / Math.max(1, z.dur * 1000), 0, 1);
      const col = z.hostile ? 0xff3838 : ELEMENT_COLOR[z.el];
      g.clear();
      if (v.rune) v.rune.rotation = ((z.hostile ? -1 : 1) * now) / 900;
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
          g.fillStyle(col, z.r > 150 ? 0.1 : 0.14).fillCircle(z.x, z.y, z.r);
          g.fillStyle(col, z.r > 150 ? 0.14 : 0.3).fillCircle(z.x, z.y, z.r * k);
          if (!v.rune) g.lineStyle(1, col, 0.85).strokeCircle(z.x, z.y, z.r);
        }
      } else {
        const pulse = 0.12 + 0.05 * Math.sin(now / 160);
        if (z.hostile) { g.fillStyle(col, pulse + 0.1).fillCircle(z.x, z.y, z.r); g.lineStyle(1, col, 0.8).strokeCircle(z.x, z.y, z.r); }
        else if (z.el === 'light' && z.dur < 4) { g.fillStyle(0xfff6c0, 0.3).fillCircle(z.x, z.y, z.r); g.lineStyle(2, 0xffffff, 0.9).strokeCircle(z.x, z.y, z.r); }
        else { g.fillStyle(col, pulse).fillCircle(z.x, z.y, z.r); if (!v.rune) g.lineStyle(1, col, 0.6).strokeCircle(z.x, z.y, z.r); }
        if (Math.random() < 0.25) { const a = Math.random() * 6.28, d = Math.random() * z.r; this.sparks.setParticleTint(col); this.sparks.emitParticleAt(z.x + Math.cos(a) * d, z.y + Math.sin(a) * d, 1); }
      }
    }
  }
  private updateObjs(now: number) {
    const c = store.state.char!;
    const refreshMarks = this.markerChar !== c;
    this.markerChar = c;
    const sn = (now + (this.timeOffset ?? 0)) / 1000;
    const anim = (name: string, period: number, fallback: number) => `${name}_${Math.floor(now / period) % (this.countFrames(name) || fallback)}`;
    for (const v of this.objs.values()) {
      const o = v.o;
      for (const s of v.shadows) if (!s.getData('off')) applyShadow(s, s.getData('x'), s.getData('y'), this.shadowAt(s.getData('x'), s.getData('y')));
      switch (o.type) {
        case 'npc': {
          const s = v.parts[0] as Phaser.GameObjects.Sprite;
          const d = Math.hypot(this.me.x - o.x, this.me.y - o.y);
          const [row, flip] = d < 60 ? dirOf(Math.atan2(this.me.y - o.y, this.me.x - o.x)) : [0, false];
          const f = String(row * 43 + (Math.floor((this.animClock + o.id * 137) / 200) % 4));
          s.setFrame(f).setFlipX(flip);
          v.shadows[0]?.setFrame(f).setFlipX(flip);
          if (refreshMarks) {
            const m = npcMarker(c, o.tag!);
            v.marker!.setVisible(!!m);
            if (m) v.marker!.setFrame(m === 'turnin' ? 'question' : m === 'offer' ? 'exclaim' : 'question_grey');
          }
          if (v.marker!.visible) v.marker!.y = o.y - 50 + Math.sin(now / 250) * 1.5;
          break;
        }
        case 'brazier': if (o.state) v.parts[0].setFrame(anim('brazier', 110, 3)); break;
        case 'stone': if (o.state) v.parts[0].setFrame(anim('quellstein', 150, 4)); break;
        case 'shard': if (!o.state) { v.parts[0].setFrame(anim('shard', 130, 4)); v.parts[0].y = o.y + 4 + Math.sin(now / 300) * 2; } break;
        case 'exit': if (o.props?.look === 'portal') v.parts[0].setFrame(anim('portal', 100, 4)); break;
        case 'spikes': {
          const pr = o.props!;
          const ph = ((sn + pr.offset) % pr.period) / pr.period;
          const n = this.countFrames('spikes') || 3;
          const f = ph >= 0.6 ? n - 1 : ph >= 0.5 ? Math.max(1, n - 2) : ph >= 0.42 ? 1 : 0;
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
    const shown = uiBlocksGame() ? null : prompt;
    if (st.prompt !== shown || st.nearStone !== nearStone) store.set({ prompt: shown, nearStone });
    if (input.pressed('interact')) this.doInteract();
  }
  private doInteract() {
    const t = this.target;
    if (!t || uiBlocksGame()) return;
    if (t instanceof PlayerView) { net.send({ t: 'revive', id: t.info.id }); this.me.play('interact', 380, true); return; }
    const o = t.o;
    audio.playSfx('ui_click');
    this.me.facing = Math.atan2(o.y - this.me.y, o.x - this.me.x);
    this.me.play('interact', 380, true);
    if (o.type === 'npc') { store.set({ dialog: { npc: o.tag! }, panel: null, prompt: null }); return; }
    if (o.type === 'board') { store.set({ dialog: { npc: 'ayla' }, panel: null, prompt: null }); return; }
    if (o.type === 'sign') { store.set({ sign: o.props?.text ?? '', prompt: null }); return; }
    net.send({ t: 'interact', id: o.id });
    if (o.type === 'stone') this.time.delayedCall(250, () => store.set({ panel: 'map', nearStone: true }));
  }
}
