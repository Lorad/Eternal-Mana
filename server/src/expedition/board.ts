/**
 * Bestenliste der Quellwarte (0.11): schnellster Lauf je Expedition und Schwierigkeitsgrad und die tiefste Tiefe – über alle
 * Spieler des Servers. Liegt als JSON in der Tabelle `meta` (Schlüssel `exp_board`), wird nach jedem Abschluss einmal je Lauf
 * fortgeschrieben (`Expedition.bossDown`) und in der Trophäenhalle angezeigt (Nachricht `exp` mit `board`).
 */
import { EXPEDITIONS } from '../../../shared/src/data/expeditions';
import { DIFFICULTIES, type Difficulty } from '../../../shared/src/data/hub';
import type { ExpBoard, ExpBoardEntry } from '../../../shared/src/types';
import type { Game } from '../game';

const KEY = 'exp_board';
const cache = new WeakMap<Game, ExpBoard>();

/** Gelesener (und bereinigter) Stand – Unsinn aus einer beschädigten Zeile fällt weg */
export function boardOf(game: Game): ExpBoard {
  let b = cache.get(game);
  if (b) return b;
  b = {};
  try {
    const raw = JSON.parse(game.db.getMeta(KEY) ?? '{}');
    const entry = (e: any): ExpBoardEntry | undefined => (e && typeof e.sec === 'number' && e.sec > 0 && Array.isArray(e.names)
      ? { sec: Math.round(e.sec), names: e.names.filter((n: unknown) => typeof n === 'string').slice(0, 4).map((n: string) => n.slice(0, 24)), at: Number(e.at) || 0, ...(e.depth ? { depth: Math.max(1, Math.floor(e.depth)) } : {}) } : undefined);
    for (const id in raw) {
      if (!EXPEDITIONS[id]) continue;
      const best: ExpBoard[string]['best'] = {};
      for (const d of DIFFICULTIES) { const e = entry(raw[id]?.best?.[d]); if (e) best[d] = e; }
      const deep = entry(raw[id]?.deep);
      b[id] = { best, ...(deep?.depth ? { deep } : {}) };
    }
  } catch { b = {}; }
  cache.set(game, b);
  return b;
}

/** Ein Abschluss: neue Bestzeit oder neue Tiefe? Gibt zurück, was neu ist (für die Meldung), und speichert sofort. */
export function recordRun(game: Game, exp: string, diff: Difficulty, depth: number, sec: number, names: string[]): { best: boolean; deep: boolean } {
  const b = boardOf(game), row = (b[exp] ??= { best: {} });
  const e: ExpBoardEntry = { sec, names: names.slice(0, 4), at: Date.now() };
  const best = !row.best[diff] || sec < row.best[diff]!.sec;
  if (best) row.best[diff] = e;
  const deep = depth > 0 && (!row.deep || depth > (row.deep.depth ?? 0) || (depth === row.deep.depth && sec < row.deep.sec));
  if (deep) row.deep = { ...e, depth };
  if (best || deep) { try { game.db.setMeta(KEY, JSON.stringify(b)); } catch (err) { console.error('[bestenliste]', err); } }
  return { best, deep };
}
