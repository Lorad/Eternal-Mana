/**
 * Weltereignisse (0.6): kleiner Rahmen je Oberwelt-Zone – ansagen, laufen lassen, Beiträge zählen, jeden Beteiligten
 * genau einmal persönlich belohnen, aufräumen. Dazu die Ereignisarten (Mana-Woge, Sternenregen, Fahrende Händlerin,
 * Stolleneinsturz, Aschesturm, Schneesturmjagd) und die Weltbosse.
 * Beute bleibt persönlich; wer in einer Gruppe hilft, bekommt mindestens die Stufe des besten Gruppenmitglieds.
 */
import { CFG } from '../../../shared/src/config';
import { knowsRecipe } from '../../../shared/src/craft';
import { EVENTS, TRADER_SLOTS, eventPool, isNight, isRegion, traderGoods, type EventDef, type EventKind } from '../../../shared/src/data/events';
import { discounted, shopDiscount } from '../../../shared/src/data/factions';
import { ITEMS, generateGear, makeStack, newUid, rollRarity } from '../../../shared/src/data/items';
import { AETHER, BIOME_MATS, ECHO_FRAG, ESSENCE } from '../../../shared/src/data/materials';
import { TRADER_NPC } from '../../../shared/src/data/npcs_welt';
import { NPCS } from '../../../shared/src/data/npcs';
import { WORLD_BOSSES, type WorldBossDef } from '../../../shared/src/data/rares';
import { LEARNABLE, scrollOf } from '../../../shared/src/data/recipes';
import { STAR, mapOf, trophyOf } from '../../../shared/src/data/worlditems';
import { ZONES } from '../../../shared/src/data/zones';
import { getMap } from '../../../shared/src/maps/mapgen';
import type { Element, ItemInstance, ModKey, TraderOffer, WorldEventInfo } from '../../../shared/src/types';
import { Rng, strHash } from '../../../shared/src/util/rng';
import type { Game } from '../game';
import type { Player } from '../player';
import type { Mob, Obj, Zone } from '../zone';
import { addRep, addZoneRep } from './rep';
import { addObj, alive, eventSites, gw, mapSites, placeName, placeOf, playersNear, removeMob, removeObj, ringSpot, rnd, seasonOf, spawnMob, worldOf, worldTime, zoneLevel, zw, type ActiveEvent, type BossWindow, type TraderState } from './state';

const L = CFG.living, E = L.events, B = L.boss;
const TIER_NAME = ['', 'Bronze', 'Silber', 'Gold'];
const essenceOf = (el: Element): string | undefined => (ESSENCE as Record<string, string>)[el];

export function credit(ev: ActiveEvent, p: Player, n: number) { ev.contrib.set(p.charId, (ev.contrib.get(p.charId) ?? 0) + n); }
const dirty = (ev: ActiveEvent) => { zw(ev.zone).dirty = true; };
function engage(ev: ActiveEvent, now: number) { if (!ev.engaged) { ev.engaged = true; ev.until = now + E.fightSec; dirty(ev); } }
function tellZone(z: Zone, s: string, kind: 'story' | 'info' | 'good' = 'story') { for (const p of z.players.values()) { p.toast(s, kind); p.send({ t: 'chat', from: '', s, ch: 'sys' }); } }

/** Eine Rezeptrolle der Welt (auch die nur hier erhältlichen), die der Spieler noch nicht kennt und nicht bei sich trägt */
export function worldScroll(z: Zone, p: Player): string | null {
  const max = z.def.level[1] + 6;
  const open = LEARNABLE.filter(r => r.src !== 'ruf' && !r.exclusive && !knowsRecipe(p.char, r) && !p.countItem(scrollOf(r.id)) && r.level <= max && (!r.cls || r.cls === p.char.cls));
  return open.length ? scrollOf(z.rng.pick(open).id) : null;
}
/** Trophäe: beim ersten Mal sicher, danach mit `repeat`. Wer sie schon in der Sammlung oder im Rucksack hat, bekommt beim ersten Mal keine zweite. */
export function giveTrophy(z: Zone, p: Player, id: string, repeat: number) {
  const have = !!p.char.flags[`tr:${id}`] || p.countItem(trophyOf(id)) > 0;
  if (!have || z.rng.chance(repeat)) p.give(makeStack(trophyOf(id)));
}

// =====================================================================================================================
//  Ereignisarten
// =====================================================================================================================
interface Kind {
  start(ev: ActiveEvent, now: number): boolean;
  tick(ev: ActiveEvent, now: number): void;
  onMobDeath?(ev: ActiveEvent, m: Mob, rec: Player[], now: number): void;
  interact?(ev: ActiveEvent, p: Player, o: Obj, now: number): boolean;
  /** zusätzliche Belohnung je Art */
  reward?(ev: ActiveEvent, p: Player, tier: number): void;
  end?(ev: ActiveEvent, now: number): void;
}
const regionMats = (z: Zone) => BIOME_MATS[z.def.biome];

function spawnWave(ev: ActiveEvent, mobs: string[], opts: { leader?: string; rMin?: number; rMax?: number } = {}) {
  const z = ev.zone, near = alive(playersNear(z, ev.x, ev.y, 360)), lvl = zoneLevel(z, near);
  const put = (id: string, name?: string) => {
    const s = ringSpot(z, ev.x, ev.y, opts.rMin ?? 40, opts.rMax ?? 90);
    let target: Player | null = null, bd = 1e9;
    for (const p of near) { const d = Math.hypot(p.x - s.x, p.y - s.y); if (d < bd) { bd = d; target = p; } }
    ev.mobs.add(spawnMob(z, id, lvl, s.x, s.y, { target, name }));
  };
  for (const id of mobs) put(id);
  if (opts.leader) put(opts.leader);
  z.ev({ k: 'sfx', n: 'boss_phase', x: ev.x, y: ev.y });
}
function forceWeather(z: Zone, weather: string, until: number) {
  z.weather = weather; z.weatherUntil = until;
  for (const p of z.players.values()) p.send({ t: 'env', weather });
}

