/** Effekt-Sheet (`fx`): weiß/grau für Tint, einige farbig. Weiche Alphaverläufe sind hier erlaubt. */
import { Px, atlasSheet } from './draw';
import { fx2Items } from './fx2';
import { P, INK, WHITE, alpha, mix } from './palette';
import { FX_FRAMES } from './spec';
import type { Sheet } from './spec';

const W = (a: number) => alpha(WHITE, Math.max(0, Math.min(255, Math.round(a))));
const G = (v: number, a = 255) => alpha(mix(INK, WHITE, v), a);

export function buildFx(): Sheet {
  const items: Array<[string, Px]> = [];
  const add = (name: string, w: number, h: number, fn: (p: Px) => void) => { const p = new Px(w, h); fn(p); items.push([name, p]); };

  // Schwungbogen: Sichel um (6,24), Öffnung nach rechts
  for (let k = 0; k < 4; k++) add(`slash_${k}`, 48, 48, (p) => {
    const cx = 4, cy = 24, R = 40;
    const a0 = [-1.25, -1.1, -0.3, 0.5][k], a1 = [-0.2, 1.1, 1.25, 1.3][k], wmax = [6, 10, 7, 3][k], al = [255, 255, 200, 110][k];
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      if (a < a0 || a > a1) continue;
      const t = (a - a0) / (a1 - a0), prof = Math.sin(t * Math.PI) ** 0.7 * (k < 2 ? 0.4 + 0.6 * t : 1 - 0.5 * t), w = wmax * prof;
      const d = R - r;
      if (d < 0 || d > w) continue;
      const e = d / Math.max(0.01, w);
      p.set(x, y, e < 0.35 ? W(al) : e < 0.7 ? G(0.85, al * 0.85) : G(0.7, al * 0.5));
    }
    if (k === 1) for (const [x, y] of [[46, 20], [44, 34], [45, 10]] as const) p.set(x, y, WHITE);
  });
  for (let k = 0; k < 3; k++) add(`thrust_${k}`, 48, 16, (p) => {
    const len = [26, 46, 46][k], x0 = [0, 0, 16][k], al = [255, 255, 150][k];
    for (let x = x0; x < len; x++) { const t = (x - x0) / (len - x0), w = (k === 2 ? 2.5 : 4) * Math.sin(Math.min(1, t * 1.15) * Math.PI) ** 0.6 * (0.3 + 0.7 * t); for (let y = 0; y < 16; y++) { const d = Math.abs(y + 0.5 - 8); if (d <= w) p.set(x, y, d < w * 0.45 ? W(al) : G(0.8, al * 0.6)); } }
    if (k < 2) { p.rect(len - 2, 7, 2, 2, WHITE); for (const y of [2, 13]) for (let x = 4 + k * 8; x < len - 12; x += 3) p.set(x, y, W(140)); }
  });
  add('arrow', 16, 8, (p) => { p.rect(2, 3, 11, 2, P.tan[3]); p.rect(2, 4, 11, 1, P.tan[1]); p.poly([[12, 1], [16, 4], [12, 7]], P.steel[3]); p.rect(12, 3, 3, 1, P.steel[4]); p.poly([[0, 1], [4, 3.5], [0, 3.5]], P.red[3]); p.poly([[0, 7], [4, 4.5], [0, 4.5]], P.red[1]); p.outline(); });
  add('dagger', 12, 6, (p) => { p.rect(1, 2, 3, 2, P.wood[2]); p.rect(4, 1, 1, 4, P.gold[3]); p.poly([[5, 1.5], [11.5, 3], [5, 4.5]], P.steel[3]); p.rect(5, 2, 5, 1, P.steel[4]); p.outline(); });
  for (let k = 0; k < 3; k++) add(`orb_${k}`, 16, 16, (p) => {
    const r = [5, 6, 4.5][k];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x + 0.5 - 8, y + 0.5 - 8); if (d < r - 2) p.set(x, y, WHITE); else if (d < r) p.set(x, y, G(0.86)); else if (d < r + 1.6) p.set(x, y, W(k === 1 ? 130 : 90)); }
    p.rect(6, 5, 2, 2, WHITE); const s = [[2, 3, 13, 12], [13, 2, 2, 13], [8, 0, 8, 15]][k]; p.set(s[0], s[1], WHITE); p.set(s[2], s[3], W(200));
  });
  add('shard', 16, 8, (p) => { p.poly([[1, 4], [5, 1], [15.5, 4], [5, 7]], G(0.8)); p.poly([[1, 4], [5, 1], [15.5, 4]], WHITE); p.line(3, 4, 13, 4, G(0.65)); p.set(0, 4, W(120)); });
  add('rock', 12, 12, (p) => { p.ball(6, 6, 5, 5, [G(0.3), G(0.45), G(0.62), G(0.8), G(0.95)], 0, 4); p.line(4, 6, 6, 8, G(0.35)); p.set(7, 4, G(0.5)); p.outline(G(0.15)); });
  add('spore', 8, 8, (p) => { p.ell(4, 4, 3, 3, G(0.8)); p.ell(3.5, 3.5, 1.8, 1.8, WHITE); p.px([1, 1, 6, 6, 6, 1], W(140)); });
  add('lance', 32, 8, (p) => { for (let x = 0; x < 32; x++) { const t = x / 31, w = 0.6 + 3 * Math.sin(Math.min(1, t * 1.05) * Math.PI) ** 0.5 * t; for (let y = 0; y < 8; y++) { const d = Math.abs(y + 0.5 - 4); if (d <= w) p.set(x, y, d < w * 0.5 ? WHITE : W(150)); } } p.rect(27, 3, 4, 2, WHITE); });
  add('px', 2, 2, (p) => p.rect(0, 0, 2, 2, WHITE));
  add('spark', 8, 8, (p) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const d = Math.hypot(x + 0.5 - 4, y + 0.5 - 4) / 4; if (d < 1) p.set(x, y, W(255 * (1 - d) ** 1.2)); } p.rect(3, 3, 2, 2, WHITE); });
  add('star', 8, 8, (p) => { p.rect(3, 0, 2, 8, W(170)); p.rect(0, 3, 8, 2, W(170)); p.rect(3, 1, 2, 6, WHITE); p.rect(1, 3, 6, 2, WHITE); p.rect(2, 2, 4, 4, W(120)); p.rect(3, 3, 2, 2, WHITE); });
  add('smoke', 16, 16, (p) => { for (const [cx, cy, r] of [[6, 9, 5], [10, 8, 4.5], [8, 5, 4]] as const) for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r; if (d < 1) p.blend(x, y, W(150 * (1 - d * d))); } });
  add('ring', 64, 64, (p) => { for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const d = Math.hypot(x + 0.5 - 32, y + 0.5 - 32); if (d > 31.5 || d < 22) continue; const e = d > 28 ? 1 - Math.abs(d - 29.5) / 2 : (d - 22) / 6 * 0.45; p.set(x, y, W(255 * Math.max(0, Math.min(1, e)))); } });
  add('glow', 128, 128, (p) => { for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) { const d = Math.hypot(x + 0.5 - 64, y + 0.5 - 64) / 64; if (d < 1) p.set(x, y, W(255 * (1 - d) ** 2)); } });
  const shadow = (name: string, w: number, h: number) => add(name, w, h, (p) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const nx = (x + 0.5 - w / 2) / (w / 2), ny = (y + 0.5 - h / 2) / (h / 2), d = nx * nx + ny * ny; if (d < 1) p.set(x, y, alpha(INK, d < 0.55 ? 110 : 70)); } });
  shadow('shadow', 24, 10); shadow('shadow_l', 48, 18);
  add('leaf', 8, 8, (p) => { p.poly([[1, 6], [2, 2], [6, 1], [6, 5], [3, 7]], G(0.85)); p.line(1, 7, 6, 2, G(0.55)); p.rect(3, 2, 2, 1, WHITE); });
  add('snowflake', 6, 6, (p) => { p.rect(2, 0, 2, 6, W(200)); p.rect(0, 2, 6, 2, W(200)); p.rect(2, 2, 2, 2, WHITE); p.px([1, 1, 4, 1, 1, 4, 4, 4], W(150)); });
  add('raindrop', 4, 8, (p) => { p.line(3, 0, 1, 7, W(200)); p.set(1, 6, WHITE); p.set(1, 7, WHITE); p.set(3, 0, W(90)); });
  add('ember', 4, 4, (p) => { p.rect(1, 0, 2, 4, W(170)); p.rect(0, 1, 4, 2, W(170)); p.rect(1, 1, 2, 2, WHITE); });
  add('mote', 4, 4, (p) => { p.rect(1, 1, 2, 2, WHITE); p.px([1, 0, 0, 1, 3, 2, 2, 3], W(110)); });
  add('heal_plus', 8, 8, (p) => { p.rect(3, 1, 2, 6, WHITE); p.rect(1, 3, 6, 2, WHITE); p.rect(2, 0, 4, 8, 0); p.rect(3, 1, 2, 6, WHITE); p.px([3, 0, 4, 0, 3, 7, 4, 7, 0, 3, 0, 4, 7, 3, 7, 4], W(120)); });
  add('rune_circle', 64, 64, (p) => {
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const d = Math.hypot(x + 0.5 - 32, y + 0.5 - 32); if (Math.abs(d - 30) < 1 || Math.abs(d - 23.5) < 0.7) p.set(x, y, WHITE); else if (Math.abs(d - 30) < 2) p.set(x, y, W(90)); else if (d < 23) p.set(x, y, W(22)); }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, x = 32 + Math.cos(a) * 26.8, y = 32 + Math.sin(a) * 26.8; if (i % 3 === 0) { p.rect(Math.round(x) - 1, Math.round(y) - 1, 3, 3, WHITE); } else { p.line(x - Math.cos(a) * 1.5, y - Math.sin(a) * 1.5, x + Math.cos(a) * 1.5, y + Math.sin(a) * 1.5, WHITE); p.set(x + Math.sin(a) * 1.5, y - Math.cos(a) * 1.5, W(180)); } }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 - Math.PI / 2, b = a + (Math.PI * 2) / 3; p.line(32 + Math.cos(a) * 23, 32 + Math.sin(a) * 23, 32 + Math.cos(b) * 23, 32 + Math.sin(b) * 23, W(190)); }
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const d = Math.hypot(x + 0.5 - 32, y + 0.5 - 32); if (Math.abs(d - 8) < 0.8) p.set(x, y, WHITE); }
    p.rect(31, 31, 2, 2, WHITE);
  });
  const marker = (name: string, q: boolean, c: readonly number[]) => add(name, 12, 16, (p) => {
    if (!q) { p.rrect(4, 1, 4, 9, c[3]); p.rect(4, 2, 1, 7, c[4]); p.rect(7, 2, 1, 8, c[2]); p.rect(5, 9, 2, 1, c[2]); p.rrect(4, 12, 4, 3, c[3]); p.set(4, 12, c[4]); }
    else { p.rect(3, 1, 6, 2, c[3]); p.rect(2, 2, 2, 3, c[3]); p.rect(8, 2, 2, 4, c[3]); p.rect(6, 5, 3, 2, c[3]); p.rect(5, 7, 2, 3, c[3]); p.rect(5, 12, 2, 3, c[3]); p.rect(3, 1, 4, 1, c[4]); p.set(2, 2, c[4]); p.rect(9, 3, 1, 3, c[2]); p.set(6, 9, c[2]); p.set(6, 14, c[2]); p.set(5, 12, c[4]); }
    p.outline(INK);
  });
  marker('exclaim', false, P.gold); marker('question', true, P.gold); marker('question_grey', true, P.steel);
  add('bubble', 16, 14, (p) => { p.rrect(1, 1, 14, 9, WHITE); p.rect(2, 9, 12, 1, P.snow[2]); p.poly([[4, 10], [4, 13], [8, 10]], WHITE); for (const x of [4, 7, 10]) p.rect(x, 5, 2, 2, P.steel[1]); p.outline(INK); });
  add('target', 24, 12, (p) => { for (let y = 0; y < 12; y++) for (let x = 0; x < 24; x++) { const nx = (x + 0.5 - 12) / 11.5, ny = (y + 0.5 - 6) / 5.5, d = Math.hypot(nx, ny); if (d <= 1 && d > 0.78) { const a = Math.atan2(ny, nx), seg = Math.abs(Math.sin(a * 2)) > 0.25; if (seg) p.set(x, y, d > 0.88 ? WHITE : W(170)); } } });
  const status = (name: string, fn: (p: Px) => void) => add(name, 8, 8, (p) => { fn(p); p.outline(INK); });
  status('status_burn', (p) => { p.poly([[1.5, 7], [1.5, 4], [4, 0.5], [6.5, 4], [6.5, 7]], P.fire[2]); p.poly([[3, 7], [3, 5], [4, 3], [5, 5], [5, 7]], P.fire[4]); p.set(3, 3, P.fire[3]); });
  status('status_slow', (p) => { p.ell(4, 4, 3, 3, P.blue[3]); p.rect(3, 2, 1, 3, WHITE); p.rect(3, 4, 3, 1, WHITE); p.set(2, 2, P.blue[4]); });
  status('status_stun', (p) => { p.rect(3, 1, 2, 6, P.gold[4]); p.rect(1, 3, 6, 2, P.gold[4]); p.px([2, 2, 5, 2, 2, 5, 5, 5], P.gold[3]); p.rect(3, 3, 2, 2, WHITE); });
  status('status_poison', (p) => { p.poly([[4, 0.5], [6.5, 4.5], [4, 7.5], [1.5, 4.5]], P.green[3]); p.ell(4, 5, 2.4, 2.2, P.green[3]); p.set(3, 4, P.green[4]); p.set(4, 5, P.forest[1]); p.set(3, 5, WHITE); });
  status('status_buff', (p) => { p.poly([[4, 0.5], [7.5, 4], [5.5, 4], [5.5, 7], [2.5, 7], [2.5, 4], [0.5, 4]], P.red[3]); p.rect(3, 3, 1, 4, P.red[4]); p.set(4, 1, P.red[4]); });
  status('status_shield', (p) => { p.poly([[1, 1], [7, 1], [7, 4], [4, 7.5], [1, 4]], P.steel[3]); p.rect(2, 1, 2, 3, P.steel[4]); p.rect(4, 2, 2, 3, P.blue[3]); p.set(3, 5, P.steel[2]); });

  const have = new Set(items.map((i) => i[0]));
  for (const n of FX_FRAMES) if (!have.has(n)) { const p = new Px(8, 8); p.rect(0, 0, 8, 8, P.pink[3]); items.push([n, p]); console.warn('[gfx] fehlender fx-Frame', n); }
  // Der fx-Atlas besteht aus den v2-Effekten; aus v1 bleibt nur der weiche Ring (für Lichtwellen) erhalten.
  const KEEP = new Set(['ring']);
  const merged = new Map<string, Px>(items.filter(([n]) => KEEP.has(n)));
  for (const [n, px] of fx2Items()) merged.set(n, px);
  return atlasSheet([...merged], 1024);
}
