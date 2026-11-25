// Leistungsmessung im Browser (0.8): Ladezeit, Speicher nach einer Reise durch alle Zonen, Bildzeit in den vollsten Lagen,
// Bewegung bei gedrosselter Bildrate. Braucht einen Server MIT Dev-Befehlen und Playwright:
//
//   EM_DEV=1 EM_PORT=7790 EM_DATA=/tmp/em-perf npm start        (anderes Fenster)
//   node scripts/perf-browser.mjs http://localhost:7790 [laden] [zonen] [last] [bildrate]
//
// Ohne Auswahl laufen alle vier Teile. Ausgabe: lesbare Zeilen und am Ende eine JSON-Zeile.
// Hinweis: Ohne Grafikkarte (Software-Renderer) sagen die Bilder pro Sekunde wenig – aussagekräftig ist dann die
// Rechenzeit des Skripts je Bild („Skript ms/Bild“), die nicht vom Zeichnen abhängt.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
let chromium;
for (const base of [path.join(here, '../tests/e2e/'), '/opt/node22/lib/node_modules/']) {
  try { ({ chromium } = createRequire(base)('playwright')); break; } catch { /* nächster Ort */ }
}
if (!chromium) { console.error('Playwright ist nicht installiert:  npm i -D playwright && npx playwright install chromium'); process.exit(2); }

const argv = process.argv.slice(2);
const url = argv.find(a => a.startsWith('http')) ?? process.env.EM_URL ?? 'http://localhost:7777';
const parts = argv.filter(a => !a.startsWith('http'));
const want = p => !parts.length || parts.includes(p);
const args = ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'];
let browser;
try { browser = await chromium.launch({ args }); }
catch { browser = await chromium.launch({ args, executablePath: process.env.EM_CHROME ?? '/usr/bin/google-chrome' }); }
const out = {};
const wait = (page, ms) => page.waitForTimeout(ms);
const cmdOn = page => async s => {
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.activeElement?.tagName === 'INPUT', null, { timeout: 5000 });
  await page.keyboard.type(s); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
};
const inGame = page => page.waitForFunction(() => window.__em?.store.state.screen === 'game', null, { timeout: 60000 });
async function newChar(page, name) {
  await page.getByText('Spielen', { exact: true }).waitFor({ timeout: 60000 });
  await page.getByText('Spielen', { exact: true }).click();
  await page.getByText('Neues Spiel').first().click();
  await page.getByText('Krieger').first().click();
  await page.locator('input').first().fill(name + Math.random().toString(36).slice(2, 6).replace(/[0-9]/g, 'x'));
  await page.getByText('Abenteuer beginnen').click();
  await page.getByText('Betreten').first().waitFor({ timeout: 10000 });
}
/** Skriptzeit, Bilder und Speicher über `ms` Millisekunden */
async function sample(page, cdp, ms) {
  const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  const frames = () => page.evaluate(() => window.__em.game.loop.frame);
  const a = await metrics(), f0 = await frames(), t0 = Date.now();
  await page.waitForTimeout(ms);
  const b = await metrics(), f1 = await frames(), dt = (Date.now() - t0) / 1000;
  const n = Math.max(1, f1 - f0);
  const live = await page.evaluate(() => { const sc = window.__em.game.scene.getScene('game'); return { mobs: sc.mobs.size, objs: sc.objs.size, draw: sc.children.length }; });
  return { fps: +(n / dt).toFixed(1), frameMs: +((dt * 1000) / n).toFixed(1), scriptMs: +(((b.ScriptDuration - a.ScriptDuration) * 1000) / n).toFixed(2), taskMs: +(((b.TaskDuration - a.TaskDuration) * 1000) / n).toFixed(2), ...live };
}
async function heap(page, cdp) {
  await cdp.send('HeapProfiler.collectGarbage'); await page.waitForTimeout(300); await cdp.send('HeapProfiler.collectGarbage');
  return page.evaluate(() => ({ heapMb: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1), textures: window.__em.game.textures.getTextureKeys().length, canvases: document.querySelectorAll('canvas').length }));
}

