/**
 * Kartengenerator der Expeditionen (0.9): eine Kette von Abschnitten nach dem handgeschriebenen Plan aus
 * shared/src/data/expeditions.ts – deterministisch aus dem Seed, wie alle Karten (Server und Client erzeugen dieselbe).
 *
 *   1. Anordnen   Jeder Abschnitt bekommt ein Rechteck je nach Form (Halle, Gang, Höhle, Kammer, Grotte, Arena) und wird
 *                 in einer freien Richtung an seinen Vorgänger gesetzt, verbunden durch einen echten Übergang (Treppe,
 *                 Brücke über einen Abgrund, Tor, Stollen, verschlossene Tür, geheime Wand). Seitenflügel und
 *                 Schatzkammern zweigen ab. Passt etwas nicht, beginnt die Anordnung mit demselben Zufall neu.
 *   2. Graben     Formen, Gänge, Wände; jeder Abschnitt bekommt ein „Rückgrat“ von jedem Zugang zur Mitte, auf dem nie
 *                 etwas Solides steht – so bleibt jede Form durchquerbar.
 *   3. Füllen     Gegnergruppen, Truhen, Fallen, Rätsel, Mini-Bosse, Kontrollpunkt, Arena, Belohnungskammer, Ereignisse.
 *   4. Prüfen     `validateExpedition`: der Weg vom Eingang über Schlüssel, Türen und Rätsel bis zur Arena existiert;
 *                 Schatzkammern sind nur durch ihre geheime Wand erreichbar.
 * Was der Server zur Laufzeit braucht (Abschnitte, Mini-Bosse, Rätsel, Ereignisse), steht in `GameMap.exp`.
 */
import { EXPEDITIONS, EXP_CFG, MINIS, type ExpEvent, type ExpeditionDef, type PuzzleKind, type SectionDef, type Transition } from '../data/expeditions';
import { NODE_TYPES, ZONES, type ZoneDef } from '../data/zones';
import { Rng, hash2, noise2 } from '../util/rng';
import type { DecorSpawn, GameMap, MobSpawn, ObjSpawn, Room } from './mapgen';
import { placeStory } from './storygen';
import { T, TILE, type BiomeId } from './tiles';

type Dir = 'n' | 'e' | 's' | 'w';
const OPP: Record<Dir, Dir> = { n: 's', s: 'n', e: 'w', w: 'e' };
const px = (t: number) => t * TILE + TILE / 2;

/** Ein Abschnitt auf der fertigen Karte (Kachelkoordinaten) */
export interface ExpSection {
  id: string; name: string; role: string; shape: string;
  x0: number; y0: number; x1: number; y1: number; cx: number; cy: number;
  /** Reihenfolge auf dem Hauptweg (Seitenflügel und Schatzkammern: die ihres Abzweigs) */
  order: number; main: boolean; secret: boolean; optional: boolean; look: number;
  /** Mündungen der Übergänge: Zellen quer über den Gang direkt am Abschnitt (für Sperren bei Ereignissen) */
  mouths: { cells: number[]; x: number; y: number; orient: 'h' | 'v' }[];
  /** Ankunftspunkt (px) vom vorigen Abschnitt aus */
  entry: { x: number; y: number };
}
export interface ExpPuzzle { idx: number; kind: PuzzleKind; sec: string; order?: number[]; bits?: number[]; runes?: number[]; count?: number; time?: number }
export interface ExpMapInfo {
  id: string;
  sections: ExpSection[];
  minis: { mini: string; x: number; y: number; sec: string; optional: boolean }[];
  puzzles: ExpPuzzle[];
  events: { kind: ExpEvent; sec: string }[];
  checkpoint: { x: number; y: number } | null;
  /** Mitte der Belohnungskammer (px): dort erscheinen Altar und Portal */
  reward: { x: number; y: number };
  /** IDs der Geheimnisse (Schatzkammern) */
  secrets: string[];
  /** Zahl der Gegnergruppen auf dem Hauptweg und insgesamt */
  groups: number;
}

interface Node {
  def: SectionDef; idx: number; main: boolean; order: number; parent: number; via: Transition; secret: boolean; optional: boolean;
  w: number; h: number; x0: number; y0: number; dir: Dir;
  /** Gang zum Elternabschnitt */
  link?: Link;
}
interface Link { a: number; b: number; dir: Dir; c: number; from: number; to: number; width: number; kind: Transition; boss?: boolean; reward?: boolean; seal?: number }
interface Box { x0: number; y0: number; x1: number; y1: number; owner: number }

const SIZE: Record<string, [number, number, number, number]> = {
  // [Breite min, max, Höhe min, max] für einen Abschnitt, der nach Norden/Süden erreicht wird
  hall: [28, 32, 17, 20], corridor: [8, 9, 22, 28], cavern: [22, 27, 17, 21], chamber: [11, 14, 9, 11], grotto: [26, 31, 19, 22], arena: [30, 30, 20, 20],
};
const TLEN: Record<Transition, [number, number]> = { stairs: [6, 9], bridge: [10, 14], gate: [3, 5], tunnel: [8, 12], locked: [3, 5], secret: [3, 4] };
const narrow = (k: Transition, boss?: boolean) => boss || k === 'gate' || k === 'locked' || k === 'secret' || k === 'tunnel';

/** Einrichtung je Region: [Frame, solide] – erste und zweite Hälfte der Expedition */
const DRESS: Record<BiomeId, [[string, boolean][], [string, boolean][]]> = {
  gruenwald: [[['mushrooms', false], ['stump', true], ['d_roots', false], ['bush', true], ['fern', false], ['mushroom_big', false]], [['bones', false], ['d_urn', true], ['stump_moss', true], ['d_skull', false], ['d_sarcophagus', true]]],
  kristall: [[['crystal_blue', true], ['glowshroom', false], ['crystal_shards', false], ['stalagmite', true]], [['crystal_pink', true], ['crystal_teal', true], ['bones', false], ['drip_stone', true]]],
  glut: [[['lava_rock', true], ['skull', false], ['ash_pile', false], ['basalt_column', true]], [['obsidian', true], ['ember_vent', false], ['magma_crack', false], ['ribcage', true]]],
  frost: [[['ice_spike', true], ['snow_rock', true], ['snowdrift', false], ['frozen_bush', true]], [['ice_crystal', true], ['ice_crack', false], ['frozen_statue', true], ['bones', false]]],
  ruinen: [[['urn', true], ['rubble', true], ['pillar_broken', true], ['mosaic', false]], [['rune_stone', true], ['statue_broken', true], ['urn_broken', false], ['floating_rune', false]]],
  schatten: [[['void_crystal', true], ['tombstone', true], ['ghost_flower', false], ['tendril', false]], [['shadow_spire', true], ['floating_shard', false], ['eye_stalk', true], ['memory_frame', false]]],
};
/** Kunst-Requisiten der Expeditionen (Zeichner: exp_<biom>_a|b|c) – der Client fällt auf vorhandene Frames zurück (client/src/game/expart.ts) */
const PROPS = (b: BiomeId) => [`exp_${b}_a`, `exp_${b}_b`, `exp_${b}_c`];
const ROLE_PROPS: Record<string, [string, boolean][]> = {
  combat: [['d_crate', true], ['d_barrel', true], ['d_rubble', true], ['d_urn', true], ['d_skull', false]],
  key: [['d_statue', true], ['d_rack', true], ['d_candles', false]],
  puzzle: [['d_bookshelf', true], ['d_table', true], ['d_candles', false]],
  treasure: [['d_sarcophagus', true], ['d_candles', false], ['d_mushroom_glow', false], ['d_crate', true]],
  prep: [['d_candles', false], ['d_table', true], ['d_rack', true]],
};
const NODE_OF: Record<BiomeId, string> = { gruenwald: 'herb', kristall: 'crystal', glut: 'ember', frost: 'frost', ruinen: 'rune', schatten: 'void' };
const RUNE_NAMES = ['Blatt', 'Wurzel', 'Dorn', 'Blüte'];
export const RUNE_SYMBOLS = ['❦', '⚘', '✶', '❀'];

