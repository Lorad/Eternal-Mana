// Eternal Mana – Patcher-Kern. Gleicht die Installation Datei für Datei mit dem GitHub-Stand ab.
// Bewusst ohne Abhängigkeiten: läuft auch, bevor `npm install` jemals ausgeführt wurde.
//
// Ablauf: neuesten Commit des Zweigs erfragen → Dateibaum mit Git-Prüfsummen holen → lokale Dateien
// prüfen → nur abweichende Dateien laden (jede wird gegen ihre Prüfsumme geprüft) → erst wenn alles
// vollständig geladen ist, an Ort und Stelle einsetzen.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/** Dateien, die laut .gitattributes mit Windows-Zeilenenden ausgeliefert werden. */
export const CRLF_FILES = /\.(bat|cmd)$/i;
/** Eigene Einstellungen der Spielenden: werden nie überschrieben, wenn sie schon existieren. */
export const PROTECTED = new Set(['config/server.json']);
/** Bereiche, die der Patcher grundsätzlich nicht anfasst (Spielstände, Abhängigkeiten, Build, eigener Zustand). */
const FORBIDDEN = ['.git/', 'node_modules/', 'data/', '.patcher/', 'client/dist/'];

export class PatchError extends Error {
  constructor(kind, message) { super(message); this.kind = kind; }
}

