/**
 * Mana-Risse (0.5), Serverseite: eigene Dungeon-Instanz je Gruppe mit Stufe, Modifikatoren, Boss-Echo, Richtzeit,
 * Lebensfunken und persönlicher Belohnung – dazu die „Prüfung der Sieben“ (sieben Echos nacheinander in einem Raum).
 *
 * Eine Riss-Instanz ist eine gewöhnliche `Zone` desselben Dungeons (gleiche Karte, der Client braucht nichts Neues),
 * die unter eigenem Schlüssel in `Game.zones` liegt und ein `RiftRun` trägt. zone.ts und boss.ts rufen die Funktionen
 * hier an wenigen Stellen auf. Daten und Regeln: shared/src/data/rifts.ts, Zahlen: CFG.rift.
 */
import { circleFree } from '../../shared/src/collision';
import { CFG } from '../../shared/src/config';
import { makeSetPiece } from '../../shared/src/craft';
import { ENEMIES, type BossDef } from '../../shared/src/data/enemies';
import { BOSS_UNIQUE, generateBossUnique, generateGear, makeStack, rescaleItem, rollAffixes, rollRarity } from '../../shared/src/data/items';
import { AETHER, ECHO_FRAG } from '../../shared/src/data/materials';
import { RECIPES, scrollOf } from '../../shared/src/data/recipes';
import { ECHO_TINT, RIFT_DUNGEONS, RIFT_STONE, TRIAL_BOSSES, TRIAL_ID, TRIAL_NAME, TRIAL_RECIPE, TRIAL_ZONE, counterOf, echoBossDef, fmtTime, riftModName, riftMods, riftPar, riftRarity, riftRevives, riftUnlocked, riftZoneDef, trialUnlocked, type RiftModId } from '../../shared/src/data/rifts';
import { SET_BY_DUNGEON, SET_LIST, type SetPiece } from '../../shared/src/data/sets';
import { ZONES } from '../../shared/src/data/zones';
import { getMap, type GameMap, type MobSpawn } from '../../shared/src/maps/mapgen';
import { T, TILE } from '../../shared/src/maps/tiles';
import type { CharData, Element, ItemInstance, RiftInfo } from '../../shared/src/types';
import { BossCtl } from './boss';
import type { Game, Party } from './game';
import { knowsRecipe } from '../../shared/src/craft';
import { pickScroll } from './loot';
import { nextId, type Player } from './player';
import { Social } from './social';
import { Mob, Zone, type Obj } from './zone';

export interface RiftRun {
  id: number;
  /** Dungeon-ID oder TRIAL_ID */
  dungeon: string;
  stufe: number;
  trial: boolean;
  mods: Set<RiftModId>;
  /** Element der Woche (nur mit Modifikator „Elementwoche“) */
  el?: Element;
  lvl: number; ilvl: number; par: number;
  startAt: number;
  revives: number;
  done: { sec: number; bonus: boolean } | null;
  failed: boolean; failAt: number;
  party: Party | null;
  /** charIds aller, die diesen Riss betreten haben – und derer, die er ohne Lebensfunken ausgestoßen hat (sie können nicht zurück) */
  members: Set<number>; out: Set<number>;
  /** Echos dieses Risses (im gewöhnlichen Riss genau eines) und das wievielte gerade dran ist */
  bosses: string[]; bossIdx: number; nextBossAt: number;
  stormAt: number;
  home: { zone: string; x: number; y: number };
}

let NEXT_RUN = 1;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
function reject(p: Player, s: string) { p.toast(s, 'bad'); p.pev.push({ k: 'sfx', n: 'ui_error' }); }
function ensure(c: CharData) { return (c.rift ??= { stufe: 1, seed: 1, best: {} }); }

