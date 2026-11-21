import { buildBosses } from './bosses';
const root = document.getElementById('root')!;
const { bosses } = buildBosses();
for (const [k, s] of Object.entries(bosses)) {
  const c = document.createElement('canvas'); const sc = 2;
  c.width = s.canvas.width * sc; c.height = s.canvas.height * sc;
  const x = c.getContext('2d')!; x.imageSmoothingEnabled = false; x.drawImage(s.canvas, 0, 0, c.width, c.height);
  const d = document.createElement('div'); d.className = 'cell'; d.append(c, k); root.append(d);
}
(window as any).__done = true;
