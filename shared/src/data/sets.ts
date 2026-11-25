/**
 * Rüstungssets (0.4, seit 0.9 mit sechs Teilen). Ein Set besteht aus Helm („Kopfschutz“), Brust („Gewand“), Handschuhen,
 * Schuhen und zwei Schmuckstücken (Reif, Anhänger). Setteile sind gewöhnliche, zur Klasse passende Ausrüstungsteile mit
 * `set`-Kennung und eigenem Namen. Boni:
 *   2 Teile – schützend (Modifikatoren, stats.ts)
 *   4 Teile – verändert eine Fähigkeit der eigenen Klasse (mehr Schaden oder kürzere Abklingzeit, server/src/zone.ts)
 *   6 Teile – eine eigene Wirkung im Kampf (server/src/gearfx.ts; Zahlen in CFG.gearFx)
 * Teile aus der Zeit vor 0.9 (Kopfschutz, Gewand, Reif, Anhänger) bleiben Mitglieder ihres Sets.
 * Herkunft: Bosstruhe und Truhen des zugehörigen Dungeons, Mana-Risse; Kopf, Brust, Handschuhe und Schuhe lassen sich mit einem Bosskern schmieden.
 */
import { CFG } from '../config';
import type { CharData, ClassId, Element, ItemInstance, Mods } from '../types';
import { SLOTS } from '../types';
import { SKILLS } from './skills';

export type SetPiece = 'helm' | 'armor' | 'gloves' | 'boots' | 'ring' | 'amulet';
export const SET_PIECES: SetPiece[] = ['helm', 'armor', 'gloves', 'boots', 'ring', 'amulet'];
export const SET_PIECE_NAME: Record<SetPiece, string> = { helm: 'Kopfschutz', armor: 'Gewand', gloves: 'Handschutz', boots: 'Schritt', ring: 'Reif', amulet: 'Anhänger' };
/** Teile für ein volles Set */
export const SET_FULL = SET_PIECES.length;

/** 4er-Bonus: eine Fähigkeit der Klasse wird stärker (`dmg` = Mehrschaden in %) oder schneller bereit (`cd` = kürzere Abklingzeit in %) */
export interface SkillMod { skill: string; dmg?: number; cd?: number }
/** Wirkung des vollen Sets (Text mit Zahlen aus CFG.gearFx) */
export interface SetFull { id: string; name: string; text: string }

export interface SetDef {
  id: string;
  name: string;
  /** Genitiv für die Teilenamen: „Kopfschutz der Wurzelwacht“ */
  gen: string;
  element: Element;
  /** Materialstufe des Gebiets (1..6): bestimmt Erz und Monster-Rohstoff beim Schmieden */
  tier: number;
  ilvl: number;
  boss: string;
  /** Dungeon, in dessen Truhen Teile liegen können */
  dungeon: string;
  /** 2 Teile: schützend */
  bonus2: Mods;
  /** 4 Teile: kleiner Modifikator (kann leer sein) und die Fähigkeit je Klasse */
  bonus4: Mods;
  skill4: Record<ClassId, SkillMod>;
  /** alle Teile */
  full: SetFull;
}

