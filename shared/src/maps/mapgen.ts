/**
 * Deterministische Kartengenerierung. Server und Client erzeugen aus derselben ZoneDef exakt dieselbe Karte –
 * Karten müssen daher nie über das Netz übertragen werden.
 */
import { DUNGEON_SIGNS, LORE } from '../data/lore';
import { NODE_TYPES, ZONES, type Poi, type ZoneDef } from '../data/zones';
import { Rng, fbm2, hash2, noise2 } from '../util/rng';
import { genHome } from './homegen';
import { genHub } from './hubgen';
import { placeStory } from './storygen';
import { T, TILE, isWalkableTile, type BiomeId } from './tiles';

export interface DecorSpawn { f: string; x: number; y: number }
export interface ObjSpawn { id: number; type: string; x: number; y: number; tag?: string; props?: Record<string, any> }
export interface MobSpawn { mob: string; x: number; y: number; lvl: number; group: number; elite?: boolean }
export interface Room { id: number; role: string; x0: number; y0: number; x1: number; y1: number; cx: number; cy: number; depth: number }

export interface GameMap {
  id: string;
  def: ZoneDef;
  w: number; h: number;
  tiles: Uint8Array;
  /** 0 frei, 1 blockiert Laufen (Flüssigkeit, Deko), 2 blockiert auch Geschosse (Wand, Leere) */
  solid: Uint8Array;
  biome: BiomeId;
  dungeon: boolean;
  seed: number;
  decor: DecorSpawn[];
  objects: ObjSpawn[];
  spawns: MobSpawn[];
  rooms: Room[];
  start: { x: number; y: number };
  entries: Record<string, { x: number; y: number }>;
  /** Schutzzonen (px), in denen keine Gegner erscheinen */
  safe: { x: number; y: number; r: number }[];
  bossRoom?: Room;
  /** Benannte Orte für Minimap/Weltkarte */
  labels: { x: number; y: number; name: string }[];
}

const cache = new Map<string, GameMap>();
export function getMap(zoneId: string): GameMap {
  let m = cache.get(zoneId);
  if (!m) {
    const def = ZONES[zoneId];
    if (!def) throw new Error('Unbekannte Zone: ' + zoneId);
    m = def.kind === 'home' ? genHome(def) : def.kind === 'hub' ? genHub(def) : def.kind === 'dungeon' ? genDungeon(def) : genOverworld(def);
    cache.set(zoneId, m);
  }
  return m;
}

const px = (t: number) => t * TILE + TILE / 2;
const WIDE = new Set(['rock_l', 'log', 'log_moss', 'arch', 'stall', 'stalagmite_cluster', 'rock_cave_l', 'basalt_cluster', 'obsidian_big', 'ribcage', 'snow_rock_l', 'icicle_log', 'pillar_fallen', 'wall_frag', 'broken_arch', 'shadow_spire_l']);
/** Große Bäume halten Abstand zueinander, damit Kronen nicht zu einer Wand verschmelzen. */
const BIG_TREES = new Set(['tree_oak', 'tree_oak2', 'tree_pine', 'tree_birch', 'tree_willow', 'tree_dead', 'pine_snow', 'pine_snow2', 'birch_bare', 'vine_tree', 'cypress', 'twisted_tree', 'dead_tree', 'crystal_big']);

function finishSolid(tiles: Uint8Array, solid: Uint8Array) {
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    if (t === T.WALL || t === T.VOID) solid[i] = 2;
    else if (t === T.LIQUID) solid[i] = Math.max(solid[i], 1);
  }
}

function reachable(w: number, h: number, solid: Uint8Array, sx: number, sy: number, blocked?: Set<number>): Uint8Array {
  const r = new Uint8Array(w * h);
  const q = [sy * w + sx];
  r[q[0]] = 1;
  while (q.length) {
    const i = q.pop()!;
    const x = i % w, y = (i / w) | 0;
    const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
    for (const n of nb) if (n >= 0 && !r[n] && !solid[n] && !(blocked && blocked.has(n))) { r[n] = 1; q.push(n); }
  }
  return r;
}

