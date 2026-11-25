/**
 * Versuchsaufbau für den Spieltest: eine echte Spielwelt ohne Netzwerk (tests/helpers/sim.ts), in der Bots mit dem
 * Spielermodell aus model.ts kämpfen. Jede Messung ist ein echter Kampf auf dem echten Server-Code.
 */
import { circleFree, lineClear } from '../../shared/src/collision';
import { CFG } from '../../shared/src/config';
import { ITEMS, sellPrice } from '../../shared/src/data/items';
import { TILE } from '../../shared/src/maps/tiles';
import type { CharData, ItemInstance } from '../../shared/src/types';
import { Rng } from '../../shared/src/util/rng';
import type { Game } from '../../server/src/game';
import type { Player } from '../../server/src/player';
import { World } from '../../server/src/world';
import type { Mob, Zone } from '../../server/src/zone';
import { Sim, type Tester } from '../../tests/helpers/sim';
import { Bot, type Skill } from './model';

export interface FightResult {
  win: boolean; timeout: boolean;
  /** Sekunden vom Beginn bis zum Ende des Kampfes */
  time: number;
  /** gefallene Spieler (bei einem Sieg zu mehreren können einzelne gefallen sein) */
  deaths: number;
  potions: number; mpPotions: number;
  /** erlittener Schaden als Vielfaches des eigenen Lebens (Mittel über die Gruppe) */
  taken: number;
  rolls: number;
  /** Schaden nach Urheber (Summe über die Gruppe) */
  by: Map<string, number>;
  /** Rest-Leben des Bosses bei einer Niederlage (0..1) */
  bossLeft: number;
}

export class Lab {
  sim = new Sim();
  game: Game = this.sim.game;
  private n = 0;
  constructor() { World.setAuto(this.game, false); this.game.db.backup = () => ''; } // keine Sicherungen im Zeitraffer (Dateiname hängt an der echten Uhr)
  close() { this.sim.close(); }

  /** Neuer Spieler mit dem angegebenen Charakter (Stufe, Ausrüstung, Fähigkeiten, Inventar werden übernommen). */
  join(char: CharData, skill: Skill, seed: number): Bot {
    const name = 'Probe' + String.fromCharCode(65 + (this.n % 26)) + String.fromCharCode(65 + (Math.floor(this.n / 26) % 26)) + String.fromCharCode(65 + (Math.floor(this.n / 676) % 26));
    this.n++;
    const t: Tester = this.sim.join(name, char.cls);
    (t.s.ws as any).readyState = 0; // nichts serialisieren – der Bot liest den Zustand direkt
    t.msgs.length = 0;
    const p = t.p, c = p.char;
    c.level = char.level; c.attrs = char.attrs; c.skills = char.skills; c.hotbar = char.hotbar; c.equip = char.equip; c.inv = char.inv;
    c.quests = { ...char.quests }; c.flags = { ...c.flags, ...char.flags }; c.gold = char.gold;
    if (char.kreis) c.kreis = char.kreis;
    if (char.quell) c.quell = char.quell;
    if (char.rift) c.rift = char.rift;
    if (char.recipes) c.recipes = char.recipes;
    p.recalc(); p.hp = p.stats.maxHp; p.mp = p.stats.maxMp;
    return new Bot(this.game, t.s, skill, seed);
  }
  leave(b: Bot) { if (b.s.player) b.send({ t: 'leave' }); }
  /** Frische Instanz einer Zone (verwirft die alte) und setzt die Bots hinein. */
  enter(bots: Bot[], zoneId: string, seed: number): Zone {
    const k = this.game.worldKreis(bots[0].p);
    this.game.zones.delete(k > 0 ? `${zoneId}#k${k}` : zoneId);
    for (const b of bots) this.game.transfer(b.p, zoneId, '');
    const z = bots[0].p.zone;
    z.rng = new Rng(seed);
    return z;
  }
  party(bots: Bot[]) { if (bots.length > 1) this.sim.party(...bots.map(b => ({ p: b.p }) as Tester)); }
  /** Zählt Schaden nach Urheber mit. */
  tap(z: Zone, bots: Bot[]) {
    if ((z as any)._tapped) { (z as any)._tapped.bots = bots; return; }
    const st = { bots, pattern: '' };
    (z as any)._tapped = st;
    const orig = z.hitPlayer.bind(z);
    z.hitPlayer = (p, raw, el, lvl, by, status) => {
      const d = orig(p, raw, el, lvl, by, status);
      if (d > 0) { const b = st.bots.find(x => x.p === p); if (b) { const key = z.boss && by === z.boss.def.name ? st.pattern || by : by; b.taken += d; b.hitsBy.set(key, (b.hitsBy.get(key) ?? 0) + d); } }
      return d;
    };
    // Bosse: welches Muster läuft gerade? (nur zur Auswertung – der Bot erfährt davon nichts)
    const boss: any = z.boss;
    if (boss) {
      const next = boss.next.bind(boss), change = boss.phaseChange.bind(boss);
      boss.next = () => { const list = boss.echo?.pattern ? [...boss.patterns(), boss.echoPattern] : boss.patterns(); st.pattern = list[boss.idx % list.length].name; return next(); };
      boss.phaseChange = () => { st.pattern = 'phaseChange'; return change(); };
    }
  }
  step(bots: Bot[]) {
    for (const b of bots) b.think();
    (this.game as any).tick(1 / CFG.net.tickRate);
  }
  place(p: Player, x: number, y: number) { p.x = x; p.y = y; p.epoch++; p.budget = 0; p.lastMoveAt = this.game.now; }

