/**
 * Elemente (0.4): Zustände je Element, ausdrückliche Schwächen/Resistenzen der Gegner, Reaktionen zweier Elemente
 * und die Resistenzrechnung der Spieler. Zahlen: CFG.elements in config.ts.
 */
import { CFG, ELEMENTS, elementMultiplier } from './config';
import { BOSSES, ENEMIES } from './data/enemies';
import type { Element, StatusId } from './types';

/** Zustand, den ein Elementartreffer auslösen kann (Chance: CFG.combat.elemProc) */
export const ELEM_STATUS: Partial<Record<Element, { id: StatusId; dur: number }>> = {
  fire: { id: 'burn', dur: 3 }, water: { id: 'slow', dur: 2.5 }, earth: { id: 'stun', dur: 0.6 },
  wind: { id: 'expose', dur: 4 }, light: { id: 'weak', dur: 3 }, dark: { id: 'mark', dur: 4 },
};
/** Kurzbeschreibung je Element für die Oberfläche */
export const ELEMENT_INFO: Record<Exclude<Element, 'phys'>, string> = {
  fire: 'Brennen – Schaden über Zeit',
  water: 'Verlangsamt – das Ziel bewegt sich träge',
  earth: 'Betäubt – das Ziel setzt kurz aus',
  wind: 'Entblößt – Treffer gegen das Ziel sind öfter kritisch',
  light: 'Geschwächt – das Ziel teilt weniger Schaden aus',
  dark: 'Gezeichnet – das Ziel erleidet mehr Schaden',
};
export const STATUS_INFO: Record<StatusId, string> = {
  burn: 'Erleidet Feuerschaden über Zeit.', poison: 'Erleidet Giftschaden über Zeit.', slow: 'Bewegt sich langsamer.', stun: 'Kann nicht handeln.',
  weak: 'Teilt 30 % weniger Schaden aus.', mark: 'Erleidet 25 % mehr Schaden.', expose: 'Treffer gegen das Ziel sind öfter kritisch.',
  root: 'Kann sich nicht bewegen.', freeze: 'Eingefroren – kann nicht handeln.',
};

// ------------------------------------------------------------------ Schwächen & Resistenzen der Gegner
export interface Affine { element: Element; weak?: Element[]; resist?: Element[] }

/** Schadensfaktor eines Angriffs im Element `attack` gegen ein Ziel: Kreislauf × ausdrückliche Schwäche/Resistenz. */
export function affinityMul(attack: Element, t: Affine): number {
  let f = elementMultiplier(attack, t.element);
  if (t.weak?.includes(attack)) f *= CFG.elements.weakMul;
  if (t.resist?.includes(attack)) f *= CFG.elements.resistMul;
  return f;
}
/** Für die Anzeige: gegen welche Elemente ist das Ziel anfällig bzw. widerstandsfähig (Kreislauf und Daten zusammen)? */
export function affinities(t: Affine): { weak: Element[]; resist: Element[] } {
  const weak: Element[] = [], resist: Element[] = [];
  for (const e of ['phys', ...ELEMENTS] as Element[]) {
    const f = affinityMul(e, t);
    if (f > 1.01) weak.push(e); else if (f < 0.99) resist.push(e);
  }
  return { weak, resist };
}

/** Schwächen und Resistenzen eines Gegners oder Bosses nach ID; `el` = aktuelles Element (Bosse können es wechseln). */
export function mobAffinity(mob: string, boss: boolean, el?: Element): { el: Element; weak: Element[]; resist: Element[] } {
  const def = boss ? BOSSES[mob] : ENEMIES[mob];
  const element = el ?? def?.element ?? 'phys';
  return { el: element, ...affinities({ element, weak: def?.weak, resist: def?.resist }) };
}

/** Faktor auf erlittenen Schaden eines Spielers mit `res` Prozent Resistenz. */
export function resistFactor(res: number): number { return 1 - Math.max(0, Math.min(CFG.elements.resCap, res)) / 100; }

