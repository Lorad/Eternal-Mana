/**
 * Eine Zonen-Instanz: autoritative Simulation von Spielern, Gegnern, Geschossen, Flächeneffekten und Objekten.
 */
import { angleDiff, circleFree, distToSegment, lineClear, moveCircle } from '../../shared/src/collision';
import { CFG } from '../../shared/src/config';
import { CLASSES } from '../../shared/src/data/classes';
import { BOSSES, ENEMIES, type EnemyDef } from '../../shared/src/data/enemies';
import { ITEMS, TIER_MATERIAL, generateGear, itemName, makeStack, rollRarity, tierOf } from '../../shared/src/data/items';
import { SKILLS, skillCd, skillMp, type Effect } from '../../shared/src/data/skills';
import { ELEM_STATUS, affinityMul, resistFactor } from '../../shared/src/elements';
import { kreisBossDef, kreisLevel, kreisZoneDef } from '../../shared/src/data/rifts';
import { mythicKreisBoss, rarityTable } from '../../shared/src/rarity';
import { NODE_TYPES, ZONES, type ZoneDef } from '../../shared/src/data/zones';
import { getMap, type GameMap, type MobSpawn } from '../../shared/src/maps/mapgen';
import { T, TILE } from '../../shared/src/maps/tiles';
import { Anim, FLAG_ELITE, FLAG_INVULN, STATUS_BIT } from '../../shared/src/types';
import type { DropInfo, Element, GameEvent, ItemInstance, MobInfo, ObjInfo, ProjInfo, SnapMob, SnapPlayer, StatusId, StatusSpec, ZoneFx, ZoneInit } from '../../shared/src/types';
import { Rng } from '../../shared/src/util/rng';
import { BossCtl } from './boss';
import { cookFires } from './craft';
import type { Game } from './game';
import { Home } from './home';
import { chestExtras, nodeBonus, rollMaterials } from './loot';
import { Player, nextId, type StatusState } from './player';
import { Story } from './story';
import { legendAttack, legendOnHit, legendShield, tryReaction } from './react';
import * as GearFx from './gearfx';
import { Rift, riftStones, type RiftRun } from './rift';
import { Social } from './social';
import { World } from './world';

export interface Obj extends ObjInfo {
  looted?: Set<number>;
  harvested?: Map<number, number>;
  activeUntil?: number;
  nextFire?: number;
  dynamic?: boolean;
}

export class Mob {
  id = nextId();
  x: number; y: number; hx: number; hy: number;
  hp: number; maxHp: number; dmg: number; baseDmg: number; defv: number;
  element: Element; radius: number; speed: number;
  state: 'idle' | 'chase' | 'windup' | 'charge' | 'recover' | 'return' = 'idle';
  t = 0; target: Player | null = null; facingLeft = 0; anim = Anim.Idle;
  statuses = new Map<StatusId, StatusState>();
  aimX = 1; aimY = 0; wanderT = 0; wx = 0; wy = 0; cdUntil = 0; blinkAt = 0; hopT = 0;
  awake = false; dead = false; scaled = false; hurtUntil = 0;
  kx = 0; ky = 0;
  /** 0.4: frühester Zeitpunkt der nächsten Reaktion / Mal-Detonation; Schutz vor erneutem Festsetzen */
  reactAt = 0; detAt = 0; ccImmuneUntil = 0;
  hitters = new Set<Player>();
  chargeHit = new Set<number>();
  boss: BossCtl | null = null;
  vuln = 1; invuln = false; hidden = false;
  /** 0.6: `tough` = lässt sich nicht festsetzen (seltene Monster, Weltbosse) · `ownScale` = Leben skaliert das Weltereignis selbst */
  tough = false; ownScale = false;
  name: string;
  summoned = false;
  /** 0.5 (Mana-Risse): Faktor auf die Angriffspause, eigene Schwächen/Resistenzen statt derer der Art, Einfärbung */
  cdMul = 1; weakO?: Element[]; resistO?: Element[]; tint?: number;
  constructor(public def: EnemyDef, public lvl: number, x: number, y: number, public elite: boolean, public group: number, public spawnIdx: number) {
    this.x = this.hx = x; this.y = this.hy = y;
    this.maxHp = Math.round(CFG.enemy.hp(lvl) * def.hpMul * (elite ? CFG.enemy.eliteHpMul : 1));
    this.hp = this.maxHp;
    this.dmg = this.baseDmg = CFG.enemy.dmg(lvl) * def.dmgMul * (elite ? CFG.enemy.eliteDmgMul : 1);
    this.defv = CFG.enemy.def(lvl) * def.defMul;
    this.element = def.element; this.radius = def.radius * (elite ? 1.15 : 1); this.speed = def.speed;
    this.name = (elite ? 'Erwachter ' : '') + def.name;
  }
  info(): MobInfo {
    return { id: this.id, mob: this.def.id, lvl: this.lvl, maxHp: this.maxHp, hp: this.hp, x: Math.round(this.x), y: Math.round(this.y), elite: this.elite || undefined, boss: this.boss ? true : undefined, name: this.name, tint: this.tint };
  }
  flags(now: number): number {
    let f = this.elite ? FLAG_ELITE : 0;
    for (const [id, st] of this.statuses) if (st.until > now) f |= STATUS_BIT[id];
    if (this.invuln) f |= FLAG_INVULN;
    return f;
  }
  has(id: StatusId, now: number) { const s = this.statuses.get(id); return !!s && s.until > now; }
}

interface Proj {
  id: number; x: number; y: number; vx: number; vy: number; life: number; r: number;
  hostile: boolean; owner?: Player; lvl: number; raw: number; el: Element;
  pierce: number; explode?: number; status?: StatusSpec; hit: Set<number>; mpGain?: number; critBonus?: number; by: string;
}
interface FxZone extends ZoneFx {
  until: number; tick?: number; nextTick?: number; raw: number; owner?: Player; lvl: number; status?: StatusSpec;
  healAllies?: number; follow?: Player; by: string; safeSpots?: { x: number; y: number; r: number }[];
}
interface Drop { id: number; x: number; y: number; owner: Player; item?: ItemInstance; gold?: number; until: number }

const HAZARD_ELEMENT: Record<string, Element> = { gruenwald: 'earth', kristall: 'light', glut: 'fire', frost: 'water', ruinen: 'wind', schatten: 'dark' };

export class Zone {
  id: string;
  map: GameMap;
  players = new Map<number, Player>();
  mobs = new Map<number, Mob>();
  projs = new Map<number, Proj>();
  objs = new Map<number, Obj>();
  fx = new Map<number, FxZone>();
  drops = new Map<number, Drop>();
  events: GameEvent[] = [];
  blocked = new Set<number>();
  weather = 'clear'; weatherUntil = 0;
  emptySince = 0;
  keys = 0;
  boss: BossCtl | null = null;
  respawns: { idx: number; at: number }[] = [];
  rng = new Rng((Math.random() * 1e9) | 0);
  private flow = new Map<number, { tx: number; ty: number; d: Int16Array }>();
  private flowAt = 0;
  private puzzle: { chest: Obj; kind: string; order?: number[]; bits?: number[]; count?: number; time?: number; progress: number; solved: boolean } | null = null;
  private secretFound = false;
  // ---- 0.5 Endspiel: Instanzen. `key` = Schlüssel in Game.zones (weicht bei Riss- und Kreis-Instanzen von `id` ab)
  key: string;
  /** Neuer Kreis dieser Welt (0 = erster Durchgang): hebt Gegner-, Boss- und Beutestufen */
  kreis = 0;
  /** laufender Mana-Riss, falls diese Instanz einer ist (server/src/rift.ts) */
  rift: RiftRun | null = null;
  /** wohin ein Charakter gespeichert wird, der diese Instanz nicht wieder betreten kann (Riss) */
  home: { zone: string; x: number; y: number } | null = null;
  /** höchste Gegenstandsstufe aus Truhen */
  ilvlCap = CFG.player.maxLevel;
  /** Kampfregeln, die Riss-Modifikatoren verändern (neutral = 1) */
  mod = { dmgTaken: 1, cd: 1, heal: 1, mpRegen: 1, mpGain: 1, aggro: 1 };

  constructor(public game: Game, public def: ZoneDef, opt: { key?: string; kreis?: number; rift?: RiftRun } = {}) {
    this.id = def.id;
    this.key = opt.key ?? def.id;
    this.kreis = opt.kreis ?? 0;
    this.rift = opt.rift ?? null;
    if (this.kreis > 0) { this.def = def = kreisZoneDef(def, this.kreis); this.ilvlCap = 99; }
    this.map = getMap(def.id);
    for (const o of this.map.objects) {
      if (this.rift && (o.type === 'npc' || o.type === 'shrine' || o.type === 'rift')) continue; // im Riss gibt es keine Geschichte
      const obj: Obj = { id: nextId(), type: o.type, x: o.x, y: o.y, state: 0, tag: o.tag, props: o.props ? { ...o.props, sid: o.id } : { sid: o.id } };
      if (obj.type === 'chest' && this.map.dungeon) obj.looted = new Set();
      if (obj.type === 'node') obj.harvested = new Map();
      if (obj.type === 'chest' && obj.props?.puzzle) this.puzzle = { chest: obj, ...obj.props.puzzle, progress: 0, solved: false };
      this.objs.set(obj.id, obj);
      this.setBlock(obj, true);
    }
    for (const f of cookFires(this.map)) this.objs.set(f.id, f);
    for (const f of riftStones(this.map)) this.objs.set(f.id, f);
    for (const f of Home.signs(this.map)) this.objs.set(f.id, f); // 0.7: Wegweiser zum Hof
    if (!this.rift) this.map.spawns.forEach((s, i) => this.spawnFrom(s, i));
    if (def.boss && this.map.bossRoom) this.boss = new BossCtl(this, this.rift ? Rift.bossDef(this.rift) : kreisBossDef(BOSSES[def.boss], this.kreis), this.map.bossRoom);
    if (this.rift) Rift.setup(this);
    this.weather = this.rng.weighted(World.weathers(this));
    this.weatherUntil = game.now + this.rng.range(CFG.world.weatherMinSec, CFG.world.weatherMaxSec);
    this.emptySince = game.now;
  }

