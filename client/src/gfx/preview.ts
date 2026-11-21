/** Kontaktbogen für das gfx-Modul: /gfx-preview.html?section=chars|mobs|bosses|obj|fx|liquids|icons|maps&biome=…&scale=… */
import { buildGfx, iconUrl, paintGround, portraitUrl } from './index';
import { BOSS_IDS, CLASS_IDS, ITEM_ICONS, MOB_IDS, NPC_LOOKS, OBJ_FRAMES, FX_FRAMES, SKILL_GLYPHS } from './spec';
import type { ElementKey, FrameRect, GfxBundle, PaintableMap, Sheet } from './spec';
import { BIOMES, T } from '../../../shared/src/maps/tiles';
import type { BiomeId } from '../../../shared/src/maps/tiles';
import { rng } from './palette';

const q = new URLSearchParams(location.search);
const section = q.get('section') ?? 'all';
const onlyBiome = q.get('biome');
const only = q.get('only');
const SC = Number(q.get('scale') ?? 0);
const root = document.getElementById('root')!;
const nav = document.getElementById('nav')!;
for (const s of ['all', 'chars', 'mobs', 'bosses', 'obj', 'fx', 'liquids', 'icons', 'maps']) { const a = document.createElement('a'); a.href = `?section=${s}`; a.textContent = s; nav.append(a); }

const t0 = performance.now();
const g: GfxBundle = buildGfx();
const tBuild = performance.now() - t0;
console.log(`[t] buildGfx ${tBuild.toFixed(0)} ms`);

function h2(t: string): void { const e = document.createElement('h2'); e.textContent = t; root.append(e); }
function row(): HTMLDivElement { const d = document.createElement('div'); d.className = 'row'; root.append(d); return d; }
function scaled(src: HTMLCanvasElement, f: FrameRect | null, sc: number): HTMLCanvasElement {
  const r = f ?? { x: 0, y: 0, w: src.width, h: src.height };
  const c = document.createElement('canvas'); c.width = r.w * sc; c.height = r.h * sc;
  const x = c.getContext('2d')!; x.imageSmoothingEnabled = false; x.drawImage(src, r.x, r.y, r.w, r.h, 0, 0, c.width, c.height);
  return c;
}
function cell(parent: HTMLElement, c: HTMLElement, label: string, cls = ''): void { const d = document.createElement('div'); d.className = `cell ${cls}`; const s = document.createElement('span'); s.textContent = label; d.append(c, s); parent.append(d); }
const show = (s: string) => section === 'all' || section === s;

if (show('chars')) {
  h2(`Charaktere (buildGfx ${tBuild.toFixed(0)} ms)`);
  const keys = [...CLASS_IDS.map((c) => `char_${c}`), ...NPC_LOOKS.map((c) => `npc_${c}`)].filter((k) => !only || k.includes(only));
  for (const k of keys) { const r = row(); cell(r, scaled(g.chars[k].canvas, null, SC || 3), k); }
  const r = row(); for (const k of keys) { const im = new Image(); im.src = portraitUrl(k, 3); cell(r, im, 'portrait'); }
}
if (show('mobs')) {
  h2('Gegner'); const r = row();
  for (const id of MOB_IDS) if (!only || id.includes(only)) cell(r, scaled(g.mobs[`mob_${id}`].canvas, null, SC || 4), `${id} ${g.mobMeta[`mob_${id}`].w}x${g.mobMeta[`mob_${id}`].h}`);
}
if (show('bosses')) {
  h2('Bosse');
  for (const id of BOSS_IDS) if (!only || id.includes(only)) { const r = row(); cell(r, scaled(g.bosses[`boss_${id}`].canvas, null, SC || 2), `${id} ${g.bossMeta[`boss_${id}`].w}x${g.bossMeta[`boss_${id}`].h}`); }
}
if (show('obj')) {
  h2('Objekte'); const r = row();
  for (const n of OBJ_FRAMES) if (!only || n.includes(only)) { const f = g.obj.frames[n]; if (!f) { cell(r, document.createElement('b'), `FEHLT ${n}`); continue; } cell(r, scaled(g.obj.canvas, f, SC || 3), n, n.startsWith('portal') ? 'dark' : 'light'); }
}
if (show('fx')) {
  h2('Effekte'); const r = row();
  for (const n of FX_FRAMES) { const f = g.fx.frames[n]; if (!f) { cell(r, document.createElement('b'), `FEHLT ${n}`); continue; } cell(r, scaled(g.fx.canvas, f, SC || (f.w > 48 ? 2 : 4)), n, 'dark'); }
}
if (show('liquids')) {
  h2('Flüssigkeiten'); const r = row();
  for (const b of BIOMES) {
    const c = document.createElement('canvas'); c.width = 96 * 3; c.height = 96 * 3; const x = c.getContext('2d')!; x.imageSmoothingEnabled = false;
    let f = 0; const draw = () => { for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) x.drawImage(g.liquids[b][f % 4], i * 96, j * 96, 96, 96); f++; };
    draw(); if (section !== 'all') setInterval(draw, 220);
    cell(r, c, b);
    const st = document.createElement('canvas'); st.width = 32 * 4 * 2; st.height = 64; const sx = st.getContext('2d')!; sx.imageSmoothingEnabled = false; g.liquids[b].forEach((fr, i) => sx.drawImage(fr, i * 64, 0, 64, 64)); cell(r, st, `${b} frames`);
  }
}
if (show('icons')) {
  h2('Icons'); let r = row();
  for (const n of ITEM_ICONS) { const im = new Image(); im.src = iconUrl(`item_${n}`); im.width = 24 * (SC || 3); im.height = 24 * (SC || 3); cell(r, im, n); }
  const els: ElementKey[] = ['phys', 'fire', 'water', 'earth', 'wind', 'light', 'dark'];
  r = row();
  SKILL_GLYPHS.forEach((n, i) => { const im = new Image(); im.src = iconUrl(`skill_${n}`, els[i % 7]); im.width = 24 * (SC || 3); im.height = 24 * (SC || 3); cell(r, im, n); });
  r = row();
  for (const e of els) { const im = new Image(); im.src = iconUrl('skill_fireball', e); im.width = 72; im.height = 72; cell(r, im, e); }
}

