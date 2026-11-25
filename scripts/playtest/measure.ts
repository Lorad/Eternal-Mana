/**
 * Messreihen des Spieltests: Bosse, Gebiete, Tempo. Jede Funktion liefert Zahlen (für Tabellen und für tests/balance.test.ts).
 */
import { CFG } from '../../shared/src/config';
import { CLASS_IDS } from '../../shared/src/data/classes';
import { BOSSES, ENEMIES } from '../../shared/src/data/enemies';
import { QUEST_LIST } from '../../shared/src/data/quests';
import { ZONES } from '../../shared/src/data/zones';
import { getMap } from '../../shared/src/maps/mapgen';
import type { CharData, ClassId } from '../../shared/src/types';
import { plausibleChar, type CharOpt } from './chars';
import { farm, type FarmResult, type FightResult, type Lab } from './lab';
import { SKILL, type Skill } from './model';

// ---------------------------------------------------------------------------------------------------------------------
// Die Reise: wo steht ein Spieler an welcher Stelle? (Stufe = Ergebnis der Tempo-Rechnung unten, hier als feste Stützpunkte)
// ---------------------------------------------------------------------------------------------------------------------
export interface BossStop { boss: string; zone: string; region: string; level: number }
/** Bosse der Geschichte mit der Stufe, auf der ein Spieler sie bei „Nebenaufgaben größtenteils erledigt“ antrifft (siehe `pacing`). */
export const BOSS_STOPS: BossStop[] = [
  { boss: 'dornenmutter', zone: 'wurzelgruft', region: 'gruenwald', level: 6 },
  { boss: 'kristallkoloss', zone: 'geode', region: 'kristall', level: 11 },
  { boss: 'ignarok', zone: 'aschenschmiede', region: 'glut', level: 16 },
  { boss: 'ysolde', zone: 'gletscherdom', region: 'frost', level: 21 },
  { boss: 'archivar', zone: 'archiv', region: 'ruinen', level: 26 },
  { boss: 'hohlkoenig', zone: 'thron', region: 'schatten', level: 31 },
  { boss: 'vael', zone: 'wacht', region: 'schatten', level: 37 },
  { boss: 'aetherion', zone: 'herz', region: 'quellgrund', level: 40 },
];

export interface BossRow {
  boss: string; cls: string; skill: string; n: number; party: number;
  win: number; time: number; potions: number; taken: number; deaths: number;
  /** Rest-Leben des Bosses bei Niederlagen · Zeit bis zur Niederlage */
  left: number; loseTime: number; timeouts: number;
  top: [string, number][];
}
function agg(boss: string, cls: string, skill: Skill, party: number, rs: FightResult[]): BossRow {
  const n = rs.length, w = rs.filter(r => r.win), l = rs.filter(r => !r.win);
  const by = new Map<string, number>();
  for (const r of rs) for (const [k, v] of r.by) by.set(k, (by.get(k) ?? 0) + v / n);
  const avg = (a: FightResult[], f: (r: FightResult) => number) => (a.length ? a.reduce((s, r) => s + f(r), 0) / a.length : 0);
  return {
    boss, cls, skill: skill.id, n, party, win: w.length / n, time: avg(w, r => r.time), potions: avg(rs, r => r.potions), taken: avg(rs, r => r.taken), deaths: avg(rs, r => r.deaths),
    left: avg(l, r => r.bossLeft), loseTime: avg(l, r => r.time), timeouts: rs.filter(r => r.timeout).length,
    top: [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => [k, Math.round(v)]),
  };
}

/** Ein Boss, eine Klasse (oder Gruppe), ein Spielertyp: `n` Kämpfe mit verschiedenen Zufallszahlen und Ausrüstungswürfen. */
export function measureBoss(lab: Lab, stop: BossStop, party: ClassId[], skill: Skill, n: number, o: CharOpt & { level?: number; prep?: (c: CharData) => void; maxSec?: number } = {}): BossRow {
  const rs: FightResult[] = [];
  for (let s = 1; s <= n; s++) {
    const chars = party.map((cls, i) => { const c = plausibleChar(cls, o.level ?? stop.level, { ...o, seed: s * 10 + i }); o.prep?.(c); return c; });
    rs.push(lab.bossFight(stop.zone, chars, skill, s * 101 + 7, o.maxSec ?? 420));
  }
  return agg(stop.boss, party.join('+'), skill, party.length, rs);
}