// ====================================================================================================== Laden
if (want('laden')) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  let bytes = 0, reqs = 0; const byType = {};
  const types = new Map();
  cdp.on('Network.responseReceived', e => types.set(e.requestId, e.type));
  cdp.on('Network.loadingFinished', e => { bytes += e.encodedDataLength; reqs++; const t = types.get(e.requestId) ?? 'Other'; byType[t] = (byType[t] ?? 0) + e.encodedDataLength; });
  const t0 = Date.now();
  await page.goto(url);
  await page.getByText('Spielen', { exact: true }).waitFor({ timeout: 60000 });
  const menuMs = Date.now() - t0, menuReqs = reqs, menuBytes = bytes;
  await newChar(page, 'Lade');
  const t1 = Date.now();
  await page.getByText('Betreten').first().click();
  await inGame(page);
  const enterMs = Date.now() - t1;
  out.laden = { anfragen: menuReqs, kB: Math.round(menuBytes / 1024), bisMenueMs: menuMs, betretenBisSpielMs: enterMs, ersterSpielbarerFrameMs: menuMs + enterMs, nachTyp: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, Math.round(v / 1024)])) };
  console.log(`Laden: ${menuReqs} Anfragen, ${Math.round(menuBytes / 1024)} kB übertragen, Menü nach ${menuMs} ms; „Betreten“ bis spielbar ${enterMs} ms (zusammen ${menuMs + enterMs} ms ohne Menüklicks)`);
  console.log('  nach Art (kB):', JSON.stringify(out.laden.nachTyp));
  await ctx.close();
}

