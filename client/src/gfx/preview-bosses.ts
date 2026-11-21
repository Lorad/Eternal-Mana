/**
 * Boss-Vorschau: /preview-bosses.html
 *   ?only=<teil>[,<teil>]   nur Bosse, deren id den Text enthält
 *   ?scale=2                Vergrößerung der Streifen
 *   ?a=idle,death           nur diese Animationen
 *   ?sec=strips|lineup|sil  nur ein Abschnitt (Standard: alle)
 *   ?bg=<css>               Hintergrund erzwingen
 *   ?anim=1                 animierte Ansicht mit den fps aus BOSS_ANIMS; ?t=<ms> friert sie ein
 */
import { buildBosses } from './bosses';
import { BOSS_ANIMS, BOSS_FRAMES, BOSS_IDS } from './spec';
import type { Sheet, SpriteMeta } from './spec';

const q = new URLSearchParams(location.search);
const SC = Number(q.get('scale') ?? 2);
const only = (q.get('only') ?? '').split(',').filter(Boolean);
const animsOnly = (q.get('a') ?? '').split(',').filter(Boolean);
const sec = q.get('sec');
const root = document.getElementById('root')!;
const report = document.getElementById('report')!;
const BG = q.get('bg') ?? '#3a3b46';
const ids = BOSS_IDS.filter((k) => !only.length || only.some((o) => k.includes(o)));
const names = (Object.keys(BOSS_ANIMS) as (keyof typeof BOSS_ANIMS)[]).filter((n) => !animsOnly.length || animsOnly.includes(n));

const t0 = performance.now();
let bosses: Record<string, Sheet> = {}, meta: Record<string, SpriteMeta> = {};
try { ({ bosses, bossMeta: meta } = buildBosses()); } catch (e) { report.textContent += `buildBosses: ${(e as Error).stack}\n`; }
const ms = performance.now() - t0;
report.style.color = '#9c9';
report.textContent += `buildBosses ${ms.toFixed(0)} ms`;

function h2(t: string): void { const e = document.createElement('h2'); e.textContent = t; root.append(e); }
function row(): HTMLDivElement { const d = document.createElement('div'); d.className = 'row'; root.append(d); return d; }
function cell(parent: HTMLElement, c: HTMLElement, label: string): void { const d = document.createElement('div'); d.className = 'cell'; const s = document.createElement('span'); s.textContent = label; d.append(c, s); parent.append(d); }
function mk(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d')!; x.imageSmoothingEnabled = false; return [c, x]; }

// Prüfungen: Rastergröße, Randberührung, Standlinie (6 px über der Unterkante)
for (const id of ids) {
  const s = bosses[`boss_${id}`], m = meta[id];
  if (!s || !m) { report.textContent += `\nFEHLT ${id}`; continue; }
  if (s.canvas.width !== m.w * BOSS_FRAMES || s.canvas.height !== m.h) report.textContent += `\n${id}: Sheet ${s.canvas.width}x${s.canvas.height} passt nicht zu ${m.w}x${m.h}`;
  const d = s.canvas.getContext('2d')!.getImageData(0, 0, s.canvas.width, s.canvas.height).data;
  const edge: number[] = [], low: number[] = [], bases: number[] = [];
  for (let f = 0; f < BOSS_FRAMES; f++) {
    let e = false, l = false, base = 0;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const a = d[(y * s.canvas.width + f * m.w + x) * 4 + 3];
      if (a < 8) continue;
      if (x === 0 || x === m.w - 1 || y === 0) e = true;
      if (a >= 128) { if (y > m.h - 6) l = true; base = Math.max(base, y); }
    }
    if (e) edge.push(f); if (l) low.push(f); bases.push(m.h - 1 - base);
  }
  if (edge.length) report.textContent += `\n${id}: berührt den Rand in Frames ${edge.join(',')}`;
  if (low.length) report.textContent += `\n${id}: unter der Standlinie in Frames ${low.join(',')}`;
  report.textContent += `\n${id}: Abstand unten je Frame ${bases.join(' ')}`;
}

