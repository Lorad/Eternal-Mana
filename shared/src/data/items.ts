import { CFG } from '../config';
import type { ClassId, Element, ItemInstance, ModKey, Mods, Slot } from '../types';
import { Rng } from '../util/rng';
import { CLASSES } from './classes';
import { CRAFT_ITEMS } from './materials';
import { ENCHANTS, LEARNABLE, scrollOf } from './recipes';
import { HOME_ITEMS } from './homeitems';
import { WORLD_ITEMS } from './worlditems';

export type ItemKind = 'weapon' | 'helm' | 'armor' | 'accessory' | 'consumable' | 'material' | 'quest';

export interface ItemBase {
  id: string;
  name: string;
  kind: ItemKind;
  icon: string;          // Icon-Key ohne `item_`-Präfix
  desc?: string;
  tier?: number;
  wtype?: 'sword' | 'staff' | 'bow' | 'hammer' | 'dagger';
  aclass?: 'heavy' | 'light' | 'robe';
  acc?: 'ring' | 'amulet' | 'charm';
  stack?: boolean;
  price: number;
  /** Verbrauchsgüter. Seit 0.4 auch: Zustände beenden, Rezept lernen, Speise/Elixier (ein Platz je Art, `party` = Radius für Gruppenmitglieder) */
  use?: { hp?: number; mp?: number; hpPct?: number; mpPct?: number; cleanse?: boolean; learn?: string;
    buff?: { slot: 'food' | 'elixir'; dur: number; mods: Mods; party?: number };
    /** 0.6: Schatzkarte einer Region lesen · Trophäe in die Sammlung aufnehmen */
    tmap?: string; trophy?: string;
    /** 0.7: Begleiter aufnehmen (PETS in data/pets.ts) */
    pet?: string };
  /** Legendäre Waffe dieser Klasse (Sonderwirkung: LEGEND_TEXT in materials.ts) */
  legend?: ClassId;
}

export const TIER_NAMES = ['Eisenholz', 'Kristall', 'Glutstahl', 'Frostsilber', 'Runen', 'Schatten'];
export const TIER_MATERIAL = ['mat_wood', 'mat_crystal', 'mat_ember', 'mat_frost', 'mat_rune', 'mat_void'];
const WEAPON_NAME: Record<string, string> = { sword: 'schwert', staff: 'stab', bow: 'bogen', hammer: 'hammer', dagger: 'dolche' };
const HELM_NAME: Record<string, string> = { heavy: 'helm', light: 'kappe', robe: 'hut' };
const ARMOR_NAME: Record<string, string> = { heavy: 'panzer', light: 'wams', robe: 'robe' };
const HELM_ICON: Record<string, string> = { heavy: 'helm_heavy', light: 'helm_light', robe: 'hood' };
const ARMOR_ICON: Record<string, string> = { heavy: 'armor_heavy', light: 'armor_light', robe: 'robe' };
const ACC_NAME: Record<string, string[]> = {
  ring: ['Rindenring', 'Geodenring', 'Glutring', 'Reifring', 'Runenring', 'Schattenring'],
  amulet: ['Tauperlen-Amulett', 'Prismen-Amulett', 'Aschen-Amulett', 'Eisblumen-Amulett', 'Sternen-Amulett', 'Leeren-Amulett'],
  charm: ['Eichel-Talisman', 'Glimmer-Talisman', 'Schlacken-Talisman', 'Wolfszahn-Talisman', 'Siegel-Talisman', 'Echo-Talisman'],
};

export const ITEMS: Record<string, ItemBase> = {};
function add(b: ItemBase) { ITEMS[b.id] = b; }

for (let t = 1; t <= 6; t++) {
  const tn = TIER_NAMES[t - 1];
  for (const w of ['sword', 'staff', 'bow', 'hammer', 'dagger'] as const)
    add({ id: `w_${w}_${t}`, name: tn + WEAPON_NAME[w], kind: 'weapon', icon: w, tier: t, wtype: w, price: 0 });
  for (const a of ['heavy', 'light', 'robe'] as const) {
    add({ id: `h_${a}_${t}`, name: tn + HELM_NAME[a], kind: 'helm', icon: HELM_ICON[a], tier: t, aclass: a, price: 0 });
    add({ id: `a_${a}_${t}`, name: tn + ARMOR_NAME[a], kind: 'armor', icon: ARMOR_ICON[a], tier: t, aclass: a, price: 0 });
  }
  for (const c of ['ring', 'amulet', 'charm'] as const)
    add({ id: `c_${c}_${t}`, name: ACC_NAME[c][t - 1], kind: 'accessory', icon: c, tier: t, acc: c, price: 0 });
}

