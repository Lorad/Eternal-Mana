/**
 * Vorschau für die Objektmodule "gruenwald" und "common":
 *   /preview-objects.html?view=sheet|scenes|all &only=<teilstring> &anim=1 &scale=<n> &scene=<id> &sc=2|3
 */
import { Px } from './draw';
import { gruenwaldObjects } from './objects/gruenwald';
import { commonObjects } from './objects/common';
import { PET_IDS } from './objects/cm_pets';
import { checkFrames } from './objects/kit';
import type { PaintableMap, Sheet } from './spec';
import { T } from '../../../shared/src/maps/tiles';
import type { BiomeId } from '../../../shared/src/maps/tiles';

const q = new URLSearchParams(location.search);
const view = q.get('view') ?? 'all', only = q.get('only'), animate = q.get('anim') === '1', SC = Number(q.get('scale') ?? 3);
const onlyScene = q.get('scene'), sceneScale = q.get('sc');
const root = document.getElementById('root')!, nav = document.getElementById('nav')!;
for (const [t, h] of [['alles', '?'], ['Kontaktbogen', '?view=sheet'], ['Szenen', '?view=scenes'], ['animiert', '?anim=1'], ['Szenen animiert', '?view=scenes&anim=1']]) { const a = document.createElement('a'); a.href = h; a.textContent = t; nav.append(a); }

const t0 = performance.now();
const gw = gruenwaldObjects();
const t1 = performance.now();
const cm = commonObjects();
const t2 = performance.now();
const tGw = t1 - t0, tCm = t2 - t1;
console.log(`[t] gruenwald ${tGw.toFixed(0)} ms (${gw.length} Frames), common ${tCm.toFixed(0)} ms (${cm.length} Frames)`);
const F = new Map<string, Px>();
for (const [n, p] of [...cm, ...gw]) F.set(n, p);
const errs = checkFrames([...cm, ...gw]);
// Standflächen-Prüfung: unterhalb der angegebenen Zeile müssen alle Wiege-Frames identisch sein (Stamm/Fuß bewegt sich nicht)
for (const [n, y0] of [['tree_oak', 76], ['tree_oak2', 72], ['tree_pine', 88], ['tree_birch', 62], ['tree_willow', 99], ['sapling', 26], ['bush', 19], ['wheat', 23], ['reeds', 22], ['cattail', 24], ['tallgrass', 13], ['fern', 14], ['lamp', 18], ['banner', 36]] as const) {
  const a = F.get(`${n}_0`); if (!a) continue;
  let diff = 0; for (let f = 1; f < 4; f++) { const b = F.get(`${n}_${f}`); if (!b) continue; for (let y = y0; y < a.h; y++) for (let x = 0; x < a.w; x++) if (a.get(x, y) !== b.get(x, y)) diff++; }
  if (diff) errs.push(`${n}: ${diff} abweichende Pixel in der festen Basis (ab y=${y0})`);
}
for (const e of errs) console.log('FEHLER ' + e);

