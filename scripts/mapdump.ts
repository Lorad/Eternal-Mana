// Debug: Karte als ASCII ausgeben und validieren.  npx tsx scripts/mapdump.ts [zone]
import { ZONE_LIST } from '../shared/src/data/zones';
import { getMap, validateMap } from '../shared/src/maps/mapgen';
const want = process.argv[2];
const CH = ' .,:=#~+^';
for (const z of ZONE_LIST) {
  const t0 = performance.now();
  const m = getMap(z.id);
  const errs = validateMap(m);
  console.log(`${z.id}: ${m.w}x${m.h} objs=${m.objects.length} spawns=${m.spawns.length} decor=${m.decor.length} rooms=${m.rooms.map(r => r.role).join(',')} ${(performance.now() - t0).toFixed(0)}ms errs=${errs.length}`);
  for (const e of errs.slice(0, 8)) console.log('   ! ' + e);
  if (want === z.id) {
    const g: string[][] = [];
    for (let y = 0; y < m.h; y++) { g.push([]); for (let x = 0; x < m.w; x++) g[y].push(m.solid[y * m.w + x] === 1 && m.tiles[y * m.w + x] !== 6 ? 'T' : CH[m.tiles[y * m.w + x]]); }
    const sym: Record<string, string> = { npc: 'N', exit: 'X', chest: 'C', stone: 'Q', boulder: 'B', shard: '*', node: 'n', sign: 's', door: 'D', bossdoor: 'D', spikes: '^', turret: 't', lever: 'l', plate: 'p', brazier: 'b', board: 'O' };
    for (const o of m.objects) g[Math.floor(o.y / 16)][Math.floor(o.x / 16)] = sym[o.type] ?? '?';
    for (const s of m.spawns) g[Math.floor(s.y / 16)][Math.floor(s.x / 16)] = 'm';
    g[Math.floor(m.start.y / 16)][Math.floor(m.start.x / 16)] = '@';
    console.log(g.map(r => r.join('')).join('\n'));
  }
}
