/**
 * Vorschau für die Objektmodule "kristall" und "glut":
 *   /preview-objects2.html?view=sheet|scenes|all &only=<teilstring,…> &anim=1 &scale=<n> &scene=kristall|glut &sc=2|3
 */
import { Px } from './draw';
import { kristallObjects } from './objects/kristall';
import { glutObjects } from './objects/glut';
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
const kr = kristallObjects();
const t1 = performance.now();
const gl = glutObjects();
const t2 = performance.now();
const tKr = t1 - t0, tGl = t2 - t1;
console.log(`[t] kristall ${tKr.toFixed(0)} ms (${kr.length} Frames), glut ${tGl.toFixed(0)} ms (${gl.length} Frames)`);
const F = new Map<string, Px>();
for (const [n, p] of [...kr, ...gl]) F.set(n, p);
const errs = checkFrames([...kr, ...gl]);

// ---------------------------------------------------------------- Soll-Liste (Auftrag): Name → [Frames, Breite, Höhe]
type Want = [name: string, frames: number, w: number, h: number];
const WANT_KR: Want[] = [
  ['stalagmite', 0, 16, 28], ['stalagmite_l', 0, 24, 44], ['stalagmite_cluster', 0, 32, 36], ['crystal_blue', 4, 20, 30], ['crystal_pink', 4, 20, 30], ['crystal_big', 4, 40, 60], ['crystal_teal', 4, 28, 24],
  ['crystal_shards', 0, 16, 12], ['glowshroom', 4, 16, 18], ['glowshroom_big', 4, 20, 30], ['cave_moss', 0, 16, 10], ['rock_cave_s', 0, 16, 14], ['rock_cave_m', 0, 24, 20], ['rock_cave_l', 0, 36, 30],
  ['bones', 0, 16, 10], ['puddle_cave', 0, 20, 12], ['mine_support', 0, 48, 56], ['mine_cart', 0, 30, 24], ['mine_rails', 0, 32, 12], ['ore_crate', 0, 16, 18], ['pickaxe_rack', 0, 20, 26], ['lantern_post', 4, 14, 36],
  ['drip_stone', 0, 12, 20], ['crit_glowbug', 2, 5, 5], ['crit_cavebat', 4, 12, 10], ['crit_newt_idle', 2, 14, 8], ['crit_newt_run', 4, 14, 8], ['crit_cavefish', 5, 16, 12],
];
const WANT_GL: Want[] = [
  ['dead_tree', 0, 44, 64], ['charred_stump', 0, 18, 16], ['basalt_column', 0, 20, 44], ['basalt_cluster', 0, 40, 40], ['lava_rock', 4, 22, 20], ['obsidian', 0, 18, 26], ['obsidian_big', 0, 36, 48], ['skull', 0, 12, 10],
  ['ribcage', 0, 30, 22], ['ember_vent', 4, 16, 20], ['fire_geyser', 6, 16, 40], ['ash_pile', 0, 20, 10], ['scorched_bush', 0, 20, 16], ['magma_crack', 3, 24, 14], ['forge_ruin', 0, 44, 48], ['nomad_tent', 0, 48, 44],
  ['nomad_banner', 4, 16, 44], ['nomad_brazier', 4, 16, 26], ['water_skins', 0, 16, 16], ['cairn', 0, 14, 20], ['crit_emberfly', 2, 5, 5], ['crit_lizard_idle', 2, 16, 8], ['crit_lizard_run', 4, 16, 8], ['crit_lavapop', 5, 16, 14],
];
{
  const exp = new Set<string>();
  for (const [n, c, w, h] of [...WANT_KR, ...WANT_GL]) {
    for (const fn of c ? Array.from({ length: c }, (_, k) => `${n}_${k}`) : [n]) {
      exp.add(fn);
      const p = F.get(fn);
      if (!p) errs.push(`Frame fehlt: ${fn}`); else if (p.w !== w || p.h !== h) errs.push(`${fn}: ${p.w}×${p.h} statt ${w}×${h}`);
    }
    if (c && F.has(`${n}_${c}`)) errs.push(`${n}: mehr Frames als ${c}`);
  }
  const extra = [...F.keys()].filter((n) => !exp.has(n));
  console.log(`[soll] ${exp.size} erwartet, ${F.size} geliefert; zusätzlich: ${extra.join(', ') || '–'}`);
}
// Standflächen-Prüfung: die untersten Zeilen der Wiege-/Flacker-Animationen müssen in allen Frames identisch sein
for (const [n, rows] of [['crystal_blue', 5], ['crystal_pink', 5], ['crystal_big', 8], ['crystal_teal', 4], ['glowshroom', 3], ['glowshroom_big', 4], ['lantern_post', 20], ['lava_rock', 1], ['nomad_banner', 6], ['nomad_brazier', 12]] as const) {
  const a = F.get(`${n}_0`); if (!a) continue;
  let diff = 0; for (let f = 1; f < 4; f++) { const b = F.get(`${n}_${f}`); if (!b) continue; for (let y = a.h - rows; y < a.h; y++) for (let x = 0; x < a.w; x++) if ((a.get(x, y) >>> 24 >= 200 || b.get(x, y) >>> 24 >= 200) && (a.get(x, y) >>> 24 >= 200) !== (b.get(x, y) >>> 24 >= 200)) diff++; }
  if (diff) errs.push(`${n}: ${diff} Pixel der Standfläche ändern die Silhouette (unterste ${rows} Zeilen)`);
}
for (const e of errs) console.log('FEHLER ' + e);

