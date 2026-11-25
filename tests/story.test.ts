/**
 * Geschichte (0.3): Daten-Konsistenz der Story-Inhalte und Integrationstests der Story-Engine gegen einen echten Server –
 * Kapitelbeginn, Dialogprüfung, Chronik, Entscheidungen, verborgenes Ende, Vaels Prüfung, alte Spielstände,
 * dazu ein vollständiger Durchlauf der Hauptgeschichte von Kapitel 7 bis zum Epilog.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Db, sanitizeChar } from '../server/src/db';
import { DOCS, LORE_CATS, LORE_DOCS, loreProgress } from '../shared/src/data/chronik';
import { MEMORY_KEYS, condOk, type Cond } from '../shared/src/data/cond';
import { TOPICS } from '../shared/src/data/dialoge';
import { BOSSES, ENEMIES } from '../shared/src/data/enemies';
import { ITEMS } from '../shared/src/data/items';
import { NPCS } from '../shared/src/data/npcs';
import { QUEST_LIST, QUESTS, chapterOf, questAvailable, questChapter, questStartable, questText } from '../shared/src/data/quests';
import { CHAPTERS, CINES, DECISIONS, ECHOES, LIED_COND, PLACES, SHRINES, STORY_OBJS, type DlgFx } from '../shared/src/data/story';
import { ZONES, ZONE_LIST } from '../shared/src/data/zones';
import { getMap, validateMap } from '../shared/src/maps/mapgen';
import { newCharacter } from '../shared/src/stats';
import { FLAG_INVULN } from '../shared/src/types';
import type { CharData, ObjInfo } from '../shared/src/types';
import { Bot } from './helpers/bot';

// =====================================================================================================================
//  DATEN-KONSISTENZ
// =====================================================================================================================
const AKT1_MAIN = QUEST_LIST.filter(q => q.type === 'main' && !q.chapter).map(q => q.id);
const AKT2 = QUEST_LIST.filter(q => q.chapter || q.line);

/** Alle Wirkungen aller Dialoge samt Fundstelle */
const ALL_FX: { where: string; fx: DlgFx }[] = [];
for (const t of TOPICS) for (const id in t.nodes) {
  const n = t.nodes[id];
  if (n.fx) ALL_FX.push({ where: `${t.id}/${id}`, fx: n.fx });
  n.opts?.forEach((o, i) => { if (o.fx) ALL_FX.push({ where: `${t.id}/${id}#${i}`, fx: o.fx }); });
}
const FLAGS_SET = new Set(ALL_FX.flatMap(x => (x.fx.flag ? (Array.isArray(x.fx.flag) ? x.fx.flag : [x.fx.flag]) : [])));
const placed = (type: string, tag: string) => Object.values(ZONES).some(z => getMap(z.id).objects.some(o => o.type === type && o.tag === tag)); // 0.9: auch die Quellwarte

function checkCond(c: Cond | undefined, where: string) {
  if (!c) return;
  for (const k of ['done', 'active', 'notDone', 'started', 'notStarted'] as const) if (c[k]) expect(QUESTS[c[k]!], `${where}: Quest ${c[k]}`).toBeTruthy();
  for (const k of ['dec', 'decNot'] as const) if (c[k]) { const d = DECISIONS[c[k]![0]]; expect(d, `${where}: Entscheidung ${c[k]![0]}`).toBeTruthy(); expect(d.options.some(o => o.v === c[k]![1]), `${where}: Wert ${c[k]![1]}`).toBe(true); }
  for (const k of ['decided', 'undecided'] as const) if (c[k]) expect(DECISIONS[c[k]!], `${where}: Entscheidung ${c[k]}`).toBeTruthy();
  for (const k of ['flag', 'noFlag'] as const) {
    const f = c[k];
    if (!f) continue;
    if (f.startsWith('q:')) expect(FLAGS_SET.has(f), `${where}: Flag ${f} wird von keinem Dialog gesetzt`).toBe(true);
    else if (f.startsWith('h:')) expect(MEMORY_KEYS.includes(f.slice(2) as any), `${where}: ${f}`).toBe(true);
    else if (f.startsWith('b:')) expect(BOSSES[f.slice(2)], `${where}: ${f}`).toBeTruthy();
    else throw new Error(`${where}: unbekannte Flag-Art ${f}`);
  }
  for (const x of [...(c.all ?? []), ...(c.any ?? []), ...(c.not ? [c.not] : [])]) checkCond(x, where);
}

