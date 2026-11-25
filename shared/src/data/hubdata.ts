/**
 * Quellwarte (0.9): Einrichtungen und ihre Regeln als reine Funktionen – Server (server/src/hub) und Oberfläche
 * (client/src/ui/hub.tsx) benutzen dieselben. Zahlen: CFG.hub. Gerüchte: data/rumours.ts, Trophäenhalle: data/hall.ts.
 *
 *   Ausrüstungshändler  – Tagesware (UTC-Tag) und ein Wochenstück, je Charakter einmal kaufbar, Stufe = eigene Stufe
 *   Fähigkeitenmeister  – Meisterränge für voll ausgebaute aktive Fähigkeiten
 *   Lagerhaus           – dieselbe Profil-Truhe wie auf dem Hof, zusätzliche Reihen für Gold
 *   Gruppenbereich      – Ziele für Gruppengesuche
 */
import { CFG } from '../config';
import type { CharData, ClassId, HomeData, ItemInstance } from '../types';
import type { Facility } from './hub';
import { generateGear, itemPrice, rollRarity } from './items';
import { ESSENCE, AETHER } from './materials';
import { SKILLS, type SkillDef } from './skills';
import { Rng, strHash } from '../util/rng';

// ------------------------------------------------------------------ Einrichtungen
export interface FacilityDef { name: string; glyph: string; desc: string; npc?: string }
export const FACILITIES: Record<Facility, FacilityDef> = {
  portal: { name: 'Portalplatz', glyph: '◎', desc: 'Das Portal in der Mitte des Platzes führt in die Expeditionen – allein oder als Gruppe.' },
  schmiede: { name: 'Schmiede', glyph: '⚒', npc: 'gunda', desc: 'Gunda: Ausrüstung schmieden, verbessern, umschmieden, Elemente einschmieden, angleichen.' },
  haendler: { name: 'Ausrüstungshändler', glyph: '◈', npc: 'ottmar', desc: 'Ottmar: Waffen, Rüstung und Schmuck – jeden Tag andere Ware, dazu ein besonderes Stück der Woche.' },
  alchemie: { name: 'Alchemie', glyph: '⚗', npc: 'irmela', desc: 'Irmela: Tränke und Elixiere brauen, Tränke kaufen.' },
  meister: { name: 'Fähigkeitenmeister', glyph: '✧', npc: 'corvin', desc: 'Meister Corvin: Fähigkeiten verwalten, zurücksetzen und Meisterränge lernen.' },
  lager: { name: 'Lagerhaus', glyph: '▤', npc: 'fridolin', desc: 'Fridolin: die Truhe deines Profils – dieselbe wie auf dem Hof. Weitere Reihen gibt es für Gold.' },
  gasthaus: { name: 'Gasthaus', glyph: '♨', npc: 'hanne', desc: 'Hanne und ihre Stammgäste: Geschichten, Aufträge und das Gerüchtebrett.' },
  halle: { name: 'Trophäenhalle', glyph: '♛', npc: 'bertram', desc: 'Bertram: Bosse, Erfolge, Bestzeiten, Statistiken und deine seltensten Stücke.' },
  gruppe: { name: 'Gruppenbereich', glyph: '⚑', npc: 'wenke', desc: 'Wenke: Wer ist da, wer sucht Leute? Gruppen bilden, einladen, Gesuche aushängen.' },
};
export const FACILITY_ORDER: Facility[] = ['portal', 'schmiede', 'haendler', 'alchemie', 'meister', 'lager', 'gasthaus', 'halle', 'gruppe'];
/** NPC → Einrichtung, die er hütet */
export const FACILITY_OF_NPC: Record<string, Facility> = Object.fromEntries(FACILITY_ORDER.filter(f => FACILITIES[f].npc).map(f => [FACILITIES[f].npc!, f]));

// ------------------------------------------------------------------ Zeit: Tage und Wochen (UTC)
export const DAY_MS = 86_400_000;
/** Tag, Woche (beginnt montags) und Sekunden bis zum nächsten Wechsel */
export function hubPeriod(ms: number): { day: number; week: number; next: number; nextWeek: number } {
  const day = Math.floor(ms / DAY_MS), week = Math.floor((day + 3) / 7);
  const next = Math.ceil(((day + 1) * DAY_MS - ms) / 1000);
  const nextWeek = Math.ceil(((week * 7 + 4) * DAY_MS - ms) / 1000);
  return { day, week, next, nextWeek };
}

