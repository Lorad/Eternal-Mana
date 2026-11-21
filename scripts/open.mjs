// Öffnet das Spiel im Standardbrowser.  node scripts/open.mjs [Adresse]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let port = 7777;
try { port = JSON.parse(fs.readFileSync(path.join(root, 'config/server.json'), 'utf8')).port ?? 7777; } catch {}
let target = (process.argv[2] ?? '').trim();
if (!target) target = `http://localhost:${port}`;
if (!/^https?:\/\//i.test(target)) target = 'http://' + target;
if (!/:\d+(\/|$)/.test(target.replace(/^https?:\/\//i, '')) && !/^https:/i.test(target)) target += ':' + port;
console.log('Öffne ' + target);
const [cmd, args] = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', target]] : process.platform === 'darwin' ? ['open', [target]] : ['xdg-open', [target]];
try { spawn(cmd, args, { detached: true, stdio: 'ignore' }).on('error', () => console.log('Bitte öffne die Adresse von Hand im Browser.')).unref(); }
catch { console.log('Bitte öffne die Adresse von Hand im Browser.'); }
