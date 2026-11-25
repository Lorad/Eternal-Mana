// Spieltest (0.8): Bots mit einem Spielermodell kämpfen sich durch das echte Spiel.  npx tsx scripts/playtest.ts [Abschnitt …] [--schnell] [--json datei]
//
// Abschnitte (ohne Angabe: alle):
//   tempo      Stufe entlang der Geschichte (gerechnet aus Questtabellen und Karten)
//   bosse      alle acht Story-Bosse: fünf Klassen × drei Spielertypen, allein; dazu drei Zweiergruppen
//   gebiete    alle 15 Zonen: Zeit je Gegner, Schaden, Tode/h, Tränke/h, Erfahrung/h, Gold/h
//   dungeons   ganze Dungeon-Durchläufe vom Eingang bis zum Boss
//   wirtschaft Einnahmen und Ausgaben über die Reise, Rohstoffe, Rezepte, die Gold drucken
//   kraft      was jede Stärkequelle auf Stufe 40 bringt – einzeln und zusammen
//   risse      Mana-Risse Stufe 1–30, Modifikatoren, Prüfung der Sieben, Neuer Kreis
//   welt       Weltbosse, seltene Monster, Ereignisse
// --schnell: weniger Wiederholungen (zum Ausprobieren). Das Spielermodell beschreibt scripts/playtest/model.ts.
import fs from 'node:fs';
import { CFG } from '../shared/src/config';
import { CLASSES, CLASS_IDS } from '../shared/src/data/classes';
import { BOSSES } from '../shared/src/data/enemies';
import { ZONE_LIST, ZONES } from '../shared/src/data/zones';
import type { ClassId } from '../shared/src/types';
import { Lab } from './playtest/lab';
import { BOSS_STOPS, CHAPTERS, measureBoss, measureZone, pacing, type BossRow, type ZoneRow } from './playtest/measure';
import { SKILL } from './playtest/model';
import { chapterTimes, dungeons, kraft, risse, welt, wirtschaft } from './playtest/sections';

const args = process.argv.slice(2);
const fast = args.includes('--schnell');
const jsonAt = args.indexOf('--json');
const jsonFile = jsonAt >= 0 ? args[jsonAt + 1] : null;
const sections = args.filter((a, i) => !a.startsWith('--') && (jsonAt < 0 || i !== jsonAt + 1));
const want = (s: string) => !sections.length || sections.includes(s);
const out: Record<string, unknown> = { version: CFG.version };

const pct = (x: number) => Math.round(x * 100) + ' %';
const f1 = (x: number) => x.toFixed(1);
const f0 = (x: number) => Math.round(x).toString();
function table(head: string[], rows: (string | number)[][]) {
  console.log('| ' + head.join(' | ') + ' |');
  console.log('|' + head.map(() => '---').join('|') + '|');
  for (const r of rows) console.log('| ' + r.join(' | ') + ' |');
  console.log('');
}
const CN: Record<ClassId, string> = { krieger: 'Krieger', magier: 'Magier', waldlaeufer: 'Waldläufer', paladin: 'Paladin', schattenjaeger: 'Schattenjäger' };
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

function tempo() {
  console.log('## Tempo – Stufe entlang der Geschichte\n');
  for (const [name, side, kills] of [['Nebenaufgaben größtenteils erledigt', 0.8, 60], ['nur die Hauptlinie', 0, 35]] as const) {
    console.log(`**${name}** (${kills} Gegner je Oberwelt-Gebiet, dazu alle Gegner des Dungeons)\n`);
    const rows = pacing(side, kills);
    table(['Kapitel', 'Gebiet (Stufe)', 'Stufe bei Ankunft', 'Stufe am Boss', 'Boss-Stufe', 'Stufe danach', 'EP Aufgaben', 'EP Gegner', 'EP Boss', 'Gold'],
      rows.map(r => [r.ch, `${r.name} (${r.zone[0]}–${r.zone[1]})`, r.enter, r.atBoss, r.bossLevel, r.leave, f0(r.xpQuests), f0(r.xpKills), f0(r.xpBoss), f0(r.gold)]));
    (out.tempo ??= {} as any), ((out.tempo as any)[name] = rows);
  }
}

