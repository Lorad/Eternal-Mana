// Alle Browser-Durchläufe (tests/e2e/*.mjs) mit einem Befehl:  npm run test:e2e:all
//
// Jeder Durchlauf bekommt seinen EIGENEN, frisch gestarteten Server (eigener Port, leere Datenbank im Temp-Ordner,
// Dev-Befehle an) – so stören sie sich nicht (Tageszeit, Ereignisse, Jahreszeit sind serverweit) und laufen nebeneinander.
// Am Ende steht je Skript bestanden/gescheitert mit Dauer; Rückgabewert 1, sobald eines scheitert.
// Die Adresse trägt `?hinweise=aus`: Die Hinweise des Spiels (0.8) bleiben aus, damit keine Karte über einem Knopf liegt –
// nur tests/e2e/erste-schritte.mjs prüft sie ausdrücklich und ruft die Seite ohne diesen Zusatz auf.
//
//   npm run test:e2e:all                  alle Skripte (ab acht Kernen mehrere nebeneinander)
//   npm run test:e2e:all -- coop welt     nur Skripte, deren Name passt
//   EM_JOBS=2 npm run test:e2e:all        Zahl der gleichzeitigen Durchläufe      EM_KEEP=1  Ausgaben auch bei Erfolg zeigen
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'tests/e2e');
const want = process.argv.slice(2).filter(a => !a.startsWith('-'));
const scripts = fs.readdirSync(dir).filter(f => f.endsWith('.mjs') && (!want.length || want.some(w => f.includes(w)))).sort();
// Jeder Durchlauf zeichnet ein Spiel (ohne Grafikkarte in Software) und braucht dafür mehrere Kerne: unter acht Kernen einer nach
// dem anderen, sonst je vier Kerne einer – zu viele nebeneinander machen die Durchläufe langsam und ihre Wartezeiten unzuverlässig.
const jobs = Math.max(1, Math.min(scripts.length, Number(process.env.EM_JOBS) || Math.floor(os.cpus().length / 4) || 1, 4));
const TIMEOUT_MS = (Number(process.env.EM_TIMEOUT) || 900) * 1000;
if (!scripts.length) { console.error('Kein passendes Skript in tests/e2e.'); process.exit(2); }

const run = (cmd, args, opts = {}) => new Promise(res => {
  const p = spawn(cmd, args, { cwd: root, ...opts });
  let out = '';
  p.stdout?.on('data', d => (out += d)); p.stderr?.on('data', d => (out += d));
  p.on('close', code => res({ code: code ?? 1, out })); p.on('error', e => res({ code: 1, out: out + String(e) }));
  opts.onProc?.(p);
});
const get = (url, method = 'GET') => new Promise(res => {
  const q = http.request(url, { method, timeout: 1500 }, r => { r.resume(); r.on('end', () => res(r.statusCode ?? 0)); });
  q.on('error', () => res(0)); q.on('timeout', () => { q.destroy(); res(0); }); q.end();
});
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- Client bauen, falls er fehlt oder älter ist als der Quellcode (dasselbe Skript wie die Startskripte)
{
  const r = await run(process.execPath, ['scripts/ensure-build.mjs'], { stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.code) { console.error(r.out); console.error('Der Client ließ sich nicht bauen.'); process.exit(2); }
}

let nextPort = 7900 + Math.floor(Math.random() * 40) * 2;
async function one(file) {
  const t0 = Date.now();
  const port = nextPort++;
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'em-e2e-'));
  const env = { ...process.env, EM_DEV: '1', EM_PORT: String(port), EM_HOST: '127.0.0.1', EM_DATA: data };
  let server;
  const srv = run(process.execPath, ['--disable-warning=ExperimentalWarning', '--import', 'tsx', 'server/src/index.ts'], { env, stdio: ['ignore', 'pipe', 'pipe'], onProc: p => (server = p) });
  let up = false;
  for (let i = 0; i < 80 && !up; i++) { await sleep(250); up = (await get(`http://127.0.0.1:${port}/api/info`)) === 200; }
  let res;
  if (!up) res = { code: 1, out: 'Der Server ist nicht gestartet (Port ' + port + ').\n' + (await Promise.race([srv, sleep(200).then(() => ({ out: '' }))])).out };
  else {
    let child, timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child?.kill('SIGKILL'); }, TIMEOUT_MS);
    res = await run(process.execPath, [path.join('tests/e2e', file)], { env: { ...process.env, EM_URL: `http://127.0.0.1:${port}/?hinweise=aus` }, stdio: ['ignore', 'pipe', 'pipe'], onProc: p => (child = p) });
    clearTimeout(timer);
    if (timedOut) res = { code: 1, out: res.out + `\nAbgebrochen nach ${TIMEOUT_MS / 1000} s.` };
  }
  await get(`http://127.0.0.1:${port}/api/stop`, 'POST');
  await Promise.race([srv, sleep(3000)]);
  try { server?.kill('SIGKILL'); } catch { /* schon beendet */ }
  try { fs.rmSync(data, { recursive: true, force: true }); } catch { /* egal */ }
  const sec = (Date.now() - t0) / 1000;
  console.log(`  ${res.code === 0 ? '✓' : '✗'} ${file.padEnd(16)} ${sec.toFixed(0).padStart(4)} s`);
  return { file, ok: res.code === 0, sec, out: res.out };
}

console.log(`Eternal Mana – ${scripts.length} Browser-Durchläufe, ${jobs === 1 ? 'nacheinander' : jobs + ' nebeneinander'} (je ein eigener Server mit leerer Datenbank)`);
const t0 = Date.now();
// die langen Durchläufe zuerst, damit am Ende nicht einer allein läuft
const LONG = ['coop.mjs', 'welt.mjs', 'zuhause.mjs', 'fenster.mjs', 'endgame.mjs'];
const queue = [...scripts].sort((a, b) => (LONG.indexOf(a) + 99) % 99 - (LONG.indexOf(b) + 99) % 99), results = [];
await Promise.all(Array.from({ length: jobs }, async () => { for (let f; (f = queue.shift()); ) results.push(await one(f)); }));
results.sort((a, b) => a.file.localeCompare(b.file));
const bad = results.filter(r => !r.ok);
for (const r of results) if (!r.ok || process.env.EM_KEEP) console.log(`\n──── ${r.file} ${'─'.repeat(Math.max(4, 60 - r.file.length))}\n${r.out.trimEnd().split('\n').slice(-60).join('\n')}`);
console.log(`\n${results.length - bad.length} von ${results.length} bestanden in ${((Date.now() - t0) / 1000).toFixed(0)} s.${bad.length ? ' Gescheitert: ' + bad.map(r => r.file).join(', ') + ' (Bilder: tests/e2e/out/)' : ''}`);
process.exit(bad.length ? 1 : 0);
