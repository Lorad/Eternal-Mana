/**
 * Sammlung (0.7): macht sichtbar, was das Spiel hergibt – Bestiarium, Fundstücke, Rezepte, Trophäen, Begleiter,
 * Erscheinungen – und belohnt Meilensteine. Reine Daten und Funktionen; der Server führt Buch (server/src/home).
 *
 * Die Sammlung gehört dem Profil (`HomeData.kills`, `.seen`, `.ms`). Was ein Charakter „beweist“ (`proofs`), ergibt sich
 * aus seinem Spielstand – dieselbe Funktion trägt deshalb auch alte Spielstände nach. Nur die Zahl der Siege über
 * gewöhnliche Gegner steht in keinem alten Spielstand; sie zählt ab 0.7.
 */
import { CFG } from '../config';
import { mobAffinity } from '../elements';
import type { CharData, Element, HomeData, ItemInstance } from '../types';
import { SLOTS } from '../types';
import { BOSSES, ENEMY_LIST } from './enemies';
import { HOME_MAX, HOME_TROPHIES, HOME_TROPHY, baseSlots, emptyHome, trophySeen } from './home';
import { BOSS_UNIQUE, ITEMS } from './items';
import { LOOKS, LOOK_LIST } from './looks';
import { BIOME_MATS, BOSS_CORE, ESSENCE } from './materials';
import { PETS, PET_LIST } from './pets';
import { BOSS_BY_MOB, RARES, RARE_BY_MOB, WORLD_BOSSES } from './rares';
import { LEARNABLE, RECIPES } from './recipes';
import { TITLES, TITLE_SOURCES } from './rifts';
import { SETS, SET_LIST, SET_PIECES, setPieceName, type SetPiece } from './sets';
import { ZONE_LIST } from './zones';

// ------------------------------------------------------------------ Bestiarium
export interface Beast {
  /** Kennung in `HomeData.kills` (Gegner-ID; Dungeon- und Story-Bosse mit `b:` davor) */
  id: string; name: string;
  kind: 'mob' | 'named' | 'boss';
  el: Element; weak: Element[]; resist: Element[];
  /** wo man es trifft */
  where: string;
  /** was es hergibt (Gegenstands-IDs) – sichtbar wird jeder Eintrag erst, wenn man ihn einmal besessen hat */
  drops: string[];
}
const essenceOf = (el: Element): string | undefined => (ESSENCE as Record<string, string>)[el];
const uniq = <T>(a: (T | undefined)[]) => [...new Set(a.filter((x): x is T => x !== undefined))];
function buildBestiary(): Beast[] {
  const out: Beast[] = [];
  for (const e of ENEMY_LIST) {
    const zones = ZONE_LIST.filter(z => z.mobs.some(m => m[0] === e.id));
    const rare = RARE_BY_MOB[e.id], wb = BOSS_BY_MOB[e.id];
    const home = rare ? ZONE_LIST.filter(z => z.id === rare.zone) : wb ? ZONE_LIST.filter(z => (wb.zones as string[]).includes(z.id)) : zones;
    const where = rare ? `Seltenes Monster · ${home[0]?.name ?? ''}` : wb ? `Weltboss · ${home.map(z => z.name).join(', ')}`
      : zones.length ? uniq(zones.map(z => z.name)).join(', ') : e.id.startsWith('ev_') ? 'Ereignisse und Begegnungen' : 'Erscheint nur, wenn man es ruft';
    const a = mobAffinity(e.id, false);
    const mats = uniq(home.flatMap(z => [BIOME_MATS[z.biome]?.monster, BIOME_MATS[z.biome]?.ingredient]));
    out.push({ id: e.id, name: e.name, kind: e.named ? 'named' : 'mob', el: a.el, weak: a.weak, resist: a.resist, where,
      drops: uniq([...(e.drops ?? []).map(d => d[0]), ...mats, essenceOf(e.element), rare ? 'tro_' + rare.id : wb ? 'tro_' + wb.id : undefined]).filter(id => ITEMS[id]) });
  }
  for (const id in BOSSES) {
    const b = BOSSES[id], z = ZONE_LIST.find(x => x.boss === id), a = mobAffinity(id, true);
    out.push({ id: 'b:' + id, name: b.name, kind: 'boss', el: a.el, weak: a.weak, resist: a.resist, where: z ? `${z.name} · ${b.title}` : b.title,
      drops: uniq([b.seal, BOSS_CORE[id], essenceOf(b.element)]).filter(x => ITEMS[x]) });
  }
  return out;
}
export const BESTIARY: Beast[] = buildBestiary();
export const BEASTS: Record<string, Beast> = Object.fromEntries(BESTIARY.map(b => [b.id, b]));
export const beastKills = (h: HomeData, b: Beast) => Math.max(0, Math.floor(h.kills[b.id] ?? 0));
/** Siege, ab denen Schwächen und Resistenzen im Bestiarium stehen */
export const studyNeed = (b: Beast) => (b.kind === 'mob' ? CFG.home.study : CFG.home.studyNamed);
export const studied = (h: HomeData, b: Beast) => beastKills(h, b) >= studyNeed(b);
export const dropSeen = (h: HomeData, item: string) => !!h.seen['i:' + item];
/** Zähler in den Flags eines Charakters, die Siege über Bosse, seltene Monster und Weltbosse festhalten → Kennung im Bestiarium */
export function flagBeast(key: string): string | undefined {
  if (key.startsWith('b:')) return BOSSES[key.slice(2)] ? key : undefined;
  if (key.startsWith('rk:')) return RARES[key.slice(3)]?.mob;
  if (key.startsWith('wb:')) return WORLD_BOSSES[key.slice(3)]?.mob;
  return undefined;
}

