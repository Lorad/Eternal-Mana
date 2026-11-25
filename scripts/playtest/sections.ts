/**
 * Weitere Abschnitte des Spieltests: Endspiel (Risse, Prüfung, Neuer Kreis), Lebendige Welt, Stärkequellen, Wirtschaft.
 * Jede Funktion gibt Tabellen aus und legt ihre Zahlen in `out` ab.
 */
import { SLOTS } from '../../shared/src/types';
import { CFG } from '../../shared/src/config';
import { applyTimed } from '../../server/src/craft';
import { enchantCost, infusePlan, makeLegendary, makeSetPiece, recipeCost } from '../../shared/src/craft';
import { CLASS_IDS } from '../../shared/src/data/classes';
import { BOSSES, ENEMIES } from '../../shared/src/data/enemies';
import { FACTION_LIST } from '../../shared/src/data/factions';
import { HOME_LEVELS } from '../../shared/src/data/home';
import { ITEMS, TIER_MATERIAL, itemPrice, sellPrice } from '../../shared/src/data/items';
import { BIOME_MATS, TIER_INGREDIENT, TIER_MONSTER } from '../../shared/src/data/materials';
import { RARE_LIST, WORLD_BOSS_LIST } from '../../shared/src/data/rares';
import { ENCHANTS, RECIPE_LIST } from '../../shared/src/data/recipes';
import { QUELL_TRACKS, RIFT_MOD_LIST, TRIAL_ID, riftPar, type RiftModId } from '../../shared/src/data/rifts';
import { ZONES } from '../../shared/src/data/zones';
import { computeStats } from '../../shared/src/stats';
import type { CharData, ClassId } from '../../shared/src/types';
import { Rng } from '../../shared/src/util/rng';
import { plausibleChar } from './chars';
import type { Lab } from './lab';
import { BOSS_STOPS, measureZone, pacing, type ZoneRow } from './measure';
import { SKILL } from './model';
import { buffUp, dungeonRun, echoFight, riftChar, riftRun, type RunResult } from './runs';
import { dummyDps, eventFight, rareFight, worldBoss } from './world';

export const CN: Record<ClassId, string> = { krieger: 'Krieger', magier: 'Magier', waldlaeufer: 'Waldläufer', paladin: 'Paladin', schattenjaeger: 'Schattenjäger' };
const pct = (x: number) => Math.round(x * 100) + ' %';
const f1 = (x: number) => x.toFixed(1);
const f2 = (x: number) => x.toFixed(2);
const f0 = (x: number) => Math.round(x).toString();
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
export function table(head: string[], rows: (string | number)[][]) {
  console.log('| ' + head.join(' | ') + ' |');
  console.log('|' + head.map(() => '---').join('|') + '|');
  for (const r of rows) console.log('| ' + r.join(' | ') + ' |');
  console.log('');
}
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

// =====================================================================================================================
//  Dungeons der Geschichte: ganzer Durchlauf
// =====================================================================================================================
export function dungeons(lab: Lab, out: Record<string, unknown>, fast: boolean) {
  console.log('## Dungeons der Geschichte – ganzer Durchlauf (Eingang → Schlüssel → Tür → Boss; ohne Rätsel, Truhen und Lesen)\n');
  const n = fast ? 1 : 3, rows: (string | number)[][] = [], data: unknown[] = [];
  for (const stop of BOSS_STOPS) {
    const cells: string[] = [];
    for (const sk of [SKILL.mittel, SKILL.achtlos]) {
      const rs: RunResult[] = [];
      for (const cls of CLASS_IDS) for (let s = 1; s <= n; s++) rs.push(dungeonRun(lab, stop.zone, [plausibleChar(cls, stop.level, { seed: s })], sk, s * 7 + 1));
      data.push({ zone: stop.zone, skill: sk.id, ok: mean(rs.map(r => +r.ok)), sec: mean(rs.filter(r => r.ok).map(r => r.sec)), deaths: mean(rs.map(r => r.deaths)), stuck: rs.filter(r => r.stuck).length, potions: mean(rs.map(r => r.potions)) });
      cells.push(`${pct(mean(rs.map(r => +r.ok)))} · ${mmss(mean(rs.filter(r => r.ok).map(r => r.sec)))} · ${f1(mean(rs.map(r => r.deaths)))} · ${f1(mean(rs.map(r => r.potions)))}${rs.some(r => r.stuck) ? ' (hängt ' + rs.filter(r => r.stuck).length + '×)' : ''}`);
    }
    rows.push([ZONES[stop.zone].name, stop.level, ...cells]);
  }
  table(['Dungeon', 'St.', 'durchschn.: geschafft · Dauer · Tode · Tränke', 'unachtsam: geschafft · Dauer · Tode · Tränke'], rows);
  out.dungeons = data;
}

// =====================================================================================================================
//  Endspiel
// =====================================================================================================================
const NEUTRAL: RiftModId[][] = [['finsternis'], ['finsternis', 'erwacht'], ['finsternis', 'erwacht', 'horde']];
const neutralMods = (stufe: number) => NEUTRAL[CFG.rift.modCount(stufe) - 1];