// ------------------------------------------------------------------ Riss-Stein
/** Der Riss-Stein steht als Server-Objekt (nicht solide) auf der nächsten freien Kachel abseits der Wege – die Karte bleibt unverändert. */
export function riftStones(map: GameMap): Obj[] {
  if (map.id !== RIFT_STONE.zone) return [];
  const poi = map.def.pois?.find(p => p.id === RIFT_STONE.poi);
  if (!poi) return [];
  const I = (x: number, y: number) => y * map.w + x;
  const open = (x: number, y: number) => x >= 2 && y >= 2 && x < map.w - 2 && y < map.h - 2 && !map.solid[I(x, y)] && map.tiles[I(x, y)] !== T.PATH && map.tiles[I(x, y)] !== T.BRIDGE && map.tiles[I(x, y)] !== T.HAZARD;
  const roomy = (x: number, y: number) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!open(x + dx, y + dy)) return false; return true; };
  const taken = (tx: number, ty: number) => map.objects.some(o => Math.abs(Math.floor(o.x / TILE) - tx) <= 2 && Math.abs(Math.floor(o.y / TILE) - ty) <= 2);
  for (let r = 0; r <= 8; r++) for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++) {
    if (Math.max(Math.abs(ox), Math.abs(oy)) !== r) continue;
    const tx = poi.x + RIFT_STONE.dx + ox, ty = poi.y + RIFT_STONE.dy + oy;
    if (!roomy(tx, ty) || taken(tx, ty)) continue;
    return [{ id: nextId(), type: 'riftstone', x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2, state: 0, props: { sid: 'riftstone', label: 'Riss-Stein' } }];
  }
  return [];
}
let stoneCache: { zone: string; x: number; y: number } | null = null;
/** Ankunftspunkt neben dem Riss-Stein (dorthin führt jeder Riss zurück) */
export function riftHome(): { zone: string; x: number; y: number } {
  if (!stoneCache) {
    const map = getMap(RIFT_STONE.zone), s = riftStones(map)[0];
    stoneCache = s ? { zone: map.id, x: s.x, y: s.y + 18 } : { zone: map.id, x: map.start.x, y: map.start.y };
  }
  return stoneCache;
}
function nearStone(p: Player): Obj | undefined {
  for (const o of p.zone.objs.values()) if ((o.type === 'riftstone' || (o.type === 'xobj' && o.props?.kind === 'portal')) && dist(o, p) <= CFG.rift.stoneRadius) return o; // 0.9: auch am Expeditionsportal
  return undefined;
}