// ------------------------------------------------------------------ Fundstücke
export interface Find { id: string; name: string; group: string; how: string; icon: string }
const UNIQUE_BY_NAME = new Map<string, string>();
for (const b in BOSS_UNIQUE) for (const n of Object.values(BOSS_UNIQUE[b].names)) UNIQUE_BY_NAME.set(n, b);
const PIECE_ICON: Record<SetPiece, string> = { helm: 'helm_heavy', armor: 'armor_heavy', ring: 'ring', amulet: 'amulet' };
export const FINDS: Find[] = [
  ...Object.values(ITEMS).filter(b => b.legend).map((b): Find => ({ id: 'leg:' + b.legend, name: b.name, group: 'Legendäre Waffen', how: 'Aus sechs Bosskernen geschmiedet (Borin oder Rakhan)', icon: b.icon })),
  ...SET_LIST.flatMap(s => SET_PIECES.map((p): Find => ({ id: `set:${s.id}:${p}`, name: setPieceName(s, p), group: 'Set: ' + s.name, how: `${BOSSES[s.boss].name} und die Truhen seines Dungeons – oder schmieden`, icon: PIECE_ICON[p] }))),
  ...Object.keys(BOSS_UNIQUE).map((b): Find => ({ id: 'uni:' + b, name: `Unikat: ${BOSSES[b].name}`, group: 'Boss-Unikate', how: `Aus der Truhe hinter ${BOSSES[b].name}`, icon: 'sword' })),
];
/** Fundstück-Kennung eines Gegenstands (oder undefined) */
export function findOf(it: ItemInstance): string | undefined {
  const b = ITEMS[it.base];
  if (!b) return undefined;
  if (b.legend) return 'leg:' + b.legend;
  if (it.set && SETS[it.set]) { const p: SetPiece | undefined = b.kind === 'helm' ? 'helm' : b.kind === 'armor' ? 'armor' : b.acc === 'ring' ? 'ring' : b.acc === 'amulet' ? 'amulet' : undefined; if (p) return `set:${it.set}:${p}`; }
  if (it.name && UNIQUE_BY_NAME.has(it.name)) return 'uni:' + UNIQUE_BY_NAME.get(it.name);
  return undefined;
}

// ------------------------------------------------------------------ Was ein Spielstand beweist
/** Einträge für `HomeData.seen`, die dieser Gegenstand belegt */
export function itemSeen(it: ItemInstance): string[] { const f = findOf(it); return f ? ['i:' + it.base, 'f:' + f] : ['i:' + it.base]; }
/**
 * Alles, was sich aus einem Charakter für das Profil ablesen lässt: Trophäen, Fundstücke, Rezepte, gesehene Gegenstände,
 * Begleiter und Erscheinungen. Rein – der Server ruft sie beim Betreten (Nachtrag für alte Spielstände) und nach Änderungen.
 */
export function proofs(c: CharData): { seen: string[]; pets: string[]; looks: string[] } {
  const seen: string[] = [];
  for (const t of HOME_TROPHIES) if (t.has(c)) seen.push(trophySeen(t.id));
  for (const r of c.recipes ?? []) if (RECIPES[r]) seen.push('r:' + r);
  for (const it of c.inv) seen.push(...itemSeen(it));
  for (const s of SLOTS) { const it = c.equip[s]; if (it) seen.push(...itemSeen(it)); }
  for (const b in BOSS_UNIQUE) if (c.flags['u:' + b]) seen.push('f:uni:' + b);
  return { seen, pets: PET_LIST.filter(p => p.has?.(c)).map(p => p.id), looks: LOOK_LIST.filter(l => l.has?.(c)).map(l => l.id) };
}