add({ id: 'potion_hp1', name: 'Kleiner Heiltrank', kind: 'consumable', icon: 'potion_hp', stack: true, price: 18, desc: 'Stellt 70 Leben wieder her.', use: { hp: 70 } });
add({ id: 'potion_hp2', name: 'Heiltrank', kind: 'consumable', icon: 'potion_hp', stack: true, price: 55, desc: 'Stellt 220 Leben wieder her.', use: { hp: 220 } });
add({ id: 'potion_hp3', name: 'Großer Heiltrank', kind: 'consumable', icon: 'potion_hp', stack: true, price: 140, desc: 'Stellt 550 Leben wieder her.', use: { hp: 550 } });
add({ id: 'potion_mp1', name: 'Kleiner Manatrank', kind: 'consumable', icon: 'potion_mp', stack: true, price: 16, desc: 'Stellt 40 Mana wieder her.', use: { mp: 40 } });
add({ id: 'potion_mp2', name: 'Manatrank', kind: 'consumable', icon: 'potion_mp', stack: true, price: 50, desc: 'Stellt 110 Mana wieder her.', use: { mp: 110 } });
add({ id: 'potion_mp3', name: 'Großer Manatrank', kind: 'consumable', icon: 'potion_mp', stack: true, price: 125, desc: 'Stellt 260 Mana wieder her.', use: { mp: 260 } });
add({ id: 'elixir', name: 'Quellwasser-Elixier', kind: 'consumable', icon: 'potion_elixir', stack: true, price: 260, desc: 'Stellt Leben und Mana vollständig wieder her.', use: { hpPct: 100, mpPct: 100 } });
add({ id: 'food_bread', name: 'Quellhainer Honigbrot', kind: 'consumable', icon: 'food', stack: true, price: 8, desc: 'Noch warm. Stellt 35 Leben wieder her.', use: { hp: 35 } });

add({ id: 'mat_wood', name: 'Eisenholz', kind: 'material', icon: 'mat_wood', stack: true, price: 6, desc: 'Hartes Holz aus dem Grünwald. Zum Verbessern von Ausrüstung.' });
add({ id: 'mat_herb', name: 'Quellkraut', kind: 'material', icon: 'mat_herb', stack: true, price: 5, desc: 'Wächst nur, wo Quellwasser im Boden fließt.' });
add({ id: 'mat_crystal', name: 'Kristallsplitter', kind: 'material', icon: 'mat_crystal', stack: true, price: 12, desc: 'Scharfkantiger Splitter aus den Kristallhöhlen.' });
add({ id: 'mat_ember', name: 'Glutstein', kind: 'material', icon: 'mat_ember', stack: true, price: 20, desc: 'Bleibt jahrelang warm.' });
add({ id: 'mat_frost', name: 'Frosterz', kind: 'material', icon: 'mat_frost', stack: true, price: 30, desc: 'Ein Erz, das niemals taut.' });
add({ id: 'mat_rune', name: 'Runenstaub', kind: 'material', icon: 'mat_rune', stack: true, price: 42, desc: 'Zerfallene Zauberschrift der Alten.' });
add({ id: 'mat_void', name: 'Leerenessenz', kind: 'material', icon: 'mat_void', stack: true, price: 60, desc: 'Fühlt sich an wie eine Erinnerung, die fehlt.' });
add({ id: 'gem', name: 'Geschliffener Edelstein', kind: 'material', icon: 'gem', stack: true, price: 90, desc: 'Händler zahlen gut dafür.' });