  /**
   * Ein Kampf bis zum Ende: `won()` meldet den Sieg, sonst endet er, wenn alle gefallen sind oder die Zeit abläuft.
   */
  fight(z: Zone, bots: Bot[], won: () => boolean, maxSec: number, boss?: Mob): FightResult {
    this.tap(z, bots);
    const t0 = this.game.now, d0 = bots.map(b => b.p.char.deaths);
    for (const b of bots) { b.taken = 0; b.potions = 0; b.mpPotions = 0; b.rolls = 0; b.hitsBy.clear(); }
    let win = false, timeout = false;
    for (;;) {
      this.step(bots);
      if (won()) { win = true; break; }
      if (bots.every(b => b.p.dead)) break;
      if (this.game.now - t0 > maxSec) { timeout = true; break; }
    }
    const by = new Map<string, number>();
    for (const b of bots) for (const [k, v] of b.hitsBy) by.set(k, (by.get(k) ?? 0) + v);
    return {
      win, timeout, time: this.game.now - t0,
      deaths: bots.reduce((a, b, i) => a + (b.p.char.deaths - d0[i]), 0),
      potions: bots.reduce((a, b) => a + b.potions, 0), mpPotions: bots.reduce((a, b) => a + b.mpPotions, 0),
      taken: bots.reduce((a, b) => a + b.taken / b.p.stats.maxHp, 0) / bots.length,
      rolls: bots.reduce((a, b) => a + b.rolls, 0), by,
      bossLeft: boss && !win ? Math.max(0, boss.hp / boss.maxHp) : 0,
    };
  }

