// Spieltest der Expeditionen (0.9): ganze Läufe, Dauer nach Spielertyp, allein und zu zweit.
//   npx tsx scripts/exp-playtest.ts [exp_id …] [--schnell] [--json datei]
// Auch als Abschnitt „expeditionen“ von scripts/playtest.ts.
import fs from 'node:fs';
import { EXPEDITION_LIST, EXPEDITIONS } from '../shared/src/data/expeditions';
import type { ClassId } from '../shared/src/types';
import { Rng } from '../shared/src/util/rng';
import { plausibleChar } from './playtest/chars';
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
  return rows;
}
const list = ids.length ? ids : EXPEDITION_LIST.filter(x => !x.secret).map(x => x.id);
const rows = expeditionTable(list, fast ? 1 : 2);
if (jsonAt >= 0) fs.writeFileSync(args[jsonAt + 1], JSON.stringify(rows, null, 1));
lab.close();
