// Browser-Durchlauf „Ausrüstungswert“ (GS, 0.12) mit ZWEI Browsern: Puppe mit Wert je Platz, Anlegen und Vergleich im Tooltip
// (Ringe gegen beide Ringplätze), Verbessern bei Gunda, Empfehlung und Warnung im Portal, Gruppenrahmen, Gruppenfenster,
// Ansehen, Bereitschaftsprüfung zu zweit, Gruppenbereich und Trophäenhalle der Quellwarte. Bilder auch in 1000×560 und 600×900.
// Voraussetzung: Playwright und ein Server MIT Dev-Befehlen (scripts/e2e-all.mjs startet einen eigenen):
//   EM_DEV=1 EM_PORT=7795 npm start   →   EM_URL=http://127.0.0.1:7795 node tests/e2e/ausruestungswert.mjs
// Bilder: tests/e2e/out/gs-*.png
import { enter, launch, openPortal, player, url } from './lib/exp.mjs';

const browser = await launch();
const errors = [];
let failed = 0;
const tag = Math.random().toString(36).replace(/[^a-z]/g, '').slice(0, 4).padEnd(4, 'x');
const a = await player(browser, 'gs', 'a', 'Gerda' + tag, 'Krieger', errors);
const b = await player(browser, 'gs', 'b', 'Bodo' + tag, 'Magier', errors);
const step = async (name, fn) => {
  try { await fn(); console.log('  ✓ ' + name); }
  catch (e) { failed++; console.log('  ✗ ' + name + ': ' + e.message.split('\n')[0]); for (const p of [a, b]) { await p.shot(`fehler-${failed}-${p.key}`).catch(() => {}); await p.esc().catch(() => {}); await p.esc().catch(() => {}); } }
};
const num = s => Number(String(s).replace(/[^\d-]/g, ''));
const ok = (cond, msg) => { if (!cond) throw new Error(msg); };
/** Ausrüstungswert in der Puppe und die Summe der Werte je Platz */
async function doll(p) {
  if (!(await p.page.locator('.win-inv').count())) { await p.page.keyboard.press('i'); await p.page.locator('.win-inv .doll-gs').waitFor({ timeout: 5000 }); }
  await p.wait(300);
  const total = num(await p.page.locator('.win-inv .doll-gs .gs-val').innerText());
  const slots = await p.page.locator('.win-inv .doll .slot-gs').allInnerTexts();
  return { total, sum: slots.reduce((x, s) => x + num(s), 0), n: slots.length };
}
/** wartet, bis die Puppe einen anderen Wert als `before` zeigt (der Server antwortet unter Last mit Verzögerung) */
async function dollChange(p, before, timeout = 10000) {
  await p.page.waitForFunction(v => { const e = document.querySelector('.win-inv .doll-gs .gs-val'); return e && Number(e.textContent.replace(/[^\d-]/g, '')) !== v; }, before, { timeout }).catch(() => {});
  return doll(p);
}
/** Tooltip eines Rucksackplatzes */
async function hoverBag(p, i) {
  await p.page.mouse.move(5, 5); await p.wait(150);
  await p.page.locator('.win-inv .inv-grid .slot').nth(i).hover(); await p.wait(350);
  return p.page.locator('.tooltip');
}
/** Zu einem NPC der aktuellen Karte springen und ihn ansprechen */
async function talk(p, npc, option) {
  const o = await p.page.evaluate(t => { for (const v of window.__em.game.scene.getScene('game').objs.values()) if (v.o.type === 'npc' && v.o.tag === t) return { x: v.o.x, y: v.o.y }; return null; }, npc);
  ok(o, 'NPC nicht da: ' + npc);
  await p.goto(o.x, o.y + 16); await p.wait(500);
  await p.use();
  await p.has(option); await p.page.getByText(option).first().click(); await p.wait(500);
}
/** Bild in drei Fenstergrößen (Standard, klein quer, schmal hoch) */
async function sizes(p, n, prep) {
  for (const [w, h] of [[1280, 720], [1000, 560], [600, 900]]) { await p.page.setViewportSize({ width: w, height: h }); await p.wait(450); if (prep) await prep(); await p.shot(`${n}-${w}x${h}`); }
  await p.page.setViewportSize({ width: 1280, height: 720 }); await p.wait(300);
}

