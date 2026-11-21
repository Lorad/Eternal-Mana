import { audio } from './audio';
import { startGame } from './game';
import { settings } from './state/settings';
import { store } from './state/store';
import { mountUi } from './ui';

audio.setMusicVolume(settings.musicVolume);
audio.setSfxVolume(settings.sfxVolume);
const unlock = () => audio.unlock();
window.addEventListener('pointerdown', unlock, { passive: true });
window.addEventListener('keydown', unlock);
window.addEventListener('contextmenu', e => e.preventDefault());

mountUi(document.getElementById('ui')!);
startGame(document.getElementById('game')!, p => store.set({ bootProgress: p }))
  .then(() => { store.set({ screen: 'menu', bootProgress: 1 }); audio.playMusic('menu'); })
  .catch(e => { console.error(e); store.set({ error: 'Das Spiel konnte nicht gestartet werden: ' + (e?.message ?? e) }); });
