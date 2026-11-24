/**
 * Endspiel (0.5): Mana-Risse, Boss-Echos, Prüfung der Sieben, Quellstufen und Neuer Kreis – als Daten und reine Regeln.
 * Server (server/src/rift.ts, echo.ts, endgame.ts) und Oberfläche (client/src/ui/endgame.tsx) rechnen mit denselben Funktionen.
 * Zahlen: CFG.rift / CFG.quell / CFG.kreis in config.ts.
 *
 * Namen: „Mana-Riss“ ist dieser Endspiel-Modus (eigene Dungeon-Instanz, betreten am Riss-Stein). Die kleinen Echo-Begegnungen
 * der Geschichte heißen „Mana-Woge“ (Objekttyp `rift`, server/src/story.ts) und haben damit nichts zu tun.
 */
import { CFG, ELEMENTS, ELEMENT_NAME, strongAgainst } from '../config';
import type { CharData, Element, ItemInstance, ModKey, Mods } from '../types';
import { Rng, strHash } from '../util/rng';
import { BOSSES, type BossDef } from './enemies';
import { ITEMS, isGear } from './items';
import { AETHER, ECHO_FRAG } from './materials';
import { ZONES, type ZoneDef } from './zones';

// =====================================================================================================================
//  MANA-RISSE
// =====================================================================================================================
/** Die sechs Dungeons des ersten Akts, in denen sich Risse öffnen lassen */
export const RIFT_DUNGEONS = ['wurzelgruft', 'geode', 'aschenschmiede', 'gletscherdom', 'archiv', 'thron'];
/** Quest, deren Abschluss die Mana-Risse freischaltet (Finale des ersten Akts) */
export const RIFT_UNLOCK_QUEST = 'm_koenig';
/** Wo der Riss-Stein steht: Zone, POI und Versatz in Kacheln (der Server sucht die nächste freie Kachel abseits der Wege) */
export const RIFT_STONE = { zone: 'gruenwald', poi: 'dorf', dx: -6, dy: -9 };

export type RiftState = NonNullable<CharData['rift']>;
/** Riss-Fortschritt eines Charakters (Standardwerte, falls er noch keinen hat) */
export function riftState(c: CharData): RiftState { return c.rift ?? { stufe: 1, seed: 1, best: {} }; }
/** Mana-Risse stehen offen, sobald der Hohle König besiegt ist – und bleiben es über jeden Neuen Kreis hinweg. */
export function riftUnlocked(c: CharData): boolean { return c.quests[RIFT_UNLOCK_QUEST]?.s === 'done' || (c.kreis ?? 0) > 0; }

export type RiftModId = 'brand' | 'bersten' | 'element' | 'finsternis' | 'versiegt' | 'horde' | 'erwacht' | 'wucher' | 'hast' | 'glas' | 'sturm' | 'duerre';
export interface RiftModDef { id: RiftModId; name: string; desc: string; color: string }
const pct = (x: number) => Math.round(x * 100) + ' %';
const R = CFG.rift;
export const RIFT_MOD_LIST: RiftModDef[] = [
  { id: 'brand', name: 'Glutspur', color: '#ff7a3c', desc: `Besiegte Gegner hinterlassen ${R.brand.dur} Sekunden lang brennenden Boden.` },
  { id: 'bersten', name: 'Berstend', color: '#ffb02e', desc: 'Besiegte Gegner zerplatzen kurz nach ihrem Tod – weg von der Leiche!' },
  { id: 'element', name: 'Elementwoche', color: '#8ef0c0', desc: 'Alle Gegner tragen dasselbe Element und widerstehen ihm; ihr Gegenelement trifft sie besonders hart. Wähle Waffe, Runen und Resistenzen danach.' },
  { id: 'finsternis', name: 'Finsternis', color: '#8f7fd0', desc: `Dein Licht reicht nur halb so weit. Gegner bemerken dich später (${pct(R.finsternis.aggro)} Sichtweite) – du sie aber auch.` },
  { id: 'versiegt', name: 'Versiegt', color: '#9aa7b8', desc: `Jede Heilung wirkt nur zu ${pct(R.versiegt.heal)}: Tränke, Zauber, Lebensraub und Regeneration.` },
  { id: 'horde', name: 'Horden', color: '#c9a85a', desc: `Deutlich mehr Gegner (+${pct(R.horde.extra)}), jeder einzelne schwächer.` },
  { id: 'erwacht', name: 'Erwachte Schar', color: '#ffd070', desc: `Fast jeder dritte Gegner ist ein Erwachter (${pct(R.erwacht.eliteChance)} statt ${pct(R.eliteChance)}).` },
  { id: 'wucher', name: 'Wuchernd', color: '#8fd14a', desc: `Gegner heilen ${pct(R.wucher.regen)} ihres Lebens je Sekunde, wenn sie ${R.wucher.calm} Sekunden nicht getroffen wurden. Brennen und Gift halten die Wunden offen.` },
  { id: 'hast', name: 'Gehetzt', color: '#7fc8ff', desc: `Gegner laufen ${pct(R.hast.speed - 1)} schneller und greifen häufiger an.` },
  { id: 'glas', name: 'Gläsern', color: '#ff5a8a', desc: `Du erleidest ${pct(R.glas.dmgTaken - 1)} mehr Schaden, dafür laden deine Fähigkeiten ${pct(1 - R.glas.cd)} schneller.` },
  { id: 'sturm', name: 'Manasturm', color: '#bfe9ff', desc: `Alle ${R.sturm.every} Sekunden schlägt ein Blitz dort ein, wo du gerade stehst. Bleib in Bewegung.` },
  { id: 'duerre', name: 'Manadürre', color: '#6f8fd8', desc: `Mana regeneriert nur zu ${pct(R.duerre.regen)}, Treffer mit Standardangriffen geben dafür ${R.duerre.gain}-mal so viel.` },
];
export const RIFT_MODS = Object.fromEntries(RIFT_MOD_LIST.map(m => [m.id, m])) as Record<RiftModId, RiftModDef>;
/** Anzeigename eines Modifikators (die Elementwoche nennt ihr Element) */
export function riftModName(id: string, el?: Element): string {
  const m = RIFT_MODS[id as RiftModId];
  if (!m) return id;
  return id === 'element' && el ? `Woche: ${ELEMENT_NAME[el]}` : m.name;
}

