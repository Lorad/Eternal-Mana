/**
 * Spielermodell für den Spieltest (scripts/playtest.ts): ein Bot, der wie ein Mensch kämpft – nur berechenbarer.
 *
 * Was er darf: laufen (mit dem echten Tempo, über dieselbe Bewegungsprüfung wie ein Client), Standardangriff, die vier
 * Fähigkeiten der Leiste, Ausweichrolle, Tränke mit der echten Abklingzeit. Kein /god, keine Dev-Befehle im Kampf.
 * Was ihn menschlich macht:
 *   - Reaktionszeit: Eine Gefahr (Bodenmarkierung, Geschoss, Ausholen eines Gegners) nimmt er erst `react` Sekunden
 *     nach ihrem Erscheinen wahr (±30 % Streuung). Fliegen schon Geschosse, reagiert er auf weitere doppelt so schnell.
 *   - Fehlerquote: Mit Wahrscheinlichkeit `miss` übersieht er eine Bodenmarkierung/ein Geschoss ganz, mit `missPose`
 *     das Ausholen eines gewöhnlichen Gegners (das hat keine Markierung am Boden).
 *   - Bewegungssperre beim Zuschlagen wie im Client (0,14 s je Hieb, 0,275 s beim Kombo-Abschluss, 0,24 s bei Fähigkeiten
 *     mit Hieb-Animation) und eine kurze Pause zwischen zwei Fähigkeiten.
 * Was er nicht kann: Muster auswendig lernen, vorausplanen, Mitspieler wiederbeleben, Fallenräume lesen.
 */
import { distToSegment, lineClear, moveCircle } from '../../shared/src/collision';
import { CFG } from '../../shared/src/config';
import { CLASSES } from '../../shared/src/data/classes';
import { SKILLS, skillMp } from '../../shared/src/data/skills';
import { T, TILE } from '../../shared/src/maps/tiles';
import type { ClientMsg } from '../../shared/src/types';
import { Rng } from '../../shared/src/util/rng';
import type { Game, Session } from '../../server/src/game';
import type { Player } from '../../server/src/player';
import type { Mob, Zone } from '../../server/src/zone';

export interface Skill {
  id: string; name: string;
  /** s bis zur Wahrnehmung einer neuen Gefahr */
  react: number;
  /** Anteil übersehener Markierungen und Geschosse / übersehener Ausholposen */
  miss: number; missPose: number;
  /** Heiltrank unter diesem Anteil des Lebens */
  potionAt: number;
}
export const SKILL: Record<string, Skill> = {
  sorgsam: { id: 'sorgsam', name: 'sorgfältig', react: 0.25, miss: 0.03, missPose: 0.25, potionAt: 0.5 },
  mittel: { id: 'mittel', name: 'durchschnittlich', react: 0.35, miss: 0.1, missPose: 0.5, potionAt: 0.45 },
  achtlos: { id: 'achtlos', name: 'unachtsam', react: 0.55, miss: 0.3, missPose: 0.85, potionAt: 0.3 },
};

interface Threat {
  kind: 'circle' | 'line' | 'nuke' | 'pool' | 'proj';
  /** Sekunden ab jetzt bis zum Einschlag (pool/proj: 0) und Ende der Gefahr */
  t: number; tEnd: number;
  x: number; y: number; r: number; x2?: number; y2?: number; hw?: number;
  vx?: number; vy?: number; life?: number;
  safe?: { x: number; y: number; r: number }[];
  w: number;
}

const DIRS = 12, STEP = 0.05, NSTEP = 24, PROJ_STEPS = 16;
const MARGIN = 5;

