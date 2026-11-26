// Spieltest der Expeditionen (0.9): ganze Läufe, Dauer nach Spielertyp, allein und zu zweit.
//   npx tsx scripts/exp-playtest.ts [exp_id …] [--schnell] [--json datei]
//   npx tsx scripts/exp-playtest.ts --endspiel [--schnell]   (0.11: Endspiel-Expeditionen je Grad und Tiefen, Ausrüstung aus den Rissen)
// Auch als Abschnitt „expeditionen“ von scripts/playtest.ts.
import fs from 'node:fs';
import { EXPEDITION_LIST, EXPEDITIONS } from '../shared/src/data/expeditions';
import type { ClassId } from '../shared/src/types';
import { Rng } from '../shared/src/util/rng';
import { plausibleChar } from './playtest/chars';
import { riftChar } from './playtest/runs';
import type { Difficulty } from '../shared/src/data/hub';
import { DIFFICULTY_NAME } from '../shared/src/data/hub';
import { expeditionRun, type ExpRunResult, type Style } from './playtest/expedition';
import { Lab } from './playtest/lab';
import { SKILL } from './playtest/model';

const args = process.argv.slice(2);
const fast = args.includes('--schnell');
const jsonAt = args.indexOf('--json');
const ids = args.filter((a, i) => !a.startsWith('--') && (jsonAt < 0 || i !== jsonAt + 1));
const r = new Rng(20261125);
Math.random = () => r.next();
const lab = new Lab();
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

export function expeditionTable(list: string[], n: number) {
  const rows: unknown[] = [];
  console.log('| Expedition | St. | sorgsam allein | zügig allein | sorgsam zu zweit | zügig zu zweit |');
  console.log('|---|---|---|---|---|---|');
  for (const id of list) {
    const x = EXPEDITIONS[id];
    const cells: string[] = [];
    for (const [style, party] of [['sorgsam', 1], ['zuegig', 1], ['sorgsam', 2], ['zuegig', 2]] as [Style, number][]) {
      const rs: ExpRunResult[] = [];
      const classes: ClassId[][] = party === 1 ? [['krieger'], ['magier'], ['waldlaeufer']].slice(0, n) : [['krieger', 'magier'], ['paladin', 'waldlaeufer']].slice(0, Math.max(1, n - 1));
      classes.forEach((cls, i) => rs.push(expeditionRun(lab, id, cls.map((c, k) => plausibleChar(c, x.rec, { seed: i * 7 + k + 1, potions: [10, 5] })), style === 'sorgsam' ? SKILL.sorgsam : SKILL.mittel, style, i * 13 + 5)));
      const ok = rs.filter(q => q.ok);
      cells.push(`${mmss(mean(ok.map(q => q.sec)))} (${ok.length}/${rs.length}, Tode ${mean(rs.map(q => q.deaths)).toFixed(1)}${rs.some(q => q.stuck) ? `, hängt ${rs.reduce((a, q) => a + q.stuck, 0)}×` : ''})`);
      rows.push({ id, style, party, runs: rs });
    }
    console.log(`| ${x.name} | ${x.rec} | ${cells.join(' | ')} |`);
  }
  // 0.11: Tempo – was ein Lauf (erster Abschluss auf Normal, empfohlene Stufe) an Erfahrung, Stufen und Gold bringt
  console.log('');
  console.log('| Expedition | St. | Stufen je Lauf (sorgsam / zügig, allein) | Erfahrung (zügig) | davon Abschluss | Gold (zügig) | Stufen zu zweit (zügig) |');
  console.log('|---|---|---|---|---|---|---|');
  const of = (id: string, style: Style, party: number) => (rows as any[]).find(q => q.id === id && q.style === style && q.party === party)?.runs as ExpRunResult[] ?? [];
  for (const id of list) {
    const x = EXPEDITIONS[id], s1 = of(id, 'sorgsam', 1), z1 = of(id, 'zuegig', 1), z2 = of(id, 'zuegig', 2);
    const m = (a: ExpRunResult[], f: (q: ExpRunResult) => number) => mean(a.filter(q => q.ok).map(f));
    console.log(`| ${x.name} | ${x.rec} | ${m(s1, q => q.levels).toFixed(2)} / ${m(z1, q => q.levels).toFixed(2)} | ${Math.round(m(z1, q => q.xp))} | ${Math.round(m(z1, q => q.xpClear))} | ${Math.round(m(z1, q => q.gold))} | ${m(z2, q => q.levels).toFixed(2)} |`);
  }
  return rows;
}
/**
 * 0.11: Endspiel – jede Endspiel-Expedition auf jedem Grad und eine Reihe Tiefen. Ausrüstung je Stufe des Endspiels
 * (scripts/playtest/runs.ts, riftChar): Normal mit dem Stand am Ende der Geschichte, darüber Riss-Ausrüstung wachsender Stufe.
 */
export function endgameTable(n: number) {
  const rows: unknown[] = [];
  const steps: [string, Difficulty, number, number, 'geschichte' | 'riss'][] = [
    ['exp_wacht', 'normal', 0, 1, 'geschichte'], ['exp_wacht', 'schwer', 0, 5, 'riss'], ['exp_wacht', 'albtraum', 0, 10, 'riss'], ['exp_wacht', 'mythisch', 0, 15, 'riss'],
    ['exp_herz', 'normal', 0, 1, 'geschichte'], ['exp_herz', 'schwer', 0, 5, 'riss'], ['exp_herz', 'albtraum', 0, 10, 'riss'], ['exp_herz', 'mythisch', 0, 15, 'riss'],
    ['exp_wacht', 'mythisch', 1, 15, 'riss'], ['exp_wacht', 'mythisch', 5, 20, 'riss'], ['exp_wacht', 'mythisch', 10, 25, 'riss'], ['exp_wacht', 'mythisch', 20, 30, 'riss'],
  ];
  console.log('| Expedition | Grad / Tiefe | Ausrüstung | geschafft | Dauer | Bosskampf | Tode | Tränke | hängt |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  for (const [id, diff, depth, stufe, gear] of steps) {
    const rs: ExpRunResult[] = [];
    (['krieger', 'magier', 'paladin'] as ClassId[]).slice(0, n).forEach((cls, i) => rs.push(expeditionRun(lab, id, [riftChar(cls, stufe, gear, i * 7 + 3)], SKILL.mittel, 'zuegig', i * 13 + 5, diff, 3600, depth)));
    const ok = rs.filter(q => q.ok);
    console.log(`| ${EXPEDITIONS[id].name} | ${DIFFICULTY_NAME[diff]}${depth ? ` · Tiefe ${depth}` : ''} | ${gear === 'riss' ? `Riss-Stufe ${stufe}` : 'Ende der Geschichte'} | ${ok.length}/${rs.length} | ${ok.length ? mmss(mean(ok.map(q => q.sec))) : '–'} | ${Math.round(mean(rs.map(q => q.bossSec)))} s | ${mean(rs.map(q => q.deaths)).toFixed(1)} | ${mean(rs.map(q => q.potions)).toFixed(1)} | ${rs.reduce((a, q) => a + q.stuck, 0)} |`);
    rows.push({ id, diff, depth, stufe, gear, runs: rs });
  }
  return rows;
}
const list = ids.length ? ids : EXPEDITION_LIST.filter(x => !x.secret && !x.endgame).map(x => x.id);
const rows = args.includes('--endspiel') ? endgameTable(fast ? 1 : 2) : expeditionTable(list, fast ? 1 : 2);
if (jsonAt >= 0) fs.writeFileSync(args[jsonAt + 1], JSON.stringify(rows, null, 1));
lab.close();