// =====================================================================================================================
//  1. Anordnen
// =====================================================================================================================
function flatten(x: ExpeditionDef): Node[] {
  const out: Node[] = [];
  x.sections.forEach((s, k) => out.push({ def: s, idx: out.length, main: true, order: k, parent: k === 0 ? -1 : out.findIndex(n => n.main && n.order === k - 1), via: s.via ?? 'gate', secret: false, optional: false, w: 0, h: 0, x0: 0, y0: 0, dir: 'n' }));
  const mains = out.length;
  for (let i = 0; i < mains; i++) {
    const s = out[i].def;
    for (const w of s.side ?? []) out.push({ def: w, idx: out.length, main: false, order: out[i].order, parent: i, via: w.via ?? 'gate', secret: false, optional: true, w: 0, h: 0, x0: 0, y0: 0, dir: 'n' });
    if (s.secret) out.push({ def: s.secret, idx: out.length, main: false, order: out[i].order, parent: i, via: 'secret', secret: true, optional: true, w: 0, h: 0, x0: 0, y0: 0, dir: 'n' });
  }
  return out;
}

function layout(x: ExpeditionDef, rng: Rng): { nodes: Node[]; links: Link[] } {
  for (let attempt = 0; attempt < 400; attempt++) {
    const nodes = flatten(x), links: Link[] = [], boxes: Box[] = [];
    const hit = (b: Box, m: number, skip: number[]) => boxes.some(o => !skip.includes(o.owner) && b.x0 - m <= o.x1 && b.x1 + m >= o.x0 && b.y0 - m <= o.y1 && b.y1 + m >= o.y0);
    let ok = true;
    for (const n of nodes) {
      const shape = n.def.role === 'reward' ? 'chamber' : n.def.shape, sz = SIZE[shape];
      const bw = rng.int(sz[0], sz[1]), bh = rng.int(sz[2], sz[3]);
      if (n.parent < 0) { n.w = 12; n.h = 10; n.x0 = 0; n.y0 = 0; boxes.push({ x0: 0, y0: 0, x1: 11, y1: 9, owner: n.idx }); continue; }
      const A = nodes[n.parent];
      const prevDir = A.parent >= 0 ? A.dir : 'n'; // vom Eingang nie nach Süden: dort liegt der Ausgang
      const dirs: [Dir, number][] = n.main
        ? ([['n', 3], ['e', 2], ['w', 2], ['s', 0.7]] as [Dir, number][]).filter(([d]) => d !== OPP[prevDir])
        : ([['n', 1], ['e', 1], ['w', 1], ['s', 1]] as [Dir, number][]).filter(([d]) => d !== OPP[A.dir] || A.parent < 0);
      const boss = n.def.role === 'boss', reward = n.def.role === 'reward';
      const kind: Transition = n.via;
      const width = narrow(kind, boss || reward) ? 2 : 3;
      let placed = false;
      for (let tries = 0; tries < 40 && !placed; tries++) {
        const dir = rng.weighted(dirs);
        const vert = dir === 'n' || dir === 's';
        const w = shape === 'corridor' && !vert ? bh : bw, h = shape === 'corridor' && !vert ? bw : bh;
        const L = rng.int(TLEN[kind][0], TLEN[kind][1]);
        const ax0 = A.x0, ay0 = A.y0, ax1 = A.x0 + A.w - 1, ay1 = A.y0 + A.h - 1;
        let bx0: number, by0: number;
        const need = width + 3;
        if (vert) { bx0 = rng.int(ax0 - w + need, ax1 - need + 1); by0 = dir === 'n' ? ay0 - L - h : ay1 + L + 1; }
        else { by0 = rng.int(ay0 - h + need, ay1 - need + 1); bx0 = dir === 'w' ? ax0 - L - w : ax1 + L + 1; }
        const B: Box = { x0: bx0, y0: by0, x1: bx0 + w - 1, y1: by0 + h - 1, owner: n.idx };
        // Gang: auf der Querachse innerhalb beider Rechtecke
        const lo = vert ? Math.max(ax0, B.x0) + 2 : Math.max(ay0, B.y0) + 2, hi = vert ? Math.min(ax1, B.x1) - 2 - (width - 1) : Math.min(ay1, B.y1) - 2 - (width - 1);
        if (hi < lo) continue;
        const c = lo + Math.floor((hi - lo) / 2) + (hi > lo ? rng.int(-Math.min(2, Math.floor((hi - lo) / 2)), Math.min(2, Math.floor((hi - lo) / 2))) : 0);
        const from = vert ? (dir === 'n' ? B.y1 + 1 : ay1 + 1) : (dir === 'w' ? B.x1 + 1 : ax1 + 1);
        const to = vert ? (dir === 'n' ? ay0 - 1 : B.y0 - 1) : (dir === 'w' ? ax0 - 1 : B.x0 - 1);
        const side = kind === 'bridge' ? 2 : 0;
        const C: Box = vert ? { x0: c - side, y0: from, x1: c + width - 1 + side, y1: to, owner: -1 - n.idx } : { x0: from, y0: c - side, x1: to, y1: c + width - 1 + side, owner: -1 - n.idx };
        if (hit(B, 3, []) || hit(C, 2, [n.parent, n.idx])) continue;
        n.w = w; n.h = h; n.x0 = B.x0; n.y0 = B.y0; n.dir = dir;
        boxes.push(B, C);
        const l: Link = { a: n.parent, b: n.idx, dir, c, from, to, width, kind, boss, reward };
        n.link = l; links.push(l);
        placed = true;
      }
      if (!placed) { ok = false; break; }
    }
    if (ok) return { nodes, links };
  }
  throw new Error('Expedition ' + x.id + ': Abschnitte lassen sich nicht anordnen');
}

