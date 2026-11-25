/**
 * Mini-Bosse der Expeditionen (0.9): vorhandene Gegner-Sprites, eingefärbt und vergrößert (Daten: MINIS), mit ihrem
 * gewöhnlichen Angriff plus 2–3 eigenen, angekündigten Mustern. Zeigen eine Bossleiste, solange man mit ihnen kämpft.
 */
import { circleFree } from '../../../shared/src/collision';
import { CFG } from '../../../shared/src/config';
import { ENEMIES } from '../../../shared/src/data/enemies';
import { EXP_DIFF, MINIS, type MiniPattern } from '../../../shared/src/data/expeditions';
import type { Player } from '../player';
import { Mob, type Zone } from '../zone';
import type { MiniState } from './run';

const RADIUS = 230;
export function spawnMinis(zone: Zone, lvl: (base: number) => number, hpMul: number, dmgMul: number) {
  const run = zone.exp!, info = zone.map.exp!;
  info.minis.forEach((mi, k) => {
    const d = MINIS[mi.mini];
    const m = new Mob(ENEMIES[mi.mini], lvl(zone.map.def.level[0] + 1 + Math.round(((zone.map.def.level[1] - zone.map.def.level[0]) * k) / Math.max(1, info.minis.length))), mi.x, mi.y, false, -50 - k, -1);
    m.tough = true; m.name = d.name;
    m.maxHp = m.hp = Math.round(m.maxHp * hpMul); m.baseDmg *= dmgMul; m.dmg = m.baseDmg;
    zone.mobs.set(m.id, m);
    run.miniMobs.set(m.id, { id: d.id, mob: m, nextAt: 0, step: 0, shown: new Set(), n: 1, base: m.maxHp, sec: mi.sec, optional: mi.optional });
  });
}
const alive = (z: Zone, x: number, y: number) => z.alivePlayers().filter(p => Math.hypot(p.x - x, p.y - y) < RADIUS);