// Handwerk (0.4): Rohstoffe, Tränke, Elixiere, Speisen, Legendäre Waffen und je lernbarem Rezept eine Rezeptrolle
for (const b of CRAFT_ITEMS) add(b);
for (const b of WORLD_ITEMS) add(b); // Lebendige Welt (0.6): Sternsplitter, Schatzkarten, Trophäen
for (const b of HOME_ITEMS) add(b);  // Zuhause (0.7): Begleiter aus dem Kochtopf
for (const r of LEARNABLE) {
  const what = r.name || (r.out.k === 'item' ? ITEMS[r.out.item]?.name : '') || r.id;
  add({ id: scrollOf(r.id), name: 'Rezept: ' + what, kind: 'consumable', icon: 'recipe', stack: true, price: 60 + r.level * 12, desc: 'Benutzen, um das Rezept dauerhaft zu lernen.', use: { learn: r.id } });
}

add({ id: 'seal_earth', name: 'Siegel der Erde', kind: 'quest', icon: 'seal_earth', price: 0, desc: 'Warm und schwer wie frischer Waldboden.' });
add({ id: 'seal_light', name: 'Siegel des Lichts', kind: 'quest', icon: 'seal_light', price: 0, desc: 'Bricht das Licht in tausend Farben.' });
add({ id: 'seal_fire', name: 'Siegel des Feuers', kind: 'quest', icon: 'seal_fire', price: 0, desc: 'Pulsiert wie ein Herzschlag.' });
add({ id: 'seal_water', name: 'Siegel des Wassers', kind: 'quest', icon: 'seal_water', price: 0, desc: 'Von einer dünnen Eisschicht überzogen, die nie schmilzt.' });
add({ id: 'seal_wind', name: 'Siegel des Windes', kind: 'quest', icon: 'seal_wind', price: 0, desc: 'Man hört darin leises Flüstern.' });
add({ id: 'seal_dark', name: 'Siegel der Dunkelheit', kind: 'quest', icon: 'seal_dark', price: 0, desc: 'Schluckt das Licht um sich herum.' });
add({ id: 'q_puppe', name: 'Tobis Holzritter', kind: 'quest', icon: 'charm', price: 0, desc: 'Eine abgegriffene Holzfigur mit nur einem Arm.' });
add({ id: 'q_tagebuch', name: 'Verwittertes Tagebuch', kind: 'quest', icon: 'scroll', price: 0, desc: 'Die Schrift ist kaum noch lesbar.' });
add({ id: 'q_pilzhut', name: 'Pilzlingshut', kind: 'quest', icon: 'food', stack: true, price: 0, desc: 'Riecht erstaunlich gut.' });
add({ id: 'q_fluegel', name: 'Fledermausflügel', kind: 'quest', icon: 'mat_void', stack: true, price: 0, desc: 'Ledrig und kalt.' });
add({ id: 'q_kern', name: 'Glühender Kern', kind: 'quest', icon: 'mat_ember', stack: true, price: 0, desc: 'Das Herz eines Schlackengolems.' });
add({ id: 'q_pelz', name: 'Frostwolfpelz', kind: 'quest', icon: 'armor_light', stack: true, price: 0, desc: 'Dicht, weiß und eiskalt.' });
add({ id: 'q_tafel', name: 'Runentafel', kind: 'quest', icon: 'scroll', stack: true, price: 0, desc: 'Bruchstück einer Inschrift der Quellhüter.' });
// Questgegenstände Akt II (0.3)
add({ id: 'q_traumscherbe', name: 'Traumscherbe', kind: 'quest', icon: 'mat_crystal', stack: true, price: 0, desc: 'Ein Stück Albtraum, kalt und scharf. Darin: Asche, die nie zu Boden fällt.' });
add({ id: 'q_hammer', name: 'Keldas erster Hammer', kind: 'quest', icon: 'hammer', price: 0, desc: 'Am Kopf zwei Kerben und ein Punkt: Borins Marke.' });
add({ id: 'q_wachzeichen', name: 'Zeichen der Wacht', kind: 'quest', icon: 'seal_dark', price: 0, desc: 'Ein Strich von Vaels Wand, in Stein. Er sagt, er habe genug davon.' });
add({ id: 'q_herzton', name: 'Der fünfte Ton', kind: 'quest', icon: 'seal_water', price: 0, desc: 'Ein Ton, den es vorher nicht gab. Jemand hat ihn an ein Wiegenlied angehängt.' });

