import { CFG } from '../../shared/src/config';
import { ITEMS } from '../../shared/src/data/items';
import { DERIVED_OBJECTIVES, QUESTS, QUEST_LIST, objectiveProgress, objectiveTarget, questComplete } from '../../shared/src/data/quests';
import { QUELL_MAX } from '../../shared/src/data/rifts';
import { computeStats } from '../../shared/src/stats';
import { Anim, FLAG_BUFF, FLAG_DEAD, FLAG_INVULN, FLAG_ROLL, FLAG_SHIELD, STATUS_BIT } from '../../shared/src/types';
import type { CharData, Derived, Element, GameEvent, ItemInstance, Mods, ServerMsg, StatusId } from '../../shared/src/types';
import type { Party } from './game';
import type { Zone } from './zone';

let NEXT_ID = 1;
export const nextId = () => NEXT_ID++;

/** `icon`/`desc` für die Anzeige; `keep` = übersteht den Tod; `item` = Speise/Elixier, aus dem der Buff stammt (wird mitgespeichert) */
export interface Buff { id: string; name: string; glyph: string; until: number; mods: Mods; shield: number; icon?: string; desc?: string; keep?: boolean; item?: string }
/** `el`/`by`: Element und Urheber des Treffers, der den Zustand verhängt hat (Grundlage der Reaktionen) */
export interface StatusState { until: number; dps: number; el?: Element; by?: Player }

export class Player {
  id = nextId();
  x = 0; y = 0; facing = Math.PI / 2; moving = false; lastMoveMsg = 0;
  epoch = 1; budget = 0; lastMoveAt = 0;
  stats: Derived;
  hp: number; mp: number;
  zone!: Zone;
  rollUntil = 0; iframesUntil = 0; dodgeReadyAt = 0; atkReadyAt = 0; combo = 0; comboAt = 0;
  anim = Anim.Idle; animUntil = 0;
  cds = new Map<string, number>();
  buffs: Buff[] = [];
  statuses = new Map<StatusId, StatusState>();
  dead = false; lastHurtAt = -99; potionReadyAt = 0; exitImmuneUntil = 0; hazardAt = 0; msgAt = 0;
  god = false; linkdead = false; linkdeadAt = 0;
  party: Party | null = null;
  dirty = new Set<keyof CharData>();
  pev: GameEvent[] = [];
  buffsDirty = false;
  enteredAt = 0;
  /** Story (0.3): laufendes Gespräch, Schutzfrist während einer Filmszene, zuletzt betretene Orte */
  story = { dlg: null as { npc: string; topic: string; node: string } | null, cineUntil: 0, cineAt: 0, zone: '', places: new Set<string>() };
  /** Zähler für die Legendäre Waffe des Kriegers (Treffer der Standardangriffe) */
  legendHits = 0;
  /** 0.7 Zuhause (gesetzt von server/src/home): dauerhafte Werte aus Begleiter und Trophäen; Faktoren für Aufsammelradius, Ruf, Schatzkarten */
  perkMods: Mods = {};
  perk = { pickup: 1, rep: 1, maps: 1 };
  /** Wird vor jedem Abgleich geänderter Charakterdaten gerufen (die Sammlung des Profils liest hier mit) */
  static onDirty: ((p: Player, keys: Set<keyof CharData>) => void) | null = null;

  constructor(public accountId: number, public charId: number, public char: CharData, public send: (m: ServerMsg) => void) {
    this.stats = computeStats(char);
    this.hp = Math.min(char.hp, this.stats.maxHp);
    this.mp = Math.min(char.mp, this.stats.maxMp);
  }

  get name() { return this.char.name; }
  get level() { return this.char.level; }

  recalc() {
    this.stats = computeStats(this.char, [...this.buffs.map(b => b.mods), this.perkMods]);
    this.hp = Math.min(this.hp, this.stats.maxHp);
    this.mp = Math.min(this.mp, this.stats.maxMp);
  }
  sync(...keys: (keyof CharData)[]) { for (const k of keys) this.dirty.add(k); }
  flush() {
    if (this.dirty.size) {
      Player.onDirty?.(this, this.dirty);
      const d: Partial<CharData> = {};
      for (const k of this.dirty) (d as any)[k] = this.char[k] ?? null; // null = Feld entfernt (z. B. Titel abgelegt) – `undefined` ginge im JSON verloren
      this.dirty.clear();
      this.send({ t: 'char', d });
    }
    if (this.buffsDirty) {
      this.buffsDirty = false;
      const now = this.zone.game.now;
      this.send({ t: 'buffs', b: this.buffs.map(b => ({ id: b.id, name: b.name, glyph: b.glyph, dur: Math.max(0, b.until - now), icon: b.icon, desc: b.desc, mods: b.mods })) });
    }
  }
  toast(s: string, kind: 'info' | 'good' | 'bad' | 'loot' | 'quest' | 'story' = 'info', icon?: string) { this.send({ t: 'toast', s, kind, icon }); }

