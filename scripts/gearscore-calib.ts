// Ausrüstungswert (GS): Messung entlang der Reise mit dem Spielermodell und Abgleich mit den hinterlegten Messpunkten.
//   npx tsx scripts/gearscore-calib.ts            Tabelle (Markdown) wie in docs/GEAR_SCORE.md
//   npx tsx scripts/gearscore-calib.ts --ref      zusätzlich GS_REF zum Einfügen in shared/src/data/gsreq.ts
//   npx tsx scripts/gearscore-calib.ts --req      Empfehlungen je Expedition, Grad, Tiefe und Riss-Stufe
import { CLASS_IDS, CLASSES } from '../shared/src/data/classes';
import { DIFFICULTIES, DIFFICULTY_NAME, EXPEDITION_LIST } from '../shared/src/data/expeditions';
import { GS_REF, expRequirement, riftRequirement, trialRequirement } from '../shared/src/data/gsreq';
import { fmtGS } from '../shared/src/gearscore';
import { LEVEL_POINTS, RIFT_POINTS, measureGS, type GsPoint } from './playtest/gearscore';

const m = measureGS();
const args = process.argv.slice(2);
const cell = (p: GsPoint) => `${fmtGS(p.mean)} (${fmtGS(p.min)}–${fmtGS(p.max)})`;
const spread = (p: GsPoint) => { const v = Object.values(p.byClass); return `${Math.round((Math.max(...v) / Math.min(...v) - 1) * 100)} %`; };

console.log('| Stufe | karg | typisch | gut | Klassen-Spanne (typisch) |');
console.log('|---|---|---|---|---|');
for (const L of LEVEL_POINTS) console.log(`| ${L} | ${cell(m.level.karg[L])} | ${cell(m.level.typisch[L])} | ${cell(m.level.gut[L])} | ${spread(m.level.typisch[L])} |`);
console.log('');
console.log(`| Endspiel | GS (Spanne) | je Klasse (${CLASS_IDS.map(c => CLASSES[c].name).join(' / ')}) |`);
console.log('|---|---|---|');
const row = (name: string, p: GsPoint) => console.log(`| ${name} | ${cell(p)} | ${CLASS_IDS.map(c => fmtGS(p.byClass[c])).join(' / ')} |`);
row('Ende der Geschichte', m.story);
for (const s of RIFT_POINTS) row(`Riss-Ausrüstung Stufe ${s}`, m.rift[s]);
row('Alles Legendär +10', m.legend10);
row('Alles Mythisch +10', m.mythic10);

if (args.includes('--ref')) {
  const lv = (g: 'karg' | 'typisch' | 'gut') => `[${LEVEL_POINTS.map(L => m.level[g][L].mean).join(', ')}]`;
  console.log('\nexport const GS_REF = {');
  console.log(`  levels: [${LEVEL_POINTS.join(', ')}],`);
  console.log(`  karg: ${lv('karg')},`);
  console.log(`  typisch: ${lv('typisch')},`);
  console.log(`  gut: ${lv('gut')},`);
  console.log(`  story: ${m.story.mean},`);
  console.log(`  rift: { ${RIFT_POINTS.map(s => `${s}: ${m.rift[s].mean}`).join(', ')} },`);
  console.log(`  legend10: ${m.legend10.mean}, mythic10: ${m.mythic10.mean},`);
  console.log('};');
}
if (args.includes('--req')) {
  console.log('\n| Expedition | Grad | St. | empfohlen | Mindestwert | Beute | Stufe |');
  console.log('|---|---|---|---|---|---|---|');
  for (const x of EXPEDITION_LIST) for (const d of DIFFICULTIES) {
    const r = expRequirement(x.id, d);
    console.log(`| ${x.name} | ${DIFFICULTY_NAME[d]} | ${r.recLevel} | ${fmtGS(r.recGS)} | ${fmtGS(r.minGS)} | ${r.reward} | ${r.tierName} |`);
  }
  console.log('\n| Tiefe | empfohlen | Mindestwert |');
  console.log('|---|---|---|');
  for (const t of [1, 2, 3, 5, 8, 10, 15, 20]) { const r = expRequirement('exp_wacht', 'mythisch', t); console.log(`| ${t} | ${fmtGS(r.recGS)} | ${fmtGS(r.minGS)} |`); }
  console.log('\n| Riss-Stufe | empfohlen | Mindestwert | Stufe |');
  console.log('|---|---|---|---|');
  for (const s of [1, 5, 10, 15, 20, 25, 30]) { const r = riftRequirement(s); console.log(`| ${s} | ${fmtGS(r.recGS)} | ${fmtGS(r.minGS)} | ${r.tierName} |`); }
  const t = trialRequirement(); console.log(`| Prüfung der Sieben | ${fmtGS(t.recGS)} | ${fmtGS(t.minGS)} | ${t.tierName} |`);
  void GS_REF;
}
