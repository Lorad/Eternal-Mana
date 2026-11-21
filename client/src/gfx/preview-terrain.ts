/**
 * Terrain-Vorschau: rendert Ausschnitte der ECHTEN Karten über paintGround – chunkweise, genau wie das Spiel.
 *
 *   /preview-terrain.html?map=gruenwald&cx=52&cy=54&w=40&h=22.5&zoom=2
 *     map     gruenwald | wurzelgruft | jede Zonen-ID
 *     cx, cy  Mittelpunkt in Kacheln (Standard: Kartenstart)
 *     w, h    Ausschnitt in Kacheln (Standard 40 × 22.5 = 640 × 360 Weltpixel)
 *     zoom    ganzzahliger Zoom (Standard 2)
 *     decor=1 Deko-Sprites der Karte aus dem Objekt-Atlas darüberlegen (y-sortiert, Anker unten Mitte)
 *     chunks=1  Chunk-Grenzen einzeichnen;  grid=1  Kachelraster;  kinds=1  Kachelarten als Buchstaben
 *     f=0..7  Flüssigkeits-Frame;  anim=1  Flüssigkeit animieren;  noliquid=1  Flüssigkeit weglassen (Magenta)
 *     poke=x,y,w,h,t;…  Kacheln in einer Kopie der Karte überschreiben (z. B. Becken im Dungeon testen)
 *     perf=1  Zeitmessung: ganze Karte + synthetische 128×128-Karte
 *     seamtest=1  Nahtprobe: Spiel-Chunks gegen versetzte Aufteilung, zählt abweichende Pixel
 *     liquid=1  Kontaktbogen der Flüssigkeits-Frames (3×3 gekachelt)
 *   window.__spots() liefert interessante Orte der Karte (Brücken, Gefahrenfelder, Räume …).
 */
import { getMap } from '../../../shared/src/maps/mapgen';
import { buildObjects } from './objects/index';
import type { PaintableMap, Sheet } from './spec';
import { buildLiquids, paintGround } from './tiles/index';

const q = new URLSearchParams(location.search);
const num = (k: string, d: number): number => (q.has(k) ? Number(q.get(k)) : d);
const TILE = 16, C = 32;
const view = document.getElementById('view') as HTMLCanvasElement;
const info = document.getElementById('info')!;
const done = (): void => { (window as unknown as { __done: boolean }).__done = true; };

const map0 = getMap(q.get('map') ?? 'gruenwald');
/** poke=x,y,w,h,t;… überschreibt in einer KOPIE der Karte Rechtecke mit Kachelart t (zum Testen seltener Kacheln). */
const map = q.has('poke') ? { ...map0, tiles: map0.tiles.slice() } : map0;
for (const part of (q.get('poke') ?? '').split(';')) {
  const [x, y, w, h, t] = part.split(',').map(Number);
  if (part && [x, y, w, h, t].every(Number.isFinite)) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) map.tiles[j * map.w + i] = t;
}
const pm: PaintableMap = { w: map.w, h: map.h, tiles: map.tiles, biome: map.biome, dungeon: map.dungeon, seed: map.seed, rooms: map.rooms };
const liquids = buildLiquids()[map.biome];

(window as unknown as { __spots: () => unknown }).__spots = () => {
  const count = (t: number): Array<[number, number]> => { const o: Array<[number, number]> = []; for (let i = 0; i < map.tiles.length; i++) if (map.tiles[i] === t) o.push([i % map.w, (i / map.w) | 0]); return o; };
  const cluster = (pts: Array<[number, number]>, r: number): Array<{ x: number; y: number; n: number }> => {
    const out: Array<{ x: number; y: number; n: number; sx: number; sy: number }> = [];
    for (const [x, y] of pts) { const c = out.find((o) => Math.abs(o.x - x) <= r && Math.abs(o.y - y) <= r); if (c) { c.n++; c.sx += x; c.sy += y; c.x = Math.round(c.sx / c.n); c.y = Math.round(c.sy / c.n); } else out.push({ x, y, n: 1, sx: x, sy: y }); }
    return out.map(({ x, y, n }) => ({ x, y, n }));
  };
  return { w: map.w, h: map.h, start: [map.start.x / 16, map.start.y / 16], bridges: cluster(count(7), 5), hazards: cluster(count(8), 4).filter((c) => c.n > 3), liquid: cluster(count(6), 8), meadow: cluster(count(2), 8).filter((c) => c.n > 30), rooms: map.rooms, labels: map.labels };
};