function h2(t: string): void { const e = document.createElement('h2'); e.textContent = t; root.append(e); }
function row(): HTMLDivElement { const d = document.createElement('div'); d.className = 'row'; root.append(d); return d; }
const cvCache = new Map<Px, HTMLCanvasElement>();
function cv(p: Px): HTMLCanvasElement { let c = cvCache.get(p); if (!c) { c = p.toCanvas(); cvCache.set(p, c); } return c; }
const ticks: Array<(n: number) => void> = [];
let tick = 0;
if (animate) setInterval(() => { tick++; for (const t of ticks) t(tick); }, 180);

function groups(list: Array<[string, Px]>): Array<{ name: string; frames: Px[] }> {
  const out: Array<{ name: string; frames: Px[] }> = [], idx = new Map<string, number>();
  for (const [n, p] of list) {
    const m = /^(.*)_(\d+)$/.exec(n), base = m ? m[1] : n;
    if (m && idx.has(base)) out[idx.get(base)!].frames.push(p);
    else { idx.set(base, out.length); out.push({ name: base, frames: [p] }); }
  }
  return out;
}
/** Kontaktbogen: jede Gruppe auf Höhlenblau (oben) und Aschgrau (unten). */
function sheet(title: string, list: Array<[string, Px]>): void {
  h2(title);
  const r = row();
  for (const g of groups(list)) {
    if (only && !only.split(',').some((o) => g.name.includes(o))) continue;
    const n = animate ? 1 : g.frames.length, w = g.frames[0].w, h = g.frames[0].h, pad = 2;
    const c = document.createElement('canvas'); c.width = (w + pad * 2) * n * SC; c.height = (h + pad * 2) * 2 * SC;
    const x = c.getContext('2d')!; x.imageSmoothingEnabled = false;
    const draw = (k: number): void => {
      x.fillStyle = '#263a52'; x.fillRect(0, 0, c.width, c.height / 2); x.fillStyle = '#5a504e'; x.fillRect(0, c.height / 2, c.width, c.height / 2);
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
type Paint = (set: (x: number, y: number, t: number) => void, rect: (x: number, y: number, w: number, h: number, t: number) => void, blob: (cx: number, cy: number, rx: number, ry: number, t: number) => void) => void;
interface Scene { id: string; title: string; w: number; h: number; biome: BiomeId; bg: string; paint: Paint; sprites: Sp[] }
const FLAT = /^(cave_moss|bones|puddle_cave|mine_rails|crystal_shards|skull|ash_pile|magma_crack|crit_cavefish|crit_lavapop)/;
const NOSHADOW = /^(crit_|@)/;

const SCENES: Scene[] = [
  {
    id: 'kristall', title: 'Kristallhöhle mit Grubeneingang', w: 30, h: 17, biome: 'kristall', bg: '#1c2a3c',
    paint: (set, rect, blob) => {
      rect(0, 0, 30, 2, T.WALL); rect(0, 2, 3, 2, T.WALL); rect(26, 2, 4, 1, T.WALL);
      blob(7, 12, 4.5, 2.6, T.GROUND2); blob(22, 6, 4, 2.4, T.GROUND2);
      for (let x = 0; x < 30; x++) { const y = 9 + Math.round(Math.sin(x * 0.33) * 1.1); set(x, y, T.PATH); set(x, y + 1, T.PATH); }
      rect(14, 2, 2, 8, T.PATH); blob(24.5, 13.5, 3, 1.8, T.LIQUID);
    },
    sprites: [
      ['mine_support', 240, 76], ['mine_rails', 208, 128], ['mine_rails', 240, 128], ['mine_rails', 272, 128], ['mine_rails', 304, 128], ['mine_cart', 262, 127], ['ore_crate', 276, 84], ['ore_crate', 290, 90], ['pickaxe_rack', 204, 84], ['lantern_post', 184, 122], ['lantern_post', 330, 122],
      ['crystal_big', 96, 104], ['crystal_blue', 60, 112, 'ph1'], ['crystal_pink', 134, 100, 'ph2'], ['crystal_teal', 118, 124, 'ph3'], ['crystal_shards', 86, 120], ['crystal_shards', 150, 122],
      ['stalagmite_l', 30, 92], ['stalagmite', 50, 76], ['stalagmite_cluster', 348, 84], ['stalagmite', 322, 96], ['drip_stone', 388, 92], ['stalagmite_l', 440, 100], ['stalagmite', 462, 116], ['drip_stone', 20, 130],
      ['rock_cave_l', 404, 150], ['rock_cave_m', 436, 162], ['rock_cave_s', 380, 158], ['rock_cave_s', 160, 76], ['rock_cave_m', 30, 250],
      ['glowshroom', 66, 190], ['glowshroom_big', 88, 204, 'ph2'], ['glowshroom', 120, 214, 'ph1'], ['glowshroom_big', 146, 190], ['glowshroom', 348, 110, 'ph3'], ['glowshroom', 420, 236], ['cave_moss', 100, 190], ['cave_moss', 132, 228], ['cave_moss', 340, 124], ['cave_moss', 370, 104],
      ['crystal_pink', 330, 232], ['crystal_blue', 356, 250, 'ph2'], ['crystal_teal', 300, 252], ['crystal_big', 448, 262, 'ph2'], ['crystal_shards', 322, 244], ['stalagmite_cluster', 196, 256], ['stalagmite', 232, 240], ['drip_stone', 256, 250],
      ['bones', 200, 200], ['bones', 60, 150], ['puddle_cave', 170, 228], ['puddle_cave', 280, 196], ['puddle_cave', 430, 130],
      ['crit_cavefish', 394, 222], ['crit_glowbug', 110, 80], ['crit_glowbug', 150, 170], ['crit_glowbug', 360, 200], ['crit_glowbug', 76, 172], ['crit_cavebat', 290, 50], ['crit_cavebat', 180, 110, 'ph2'], ['crit_newt_idle', 300, 220], ['crit_newt_run', 190, 182],
      ['@char', 240, 170], ['@char', 150, 150],
    ],
  },
  {
    id: 'glut', title: 'Glutlande mit Nomadenlager', w: 30, h: 17, biome: 'glut', bg: '#3a2e38',
    paint: (set, rect, blob) => {
      rect(0, 0, 30, 1, T.WALL); blob(6, 5, 4, 2.4, T.GROUND2); blob(24, 12, 4.5, 2.6, T.GROUND2);
      for (let x = 0; x < 30; x++) { const y = 9 + Math.round(Math.sin(x * 0.3 + 1) * 1.2); set(x, y, T.PATH); set(x, y + 1, T.PATH); }
      blob(25, 4.5, 3.2, 2, T.LIQUID); blob(12, 14.5, 2.4, 1.4, T.HAZARD);
    },
    sprites: [
      ['nomad_tent', 150, 120], ['nomad_banner', 112, 120], ['nomad_banner', 190, 124, 'ph2'], ['nomad_brazier', 184, 146], ['nomad_brazier', 120, 150, 'ph2'], ['water_skins', 206, 116], ['cairn', 226, 136], ['cairn', 60, 140],
      ['dead_tree', 44, 90], ['dead_tree', 300, 96], ['charred_stump', 84, 112], ['charred_stump', 340, 120], ['scorched_bush', 262, 122], ['scorched_bush', 22, 132], ['scorched_bush', 420, 226],
      ['basalt_cluster', 372, 104], ['basalt_column', 340, 92], ['basalt_column', 410, 116], ['basalt_cluster', 60, 256], ['basalt_column', 24, 240],
      ['obsidian_big', 448, 150], ['obsidian', 422, 142], ['obsidian', 474, 166], ['obsidian', 250, 250], ['obsidian_big', 300, 262],
      ['lava_rock', 360, 150], ['lava_rock', 150, 236, 'ph2'], ['lava_rock', 436, 96, 'ph1'], ['ember_vent', 250, 200], ['ember_vent', 110, 210, 'ph2'], ['fire_geyser', 214, 250], ['fire_geyser', 380, 230, 'ph3'],
      ['magma_crack', 190, 232, 'f0'], ['magma_crack', 330, 196, 'f1'], ['magma_crack', 80, 186, 'f2'], ['ash_pile', 280, 142], ['ash_pile', 130, 190], ['ash_pile', 400, 190],
      ['forge_ruin', 104, 256], ['ribcage', 440, 250], ['skull', 404, 252], ['skull', 164, 196], ['skull', 290, 222],
      ['crit_emberfly', 220, 110], ['crit_emberfly', 330, 160], ['crit_emberfly', 80, 220], ['crit_lizard_idle', 300, 180], ['crit_lizard_run', 200, 180], ['crit_lavapop', 400, 76], ['crit_lavapop', 380, 60, 'ph2'],
      ['@char', 240, 170], ['@char', 160, 160],
    ],
  },
];

let chars: Record<string, Sheet> = {}, liquids: Partial<Record<BiomeId, HTMLCanvasElement[]>> = {};
let paintGroundFn: ((ctx: CanvasRenderingContext2D, map: PaintableMap, a: number, b: number, c: number, d: number) => void) | null = null;
function frameOf(name: string, opt: string | undefined, k: number): Px | undefined {
  if (F.has(name) && !F.has(`${name}_0`)) return F.get(name);
  let n = 0; while (F.has(`${name}_${n}`)) n++;
  if (!n) return F.get(name);
  const fixed = opt?.startsWith('f') ? Number(opt.slice(1)) : -1, ph = opt?.startsWith('ph') ? Number(opt.slice(2)) : 0;
  return F.get(`${name}_${fixed >= 0 ? fixed : animate ? (k + ph) % n : ph % n}`);
}
function silhouette(src: HTMLCanvasElement): HTMLCanvasElement {
  // nur deckende Pixel werfen Schatten (Lichtschein nicht)
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const x = c.getContext('2d')!;
  x.drawImage(src, 0, 0); const im = x.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < im.data.length; i += 4) { const a = im.data[i + 3] >= 200; im.data[i] = 0x12; im.data[i + 1] = 0x0c; im.data[i + 2] = 0x20; im.data[i + 3] = a ? 255 : 0; }
  x.putImageData(im, 0, 0); return c;
}
const silCache = new Map<HTMLCanvasElement, HTMLCanvasElement>();
function renderScene(s: Scene, sc: number): HTMLCanvasElement {
  const tiles = new Uint8Array(s.w * s.h).fill(T.GROUND);
  const set = (x: number, y: number, t: number): void => { if (x >= 0 && y >= 0 && x < s.w && y < s.h) tiles[y * s.w + x] = t; };
  const rect = (x: number, y: number, w: number, h: number, t: number): void => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, t); };
  const blob = (cx: number, cy: number, rx: number, ry: number, t: number): void => { for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) set(x, y, t); };
  s.paint(set, rect, blob);
  const map: PaintableMap = { w: s.w, h: s.h, tiles, biome: s.biome, dungeon: false, seed: 4711 };
  const W = s.w * 16, H = s.h * 16;
  const base = document.createElement('canvas'); base.width = W; base.height = H; const bx = base.getContext('2d')!; bx.imageSmoothingEnabled = false;
  bx.fillStyle = s.bg; bx.fillRect(0, 0, W, H);
  const liq = liquids[s.biome]?.[0];
  for (let ty = 0; ty < s.h; ty++) for (let tx = 0; tx < s.w; tx++) if (tiles[ty * s.w + tx] === T.LIQUID) { if (liq) bx.drawImage(liq, (tx * 16) % liq.width, (ty * 16) % liq.height, 16, 16, tx * 16, ty * 16, 16, 16); else { bx.fillStyle = s.biome === 'glut' ? '#f08424' : '#1f8282'; bx.fillRect(tx * 16, ty * 16, 16, 16); } }
  if (paintGroundFn) {
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
      if (FLAT.test(name) || NOSHADOW.test(name)) continue;
      const p = frameOf(name, opt, k); if (!p) continue;
      const c = cv(p); let sil = silCache.get(c); if (!sil) { sil = silhouette(c); silCache.set(c, sil); }
      wx.globalAlpha = 0.28; wx.setTransform(1, 0, -0.42, -0.2, px, py - 1); wx.drawImage(sil, -p.w / 2, -p.h); wx.setTransform(1, 0, 0, 1, 0, 0); wx.globalAlpha = 1;
    }
    for (const [name, px, py, opt] of sorted) {
      if (name.startsWith('@')) {
        const sh = chars.char_waldlaeufer ?? Object.values(chars)[0];
        if (sh) { const f = sh.frames['0']; wx.drawImage(sh.canvas, f.x, f.y, f.w, f.h, px - 16, py - 37, f.w, f.h); }
        else { wx.fillStyle = '#e8d8a0'; wx.fillRect(px - 8, py - 28, 16, 28); wx.strokeStyle = '#1b1424'; wx.strokeRect(px - 7.5, py - 27.5, 15, 27); }
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
  info.textContent = `Bauzeit: kristall ${tKr.toFixed(0)} ms (${kr.length} Frames) · glut ${tGl.toFixed(0)} ms (${gl.length} Frames)`;
  root.append(info);
  for (const e of errs) { const d = document.createElement('div'); d.className = 'err'; d.textContent = e; root.append(d); }
  if (view === 'all' || view === 'sheet') { sheet('Kristallhöhlen – Kontaktbogen (oben Höhlenblau, unten Aschgrau)', kr); sheet('Glutlande – Kontaktbogen', gl); }
  if (view === 'all' || view === 'scenes') {
    try { const t = await import('./tiles/index'); paintGroundFn = t.paintGround; try { liquids = t.buildLiquids(); } catch (e) { console.log('Flüssigkeiten fehlen: ' + String(e)); } } catch (e) { console.log('tiles/index nicht ladbar: ' + String(e)); }
    try { const c = await import('./chars'); for (const k of ['char_waldlaeufer', 'char_krieger']) { try { chars[k] = c.buildCharSheet(k); } catch { /* im Umbau → Rechteck 16×28 */ } } } catch (e) { console.log('chars nicht ladbar: ' + String(e)); }
    for (const s of SCENES) {
      if (onlyScene && s.id !== onlyScene) continue;
      for (const sc of [2, 3]) { if (sceneScale ? Number(sceneScale) !== sc : sc !== 2) continue; h2(`Szene: ${s.title} (${sc}×)`); const r = row(); r.append(renderScene(s, sc)); }
    }
  }
  (window as unknown as { __done: boolean }).__done = true;
}
void main();
