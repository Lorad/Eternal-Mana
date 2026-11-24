/**
 * Tagesabläufe der NPCs (0.6): Stammplatz am Tag, Feierabend, Schlafplatz – manche mit Mittagspause.
 * Der Server bewegt die Figuren sichtbar zwischen den Stationen (server/src/world/routines.ts); Dienste, Quests und
 * Gespräche bleiben immer erreichbar. Wer schläft, antwortet trotzdem – mit `sleepLine`.
 * Nur NPCs ohne Story-Bedingung (`props.when`) bekommen einen Ablauf; was die Geschichte ein- und ausblendet, bleibt unberührt.
 */
export interface RoutineStop {
  /** ab dieser Stunde (0..24) */
  from: number;
  /** [POI, dx, dy] in Kacheln; fehlt = Stammplatz aus der Karte */
  at?: [string, number, number];
  sleep?: boolean;
  /** Begrüßung an dieser Station (statt einer zufälligen) */
  line?: string;
}
export interface RoutineDef { npc: string; zone: string; stops: RoutineStop[]; sleepLine?: string }

const R = (npc: string, zone: string, stops: RoutineStop[], sleepLine?: string): RoutineDef => ({ npc, zone, stops: [...stops].sort((a, b) => a.from - b.from), sleepLine });

