/**
 * Zufällige Begegnungen am Weg (0.6): Hinterhalt, verirrter Reisender, verletztes Tier, Herausforderer.
 * Wer ein Stück auf den Wegen einer Region gelaufen ist, dem kann – mit langer Pause dazwischen – etwas begegnen.
 * Gespräche führt der Server (Knoten, Optionen, Nähe); Belohnungen sind klein und persönlich.
 */
import { circleFree, moveCircle } from '../../../shared/src/collision';
import { CFG } from '../../../shared/src/config';
import { ANIMALS, ENCOUNTER_KINDS, ENC_TEXT, isRegion, type EncounterKind } from '../../../shared/src/data/events';
import { ITEMS, makeStack } from '../../../shared/src/data/items';
import { BIOME_MATS } from '../../../shared/src/data/materials';
import { mapOf } from '../../../shared/src/data/worlditems';
import { TILE } from '../../../shared/src/maps/tiles';
import type { EncDialog } from '../../../shared/src/types';
import { inSafe, isRoad } from '../../../shared/src/world';
import type { Player } from '../player';
import type { Mob, Obj, Zone } from '../zone';
import { addZoneRep } from './rep';
import { addObj, gw, moveObj, removeMob, removeObj, ringSpot, rnd, spawnMob, zoneLevel, zw, type Encounter } from './state';

const C = CFG.living.encounter;
interface Walk { road: number; nextAt: number; x: number; y: number }
const walks = new WeakMap<Player, Walk>();
const walkOf = (p: Player): Walk => { let w = walks.get(p); if (!w) walks.set(p, (w = { road: 0, nextAt: p.zone.game.now + C.cooldown[0] * 0.5, x: p.x, y: p.y })); return w; };
const HEAL_POTIONS = ['potion_hp1', 'potion_hp2', 'potion_hp3', 'potion_hp4'];
const onRoad = (z: Zone, x: number, y: number) => isRoad(z.map, Math.floor(x / TILE), Math.floor(y / TILE));

/** Straßenzelle in `dist` Schritten Entfernung entlang der Wege (Breitensuche), möglichst weit weg vom Ausgangspunkt */
function roadAhead(z: Zone, x: number, y: number, dist: number): { x: number; y: number } | null {
  const m = z.map, w = m.w, s = Math.floor(y / TILE) * w + Math.floor(x / TILE);
  const d = new Map<number, number>([[s, 0]]), q = [s];
  let best: number | null = null, bd = -1;
  for (let k = 0; k < q.length; k++) {
    const i = q[k], di = d.get(i)!;
    if (di >= dist) { const e = Math.hypot((i % w) * TILE - x, Math.floor(i / w) * TILE - y); if (e > bd && !inSafe(m, (i % w) * TILE + 8, Math.floor(i / w) * TILE + 8)) { bd = e; best = i; } continue; }
    const cx = i % w, cy = (i / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy, n = ny * w + nx;
      if (nx < 1 || ny < 1 || nx >= w - 1 || ny >= m.h - 1 || d.has(n) || !isRoad(m, nx, ny) || m.solid[n]) continue;
      d.set(n, di + 1); q.push(n);
    }
  }
  return best === null ? null : { x: (best % w) * TILE + TILE / 2, y: Math.floor(best / w) * TILE + TILE / 2 };
}
function reward(e: Encounter, mul = 1, map = C.mapChance) {
  const z = e.zone, [lo, hi] = z.def.level, lvl = Math.round((lo + hi) / 2);
  for (const p of e.who) {
    if (p.zone !== z) continue;
    p.gainGold(CFG.enemy.gold(lvl) * C.gold * mul * (1 + p.stats.goldPct / 100));
    p.gainXp(CFG.enemy.xp(lvl) * C.xp * mul * CFG.enemy.xpLevelPenalty(p.level, hi));
    addZoneRep(p, z.id, CFG.living.rep.encounter * mul);
    if (z.rng.chance(map)) p.give(makeStack(mapOf(z.id)));
    p.pev.push({ k: 'sfx', n: 'quest_complete' });
  }
}
function say(e: Encounter, s: string, kind: 'info' | 'good' | 'story' = 'info') { for (const p of e.who) if (p.zone === e.zone) p.toast(s, kind); }
function end(e: Encounter) {
  if (e.done) return;
  e.done = true;
  for (const m of e.mobs) removeMob(e.zone, m);
  for (const o of e.objs) removeObj(e.zone, o);
  for (const p of e.who) if (p.zone === e.zone) p.send({ t: 'encdlg', d: null });
  zw(e.zone).encounters.delete(e);
}
function ambush(e: Encounter, p: Player, n: number, x = p.x, y = p.y) {
  const z = e.zone, lvl = zoneLevel(z, [p], 0);
  for (let i = 0; i < n; i++) { const s = ringSpot(z, x, y, 60, 110); e.mobs.add(spawnMob(z, z.rng.weighted(z.def.mobs), lvl, s.x, s.y, { target: p })); }
  z.ev({ k: 'sfx', n: 'boss_phase', x, y });
}