// ---------------------------------------------------------------- Soll-Liste (Auftrag) → fehlende Frames melden
const A4 = (n: string): string[] => [0, 1, 2, 3].map((k) => `${n}_${k}`), AN = (n: string, c: number): string[] => Array.from({ length: c }, (_, k) => `${n}_${k}`);
const EXPECTED: string[] = [
  ...['tree_oak', 'tree_oak2', 'tree_pine', 'tree_birch', 'tree_willow', 'sapling', 'bush', 'bush_berry', 'bush_flower', 'fern', 'tallgrass', 'wheat', 'reeds', 'cattail', 'lamp', 'forge', 'banner', 'campfire'].flatMap(A4),
  'tree_dead', 'lilypad_a', 'lilypad_b', 'lily_flower', ...'abcdef'.split('').map((c) => `flowers_${c}`), 'clover', 'mushrooms', 'mushroom_big', 'stump', 'stump_moss', 'log', 'log_moss', 'rock_s', 'rock_m', 'rock_l', 'rock_moss', 'pebbles', 'leafpile',
  'house_a', 'house_b', 'house_c', 'well', 'stall', 'barrel', 'crate', 'sacks', 'cart', 'signpost', 'bounty_board', 'anvil', 'haystack', 'tent', 'bench', 'woodpile', 'scarecrow', 'beehive', 'shrine', 'birdhouse', 'fence_h', 'fence_v', 'fence_post', 'wall_ruin_h', 'wall_ruin_end', 'bridge_post',
  ...A4('crit_butterfly_a'), ...A4('crit_butterfly_b'), ...AN('crit_bird_idle', 2), ...AN('crit_bird_peck', 2), ...A4('crit_bird_fly'), ...AN('crit_rabbit_idle', 2), ...A4('crit_rabbit_hop'), ...AN('crit_squirrel_idle', 2), ...A4('crit_squirrel_run'),
  ...AN('crit_firefly', 2), ...AN('crit_frog_idle', 2), ...AN('crit_frog_hop', 3), ...AN('crit_dragonfly', 2), ...AN('crit_fish', 5),
  ...['wood', 'silver', 'gold'].flatMap((m) => ['closed', 'mid', 'open'].map((st) => `chest_${m}_${st}`)), 'door_closed', 'door_locked', 'door_open', 'door_boss', 'gate_bars', 'lever_off', 'lever_mid', 'lever_on', 'plate_up', 'plate_down',
  'brazier_unlit', ...A4('brazier'), ...A4('torch'), ...A4('wall_torch'), 'boulder_wall', 'push_block', 'quellstein_off', ...AN('quellstein', 6), ...AN('portal', 8), 'cave_entrance', 'stairs_down', 'stairs_up', ...A4('spikes'), 'turret',
  'node_herb', 'node_wood', 'node_crystal', 'node_ember', 'node_frost', 'node_rune', 'node_void', 'node_empty', ...AN('shard', 6), 'drop_bag', 'drop_gold', 'drop_potion', 'drop_gear', 'drop_key', 'grave', 'seal_pedestal',
  'd_pillar', 'd_pillar_broken', ...A4('d_banner'), 'd_chains', 'd_cobweb', 'd_crate', 'd_barrel', 'd_bookshelf', 'd_table', 'd_rack', 'd_statue', 'd_sarcophagus', 'd_rubble', 'd_bones', 'd_skull', 'd_urn', 'd_rug_a', 'd_rug_b',
  ...AN('d_crack', 3), ...AN('d_moss', 3), 'd_puddle', 'd_grate', ...A4('d_candles'), 'd_roots', ...AN('d_mushroom_glow', 2),
  // Geschichte & Weltereignisse (cm_story), Handwerk & Zuhause (cm_home)
  ...A4('hueterschrein'), 'lore_book', 'lore_tablet', 'lore_scroll', 'lore_stone', ...A4('riss_stein'), ...A4('mana_surge'), ...A4('star_shard'), 'dig_spot', 'chest_buried',
  'station_alchemy', ...A4('station_cook'), ...A4('station_enchant'), 'stash_chest', 'bed', 'house_table', 'house_shelf', 'rug', 'trophy_stand',
  // Begleiter (cm_pets): je 6 Frames – 0,1 Ruhe · 2..5 Lauf
  ...PET_IDS.flatMap((id) => AN('pet_' + id, 6)),
];
{
  const miss = EXPECTED.filter((n) => !F.has(n)), extra = [...F.keys()].filter((n) => !EXPECTED.includes(n));
  console.log(`[soll] ${EXPECTED.length} erwartet, ${F.size} geliefert, fehlend: ${miss.join(', ') || '–'}; zusätzlich: ${extra.join(', ') || '–'}`);
  for (const m of miss) errs.push(`Frame fehlt: ${m}`);
}

function h2(t: string): void { const e = document.createElement('h2'); e.textContent = t; root.append(e); }
function row(): HTMLDivElement { const d = document.createElement('div'); d.className = 'row'; root.append(d); return d; }
const cvCache = new Map<Px, HTMLCanvasElement>();
function cv(p: Px): HTMLCanvasElement { let c = cvCache.get(p); if (!c) { c = p.toCanvas(); cvCache.set(p, c); } return c; }
const ticks: Array<(n: number) => void> = [];
let tick = 0;
if (animate) setInterval(() => { tick++; for (const t of ticks) t(tick); }, 180);