export const ARMOR_DEF_MUL = { heavy: 1.3, light: 1, robe: 0.75 };

export function tierOf(ilvl: number): number { return Math.max(1, Math.min(6, 1 + Math.floor((ilvl - 1) / 5))); }

let uidCounter = 0;
export function newUid(): string { return Date.now().toString(36) + (uidCounter++).toString(36) + Math.floor(Math.random() * 1296).toString(36); }

/** Mindeststufe zum Anlegen. Beute aus dem Endspiel (0.5) liegt über der alten Obergrenze – sie verlangt die Höchststufe. */
export function equipLevel(ilvl: number): number { return Math.max(1, Math.min(CFG.player.maxLevel, ilvl - 2)); }

export function isGear(b: ItemBase): boolean { return b.kind === 'weapon' || b.kind === 'helm' || b.kind === 'armor' || b.kind === 'accessory'; }

export function slotOf(b: ItemBase): Slot | null {
  if (b.kind === 'weapon') return 'weapon';
  if (b.kind === 'helm') return 'helm';
  if (b.kind === 'armor') return 'armor';
  if (b.kind === 'accessory') return 'acc1';
  return null;
}

export function canEquip(cls: ClassId, b: ItemBase): boolean {
  const c = CLASSES[cls];
  if (b.kind === 'weapon') return b.wtype === c.weapon;
  if (b.kind === 'helm' || b.kind === 'armor') return b.aclass === c.armor;
  return b.kind === 'accessory';
}

/** Grundwerte eines Ausrüstungsteils (ohne Affixe), inkl. Seltenheit und Verbesserungsstufe. */
export function baseMods(it: ItemInstance): Mods {
  const b = ITEMS[it.base];
  if (!b) return {};
  const mul = CFG.loot.rarityStatMul[it.rarity] * (1 + CFG.upgrade.statPerLevel * it.up);
  const L = it.ilvl;
  switch (b.kind) {
    case 'weapon': return { power: Math.round((5 + L * 3) * mul) };
    case 'helm': {
      const m: Mods = { def: Math.round((2 + L * 1.1) * ARMOR_DEF_MUL[b.aclass!] * mul) };
      if (b.aclass === 'robe') m.mp = Math.round((4 + L * 1.5) * mul);
      return m;
    }
    case 'armor': {
      const m: Mods = { def: Math.round((4 + L * 1.9) * ARMOR_DEF_MUL[b.aclass!] * mul) };
      if (b.aclass === 'heavy') m.hp = Math.round((6 + L * 2.5) * mul);
      if (b.aclass === 'robe') m.mp = Math.round((6 + L * 2) * mul);
      if (b.aclass === 'light') m.hp = Math.round((3 + L * 1.4) * mul);
      return m;
    }
    case 'accessory':
      if (b.acc === 'ring') return { power: Math.round((1 + L * 0.6) * mul) };
      if (b.acc === 'amulet') return { hp: Math.round((10 + L * 5) * mul) };
      return { def: Math.round((1 + L * 0.7) * mul) };
  }
  return {};
}

export function itemMods(it: ItemInstance): Mods {
  const m: Mods = { ...baseMods(it) };
  for (const [k, v] of it.affixes) m[k] = (m[k] ?? 0) + v;
  const en = it.ench ? ENCHANTS[it.ench] : undefined;
  if (en) for (const k in en.mods) m[k as ModKey] = (m[k as ModKey] ?? 0) + en.mods[k as ModKey]!;
  return m;
}

export function itemName(it: ItemInstance): string {
  const b = ITEMS[it.base];
  const n = it.name ?? b?.name ?? '???';
  return it.up > 0 ? `${n} +${it.up}` : n;
}

export function itemPrice(it: ItemInstance): number {
  const b = ITEMS[it.base];
  if (!b) return 0;
  if (!isGear(b)) return b.price;
  return Math.floor((12 + it.ilvl * 6) * Math.pow(1 + it.rarity, 1.7) * (1 + it.up * 0.3));
}
export function sellPrice(it: ItemInstance): number {
  const b = ITEMS[it.base];
  if (!b || b.kind === 'quest') return 0;
  return Math.max(1, Math.floor(itemPrice(it) * CFG.loot.sellFactor));
}