// =====================================================================================================================
//  2.–3. Graben und Füllen
// =====================================================================================================================
export function genExpedition(def: ZoneDef): GameMap {
  const x = EXPEDITIONS[def.exp!];
  const rng = new Rng(def.seed);
  const { nodes, links } = layout(x, rng);
  // Koordinaten verschieben: alles beginnt bei (4, 4)
  let mx = 1e9, my = 1e9, Mx = -1e9, My = -1e9;
  const grow = (a: number, b: number, c: number, d: number) => { mx = Math.min(mx, a); my = Math.min(my, b); Mx = Math.max(Mx, c); My = Math.max(My, d); };
  for (const n of nodes) grow(n.x0, n.y0, n.x0 + n.w - 1, n.y0 + n.h - 1);
  for (const l of links) { const vert = l.dir === 'n' || l.dir === 's'; if (vert) grow(l.c - 3, l.from, l.c + 5, l.to); else grow(l.from, l.c - 3, l.to, l.c + 5); }
  const ox = 4 - mx, oy = 4 - my;
  for (const n of nodes) { n.x0 += ox; n.y0 += oy; }
  for (const l of links) { const vert = l.dir === 'n' || l.dir === 's'; l.c += vert ? ox : oy; l.from += vert ? oy : ox; l.to += vert ? oy : ox; }
  const w = Mx - mx + 9, h = My - my + 9;
  const tiles = new Uint8Array(w * h), solid = new Uint8Array(w * h);
  const I = (xx: number, yy: number) => yy * w + xx;
  const inb = (xx: number, yy: number) => xx >= 1 && yy >= 1 && xx < w - 1 && yy < h - 1;
  /** Rückgrat: hier bleibt der Boden frei (nichts Solides, keine Flüssigkeit, keine Gefahr) */
  const spine = new Uint8Array(w * h);
  const used = new Set<number>();
  const secOf = new Int16Array(w * h).fill(-1);

  const rect = (n: Node) => ({ x0: n.x0, y0: n.y0, x1: n.x0 + n.w - 1, y1: n.y0 + n.h - 1 });
  const center = (n: Node): [number, number] => [n.x0 + (n.w >> 1), n.y0 + (n.h >> 1)];
  // ---- Formen
  for (const n of nodes) {
    const r = rect(n), [cx, cy] = center(n), shape = n.def.role === 'reward' ? 'chamber' : n.def.shape;
    for (let yy = r.y0; yy <= r.y1; yy++) for (let xx = r.x0; xx <= r.x1; xx++) {
      secOf[I(xx, yy)] = n.idx;
      if (shape === 'cavern' || shape === 'grotto') {
        const dx = (xx - cx) / (n.w / 2), dy = (yy - cy) / (n.h / 2), d = dx * dx + dy * dy;
        if (d < 0.8 + (noise2(xx, yy, 5, def.seed + n.idx * 7) - 0.5) * 0.55) tiles[I(xx, yy)] = T.FLOOR;
      } else tiles[I(xx, yy)] = T.FLOOR;
    }
  }
  // ---- Gänge
  const mouthsOf = new Map<number, ExpSection['mouths']>();
  const doorPts = new Map<number, [number, number][]>();
  const addMouth = (sec: number, cells: number[], mxp: number, myp: number, orient: 'h' | 'v') => { const a = mouthsOf.get(sec) ?? []; a.push({ cells, x: mxp, y: myp, orient }); mouthsOf.set(sec, a); };
  const corridorCells = new Map<Link, number[]>();
  for (const l of links) {
    const vert = l.dir === 'n' || l.dir === 's', cells: number[] = [];
    for (let t = l.from; t <= l.to; t++) for (let k = 0; k < l.width; k++) {
      const xx = vert ? l.c + k : t, yy = vert ? t : l.c + k;
      tiles[I(xx, yy)] = l.kind === 'bridge' ? T.BRIDGE : T.FLOOR; spine[I(xx, yy)] = 1; cells.push(I(xx, yy));
      if (l.kind === 'bridge') for (const s of [-2, -1, l.width, l.width + 1]) { const sx = vert ? l.c + s : t, sy = vert ? t : l.c + s; if (tiles[I(sx, sy)] === T.VOID) tiles[I(sx, sy)] = T.LIQUID; }
    }
    corridorCells.set(l, cells);
    // Mündungen: die Querreihe direkt an jedem der beiden Abschnitte
    const atA = l.dir === 'n' || l.dir === 'w' ? l.to : l.from, atB = l.dir === 'n' || l.dir === 'w' ? l.from : l.to;
    for (const [sec, t] of [[l.a, atA], [l.b, atB]] as const) {
      const cs: number[] = [];
      for (let k = 0; k < l.width; k++) cs.push(vert ? I(l.c + k, t) : I(t, l.c + k));
      const mxp = vert ? (l.c + (l.width - 1) / 2) * TILE + 8 : t * TILE + 8, myp = vert ? t * TILE + 8 : (l.c + (l.width - 1) / 2) * TILE + 8;
      addMouth(sec, cs, mxp, myp, vert ? 'v' : 'h');
      // Zugangspunkt im Abschnitt (für das Rückgrat)
      const step = sec === l.a ? (l.dir === 'n' || l.dir === 'w' ? 1 : -1) : (l.dir === 'n' || l.dir === 'w' ? -1 : 1);
      const dp: [number, number] = vert ? [l.c + (l.width >> 1), t + step] : [t + step, l.c + (l.width >> 1)];
      const a = doorPts.get(sec) ?? []; a.push(dp); doorPts.set(sec, a);
    }
  }
  // ---- Rückgrat je Abschnitt: von jedem Zugang zur Mitte (3 breit), dazu die Mitte selbst
  for (const n of nodes) {
    const [cx, cy] = center(n), r = rect(n);
    const mark = (xx: number, yy: number) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = xx + dx, Y = yy + dy; if (X >= r.x0 && Y >= r.y0 && X <= r.x1 && Y <= r.y1) { tiles[I(X, Y)] = T.FLOOR; spine[I(X, Y)] = 1; } } };
    mark(cx, cy);
    for (const [dx0, dy0] of doorPts.get(n.idx) ?? []) {
      let xx = dx0, yy = dy0;
      const onH = dy0 === r.y0 || dy0 === r.y1; // Zugang in der Ober-/Unterkante: erst senkrecht, dann waagerecht
      for (let g = 0; g < 400; g++) {
        mark(xx, yy);
        if (xx === cx && yy === cy) break;
        if (onH ? yy !== cy : xx === cx) yy += Math.sign(cy - yy); else xx += Math.sign(cx - xx);
      }
    }
    // unerreichbare Taschen der organischen Formen schließen
    if (n.def.shape === 'cavern' || n.def.shape === 'grotto') {
      const seen = new Uint8Array(w * h), q = [I(cx, cy)]; seen[q[0]] = 1;
      while (q.length) { const i = q.pop()!; for (const nb of [i - 1, i + 1, i - w, i + w]) if (!seen[nb] && secOf[nb] === n.idx && tiles[nb] !== T.VOID) { seen[nb] = 1; q.push(nb); } }
      for (let yy = r.y0; yy <= r.y1; yy++) for (let xx = r.x0; xx <= r.x1; xx++) if (!seen[I(xx, yy)]) tiles[I(xx, yy)] = T.VOID;
    }
  }
  // ---- Wände
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    if (tiles[I(xx, yy)] !== T.VOID) continue;
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
      const X = xx + dx, Y = yy + dy;
      if (X >= 0 && Y >= 0 && X < w && Y < h && tiles[I(X, Y)] !== T.VOID && tiles[I(X, Y)] !== T.WALL) { near = true; break; }
    }
    if (near) tiles[I(xx, yy)] = T.WALL;
  }

  // ---- Füllen
  const objects: ObjSpawn[] = [], decor: DecorSpawn[] = [], spawns: MobSpawn[] = [];
  let oid = 1, group = 1;
  const addObj = (type: string, tx: number, ty: number, tag?: string, props?: Record<string, any>) => { const o: ObjSpawn = { id: oid++, type, x: px(tx), y: px(ty), tag, props }; objects.push(o); return o; };
  const floorish = (t: number) => t === T.FLOOR;
  const free = (xx: number, yy: number) => inb(xx, yy) && floorish(tiles[I(xx, yy)]) && !used.has(I(xx, yy)) && !solid[I(xx, yy)];
  const offSpine = (xx: number, yy: number) => free(xx, yy) && !spine[I(xx, yy)];
  /** Platz für Solides: frei, nicht auf dem Rückgrat, und kein Nachbar ist Rückgrat (Durchgänge bleiben breit) */
  const roomy = (xx: number, yy: number) => { if (!offSpine(xx, yy)) return false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (spine[I(xx + dx, yy + dy)] && (dx || dy) && Math.abs(dx) + Math.abs(dy) === 1) return false; return true; };
  const take = (xx: number, yy: number) => used.add(I(xx, yy));
  const solidAt = (xx: number, yy: number) => { solid[I(xx, yy)] = 1; take(xx, yy); };
  const spot = (n: Node, ok: (xx: number, yy: number) => boolean, tries = 80, pad = 1): [number, number] | null => {
    const r = rect(n);
    for (let k = 0; k < tries; k++) { const xx = rng.int(r.x0 + pad, r.x1 - pad), yy = rng.int(r.y0 + pad, r.y1 - pad); if (ok(xx, yy)) return [xx, yy]; }
    return null;
  };
  const nearSpot = (cx: number, cy: number, ok: (xx: number, yy: number) => boolean, maxR = 8): [number, number] | null => {
    for (let r = 0; r <= maxR; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && ok(cx + dx, cy + dy)) return [cx + dx, cy + dy];
    return null;
  };
  const mainCount = x.sections.length;
  const levelAt = (n: Node) => Math.round(x.level[0] + (x.level[1] - x.level[0]) * Math.min(1, n.order / Math.max(1, mainCount - 3)));
  const entryOf = (n: Node): [number, number] => { const d = doorPts.get(n.idx)?.[0]; return d ?? center(n); };
  const dressSet = (n: Node) => DRESS[x.region][n.def.look ?? 0];
  let mainGroups = 0, allGroups = 0;

  const addGroup = (n: Node, size: number, elite: boolean, anchor?: [number, number]) => {
    const [ex, ey] = entryOf(n);
    const a = anchor ?? spot(n, (xx, yy) => free(xx, yy) && Math.hypot(xx - ex, yy - ey) >= 6 && !spawns.some(s => s.group !== group && Math.hypot(s.x / TILE - xx, s.y / TILE - yy) < 5), 120, 2)
      ?? spot(n, free, 120, 1);
    if (!a) return;
    const lvl = levelAt(n), mix = x.mobs[n.def.look ?? 0];
    for (let k = 0; k < size; k++) {
      const c = k === 0 ? a : nearSpot(a[0] + rng.int(-2, 2), a[1] + rng.int(-2, 2), (xx, yy) => free(xx, yy) && !spawns.some(s => Math.abs(s.x - px(xx)) < 8 && Math.abs(s.y - px(yy)) < 8), 3);
      if (!c) continue;
      spawns.push({ mob: rng.weighted(mix), x: px(c[0]), y: px(c[1]), lvl, group, elite: elite && k === 0 });
    }
    group++; allGroups++; if (n.main) mainGroups++;
  };
  const chest = (n: Node, tier: string, props: Record<string, any> = {}, at?: [number, number]) => {
    const c = at && free(at[0], at[1]) ? at : spot(n, roomy, 120, 1) ?? spot(n, offSpine, 120, 1);
    if (!c) return null;
    solidAt(c[0], c[1]);
    return addObj('chest', c[0], c[1], undefined, { tier, ...props });
  };
  const dress = (n: Node, count: number) => {
    const list = [...dressSet(n), ...(ROLE_PROPS[n.def.role] ?? ROLE_PROPS.combat)];
    for (let k = 0; k < count; k++) {
      const c = spot(n, roomy, 30, 0);
      if (!c) continue;
      const [f, sol] = rng.pick(list);
      if (sol) { decor.push({ f, x: px(c[0]), y: c[1] * TILE + TILE - 2 }); solidAt(c[0], c[1]); }
      else { decor.push({ f, x: px(c[0]), y: c[1] * TILE + 12 }); take(c[0], c[1]); }
    }
    // Kunst-Requisiten der Region (fehlen sie im Atlas, zeichnet der Client einen vorhandenen Frame)
    if (n.def.role !== 'boss' && n.def.role !== 'reward' && hash2(n.idx, 3, def.seed) < 0.75) {
      const c = spot(n, roomy, 30, 1);
      if (c) { decor.push({ f: rng.pick(PROPS(x.region)), x: px(c[0]), y: c[1] * TILE + TILE - 2 }); solidAt(c[0], c[1]); }
    }
    // Wandschmuck
    const r = rect(n);
    for (let xx = r.x0 + 1, k = n.idx; xx <= r.x1 - 1; xx++, k++) {
      if (tiles[I(xx, r.y0 - 1)] !== T.WALL || !floorish(tiles[I(xx, r.y0)])) continue;
      const m = (xx - r.x0) % 5;
      if (m === 1) decor.push({ f: 'wall_torch', x: px(xx), y: r.y0 * TILE - 3 });
      else if (m === 3 && hash2(xx, r.y0, def.seed) < 0.5) decor.push({ f: x.region === 'gruenwald' ? 'd_roots' : hash2(xx, 9, def.seed) < 0.5 ? 'd_banner' : 'd_chains', x: px(xx), y: r.y0 * TILE - 3 + (x.region === 'gruenwald' ? 6 : 0) });
    }
    for (let k = rng.int(3, 6); k > 0; k--) {
      const c = spot(n, (xx, yy) => floorish(tiles[I(xx, yy)]), 10, 0);
      if (c) decor.push({ f: rng.pick(['d_crack', 'd_crack', 'd_moss', 'd_puddle', 'd_bones', 'd_grate']), x: px(c[0]) + rng.int(-4, 4), y: c[1] * TILE + 12 + rng.int(-3, 3) });
    }
  };

  const sections: ExpSection[] = [];
  const info: ExpMapInfo = { id: x.id, sections, minis: [], puzzles: [], events: [], checkpoint: null, reward: { x: 0, y: 0 }, secrets: [], groups: 0 };
  let start = { x: 0, y: 0 };
  let bossRoom: Room | undefined;
  const rooms: Room[] = [];
  const ROLE_ROOM: Record<string, string> = { entrance: 'entrance', explore: 'treasure', combat: 'combat', elite: 'combat', event: 'combat', mini: 'combat', trap: 'trap', puzzle: 'puzzle', key: 'key', prep: 'prep', boss: 'boss', reward: 'reward', treasure: 'secret' };

  // Übergänge: Türen, Tore, geheime Wände, Treppen
  for (const l of links) {
    const vert = l.dir === 'n' || l.dir === 's', B = nodes[l.b];
    const mid = Math.round((l.from + l.to) / 2);
    const cells: number[] = [];
    const at = l.kind === 'secret' ? (l.dir === 'n' || l.dir === 'w' ? l.to : l.from) : mid; // die geheime Wand sitzt in der Mauerflucht des Abzweigs
    for (let k = 0; k < l.width; k++) cells.push(vert ? I(l.c + k, at) : I(at, l.c + k));
    const ox2 = vert ? l.c + (l.width > 2 ? 1 : 1) : at, oy2 = vert ? at : l.c + (l.width > 2 ? 1 : 1);
    const orient = vert ? 'v' : 'h';
    if (l.boss) addObj('bossdoor', ox2, oy2, 'bossdoor', { cells, orient });
    else if (l.reward) addObj('door', ox2, oy2, 'reward', { cells, orient, seal: 'boss' });
    else if (l.kind === 'secret') { addObj('boulder', ox2, oy2, 'secret', { cells, orient, look: 'secret_wall', sec: B.def.id }); info.secrets.push(B.def.id); }
    else if (l.kind === 'locked') addObj('door', ox2, oy2, 'locked', { cells, orient, locked: true });
    else if (l.kind === 'gate') addObj('door', ox2, oy2, 'gate', { cells, orient });
    else if (l.kind === 'stairs') { decor.push({ f: 'stairs_down', x: vert ? px(l.c) + (l.width - 1) * 8 : px(mid), y: (vert ? mid : l.c + 1) * TILE + 14 }); }
    for (const c of cells) used.add(c);
    // Rätselsiegel: der Ausgang eines Rätselabschnitts öffnet sich erst, wenn das Rätsel gelöst ist
    const A = nodes[l.a];
    if (A.def.role === 'puzzle' && B.main && !l.boss) {
      if (l.kind === 'stairs' || l.kind === 'bridge' || l.kind === 'tunnel') addObj('door', ox2, oy2, 'sealed', { cells, orient, seal: 'pz:' + A.def.id });
      else { const d = objects[objects.length - 1]; if (d && d.type === 'door') d.props!.seal = 'pz:' + A.def.id; }
    }
  }

  for (const n of nodes) {
    const r = rect(n), [cx, cy] = center(n), role = n.def.role;
    const room: Room = { id: rooms.length + 1, role: ROLE_ROOM[role] ?? 'combat', x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1, cx, cy, depth: n.order };
    rooms.push(room);
    const [ex, ey] = entryOf(n);
    sections.push({ id: n.def.id, name: n.def.name, role, shape: n.def.shape, x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1, cx, cy, order: n.order, main: n.main, secret: n.secret, optional: n.optional,
      look: n.def.look ?? 0, mouths: mouthsOf.get(n.idx) ?? [], entry: { x: px(ex), y: px(ey) } });
    // ---- Formdetails
    if (n.def.shape === 'hall' || n.def.shape === 'arena') {
      // Säulen im Raster abseits des Rückgrats
      const stepX = 6, stepY = 5;
      if (role !== 'boss') for (let yy = r.y0 + 3; yy <= r.y1 - 3; yy += stepY) for (let xx = r.x0 + 4; xx <= r.x1 - 4; xx += stepX) if (roomy(xx, yy) && roomy(xx + 1, yy)) { tiles[I(xx, yy)] = T.WALL; tiles[I(xx + 1, yy)] = T.WALL; take(xx, yy); take(xx + 1, yy); }
    }
    if (n.def.shape === 'grotto') {
      // Teiche (Wasser/Lava/Leere je Biom) abseits des Rückgrats
      for (let k = 0; k < 3; k++) {
        const c = spot(n, (xx, yy) => roomy(xx, yy) && roomy(xx + 2, yy + 1), 60, 3);
        if (!c) continue;
        const rx = rng.int(2, 3), ry = rng.int(1, 2);
        for (let yy = c[1] - ry; yy <= c[1] + ry; yy++) for (let xx = c[0] - rx; xx <= c[0] + rx; xx++) if ((xx - c[0]) ** 2 / (rx * rx) + (yy - c[1]) ** 2 / (ry * ry) <= 1 && roomy(xx, yy)) { tiles[I(xx, yy)] = T.LIQUID; take(xx, yy); }
      }
    }
    if (n.def.shape === 'cavern') {
      for (let k = 0; k < 4; k++) { const c = spot(n, roomy, 40, 2); if (c) { tiles[I(c[0], c[1])] = T.WALL; take(c[0], c[1]); } }
    }
    // ---- Inhalt nach Rolle
    switch (role) {
      case 'entrance': {
        start = { x: px(cx), y: px(cy) };
        const sx = cx, sy = r.y1;
        addObj('exit', sx, sy, 'out', { to: x.parent, look: 'stairs_up', label: ZONES[x.parent]?.name ?? '', r: 12 });
        take(sx, sy); take(sx - 1, sy); take(sx + 1, sy);
        start = { x: px(cx), y: px(cy - 1) };
        const s = nearSpot(cx + 3, cy - 2, roomy) ?? [cx + 2, cy - 2];
        addObj('sign', s[0], s[1], 'intro', { text: x.intro }); solidAt(s[0], s[1]);
        break;
      }
      case 'prep': {
        const c = nearSpot(cx + 2, cy - 1, roomy) ?? [cx + 2, cy - 1];
        addObj('xobj', c[0], c[1], 'checkpoint', { kind: 'checkpoint', frame: 'checkpoint', label: 'Rastplatz', prompt: 'Rasten', light: [80, 0x70ffe8, 0.8] });
        solidAt(c[0], c[1]);
        info.checkpoint = { x: px(cx), y: px(cy + 1) };
        break;
      }
      case 'boss': {
        bossRoom = room;
        arenaLayout(x.arena, n, r, cx, cy);
        break;
      }
      case 'reward': {
        info.reward = { x: px(cx), y: px(cy) };
        addObj('xobj', cx, cy - 2, 'altar', { kind: 'altar', frame: 'reward_altar', label: 'Altar der Rückkehr', prompt: 'Statistik ansehen', light: [90, 0xffe0a0, 0.8] });
        solidAt(cx, cy - 2); take(cx, cy); take(cx, cy + 2); take(cx - 3, cy - 2); take(cx + 3, cy - 2);
        break;
      }
      case 'key': chest(n, 'silver', { key: true, guard: group }, [cx + 1, cy - 2]); break;
      case 'treasure': {
        chest(n, 'gold', {}, [cx, cy - 2]);
        if (n.def.cache) chest(n, 'silver', { cache: true });
        break;
      }
      case 'puzzle': puzzle(n, r, cx, cy); break;
      case 'trap': traps(n, r); break;
      case 'mini': {
        info.minis.push({ mini: n.def.mini!, x: px(cx), y: px(cy), sec: n.def.id, optional: n.optional });
        take(cx, cy);
        break;
      }
      case 'event': info.events.push({ kind: n.def.event!, sec: n.def.id }); break;
    }
    // Gegner
    const sizeOf = () => (n.def.shape === 'corridor' ? rng.int(3, 4) : n.def.shape === 'chamber' ? rng.int(3, 4) : rng.int(4, 5));
    const nG = Math.round((n.def.groups ?? 0) * (role === 'mini' || role === 'puzzle' || role === 'key' ? 1 : EXP_CFG.groupMul));
    for (let k = 0; k < nG; k++) addGroup(n, sizeOf(), k < (n.def.elites ?? 0));
    // Truhen in Kampfabschnitten
    if ((role === 'combat' || role === 'elite' || role === 'explore') && hash2(n.idx, 5, def.seed) < (role === 'elite' ? 1 : 0.55)) chest(n, role === 'elite' ? 'silver' : 'wood', role === 'elite' ? { guard: group - 1 } : {});
    if (role === 'mini') chest(n, 'gold', { mini: n.def.mini });
    // seltene Abbaustellen
    for (let k = 0; k < (n.def.nodes ?? 0); k++) { const c = spot(n, roomy, 60, 1); if (c) { addObj('node', c[0], c[1], undefined, { kind: NODE_OF[x.region], rare: k === 0 && n.def.role !== 'explore' ? 1 : hash2(c[0], c[1], def.seed) < 0.35 ? 1 : 0 }); solidAt(c[0], c[1]); } }
    // Spur zu einer geheimen Expedition
    if (n.def.discover) { const c = spot(n, roomy, 60, 1); if (c) { addObj('xobj', c[0], c[1], 'discover', { kind: 'discover', exp: n.def.discover, frame: 'rune_stone', label: 'Eine Spur', prompt: 'Die Spur untersuchen', light: [60, 0xffd890, 0.7] }); solidAt(c[0], c[1]); } }
    // Inschrift (Lore-Stelle)
    if (n.def.lore) { const c = spot(n, roomy, 60, 1); if (c) { addObj('sign', c[0], c[1], 'lore', { text: n.def.lore }); solidAt(c[0], c[1]); } }
    // Einrichtung
    if (role !== 'boss') dress(n, n.def.shape === 'hall' || n.def.shape === 'grotto' ? rng.int(8, 12) : n.def.shape === 'cavern' ? rng.int(6, 9) : rng.int(4, 7));
    if (role === 'boss') for (const [bx, by] of [[r.x0, r.y0], [r.x1, r.y0], [r.x0, r.y1], [r.x1, r.y1]]) if (free(bx, by) && !spine[I(bx, by)]) { decor.push({ f: 'brazier', x: px(bx), y: by * TILE + TILE - 2 }); solidAt(bx, by); }
  }
  info.groups = mainGroups;
  void allGroups;

  // ---------------------------------------------------------------- Arena je Region
  function arenaLayout(kind: ExpeditionDef['arena'], n: Node, r: { x0: number; y0: number; x1: number; y1: number }, cx: number, cy: number) {
    const quads: [number, number][] = [[r.x0 + 6, r.y0 + 5], [r.x1 - 6, r.y0 + 5], [r.x0 + 6, r.y1 - 5], [r.x1 - 6, r.y1 - 5]];
    const block = (bx: number, by: number, t: number) => { for (let yy = by; yy <= by + 1; yy++) for (let xx = bx; xx <= bx + 1; xx++) if (roomy(xx, yy) && Math.hypot(xx - cx, yy - cy) > 5) { tiles[I(xx, yy)] = t; take(xx, yy); } };
    const patch = (bx: number, by: number, rw: number, rh: number, t: number) => { for (let yy = by; yy < by + rh; yy++) for (let xx = bx; xx < bx + rw; xx++) if (roomy(xx, yy) && Math.hypot(xx - cx, yy - cy) > 6) { tiles[I(xx, yy)] = t; take(xx, yy); } };
    void n;
    switch (kind) {
      case 'roots': for (const [qx, qy] of quads) block(qx, qy, T.WALL); patch(r.x0 + 1, r.y0 + 1, 4, 3, T.HAZARD); patch(r.x1 - 4, r.y1 - 3, 4, 3, T.HAZARD); break;
      case 'crystals': for (const [qx, qy] of quads) block(qx, qy, T.WALL); break;
      case 'lava': patch(r.x0 + 2, cy - 1, 5, 2, T.LIQUID); patch(r.x1 - 6, cy - 1, 5, 2, T.LIQUID); patch(cx - 1, r.y0 + 1, 2, 3, T.LIQUID); break;
      case 'ice': patch(r.x0 + 2, r.y0 + 2, 5, 3, T.HAZARD); patch(r.x1 - 6, r.y1 - 4, 5, 3, T.HAZARD); for (const [qx, qy] of quads.slice(0, 2)) block(qx, qy, T.WALL); break;
      case 'grid': for (const [qx, qy] of quads) block(qx, qy, T.WALL); block(cx - 9, cy, T.WALL); block(cx + 8, cy, T.WALL); break;
      case 'void': patch(r.x0 + 1, r.y0 + 1, 3, 3, T.LIQUID); patch(r.x1 - 3, r.y0 + 1, 3, 3, T.LIQUID); patch(r.x0 + 1, r.y1 - 3, 3, 3, T.LIQUID); patch(r.x1 - 3, r.y1 - 3, 3, 3, T.LIQUID); break;
    }
  }
  // ---------------------------------------------------------------- Rätsel
  function puzzle(n: Node, r: { x0: number; y0: number; x1: number; y1: number }, cx: number, cy: number) {
    const kind = n.def.puzzle!, idx = info.puzzles.length;
    const pz: ExpPuzzle = { idx, kind, sec: n.def.id };
    const put = (type: string, xx: number, yy: number, props: Record<string, any>, sol = true) => { const c = nearSpot(xx, yy, sol ? roomy : offSpine, 3) ?? [xx, yy]; addObj(type, c[0], c[1], 'puzzle', { pz: idx, psec: n.def.id, ...props }); if (sol) solidAt(c[0], c[1]); else take(c[0], c[1]); return c; };
    let text = '';
    const W = Math.max(3, Math.min(5, (r.x1 - r.x0) >> 2)), H = Math.max(2, Math.min(3, (r.y1 - r.y0) >> 2));
    if (kind === 'torches') {
      const pos: [number, number, string][] = [[cx - W, cy - H, 'Nordwesten'], [cx + W, cy - H, 'Nordosten'], [cx - W, cy + H, 'Südwesten'], [cx + W, cy + H, 'Südosten']];
      const perm = rng.shuffle([0, 1, 2, 3]);
      pos.forEach(([xx, yy], k) => put('brazier', xx, yy, { idx: k }));
      pz.order = perm;
      text = `Steintafel: „Die Flamme wandert: erst nach ${pos[perm[0]][2]}, dann ${pos[perm[1]][2]}, dann ${pos[perm[2]][2]} – und sie ruht im ${pos[perm[3]][2]}.“`;
    } else if (kind === 'levers') {
      let bits: number[];
      do { bits = [0, 1, 2, 3].map(() => rng.int(0, 1)); } while (bits.every(b => b === 0));
      [cx - 4, cx - 2, cx + 2, cx + 4].forEach((xx, k) => put('lever', xx, r.y0 + 1, { idx: k }));
      pz.bits = bits;
      text = `Über dem Sockel leuchten vier Steine: ${bits.map(b => (b ? '◆' : '◇')).join(' ')} – „Hell heißt gezogen.“`;
    } else if (kind === 'plates') {
      const pos: [number, number][] = [[r.x0 + 1, r.y0 + 1], [r.x1 - 1, r.y0 + 1], [r.x0 + 1, r.y1 - 1], [r.x1 - 1, r.y1 - 1], [cx - 3, cy + 1]];
      pos.forEach(([xx, yy], k) => put('plate', xx, yy, { idx: k }, false));
      pz.count = 5; pz.time = 6.5;
      text = 'Steintafel: „Fünf Schritte, ein Atemzug. Wer trödelt, beginnt von vorn.“ (Alle Platten müssen gleichzeitig leuchten – allein oder gemeinsam.)';
    } else {
      // Runenscheiben (neu in 0.9): vier Steine, jeder zeigt eines von vier Zeichen; Benutzen dreht weiter. Das Bild steht an der Wand.
      let runes: number[];
      do { runes = [0, 1, 2, 3].map(() => rng.int(0, 3)); } while (runes.every(v => v === 0));
      const vert = (r.y1 - r.y0) > (r.x1 - r.x0);
      const pos: [number, number][] = vert ? [[cx - 2, cy - 4], [cx + 2, cy - 1], [cx - 2, cy + 2], [cx + 2, cy + 5]] : [[cx - 6, cy - 2], [cx - 2, cy + 2], [cx + 2, cy - 2], [cx + 6, cy + 2]];
      pos.forEach(([xx, yy], k) => put('xobj', xx, yy, { kind: 'rune', idx: k, frame: 'rune_stone', label: RUNE_SYMBOLS[0], prompt: 'Runenscheibe drehen' }));
      pz.runes = runes;
      text = `In die Brüstung geritzt, von links nach rechts: ${runes.map(v => `${RUNE_SYMBOLS[v]} ${RUNE_NAMES[v]}`).join(' · ')}. Darunter: „Wer die Brücke will, dreht die Steine, bis sie dasselbe sagen.“`;
    }
    info.puzzles.push(pz);
    const s = nearSpot(cx, cy - 2, roomy, 6) ?? [cx, cy - 2];
    addObj('sign', s[0], s[1], 'puzzle', { text }); solidAt(s[0], s[1]);
  }
  // ---------------------------------------------------------------- Fallen
  function traps(n: Node, r: { x0: number; y0: number; x1: number; y1: number }) {
    const vert = n.dir === 'n' || n.dir === 's';
    const kinds = n.def.traps ?? ['spikes'];
    const lvlT = n.def.shape === 'corridor' ? 4 : 5;
    if (kinds.includes('spikes')) {
      const rows = vert ? [r.y0 + 4, Math.round((r.y0 + r.y1) / 2), r.y1 - 4] : [r.x0 + 4, Math.round((r.x0 + r.x1) / 2), r.x1 - 4];
      rows.forEach((t, k) => {
        const cells: number[] = [];
        if (vert) for (let xx = r.x0; xx <= r.x1; xx++) { if (floorish(tiles[I(xx, t)]) && !used.has(I(xx, t))) { cells.push(I(xx, t)); take(xx, t); } }
        else for (let yy = r.y0; yy <= r.y1; yy++) { if (floorish(tiles[I(t, yy)]) && !used.has(I(t, yy))) { cells.push(I(t, yy)); take(t, yy); } }
        if (cells.length) addObj('spikes', vert ? Math.round((r.x0 + r.x1) / 2) : t, vert ? t : Math.round((r.y0 + r.y1) / 2), 'trap', { cells, period: 2.8, offset: k * 0.9 });
      });
    }
    if (kinds.includes('turrets')) {
      for (let k = 0; k < 2; k++) {
        const t = vert ? r.y0 + 2 + Math.round(((r.y1 - r.y0 - 4) * (k + 0.5)) / 2) : r.x0 + 2 + Math.round(((r.x1 - r.x0 - 4) * (k + 0.5)) / 2);
        const [tx, ty] = vert ? [k ? r.x1 : r.x0, t] : [t, k ? r.y1 : r.y0];
        if (!free(tx, ty) || spine[I(tx, ty)]) continue;
        addObj('turret', tx, ty, 'trap', { dir: vert ? (k ? Math.PI : 0) : (k ? -Math.PI / 2 : Math.PI / 2), period: 2.6, offset: k * 1.3 }); solidAt(tx, ty);
      }
    }
    if (kinds.includes('poison')) for (let k = 0; k < 4; k++) {
      const c = spot(n, (xx, yy) => roomy(xx, yy) && roomy(xx + 1, yy + 1), 60, 1);
      if (c) for (let yy = c[1]; yy <= c[1] + 1; yy++) for (let xx = c[0]; xx <= c[0] + 1; xx++) if (roomy(xx, yy)) { tiles[I(xx, yy)] = T.HAZARD; take(xx, yy); }
    }
    if (kinds.includes('collapse')) {
      // brüchiger Boden quer über den Weg: bricht ein, wenn jemand darauf stehen bleibt
      const t = vert ? Math.round((r.y0 + r.y1) / 2) + 2 : Math.round((r.x0 + r.x1) / 2) + 2;
      const cells: number[] = [];
      for (let k = 0; k < 2; k++) {
        if (vert) for (let xx = r.x0; xx <= r.x1; xx++) { if (floorish(tiles[I(xx, t + k)]) && !used.has(I(xx, t + k))) { cells.push(I(xx, t + k)); take(xx, t + k); } }
        else for (let yy = r.y0; yy <= r.y1; yy++) { if (floorish(tiles[I(t + k, yy)]) && !used.has(I(t + k, yy))) { cells.push(I(t + k, yy)); take(t + k, yy); } }
      }
      if (cells.length) addObj('xobj', vert ? Math.round((r.x0 + r.x1) / 2) : t, vert ? t : Math.round((r.y0 + r.y1) / 2), 'collapse', { kind: 'collapse', cells, frame: 'collapse_floor_0', flat: 1 });
    }
    void lvlT;
  }

  finishSolid(tiles, solid);
  // eingeschlossene Objekte freiräumen: Einrichtung, die einen Zugang versperrt, fällt weg (Türen gelten als offen)
  for (let pass = 0; pass < 3; pass++) {
    const r = new Uint8Array(w * h), q = [I(Math.floor(start.x / TILE), Math.floor(start.y / TILE))]; r[q[0]] = 1;
    while (q.length) { const i = q.pop()!; for (const n of [i - 1, i + 1, i - w, i + w]) if (!r[n] && !solid[n]) { r[n] = 1; q.push(n); } }
    let fixed = 0;
    for (const o of [...objects, ...spawns.map(m => ({ x: m.x, y: m.y }))]) {
      const tx = Math.floor(o.x / TILE), ty = Math.floor(o.y / TILE);
      let ok = false;
      for (let dy = -1; dy <= 1 && !ok; dy++) for (let dx = -1; dx <= 1; dx++) if (r[I(tx + dx, ty + dy)]) { ok = true; break; }
      if (ok) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const X = tx + dx, Y = ty + dy, i = I(X, Y);
        if (solid[i] !== 1 || tiles[i] !== T.FLOOR || (dx === 0 && dy === 0)) continue;
        if (objects.some(ob => Math.floor(ob.x / TILE) === X && Math.floor(ob.y / TILE) === Y)) continue;
        solid[i] = 0; fixed++;
        for (let k = decor.length - 1; k >= 0; k--) if (Math.floor(decor[k].x / TILE) === X && Math.floor((decor[k].y - 2) / TILE) === Y) decor.splice(k, 1);
      }
    }
    if (!fixed) break;
  }
  const labels = sections.filter(s => s.main && s.role !== 'entrance').map(s => ({ x: px(s.cx), y: px(s.y0) + 4, name: s.name }));
  const entries: GameMap['entries'] = { [x.parent]: start };
  const map: GameMap = { id: def.id, def, w, h, tiles, solid, biome: def.biome, dungeon: true, seed: def.seed, decor, objects, spawns, rooms, start, entries, safe: [{ x: start.x, y: start.y, r: 80 }], bossRoom, labels, exp: info };
  placeStory(map, x.legacy); // Chronik-Dokumente des alten Dungeons wandern hierher
  return map;
}
function finishSolid(tiles: Uint8Array, solid: Uint8Array) {
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    if (t === T.WALL || t === T.VOID) solid[i] = 2;
    else if (t === T.LIQUID) solid[i] = Math.max(solid[i], 1);
  }
}

