// Browser-Durchlauf: Menü → Charakter erstellen → Welt betreten → bewegen → angreifen.
// Voraussetzung: laufender Server (Standard http://localhost:7777, sonst EM_URL setzen) und Playwright.
//   npm run test:e2e
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
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push('Seitenfehler: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('Konsole: ' + m.text()); });
const step = async (name, fn) => { try { await fn(); console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + ': ' + e.message); await page.screenshot({ path: path.join(out, 'fehler.png') }); await browser.close(); process.exit(1); } };

console.log('Eternal Mana – Browser-Durchlauf gegen ' + url);
await step('Hauptmenü lädt (Grafik-Assets geladen)', async () => { await page.goto(url); await page.getByText('Spielen', { exact: true }).waitFor({ timeout: 20000 }); });
await step('Verbinden und Charakterauswahl', async () => { await page.getByText('Spielen', { exact: true }).click(); await page.getByText('Neues Spiel').first().waitFor({ timeout: 8000 }); });
const name = 'Test' + Math.random().toString(36).slice(2, 7);
await step('Charakter erstellen', async () => {
  await page.getByText('Neues Spiel').first().click();
  await page.getByText('Waldläufer').first().click();
  await page.locator('input').first().fill(name.replace(/[0-9]/g, 'x'));
  await page.getByText('Abenteuer beginnen').click();
  await page.getByText('Betreten').first().waitFor({ timeout: 8000 });
});
await step('Welt betreten', async () => {
  await page.getByText('Betreten').first().click();
  await page.waitForFunction(() => document.querySelector('#game canvas') && document.body.innerText.includes('Überspringen'), null, { timeout: 30000 });
  await page.getByText('Überspringen').click();
});
await page.screenshot({ path: path.join(out, '1-welt.png') });
await step('Bewegen und Angreifen ohne Fehler', async () => {
  for (const k of ['d', 's', 'a', 'w']) { await page.keyboard.down(k); await page.waitForTimeout(350); await page.keyboard.up(k); }
  await page.mouse.move(900, 300); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up();
  await page.keyboard.press('Space'); await page.keyboard.press('1');
  await page.waitForTimeout(500);
});
await step('Fenster öffnen (Inventar, Fähigkeiten, Quests, Karte)', async () => {
  for (const k of ['i', 'k', 'l', 'm']) { await page.keyboard.press(k); await page.waitForTimeout(350); await page.keyboard.press('Escape'); await page.waitForTimeout(150); }
});
await page.screenshot({ path: path.join(out, '2-nach-aktion.png') });
await browser.close();
if (errors.length) { console.log('\nFehler in der Browserkonsole:\n  ' + errors.slice(0, 10).join('\n  ')); process.exit(1); }
console.log('\nAlles in Ordnung. Screenshots: tests/e2e/out/');
