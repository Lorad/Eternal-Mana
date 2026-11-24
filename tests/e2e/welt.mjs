// Browser-Durchlauf „Lebendige Welt“ (0.6): Rufübersicht, Ereignisse, Händlerin, seltenes Monster, Weltboss, Begegnung, Nacht.
// Voraussetzung: laufender Server MIT Dev-Befehlen (EM_DEV=1; Standard http://localhost:7777, sonst EM_URL) und Playwright.
//   EM_DEV=1 npm start   →   node tests/e2e/welt.mjs
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

const url = process.env.EM_URL ?? 'http://localhost:7777';
const out = path.join(here, 'out');
fs.mkdirSync(out, { recursive: true });
const args = ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
let browser;
try { browser = await chromium.launch({ args }); }
catch { browser = await chromium.launch({ args, executablePath: process.env.EM_CHROME ?? '/usr/bin/google-chrome' }); }
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push('Seitenfehler: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('Konsole: ' + m.text()); });
let failed = 0;
const shot = n => page.screenshot({ path: path.join(out, `welt-${n}.png`) });
const step = async (name, fn) => { try { await fn(); console.log('  ✓ ' + name); } catch (e) { failed++; console.log('  ✗ ' + name + ': ' + e.message.split('\n')[0]); await shot('fehler-' + failed); } };
const wait = ms => page.waitForTimeout(ms);
/** Dev-Befehl über den Chat schicken */
const cmd = async s => {
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.activeElement?.tagName === 'INPUT', null, { timeout: 3000 });
  await page.keyboard.type(s); await page.keyboard.press('Enter'); await wait(350);
};
const esc = async () => { await page.keyboard.press('Escape'); await wait(200); };
const has = t => page.getByText(t).first().waitFor({ timeout: 6000 });

console.log('Eternal Mana – Lebendige Welt im Browser gegen ' + url);
await step('Welt betreten', async () => {
  await page.goto(url);
  await page.getByText('Spielen', { exact: true }).waitFor({ timeout: 20000 });
  await page.getByText('Spielen', { exact: true }).click();
  await page.getByText('Neues Spiel').first().click();
  await page.getByText('Krieger').first().click();
  await page.locator('input').first().fill('Welt' + Math.random().toString(36).slice(2, 7).replace(/[0-9]/g, 'x'));
  await page.getByText('Abenteuer beginnen').click();
  await page.getByText('Betreten').first().click();
  await page.waitForFunction(() => document.querySelector('#game canvas') && document.body.innerText.includes('Überspringen'), null, { timeout: 30000 });
  await page.getByText('Überspringen').click();
  await wait(600);
});
await step('Dev-Befehle wirken (sonst läuft der Server ohne EM_DEV=1)', async () => { await cmd('/lvl 14'); await cmd('/god'); await cmd('/welt aus'); await has('Lebendige Welt von selbst'); });
await step('Jahreszeit steht im HUD und wechselt', async () => { await has('Frühling'); await cmd('/season 3'); await wait(1600); await has('Winter'); await shot('1-winter'); await cmd('/season 1'); await wait(1500); });
await step('Rufübersicht: Fraktionen, Ränge, Vorräte', async () => {
  await cmd('/rep quellhain 900');
  await page.keyboard.press('u'); await wait(400);
  await has('Brunnengemeinde von Quellhain'); await has('Geachtet'); await has('So wächst dein Ruf');
  await shot('2-ruf');
  await page.getByText('Welt und Sammlung').click(); await wait(300);
  await has('Trophäen'); await has('Jahreszeit');
  await shot('3-welt');
  await esc();
});
await step('Fraktionsvorräte und Spenden im Gespräch', async () => {
  await cmd('/npc sella'); await wait(300);
  await page.keyboard.press('e'); await wait(400);
  await has('Vorräte: Quellhain');
  await page.getByText('Vorräte: Quellhain').click(); await wait(300);
  await has('Rezept:'); await shot('4-vorraete');
  await page.getByText('Spenden', { exact: true }).click(); await wait(250);
  await has('Ruf je Stück'); await shot('5-spenden');
  await esc();
});
await step('Mana-Woge: Ansage, Anzeige, Objekt', async () => {
  await cmd('/event woge'); await wait(1200);
  await has('Schlagt die Wellen zurück');
  await shot('6-woge');
  await cmd('/kill'); await wait(3800); await cmd('/kill'); await wait(3800); await cmd('/kill'); await wait(3800); await cmd('/kill'); await wait(1500);
  await shot('7-woge-ende');
});
await step('Fahrende Händlerin: Angebot ansehen', async () => {
  await cmd('/event haendler'); await wait(900);
  await cmd('/npc vesna'); await wait(500);
  await page.keyboard.press('e'); await wait(400);
  await has('Fahrende Ware ansehen');
  await page.getByText('Fahrende Ware ansehen').click(); await wait(300);
  await has('Sternsplitter'); await shot('8-haendlerin');
  await esc();
});
await step('Seltenes Monster: größer, eingefärbt, mit Namen', async () => {
  await cmd('/event woge'); await wait(300);                 // beendet die Händlerin (es läuft nur ein Ereignis je Zone)
  await cmd('/rare borkenkoenig'); await wait(1500);
  await shot('9-selten');
  await cmd('/kill'); await wait(800);
  await has('Trophäe');
});
await step('Weltboss: Leiste und Angriffsmuster', async () => {
  await cmd('/wboss moosgrimm'); await wait(1500);
  await page.mouse.move(700, 330); await page.mouse.down(); await wait(2500); await page.mouse.up();
  await wait(4000);
  await shot('10-weltboss');
  await cmd('/kill'); await wait(1200);
});
await step('Begegnung: verletztes Tier mit Gespräch', async () => {
  await cmd('/enc tier'); await wait(700);
  await page.keyboard.press('e'); await wait(500);
  await has('Begegnung am Weg'); await shot('11-begegnung');
  await page.getByText('Wache halten').click(); await wait(600);
  await cmd('/kill'); await wait(8000);
});
await step('Sternenregen bei Nacht', async () => {
  await cmd('/time 0.95'); await wait(400);
  await cmd('/event sterne'); await wait(9000);
  await has('Sammelt Sternsplitter');
  await shot('12-sterne');
});
await step('Nacht im Dorf: NPCs sind nach Hause gegangen', async () => {
  await cmd('/npc borin'); await wait(2500);
  await shot('13-nacht');
  await page.keyboard.press('e'); await wait(400);
  await shot('14-schlaf');
  await esc();
});
await step('Karte zeigt Ereignisse', async () => { await page.keyboard.press('m'); await wait(500); await shot('15-weltkarte'); await esc(); });
await browser.close();
if (errors.length) console.log('\nFehler in der Browserkonsole:\n  ' + errors.slice(0, 12).join('\n  '));
if (errors.length || failed) process.exit(1);
console.log('\nAlles in Ordnung. Screenshots: tests/e2e/out/welt-*.png');
