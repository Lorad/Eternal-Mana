// Browser-Durchlauf „Fenster und HUD“ (0.8): öffnet jedes Fenster in mehreren Fenstergrößen und prüft, dass es ins Bild passt,
// dass keine Kopfzeile umbricht, nichts aus seinem Fenster ragt und sich die Blöcke des HUD nicht überlagern.
// Voraussetzung: laufender Server MIT Dev-Befehlen (EM_DEV=1; Standard http://localhost:7777, sonst EM_URL) und Playwright.
//   EM_DEV=1 npm start   →   node tests/e2e/fenster.mjs        (EM_SIZES=1280x720,1000x560,600x900 · EM_SHOTS=1 für Bilder)
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
const sizes = (process.env.EM_SIZES ?? '1280x720,1000x560,600x900').split(',').map(s => s.split('x').map(Number));
const shots = !!process.env.EM_SHOTS;
const out = path.join(here, 'out');
fs.mkdirSync(out, { recursive: true });
const args = ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
let browser;
try { browser = await chromium.launch({ args }); }
catch { browser = await chromium.launch({ args, executablePath: process.env.EM_CHROME ?? '/usr/bin/google-chrome' }); }
const page = await browser.newPage({ viewport: { width: sizes[0][0], height: sizes[0][1] } });
const errors = [];
page.on('pageerror', e => errors.push('Seitenfehler: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('Konsole: ' + m.text()); });
const wait = ms => page.waitForTimeout(ms);
const cmd = async s => {
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.activeElement?.tagName === 'INPUT', null, { timeout: 3000 });
  await page.keyboard.type(s); await page.keyboard.press('Enter'); await wait(300);
};
const set = patch => page.evaluate(p => window.__em.store.set(p), patch);
const CLOSED = { panel: null, dialog: null, dlgNode: null, craft: null, endgame: null, wshop: null, hof: null, lore: null, sign: null, inspect: null, playerMenu: null, enc: null };
const closeAll = () => set(CLOSED);

/** Prüft die sichtbare Oberfläche; liefert eine Liste von Mängeln (leer = in Ordnung). */
const audit = () => page.evaluate(() => {
  const vw = innerWidth, vh = innerHeight, bad = [];
  const root = document.querySelector('.em-root');
  const s = +(/scale\(([\d.]+)\)/.exec(root.style.transform)?.[1] ?? 1);
  const narrow = root.classList.contains('is-narrow');
  const rect = el => { const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1 ? r : null; };
  const name = el => (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : el.tagName.toLowerCase());
  const R = r => `${Math.round(r.left)},${Math.round(r.top)}–${Math.round(r.right)},${Math.round(r.bottom)}`;
  // ---- Fenster
  for (const w of document.querySelectorAll('#ui .window, #ui .sign, #ui .lore, #ui .death-box, #ui .story-box, #ui .enc')) {
    const r = rect(w); if (!r) continue;
    if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) bad.push(`${name(w)} ragt aus dem Bild (${R(r)} bei ${vw}×${vh})`);
    const head = w.querySelector(':scope > .window-head');
    if (head && !narrow) { const h = head.getBoundingClientRect().height / s; if (h > 66) bad.push(`${name(w)}: Kopfzeile umbrochen (${Math.round(h)} px hoch)`); }
    const seen = new Set();
    for (const c of w.querySelectorAll('*')) {
      const q = rect(c); if (!q) continue;
      if (q.right > r.right + 2 || q.left < r.left - 2) {
        // abgeschnittene Inhalte in Rollbereichen zählen nicht
        let p = c.parentElement, clipped = false;
        while (p && p !== w) { const o = getComputedStyle(p); if (o.overflowX !== 'visible' || o.overflow !== 'visible') { clipped = true; break; } p = p.parentElement; }
        if (clipped || getComputedStyle(c).position === 'absolute') continue;
        const k = name(c); if (!seen.has(k)) { seen.add(k); bad.push(`${name(w)}: ${k} ragt seitlich hinaus (${Math.round(q.right - r.right)} px)`); }
      }
    }
  }
  // ---- HUD: Blöcke im Bild und ohne gegenseitige Überdeckung (nur wenn kein Fenster offen ist)
  if (!document.querySelector('#ui .backdrop')) {
    const groups = ['.hud-tl', '.hud-tr', '.hud-tc', '.hud-bc', '.hud-bl', '.hud-br'];
    const items = [];
    for (const g of groups) for (const el of document.querySelectorAll(`#ui ${g} > *`)) {
      const r = rect(el); if (!r) continue;
      items.push({ g, n: name(el), r });
      if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) bad.push(`HUD ${name(el)} ragt aus dem Bild (${R(r)})`);
    }
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      if (a.g === b.g) continue;
      const ox = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), oy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (ox > 4 && oy > 4) bad.push(`HUD ${a.n} (${a.g}) und ${b.n} (${b.g}) überdecken sich um ${Math.round(ox)}×${Math.round(oy)} px`);
    }
    // die rechte Spalte darf höchstens bis zur Meldungsleiste reichen
    const tr = document.querySelector('#ui .hud-tr'), br = document.querySelector('#ui .hud-br');
    if (tr && br) { const a = tr.getBoundingClientRect(), b = br.getBoundingClientRect(); if (a.bottom > b.top + 2 && a.height > 1 && b.height > 1) bad.push(`HUD rechte Spalte reicht in die untere Leiste (${Math.round(a.bottom - b.top)} px)`); }
  }
  return bad;
});

