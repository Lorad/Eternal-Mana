/**
 * Quellwarte (0.9): das Gerüchtebrett im Gasthaus. Jedes Gerücht zeigt auf etwas, das es wirklich gibt – ein Geheimnis
 * einer Region, ein seltenes Monster, einen Weltboss, ein Ereignis, eine Geheimquest. Daten, keine Logik: welches Ziel
 * existiert, prüft `rumourTarget` (und tests/hub.test.ts für jedes Gerücht); welche hängen, wählt `boardRumours` je Tag.
 *
 * Für spätere geheime Expeditionen: Gerüchte der Art `expedition` zeigen auf eine ID aus SECRET_EXPEDITIONS. Die Expeditionen
 * tragen dort ihre geheimen Dungeons ein; solange die Liste leer ist, gibt es keine solchen Gerüchte.
 */
import type { CharData } from '../types';
import { EVENTS } from './events';
import { QUESTS } from './quests';
import { RARES, WORLD_BOSSES } from './rares';
import { ZONES } from './zones';

export type RumourKind = 'secret' | 'rare' | 'wboss' | 'event' | 'quest' | 'expedition';
export interface Rumour {
  id: string; kind: RumourKind;
  /** Ziel: POI-ID (secret), Kennung des seltenen Monsters, Weltbosses, Ereignisses, der Quest oder Expedition */
  ref: string;
  /** Region (secret, event) */
  zone?: string;
  /** wer es erzählt hat (Unterschrift auf dem Zettel) */
  who: string;
  text: string;
  /** ab welcher Stufe es aushängt (sonst wäre es eine Einladung zum Sterben) */
  level: number;
}
/** IDs geheimer Expeditionen, auf die Gerüchte zeigen dürfen (füllen die Expeditionen) */
export const SECRET_EXPEDITIONS: string[] = [];
export const RUMOUR_KIND_NAME: Record<RumourKind, string> = { secret: 'Verborgener Ort', rare: 'Seltenes Wesen', wboss: 'Weltboss', event: 'Ereignis', quest: 'Geheimnis', expedition: 'Geheime Expedition' };