describe('Story-Daten', () => {
  it('Umfang: Kapitel, Dokumente, Entscheidungen, Geheimquests, Schreine', () => {
    for (let ch = 7; ch <= 11; ch++) expect(QUEST_LIST.some(q => questChapter(q) === ch), `Kapitel ${ch}`).toBe(true);
    expect(CHAPTERS.length).toBe(11);
    expect(LORE_DOCS.filter(d => !d.when).length).toBeGreaterThanOrEqual(40);
    expect(Object.keys(DECISIONS).length).toBeGreaterThanOrEqual(5);
    expect(QUEST_LIST.filter(q => q.hidden).length).toBeGreaterThanOrEqual(4);
    expect(Object.keys(SHRINES).length).toBe(6);
    // mindestens acht bestehende Figuren mit eigener Questreihe aus 2–3 Schritten
    const lines = new Map<string, number>();
    for (const q of QUEST_LIST) if (q.line && q.id.startsWith('c_')) lines.set(q.line, (lines.get(q.line) ?? 0) + 1);
    expect(lines.size).toBeGreaterThanOrEqual(8);
    for (const [l, n] of lines) expect(n, `Questreihe ${l}`).toBeGreaterThanOrEqual(2);
    // jede Zone enthält Chronik-Dokumente
    for (const z of ZONE_LIST) expect(LORE_DOCS.some(d => d.zone === z.id), `Dokumente in ${z.id}`).toBe(true);
  });

  it('Hauptgeschichte Akt II hängt lückenlos an m_koenig', () => {
    const main2 = QUEST_LIST.filter(q => q.type === 'main' && q.chapter);
    const reach = new Set(['m_koenig']);
    for (let changed = true; changed;) { changed = false; for (const q of main2) if (!reach.has(q.id) && (q.requires ?? []).every(r => reach.has(r)) && q.requires?.length) { reach.add(q.id); changed = true; } }
    for (const q of main2) expect(reach.has(q.id), q.id).toBe(true);
    // Kapitel steigen entlang der Kette nie ab
    for (const q of main2) for (const r of q.requires ?? []) expect(questChapter(QUESTS[r])!, `${r} → ${q.id}`).toBeLessThanOrEqual(q.chapter!);
  });

  it('Quests: Auftraggeber stehen in der Welt, jedes Ziel ist erfüllbar, jede Kennung existiert', () => {
    for (const q of AKT2) {
      for (const npc of [q.giver, q.turnIn ?? q.giver]) { expect(NPCS[npc], `${q.id}: NPC ${npc}`).toBeTruthy(); expect(placed('npc', npc), `${q.id}: ${npc} steht nirgends`).toBe(true); }
      expect(ZONES[q.zone], `${q.id}: Zone ${q.zone}`).toBeTruthy();
      for (const r of q.requires ?? []) expect(QUESTS[r], `${q.id} requires ${r}`).toBeTruthy();
      checkCond(q.when, q.id);
      for (const a of q.alt ?? []) checkCond(a.if, q.id + ' alt');
      for (const b of q.bonus ?? []) { checkCond(b.if, q.id + ' bonus'); for (const [it] of b.items ?? []) expect(ITEMS[it], it).toBeTruthy(); }
      for (const [it] of q.rewards.items ?? []) expect(ITEMS[it], it).toBeTruthy();
      for (const id of typeof q.cine === 'string' ? [q.cine] : (q.cine ?? []).map(c => c.id)) expect(CINES[id], `${q.id}: Filmszene ${id}`).toBeTruthy();
      if (typeof q.cine === 'object') for (const c of q.cine) checkCond(c.if, q.id + ' cine');
      for (const d of q.trigger?.lore ?? []) expect(DOCS[d], `${q.id}: Auslöser ${d}`).toBeTruthy();
      if (q.trigger?.visit) expect(PLACES[q.trigger.visit], `${q.id}: Auslöser-Ort`).toBeTruthy();
      // verborgene Quests brauchen einen Auslöser: Fundstück, Ort oder Dialog
      if (q.hidden) expect(!!q.trigger || ALL_FX.some(x => x.fx.quest === q.id), `${q.id} kann nie beginnen`).toBe(true);
      for (const o of q.objectives) {
        const w = `${q.id}: ${o.label}`;
        switch (o.t) {
          case 'kill': expect(ENEMIES[o.mob], w).toBeTruthy(); expect(ZONE_LIST.some(z => z.mobs.some(m => m[0] === o.mob)), w + ' (Gegner kommt nirgends vor)').toBe(true); break;
          case 'boss': expect(BOSSES[o.boss], w).toBeTruthy(); expect(ZONE_LIST.some(z => z.boss === o.boss), w).toBe(true); break;
          case 'collect': expect(ITEMS[o.item], w).toBeTruthy(); if (ITEMS[o.item].kind === 'quest') expect(Object.values(ENEMIES).some(e => e.drops?.some(d => d[0] === o.item) && ZONE_LIST.some(z => z.mobs.some(m => m[0] === e.id))), w + ' (fällt nirgends)').toBe(true); break;
          case 'talk': expect(placed('npc', o.npc), w).toBe(true); break;
          case 'lore': expect(DOCS[o.doc], w).toBeTruthy(); expect(placed('lore', o.doc), w + ' (liegt nirgends)').toBe(true); expect(DOCS[o.doc].when, w + ' (bedingtes Dokument als Ziel)').toBeUndefined(); break;
          case 'lorecount': expect(o.n, w).toBeLessThanOrEqual(LORE_DOCS.filter(d => !d.when).length); break;
          case 'visit': { const pl = PLACES[o.place]; expect(pl, w).toBeTruthy(); expect(ZONES[pl.zone]?.pois?.some(p => p.id === pl.poi), w + ' (POI fehlt)').toBe(true); break; }
          case 'decide': expect(DECISIONS[o.id], w).toBeTruthy(); for (const opt of DECISIONS[o.id].options) expect(ALL_FX.some(x => x.fx.decide?.[0] === o.id && x.fx.decide[1] === opt.v), `${w}: Option ${opt.v} ist in keinem Dialog wählbar`).toBe(true); break;
          case 'echo': expect(ECHOES[o.id], w).toBeTruthy(); expect(o.id.startsWith('schrein_') ? placed('shrine', o.id.slice(8)) : placed('rift', o.id), w + ' (kein Auslöser in der Welt)').toBe(true); break;
          case 'flag': if (o.flag.startsWith('h:')) expect(SHRINES[o.flag.slice(2)] || ALL_FX.some(x => x.fx.mem === o.flag.slice(2)), w).toBeTruthy(); else expect(FLAGS_SET.has(o.flag), w + ' (kein Dialog setzt dieses Flag)').toBe(true); break;
          case 'memories': expect(o.n, w).toBeLessThanOrEqual(MEMORY_KEYS.length); break;
        }
      }
    }
    // jede Hüter-Erinnerung ist erreichbar: sechs Schreine + Vael im Gespräch
    for (const k of MEMORY_KEYS) expect(SHRINES[k] ? placed('shrine', k) && !!QUESTS[SHRINES[k].quest] : ALL_FX.some(x => x.fx.mem === k), `Erinnerung ${k}`).toBe(true);
    checkCond(LIED_COND, 'Lied');
  });

  it('Dialoge: Figuren, Knoten, Sprünge, Wirkungen', () => {
    const ids = new Set<string>();
    for (const t of TOPICS) {
      expect(ids.has(t.id), `doppelt: ${t.id}`).toBe(false); ids.add(t.id);
      expect(NPCS[t.npc], t.id).toBeTruthy(); expect(placed('npc', t.npc), `${t.id}: ${t.npc} steht nirgends`).toBe(true);
      expect(t.nodes.start, t.id + ' ohne start').toBeTruthy();
      checkCond(t.if, t.id); checkCond(t.hot, t.id);
      const seen = new Set(['start']);
      for (const q = ['start']; q.length;) for (const o of t.nodes[q.pop()!].opts ?? []) { checkCond(o.if, t.id); if (o.to) { expect(t.nodes[o.to], `${t.id}: Sprung nach ${o.to}`).toBeTruthy(); if (!seen.has(o.to)) { seen.add(o.to); q.push(o.to); } } }
      for (const id in t.nodes) { expect(seen.has(id), `${t.id}/${id} unerreichbar`).toBe(true); expect(t.nodes[id].lines.length, `${t.id}/${id}`).toBeGreaterThan(0); }
    }
    for (const { where, fx } of ALL_FX) {
      if (fx.decide) expect(DECISIONS[fx.decide[0]]?.options.some(o => o.v === fx.decide![1]), where).toBe(true);
      if (fx.quest) expect(QUESTS[fx.quest], where).toBeTruthy();
      if (fx.cine) expect(CINES[fx.cine], where).toBeTruthy();
      if (fx.mem) expect(MEMORY_KEYS.includes(fx.mem), where).toBe(true);
      for (const [it] of [...(fx.give ?? []), ...(fx.take ?? [])]) expect(ITEMS[it], `${where}: ${it}`).toBeTruthy();
    }
    for (const n of Object.values(NPCS)) for (const l of n.talk ?? []) checkCond(l.if, 'talk ' + n.id);
  });

  it('Chronik, Echos, Filmszenen, Story-Objekte und neue Gegner', () => {
    const ids = new Set<string>();
    for (const d of LORE_DOCS) {
      expect(ids.has(d.id), `doppelt: ${d.id}`).toBe(false); ids.add(d.id);
      expect(ZONES[d.zone], d.id).toBeTruthy(); expect(LORE_CATS.some(c => c.id === d.cat), d.id).toBe(true); expect(d.text.length, d.id).toBeGreaterThan(60);
      expect(getMap(d.zone).objects.some(o => o.type === 'lore' && o.tag === d.id), `${d.id} liegt nicht in ${d.zone}`).toBe(true);
      checkCond(d.when, d.id);
    }
    for (const e of Object.values(ECHOES)) { for (const [m] of e.mobs) expect(ENEMIES[m], `${e.id}: ${m}`).toBeTruthy(); if (e.elite) expect(ENEMIES[e.elite.mob], e.id).toBeTruthy(); }
    for (const c of Object.values(CINES)) for (const s of c.steps) checkCond(s.if, 'cine ' + c.id);
    for (const ch of CHAPTERS) expect(CINES['ch' + ch.n], 'Kapitelkarte ' + ch.n).toBeTruthy();
    for (const k of MEMORY_KEYS) expect(CINES['mem_' + k], 'Erinnerung ' + k).toBeTruthy();
    for (const o of STORY_OBJS) { expect(ZONES[o.zone], o.tag).toBeTruthy(); expect(getMap(o.zone).objects.some(x => x.type === o.type && x.tag === o.tag), `${o.type}:${o.tag} fehlt in ${o.zone}`).toBe(true); checkCond(o.props?.when, `${o.type}:${o.tag}`); }
    // neue Gegner verwenden vorhandene Grafiken
    for (const e of Object.values(ENEMIES)) if (e.sprite) { expect(ENEMIES[e.sprite], `${e.id}: Sprite ${e.sprite}`).toBeTruthy(); expect(ENEMIES[e.sprite].sprite, `${e.id}: Sprite-Kette`).toBeUndefined(); }
    for (const b of ['vael', 'aetherion']) { expect(BOSSES[b].spared, b).toBeGreaterThan(0); expect(ITEMS[BOSSES[b].seal], b).toBeTruthy(); }
    expect(BOSSES.vael.element).toBe('dark');
    // Karten der neuen Zonen sind gültig und die bisherigen Objekte stehen unverändert vorn (alte Truhen-Flags passen weiter)
    for (const z of ZONE_LIST) {
      const m = getMap(z.id);
      expect(validateMap(m)).toEqual([]);
      const firstStory = m.objects.findIndex(o => ['lore', 'shrine', 'rift'].includes(o.type));
      if (firstStory >= 0) for (const o of m.objects.slice(firstStory)) expect(['lore', 'shrine', 'rift', 'npc', 'exit'].includes(o.type), `${z.id}: ${o.type} hinter Story-Objekten`).toBe(true);
      // Story-Objekte blockieren nichts außer Schreinen
      for (const o of m.objects) if (o.type === 'lore' || o.type === 'rift') expect(m.solid[Math.floor(o.y / 16) * m.w + Math.floor(o.x / 16)], `${z.id}: ${o.type}:${o.tag}`).toBe(0);
    }
  });

  it('Bedingungen, Kapitel und Questlogik', () => {
    const c = newCharacter('T', 'magier');
    expect(chapterOf(c)).toBe(1);
    expect(questAvailable(c, QUESTS.m_ueberlauf)).toBe(false);
    for (const id of AKT1_MAIN) c.quests[id] = { s: 'done', p: [] };
    expect(chapterOf(c)).toBe(6);
    expect(questAvailable(c, QUESTS.m_ueberlauf)).toBe(true);
    // verborgene Quests werden nie angeboten, können aber beginnen
    expect(questAvailable(c, QUESTS.x_wiegenlied)).toBe(false);
    expect(questStartable(c, QUESTS.x_wiegenlied)).toBe(true);
    // Schreinquests erst mit Kapitel 8
    expect(questAvailable(c, QUESTS.h_erde)).toBe(false);
    c.quests.m_sitze = { s: 'active', p: [0] };
    expect(questAvailable(c, QUESTS.h_erde)).toBe(true);
    expect(chapterOf(c)).toBe(8);
    // Entscheidungen steuern Bedingungen und Texte
    expect(condOk(c, { undecided: 'ende' })).toBe(true);
    c.flags['d:ende'] = 2;
    expect(condOk(c, { dec: ['ende', 2] })).toBe(true);
    expect(condOk(c, { dec: ['ende', 3] })).toBe(false);
    expect(condOk(c, { not: { any: [{ dec: ['ende', 2] }, { dec: ['ende', 3] }] } })).toBe(false);
    expect(questText(c, QUESTS.m_epilog).done[0]).toContain('Wild');
    // das verborgene Ende verlangt alle drei Voraussetzungen
    const d = newCharacter('L', 'krieger');
    expect(condOk(d, LIED_COND)).toBe(false);
    for (const k of MEMORY_KEYS) d.flags['h:' + k] = 1;
    d.quests.c_fenwick_3 = { s: 'done', p: [] };
    expect(condOk(d, LIED_COND)).toBe(false);
    d.quests.x_wiegenlied = { s: 'done', p: [] };
    expect(condOk(d, LIED_COND)).toBe(true);
    delete d.flags['h:dark'];
    expect(condOk(d, LIED_COND)).toBe(false);
    expect(loreProgress(d).found).toBe(0);
  });
});

