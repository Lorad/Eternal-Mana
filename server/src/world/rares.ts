/**
 * Seltene Monster (0.6): zwei je Region, jedes mit einer Besonderheit. Sie erscheinen ohne Ansage an einem von mehreren
 * Orten, nach langer zufälliger Wartezeit und teils nur nachts, bei bestimmtem Wetter oder in bestimmten Jahreszeiten.
 * Geprüft wird einmal je Sekunde und nur in Zonen mit Spielern.
 */
import { CFG } from '../../../shared/src/config';
import { isNight } from '../../../shared/src/data/events';
import { makeStack } from '../../../shared/src/data/items';
import { BIOME_MATS, ESSENCE } from '../../../shared/src/data/materials';
import { RARE_BY_MOB, RARE_LIST, type RareDef } from '../../../shared/src/data/rares';
import { STAR, mapOf } from '../../../shared/src/data/worlditems';
import { TILE } from '../../../shared/src/maps/tiles';
import type { Element } from '../../../shared/src/types';
import { freeNear } from '../../../shared/src/world';
import type { Player } from '../player';
import type { Mob, Zone } from '../zone';
import { giveTrophy, worldScroll } from './events';
import { addZoneRep } from './rep';
import { gw, removeMob, ringSpot, rnd, seasonOf, spawnMob, zw, type RareState } from './state';

const R = CFG.living.rare;

