/**
 * Lebendige Umgebung: Wetterpartikel, ziehende Wolkenschatten, Nebel, Lichtstrahlen, Kleintiere, Wasserglitzern,
 * Fußspuren im Schnee. Rein kosmetisch und clientseitig – der Server weiß davon nichts.
 */
import Phaser from 'phaser';
import type { GameMap } from '../../../shared/src/maps/mapgen';
import { T, TILE, isWalkableTile } from '../../../shared/src/maps/tiles';
import { settings } from '../state/settings';
import type { Fx } from './fxlib';

interface WeatherDef { frames: string[]; n: number; vx: number; vy: number; tint: number; alpha: number; add?: boolean; sway?: number; spin?: boolean; splash?: boolean }
const WEATHER: Record<string, WeatherDef> = {
  rain: { frames: ['raindrop'], n: 110, vx: -46, vy: 290, tint: 0xa8c8ff, alpha: 0.55, splash: true },
  leaves: { frames: ['leaf_0', 'leaf_1', 'leaf_2', 'leaf_3', 'petal_0', 'leaf'], n: 16, vx: 24, vy: 20, tint: 0xffffff, alpha: 0.95, sway: 16, spin: true },
  snow: { frames: ['snowflake_0', 'snowflake_1', 'snowflake_2', 'snowflake'], n: 80, vx: -8, vy: 30, tint: 0xffffff, alpha: 0.9, sway: 12 },
  blizzard: { frames: ['snowflake_0', 'snowflake_1', 'snowflake_2', 'snowflake'], n: 200, vx: -170, vy: 70, tint: 0xffffff, alpha: 0.85, sway: 6 },
  ash: { frames: ['ash_0', 'ash_1', 'mote'], n: 50, vx: 7, vy: 15, tint: 0xa09890, alpha: 0.75, sway: 9, spin: true },
  embers: { frames: ['ember_0', 'ember_1', 'ember'], n: 44, vx: 9, vy: -28, tint: 0xffffff, alpha: 0.95, add: true, sway: 11 },
  motes: { frames: ['mote'], n: 36, vx: 3, vy: -5, tint: 0xbfe8ff, alpha: 0.7, add: true, sway: 8 },
  spores: { frames: ['mote'], n: 30, vx: 4, vy: -6, tint: 0xb8ff90, alpha: 0.6, add: true, sway: 8 },
  void: { frames: ['void_mote_0', 'void_mote_1', 'void_mote_2', 'mote'], n: 46, vx: 0, vy: -15, tint: 0xffffff, alpha: 0.85, add: true, sway: 13 },
};
/** Dauerhafte, dezente Schwebeteilchen je Biom (zusätzlich zum Wetter) */
const AMBIENT_PARTICLES: Record<string, string> = { gruenwald: 'leaves', kristall: 'motes', glut: 'embers', frost: '', ruinen: 'motes', schatten: 'void' };
const FOG: Record<string, [number, number, number]> = { // [Farbe, Deckkraft Oberwelt, Deckkraft Dungeon]
  gruenwald: [0xd8f0e0, 0, 0.1], kristall: [0x9ac8ff, 0.2, 0.16], glut: [0xff9a70, 0.1, 0.14], frost: [0xe8f4ff, 0.16, 0.16], ruinen: [0xf0e4b8, 0.07, 0.12], schatten: [0xb090ff, 0.24, 0.2],
};

