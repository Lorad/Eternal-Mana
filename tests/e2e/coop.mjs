// Koop-Durchlauf mit ZWEI echten Browsern (0.7): Gruppe bilden, ansehen, handeln, Quest teilen, gemeinsame Element-Reaktion,
// Mana-Riss mit Verbindungsabriss und Wiederverbindung, Gruppentruhe, Weltereignis, Neuladen der Seite.
// Voraussetzung: Playwright und ein Server MIT Entwickler-Befehlen, am besten mit eigenem Datenordner:
//   EM_DEV=1 EM_PORT=7793 EM_DATA=/tmp/em-coop npm start        (anderes Fenster)
//   EM_URL=http://localhost:7793 node tests/e2e/coop.mjs
// Bilder landen in tests/e2e/out/coop-*.png (a = Anführerin, b = Mitspieler).
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

const url = process.env.EM_URL ?? 'http://localhost:7793';
const out = path.join(here, 'out');
fs.mkdirSync(out, { recursive: true });
const args = ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
let browser;
try { browser = await chromium.launch({ args }); }
catch { browser = await chromium.launch({ args, executablePath: process.env.EM_CHROME ?? '/usr/bin/google-chrome' }); }

const errors = [];
let failed = 0;
const tag = Math.random().toString(36).replace(/[^a-z]/g, '').slice(0, 5).padEnd(5, 'x');
/** Ein Spieler = eigener Browser-Kontext (eigenes Profil), eigene Seite; die WebSocket-Verbindung läuft durch uns, damit wir sie kappen können. */
async function player(key, name, cls) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const sockets = [];
  await page.routeWebSocket(/\/ws$/, ws => { const server = ws.connectToServer(); sockets.push({ ws, server }); });
  page.on('pageerror', e => errors.push(`[${key}] Seitenfehler: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !/WebSocket|ERR_CONNECTION|net::/.test(m.text())) errors.push(`[${key}] Konsole: ${m.text()}`); });
  const P = {
    key, name, cls, page, sockets,
    wait: ms => page.waitForTimeout(ms),
    shot: n => page.screenshot({ path: path.join(out, `coop-${n}-${key}.png`) }),
    has: (t, timeout = 8000) => page.getByText(t).first().waitFor({ timeout }),
    gone: (t, timeout = 8000) => page.getByText(t).first().waitFor({ state: 'hidden', timeout }),
    /** Chatzeile oder Dev-Befehl (wartet, bis die Zone geladen ist – im Ladebild gibt es keinen Chat) */
    cmd: async s => {
      const inp = page.locator('.chat-input input');
      for (let i = 0; ; i++) {
        await page.locator('.chat-open, .chat-input input').first().waitFor({ timeout: 40000 });
        if (!(await inp.count())) await page.keyboard.press('Enter');
        try { await inp.waitFor({ timeout: 2500 }); break; } catch (e) { if (i >= 4) throw e; }
      }
      await inp.fill(s); await inp.press('Enter'); await page.waitForTimeout(350);
    },
    /** nach einem Zonenwechsel: warten, bis das Spiel wieder steht */
    loaded: async () => { await page.waitForTimeout(1200); await page.locator('.hud').waitFor({ timeout: 40000 }); await page.waitForTimeout(600); },
    esc: async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(200); },
    /** hält die Angriffstaste (Maus) in eine Richtung gedrückt */
    aim: async (dx, dy) => { await page.mouse.move(640 + dx, 360 + dy); await page.mouse.down(); },
    release: () => page.mouse.up(),
    /** kappt die Verbindung so, wie es ein Funkloch täte */
    cut: async () => { for (const s of sockets.splice(0)) { try { await s.ws.close(); } catch { /* schon zu */ } try { await s.server.close(); } catch { /* schon zu */ } } },
  };
  return P;
}
const a = await player('a', 'Anna' + tag, 'Waldläufer');   // beide kämpfen aus der Ferne: so treffen sicher beide denselben Gegner
const b = await player('b', 'Bert' + tag, 'Magier');
const both = fn => Promise.all([fn(a), fn(b)]);
const shots = n => both(p => p.shot(n));
const step = async (name, fn) => {
  try { await fn(); console.log('  ✓ ' + name); }
  catch (e) { failed++; console.log('  ✗ ' + name + ': ' + e.message.split('\n')[0]); await shots('fehler-' + failed).catch(() => {}); for (const p of [a, b]) await p.release().catch(() => {}); }
};
const enter = async p => {
  await p.page.goto(url);
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
const frame = (p, other) => p.page.locator('.party-frame', { hasText: other.name });

console.log('Eternal Mana – Koop mit zwei Browsern gegen ' + url);
await step('beide betreten die Welt und sehen einander', async () => {
  await both(enter);
  await both(async p => { await p.cmd('/lvl 12'); await p.cmd('/god'); await p.cmd('/welt aus'); await p.has('Lebendige Welt von selbst'); });
  await a.cmd('/time 0.42');                                       // Vormittag: die Dorfbewohner stehen an ihren Plätzen, nicht mitten auf dem Dorfplatz
  await a.page.keyboard.press('p'); await a.wait(400);
  await a.has(b.name);                                             // Online-Liste
  await a.shot('01-online');
  await a.esc();
});
await step('Gruppe: Einladung aus der Online-Liste, Anfrage mit Frist, Annahme, Gruppenrahmen', async () => {
  await a.page.keyboard.press('p'); await a.wait(300);
  await a.page.locator('.pp-list li', { hasText: b.name }).getByRole('button', { name: 'Einladen' }).click();
  await b.has('lädt dich in eine Gruppe ein');
  await b.has(/noch \d+ s/);
  await b.shot('02-einladung');
  await b.page.getByRole('button', { name: 'Annehmen' }).click();
  await a.has('führt an'); await a.has('Beute: jeder würfelt für sich');
  await a.wait(1200);
  await a.shot('03-gruppenfenster');
  await a.esc();
  await frame(a, b).waitFor({ timeout: 5000 }); await frame(b, a).waitFor({ timeout: 5000 });
  await frame(b, a).locator('.pf-lead').waitFor({ timeout: 3000 }); // Stern beim Anführer
  await shots('04-gruppenrahmen');
});
await step('Gruppenchat kommt nur bei der Gruppe an', async () => {
  await a.cmd('/p Hallo Gruppe');
  await b.has('Hallo Gruppe'); await b.has('[Gruppe]');
});
await step('Interagieren neben einem Mitspieler öffnet sein Menü; Ansehen zeigt Klasse und Ausrüstung', async () => {
  await b.cmd(`/zu ${a.name} 22 0`);                              // B steht 22 Weltpixel rechts neben A
  await a.wait(900);
  await a.has('Gruppe · Handel · Ansehen', 6000);
  await shots('05-nebeneinander');
  await a.page.keyboard.press('e');
  await a.page.locator('.pmenu').waitFor({ timeout: 4000 });
  await a.shot('06-spielermenue');
  await a.page.locator('.pmenu').getByRole('button', { name: 'Ansehen' }).click();
  await a.has('Ansehen: ' + b.name); await a.page.locator('.win-inspect').getByText(/Magier/).first().waitFor({ timeout: 4000 }); await a.has('Nur zum Ansehen');
  await a.shot('07-ansehen');
  await a.esc();
});
await step('ein Klick auf die Figur des Mitspielers öffnet dasselbe Menü', async () => {
  // B steht 22 Weltpixel rechts von A; bei zweifacher Vergrößerung sind das 44 Bildschirmpixel neben der Bildmitte
  for (const [dx, dy] of [[44, -2], [44, -14], [44, 8], [38, -8], [50, -8]]) {
    await a.page.mouse.click(640 + dx, 360 + dy);
    try { await a.page.locator('.pmenu').waitFor({ timeout: 700 }); break; } catch { /* nächster Versuch */ }
  }
  await a.page.locator('.pmenu', { hasText: b.name }).waitFor({ timeout: 1500 });
  await a.esc();
});
await step('Handel: Anfrage, Angebot mit Menge und Gold, sperren, bestätigen – beide Seiten sehen dasselbe', async () => {
  await a.cmd('/item potion_hp2 5'); await a.cmd('/gold 500'); await b.cmd('/item mat_wood 4');
  await frame(a, b).click();
  await a.page.locator('.pmenu').getByRole('button', { name: 'Handeln' }).click();
  await b.has('möchte mit dir handeln');
  await b.shot('08-handelsanfrage');
  await b.page.getByRole('button', { name: 'Handeln', exact: true }).click();
  await both(p => p.has('Handel mit'));
  // A: 3 von 5 Heiltränken und 120 Gold
  await a.page.locator('.trade-inv').getByRole('button', { name: 'Heiltrank', exact: true }).click();
  await a.page.locator('.trade-qty input').fill('3');
  await a.page.locator('.trade-qty').getByRole('button', { name: 'Anbieten' }).click();
  await a.page.locator('.trade-goldrow input').fill('120');
  await a.page.locator('.trade-goldrow').getByRole('button', { name: 'Setzen' }).click();
  // B: alles Eisenholz
  await b.page.locator('.trade-inv').getByRole('button', { name: 'Eisenholz', exact: true }).click();
  await b.page.locator('.trade-qty').getByRole('button', { name: 'Anbieten' }).click();
  await b.wait(400);
  // jeder sieht das Angebot des anderen
  const theirs = p => p.page.locator('.trade-side').nth(1);
  await theirs(b).getByRole('button', { name: 'Heiltrank', exact: true }).waitFor({ timeout: 4000 });
  await theirs(b).getByText('120').waitFor({ timeout: 4000 });
  await theirs(a).getByRole('button', { name: 'Eisenholz', exact: true }).waitFor({ timeout: 4000 });
  await a.wait(1800);                                              // Sperrfrist nach der letzten Änderung
  await a.page.getByRole('button', { name: 'Sperren', exact: true }).click();
  await b.has(/hat gesperrt/);
  await shots('09-handel-angebot');
  // B ändert noch etwas: A's Sperre fällt
  await b.page.locator('.trade-goldrow input').fill('5');
  await b.page.locator('.trade-goldrow').getByRole('button', { name: 'Setzen' }).click();
  await a.has(/Das Angebot hat sich geändert/);
  await a.wait(1800);
  await a.page.getByRole('button', { name: 'Sperren', exact: true }).click();
  await b.page.getByRole('button', { name: 'Sperren', exact: true }).click();
  await both(p => p.has(/Beide haben gesperrt/));
  await shots('10-handel-gesperrt');
  await a.page.getByRole('button', { name: 'Bestätigen', exact: true }).click();
  await b.has(/bestätigt/);
  await b.page.getByRole('button', { name: 'Bestätigen', exact: true }).click();
  await both(p => p.has(/Handel mit .* abgeschlossen/));
  await both(p => p.page.locator('.win-trade').waitFor({ state: 'hidden', timeout: 4000 }));
  // Ergebnis im Inventar: B hat 3 Heiltränke, A das Eisenholz
  await b.page.keyboard.press('i'); await b.wait(400);
  await b.page.locator('.inv-grid').getByRole('button', { name: 'Heiltrank', exact: true }).waitFor({ timeout: 4000 });
  await b.shot('11-nach-handel');
  await b.esc();
  await a.page.keyboard.press('i'); await a.wait(400);
  await a.page.locator('.inv-grid').getByRole('button', { name: 'Eisenholz', exact: true }).waitFor({ timeout: 4000 });
  await a.esc();
});
await step('Quest teilen: A bietet an, B nimmt an, ohne zum Auftraggeber zu gehen', async () => {
  await a.cmd('/qa s_woelfe');
  await a.page.keyboard.press('l'); await a.wait(400);
  await a.page.locator('.qp-item', { hasText: 'Sie haben angefangen' }).click();
  await a.page.getByRole('button', { name: 'Mit der Gruppe teilen' }).click();
  await b.has('teilt eine Quest mit dir');
  await b.shot('12-quest-angebot');
  await a.esc();
  await b.page.locator('.qoffer').getByRole('button', { name: 'Annehmen' }).click();
  await b.page.locator('.qt', { hasText: 'Sie haben angefangen' }).waitFor({ timeout: 5000 });
  await a.has(/hat „Sie haben angefangen“ angenommen/);
});
await step('Reaktion zu zweit: Feuer (A) und Wasser (B) auf denselben Gegner – beide erhalten „Einklang“', async () => {
  await a.cmd('/elem fire 3'); await b.cmd('/elem water 3');
  await a.cmd('/rare borkenkoenig'); await b.cmd('/rare borkenkoenig');
  await a.wait(500);
  await both(p => p.aim(0, -110));
  // der Gegner steht über beiden; nach einigen Treffern reagieren Brennen und Wasser miteinander
  await both(p => p.page.locator('.buff').first().waitFor({ timeout: 30000 }));
  await a.wait(600);
  await shots('13-reaktion');
  await a.page.locator('.buff').first().hover();
  await a.has('Einklang', 6000); await a.has(/gemeinsam/);
  await both(p => p.release());
  await a.cmd('/kill'); await a.wait(600);
});
await step('Mana-Riss zu zweit: die Anführerin öffnet, beide stehen in derselben Instanz', async () => {
  await both(async p => { await p.cmd('/endspiel'); await p.loaded(); });
  await a.has('Riss-Stein berühren', 6000);
  await a.page.keyboard.press('e');
  await a.page.getByText('Modifikatoren').first().waitFor({ timeout: 5000 });
  await a.page.getByRole('button', { name: 'Riss öffnen' }).click();
  await both(p => p.page.waitForFunction(() => document.querySelector('.rift-hud'), null, { timeout: 25000 }));
  await a.wait(2500);
  await frame(b, a).getByText(/Mana-Riss .* Stufe 1/).waitFor({ timeout: 5000 });
  await shots('14-im-riss');
});
await step('Verbindungsabriss im Riss: der andere sieht es, die Wiederverbindung stellt Gruppe und Instanz wieder her', async () => {
  await b.cut();
  await b.has('Verbindung verloren', 8000);
  await frame(a, b).getByText('Verbindung getrennt').waitFor({ timeout: 6000 });
  await shots('15-getrennt');
  await b.gone('Verbindung verloren', 20000);
  await b.page.waitForFunction(() => document.querySelector('.rift-hud') && document.querySelector('.party-frame'), null, { timeout: 25000 });
  await frame(a, b).getByText(/Mana-Riss/).waitFor({ timeout: 8000 });
  await frame(b, a).waitFor({ timeout: 5000 });
  await b.wait(1500);
  await shots('16-wieder-da');
});
await step('Echo besiegen: Abschluss für beide und die Gruppentruhe', async () => {
  await both(p => p.loaded());
  await both(p => p.cmd('/boss'));
  await a.wait(3500);
  const seen = both(p => p.has(/Gruppentruhe ist erschienen/, 40000));
  for (let i = 0; i < 8; i++) { await a.cmd('/kill'); await a.wait(600); if (await a.page.getByText(/Riss geschlossen/).count()) break; }
  await seen;
  await a.wait(800);
  await shots('17-gruppentruhe');
});
await step('Weltereignis gemeinsam: beide tragen bei, beide werden belohnt', async () => {
  await both(async p => { await p.cmd('/tp gruenwald'); await p.loaded(); });
  await a.cmd('/event woge'); await a.wait(1200);
  await both(p => p.has('Schlagt die Wellen zurück'));
  const done = both(p => p.has(/Mana-Woge abgeschlossen/, 60000));
  for (let i = 0; i < 5; i++) { await a.cmd('/kill'); await b.cmd('/kill'); await a.wait(3300); if (i === 1) await shots('18-ereignis'); }
  await done;
});
await step('Seite neu laden: nach „Spielen“ steht B wieder im Spiel und in der Gruppe', async () => {
  await b.page.reload();
  await b.page.getByText('Spielen', { exact: true }).waitFor({ timeout: 30000 });
  await b.page.getByText('Spielen', { exact: true }).click();
  await b.page.waitForFunction(() => document.querySelector('#game canvas') && document.querySelector('.party-frame'), null, { timeout: 40000 });
  await frame(b, a).waitFor({ timeout: 6000 });
  await a.wait(1500);
  await frame(a, b).getByText('Verbindung getrennt').waitFor({ state: 'hidden', timeout: 6000 });
  await shots('19-neu-geladen');
});
await step('Anführerin ernennt, entfernt wird über das Gruppenfenster – am Ende ist jeder wieder allein', async () => {
  await frame(a, b).click();
  await a.page.locator('.pmenu').getByRole('button', { name: 'Zum Anführer ernennen' }).click();
  await frame(a, b).locator('.pf-lead').waitFor({ timeout: 4000 });
  await b.has(/hat dir die Führung der Gruppe übergeben/);
  await b.page.keyboard.press('p'); await b.wait(400);
  await b.shot('20-fuehrung');
  await b.page.locator('.pp-member', { hasText: a.name }).getByRole('button', { name: 'Entfernen' }).click();
  await b.page.locator('.confirm').getByRole('button', { name: 'Entfernen' }).click();
  await a.has(/hat dich aus der Gruppe entfernt/);
  await a.page.locator('.party-frame').waitFor({ state: 'hidden', timeout: 5000 });
  await b.has('Du bist allein unterwegs');
  await b.esc();
});
await browser.close();
const uniq = [...new Set(errors)];
if (uniq.length) console.log('\nFehler in der Browserkonsole:\n  ' + uniq.slice(0, 12).join('\n  '));
if (uniq.length || failed) process.exit(1);
console.log('\nAlles in Ordnung. Bilder: tests/e2e/out/coop-*.png');
