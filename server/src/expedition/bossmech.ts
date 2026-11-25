/**
 * Endbosse der Expeditionen (0.9): Jeder Boss behält seine Muster aus boss.ts und bekommt in seiner Arena
 *   – Phasenwechsel bei 60 % und 25 % mit einem kurzen Filmmoment (Boss unverwundbar, Worte, die Arena verändert sich),
 *   – EINE Signaturmechanik, die man lernen muss (nicht nur Schaden),
 *   – je Schwierigkeitsgrad: einen zusätzlichen Angriff, Helfer in jeder Phase, Wut nach einer Frist, die Signatur öfter.
 * BossCtl ruft die Haken über dieselbe Schnittstelle wie bei den Boss-Echos auf (EchoMech in echo.ts).
 */
import { TILE } from '../../../shared/src/maps/tiles';
import { EXP_CFG, EXP_DIFF } from '../../../shared/src/data/expeditions';
import { Anim } from '../../../shared/src/types';
import type { Element } from '../../../shared/src/types';
import type { BossCtl } from '../boss';
import { ECHO_MECH, type BossKit, type EchoMech } from '../echo';
import type { Mob, Zone } from '../zone';

type Gen = Generator<number, void, void>;
interface MechState { invulnUntil: number; enraged: boolean; adds: Set<Mob>; next: number; shieldTxt: number; t: number; heat: number }
const states = new WeakMap<BossCtl, MechState>();
const st = (b: BossCtl): MechState => { let s = states.get(b); if (!s) { s = { invulnUntil: 0, enraged: false, adds: new Set(), next: 0, shieldTxt: 0, t: 0, heat: 0 }; states.set(b, s); } return s; };
/** Schaden vor der Wut (die Wut überlebt kein Zurücksetzen des Kampfes) */
const baseDmg = new WeakMap<Mob, number>();
const diffOf = (z: Zone) => EXP_DIFF[z.exp!.diff];
const now = (k: BossKit) => k.boss.zone.game.now;

/** Worte und Arena-Veränderung beim Phasenwechsel je Boss */
interface Signature {
  /** Text, der die Mechanik erklärt (beim ersten Auftreten) */
  hint: string;
  start?(k: BossKit, s: MechState): void;
  phase?(k: BossKit, s: MechState, phase: number): void;
  tick?(k: BossKit, s: MechState, dt: number): void;
  reset?(k: BossKit, s: MechState): void;
}

/** Punkte am Rand der Arena (px), mindestens `minD` von der Mitte */
function edgeSpots(k: BossKit, n: number, minD = 110): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < 40 && out.length < n; i++) {
    const [x, y] = k.rndPos(2);
    if (Math.hypot(x - k.boss.cx, y - k.boss.cy) < minD || out.some(([a, b]) => Math.hypot(a - x, b - y) < 70)) continue;
    out.push([x, y]);
  }
  return out;
}
/** dauerhafte Gefahrenfläche (bleibt bis zum Ende des Kampfes) */
function overgrow(k: BossKit, x: number, y: number, r: number, el: Element) {
  const z = k.boss.zone, t = now(k);
  z.addFx({ kind: 'zone', x, y, r, el, dur: 999, until: t + 999, tick: 0.6, nextTick: t + 1.2, hostile: true, raw: k.boss.mob.dmg * 0.35, lvl: k.boss.def.level, status: el === 'earth' ? { id: 'slow', dur: 1.5 } : undefined, by: k.boss.def.name });
}