/** Wegfindung über das Kachelraster der Karte (Breitensuche; Türen gelten als offen). */
export class Nav {
  private w: number; private h: number;
  constructor(private z: Zone) { this.w = z.map.w; this.h = z.map.h; }
  private free(tx: number, ty: number) { return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h && this.z.map.solid[ty * this.w + tx] === 0; }
  /** Kachelweg (Breitensuche, Türen gelten als offen); Rückgabe: Punkte in Pixeln vom Start zum Ziel */
  path(fx: number, fy: number, tx: number, ty: number): { x: number; y: number }[] | null {
    const w = this.w, sx = Math.floor(fx / TILE), sy = Math.floor(fy / TILE), gx = Math.floor(tx / TILE), gy = Math.floor(ty / TILE);
    const prev = new Int32Array(w * this.h).fill(-1);
    const q = [gy * w + gx];
    prev[q[0]] = q[0];
    for (let k = 0; k < q.length; k++) {
      const i = q[k], x = i % w, y = (i / w) | 0;
      if (x === sx && y === sy) break;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const nx = x + dx, ny = y + dy, ni = ny * w + nx;
        if (!this.free(nx, ny) || prev[ni] >= 0) continue;
        if (dx && dy && (!this.free(x + dx, y) || !this.free(x, y + dy))) continue;
        prev[ni] = i; q.push(ni);
      }
    }
    let i = sy * w + sx;
    if (prev[i] < 0) return null;
    const out: { x: number; y: number }[] = [];
    for (let guard = 0; guard < 4000; guard++) { out.push({ x: ((i % w) + 0.5) * TILE, y: (((i / w) | 0) + 0.5) * TILE }); if (prev[i] === i) break; i = prev[i]; }
    return out;
  }
}

export class Bot {
  rng: Rng;
  /** Wahrnehmung: Schlüssel der Gefahr → Zeitpunkt, ab dem der Bot sie kennt (Infinity = übersehen) */
  private aware = new Map<string, number>();
  private windup = new Map<number, { serial: number; on: boolean }>();
  private lastProjSeen = -99;
  private moveLockUntil = 0; private nextSkillAt = 0; private rollDir = 0;
  private backUntil = 0;
  /** letzter Zeitpunkt, an dem ein Angriff oder eine Fähigkeit herausging – findet der Bot lange keinen Schuss, läuft er um das Hindernis herum */
  private lastActAt = 0; private hadTarget = false; private nav: Nav | null = null; private navZone: Zone | null = null; private via: { x: number; y: number } | null = null; private viaAt = 0;
  /** Messwerte */
  taken = 0; potions = 0; mpPotions = 0; rolls = 0; casts = 0;
  hitsBy = new Map<string, number>();
  /** Wunschziel von außen (z. B. der Kampfplatz), wenn kein Gegner in Reichweite ist */
  goto: { x: number; y: number } | null = null;
  /** nur diese Gegner angreifen (leer = alle in der Nähe) */
  focus: ((m: Mob) => boolean) | null = null;
  /** Kampfplatz in Pixeln (Bossraum): der Bot verlässt ihn nicht freiwillig */
  bounds: { x0: number; y0: number; x1: number; y1: number } | null = null;

  constructor(public game: Game, public s: Session, public skill: Skill, seed: number) { this.rng = new Rng(seed); }
  get p(): Player { return this.s.player!; }
  send(m: ClientMsg) { (this.game as any).route(this.s, m); }

  // ------------------------------------------------------------------ Wahrnehmung
  private note(key: string, now: number, pose: boolean, proj: boolean): number {
    let at = this.aware.get(key);
    if (at !== undefined) return at;
    const sk = this.skill;
    if (this.rng.chance(pose ? sk.missPose : sk.miss)) at = Infinity;
    else {
      const alert = proj && now - this.lastProjSeen < 1.5;
      at = now + sk.react * this.rng.range(0.7, 1.3) * (alert ? 0.5 : 1);
    }
    this.aware.set(key, at);
    if (this.aware.size > 4000) { for (const [k, v] of this.aware) if (v < now - 8) this.aware.delete(k); }
    return at;
  }

