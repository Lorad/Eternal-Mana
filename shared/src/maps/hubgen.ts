/**
 * Quellwarte (0.9): die Karte des Hubs – von Hand gesetzt, nicht aus Rauschen. Wie alle Karten deterministisch: Server und
 * Client bauen sie aus derselben Definition.
 *
 *            Trophäenhalle ─┐   ┌─ PORTALPLATZ ─┐   ┌─ Gruppenbereich
 *                           └───┤ (Mitte frei)  ├───┘
 *    Lagerhaus   ══════════ Laternengasse ══════╪══════════════  Fähigkeitenmeister
 *       Garten  ≈≈≈≈≈≈≈≈≈≈≈≈ Quellrinne ≈≈≈ (Brunnen) ≈≈≈≈≈≈≈≈≈≈≈  Garten
 *    Schmiede   Alchemie   [Stand]  │  [Stand]   Händler   Gasthaus
 *               ═══════════ Marktgasse ═════╪═══════════════════   Biergarten
 *                                    ANKUNFT (Quellstein)
 *                                        Tor nach Quellhain
 *
 * Gelände aus dem Bodenmaler des Bioms (vorläufig Grünwald: Wege als Pflaster, gemauerter Boden auf den Plätzen); Gebäude und
 * Ausstattung als Deko mit fester Grundfläche, Einrichtungen als Objekte (`npc`, `qobj`, `stone`). Rückfall der Grafik:
 * data/hubart.ts. Feste Stellen für andere Teile des Spiels: HUB_SPOTS in data/hub.ts (die Mitte des Portalplatzes bleibt frei).
 */
import type { ZoneDef } from '../data/zones';
import { HUB_SPOTS, type Facility } from '../data/hub';
import { hash2, noise2 } from '../util/rng';
import type { DecorSpawn, GameMap, ObjSpawn } from './mapgen';
import { T, TILE } from './tiles';

const [PX, PY] = HUB_SPOTS.portal;
/** Plätze und Straßen in Kacheln */
export const HUB_LAYOUT = {
  plaza: { x: PX, y: PY, r: 7, free: 5 },
  fountain: { x: 38, y: 34, r: 4 },
  arrival: { x: 38, y: 53, r: 5 },
  stone: [38, 52] as [number, number],
  gate: [38, 60] as [number, number],
  laterne: { y0: 28, y1: 30, x0: 8, x1: 67 },
  markt: { y0: 47, y1: 49, x0: 8, x1: 67 },
  rinne: { y0: 35, y1: 36 },
};

/** Gebäude: Einrichtung, Frame, mittlere Kachel, unterste Reihe (Grundfläche 5×3, die Tür liegt unten in der Mitte) */
export const HUB_HOUSES: { fac: Exclude<Facility, 'portal'>; frame: string; cx: number; by: number; w: number }[] = [
  { fac: 'halle', frame: 'hub_halle', cx: 27, by: 13, w: 7 },
  { fac: 'gruppe', frame: 'hub_gruppe', cx: 49, by: 13, w: 6 },
  { fac: 'lager', frame: 'hub_lager', cx: 15, by: 26, w: 7 },
  { fac: 'meister', frame: 'hub_meister', cx: 61, by: 26, w: 7 },
  { fac: 'schmiede', frame: 'hub_schmiede', cx: 15, by: 45, w: 6 },
  { fac: 'alchemie', frame: 'hub_alchemie', cx: 28, by: 45, w: 6 },
  { fac: 'haendler', frame: 'hub_haendler', cx: 48, by: 45, w: 6 },
  { fac: 'gasthaus', frame: 'hub_gasthaus', cx: 60, by: 45, w: 7 },
];
/** linke Kachel und Breite der Grundfläche eines Hauses (Fassaden 88–112 px; die Tür liegt in der Mitte) */
export const houseSpan = (b: { cx: number; w: number }) => ({ x0: b.cx - Math.floor(b.w / 2), x1: b.cx - Math.floor(b.w / 2) + b.w - 1 });
/** Hüter jeder Einrichtung (steht vor der Tür) */
export const HUB_KEEPER: Record<Exclude<Facility, 'portal'>, string> = {
  halle: 'bertram', gruppe: 'wenke', lager: 'fridolin', meister: 'corvin', schmiede: 'gunda', alchemie: 'irmela', haendler: 'ottmar', gasthaus: 'hanne',
};
/** Weitere Figuren an festen Plätzen: [NPC, x, y] */
const SITTERS: [string, number, number][] = [
  ['alrik', 57, 53], ['merle', 62, 52], ['lotte', 65, 55], ['rudger', 58, 57], ['brann', 36, 59],
];
/**
 * Leute, die herumlaufen: [NPC, Wegpunkte in Kacheln]. Zwischen zwei Punkten liegt immer eine gerade, freie Strecke auf
 * Straßen und Plätzen; der Server lässt sie die Runde gehen und an jedem Punkt kurz verweilen (server/src/hub/walkers.ts).
 */
