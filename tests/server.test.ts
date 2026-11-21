/** Integrationstests gegen einen echten Serverprozess: Protokoll, Kampf, Mehrspieler, Persistenz. */
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Db, sanitizeChar } from '../server/src/db';
import { newCharacter } from '../shared/src/stats';
import { Bot } from './helpers/bot';

const PORT = 7800 + Math.floor(Math.random() * 150);
const URL = `ws://127.0.0.1:${PORT}/ws`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'em-test-'));
let proc: ChildProcess;

async function startServer() {
  proc = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', '--import', 'tsx', 'server/src/index.ts'], { env: { ...process.env, EM_PORT: String(PORT), EM_DATA: dataDir, EM_DEV: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  proc.stdout!.on('data', d => (out += d)); proc.stderr!.on('data', d => (out += d));
  for (let i = 0; i < 100; i++) { if (out.includes('läuft')) return; await new Promise(r => setTimeout(r, 100)); }
  throw new Error('Server startet nicht:\n' + out);
}
async function stopServer() {
  proc.kill('SIGINT');
  await new Promise(r => proc.once('exit', r));
}
beforeAll(startServer);
afterAll(async () => { await stopServer(); fs.rmSync(dataDir, { recursive: true, force: true }); });

describe('Server', () => {
  it('liefert Serverinfo per HTTP', async () => {
    const r = await fetch(`http://127.0.0.1:${PORT}/api/info`);
    const j = await r.json();
    expect(j.port).toBe(PORT);
    expect(j.addresses.length).toBeGreaterThan(0);
  });

  it('Charakter erstellen, kämpfen, Beute und XP erhalten', async () => {
    const b = new Bot(URL, 'Kampf');
    await b.connect();
    await b.createAndEnter('krieger', 'Kampfhahn');
    expect(b.zone).toBe('gruenwald');
    expect(b.mobs.size).toBeGreaterThan(20);
    b.chat('/lvl 4');
    await b.sleep(200);
    const m = b.nearestMob()!;
    b.chat(`/goto ${m.x + 18} ${m.y}`);
    await b.waitFor('pos');
    const killed = await b.fight(20000);
    expect(killed).toBe(true);
    await b.sleep(300);
    expect(b.char.kills).toBeGreaterThanOrEqual(1);
    expect(b.char.xp).toBeGreaterThan(0);
    expect(b.events.some(e => e.k === 'dmg' && !e.pl)).toBe(true);
    b.close();
  });

  it('weist Teleport-Schummeln und Laufen durch Wände zurück', async () => {
    const b = new Bot(URL, 'Hack');
    await b.connect();
    await b.createAndEnter('magier', 'Schummler');
    const x0 = b.x, y0 = b.y;
    const w = b.waitFor('pos');
    b.send({ t: 'm', x: x0 + 400, y: y0, f: 0, e: b.epoch, mv: 1 });
    const pos = await w;
    expect(Math.hypot(pos.x - x0, pos.y - y0)).toBeLessThan(2);
    // Angriffe schneller als die Abklingzeit bringen nichts
    b.events.length = 0;
    for (let i = 0; i < 20; i++) b.send({ t: 'atk', ang: 0 });
    await b.sleep(400);
    expect(b.events.filter(e => e.k === 'atk').length).toBeLessThanOrEqual(2);
    // unbekannte Fähigkeit / fremde Klasse
    b.send({ t: 'skill', id: 'kr_wucht', ang: 0, tx: 0, ty: 0 });
    await b.sleep(150);
    expect(b.events.some(e => e.k === 'cast' && e.skill === 'kr_wucht')).toBe(false);
    b.close();
  });

  it('Mehrspieler: Spieler sehen sich, Gruppe bilden, gemeinsame Kill-Wertung', async () => {
    const a = new Bot(URL, 'Anna'), b = new Bot(URL, 'Bert');
    await a.connect(); await b.connect();
    await a.createAndEnter('paladin', 'Annabell');
    await b.createAndEnter('waldlaeufer', 'Bertram');
    await a.sleep(300);
    expect(a.players.has(b.me)).toBe(true);
    expect(b.players.has(a.me)).toBe(true);
    const inv = b.waitFor('party', 3000, m => !!m.invite);
    a.send({ t: 'party', a: 'invite', id: b.me });
    await inv;
    const joined = a.waitFor('party', 3000, m => m.members.length === 2);
    b.send({ t: 'party', a: 'accept' });
    await joined;
    // B bewegt sich, A sieht die neue Position
    await b.walkTo(b.x + 30, b.y, 2000);
    await a.sleep(200);
    expect(Math.abs(a.players.get(b.me)!.x - b.x)).toBeLessThan(6);
    // A tötet einen Gegner neben B → beide bekommen die Wertung
    a.chat('/lvl 6'); await a.sleep(150);
    const m = a.nearestMob()!;
    a.chat(`/goto ${m.x + 18} ${m.y}`); b.chat(`/goto ${m.x + 40} ${m.y}`);
    await a.waitFor('pos');
    a.chat('/god'); b.chat('/god');
    expect(await a.fight(20000)).toBe(true);
    await a.sleep(400);
    expect(a.char.kills).toBeGreaterThanOrEqual(1);
    expect(b.char.kills).toBeGreaterThanOrEqual(1);
    expect(b.char.xp).toBeGreaterThan(0);
    a.close(); b.close();
  });

  it('Speichern: Fortschritt übersteht Abmelden und Server-Neustart; Wiederverbindung innerhalb der Schonfrist', async () => {
    const b = new Bot(URL, 'Save');
    await b.connect();
    await b.createAndEnter('schattenjaeger', 'Sparfuchs');
    b.chat('/lvl 7'); b.chat('/gold 1234'); b.chat('/gear 2');
    await b.sleep(300);
    expect(b.char.level).toBe(7);
    const gold = b.char.gold, inv = b.char.inv.length;
    const gear = b.char.inv.find(i => i.base.startsWith('w_'))!;
    b.send({ t: 'equip', uid: gear.uid });
    b.send({ t: 'attr', a: 'dex', n: 5 });
    await b.sleep(200);
    expect(b.char.equip.weapon!.uid).toBe(gear.uid);
    const saved = b.waitFor('saved');
    b.send({ t: 'save' });
    await saved;
    // Verbindungsabbruch → sofortige Wiederverbindung setzt die Sitzung fort
    b.close();
    await b.sleep(200);
    const b2 = new Bot(URL, 'Save', b.token);
    const entered = b2.waitFor('entered');
    await b2.connect();
    await entered;
    expect(b2.char.level).toBe(7);
    b2.close();
    // Server-Neustart
    await stopServer();
    await startServer();
    const b3 = new Bot(URL, 'Save', b.token);
    await b3.connect();
    expect(b3.chars[0].level).toBe(7);
    await b3.createAndEnter('schattenjaeger');
    expect(b3.char.gold).toBe(gold);
    expect(b3.char.equip.weapon!.uid).toBe(gear.uid);
    expect(b3.char.inv.length).toBe(inv);
    expect(b3.char.attrs.dex).toBeGreaterThan(12);
    b3.close();
    expect(fs.readdirSync(path.join(dataDir, 'backups')).length).toBeGreaterThan(0);
  });

  it('Quest annehmen, erfüllen und abgeben; Handel und Verbesserung', async () => {
    const b = new Bot(URL, 'Quest');
    await b.connect();
    await b.createAndEnter('krieger', 'Questerich');
    await b.gotoNpc('mirelda');
    b.send({ t: 'qAccept', id: 'm_erwachen', npc: 'mirelda' });
    await b.sleep(200);
    expect(b.char.quests.m_erwachen?.s).toBe('active');
    b.chat('/lvl 8'); b.chat('/god'); b.chat('/gold 5000'); b.chat('/item mat_wood 20');
    await b.sleep(200);
    for (let n = 0; n < 5; n++) {
      const m = [...b.mobs.values()].filter(x => x.mob === 'moosling').sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y))[0];
      b.chat(`/goto ${m.x + 16} ${m.y}`);
      await b.waitFor('pos');
      b.chat('/kill');
      await b.sleep(250);
    }
    expect(b.char.quests.m_erwachen.p[0]).toBeGreaterThanOrEqual(5);
    await b.gotoNpc('mirelda');
    const xp = b.char.xp, lvl = b.char.level;
    b.send({ t: 'qTurnIn', id: 'm_erwachen', npc: 'mirelda' });
    await b.sleep(250);
    expect(b.char.quests.m_erwachen.s).toBe('done');
    expect(b.char.level * 1e6 + b.char.xp).toBeGreaterThan(lvl * 1e6 + xp);
    // Kaufen bei Sella, Verbessern bei Borin
    await b.gotoNpc('sella');
    const before = b.char.gold;
    b.send({ t: 'buy', npc: 'sella', idx: 0, qty: 3 });
    await b.sleep(150);
    expect(b.char.gold).toBeLessThan(before);
    await b.gotoNpc('borin');
    const w = b.char.equip.weapon!;
    b.send({ t: 'upgrade', uid: w.uid, npc: 'borin' });
    await b.sleep(150);
    expect(b.char.equip.weapon!.up).toBe(1);
    // weit entfernte NPCs werden abgelehnt
    b.send({ t: 'buy', npc: 'inga', idx: 0, qty: 1 });
    const g = b.char.gold;
    await b.sleep(150);
    expect(b.char.gold).toBe(g);
    b.close();
  });

  it('Dungeon: Boss startet, skaliert und kann besiegt werden; Siegel und Belohnungstruhe', async () => {
    const b = new Bot(URL, 'Boss');
    await b.connect();
    await b.createAndEnter('magier', 'Bossbezwinger');
    b.chat('/lvl 10'); b.chat('/god');
    const z = b.waitFor('zone');
    b.chat('/tp wurzelgruft');
    await z;
    expect(b.zone).toBe('wurzelgruft');
    b.chat('/boss');
    await b.waitFor('pos');
    await b.sleep(600);
    expect(b.events.some(e => e.k === 'boss')).toBe(true);
    for (let i = 0; i < 12 && !b.events.some(e => e.k === 'bossend'); i++) { b.chat('/kill'); await b.sleep(250); }
    const end = b.events.find(e => e.k === 'bossend') as any;
    expect(end?.won).toBe(true);
    await b.sleep(300);
    expect(b.char.inv.some(i => i.base === 'seal_earth')).toBe(true);
    expect(b.char.flags['b:dornenmutter']).toBe(1);
    const chest = [...b.objs.values()].find(o => o.type === 'chest' && o.props?.boss)!;
    expect(chest).toBeTruthy();
    b.chat(`/goto ${chest.x} ${chest.y + 14}`);
    await b.waitFor('pos');
    const n = b.char.inv.length;
    b.send({ t: 'interact', id: chest.id });
    await b.sleep(300);
    expect(b.char.inv.length).toBeGreaterThan(n);
    b.close();
  });
});

