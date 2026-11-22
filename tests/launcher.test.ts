// Patcher-Kern des Launchers: Abgleich einer Installation mit einem (nachgestellten) GitHub-Stand.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
// @ts-ignore – reines JavaScript ohne Typen, damit der Launcher ohne Build läuft
import { GitHub, gitBlobSha, parseNotes, readState, safeRel, sync, toLf } from '../launcher/patcher.mjs';

type Files = Record<string, string | Buffer>;
let remote: Files = {};
let corrupt = '';
let server: http.Server;
let base = '';
const calls = { head: 0, tree: 0, file: 0 };
const blob = (f: string) => { const v = remote[f]; return Buffer.isBuffer(v) ? v : Buffer.from(v); };
const headSha = () => gitBlobSha(Buffer.from(JSON.stringify(Object.keys(remote).sort().map(f => [f, gitBlobSha(blob(f))]))));

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url!, 'http://x').pathname);
    if (u.includes('/commits/')) { calls.head++; res.end(JSON.stringify({ sha: headSha(), commit: { tree: { sha: headSha() }, committer: { date: '2026-11-22T00:00:00Z' } } })); }
    else if (u.includes('/git/trees/')) {
      calls.tree++;
      res.end(JSON.stringify({ truncated: false, tree: [
        ...Object.keys(remote).map(f => ({ path: f, type: 'blob', mode: '100644', sha: gitBlobSha(blob(f)), size: blob(f).length })),
        { path: '../evil.txt', type: 'blob', mode: '100644', sha: 'x', size: 1 },
        { path: 'data/save.db', type: 'blob', mode: '100644', sha: 'x', size: 1 },
        { path: 'sub', type: 'tree', mode: '040000', sha: 'x' },
      ] }));
    } else if (u.startsWith('/raw/')) {
      calls.file++;
      const f = u.split('/').slice(5).join('/');
      if (!(f in remote)) { res.writeHead(404); res.end(); return; }
      res.end(f === corrupt ? Buffer.from('kaputt') : blob(f));
    } else { res.writeHead(404); res.end(); }
  });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', () => r()));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterAll(() => { server.close(); });

const mkRoot = (files: Files = {}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'em-patch-'));
  for (const [f, v] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true }); fs.writeFileSync(path.join(root, f), v); }
  return root;
};
const gh = () => new GitHub({ repo: 'a/b', branch: 'x', api: base, raw: base + '/raw' });
const read = (root: string, f: string) => fs.readFileSync(path.join(root, f), 'utf8');

