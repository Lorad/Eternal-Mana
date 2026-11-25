/**
 * Ganze Durchläufe: ein Dungeon vom Eingang bis zum Boss (Schlüssel holen, Tür öffnen, Bosskampf, bei Tod zurück an den
 * Eingang) und Mana-Risse mit Stufe, Modifikatoren, Lebensfunken und Richtzeit. Der Bot findet seinen Weg über das
 * Kachelraster der echten Karte; gekämpft wird mit dem Spielermodell aus model.ts.
 */
import { CFG } from '../../shared/src/config';
import { applyTimed } from '../../server/src/craft';
import { makeLegendary, makeSetPiece } from '../../shared/src/craft';
import { rescaleItem } from '../../shared/src/data/items';
import { QUELL_TRACKS, TRIAL_ID, riftMods, type RiftModId } from '../../shared/src/data/rifts';
import { TILE } from '../../shared/src/maps/tiles';
import type { CharData, ClassId, Element } from '../../shared/src/types';
import { SLOTS } from '../../shared/src/types';
import { Rng } from '../../shared/src/util/rng';
import { Rift, riftHome } from '../../server/src/rift';
import type { Zone } from '../../server/src/zone';
import { plausibleChar } from './chars';
import type { Lab } from './lab';
import { Nav, type Bot, type Skill } from './model';

// ---------------------------------------------------------------------------------------------------------------------
// Wegfindung
// ---------------------------------------------------------------------------------------------------------------------
export interface RunResult {
  ok: boolean; sec: number; deaths: number; potions: number; stuck: boolean;
  /** Mana-Riss: unter der Richtzeit? verbleibende Lebensfunken */
  par?: number; bonus?: boolean; revives?: number; failed?: boolean;
  bossSec: number; bossTries: number;
}

/**
 * Führt die Bots durch die Instanz bis zum Sieg über den Boss. `done()` meldet das Ende; `maxSec` bricht ab.
 * Nach einem Tod: echter Wiedereinstieg (`respawn`) – im Dungeon am Eingang, im Riss gegen einen Lebensfunken.
 */
export function runInstance(lab: Lab, z: Zone, bots: Bot[], done: () => boolean, maxSec: number): RunResult {
  lab.tap(z, bots);
  const nav = new Nav(z), game = lab.game, t0 = game.now;
  const room = z.map.bossRoom!;
  const bossPt = { x: (room.cx + 0.5) * TILE, y: (room.cy + 2.5) * TILE };
  const keyChest = [...z.objs.values()].find(o => o.type === 'chest' && o.props?.key);
  const lockedDoor = [...z.objs.values()].find(o => o.type === 'door' && o.props?.locked);
  const d0 = bots.map(b => b.p.char.deaths);
  const prog = bots.map(b => ({ x: b.p.x, y: b.p.y, at: game.now }));
  let stuck = false, bossSec = 0, bossTries = 0, wasActive = false, navAt = 0;
  const bounds = { x0: (room.x0 + 1.6) * TILE, y0: (room.y0 + 1.6) * TILE, x1: (room.x1 - 0.6) * TILE, y1: (room.y1 - 0.6) * TILE };
  for (;;) {
    const now = game.now;
    if (done()) break;
    if (now - t0 > maxSec || z.rift?.failed) break;
    const active = !!z.boss?.active;
    if (active) bossSec += 1 / CFG.net.tickRate;
    if (active && !wasActive) bossTries++;
    wasActive = active;
    if (now >= navAt) {
      navAt = now + 0.25;
      bots.forEach((b, bi) => {
        const p = b.p;
        if (p.zone !== z) return;
        if (p.dead) { if (bots.every(x => x.p.dead || x.p.zone !== z)) b.send({ t: 'respawn' }); return; } // erst wenn alle liegen (Aufhelfen kann der Bot nicht)
        b.bounds = active && z.inRoom(room, p.x, p.y) ? bounds : null;
        const needKey = !!keyChest && !keyChest.props!.keyTaken && !!lockedDoor && lockedDoor.state === 0 && !lockedDoor.props!.unlocked;
        const goal = needKey ? keyChest! : bossPt;
        // Türen und die Schlüsseltruhe bedienen
        for (const o of z.objs.values()) {
          const d = Math.hypot(o.x - p.x, o.y - p.y);
          if (d > 40) continue;
          if ((o.type === 'door' || o.type === 'bossdoor') && o.state === 0 && !z.boss?.active) b.send({ t: 'interact', id: o.id });
          if (o === keyChest && needKey) b.send({ t: 'interact', id: o.id });
        }
        const path = nav.path(p.x, p.y, goal.x, goal.y);
        if (!path) { b.goto = goal; return; }
        b.goto = path[Math.min(path.length - 1, 3)];
        const pr = prog[bi];
        if (Math.hypot(p.x - pr.x, p.y - pr.y) > 24 || active) { pr.x = p.x; pr.y = p.y; pr.at = now; }
        else if (now - pr.at > 25) stuck = true;
      });
      if (stuck) break;
    }
    lab.step(bots);
  }
  const r = z.rift;
  return {
    ok: done(), sec: game.now - t0, deaths: bots.reduce((a, b, i) => a + b.p.char.deaths - d0[i], 0), potions: bots.reduce((a, b) => a + b.potions, 0), stuck,
    par: r?.par, bonus: r?.done?.bonus, revives: r?.revives, failed: r?.failed, bossSec, bossTries,
  };
}

