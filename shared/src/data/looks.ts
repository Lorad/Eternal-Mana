/**
 * Erscheinungen (0.7). Figuren werden als Klassen-Sprite gezeichnet, nicht je Ausrüstungsteil – deshalb gibt es zwei
 * Dinge zu wählen: das GEWAND (eine Variante des Klassen-Sheets, `char_<klasse>_<variante>`) und den WAFFENGLANZ
 * (Farbe von Hieb, Schweif und Treffer). Freigeschaltet für das ganze Profil (`HomeData.looks`), gewählt je Charakter
 * am Kleiderschrank auf einem Hof (`CharData.look`), für andere sichtbar über `PlayerInfo.g` / `.w`.
 *
 * Fehlt ein Gewand-Sheet, färbt der Client das Grund-Sheet mit `color` ein (client/src/game/views.ts, `outfitSheet`).
 */
import type { CharData } from '../types';
import { rankIn } from './factions';
import { riftDone } from './home';
import { seenEndings } from './rifts';

export interface LookDef {
  id: string;
  /** g = Gewand · w = Waffenglanz */
  kind: 'g' | 'w';
  name: string; desc: string; how: string;
  /** Gewand: Farbton des Rückfalls · Waffenglanz: die Farbe */
  color: number;
  /** beweist dieser Spielstand die Erscheinung? (fehlt = kommt aus der Sammlung) */
  has?(c: CharData): boolean;
}
/** Varianten, für die die Kunst-Pipeline Sheets `char_<klasse>_<variante>` liefert */
export const OUTFIT_IDS = ['wald', 'glut', 'frost', 'schatten', 'gold'] as const;

export const LOOK_LIST: LookDef[] = [
  { id: 'wald', kind: 'g', name: 'Gewand des Waldes', color: 0x9fd88a, desc: 'Moosgrün und Rindenbraun. Sella sagt, es stehe dir. Sella sagt das zu allen, die bei ihr kaufen.',
    how: 'Ruf in Quellhain: Rang „Geachtet“', has: c => rankIn(c, 'quellhain') >= 3 },
  { id: 'frost', kind: 'g', name: 'Gewand des Frosts', color: 0xa8d8ff, desc: 'Fell am Kragen, Reif am Saum. Inga hat die Nähte geprüft und nichts gesagt. Das ist ein Lob.',
    how: 'Ruf bei den Wintersassen: Rang „Geachtet“', has: c => rankIn(c, 'wintersassen') >= 3 },
  { id: 'glut', kind: 'g', name: 'Gewand der Glut', color: 0xffa070, desc: 'Rot, Ocker und ein Rand, der aussieht wie angesengt. Er ist angesengt.',
    how: 'Mana-Riss der Stufe 5 abschließen', has: c => riftDone(c) >= 5 },
  { id: 'schatten', kind: 'g', name: 'Gewand der Schatten', color: 0xa890e0, desc: 'Die Farbe, die übrig bleibt, wenn eine Geschichte zu Ende ist.',
    how: 'Die Geschichte zu Ende erzählen', has: c => seenEndings(c).length > 0 },
  { id: 'gold', kind: 'g', name: 'Goldenes Gewand', color: 0xffe08a, desc: 'Für Leute, die alles gesehen haben und möchten, dass man es ihnen ansieht.',
    how: 'Sammlung: 90 Einträge insgesamt' },
  { id: 'w_smaragd', kind: 'w', name: 'Smaragdglanz', color: 0x6ee08a, desc: 'Grün wie frisch aufgeschlagenes Moos.', how: 'Sammlung: 10 Wesen im Bestiarium' },
  { id: 'w_glut', kind: 'w', name: 'Glutglanz', color: 0xff6a3c, desc: 'Jeder Hieb zieht einen Funkenschweif.', how: 'Ruf bei den Aschennomaden: Rang „Bekannt“', has: c => rankIn(c, 'aschennomaden') >= 2 },
  { id: 'w_kristall', kind: 'w', name: 'Kristallglanz', color: 0x9fe8ff, desc: 'Hell und kalt, wie Licht in einer Geode.', how: 'Ruf bei den Grubenleuten: Rang „Geachtet“', has: c => rankIn(c, 'grubenleute') >= 3 },
  { id: 'w_riss', kind: 'w', name: 'Rissglanz', color: 0xb070ff, desc: 'Violett, mit einem Rand, der nicht ganz da ist.', how: 'Mana-Riss der Stufe 10 abschließen', has: c => riftDone(c) >= 10 },
  { id: 'w_stern', kind: 'w', name: 'Sternenglanz', color: 0xffffff, desc: 'Weiß. Einfach weiß. Es hat zwanzig Stufen gedauert, darauf zu kommen.', how: 'Mana-Riss der Stufe 20 abschließen', has: c => riftDone(c) >= 20 },
  { id: 'w_sieben', kind: 'w', name: 'Glanz der Sieben', color: 0xffd060, desc: 'Gold, siebenmal gefaltet.', how: 'Die Prüfung der Sieben bestehen', has: c => (c.rift?.trial ?? 0) > 0 },
  { id: 'w_stille', kind: 'w', name: 'Stiller Glanz', color: 0xa8c0d8, desc: 'Blass wie Wasser, das sich an etwas erinnert.', how: 'Ende „Versiegeln“', has: c => seenEndings(c).includes(1) },
  { id: 'w_wild', kind: 'w', name: 'Wilder Glanz', color: 0x60ffb0, desc: 'Mana, das niemandem mehr gehört.', how: 'Ende „Befreien“', has: c => seenEndings(c).includes(2) },
  { id: 'w_lied', kind: 'w', name: 'Glanz des Lieds', color: 0xffb0e0, desc: 'Vier Töne und der fünfte.', how: 'Ende „Das Lied vollenden“', has: c => seenEndings(c).includes(3) },
];
export const LOOKS: Record<string, LookDef> = Object.fromEntries(LOOK_LIST.map(l => [l.id, l]));
/** Farbe des gewählten Waffenglanzes (undefined = Farbe des Elements, wie bisher) */
export function glowColor(w: string | undefined | null): number | undefined { const l = w ? LOOKS[w] : undefined; return l?.kind === 'w' ? l.color : undefined; }
