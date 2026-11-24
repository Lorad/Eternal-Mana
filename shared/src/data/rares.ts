/**
 * Seltene Monster, Weltbosse und die Gegner der Weltereignisse (0.6). Alle verwenden vorhandene Sprites – eingefärbt und
 * skaliert (`sprite`, `tint`, `scale`). enemies.ts hängt `WORLD_ENEMIES` an die Gegnerliste an.
 * Zahlen (Wiederkehr, Beute): CFG.living.rare / CFG.living.boss.
 */
import type { Element } from '../types';
import type { EnemyDef } from './enemies';
import type { RegionId } from './worlditems';

export type Season = 0 | 1 | 2 | 3;
export type RareTrait = 'shield' | 'summon' | 'enrage' | 'split' | 'volley' | 'burntrail' | 'frostaura' | 'blink' | 'regen' | 'quake' | 'haste' | 'decoy';
export const TRAIT_TEXT: Record<RareTrait, string> = {
  shield: 'Panzer: wird in regelmäßigen Abständen kurz unverwundbar',
  summon: 'Brut: ruft Helfer herbei',
  enrage: 'Raserei: wird unter 40 % Leben schneller und gefährlicher',
  split: 'Zerfall: zerspringt beim Tod in mehrere kleine',
  volley: 'Salve: schießt ganze Fächer',
  burntrail: 'Glutspur: hinterlässt brennenden Boden',
  frostaura: 'Kältehauch: verlangsamt alle in seiner Nähe',
  blink: 'Irrlicht: springt durch den Raum',
  regen: 'Selbstkorrektur: heilt sich, wenn man es in Ruhe lässt',
  quake: 'Beben: erschüttert den Boden um sich',
  haste: 'Vorgehend: bewegt sich und schlägt sehr schnell',
  decoy: 'Trugbilder: ruft bei halber Kraft Doppelgänger',
};

export interface RareDef {
  id: string; mob: string; zone: RegionId; lvl: number;
  trait: RareTrait;
  /** mögliche Orte: [POI, dx, dy] in Kacheln – der Server nimmt die nächste freie Zelle */
  spots: [string, number, number][];
  /** nur nachts / nur bei diesem Wetter / nur in diesen Jahreszeiten */
  night?: boolean; weather?: string[]; seasons?: Season[];
  /** Hinweis, wenn man in die Nähe kommt */
  hint: string;
  /** Helfer (summon, split, decoy): [Gegner, Anzahl] */
  adds?: [string, number];
  /** Sternsplitter als sichere Beute (Nachtgeschöpfe) */
  star?: boolean;
}
export interface WorldBossDef {
  id: string; mob: string; name: string; title: string;
  zones: [RegionId, RegionId];
  element: Element;
  /** Angriffsfolge (wiederholt sich): stomp = Kreis um den Boss · ring = Geschossring · rain = Kreise auf alle Spieler · adds = Helfer · lines = Strahlen auf Spieler */
  pattern: ('stomp' | 'ring' | 'rain' | 'adds' | 'lines')[];
  every: number;
  adds: string[];
  proj: string;
  announce: string; win: string; gone: string;
}

