/**
 * Bosskämpfe. Jeder Boss besitzt eigene Angriffsmuster (als Generatoren geschrieben: `yield sekunden` = warten)
 * und drei Phasen. Der Kampf skaliert mit der Spielerzahl und setzt sich zurück, wenn die Gruppe scheitert.
 */
import { circleFree } from '../../shared/src/collision';
import { CFG } from '../../shared/src/config';
import type { BossDef, EnemyDef } from '../../shared/src/data/enemies';
import { generateBossUnique, makeStack } from '../../shared/src/data/items';
import { STORY } from '../../shared/src/data/quests';
import { ZONES } from '../../shared/src/data/zones';
import type { Room } from '../../shared/src/maps/mapgen';
import { TILE } from '../../shared/src/maps/tiles';
import { Anim } from '../../shared/src/types';
import type { Element, ItemInstance, StatusSpec } from '../../shared/src/types';
import { ECHO_MECH, type EchoMech } from './echo';
import { bossLoot } from './loot';
import type { Player } from './player';
import { Rift } from './rift';
import { Expedition } from './expedition';
import { Social } from './social';
import { Story } from './story';
import { Mob, type Zone } from './zone';

type Gen = Generator<number, void, void>;

export class BossCtl {
  mob!: Mob;
  active = false;
  phase = 1;
  private gen: Gen | null = null;
  private wait = 0;
  private emptyT = 0;
  private idx = 0;
  private animUntil = 0;
  private chase = false;
  private baseHp = 0;
  cx: number; cy: number;
  private rot = 0;
  private elemIdx = 0;
  /** Story-Bosse (spared): erneuter Kampf auf Wunsch eines Spielers */
  private forced = false;
  /** hat sich in dieser Instanz ergeben und verharrt in seiner Ruhepose (Vael kniet, Aetherion ist ruhiges Licht) */
  private yielded = false;
  /** 0.5: Zusatzmechanik eines Boss-Echos im Mana-Riss (server/src/echo.ts) */
  private echo: EchoMech | undefined;

  constructor(public zone: Zone, public def: BossDef, public room: Room) {
    this.cx = ((room.x0 + room.x1 + 1) / 2) * TILE;
    this.cy = ((room.y0 + room.y1 + 1) / 2) * TILE;
    if (zone.rift) this.echo = ECHO_MECH[def.id];
    else if (zone.exp) this.echo = Expedition.bossMech(zone, def.id); // 0.9: Phasen bei 60 %/25 %, Signaturmechanik, Schwierigkeitsgrad
    this.spawn();
  }
  private spawn() {
    const d = this.def;
    const fake: EnemyDef = { id: d.id, name: d.name, element: d.element, hpMul: d.hpMul, dmgMul: d.dmgMul, defMul: d.defMul, xpMul: 1, speed: d.speed, radius: d.radius, ai: 'chase', aggro: 0, atk: { range: 0, windup: 0, cd: 0 } };
    const m = new Mob(fake, d.level, this.cx, this.cy - 8, false, -99, -1);
    m.boss = this; m.invuln = true; m.awake = true; m.name = d.name;
    this.baseHp = m.maxHp;
    this.mob = m;
    this.zone.mobs.set(m.id, m);
  }
  private get now() { return this.zone.game.now; }
  private players(): Player[] { return this.zone.alivePlayers().filter(p => this.zone.inRoom(this.room, p.x, p.y)); }
  private target(): Player | null { const l = this.players(); return l.length ? this.zone.rng.pick(l) : null; }
  private say(s: string) { for (const p of this.zone.players.values()) p.send({ t: 'chat', from: this.def.name, s, ch: 'sys' }); }
  private anim(a: Anim, dur: number) { this.mob.anim = a; this.animUntil = this.now + dur; }
  private announce() { this.zone.ev({ k: 'boss', id: this.mob.id, name: this.def.fightName ?? this.def.name, phase: this.phase, el: this.mob.element }); }
  private doors(state: number) { for (const o of this.zone.objs.values()) if (o.type === 'bossdoor' && o.state !== state) this.zone.setObjState(o, state); }

  private start() {
    const n = Math.max(1, this.players().length);
    this.active = true; this.phase = 1; this.idx = 0; this.gen = null; this.wait = 1.6; this.emptyT = 0;
    this.yielded = false; this.mob.anim = Anim.Idle;
    this.mob.invuln = false;
    this.mob.maxHp = Math.round(this.baseHp * (1 + CFG.enemy.bossHpPerExtraPlayer * (n - 1)));
    this.mob.hp = this.mob.maxHp;
    this.mob.element = this.def.element;
    this.zone.ev({ k: 'mob-', id: this.mob.id }); this.zone.ev({ k: 'mob+', m: this.mob.info() });
    this.doors(0);
    this.announce();
    this.zone.ev({ k: 'sfx', n: 'boss_roar' });
    for (const p of this.zone.players.values()) p.toast(this.def.intro, 'story');
    if (this.def.awaken) for (const p of this.players()) Story.playCine(p, this.def.awaken, true);
    this.echo?.start?.(this.kit());
  }
  /** Werkzeugkasten für Muster außerhalb dieser Datei (Boss-Echos: server/src/echo.ts) */
  kit() {
    return { boss: this as BossCtl, shoot: this.shoot.bind(this), aimed: this.aimed.bind(this), radial: this.radial.bind(this), tele: this.tele.bind(this), beam: this.beam.bind(this),
      pool: this.pool.bind(this), rndPos: this.rndPos.bind(this), summon: this.summon.bind(this), moveTo: this.moveTo.bind(this), players: this.players.bind(this),
      target: this.target.bind(this), say: this.say.bind(this), anim: this.anim.bind(this) };
  }
  private reset() {
    this.active = false; this.gen = null; this.phase = 1; this.forced = false;
    this.zone.clearHostile();
    for (const m of [...this.zone.mobs.values()]) if (m.summoned) { m.dead = true; this.zone.mobs.delete(m.id); this.zone.ev({ k: 'mob-', id: m.id }); }
    const m = this.mob;
    m.hp = m.maxHp = this.baseHp; m.x = this.cx; m.y = this.cy - 8; m.invuln = true; m.vuln = 1; m.statuses.clear(); m.hitters.clear(); m.anim = Anim.Idle; m.element = this.def.element;
    this.zone.ev({ k: 'mob-', id: m.id }); this.zone.ev({ k: 'mob+', m: m.info() });
    this.doors(1);
    this.zone.ev({ k: 'bossend', id: m.id, won: false });
    this.echo?.reset?.(this.kit());
  }

