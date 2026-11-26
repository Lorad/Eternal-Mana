// Browser-Durchlauf des Endspiels (0.11): „Die Lange Wacht“ – Freischaltung im Auswahlfenster, Lauf mit Abschnitten und
// Mini-Boss, Vaels Wachfeuer (löschen, neu entzünden), Phasen, Vael ergibt sich, Abschluss mit Endspiel-Beute; danach
// Mythisch → Tiefe 1 im Auswahlfenster (Modifikatoren, Rekord) und die Bestenliste in der Trophäenhalle. Bilder: tests/e2e/out/.
//   EM_DEV=1 EM_PORT=7795 EM_DATA=/tmp/em-e2e npm start        (anderes Fenster)
//   EM_URL=http://localhost:7795 node tests/e2e/lange-wacht.mjs      oder: node scripts/e2e-all.mjs lange-wacht
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
let chromium;
for (const base of [here + '/', '/opt/node22/lib/node_modules/']) {
  try { ({ chromium } = createRequire(base)('playwright')); break; } catch { /* nächster Ort */ }
}
if (!chromium) { console.error('Playwright ist nicht installiert:  npm i -D playwright && npx playwright install chromium'); process.exit(2); }
const url = (process.env.EM_URL ?? 'http://127.0.0.1:7795').replace(/\/?\?.*$/, '');
const out = path.join(here, 'out');
fs.mkdirSync(out, { recursive: true });
const args = ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
let browser;
try { browser = await chromium.launch({ args }); }
catch { browser = await chromium.launch({ args, executablePath: process.env.EM_CHROME ?? '/usr/bin/google-chrome' }); }
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push('Seitenfehler: ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/WebSocket|ERR_CONNECTION|net::/.test(m.text())) errors.push('Konsole: ' + m.text()); });
let failed = 0;
const tag = Math.random().toString(36).replace(/[^a-z]/g, '').slice(0, 5).padEnd(5, 'x');
const wait = ms => page.waitForTimeout(ms);
const shot = n => page.screenshot({ path: path.join(out, `lange-wacht-${n}.png`) });
const has = (t, timeout = 8000) => page.getByText(t).first().waitFor({ timeout });
const esc = async () => { await page.keyboard.press('Escape'); await wait(200); };
const cmd = async s => {
  const inp = page.locator('.chat-input input');
  for (let i = 0; ; i++) {
    await page.locator('.chat-open, .chat-input input').first().waitFor({ timeout: 40000 });
    if (!(await inp.count())) await page.keyboard.press('Enter');
    try { await inp.waitFor({ timeout: 2500 }); break; } catch (e) { if (i >= 4) throw e; }
  }
  await inp.fill(s); await inp.press('Enter'); await wait(350);
};
const loaded = async () => { await wait(1200); await page.locator('.hud').waitFor({ timeout: 40000 }); await wait(700); };
const step = async (name, fn) => {
  try { await fn(); console.log('  ✓ ' + name); }
  catch (e) { failed++; console.log('  ✗ ' + name + ': ' + e.message.split('\n')[0]); await shot('fehler-' + failed).catch(() => {}); await esc(); await esc(); }
};
/** Objekte der Szene (Typ, Art) – über die Spielszene, wie tests/e2e/hub.mjs */
const objs = (kind) => page.evaluate(k => { const sc = window.__em.game.scene.getScene('game'); return [...sc.objs.values()].filter(v => v.o.props?.kind === k).map(v => ({ id: v.o.id, x: v.o.x, y: v.o.y, state: v.o.state, label: v.o.props?.label })); }, kind);
const visit = async (sec, n, kill = true) => { await cmd('/expgo ' + sec + ' mitte'); await wait(900); if (kill) { await cmd('/kill'); await wait(500); } await shot(n); };
const openPortal = async () => {
  await cmd('/portal'); await loaded();
  for (let i = 0; i < 3 && !(await page.locator('.xp-list').count()); i++) { await page.keyboard.press('e'); await wait(800); }
  await page.locator('.xp-list').waitFor({ timeout: 8000 });
};

console.log('Eternal Mana – Endspiel „Die Lange Wacht“ gegen ' + url);
await step('Welt betreten, Stufe 40, Endspiel freischalten, zum Portal', async () => {
  await page.goto(url + '/?hinweise=aus');
  await page.getByText('Spielen', { exact: true }).waitFor({ timeout: 30000 });
  await page.getByText('Spielen', { exact: true }).click();
  await page.getByText('Neues Spiel').first().click();
  await page.getByText('Paladin').first().click();
  await page.locator('input').first().fill('Wache' + tag);
  await page.getByText('Abenteuer beginnen').click();
  await page.getByText('Betreten').first().click();
  await page.waitForFunction(() => document.querySelector('#game canvas') && document.body.innerText.includes('Überspringen'), null, { timeout: 40000 });
  await page.getByText('Überspringen').click(); await wait(600);
  await cmd('/lvl 40'); await cmd('/gear 3'); await cmd('/expfrei'); await cmd('/welt aus'); await cmd('/time 0.45');
  await openPortal();
});
await step('Auswahl: Endspiel-Expeditionen mit Kennzeichen, Beute und Freischaltung (das Herz erst nach der Wacht)', async () => {
  await page.locator('.xp-list .craft-row', { hasText: 'Das Atmende Herz' }).click();
  await has('„Die Lange Wacht“ abgeschlossen');
  await shot('01-herz-verschlossen');
  await page.locator('.xp-list .craft-row', { hasText: 'Die Lange Wacht' }).click();
  await has('Belohnung (Endspiel)'); await has('Endspiel');
  await shot('02-lange-wacht-auswahl');
});
await step('Allein aufbrechen: Einleitung, HUD, Abschnitte, Mini-Boss', async () => {
  await page.getByRole('button', { name: 'Allein aufbrechen' }).click();
  await loaded();
  await has('Dienstplan', 15000);
  await shot('03-eingang');
  await esc();
  await page.locator('.exp-hud').waitFor({ timeout: 8000 });
  await cmd('/god');
  await visit('laternenhalle', '04-laternenhalle');
  await visit('schlafsaal', '05-schlafsaal');
  await visit('mitternacht', '06-finsternis', false);
  await has('Finsternis', 8000);
  await visit('ehrenwache', '07-ehrenwache');
  await cmd('/expgo wachstube mitte'); await wait(1200);
  await page.mouse.move(700, 330); await page.mouse.down(); await wait(2000); await page.mouse.up();
  await has('Die Erste Wache', 8000);
  await shot('08-mini-erste-wache');
  await cmd('/kill');
});
await step('Vor der Tür: Vael, drei Wachfeuer, eines erlischt – Stehenbleiben entzündet es wieder', async () => {
  await cmd('/expgo vor_der_tuer mitte'); await wait(2500);
  await has('Wachfeuer', 8000);
  let fires = await objs('watchfire');
  if (fires.length !== 3) throw new Error(`${fires.length} Wachfeuer statt 3`);
  await shot('09-vael-wachfeuer');
  // dunkel = Beschriftung „Wachfeuer (dunkel)“ (die Beschriftung kommt mit jedem Wechsel; der Zustand beim ersten Aufbau nicht immer)
  const isDark = f => /dunkel/.test(f.label ?? '');
  for (let i = 0; i < 40 && !(fires = await objs('watchfire')).some(isDark); i++) await wait(500);
  const dark = fires.find(isDark);
  if (!dark) throw new Error('kein Wachfeuer erloschen');
  await shot('10-wachfeuer-dunkel');
  await cmd(`/goto ${Math.round(dark.x + 6)} ${Math.round(dark.y + 10)}`);
  // die Szene baut ein Objekt mit neuen Eigenschaften kurz neu auf – deshalb warten, bis es wirklich als brennend dasteht
  let lit = false;
  for (let i = 0; i < 25 && !lit; i++) { await wait(400); const f = (await objs('watchfire')).find(q => q.id === dark.id); lit = !!f && !isDark(f); }
  if (!lit) throw new Error('das Feuer brennt nicht wieder');
  await shot('11-wachfeuer-entzuendet');
});
await step('Phasen 2 und 3, Vael gibt sich geschlagen, Abschluss mit Endspiel-Beute', async () => {
  await cmd('/expgo vor_der_tuer mitte'); await wait(600);
  await cmd('/expphase 2'); await wait(2500); await shot('12-phase2');
  await cmd('/expphase 3'); await wait(2500); await shot('13-phase3');
  await cmd('/expsieg'); await wait(1500);
  await has('gibt sich geschlagen', 8000);
  await shot('14-vael-ergibt-sich');
  await has('Expedition abgeschlossen', 12000);
  await has('Echo-Fragment');
  await shot('15-abschluss');
  await page.getByRole('button', { name: 'Umsehen' }).click(); await wait(400);
  await page.getByRole('button', { name: /Gemeinsam heimkehren/ }).first().click();
  await loaded();
  await has('Zurück aus Die Lange Wacht', 12000);
  await shot('16-zusammenfassung');
});
await step('Danach: das Atmende Herz ist offen; Mythisch geschafft öffnet die Tiefen – Auswahl mit Modifikatoren', async () => {
  await openPortal();
  await page.locator('.xp-list .craft-row', { hasText: 'Das Atmende Herz' }).click();
  await page.getByRole('button', { name: 'Allein aufbrechen' }).waitFor({ timeout: 5000 });
  await shot('17-herz-offen');
  await esc();
  await cmd('/exp exp_wacht mythisch'); await loaded(); await esc();
  await cmd('/expsieg'); await has('Expedition abgeschlossen', 15000);
  await page.getByRole('button', { name: 'Umsehen' }).click(); await wait(300);
  await page.getByRole('button', { name: /Gemeinsam heimkehren/ }).first().click(); await loaded();
  await openPortal();
  await page.locator('.xp-list .craft-row', { hasText: 'Die Lange Wacht' }).click();
  await page.locator('.xp-diff.d-mythisch').click();
  await has('ohne Tiefe');
  await page.locator('.xp-depth').getByRole('button', { name: '+' }).click();
  await has('Tiefe 1');
  await shot('18-tiefe-auswahl');
  await page.locator('.xp-depth').getByRole('button', { name: '+' }).isDisabled().then(d => { if (!d) throw new Error('Tiefe 2 schon wählbar'); });
});
await step('Tiefe 1: HUD zeigt die Tiefe, Abschluss meldet die neue Tiefe', async () => {
  await page.getByRole('button', { name: 'Allein aufbrechen' }).click();
  await loaded(); await esc();
  await page.locator('.exp-hud', { hasText: 'Tiefe 1' }).waitFor({ timeout: 8000 });
  await shot('19-tiefe1-hud');
  await cmd('/expsieg');
  await has('Expedition abgeschlossen', 15000);
  await has('Neue Tiefe: 1');
  await shot('20-tiefe1-abschluss');
  await page.getByRole('button', { name: 'Umsehen' }).click(); await wait(300);
  await page.getByRole('button', { name: /Gemeinsam heimkehren/ }).first().click(); await loaded();
});
await step('Trophäenhalle: Bestenliste der Quellwarte mit Zeit, Tiefe und Namen', async () => {
  await cmd('/warte'); await loaded();
  const find = () => { const sc = window.__em.game.scene.getScene('game'); for (const v of sc.objs.values()) if (v.o.type === 'npc' && v.o.tag === 'bertram') return { x: v.o.x, y: v.o.y }; return null; };
  await page.waitForFunction(find, null, { timeout: 10000 });
  const p = await page.evaluate(find);
  await cmd(`/goto ${p.x} ${p.y + 16}`); await wait(500);
  await has('Mit Bertram sprechen');
  await page.keyboard.press('e'); await wait(500);
  await page.getByText('Durch die Trophäenhalle gehen').first().click(); await wait(600);
  await page.getByRole('tab', { name: /Bestenliste/ }).click(); await wait(400);
  await has('Die Lange Wacht'); await has('Tiefe 1'); await has('Wache' + tag);
  await shot('21-bestenliste');
  await esc();
});

console.log(errors.length ? '\nFehler im Browser:\n' + [...new Set(errors)].slice(0, 20).join('\n') : '\nKeine Fehler im Browser.');
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