/** Gruppen: Animationen zusammenfassen */
function groups(list: Array<[string, Px]>): Array<{ name: string; frames: Px[] }> {
  const out: Array<{ name: string; frames: Px[] }> = [], idx = new Map<string, number>();
  for (const [n, p] of list) {
    const m = /^(.*)_(\d+)$/.exec(n), base = m ? m[1] : n;
    if (m && idx.has(base)) out[idx.get(base)!].frames.push(p);
    else { idx.set(base, out.length); out.push({ name: base, frames: [p] }); }
  }
  return out;
}
function sheet(title: string, list: Array<[string, Px]>): void {
  h2(title);
  const r = row();
  for (const g of groups(list)) {
    if (only && !only.split(',').some((o) => g.name.includes(o))) continue;
    const n = animate ? 1 : g.frames.length, w = g.frames[0].w, h = g.frames[0].h, pad = 2;
    const c = document.createElement('canvas'); c.width = (w + pad * 2) * n * SC; c.height = (h + pad * 2) * 2 * SC;
    const x = c.getContext('2d')!; x.imageSmoothingEnabled = false;
    const draw = (k: number): void => {
      x.fillStyle = '#5d9a3c'; x.fillRect(0, 0, c.width, c.height / 2); x.fillStyle = '#2a2a33'; x.fillRect(0, c.height / 2, c.width, c.height / 2);
      for (let i = 0; i < n; i++) for (let b = 0; b < 2; b++) {
        const fr = g.frames[animate ? k % g.frames.length : i];
        x.drawImage(cv(fr), 0, 0, w, h, (i * (w + pad * 2) + pad) * SC, (b * (h + pad * 2) + pad) * SC, w * SC, h * SC);
      }
    };
    draw(0);
    if (animate && g.frames.length > 1) ticks.push(draw);
    const d = document.createElement('div'); d.className = 'cell'; d.id = `cell-${g.name}`;
    const s = document.createElement('span'); s.textContent = `${g.name}${g.frames.length > 1 ? ` ×${g.frames.length}` : ''} ${w}×${h}`;
    d.append(c, s); r.append(d);
  }
}

// ---------------------------------------------------------------- Szenen
type Sp = [name: string, x: number, y: number, opt?: string];
interface Scene { id: string; title: string; w: number; h: number; biome: BiomeId; dungeon: boolean; paint: (set: (x: number, y: number, t: number) => void, rect: (x: number, y: number, w: number, h: number, t: number) => void, blob: (cx: number, cy: number, rx: number, ry: number, t: number) => void) => void; sprites: Sp[]; rooms?: PaintableMap['rooms'] }
const FLAT = /^(lilypad|lily_flower|clover|pebbles|leafpile|plate_|spikes_|stairs_|d_rug|d_crack|d_moss|d_puddle|d_grate|d_bones|crit_fish|d_cobweb)/;
const WALLHUNG = /^(wall_torch|d_banner|d_chains|d_roots|d_cobweb)/;