const R = (r: Rumour) => r;
export const RUMOURS: Rumour[] = [
  // ---- verborgene Orte (Felsblockade in Richtung eines Ortes, dahinter Truhe und Quellsplitter)
  R({ id: 'g_hain1', kind: 'secret', ref: 'hain1', zone: 'gruenwald', level: 2, who: 'ein Holzfäller', text: 'Nordöstlich vom Pass hinauf ins Gebirge steht ein Felsen, der hohl klingt, wenn man dagegen tritt. Ich habe nicht nachgesehen. Ich hatte Angst vor dem Felsen.' }),
  R({ id: 'g_hain2', kind: 'secret', ref: 'hain2', zone: 'gruenwald', level: 2, who: 'Tobi (sagt er)', text: 'Hinter dem Holzfällerlager, ganz im Südwesten, gibt es einen geheimen Hain! Mit einem Schatz! Ich war da! Fast! Erzähl es keinem!' }),
  R({ id: 'k_nische1', kind: 'secret', ref: 'nische1', zone: 'kristall', level: 6, who: 'Heddas Vorarbeiter', text: 'Nordwestlich der großen Kristallhalle ist ein Stollen, der auf keiner Karte steht. Vermauert. Schlecht vermauert.' }),
  R({ id: 'k_nische2', kind: 'secret', ref: 'nische2', zone: 'kristall', level: 6, who: 'Pim', text: 'Pim hat hinter dem Spiegelsee etwas glitzern sehen! Östlich! Hinter Steinen! Pim war zu beschäftigt zum Graben. Pim war beim Weglaufen.' }),
  R({ id: 'gl_kessel1', kind: 'secret', ref: 'kessel1', zone: 'glut', level: 11, who: 'ein Aschennomade', text: 'Westlich der Mitte der Glutlande atmet der Fels. Rakhan sagt, dort liegt ein Kessel, den die Asche versteckt hat. Rakhan sagt viel.' }),
  R({ id: 'gl_kessel2', kind: 'secret', ref: 'kessel2', zone: 'glut', level: 11, who: 'Kelda', text: 'Nordöstlich vom Krater hört man Metall singen, wenn der Wind steht. Da liegt was. Ich hab keine Zeit. Du schon.' }),
  R({ id: 'f_klamm1', kind: 'secret', ref: 'klamm1', zone: 'frost', level: 16, who: 'Inga', text: 'Wetten, du findest die Klamm südöstlich vom Gefrorenen See nicht? Ich setze zehn Felle. Ich habe sie auch nicht gefunden.' }),
  R({ id: 'f_klamm2', kind: 'secret', ref: 'klamm2', zone: 'frost', level: 16, who: 'Jorund', text: 'Westlich unter dem Grat gibt es eine zweite Klamm. Der Kessel und ich waren einmal dort. Der Kessel hat sich erkältet.' }),
  R({ id: 'r_kammer1', kind: 'secret', ref: 'kammer1', zone: 'ruinen', level: 21, who: 'Liora', text: 'Ganz im Nordwesten der Ruinen, hinter dem Archiv: eine Kammer, die in keinem Grundriss steht. Ich habe es aufgeschrieben, damit ich nicht allein hingehe.' }),
  R({ id: 'r_kammer2', kind: 'secret', ref: 'kammer2', zone: 'ruinen', level: 21, who: 'Sen', text: 'Südöstlich der Gärten gab es zu meiner Zeit einen Weinkeller. Hüter Morvain ging oft hinein. Er sagte, um nachzudenken. Er kam immer sehr nachdenklich heraus.' }),
  R({ id: 's_riss1', kind: 'secret', ref: 'riss1', zone: 'schatten', level: 26, who: 'Maelis', text: 'Im Südwesten, ganz am Rand, ist ein Riss, durch den man nach draußen sehen kann. Ich schaue manchmal hindurch. Draußen ist es hell.' }),
  R({ id: 's_riss2', kind: 'secret', ref: 'riss2', zone: 'schatten', level: 26, who: 'eine Stimme ohne Absender', text: 'Nordöstlich, wo der Osten aufhört, liegt etwas, das jemand vergessen hat. Nicht verloren. Vergessen. Das ist ein Unterschied.' }),
  R({ id: 'q_tiefe1', kind: 'secret', ref: 'tiefe1', zone: 'quellgrund', level: 35, who: 'Pim', text: 'Südwestlich der Atembecken im Quellgrund! Ein Loch! Ein tiefes! Pim hat einen Stein hineingeworfen. Er kommt immer noch nicht unten an.' }),
  // ---- seltene Monster
  R({ id: 'm_borken', kind: 'rare', ref: 'borkenkoenig', level: 4, who: 'Ayla', text: 'Im Grünwald trägt ein Dornkäfer eine Krone aus Rinde. Er schützt sich mit einem Schild aus Borke. Ich jage ihn seit drei Wochen. Er mich auch.' }),
  R({ id: 'm_fliegenhut', kind: 'rare', ref: 'fliegenhut', level: 4, who: 'Sella', text: 'Nachts geht im Grünwald ein uralter Pilz spazieren. Mit Gefolge. Wer ihn erntet, braut drei Wochen lang die besten Tränke. Sagt man.' }),
  R({ id: 'm_echo', kind: 'rare', ref: 'tante_echo', level: 9, who: 'Hedda', text: 'In den Höhlen fliegt eine Fledermaus, die wütender wird, je länger man kämpft. Wir nennen sie Tante Echo. Niemand weiß, wessen Tante.' }),
  R({ id: 'm_guenther', kind: 'rare', ref: 'guenther', level: 9, who: 'ein Kumpel aus Stollen sieben', text: 'Günther der Kleine ist zurück. Der Koloss hatte wohl einen Sohn. Er zerfällt in Krabbler, wenn man draufhaut. Hau trotzdem drauf.' }),
  R({ id: 'm_russ', kind: 'rare', ref: 'meister_russ', level: 14, who: 'Rakhan', text: 'Wenn Asche fällt, kommt Meister Ruß. Ein Kobold, der Feuerbälle wirft wie andere Leute Ausreden. Gute Ausreden.' }),
  R({ id: 'm_glucke', kind: 'rare', ref: 'glucke', level: 14, who: 'Kelda', text: 'In den Glutlanden brütet ein Magmaschleim und lässt eine brennende Spur hinter sich. Wir nennen ihn die Glucke. Sie ist sehr fürsorglich. Zu ihren Eiern.' }),
  R({ id: 'm_reif', kind: 'rare', ref: 'altvater_reif', level: 19, who: 'Jorund', text: 'Bei Schnee steigt Altvater Reif vom Grat. Ein Riese aus Frost, älter als ich. Er riecht nach Winter und schlechter Laune.' }),
  R({ id: 'm_nordlicht', kind: 'rare', ref: 'nordlicht', level: 19, who: 'Inga', text: 'Nachts, wenn die Sterne fallen, tanzt ein Irrlicht über die Gipfel. Es springt. Es lacht. Wer es fängt, gewinnt meine Wette. Ich habe sie mit mir selbst abgeschlossen.' }),
  R({ id: 'm_quill', kind: 'rare', ref: 'quill', level: 24, who: 'Liora', text: 'Ein Arkanauge mit Brille! In den Ruinen! Es heilt sich selbst, während es dich anstarrt. Ich wollte es interviewen. Es wollte das nicht.' }),
  R({ id: 'm_sockel', kind: 'rare', ref: 'sockel', level: 24, who: 'Sen', text: 'Auf dem Platz der Hüter steht ein Standbild auf dem falschen Sockel. Manchmal steigt es herunter, um es zu ändern. Bleibt ihm dann fern.' }),
  R({ id: 'm_stunde', kind: 'rare', ref: 'stunde', level: 29, who: 'Maelis', text: 'Es gibt hier eine Stunde, die verloren gegangen ist. Sie rennt herum und sucht sich. Wenn sie dich findet, hält sie dich für sich.' }),
  R({ id: 'm_hohlprinz', kind: 'rare', ref: 'hohlprinz', level: 29, who: 'Rudger', text: 'Im Schattenreich reitet ein Prinz ohne Land. Er trägt die Rüstung eines Hohlen Ritters und das Gesicht eines Mannes, der noch Hoffnung hat. Das ist die gefährlichere Hälfte.' }),
  // ---- Weltbosse
  R({ id: 'w_moos', kind: 'wboss', ref: 'moosgrimm', level: 6, who: 'Alrik', text: 'Manchmal steht im Grünwald ein Hügel auf und geht spazieren. Moosgrimm. Wenn er durchs Dorf will, braucht ihr mehr als einen Quellgänger. Viel mehr.' }),
  R({ id: 'w_aschenmaul', kind: 'wboss', ref: 'aschenmaul', level: 15, who: 'Rakhan', text: 'Wenn die Nomaden ihre Feuer löschen, jagt Aschenmaul. Ein Hund aus Glut, groß wie ein Zelt. Geht nicht allein. Geht gar nicht, wenn es geht.' }),
  R({ id: 'w_niemand', kind: 'wboss', ref: 'niemand', level: 24, who: 'Rudger', text: 'Feldwebel Niemand ruft zum Appell, und eine Armee, die es nicht mehr gibt, tritt an. Ich habe einmal geantwortet. Aus Gewohnheit. Es war ein Fehler.' }),
  // ---- Ereignisse
  R({ id: 'e_sterne', kind: 'event', ref: 'sterne', zone: 'gruenwald', level: 3, who: 'Fenwick', text: 'Klare Nächte, und es fallen Sterne. Wer die Splitter einsammelt, bevor sie verglühen, hat etwas für die Schmiede. Ich zähle sie. Es fehlen immer welche.' }),
  R({ id: 'e_einsturz', kind: 'event', ref: 'einsturz', zone: 'kristall', level: 7, who: 'Hedda', text: 'Wenn der Berg aufhört zu singen, kracht es. Dann sind Kumpel verschüttet. Wer hilft, bekommt einen Schnaps. Und meine Achtung. Der Schnaps ist besser.' }),
  R({ id: 'e_aschesturm', kind: 'event', ref: 'aschesturm', zone: 'glut', level: 12, who: 'ein Aschennomade', text: 'Im Auge des Aschesturms tanzen Teufel. Wer sie vertreibt, findet danach seltsame Dinge in der Asche. Wir fragen nicht, wo sie herkommen.' }),
  R({ id: 'e_jagd', kind: 'event', ref: 'jagd', zone: 'frost', level: 17, who: 'Inga', text: 'Im Schneesturm heult der Weiße Leitwolf. Wer ihn stellt, gewinnt meine Wette. Wer mich fragt, welche Wette: Es gibt immer eine.' }),
  R({ id: 'e_haendler', kind: 'event', ref: 'haendler', zone: 'gruenwald', level: 3, who: 'Ottmar (verstimmt)', text: 'Vesna Langweg zieht mit ihrem Karren durch die Regionen und verkauft Dinge, die ich nicht habe. Ich verbiete hiermit, bei ihr zu kaufen. Hat nie gewirkt.' }),
  // ---- Geheimquests
  R({ id: 'x_arm', kind: 'quest', ref: 'x_arm', level: 3, who: 'Tobi', text: 'Herr Splitter hat seinen Arm verloren! Im versteckten Hain! Wer ihn findet, ist ein Held! Ein kleiner. Wie der Arm.' }),
  R({ id: 'x_karl', kind: 'quest', ref: 'x_karl', level: 8, who: 'Hedda (gebrüllt, aufgeschrieben von Hanne)', text: 'KARL! WENN DU DAS LIEST: KOMM ZURÜCK! … Wer Karl sieht: hinter dem Spiegelsee hat er sich schon einmal verlaufen.' }),
  R({ id: 'x_guss', kind: 'quest', ref: 'x_guss', level: 30, who: 'Rakhan', text: 'Am Krater gibt es einen siebten Kreis, ausgekratzt. Meine Großmutter verbot uns, dort zu spielen. „Dort hat einer noch nicht Feierabend“, sagte sie.' }),
  R({ id: 'x_seite', kind: 'quest', ref: 'x_seite', level: 28, who: 'Liora', text: 'Aus dem Protokoll im Archiv der Stille fehlt eine Zeile. Wer etwas so sorgfältig herausschneidet, wirft es nicht weg. Er versteckt es.' }),
  R({ id: 'x_wiegenlied', kind: 'quest', ref: 'x_wiegenlied', level: 28, who: 'Merle', text: 'Es gibt ein Wiegenlied mit vier Tönen, über die Welt verstreut. Am Gipfel, in einem Garten, im Westen des Schattens. Den vierten singt das Wasser.' }),
];
export const RUMOUR: Record<string, Rumour> = Object.fromEntries(RUMOURS.map(r => [r.id, r]));

