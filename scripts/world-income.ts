// Einkommensvergleich für die Lebendige Welt (0.6), ohne Netzwerk:  npx tsx scripts/world-income.ts [zone …] [--boss]
// Spielt je Region eine Stunde Spielzeit zweimal durch – einmal nur „Gegner jagen wie bisher“, einmal mit allem, was die
// Lebendige Welt dazugibt (jedes Ereignis mitgemacht, jedes seltene Monster erlegt, Begegnungen, jede Schatzkarte gehoben).
// „obergrenze“: Die Figur jagt im selben Takt weiter und erledigt alles andere ohne Zeitverlust.
// „mit zeit“:   dasselbe, aber jede Tätigkeit kostet Zeit, in der nicht gejagt wird (Ereignis 3 min, seltenes Monster 1 min,
//               Begegnung 45 s, Schatz 2 min, Weltboss 4 min) – das kommt dem echten Spiel näher.
// --boss: zusätzlich ein Weltboss-Sieg in der Stunde (allein, also mit dem kleinsten Bossleben).
import { World } from '../server/src/world';
import type { ActiveEvent } from '../server/src/world/state';
import type { Mob, Zone } from '../server/src/zone';
import { FACTION_LIST, factionOfZone, repOf } from '../shared/src/data/factions';
import { ITEMS, sellPrice } from '../shared/src/data/items';
import { WORLD_BOSS_LIST } from '../shared/src/data/rares';
import { STAR, mapOf } from '../shared/src/data/worlditems';
import { ZONES } from '../shared/src/data/zones';
import { activeTreasure } from '../shared/src/world';
import { Sim, type Tester } from '../tests/helpers/sim';

const HOUR = 3600, KILL_EVERY = 12, NODE_EVERY = 90, ENCOUNTER_EVERY = 540;
const COST = { event: 180, rare: 60, encounter: 45, treasure: 120, boss: 240 };
const args = process.argv.slice(2), withBoss = args.includes('--boss');
const zones = args.filter(a => !a.startsWith('--')).length ? args.filter(a => !a.startsWith('--')) : ['gruenwald', 'frost', 'schatten'];

interface Result { gold: number; mats: number; matValue: number; gearValue: number; otherValue: number; stars: number; scrolls: number; rep: number; events: number; rares: number; maps: number }