const KINDS: Record<EventKind, Kind> = {
  // ---------------------------------------------------------------- Mana-Woge: drei Wellen, die letzte mit Anführer
  woge: {
    start(ev) {
      ev.objs.push(addObj(ev.zone, 'wobj', ev.x, ev.y, { frame: 'mana_surge', label: 'Mana-Woge', light: [84, 0x70ffe0, 0.9], mark: 'event' }));
      ev.st = { wave: 0, waves: 3, nextAt: 0 };
      ev.prog = [0, 3];
      return true;
    },
    tick(ev, now) {
      const st = ev.st, z = ev.zone;
      if (!ev.engaged) { if (alive(playersNear(z, ev.x, ev.y, 240)).length) engage(ev, now); return; }
      if (ev.mobs.size === 0 && now >= st.nextAt) {
        if (st.wave >= st.waves) { ev.result = 'win'; return; }
        st.wave++;
        const near = alive(playersNear(z, ev.x, ev.y, 360)).length;
        const n = Math.min(9, 2 + st.wave + Math.floor(Math.max(0, near - 1) * 1.5));
        const mobs = ['wogenling'];
        while (mobs.length < n) mobs.push(z.rng.weighted(z.def.mobs));
        spawnWave(ev, mobs, { leader: st.wave === st.waves ? 'ev_wogenbrecher' : undefined });
        for (const p of playersNear(z, ev.x, ev.y, 420)) p.toast(st.wave === st.waves ? 'Die letzte Welle – etwas Großes kommt mit!' : `Welle ${st.wave} von ${st.waves}!`, 'info');
      }
      if (now > ev.until) ev.result = 'fail';
    },
    onMobDeath(ev, m, rec, now) {
      for (const p of rec) credit(ev, p, m.def.named ? 3 : 1);
      if (ev.mobs.size === 0) { ev.st.nextAt = now + 3; ev.prog = [ev.st.wave, ev.st.waves]; dirty(ev); }
    },
    reward(ev, p, tier) {
      const z = ev.zone, bio = regionMats(z);
      if (bio) p.give(makeStack(bio.monster, tier));
      p.give(makeStack(ESSENCE.water, tier >= 3 ? 2 : 1));
    },
  },
  // ---------------------------------------------------------------- Sternenregen: Splitter fallen, jeder sammelt für sich
  sterne: {
    start(ev, now) {
      ev.st = { nextStar: now + 2, stars: [] as { o: Obj; until: number }[], turn: 0 };
      ev.engaged = true; ev.until = now + E.stars.durSec;
      ev.prog = [0, E.stars.bonusAt];
      return true;
    },
    tick(ev, now) {
      const st = ev.st, z = ev.zone;
      for (let i = st.stars.length - 1; i >= 0; i--) if (now > st.stars[i].until) { removeObj(z, st.stars[i].o); st.stars.splice(i, 1); }
      if (now >= st.nextStar) {
        st.nextStar = now + E.stars.everySec / Math.max(1, Math.min(3, z.players.size));
        const ps = alive([...z.players.values()]);
        // abwechselnd im Umkreis eines Spielers und am Ort der Ansage – so findet jeder welche, ohne dass sie ihm in die Tasche fallen
        const c = ps.length && st.turn++ % 3 ? ps[st.turn % ps.length] : ev;
        const s = ringSpot(z, c.x, c.y, 60, 300);
        const o = addObj(z, 'wobj', s.x, s.y, { frame: 'star_shard', light: [44, 0xfff0c8, 0.65], hide1: true, prompt: 'Sternsplitter aufheben', mark: 'star' });
        o.looted = new Set();
        st.stars.push({ o, until: now + E.stars.lifeSec });
        z.ev({ k: 'fx', n: 'shard', x: o.x, y: o.y });
        z.ev({ k: 'sfx', n: 'collect_shard', x: o.x, y: o.y });
      }
      if (now > ev.until || (!st.forced && !isNight(z.game.tod()))) ev.result = ev.contrib.size ? 'win' : 'fail';
    },
    interact(ev, p, o) {
      if (!o.looted || !ev.st.stars.some((s: { o: Obj }) => s.o === o)) return false;
      if (o.looted.has(p.charId)) return true;
      o.looted.add(p.charId);
      p.give(makeStack(STAR, ev.zone.rng.chance(0.15) ? 2 : 1));
      credit(ev, p, 1);
      p.pev.push({ k: 'obj', id: o.id, state: 1 }, { k: 'sfx', n: 'collect_shard' }, { k: 'fx', n: 'shard', x: o.x, y: o.y });
      dirty(ev);
      return true;
    },
    reward(ev, p, tier) { if ((ev.contrib.get(p.charId) ?? 0) >= E.stars.bonusAt) p.give(makeStack(STAR, tier >= 3 ? 2 : 1)); },
    end(ev) { for (const s of ev.st.stars) removeObj(ev.zone, s.o); },
  },
  // ---------------------------------------------------------------- Fahrende Händlerin: bleibt kurz, wechselnde Ware
  haendler: {
    start(ev, now) {
      const z = ev.zone, zs = zw(z);
      const npc = addObj(z, 'npc', ev.x, ev.y, { dyn: true, mark: 'trader' }, TRADER_NPC);
      ev.objs.push(npc, addObj(z, 'wobj', ev.x + 26, ev.y - 6, { frame: 'cart' }));
      const rng = new Rng(strHash(`${z.id}:haendler:${zs.traderVisits++}:${Math.floor(worldTime(z.game) / 60)}`));
      const goods = traderGoods(z.def.id as any), picks = [...goods.fixed], pool = goods.pool.map(g => [g, g.w] as [typeof g, number]);
      while (picks.length < TRADER_SLOTS && pool.length) {
        const g = rng.weighted(pool);
        pool.splice(pool.findIndex(x => x[0] === g), 1);
        if (!picks.some(x => x.item === g.item)) picks.push(g);
      }
      const offers = picks.map(g => {
        let item: ItemInstance = makeStack(g.item);
        if (g.unique) { item = { uid: newUid(), base: g.item, rarity: 3, ilvl: z.def.level[1] + 1, up: 0, affixes: g.unique.affixes.map(a => [...a] as [ModKey, number]), name: g.unique.name }; }
        return { item, price: g.price, max: g.max, unique: g.unique?.key };
      });
      ev.st = { offers, bought: new Map(), npc } as TraderState;
      ev.engaged = true; ev.until = now + E.trader.durSec;
      return true;
    },
    tick(ev, now) { if (now > ev.until) ev.result = 'win'; },
    reward(_ev, p) { p.give(makeStack('food_bread', 2)); p.toast('Vesna lässt ihren Kunden zum Abschied Honigbrot da. Es ist von gestern. Sie sagt, das gehöre so.', 'info'); },
  },
  // ---------------------------------------------------------------- Stolleneinsturz: Geröll räumen, Kumpel befreien
  einsturz: {
    start(ev) {
      const z = ev.zone, piles: any[] = [];
      for (let i = 0; i < 3; i++) {
        let s = ringSpot(z, ev.x, ev.y, 46, 120);
        for (let k = 0; k < 8 && piles.some(p => Math.hypot(p.o.x - s.x, p.o.y - s.y) < 40); k++) s = ringSpot(z, ev.x, ev.y, 46, 130);
        piles.push({ o: addObj(z, 'wobj', s.x, s.y, { frame: 'rubble', label: 'Verschüttet!', prompt: 'Geröll wegräumen', mark: 'event' }), need: 0, done: 0, half: false, freed: false });
      }
      for (const p of piles) ev.objs.push(p.o);
      ev.st = { piles, hitAt: new Map<number, number>() };
      ev.prog = [0, 3];
      return true;
    },
    tick(ev, now) { if (ev.engaged && now > ev.until) ev.result = 'fail'; },
    interact(ev, p, o, now) {
      const st = ev.st, z = ev.zone, pile = st.piles.find((x: any) => x.o === o);
      if (!pile) return false;
      if (pile.freed || now - (st.hitAt.get(p.charId) ?? -9) < 0.6) return true;
      st.hitAt.set(p.charId, now);
      engage(ev, now);
      if (!pile.need) pile.need = 5 + 2 * alive(playersNear(z, ev.x, ev.y, 360)).length;
      pile.done++;
      credit(ev, p, 1);
      z.ev({ k: 'fx', n: 'rubble', x: o.x, y: o.y });
      z.ev({ k: 'sfx', n: 'wall_break', x: o.x, y: o.y });
      p.pev.push({ k: 'txt', x: o.x, y: o.y - 18, s: `${pile.done}/${pile.need}`, col: '#ffe9a8' });
      if (!pile.half && pile.done * 2 >= pile.need) {
        pile.half = true;
        const lvl = zoneLevel(z, [p]);
        for (let i = 0; i < 2; i++) { const s = ringSpot(z, o.x, o.y, 40, 80); ev.mobs.add(spawnMob(z, z.rng.weighted(z.def.mobs), lvl, s.x, s.y, { target: p })); }
        p.toast('Das Scharren hat etwas angelockt!', 'bad');
      }
      if (pile.done >= pile.need) {
        pile.freed = true;
        removeObj(z, o);
        ev.objs.push(addObj(z, 'npc', o.x, o.y, { dyn: true }, 'kumpel'));
        z.ev({ k: 'txt', x: o.x, y: o.y - 30, s: z.rng.pick(NPCS.kumpel.greet), col: '#ffe9a8' });
        z.ev({ k: 'sfx', n: 'secret', x: o.x, y: o.y });
        const freed = st.piles.filter((x: any) => x.freed).length;
        ev.prog = [freed, 3]; dirty(ev);
        if (freed >= 3) ev.result = 'win';
      }
      return true;
    },
    onMobDeath(ev, _m, rec) { for (const p of rec) credit(ev, p, 1); },
    reward(ev, p, tier) { const bio = regionMats(ev.zone); p.give(makeStack('mat_crystal', 1 + tier)); if (bio) p.give(makeStack(bio.ingredient, tier)); },
  },
  // ---------------------------------------------------------------- Aschesturm: Aschenteufel im Auge des Sturms
  aschesturm: {
    start(ev, now) {
      forceWeather(ev.zone, 'ash', now + E.arriveSec + E.fightSec);
      ev.objs.push(addObj(ev.zone, 'wobj', ev.x, ev.y, { frame: 'ember_vent', label: 'Auge des Sturms', light: [90, 0xff7030, 0.9], mark: 'event' }));
      ev.st = { need: 0, kills: 0, nextSpawn: 0, nextStrike: 0 };
      return true;
    },
    tick(ev, now) {
      const st = ev.st, z = ev.zone;
      const near = alive(playersNear(z, ev.x, ev.y, 300));
      if (!ev.engaged) { if (near.length) { engage(ev, now); st.need = 8 + 4 * (near.length - 1); ev.prog = [0, st.need]; } return; }
      if (now >= st.nextSpawn && ev.mobs.size < 3 + near.length && st.kills + ev.mobs.size < st.need) {
        st.nextSpawn = now + 5;
        spawnWave(ev, ['ev_aschenteufel', 'ev_aschenteufel', 'ev_aschenteufel'].slice(0, Math.min(3, st.need - st.kills - ev.mobs.size)), { rMin: 60, rMax: 140 });
      }
      if (now >= st.nextStrike) {
        st.nextStrike = now + 3.5;
        const lvl = zoneLevel(z, near);
        for (const p of near) z.addFx({ kind: 'tele', x: p.x, y: p.y, r: 26, el: 'fire', dur: 1.1, until: now + 1.1, hostile: true, raw: CFG.enemy.dmg(lvl) * 1.1, lvl, by: 'Aschesturm' });
      }
      if (now > ev.until) ev.result = 'fail';
    },
    onMobDeath(ev, _m, rec) {
      for (const p of rec) credit(ev, p, 1);
      ev.st.kills++; ev.prog = [ev.st.kills, ev.st.need]; dirty(ev);
      if (ev.st.kills >= ev.st.need) ev.result = 'win';
    },
    reward(ev, p, tier) { const bio = regionMats(ev.zone); if (bio) p.give(makeStack(bio.monster, tier)); p.give(makeStack(ESSENCE.fire, tier >= 3 ? 2 : 1)); },
    end(ev, now) { ev.zone.weatherUntil = now; },
  },
  // ---------------------------------------------------------------- Schneesturmjagd: Fährten folgen, Leitwolf stellen
  jagd: {
    start(ev, now) {
      forceWeather(ev.zone, 'blizzard', now + E.arriveSec + E.fightSec);
      ev.st = { step: 0, steps: 3, track: null as Obj | null, leader: null as Mob | null };
      ev.st.track = addObj(ev.zone, 'wobj', ev.x, ev.y, { frame: 'snowdrift', label: 'Frische Fährte', prompt: 'Fährte lesen', mark: 'event' });
      ev.objs.push(ev.st.track);
      ev.prog = [0, 4];
      return true;
    },
    tick(ev, now) { if (ev.engaged && now > ev.until) ev.result = 'fail'; },
    interact(ev, p, o, now) {
      const st = ev.st, z = ev.zone;
      if (o !== st.track) return false;
      engage(ev, now);
      credit(ev, p, 2);
      removeObj(z, o);
      st.step++; st.track = null;
      ev.prog = [st.step, st.steps + 1]; dirty(ev);
      if (st.step < st.steps) {
        const s = ringSpot(z, o.x, o.y, 110, 190);
        ev.x = s.x; ev.y = s.y;
        st.track = addObj(z, 'wobj', s.x, s.y, { frame: 'snowdrift', label: 'Frische Fährte', prompt: 'Fährte lesen', mark: 'event' });
        ev.objs.push(st.track);
        p.toast(['Die Spur ist frisch. Vier Pfoten, tief eingedrückt – er ist schwer.', 'Hier hat er gewartet. Auf dich, wie es aussieht.'][st.step - 1] ?? 'Weiter.', 'info');
      } else {
        const lvl = zoneLevel(z, alive(playersNear(z, o.x, o.y, 360)));
        const s = ringSpot(z, o.x, o.y, 50, 90);
        st.leader = spawnMob(z, 'ev_sturmwolf', lvl, s.x, s.y, { target: p });
        ev.mobs.add(st.leader);
        for (let i = 0; i < 2 + Math.min(2, playersNear(z, o.x, o.y, 360).length - 1); i++) { const q = ringSpot(z, o.x, o.y, 50, 100); ev.mobs.add(spawnMob(z, 'frostwolf', lvl, q.x, q.y, { target: p })); }
        z.ev({ k: 'sfx', n: 'boss_phase', x: o.x, y: o.y });
        for (const q of playersNear(z, o.x, o.y, 420)) q.toast('Die Fährte endet. Aus dem Schneetreiben löst sich etwas Weißes.', 'story');
      }
      return true;
    },
    onMobDeath(ev, m, rec) {
      for (const p of rec) credit(ev, p, m === ev.st.leader ? 4 : 1);
      if (m === ev.st.leader) { ev.prog = [4, 4]; ev.result = 'win'; }
    },
    reward(ev, p, tier) { const bio = regionMats(ev.zone); if (bio) p.give(makeStack(bio.monster, 1 + tier)); p.give(makeStack(ESSENCE.water, tier >= 3 ? 2 : 1)); },
    end(ev, now) { ev.zone.weatherUntil = now; },
  },
};

