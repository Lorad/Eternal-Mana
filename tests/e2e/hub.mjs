// Browser-Durchlauf „Quellwarte“ (0.9): hinreisen, zu jeder Einrichtung gehen und sie benutzen, Nacht, Tor nach Quellhain.
// Voraussetzung: laufender Server MIT Dev-Befehlen (EM_DEV=1; Standard http://localhost:7777, sonst EM_URL) und Playwright.
//   EM_DEV=1 npm start   →   node tests/e2e/hub.mjs          (EM_SIZE=1000x560 oder 600x900 für kleine Fenster)
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
const [W, H] = (process.env.EM_SIZE ?? '1280x720').split('x').map(Number);
const tag = W === 1280 ? 'hub' : `hub-${W}`;
const out = path.join(here, 'out');
fs.mkdirSync(out, { recursive: true });
const args = ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
let browser;
try { browser = await chromium.launch({ args }); }
catch { browser = await chromium.launch({ args, executablePath: process.env.EM_CHROME ?? '/usr/bin/google-chrome' }); }
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on('pageerror', e => errors.push('Seitenfehler: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('Konsole: ' + m.text()); });
let failed = 0;
const shot = n => page.screenshot({ path: path.join(out, `${tag}-${n}.png`) });
const step = async (name, fn) => { try { await fn(); console.log('  ✓ ' + name); } catch (e) { failed++; console.log('  ✗ ' + name + ': ' + e.message.split('\n')[0]); await shot('fehler-' + failed); await esc(); await esc(); } };
const wait = ms => page.waitForTimeout(ms);
const cmd = async s => {
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.activeElement?.tagName === 'INPUT', null, { timeout: 3000 });
  await page.keyboard.type(s); await page.keyboard.press('Enter'); await wait(350);
};
async function esc() { await page.keyboard.press('Escape'); await wait(250); }
const has = t => page.getByText(t).first().waitFor({ timeout: 6000 });
const use = async () => { await page.keyboard.press('e'); await wait(500); };
const zone = () => page.evaluate(() => window.__em.game.scene.getScene('game').map?.id);
/** Stellt die Figur vor ein Objekt der Szene (NPC oder Objekt der Warte) und wartet auf die Aufforderung */
async function goTo(type, t, prompt) {
  const find = ([type, t]) => { const sc = window.__em.game.scene.getScene('game'); for (const v of sc.objs.values()) if (v.o.type === type && v.o.tag === t) return { x: v.o.x, y: v.o.y }; return null; };
  await page.waitForFunction(find, [type, t], { timeout: 10000 }).catch(() => {});
  const p = await page.evaluate(find, [type, t]);
  if (!p) throw new Error(`${type} ${t} nicht in der Szene`);
  await cmd(`/goto ${p.x} ${p.y + 16}`); await wait(500);
  if (prompt) await has(prompt);
}
/** Mit einem Hüter sprechen und eine Gesprächsoption wählen */
async function talk(npc, name, option) {
  await goTo('npc', npc, `Mit ${name} sprechen`);
  await use();
  await has(option);
  await page.getByText(option).first().click(); await wait(500);
}

console.log(`Eternal Mana – Quellwarte im Browser gegen ${url} (${W}×${H})`);
await step('Welt betreten', async () => {
  await page.goto(url.includes('?') ? url : url + '?hinweise=aus');
  await page.getByText('Spielen', { exact: true }).waitFor({ timeout: 20000 });
  await page.getByText('Spielen', { exact: true }).click();
  await page.getByText('Neues Spiel').first().click();
  await page.getByText('Paladin').first().click();
  await page.locator('input').first().fill('Warte' + Math.random().toString(36).slice(2, 7).replace(/[0-9]/g, 'q'));
  await page.getByText('Abenteuer beginnen').click();
  await page.getByText('Betreten').first().click();
  await page.waitForFunction(() => document.querySelector('#game canvas') && document.body.innerText.includes('Überspringen'), null, { timeout: 30000 });
  await page.getByText('Überspringen').click();
  await wait(600);
});
await step('Dev-Befehle wirken (sonst läuft der Server ohne EM_DEV=1)', async () => { await cmd('/welt aus'); await has('Lebendige Welt von selbst'); await cmd('/lvl 20'); await cmd('/god'); await cmd('/gold 60000'); await cmd('/time 0.5'); });
await step('Weltkarte am Quellstein: „Zur Quellwarte reisen“', async () => {
  await goTo('stone', 'stone', 'Quellstein');
  await use(); await wait(500);
  await has('Zur Quellwarte reisen');
  await shot('01-weltkarte');
  await page.getByText('Zur Quellwarte reisen').first().click();
  await page.waitForFunction(() => window.__em.game.scene.getScene('game').map?.id === 'quellwarte', null, { timeout: 15000 });
  await wait(2500);
  await shot('02-ankunft');
});
await step('Übersicht am Ankunftsplatz', async () => { await goTo('qobj', 'karte', 'Übersicht der Quellwarte'); await use(); await has('Lagerhaus'); await shot('03-uebersicht'); await esc(); });
await step('Ausrüstungshändler: Tagesware kaufen', async () => {
  await talk('ottmar', 'Ottmar', 'Ware des Tages ansehen');
  await has('Tagesware für');
  await shot('04-haendler');
  await page.locator('.hub-shop .shop-row:not(.got) .btn-primary:not([disabled])').first().click(); await wait(600);
  await has('Verkauft');
  await esc();
});
await step('Schmiede: Gunda öffnet die Schmiede', async () => { await talk('gunda', 'Gunda', 'Schmieden, umschmieden'); await page.locator('.craft, .win-craft, [class*="craft"]').first().waitFor({ timeout: 6000 }); await shot('05-schmiede'); await esc(); });
await step('Alchemie: Irmela öffnet die Alchemie', async () => { await talk('irmela', 'Irmela', 'Tränke und Elixiere brauen'); await page.locator('[class*="craft"]').first().waitFor({ timeout: 6000 }); await esc(); });
await step('Fähigkeitenmeister: Meisterränge', async () => { await talk('corvin', 'Meister Corvin', 'Meisterränge lernen'); await has('Meisterrang 1'); await shot('06-meister'); await esc(); });
await step('Lagerhaus: Regal kaufen, Truhe öffnen', async () => {
  await talk('fridolin', 'Fridolin', 'Mehr Platz kaufen');
  await has('Gekaufte Regale');
  await page.getByText('Regal kaufen').first().click(); await wait(300);
  await page.getByText(/Gold kaufen$/).first().click(); await wait(600);
  await has('1 / 6');
  await shot('07-lagerhaus');
  await page.getByText('Truhe öffnen').first().click(); await wait(500);
  await has('Lagertruhe');
  await shot('08-truhe');
  await esc();
});
await step('Gasthaus: Gerüchtebrett und eine Geschichte', async () => {
  await goTo('qobj', 'geruechte', 'Gerüchtebrett lesen'); await use();
  await page.locator('.hub-note').first().waitFor({ timeout: 6000 });
  await shot('09-geruechte'); await esc();
  await goTo('npc', 'alrik', 'Mit Alrik der Halbe sprechen'); await use();
  await has('Erzähl von früher.'); await page.getByText('Erzähl von früher.').click(); await wait(500);
  await shot('10-alrik'); await esc();
});
await step('Trophäenhalle', async () => {
  await talk('bertram', 'Bertram', 'Durch die Trophäenhalle gehen');
  await has('Besiegte Gegner'); await shot('11-halle');
  await page.getByText('Bestzeiten').first().click(); await wait(300); await has('Noch keine Expedition');
  await esc();
});
await step('Gruppenbereich: Gesuch aushängen und abhängen', async () => {
  await talk('wenke', 'Wenke', 'Gruppenbereich: Leute finden');
  await has('Dein Gesuch');
  await page.getByText('Gesuch aushängen').click(); await wait(700);
  await has('Abhängen');
  await shot('12-gruppe');
  await page.getByText('Abhängen').click(); await wait(500);
  await esc();
});
await step('Portalplatz bei Nacht', async () => { await cmd('/time 0.95'); await cmd(`/goto ${38 * 16 + 8} ${27 * 16 + 8}`); await wait(2000); await shot('13-nacht'); await cmd('/time 0.5'); });
await step('Tor im Süden führt nach Quellhain', async () => {
  await goTo('qobj', 'tor', 'Durch das Tor nach Quellhain'); await use();
  await page.waitForFunction(() => window.__em.game.scene.getScene('game').map?.id === 'gruenwald', null, { timeout: 15000 });
  await wait(2000);
  await goTo('qobj', 'qw_tor', 'Durch das Tor zur Quellwarte');
  await shot('14-tor-quellhain');
});

const bad = errors.filter(e => !/favicon|ERR_|net::/.test(e));
if (bad.length) { failed++; console.log('  ✗ Fehler in der Konsole:\n    ' + bad.slice(0, 8).join('\n    ')); }
await browser.close();
console.log(failed ? `${failed} Schritt(e) gescheitert.` : 'Alles bestanden.');
process.exit(failed ? 1 : 0);