  flags(now: number): number {
    let f = 0;
    for (const [id, st] of this.statuses) if (st.until > now) f |= STATUS_BIT[id];
    if (this.buffs.length) f |= FLAG_BUFF;
    if (this.buffs.some(b => b.shield > 0)) f |= FLAG_SHIELD;
    if (now < this.rollUntil) f |= FLAG_ROLL;
    if (this.dead) f |= FLAG_DEAD;
    if (now < this.iframesUntil || this.linkdead) f |= FLAG_INVULN;
    return f;
  }
  currentAnim(now: number): Anim {
    if (this.dead) return Anim.Dead;
    if (now < this.rollUntil) return Anim.Roll;
    if (now < this.animUntil) return this.anim;
    return this.moving && now - this.lastMoveMsg < 0.25 ? Anim.Move : Anim.Idle;
  }
  setAnim(a: Anim, dur: number) { this.anim = a; this.animUntil = this.zone.game.now + dur; }
  hasStatus(id: StatusId, now: number) { const s = this.statuses.get(id); return !!s && s.until > now; }
  stunned(now: number) { return this.hasStatus('stun', now) || this.hasStatus('freeze', now); }
  speed(now: number): number {
    let s = this.stats.speed;
    if (this.hasStatus('root', now)) return 0;
    const sl = this.statuses.get('slow');
    if (sl && sl.until > now) s *= CFG.combat.slowFactor;
    if (now < this.rollUntil + 0.12) s *= CFG.player.dodgeSpeedMul;
    return s;
  }

  // ------------------------------------------------------------ Inventar
  addItem(it: ItemInstance): boolean {
    const b = ITEMS[it.base];
    if (!b) return false;
    if (b.stack) {
      const ex = this.char.inv.find(i => i.base === it.base);
      if (ex) { ex.qty = (ex.qty ?? 1) + (it.qty ?? 1); this.sync('inv'); return true; }
    }
    if (this.char.inv.length >= CFG.player.invSize) return false;
    this.char.inv.push(it);
    this.sync('inv');
    return true;
  }
  countItem(base: string): number { let n = 0; for (const it of this.char.inv) if (it.base === base) n += it.qty ?? 1; return n; }
  removeItems(base: string, n: number): boolean {
    if (this.countItem(base) < n) return false;
    for (let i = this.char.inv.length - 1; i >= 0 && n > 0; i--) {
      const it = this.char.inv[i];
      if (it.base !== base) continue;
      const q = it.qty ?? 1;
      if (q > n) { it.qty = q - n; n = 0; } else { n -= q; this.char.inv.splice(i, 1); }
    }
    this.sync('inv');
    return true;
  }
  /** Gibt einen Gegenstand; bei vollem Inventar landet er als Beute am Boden. */
  give(it: ItemInstance, announce = true) {
    if (this.addItem(it)) { if (announce) this.send({ t: 'loot', item: it }); }
    else { this.zone.dropItemFor(this, it, this.x, this.y); this.toast('Inventar voll – Beute liegt am Boden.', 'bad'); }
    this.checkCollectQuests();
  }

  gainGold(n: number) { this.char.gold += Math.max(0, Math.round(n)); this.sync('gold'); }
  gainXp(n: number) {
    const c = this.char;
    if (c.level >= CFG.player.maxLevel) { this.gainQuellXp(Math.max(1, Math.round(n * (1 + this.stats.xpPct / 100)))); return; }
    c.xp += Math.max(1, Math.round(n * (1 + this.stats.xpPct / 100)));
    let leveled = false;
    while (c.level < CFG.player.maxLevel && c.xp >= CFG.xpToNext(c.level)) {
      c.xp -= CFG.xpToNext(c.level);
      c.level++;
      c.attrPoints += CFG.player.attrPointsPerLevel;
      c.skillPoints += CFG.player.skillPointsPerLevel;
      leveled = true;
    }
    if (leveled) {
      this.recalc();
      this.hp = this.stats.maxHp; this.mp = this.stats.maxMp;
      this.zone.ev({ k: 'fx', n: 'levelup', x: this.x, y: this.y });
      this.zone.ev({ k: 'txt', x: this.x, y: this.y - 26, s: `Stufe ${c.level}!`, col: '#ffe27a' });
      this.toast(`Stufe ${c.level} erreicht! +${CFG.player.attrPointsPerLevel} Attributspunkte, +1 Fähigkeitspunkt`, 'good');
      if (c.level >= CFG.player.maxLevel) this.toast('Höchststufe erreicht. Erfahrung verfällt nicht: Sie füllt ab jetzt Quellstufen.', 'story');
      this.zone.game.broadcastPlayerInfo(this);
      this.sync('level', 'attrPoints', 'skillPoints');
    }
    this.sync('xp');
  }
  /** 0.5: Erfahrung über die Höchststufe hinaus füllt Quellstufen – jede gibt einen Quellpunkt (verteilen: server/src/endgame.ts). */
  gainQuellXp(n: number) {
    const q = (this.char.quell ??= { lvl: 0, xp: 0, pts: {} });
    if (q.lvl >= QUELL_MAX) return;
    q.xp += n;
    let up = 0;
    while (q.lvl < QUELL_MAX && q.xp >= CFG.quell.xpToNext(q.lvl)) { q.xp -= CFG.quell.xpToNext(q.lvl); q.lvl++; up++; }
    if (q.lvl >= QUELL_MAX) q.xp = 0;
    if (up) {
      this.zone.ev({ k: 'fx', n: 'levelup', x: this.x, y: this.y });
      this.zone.ev({ k: 'txt', x: this.x, y: this.y - 26, s: `Quellstufe ${q.lvl}!`, col: '#8fdcff' });
      this.toast(`Quellstufe ${q.lvl} erreicht! +${up} Quellpunkt${up > 1 ? 'e' : ''}`, 'good');
    }
    this.sync('quell');
  }
  heal(n: number, show = true) {
    if (this.dead || n <= 0) return;
    n *= this.zone.mod.heal; // 0.5: Riss-Modifikator „Versiegt“
    const before = this.hp;
    this.hp = Math.min(this.stats.maxHp, this.hp + n);
    const got = Math.round(this.hp - before);
    if (show && got > 0) this.zone.ev({ k: 'heal', id: this.id, a: got, x: this.x, y: this.y });
  }
  addBuff(b: Buff) {
    this.buffs = this.buffs.filter(x => x.id !== b.id);
    this.buffs.push(b);
    this.buffsDirty = true;
    this.recalc();
  }

