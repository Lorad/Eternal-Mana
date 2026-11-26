// Gemeinsame Bausteine der Browser-Durchläufe durch die Expeditionen (tests/e2e/expeditionen.mjs, tests/e2e/expedition-grade.mjs).
// Liegt in einem Unterordner, damit scripts/e2e-all.mjs es nicht selbst als Durchlauf startet.
//
// Neben Klicks und Chat-Befehlen liest ein Durchlauf die Spielszene (window.__em) und die Nachrichten des Servers mit
// (Schwebetexte wie „Bewegt!“ oder „Verwundbar!“ stehen nur im Bild, nicht im DOM) – geprüft wird, was wirklich ankommt.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let chromium;
for (const base of [here + '/', '/opt/node22/lib/node_modules/']) {
  try { ({ chromium } = createRequire(base)('playwright')); break; } catch { /* nächster Ort */ }
}
if (!chromium) { console.error('Playwright ist nicht installiert:  npm i -D playwright && npx playwright install chromium'); process.exit(2); }
export const url = (process.env.EM_URL ?? 'http://127.0.0.1:7795').replace(/\/?\?.*$/, '');
export const out = path.join(here, 'out');
fs.mkdirSync(out, { recursive: true });

const args = ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
export async function launch() {
  try { return await chromium.launch({ args }); }
  catch { return chromium.launch({ args, executablePath: process.env.EM_CHROME ?? '/usr/bin/google-chrome' }); }
}

