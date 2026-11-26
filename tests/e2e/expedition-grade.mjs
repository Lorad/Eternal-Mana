// Browser-Durchlauf (0.9): die Schwierigkeitsgrade einer Expedition (Die Singende Tiefe) – Normal schaltet Schwer frei, Schwer
// Albtraum, Albtraum Mythisch. Je Grad: Auswahlfenster mit Sperre und Beschreibung, Erwachte mit Affixen (Namen über dem Kopf),
// der zusätzliche Bossangriff, Helfer und Wut (Albtraum/Mythisch: Anzeige im HUD, Raserei), die Zusatztruhen (ohne Tod, unter der
// Richtzeit) und auf Mythisch die Darstellung mythischer Beute (Abschluss, Inventar, Lichtsäule am Boden).
// Bilder: tests/e2e/out/grade-*.png
//   EM_DEV=1 EM_PORT=7795 EM_DATA=/tmp/em-e2e npm start        (anderes Fenster)
//   EM_URL=http://localhost:7795 node tests/e2e/expedition-grade.mjs
import { enter, finish, goHome, launch, player, url, viaPortal } from './lib/exp.mjs';

const browser = await launch();
const errors = [];
let failed = 0;
const tag = Math.random().toString(36).replace(/[^a-z]/g, '').slice(0, 5).padEnd(5, 'x');
const step = async (name, fn) => {
  try { const r = await fn(); console.log('  ✓ ' + name + (r ? '  ' + r : '')); return true; }
  catch (e) { failed++; console.log('  ✗ ' + name + ': ' + e.message.split('\n')[0]); await a.shot('fehler-' + failed).catch(() => {}); await a.esc().catch(() => {}); await a.esc().catch(() => {}); return false; }
};
const X = { id: 'exp_kristall', name: 'Die Singende Tiefe', intro: 'Grubenschild', boss: 'geodenherz' };
const hud = sel => a.page.locator('.exp-hud ' + sel).first();

/** Truhe mit dieser Beschriftung öffnen; Rückgabe: neue Gegenstände im Rucksack */
async function openChest(label, n) {
  const c = (await a.objs('chest')).find(o => o.props.label === label);
  if (!c) throw new Error(`keine „${label}“ in der Belohnungskammer`);
  const inv0 = await a.page.evaluate(() => window.__em.store.state.char.inv.length);
  if (!(await a.walkTo(c.x, c.y + 16, { near: 8 }))) { a.notes.push(`${label}: nicht erreicht, Dev-Sprung`); await a.goto(c.x, c.y + 16); }
  await a.has('Truhe öffnen');
  await a.use();
  await a.page.waitForFunction(i => window.__em.store.state.char.inv.length > i, inv0, { timeout: 5000 });
  if (n) await a.shot(n);
  return a.page.evaluate(i => window.__em.store.state.char.inv.slice(i).map(it => `${it.name ?? it.base} (${['Gewöhnlich', 'Ungewöhnlich', 'Selten', 'Episch', 'Legendär', 'Mythisch'][it.rarity ?? 0]})`), inv0);
}
/** Erwachte mit Affixen in einem Abschnitt: Namen und ein Bild */
async function affixes(sec, n, want) {
  await a.cmd(`/expgo ${sec} mitte`); await a.wait(1500);
  const list = (await a.mobs()).filter(m => m.elite && /^[A-ZÄÖÜ][a-zäöü]+(, [A-ZÄÖÜ][a-zäöü]+)*: /.test(m.name));
  if (!list.length) throw new Error('kein Erwachter mit Affix im Abschnitt');
  const counts = list.map(m => m.name.split(':')[0].split(', ').length);
  if (!counts.every(c => c === want)) throw new Error(`Affixe je Erwachtem ${counts.join('/')} statt ${want}`);
  const e = list[0];
  await a.walkTo(e.x, e.y + 60, { near: 20, timeout: 4000 }).catch(() => {});
  await a.wait(600); await a.shot(n);
  return [...new Set(list.map(m => m.name))].slice(0, 3).join(' · ');
}

console.log('Eternal Mana – Schwierigkeitsgrade gegen ' + url);
const a = await player(browser, 'grade', 'a', 'Grada' + tag, 'Paladin', errors);
await step('Charakter: Stufe 40, Expeditionen frei', async () => {
  await enter(a);
  await a.cmd('/lvl 40'); await a.cmd('/expfrei'); await a.cmd('/welt aus'); await a.cmd('/time 0.45'); await a.cmd('/god');
});

console.log('\nNormal (schaltet Schwer frei)');
await step('Auswahl: Schwer gesperrt, mit Grund', async () => {
  await a.cmd('/portal'); await a.inZone('quellwarte');
  await a.page.keyboard.press('e');
  await a.page.locator('.xp-list .craft-row', { hasText: X.name }).click();
  await a.page.locator('.xp-diff.d-schwer.locked').waitFor({ timeout: 4000 });
  await a.has('Nach einem Abschluss auf Normal.');
  await a.shot('00-gesperrt');
  await a.esc();
});
await step('Normal: hinein, Boss, Sieg, heim', async () => {
  await viaPortal(a, X, 'normal');
  await a.cmd(`/expgo ${X.boss} mitte`); await a.wait(1500);
  await finish(a, X, 'normal'); await goHome(a, X);
});