function wheatRows(x0: number, y0: number, cols: number, rows: number): Sp[] {
  const out: Sp[] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) out.push(['wheat', x0 + i * 11 + (j & 1 ? 5 : 0) + ((i * 7 + j * 3) % 3), y0 + j * 9 + ((i * 5 + j) % 2), `ph${(i + j) % 4}`]);
  return out;
}
const SCENES: Scene[] = [
  {
    id: 'forest', title: 'Waldrand', w: 30, h: 18, biome: 'gruenwald', dungeon: false,
    paint: (set, rect, blob) => { blob(7, 5, 4, 2.5, T.GROUND2); blob(22, 12, 5, 3, T.GROUND2); for (let x = 0; x < 30; x++) { const y = 10 + Math.round(Math.sin(x * 0.35) * 1.2); set(x, y, T.PATH); set(x, y + 1, T.PATH); } blob(25, 4.5, 2.6, 1.8, T.LIQUID); },
    sprites: [
      ['tree_oak', 60, 120], ['tree_pine', 150, 96], ['tree_oak2', 235, 118], ['tree_birch', 318, 110], ['tree_oak', 445, 150], ['tree_pine', 20, 240], ['tree_willow', 400, 68],
      ['tree_dead', 180, 268], ['tree_birch', 262, 276], ['tree_oak2', 96, 290], ['tree_pine', 352, 280], ['tree_oak', 462, 300], ['sapling', 196, 128], ['sapling', 300, 232],
      ['bush', 110, 132], ['bush_berry', 284, 130], ['bush_flower', 180, 140], ['bush', 372, 132], ['bush_berry', 140, 236], ['bush_flower', 420, 232], ['bush', 232, 226],
      ['fern', 96, 140], ['fern', 128, 124], ['fern', 268, 140], ['fern', 340, 126], ['fern', 60, 226], ['fern', 394, 240], ['fern', 474, 216], ['tallgrass', 16, 140], ['tallgrass', 216, 142], ['tallgrass', 330, 222], ['tallgrass', 160, 226], ['tallgrass', 428, 156],
      ['flowers_a', 130, 150], ['flowers_b', 304, 148], ['flowers_c', 200, 220], ['flowers_d', 356, 150], ['flowers_e', 76, 232], ['flowers_f', 454, 226], ['clover', 240, 146], ['clover', 110, 222],
      ['mushrooms', 82, 128], ['mushroom_big', 254, 126], ['mushrooms', 438, 162], ['stump', 160, 150], ['stump_moss', 372, 226], ['log', 300, 250], ['log_moss', 216, 152],
      ['rock_s', 30, 152], ['rock_m', 348, 150], ['rock_l', 132, 258], ['rock_moss', 476, 172], ['pebbles', 190, 170], ['pebbles', 330, 196], ['leafpile', 70, 150], ['leafpile', 250, 240],
      ['lilypad_a', 392, 70], ['lilypad_b', 408, 80], ['lily_flower', 400, 64], ['reeds', 372, 82], ['cattail', 428, 86], ['crit_fish', 410, 72],
      ['crit_butterfly_a', 140, 120], ['crit_butterfly_b', 310, 118], ['crit_bird_idle', 174, 144], ['crit_bird_peck', 280, 206], ['crit_bird_fly', 220, 60], ['crit_rabbit_idle', 330, 152], ['crit_rabbit_hop', 120, 212],
      ['crit_squirrel_idle', 84, 118], ['crit_squirrel_run', 250, 222], ['crit_firefly', 200, 110], ['crit_firefly', 350, 118], ['crit_frog_idle', 380, 92], ['crit_dragonfly', 420, 56],
      ['quellstein', 150, 196], ['node_herb', 312, 212], ['node_wood', 410, 214], ['chest_wood_closed', 228, 204], ['shard', 46, 196], ['signpost', 270, 160],
      ['@char', 190, 176], ['@char', 290, 186], ['pet_moosling', 172, 178], ['pet_glutfuchs', 310, 190], ['pet_wisp', 206, 170], ['pet_pilzling', 272, 192],
    ],
  },
  {
    id: 'village', title: 'Dorfecke', w: 30, h: 18, biome: 'gruenwald', dungeon: false,
    paint: (set, rect, blob) => { rect(0, 11, 30, 2, T.PATH); rect(13, 4, 2, 14, T.PATH); blob(14, 11.5, 4, 2.4, T.PATH); blob(26, 15, 3, 2, T.GROUND2); },
    sprites: [
      ['house_a', 64, 150], ['house_b', 318, 150], ['house_c', 420, 268], ['well', 222, 150], ['stall', 150, 250], ['lamp', 196, 172], ['lamp', 250, 216], ['banner', 268, 168], ['banner', 176, 168],
      ['fence_h', 280, 258], ['fence_h', 296, 258], ['fence_h', 312, 258], ['fence_post', 324, 258], ['fence_v', 276, 284], ['fence_h', 8, 258], ['fence_h', 24, 258], ['fence_h', 40, 258], ['fence_h', 56, 258],
      ['barrel', 110, 152], ['crate', 124, 156], ['sacks', 362, 156], ['cart', 60, 240], ['signpost', 244, 172], ['bounty_board', 276, 142], ['anvil', 392, 162], ['forge', 420, 150], ['haystack', 34, 284],
      ['tent', 232, 280], ['bench', 180, 150], ['woodpile', 20, 156], ['scarecrow', 330, 282], ['beehive', 458, 158], ['shrine', 464, 110], ['birdhouse', 300, 276], ['campfire', 200, 268],
      ['wall_ruin_h', 80, 78], ['wall_ruin_end', 122, 78], ['bridge_post', 150, 80], ['tree_oak2', 170, 80], ['tree_birch', 400, 70], ['bush_flower', 30, 168], ['bush', 96, 262], ['flowers_a', 300, 166], ['flowers_d', 96, 168],
      ['flowers_f', 386, 276], ['tallgrass', 354, 262], ['crit_bird_idle', 164, 160], ['crit_butterfly_a', 44, 150], ['barrel', 370, 262], ['crate', 356, 270], ['sacks', 120, 258],
      ['chest_gold_closed', 262, 240], ['drop_bag', 216, 232], ['drop_gold', 232, 240], ['drop_potion', 246, 232], ['drop_gear', 262, 222], ['drop_key', 278, 232], ['grave', 480, 250],
      ['@char', 226, 190], ['@npc', 150, 268], ['@char', 300, 208],
    ],
  },
  {
    id: 'stream', title: 'Bachufer', w: 24, h: 14, biome: 'gruenwald', dungeon: false,
    paint: (set, rect, blob) => { for (let y = 0; y < 14; y++) { const x = 10 + Math.round(Math.sin(y * 0.5) * 1.5); for (let i = 0; i < 5; i++) set(x + i, y, T.LIQUID); } blob(5, 8, 3, 2, T.GROUND2); rect(0, 6, 24, 1, T.PATH); for (let x = 9; x < 17; x++) set(x, 6, T.BRIDGE); },
    sprites: [
      ['reeds', 150, 30], ['reeds', 158, 44], ['cattail', 166, 24], ['reeds', 152, 70], ['cattail', 248, 40], ['reeds', 256, 56], ['cattail', 262, 84], ['reeds', 250, 130], ['cattail', 162, 150], ['reeds', 170, 168], ['reeds', 154, 190], ['cattail', 244, 176], ['reeds', 252, 200],
      ['lilypad_a', 190, 30], ['lilypad_b', 210, 46], ['lily_flower', 226, 26], ['lilypad_a', 218, 140], ['lily_flower', 196, 156], ['lilypad_b', 204, 180], ['lilypad_a', 230, 196], ['crit_fish', 206, 70], ['crit_dragonfly', 200, 20], ['crit_dragonfly', 236, 150], ['crit_frog_idle', 174, 132], ['crit_frog_hop', 244, 148],
      ['bridge_post', 148, 98], ['bridge_post', 148, 118], ['bridge_post', 268, 98], ['bridge_post', 268, 118],
      ['tree_willow', 78, 100], ['tree_oak', 330, 92], ['rock_m', 140, 140], ['rock_s', 274, 70], ['rock_moss', 290, 180], ['pebbles', 150, 86], ['fern', 120, 150], ['fern', 300, 150], ['flowers_b', 110, 180], ['flowers_e', 320, 190], ['bush', 44, 180], ['tallgrass', 284, 40], ['tallgrass', 130, 36], ['log_moss', 96, 200],
      ['mushrooms', 60, 204], ['clover', 330, 140], ['stump', 356, 196], ['crit_butterfly_b', 110, 160], ['flowers_c', 30, 140],
      ['@char', 120, 108], ['@char', 300, 110],
    ],
  },
  {
    id: 'wheat', title: 'Kornfeld', w: 22, h: 12, biome: 'gruenwald', dungeon: false,
    paint: (set, rect) => { rect(0, 9, 22, 2, T.PATH); rect(3, 2, 14, 6, T.GROUND2); },
    sprites: [
      ...wheatRows(46, 52, 18, 9), ['scarecrow', 150, 80], ['haystack', 300, 120], ['haystack', 318, 138], ['cart', 300, 60], ['fence_h', 40, 140], ['fence_h', 56, 140], ['fence_h', 72, 140], ['fence_h', 88, 140], ['fence_h', 104, 140], ['fence_post', 116, 140],
      ['fence_v', 28, 60], ['fence_v', 28, 84], ['fence_v', 28, 108], ['fence_v', 28, 132], ['sacks', 280, 150], ['crit_bird_idle', 258, 104], ['crit_rabbit_idle', 266, 60], ['flowers_a', 20, 170], ['flowers_c', 250, 180], ['tallgrass', 330, 176], ['beehive', 20, 44], ['birdhouse', 270, 40],
      ['@char', 160, 108], ['@char', 240, 160],
    ],
  },
  {
    id: 'dungeon', title: 'Dungeon-Raum', w: 28, h: 17, biome: 'gruenwald', dungeon: true, rooms: [{ x0: 2, y0: 4, x1: 25, y1: 14, role: 'normal' }],
    paint: (set, rect) => { rect(0, 0, 28, 17, T.VOID); rect(1, 1, 26, 15, T.WALL); rect(2, 4, 24, 11, T.FLOOR); rect(13, 1, 2, 3, T.FLOOR); },
    sprites: [
      ['door_boss', 224, 64], ['door_closed', 72, 64], ['door_locked', 120, 64], ['door_open', 328, 64], ['gate_bars', 376, 64], ['wall_torch', 96, 50], ['wall_torch', 184, 50], ['wall_torch', 264, 50], ['wall_torch', 352, 50],
      ['d_banner', 152, 56], ['d_banner', 296, 56], ['d_chains', 48, 52], ['d_roots', 400, 60], ['d_cobweb', 42, 84],
      ['chest_wood_closed', 56, 110], ['chest_wood_mid', 80, 110], ['chest_wood_open', 104, 110], ['chest_silver_closed', 56, 140], ['chest_silver_mid', 80, 140], ['chest_silver_open', 104, 140], ['chest_gold_closed', 56, 170], ['chest_gold_mid', 80, 170], ['chest_gold_open', 104, 170],
      ['lever_off', 136, 104], ['lever_mid', 156, 104], ['lever_on', 176, 104], ['plate_up', 136, 126], ['plate_down', 156, 126], ['spikes', 184, 128, 'f0'], ['spikes', 200, 128, 'f1'], ['spikes', 216, 128, 'f2'], ['spikes', 232, 128, 'f3'],
      ['brazier_unlit', 264, 104], ['brazier', 288, 104], ['torch', 312, 104], ['boulder_wall', 340, 104], ['push_block', 364, 106], ['turret', 392, 106],
      ['quellstein_off', 160, 196], ['quellstein', 200, 196], ['portal', 248, 200], ['stairs_down', 304, 156], ['stairs_up', 344, 156], ['seal_pedestal', 390, 160], ['grave', 372, 196], ['cave_entrance', 400, 232],
      ['node_herb', 40, 204], ['node_wood', 62, 206], ['node_crystal', 86, 206], ['node_ember', 110, 206], ['node_frost', 40, 232], ['node_rune', 64, 232], ['node_void', 88, 232], ['node_empty', 110, 230], ['shard', 136, 228],
      ['drop_bag', 276, 190], ['drop_gold', 292, 190], ['drop_potion', 308, 190], ['drop_gear', 324, 190], ['drop_key', 340, 190],
      ['d_pillar', 136, 176], ['d_pillar_broken', 290, 232], ['d_crate', 312, 232], ['d_barrel', 330, 232], ['d_bookshelf', 56, 78], ['d_table', 212, 232], ['d_rack', 260, 236], ['d_statue', 168, 236], ['d_sarcophagus', 352, 226],
      ['d_rubble', 232, 164], ['d_bones', 200, 150], ['d_skull', 220, 148], ['d_urn', 276, 160], ['d_rug_a', 224, 104], ['d_rug_b', 330, 204], ['d_crack', 260, 130, 'f0'], ['d_crack', 300, 124, 'f1'], ['d_crack', 380, 130, 'f2'],
      ['d_moss', 60, 186, 'f0'], ['d_moss', 400, 110, 'f1'], ['d_moss', 132, 150, 'f2'], ['d_puddle', 180, 162], ['d_grate', 248, 152], ['d_candles', 190, 216], ['d_mushroom_glow', 388, 186], ['d_mushroom_glow', 44, 172],
      ['@char', 208, 132], ['@char', 300, 216],
    ],
  },
];

