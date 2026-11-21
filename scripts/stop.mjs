// Beendet einen lokal laufenden Server sauber (speichert alle Charaktere).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let port = 7777;
try { port = JSON.parse(fs.readFileSync(path.join(root, 'config/server.json'), 'utf8')).port ?? 7777; } catch {}
port = Number(process.env.EM_PORT ?? port);
try {
  const r = await fetch(`http://127.0.0.1:${port}/api/stop`, { method: 'POST' });
  console.log(r.ok ? 'Server wurde beendet. Alle Spielstände sind gespeichert.' : 'Der Server hat abgelehnt: ' + (await r.text()));
} catch { console.log(`Auf Port ${port} läuft kein Eternal-Mana-Server.`); }
