import type { Element, StatusSpec } from '../types';
import { BOSS_UNIQUE } from './items';
import { WORLD_ENEMIES } from './rares';

export interface EnemyDef {
  id: string;
  name: string;
  element: Element;
  hpMul: number; dmgMul: number; defMul: number; xpMul: number;
  speed: number;       // px/s
  radius: number;      // Kollisions-/Trefferradius
  /** Verhalten: chase = Nahkämpfer, ranged = hält Abstand und schießt, charge = Anlauf + Sturm, caster = Flächenzauber, blink = teleportiert */
  ai: 'chase' | 'ranged' | 'charge' | 'caster' | 'blink';
  move?: 'walk' | 'hop' | 'swoop';
  flying?: boolean;
  aggro: number;
  atk: {
    range: number;     // Distanz, ab der angegriffen wird
    windup: number;    // s Vorwarnzeit (Telegraph)
    cd: number;        // s Pause danach
    reach?: number;    // Nahkampf: Trefferradius um den Punkt vor dem Gegner
    proj?: { spr: string; speed: number; count?: number; spread?: number; range?: number };
    aoe?: { radius: number; delay: number };
    status?: StatusSpec;
    mult?: number;
  };
  /** Zusätzliche Beute: [itemId, Chance] */
  drops?: [string, number][];
  /** Darstellung (ab 0.3): Sprite eines anderen Gegners wiederverwenden und einfärben */
  sprite?: string; tint?: number;
  /** 0.6: Größenfaktor der Darstellung; `named` = Name über dem Kopf und eigene Markierung auf der Minimap (seltene Monster, Weltbosse) */
  scale?: number; named?: boolean;
  /** Ausdrückliche Schwächen/Resistenzen zusätzlich zum Elementkreislauf (0.4; Faktoren: CFG.elements) */
  weak?: Element[];
  resist?: Element[];
}

const E = (e: EnemyDef) => e;

