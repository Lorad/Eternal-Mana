// Browser-Durchlauf „Erste Schritte“ (0.8): ein neuer Spieler – Hinweise beim ersten Kontakt, Handbuch, neue Tasten,
// Questverfolgung ein- und ausklappen, Leistungsanzeige, „Blitze reduzieren“, Verbindung weg und wieder da.
// Voraussetzung: laufender Server MIT Dev-Befehlen (EM_DEV=1; Standard http://localhost:7777, sonst EM_URL) und Playwright.
//   EM_DEV=1 npm start   →   node tests/e2e/erste-schritte.mjs
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

// dieser Durchlauf prüft gerade die Hinweise – ein „?hinweise=aus“ des Sammelbefehls wird deshalb entfernt
const url = (process.env.EM_URL ?? 'http://localhost:7777').split('?')[0];
const out = path.join(here, 'out');
fs.mkdirSync(out, { recursive: true });
const args = ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
let browser;
try { browser = await chromium.launch({ args }); }
catch { browser = await chromium.launch({ args, executablePath: process.env.EM_CHROME ?? '/usr/bin/google-chrome' }); }
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('Seitenfehler: ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/ERR_INTERNET_DISCONNECTED|WebSocket connection|net::ERR/.test(m.text())) errors.push('Konsole: ' + m.text()); });
let failed = 0;
const shot = n => page.screenshot({ path: path.join(out, `erste-${n}.png`) });
const step = async (name, fn) => { try { await fn(); console.log('  ✓ ' + name); } catch (e) { failed++; console.log('  ✗ ' + name + ': ' + e.message.split('\n')[0]); await shot('fehler-' + failed); } };
const wait = ms => page.waitForTimeout(ms);
const cmd = async s => {
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.activeElement?.tagName === 'INPUT', null, { timeout: 3000 });
  await page.keyboard.type(s); await page.keyboard.press('Enter'); await wait(300);
};
const has = (t, ms = 8000) => page.getByText(t).first().waitFor({ timeout: ms });
const gone = (sel, ms = 4000) => page.waitForFunction(s => !document.querySelector(s), sel, { timeout: ms });
const hint = title => page.locator('.hint b', { hasText: title }).waitFor({ timeout: 9000 });
const state = fn => page.evaluate(fn);

