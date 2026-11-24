/**
 * Begleiter (0.7): acht kleine Gefährten, jeder aus einem anderen Winkel des Spiels, jeder mit genau einer kleinen
 * Eigenheit. Sie kämpfen nicht. Freigeschaltet werden sie für das ganze Profil (`HomeData.pets`), aktiv ist je Charakter
 * einer (`CharData.pet`). Grafik: Objekt-Atlas `pet_<id>_0..5` (0–1 Ruhe, 2–5 Laufen, Blick nach rechts).
 */
import type { CharData, Mods } from '../types';
import { rankIn } from './factions';
import { seenEndings } from './rifts';

export interface PetDef {
  id: string; name: string; desc: string;
  /** Wirkung in Worten und woher er kommt */
  perk: string; how: string;
  /** dauerhafte Werte, solange er mitläuft */
  mods?: Mods;
  /** Faktoren: Aufsammelradius · Ruf · Chance auf Schatzkarten */
  pickup?: number; rep?: number; maps?: number;
  /** beweist dieser Spielstand den Begleiter? (fehlt = kommt aus Handwerk oder Sammlung) */
  has?(c: CharData): boolean;
}
/** Quest, die den Moosling bringt · Gegenstand, aus dem der Pilzling schlüpft */
export const PET_QUEST = 's_tobi';
export const PET_ITEM = 'pet_pilzling';

export const PET_LIST: PetDef[] = [
  { id: 'moosling', name: 'Moosling', desc: 'Tobi hat ihn so lange gefüttert, bis er zahm war. Jetzt läuft er dir nach. Tobi nennt das Verrat und winkt ihm trotzdem.',
    perk: 'Sammelt Gold und Beute in weitem Umkreis ein.', how: 'Quest „Ritter ohne Arm“ (Tobi in Quellhain)', pickup: 2.5,
    has: c => c.quests[PET_QUEST]?.s === 'done' },
  { id: 'pilzling', name: 'Pilzling', desc: 'Im Topf gezogen, nicht gekocht. Er hält dich für einen sehr großen Pilz und ist ein bisschen stolz auf dich.',
    perk: '+1,5 Leben je Sekunde.', how: 'Kochstelle: „Pilzling im Topf“ ansetzen – und dann bitte nicht umrühren', mods: { hpRegen: 1.5 } },
  { id: 'glutfuchs', name: 'Glutfuchs', desc: 'Die Nomaden sagen, einen Glutfuchs sucht man sich nicht aus. Dieser hat lange überlegt.',
    perk: '+10 % Feuerresistenz.', how: 'Ruf bei den Aschennomaden: Rang „Geachtet“', mods: { resFire: 10 },
    has: c => rankIn(c, 'aschennomaden') >= 3 },
  { id: 'schneeeule', name: 'Schneeeule', desc: 'Saß auf der Schatztruhe im Frostgebirge und tat, als gehöre sie zum Inhalt.',
    perk: 'Scharfe Augen: Schatzkarten finden sich doppelt so oft.', how: 'Einen Schatz im Frostgebirge heben', maps: 2,
    has: c => (c.flags['tm:frost'] ?? 0) > 0 },
  { id: 'schattenkatze', name: 'Schattenkatze', desc: 'Kam nach dem Kampf aus dem Nichts und setzte sich auf deinen Fuß. Das Schattenreich hat sie nie zurückverlangt.',
    perk: '+8 % Goldfund.', how: 'Ein seltenes Monster des Schattenreichs besiegen', mods: { goldPct: 8 },
    has: c => !!c.flags['rk:stunde'] || !!c.flags['rk:hohlprinz'] },
  { id: 'wisp', name: 'Irrwisch', desc: 'Blieb übrig, als der Weltboss fiel. Leuchtet heller, wenn du nachdenkst. „Also selten“, sagt Mirelda.',
    perk: '+1 Mana je Sekunde.', how: 'Einen Weltboss besiegen', mods: { mpRegen: 1 },
    has: c => Object.keys(c.flags).some(k => k.startsWith('wb:')) },
  { id: 'runenkaefer', name: 'Runenkäfer', desc: 'Krabbelte aus dem Bestiarium, als es dick genug war. Auf seinem Rücken steht eine Rune, die niemand lesen kann. Er auch nicht.',
    perk: '+10 % Ruf bei allen Fraktionen.', how: 'Sammlung: 25 Wesen im Bestiarium', rep: 1.1 },
  { id: 'quelldrachling', name: 'Quelldrachling', desc: 'Kein Drache. Ein Schluck Quelle mit Flügeln und einer eigenen Meinung. Er summt, wenn du etwas richtig machst.',
    perk: '+5 % Erfahrung (auch für Quellstufen).', how: 'Das verborgene Ende finden – oder die Prüfung der Sieben bestehen', mods: { xpPct: 5 },
    has: c => seenEndings(c).includes(3) || (c.rift?.trial ?? 0) > 0 },
];
export const PETS: Record<string, PetDef> = Object.fromEntries(PET_LIST.map(p => [p.id, p]));