interface Lite { chars: Record<string, Sheet>; liquids: Partial<Record<BiomeId, HTMLCanvasElement[]>> }
let bundle: Lite | null = null, paintGroundFn: ((ctx: CanvasRenderingContext2D, map: PaintableMap, a: number, b: number, c: number, d: number) => void) | null = null;
function frameOf(name: string, opt: string | undefined, k: number): Px | undefined {
  if (F.has(name) && !F.has(`${name}_0`)) return F.get(name);
  let n = 0; while (F.has(`${name}_${n}`)) n++;
  if (!n) return F.get(name);
  const fixed = opt?.startsWith('f') ? Number(opt.slice(1)) : -1, ph = opt?.startsWith('ph') ? Number(opt.slice(2)) : 0;
  return F.get(`${name}_${fixed >= 0 ? fixed : animate ? (k + ph) % n : ph % n}`);
}
function silhouette(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const x = c.getContext('2d')!;
  x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#120c20'; x.fillRect(0, 0, c.width, c.height); return c;
}
const silCache = new Map<HTMLCanvasElement, HTMLCanvasElement>();
function renderScene(s: Scene, sc: number): HTMLCanvasElement {
  const tiles = new Uint8Array(s.w * s.h).fill(T.GROUND);
  const set = (x: number, y: number, t: number): void => { if (x >= 0 && y >= 0 && x < s.w && y < s.h) tiles[y * s.w + x] = t; };
  const rect = (x: number, y: number, w: number, h: number, t: number): void => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, t); };
  const blob = (cx: number, cy: number, rx: number, ry: number, t: number): void => { for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) set(x, y, t); };
  s.paint(set, rect, blob);
  const map: PaintableMap = { w: s.w, h: s.h, tiles, biome: s.biome, dungeon: s.dungeon, seed: 4711, rooms: s.rooms };
  const W = s.w * 16, H = s.h * 16;
  const base = document.createElement('canvas'); base.width = W; base.height = H; const bx = base.getContext('2d')!; bx.imageSmoothingEnabled = false;
  bx.fillStyle = s.dungeon ? '#15131c' : '#4f8f3a'; bx.fillRect(0, 0, W, H);
  if (bundle && paintGroundFn) {
    const liq = bundle.liquids[s.biome]?.[0];
    for (let ty = 0; ty < s.h; ty++) for (let tx = 0; tx < s.w; tx++) if (tiles[ty * s.w + tx] === T.LIQUID) { if (liq) bx.drawImage(liq, (tx * 16) % liq.width, (ty * 16) % liq.height, 16, 16, tx * 16, ty * 16, 16, 16); else { bx.fillStyle = '#2a7f9a'; bx.fillRect(tx * 16, ty * 16, 16, 16); } }
    const gc = document.createElement('canvas'); gc.width = W; gc.height = H;
    try { paintGroundFn(gc.getContext('2d')!, map, 0, 0, s.w, s.h); bx.drawImage(gc, 0, 0); } catch (e) { console.log('paintGround-Fehler ' + String(e)); }
  }
  const out = document.createElement('canvas'); out.width = W * sc; out.height = H * sc; out.id = `scene-${s.id}-${sc}`;
  const x = out.getContext('2d')!; x.imageSmoothingEnabled = false;
  const world = document.createElement('canvas'); world.width = W; world.height = H; const wx = world.getContext('2d')!; wx.imageSmoothingEnabled = false;
  const sorted = [...s.sprites].sort((a, b) => (FLAT.test(a[0]) ? -1e6 + a[2] : a[2]) - (FLAT.test(b[0]) ? -1e6 + b[2] : b[2]));
  const draw = (k: number): void => {
    wx.setTransform(1, 0, 0, 1, 0, 0); wx.clearRect(0, 0, W, H); wx.drawImage(base, 0, 0);
    // Schatten (nur Vorschau: grobe Annäherung an den dynamischen Engine-Schatten)
    for (const [name, px, py, opt] of sorted) {
      if (name.startsWith('@') || FLAT.test(name) || WALLHUNG.test(name) || name.startsWith('crit_') || name.startsWith('door') || name === 'gate_bars' || name === 'cave_entrance') continue;
      const p = frameOf(name, opt, k); if (!p) continue;
      const c = cv(p); let sil = silCache.get(c); if (!sil) { sil = silhouette(c); silCache.set(c, sil); }
      wx.globalAlpha = 0.26; wx.setTransform(1, 0, -0.42, -0.2, px, py - 1); wx.drawImage(sil, -p.w / 2, -p.h); wx.setTransform(1, 0, 0, 1, 0, 0); wx.globalAlpha = 1;
    }
    for (const [name, px, py, opt] of sorted) {
      if (name.startsWith('@')) {
        if (!bundle) continue;
        const sh = bundle.chars[name === '@npc' ? 'npc_haendlerin' : 'char_waldlaeufer'] ?? Object.values(bundle.chars)[0]; if (!sh) continue;
        const f = sh.frames['0']; wx.drawImage(sh.canvas, f.x, f.y, f.w, f.h, px - 16, py - 37, f.w, f.h);
        continue;
      }
      const p = frameOf(name, opt, k);
      if (!p) { if (k === 0) console.log(`Szene ${s.id}: Frame fehlt: ${name}`); continue; }
      wx.drawImage(cv(p), Math.round(px - p.w / 2), Math.round(py - p.h));
    }
    x.clearRect(0, 0, out.width, out.height); x.drawImage(world, 0, 0, W, H, 0, 0, W * sc, H * sc);
  };
  draw(0);
  if (animate) ticks.push(draw);
  return out;
}