interface AffixDef { k: ModKey; w: number; v: (L: number) => number; round?: number; armorOnly?: boolean }
const AFFIXES: AffixDef[] = [
  { k: 'str', w: 6, v: L => 1 + L * 0.35 }, { k: 'dex', w: 6, v: L => 1 + L * 0.35 },
  { k: 'int', w: 6, v: L => 1 + L * 0.35 }, { k: 'vit', w: 8, v: L => 1 + L * 0.35 },
  { k: 'hp', w: 8, v: L => 8 + L * 4 }, { k: 'mp', w: 5, v: L => 5 + L * 2.5 },
  { k: 'power', w: 6, v: L => 1 + L * 0.8 }, { k: 'def', w: 6, v: L => 1 + L * 0.6 },
  { k: 'crit', w: 5, v: L => 2.5 + L * 0.06 }, { k: 'critDmg', w: 4, v: L => 9 + L * 0.3 },
  { k: 'speedPct', w: 3, v: () => 4 }, { k: 'cdr', w: 3, v: () => 4 },
  { k: 'lifesteal', w: 2, v: () => 2 }, { k: 'hpRegen', w: 3, v: L => 0.6 + L * 0.08, round: 10 },
  { k: 'mpRegen', w: 3, v: L => 0.4 + L * 0.04, round: 10 }, { k: 'elemPct', w: 4, v: () => 7 },
  { k: 'goldPct', w: 2, v: () => 10 }, { k: 'xpPct', w: 2, v: () => 5 },
  // Elementarresistenzen (0.4): nur auf Rüstung und Schmuck, damit Waffen wie bisher würfeln
  ...(['resFire', 'resWater', 'resEarth', 'resWind', 'resLight', 'resDark'] as ModKey[]).map((k): AffixDef => ({ k, w: 1, v: L => 5 + L * 0.08, armorOnly: true })),
];
const CLASS_ATTR_BIAS: Record<ClassId, ModKey[]> = {
  krieger: ['str', 'vit'], magier: ['int', 'mp'], waldlaeufer: ['dex', 'crit'], paladin: ['str', 'int', 'vit'], schattenjaeger: ['dex', 'critDmg'],
};
const OFF_CLASS: Record<ClassId, ModKey[]> = {
  krieger: ['int'], magier: ['str', 'dex'], waldlaeufer: ['int'], paladin: ['dex'], schattenjaeger: ['int'],
};

export function rollRarity(rng: Rng, weights: number[]): number {
  return rng.weighted(weights.map((w, i) => [i, w] as const));
}

/** Würfelt die Affixe eines Ausrüstungsteils (auch beim Umschmieden). */
export function rollAffixes(rng: Rng, ilvl: number, rarity: number, cls: ClassId, weapon: boolean): [ModKey, number][] {
  const out: [ModKey, number][] = [];
  const n = CFG.loot.affixCount[rarity];
  const used = new Set<ModKey>();
  const pool = AFFIXES.filter(a => !OFF_CLASS[cls].includes(a.k) && !(weapon && a.armorOnly)).map(a => [a, a.w * (CLASS_ATTR_BIAS[cls].includes(a.k) ? 2.5 : 1)] as const);
  for (let i = 0; i < n; i++) {
    let a: AffixDef;
    let guard = 0;
    do { a = rng.weighted(pool); } while (used.has(a.k) && guard++ < 20);
    used.add(a.k);
    const r = a.round ?? 1;
    const val = Math.max(1 / r, Math.round(a.v(ilvl) * rng.range(0.75, 1.3) * (1 + rarity * 0.08) * r) / r);
    out.push([a.k, val]);
  }
  return out;
}

