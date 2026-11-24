/**
 * Figuren der Lebendigen Welt (0.6): Fahrende Händlerin, Verschüttete, Reisende. Sie stehen in keiner Karte –
 * der Server stellt sie für die Dauer eines Ereignisses oder einer Begegnung in die Welt.
 */
import type { NpcDef } from './npcs';

export const TRADER_NPC = 'vesna';
export const NPCS_WELT: NpcDef[] = [
  { id: TRADER_NPC, name: 'Vesna Langweg', title: 'Fahrende Händlerin', look: 'haendlerin', tint: 0xd8c8ff,
    greet: ['Schau schnell, ich bleibe nicht lange. Ich bleibe nie lange. Das Maultier wird sonst sesshaft.',
      'Alles echt, alles weit gereist, nichts davon gestohlen. Bei dem meisten bin ich mir sicher.',
      'Ich war überall. Es ist überall dasselbe: Jemand braucht etwas, das woanders herumliegt.'] },
  { id: 'kumpel', name: 'Geretteter Kumpel', title: 'Grubenleute', look: 'bergfrau', tint: 0xc8d0e0,
    greet: ['Luft! … Sag Hedda nicht, dass ich geheult hab.', 'Ich hab die ganze Zeit gesungen, damit ihr mich findet. Ihr habt’s nicht gehört? Gut. Ich singe schlecht.', 'Stützbalken, hab ich gesagt. Mehr Stützbalken. Hört ja keiner.'] },
  { id: 'reisender', name: 'Odo Kleinschritt', title: 'Kartenzeichner, verlaufen', look: 'gelehrter', tint: 0xd8e8c8,
    greet: ['Die Karte stimmt. Die Gegend hält sich nur nicht daran.'] },
];