// =====================================================================================================================
//  OBERWELT
// =====================================================================================================================
function genOverworld(def: ZoneDef): GameMap {
  const { w, h, seed } = def;
  const rng = new Rng(seed);
  const N = def.noise!;
  const tiles = new Uint8Array(w * h);
  const solid = new Uint8Array(w * h);
  const reserved = new Uint8Array(w * h);
  /** schmale Geheimgänge: hier darf nichts stehen, was den Durchgang versperrt */
  const noBuild = new Uint8Array(w * h);
  const I = (x: number, y: number) => y * w + x;
  const inb = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h;

  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = Math.min(x, y, w - 1 - x, h - 1 - y);
    const border = 2.5 + noise2(x, y, 7, seed + 9) * 3.5;
    let t = T.GROUND;
    if (d < border) t = T.WALL;
    else {
      const nw = fbm2(x, y, 13, seed + 1), nl = fbm2(x, y, 17, seed + 2), ng = fbm2(x, y, 9, seed + 3), nh = noise2(x, y, 5, seed + 4);
      if (nw > N.wall) t = T.WALL;
      else if (nl > N.liquid) t = T.LIQUID;
      else if (nh > N.hazard && ng > 0.42) t = T.HAZARD;
      else if (ng > N.ground2) t = T.GROUND2;
    }
    tiles[I(x, y)] = t;
  }

  // Bachlauf (vor Lichtungen und Wegen, damit Wege Brücken schlagen)
  if (def.river) {
    for (let k = 0; k + 1 < def.river.length; k++) {
      const [ax, ay] = def.river[k], [bx, by] = def.river[k + 1];
      const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const cx = ax + (bx - ax) * t + (noise2(ax + i, ay + k * 31, 9, seed + 50) - 0.5) * 5;
        const cy = ay + (by - ay) * t;
        const rad = 1.2 + noise2(cx, cy, 11, seed + 51) * 0.9;
        for (let y = Math.floor(cy - rad - 1); y <= Math.ceil(cy + rad + 1); y++) for (let x = Math.floor(cx - rad - 1); x <= Math.ceil(cx + rad + 1); x++) {
          if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) continue;
          const dd = Math.hypot(x - cx, y - cy);
          if (dd <= rad) tiles[I(x, y)] = T.LIQUID;
          else if (dd <= rad + 1.2 && (tiles[I(x, y)] === T.WALL || tiles[I(x, y)] === T.HAZARD)) tiles[I(x, y)] = T.GROUND;
        }
      }
    }
  }
  const pois = def.pois!;
  const poi = (id: string) => pois.find(p => p.id === id)!;

  // POI-Lichtungen
  for (const p of pois) {
    if (p.kind === 'secret') continue;
    const R = p.r + 2;
    for (let y = p.y - R; y <= p.y + R; y++) for (let x = p.x - R; x <= p.x + R; x++) {
      if (!inb(x, y)) continue;
      const dd = Math.hypot(x - p.x, y - p.y);
      if (dd <= p.r + noise2(x, y, 3, seed + 5) * 1.5) {
        const edge = Math.min(x, y, w - 1 - x, h - 1 - y);
        if (edge < 1) continue;
        let t: number = T.GROUND;
        if (p.kind === 'village' && dd <= 5.5) t = T.PATH;
        if (p.kind === 'camp' && dd <= 2.5) t = T.PATH;
        tiles[I(x, y)] = t;
        reserved[I(x, y)] = 1;
      }
    }
  }

  // Wege
  const stamp = (cx: number, cy: number) => {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) continue;
      const dd = Math.hypot(dx, dy);
      const i = I(x, y);
      if (dd <= 1) {
        tiles[i] = tiles[i] === T.LIQUID || tiles[i] === T.BRIDGE ? T.BRIDGE : T.PATH;
        reserved[i] = 1;
      } else if (dd <= 2.3) {
        if (tiles[i] === T.WALL || tiles[i] === T.HAZARD) tiles[i] = T.GROUND;
        reserved[i] = 1;
      }
    }
  };
  const carve = (ax: number, ay: number, bx: number, by: number) => {
    let x = ax, y = ay, guard = 0;
    const total = Math.hypot(bx - ax, by - ay);
    while (Math.hypot(bx - x, by - y) > 0.8 && guard++ < 6000) {
      const dEnd = Math.hypot(bx - x, by - y), dStart = total - dEnd;
      const wob = (noise2(x, y, 7, seed + 20) - 0.5) * 2.2 * Math.min(1, dEnd / 9, Math.max(0, dStart) / 9);
      const ang = Math.atan2(by - y, bx - x) + wob;
      x += Math.cos(ang) * 0.5; y += Math.sin(ang) * 0.5;
      stamp(Math.round(x), Math.round(y));
    }
  };
  for (const [a, b] of def.links!) { const A = poi(a), B = poi(b); carve(A.x, A.y, B.x, B.y); }

  // Brücken begradigen: Jede zusammenhängende Brückenfläche wird zu einem geraden, drei Felder breiten Steg quer übers Wasser.
  {
    const seen = new Uint8Array(w * h);
    for (let i0 = 0; i0 < tiles.length; i0++) {
      if (tiles[i0] !== T.BRIDGE || seen[i0]) continue;
      const comp: number[] = [], q = [i0];
      seen[i0] = 1;
      while (q.length) {
        const i = q.pop()!; comp.push(i);
        const x = i % w, y = (i / w) | 0;
        for (const n of [i - 1, i + 1, i - w, i + w]) if (n >= 0 && n < tiles.length && !seen[n] && tiles[n] === T.BRIDGE && Math.abs((n % w) - x) + Math.abs(((n / w) | 0) - y) === 1) { seen[n] = 1; q.push(n); }
      }
      let x0 = w, x1 = 0, y0 = h, y1 = 0, sx = 0, sy = 0;
      for (const i of comp) { const x = i % w, y = (i / w) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); sx += x; sy += y; }
      const cxm = Math.round(sx / comp.length), cym = Math.round(sy / comp.length);
      // Wasser ober-/unterhalb ⇒ Steg verläuft West–Ost, sonst Nord–Süd
      let ns = 0, ew = 0;
      for (let x = x0; x <= x1; x++) { if (tiles[I(x, y0 - 1)] === T.LIQUID) ns++; if (tiles[I(x, y1 + 1)] === T.LIQUID) ns++; }
      for (let y = y0; y <= y1; y++) { if (tiles[I(x0 - 1, y)] === T.LIQUID) ew++; if (tiles[I(x1 + 1, y)] === T.LIQUID) ew++; }
      const horizontal = ns >= ew;
      // Anlandestellen: Wegfelder, die an die alte Brückenfläche grenzten – sie werden unten wieder angeschlossen
      const landings: [number, number][] = [];
      for (const i of comp) { const x = i % w, y = (i / w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (inb(x + dx, y + dy) && tiles[I(x + dx, y + dy)] === T.PATH) landings.push([x + dx, y + dy]); }
      const ends: [number, number][] = [];
      for (const i of comp) tiles[i] = T.LIQUID;
      const wet = (x: number, y: number) => inb(x, y) && (tiles[I(x, y)] === T.LIQUID || tiles[I(x, y)] === T.BRIDGE);
      if (horizontal) {
        let a = x0, b = x1;
        while (a > 2 && (wet(a - 1, cym - 1) || wet(a - 1, cym) || wet(a - 1, cym + 1))) a--;
        while (b < w - 3 && (wet(b + 1, cym - 1) || wet(b + 1, cym) || wet(b + 1, cym + 1))) b++;
        for (let x = a - 2; x <= b + 2; x++) for (let y = cym - 1; y <= cym + 1; y++) {
          if (!inb(x, y)) continue;
          if (x >= a && x <= b) { tiles[I(x, y)] = T.BRIDGE; seen[I(x, y)] = 1; }
          else if (tiles[I(x, y)] !== T.PATH) tiles[I(x, y)] = x === a - 1 || x === b + 1 ? T.PATH : tiles[I(x, y)] === T.WALL || tiles[I(x, y)] === T.HAZARD ? T.GROUND : tiles[I(x, y)];
          reserved[I(x, y)] = 1;
        }
        ends.push([a - 1, cym], [b + 1, cym]);
      } else {
        let a = y0, b = y1;
        while (a > 2 && (wet(cxm - 1, a - 1) || wet(cxm, a - 1) || wet(cxm + 1, a - 1))) a--;
        while (b < h - 3 && (wet(cxm - 1, b + 1) || wet(cxm, b + 1) || wet(cxm + 1, b + 1))) b++;
        for (let y = a - 2; y <= b + 2; y++) for (let x = cxm - 1; x <= cxm + 1; x++) {
          if (!inb(x, y)) continue;
          if (y >= a && y <= b) { tiles[I(x, y)] = T.BRIDGE; seen[I(x, y)] = 1; }
          else if (tiles[I(x, y)] !== T.PATH) tiles[I(x, y)] = y === a - 1 || y === b + 1 ? T.PATH : tiles[I(x, y)] === T.WALL || tiles[I(x, y)] === T.HAZARD ? T.GROUND : tiles[I(x, y)];
          reserved[I(x, y)] = 1;
        }
        ends.push([cxm, a - 1], [cxm, b + 1]);
      }
      for (const [lx, ly] of landings) {
        const [ex, ey] = Math.hypot(ends[0][0] - lx, ends[0][1] - ly) <= Math.hypot(ends[1][0] - lx, ends[1][1] - ly) ? ends[0] : ends[1];
        let x = lx, y = ly, guard = 0;
        while ((x !== ex || y !== ey) && guard++ < 80) {
          if (Math.abs(ex - x) >= Math.abs(ey - y)) x += Math.sign(ex - x); else y += Math.sign(ey - y);
          const i = I(x, y);
          if (tiles[i] === T.LIQUID) { tiles[i] = T.BRIDGE; seen[i] = 1; } else if (tiles[i] !== T.BRIDGE) tiles[i] = T.PATH;
          reserved[i] = 1;
        }
      }
    }
  }

  const objects: ObjSpawn[] = [];
  const decor: DecorSpawn[] = [];
  const labels: GameMap['labels'] = [];
  const entries: GameMap['entries'] = {};
  const safe: GameMap['safe'] = [];
  let oid = 1;
  const addObj = (type: string, tx: number, ty: number, tag?: string, props?: Record<string, any>) => {
    const o: ObjSpawn = { id: oid++, type, x: px(tx), y: px(ty), tag, props };
    objects.push(o);
    return o;
  };
  const addDecor = (f: string, tx: number, ty: number, sol: boolean, wCells = 1, hCells = 1) => {
    // tx,ty = Fußzelle (bei mehrzelligen: linke untere Zelle)
    for (let yy = ty - hCells + 1; yy <= ty; yy++) for (let xx = tx; xx < tx + wCells; xx++) {
      if (!inb(xx, yy)) return false;
      if (sol && (solid[I(xx, yy)] || tiles[I(xx, yy)] === T.PATH || tiles[I(xx, yy)] === T.BRIDGE)) return false;
    }
    if (sol) for (let yy = ty - hCells + 1; yy <= ty; yy++) for (let xx = tx; xx < tx + wCells; xx++) { solid[I(xx, yy)] = 1; reserved[I(xx, yy)] = 1; }
    decor.push({ f, x: tx * TILE + (wCells * TILE) / 2, y: ty * TILE + TILE - 2 });
    return true;
  };

  // Ausgänge
  for (const p of pois) {
    if (p.label) labels.push({ x: px(p.x), y: px(p.y), name: p.label });
    if (p.kind !== 'exit') continue;
    let ex = p.x, ey = p.y;
    if (p.edge) {
      const dx = p.edge === 'e' ? 1 : p.edge === 'w' ? -1 : 0, dy = p.edge === 's' ? 1 : p.edge === 'n' ? -1 : 0;
      let x = p.x, y = p.y;
      while (x > 0 && y > 0 && x < w - 1 && y < h - 1) {
        for (let k = -1; k <= 1; k++) { const xx = x + (dy ? k : 0), yy = y + (dx ? k : 0); if (inb(xx, yy)) { tiles[I(xx, yy)] = T.PATH; reserved[I(xx, yy)] = 1; } }
        x += dx; y += dy;
      }
      ex = x - dx; ey = y - dy;
      addObj('exit', ex, ey, p.id, { to: p.to, look: 'edge', label: p.label, req: p.req, reqMsg: p.reqMsg, r: 30, dir: p.edge });
    } else {
      if (p.look === 'cave') {
        for (let yy = p.y - 3; yy <= p.y - 2; yy++) for (let xx = p.x - 2; xx <= p.x + 1; xx++) if (inb(xx, yy)) tiles[I(xx, yy)] = T.WALL;
      }
      addObj('exit', p.x, p.y - 1, p.id, { to: p.to, look: p.look, label: p.label, req: p.req, reqMsg: p.reqMsg, r: 13 });
    }
    entries[p.to!] = { x: px(p.x), y: px(p.edge ? p.y : p.y + 2) };
    safe.push({ x: px(p.x), y: px(p.y), r: (p.r + 4) * TILE });
  }

  // Geheime Haine: Ring aus Wand, schmaler Zugang mit Felsblockade
  let secretN = 0;
  for (const p of pois) {
    if (p.kind !== 'secret') continue;
    const R = p.r + 3;
    for (let y = p.y - R; y <= p.y + R; y++) for (let x = p.x - R; x <= p.x + R; x++) {
      if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) continue;
      const dd = Math.hypot(x - p.x, y - p.y);
      if (dd <= p.r) { tiles[I(x, y)] = T.GROUND2; reserved[I(x, y)] = 1; solid[I(x, y)] = 0; }
      else if (dd <= p.r + 2.7) { tiles[I(x, y)] = T.WALL; reserved[I(x, y)] = 1; }
    }
    const target = poi(p.from!);
    let x = p.x, y = p.y, boulderPlaced = false, guard = 0;
    while (guard++ < 400) {
      const dx = target.x - x, dy = target.y - y;
      if (dx === 0 && dy === 0) break;
      if (Math.abs(dx) * (hash2(x, y, seed + 40) + 0.5) >= Math.abs(dy)) x += Math.sign(dx); else y += Math.sign(dy);
      if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) break;
      const dd = Math.hypot(x - p.x, y - p.y);
      const i = I(x, y);
      if (dd > p.r + 3 && (tiles[i] === T.PATH || tiles[i] === T.BRIDGE)) break;
      tiles[i] = tiles[i] === T.LIQUID ? T.BRIDGE : (dd <= p.r ? T.GROUND2 : T.GROUND);
      reserved[i] = 1; noBuild[i] = 1; solid[i] = 0;
      if (!boulderPlaced && dd >= p.r + 1) {
        addObj('boulder', x, y, 'secret', { cells: [i] });
        boulderPlaced = true;
      }
    }
    addObj('chest', p.x, p.y - 1, undefined, { tier: 'silver' });
    addObj('shard', p.x + 1, p.y + 1, 'shard' + secretN++);
  }

  // Dorf & Lager
  for (const p of pois) {
    if (p.kind === 'village') {
      const H: [string, number, number][] = [['house_a', -13, 2], ['house_b', 7, -9], ['house_c', -8, 13], ['house_a', 3, 13]];
      for (const [f, dx, dy] of H) addDecor(f, p.x + dx, p.y + dy, true, 4, 3);
      addObj('stone', p.x, p.y - 2, 'stone');
      const D: [string, number, number, boolean, number?][] = [
        ['well', 3, 4, true], ['stall', 7, 4, true, 2], ['anvil', -8, 2, true], ['bounty_board', 5, -7, true],
        ['lamp', -5, -3, true], ['lamp', 5, -3, true], ['lamp', -5, 5, true], ['lamp', 5, 6, true],
        ['barrel', -9, 3, true], ['crate', -14, 3, true], ['barrel', 11, -8, true], ['crate', 12, -8, true], ['haystack', -14, 7, true],
        ['banner', -2, 9, true], ['banner', 4, 9, true], ['crate', 9, 4, true], ['barrel', 2, 14, true],
        ['fence_h', -12, -6, true], ['fence_h', -11, -6, true], ['fence_h', -10, -6, true], ['fence_h', 12, 3, true], ['fence_h', 13, 3, true],
        ['flowers_a', -6, -8, false], ['flowers_b', -3, -9, false], ['flowers_c', 8, 9, false], ['flowers_d', -10, 9, false], ['flowers_e', 13, -3, false],
        ['forge', -10, 3, true, 2], ['woodpile', -15, 5, true, 2], ['sacks', 10, 4, true], ['cart', 11, 6, true, 3], ['bench', -3, -7, true, 2], ['bench', 2, 7, true, 2],
        ['beehive', 14, -6, true], ['birdhouse', -7, -9, true], ['scarecrow', 14, 9, true], ['bush_flower', -9, -3, true], ['bush_flower', 8, -4, true], ['flowers_f', 1, 8, false],
      ];
      for (const [f, dx, dy, s, wc] of D) addDecor(f, p.x + dx, p.y + dy, s, wc ?? 1);
      safe.push({ x: px(p.x), y: px(p.y), r: (p.r + 9) * TILE });
    } else if (p.kind === 'camp') {
      // Lagerausstattung je Biom: [Frame, dx, dy, Breite, Höhe]
      const CAMP: Record<string, [string, number, number, number?, number?][]> = {
        gruenwald: [['campfire', 0, 0], ['tent', -5, -1, 3, 2], ['woodpile', -2, -3, 2], ['crate', 5, 1], ['barrel', 5, 2]],
        kristall: [['campfire', 0, 0], ['mine_support', -6, -2, 3], ['mine_cart', 5, 2, 2], ['ore_crate', 5, -1], ['ore_crate', 6, -1], ['pickaxe_rack', -1, -4], ['lantern_post', 2, -4], ['lantern_post', -4, 3], ['tent', -6, 2, 3, 2]],
        glut: [['nomad_brazier', 0, 0], ['nomad_tent', -6, -1, 3, 2], ['nomad_tent', 5, 3, 3, 2], ['nomad_banner', 2, -4], ['nomad_banner', -2, -4], ['water_skins', 6, -1], ['cairn', -4, 3]],
        frost: [['campfire', 0, 0], ['cabin', -9, -3, 4, 3], ['fur_rack', 6, -3, 2], ['sled', -2, 4, 2], ['woodpile_snow', 1, -4, 2], ['lantern_frost', -4, -1], ['lantern_frost', 4, 1], ['prayer_flags', 6, 5, 3]],
        ruinen: [['campfire', 0, 0], ['dig_tent', -7, -1, 3, 2], ['dig_table', 5, -1, 2], ['dig_crates', 6, 2, 2], ['brazier_blue', -1, -4], ['brazier_blue', 2, -4], ['urn', -4, 3]],
        schatten: [['last_light', 0, 0], ['memory_frame', -4, -2], ['chain_pillar', 5, -3], ['chain_pillar', -5, 3], ['lost_toy', 3, 3]],
      };
      for (const [f, dx, dy, wc, hc] of CAMP[def.biome] ?? CAMP.gruenwald) addDecor(f, p.x + dx, p.y + dy, f !== 'memory_frame' && f !== 'lost_toy', wc ?? 1, hc ?? 1);
      if (def.biome === 'schatten') for (let k = 0; k < 10; k++) decor.push({ f: 'ghost_flower', x: px(p.x) + Math.round(Math.cos(k * 0.63) * 34), y: px(p.y) + Math.round(Math.sin(k * 0.63) * 26) });
      if (p.npcs?.length) addObj('stone', p.x, p.y + 4, 'stone');
      safe.push({ x: px(p.x), y: px(p.y), r: (p.r + 6) * TILE });
    }
    for (const [npc, dx, dy] of p.npcs ?? []) addObj('npc', p.x + dx, p.y + dy, npc);
    if (def.id === 'frost' && p.id === 'gipfel') addDecor('prayer_flags', p.x - 1, p.y - 2, true, 3);
    if (def.id === 'glut' && p.id === 'feld') addDecor('forge_ruin', p.x - 1, p.y - 2, true, 3, 2);
    if (def.id === 'schatten' && p.id === 'westen') decor.push({ f: 'lost_toy', x: px(p.x) + 10, y: px(p.y) + 6 });
    if (p.id === 'schrein') { addDecor('shrine', p.x - 1, p.y - 1, true, 2); addDecor('wall_ruin_h', p.x - 5, p.y - 2, true, 3); addDecor('wall_ruin_h', p.x + 2, p.y - 3, true, 3); addDecor('wall_ruin_end', p.x + 5, p.y - 3, true, 1); }
    const lore = LORE[`${def.id}:${p.id}`];
    if (lore) addObj('sign', p.x + (p.kind === 'camp' ? -2 : 1), p.y + (p.kind === 'camp' ? 3 : -2), undefined, { text: lore });
  }
  if (def.id === 'gruenwald') addObj('board', poi('dorf').x + 5, poi('dorf').y - 6, 'board');

  // Deko streuen
  const dList = def.decor!.map(d => [d, d[1]] as const);
  const bigAt = new Uint8Array(w * h);
  const nearLiquid = (x: number, y: number, r: number) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (inb(x + dx, y + dy) && tiles[I(x + dx, y + dy)] === T.LIQUID) return true; return false; };
  const lush = def.id === 'gruenwald';
  for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
    const i = I(x, y), t = tiles[i];
    if (lush && t === T.LIQUID) {
      // Seerosen auf ruhigem Wasser
      const r = hash2(x, y, seed + 61);
      if (r < 0.1) decor.push({ f: r < 0.02 ? 'lily_flower' : r < 0.06 ? 'lilypad_a' : 'lilypad_b', x: x * TILE + 3 + Math.floor(r * 977) % 10, y: y * TILE + 6 + Math.floor(r * 613) % 8 });
      continue;
    }
    if ((t !== T.GROUND && t !== T.GROUND2) || solid[i]) continue;
    if (lush && !reserved[i] && nearLiquid(x, y, 1)) {
      // Uferbewuchs
      const r = hash2(x, y, seed + 62);
      if (r < 0.5) { decor.push({ f: r < 0.3 ? 'reeds' : 'cattail', x: x * TILE + 4 + Math.floor(r * 811) % 9, y: y * TILE + 9 + Math.floor(r * 397) % 6 }); if (r < 0.12) decor.push({ f: 'reeds', x: x * TILE + 11, y: y * TILE + 14 }); continue; }
      if (r > 0.93 && !bigAt[i]) { if (addDecor('tree_willow', x, y, true)) { for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (inb(x + dx, y + dy)) bigAt[I(x + dx, y + dy)] = 1; continue; } }
    }
    if (reserved[i]) continue;
    if (lush && t === T.GROUND2 && noise2(x, y, 9, seed + 60) > 0.6) {
      // Kornfeld: dichte, wiegende Ähren, durch die man hindurchläuft
      decor.push({ f: 'wheat', x: x * TILE + 4, y: y * TILE + 7 }, { f: 'wheat', x: x * TILE + 12, y: y * TILE + 9 }, { f: 'wheat', x: x * TILE + 7, y: y * TILE + 15 });
      continue;
    }
    const dens = def.decorDensity! * (0.25 + 1.7 * noise2(x, y, 8, seed + 30));
    if (rng.next() >= dens) continue;
    const [f, , sol] = rng.weighted(dList);
    if (sol) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (solid[I(x + dx, y + dy)] === 1 && tiles[I(x + dx, y + dy)] !== T.LIQUID) n++;
      if (n > 1) continue;
      if (BIG_TREES.has(f)) {
        if (bigAt[i]) continue;
        if (!addDecor(f, x, y, true)) continue;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) bigAt[I(x + dx, y + dy)] = 1;
      } else addDecor(f, x, y, true, WIDE.has(f) ? 2 : 1);
    } else {
      decor.push({ f, x: x * TILE + 8 + rng.int(-3, 3), y: y * TILE + 12 + rng.int(-2, 2) });
    }
  }
  if (lush) for (let k = 0; k < 7; k++) {
    // verstreute Mauerreste der alten Hüter
    const x = rng.int(6, w - 9), y = rng.int(6, h - 7);
    let ok = true;
    for (let dx = 0; dx < 3; dx++) if (reserved[I(x + dx, y)] || solid[I(x + dx, y)] || (tiles[I(x + dx, y)] !== T.GROUND && tiles[I(x + dx, y)] !== T.GROUND2)) ok = false;
    if (ok) addDecor('wall_ruin_h', x, y, true, 3);
  }

  // Dichter Wald: Bäume wachsen aus dem Dickicht (rein optisch, die Zellen sind ohnehin Wand)
  const canopy: Record<string, string[]> = { gruenwald: ['tree_oak', 'tree_pine', 'tree_oak', 'tree_birch'], frost: ['pine_snow', 'pine_snow2'] };
  const canopyP = def.biome === 'gruenwald' ? 0.13 : 0.42;
  if (canopy[def.biome]) for (let y = 1; y < h; y++) for (let x = 0; x < w; x++) {
    if (tiles[I(x, y)] !== T.WALL || reserved[I(x, y)]) continue;
    const r = hash2(x, y, seed + 77);
    if (r < canopyP) decor.push({ f: canopy[def.biome][Math.floor(r * 1000) % canopy[def.biome].length], x: x * TILE + 8 + Math.floor(r * 97) % 7 - 3, y: y * TILE + 14 });
  }
  finishSolid(tiles, solid);
  for (const o of objects) if (o.type === 'npc' || o.type === 'stone' || o.type === 'sign' || o.type === 'board' || o.type === 'chest') {
    const tx = Math.floor(o.x / TILE), ty = Math.floor(o.y / TILE);
    if (tiles[I(tx, ty)] === T.WALL || tiles[I(tx, ty)] === T.LIQUID) tiles[I(tx, ty)] = T.GROUND;
    solid[I(tx, ty)] = 0;
  }

  const S = poi(def.start!);
  const start = { x: px(S.x), y: px(S.kind === 'village' ? S.y + 2 : S.edge ? S.y : S.y + 2) };
  const sx = Math.floor(start.x / TILE), sy = Math.floor(start.y / TILE);
  solid[I(sx, sy)] = 0;
  const reach = reachable(w, h, solid, sx, sy);

  // Distanz zu Wegen
  const pd = new Int16Array(w * h).fill(-1);
  { const q: number[] = [];
    for (let i = 0; i < tiles.length; i++) if (tiles[i] === T.PATH || tiles[i] === T.BRIDGE) { pd[i] = 0; q.push(i); }
    for (let k = 0; k < q.length; k++) {
      const i = q[k], x = i % w, y = (i / w) | 0;
      for (const n of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1])
        if (n >= 0 && pd[n] < 0) { pd[n] = pd[i] + 1; q.push(n); }
    } }

  const inSafe = (x: number, y: number, pad = 0) => safe.some(s => Math.hypot(px(x) - s.x, px(y) - s.y) < s.r + pad);
  const taken: [number, number][] = objects.map(o => [Math.floor(o.x / TILE), Math.floor(o.y / TILE)]);
  const farFrom = (x: number, y: number, d: number, list: [number, number][]) => list.every(([a, b]) => Math.hypot(a - x, b - y) >= d);
  const pickCell = (ok: (x: number, y: number, i: number) => boolean, tries = 3000): [number, number] | null => {
    for (let k = 0; k < tries; k++) {
      const x = rng.int(3, w - 4), y = rng.int(3, h - 4), i = I(x, y);
      if (reach[i] && !solid[i] && !noBuild[i] && isWalkableTile(tiles[i]) && tiles[i] !== T.HAZARD && tiles[i] !== T.BRIDGE && ok(x, y, i)) return [x, y];
    }
    return null;
  };

  // Truhen abseits der Wege
  const chestPos: [number, number][] = [];
  for (let n = 0; n < def.chests!; n++) {
    const c = pickCell((x, y, i) => pd[i] >= 4 && !inSafe(x, y) && farFrom(x, y, 13, chestPos) && farFrom(x, y, 3, taken));
    if (!c) continue;
    chestPos.push(c); taken.push(c);
    addObj('chest', c[0], c[1], undefined, { tier: rng.chance(0.3) ? 'silver' : 'wood' });
  }
  // Quellsplitter an abgelegenen Orten
  const shardPos: [number, number][] = [];
  for (let n = secretN; n < 5; n++) {
    const c = pickCell((x, y, i) => pd[i] >= 7 && !inSafe(x, y) && farFrom(x, y, 22, shardPos) && farFrom(x, y, 4, taken))
      ?? pickCell((x, y, i) => pd[i] >= 4 && !inSafe(x, y) && farFrom(x, y, 12, shardPos) && farFrom(x, y, 3, taken));
    if (!c) continue;
    shardPos.push(c); taken.push(c);
    addObj('shard', c[0], c[1], 'shard' + n);
  }
  // Ressourcen
  for (const [kind, count] of def.nodes!) {
    const pos: [number, number][] = [];
    for (let n = 0; n < count; n++) {
      const c = pickCell((x, y, i) => pd[i] >= 2 && !inSafe(x, y, -40) && farFrom(x, y, 7, pos) && farFrom(x, y, 2, taken));
      if (!c) continue;
      pos.push(c); taken.push(c);
      addObj('node', c[0], c[1], kind, { kind, name: NODE_TYPES[kind].name });
    }
  }
  for (const o of objects) if (o.type === 'chest' || o.type === 'node' || o.type === 'sign' || o.type === 'stone' || o.type === 'board') solid[I(Math.floor(o.x / TILE), Math.floor(o.y / TILE))] = Math.max(1, solid[I(Math.floor(o.x / TILE), Math.floor(o.y / TILE))]);

  // Gegnergruppen
  const spawns: MobSpawn[] = [];
  const gpos: [number, number][] = [];
  const maxD = Math.hypot(w, h) * 0.62;
  const [lmin, lmax] = def.level;
  let group = 1;
  const spawnGroup = (c: [number, number], forceElite = false) => {
    const main = rng.weighted(def.mobs);
    const heavy = (def.mobs.find(m => m[0] === main)![1]) < 2;
    const n = heavy ? rng.int(1, 2) : rng.int(2, 4);
    const frac = Math.min(1, Math.hypot(c[0] - sx, c[1] - sy) / maxD);
    for (let k = 0; k < n; k++) {
      const mob = k > 0 && rng.chance(0.3) ? rng.weighted(def.mobs) : main;
      let x = c[0], y = c[1];
      for (let t = 0; t < 12; t++) {
        const xx = c[0] + rng.int(-2, 2), yy = c[1] + rng.int(-2, 2);
        if (inb(xx, yy) && reach[I(xx, yy)] && !solid[I(xx, yy)]) { x = xx; y = yy; break; }
      }
      const lvl = Math.max(lmin, Math.min(lmax, Math.round(lmin + (lmax - lmin) * frac + rng.range(-0.6, 0.6))));
      spawns.push({ mob, x: px(x) + rng.int(-4, 4), y: px(y) + rng.int(-4, 4), lvl, group, elite: forceElite && k === 0 });
    }
    group++;
  };
  for (const p of pois) if (p.kind === 'spot') {
    // bewachte Truhe an besonderen Orten
    const c = pickCell((x, y) => Math.hypot(x - p.x, y - p.y) <= p.r && farFrom(x, y, 2, taken), 400);
    if (c) { addObj('chest', c[0], c[1], undefined, { tier: 'silver', guard: group }); taken.push(c); gpos.push([p.x, p.y]); spawnGroup([p.x, p.y], true); }
  }
  for (let n = 0; n < def.groups!; n++) {
    const c = pickCell((x, y) => !inSafe(x, y) && farFrom(x, y, 9, gpos));
    if (!c) continue;
    gpos.push(c);
    spawnGroup(c);
  }

  const map: GameMap = { id: def.id, def, w, h, tiles, solid, biome: def.biome, dungeon: false, seed, decor, objects, spawns, rooms: [], start, entries, safe, labels };
  placeStory(map); // 0.3: Chronik, Schreine, Story-NPCs – nach allem anderen, damit bisherige Objekt-IDs stabil bleiben
  return map;
}