console.log('Eternal Mana – Ausrüstungswert mit zwei Browsern gegen ' + url);
await step('beide betreten die Welt', async () => {
  await Promise.all([enter(a), enter(b)]);
  for (const p of [a, b]) { await p.cmd('/lvl 20'); await p.cmd('/god'); await p.cmd('/welt aus'); await p.cmd('/expfrei'); }
  await a.cmd('/gold 400000'); await a.cmd('/time 0.45');
});
let start = 0;
await step('Puppe: Stufe, Klasse, Ausrüstungswert in Farbe, Wert je Platz – die Summe stimmt', async () => {
  const d = await doll(a);
  await a.has('Stufe 20 · Krieger');
  ok(d.total > 0 && d.total === d.sum, `Puppe ${d.total}, Summe der Plätze ${d.sum}`);
  ok(d.n === 4, `Startausrüstung: vier Plätze mit Wert, gefunden ${d.n}`);
  start = d.total;
  await a.shot('01-puppe-start');
});
await step('Tooltip: Wert des Teils; Vergleich mit Änderung des Charakter-Werts, Ringe gegen beide Ringplätze', async () => {
  await a.cmd('/gear 2'); await a.wait(700);
  const bag = await a.page.locator('.win-inv .inv-grid .slot:not(.empty)').count();
  ok(bag >= 10, 'zehn Teile im Rucksack erwartet, da sind ' + bag);
  let ring = -1;
  for (let i = 0; i < bag; i++) { const t = await hoverBag(a, i); if (/Ring · beide Ringplätze/.test(await t.innerText())) { ring = i; break; } }
  ok(ring >= 0, 'kein Ring im Rucksack');
  const tip = a.page.locator('.tooltip');
  await tip.locator('.tip-gs').waitFor({ timeout: 3000 });
  const rows = await tip.locator('.tip-gs-row').allInnerTexts();
  ok(rows.length === 2 && /Ring 1/.test(rows[0]) && /Ring 2/.test(rows[1]), 'Ringvergleich: ' + rows.join(' | '));
  ok(rows.every(r => /\(frei\)/.test(r) && /▲ \+/.test(r)), 'beide Ringplätze frei, beide ein Gewinn: ' + rows.join(' | '));
  await sizes(a, '02-tooltip-ring', () => hoverBag(a, ring));
});
await step('Anlegen: der angekündigte Gewinn kommt genau an, die Puppe zählt richtig', async () => {
  for (let k = 0; k < 12; k++) {
    const slots = a.page.locator('.win-inv .inv-grid .slot:not(.empty)');
    const n = await slots.count();
    let idx = -1, gain = 0;
    for (let i = 0; i < n; i++) {
      const t = await hoverBag(a, i), txt = await t.innerText();
      if (!/Ausrüstungswert/.test(txt) || !/▲ \+/.test(txt)) continue;
      gain = num(/▲ \+([\d.]+)/.exec(txt)[1]); idx = i; break;
    }
    if (idx < 0) break;
    const before = (await doll(a)).total;
    await slots.nth(idx).click(); await a.wait(200);
    await a.page.locator('.inv-actions').getByRole('button', { name: 'Ausrüsten' }).click();
    const after = await dollChange(a, before);
    ok(after.total === before + gain, `angekündigt +${gain}, aus ${before} wurde ${after.total}`);
    ok(after.total === after.sum, 'Summe je Platz');
  }
  const d = await doll(a);
  ok(d.n === 10 && d.total > start * 5, `zehn Plätze belegt (${d.n}), Wert ${d.total} statt ${start}`);
  await a.page.mouse.move(5, 5);
  await sizes(a, '03-puppe-voll');
  // ein schwächeres Teil: Vergleich rot
  await a.cmd('/item w_sword_1 1'); await a.wait(400);
  let worse = false;
  const n = await a.page.locator('.win-inv .inv-grid .slot:not(.empty)').count();
  for (let i = 0; i < n && !worse; i++) { const t = await hoverBag(a, i); worse = /▼ −/.test(await t.innerText()); }
  ok(worse, 'kein Teil mit ▼ im Vergleich');
  await a.shot('04-tooltip-schlechter');
  await a.page.mouse.move(5, 5); await a.esc();
});
await step('Verbessern bei Gunda: die Schmiede zeigt den Wert vorher/nachher, die Puppe übernimmt ihn', async () => {
  await a.cmd('/mats all 99'); await a.cmd('/portal'); await a.inZone('quellwarte');
  await talk(a, 'gunda', 'Ausrüstung verbessern');
  const row = a.page.locator('.upg-gs');
  await row.waitFor({ timeout: 5000 });
  const [cur, next] = (await row.innerText()).match(/\d+/g).map(Number);
  ok(next > cur, `Schmiede: ${cur} → ${next}`);
  await a.page.getByRole('button', { name: /^Auf \+1 verbessern/ }).click(); await a.wait(800);
  await a.page.locator('.upg-arrow', { hasText: '+2' }).waitFor({ timeout: 5000 });
  const [cur2] = (await row.innerText()).match(/\d+/g).map(Number);
  ok(cur2 === next, `nach dem Verbessern zeigt die Schmiede ${cur2}, angekündigt war ${next}`);
  await a.shot('05-schmiede');
  await a.esc(); await a.esc();
  const d = await doll(a);
  ok(d.total === d.sum, 'Puppe nach dem Verbessern');
  await a.esc();
});
await step('Portal: Empfehlung je Grad, Belohnungsstufe, Warnung unter dem Mindestwert (keine Sperre)', async () => {
  await openPortal(a);
  await a.page.locator('.xp-list .craft-row', { hasText: 'Die Wurzeltiefe' }).click(); await a.wait(300);
  const box = a.page.locator('.xp-gs');
  await box.waitFor({ timeout: 4000 });
  const t = await box.innerText();
  ok(/Empfohlen GS/.test(t) && /Mindestens GS/.test(t) && /Dein Wert GS/.test(t) && /Abenteuer/i.test(t) && /Gegenstandsstufe/.test(t), 'Kasten: ' + t);
  ok((await a.page.locator('.xp-diff .xp-diff-gs').count()) === 4, 'GS an jedem Grad');
  ok(!(await a.page.locator('.xp-gs-warn').count()), 'Normal: keine Warnung erwartet');
  await sizes(a, '06-portal-normal', () => box.scrollIntoViewIfNeeded());
  await a.page.locator('.xp-diff.d-mythisch').click(); await a.wait(300);
  await a.page.locator('.xp-gs-warn', { hasText: 'unter dem Mindestwert' }).waitFor({ timeout: 4000 });
  ok(/Raid-Endgame/i.test(await box.innerText()), 'Mythisch: Raid-Endgame');
  await sizes(a, '07-portal-mythisch', () => box.scrollIntoViewIfNeeded());
  await a.page.locator('.xp-diff.d-normal').click(); await a.esc();
});
let bGs = 0;
await step('Gruppe zu zweit: Rahmen, Gruppenfenster und Ansehen zeigen den Wert, den der Server rechnet', async () => {
  bGs = (await doll(b)).total; await b.esc();
  await a.page.keyboard.press('p'); await a.wait(400);
  await a.page.locator('.pp-list li', { hasText: b.name }).getByRole('button', { name: 'Einladen' }).click();
  await b.has('lädt dich in eine Gruppe ein');
  await b.page.getByRole('button', { name: 'Annehmen' }).click();
  await a.has('führt an'); await a.wait(1500);
  const member = a.page.locator('.pp-member', { hasText: b.name });
  ok(num(await member.locator('.gs-val').innerText()) === bGs, 'Gruppenfenster: GS von ' + b.name);
  await a.shot('08-gruppenfenster');
  await member.getByRole('button', { name: 'Ansehen' }).click();
  await a.page.locator('.win-inspect .doll-gs').waitFor({ timeout: 5000 });
  ok(num(await a.page.locator('.win-inspect .doll-gs .gs-val').innerText()) === bGs, 'Ansehen: GS');
  await sizes(a, '09-ansehen');
  await a.esc(); await a.esc();
  const frame = a.page.locator('.party-frame', { hasText: b.name });
  ok(num(await frame.locator('.gs-val').innerText()) === bGs, 'Gruppenrahmen: GS');
  // B legt etwas an: der Rahmen bei A folgt
  await b.cmd('/gear 1'); await b.wait(500);
  await b.page.keyboard.press('i'); await b.page.locator('.win-inv').waitFor();
  await b.page.locator('.win-inv .inv-grid .slot:not(.empty)').last().click(); await b.wait(200);
  await b.page.locator('.inv-actions').getByRole('button', { name: 'Ausrüsten' }).click();
  const nb = (await dollChange(b, bGs)).total; await b.esc();
  ok(nb !== bGs, 'B: Wert hat sich geändert');
  await a.page.waitForFunction(([n, v]) => [...document.querySelectorAll('.party-frame')].some(f => f.textContent.includes(n) && f.querySelector('.gs-val')?.textContent.replace(/\D/g, '') === String(v)), [b.name, nb], { timeout: 8000 });
  bGs = nb;
  await a.shot('10-gruppenrahmen');
});
await step('Bereitschaft am Portal: wer unter dem Mindestwert liegt, steht mit Namen da', async () => {
  await b.cmd('/portal'); await b.inZone('quellwarte');
  await openPortal(a);
  await a.page.locator('.xp-list .craft-row', { hasText: 'Der Hof der Hohlen Krone' }).click(); await a.wait(400);
  await a.page.locator('.xp-gs-crew').waitFor({ timeout: 4000 });
  await a.page.locator('.xp-gs-warn', { hasText: b.name }).waitFor({ timeout: 4000 });
  await a.shot('11-portal-gruppe');
  await a.page.locator('.xp-list .craft-row', { hasText: 'Die Wurzeltiefe' }).click(); await a.wait(300);
  await a.page.getByRole('button', { name: 'Gruppe zur Bereitschaft rufen' }).click(); await a.wait(800);
  await a.page.locator('.xp-lobby-gs').nth(1).waitFor({ timeout: 5000 });
  const gs = (await a.page.locator('.xp-lobby-gs').allInnerTexts()).map(num);
  ok(gs.includes(bGs), `Bereitschaft: ${gs.join(', ')} – erwartet ${bGs} für ${b.name}`);
  await sizes(a, '12-bereitschaft', () => a.page.locator('.xp-lobby').scrollIntoViewIfNeeded());
  await a.page.getByRole('button', { name: 'Abbrechen' }).click(); await a.wait(400);
  await a.esc();
});
await step('Gruppenbereich und Trophäenhalle der Quellwarte zeigen den Wert', async () => {
  await talk(a, 'wenke', 'Gruppenbereich: Leute finden');
  await a.page.locator('.hub-groups .gs-val').nth(1).waitFor({ timeout: 6000 });
  await a.shot('13-gruppenbereich');
  await a.esc();
  await talk(a, 'bertram', 'Durch die Trophäenhalle gehen');
  await a.has('Ausrüstungswert (GS)');
  await a.shot('14-halle');
  await a.esc();
});

const bad = errors.filter(e => !/favicon|ERR_|net::/.test(e));
if (bad.length) { failed++; console.log('  ✗ Fehler in der Konsole:\n    ' + bad.slice(0, 8).join('\n    ')); }
await browser.close();
console.log(failed ? `${failed} Schritt(e) gescheitert.` : 'Alles bestanden.');
process.exit(failed ? 1 : 0);