let problems = 0, checked = 0;
const report = [];
/** Hält das Spielbild an (Fenster brauchen es nicht) – der Durchlauf wird dadurch um ein Mehrfaches schneller. */
const freeze = on => page.evaluate(v => { const l = window.__em.game.loop; if (v) l.sleep(); else l.wake(); }, on);
async function check(label, sizeTag) {
  await wait(140);
  const bad = await audit();
  checked++;
  if (bad.length) { problems += bad.length; report.push(`  ✗ ${sizeTag} · ${label}`); for (const b of bad) report.push('      ' + b); }
  if (shots || bad.length) await page.screenshot({ path: path.join(out, `fenster-${sizeTag}-${label.replace(/[^a-z0-9äöüß]+/gi, '-').toLowerCase()}.png`) });
}
/** Öffnet ein Fenster über den Zustand, prüft es samt allen Reitern und schließt es wieder. */
async function win(label, patch, sizeTag, tabs = true) {
  await closeAll(); await set(patch);
  await check(label, sizeTag);
  if (tabs) {
    const n = await page.locator('#ui .window-head [role=tab]').count();
    for (let i = 1; i < n; i++) {
      const t = page.locator('#ui .window-head [role=tab]').nth(i);
      const name = (await t.innerText()).split('\n')[0].trim();
      await t.click(); await check(`${label} – ${name}`, sizeTag);
    }
  }
  await closeAll();
}

