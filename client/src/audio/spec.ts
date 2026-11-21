/**
 * VERTRAG für das Audio-Modul (client/src/audio). Sämtlicher Ton wird per WebAudio synthetisiert – keine Audiodateien.
 */
export const SFX = [
  // UI
  'ui_click', 'ui_hover', 'ui_open', 'ui_close', 'ui_error', 'ui_equip', 'ui_tab',
  // Kampf
  'swing_light', 'swing_heavy', 'bow_shot', 'dagger_throw',
  'cast_fire', 'cast_water', 'cast_earth', 'cast_wind', 'cast_light', 'cast_dark',
  'hit_flesh', 'hit_metal', 'hit_crit', 'hit_magic',
  'player_hurt', 'player_die', 'enemy_die', 'boss_roar', 'boss_die', 'boss_phase',
  'dodge', 'explosion', 'freeze', 'shock', 'heal', 'buff', 'shield_block', 'telegraph',
  // Welt
  'step_grass', 'step_stone', 'step_snow', 'step_ash',
  'pickup_item', 'pickup_gold', 'pickup_rare', 'potion',
  'levelup', 'quest_accept', 'quest_progress', 'quest_complete',
  'chest_open', 'door_open', 'door_locked', 'lever', 'plate', 'puzzle_solved', 'secret',
  'teleport', 'trap', 'splash', 'collect_shard', 'harvest', 'wall_break',
  'upgrade_success', 'upgrade_fail', 'buy', 'sell', 'chat', 'dialog_blip',
] as const;
export type SfxName = (typeof SFX)[number];

export const MUSIC = [
  'menu',        // ruhig, sehnsuchtsvoll – Titelthema
  'gruenwald',   // warm, pastoral, beschwingt
  'kristall',    // glitzernd, geheimnisvoll, hallig
  'glut',        // treibend, bedrohlich, perkussiv
  'frost',       // weit, klar, melancholisch
  'ruinen',      // rätselhaft, modal, antik
  'schatten',    // düster, dissonant, pulsierend
  'dungeon',     // gespannt, minimalistisch
  'boss',        // schnell, dramatisch
  'final_boss',  // episch, steigert das Titelthema
] as const;
export type MusicId = (typeof MUSIC)[number];

export const AMBIENCE = ['none', 'forest', 'cave', 'volcano', 'blizzard', 'ruins', 'void', 'dungeon', 'village'] as const;
export type AmbienceId = (typeof AMBIENCE)[number];

export const JINGLES = ['victory', 'defeat', 'discovery'] as const;
export type JingleId = (typeof JINGLES)[number];

export interface SfxOpts {
  /** 0..1, Standard 1 */
  volume?: number;
  /** Tonhöhen-Faktor, Standard 1; das Modul variiert zusätzlich leicht zufällig */
  pitch?: number;
  /** Stereo-Position -1..1 */
  pan?: number;
}

export interface AudioApi {
  /** Muss nach der ersten Nutzergeste aufgerufen werden (AudioContext entsperren). Mehrfachaufruf unschädlich. */
  unlock(): void;
  playSfx(name: SfxName, opts?: SfxOpts): void;
  /** Wechselt mit ~1,5 s Crossfade; gleicher Track = keine Aktion. null = Stille. */
  playMusic(id: MusicId | null): void;
  setAmbience(id: AmbienceId): void;
  /** Kurzes Musikstück über der (kurz abgesenkten) Musik. */
  playJingle(id: JingleId): void;
  setMusicVolume(v: number): void;   // 0..1
  setSfxVolume(v: number): void;     // 0..1 (gilt auch für Ambience)
  getMusicVolume(): number;
  getSfxVolume(): number;
}