/** Modifikatoren eines Risses – eindeutig bestimmt durch den Zähler des Anführers, den Dungeon und die Stufe. */
export function riftMods(seed: number, dungeon: string, stufe: number): { mods: RiftModId[]; el?: Element } {
  const rng = new Rng(strHash(`riss:${seed}:${dungeon}:${stufe}`));
  const mods = rng.shuffle(RIFT_MOD_LIST.map(m => m.id)).slice(0, CFG.rift.modCount(stufe));
  const el = rng.pick(ELEMENTS);
  return mods.includes('element') ? { mods, el } : { mods };
}
/** Das Element, das `el` im Kreislauf schlägt (Feuer ← Wasser, Licht ← Dunkelheit …) */
export function counterOf(el: Element): Element | undefined { return ELEMENTS.find(x => strongAgainst(x) === el); }
/** Richtzeit in Sekunden: wer schneller ist, bekommt die Bonustruhe. */
export function riftPar(dungeon: string, stufe: number): number {
  return CFG.rift.parBase + (ZONES[dungeon]?.maxRooms ?? 8) * CFG.rift.parPerRoom + stufe * CFG.rift.parPerStufe;
}
/** Seltenheitsgewichte der Belohnungstruhe (linear zwischen Stufe 1 und der höchsten Stufe) */
export function riftRarity(stufe: number): number[] {
  const f = Math.max(0, Math.min(1, (stufe - 1) / (CFG.rift.maxStufe - 1)));
  return CFG.rift.rarityLow.map((w, i) => w + (CFG.rift.rarityHigh[i] - w) * f);
}
/** Lebensfunken einer Gruppe dieser Größe */
export function riftRevives(members: number): number { return CFG.rift.revives + CFG.rift.revivesPerExtra * Math.max(0, members - 1); }
/** Zonen-Definition der Instanz: derselbe Dungeon (gleiche Karte), aber mit der Gegnerstufe des Risses. */
export function riftZoneDef(dungeon: string, stufe: number): ZoneDef {
  const lvl = CFG.rift.mobLevel(stufe);
  return { ...ZONES[dungeon], level: [lvl, lvl] };
}
export function fmtTime(sec: number): string { const s = Math.max(0, Math.floor(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

// ------------------------------------------------------------------ Boss-Echos
export interface EchoBossDef { name: string; mech: string; desc: string; intro: string }
/** Farbton aller Echos (blasses Quelllicht) */
export const ECHO_TINT = 0x78c8ff;
export const ECHO_BOSS: Record<string, EchoBossDef> = {
  dornenmutter: { name: 'Echo der Dornenmutter', mech: 'Dornensaat', desc: 'Sät Dornenfelder in den Raum, die als Giftlachen liegen bleiben.',
    intro: 'Die Ranken sind aus Licht. Sie erinnern sich an dich – und an jeden Schnitt.' },
  kristallkoloss: { name: 'Echo des Kristallkolosses', mech: 'Prismengitter', desc: 'Lichtbahnen ziehen nacheinander quer durch den Raum.',
    intro: 'Der Fels richtet sich noch einmal auf. Diesmal ist er durchsichtig.' },
  ignarok: { name: 'Echo Ignaroks', mech: 'Schlackenbrut', desc: 'Ruft zu Kampfbeginn und bei jedem Phasenwechsel Glutimps aus der Lava.',
    intro: 'Die Lava wölbt sich wie damals. Nur das Brüllen kommt einen Herzschlag zu spät – wie ein Echo eben.' },
  ysolde: { name: 'Echo Ysoldes', mech: 'Spiegelschritt', desc: 'Springt zweimal kurz hintereinander und hinterlässt an jedem Ort ein Frostfeld.',
    intro: '„Dieses Muster kenne ich. Du hast es zerrissen. Sieh nur – es webt sich von selbst neu.“' },
  archivar: { name: 'Echo des Archivars', mech: 'Schnellschrift', desc: 'Alle Angriffsmuster folgen um ein Viertel schneller aufeinander.',
    intro: '„Besucher. Bereits katalogisiert. Abschrift wird berichtigt.“' },
  hohlkoenig: { name: 'Echo des Hohlen Königs', mech: 'Kronenschatten', desc: 'Leerenbrut begleitet ihn von Beginn an, und ein Ring aus Einschlägen zieht sich um die Raummitte zusammen.',
    intro: '„Noch einmal? Die Quelle vergisst nichts. Nicht einmal mich.“' },
  vael: { name: 'Echo der Wacht', mech: 'Wachablösung', desc: 'Wachschatten stehen ihm von Anfang an bei, und er kämpft ohne Pause.',
    intro: '„Verzeiht. Das bin nicht ich – das ist nur, was die Tür von mir behalten hat. Es ist gründlicher als ich.“' },
};
/** Das Echo eines Bosses auf der Gegnerstufe `lvl`: einheitliche Stärke, stirbt wie ein gewöhnlicher Boss, optional mit dem Element der Woche. */
export function echoBossDef(bossId: string, lvl: number, o: { el?: Element; hpMul?: number; dmgMul?: number } = {}): BossDef {
  const b = BOSSES[bossId], e = ECHO_BOSS[bossId], E = CFG.rift.echo;
  const level = lvl + E.levelPlus;
  return { ...b, name: e?.name ?? 'Echo: ' + b.name, level, hpMul: E.hpMul * (o.hpMul ?? 1), dmgMul: E.dmgMul * (o.dmgMul ?? 1), defMul: E.defMul,
    element: o.el ?? b.element, resist: o.el ? [o.el] : b.resist, weak: o.el ? [counterOf(o.el)!] : b.weak,
    xp: Math.round(CFG.enemy.xp(level) * E.xpMul), gold: Math.round(CFG.enemy.gold(level) * E.goldMul),
    intro: e?.intro ?? b.intro, spared: undefined, fightName: undefined, outro: undefined, awaken: undefined, calm: undefined };
}

// ------------------------------------------------------------------ Prüfung der Sieben
export const TRIAL_ID = 'pruefung';
export const TRIAL_NAME = 'Prüfung der Sieben';
/** Schauplatz (Bossraum von Vaels Wacht) und Reihenfolge der sieben Echos */
export const TRIAL_ZONE = 'wacht';
export const TRIAL_BOSSES = ['dornenmutter', 'kristallkoloss', 'ignarok', 'ysolde', 'archivar', 'hohlkoenig', 'vael'];
/** Exklusives Rezept der Prüfung (wird nirgends sonst gefunden) */
export const TRIAL_RECIPE = 'a_sieben';
export function trialUnlocked(c: CharData): boolean { return riftUnlocked(c) && riftState(c).stufe > CFG.rift.trial.unlock; }

/** Titel, die hinter dem Namen stehen */
export const TITLES: Record<string, { name: string; desc: string }> = {
  sieben: { name: 'Bezwinger der Sieben', desc: 'Hat die Prüfung der Sieben bestanden.' },
};
/** Titel, die dieser Charakter führen darf */
/** Weitere Titelquellen hängen sich hier ein (0.6: die Fraktionstitel, shared/src/data/factions.ts) */
export const TITLE_SOURCES: ((c: CharData) => string[])[] = [];
export function ownedTitles(c: CharData): string[] { return [...((c.rift?.trial ?? 0) > 0 ? ['sieben'] : []), ...TITLE_SOURCES.flatMap(f => f(c))]; }
export function titleName(c: CharData): string | undefined { return c.title && ownedTitles(c).includes(c.title) ? TITLES[c.title]?.name : undefined; }

// ------------------------------------------------------------------ Angleichen (Schmiede): Echo-Fragmente heben besondere Stücke auf die Riss-Stufe
/** Höchste Gegenstandsstufe, auf die dieser Charakter angleichen kann: die Beutestufe seines höchsten abgeschlossenen Risses. */
export function attuneCap(c: CharData): number { return riftUnlocked(c) ? CFG.rift.ilvl(Math.max(0, riftState(c).stufe - 1)) : 0; }
/** Angleichen lassen sich nur Stücke, die man nicht einfach neu findet: Legendäre Waffen, Setteile und benannte Boss-Unikate. */
export function attunable(it: ItemInstance): boolean { const b = ITEMS[it.base]; return !!b && isGear(b) && (!!b.legend || !!it.set || !!it.name); }
export function attunePlan(c: CharData, it: ItemInstance): { to: number; gold: number; mats: [string, number][] } | null {
  const cap = attuneCap(c);
  if (!attunable(it) || it.ilvl >= cap) return null;
  const A = CFG.rift.attune, legend = !!ITEMS[it.base].legend;
  const to = Math.min(cap, it.ilvl + A.step), n = to - it.ilvl;
  const mats: [string, number][] = [[ECHO_FRAG, n * (legend ? A.legendFrags : A.frags)]];
  if (legend) mats.push([AETHER, A.legendAether]);
  return { to, gold: n * A.gold(it.ilvl), mats };
}
/** Grund, warum Angleichen nicht geht – oder null. */
export function attuneBlock(c: CharData, it: ItemInstance): string | null {
  if (!riftUnlocked(c)) return 'Dafür musst du die Mana-Risse kennen.';
  if (!attunable(it)) return 'Angleichen lassen sich nur Legendäre Waffen, Setteile und Boss-Unikate.';
  const plan = attunePlan(c, it);
  if (!plan) return it.ilvl >= CFG.rift.ilvl(CFG.rift.maxStufe) ? 'Höher geht es nicht.' : 'Dieses Stück ist schon so stark wie dein höchster abgeschlossener Riss. Schließe eine höhere Stufe ab.';
  if (c.gold < plan.gold) return 'Nicht genug Gold.';
  for (const [b, n] of plan.mats) { let have = 0; for (const i of c.inv) if (i.base === b) have += i.qty ?? 1; if (have < n) return `Es fehlt: ${n}× ${ITEMS[b]?.name ?? b} (du hast ${have}).`; }
  return null;
}

// =====================================================================================================================
//  QUELLSTUFEN  (Erfahrung über die Höchststufe hinaus)
// =====================================================================================================================
export interface QuellTrack { id: string; name: string; mod: ModKey; /** Gesamtbonus bei voller Bahn */ max: number; /** jeder weitere Punkt bringt nur noch diesen Anteil des vorigen */ decay: number; desc: string }
export const QUELL_TRACKS: QuellTrack[] = [
  { id: 'kraft', name: 'Quellkraft', mod: 'powerPct', max: 6, decay: 0.85, desc: 'Mehr Angriff.' },
  { id: 'leben', name: 'Quellblut', mod: 'hpPct', max: 8, decay: 0.85, desc: 'Mehr Leben.' },
  { id: 'schutz', name: 'Quellhaut', mod: 'defPct', max: 8, decay: 0.85, desc: 'Mehr Verteidigung.' },
  { id: 'fluss', name: 'Quellfluss', mod: 'cdr', max: 5, decay: 0.85, desc: 'Fähigkeiten laden schneller.' },
  { id: 'gleichmut', name: 'Gleichmut', mod: 'resAll', max: 6, decay: 0.85, desc: 'Widerstand gegen alle Elemente.' },
  { id: 'fund', name: 'Quellglück', mod: 'goldPct', max: 15, decay: 0.85, desc: 'Mehr Gold von Gegnern und aus Truhen.' },
];
export const QUELL_TRACK: Record<string, QuellTrack> = Object.fromEntries(QUELL_TRACKS.map(t => [t.id, t]));
/** Höchste Quellstufe: genau so viele Punkte, wie sich verteilen lassen */
export const QUELL_MAX = QUELL_TRACKS.length * CFG.quell.trackCap;
/** Gesamtbonus einer Bahn mit `n` Punkten: abnehmender Zuwachs, bei voller Bahn genau `max` (auf Zehntel gerundet). */
export function quellBonus(t: QuellTrack, n: number): number {
  const cap = CFG.quell.trackCap, k = Math.max(0, Math.min(cap, Math.floor(n)));
  return Math.round(t.max * (1 - Math.pow(t.decay, k)) / (1 - Math.pow(t.decay, cap)) * 10) / 10;
}
export type QuellState = NonNullable<CharData['quell']>;
export function quellState(c: CharData): QuellState { return c.quell ?? { lvl: 0, xp: 0, pts: {} }; }
export function quellSpent(c: CharData): number { let n = 0; const q = quellState(c); for (const t of QUELL_TRACKS) n += q.pts[t.id] ?? 0; return n; }
/** freie Quellpunkte */
export function quellFree(c: CharData): number { return Math.max(0, quellState(c).lvl - quellSpent(c)); }
/** Dauerhafte Boni aus den Quellstufen (wird in stats.ts eingerechnet) */
export function quellMods(c: CharData): Mods {
  const m: Mods = {};
  if (!c.quell) return m;
  for (const t of QUELL_TRACKS) { const n = c.quell.pts?.[t.id] ?? 0; if (n > 0) m[t.mod] = (m[t.mod] ?? 0) + quellBonus(t, n); }
  return m;
}

// =====================================================================================================================
//  NEUER KREIS  (New Game+)
// =====================================================================================================================
/** Quest, deren Abschluss den Neuen Kreis erlaubt (der Epilog bei Mirelda – die Entscheidung ist dann gefallen) */
export const KREIS_QUEST = 'm_epilog';
export const KREIS_NPC = 'mirelda';
/**
 * Fortschritts-Flags, die ein Neuer Kreis zurücksetzt: Entscheidungen, Hüter-Erinnerungen, Echo-Begegnungen, Orte, Gespräche,
 * Filmszenen, Bosssiege, Truhen, Quellsteine. Es BLEIBEN: Chronik (`l:`), Quellsplitter (`s:`), besuchte Gebiete (`z:`),
 * Geheimgänge (`x:`), Unikat- und Set-Merker (`u:`, `sd:`) und alles Übrige.
 */
export const KREIS_RESET_PREFIX = ['d:', 'h:', 'e:', 'v:', 'q:', 'k:', 'b:', 'c:', 't:'];
export const KREIS_RESET_FLAGS = ['ch'];
/** Quellstein, der auch im neuen Kreis aktiv bleibt (Heimat) */
export const KREIS_KEEP_FLAGS = ['t:gruenwald', 't:heim']; // 0.7: der Weg zum eigenen Hof bleibt
export function kreisOf(c: CharData): number { return Math.max(0, Math.min(CFG.kreis.max, Math.floor(c.kreis ?? 0))); }
/** Gegnerstufe im Kreis `k`: im ersten Durchgang unverändert, danach nie unter der Sockelstufe und je Kreis einige Stufen höher. */
export function kreisLevel(base: number, k: number): number { return k <= 0 ? base : Math.max(base, CFG.kreis.floor) + k * CFG.kreis.levelPer; }
export function kreisZoneDef(def: ZoneDef, k: number): ZoneDef { return k <= 0 ? def : { ...def, level: [kreisLevel(def.level[0], k), kreisLevel(def.level[1], k)] }; }
export function kreisBossDef(b: BossDef, k: number): BossDef {
  if (k <= 0) return b;
  const level = kreisLevel(b.level, k);
  return { ...b, level, xp: Math.max(b.xp, Math.round(CFG.enemy.xp(level) * CFG.kreis.bossXp)), gold: Math.max(b.gold, Math.round(CFG.enemy.gold(level) * CFG.kreis.bossGold)) };
}
/** Darf dieser Charakter einen Neuen Kreis beginnen? Rückgabe: Ablehnungsgrund oder null. */
export function kreisBlock(c: CharData): string | null {
  if (c.quests[KREIS_QUEST]?.s !== 'done' || !c.flags['d:ende']) return 'Erst wenn die Geschichte zu Ende erzählt ist – bis zum Nachklang am Brunnen.';
  return null;
}
/** Nummer des Kreises, der als nächster beginnen würde (höher als CFG.kreis.max wird die Welt nicht) */
export function nextKreis(c: CharData): number { return Math.min(CFG.kreis.max, kreisOf(c) + 1); }
/** Enden, die dieser Charakter schon gesehen hat (abgeschlossene Kreise und der laufende) */
export function seenEndings(c: CharData): number[] {
  const s = new Set<number>();
  for (const k of c.kreise ?? []) if (k.ende) s.add(k.ende);
  if (c.flags['d:ende']) s.add(c.flags['d:ende']);
  return [...s].sort();
}
export const KREIS_NAME = ['Erster Kreis', 'Zweiter Kreis', 'Dritter Kreis', 'Vierter Kreis'];