function states(z: Zone): Map<string, RareState> {
  const zs = zw(z);
  if (!zs.rares) {
    zs.rares = new Map();
    for (const def of RARE_LIST) if (def.zone === z.id) zs.rares.set(def.id, { def, mob: null, nextAt: z.game.now + rnd(z, R.firstDelay), spawnedAt: 0, st: {}, hinted: new Set() });
  }
  return zs.rares;
}
/** Sind die Bedingungen des Monsters gerade erfüllt (Nacht, Wetter, Jahreszeit)? */
export function rareAllowed(def: RareDef, tod: number, weather: string, season: number): boolean {
  if (def.night && !isNight(tod)) return false;
  if (def.weather && !def.weather.includes(weather)) return false;
  if (def.seasons && !def.seasons.includes(season as any)) return false;
  return true;
}
/** Stellt das Monster an einen seiner Orte (erzwungen: auch gegen die Bedingungen und vor den Augen der Spieler). */
export function spawnRare(z: Zone, id: string, force = false): Mob | null {
  const s = states(z).get(id);
  if (!s || s.mob) return null;
  const def = s.def, now = z.game.now;
  if (!force && !rareAllowed(def, z.game.tod(), z.weather, seasonOf(z.game).season)) return null;
  const spots = z.rng.shuffle([...def.spots]);
  for (const [poiId, dx, dy] of spots) {
    const poi = z.def.pois?.find(p => p.id === poiId);
    const c = poi && freeNear(z.map, poi.x + dx, poi.y + dy, 6);
    if (!c) continue;
    if (!force && [...z.players.values()].some(p => Math.hypot(p.x - c.x, p.y - c.y) < R.spawnDist)) continue;
    const m = spawnMob(z, def.mob, def.lvl, c.x, c.y, { summoned: false });
    m.tough = true; m.awake = false;
    s.mob = m; s.spawnedAt = now; s.st = { at: now, lastHp: m.hp, lastHit: now }; s.hinted.clear();
    return m;
  }
  return null;
}
function adds(z: Zone, s: RareState, m: Mob, n: number, name?: string, target: Player | null = m.target): Mob[] {
  const [id] = s.def.adds ?? ['', 0], out: Mob[] = [];
  if (!id) return out;
  for (let i = 0; i < n; i++) { const c = ringSpot(z, m.x, m.y, 24, 54); out.push(spawnMob(z, id, m.lvl - 1, c.x, c.y, { target, name })); }
  return out;
}
/** Besonderheit des Monsters – läuft viermal je Sekunde, solange es lebt */
function trait(z: Zone, s: RareState, m: Mob, now: number) {
  const st = s.st, fighting = !!m.target && m.state !== 'idle' && m.state !== 'return';
  if (m.hp < st.lastHp) st.lastHit = now;
  st.lastHp = m.hp;
  const every = (key: string, sec: number) => { if (now < (st[key] ?? 0)) return false; st[key] = now + sec; return true; };
  switch (s.def.trait) {
    case 'shield':
      if (m.invuln && now >= st.shieldEnd) m.invuln = false;
      else if (fighting && !m.invuln && every('shield', 10)) { m.invuln = true; st.shieldEnd = now + 3; z.ev({ k: 'txt', x: m.x, y: m.y - 30, s: 'Panzer!', col: '#d8b070' }); z.ev({ k: 'fx', n: 'buff', x: m.x, y: m.y, el: 'earth' }); }
      break;
    case 'summon':
      st.kids = (st.kids as Mob[] | undefined)?.filter(k => !k.dead) ?? [];
      if (fighting && st.kids.length < 4 && every('summon', 12)) st.kids.push(...adds(z, s, m, s.def.adds![1]));
      break;
    case 'enrage':
      if (!st.raged && m.hp < m.maxHp * 0.4) { st.raged = true; m.baseDmg *= 1.5; m.speed *= 1.35; z.ev({ k: 'txt', x: m.x, y: m.y - 30, s: 'Rasend!', col: '#ff7a6a' }); z.ev({ k: 'sfx', n: 'boss_phase', x: m.x, y: m.y }); }
      break;
    case 'burntrail':
      if (fighting && every('trail', 1.5)) z.addFx({ kind: 'zone', x: m.x, y: m.y, r: 18, el: 'fire', dur: 4, until: now + 4, tick: 0.5, nextTick: now + 0.6, hostile: true, raw: m.dmg * 0.3, lvl: m.lvl, by: m.name });
      break;
    case 'frostaura':
      if (every('aura', 1)) for (const p of z.players.values()) if (!p.dead && Math.hypot(p.x - m.x, p.y - m.y) < 72) p.statuses.set('slow', { until: now + 1.5, dps: 0 });
      break;
    case 'regen':
      if (m.hp < m.maxHp && now - st.lastHit > 3) { m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.01); st.lastHp = m.hp; }
      break;
    case 'quake':
      if (fighting && every('quake', 7)) z.addFx({ kind: 'tele', x: m.x, y: m.y, r: 62, el: m.element, dur: 1.2, until: now + 1.2, hostile: true, raw: m.dmg * 1.4, lvl: m.lvl, by: m.name });
      break;
    case 'decoy':
      if (!st.split && m.hp < m.maxHp * 0.5) { st.split = true; adds(z, s, m, s.def.adds![1], 'Trugbild'); z.ev({ k: 'fx', n: 'blink', x: m.x, y: m.y, el: 'dark' }); }
      break;
  }
}
export function tickRares(z: Zone, now: number, slow: boolean) {
  const auto = gw(z.game).auto;
  for (const s of states(z).values()) {
    const m = s.mob;
    if (m) {
      if (m.dead) { s.mob = null; continue; }
      trait(z, s, m, now);
      if (!slow) continue;
      // Hinweis, wenn jemand in die Nähe kommt (keine Ansage)
      for (const p of z.players.values()) if (!s.hinted.has(p.charId) && Math.hypot(p.x - m.x, p.y - m.y) < R.hintDist) { s.hinted.add(p.charId); p.toast(s.def.hint, 'info'); p.pev.push({ k: 'sfx', n: 'secret' }); }
      // unbehelligt zieht es irgendwann weiter
      if (now - s.spawnedAt > R.despawnSec && m.state === 'idle' && !m.hitters.size) { removeMob(z, m); s.mob = null; s.nextAt = now + rnd(z, R.respawn) * 0.5; }
    } else if (slow && auto && now >= s.nextAt && !spawnRare(z, s.def.id)) s.nextAt = now + 30;
  }
}
/** Beute eines seltenen Monsters für einen Beteiligten: sichere Rohstoffe, Chance auf Rezeptrolle und Schatzkarte, Trophäe. */
function loot(z: Zone, p: Player, def: RareDef, m: Mob) {
  const r = z.rng, bio = BIOME_MATS[z.def.biome];
  if (bio) p.give(makeStack(bio.monster, r.int(R.mats[0], R.mats[1])));
  const ess = (ESSENCE as Record<string, string>)[m.def.element as Element];
  if (ess) p.give(makeStack(ess, r.int(R.essences[0], R.essences[1])));
  if (def.star) p.give(makeStack(STAR, r.int(1, 2)));
  p.gainGold(CFG.enemy.gold(m.lvl) * R.gold * (1 + p.stats.goldPct / 100));
  if (r.chance(R.scroll)) { const s = worldScroll(z, p); if (s) p.give(makeStack(s)); }
  if (r.chance(R.map)) p.give(makeStack(mapOf(z.id)));
  giveTrophy(z, p, def.id, R.trophyRepeat);
  p.char.flags[`rk:${def.id}`] = (p.char.flags[`rk:${def.id}`] ?? 0) + 1; p.sync('flags');
  addZoneRep(p, z.id, CFG.living.rep.rare);
}
export function rareDeath(z: Zone, m: Mob, rec: Player[]): boolean {
  const def = RARE_BY_MOB[m.def.id];
  if (!def) return false;
  const s = states(z).get(def.id);
  if (s && s.mob === m) {
    s.mob = null; s.nextAt = z.game.now + rnd(z, R.respawn);
    if (def.trait === 'split') adds(z, s, m, def.adds![1], undefined, rec[0] ?? null);
  }
  for (const p of rec) loot(z, p, def, m);
  return true;
}
void TILE;