// =====================================================================================================================
//  Rahmen: starten, laufen, belohnen, aufräumen
// =====================================================================================================================
function newEvent(z: Zone, def: EventDef, x: number, y: number, now: number): ActiveEvent {
  const g = gw(z.game);
  return { id: g.nextId++, def, zone: z, x, y, startedAt: now, until: now + E.arriveSec, engaged: false, contrib: new Map(), mobs: new Set(), objs: [], st: {},
    result: null, paid: new Set(), shown: new Set(), emptySince: 0, goal: def.goal };
}
/** Startet ein Ereignis in der Zone (auch erzwungen aus Tests und Dev-Befehlen). `at` legt den Ort fest. */
export function startEvent(z: Zone, kind: EventKind, at?: { x: number; y: number }, force = false): ActiveEvent | null {
  const zs = zw(z), def = EVENTS[kind], now = z.game.now;
  if (!def || zs.event) return null;
  if (def.night && !force && !isNight(z.game.tod())) return null;
  const site = at ?? (() => { const s = eventSites(z, force ? 0 : E.minPlayerDist); return s.length ? z.rng.pick(s) : null; })();
  if (!site) return null;
  const ev = newEvent(z, def, Math.round(site.x), Math.round(site.y), now);
  if (force) ev.st.forced = true;
  if (!KINDS[kind].start(ev, now)) return null;
  if (force) ev.st.forced = true;
  zs.event = ev;
  gw(z.game).events.add(ev);
  gw(z.game).dirty = true;
  tellZone(z, `${def.name} ${placeName(z, ev.x, ev.y)}: ${def.start}`);
  z.ev({ k: 'sfx', n: 'secret' });
  return ev;
}
/** Beitragsstufe 0..3 je Charakter: Anteil am fairen Anteil; Gruppenmitglieder in der Nähe erben die beste Stufe ihrer Gruppe. */
export function tiersOf(ev: ActiveEvent): Map<Player, number> {
  const g = ev.zone.game, out = new Map<Player, number>();
  let total = 0, n = 0;
  for (const v of ev.contrib.values()) if (v > 0) { total += v; n++; }
  if (!n) return out;
  const fair = total / n;
  for (const [charId, v] of ev.contrib) {
    const p = g.players.get(charId);
    if (!p || v <= 0) continue;
    const share = v / fair;
    out.set(p, share >= E.tiers[1] ? 3 : share >= E.tiers[0] ? 2 : 1);
  }
  for (const [p, t] of [...out]) if (p.party) for (const q of p.party.members) {
    if (q.zone !== ev.zone || Math.hypot(q.x - ev.x, q.y - ev.y) > E.nearRadius) continue;
    if ((out.get(q) ?? 0) < t) out.set(q, t);
  }
  return out;
}
function payout(ev: ActiveEvent) {
  const z = ev.zone, kind = KINDS[ev.def.kind], [lo, hi] = z.def.level, lvl = Math.round((lo + hi) / 2);
  for (const [p, tier] of tiersOf(ev)) {
    if (ev.paid.has(p.charId)) continue;
    ev.paid.add(p.charId);
    const k = E.tierMul[tier - 1] * ev.def.mul;
    if (k > 0) {
      p.gainGold(CFG.enemy.gold(lvl) * E.gold * k * (1 + p.stats.goldPct / 100));
      p.gainXp(CFG.enemy.xp(lvl) * E.xp * k * CFG.enemy.xpLevelPenalty(p.level, hi));
      addZoneRep(p, z.id, CFG.living.rep.event[tier] * Math.max(0.5, ev.def.mul));
      if (tier >= 2 && z.rng.chance(E.mapChance)) p.give(makeStack(mapOf(z.id)));
      if (tier >= 2 && z.rng.chance(E.scrollChance)) { const s = worldScroll(z, p); if (s) p.give(makeStack(s)); }
      if (tier >= 2 && hi >= L.echo.minLevel && z.rng.chance(L.echo.event)) p.give(makeStack(ECHO_FRAG)); // Welten der Neuen Kreise
    }
    kind.reward?.(ev, p, tier);
    if (k > 0) p.toast(`${ev.def.name} abgeschlossen – dein Beitrag: ${TIER_NAME[tier]}.`, 'good');
    p.pev.push({ k: 'sfx', n: 'quest_complete' });
  }
}
/** Beendet ein Ereignis: belohnen (bei Erfolg), ansagen, alles wegräumen, das nächste einplanen. */
export function finishEvent(ev: ActiveEvent, result: 'win' | 'fail', quiet = false) {
  const z = ev.zone, zs = zw(z), g = gw(z.game), now = z.game.now;
  if (!g.events.has(ev)) return;
  ev.result = result;
  if (ev.boss) return finishBoss(ev, result, quiet);
  if (result === 'win') payout(ev);
  KINDS[ev.def.kind].end?.(ev, now);
  if (!quiet) tellZone(z, result === 'win' ? ev.def.win : ev.def.fail, result === 'win' ? 'good' : 'info');
  if (result === 'win') z.ev({ k: 'sfx', n: 'puzzle_solved', x: ev.x, y: ev.y });
  for (const m of ev.mobs) removeMob(z, m);
  for (const o of ev.objs) removeObj(z, o);
  ev.mobs.clear(); ev.objs = [];
  g.events.delete(ev);
  if (zs.event === ev) zs.event = null;
  zs.nextEventAt = now + rnd(z, E.gap);
  g.dirty = true;
}
/** Wählt und startet das nächste Ereignis einer Region, sobald es fällig ist. */
export function scheduleEvents(z: Zone, now: number) {
  const zs = zw(z);
  if (zs.event || !isRegion(z.id)) return;
  if (zs.nextEventAt < 0) { zs.nextEventAt = now + rnd(z, E.firstDelay); return; }
  if (now < zs.nextEventAt) return;
  const pool = eventPool(z.id, seasonOf(z.game).season, isNight(z.game.tod()));
  if (!pool.length || !startEvent(z, z.rng.weighted(pool))) zs.nextEventAt = now + 30; // kein freier Ort: gleich noch einmal versuchen
}
export function tickEvent(ev: ActiveEvent, now: number) {
  if (ev.boss) return tickBoss(ev, now);
  if (!ev.engaged && now > ev.until) { finishEvent(ev, 'fail'); return; }
  KINDS[ev.def.kind].tick(ev, now);
  if (ev.result) finishEvent(ev, ev.result);
}
export function eventMobDeath(z: Zone, m: Mob, rec: Player[]): boolean {
  const zs = zw(z), now = z.game.now;
  for (const ev of [zs.event, zs.boss]) {
    if (!ev || !ev.mobs.delete(m)) continue;
    if (ev.boss) bossMobDeath(ev, m, rec);
    else { KINDS[ev.def.kind].onMobDeath?.(ev, m, rec, now); if (ev.result) finishEvent(ev, ev.result); }
    return true;
  }
  return false;
}
export function eventInteract(z: Zone, p: Player, o: Obj): boolean {
  const ev = zw(z).event;
  if (!ev || !KINDS[ev.def.kind].interact) return false;
  const hit = KINDS[ev.def.kind].interact!(ev, p, o, z.game.now);
  if (ev.result) finishEvent(ev, ev.result);
  return hit;
}
export function eventInfo(ev: ActiveEvent, p: Player): WorldEventInfo {
  const now = ev.zone.game.now;
  const prog = ev.def.kind === 'sterne' ? [Math.min(E.stars.bonusAt, ev.contrib.get(p.charId) ?? 0), E.stars.bonusAt] as [number, number] : ev.prog;
  return { id: ev.id, kind: ev.def.kind, zone: ev.zone.id, name: ev.def.name, x: ev.x, y: ev.y, until: Math.max(0, Math.round(ev.until - now)), goal: ev.goal, prog, boss: ev.boss ? 1 : undefined };
}

