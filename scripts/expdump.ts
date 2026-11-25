// Gibt eine Expeditionskarte als ASCII aus und prüft sie:  npx tsx scripts/expdump.ts [exp_gruenwald]
import { EXPEDITION_LIST } from '../shared/src/data/expeditions';
import { getMap } from '../shared/src/maps/mapgen';
import { validateExpedition } from '../shared/src/maps/expedition';
import { T, TILE } from '../shared/src/maps/tiles';

const want = process.argv[2];
for (const x of EXPEDITION_LIST) {
  if (want && want !== x.id) continue;
  const t0 = performance.now();
  const m = getMap(x.id);
  const errs = validateExpedition(m);
  console.log(`${x.id}: ${m.w}×${m.h}, ${m.exp!.sections.length} Abschnitte, ${m.spawns.length} Gegner, ${m.exp!.groups} Gruppen, ${m.objects.length} Objekte, ${Math.round(performance.now() - t0)} ms`, errs.length ? errs : 'gültig');
  if (!want) continue;
  const ch: Record<number, string> = { [T.VOID]: ' ', [T.WALL]: '#', [T.FLOOR]: '.', [T.LIQUID]: '~', [T.BRIDGE]: '=', [T.HAZARD]: '^' };
  const g = [...Array(m.h)].map((_, y) => [...Array(m.w)].map((_, x) => ch[m.tiles[y * m.w + x]] ?? '?'));
  for (const s of m.spawns) g[Math.floor(s.y / TILE)][Math.floor(s.x / TILE)] = s.elite ? 'E' : 'm';
  const sym: Record<string, string> = { door: 'D', bossdoor: 'B', boulder: 'S', chest: 'C', sign: 's', xobj: 'X', lore: 'L', node: 'n', exit: '<' };
  for (const o of m.objects) g[Math.floor(o.y / TILE)][Math.floor(o.x / TILE)] = sym[o.type] ?? 'o';
  for (const mi of m.exp!.minis) g[Math.floor(mi.y / TILE)][Math.floor(mi.x / TILE)] = 'M';
  console.log(g.map(r => r.join('')).join('\n'));
}
