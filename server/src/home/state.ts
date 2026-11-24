/**
 * Zuhause (0.7) – Zustand: der Profil-Stand (`HomeData`) je Konto, im Speicher gehalten, solange der Server läuft.
 * Hängt wie die Weltsysteme per WeakMap am `Game`; die Kernklassen bleiben unverändert.
 *
 * Speichern: nie allein, immer zusammen mit dem Charakter in einer Transaktion (`Db.saveChar(.., home)`), sobald sich
 * am Stand etwas geändert hat. Abgleich mit dem Client: geänderte Teile als `home`-Nachricht (wie `char`).
 */
import type { HomeData, ServerMsg } from '../../../shared/src/types';
import type { Game } from '../game';
import type { Player } from '../player';
import type { Zone } from '../zone';

export type Note = NonNullable<Extract<ServerMsg, { t: 'home' }>['note']>[number];
export interface Acc {
  h: HomeData;
  /** seit dem letzten Speichern geändert */
  save: boolean;
  /** Teile, die der Client noch nicht kennt · Hinweise, die mitgehen */
  dirty: Set<keyof HomeData>; notes: Note[];
}
const ACCS = new WeakMap<Game, Map<number, Acc>>();
/** Hof-Instanz → Besitzer */
export const OWNER = new WeakMap<Zone, { acc: number; name: string }>();
/** je Spieler: zuletzt gesehene Sieg-Zähler in den Flags (`b:`, `rk:`, `wb:`) – daraus werden Siege im Bestiarium */
export const MEMO = new WeakMap<Player, Map<string, number>>();

export function acc(g: Game, accountId: number): Acc {
  let m = ACCS.get(g);
  if (!m) ACCS.set(g, (m = new Map()));
  let a = m.get(accountId);
  if (!a) m.set(accountId, (a = { h: g.db.loadHome(accountId), save: false, dirty: new Set(), notes: [] }));
  return a;
}
export const homeOf = (g: Game, p: Player): HomeData => acc(g, p.accountId).h;
/** Vermerkt Änderungen am Profil-Stand (zum Speichern und für den Client). */
export function touch(g: Game, accountId: number, ...keys: (keyof HomeData)[]) {
  const a = acc(g, accountId);
  a.save = true;
  for (const k of keys) a.dirty.add(k);
}
export function note(g: Game, p: Player, s: string, kind: Note['kind'] = 'good', icon?: string) { acc(g, p.accountId).notes.push({ s, kind, icon }); }
/** Schickt dem Spieler die geänderten Teile seines Profil-Stands (und angefallene Hinweise). `all` = alles. */
export function flush(g: Game, p: Player, all = false) {
  const a = acc(g, p.accountId);
  if (p.linkdead || (!all && !a.dirty.size && !a.notes.length)) return;
  const h: Partial<HomeData> = all ? a.h : {};
  if (!all) for (const k of a.dirty) (h as any)[k] = a.h[k];
  const notes = a.notes;
  a.dirty.clear(); a.notes = [];
  p.send({ t: 'home', h, note: notes.length ? notes : undefined });
}