export function risse(lab: Lab, out: Record<string, unknown>, fast: boolean) {
  const n = fast ? 1 : 3;
  const data: Record<string, unknown> = {};
  // ---- Echo-Kurve
  console.log('## Mana-Risse – das Echo am Ende (durchschnittlicher Spieler, allein; Modifikatoren ohne Einfluss auf den Bosskampf)\n');
  console.log('„Riss-Ausrüstung“: Beute der Stufe davor (Gegenstandsstufe 39 + Stufe, Episch, verbessert), Legendäre Waffe angeglichen, Echo-Runen ab 10, zwei Quellstufen je Riss-Stufe. „Geschichte“: Stufe 40 mit typischer Ausrüstung, Set, Runen, Speise, Elixier.\n');
  const stufen = fast ? [1, 10, 20, 30] : [1, 5, 10, 15, 20, 25, 30];
  const echoRows: unknown[] = [], rows: (string | number)[][] = [];
  for (const st of stufen) for (const gear of ['geschichte', 'riss'] as const) {
    if (gear === 'geschichte' && st > 10) continue;
    const rs: (RunResult & { firstTry: boolean; cls: string })[] = [];
    for (const cls of CLASS_IDS) for (let s = 1; s <= n; s++) {
      const r = echoFight(lab, s % 2 ? 'thron' : 'gletscherdom', st, [riftChar(cls, st, gear, s)], SKILL.mittel, s * 11 + st, neutralMods(st));
      if (r) rs.push({ ...r, cls });
    }
    const per = CLASS_IDS.map(c => { const x = rs.filter(r => r.cls === c); return `${pct(mean(x.map(r => +r.firstTry)))}`; });
    echoRows.push({ stufe: st, gear, first: mean(rs.map(r => +r.firstTry)), ok: mean(rs.map(r => +r.ok)), sec: mean(rs.filter(r => r.firstTry).map(r => r.bossSec)), deaths: mean(rs.map(r => r.deaths)), per: Object.fromEntries(CLASS_IDS.map(c => [c, mean(rs.filter(r => r.cls === c).map(r => +r.firstTry))])) });
    rows.push([st, CFG.rift.mobLevel(st) + CFG.rift.echo.levelPlus, gear === 'riss' ? 'Riss' : 'Geschichte', pct(mean(rs.map(r => +r.firstTry))), pct(mean(rs.map(r => +r.ok))), f0(mean(rs.filter(r => r.ok).map(r => r.bossSec / r.bossTries))), f1(mean(rs.map(r => r.deaths))), f1(mean(rs.map(r => r.potions))), per.join(' / ')]);
  }
  table(['Stufe', 'Echo-St.', 'Ausrüstung', 'Sieg im 1. Anlauf', 'Riss geschafft (3 Funken)', 'Kampfdauer (s)', 'Tode', 'Tränke', '1. Anlauf: Kr / Ma / Wl / Pa / Sj'], rows);
  data.echo = echoRows;

  // ---- ganze Risse und Richtzeit
  console.log('## Mana-Risse – ganzer Durchlauf und Richtzeit (Riss-Ausrüstung, Modifikatoren wie gewürfelt)\n');
  const runRows: (string | number)[][] = [], runData: unknown[] = [];
  for (const st of fast ? [1, 20] : [1, 10, 20, 30]) for (const d of ['wurzelgruft', 'gletscherdom', 'thron']) {
    const rs: RunResult[] = [];
    for (const cls of (fast ? ['krieger', 'magier'] : CLASS_IDS) as ClassId[]) for (let s = 1; s <= (fast ? 1 : 2); s++) { const r = riftRun(lab, d, st, [riftChar(cls, st, 'riss', s)], SKILL.mittel, s * 5 + st); if (r) rs.push(r); }
    const ok = rs.filter(r => r.ok);
    runData.push({ stufe: st, dungeon: d, par: riftPar(d, st), ok: ok.length / rs.length, sec: mean(ok.map(r => r.sec)), bonus: mean(rs.map(r => +!!r.bonus)), deaths: mean(rs.map(r => r.deaths)), stuck: rs.filter(r => r.stuck).length });
    runRows.push([st, ZONES[d].name, pct(ok.length / rs.length), mmss(mean(ok.map(r => r.sec))), mmss(riftPar(d, st)), pct(mean(rs.map(r => +!!r.bonus))), f1(mean(rs.map(r => r.deaths))), rs.filter(r => r.stuck).length || '']);
  }
  table(['Stufe', 'Dungeon', 'geschafft', 'Dauer', 'Richtzeit', 'unter Richtzeit', 'Tode', 'hängt'], runRows);
  data.runs = runData;

  // ---- Modifikatoren einzeln
  console.log('## Mana-Risse – jeder Modifikator einzeln (Stufe 8, Gletscherdom, Riss-Ausrüstung; durchschnittlicher / unachtsamer Spieler)\n');
  const modRows: (string | number)[][] = [], modData: unknown[] = [];
  const modRun = (mods: RiftModId[], stufe: number, classes: ClassId[], seeds: number) => {
    const res: Record<string, RunResult[]> = { mittel: [], achtlos: [] };
    for (const sk of [SKILL.mittel, SKILL.achtlos]) for (const cls of classes) for (let s = 1; s <= seeds; s++) { const r = riftRun(lab, 'gletscherdom', stufe, [riftChar(cls, stufe, 'riss', s)], sk, s * 3 + 1, mods); if (r) res[sk.id].push(r); }
    return res;
  };
  const cls3: ClassId[] = fast ? ['krieger', 'magier'] : ['krieger', 'magier', 'waldlaeufer', 'paladin', 'schattenjaeger'];
  for (const m of RIFT_MOD_LIST) {
    const r = modRun([m.id], 8, cls3, fast ? 1 : 2);
    const a = r.mittel, c = r.achtlos;
    modData.push({ mod: m.id, ok: mean(a.map(x => +x.ok)), sec: mean(a.filter(x => x.ok).map(x => x.sec)), deaths: mean(a.map(x => x.deaths)), potions: mean(a.map(x => x.potions)), okCareless: mean(c.map(x => +x.ok)), deathsCareless: mean(c.map(x => x.deaths)) });
    modRows.push([m.name, pct(mean(a.map(x => +x.ok))), mmss(mean(a.filter(x => x.ok).map(x => x.sec))), f1(mean(a.map(x => x.deaths))), f1(mean(a.map(x => x.potions))), pct(mean(c.map(x => +x.ok))), f1(mean(c.map(x => x.deaths)))]);
  }
  table(['Modifikator', 'geschafft', 'Dauer', 'Tode', 'Tränke', 'unachtsam: geschafft', 'unachtsam: Tode'], modRows);
  data.mods = modData;

  console.log('## Mana-Risse – harte Kombinationen (Stufe 22, drei Modifikatoren, Riss-Ausrüstung, durchschnittlicher Spieler)\n');
  const combos: RiftModId[][] = [['glas', 'sturm', 'hast'], ['glas', 'bersten', 'horde'], ['versiegt', 'glas', 'wucher'], ['duerre', 'wucher', 'versiegt'], ['horde', 'bersten', 'brand'], ['erwacht', 'hast', 'glas'], ['finsternis', 'erwacht', 'horde']];
  const comboRows: (string | number)[][] = [], comboData: unknown[] = [];
  for (const combo of fast ? combos.slice(0, 2) : combos) {
    const rs: RunResult[] = [];
    for (const cls of cls3) for (let s = 1; s <= (fast ? 1 : 2); s++) { const r = riftRun(lab, 'gletscherdom', 22, [riftChar(cls, 22, 'riss', s)], SKILL.mittel, s * 3 + 2, combo); if (r) rs.push(r); }
    if (!rs.length) continue;
    comboData.push({ combo, ok: mean(rs.map(x => +x.ok)), sec: mean(rs.filter(x => x.ok).map(x => x.sec)), deaths: mean(rs.map(x => x.deaths)) });
    comboRows.push([combo.map(id => RIFT_MOD_LIST.find(m => m.id === id)!.name).join(' + '), pct(mean(rs.map(x => +x.ok))), mmss(mean(rs.filter(x => x.ok).map(x => x.sec))), f1(mean(rs.map(x => x.deaths))), f1(mean(rs.map(x => x.potions)))]);
  }
  table(['Kombination', 'geschafft', 'Dauer', 'Tode', 'Tränke'], comboRows);
  data.combos = comboData;

  // ---- Prüfung der Sieben
  console.log('## Prüfung der Sieben (Riss-Ausrüstung der Stufe 16, allein)\n');
  const trialRows: (string | number)[][] = [], trialData: unknown[] = [];
  for (const sk of [SKILL.sorgsam, SKILL.mittel, SKILL.achtlos]) {
    const rs: (RunResult & { cls: string })[] = [];
    for (const cls of CLASS_IDS) for (let s = 1; s <= (fast ? 1 : 3); s++) { const r = echoFight(lab, TRIAL_ID, 0, [riftChar(cls, 16, 'riss', s)], sk, s * 9, undefined, 1800); if (r) rs.push({ ...r, cls }); }
    trialData.push({ skill: sk.id, ok: mean(rs.map(r => +r.ok)), sec: mean(rs.filter(r => r.ok).map(r => r.sec)), deaths: mean(rs.map(r => r.deaths)) });
    trialRows.push([sk.name, pct(mean(rs.map(r => +r.ok))), mmss(mean(rs.filter(r => r.ok).map(r => r.sec))), f1(mean(rs.map(r => r.deaths))), f1(mean(rs.map(r => r.potions))), CLASS_IDS.map(c => pct(mean(rs.filter(r => r.cls === c).map(r => +r.ok)))).join(' / ')]);
  }
  table(['Spieler', 'bestanden', 'Dauer', 'Tode', 'Tränke', 'Kr / Ma / Wl / Pa / Sj'], trialRows);
  data.trial = trialData;

  // ---- Neuer Kreis
  console.log('## Neuer Kreis – Bosse der Geschichte in Kreis 1–3 (durchschnittlicher Spieler, allein)\n');
  const kRows: (string | number)[][] = [], kData: unknown[] = [];
  const kGear: [number, string, (cls: ClassId, s: number) => CharData][] = [
    [1, 'Stufe 40, gute Ausrüstung (Episch +5)', (cls, s) => plausibleChar(cls, 40, { gear: 'gut', seed: s, potions: [8, 4] })],
    [2, 'Riss-Ausrüstung Stufe 10', (cls, s) => riftChar(cls, 10, 'riss', s)],
    [3, 'Riss-Ausrüstung Stufe 20', (cls, s) => riftChar(cls, 20, 'riss', s)],
  ];
  for (const [k, gname, mk] of kGear) for (const stop of BOSS_STOPS.filter(b => ['dornenmutter', 'ysolde', 'hohlkoenig', 'aetherion'].includes(b.boss))) {
    const rs = [];
    for (const cls of CLASS_IDS) for (let s = 1; s <= (fast ? 1 : 3); s++) { const c = mk(cls, s); c.kreis = k; rs.push(lab.bossFight(stop.zone, [c], SKILL.mittel, s * 17 + k)); }
    const b = BOSSES[stop.boss];
    kData.push({ kreis: k, boss: stop.boss, win: mean(rs.map(r => +r.win)), sec: mean(rs.filter(r => r.win).map(r => r.time)), potions: mean(rs.map(r => r.potions)) });
    kRows.push([k, gname, b.name, Math.max(b.level, CFG.kreis.floor) + k * CFG.kreis.levelPer, pct(mean(rs.map(r => +r.win))), f0(mean(rs.filter(r => r.win).map(r => r.time))), f1(mean(rs.map(r => r.potions))), f1(mean(rs.map(r => r.taken)))]);
  }
  table(['Kreis', 'Ausrüstung', 'Boss', 'Boss-St.', 'Sieg', 'Dauer (s)', 'Tränke', 'Schaden (× Leben)'], kRows);
  data.kreis = kData;
  out.risse = data;
}

