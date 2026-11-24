/**
 * Vorschau der Gegenstands- und Buff-Icons (Kontaktbogen):
 *   /preview-icons.html?only=<teilstring,…> &bg=<hex ohne #> &skills=1
 * Jedes Icon vergrößert (4×) sowie in den Größen der Oberfläche: 48 px (Inventar), 24 px (Listen), 20 px (Handwerks-Chips).
 */
import { iconPx } from './icons';
import { ITEM_ICONS, SKILL_GLYPHS } from './spec';

const q = new URLSearchParams(location.search);
const only = q.get('only'), bg = '#' + (q.get('bg') ?? '1b2036'), skills = q.get('skills') === '1';
const root = document.getElementById('root')!, nav = document.getElementById('nav')!;
for (const [t, h] of [['alle', '?'], ['Welt (0.5/0.6)', '?only=mat_echo,mat_star,tro_,tmap_,elx_stern,elx_gelehrt,elx_laterne,elx_grube,elx_sieben,food_stern,food_kresse,food_fladen,food_wette,uq_'], ['Handwerk', '?only=mat_,potion_,elx_,food_,leg_,recipe,buff_'], ['Essenzen & Kerne', '?only=mat_ess,mat_core'], ['heller Grund', '?bg=d8d2c2'], ['mit Fähigkeiten', '?skills=1']]) { const a = document.createElement('a'); a.href = h; a.textContent = t; nav.append(a); }

const keys: string[] = ITEM_ICONS.map((n) => 'item_' + n);
if (skills) for (const g of SKILL_GLYPHS) keys.push('skill_' + g);
const seen = new Set<string>(), errs: string[] = [];
for (const k of keys) { if (seen.has(k)) errs.push(`doppelter Icon-Key: ${k}`); seen.add(k); }

const row = document.createElement('div'); row.className = 'row'; root.append(row);
let shown = 0;
for (const k of keys) {
  if (only && !only.split(',').some((o) => k.includes(o))) continue;
  const p = iconPx(k, 'light'), src = p.toCanvas();
  let opaque = 0; for (let i = 0; i < p.d.length; i++) if (p.d[i] >>> 24 >= 128) opaque++;
  if (opaque < 40) errs.push(`${k}: fast leer (${opaque} Pixel)`);
  const c = document.createElement('canvas'); c.width = 96 + 8 + 48 + 8 + 24; c.height = 96;
  const x = c.getContext('2d')!; x.imageSmoothingEnabled = false;
  x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
  x.drawImage(src, 0, 0, 96, 96); x.drawImage(src, 104, 0, 48, 48); x.drawImage(src, 160, 0, 24, 24); x.drawImage(src, 160, 30, 20, 20);
  const d = document.createElement('div'); d.className = 'cell'; d.id = `cell-${k}`;
  const s = document.createElement('span'); s.textContent = k;
  d.append(c, s); row.append(d); shown++;
}
const info = document.createElement('div'); info.textContent = `${shown} Icons${errs.length ? ` – ${errs.length} FEHLER` : ''}`; root.prepend(info);
for (const e of errs) { console.log('FEHLER ' + e); const d = document.createElement('div'); d.className = 'err'; d.textContent = e; root.prepend(d); }
console.log(`[icons] ${shown} gezeigt, Fehler: ${errs.length}`);
document.title = 'ready';
