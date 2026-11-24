/** Gemeinsame Datentypen von Server und Client. */
export type Element = 'phys' | 'fire' | 'water' | 'earth' | 'wind' | 'light' | 'dark';
export type ClassId = 'krieger' | 'magier' | 'waldlaeufer' | 'paladin' | 'schattenjaeger';
export type AttrKey = 'str' | 'dex' | 'int' | 'vit';
export type Slot = 'weapon' | 'helm' | 'armor' | 'acc1' | 'acc2';
export const SLOTS: Slot[] = ['weapon', 'helm', 'armor', 'acc1', 'acc2'];
export const SLOT_NAME: Record<Slot, string> = { weapon: 'Waffe', helm: 'Kopf', armor: 'Rüstung', acc1: 'Accessoire', acc2: 'Accessoire' };
export const ATTR_NAME: Record<AttrKey, string> = { str: 'Stärke', dex: 'Geschick', int: 'Intelligenz', vit: 'Vitalität' };

/** Modifikatoren – von Affixen, Passiven und Buffs gemeinsam genutzt. *Pct = Prozentpunkte. */
export type ModKey =
  | 'str' | 'dex' | 'int' | 'vit' | 'hp' | 'mp' | 'power' | 'def'
  | 'powerPct' | 'defPct' | 'hpPct' | 'mpPct' | 'speedPct'
  | 'crit' | 'critDmg' | 'cdr' | 'lifesteal' | 'hpRegen' | 'mpRegen'
  | 'elemPct' | 'healPct' | 'goldPct' | 'xpPct' | 'dodgeCdr'
  | 'resFire' | 'resWater' | 'resEarth' | 'resWind' | 'resLight' | 'resDark' | 'resAll';
export type Mods = Partial<Record<ModKey, number>>;

export const MOD_LABEL: Record<ModKey, string> = {
  str: 'Stärke', dex: 'Geschick', int: 'Intelligenz', vit: 'Vitalität', hp: 'Leben', mp: 'Mana', power: 'Angriff', def: 'Verteidigung',
  powerPct: '% Angriff', defPct: '% Verteidigung', hpPct: '% Leben', mpPct: '% Mana', speedPct: '% Tempo',
  crit: '% Krit-Chance', critDmg: '% Krit-Schaden', cdr: '% Abklingzeit-Reduktion', lifesteal: '% Lebensraub',
  hpRegen: 'Leben/s', mpRegen: 'Mana/s', elemPct: '% Elementarschaden', healPct: '% Heilung', goldPct: '% Goldfund', xpPct: '% Erfahrung',
  dodgeCdr: '% schnellere Ausweichrolle',
  resFire: '% Feuerresistenz', resWater: '% Wasserresistenz', resEarth: '% Erdresistenz', resWind: '% Windresistenz',
  resLight: '% Lichtresistenz', resDark: '% Dunkelresistenz', resAll: '% alle Resistenzen',
};
/** Resistenz-Modifikator je Element (0.4) */
export const RES_KEY: Record<Exclude<Element, 'phys'>, ModKey> = { fire: 'resFire', water: 'resWater', earth: 'resEarth', wind: 'resWind', light: 'resLight', dark: 'resDark' };

export interface ItemInstance {
  uid: string;
  base: string;        // ItemBase.id
  rarity: number;      // 0..4
  ilvl: number;
  up: number;          // Verbesserungsstufe +0..+10
  affixes: [ModKey, number][];
  element?: Element;
  name?: string;       // Eigenname (Boss-Unikate)
  qty?: number;        // stapelbare Gegenstände
  // ---- 0.4 (alle optional, alte Gegenstände haben sie nicht)
  elv?: number;        // Elementstufe einer eingeschmiedeten Waffe 1..3 (fehlt = 1, wenn `element` gesetzt ist)
  ench?: string;       // Verzauberung (ENCHANTS in data/recipes.ts)
  set?: string;        // Rüstungsset (SETS in data/sets.ts)
}

export interface QuestState {
  s: 'active' | 'done';
  p: number[];         // Fortschritt je Ziel
  n?: number;          // wie oft abgeschlossen (wiederholbare)
}

