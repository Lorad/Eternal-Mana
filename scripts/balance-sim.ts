// Balance-Vergleich per Simulation (ohne Netzwerk):  npx tsx scripts/balance-sim.ts [--csv] [--ausbau]
// Hinweis (0.8): Diese Rechnung lässt einen unverwundbaren Charakter auf der Stelle zuschlagen. Für alles, was mit echtem
// Spielen zu tun hat (Ausweichen, Tränke, Bosse, Risse), ist scripts/playtest.ts das genauere Werkzeug.
// Spielt für jede Klasse auf mehreren Stufen einen Standard-Charakter gegen den häufigsten Gegner des passenden Gebiets
// und misst Schaden je Sekunde sowie den erlittenen Schaden. Dient dem Vorher/Nachher-Vergleich bei Systemänderungen.
// --ausbau: zusätzlich derselbe Charakter mit allem, was das Handwerk (0.4) hergibt – Runen, Set, Speise, Elixier,
//           eingeschmiedetes Element (bestes und mittleres der sechs), ab Stufe 30 mit Legendärer Waffe.
import { CFG } from '../shared/src/config';
import { CLASSES, CLASS_IDS } from '../shared/src/data/classes';
import { BOSSES } from '../shared/src/data/enemies';
import { emptyHome } from '../shared/src/data/home';
import { generateGear } from '../shared/src/data/items';
import { skillsOf } from '../shared/src/data/skills';
import { ZONE_LIST } from '../shared/src/data/zones';
import { computeStats, newCharacter } from '../shared/src/stats';
import type { CharData, ClassId } from '../shared/src/types';
import { Rng } from '../shared/src/util/rng';
import { applyTimed } from '../server/src/craft';
import { Game } from '../server/src/game';
import { Player } from '../server/src/player';
import { ELEMENTS } from '../shared/src/config';
import { makeLegendary } from '../shared/src/craft';
import { SET_LIST } from '../shared/src/data/sets';
import type { Element } from '../shared/src/types';

const LEVELS = [1, 5, 10, 15, 20, 25, 30, 35, 40];
const KILLS = 30;

export function standardChar(cls: ClassId, lvl: number, rarity = 1): CharData {
  const c = newCharacter('Sim', cls);
  c.level = lvl;
  const main = Object.entries(CLASSES[cls].powerWeights).sort((a, b) => b[1]! - a[1]!)[0][0] as 'str';
  c.attrs[main] += (lvl - 1) * 2; c.attrs.vit += lvl - 1;
  // Fähigkeitspunkte reihum verteilen (aktive zuerst)
  let pts = lvl - 1;
  const list = skillsOf(cls).filter(s => s.reqLevel <= lvl).sort((a, b) => +!!b.effects - +!!a.effects || a.reqLevel - b.reqLevel);
  for (let round = 0; round < 5 && pts > 0; round++) for (const s of list) {
    if (pts <= 0) break;
    const r = c.skills[s.id] ?? 0;
    if (r >= s.maxRank || lvl < s.reqLevel + r * 2) continue;
    c.skills[s.id] = r + 1; pts--;
  }
  const rng = new Rng(1000 + lvl);
  c.equip.weapon = generateGear(rng, lvl, rarity, cls, 'weapon');
  delete c.equip.weapon.element;
  c.equip.helm = generateGear(rng, lvl, rarity, cls, 'helm');
  c.equip.armor = generateGear(rng, lvl, rarity, cls, 'armor');
  c.equip.acc1 = generateGear(rng, lvl, rarity, cls, 'accessory');
  c.equip.acc2 = generateGear(rng, lvl, rarity, cls, 'accessory');
  const act = skillsOf(cls).filter(s => s.effects && c.skills[s.id] && !s.effects.some(e => e.k === 'blink' || e.k === 'buff' || e.k === 'heal' || (e.k === 'dash' && e.back))).sort((a, b) => b.reqLevel - a.reqLevel);
  c.hotbar = [0, 1, 2, 3].map(i => act[i]?.id ?? null);
  return c;
}

export interface SimResult { dps: number; ttk: number; dtps: number; ttd: number; power: number; hp: number }

/**
 * Angriffsphase: der Charakter besiegt `kills` zähe Gegner (6-faches Leben) mit Standardangriffen und allen Fähigkeiten.
 * Verteidigungsphase: ein Gegner greift 40 s lang an, der Charakter wehrt sich nicht.
 * `prep` kann den Spieler vorher verändern (Buffs usw.).
 */
