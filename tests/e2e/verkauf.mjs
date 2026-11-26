// Browser-Durchlauf: Verkaufsfeld im Inventar (0.12.1) – mitten in einer Expedition Gegenstände hineinziehen,
// Umschalt+Klick, Rückfrage bei wertvollen Stücken, verkaufen; bei 1280×720 und 600×900.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
let chromium;
for (const base of [here + '/', '/opt/node22/lib/node_modules/']) { try { ({ chromium } = createRequire(base)('playwright')); break; } catch { /* nächster Ort */ } }
if (!chromium) { console.error('Playwright ist nicht installiert.'); process.exit(2); }
const url = process.env.EM_URL ?? 'http://localhost:7777';
const S = path.join(here, 'out'); fs.mkdirSync(S, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const out = [];
for (const [w, h, tag] of [[1280, 720, 'w'], [600, 900, 'p']]) {
  const page = await b.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', e => out.push('pageerror ' + e.message));
  await page.goto(url + '/?hinweise=aus');
  await page.getByText('Spielen', { exact: true }).click();
  await page.getByText('Neues Spiel').first().click();
  await page.getByText('Krieger').first().click();
  await page.locator('input').first().fill('Verkauf' + tag + Math.random().toString(36).replace(/[^a-z]/g, '').slice(0, 4));
  await page.getByText('Abenteuer beginnen').click();
  await page.getByText('Betreten').first().click();
  await page.waitForFunction(() => document.body.innerText.includes('Überspringen'), null, { timeout: 40000 });
  await page.getByText('Überspringen').click();
  await page.waitForTimeout(1500);
  const cmd = async s => { await page.keyboard.press('Enter'); const i = page.locator('.chat-input input'); await i.waitFor(); await i.fill(s); await i.press('Enter'); await page.waitForTimeout(600); };
  await cmd('/setitem wurzelwacht'); await cmd('/exp exp_gruenwald'); await page.waitForFunction(() => window.__em?.game?.scene?.getScene('game')?.map?.id === 'exp_gruenwald', null, { timeout: 60000 }); await page.waitForTimeout(6000);
  for (let k = 0; k < 3; k++) { const c = page.getByText('Schließen', { exact: true }); if (await c.count()) { await c.first().click(); await page.waitForTimeout(800); } }
  await page.screenshot({ path: S + '/verkauf-0-' + tag + '.png' }); await page.keyboard.press('i'); await page.waitForTimeout(800);
  const slots = page.locator('.inv-grid .slot:not(.empty)');
  const n0 = await slots.count();
  await slots.nth(3).dragTo(page.locator('.sell-box'));
  await slots.nth(4).dragTo(page.locator('.sell-box'));
  await page.keyboard.down('Shift'); await slots.nth(5).click(); await page.keyboard.up('Shift');
  await page.waitForTimeout(400);
  const inTray = await page.locator('.sell-items .slot').count();
  const gold0 = await page.locator('.inv-gold').innerText();
  await page.screenshot({ path: `${S}/verkauf-1-${tag}.png` });
  await page.locator('.sell-btns').getByText('Verkaufen', { exact: true }).click(); await page.waitForTimeout(500);
  await page.screenshot({ path: `${S}/verkauf-2-${tag}.png` });
  const conf = await page.locator('.confirm').count();
  if (conf) await page.locator('.confirm button', { hasText: 'Gold verkaufen' }).click();
  await page.waitForTimeout(1000);
  const n1 = await slots.count(), gold1 = await page.locator('.inv-gold').innerText();
  await page.screenshot({ path: `${S}/verkauf-3-${tag}.png` });
  const num = t => Number(t.replace(/\D/g, '')), zone = await page.evaluate(() => window.__em?.game?.scene?.getScene('game')?.map?.id);
  const ok = zone === 'exp_gruenwald' && n1 === n0 - 3 && inTray === 3 && conf === 1 && num(gold1) > num(gold0);
  out.push(`${ok ? 'ok' : 'FEHLER'} ${tag}: Zone ${zone}, Rucksack ${n0} → ${n1}, im Verkauf ${inTray}, Rückfrage ${conf}, Gold ${num(gold0)} → ${num(gold1)}`);
  await page.close();
}
await b.close();
const bad = out.filter(l => !l.startsWith('ok '));
for (const l of out) console.log((bad.includes(l) ? '  ✗ ' : '  ✓ ') + l.replace(/\n/g, ' '));
process.exit(bad.length ? 1 : 0);
