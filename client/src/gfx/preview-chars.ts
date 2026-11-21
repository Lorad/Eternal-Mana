/**
 * Figuren-Vorschau: /preview-chars.html
 *   ?only=<teil>   nur Sheets, deren Key den Text enthält (mehrere mit Komma)
 *   ?scale=4       Vergrößerung
 *   ?sec=strips|lineup|sil   nur ein Abschnitt (Standard: alle)
 *   ?anims=attack,heavy      nur diese Animationen in den Streifen;  ?row=0|1|2 nur eine Blickrichtung
 *   ?bg=0|1        nur Wiesen- bzw. nur dunkler Hintergrund
 *   ?anim=1        animierte Ansicht; ?t=<ms> friert sie zu einem Zeitpunkt ein
 */
import { buildCharSheet } from './chars';
import { clipLog } from './chars/rig';
import { CHAR_ANIMS, CHAR_COLS, CHAR_FOOT_Y, CHAR_FRAME_H as FH, CHAR_FRAME_W as FW, CLASS_IDS, NPC_LOOKS } from './spec';
import type { Sheet } from './spec';

const q = new URLSearchParams(location.search);
const SC = Number(q.get('scale') ?? 4);
const only = (q.get('only') ?? '').split(',').filter(Boolean);
const sec = q.get('sec');
const animsF = (q.get('anims') ?? '').split(',').filter(Boolean);
const rowF = q.get('row');
const root = document.getElementById('root')!;
const report = document.getElementById('report')!;
const BG = ['#6aa84a', '#23222c'].filter((_, i) => q.get('bg') === null || Number(q.get('bg')) === i);
const ANIMS = Object.entries(CHAR_ANIMS);

const keys = [...CLASS_IDS.map((c) => `char_${c}`), ...NPC_LOOKS.map((c) => `npc_${c}`)].filter((k) => !only.length || only.some((o) => k.includes(o)));
const sheets: Record<string, Sheet> = {};
const lines: string[] = [];
const t0 = performance.now();
for (const k of keys) { try { sheets[k] = buildCharSheet(k); } catch (e) { lines.push(`${k}: ${(e as Error).message}`); } }
const ms = performance.now() - t0;
lines.unshift(`build ${Object.keys(sheets).length} sheets: ${ms.toFixed(0)} ms`);

function h2(t: string): void { const e = document.createElement('h2'); e.textContent = t; root.append(e); }
function mk(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d')!; x.imageSmoothingEnabled = false; return [c, x];
}
function frame(x: CanvasRenderingContext2D, s: Sheet, idx: number, dx: number, dy: number, sc = SC): void {
  const f = s.frames[String(idx)]; x.drawImage(s.canvas, f.x, f.y, f.w, f.h, dx, dy, f.w * sc, f.h * sc);
}
function silhouette(s: Sheet): HTMLCanvasElement {
  const [c, x] = mk(s.canvas.width, s.canvas.height);
  x.drawImage(s.canvas, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
  return c;
}

// ---- Prüfung: leere Frames, Randberührung, Standlinie
for (const [k, s] of Object.entries(sheets)) {
  const d = s.canvas.getContext('2d')!.getImageData(0, 0, s.canvas.width, s.canvas.height).data, W = s.canvas.width;
  if (s.canvas.width !== FW * CHAR_COLS || s.canvas.height !== FH * 3) lines.push(`${k}: Sheetgröße ${s.canvas.width}x${s.canvas.height}`);
  const a = (x: number, y: number) => d[(y * W + x) * 4 + 3];
  for (let r = 0; r < 3; r++) for (const [name, def] of ANIMS) for (let f = 0; f < def.len; f++) {
    const fx = (def.start + f) * FW, fy = r * FH;
    let n = 0, edge = 0, low = -1;
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) if (a(fx + x, fy + y) > 0) { n++; if (x === 0 || y === 0 || x === FW - 1 || y === FH - 1) edge++; if (y > low) low = y; }
    if (n < 40) lines.push(`${k} r${r} ${name}${f}: fast leer (${n})`);
    if (edge) lines.push(`${k} r${r} ${name}${f}: berührt Rand (${edge})`);
    if (low > CHAR_FOOT_Y - 1) lines.push(`${k} r${r} ${name}${f}: unter Standlinie (y=${low})`);
    if ((name === 'idle' || name === 'walk') && low < CHAR_FOOT_Y - 2 && !k.includes('geist') && !k.includes('echo')) lines.push(`${k} r${r} ${name}${f}: schwebt (y=${low})`);
  }
}
lines.push(...clipLog);
report.textContent = lines.join('\n');