function attack(zone: Zone, st: MiniState, what: MiniPattern, near: Player[], now: number) {
  const m = st.mob, d = MINIS[st.id], el = m.element, by = d.name;
  const tele = (x: number, y: number, r: number, delay: number, mult: number) => zone.addFx({ kind: 'tele', x, y, r, el, dur: delay, until: now + delay, hostile: true, raw: m.dmg * mult, lvl: m.lvl, by });
  const t = near[zone.rng.int(0, Math.max(0, near.length - 1))];
  switch (what) {
    case 'stomp': tele(m.x, m.y, 60, 1.2, 1.5); zone.ev({ k: 'txt', x: m.x, y: m.y - 30, s: 'Stampft!', col: '#ffcf7a' }); break;
    case 'rain': for (const p of near) for (let i = 0; i < 2; i++) tele(p.x + zone.rng.range(-24, 24), p.y + zone.rng.range(-24, 24), 24, 1 + i * 0.35, 1.1); break;
    case 'lines': for (const p of near.slice(0, 3)) {
      const a = Math.atan2(p.y - m.y, p.x - m.x);
      zone.addFx({ kind: 'tele', shape: 'line', x: m.x, y: m.y, x2: m.x + Math.cos(a) * 240, y2: m.y + Math.sin(a) * 240, w: 20, r: 0, el, dur: 1, until: now + 1, hostile: true, raw: m.dmg * 1.3, lvl: m.lvl, by });
    } break;
    case 'ring': {
      const n = 14, off = zone.rng.range(0, 6.28), gap = zone.rng.range(0, 6.28);
      for (let i = 0; i < n; i++) {
        const a = off + (i / n) * Math.PI * 2;
        let dd = Math.abs(a - gap) % (Math.PI * 2); if (dd > Math.PI) dd = Math.PI * 2 - dd;
        if (dd < 0.45) continue;
        zone.spawnProj({ x: m.x, y: m.y - 6, vx: Math.cos(a) * 95, vy: Math.sin(a) * 95, life: 2.4, r: 5, hostile: true, lvl: m.lvl, raw: m.dmg * 0.75, el, pierce: 0, by }, 'orb');
      }
      zone.ev({ k: 'sfx', n: 'cast_' + (el === 'phys' ? 'dark' : el), x: m.x, y: m.y });
      break;
    }
    case 'pools': for (const p of near) zone.addFx({ kind: 'zone', x: p.x, y: p.y, r: 26, el, dur: 6, until: now + 6, tick: 0.5, nextTick: now + 1.1, hostile: true, raw: m.dmg * 0.4, lvl: m.lvl, by }); break;
    case 'charge': {
      if (!t) break;
      const a = Math.atan2(t.y - m.y, t.x - m.x);
      let ex = m.x, ey = m.y;
      for (let s = 0; s < 180; s += 8) { const nx = m.x + Math.cos(a) * s, ny = m.y + Math.sin(a) * s; if (!circleFree(zone.solidWalk, nx, ny, m.radius)) break; ex = nx; ey = ny; }
      zone.addFx({ kind: 'tele', shape: 'line', x: m.x, y: m.y, x2: ex, y2: ey, w: 28, r: 0, el, dur: 0.9, until: now + 0.9, hostile: true, raw: m.dmg * 1.6, lvl: m.lvl, by });
      st.charge = { x: ex, y: ey, at: now + 0.9 };
      break;
    }
    case 'adds': {
      const adds = d.adds ?? [];
      const have = [...zone.mobs.values()].filter(x => x.summoned && !x.dead && Math.hypot(x.x - m.x, x.y - m.y) < RADIUS).length;
      const extra = EXP_DIFF[zone.exp!.diff].bossAdds > 0 ? 1 : 0;
      for (let i = 0; i < Math.min(3 + extra, 1 + near.length + extra) && have + i < 5; i++) {
        const a = zone.rng.range(0, 6.28), x = m.x + Math.cos(a) * 40, y = m.y + Math.sin(a) * 40;
        if (!adds.length || !circleFree(zone.solidWalk, x, y, 7)) continue;
        const s = zone.spawnMob(zone.rng.pick(adds), Math.max(1, m.lvl - 2), x, y);
        s.maxHp = s.hp = Math.round(s.maxHp * 0.6); s.target = t ?? null; s.state = 'chase';
      }
      break;
    }
  }
}
/** je Takt: Muster, Leben nach Teilnehmerzahl, Bossleiste */
export function tickMinis(zone: Zone, now: number) {
  const run = zone.exp!;
  for (const st of run.miniMobs.values()) {
    const m = st.mob;
    if (m.dead) continue;
    if (st.charge && now >= st.charge.at) { zone.ev({ k: 'fx', n: 'dash', x: m.x, y: m.y, el: m.element, ang: Math.atan2(st.charge.y - m.y, st.charge.x - m.x) }); m.x = st.charge.x; m.y = st.charge.y; st.charge = undefined; }
    const near = alive(zone, m.x, m.y);
    const fighting = m.state !== 'idle' && m.state !== 'return' && near.length > 0;
    for (const p of near) if (fighting && !st.shown.has(p)) {
      st.shown.add(p);
      const d = MINIS[st.id];
      p.pev.push({ k: 'boss', id: m.id, name: `${d.name} – ${d.title}`, phase: 1, el: m.element }, { k: 'sfx', n: 'boss_phase' });
      p.send({ t: 'chat', from: d.name, s: d.intro, ch: 'sys' });
    }
    for (const p of [...st.shown]) if (!zone.players.has(p.id) || Math.hypot(p.x - m.x, p.y - m.y) > RADIUS + 120) { st.shown.delete(p); if (zone.players.has(p.id)) p.pev.push({ k: 'bossend', id: m.id, won: false }); }
    if (!fighting) {
      if (m.state === 'idle' && st.n > 1 && m.hp >= m.maxHp) { m.maxHp = m.hp = st.base; st.n = 1; }
      continue;
    }
    const n = Math.max(st.n, near.length);
    if (n > st.n) { const k = (1 + CFG.enemy.bossHpPerExtraPlayer * (n - 1)) / (1 + CFG.enemy.bossHpPerExtraPlayer * (st.n - 1)); m.maxHp = Math.round(m.maxHp * k); m.hp = Math.round(m.hp * k); st.n = n; zone.ev({ k: 'mob-', id: m.id }); zone.ev({ k: 'mob+', m: m.info() }); }
    if (!st.nextAt) st.nextAt = now + 2.5;
    if (now >= st.nextAt) { const d = MINIS[st.id]; st.nextAt = now + d.every * (m.hp < m.maxHp * 0.4 ? 0.75 : 1); attack(zone, st, d.pattern[st.step++ % d.pattern.length], near, now); }
  }
}
/** Ein Mini-Boss ist gefallen: Rückgabe true, wenn es einer war */
export function miniDown(zone: Zone, m: Mob): boolean {
  const run = zone.exp!, st = run.miniMobs.get(m.id);
  if (!st) return false;
  run.minis.add(st.id);
  for (const p of st.shown) p.pev.push({ k: 'bossend', id: m.id, won: true });
  for (const p of zone.players.values()) p.toast(`${MINIS[st.id].name} ist besiegt.${st.optional ? ' (Mini-Boss, freiwillig)' : ''}`, 'good');
  for (const x of [...zone.mobs.values()]) if (x.summoned && Math.hypot(x.x - m.x, x.y - m.y) < RADIUS) zone.killMob(x);
  return true;
}