export const ENEMY_LIST: EnemyDef[] = [
  // ---------------- Grünwald
  E({ id: 'moosling', name: 'Moosling', element: 'earth', hpMul: 0.8, dmgMul: 0.8, defMul: 0.6, xpMul: 0.8, speed: 38, radius: 7, ai: 'chase', move: 'hop', aggro: 90,
    atk: { range: 18, windup: 0.45, cd: 1.3, reach: 14 }, drops: [['mat_herb', 0.25]], weak: ['fire'] }),
  E({ id: 'dornkaefer', name: 'Dornkäfer', element: 'earth', hpMul: 1.1, dmgMul: 1, defMul: 1.6, xpMul: 1, speed: 44, radius: 7, ai: 'charge', aggro: 110,
    atk: { range: 70, windup: 0.6, cd: 2.2, reach: 12, mult: 1.3 }, drops: [['mat_wood', 0.2]], weak: ['fire'], resist: ['dark'] }),
  E({ id: 'pilzling', name: 'Pilzling', element: 'earth', hpMul: 0.75, dmgMul: 0.9, defMul: 0.7, xpMul: 1, speed: 34, radius: 7, ai: 'ranged', aggro: 130,
    atk: { range: 110, windup: 0.6, cd: 2.2, proj: { spr: 'spore', speed: 95 }, status: { id: 'poison', dur: 3, chance: 0.4 } }, drops: [['q_pilzhut', 0.5], ['mat_herb', 0.2]], weak: ['fire'] }),
  E({ id: 'waldwolf', name: 'Waldwolf', element: 'wind', hpMul: 1, dmgMul: 1.15, defMul: 0.8, xpMul: 1.15, speed: 74, radius: 8, ai: 'chase', aggro: 140,
    atk: { range: 20, windup: 0.35, cd: 1.1, reach: 15 }, drops: [['mat_wood', 0.1], ['q_puppe', 0.4]] }),
  E({ id: 'wurzelschleicher', name: 'Wurzelschleicher', element: 'earth', hpMul: 1.2, dmgMul: 1.1, defMul: 1, xpMul: 1.2, speed: 52, radius: 7, ai: 'chase', aggro: 130,
    atk: { range: 20, windup: 0.5, cd: 1.4, reach: 16, status: { id: 'slow', dur: 2, chance: 0.5 } }, drops: [['mat_wood', 0.3]], weak: ['fire'] }),
  // ---------------- Kristallhöhlen
  E({ id: 'fledermaus', name: 'Höhlenfledermaus', element: 'wind', hpMul: 0.65, dmgMul: 0.9, defMul: 0.5, xpMul: 0.9, speed: 82, radius: 6, ai: 'chase', move: 'swoop', flying: true, aggro: 150,
    atk: { range: 16, windup: 0.25, cd: 1.2, reach: 13 }, drops: [['q_fluegel', 0.5]], weak: ['light'] }),
  E({ id: 'kristallkrabbler', name: 'Kristallkrabbler', element: 'earth', hpMul: 1.3, dmgMul: 1.05, defMul: 2, xpMul: 1.2, speed: 40, radius: 8, ai: 'chase', aggro: 100,
    atk: { range: 20, windup: 0.55, cd: 1.5, reach: 16, mult: 1.2 }, drops: [['mat_crystal', 0.35]], weak: ['dark'], resist: ['light'] }),
  E({ id: 'glimmerwisp', name: 'Glimmerwisp', element: 'light', hpMul: 0.7, dmgMul: 1, defMul: 0.6, xpMul: 1.1, speed: 50, radius: 6, ai: 'ranged', flying: true, aggro: 150,
    atk: { range: 130, windup: 0.5, cd: 1.9, proj: { spr: 'orb', speed: 120 } }, drops: [['mat_crystal', 0.2]], weak: ['wind'], resist: ['fire'] }),
  E({ id: 'tropfschleim', name: 'Tropfschleim', element: 'water', hpMul: 1, dmgMul: 0.9, defMul: 0.8, xpMul: 1, speed: 42, radius: 7, ai: 'chase', move: 'hop', aggro: 100,
    atk: { range: 18, windup: 0.45, cd: 1.3, reach: 14, status: { id: 'slow', dur: 2, chance: 0.35 } }, drops: [['mat_crystal', 0.15]], weak: ['wind'], resist: ['phys'] }),
  // ---------------- Glutlande
  E({ id: 'glutimp', name: 'Glutimp', element: 'fire', hpMul: 0.8, dmgMul: 1.05, defMul: 0.7, xpMul: 1.1, speed: 56, radius: 6, ai: 'ranged', aggro: 150,
    atk: { range: 125, windup: 0.5, cd: 1.8, proj: { spr: 'orb', speed: 135 }, status: { id: 'burn', dur: 3, chance: 0.4 } }, drops: [['mat_ember', 0.25]], weak: ['light'] }),
  E({ id: 'aschenhund', name: 'Aschenhund', element: 'fire', hpMul: 1, dmgMul: 1.2, defMul: 0.8, xpMul: 1.15, speed: 80, radius: 8, ai: 'charge', aggro: 150,
    atk: { range: 80, windup: 0.5, cd: 1.9, reach: 13, mult: 1.25 }, drops: [['mat_ember', 0.15]], weak: ['earth'] }),
  E({ id: 'magmaschleim', name: 'Magmaschleim', element: 'fire', hpMul: 1.15, dmgMul: 1, defMul: 1, xpMul: 1, speed: 40, radius: 7, ai: 'chase', move: 'hop', aggro: 100,
    atk: { range: 18, windup: 0.45, cd: 1.3, reach: 14, status: { id: 'burn', dur: 3, chance: 0.5 } }, drops: [['mat_ember', 0.2]], weak: ['earth'] }),
  E({ id: 'schlackengolem', name: 'Schlackengolem', element: 'fire', hpMul: 2.2, dmgMul: 1.5, defMul: 2, xpMul: 2, speed: 32, radius: 11, ai: 'caster', aggro: 130,
    atk: { range: 90, windup: 0.3, cd: 2.8, aoe: { radius: 30, delay: 0.9 }, mult: 1.3 }, drops: [['q_kern', 0.6], ['mat_ember', 0.5]], weak: ['earth'], resist: ['phys'] }),
  // ---------------- Frostgebirge
  E({ id: 'frostwolf', name: 'Frostwolf', element: 'water', hpMul: 1.05, dmgMul: 1.15, defMul: 0.9, xpMul: 1.15, speed: 80, radius: 8, ai: 'chase', aggro: 160,
    atk: { range: 20, windup: 0.3, cd: 1.0, reach: 15, status: { id: 'slow', dur: 1.5, chance: 0.3 } }, drops: [['q_pelz', 0.45]] }),
  E({ id: 'eiswicht', name: 'Eiswicht', element: 'water', hpMul: 0.8, dmgMul: 1, defMul: 0.7, xpMul: 1.1, speed: 54, radius: 6, ai: 'ranged', aggro: 150,
    atk: { range: 135, windup: 0.5, cd: 2, proj: { spr: 'shard', speed: 150, count: 3, spread: 30 }, status: { id: 'slow', dur: 2, chance: 0.5 }, mult: 0.7 }, drops: [['mat_frost', 0.25]], weak: ['light'] }),
  E({ id: 'schneebrute', name: 'Schneebrute', element: 'water', hpMul: 2.4, dmgMul: 1.5, defMul: 1.6, xpMul: 2, speed: 40, radius: 11, ai: 'charge', aggro: 130,
    atk: { range: 90, windup: 0.8, cd: 2.6, reach: 18, mult: 1.5, status: { id: 'stun', dur: 0.8, chance: 0.5 } }, drops: [['mat_frost', 0.5]], weak: ['light'], resist: ['wind'] }),
  E({ id: 'frostwisp', name: 'Frostwisp', element: 'wind', hpMul: 0.7, dmgMul: 1.05, defMul: 0.6, xpMul: 1.1, speed: 58, radius: 6, ai: 'caster', flying: true, aggro: 150,
    atk: { range: 120, windup: 0.3, cd: 2.4, aoe: { radius: 24, delay: 0.8 } }, drops: [['mat_frost', 0.2]], weak: ['light'], resist: ['phys'] }),
  // ---------------- Verlorene Ruinen
  E({ id: 'runenwaechter', name: 'Runenwächter', element: 'light', hpMul: 2.3, dmgMul: 1.4, defMul: 2.2, xpMul: 2, speed: 34, radius: 11, ai: 'caster', aggro: 130,
    atk: { range: 100, windup: 0.4, cd: 2.6, aoe: { radius: 32, delay: 0.9 }, mult: 1.3, status: { id: 'weak', dur: 3, chance: 0.5 } }, drops: [['q_tafel', 0.5], ['mat_rune', 0.5]], weak: ['wind'], resist: ['phys'] }),
  E({ id: 'skelettkrieger', name: 'Skelettkrieger', element: 'dark', hpMul: 1.1, dmgMul: 1.2, defMul: 1.3, xpMul: 1.15, speed: 58, radius: 7, ai: 'chase', aggro: 150,
    atk: { range: 22, windup: 0.4, cd: 1.2, reach: 17 }, drops: [['mat_rune', 0.2]], weak: ['earth'] }),
  E({ id: 'fluchgeist', name: 'Fluchgeist', element: 'dark', hpMul: 0.85, dmgMul: 1.1, defMul: 0.6, xpMul: 1.2, speed: 52, radius: 7, ai: 'ranged', flying: true, aggro: 160,
    atk: { range: 130, windup: 0.5, cd: 2, proj: { spr: 'orb', speed: 115 }, status: { id: 'weak', dur: 3, chance: 0.4 } }, drops: [['mat_rune', 0.2]], weak: ['fire'], resist: ['phys'] }),
  E({ id: 'arkanauge', name: 'Arkanauge', element: 'light', hpMul: 0.9, dmgMul: 1.15, defMul: 0.8, xpMul: 1.25, speed: 46, radius: 7, ai: 'ranged', flying: true, aggro: 170,
    atk: { range: 150, windup: 0.7, cd: 2.4, proj: { spr: 'lance', speed: 230 }, mult: 1.3 }, drops: [['mat_rune', 0.25]], weak: ['wind'] }),
  // ---------------- Schattenreich
  E({ id: 'schattenwandler', name: 'Schattenwandler', element: 'dark', hpMul: 1, dmgMul: 1.3, defMul: 0.8, xpMul: 1.3, speed: 70, radius: 7, ai: 'blink', aggro: 170,
    atk: { range: 22, windup: 0.35, cd: 1.3, reach: 16 }, drops: [['mat_void', 0.25]], weak: ['fire'] }),
  E({ id: 'leerenbrut', name: 'Leerenbrut', element: 'dark', hpMul: 1.2, dmgMul: 1, defMul: 1, xpMul: 1.1, speed: 48, radius: 7, ai: 'chase', move: 'hop', aggro: 130,
    atk: { range: 18, windup: 0.4, cd: 1.2, reach: 15, status: { id: 'mark', dur: 4, chance: 0.4 } }, drops: [['mat_void', 0.2]], weak: ['fire'] }),
  E({ id: 'nachtmahr', name: 'Nachtmahr', element: 'dark', hpMul: 1.7, dmgMul: 1.4, defMul: 1.1, xpMul: 1.7, speed: 76, radius: 10, ai: 'charge', aggro: 170,
    atk: { range: 100, windup: 0.55, cd: 2, reach: 16, mult: 1.4 }, drops: [['mat_void', 0.35]], weak: ['fire'] }),
  E({ id: 'hohlritter', name: 'Hohlritter', element: 'dark', hpMul: 2.5, dmgMul: 1.5, defMul: 2.4, xpMul: 2.2, speed: 42, radius: 10, ai: 'chase', aggro: 140,
    atk: { range: 26, windup: 0.6, cd: 1.6, reach: 22, mult: 1.4, status: { id: 'stun', dur: 0.7, chance: 0.3 } }, drops: [['mat_void', 0.5]], weak: ['earth'], resist: ['water'] }),
  // ---------------- Akt II (0.3): Quellgrund, Vaels Wacht, Herz der Quelle – vorhandene Sprites, neu eingefärbt
  E({ id: 'wogenling', name: 'Wogenling', sprite: 'tropfschleim', tint: 0x80ffe0, element: 'water', hpMul: 1.1, dmgMul: 1, defMul: 0.9, xpMul: 1.1, speed: 46, radius: 7, ai: 'chase', move: 'hop', aggro: 130,
    atk: { range: 18, windup: 0.45, cd: 1.3, reach: 14, status: { id: 'slow', dur: 2, chance: 0.4 } }, drops: [['q_traumscherbe', 0.5], ['mat_crystal', 0.2]], weak: ['wind'] }),
  E({ id: 'tiefenlicht', name: 'Tiefenlicht', sprite: 'glimmerwisp', tint: 0x9fd0ff, element: 'light', hpMul: 0.8, dmgMul: 1.1, defMul: 0.6, xpMul: 1.2, speed: 52, radius: 6, ai: 'ranged', flying: true, aggro: 160,
    atk: { range: 135, windup: 0.5, cd: 1.9, proj: { spr: 'orb', speed: 130 } }, drops: [['q_traumscherbe', 0.4]], weak: ['wind'], resist: ['fire'] }),
  E({ id: 'grundkrebs', name: 'Grundkrebs', sprite: 'kristallkrabbler', tint: 0xa0c0ff, element: 'earth', hpMul: 1.5, dmgMul: 1.15, defMul: 2.2, xpMul: 1.4, speed: 42, radius: 8, ai: 'chase', aggro: 110,
    atk: { range: 20, windup: 0.55, cd: 1.5, reach: 16, mult: 1.25 }, drops: [['q_traumscherbe', 0.45], ['mat_crystal', 0.3]], weak: ['fire'], resist: ['phys'] }),
  E({ id: 'stillefalter', name: 'Stillefalter', sprite: 'fledermaus', tint: 0xe0e8ff, element: 'wind', hpMul: 0.8, dmgMul: 1.05, defMul: 0.5, xpMul: 1.1, speed: 86, radius: 6, ai: 'chase', move: 'swoop', flying: true, aggro: 160,
    atk: { range: 16, windup: 0.25, cd: 1.1, reach: 13, status: { id: 'weak', dur: 3, chance: 0.3 } }, drops: [['q_traumscherbe', 0.35]], weak: ['light'] }),
  E({ id: 'traumwaechter', name: 'Traumwächter', sprite: 'runenwaechter', tint: 0xb8a0ff, element: 'dark', hpMul: 2.4, dmgMul: 1.45, defMul: 2.2, xpMul: 2.1, speed: 34, radius: 11, ai: 'caster', aggro: 130,
    atk: { range: 100, windup: 0.4, cd: 2.6, aoe: { radius: 32, delay: 0.9 }, mult: 1.3, status: { id: 'mark', dur: 4, chance: 0.5 } }, drops: [['q_traumscherbe', 0.8], ['mat_void', 0.4]], weak: ['fire'], resist: ['phys'] }),
  E({ id: 'erinnerter', name: 'Erinnerter Soldat', sprite: 'skelettkrieger', tint: 0xb0a8ff, element: 'dark', hpMul: 1.2, dmgMul: 1.25, defMul: 1.3, xpMul: 1.25, speed: 60, radius: 7, ai: 'chase', aggro: 150,
    atk: { range: 22, windup: 0.4, cd: 1.2, reach: 17 }, drops: [['mat_void', 0.2]], weak: ['fire'] }),
  E({ id: 'wachschatten', name: 'Wachschatten', sprite: 'schattenwandler', tint: 0xd0c0ff, element: 'dark', hpMul: 1.1, dmgMul: 1.35, defMul: 0.8, xpMul: 1.35, speed: 72, radius: 7, ai: 'blink', aggro: 170,
    atk: { range: 22, windup: 0.35, cd: 1.3, reach: 16 }, drops: [['mat_void', 0.25]], weak: ['fire'] }),
  E({ id: 'klagegeist', name: 'Klagegeist', sprite: 'fluchgeist', tint: 0xc0e0ff, element: 'wind', hpMul: 0.9, dmgMul: 1.15, defMul: 0.6, xpMul: 1.25, speed: 52, radius: 7, ai: 'ranged', flying: true, aggro: 160,
    atk: { range: 130, windup: 0.5, cd: 2, proj: { spr: 'orb', speed: 120 }, status: { id: 'weak', dur: 3, chance: 0.4 } }, drops: [['mat_void', 0.2]], weak: ['light'] }),
  E({ id: 'albtraumross', name: 'Albtraumross', sprite: 'nachtmahr', tint: 0xffb8a0, element: 'fire', hpMul: 1.8, dmgMul: 1.45, defMul: 1.1, xpMul: 1.8, speed: 78, radius: 10, ai: 'charge', aggro: 170,
    atk: { range: 100, windup: 0.55, cd: 2, reach: 16, mult: 1.4, status: { id: 'burn', dur: 3, chance: 0.4 } }, drops: [['mat_void', 0.35]], weak: ['earth'] }),
  // ---------------- Echo-Begegnungen (nur beschworen)
  E({ id: 'hueterecho', name: 'Hüter-Echo', sprite: 'hohlritter', tint: 0xffe9a0, element: 'light', hpMul: 2.2, dmgMul: 1.35, defMul: 1.8, xpMul: 3, speed: 46, radius: 10, ai: 'chase', aggro: 220,
    atk: { range: 26, windup: 0.6, cd: 1.6, reach: 22, mult: 1.4 }, weak: ['wind'] }),
  E({ id: 'wogenwolf', name: 'Wogenwolf', sprite: 'frostwolf', tint: 0x80ffe8, element: 'water', hpMul: 1.8, dmgMul: 1.2, defMul: 1, xpMul: 2.5, speed: 82, radius: 8, ai: 'chase', aggro: 220,
    atk: { range: 20, windup: 0.3, cd: 1.0, reach: 15, status: { id: 'slow', dur: 1.5, chance: 0.3 } }, weak: ['wind'] }),
  E({ id: 'vorbote', name: 'Vorbote der Stille', sprite: 'arkanauge', tint: 0xe8f0ff, element: 'wind', hpMul: 2, dmgMul: 1.3, defMul: 1.2, xpMul: 3, speed: 48, radius: 8, ai: 'ranged', flying: true, aggro: 220,
    atk: { range: 150, windup: 0.7, cd: 2.2, proj: { spr: 'lance', speed: 220, count: 3, spread: 26 }, mult: 1.1 }, weak: ['light'] }),
];
// Lebendige Welt (0.6): seltene Monster, Weltbosse, Ereignisgegner – nur beschworen, in keiner Gebietsliste
ENEMY_LIST.push(...WORLD_ENEMIES);
export const ENEMIES: Record<string, EnemyDef> = Object.fromEntries(ENEMY_LIST.map(e => [e.id, e]));