// =====================================================================================================================
//  Lebendige Welt
// =====================================================================================================================
export function welt(lab: Lab, out: Record<string, unknown>, fast: boolean, zoneRows?: ZoneRow[]) {
  const n = fast ? 1 : 3, data: Record<string, unknown> = {};
  console.log('## Weltbosse (durchschnittliche Spieler, Stufe = Boss-Stufe − 1, typische Ausrüstung)\n');
  const groups: [string, ClassId[]][] = [['allein', ['krieger']], ['allein', ['magier']], ['zu zweit', ['krieger', 'magier']], ['zu viert', ['krieger', 'magier', 'paladin', 'waldlaeufer']]];
  const wbRows: (string | number)[][] = [], wbData: unknown[] = [];
  for (const wb of WORLD_BOSS_LIST) for (const zid of wb.zones) {
    const lvl = ZONES[zid].level[1] + 2;
    for (const [gname, party] of groups) {
      const rs = [];
      for (let s = 1; s <= n; s++) rs.push(worldBoss(lab, wb.id, zid, party.map((c, i) => plausibleChar(c, lvl - 1, { seed: s * 3 + i })), SKILL.mittel, s * 19 + 2));
      const w = rs.filter(r => r.win);
      wbData.push({ boss: wb.id, zone: zid, party: party.join('+'), win: w.length / rs.length, sec: mean(w.map(r => r.time)), deaths: mean(rs.map(r => r.deaths)), xp: mean(w.map(r => r.xp)), gold: mean(w.map(r => r.gold)), loot: mean(w.map(r => r.loot)), hp: rs[0].hp });
      wbRows.push([wb.name, `${ZONES[zid].name} (${lvl})`, `${gname}: ${party.map(c => CN[c]).join(', ')}`, f0(rs[0].hp), pct(w.length / rs.length), mmss(mean(w.map(r => r.time))), f1(mean(rs.map(r => r.deaths))), f0(mean(w.map(r => r.xp))), f0(mean(w.map(r => r.gold))), f0(mean(w.map(r => r.loot)))]);
    }
  }
  table(['Weltboss', 'Region (St.)', 'Gruppe', 'Leben', 'Sieg', 'Dauer', 'Tode', 'EP je Spieler', 'Gold', 'Beutewert'], wbRows);
  data.weltbosse = wbData;

  console.log('## Seltene Monster (allein, Stufe = Monsterstufe − 1; Krieger und Magier)\n');
  const rRows: (string | number)[][] = [], rData: unknown[] = [];
  for (const r of RARE_LIST) {
    const rs = [];
    for (const cls of ['krieger', 'magier'] as ClassId[]) for (let s = 1; s <= n; s++) rs.push(rareFight(lab, r.id, plausibleChar(cls, r.lvl - 1, { seed: s }), SKILL.mittel, s * 23 + 1));
    const w = rs.filter(x => x.win);
    rData.push({ id: r.id, win: w.length / rs.length, sec: mean(w.map(x => x.time)), taken: mean(rs.map(x => x.taken)), xp: mean(w.map(x => x.xp)), gold: mean(w.map(x => x.gold)), loot: mean(w.map(x => x.loot)) });
    rRows.push([ENEMIES[r.mob]?.name ?? r.id, `${ZONES[r.zone].name} (${r.lvl})`, r.trait, pct(w.length / rs.length), f0(mean(w.map(x => x.time))), f1(mean(rs.map(x => x.taken))), f1(mean(rs.map(x => x.potions))), f0(mean(w.map(x => x.xp))), f0(mean(w.map(x => x.gold + x.loot)))]);
  }
  table(['Seltenes Monster', 'Region (St.)', 'Eigenheit', 'Sieg', 'Dauer (s)', 'Schaden (× Leben)', 'Tränke', 'EP', 'Gold + Beutewert'], rRows);
  data.seltene = rData;

  console.log('## Ereignisse (Kampfereignisse; allein als Krieger / zu zweit Krieger + Magier, Stufe = Gebietsmitte)\n');
  const eRows: (string | number)[][] = [], eData: unknown[] = [];
  for (const [kind, zid] of [['woge', 'gruenwald'], ['woge', 'frost'], ['woge', 'schatten'], ['aschesturm', 'glut']] as const) {
    const lvl = Math.round((ZONES[zid].level[0] + ZONES[zid].level[1]) / 2);
    for (const party of [['krieger'], ['krieger', 'magier']] as ClassId[][]) {
      const rs = [];
      for (let s = 1; s <= n; s++) rs.push(eventFight(lab, kind, zid, party.map((c, i) => plausibleChar(c, lvl, { seed: s + i })), SKILL.mittel, s * 29 + 3));
      const w = rs.filter(x => x.win);
      eData.push({ kind, zone: zid, party: party.length, win: w.length / rs.length, sec: mean(w.map(x => x.time)), xp: mean(w.map(x => x.xp)), gold: mean(w.map(x => x.gold)), loot: mean(w.map(x => x.loot)), deaths: mean(rs.map(x => x.deaths)) });
      eRows.push([kind, `${ZONES[zid].name} (${lvl})`, party.length, pct(w.length / rs.length), mmss(mean(w.map(x => x.time))), f1(mean(rs.map(x => x.deaths))), f0(mean(w.map(x => x.xp))), f0(mean(w.map(x => x.gold))), f0(mean(w.map(x => x.loot)))]);
    }
  }
  table(['Ereignis', 'Region (St.)', 'Spieler', 'Erfolg', 'Dauer', 'Tode', 'EP je Spieler', 'Gold', 'Beutewert'], eRows);
  data.ereignisse = eData;

  if (zoneRows) {
    console.log('**Vergleich je Stunde** (Gold + Beutewert / Erfahrung): gewöhnliches Jagen im Gebiet gegenüber einem Weltboss-Sieg (allein) bzw. einem Ereignis, hochgerechnet auf die reine Kampfzeit\n');
    const rows: (string | number)[][] = [];
    for (const zid of ['gruenwald', 'glut', 'frost', 'schatten']) {
      const zr = zoneRows.filter(r => r.zone === zid && r.skill === 'mittel');
      const wb = (wbData as any[]).find(x => x.zone === zid && x.party === 'krieger');
      const ev = (eData as any[]).find(x => x.zone === zid && x.party === 1);
      rows.push([ZONES[zid].name, `${f0(mean(zr.map(r => r.goldH + r.lootH)))} / ${f0(mean(zr.map(r => r.xpH)))}`,
        wb && wb.sec ? `${f0((wb.gold + wb.loot) * 3600 / wb.sec)} / ${f0(wb.xp * 3600 / wb.sec)}` : '–', ev && ev.sec ? `${f0((ev.gold + ev.loot) * 3600 / ev.sec)} / ${f0(ev.xp * 3600 / ev.sec)}` : '–']);
    }
    table(['Region', 'Jagen: Wert/h / EP/h', 'Weltboss: Wert/h / EP/h', 'Ereignis: Wert/h / EP/h'], rows);
  }
  out.welt = data;
}

