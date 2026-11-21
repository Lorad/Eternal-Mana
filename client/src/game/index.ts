/** Startet Phaser, erzeugt die prozeduralen Grafiken und verbindet Netzwerkereignisse mit der Spielszene. */
import Phaser from 'phaser';
import type { ZoneInit } from '../../../shared/src/types';
import { buildGfx } from '../gfx';
import { bus } from '../state/bus';
import { GameScene } from './GameScene';
import { initInput } from './input';
import { registerTextures } from './textures';

const nextFrame = () => new Promise<void>(r => requestAnimationFrame(() => r()));

export async function startGame(parent: HTMLElement, onProgress: (p: number) => void): Promise<void> {
  onProgress(0.1);
  await nextFrame(); await nextFrame();
  const gfx = buildGfx();
  onProgress(0.6);
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
  (window as any).__em = { game };
  onProgress(1);
}