// ------------------------------------------------------------------ Ausrüstungshändler
export interface TraderOfferDef { item: ItemInstance; price: number; weekly?: 1 }
/** Stufe der Ware: die eigene (gedeckelt auf die Höchststufe) */
export const traderLevel = (c: CharData) => Math.max(1, Math.min(CFG.player.maxLevel, c.level));
/**
 * Angebot für einen Charakter: dieselbe Klasse, Stufe und dieselbe Zeit ergeben immer dasselbe Angebot (Server und Oberfläche).
 * Index 0..daily-1 = Tagesware, letzter Index = Wochenstück.
 */
export function traderStock(cls: ClassId, level: number, day: number, week: number): TraderOfferDef[] {
  const C = CFG.hub.trader, out: TraderOfferDef[] = [];
  for (let i = 0; i < C.daily; i++) {
    const rng = new Rng(strHash(`qw:${day}:${cls}:${i}`));
    const it = generateGear(rng, level, rollRarity(rng, C.weights), cls, i === 0 ? 'weapon' : undefined);
    it.uid = 'hub';
    out.push({ item: it, price: Math.ceil(itemPrice(it) * C.priceMul) });
  }
  const rng = new Rng(strHash(`qw:w:${week}:${cls}`));
  const it = generateGear(rng, level + C.weeklyIlvl, rng.chance(C.weeklyLegend) ? 4 : 3, cls);
  it.uid = 'hub';
  out.push({ item: it, price: Math.ceil(itemPrice(it) * C.weeklyMul), weekly: 1 });
  return out;
}
/** Schon gekauft? (je Charakter einmal je Tag bzw. Woche) */
export function traderGot(c: CharData, idx: number, day: number, week: number): boolean {
  const s = c.hubShop;
  if (!s) return false;
  if (idx >= CFG.hub.trader.daily) return s.week === week && !!s.wgot;
  return s.day === day && s.got.includes(idx);
}

// ------------------------------------------------------------------ Fähigkeitenmeister: Meisterränge
/** Lässt sich die Fähigkeit meistern? Aktive Fähigkeiten, deren Ränge etwas steigern (nicht das reine Blinzeln). */
export function masterable(sk: SkillDef | undefined): sk is SkillDef {
  return !!sk?.effects?.some(e => 'mult' in e || e.k === 'buff');
}
export const masteryOf = (c: CharData, id: string) => Math.max(0, Math.min(CFG.hub.mastery.max, c.mastery?.[id] ?? 0));
/** Rang, mit dem eine Fähigkeit wirkt: gelernt – und darüber die Meisterränge, solange sie voll ausgebaut ist. */
export function effRank(c: CharData, id: string): number {
  const r = c.skills[id] ?? 0, sk = SKILLS[id];
  return sk && r >= sk.maxRank ? r + masteryOf(c, id) : r;
}
/** Fähigkeiten mit mindestens einem Meisterrang */
export const masteredSkills = (c: CharData) => Object.keys(c.mastery ?? {}).filter(id => masteryOf(c, id) > 0);
/** Kosten des nächsten Meisterrangs `next` (1..max) */
export function masteryCost(sk: SkillDef, next: number): { gold: number; mats: [string, number][] } {
  const R = CFG.hub.mastery.ranks[Math.max(0, Math.min(CFG.hub.mastery.ranks.length - 1, next - 1))];
  const mat = sk.element === 'phys' ? CFG.hub.mastery.physMat : ESSENCE[sk.element];
  const mats: [string, number][] = [[mat, R.mats]];
  if (R.aether) mats.push([AETHER, R.aether]);
  return { gold: R.gold, mats };
}
const countInv = (c: CharData, base: string) => c.inv.reduce((n, it) => n + (it.base === base ? it.qty ?? 1 : 0), 0);
/** Warum der nächste Meisterrang (noch) nicht geht – oder null. Prüft Klasse, Ausbau, Höchstzahl, Stufe, Hauptquest, Kosten. */
export function masteryBlock(c: CharData, id: string): string | null {
  const sk = SKILLS[id], M = CFG.hub.mastery;
  if (!sk || sk.cls !== c.cls) return 'Diese Technik kennt deine Klasse nicht.';
  if (!masterable(sk)) return 'Dafür gibt es keine Meistertechnik. „Manches ist fertig, wenn es fertig ist“, sagt Corvin.';
  if ((c.skills[id] ?? 0) < sk.maxRank) return `Erst ganz lernen: ${sk.name} braucht Rang ${sk.maxRank}.`;
  const have = masteryOf(c, id);
  if (have >= M.max) return 'Mehr kann dir hier niemand beibringen. Corvin auch nicht, aber er gibt es nicht zu.';
  if (!have && masteredSkills(c).length >= M.skills) return `Höchstens ${M.skills} Techniken zugleich. „Wer alles meistern will, meistert nichts.“`;
  const R = M.ranks[have];
  if (c.level < R.level) return `Meisterrang ${have + 1} braucht Stufe ${R.level}.`;
  if (c.quests[R.quest]?.s !== 'done') return `Meisterrang ${have + 1}: Corvin will erst hören, dass du „${QUEST_NAME[R.quest] ?? R.quest}“ hinter dir hast.`;
  const cost = masteryCost(sk, have + 1);
  if (c.gold < cost.gold) return 'Nicht genug Gold.';
  for (const [b, n] of cost.mats) if (countInv(c, b) < n) return 'Es fehlen Rohstoffe.';
  return null;
}
/** Namen der Hauptquests, an denen Meisterränge hängen (ohne quests.ts zu laden) */
const QUEST_NAME: Record<string, string> = { m_glut: 'Der Schlackenwurm', m_koenig: 'Der Hohle König' };

