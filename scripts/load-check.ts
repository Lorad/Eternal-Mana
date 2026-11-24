/**
 * Lastprobe: ~12 Bots laufen und kämpfen eine Minute lang in derselben Zone; gemessen werden die Dauer eines Server-Takts
 * und die Größe der Snapshots. Der Server läuft in diesem Prozess (echte WebSockets), die Bots in einem Kindprozess,
 * damit ihr JSON-Aufwand die Messung nicht verfälscht.
 *
 *   npx tsx scripts/load-check.ts [bots=12] [sekunden=60] [--solo]
 *
 * Ohne `--solo` bilden die Bots Vierergruppen (Gruppenwertung, Gruppenanzeige). Ausgabe: eine Tabelle und eine JSON-Zeile.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.EM_DEV = '1';
const args = process.argv.slice(2);
const flag = (n: string) => args.includes('--' + n);
const nums = args.filter(a => /^\d+$/.test(a)).map(Number);
const BOTS = nums[0] ?? 12, SECS = nums[1] ?? 60;
const CLASSES = ['krieger', 'magier', 'waldlaeufer', 'paladin', 'schattenjaeger'] as const;

if (flag('bots')) await runBots(args[args.indexOf('--bots') + 1]);
else await runServer();

// =====================================================================================================================
async function runServer() {
  const { WebSocketServer } = await import('ws');
  const { Db } = await import('../server/src/db');
  const { Game } = await import('../server/src/game');
  const { CFG } = await import('../shared/src/config');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'em-last-'));
  const db = new Db(dir);
  const port = 7900 + Math.floor(Math.random() * 90);
  const game = new Game(db, { name: 'last', version: CFG.version, port, addresses: [], tailscale: { available: false } });

  // ---- Messpunkte: Taktdauer (synchron um Game.tick) und Bytes je Nachricht (um Game.send)
  let measuring = false;
  const ticks: number[] = [], snaps: number[] = [];
  let bytes = 0, msgs = 0, otherBytes = 0;
  const g = game as any;
  const tick0 = g.tick.bind(game);
  g.tick = (dt: number) => { const t = performance.now(); tick0(dt); if (measuring) ticks.push(performance.now() - t); };
  const sizeOf = (m: any) => { const n = JSON.stringify(m).length; if (measuring) { bytes += n; msgs++; if (m.t === 's') snaps.push(n); else otherBytes += n; } };
  const send0 = game.send.bind(game);
  game.send = (s, m) => { sizeOf(m); send0(s, m); };

  const server = http.createServer((_q, r) => { r.writeHead(404); r.end(); });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
  server.on('upgrade', (req, socket, head) => wss.handleUpgrade(req, socket, head, ws => {
    const s = game.onConnect(ws);
    ws.on('message', d => game.onMessage(s, d.toString()));
    ws.on('close', () => game.onClose(s));
    ws.on('error', () => {});
  }));
  await new Promise<void>(res => server.listen(port, '127.0.0.1', res));
  game.start();

  const child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', '--import', 'tsx', fileURLToPath(import.meta.url), String(BOTS), String(SECS), ...(flag('solo') ? ['--solo'] : []), '--bots', `ws://127.0.0.1:${port}/ws`],
    { stdio: ['ignore', 'pipe', 'inherit'], env: process.env });
  let botOut = '';
  child.stdout.on('data', d => {
    botOut += d;
    if (!measuring && botOut.includes('BEREIT')) { measuring = true; setTimeout(() => { measuring = false; }, SECS * 1000); }
  });
  await new Promise(res => child.once('exit', res));

  const q = (a: number[], p: number) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const zones = [...game.zones.values()].filter(z => z.players.size);
  const res = {
    bots: BOTS, sekunden: SECS, gruppen: !flag('solo'),
    takt_ms: { mittel: r2(avg(ticks)), p50: r2(q(ticks, 0.5)), p95: r2(q(ticks, 0.95)), p99: r2(q(ticks, 0.99)), max: r2(Math.max(0, ...ticks)), anzahl: ticks.length },
    snapshot_bytes: { mittel: Math.round(avg(snaps)), p95: q(snaps, 0.95), max: Math.max(0, ...snaps), anzahl: snaps.length },
    je_client_kB_s: r2(bytes / 1024 / SECS / BOTS), sonstige_kB_s: r2(otherBytes / 1024 / SECS / BOTS), nachrichten_s: Math.round(msgs / SECS),
    zonen: zones.map(z => `${z.key}: ${z.players.size} Spieler, ${[...z.mobs.values()].filter(m => m.awake).length} wache Gegner`),
    bots_bericht: botOut.split('\n').filter(l => l.startsWith('BOTS ')).map(l => l.slice(5)).join(' | '),
  };
  console.log('\nLastprobe – ' + BOTS + ' Bots, ' + SECS + ' s' + (flag('solo') ? ', ohne Gruppen' : ', in Vierergruppen'));
  console.log(`  Server-Takt:   Mittel ${res.takt_ms.mittel} ms · p50 ${res.takt_ms.p50} · p95 ${res.takt_ms.p95} · p99 ${res.takt_ms.p99} · max ${res.takt_ms.max} ms  (Budget ${1000 / CFG.net.tickRate} ms, ${res.takt_ms.anzahl} Takte)`);
  console.log(`  Snapshot:      Mittel ${res.snapshot_bytes.mittel} B · p95 ${res.snapshot_bytes.p95} B · max ${res.snapshot_bytes.max} B`);
  console.log(`  Datenmenge:    ${res.je_client_kB_s} kB/s je Client (davon ${res.sonstige_kB_s} kB/s außerhalb der Snapshots), ${res.nachrichten_s} Nachrichten/s gesamt`);
  console.log('  ' + res.zonen.join('; '));
  console.log('  ' + res.bots_bericht);
  console.log('JSON ' + JSON.stringify(res));
  game.stop(); db.close(); server.close();
  fs.rmSync(dir, { recursive: true, force: true });
  setTimeout(() => process.exit(0), 100);
}

// =====================================================================================================================
async function runBots(url: string) {
  const { Bot } = await import('../tests/helpers/bot');
  const { SKILLS } = await import('../shared/src/data/skills');
  const tag = Math.random().toString(36).replace(/[^a-z]/g, '').slice(0, 4).padEnd(4, 'x');
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const bots = await Promise.all(Array.from({ length: BOTS }, async (_, i) => {
    const b = new Bot(url, 'Last' + i);
    await b.connect();
    await b.createAndEnter(CLASSES[i % CLASSES.length], `Last${tag}${letters[i % 26]}`);
    return b;
  }));
  for (const b of bots) { b.chat('/lvl 5'); b.chat('/welt aus'); }
  await bots[0].sleep(400);
  // Sammelpunkt: die Gegnergruppe, die dem Start am nächsten liegt – alle kämpfen im selben Gebiet
  const m0 = bots[0].nearestMob()!;
  await Promise.all(bots.map((b, i) => b.warp(m0.x + 30 * Math.cos(i), m0.y + 30 * Math.sin(i)).catch(() => {})));
  if (!flag('solo')) {
    for (let i = 0; i < bots.length; i += 4) {
      const lead = bots[i];
      for (const m of bots.slice(i + 1, i + 4)) { lead.send({ t: 'party', a: 'invite', id: m.me }); await lead.sleep(60); m.send({ t: 'party', a: 'accept' }); await lead.sleep(60); }
    }
  }
  console.log('BEREIT');
  const until = Date.now() + SECS * 1000;
  let kills = 0, deaths = 0, casts = 0;
  await Promise.all(bots.map(async (b, i) => {
    let castAt = 0;
    while (Date.now() < until) {
      if (b.dead) { deaths++; b.send({ t: 'respawn' }); await b.sleep(400); await b.warp(m0.x + 40 * Math.cos(i), m0.y + 40 * Math.sin(i)).catch(() => {}); continue; }
      // Ziel: der nächste Gegner der ganzen Zone – ist das Umfeld leergeräumt, zieht die Meute gemeinsam weiter
      const t = b.nearestMob();
      if (!t) { await b.walkTo(m0.x + 160 * Math.cos(i + Date.now() / 5000), m0.y + 160 * Math.sin(i + Date.now() / 5000), 600, 10); continue; }
      const d = Math.hypot(t.x - b.x, t.y - b.y), ang = Math.atan2(t.y - b.y, t.x - b.x);
      if (d > 320) { await b.warp(t.x + 40 * Math.cos(i), t.y + 40 * Math.sin(i)).catch(() => {}); continue; }
      if (d > 26) {
        // echtes Laufen in 4-px-Schritten (20 Meldungen je Sekunde); steckt der Bot fest, hilft ein Dev-Sprung
        const x0 = b.x, y0 = b.y;
        await b.walkTo(t.x, t.y, 500, 22);
        if (Math.hypot(b.x - x0, b.y - y0) < 4) await b.warp(t.x + 16, t.y).catch(() => {});
        continue;
      }
      b.send({ t: 'atk', ang });
      if (Date.now() > castAt) {
        castAt = Date.now() + 2500;
        const sk = b.char.hotbar.find(id => id && SKILLS[id]);
        if (sk) { b.send({ t: 'skill', id: sk, ang, tx: t.x, ty: t.y }); casts++; }
      }
      const had = b.mobs.has(t.id);
      await b.sleep(140);
      if (had && !b.mobs.has(t.id)) kills++;
    }
  }));
  console.log(`BOTS Gegner besiegt (gezählt je Bot): ${kills}, Tode: ${deaths}, Fähigkeiten: ${casts}, Stufe am Ende: ${bots.map(b => b.char.level).join('/')}`);
  for (const b of bots) b.close();
  await new Promise(r => setTimeout(r, 300));
  process.exit(0);
}
