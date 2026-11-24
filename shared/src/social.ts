/**
 * Gemeinsam (0.7): Regeln, die Server und Oberfläche teilen – was handelbar ist, welche Quests sich teilen lassen,
 * wie viele Inventarplätze ein Tausch braucht. Zahlen: CFG.social. Ausführung und Prüfung: server/src/social/*.
 */
import { CFG } from './config';
import { ITEMS } from './data/items';
import { QUESTS, questAvailable, type QuestDef } from './data/quests';
import { RECIPES } from './data/recipes';
import type { CharData, ItemInstance } from './types';

// ------------------------------------------------------------------ Handel
/**
 * Warum sich ein Gegenstand nicht handeln lässt (null = handelbar). Gebunden sind: Questgegenstände, Legendäre Waffen
 * (sie gehören zur Geschichte ihres Trägers), Trophäen und Rezeptrollen, die es nur für Ruf oder aus der Prüfung der Sieben gibt.
 * Alles andere – Ausrüstung, Setteile, Rohstoffe, Tränke, Speisen, Schatzkarten, gewöhnliche Rezeptrollen – ist handelbar.
 */
export function tradeBlock(it: Pick<ItemInstance, 'base'>): string | null {
  const b = ITEMS[it.base];
  if (!b) return 'Unbekannter Gegenstand.';
  if (b.kind === 'quest') return 'Questgegenstände lassen sich nicht handeln.';
  if (b.legend) return 'Legendäre Waffen sind an ihren Träger gebunden.';
  if (b.use?.trophy) return 'Trophäen muss man sich selbst verdienen.';
  const r = b.use?.learn ? RECIPES[b.use.learn] : undefined;
  if (r && (r.exclusive || r.src === 'ruf')) return 'Dieses Rezept ist eine persönliche Belohnung.';
  return null;
}
export const tradeable = (it: Pick<ItemInstance, 'base'>) => tradeBlock(it) === null;

/**
 * Wie viele Inventarplätze hat `inv` nach einem Tausch belegt? `out` = abgegebene Mengen je uid, `incoming` = erhaltene
 * Gegenstände. Stapelbares wandert auf einen vorhandenen Stapel derselben Art (wie Player.addItem), sonst auf einen neuen Platz.
 */
export function slotsAfterTrade(inv: ItemInstance[], out: Map<string, number>, incoming: Pick<ItemInstance, 'base'>[]): number {
  const stacks = new Set<string>();
  let used = 0;
  for (const it of inv) {
    const give = out.get(it.uid) ?? 0;
    if (give >= (it.qty ?? 1)) continue; // geht ganz weg
    used++;
    if (ITEMS[it.base]?.stack) stacks.add(it.base);
  }
  for (const it of incoming) {
    if (ITEMS[it.base]?.stack) { if (stacks.has(it.base)) continue; stacks.add(it.base); }
    used++;
  }
  return used;
}
export const invFits = (inv: ItemInstance[], out: Map<string, number>, incoming: Pick<ItemInstance, 'base'>[]) => slotsAfterTrade(inv, out, incoming) <= CFG.player.invSize;

// ------------------------------------------------------------------ Quest teilen
/** Lässt sich diese Quest überhaupt teilen? Hauptquests erzählt jeder selbst, Geheimquests muss man finden. */
export function shareBlock(q: QuestDef | undefined): string | null {
  if (!q) return 'Unbekannte Quest.';
  if (q.type === 'main') return 'Hauptquests erzählt die Geschichte jedem selbst – sie lassen sich nicht teilen.';
  if (q.hidden) return 'Geheimnisse muss jeder selbst finden.';
  return null;
}
/** Warum ein Mitglied eine geteilte Quest nicht annehmen kann (null = kann annehmen). Gleiche Prüfung wie beim Auftraggeber. */
export function shareTargetBlock(c: CharData, q: QuestDef): string | null {
  const st = c.quests[q.id];
  if (st?.s === 'active') return 'hat sie schon';
  if (st?.s === 'done' && q.type !== 'repeat' && q.type !== 'group') return 'hat sie schon erledigt';
  if (!questAvailable(c, q)) {
    const miss = (q.requires ?? []).find(r => c.quests[r]?.s !== 'done');
    return miss ? `braucht zuerst „${QUESTS[miss]?.name ?? miss}“` : 'erfüllt die Voraussetzungen noch nicht';
  }
  return null;
}

// ------------------------------------------------------------------ Gruppe: Regeln als Text (Gruppenfenster)
export const PARTY_RULES: [string, string][] = [
  ['Beute: jeder würfelt für sich', 'Gegenstände, Gold und Truhen sind persönlich. Niemand kann dir etwas wegnehmen – auch die Gruppentruhe füllt sich für jeden einzeln.'],
  ['Erfahrung und Fortschritt', `Wer in der Nähe ist, bekommt Erfahrung und Questfortschritt mit – plus ${Math.round(CFG.combat.partyXpBonus * 100)} % Erfahrung je weiterem Mitglied.`],
  ['Gruppentruhe', `Besiegt ihr einen Dungeon- oder Riss-Boss mit mindestens ${CFG.social.groupChest.min} Gruppenmitgliedern, erscheint eine zusätzliche Truhe.`],
  ['Anführer', 'Lädt ein, entfernt, ernennt einen Nachfolger und öffnet Mana-Risse. Ist er länger getrennt oder gefallen, geht die Führung weiter.'],
  ['Mana-Risse', 'Der Riss gehört der Gruppe. Wer sie im laufenden Riss verlässt oder entfernt wird, steht wieder am Riss-Stein. Während eines Bosskampfs wird niemand entfernt.'],
  ['Neuer Kreis', 'Die Gruppe spielt in der Welt ihres niedrigsten Kreises. Ändert sich die Gruppe, wechselt ihr in die passende Welt.'],
  ['Getrennt?', `Dein Charakter bleibt ${Math.round(CFG.net.reconnectGraceMs / 1000)} Sekunden stehen; dein Platz in der Gruppe bleibt ${Math.round(CFG.social.seatSec / 60)} Minuten frei.`],
  ['Gruppenchat', '„/p Text“ schreibt nur an deine Gruppe.'],
];