// =====================================================================================================================
//  SERVER
// =====================================================================================================================
const PORT = 7960 + Math.floor(Math.random() * 30);
const URL = `ws://127.0.0.1:${PORT}/ws`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'em-story-'));
const OLD_TOKEN = 'altes_profil_0123456789';
let proc: ChildProcess;

async function startServer() {
  proc = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', '--import', 'tsx', 'server/src/index.ts'], { env: { ...process.env, EM_PORT: String(PORT), EM_DATA: dataDir, EM_DEV: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  proc.stdout!.on('data', d => (out += d)); proc.stderr!.on('data', d => (out += d));
  for (let i = 0; i < 100; i++) { if (out.includes('läuft')) return; await new Promise(r => setTimeout(r, 100)); }
  throw new Error('Server startet nicht:\n' + out);
}
/** Ein Spielstand, wie ihn Version 0.2 geschrieben hat: Akt I abgeschlossen, keinerlei Story-Daten aus 0.3. */
function oldSave(): CharData {
  const c = newCharacter('Altgedient', 'paladin');
  c.level = 31; c.gold = 4321;
  for (const id of AKT1_MAIN) c.quests[id] = { s: 'done', p: [], n: 1 };
  c.quests.s_tobi = { s: 'done', p: [], n: 1 };
  c.flags = { intro: 1, 'z:gruenwald': 1, 't:gruenwald': 1, 'b:hohlkoenig': 1, 's:gruenwald:shard0': 1, 'c:gruenwald:20': 1 };
  return c;
}
beforeAll(async () => {
  // alter Spielstand liegt schon in der Datenbank, bevor der Server zum ersten Mal startet
  const db = new Db(dataDir);
  const acc = db.account(OLD_TOKEN, 'Alt');
  db.createChar(acc.id, 0, oldSave());
  db.close();
  await startServer();
});
afterAll(async () => { proc.kill('SIGINT'); await new Promise(r => proc.once('exit', r)); fs.rmSync(dataDir, { recursive: true, force: true }); });

