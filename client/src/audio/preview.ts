/** Hörprobe für das Audio-Modul (audio-preview.html). Nicht Teil des Spiels. */
import { audio } from './index';
import * as offline from './offline';
import { AMBIENCE, JINGLES, MUSIC, SFX, type SfxName } from './spec';
import { TRACKS } from './tracks';

const $ = (id: string): HTMLElement => document.getElementById(id)!;

function button(parent: HTMLElement, label: string, id: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  b.id = id;
  b.addEventListener('click', onClick);
  parent.appendChild(b);
  return b;
}

function slider(id: string, get: () => number, set: (v: number) => void): void {
  const el = $(id) as HTMLInputElement;
  const out = $(`${id}-val`);
  el.value = String(get());
  out.textContent = get().toFixed(2);
  el.addEventListener('input', () => {
    set(Number(el.value));
    out.textContent = get().toFixed(2);
  });
}

$('unlock').addEventListener('click', () => {
  audio.unlock();
  $('unlock').textContent = 'Audio entsperrt ✓';
});

const groups: Record<string, SfxName[]> = { ui: [], kampf: [], welt: [] };
let group = 'ui';
for (const name of SFX) {
  if (name === 'swing_light') group = 'kampf';
  if (name === 'step_grass') group = 'welt';
  groups[group].push(name);
}
for (const [g, names] of Object.entries(groups)) {
  for (const name of names) button($(`sfx-${g}`), name, `sfx-${name}`, () => audio.playSfx(name, { pan: Number(($('pan') as HTMLInputElement).value) }));
}

for (const id of MUSIC) button($('music'), `${id} – ${TRACKS[id].title} (${TRACKS[id].key}, ${TRACKS[id].bpm} bpm)`, `music-${id}`, () => audio.playMusic(id));
button($('music'), 'Stille', 'music-none', () => audio.playMusic(null));
for (const id of AMBIENCE) button($('ambience'), id, `amb-${id}`, () => audio.setAmbience(id));
for (const id of JINGLES) button($('jingles'), id, `jingle-${id}`, () => audio.playJingle(id));

slider('vol-music', () => audio.getMusicVolume(), (v) => audio.setMusicVolume(v));
slider('vol-sfx', () => audio.getSfxVolume(), (v) => audio.setSfxVolume(v));

button($('stress'), '24 Treffer in 0,8 s', 'stress-hits', () => {
  const hits: SfxName[] = ['hit_flesh', 'hit_metal', 'hit_crit', 'swing_light', 'hit_magic', 'enemy_die'];
  for (let i = 0; i < 24; i++) window.setTimeout(() => audio.playSfx(hits[i % hits.length], { pan: Math.random() * 2 - 1 }), i * 35);
});

// Für automatische Tests (Playwright): Offline-Rendering und API-Zugriff
(window as unknown as Record<string, unknown>).__audio = audio;
(window as unknown as Record<string, unknown>).__audioOffline = offline;