// ---------------------------------------------------------------------------------------------------------------- Signaturen
const SIG: Record<string, Signature> = {
  /** Dornenmutter – Wurzelschild: Solange Dornenknospen am Rand der Arena blühen, schützen sie ihre Mutter (fast kein Schaden).
   *  Knospen zerstören, dann zuschlagen; sie wachsen nach einer Weile nach. */
  dornenmutter: {
    hint: 'Die Dornenknospen am Rand schützen die Dornenmutter. Zerstört die Knospen – dann ist sie verwundbar!',
    start(k, s) { this.phase!(k, s, 1); },
    phase(k, s, ph) {
      const z = k.boss.zone, d = diffOf(z);
      const n = Math.min(4, 1 + ph + (d.bossAdds > 0 ? 1 : 0));
      for (const [x, y] of edgeSpots(k, n)) { const m = z.spawnMob('xm_knospe', Math.max(1, k.boss.def.level - 1), x, y); m.maxHp = m.hp = Math.round(m.maxHp * (0.8 + 0.25 * ph)); s.adds.add(m); }
      s.next = 0;
      if (ph === 2) { k.say('*Die Wände wuchern zu. Der Raum wird enger.*'); const r = k.boss.room; overgrow(k, (r.x0 + 1.5) * TILE, k.boss.cy, 34, 'earth'); overgrow(k, (r.x1 - 0.5) * TILE, k.boss.cy, 34, 'earth'); }
      if (ph === 3) { k.say('*Aus jeder Fuge treiben Dornen.*'); const r = k.boss.room; overgrow(k, k.boss.cx, (r.y0 + 1.5) * TILE, 34, 'earth'); overgrow(k, (r.x0 + 3) * TILE, (r.y1 - 1) * TILE, 28, 'earth'); overgrow(k, (r.x1 - 2) * TILE, (r.y0 + 2) * TILE, 28, 'earth'); }
    },
    tick(k, s, dt) {
      const z = k.boss.zone, m = k.boss.mob, t = now(k);
      for (const a of [...s.adds]) if (a.dead || !z.mobs.has(a.id)) s.adds.delete(a);
      const shielded = s.adds.size > 0;
      m.vuln = shielded ? 0.15 : 1;
      if (shielded && t >= s.shieldTxt) { s.shieldTxt = t + 2.6; z.ev({ k: 'txt', x: m.x, y: m.y - 46, s: `Wurzelschild (${s.adds.size})`, col: '#9dffb0' }); }
      if (!shielded) {
        if (!s.next) { s.next = t + 26 / diffOf(z).sigFaster; z.ev({ k: 'txt', x: m.x, y: m.y - 46, s: 'Verwundbar!', col: '#ffd84a' }); z.ev({ k: 'sfx', n: 'puzzle_solved' }); }
        else if (t >= s.next) { s.next = 0; k.say('*Neue Knospen brechen aus dem Boden.*'); this.phase!(k, s, Math.max(1, k.boss.phase - 1)); }
      }
      void dt;
    },
    reset(k, s) { s.adds.clear(); k.boss.mob.vuln = 1; },
  },
};

/** Zusätzlicher Angriff ab „Schwer“: das Muster des Boss-Echos – oder ein Ring mit Lücke */
function* extraPattern(k: BossKit): Gen {
  const echo = ECHO_MECH[k.boss.def.id];
  if (echo?.pattern) { yield* echo.pattern(k); return; }
  k.anim(Anim.Special, 1.6);
  k.say('*Zorn.*');
  let gap = k.boss.zone.rng.range(0, 6.28);
  for (let i = 0; i < 3; i++) { k.radial(22, 90, 0, 'orb', 0.85, gap, 0.5); gap += 0.8; yield 0.6; }
}

/** Die Mechanik eines Endbosses in seiner Expedition */
export function expBossMech(zone: Zone, bossId: string): EchoMech {
  const sig = SIG[bossId], d = diffOf(zone);
  return {
    phases: [...EXP_CFG.phases] as [number, number],
    start(k) {
      const s = st(k.boss);
      s.invulnUntil = 0; s.enraged = false; s.t = 0; s.adds.clear();
      const m0 = k.boss.mob; if (baseDmg.has(m0)) { m0.baseDmg = baseDmg.get(m0)!; m0.dmg = m0.baseDmg; } else baseDmg.set(m0, m0.baseDmg);
      zone.exp!.bossAt = zone.game.now;
      if (sig) { for (const p of k.players()) p.toast(sig.hint, 'story'); sig.start?.(k, s); }
      if (d.bossAdds > 1) k.summon(zone.map.def.mobs[0]?.[0] ?? 'moosling', 1);
    },
    phase(k, ph) {
      const s = st(k.boss), m = k.boss.mob;
      // Filmmoment: kurz unverwundbar, Druckwelle, die Arena verändert sich
      m.invuln = true; s.invulnUntil = zone.game.now + 2.2;
      zone.ev({ k: 'fx', n: 'explosion', x: m.x, y: m.y, r: 90, el: m.element });
      zone.ev({ k: 'fx', n: 'spawn', x: m.x, y: m.y, el: m.element });
      sig?.phase?.(k, s, ph);
      if (d.bossAdds) k.summon(zone.map.def.mobs[0]?.[0] ?? 'moosling', d.bossAdds);
    },
    pattern: d.bossExtra ? extraPattern : undefined,
    tick(k, dt) {
      const s = st(k.boss), m = k.boss.mob, t = zone.game.now;
      if (s.invulnUntil && t >= s.invulnUntil) { s.invulnUntil = 0; m.invuln = false; }
      if (d.enrage && !s.enraged && t - zone.exp!.bossAt >= d.enrage) {
        s.enraged = true; m.baseDmg *= 1.5; m.dmg = m.baseDmg;
        k.say(`*${k.boss.def.name} gerät in Raserei!*`);
        zone.ev({ k: 'fx', n: 'explosion', x: m.x, y: m.y, r: 70, el: 'fire' });
      }
      sig?.tick?.(k, s, dt);
    },
    reset(k) { const s = st(k.boss); s.invulnUntil = 0; k.boss.mob.invuln = true; sig?.reset?.(k, s); states.delete(k.boss); },
  };
}