// =====================================================================================================================
//  DUNGEONS
// =====================================================================================================================
const CW = 22, CH = 16;
const DUNGEON_DECOR: Record<BiomeId, [string, boolean][]> = {
  gruenwald: [['mushrooms', false], ['bones', false], ['urn', true], ['stump', true]],
  kristall: [['crystal_blue', true], ['crystal_pink', true], ['glowshroom', false], ['bones', false]],
  glut: [['skull', false], ['lava_rock', true], ['bones', false], ['obsidian', true]],
  frost: [['ice_spike', true], ['snow_rock', true], ['bones', false], ['frozen_bush', true]],
  ruinen: [['urn', true], ['rubble', true], ['pillar_broken', true], ['bones', false]],
  schatten: [['void_crystal', true], ['tombstone', true], ['bones', false], ['floating_shard', false]],
};

/** Einrichtungsgegenstände je Raumrolle: [Frame, solide] */
const ROLE_PROPS: Record<string, [string, boolean][]> = {
  combat: [['d_crate', true], ['d_barrel', true], ['d_rubble', true], ['d_urn', true], ['d_skull', false]],
  entrance: [['d_crate', true], ['d_barrel', true], ['d_candles', false]],
  key: [['d_statue', true], ['d_rack', true], ['d_urn', true], ['d_candles', false]],
  treasure: [['d_crate', true], ['d_barrel', true], ['d_urn', true], ['d_sarcophagus', true], ['d_candles', false]],
  puzzle: [['d_bookshelf', true], ['d_table', true], ['d_candles', false], ['d_statue', true]],
  secret: [['d_sarcophagus', true], ['d_candles', false], ['d_mushroom_glow', false]],
};