/** Persistenter Charakterstand (wird als JSON in SQLite gespeichert). */
export interface CharData {
  v: number;
  name: string;
  cls: ClassId;
  level: number;
  xp: number;
  gold: number;
  attrs: Record<AttrKey, number>;
  attrPoints: number;
  skillPoints: number;
  skills: Record<string, number>;
  hotbar: (string | null)[];
  inv: ItemInstance[];
  equip: Partial<Record<Slot, ItemInstance>>;
  quests: Record<string, QuestState>;
  /** Fortschritts-Flags: `c:<zone>:<id>` Truhe, `s:<zone>:<id>` Quellsplitter, `t:<zone>` Quellstein, `b:<boss>` Boss, `z:<zone>` besucht, `x:<zone>:<id>` Geheimnis.
   *  Story (ab 0.3, siehe shared/src/data/cond.ts): `d:` Entscheidung, `l:` Chronik, `h:` Hüter-Erinnerung, `e:` Echo, `v:` Ort, `q:` Gespräch, `k:` Filmszene, `ch` Kapitel */
  flags: Record<string, number>;
  zone: string;
  x: number;
  y: number;
  respawn: { zone: string; x: number; y: number };
  hp: number;
  mp: number;
  playtime: number;
  kills: number;
  deaths: number;
  // ---- 0.4 (optional: alte Spielstände haben diese Felder nicht)
  /** gelernte Rezepte (zusätzlich zu den von Anfang an bekannten) */
  recipes?: string[];
  /** laufende Speise / laufendes Elixier: Platz → [Gegenstand, Restdauer in s] */
  timed?: Record<string, [string, number]>;
  // ---- 0.5 Endspiel (optional: alte Spielstände haben diese Felder nicht; Regeln in shared/src/data/rifts.ts)
  /** Mana-Risse: höchste freigeschaltete Stufe, Zähler für die Auswahl der Modifikatoren, beste Abschlüsse je Dungeon [Stufe, Sekunden], bestandene Prüfungen der Sieben */
  rift?: { stufe: number; seed: number; best: Record<string, [number, number]>; trial?: number };
  /** Quellstufen: erreichte Stufe, Erfahrung zur nächsten, verteilte Punkte je Bahn */
  quell?: { lvl: number; xp: number; pts: Record<string, number> };
  /** Neuer Kreis: laufender Kreis (0 = erster Durchgang) und die abgeschlossenen Kreise mit ihren Entscheidungen (`ende` = gewähltes Ende) */
  kreis?: number;
  kreise?: { ende: number; dec: Record<string, number> }[];
  // ---- 0.6 Lebendige Welt (optional)
  /** Ruf je Fraktion (FACTIONS in data/factions.ts). Schätze und Trophäen stehen in `flags`: `tk:<zone>` aktive Schatzkarte, `tm:<zone>` gehobene Schätze, `tr:<id>` Trophäe */
  rep?: Record<string, number>;
  /** gewählter Titel (TITLES in data/rifts.ts; seit 0.6 auch die Titel der Fraktionen) */
  title?: string;
}

export interface Derived {
  maxHp: number; maxMp: number;
  power: number; def: number;
  crit: number; critDmg: number;
  speed: number;
  hpRegen: number; mpRegen: number;
  cdr: number; lifesteal: number;
  elemPct: number; healPct: number; goldPct: number; xpPct: number;
  dodgeCd: number;
  attackElement: Element;
  attrs: Record<AttrKey, number>;
  /** Elementarresistenzen in Prozent (gedeckelt, CFG.elements.resCap) */
  res: Record<Element, number>;
  /** Elementstufe der Waffe 0..3 */
  elemLvl: number;
  /** Klasse der angelegten Legendären Waffe (bestimmt deren Sonderwirkung) */
  legend?: ClassId;
  /** angelegte Teile je Set */
  sets: Record<string, number>;
}

export type StatusId = 'burn' | 'poison' | 'slow' | 'stun' | 'weak' | 'mark' | 'expose' | 'root' | 'freeze';
export const STATUS_BIT: Record<StatusId, number> = { burn: 1, poison: 2, slow: 4, stun: 8, weak: 16, mark: 32, expose: 4096, root: 8192, freeze: 16384 };
export const FLAG_BUFF = 64, FLAG_SHIELD = 128, FLAG_ROLL = 256, FLAG_DEAD = 512, FLAG_ELITE = 1024, FLAG_INVULN = 2048;
/** alle Zustands-Bits zusammen (für Masken im HUD) */
export const STATUS_MASK = 63 | 4096 | 8192 | 16384;
export const STATUS_NAME: Record<StatusId, string> = { burn: 'Brennen', poison: 'Gift', slow: 'Verlangsamt', stun: 'Betäubt', weak: 'Geschwächt', mark: 'Gezeichnet', expose: 'Entblößt', root: 'Verwurzelt', freeze: 'Eingefroren' };

