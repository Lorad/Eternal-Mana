/**
 * Hinweise (0.8): kurze Erklärungen in dem Moment, in dem ein System zum ersten Mal wichtig wird – keine Tutorial-Wand.
 * Jeder Hinweis erscheint höchstens einmal je Profil (die Liste der gezeigten wandert mit den Einstellungen an den Server),
 * lässt sich wegklicken und ganz abschalten (Einstellungen → „Hinweise“). Reine Daten und Regeln, ohne Browser.
 */
import { canEquip, ITEMS, isGear } from '../../../shared/src/data/items';
import { TOPIC } from '../../../shared/src/data/dialoge';
import { QUESTS, questComplete } from '../../../shared/src/data/quests';
import { quellFree, riftUnlocked } from '../../../shared/src/data/rifts';
import { ZONES } from '../../../shared/src/data/zones';
import { CFG } from '../../../shared/src/config';
import type { Action } from './keys';
import type { UiState } from './store';

/** Ausschnitt des UI-Zustands, den die Hinweise ansehen */
export type HintState = Pick<UiState, 'screen' | 'char' | 'zone' | 'panel' | 'craft' | 'endgame' | 'hof' | 'lore' | 'cine' | 'dlgNode' | 'rift' | 'world' | 'party' | 'trade' | 'home' | 'dead' | 'boss' | 'target' | 'nearStone' | 'prompt' | 'dialog'>;

/**
 * Kapitel des Handbuchs in ihrer Reihenfolge: [Kennung, Titel]. Die Seiten selbst stehen in ui/handbuch.tsx; dort prüft der
 * Übersetzer, dass zu jeder Kennung eine Seite existiert – und hier, dass Hinweise nur auf vorhandene Kapitel zeigen.
 */
export const HELP_TOPICS = [
  ['start', 'Erste Schritte'],
  ['steuerung', 'Steuerung'],
  ['kampf', 'Kampf'],
  ['elemente', 'Elemente und Reaktionen'],
  ['charakter', 'Charakter und Fähigkeiten'],
  ['beute', 'Ausrüstung und Beute'],
  ['handwerk', 'Handwerk'],
  ['welt', 'Welt und Dungeons'],
  ['geschichte', 'Geschichte und Chronik'],
  ['endspiel', 'Endspiel'],
  ['ruf', 'Ruf und lebendige Welt'],
  ['zuhause', 'Zuhause und Sammlung'],
  ['gemeinsam', 'Gemeinsam spielen'],
  ['gamepad', 'Gamepad'],
  ['hilfe', 'Wenn etwas hakt'],
] as const;
export type HelpTopicId = (typeof HELP_TOPICS)[number][0];
export const HELP_TITLE = Object.fromEntries(HELP_TOPICS) as Record<HelpTopicId, string>;

export interface HintDef {
  id: string;
  title: string;
  /** Text; `{aktion}` wird durch die aktuelle Taste (oder den Gamepad-Knopf) ersetzt */
  text: string;
  /** Kapitel im Handbuch, das mehr dazu sagt */
  topic?: HelpTopicId;
  when: (s: HintState) => boolean;
}

const kind = (s: HintState) => ZONES[s.zone]?.kind;
const questCount = (s: HintState, st: 'active' | 'done') => (s.char ? Object.values(s.char.quests).filter(q => q.s === st).length : 0);