// ---------------------------------------------------------------------------------------------------------------------
// Gebiete
// ---------------------------------------------------------------------------------------------------------------------
export interface ZoneRow {
  zone: string; cls: string; skill: string; level: number;
  ttk: number; ttkElite: number; taken: number; deathsH: number; potionsH: number; xpH: number; goldH: number; lootH: number; killsH: number;
  fightShare: number; raw: FarmResult[];
}
/** mittlere Gegnerstufe einer Zone (dort steht der Spieler, wenn er sie durchspielt) */
export function zoneLevel(zoneId: string): number { const m = getMap(zoneId); return Math.round(m.spawns.reduce((a, s) => a + s.lvl, 0) / Math.max(1, m.spawns.length)); }

export function measureZone(lab: Lab, zoneId: string, cls: ClassId, skill: Skill, seeds: number, packs: number, o: CharOpt & { level?: number; prep?: (c: CharData) => void } = {}): ZoneRow {
  const level = o.level ?? zoneLevel(zoneId);
  const raw: FarmResult[] = [];
  for (let s = 1; s <= seeds; s++) { const c = plausibleChar(cls, level, { ...o, seed: s, potions: [30, 20] }); o.prep?.(c); raw.push(farm(lab, zoneId, c, skill, s * 53 + 11, packs)); }
  const sum = (f: (r: FarmResult) => number) => raw.reduce((a, r) => a + f(r), 0);
  const sec = sum(r => r.fightSec + r.travelSec), h = sec / 3600, kills = sum(r => r.kills), el = sum(r => r.elites);
  return {
    zone: zoneId, cls, skill: skill.id, level,
    ttk: sum(r => r.ttk * (r.kills - r.elites)) / Math.max(1, kills - el), ttkElite: el ? sum(r => r.ttkElite * r.elites) / el : 0,
    taken: sum(r => r.takenPerPack * r.packs) / Math.max(1, sum(r => r.packs)),
    deathsH: sum(r => r.deaths) / h, potionsH: sum(r => r.potions) / h, xpH: sum(r => r.xp) / h, goldH: sum(r => r.gold) / h, lootH: sum(r => r.lootValue) / h, killsH: kills / h,
    fightShare: sum(r => r.fightSec) / sec, raw,
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Tempo: Erfahrung über die Reise (gerechnet aus Questtabellen, Karten und den gemessenen Kampfzeiten)
// ---------------------------------------------------------------------------------------------------------------------
export interface Chapter { id: string; name: string; region: string; dungeon: string; boss: string; main: string[]; side: string[]; repeat?: string }
/** Kapitel der Geschichte: welche Quests in welchem Gebiet anfallen */
export const CHAPTERS: Chapter[] = [
  { id: '1', name: 'Grünwald', region: 'gruenwald', dungeon: 'wurzelgruft', boss: 'dornenmutter', main: ['m_erwachen', 'm_borin', 'm_wurzel'], side: ['s_tobi', 's_pilze', 's_woelfe', 's_splitter1', 'c_tobi_1', 'c_tobi_2'], repeat: 'r_gruenwald' },
  { id: '2', name: 'Kristallhöhlen', region: 'kristall', dungeon: 'geode', boss: 'kristallkoloss', main: ['m_hedda', 'm_kristalle', 'm_koloss'], side: ['s_fluegel', 's_wisp', 'x_karl'], repeat: 'r_kristall' },
  { id: '3', name: 'Glutlande', region: 'glut', dungeon: 'aschenschmiede', boss: 'ignarok', main: ['m_rakhan', 'm_kerne', 'm_glut'], side: ['s_imps', 's_glutstein', 's_splitter2'], repeat: 'r_glut' },
  { id: '4', name: 'Frostgebirge', region: 'frost', dungeon: 'gletscherdom', boss: 'ysolde', main: ['m_jorund', 'm_wichte', 'm_ysolde'], side: ['s_pelz', 's_brute'], repeat: 'r_frost' },
  { id: '5', name: 'Verlorene Ruinen', region: 'ruinen', dungeon: 'archiv', boss: 'archivar', main: ['m_liora', 'm_tafeln', 'm_archivar'], side: ['s_geister', 's_augen'], repeat: 'r_ruinen' },
  { id: '6', name: 'Schattenreich', region: 'schatten', dungeon: 'thron', boss: 'hohlkoenig', main: ['m_maelis', 'm_schatten', 'm_koenig'], side: ['s_ritter', 's_essenz', 's_splitter3'], repeat: 'r_schatten' },
  { id: '7–9', name: 'Akt II bis Vael', region: 'schatten', dungeon: 'wacht', boss: 'vael', main: ['m_ueberlauf', 'm_fremder', 'm_brunnenhueterin', 'm_name', 'm_sitze', 'm_leerer_sitz', 'm_traum', 'm_spur', 'm_pruefung'],
    side: ['h_erde', 'h_licht', 'h_feuer', 'h_wasser', 'h_wind', 'h_herz', 'c_mirelda_1', 'c_mirelda_2', 'c_borin_1', 'c_borin_2', 'c_hedda_1', 'c_hedda_2', 'c_jorund_1', 'c_sen_1', 'c_ayla_1'] },
  { id: '10', name: 'Quellgrund und Herz', region: 'quellgrund', dungeon: 'herz', boss: 'aetherion', main: ['m_abstieg', 'm_tor', 'm_albtraum', 'm_entscheidung', 'm_epilog'], side: ['c_fenwick_1', 'c_fenwick_2', 'c_rakhan_1', 'c_rakhan_2', 'c_liora_1', 'c_liora_2', 'c_jorund_2', 'c_sen_2', 'c_ayla_2', 'c_borin_3'] },
];
export interface PaceRow { ch: string; name: string; enter: number; atBoss: number; bossLevel: number; zone: [number, number]; leave: number; xpQuests: number; xpKills: number; xpBoss: number; gold: number; kills: number }

const Q = Object.fromEntries(QUEST_LIST.map(q => [q.id, q]));
/** mittlere Erfahrung eines Gegners der Zone (Mischung der Karte, Erwachte eingerechnet) auf Spielerstufe `plvl` */
function zoneXp(zoneId: string, plvl: number): number {
  const m = getMap(zoneId);
  let x = 0;
  for (const s of m.spawns) x += CFG.enemy.xp(s.lvl) * ENEMIES[s.mob].xpMul * CFG.enemy.xpLevelPenalty(plvl, s.lvl);
  return (x / Math.max(1, m.spawns.length)) * (1 + CFG.enemy.eliteChance * 2);
}
function zoneGold(zoneId: string): number {
  const m = getMap(zoneId);
  let g = 0;
  for (const s of m.spawns) g += CFG.enemy.gold(s.lvl) * 0.5;
  return (g / Math.max(1, m.spawns.length)) * (1 + CFG.enemy.eliteChance * 7);
}
/**
 * Rechnet die Stufe entlang der Geschichte. `side` = Anteil der Nebenaufgaben (0..1), `kills` = besiegte Gegner je Oberwelt-Gebiet
 * (ein Spieler, der Nebenaufgaben macht, kommt an rund 60 vorbei; wer nur der Hauptlinie folgt, an rund 35).
 */
export function pacing(side: number, kills: number): PaceRow[] {
  let level = 1, xp = 0;
  const gain = (n: number) => { xp += n; while (level < CFG.player.maxLevel && xp >= CFG.xpToNext(level)) { xp -= CFG.xpToNext(level); level++; } };
  const out: PaceRow[] = [];
  for (const ch of CHAPTERS) {
    const row: PaceRow = { ch: ch.id, name: ch.name, enter: level, atBoss: 0, bossLevel: BOSSES[ch.boss].level, zone: ZONES[ch.region].level, leave: 0, xpQuests: 0, xpKills: 0, xpBoss: 0, gold: 0, kills: 0 };
    const bi = ch.main.findIndex(id => Q[id].objectives.some(o => o.t === 'boss'));
    const quests = [...ch.main.slice(0, bi), ...ch.side.slice(0, Math.round(ch.side.length * side))];
    // Oberwelt: Gegner und Aufgaben abwechselnd (Aufgaben in vier Portionen)
    const ow = ch.id === '7–9' ? Math.round(kills * 0.5) : kills;
    for (let part = 0; part < 4; part++) {
      for (let k = 0; k < ow / 4; k++) { const x = zoneXp(ch.region, level); gain(x); row.xpKills += x; row.gold += zoneGold(ch.region); row.kills++; }
      for (const id of quests.filter((_, i) => i % 4 === part)) { const q = Q[id]; if (!q) continue; gain(q.rewards.xp); row.xpQuests += q.rewards.xp; row.gold += q.rewards.gold; }
    }
    if (ch.repeat && side >= 0.5) { const q = Q[ch.repeat]; gain(q.rewards.xp); row.xpQuests += q.rewards.xp; row.gold += q.rewards.gold; }
    // Dungeon: alle Gegner auf dem Weg
    const dm = getMap(ch.dungeon);
    for (let k = 0; k < dm.spawns.length; k++) { const x = zoneXp(ch.dungeon, level); gain(x); row.xpKills += x; row.gold += zoneGold(ch.dungeon); row.kills++; }
    row.atBoss = level;
    const b = BOSSES[ch.boss];
    gain(b.xp); row.xpBoss = b.xp; row.gold += b.gold;
    // die Boss-Aufgabe wird nach dem Sieg abgegeben; in Kapitel 10 folgen noch Entscheidung und Epilog
    for (const id of ch.main.slice(bi)) { const q = Q[id]; gain(q.rewards.xp); row.xpQuests += q.rewards.xp; row.gold += q.rewards.gold; }
    row.leave = level;
    out.push(row);
  }
  return out;
}

export { CLASS_IDS, SKILL };