export function simulate(char: CharData, lvl: number, kills = KILLS, prep?: (p: Player, game: Game) => void, mobId?: string): SimResult {
  const home = emptyHome(); // 0.7: Siege zählen fürs Bestiarium des Profils – die Schein-Datenbank braucht dafür einen Hof-Stand
  const game = new Game({ saveChar() {}, backup() {}, listChars: () => [], loadHome: () => home, saveHome() {} } as any, { name: 'sim', version: CFG.version, port: 0, addresses: [], tailscale: { available: false } });
  const zdef = ZONE_LIST.filter(z => z.kind === 'overworld').find(z => lvl >= z.level[0] && lvl <= z.level[1]) ?? ZONE_LIST.filter(z => z.kind === 'overworld').at(-1)!;
  const zone = game.zone(zdef.id);
  zone.rng = new Rng(4242 + lvl);
  const p = new Player(1, 1, char, () => {});
  const sp = zone.map.spawns[Math.floor(zone.map.spawns.length / 2)];
  zone.addPlayer(p, sp.x, sp.y);
  for (const m of [...zone.mobs.values()]) { zone.mobs.delete(m.id); }
  p.recalc(); p.hp = p.stats.maxHp; p.mp = p.stats.maxMp;
  prep?.(p, game);
  let taken = 0;
  const ev = zone.ev.bind(zone);
  zone.ev = e => { if (e.k === 'dmg' && e.pl) taken += e.a; ev(e); };
  const cls = CLASSES[char.cls];
  const melee = cls.attack.kind === 'arc';
  const mob = mobId ?? zdef.mobs[0][0];
  const dt = 1 / CFG.net.tickRate;
  const hx = p.x, hy = p.y;
  let t = 0, hpKilled = 0, baseHp = 1;
  for (let done = 0; done < kills && t < 3600; done++) {
    const m = zone.spawnMob(mob, lvl, hx + 40, hy, true);
    baseHp = m.maxHp;
    m.maxHp *= 6; m.hp = m.maxHp;
    const t0 = t;
    while (!m.dead && t - t0 < 240) {
      game.now += dt; t += dt;
      p.iframesUntil = 0; p.exitImmuneUntil = game.now + 5;
      const d = Math.hypot(m.x - p.x, m.y - p.y);
      if (melee && d > 20) { const a = Math.atan2(p.y - m.y, p.x - m.x); p.x = m.x + Math.cos(a) * 18; p.y = m.y + Math.sin(a) * 18; }
      if (!melee) { p.x = hx; p.y = hy; }
      const ang = Math.atan2(m.y - 5 - (p.y - 6), m.x - p.x);
      for (const id of char.hotbar) if (id) zone.playerSkill(p, id, ang, m.x, m.y);
      zone.playerAttack(p, ang);
      zone.update(dt);
      p.dead = false; p.hp = p.stats.maxHp;
    }
    hpKilled += m.maxHp;
  }
  const dps = hpKilled / t;
  // Verteidigung
  taken = 0;
  for (const m of [...zone.mobs.values()]) zone.mobs.delete(m.id);
  p.x = hx; p.y = hy; p.statuses.clear();
  const m = zone.spawnMob(mob, lvl, hx + 30, hy, true);
  m.maxHp *= 1000; m.hp = m.maxHp;
  const T = 40;
  for (let s = 0; s < T; s += dt) {
    game.now += dt;
    p.iframesUntil = 0; p.exitImmuneUntil = game.now + 5; p.x = hx; p.y = hy;
    zone.update(dt);
    p.dead = false; p.hp = p.stats.maxHp;
  }
  const dtps = taken / T;
  return { dps, ttk: baseHp / dps, dtps, ttd: p.stats.maxHp / Math.max(0.01, dtps), power: p.stats.power, hp: p.stats.maxHp };
}

/** Der Standard-Charakter, ausgebaut mit den Systemen der Version 0.4 (gleiche Ausrüstung, gleiche Seltenheit). */
export function investedChar(cls: ClassId, lvl: number, el: Element, legend = false): CharData {
  const c = standardChar(cls, lvl);
  const t = Math.max(1, Math.min(6, 1 + Math.floor((lvl - 1) / 5)));
  if (legend) c.equip.weapon = makeLegendary(new Rng(77 + lvl), cls, lvl);
  const w = c.equip.weapon!;
  w.element = el; w.elv = lvl >= 25 ? 3 : lvl >= 10 ? 2 : 1;
  if (lvl >= 11) w.ench = 'macht'; else if (lvl >= 6) w.ench = 'fokus';
  if (lvl >= 4) { c.equip.helm!.ench = 'vital'; c.equip.armor!.ench = 'vital'; }
  c.equip.acc1!.base = `c_ring_${t}`; c.equip.acc2!.base = `c_amulet_${t}`;
  if (lvl >= 5) c.equip.acc1!.ench = 'eile';
  if (lvl >= 10) c.equip.acc2!.ench = 'weitsicht';
  const set = SET_LIST.filter(s => s.ilvl - 2 <= lvl).at(-1);
  if (set) for (const s of ['helm', 'armor', 'acc1', 'acc2'] as const) c.equip[s]!.set = set.id;
  return c;
}
function buffUp(lvl: number) {
  return (p: Player) => {
    applyTimed(p, lvl >= 11 ? 'food_spiess' : 'food_beeren', 9999);
    if (lvl >= 3) applyTimed(p, lvl >= 11 ? 'elx_power' : lvl >= 8 ? 'elx_crit' : 'elx_guard', 9999);
  };
}