/** Reihenfolge = Vorrang: Passen mehrere, kommt der erste. */
export const HINTS: HintDef[] = [
  { id: 'start', title: 'Willkommen in Quellhain', topic: 'start',
    text: 'Mirelda, die Älteste, wartet am Brunnen. Ein gelbes „!“ über einer Figur heißt: Hier gibt es eine Aufgabe. Geh hin und drücke {interact}.',
    when: s => !!s.char && s.char.level === 1 && Object.keys(s.char.quests).length === 0 && s.zone === 'gruenwald' },
  { id: 'kampf', title: 'Kämpfen', topic: 'kampf',
    text: '{attack} greift an (gedrückt halten), {dodge} rollt – in der Rolle bist du kurz unverwundbar. {potionHp} trinkt einen Heiltrank.',
    when: s => !!s.char && s.char.level <= 2 && questCount(s, 'active') > 0 && questCount(s, 'done') === 0 && !s.dialog },
  { id: 'abgeben', title: 'Aufgabe erfüllt', topic: 'start',
    text: 'Kehre zum Auftraggeber zurück – über ihm steht jetzt ein „?“. Die Questverfolgung rechts nennt seinen Namen.',
    when: s => !!s.char && questCount(s, 'done') === 0 && Object.keys(s.char.quests).some(id => QUESTS[id] && questComplete(s.char!, QUESTS[id])) },
  { id: 'stufe', title: 'Stufenaufstieg', topic: 'charakter',
    text: 'Verteile Attributspunkte im Fenster Charakter ({character}) und lerne Fähigkeiten ({skills}). Die goldenen Knöpfe unter deinem Rahmen führen direkt dorthin.',
    when: s => !!s.char && (s.char.attrPoints > 0 || s.char.skillPoints > 0) && s.char.level <= 5 && !s.panel },
  { id: 'ausruestung', title: 'Neue Ausrüstung', topic: 'beute',
    text: 'Im Inventar ({inventory}) liegt etwas zum Anlegen. Doppelklick legt es an; der Tooltip vergleicht mit dem, was du trägst.',
    when: s => !!s.char && s.char.level <= 8 && s.char.inv.some(it => { const b = ITEMS[it.base]; return !!b && isGear(b) && canEquip(s.char!.cls, b); }) && !s.panel },
  { id: 'leiste', title: 'Fähigkeit gelernt', topic: 'charakter',
    text: 'Eine gelernte Fähigkeit liegt noch nicht auf der Aktionsleiste. Im Fenster Fähigkeiten ({skills}) wählst du einen der vier Plätze.',
    when: s => !!s.char && s.char.hotbar.some(h => !h) && Object.keys(s.char.skills).some(id => (s.char!.skills[id] ?? 0) > 0 && !s.char!.hotbar.includes(id)) && !s.panel },
  { id: 'quellstein', title: 'Quellstein', topic: 'welt',
    text: 'Quellsteine heilen, setzen deinen Rückkehrpunkt und erlauben über die Weltkarte ({map}) die Schnellreise zu jedem Stein, den du schon berührt hast.',
    when: s => s.nearStone && !!s.char && Object.keys(s.char.quests).length > 0 },
  { id: 'kochen', title: 'Kochstelle', topic: 'handwerk',
    text: 'Am Feuer kochst du Speisen aus den Zutaten der Region. Es wirken immer nur eine Speise und ein Elixier zugleich – dafür lange.',
    when: s => s.craft?.station === 'cooking' },
  { id: 'handwerk', title: 'Handwerk', topic: 'handwerk',
    text: 'Links stehen die Rezepte, rechts ihre Kosten. Rot heißt: Davon fehlt noch etwas. „Nur herstellbare“ blendet den Rest aus.',
    when: s => !!s.craft },
  { id: 'dungeon', title: 'Dungeon', topic: 'welt',
    text: 'Eine bewachte Truhe enthält den Schlüssel für die verschlossene Tür. Fällst du, geht es am Eingang weiter; leere Dungeons setzen sich nach kurzer Zeit zurück.',
    when: s => kind(s) === 'dungeon' && !s.rift },
  { id: 'boss', title: 'Bosskampf', topic: 'kampf',
    text: 'Rote Flächen kündigen Angriffe an – hinausrollen. Unter der Bossleiste steht, wogegen der Boss schwach ist und was er abwehrt.',
    when: s => !!s.boss && !s.rift },
  { id: 'elemente', title: 'Schwächen und Reaktionen', topic: 'elemente',
    text: 'Oben steht, wogegen dein Ziel schwach ist. Trägt ein Gegner den Zustand eines Elements und trifft ihn ein zweites, reagieren beide – etwa Feuer und Wind zum Feuersturm.',
    when: s => !!s.target && s.target.weak.length > 0 && !!s.char && s.char.level >= 4 },
  { id: 'chronik', title: 'Chronik', topic: 'geschichte',
    text: 'Gefundene Schriftstücke stehen im Questlog ({quests}) unter „Chronik“. Wer liest, bekommt in manchen Gesprächen andere Antworten.',
    when: s => !!s.lore },
  { id: 'entscheidung', title: 'Entscheidung', topic: 'geschichte',
    text: 'Antworten mit „!“ sind Entscheidungen. Sie werden gespeichert und ändern spätere Gespräche – manche auch das Ende.',
    when: s => { const n = s.dlgNode && TOPIC[s.dlgNode.topic]?.nodes[s.dlgNode.node]; return !!n && (n.opts ?? []).some(o => !!o.fx?.decide); } },
  { id: 'riss', title: 'Der Riss-Stein ist erwacht', topic: 'endspiel',
    text: 'Mana-Risse sind Dungeons in Stufen mit wechselnden Modifikatoren. Berühre den Riss-Stein in Quellhain, um einen zu öffnen.',
    when: s => !!s.char && riftUnlocked(s.char) && s.zone === 'gruenwald' && !s.rift && !s.endgame },
  { id: 'rissinnen', title: 'Im Mana-Riss', topic: 'endspiel',
    text: 'Die Uhr läuft gegen die Richtzeit – wer darunter bleibt, bekommt eine Bonustruhe. Wiederkehr am Eingang kostet einen Lebensfunken der Gruppe.',
    when: s => !!s.rift && !s.rift.done },
  { id: 'quell', title: 'Quellpunkt', topic: 'endspiel',
    text: `Über Stufe ${CFG.player.maxLevel} hinaus füllt Erfahrung Quellstufen. Punkte vergibst du im Endspiel-Fenster – der blaue Knopf unter deinem Rahmen.`,
    when: s => !!s.char && quellFree(s.char) > 0 && !s.endgame },
  { id: 'ereignis', title: 'Ereignis in der Region', topic: 'ruf',
    text: 'Rechts steht das Ziel, auf der Karte ({map}) der Ort. Wer mithilft, bekommt seine eigene Belohnung – niemand nimmt jemandem etwas weg.',
    when: s => !!s.world?.ev.some(e => e.zone === s.zone && !e.boss) },
  { id: 'ruf', title: 'Ruf', topic: 'ruf',
    text: 'Du hast Ruf bei einer Fraktion gewonnen. Ränge öffnen Vorräte, Rezepte und Nachlässe – Übersicht mit {ruf}.',
    when: s => !!s.char && Object.values(s.char.rep ?? {}).some(v => v > 0) && s.char.level >= 3 && !s.panel },
  { id: 'schatzkarte', title: 'Schatzkarte', topic: 'ruf',
    text: 'Benutze die Karte im Inventar. Rechts erscheint dann ein Hinweis auf die Grabstelle in ihrer Region; dort drückst du {interact}.',
    when: s => !!s.char && (s.char.inv.some(it => it.base.startsWith('tmap_')) || Object.keys(s.char.flags).some(k => k.startsWith('tk:'))) },
  { id: 'hofkauf', title: 'Ein Hof am Waldrand', topic: 'zuhause',
    text: `Mirelda verkauft dir jetzt den Hof (${CFG.home.price} Gold): eine Lagertruhe für alle deine Charaktere, später eigene Stationen, ein Bett und Trophäen.`,
    when: s => !!s.char && s.char.quests[CFG.home.buyQuest]?.s === 'done' && !!s.home && !s.home.owned && s.zone === 'gruenwald' && !s.dialog },
  { id: 'lager', title: 'Lagertruhe', topic: 'zuhause',
    text: 'Die Truhe gehört dem Profil: Was hier liegt, erreicht jeder deiner Charaktere. Gegenstand anklicken und „In die Truhe legen“ – oder Doppelklick.',
    when: s => s.hof?.tab === 'lager' },
  { id: 'schrank', title: 'Kleiderschrank', topic: 'zuhause',
    text: 'Gewand und Waffenglanz sind reine Optik, aber für Mitspieler sichtbar. Freigeschaltet wird über Ruf, Mana-Risse, die Enden und die Sammlung.',
    when: s => s.hof?.tab === 'schrank' },
  { id: 'begleiter', title: 'Ein Begleiter', topic: 'zuhause',
    text: 'Im Fenster Sammlung ({sammlung}) unter „Begleiter“ nimmst du ihn mit. Begleiter kämpfen nicht, bringen aber einen kleinen Vorteil.',
    when: s => !!s.char && !!s.home && s.home.pets.length > 0 && !s.char.pet && s.panel !== 'sammlung' },
  { id: 'sammlung', title: 'Sammlung', topic: 'zuhause',
    text: 'Bestiarium, Fundstücke, Rezepte, Trophäen: Die Sammlung gehört dem Profil. Meilensteine bringen Titel, Lagerplätze und Erscheinungen.',
    when: s => s.panel === 'sammlung' },
  { id: 'gruppe', title: 'Gruppe', topic: 'gemeinsam',
    text: 'Erfahrung und Questziele zählen für alle in der Nähe, Beute würfelt jeder für sich. Im Chat ({chat}) schreibt „/p Text“ nur an die Gruppe.',
    when: s => s.party.length > 1 },
  { id: 'handel', title: 'Handel', topic: 'gemeinsam',
    text: 'Lege Gegenstände und Gold ins Angebot. Erst sperren beide, dann bestätigen beide – jede Änderung hebt die Sperre wieder auf.',
    when: s => !!s.trade },
  { id: 'voll', title: 'Inventar voll', topic: 'beute',
    text: 'Verkaufe beim Händler (Reiter „Verkaufen“, Doppelklick) oder lagere auf dem Hof ein. Neue Beute bleibt sonst liegen.',
    when: s => !!s.char && s.char.inv.length >= CFG.player.invSize },
];
export const HINT: Record<string, HintDef> = Object.fromEntries(HINTS.map(h => [h.id, h]));

/** Der nächste fällige Hinweis: der erste passende, der noch nicht gezeigt wurde. Im Menü, in Filmszenen und nach dem Tod kommt keiner. */
export function nextHint(s: HintState, seen: readonly string[], enabled: boolean): HintDef | null {
  if (!enabled || s.screen !== 'game' || !s.char || s.cine || s.dead) return null;
  for (const h of HINTS) {
    if (seen.includes(h.id)) continue;
    try { if (h.when(s)) return h; } catch { /* unvollständiger Zustand: diesen Hinweis überspringen */ }
  }
  return null;
}
/** Trägt einen Hinweis als gezeigt ein (unbekannte alte IDs fallen dabei heraus). */
export function markSeen(seen: readonly string[], id: string): string[] {
  const out = seen.filter(x => !!HINT[x] && x !== id);
  if (HINT[id]) out.push(id);
  return out;
}
/** Ersetzt `{aktion}` im Text durch die Bezeichnung der Taste. */
export function hintText(h: HintDef, key: (a: Action) => string): string {
  return h.text.replace(/\{(\w+)\}/g, (_, a: string) => { const k = key(a as Action); return k ? `[${k}]` : '(nicht belegt)'; });
}