// ------------------------------------------------------------------ Fortschritt und Meilensteine
export type CollCat = 'best' | 'fund' | 'rez' | 'tro' | 'begl' | 'ersch';
export const COLL_CATS: { id: CollCat; name: string; hint: string }[] = [
  { id: 'best', name: 'Bestiarium', hint: 'Jedes Wesen, das du besiegt hast. Schwächen zeigen sich nach einigen Siegen, Beute, sobald du sie einmal in der Hand hattest.' },
  { id: 'fund', name: 'Fundstücke', hint: 'Legendäre Waffen, Setteile und Boss-Unikate, die je ein Charakter deines Profils besessen hat.' },
  { id: 'rez', name: 'Rezepte', hint: 'Rezepte, die man lernen muss – einmal gelernt, zählen sie für die Sammlung.' },
  { id: 'tro', name: 'Trophäen', hint: 'Von seltenen Monstern, Weltbossen, Hütern und großen Tagen. Ausstellen lassen sie sich auf dem Hof.' },
  { id: 'begl', name: 'Begleiter', hint: 'Acht Gefährten aus acht Winkeln der Welt. Einer läuft mit.' },
  { id: 'ersch', name: 'Erscheinungen', hint: 'Gewänder und Waffenglanz. Gewählt wird am Kleiderschrank auf einem Hof.' },
];
/** [gesammelt, insgesamt] einer Kategorie */
export function collCount(h: HomeData, cat: CollCat): [number, number] {
  switch (cat) {
    case 'best': return [BESTIARY.filter(b => beastKills(h, b) > 0).length, BESTIARY.length];
    case 'fund': return [FINDS.filter(f => h.seen['f:' + f.id]).length, FINDS.length];
    case 'rez': return [LEARNABLE.filter(r => h.seen['r:' + r.id]).length, LEARNABLE.length];
    case 'tro': return [HOME_TROPHIES.filter(t => h.seen[trophySeen(t.id)]).length, HOME_TROPHIES.length];
    case 'begl': return [PET_LIST.filter(p => h.pets.includes(p.id)).length, PET_LIST.length];
    case 'ersch': return [LOOK_LIST.filter(l => h.looks.includes(l.id)).length, LOOK_LIST.length];
  }
}
export function collTotal(h: HomeData): [number, number] { let a = 0, b = 0; for (const c of COLL_CATS) { const [x, y] = collCount(h, c.id); a += x; b += y; } return [a, b]; }

export interface Milestone {
  id: string; cat: CollCat | 'alles'; need: number; name: string;
  /** Belohnung in Worten */
  reward: string;
  /** Titel (TITLES) · Begleiter · Erscheinung · zusätzliche Lagerplätze */
  title?: string; pet?: string; look?: string; slots?: number;
}
const SB = CFG.home.slotBonus;
export const MILESTONES: Milestone[] = [
  { id: 'best10', cat: 'best', need: 10, name: 'Erste Seiten', reward: 'Waffenglanz „Smaragdglanz“', look: 'w_smaragd' },
  { id: 'best25', cat: 'best', need: 25, name: 'Dickes Buch', reward: 'Begleiter: Runenkäfer', pet: 'runenkaefer' },
  { id: 'best45', cat: 'best', need: 45, name: 'Feldforschung', reward: 'Titel „Naturkundler“', title: 'naturkundler' },
  { id: 'fund6', cat: 'fund', need: 6, name: 'Vitrine', reward: `+${SB} Plätze in der Lagertruhe`, slots: SB },
  { id: 'fund18', cat: 'fund', need: 18, name: 'Schausammlung', reward: 'Titel „Kustos“', title: 'kustos' },
  { id: 'rez8', cat: 'rez', need: 8, name: 'Rezeptheft', reward: `+${SB} Plätze in der Lagertruhe`, slots: SB },
  { id: 'rez18', cat: 'rez', need: 18, name: 'Rezeptbuch', reward: 'Titel „Meisterhand“', title: 'meisterhand' },
  { id: 'tro6', cat: 'tro', need: 6, name: 'Trophäenwand', reward: 'Titel „Trophäenjäger“', title: 'trophaeenjaeger' },
  { id: 'tro15', cat: 'tro', need: 15, name: 'Trophäenhalle', reward: `+${SB} Plätze in der Lagertruhe`, slots: SB },
  { id: 'begl5', cat: 'begl', need: 5, name: 'Kleines Rudel', reward: 'Titel „Rudelführer“', title: 'rudelfuehrer' },
  { id: 'alles90', cat: 'alles', need: 90, name: 'Kuriositätenkabinett', reward: 'Gewand „Goldenes Gewand“', look: 'gold' },
];
export const MILESTONE: Record<string, Milestone> = Object.fromEntries(MILESTONES.map(m => [m.id, m]));
export function milestoneProgress(h: HomeData, m: Milestone): number { return m.cat === 'alles' ? collTotal(h)[0] : collCount(h, m.cat)[0]; }
/** Meilensteine, die erreicht, aber noch nicht ausgezahlt sind */
export function dueMilestones(h: HomeData): Milestone[] { return MILESTONES.filter(m => !h.ms.includes(m.id) && milestoneProgress(h, m) >= m.need); }
/** Plätze der Lagertruhe: Ausbaustufe plus Meilensteine der Sammlung */
export function stashSlots(h: HomeData): number { let n = baseSlots(h); for (const id of h.ms) n += MILESTONE[id]?.slots ?? 0; return n; }