  private threats(now: number): Threat[] {
    const p = this.p, z = p.zone, out: Threat[] = [];
    for (const f of z.fx.values()) {
      if (!f.hostile) continue;
      const at = this.note('f' + f.id, now, false, false);
      if (now < at) continue;
      const t = Math.max(0, f.until - now);
      if (f.kind === 'tele') {
        if (f.safeSpots) out.push({ kind: 'nuke', t, tEnd: t, x: f.x, y: f.y, r: f.r, safe: f.safeSpots, w: 6 });
        else if (f.shape === 'line') {
          // Linien ohne Schaden kündigen den Sturmlauf eines Gegners an: gefährlich ist die Bahn kurz danach
          const charge = f.raw <= 0;
          out.push({ kind: 'line', t, tEnd: t + (charge ? 0.5 : 0), x: f.x, y: f.y, x2: f.x2!, y2: f.y2!, hw: charge ? Math.max(f.w! / 2, 20) : f.w! / 2, r: 0, w: 1 });
        } else if (f.raw > 0) out.push({ kind: 'circle', t, tEnd: t, x: f.x, y: f.y, r: f.r, w: 1 });
      } else if (f.raw > 0) out.push({ kind: 'pool', t: 0, tEnd: t, x: f.x, y: f.y, r: f.r, w: 0.35 });
    }
    let sawProj = false;
    for (const pr of z.projs.values()) {
      if (!pr.hostile) continue;
      const at = this.note('p' + pr.id, now, false, true);
      if (now < at) continue;
      sawProj = true;
      out.push({ kind: 'proj', t: 0, tEnd: pr.life, x: pr.x, y: pr.y, r: pr.r, vx: pr.vx, vy: pr.vy, life: pr.life, w: 1 });
    }
    if (sawProj) this.lastProjSeen = now;
    // Ausholen gewöhnlicher Nahkämpfer (Bosse greifen nur über Markierungen und Geschosse an)
    for (const m of z.mobs.values()) {
      if (m.boss || m.dead) continue;
      const on = m.state === 'windup';
      let w = this.windup.get(m.id);
      if (!w) { w = { serial: 0, on: false }; this.windup.set(m.id, w); }
      if (on && !w.on) w.serial++;
      w.on = on;
      if (!on) continue;
      const a = m.def.atk;
      if (a.proj || a.aoe || m.def.ai === 'charge') continue; // die kommen als Geschoss, Kreis oder Linie
      const at = this.note('m' + m.id + ':' + w.serial, now, true, false);
      if (now < at) continue;
      out.push({ kind: 'circle', t: Math.max(0, m.t), tEnd: Math.max(0, m.t), x: m.x + m.aimX * a.range * 0.6, y: m.y + m.aimY * a.range * 0.6, r: (a.reach ?? 14) + CFG.player.radius - 2, w: 0.7 });
    }
    return out;
  }

  /** Kosten einer Bahn (Positionen im Abstand von STEP) gegen alle bekannten Gefahren; Treffer vor `safeUntil` zählen nicht. */
  private cost(path: Float32Array, th: Threat[], safeUntil: number): number {
    let c = 0;
    const at = (t: number): [number, number] => { const k = Math.max(0, Math.min(NSTEP, Math.round(t / STEP))); return [path[k * 2], path[k * 2 + 1]]; };
    for (const h of th) {
      if (h.kind === 'circle') {
        if (h.t < safeUntil) continue;
        const [x, y] = at(h.t);
        if (Math.hypot(x - h.x, y - h.y) <= h.r + 2 + MARGIN) c += h.w;
      } else if (h.kind === 'line') {
        for (let t = h.t; t <= h.tEnd + 1e-6; t += 0.1) {
          if (t < safeUntil) continue;
          const [x, y] = at(t);
          if (distToSegment(x, y, h.x, h.y, h.x2!, h.y2!) <= h.hw! + 2 + MARGIN) { c += h.w; break; }
        }
      } else if (h.kind === 'nuke') {
        const [x, y] = at(h.t);
        let best = 1e9;
        for (const s of h.safe!) best = Math.min(best, Math.hypot(x - s.x, y - s.y) - (s.r - 6));
        if (best > 0) c += h.w + best * 0.02;
      } else if (h.kind === 'pool') {
        for (let k = 2; k <= 14; k += 3) {
          const t = k * STEP;
          if (t > h.tEnd || t < safeUntil) continue;
          if (Math.hypot(path[k * 2] - h.x, path[k * 2 + 1] - h.y) <= h.r + 2 + 2) c += h.w;
        }
      } else {
        for (let k = 1; k <= PROJ_STEPS; k++) {
          const t = k * STEP;
          if (t > h.life!) break;
          if (t < safeUntil) continue;
          if (Math.hypot(path[k * 2] - (h.x + h.vx! * t), path[k * 2 + 1] - 6 - (h.y + h.vy! * t)) <= h.r + CFG.player.radius + 2 + MARGIN - 1) { c += h.w * (k <= 6 ? 1.2 : 1); break; }
        }
      }
    }
    return c;
  }

