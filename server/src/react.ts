/**
 * Kampf-Erweiterungen der Version 0.4: Reaktionen zweier Elemente und die Sonderwirkungen der Legendären Waffen.
 * zone.ts ruft diese Funktionen an wenigen Stellen auf; die Zahlen stehen in CFG.elements / CFG.legend,
 * die Reaktionstabelle in shared/src/elements.ts.
 */
import { CFG } from '../../shared/src/config';
import { reactionOf, type ReactionDef } from '../../shared/src/elements';
import type { Element } from '../../shared/src/types';
import type { Player } from './player';
import type { Mob, Zone } from './zone';

/** Setzt einen Schaden-über-Zeit-Zustand mit festem Schaden je Sekunde (stärkerer Wert gewinnt). */
function setDot(m: Mob, id: 'burn' | 'poison', dps: number, dur: number, now: number) {
  const old = m.statuses.get(id);
  m.statuses.set(id, { until: Math.max(old?.until ?? 0, now + dur), dps: Math.max(old && old.until > now ? old.dps : 0, dps), el: old?.el, by: old?.by });
}

/**
 * Prüft nach einem Elementartreffer, ob das Ziel einen Zustand eines anderen Elements trägt, mit dem es reagiert.
 * Der Zustand bleibt bestehen, verliert aber seine Element-Prägung; danach ist das Ziel kurz gegen Reaktionen gefeit.
 */
export function tryReaction(z: Zone, m: Mob, src: Player, el: Element) {
  const now = z.game.now;
  if (el === 'phys' || now < m.reactAt) return;
  for (const st of m.statuses.values()) {
    if (st.until <= now || !st.el || st.el === el) continue;
    const r = reactionOf(st.el, el);
    if (!r) continue;
    const other = st.by;
    st.el = undefined; st.by = undefined;
    react(z, m, src, other, r, el, now);
    return;
  }
}

function react(z: Zone, m: Mob, src: Player, other: Player | undefined, r: ReactionDef, trigEl: Element, now: number) {
  const E = CFG.elements, LG = CFG.legend.magier;
  const mage = src.stats.legend === 'magier';
  // Synergie: Die beiden Elemente stammen von verschiedenen Spielern
  const duo = !!other && other !== src && !other.dead && z.players.has(other.id);
  m.reactAt = now + (m.boss ? E.reactCdBoss : E.reactCd) - (mage ? LG.reactCdCut : 0);
  const k = (duo ? E.duoMul : 1) * (mage ? LG.reactMul : 1);
  const el = r.el === 'trigger' ? trigEl : r.el;
  const base = src.stats.power * k;
  const x = m.x, y = m.y;
  const targets = r.radius ? [...z.mobs.values()].filter(o => o === m || (!o.dead && !o.hidden && !o.invuln && Math.hypot(o.x - x, o.y - y) - o.radius <= r.radius!)) : [m];
  z.ev({ k: 'txt', x: Math.round(x), y: Math.round(y - m.radius - 20), s: duo ? `${r.name} ×2!` : `${r.name}!`, col: r.color });
  z.ev({ k: 'fx', n: 'explosion', x: Math.round(x), y: Math.round(y), r: r.radius ?? 26, el });
  z.ev({ k: 'sfx', n: r.sfx, x: Math.round(x), y: Math.round(y) });
  for (const t of targets) {
    if (r.mult > 0) z.hitMob(t, src, base * r.mult, el, { extra: true });
    if (t.dead) continue;
    if (r.dot) setDot(t, r.dot.id, (base * r.dot.total) / r.dot.dur, r.dot.dur, now);
    const st = t.boss && r.boss ? r.boss : r.status;
    if (st) z.applyStatusMob(t, { id: st.id, dur: st.dur * (duo ? 1.25 : 1) }, 0);
  }
  if (r.heal) for (const q of z.players.values()) {
    if (q.dead || Math.hypot(q.x - x, q.y - y) > r.heal.radius) continue;
    const amount = (q.stats.maxHp * r.heal.hpPct + src.stats.power * r.heal.mult) * k * (1 + src.stats.healPct / 100);
    q.heal(amount);
    legendShield(z, src, q, amount);
  }
  if (duo) for (const q of [src, other!]) {
    q.addBuff({ id: 'einklang', name: 'Einklang', glyph: 'p_element', until: now + E.duoBuff.dur, mods: { powerPct: E.duoBuff.powerPct }, shield: 0, desc: `+${E.duoBuff.powerPct} % Angriff – ihr habt gemeinsam „${r.name}“ ausgelöst.` });
    z.ev({ k: 'fx', n: 'buff', x: Math.round(q.x), y: Math.round(q.y), el });
  }
}