const G = CFG.gearFx;
const pct = (x: number) => Math.round(x * 100) + ' %';
export const SET_LIST: SetDef[] = [
  { id: 'wurzelwacht', name: 'Wurzelwacht', gen: 'der Wurzelwacht', element: 'earth', tier: 1, ilvl: 7, boss: 'dornenmutter', dungeon: 'wurzelgruft',
    bonus2: { hpPct: 6, resEarth: 10 }, bonus4: {},
    skill4: { krieger: { skill: 'kr_erdspalter', dmg: 25 }, magier: { skill: 'ma_blinzeln', cd: 30 }, waldlaeufer: { skill: 'wl_falle', dmg: 30 }, paladin: { skill: 'pa_schild', cd: 25 }, schattenjaeger: { skill: 'sj_toxin', dmg: 25 } },
    full: { id: 'rinde', name: 'Rindenhaut', text: `Alle ${G.rinde.every} Sekunden legt sich eine Rinde um dich: ein Schild von ${pct(G.rinde.shield)} deines Lebens.` } },
  { id: 'prismenglanz', name: 'Prismenglanz', gen: 'des Prismenglanzes', element: 'light', tier: 2, ilvl: 12, boss: 'kristallkoloss', dungeon: 'geode',
    bonus2: { defPct: 6, resLight: 12 }, bonus4: {},
    skill4: { krieger: { skill: 'kr_schrei', cd: 25 }, magier: { skill: 'ma_lanze', dmg: 25 }, waldlaeufer: { skill: 'wl_hagel', dmg: 25 }, paladin: { skill: 'pa_lichtschlag', dmg: 30 }, schattenjaeger: { skill: 'sj_schritt', cd: 30 } },
    full: { id: 'prisma', name: 'Lichtbrechung', text: `Jede ${G.prisma.every}. Fähigkeit setzt um dich eine Lichtwelle frei (${pct(G.prisma.mult)} deines Angriffs als Lichtschaden).` } },
  { id: 'aschenglut', name: 'Aschenglut', gen: 'der Aschenglut', element: 'fire', tier: 3, ilvl: 17, boss: 'ignarok', dungeon: 'aschenschmiede',
    bonus2: { hpPct: 4, resFire: 15 }, bonus4: {},
    skill4: { krieger: { skill: 'kr_glut', dmg: 25 }, magier: { skill: 'ma_meteor', dmg: 20 }, waldlaeufer: { skill: 'wl_faecher', dmg: 30 }, paladin: { skill: 'pa_zorn', dmg: 20 }, schattenjaeger: { skill: 'sj_faecher', dmg: 30 } },
    full: { id: 'asche', name: 'Aschenregen', text: `Gegner, die du besiegst, zerfallen in Glut: ${pct(G.asche.mult)} deines Angriffs als Feuerschaden an alle in der Nähe.` } },
  { id: 'frostweberin', name: 'Frostweberin', gen: 'der Frostweberin', element: 'water', tier: 4, ilvl: 22, boss: 'ysolde', dungeon: 'gletscherdom',
    bonus2: { defPct: 8, resWater: 10 }, bonus4: {},
    skill4: { krieger: { skill: 'kr_wirbel', dmg: 30 }, magier: { skill: 'ma_eissturm', dmg: 25 }, waldlaeufer: { skill: 'wl_gift', dmg: 30 }, paladin: { skill: 'pa_heilung', cd: 25 }, schattenjaeger: { skill: 'sj_mal', cd: 25 } },
    full: { id: 'frost', name: 'Frostspur', text: `Deine Ausweichrolle hinterlässt eine Frostnova: ${pct(G.frost.mult)} deines Angriffs als Wasserschaden, Gegner werden verlangsamt (höchstens alle ${G.frost.cd} Sekunden).` } },
  { id: 'stilleschrift', name: 'Stille Schrift', gen: 'der Stillen Schrift', element: 'wind', tier: 5, ilvl: 27, boss: 'archivar', dungeon: 'archiv',
    bonus2: { defPct: 4, dodgeCdr: 8, resWind: 12 }, bonus4: {},
    skill4: { krieger: { skill: 'kr_sturm', cd: 30 }, magier: { skill: 'ma_feuerball', dmg: 30 }, waldlaeufer: { skill: 'wl_sprung', cd: 30 }, paladin: { skill: 'pa_hammer', dmg: 25 }, schattenjaeger: { skill: 'sj_tanz', dmg: 20 } },
    full: { id: 'stille', name: 'Stille vor dem Sturm', text: `Nach einer Ausweichrolle ist dein nächster Treffer innerhalb von ${G.stille.window} Sekunden sicher kritisch und trifft ${pct(G.stille.critDmg)} härter.` } },
  { id: 'hohlekrone', name: 'Hohle Krone', gen: 'der Hohlen Krone', element: 'dark', tier: 6, ilvl: 33, boss: 'hohlkoenig', dungeon: 'thron',
    bonus2: { defPct: 6, resDark: 15, hpRegen: 1 }, bonus4: {},
    skill4: { krieger: { skill: 'kr_wucht', dmg: 35 }, magier: { skill: 'ma_meteor', cd: 20 }, waldlaeufer: { skill: 'wl_sturmpfeil', dmg: 25 }, paladin: { skill: 'pa_weihe', dmg: 30 }, schattenjaeger: { skill: 'sj_meuchel', dmg: 35 } },
    full: { id: 'krone', name: 'Was die Krone nimmt', text: `Unter ${pct(G.krone.below)} Leben verursachst du ${pct(G.krone.dmg - 1)} mehr Schaden, und dein Lebensraub steigt um ${G.krone.lifesteal} Prozentpunkte (die Obergrenze gilt weiter).` } },
];
export const SETS: Record<string, SetDef> = Object.fromEntries(SET_LIST.map(s => [s.id, s]));
export const SET_BY_BOSS: Record<string, SetDef> = Object.fromEntries(SET_LIST.map(s => [s.boss, s]));
export const SET_BY_DUNGEON: Record<string, SetDef> = Object.fromEntries(SET_LIST.map(s => [s.dungeon, s]));