const E = (e: EnemyDef) => e;
/** `named` = eigener Name über dem Kopf und Markierung auf der Minimap */
export const WORLD_ENEMIES: EnemyDef[] = [
  // ---------------- Seltene Monster: Grünwald
  E({ id: 'r_borkenkoenig', name: 'Borkenkönig', sprite: 'dornkaefer', tint: 0xd8b070, scale: 1.7, named: true, element: 'earth', hpMul: 9, dmgMul: 1.35, defMul: 2, xpMul: 9, speed: 46, radius: 11, ai: 'charge', aggro: 130,
    atk: { range: 80, windup: 0.6, cd: 2, reach: 16, mult: 1.35 }, weak: ['fire'], resist: ['dark'] }),
  E({ id: 'r_fliegenhut', name: 'Der Alte Fliegenhut', sprite: 'pilzling', tint: 0xff8a8a, scale: 1.8, named: true, element: 'earth', hpMul: 7, dmgMul: 1.25, defMul: 0.9, xpMul: 9, speed: 30, radius: 11, ai: 'ranged', aggro: 150,
    atk: { range: 120, windup: 0.6, cd: 1.8, proj: { spr: 'spore', speed: 100, count: 3, spread: 36 }, status: { id: 'poison', dur: 4, chance: 0.6 }, mult: 0.8 }, weak: ['fire'] }),
  // ---------------- Kristallhöhlen
  E({ id: 'r_tante_echo', name: 'Tante Echo', sprite: 'fledermaus', tint: 0xc8a8ff, scale: 1.9, named: true, element: 'wind', hpMul: 7.5, dmgMul: 1.3, defMul: 0.7, xpMul: 9, speed: 88, radius: 10, ai: 'chase', move: 'swoop', flying: true, aggro: 170,
    atk: { range: 18, windup: 0.25, cd: 1, reach: 16 }, weak: ['light'] }),
  E({ id: 'r_guenther', name: 'Günther der Kleine', sprite: 'kristallkrabbler', tint: 0xffe0ff, scale: 1.8, named: true, element: 'light', hpMul: 10, dmgMul: 1.3, defMul: 2.4, xpMul: 9, speed: 38, radius: 13, ai: 'chase', aggro: 120,
    atk: { range: 24, windup: 0.6, cd: 1.5, reach: 20, mult: 1.3 }, weak: ['dark', 'earth'], resist: ['fire'] }),
  // ---------------- Glutlande
  E({ id: 'r_meister_russ', name: 'Meister Ruß', sprite: 'glutimp', tint: 0x707078, scale: 1.8, named: true, element: 'fire', hpMul: 8, dmgMul: 1.2, defMul: 0.9, xpMul: 9, speed: 58, radius: 10, ai: 'ranged', aggro: 170,
    atk: { range: 135, windup: 0.55, cd: 1.7, proj: { spr: 'orb', speed: 140, count: 5, spread: 56 }, status: { id: 'burn', dur: 3, chance: 0.4 }, mult: 0.7 }, weak: ['light', 'water'] }),
  E({ id: 'r_glucke', name: 'Die Glucke', sprite: 'magmaschleim', tint: 0xffd890, scale: 2.2, named: true, element: 'fire', hpMul: 11, dmgMul: 1.25, defMul: 1.2, xpMul: 9, speed: 38, radius: 14, ai: 'chase', move: 'hop', aggro: 120,
    atk: { range: 24, windup: 0.5, cd: 1.3, reach: 20, status: { id: 'burn', dur: 3, chance: 0.6 } }, weak: ['earth', 'water'] }),
  // ---------------- Frostgebirge
  E({ id: 'r_altvater_reif', name: 'Altvater Reif', sprite: 'schneebrute', tint: 0xd8f4ff, scale: 1.5, named: true, element: 'water', hpMul: 11, dmgMul: 1.5, defMul: 1.8, xpMul: 9, speed: 42, radius: 15, ai: 'charge', aggro: 150,
    atk: { range: 100, windup: 0.8, cd: 2.4, reach: 22, mult: 1.45, status: { id: 'stun', dur: 0.7, chance: 0.4 } }, weak: ['light', 'earth'], resist: ['wind'] }),
  E({ id: 'r_nordlicht', name: 'Irrlicht Nordwärts', sprite: 'frostwisp', tint: 0xa0ffd0, scale: 1.8, named: true, element: 'wind', hpMul: 7, dmgMul: 1.3, defMul: 0.7, xpMul: 9, speed: 76, radius: 9, ai: 'blink', flying: true, aggro: 170,
    atk: { range: 22, windup: 0.3, cd: 1.1, reach: 18, status: { id: 'slow', dur: 2, chance: 0.5 } }, weak: ['light'], resist: ['phys'] }),
  // ---------------- Verlorene Ruinen
  E({ id: 'r_quill', name: 'Unterarchivar Quill', sprite: 'arkanauge', tint: 0xffe0a0, scale: 1.7, named: true, element: 'light', hpMul: 8.5, dmgMul: 1.3, defMul: 1, xpMul: 9, speed: 48, radius: 11, ai: 'ranged', flying: true, aggro: 180,
    atk: { range: 150, windup: 0.7, cd: 2.1, proj: { spr: 'lance', speed: 230, count: 3, spread: 22 }, mult: 1.05 }, weak: ['wind'] }),
  E({ id: 'r_sockel', name: 'Das Standbild auf dem falschen Sockel', sprite: 'runenwaechter', tint: 0xb8b8c0, scale: 1.5, named: true, element: 'earth', hpMul: 12, dmgMul: 1.4, defMul: 2.4, xpMul: 9, speed: 34, radius: 15, ai: 'chase', aggro: 130,
    atk: { range: 28, windup: 0.6, cd: 1.6, reach: 24, mult: 1.35 }, weak: ['wind', 'fire'], resist: ['phys'] }),
  // ---------------- Schattenreich
  E({ id: 'r_stunde', name: 'Die Verlorene Stunde', sprite: 'nachtmahr', tint: 0xa0e0ff, scale: 1.5, named: true, element: 'dark', hpMul: 8.5, dmgMul: 1.3, defMul: 1, xpMul: 9, speed: 112, radius: 13, ai: 'chase', aggro: 180,
    atk: { range: 24, windup: 0.22, cd: 0.6, reach: 19, mult: 0.8 }, weak: ['fire', 'light'] }),
  E({ id: 'r_hohlprinz', name: 'Hohlprinz Ohneland', sprite: 'hohlritter', tint: 0xffd8a8, scale: 1.4, named: true, element: 'dark', hpMul: 11, dmgMul: 1.45, defMul: 2.2, xpMul: 9, speed: 46, radius: 14, ai: 'chase', aggro: 150,
    atk: { range: 28, windup: 0.6, cd: 1.5, reach: 24, mult: 1.4, status: { id: 'stun', dur: 0.6, chance: 0.3 } }, weak: ['earth', 'light'], resist: ['water'] }),
  // ---------------- Helfer der seltenen Monster
  E({ id: 'r_trugbild', name: 'Trugbild', sprite: 'hohlritter', tint: 0x8878c0, element: 'dark', hpMul: 0.9, dmgMul: 0.9, defMul: 0.6, xpMul: 0.5, speed: 50, radius: 9, ai: 'chase', aggro: 220,
    atk: { range: 26, windup: 0.6, cd: 1.6, reach: 20 }, weak: ['light'] }),
  // ---------------- Weltbosse (Leben skaliert mit den Teilnehmern, siehe CFG.living.boss)
  E({ id: 'wb_moosgrimm', name: 'Moosgrimm', sprite: 'schneebrute', tint: 0x8fd070, scale: 2.6, named: true, element: 'earth', hpMul: 46, dmgMul: 1.5, defMul: 1.8, xpMul: 24, speed: 36, radius: 24, ai: 'chase', aggro: 200,
    atk: { range: 38, windup: 0.8, cd: 1.9, reach: 34, mult: 1.4 }, weak: ['fire'], resist: ['water'] }),
  E({ id: 'wb_aschenmaul', name: 'Aschenmaul', sprite: 'aschenhund', tint: 0xff9060, scale: 3, named: true, element: 'fire', hpMul: 50, dmgMul: 1.55, defMul: 1.5, xpMul: 24, speed: 62, radius: 24, ai: 'charge', aggro: 220,
    atk: { range: 110, windup: 0.75, cd: 2.3, reach: 28, mult: 1.45, status: { id: 'burn', dur: 3, chance: 0.5 } }, weak: ['water', 'earth'], resist: ['fire'] }),
  E({ id: 'wb_niemand', name: 'Feldwebel Niemand', sprite: 'hohlritter', tint: 0xc0a0ff, scale: 2.4, named: true, element: 'dark', hpMul: 54, dmgMul: 1.6, defMul: 2, xpMul: 24, speed: 44, radius: 24, ai: 'chase', aggro: 210,
    atk: { range: 40, windup: 0.75, cd: 1.7, reach: 36, mult: 1.45, status: { id: 'weak', dur: 3, chance: 0.4 } }, weak: ['light', 'fire'], resist: ['dark'] }),
  // ---------------- Gegner der Ereignisse und Begegnungen
  E({ id: 'ev_wogenbrecher', name: 'Wogenbrecher', sprite: 'frostwolf', tint: 0x80ffe8, scale: 1.4, named: true, element: 'water', hpMul: 4, dmgMul: 1.25, defMul: 1.1, xpMul: 2, speed: 84, radius: 11, ai: 'chase', aggro: 240,
    atk: { range: 22, windup: 0.3, cd: 1, reach: 18, status: { id: 'slow', dur: 1.5, chance: 0.35 } }, weak: ['wind'] }),
  E({ id: 'ev_aschenteufel', name: 'Aschenteufel', sprite: 'glutimp', tint: 0x9a9aa4, element: 'wind', hpMul: 1.1, dmgMul: 1.05, defMul: 0.7, xpMul: 1, speed: 66, radius: 6, ai: 'ranged', aggro: 260,
    atk: { range: 120, windup: 0.5, cd: 1.7, proj: { spr: 'orb', speed: 140 }, status: { id: 'burn', dur: 2, chance: 0.3 } }, weak: ['water'] }),
  E({ id: 'ev_sturmwolf', name: 'Der Weiße Leitwolf', sprite: 'frostwolf', tint: 0xffffff, scale: 1.6, named: true, element: 'water', hpMul: 6.5, dmgMul: 1.35, defMul: 1.2, xpMul: 3, speed: 90, radius: 12, ai: 'chase', aggro: 260,
    atk: { range: 24, windup: 0.28, cd: 0.9, reach: 19, status: { id: 'slow', dur: 2, chance: 0.4 } }, weak: ['light', 'earth'] }),
  E({ id: 'ev_duellant', name: 'Ritter Kunibert von Ungefähr', sprite: 'hohlritter', tint: 0xdfe6f2, named: true, element: 'phys', hpMul: 4.5, dmgMul: 1.15, defMul: 1.6, xpMul: 2, speed: 50, radius: 10, ai: 'chase', aggro: 0,
    atk: { range: 26, windup: 0.6, cd: 1.5, reach: 21, mult: 1.2 } }),
];

