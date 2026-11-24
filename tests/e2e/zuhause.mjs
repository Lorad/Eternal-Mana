// Browser-Durchlauf „Zuhause“ (0.7): Hof, Lagertruhe, Ausbau, Trophäen, Kleiderschrank, Bett, Stationen, Begleiter, Sammlung.
// Voraussetzung: laufender Server MIT Dev-Befehlen (EM_DEV=1; Standard http://localhost:7777, sonst EM_URL) und Playwright.
//   EM_DEV=1 npm start   →   node tests/e2e/zuhause.mjs          (EM_SIZE=900x540 für ein kleines Fenster)
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
const tag = W === 1280 ? 'zuhause' : `zuhause-${W}`;
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
const step = async (name, fn) => { try { await fn(); console.log('  ✓ ' + name); } catch (e) { failed++; console.log('  ✗ ' + name + ': ' + e.message.split('\n')[0]); await shot('fehler-' + failed); } };
const wait = ms => page.waitForTimeout(ms);
const cmd = async s => {
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.activeElement?.tagName === 'INPUT', null, { timeout: 3000 });
  await page.keyboard.type(s); await page.keyboard.press('Enter'); await wait(350);
};
const esc = async () => { await page.keyboard.press('Escape'); await wait(250); };
const has = t => page.getByText(t).first().waitFor({ timeout: 6000 });
/** Stellt die Figur an eine Kachel des Hofs (Kachelmitte) und wartet, bis die Aufforderung erscheint. */
const stand = async (tx, ty, prompt) => { await cmd(`/goto ${tx * 16 + 8} ${ty * 16 + 8}`); await wait(450); if (prompt) await has(prompt); };
const use = async () => { await page.keyboard.press('e'); await wait(450); };