// =====================================================================================================================
//  Stärkequellen auf Stufe 40
// =====================================================================================================================
interface Layer { name: string; build?: (c: CharData, cls: ClassId, rng: Rng) => void; buff?: string[]; note?: string }
function ehp(c: CharData, buffs: string[] = []): number {
  const mods = buffs.map(b => ITEMS[b]?.use?.buff?.mods ?? {});
  const d = computeStats(c, mods);
  return d.maxHp / (1 - CFG.combat.mitigation(d.def, 40));
}
const fullQuell = () => ({ lvl: 60, xp: 0, pts: Object.fromEntries(QUELL_TRACKS.map(t => [t.id, CFG.quell.trackCap])) });
const setAll = (c: CharData, cls: ClassId, rng: Rng, id: string) => {
  const il = c.equip.helm!.ilvl;
  for (const [slot, piece] of [['helm', 'helm'], ['armor', 'armor'], ['ring1', 'ring'], ['amulet', 'amulet']] as const) {
    const old = c.equip[slot]!, it = makeSetPiece(rng, id, piece, cls, old.rarity);
    // gleiche Stufe, gleiche Seltenheit, gleiche Affixe wie das ersetzte Teil – gemessen wird nur der Setbonus
    it.ilvl = il; it.affixes = old.affixes; it.up = old.up; it.ench = old.ench;
    c.equip[slot] = it;
  }
};
export const LAYERS: Layer[] = [
  { name: 'Set „Hohle Krone“ (4 Teile)', build: (c, cls, rng) => setAll(c, cls, rng, 'hohlekrone') },
  { name: 'Set „Aschenglut“ (4 Teile)', build: (c, cls, rng) => setAll(c, cls, rng, 'aschenglut') },
  { name: 'Runen (Macht, 2× Lebenskraft, Eile, Weitsicht)', build: c => { c.equip.weapon!.ench = 'macht'; c.equip.helm!.ench = 'vital'; c.equip.armor!.ench = 'vital'; c.equip.ring1!.ench = 'eile'; c.equip.amulet!.ench = 'weitsicht'; } },
  { name: 'Echo-Runen (Macht, 2× Wacht, Einklang)', build: c => { c.equip.weapon!.ench = 'echo_macht'; c.equip.helm!.ench = 'echo_wacht'; c.equip.armor!.ench = 'echo_wacht'; c.equip.ring1!.ench = 'echo_einklang'; } },
  { name: 'Speise + Elixier (Feuerschoten-Spieß, Elixier der Glut)', buff: ['food_spiess', 'elx_power'] },
  { name: 'Festmahl + Elixier der Sieben', buff: ['food_fest', 'elx_sieben'] },
  { name: 'Element eingeschmiedet, Stufe 3 (Feuer; Übungsgegner ohne Schwäche)', build: c => { c.equip.weapon!.element = 'fire'; c.equip.weapon!.elv = 3; } },
  { name: 'Legendäre Waffe (statt der typischen, gleiche Stufe und Verbesserung)', build: (c, cls, rng) => { const w = makeLegendary(rng, cls, 40); w.up = c.equip.weapon!.up; c.equip.weapon = w; } },
  { name: 'Quellstufen (alle 60)', build: c => { c.quell = fullQuell(); } },
  { name: 'Verbesserung +10 auf allen Teilen (statt +4/+3; mit Zusatzeigenschaften und Passiven)', build: c => { for (const s of SLOTS) if (c.equip[s]) c.equip[s]!.up = 10; } },
  { name: 'Seltenheit Legendär auf allen Teilen (statt Selten/Ungewöhnlich)', build: (c, cls, rng) => { const g = plausibleChar(cls, 40, { gear: 'gut', seed: rng.int(1, 99) }); for (const s of SLOTS) { const it = g.equip[s]!; it.rarity = 4; it.up = c.equip[s]!.up; it.ilvl = c.equip[s]!.ilvl; c.equip[s] = it; } } },
  { name: 'Begleiter (Pilzling: +1,5 Leben/s) · Trophäen · Ausgeruht', note: 'kein Kampfwert: Regeneration, Gold, Erfahrung, Ruf' },
];