/** Story-Dungeon vom Eingang an. */
export function dungeonRun(lab: Lab, zoneId: string, chars: CharData[], skill: Skill, seed: number, maxSec = 1500): RunResult {
  const bots = chars.map((c, i) => lab.join(c, skill, seed * 31 + i));
  lab.party(bots);
  const z = lab.enter(bots, zoneId, seed);
  const id = z.boss!.def.id;
  const r = runInstance(lab, z, bots, () => bots.some(b => !!b.p.char.flags[`b:${id}`]), maxSec);
  for (const b of bots) lab.leave(b);
  return r;
}

// ---------------------------------------------------------------------------------------------------------------------
// Mana-Risse
// ---------------------------------------------------------------------------------------------------------------------
export type RiftGear = 'geschichte' | 'riss';
/**
 * Charakter fürs Endspiel. `geschichte`: so, wie man aus der Geschichte kommt (Stufe 40, typische Ausrüstung, dazu Set,
 * Runen, Speise und Elixier). `riss`: mit dem, was die Risse bis zur Stufe davor abwerfen – Gegenstandsstufe 40 + (Stufe − 1),
 * Episch, verbessert, Legendäre Waffe angeglichen, Echo-Runen ab Stufe 10, Quellstufen im Tempo von zwei je Riss-Stufe.
 */
export function riftChar(cls: ClassId, stufe: number, gear: RiftGear, seed: number, el: Element = 'fire'): CharData {
  const c = plausibleChar(cls, 40, { gear: gear === 'riss' ? 'gut' : 'typisch', seed, potions: [8, 4] });
  c.inv = c.inv.map(i => ({ ...i, base: i.base.replace(/3$/, '4') }));
  const rng = new Rng(seed * 97 + stufe);
  const setHelm = makeSetPiece(rng, 'hohlekrone', 'helm', cls, 2), setArmor = makeSetPiece(rng, 'hohlekrone', 'armor', cls, 2);
  c.equip.helm = setHelm; c.equip.armor = setArmor;
  c.equip.weapon!.element = el; c.equip.weapon!.elv = 2;
  c.equip.weapon!.ench = 'macht'; c.equip.helm.ench = 'vital'; c.equip.armor.ench = 'vital'; c.equip.ring1!.ench = 'eile'; c.equip.amulet!.ench = 'weitsicht';
  if (gear === 'geschichte') return c;
  const ilvl = CFG.rift.ilvl(Math.max(1, stufe - 1));
  const leg = makeLegendary(rng, cls, 40);
  leg.element = el; leg.elv = 3; leg.ench = stufe >= 10 ? 'echo_macht' : 'macht';
  c.equip.weapon = leg;
  const ring = makeSetPiece(rng, 'hohlekrone', 'ring', cls, 3), amu = makeSetPiece(rng, 'hohlekrone', 'amulet', cls, 3);
  ring.ench = stufe >= 10 ? 'echo_einklang' : 'eile'; amu.ench = 'weitsicht';
  c.equip.ring1 = ring; c.equip.amulet = amu;
  if (stufe >= 10) { c.equip.helm.ench = 'echo_wacht'; c.equip.armor.ench = 'echo_wacht'; }
  const up = Math.min(8, 4 + Math.floor(stufe / 6));
  for (const s of SLOTS) { const it = c.equip[s]; if (!it) continue; it.rarity = Math.max(it.rarity, 3); it.up = up; rescaleItem(it, ilvl); }
  const q = Math.min(60, 2 * (stufe - 1)), pts: Record<string, number> = {};
  for (let i = 0; i < q; i++) { const t = QUELL_TRACKS[[0, 1, 2, 3, 4, 5][i % 6]]; pts[t.id] = Math.min(CFG.quell.trackCap, (pts[t.id] ?? 0) + 1); }
  c.quell = { lvl: q, xp: 0, pts };
  return c;
}
export function buffUp(b: Bot) { applyTimed(b.p, 'food_spiess', 99999); applyTimed(b.p, 'elx_power', 99999); }