/** Malt Chunk (cx,cy) genau wie GameScene.buildWorld. */
const chunkCache = new Map<string, HTMLCanvasElement>();
function chunk(cx: number, cy: number): HTMLCanvasElement {
  const key = `${cx},${cy}`;
  let cv = chunkCache.get(key);
  if (cv) return cv;
  const x1 = Math.min(map.w, cx + C), y1 = Math.min(map.h, cy + C);
  cv = document.createElement('canvas');
  cv.width = (x1 - cx) * TILE; cv.height = (y1 - cy) * TILE;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(-cx * TILE, -cy * TILE);
  paintGround(ctx, pm, cx, cy, x1, y1);
  chunkCache.set(key, cv);
  return cv;
}

function liquidSheet(): void {
  const n = liquids.length, s = liquids[0].width, z = num('zoom', 2);
  view.width = n * (s * 3 + 4) * z; view.height = s * 3 * z;
  const x = view.getContext('2d')!; x.imageSmoothingEnabled = false;
  liquids.forEach((fr, k) => { for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) x.drawImage(fr, (k * (s * 3 + 4) + i * s) * z, j * s * z, s * z, s * z); });
  done();
}

/** Nahtprobe: derselbe Ausschnitt einmal aus den Spiel-Chunks (0/32/64 …) und einmal mit versetzter Aufteilung – muss pixelgleich sein. */
function seamTest(): void {
  const a0 = 16, n = Math.min(64, map.w - a0 - 1, map.h - a0 - 1), S = n * TILE;
  const A = document.createElement('canvas'); A.width = S; A.height = S;
  const ax = A.getContext('2d', { willReadFrequently: true })!;
  for (let cy = 0; cy < a0 + n; cy += C) for (let cx = 0; cx < a0 + n; cx += C) ax.drawImage(chunk(cx, cy), (cx - a0) * TILE, (cy - a0) * TILE);
  const B = document.createElement('canvas'); B.width = S; B.height = S;
  const bx = B.getContext('2d', { willReadFrequently: true })!;
  bx.translate(-a0 * TILE, -a0 * TILE);
  paintGround(bx, pm, a0, a0, a0 + n, a0 + n);
  const da = ax.getImageData(0, 0, S, S).data, db = bx.getImageData(0, 0, S, S).data;
  let diff = 0;
  const where: string[] = [];
  for (let i = 0; i < da.length; i += 4) if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2] || da[i + 3] !== db[i + 3]) { diff++; if (where.length < 12) where.push(`${a0 * TILE + ((i / 4) % S)},${a0 * TILE + Math.floor(i / 4 / S)}`); }
  // zweiter Durchlauf derselben Aufteilung: Determinismus
  const B2 = document.createElement('canvas'); B2.width = S; B2.height = S;
  const b2 = B2.getContext('2d', { willReadFrequently: true })!;
  b2.translate(-a0 * TILE, -a0 * TILE);
  paintGround(b2, pm, a0, a0, a0 + n, a0 + n);
  const dc = b2.getImageData(0, 0, S, S).data;
  let diff2 = 0;
  for (let i = 0; i < db.length; i++) if (db[i] !== dc[i]) diff2++;
  info.textContent = `Nahtprobe ${map.id}: ${diff} abweichende Pixel von ${S * S} (versetzte Chunk-Aufteilung), ${diff2} abweichende Bytes bei Wiederholung${where.length ? ' – Weltpixel: ' + where.join(' ') : ''}`;
  console.log('[seam] ' + info.textContent);
  view.width = S; view.height = S; view.getContext('2d')!.drawImage(B, 0, 0);
  done();
}