export function kraft(lab: Lab, out: Record<string, unknown>, fast: boolean) {
  console.log('## Stärkequellen auf Stufe 40 – jede einzeln und alle zusammen\n');
  console.log('Grundlage: typischer Charakter der Stufe 40 (Waffe/Rüstung Selten +4/+3, Schmuck Ungewöhnlich, Gegenstandsstufe 39). Schaden: volle Rotation 45 s gegen einen Übungsgegner der Stufe 40 ohne Schwäche. Aushalten: Leben ÷ (1 − Schadensminderung) gegen einen Gegner der Stufe 40.\n');
  const seeds = fast ? 1 : 2;
  const data: unknown[] = [];
  const base: Record<string, { dps: number; ehp: number }> = {};
  const measure = (cls: ClassId, mut: (c: CharData, rng: Rng) => void, buffs: string[]) => {
    let dps = 0, e = 0;
    for (let s = 1; s <= seeds; s++) {
      const c = plausibleChar(cls, 40, { seed: s });
      mut(c, new Rng(s * 41 + 5));
      dps += dummyDps(lab, [c], SKILL.mittel, s * 3 + 1, { prep: b => { for (const id of buffs) applyTimed(b.p, id, 99999); } }) / seeds;
      e += ehp(c, buffs) / seeds;
    }
    return { dps, ehp: e };
  };
  for (const cls of CLASS_IDS) base[cls] = measure(cls, () => {}, []);
  const rows: (string | number)[][] = [];
  const prod: Record<string, { dps: number; ehp: number }> = Object.fromEntries(CLASS_IDS.map(c => [c, { dps: 1, ehp: 1 }]));
  for (const L of LAYERS) {
    if (L.note) { rows.push([L.name, L.note, '', '']); continue; }
    const r = CLASS_IDS.map(cls => { const m = measure(cls, (c, rng) => L.build?.(c, cls, rng), L.buff ?? []); return { cls, d: m.dps / base[cls].dps, e: m.ehp / base[cls].ehp }; });
    data.push({ layer: L.name, per: r });
    rows.push([L.name, '×' + f2(mean(r.map(x => x.d))), '×' + f2(mean(r.map(x => x.e))), r.map(x => f2(x.d)).join(' / ')]);
    void prod;
  }
  // alles zusammen – einmal „Ende der Geschichte“ (was vor den Rissen erreichbar ist), einmal „Endspiel“ (Riss-Stufe 30)
  const story = (c: CharData, cls: ClassId, rng: Rng) => { setAll(c, cls, rng, 'hohlekrone'); const w = makeLegendary(rng, cls, 40); w.up = c.equip.weapon!.up; w.element = 'fire'; w.elv = 3; w.ench = 'macht'; c.equip.weapon = w; c.equip.helm!.ench = 'vital'; c.equip.armor!.ench = 'vital'; c.equip.ring1!.ench = 'eile'; c.equip.amulet!.ench = 'weitsicht'; };
  const sAll = CLASS_IDS.map(cls => { const m = measure(cls, (c, rng) => story(c, cls, rng), ['food_spiess', 'elx_power']); return { cls, d: m.dps / base[cls].dps, e: m.ehp / base[cls].ehp }; });
  rows.push(['**Alles vor den Rissen** (Set, Runen, Speise, Elixier, Element 3, Legendäre Waffe)', '**×' + f2(mean(sAll.map(x => x.d))) + '**', '**×' + f2(mean(sAll.map(x => x.e))) + '**', sAll.map(x => f2(x.d)).join(' / ')]);
  const eAll = CLASS_IDS.map(cls => {
    let dps = 0, e = 0;
    for (let s = 1; s <= seeds; s++) { const c = riftChar(cls, 30, 'riss', s); dps += dummyDps(lab, [c], SKILL.mittel, s * 3 + 1, { prep: buffUp }) / seeds; e += ehp(c, ['food_spiess', 'elx_power']) / seeds; }
    return { cls, d: dps / base[cls].dps, e: e / base[cls].ehp };
  });
  rows.push(['**Endspiel** (Riss-Ausrüstung der Stufe 30: Gegenstandsstufe 69, Episch +8, Legendäre Waffe, Echo-Runen, alle Quellstufen)', '**×' + f2(mean(eAll.map(x => x.d))) + '**', '**×' + f2(mean(eAll.map(x => x.e))) + '**', eAll.map(x => f2(x.d)).join(' / ')]);
  table(['Stärkequelle', 'Schaden', 'Aushalten', 'Schaden je Klasse: Kr / Ma / Wl / Pa / Sj'], rows);
  data.push({ layer: 'alles vor den Rissen', per: sAll }, { layer: 'endspiel', per: eAll });

  // ---- Klassen im Vergleich und Legendäre Waffen
  console.log('**Klassen im Vergleich** (Stufe 40, typische Ausrüstung) und **Sonderwirkung der Legendären Waffen**: dieselbe Waffe einmal mit, einmal ohne Sonderwirkung (gleiche Werte, Feuer Stufe 3) – gegen einen und gegen drei Übungsgegner\n');
  const legendRows: (string | number)[][] = [];
  const mageSolo = base.magier.dps;
  const dps = (cls: ClassId, mut: (c: CharData, rng: Rng) => void, count: number) => { let d = 0; for (let s = 1; s <= seeds; s++) { const c = plausibleChar(cls, 40, { seed: s }); mut(c, new Rng(s * 41 + 5)); d += dummyDps(lab, [c], SKILL.mittel, s * 3 + 1, { count }) / seeds; } return d; };
  for (const cls of CLASS_IDS) {
    const leg = (plain: boolean) => (c: CharData, rng: Rng) => { const w = makeLegendary(rng, cls, 40); w.up = c.equip.weapon!.up; w.element = 'fire'; w.elv = 3; if (plain) w.base = c.equip.weapon!.base; c.equip.weapon = w; };
    const l1 = dps(cls, leg(false), 1) / dps(cls, leg(true), 1), l3 = dps(cls, leg(false), 3) / dps(cls, leg(true), 3);
    let duo = 0;
    for (let s = 1; s <= seeds; s++) { const a = plausibleChar(cls, 40, { seed: s }), b = plausibleChar('magier', 40, { seed: s + 50 }); a.equip.weapon!.element = 'wind'; a.equip.weapon!.elv = 2; duo += dummyDps(lab, [a, b], SKILL.mittel, s * 3 + 2) / seeds; }
    const soloWind = dps(cls, c => { c.equip.weapon!.element = 'wind'; c.equip.weapon!.elv = 2; }, 1);
    legendRows.push([CN[cls], f0(base[cls].dps), f0(dps(cls, () => {}, 3)), f0(base[cls].ehp), '×' + f2(l1), '×' + f2(l3), '×' + f2(duo / (soloWind + mageSolo))]);
    data.push({ cls, dps: base[cls].dps, ehp: base[cls].ehp, legend1: l1, legend3: l3, duo: duo / (soloWind + mageSolo) });
  }
  table(['Klasse', 'Schaden/s (1 Ziel)', 'Schaden/s (3 Ziele)', 'Aushalten', 'Sonderwirkung Legendäre Waffe, 1 Ziel', '… 3 Ziele', 'Duo mit Magier (Windwaffe): Summe gegenüber Einzelwerten'], legendRows);
  out.kraft = data;
}