console.log('Eternal Mana – Erste Schritte gegen ' + url);
await step('Hauptmenü: das Handbuch ist schon vor dem Spiel erreichbar', async () => {
  await page.goto(url);
  await page.getByText('Spielen', { exact: true }).waitFor({ timeout: 30000 });
  await page.getByText('Handbuch', { exact: true }).click();
  await has('Erste Schritte'); await has('Wenn etwas hakt');
  await page.keyboard.press('Escape'); await gone('.win-handbuch');
});
await step('neuer Charakter betritt die Welt, liest die Einleitung', async () => {
  await page.getByText('Spielen', { exact: true }).click();
  await page.getByText('Neues Spiel').first().click();
  await page.getByText('Krieger').first().click();
  await page.locator('input').first().fill('Neu' + Math.random().toString(36).slice(2, 7).replace(/[0-9]/g, 'x'));
  await page.getByText('Abenteuer beginnen').click();
  await page.getByText('Betreten').first().click();
  await page.waitForFunction(() => document.querySelector('#game canvas') && document.body.innerText.includes('Überspringen'), null, { timeout: 30000 });
  for (let i = 0; i < 8 && await page.locator('.story').count(); i++) { await page.locator('.story .btn-primary').click(); await wait(250); }
  await gone('.story');
});
await step('erster Hinweis: zu Mirelda – „Verstanden“ blendet ihn aus', async () => {
  await hint('Willkommen in Quellhain');
  await shot('01-hinweis');
  await page.getByText('Verstanden', { exact: true }).click();
  await gone('.hint');
  if (!(await state(() => JSON.parse(localStorage.getItem('eternal-mana-settings')).hintsSeen.includes('start')))) throw new Error('Hinweis wurde nicht als gesehen vermerkt');
});
await step('Quest annehmen: Questverfolgung erscheint, Hinweis zum Kämpfen folgt', async () => {
  await cmd('/welt aus'); await has('Lebendige Welt von selbst');     // sonst läuft der Server ohne EM_DEV=1
  await cmd('/npc mirelda'); await wait(400);
  await page.keyboard.press('e'); await wait(400);
  await page.getByText('Ein Flüstern im Wasser').first().click(); await wait(250);
  for (let i = 0; i < 6 && await page.getByText('Weiter', { exact: true }).count(); i++) { await page.getByText('Weiter', { exact: true }).first().click(); await wait(220); }
  await page.getByText('Annehmen', { exact: true }).click(); await wait(300);
  await page.keyboard.press('Escape');
  await page.locator('.qt-q', { hasText: 'Ein Flüstern im Wasser' }).waitFor({ timeout: 4000 });
  await hint('Kämpfen');
  await shot('02-kampfhinweis');
});
await step('„Mehr im Handbuch“ öffnet das passende Kapitel', async () => {
  await page.getByText('Mehr im Handbuch').click();
  await page.locator('.hb-title', { hasText: 'Kampf' }).waitFor({ timeout: 4000 });
  await has('Ausweichrolle');
  await shot('03-handbuch-kampf');
  await page.keyboard.press('Escape'); await gone('.win-handbuch');
});
await step('Taste H: Handbuch – jedes Kapitel hat Inhalt, Zahlen stammen aus den Spieldaten', async () => {
  await page.keyboard.press('h');
  await page.locator('.win-handbuch').waitFor({ timeout: 4000 });
  const n = await page.locator('.hb-tab').count();
  if (n < 12) throw new Error('nur ' + n + ' Kapitel');
  for (let i = 0; i < n; i++) {
    await page.locator('.hb-tab').nth(i).click(); await wait(120);
    const len = await page.locator('.hb-page').innerText().then(t => t.length);
    if (len < 250) throw new Error('Kapitel ' + i + ' ist fast leer');
  }
  await page.locator('.hb-tab', { hasText: 'Endspiel' }).click();
  const cfg = await state(() => document.querySelector('.hb-page').innerText);
  if (!/1 bis 30/.test(cfg) || !/Modifikatoren/.test(cfg)) throw new Error('Endspiel-Kapitel ohne Stufen und Modifikatoren');
  await page.locator('.hb-tab', { hasText: 'Steuerung' }).click();
  await has('Questverfolgung ein-/ausklappen'); await has('Leistungsanzeige');
  await shot('04-handbuch-steuerung');
  await page.keyboard.press('h'); await gone('.win-handbuch');           // dieselbe Taste schließt wieder
});
await step('Taste T klappt die Questverfolgung ein und wieder aus; F3 zeigt die Leistungsanzeige', async () => {
  await page.keyboard.press('t'); await page.locator('.qt.shut').waitFor({ timeout: 3000 });
  if (await page.locator('.qt-q').count()) throw new Error('eingeklappt, aber Quests sichtbar');
  await page.keyboard.press('t'); await page.locator('.qt-q').first().waitFor({ timeout: 3000 });
  await page.keyboard.press('F3');
  await page.waitForFunction(() => /Bilder\/s/.test(document.querySelector('.perf')?.textContent ?? ''), null, { timeout: 4000 });
  await shot('05-leistungsanzeige');
  await page.keyboard.press('F3'); await gone('.perf');
});
await step('Menü: alle Fenster erreichbar; Einstellung „Blitze reduzieren“ wirkt', async () => {
  await page.keyboard.press('Escape');
  await page.locator('.win-pause').waitFor({ timeout: 3000 });
  for (const t of ['Gruppe', 'Ruf und Welt', 'Sammlung', 'Handbuch']) await page.locator('.win-pause').getByText(t, { exact: true }).waitFor({ timeout: 2000 });
  await page.locator('.win-pause').getByText('Sammlung', { exact: true }).click();
  await page.locator('.win-sammlung').waitFor({ timeout: 3000 });
  await page.keyboard.press('Escape'); await gone('.win-sammlung');
  await page.keyboard.press('Escape');
  await page.locator('.win-pause').getByText('Einstellungen', { exact: true }).click();
  await page.getByText('Blitze reduzieren').click();
  await page.locator('.em-root.reduce-flash').waitFor({ timeout: 2000 });
  await shot('06-einstellungen');
  await page.getByText('Blitze reduzieren').click();
  await page.keyboard.press('Escape'); await wait(200); await page.keyboard.press('Escape'); await gone('.backdrop');
});
await step('Hinweise abschalten und wieder einschalten', async () => {
  await page.keyboard.press('h'); await page.locator('.hb-tab', { hasText: 'Erste Schritte' }).click();
  await page.getByText('Abschalten', { exact: true }).click();
  await page.keyboard.press('Escape'); await gone('.win-handbuch');
  await cmd('/lvl 3'); await wait(3500);
  if (await page.locator('.hint').count()) throw new Error('Hinweis trotz Abschalten');
  await page.keyboard.press('h'); await page.getByText('Einschalten', { exact: true }).click();
  await page.keyboard.press('Escape'); await gone('.win-handbuch');
  await hint('Stufenaufstieg');
});
await step('Verbindung weg: Meldung mit Ausweg statt eines stehenden Bildes – und danach geht es weiter', async () => {
  await ctx.setOffline(true);
  // bestehende Verbindungen kappt der Browser nicht in jedem Fall selbst – dann schließt das Spiel sie nach ausbleibenden Antworten
  await page.evaluate(() => window.__em.net.dropForTest());
  await has('Verbindung verloren', 15000);
  await page.getByText('Zum Hauptmenü', { exact: true }).waitFor({ timeout: 12000 });
  await shot('07-verbindung-weg');
  await ctx.setOffline(false);
  await page.waitForFunction(() => window.__em.store.state.conn === 'online' && window.__em.store.state.screen === 'game' && !document.querySelector('.reconnect'), null, { timeout: 30000 });
  await page.keyboard.down('d'); await wait(400); await page.keyboard.up('d');
  await shot('08-wieder-da');
});
await browser.close();
if (errors.length) console.log('\nFehler in der Browserkonsole:\n  ' + errors.slice(0, 10).join('\n  '));
console.log(failed || errors.length ? `\n${failed} Schritt(e) fehlgeschlagen, ${errors.length} Fehler in der Konsole.` : '\nAlles in Ordnung. Bilder: tests/e2e/out/erste-*.png');
process.exit(failed || errors.length ? 1 : 0);