  private path(ang: number | null, speed: number, roll: boolean): Float32Array {
    const p = this.p, z = p.zone, out = new Float32Array((NSTEP + 1) * 2);
    let x = p.x, y = p.y;
    out[0] = x; out[1] = y;
    const dx = ang === null ? 0 : Math.cos(ang), dy = ang === null ? 0 : Math.sin(ang);
    const rollT = CFG.player.dodgeDuration + 0.12;
    for (let k = 1; k <= NSTEP; k++) {
      if (ang !== null) {
        const v = speed * (roll && k * STEP <= rollT ? CFG.player.dodgeSpeedMul : 1) * STEP;
        const r = moveCircle(z.solidWalk, x, y, dx * v, dy * v, CFG.player.radius);
        x = r.x; y = r.y;
      }
      out[k * 2] = x; out[k * 2 + 1] = y;
    }
    return out;
  }

  // ------------------------------------------------------------------ Ziel
  private pickTarget(): Mob | null {
    const p = this.p, z = p.zone;
    let best: Mob | null = null, bs = 1e9;
    for (const m of z.mobs.values()) {
      if (m.dead || m.hidden || m.invuln) continue;
      if (this.focus && !this.focus(m)) continue;
      const d = Math.hypot(m.x - p.x, m.y - p.y);
      const engaged = m.target === p || m.state === 'chase' || m.state === 'windup' || m.state === 'charge' || m.state === 'recover' || !!m.boss;
      if (!engaged && !this.focus && d > 150) continue;
      if (d > 420) continue;
      // nahe, angeschlagene und beschworene Gegner zuerst; der Boss ist das Ziel, wenn sonst nichts drängt
      const s = d + (m.hp / m.maxHp) * 25 + (m.boss ? 30 : 0);
      if (s < bs) { bs = s; best = m; }
    }
    return best;
  }