function genDungeon(def: ZoneDef): GameMap {
  const gx = def.gx!, gy = def.gy!, seed = def.seed;
  const rng = new Rng(seed);
  const w = gx * CW + 2, h = gy * CH + 2;
  const tiles = new Uint8Array(w * h);
  const solid = new Uint8Array(w * h);
  const I = (x: number, y: number) => y * w + x;
  const cells = gx * gy;
  const cellXY = (c: number): [number, number] => [c % gx, (c / gx) | 0];

  // Hauptpfad: selbstmeidender Zufallsweg vom Eingang (untere Reihe) zum Bossraum
  const entrance = (gy - 1) * gx + rng.int(0, gx - 1);
  const parent = new Int16Array(cells).fill(-2);
  const depth = new Int16Array(cells);
  const neighbors = (c: number) => {
    const [x, y] = cellXY(c);
    const nb: number[] = [];
    if (y > 0) nb.push(c - gx); if (x > 0) nb.push(c - 1); if (x < gx - 1) nb.push(c + 1); if (y < gy - 1) nb.push(c + gx);
    return nb;
  };
  const L = Math.max(4, Math.min(cells - 3, def.maxRooms! - 3));
  let main: number[] = [];
  for (let attempt = 0; attempt < 300 && main.length < L; attempt++) {
    const walk = [entrance];
    const seen = new Set(walk);
    while (walk.length < L) {
      const free = neighbors(walk[walk.length - 1]).filter(n => !seen.has(n));
      if (!free.length) break;
      const n = rng.pick(free);
      walk.push(n); seen.add(n);
    }
    if (walk.length > main.length) main = walk;
  }
  parent[entrance] = -1;
  for (let k = 1; k < main.length; k++) { parent[main[k]] = main[k - 1]; depth[main[k]] = k; }
  const boss = main[main.length - 1];
  const mainSet = new Set(main);
  const keep = new Set(main);
  const role = new Map<number, string>();
  role.set(entrance, 'entrance'); role.set(boss, 'boss');
  // Nebenräume: Schlüssel, Rätsel, Geheimnis, Schatzkammern
  const attach = (maxIdx: number, r: string): number => {
    const cand: [number, number][] = [];
    for (const c of keep) {
      if (c === boss) continue;
      const idx = mainSet.has(c) ? main.indexOf(c) : 99;
      if (mainSet.has(c) && idx > maxIdx) continue;
      if (!mainSet.has(c) && (maxIdx < 90 || role.get(c) !== 'treasure')) continue;
      for (const n of neighbors(c)) if (!keep.has(n)) cand.push([n, c]);
    }
    if (!cand.length) return -1;
    const [n, p] = rng.pick(cand);
    parent[n] = p; depth[n] = depth[p] + 1; keep.add(n); role.set(n, r);
    return mainSet.has(p) ? main.indexOf(p) : 99;
  };
  let lockEdge = -1, lockOnBoss = false;
  let keyAt = attach(main.length - 3, 'key');
  if (keyAt < 0) { keyAt = attach(main.length - 2, 'key'); if (keyAt >= 0) lockOnBoss = true; }
  else lockEdge = Math.min(main.length - 3, Math.max(keyAt, Math.floor((main.length - 1) / 2)));
  attach(main.length - 2, 'puzzle');
  attach(main.length - 2, 'secret');
  while (keep.size < def.maxRooms!) if (attach(99, 'treasure') < 0) break;
  let alt = 0;
  for (let k = 1; k < main.length - 1; k++) role.set(main[k], alt++ % 2 === 1 ? 'trap' : 'combat');

  // Räume
  const rooms: Room[] = [];
  const roomOf = new Map<number, Room>();
  for (const c of [...keep].sort((a, b) => a - b)) {
    const [x, y] = cellXY(c);
    const cx = 1 + x * CW + CW / 2, cy = 1 + y * CH + CH / 2;
    const r = role.get(c)!;
    const hw = r === 'boss' ? 9 : r === 'secret' ? 4 : rng.int(5, 8);
    const hh = r === 'boss' ? 6 : r === 'secret' ? 3 : rng.int(4, 5);
    const room: Room = { id: rooms.length + 1, role: r, x0: cx - hw, y0: cy - hh, x1: cx + hw - 1, y1: cy + hh - 1, cx, cy, depth: depth[c] };
    rooms.push(room); roomOf.set(c, room);
    for (let yy = room.y0; yy <= room.y1; yy++) for (let xx = room.x0; xx <= room.x1; xx++) tiles[I(xx, yy)] = T.FLOOR;
  }

  const objects: ObjSpawn[] = [];
  const decor: DecorSpawn[] = [];
  const spawns: MobSpawn[] = [];
  let oid = 1;
  const addObj = (type: string, tx: number, ty: number, tag?: string, props?: Record<string, any>) => {
    const o: ObjSpawn = { id: oid++, type, x: px(tx), y: px(ty), tag, props };
    objects.push(o);
    return o;
  };

  // Korridore + Türen
  for (const c of keep) {
    const p = parent[c];
    if (p < 0) continue;
    const A = roomOf.get(p)!, B = roomOf.get(c)!;
    let doorCells: number[], orient: 'h' | 'v', dx: number, dy: number;
    if (A.cy === B.cy) {
      const L = A.cx < B.cx ? A : B, R = A.cx < B.cx ? B : A;
      for (let x = L.x1; x <= R.x0; x++) { tiles[I(x, A.cy - 1)] = T.FLOOR; tiles[I(x, A.cy)] = T.FLOOR; }
      const x = Math.round((L.x1 + R.x0) / 2);
      doorCells = [I(x, A.cy - 1), I(x, A.cy)]; orient = 'h'; dx = x; dy = A.cy;
    } else {
      const U = A.cy < B.cy ? A : B, D = A.cy < B.cy ? B : A;
      for (let y = U.y1; y <= D.y0; y++) { tiles[I(A.cx - 1, y)] = T.FLOOR; tiles[I(A.cx, y)] = T.FLOOR; }
      const y = Math.round((U.y1 + D.y0) / 2);
      doorCells = [I(A.cx - 1, y), I(A.cx, y)]; orient = 'v'; dx = A.cx; dy = y;
    }
    const r = role.get(c)!;
    const mi = main.indexOf(c);
    if (r === 'boss') addObj('bossdoor', dx, dy, 'bossdoor', { cells: doorCells, orient, locked: lockOnBoss });
    else if (r === 'secret') addObj('boulder', dx, dy, 'secret', { cells: doorCells, orient });
    else if (mi > 0 && mi - 1 === lockEdge) addObj('door', dx, dy, 'locked', { cells: doorCells, orient, locked: true });
  }
  // Wände
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (tiles[I(x, y)] !== T.VOID) continue;
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < w && yy < h && tiles[I(xx, yy)] !== T.VOID && tiles[I(xx, yy)] !== T.WALL) { near = true; break; }
    }
    if (near) tiles[I(x, y)] = T.WALL;
  }

  const [lmin, lmax] = def.level;
  const maxDepth = Math.max(1, ...rooms.map(r => r.depth));
  const used = new Set<number>();
  const free = (x: number, y: number) => tiles[I(x, y)] === T.FLOOR && !used.has(I(x, y)) && !solid[I(x, y)];
  const take = (x: number, y: number) => used.add(I(x, y));
  const onAxis = (room: Room, x: number, y: number) => (x === room.cx || x === room.cx - 1 || y === room.cy || y === room.cy - 1);
  const addMobs = (room: Room, n: number, eliteFirst = false) => {
    const lvl = Math.round(lmin + (lmax - lmin) * (room.depth / maxDepth));
    for (let k = 0; k < n; k++) {
      for (let t = 0; t < 30; t++) {
        const x = rng.int(room.x0 + 1, room.x1 - 1), y = rng.int(room.y0 + 1, room.y1 - 1);
        if (!free(x, y)) continue;
        spawns.push({ mob: rng.weighted(def.mobs), x: px(x), y: px(y), lvl, group: room.id, elite: eliteFirst && k === 0 });
        break;
      }
    }
  };
  const solidDecor = (f: string, x: number, y: number) => { decor.push({ f, x: px(x), y: y * TILE + TILE - 2 }); solid[I(x, y)] = 1; take(x, y); };
  const chestAt = (room: Room, tier: string, props: Record<string, any> = {}, pos?: [number, number]) => {
    let c = pos;
    if (!c) for (let t = 0; t < 60 && !c; t++) {
      const x = rng.pick([room.x0 + 1, room.x1 - 1, rng.int(room.x0 + 1, room.x1 - 1)]), y = rng.pick([room.y0 + 1, room.y1 - 1]);
      if (free(x, y) && !onAxis(room, x, y)) c = [x, y];
    }
    if (!c) c = [room.cx + 1, room.cy - 2];
    take(c[0], c[1]); solid[I(c[0], c[1])] = 1;
    return addObj('chest', c[0], c[1], undefined, { tier, ...props });
  };

  let start = { x: 0, y: 0 };
  let bossRoom: Room | undefined;
  for (const room of rooms) {
    const { cx, cy, x0, y0, x1, y1 } = room;
    const hw = cx - x0, hh = cy - y0;
    // Säulen
    if (hw >= 6 && hh >= 4 && room.role !== 'puzzle' && room.role !== 'trap') {
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const x = sx < 0 ? cx - (hw - 3) : cx + (hw - 3) - 1, y = sy < 0 ? cy - (hh - 2) : cy + (hh - 2) - 1;
        tiles[I(x, y)] = T.WALL; take(x, y);
      }
    }
    // Lichtquellen und Wandschmuck
    if (room.role === 'boss' || room.role === 'trap') {
      solidDecor('brazier', x0, y0); solidDecor('brazier', x1, y0);
      if (room.role === 'boss') { solidDecor('brazier', x0, y1); solidDecor('brazier', x1, y1); }
    }
    const wallY = y0 * TILE - 3;
    for (let x = x0 + 1, k = room.id; x <= x1 - 1; x++, k++) {
      if (tiles[I(x, y0 - 1)] !== T.WALL || tiles[I(x, y0)] !== T.FLOOR) continue;
      const m = (x - x0) % 4;
      if (m === 1) decor.push({ f: 'wall_torch', x: px(x), y: wallY });
      else if (m === 3 && room.role !== 'secret') {
        const r = hash2(x, y0, seed + 5);
        const f = r < 0.4 ? 'd_banner' : r < 0.55 ? 'd_chains' : r < 0.7 && def.biome === 'gruenwald' ? 'd_roots' : null;
        if (f) decor.push({ f, x: px(x), y: wallY + (f === 'd_roots' ? 6 : 0) });
      }
    }
    if (hash2(room.id, 1, seed) < 0.6) decor.push({ f: 'd_cobweb', x: x0 * TILE + 9, y: y0 * TILE + 12 });
    if (hash2(room.id, 2, seed) < 0.6) decor.push({ f: 'd_cobweb', x: (x1 + 1) * TILE - 9, y: y0 * TILE + 12 });
    // (Teppiche entfallen: Der Geländemaler setzt in großen Räumen ein Bodenmedaillon in die Mitte.)
    switch (room.role) {
      case 'entrance': {
        start = { x: px(cx) - 8, y: px(cy) };
        addObj('exit', cx, y1, 'out', { to: def.parent, look: 'stairs_up', label: ZONES[def.parent!].name, r: 12 });
        take(cx, y1); take(cx - 1, y1);
        addObj('sign', cx + 2, cy - 2, undefined, { text: DUNGEON_SIGNS[def.id] ?? '' });
        solid[I(cx + 2, cy - 2)] = 1; take(cx + 2, cy - 2);
        break;
      }
      case 'combat': {
        if (rng.chance(0.4)) {
          const t = rng.chance(0.5) ? T.LIQUID : T.HAZARD;
          const bx = rng.chance(0.5) ? x0 + 2 : x1 - 4, by = rng.chance(0.5) ? y0 + 1 : y1 - 2;
          for (let yy = by; yy <= by + 1; yy++) for (let xx = bx; xx <= bx + 2; xx++) if (free(xx, yy) && !onAxis(room, xx, yy)) { tiles[I(xx, yy)] = t; take(xx, yy); }
        }
        addMobs(room, rng.int(3, 5));
        if (rng.chance(0.4)) chestAt(room, 'wood');
        break;
      }
      case 'treasure': {
        addMobs(room, rng.int(3, 4), true);
        chestAt(room, rng.chance(0.5) ? 'silver' : 'wood', { guard: room.id });
        break;
      }
      case 'trap': {
        const colCells = (x: number) => { const a: number[] = []; for (let y = y0; y <= y1; y++) if (tiles[I(x, y)] === T.FLOOR) { a.push(I(x, y)); take(x, y); } return a; };
        const rowCells = (y: number) => { const a: number[] = []; for (let x = x0; x <= x1; x++) if (tiles[I(x, y)] === T.FLOOR && !used.has(I(x, y))) { a.push(I(x, y)); take(x, y); } return a; };
        addObj('spikes', cx - 4, cy, 'trap', { cells: colCells(cx - 4), period: 2.6, offset: 0 });
        addObj('spikes', cx + 3, cy, 'trap', { cells: colCells(cx + 3), period: 2.6, offset: 1.3 });
        addObj('spikes', cx, cy - 3, 'trap', { cells: rowCells(cy - 3), period: 3, offset: 0.6 });
        addObj('spikes', cx, cy + 2, 'trap', { cells: rowCells(cy + 2), period: 3, offset: 2.1 });
        addObj('turret', x0, cy - 2, 'trap', { dir: 0, period: 2.4, offset: 0 }); solid[I(x0, cy - 2)] = 1; take(x0, cy - 2);
        addObj('turret', x1, cy + 1, 'trap', { dir: Math.PI, period: 2.4, offset: 1.2 }); solid[I(x1, cy + 1)] = 1; take(x1, cy + 1);
        addMobs(room, 2);
        chestAt(room, 'silver', {}, [cx + 1, cy - 2]);
        break;
      }
      case 'key': {
        addMobs(room, rng.int(4, 5), true);
        chestAt(room, 'silver', { key: true, guard: room.id }, [cx + 1, cy - 2]);
        break;
      }
      case 'puzzle': {
        const chest = chestAt(room, 'silver', { sealed: true, bonus: true }, [cx + 1, cy - 2]);
        let text = '';
        if (def.puzzle === 'torches') {
          const pos: [number, number, string][] = [[cx - 4, cy - 3, 'Nordwesten'], [cx + 3, cy - 3, 'Nordosten'], [cx - 4, cy + 2, 'Südwesten'], [cx + 3, cy + 2, 'Südosten']];
          const perm = rng.shuffle([0, 1, 2, 3]);
          pos.forEach(([x, y], k) => { addObj('brazier', x, y, 'puzzle', { idx: k }); solid[I(x, y)] = 1; take(x, y); });
          text = `Steintafel: „Die Flamme wandert: erst nach ${pos[perm[0]][2]}, dann ${pos[perm[1]][2]}, dann ${pos[perm[2]][2]} – und sie ruht im ${pos[perm[3]][2]}.“`;
          chest.props!.puzzle = { kind: 'torches', order: perm };
        } else if (def.puzzle === 'levers') {
          let bits: number[];
          do { bits = [0, 1, 2, 3].map(() => rng.int(0, 1)); } while (bits.every(b => b === 0));
          [cx - 4, cx - 2, cx + 1, cx + 3].forEach((x, k) => { addObj('lever', x, y0 + 1, 'puzzle', { idx: k }); solid[I(x, y0 + 1)] = 1; take(x, y0 + 1); });
          text = `Über dem Sockel leuchten vier Steine: ${bits.map(b => (b ? '◆' : '◇')).join(' ')} – „Hell heißt gezogen.“`;
          chest.props!.puzzle = { kind: 'levers', bits };
        } else {
          const pos: [number, number][] = [[x0 + 1, y0 + 1], [x1 - 1, y0 + 1], [x0 + 1, y1 - 1], [x1 - 1, y1 - 1], [cx - 3, cy + 1]];
          pos.forEach(([x, y], k) => { addObj('plate', x, y, 'puzzle', { idx: k }); take(x, y); });
          text = 'Steintafel: „Fünf Schritte, ein Atemzug. Wer trödelt, beginnt von vorn.“ (Alle Platten müssen gleichzeitig leuchten – allein oder gemeinsam.)';
          chest.props!.puzzle = { kind: 'plates', count: 5, time: 6.5 };
        }
        addObj('sign', cx - 2, cy - 2, undefined, { text }); solid[I(cx - 2, cy - 2)] = 1; take(cx - 2, cy - 2);
        break;
      }
      case 'secret': {
        chestAt(room, 'silver', {}, [cx + 1, cy - 2]);
        addObj('shard', cx - 2, cy + 1, 'shard0');
        break;
      }
      case 'boss': {
        bossRoom = room;
        break;
      }
    }
    // Deko: Einrichtung an den Wänden, Spuren auf dem Boden
    if (room.role !== 'boss' && room.role !== 'trap') {
      const list: [string, boolean][] = [...DUNGEON_DECOR[def.biome], ...ROLE_PROPS[room.role] ?? ROLE_PROPS.combat];
      for (let k = rng.int(4, 8); k > 0; k--) {
        const x = rng.int(x0, x1), y = rng.pick([y0, y1, rng.int(y0, y1)]);
        if (!free(x, y) || onAxis(room, x, y) || (x > x0 && x < x1 && y > y0 && y < y1)) continue;
        const [f, sol] = rng.pick(list);
        if (sol) solidDecor(f, x, y); else { decor.push({ f, x: px(x), y: y * TILE + 12 }); take(x, y); }
      }
    }
    if (room.role === 'boss') for (const [sx, sy] of [[-1, -1], [1, -1]]) { const x = sx < 0 ? x0 + 3 : x1 - 3; if (free(x, y0)) solidDecor('d_statue', x, y0); void sy; }
    for (let k = rng.int(2, 5); k > 0; k--) {
      const x = rng.int(x0, x1), y = rng.int(y0, y1);
      if (tiles[I(x, y)] !== T.FLOOR) continue;
      decor.push({ f: rng.pick(['d_crack', 'd_crack', 'd_moss', 'd_moss', 'd_puddle', 'd_bones', 'd_grate']), x: px(x) + rng.int(-4, 4), y: y * TILE + 12 + rng.int(-3, 3) });
    }
  }

  finishSolid(tiles, solid);
  const entries: GameMap['entries'] = { [def.parent!]: start };
  const map: GameMap = { id: def.id, def, w, h, tiles, solid, biome: def.biome, dungeon: true, seed, decor, objects, spawns, rooms, start, entries, safe: [], bossRoom, labels: [] };
  placeStory(map); // 0.3: Chronik und Story-NPCs (siehe storygen.ts)
  return map;
}

