/**
 * Gegenstände des Zuhauses (0.7). Ohne Laufzeit-Abhängigkeit zu items.ts – items.ts trägt `HOME_ITEMS` in die
 * Gegenstandsliste ein. Icons: ausschließlich vorhandene.
 */
import type { ItemBase } from './items';

export const HOME_ITEMS: ItemBase[] = [
  { id: 'pet_pilzling', name: 'Pilzling im Topf', kind: 'consumable', icon: 'food_pilz', stack: true, price: 150,
    desc: 'Kein Gericht. Er blinzelt. Benutzen, um ihn aufzunehmen – danach läuft er mit, wenn du ihn lässt. Ein zweiter Topf ist nur noch ein Topf.', use: { pet: 'pilzling' } },
];
