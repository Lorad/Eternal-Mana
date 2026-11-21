// Entwickler-Testseite: startet die Spielszene ohne Menüs (dev-game.html?server=localhost:7777&cls=krieger&name=Test)
import { startGame } from './game';
import { net } from './net/net';
import { bus } from './state/bus';
import { live } from './state/live';
import { store } from './state/store';

const q = new URLSearchParams(location.search);
(window as any).__dbg = { store, net, bus, live };
await startGame(document.getElementById('game')!, () => {});
net.connect(q.get('server') ?? '');
let tried = false;
store.subscribe(() => {
  const s = store.state;
  if (s.screen === 'chars' && !tried) {
    tried = true;
    if (s.chars.length) net.enter(s.chars[0].id);
    else net.createChar(0, q.get('name') ?? 'Testheld', (q.get('cls') as any) ?? 'krieger');
  } else if (s.screen === 'chars' && s.chars.length && s.conn === 'online' && !s.char) net.enter(s.chars[0].id);
});