/** Öffnet einen Riss über den echten Weg (Riss-Stein, `Rift.start`). `mods`: gewünschte Modifikatoren – gesucht wird ein passender Zähler. */
export function openRift(lab: Lab, bots: Bot[], dungeon: string, stufe: number, mods?: RiftModId[], seed = 1): Zone | null {
  let rs = seed;
  if (mods && dungeon !== TRIAL_ID) {
    const want = [...mods].sort().join(',');
    rs = -1;
    for (let s = seed; s < seed + 60000; s++) if ([...riftMods(s, dungeon, stufe).mods].sort().join(',') === want) { rs = s; break; }
    if (rs < 0) return null;
  }
  const h = riftHome();
  for (const b of bots) {
    const c = b.p.char;
    c.quests.m_koenig = { s: 'done', p: [], n: 1 };
    c.rift = { stufe: Math.max(stufe, dungeon === TRIAL_ID ? CFG.rift.trial.unlock + 1 : 1), seed: rs, best: {} };
    lab.game.transfer(b.p, h.zone, '', h);
  }
  lab.party(bots);
  if (bots[0].p.party) bots[0].p.party.lead = bots[0].p;
  Rift.start(lab.game, bots[0].p, dungeon, stufe);
  const z = bots[0].p.zone;
  if (!z.rift) return null;
  z.rng = new Rng(seed * 13 + stufe);
  for (const b of bots) buffUp(b);
  return z;
}

/** Ein ganzer Riss vom Eingang bis zum Echo. */
export function riftRun(lab: Lab, dungeon: string, stufe: number, chars: CharData[], skill: Skill, seed: number, mods?: RiftModId[], maxSec = 1800): RunResult | null {
  const bots = chars.map((c, i) => lab.join(c, skill, seed * 31 + i));
  const z = openRift(lab, bots, dungeon, stufe, mods, seed);
  if (!z) { for (const b of bots) lab.leave(b); return null; }
  const r = runInstance(lab, z, bots, () => !!z.rift!.done, maxSec);
  for (const b of bots) lab.leave(b);
  lab.game.zones.delete(z.key);
  return r;
}

/**
 * Nur das Echo am Ende (die Gruppe steht mit vollem Leben im Bossraum). Fällt die Gruppe, kehrt sie gegen einen Lebensfunken
 * zurück und versucht es erneut – wie im Spiel. Für die Prüfung der Sieben: `dungeon = TRIAL_ID`.
 */
export function echoFight(lab: Lab, dungeon: string, stufe: number, chars: CharData[], skill: Skill, seed: number, mods?: RiftModId[], maxSec = 900): RunResult & { firstTry: boolean } | null {
  const bots = chars.map((c, i) => lab.join(c, skill, seed * 31 + i));
  const z = openRift(lab, bots, dungeon, stufe, mods, seed);
  if (!z) { for (const b of bots) lab.leave(b); return null; }
  lab.tap(z, bots);
  const room = z.map.bossRoom!, game = lab.game, t0 = game.now;
  const bounds = { x0: (room.x0 + 1.6) * TILE, y0: (room.y0 + 1.6) * TILE, x1: (room.x1 - 0.6) * TILE, y1: (room.y1 - 0.6) * TILE };
  const put = () => bots.forEach((b, i) => { b.bounds = bounds; lab.place(b.p, (room.cx + 0.5) * TILE + (i - (bots.length - 1) / 2) * 22, (room.y1 - 1) * TILE); });
  // Gegner außerhalb des Bossraums spielen hier keine Rolle
  for (const m of [...z.mobs.values()]) if (!m.boss) z.mobs.delete(m.id);
  put();
  const d0 = bots.map(b => b.p.char.deaths);
  let tries = 1, bossSec = 0;
  while (!z.rift!.done && !z.rift!.failed && game.now - t0 < maxSec) {
    if (bots.every(b => b.p.dead)) {
      if (z.rift!.revives <= 0) { for (let i = 0; i < 100 && !z.rift!.failed; i++) lab.step(bots); break; }
      for (const b of bots) if (z.rift!.revives > 0 || bots.length === 1) b.send({ t: 'respawn' });
      for (let i = 0; i < 60; i++) (game as any).tick(1 / CFG.net.tickRate); // der Boss setzt sich zurück
      if (bots.every(b => b.p.zone !== z)) break;
      put(); tries++;
    }
    if (z.boss?.active) bossSec += 1 / CFG.net.tickRate;
    lab.step(bots);
  }
  const run = z.rift!;
  const res = { ok: !!run.done, sec: game.now - t0, deaths: bots.reduce((a, b, i) => a + b.p.char.deaths - d0[i], 0), potions: bots.reduce((a, b) => a + b.potions, 0), stuck: false,
    par: run.par, bonus: run.done?.bonus, revives: run.revives, failed: run.failed, bossSec, bossTries: tries, firstTry: !!run.done && tries === 1 };
  for (const b of bots) lab.leave(b);
  lab.game.zones.delete(z.key);
  return res;
}
