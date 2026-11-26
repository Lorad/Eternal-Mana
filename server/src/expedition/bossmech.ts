/**
 * Endbosse der Expeditionen (0.9): Jeder Boss behält seine Muster aus boss.ts und bekommt in seiner Arena
 *   – Phasenwechsel bei 60 % und 25 % mit einem kurzen Filmmoment (Boss unverwundbar, Worte, die Arena verändert sich),
 *   – EINE Signaturmechanik, die man lernen muss (nicht nur Schaden),
 *   – je Schwierigkeitsgrad: einen zusätzlichen Angriff, Helfer in jeder Phase, Wut nach einer Frist, die Signatur öfter.
 * BossCtl ruft die Haken über dieselbe Schnittstelle wie bei den Boss-Echos auf (EchoMech in echo.ts).
 */
import { circleFree } from '../../../shared/src/collision';
import { TILE } from '../../../shared/src/maps/tiles';
import { EXPEDITIONS, EXP_CFG, EXP_DIFF } from '../../../shared/src/data/expeditions';
import { Anim } from '../../../shared/src/types';
import type { Element } from '../../../shared/src/types';
import type { BossCtl } from '../boss';
import { ECHO_MECH, type BossKit, type EchoMech } from '../echo';
import type { Player } from '../player';
import type { Mob, Obj, Zone } from '../zone';

type Gen = Generator<number, void, void>;
interface MechState {
  invulnUntil: number; enraged: boolean; adds: Set<Mob>; next: number; shieldTxt: number; t: number; heat: number;
  stunUntil?: number;
  still?: { at: number; until: number; pos: Map<Player, [number, number]>; hit: Set<Player> };
  entry?: { p: Player; until: number };
  wisp?: { x0: number; y0: number; x1: number; y1: number; at: number; until: number; fx: number; fxAt: number };
  n?: number;
}
const states = new WeakMap<BossCtl, MechState>();
export const st = (b: BossCtl): MechState => { let s = states.get(b); if (!s) { s = { invulnUntil: 0, enraged: false, adds: new Set(), next: 0, shieldTxt: 0, t: 0, heat: 0 }; states.set(b, s); } return s; };
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
  /** eigenes Muster, das in jeder Phase mit an die Reihe kommt */
  pattern?(k: BossKit, s: MechState): Gen;
  /** Spieler benutzt ein Objekt der Mechanik (Kühlkette, Tintenfass) */
  use?(k: BossKit, s: MechState, p: Player, o: Obj): void;
  /** Ansturm aus einem gewöhnlichen Muster des Bosses (EchoMech.charged) */
  charged?(k: BossKit, s: MechState, x0: number, y0: number, x1: number, y1: number): number | undefined;
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