describe('Spielstand-Schutz', () => {
  it('repariert unvollständige Daten und fällt bei beschädigtem Stand auf einen Snapshot zurück', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'em-db-'));
    const db = new Db(dir);
    const acc = db.account('abcdefghijklmnop1234', 'X');
    const c = newCharacter('Heil', 'paladin');
    c.level = 9; c.gold = 77;
    const id = db.createChar(acc.id, 0, c);
    db.saveChar(id, c); // legt auch einen Snapshot an
    db.db.prepare("UPDATE characters SET data = '{kaputt' WHERE id = ?").run(id);
    const loaded = db.loadChar(acc.id, id)!;
    expect(loaded.level).toBe(9);
    expect(loaded.gold).toBe(77);
    const fixed = sanitizeChar({ name: 'A', cls: 'magier', level: 9999, gold: -5, inv: [{ base: 'gibtsnicht', uid: 'x' }], zone: 'nirgendwo' })!;
    expect(fixed.level).toBe(40);
    expect(fixed.gold).toBe(0);
    expect(fixed.inv.length).toBe(0);
    expect(fixed.zone).toBe('gruenwald');
    expect(sanitizeChar({ name: 'A', cls: 'unsinn' })).toBeNull();
    const file = db.backup('test');
    expect(fs.existsSync(file)).toBe(true);
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
