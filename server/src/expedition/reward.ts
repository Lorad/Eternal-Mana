/**
 * Abschluss einer Expedition (0.9): Belohnung genau einmal je Lauf und Charakter.
 *
 * Schutz vor doppelter Belohnung: Jeder Lauf hat einen Schlüssel (`ExpRun.key`). `grant` prüft ihn gegen
 * `CharData.expRuns`, schreibt Belohnung, Fortschritt (CharData.expeditions) und den Schlüssel in denselben Spielstand und
 * speichert sofort – alles in EINER Transaktion (Game.savePlayer → Db.saveChar). Ein zweites Bossende, ein Wiederverbinden
 * während der Belohnungsphase oder ein Neustart des Servers finden den Schlüssel und geben nichts mehr.
 */
import { CFG, RARITY_NAME } from '../../../shared/src/config';
import { BOSSES } from '../../../shared/src/data/enemies';
import { EXPEDITIONS, EXP_CFG, EXP_DIFF, diffRarity, expPar, expRecord, totalClears, weeklyFlag } from '../../../shared/src/data/expeditions';
import { expTrophy } from '../../../shared/src/data/expitems';
import { DIFFICULTY_NAME } from '../../../shared/src/data/hub';
import { ITEMS, TIER_MATERIAL, generateBossUnique, generateGear, itemName, makeStack, rollRarity, tierOf } from '../../../shared/src/data/items';
import { BIOME_MATS } from '../../../shared/src/data/materials';
import { STORY } from '../../../shared/src/data/quests';
import { kreisLevel, kreisOf } from '../../../shared/src/data/rifts';
import type { ExpResult, ItemInstance } from '../../../shared/src/types';
import { bossLoot } from '../loot';
import type { Player } from '../player';
import type { Zone } from '../zone';

/** Wie viele Geheimnisse / Mini-Bosse hat diese Expedition? */
export function totals(zone: Zone): { secrets: number; minis: number } {
  const info = zone.map.exp!;
  return { secrets: info.secrets.length, minis: info.minis.length };
}