// ------------------------------------------------------------------ Lagerhaus
export const lagerRows = (h: HomeData) => Math.max(0, Math.min(CFG.hub.lager.rowsMax, Math.floor(h.rows ?? 0)));
/** Plätze, die das Lagerhaus der Profil-Truhe hinzufügt */
export const lagerSlots = (h: HomeData) => lagerRows(h) * CFG.hub.lager.row;
export const rowPrice = (h: HomeData) => CFG.hub.lager.gold(lagerRows(h));
export function rowBlock(c: CharData, h: HomeData): string | null {
  if (lagerRows(h) >= CFG.hub.lager.rowsMax) return 'Mehr Regale passen nicht hinein. Fridolin hat nachgemessen. Zweimal.';
  if (c.gold < rowPrice(h)) return 'Nicht genug Gold.';
  return null;
}

// ------------------------------------------------------------------ Gruppenbereich
export const LFG_GOALS: [string, string][] = [
  ['expedition', 'Expedition / Dungeon'], ['riss', 'Mana-Riss'], ['weltboss', 'Weltboss'], ['quests', 'Quests'], ['gemeinsam', 'Einfach gemeinsam'],
];
export const LFG_GOAL: Record<string, string> = Object.fromEntries(LFG_GOALS);
/** Notiz eines Gesuchs: kurz, eine Zeile, ohne Steuerzeichen */
export const lfgNote = (s: unknown) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 60);

// ------------------------------------------------------------------ Spielstand
/** Bereinigt die Felder der Quellwarte (alte Stände haben sie nicht; beschädigte Werte werden entfernt). */
export function sanitizeHubChar(c: CharData): void {
  const num = (v: any, d: number, min = 0, max = 1e12) => (typeof v === 'number' && isFinite(v) ? Math.max(min, Math.min(max, v)) : d);
  if (c.mastery !== undefined) {
    const m: Record<string, number> = {};
    if (c.mastery && typeof c.mastery === 'object') for (const id in c.mastery) {
      const n = Math.floor(num((c.mastery as any)[id], 0, 0, CFG.hub.mastery.max));
      if (n > 0 && masterable(SKILLS[id]) && SKILLS[id].cls === c.cls && Object.keys(m).length < CFG.hub.mastery.skills) m[id] = n;
    }
    if (Object.keys(m).length) c.mastery = m; else delete c.mastery;
  }
  if (c.earned !== undefined) { c.earned = Math.floor(num(c.earned, 0)); if (!c.earned) delete c.earned; }
  if (c.hubShop !== undefined) {
    const s: any = c.hubShop && typeof c.hubShop === 'object' ? c.hubShop : null;
    if (!s) delete c.hubShop;
    else c.hubShop = { day: Math.floor(num(s.day, 0)), week: Math.floor(num(s.week, 0)), got: Array.isArray(s.got) ? [...new Set(s.got.filter((i: any) => Number.isInteger(i) && i >= 0 && i < CFG.hub.trader.daily) as number[])] : [], ...(s.wgot ? { wgot: 1 } : {}) };
  }
}