// =====================================================================================================================
//  4. Prüfen
// =====================================================================================================================
/**
 * Ist die Expedition spielbar? Simuliert den Fortschritt: Tore öffnen sich, sobald man davorsteht, verschlossene Türen,
 * sobald die Schlüsseltruhe erreichbar ist, versiegelte, sobald alle Rätselteile erreichbar sind, die Arena-Tür vor der
 * Arena, die Belohnungstür nach der Arena. Geheime Wände bleiben dabei zu – Schatzkammern dürfen nur durch sie erreichbar sein.
 */
export function validateExpedition(m: GameMap): string[] {
  const errs: string[] = [];
  const info = m.exp;
  if (!info) return ['keine Expeditionskarte'];
  const w = m.w;
  const blockers = m.objects.filter(o => o.type === 'door' || o.type === 'bossdoor' || o.type === 'boulder');
  const open = new Set<number>();
  const reachFrom = (opened: Set<number>) => {
    const blocked = new Set<number>();
    for (const o of blockers) if (!opened.has(o.id)) for (const c of (o.props?.cells ?? []) as number[]) blocked.add(c);
    const r = new Uint8Array(m.w * m.h);
    const s = Math.floor(m.start.y / TILE) * w + Math.floor(m.start.x / TILE);
    const q = [s]; r[s] = 1;
    while (q.length) { const i = q.pop()!; for (const n of [i - 1, i + 1, i - w, i + w]) if (n >= 0 && n < r.length && !r[n] && !m.solid[n] && !blocked.has(n)) { r[n] = 1; q.push(n); } }
    return r;
  };
  const near = (r: Uint8Array, x: number, y: number) => {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (r[(ty + dy) * w + tx + dx]) return true;
    return false;
  };
  const mouthReached = (r: Uint8Array, o: (typeof blockers)[number]) => ((o.props?.cells ?? []) as number[]).some(c => r[c - 1] || r[c + 1] || r[c - w] || r[c + w]);
  let r = reachFrom(open);
  for (let guard = 0; guard < 200; guard++) {
    let changed = false;
    const keyOk = m.objects.some(o => o.type === 'chest' && o.props?.key && near(r, o.x, o.y));
    const arena = m.bossRoom;
    const arenaReached = !!arena && r[arena.cy * w + arena.cx] === 1;
    for (const o of blockers) {
      if (open.has(o.id) || !mouthReached(r, o)) continue;
      const pr = o.props ?? {};
      let can = false;
      if (o.type === 'boulder') can = false;
      else if (o.type === 'bossdoor') can = true;
      else if (pr.seal === 'boss') can = arenaReached;
      else if (typeof pr.seal === 'string' && pr.seal.startsWith('pz:')) { const pz = m.objects.filter(p => p.tag === 'puzzle' && p.props?.psec === pr.seal.slice(3)); can = pz.length > 0 && pz.every(p => near(r, p.x, p.y)); }
      else if (pr.locked) can = keyOk;
      else can = true;
      if (can) { open.add(o.id); changed = true; }
    }
    if (!changed) break;
    r = reachFrom(open);
  }
  for (const s of info.sections) {
    const reached = r[s.cy * w + s.cx] === 1;
    if (s.secret && reached) errs.push(`Schatzkammer ${s.id} ohne geheime Wand erreichbar`);
    if (!s.secret && !reached) errs.push(`Abschnitt ${s.id} nicht erreichbar`);
  }
  if (!m.bossRoom || !r[m.bossRoom.cy * w + m.bossRoom.cx]) errs.push('Arena nicht erreichbar');
  if (!near(r, info.reward.x, info.reward.y)) errs.push('Belohnungskammer nicht erreichbar');
  // mit offenen geheimen Wänden: alles erreichbar
  for (const o of blockers) if (o.type === 'boulder') open.add(o.id);
  const all = reachFrom(open);
  for (const s of info.sections) if (!all[s.cy * w + s.cx]) errs.push(`Abschnitt ${s.id} auch mit offenen Wänden nicht erreichbar`);
  for (const o of m.objects) if (!near(all, o.x, o.y) && o.type !== 'exit') errs.push(`Objekt ${o.type}#${o.id} (${o.tag ?? ''}) unerreichbar`);
  for (const s of m.spawns) if (!near(all, s.x, s.y)) errs.push(`Spawn ${s.mob} unerreichbar`);
  for (const mi of info.minis) if (!near(all, mi.x, mi.y)) errs.push(`Mini-Boss ${mi.mini} unerreichbar`);
  if (info.puzzles.length === 0 && EXPEDITIONS[info.id]?.sections.some(s => s.puzzle)) errs.push('Rätsel fehlt');
  for (const mi of info.minis) if (!MINIS[mi.mini]) errs.push('unbekannter Mini-Boss ' + mi.mini);
  return errs;
}
