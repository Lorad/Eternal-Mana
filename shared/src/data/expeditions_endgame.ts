/**
 * Endspiel der Expeditionen (0.11) – Leitlinie: docs/ROADMAP.md, Abschnitt 5.3.
 *
 *   ENDGAME_LIST   zwei Expeditionen für Stufe 40 mit den Bossen aus Akt II: „Die Lange Wacht“ (Vael) und „Das Atmende Herz“
 *                  (Aetherion). Gleicher Generator, gleiche Regeln wie die übrigen; eigene Mini-Bosse, Signaturmechanik
 *                  (server/src/expedition/bossmech.ts), Belohnung mit Echo-Fragmenten, Ätherstaub und Mythisch.
 *   Tiefen         über „Mythisch“ hinaus: Tiefe 1–20 je Expedition, freigeschaltet Stufe um Stufe. Jede Tiefe hebt Gegnerstufe,
 *                  Leben und Schaden; ab Tiefe 3 gilt ein Modifikator, ab 8 zwei, ab 15 drei – sie wechseln jede Woche
 *                  (`depthMods`). Die Belohnung steigt mit: Gegenstandsstufe, Mythisch, Bosskern, Echo-Fragmente, Ätherstaub.
 *   Ehrungen       Titel und Waffenglanz für die schwersten Abschlüsse (`endgameTitles`, Erscheinungen in data/looks.ts).
 *
 * Nur Daten und reine Regeln – der Server prüft und belohnt (server/src/expedition/), die Oberfläche zeigt an.
 * Die Typen kommen aus expeditions.ts (nur als Typ importiert – keine Schleife zur Laufzeit).
 */
import type { CharData } from '../types';
import type { ExpeditionDef, MiniDef, SectionDef, WeeklyMod } from './expeditions';

const S = (s: SectionDef) => s;
const M = (m: MiniDef) => m;

// =====================================================================================================================
//  Mini-Bosse der Endspiel-Expeditionen (vorhandene Sprites, eingefärbt)
// =====================================================================================================================
export const ENDGAME_MINIS: MiniDef[] = [
  // ---- Die Lange Wacht
  M({ id: 'xm_erste_wache', name: 'Die Erste Wache', title: 'Stand vor Vael auf Posten', sprite: 'wachschatten', tint: 0xe8d8ff, scale: 2.1, element: 'dark',
    hpMul: 48, dmgMul: 1.45, defMul: 1.4, speed: 64, radius: 13, ai: 'blink', pattern: ['lines', 'ring', 'adds'], every: 3.8, adds: ['wachschatten'],
    intro: '„Ich wurde vor tausend Jahren abgelöst. Mir hat nur niemand Bescheid gesagt.“' }),
  M({ id: 'xm_nachtstute', name: 'Die Nachtstute', title: 'Sie schläft nie – und du auch nicht', sprite: 'albtraumross', tint: 0xff9070, scale: 1.8, element: 'fire',
    hpMul: 42, dmgMul: 1.5, defMul: 1.1, speed: 86, radius: 14, ai: 'charge', pattern: ['charge', 'pools', 'ring'], every: 3.8,
    intro: 'Ihre Hufe hinterlassen Glut. Ihre Träume auch.' }),
  // ---- Das Atmende Herz
  M({ id: 'xm_feldherr', name: 'Echo des Feldherrn', title: 'Er hat den Alten Krieg nie verlassen', sprite: 'erinnerter', tint: 0xffd090, scale: 2.0, element: 'dark',
    hpMul: 50, dmgMul: 1.5, defMul: 1.8, speed: 50, radius: 14, ai: 'chase', pattern: ['stomp', 'lines', 'adds'], every: 4, adds: ['erinnerter'],
    intro: '„Sieben Reiche, eine Quelle. Ich habe gezählt, wer übrig blieb. Es waren zu wenige, um weiterzuzählen.“' }),
  M({ id: 'xm_stillemutter', name: 'Die Mutter der Stille', title: 'Sie faltet Geräusche zusammen', sprite: 'stillefalter', tint: 0xf4f4ff, scale: 2.4, element: 'wind',
    hpMul: 36, dmgMul: 1.45, defMul: 0.9, speed: 80, radius: 12, ai: 'blink', pattern: ['ring', 'rain', 'adds'], every: 3.5, adds: ['stillefalter'],
    intro: 'Wo sie fliegt, hört man nichts mehr. Nicht einmal sich selbst.' }),
];