/** Legendäre Wirkungen, die an einem Treffer hängen: Echosehne (Waldläufer) und Zwielichtfänge (Schattenjäger). */
export function legendOnHit(z: Zone, m: Mob, src: Player, el: Element, raw: number, crit: boolean) {
  const lg = src.stats.legend;
  if (!lg) return;
  const now = z.game.now;
  if (lg === 'waldlaeufer' && crit) {
    const C = CFG.legend.waldlaeufer;
    let best: Mob | null = null, bd = C.range;
    for (const t of z.mobs.values()) {
      if (t === m || t.dead || t.hidden || t.invuln) continue;
      const d = Math.hypot(t.x - m.x, t.y - m.y);
      if (d < bd) { bd = d; best = t; }
    }
    const t = best ?? (m.dead ? null : m);
    if (!t) return;
    if (best) z.ev({ k: 'fx', n: 'beam', x: Math.round(m.x), y: Math.round(m.y - 6), ang: Math.atan2(t.y - m.y, t.x - m.x), d: Math.round(bd), el: el === 'phys' ? 'wind' : el });
    z.hitMob(t, src, raw * src.stats.critDmg * (best ? C.ricochet : C.echo), el, { extra: true });
  } else if (lg === 'schattenjaeger' && !m.dead && m.has('mark', now) && now >= m.detAt) {
    const C = CFG.legend.schattenjaeger;
    m.detAt = now + C.cd;
    // Das Mal detoniert im Element der Waffe; ohne eingeschmiedetes Element als Dunkelheit
    const del: Element = src.stats.attackElement === 'phys' ? 'dark' : src.stats.attackElement;
    z.ev({ k: 'fx', n: 'explosion', x: Math.round(m.x), y: Math.round(m.y), r: C.radius, el: del });
    z.ev({ k: 'sfx', n: 'cast_dark', x: Math.round(m.x), y: Math.round(m.y) });
    const x = m.x, y = m.y;
    for (const t of [...z.mobs.values()]) if (!t.dead && Math.hypot(t.x - x, t.y - y) - t.radius <= C.radius) z.hitMob(t, src, src.stats.power * C.mult, del, { extra: true });
  }
}

/** Sechsklang (Krieger): jeder n-te Treffer der Standardangriffe entfesselt eine Schockwelle um den Spieler. */
export function legendAttack(z: Zone, p: Player, el: Element) {
  if (p.stats.legend !== 'krieger') return;
  const C = CFG.legend.krieger;
  if (++p.legendHits % C.every !== 0) return;
  z.ev({ k: 'fx', n: 'spin', x: Math.round(p.x), y: Math.round(p.y), r: C.radius, el });
  z.ev({ k: 'sfx', n: 'explosion', x: Math.round(p.x), y: Math.round(p.y) });
  for (const m of [...z.mobs.values()]) if (!m.dead && Math.hypot(m.x - p.x, m.y - p.y) - m.radius <= C.radius)
    z.hitMob(m, p, p.stats.power * C.mult, el, { extra: true, kb: 40, ang: Math.atan2(m.y - p.y, m.x - p.x) });
}

/** Morgenwacht (Paladin): Heilungen legen einen Schild auf den Geheilten. */
export function legendShield(z: Zone, src: Player, q: Player, healed: number) {
  if (src.stats.legend !== 'paladin' || healed <= 0 || q.dead) return;
  const C = CFG.legend.paladin;
  const cur = q.buffs.find(b => b.id === 'morgenwacht');
  const shield = Math.min(Math.round(q.stats.maxHp * C.cap), Math.round((cur?.shield ?? 0) + healed * C.shield));
  q.addBuff({ id: 'morgenwacht', name: 'Morgenwacht', glyph: 'shield', until: z.game.now + C.dur, mods: {}, shield, desc: 'Ein Schild aus Licht fängt Schaden ab.' });
}
