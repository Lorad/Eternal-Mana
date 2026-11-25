// Browser-Durchlauf der Expeditionen (0.9): Portal → Auswahl → (Bereitschaft der Gruppe) → Instanz → Abschnitte → Mini-Boss →
// Bossphasen → Abschlussbildschirm → gemeinsame Rückkehr → Zusammenfassung → Schmiede. Allein und zu zweit. Bilder: tests/e2e/out/.
//   EM_DEV=1 EM_PORT=7795 EM_DATA=/tmp/em-e2e npm start        (anderes Fenster)
//   EM_URL=http://localhost:7795 node tests/e2e/expedition.mjs
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
const url = process.env.EM_URL ?? 'http://localhost:7795';
const out = path.join(here, 'out');
fs.mkdirSync(out, { recursive: true });
const args = ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
let browser;
try { browser = await chromium.launch({ args }); }
catch { browser = await chromium.launch({ args, executablePath: process.env.EM_CHROME ?? '/usr/bin/google-chrome' }); }
const errors = [];
let failed = 0;
const tag = Math.random().toString(36).replace(/[^a-z]/g, '').slice(0, 5).padEnd(5, 'x');

async function player(key, name, cls) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`[${key}] Seitenfehler: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !/WebSocket|ERR_CONNECTION|net::/.test(m.text())) errors.push(`[${key}] Konsole: ${m.text()}`); });
  return {
    key, name, cls, page,
    wait: ms => page.waitForTimeout(ms),
    shot: n => page.screenshot({ path: path.join(out, `expedition-${n}-${key}.png`) }),
    has: (t, timeout = 8000) => page.getByText(t).first().waitFor({ timeout }),
    cmd: async s => {
      const inp = page.locator('.chat-input input');
      for (let i = 0; ; i++) {
        await page.locator('.chat-open, .chat-input input').first().waitFor({ timeout: 40000 });
        if (!(await inp.count())) await page.keyboard.press('Enter');
        try { await inp.waitFor({ timeout: 2500 }); break; } catch (e) { if (i >= 4) throw e; }
      }
      await inp.fill(s); await inp.press('Enter'); await page.waitForTimeout(350);
    },
    loaded: async () => { await page.waitForTimeout(1200); await page.locator('.hud').waitFor({ timeout: 40000 }); await page.waitForTimeout(700); },
    esc: async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(200); },
  };
}
const step = async (name, fn, ps) => {
  try { await fn(); console.log('  ✓ ' + name); }
  catch (e) { failed++; console.log('  ✗ ' + name + ': ' + e.message.split('\n')[0]); for (const p of ps) await p.shot('fehler-' + failed).catch(() => {}); }
};
const enter = async p => {
  await p.page.goto(url + '/?hinweise=aus');
  await p.page.getByText('Spielen', { exact: true }).waitFor({ timeout: 30000 });
  await p.page.getByText('Spielen', { exact: true }).click();
  await p.page.getByText('Neues Spiel').first().click();
  await p.page.getByText(p.cls).first().click();
  await p.page.locator('input').first().fill(p.name);
  await p.page.getByText('Abenteuer beginnen').click();
  await p.page.getByText('Betreten').first().click();
  await p.page.waitForFunction(() => document.querySelector('#game canvas') && document.body.innerText.includes('Überspringen'), null, { timeout: 40000 });
  await p.page.getByText('Überspringen').click();
  await p.wait(600);
};
/** einen Abschnitt ansehen: hinspringen, Gegner in der Nähe beseitigen, Bild machen */
const visit = async (p, sec, n, kill = true) => { await p.cmd('/expgo ' + sec); await p.wait(900); if (kill) { await p.cmd('/kill'); await p.wait(500); } await p.shot(n); };

console.log('Eternal Mana – Expeditionen gegen ' + url);
// =================================================================== allein
const a = await player('a', 'Ada' + tag, 'Krieger');
await step('Welt betreten, Expeditionen freischalten, zum Portal', async () => {
  await enter(a);
  await a.cmd('/lvl 6'); await a.cmd('/gear 2'); await a.cmd('/expfrei'); await a.cmd('/welt aus'); await a.cmd('/time 0.45');
  await a.cmd('/portal'); await a.loaded();
  await a.has('Expeditionen wählen');
  await a.shot('01-portal');
}, [a]);
await step('Auswahlfenster: Liste, Beschreibung, Schwierigkeitsgrade, Freischaltung', async () => {
  await a.page.keyboard.press('e');
  await a.has('Die Wurzeltiefe');
  await a.has('Herausforderung der Woche');
  await a.has('Erst nach einem Abschluss auf Normal.');
  await a.shot('02-auswahl');
}, [a]);
await step('Allein aufbrechen: eigene Instanz, Einleitung, HUD', async () => {
  await a.page.getByRole('button', { name: 'Allein aufbrechen' }).click();
  await a.loaded();
  await a.has('Eingeritzt in die Rinde', 15000);
  await a.shot('03-eingang');
  await a.esc();
  await a.page.locator('.exp-hud').waitFor({ timeout: 8000 });
  await a.has('Weiter:');
  await a.cmd('/god');
}, [a]);
await step('Abschnitte ansehen (Erkundung, Grotte, Halle, Fallen, Rätsel, Tiefe, Brücke, Elite, Rast)', async () => {
  await visit(a, 'moosgang', '04-moosgang');
  await visit(a, 'pilzhain', '05-pilzhain');
  await visit(a, 'waechterhalle', '06-halle');
  await visit(a, 'dornengang', '07-fallen', false);
  await visit(a, 'fackelkreis', '08-raetsel');
  await visit(a, 'abstieg', '09-abstieg');
  await visit(a, 'tiefe', '10-tiefe-hinterhalt', false);
  await a.has('Hinterhalt', 8000);
  await a.wait(2500); await a.shot('10b-hinterhalt-welle');
  await visit(a, 'runenbruecke', '11-runenbruecke');
  await visit(a, 'dornensaal', '12-elite');
  await visit(a, 'rast', '13-rast', false);
  await a.has('Letzte Rast', 4000).catch(() => {});
}, [a]);
await step('Geheime Schatzkammer: hinter der rissigen Wand', async () => { await visit(a, 'gruftschatz', '14-schatzkammer', false); }, [a]);
await step('Mini-Boss: Bossleiste mit Namen', async () => {
  await a.cmd('/expgo sporenhof'); await a.wait(800);
  await a.page.mouse.move(700, 330); await a.page.mouse.down(); await a.wait(2500); await a.page.mouse.up();
  await a.page.locator('.boss-bar, .bossbar, [class*=boss]').first().waitFor({ timeout: 8000 });
  await a.shot('15-miniboss');
}, [a]);
await step('Endboss: Arena, Signatur, Phasen 2 und 3', async () => {
  await a.cmd('/expgo wurzelherz'); await a.wait(600);
  await a.cmd('/expgo wurzelherz'); await a.wait(2500);
  await a.has('Dornenknospen', 8000);
  await a.shot('16-boss-phase1');
  await a.cmd('/expphase 2'); await a.wait(2500); await a.shot('17-boss-phase2');
  await a.cmd('/expphase 3'); await a.wait(2500); await a.shot('18-boss-phase3');
}, [a]);
await step('Sieg: Arena versiegelt, Abschlussbildschirm mit Statistik', async () => {
  await a.cmd('/expsieg'); await a.wait(1500);
  await a.shot('19-boss-tod');
  await a.has('Expedition abgeschlossen', 12000);
  await a.has('Erster Abschluss auf Normal');
  await a.shot('20-abschluss');
}, [a]);
await step('Portal in der Belohnungskammer, gemeinsame Rückkehr, Zusammenfassung, Schmiede', async () => {
  await a.page.getByRole('button', { name: 'Umsehen' }).click(); await a.wait(400);
  await a.shot('21-belohnungskammer');
  await a.page.getByRole('button', { name: /Gemeinsam heimkehren/ }).first().click();
  await a.loaded();
  await a.has('Zurück aus Die Wurzeltiefe', 12000);
  await a.shot('22-zusammenfassung');
  await a.page.getByRole('button', { name: 'Zur Schmiede' }).click(); await a.wait(1200);
  await a.shot('23-schmiede');
  await a.esc();
}, [a]);
await step('Bestzeit im Auswahlfenster, Schwer ist jetzt frei', async () => {
  await a.cmd('/portal'); await a.wait(800);
  await a.page.keyboard.press('e');
  await a.has('Bestzeit'); await a.has('1× abgeschlossen');
  await a.shot('24-bestzeit');
  await a.esc();
}, [a]);

// =================================================================== zu zweit
const b = await player('b', 'Bo' + tag, 'Magier');
const both = fn => Promise.all([fn(a), fn(b)]);
await step('Zweiter Spieler, Gruppe bilden', async () => {
  await enter(b);
  await b.cmd('/lvl 6'); await b.cmd('/expfrei'); await b.cmd('/god'); await b.cmd('/welt aus');
  await a.page.keyboard.press('p'); await a.wait(400);
  await a.page.locator('.pp-list li', { hasText: b.name }).getByRole('button', { name: 'Einladen' }).click();
  await b.has('lädt dich in eine Gruppe ein');
  await b.page.getByRole('button', { name: 'Annehmen' }).click();
  await a.has('führt an'); await a.esc();
}, [a, b]);
await step('Bereitschaftsprüfung: Anführung wählt, Mitglied sieht den Stand und meldet sich bereit', async () => {
  await a.cmd('/portal'); await a.wait(900);
  await a.page.keyboard.press('e'); await a.has('Die Wurzeltiefe');
  await a.page.getByRole('button', { name: 'Gruppe zur Bereitschaft rufen' }).click();
  await b.has('Bereitschaft', 8000);
  await b.shot('25-bereitschaft-mitglied');
  await a.shot('25-bereitschaft-anfuehrung');
  await b.page.getByRole('button', { name: 'Bereit', exact: true }).click();
  await a.has('Alle sind bereit.');
  await a.page.getByRole('button', { name: 'Aufbrechen' }).click();
  await both(p => p.loaded());
  await both(p => p.page.locator('.exp-hud').waitFor({ timeout: 15000 }));
  await both(p => p.esc());
  await both(p => p.shot('26-gruppe-eingang'));
}, [a, b]);
await step('Zu zweit zum Boss, Sieg, Abschluss für beide, gemeinsame Rückkehr', async () => {
  await a.cmd('/expgo wurzelherz'); await b.cmd('/expgo wurzelherz'); await a.wait(600);
  await a.cmd('/expgo wurzelherz'); await b.cmd('/expgo wurzelherz'); await a.wait(2500);
  await both(p => p.shot('27-gruppe-boss'));
  await a.cmd('/expsieg');
  await both(p => p.has('Expedition abgeschlossen', 12000));
  await both(p => p.shot('28-gruppe-abschluss'));
  await a.page.getByRole('button', { name: 'Gemeinsam heimkehren' }).first().click();
  await a.wait(800);
  await a.has('bereit für den Heimweg', 6000).catch(() => {});
  await b.page.getByRole('button', { name: 'Gemeinsam heimkehren' }).first().click();
  await both(p => p.loaded());
  await both(p => p.has('Zurück aus Die Wurzeltiefe', 12000));
  await both(p => p.shot('29-gruppe-zurueck'));
}, [a, b]);

console.log(errors.length ? '\nFehler im Browser:\n' + [...new Set(errors)].slice(0, 20).join('\n') : '\nKeine Fehler im Browser.');
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
