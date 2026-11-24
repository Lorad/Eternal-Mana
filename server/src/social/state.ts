/** Gemeinsam (0.7): flüchtiger Zustand der Gruppen-, Handels- und Teil-Systeme. Hängt per WeakMap am `Game` – nichts davon wird gespeichert. */
import type { Game, Party } from '../game';
import type { Player } from '../player';
import type { Obj } from '../zone';

export interface Invite { from: Player; to: Player; until: number }
export interface TradeSideState { p: Player; items: Map<string, number>; gold: number; locked: boolean; ok: boolean; ops: number; opsAt: number }
export interface Trade { a: TradeSideState; b: TradeSideState; changedAt: number; full?: Player }

export interface SocialState {
  acc: number; slow: number;
  /** offene Einladungen (je Eingeladenem höchstens eine) und Sperren nach Ablehnung/Verfall (`von>an` → bis wann) */
  invites: Map<Player, Invite>;
  inviteBlock: Map<string, number>;
  /** charId → Gruppe, in der dieser Charakter noch einen freien Platz hat */
  seatOf: Map<number, Party>;
  /** wer nach einem Bosskampf noch in die Welt seines Kreises wechseln muss */
  rehome: Set<Player>;
  /** offene Handelsanfragen (je Angefragtem höchstens eine), letzter Anfragezeitpunkt je Spieler, laufende Geschäfte */
  tradeReq: Map<Player, { from: Player; until: number }>;
  tradeReqAt: Map<Player, number>;
  trades: Map<Player, Trade>;
  /** angebotene Quests je Empfänger */
  offers: Map<Player, Map<string, { from: Player; until: number }>>;
  shareAt: Map<Player, number>;
  inspectAt: Map<Player, number>;
  /** Gruppentruhen: wer sie öffnen darf (charIds) */
  chests: WeakMap<Obj, Set<number>>;
}

const states = new WeakMap<Game, SocialState>();
export function ss(g: Game): SocialState {
  let s = states.get(g);
  if (!s) {
    s = { acc: 0, slow: 0, invites: new Map(), inviteBlock: new Map(), seatOf: new Map(), rehome: new Set(), tradeReq: new Map(), tradeReqAt: new Map(), trades: new Map(),
      offers: new Map(), shareAt: new Map(), inspectAt: new Map(), chests: new WeakMap() };
    states.set(g, s);
  }
  return s;
}
export function reject(p: Player, s: string) { p.toast(s, 'bad'); p.pev.push({ k: 'sfx', n: 'ui_error' }); }
export const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
/** Ist der Spieler noch in der Welt und verbunden? */
export const present = (g: Game, p: Player) => g.players.get(p.charId) === p && !p.linkdead;