function perf(): void {
  const lines: string[] = [];
  let t0 = performance.now();
  for (let cy = 0; cy < map.h; cy += C) for (let cx = 0; cx < map.w; cx += C) chunk(cx, cy);
  lines.push(`${map.id} ${map.w}x${map.h}: ${(performance.now() - t0).toFixed(0)} ms`);
  // synthetische 128×128-Karte: echte Karte gespiegelt fortgesetzt
  const W = 128, tiles = new Uint8Array(W * W);
  const mir = (v: number, n: number): number => { v %= 2 * n; return v < n ? v : 2 * n - 1 - v; };
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) tiles[y * W + x] = map.tiles[mir(y, map.h) * map.w + mir(x, map.w)];
  const big: PaintableMap = { w: W, h: W, tiles, biome: map.biome, dungeon: map.dungeon, seed: map.seed, rooms: map.rooms };
  for (let run = 0; run < 2; run++) {
    t0 = performance.now();
    for (let cy = 0; cy < W; cy += C) for (let cx = 0; cx < W; cx += C) {
      const cv = document.createElement('canvas'); cv.width = C * TILE; cv.height = C * TILE;
      const ctx = cv.getContext('2d')!; ctx.translate(-cx * TILE, -cy * TILE);
      paintGround(ctx, big, cx, cy, cx + C, cy + C);
    }
    lines.push(`synthetisch 128x128 (${map.id}), Lauf ${run + 1}: ${(performance.now() - t0).toFixed(0)} ms`);
  }
  info.textContent = lines.join('\n');
  console.log('[perf] ' + lines.join(' | '));
  done();
}