// Titel der Sammlung hängen sich in das Titelsystem ein (0.5). Ein Charakter führt sie, sobald das Profil den Meilenstein
// erreicht hat – der Server spiegelt das als Flag `sm:<meilenstein>` in jeden Charakter des Profils.
export const milestoneFlag = (id: string) => 'sm:' + id;
const TITLE_TEXT: Record<string, [string, string]> = {
  naturkundler: ['Naturkundler', 'Hat 45 Wesen ins Bestiarium eingetragen.'],
  kustos: ['Kustos', 'Hat 18 Fundstücke zusammengetragen.'],
  meisterhand: ['Meisterhand', 'Hat 18 Rezepte gelernt.'],
  trophaeenjaeger: ['Trophäenjäger', 'Hat sechs Trophäen gesammelt.'],
  rudelfuehrer: ['Rudelführer', 'Wird von fünf Begleitern für zuständig gehalten.'],
};
for (const id in TITLE_TEXT) TITLES[id] = { name: TITLE_TEXT[id][0], desc: TITLE_TEXT[id][1] };
TITLE_SOURCES.push(c => MILESTONES.filter(m => m.title && c.flags[milestoneFlag(m.id)]).map(m => m.title!));

// ------------------------------------------------------------------ Laden: reparieren und begrenzen
/** Repariert/ergänzt einen geladenen Profil-Stand (alte oder leicht beschädigte Stände bleiben ladbar). */
export function sanitizeHome(raw: any): HomeData {
  const h = emptyHome();
  if (!raw || typeof raw !== 'object') return h;
  const num = (v: any, d: number, min = 0, max = 1e12) => (typeof v === 'number' && isFinite(v) ? Math.max(min, Math.min(max, v)) : d);
  const ids = (v: any, ok: (s: string) => boolean): string[] => (Array.isArray(v) ? [...new Set(v.filter((s: any): s is string => typeof s === 'string' && ok(s)))] : []);
  h.owned = num(raw.owned, 0) > 0 ? 1 : 0;
  h.level = h.owned ? Math.floor(num(raw.level, 0, 0, HOME_MAX)) : 0;
  h.gold = Math.floor(num(raw.gold, 0, 0, CFG.home.goldCap));
  h.pets = ids(raw.pets, s => !!PETS[s]);
  h.looks = ids(raw.looks, s => !!LOOKS[s]);
  h.ms = ids(raw.ms, s => !!MILESTONE[s]);
  if (raw.kills && typeof raw.kills === 'object') for (const k in raw.kills) { const n = Math.floor(num(raw.kills[k], 0, 0, 1e9)); if (BEASTS[k] && n > 0) h.kills[k] = n; }
  if (raw.seen && typeof raw.seen === 'object') for (const k in raw.seen) if (raw.seen[k] && /^[ifrt]:[\w:.-]{1,60}$/.test(k)) h.seen[k] = 1;
  h.stash = (Array.isArray(raw.stash) ? raw.stash : []).filter((it: any) => it && ITEMS[it.base] && typeof it.uid === 'string').slice(0, 2000); // nie stillschweigend kürzen: überzählige Stücke bleiben abholbar
  for (const it of h.stash) {
    it.affixes = Array.isArray(it.affixes) ? it.affixes : []; it.up = num(it.up, 0, 0, CFG.upgrade.max); it.rarity = num(it.rarity, 0, 0, 4); it.ilvl = num(it.ilvl, 1, 1, 99);
    if (it.qty !== undefined) it.qty = Math.max(1, Math.floor(num(it.qty, 1, 1, 1e6)));
    if (it.set !== undefined && !SETS[it.set]) delete it.set;
  }
  const stands = Array.isArray(raw.stands) ? raw.stands : [];
  h.stands = Array.from({ length: CFG.home.stands[HOME_MAX] }, (_, i) => (typeof stands[i] === 'string' && HOME_TROPHY[stands[i]] && h.seen[trophySeen(stands[i])] ? stands[i] : ''));
  return h;
}