console.log(`Eternal Mana – Fenster und HUD gegen ${url} (${sizes.map(s => s.join('×')).join(', ')})`);
try {
  await page.goto(url);
  await page.getByText('Spielen', { exact: true }).waitFor({ timeout: 30000 });
  await page.getByText('Spielen', { exact: true }).click();
  await page.getByText('Neues Spiel').first().click();
  await page.getByText('Krieger').first().click();
  await page.locator('input').first().fill('Fenster' + Math.random().toString(36).slice(2, 6).replace(/[0-9]/g, 'x'));
  await page.getByText('Abenteuer beginnen').click();
  await page.getByText('Betreten').first().click();
  await page.waitForFunction(() => document.querySelector('#game canvas') && document.body.innerText.includes('Überspringen'), null, { timeout: 30000 });
  await page.getByText('Überspringen').click(); await wait(500);
  await cmd('/welt aus');
  await page.getByText('Lebendige Welt von selbst').first().waitFor({ timeout: 5000 }); // sonst läuft der Server ohne EM_DEV=1
  await cmd('/endspiel'); await wait(2500);
  const inZone = id => page.waitForFunction(z => window.__em.store.state.screen === 'game' && window.__em.game.scene.getScene('game').map?.def.id === z, id, { timeout: 60000 }).then(() => wait(600));
  await cmd('/hof 3'); await inZone('heim');           // führt auf den Hof (Zonenwechsel)
  await cmd('/tp gruenwald'); await inZone('gruenwald');
  for (const c of ['/god', '/riss 22', '/quell 7', '/echo 40', '/gold 60000', '/trophaeen', '/begleiter alle', '/gewand', '/bestiarium', '/lore all', '/recipes', '/legend', '/gear 4', '/mats ore 30', '/rep quellhain 5000', '/time 0.5']) await cmd(c);
  // vier laufende Quests für die Questverfolgung
  for (const q of ['s_tobi', 's_pilze', 's_woelfe', 'r_gruenwald', 's_splitter1']) await cmd('/qa ' + q);
  await wait(400);

  for (const [W, H] of sizes) {
    const tag = `${W}x${H}`;
    await page.setViewportSize({ width: W, height: H }); await wait(500);
    await closeAll();
    await cmd('/event woge'); await wait(900);
    await check('HUD mit Quests und Ereignis', tag);
    await freeze(true);
    for (const p of ['inventory', 'character', 'skills', 'quests', 'map', 'party', 'ruf', 'sammlung', 'menu', 'help', 'settings']) await win('Fenster ' + p, { panel: p }, tag);
    await win('Gespräch Borin', { dialog: { npc: 'borin' } }, tag);
    for (const t of ['Handeln', 'Ausrüstung verbessern']) {
      await closeAll(); await set({ dialog: { npc: 'borin' } }); await wait(200);
      await page.getByText(t, { exact: true }).first().click(); await check('Borin – ' + t, tag);
    }
    await win('Schmiede Borin', { craft: { at: 'borin', station: 'forge' } }, tag);
    await win('Schmiede Hof', { craft: { at: 'heim', station: 'forge' } }, tag);
    await win('Alchemie', { craft: { at: 'sella', station: 'alchemy' } }, tag);
    await win('Kochstelle', { craft: { at: 'fire', station: 'cooking' } }, tag);
    await win('Verzauberung', { craft: { at: 'fenwick', station: 'enchant' } }, tag);
    await win('Endspiel', { endgame: { tab: 'risse', stone: true } }, tag);
    await win('Vorräte', { wshop: { kind: 'faction', npc: 'sella' } }, tag);
    for (const t of ['lager', 'ausbau', 'trophaeen', 'schrank', 'weg']) await win('Hof ' + t, { hof: { tab: t } }, tag, false);
    await win('Chronik-Dokument', { lore: { id: 'brunnenbuch', first: true } }, tag);
    await win('Schild', { sign: 'Ein Schild.\nMit zwei Zeilen und einem etwas längeren Satz, damit der Umbruch geprüft wird.' }, tag);
    await freeze(false);
  }

  // ---- im Mana-Riss: Riss-Anzeige, Questverfolgung und Ereignisse teilen sich die rechte Spalte
  await page.setViewportSize({ width: sizes[0][0], height: sizes[0][1] }); await wait(400);
  await cmd('/risstein'); await wait(600);
  await closeAll(); await set({ endgame: { tab: 'risse', stone: true } }); await wait(300);
  await page.getByRole('button', { name: 'Riss öffnen' }).click();
  await page.waitForFunction(() => document.querySelector('.rift-hud'), null, { timeout: 25000 });
  await wait(2500);
  for (const [W, H] of sizes) { await page.setViewportSize({ width: W, height: H }); await wait(500); await check('HUD im Mana-Riss', `${W}x${H}`); }
} catch (e) {
  problems++; report.push('  ✗ Abbruch: ' + e.message.split('\n')[0]);
  await page.screenshot({ path: path.join(out, 'fenster-fehler.png') });
}
await browser.close();
for (const l of report) console.log(l);
console.log(`  ${checked} Ansichten geprüft, ${problems} Mängel`);
if (errors.length) { console.log('\nFehler in der Browserkonsole:\n  ' + errors.slice(0, 10).join('\n  ')); process.exit(1); }
if (problems) process.exit(1);
console.log('\nAlles in Ordnung.' + (shots ? ' Bilder: tests/e2e/out/fenster-*.png' : ''));
