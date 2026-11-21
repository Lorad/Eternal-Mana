/**
 * Alle Soundeffekte als geschichtete Synthese (siehe synth.ts). Jede Definition beschreibt den Klang
 * relativ zur Startzeit der Stimme; Tonhöhe/Lautstärke/Panorama kommen über die Stimme dazu.
 */
import type { Mixer } from './engine';
import { hz } from './notes';
import type { SfxName, SfxOpts } from './spec';
import { closeVoice, echo, fm, noise, openVoice, send, tone, type Voice } from './synth';

type Def = (s: Voice) => void;
const rnd = (a: number, b: number): number => a + Math.random() * (b - a);

/** Glockiger Arpeggio-Lauf aus FM-Tönen. */
function bells(s: Voice, notes: string[], gap: number, dur: number, vol: number, t0 = 0, ratio = 2): void {
  notes.forEach((n, i) => fm(s, hz(n), ratio, 1.1, dur, vol, { t: t0 + i * gap }));
}

/** Weicher Akkord/Lauf aus Dreieck + leisem Rechteck (klassischer Konsolen-Klang). */
function chip(s: Voice, n: string, t: number, dur: number, vol: number): void {
  const f = hz(n);
  tone(s, 'triangle', f, f, dur, vol, { t, h: dur * 0.5 });
  tone(s, 'square', f, f, dur, vol * 0.35, { t, h: dur * 0.4, lp: 3200 });
}

function thump(s: Voice, f0: number, f1: number, dur: number, vol: number, t = 0): void {
  tone(s, 'sine', f0, f1, dur, vol, { t });
}