// ====================================================================================================== Zonen / Speicher
const ZONEN = ['gruenwald', 'wurzelgruft', 'kristall', 'geode', 'glut', 'aschenschmiede', 'frost', 'gletscherdom', 'ruinen', 'archiv', 'schatten', 'thron', 'wacht', 'herz', 'gruenwald'];
if (want('zonen') || want('last') || want('bildrate')) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  const cmd = cmdOn(page);
  await page.goto(url);
  await newChar(page, 'Mess');
  await page.getByText('Betreten').first().click();
  await inGame(page);
  await page.evaluate(() => window.__em.store.set({ story: null }));
  await cmd('/welt aus'); await cmd('/endspiel'); await wait(page, 2500); await cmd('/god'); await cmd('/time 0.5');
  const tp = async z => { await cmd('/tp ' + z); await page.waitForFunction(id => window.__em.store.state.screen === 'game' && window.__em.game.scene.getScene('game').map?.def.id === id, z, { timeout: 60000 }); await wait(page, 700); };

  if (want('zonen')) {
    const rounds = [];
    const start = await heap(page, cdp);
    for (let r = 0; r < 3; r++) {
      const t0 = Date.now();
      for (const z of ZONEN) await tp(z);
      const h = await heap(page, cdp);
      rounds.push({ ...h, sek: Math.round((Date.now() - t0) / 1000) });
      console.log(`Zonenreise ${r + 1} (${ZONEN.length} Wechsel): Speicher ${h.heapMb} MB, ${h.textures} Texturen, ${h.canvases} Canvas-Elemente`);
    }
    out.zonen = { start, runden: rounds, zuwachsRunde2zu3Mb: +(rounds[2].heapMb - rounds[1].heapMb).toFixed(1) };
    console.log(`  Start: ${start.heapMb} MB / ${start.textures} Texturen · Zuwachs von Runde 2 zu 3: ${out.zonen.zuwachsRunde2zu3Mb} MB (bleibt er nahe 0, läuft nichts voll)`);
  }

  if (want('last')) {
    out.last = {};
    const measure = async (name, ms = 6000) => { const s = await sample(page, cdp, ms); out.last[name] = s; console.log(`${name}: ${s.fps} Bilder/s, Skript ${s.scriptMs} ms/Bild (alles ${s.taskMs} ms), ${s.mobs} Gegner, ${s.objs} Objekte, ${s.draw} gezeichnete Objekte`); };
    await tp('gruenwald'); await cmd('/npc mirelda');
    await measure('Ruhe in Quellhain');
    await cmd('/event woge'); await wait(page, 1500);
    const ev = await page.evaluate(() => { const sc = window.__em.game.scene.getScene('game'); for (const v of sc.objs.values()) if (v.o.type === 'wobj' && /Woge/.test(v.o.props?.label ?? '')) return { x: v.o.x, y: v.o.y }; return null; });
    if (ev) await cmd(`/goto ${Math.round(ev.x)} ${Math.round(ev.y + 30)}`);
    await cmd('/wboss moosgrimm'); await wait(page, 2500);
    await measure('Ereignis mit Weltboss (Mana-Woge + Moosgrimm)');
    await cmd('/kill'); await wait(page, 500);
    // Riss mit drei Modifikatoren (Stufe 22), mitten in einer Gegnergruppe
    await cmd('/riss 22'); await cmd('/risstein'); await wait(page, 800);
    await page.evaluate(() => window.__em.store.set({ endgame: { tab: 'risse', stone: true } }));
    await page.getByRole('button', { name: 'Riss öffnen' }).click();
    await page.waitForFunction(() => !!window.__em.store.state.rift && window.__em.store.state.screen === 'game', null, { timeout: 60000 });
    await wait(page, 1500);
    const pack = await page.evaluate(() => { const sc = window.__em.game.scene.getScene('game'); let best = null, n = 0; for (const m of sc.mobs.values()) { let k = 0; for (const o of sc.mobs.values()) if (Math.hypot(o.x - m.x, o.y - m.y) < 120) k++; if (k > n) { n = k; best = { x: m.x, y: m.y }; } } return best; });
    if (pack) { await cmd(`/goto ${Math.round(pack.x)} ${Math.round(pack.y + 20)}`); await wait(page, 1200); }
    await page.mouse.move(700, 300); await page.mouse.down();
    await measure('Mana-Riss Stufe 22 (drei Modifikatoren) im Kampf');
    await page.mouse.up();
    await cmd('/hof 3'); await page.waitForFunction(() => window.__em.game.scene.getScene('game').map?.def.id === 'heim' && window.__em.store.state.screen === 'game', null, { timeout: 60000 }); await wait(page, 800);
    for (const c of ['/trophaeen', '/begleiter alle', '/gewand']) await cmd(c);
    await measure('Hof, voll ausgebaut');
    await tp('glut');
    await measure('Glutlande (viele Lichtquellen)');
  }

  if (want('bildrate')) {
    // Bewegung bei gedrosselter Bildrate: Strecke in zwei Sekunden gegen Lauftempo × Zeit
    await tp('gruenwald'); await cmd('/npc mirelda'); await wait(page, 500);
    const run = async rate => {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      await wait(page, 1500);
      const before = await page.evaluate(() => { const sc = window.__em.game.scene.getScene('game'); return { x: sc.me.x, y: sc.me.y, f: window.__em.game.loop.frame, t: performance.now(), speed: sc.stats.speed }; });
      await page.keyboard.down('s'); await wait(page, 2000);
      const after = await page.evaluate(() => { const sc = window.__em.game.scene.getScene('game'); return { x: sc.me.x, y: sc.me.y, f: window.__em.game.loop.frame, t: performance.now() }; });
      await page.keyboard.up('s'); await wait(page, 300);
      await page.keyboard.down('w'); await wait(page, 2000); await page.keyboard.up('w');
      const sec = (after.t - before.t) / 1000, dist = Math.hypot(after.x - before.x, after.y - before.y);
      return { drossel: rate, fps: +((after.f - before.f) / sec).toFixed(1), strecke: Math.round(dist), soll: Math.round(before.speed * sec), anteil: +(dist / (before.speed * sec)).toFixed(2) };
    };
    out.bildrate = [];
    for (const rate of [1, 4, 8, 14]) { const r = await run(rate); out.bildrate.push(r); console.log(`Bewegung bei ${r.fps} Bildern/s (CPU ×1/${rate}): ${r.strecke} px in 2 s, Soll ${r.soll} px → ${Math.round(r.anteil * 100)} %`); }
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }
  await ctx.close();
}
await browser.close();
console.log('\n' + JSON.stringify(out));