// =====================================================================================================================
//  Die Endspiel-Expeditionen
// =====================================================================================================================
export const ENDGAME_LIST: ExpeditionDef[] = [
  {
    id: 'exp_wacht', name: 'Die Lange Wacht', subtitle: 'Tausend Jahre, eine Nacht', region: 'schatten', parent: 'schatten', endgame: true, xpRef: 'wacht',
    boss: 'vael', level: [39, 42], rec: 40, seed: 98101, dark: 0.62, mapPos: [91, 54], event: 'darkness', arena: 'void', rare: 'xr_laternenglut',
    desc: 'Vael hat tausend Jahre allein gewacht. Jetzt bittet er um Ablösung – für eine Nacht, in den Gängen hinter seiner Tür: Wachstuben, ein Laternengang, Erinnerungen, die nicht schlafen wollen. Am Ende prüft er selbst, ob du die Wacht halten kannst.',
    intro: 'An der Tür ein Dienstplan, tausend Jahre lang, jede Zeile derselbe Name. Ganz unten, frisch: „Ablösung erbeten. Bitte pünktlich. – V.“',
    mobs: [[['erinnerter', 4], ['wachschatten', 3], ['klagegeist', 3], ['schattenwandler', 2]],
      [['albtraumross', 2], ['wachschatten', 3], ['erinnerter', 3], ['hohlritter', 1.5], ['klagegeist', 2]]],
    unlock: [{ text: 'Vaels Prüfung bestanden', cond: { flag: 'b:vael' } }, { text: 'Stufe 40', level: 40 }],
    sections: [
      S({ id: 'dienststube', name: 'Die Dienststube', shape: 'chamber', role: 'entrance' }),
      S({ id: 'wachgang', name: 'Der erste Wachgang', shape: 'corridor', role: 'explore', via: 'stairs', groups: 3, nodes: 1, lore: 'Kerben im Türrahmen, in Zehnerbündeln. Irgendwann hat jemand aufgehört zu zählen und angefangen, kleine Laternen daneben zu ritzen.' }),
      S({ id: 'laternenhalle', name: 'Die Halle der Laternen', shape: 'hall', role: 'combat', via: 'gate', groups: 7, elites: 1,
        secret: S({ id: 'vergessene_stube', name: 'Die vergessene Wachstube', shape: 'chamber', role: 'treasure', via: 'secret', cache: true, lore: 'Ein Stuhl, zwei Becher. Einer ist leer, der andere seit tausend Jahren eingeschenkt. Daneben ein Zettel: „Falls du doch kommst.“' }) }),
      S({ id: 'erinnerungsflur', name: 'Flur der Erinnerten', shape: 'cavern', role: 'combat', via: 'tunnel', groups: 5,
        side: [S({ id: 'wachstube', name: 'Die Stube der Ersten Wache', shape: 'hall', role: 'mini', via: 'gate', mini: 'xm_erste_wache', groups: 2 })] }),
      S({ id: 'schlafsaal', name: 'Der Schlafsaal der Wächter', shape: 'grotto', role: 'explore', via: 'stairs', groups: 5, nodes: 2 }),
      S({ id: 'ruhelose', name: 'Der Gang der Ruhelosen', shape: 'corridor', role: 'trap', via: 'gate', groups: 2, traps: ['spikes', 'turrets', 'poison'] }),
      S({ id: 'schluesselwacht', name: 'Die Schlüsselwacht', shape: 'chamber', role: 'key', via: 'tunnel', groups: 2, elites: 1, key: true }),
      S({ id: 'stundenglas', name: 'Das Stundenglas', shape: 'chamber', role: 'puzzle', via: 'gate', puzzle: 'torches', groups: 1 }),
      S({ id: 'mitternacht', name: 'Wo die Mitternacht wohnt', shape: 'cavern', role: 'event', via: 'locked', event: 'darkness', look: 1, groups: 2 }),
      S({ id: 'wachturm', name: 'Der Wachturm', shape: 'hall', role: 'combat', via: 'stairs', look: 1, groups: 6,
        side: [S({ id: 'stall', name: 'Der Nachtstall', shape: 'cavern', role: 'mini', via: 'tunnel', mini: 'xm_nachtstute', look: 1, groups: 2 })] }),
      S({ id: 'schlafbruecke', name: 'Die Brücke über den Schlaf', shape: 'corridor', role: 'puzzle', via: 'bridge', puzzle: 'runes', look: 1, groups: 2 }),
      S({ id: 'vergessensgang', name: 'Der Gang des Vergessens', shape: 'corridor', role: 'trap', via: 'tunnel', look: 1, groups: 2, traps: ['collapse', 'poison', 'spikes'] }),
      S({ id: 'ehrenwache', name: 'Die Ehrenwache', shape: 'hall', role: 'elite', via: 'gate', look: 1, groups: 6, elites: 2, nodes: 1, lore: 'Sieben Rüstungen in einer Reihe, sechs davon leer. In der siebten steht noch jemand stramm und sagt nichts.' }),
      S({ id: 'letzte_laterne', name: 'Die letzte Laterne', shape: 'chamber', role: 'prep', via: 'tunnel', look: 1 }),
      S({ id: 'vor_der_tuer', name: 'Vor der Tür', shape: 'arena', role: 'boss', via: 'gate', look: 1 }),
      S({ id: 'wachbuch', name: 'Das Wachbuch', shape: 'chamber', role: 'reward', via: 'gate', look: 1 }),
    ],
  },
  {
    id: 'exp_herz', name: 'Das Atmende Herz', subtitle: 'Wo der Träumer Luft holt', region: 'kristall', parent: 'quellgrund', endgame: true, xpRef: 'herz',
    boss: 'aetherion', level: [40, 43], rec: 40, seed: 99101, dark: 0.55, mapPos: [28, 79], event: 'flood', arena: 'crystals', rare: 'xr_herzton',
    desc: 'Unter dem Herz der Quelle atmet Aetherion. Mit jedem Atemzug steigt der Traum in die Gänge: Atembecken, der Kreis der Sieben Sitze, Erinnerungen an den Alten Krieg. Ganz unten träumt die Große Stille noch einmal – und nur das Wiegenlied bringt sie zur Ruhe.',
    intro: 'In den Fels geritzt, in sieben Handschriften: „Hier atmet, was wir zerteilten.“ Darunter, in einer achten, sehr kleinen: „Er hört zu. Sing leise. – M.“',
    mobs: [[['wogenling', 4], ['tiefenlicht', 3], ['grundkrebs', 3], ['stillefalter', 3]],
      [['traumwaechter', 2], ['erinnerter', 3], ['tiefenlicht', 3], ['klagegeist', 2], ['albtraumross', 1.2]]],
    unlock: [{ text: 'Aetherions Albtraum beendet', cond: { flag: 'b:aetherion' } }, { text: 'Stufe 40', level: 40 }, { text: '„Die Lange Wacht“ abgeschlossen', exp: 'exp_wacht' }],
    sections: [
      S({ id: 'atemtor', name: 'Das Atemtor', shape: 'chamber', role: 'entrance' }),
      S({ id: 'tropfgang', name: 'Der Tropfgang', shape: 'corridor', role: 'explore', via: 'stairs', groups: 3, nodes: 2, lore: 'Jeder Tropfen fällt im selben Takt. Wer lange genug zuhört, merkt: Es ist ein Puls.' }),
      S({ id: 'atembecken', name: 'Die Atembecken', shape: 'grotto', role: 'explore', via: 'gate', groups: 5, nodes: 2,
        secret: S({ id: 'notenkammer', name: 'Maelis’ Notenkammer', shape: 'chamber', role: 'treasure', via: 'secret', cache: true, lore: 'Vier Noten an der Wand, mit Kreide, in Kinderhöhe. Die fünfte ist neu – und in einer Handschrift, die du kennst. Deiner.' }) }),
      S({ id: 'kriegshalle', name: 'Die Halle des Alten Kriegs', shape: 'hall', role: 'combat', via: 'tunnel', groups: 7, elites: 1,
        side: [S({ id: 'feldherrnzelt', name: 'Das Zelt des Feldherrn', shape: 'cavern', role: 'mini', via: 'gate', mini: 'xm_feldherr', groups: 2 })] }),
      S({ id: 'kristallfluss', name: 'Der Kristallfluss', shape: 'cavern', role: 'combat', via: 'stairs', groups: 5, nodes: 1 }),
      S({ id: 'flutkammer', name: 'Die Flutkammer', shape: 'cavern', role: 'event', via: 'tunnel', event: 'flood', groups: 2 }),
      S({ id: 'sitzkreis', name: 'Der Kreis der Sieben Sitze', shape: 'chamber', role: 'puzzle', via: 'gate', puzzle: 'levers', groups: 1, lore: 'Sieben Sitze im Kreis. Einer ist umgestoßen, einer frisch abgestaubt, einer leer, als hätte er nie jemandem gehört.' }),
      S({ id: 'herzwacht', name: 'Die Herzwacht', shape: 'chamber', role: 'key', via: 'tunnel', groups: 2, elites: 1, key: true }),
      S({ id: 'stillegang', name: 'Der Stillegang', shape: 'corridor', role: 'trap', via: 'locked', look: 1, groups: 2, traps: ['turrets', 'collapse', 'spikes'] }),
      S({ id: 'traumgrotte', name: 'Die Traumgrotte', shape: 'grotto', role: 'explore', via: 'stairs', look: 1, groups: 5, nodes: 2,
        side: [S({ id: 'faltkammer', name: 'Die Faltkammer', shape: 'hall', role: 'mini', via: 'tunnel', mini: 'xm_stillemutter', look: 1, groups: 2 })] }),
      S({ id: 'tonbruecke', name: 'Die Brücke der vier Töne', shape: 'corridor', role: 'puzzle', via: 'bridge', puzzle: 'runes', look: 1, groups: 2 }),
      S({ id: 'vorkammer', name: 'Die Vorkammer des Herzens', shape: 'hall', role: 'elite', via: 'gate', look: 1, groups: 6, elites: 2, nodes: 1 }),
      S({ id: 'letzter_atem', name: 'Der letzte Atemzug', shape: 'chamber', role: 'prep', via: 'tunnel', look: 1 }),
      S({ id: 'herzgrund', name: 'Der Herzgrund', shape: 'arena', role: 'boss', via: 'gate', look: 1 }),
      S({ id: 'nach_der_stille', name: 'Nach der Stille', shape: 'chamber', role: 'reward', via: 'gate', look: 1 }),
    ],
  },
];