const DEFS: Record<SfxName, Def> = {
  // ───────────── UI ─────────────
  ui_click: (s) => {
    tone(s, 'triangle', 1250, 880, 0.05, 0.28);
    noise(s, 'highpass', 4500, 4500, 0.7, 0.012, 0.1);
  },
  ui_hover: (s) => {
    tone(s, 'sine', 1750, 1900, 0.035, 0.09);
  },
  ui_open: (s) => {
    tone(s, 'sine', 520, 780, 0.12, 0.22);
    tone(s, 'triangle', 780, 1170, 0.16, 0.16, { t: 0.05 });
    noise(s, 'bandpass', 1500, 4000, 1, 0.14, 0.05, { a: 0.05 });
    send(s, 0.15);
  },
  ui_close: (s) => {
    tone(s, 'sine', 780, 520, 0.12, 0.22);
    tone(s, 'triangle', 520, 350, 0.16, 0.14, { t: 0.05 });
    noise(s, 'bandpass', 4000, 1200, 1, 0.14, 0.05, { a: 0.02 });
  },
  ui_error: (s) => {
    for (const t of [0, 0.12]) {
      tone(s, 'square', 185, 180, 0.1, 0.16, { t, h: 0.06, lp: 2200 });
      tone(s, 'sawtooth', 131, 127, 0.1, 0.12, { t, h: 0.06, lp: 1800 });
    }
  },
  ui_equip: (s) => {
    fm(s, 700, 2.76, 2, 0.2, 0.22);
    noise(s, 'bandpass', 3000, 2000, 1.5, 0.05, 0.22);
    tone(s, 'triangle', 300, 190, 0.08, 0.25);
    send(s, 0.1);
  },
  ui_tab: (s) => {
    tone(s, 'triangle', 900, 1120, 0.05, 0.2);
    noise(s, 'highpass', 5000, 5000, 0.7, 0.02, 0.06);
  },

  // ───────────── Kampf ─────────────
  swing_light: (s) => {
    noise(s, 'bandpass', 600, 3600, 1.3, 0.15, 0.55, { a: 0.045 });
    noise(s, 'highpass', 5000, 7000, 0.7, 0.1, 0.08, { a: 0.04, t: 0.02 });
  },
  swing_heavy: (s) => {
    noise(s, 'bandpass', 220, 1900, 1.1, 0.28, 0.7, { a: 0.1 });
    noise(s, 'lowpass', 300, 700, 0.7, 0.26, 0.35, { a: 0.1, brown: true });
    tone(s, 'sine', 120, 58, 0.22, 0.22, { a: 0.06 });
  },
  bow_shot: (s) => {
    tone(s, 'triangle', 330, 170, 0.13, 0.32);
    tone(s, 'sawtooth', 165, 150, 0.06, 0.12, { lp: 1800 });
    noise(s, 'bandpass', 2400, 5200, 2, 0.18, 0.3, { a: 0.015, t: 0.01 });
  },
  dagger_throw: (s) => {
    noise(s, 'bandpass', 3000, 6500, 3, 0.13, 0.35, { a: 0.02 });
    fm(s, 1850, 1.41, 1.2, 0.07, 0.12);
  },
  cast_fire: (s) => {
    noise(s, 'bandpass', 380, 2700, 0.8, 0.5, 0.5, { a: 0.09 });
    tone(s, 'sawtooth', 85, 210, 0.42, 0.14, { a: 0.1, lp: 900 });
    for (let i = 0; i < 9; i++) noise(s, 'highpass', rnd(2500, 5000), 3000, 0.7, rnd(0.01, 0.025), rnd(0.12, 0.3), { t: rnd(0.02, 0.46) });
    send(s, 0.15);
  },
  cast_water: (s) => {
    for (let i = 0; i < 7; i++) {
      const f = 1450 * Math.pow(0.86, i);
      tone(s, 'sine', f, f * 1.55, 0.075, 0.24, { t: i * 0.055, a: 0.008 });
    }
    noise(s, 'bandpass', 1400, 450, 2, 0.42, 0.16, { a: 0.03 });
    send(s, 0.25);
  },
  cast_earth: (s) => {
    noise(s, 'lowpass', 320, 70, 0.7, 0.55, 0.9, { brown: true, a: 0.01 });
    thump(s, 82, 36, 0.42, 0.65);
    for (let i = 0; i < 4; i++) noise(s, 'bandpass', rnd(500, 1100), 500, 2, 0.035, 0.22, { t: rnd(0.05, 0.4) });
    send(s, 0.1);
  },
  cast_wind: (s) => {
    noise(s, 'bandpass', 480, 2500, 3, 0.6, 0.6, { a: 0.26 });
    noise(s, 'bandpass', 1600, 700, 5, 0.5, 0.3, { a: 0.16, t: 0.1 });
    noise(s, 'highpass', 6000, 6000, 0.7, 0.5, 0.03, { a: 0.25 });
    send(s, 0.2);
  },
  cast_light: (s) => {
    bells(s, ['c6', 'e6', 'g6', 'c7'], 0.06, 0.5, 0.17);
    tone(s, 'sine', hz('c5'), hz('c5'), 0.5, 0.08, { a: 0.1 });
    noise(s, 'highpass', 8000, 10000, 0.7, 0.5, 0.045, { a: 0.2 });
    send(s, 0.4);
  },
  cast_dark: (s) => {
    tone(s, 'sawtooth', 64, 52, 0.75, 0.32, { a: 0.36, lp: 850 });
    tone(s, 'sawtooth', 66.5, 50.5, 0.75, 0.32, { a: 0.36, lp: 850 });
    tone(s, 'sawtooth', 96, 77.5, 0.75, 0.12, { a: 0.4, lp: 1100 });
    noise(s, 'bandpass', 320, 140, 1, 0.75, 0.3, { a: 0.3, brown: true });
    tone(s, 'sine', 1245, 1175, 0.55, 0.035, { a: 0.2 });
    send(s, 0.3);
  },
  hit_flesh: (s) => {
    thump(s, 165, 55, 0.11, 0.75);
    noise(s, 'lowpass', 1300, 300, 0.7, 0.075, 0.5);
  },
  hit_metal: (s) => {
    fm(s, 520, 2.41, 3, 0.32, 0.26);
    fm(s, 1340, 1.71, 2, 0.2, 0.14);
    noise(s, 'highpass', 4000, 4000, 0.7, 0.03, 0.3);
    thump(s, 200, 90, 0.05, 0.25);
    send(s, 0.12);
  },
  hit_crit: (s) => {
    thump(s, 185, 48, 0.14, 0.8);
    noise(s, 'lowpass', 1500, 300, 0.7, 0.08, 0.45);
    noise(s, 'highpass', 3000, 6500, 0.7, 0.1, 0.35);
    tone(s, 'square', 1568, 2093, 0.11, 0.13, { lp: 5000 });
    fm(s, 2093, 2, 1, 0.28, 0.18, { t: 0.02 });
    send(s, 0.2);
  },
  hit_magic: (s) => {
    tone(s, 'sine', 920, 300, 0.18, 0.3);
    fm(s, 660, 1.5, 2, 0.24, 0.24);
    noise(s, 'bandpass', 2200, 800, 2, 0.16, 0.28);
    send(s, 0.25);
  },
  player_hurt: (s) => {
    tone(s, 'sawtooth', 310, 140, 0.19, 0.3, { lp: 1500 });
    thump(s, 150, 68, 0.13, 0.5);
    noise(s, 'lowpass', 900, 500, 0.7, 0.06, 0.3);
  },
  player_die: (s) => {
    tone(s, 'triangle', 440, 55, 1.0, 0.3, { vib: [6, 0.03], h: 0.3 });
    tone(s, 'sawtooth', 220, 40, 1.0, 0.14, { lp: 800, h: 0.3 });
    noise(s, 'lowpass', 700, 100, 0.7, 0.9, 0.22, { a: 0.05 });
    ['a4', 'f4', 'd4', 'a3'].forEach((n, i) => tone(s, 'sine', hz(n), hz(n), 0.4, 0.14, { t: i * 0.2, a: 0.02 }));
    send(s, 0.35);
  },
  enemy_die: (s) => {
    tone(s, 'square', 420, 80, 0.23, 0.18, { lp: 2500 });
    noise(s, 'bandpass', 1600, 300, 1, 0.26, 0.38);
    noise(s, 'highpass', 2000, 4000, 0.7, 0.12, 0.1, { t: 0.08, a: 0.03 });
  },
  boss_roar: (s) => {
    tone(s, 'sawtooth', 98, 58, 1.25, 0.4, { a: 0.08, h: 0.5, lp: 700, vib: [29, 0.08] });
    tone(s, 'sawtooth', 146, 84, 1.25, 0.24, { a: 0.08, h: 0.5, lp: 1100, vib: [23, 0.1] });
    noise(s, 'bandpass', 450, 190, 0.7, 1.25, 0.9, { a: 0.1, h: 0.45, brown: true });
    noise(s, 'bandpass', 1400, 600, 1, 1.0, 0.1, { a: 0.1, h: 0.3 });
    send(s, 0.35);
  },
  boss_die: (s) => {
    noise(s, 'lowpass', 2600, 80, 0.7, 1.8, 0.45, { h: 0.2 });
    noise(s, 'lowpass', 400, 60, 0.7, 1.9, 0.8, { brown: true, h: 0.3 });
    thump(s, 120, 28, 1.6, 0.65);
    tone(s, 'sawtooth', 110, 35, 1.5, 0.26, { lp: 600, vib: [26, 0.09], h: 0.4 });
    for (let i = 1; i <= 5; i++) {
      thump(s, rnd(80, 110), 38, 0.3, 0.4, i * 0.25);
      noise(s, 'lowpass', 1800, 200, 0.7, 0.2, 0.25, { t: i * 0.25 });
    }
    bells(s, ['d6', 'a5', 'f5', 'd5'], 0.14, 0.9, 0.07, 1.3);
    send(s, 0.4);
  },
  boss_phase: (s) => {
    tone(s, 'sawtooth', 110, 330, 0.6, 0.24, { a: 0.3, lp: 1800 });
    tone(s, 'square', 220, 660, 0.6, 0.1, { a: 0.3, lp: 2600 });
    noise(s, 'bandpass', 400, 3000, 1.5, 0.6, 0.2, { a: 0.4 });
    thump(s, 140, 38, 0.55, 0.75, 0.6);
    noise(s, 'lowpass', 3000, 200, 0.7, 0.5, 0.5, { t: 0.6 });
    fm(s, 220, 1.41, 3, 1.1, 0.2, { t: 0.6 });
    send(s, 0.35);
  },
  dodge: (s) => {
    noise(s, 'bandpass', 1300, 380, 1.5, 0.17, 0.42, { a: 0.02 });
    tone(s, 'sine', 620, 300, 0.1, 0.07);
  },
  explosion: (s) => {
    noise(s, 'lowpass', 4200, 120, 0.7, 0.85, 0.5, { h: 0.05 });
    noise(s, 'lowpass', 320, 80, 0.7, 0.95, 0.9, { brown: true, h: 0.1 });
    thump(s, 115, 30, 0.6, 0.8);
    noise(s, 'highpass', 2000, 2000, 0.7, 0.03, 0.45);
    send(s, 0.25);
  },
  freeze: (s) => {
    fm(s, 2400, 1.48, 1.5, 0.42, 0.15);
    fm(s, 3200, 2.3, 1, 0.32, 0.1, { t: 0.05 });
    noise(s, 'highpass', 6000, 9000, 0.7, 0.36, 0.2, { a: 0.1 });
    for (let i = 0; i < 6; i++) noise(s, 'highpass', 5000, 5000, 0.7, 0.012, 0.22, { t: rnd(0.02, 0.32) });
    tone(s, 'sine', 2000, 3000, 0.3, 0.06);
    send(s, 0.3);
  },
  shock: (s) => {
    tone(s, 'sawtooth', 950, 120, 0.08, 0.2);
    for (let i = 0; i < 5; i++) noise(s, 'bandpass', rnd(2500, 4500), 3000, 0.7, 0.03, 0.4, { t: i * 0.045 + rnd(0, 0.01) });
    tone(s, 'square', 58, 50, 0.26, 0.2, { lp: 3000, vib: [61, 0.5], h: 0.12 });
  },
  heal: (s) => {
    ['c5', 'e5', 'g5', 'c6'].forEach((n, i) => tone(s, 'sine', hz(n), hz(n), 0.34, 0.17, { t: i * 0.08, a: 0.02 }));
    ['c6', 'g6'].forEach((n, i) => fm(s, hz(n), 2, 0.5, 0.5, 0.06, { t: 0.3 + i * 0.07 }));
    send(s, 0.4);
  },
  buff: (s) => {
    tone(s, 'triangle', 300, 900, 0.36, 0.22, { a: 0.05 });
    tone(s, 'sawtooth', 150, 450, 0.36, 0.09, { a: 0.05, lp: 2000 });
    bells(s, ['a5', 'e6'], 0.08, 0.4, 0.13, 0.26);
    send(s, 0.3);
  },
  shield_block: (s) => {
    fm(s, 300, 1.83, 4, 0.26, 0.36);
    thump(s, 200, 88, 0.1, 0.5);
    noise(s, 'bandpass', 2500, 2500, 1, 0.05, 0.4);
    send(s, 0.15);
  },
  telegraph: (s) => {
    for (const t of [0, 0.13]) {
      tone(s, 'square', 740, 740, 0.1, 0.12, { t, h: 0.06, lp: 4000 });
      tone(s, 'sine', 1480, 1480, 0.1, 0.06, { t, h: 0.06 });
    }
  },

  // ───────────── Welt ─────────────
  step_grass: (s) => {
    noise(s, 'bandpass', 1900, 900, 0.8, 0.06, 0.1, { a: 0.008 });
  },
  step_stone: (s) => {
    noise(s, 'bandpass', 2600, 2200, 2, 0.035, 0.1);
    tone(s, 'sine', 185, 120, 0.03, 0.08);
  },
  step_snow: (s) => {
    noise(s, 'bandpass', 950, 480, 1.5, 0.09, 0.13, { a: 0.015 });
    noise(s, 'highpass', 4000, 4000, 0.7, 0.03, 0.035, { t: 0.01 });
  },
  step_ash: (s) => {
    noise(s, 'lowpass', 750, 280, 0.7, 0.085, 0.14, { a: 0.01 });
  },
  pickup_item: (s) => {
    tone(s, 'triangle', 660, 990, 0.08, 0.22);
    tone(s, 'triangle', 990, 1320, 0.11, 0.2, { t: 0.06 });
  },
  pickup_gold: (s) => {
    fm(s, 2100, 1.5, 1, 0.15, 0.18);
    fm(s, 2800, 1.5, 1, 0.28, 0.18, { t: 0.07 });
    noise(s, 'highpass', 7000, 7000, 0.7, 0.02, 0.1);
  },
  pickup_rare: (s) => {
    bells(s, ['e5', 'g#5', 'b5', 'e6'], 0.07, 0.45, 0.16);
    tone(s, 'sine', hz('e4'), hz('e4'), 0.5, 0.08, { a: 0.05 });
    echo(s, 0.12, 0.35, 0.4);
    send(s, 0.35);
  },
  potion: (s) => {
    noise(s, 'bandpass', 1500, 1500, 3, 0.02, 0.25);
    [250, 215, 300].forEach((f, i) => tone(s, 'sine', f, f * 2.1, 0.08, 0.3, { t: 0.05 + i * 0.1, a: 0.01 }));
    fm(s, 1760, 2, 0.6, 0.35, 0.07, { t: 0.36 });
    send(s, 0.15);
  },
  levelup: (s) => {
    const run = ['c5', 'e5', 'g5', 'c6', 'e6', 'g6'];
    run.forEach((n, i) => chip(s, n, i * 0.085, 0.16, 0.15));
    for (const n of ['c6', 'e6', 'g6', 'c7']) chip(s, n, 0.53, 0.75, 0.09);
    tone(s, 'triangle', hz('c3'), hz('c3'), 0.5, 0.25, { h: 0.3 });
    tone(s, 'triangle', hz('c4'), hz('c4'), 0.75, 0.2, { t: 0.53, h: 0.3 });
    bells(s, ['g6', 'c7', 'e7'], 0.07, 0.6, 0.06, 0.6);
    echo(s, 0.17, 0.3, 0.3);
    send(s, 0.35);
  },
  quest_accept: (s) => {
    chip(s, 'g4', 0, 0.14, 0.2);
    chip(s, 'c5', 0.12, 0.34, 0.2);
    fm(s, hz('c6'), 2, 0.8, 0.4, 0.08, { t: 0.12 });
    send(s, 0.25);
  },
  quest_progress: (s) => {
    tone(s, 'sine', 880, 880, 0.09, 0.16);
    tone(s, 'sine', 1175, 1175, 0.18, 0.15, { t: 0.07 });
    send(s, 0.2);
  },
  quest_complete: (s) => {
    // Kadenz IV – V – I in C mit steigender Oberstimme a → h → c
    const chords: [string[], string, number, number][] = [
      [['f4', 'a4', 'c5', 'a5'], 'f2', 0, 0.24],
      [['g4', 'b4', 'd5', 'b5'], 'g2', 0.22, 0.24],
      [['c5', 'e5', 'g5', 'c6'], 'c3', 0.44, 0.9],
    ];
    for (const [notes, bass, t, dur] of chords) {
      for (const n of notes) chip(s, n, t, dur, 0.1);
      tone(s, 'triangle', hz(bass), hz(bass), dur, 0.26, { t, h: dur * 0.5 });
    }
    bells(s, ['g6', 'c7'], 0.09, 0.7, 0.07, 0.5);
    send(s, 0.35);
  },
  chest_open: (s) => {
    tone(s, 'sawtooth', 70, 132, 0.36, 0.2, { a: 0.05, h: 0.15, lp: 900, vib: [18, 0.15] });
    noise(s, 'bandpass', 600, 1250, 6, 0.36, 0.3, { a: 0.1 });
    thump(s, 140, 70, 0.09, 0.4, 0.35);
    bells(s, ['g6', 'c7', 'e7', 'g7'], 0.06, 0.5, 0.1, 0.4);
    noise(s, 'highpass', 8000, 8000, 0.7, 0.4, 0.035, { t: 0.4, a: 0.05 });
    send(s, 0.35);
  },
  door_open: (s) => {
    tone(s, 'sawtooth', 60, 96, 0.5, 0.22, { a: 0.06, h: 0.2, lp: 700, vib: [14, 0.2] });
    noise(s, 'lowpass', 420, 300, 0.7, 0.5, 0.4, { a: 0.1, brown: true });
    thump(s, 92, 50, 0.13, 0.45, 0.5);
    noise(s, 'lowpass', 900, 300, 0.7, 0.06, 0.25, { t: 0.5 });
    send(s, 0.2);
  },
  door_locked: (s) => {
    for (const t of [0, 0.07, 0.17]) {
      noise(s, 'bandpass', 1800, 1800, 3, 0.03, 0.35, { t });
      fm(s, 400, 2.3, 3, 0.05, 0.18, { t });
    }
    thump(s, 120, 80, 0.06, 0.3);
  },
  lever: (s) => {
    noise(s, 'bandpass', 1200, 1200, 2, 0.03, 0.4);
    tone(s, 'square', 200, 120, 0.05, 0.18, { lp: 1500 });
    for (let i = 1; i <= 3; i++) noise(s, 'bandpass', 2200, 2200, 4, 0.012, 0.2, { t: i * 0.04 });
    thump(s, 112, 60, 0.1, 0.5, 0.18);
    noise(s, 'lowpass', 1000, 400, 0.7, 0.05, 0.3, { t: 0.18 });
  },
  plate: (s) => {
    noise(s, 'lowpass', 520, 150, 0.7, 0.26, 0.7, { a: 0.03, brown: true });
    thump(s, 92, 60, 0.2, 0.4);
    noise(s, 'bandpass', 2000, 2000, 2, 0.02, 0.2, { t: 0.2 });
  },
  puzzle_solved: (s) => {
    bells(s, ['d5', 'f#5', 'a5', 'b5', 'd6', 'f#6'], 0.08, 0.5, 0.13);
    for (const n of ['d4', 'a4', 'f#5']) tone(s, 'sine', hz(n), hz(n), 0.9, 0.07, { t: 0.4, a: 0.2 });
    echo(s, 0.18, 0.35, 0.35);
    send(s, 0.45);
  },
  secret: (s) => {
    ['b4', 'f5', 'a5', 'e6'].forEach((n, i) => {
      tone(s, 'sine', hz(n), hz(n), 0.3, 0.16, { t: i * 0.11, a: 0.01 });
      tone(s, 'triangle', hz(n), hz(n), 0.2, 0.08, { t: i * 0.11 });
    });
    fm(s, hz('e7'), 2, 0.6, 0.6, 0.05, { t: 0.44 });
    echo(s, 0.16, 0.4, 0.4);
    send(s, 0.4);
  },
  teleport: (s) => {
    tone(s, 'sine', 200, 2400, 0.46, 0.2, { a: 0.1 });
    tone(s, 'sawtooth', 100, 1200, 0.46, 0.07, { a: 0.1, lp: 3000 });
    noise(s, 'bandpass', 500, 6000, 2, 0.5, 0.3, { a: 0.3 });
    fm(s, 1800, 1.5, 3, 0.3, 0.15, { t: 0.45 });
    echo(s, 0.09, 0.4, 0.35);
    send(s, 0.4);
  },
  trap: (s) => {
    noise(s, 'highpass', 2500, 2500, 0.7, 0.04, 0.55);
    fm(s, 900, 2.7, 4, 0.16, 0.28);
    tone(s, 'sawtooth', 520, 100, 0.12, 0.22, { lp: 3000 });
    thump(s, 130, 60, 0.1, 0.4, 0.03);
  },
  splash: (s) => {
    noise(s, 'bandpass', 1000, 380, 0.7, 0.46, 0.65, { a: 0.01 });
    noise(s, 'highpass', 3000, 5000, 0.7, 0.26, 0.22, { a: 0.03, t: 0.03 });
    [520, 700, 430].forEach((f, i) => tone(s, 'sine', f, f * 1.7, 0.06, 0.12, { t: 0.18 + i * 0.08, a: 0.01 }));
    send(s, 0.15);
  },
  collect_shard: (s) => {
    fm(s, 1760, 2, 1, 0.5, 0.18);
    fm(s, 2637, 2, 1, 0.5, 0.14, { t: 0.08 });
    fm(s, 3520, 2, 0.8, 0.7, 0.12, { t: 0.16 });
    tone(s, 'sine', 220, 440, 0.42, 0.1, { a: 0.2 });
    echo(s, 0.15, 0.35, 0.35);
    send(s, 0.5);
  },
  harvest: (s) => {
    noise(s, 'bandpass', 2600, 1200, 1, 0.12, 0.3, { a: 0.02 });
    tone(s, 'triangle', 500, 760, 0.06, 0.2, { t: 0.08 });
  },
  wall_break: (s) => {
    noise(s, 'lowpass', 850, 100, 0.7, 0.7, 0.9, { brown: true, h: 0.05 });
    noise(s, 'lowpass', 3000, 300, 0.7, 0.3, 0.35);
    thump(s, 100, 34, 0.42, 0.7);
    for (let i = 0; i < 8; i++) noise(s, 'bandpass', rnd(400, 1500), 400, 2, 0.04, rnd(0.15, 0.35), { t: rnd(0.1, 0.8) });
    send(s, 0.25);
  },
  upgrade_success: (s) => {
    fm(s, 600, 2.41, 3, 0.3, 0.28);
    noise(s, 'highpass', 3500, 3500, 0.7, 0.03, 0.3);
    bells(s, ['a5', 'c#6', 'e6', 'a6'], 0.07, 0.5, 0.14, 0.16);
    noise(s, 'highpass', 8000, 9000, 0.7, 0.4, 0.03, { t: 0.3, a: 0.1 });
    send(s, 0.35);
  },
  upgrade_fail: (s) => {
    fm(s, 400, 1.37, 4, 0.2, 0.28);
    noise(s, 'lowpass', 1500, 400, 0.7, 0.3, 0.2, { t: 0.02 });
    ['e4', 'eb4', 'b3'].forEach((n, i) => tone(s, 'square', hz(n), hz(n) * 0.97, 0.16, 0.14, { t: 0.14 + i * 0.13, lp: 1500, h: 0.06 }));
  },
  buy: (s) => {
    fm(s, 1900, 1.5, 1, 0.12, 0.16);
    fm(s, 2500, 1.5, 1, 0.2, 0.16, { t: 0.08 });
    tone(s, 'triangle', 660, 880, 0.1, 0.16, { t: 0.14 });
  },
  sell: (s) => {
    fm(s, 2500, 1.5, 1, 0.12, 0.16);
    fm(s, 1900, 1.5, 1, 0.2, 0.16, { t: 0.08 });
    tone(s, 'triangle', 880, 660, 0.1, 0.16, { t: 0.14 });
  },
  chat: (s) => {
    tone(s, 'sine', 1320, 1320, 0.05, 0.12);
    tone(s, 'sine', 1760, 1760, 0.08, 0.1, { t: 0.05 });
  },
  dialog_blip: (s) => {
    tone(s, 'square', 440, 440, 0.04, 0.1, { lp: 2500, h: 0.015 });
  },
};

