/**
 * Kontaktbogen für die Effekte v2: /preview-fx.html[?only=<teil>][&anim=1[&t=<ms>]][&scale=n]
 * Streifen je Animation: weiß auf Dunkel · eingefärbt auf Gras · additiv auf Dunkel, daneben eine Figur als Maßstab.
 */
import { buildOverlays, fx2Catalog, fx2Items } from './fx2';
import type { Fx2Entry } from './fx2';
import type { Px } from './draw';

const q = new URLSearchParams(location.search);
const only = q.get('only');
const animMode = q.get('anim') === '1';
const freeze = q.get('t') !== null ? Number(q.get('t')) : null;
const SC = Number(q.get('scale') ?? 0);
const root = document.getElementById('root')!;
const info = document.getElementById('info')!;
const report = document.getElementById('report')!;
window.addEventListener('error', (e) => { report.textContent += `${e.message}\n`; });

const DARK = '#2a3040', GRASS = '#5c9a3e';
const TINTS: Array<[string, string]> = [
  ['slash_sword', '#cfe2ff'], ['slash_heavy', '#ff9a3c'], ['slash_dagger', '#c878ff'], ['thrust', '#ffe27a'], ['claw', '#ff6a5a'], ['bite', '#f4e6c8'],
  ['hit_magic', '#7fe8ff'], ['hit', '#ffd27a'], ['arrow_trail', '#d8fff0'], ['bolt_arcane', '#c878ff'], ['lance', '#ffe27a'],
  ['rune_circle_big', '#ff7ad8'], ['rune_circle', '#7fd8ff'], ['tele_ring', '#ff5a4a'], ['cast', '#7fe8ff'], ['pillar', '#ffe890'], ['buff', '#ffb04a'],
  ['shield', '#8fd8ff'], ['blink', '#c878ff'], ['spawn', '#9c5ed2'], ['death_poof', '#e8e0f8'], ['dust_run', '#dcc49a'], ['dust', '#dcc49a'],
  ['dodge_trail', '#d8fff0'], ['ripple', '#c8f4ff'], ['sparkle', '#fff0a0'], ['footprint', '#3a2a1c'], ['crack', '#ff8a3c'], ['shockwave', '#ffc878'],
  ['smoke', '#8a8494'], ['snowflake', '#eaf6ff'], ['raindrop', '#a8d8ff'], ['rain_splash', '#a8d8ff'], ['ash', '#a09a98'], ['drip', '#8fd0f0'],
  ['heat', '#ffd8a0'], ['godray', '#fff0c0'], ['glow_small', '#ffb060'], ['glow', '#ffd890'], ['target', '#ffe27a'], ['spark', '#ffd27a'], ['star', '#fff0a0'],
  ['mote', '#b8ffd0'], ['px', '#ffffff'],
];
const tintOf = (n: string): string => (TINTS.find(([k]) => n.startsWith(k)) ?? ['', '#7fe8ff'])[1];

const t0 = performance.now();
const items = fx2Items();
const tFx = performance.now() - t0;
const t1 = performance.now();
const overlays = buildOverlays();
const tOv = performance.now() - t1;
const cat = fx2Catalog();
const byName = new Map<string, Px>(items);
info.textContent = `fx2Items ${tFx.toFixed(0)} ms · buildOverlays ${tOv.toFixed(0)} ms · ${items.length} Frames · ${cat.length} Effekte`;
(window as unknown as { __cat: Fx2Entry[] }).__cat = cat;
(window as unknown as { __ms: number[] }).__ms = [tFx, tOv];

const cvCache = new Map<string, HTMLCanvasElement>();
function frameCv(name: string, tint?: string): HTMLCanvasElement {
  const key = `${name}|${tint ?? ''}`;
  let c = cvCache.get(key);
  if (c) return c;
  c = byName.get(name)!.toCanvas();
  if (tint) {
    const x = c.getContext('2d')!;
    x.globalCompositeOperation = 'multiply'; x.fillStyle = tint; x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'destination-in'; x.drawImage(byName.get(name)!.toCanvas(), 0, 0);
  }
  cvCache.set(key, c);
  return c;
}
const framesOf = (e: Fx2Entry): string[] => (e.frames === 0 ? [e.name] : Array.from({ length: e.frames }, (_, i) => `${e.name}_${i}`));
const scaleOf = (e: Fx2Entry): number => SC || (e.w <= 32 && e.h <= 48 ? 4 : e.w <= 64 && e.h <= 64 ? 3 : 2);

