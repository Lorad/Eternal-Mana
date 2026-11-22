/**
 * Vorschau für die Objektmodule "frost", "ruinen" und "schatten" (Kontaktbogen):
 *   /preview-objects3.html?biome=frost|ruinen|schatten &only=<teilstring,…> &anim=1 &scale=<n> &alt=1 (zweiter Hintergrund)
 */
import { Px } from './draw';
import { frostObjects } from './objects/frost';
import { ruinenObjects } from './objects/ruinen';
import { schattenObjects } from './objects/schatten';
import { checkFrames } from './objects/kit';

const q = new URLSearchParams(location.search);
const only = q.get('only'), animate = q.get('anim') === '1', SC = Number(q.get('scale') ?? 3), onlyBiome = q.get('biome'), alt = q.get('alt') === '1';
const root = document.getElementById('root')!, nav = document.getElementById('nav')!;
for (const [t, h] of [['alles', '?'], ['Frost', '?biome=frost'], ['Ruinen', '?biome=ruinen'], ['Schatten', '?biome=schatten'], ['animiert', '?anim=1'], ['2 Hintergründe', '?alt=1']]) { const a = document.createElement('a'); a.href = h; a.textContent = t; nav.append(a); }

type Want = [name: string, frames: number, w: number, h: number];
interface Biome { id: string; title: string; bg: string; bg2: string; build: () => Array<[string, Px]>; want: Want[]; base: Array<[string, number]> }
const BIOMES: Biome[] = [
  {
    id: 'frost', title: 'Frostgebirge', bg: '#e6eef6', bg2: '#9eb4d2', build: frostObjects,
    want: [
      ['pine_snow', 4, 48, 88], ['pine_snow2', 4, 40, 72], ['pine_snow_small', 4, 24, 36], ['birch_bare', 0, 36, 64], ['ice_spike', 0, 16, 28], ['ice_spike_l', 0, 28, 48], ['ice_crystal', 4, 20, 26], ['snow_rock', 0, 24, 18],
      ['snow_rock_l', 0, 38, 28], ['frozen_bush', 0, 22, 18], ['snowman', 0, 18, 26], ['snowdrift', 0, 24, 10], ['icicle_log', 0, 40, 18], ['ice_crack', 0, 24, 14], ['cabin', 0, 80, 100], ['fur_rack', 0, 28, 30], ['sled', 0, 30, 16],
      ['woodpile_snow', 0, 28, 20], ['lantern_frost', 4, 14, 36], ['prayer_flags', 4, 48, 40], ['frozen_statue', 0, 20, 40],
      ['crit_hare_idle', 2, 16, 16], ['crit_hare_hop', 4, 16, 16], ['crit_snowbird_idle', 2, 12, 12], ['crit_snowbird_peck', 2, 12, 12], ['crit_snowbird_fly', 4, 12, 12], ['crit_icesparkle', 2, 5, 5],
    ],
    base: [['pine_snow', 14], ['pine_snow2', 12], ['pine_snow_small', 5], ['ice_crystal', 3], ['lantern_frost', 18], ['prayer_flags', 5]],
  },
  {
    id: 'ruinen', title: 'Verlorene Ruinen', bg: '#c0b472', bg2: '#7c8a4e', build: ruinenObjects,
    want: [
      ['pillar', 0, 18, 52], ['pillar_broken', 0, 18, 30], ['pillar_fallen', 0, 48, 18], ['statue', 0, 24, 52], ['statue_broken', 0, 24, 34], ['rubble', 0, 24, 16], ['arch', 0, 56, 64], ['rune_stone', 4, 20, 32], ['obelisk', 4, 20, 56],
      ['vine_tree', 4, 56, 80], ['cypress', 4, 24, 64], ['urn', 0, 14, 18], ['urn_broken', 0, 16, 12], ['mosaic', 3, 32, 24], ['wall_frag', 0, 48, 30], ['dig_tent', 0, 48, 44], ['dig_table', 0, 32, 24], ['dig_crates', 0, 24, 22],
      ['brazier_blue', 4, 16, 28], ['floating_rune', 4, 12, 16], ['sundial', 0, 24, 20],
      ['crit_wisp', 2, 5, 5], ['crit_scarab_idle', 2, 10, 8], ['crit_scarab_run', 4, 10, 8], ['crit_moth', 4, 8, 8],
    ],
    base: [['rune_stone', 32], ['obelisk', 56], ['vine_tree', 16], ['cypress', 8], ['brazier_blue', 12]],
  },
  {
    id: 'schatten', title: 'Schattenreich', bg: '#281a3c', bg2: '#14203a', build: schattenObjects,
    want: [
      ['twisted_tree', 4, 56, 80], ['void_crystal', 4, 20, 32], ['tombstone', 0, 16, 20], ['tombstone_b', 0, 16, 22], ['shadow_spire', 0, 20, 48], ['shadow_spire_l', 0, 36, 72], ['eye_stalk', 4, 14, 28], ['floating_shard', 4, 16, 28],
      ['tendril', 4, 16, 30], ['void_rift', 4, 28, 40], ['chain_pillar', 0, 20, 52], ['ghost_flower', 4, 12, 16], ['lost_toy', 0, 12, 10], ['last_light', 4, 20, 40], ['broken_arch', 0, 56, 60], ['memory_frame', 0, 20, 26],
      ['crit_shadowmoth', 4, 8, 8], ['crit_eyeling_idle', 2, 10, 10], ['crit_eyeling_run', 4, 10, 10], ['crit_voidspark', 2, 5, 5],
    ],
    base: [['twisted_tree', 30], ['void_crystal', 3], ['eye_stalk', 5], ['tendril', 3], ['ghost_flower', 2], ['last_light', 12]],
  },
];