/** Pegelabgleich einzelner Effekte (aus den Offline-Messungen), damit leise Kampfgeräusche neben der Musik bestehen. */
const GAIN: Partial<Record<SfxName, number>> = {
  ui_click: 1.3, ui_hover: 1.3, ui_tab: 1.3,
  swing_light: 1.7, swing_heavy: 1.5, bow_shot: 1.7, dagger_throw: 2, dodge: 2, enemy_die: 1.7,
  hit_flesh: 1.35, hit_metal: 1.35, hit_magic: 1.4, player_hurt: 1.3,
  step_grass: 1.8, step_stone: 1.4, step_snow: 1.4, step_ash: 1.8,
  pickup_item: 1.4, harvest: 1.4, chat: 1.3, dialog_blip: 1.2, quest_progress: 1.3,
  boss_roar: 0.9, boss_die: 0.9, boss_phase: 0.85, levelup: 0.9, quest_complete: 0.9,
};

/** Baut einen Effekt bei Zeit `t` auf dem Mixer (auch im OfflineAudioContext nutzbar). Liefert die Endzeit. */
export function renderSfx(m: Mixer, name: SfxName, t: number, opts: SfxOpts = {}, onDone?: () => void): number {
  const def = DEFS[name];
  if (!def) return t;
  const pitch = (opts.pitch ?? 1) * (1 + (Math.random() * 2 - 1) * 0.04);
  const vol = Math.min(1, Math.max(0, opts.volume ?? 1)) * (GAIN[name] ?? 1);
  const s = openVoice(m, t, { dest: m.sfxIn, wet: m.sfxWetIn, volume: vol, pitch, pan: opts.pan });
  def(s);
  return closeVoice(s, onDone);
}

const MIN_GAP = 0.035;
const MAX_VOICES = 24;

/** Live-Abspieler mit Ratenbegrenzung und Stimmen-Obergrenze. */
export class SfxPlayer {
  private voices = 0;
  private readonly last = new Map<SfxName, number>();
  constructor(private readonly m: Mixer) {}

  play(name: SfxName, opts?: SfxOpts): void {
    const now = this.m.ctx.currentTime;
    const prev = this.last.get(name);
    if (prev !== undefined && now - prev < MIN_GAP) return;
    if (this.voices >= MAX_VOICES) return;
    this.last.set(name, now);
    this.voices++;
    renderSfx(this.m, name, now + 0.005, opts, () => {
      this.voices--;
    });
  }
}