export const HUB_WALKERS: [string, [number, number][]][] = [
  ['rike', [[36, 46], [36, 39], [40, 39], [40, 46], [38, 48]]],
  ['jost', [[12, 29], [36, 29], [36, 48], [9, 48], [9, 29]]],
  ['tilda', [[33, 14], [33, 24], [43, 24], [43, 14]]],
  ['hinnerk', [[64, 29], [40, 29], [40, 48], [66, 48], [66, 29]]],
];

/** Objekte der Quellwarte (`qobj`): Kennung, Kachel, Frame, Aufforderung, Beschriftung, Einrichtung */
export const HUB_OBJECTS: { tag: string; x: number; y: number; frame: string; prompt: string; label?: string; fac?: Facility; light?: [number, number, number] }[] = [
  { tag: 'geruechte', x: 56, y: 45, frame: 'bounty_board', prompt: 'Gerüchtebrett lesen', label: 'Gerüchte', fac: 'gasthaus' },
  { tag: 'gesuche', x: 53, y: 13, frame: 'bounty_board', prompt: 'Gruppengesuche ansehen', label: 'Gruppengesuche', fac: 'gruppe' },
  { tag: 'truhe', x: 20, y: 26, frame: 'stash_chest', prompt: 'Lagerhaus: Truhe öffnen', fac: 'lager' },
  { tag: 'vitrine', x: 32, y: 13, frame: 'seal_pedestal', prompt: 'Vitrinen der Trophäenhalle ansehen', fac: 'halle', light: [40, 0xffe2a0, 0.6] },
  { tag: 'karte', x: 43, y: 51, frame: 'hub_wegweiser', prompt: 'Übersicht der Quellwarte', label: 'Übersicht' },
  { tag: 'tor', x: 38, y: 60, frame: 'portal', prompt: 'Durch das Tor nach Quellhain', label: 'Quellhain', light: [90, 0x80ff90, 0.9] },
];