interface CritterDef { id: string; kind: 'flutter' | 'ground' | 'bird' | 'glow' | 'fish'; idle?: string; alt?: string; move: string; max: number; day?: boolean; night?: boolean; water?: boolean; speed: number }
const CRITTERS: Record<string, CritterDef[]> = {
  gruenwald: [
    { id: 'butterfly_a', kind: 'flutter', move: 'crit_butterfly_a', max: 4, day: true, speed: 16 },
    { id: 'butterfly_b', kind: 'flutter', move: 'crit_butterfly_b', max: 3, day: true, speed: 16 },
    { id: 'dragonfly', kind: 'flutter', move: 'crit_dragonfly', max: 2, day: true, water: true, speed: 30 },
    { id: 'bird', kind: 'bird', idle: 'crit_bird_idle', alt: 'crit_bird_peck', move: 'crit_bird_fly', max: 4, day: true, speed: 70 },
    { id: 'rabbit', kind: 'ground', idle: 'crit_rabbit_idle', move: 'crit_rabbit_hop', max: 2, day: true, speed: 78 },
    { id: 'squirrel', kind: 'ground', idle: 'crit_squirrel_idle', move: 'crit_squirrel_run', max: 2, day: true, speed: 90 },
    { id: 'frog', kind: 'ground', idle: 'crit_frog_idle', move: 'crit_frog_hop', max: 2, water: true, speed: 60 },
    { id: 'firefly', kind: 'glow', move: 'crit_firefly', max: 14, night: true, speed: 9 },
    { id: 'fish', kind: 'fish', move: 'crit_fish', max: 1, speed: 0 },
  ],
  kristall: [
    { id: 'glowbug', kind: 'glow', move: 'crit_glowbug', max: 12, speed: 8 },
    { id: 'cavebat', kind: 'flutter', move: 'crit_cavebat', max: 3, speed: 40 },
    { id: 'newt', kind: 'ground', idle: 'crit_newt_idle', move: 'crit_newt_run', max: 2, speed: 70 },
    { id: 'fish', kind: 'fish', move: 'crit_cavefish', max: 1, speed: 0 },
  ],
  glut: [
    { id: 'emberfly', kind: 'glow', move: 'crit_emberfly', max: 10, speed: 14 },
    { id: 'lizard', kind: 'ground', idle: 'crit_lizard_idle', move: 'crit_lizard_run', max: 3, speed: 95 },
    { id: 'lavafish', kind: 'fish', move: 'crit_lavapop', max: 2, speed: 0 },
  ],
  frost: [
    { id: 'hare', kind: 'ground', idle: 'crit_hare_idle', move: 'crit_hare_hop', max: 3, day: true, speed: 85 },
    { id: 'snowbird', kind: 'bird', idle: 'crit_snowbird_idle', alt: 'crit_snowbird_peck', move: 'crit_snowbird_fly', max: 3, day: true, speed: 70 },
    { id: 'sparkle', kind: 'glow', move: 'crit_icesparkle', max: 8, speed: 3 },
  ],
  ruinen: [
    { id: 'wisp', kind: 'glow', move: 'crit_wisp', max: 9, speed: 10 },
    { id: 'scarab', kind: 'ground', idle: 'crit_scarab_idle', move: 'crit_scarab_run', max: 3, speed: 60 },
    { id: 'moth', kind: 'flutter', move: 'crit_moth', max: 3, speed: 18 },
  ],
  schatten: [
    { id: 'shadowmoth', kind: 'flutter', move: 'crit_shadowmoth', max: 5, speed: 18 },
    { id: 'eyeling', kind: 'ground', idle: 'crit_eyeling_idle', move: 'crit_eyeling_run', max: 2, speed: 70 },
    { id: 'voidspark', kind: 'glow', move: 'crit_voidspark', max: 10, speed: 8 },
  ],
};

interface Critter { def: CritterDef; s: Phaser.GameObjects.Image; x: number; y: number; vx: number; vy: number; state: 'idle' | 'flee' | 'alt'; t: number; life: number; ang: number; n: number }
interface Flake { s: Phaser.GameObjects.Image; vx: number; vy: number; ph: number }

export class Ambient {
  private flakes: Flake[] = []; private weatherKind = '';
  private drift: Flake[] = [];
  private overlays: { ts: Phaser.GameObjects.TileSprite; kind: string; base: number }[] = [];
  private rays: Phaser.GameObjects.Image[] = [];
  private critters: Critter[] = [];
  private prints: { s: Phaser.GameObjects.Image; born: number }[] = [];
  private spawnAt = 0; private sparkleAt = 0;
  private obj: Phaser.Textures.Texture; private fxTex: Phaser.Textures.Texture;
  private frameCount = new Map<string, number>();