function run(zoneId: string, world: boolean, timed = false): Result {
  const sim = new Sim();
  (sim.db as any).backup = () => '';   // die Uhr läuft hier schneller als die Dateinamen der Backups
  try {
    World.setAuto(sim.game, world);
    const def = ZONES[zoneId], lvl = def.level[1];
    const t: Tester = sim.join('Messung', 'krieger', lvl);
    if (t.p.zone.id !== zoneId) sim.travel(t, zoneId);
    const z: Zone = t.p.zone, p = t.p;
    p.god = true; p.char.inv = []; p.char.gold = 0;
    const zs = World.state.zone(z);
    sim.seed(z, 20261124);   // gleicher Zufall in allen Läufen einer Region, damit sie vergleichbar bleiben
    const res: Result = { gold: 0, mats: 0, matValue: 0, gearValue: 0, otherValue: 0, stars: 0, scrolls: 0, rep: 0, events: 0, rares: 0, maps: 0 };
    const kill = (mobs: Iterable<Mob>) => { for (const m of [...mobs]) { if (m.dead) continue; p.x = m.x + 10; p.y = m.y; m.invuln = false; z.hitMob(m, p, 1e9, 'phys'); } };
    const pickUp = () => { for (const d of [...z.drops.values()]) { if (d.owner !== p) continue; p.x = d.x; p.y = d.y; sim.step(0.05); } };
    /** Inventar auswerten und leeren – so läuft der Rucksack nie voll, und Verkaufswerte lassen sich getrennt ausweisen */
    const bank = () => {
      for (const it of p.char.inv) {
        const b = ITEMS[it.base], n = it.qty ?? 1, v = sellPrice(it) * n;
        if (it.base === STAR) res.stars += n;
        if (it.base.startsWith('rs_')) res.scrolls += n;
        if (it.base === mapOf(zoneId)) continue;
        if (b.kind === 'material') { res.mats += n; res.matValue += v; } else if (b.kind === 'consumable') res.otherValue += v; else res.gearValue += v;
      }
      p.char.inv = p.char.inv.filter(i => i.base === mapOf(zoneId));
    };
    const doEvent = (ev: ActiveEvent) => {
      p.x = ev.x + 12; p.y = ev.y;
      switch (ev.def.kind) {
        case 'sterne': for (const s of ev.st.stars) if (!s.o.looted.has(p.charId)) { p.x = s.o.x; p.y = s.o.y + 6; z.interact(p, s.o.id); } break;
        case 'einsturz': for (const pile of ev.st.piles) if (!pile.freed) { p.x = pile.o.x; p.y = pile.o.y + 6; z.interact(p, pile.o.id); sim.step(0.7); break; } break;
        case 'jagd': if (ev.st.track) { p.x = ev.st.track.x; p.y = ev.st.track.y + 6; z.interact(p, ev.st.track.id); } break;
      }
      kill(ev.mobs);
    };
    let seen: ActiveEvent | null = null, bossDone = false, busyUntil = 0;
    const busy = (sec: number, now: number) => { if (timed) busyUntil = Math.max(busyUntil, now) + sec; };
    const spawns = z.map.spawns;
    for (let now = 0, i = 0; now < HOUR; now += KILL_EVERY, i++) {
      // ---- wie bisher: alle zwölf Sekunden ein Gegner, gelegentlich eine Abbaustelle
      const target = [...z.mobs.values()].filter(m => !m.summoned && m.spawnIdx >= 0 && !m.dead).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      const free = now >= busyUntil;
      if (!free) { /* beschäftigt: in dieser Zeit wird nicht gejagt */ } else if (target) kill([target]); else { const s = spawns[i % spawns.length]; p.x = s.x; p.y = s.y; }
      if (free && i % Math.round(NODE_EVERY / KILL_EVERY) === 0) { const n = [...z.objs.values()].filter(o => o.type === 'node')[(i / 7 | 0) % 10]; if (n) { p.x = n.x; p.y = n.y + 8; n.harvested!.clear(); z.interact(p, n.id); } }
      // ---- Lebendige Welt
      if (world) {
        if (zs.event) { if (zs.event !== seen) { seen = zs.event; } doEvent(zs.event); }
        if (seen && seen.result) { if (seen.result === 'win' && seen.contrib.size) { res.events++; busy(COST.event, now); } seen = null; }
        for (const r of zs.rares?.values() ?? []) if (r.mob) { kill([r.mob]); res.rares++; busy(COST.rare, now); }
        if (i > 0 && i % Math.round(ENCOUNTER_EVERY / KILL_EVERY) === 0) { const e = World.startEncounter(p, 'hinterhalt'); if (e) { kill(e.mobs); busy(COST.encounter, now); } }
        if (withBoss && !bossDone && now > HOUR / 2) {
          const b = WORLD_BOSS_LIST.find(x => (x.zones as string[]).includes(zoneId));
          const ev = b && World.startBoss(sim.game, b.id, zoneId, { x: p.x + 60, y: p.y });
          if (ev) { z.hitMob(ev.bossMob!, p, 1, 'phys'); sim.step(1); kill([ev.bossMob!]); bossDone = true; busy(COST.boss, now); }
        }
        // Schatzkarten sofort heben
        for (let k = 0; k < 3 && p.countItem(mapOf(zoneId)); k++) {
          const it = p.char.inv.find(x => x.base === mapOf(zoneId))!;
          t.send({ t: 'use', uid: it.uid });
          const s = activeTreasure(p.char, z.map);
          if (!s) break;
          p.x = s.x; p.y = s.y; t.send({ t: 'dig' }); res.maps++; busy(COST.treasure, now);
        }
      }
      sim.step(0.2); pickUp(); bank();
      sim.step(KILL_EVERY - 0.2 - (sim.game.now % 0.05));
    }
    pickUp(); bank();
    res.gold = p.char.gold;
    res.rep = repOf(p.char, factionOfZone(zoneId)?.id ?? '');
    return res;
  } finally { sim.close(); }
}

const f = (n: number) => String(Math.round(n)).padStart(7);
console.log(`Einkommen je Stunde Spielzeit (ein Kill alle ${KILL_EVERY} s, Stufe = Obergrenze des Gebiets)${withBoss ? ', mit einem Weltboss-Sieg' : ''}`);
console.log('Gold = Münzen · Rohstoffe = Stück (Verkaufswert) · Ausrüstung/Sonstiges = Verkaufswert\n');
console.log('Region        Lauf          Gold  Rohst.  (Wert)  Ausrüst.  Sonst.  Sterne  Rollen     Ruf  Ereign.  Seltene  Schätze');
for (const zid of zones) {
  if (!FACTION_LIST.some(x => x.zone === zid)) { console.log(zid + ': keine der sechs Regionen'); continue; }
  const a = run(zid, false), b = run(zid, true), c = run(zid, true, true);
  for (const [name, r] of [['vorher', a], ['obergrenze', b], ['mit zeit', c]] as const)
    console.log(`${zid.padEnd(12)}  ${name.padEnd(10)} ${f(r.gold)} ${f(r.mats)} ${f(r.matValue)}  ${f(r.gearValue)} ${f(r.otherValue)} ${f(r.stars)} ${f(r.scrolls)} ${f(r.rep)}  ${f(r.events)}  ${f(r.rares)}  ${f(r.maps)}`);
  const tot = (r: Result) => r.gold + r.matValue + r.gearValue + r.otherValue;
  const pct = (x: number, y: number) => { const v = x / Math.max(1, y) * 100 - 100; return (v >= 0 ? '+' : '') + v.toFixed(0) + ' %'; };
  for (const [name, r] of [['Obergrenze', b], ['mit Zeit', c]] as const) console.log(`${''.padEnd(12)}  ${name}: Gold ${pct(r.gold, a.gold)} · Rohstoffe ${pct(r.mats, a.mats)} · Gesamtwert ${pct(tot(r), tot(a))}`);
  console.log('');
}