// ------------------------------------------------------------------ Reaktionen
export interface ReactionDef {
  id: string;
  name: string;
  /** die beiden Elemente (Reihenfolge egal) */
  pair: [Element, Element];
  /** Element des Reaktionsschadens; 'trigger' = Element des auslösenden Treffers */
  el: Element | 'trigger';
  /** Sofortschaden als Vielfaches des Angriffswerts des Auslösers */
  mult: number;
  /** Flächenwirkung um das Ziel (px); ohne = nur das Ziel */
  radius?: number;
  /** Zustand, den die Reaktion verhängt; `boss` ersetzt ihn bei Bossen (kein Festsetzen) */
  status?: { id: StatusId; dur: number };
  boss?: { id: StatusId; dur: number };
  /** Schaden über Zeit: Gesamtschaden als Vielfaches des Angriffswerts über `dur` Sekunden */
  dot?: { id: 'burn' | 'poison'; total: number; dur: number };
  /** Heilung für Spieler im Umkreis: Anteil des maximalen Lebens + Vielfaches des Angriffswerts */
  heal?: { radius: number; hpPct: number; mult: number };
  sfx: string;
  color: string;
  desc: string;
}

export const REACTIONS: ReactionDef[] = [
  { id: 'feuersturm', name: 'Feuersturm', pair: ['fire', 'wind'], el: 'fire', mult: 0.9, radius: 56, dot: { id: 'burn', total: 0.8, dur: 4 }, sfx: 'explosion', color: '#ff9a4c',
    desc: 'Der Wind facht die Flammen an: Feuerschaden und Brennen für alle Gegner im Umkreis.' },
  { id: 'frost', name: 'Frost', pair: ['water', 'wind'], el: 'water', mult: 0.6, status: { id: 'freeze', dur: 1.6 }, boss: { id: 'slow', dur: 3 }, sfx: 'freeze', color: '#bfe9ff',
    desc: 'Nässe und Wind lassen das Ziel kurz einfrieren. Bosse werden stattdessen verlangsamt.' },
  { id: 'dampf', name: 'Dampf', pair: ['fire', 'water'], el: 'water', mult: 0.5, radius: 50, status: { id: 'weak', dur: 5 }, sfx: 'cast_water', color: '#e4f0f4',
    desc: 'Heißer Dampf nimmt allen Gegnern im Umkreis die Kraft: Sie teilen weniger Schaden aus.' },
  { id: 'schlamm', name: 'Schlamm', pair: ['earth', 'water'], el: 'earth', mult: 0.6, radius: 40, status: { id: 'root', dur: 3 }, boss: { id: 'slow', dur: 4 }, sfx: 'splash', color: '#c9a85a',
    desc: 'Der Boden wird zu Morast: Gegner im Umkreis sitzen fest. Bosse werden stattdessen verlangsamt.' },
  { id: 'zwielicht', name: 'Zwielicht', pair: ['light', 'dark'], el: 'trigger', mult: 2, sfx: 'shock', color: '#e6c8ff',
    desc: 'Licht und Dunkelheit zerreißen sich gegenseitig: ein einzelner, schwerer Schlag.' },
  { id: 'sandsturm', name: 'Sandsturm', pair: ['earth', 'wind'], el: 'wind', mult: 0.6, radius: 56, status: { id: 'expose', dur: 5 }, sfx: 'cast_wind', color: '#e8d9a0',
    desc: 'Wirbelnder Sand entblößt alle Gegner im Umkreis: Treffer gegen sie sind öfter kritisch.' },
  { id: 'faeulnis', name: 'Fäulnis', pair: ['earth', 'dark'], el: 'earth', mult: 0.3, radius: 50, dot: { id: 'poison', total: 1.8, dur: 6 }, sfx: 'cast_dark', color: '#9fd14a',
    desc: 'Gift und Schatten verderben alles ringsum: starkes, lang anhaltendes Gift im Umkreis.' },
  { id: 'quellsegen', name: 'Quellsegen', pair: ['water', 'light'], el: 'light', mult: 0.5, heal: { radius: 110, hpPct: 0.04, mult: 0.3 }, sfx: 'heal', color: '#a8ffd8',
    desc: 'Lichtdurchflutetes Wasser: schadet dem Ziel und heilt alle Verbündeten in der Nähe.' },
];
const BY_PAIR = new Map<string, ReactionDef>();
for (const r of REACTIONS) { BY_PAIR.set(r.pair[0] + '+' + r.pair[1], r); BY_PAIR.set(r.pair[1] + '+' + r.pair[0], r); }
/** Reaktion zweier Elemente (Reihenfolge egal) oder undefined. */
export function reactionOf(a: Element, b: Element): ReactionDef | undefined { return BY_PAIR.get(a + '+' + b); }
/** Reaktionen, an denen ein Element beteiligt ist (für die Oberfläche) */
export function reactionsWith(el: Element): ReactionDef[] { return REACTIONS.filter(r => r.pair.includes(el)); }