export interface BossDef {
  id: string; name: string; title: string; element: Element; level: number;
  hpMul: number; dmgMul: number; defMul: number; radius: number; speed: number;
  seal: string; xp: number; gold: number;
  intro: string;
  // ---- Story-Bosse (ab 0.3)
  /** Der Kampf endet, wenn der Boss sich ergibt (bei diesem HP-Anteil) – er stirbt nicht und bleibt danach friedlich im Raum. */
  spared?: number;
  /** Name während des Kampfes, falls er vom Wesen abweicht */
  fightName?: string;
  /** Worte am Ende eines verschonenden Kampfes */
  outro?: string;
  /** Filmszene beim ersten Kampfbeginn */
  awaken?: string;
  /** Ruhepose (Schlussbild der Sterbe-Animation) auch ohne vorherigen Kampf, wenn alle Anwesenden bestanden haben */
  calm?: boolean;
  /** Ausdrückliche Schwächen/Resistenzen zusätzlich zum Elementkreislauf (0.4) */
  weak?: Element[];
  resist?: Element[];
}
export const BOSSES: Record<string, BossDef> = {
  dornenmutter: { id: 'dornenmutter', name: 'Dornenmutter', title: 'Herz der Wurzelgruft', element: 'earth', level: 6, hpMul: 50, dmgMul: 1.6, defMul: 1.2, radius: 20, speed: 0, seal: 'seal_earth', xp: 420, gold: 150, weak: ['fire'],
    intro: 'Die Ranken an den Wänden ziehen sich zusammen. Etwas Großes hat dich bemerkt.' },
  kristallkoloss: { id: 'kristallkoloss', name: 'Kristallkoloss', title: 'Wächter der Tiefen Geode', element: 'light', level: 12, hpMul: 52, dmgMul: 2.2, defMul: 1.8, radius: 20, speed: 34, seal: 'seal_light', xp: 1200, gold: 380, weak: ['earth'], resist: ['fire'],
    intro: 'Der Fels selbst richtet sich auf. Licht bricht aus den Rissen in seiner Brust.' },
  ignarok: { id: 'ignarok', name: 'Ignarok', title: 'Der Schlackenwurm', element: 'fire', level: 17, hpMul: 50, dmgMul: 2.0, defMul: 1.4, radius: 20, speed: 0, seal: 'seal_fire', xp: 2400, gold: 700, weak: ['earth'],
    intro: 'Die Lava wölbt sich. Dann bricht der Wurm mit einem Brüllen hervor, das die Schmiede erzittern lässt.' },
  ysolde: { id: 'ysolde', name: 'Ysolde', title: 'Die Frostweberin', element: 'water', level: 22, hpMul: 52, dmgMul: 2.1, defMul: 1.2, radius: 14, speed: 46, seal: 'seal_water', xp: 4000, gold: 1100, weak: ['light'], resist: ['wind'],
    intro: '„Noch ein Faden, der sich gegen das Muster sträubt. Halt still – es tut nur kurz weh.“' },
  archivar: { id: 'archivar', name: 'Der Archivar', title: 'Hüter des Archivs der Stille', element: 'wind', level: 27, hpMul: 54, dmgMul: 2.0, defMul: 1.5, radius: 18, speed: 30, seal: 'seal_wind', xp: 6200, gold: 1600, weak: ['water'], resist: ['light'],
    intro: '„Besucher. Nicht katalogisiert. Wird berichtigt.“' },
  hohlkoenig: { id: 'hohlkoenig', name: 'Der Hohle König', title: 'Morvain, letzter Quellhüter', element: 'dark', level: 33, hpMul: 56, dmgMul: 1.5, defMul: 1.6, radius: 18, speed: 60, seal: 'seal_dark', xp: 12000, gold: 4000, weak: ['fire'],
    intro: '„Ich habe die Quelle nicht gestohlen. Ich habe sie getrunken, damit sie in mir weiterlebt. Du willst sie zurück? Dann hol sie dir.“' },
  // ---- Akt II (0.3): Beide werden nicht getötet. Vael ergibt sich; bei Aetherion endet der Albtraum, nicht das Wesen.
  vael: { id: 'vael', name: 'Vael', title: 'Hüter der Dunkelheit', element: 'dark', weak: ['fire'], resist: ['water'], level: 38, hpMul: 78, dmgMul: 1.85, defMul: 1.5, radius: 16, speed: 58, seal: 'q_wachzeichen', xp: 8000, gold: 2500,
    spared: 0.1, outro: '„Genug. Genug, ich bitte Euch. … Bestanden.“',
    intro: '„Ich bitte um Verzeihung für das, was jetzt kommt. Es ist nicht persönlich. Es ist gründlich.“' },
  aetherion: { id: 'aetherion', name: 'Aetherion', fightName: 'Die Große Stille', title: 'Albtraum des Träumers', element: 'earth', level: 40, hpMul: 84, dmgMul: 1.9, defMul: 1.6, radius: 22, speed: 36, seal: 'q_herzton', xp: 12000, gold: 5000,
    spared: 0.04, awaken: 'erwachen', calm: true, outro: '… ♪ … Die Große Stille bricht. Darunter ist jemand wach.',
    intro: 'Die Nacht am Quellrand beginnt von vorn: Asche, sieben Schatten, ein erhobener Hammer. Diesmal stehst du mittendrin.' },
};
// Unikate der Story-Bosse (hier registriert, damit items.ts unberührt bleibt)
BOSS_UNIQUE.vael = { ilvl: 38, element: 'dark', names: { krieger: 'Wachablösung', magier: 'Laternenstab', waldlaeufer: 'Dämmersehne', paladin: 'Türhüter', schattenjaeger: 'Tausend Striche' } };
BOSS_UNIQUE.aetherion = { ilvl: 40, element: 'water', names: { krieger: 'Atemzug', magier: 'Der fünfte Ton', waldlaeufer: 'Herzsehne', paladin: 'Brunnenwort', schattenjaeger: 'Splitterlied' } };
