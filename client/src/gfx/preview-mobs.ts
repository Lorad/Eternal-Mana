/**
 * Gegner-Vorschau: /preview-mobs.html
 *   ?only=<teil>[,<teil>]  nur Gegner, deren id den Text enthält
 *   ?scale=4               Vergrößerung der Streifen
 *   ?sec=strips|lineup|sil nur ein Abschnitt (Standard: alle)
 *   ?wrap=1                Streifen in zwei Zeilen (12 + 10 Frames) – für Screenshots
 *   ?bg=<css>              Hintergrund erzwingen
 *   ?anim=1                animierte Ansicht mit den fps aus MOB_ANIMS; ?t=<ms> friert sie zu einem Zeitpunkt ein
 */
import { buildMobs } from './mobs';
import { MOB_ANIMS, MOB_FRAMES, MOB_IDS } from './spec';
import type { Sheet, SpriteMeta } from './spec';

const q = new URLSearchParams(location.search);
const SC = Number(q.get('scale') ?? 4);
const only = (q.get('only') ?? '').split(',').filter(Boolean);
const sec = q.get('sec');
const wrap = q.get('wrap') === '1';
const root = document.getElementById('root')!;
const report = document.getElementById('report')!;
const GRASS = '#6aa84a', CAVE = '#1c2233', SNOW = '#e9eef5', EMBER = '#3a2a2c', SAND = '#b8aa74', VOID = '#1d1430';
const BG: Record<string, string> = {
  moosling: GRASS, dornkaefer: GRASS, pilzling: GRASS, waldwolf: GRASS, wurzelschleicher: GRASS,
  fledermaus: CAVE, kristallkrabbler: CAVE, glimmerwisp: CAVE, tropfschleim: CAVE,
  glutimp: EMBER, aschenhund: EMBER, magmaschleim: EMBER, schlackengolem: EMBER,
  frostwolf: SNOW, eiswicht: SNOW, schneebrute: SNOW, frostwisp: SNOW,
  runenwaechter: SAND, skelettkrieger: SAND, fluchgeist: SAND, arkanauge: SAND,
  schattenwandler: VOID, leerenbrut: VOID, nachtmahr: VOID, hohlritter: VOID,
};
const ANIMS = Object.entries(MOB_ANIMS);
const ids = MOB_IDS.filter((k) => !only.length || only.some((o) => k.includes(o)));

const t0 = performance.now();
let mobs: Record<string, Sheet> = {}, meta: Record<string, SpriteMeta> = {};
try { ({ mobs, mobMeta: meta } = buildMobs()); } catch (e) { report.textContent += `buildMobs: ${(e as Error).stack}\n`; }
const ms = performance.now() - t0;
report.style.color = '#9c9';
report.textContent += `buildMobs ${ms.toFixed(0)} ms`;

function h2(t: string): void { const e = document.createElement('h2'); e.textContent = t; root.append(e); }
function row(): HTMLDivElement { const d = document.createElement('div'); d.className = 'row'; root.append(d); return d; }
function cell(parent: HTMLElement, c: HTMLElement, label: string): void { const d = document.createElement('div'); d.className = 'cell'; const s = document.createElement('span'); s.textContent = label; d.append(c, s); parent.append(d); }
function mk(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d')!; x.imageSmoothingEnabled = false; return [c, x]; }
const bgOf = (id: string): string => q.get('bg') ?? BG[id] ?? GRASS;

// Prüfungen: Rasterbreite, Randberührung, Bodenlinie
for (const id of ids) {
  const s = mobs[`mob_${id}`], m = meta[id];
  if (!s || !m) { report.textContent += `\nFEHLT ${id}`; continue; }
  if (s.canvas.width !== m.w * MOB_FRAMES || s.canvas.height !== m.h) report.textContent += `\n${id}: Sheet ${s.canvas.width}x${s.canvas.height} passt nicht zu ${m.w}x${m.h}`;
  const d = s.canvas.getContext('2d')!.getImageData(0, 0, s.canvas.width, s.canvas.height).data;
  const edge: number[] = [], low: number[] = [];
  for (let f = 0; f < MOB_FRAMES; f++) {
    let e = false, l = false;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const a = d[(y * s.canvas.width + f * m.w + x) * 4 + 3];
      if (a < 128) continue;
      if (x === 0 || x === m.w - 1 || y === 0) e = true;
      if (y > m.h - 4) l = true;
    }
    if (e) edge.push(f); if (l) low.push(f);
  }
  if (edge.length) report.textContent += `\n${id}: berührt den Rand in Frames ${edge.join(',')}`;
  if (low.length) report.textContent += `\n${id}: unter der Bodenlinie in Frames ${low.join(',')}`;
}