  /** Bosskampf im Dungeon: die Gruppe steht am unteren Rand des Bossraums (wie nach dem Weg durch den Dungeon, mit vollem Leben). */
  bossFight(zoneId: string, chars: CharData[], skill: Skill, seed: number, maxSec = 600): FightResult {
    const bots = chars.map((c, i) => this.join(c, skill, seed * 31 + i));
    this.party(bots);
    const z = this.enter(bots, zoneId, seed);
    const room = z.map.bossRoom!, id = z.boss!.def.id;
    const bounds = { x0: (room.x0 + 1.6) * TILE, y0: (room.y0 + 1.6) * TILE, x1: (room.x1 - 0.6) * TILE, y1: (room.y1 - 0.6) * TILE };
    bots.forEach((b, i) => { b.bounds = bounds; this.place(b.p, (room.cx + 0.5) * TILE + (i - (bots.length - 1) / 2) * 22, (room.y1 - 1) * TILE); });
    const r = this.fight(z, bots, () => bots.some(b => !!b.p.char.flags[`b:${id}`]), maxSec, z.boss!.mob);
    for (const b of bots) this.leave(b);
    return r;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Gegnergruppen der Oberwelt und der Dungeons: echte Gruppen der echten Karte, einer nach der anderen
// ---------------------------------------------------------------------------------------------------------------------
export interface FarmResult {
  packs: number; kills: number; elites: number;
  /** reine Kampfzeit und gerechnete Wegzeit (s) */
  fightSec: number; travelSec: number;
  deaths: number; potions: number; mpPotions: number;
  xp: number; gold: number;
  /** Verkaufswert der Beute (Ausrüstung, Rohstoffe, Tränke) */
  lootValue: number;
  items: Map<string, number>;
  gear: ItemInstance[];
  /** erlittener Schaden als Vielfaches des eigenen Lebens je Gruppe */
  takenPerPack: number;
  /** s je gewöhnlichem Gegner / je Erwachtem (vom ersten Treffer bis zum Tod) */
  ttk: number; ttkElite: number;
  by: Map<string, number>;
}

/** freie Stelle im Abstand `dist` um einen Punkt, mit Sichtlinie dorthin */
function spotNear(z: Zone, x: number, y: number, dist: number, rng: Rng): { x: number; y: number } | null {
  for (let k = 0; k < 40; k++) {
    const a = rng.range(0, Math.PI * 2), d = dist * (k < 20 ? 1 : 0.7);
    const sx = x + Math.cos(a) * d, sy = y + Math.sin(a) * d;
    if (circleFree(z.solidWalk, sx, sy, CFG.player.radius + 3) && lineClear(z.solidWalk, sx, sy, x, y)) return { x: sx, y: sy };
  }
  return null;
}

/**
 * Der Bot arbeitet `nPacks` echte Gegnergruppen der Zone ab (die seiner Stufe am nächsten liegen). Zwischen zwei Gruppen
 * vergeht die Wegzeit rechnerisch (Luftlinie × 1,3 / Lauftempo); Leben und Mana erholen sich in dieser Zeit wie im Spiel.
 * Nach einem Tod: Wiedereinstieg mit vollem Leben, 25 s Strafe für den Rückweg.
 */
export function farm(lab: Lab, zoneId: string, char: CharData, skill: Skill, seed: number, nPacks: number, o: { fixedLevel?: number; setup?: (z: Zone, b: Bot) => void } = {}): FarmResult {
  const b = lab.join(char, skill, seed);
  const z = lab.enter([b], zoneId, seed);
  const p = b.p;
  o.setup?.(z, b);
  lab.tap(z, [b]);
  const res: FarmResult = { packs: 0, kills: 0, elites: 0, fightSec: 0, travelSec: 0, deaths: 0, potions: 0, mpPotions: 0, xp: 0, gold: 0, lootValue: 0, items: new Map(), gear: [], takenPerPack: 0, ttk: 0, ttkElite: 0, by: new Map() };
  // Erfahrung und Gold mitzählen, ohne dass der Charakter während der Messung aufsteigt
  p.gainXp = (n: number) => { res.xp += Math.max(1, Math.round(n * (1 + p.stats.xpPct / 100))); };
  const gold0 = p.char.gold;
  const groups = new Map<number, Mob[]>();
  for (const m of z.mobs.values()) { if (m.boss || m.group < 0) continue; (groups.get(m.group) ?? groups.set(m.group, []).get(m.group)!).push(m); }
  const lvl = o.fixedLevel ?? char.level;
  const rng = new Rng(seed * 17 + 3);
  const list = [...groups.values()].map(g => ({ g, lvl: g.reduce((a, m) => a + m.lvl, 0) / g.length, x: g.reduce((a, m) => a + m.x, 0) / g.length, y: g.reduce((a, m) => a + m.y, 0) / g.length, r: rng.next() }))
    .sort((a, c) => Math.abs(a.lvl - lvl) - Math.abs(c.lvl - lvl) || a.r - c.r).slice(0, nPacks);
  let px = p.x, py = p.y, ttkN = 0, ttkE = 0, takenSum = 0;
  const firstHit = new Map<number, number>();
  const killHook = z.killMob.bind(z);
  z.killMob = (m: Mob) => {
    if (!m.dead && m.hitters.has(p)) {
      const t = lab.game.now - (firstHit.get(m.id) ?? lab.game.now);
      if (m.elite) { res.elites++; res.ttkElite += t; ttkE++; } else if (!m.summoned) { res.ttk += t; ttkN++; }
      res.kills++;
    }
    killHook(m);
  };
  for (const pk of list) {
    const spot = spotNear(z, pk.x, pk.y, 120, rng);
    if (!spot) continue;
    // Weg hierher: Erholung außerhalb des Kampfes
    const travel = (Math.hypot(pk.x - px, pk.y - py) * 1.3) / p.stats.speed;
    res.travelSec += Math.min(travel, 60);
    const rest = Math.min(travel, 60);
    p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.hpRegen * (Math.max(0, rest - 5) * 4 + Math.min(5, rest)));
    p.mp = Math.min(p.stats.maxMp, p.mp + p.stats.mpRegen * rest);
    px = pk.x; py = pk.y;
    lab.place(p, spot.x, spot.y);
    p.statuses.clear();
    const ids = new Set(pk.g.map(m => m.id));
    b.focus = m => ids.has(m.id) || m.target === p || m.summoned;
    b.taken = 0;
    const t0 = lab.game.now, d0 = p.char.deaths;
    let guard = 0;
    while (pk.g.some(m => !m.dead) && lab.game.now - t0 < 180) {
      lab.step([b]);
      for (const m of pk.g) if (!firstHit.has(m.id) && m.hitters.has(p)) firstHit.set(m.id, lab.game.now);
      if (p.dead) {
        res.deaths++;
        res.travelSec += 25;
        p.dead = false; p.hp = p.stats.maxHp; p.mp = p.stats.maxMp; p.statuses.clear();
        // Gegner kehren zurück und heilen; der Spieler greift von einer neuen Stelle erneut an
        for (const m of z.mobs.values()) if (m.target === p) m.target = null;
        for (let i = 0; i < 100; i++) (lab.game as any).tick(1 / CFG.net.tickRate);
        const s2 = spotNear(z, pk.x, pk.y, 120, rng) ?? spot;
        lab.place(p, s2.x, s2.y);
        if (++guard >= 3) break; // drei Tode an derselben Gruppe: aufgeben
      }
    }
    void d0;
    res.fightSec += lab.game.now - t0;
    takenSum += b.taken / p.stats.maxHp;
    res.packs++;
    // Beute einsammeln (liegt dem Spieler zu Füßen – das Aufheben selbst wird nicht gemessen)
    for (const [id, d] of z.drops) {
      if (d.owner !== p) continue;
      if (d.gold) res.gold += d.gold;
      else if (d.item) {
        const it = d.item, base = ITEMS[it.base];
        res.items.set(it.base, (res.items.get(it.base) ?? 0) + (it.qty ?? 1));
        res.lootValue += sellPrice(it) * (it.qty ?? 1);
        if (base && (base.kind === 'weapon' || base.kind === 'helm' || base.kind === 'armor' || base.kind === 'accessory')) res.gear.push(it);
      }
      z.drops.delete(id);
    }
  }
  res.gold += p.char.gold - gold0 > 0 ? p.char.gold - gold0 : 0;
  res.potions = b.potions; res.mpPotions = b.mpPotions;
  res.takenPerPack = res.packs ? takenSum / res.packs : 0;
  res.ttk = ttkN ? res.ttk / ttkN : 0; res.ttkElite = ttkE ? res.ttkElite / ttkE : 0;
  for (const [k, v] of b.hitsBy) res.by.set(k, v);
  lab.leave(b);
  return res;
}