/** Nur relative, harmlose Pfade innerhalb der Installation zulassen. */
export function safeRel(p) {
  if (typeof p !== 'string' || !p || p.length > 400) return false;
  if (/[\\\0<>:"|?*]/.test(p) || p.startsWith('/')) return false;
  const parts = p.split('/');
  if (parts.some(s => s === '' || s === '.' || s === '..' || /[. ]$/.test(s))) return false;
  if (FORBIDDEN.some(f => (p + '/').startsWith(f))) return false;
  return true;
}

export const gitBlobSha = buf => crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
export const toLf = buf => Buffer.from(buf.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
export const toCrlf = buf => Buffer.from(buf.toString('latin1').replace(/\r?\n/g, '\r\n'), 'latin1');

/** Git-Prüfsumme einer lokalen Datei (Zeilenenden von .bat-Dateien werden wie im Repository gezählt). */
export function localSha(root, rel) {
  try {
    let b = fs.readFileSync(path.join(root, rel));
    if (CRLF_FILES.test(rel)) b = toLf(b);
    return gitBlobSha(b);
  } catch { return null; }
}

const statePath = root => path.join(root, '.patcher', 'state.json');
export function readState(root) {
  try { const s = JSON.parse(fs.readFileSync(statePath(root), 'utf8')); return { sha: null, files: [], ...s }; }
  catch { return { sha: null, files: [] }; }
}
export function writeState(root, patch) {
  const s = { ...readState(root), ...patch };
  fs.mkdirSync(path.dirname(statePath(root)), { recursive: true });
  fs.writeFileSync(statePath(root), JSON.stringify(s));
  return s;
}

/** Zugriff auf GitHub (öffentliches Repository, keine Anmeldung nötig). */
export class GitHub {
  constructor({ repo, branch, api = 'https://api.github.com', raw = 'https://raw.githubusercontent.com', web = 'https://github.com' }) {
    Object.assign(this, { repo, branch, api, raw, web });
  }
  async get(url, accept) {
    let r;
    try { r = await fetch(url, { headers: { accept, 'user-agent': 'eternal-mana-launcher' }, signal: AbortSignal.timeout(20000) }); }
    catch (e) { throw new PatchError('offline', 'Keine Verbindung zum Update-Server.'); }
    if (r.status === 403 || r.status === 429) throw new PatchError('rate', 'Der Update-Server nimmt gerade keine Anfragen an. Bitte später erneut versuchen.');
    if (r.status === 404) throw new PatchError('notfound', 'Update-Quelle nicht gefunden (config/patcher.json prüfen).');
    if (!r.ok) throw new PatchError('http', `Update-Server antwortet mit Fehler ${r.status}.`);
    return r;
  }
  /** Neuester Stand des Zweigs. Erst über das Git-Protokoll (ohne Anfragelimit), sonst über die API. */
  async head() {
    try {
      const t = await (await this.get(`${this.web}/${this.repo}.git/info/refs?service=git-upload-pack`, '*/*')).text();
      const m = new RegExp(`([0-9a-f]{40}) refs/heads/${this.branch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\0\\n]`).exec(t);
      if (m) return { sha: m[1], tree: m[1], date: null };
    } catch (e) { if (e.kind === 'offline') throw e; }
    const j = await (await this.get(`${this.api}/repos/${this.repo}/commits/${encodeURIComponent(this.branch)}`, 'application/vnd.github+json')).json();
    return { sha: j.sha, tree: j.commit.tree.sha, date: j.commit.committer?.date ?? null };
  }
  /** Alle Dateien eines Stands mit Git-Prüfsumme und Größe. */
  async tree(treeSha) {
    const j = await (await this.get(`${this.api}/repos/${this.repo}/git/trees/${treeSha}?recursive=1`, 'application/vnd.github+json')).json();
    if (j.truncated) throw new PatchError('http', 'Dateiliste unvollständig.');
    return j.tree.filter(e => e.type === 'blob' && e.mode !== '120000' && safeRel(e.path)).map(e => ({ path: e.path, sha: e.sha, size: e.size ?? 0, mode: e.mode }));
  }
  /**
   * Ausweichweg ohne API: das ganze Archiv eines Stands laden und daraus dieselbe Dateiliste bilden.
   * Die Einträge tragen ihren Inhalt gleich mit (`buf`), es wird danach nichts mehr einzeln geladen.
   */
  async archive(commit, onBytes) {
    const r = await this.get(`${this.web}/${this.repo}/archive/${commit}.tar.gz`, '*/*');
    const chunks = [];
    for await (const c of r.body) { chunks.push(c); onBytes?.(c.length); }
    return untar(zlib.gunzipSync(Buffer.concat(chunks))).filter(e => safeRel(e.path)).map(e => {
      const buf = CRLF_FILES.test(e.path) ? toLf(e.buf) : e.buf;
      return { path: e.path, sha: gitBlobSha(buf), size: buf.length, mode: e.exec ? '100755' : '100644', buf };
    });
  }
  /** Eine Datei eines bestimmten Stands laden; onBytes meldet den Fortschritt. */
  async file(commit, rel, onBytes) {
    const r = await this.get(`${this.raw}/${this.repo}/${commit}/${rel.split('/').map(encodeURIComponent).join('/')}`, '*/*');
    const chunks = [];
    for await (const c of r.body) { chunks.push(c); onBytes?.(c.length); }
    return Buffer.concat(chunks);
  }
}

/** Liest ein tar-Archiv (ustar mit pax- und GNU-Langnamen); der oberste Ordner des Archivs wird abgestreift. */
export function untar(buf) {
  const out = [];
  const str = (o, n) => { const s = buf.subarray(o, o + n); const z = s.indexOf(0); return s.subarray(0, z < 0 ? n : z).toString('utf8'); };
  let long = null;
  for (let o = 0; o + 512 <= buf.length;) {
    if (buf[o] === 0) break;
    const size = parseInt(str(o + 124, 12).trim() || '0', 8), type = String.fromCharCode(buf[o + 156] || 48), mode = parseInt(str(o + 100, 8).trim() || '0', 8);
    const data = buf.subarray(o + 512, o + 512 + size);
    let name = long ?? (str(o + 345, 155) ? str(o + 345, 155) + '/' : '') + str(o, 100);
    o += 512 + Math.ceil(size / 512) * 512;
    if (type === 'x') { // pax: „<Länge> path=<Name>\n“
      const m = /\d+ path=([^\n]*)\n/.exec(data.toString('utf8'));
      long = m ? m[1] : null;
      continue;
    }
    if (type === 'L') { long = data.toString('utf8').replace(/\0+$/, ''); continue; }
    long = null;
    if (type !== '0') continue; // nur gewöhnliche Dateien
    name = name.split('/').slice(1).join('/');
    if (name) out.push({ path: name, buf: Buffer.from(data), exec: (mode & 0o100) !== 0 });
  }
  return out;
}

/** Vergleicht die Installation mit dem Dateibaum: was muss geladen, was entfernt werden? */
export function planSync(root, tree, state, onProgress) {
  const downloads = [];
  let n = 0;
  for (const e of tree) {
    onProgress?.(++n, tree.length);
    const exists = fs.existsSync(path.join(root, e.path));
    if (exists && PROTECTED.has(e.path)) continue;
    if (!exists || localSha(root, e.path) !== e.sha) downloads.push(e);
  }
  const keep = new Set(tree.map(e => e.path));
  const deletes = (state.files ?? []).filter(p => !keep.has(p) && safeRel(p) && !PROTECTED.has(p) && fs.existsSync(path.join(root, p)));
  return { downloads, deletes, bytes: downloads.reduce((a, e) => a + e.size, 0) };
}

/** Lädt alle Dateien des Plans in einen Zwischenordner und prüft jede gegen ihre Prüfsumme. */
export async function downloadPlan(root, gh, commit, plan, onProgress, parallel = 6) {
  const tmp = path.join(root, '.patcher', 'tmp');
  fs.rmSync(tmp, { recursive: true, force: true });
  let done = 0, bytes = 0, i = 0;
  const report = () => onProgress?.({ done, total: plan.downloads.length, bytes, totalBytes: plan.bytes });
  const worker = async () => {
    while (i < plan.downloads.length) {
      const e = plan.downloads[i++];
      let buf = e.buf ?? null, got = 0;
      for (let attempt = 0; attempt < 3 && !buf; attempt++) {
        bytes -= got; got = 0;
        try {
          const b = await gh.file(commit, e.path, n => { got += n; bytes += n; report(); });
          if (gitBlobSha(b) === e.sha) buf = b;
        } catch (err) { if (attempt === 2) throw err; }
      }
      if (!buf) throw new PatchError('verify', `Datei beschädigt übertragen: ${e.path}`);
      const dst = path.join(tmp, e.path);
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.writeFileSync(dst, CRLF_FILES.test(e.path) ? toCrlf(buf) : buf);
      done++; report();
    }
  };
  await Promise.all(Array.from({ length: Math.min(parallel, plan.downloads.length) }, worker));
  return tmp;
}

/** Setzt die geladenen Dateien ein und entfernt, was es im neuen Stand nicht mehr gibt. */
export function applyPlan(root, tmp, plan) {
  for (const e of plan.downloads) {
    const dst = path.join(root, e.path);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(path.join(tmp, e.path), dst);
    if (e.mode === '100755' && process.platform !== 'win32') fs.chmodSync(dst, 0o755);
  }
  for (const p of plan.deletes) {
    fs.rmSync(path.join(root, p), { force: true });
    for (let d = path.dirname(path.join(root, p)); d.startsWith(root + path.sep) && d !== root; d = path.dirname(d)) {
      try { fs.rmdirSync(d); } catch { break; }
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}

/**
 * Vollständiger Abgleich. Rückgabe: { head, changed, removed, upToDate, pending }.
 * `canApply` wird gefragt, bevor Dateien ersetzt werden (z. B. „läuft der Server noch?“).
 */
export async function sync({ root, gh, force = false, canApply = async () => true, onProgress = () => {} }) {
  onProgress({ phase: 'checking' });
  const head = await gh.head();
  const state = readState(root);
  if (!force && state.sha === head.sha) return { head, changed: [], removed: [], upToDate: true };
  let tree;
  try { tree = await gh.tree(head.tree); }
  catch (e) {
    // API nicht erreichbar oder Anfragelimit erreicht: das ganze Archiv laden und daraus abgleichen
    if (e.kind === 'offline') throw e;
    let bytes = 0;
    tree = await gh.archive(head.sha, n => { bytes += n; onProgress({ phase: 'archive', bytes }); });
  }
  const plan = planSync(root, tree, state, (n, total) => { if (n % 25 === 0 || n === total) onProgress({ phase: 'verifying', done: n, total }); });
  const files = tree.map(e => e.path);
  if (!plan.downloads.length && !plan.deletes.length) {
    writeState(root, { sha: head.sha, date: head.date, files });
    return { head, changed: [], removed: [], upToDate: true };
  }
  if (!(await canApply(plan))) return { head, changed: [], removed: [], upToDate: false, pending: plan.downloads.length + plan.deletes.length };
  const tmp = await downloadPlan(root, gh, head.sha, plan, p => onProgress({ phase: 'downloading', ...p }));
  onProgress({ phase: 'applying' });
  applyPlan(root, tmp, plan);
  writeState(root, { sha: head.sha, date: head.date, files });
  return { head, changed: plan.downloads.map(e => e.path), removed: plan.deletes, upToDate: false };
}

/**
 * Verschiebt die genannten Einträge von `root` in den neuen Unterordner `dest`. Geht dabei etwas schief
 * (z. B. eine gesperrte Datei), wird alles zurückgeschoben und der Fehler weitergereicht.
 */
export function moveInto(root, names, dest, rename = fs.renameSync) {
  const moved = [];
  fs.mkdirSync(dest);
  try {
    for (const n of names) {
      if (!fs.existsSync(path.join(root, n))) continue;
      rename(path.join(root, n), path.join(dest, n));
      moved.push(n);
    }
  } catch (e) {
    for (const n of moved.reverse()) { try { fs.renameSync(path.join(dest, n), path.join(root, n)); } catch {} }
    try { fs.rmdirSync(dest); } catch {}
    throw e;
  }
  return moved;
}

/** PATCHNOTES.md → [{ version, title, date, items: [{ h } | { t }] }] */
export function parseNotes(md) {
  const out = [];
  for (const sec of String(md).split(/^## /m).slice(1)) {
    const lines = sec.split(/\r?\n/);
    const m = /^(\S+)\s*(?:[–—-]\s*(.*))?$/.exec(lines[0].trim());
    const n = { version: m?.[1] ?? lines[0].trim(), title: m?.[2] ?? '', date: '', items: [] };
    for (const l of lines.slice(1)) {
      const d = /^_(.+)_\s*$/.exec(l.trim());
      if (d && !n.items.length) n.date = d[1];
      else if (l.startsWith('### ')) n.items.push({ h: l.slice(4).trim() });
      else if (/^[-*] /.test(l)) n.items.push({ t: l.slice(2).trim() });
      else if (/^\s+\S/.test(l) && n.items.length && n.items.at(-1).t) n.items.at(-1).t += ' ' + l.trim();
    }
    out.push(n);
  }
  return out;
}