// =====================================================================================================================
//  Wirtschaft
// =====================================================================================================================
export function wirtschaft(lab: Lab, out: Record<string, unknown>, fast: boolean, zoneRows?: ZoneRow[]) {
  console.log('## Wirtschaft – Einnahmen und Ausgaben über die Reise\n');
  const zr = zoneRows ?? ['gruenwald', 'kristall', 'glut', 'frost', 'ruinen', 'schatten', 'quellgrund'].flatMap(z => (['krieger', 'magier'] as ClassId[]).map(c => measureZone(lab, z, c, SKILL.mittel, fast ? 1 : 2, fast ? 6 : 10)));
  const pace = pacing(0.8, 60);
  const data: Record<string, unknown> = {};
  // ---- Einnahmen je Kapitel: Aufgaben + Boss (Tabelle) und Gegner (gemessen: Gold und Beutewert je Gegner × Gegner des Kapitels)
  const regions = ['gruenwald', 'kristall', 'glut', 'frost', 'ruinen', 'schatten', 'schatten', 'quellgrund'];
  let cum = 0;
  const rows: (string | number)[][] = [];
  const upg = (ilvl: number, to: number) => { let g = 0, m = 0; for (let u = 0; u < to; u++) { g += CFG.upgrade.gold(ilvl, u) / CFG.upgrade.chance[u]; m += CFG.upgrade.mats(u) / CFG.upgrade.chance[u]; } return { g, m }; };
  const incomeRows: unknown[] = [];
  pace.forEach((p, i) => {
    const z = zr.filter(r => r.zone === regions[i]);
    const perKill = mean(z.map(r => (r.goldH + r.lootH) / Math.max(1, r.killsH)));
    const mob = perKill * p.kills;
    const quest = p.gold - 0; // enthält Aufgaben, Boss und (gerechnet) Gegnergold – das Gegnergold ersetzen wir durch die Messung
    const total = quest + mob * 0.6; // Beute wird nur zum Teil verkauft (Ausrüstung behält man, Rohstoffe verbraucht man)
    cum += total;
    const il = p.atBoss, t = Math.min(6, 1 + Math.floor((il - 1) / 5));
    const want = upg(il, 3).g * 2 + upg(il, 2).g * 3 + CFG.craft.gearGold(t) * 2 + (ENCHANTS.macht.gold + ENCHANTS.vital.gold * 2) * (il >= 11 ? 1 : 0.4) + CFG.craft.infuseGold(il, 1) + CFG.craft.infuseGold(il, 2) + 6 * (il <= 8 ? 18 : il <= 20 ? 55 : 140);
    incomeRows.push({ ch: p.ch, income: total, sinks: want, cum });
    rows.push([p.ch, p.name, f0(quest), f0(mob), f0(total), f0(cum), f0(want), pct(want / total)]);
  });
  console.log('Einnahmen: Aufgaben, Boss und Gegnergold laut Tabellen, dazu der gemessene Verkaufswert der Beute (zu 60 % angesetzt – den Rest behält oder verbraucht man). Ausgaben „gut versorgt“: zwei Teile auf +3 und drei auf +2 verbessern, zwei Teile schmieden, drei Runen, Element bis Stufe 2, sechs Heiltränke.\n');
  table(['Kapitel', 'Gebiet', 'Aufgaben + Boss + Gegnergold', 'Beutewert (gemessen)', 'Einnahmen', 'kumuliert', 'Ausgaben „gut versorgt“', 'Anteil'], rows);
  data.income = incomeRows;

  // ---- Einzelpreise
  console.log('**Was die Dinge kosten** (Gold; Verbesserung mit Fehlversuchen eingerechnet)\n');
  table(['Posten', 'Stufe 10', 'Stufe 20', 'Stufe 30', 'Stufe 40'], [
    ['Verbessern +0 → +5 (ein Teil)', ...[10, 20, 30, 40].map(l => f0(upg(l, 5).g))],
    ['Verbessern +5 → +10 (ein Teil)', ...[10, 20, 30, 40].map(l => f0(upg(l, 10).g - upg(l, 5).g))],
    ['Schmieden (ein Teil)', ...[10, 20, 30, 40].map(l => CFG.craft.gearGold(Math.min(6, 1 + Math.floor((l - 1) / 5))))],
    ['Umschmieden (Selten)', ...[10, 20, 30, 40].map(l => CFG.craft.reforgeGold(l, 2))],
    ['Element einschmieden Stufe 1 + 2 + 3', ...[10, 20, 30, 40].map(l => CFG.craft.infuseGold(l, 1) + CFG.craft.infuseGold(l, 2) + CFG.craft.infuseGold(l, 3))],
    ['Zurücksetzen (Fenwick)', ...[10, 20, 30, 40].map(l => CFG.respecGold(l))],
    ['Einnahmen je Stunde Jagen (Gold + Beutewert)', ...['kristall', 'frost', 'schatten', 'quellgrund'].map(z => f0(mean(zr.filter(r => r.zone === z).map(r => r.goldH + r.lootH))))],
  ]);
  const homeTotal = HOME_LEVELS.reduce((a, l) => a + l.gold, 0);
  const legend = RECIPE_LIST.find(r => r.id === 'f_legend_krieger')!;
  console.log(`**Große Ziele:** Hof ${HOME_LEVELS[0].gold} + Ausbau ${HOME_LEVELS.slice(1).map(l => l.gold).join(' + ')} = ${homeTotal} Gold · Legendäre Waffe ${legend.gold} Gold (+ sechs Bosskerne, 3 Ätherstaub, 12 Leerenessenz) · alle fünf Teile +10 auf Stufe 40: ${f0(upg(40, 10).g * 5)} Gold · vier Echo-Runen: ${ENCHANTS.echo_macht.gold + ENCHANTS.echo_wacht.gold * 2 + ENCHANTS.echo_einklang.gold} Gold\n`);
  const endIncome = cum;
  console.log(`Bis zum Ende der Geschichte nimmt ein Spieler mit Nebenaufgaben rund ${f0(endIncome)} Gold ein. Davon gehen für „gut versorgt“ ${f0((incomeRows as any[]).reduce((a, r) => a + r.sinks, 0))} ab.\n`);
  data.goals = { home: homeTotal, legend: legend.gold, plus10: upg(40, 10).g * 5, endIncome };

  // ---- Rohstoffe: Angebot (gemessen, je Stunde Jagen) gegen Bedarf
  console.log('**Rohstoffe je Gebiet** – Angebot je Stunde Jagen (gemessen, ohne Abbaustellen) gegenüber dem Bedarf für „ein Satz Ausrüstung schmieden (5 Teile) und zwei Teile auf +5“\n');
  const matRows: (string | number)[][] = [], matData: unknown[] = [];
  ['gruenwald', 'kristall', 'glut', 'frost', 'ruinen', 'schatten'].forEach((zid, t) => {
    const z = zr.filter(r => r.zone === zid);
    const hours = z.reduce((a, r) => a + r.raw.reduce((x, f) => x + f.fightSec + f.travelSec, 0), 0) / 3600;
    const cnt = (id: string) => z.reduce((a, r) => a + r.raw.reduce((x, f) => x + (f.items.get(id) ?? 0), 0), 0) / Math.max(1e-9, hours);
    const ore = TIER_MATERIAL[t], mon = TIER_MONSTER[t], ing = TIER_INGREDIENT[t], bio = BIOME_MATS[ZONES[zid].biome];
    const ess = z.reduce((a, r) => a + r.raw.reduce((x, f) => x + [...f.items.entries()].filter(([k]) => k.startsWith('ess_')).reduce((s, [, v]) => s + v, 0), 0), 0) / Math.max(1e-9, hours);
    const needOre = 6 + 4 + 6 + 3 + 3 + Math.round(upg(1, 5).m * 2), needMon = 4 + 2 + 3 + 3 + 3;
    matData.push({ zone: zid, ore: cnt(ore), monster: cnt(mon), ingredient: cnt(ing), essences: ess, needOre, needMon });
    matRows.push([ZONES[zid].name, `${f0(cnt(ore))} (${ITEMS[ore].name})`, `${f0(cnt(mon))} (${ITEMS[mon].name})`, `${f0(cnt(ing))} (${ITEMS[ing].name})`, f0(ess), `${needOre} Erz, ${needMon} Monster-Rohstoff`]);
    void bio;
  });
  table(['Gebiet', 'Erz/h', 'Monster-Rohstoff/h', 'Zutat/h', 'Essenzen/h', 'Bedarf'], matRows);
  data.mats = matData;

  // ---- Rezepte, die Gold drucken
  const buy = (id: string): number | null => {
    // günstigster Einkauf: Fraktionshändler (ohne Rabatt bis zum höchsten Rabatt) – Rohstoffe gibt es sonst nirgends zu kaufen
    let best: number | null = null;
    for (const f of FACTION_LIST) for (const o of f.stock) if (o.item === id) { const p = Math.max(1, Math.floor(o.price * (1 - CFG.living.rep.discount[4]))); if (best === null || p < best) best = p; }
    const b = ITEMS[id];
    if (best === null && b && b.kind === 'consumable' && b.price > 0 && /^potion_(hp|mp)[123]$|^elixir$|^food_bread$/.test(id)) best = b.price;
    return best;
  };
  const printers: (string | number)[][] = [], adders: { id: string; gain: number }[] = [];
  for (const r of RECIPE_LIST) {
    if (r.out.k !== 'item') continue;
    const o = ITEMS[r.out.item];
    if (!o) continue;
    const sell = Math.max(1, Math.floor(o.price * CFG.loot.sellFactor)) * r.out.qty;
    const cost = recipeCost(r);
    let buyAll: number | null = cost.gold, sellIn = 0;
    for (const [b, n] of cost.mats) { const p = buy(b); if (p === null) buyAll = null; else if (buyAll !== null) buyAll += p * n; sellIn += Math.max(1, Math.floor((ITEMS[b]?.price ?? 0) * CFG.loot.sellFactor)) * n; }
    if (buyAll !== null && sell > buyAll) printers.push([r.id, o.name, sell, buyAll]);
    adders.push({ id: r.id, gain: sell - sellIn - cost.gold });
  }
  const best = adders.sort((a, b) => b.gain - a.gain).slice(0, 5);
  console.log(`**Rezepte, die Gold drucken** (Zutaten beim Fraktionshändler mit höchstem Rabatt kaufen, Ergebnis verkaufen): ${printers.length ? printers.map(p => `${p[1]} (${p[0]}): Verkauf ${p[2]} > Einkauf ${p[3]}`).join('; ') : 'keines'}.`);
  console.log(`Größter Mehrwert beim Verarbeiten selbst gesammelter Rohstoffe (Verkauf Ergebnis − Verkauf Zutaten − Gebühr): ${best.map(b => `${b.id} ${b.gain >= 0 ? '+' : ''}${b.gain}`).join(', ')}.\n`);
  // Ausrüstung schmieden und verkaufen
  const forgeRows: (string | number)[][] = [];
  for (let t = 1; t <= 6; t++) {
    const il = t * 5 > 30 ? 40 : t * 5;
    const w = CFG.craft.gearWeights, tot = w.reduce((a, b) => a + b, 0);
    let ev = 0;
    for (let rar = 0; rar < w.length; rar++) ev += (w[rar] / tot) * Math.floor(itemPrice({ uid: '', base: `w_sword_${t}`, rarity: rar, ilvl: il, up: 0, affixes: [] }) * CFG.loot.sellFactor);
    const matSell = 6 * Math.floor(ITEMS[TIER_MATERIAL[t - 1]].price * 0.25) + 4 * Math.floor(ITEMS[TIER_MONSTER[t - 1]].price * 0.25);
    forgeRows.push([t, il, CFG.craft.gearGold(t), matSell, f0(ev), f0(ev - CFG.craft.gearGold(t) - matSell)]);
  }
  console.log('**Waffe schmieden und verkaufen** (Erwartungswert über die Seltenheiten)\n');
  table(['Materialstufe', 'Gegenstandsstufe', 'Gebühr', 'Verkaufswert der Rohstoffe', 'Verkaufswert der Waffe', 'Gewinn'], forgeRows);
  data.printers = printers;
  void enchantCost; void infusePlan;
  out.wirtschaft = data;
}