/** Gesprächsknoten einer Begegnung aus Sicht eines Spielers (null = es gibt gerade nichts zu besprechen) */
function dialog(e: Encounter, p: Player): EncDialog | null {
  const z = e.zone, T = ENC_TEXT;
  if (e.stage !== 'talk') return null;
  if (e.kind === 'reisender') {
    const has = HEAL_POTIONS.some(b => p.countItem(b) > 0);
    return { id: e.id, who: T.reisender.who, look: 'gelehrter', lines: T.reisender.start, opts: [{ s: T.reisender.optEscort }, { s: T.reisender.optItem, off: has ? undefined : T.reisender.optItemOff }, { s: T.reisender.optLeave }] };
  }
  if (e.kind === 'tier') {
    const a = ANIMALS[z.id as keyof typeof ANIMALS];
    return { id: e.id, who: a[1], lines: [a[2]], opts: [{ s: T.tier.optHerb, off: p.countItem('mat_herb') > 0 ? undefined : T.tier.optHerbOff }, { s: T.tier.optGuard }, { s: T.tier.optLeave }] };
  }
  if (e.kind === 'duell') return { id: e.id, who: T.duell.who, look: 'wache', lines: T.duell.start, opts: [{ s: T.duell.optFight }, { s: T.duell.optLeave }] };
  return null;
}
/** Startet eine Begegnung für `p` (auch erzwungen aus Tests und Dev-Befehlen). */
export function startEncounter(p: Player, kind: EncounterKind, at?: { x: number; y: number }): Encounter | null {
  const z = p.zone, zs = zw(z), now = z.game.now;
  if (!isRegion(z.id)) return null;
  const spot = at ?? roadAhead(z, p.x, p.y, 7) ?? ringSpot(z, p.x, p.y, 70, 120);
  const e: Encounter = { id: gw(z.game).nextId++, kind, zone: z, owner: p, x: Math.round(spot.x), y: Math.round(spot.y), until: now + C.lifeSec, stage: 'talk', st: {}, mobs: new Set(), objs: [], who: new Set([p]), done: false };
  const T = ENC_TEXT;
  switch (kind) {
    case 'hinterhalt':
      e.stage = 'fight'; e.x = Math.round(p.x); e.y = Math.round(p.y);
      ambush(e, p, 3);
      p.toast(T.hinterhalt.start, 'bad');
      break;
    case 'reisender':
      e.objs.push(addObj(z, 'npc', e.x, e.y, { dyn: true, enc: e.id, mark: 'enc' }, 'reisender'));
      break;
    case 'tier': {
      const a = ANIMALS[z.id as keyof typeof ANIMALS];
      e.objs.push(addObj(z, 'wobj', e.x, e.y, { frame: a[0], frames: 2, label: a[1], prompt: 'Nach dem Tier sehen', enc: e.id, mark: 'enc' }));
      break;
    }
    case 'duell': {
      const m = spawnMob(z, 'ev_duellant', Math.min(z.def.level[1] + 2, Math.max(z.def.level[0], p.level)), e.x, e.y, {});
      m.invuln = true; m.awake = true; m.tough = true;
      e.mobs.add(m); e.st.knight = m;
      e.objs.push(addObj(z, 'wobj', e.x, e.y + 2, { prompt: 'Herausforderer ansprechen', enc: e.id, mark: 'enc' }));
      break;
    }
  }
  zs.encounters.add(e);
  return e;
}
function near(e: Encounter, p: Player, r = 70): boolean { const o = e.objs[0]; return !!o && Math.hypot(o.x - p.x, o.y - p.y) <= r; }