// =====================================================================================================================
//  Fahrende Händlerin: Angebot und Kauf
// =====================================================================================================================
function traderOf(z: Zone): { ev: ActiveEvent; st: TraderState } | null {
  const ev = zw(z).event;
  return ev && ev.def.kind === 'haendler' ? { ev, st: ev.st as TraderState } : null;
}
export function traderOffers(z: Zone, p: Player): TraderOffer[] | undefined {
  const t = traderOf(z);
  if (!t) return undefined;
  const disc = shopDiscount(p.char, z.id), bought = t.st.bought.get(p.charId) ?? [];
  return t.st.offers.map((o, i) => ({ item: { ...o.item, uid: 'shop' }, price: discounted(o.price, disc), left: o.unique && p.char.flags[`vu:${o.unique}`] ? 0 : Math.max(0, o.max - (bought[i] ?? 0)) }));
}
export function traderBuy(p: Player, idx: number, qty: number): boolean {
  const z = p.zone, t = traderOf(z);
  const bad = (s: string) => { p.toast(s, 'bad'); p.pev.push({ k: 'sfx', n: 'ui_error' }); return false; };
  if (!t || p.dead) return false;
  if (Math.hypot(t.st.npc.x - p.x, t.st.npc.y - p.y) > 80) return bad('Dafür musst du bei der Händlerin stehen.');
  const o = t.st.offers[idx];
  if (!o) return false;
  const bought = t.st.bought.get(p.charId) ?? [];
  const left = o.max - (bought[idx] ?? 0);
  if (o.unique && p.char.flags[`vu:${o.unique}`]) return bad('„Das hab ich dir schon einmal verkauft. Ich verkaufe nichts zweimal an denselben – das spricht sich sonst herum.“');
  if (left <= 0) return bad('„Mehr davon hab ich nicht für dich. Der Karren ist kein Lagerhaus.“');
  const stack = !!ITEMS[o.item.base].stack;
  qty = stack ? Math.max(1, Math.min(left, Math.floor(qty) || 1)) : 1;
  const price = discounted(o.price, shopDiscount(p.char, z.id)) * qty;
  if (p.char.gold < price) return bad('Nicht genug Gold.');
  const it: ItemInstance = { ...o.item, affixes: o.item.affixes.map(a => [...a] as typeof a), uid: newUid(), qty: stack ? qty : undefined };
  if (!p.addItem(it)) return bad('Inventar voll.');
  p.char.gold -= price; p.sync('gold');
  bought[idx] = (bought[idx] ?? 0) + qty; t.st.bought.set(p.charId, bought);
  if (o.unique) { p.char.flags[`vu:${o.unique}`] = 1; p.sync('flags'); }
  if (!t.ev.contrib.has(p.charId)) addZoneRep(p, z.id, CFG.living.rep.trader);
  credit(t.ev, p, 1);
  p.send({ t: 'loot', item: it });
  p.pev.push({ k: 'sfx', n: 'buy' });
  p.checkCollectQuests();
  return true;
}