async function main(): Promise<void> {
  const info = document.createElement('div');
  info.textContent = `Bauzeit: gruenwald ${tGw.toFixed(0)} ms (${gw.length} Frames) · common ${tCm.toFixed(0)} ms (${cm.length} Frames)`;
  root.append(info);
  for (const e of errs) { const d = document.createElement('div'); d.className = 'err'; d.textContent = e; root.append(d); }
  if (view === 'all' || view === 'sheet') {
    sheet('Grünwald – Kontaktbogen', gw); sheet('Allgemein – Kontaktbogen', cm);
    // Begleiter getrennt nach Ruhe- und Laufschleife (mit ?anim=1 als Animation)
    sheet('Begleiter – Ruhe (Frames 0–1) und Lauf (Frames 2–5)', PET_IDS.flatMap((id) => [0, 1, 2, 3, 4, 5].map((k): [string, Px] => [`pet_${id}_${k < 2 ? 'ruhe_' + k : 'lauf_' + (k - 2)}`, F.get(`pet_${id}_${k}`)!])));
  }
  if (view === 'all' || view === 'scenes') {
    // Bevorzugt das komplette Bundle; fällt auf Einzelteile zurück, solange Nachbarmodule im Umbau sind.
    try {
      const m = await import('./index'); paintGroundFn = m.paintGround;
      try { const g = m.buildGfx(); bundle = { chars: g.chars, liquids: g.liquids }; }
      catch (e) {
        console.log('buildGfx nicht verfügbar (' + String(e) + ') – Einzelteile');
        bundle = { chars: {}, liquids: {} };
        try { const t = await import('./tiles/index'); bundle.liquids = t.buildLiquids(); } catch (e2) { console.log('Flüssigkeiten fehlen: ' + String(e2)); }
        const c = await import('./chars');
        for (const k of ['char_waldlaeufer', 'npc_haendlerin', 'char_krieger']) { try { bundle.chars[k] = c.buildCharSheet(k); } catch { /* im Umbau */ } }
      }
    } catch (e) { console.log('gfx/index nicht ladbar: ' + String(e)); }
    for (const s of SCENES) {
      if (onlyScene && s.id !== onlyScene) continue;
      for (const sc of [2, 3]) { if (sceneScale && Number(sceneScale) !== sc) continue; h2(`Szene: ${s.title} (${sc}×)`); const r = row(); r.append(renderScene(s, sc)); }
    }
  }
  (window as unknown as { __done: boolean }).__done = true;
}
void main();