function bosse(lab: Lab) {
  console.log('## Bosse der Geschichte – allein\n');
  const n = fast ? 4 : 10;
  const rows: BossRow[] = [];
  for (const stop of BOSS_STOPS) {
    for (const sk of [SKILL.sorgsam, SKILL.mittel, SKILL.achtlos]) for (const cls of CLASS_IDS) rows.push(measureBoss(lab, stop, [cls], sk, n));
    const b = BOSSES[stop.boss];
    console.log(`**${b.name}** (Stufe ${b.level}, ${f0(CFG.enemy.hp(b.level) * b.hpMul)} Leben) – Spieler auf Stufe ${stop.level}, typische Ausrüstung, 6 Heiltränke\n`);
    table(['Klasse', 'Sieg sorgfältig', 'Sieg durchschn.', 'Sieg unachtsam', 'Dauer (s)', 'Tränke', 'Schaden (× eigenes Leben): sorgfältig / durchschn. / unachtsam', 'woran es liegt (Schaden je Kampf, durchschn.)'],
      CLASS_IDS.map(cls => {
        const g = (s: string) => rows.find(r => r.boss === stop.boss && r.cls === cls && r.skill === s)!;
        const m = g('mittel');
        return [CN[cls], pct(g('sorgsam').win), pct(m.win), pct(g('achtlos').win), f0(m.time || m.loseTime), f1(m.potions), `${f1(g('sorgsam').taken)} / ${f1(m.taken)} / ${f1(g('achtlos').taken)}`, m.top.map(([k, v]) => `${k} ${v}`).join(', ')];
      }));
  }
  out.bosse = rows;
  // Überblick und der Fall „nur die Hauptlinie“ (Spieler kommt mit niedrigerer Stufe an)
  console.log('## Bosse der Geschichte – Überblick\n');
  const low = pacing(0, 35), lrows: BossRow[] = [];
  BOSS_STOPS.forEach((stop, i) => { for (const cls of CLASS_IDS) lrows.push(measureBoss(lab, stop, [cls], SKILL.mittel, fast ? 2 : 5, { level: low[i].atBoss })); });
  table(['Boss', 'Stufe Boss / Spieler', 'Sieg sorgfältig', 'Sieg durchschn.', 'Sieg unachtsam', 'Dauer (s)', 'Dauer schnellste / langsamste Klasse', 'Tränke', 'nur Hauptlinie: Spielerstufe · Sieg durchschn. · Dauer'],
    BOSS_STOPS.map((stop, i) => {
      const g = (s: string) => rows.filter(r => r.boss === stop.boss && r.skill === s), m = g('mittel'), t = m.filter(r => r.time > 0).map(r => r.time), l = lrows.filter(r => r.boss === stop.boss);
      return [BOSSES[stop.boss].name, `${BOSSES[stop.boss].level} / ${stop.level}`, pct(mean(g('sorgsam').map(r => r.win))), pct(mean(m.map(r => r.win))), pct(mean(g('achtlos').map(r => r.win))), f0(mean(t)), `${f0(Math.min(...t))} / ${f0(Math.max(...t))}`, f1(mean(m.map(r => r.potions))),
        `${low[i].atBoss} · ${pct(mean(l.map(r => r.win)))} · ${f0(mean(l.filter(r => r.time > 0).map(r => r.time)))} s`];
    }));
  out.bosseHauptlinie = lrows;
  console.log('## Bosse der Geschichte – zu zweit (durchschnittliche Spieler)\n');
  const duos: ClassId[][] = [['krieger', 'magier'], ['paladin', 'schattenjaeger'], ['waldlaeufer', 'waldlaeufer']];
  const drows: BossRow[] = [];
  for (const stop of BOSS_STOPS) for (const d of duos) drows.push(measureBoss(lab, stop, d, SKILL.mittel, fast ? 3 : 6));
  table(['Boss', ...duos.map(d => d.map(c => CN[c]).join(' + ') + ': Sieg / Dauer / Tode')],
    BOSS_STOPS.map(stop => [BOSSES[stop.boss].name, ...duos.map(d => { const r = drows.find(x => x.boss === stop.boss && x.cls === d.join('+'))!; return `${pct(r.win)} / ${f0(r.time || r.loseTime)} s / ${f1(r.deaths)}`; })]));
  out.duos = drows;
}