function main() {
  const csv = process.argv.includes('--csv'), ausbau = process.argv.includes('--ausbau');
  const rows: string[] = [];
  console.log(`Balance-Simulation (Version ${CFG.version}) – Standard-Charakter, Ausrüstung „Ungewöhnlich“ auf eigener Stufe`);
  console.log('Klasse          St.  Angriff  Leben  Schaden/s  s/Gegner  erlitten/s  s bis Tod   Boss-s (geschätzt)' + (ausbau ? '   | Ausbau: Schaden bestes Element / mittleres, s bis Tod' + '  | mit Legendärer Waffe' : ''));
  const sum: Record<number, { best: number; mid: number; ttd: number; leg: number; n: number }> = {};
  for (const cls of CLASS_IDS) for (const lvl of LEVELS) {
    const c = standardChar(cls, lvl);
    const r = simulate(c, lvl);
    const boss = Object.values(BOSSES).filter(b => b.level <= lvl + 2).at(-1);
    let bossS = '';
    if (boss) {
      const adj = (1 - CFG.combat.mitigation(CFG.enemy.def(boss.level) * boss.defMul, lvl)) / (1 - CFG.combat.mitigation(CFG.enemy.def(lvl), lvl));
      bossS = `${boss.name}: ${Math.round((CFG.enemy.hp(boss.level) * boss.hpMul) / (r.dps * adj))}`;
    }
    const d = computeStats(c);
    let extra = '';
    if (ausbau) {
      const runs = ELEMENTS.map(el => ({ el, r: simulate(investedChar(cls, lvl, el), lvl, KILLS, buffUp(lvl)) })).sort((a, b) => b.r.dps - a.r.dps);
      const best = runs[0], mid = (runs[2].r.dps + runs[3].r.dps) / 2;
      const ttd = runs.reduce((a, x) => a + x.r.ttd, 0) / runs.length;
      extra = `   | ×${(best.r.dps / r.dps).toFixed(2)} (${best.el}) / ×${(mid / r.dps).toFixed(2)}, Tod ×${(ttd / r.ttd).toFixed(2)}`;
      const S = (sum[lvl] ??= { best: 0, mid: 0, ttd: 0, leg: 0, n: 0 });
      S.best += best.r.dps / r.dps; S.mid += mid / r.dps; S.ttd += ttd / r.ttd; S.n++;
      if (lvl >= 30) {
        const lr = ELEMENTS.map(el => simulate(investedChar(cls, lvl, el, true), lvl, KILLS, buffUp(lvl)).dps).sort((a, b) => b - a);
        const lmid = (lr[2] + lr[3]) / 2;
        extra += `  | ×${(lr[0] / r.dps).toFixed(2)} / ×${(lmid / r.dps).toFixed(2)}`;
        S.leg += lmid / r.dps;
      }
    }
    console.log(`${cls.padEnd(15)} ${String(lvl).padStart(3)}  ${d.power.toFixed(0).padStart(7)}  ${String(d.maxHp).padStart(5)}  ${r.dps.toFixed(1).padStart(9)}  ${r.ttk.toFixed(2).padStart(8)}  ${r.dtps.toFixed(1).padStart(10)}  ${r.ttd.toFixed(1).padStart(9)}   ${bossS.padEnd(22)}${extra}`);
    rows.push([cls, lvl, d.power, d.maxHp, r.dps.toFixed(2), r.ttk.toFixed(3), r.dtps.toFixed(2), r.ttd.toFixed(2)].join(';'));
  }
  if (ausbau) {
    console.log('\nMittel über alle Klassen – Ausbau gegenüber Standard:');
    for (const lvl of LEVELS) { const S = sum[lvl]; console.log(`  Stufe ${String(lvl).padStart(2)}: Schaden ×${(S.best / S.n).toFixed(2)} (bestes Element), ×${(S.mid / S.n).toFixed(2)} (mittleres); Überleben ×${(S.ttd / S.n).toFixed(2)}${lvl >= 30 ? `; mit Legendärer Waffe ×${(S.leg / S.n).toFixed(2)} (mittleres Element)` : ''}`); }
  }
  if (csv) console.log('\n' + rows.join('\n'));
}
if (process.argv[1]?.endsWith('balance-sim.ts')) main();