  // ------------------------------------------------------------------ ein Schritt (vor jedem Server-Tick)
  think() {
    const p = this.p;
    if (!p || p.dead) return;
    const z = p.zone, now = z.game.now, cls = CLASSES[p.char.cls], atk = cls.attack, melee = atk.kind === 'arc';
    const th = this.threats(now);
    const tgt = this.pickTarget();
    const stunned = p.stunned(now);

    // ---- Tränke (eigene Abklingzeit, kostet keine Handlung)
    if (now >= p.potionReadyAt && !stunned) {
      const hpT = (b: string) => p.char.inv.some(i => i.base.startsWith(b));
      if (p.hp < p.stats.maxHp * this.skill.potionAt && (hpT('potion_hp') || hpT('elixir'))) { this.send({ t: 'quick', kind: 'hp' }); if (now < p.potionReadyAt) this.potions++; }
      else if (tgt && p.mp < p.stats.maxMp * 0.2 && p.hp > p.stats.maxHp * 0.6 && hpT('potion_mp')) { this.send({ t: 'quick', kind: 'mp' }); if (now < p.potionReadyAt) this.mpPotions++; }
    }
    if (stunned) return;

    // ---- Bewegung
    const rolling = now < p.rollUntil;
    const speed = p.speed(now) / (now < p.rollUntil + 0.12 ? CFG.player.dodgeSpeedMul : 1);
    const safeUntil = Math.max(0, p.iframesUntil - now);
    const dT = tgt ? Math.hypot(tgt.x - p.x, tgt.y - p.y) : 0;
    // Sperrfeuer (mehrere Geschosse in der Luft): Nahkämpfer lösen sich vom Boss, bis es vorbei ist – wie ein Mensch, der „erst mal weg“ denkt
    const barrage = !!tgt?.boss && th.reduce((a, h) => a + (h.kind === 'proj' ? 1 : 0), 0) >= 4;
    if (barrage) this.backUntil = now + 0.5;
    const back = melee && now < this.backUntil;
    const want = !tgt ? 0 : melee ? (back ? 100 : atk.range + tgt.radius - 7) : Math.min(atk.range * (tgt.boss ? 0.62 : 0.55), 135);
    const nuke = th.find(h => h.kind === 'nuke');
    // kein Schuss seit drei Sekunden: Umweg über das Kachelraster suchen (Hindernis im Weg, Ziel hinter einer Ecke)
    if (!tgt) { this.hadTarget = false; this.via = null; } else if (!this.hadTarget) { this.hadTarget = true; this.lastActAt = now; }
    if (tgt && now - this.lastActAt > 3 && now >= this.viaAt) {
      this.viaAt = now + 0.3;
      if (this.navZone !== z) { this.nav = new Nav(z); this.navZone = z; }
      const path = this.nav!.path(p.x, p.y, tgt.x, tgt.y);
      this.via = path && path.length > 2 ? path[Math.min(path.length - 1, 3)] : { x: tgt.x, y: tgt.y };
    }
    if (tgt && now - this.lastActAt <= 3) this.via = null;
    const via = this.via;
    const pref = (path: Float32Array): number => {
      const k = 8, x = path[k * 2], y = path[k * 2 + 1];
      let c = 0;
      if (z.tileAt(x, y) === T.HAZARD) c += 0.8;
      const bd = this.bounds;
      if (bd) c += (Math.max(0, bd.x0 - x, x - bd.x1) + Math.max(0, bd.y0 - y, y - bd.y1)) * 0.2;
      if (nuke) return c; // nur noch ins Licht
      // Gegner nicht von ihrem Platz wegziehen: ab 260 px kehren sie um und heilen sich (Leine)
      if (tgt && !tgt.boss && !tgt.summoned) c += Math.max(0, Math.hypot(x - tgt.hx, y - tgt.hy) - 170) * 0.03;
      if (tgt && via) c += Math.hypot(via.x - x, via.y - y) * 0.012;
      else if (tgt) {
        const d = Math.hypot(tgt.x - x, tgt.y - y);
        if (melee) c += back ? Math.abs(d - want) * 0.012 : Math.max(0, d - want) * 0.012 + Math.max(0, tgt.radius - 2 - d) * 0.03; // nicht im Gegner stehen
        else c += Math.abs(d - want) * (d < want ? 0.012 : 0.006);
        if (!melee) {
          // Abstand zu Nahkämpfern halten
          for (const m of z.mobs.values()) { if (m.dead || m.boss || m.hidden) continue; const dm = Math.hypot(m.x - x, m.y - y); if (dm < 46) c += (46 - dm) * 0.006; }
          if (!lineClear(z.solidFly, x, y, tgt.x, tgt.y)) c += 0.3;
        }
      } else if (this.goto) c += Math.hypot(this.goto.x - x, this.goto.y - y) * 0.01;
      return c;
    };
    let moveAng: number | null = null;
    if (rolling) moveAng = this.rollDir;
    else {
      const stay = this.path(null, 0, false);
      const stayThreat = this.cost(stay, th, safeUntil);
      let best = stayThreat * 10 + pref(stay), bestAng: number | null = null, bestThreat = stayThreat;
      const locked = now < this.moveLockUntil;
      const paths: Float32Array[] = [];
      const off = this.rng.range(0, Math.PI * 2 / DIRS);
      if (!locked && speed > 1) for (let i = 0; i < DIRS; i++) {
        const a = off + (i / DIRS) * Math.PI * 2, path = this.path(a, speed, false);
        paths.push(path);
        const t = this.cost(path, th, safeUntil), c = t * 10 + pref(path) + 0.02; // Stehen ist bei Gleichstand besser (man kann zuschlagen)
        if (c < best - 1e-6) { best = c; bestAng = a; bestThreat = t; }
      }
      // Rolle: wenn Laufen nicht reicht und gleich etwas einschlägt
      const soon = th.some(h => (h.kind === 'proj' ? true : h.t < 0.45));
      if (bestThreat > 0.5 && soon && now >= p.dodgeReadyAt && speed > 1) {
        let rb = best, ra = -1;
        const iT = Math.max(safeUntil, CFG.player.dodgeIFrames);
        for (let i = 0; i < DIRS; i++) {
          const a = off + (i / DIRS) * Math.PI * 2, path = this.path(a, speed, true);
          const c = this.cost(path, th, iT) * 10 + pref(path) + 0.3;
          if (c < rb - 1e-6) { rb = c; ra = a; }
        }
        if (ra >= 0) { this.send({ t: 'dodge', ang: ra }); if (now < p.rollUntil) { this.rolls++; this.rollDir = ra; this.moveLockUntil = 0; moveAng = ra; } }
      }
      if (moveAng === null) moveAng = bestAng;
    }
    if (moveAng !== null) {
      const v = p.speed(now) * (1 / CFG.net.tickRate);
      const r = moveCircle(z.solidWalk, p.x, p.y, Math.cos(moveAng) * v, Math.sin(moveAng) * v, CFG.player.radius);
      if (r.x !== p.x || r.y !== p.y) this.send({ t: 'm', x: r.x, y: r.y, f: moveAng, e: p.epoch, mv: 1 });
    }
    if (rolling || now < p.rollUntil) return;
    if (!tgt) return;

    // ---- Handlungen
    const ang = Math.atan2(tgt.y - p.y, tgt.x - p.x), d = Math.hypot(tgt.x - p.x, tgt.y - p.y);
    const reach = d - tgt.radius;
    const clear = () => lineClear(z.solidFly, p.x, p.y - 6, tgt.x, tgt.y - 5);
    const aimProj = Math.atan2(tgt.y - 5 - (p.y - 6), tgt.x - p.x);
    if (now >= this.nextSkillAt) for (const id of p.char.hotbar) {
      if (!id) continue;
      const sk = SKILLS[id], rank = p.char.skills[id] ?? 0;
      if (!sk?.effects || rank < 1 || (p.cds.get(id) ?? 0) > now + 0.05 || p.mp < skillMp(sk, rank)) continue;
      const e = sk.effects[0];
      let ok = false, a = ang;
      switch (e.k) {
        case 'arc': ok = reach <= e.range - 3; break;
        case 'spin': ok = reach <= e.radius - 4; break;
        case 'proj': ok = d <= e.range * 0.85 && clear(); a = aimProj; break;
        case 'aoe': case 'zone': ok = e.at === 'self' ? reach <= e.radius - 6 : d <= e.maxRange; break;
        case 'dash': ok = e.mult > 0 && d <= e.dist - 6 && d > 14; break;
        case 'buff': ok = d < 200 && !p.buffs.some(b => b.id === e.id); break;
        case 'heal': ok = p.hp < p.stats.maxHp * 0.62; break;
        default: ok = false;
      }
      if (!ok) continue;
      this.send({ t: 'skill', id, ang: a, tx: Math.round(tgt.x), ty: Math.round(tgt.y) });
      if ((p.cds.get(id) ?? 0) > now + 0.05) {
        this.casts++;
        if (e.k !== 'buff' && e.k !== 'heal') this.lastActAt = now;
        this.nextSkillAt = now + 0.2;
        if (sk.anim !== 'cast') this.moveLockUntil = Math.max(this.moveLockUntil, now + 0.24);
        return;
      }
    }
    if (now >= p.atkReadyAt - 0.06) {
      const ok = melee ? reach <= atk.range - 2 : d <= atk.range * 0.92 && clear();
      if (ok) {
        const before = p.atkReadyAt;
        this.send({ t: 'atk', ang: melee ? ang : aimProj });
        if (p.atkReadyAt !== before) this.lastActAt = now;
        if (p.atkReadyAt !== before) this.moveLockUntil = Math.max(this.moveLockUntil, now + (melee && p.combo === 2 ? 0.275 : 0.14));
      }
    }
  }
}