function h2(t: string): void { const e = document.createElement('h2'); e.textContent = t; root.append(e); }
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

for (const b of BIOMES) {
  if (onlyBiome && onlyBiome !== b.id) continue;
  const t0 = performance.now(), list = b.build(), ms = performance.now() - t0;
  const F = new Map<string, Px>(list), errs = checkFrames(list), exp = new Set<string>();
  if (F.size !== list.length) errs.push('doppelte Framenamen');
  for (const [n, c, w, h] of b.want) {
    for (const fn of c ? Array.from({ length: c }, (_, k) => `${n}_${k}`) : [n]) {
      exp.add(fn);
      const p = F.get(fn);
      if (!p) errs.push(`Frame fehlt: ${fn}`); else if (p.w !== w || p.h !== h) errs.push(`${fn}: ${p.w}×${p.h} statt ${w}×${h}`);
    }
    if (c && F.has(`${n}_${c}`)) errs.push(`${n}: mehr Frames als ${c}`);
    if (c && F.has(n)) errs.push(`${n}: zusätzlich ohne Suffix`);
  }
  const extra = [...F.keys()].filter((n) => !exp.has(n));
  if (extra.length) errs.push(`nicht in der Liste: ${extra.join(', ')}`);
  // Standfläche: Silhouette der untersten Zeilen muss in allen Frames gleich sein
  for (const [n, rows] of b.base) {
    const a = F.get(`${n}_0`); if (!a) continue;
    let diff = 0; for (let f = 1; f < 4; f++) { const o = F.get(`${n}_${f}`); if (!o) continue; for (let y = a.h - rows; y < a.h; y++) for (let x = 0; x < a.w; x++) if ((a.get(x, y) >>> 24 >= 200) !== (o.get(x, y) >>> 24 >= 200)) diff++; }
    if (diff) errs.push(`${n}: ${diff} Pixel der Standfläche ändern die Silhouette (unterste ${rows} Zeilen)`);
  }
  // leere Frames / Pixel am Rand ohne Platz für die Kontur sind verdächtig
  for (const [n, p] of list) { let k = 0; for (let i = 0; i < p.d.length; i++) if (p.d[i] >>> 24) k++; if (k === 0) errs.push(`${n}: leer`); }
  console.log(`[t] ${b.id} ${ms.toFixed(0)} ms, ${list.length} Frames (${exp.size} erwartet), Fehler: ${errs.length}`);
  for (const e of errs) console.log(`FEHLER ${b.id}: ${e}`);
  h2(`${b.title} – ${list.length} Frames, ${ms.toFixed(0)} ms${errs.length ? ` – ${errs.length} FEHLER` : ''}`);
  for (const e of errs) { const d = document.createElement('div'); d.className = 'err'; d.textContent = e; root.append(d); }
  const r = document.createElement('div'); r.className = 'row'; root.append(r);
  for (const g of groups(list)) {
    if (only && !only.split(',').some((o) => g.name.includes(o))) continue;
    const n = animate ? 1 : g.frames.length, w = g.frames[0].w, h = g.frames[0].h, pad = 2, nb = alt ? 2 : 1;
    const c = document.createElement('canvas'); c.width = (w + pad * 2) * n * SC; c.height = (h + pad * 2) * nb * SC;
    const x = c.getContext('2d')!; x.imageSmoothingEnabled = false;
    const cvs = g.frames.map((fr) => fr.toCanvas());
    const draw = (k: number): void => {
      x.fillStyle = b.bg; x.fillRect(0, 0, c.width, c.height);
      if (alt) { x.fillStyle = b.bg2; x.fillRect(0, c.height / 2, c.width, c.height / 2); }
      for (let i = 0; i < n; i++) for (let j = 0; j < nb; j++) x.drawImage(cvs[animate ? k % cvs.length : i], 0, 0, w, h, (i * (w + pad * 2) + pad) * SC, (j * (h + pad * 2) + pad) * SC, w * SC, h * SC);
    };
    draw(0);
    if (animate && g.frames.length > 1) ticks.push(draw);
    const d = document.createElement('div'); d.className = 'cell'; d.id = `cell-${g.name}`;
    const s = document.createElement('span'); s.textContent = `${g.name}${g.frames.length > 1 ? ` ×${g.frames.length}` : ''} ${w}×${h}`;
    d.append(c, s); r.append(d);
  }
}
document.title = 'ready';