function render(): void {
  const z = Math.max(1, Math.round(num('zoom', 2)));
  const tw = num('w', 40), th = num('h', 22.5);
  const ctrX = num('cx', map.start.x / TILE), ctrY = num('cy', map.start.y / TILE);
  const px0 = Math.round(Math.max(0, Math.min(map.w - tw, ctrX - tw / 2)) * TILE), py0 = Math.round(Math.max(0, Math.min(map.h - th, ctrY - th / 2)) * TILE);
  const pw = Math.round(Math.min(tw, map.w) * TILE), ph = Math.round(Math.min(th, map.h) * TILE);
  const world = document.createElement('canvas'); world.width = pw; world.height = ph;
  const x = world.getContext('2d')!; x.imageSmoothingEnabled = false;
  view.width = pw * z; view.height = ph * z;
  const vx = view.getContext('2d')!; vx.imageSmoothingEnabled = false;
  let obj: Sheet | null = null;
  if (q.get('decor') === '1') { try { obj = buildObjects(); } catch (e) { console.warn('Objekt-Atlas nicht verfügbar', e); } }
  const FLAT = new Set(['flowers_a', 'flowers_b', 'mushrooms', 'bones', 'skull', 'glowshroom', 'plate_up', 'plate_down']);
  const t0 = performance.now();
  const draw = (f: number): void => {
    x.clearRect(0, 0, pw, ph);
    if (q.get('noliquid') === '1') { x.fillStyle = '#ff00ff'; x.fillRect(0, 0, pw, ph); }
    else {
      const lq = liquids[f % liquids.length], s = lq.width;
      for (let ly = Math.floor(py0 / s) * s; ly < py0 + ph; ly += s) for (let lx = Math.floor(px0 / s) * s; lx < px0 + pw; lx += s) x.drawImage(lq, lx - px0, ly - py0);
    }
    for (let cy = Math.floor(py0 / TILE / C) * C; cy * TILE < py0 + ph; cy += C) for (let cx = Math.floor(px0 / TILE / C) * C; cx * TILE < px0 + pw; cx += C) {
      if (cx >= map.w || cy >= map.h) continue;
      x.drawImage(chunk(cx, cy), cx * TILE - px0, cy * TILE - py0);
    }
    if (obj) {
      const list = map.decor.map((d) => { const fr = obj!.frames[d.f] ?? obj!.frames[d.f + '_0']; return { d, fr, flat: FLAT.has(d.f) }; }).filter((s) => s.fr && s.d.x > px0 - 80 && s.d.x < px0 + pw + 80 && s.d.y > py0 - 20 && s.d.y < py0 + ph + 140);
      list.sort((a, b) => (a.flat ? -1e6 : a.d.y) - (b.flat ? -1e6 : b.d.y));
      for (const s of list) x.drawImage(obj.canvas, s.fr.x, s.fr.y, s.fr.w, s.fr.h, Math.round(s.d.x - s.fr.w / 2) - px0, s.d.y - s.fr.h - py0, s.fr.w, s.fr.h);
    }
    vx.clearRect(0, 0, view.width, view.height);
    vx.drawImage(world, 0, 0, pw * z, ph * z);
    if (q.get('grid') === '1') { vx.strokeStyle = 'rgba(255,255,255,.25)'; vx.lineWidth = 1; for (let gx = Math.ceil(px0 / TILE) * TILE; gx < px0 + pw; gx += TILE) { vx.beginPath(); vx.moveTo((gx - px0) * z + 0.5, 0); vx.lineTo((gx - px0) * z + 0.5, ph * z); vx.stroke(); } for (let gy = Math.ceil(py0 / TILE) * TILE; gy < py0 + ph; gy += TILE) { vx.beginPath(); vx.moveTo(0, (gy - py0) * z + 0.5); vx.lineTo(pw * z, (gy - py0) * z + 0.5); vx.stroke(); } }
    if (q.get('kinds') === '1') { vx.font = `${5 * z}px monospace`; vx.fillStyle = 'rgba(255,255,255,.8)'; const L = '.gmpfWLBH'; for (let ty = Math.floor(py0 / TILE); ty * TILE < py0 + ph; ty++) for (let tx = Math.floor(px0 / TILE); tx * TILE < px0 + pw; tx++) if (tx < map.w && ty < map.h) vx.fillText(L[map.tiles[ty * map.w + tx]], (tx * TILE - px0 + 5) * z, (ty * TILE - py0 + 11) * z); }
    if (q.get('chunks') === '1') { vx.strokeStyle = 'rgba(255,0,255,.9)'; vx.lineWidth = 1; const S = C * TILE; for (let gx = Math.ceil(px0 / S) * S; gx < px0 + pw; gx += S) { vx.beginPath(); vx.moveTo((gx - px0) * z - 0.5, 0); vx.lineTo((gx - px0) * z - 0.5, 12 * z); vx.moveTo((gx - px0) * z - 0.5, ph * z - 12 * z); vx.lineTo((gx - px0) * z - 0.5, ph * z); vx.stroke(); } for (let gy = Math.ceil(py0 / S) * S; gy < py0 + ph; gy += S) { vx.beginPath(); vx.moveTo(0, (gy - py0) * z - 0.5); vx.lineTo(12 * z, (gy - py0) * z - 0.5); vx.moveTo(pw * z - 12 * z, (gy - py0) * z - 0.5); vx.lineTo(pw * z, (gy - py0) * z - 0.5); vx.stroke(); } }
  };
  draw(num('f', 0));
  info.textContent = `${map.id} ${map.w}x${map.h}  Ausschnitt ${px0 / TILE},${py0 / TILE} +${pw / TILE}x${ph / TILE}  zoom ${z}  ${(performance.now() - t0).toFixed(0)} ms`;
  if (q.get('anim') === '1') { let f = 0; setInterval(() => draw(++f), 230); }
  done();
}

try {
  if (q.get('liquid') === '1') liquidSheet(); else if (q.get('perf') === '1') perf(); else if (q.get('seamtest') === '1') seamTest(); else render();
} catch (e) {
  info.textContent = 'FEHLER: ' + (e as Error).stack;
  console.error(e);
  done();
}