if (q.get('anim') === '1') {
  h2('animiert'); const r = row();
  const names = Object.keys(MOB_ANIMS) as (keyof typeof MOB_ANIMS)[];
  const freeze = q.get('t');
  for (const id of ids) {
    const s = mobs[`mob_${id}`], m = meta[id]; if (!s) continue;
    const [c, x] = mk(m.w * SC * names.length, m.h * SC);
    const draw = (t: number): void => {
      x.fillStyle = bgOf(id); x.fillRect(0, 0, c.width, c.height);
      names.forEach((n, k) => { const a = MOB_ANIMS[n]; const fi = Math.floor((t / 1000) * a.fps) % (a.len + (a.loop ? 0 : 3)); const f = a.start + Math.min(a.len - 1, fi); x.drawImage(s.canvas, f * m.w, 0, m.w, m.h, k * m.w * SC, 0, m.w * SC, m.h * SC); });
    };
    if (freeze) draw(Number(freeze)); else { const loop = (t: number): void => { draw(t); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
    cell(r, c, `${id}: ${names.join(' | ')}`);
  }
} else {
  if (!sec || sec === 'strips') {
    h2('Streifen: idle 4 | move 6 | windup 2 | attack 3 | hit 2 | death 5');
    for (const id of ids) {
      const s = mobs[`mob_${id}`], m = meta[id]; if (!s) continue;
      const rows = wrap ? [[0, 12], [12, 22]] : [[0, 22]];
      const cols = Math.max(...rows.map((r) => r[1] - r[0]));
      const [c, x] = mk(cols * m.w * SC, rows.length * m.h * SC);
      x.fillStyle = bgOf(id); x.fillRect(0, 0, c.width, c.height);
      rows.forEach(([a, b], ri) => {
        x.drawImage(s.canvas, a * m.w, 0, (b - a) * m.w, m.h, 0, ri * m.h * SC, (b - a) * m.w * SC, m.h * SC);
        x.fillStyle = 'rgba(0,0,0,0.35)';
        for (const [, an] of ANIMS) if (an.start > a && an.start < b) x.fillRect((an.start - a) * m.w * SC, ri * m.h * SC, 1, m.h * SC);
        x.fillStyle = 'rgba(0,0,0,0.12)';
        x.fillRect(0, ri * m.h * SC + (m.h - 3) * SC, (b - a) * m.w * SC, 1);
      });
      cell(root, c, `${id} ${m.w}x${m.h}`);
    }
  }
  const lineup = (sil: boolean): void => {
    const sc = 3, [c, x] = mk(ids.reduce((a, id) => a + (meta[id]?.w ?? 0) + 2, 40) * sc, 60 * sc);
    const grd = x.createLinearGradient(0, 0, c.width, 0); grd.addColorStop(0, GRASS); grd.addColorStop(0.5, '#59606e'); grd.addColorStop(1, SNOW);
    x.fillStyle = sil ? '#d8d4c8' : grd; x.fillRect(0, 0, c.width, c.height);
    let px = 4;
    const tmp = (src: CanvasImageSource, sx: number, sw: number, sh: number): HTMLCanvasElement => {
      const [t, tx] = mk(sw, sh); tx.drawImage(src, sx, 0, sw, sh, 0, 0, sw, sh);
      if (sil) { const im = tx.getImageData(0, 0, sw, sh); for (let i = 0; i < im.data.length; i += 4) { const on = im.data[i + 3] >= 128; im.data[i] = im.data[i + 1] = im.data[i + 2] = 0; im.data[i + 3] = on ? 255 : 0; } tx.putImageData(im, 0, 0); }
      return t;
    };
    const hero = (): void => {
      // Maßstab: Spielfigur 16×28 (Sheet 32×40, Standpunkt y=37); Ersatz: Rechteck
      import('./chars').then((ch) => { const s = ch.buildCharSheet('char_krieger'); x.drawImage(tmp(s.canvas, 0, 32, 40), 2 * sc, (57 - 37) * sc, 32 * sc, 40 * sc); })
        .catch(() => { x.fillStyle = sil ? '#000' : '#c8383a'; x.fillRect(10 * sc, (57 - 28) * sc, 16 * sc, 28 * sc); });
    };
    hero(); px = 38;
    for (const id of ids) {
      const s = mobs[`mob_${id}`], m = meta[id]; if (!s) continue;
      x.drawImage(tmp(s.canvas, 0, m.w, m.h), px * sc, (60 - m.h) * sc, m.w * sc, m.h * sc);
      px += m.w + 2;
    }
    cell(root, c, sil ? 'Silhouetten' : 'Line-up (3×) neben der 16×28-Figur');
  };
  if (!sec || sec === 'lineup') { h2('Line-up'); lineup(false); }
  if (!sec || sec === 'sil') { h2('Silhouetten'); lineup(true); }
}