const R = (r: RareDef) => r;
export const RARE_LIST: RareDef[] = [
  R({ id: 'borkenkoenig', mob: 'r_borkenkoenig', zone: 'gruenwald', lvl: 6, trait: 'shield', spots: [['lager', 7, -6], ['weiher', -6, 5], ['schrein', -8, -5]],
    hint: 'Irgendwo knarrt es, als würde ein Baum sich räuspern.' }),
  R({ id: 'fliegenhut', mob: 'r_fliegenhut', zone: 'gruenwald', lvl: 6, trait: 'summon', night: true, star: true, adds: ['pilzling', 2], spots: [['weiher', 6, 6], ['gruft', 8, 7], ['schrein', 7, 6]],
    hint: 'Es riecht nach nassem Keller. Die Pilze am Wegrand stehen stramm.' }),
  R({ id: 'tante_echo', mob: 'r_tante_echo', zone: 'kristall', lvl: 11, trait: 'enrage', spots: [['halle', -6, 5], ['see', 7, -6], ['tief', -6, -5]],
    hint: 'Dein eigener Schritt hallt zurück. Zu früh.' }),
  R({ id: 'guenther', mob: 'r_guenther', zone: 'kristall', lvl: 11, trait: 'split', adds: ['kristallkrabbler', 3], seasons: [0, 1, 2], spots: [['see', -7, 6], ['halle', 7, 6], ['tief', 7, 4]],
    hint: 'Etwas klickt im Dunkeln. Langsam. Geduldig. In deine Richtung.' }),
  R({ id: 'meister_russ', mob: 'r_meister_russ', zone: 'glut', lvl: 16, trait: 'volley', weather: ['ash'], spots: [['mitte', 7, -6], ['krater', -7, 5], ['feld', 8, -6]],
    hint: 'In der Asche tanzt etwas. Es kichert, und es hat eine Kelle.' }),
  R({ id: 'glucke', mob: 'r_glucke', zone: 'glut', lvl: 16, trait: 'burntrail', seasons: [0, 1, 2], spots: [['krater', 6, 6], ['mitte', -8, 6], ['feld', -6, -7]],
    hint: 'Der Boden ist hier wärmer als sonst. Jemand brütet.' }),
  R({ id: 'altvater_reif', mob: 'r_altvater_reif', zone: 'frost', lvl: 21, trait: 'frostaura', weather: ['snow', 'blizzard'], spots: [['grat', -7, 6], ['gipfel', -6, 6], ['see', -8, -5]],
    hint: 'Dein Atem gefriert, bevor er den Mund verlässt.' }),
  R({ id: 'nordlicht', mob: 'r_nordlicht', zone: 'frost', lvl: 21, trait: 'blink', night: true, star: true, spots: [['see', 7, 5], ['gipfel', 7, -5], ['grat', 8, -6]],
    hint: 'Ein grünes Licht steht über dem Schnee und tut so, als wäre es ein Stern.' }),
  R({ id: 'quill', mob: 'r_quill', zone: 'ruinen', lvl: 26, trait: 'regen', spots: [['platz', -9, -7], ['turm', -6, 6], ['garten', 7, -6]],
    hint: 'Papier raschelt. Hier gibt es seit vierhundert Jahren kein Papier mehr.' }),
  R({ id: 'sockel', mob: 'r_sockel', zone: 'ruinen', lvl: 26, trait: 'quake', weather: ['motes', 'rain'], spots: [['platz', 9, 8], ['garten', -7, -6], ['turm', 6, -7]],
    hint: 'Eine der Statuen steht nicht mehr dort, wo sie vorhin stand.' }),
  R({ id: 'stunde', mob: 'r_stunde', zone: 'schatten', lvl: 31, trait: 'haste', spots: [['mitte', -8, 7], ['westen', 7, 6], ['osten', -7, 6]],
    hint: 'Für einen Augenblick fehlt dir eine Stunde. Dann galoppiert sie vorbei.' }),
  R({ id: 'hohlprinz', mob: 'r_hohlprinz', zone: 'schatten', lvl: 31, trait: 'decoy', adds: ['r_trugbild', 2], seasons: [2, 3], spots: [['mitte', 8, -7], ['osten', 6, -7], ['westen', -6, -7]],
    hint: 'Jemand hüstelt hoheitsvoll. Es klingt hohl.' }),
];
export const RARES: Record<string, RareDef> = Object.fromEntries(RARE_LIST.map(r => [r.id, r]));
export const RARE_BY_MOB: Record<string, RareDef> = Object.fromEntries(RARE_LIST.map(r => [r.mob, r]));