  uniqueFor(p: Player): ItemInstance | null {
    const key = `u:${this.def.id}`;
    const first = !p.char.flags[key];
    if (!first && !this.zone.rng.chance(0.25)) return null;
    p.char.flags[key] = 1; p.sync('flags');
    // erster Sieg: die Waffe; danach halb Waffe, halb das Stück für einen der neuen Plätze (0.9)
    return generateBossUnique(this.zone.rng, this.def.id, p.char.cls, this.zone.rng.chance(first ? 0.15 : 0.1), !first && this.zone.rng.chance(0.5));
  }

  // ---- Story-Bosse (0.3): werden verschont und stehen danach friedlich im Raum
  /** Tödlicher Treffer auf einen Boss, der sich ergibt: Er bleibt am Leben; update() beendet den Kampf. */
  spare(): boolean {
    if (this.def.spared === undefined) return false;
    this.mob.hp = 1;
    return true;
  }
  /** Ein Spieler fordert den (bereits bestandenen) Kampf erneut heraus. */
  challenge() { this.forced = true; }
  /** Beginnt der Kampf, wenn jemand den Raum betritt? Verschonte Bosse greifen nur an, wer die Prüfung noch nicht bestanden hat. */
  private shouldStart(): boolean {
    const inRoom = this.zone.alivePlayers().filter(p => this.zone.inRoom(this.room, p.x, p.y, 1.5));
    if (!inRoom.length) return false;
    if (this.zone.exp) return !this.yielded; // 0.11: in einer Expedition kämpfen auch Vael und Aetherion jedes Mal (einmal je Lauf)
    return this.def.spared === undefined || this.forced || inRoom.some(p => !p.char.flags[`b:${this.def.id}`]);
  }
  private surrender() {
    const m = this.mob;
    this.say(this.def.outro ?? '…');
    this.finish(true);
    this.moveTo(this.cx, this.cy - 8);
    // Ruhepose halten: Anim.Dead zeigt das Schlussbild der Sterbe-Animation (der Boss wird NICHT entfernt)
    m.hp = m.maxHp = this.baseHp; m.invuln = true; m.vuln = 1; m.statuses.clear(); m.hitters.clear(); m.anim = Anim.Dead; m.element = this.def.element;
    this.forced = false; this.phase = 1; this.yielded = true;
  }
  /** Ruht der Boss? Nach dem Aufgeben – oder (calm) wenn alle Anwesenden die Prüfung längst bestanden haben. */
  private resting(): boolean {
    if (this.yielded) return true;
    if (!this.def.calm || !this.zone.players.size) return false;
    for (const p of this.zone.players.values()) if (!p.char.flags[`b:${this.def.id}`]) return false;
    return true;
  }

  onDeath() { this.finish(false); }
  private finish(spared: boolean) {
    const z = this.zone, d = this.def;
    this.active = false; this.gen = null;
    z.clearHostile();
    for (const m of [...z.mobs.values()]) if (m.summoned) z.killMob(m);
    this.doors(1);
    z.ev({ k: 'bossend', id: this.mob.id, won: true });
    z.ev({ k: 'sfx', n: spared ? 'puzzle_solved' : 'boss_die' });
    if (spared) z.ev({ k: 'fx', n: 'shard', x: this.mob.x, y: this.mob.y });
    else z.ev({ k: 'fx', n: 'bossdeath', x: this.mob.x, y: this.mob.y, el: d.element });
    if (z.rift) { Rift.bossDown(z, this); return; }
    if (z.exp) { Expedition.bossDown(z, this); return; } // 0.9: Belohnung genau einmal je Lauf, Arena versiegeln, Rückkehr // Echos geben keine Siegel, Bossflaggen oder Questfortschritt – nur Riss-Belohnungen
    const all = [...z.players.values()];
    for (const p of all) {
      if (p.dead) { p.dead = false; p.hp = Math.round(p.stats.maxHp * 0.5); p.send({ t: 'toast', s: 'Der Sieg deiner Gruppe reißt dich zurück ins Leben.', kind: 'good' }); }
      const first = !p.char.flags[`b:${d.id}`];
      p.char.flags[`b:${d.id}`] = (p.char.flags[`b:${d.id}`] ?? 0) + 1;
      p.sync('flags');
      p.gainXp(d.xp * (first ? 1 : 0.4));
      p.gainGold(d.gold * (first ? 1 : 0.4));
      if (!p.countItem(d.seal)) p.give(makeStack(d.seal));
      bossLoot(z, p, d.id, d.element, first);
      const party = p.party ? [...p.party.members].filter(q => q.zone === z).length : 1;
      p.questEvent({ t: 'boss', boss: d.id, party });
      if (first && STORY[d.seal]) z.game.story(p, d.seal);
      p.toast(spared ? (d.fightName ? `${d.fightName} ist vorüber.` : `${d.name} ergibt sich – Prüfung bestanden!`) : `${d.name} wurde besiegt!`, 'good');
    }
    if (spared) {
      // Der Boss bleibt in der Raummitte stehen: Truhe und Ausgang seitlich; alte Belohnungstruhen eines früheren Kampfes verschwinden
      for (const o of [...z.objs.values()]) if (o.dynamic && o.type === 'chest') { z.objs.delete(o.id); z.ev({ k: 'obj-', id: o.id }); }
      z.addDynamicObj('chest', this.cx + 5 * TILE, this.cy + 3 * TILE, { tier: 'gold', boss: true });
      if (![...z.objs.values()].some(o => o.dynamic && o.type === 'exit')) z.addDynamicObj('exit', this.cx - 5 * TILE, this.cy + 3 * TILE, { to: z.def.parent, look: 'portal', label: ZONES[z.def.parent!].name, r: 13 });
      Social.groupChest(z, this.cx + 5 * TILE, this.cy + 5 * TILE); // 0.7: Gruppentruhe, wenn mindestens zwei aus einer Gruppe dabei waren
    } else {
      z.addDynamicObj('chest', this.cx, this.cy - 3 * TILE, { tier: 'gold', boss: true });
      z.addDynamicObj('exit', this.cx, this.cy + 3 * TILE, { to: z.def.parent, look: 'portal', label: ZONES[z.def.parent!].name, r: 13 });
      Social.groupChest(z, this.cx - 3 * TILE, this.cy - 3 * TILE);
    }
    z.game.saveZonePlayers(z);
  }