export function genHub(def: ZoneDef): GameMap {
  const { w, h, seed } = def;
  const tiles = new Uint8Array(w * h), solid = new Uint8Array(w * h);
  const I = (x: number, y: number) => y * w + x;
  const inb = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h;
  const set = (x: number, y: number, t: number) => { if (inb(x, y)) tiles[I(x, y)] = t; };
  const rect = (x0: number, y0: number, x1: number, y1: number, t: number) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, t); };
  const disc = (cx: number, cy: number, r: number, t: number) => { for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if (Math.hypot(x - cx, y - cy) <= r + 0.2) set(x, y, t); };
  const L = HUB_LAYOUT;

  // ---- Grund: Pflaster der Warte, ringsum die Mauer (mit etwas Unruhe), im Süden bleibt der Weg zum Tor offen
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = Math.min(x, y, w - 1 - x, h - 1 - y);
    const border = 3 + noise2(x, y, 7, seed + 5) * 2.4;
    tiles[I(x, y)] = d < border ? T.WALL : T.GROUND;
  }
  // Gärten: Beete entlang der Rinne, Obstwiesen in den Ecken, Grün um die Plätze
  for (const [x0, y0, x1, y1] of [[11, 31, 20, 34], [23, 31, 32, 34], [11, 37, 20, 40], [23, 37, 32, 40], [44, 31, 53, 34], [56, 31, 64, 34], [44, 37, 53, 40], [56, 37, 64, 40],
    [5, 5, 20, 10], [56, 5, 70, 10], [5, 51, 30, 58], [46, 51, 54, 58], [5, 13, 9, 26], [67, 13, 71, 26], [19, 17, 30, 24], [46, 18, 57, 24]]) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (tiles[I(x, y)] === T.GROUND && noise2(x, y, 3, seed + 3) > 0.22) tiles[I(x, y)] = T.GROUND2;
  }
  // ---- Quellrinne: vom Brunnen nach Westen und Osten in den Wald
  rect(3, L.rinne.y0, w - 4, L.rinne.y1, T.LIQUID);
  // ---- Straßen
  rect(L.laterne.x0, L.laterne.y0, L.laterne.x1, L.laterne.y1, T.PATH);
  rect(L.markt.x0, L.markt.y0, L.markt.x1, L.markt.y1, T.PATH);
  rect(8, L.laterne.y0, 10, L.markt.y1, T.PATH);            // Wallweg West
  rect(65, L.laterne.y0, 67, L.markt.y1, T.PATH);           // Wallweg Ost
  rect(PX - 2, PY, PX + 2, L.arrival.y, T.PATH);            // Hauptstraße
  rect(21, L.laterne.y1, 22, L.markt.y0, T.PATH);           // Gartenwege
  rect(54, L.laterne.y1, 55, L.markt.y0, T.PATH);
  rect(23, 14, PX, 16, T.PATH);                             // zur Trophäenhalle
  rect(PX, 14, 53, 16, T.PATH);                             // zum Gruppenbereich
  rect(L.gate[0] - 1, L.arrival.y, L.gate[0] + 1, L.gate[1] + 1, T.PATH);  // zum Tor
  for (const b of HUB_HOUSES) rect(b.cx - 1, b.by + 1, b.cx + 1, b.by + 1, T.FLOOR);   // Schwelle vor jeder Tür
  // Brücken, wo Wege die Rinne kreuzen
  for (const [x0, x1] of [[8, 10], [65, 67], [21, 22], [54, 55]]) rect(x0, L.rinne.y0, x1, L.rinne.y1, T.BRIDGE);
  // ---- Plätze (gemauert)
  disc(L.plaza.x, L.plaza.y, L.plaza.r, T.FLOOR);
  disc(L.fountain.x, L.fountain.y, L.fountain.r, T.FLOOR);
  disc(L.arrival.x, L.arrival.y, L.arrival.r, T.FLOOR);
  rect(57, 51, 64, 57, T.FLOOR);                            // Biergarten
  // der Wald lässt Straßen und Plätze in Ruhe
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (tiles[I(x, y)] === T.WALL) {
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) { const t = tiles[I(x + dx, y + dy)]; if (t === T.PATH || t === T.FLOOR) { near = true; break; } }
    if (near) tiles[I(x, y)] = T.GROUND;
  }

  // ---- Deko und Objekte
  const decor: DecorSpawn[] = [], objects: ObjSpawn[] = [];
  const block = (tx: number, ty: number, wc = 1, hc = 1) => { for (let yy = ty - hc + 1; yy <= ty; yy++) for (let xx = tx; xx < tx + wc; xx++) if (inb(xx, yy)) solid[I(xx, yy)] = 1; };
  /** Deko mit Grundfläche: `tx` = linke Kachel, `ty` = unterste Reihe */
  const put = (f: string, tx: number, ty: number, sol = true, wc = 1, hc = 1, ox = 0) => { if (sol) block(tx, ty, wc, hc); decor.push({ f, x: tx * TILE + (wc * TILE) / 2 + ox, y: ty * TILE + TILE - 2 }); };
  const free = (x: number, y: number) => inb(x, y) && !solid[I(x, y)] && tiles[I(x, y)] !== T.WALL && tiles[I(x, y)] !== T.LIQUID;
  let oid = 1;
  const obj = (type: string, tx: number, ty: number, tag?: string, props?: Record<string, any>, sol = false) => { if (sol) block(tx, ty); objects.push({ id: oid++, type, x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2, tag, props }); };

  // Gebäude und ihre Hüter
  for (const b of HUB_HOUSES) {
    put(b.frame, houseSpan(b).x0, b.by, true, b.w, 3, b.w % 2 ? 0 : 8);
    obj('npc', b.cx, b.by + 2, HUB_KEEPER[b.fac], { fac: b.fac });
  }
  // Flanken der Häuser – damit breite Fassaden nicht über dem Weg hängen: [Frame, dx zur Mitte, Breite]
  const flank: Record<string, [string | null, string | null]> = {
    halle: [null, null], gruppe: ['hub_banner', 'hub_banner'], lager: ['hub_kisten', 'sacks'], meister: ['d_rack', 'hub_banner'],
    schmiede: ['forge', 'anvil'], alchemie: ['station_alchemy', 'hub_kuebel'], haendler: [null, 'hub_faesser'], gasthaus: [null, 'hub_faesser'],
  };
  for (const b of HUB_HOUSES) {
    const { x0, x1 } = houseSpan(b), [l, r] = flank[b.fac];
    if (l) { const wc = l === 'forge' || l === 'station_alchemy' ? 2 : 1; put(l, x0 - wc, b.by, true, wc, 1); }
    if (r) put(r, x1 + 1, b.by, true, 1, 1);
  }
  // Einrichtungsobjekte
  for (const o of HUB_OBJECTS) obj('qobj', o.x, o.y, o.tag, { frame: o.frame, prompt: o.prompt, label: o.label, fac: o.fac, light: o.light, hub: o.tag }, true);
  // Quellstein
  obj('stone', L.stone[0], L.stone[1], 'stone', undefined, true);
  // Figuren an festen Plätzen und Spaziergänger (an ihrem ersten Wegpunkt)
  for (const [id, x, y] of SITTERS) obj('npc', x, y, id);
  for (const [id, pts] of HUB_WALKERS) obj('npc', pts[0][0], pts[0][1], id, { walker: 1 });
  /** setzt nur, wenn alle Zellen frei sind */
  const maybe = (f: string, x: number, y: number, sol = true, wc = 1, hc = 1) => {
    for (let yy = y - hc + 1; yy <= y; yy++) for (let xx = x; xx < x + wc; xx++) if (!free(xx, yy)) return;
    put(f, x, y, sol, wc, hc);
  };

  // Portalplatz: Banner und Laternen am Rand, die Mitte bleibt frei
  const ring = (r: number, deg: number) => [Math.round(PX + Math.cos((deg * Math.PI) / 180) * r), Math.round(PY + Math.sin((deg * Math.PI) / 180) * r)] as const;
  for (const a of [-115, -65, -5, 25, 155, 185]) { const [x, y] = ring(6.6, a); put('hub_banner', x, y); }
  for (const a of [-90, 58, 122]) { const [x, y] = ring(7.4, a); maybe('hub_laterne', x, y); }
  // Brunnen mit Bänken
  put('hub_brunnen', L.fountain.x - 1, L.fountain.y, true, 2, 2);
  for (const [x, y] of [[33, 32], [42, 32], [33, 37], [42, 37]]) maybe('hub_bank', x, y, true, 2);
  // Laternen entlang der Straßen
  for (const x of [11, 20, 30, 46, 56, 65]) maybe('hub_laterne', x, L.laterne.y0 - 1);
  for (const x of [13, 25, 33, 43, 51, 66]) maybe('hub_laterne', x, L.markt.y1 + 1);
  for (const [x, y] of [[42, 55], [34, 56], [12, 33], [64, 33], [36, 61], [40, 61]]) maybe('hub_laterne', x, y);
  // Markt: Stände an der Hauptstraße
  for (const [x, y] of [[32, 40], [42, 40], [32, 45], [42, 45]]) put('hub_stand', x, y, true, 3, 2);
  for (const [f, x, y, wc] of [['hub_kisten', 31, 41, 1], ['sacks', 45, 41, 1], ['hub_faesser', 45, 46, 1], ['hub_kisten', 31, 46, 1], ['sacks', 20, 52, 1], ['cart', 23, 53, 3]] as [string, number, number, number][]) maybe(f, x, y, true, wc);
  // Biergarten des Gasthauses
  for (const [x, y] of [[58, 52], [58, 55], [62, 55]]) put('house_table', x, y, true, 2);
  for (const [x, y] of [[57, 54], [62, 54], [61, 57]]) put('hub_bank', x, y, true, 2);
  put('campfire', 64, 57); maybe('hub_faesser', 66, 52); maybe('hub_kisten', 66, 53);
  // Trophäenhalle: Ständer am Weg
  put('trophy_stand', 22, 13); put('hub_statue', 24, 17); put('hub_statue', 30, 17); put('trophy_stand', 21, 16);
  // Poller an der Einmündung der Hauptstraße in den Portalplatz
  for (const x of [PX - 3, PX + 3]) maybe('hub_poller', x, 25);
  // Gruppenbereich: Sammelplatz mit Bank und Wimpeln
  maybe('hub_bank', 44, 12, true, 2); maybe('prayer_flags', 54, 17, true, 3); maybe('hub_banner', 46, 17);
  // Fähigkeitenmeister: Übungspuppe
  maybe('scarecrow', 66, 25);
  // Gärten: Bäume, Blumen, Beete
  for (const [x, y] of [[16, 32], [26, 32], [47, 32], [58, 32], [6, 46], [69, 46], [8, 56], [27, 57], [49, 57], [6, 22], [69, 22], [21, 21], [55, 21]]) maybe('hub_baum', x, y, true, 2, 1);
  for (const [x, y] of [[13, 38], [19, 38], [30, 33], [46, 38], [51, 33], [59, 38], [44, 52], [32, 52], [19, 20], [57, 20], [33, 11], [43, 11], [25, 38], [52, 38]]) maybe('hub_blumen', x, y);
  maybe('beehive', 12, 40); maybe('birdhouse', 63, 31); maybe('well', 5, 30, true, 2); maybe('haystack', 69, 40);
  // Kleinkram: Blumen und Gras in den Gärten
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = I(x, y), t = tiles[i];
    if (solid[i]) continue;
    const r = hash2(x, y, seed + 77);
    if (t === T.WALL) continue;
    if (t === T.GROUND2 && r < 0.18) decor.push({ f: ['flowers_a', 'flowers_b', 'flowers_c', 'flowers_d', 'flowers_e', 'clover', 'tallgrass', 'fern'][Math.floor(r * 1000) % 8], x: x * TILE + 8, y: y * TILE + 12 });
  }
  // Seerosen in der Rinne
  for (let x = 4; x < w - 4; x++) if (hash2(x, 35, seed + 5) < 0.12 && tiles[I(x, 35)] === T.LIQUID) decor.push({ f: hash2(x, 1, seed) < 0.5 ? 'lilypad_a' : 'lily_flower', x: x * TILE + 8, y: 35 * TILE + 14 });

  for (let i = 0; i < tiles.length; i++) { if (tiles[i] === T.WALL) solid[i] = 2; else if (tiles[i] === T.LIQUID) solid[i] = Math.max(solid[i], 1); }

  const sp = (t: [number, number]) => ({ x: t[0] * TILE + TILE / 2, y: t[1] * TILE + TILE / 2 });
  const start = sp(HUB_SPOTS.ankunft);
  return {
    id: def.id, def, w, h, tiles, solid, biome: def.biome, dungeon: false, seed, decor, objects, spawns: [], rooms: [],
    start, entries: { gruenwald: sp([L.gate[0], L.gate[1] - 2]) }, safe: [{ x: (w * TILE) / 2, y: (h * TILE) / 2, r: w * TILE }],
    labels: [
      { x: PX * TILE, y: (PY - 8) * TILE, name: 'Portalplatz' }, { x: L.fountain.x * TILE, y: (L.fountain.y + 5) * TILE, name: 'Quellbrunnen' },
      ...HUB_HOUSES.map(b => ({ x: b.cx * TILE + 8, y: (b.by - 6) * TILE, name: FAC_LABEL[b.fac] })),
    ],
  };
}
const FAC_LABEL: Record<string, string> = { halle: 'Trophäenhalle', gruppe: 'Gruppenbereich', lager: 'Lagerhaus', meister: 'Fähigkeitenmeister', schmiede: 'Schmiede', alchemie: 'Alchemie', haendler: 'Händler', gasthaus: 'Gasthaus' };
