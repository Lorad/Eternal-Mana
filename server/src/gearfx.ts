/**
 * Ausrüstung im Kampf (0.9): die Passiven der Stufe +10 (shared/src/data/upgrade.ts, UP10), die Wirkungen voller Sets und die
 * Fähigkeits-Modifikatoren der 4er-Boni (shared/src/data/sets.ts). Zahlen: CFG.gearFx. Was nur Werte ändert (Beine, Schuhe),
 * rechnet stats.ts; hier steht alles, was im Kampf passiert. zone.ts ruft diese Funktionen an wenigen Stellen auf.
 */
import { CFG } from '../../shared/src/config';
import type { Element, StatusSpec } from '../../shared/src/types';
import type { Player } from './player';
import type { Mob, Zone } from './zone';

const G = CFG.gearFx;
const up10 = (p: Player, id: string) => p.stats.gearFx?.up10[id] ?? 0;
const full = (p: Player, id: string) => !!p.stats.gearFx?.setFull[id];

/** Laufender Zustand je Spieler (nicht gespeichert) */
export interface GearState { hits: number; casts: number; atemAt: number; rindeAt: number; frostAt: number; stilleUntil: number }
export const newGearState = (): GearState => ({ hits: 0, casts: 0, atemAt: -999, rindeAt: 0, frostAt: -999, stilleUntil: 0 });

/** Welle um den Spieler (Folgetreffer: nie kritisch, keine weiteren Folgen) */
function nova(z: Zone, p: Player, x: number, y: number, r: number, mult: number, el: Element, status?: StatusSpec) {
  z.ev({ k: 'fx', n: 'spin', x: Math.round(x), y: Math.round(y), r, el });
  for (const m of [...z.mobs.values()]) if (!m.dead && Math.hypot(m.x - x, m.y - y) - m.radius <= r)
    z.hitMob(m, p, p.stats.power * mult, el, { extra: true, status, kb: 30, ang: Math.atan2(m.y - y, m.x - x) });
}

// ------------------------------------------------------------------ Angriffe und Fähigkeiten
/** Standardangriff: Faktor auf den Schaden (Meisterschliff, Hauptwaffe +10) */
export function attackMul(p: Player): number {
  if (!up10(p, 'meister')) return 1;
  return ++p.gear.hits % G.meister.every === 0 ? G.meister.mult : 1;
}
/** Abklingzeit des Standardangriffs (Flinke Hände, Handschuhe +10) */
export function attackCdMul(p: Player): number { return up10(p, 'flink') ? G.flink : 1; }
/** 4er-Set-Bonus der Klasse: [Schadensfaktor, Abklingzeitfaktor] für diese Fähigkeit */
export function skillMul(p: Player, skill: string): [number, number] {
  const m = p.stats.gearFx?.skill[skill];
  return m ? [1 + m.dmg / 100, Math.max(0.3, 1 - m.cd / 100)] : [1, 1];
}
/** Nach dem Wirken einer Fähigkeit: Lichtbrechung (Prismenglanz, volles Set) */
export function afterSkill(z: Zone, p: Player) {
  if (!full(p, 'prisma')) return;
  if (++p.gear.casts % G.prisma.every === 0) nova(z, p, p.x, p.y, G.prisma.radius, G.prisma.mult, 'light');
}

