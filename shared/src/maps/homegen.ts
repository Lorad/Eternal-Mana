/**
 * Zuhause (0.7): die Karte des eigenen Hofs. Wie alle Karten deterministisch – Server und Client bauen sie aus derselben
 * Definition. Ein kleines Grundstück im Grünwald aus vorhandener Grafik: Haus, umzäunter Hof, Weg zum Tor.
 *
 * Was auf dem Hof steht (Truhe, Bett, Stationen, Trophäenständer …), sind Objekte vom Typ `hobj` mit festem Platz;
 * ihre Zellen sind immer solide. Wie sie aussehen und ob sie schon benutzbar sind, bestimmt der Server aus dem
 * Stand des Besitzers (server/src/home) – vor dem Ausbau steht dort ein Bauplatz.
 */
import type { ZoneDef } from '../data/zones';
import { fbm2, hash2, noise2 } from '../util/rng';
import type { DecorSpawn, GameMap, ObjSpawn } from './mapgen';
import { T, TILE } from './tiles';

/** Hof (innerhalb des Zauns), Haus und Tor in Kacheln */
export const HOME_YARD = { x0: 11, y0: 9, x1: 32, y1: 27, gate: [21, 22] as [number, number] };
const HOUSE = { x: 20, y: 13, w: 4, h: 3 };

/**
 * Plätze der Hof-Objekte: [Kennung, Kachel x, Kachel y (Fußzeile), Breite in Kacheln, Höhe in Kacheln, Index]
 * Die Trophäenständer säumen den Weg vom Tor zum Haus – Nummer 0 und 1 stehen dem Haus am nächsten.
 */
export const HOME_SPOTS: [string, number, number, number, number, number?][] = [
  ['stash', 17, 13, 2, 1],
  ['wardrobe', 25, 13, 1, 1],
  ['bed', 27, 13, 2, 2],
  ['table', 14, 17, 2, 1],
  ['stable', 13, 23, 2, 1],
  ['forge', 28, 17, 2, 1],
  ['alchemy', 28, 20, 2, 1],
  ['cooking', 27, 23, 1, 1],
  ['enchant', 30, 23, 1, 1],
  ['stand', 19, 16, 1, 1, 0], ['stand', 24, 16, 1, 1, 1],
  ['stand', 19, 18, 1, 1, 2], ['stand', 24, 18, 1, 1, 3],
  ['stand', 19, 20, 1, 1, 4], ['stand', 24, 20, 1, 1, 5],
  ['stand', 19, 22, 1, 1, 6], ['stand', 24, 22, 1, 1, 7],
];

