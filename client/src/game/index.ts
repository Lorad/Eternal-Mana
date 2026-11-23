/** Startet Phaser, lädt die Grafik-Assets und verbindet Netzwerkereignisse mit der Spielszene. */
import Phaser from 'phaser';
import type { ZoneInit } from '../../../shared/src/types';
import { loadGfx } from '../gfx/runtime';
import { bus } from '../state/bus';
import './cinematic';
import { GameScene } from './GameScene';
import { initInput } from './input';
import { registerTextures } from './textures';

const nextFrame = () => new Promise<void>(r => requestAnimationFrame(() => r()));

export async function startGame(parent: HTMLElement, onProgress: (p: number) => void): Promise<void> {
  onProgress(0.05);
  await nextFrame();
  // Grafiken aus den exportierten Sheets und Atlanten laden (client/public/assets, erzeugt von `npm run assets`)
  const gfx = await loadGfx(p => onProgress(0.05 + p * 0.8));
  await nextFrame();
  let booted!: () => void;
  const bootDone = new Promise<void>(r => (booted = r));
  class Boot extends Phaser.Scene {
    constructor() { super('boot'); }
    create() { registerTextures(this, gfx); booted(); }
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent, pixelArt: true, antialias: false, roundPixels: true, backgroundColor: '#07080d', banner: false,
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    audio: { noAudio: true }, input: { keyboard: false, gamepad: false },
    disableContextMenu: true,
    scene: [Boot, GameScene],
  });
  await bootDone;
  onProgress(0.95);
  initInput(parent);
  const scene = (): GameScene | null => (game.scene.isActive('game') ? (game.scene.getScene('game') as GameScene) : null);
  const enter = (init: ZoneInit) => { game.scene.stop('game'); game.scene.start('game', { init, gfx }); };
  bus.on('net:entered', enter);
  bus.on('net:zone', enter);
  bus.on('net:snap', m => scene()?.onSnap(m));
  bus.on('net:pos', m => scene()?.onPos(m));
  bus.on('net:drop+', d => scene()?.onDrop(d));
  bus.on('net:drop-', (id, got) => scene()?.onDropGone(id, got));
  bus.on('net:left', () => game.scene.stop('game'));
  // Filmszenen (0.3)
  bus.on('cine:pan', s => scene()?.cinePan(s));
  bus.on('cine:flash', (c, ms) => scene()?.cineFlash(c, ms));
  bus.on('cine:shake', (i, ms) => scene()?.cineShake(i, ms));
  bus.on('cine:end', () => scene()?.cineEnd());
  (window as any).__em = { game };
  onProgress(1);
}