// =====================================================================================================================
//  Weltbosse
// =====================================================================================================================
/** Welt-Instanzen einer Region (jeder Neue Kreis hat seine eigene; Mana-Risse zählen nie dazu) */
const worldsOf = (g: Game, zoneId: string) => [...g.zones.values()].filter(z => z.id === zoneId && !z.rift);
/**
 * Öffnet den Auftritt eines Weltbosses und sagt ihn auf dem ganzen Server an. Der Auftritt gilt für die Region in jeder
 * Welt (Kreis); in einer Instanz steht der Boss, sobald dort jemand ist (`spawnBossIn`).
 */
export function openBossWindow(g: Game, def: WorldBossDef, zoneId?: string, at?: { x: number; y: number }): BossWindow | null {
  const G = gw(g);
  if (G.bossWin.has(def.id)) return null;
  // bevorzugt dort, wo gerade jemand ist
  const busy = def.zones.filter(id => worldsOf(g, id).some(z => z.players.size));
  const zid = zoneId && (def.zones as string[]).includes(zoneId) ? zoneId : (busy.length ? busy : def.zones)[Math.floor(Math.random() * (busy.length || def.zones.length))];
  const sites = mapSites(getMap(zid)), site = at ?? sites[Math.floor(Math.random() * sites.length)];
  if (!site) return null;
  const win: BossWindow = { def, zoneId: zid, site: { x: Math.round(site.x), y: Math.round(site.y) }, until: g.now + B.despawnSec, done: new Set(), kills: 0, infoId: G.nextId++ };
  G.bossWin.set(def.id, win);
  G.bossNext[def.id] = worldTime(g) + B.respawn[0] + Math.random() * (B.respawn[1] - B.respawn[0]);
  G.dirty = true;
  g.sysChat(`${def.announce} ${ZONES[zid].name}, ${placeOf(getMap(zid), win.site.x, win.site.y)}.`);
  for (const p of g.players.values()) p.toast(`Weltboss: ${def.name} – ${ZONES[zid].name}`, 'story');
  for (const z of worldsOf(g, zid)) if (z.players.size) spawnBossIn(z, win);
  return win;
}
/** Stellt den Weltboss eines laufenden Auftritts in diese Welt-Instanz – außer er wurde hier schon besiegt. */
export function spawnBossIn(z: Zone, win: BossWindow): ActiveEvent | null {
  const zs = zw(z), def = win.def, now = z.game.now;
  if (zs.boss || z.rift || z.id !== win.zoneId || win.done.has(z.key) || now > win.until) return null;
  const evDef: EventDef = { kind: 'boss' as EventKind, name: def.name, glyph: '☠', start: def.announce, goal: def.title, win: def.win, fail: def.gone, mul: 1 };
  const ev = newEvent(z, evDef, win.site.x, win.site.y, now);
  ev.boss = def; ev.win = win; ev.engaged = true; ev.until = win.until;
  const m = spawnMob(z, def.mob, z.def.level[1] + 2, ev.x, ev.y, { summoned: false }); // z.def trägt im Neuen Kreis schon die höhere Stufe
  m.tough = true; m.ownScale = true; m.awake = false;
  ev.bossMob = m;
  ev.st = { base: m.maxHp, n: 1, step: 0, nextAt: 0, acc: 0 };
  zs.boss = ev;
  gw(z.game).events.add(ev); gw(z.game).dirty = true;
  return ev;
}
/** Erzwungener Auftritt (Tests, Dev-Befehl): öffnet ihn nötigenfalls und stellt den Boss sofort in diese Instanz. */
export function startBoss(g: Game, def: WorldBossDef, zone?: string | Zone, at?: { x: number; y: number }): ActiveEvent | null {
  const want = typeof zone === 'object' ? zone : undefined;
  const running = gw(g).bossWin.get(def.id);
  const win = running ?? openBossWindow(g, def, want?.id ?? (zone as string | undefined), at);
  if (!win) return null;
  const z = want ?? g.zone(win.zoneId), here = zw(z).boss;
  if (running) return here ? null : spawnBossIn(z, win);        // läuft schon: höchstens noch in eine weitere Welt stellen
  return here?.win === win ? here : spawnBossIn(z, win);        // eben geöffnet: steht er dort schon (jemand war da), sonst jetzt
}
function refresh(z: Zone, m: Mob) { z.ev({ k: 'mob-', id: m.id }); z.ev({ k: 'mob+', m: m.info() }); }
function bossAttack(ev: ActiveEvent, what: WorldBossDef['pattern'][number], near: Player[], now: number) {
  const z = ev.zone, m = ev.bossMob!, def = ev.boss!, by = def.name, el = m.element;
  const tele = (x: number, y: number, r: number, delay: number, mult: number) => z.addFx({ kind: 'tele', x, y, r, el, dur: delay, until: now + delay, hostile: true, raw: m.dmg * mult, lvl: m.lvl, by });
  switch (what) {
    case 'stomp': tele(m.x, m.y, 78, 1.3, 1.5); break;
    case 'rain': for (const p of near) tele(p.x, p.y, 30, 1.1, 1.1); break;
    case 'lines': for (const p of near.slice(0, 3)) {
      const a = Math.atan2(p.y - m.y, p.x - m.x);
      z.addFx({ kind: 'tele', shape: 'line', x: m.x, y: m.y, x2: m.x + Math.cos(a) * 260, y2: m.y + Math.sin(a) * 260, w: 22, r: 0, el, dur: 1, until: now + 1, hostile: true, raw: m.dmg * 1.3, lvl: m.lvl, by });
    } break;
    case 'ring': {
      const n = 12, off = z.rng.range(0, 6.28);
      for (let i = 0; i < n; i++) { const a = off + (i / n) * Math.PI * 2; z.spawnProj({ x: m.x, y: m.y - 6, vx: Math.cos(a) * 95, vy: Math.sin(a) * 95, life: 2.2, r: 5, hostile: true, lvl: m.lvl, raw: m.dmg * 0.7, el, pierce: 0, by }, def.proj); }
      z.ev({ k: 'sfx', n: 'cast_' + (el === 'phys' ? 'dark' : el), x: m.x, y: m.y });
      break;
    }
    case 'adds': {
      const want = Math.min(4, 1 + near.length) - Math.max(0, ev.mobs.size - 2);
      for (let i = 0; i < want; i++) { const s = ringSpot(z, m.x, m.y, 50, 100); ev.mobs.add(spawnMob(z, z.rng.pick(def.adds), m.lvl - 2, s.x, s.y, { target: near[i % Math.max(1, near.length)] ?? null })); }
      break;
    }
  }
}
function tickBoss(ev: ActiveEvent, now: number) {
  const z = ev.zone, m = ev.bossMob!, st = ev.st, def = ev.boss!;
  if (m.dead) return;
  const near = alive(playersNear(z, m.x, m.y, B.radius));
  for (const p of near) if (!ev.shown.has(p)) { ev.shown.add(p); p.pev.push({ k: 'boss', id: m.id, name: `${def.name} – ${def.title}`, phase: 1, el: m.element }); p.pev.push({ k: 'sfx', n: 'boss_phase' }); }
  for (const p of ev.shown) if (!z.players.has(p.id) || Math.hypot(p.x - m.x, p.y - m.y) > B.radius + 140) { ev.shown.delete(p); if (z.players.has(p.id)) p.pev.push({ k: 'bossend', id: m.id, won: false }); }
  const inFight = m.state !== 'idle' && m.state !== 'return';
  if (inFight) {
    // Leben wächst mit den Teilnehmern (und schrumpft im laufenden Kampf nicht wieder)
    const n = Math.max(st.n, near.length);
    if (n > st.n) { const k = (1 + B.hpPerPlayer * (n - 1)) / (1 + B.hpPerPlayer * (st.n - 1)); m.maxHp = Math.round(m.maxHp * k); m.hp = Math.round(m.hp * k); st.n = n; refresh(z, m); }
    // Beitrag: wer getroffen hat und im Kampf bleibt, sammelt Zeit an
    if ((st.acc = (st.acc ?? 0) + 1) % 4 === 0) for (const p of m.hitters) if (!p.dead && near.includes(p)) credit(ev, p, 1);
    if (now >= st.nextAt) { st.nextAt = now + def.every; bossAttack(ev, def.pattern[st.step++ % def.pattern.length], near, now); }
  } else if (m.state === 'idle' && st.n > 1 && m.hp >= m.maxHp) {
    m.maxHp = m.hp = st.base; st.n = 1; ev.contrib.clear(); refresh(z, m);
    for (const a of ev.mobs) removeMob(z, a);
    ev.mobs.clear();
  }
  if (!inFight && now > ev.win!.until) finishEvent(ev, 'fail', true); // der Auftritt ist vorbei (angesagt wird das einmal für alle Welten)
}
function bossMobDeath(ev: ActiveEvent, _m: Mob, rec: Player[]) { for (const p of rec) credit(ev, p, 2); }
/** Der Weltboss selbst ist gefallen: alle Beteiligten persönlich belohnen. */
export function bossKilled(ev: ActiveEvent, rec: Player[]) {
  for (const p of rec) credit(ev, p, 1);
  finishEvent(ev, 'win');
}
function bossReward(ev: ActiveEvent, p: Player, tier: number) {
  const z = ev.zone, def = ev.boss!, m = ev.bossMob!, r = z.rng, k = E.tierMul[tier - 1];
  p.gainGold(CFG.enemy.gold(m.lvl) * B.gold * k * (1 + p.stats.goldPct / 100));
  p.gainXp(CFG.enemy.xp(m.lvl) * B.xp * k * CFG.enemy.xpLevelPenalty(p.level, m.lvl));
  const ess = essenceOf(def.element);
  if (ess) p.give(makeStack(ess, Math.max(1, Math.round(r.int(B.essences[0], B.essences[1]) * k))));
  const bio = BIOME_MATS[z.def.biome];
  if (bio) p.give(makeStack(bio.monster, 2 + tier));
  if (tier >= 2) p.give(generateGear(r, Math.min(z.ilvlCap, m.lvl), Math.max(2, rollRarity(r, B.rarity)), p.char.cls));
  if (r.chance(B.aether * k)) p.give(makeStack(AETHER));
  if (r.chance(B.scroll * k)) { const s = worldScroll(z, p); if (s) p.give(makeStack(s)); }
  if (r.chance(B.map * k)) p.give(makeStack(mapOf(z.id)));
  // ab Stufe 40 (Welten der Neuen Kreise): sparsam Echo-Fragmente
  if (m.lvl >= L.echo.minLevel && r.chance(L.echo.boss * k)) p.give(makeStack(ECHO_FRAG, tier >= 3 ? 2 : 1));
  giveTrophy(z, p, def.id, 0.2);
  p.char.flags[`wb:${def.id}`] = (p.char.flags[`wb:${def.id}`] ?? 0) + 1; p.sync('flags');
  addZoneRep(p, z.id, CFG.living.rep.worldBoss * k);
  p.toast(`${def.name} besiegt – dein Beitrag: ${TIER_NAME[tier]}.`, 'good');
}
/** Beendet den Weltboss in EINER Instanz (Sieg oder Abzug); der Auftritt selbst läuft für die anderen Welten weiter. */
function finishBoss(ev: ActiveEvent, result: 'win' | 'fail', _quiet: boolean) {
  const z = ev.zone, g = z.game, G = gw(g), def = ev.boss!, m = ev.bossMob!, win = ev.win!;
  if (result === 'win') {
    for (const [p, tier] of tiersOf(ev)) { if (ev.paid.has(p.charId)) continue; ev.paid.add(p.charId); bossReward(ev, p, tier); }
    z.ev({ k: 'fx', n: 'bossdeath', x: m.x, y: m.y, el: def.element });
    z.ev({ k: 'sfx', n: 'boss_die', x: m.x, y: m.y });
    win.done.add(z.key);
    if (win.kills++ === 0) g.sysChat(`${def.win} (${z.def.name})`); else tellZone(z, def.win, 'good');
  }
  for (const p of ev.shown) if (z.players.has(p.id)) p.pev.push({ k: 'bossend', id: m.id, won: result === 'win' });
  ev.shown.clear();
  z.clearHostile();
  removeMob(z, m);
  for (const a of ev.mobs) removeMob(z, a);
  ev.mobs.clear();
  G.events.delete(ev);
  if (zw(z).boss === ev) zw(z).boss = null;
  G.dirty = true;
}
/**
 * Im Spieltakt (einmal je Sekunde): fällige Weltbosse auftreten lassen – nur wenn jemand online ist – und abgelaufene
 * Auftritte schließen, sobald nirgends mehr gekämpft wird.
 */