// =====================================================================================================================
//  Tiefen: über Mythisch hinaus
// =====================================================================================================================
export const DEPTH_CFG = {
  /** höchste Tiefe */
  max: 20,
  /** je Tiefe: Gegnerstufe + (abgerundet), Leben ×(1 + hp·t), Schaden ×(1 + dmg·t) – zusätzlich zu Mythisch.
   *  Spieltest (scripts/exp-playtest.ts --endspiel): allein, sorgfältig, Riss-Ausrüstung 20 → Tiefe 1 in ~20 min; Riss 25 → Tiefe 5
   *  in ~35 min mit einigen Toden; Tiefe 10 und mehr allein nicht mehr – das ist Gruppen und voll verbesserter Ausrüstung vorbehalten. */
  lvl: 0.5, hp: 0.08, dmg: 0.04,
  /** Belohnung je Tiefe: Gegenstandsstufe +, Faktor auf Erfahrung/Gold (1 + reward·t), Gewicht „Mythisch“ ×(1 + mythic·t) */
  ilvl: 1, reward: 0.15, mythic: 0.15,
  /** Echo-Fragmente je Abschluss: 1 + ⌊t/2⌋ · Ätherstaub ab dieser Tiefe · Bosskern des Endbosses ab Tiefe 1 garantiert */
  aetherFrom: 5,
  /** Modifikatoren: einer ab Tiefe 3, zwei ab 8, drei ab 15 */
  modsAt: [3, 8, 15],
  /** Titel und Glanz */
  titleAt: [10, 20],
} as const;

