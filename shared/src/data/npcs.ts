import type { ClassId, ItemInstance } from '../types';
import { Rng, strHash } from '../util/rng';
import type { Cond } from './cond';
import { generateGear, makeStack } from './items';
import { NPCS_AKT2, TALK_AKT2 } from './npcs_akt2';
import { NPCS_WELT } from './npcs_welt';

export type { Cond };
export interface NpcDef {
  id: string;
  name: string;
  title: string;
  look: string;
  /** Zufällige Begrüßungen */
  greet: string[];
  /** Kontextzeilen – die erste passende wird statt einer Begrüßung gezeigt */
  talk?: { if: Cond; text: string }[];
  shop?: { items: string[]; gearLevel?: number };
  services?: ('upgrade' | 'respec')[];
  /** Einfärbung / Durchsichtigkeit des wiederverwendeten Looks (ab 0.3) */
  tint?: number; alpha?: number;
}

const N = (n: NpcDef) => n;
export const NPC_LIST: NpcDef[] = [
  N({ id: 'mirelda', name: 'Mirelda', title: 'Älteste von Quellhain', look: 'aelteste',
    greet: ['Na, Quellgänger? Steh nicht so trocken herum.', 'Das Wasser redet heute viel. Meistens über dich.', 'Setz dich. Oder kämpf gegen etwas. Hauptsache, du stehst mir nicht im Licht.'],
    talk: [
      { if: { done: 'm_koenig' }, text: 'Hörst du das? Der Brunnen singt wieder. Ich hatte vergessen, dass er falsch singt. Wunderbar falsch.' },
      { if: { done: 'm_archivar' }, text: 'Fünf Siegel. Ich habe in achtzig Jahren keins gesehen, und du trägst sie herum wie Kieselsteine.' },
      { if: { done: 'm_wurzel' }, text: 'Die Wurzeln unter dem Dorf sind ruhiger geworden. Ich schlafe wieder – gegen meinen Willen, in meinem Alter ist das Zeitverschwendung.' },
    ] }),
  N({ id: 'borin', name: 'Borin', title: 'Schmied', look: 'schmied',
    greet: ['Hm.', 'Wenn’s stumpf ist, bring’s her. Wenn’s kaputt ist, bring’s auch her. Wenn’s ein Käfer ist: draußen bleiben.', 'Gutes Eisen lügt nicht. Leute schon.'],
    talk: [{ if: { done: 'm_koenig' }, text: 'Hab gehört, was du getan hast. … Die nächste Verbesserung geht aufs Haus. Nein, doch nicht. Aber ich hab kurz drüber nachgedacht.' }],
    shop: { items: [], gearLevel: 2 }, services: ['upgrade'] }),
  N({ id: 'sella', name: 'Sella', title: 'Händlerin', look: 'haendlerin',
    greet: ['Sonderpreis! Nur heute! Wie gestern auch!', 'Du siehst aus, als bräuchtest du einen Trank. Oder zwölf.', 'Ich verkaufe nichts, was ich nicht selbst trinken würde. Gut, fast nichts.'],
    shop: { items: ['potion_hp1', 'potion_mp1', 'potion_hp2', 'potion_mp2', 'food_bread'] } }),
  N({ id: 'fenwick', name: 'Fenwick', title: 'Gelehrter', look: 'gelehrter',
    greet: ['Ah! Du bist – nein, sag nichts – der Bäcker? Nein. Egal. Setz dich nicht auf die Notizen.', 'Wusstest du, dass Quellsplitter summen? In Fis. Meistens.', 'Ich habe drei Theorien über dich. Zwei davon sind schmeichelhaft.'],
    talk: [{ if: { done: 'm_koenig' }, text: 'Morvain. Der siebte Hüter. Ich habe ihn in jeder Chronik für einen Schreibfehler gehalten. Ich muss sehr viele Fußnoten ändern.' }],
    services: ['respec'] }),
  N({ id: 'tobi', name: 'Tobi', title: 'Zukünftiger Held', look: 'kind',
    greet: ['Hast du heute schon ein Monster besiegt? Ich schon. Im Kopf.', 'Wenn ich groß bin, werd ich Quellgänger! Oder Bäcker. Bäcker kriegen Brot.', 'Psst. Mirelda schnarcht. Sag ihr nicht, dass ich das gesagt hab.'] }),
  N({ id: 'ayla', name: 'Ayla', title: 'Jägerin', look: 'jaegerin',
    greet: ['Leise. Du trampelst wie ein Schlackengolem.', 'Der Wald war mal still. Jetzt knurrt er.', 'Am Brett hängen Aufträge. Lesen kannst du?'] }),
  N({ id: 'wache', name: 'Edda', title: 'Dorfwache', look: 'wache',
    greet: ['Halt, wer – ach, du. Geh durch.', 'Seit drei Tagen ist nichts passiert. Ich zähle Blätter.', 'Wenn du Wölfe siehst: Sie haben angefangen.'] }),
  N({ id: 'hedda', name: 'Hedda', title: 'Grubenmeisterin', look: 'bergfrau',
    greet: ['Kopf einziehen, Augen auf, nichts ablecken. Willkommen im Berg.', 'Schlackendreck, wer hat die Lampen umgestellt?!', 'Der Berg singt. Wenn er aufhört: rennen.'],
    talk: [{ if: { done: 'm_koloss' }, text: 'Der Stollen nach Süden ist frei. Dahinter wird’s warm. Sehr warm. Viel Spaß, ich bleib hier.' }] }),
  N({ id: 'pim', name: 'Pim', title: 'Wanderkrämer', look: 'kraemer',
    greet: ['Pim war zuerst hier! Pim ist immer zuerst hier!', 'Frag nicht, wie ich den Rucksack durch den Stollen gekriegt hab.', 'Alles muss raus! Vor allem ich – es ist unheimlich hier.'],
    shop: { items: ['potion_hp1', 'potion_mp1', 'potion_hp2', 'potion_mp2', 'potion_hp3', 'potion_mp3', 'elixir'], gearLevel: -1 }, services: ['upgrade'] }),
  N({ id: 'rakhan', name: 'Rakhan', title: 'Aschennomade', look: 'nomade',
    greet: ['Die Asche vergisst nichts. Tritt leicht auf.', 'Wer das Feuer fürchtet, friert. Wer es liebt, brennt. Halte Abstand.', 'Wasser? Hier? Ein guter Witz. Erzähl ihn nicht weiter.'],
    talk: [{ if: { done: 'm_glut' }, text: 'Der Wurm schweigt. Zum ersten Mal seit meiner Geburt höre ich den Wind.' }] }),
  N({ id: 'jorund', name: 'Jorund', title: 'Einsiedler', look: 'einsiedler',
    greet: ['Noch einer. Der Berg wird zum Marktplatz.', 'Tee? Er ist aus Flechten. Er schmeckt nach Flechten.', '… was? Ich habe mit dem Kessel gesprochen, nicht mit dir.'],
    talk: [{ if: { done: 'm_ysolde' }, text: 'Sie war meine Schülerin, weißt du. Ysolde. Ich habe ihr beigebracht, dass Ordnung schützt. Ich hätte ihr auch beibringen sollen, wann man aufhört.' }] }),
  N({ id: 'inga', name: 'Inga', title: 'Fellhändlerin', look: 'fellhaendlerin',
    greet: ['Wetten, du hältst keine Nacht hier oben durch?', 'Gute Felle, ehrliche Preise. Eins davon stimmt.', 'Jorund redet mit seinem Kessel. Der Kessel ist der Vernünftigere.'],
    shop: { items: ['potion_hp2', 'potion_mp2', 'potion_hp3', 'potion_mp3', 'food_bread'], gearLevel: 18 } }),
  N({ id: 'liora', name: 'Liora', title: 'Archäologin', look: 'archaeologin',
    greet: ['Nicht bewegen! Du stehst auf einem – nein, doch nur ein Stein. Weitermachen.', 'Sechs Statuen, sieben Sockel. SIEBEN. Ich liebe diesen Ort.', 'Wenn ich schreie, ist das Begeisterung. Meistens.'],
    talk: [{ if: { done: 'm_archivar' }, text: 'Das Tor reagiert auf die Siegel! Ich würde ja mitkommen, aber jemand muss das hier aufschreiben. Und überleben.' }] }),
  N({ id: 'sen', name: 'Sen', title: 'Wächter der Schwelle', look: 'geist',
    greet: ['Seid gegrüßt, Reisender. Meine Wache endet bei Sonnenuntergang. Sie endet seit vierhundert Jahren bei Sonnenuntergang.', 'Habt Ihr Hüter Morvain gesehen? Er wollte nur kurz zur Quelle.', 'Verzeiht die Kälte. Man sagt mir, sie gehe von mir aus.'] }),
  N({ id: 'maelis', name: 'Maelis', title: 'Ein Echo', look: 'echo',
    greet: ['Du bist warm. Das ist schön. Hier ist sonst nichts warm.', 'Ich bin nicht ganz hier. Aber ich bin gern bei dir nicht ganz hier.', 'Vater sagt, ich soll nicht mit Fremden sprechen. Vater sagt seit langer Zeit gar nichts mehr.'],
    talk: [{ if: { done: 'm_koenig' }, text: 'Es fließt wieder. Ich spüre, wie ich leichter werde. Das ist nicht traurig. Sag ihm – nein. Er weiß es jetzt.' }] }),
];
// Akt II (0.3): neue Figuren; zusätzliche Kontextzeilen stehen vor den bisherigen (erste passende gewinnt)
NPC_LIST.push(...NPCS_AKT2);
NPC_LIST.push(...NPCS_WELT); // Lebendige Welt (0.6): stehen nur zeitweise in der Welt
for (const n of NPC_LIST) if (TALK_AKT2[n.id]) n.talk = [...TALK_AKT2[n.id], ...(n.talk ?? [])];
export const NPCS: Record<string, NpcDef> = Object.fromEntries(NPC_LIST.map(n => [n.id, n]));

export interface ShopEntry { item: ItemInstance; price: number }

/** Deterministisches Sortiment eines Händlers für eine Klasse. `zoneLevel` bestimmt bei Wanderhändlern die Ausrüstungsstufe. */
export function shopStock(npcId: string, cls: ClassId, zoneLevel: number): ShopEntry[] {
  const npc = NPCS[npcId];
  if (!npc?.shop) return [];
  const out: ShopEntry[] = [];
  for (const id of npc.shop.items) { const it = makeStack(id, 1); it.uid = 'shop'; out.push({ item: it, price: 0 }); }
  const gl = npc.shop.gearLevel;
  if (gl !== undefined) {
    const lvl = gl < 0 ? zoneLevel : gl;
    const rng = new Rng(strHash(npcId + cls + lvl));
    for (const kind of ['weapon', 'helm', 'armor', 'accessory'] as const) {
      const it = generateGear(rng, lvl, kind === 'accessory' ? 1 : 0, cls, kind);
      delete it.element;
      it.uid = 'shop';
      out.push({ item: it, price: 0 });
    }
  }
  return out;
}