/** Belohnt einen Teilnehmer. Rückgabe: das Ergebnis – oder null, wenn dieser Lauf ihn schon belohnt hat. */
export function grant(zone: Zone, p: Player): ExpResult | null {
  const run = zone.exp!, c = p.char, x = EXPEDITIONS[run.exp], d = EXP_DIFF[run.diff], boss = BOSSES[x.boss], r = zone.rng;
  if (!run.done) return null;
  if ((c.expRuns ?? []).includes(run.key)) return null;
  const rec = expRecord(c, run.exp);
  const first = !(rec.clears[run.diff] ?? 0);
  const weekly = !!run.weekly && run.weekly.exp === run.exp && run.weekly.diff === run.diff && !c.flags[weeklyFlag(run.weekly.week)];
  const items: ItemInstance[] = [];
  const give = (it: ItemInstance | null) => { if (!it) return; items.push(it); p.give(it, false); };
  const gold0 = c.gold, lvl0 = c.level, xp0 = c.xp;

  // ---- die Geschichte: Bossflagge, Siegel, Questziel „boss“, Filmtext – wie im alten Dungeon
  const firstBoss = !c.flags[`b:${boss.id}`];
  c.flags[`b:${boss.id}`] = (c.flags[`b:${boss.id}`] ?? 0) + 1;
  if (!p.countItem(boss.seal)) give(makeStack(boss.seal));
  const party = p.party ? [...p.party.members].filter(q => q.zone === zone).length : 1;
  p.questEvent({ t: 'boss', boss: boss.id, party });
  if (firstBoss && STORY[boss.seal]) zone.game.story(p, boss.seal);
  bossLoot(zone, p, boss.id, boss.element, firstBoss);

  // ---- Erfahrung und Gold
  const mul = d.rewardMul * (first ? 1 : EXP_CFG.repeatMul) * (weekly ? EXP_CFG.weeklyMul : 1);
  p.gainXp(boss.xp * EXP_CFG.clearXp * mul);
  p.gainGold(boss.gold * EXP_CFG.clearGold * mul * (1 + p.stats.goldPct / 100));

  // ---- Beute (persönlich, über die gewöhnlichen Gegenstandsfunktionen – neue Plätze und Seltenheiten fließen von selbst ein)
  const ilvl = Math.min(CFG.player.maxLevel + 20, kreisLevel(boss.level, kreisOf(c)) + d.ilvlPlus);
  const w = diffRarity(run.diff);
  for (let i = 0; i < EXP_CFG.gear + (weekly ? EXP_CFG.weeklyGear : 0); i++) give(generateGear(r, ilvl, rollRarity(r, w), c.cls));
  const legend = Math.max(0, RARITY_NAME.indexOf('Legendär'));
  if (r.chance(EXP_CFG.legendary * d.rewardMul)) give(generateGear(r, ilvl, Math.max(legend, rollRarity(r, w)), c.cls));
  if (first || r.chance(0.3)) give(generateBossUnique(r, boss.id, c.cls, r.chance(first ? 0.15 : 0.1)));
  const bio = BIOME_MATS[x.region];
  if (bio) { give(makeStack(bio.monster, r.int(EXP_CFG.mats[0], EXP_CFG.mats[1]))); give(makeStack(bio.ingredient, r.int(1, 3))); }
  give(makeStack(TIER_MATERIAL[tierOf(ilvl) - 1], r.int(2, 4)));
  if (ITEMS[x.rare] && r.chance(EXP_CFG.rare * d.rewardMul)) give(makeStack(x.rare));
  if (first && ITEMS[expTrophy(boss.id)]) give(makeStack(expTrophy(boss.id)));

  // ---- Fortschritt
  const sec = run.done.sec, deaths = run.deaths.get(p.charId) ?? 0;
  const best = !rec.best?.[run.diff] || sec < rec.best[run.diff]!;
  rec.clears[run.diff] = (rec.clears[run.diff] ?? 0) + 1;
  if (best) (rec.best ??= {})[run.diff] = sec;
  rec.secrets = [...new Set([...(rec.secrets ?? []), ...run.secrets])];
  rec.minis = [...new Set([...(rec.minis ?? []), ...run.minis])];
  rec.first ??= Date.now();
  if (weekly) c.flags[weeklyFlag(run.weekly!.week)] = 1;
  c.expRuns = [...(c.expRuns ?? []), run.key].slice(-EXP_CFG.keepRuns);
  p.sync('flags', 'expeditions', 'expRuns');

  const T = totals(zone), par = expPar(x);
  const feats: string[] = [];
  if (first) feats.push(`Erster Abschluss auf ${DIFFICULTY_NAME[run.diff]}`);
  if (deaths === 0) feats.push('Ohne Tod');
  if (sec <= par) feats.push('Unter der Richtzeit');
  if (T.secrets && run.secrets.size >= T.secrets) feats.push('Alle Geheimnisse');
  if (T.minis && run.minis.size >= T.minis) feats.push('Alle Mini-Bosse');
  if (best && !first) feats.push('Neue Bestzeit');
  if (weekly) feats.push('Herausforderung der Woche');
  // Erfahrung als Zahl (über Stufenaufstiege hinweg geschätzt)
  let xp = c.xp - xp0;
  for (let l = lvl0; l < c.level; l++) xp += CFG.xpToNext(l);
  return {
    exp: run.exp, diff: run.diff, sec, best, first, weekly, kills: run.kills, deaths, bosses: 1 + run.minis.size, xp: Math.max(0, Math.round(xp)), gold: c.gold - gold0,
    items: items.map(it => ({ name: itemName(it), icon: ITEMS[it.base]?.icon ?? 'gem', rarity: it.rarity, qty: it.qty ?? 1 })),
    secrets: [run.secrets.size, T.secrets], minis: [run.minis.size, T.minis], feats, par, clears: totalClears(rec),
  };
}