/** Gibt es das, worauf das Gerücht zeigt? */
export function rumourTarget(r: Rumour): boolean {
  switch (r.kind) {
    case 'secret': return !!ZONES[r.zone ?? '']?.pois?.some(p => p.id === r.ref && p.kind === 'secret');
    case 'rare': return !!RARES[r.ref];
    case 'wboss': return !!WORLD_BOSSES[r.ref];
    case 'event': return !!(EVENTS as Record<string, unknown>)[r.ref] && !!ZONES[r.zone ?? ''];
    case 'quest': return !!QUESTS[r.ref]?.hidden;
    case 'expedition': return SECRET_EXPEDITIONS.includes(r.ref);
  }
  return false;
}
/** Region, in der das Ziel liegt (für die Anzeige) */
export function rumourZone(r: Rumour): string | undefined {
  if (r.zone) return r.zone;
  if (r.kind === 'rare') return RARES[r.ref]?.zone;
  if (r.kind === 'wboss') return WORLD_BOSSES[r.ref]?.zones[0];
  if (r.kind === 'quest') return QUESTS[r.ref]?.zone;
  return undefined;
}
/** Hat dieser Charakter das schon erledigt (dann hängt das Gerücht nicht mehr für ihn)? */
export function rumourDone(c: CharData, r: Rumour): boolean {
  switch (r.kind) {
    case 'secret': {
      const idx = ZONES[r.zone!]?.pois?.filter(p => p.kind === 'secret').findIndex(p => p.id === r.ref) ?? -1;
      return idx >= 0 && !!c.flags[`s:${r.zone}:shard${idx}`];
    }
    case 'rare': return !!c.flags[`rk:${r.ref}`];
    case 'wboss': return !!c.flags[`wb:${r.ref}`];
    case 'quest': return c.quests[r.ref]?.s === 'done';
    default: return false;
  }
}
/** Zettel am Brett: je Tag eine andere Auswahl aus den Gerüchten, die zur Stufe passen und noch offen sind. */
export function boardRumours(c: CharData, day: number, n = 5): Rumour[] {
  const open = RUMOURS.filter(r => r.level <= c.level + 2 && rumourTarget(r) && !rumourDone(c, r));
  const key = (r: Rumour) => { let h = 2166136261 ^ day; for (let i = 0; i < r.id.length; i++) h = Math.imul(h ^ r.id.charCodeAt(i), 16777619); return h >>> 0; };
  return open.sort((a, b) => key(a) - key(b)).slice(0, n);
}