/** Ein Spieler im Browser mit allen Hilfen. `prefix` steht vor jedem Bildnamen. */
export async function player(browser, prefix, key, name, cls, errors) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`[${key}] Seitenfehler: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !/WebSocket|ERR_CONNECTION|net::/.test(m.text())) errors.push(`[${key}] Konsole: ${m.text()}`); });
  // Mitschnitt der Server-Nachrichten: Schwebetexte, Explosionen und Bosswechsel (nur die letzten paar Hundert)
  const log = [];
  page.on('websocket', ws => ws.on('framereceived', f => {
    const s = typeof f.payload === 'string' ? f.payload : '';
    if (!s.includes('"k":"txt"') && !s.includes('"n":"explosion"')) return;
    try {
      const m = JSON.parse(s);
      for (const e of m.ev ?? m.e ?? []) if (e.k === 'txt' || (e.k === 'fx' && e.n === 'explosion')) log.push({ at: Date.now(), ...e });
    } catch { /* keine JSON-Nachricht */ }
    if (log.length > 600) log.splice(0, log.length - 400);
  }));
  const S = 'window.__em.game.scene.getScene("game")';
  const p = {
    key, name, cls, page, log,
    wait: ms => page.waitForTimeout(ms),
    shot: n => page.screenshot({ path: path.join(out, `${prefix}-${n}.png`) }),
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
    esc: async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(200); },
    /** Interagieren: E kurz halten – bei wenigen Bildern je Sekunde fiele ein bloßer Tastendruck zwischen zwei Bilder */
    use: async () => { await page.keyboard.down('KeyE'); await page.waitForTimeout(180); await page.keyboard.up('KeyE'); await page.waitForTimeout(350); },
    /** Kennung der Karte, die die Szene gerade zeigt */
    zone: () => page.evaluate(`${S}?.map?.id`),
    inZone: (id, timeout = 40000) => page.waitForFunction(z => { const sc = window.__em.game.scene.getScene('game'); return window.__em.store.state.screen === 'game' && sc?.map?.id === z && sc.me; }, id, { timeout }).then(() => page.waitForTimeout(900)),
    me: () => page.evaluate(`(() => { const s = ${S}; return { x: s.me.x, y: s.me.y, hp: window.__em.store.state.me?.hp, maxHp: window.__em.store.state.me?.maxHp }; })()`),
    objs: kind => page.evaluate(k => [...window.__em.game.scene.getScene('game').objs.values()].filter(v => v.o.props?.kind === k || v.o.type === k).map(v => ({ id: v.o.id, x: v.o.x, y: v.o.y, state: v.o.state, props: v.o.props ?? {} })), kind),
    mobs: () => page.evaluate(() => [...window.__em.game.scene.getScene('game').mobs.values()].filter(v => v.alive && !v.dying).map(v => ({ id: v.info.id, name: v.info.name ?? v.info.mob, mob: v.info.mob, boss: !!v.info.boss, elite: !!v.info.elite, x: v.x, y: v.y, hp: v.hp, maxHp: v.info.maxHp }))),
    fx: () => page.evaluate(() => [...window.__em.game.scene.getScene('game').zfx.values()].map(f => f.z)),
    section: id => page.evaluate(i => { const s = window.__em.game.scene.getScene('game').map.exp.sections.find(x => x.id === i); return s && { ...s, mouths: s.mouths.map(m => ({ x: m.x, y: m.y })) }; }, id),
    /** Schwebetext seit `since` (Zeitstempel) gesehen? */
    saw: (s, since = 0) => log.some(e => e.at >= since && e.k === 'txt' && String(e.s).includes(s)),
    sawWait: async (s, since = 0, timeout = 10000) => { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if (p.saw(s, since)) return true; await page.waitForTimeout(120); } throw new Error(`Schwebetext „${s}“ kam nicht`); },
    /** hinlaufen; klappt es nicht (Gegner drängen, Deko im Weg), springt die Figur hin – gezählt in notes */
    reach: async (x, y, what, opt = {}) => { if (!(await p.walkTo(x, y, { near: 8, timeout: 9000, ...opt }))) { p.notes.push(what + ': hingesprungen'); await p.goto(x, y); } },
    goto: async (x, y) => { await p.cmd(`/goto ${Math.round(x)} ${Math.round(y)}`); await page.waitForTimeout(250); },
    /** Echt laufen (Tasten W/A/S/D) bis in die Nähe von (x, y). Steckt die Figur fest, hilft ein kurzer Dev-Sprung (wird gezählt). */
    walkTo: async (x, y, { near = 10, timeout = 8000 } = {}) => {
      const keys = { w: false, a: false, s: false, d: false };
      const set = async (k, on) => { if (keys[k] !== on) { keys[k] = on; if (on) await page.keyboard.down('Key' + k.toUpperCase()); else await page.keyboard.up('Key' + k.toUpperCase()); } };
      const t0 = Date.now(); let best = Infinity, bestAt = Date.now(), ok = false;
      try {
        while (Date.now() - t0 < timeout) {
          const m = await p.me(), dx = x - m.x, dy = y - m.y, d = Math.hypot(dx, dy);
          if (d <= near) { ok = true; break; }
          await set('d', dx > 4); await set('a', dx < -4); await set('s', dy > 4); await set('w', dy < -4);
          if (d < best - 2) { best = d; bestAt = Date.now(); }
          if (Date.now() - bestAt > 900) { // festgelaufen (oder rutscht an einer Kante entlang): ein Stück näher springen
            for (const k of Object.keys(keys)) await set(k, false);
            p.jumps++;
            const st = Math.min(d, 40);
            await p.goto(m.x + (dx / d) * st, m.y + (dy / d) * st); best = Infinity; bestAt = Date.now();
          }
          await page.waitForTimeout(90);
        }
      } finally { for (const k of Object.keys(keys)) await set(k, false); }
      return ok;
    },
    jumps: 0, notes: [],
  };
  return p;
}

/** Neuen Charakter anlegen und die Welt betreten (Einleitung übersprungen) */
export async function enter(p) {
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
}

export const DIFF_NAME = { normal: 'Normal', schwer: 'Schwer', albtraum: 'Albtraum', mythisch: 'Mythisch' };

/** Vor das Expeditionsportal der Quellwarte und das Auswahlfenster öffnen */
export async function openPortal(p) {
  for (let i = 0; ; i++) { // E trifft manchmal eine vorbeilaufende Figur der Warte statt des Portals – dann noch einmal davor
    await p.cmd('/portal'); await p.inZone('quellwarte');
    await p.use();
    try { await p.has('Herausforderung der Woche', 3000); return; } catch (e) { if (i >= 2) throw e; p.notes.push('Portal: E traf etwas anderes'); await p.esc(); await p.esc(); }
  }
}

/** Durch das Portal der Quellwarte: Auswahlfenster, Expedition und Grad wählen, allein aufbrechen, Einleitung lesen */
export async function viaPortal(p, x, diff = 'normal', n = '') {
  await openPortal(p);
  await p.page.locator('.xp-list .craft-row', { hasText: x.name }).click();
  if (diff !== 'normal') await p.page.locator('.xp-diff.d-' + diff).click();
  await p.wait(250);
  if (n) await p.shot(n + '-auswahl');
  await p.page.getByRole('button', { name: 'Allein aufbrechen' }).click();
  await p.inZone(x.id);
  await p.has(x.intro, 15000);
  if (n) await p.shot(n + '-eingang');
  await p.esc();
  await p.page.locator('.exp-hud').waitFor({ timeout: 8000 });
  await p.has(DIFF_NAME[diff]);
}

/** Abschnitt ansehen: hinspringen, Gegner in der Nähe beseitigen, Bild */
export async function visit(p, sec, n, kill = true) {
  await p.cmd('/expgo ' + sec + ' mitte'); await p.wait(900);
  if (kill) { await p.cmd('/kill'); await p.wait(500); }
  if (n) await p.shot(n);
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const nearest = (list, at) => [...list].sort((a, b) => dist(a, at) - dist(b, at))[0];

/** Objekte eines Ereignisses (Lichtsteine, Ventile) der Reihe nach erreichen und benutzen */
async function useAll(p, kind, n) {
  let list = [];
  for (let i = 0; i < 30 && list.length < 3; i++) { list = await p.objs(kind); await p.wait(200); }
  if (list.length < 3) throw new Error(`nur ${list.length} ${kind} im Abschnitt`);
  const done = new Set();
  for (let k = 0; k < list.length; k++) {
    const o = nearest(list.filter(x => !done.has(x.id)), await p.me());
    const j0 = p.jumps;
    let tries = 0;
    for (; tries < 3; tries++) { // Gegner drängen die Figur gern ein Stück weg – dann noch einmal hin
      await p.reach(o.x, o.y + 16, kind);
      await p.use(); await p.wait(400);
      if ((await p.objs(kind)).find(x => x.id === o.id)?.state === 1) break;
    }
    if (tries >= 3) throw new Error(`${kind} bei ${Math.round(o.x)},${Math.round(o.y)} reagiert nicht (Sprünge ${p.jumps - j0})`);
    p.notes.push(`${kind} ${k + 1}: ${p.jumps - j0} Sprünge, ${tries + 1}. Versuch`);
    done.add(o.id);
    if (k === 0 && n) await p.shot(n);
  }
}

/** Ein Ereignis ist vorbei, wenn seine Truhe dasteht (die Meldung dazu verdrängen Beutemeldungen gern sofort) */
async function chestAppears(p, label, timeout = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) { if ((await p.objs('chest')).some(c => c.props.label === label)) return; await p.wait(250); }
  throw new Error(`keine Truhe „${label}“`);
}

/** Die besonderen Ereignisse: Finsternis, Flut, Einsturz, Hinterhalt */
export const EVENTS = {
  async darkness(p, sec, n) {
    await p.cmd(`/expgo ${sec} mitte`);
    await p.has('Das Licht geht aus', 8000);
    await p.page.locator('.exp-event', { hasText: 'Finsternis' }).waitFor({ timeout: 6000 });
    await p.wait(2500); await p.shot(n + '-finsternis');
    await useAll(p, 'lightstone', n + '-lichtstein');
    await chestAppears(p, 'Lohn der Mühe');
    await p.wait(800); await p.shot(n + '-licht-zurueck');
  },
  async flood(p, sec, n) {
    await p.cmd(`/expgo ${sec} mitte`);
    await p.has('Schmelzwasser steigt', 8000);
    await p.wait(4500); await p.shot(n + '-flut');
    await useAll(p, 'valve', n + '-ventil');
    await chestAppears(p, 'Lohn der Mühe');
    await p.wait(800); await p.shot(n + '-flut-vorbei');
  },
  /** Einsturz-Jagd: vom Zugang bis zur fernen Mündung laufen – mit den Tasten, schneller als der Boden bricht */
  async collapse(p, sec, n) {
    const s = await p.section(sec);
    const end = s.mouths.reduce((a, m) => (dist(m, s.entry) > dist(a, s.entry) ? m : a), s.mouths[0]);
    await p.cmd(`/expgo ${sec}`); await p.wait(500);
    const t0 = Date.now(), j0 = p.jumps;
    const run = p.walkTo(end.x, end.y, { near: 30, timeout: 20000 });
    await p.has('Der Steg bricht', 6000);
    await p.wait(1700); await p.shot(n + '-einsturz');
    await run;
    await chestAppears(p, 'Lohn der Mühe');
    await p.wait(600); await p.shot(n + '-einsturz-geschafft');
    return { sec: (Date.now() - t0) / 1000, jumps: p.jumps - j0 };
  },
  async ambush(p, sec, n) {
    await p.cmd(`/expgo ${sec} mitte`);
    await p.has('Hinterhalt!', 8000);
    await p.has('Welle 1 von 4', 8000);
    await p.wait(1200); await p.shot(n + '-hinterhalt');
    const t0 = Date.now();
    while (Date.now() - t0 < 60000) {
      await p.cmd('/kill'); await p.wait(1500);
      if ((await p.objs('chest')).some(c => c.props.label === 'Beute des Hinterhalts')) break;
    }
    await chestAppears(p, 'Beute des Hinterhalts', 1000);
    await p.shot(n + '-hinterhalt-vorbei');
  },
};

/** Mini-Boss: hingehen, angreifen, Bossleiste und ein Muster abwarten, besiegen */
export async function mini(p, sec, name, n) {
  await p.cmd(`/expgo ${sec} mitte`); await p.wait(600);
  const m = (await p.mobs()).find(x => x.name === name);
  const kills = () => p.page.evaluate(() => window.__em.store.state.expRun?.kills);
  if (!m) throw new Error(`Mini-Boss ${name} nicht in der Szene (besiegt: ${await kills()})`);
  await p.walkTo(m.x, m.y + 40, { near: 30, timeout: 5000 });
  // nicht angreifen: Er kommt von selbst, sobald man ihm nahe ist – und zeigt dann seine Bossleiste
  await p.page.locator('.boss .boss-name', { hasText: name }).waitFor({ timeout: 8000 }).catch(async () => {
    const now = (await p.mobs()).find(x => x.name === name);
    throw new Error(`keine Bossleiste für ${name}: ${now ? `Leben ${now.hp}/${now.maxHp}` : 'nicht mehr da'}, Gegner besiegt ${await kills()}`);
  });
  await p.wait(3200); await p.shot(n + '-miniboss');
  const before = await p.page.evaluate(() => window.__em.store.state.expRun?.minis?.[0] ?? 0);
  await p.cmd('/kill'); // die Meldung „… ist besiegt“ verdrängen die Beutemeldungen schnell – gezählt wird im HUD
  await p.page.waitForFunction(b => (window.__em.store.state.expRun?.minis?.[0] ?? 0) > b, before, { timeout: 8000 });
}

/** Signaturmechaniken der Endbosse – jede wird einmal wirklich ausgelöst */
export const SIGS = {
  /** Kristallkoloss: hinter eine Prismensäule stellen, bis sein Ansturm sie trifft */
  async prisma(p, n) {
    await p.has('Prismensäule', 10000);
    let pillars = (await p.mobs()).filter(m => m.name === 'Prismensäule');
    if (pillars.length !== 4) throw new Error(`${pillars.length} Prismensäulen statt 4`);
    await p.shot(n + '-saeulen');
    const t0 = Date.now(), since = Date.now();
    while (Date.now() - t0 < 75000) {
      const all = await p.mobs(), b = all.find(m => m.boss);
      pillars = all.filter(m => m.name === 'Prismensäule');
      if (pillars.length < 4 || p.saw('Verwundbar!', since)) break;
      if (!b) { await p.wait(200); continue; }
      const pl = nearest(pillars, b), d = dist(pl, b) || 1;
      await p.walkTo(pl.x + ((pl.x - b.x) / d) * 30, pl.y + ((pl.y - b.y) / d) * 30, { near: 7, timeout: 1500 });
      await p.wait(120);
    }
    await p.has('Die Säule zerspringt', 3000);
    await p.wait(500); await p.shot(n + '-koloss-taumelt');
    const b = (await p.mobs()).find(m => m.boss);
    const before = b.hp;
    await p.walkTo(b.x, b.y + 24, { near: 20, timeout: 2500 });
    await p.page.mouse.move(640, 330); await p.page.mouse.down(); await p.wait(1800); await p.page.mouse.up();
    const after = (await p.mobs()).find(m => m.boss)?.hp ?? before;
    return { secs: Math.round((Date.now() - t0) / 1000), dmg: before - after, pillars: pillars.length };
  },
  /** Ignarok: Glut steigen lassen, dann eine Kühlkette ziehen */
  async chain(p, n) {
    await p.has('Ignaroks Glut steigt', 10000);
    await p.wait(7500);
    const chains = await p.objs('chain');
    if (chains.length < 2) throw new Error(`${chains.length} Kühlketten`);
    const c = nearest(chains, await p.me());
    await p.reach(c.x, c.y + 16, 'Kühlkette');
    await p.use();
    await p.has('zieht die Kühlkette', 6000);
    await p.wait(400); await p.shot(n + '-kuehlkette');
  },
  /** Ysolde: beim „Halt still“ erst stehen bleiben (kein Treffer), dann bewegen (Treffer „Bewegt!“) */
  async still(p, n) {
    await p.has('Nur einen Atemzug lang', 30000);
    const since = Date.now();
    await p.shot(n + '-halt-still');
    await p.sawWait('Erstarrt!', since, 4000); // 2,6 s nach der Ansage – ab da zählt jede Bewegung, 1,6 s lang
    await p.wait(250);
    if (p.saw('Bewegt!', since)) throw new Error('Stillstand traf, obwohl die Figur stand');
    await p.page.keyboard.down('KeyD'); await p.wait(400); await p.page.keyboard.up('KeyD');
    await p.sawWait('Bewegt!', since, 2000);
    await p.shot(n + '-bewegt');
  },
  /** Archivar: eingetragen werden, zum Tintenfass laufen, gestrichen werden */
  async ink(p, n) {
    await p.has('Du bist eingetragen', 30000);
    const since = Date.now();
    await p.wait(400); await p.shot(n + '-eingetragen');
    const inks = await p.objs('ink');
    if (inks.length < 3) throw new Error(`${inks.length} Tintenfässer`);
    const o = nearest(inks, await p.me());
    await p.reach(o.x, o.y + 14, 'Tintenfass', { timeout: 6000 });
    await p.sawWait('Gestrichen!', since, 3000);
    await p.has('Vorgang ausgesetzt', 3000);
    await p.shot(n + '-gestrichen');
  },
  /** Hohler König: dem wandernden Licht folgen, bis die Leerenwoge kommt – und dabei im Licht stehen */
  async wisp(p, n) {
    await p.has('Ein kleines Licht flackert auf', 30000);
    const since = Date.now();
    let shot = false, lastLight = null, atWave = null;
    const keys = {};
    const set = async (k, on) => { if (!!keys[k] !== on) { keys[k] = on; await (on ? p.page.keyboard.down(k) : p.page.keyboard.up(k)); } };
    try { // ohne loszulassen hinterherlenken – wie ein Mensch mit dem Finger auf den Tasten
      while (Date.now() - since < 7500) {
        const st = await p.page.evaluate(() => { const sc = window.__em.game.scene.getScene('game'); const l = [...sc.zfx.values()].map(f => f.z).filter(f => f.kind === 'zone' && !f.hostile && f.el === 'light' && f.r === 36).pop(); return { x: sc.me.x, y: sc.me.y, l: l && { x: l.x, y: l.y } }; });
        if (st.l) lastLight = st.l;
        if (p.log.some(e => e.at >= since && e.k === 'fx' && e.n === 'explosion' && e.el === 'dark' && e.r >= 200)) { atWave = st; break; }
        const t = lastLight, dx = t ? t.x - st.x : 0, dy = t ? t.y - st.y : 0, far = Math.hypot(dx, dy) > 8;
        await set('KeyD', far && dx > 4); await set('KeyA', far && dx < -4); await set('KeyS', far && dy > 4); await set('KeyW', far && dy < -4);
        if (!shot && Date.now() - since > 2500) { shot = true; await p.shot(n + '-licht'); }
        await p.wait(50);
      }
    } finally { for (const k of Object.keys(keys)) await set(k, false); }
    if (!atWave || !lastLight) throw new Error('die Leerenwoge kam nicht');
    const d = Math.round(dist(atWave, lastLight));
    if (d > 42) throw new Error(`bei der Woge ${d} px vom Licht entfernt (sicher bis 42)`);
    return { dist: d };
  },
};

/** Endboss: Arena betreten, Signatur, Phasen 2 und 3 (Bilder), Sieg, Abschluss, Belohnungskammer, Rückkehr in die Warte */
export async function bossToEnd(p, x, n, sig) {
  await p.cmd(`/expgo ${x.boss} mitte`); await p.wait(2500);
  await p.shot(n + '-boss-phase1');
  const res = sig ? await SIGS[sig](p, n) : undefined;
  await p.cmd('/expphase 2'); await p.wait(3000); await p.shot(n + '-boss-phase2');
  await p.cmd('/expphase 3'); await p.wait(3000); await p.shot(n + '-boss-phase3');
  return res;
}
export async function finish(p, x, n) {
  await p.cmd('/expsieg'); await p.wait(1500);
  await p.shot(n + '-boss-tod');
  await p.has('Expedition abgeschlossen', 12000);
  await p.wait(500); await p.shot(n + '-abschluss');
  await p.page.getByRole('button', { name: 'Umsehen' }).click(); await p.wait(600);
  await p.shot(n + '-belohnungskammer');
}
export async function goHome(p, x, n) {
  await p.page.locator('.exp-return').getByRole('button', { name: /Gemeinsam heimkehren/ }).click();
  await p.inZone('quellwarte');
  await p.has('Zurück aus ' + x.name, 12000);
  if (n) await p.shot(n + '-zurueck');
  await p.page.locator('.exp-summary .window-x').click().catch(() => {});
}