console.log(`Eternal Mana – Zuhause im Browser gegen ${url} (${W}×${H})`);
await step('Welt betreten', async () => {
  await page.goto(url);
  await page.getByText('Spielen', { exact: true }).waitFor({ timeout: 20000 });
  await page.getByText('Spielen', { exact: true }).click();
  await page.getByText('Neues Spiel').first().click();
  await page.getByText('Waldläufer').first().click();
  await page.locator('input').first().fill('Heim' + Math.random().toString(36).slice(2, 7).replace(/[0-9]/g, 'x'));
  await page.getByText('Abenteuer beginnen').click();
  await page.getByText('Betreten').first().click();
  await page.waitForFunction(() => document.querySelector('#game canvas') && document.body.innerText.includes('Überspringen'), null, { timeout: 30000 });
  await page.getByText('Überspringen').click();
  await wait(600);
});
await step('Dev-Befehle wirken (sonst läuft der Server ohne EM_DEV=1)', async () => { await cmd('/lvl 20'); await cmd('/god'); await cmd('/welt aus'); await has('Lebendige Welt von selbst'); await cmd('/gold 30000'); await cmd('/time 0.5'); });
await step('Mirelda verkauft den Hof (Gesprächsoption)', async () => {
  await cmd('/quest m_wurzel');
  await cmd('/npc mirelda'); await wait(500);
  await use();
  await has('Den Hof am Waldrand kaufen');
  await page.getByText('Den Hof am Waldrand kaufen').click(); await wait(300);
  await has('Lagertruhe mit');
  await shot('01-kauf');
  await page.getByText(/^Kaufen/).click(); await wait(500);
  await has('gehört dir');
  await esc();
});
await step('Wegweiser in Quellhain führt auf den Hof', async () => {
  const sign = await page.evaluate(() => { const sc = window.__em.game.scene.getScene('game'); for (const v of sc.objs.values()) if (v.o.type === 'hobj' && v.o.tag === 'weg') return { x: v.o.x, y: v.o.y }; return null; });
  if (!sign) throw new Error('kein Wegweiser');
  await cmd(`/goto ${sign.x} ${sign.y + 18}`); await wait(500);
  await has('Zum Hof am Waldrand');
  await shot('02-wegweiser');
  await use(); await wait(1800);
  await has('Lagertruhe öffnen').catch(() => {});
  await shot('03-hof');
});
await step('Lagertruhe: einlagern, Gold, abheben', async () => {
  await cmd('/mats ore 14'); await cmd('/gear 3');
  await stand(18, 14, 'Lagertruhe öffnen');
  await use(); await has('Eine Truhe für alle');
  await page.locator('.hof-col').first().locator('.slot:not(.empty)').first().click(); await wait(200);
  await page.getByText('In die Truhe legen').click(); await wait(300);
  await page.locator('.hof-col').first().locator('.slot:not(.empty)').nth(2).dblclick(); await wait(300);
  await page.locator('.hof-gold-in').fill('1500'); await page.getByText('Einlagern', { exact: true }).click(); await wait(300);
  await page.locator('.hof-col').nth(1).locator('.slot:not(.empty)').first().click(); await wait(200);
  await has('In den Rucksack nehmen');
  await shot('04-lagertruhe');
  await esc();
});
await step('Ausbau: Kosten und Voraussetzungen', async () => {
  await stand(15, 18, 'Baupläne ansehen');
  await use(); await has('Vorratskammer');
  await shot('05-ausbau');
  await esc();
});
await step('ausgebauter Hof: Stationen, Bett, acht Ständer', async () => {
  await cmd('/hof 3'); await wait(600);
  await cmd('/trophaeen'); await cmd('/begleiter alle'); await cmd('/gewand'); await cmd('/bestiarium 30');
  await stand(22, 20);
  await shot('06-hof-stufe3');
});
await step('Trophäen aufstellen', async () => {
  await stand(19, 17, 'Trophäenständer');
  await use(); await has('Jagdtrophäen');
  await page.getByText('Borkenkrone').first().click(); await wait(300);
  await page.locator('.hof-stand').nth(1).click(); await page.getByText('Moosgrimms Flechtenbart').first().click(); await wait(200);
  await page.locator('.hof-stand').nth(2).click(); await page.getByText('Dorn der Dornenmutter').first().click(); await wait(200);
  await page.locator('.hof-stand').nth(3).click(); await page.getByText('Sieben Kerzen').first().click(); await wait(300);
  await shot('07-trophaeen');
  await esc(); await wait(400);
  await shot('08-hof-trophaeen');
});
await step('Kleiderschrank: Gewand und Waffenglanz', async () => {
  await stand(25, 14, 'Kleiderschrank öffnen');
  await use(); await has('Eigene Kleidung');
  await page.getByText('Gewand der Glut').first().click(); await wait(300);
  await page.getByText('Rissglanz').first().click(); await wait(300);
  await has('angelegt');
  await shot('09-kleiderschrank');
  await esc(); await wait(300);
  await page.mouse.move(W / 2 + 120, H / 2 - 40); await page.mouse.down(); await wait(120); await page.mouse.up(); await wait(60);
  await shot('10-gewand-im-spiel');
});
await step('Bett: Ausgeruht', async () => {
  await stand(27, 14, 'Schlafen');
  await use(); await has('Ausgeruht');
});
await step('Stationen auf dem Hof', async () => {
  await stand(28, 18, 'Schmieden');
  await use(); await has('Schmiede · Hof'); await has('Verbessern');
  await shot('11-schmiede');
  await esc();
  await stand(27, 24, 'Kochen');
  await use(); await has('Pilzling im Topf');
  await esc();
});
await step('Sammlung: Übersicht, Bestiarium, Begleiter, Erscheinungen', async () => {
  await page.keyboard.press('b'); await wait(500);
  await has('Meilensteine');
  await shot('12-sammlung');
  await page.getByRole('tab', { name: 'Bestiarium' }).click(); await wait(300);
  await has('Schwächen und Resistenzen');
  await shot('13-bestiarium');
  await page.getByRole('tab', { name: 'Fundstücke' }).click(); await wait(250); await shot('14-fundstuecke');
  await page.getByRole('tab', { name: 'Trophäen' }).click(); await wait(250); await shot('15-trophaeenliste');
  await page.getByRole('tab', { name: 'Begleiter' }).click(); await wait(300);
  await has('Quelldrachling');
  await page.getByText('Mitnehmen').nth(2).click(); await wait(300);
  await shot('16-begleiter');
  await page.getByRole('tab', { name: 'Erscheinungen' }).click(); await wait(250); await shot('17-erscheinungen');
  await page.getByRole('tab', { name: 'Rezepte' }).click(); await wait(250); await shot('18-rezepte');
  await esc();
});
await step('Begleiter läuft mit; das Tor führt zurück nach Quellhain', async () => {
  await stand(22, 28);
  await page.keyboard.down('d'); await wait(500); await page.keyboard.up('d'); await wait(300);
  await shot('19-begleiter-im-spiel');
  await stand(23, 30, 'Zurück nach Quellhain');
  await use(); await wait(1800);
  await has('Zum Hof am Waldrand');
  await shot('20-quellhain');
});
await step('Heimreise per Quellstein steht auf der Weltkarte', async () => {
  const stone = await page.evaluate(() => { const sc = window.__em.game.scene.getScene('game'); for (const v of sc.objs.values()) if (v.o.type === 'stone') return { x: v.o.x, y: v.o.y }; return null; });
  await cmd(`/goto ${stone.x} ${stone.y + 18}`); await wait(400);
  await page.keyboard.press('m'); await wait(500);
  await has('Nach Hause reisen');
  await shot('21-karte');
  await page.getByText('Nach Hause reisen').click(); await wait(1800);
  await has('Hof am Waldrand');
});

await browser.close();
for (const e of errors) console.log('  ! ' + e);
console.log(failed || errors.length ? `\n${failed} Schritt(e) fehlgeschlagen, ${errors.length} Fehler in der Konsole.` : '\nAlles in Ordnung. Bilder: tests/e2e/out/' + tag + '-*.png');
process.exit(failed || errors.length ? 1 : 0);