if (q.get('anim')) {
  const tFix = q.get('t');
  const per = 10, cw = FW * SC, ch = FH * SC;
  const views: Array<{ x: CanvasRenderingContext2D; s: Sheet; bg: string }> = [];
  for (const k of keys) {
    if (!sheets[k]) continue;
    h2(k);
    const r = document.createElement('div'); r.className = 'row'; root.append(r);
    for (const bg of BG) {
      const [c, x] = mk(per * cw, 3 * ch); r.append(c); views.push({ x, s: sheets[k], bg });
    }
  }
  const draw = (t: number) => {
    for (const v of views) {
      v.x.fillStyle = v.bg; v.x.fillRect(0, 0, per * cw, 3 * ch);
      ANIMS.forEach(([, def], i) => {
        const n = Math.floor((t * def.fps) / 1000), f = def.loop ? n % def.len : Math.min(def.len - 1, n % (def.len + 4));
        for (let row = 0; row < 3; row++) frame(v.x, v.s, row * CHAR_COLS + def.start + f, i * cw, row * ch);
      });
    }
  };
  if (tFix !== null) draw(Number(tFix)); else { const st = performance.now(); const loop = () => { draw(performance.now() - st); requestAnimationFrame(loop); }; loop(); }
} else {
  if (!sec || sec === 'strips') {
    for (const k of keys) {
      const s = sheets[k]; if (!s) continue;
      h2(k);
      const rows = [0, 1, 2].filter((r) => rowF === null || Number(rowF) === r);
      const an = ANIMS.filter(([n]) => !animsF.length || animsF.includes(n));
      const cols = an.reduce((m, [, d]) => m + d.len, 0);
      for (const bg of BG) {
        const [c, x] = mk(cols * FW * SC + an.length * 4, rows.length * FH * SC + 12);
        x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
        let px = 0;
        for (const [name, def] of an) {
          x.fillStyle = '#fff'; x.font = '10px monospace'; x.fillText(name, px + 2, 10);
          for (let f = 0; f < def.len; f++) {
            rows.forEach((r, ri) => {
              frame(x, s, r * CHAR_COLS + def.start + f, px, 12 + ri * FH * SC);
              x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(px, 12 + ri * FH * SC + CHAR_FOOT_Y * SC, FW * SC, 1);
            });
            px += FW * SC;
          }
          x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(px, 0, 4, c.height); px += 4;
        }
        const d = document.createElement('div'); d.className = 'row'; d.append(c); root.append(d);
      }
    }
  }
  if (!sec || sec === 'lineup' || sec === 'sil') {
    for (const mode of ['lineup', 'sil']) {
      if (sec && sec !== mode) continue;
      h2(mode === 'sil' ? 'Silhouetten' : 'Line-up (idle 0, drei Blickrichtungen)');
      for (const bg of mode === 'sil' ? ['#d8d4c8'] : BG) {
        const [c, x] = mk(keys.length * (FW + 2) * SC, 3 * FH * SC);
        x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
        keys.forEach((k, i) => {
          const s = sheets[k]; if (!s) return;
          const src = mode === 'sil' ? { canvas: silhouette(s), frames: s.frames } : s;
          for (let r = 0; r < 3; r++) frame(x, src, r * CHAR_COLS, i * (FW + 2) * SC, r * FH * SC);
        });
        const d = document.createElement('div'); d.className = 'row'; d.append(c); root.append(d);
      }
    }
  }
}
(window as unknown as { __done: boolean }).__done = true;