export function scheduleBosses(g: Game, auto: boolean) {
  const G = gw(g), t = worldTime(g), now = g.now;
  for (const [id, win] of G.bossWin) {
    if (now <= win.until) continue;
    const left = [...G.events].filter(e => e.win === win);
    if (left.some(e => e.zone.players.size && e.bossMob && e.bossMob.state !== 'idle' && e.bossMob.state !== 'return')) continue;
    for (const e of left) finishEvent(e, 'fail', true);
    G.bossWin.delete(id); G.dirty = true;
    if (!win.kills) g.sysChat(win.def.gone);
  }
  if (!auto) return;
  for (const id in WORLD_BOSSES) {
    if (G.bossNext[id] === undefined) G.bossNext[id] = t + B.firstDelay[0] + Math.random() * (B.firstDelay[1] - B.firstDelay[0]);
    if (t < G.bossNext[id] || G.bossWin.has(id) || !g.onlineCount()) continue;
    if (!openBossWindow(g, WORLD_BOSSES[id])) G.bossNext[id] = t + 60;
  }
}
/** Weltzustand für einen Spieler: Ereignisse SEINER Welt (Kreis) und die laufenden Weltboss-Auftritte, die er dort noch antreffen kann. */
export function eventInfos(g: Game, p: Player): WorldEventInfo[] {
  const G = gw(g), k = worldOf(p), now = g.now;
  const out = [...G.events].filter(e => e.zone.kreis === k && !e.zone.rift).map(e => eventInfo(e, p));
  for (const win of G.bossWin.values()) {
    if (out.some(e => e.boss && e.zone === win.zoneId)) continue;
    const inst = worldsOf(g, win.zoneId).find(z => z.kreis === k);
    if (win.done.has(inst?.key ?? (k > 0 ? `${win.zoneId}#k${k}` : win.zoneId))) continue;
    out.push({ id: win.infoId, kind: 'boss', zone: win.zoneId, name: win.def.name, x: win.site.x, y: win.site.y, until: Math.max(0, Math.round(win.until - now)), goal: win.def.title, boss: 1 });
  }
  return out;
}
