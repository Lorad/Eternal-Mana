// Browser-Durchlauf des Endspiels (0.5): Riss-Stein → Fenster (Risse, Quellstufen, Neuer Kreis) → Riss mit HUD → Echo → Abschluss
// → Schmiede „Angleichen“ → Neuer Kreis bei Mirelda. Macht Bilder nach tests/e2e/out/.
// Voraussetzung: Playwright und ein Server MIT Entwickler-Befehlen, am besten mit eigenem Datenordner:
//   EM_DEV=1 EM_PORT=7791 EM_DATA=/tmp/em-e2e npm start        (anderes Fenster)
//   EM_URL=http://localhost:7791 node tests/e2e/endgame.mjs [breite] [hoehe]
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
const url = process.env.EM_URL ?? 'http://localhost:7791';
const out = path.join(here, 'out');
const W = Number(process.argv[2] ?? 1280), H = Number(process.argv[3] ?? 720);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
let failed = 0;
page.on('pageerror', e => errors.push('Seitenfehler: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('Konsole: ' + m.text()); });
const shot = n => page.screenshot({ path: path.join(out, `endspiel-${W}x${H}-${n}.png`) });
const step = async (name, fn) => { try { await fn(); console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + ': ' + e.message.split('\n')[0]); await shot('fehler-' + name.replace(/\W+/g, '_')); failed++; } };
const chat = async s => { await page.keyboard.press('Enter'); const inp = page.locator('.chat-input input'); await inp.waitFor({ timeout: 12000 }); await inp.fill(s); await inp.press('Enter'); await page.waitForTimeout(500); };

await step('Menü', async () => { await page.goto(url); await page.getByText('Spielen', { exact: true }).waitFor({ timeout: 30000 }); });
await step('Charakter erstellen', async () => {
  await page.getByText('Spielen', { exact: true }).click();
  await page.getByText('Neues Spiel').first().waitFor({ timeout: 8000 });
  await page.getByText('Neues Spiel').first().click();
  await page.getByText('Krieger').first().click();
  await page.locator('input').first().fill('End' + Math.random().toString(36).replace(/[^a-z]/g, '').slice(0, 6));
  await page.getByText('Abenteuer beginnen').click();
  await page.getByText('Betreten').first().waitFor({ timeout: 8000 });
});
await step('Welt betreten', async () => {
  await page.getByText('Betreten').first().click();
  await page.waitForFunction(() => document.querySelector('#game canvas') && document.body.innerText.includes('Überspringen'), null, { timeout: 40000 });
  await page.getByText('Überspringen').click();
  await page.waitForTimeout(600);
});
await step('Dev: /endspiel (Stufe 40, am Riss-Stein)', async () => {
  await chat('/endspiel'); await page.waitForTimeout(1500);
  await chat('/riss 22'); await chat('/quell 7'); await chat('/echo 40');
  await page.waitForTimeout(800);
  await shot('1-riss-stein');
});
await step('Riss-Stein berühren öffnet das Endspiel-Fenster', async () => {
  await page.getByText('Riss-Stein berühren').waitFor({ timeout: 4000 });
  await page.keyboard.press('e');
  await page.getByText('Modifikatoren').first().waitFor({ timeout: 4000 });
  await shot('2-risse');
});
await step('Stufe wählen, Dungeon wechseln, Prüfung ansehen', async () => {
  await page.getByText('Archiv der Stille').first().click();
  await page.getByRole('button', { name: 'Stufe senken' }).click();
  await page.waitForTimeout(200);
  await shot('3-risse-archiv');
  await page.getByText('Prüfung der Sieben').first().click();
  await page.waitForTimeout(200);
  await shot('4-pruefung');
});
await step('Quellstufen: Punkte setzen', async () => {
  await page.getByRole('tab', { name: /Quellstufen/ }).click();
  await page.getByRole('button', { name: 'Quellkraft ausbauen' }).click();
  await page.getByRole('button', { name: 'Quellkraft ausbauen' }).click();
  await page.getByRole('button', { name: 'Quellblut ausbauen' }).click();
  await page.waitForTimeout(400);
  await shot('5-quell');
});
await step('Neuer Kreis (nur Anzeige, nicht bei Mirelda)', async () => {
  await page.getByRole('tab', { name: /Neuer Kreis/ }).click();
  await page.waitForTimeout(300);
  await shot('6-kreis');
});
await step('Riss öffnen: HUD mit Uhr und Modifikatoren', async () => {
  await page.getByRole('tab', { name: /Mana-Risse/ }).click();
  await page.getByText('Tiefe Geode').first().click();
  await page.getByRole('button', { name: 'Riss öffnen' }).click();
  await page.waitForFunction(() => document.querySelector('.rift-hud'), null, { timeout: 20000 });
  await page.waitForTimeout(2500);
  await shot('7-im-riss');
  await chat('/god'); await chat('/boss');
  await page.waitForTimeout(3500);
  await shot('8-echo');
});
await step('Echo besiegen: Abschluss, Truhen, zurück', async () => {
  for (let i = 0; i < 6; i++) { await chat('/kill'); await page.waitForTimeout(700); }
  await page.waitForTimeout(1500);
  await shot('9-abschluss');
});
await step('Schmiede: Reiter Angleichen', async () => {
  await chat('/tp gruenwald'); await page.waitForTimeout(4500);
  await chat('/legend'); await chat('/npc borin'); await page.waitForTimeout(800);
  await page.keyboard.press('e');
  await page.getByText('Schmieden, umschmieden').first().click();
  await page.getByRole('tab', { name: 'Angleichen' }).click();
  await page.waitForTimeout(400);
  await shot('10-angleichen');
  await page.getByRole('button', { name: 'Schließen' }).first().click(); await page.waitForTimeout(300);
});
await step('Mirelda: Neuen Kreis beginnen (Bestätigung)', async () => {
  await chat('/npc mirelda'); await page.waitForTimeout(800);
  await page.keyboard.press('e');
  await page.getByText('Einen Neuen Kreis beginnen').first().click();
  await page.getByRole('button', { name: /Kreis beginnen/ }).click();
  await page.waitForTimeout(300);
  await shot('11-kreis-bestaetigen');
  await page.getByRole('button', { name: 'Ja, neu beginnen' }).click();
  await page.waitForTimeout(3000);
  await shot('12-zweiter-kreis');
});
await browser.close();
if (errors.length) { console.log('\nFehler in der Browserkonsole:\n  ' + [...new Set(errors)].slice(0, 12).join('\n  ')); process.exit(1); }
if (failed) process.exit(1);
console.log('\nAlles in Ordnung. Bilder: tests/e2e/out/');
