/**
 * Persistenz mit dem in Node eingebauten SQLite (node:sqlite) – keine nativen Zusatzmodule nötig.
 * Schutz vor beschädigten Spielständen: Prüfsummen je Charakter, rollierende Charakter-Snapshots,
 * WAL-Journal, Integritätsprüfung beim Start und automatische Datei-Backups.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { CFG } from '../../shared/src/config';
import { CLASSES } from '../../shared/src/data/classes';
import { ITEMS } from '../../shared/src/data/items';
import { ENCHANTS, RECIPES } from '../../shared/src/data/recipes';
import { SETS } from '../../shared/src/data/sets';
import { ZONES } from '../../shared/src/data/zones';
import { computeStats, newCharacter } from '../../shared/src/stats';
import type { CharData, CharSummary, ClassId } from '../../shared/src/types';

const sha = (s: string) => createHash('sha1').update(s).digest('hex');

export interface AccountRow { id: number; token: string; name: string; settings: string | null }

/** Repariert/ergänzt geladene Charakterdaten, damit alte oder leicht beschädigte Stände ladbar bleiben. */
export function sanitizeChar(raw: any): CharData | null {
  if (!raw || typeof raw !== 'object' || typeof raw.name !== 'string' || !CLASSES[raw.cls as ClassId]) return null;
  const base = newCharacter(raw.name, raw.cls);
  const c: CharData = { ...base, ...raw };
  const num = (v: any, d: number, min = 0, max = 1e12) => (typeof v === 'number' && isFinite(v) ? Math.max(min, Math.min(max, v)) : d);
  c.level = Math.floor(num(c.level, 1, 1, CFG.player.maxLevel));
  c.xp = Math.floor(num(c.xp, 0)); c.gold = Math.floor(num(c.gold, 0));
  c.attrPoints = Math.floor(num(c.attrPoints, 0)); c.skillPoints = Math.floor(num(c.skillPoints, 0));
  for (const a of ['str', 'dex', 'int', 'vit'] as const) c.attrs[a] = Math.floor(num(c.attrs?.[a], base.attrs[a], 1, 9999));
  if (!c.skills || typeof c.skills !== 'object') c.skills = base.skills;
  if (!Array.isArray(c.hotbar)) c.hotbar = base.hotbar;
  c.hotbar = [0, 1, 2, 3].map(i => (typeof c.hotbar[i] === 'string' && c.skills[c.hotbar[i]!] ? c.hotbar[i] : null));
  c.inv = (Array.isArray(c.inv) ? c.inv : []).filter(it => it && ITEMS[it.base] && typeof it.uid === 'string').slice(0, CFG.player.invSize);
  for (const it of c.inv) { it.affixes = Array.isArray(it.affixes) ? it.affixes : []; it.up = num(it.up, 0, 0, CFG.upgrade.max); it.rarity = num(it.rarity, 0, 0, 4); it.ilvl = num(it.ilvl, 1, 1, 99); }
  if (!c.equip || typeof c.equip !== 'object') c.equip = {};
  for (const s of Object.keys(c.equip) as (keyof CharData['equip'])[]) if (!c.equip[s] || !ITEMS[c.equip[s]!.base]) delete c.equip[s];
  // 0.4: optionale Felder – alte Stände haben sie nicht, unbekannte Werte werden entfernt
  for (const it of [...c.inv, ...(Object.values(c.equip) as typeof c.inv)]) {
    if (it.elv !== undefined) { if (it.element) it.elv = Math.floor(num(it.elv, 1, 1, 3)); else delete it.elv; }
    if (it.ench !== undefined && !ENCHANTS[it.ench]) delete it.ench;
    if (it.set !== undefined && !SETS[it.set]) delete it.set;
  }
  if (c.recipes !== undefined) c.recipes = Array.isArray(c.recipes) ? [...new Set(c.recipes.filter(r => typeof r === 'string' && RECIPES[r]))] : [];
  if (c.timed !== undefined) {
    const t: Record<string, [string, number]> = {};
    if (c.timed && typeof c.timed === 'object') for (const k of ['food', 'elixir']) { const v = (c.timed as any)[k]; if (Array.isArray(v) && ITEMS[v[0]]?.use?.buff?.slot === k) t[k] = [v[0], num(v[1], 0, 0, 7200)]; }
    c.timed = t;
  }
  if (!c.quests || typeof c.quests !== 'object') c.quests = {};
  if (!c.flags || typeof c.flags !== 'object') c.flags = {};
  if (!ZONES[c.zone]) { c.zone = 'gruenwald'; c.x = 0; c.y = 0; }
  if (!c.respawn || !ZONES[c.respawn.zone]) c.respawn = { zone: 'gruenwald', x: 0, y: 0 };
  const d = computeStats(c);
  c.hp = num(c.hp, d.maxHp, 1, d.maxHp); c.mp = num(c.mp, d.maxMp, 0, d.maxMp);
  c.playtime = num(c.playtime, 0); c.kills = num(c.kills, 0); c.deaths = num(c.deaths, 0);
  return c;
}