export const ROUTINE_LIST: RoutineDef[] = [
  // ---- Quellhain
  R('mirelda', 'gruenwald', [{ from: 6 }, { from: 22, at: ['dorf', 8, -8], sleep: true }],
    'Schlafen? Ich ruhe die Augen aus. Seit drei Stunden. Was willst du?'),
  R('borin', 'gruenwald', [{ from: 6 }, { from: 19.5, at: ['dorf', -3, -6], line: 'Feierabend. Ich sitz hier nur. … Die Bank ist bequem. Das hat nichts mit ihr zu tun.' }, { from: 22.5, at: ['dorf', -12, 3], sleep: true }],
    '… Hm. Nacht. Die Esse ist kalt. Mach schnell.'),
  R('sella', 'gruenwald', [{ from: 7 }, { from: 21, at: ['dorf', 5, 14], sleep: true }],
    'Nachtzuschlag! … Nein, Spaß. Doch nicht. Was brauchst du?'),
  R('fenwick', 'gruenwald', [{ from: 7 },
    { from: 12.5, at: ['dorf', 6, 4], line: 'Mittag! Sella sagt, ich soll essen. Ich habe gefragt, was. Sie hat mir einen Preis genannt.' }, { from: 14 },
    { from: 23, at: ['dorf', 2, 3], line: 'Pst. Nachts singt er am deutlichsten. Der Brunnen. Ich schreibe mit. Halt mal die Kerze – nein, die andere.' }]),
  R('tobi', 'gruenwald', [{ from: 7 }, { from: 12, at: ['dorf', 0, 10], line: 'Ich löse Edda ab! Für zehn Minuten! Geh weiter, Bürger, hier gibt es nichts zu sehen.' }, { from: 13.5 }, { from: 20, at: ['dorf', -7, 14], sleep: true }],
    'Ich schlaf gar nicht! Ritter schlafen nie! … Sag’s nicht Mama.'),
  R('ayla', 'gruenwald', [{ from: 5.5 }, { from: 18.5, at: ['dorf', 3, -4], line: 'Feuer brennt, Topf steht. Wenn du was zu braten hast: jetzt.' }, { from: 23.5, at: ['dorf', 9, -8], sleep: true }],
    'Du schleichst wie ein Fass, das eine Treppe hinunterfällt. Ich bin wach. Jetzt.'),
  // ---- Grubenlager
  R('hedda', 'kristall', [{ from: 5 }, { from: 20, at: ['lager', -1, 1], line: 'Schicht ist rum. Am Feuer wird nicht über Arbeit geredet. … Was macht Stollen sieben?' }, { from: 23, at: ['lager', -5, 3], sleep: true }],
    'Schicht ist in vier Stunden. Wenn der Berg nicht brennt, fass dich kurz.'),
  // ---- Aschenrast
  R('rakhan', 'glut', [{ from: 6 }, { from: 19, at: ['lager', 1, 1], line: 'Abends erzählt das Feuer. Man muss nur zuhören. Und Holz nachlegen, sonst schmollt es.' }, { from: 23, at: ['lager', -5, 0], sleep: true }],
    'Die Asche schläft nie. Ich schon. Sprich leise, sie hört mit.'),
  R('kelda', 'glut', [{ from: 6 }, { from: 22, at: ['lager', 6, 4], sleep: true }],
    'Wenn’s nicht glüht, hat’s Zeit bis morgen. … Na gut. Zeig her.'),
  // ---- Jorunds Hütte
  R('jorund', 'frost', [{ from: 6.5 }, { from: 12, at: ['lager', -1, 1], line: 'Teezeit. Der Kessel besteht darauf. Er ist da sehr genau.' }, { from: 14 }, { from: 21, at: ['lager', -7, -2], sleep: true }],
    '… was? Der Kessel hat Nachtruhe. Ich auch. Aber er ist nachtragender.'),
  R('inga', 'frost', [{ from: 6 }, { from: 19, at: ['lager', 1, 1], line: 'Wetten, dass der Eintopf heute nach Flechte schmeckt? … Ich gewinne jeden Abend.' }, { from: 23, at: ['lager', -8, -2], sleep: true }],
    'Wetten, du weckst mich nie wieder? … Was gibt’s.'),
  // ---- Grabungslager
  R('liora', 'ruinen', [{ from: 6 }, { from: 12, at: ['lager', 5, 0], line: 'Nicht auf den Tisch stützen! Das ist kein Tisch, das ist eine Fundlage mit Beinen.' }, { from: 14 }, { from: 23.5, at: ['lager', -6, 0], sleep: true }],
    'WAS? Ist was eingestürzt? Nein? Ist was GEFUNDEN worden? Nein? … Dann mach schnell.'),
  R('sen', 'ruinen', [{ from: 6 }, { from: 19.5, at: ['lager', 8, 3], line: 'Sonnenuntergang. Meine Wache ist beendet. Ich warte hier nur noch einen Augenblick auf Hüter Morvain. Er wollte gleich zurück sein.' }]),
  // ---- Letztes Licht
  R('maelis', 'schatten', [{ from: 6 }, { from: 20, at: ['lager', 1, 2], line: 'Wenn es dunkler wird, rücke ich näher ans Licht. Es wird hier nie dunkler. Ich rücke trotzdem.' }]),
];
export const ROUTINES_BY_ZONE: Record<string, RoutineDef[]> = {};
for (const r of ROUTINE_LIST) (ROUTINES_BY_ZONE[r.zone] ??= []).push(r);

/** Index der Station, die zu dieser Tageszeit (0..1) gilt */
export function routineIndex(def: RoutineDef, tod: number): number {
  const h = (((tod % 1) + 1) % 1) * 24;
  let idx = def.stops.length - 1;
  for (let i = 0; i < def.stops.length; i++) if (h >= def.stops[i].from) idx = i;
  return idx;
}
export function routineOf(zone: string, npc: string): RoutineDef | undefined { return ROUTINES_BY_ZONE[zone]?.find(r => r.npc === npc); }
/** Zustand eines NPCs zu dieser Tageszeit: schläft er, und was sagt er zur Begrüßung? */
export function routineState(zone: string, npc: string, tod: number): { sleep: boolean; line?: string } {
  const def = routineOf(zone, npc);
  if (!def) return { sleep: false };
  const st = def.stops[routineIndex(def, tod)];
  return { sleep: !!st.sleep, line: st.sleep ? def.sleepLine : st.line };
}