/** Kristallkoloss: Trifft der Weg (x0, y0) → (x1, y1) eine Prismensäule, zerschellt sie – und er taumelt. */
function shatter(k: BossKit, s: MechState, x0: number, y0: number, x1: number, y1: number): boolean {
  const z = k.boss.zone, L = Math.hypot(x1 - x0, y1 - y0) || 1;
  for (const p of [...s.adds]) {
    if (p.dead) continue;
    const c = Math.max(0, Math.min(1, ((p.x - x0) * (x1 - x0) + (p.y - y0) * (y1 - y0)) / (L * L)));
    if (Math.hypot(x0 + (x1 - x0) * c - p.x, y0 + (y1 - y0) * c - p.y) > 30) continue;
    p.invuln = false; z.killMob(p); s.adds.delete(p);
    z.ev({ k: 'fx', n: 'explosion', x: p.x, y: p.y, r: 50, el: 'light' });
    s.stunUntil = z.game.now + 5;
    k.say('*Die Säule zerspringt – der Koloss taumelt. Jetzt!*');
    k.anim(Anim.Hurt, 4.5);
    return true;
  }
  return false;
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
      for (const a of [...s.adds]) if (a.dead || !z.mobs.has(a.id)) s.adds.delete(a);
      const n = Math.min(4, 1 + ph + (d.bossAdds > 0 ? 1 : 0)) - s.adds.size; // höchstens vier Knospen zugleich
      for (const [x, y] of n > 0 ? edgeSpots(k, n) : []) { const m = z.spawnMob('xm_knospe', Math.max(1, k.boss.def.level - 1), x, y); m.maxHp = m.hp = Math.round(m.maxHp * (0.8 + 0.25 * ph)); s.adds.add(m); }
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
  /** Kristallkoloss – Prismenpanzer: Er nimmt kaum Schaden. Lockt seinen Ansturm in eine der Prismensäulen –
   *  er zerschellt daran und ist ein paar Sekunden lang verwundbar. */
  kristallkoloss: {
    hint: 'Der Kristallpanzer schluckt fast jeden Hieb. Lockt seinen Ansturm in eine Prismensäule – dann taumelt er!',
    start(k, s) { this.phase!(k, s, 1); },
    phase(k, s) {
      const z = k.boss.zone;
      for (const a of s.adds) if (!a.dead) { a.dead = true; z.mobs.delete(a.id); z.ev({ k: 'mob-', id: a.id }); }
      s.adds.clear();
      const r = k.boss.room, pts: [number, number][] = [[r.x0 + 4, r.y0 + 3], [r.x1 - 3, r.y0 + 3], [r.x0 + 4, r.y1 - 2], [r.x1 - 3, r.y1 - 2]];
      for (const [tx, ty] of pts) { const m = z.spawnMob('xm_prisma', k.boss.def.level, (tx + 0.5) * TILE, (ty + 0.5) * TILE); m.invuln = true; m.speed = 0; m.target = null; m.state = 'idle'; s.adds.add(m); }
    },
    *pattern(k, s) {
      const t = k.target(); if (!t) return;
      const m = k.boss.mob, z = k.boss.zone, a = Math.atan2(t.y - m.y, t.x - m.x), r = k.boss.room;
      // Der Weg endet an der ersten Säule auf der Bahn – sonst vor der Wand (die Arena ist nicht rechteckig)
      let ex = m.x, ey = m.y;
      for (let d = 0; d < 360; d += 6) {
        const nx = m.x + Math.cos(a) * d, ny = m.y + Math.sin(a) * d;
        if (nx < (r.x0 + 1.5) * TILE || nx > (r.x1 - 0.5) * TILE || ny < (r.y0 + 1.5) * TILE || ny > (r.y1 - 0.5) * TILE || !circleFree(z.solidWalk, nx, ny, 10)) break;
        ex = nx; ey = ny;
        if (d > 20 && [...s.adds].some(p => !p.dead && Math.hypot(p.x - nx, p.y - ny) < 22)) break;
      }
      k.say('*Der Koloss senkt den Kopf. Ansturm!*');
      k.beam(m.x, m.y, ex, ey, 34, 1.1, 1.8);
      k.anim(Anim.Windup, 1.1);
      yield 1.15;
      const x0 = m.x, y0 = m.y;
      z.ev({ k: 'fx', n: 'dash', x: m.x, y: m.y, el: m.element, ang: a });
      m.x = ex; m.y = ey;
      k.anim(Anim.Attack, 0.3);
      if (shatter(k, s, x0, y0, ex, ey)) { yield 4.5; return; }
      k.radial(10, 100, 0, 'rock', 0.7);
      yield 0.6;
    },
    // Der Ansturm aus seinen gewöhnlichen Mustern (Phase 2 und 3) zählt genauso – solange Säulen stehen, hält sonst der Panzer
    charged(k, s, x0, y0, x1, y1) {
      if (shatter(k, s, x0, y0, x1, y1)) return 4.5;
      if (!s.adds.size) return undefined;
      k.say('*Der Koloss rammt die Wand – doch der Kristallpanzer hält. Lockt ihn in eine Säule!*');
      return 1.2;
    },
    tick(k, s) {
      const z = k.boss.zone, m = k.boss.mob, t = z.game.now;
      for (const a of [...s.adds]) if (a.dead || !z.mobs.has(a.id)) s.adds.delete(a);
      const stunned = (s.stunUntil ?? 0) > t;
      m.vuln = stunned ? 1.8 : s.adds.size ? 0.3 : 1; // ohne Säulen gibt es nichts mehr zu lernen – dann ist er gewöhnlich verwundbar
      if (t >= s.shieldTxt) { s.shieldTxt = t + 2.6; z.ev({ k: 'txt', x: m.x, y: m.y - 50, s: stunned ? 'Verwundbar!' : s.adds.size ? 'Kristallpanzer' : 'Panzer gesprungen', col: stunned ? '#ffd84a' : '#bfe9ff' }); }
    },
    reset(k, s) { for (const a of s.adds) { a.dead = true; k.boss.zone.mobs.delete(a.id); } s.adds.clear(); s.stunUntil = 0; },
  },
  /** Ignarok – Glutkern: Seine Hitze steigt stetig. Bei voller Glut bricht die Esse aus (die ganze Arena). Wer vorher eine
   *  Kühlkette am Rand zieht, löscht die Glut – und Ignarok liegt kurz offen. */
  ignarok: {
    hint: 'Ignaroks Glut steigt. Bevor sie voll ist, zieht jemand eine der Kühlketten am Rand der Arena – sonst bricht die Esse aus!',
    start(k, s) {
      const z = k.boss.zone, r = k.boss.room;
      s.heat = 0;
      if (![...z.objs.values()].some(o => o.props?.kind === 'chain')) for (const tx of [r.x0 + 2, r.x1 - 1]) z.addDynamicObj('xobj', (tx + 0.5) * TILE, (Math.round((r.y0 + r.y1) / 2) + 0.5) * TILE, { kind: 'chain', frame: 'lever', label: 'Kühlkette', prompt: 'Kühlkette ziehen', light: [60, 0x80c8ff, 0.6] }, 'chain');
    },
    tick(k, s, dt) {
      const z = k.boss.zone, m = k.boss.mob, t = z.game.now;
      const stunned = (s.stunUntil ?? 0) > t;
      m.vuln = stunned ? 1.7 : 1;
      if (stunned) return;
      const before = s.heat;
      s.heat = Math.min(100, s.heat + dt * 5.5 * diffOf(z).sigFaster);
      if (before < 75 && s.heat >= 75) { k.say('*Ignarok glüht weiß auf. Die Esse wird gleich ausbrechen – die Kühlketten!*'); z.ev({ k: 'sfx', n: 'boss_phase' }); }
      if (t >= s.shieldTxt) { s.shieldTxt = t + 2; z.ev({ k: 'txt', x: m.x, y: m.y - 50, s: `Glut ${Math.round(s.heat)} %`, col: s.heat >= 75 ? '#ff6040' : '#ffb060' }); }
      if (s.heat >= 100) {
        s.heat = 0;
        k.say('*Die Esse bricht aus!*');
        z.ev({ k: 'fx', n: 'explosion', x: k.boss.cx, y: k.boss.cy, r: 200, el: 'fire' });
        for (const p of k.players()) z.hitPlayer(p, m.dmg * 1.7, 'fire', k.boss.def.level, 'Ausbruch der Esse', { id: 'burn', dur: 3 });
      }
    },
    use(k, s, p, o) {
      const z = k.boss.zone, t = z.game.now;
      if (o.state === 1) { p.toast('Die Kette ist noch heiß.', 'bad'); return; }
      if (s.heat < 35) { p.toast('Noch ist die Glut nicht hoch genug – spar dir die Kette.', 'info'); return; }
      s.heat = 0; s.stunUntil = t + 5;
      z.setObjState(o, 1); o.activeUntil = t + 9;
      k.say(`*${p.name} zieht die Kühlkette. Wasser zischt – Ignarok erstarrt in einer Kruste aus Schlacke!*`);
      z.ev({ k: 'fx', n: 'explosion', x: k.boss.mob.x, y: k.boss.mob.y, r: 70, el: 'water' });
      k.anim(Anim.Hurt, 4.5);
    },
    reset(k, s) { s.heat = 0; s.stunUntil = 0; },
  },
  /** Ysolde – Stillstand: „Halt still.“ Wer sich bewegt, während das Muster erstarrt, friert ein. Stehen bleiben rettet. */
  ysolde: {
    hint: 'Wenn Ysolde „Halt still“ sagt und das Muster erstarrt: NICHT bewegen, nicht ausweichen – wer sich rührt, friert ein.',
    start(k, s) { s.next = k.boss.zone.game.now + 14; },
    tick(k, s) {
      const z = k.boss.zone, t = z.game.now, m = k.boss.mob;
      if (!s.still && t >= s.next) {
        s.still = { at: t + 2.6, until: t + 4.2, pos: new Map(), hit: new Set() };
        k.say('„Halt still. Nur einen Atemzug lang.“');
        z.addFx({ kind: 'zone', x: k.boss.cx, y: k.boss.cy, r: 230, el: 'water', dur: 4.2, until: t + 4.2, hostile: false, raw: 0, lvl: 1, by: '' });
        z.ev({ k: 'txt', x: m.x, y: m.y - 50, s: 'Halt still …', col: '#bfe9ff' });
      }
      const w = s.still;
      if (!w) return;
      if (t >= w.at && !w.pos.size) { for (const p of k.players()) w.pos.set(p, [p.x, p.y]); z.ev({ k: 'txt', x: m.x, y: m.y - 50, s: 'Erstarrt!', col: '#ffffff' }); z.ev({ k: 'sfx', n: 'freeze', x: m.x, y: m.y }); }
      if (t >= w.at) for (const [p, [x, y]] of w.pos) {
        if (w.hit.has(p) || p.dead) continue;
        if (Math.hypot(p.x - x, p.y - y) > 6 || t < p.rollUntil) {
          w.hit.add(p);
          z.hitPlayer(p, m.dmg * 1.6, 'water', k.boss.def.level, 'Stillstand', { id: 'freeze', dur: 1.2 });
          z.ev({ k: 'txt', x: p.x, y: p.y - 26, s: 'Bewegt!', col: '#9fe8ff' });
        }
      }
      if (t >= w.until) { s.still = undefined; s.next = t + 22 / diffOf(z).sigFaster; }
    },
    reset(k, s) { s.still = undefined; },
  },
  /** Der Archivar – Berichtigung: Er trägt jemanden ein. Wer eingetragen ist, muss sich am Tintenfass streichen lassen,
   *  bevor die Frist abläuft – sonst wird er „gelöscht“. */
  archivar: {
    hint: 'Wer „eingetragen“ wird, läuft zu einem der Tintenfässer am Rand und streicht sich – bevor der Archivar den Eintrag löscht!',
    start(k, s) {
      const z = k.boss.zone, r = k.boss.room;
      s.next = z.game.now + 10;
      if (![...z.objs.values()].some(o => o.props?.kind === 'ink')) for (const [tx, ty] of [[r.x0 + 2, r.y0 + 2], [r.x1 - 1, r.y0 + 2], [Math.round((r.x0 + r.x1) / 2), r.y1 - 1]]) z.addDynamicObj('xobj', (tx + 0.5) * TILE, (ty + 0.5) * TILE, { kind: 'ink', frame: 'urn', label: 'Tintenfass', prompt: 'Eintrag streichen', light: [50, 0x8080ff, 0.5] }, 'ink');
    },
    tick(k, s) {
      const z = k.boss.zone, t = z.game.now, m = k.boss.mob;
      if (!s.entry && t >= s.next) {
        const p = k.target(); if (!p) return;
        s.entry = { p, until: t + 7.5 };
        p.statuses.set('mark', { until: t + 7.5, dps: 0 });
        k.say(`„Eintrag: ${p.name}. Wird berichtigt.“`);
        p.toast('Du bist eingetragen! Lauf zu einem Tintenfass und streich dich.', 'bad');
      }
      const e = s.entry;
      if (!e) return;
      const p = e.p;
      if (p.dead || !z.players.has(p.id)) { s.entry = undefined; s.next = t + 12; return; }
      if (t >= s.shieldTxt) { s.shieldTxt = t + 1; z.ev({ k: 'txt', x: p.x, y: p.y - 28, s: `Eintrag ${Math.ceil(e.until - t)}`, col: '#c8b0ff' }); }
      const ink = [...z.objs.values()].find(o => o.props?.kind === 'ink' && Math.hypot(o.x - p.x, o.y - p.y) < 26);
      if (ink) { this.use!(k, s, p, ink); return; }
      if (t >= e.until) {
        s.entry = undefined; s.next = t + 20 / diffOf(z).sigFaster;
        k.say('„Eintrag gelöscht.“');
        z.addFx({ kind: 'tele', x: p.x, y: p.y, r: 34, el: 'wind', dur: 0.05, until: t + 0.05, hostile: true, raw: m.dmg * 3, lvl: k.boss.def.level, status: { id: 'weak', dur: 5 }, by: 'Löschung' });
      }
    },
    use(k, s, p) {
      if (!s.entry || s.entry.p !== p) return;
      const z = k.boss.zone;
      s.entry = undefined; s.next = z.game.now + 20 / diffOf(z).sigFaster;
      p.statuses.delete('mark');
      z.ev({ k: 'txt', x: p.x, y: p.y - 28, s: 'Gestrichen!', col: '#9dffb0' });
      k.say('„Eintrag … unleserlich. Vorgang ausgesetzt.“');
    },
    reset(k, s) { s.entry = undefined; },
  },
  /** Der Hohle König – Maelis’ Licht: Vor der Leerenwoge erscheint ein wanderndes Licht. Nur wer bei ihm steht, wenn die Woge kommt, bleibt heil. */
  hohlkoenig: {
    hint: 'Wenn die Leerenwoge kommt, erscheint ein kleines wanderndes Licht. Bleibt bei ihm – nur dort ist man sicher.',
    start(k, s) { s.next = k.boss.zone.game.now + 16; },
    tick(k, s) {
      const z = k.boss.zone, t = z.game.now, m = k.boss.mob;
      if (!s.wisp && t >= s.next) {
        const [x0, y0] = k.rndPos(3), [x1, y1] = k.rndPos(3);
        s.wisp = { x0, y0, x1, y1, at: t, until: t + 5.5, fx: 0, fxAt: 0 };
        k.say('„Wenn du gehst, soll NICHTS bleiben!“ – Ein kleines Licht flackert auf. Folgt ihm!');
        z.addFx({ kind: 'tele', x: k.boss.cx, y: k.boss.cy, r: 230, el: 'dark', dur: 5.5, until: t + 5.5, hostile: false, raw: 0, lvl: 1, by: '' });
      }
      const w = s.wisp;
      if (!w) return;
      const f = Math.min(1, (t - w.at) / (w.until - w.at - 0.8)), x = w.x0 + (w.x1 - w.x0) * f, y = w.y0 + (w.y1 - w.y0) * f;
      if (t >= w.fxAt) { if (w.fx) { z.fx.delete(w.fx); z.ev({ k: 'zone-', id: w.fx }); } w.fx = z.addFx({ kind: 'zone', x, y, r: 36, el: 'light', dur: 0.6, until: t + 0.6, hostile: false, raw: 0, lvl: 1, by: '' }).id; w.fxAt = t + 0.4; }
      if (t >= w.until) {
        s.wisp = undefined; s.next = t + 24 / diffOf(z).sigFaster;
        z.ev({ k: 'fx', n: 'explosion', x: k.boss.cx, y: k.boss.cy, r: 220, el: 'dark' });
        for (const p of k.players()) if (Math.hypot(p.x - x, p.y - y) > 42) z.hitPlayer(p, m.dmg * 2.6, 'dark', k.boss.def.level, 'Leerenwoge');
      }
    },
    reset(k, s) { s.wisp = undefined; },
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
      const tint = EXPEDITIONS[zone.exp!.exp].bossTint; if (tint) k.boss.mob.tint = tint;
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
    // Signatur-Muster und (ab „Schwer“) der zusätzliche Angriff wechseln sich ab
    pattern: sig?.pattern || d.bossExtra ? function* (k: BossKit): Gen {
      const s = st(k.boss); s.n = (s.n ?? 0) + 1;
      if (sig?.pattern && (!d.bossExtra || s.n % 2 === 1)) yield* sig.pattern(k, s); else yield* extraPattern(k);
    } : undefined,
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
    charged: sig?.charged ? (k, x0, y0, x1, y1) => sig.charged!(k, st(k.boss), x0, y0, x1, y1) : undefined,
  };
}

/** Objekt einer Bossmechanik benutzt (Kühlkette, Tintenfass). true = erledigt. */
export function mechInteract(zone: Zone, p: Player, o: Obj): boolean {
  const b = zone.boss, sig = b && SIG[b.def.id];
  if (!b || !sig?.use) return false;
  if (!b.active) { p.toast('Noch ruht hier alles.', 'info'); return true; }
  sig.use(b.kit(), st(b), p, o);
  return true;
}
/** Kühlketten kühlen ab (Abklingzeit) */
export function tickMechObjs(zone: Zone, now: number) {
  for (const o of zone.objs.values()) if (o.props?.kind === 'chain' && o.state === 1 && now >= (o.activeUntil ?? 0)) zone.setObjState(o, 0);
}