/** Freigeschaltete höchste Tiefe einer Expedition (0 = keine): nach einem Mythisch-Abschluss Tiefe 1, danach je erreichte Tiefe + 1 */
export function depthOpen(c: CharData, id: string): number {
  const r = c.expeditions?.[id];
  if (!r || !((r.clears?.mythisch ?? 0) > 0)) return 0;
  return Math.min(DEPTH_CFG.max, Math.max(0, Math.floor(r.deep ?? 0)) + 1);
}
/** Ablehnungsgrund für eine Tiefe (oder null) */
export function depthBlock(c: CharData, id: string, depth: number): string | null {
  if (!Number.isInteger(depth) || depth < 1 || depth > DEPTH_CFG.max) return `Tiefen gibt es von 1 bis ${DEPTH_CFG.max}.`;
  const open = depthOpen(c, id);
  if (!open) return 'Tiefen öffnen sich nach einem Abschluss auf Mythisch.';
  if (depth > open) return `Erst Tiefe ${open} schaffen.`;
  return null;
}
/** Zahl der Modifikatoren in Tiefe t */
export const depthModCount = (t: number) => DEPTH_CFG.modsAt.filter(a => t >= a).length;
function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
/**
 * Modifikatoren der Tiefen: die der Wochen-Herausforderung (WEEKLY_MOD in expeditions.ts) ohne „Erwacht“ – doppelt so viele
 * Erwachte mit drei Affixen machten schon Tiefe 1 für Einzelne unspielbar (Spieltest, docs/GAME_DESIGN.md).
 */
