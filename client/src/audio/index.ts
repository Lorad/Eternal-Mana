/**
 * Audio-Modul von Eternal Mana. Alles wird zur Laufzeit per WebAudio synthetisiert.
 * Öffentliche Schnittstelle: `audio` (siehe spec.ts). Jeder Aufruf ist vor `unlock()` gefahrlos.
 */
import { AmbienceManager } from './ambience';
import { clamp, createMixer, DEFAULT_MUSIC_VOLUME, DEFAULT_SFX_VOLUME, setMusicVolume, setSfxVolume, type Mixer } from './engine';
import { MusicManager } from './music';
import { SfxPlayer } from './sfx';
import type { AmbienceId, AudioApi, JingleId, MusicId, SfxName, SfxOpts } from './spec';

export * from './spec';

const TICK_MS = 50;

class AudioEngine implements AudioApi {
  private ctx: AudioContext | null = null;
  private mixer: Mixer | null = null;
  private music: MusicManager | null = null;
  private sfx: SfxPlayer | null = null;
  private ambience: AmbienceManager | null = null;
  private musicVol = DEFAULT_MUSIC_VOLUME;
  private sfxVol = DEFAULT_SFX_VOLUME;
  private wantMusic: MusicId | null = null;
  private wantAmbience: AmbienceId = 'none';
  private failed = false;

  unlock(): void {
    this.safe(() => {
      if (!this.ctx) this.init();
      if (this.ctx && this.ctx.state === 'suspended' && !this.hidden()) void this.ctx.resume().catch(() => undefined);
    });
  }

  playSfx(name: SfxName, opts?: SfxOpts): void {
    this.safe(() => {
      if (this.sfx && this.ctx && this.ctx.state === 'running') this.sfx.play(name, opts);
    });
  }

  playMusic(id: MusicId | null): void {
    this.wantMusic = id;
    this.safe(() => this.music?.play(id));
  }

  setAmbience(id: AmbienceId): void {
    this.wantAmbience = id;
    this.safe(() => this.ambience?.set(id));
  }

  playJingle(id: JingleId): void {
    this.safe(() => {
      if (this.music && this.ctx && this.ctx.state === 'running') this.music.jingle(id);
    });
  }

  setMusicVolume(v: number): void {
    this.musicVol = clamp(Number.isFinite(v) ? v : 0, 0, 1);
    this.safe(() => this.mixer && setMusicVolume(this.mixer, this.musicVol));
  }

  setSfxVolume(v: number): void {
    this.sfxVol = clamp(Number.isFinite(v) ? v : 0, 0, 1);
    this.safe(() => this.mixer && setSfxVolume(this.mixer, this.sfxVol));
  }

  getMusicVolume(): number {
    return this.musicVol;
  }

  getSfxVolume(): number {
    return this.sfxVol;
  }

  private hidden(): boolean {
    return typeof document !== 'undefined' && document.visibilityState === 'hidden';
  }

  private init(): void {
    if (this.failed || typeof window === 'undefined') return;
    const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) {
      this.failed = true;
      return;
    }
    try {
      this.ctx = new Ctor({ latencyHint: 'interactive' });
    } catch {
      this.failed = true;
      return;
    }
    this.mixer = createMixer(this.ctx, this.musicVol, this.sfxVol);
    this.music = new MusicManager(this.mixer);
    this.sfx = new SfxPlayer(this.mixer);
    this.ambience = new AmbienceManager(this.mixer);
    this.music.play(this.wantMusic);
    this.ambience.set(this.wantAmbience);
    window.setInterval(() => this.safe(() => {
      this.music?.tick();
      this.ambience?.tick();
    }), TICK_MS);
    document.addEventListener('visibilitychange', () => this.safe(() => {
      if (!this.ctx) return;
      if (this.hidden()) void this.ctx.suspend().catch(() => undefined);
      else void this.ctx.resume().catch(() => undefined);
    }));
  }

  private safe(fn: () => void): void {
    try {
      fn();
    } catch (err) {
      if (typeof console !== 'undefined') console.warn('[audio]', err);
    }
  }
}

export const audio: AudioApi = new AudioEngine();