export function setPieceName(set: SetDef, piece: SetPiece): string { return `${SET_PIECE_NAME[piece]} ${set.gen}`; }

/** Welches Setteil ist dieses Stück? (nach dem Grundgegenstand: Helm, Brust, Handschuhe, Schuhe, Ring, Amulett/Talisman) */
export function setPieceOf(it: Pick<ItemInstance, 'base'>): SetPiece | null {
  const b = it.base;
  if (b.startsWith('h_')) return 'helm';
  if (b.startsWith('a_')) return 'armor';
  if (b.startsWith('gl_')) return 'gloves';
  if (b.startsWith('bt_')) return 'boots';
  if (b.startsWith('c_ring')) return 'ring';
  if (b.startsWith('c_amulet') || b.startsWith('c_charm')) return 'amulet';
  return null;
}

/** Angelegte Setteile je Set: welche Teile (zwei gleiche Teile, z. B. zwei Reife, zählen nur einmal). Liest auch alte Plätze. */
export function setPiecesWorn(c: Pick<CharData, 'equip'>): Record<string, Set<SetPiece>> {
  const seen: Record<string, Set<SetPiece>> = {};
  for (const s of [...SLOTS, 'acc1', 'acc2'] as const) {
    const it = c.equip[s];
    if (!it?.set || !SETS[it.set]) continue;
    const p = setPieceOf(it);
    if (p) (seen[it.set] ??= new Set()).add(p);
  }
  return seen;
}
/** Angelegte Teile je Set. Zwei gleiche Teile (z. B. zwei Reife) zählen nur einmal. */
export function setCounts(c: Pick<CharData, 'equip'>): Record<string, number> {
  const seen = setPiecesWorn(c), out: Record<string, number> = {};
  for (const id in seen) out[id] = seen[id].size;
  return out;
}
/** Aktive Setboni als Liste von Modifikatoren. */
export function setMods(counts: Record<string, number>): Mods[] {
  const out: Mods[] = [];
  for (const id in counts) {
    const s = SETS[id];
    if (!s) continue;
    if (counts[id] >= 2) out.push(s.bonus2);
    if (counts[id] >= 4) out.push(s.bonus4);
  }
  return out;
}
/** Fähigkeits-Modifikatoren der 4er-Boni für diese Klasse: Fähigkeit → Mehrschaden/kürzere Abklingzeit in % (mehrere Sets addieren sich) */
export function setSkillMods(counts: Record<string, number>, cls: ClassId): Record<string, { dmg: number; cd: number }> {
  const out: Record<string, { dmg: number; cd: number }> = {};
  for (const id in counts) {
    const s = SETS[id], m = s?.skill4[cls];
    if (!m || counts[id] < 4) continue;
    const o = (out[m.skill] ??= { dmg: 0, cd: 0 });
    o.dmg += m.dmg ?? 0; o.cd += m.cd ?? 0;
  }
  return out;
}
/** Wirkungen voller Sets: Wirkungs-ID (`rinde`, `prisma` …) → 1 */
export function setFullFx(counts: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id in counts) { const s = SETS[id]; if (s && counts[id] >= SET_FULL) out[s.full.id] = 1; }
  return out;
}
/** Text des 4er-Bonus für eine Klasse */
export function skill4Text(s: SetDef, cls: ClassId): string {
  const m = s.skill4[cls], name = SKILLS[m.skill]?.name ?? m.skill;
  return [m.dmg ? `${name} verursacht ${m.dmg} % mehr Schaden` : '', m.cd ? `${name} ist ${m.cd} % schneller wieder bereit` : ''].filter(Boolean).join(', ') + '.';
}