/** Hebt (oder senkt) die Gegenstandsstufe: Grundwerte folgen der Stufe von selbst, die Affixe werden im Verhältnis ihrer Formel mitgezogen (0.5, Angleichen). */
export function rescaleItem(it: ItemInstance, ilvl: number): void {
  for (const a of it.affixes) {
    const def = AFFIXES.find(d => d.k === a[0]);
    if (!def) continue;
    const r = def.round ?? 1, f = def.v(ilvl) / def.v(it.ilvl);
    a[1] = Math.max(1 / r, Math.round(a[1] * f * r) / r);
  }
  it.ilvl = ilvl;
}

/** Erzeugt ein zufälliges, zur Klasse passendes Ausrüstungsteil. `acc` legt die Art des Schmuckstücks fest. */
export function generateGear(rng: Rng, ilvl: number, rarity: number, cls: ClassId, kind?: 'weapon' | 'helm' | 'armor' | 'accessory', acc?: 'ring' | 'amulet' | 'charm'): ItemInstance {
  const c = CLASSES[cls];
  const t = tierOf(ilvl);
  const k = kind ?? rng.weighted([['weapon', 3], ['helm', 2.5], ['armor', 2.5], ['accessory', 2]] as const);
  let base: string;
  if (k === 'weapon') base = `w_${c.weapon}_${t}`;
  else if (k === 'helm') base = `h_${c.armor}_${t}`;
  else if (k === 'armor') base = `a_${c.armor}_${t}`;
  else base = `c_${acc ?? rng.pick(['ring', 'amulet', 'charm'])}_${t}`;
  const it: ItemInstance = { uid: newUid(), base, rarity, ilvl, up: 0, affixes: rollAffixes(rng, ilvl, rarity, cls, k === 'weapon') };
  if (k === 'weapon' && rng.chance(CFG.loot.elementChance[rarity]))
    it.element = rng.pick(['fire', 'water', 'earth', 'wind', 'light', 'dark'] as Element[]);
  return it;
}

export function makeStack(base: string, qty = 1): ItemInstance {
  return { uid: newUid(), base, rarity: 0, ilvl: 1, up: 0, affixes: [], qty };
}

/** Boss-Unikate: benannte Waffe im Element des Bosses für die Klasse des Spielers. */
export const BOSS_UNIQUE: Record<string, { ilvl: number; element: Element; names: Record<ClassId, string> }> = {
  dornenmutter: { ilvl: 7, element: 'earth', names: { krieger: 'Dornenklinge', magier: 'Blütenzepter', waldlaeufer: 'Rankenbogen', paladin: 'Wurzelhammer', schattenjaeger: 'Dornenfänge' } },
  kristallkoloss: { ilvl: 12, element: 'light', names: { krieger: 'Prismenklinge', magier: 'Geodenstab', waldlaeufer: 'Facettenbogen', paladin: 'Kolossfaust', schattenjaeger: 'Splitterzwillinge' } },
  ignarok: { ilvl: 17, element: 'fire', names: { krieger: 'Schlackenbrand', magier: 'Ignaroks Zahn', waldlaeufer: 'Glutsehne', paladin: 'Schmiedeherz', schattenjaeger: 'Aschenzungen' } },
  ysolde: { ilvl: 22, element: 'water', names: { krieger: 'Gletscherschneide', magier: 'Ysoldes Spindel', waldlaeufer: 'Raureifbogen', paladin: 'Lawinenhammer', schattenjaeger: 'Eisnadeln' } },
  archivar: { ilvl: 27, element: 'wind', names: { krieger: 'Schlusswort', magier: 'Federkiel der Stille', waldlaeufer: 'Zeilenspringer', paladin: 'Siegelstempel', schattenjaeger: 'Fußnoten' } },
  hohlkoenig: { ilvl: 33, element: 'dark', names: { krieger: 'Hohlkönigsklinge', magier: 'Zepter der Leere', waldlaeufer: 'Letzte Dämmerung', paladin: 'Kronenbrecher', schattenjaeger: 'Maelis\' Tränen' } },
};

export function generateBossUnique(rng: Rng, boss: string, cls: ClassId, legendary: boolean): ItemInstance | null {
  const u = BOSS_UNIQUE[boss];
  if (!u) return null;
  const it = generateGear(rng, u.ilvl, legendary ? 4 : 3, cls, 'weapon');
  it.element = u.element;
  it.name = u.names[cls];
  return it;
}