const SCALE_W = 16, SCALE_H = 28;
if (q.get('anim') === '1') {
  h2('animiert'); const r = row();
  const freeze = q.get('t');
  for (const id of ids) {
    const s = bosses[`boss_${id}`], m = meta[id]; if (!s) continue;
    const [c, x] = mk(m.w * SC * names.length, m.h * SC);
    const draw = (t: number): void => {
      x.fillStyle = BG; x.fillRect(0, 0, c.width, c.height);
      names.forEach((n, k) => { const a = BOSS_ANIMS[n]; const fi = Math.floor((t / 1000) * a.fps) % (a.len + (a.loop ? 0 : 3)); const f = a.start + Math.min(a.len - 1, fi); x.drawImage(s.canvas, f * m.w, 0, m.w, m.h, k * m.w * SC, 0, m.w * SC, m.h * SC); });
    };
    if (freeze) draw(Number(freeze)); else { const loop = (t: number): void => { draw(t); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
    cell(r, c, `${id}: ${names.join(' | ')}`);
  }
} else {
  if (!sec || sec === 'strips') {
    for (const id of ids) {
      const s = bosses[`boss_${id}`], m = meta[id]; if (!s) continue;
      h2(`${id} ${m.w}x${m.h}`);
      const r = row();
      for (const n of names) {
        const a = BOSS_ANIMS[n];
        const [c, x] = mk((a.len * m.w + 20) * SC, m.h * SC);
        x.fillStyle = BG; x.fillRect(0, 0, c.width, c.height);
        x.fillStyle = '#c8383a'; x.fillRect(2 * SC, (m.h - 6 - SCALE_H) * SC, SCALE_W * SC, SCALE_H * SC);
        x.drawImage(s.canvas, a.start * m.w, 0, a.len * m.w, m.h, 20 * SC, 0, a.len * m.w * SC, m.h * SC);
        x.fillStyle = 'rgba(255,255,255,0.10)';
        for (let i = 0; i <= a.len; i++) x.fillRect((20 + i * m.w) * SC, 0, 1, m.h * SC);
        x.fillRect(0, (m.h - 6) * SC, c.width, 1);
        cell(r, c, `${n} ${a.start}–${a.start + a.len - 1}`);
      }
    }
  }
  const lineup = (sil: boolean): void => {
    const sc = 3, H = 132, [c, x] = mk(ids.reduce((a, id) => a + (meta[id]?.w ?? 0) + 2, 26) * sc, H * sc);
    x.fillStyle = sil ? '#d8d4c8' : BG; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = sil ? '#000' : '#c8383a'; x.fillRect(4 * sc, (H - 6 - SCALE_H) * sc, SCALE_W * sc, SCALE_H * sc);
    let px = 24;
    for (const id of ids) {
      const s = bosses[`boss_${id}`], m = meta[id]; if (!s) continue;
      const [t, tx] = mk(m.w, m.h); tx.drawImage(s.canvas, 0, 0, m.w, m.h, 0, 0, m.w, m.h);
      if (sil) { const im = tx.getImageData(0, 0, m.w, m.h); for (let i = 0; i < im.data.length; i += 4) { const on = im.data[i + 3] >= 128; im.data[i] = im.data[i + 1] = im.data[i + 2] = 0; im.data[i + 3] = on ? 255 : 0; } tx.putImageData(im, 0, 0); }
      x.drawImage(t, px * sc, (H - m.h) * sc, m.w * sc, m.h * sc);
      px += m.w + 2;
    }
    cell(root, c, sil ? 'Silhouetten' : 'Line-up (3×) neben dem 16×28-Maßstab');
  };
  if (!sec || sec === 'lineup') { h2('Line-up'); lineup(false); }
  if (!sec || sec === 'sil') { h2('Silhouetten'); lineup(true); }
}