describe('Launcher-Patcher', () => {
  it('berechnet dieselbe Prüfsumme wie git', () => {
    const buf = Buffer.from('Eternal Mana\n');
    const f = path.join(mkRoot(), 'a.txt');
    fs.writeFileSync(f, buf);
    expect(gitBlobSha(buf)).toBe(execFileSync('git', ['hash-object', f], { encoding: 'utf8' }).trim());
  });

  it('lässt nur harmlose Pfade innerhalb der Installation zu', () => {
    for (const ok of ['a.txt', 'client/src/main.ts', 'docs/art/x.png', 'Eternal-Mana.bat']) expect(safeRel(ok)).toBe(true);
    for (const bad of ['', '../a', 'a/../../b', '/etc/passwd', 'C:/x', 'a\\b', 'data/save.db', 'node_modules/x/y.js', '.git/config', '.patcher/state.json', 'client/dist/index.html', 'a//b', 'a/./b', 'con.']) expect(safeRel(bad)).toBe(false);
  });

  it('lädt fehlende und geänderte Dateien, lässt Übereinstimmendes, Eigenes und Spielstände in Ruhe', async () => {
    remote = { 'a.txt': 'neu', 'dir/b.txt': 'b', 'same.txt': 'gleich', 'config/server.json': '{"port":7777}', 'start.bat': 'echo hi\nrem x\n' };
    const root = mkRoot({ 'a.txt': 'alt', 'same.txt': 'gleich', 'config/server.json': '{"port":9000}', 'data/save.db': 'spielstand', 'eigene-notiz.txt': 'meins', 'start.bat': 'echo hi\r\nrem x\r\n' });
    const phases: string[] = [];
    const r = await sync({ root, gh: gh(), onProgress: (p: any) => phases.push(p.phase) });
    expect(r.changed.sort()).toEqual(['a.txt', 'dir/b.txt']);
    expect(read(root, 'a.txt')).toBe('neu');
    expect(read(root, 'dir/b.txt')).toBe('b');
    expect(read(root, 'config/server.json')).toBe('{"port":9000}');
    expect(read(root, 'data/save.db')).toBe('spielstand');
    expect(read(root, 'eigene-notiz.txt')).toBe('meins');
    expect(read(root, 'start.bat')).toBe('echo hi\r\nrem x\r\n');
    expect(fs.existsSync(path.join(root, '..', 'evil.txt'))).toBe(false);
    expect(fs.existsSync(path.join(root, '.patcher', 'tmp'))).toBe(false);
    expect(readState(root).sha).toBe(headSha());
    expect(phases).toContain('downloading');
  });

  it('erkennt den aktuellen Stand ohne erneuten Abgleich und entfernt gelöschte Dateien beim nächsten Update', async () => {
    remote = { 'a.txt': '1', 'alt/weg.txt': 'x', 'run.bat': 'a\nb\n' };
    const root = mkRoot();
    await sync({ root, gh: gh() });
    expect(read(root, 'run.bat')).toBe('a\r\nb\r\n');
    const before = { ...calls };
    const again = await sync({ root, gh: gh() });
    expect(again.upToDate).toBe(true);
    expect(calls.tree).toBe(before.tree);
    expect(calls.file).toBe(before.file);

    fs.writeFileSync(path.join(root, 'alt', 'meins.txt'), 'bleibt');
    remote = { 'a.txt': '2' };
    const r = await sync({ root, gh: gh() });
    expect(r.changed).toEqual(['a.txt']);
    expect(r.removed.sort()).toEqual(['alt/weg.txt', 'run.bat']);
    expect(fs.existsSync(path.join(root, 'alt/weg.txt'))).toBe(false);
    expect(read(root, 'alt/meins.txt')).toBe('bleibt');
  });

  it('repariert beschädigte Dateien bei erzwungener Prüfung', async () => {
    remote = { 'a.txt': 'heil', 'b.txt': 'auch' };
    const root = mkRoot();
    await sync({ root, gh: gh() });
    fs.writeFileSync(path.join(root, 'a.txt'), 'kaputt');
    expect((await sync({ root, gh: gh() })).upToDate).toBe(true);
    const r = await sync({ root, gh: gh(), force: true });
    expect(r.changed).toEqual(['a.txt']);
    expect(read(root, 'a.txt')).toBe('heil');
  });

  it('setzt nichts ein, wenn eine Datei beschädigt ankommt oder das Einsetzen abgelehnt wird', async () => {
    remote = { 'a.txt': 'eins', 'b.txt': 'zwei' };
    const root = mkRoot({ 'a.txt': 'alt' });
    corrupt = 'b.txt';
    await expect(sync({ root, gh: gh() })).rejects.toThrow(/beschädigt/);
    corrupt = '';
    expect(read(root, 'a.txt')).toBe('alt');
    expect(fs.existsSync(path.join(root, 'b.txt'))).toBe(false);
    expect(readState(root).sha).toBe(null);

    const r = await sync({ root, gh: gh(), canApply: async () => false });
    expect(r.pending).toBe(2);
    expect(read(root, 'a.txt')).toBe('alt');
  });

  it('meldet eine fehlende Verbindung als solche', async () => {
    const offline = new GitHub({ repo: 'a/b', branch: 'x', api: 'http://127.0.0.1:1', raw: 'http://127.0.0.1:1' });
    await expect(sync({ root: mkRoot(), gh: offline })).rejects.toMatchObject({ kind: 'offline' });
  });

  it('liest die Patch Notes', () => {
    const n = parseNotes('# Patch Notes\n\nText\n\n## 0.2.1 – Titel hier\n_22.11.2026_\n\n### Neu\n- Erster Punkt\n  geht weiter\n- Zweiter\n\n## 0.2.0 – Alt\n- X\n');
    expect(n).toHaveLength(2);
    expect(n[0]).toMatchObject({ version: '0.2.1', title: 'Titel hier', date: '22.11.2026' });
    expect(n[0].items).toEqual([{ h: 'Neu' }, { t: 'Erster Punkt geht weiter' }, { t: 'Zweiter' }]);
    expect(parseNotes(fs.readFileSync(path.join(__dirname, '..', 'PATCHNOTES.md'), 'utf8'))[0].items.length).toBeGreaterThan(2);
    expect(toLf(Buffer.from('a\r\nb')).toString()).toBe('a\nb');
  });
});