console.log('\nSchwer');
await step('Auswahl und Einstieg auf Schwer', () => viaPortal(a, X, 'schwer', 'schwer'));
await step('Erwachte mit einem Affix', () => affixes('drusendom', 'schwer-affixe', 1));
await step('Endboss: zusätzlicher Angriff (Prismengitter)', async () => {
  await a.cmd(`/expgo ${X.boss} mitte`);
  await a.has('Prismengitter', 40000);
  await a.wait(900); await a.shot('schwer-prismengitter');
});
await step('Sieg ohne Tod: Truhe der Unversehrten', async () => {
  await finish(a, X, 'schwer');
  if ((await a.objs('chest')).some(c => c.props.label === 'Truhe der Eile')) throw new Error('Truhe der Eile schon auf Schwer');
  return (await openChest('Truhe der Unversehrten', 'schwer-truhe')).join(', ');
});
await step('Heimkehr', () => goHome(a, X));

console.log('\nAlbtraum');
await step('Auswahl und Einstieg auf Albtraum: Richtzeit im HUD', async () => {
  await viaPortal(a, X, 'albtraum', 'albtraum');
  await a.page.locator('.exp-hud .exp-clock small').waitFor({ timeout: 4000 });
});
await step('Erwachte mit zwei Affixen', () => affixes('drusendom', 'albtraum-affixe', 2));
await step('Endboss: Helfer und Wut-Anzeige', async () => {
  await a.cmd(`/expgo ${X.boss} mitte`); await a.wait(2500);
  await hud('.exp-enrage').waitFor({ timeout: 6000 });
  const txt = await hud('.exp-enrage').innerText();
  if (!/^Wut in [45]:\d\d$/.test(txt)) throw new Error('Wut-Anzeige: ' + txt);
  const all = await a.mobs(), b = all.find(m => m.boss);
  const helpers = all.filter(m => !m.boss && m.name !== 'Prismensäule' && Math.hypot(m.x - b.x, m.y - b.y) < 300).length;
  if (helpers < 1) throw new Error('keine Helfer beim Kampfbeginn');
  await a.shot('albtraum-boss');
  return `${txt}, ${helpers} Helfer`;
});
await step('Sieg schnell und ohne Tod: Truhe der Unversehrten und Truhe der Eile', async () => {
  await finish(a, X, 'albtraum');
  const one = await openChest('Truhe der Unversehrten');
  const two = await openChest('Truhe der Eile', 'albtraum-truhen');
  return [...one, ...two].join(', ');
});
await step('Heimkehr', () => goHome(a, X));

console.log('\nMythisch');
await step('Auswahl und Einstieg auf Mythisch', () => viaPortal(a, X, 'mythisch', 'mythisch'));
await step('Erwachte mit drei Affixen: Namen lesbar', () => affixes('drusendom', 'mythisch-affixe', 3));
await step('Endboss: Wut löst aus, der Boss rast', async () => {
  await a.cmd(`/expgo ${X.boss} mitte`); await a.wait(2000);
  await hud('.exp-enrage').waitFor({ timeout: 6000 });
  await a.cmd('/expwut');
  await a.has('gerät in Raserei', 8000);
  await a.page.locator('.exp-hud .exp-enrage.on', { hasText: 'Der Boss rast!' }).waitFor({ timeout: 8000 });
  await a.wait(500); await a.shot('mythisch-raserei');
});
await step('Abschluss: Beute in Seltenheitsfarben, Zusatztruhen', async () => {
  await finish(a, X, 'mythisch');
  const one = await openChest('Truhe der Unversehrten');
  const two = await openChest('Truhe der Eile');
  return `Truhen: ${[...one, ...two].join(', ')}`;
});
await step('Mythische Beute: Lichtsäule am Boden, Rahmen im Inventar', async () => {
  await a.cmd('/mythisch'); await a.wait(1800);
  await a.shot('mythisch-boden');
  const me = await a.me();
  const inv0 = await a.page.evaluate(() => window.__em.store.state.char.inv.length);
  await a.walkTo(me.x + 40, me.y, { near: 4, timeout: 3000 }); // Aufheben im Vorbeigehen
  await a.page.waitForFunction(i => window.__em.store.state.char.inv.length > i, inv0, { timeout: 5000 });
  await a.page.keyboard.press('i'); await a.wait(700);
  await a.page.locator('.slot.r5').first().waitFor({ timeout: 5000 });
  await a.page.locator('.slot.r5').first().hover(); await a.wait(500);
  await a.shot('mythisch-inventar');
  await a.esc();
});
await step('Heimkehr', () => goHome(a, X, 'mythisch'));

console.log(`\nDev-Sprünge beim Laufen (Figur steckte fest): ${a.jumps}${a.notes.length ? ' – ' + a.notes.join(', ') : ''}`);
console.log(errors.length ? '\nFehler im Browser:\n' + [...new Set(errors)].slice(0, 20).join('\n') : '\nKeine Fehler im Browser.');
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