// ---------------------------------------------------------------- Beispielkarten
function sampleMap(biome: BiomeId, dungeon: boolean, seed: number): PaintableMap {
  const w = 38, h = 26, tiles = new Uint8Array(w * h), R = rng(seed);
  const set = (x: number, y: number, t: number) => { if (x >= 0 && y >= 0 && x < w && y < h) tiles[y * w + x] = t; };
  const rect = (x: number, y: number, ww: number, hh: number, t: number) => { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) set(x + i, y + j, t); };
  const blob = (cx: number, cy: number, r: number, t: number, onlyOn?: number) => { for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) { const d = Math.hypot(x - cx, (y - cy) * 1.25) + (R() - 0.5) * 1.2; if (d < r && x > 1 && y > 1 && x < w - 2 && y < h - 2 && (onlyOn === undefined || tiles[y * w + x] === onlyOn)) set(x, y, t); } };
  if (!dungeon) {
    tiles.fill(T.GROUND);
    for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) { const edge = Math.min(x, y, w - 1 - x, h - 1 - y); if (edge < 2 + (R() < 0.3 ? 1 : 0)) set(x, y, T.WALL); }
    blob(8, 7, 4, T.GROUND2); blob(30, 19, 4.5, T.GROUND2); blob(20, 5, 2.5, T.GROUND2);
    blob(27, 9, 4.2, T.LIQUID); blob(31, 10, 2.5, T.LIQUID);
    blob(9, 18, 3, T.HAZARD);
    rect(14, 15, 4, 3, T.WALL); rect(15, 14, 2, 1, T.WALL); rect(20, 18, 2, 2, T.WALL); rect(4, 11, 3, 2, T.WALL);
    // Weg
    let py = 12; for (let x = 2; x < w - 2; x++) { if (x % 5 === 0) py += R() < 0.5 ? 1 : -1; py = Math.max(10, Math.min(14, py)); for (let d = 0; d < 2; d++) { const t = tiles[(py + d) * w + x]; set(x, py + d, t === T.LIQUID ? T.BRIDGE : T.PATH); } }
    for (let y = 13; y < h - 2; y++) { set(24, y, tiles[y * w + 24] === T.WALL ? T.WALL : T.PATH); set(25, y, T.PATH); }
    rect(31, 3, 4, 3, T.FLOOR);
  } else {
    tiles.fill(T.VOID);
    const room = (x: number, y: number, ww: number, hh: number) => { rect(x - 1, y - 2, ww + 2, hh + 3, T.WALL); rect(x, y, ww, hh, T.FLOOR); };
    room(3, 4, 9, 7); room(16, 3, 10, 6); room(29, 5, 6, 9); room(5, 16, 11, 7); room(20, 15, 12, 8);
    const corr = (x0: number, y0: number, x1: number, y1: number) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) { for (const dy of [-2, -1, 2]) if (tiles[(y0 + dy) * w + x] === T.VOID) set(x, y0 + dy, T.WALL); set(x, y0, T.FLOOR); set(x, y0 + 1, T.FLOOR); } for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) { for (const dx of [-1, 2]) if (tiles[y * w + x1 + dx] === T.VOID) set(x1 + dx, y, T.WALL); set(x1, y, T.FLOOR); set(x1 + 1, y, T.FLOOR); } };
    corr(11, 6, 16, 6); corr(25, 6, 29, 7); corr(8, 10, 8, 16); corr(15, 19, 20, 19); corr(31, 13, 31, 16);
    rect(22, 17, 8, 4, T.LIQUID); rect(25, 17, 2, 4, T.BRIDGE);
    rect(18, 4, 3, 2, T.GROUND); rect(21, 5, 3, 3, T.GROUND2); rect(7, 18, 3, 3, T.HAZARD); rect(11, 18, 3, 2, T.PATH);
    rect(31, 8, 2, 3, T.VOID); rect(6, 6, 2, 2, T.WALL);
  }
  return { w, h, tiles, biome, dungeon, seed };
}
const DECO: Record<BiomeId, string[]> = {
  gruenwald: ['tree_oak', 'tree_oak2', 'tree_pine', 'bush', 'bush_berry', 'stump', 'log', 'rock_s', 'rock_l', 'flowers_a', 'flowers_b', 'tallgrass', 'mushrooms', 'house_a', 'house_b', 'well', 'signpost', 'barrel', 'crate', 'lamp', 'fence_h', 'chest_wood_closed', 'quellstein_0', 'node_herb', 'campfire_0', 'haystack'],
  kristall: ['stalagmite', 'stalagmite_l', 'crystal_blue', 'crystal_pink', 'crystal_big', 'glowshroom', 'bones', 'rock_s', 'rock_l', 'node_crystal', 'chest_silver_closed', 'torch_0', 'cave_entrance', 'quellstein_1', 'boulder_wall', 'shard_0'],
  glut: ['dead_tree', 'basalt_column', 'lava_rock', 'obsidian', 'skull', 'ember_vent_0', 'ember_vent_1', 'rock_l', 'node_ember', 'brazier_0', 'chest_gold_closed', 'tent', 'bones', 'quellstein_2'],
  frost: ['pine_snow', 'pine_snow2', 'ice_spike', 'ice_spike_l', 'snow_rock', 'frozen_bush', 'snowman', 'node_frost', 'campfire_1', 'tent', 'chest_wood_closed', 'quellstein_3', 'signpost'],
  ruinen: ['pillar', 'pillar_broken', 'statue', 'rubble', 'arch', 'rune_stone', 'vine_tree', 'urn', 'node_rune', 'chest_silver_open', 'brazier_1', 'bush', 'seal_pedestal', 'quellstein_off'],
  schatten: ['twisted_tree', 'void_crystal', 'tombstone', 'shadow_spire', 'eye_stalk', 'floating_shard', 'node_void', 'skull', 'bones', 'brazier_2', 'chest_gold_open', 'portal_0', 'grave'],
};
const DUN_DECO = ['chest_wood_closed', 'chest_gold_closed', 'brazier_0', 'torch_1', 'push_block', 'plate_up', 'lever_off', 'spikes_2', 'spikes_0', 'turret', 'urn', 'barrel', 'crate', 'stairs_down', 'stairs_up', 'door_boss', 'seal_pedestal', 'bones', 'boulder_wall', 'rubble'];
const BIOME_MOBS: Record<BiomeId, string[]> = {
  gruenwald: ['moosling', 'dornkaefer', 'pilzling', 'waldwolf', 'wurzelschleicher'], kristall: ['fledermaus', 'kristallkrabbler', 'glimmerwisp', 'tropfschleim'],
  glut: ['glutimp', 'aschenhund', 'magmaschleim', 'schlackengolem'], frost: ['frostwolf', 'eiswicht', 'schneebrute', 'frostwisp'],
  ruinen: ['runenwaechter', 'skelettkrieger', 'fluchgeist', 'arkanauge'], schatten: ['schattenwandler', 'leerenbrut', 'nachtmahr', 'hohlritter'],
};
function renderMap(biome: BiomeId, dungeon: boolean): HTMLCanvasElement {
  const m = sampleMap(biome, dungeon, 1000 + BIOMES.indexOf(biome) * 7 + (dungeon ? 3 : 0));
  const c = document.createElement('canvas'); c.width = m.w * 16; c.height = m.h * 16;
  const x = c.getContext('2d')!; x.imageSmoothingEnabled = false;
  const liq = g.liquids[biome][0];
  for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) if (m.tiles[ty * m.w + tx] === T.LIQUID) x.drawImage(liq, (tx * 16) % 32, (ty * 16) % 32, 16, 16, tx * 16, ty * 16, 16, 16);
  const gc = document.createElement('canvas'); gc.width = c.width; gc.height = c.height;
  const t1 = performance.now();
  paintGround(gc.getContext('2d')!, m, 0, 0, m.w, m.h);
  console.log(`[t] paintGround ${biome}${dungeon ? ' dungeon' : ''} ${(performance.now() - t1).toFixed(0)} ms (${m.w}x${m.h})`);
  x.drawImage(gc, 0, 0);
  // Sprites
  type Sp = { sheet: Sheet; f: FrameRect; x: number; y: number; flat?: boolean };
  const sp: Sp[] = [], R = rng(m.seed + 5);
  const walk = (t: number) => t === T.GROUND || t === T.GROUND2 || t === T.PATH || t === T.FLOOR;
  const free = (tx: number, ty: number, w2: number) => { for (let i = -w2; i <= w2; i++) for (let j = -1; j <= 0; j++) { const t = m.tiles[(ty + j) * m.w + tx + i]; if (!walk(t) || t === T.PATH) return false; } return true; };
  const used: Array<[number, number]> = [];
  const place = (sheet: Sheet, name: string, flat = false) => {
    const f = sheet.frames[name]; if (!f) return;
    for (let k = 0; k < 60; k++) {
      const tx = 3 + Math.floor(R() * (m.w - 6)), ty = 3 + Math.floor(R() * (m.h - 5)), w2 = Math.ceil(f.w / 32);
      if (!free(tx, ty, w2 - 1)) continue;
      if (used.some(([ux, uy]) => Math.abs(ux - tx) < w2 + 1 && Math.abs(uy - ty) < 2)) continue;
      used.push([tx, ty]); sp.push({ sheet, f, x: tx * 16 + 8, y: ty * 16 + 14, flat }); return;
    }
  };
  const deco = dungeon ? DUN_DECO : DECO[biome];
  for (const n of deco) place(g.obj, n, n.startsWith('plate') || n.startsWith('spikes') || n.startsWith('stairs'));
  if (!dungeon) for (const n of deco.slice(0, 6)) place(g.obj, n);
  for (const id of BIOME_MOBS[biome]) place(g.mobs[`mob_${id}`], String(Math.floor(R() * 4)));
  CLASS_IDS.forEach((id, i) => place(g.chars[`char_${id}`], String([0, 16, 2, 32, 7][i])));
  place(g.chars[`npc_${NPC_LOOKS[BIOMES.indexOf(biome) * 2]}`], '0');
  sp.sort((a, b) => (a.flat ? -1e6 : a.y) - (b.flat ? -1e6 : b.y));
  const sh = g.fx.frames['shadow'];
  for (const s of sp) {
    if (s.sheet !== g.obj) x.drawImage(g.fx.canvas, sh.x, sh.y, sh.w, sh.h, s.x - 12, s.y - 6, 24, 10);
    x.drawImage(s.sheet.canvas, s.f.x, s.f.y, s.f.w, s.f.h, Math.round(s.x - s.f.w / 2), s.y - s.f.h + (s.flat ? s.f.h / 2 - 6 : 0), s.f.w, s.f.h);
  }
  return scaled(c, null, SC || 3);
}
if (show('maps')) {
  for (const b of BIOMES) if (!onlyBiome || onlyBiome === b) {
    h2(`Karte ${b}`);
    const r = row();
    if (q.get('dungeon') !== '1') cell(r, renderMap(b, false), `${b} Oberwelt`);
    if (q.get('dungeon') !== '0') cell(r, renderMap(b, true), `${b} Dungeon`);
  }
  if (q.get('perf')) {
    const m: PaintableMap = { w: 128, h: 128, tiles: new Uint8Array(128 * 128), biome: (onlyBiome as BiomeId) ?? 'ruinen', dungeon: false, seed: 5 };
    const R = rng(9); for (let i = 0; i < m.tiles.length; i++) { const v = R(); m.tiles[i] = v < 0.5 ? T.GROUND : v < 0.65 ? T.GROUND2 : v < 0.75 ? T.PATH : v < 0.85 ? T.WALL : v < 0.92 ? T.LIQUID : v < 0.96 ? T.FLOOR : T.HAZARD; }
    const c = document.createElement('canvas'); c.width = 2048; c.height = 2048; const t1 = performance.now(); paintGround(c.getContext('2d')!, m, 0, 0, 128, 128);
    console.log(`[t] paintGround 128x128 ${m.biome}: ${(performance.now() - t1).toFixed(0)} ms`);
  }
}
(window as unknown as { __done: boolean }).__done = true;