// ------------------------------------------------------------------ Treffer gegen Gegner
/** Mehrschaden des Angreifers: Hohle Krone (unter 40 % Leben) */
export function dealtMul(p: Player): number {
  return full(p, 'krone') && p.hp < p.stats.maxHp * G.krone.below ? G.krone.dmg : 1;
}
/** Zusätzliche Krit-Chance und Krit-Schaden: Stille vor dem Sturm (nach einer Ausweichrolle) – verbraucht sich beim Treffer */
export function critBonus(p: Player, now: number): { crit: number; critDmg: number } {
  if (!full(p, 'stille') || now > p.gear.stilleUntil) return { crit: 0, critDmg: 0 };
  p.gear.stilleUntil = 0;
  return { crit: 1, critDmg: G.stille.critDmg };
}
/** Lebensraub in % – Hohle Krone hebt ihn unter 40 % Leben an, die Obergrenze bleibt */
export function lifesteal(p: Player): number {
  let ls = p.stats.lifesteal;
  if (full(p, 'krone') && p.hp < p.stats.maxHp * G.krone.below) ls = Math.min(CFG.combat.lifestealCap, ls + G.krone.lifesteal);
  return ls;
}
/** Kritischer Treffer: Manafunke (Ring +10, je Ring) */
export function onCrit(p: Player) {
  const n = up10(p, 'funke');
  if (n) p.mp = Math.min(p.stats.maxMp, p.mp + G.funke * n);
}
/** Gegner besiegt: Aschenregen (Aschenglut, volles Set). Folgetreffer lösen keine weitere Explosion aus. */
export function onKill(z: Zone, p: Player, m: Mob) {
  if (full(p, 'asche')) nova(z, p, m.x, m.y, G.asche.radius, G.asche.mult, 'fire', { id: 'burn', dur: 3 });
}

// ------------------------------------------------------------------ Treffer gegen den Spieler
/** Faktor auf erlittenen Schaden: Parade (Zweithand +10) */
export function takenMul(z: Zone, p: Player): number {
  if (!up10(p, 'parade') || !z.rng.chance(G.parade.chance)) return 1;
  z.ev({ k: 'txt', x: p.x, y: p.y - 22, s: 'Pariert', col: '#d8e4ff' });
  return G.parade.mul;
}
/** Dauer schädlicher Zustände auf dem Spieler: Klarer Kopf (Helm +10) */
export function statusDurMul(p: Player): number { return up10(p, 'klarheit') ? G.klarheit : 1; }
/** Nach einem Treffer: Zweiter Atem (Brust +10) */
export function afterHurt(z: Zone, p: Player, now: number) {
  if (!up10(p, 'atem') || p.dead || p.hp <= 0 || p.hp >= p.stats.maxHp * G.atem.below || now < p.gear.atemAt) return;
  p.gear.atemAt = now + G.atem.cd;
  p.heal(p.stats.maxHp * G.atem.heal);
  z.ev({ k: 'fx', n: 'heal', x: Math.round(p.x), y: Math.round(p.y), el: 'light' });
}

// ------------------------------------------------------------------ Bewegung und Zeit
/** Ausweichrolle: Frostspur (Frostweberin) und Stille vor dem Sturm (Stille Schrift) */
export function onDodge(z: Zone, p: Player, now: number) {
  if (full(p, 'stille')) p.gear.stilleUntil = now + G.stille.window;
  if (full(p, 'frost') && now >= p.gear.frostAt) {
    p.gear.frostAt = now + G.frost.cd;
    nova(z, p, p.x, p.y, G.frost.radius, G.frost.mult, 'water', { id: 'slow', dur: 2 });
  }
}
/** Je Tick: Rindenhaut (Wurzelwacht, volles Set) */
export function tick(p: Player, now: number) {
  if (!full(p, 'rinde') || now < p.gear.rindeAt) return;
  p.gear.rindeAt = now + G.rinde.every;
  const shield = Math.round(p.stats.maxHp * G.rinde.shield);
  const cur = p.buffs.find(b => b.id === 'rinde');
  if (cur && cur.shield >= shield) { cur.until = now + G.rinde.every + 1; return; }
  p.addBuff({ id: 'rinde', name: 'Rindenhaut', glyph: 'shield', until: now + G.rinde.every + 1, mods: {}, shield, desc: 'Wurzelwacht: Eine Rinde fängt Schaden ab.' });
}
/** Heiltrank: Quellsegen (Amulett +10) */
export function potionMul(p: Player): number { return up10(p, 'segen') ? G.segen : 1; }
