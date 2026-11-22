// Eternal Mana – Launcher. Prüft auf Aktualisierungen, lädt sie, bereitet das Spiel vor und startet Spiel und Server.
// Die Oberfläche ist eine lokale Seite (launcher/ui), die in einem eigenen Fenster ohne Browserleisten geöffnet wird.
// Ohne Abhängigkeiten, damit der Launcher auch vor dem ersten `npm install` läuft.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GitHub, PatchError, sync, readState, writeState, parseNotes, gitBlobSha } from './patcher.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readJson = (f, d = {}) => { try { return JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')); } catch { return d; } };
const cfg = { repo: 'Lorad/Eternal-Mana', branch: 'main', launcherPort: 7780, ...readJson('config/patcher.json') };
const gamePort = readJson('config/server.json').port ?? 7777;
const gh = new GitHub({ repo: cfg.repo, branch: cfg.branch, api: process.env.EM_PATCHER_API || undefined, raw: process.env.EM_PATCHER_RAW || undefined, web: process.env.EM_PATCHER_WEB || undefined });
const isWin = process.platform === 'win32';
const devCheckout = fs.existsSync(path.join(root, '.git'));
const settingsFile = '.patcher/settings.json';
const settings = { joinAddr: '', ...readJson(settingsFile) };

fs.mkdirSync(path.join(root, '.patcher'), { recursive: true });
const logFile = path.join(root, '.patcher', 'launcher.log');
try { if (fs.statSync(logFile).size > 200_000) fs.rmSync(logFile); } catch {}
const log = (...a) => { const l = `[${new Date().toISOString()}] ${a.join(' ')}\n`; try { fs.appendFileSync(logFile, l); } catch {} process.stdout.write(l); };

// ---------------------------------------------------------------- Zustand → Oberfläche
const S = {
  phase: 'checking', progress: 0, busyBar: false, label: 'Suche nach Aktualisierungen …', detail: '', error: null,
  ready: false, updated: 0, pending: 0, offline: false, dev: devCheckout,
  version: '', build: '', notes: [], joinAddr: settings.joinAddr, ui: '',
  server: { running: false, starting: false, mine: false, online: 0, addresses: [], error: null },
};
const clients = new Set();
let pushTimer = null;
function set(patch) {
  Object.assign(S, patch);
  if (pushTimer) return;
  pushTimer = setTimeout(() => { pushTimer = null; const d = `data: ${JSON.stringify(S)}\n\n`; for (const c of clients) c.write(d); }, 60);
}
function refreshMeta() {
  const notes = (() => { try { return parseNotes(fs.readFileSync(path.join(root, 'PATCHNOTES.md'), 'utf8')); } catch { return []; } })();
  let ui = '';
  try { ui = gitBlobSha(Buffer.concat(fs.readdirSync(path.join(here, 'ui')).sort().map(f => fs.readFileSync(path.join(here, 'ui', f))))).slice(0, 8); } catch {}
  set({ notes, version: readJson('package.json').version ?? '', build: (readState(root).sha ?? '').slice(0, 7), ui });
}