async function fresh(name: string, cls: CharData['cls'] = 'krieger', ...dev: string[]): Promise<Bot> {
  const b = new Bot(URL, name);
  await b.connect();
  await b.createAndEnter(cls, name);
  for (const d of dev) await b.dev(d);
  return b;
}
const placePos = (id: string) => { const pl = PLACES[id], poi = ZONES[pl.zone].pois!.find(p => p.id === pl.poi)!; return { x: (poi.x + (pl.dx ?? 0) + 0.5) * 16, y: (poi.y + (pl.dy ?? 0) + 0.5) * 16 }; };
async function visit(b: Bot, id: string) { const p = placePos(id); await b.warp(p.x, p.y + 12); for (let i = 0; i < 8 && !b.char.flags['v:' + id]; i++) await b.sleep(200); }
async function echo(b: Bot, o: ObjInfo, id: string) {
  await b.interact(o, 350);
  for (let i = 0; i < 12 && !b.char.flags['e:' + id]; i++) await b.dev('/kill', 200);
  expect(b.char.flags['e:' + id], 'Echo ' + id).toBe(1);
}
async function readLore(b: Bot, id: string) { const o = await b.gotoObj('lore', id, 14); await b.interact(o); expect(b.char.flags['l:' + id], 'Dokument ' + id).toBe(1); }
async function bossFight(b: Bot) {
  b.events.length = 0;
  const w = b.waitFor('pos'); b.chat('/boss'); await w;
  for (let i = 0; i < 20 && !b.events.some(e => e.k === 'boss'); i++) await b.sleep(100);
  expect(b.events.some(e => e.k === 'boss'), 'Kampf beginnt').toBe(true);
  for (let i = 0; i < 24 && !b.events.some(e => e.k === 'bossend'); i++) await b.dev('/kill', 250);
  return b.events.find(e => e.k === 'bossend') as { k: 'bossend'; id: number; won: boolean } | undefined;
}
async function through(b: Bot, type: string, tag: string, manual = false) {
  await b.sleep(1600); // Schonfrist nach Zonenwechsel
  const o = b.obj(type, tag)!;
  expect(o, `${type}:${tag}`).toBeTruthy();
  const z = b.waitFor('zone', 6000);
  if (manual) { await b.warp(o.x, o.y + 18); b.send({ t: 'interact', id: o.id }); } else await b.warp(o.x, o.y + 2);
  await z;
}
async function shrine(b: Bot, el: string, quest: string, giver: string) {
  await b.accept(quest, giver);
  expect(b.char.quests[quest]?.s, quest).toBe('active');
  const o = await b.gotoObj('shrine', el);
  await echo(b, o, 'schrein_' + el);
  const n = b.cines.length;
  await b.interact(o);
  expect(b.char.flags['h:' + el], 'Erinnerung ' + el).toBe(1);
  expect(b.cines.slice(n)).toContain('mem_' + el);
  await b.turnIn(quest, giver);
  expect(b.char.quests[quest].s).toBe('done');
}