/** Zellen, die ein Objekt in geschlossenem Zustand blockiert. */
export function objCells(o: { props?: Record<string, any> }): number[] { return o.props?.cells ?? []; }

/** Hilfsfunktion für Tests und Server: Ist die Karte vom Start aus überall dort begehbar, wo etwas steht? */
export function validateMap(m: GameMap): string[] {
  const errs: string[] = [];
  const sx = Math.floor(m.start.x / TILE), sy = Math.floor(m.start.y / TILE);
  if (m.solid[sy * m.w + sx]) errs.push('Start blockiert');
  // geschlossene Türen/Felsen zählen als offen
  const r = reachable(m.w, m.h, m.solid, sx, sy);
  const near = (x: number, y: number) => {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = tx + dx, yy = ty + dy;
      if (xx >= 0 && yy >= 0 && xx < m.w && yy < m.h && r[yy * m.w + xx]) return true;
    }
    return false;
  };
  for (const o of m.objects) if (!near(o.x, o.y)) errs.push(`Objekt ${o.type}#${o.id} (${o.tag ?? ''}) unerreichbar`);
  for (const s of m.spawns) if (!near(s.x, s.y)) errs.push(`Spawn ${s.mob} unerreichbar`);
  for (const k in m.entries) if (!near(m.entries[k].x, m.entries[k].y)) errs.push(`Eingang ${k} unerreichbar`);
  return errs;
}