/** Zeit je Kapitel – aus den gemessenen Kampfzeiten und Dungeon-Durchläufen (ohne Gespräche, Rätsel, Erkunden). */
export function chapterTimes(out: Record<string, unknown>, zoneRows: ZoneRow[], dungeonData: any[], bossRows: any[]) {
  console.log('## Tempo – Kampfzeit je Kapitel (gemessen; ohne Gespräche, Wege zu den Auftraggebern, Rätsel und Erkunden)\n');
  const pace = pacing(0.8, 60);
  const regions = ['gruenwald', 'kristall', 'glut', 'frost', 'ruinen', 'schatten', 'schatten', 'quellgrund'];
  const rows: (string | number)[][] = [];
  pace.forEach((p, i) => {
    const z = zoneRows.filter(r => r.zone === regions[i] && r.skill === 'mittel');
    const killsH = mean(z.map(r => r.killsH));
    const stop = BOSS_STOPS[i];
    const d = dungeonData.find(x => x.zone === stop.zone && x.skill === 'mittel');
    const b = bossRows.filter(x => x.boss === stop.boss && x.skill === 'mittel' && x.party === 1);
    const ow = ((i === 6 ? 30 : 60) / Math.max(1, killsH)) * 60;
    rows.push([p.ch, p.name, f1(ow), d ? f1(d.sec / 60) : '–', f0(mean(b.map(x => x.time || x.loseTime))), pct(mean(b.map(x => x.win))), f1(ow + (d ? d.sec / 60 : 0))]);
  });
  table(['Kapitel', 'Gebiet', 'Oberwelt: 60 Gegner (min)', 'Dungeon samt Boss (min)', 'davon Bosskampf (s)', 'Boss-Sieg im 1. Anlauf', 'Kampfzeit gesamt (min)'], rows);
  out.kapitelzeit = rows;
}