describe('Story-Engine (Server)', () => {
  it('alter Spielstand ohne Story-Daten lädt und kann Kapitel 7 beginnen', async () => {
    // unvollständige Rohdaten werden ergänzt
    const fixed = sanitizeChar({ name: 'Roh', cls: 'krieger', level: 30, quests: { m_koenig: { s: 'done', p: [] } } })!;
    expect(fixed.flags).toEqual({});
    expect(chapterOf(fixed)).toBe(6);
    const b = new Bot(URL, 'Alt', OLD_TOKEN);
    await b.connect();
    expect(b.chars.length).toBe(1);
    const e = b.waitFor('entered');
    b.send({ t: 'enter', id: b.chars[0].id });
    await e;
    expect(b.char.level).toBe(31);
    expect(b.char.gold).toBe(4321);
    expect(b.char.flags['c:gruenwald:20']).toBe(1);
    expect(Object.keys(b.char.flags).some(k => /^[dlhevqk]:/.test(k))).toBe(false);
    // die bisherigen Objekte der Karte tragen dieselben Kennungen wie vor 0.3 (Story-Objekte hängen hinten an)
    expect(b.obj('chest')!.props!.sid).toBeLessThan(b.obj('lore')!.props!.sid);
    await b.accept('m_ueberlauf', 'mirelda');
    expect(b.char.quests.m_ueberlauf?.s).toBe('active');
    expect(b.cines).toContain('ch7');
    expect(b.char.flags.ch).toBe(7);
    // der Fremde steht jetzt am Brunnen
    await b.gotoNpc('fremder');
    b.close();
  });

  it('Kapitel 7 beginnt erst nach m_koenig', async () => {
    const b = await fresh('Kapitel');
    await b.accept('m_ueberlauf', 'mirelda');
    expect(b.char.quests.m_ueberlauf).toBeUndefined();
    // der Fremde ist noch nicht da: Gespräche mit ihm werden abgelehnt
    await b.gotoNpc('fremder');
    expect((await b.dlgOpen('fremder', 'fremder_brunnen')).err).toBe(1);
    await b.accept('m_erwachen', 'mirelda');
    expect(b.cines).toEqual(['ch1']);
    await b.dev('/akt2');
    await b.accept('m_ueberlauf', 'mirelda');
    expect(b.char.quests.m_ueberlauf?.s).toBe('active');
    expect(b.cines).toEqual(['ch1', 'ch7']);
    // Schreinquests gibt es erst in Kapitel 8
    b.send({ t: 'qAccept', id: 'h_erde', npc: 'mirelda' });
    await b.sleep(150);
    expect(b.char.quests.h_erde).toBeUndefined();
    b.close();
  });

  it('Dialog: ungültige, unerreichbare und zu weit entfernte Auswahl wird abgelehnt', async () => {
    const b = await fresh('Dialog', 'magier', '/akt2', '/quest m_ueberlauf', '/qa m_fremder');
    await b.gotoNpc('fremder');
    // ohne geöffnetes Gespräch
    expect((await b.dlgPick(2, { npc: 'fremder', topic: 'fremder_brunnen', node: 'start' })).err).toBe(1);
    // Thema eines anderen NPCs / Thema mit unerfüllter Bedingung
    expect((await b.dlgOpen('fremder', 'vael_siebte')).err).toBe(1);
    expect((await b.dlgOpen('fremder', 'gibt_es_nicht')).err).toBe(1);
    const open = await b.dlgOpen('fremder', 'fremder_brunnen');
    expect(open.node).toBe('start');
    // Option außerhalb des Bereichs, keine Ganzzahl, falscher Knoten
    expect((await b.dlgPick(99)).err).toBe(1);
    expect((await b.dlgPick(-1)).err).toBe(1);
    expect((await b.dlgPick(0.5 as number)).err).toBe(1);
    expect((await b.dlgPick(0, { node: 'brunnen' })).err).toBe(1);
    expect(b.char.flags['q:fremder']).toBeUndefined();
    // zu weit weg: das laufende Gespräch gilt nicht mehr
    await b.gotoNpc('mirelda');
    b.dlg = open;
    expect((await b.dlgPick(2)).err).toBe(1);
    expect((await b.dlgOpen('fremder', 'fremder_brunnen')).err).toBe(1);
    expect(b.char.flags['q:fremder']).toBeUndefined();
    // gültiger Weg: öffnen, „Was geschieht mit dem Brunnen?“
    await b.gotoNpc('fremder');
    await b.dlgOpen('fremder', 'fremder_brunnen');
    const r = await b.dlgPick(2);
    expect(r.node).toBe('brunnen');
    await b.sleep(120);
    expect(b.char.flags['q:fremder']).toBe(1);
    // Entscheidungsthema ohne laufende Quest
    await b.gotoNpc('borin');
    expect((await b.dlgOpen('borin', 'borin_kelda')).err).toBe(1);
    b.close();
  });

  it('Chronik: Fund setzt das Flag, löst eine Geheimquest aus und übersteht Abmelden', async () => {
    const b = await fresh('Chronik', 'waldlaeufer');
    const doc = b.obj('lore', 'kinderreim')!;
    expect(doc).toBeTruthy();
    // zu weit weg: nichts passiert
    b.send({ t: 'interact', id: doc.id });
    await b.sleep(150);
    expect(b.char.flags['l:kinderreim']).toBeUndefined();
    await readLore(b, 'kinderreim');
    expect(b.lores).toEqual(['kinderreim']);
    expect(b.events.some(e => e.k === 'obj' && e.id === doc.id && e.state === 1)).toBe(true);
    // Geheimquest durch ein Fundstück (im versteckten Hain)
    expect(b.char.quests.x_arm).toBeUndefined();
    await readLore(b, 'holzarm');
    expect(b.char.quests.x_arm?.s).toBe('active');
    expect(b.toasts.some(t => t.includes('Geheime Quest entdeckt'))).toBe(true);
    // bedingtes Dokument (Vaels Laterne) existiert für diesen Charakter nicht
    const lantern = b.obj('lore', 'vael_laterne')!;
    await b.warp(lantern.x, lantern.y + 14);
    await b.interact(lantern);
    expect(b.char.flags['l:vael_laterne']).toBeUndefined();
    // abmelden und neu laden
    const chars = b.waitFor('chars');
    b.send({ t: 'leave' });
    await chars;
    const e = b.waitFor('entered');
    b.send({ t: 'enter', id: b.chars[0].id });
    await e;
    expect(b.char.flags['l:kinderreim']).toBe(1);
    expect(b.char.flags['l:holzarm']).toBe(1);
    expect(b.char.quests.x_arm?.s).toBe('active');
    expect(b.obj('lore', 'kinderreim')!.state).toBe(1);
    b.close();
  });

  it('Entscheidung: wird im Dialog getroffen, ist endgültig und bleibt gespeichert', async () => {
    const b = await fresh('Entscheid', 'paladin', '/akt2', '/quest c_sen_1', '/qa c_sen_2');
    await b.tp('ruinen');
    await b.gotoNpc('sen');
    expect((await b.dlgOpen('sen', 'sen_antwort')).node).toBe('start');
    expect((await b.dlgPick(0)).node).toBe('c1');
    expect(b.char.flags['d:sen']).toBeUndefined(); // erst die Bestätigung entscheidet
    expect((await b.dlgPick(1)).node).toBe('start'); // „Ich überlege noch.“
    expect((await b.dlgPick(1)).node).toBe('c2');
    expect((await b.dlgPick(0)).node).toBe('d2');
    await b.sleep(120);
    expect(b.char.flags['d:sen']).toBe(2);
    // kein zweites Mal: Thema ist geschlossen
    expect((await b.dlgOpen('sen', 'sen_antwort')).err).toBe(1);
    await b.turnIn('c_sen_2', 'sen');
    expect(b.char.quests.c_sen_2.s).toBe('done');
    expect(b.toasts.some(t => t.includes('Wache bestätigt'))).toBe(true); // Zusatzbelohnung der Entscheidung
    const chars = b.waitFor('chars');
    b.send({ t: 'leave' });
    await chars;
    const e = b.waitFor('entered');
    b.send({ t: 'enter', id: b.chars[0].id });
    await e;
    expect(b.char.flags['d:sen']).toBe(2);
    b.close();
  });

  it('Verborgenes Ende: die dritte Antwort ist nur mit allen drei Voraussetzungen wählbar', async () => {
    const b = await fresh('Lied', 'schattenjaeger', '/akt2', '/quest m_albtraum', '/qa m_entscheidung', '/flag b:aetherion');
    await b.tp('herz');
    await b.dev('/npc aetherion');
    b.events.length = 0;
    expect((await b.dlgOpen('aetherion', 'aeth_frage')).node).toBe('start');
    expect((await b.dlgPick(2)).err).toBe(1); // „Das Lied vollenden“ – gesperrt
    expect(b.char.flags['d:ende']).toBeUndefined();
    await b.dev('/mem all'); await b.dev('/quest c_fenwick_3');
    await b.dlgOpen('aetherion', 'aeth_frage');
    expect((await b.dlgPick(2)).err).toBe(1); // Wiegenlied fehlt noch
    await b.dev('/quest x_wiegenlied');
    await b.dlgOpen('aetherion', 'aeth_frage');
    expect((await b.dlgPick(2)).node).toBe('c3');
    expect((await b.dlgPick(0)).node).toBe('d3');
    await b.sleep(120);
    expect(b.char.flags['d:ende']).toBe(3);
    const ap = b.char.attrPoints;
    b.send({ t: 'qTurnIn', id: 'm_entscheidung', npc: 'aetherion' });
    await b.sleep(250);
    expect(b.char.quests.m_entscheidung.s).toBe('done');
    expect(b.cines).toContain('ende3');
    expect(b.char.attrPoints).toBe(ap + 5);
    // wer die Prüfung bestanden hat, steht friedlich im Herzen: kein Kampf beginnt von selbst
    await b.sleep(600);
    expect(b.events.some(e => e.k === 'boss')).toBe(false);
    // Vael steht jetzt in Quellhain in der Sonne
    await b.tp('gruenwald');
    await b.gotoNpc('vael');
    expect((await b.dlgOpen('vael', 'vael_sonne')).node).toBe('start');
    b.close();
  });

  it('Vaels Prüfung: Er ergibt sich, stirbt nicht, die Quest geht weiter – und er bleibt friedlich', async () => {
    const b = await fresh('Wacht', 'krieger', '/akt2', '/quest m_spur', '/qa m_pruefung', '/god');
    await b.tp('wacht');
    const end = await bossFight(b);
    expect(end?.won).toBe(true);
    await b.sleep(300);
    const boss = [...b.mobs.values()].find(m => m.boss)!;
    expect(boss, 'Vael steht noch').toBeTruthy();
    expect(boss.mob).toBe('vael');
    expect(b.events.some(e => e.k === 'mob-' && e.died && e.id === end!.id)).toBe(false);
    expect(b.char.flags['b:vael']).toBe(1);
    expect(b.char.inv.some(i => i.base === 'q_wachzeichen')).toBe(true);
    expect(b.obj('chest') && [...b.objs.values()].some(o => o.type === 'chest' && o.props?.boss)).toBe(true);
    // Abgabe bei Vael selbst, mitten im Raum – ohne dass der Kampf neu beginnt
    b.events.length = 0;
    await b.turnIn('m_pruefung', 'vael');
    expect(b.char.quests.m_pruefung.s).toBe('done');
    await b.sleep(700);
    expect(b.events.some(e => e.k === 'boss')).toBe(false);
    // die siebte Erinnerung erzählt er selbst
    await b.dlgOpen('vael', 'vael_siebte');
    expect((await b.dlgPick(0)).node).toBe('mem');
    await b.sleep(120);
    expect(b.char.flags['h:dark']).toBe(1);
    expect(b.cines).toContain('mem_dark');
    // … und auf Wunsch gibt es eine weitere Runde
    await b.dlgOpen('vael', 'vael_nochmal');
    await b.dlgPick(0);
    for (let i = 0; i < 20 && !b.events.some(e => e.k === 'boss'); i++) await b.sleep(100);
    expect(b.events.some(e => e.k === 'boss')).toBe(true);
    b.close();
  });

  it('Geheimquests: Auslöser durch Ort und durch Gespräch', async () => {
    const b = await fresh('Geheim', 'magier', '/akt2', '/god', '/quest s_wisp');
    // Ort: der ausgekratzte Kreis am Krater – erst mit Rhunas Erinnerung
    await b.tp('glut');
    await visit(b, 'krater');
    await b.sleep(700);
    expect(b.char.quests.x_guss).toBeUndefined();
    await b.dev('/flag h:fire');
    await b.gotoNpc('rakhan');
    await b.sleep(700);
    await visit(b, 'krater');
    await b.sleep(700);
    expect(b.char.quests.x_guss?.s).toBe('active');
    await echo(b, await b.gotoObj('rift', 'guss'), 'guss');
    await b.turnIn('x_guss', 'rakhan');
    expect(b.char.quests.x_guss.s).toBe('done');
    // Gespräch: „Wo steckt eigentlich Karl?“
    await b.tp('kristall');
    await b.gotoNpc('hedda');
    await b.dlgOpen('hedda', 'hedda_karl');
    expect((await b.dlgPick(0)).node).toBeNull();
    await b.sleep(120);
    expect(b.char.quests.x_karl?.s).toBe('active');
    expect((await b.dlgOpen('hedda', 'hedda_karl')).err).toBe(1);
    // Ortsziel zählt auch, wenn die Quest erst beginnt, während man schon dort steht
    await b.tp('gruenwald');
    const w = placePos('weiher_bau');
    await b.warp(w.x, w.y + 12);
    await b.sleep(700);
    expect(b.char.flags['v:weiher_bau']).toBeUndefined();
    await b.dev('/qa c_ayla_2');
    for (let i = 0; i < 8 && !b.char.flags['v:weiher_bau']; i++) await b.sleep(200);
    expect(b.char.flags['v:weiher_bau']).toBe(1);
    b.close();
  });

  it('Mehrspieler: Echo zählt für alle Beteiligten; Filmszene schützt, bis sie endet – die Welt läuft weiter', async () => {
    const a = await fresh('Erste', 'krieger', '/akt2', '/god', '/qa m_ueberlauf');
    const b = await fresh('Zweite', 'magier', '/akt2', '/god', '/qa m_ueberlauf');
    const rift = await a.gotoObj('rift', 'woge1');
    await b.gotoObj('rift', 'woge1', 30);
    await a.interact(rift, 350);
    // die Welle ist für beide sichtbar und läuft weiter, auch wenn B gerade eine Filmszene sieht
    expect([...b.mobs.values()].some(m => m.mob === 'wogenling')).toBe(true);
    b.autoCine = false;
    await b.dev('/god');           // B ist jetzt verwundbar …
    await b.dev('/cine name', 400); // … aber als Zuschauer geschützt
    expect(b.cines).toContain('name');
    expect(b.flags & FLAG_INVULN).toBeTruthy();
    const hp = b.hp;
    await b.sleep(2500);
    expect(b.flags & FLAG_INVULN).toBeTruthy();
    expect(b.hp).toBeGreaterThanOrEqual(hp);
    expect([...b.mobs.values()].some(m => m.mob === 'wogenling'), 'die Welt pausiert nicht').toBe(true);
    b.send({ t: 'cineEnd', id: 'name' });
    await b.dev('/god');
    await b.sleep(1600);
    expect(b.flags & FLAG_INVULN).toBeFalsy();
    for (let i = 0; i < 12 && !a.char.flags['e:woge1']; i++) await a.dev('/kill', 200);
    await b.sleep(200);
    expect(a.char.flags['e:woge1']).toBe(1);
    expect(b.char.flags['e:woge1'], 'Mitspieler in der Nähe').toBe(1);
    a.close(); b.close();
  });

  it('Durchlauf: Hauptgeschichte von Kapitel 7 bis zum Epilog ohne Sackgasse', async () => {
    const b = await fresh('Durchlauf', 'krieger', '/akt2', '/god');
    const done = (id: string) => expect(b.char.quests[id]?.s, id).toBe('done');
    const active = (id: string) => expect(b.char.quests[id]?.s, id).toBe('active');

    // ---------------- Kapitel 7: Das falsche Lied
    await b.accept('m_ueberlauf', 'mirelda'); active('m_ueberlauf');
    for (const id of ['woge1', 'woge2', 'woge3']) await echo(b, await b.gotoObj('rift', id), id);
    await b.turnIn('m_ueberlauf', 'mirelda'); done('m_ueberlauf');
    await b.accept('m_fremder', 'mirelda');
    await b.gotoNpc('fremder');
    await b.dlgOpen('fremder', 'fremder_brunnen');
    await b.dlgPick(2);
    await b.turnIn('m_fremder', 'mirelda'); done('m_fremder');
    await b.accept('m_brunnenhueterin', 'mirelda');
    await readLore(b, 'brunnenbuch');
    await b.turnIn('m_brunnenhueterin', 'mirelda'); done('m_brunnenhueterin');
    await b.accept('m_name', 'fenwick'); active('m_name');
    await visit(b, 'weiher'); await visit(b, 'brunnen');
    await b.turnIn('m_name', 'fenwick'); done('m_name');
    expect(b.cines).toContain('name');

    // ---------------- Kapitel 8: Die sieben Sitze
    await b.accept('m_sitze', 'fremder'); active('m_sitze');
    expect(b.cines).toContain('ch8');
    await shrine(b, 'earth', 'h_erde', 'mirelda');
    await b.tp('kristall'); await shrine(b, 'light', 'h_licht', 'hedda');
    await b.tp('glut'); await shrine(b, 'fire', 'h_feuer', 'rakhan');
    await b.tp('gruenwald');
    await b.turnIn('m_sitze', 'fremder'); done('m_sitze');
    await b.accept('m_leerer_sitz', 'fremder');
    await b.tp('ruinen');
    await b.gotoNpc('sen');
    expect((await b.dlgOpen('sen', 'sen_sitz')).node).toBe('start');
    await b.sleep(120);
    await b.tp('schatten');
    await b.turnIn('m_leerer_sitz', 'maelis'); done('m_leerer_sitz');

    // ---------------- Kapitel 9: Der Wächter am Grund
    await b.accept('m_traum', 'maelis'); active('m_traum');
    expect(b.cines).toContain('ch9');
    await b.gotoNpc('vael');
    await b.dlgOpen('vael', 'vael_geschichte');
    expect(b.cines).toContain('vael');
    expect((await b.dlgPick(1)).node).toBe('freund');
    expect((await b.dlgPick(0)).node).toBe('zeuge');
    expect((await b.dlgPick(0)).node).toBe('erwachen');
    await b.turnIn('m_traum', 'vael'); done('m_traum');
    await b.accept('m_spur', 'vael');
    await readLore(b, 'spur_schaukel'); await readLore(b, 'spur_bett');
    await echo(b, await b.gotoObj('rift', 'albtraum1'), 'albtraum1');
    await b.turnIn('m_spur', 'vael'); done('m_spur');
    await b.accept('m_pruefung', 'vael');
    await through(b, 'exit', 'wacht');
    expect(b.zone).toBe('wacht');
    expect((await bossFight(b))?.won).toBe(true);
    await b.turnIn('m_pruefung', 'vael'); done('m_pruefung');

    // ---------------- Kapitel 10: Das Herz der Quelle
    await b.accept('m_abstieg', 'vael'); active('m_abstieg');
    expect(b.cines).toContain('ch10');
    await b.tp('gruenwald');
    await through(b, 'exit', 'brunnen', true);
    expect(b.zone).toBe('quellgrund');
    await visit(b, 'grund');
    await b.turnIn('m_abstieg', 'vael'); done('m_abstieg');
    await b.accept('m_tor', 'vael');
    await b.dev('/item q_traumscherbe 5');
    await echo(b, await b.gotoObj('rift', 'stille1'), 'stille1');
    await b.turnIn('m_tor', 'vael'); done('m_tor');
    expect(b.char.inv.some(i => i.base === 'q_traumscherbe')).toBe(false);
    await b.accept('m_albtraum', 'vael');
    await through(b, 'exit', 'herz');
    expect(b.zone).toBe('herz');
    expect((await bossFight(b))?.won).toBe(true);
    expect(b.cines).toContain('erwachen');
    expect([...b.mobs.values()].some(m => m.boss && m.mob === 'aetherion'), 'Aetherion bleibt').toBe(true);
    await b.dev('/npc aetherion');
    b.send({ t: 'qTurnIn', id: 'm_albtraum', npc: 'aetherion' }); await b.sleep(250); done('m_albtraum');
    b.send({ t: 'qAccept', id: 'm_entscheidung', npc: 'aetherion' }); await b.sleep(150); active('m_entscheidung');
    await b.dlgOpen('aetherion', 'aeth_frage');
    expect((await b.dlgPick(1)).node).toBe('c2');
    expect((await b.dlgPick(0)).node).toBe('d2');
    b.send({ t: 'qTurnIn', id: 'm_entscheidung', npc: 'aetherion' }); await b.sleep(250); done('m_entscheidung');
    expect(b.cines).toContain('ende2');

    // ---------------- Epilog
    await b.tp('gruenwald');
    await b.accept('m_epilog', 'mirelda'); active('m_epilog');
    await visit(b, 'heimkehr');
    await b.turnIn('m_epilog', 'mirelda'); done('m_epilog');
    expect(b.cines).toContain('epilog');
    expect(b.char.flags.ch).toBe(11);
    expect(chapterOf(b.char)).toBe(11);
    // Vaels Schicksal nach „Befreien“: Er ist fort; am Brunnen liegt sein Zettel
    await readLore(b, 'vael_laterne');
    expect((await b.dlgOpen('vael', 'vael_wetter')).err).toBe(1);
    b.close();
  }, 180000);

  it('Durchlauf: alle Hüterschreine, Charakterquests und Geheimquests sind abschließbar', async () => {
    const b = await fresh('Nebenwege', 'paladin', '/akt2', '/god', '/quest m_ueberlauf', '/quest m_fremder', '/quest m_brunnenhueterin', '/quest m_name', '/qa m_sitze',
      '/quest s_tobi', '/quest s_woelfe', '/quest s_wisp', '/quest s_splitter3');
    const done = (id: string) => expect(b.char.quests[id]?.s, id).toBe('done');
    const run = async (id: string, giver: string, work: () => Promise<void>, turnIn = giver) => {
      await b.accept(id, giver);
      expect(b.char.quests[id]?.s, id + ' angenommen').toBe('active');
      await work();
      await b.turnIn(id, turnIn);
      done(id);
    };
    /** Thema öffnen und der Reihe nach Optionen wählen */
    const talk = async (npc: string, topic: string, ...picks: number[]) => {
      await b.gotoNpc(npc);
      expect((await b.dlgOpen(npc, topic)).node, `${npc}/${topic}`).toBe('start');
      for (const o of picks) expect((await b.dlgPick(o)).err, `${topic} Option ${o}`).toBeUndefined();
      await b.sleep(120);
    };
    const inZone = async (zone: string, back: string, work: () => Promise<void>) => { await b.tp(zone); await work(); await b.tp(back); };

    // ---------------- Grünwald
    await run('c_mirelda_1', 'mirelda', () => b.dev('/item mat_herb 5'));
    await run('c_mirelda_2', 'mirelda', () => talk('borin', 'borin_brief', 0));
    await b.dev('/lore kinderreim'); await b.dev('/lore oda_kerben'); await b.dev('/lore holzfaeller'); await b.dev('/lore kaspian_linse');
    await b.dev('/lore spiegelsee'); await b.dev('/lore grubenlied'); await b.dev('/lore guenther'); await b.dev('/lore geode_messung');
    await run('c_fenwick_1', 'fenwick', async () => {});
    await b.accept('c_fenwick_2', 'fenwick');
    await run('c_tobi_1', 'tobi', async () => { await b.gotoNpc('wache'); b.send({ t: 'talk', npc: 'wache' }); await b.dev('/item mat_wood 2'); });
    await run('c_tobi_2', 'tobi', () => talk('borin', 'borin_schwert'));
    await run('c_ayla_1', 'ayla', async () => echo(b, await b.gotoObj('rift', 'graue'), 'graue'));
    await run('c_ayla_2', 'ayla', () => visit(b, 'weiher_bau'));
    await readLore(b, 'holzarm');
    await talk('borin', 'borin_arm');
    await b.turnIn('x_arm', 'tobi'); done('x_arm');
    await shrine(b, 'earth', 'h_erde', 'mirelda');
    await b.accept('c_borin_1', 'borin');

    // ---------------- Kristallhöhlen
    await b.tp('kristall');
    await shrine(b, 'light', 'h_licht', 'hedda');
    await run('c_hedda_1', 'hedda', async () => { await visit(b, 'stollen7'); await readLore(b, 'henrik_lampe'); });
    await run('c_hedda_2', 'hedda', async () => { await talk('pim', 'pim_stollen', 0); await talk('hedda', 'hedda_stollen', 0, 0); expect(b.char.flags['d:hedda']).toBe(1); });
    await talk('hedda', 'hedda_karl', 0);
    await visit(b, 'karl');
    for (let i = 0; i < 10 && (b.char.quests.x_karl?.p[1] ?? 0) < 3; i++) {
      const m = [...b.mobs.values()].filter(x => x.mob === 'glimmerwisp').sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y))[0];
      if (!m) break;
      await b.warp(m.x + 14, m.y); await b.dev('/kill', 250);
    }
    await b.turnIn('x_karl', 'hedda'); done('x_karl');
    await visit(b, 'klang_halle');

    // ---------------- Glutlande
    await b.tp('glut');
    await shrine(b, 'fire', 'h_feuer', 'rakhan');
    await run('c_rakhan_1', 'rakhan', async () => { await visit(b, 'feld'); await inZone('aschenschmiede', 'glut', () => readLore(b, 'kharrad')); });
    await run('c_rakhan_2', 'rakhan', async () => { await talk('rakhan', 'rakhan_rat', 1, 0); expect(b.char.flags['d:rakhan']).toBe(2); });
    await visit(b, 'krater'); await b.sleep(600);
    expect(b.char.quests.x_guss?.s).toBe('active');
    await echo(b, await b.gotoObj('rift', 'guss'), 'guss');
    await b.turnIn('x_guss', 'rakhan'); done('x_guss');
    await talk('kelda', 'kelda_borin', 0);
    expect(b.char.inv.some(i => i.base === 'q_hammer')).toBe(true);

    // ---------------- Borin und Kelda (Grünwald ↔ Glutlande)
    await b.tp('gruenwald');
    await b.turnIn('c_borin_1', 'borin'); done('c_borin_1');
    await run('c_borin_2', 'borin', async () => { await talk('borin', 'borin_kelda', 0, 0); expect(b.char.flags['d:borin']).toBe(1); expect(b.char.inv.some(i => i.base === 'q_hammer')).toBe(false); });
    await run('c_borin_3', 'borin', () => inZone('glut', 'gruenwald', () => talk('kelda', 'kelda_antwort', 0)));

    // ---------------- Frostgebirge
    await b.tp('frost');
    await shrine(b, 'water', 'h_wasser', 'jorund');
    await run('c_jorund_1', 'jorund', () => inZone('gletscherdom', 'frost', () => readLore(b, 'ysolde_faden')));
    await run('c_jorund_2', 'jorund', async () => { await talk('inga', 'inga_wette', 0); await visit(b, 'see_tau'); });
    await visit(b, 'klang_see');
    await readLore(b, 'ton1');
    expect(b.char.quests.x_wiegenlied?.s).toBe('active');
    await readLore(b, 'zeile2');
    expect(b.char.quests.x_seite?.s).toBe('active');

    // ---------------- Verlorene Ruinen
    await b.tp('ruinen');
    await shrine(b, 'wind', 'h_wind', 'liora');
    await run('c_liora_1', 'liora', async () => {});
    await run('c_liora_2', 'liora', async () => { await talk('liora', 'liora_manuskript', 0, 0); expect(b.char.flags['d:liora']).toBe(1); });
    await run('c_sen_1', 'sen', () => readLore(b, 'dienstplan'));
    await run('c_sen_2', 'sen', async () => { await talk('sen', 'sen_antwort', 0, 0); expect(b.char.flags['d:sen']).toBe(1); });
    await readLore(b, 'ton2'); await readLore(b, 'zeile1');
    await inZone('archiv', 'ruinen', () => readLore(b, 'protokoll'));
    await b.turnIn('x_seite', 'liora'); done('x_seite');

    // ---------------- Schattenreich und Quellgrund
    await b.tp('schatten');
    await shrine(b, 'heart', 'h_herz', 'maelis');
    await readLore(b, 'ton3');
    await visit(b, 'klang_traum');
    await inZone('quellgrund', 'schatten', () => readLore(b, 'ton4'));
    await b.turnIn('x_wiegenlied', 'maelis'); done('x_wiegenlied');

    // ---------------- Fenwicks Lied
    await b.tp('gruenwald');
    await b.turnIn('c_fenwick_2', 'fenwick'); done('c_fenwick_2');
    await run('c_fenwick_3', 'fenwick', () => visit(b, 'brunnen_lied'));

    // Alles, was eine Questreihe trägt, ist abgeschlossen; mit Vaels Erinnerung wäre das verborgene Ende offen
    for (const q of QUEST_LIST) if (q.line) done(q.id);
    expect(MEMORY_KEYS.filter(k => b.char.flags['h:' + k]).length).toBe(6);
    expect(condOk(b.char, LIED_COND)).toBe(false);
    b.char.flags['h:dark'] = 1;
    expect(condOk(b.char, LIED_COND)).toBe(true);
    b.close();
  }, 240000);
});