  // ------------------------------------------------------------------ Hilfen
  ev(e: GameEvent) { this.events.push(e); }
  private oob(tx: number, ty: number) { return tx < 0 || ty < 0 || tx >= this.map.w || ty >= this.map.h; }
  solidWalk = (tx: number, ty: number) => this.oob(tx, ty) || this.map.solid[ty * this.map.w + tx] !== 0 || this.blocked.has(ty * this.map.w + tx);
  solidFly = (tx: number, ty: number) => this.oob(tx, ty) || this.map.solid[ty * this.map.w + tx] === 2 || this.blocked.has(ty * this.map.w + tx);
  tileAt(x: number, y: number): number { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); return this.oob(tx, ty) ? T.VOID : this.map.tiles[ty * this.map.w + tx]; }
  private setBlock(o: Obj, on: boolean) {
    if (o.type !== 'door' && o.type !== 'bossdoor' && o.type !== 'boulder') return;
    for (const c of (o.props?.cells ?? []) as number[]) { if (on) this.blocked.add(c); else this.blocked.delete(c); }
  }
  setObjState(o: Obj, state: number, props?: Record<string, any>) {
    o.state = state;
    this.setBlock(o, state === 0);
    this.ev({ k: 'obj', id: o.id, state, props });
  }
  alivePlayers(): Player[] { return [...this.players.values()].filter(p => !p.dead && !p.linkdead); }
  inRoom(room: { x0: number; y0: number; x1: number; y1: number }, x: number, y: number, pad = 0) {
    return x >= (room.x0 + pad) * TILE && x < (room.x1 + 1 - pad) * TILE && y >= (room.y0 + pad) * TILE && y < (room.y1 + 1 - pad) * TILE;
  }

  private spawnFrom(s: MobSpawn, idx: number): Mob {
    const elite = !!s.elite || this.rng.chance(CFG.enemy.eliteChance);
    const m = new Mob(ENEMIES[s.mob], kreisLevel(s.lvl, this.kreis), s.x, s.y, elite, s.group, idx);
    this.mobs.set(m.id, m);
    return m;
  }
  spawnMob(mobId: string, lvl: number, x: number, y: number, summoned = true): Mob {
    const m = new Mob(ENEMIES[mobId], lvl, x, y, false, -1, -1);
    m.summoned = summoned; m.awake = true;
    if (this.rift) Rift.tune(this, m);
    this.mobs.set(m.id, m);
    this.ev({ k: 'mob+', m: m.info() });
    this.ev({ k: 'fx', n: 'spawn', x, y, el: m.element });
    return m;
  }

  // ------------------------------------------------------------------ Spieler betreten/verlassen
  objStateFor(o: Obj, p: Player): number {
    switch (o.type) {
      case 'chest': return (o.looted ? o.looted.has(p.charId) : p.char.flags[`c:${this.id}:${o.props!.sid}`]) ? 1 : 0;
      case 'shard': return p.char.flags[`s:${this.id}:${o.tag}`] ? 1 : 0;
      case 'stone': return p.char.flags[`t:${this.id}`] ? 1 : 0;
      case 'node': return (o.harvested!.get(p.charId) ?? 0) > this.game.now ? 1 : 0;
      default: return World.objState(o, p) ?? Story.objState(o, p) ?? o.state;
    }
  }
  objInfo(o: Obj, p: Player): ObjInfo { return { id: o.id, type: o.type, x: o.x, y: o.y, state: this.objStateFor(o, p), tag: o.tag, props: o.props }; }
  initFor(p: Player): ZoneInit {
    return {
      zone: this.id, x: p.x, y: p.y, epoch: p.epoch, you: p.id,
      players: [...this.players.values()].filter(q => q !== p).map(q => this.game.playerInfo(q)),
      mobs: [...this.mobs.values()].filter(m => !m.dead && !m.hidden).map(m => m.info()),
      objs: [...this.objs.values()].map(o => this.objInfo(o, p)),
      drops: [...this.drops.values()].filter(d => d.owner === p).map(d => this.dropInfo(d)),
      zones: [...this.fx.values()].map(z => this.fxInfo(z)),
      weather: this.weather, tod: this.game.tod(),
      boss: this.boss?.active ? { id: this.boss.mob.id, name: this.boss.def.name, phase: this.boss.phase, el: this.boss.mob.element } : undefined,
      rift: this.rift ? Rift.info(this) : undefined, kreis: this.kreis || undefined, heim: Home.init(this, p),
    };
  }
  addPlayer(p: Player, x: number, y: number) {
    if (!circleFree(this.solidWalk, x, y, CFG.player.radius)) { x = this.map.start.x; y = this.map.start.y; }
    p.zone = this; p.x = x; p.y = y; p.epoch++; p.budget = 0; p.lastMoveAt = this.game.now;
    p.exitImmuneUntil = this.game.now + 1.5;
    p.iframesUntil = Math.max(p.iframesUntil, this.game.now + 1.5);
    for (const q of this.players.values()) q.pev.push({ k: 'pl+', p: this.game.playerInfo(p) });
    this.players.set(p.id, p);
    if (!p.char.flags[`z:${this.id}`]) {
      p.char.flags[`z:${this.id}`] = 1; p.sync('flags');
      if (this.id === 'schatten') this.game.story(p, 'schatten');
    }
    World.onJoin(this, p);
  }
  removePlayer(p: Player) {
    this.players.delete(p.id);
    this.flow.delete(p.id);
    for (const q of this.players.values()) q.pev.push({ k: 'pl-', id: p.id });
    for (const [id, d] of this.drops) if (d.owner === p) this.drops.delete(id);
    for (const m of this.mobs.values()) { if (m.target === p) m.target = null; m.hitters.delete(p); }
    if (!this.players.size) this.emptySince = this.game.now;
  }

  // ------------------------------------------------------------------ Schaden
  /** `el`/`by`: Element und Urheber des auslösenden Treffers – daran hängen die Reaktionen (server/src/react.ts). */
  applyStatusMob(m: Mob, s: StatusSpec, srcDmg: number, el?: Element, by?: Player) {
    if (s.chance !== undefined && !this.rng.chance(s.chance)) return;
    let dur = s.dur;
    const now = this.game.now;
    const cc = s.id === 'freeze' || s.id === 'root';
    // Bosse lassen sich nicht festsetzen; alle anderen nicht pausenlos
    if (m.boss || m.tough) { if (s.id === 'stun' || cc) return; if (s.id === 'slow') dur *= 0.5; }
    if (cc) { if (now < m.ccImmuneUntil) return; if (m.elite) dur *= CFG.elements.eliteCcMul; m.ccImmuneUntil = now + dur + CFG.elements.freezeImmuneSec; }
    const dps = s.id === 'burn' ? srcDmg * CFG.combat.burnTick : s.id === 'poison' ? srcDmg * CFG.combat.poisonTick : 0;
    const old = m.statuses.get(s.id);
    const tag = !!el && el !== 'phys';
    m.statuses.set(s.id, { until: Math.max(old?.until ?? 0, now + dur), dps: Math.max(old && old.until > now ? old.dps : 0, dps), el: tag ? el : old?.el, by: tag ? by : old?.by });
  }
  /** `extra`: Folgetreffer (Reaktion, Abpraller, Schockwelle) – nie kritisch, löst weder Zustände noch weitere Folgen aus. */
  hitMob(m: Mob, src: Player | null, raw: number, el: Element, o: { crit?: number; status?: StatusSpec; kb?: number; ang?: number; dot?: boolean; extra?: boolean } = {}): number {
    if (m.dead || m.invuln || m.hidden) return 0;
    const now = this.game.now;
    let dmg = raw * (o.dot ? 1 : 1 + this.rng.range(-CFG.combat.variance, CFG.combat.variance));
    let crit = false;
    const cb = src && !o.dot && !o.extra ? GearFx.critBonus(src, now) : null; // 0.9: Stille vor dem Sturm
    if (src && !o.dot && !o.extra && this.rng.chance(src.stats.crit + (o.crit ?? 0) + (cb?.crit ?? 0) + (m.has('expose', now) ? CFG.combat.exposeCrit : 0))) { crit = true; dmg *= src.stats.critDmg + (cb?.critDmg ?? 0); GearFx.onCrit(src); }
    const adef = m.boss?.def ?? m.def;
    dmg *= affinityMul(el, { element: m.element, weak: m.weakO ?? adef.weak, resist: m.resistO ?? adef.resist });
    if (el !== 'phys' && src) dmg *= (1 + src.stats.elemPct / 100) * (el === src.stats.attackElement ? 1 + CFG.craft.infuseDmg[src.stats.elemLvl] : 1);
    if (m.has('mark', now)) dmg *= CFG.combat.markDmgTaken;
    if (src) dmg *= GearFx.dealtMul(src); // 0.9: Hohle Krone
    if (src && src.statuses.get('weak') && src.statuses.get('weak')!.until > now) dmg *= CFG.combat.weakDmgDealt;
    if (!o.dot) dmg *= 1 - CFG.combat.mitigation(m.defv, src?.level ?? m.lvl);
    dmg *= m.vuln;
    dmg = Math.max(1, Math.round(dmg));
    m.hp -= dmg;
    m.awake = true;
    if (src) {
      m.hitters.add(src);
      if (!m.target && !m.boss) { m.target = src; if (m.state === 'idle' || m.state === 'return') m.state = 'chase'; }
      const ls = GearFx.lifesteal(src);
      if (ls > 0 && !o.dot) src.heal(dmg * ls / 100, false);
    }
    this.ev({ k: 'dmg', id: m.id, a: dmg, c: crit ? 1 : undefined, el, x: Math.round(m.x), y: Math.round(m.y) });
    if (!o.dot) {
      m.hurtUntil = now + 0.15;
      if (src && !o.extra) {
        tryReaction(this, m, src, el);
        legendOnHit(this, m, src, el, raw, crit);
        const proc = CFG.combat.elemProc[el] * (el === src.stats.attackElement ? CFG.craft.infuseProc[src.stats.elemLvl] : 1);
        if (o.status) this.applyStatusMob(m, o.status, dmg, el, src);
        else if (ELEM_STATUS[el] && this.rng.chance(proc)) this.applyStatusMob(m, ELEM_STATUS[el]!, dmg, el, src);
      } else if (!src && o.status) this.applyStatusMob(m, o.status, dmg);
      if (o.kb && !m.boss && o.ang !== undefined) { const k = o.kb * (el === 'wind' ? 1.6 : 1); m.kx = Math.cos(o.ang) * k; m.ky = Math.sin(o.ang) * k; }
    }
    if (m.hp <= 0 && m.boss?.spare()) return dmg; // Story-Bosse ergeben sich, statt zu sterben
    if (m.hp <= 0) { this.killMob(m); if (src && !o.extra) GearFx.onKill(this, src, m); }
    return dmg;
  }
  hitPlayer(p: Player, raw: number, el: Element, lvl: number, by: string, status?: StatusSpec): number {
    const now = this.game.now;
    if (p.dead || p.linkdead || p.god) return 0;
    if (now < p.iframesUntil) { if (now < p.rollUntil) this.ev({ k: 'txt', x: p.x, y: p.y - 20, s: 'Ausgewichen', col: '#bfe9ff' }); return 0; }
    let dmg = raw * (1 + this.rng.range(-CFG.combat.variance, CFG.combat.variance));
    dmg *= 1 - CFG.combat.mitigation(p.stats.def, lvl);
    dmg *= resistFactor(p.stats.res[el] ?? 0) * this.mod.dmgTaken * GearFx.takenMul(this, p);
    if (p.statuses.get('mark') && p.statuses.get('mark')!.until > now) dmg *= CFG.combat.markDmgTaken;
    if (p.hasStatus('expose', now)) dmg *= CFG.combat.exposeDmgTaken;
    dmg = Math.max(1, Math.round(dmg));
    for (const b of p.buffs) {
      if (b.shield <= 0 || dmg <= 0) continue;
      const a = Math.min(b.shield, dmg);
      b.shield -= a; dmg -= a;
      if (a > 0) this.ev({ k: 'txt', x: p.x, y: p.y - 22, s: 'Absorbiert', col: '#ffe9a0' });
    }
    if (dmg <= 0) return 0;
    p.hp -= dmg; p.lastHurtAt = now;
    if (now >= p.animUntil) p.setAnim(Anim.Hurt, 0.2);
    this.ev({ k: 'dmg', id: p.id, a: dmg, el, pl: 1, x: Math.round(p.x), y: Math.round(p.y) });
    if (status && (status.chance === undefined || this.rng.chance(status.chance))) {
      const dps = status.id === 'burn' ? dmg * CFG.combat.burnTick : status.id === 'poison' ? dmg * CFG.combat.poisonTick : 0;
      p.statuses.set(status.id, { until: now + status.dur * GearFx.statusDurMul(p), dps });
    }
    if (p.hp <= 0) this.killPlayer(p, by);
    else GearFx.afterHurt(this, p, now);
    return dmg;
  }
  killPlayer(p: Player, by: string) {
    p.hp = 0; p.dead = true; p.char.deaths++;
    p.statuses.clear(); p.buffs = p.buffs.filter(b => b.keep); p.buffsDirty = true; p.recalc();
    const loss = Math.floor(p.char.gold * CFG.player.deathGoldLoss);
    p.char.gold -= loss; p.sync('gold', 'deaths');
    p.send({ t: 'dead', by });
    if (loss > 0) p.toast(`Du verlierst ${loss} Gold.`, 'bad');
    this.ev({ k: 'sfx', n: 'player_die', x: p.x, y: p.y });
    for (const m of this.mobs.values()) if (m.target === p) m.target = null;
  }

  killMob(m: Mob) {
    if (m.dead) return;
    m.dead = true;
    this.mobs.delete(m.id);
    this.ev({ k: 'mob-', id: m.id, died: 1 });
    if (m.boss) { m.boss.onDeath(); return; }
    Story.onMobDeath(this, m);
    if (this.rift) Rift.onMobDeath(this, m);
    if (m.spawnIdx >= 0 && !this.map.dungeon) this.respawns.push({ idx: m.spawnIdx, at: this.game.now + CFG.enemy.respawnSec });
    const rec = this.recipients(m);
    World.onMobDeath(this, m, rec);
    Home.onKill(this, m, rec); // 0.7: Bestiarium
    const xpBase = CFG.enemy.xp(m.lvl) * m.def.xpMul * (m.elite ? 3 : 1) * (m.summoned ? 0.25 : 1) * (1 + CFG.combat.partyXpBonus * (rec.length - 1));
    for (const p of rec) {
      p.char.kills++; p.sync('kills');
      p.gainXp(xpBase * CFG.enemy.xpLevelPenalty(p.level, m.lvl));
      p.questEvent({ t: 'kill', mob: m.def.id, zone: this.id });
      if (!m.summoned) this.rollLoot(p, m);
    }
  }
  private recipients(m: Mob): Player[] {
    const set = new Set<Player>();
    for (const p of m.hitters) if (this.players.has(p.id)) {
      set.add(p);
      if (p.party) for (const q of p.party.members) if (q.zone === this && Math.hypot(q.x - m.x, q.y - m.y) < CFG.combat.partyXpRadius) set.add(q);
    }
    return [...set];
  }
  private rollLoot(p: Player, m: Mob) {
    const L = CFG.loot, r = this.rng;
    const at = () => [m.x + r.range(-10, 10), m.y + r.range(-8, 8)] as const;
    if (r.chance(m.elite ? 1 : 0.5)) {
      const g = Math.max(1, Math.round(CFG.enemy.gold(m.lvl) * r.range(0.7, 1.3) * (m.elite ? 4 : 1) * (1 + p.stats.goldPct / 100)));
      this.dropGoldFor(p, g, ...at());
    }
    if (r.chance(m.elite ? L.eliteGearChance : L.gearChance)) {
      const it = generateGear(r, this.rift ? this.rift.ilvl : m.lvl + (m.elite ? 1 : 0), rollRarity(r, m.elite ? L.eliteRarityWeights : L.rarityWeights), p.char.cls);
      this.dropItemFor(p, it, ...at());
    }
    if (r.chance(L.potionChance)) {
      const tier = m.lvl <= 8 ? 1 : m.lvl <= 20 ? 2 : 3;
      this.dropItemFor(p, makeStack(r.chance(0.6) ? `potion_hp${tier}` : `potion_mp${tier}`), ...at());
    }
    for (const [item, ch] of m.def.drops ?? []) {
      if (ITEMS[item].kind === 'quest' && !p.needsQuestItem(item)) continue;
      if (r.chance(ch * (m.elite ? 2 : 1))) this.dropItemFor(p, makeStack(item), ...at());
    }
    rollMaterials(this, p, m);
  }
  dropInfo(d: Drop): DropInfo {
    if (d.item) { const b = ITEMS[d.item.base]; return { id: d.id, x: d.x, y: d.y, kind: 'item', icon: b.icon, rarity: d.item.rarity, name: itemName(d.item) }; }
    return { id: d.id, x: d.x, y: d.y, kind: 'gold', icon: 'gold', rarity: 0, name: `${d.gold} Gold` };
  }
  dropItemFor(p: Player, item: ItemInstance, x: number, y: number) {
    const d: Drop = { id: nextId(), x: Math.round(x), y: Math.round(y), owner: p, item, until: this.game.now + CFG.loot.dropLifetimeSec };
    this.drops.set(d.id, d); p.send({ t: 'drop+', d: this.dropInfo(d) });
  }
  dropGoldFor(p: Player, gold: number, x: number, y: number) {
    const d: Drop = { id: nextId(), x: Math.round(x), y: Math.round(y), owner: p, gold, until: this.game.now + CFG.loot.dropLifetimeSec };
    this.drops.set(d.id, d); p.send({ t: 'drop+', d: this.dropInfo(d) });
  }

  // ------------------------------------------------------------------ Spieleraktionen
  private breakBoulder(o: Obj, p: Player | null) {
    if (o.state !== 0) return;
    this.setObjState(o, 1);
    this.ev({ k: 'sfx', n: 'wall_break', x: o.x, y: o.y });
    this.ev({ k: 'fx', n: 'rubble', x: o.x, y: o.y });
    if (!this.secretFound) {
      this.secretFound = true;
      for (const q of this.players.values()) q.toast('Ein verborgener Durchgang!', 'good');
      this.ev({ k: 'sfx', n: 'secret' });
    }
    if (p) { p.char.flags[`x:${this.id}:${o.props!.sid}`] = 1; p.sync('flags'); }
  }
  private arcHit(p: Player, ang: number, range: number, arcDeg: number, raw: number, el: Element, o: { kb?: number; status?: StatusSpec; crit?: number }): number {
    let total = 0;
    const half = (arcDeg * Math.PI) / 360;
    for (const m of [...this.mobs.values()]) {
      const d = Math.hypot(m.x - p.x, m.y - p.y);
      if (d - m.radius > range) continue;
      const a = Math.atan2(m.y - p.y, m.x - p.x);
      if (d > m.radius + 6 && angleDiff(a, ang) > half) continue;
      total += this.hitMob(m, p, raw, el, { ...o, ang: a });
    }
    for (const ob of this.objs.values()) if (ob.type === 'boulder' && ob.state === 0 && Math.hypot(ob.x - p.x, ob.y - p.y) < range + 14) this.breakBoulder(ob, p);
    return total;
  }
  spawnProj(pr: Omit<Proj, 'id' | 'hit'>, spr: string) {
    const id = nextId();
    const p: Proj = { ...pr, id, hit: new Set() };
    this.projs.set(id, p);
    const info: ProjInfo = { id, spr, x: Math.round(p.x), y: Math.round(p.y), vx: Math.round(p.vx), vy: Math.round(p.vy), el: p.el, life: p.life, r: p.r, hostile: p.hostile, o: p.owner?.char.look?.w ? p.owner.id : undefined };
    this.ev({ k: 'proj+', p: info });
    return p;
  }
  addFx(z: Omit<FxZone, 'id'>): FxZone {
    const f: FxZone = { ...z, id: nextId() };
    this.fx.set(f.id, f);
    this.ev({ k: 'zone+', z: this.fxInfo(f) });
    return f;
  }
  private fxInfo(z: FxZone): ZoneFx {
    return { id: z.id, kind: z.kind, x: Math.round(z.x), y: Math.round(z.y), r: z.r, el: z.el, dur: Math.max(0, z.until - this.game.now), hostile: z.hostile, shape: z.shape, x2: z.x2, y2: z.y2, w: z.w };
  }

  playerAttack(p: Player, ang: number) {
    const now = this.game.now;
    if (p.dead || p.stunned(now) || now < p.atkReadyAt - 0.06 || now < p.rollUntil) return;
    if (!isFinite(ang)) return;
    const cls = CLASSES[p.char.cls], atk = cls.attack;
    p.atkReadyAt = now + atk.cooldown * GearFx.attackCdMul(p);
    p.combo = now - p.comboAt < CFG.player.comboWindow + atk.cooldown ? (p.combo + 1) % 3 : 0;
    p.comboAt = now;
    const fin = p.combo === 2 && atk.kind === 'arc';
    const raw = p.stats.power * atk.mult * (fin ? CFG.player.comboFinisherMul : 1) * GearFx.attackMul(p);
    const el = p.stats.attackElement;
    p.facing = ang; p.setAnim(Anim.Attack, Math.min(0.3, atk.cooldown));
    if (atk.kind === 'arc') {
      const range = atk.range * (fin ? 1.3 : 1);
      const dealt = this.arcHit(p, ang, range, atk.arc! + (fin ? 40 : 0), raw, el, { kb: fin ? 80 : 25 });
      if (dealt > 0) { p.mp = Math.min(p.stats.maxMp, p.mp + atk.mpGain * this.mod.mpGain); legendAttack(this, p, el); }
      this.ev({ k: 'atk', id: p.id, ang, kind: cls.weapon, el, combo: p.combo, range });
    } else {
      this.spawnProj({ x: p.x + Math.cos(ang) * 8, y: p.y - 6 + Math.sin(ang) * 8, vx: Math.cos(ang) * atk.speed!, vy: Math.sin(ang) * atk.speed!, life: atk.range / atk.speed!, r: 4,
        hostile: false, owner: p, lvl: p.level, raw, el, pierce: 0, mpGain: atk.mpGain * this.mod.mpGain, by: p.name }, atk.sprite!);
      this.ev({ k: 'atk', id: p.id, ang, kind: cls.weapon, el, combo: 0 });
    }
  }

  playerDodge(p: Player, ang: number) {
    const now = this.game.now;
    if (p.dead || p.stunned(now) || now < p.dodgeReadyAt || !isFinite(ang)) return;
    p.dodgeReadyAt = now + p.stats.dodgeCd;
    p.rollUntil = now + CFG.player.dodgeDuration;
    p.iframesUntil = Math.max(p.iframesUntil, now + CFG.player.dodgeIFrames);
    p.facing = ang;
    this.ev({ k: 'sfx', n: 'dodge', x: p.x, y: p.y });
    GearFx.onDodge(this, p, now);
  }

  playerSkill(p: Player, id: string, ang: number, tx: number, ty: number) {
    const now = this.game.now;
    const sk = SKILLS[id], rank = p.char.skills[id] ?? 0;
    if (!sk || !sk.effects || rank < 1 || sk.cls !== p.char.cls || p.dead || p.stunned(now) || !isFinite(ang + tx + ty)) return;
    if ((p.cds.get(id) ?? 0) > now + 0.05) return;
    const cost = skillMp(sk, rank);
    if (p.mp < cost) { p.toast('Nicht genug Mana.', 'bad'); return; }
    p.mp -= cost;
    const [smDmg, smCd] = GearFx.skillMul(p, id); // 0.9: 4er-Set-Bonus der Klasse
    const cd = skillCd(sk, rank, p.stats.cdr) * this.mod.cd * smCd;
    p.cds.set(id, now + cd);
    p.send({ t: 'cd', id, cd });
    p.facing = ang;
    p.setAnim(sk.anim === 'cast' ? Anim.Cast : Anim.Attack, 0.35);
    const el: Element = sk.element === 'phys' ? p.stats.attackElement : sk.element;
    this.ev({ k: 'cast', id: p.id, skill: id, ang, el });
    if (sk.sfx) this.ev({ k: 'sfx', n: sk.sfx, x: p.x, y: p.y });
    for (const e of sk.effects) this.runEffect(p, e, rank, ang, tx, ty, el, sk.name, sk.glyph, smDmg);
    GearFx.afterSkill(this, p);
  }
  private runEffect(p: Player, e: Effect, rank: number, ang: number, tx: number, ty: number, el: Element, name: string, glyph: string, dmgMul = 1) {
    const now = this.game.now;
    const raw = 'mult' in e ? p.stats.power * (e.mult + (e as any).multR * (rank - 1)) * dmgMul : 0;
    const clampTarget = (max: number): [number, number] => {
      const d = Math.hypot(tx - p.x, ty - p.y);
      if (d <= max || d === 0) return [tx, ty];
      return [p.x + ((tx - p.x) / d) * max, p.y + ((ty - p.y) / d) * max];
    };
    switch (e.k) {
      case 'arc': {
        const dealt = this.arcHit(p, ang, e.range, e.arc, raw, el, { kb: e.kb, status: e.status });
        this.ev({ k: 'atk', id: p.id, ang, kind: 'skill', el, combo: 2, range: e.range });
        if (e.healSelf && dealt > 0) { const h = dealt * e.healSelf * (1 + p.stats.healPct / 100); p.heal(h); legendShield(this, p, p, h); }
        break;
      }
      case 'spin': {
        for (const m of [...this.mobs.values()]) if (Math.hypot(m.x - p.x, m.y - p.y) - m.radius <= e.radius) this.hitMob(m, p, raw, el, { kb: e.kb, status: e.status, ang: Math.atan2(m.y - p.y, m.x - p.x) });
        for (const ob of this.objs.values()) if (ob.type === 'boulder' && ob.state === 0 && Math.hypot(ob.x - p.x, ob.y - p.y) < e.radius + 10) this.breakBoulder(ob, p);
        this.ev({ k: 'fx', n: 'spin', x: p.x, y: p.y, r: e.radius, el });
        break;
      }
      case 'proj': {
        for (let i = 0; i < e.count; i++) {
          const a = ang + (e.count > 1 ? ((i / (e.count - 1) - 0.5) * e.spread * Math.PI) / 180 : 0);
          this.spawnProj({ x: p.x + Math.cos(a) * 8, y: p.y - 6 + Math.sin(a) * 8, vx: Math.cos(a) * e.speed, vy: Math.sin(a) * e.speed, life: e.range / e.speed, r: e.radius ?? 4,
            hostile: false, owner: p, lvl: p.level, raw, el, pierce: e.pierce ?? 0, explode: e.explode, status: e.status, by: p.name }, e.sprite);
        }
        break;
      }
      case 'aoe': {
        const [x, y] = e.at === 'self' ? [p.x, p.y] : clampTarget(e.maxRange);
        this.addFx({ kind: 'tele', x, y, r: e.radius, el, dur: e.delay, until: now + e.delay, hostile: false, raw, owner: p, lvl: p.level, status: e.status, by: p.name });
        break;
      }
      case 'zone': {
        const [x, y] = e.at === 'self' ? [p.x, p.y] : clampTarget(e.maxRange);
        this.addFx({ kind: 'zone', x, y, r: e.radius, el, dur: e.dur, until: now + e.dur, tick: e.tick, nextTick: now + 0.1, hostile: false, raw, owner: p, lvl: p.level, status: e.status,
          healAllies: e.healAllies ? p.stats.power * e.healAllies * (1 + p.stats.healPct / 100) : undefined, follow: e.follow ? p : undefined, by: p.name });
        break;
      }
      case 'dash': case 'blink': {
        const a = e.k === 'dash' && e.back ? ang + Math.PI : ang;
        const x0 = p.x, y0 = p.y;
        let x = p.x, y = p.y;
        const dist = e.dist;
        if (e.k === 'dash') {
          const r = moveCircle(this.solidWalk, x, y, Math.cos(a) * dist, Math.sin(a) * dist, CFG.player.radius);
          x = r.x; y = r.y;
        } else {
          for (let d = dist; d > 0; d -= 6) {
            const nx = p.x + Math.cos(a) * d, ny = p.y + Math.sin(a) * d;
            if (circleFree(this.solidWalk, nx, ny, CFG.player.radius) && this.tileAt(nx, ny) !== T.VOID) { x = nx; y = ny; break; }
          }
          this.ev({ k: 'fx', n: 'blink', x: x0, y: y0, el });
        }
        p.x = x; p.y = y; p.epoch++; p.budget = 0;
        p.iframesUntil = Math.max(p.iframesUntil, now + 0.3);
        p.send({ t: 'pos', x, y, e: p.epoch, dash: e.k === 'dash' ? 1 : undefined });
        this.ev({ k: 'fx', n: e.k === 'dash' ? 'dash' : 'blink', x, y, el, ang: a });
        if (e.k === 'dash' && e.mult > 0) {
          for (const m of [...this.mobs.values()]) if (distToSegment(m.x, m.y, x0, y0, x, y) <= e.width / 2 + m.radius) this.hitMob(m, p, raw, el, { status: e.status, crit: e.critBonus });
          for (const ob of this.objs.values()) if (ob.type === 'boulder' && ob.state === 0 && distToSegment(ob.x, ob.y, x0, y0, x, y) < 22) this.breakBoulder(ob, p);
        }
        break;
      }
      case 'buff': {
        const targets = e.party ? [...this.players.values()].filter(q => !q.dead && Math.hypot(q.x - p.x, q.y - p.y) <= e.party!) : [p];
        for (const q of targets) {
          const mods: Record<string, number> = {};
          for (const k in e.mods) mods[k] = (e.mods as any)[k] + ((e.modsR as any)?.[k] ?? 0) * (rank - 1);
          q.addBuff({ id: e.id, name, glyph, until: now + e.dur + (e.durR ?? 0) * (rank - 1), mods, shield: e.shield ? Math.round(q.stats.maxHp * (e.shield + (e.shieldR ?? 0) * (rank - 1))) : 0 });
          this.ev({ k: 'fx', n: 'buff', x: q.x, y: q.y, el });
        }
        break;
      }
      case 'heal': {
        const amount = raw * (1 + p.stats.healPct / 100);
        // 0.8: Ein Heilzauber stellt höchstens einen festen Anteil des Lebens des Geheilten wieder her – der Angriffswert wächst im Endspiel schneller als das Leben
        for (const q of this.players.values()) if (!q.dead && Math.hypot(q.x - p.x, q.y - p.y) <= e.party) { const h = Math.min(amount, q.stats.maxHp * CFG.combat.healCap); q.heal(h); legendShield(this, p, q, h); this.ev({ k: 'fx', n: 'heal', x: q.x, y: q.y, el: 'light' }); }
        break;
      }
    }
  }

  // ------------------------------------------------------------------ Interaktion
  interact(p: Player, id: number) {
    const o = this.objs.get(id);
    const now = this.game.now;
    if (!o || p.dead || Math.hypot(o.x - p.x, o.y - p.y) > CFG.player.interactRadius + 18) return;
    switch (o.type) {
      case 'chest': this.openChest(p, o); break;
      case 'door': case 'bossdoor': {
        if (o.state === 1) break;
        if (o.type === 'bossdoor' && this.boss?.active) { p.toast('Das Tor ist versiegelt, solange der Kampf tobt.', 'bad'); break; }
        if (o.props?.locked && !o.props.unlocked) {
          if (this.keys <= 0) { p.toast('Verschlossen. Irgendwo in diesem Dungeon liegt ein Schlüssel.', 'bad'); p.pev.push({ k: 'sfx', n: 'door_locked' }); break; }
          this.keys--; o.props.unlocked = true;
          for (const q of this.players.values()) q.toast(`${p.name} schließt die Tür auf.`, 'info');
        }
        this.setObjState(o, 1);
        this.ev({ k: 'sfx', n: 'door_open', x: o.x, y: o.y });
        break;
      }
      case 'lever': {
        if (this.puzzle?.solved) break;
        this.setObjState(o, o.state ? 0 : 1);
        this.ev({ k: 'sfx', n: 'lever', x: o.x, y: o.y });
        this.checkPuzzle(p);
        break;
      }
      case 'brazier': {
        if (!this.puzzle || this.puzzle.solved || o.state === 1) break;
        const want = this.puzzle.order![this.puzzle.progress];
        if (o.props!.idx === want) {
          this.setObjState(o, 1); this.puzzle.progress++;
          this.ev({ k: 'sfx', n: 'cast_fire', x: o.x, y: o.y });
          this.checkPuzzle(p);
        } else {
          this.puzzle.progress = 0;
          for (const b of this.objs.values()) if (b.type === 'brazier' && b.state === 1) this.setObjState(b, 0);
          this.ev({ k: 'sfx', n: 'ui_error', x: o.x, y: o.y });
          p.toast('Die Flammen erlöschen. Falsche Reihenfolge.', 'bad');
        }
        break;
      }
      case 'stone': {
        if (!p.char.flags[`t:${this.id}`]) {
          p.char.flags[`t:${this.id}`] = 1; p.sync('flags');
          p.pev.push({ k: 'obj', id: o.id, state: 1 }, { k: 'sfx', n: 'teleport' });
          p.toast(`Quellstein „${this.def.name}“ aktiviert. Du kannst nun hierher reisen.`, 'good');
        }
        p.char.respawn = { zone: this.id, x: o.x, y: o.y + 18 }; p.sync('respawn');
        if (!p.dead) { p.hp = p.stats.maxHp; p.mp = p.stats.maxMp; this.ev({ k: 'fx', n: 'heal', x: p.x, y: p.y, el: 'water' }); }
        break;
      }
      case 'shard': {
        const key = `s:${this.id}:${o.tag}`;
        if (p.char.flags[key]) break;
        p.char.flags[key] = 1; p.sync('flags'); p.recalc();
        p.pev.push({ k: 'obj', id: o.id, state: 1 }, { k: 'sfx', n: 'collect_shard' }, { k: 'fx', n: 'shard', x: o.x, y: o.y });
        p.toast('Quellsplitter gefunden! Leben und Mana dauerhaft erhöht.', 'good', 'item_shard');
        p.checkCollectQuests();
        break;
      }
      case 'node': {
        if ((o.harvested!.get(p.charId) ?? 0) > now) break;
        o.harvested!.set(p.charId, now + 150);
        const item = NODE_TYPES[o.props!.kind].item;
        p.give(makeStack(item, this.rng.int(1, 2)));
        nodeBonus(this, p, World.onHarvest(this, p));
        p.pev.push({ k: 'obj', id: o.id, state: 1 }, { k: 'sfx', n: 'harvest' });
        break;
      }
      case 'exit': this.useExit(p, o); break;
      default: if (!World.interact(this, p, o) && !Home.interact(this, p, o)) Story.interact(this, p, o); // Weltobjekte (0.6) · Hof (0.7) · Chronik, Hüterschrein, Mana-Riss
    }
  }
  private checkPuzzle(p: Player) {
    const z = this.puzzle;
    if (!z || z.solved) return;
    let ok = false;
    if (z.kind === 'torches') ok = z.progress >= 4;
    else if (z.kind === 'levers') ok = [...this.objs.values()].filter(o => o.type === 'lever').every(o => o.state === z.bits![o.props!.idx]);
    else if (z.kind === 'plates') ok = [...this.objs.values()].filter(o => o.type === 'plate').every(o => o.state === 1);
    if (!ok) return;
    z.solved = true;
    this.ev({ k: 'sfx', n: 'puzzle_solved' });
    this.ev({ k: 'obj', id: z.chest.id, state: 0, props: { sealed: false } });
    z.chest.props!.sealed = false;
    this.ev({ k: 'fx', n: 'shard', x: z.chest.x, y: z.chest.y });
    for (const q of this.players.values()) q.toast('Das Siegel der Truhe zerspringt!', 'good');
    void p;
  }
  private openChest(p: Player, o: Obj) {
    if (this.objStateFor(o, p) === 1) return;
    const pr = o.props!;
    if (pr.sealed) { p.toast('Ein Siegel hält die Truhe verschlossen. Löse das Rätsel dieses Raums.', 'bad'); return; }
    if (pr.guard !== undefined && [...this.mobs.values()].some(m => m.group === pr.guard && !m.dead)) { p.toast('Die Truhe wird bewacht!', 'bad'); return; }
    if (pr.group && !Social.mayOpenChest(this, p, o)) return; // 0.7: Gruppentruhe – nur für die, die dabei waren
    if (o.looted) o.looted.add(p.charId); else { p.char.flags[`c:${this.id}:${pr.sid}`] = 1; p.sync('flags'); }
    p.pev.push({ k: 'obj', id: o.id, state: 1 }, { k: 'sfx', n: 'chest_open' });
    if (pr.group) { Social.chestLoot(this, p); return; }
    if (this.rift && pr.rift) { Rift.openChest(this, p, pr.rift); return; }
    const r = this.rng, tier: string = pr.tier, lvl = Math.min(this.def.level[1] + (tier === 'gold' ? 2 : 0), this.ilvlCap);
    const mul = tier === 'wood' ? 1 : tier === 'silver' ? 2.5 : 6;
    p.gainGold(CFG.enemy.gold(lvl) * r.range(4, 7) * mul * (1 + p.stats.goldPct / 100));
    // 0.9: Bosstruhen der Neuen Kreise (ab CFG.loot.mythic.kreisBoss) können „Mythisch“ enthalten
    const w = rarityTable(CFG.loot.chestRarityWeights[tier], pr.boss && tier === 'gold' ? mythicKreisBoss(this.kreis) : 0);
    const n = tier === 'gold' ? 2 : tier === 'silver' || r.chance(0.6) ? 1 : 0;
    for (let i = 0; i < n; i++) p.give(generateGear(r, lvl, rollRarity(r, w), p.char.cls));
    if (pr.bonus) p.give(generateGear(r, lvl + 1, Math.max(2, rollRarity(r, w)), p.char.cls));
    if (tier !== 'wood') p.give(makeStack(TIER_MATERIAL[tierOf(lvl) - 1], r.int(1, 3)));
    if (r.chance(0.6)) p.give(makeStack(lvl <= 8 ? 'potion_hp1' : lvl <= 20 ? 'potion_hp2' : 'potion_hp3', r.int(1, 2)));
    chestExtras(this, p, tier, !!pr.boss);
    World.onChest(this, p, tier);
    if (tier === 'gold' && pr.boss) {
      const u = this.boss!.uniqueFor(p);
      if (u) p.give(u);
      p.give(makeStack('gem', r.int(1, 2)));
    }
    if (pr.key && !pr.keyTaken) {
      pr.keyTaken = true; this.keys++;
      for (const q of this.players.values()) q.toast(`${p.name} hat einen Schlüssel gefunden!`, 'good', 'item_key');
    }
  }
  private useExit(p: Player, o: Obj) {
    const now = this.game.now;
    if (now < p.exitImmuneUntil || !Story.visible(p, o)) return;
    const pr = o.props!;
    if (pr.req && p.char.quests[pr.req]?.s !== 'done') {
      if (now - p.msgAt > 3) { p.msgAt = now; p.toast(pr.reqMsg ?? 'Der Weg ist versperrt.', 'bad'); }
      return;
    }
    if (this.rift) { Rift.leave(this.game, p); return; }
    this.game.transfer(p, pr.to, this.id);
  }

  // ------------------------------------------------------------------ Simulation
  update(dt: number) {
    const now = this.game.now;
    if (now > this.weatherUntil) {
      this.weather = this.rng.weighted(World.weathers(this));
      this.weatherUntil = now + this.rng.range(CFG.world.weatherMinSec, CFG.world.weatherMaxSec);
      for (const p of this.players.values()) p.send({ t: 'env', weather: this.weather });
    }
    this.updatePlayers(dt, now);
    if (now - this.flowAt > 0.3) { this.flowAt = now; this.buildFlow(); }
    this.updateMobs(dt, now);
    this.boss?.update(dt);
    this.updateProjs(dt);
    this.updateFx(now);
    this.updateObjs(now);
    Story.tick(this, dt);
    if (this.rift) Rift.tick(this, dt);
    World.tickZone(this, dt);
    for (let i = this.respawns.length - 1; i >= 0; i--) {
      const r = this.respawns[i];
      if (now < r.at) continue;
      const s = this.map.spawns[r.idx];
      if ([...this.players.values()].some(p => Math.hypot(p.x - s.x, p.y - s.y) < 220)) { r.at = now + 5; continue; }
      this.respawns.splice(i, 1);
      this.ev({ k: 'mob+', m: this.spawnFrom(s, r.idx).info() });
    }
    for (const [id, d] of this.drops) if (now > d.until) { this.drops.delete(id); d.owner.send({ t: 'drop-', id }); }
    this.sendSnapshots(now);
  }

  private updatePlayers(dt: number, now: number) {
    for (const p of this.players.values()) {
      p.char.playtime += dt;
      if (p.dead) continue;
      // Regeneration
      const ooc = now - p.lastHurtAt > CFG.player.outOfCombatRegenDelay;
      p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.hpRegen * (ooc ? 4 : 1) * this.mod.heal * dt);
      p.mp = Math.min(p.stats.maxMp, p.mp + p.stats.mpRegen * this.mod.mpRegen * dt);
      GearFx.tick(p, now); // 0.9: Rindenhaut
      // Zustände
      for (const [id, st] of p.statuses) {
        if (st.until <= now) { p.statuses.delete(id); continue; }
        if (st.dps > 0) { p.hp -= st.dps * dt; if (p.hp <= 0) { this.killPlayer(p, id === 'burn' ? 'Verbrennung' : 'Gift'); break; } }
      }
      if (p.dead) continue;
      if (p.buffs.some(b => b.until <= now)) { p.buffs = p.buffs.filter(b => b.until > now); p.buffsDirty = true; p.recalc(); }
      // Gefahrenboden
      if (!p.linkdead && now >= p.hazardAt && now >= p.rollUntil && this.tileAt(p.x, p.y) === T.HAZARD) {
        p.hazardAt = now + 0.7;
        this.hitPlayer(p, CFG.enemy.dmg(this.def.level[0]) * 0.7, HAZARD_ELEMENT[this.def.biome], this.def.level[0], 'Gefahrenboden');
      }
      // Beute aufsammeln
      for (const [id, d] of this.drops) {
        if (d.owner !== p || Math.hypot(d.x - p.x, d.y - p.y) > CFG.player.pickupRadius * p.perk.pickup) continue; // 0.7: Begleiter „Moosling“
        if (d.gold) { p.gainGold(d.gold); p.pev.push({ k: 'txt', x: d.x, y: d.y - 8, s: `+${d.gold} Gold`, col: '#ffd84a' }, { k: 'sfx', n: 'pickup_gold' }); }
        else if (d.item) {
          if (!p.addItem(d.item)) { if (now - p.msgAt > 4) { p.msgAt = now; p.toast('Inventar voll!', 'bad'); } continue; }
          p.send({ t: 'loot', item: d.item });
          p.pev.push({ k: 'sfx', n: d.item.rarity >= 2 ? 'pickup_rare' : 'pickup_item' });
          p.checkCollectQuests();
        }
        this.drops.delete(id);
        p.send({ t: 'drop-', id, got: 1 });
      }
      // Ausgänge
      if (!p.linkdead && now >= p.exitImmuneUntil) for (const o of this.objs.values()) {
        if (o.type === 'exit' && Math.hypot(o.x - p.x, o.y - p.y) < (o.props?.r ?? 14)) { this.useExit(p, o); break; }
      }
    }
  }

  private buildFlow() {
    const R = 20, S = R * 2 + 1, w = this.map.w;
    for (const p of this.players.values()) {
      if (p.dead || p.linkdead) { this.flow.delete(p.id); continue; }
      const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
      const old = this.flow.get(p.id);
      if (old && old.tx === tx && old.ty === ty) continue;
      const d = new Int16Array(S * S).fill(-1);
      const q: number[] = [R * S + R];
      d[q[0]] = 0;
      for (let k = 0; k < q.length; k++) {
        const i = q[k], lx = i % S, ly = (i / S) | 0, dist = d[i];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = lx + dx, ny = ly + dy;
          if (nx < 0 || ny < 0 || nx >= S || ny >= S) continue;
          const ni = ny * S + nx;
          if (d[ni] >= 0 || this.solidWalk(tx - R + nx, ty - R + ny)) continue;
          d[ni] = dist + 1; q.push(ni);
        }
      }
      this.flow.set(p.id, { tx, ty, d });
      void w;
    }
  }
  /** Richtung, in die ein Gegner laufen soll, um das Ziel zu erreichen (um Hindernisse herum). */
  private steer(m: Mob, t: Player): [number, number] {
    const solid = m.def.flying ? this.solidFly : this.solidWalk;
    const dx = t.x - m.x, dy = t.y - m.y, dist = Math.hypot(dx, dy) || 1;
    if (lineClear(solid, m.x, m.y, t.x, t.y)) return [dx / dist, dy / dist];
    const f = this.flow.get(t.id);
    if (!f) return [dx / dist, dy / dist];
    const R = 20, S = 41;
    const lx = Math.floor(m.x / TILE) - f.tx + R, ly = Math.floor(m.y / TILE) - f.ty + R;
    if (lx < 1 || ly < 1 || lx >= S - 1 || ly >= S - 1) return [dx / dist, dy / dist];
    let best = f.d[ly * S + lx]; if (best < 0) best = 9999;
    let bx = 0, by = 0;
    for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const v = f.d[(ly + ay) * S + lx + ax];
      if (v < 0 || v >= best) continue;
      if (ax && ay && (f.d[ly * S + lx + ax] < 0 || f.d[(ly + ay) * S + lx] < 0)) continue;
      best = v; bx = ax; by = ay;
    }
    if (!bx && !by) return [dx / dist, dy / dist];
    const cx = (Math.floor(m.x / TILE) + bx + 0.5) * TILE - m.x, cy = (Math.floor(m.y / TILE) + by + 0.5) * TILE - m.y;
    const cl = Math.hypot(cx, cy) || 1;
    return [cx / cl, cy / cl];
  }
  moveMob(m: Mob, vx: number, vy: number, dt: number) {
    const solid = m.def.flying ? this.solidFly : this.solidWalk;
    const r = moveCircle(solid, m.x, m.y, vx * dt, vy * dt, Math.min(6, m.radius - 1));
    m.x = r.x; m.y = r.y;
    if (Math.abs(vx) > 1) m.facingLeft = vx < 0 ? 1 : 0;
    return r.hit;
  }
  private nearestPlayer(x: number, y: number, max: number): Player | null {
    let best: Player | null = null, bd = max;
    for (const p of this.players.values()) {
      if (p.dead || p.linkdead) continue;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  private updateMobs(dt: number, now: number) {
    const list = [...this.mobs.values()];
    for (const m of list) {
      if (m.dead) continue;
      // Schadenszustände
      for (const [id, st] of m.statuses) {
        if (st.until <= now) { m.statuses.delete(id); continue; }
        if (st.dps > 0 && Math.floor(now * 2) !== Math.floor((now - dt) * 2)) this.hitMob(m, null, st.dps * 0.5, id === 'burn' ? 'fire' : 'earth', { dot: true });
      }
      if (m.dead) continue;
      // „Geschwächt“ senkt den ausgeteilten Schaden (bei Bossen nur halb so stark)
      m.dmg = m.baseDmg * (m.has('weak', now) ? (m.boss ? (1 + CFG.combat.weakDmgDealt) / 2 : CFG.combat.weakDmgDealt) : 1);
      if (m.boss) continue;
      const near = this.nearestPlayer(m.x, m.y, CFG.enemy.wakeDist);
      m.awake = !!near || m.state !== 'idle';
      if (!m.awake) continue;
      // Rückstoß
      if (Math.abs(m.kx) + Math.abs(m.ky) > 2) { this.moveMob(m, m.kx, m.ky, dt); const f = Math.pow(0.002, dt); m.kx *= f; m.ky *= f; }
      if (now < m.hurtUntil) { m.anim = Anim.Hurt; }
      if (m.has('stun', now) || m.has('freeze', now)) { m.anim = Anim.Hurt; continue; }
      this.mobAI(m, dt, now);
    }
    // Gegner schieben sich auseinander
    for (let i = 0; i < list.length; i++) {
      const a = list[i]; if (a.dead || !a.awake || a.boss) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j]; if (b.dead || !b.awake || b.boss) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = (a.radius + b.radius) * 0.8;
        if (d >= min || d < 0.01) continue;
        const push = (min - d) * 0.5, ux = dx / d, uy = dy / d;
        this.moveMob(a, -ux * push / dt * 0.5, -uy * push / dt * 0.5, dt);
        this.moveMob(b, ux * push / dt * 0.5, uy * push / dt * 0.5, dt);
      }
    }
  }

  private mobAI(m: Mob, dt: number, now: number) {
    const def = m.def, atk = def.atk;
    const rooted = m.has('root', now);
    const speed = rooted ? 0 : m.speed * (m.has('slow', now) ? CFG.combat.slowFactor : 1);
    const hurt = now < m.hurtUntil;
    switch (m.state) {
      case 'idle': {
        const t = this.nearestPlayer(m.x, m.y, def.aggro * this.mod.aggro);
        if (t && !this.map.safe.some(s => Math.hypot(t.x - s.x, t.y - s.y) < s.r - 60) && lineClear(this.solidFly, m.x, m.y, t.x, t.y)) {
          m.target = t; m.state = 'chase';
          // Rudel alarmieren
          for (const o of this.mobs.values()) if (o.group === m.group && o.state === 'idle' && Math.hypot(o.x - m.x, o.y - m.y) < 140) { o.target = t; o.state = 'chase'; o.awake = true; }
          break;
        }
        m.wanderT -= dt;
        if (m.wanderT <= 0) { m.wanderT = this.rng.range(2, 5); const a = this.rng.range(0, 6.28), d = this.rng.range(0, 28); m.wx = m.hx + Math.cos(a) * d; m.wy = m.hy + Math.sin(a) * d; }
        const dx = m.wx - m.x, dy = m.wy - m.y, d = Math.hypot(dx, dy);
        if (d > 3) { this.moveMob(m, (dx / d) * speed * 0.35, (dy / d) * speed * 0.35, dt); if (!hurt) m.anim = Anim.Move; } else if (!hurt) m.anim = Anim.Idle;
        break;
      }
      case 'chase': case 'recover': {
        const t = m.target;
        const home = Math.hypot(m.x - m.hx, m.y - m.hy);
        if (!t || t.dead || t.linkdead || t.zone !== this || home > CFG.enemy.leashDist || Math.hypot(t.x - m.x, t.y - m.y) > CFG.enemy.aggroLoseDist
          || this.map.safe.some(s => Math.hypot(t.x - s.x, t.y - s.y) < s.r - 60)) {
          const alt = t && home <= CFG.enemy.leashDist ? null : null;
          m.target = alt; m.state = m.summoned ? 'idle' : 'return';
          if (m.summoned) { const n = this.nearestPlayer(m.x, m.y, 600); if (n) { m.target = n; m.state = 'chase'; } }
          break;
        }
        if (!m.scaled && !m.ownScale) {
          m.scaled = true;
          const n = [...this.players.values()].filter(p => Math.hypot(p.x - m.x, p.y - m.y) < 520).length;
          if (n > 1) { const f = 1 + CFG.enemy.hpPerExtraPlayer * (n - 1); m.maxHp = Math.round(m.maxHp * f); m.hp = Math.round(m.hp * f); this.ev({ k: 'mob-', id: m.id }); this.ev({ k: 'mob+', m: m.info() }); }
        }
        const dx = t.x - m.x, dy = t.y - m.y, d = Math.hypot(dx, dy) || 1;
        if (m.state === 'recover') { m.t -= dt; if (m.t <= 0) m.state = 'chase'; }
        const ranged = def.ai === 'ranged' || def.ai === 'caster';
        const ready = m.state === 'chase' && now >= m.cdUntil;
        if (ready && d <= atk.range + (ranged ? 0 : t ? 4 : 0) && (!ranged || lineClear(this.solidFly, m.x, m.y, t.x, t.y))) {
          m.state = 'windup'; m.t = atk.windup; m.aimX = dx / d; m.aimY = dy / d; m.facingLeft = dx < 0 ? 1 : 0;
          if (def.ai === 'charge') this.addFx({ kind: 'tele', shape: 'line', x: m.x, y: m.y, x2: m.x + m.aimX * (atk.range + 50), y2: m.y + m.aimY * (atk.range + 50), w: m.radius * 2 + 6, r: 0, el: m.element, dur: atk.windup, until: now + atk.windup, hostile: true, raw: 0, lvl: m.lvl, by: m.name });
          break;
        }
        // Bewegung
        let mvx = 0, mvy = 0;
        if (ranged) {
          if (d < atk.range * 0.45) { mvx = -dx / d; mvy = -dy / d; }
          else if (d > atk.range * 0.85 || !lineClear(this.solidFly, m.x, m.y, t.x, t.y)) [mvx, mvy] = this.steer(m, t);
          else { const s = (m.id % 2 ? 1 : -1) * 0.4; mvx = (-dy / d) * s; mvy = (dx / d) * s; }
        } else if (d > Math.max(8, atk.range * 0.7)) {
          [mvx, mvy] = this.steer(m, t);
          if (def.ai === 'blink' && d > 70 && now >= m.blinkAt && !rooted) {
            m.blinkAt = now + 4.5;
            for (let k = 0; k < 8; k++) {
              const a = this.rng.range(0, 6.28), nx = t.x + Math.cos(a) * 26, ny = t.y + Math.sin(a) * 26;
              if (circleFree(this.solidWalk, nx, ny, 6)) { this.ev({ k: 'fx', n: 'blink', x: m.x, y: m.y, el: 'dark' }); m.x = nx; m.y = ny; this.ev({ k: 'fx', n: 'blink', x: nx, y: ny, el: 'dark' }); m.cdUntil = Math.max(m.cdUntil, now + 0.4); break; }
            }
          }
        }
        let sp = speed * (m.state === 'recover' ? 0.6 : 1);
        if (def.move === 'hop') { m.hopT = (m.hopT + dt) % 0.75; sp *= m.hopT < 0.42 ? 1.9 : 0; }
        if (def.move === 'swoop') { const s = Math.sin(now * 5 + m.id) * 0.8; const ox = mvx; mvx = mvx - mvy * s; mvy = mvy + ox * s; }
        if (mvx || mvy) { this.moveMob(m, mvx * sp, mvy * sp, dt); if (!hurt) m.anim = Anim.Move; } else if (!hurt) m.anim = Anim.Idle;
        if (!mvx) m.facingLeft = dx < 0 ? 1 : 0;
        break;
      }
      case 'windup': {
        m.anim = Anim.Windup;
        m.t -= dt;
        if (m.t > 0) break;
        m.anim = Anim.Attack;
        m.cdUntil = now + atk.cd * m.cdMul;
        m.state = 'recover'; m.t = 0.35;
        const raw = m.dmg * (atk.mult ?? 1);
        if (def.ai === 'charge') { m.state = 'charge'; m.t = Math.min(0.6, (atk.range + 50) / (m.speed * 4.2)); m.chargeHit.clear(); break; }
        if (atk.proj) {
          const n = atk.proj.count ?? 1, base = Math.atan2(m.aimY, m.aimX);
          for (let i = 0; i < n; i++) {
            const a = base + (n > 1 ? ((i / (n - 1) - 0.5) * (atk.proj.spread ?? 0) * Math.PI) / 180 : 0);
            this.spawnProj({ x: m.x, y: m.y - 4, vx: Math.cos(a) * atk.proj.speed, vy: Math.sin(a) * atk.proj.speed, life: (atk.proj.range ?? atk.range * 1.6) / atk.proj.speed, r: 4, hostile: true, lvl: m.lvl, raw, el: m.element, pierce: 0, status: atk.status, by: m.name }, atk.proj.spr);
          }
          this.ev({ k: 'sfx', n: 'cast_' + (m.element === 'phys' ? 'dark' : m.element), x: m.x, y: m.y });
        } else if (atk.aoe) {
          const t = m.target;
          if (t) this.addFx({ kind: 'tele', x: t.x, y: t.y, r: atk.aoe.radius, el: m.element, dur: atk.aoe.delay, until: now + atk.aoe.delay, hostile: true, raw, lvl: m.lvl, status: atk.status, by: m.name });
        } else {
          const px = m.x + m.aimX * atk.range * 0.6, py = m.y + m.aimY * atk.range * 0.6;
          for (const p of this.players.values()) if (Math.hypot(p.x - px, p.y - py) <= (atk.reach ?? 14) + CFG.player.radius) this.hitPlayer(p, raw, m.element, m.lvl, m.name, atk.status);
          this.ev({ k: 'atk', id: m.id, ang: Math.atan2(m.aimY, m.aimX), kind: 'mob', el: m.element, range: atk.range });
        }
        break;
      }
      case 'charge': {
        m.anim = Anim.Attack;
        m.t -= dt;
        const hit = rooted || this.moveMob(m, m.aimX * m.speed * 4.2, m.aimY * m.speed * 4.2, dt);
        for (const p of this.players.values()) if (!m.chargeHit.has(p.id) && Math.hypot(p.x - m.x, p.y - m.y) <= (atk.reach ?? 12) + CFG.player.radius) { m.chargeHit.add(p.id); this.hitPlayer(p, m.dmg * (atk.mult ?? 1), m.element, m.lvl, m.name, atk.status); }
        if (m.t <= 0 || hit) { m.state = 'recover'; m.t = hit ? 0.9 : 0.4; }
        break;
      }
      case 'return': {
        const dx = m.hx - m.x, dy = m.hy - m.y, d = Math.hypot(dx, dy);
        m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.3 * dt);
        if (d < 6) { m.state = 'idle'; m.hitters.clear(); m.scaled = false; m.hp = m.maxHp; break; }
        const hit = this.moveMob(m, (dx / d) * speed * 1.5, (dy / d) * speed * 1.5, dt);
        if (hit) { m.t += dt; if (m.t > 2) { m.x = m.hx; m.y = m.hy; m.t = 0; } }
        m.anim = Anim.Move;
        break;
      }
    }
  }

  private explodeProj(p: Proj) {
    if (!p.explode) return;
    this.ev({ k: 'fx', n: 'explosion', x: p.x, y: p.y, r: p.explode, el: p.el });
    this.ev({ k: 'sfx', n: 'explosion', x: p.x, y: p.y });
    for (const m of [...this.mobs.values()]) if (Math.hypot(m.x - p.x, m.y - p.y) - m.radius <= p.explode) this.hitMob(m, p.owner ?? null, p.raw, p.el, { status: p.status });
  }
  private updateProjs(dt: number) {
    for (const [id, p] of this.projs) {
      let end = false, hit = false;
      for (let s = 0; s < 2 && !end; s++) {
        p.x += p.vx * dt * 0.5; p.y += p.vy * dt * 0.5;
        if (this.solidFly(Math.floor(p.x / TILE), Math.floor((p.y + 5) / TILE))) { end = true; hit = true; this.explodeProj(p); break; }
        if (p.hostile) {
          for (const pl of this.players.values()) {
            if (pl.dead || p.hit.has(pl.id) || Math.hypot(pl.x - p.x, pl.y - 6 - p.y) > p.r + CFG.player.radius + 2) continue;
            // 0.8: Schonfrist – wer eben von einem Geschoss desselben Urhebers getroffen wurde, den durchfliegen dessen weitere
            // Geschosse kurz. So trifft eine Salve aus nächster Nähe einmal statt mit allen Geschossen zugleich.
            if (this.game.now < pl.shotGraceUntil && pl.shotBy === p.by) { p.hit.add(pl.id); continue; }
            if (this.hitPlayer(pl, p.raw, p.el, p.lvl, p.by, p.status) > 0) { pl.shotGraceUntil = this.game.now + CFG.combat.shotGrace; pl.shotBy = p.by; }
            end = true; hit = true; break;
          }
        } else {
          for (const m of [...this.mobs.values()]) {
            if (p.hit.has(m.id) || m.hidden || Math.hypot(m.x - p.x, m.y - 5 - p.y) > p.r + m.radius) continue;
            p.hit.add(m.id);
            if (p.explode) { this.explodeProj(p); end = true; hit = true; break; }
            const dealt = this.hitMob(m, p.owner ?? null, p.raw, p.el, { status: p.status, kb: 20, ang: Math.atan2(p.vy, p.vx), crit: p.critBonus });
            if (dealt > 0 && p.mpGain && p.owner) p.owner.mp = Math.min(p.owner.stats.maxMp, p.owner.mp + p.mpGain);
            if (m.invuln) continue;
            if (--p.pierce < 0) { end = true; hit = true; break; }
          }
          if (!end) for (const ob of this.objs.values()) if (ob.type === 'boulder' && ob.state === 0 && Math.hypot(ob.x - p.x, ob.y - 6 - p.y) < 13) { this.breakBoulder(ob, p.owner ?? null); end = true; hit = true; break; }
        }
      }
      p.life -= dt;
      if (p.life <= 0 && !end) { end = true; this.explodeProj(p); }
      if (end) { this.projs.delete(id); this.ev({ k: 'proj-', id, hit: hit ? 1 : undefined }); }
    }
  }

  private fxHits(z: FxZone, x: number, y: number, r: number): boolean {
    if (z.shape === 'line') return distToSegment(x, y, z.x, z.y, z.x2!, z.y2!) <= z.w! / 2 + r;
    return Math.hypot(x - z.x, y - z.y) <= z.r + r;
  }
  private fxApply(z: FxZone) {
    if (z.raw <= 0 && !z.healAllies) return;
    if (z.hostile) {
      for (const p of this.players.values()) {
        if (z.safeSpots) { if (z.safeSpots.some(s => Math.hypot(p.x - s.x, p.y - s.y) <= s.r)) continue; }
        else if (!this.fxHits(z, p.x, p.y, 2)) continue;
        this.hitPlayer(p, z.raw, z.el, z.lvl, z.by, z.status);
      }
    } else {
      for (const m of [...this.mobs.values()]) if (this.fxHits(z, m.x, m.y, m.radius)) this.hitMob(m, z.owner ?? null, z.raw, z.el, { status: z.status });
      if (z.healAllies) for (const p of this.players.values()) if (!p.dead && this.fxHits(z, p.x, p.y, 0)) { const h = z.healAllies * (z.tick ?? 1); p.heal(h, false); if (z.owner) legendShield(this, z.owner, p, h); }
      for (const ob of this.objs.values()) if (ob.type === 'boulder' && ob.state === 0 && this.fxHits(z, ob.x, ob.y, 8)) this.breakBoulder(ob, z.owner ?? null);
    }
  }
  private updateFx(now: number) {
    for (const [id, z] of this.fx) {
      if (z.follow) { if (z.follow.dead || z.follow.zone !== this) z.until = 0; else { z.x = z.follow.x; z.y = z.follow.y; } }
      if (z.kind === 'zone' && z.nextTick !== undefined && now >= z.nextTick && now < z.until) { z.nextTick = now + z.tick!; this.fxApply(z); }
      if (now >= z.until) {
        if (z.kind === 'tele') {
          this.fxApply(z);
          if (z.raw > 0) { this.ev({ k: 'fx', n: z.shape === 'line' ? 'beam' : 'explosion', x: z.x, y: z.y, r: z.r, el: z.el, ang: z.shape === 'line' ? Math.atan2(z.y2! - z.y, z.x2! - z.x) : undefined, d: z.shape === 'line' ? Math.hypot(z.x2! - z.x, z.y2! - z.y) : undefined }); this.ev({ k: 'sfx', n: 'explosion', x: z.x, y: z.y }); }
        }
        this.fx.delete(id);
        this.ev({ k: 'zone-', id });
      }
    }
  }
  clearHostile() {
    for (const [id, p] of this.projs) if (p.hostile) { this.projs.delete(id); this.ev({ k: 'proj-', id }); }
    for (const [id, z] of this.fx) if (z.hostile) { this.fx.delete(id); this.ev({ k: 'zone-', id }); }
  }

  private updateObjs(now: number) {
    const tsec = this.game.clock();
    for (const o of this.objs.values()) {
      if (o.type === 'spikes') {
        const pr = o.props!;
        const ph = (tsec + pr.offset) % pr.period;
        if (ph < pr.period * 0.6) continue;
        for (const p of this.players.values()) {
          if (p.dead || now < p.hazardAt || now < p.rollUntil) continue;
          const c = Math.floor(p.y / TILE) * this.map.w + Math.floor(p.x / TILE);
          if (!(pr.cells as number[]).includes(c)) continue;
          p.hazardAt = now + 0.8;
          this.hitPlayer(p, CFG.enemy.dmg(this.def.level[1]) * 1.1, 'phys', this.def.level[1], 'Stachelfalle');
          this.ev({ k: 'sfx', n: 'trap', x: p.x, y: p.y });
        }
      } else if (o.type === 'turret') {
        if (o.nextFire === undefined) o.nextFire = now + o.props!.offset;
        if (now < o.nextFire!) continue;
        o.nextFire = now + o.props!.period;
        if (!this.nearestPlayer(o.x, o.y, 260)) continue;
        const a = o.props!.dir;
        this.spawnProj({ x: o.x + Math.cos(a) * 10, y: o.y - 4, vx: Math.cos(a) * 130, vy: Math.sin(a) * 130, life: 2.4, r: 4, hostile: true, lvl: this.def.level[1], raw: CFG.enemy.dmg(this.def.level[1]) * 0.9, el: HAZARD_ELEMENT[this.def.biome], pierce: 0, by: 'Falle' }, 'orb');
      } else if (o.type === 'plate' && this.puzzle && !this.puzzle.solved) {
        const on = [...this.players.values()].some(p => !p.dead && Math.abs(p.x - o.x) < 9 && Math.abs(p.y - o.y) < 9);
        if (on) { o.activeUntil = now + this.puzzle.time!; if (o.state === 0) { this.setObjState(o, 1); this.ev({ k: 'sfx', n: 'plate', x: o.x, y: o.y }); this.checkPuzzle([...this.players.values()][0]); } }
        else if (o.state === 1 && now > (o.activeUntil ?? 0)) this.setObjState(o, 0);
      }
    }
  }

  addDynamicObj(type: string, x: number, y: number, props: Record<string, any>, tag?: string): Obj {
    const o: Obj = { id: nextId(), type, x, y, state: 0, tag, props: { ...props, sid: 'dyn' + type }, dynamic: true };
    if (type === 'chest') o.looted = new Set();
    this.objs.set(o.id, o);
    for (const p of this.players.values()) p.pev.push({ k: 'obj+', o: this.objInfo(o, p) });
    return o;
  }

  private sendSnapshots(now: number) {
    const snapP: SnapPlayer[] = [];
    for (const p of this.players.values()) snapP.push([p.id, Math.round(p.x), Math.round(p.y), Math.round(p.facing * 100), p.currentAnim(now), Math.max(0, Math.round(p.hp)), p.stats.maxHp, p.flags(now)]);
    const snapM: SnapMob[] = [];
    for (const m of this.mobs.values()) if (m.awake && !m.hidden) snapM.push([m.id, Math.round(m.x), Math.round(m.y), m.facingLeft, now < m.hurtUntil && m.anim !== Anim.Windup ? Anim.Hurt : m.anim, Math.max(0, Math.round(m.hp)), m.flags(now)]);
    const n = Math.round(this.game.clock() * 1000);
    for (const p of this.players.values()) {
      const ev = p.pev.length ? this.events.concat(p.pev) : this.events;
      p.pev = [];
      p.send({ t: 's', n, p: snapP, m: snapM, ev: ev.length ? ev : undefined, me: [Math.max(0, Math.round(p.hp)), p.stats.maxHp, Math.round(p.mp), p.stats.maxMp, p.flags(now)], k: this.map.dungeon ? this.keys : undefined });
      p.flush();
    }
    this.events = [];
  }
}
export { ZONES };