export const Rift = {
  // ================================================================== Öffnen, Folgen, Verlassen
  /** Der Anführer öffnet am Riss-Stein einen Riss und nimmt die Gruppenmitglieder in der Nähe mit. */
  start(game: Game, p: Player, dungeon: string, stufe: number) {
    const c = p.char, R = CFG.rift;
    if (p.dead || p.zone.rift) return;
    if (!riftUnlocked(c)) return reject(p, 'Der Riss-Stein schweigt. Erst wer den Hohlen König bezwungen hat, kann ihn wecken.');
    const stone = nearStone(p);
    if (!stone) return reject(p, 'Dafür musst du am Riss-Stein in Quellhain stehen.');
    if (p.party && p.party.leader !== p) return reject(p, 'Nur wer die Gruppe anführt, öffnet den Riss.');
    if (p.party && this.runOf(game, p)) return reject(p, 'Deine Gruppe hat bereits einen offenen Riss – folge ihr am Riss-Stein.');
    const st = ensure(c), trial = dungeon === TRIAL_ID;
    if (trial) {
      if (!trialUnlocked(c)) return reject(p, `Die ${TRIAL_NAME} öffnet sich erst, wenn du Riss-Stufe ${R.trial.unlock} abgeschlossen hast.`);
      stufe = R.trial.stufe;
    } else {
      if (!RIFT_DUNGEONS.includes(dungeon) || !Number.isFinite(stufe)) return;
      stufe = Math.floor(stufe);
      if (stufe < 1 || stufe > st.stufe) return reject(p, `Stufe ${stufe} ist noch nicht freigeschaltet. Schließe zuerst Stufe ${st.stufe} ab.`);
    }
    // ein verlassener eigener Riss wird aufgegeben, sobald ein neuer geöffnet wird
    for (const [key, z] of game.zones) if (z.rift && !z.players.size && z.rift.members.has(p.charId)) game.zones.delete(key);
    const group = p.party ? [...p.party.members].filter(q => q === p || (q.zone === p.zone && !q.dead && !q.linkdead && dist(q, stone) <= R.joinRadius && riftUnlocked(q.char))) : [p];
    const { mods, el } = trial ? { mods: [] as RiftModId[], el: undefined } : riftMods(st.seed, dungeon, stufe);
    const run: RiftRun = {
      id: NEXT_RUN++, dungeon, stufe, trial, mods: new Set(mods), el,
      lvl: R.mobLevel(stufe), ilvl: R.ilvl(stufe), par: trial ? 0 : riftPar(dungeon, stufe),
      startAt: game.now, revives: trial ? R.trial.revives : riftRevives(group.length), done: null, failed: false, failAt: 0,
      party: p.party, members: new Set(), out: new Set(), bosses: trial ? [...TRIAL_BOSSES] : [ZONES[dungeon].boss!], bossIdx: 0, nextBossAt: 0,
      stormAt: game.now + R.sturm.every + 2, home: riftHome(),
    };
    const zone = new Zone(game, riftZoneDef(trial ? TRIAL_ZONE : dungeon, stufe), { key: 'rift:' + run.id, rift: run });
    game.zones.set(zone.key, zone);
    const title = trial ? TRIAL_NAME : `Mana-Riss ${ZONES[dungeon].name}, Stufe ${stufe}`;
    for (const q of group) {
      this.enter(game, q, zone);
      q.toast(q === p ? `${title} öffnet sich.` : `${p.name} öffnet: ${title}.`, 'story');
    }
    if (p.party) for (const q of p.party.members) if (!group.includes(q)) q.toast(`${p.name} hat einen Riss geöffnet (${title}). Am Riss-Stein kannst du folgen.`, 'info');
  },
  /** Zurück in einen offenen Riss: Gruppenmitglieder folgen ihrer Gruppe; wer seinen Riss versehentlich verlassen hat, kehrt um. */
  join(game: Game, p: Player) {
    if (p.dead || p.zone.rift) return;
    if (!riftUnlocked(p.char)) return reject(p, 'Der Riss-Stein schweigt. Erst wer den Hohlen König bezwungen hat, kann ihn wecken.');
    if (!nearStone(p)) return reject(p, 'Dafür musst du am Riss-Stein in Quellhain stehen.');
    const zone = this.runOf(game, p);
    if (!zone) return reject(p, 'Es steht gerade kein Riss für dich offen.');
    if (zone.rift!.out.has(p.charId)) return reject(p, 'Dieser Riss hat dich ausgestoßen. Ohne Lebensfunken führt kein Weg zurück.');
    this.enter(game, p, zone);
  },
  /** Die Instanz eines noch laufenden Risses, in den dieser Spieler gehört: der seiner Gruppe (solange jemand darin ist) oder einer, den er selbst betreten hatte. */
  runOf(game: Game, p: Player): Zone | undefined {
    let best: Zone | undefined;
    for (const z of game.zones.values()) {
      const r = z.rift;
      if (!r || r.done || r.failed) continue;
      if (((p.party && r.party === p.party && z.players.size) || r.members.has(p.charId)) && (!best || r.id > best.rift!.id)) best = z; // der jüngste zählt
    }
    return best;
  },
  enter(game: Game, p: Player, zone: Zone) {
    const run = zone.rift!;
    run.members.add(p.charId);
    ensure(p.char);
    game.moveTo(p, zone, this.entry(zone));
    p.pev.push({ k: 'sfx', n: 'teleport' });
  },
  /** Ankunftspunkt: der Dungeon-Eingang; in der Prüfung der Sieben der untere Rand des Bossraums */
  entry(zone: Zone): { x: number; y: number } {
    const room = zone.map.bossRoom;
    if (zone.rift!.trial && room) {
      for (let ty = room.y1; ty > room.cy + 1; ty--) {
        const x = (room.cx + 0.5) * TILE, y = (ty + 0.5) * TILE;
        if (circleFree(zone.solidWalk, x, y, CFG.player.radius + 2)) return { x, y };
      }
    }
    return zone.map.start;
  },
  /** Zurück zum Riss-Stein (Ausgang, „Riss verlassen“ oder kein Lebensfunke mehr). */
  leave(game: Game, p: Player) {
    const z = p.zone, h = z.home;
    if (!z.rift || !h) return;
    p.statuses.clear();
    game.moveTo(p, game.zone(h.zone, game.worldKreis(p)), { x: h.x, y: h.y });
    p.pev.push({ k: 'sfx', n: 'teleport' });
  },
  /** Wiederkehr eines Gefallenen: kostet einen Lebensfunken der Gruppe; ohne Funken stößt der Riss ihn aus. */
  respawn(game: Game, p: Player) {
    const z = p.zone, run = z.rift!;
    if (!run.done && (run.failed || run.revives <= 0)) {
      p.toast('Kein Lebensfunke mehr – der Riss stößt dich aus.', 'bad');
      run.out.add(p.charId);
      this.leave(game, p);
      return;
    }
    if (!run.done) { run.revives--; for (const q of z.players.values()) q.toast(`${p.name} kehrt zurück. Lebensfunken: ${run.revives}`, run.revives ? 'info' : 'bad'); }
    game.moveTo(p, z, this.entry(z));
    this.broadcast(z);
  },

  // ================================================================== Aufbau der Instanz
  bossDef(run: RiftRun): BossDef {
    const R = CFG.rift;
    const d = echoBossDef(run.bosses[run.bossIdx], run.lvl, { el: run.el, hpMul: R.hpMul(run.stufe) * (run.trial ? R.trial.hpMul : 1), dmgMul: R.dmgMul(run.stufe) });
    return run.mods.has('hast') ? { ...d, speed: d.speed * CFG.rift.hast.speed } : d;
  },
  /** Wird am Ende des Zone-Konstruktors aufgerufen: Gegner nach Stufe und Modifikatoren, Regeln der Instanz. */
  setup(zone: Zone) {
    const run = zone.rift!, R = CFG.rift, mods = run.mods;
    zone.home = run.home;
    zone.ilvlCap = run.ilvl;
    if (mods.has('glas')) { zone.mod.dmgTaken = R.glas.dmgTaken; zone.mod.cd = R.glas.cd; }
    if (mods.has('versiegt')) zone.mod.heal = R.versiegt.heal;
    if (mods.has('duerre')) { zone.mod.mpRegen = R.duerre.regen; zone.mod.mpGain = R.duerre.gain; }
    if (mods.has('finsternis')) zone.mod.aggro = R.finsternis.aggro;
    if (zone.boss) zone.boss.mob.tint = ECHO_TINT;
    // jeder Ausgang der Instanz führt zurück zum Riss-Stein
    for (const o of zone.objs.values()) if (o.type === 'exit') o.props = { ...o.props, to: run.home.zone, label: 'Quellhain', req: undefined, reqMsg: undefined };
    if (run.trial) return; // Prüfung der Sieben: nur die Echos, kein Weg dorthin
    const eliteCh = mods.has('erwacht') ? R.erwacht.eliteChance : R.eliteChance;
    const put = (s: MobSpawn, idx: number, x: number, y: number, elite: boolean) => {
      const m = new Mob(ENEMIES[s.mob], run.lvl, x, y, elite, s.group, idx);
      this.tune(zone, m);
      zone.mobs.set(m.id, m);
    };
    zone.map.spawns.forEach((s, i) => {
      put(s, i, s.x, s.y, !!s.elite || zone.rng.chance(eliteCh));
      if (!mods.has('horde') || !zone.rng.chance(R.horde.extra)) return;
      const solid = ENEMIES[s.mob].flying ? zone.solidFly : zone.solidWalk;
      for (let k = 0; k < 8; k++) {
        const a = zone.rng.range(0, 6.28), x = s.x + Math.cos(a) * 14, y = s.y + Math.sin(a) * 14;
        if (circleFree(solid, x, y, 6)) { put(s, i, x, y, zone.rng.chance(eliteCh)); break; }
      }
    });
  },
  /** Wendet Stufe und Modifikatoren des Risses auf einen Gegner an (auch auf später beschworene). */
  tune(zone: Zone, m: Mob) {
    const run = zone.rift!, R = CFG.rift, mods = run.mods;
    const horde = mods.has('horde');
    m.maxHp = Math.max(1, Math.round(m.maxHp * R.hpMul(run.stufe) * (horde ? R.horde.hp : 1))); m.hp = m.maxHp;
    m.baseDmg *= R.dmgMul(run.stufe) * (horde ? R.horde.dmg : 1); m.dmg = m.baseDmg;
    if (mods.has('hast')) { m.speed *= R.hast.speed; m.cdMul = R.hast.cd; }
    if (run.el) { m.element = run.el; m.resistO = [run.el]; const c = counterOf(run.el); m.weakO = c ? [c] : []; }
  },
  info(zone: Zone): RiftInfo {
    const run = zone.rift!;
    return {
      dungeon: run.dungeon, stufe: run.stufe, mods: [...run.mods], el: run.el, par: run.par,
      t: Math.round(run.done ? run.done.sec : zone.game.now - run.startAt), revives: run.revives,
      done: run.done ?? undefined, failed: run.failed || undefined, trial: run.trial ? [run.bossIdx + (run.done ? 1 : 0), run.bosses.length] : undefined,
    };
  },
  broadcast(zone: Zone) { const r = this.info(zone); for (const p of zone.players.values()) p.send({ t: 'rift', r }); },

  // ================================================================== laufender Riss
  tick(zone: Zone, dt: number) {
    const run = zone.rift!, R = CFG.rift, now = zone.game.now, mods = run.mods;
    if (run.failed) { if (now >= run.failAt) for (const p of [...zone.players.values()]) { if (p.dead) { p.dead = false; p.hp = Math.round(p.stats.maxHp * 0.5); } this.leave(zone.game, p); } return; }
    if (run.done) return;
    // Wuchernd: wer eine Weile nicht getroffen wurde, heilt – Brennen und Gift halten die Wunde offen
    if (mods.has('wucher')) for (const m of zone.mobs.values()) {
      if (m.dead || m.invuln || !m.awake || m.hp >= m.maxHp || now - (m.hurtUntil - 0.15) < R.wucher.calm || m.has('burn', now) || m.has('poison', now)) continue;
      m.hp = Math.min(m.maxHp, m.hp + m.maxHp * R.wucher.regen * (m.boss ? 0.33 : 1) * dt);
    }
    // Manasturm: Blitze dorthin, wo die Spieler gerade stehen
    if (mods.has('sturm') && now >= run.stormAt) {
      run.stormAt = now + R.sturm.every;
      for (const p of zone.alivePlayers()) zone.addFx({ kind: 'tele', x: p.x, y: p.y, r: R.sturm.radius, el: run.el ?? 'wind', dur: R.sturm.delay, until: now + R.sturm.delay, hostile: true, raw: CFG.enemy.dmg(run.lvl) * R.sturm.mult, lvl: run.lvl, by: 'Manasturm' });
    }
    // Prüfung der Sieben: das nächste Echo erwacht
    if (run.nextBossAt && now >= run.nextBossAt && zone.map.bossRoom) {
      run.nextBossAt = 0;
      const b = this.spawnBoss(zone);
      for (const p of zone.players.values()) p.toast(`${b.def.name} erwacht (${run.bossIdx + 1}/${run.bosses.length}).`, 'story');
    }
    // Alle gefallen und kein Funke mehr: der Riss schließt sich
    if (run.revives <= 0 && zone.players.size && [...zone.players.values()].every(p => p.dead || p.linkdead)) {
      run.failed = true; run.failAt = now + 4;
      for (const p of zone.players.values()) p.toast('Der letzte Lebensfunke ist erloschen. Der Riss schließt sich.', 'bad');
      this.broadcast(zone);
    }
  },
  spawnBoss(zone: Zone): BossCtl {
    const b = new BossCtl(zone, this.bossDef(zone.rift!), zone.map.bossRoom!);
    b.mob.tint = ECHO_TINT;
    zone.boss = b;
    zone.ev({ k: 'mob+', m: b.mob.info() });
    zone.ev({ k: 'fx', n: 'spawn', x: b.mob.x, y: b.mob.y, el: b.mob.element });
    return b;
  },
  /** Glutspur, Berstend und Echo-Fragmente von Erwachten */
  onMobDeath(zone: Zone, m: Mob) {
    const run = zone.rift!, R = CFG.rift, now = zone.game.now;
    if (run.done || run.failed) return;
    const dmg = CFG.enemy.dmg(run.lvl);
    if (run.mods.has('brand')) zone.addFx({ kind: 'zone', x: m.x, y: m.y, r: R.brand.radius, el: 'fire', dur: R.brand.dur, until: now + R.brand.dur, tick: 0.5, nextTick: now + 0.6, hostile: true,
      raw: dmg * R.brand.mult, lvl: run.lvl, status: { id: 'burn', dur: 2, chance: 0.5 }, by: 'Glutspur' });
    if (run.mods.has('bersten')) zone.addFx({ kind: 'tele', x: m.x, y: m.y, r: R.bersten.radius, el: m.element, dur: R.bersten.delay, until: now + R.bersten.delay, hostile: true,
      raw: dmg * R.bersten.mult, lvl: run.lvl, by: 'Berstender ' + m.def.name });
    if (!m.elite || m.summoned) return;
    const rec = new Set<Player>();
    for (const p of m.hitters) if (zone.players.has(p.id)) { rec.add(p); if (p.party) for (const q of p.party.members) if (q.zone === zone) rec.add(q); }
    for (const p of rec) if (zone.rng.chance(R.fragElite)) zone.dropItemFor(p, makeStack(ECHO_FRAG), m.x + zone.rng.range(-8, 8), m.y + zone.rng.range(-6, 6));
  },

  // ================================================================== Abschluss und Belohnung
  /** Ein Echo ist besiegt (Aufruf aus BossCtl.finish, nach dem Aufräumen des Kampfes). */
  bossDown(zone: Zone, boss: BossCtl) {
    const run = zone.rift!, R = CFG.rift, game = zone.game, d = boss.def, now = game.now;
    const all = [...zone.players.values()];
    for (const p of all) if (p.dead) { p.dead = false; p.hp = Math.round(p.stats.maxHp * 0.5); p.toast('Der Sieg deiner Gruppe reißt dich zurück ins Leben.', 'good'); }
    if (run.bossIdx < run.bosses.length - 1) {
      // Prüfung der Sieben: kurze Atempause, dann das nächste Echo
      run.bossIdx++; run.nextBossAt = now + R.trial.pause;
      for (const p of all) {
        p.gainXp(d.xp * 0.25);
        p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.maxHp * 0.5); p.mp = Math.min(p.stats.maxMp, p.mp + p.stats.maxMp * 0.5);
        p.toast(`${d.name} ist verklungen – ${run.bossIdx} von ${run.bosses.length}. Atme durch.`, 'good');
      }
      this.broadcast(zone);
      return;
    }
    const sec = Math.max(1, Math.round(now - run.startAt)), bonus = !run.trial && sec <= run.par;
    run.done = { sec, bonus };
    for (const p of all) {
      const st = ensure(p.char), key = run.trial ? TRIAL_ID : run.dungeon, old = st.best[key];
      if (!old || run.stufe > old[0] || (run.stufe === old[0] && sec < old[1])) st.best[key] = [run.stufe, sec];
      p.gainXp(d.xp);
      p.gainGold(d.gold * (1 + p.stats.goldPct / 100));
      if (run.trial) {
        const first = !st.trial;
        st.trial = (st.trial ?? 0) + 1;
        if (first) { if (!p.char.title) { p.char.title = 'sieben'; p.sync('title'); game.broadcastPlayerInfo(p); } p.toast(`${TRIAL_NAME} bestanden! Du trägst nun den Titel „Bezwinger der Sieben“.`, 'story'); }
        else p.toast(`${TRIAL_NAME} bestanden – in ${fmtTime(sec)}.`, 'good');
      } else {
        const next = Math.min(R.maxStufe, run.stufe + 1);
        const unlocked = next > st.stufe;
        if (unlocked) st.stufe = next;
        st.seed++; // neue Modifikatoren für die nächsten Risse dieses Charakters
        p.toast(`Riss geschlossen in ${fmtTime(sec)}${bonus ? ' – unter der Richtzeit, eine Bonustruhe erscheint' : ` (Richtzeit ${fmtTime(run.par)})`}.${unlocked ? ` Stufe ${next} ist freigeschaltet.` : ''}`, 'good');
      }
      p.sync('rift');
    }
    zone.addDynamicObj('chest', boss.cx, boss.cy - 3 * TILE, { tier: 'gold', rift: 1 });
    if (bonus) zone.addDynamicObj('chest', boss.cx + 3 * TILE, boss.cy - 3 * TILE, { tier: 'gold', rift: 2, bonus: true });
    Social.groupChest(zone, boss.cx - 3 * TILE, boss.cy - 3 * TILE); // 0.7: Gruppentruhe, wenn mindestens zwei aus einer Gruppe dabei waren
    // das Portal zurück wird bewusst betreten (nicht versehentlich, bevor die Truhe geöffnet ist)
    zone.addDynamicObj('exit', boss.cx, boss.cy + 3 * TILE, { to: run.home.zone, look: 'portal', label: 'Quellhain', manual: true, verb: 'Riss verlassen', r: 0 });
    this.broadcast(zone);
    game.saveZonePlayers(zone);
  },
  /** Persönlicher Inhalt der Riss-Truhen: 1 = Belohnung, 2 = Bonustruhe (unter der Richtzeit). */
  openChest(zone: Zone, p: Player, kind: number) {
    const run = zone.rift!, R = CFG.rift, r = zone.rng, cls = p.char.cls, s = run.stufe;
    const w = riftRarity(s);
    if (kind === 2) {
      for (let i = 0; i < R.bonusGear; i++) p.give(generateGear(r, run.ilvl, Math.max(3, rollRarity(r, w)), cls));
      p.give(makeStack(ECHO_FRAG, R.bonusFragments(s)));
      if (r.chance(R.bonusAether)) p.give(makeStack(AETHER));
      return;
    }
    p.gainGold(CFG.enemy.gold(run.lvl) * r.range(20, 30) * (1 + p.stats.goldPct / 100));
    for (let i = 0; i < R.chestGear; i++) p.give(generateGear(r, run.ilvl, rollRarity(r, w), cls));
    if (run.trial) {
      p.give(makeStack(ECHO_FRAG, R.trial.fragments));
      p.give(makeStack(AETHER, R.trial.aether));
      p.give(this.setPiece(zone, r.pick(SET_LIST).id, cls));
      // einmalige Belohnung: das Rezept, das es nur hier gibt
      const rec = RECIPES[TRIAL_RECIPE];
      if (rec && !knowsRecipe(p.char, rec) && !p.countItem(scrollOf(rec.id))) p.give(makeStack(scrollOf(rec.id)));
      return;
    }
    p.give(makeStack(ECHO_FRAG, R.fragments(s)));
    if (r.chance(R.aether(s))) p.give(makeStack(AETHER));
    const set = SET_BY_DUNGEON[run.dungeon];
    if (set && r.chance(R.setPiece(s))) p.give(this.setPiece(zone, set.id, cls));
    if (r.chance(R.scroll)) { const sc = pickScroll(zone, p); if (sc) p.give(makeStack(sc)); }
    const u = BOSS_UNIQUE[run.bosses[0]];
    if (u && r.chance(R.unique)) {
      // 0.9: halb die benannte Waffe, halb das benannte Stück für einen der neuen Plätze (BOSS_UNIQUE_GEAR)
      const it = generateBossUnique(r, run.bosses[0], cls, r.chance(0.2), r.chance(0.5))!;
      rescaleItem(it, run.ilvl);
      p.give(it);
    }
  },
  /** Ein Setteil auf der Gegenstandsstufe des Risses (der Grundgegenstand bleibt der des Sets, damit die Teile zusammenzählen). */
  setPiece(zone: Zone, setId: string, cls: CharData['cls']): ItemInstance {
    const run = zone.rift!, r = zone.rng;
    const piece: SetPiece = r.weighted([['ring', 3], ['amulet', 3], ['helm', 2], ['armor', 2], ['gloves', 2], ['boots', 2]] as const);
    const it = makeSetPiece(r, setId, piece, cls, Math.max(2, rollRarity(r, riftRarity(run.stufe))));
    it.ilvl = run.ilvl;
    it.affixes = rollAffixes(r, run.ilvl, it.rarity, cls, it.base);
    return it;
  },
  /** Für Tests und die Oberfläche: Namen der Modifikatoren eines Risses */
  modNames(run: RiftRun): string[] { return [...run.mods].map(m => riftModName(m, run.el)); },
};
