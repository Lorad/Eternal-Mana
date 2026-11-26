// Browser-Durchlauf (0.9): die übrigen fünf Expeditionen und die geheime – je durch das Portal der Quellwarte hinein,
// Abschnitte ansehen, das besondere Ereignis (Finsternis, Einsturz, Flut, Hinterhalt), ein Mini-Boss, die Signatur des
// Endbosses wirklich auslösen (Prismensäule, Kühlkette, Stillstand, Tintenfass, wanderndes Licht), alle Phasen, Abschluss,
// Rückkehr in die Warte. Die geheime Expedition wird in den Unteren Archiven entdeckt, bevor sie in der Liste steht.
// Die Wurzeltiefe spielt tests/e2e/expedition.mjs, die höheren Schwierigkeitsgrade tests/e2e/expedition-grade.mjs.
// Bilder: tests/e2e/out/expeditionen-*.png
//   EM_DEV=1 EM_PORT=7795 EM_DATA=/tmp/em-e2e npm start        (anderes Fenster)
//   EM_URL=http://localhost:7795 node tests/e2e/expeditionen.mjs [exp_glut …]
import { EVENTS, bossToEnd, enter, finish, goHome, launch, mini, player, url, viaPortal, visit } from './lib/exp.mjs';

const only = process.argv.slice(2).filter(a => a.startsWith('exp_'));
const browser = await launch();
const errors = [];
let failed = 0;
const tag = Math.random().toString(36).replace(/[^a-z]/g, '').slice(0, 5).padEnd(5, 'x');
const step = async (name, fn) => {
  try { const r = await fn(); console.log('  ✓ ' + name + (r ? '  ' + r : '')); return true; }
  catch (e) { failed++; console.log('  ✗ ' + name + ': ' + e.message.split('\n')[0]); await a.shot('fehler-' + failed).catch(() => {}); await a.esc().catch(() => {}); await a.esc().catch(() => {}); return false; }
};

/** Plan je Expedition: Abschnitte zum Ansehen, Ereignis, Mini-Boss, Bossarena, Signatur, Schatzkammer */
const PLAN = [
  { id: 'exp_kristall', lvl: 10, name: 'Die Singende Tiefe', intro: 'Grubenschild', visit: ['stollen', 'spiegelsee', 'gleishalle', 'drusengang', 'echohalle', 'drusendom', 'gruben_rast'],
    treasure: 'glasgrab', event: ['darkness', 'dunkelgang'], mini: ['glasmaul', 'Glasmaul'], boss: 'geodenherz', sig: 'prisma' },
  { id: 'exp_glut', lvl: 15, name: 'Die Gießerei der Ersten', intro: 'Schmiederegel', visit: ['schlackenhalde', 'gussrinnen', 'formenlager', 'kesselraum', 'essenhalle', 'ambosshalle', 'abkuehlraum'],
    treasure: 'siebteform', event: ['collapse', 'lavasteg'], mini: ['vogtei', 'Schlackenvogt'], boss: 'esse', sig: 'chain' },
  { id: 'exp_frost', lvl: 20, name: 'Der Webstuhl aus Eis', intro: 'In Eis gewebt', visit: ['reifgang', 'eisgarten', 'spulenraum', 'frosthalle', 'faedenhalle', 'gletscherbruecke', 'kamin'],
    treasure: 'jorunds_versteck', event: ['flood', 'schmelzkammer'], mini: ['vorhalle', 'Reifriese Hjalmar'], boss: 'webstuhl', sig: 'still' },
  { id: 'exp_ruinen', lvl: 25, name: 'Die Unteren Archive', intro: 'Ruhe. Ruhe.', visit: ['regalgang', 'lesesaal', 'kartei', 'staubgang', 'fussnoten', 'scriptorium', 'leseecke'],
    treasure: 'verbotenes', discover: true, event: ['ambush', 'magazin'], mini: ['kustodie', 'Kustos Vierzehn'], boss: 'katalog', sig: 'ink' },
  { id: 'exp_schatten', lvl: 30, name: 'Der Hof der Hohlen Krone', intro: 'Hier wird niemand vergessen', visit: ['erinnerungsgarten', 'wandelgang', 'spiegelsaal', 'sternwarte', 'hofstaat', 'gedaechtnishalle', 'thronvorplatz', 'letztes_licht'],
    treasure: 'maelis_zimmer', event: ['collapse', 'traumbruecke'], mini: ['mahrstall', 'Die Mahrkönigin'], boss: 'thronsaal', sig: 'wisp' },
  { id: 'exp_gestrichen', lvl: 34, name: 'Die Gestrichenen Seiten', intro: 'in sehr kleiner Schrift', visit: ['streichgang', 'palimpsest', 'tintensee', 'schwaerzung', 'satzspiegel', 'register', 'loeschgang', 'schreibpult'],
    treasure: 'erste_seite', event: ['darkness', 'leere_zeilen'], mini: ['fussnote2', 'Die Fußnote'], boss: 'urschrift', sig: 'ink', bossName: 'Der Erste Schreiber' },
];

