/**
 * AKT II (0.3): neue Figuren und zusätzliche Kontextzeilen der bestehenden NPCs.
 * Die Kontextzeilen werden in npcs.ts VOR die vorhandenen gestellt (die erste passende Zeile gewinnt) –
 * so ändern sich die Begrüßungen mit Kapitel, Charakterquests und Entscheidungen.
 */
import type { Cond } from './cond';
import type { NpcDef } from './npcs';

export const NPCS_AKT2: NpcDef[] = [
  { id: 'fremder', name: 'Fremder', title: 'am Brunnen', look: 'einsiedler', tint: 0x7c6cc0, alpha: 0.78,
    greet: ['Guten Abend. Oder Morgen. Ich verwechsle das.', 'Verzeiht, stehe ich im Weg? Ich stehe meistens im Weg. Es ist gewissermaßen mein Beruf.', 'Euer Brunnen singt falsch. Das ist kein Tadel. Er singt, so gut er kann.'],
    talk: [
      { if: { done: 'm_sitze' }, text: 'Ihr habt sie gehört. Dann wisst Ihr jetzt mehr über mich, als mir lieb ist, und weniger, als nötig wäre.' },
      { if: { done: 'm_name' }, text: 'Es hat seinen Namen gehört. Aus Eurem Brunnen, mit Eurer Stimme im Rücken. Verzeiht, wenn ich einen Moment brauche.' },
    ] },
  { id: 'vael', name: 'Vael', title: 'Hüter der Dunkelheit', look: 'einsiedler', tint: 0xb4a8e6,
    greet: ['Guten Abend. Hier ist immer Abend. Das vereinfacht die Begrüßung.', 'Verzeiht die Laterne. Ich lege sie nicht gern ab. Wir sind lange zusammen.', 'Sprecht ruhig laut. Es schläft tief. Meistens.'],
    talk: [
      { if: { dec: ['ende', 3] }, text: 'Verzeiht, wenn ich blinzle. Es ist nicht das Licht. Es ist die Menge davon.' },
      { if: { dec: ['ende', 1] }, text: 'Ich bleibe. Schaut nicht so mitleidig – diesmal habe ich es mir ausgesucht. Das ändert an einem Stuhl mehr, als Ihr denkt.' },
      { if: { flag: 'q:vael_zeuge', done: 'm_pruefung' }, text: 'Zeuge. Ich habe das Wort an die Wand geschrieben, neben die Striche. Es steht dort allein. Es braucht keine Gesellschaft.' },
      { if: { flag: 'b:vael' }, text: 'Ihr habt bestanden. Ich habe nachgezählt: Ihr seid der Erste in tausend Jahren. Ihr seid allerdings auch der Erste, der es versucht hat.' },
    ] },
  { id: 'kelda', name: 'Kelda', title: 'Schmiedin der Aschenrast', look: 'nomade', tint: 0xc4d2e8,
    greet: ['Wenn’s stumpf ist, leg’s hin. Wenn’s kaputt ist, leg’s daneben. Wenn du nur gucken willst: Guck leise.', 'Gutes Eisen lügt nicht. Hat mal einer gesagt. Der hat sonst nicht viel gesagt.', 'Die Asche frisst alles. Ich flicke schneller, als sie frisst. Knapp.'],
    talk: [
      { if: { dec: ['rakhan', 1] }, text: 'Kharrad kriegt eine Esse. Eine richtige. Rakhan mauert wie ein Dichter, aber ich bring’s ihm bei.' },
      { if: { done: 'c_borin_3' }, text: 'Im Frühjahr geh ich nach Norden. Für zwei Wochen. Wegen einer Naht. Frag nicht.' },
    ] },
  { id: 'aetherion', name: 'Aetherion', title: 'Der Träumer am Grund', look: 'echo', tint: 0x9fe8ff,
    greet: ['… ♪ …', '♪ … du. Splitter. Warm.', '… Hände … ♪ …'],
    talk: [
      { if: { dec: ['ende', 3] }, text: '♪ … Guten … Morgen. (Das Wasser um deine Knöchel wird warm.)' },
      { if: { dec: ['ende', 2] }, text: '♪♪♪ … (Es ist überall zugleich. Es hat keine Zeit für Worte. Es hat sehr viel nachzuholen.)' },
      { if: { dec: ['ende', 1] }, text: '… ♪ … (Es schläft. Es träumt nicht mehr vom Hammer. Es träumt von einer Schaukel.)' },
    ] },
];