  update(dt: number) {
    const m = this.mob;
    if (m.dead) return;
    const pl = this.players();
    if (!this.active) {
      if (this.shouldStart()) this.start();
      else if (this.def.spared !== undefined) m.anim = this.resting() ? Anim.Dead : Anim.Idle;
      return;
    }
    if (!pl.length) { this.emptyT += dt; if (this.emptyT > 2.5) this.reset(); return; }
    this.emptyT = 0;
    const frac = m.hp / m.maxHp;
    if (this.def.spared !== undefined && frac <= this.def.spared) { this.surrender(); return; }
    const [p2, p3] = this.echo?.phases ?? [0.66, 0.33];
    const ph = frac <= p3 ? 3 : frac <= p2 ? 2 : 1;
    if (ph > this.phase) {
      this.phase = ph; this.gen = this.phaseChange(); this.wait = 0;
      this.zone.ev({ k: 'sfx', n: 'boss_phase' });
      this.zone.ev({ k: 'fx', n: 'explosion', x: m.x, y: m.y, r: 60, el: m.element });
      this.announce();
    }
    if (this.now >= this.animUntil) m.anim = Anim.Idle;
    this.echo?.tick?.(this.kit(), dt);
    if (this.chase && this.def.speed > 0) {
      const t = this.zone.alivePlayers().sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y))[0];
      if (t) {
        const dx = t.x - m.x, dy = t.y - m.y, d = Math.hypot(dx, dy);
        const sp = this.def.speed * (m.has('slow', this.now) ? 0.75 : 1) * (this.phase === 3 ? 1.25 : 1);
        if (d > 42) this.zone.moveMob(m, (dx / d) * sp, (dy / d) * sp, dt);
        m.facingLeft = dx < 0 ? 1 : 0;
      }
    }
    this.wait -= dt * (this.phase === 3 ? 1.2 : 1) * (this.echo?.speed ?? 1);
    let guard = 0;
    while (this.wait <= 0 && guard++ < 50) {
      if (!this.gen) this.gen = this.next();
      const r = this.gen.next();
      if (r.done) { this.gen = null; this.wait += this.phase === 3 ? 0.7 : 1.1; this.chase = true; }
      else this.wait += r.value;
    }
  }

  // ------------------------------------------------------------------ Werkzeugkasten
  private shoot(x: number, y: number, ang: number, speed: number, spr: string, mult: number, o: { r?: number; status?: StatusSpec; life?: number; el?: Element } = {}) {
    this.zone.spawnProj({ x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, life: o.life ?? 4, r: o.r ?? 5, hostile: true, lvl: this.def.level, raw: this.mob.dmg * mult, el: o.el ?? this.mob.element, pierce: 0, status: o.status, by: this.def.name }, spr);
  }
  private aimed(t: Player, n: number, spread: number, speed: number, spr: string, mult: number, status?: StatusSpec) {
    const m = this.mob, base = Math.atan2(t.y - 6 - m.y, t.x - m.x);
    for (let i = 0; i < n; i++) this.shoot(m.x, m.y, base + (n > 1 ? ((i / (n - 1) - 0.5) * spread * Math.PI) / 180 : 0), speed, spr, mult, { status });
    m.facingLeft = t.x < m.x ? 1 : 0;
  }
  private radial(n: number, speed: number, off: number, spr: string, mult: number, gapAt?: number, gapW = 0.5) {
    const m = this.mob;
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * Math.PI * 2;
      if (gapAt !== undefined) { let d = Math.abs(a - gapAt) % (Math.PI * 2); if (d > Math.PI) d = Math.PI * 2 - d; if (d < gapW) continue; }
      this.shoot(m.x, m.y, a, speed, spr, mult);
    }
  }
  private tele(x: number, y: number, r: number, delay: number, mult: number, status?: StatusSpec, el?: Element) {
    this.zone.addFx({ kind: 'tele', x, y, r, el: el ?? this.mob.element, dur: delay, until: this.now + delay, hostile: true, raw: this.mob.dmg * mult, lvl: this.def.level, status, by: this.def.name });
  }
  private beam(x1: number, y1: number, x2: number, y2: number, w: number, delay: number, mult: number, el?: Element) {
    this.zone.addFx({ kind: 'tele', shape: 'line', x: x1, y: y1, x2, y2, w, r: 0, el: el ?? this.mob.element, dur: delay, until: this.now + delay, hostile: true, raw: this.mob.dmg * mult, lvl: this.def.level, by: this.def.name });
  }
  private pool(x: number, y: number, r: number, dur: number, mult: number, status?: StatusSpec, el?: Element) {
    this.zone.addFx({ kind: 'zone', x, y, r, el: el ?? this.mob.element, dur, until: this.now + dur, tick: 0.5, nextTick: this.now + 0.6, hostile: true, raw: this.mob.dmg * mult, lvl: this.def.level, status, by: this.def.name });
  }
  /** Raumweiter Angriff mit sicheren Zonen. */
  private nuke(delay: number, mult: number, spots: number) {
    const safe: { x: number; y: number; r: number }[] = [];
    for (let i = 0; i < spots; i++) { const [x, y] = this.rndPos(3); safe.push({ x, y, r: 30 }); }
    for (const s of safe) this.zone.addFx({ kind: 'zone', x: s.x, y: s.y, r: s.r, el: 'light', dur: delay + 0.2, until: this.now + delay + 0.2, hostile: false, raw: 0, lvl: 1, by: '' });
    this.zone.addFx({ kind: 'tele', x: this.cx, y: this.cy, r: 200, el: this.mob.element, dur: delay, until: this.now + delay, hostile: true, raw: this.mob.dmg * mult, lvl: this.def.level, by: this.def.name, safeSpots: safe });
  }
  private rndPos(marginTiles = 2): [number, number] {
    const r = this.room, g = this.zone.rng;
    for (let k = 0; k < 20; k++) {
      const x = g.range((r.x0 + marginTiles) * TILE, (r.x1 + 1 - marginTiles) * TILE), y = g.range((r.y0 + marginTiles) * TILE, (r.y1 + 1 - marginTiles) * TILE);
      if (circleFree(this.zone.solidWalk, x, y, 8)) return [x, y];
    }
    return [this.cx, this.cy];
  }
  private summon(mobId: string, n: number) {
    const alive = [...this.zone.mobs.values()].filter(m => m.summoned).length;
    for (let i = 0; i < n && alive + i < 6; i++) {
      const [x, y] = this.rndPos(2);
      const m = this.zone.spawnMob(mobId, Math.max(1, this.def.level - 2), x, y);
      m.target = this.target(); m.state = 'chase'; m.maxHp = Math.round(m.maxHp * 0.6); m.hp = m.maxHp;
    }
  }
  private moveTo(x: number, y: number) {
    const m = this.mob;
    this.zone.ev({ k: 'fx', n: 'blink', x: m.x, y: m.y, el: m.element });
    m.x = x; m.y = y;
    this.zone.ev({ k: 'fx', n: 'blink', x, y, el: m.element });
  }
  private clampRoom(x: number, y: number): [number, number] {
    const r = this.room;
    return [Math.max((r.x0 + 1.5) * TILE, Math.min((r.x1 - 0.5) * TILE, x)), Math.max((r.y0 + 1.5) * TILE, Math.min((r.y1 - 0.5) * TILE, y))];
  }
  private *spiral(count: number, step: number, interval: number, speed: number, spr: string, mult: number, arms = 1): Gen {
    for (let i = 0; i < count; i++) {
      for (let a = 0; a < arms; a++) this.shoot(this.mob.x, this.mob.y, this.rot + (a / arms) * Math.PI * 2, speed, spr, mult);
      this.rot += step;
      yield interval;
    }
  }
  private *dashLine(t: Player, len: number, w: number, delay: number, mult: number): Gen {
    const m = this.mob;
    const a = Math.atan2(t.y - m.y, t.x - m.x);
    const [ex, ey] = this.clampRoom(m.x + Math.cos(a) * len, m.y + Math.sin(a) * len);
    this.beam(m.x, m.y, ex, ey, w, delay, mult);
    this.anim(Anim.Windup, delay);
    m.facingLeft = ex < m.x ? 1 : 0;
    yield delay;
    this.zone.ev({ k: 'fx', n: 'dash', x: m.x, y: m.y, el: m.element, ang: a });
    m.x = ex; m.y = ey;
    this.anim(Anim.Attack, 0.3);
  }

  // ------------------------------------------------------------------ Muster
  private *phaseChange(): Gen {
    const d = this.def.id, m = this.mob;
    this.chase = false;
    this.anim(Anim.Special, 1.2);
    yield 0.8;
    if (d === 'dornenmutter') { this.say(this.phase === 2 ? '*Die Ranken peitschen. Aus dem Boden kriechen Wurzeln.*' : '*Die Blüte öffnet sich ganz. Sie ist nicht mehr schön.*'); this.summon('wurzelschleicher', this.phase === 2 ? 2 : 3); }
    if (d === 'kristallkoloss') this.say(this.phase === 2 ? '*Der Koloss senkt den Kopf wie ein Stier.*' : '*Risse aus Licht laufen über seinen ganzen Körper.*');
    if (d === 'ignarok') { this.say(this.phase === 2 ? '*Die Decke glüht. Etwas löst sich.*' : '*Ignarok brüllt, und die Lava antwortet.*'); }
    if (d === 'ysolde') { this.say(this.phase === 2 ? '„Du zerreißt mein Muster. Dann webe ich eben mehr von mir.“' : '„Stillstand. Endlich. Halt nur einen Atemzug lang still.“'); if (this.phase === 2) this.summon('frostwisp', 2); }
    if (d === 'archivar') { this.say(this.phase === 2 ? '„Abweichung festgestellt. Hilfskräfte angefordert.“' : '„Eintrag wird gelöscht. Eintrag wird gelöscht. Eintrag wird –“'); if (this.phase === 2) this.summon('arkanauge', 2); }
    if (d === 'hohlkoenig') {
      if (this.phase === 2) { this.say('„Sechs Siegel? Ich habe sie GEGOSSEN. Sieh, was sie hüten sollten!“'); }
      else { this.say('„Maelis … ich höre dich nicht mehr. Wenn du gehst, soll NICHTS bleiben!“'); m.element = 'dark'; this.summon('leerenbrut', 3); this.announce(); }
    }
    if (d === 'vael') {
      this.say(this.phase === 2 ? '„Ihr haltet stand. Gut. Dann schließe ich jetzt die Türen.“' : '„Verzeiht. Ab hier habe ich tausend Jahre Übung.“');
      if (this.phase === 3) this.summon('wachschatten', 2);
    }
    if (d === 'aetherion') {
      if (this.phase === 2) this.say('*Die Asche fällt nach oben. Dann hält die ganze Höhle den Atem an: die Große Stille.*');
      else { this.say('*Sieben Risse aus Licht. Du siehst, was es jede Nacht sieht: den Augenblick, in dem das Herz bricht.*'); this.summon('erinnerter', 2); }
    }
    this.echo?.phase?.(this.kit(), this.phase);
    this.radial(16, 90, this.zone.rng.range(0, 1), 'orb', 0.8);
    yield 0.8;
  }

  private next(): Gen {
    this.chase = false;
    const list = this.echo?.pattern ? [...this.patterns(), this.echoPattern] : this.patterns();
    const g = list[this.idx % list.length];
    this.idx++;
    return g.call(this);
  }
  private *echoPattern(): Gen { yield* this.echo!.pattern!(this.kit()); }
  private patterns(): (() => Gen)[] {
    const p = this.phase;
    switch (this.def.id) {
      case 'dornenmutter': return p === 1 ? [this.dmVolley, this.dmRoots] : p === 2 ? [this.dmVolley, this.dmBurst, this.dmRoots] : [this.dmSpiral, this.dmRoots, this.dmBurst];
      case 'kristallkoloss': return p === 1 ? [this.kkSlam, this.kkBoulders] : p === 2 ? [this.kkCharge, this.kkBoulders, this.kkSlam] : [this.kkRain, this.kkCharge, this.kkSlam];
      case 'ignarok': return p === 1 ? [this.igBreath, this.igPools] : p === 2 ? [this.igBurrow, this.igBreath, this.igMeteors] : [this.igRings, this.igBurrow, this.igMeteors, this.igBreath];
      case 'ysolde': return p === 1 ? [this.ysFans, this.ysBlizzard, this.ysBlink] : p === 2 ? [this.ysLances, this.ysFans, this.ysBlink, this.ysBlizzard] : [this.ysZero, this.ysLances, this.ysBlink, this.ysFans];
      case 'archivar': return p === 1 ? [this.arCross, this.arOrbs, this.arGrid] : p === 2 ? [this.arSpiral, this.arCross, this.arGrid] : [this.arZero, this.arSpiral, this.arCross, this.arOrbs];
      case 'vael': return p === 1 ? [this.vlLantern, this.vlWatch, this.vlRing] : p === 2 ? [this.vlDoors, this.vlLantern, this.vlRing, this.vlWatch] : [this.vlVigil, this.vlSpiral, this.vlDoors, this.vlWatch];
      // Aetherion: der Albtraum durchläuft alle sechs Elemente – Erde/Feuer (der Krieg), Wasser/Wind (die Stille), Licht/Dunkelheit (die Teilung)
      case 'aetherion': return p === 1 ? [this.aeEarth, this.aeFire, this.aeChorus] : p === 2 ? [this.aeWater, this.aeWind, this.aeChorus, this.aeFire] : [this.aeLight, this.aeDark, this.aeChorus, this.aeWater, this.aeEarth];
      default: return p === 1 ? [this.hkDash, this.hkArcs] : p === 2 ? [this.hkElement, this.hkDash, this.hkElement] : [this.hkZero, this.hkSpiral, this.hkDash, this.hkElement];
    }
  }

  // ---- Dornenmutter
  private *dmVolley(): Gen {
    for (let k = 0; k < 2 + (this.phase > 1 ? 1 : 0); k++) {
      const t = this.target(); if (!t) return;
      this.anim(Anim.Windup, 0.5); yield 0.5;
      this.anim(Anim.Attack, 0.3);
      this.aimed(t, 5, 44, 105, 'spore', 0.8, { id: 'poison', dur: 3, chance: 0.5 });
      this.zone.ev({ k: 'sfx', n: 'cast_earth', x: this.mob.x, y: this.mob.y });
      yield 0.6;
    }
  }
  private *dmRoots(): Gen {
    this.anim(Anim.Special, 1.6);
    for (let k = 0; k < 3 + this.phase; k++) {
      for (const t of this.players()) this.tele(t.x, t.y, 22, 0.8, 1.1, { id: 'slow', dur: 2 });
      yield 0.5;
    }
    yield 0.5;
  }
  private *dmBurst(): Gen {
    this.anim(Anim.Windup, 0.7); yield 0.7;
    for (let k = 0; k < 2; k++) {
      this.anim(Anim.Attack, 0.3);
      this.radial(18, 95, k * 0.17, 'spore', 0.8, this.zone.rng.range(0, 6.28), 0.55);
      yield 0.7;
    }
  }
  private *dmSpiral(): Gen { this.anim(Anim.Special, 2.4); yield* this.spiral(36, 0.42, 0.065, 100, 'spore', 0.7, 2); }

  // ---- Kristallkoloss
  private *kkSlam(): Gen {
    const m = this.mob;
    this.anim(Anim.Windup, 0.9);
    this.tele(m.x, m.y, 56, 0.9, 1.5);
    yield 0.95;
    this.anim(Anim.Attack, 0.4);
    this.radial(12, 110, this.zone.rng.range(0, 1), 'rock', 0.8);
    yield 0.5;
  }
  private *kkBoulders(): Gen {
    this.anim(Anim.Special, 1.5);
    for (let k = 0; k < 3 + this.phase; k++) {
      const t = this.target(); if (!t) return;
      this.tele(t.x + this.zone.rng.range(-10, 10), t.y + this.zone.rng.range(-10, 10), 26, 0.85, 1.2);
      yield 0.38;
    }
    yield 0.6;
  }
  private *kkCharge(): Gen {
    const t = this.target(); if (!t) return;
    yield* this.dashLine(t, 230, 34, 0.95, 1.8);
    this.radial(8, 100, 0, 'rock', 0.7);
    this.say('*Der Koloss rammt die Wand und taumelt – jetzt ist er verwundbar!*');
    this.mob.vuln = 1.6; this.anim(Anim.Hurt, 2.5);
    yield 2.5;
    this.mob.vuln = 1;
  }
  private *kkRain(): Gen {
    this.anim(Anim.Special, 2.5);
    this.beam(this.cx - 200, this.cy, this.cx + 200, this.cy, 26, 1.2, 1.4, 'light');
    this.beam(this.cx, this.cy - 140, this.cx, this.cy + 140, 26, 1.2, 1.4, 'light');
    for (let k = 0; k < 10; k++) { const [x, y] = this.rndPos(1); this.tele(x, y, 22, 0.9, 1.1); yield 0.22; }
    yield 0.5;
  }

  // ---- Ignarok
  private *igBreath(): Gen {
    const t = this.target(); if (!t) return;
    const m = this.mob, base = Math.atan2(t.y - m.y, t.x - m.x), dir = this.zone.rng.chance(0.5) ? 1 : -1;
    this.anim(Anim.Windup, 0.6); yield 0.6;
    this.anim(Anim.Attack, 1.1);
    this.zone.ev({ k: 'sfx', n: 'cast_fire', x: m.x, y: m.y });
    const n = 11 + this.phase * 2;
    for (let i = 0; i < n; i++) { this.shoot(m.x, m.y, base + dir * (i / (n - 1) - 0.5) * 1.7, 135, 'orb', 0.8, { status: { id: 'burn', dur: 3, chance: 0.5 } }); yield 0.07; }
    yield 0.4;
  }
  private *igPools(): Gen {
    this.anim(Anim.Special, 1.2);
    const spots = this.players().map(p => [p.x, p.y] as const);
    for (const [x, y] of spots) this.tele(x, y, 28, 0.8, 0.9);
    yield 0.85;
    for (const [x, y] of spots) this.pool(x, y, 28, 6, 0.4, { id: 'burn', dur: 2, chance: 0.5 });
    yield 0.5;
  }
  private *igBurrow(): Gen {
    const m = this.mob;
    this.anim(Anim.Special, 0.6); yield 0.6;
    m.invuln = true;
    const [x, y] = this.rndPos(4);
    this.tele(x, y, 52, 1.3, 1.6);
    this.zone.ev({ k: 'fx', n: 'explosion', x: m.x, y: m.y, r: 30, el: 'fire' });
    m.x = -500; m.y = -500;
    yield 1.35;
    m.x = x; m.y = y; m.invuln = false;
    this.anim(Anim.Attack, 0.4);
    this.radial(14, 115, this.zone.rng.range(0, 1), 'orb', 0.8);
    yield 0.6;
  }
  private *igMeteors(): Gen {
    this.anim(Anim.Special, 2);
    for (let k = 0; k < 7 + this.phase * 2; k++) {
      const t = this.target(); if (!t) return;
      this.tele(t.x + this.zone.rng.range(-40, 40), t.y + this.zone.rng.range(-40, 40), 26, 1, 1.2, { id: 'burn', dur: 3, chance: 0.5 });
      yield 0.22;
    }
    yield 0.5;
  }
  private *igRings(): Gen {
    this.anim(Anim.Special, 2.4);
    let gap = this.zone.rng.range(0, 6.28);
    for (let k = 0; k < 4; k++) { this.radial(26, 85, 0, 'orb', 0.9, gap, 0.42); gap += 0.9; yield 0.62; }
  }

  // ---- Ysolde
  private *ysFans(): Gen {
    for (let k = 0; k < 3; k++) {
      const t = this.target(); if (!t) return;
      this.anim(Anim.Windup, 0.35); yield 0.35;
      this.anim(Anim.Attack, 0.25);
      this.aimed(t, 7 + this.phase, 80, 150, 'shard', 0.8, { id: 'slow', dur: 2, chance: 0.6 });
      this.zone.ev({ k: 'sfx', n: 'cast_water', x: this.mob.x, y: this.mob.y });
      yield 0.45;
    }
  }
  private *ysBlizzard(): Gen {
    this.anim(Anim.Special, 1.2);
    for (const p of this.players()) { this.tele(p.x, p.y, 36, 0.9, 0.8); }
    const spots = this.players().map(p => [p.x, p.y] as const);
    yield 0.95;
    for (const [x, y] of spots) this.pool(x, y, 36, 6, 0.35, { id: 'slow', dur: 1.5 });
    yield 0.4;
  }
  private *ysBlink(): Gen {
    this.anim(Anim.Special, 0.4); yield 0.4;
    const [x, y] = this.rndPos(3);
    this.moveTo(x, y);
    this.zone.ev({ k: 'sfx', n: 'teleport', x, y });
    yield 0.35;
    this.anim(Anim.Attack, 0.3);
    this.radial(14 + this.phase * 2, 120, this.zone.rng.range(0, 1), 'shard', 0.8);
    yield 0.5;
  }
  private *ysLances(): Gen {
    const m = this.mob;
    for (let k = 0; k < 3; k++) {
      this.anim(Anim.Windup, 0.75);
      for (const t of this.players()) {
        const a = Math.atan2(t.y - m.y, t.x - m.x);
        this.beam(m.x, m.y, m.x + Math.cos(a) * 340, m.y + Math.sin(a) * 340, 16, 0.75, 1.5);
      }
      yield 0.8;
      this.anim(Anim.Attack, 0.2);
      this.zone.ev({ k: 'sfx', n: 'freeze', x: m.x, y: m.y });
      yield 0.3;
    }
  }
  private *ysZero(): Gen {
    this.moveTo(this.cx, this.cy - 8);
    this.say('„Absoluter Stillstand.“ – Sucht die warmen Lichtkreise!');
    this.anim(Anim.Special, 2.6);
    this.nuke(2.6, 2.6, 2);
    yield 2.9;
  }

  // ---- Archivar
  private *arCross(): Gen {
    const m = this.mob;
    this.anim(Anim.Special, 2.5);
    let a = this.zone.rng.range(0, 1.5);
    for (let k = 0; k < 4 + this.phase; k++) {
      for (let j = 0; j < 2; j++) { const b = a + (j * Math.PI) / 2; this.beam(m.x - Math.cos(b) * 260, m.y - Math.sin(b) * 260, m.x + Math.cos(b) * 260, m.y + Math.sin(b) * 260, 18, 0.7, 1.4); }
      a += 0.42;
      yield 0.55;
    }
    yield 0.6;
  }
  private *arOrbs(): Gen {
    for (let k = 0; k < 3; k++) {
      this.anim(Anim.Windup, 0.4); yield 0.4;
      this.anim(Anim.Attack, 0.3);
      for (const t of this.players()) this.aimed(t, 3, 36, 78, 'orb', 1.2, { id: 'weak', dur: 3, chance: 0.5 });
      yield 0.6;
    }
  }
  private *arGrid(): Gen {
    this.anim(Anim.Special, 2.6);
    const r = this.room;
    for (let par = 0; par < 2; par++) {
      for (let ty = r.y0 + 1, j = 0; ty <= r.y1; ty += 3, j++) for (let tx = r.x0 + 1, i = 0; tx <= r.x1; tx += 3, i++)
        if ((i + j) % 2 === par) this.tele((tx + 0.5) * TILE, (ty + 0.5) * TILE, 21, 1.1, 1.2);
      yield 1.25;
    }
  }
  private *arSpiral(): Gen {
    this.moveTo(this.cx, this.cy - 8);
    this.anim(Anim.Special, 3);
    yield 0.3;
    yield* this.spiral(26, 0.4, 0.1, 110, 'orb', 0.75, 3);
  }
  private *arZero(): Gen {
    this.moveTo(this.cx, this.cy - 8);
    this.say('„Vollständige Löschung eingeleitet.“ – In die Lichtkreise!');
    this.anim(Anim.Special, 2.4);
    this.nuke(2.4, 2.6, 2);
    yield 2.7;
  }

  // ---- Der Hohle König
  private *hkDash(): Gen {
    for (let k = 0; k < 2 + this.phase; k++) {
      const t = this.target(); if (!t) return;
      yield* this.dashLine(t, 190, 28, this.phase === 3 ? 0.6 : 0.75, 1.5);
      yield 0.25;
    }
  }
  private *hkArcs(): Gen {
    for (let k = 0; k < 3; k++) {
      const t = this.target(); if (!t) return;
      this.anim(Anim.Windup, 0.4); yield 0.4;
      this.anim(Anim.Attack, 0.3);
      this.aimed(t, 7, 70, 140, 'orb', 0.9, { id: 'mark', dur: 4, chance: 0.4 });
      yield 0.5;
    }
  }
  private *hkElement(): Gen {
    const els: Element[] = ['fire', 'water', 'earth', 'wind', 'light'];
    const el = els[this.elemIdx++ % els.length];
    const m = this.mob;
    m.element = el;
    this.announce();
    this.anim(Anim.Special, 2.2);
    yield 0.5;
    if (el === 'fire') { this.say('„Brenne.“'); for (let k = 0; k < 8; k++) { const t = this.target(); if (!t) return; this.tele(t.x + this.zone.rng.range(-36, 36), t.y + this.zone.rng.range(-36, 36), 28, 0.9, 1.3, { id: 'burn', dur: 3 }); yield 0.2; } }
    else if (el === 'water') { this.say('„Erstarre.“'); for (let k = 0; k < 3; k++) { const t = this.target(); if (!t) return; this.aimed(t, 11, 120, 150, 'shard', 0.85, { id: 'slow', dur: 2 }); yield 0.5; } }
    else if (el === 'earth') {
      this.say('„Knie.“');
      for (const t of this.players()) { const a = Math.atan2(t.y - m.y, t.x - m.x); for (let i = 1; i <= 7; i++) this.tele(m.x + Math.cos(a) * i * 30, m.y + Math.sin(a) * i * 30, 18, 0.5 + i * 0.13, 1.3, { id: 'stun', dur: 0.6, chance: 0.5 }); }
      yield 1.6;
    }
    else if (el === 'wind') { this.say('„Zerstreue dich.“'); let gap = this.zone.rng.range(0, 6.28); for (let k = 0; k < 4; k++) { this.radial(28, 100, 0, 'lance', 0.85, gap, 0.4); gap += 1.1; yield 0.55; } }
    else {
      this.say('„Sieh hin.“');
      let a = this.zone.rng.range(0, 1.5);
      for (let k = 0; k < 4; k++) { for (let j = 0; j < 3; j++) { const b = a + (j * Math.PI) / 3; this.beam(m.x - Math.cos(b) * 260, m.y - Math.sin(b) * 260, m.x + Math.cos(b) * 260, m.y + Math.sin(b) * 260, 16, 0.7, 1.4); } a += 0.35; yield 0.6; }
    }
    yield 0.6;
  }
  // 0.8: Spiralen schießen seltener und drehen dafür weiter je Schuss – in den Armen sind jetzt Lücken, durch die eine Figur passt
  // (vorher 50 Schüsse im Abstand von 0,055 s: eine geschlossene Wand, der man nur mit der Rolle entkam)
  private *hkSpiral(): Gen { this.anim(Anim.Special, 3); yield* this.spiral(28, 0.36, 0.1, 115, 'orb', 0.8, 4); }
  private *hkZero(): Gen {
    this.moveTo(this.cx, this.cy - 8);
    this.say('„Alles endet.“ – Sucht das Licht!');
    this.anim(Anim.Special, 2.3);
    this.nuke(2.3, 2.8, 2);
    yield 2.6;
    this.summon('leerenbrut', 2);
  }

  // ---- Vael, Hüter der Dunkelheit (Prüfung – er ergibt sich, siehe yield)
  private *vlLantern(): Gen {
    for (let k = 0; k < 3; k++) {
      const t = this.target(); if (!t) return;
      this.anim(Anim.Windup, 0.4); yield 0.4;
      this.anim(Anim.Attack, 0.3);
      this.aimed(t, 5 + this.phase, 64, 135, 'orb', 0.85, { id: 'mark', dur: 4, chance: 0.4 });
      this.zone.ev({ k: 'sfx', n: 'cast_dark', x: this.mob.x, y: this.mob.y });
      yield 0.5;
    }
  }
  private *vlWatch(): Gen {
    for (let k = 0; k < 1 + this.phase; k++) {
      const t = this.target(); if (!t) return;
      yield* this.dashLine(t, 200, 26, this.phase === 3 ? 0.6 : 0.75, 1.5);
      yield 0.25;
    }
  }
  /** Laternenkreis: ein Ring aus Einschlägen um jeden Spieler mit einer Lücke, dann schließt sich die Mitte. */
  private *vlRing(): Gen {
    this.anim(Anim.Special, 2);
    const spots = this.players().map(p => [p.x, p.y] as const);
    for (const [x, y] of spots) {
      const gap = this.zone.rng.int(0, 7);
      for (let i = 0; i < 8; i++) {
        if (i === gap || i === (gap + 1) % 8) continue;
        const a = (i / 8) * Math.PI * 2;
        this.tele(x + Math.cos(a) * 44, y + Math.sin(a) * 44, 19, 1.0, 1.2, { id: 'slow', dur: 1.5, chance: 0.5 });
      }
      this.tele(x, y, 30, 1.7, 1.5, { id: 'mark', dur: 4 });
    }
    yield 1.9;
  }
  /** Türen schließen: senkrechte Lichtbalken, erst die geraden, dann die ungeraden Bahnen. */
  private *vlDoors(): Gen {
    this.anim(Anim.Special, 2.6);
    const r = this.room, y0 = r.y0 * TILE, y1 = (r.y1 + 1) * TILE;
    for (let par = 0; par < 2; par++) {
      for (let tx = r.x0 + 1, i = 0; tx <= r.x1; tx += 2, i++) if (i % 2 === par) this.beam((tx + 0.5) * TILE, y0, (tx + 0.5) * TILE, y1, TILE * 1.7, 1.0, 1.4);
      yield 1.15;
    }
    yield 0.3;
  }
  private *vlSpiral(): Gen { this.anim(Anim.Special, 2.6); yield* this.spiral(24, 0.4, 0.1, 110, 'orb', 0.75, 3); }
  private *vlVigil(): Gen {
    this.moveTo(this.cx, this.cy - 8);
    this.say('„Die Wacht endet nie.“ – Sucht das Laternenlicht!');
    this.anim(Anim.Special, 2.4);
    this.nuke(2.4, 2.6, 2);
    yield 2.7;
  }

  // ---- Aetherion: die Große Stille (der Albtraum des Alten Krieges; endet, ohne dass das Wesen stirbt)
  private elem(el: Element) { if (this.mob.element !== el) { this.mob.element = el; this.announce(); } }
  /** Erde – Marschtritt: Reihen von Einschlägen ziehen durch den Raum, jede mit einer Lücke. */
  private *aeEarth(): Gen {
    this.elem('earth');
    this.say('*Marschtritt. Sieben Heere, die es nie gab, ziehen durch den Raum.*');
    this.anim(Anim.Special, 2.6);
    const r = this.room, cols = Math.floor((r.x1 - r.x0) / 2);
    for (let k = 0; k < 3 + this.phase; k++) {
      const ty = r.y0 + 1 + ((k * 3) % Math.max(1, r.y1 - r.y0 - 1)), gap = this.zone.rng.int(1, cols - 1);
      for (let i = 0; i <= cols; i++) if (Math.abs(i - gap) > 1) this.tele((r.x0 + 0.5 + i * 2) * TILE, (ty + 0.5) * TILE, 17, 0.9, 1.2, { id: 'stun', dur: 0.5, chance: 0.4 });
      yield 0.55;
    }
    yield 0.6;
  }
  /** Feuer – Brandpfeile: Einschläge auf die Spieler, danach brennende Lachen. */
  private *aeFire(): Gen {
    this.elem('fire');
    this.say('*Brandpfeile. Jemand hat einmal Felder angezündet, damit der Nachbar nichts erntet.*');
    this.anim(Anim.Special, 2.2);
    const spots: (readonly [number, number])[] = [];
    for (let k = 0; k < 6 + this.phase * 2; k++) {
      const t = this.target(); if (!t) return;
      const x = t.x + this.zone.rng.range(-34, 34), y = t.y + this.zone.rng.range(-34, 34);
      this.tele(x, y, 26, 0.95, 1.25, { id: 'burn', dur: 3, chance: 0.6 });
      if (k % 3 === 0) spots.push([x, y]);
      yield 0.2;
    }
    yield 0.8;
    for (const [x, y] of spots) this.pool(x, y, 26, 5, 0.4, { id: 'burn', dur: 2, chance: 0.5 });
    yield 0.4;
  }
  /** Wasser – die Flut: Ringe mit wandernder Lücke. */
  private *aeWater(): Gen {
    this.elem('water');
    this.say('*Die Flut. Brunnen, die überlaufen, weil unten jemand weint.*');
    this.anim(Anim.Special, 2.6);
    let gap = this.zone.rng.range(0, 6.28);
    for (let k = 0; k < 4; k++) { this.radial(26, 88, 0, 'shard', 0.85, gap, 0.44); gap += 0.95; yield 0.6; }
    yield 0.3;
  }
  /** Wind – die Stille holt Atem: ein sich drehendes Kreuz aus Schneisen. */
  private *aeWind(): Gen {
    this.elem('wind');
    this.say('*Es wird still. Die Luft selbst zieht sich zurück.*');
    const m = this.mob;
    this.anim(Anim.Special, 2.8);
    let a = this.zone.rng.range(0, 1.5);
    for (let k = 0; k < 4 + this.phase; k++) {
      for (let j = 0; j < 2; j++) { const b = a + (j * Math.PI) / 2; this.beam(m.x - Math.cos(b) * 270, m.y - Math.sin(b) * 270, m.x + Math.cos(b) * 270, m.y + Math.sin(b) * 270, 18, 0.7, 1.4); }
      a += 0.4;
      yield 0.55;
    }
    yield 0.5;
  }
  /** Licht – sieben Klingen: sieben Schnitte durch die Raummitte, wie damals durch das Herz. */
  private *aeLight(): Gen {
    this.elem('light');
    this.say('*Sieben Klingen aus Licht. Eine für jeden, der in jener Nacht dabeistand.*');
    this.moveTo(this.cx, this.cy - 8);
    this.anim(Anim.Special, 3);
    let off = this.zone.rng.range(0, 1);
    for (let k = 0; k < 2; k++) {
      for (let j = 0; j < 7; j++) { const b = off + (j * Math.PI) / 7; this.beam(this.cx - Math.cos(b) * 280, this.cy - Math.sin(b) * 280, this.cx + Math.cos(b) * 280, this.cy + Math.sin(b) * 280, 13, 1.0, 1.5); }
      off += Math.PI / 14;
      yield 1.2;
    }
    const t = this.target();
    if (t) this.aimed(t, 9, 100, 170, 'lance', 0.9, { id: 'weak', dur: 3, chance: 0.5 });
    yield 0.6;
  }
  /** Dunkelheit – das Vergessen: raumweiter Schlag; sicher ist nur, wer im Licht steht. */
  private *aeDark(): Gen {
    this.elem('dark');
    this.moveTo(this.cx, this.cy - 8);
    this.say('„NICHT … NOCH … EINMAL.“ – In die Lichtkreise!');
    this.anim(Anim.Special, 2.4);
    this.nuke(2.4, 2.8, 2);
    yield 2.7;
    this.summon('erinnerter', 2);
  }
  /** Der Chor: eine Spirale im Element des Augenblicks. */
  // 0.8: höchstens drei Arme, seltener geschossen (siehe hkSpiral) – vier dichte Arme ließen keine Lücke, durch die man hätte laufen können
  private *aeChorus(): Gen { this.anim(Anim.Special, 2.6); yield* this.spiral(22, 0.4, 0.1, 105, 'orb', 0.75, Math.min(3, 1 + this.phase)); }
}