console.log('Eternal Mana – fünf Expeditionen und die geheime gegen ' + url);
const a = await player(browser, 'expeditionen', 'a', 'Edda' + tag, 'Krieger', errors);
await step('Charakter anlegen, alle Expeditionen außer der geheimen freischalten', async () => {
  await enter(a);
  await a.cmd('/lvl 8'); await a.cmd(only.length && !only.includes('exp_ruinen') ? '/expfrei' : '/expfrei spuren'); await a.cmd('/welt aus'); await a.cmd('/time 0.45'); await a.cmd('/god');
  await a.cmd('/portal'); await a.inZone('quellwarte');
  await a.page.keyboard.press('e');
  await a.has('Der Hof der Hohlen Krone');
  if (!only.length && await a.page.locator('.xp-list .craft-row', { hasText: 'Die Gestrichenen Seiten' }).count()) throw new Error('die geheime Expedition steht schon vor ihrer Entdeckung in der Liste');
  await a.shot('00-liste');
  await a.esc();
});

for (const x of PLAN) {
  if (only.length && !only.includes(x.id)) continue;
  const n = x.id.slice(4);
  console.log(`\n${x.name} (${x.id})`);
  await a.cmd('/lvl ' + x.lvl); // auf der empfohlenen Stufe (der Mini-Boss soll nicht vom bloßen Dasein fallen)
  if (!(await step('Portal → Auswahl → allein aufbrechen → Einleitung', () => viaPortal(a, x, 'normal', n)))) continue;
  // zuerst der Mini-Boss: /kill beim Ansehen der Nachbarabschnitte reicht 300 Pixel weit
  await step(`Mini-Boss ${x.mini[1]}`, () => mini(a, x.mini[0], x.mini[1], n));
  await step(`Ereignis: ${x.event[0]}`, async () => { const r = await EVENTS[x.event[0]](a, x.event[1], n); return r ? JSON.stringify(r) : ''; });
  await step('Abschnitte ansehen', async () => { for (const [i, s] of x.visit.entries()) await visit(a, s, `${n}-${String(i + 1).padStart(2, '0')}-${s}`); });
  await step('Schatzkammer hinter der rissigen Wand' + (x.discover ? ' und die Spur zur geheimen Expedition' : ''), async () => {
    await visit(a, x.treasure, `${n}-schatz`, false);
    await a.has('Geheimnis: ', 6000);
    if (x.discover) {
      const d = (await a.objs('discover'))[0];
      if (!d) throw new Error('keine Spur in der Schatzkammer');
      await a.walkTo(d.x, d.y + 16, { near: 8 });
      await a.use();
      await a.has('Eine geheime Expedition ist entdeckt', 6000);
      await a.shot(`${n}-spur`);
    }
  });
  await step('Endboss: Signatur, Phasen 2 und 3', async () => {
    const r = await bossToEnd(a, x, n, x.sig);
    if (x.bossName) await a.has(x.bossName);
    return r ? JSON.stringify(r) : '';
  });
  await step('Sieg, Abschlussbildschirm, Belohnungskammer', () => finish(a, x, n));
  await step('Gemeinsame Rückkehr in die Quellwarte, Zusammenfassung', () => goHome(a, x, n));
  if (x.discover) await step('Die geheime Expedition steht jetzt am Portal', async () => {
    await a.cmd('/portal'); await a.wait(600);
    await a.use();
    await a.page.locator('.xp-list .craft-row', { hasText: 'Die Gestrichenen Seiten' }).waitFor({ timeout: 5000 });
    await a.shot('gestrichen-in-der-liste');
    await a.esc();
  });
}
console.log(`\nDev-Sprünge beim Laufen (Figur steckte fest): ${a.jumps}${a.notes.length ? " – " + a.notes.join(", ") : ""}`);
console.log(errors.length ? '\nFehler im Browser:\n' + [...new Set(errors)].slice(0, 20).join('\n') : '\nKeine Fehler im Browser.');
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