  // ------------------------------------------------------------ Quests
  questEvent(ev: { t: 'kill'; mob: string; zone: string } | { t: 'boss'; boss: string; party: number } | { t: 'talk'; npc: string }) {
    let changed = false;
    for (const id in this.char.quests) {
      const st = this.char.quests[id];
      if (st.s !== 'active') continue;
      const q = QUESTS[id];
      if (!q) continue;
      q.objectives.forEach((o, i) => {
        const target = objectiveTarget(o);
        if ((st.p[i] ?? 0) >= target) return;
        let hit = false;
        if (ev.t === 'kill') hit = (o.t === 'kill' && o.mob === ev.mob) || (o.t === 'killzone' && o.zone === ev.zone);
        else if (ev.t === 'boss') hit = (o.t === 'boss' && o.boss === ev.boss) || (o.t === 'bossparty' && ev.party >= 2);
        else if (ev.t === 'talk') hit = o.t === 'talk' && o.npc === ev.npc;
        if (!hit) return;
        st.p[i] = (st.p[i] ?? 0) + 1;
        changed = true;
        this.announceProgress(q.id, i);
      });
    }
    if (changed) this.sync('quests');
  }
  private lastCollect = new Map<string, number>();
  checkCollectQuests() {
    for (const id in this.char.quests) {
      if (this.char.quests[id].s !== 'active') continue;
      const q = QUESTS[id];
      q?.objectives.forEach((o, i) => {
        if (!DERIVED_OBJECTIVES.has(o.t)) return;
        const key = id + ':' + i, v = objectiveProgress(this.char, q, i);
        if (v !== (this.lastCollect.get(key) ?? 0)) { if (v > (this.lastCollect.get(key) ?? 0)) this.announceProgress(id, i); this.lastCollect.set(key, v); }
      });
    }
  }
  private announceProgress(qid: string, i: number) {
    const q = QUESTS[qid], o = q.objectives[i];
    const v = objectiveProgress(this.char, q, i), n = objectiveTarget(o);
    if (questComplete(this.char, q)) this.toast(`„${q.name}“ – Ziele erfüllt!`, 'quest');
    else this.toast(`${o.label}: ${v}/${n}`, 'quest');
    this.pev.push({ k: 'sfx', n: 'quest_progress' });
  }
  /** Braucht der Spieler diesen Quest-Gegenstand gerade? */
  needsQuestItem(base: string): boolean {
    for (const id in this.char.quests) {
      if (this.char.quests[id].s !== 'active') continue;
      for (const o of QUESTS[id]?.objectives ?? []) if (o.t === 'collect' && o.item === base && this.countItem(base) < o.n) return true;
    }
    return false;
  }

  snapshotChar(): CharData {
    const c = this.char;
    const home = this.zone.home; // Riss-Instanzen lassen sich nicht wieder betreten: gespeichert wird der Platz am Riss-Stein
    c.zone = home ? home.zone : this.zone.id; c.x = Math.round(home ? home.x : this.x); c.y = Math.round(home ? home.y : this.y);
    c.hp = Math.max(1, Math.round(this.hp)); c.mp = Math.round(this.mp);
    // laufende Speise / laufendes Elixier mit Restdauer sichern
    const now = this.zone.game.now, timed: Record<string, [string, number]> = {};
    for (const b of this.buffs) if (b.item && b.until - now > 1) timed[b.id] = [b.item, Math.round(b.until - now)];
    if (Object.keys(timed).length) c.timed = timed; else delete c.timed;
    return c;
  }
}
export { QUEST_LIST };
