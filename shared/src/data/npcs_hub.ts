/**
 * Quellwarte (0.9): die Figuren des Hubs – Hüter der Einrichtungen, Stammgäste des Gasthauses und Leute, die einfach da sind.
 * Looks der Hüter kommen aus der Asset-Pipeline; bis dahin zeigt `HUB_LOOK_FALLBACK` (data/hubart.ts) vorhandene.
 * Wo sie stehen und wer herumläuft: shared/src/maps/hubgen.ts. Was sie anbieten: data/hubdata.ts (FACILITIES).
 */
import type { NpcDef } from './npcs';

const N = (n: NpcDef) => n;
export const NPCS_HUB: NpcDef[] = [
  // ---------------------------------------------------------------- Hüter der Einrichtungen
  N({ id: 'gunda', name: 'Gunda', title: 'Schmiedin der Quellwarte', look: 'schmiedin',
    greet: ['Borin hat mir das Handwerk nicht beigebracht. Er hat mir nur gesagt, was ich falsch mache. Viel. Hat geholfen.', 'Leg’s auf den Amboss. Nicht da. Da. … Ja, da.', 'Ein Hammer, ein Feuer, ein Ziel. Und ein Eimer Wasser für den Fall, dass das Ziel brennt.'],
    talk: [{ if: { done: 'm_koenig' }, text: 'Du hast den Hohlen König umgehauen und kommst trotzdem zum Nachschärfen. Das nenn ich Berufsethos.' }],
    services: ['upgrade'] }),
  N({ id: 'ottmar', name: 'Ottmar', title: 'Ausrüstungshändler', look: 'haendler_hub',
    greet: ['Frische Ware! Jeden Tag andere – das liegt am Lieferanten. Der Lieferant bin ich. Ich bin launisch.', 'Alles geprüft. Von mir. Mit dem Daumen.', 'Was heute im Regal liegt, ist morgen weg. Wie mein Gehalt.'] }),
  N({ id: 'irmela', name: 'Irmela', title: 'Alchemistin', look: 'alchemistin',
    greet: ['Nicht riechen. Ich meine es ernst. Nicht. Riechen.', 'Jeder Trank ist ein Versprechen. Manche halten es. Die blauen meistens.', 'Sella in Quellhain? Meine Base. Sie verkauft. Ich braue. Wir reden nicht über Preise.'],
    shop: { items: ['potion_hp1', 'potion_mp1', 'potion_hp2', 'potion_mp2', 'potion_hp3', 'potion_mp3', 'elixir'] } }),
  N({ id: 'corvin', name: 'Meister Corvin', title: 'Fähigkeitenmeister', look: 'meister',
    greet: ['Ein Hieb ist ein Hieb. Tausend Hiebe sind ein Anfang.', 'Zeig mir, was du kannst. Dann zeig ich dir, was du nicht kannst. Das dauert länger.', 'Atmen. Zielen. Treffen. Die Reihenfolge ist wichtiger, als du denkst.'],
    talk: [{ if: { done: 'm_koenig' }, text: 'Man erzählt sich, du hättest einen König entthront. Gut. Dein linker Fuß steht trotzdem schief.' }],
    services: ['respec'] }),
  N({ id: 'fridolin', name: 'Fridolin', title: 'Lagerverwalter', look: 'lagerverwalter',
    greet: ['Alles, was du einlagerst, findest du wieder. Garantiert. Meistens. Ich habe ein System.', 'Dein Hof und mein Lager teilen sich dieselbe Truhe. Frag nicht, wie. Es ist kompliziert und es hat mit Hüterzauber zu tun. Und mit Regalen.', 'Kein Getier, keine Lava, keine lebenden Pilze. Die letzten haben gekündigt.'] }),
  N({ id: 'hanne', name: 'Hanne', title: 'Wirtin „Zum Versiegten Brunnen“', look: 'wirtin',
    greet: ['Setz dich, Quellgänger. Der Eintopf ist heiß, das Bier ist kalt, und die Gerüchte sind lauwarm.', 'Der Name? Der Brunnen war versiegt, als mein Großvater das Haus aufmachte. Jetzt läuft er wieder. Ich ändere doch nicht das Schild.', 'Wer hier sitzt, erzählt. Wer erzählt, trinkt. Wer trinkt, erzählt mehr. So läuft das Geschäft.'],
    talk: [{ if: { done: 'm_koenig' }, text: 'Die Quelle fließt, die Gäste bleiben. Alrik behauptet, er hätte dir alles beigebracht. Ich habe ihm nicht widersprochen. Er zahlt dann mehr.' }] }),
  N({ id: 'bertram', name: 'Bertram', title: 'Hallenwart der Trophäenhalle', look: 'hallenwart',
    greet: ['Bitte nichts anfassen. Außer, es gehört dir. Dann bitte vorsichtig.', 'Jede Trophäe hier hat eine Geschichte. Die meisten enden mit „und dann bin ich weggerannt“.', 'Ich staube jeden Morgen ab. Die Dornenmutter-Dornen zweimal. Die stechen nach.'] }),
  N({ id: 'wenke', name: 'Wenke', title: 'Rottmeisterin der Gruppen', look: 'wache', tint: 0xc8d8ff,
    greet: ['Allein gehen ist mutig. Zu viert gehen ist klug. Zu fünft gehen ist gegen die Regeln.', 'Du suchst Leute? Hier stehen welche. Manche sogar absichtlich.', 'Ein Rott braucht einen Kopf, zwei Hände und jemanden, der Tränke dabeihat. Meistens fehlt der Letzte.'] }),
  // ---------------------------------------------------------------- Stammgäste des Gasthauses (eigene Geschichten: data/dialoge_hub.ts)
  N({ id: 'alrik', name: 'Alrik der Halbe', title: 'Stammgast, ehemals Quellgänger', look: 'einsiedler', tint: 0xe8d8c0,
    greet: ['Vierzig Jahre Quellgänger. Dreißig davon hier am Tresen. Die besseren dreißig.', 'Warum „der Halbe“? Weil die andere Hälfte noch in der Wurzelgruft sitzt und sich nicht raustraut.', 'Zu meiner Zeit hatten wir keine Quellsteine. Wir sind gelaufen. Bergauf. In beide Richtungen.'] }),
  N({ id: 'merle', name: 'Merle Federkiel', title: 'Spielfrau', look: 'archaeologin', tint: 0xf0c8e8,
    greet: ['Ich sammle Lieder. Die guten sind alle schon geschrieben, also sammle ich die schlechten. Sie sind ehrlicher.', 'Erzähl mir was. Ich mache einen Reim draus. Er wird nicht stimmen, aber er wird sich reimen.', 'Die Laute ist verstimmt. Absichtlich. Hanne zahlt mir weniger, wenn ich gut spiele – dann bleiben die Leute zu lange.'] }),
  N({ id: 'lotte', name: 'Lotte Kompass', title: 'Kartenzeichnerin in Ausbildung', look: 'kind', tint: 0xd8f0ff,
    greet: ['Auf meiner Karte ist alles noch weiß. Das ist kein Fehler, das ist Ehrlichkeit.', 'Weißt du, wie groß die Welt ist? Ich auch nicht. Deswegen frag ich ja.', 'Mein Lehrmeister sagt, ich soll „erst messen, dann malen“. Ich male lieber. Messen ist für Leute ohne Fantasie.'] }),
  N({ id: 'rudger', name: 'Rudger', title: 'Hauptmann außer Dienst', look: 'wache', tint: 0xb0a898,
    greet: ['Rührt euch. Nein, nicht so. Auch nicht so. … Ach, macht doch, was ihr wollt, ich bin pensioniert.', 'Dreißig Jahre Torwache. Ich kenne jeden Stein der Quellwarte. Zwei davon persönlich.', 'Früher stand hier eine Kaserne. Jetzt steht hier ein Gasthaus. Ich habe mich angepasst.'] }),
  // ---------------------------------------------------------------- Leute der Quellwarte (laufen herum, siehe HUB_WALKERS in maps/hubgen.ts)
  N({ id: 'rike', name: 'Rike', title: 'Marktfrau', look: 'haendlerin', tint: 0xffe2c8,
    greet: ['Äpfel! Aus dem Grünwald! Garantiert ohne Mooslinge. Fast.', 'Ich verkaufe nichts an Quellgänger. Ihr bezahlt immer mit Splittern und erzählt dann eine Stunde, woher die sind.', 'Hast du Ottmar gesehen? Er schuldet mir zwei Körbe und eine Entschuldigung.'] }),
  N({ id: 'jost', name: 'Jost', title: 'Laternenanzünder', look: 'kraemer', tint: 0xc8c8ff,
    greet: ['Achtundvierzig Laternen. Jeden Abend. Ich habe einmal gezählt, wie oft ich sie angezündet habe. Dann habe ich aufgehört zu zählen und angefangen zu trinken.', 'Licht ist eine Gewohnheit. Dunkelheit auch. Ich bin für die bessere zuständig.', 'Die Laterne am Portal geht immer als erste aus. Ich glaube, sie hat Angst vor dem Ding.'] }),
  N({ id: 'tilda', name: 'Tilda', title: 'Novizin der Warte', look: 'kind', tint: 0xd8ffd0,
    greet: ['Ich lerne, Quellsteine zu lesen! Bisher steht auf allen „Stein“.', 'Meister Corvin sagt, ich habe Talent. Er sagt es zu jedem. Aber bei mir meint er es, glaube ich.', 'Wusstest du, dass die Warte älter ist als Quellhain? Ich auch nicht, bis gestern.'] }),
  N({ id: 'hinnerk', name: 'Hinnerk', title: 'Bote', look: 'nomade', tint: 0xffd8a8,
    greet: ['Post für – nein, das ist nicht für dich. Glaube ich. Kannst du lesen? Ich auch nicht.', 'Ich laufe zwischen den Quellsteinen hin und her. Teleportieren? Davon wird mir schlecht. Laufen ist ehrlicher.', 'Wenn du Fenwick siehst: Er hat seit drei Wochen ein Paket, das summt. Er soll es endlich abholen.'] }),
  N({ id: 'brann', name: 'Brann', title: 'Torwache', look: 'wache',
    greet: ['Durch das Tor geht es nach Quellhain. Durch den Stein überallhin. Durch mich nicht.', 'Ich bewache das Tor. Wovor? Steht nicht in meinem Vertrag.', 'Rudger sagt, früher war hier mehr los. Rudger sagt viel.'] }),
];

/** Stammgäste des Gasthauses – für Dialoge und Tests */
export const HUB_REGULARS = ['alrik', 'merle', 'lotte', 'rudger'];