export interface StatusSpec { id: StatusId; dur: number; chance?: number }

// ------------------------------------------------------------------ Netzwerkprotokoll
/** Animationszustand in Snapshots */
export const enum Anim { Idle = 0, Move = 1, Attack = 2, Cast = 3, Hurt = 4, Roll = 5, Dead = 6, Windup = 7, Special = 8 }

/** Spieler im Snapshot: [id, x, y, facing(rad*100), anim, hp, maxHp, flags] */
export type SnapPlayer = [number, number, number, number, number, number, number, number];
/** Gegner im Snapshot: [id, x, y, facingLeft(0/1), anim, hp, flags] */
export type SnapMob = [number, number, number, number, number, number, number];

export interface PlayerInfo { id: number; name: string; cls: ClassId; level: number; party: number; /** Titel hinter dem Namen (0.5) */ title?: string }
export interface MobInfo { id: number; mob: string; lvl: number; maxHp: number; boss?: boolean; elite?: boolean; x: number; y: number; hp: number; name?: string; /** Einfärbung (Boss-Echos, 0.5) */ tint?: number }
export interface ObjInfo { id: number; type: string; x: number; y: number; state: number; tag?: string; props?: Record<string, any> }
export interface DropInfo { id: number; x: number; y: number; kind: 'gold' | 'item'; icon: string; rarity: number; name: string }
export interface ProjInfo { id: number; spr: string; x: number; y: number; vx: number; vy: number; el: Element; life: number; r: number; hostile: boolean }
export interface ZoneFx { id: number; kind: 'zone' | 'tele'; x: number; y: number; r: number; el: Element; dur: number; hostile: boolean; shape?: 'circle' | 'line'; x2?: number; y2?: number; w?: number }

export type GameEvent =
  | { k: 'dmg'; id: number; a: number; c?: 1; el: Element; pl?: 1; x: number; y: number; kb?: [number, number] }
  | { k: 'heal'; id: number; a: number; x: number; y: number }
  | { k: 'txt'; x: number; y: number; s: string; col?: string }
  | { k: 'atk'; id: number; ang: number; kind: string; el: Element; combo?: number; range?: number }
  | { k: 'cast'; id: number; skill: string; ang: number; el: Element }
  | { k: 'fx'; n: string; x: number; y: number; r?: number; el?: Element; ang?: number; d?: number }
  | { k: 'sfx'; n: string; x?: number; y?: number }
  | { k: 'mob+'; m: MobInfo }
  | { k: 'mob-'; id: number; died?: 1 }
  | { k: 'proj+'; p: ProjInfo }
  | { k: 'proj-'; id: number; hit?: 1 }
  | { k: 'zone+'; z: ZoneFx }
  | { k: 'zone-'; id: number }
  | { k: 'obj'; id: number; state: number; props?: Record<string, any> }
  | { k: 'obj+'; o: ObjInfo }
  | { k: 'obj-'; id: number }
  /** 0.6: Objekt (NPC) wandert in `t` Sekunden nach x/y; t = 0 versetzt sofort */
  | { k: 'omv'; id: number; x: number; y: number; t: number }
  | { k: 'pl+'; p: PlayerInfo }
  | { k: 'pl-'; id: number }
  | { k: 'boss'; id: number; name: string; phase: number; el: Element }
  | { k: 'bossend'; id: number; won: boolean };

export interface PartyMember { id: number; charId: number; name: string; cls: ClassId; level: number; hp: number; maxHp: number; zone: string; online: boolean }

/** Auszug der Charakterdaten für die Charakterauswahl */
export interface CharSummary { id: number; slot: number; name: string; cls: ClassId; level: number; zone: string; playtime: number }