export const WORLD_BOSS_LIST: WorldBossDef[] = [
  { id: 'moosgrimm', mob: 'wb_moosgrimm', name: 'Moosgrimm', title: 'Der wandernde Hügel', zones: ['gruenwald', 'kristall'], element: 'earth',
    pattern: ['stomp', 'adds', 'rain', 'stomp', 'ring'], every: 5.5, adds: ['moosling', 'wurzelschleicher'], proj: 'rock',
    announce: 'Ein Hügel ist aufgestanden und geht spazieren. Moosgrimm, der wandernde Hügel, wurde gesichtet:',
    win: 'Moosgrimm legt sich hin und ist wieder Landschaft. Bis zum nächsten Mal.',
    gone: 'Moosgrimm hat sich einen ruhigeren Platz gesucht und ist wieder ein Hügel geworden.' },
  { id: 'aschenmaul', mob: 'wb_aschenmaul', name: 'Aschenmaul', title: 'Der Hund, der den Winter jagt', zones: ['glut', 'frost'], element: 'fire',
    pattern: ['lines', 'ring', 'adds', 'rain', 'lines'], every: 5, adds: ['aschenhund', 'glutimp'], proj: 'orb',
    announce: 'Die Nomaden löschen ihre Feuer – er riecht sie sonst. Aschenmaul, der Hund, der den Winter jagt, streift umher:',
    win: 'Aschenmaul rollt sich zusammen und erkaltet zu Schlacke. Sie ist handwarm. Niemand fasst sie an.',
    gone: 'Aschenmaul hat die Fährte verloren und ist im Rauch verschwunden.' },
  { id: 'niemand', mob: 'wb_niemand', name: 'Feldwebel Niemand', title: 'Letzter Mann einer vergessenen Armee', zones: ['ruinen', 'schatten'], element: 'dark',
    pattern: ['adds', 'stomp', 'lines', 'rain', 'ring'], every: 5, adds: ['skelettkrieger', 'fluchgeist'], proj: 'orb',
    announce: 'Jemand ruft zum Appell, und es antwortet eine Armee, die es nicht mehr gibt. Feldwebel Niemand ist angetreten:',
    win: 'Feldwebel Niemand salutiert. Zum ersten Mal seit tausend Jahren sagt ihm jemand: „Wegtreten.“',
    gone: 'Feldwebel Niemand hat vergeblich auf Gegner gewartet und ist weitermarschiert.' },
];
export const WORLD_BOSSES: Record<string, WorldBossDef> = Object.fromEntries(WORLD_BOSS_LIST.map(b => [b.id, b]));
export const BOSS_BY_MOB: Record<string, WorldBossDef> = Object.fromEntries(WORLD_BOSS_LIST.map(b => [b.mob, b]));