// ---------------------------------------------------------------- Hilfen
function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const tail = [];
    const p = spawn(cmd, args, { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], ...opts });
    const on = d => { for (const l of String(d).split(/\r?\n/)) if (l.trim()) { tail.push(l.trim()); if (tail.length > 12) tail.shift(); } };
    p.stdout.on('data', on); p.stderr.on('data', on);
    p.on('error', reject);
    p.on('close', code => code === 0 ? resolve() : reject(new Error(tail.slice(-4).join(' · ') || `${cmd} endete mit Fehler ${code}`)));
  });
}
function newest(dir) {
  let t = 0;
  if (!fs.existsSync(dir)) return 0;
  const st = fs.statSync(dir);
  if (!st.isDirectory()) return st.mtimeMs;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) t = Math.max(t, newest(path.join(dir, e.name)));
  return t;
}
const mtime = f => { try { return fs.statSync(path.join(root, f)).mtimeMs; } catch { return 0; } };
const lockSha = () => { try { return gitBlobSha(fs.readFileSync(path.join(root, 'package-lock.json'))); } catch { return ''; } };
function needInstall() {
  if (!mtime('node_modules/.package-lock.json')) return true;
  const st = readState(root);
  return st.lockSha ? ![st.lockSha, st.lockAfter].includes(lockSha()) : mtime('node_modules/.package-lock.json') < mtime('package.json');
}
function needBuild() {
  const built = mtime('client/dist/index.html');
  const src = Math.max(...['client/src', 'client/public', 'shared/src', 'client/index.html', 'client/vite.config.ts'].map(f => newest(path.join(root, f))));
  return !built || built < src;
}
async function gameInfo() {
  try { const r = await fetch(`http://127.0.0.1:${gamePort}/api/info`, { signal: AbortSignal.timeout(900) }); return r.ok ? await r.json() : null; }
  catch { return null; }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------- Aktualisieren und vorbereiten
let busy = false;
/** Anzahl geänderter Dateien aus dem Lauf vor einem Selbst-Neustart des Launchers */
let carried = Number((process.argv.find(a => a.startsWith('--updated=')) ?? '').slice(10)) || 0;
async function pipeline({ force = false, stopServerFirst = false } = {}) {
  if (busy) return;
  busy = true;
  let changed = [];
  try {
    set({ phase: 'checking', progress: 0.02, busyBar: true, label: 'Suche nach Aktualisierungen …', detail: '', error: null, ready: false, pending: 0, offline: false });
    const [maj, min] = process.versions.node.split('.').map(Number);
    if (maj < 22 || (maj === 22 && min < 13)) throw new Error(`Eternal Mana benötigt Node.js 22.13 oder neuer (gefunden: ${process.versions.node}). Download: nodejs.org`);
    if (stopServerFirst) await stopServer();
    try {
      if (devCheckout) changed = gitSync();
      else {
        const r = await sync({
          root, gh, force,
          canApply: async () => !(await gameInfo()),
          onProgress: p => {
            if (p.phase === 'verifying') set({ phase: 'verifying', busyBar: false, progress: 0.03 + 0.07 * (p.done / p.total), label: 'Prüfe Spieldateien …', detail: `${p.done} / ${p.total}` });
            else if (p.phase === 'downloading') set({
              phase: 'downloading', busyBar: false, progress: 0.1 + 0.6 * (p.totalBytes ? Math.min(1, p.bytes / p.totalBytes) : p.done / p.total),
              label: 'Lade Aktualisierung …', detail: `${p.done} / ${p.total} Dateien · ${mb(p.bytes)} / ${mb(p.totalBytes)} MB`,
            });
            else if (p.phase === 'archive') set({ phase: 'downloading', busyBar: true, progress: 0.3, label: 'Lade Aktualisierung …', detail: `${mb(p.bytes)} MB` });
            else if (p.phase === 'applying') set({ phase: 'applying', progress: 0.72, label: 'Setze Aktualisierung ein …', detail: '' });
          },
        });
        if (r.pending) { set({ phase: 'deferred', busyBar: false, progress: 0, pending: r.pending, label: 'Aktualisierung verfügbar', detail: 'Der Server läuft noch – zum Aktualisieren muss er kurz beendet werden.', ready: !needInstall() && !needBuild() }); return; }
        changed = [...r.changed, ...r.removed];
        if (changed.length) log(`Aktualisiert auf ${r.head.sha.slice(0, 7)}: ${r.changed.length} Dateien geladen, ${r.removed.length} entfernt`);
      }
    } catch (e) {
      if (!(e instanceof PatchError) || (e.kind !== 'offline' && e.kind !== 'rate')) throw e;
      log('Update-Prüfung übersprungen:', e.message);
      set({ offline: true });
    }
    refreshMeta();
    if (changed.some(f => f.startsWith('launcher/') && !f.startsWith('launcher/ui/'))) { S.updatedNow = changed.length; return restartSelf(); }

    if (needInstall()) {
      set({ phase: 'installing', busyBar: true, progress: 0.75, label: 'Installiere Abhängigkeiten …', detail: 'Beim ersten Mal kann das ein paar Minuten dauern.' });
      const want = lockSha(); // vor der Installation merken: npm darf die Datei anpassen, ohne dass das als Änderung zählt
      await run('npm install --no-audit --no-fund', [], { shell: true });
      writeState(root, { lockSha: want, lockAfter: lockSha() });
    } else if (!readState(root).lockSha) writeState(root, { lockSha: lockSha() });
    if (needBuild()) {
      set({ phase: 'building', busyBar: true, progress: 0.88, label: 'Bereite das Spiel vor …', detail: 'Grafiken und Spieldaten werden zusammengestellt.' });
      await run(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--config', 'client/vite.config.ts']);
    }
    set({
      phase: 'ready', busyBar: false, progress: 1, ready: true, updated: changed.length || carried,
      label: changed.length || carried ? 'Aktualisierung abgeschlossen' : S.offline ? 'Bereit (ohne Update-Prüfung)' : 'Das Spiel ist aktuell',
      detail: S.offline ? 'Keine Verbindung zum Update-Server – gespielt wird mit der installierten Version.' : S.dev && S.devNote ? S.devNote : '',
    });
  } catch (e) {
    log('Fehler:', e.stack ?? e.message);
    set({ phase: 'error', busyBar: false, progress: 0, error: e.message, label: 'Etwas ist schiefgelaufen', detail: e.message, ready: !needInstall() && !needBuild() });
  } finally { busy = false; if (S.phase === 'ready') carried = 0; }
}
const mb = n => (n / 1048576).toFixed(1).replace('.', ',');

/** Entwickler-Kopie (git clone): nie Dateien überschreiben, höchstens sauber vorspulen. */
function gitSync() {
  const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const cur = git('rev-parse', '--abbrev-ref', 'HEAD');
  if (cur !== cfg.branch) { S.devNote = `Entwickler-Kopie auf Zweig „${cur}“ – keine automatische Aktualisierung.`; return []; }
  if (git('status', '--porcelain')) { S.devNote = 'Entwickler-Kopie mit lokalen Änderungen – keine automatische Aktualisierung.'; return []; }
  const before = git('rev-parse', 'HEAD');
  try { git('pull', '--ff-only', 'origin', cfg.branch); } catch { throw new PatchError('offline', 'git pull nicht möglich.'); }
  const after = git('rev-parse', 'HEAD');
  writeState(root, { sha: after });
  S.devNote = 'Entwickler-Kopie: Aktualisierung über git.';
  return before === after ? [] : git('diff', '--name-only', before, after).split('\n').filter(Boolean);
}

function restartSelf() {
  log('Launcher wurde aktualisiert – Neustart');
  set({ phase: 'restarting', busyBar: true, label: 'Launcher wird neu gestartet …', detail: '' });
  setTimeout(() => {
    server.close();
    for (const c of clients) c.destroy();
    spawn(process.execPath, [fileURLToPath(import.meta.url), '--resume', `--updated=${S.updatedNow ?? 0}`], { cwd: root, detached: true, stdio: 'ignore', windowsHide: true }).unref();
    setTimeout(() => process.exit(0), 150);
  }, 400);
}

// ---------------------------------------------------------------- Spielserver
let child = null;
const serverLog = [];
async function startServer() {
  if (S.server.running || S.server.starting) return true;
  if (!S.ready) return false;
  S.server = { ...S.server, starting: true, error: null }; set({});
  serverLog.length = 0;
  child = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', '--disable-warning=ExperimentalWarning', 'server/src/index.ts'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const on = d => { for (const l of String(d).split(/\r?\n/)) if (l.trim()) { serverLog.push(l.trim()); if (serverLog.length > 40) serverLog.shift(); } };
  child.stdout.on('data', on); child.stderr.on('data', on);
  let exited = false;
  child.on('error', e => { exited = true; serverLog.push(e.message); });
  child.on('close', () => { exited = true; child = null; pollServer(); maybeQuit(); });
  for (let i = 0; i < 80 && !exited; i++) { await sleep(250); if (await gameInfo()) break; }
  S.server.starting = false;
  if (exited) { S.server.error = serverLog.slice(-3).join(' · ') || 'Der Server konnte nicht gestartet werden.'; log('Server-Start fehlgeschlagen:', S.server.error); }
  else log('Server gestartet');
  await pollServer();
  return !exited;
}
async function stopServer() {
  if (!(await gameInfo())) return;
  try { await fetch(`http://127.0.0.1:${gamePort}/api/stop`, { method: 'POST', signal: AbortSignal.timeout(3000) }); } catch {}
  for (let i = 0; i < 40 && (await gameInfo()); i++) await sleep(250);
  if (child && (await gameInfo())) child.kill();
  log('Server beendet');
  await pollServer();
}
async function pollServer() {
  const i = await gameInfo();
  const next = { ...S.server, running: !!i, mine: !!i && !!child, online: i?.online ?? 0, addresses: (i?.addresses ?? []).filter(a => a.kind !== 'local') };
  if (JSON.stringify(next) !== JSON.stringify(S.server)) set({ server: next });
}
setInterval(pollServer, 2000).unref();

// ---------------------------------------------------------------- Fenster öffnen
function findChromium() {
  const cands = isWin
    ? [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, process.env.LOCALAPPDATA].filter(Boolean)
        .flatMap(b => [path.join(b, 'Microsoft/Edge/Application/msedge.exe'), path.join(b, 'Google/Chrome/Application/chrome.exe')])
    : process.platform === 'darwin'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Chromium.app/Contents/MacOS/Chromium']
      : (process.env.PATH ?? '').split(':').flatMap(d => ['google-chrome', 'chromium', 'chromium-browser', 'microsoft-edge'].map(n => path.join(d, n)));
  return cands.find(f => fs.existsSync(f)) ?? null;
}
function detach(cmd, args) {
  try { spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true }).on('error', e => log('Öffnen fehlgeschlagen:', e.message)).unref(); return true; }
  catch (e) { log('Öffnen fehlgeschlagen:', e.message); return false; }
}
/** Im Standardbrowser öffnen – dort liegen auch die bisherigen Spielstände und Einstellungen des Spiels. */
function openDefault(url) {
  return isWin ? detach('cmd', ['/c', 'start', '', url]) : detach(process.platform === 'darwin' ? 'open' : 'xdg-open', [url]);
}
/** Launcher-Fenster ohne Browserleisten, falls ein passender Browser vorhanden ist. */
function openWindow(url) {
  const exe = findChromium();
  if (!exe || !detach(exe, [`--app=${url}`, '--window-size=1040,680'])) openDefault(url);
}
function gameUrl() {
  let t = S.joinAddr.trim();
  if (!t) return `http://localhost:${gamePort}`;
  if (!/^https?:\/\//i.test(t)) t = 'http://' + t;
  if (!/:\d+(\/|$)/.test(t.replace(/^https?:\/\//i, '')) && !/^https:/i.test(t)) t += ':' + gamePort;
  return t;
}

// ---------------------------------------------------------------- Aktionen der Oberfläche
const actions = {
  async play() {
    if (!S.joinAddr.trim() && !(await gameInfo()) && !(await startServer())) return;
    openDefault(gameUrl());
  },
  'server-start': () => startServer(),
  'server-stop': () => stopServer(),
  check: () => pipeline(),
  repair: () => pipeline({ force: true }),
  'update-now': () => pipeline({ stopServerFirst: true }),
  join(b) {
    const v = String(b.addr ?? '').trim().slice(0, 120);
    if (v && !/^[\w.\-:/\[\]]+$/.test(v)) return;
    settings.joinAddr = v;
    try { fs.writeFileSync(path.join(root, settingsFile), JSON.stringify(settings)); } catch {}
    set({ joinAddr: v });
  },
};

// ---------------------------------------------------------------- lokaler Webserver für die Oberfläche
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
let port = Number(process.env.EM_LAUNCHER_PORT) || cfg.launcherPort;
const server = http.createServer(async (req, res) => {
  // Nur Aufrufe vom eigenen Rechner unter der eigenen Adresse zulassen
  if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host ?? '')) { res.writeHead(403); res.end(); return; }
  const url = new URL(req.url ?? '/', 'http://x');
  if (url.pathname === '/api/ping') { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"app":"eternal-mana-launcher"}'); return; }
  if (url.pathname === '/api/events') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify(S)}\n\n`);
    clients.add(res); seen = true;
    req.on('close', () => { clients.delete(res); maybeQuit(); });
    return;
  }
  if (url.pathname === '/api/action' && req.method === 'POST') {
    if (req.headers['x-em-launcher'] !== '1') { res.writeHead(403); res.end(); return; }
    let body = '';
    for await (const c of req) { body += c; if (body.length > 2000) break; }
    let b = {}; try { b = JSON.parse(body); } catch {}
    const fn = actions[b.a];
    res.writeHead(fn ? 200 : 404); res.end();
    if (fn) Promise.resolve(fn(b)).catch(e => log('Aktion fehlgeschlagen:', e.message));
    return;
  }
  // Statische Dateien: Oberfläche und die Screenshots aus docs/art/screens als Hintergrund
  let file = null;
  const art = /^\/art\/([\w-]+\.(?:jpg|png))$/.exec(url.pathname);
  if (art) file = path.join(root, 'docs/art/screens', art[1]);
  else if (/^\/[\w.-]*$/.test(url.pathname)) file = path.join(here, 'ui', url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});

// Der Launcher beendet sich, wenn sein Fenster geschlossen ist – außer der von ihm gestartete Server läuft noch.
let seen = false, quitTimer = null;
function maybeQuit() {
  clearTimeout(quitTimer);
  quitTimer = setTimeout(() => {
    if (clients.size || child || busy) { if (!clients.size && busy) maybeQuit(); return; }
    log('Fenster geschlossen – Launcher beendet');
    process.exit(0);
  }, seen ? 6000 : 90000);
  quitTimer.unref?.();
}

async function listen(tries) {
  for (let i = 0; i < tries; i++) {
    const ok = await new Promise(r => { server.once('error', () => r(false)); server.listen(port, '127.0.0.1', () => r(true)); });
    if (ok) return true;
    await sleep(400);
  }
  return false;
}
const resume = process.argv.includes('--resume');
if (!(await listen(resume ? 15 : 1))) {
  // Läuft schon ein Launcher? Dann nur dessen Fenster öffnen.
  let other = false;
  try { other = (await (await fetch(`http://127.0.0.1:${port}/api/ping`, { signal: AbortSignal.timeout(1500) })).json()).app === 'eternal-mana-launcher'; } catch {}
  if (other) { if (!process.env.EM_LAUNCHER_NO_OPEN) openWindow(`http://127.0.0.1:${port}/`); process.exit(0); }
  port += 1 + Math.floor(Math.random() * 20);
  if (!(await listen(1))) { log('Kein freier Port für den Launcher.'); process.exit(1); }
}
log(`Launcher läuft auf http://127.0.0.1:${port}/ (${cfg.repo}@${cfg.branch})`);
refreshMeta();
if (!resume && !process.env.EM_LAUNCHER_NO_OPEN) openWindow(`http://127.0.0.1:${port}/`);
maybeQuit();
pollServer();
pipeline();