function gebiete(lab: Lab) {
  console.log('## Gebiete – gewöhnliche Gegner (echte Gruppen der Karte, Spieler auf Gebietsstufe, typische Ausrüstung)\n');
  const rows: ZoneRow[] = [];
  const seeds = fast ? 1 : 2, packs = fast ? 6 : 10;
  for (const zd of ZONE_LIST) for (const sk of [SKILL.mittel, SKILL.achtlos]) for (const cls of CLASS_IDS) rows.push(measureZone(lab, zd.id, cls, sk, seeds, packs));
  const of = (z: string, s: string) => rows.filter(r => r.zone === z && r.skill === s);
  table(['Zone', 'St.', 's/Gegner', 's/Erwachter', 'Schaden je Gruppe (× Leben)', 'Tode/h durchschn.', 'Tode/h unachtsam', 'Tränke/h', 'EP/h', 'Gold/h', 'Beutewert/h', 'Gegner/h'],
    ZONE_LIST.map(zd => {
      const m = of(zd.id, 'mittel'), a = of(zd.id, 'achtlos');
      return [zd.name, m[0].level, f1(mean(m.map(r => r.ttk))), f1(mean(m.filter(r => r.ttkElite > 0).map(r => r.ttkElite))), f1(mean(m.map(r => r.taken))), f1(mean(m.map(r => r.deathsH))), f1(mean(a.map(r => r.deathsH))),
        f1(mean(m.map(r => r.potionsH))), f0(mean(m.map(r => r.xpH))), f0(mean(m.map(r => r.goldH))), f0(mean(m.map(r => r.lootH))), f0(mean(m.map(r => r.killsH)))];
    }));
  console.log('**Je Klasse** (durchschnittlicher Spieler): s/Gegner · Schaden je Gruppe (× Leben) · Tode/h\n');
  table(['Zone', ...CLASS_IDS.map(c => CN[c])],
    ZONE_LIST.map(zd => [zd.name, ...CLASS_IDS.map(c => { const r = rows.find(x => x.zone === zd.id && x.cls === c && x.skill === 'mittel')!; return `${f1(r.ttk)} · ${f1(r.taken)} · ${f1(r.deathsH)}`; })]));
  out.gebiete = rows.map(r => ({ ...r, raw: undefined }));
  return rows;
}

function main() {
  console.log(`# Spieltest – Eternal Mana ${CFG.version}\n`);
  console.log('Spielermodell: sorgfältig (Reaktion 0,25 s, übersieht 3 % der Markierungen), durchschnittlich (0,35 s, 10 %), unachtsam (0,55 s, 30 %). Einzelheiten: scripts/playtest/model.ts\n');
  const lab = new Lab();
  const t0 = Date.now();
  try {
    if (want('tempo')) tempo();
    if (want('bosse')) bosse(lab);
    const zr = want('gebiete') || want('wirtschaft') || want('welt') ? gebiete(lab) : undefined;
    if (want('dungeons') || want('tempo')) dungeons(lab, out, fast);
    if (out.dungeons && out.bosse && zr) chapterTimes(out, zr, out.dungeons as any[], out.bosse as any[]);
    if (want('wirtschaft')) wirtschaft(lab, out, fast, zr);
    if (want('kraft')) kraft(lab, out, fast);
    if (want('risse')) risse(lab, out, fast);
    if (want('welt')) welt(lab, out, fast, zr);
  } finally { lab.close(); }
  if (jsonFile) fs.writeFileSync(jsonFile, JSON.stringify(out, null, 1));
  console.error(`(${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  void CLASSES; void ZONES; void CHAPTERS;
}
main();