// Maßstabsfigur (16×28 im 32×40-Frame); fällt auf ein Rechteck zurück, falls das Figurenmodul gerade nicht baut.
let charCv: HTMLCanvasElement | null = null;
async function loadChar(): Promise<void> {
  try {
    const m = await import('./chars');
    const s = m.buildCharSheet('char_krieger'), f = s.frames['0'];
    const c = document.createElement('canvas'); c.width = f.w; c.height = f.h;
    c.getContext('2d')!.drawImage(s.canvas, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
    charCv = c;
  } catch (err) { report.textContent += `Figur nicht verfügbar (${String(err)}) – Rechteck als Maßstab\n`; }
}
function drawChar(x: CanvasRenderingContext2D, cx: number, footY: number): void {
  if (charCv) x.drawImage(charCv, cx - 16, footY - 37);
  else { x.fillStyle = '#c8a070'; x.fillRect(cx - 8, footY - 28, 16, 28); x.fillStyle = '#5a3a2a'; x.fillRect(cx - 8, footY - 28, 16, 8); }
}

type Mode = 'plain' | 'tint' | 'add';
function panel(e: Fx2Entry, bg: string, mode: Mode, sc: number): HTMLCanvasElement {
  const fr = framesOf(e), pad = 2, chW = 20, H = Math.max(e.h, 30) + pad * 2;
  const c = document.createElement('canvas'); c.width = (chW + fr.length * (e.w + pad) + pad) * sc; c.height = H * sc;
  const x = c.getContext('2d')!; x.imageSmoothingEnabled = false; x.scale(sc, sc);
  x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
  drawChar(x, chW / 2 + 1, H - pad - 1);
  fr.forEach((n, i) => {
    const fx = chW + i * (e.w + pad), fy = H - pad - e.h;
    x.fillStyle = 'rgba(255,255,255,0.045)'; x.fillRect(fx, fy, e.w, e.h);
    x.globalCompositeOperation = mode === 'add' ? 'lighter' : 'source-over';
    x.drawImage(frameCv(n, mode !== 'plain' && e.tintable ? tintOf(e.name) : undefined), fx, fy);
    x.globalCompositeOperation = 'source-over';
  });
  return c;
}

function h2(t: string): void { const e = document.createElement('h2'); e.textContent = t; root.append(e); }
function label(parent: HTMLElement, t: string): void { const s = document.createElement('div'); s.textContent = t; parent.append(s); }

function strips(list: Fx2Entry[]): void {
  for (const e of list) {
    const b = document.createElement('div'); b.className = 'blk'; root.append(b);
    label(b, `${e.name}  ${e.frames || 1}×  ${e.w}×${e.h}  ${e.tintable ? 'TINT' : 'farbig'}`);
    const r = document.createElement('div'); r.className = 'row'; b.append(r);
    const sc = scaleOf(e);
    r.append(panel(e, DARK, 'plain', sc), panel(e, GRASS, e.tintable ? 'tint' : 'plain', sc), panel(e, DARK, 'add', sc));
  }
}

function animGrid(list: Fx2Entry[]): void {
  const g = document.createElement('div'); g.className = 'grid'; root.append(g);
  const cells: Array<{ e: Fx2Entry; x: CanvasRenderingContext2D; sc: number; fr: string[] }> = [];
  for (const e of list) {
    const d = document.createElement('div'); d.className = 'cell'; g.append(d);
    const sc = scaleOf(e), W = Math.max(e.w, 34) + 4, H = Math.max(e.h, 40) + 4;
    const c = document.createElement('canvas'); c.width = W * 2 * sc; c.height = H * sc;
    const x = c.getContext('2d')!; x.imageSmoothingEnabled = false; x.scale(sc, sc);
    d.append(c); label(d, e.name);
    cells.push({ e, x, sc, fr: framesOf(e) });
  }
  const draw = (ms: number): void => {
    const f = Math.floor((ms * 14) / 1000);
    for (const { e, x, fr } of cells) {
      const W = Math.max(e.w, 34) + 4, H = Math.max(e.h, 40) + 4, n = fr[f % fr.length];
      [DARK, GRASS].forEach((bg, i) => {
        x.fillStyle = bg; x.fillRect(i * W, 0, W, H);
        drawChar(x, i * W + W / 2, H - 3);
        x.drawImage(frameCv(n, i === 1 && e.tintable ? tintOf(e.name) : undefined), i * W + Math.round((W - e.w) / 2), H - 2 - e.h);
      });
    }
  };
  if (freeze !== null) draw(freeze);
  else { const loop = (): void => { draw(performance.now()); requestAnimationFrame(loop); }; loop(); }
}

function overlayBlock(): void {
  for (const [name, cv] of Object.entries(overlays)) {
    if (only && !`overlay_${name}`.includes(only)) continue;
    const b = document.createElement('div'); b.className = 'blk'; root.append(b);
    label(b, `overlay ${name} ${cv.width}×${cv.height} – 2×2 gekachelt (Gras | Dunkel)`);
    const r = document.createElement('div'); r.className = 'row'; b.append(r);
    for (const bg of [GRASS, name === 'fog' ? DARK : '#c8b47a']) {
      const c = document.createElement('canvas'); c.width = cv.width * 2; c.height = cv.height * 2;
      const x = c.getContext('2d')!; x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) x.drawImage(cv, i * cv.width, j * cv.height);
      r.append(c);
    }
  }
}

void loadChar().then(() => {
  const list = cat.filter((e) => !only || e.name.includes(only));
  if (animMode) { h2('Animiert (~14 fps): links neutral auf Dunkel, rechts eingefärbt auf Gras'); animGrid(list.filter((e) => e.frames > 1)); }
  else { h2('Streifen: neutral/Dunkel · eingefärbt/Gras · additiv/Dunkel'); strips(list); overlayBlock(); }
  (window as unknown as { __done: boolean }).__done = true;
});