  constructor(private scene: Phaser.Scene, private map: GameMap, private fx: Fx, rayAnchors: { x: number; y: number }[]) {
    this.obj = scene.textures.get('obj'); this.fxTex = scene.textures.get('fx');
    for (const name of this.obj.getFrameNames()) { const m = /^(crit_.*)_(\d+)$/.exec(name); if (m) this.frameCount.set(m[1], Math.max(this.frameCount.get(m[1]) ?? 0, +m[2] + 1)); }
    const W = map.w * TILE, H = map.h * TILE, def = map.def, biome = map.biome;
    const addOverlay = (key: string, kind: string, alpha: number, tint?: number, depth = 8300) => {
      if (!scene.textures.exists(key) || alpha <= 0) return;
      const ts = scene.add.tileSprite(0, 0, W, H, key).setOrigin(0).setDepth(depth).setAlpha(alpha);
      if (tint !== undefined) ts.setTint(tint);
      this.overlays.push({ ts, kind, base: alpha });
    };
    if (!def.indoor) addOverlay('ov_cloud_shadow', 'cloud', 0.75);
    if (biome === 'gruenwald' && !map.dungeon) addOverlay('ov_leaf_shadow', 'leaf', 0.5);
    const fog = FOG[biome];
    if (fog) addOverlay('ov_fog', 'fog', map.dungeon ? fog[2] : fog[1], fog[0], 8350);
    if (!def.indoor && this.fxTex.has('godray')) for (const a of rayAnchors) {
      this.rays.push(scene.add.image(a.x - 14, a.y - 20, 'fx', 'godray').setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.ADD).setDepth(8200).setAlpha(0).setTint(0xfff4c8).setData('ph', (a.x * 13 + a.y * 7) % 100));
    }
    const amb = AMBIENT_PARTICLES[biome];
    if (amb && settings.weather) this.drift = this.makeFlakes(WEATHER[amb], 0.45);
  }

  private pickFrame(frames: string[], i: number): string | null {
    const have = frames.filter(f => this.fxTex.has(f));
    return have.length ? have[i % Math.max(1, have.length - (have.length > 1 && !have[have.length - 1].includes('_') ? 1 : 0))] : null;
  }
  private makeFlakes(W: WeatherDef | undefined, density = 1): Flake[] {
    const out: Flake[] = [];
    if (!W) return out;
    const view = this.scene.cameras.main.worldView;
    for (let i = 0; i < Math.round(W.n * density); i++) {
      const f = this.pickFrame(W.frames, i);
      if (!f) break;
      const s = this.scene.add.image(view.x + Math.random() * view.width, view.y + Math.random() * view.height, 'fx', f).setDepth(8400).setTint(W.tint).setAlpha(W.alpha * (0.5 + Math.random() * 0.5));
      if (W.add) s.setBlendMode(Phaser.BlendModes.ADD);
      if (f === 'raindrop') s.setRotation(Math.atan2(W.vy, W.vx) - Math.PI / 2);
      const k = 0.7 + Math.random() * 0.6;
      s.setData('def', W);
      out.push({ s, vx: W.vx * k, vy: W.vy * k, ph: Math.random() * 6.28 });
    }
    return out;
  }
  private moveFlakes(list: Flake[], dt: number, now: number, view: Phaser.Geom.Rectangle) {
    const m = 14;
    for (const w of list) {
      const W = w.s.getData('def') as WeatherDef;
      let x = w.s.x + (w.vx + (W.sway ? Math.sin(now / 700 + w.ph) * W.sway : 0)) * dt, y = w.s.y + w.vy * dt;
      let wrapped = false;
      if (x < view.x - m) { x += view.width + m * 2; wrapped = true; } else if (x > view.right + m) { x -= view.width + m * 2; wrapped = true; }
      if (y < view.y - m) { y += view.height + m * 2; wrapped = true; } else if (y > view.bottom + m) { y -= view.height + m * 2; wrapped = true; }
      if (W.spin) w.s.rotation = Math.sin(now / 400 + w.ph) * 1.2;
      if (W.splash && !wrapped && Math.random() < 0.004) this.fx.play('rain_splash', x, y, { depth: 5, tint: 0xc8dcff, alpha: 0.7, fps: 14 }, now);
      w.s.setPosition(x, y);
    }
  }

  private tileAt(x: number, y: number): number {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    return tx < 0 || ty < 0 || tx >= this.map.w || ty >= this.map.h ? T.VOID : this.map.tiles[ty * this.map.w + tx];
  }
  private nearLiquid(x: number, y: number): boolean {
    for (let dy = -24; dy <= 24; dy += 12) for (let dx = -24; dx <= 24; dx += 12) if (this.tileAt(x + dx, y + dy) === T.LIQUID) return true;
    return false;
  }
  private critFrames(name: string | undefined): number { return name ? this.frameCount.get(name) ?? 0 : 0; }

  private spawnCritter(view: Phaser.Geom.Rectangle, day: number, px: number, py: number) {
    const list = CRITTERS[this.map.biome];
    if (!list || this.map.dungeon) return;
    const def = list[Math.floor(Math.random() * list.length)];
    if (!this.critFrames(def.move)) return;
    if ((def.day && day < 0.5) || (def.night && day > 0.25)) return;
    if (this.critters.filter(c => c.def === def).length >= def.max) return;
    for (let k = 0; k < 6; k++) {
      const x = view.x - 30 + Math.random() * (view.width + 60), y = view.y - 30 + Math.random() * (view.height + 60);
      if (Math.hypot(x - px, y - py) < 80) continue;
      const t = this.tileAt(x, y);
      if (def.kind === 'fish') { if (t !== T.LIQUID) continue; }
      else if (def.kind === 'ground' || def.kind === 'bird') { if (!isWalkableTile(t) || t === T.PATH || t === T.BRIDGE || t === T.HAZARD || this.map.solid[Math.floor(y / TILE) * this.map.w + Math.floor(x / TILE)]) continue; }
      else if (t === T.VOID || t === T.WALL) continue;
      if (def.water && def.kind !== 'fish' && !this.nearLiquid(x, y)) continue;
      const first = def.idle && this.critFrames(def.idle) ? def.idle : def.move;
      const s = this.scene.add.image(x, y, 'obj', `${first}_0`).setOrigin(0.5, def.kind === 'ground' || def.kind === 'bird' ? 1 : 0.5).setDepth(def.kind === 'ground' || def.kind === 'bird' ? y : def.kind === 'fish' ? 5 : y + 60);
      if (def.kind === 'glow') s.setBlendMode(Phaser.BlendModes.ADD);
      s.setAlpha(0);
      this.critters.push({ def, s, x, y, vx: 0, vy: 0, state: 'idle', t: 0, life: 0, ang: Math.random() * 6.28, n: 0 });
      return;
    }
  }
  private updateCritters(dt: number, now: number, view: Phaser.Geom.Rectangle, px: number, py: number, day: number) {
    for (let i = this.critters.length - 1; i >= 0; i--) {
      const c = this.critters[i], d = c.def;
      c.t += dt; c.life += dt;
      let name = d.move, fps = 10, remove = false, alpha = Math.min(1, c.life * 2);
      const dp = Math.hypot(c.x - px, c.y - py);
      if (d.kind === 'flutter' || d.kind === 'glow') {
        c.ang += (Math.random() - 0.5) * dt * 5;
        c.x += Math.cos(c.ang) * d.speed * dt; c.y += (Math.sin(c.ang) * d.speed * 0.6 + Math.sin(now / 300 + c.ang) * 6) * dt;
        c.s.setFlipX(Math.cos(c.ang) < 0);
        fps = d.kind === 'glow' ? 3 : 14;
        if (d.kind === 'glow') alpha *= 0.55 + 0.45 * Math.sin(now / 420 + c.ang * 3);
        if (c.life > 40 || (d.day && day < 0.3) || (d.night && day > 0.4)) remove = true;
      } else if (d.kind === 'fish') {
        fps = 8;
        if (c.t * fps >= this.critFrames(d.move)) remove = true;
      } else {
        if (c.state !== 'flee' && dp < (d.kind === 'bird' ? 56 : 48)) {
          c.state = 'flee'; c.t = 0;
          const a = Math.atan2(c.y - py, c.x - px) + (Math.random() - 0.5) * 0.8;
          c.vx = Math.cos(a) * d.speed; c.vy = d.kind === 'bird' ? -Math.abs(Math.sin(a)) * d.speed * 0.6 - 30 : Math.sin(a) * d.speed;
        }
        if (c.state === 'flee') {
          c.x += c.vx * dt; c.y += c.vy * dt;
          c.s.setFlipX(c.vx < 0);
          fps = 12;
          if (d.kind !== 'bird' && c.t > 0.3) { const t = this.tileAt(c.x + c.vx * 0.1, c.y + c.vy * 0.1); if (!isWalkableTile(t)) { c.vx = -c.vx; c.vy = -c.vy; } }
          alpha = Math.max(0, 1 - Math.max(0, c.t - 1) / 0.8);
          if (c.t > 1.8) remove = true;
          if (d.kind === 'bird') c.s.setDepth(c.y + 80);
        } else {
          name = c.state === 'alt' && d.alt && this.critFrames(d.alt) ? d.alt : d.idle && this.critFrames(d.idle) ? d.idle : d.move;
          fps = c.state === 'alt' ? 6 : 2;
          if (c.t > 2 + (c.n % 3)) { c.t = 0; c.n++; c.state = c.state === 'idle' && Math.random() < 0.6 ? 'alt' : 'idle'; if (Math.random() < 0.3) c.s.setFlipX(!c.s.flipX); }
          if ((d.day && day < 0.3) || c.life > 60) { c.state = 'flee'; c.t = 0; c.vx = (Math.random() < 0.5 ? -1 : 1) * d.speed; c.vy = d.kind === 'bird' ? -40 : 0; }
        }
      }
      if (c.x < view.x - 90 || c.x > view.right + 90 || c.y < view.y - 90 || c.y > view.bottom + 90) remove = true;
      if (remove) { c.s.destroy(); this.critters.splice(i, 1); continue; }
      const n = this.critFrames(name);
      c.s.setFrame(`${name}_${Math.floor(c.t * fps) % Math.max(1, n)}`).setPosition(Math.round(c.x), Math.round(c.y)).setAlpha(alpha);
      if (d.kind === 'ground') c.s.setDepth(c.y);
    }
  }

  /** Fußabdruck (nur auf Schnee/Asche sinnvoll – die Szene entscheidet). */
  footprint(x: number, y: number, ang: number, side: number, tint: number, now: number) {
    if (!this.fxTex.has('footprint')) return;
    const s = this.scene.add.image(x - Math.sin(ang) * 2.5 * side, y + Math.cos(ang) * 2.5 * side, 'fx', 'footprint').setRotation(ang).setTint(tint).setAlpha(0.55).setDepth(3);
    this.prints.push({ s, born: now });
    if (this.prints.length > 90) this.prints.shift()!.s.destroy();
  }

  update(dt: number, now: number, weather: string, day: number, px: number, py: number) {
    const view = this.scene.cameras.main.worldView;
    const kind = settings.weather ? weather : 'clear';
    if (kind !== this.weatherKind) {
      this.weatherKind = kind;
      for (const f of this.flakes) f.s.destroy();
      this.flakes = this.makeFlakes(WEATHER[kind]);
    }
    this.moveFlakes(this.flakes, dt, now, view);
    this.moveFlakes(this.drift, dt, now, view);
    for (const o of this.overlays) {
      if (o.kind === 'cloud') { o.ts.tilePositionX = -now / 260; o.ts.tilePositionY = -now / 700; o.ts.setAlpha(o.base * day * (weather === 'rain' || weather === 'blizzard' ? 0.3 : 1)); }
      else if (o.kind === 'leaf') { o.ts.tilePositionX = Math.sin(now / 2300) * 3; o.ts.tilePositionY = Math.cos(now / 3100) * 2; o.ts.setAlpha(o.base * day); }
      else { o.ts.tilePositionX = now / 190; o.ts.tilePositionY = Math.sin(now / 5000) * 20; o.ts.setAlpha(o.base * (weather === 'blizzard' ? 2.2 : 1) * (o.base < 0.12 && !this.map.dungeon ? 1 + (1 - day) : 1)); }
      o.ts.setVisible(o.ts.alpha > 0.01 && settings.weather);
    }
    for (const r of this.rays) r.setAlpha(settings.lighting ? day * (weather === 'clear' || weather === 'leaves' ? 1 : 0.2) * (0.1 + 0.06 * Math.sin(now / 1700 + (r.getData('ph') as number))) : 0);
    if (settings.weather) {
      if (now > this.spawnAt) { this.spawnAt = now + 450; this.spawnCritter(view, day, px, py); }
      // Glitzern auf Flüssigkeiten
      if (now > this.sparkleAt) {
        this.sparkleAt = now + 130;
        const x = view.x + Math.random() * view.width, y = view.y + Math.random() * view.height;
        if (this.tileAt(x, y) === T.LIQUID && this.tileAt(x, y - 6) === T.LIQUID) {
          const lava = this.map.biome === 'glut';
          if (Math.random() < 0.3 && this.fx.has('ripple') && !lava) this.fx.play('ripple', x, y, { depth: -5, tint: 0xd8ffff, alpha: 0.6, fps: 6 }, now);
          else this.fx.play(this.fx.pick('sparkle', 'star'), x, y, { depth: -5, tint: lava ? 0xffe890 : 0xffffff, add: true, fps: 9 }, now);
        }
      }
    }
    this.updateCritters(dt, now, view, px, py, day);
    for (let i = this.prints.length - 1; i >= 0; i--) {
      const p = this.prints[i], age = (now - p.born) / 9000;
      if (age >= 1) { p.s.destroy(); this.prints.splice(i, 1); } else p.s.setAlpha(0.55 * (1 - age));
    }
  }
}
