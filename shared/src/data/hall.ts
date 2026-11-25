/**
 * Quellwarte (0.9): die Trophäenhalle – alles, was ein Charakter (und sein Profil) erreicht hat, an einer Stelle.
 * Liest nur vorhandene Daten: Boss-Flags, Trophäen und Meilensteine der Sammlung, Titel, Mana-Risse, Chronik, Statistiken
 * und – sobald es sie gibt – die Expeditionen (`CharData.expeditions`, Format `DungeonRecord` in data/hub.ts).
 * Reine Funktion: Oberfläche und Tests rufen sie mit Charakter und Profil-Stand auf.
 */
import { countShards } from '../stats';
import type { CharData, HomeData, ItemInstance } from '../types';
import { SLOTS } from '../types';
import { loreProgress } from './chronik';
import { MILESTONES, milestoneProgress } from './collection';
import { BOSSES } from './enemies';
import { HOME_TROPHIES, ownsTrophy, riftDone } from './home';
import { DIFFICULTIES, DIFFICULTY_NAME, type Difficulty, type DungeonRecord } from './hub';
import { ITEMS, isGear } from './items';
import { QUESTS } from './quests';
import { RARES, WORLD_BOSSES } from './rares';
import { ownedTitles, TITLES } from './rifts';
import { ZONES } from './zones';

export interface HallStat { label: string; value: string }
export interface HallBoss { id: string; name: string; wins: number }
export interface HallRecord { id: string; name: string; clears: number; best: { diff: Difficulty; name: string; sec: number; clears: number }[]; secrets: number; minis: number; first?: number }
export interface HallData {
  bosses: HallBoss[];
  trophies: { id: string; name: string; icon: string; desc: string; how: string; owned: boolean }[];
  milestones: { id: string; name: string; reward: string; have: number; need: number; done: boolean }[];
  titles: string[];
  expeditions: HallRecord[];
  stats: HallStat[];
  showcase: ItemInstance[];
}

const sumFlags = (c: CharData, prefix: string) => Object.keys(c.flags).filter(k => k.startsWith(prefix)).reduce((n, k) => n + (c.flags[k] || 0), 0);
export function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
  return h ? `${h} Std. ${m} Min.` : m ? `${m}:${String(s).padStart(2, '0')} Min.` : `${s} s`;
}
const fmt = (n: number) => Math.round(n).toLocaleString('de-DE');

/** Bestzeiten und Abschlüsse aus `CharData.expeditions` (fehlt das Feld, ist die Liste leer) */
export function hallRecords(c: CharData): HallRecord[] {
  const ex = c.expeditions;
  if (!ex || typeof ex !== 'object') return [];
  const out: HallRecord[] = [];
  for (const id in ex) {
    const r = ex[id] as DungeonRecord | undefined;
    if (!r || typeof r !== 'object') continue;
    const best: HallRecord['best'] = [];
    let clears = 0;
    for (const d of DIFFICULTIES) {
      const n = Math.max(0, Math.floor(Number(r.clears?.[d] ?? 0)) || 0), t = Number(r.best?.[d] ?? 0);
      clears += n;
      if (n > 0 || t > 0) best.push({ diff: d, name: DIFFICULTY_NAME[d], sec: t > 0 ? t : 0, clears: n });
    }
    out.push({ id, name: ZONES[id]?.name ?? id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' '), clears, best, secrets: r.secrets?.length ?? 0, minis: r.minis?.length ?? 0, first: r.first });
  }
  return out.sort((a, b) => b.clears - a.clears || a.name.localeCompare(b.name));
}

/** Die seltensten Stücke, die der Charakter besitzt (angelegt, im Rucksack, in der Profil-Truhe): episch und legendär */
export function showcase(c: CharData, h: HomeData | null, n = 8): ItemInstance[] {
  const all = [...(SLOTS.map(s => c.equip[s]).filter(Boolean) as ItemInstance[]), ...c.inv, ...(h?.stash ?? [])];
  return all.filter(it => ITEMS[it.base] && isGear(ITEMS[it.base]) && it.rarity >= 3).sort((a, b) => b.rarity - a.rarity || b.ilvl - a.ilvl || b.up - a.up).slice(0, n);
}

export function hallData(c: CharData, h: HomeData | null): HallData {
  const bosses = Object.keys(BOSSES).map(id => ({ id, name: BOSSES[id].name, wins: c.flags[`b:${id}`] ?? 0 }));
  const lore = loreProgress(c);
  const questsDone = Object.keys(c.quests).filter(id => QUESTS[id] && c.quests[id].s === 'done').length;
  const stats: HallStat[] = [
    { label: 'Stufe', value: `${c.level}${(c.quell?.lvl ?? 0) > 0 ? ` · Quellstufe ${c.quell!.lvl}` : ''}${(c.kreis ?? 0) > 0 ? ` · Kreis ${c.kreis! + 1}` : ''}` },
    { label: 'Spielzeit', value: fmtTime(c.playtime) },
    { label: 'Besiegte Gegner', value: fmt(c.kills) },
    { label: 'Niederlagen', value: fmt(c.deaths) },
    { label: 'Verdientes Gold', value: c.earned ? fmt(c.earned) : '– (wird ab jetzt gezählt)' },
    { label: 'Bosse besiegt', value: `${bosses.filter(b => b.wins > 0).length} / ${bosses.length}` },
    { label: 'Seltene Wesen', value: `${Object.keys(RARES).filter(id => c.flags[`rk:${id}`]).length} / ${Object.keys(RARES).length}` },
    { label: 'Weltbosse', value: `${sumFlags(c, 'wb:')} Siege · ${Object.keys(WORLD_BOSSES).filter(id => c.flags[`wb:${id}`]).length} / ${Object.keys(WORLD_BOSSES).length} Arten` },
    { label: 'Chronik', value: `${lore.found} / ${lore.total} Schriftstücke` },
    { label: 'Quellsplitter', value: fmt(countShards(c)) },
    { label: 'Quests abgeschlossen', value: fmt(questsDone) },
    { label: 'Mana-Risse', value: riftDone(c) > 0 ? `bis Stufe ${riftDone(c)}${c.rift?.trial ? ` · Prüfung der Sieben ×${c.rift.trial}` : ''}` : 'noch keiner' },
  ];
  return {
    bosses,
    trophies: HOME_TROPHIES.map(t => ({ id: t.id, name: t.name, icon: t.icon, desc: t.desc, how: t.how, owned: (h ? ownsTrophy(h, t.id) : false) || t.has(c) })),
    milestones: h ? MILESTONES.map(m => { const have = milestoneProgress(h, m); return { id: m.id, name: m.name, reward: m.reward, have: Math.min(have, m.need), need: m.need, done: h.ms.includes(m.id) || have >= m.need }; }) : [],
    titles: ownedTitles(c).map(id => TITLES[id]?.name ?? id),
    expeditions: hallRecords(c),
    stats,
    showcase: showcase(c, h),
  };
}