export type ClientMsg =
  | { t: 'hello'; token: string; name: string; v: string }
  | { t: 'charCreate'; slot: number; name: string; cls: ClassId }
  | { t: 'charDelete'; id: number }
  | { t: 'enter'; id: number }
  | { t: 'leave' }
  | { t: 'm'; x: number; y: number; f: number; e: number; mv: 0 | 1 }
  | { t: 'atk'; ang: number }
  | { t: 'skill'; id: string; ang: number; tx: number; ty: number }
  | { t: 'dodge'; ang: number }
  | { t: 'interact'; id: number }
  | { t: 'revive'; id: number }
  | { t: 'respawn' }
  | { t: 'equip'; uid: string; slot?: Slot }
  | { t: 'unequip'; slot: Slot }
  | { t: 'use'; uid: string }
  | { t: 'quick'; kind: 'hp' | 'mp' }
  | { t: 'drop'; uid: string }
  | { t: 'sell'; uid: string; qty?: number }
  | { t: 'buy'; npc: string; idx: number; qty?: number }
  | { t: 'upgrade'; uid: string; npc: string }
  // Handwerk (0.4): `at` = NPC-ID der Station oder 'fire' (Lagerfeuer)
  | { t: 'craft'; id: string; at: string; n?: number }
  | { t: 'reforge'; uid: string; at: string }
  | { t: 'infuse'; uid: string; el: Element; at: string }
  | { t: 'enchant'; uid: string; id: string; at: string }
  | { t: 'attr'; a: AttrKey; n?: number }
  | { t: 'learn'; id: string }
  | { t: 'hotbar'; slots: (string | null)[] }
  | { t: 'respec'; npc: string }
  | { t: 'qAccept'; id: string; npc: string }
  | { t: 'qTurnIn'; id: string; npc: string }
  | { t: 'qAbandon'; id: string }
  | { t: 'talk'; npc: string }
  | { t: 'teleport'; zone: string }
  | { t: 'chat'; s: string }
  | { t: 'party'; a: 'invite' | 'accept' | 'decline' | 'leave'; id?: number }
  | { t: 'save' }
  | { t: 'settings'; data: string }
  | { t: 'sortInv' }
  // ---- Story (ab 0.3): Gesprächsthema öffnen, Option wählen, Filmszene beendet/übersprungen
  | { t: 'dlgOpen'; npc: string; topic: string }
  | { t: 'dlgPick'; npc: string; topic: string; node: string; opt: number }
  | { t: 'cineEnd'; id: string }
  // ---- Endspiel (0.5): Mana-Riss öffnen/folgen/verlassen (am Riss-Stein; `dungeon` = Dungeon-ID oder 'pruefung'), Quellstufen-Punkt setzen,
  //      Neuen Kreis beginnen (bei Mirelda), Ausrüstung angleichen (Schmiede), Titel wählen
  | { t: 'rift'; a: 'start' | 'join' | 'leave'; dungeon?: string; stufe?: number }
  | { t: 'quell'; track: string }
  | { t: 'kreis' }
  | { t: 'attune'; uid: string; at: string }
  // ---- Lebendige Welt (0.6): Spenden, Fraktionsvorräte, Fahrender Händler, Graben, Begegnungen, Titel
  | { t: 'donate'; npc: string; item: string; n: number }
  | { t: 'fbuy'; npc: string; idx: number; qty?: number }
  | { t: 'wbuy'; idx: number; qty?: number }
  | { t: 'dig' }
  | { t: 'enc'; id: number; opt: number }
  | { t: 'title'; id: string }
  | { t: 'ping'; c: number };

export interface ZoneInit {
  zone: string;
  x: number; y: number; epoch: number;
  players: PlayerInfo[];
  mobs: MobInfo[];
  objs: ObjInfo[];
  drops: DropInfo[];
  zones: ZoneFx[];
  weather: string;
  tod: number;       // Tageszeit 0..1
  you: number;       // eigene Entity-ID
  boss?: { id: number; name: string; phase: number; el: Element };
  /** laufender Mana-Riss dieser Instanz (0.5) */
  rift?: RiftInfo;
  /** Kreis dieser Welt (0.5; fehlt = 0) */
  kreis?: number;
}
/** Zustand eines Mana-Risses für die Anzeige: `t` = bisher verstrichene Sekunden, `done` = abgeschlossen in so vielen Sekunden (`bonus` = unter der Richtzeit) */
export interface RiftInfo {
  dungeon: string; stufe: number; mods: string[]; el?: Element;
  par: number; t: number; revives: number;
  done?: { sec: number; bonus: boolean };
  failed?: boolean;
  /** Prüfung der Sieben: bezwungene Echos / Gesamtzahl */
  trial?: [number, number];
}