export class Db {
  db!: DatabaseSync;
  readonly file: string;
  readonly backupDir: string;
  private lastSnapshot = new Map<number, number>();

  constructor(public dataDir: string) {
    fs.mkdirSync(dataDir, { recursive: true });
    this.file = path.join(dataDir, 'eternal-mana.db');
    this.backupDir = path.join(dataDir, 'backups');
    fs.mkdirSync(this.backupDir, { recursive: true });
    this.open();
  }

  private open() {
    const existed = fs.existsSync(this.file);
    try {
      this.db = new DatabaseSync(this.file);
      if (existed) {
        const r = this.db.prepare('PRAGMA quick_check').get() as any;
        if (!r || Object.values(r)[0] !== 'ok') throw new Error('Integritätsprüfung fehlgeschlagen');
      }
    } catch (e) {
      console.error('[db] Datenbank beschädigt:', (e as Error).message);
      try { this.db?.close(); } catch { /* egal */ }
      const broken = this.file + '.defekt-' + Date.now();
      if (fs.existsSync(this.file)) fs.renameSync(this.file, broken);
      for (const ext of ['-wal', '-shm']) if (fs.existsSync(this.file + ext)) fs.rmSync(this.file + ext);
      const backups = this.listBackups();
      if (backups.length) {
        fs.copyFileSync(path.join(this.backupDir, backups[0]), this.file);
        console.error(`[db] Wiederhergestellt aus Backup ${backups[0]}. Defekte Datei: ${broken}`);
      } else console.error(`[db] Kein Backup vorhanden – starte mit leerer Datenbank. Defekte Datei: ${broken}`);
      this.db = new DatabaseSync(this.file);
    }
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY, token TEXT UNIQUE NOT NULL, name TEXT NOT NULL, settings TEXT, created INTEGER, last_seen INTEGER);
      CREATE TABLE IF NOT EXISTS characters (id INTEGER PRIMARY KEY, account_id INTEGER NOT NULL, slot INTEGER NOT NULL, name TEXT NOT NULL, cls TEXT NOT NULL,
        level INTEGER, zone TEXT, playtime REAL, data TEXT NOT NULL, checksum TEXT NOT NULL, updated INTEGER, deleted INTEGER DEFAULT 0);
      CREATE INDEX IF NOT EXISTS idx_char_acc ON characters(account_id);
      CREATE TABLE IF NOT EXISTS char_snapshots (id INTEGER PRIMARY KEY, char_id INTEGER NOT NULL, ts INTEGER, data TEXT NOT NULL, checksum TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_snap_char ON char_snapshots(char_id);
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
    `);
  }

  account(token: string, name: string): AccountRow {
    let row = this.db.prepare('SELECT id, token, name, settings FROM accounts WHERE token = ?').get(token) as AccountRow | undefined;
    if (!row) {
      const r = this.db.prepare('INSERT INTO accounts (token, name, created, last_seen) VALUES (?, ?, ?, ?)').run(token, name, Date.now(), Date.now());
      row = { id: Number(r.lastInsertRowid), token, name, settings: null };
    } else {
      this.db.prepare('UPDATE accounts SET name = ?, last_seen = ? WHERE id = ?').run(name, Date.now(), row.id);
      row.name = name;
    }
    return row;
  }
  saveSettings(accountId: number, settings: string) { this.db.prepare('UPDATE accounts SET settings = ? WHERE id = ?').run(settings.slice(0, 20000), accountId); }

  listChars(accountId: number): CharSummary[] {
    return (this.db.prepare('SELECT id, slot, name, cls, level, zone, playtime FROM characters WHERE account_id = ? AND deleted = 0 ORDER BY slot').all(accountId) as any[])
      .map(r => ({ id: r.id, slot: r.slot, name: r.name, cls: r.cls, level: r.level, zone: r.zone, playtime: r.playtime }));
  }
  nameTaken(name: string): boolean {
    return !!this.db.prepare('SELECT 1 FROM characters WHERE lower(name) = lower(?) AND deleted = 0').get(name);
  }
  createChar(accountId: number, slot: number, c: CharData): number {
    const data = JSON.stringify(c);
    const r = this.db.prepare('INSERT INTO characters (account_id, slot, name, cls, level, zone, playtime, data, checksum, updated) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(accountId, slot, c.name, c.cls, c.level, c.zone, 0, data, sha(data), Date.now());
    return Number(r.lastInsertRowid);
  }
  deleteChar(accountId: number, id: number) { this.db.prepare('UPDATE characters SET deleted = 1 WHERE id = ? AND account_id = ?').run(id, accountId); }

  /** Lädt einen Charakter; bei defekter Prüfsumme wird der jüngste intakte Snapshot verwendet. */
  loadChar(accountId: number, id: number): CharData | null {
    const row = this.db.prepare('SELECT data, checksum FROM characters WHERE id = ? AND account_id = ? AND deleted = 0').get(id, accountId) as any;
    if (!row) return null;
    const tryParse = (data: string, checksum: string): CharData | null => {
      if (sha(data) !== checksum) return null;
      try { return sanitizeChar(JSON.parse(data)); } catch { return null; }
    };
    let c = tryParse(row.data, row.checksum);
    if (c) return c;
    console.error(`[db] Charakter ${id}: Spielstand beschädigt – versuche Snapshots …`);
    const snaps = this.db.prepare('SELECT data, checksum, ts FROM char_snapshots WHERE char_id = ? ORDER BY ts DESC').all(id) as any[];
    for (const s of snaps) { c = tryParse(s.data, s.checksum); if (c) { console.error(`[db] Charakter ${id}: Snapshot vom ${new Date(s.ts).toLocaleString()} geladen.`); return c; } }
    // letzter Versuch: Daten ohne gültige Prüfsumme reparieren
    try { return sanitizeChar(JSON.parse(row.data)); } catch { return null; }
  }

  saveChar(id: number, c: CharData) {
    const data = JSON.stringify(c);
    const sum = sha(data);
    const now = Date.now();
    this.db.exec('BEGIN');
    try {
      this.db.prepare('UPDATE characters SET level = ?, zone = ?, playtime = ?, data = ?, checksum = ?, updated = ? WHERE id = ?').run(c.level, c.zone, c.playtime, data, sum, now, id);
      if (now - (this.lastSnapshot.get(id) ?? 0) > 5 * 60_000) {
        this.lastSnapshot.set(id, now);
        this.db.prepare('INSERT INTO char_snapshots (char_id, ts, data, checksum) VALUES (?,?,?,?)').run(id, now, data, sum);
        this.db.prepare('DELETE FROM char_snapshots WHERE char_id = ? AND id NOT IN (SELECT id FROM char_snapshots WHERE char_id = ? ORDER BY ts DESC LIMIT ?)').run(id, id, CFG.save.charSnapshotsKept);
      }
      this.db.exec('COMMIT');
    } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }

  listBackups(): string[] {
    return fs.readdirSync(this.backupDir).filter(f => f.endsWith('.db')).sort().reverse();
  }
  /** Konsistente Kopie der gesamten Datenbank (VACUUM INTO), alte Backups werden ausgedünnt. */
  backup(label = 'auto'): string {
    const d = new Date();
    const p2 = (n: number) => String(n).padStart(2, '0');
    const name = `eternal-mana-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}-${label}.db`;
    const file = path.join(this.backupDir, name);
    this.db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
    const all = this.listBackups().filter(f => f.includes('-auto'));
    for (const old of all.slice(CFG.save.backupsKept)) fs.rmSync(path.join(this.backupDir, old));
    return file;
  }
  close() { try { this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); this.db.close(); } catch { /* egal */ } }
}