export const DEPTH_MOD_POOL: WeeklyMod[] = ['horde', 'glas', 'versiegt', 'hast', 'finster'];
/**
 * Modifikatoren einer Tiefe in einer Woche – wechseln jede Woche, je Expedition anders (deterministisch: Server und Oberfläche
 * rechnen dasselbe). Tiefe t trägt die Modifikatoren der flacheren Tiefe und einen neuen.
 */
export function depthMods(week: string, id: string, depth: number, all: readonly WeeklyMod[] = DEPTH_MOD_POOL): WeeklyMod[] {
  const n = Math.min(all.length, depthModCount(depth)), pool = [...all], out: WeeklyMod[] = [];
  let h = hash(`tiefe:${week}:${id}`);
  for (let i = 0; i < n; i++) { const k = h % pool.length; out.push(pool.splice(k, 1)[0]); h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0; }
  return out;
}
/** Faktoren einer Tiefe (für Gegner, Boss und Belohnung) */
export function depthScale(depth: number) {
  const t = Math.max(0, depth | 0), D = DEPTH_CFG;
  return { lvl: Math.floor(D.lvl * t), hp: 1 + D.hp * t, dmg: 1 + D.dmg * t, ilvl: Math.floor(D.ilvl * t), reward: 1 + D.reward * t, mythic: 1 + D.mythic * t };
}
/** tiefste erreichte Tiefe über alle Expeditionen */
export function deepest(c: CharData): number { let n = 0; for (const id in c.expeditions ?? {}) n = Math.max(n, Math.floor(c.expeditions![id].deep ?? 0)); return n; }

// =====================================================================================================================
//  Ehrungen: Titel (TITLE_SOURCES in rifts.ts) – die Erscheinungen stehen in data/looks.ts
// =====================================================================================================================
export const ENDGAME_TITLES: Record<string, { name: string; desc: string; has: (c: CharData) => boolean }> = {
  x_wacht: { name: 'Ablösung der Wacht', desc: '„Die Lange Wacht“ auf Mythisch abgeschlossen.', has: c => (c.expeditions?.exp_wacht?.clears?.mythisch ?? 0) > 0 },
  x_herz: { name: 'Der fünfte Ton', desc: '„Das Atmende Herz“ auf Mythisch abgeschlossen.', has: c => (c.expeditions?.exp_herz?.clears?.mythisch ?? 0) > 0 },
  x_tiefe10: { name: 'Tiefengänger', desc: 'In einer Expedition Tiefe 10 abgeschlossen.', has: c => deepest(c) >= DEPTH_CFG.titleAt[0] },
  x_tiefe20: { name: 'Grundlos', desc: `In einer Expedition Tiefe ${DEPTH_CFG.max} abgeschlossen.`, has: c => deepest(c) >= DEPTH_CFG.titleAt[1] },
};
