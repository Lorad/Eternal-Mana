// Eternal Mana – Patcher-Kern. Gleicht die Installation Datei für Datei mit dem GitHub-Stand ab.
// Bewusst ohne Abhängigkeiten: läuft auch, bevor `npm install` jemals ausgeführt wurde.
//
// Ablauf: neuesten Commit des Zweigs erfragen → Dateibaum mit Git-Prüfsummen holen → lokale Dateien
// prüfen → nur abweichende Dateien laden (jede wird gegen ihre Prüfsumme geprüft) → erst wenn alles
// vollständig geladen ist, an Ort und Stelle einsetzen.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

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
  constructor({ repo, branch, api = 'https://api.github.com', raw = 'https://raw.githubusercontent.com' }) {
    Object.assign(this, { repo, branch, api, raw });
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
  /** Neuester Stand des Zweigs. */
  async head() {
    const j = await (await this.get(`${this.api}/repos/${this.repo}/commits/${encodeURIComponent(this.branch)}`, 'application/vnd.github+json')).json();
    return { sha: j.sha, tree: j.commit.tree.sha, date: j.commit.committer?.date ?? null };
  }
  /** Alle Dateien eines Stands mit Git-Prüfsumme und Größe. */
  async tree(treeSha) {
    const j = await (await this.get(`${this.api}/repos/${this.repo}/git/trees/${treeSha}?recursive=1`, 'application/vnd.github+json')).json();
    if (j.truncated) throw new PatchError('http', 'Dateiliste unvollständig.');
    return j.tree.filter(e => e.type === 'blob' && e.mode !== '120000' && safeRel(e.path)).map(e => ({ path: e.path, sha: e.sha, size: e.size ?? 0, mode: e.mode }));
  }
  /** Eine Datei eines bestimmten Stands laden; onBytes meldet den Fortschritt. */
  async file(commit, rel, onBytes) {
    const r = await this.get(`${this.raw}/${this.repo}/${commit}/${rel.split('/').map(encodeURIComponent).join('/')}`, '*/*');
    const chunks = [];
    for await (const c of r.body) { chunks.push(c); onBytes?.(c.length); }
    return Buffer.concat(chunks);
  }
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
      let buf = null, got = 0;
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
  const tree = await gh.tree(head.tree);
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