/** Spieler spricht das Objekt einer Begegnung an → Gesprächsknoten schicken */
export function encounterInteract(z: Zone, p: Player, o: Obj): boolean {
  const id = o.props?.enc;
  if (!id) return false;
  const e = [...zw(z).encounters].find(x => x.id === id);
  if (!e || e.done) return true;
  e.who.add(p);
  const d = dialog(e, p);
  if (d) p.send({ t: 'encdlg', d });
  else if (e.kind === 'reisender' && e.stage === 'escort') p.toast('„Ich bin direkt hinter Euch! Ich zeichne nur kurz diesen Stein.“', 'info');
  else if (e.kind === 'tier') p.toast('Das Tier beobachtet dich. Es hat beschlossen, dass du in Ordnung bist. Vorläufig.', 'info');
  else if (e.kind === 'duell') p.toast(e.stage === 'fight' ? '„Weniger reden! Mehr fechten!“' : ENC_TEXT.duell.leave, 'info');
  return true;
}
/** Auswahl im Gespräch einer Begegnung – geprüft werden Begegnung, Zustand, Nähe, Option und Besitz. */
export function encounterPick(p: Player, id: number, opt: number) {
  const z = p.zone, e = [...zw(z).encounters].find(x => x.id === id), T = ENC_TEXT, now = z.game.now;
  const close = () => p.send({ t: 'encdlg', d: null });
  if (!e || e.done || p.dead || !near(e, p)) return close();
  const d = dialog(e, p), o = d && Number.isInteger(opt) ? d.opts[opt] : undefined;
  if (!d || !o || o.off) return close();
  e.who.add(p);
  close();
  if (e.kind === 'reisender') {
    if (opt === 0) {
      const target = roadAhead(z, e.objs[0].x, e.objs[0].y, 20) ?? ringSpot(z, e.x, e.y, 200, 280);
      e.stage = 'escort'; e.owner = p; e.until = now + C.lifeSec;
      e.st = { tx: target.x, ty: target.y, from: Math.hypot(target.x - e.objs[0].x, target.y - e.objs[0].y), ambushed: false, acc: 0 };
      e.objs.push(addObj(z, 'wobj', target.x, target.y, { frame: 'signpost', label: 'Weggabelung', mark: 'enc' }));
      say(e, T.reisender.escort);
    } else if (opt === 1) {
      const have = HEAL_POTIONS.find(b => p.countItem(b) > 0);
      if (!have || !p.removeItems(have, 1)) return;
      for (const l of T.reisender.fed) say(e, `Odo: „${l}“`);
      reward(e, 1, 0.2); end(e);
    } else { say(e, '„Danke. Ich frage dann den nächsten. Falls einer kommt.“'); e.stage = 'left'; e.until = now + 20; }
  } else if (e.kind === 'tier') {
    if (opt === 0) {
      if (!p.removeItems('mat_herb', 1)) return;
      heal(e);
    } else if (opt === 1) { e.stage = 'guard'; e.owner = p; e.st = { until: now + 18 }; ambush(e, p, 2, e.x, e.y); say(e, T.tier.guard); }
    else { e.stage = 'left'; e.until = now + 20; }
  } else if (e.kind === 'duell') {
    const m = e.st.knight as Mob;
    if (opt === 0) {
      e.stage = 'fight'; e.owner = p; e.until = now + C.lifeSec;
      m.invuln = false; m.target = p; m.state = 'chase'; m.hx = m.x; m.hy = m.y;
      z.ev({ k: 'txt', x: m.x, y: m.y - 34, s: T.duell.fight, col: '#ffe9a8' });
    } else { z.ev({ k: 'txt', x: m.x, y: m.y - 34, s: T.duell.leave, col: '#ffe9a8' }); e.stage = 'left'; e.until = now + 30; }
  }
}
function heal(e: Encounter) {
  const z = e.zone, bio = BIOME_MATS[z.def.biome];
  say(e, ENC_TEXT.tier.healed, 'good');
  z.ev({ k: 'fx', n: 'heal', x: e.x, y: e.y, el: 'earth' });
  for (const p of e.who) if (p.zone === z && bio) p.give(makeStack(bio.ingredient, 2));
  reward(e, 0.8, 0.12); end(e);
}
function tick(e: Encounter, now: number, dt: number) {
  const z = e.zone, T = ENC_TEXT, own = e.owner;
  if (now > e.until || !z.players.has(own.id)) {
    if (e.kind === 'reisender' && e.stage === 'escort') say(e, T.reisender.lost);
    return end(e);
  }
  switch (e.kind) {
    case 'hinterhalt':
      if (!e.mobs.size) { say(e, T.hinterhalt.win, 'good'); reward(e); end(e); }
      break;
    case 'reisender': {
      if (e.stage !== 'escort') break;
      const o = e.objs[0], st = e.st;
      // der Reisende folgt seinem Begleiter
      const dx = own.x - o.x, dy = own.y - o.y, d = Math.hypot(dx, dy);
      if (d > 26 && d < 260 && !own.dead) {
        const step = Math.min(d - 22, 74 * dt);
        const r = moveCircle(z.solidWalk, o.x, o.y, (dx / d) * step, (dy / d) * step, 4);
        if (circleFree(z.solidWalk, r.x, r.y, 4)) moveObj(z, o, r.x, r.y, dt);
      }
      const left = Math.hypot(st.tx - o.x, st.ty - o.y);
      if (!st.ambushed && left < st.from * 0.5) { st.ambushed = true; ambush(e, own, 2, o.x, o.y); say(e, T.reisender.ambush); }
      if (left < 30 && !e.mobs.size) { for (const l of T.reisender.done) say(e, `Odo: „${l}“`, 'good'); reward(e, 1.4, 0.25); end(e); }
      break;
    }
    case 'tier':
      if (e.stage === 'guard') {
        if (Math.hypot(own.x - e.x, own.y - e.y) > 150 || own.dead) { say(e, T.tier.lost); end(e); }
        else if (!e.mobs.size && now >= e.st.until - 12) heal(e);
      }
      break;
    case 'duell': {
      const m = e.st.knight as Mob;
      if (e.stage !== 'fight') break;
      if (m.hp <= m.maxHp * 0.2) { duelWon(e); break; }
      if (own.dead || m.state === 'return' || m.state === 'idle') {
        z.ev({ k: 'txt', x: m.x, y: m.y - 34, s: T.duell.lose, col: '#ffe9a8' });
        m.invuln = true; m.target = null; m.state = 'idle'; m.hp = m.maxHp; m.hitters.clear();
        e.stage = 'left'; e.until = now + 15;
      }
      break;
    }
  }
}
function duelWon(e: Encounter) {
  const m = e.st.knight as Mob, z = e.zone;
  for (const h of m.hitters) e.who.add(h);
  z.ev({ k: 'txt', x: m.x, y: m.y - 34, s: ENC_TEXT.duell.yield, col: '#ffe9a8' });
  say(e, ENC_TEXT.duell.yield, 'good');
  reward(e, 1.3, 0.2); end(e);
}
/** Gegner einer Begegnung gestorben (der Herausforderer zählt auch dann als besiegt, wenn der letzte Schlag zu hart war) */
export function encounterMobDeath(z: Zone, m: Mob, rec: Player[]): boolean {
  for (const e of zw(z).encounters) {
    if (!e.mobs.delete(m)) continue;
    for (const p of rec) e.who.add(p);
    if (e.kind === 'duell' && m === e.st.knight && e.stage === 'fight') duelWon(e);
    return true;
  }
  return false;
}
export function tickEncounters(z: Zone, now: number, dt: number, slow: boolean) {
  const zs = zw(z);
  for (const e of [...zs.encounters]) tick(e, now, dt);
  if (!slow || !gw(z.game).auto || !isRegion(z.id)) return;
  // Wege zählen: nur echtes Laufen auf Wegen außerhalb der Lager (kein Teleport, kein Kampf)
  for (const p of z.players.values()) {
    const w = walkOf(p), d = Math.hypot(p.x - w.x, p.y - w.y);
    w.x = p.x; w.y = p.y;
    if (p.dead || p.linkdead || d < 4 || d > 220 || !onRoad(z, p.x, p.y) || inSafe(z.map, p.x, p.y, 30)) continue;
    w.road += d;
    if (w.road < C.minRoad || now < w.nextAt || now - p.lastHurtAt < 6) continue;
    if ([...zs.encounters].some(e => e.owner === p) || !z.rng.chance(C.chance)) continue;
    w.road = 0; w.nextAt = now + rnd(z, C.cooldown);
    startEncounter(p, z.rng.weighted(ENCOUNTER_KINDS));
  }
}
void ITEMS;