type Line = { if: Cond; text: string };
const E = (v: number): Cond => ({ dec: ['ende', v] });
const ENDE: Cond = { decided: 'ende' };

export const TALK_AKT2: Record<string, Line[]> = {
  mirelda: [
    { if: E(3), text: 'Ich sage ihm jeden Morgen „Guten Morgen“. Er antwortet. Ich bin achtundachtzig und habe einen Brieffreund im Brunnen.' },
    { if: E(2), text: 'Mein Kräuterbeet ist über Nacht ein Wald geworden. Ein kleiner. Er ist frech. Ich mag ihn.' },
    { if: E(1), text: 'Leiser ist er geworden, der Brunnen. Aber er singt. Und unten passt einer auf. Ich schicke ihm Tee hinunter, im Eimer. Er schickt den Eimer gespült zurück. Manieren hat er.' },
    { if: { done: 'm_brunnenhueterin' }, text: 'Brunnenhüterin. Jetzt weißt du es. Wenn du es Sella erzählst, weiß es bis zum Abend das ganze Tal, und dann wollen alle wissen, was der Brunnen über SIE sagt. Nichts. Er hat Geschmack.' },
    { if: { started: 'm_ueberlauf' }, text: 'Der Brunnen läuft über, und alle tun, als sei das ein Wetter. Es ist kein Wetter. Wetter flüstert nicht.' },
  ],
  borin: [
    { if: { dec: ['borin', 1], done: 'c_borin_3' }, text: 'Sie kommt im Frühjahr. Wegen der Naht an der Esse. Die Naht ist nicht schief. … Ich hab sie schief gemacht. Sag’s ihr nicht.' },
    { if: { dec: ['borin', 2], done: 'c_borin_3' }, text: 'Ein Brief. Von ihr. Liegt in der Schürzentasche. Hab ihn elfmal gelesen. Steht jedes Mal dasselbe drin. Gut so.' },
    { if: { done: 'c_mirelda_2' }, text: 'Die Bank. Hab sie neu gestrichen. Grün. Sie sagt, es ist das falsche Grün. Sie sitzt trotzdem drauf.' },
    { if: ENDE, text: 'Hab gehört, du warst ganz unten. Beim Brunnen selber. … Hast du gut gemacht. Da. Jetzt hab ich’s gesagt. Geht doch.' },
    { if: { started: 'm_ueberlauf' }, text: 'Wasser in der Esse. Zweimal diese Woche. Wenn der Brunnen was von mir will, soll er klopfen wie jeder andere.' },
  ],
  sella: [
    { if: E(2), text: 'Meine Tränke kochen von allein über! Ich nenne es „Wildabfüllung“ und nehme das Doppelte. Angebot und Nachfrage, Schätzchen.' },
    { if: ENDE, text: 'Du warst im BRUNNEN? Und hast mir nichts mitgebracht? Nicht mal Wasser? Das hätte ich als „Originalquelle“ verkauft!' },
    { if: { started: 'm_ueberlauf' }, text: 'Gummistiefel! Fast echte! Der Brunnen läuft über, und ich sage: Jede Krise ist ein Sortiment.' },
  ],
  fenwick: [
    { if: E(3), text: 'Es ANTWORTET. Ich stelle ihm jeden Tag eine Frage und bekomme einen Ton. Ich habe ein Wörterbuch angefangen. Es hat bisher drei Einträge, und einer davon ist „vielleicht“.' },
    { if: E(2), text: 'Mana verhält sich nicht mehr wie in meinen Tabellen. Meine Tabellen sind wertlos. Ich habe seit Jahren nicht so gut geschlafen!' },
    { if: E(1), text: 'Sieben Kristalle auf sieben Sitzen, und diesmal weiß jede Fußnote, wie er heißt. Ich schreibe den Namen in jedes Buch. Sollen sie mich doch berichtigen.' },
    { if: { done: 'c_fenwick_3' }, text: 'Das ganze Lied ist eine Frage. Ich summe es beim Abwasch. Mein Geschirr war noch nie so nachdenklich.' },
    { if: { done: 'm_name' }, text: 'Aetherion. Ich sage es leise, wenn ich am Brunnen vorbeigehe. Aus Höflichkeit. Man grüßt ja auch den Nachbarn.' },
  ],
  tobi: [
    { if: E(3), text: 'Ich sag dem Brunnen jeden Morgen Guten Morgen! Er macht dann das Wasser warm. Mama sagt, das bild ich mir ein. Der Lange mit der Laterne sagt, das bild ich mir NICHT ein.' },
    { if: E(2), text: 'Guck mal! Die Pfütze läuft mir nach! Sie heißt Platsch. Edda sagt, Pfützen dürfen nicht ins Wachhaus. Platsch ist beleidigt.' },
    { if: { done: 'c_tobi_2' }, text: 'Ritter Tobi meldet: Brunnen bewacht, keine Vorkommnisse! Herr Splitter hält die Nachtwache. Er schläft nie. Er kann die Augen nicht zumachen, die sind gemalt.' },
    { if: { started: 'm_fremder', notDone: 'm_pruefung' }, text: 'Da steht ein Mann am Brunnen, der ist durchsichtig! Ein bisschen! Ich hab ihn gefragt, ob er ein Gespenst ist. Er hat gesagt: „Noch nicht ganz.“ Er war sehr nett.' },
  ],
  ayla: [
    { if: { done: 'c_ayla_2' }, text: 'Fünf Welpen. Gestern hat einer in meinen Stiefel gebissen. Ich hab ihn gelassen. Er muss es ja lernen.' },
    { if: ENDE, text: 'Der Wald ist anders, seit du unten warst. Nicht stiller. Aufmerksamer. Als hätte ihm einer gesagt, dass jemand zuhört.' },
    { if: { started: 'm_ueberlauf' }, text: 'Wogen im Wald. Das Wild flieht nicht vor ihnen – es geht hin und sieht zu. Das gefällt mir nicht. Das gefällt mir ein bisschen.' },
  ],
  wache: [
    { if: E(3), text: 'Da steht ein tausend Jahre alter Mann am Brunnen und fragt mich, wie man Wache hält, wenn nichts passiert. Ich hab gesagt: Blätter zählen. Er hat mitgeschrieben.' },
    { if: { done: 'c_tobi_2' }, text: 'Ritter Tobi löst mich jetzt mittags ab. Für zehn Minuten. Ich tu so, als würde ich schlafen. Er nimmt es sehr ernst.' },
    { if: { started: 'm_fremder', notDone: 'm_pruefung' }, text: 'Der am Brunnen? Hab ihn angehalten. „Halt, wer da?“ Er hat gesagt: „Eine gute Frage.“ Und dann hat er sich für die Umstände entschuldigt. Was soll man da machen.' },
  ],
  hedda: [
    { if: { dec: ['hedda', 1] }, text: 'Zwölf Namen auf der Tafel. Karl putzt sie jeden Morgen. Hat ihm keiner gesagt. Macht er einfach.' },
    { if: { dec: ['hedda', 2] }, text: 'Stollen sieben fördert. Hinten links, wie er gesagt hat. Bestes Erz im Berg. Dieser Hornochse hatte recht. Wie immer.' },
    { if: ENDE, text: 'Der Berg summt anders, seit du unten warst. Ruhiger. Die Jungs sagen, sie schlafen besser. Ich sag: Dann können sie ja früher anfangen.' },
    { if: { done: 'h_licht' }, text: 'Die Jacken hängen jetzt am Stützbalken. Am Schrein liegt jeden Morgen ein Kristallsplitter. Ich frag nicht, wer das macht. Ich mach’s.' },
  ],
  pim: [
    { if: { decided: 'hedda' }, text: 'Die Grubenmeisterin hat Pim angebrüllt. Eine Stunde! Und dann hat sie Pim einen Platz am Feuer gegeben. Pim versteht Bergleute nicht. Pim bleibt trotzdem.' },
    { if: { started: 'm_abstieg' }, text: 'Pim war zuerst am Quellgrund! Frag nicht, wie. Pim fragt sich das selber.' },
    { if: { started: 'm_ueberlauf' }, text: 'Der Brunnen in Quellhain läuft über? Pim verkauft Eimer! Nein, warte. Schlechte Idee. Pim hat da so ein Gefühl mit Eimern.' },
  ],
  rakhan: [
    { if: { dec: ['rakhan', 1] }, text: 'Der erste Schornstein von Kharrad zieht schlecht. Die Schmiedin aus dem Norden sagt, das liege am Maurer. Der Maurer bin ich. Sie hat recht.' },
    { if: { dec: ['rakhan', 2] }, text: 'Wir ziehen. Aber die Kinder fragen nicht mehr „Wann gehen wir heim?“. Sie fragen „Wohin gehen wir morgen?“. Das ist eine bessere Frage.' },
    { if: ENDE, text: 'Die Asche hat von dir geflüstert. Diesmal habe ich verstanden, was sie sagt. Sie sagt: Danke. Sie sagt es ungern. Sie ist Asche.' },
    { if: { done: 'h_feuer' }, text: 'Rhuna. Ich sage ihren Namen jetzt ohne den Fluch davor und ohne den Segen danach. Nur den Namen. Er ist leichter so.' },
  ],
  jorund: [
    { if: { done: 'c_jorund_2' }, text: 'Ich gehe im Frühjahr hinunter. Der Kessel kommt mit. Er hat darauf bestanden.' },
    { if: E(2), text: 'Es taut. Überall. Vierzig Jahre Winter, und in einer Nacht ist er vorbei. Ich weiß nicht, wohin mit meinen Händen. Ich habe angefangen, etwas zu pflanzen. Keine Flechten.' },
    { if: ENDE, text: 'Das Licht unter dem Eis atmet ruhiger. Frag mich nicht, woran man das sieht. Man sitzt vierzig Jahre davor, dann sieht man es.' },
    { if: { done: 'h_wasser' }, text: 'Nerys. Die Frau mit dem Boot. Ich habe ihr gestern Tee an den See gebracht. Er ist gefroren, bevor ich ihn abstellen konnte. Sie wird es als Geste verstehen.' },
  ],
  inga: [
    { if: { done: 'c_jorund_2' }, text: 'Er weiß es jetzt. Und er hat nicht mal geheult. Er hat nur gefragt, ob ich Tee will. Ich hab Ja gesagt. Wetten, das bereue ich?' },
    { if: ENDE, text: 'Wetten, du warst am Grund der Welt und hast mir nichts mitgebracht? … Gewonnen. Schon wieder.' },
  ],
  liora: [
    { if: { dec: ['liora', 1] }, text: 'Drei Akademien! Zwei nennen mich eine Schwindlerin, eine will mich berufen. Ich habe allen dreien denselben Satz zurückgeschrieben: „Kommt her und fasst den Stein an.“' },
    { if: { dec: ['liora', 2] }, text: 'Die Kiste ist zu. Ich sehe jeden Abend nach. Sen sagt, ich hätte heute schon viermal nachgesehen. Sen zählt mit. Verräter.' },
    { if: ENDE, text: 'Du hast mit ihm GESPROCHEN? Mit der QUELLE? Setz dich. Sofort. Von vorn. Lass nichts aus. Auch nicht die Pausen!' },
    { if: { done: 'h_wind' }, text: 'Corvin Aldermoor. Ich habe seinen Namen auf den Sockel geschrieben. Mit Kreide. Sie hält nicht lange. Das fand ich angemessen.' },
  ],
  sen: [
    { if: { dec: ['sen', 1] }, text: 'Seid gegrüßt, Reisender. Nein – keine Wache mehr. Ich stehe nur hier. Es ist erstaunlich, wie anders dieselbe Stelle aussieht, wenn man nicht muss.' },
    { if: { dec: ['sen', 2] }, text: 'Meine Wache endet bei Sonnenuntergang. Hüter Morvain lässt grüßen, wisst Ihr? Er hat mich nicht vergessen. Ich habe es immer gewusst.' },
    { if: { done: 'm_pruefung' }, text: 'Der Hüter des siebten Sitzes lebt? Tausend Jahre auf Posten? … Richtet ihm die Hochachtung der Schwellenwache aus. Und fragt ihn, bitte, wie er das mit den Füßen macht.' },
  ],
  maelis: [
    { if: { done: 'x_wiegenlied' }, text: '♪ … Du summst es jetzt auch. Du triffst den dritten Ton nicht ganz. Vater hat ihn auch nie getroffen. Lass es so.' },
    { if: E(3), text: 'Der Große hört jetzt zu. Er fragt mich Sachen! „Was ist ein Kuchen?“ Ich bin seit vierhundert Jahren tot und muss jemandem Kuchen erklären.' },
    { if: E(2), text: 'Er ist ganz. Ich spüre es – der Traum wird dünner, wie Nebel am Vormittag. Ich habe keine Angst. Er hat versprochen, mich nicht zu vergessen. Er vergisst nichts mehr.' },
    { if: E(1), text: 'Er schläft wieder. Der Höfliche sitzt bei ihm. Ich singe den beiden manchmal etwas vor. Einer von ihnen schnarcht. Ich sage nicht, wer.' },
    { if: { done: 'm_leerer_sitz' }, text: 'Ich bin ein Nachklang, sagt der Höfliche. Das ist, was von einem Lied bleibt, wenn der Raum es mochte.' },
  ],
};