// ---- Lebendige Welt (0.6)
/** Laufendes Weltereignis. `until` = Restsekunden beim Senden; `prog` = Fortschritt (bei Sammelereignissen der eigene) */
export interface WorldEventInfo { id: number; kind: string; zone: string; name: string; x: number; y: number; until: number; goal?: string; prog?: [number, number]; boss?: 1 }
/** Angebot des Fahrenden Händlers für genau diesen Spieler (Preis mit Nachlass, Restmenge) */
export interface TraderOffer { item: ItemInstance; price: number; left: number }
export interface WorldInfo {
  /** Jahreszeit 0..3 (Frühling, Sommer, Herbst, Winter) und Fortschritt darin 0..1 */
  season: number; sp: number;
  ev: WorldEventInfo[];
  trader?: TraderOffer[];
}
/** Gespräch einer Zufallsbegegnung: Der Server führt den Knoten, der Client zeigt nur an. */
export interface EncDialog { id: number; who: string; look?: string; lines: string[]; opts: { s: string; off?: string }[] }

export type ServerMsg =
  | { t: 'welcome'; account: number; name: string; chars: CharSummary[]; settings: string | null; server: ServerInfo }
  | { t: 'chars'; chars: CharSummary[] }
  | { t: 'entered'; char: CharData; charId: number; init: ZoneInit }
  | { t: 'zone'; init: ZoneInit }
  | { t: 's'; n: number; p: SnapPlayer[]; m: SnapMob[]; ev?: GameEvent[]; me?: number[]; k?: number } // me = [hp, maxHp, mp, maxMp, flags]; k = Schlüssel im Dungeon
  | { t: 'pos'; x: number; y: number; e: number; dash?: 1 }
  | { t: 'char'; d: Partial<CharData> }
  | { t: 'cd'; id: string; cd: number }
  | { t: 'buffs'; b: { id: string; name: string; dur: number; glyph: string; icon?: string; desc?: string; mods?: Mods }[] }
  | { t: 'drop+'; d: DropInfo }
  | { t: 'drop-'; id: number; got?: 1 }
  | { t: 'toast'; s: string; kind?: 'info' | 'good' | 'bad' | 'loot' | 'quest' | 'story'; icon?: string }
  | { t: 'loot'; item: ItemInstance }
  | { t: 'chat'; from: string; s: string; ch: 'all' | 'party' | 'sys' }
  | { t: 'party'; members: PartyMember[]; invite?: { from: number; name: string } }
  | { t: 'dead'; by: string }
  | { t: 'story'; id: string; lines: string[]; title?: string }
  | { t: 'env'; weather?: string; tod?: number }
  | { t: 'online'; players: { name: string; cls: ClassId; level: number; zone: string; id: number }[] }
  | { t: 'saved' }
  // ---- Story (ab 0.3): aktueller Gesprächsknoten (null = beendet, err = abgelehnt), Filmszene abspielen, Chronik-Dokument zeigen
  | { t: 'dlg'; npc: string; topic: string; node: string | null; err?: 1 }
  | { t: 'cine'; id: string }
  | { t: 'lore'; id: string; first?: 1 }
  // ---- Endspiel (0.5): Zustand des laufenden Mana-Risses (null = keiner)
  | { t: 'rift'; r: RiftInfo | null }
  // ---- Lebendige Welt (0.6): Weltzustand (Jahreszeit, Ereignisse, Händlerangebot), Begegnungsgespräch (null = beendet)
  | { t: 'world'; w: WorldInfo }
  | { t: 'encdlg'; d: EncDialog | null }
  | { t: 'err'; s: string }
  | { t: 'pong'; c: number; n: number };

export interface ServerInfo {
  name: string;
  version: string;
  port: number;
  addresses: { label: string; url: string; kind: 'local' | 'lan' | 'tailscale' }[];
  tailscale: { available: boolean; ip?: string; dns?: string };
}
