/**
 * Eternal Mana – Spielserver.
 * Ein einziger Prozess liefert den gebauten Client (HTTP) aus und betreibt die Spielwelt (WebSocket unter /ws).
 * Er lauscht auf allen Schnittstellen, damit Freunde über das private Tailscale-Netz beitreten können.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { CFG } from '../../shared/src/config';
import type { ServerInfo } from '../../shared/src/types';
import { Db } from './db';
import { Game } from './game';
import { detectAddresses } from './tailscale';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let cfg = { name: 'Eternal Mana', port: CFG.net.defaultPort, host: '0.0.0.0', dataDir: 'data' };
try { cfg = { ...cfg, ...JSON.parse(fs.readFileSync(path.join(root, 'config/server.json'), 'utf8')) }; } catch { /* Standardwerte */ }
const port = Number(process.env.EM_PORT ?? cfg.port);
const host = process.env.EM_HOST ?? cfg.host;
const dataDir = path.resolve(root, process.env.EM_DATA ?? cfg.dataDir);
const dist = path.join(root, 'client/dist');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.map': 'application/json', '.txt': 'text/plain; charset=utf-8',
};

async function main() {
  const db = new Db(dataDir);
  if (fs.statSync(db.file).size > 8192) { try { console.log('[backup] Start-Backup:', path.basename(db.backup('auto'))); } catch (e) { console.error('[backup] fehlgeschlagen:', e); } }
  const net = await detectAddresses(port);
  const info: ServerInfo = { name: cfg.name, version: CFG.version, port, ...net };
  const game = new Game(db, info);

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    if (url.pathname === '/api/info') {
      res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ ...info, online: game.onlineCount() }));
      return;
    }
    if (!fs.existsSync(dist)) {
      res.writeHead(503, { 'content-type': 'text/html; charset=utf-8' });
      res.end('<h1>Eternal Mana</h1><p>Der Client wurde noch nicht gebaut. Bitte <code>npm run build</code> ausführen (die Startskripte erledigen das automatisch).</p>');
      return;
    }
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    let file = path.normalize(path.join(dist, rel));
    if (!file.startsWith(dist)) { res.writeHead(403); res.end(); return; }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, 'index.html');
    const ext = path.extname(file);
    res.writeHead(200, { 'content-type': MIME[ext] ?? 'application/octet-stream', 'cache-control': rel.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
  server.on('upgrade', (req, socket, head) => {
    if (!(req.url ?? '').startsWith('/ws')) { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, ws => {
      const s = game.onConnect(ws);
      ws.on('message', data => game.onMessage(s, data.toString()));
      ws.on('close', () => game.onClose(s));
      ws.on('error', () => { /* close folgt */ });
    });
  });

  server.on('error', (e: NodeJS.ErrnoException) => {
    if (e.code === 'EADDRINUSE') console.error(`\nPort ${port} ist bereits belegt. Läuft der Server schon? Sonst in config/server.json einen anderen Port wählen.\n`);
    else console.error(e);
    process.exit(1);
  });
  server.listen(port, host, () => {
    game.start();
    const line = '═'.repeat(64);
    console.log(`\n${line}\n  ETERNAL MANA – Server v${CFG.version} läuft\n${line}`);
    for (const a of info.addresses) console.log(`  ${a.label.padEnd(22)} ${a.url}`);
    console.log(line);
    if (info.tailscale.available) console.log('  Freunde im selben Tailnet öffnen die Tailscale-Adresse im Browser.');
    else console.log('  Tailscale wurde nicht gefunden – Einzelspieler und Heimnetz funktionieren trotzdem.\n  Einrichtung: docs/TAILSCALE_SETUP.md');
    console.log(`  Spielstände: ${db.file}`);
    console.log('  Befehle: save | backup | players | say <Text> | stop   (oder Strg+C)\n');
  });

  let closing = false;
  const shutdown = () => {
    if (closing) return;
    closing = true;
    console.log('\nSpeichere alle Charaktere und beende …');
    game.stop();
    try { if (fs.statSync(db.file).size > 8192) db.backup('auto'); } catch { /* egal */ }
    db.close();
    server.close();
    setTimeout(() => process.exit(0), 150);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  if (process.stdin.isTTY || process.env.EM_STDIN) {
    const rl = readline.createInterface({ input: process.stdin });
    rl.on('line', l => {
      const [cmd, ...rest] = l.trim().split(' ');
      if (cmd === 'stop' || cmd === 'exit' || cmd === 'quit') shutdown();
      else if (cmd === 'save') { game.saveAll(); console.log('Gespeichert.'); }
      else if (cmd === 'backup') console.log('Backup:', db.backup('manuell'));
      else if (cmd === 'players') { for (const p of game.players.values()) console.log(`  ${p.name} (Stufe ${p.level}, ${p.zone.def.name})${p.linkdead ? ' [getrennt]' : ''}`); console.log(`  ${game.players.size} Spieler`); }
      else if (cmd === 'say') game.sysChat('[Server] ' + rest.join(' '));
      else if (cmd) console.log('Befehle: save | backup | players | say <Text> | stop');
    });
  }
}

main().catch(e => { console.error(e); process.exit(1); });