export function genHome(def: ZoneDef): GameMap {
  const { w, h, seed } = def;
  const tiles = new Uint8Array(w * h), solid = new Uint8Array(w * h);
  const I = (x: number, y: number) => y * w + x;
  const Y = HOME_YARD;
  const inYard = (x: number, y: number) => x >= Y.x0 && x <= Y.x1 && y >= Y.y0 && y <= Y.y1;

  // Lichtung im Dickicht, der Weg führt nach Süden hinaus
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = Math.min(x, y, w - 1 - x, h - 1 - y);
    const border = 3.2 + noise2(x, y, 6, seed + 9) * 3;
    let t: number = T.GROUND;
    if (d < border && !inYard(x, y)) t = T.WALL;
    else if (x >= 34 && y >= 11 && y <= 23 && fbm2(x, y, 9, seed + 3) > 0.36) t = T.GROUND2; // ein kleines Kornfeld östlich des Zauns
    tiles[I(x, y)] = t;
  }
  for (let y = HOUSE.y + 1; y < h - 1; y++) for (const x of Y.gate) tiles[I(x, y)] = T.PATH;
  for (let x = 18; x <= 25; x++) tiles[I(x, HOUSE.y + 1)] = T.PATH;       // Vorplatz vor der Haustür
  for (let y = h - 6; y < h - 1; y++) for (const x of [Y.gate[0] - 1, Y.gate[1] + 1]) if (tiles[I(x, y)] === T.WALL) tiles[I(x, y)] = T.GROUND;

  const decor: DecorSpawn[] = [], objects: ObjSpawn[] = [];
  const block = (tx: number, ty: number, wc = 1, hc = 1) => { for (let yy = ty - hc + 1; yy <= ty; yy++) for (let xx = tx; xx < tx + wc; xx++) solid[I(xx, yy)] = 1; };
  const put = (f: string, tx: number, ty: number, sol = true, wc = 1, hc = 1) => { if (sol) block(tx, ty, wc, hc); decor.push({ f, x: tx * TILE + (wc * TILE) / 2, y: ty * TILE + TILE - 2 }); };

  // Haus
  put('house_a', HOUSE.x, HOUSE.y, true, HOUSE.w, HOUSE.h);
  // Zaun: oben und unten liegend, an den Seiten stehend; das Tor bleibt offen, Laternen als Torpfosten
  for (let x = Y.x0; x <= Y.x1; x++) {
    put('fence_h', x, Y.y0);
    if (Y.gate.includes(x)) continue;
    if (x === Y.gate[0] - 1 || x === Y.gate[1] + 1) put('lamp', x, Y.y1); else put('fence_h', x, Y.y1);
  }
  for (let y = Y.y0 + 1; y < Y.y1; y++) { put('fence_v', Y.x0, y); put('fence_v', Y.x1, y); }

  // Einrichtung: feste Plätze, immer solide (die Grafik liefert der Server als Objekt)
  let oid = 1;
  const obj = (type: string, x: number, y: number, tag: string, props?: Record<string, any>) => { objects.push({ id: oid++, type, x, y, tag, props }); };
  block(25, 25);
  obj('stone', 25 * TILE + TILE / 2, 25 * TILE + TILE / 2, 'stone');
  for (const [kind, tx, ty, wc, hc, idx] of HOME_SPOTS) {
    block(tx, ty, wc, hc);
    obj('hobj', tx * TILE + (wc * TILE) / 2, ty * TILE + TILE / 2, kind, idx === undefined ? { kind } : { kind, idx });
  }
  // der Wegweiser zurück nach Quellhain steht vor dem Tor
  block(24, 29);
  obj('hobj', 24 * TILE + TILE / 2, 29 * TILE + TILE / 2, 'tor', { kind: 'tor' });

  // Kleinkram, der einen Hof zum Hof macht
  put('rug', 14, 18, false, 2);
  put('anvil', 27, 18);
  put('woodpile', 12, 11, true, 2);
  put('barrel', 30, 17); put('crate', 31, 20); put('sacks', 30, 20);
  put('bench', 16, 20, true, 2);
  put('well', 16, 25, true, 2);
  put('birdhouse', 13, 14); put('beehive', 31, 11);
  put('bush_flower', 12, 26); put('bush_flower', 31, 26);
  put('scarecrow', 37, 16);
  for (let y = Y.y0 + 1; y < Y.y1; y++) for (let x = Y.x0 + 1; x < Y.x1; x++) {
    const i = I(x, y);
    if (solid[i] || tiles[i] !== T.GROUND) continue;
    const r = hash2(x, y, seed + 31);
    if (r < 0.11) decor.push({ f: ['flowers_a', 'flowers_b', 'flowers_c', 'flowers_d', 'clover', 'flowers_e'][Math.floor(r * 1000) % 6], x: x * TILE + 8, y: y * TILE + 12 });
  }
  // draußen: ein Streifen Korn, Farn und Gras, am Rand der Wald
  for (let y = 2; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = I(x, y), t = tiles[i];
    if (inYard(x, y) || solid[i]) continue;
    const r = hash2(x, y, seed + 77);
    if (t === T.WALL) {
      const gateView = y > Y.y1 && y < h - 3 && Math.abs(x - 21.5) < 6; // vor dem Tor bleibt der Blick frei
      if (r < 0.34 && !gateView) decor.push({ f: ['tree_oak', 'tree_pine', 'tree_oak2', 'tree_birch'][Math.floor(r * 1000) % 4], x: x * TILE + 8 + (Math.floor(r * 97) % 7) - 3, y: y * TILE + 14 });
      continue;
    }
    if (t === T.GROUND2) { decor.push({ f: 'wheat', x: x * TILE + 4, y: y * TILE + 7 }, { f: 'wheat', x: x * TILE + 12, y: y * TILE + 9 }, { f: 'wheat', x: x * TILE + 7, y: y * TILE + 15 }); continue; }
    if (t === T.GROUND && r < 0.16) decor.push({ f: r < 0.07 ? 'tallgrass' : r < 0.11 ? 'fern' : r < 0.14 ? 'flowers_f' : 'mushrooms', x: x * TILE + 8, y: y * TILE + 12 });
  }
  for (let i = 0; i < tiles.length; i++) if (tiles[i] === T.WALL) solid[i] = 2;

  const gx = ((Y.gate[0] + Y.gate[1] + 1) / 2) * TILE;
  const start = { x: gx, y: 29 * TILE + TILE / 2 };
  return {
    id: def.id, def, w, h, tiles, solid, biome: def.biome, dungeon: false, seed, decor, objects, spawns: [], rooms: [],
    start, entries: { gruenwald: start }, safe: [{ x: (w * TILE) / 2, y: (h * TILE) / 2, r: w * TILE }],
    labels: [{ x: gx, y: 15 * TILE, name: def.name }],
  };
}
