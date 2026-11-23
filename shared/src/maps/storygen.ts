/**
 * Story-Objekte in der Welt (ab 0.3): Chronik-Dokumente, Hüterschreine, Mana-Risse, Story-NPCs und -Ausgänge.
 *
 * Läuft NACH der gesamten übrigen Kartengenerierung, mit eigenem Zufall, und hängt seine Objekte hinten an.
 * Dadurch bleiben Geländeform, Truhen, Splitter und alle bisherigen Objekt-IDs exakt wie zuvor – alte Spielstände
 * (Flags `c:<zone>:<id>`) passen weiterhin. Dokumente, Risse und NPCs blockieren nie; nur Schreine sind solide und
 * stehen deshalb ausschließlich auf Zellen, deren acht Nachbarn frei sind (so kann kein Weg versperrt werden).
 */
import { LORE_DOCS } from '../data/chronik';
import { STORY_OBJS } from '../data/story';
import { Rng, strHash } from '../util/rng';
import type { GameMap } from './mapgen';
import { T, TILE, isWalkableTile } from './tiles';

const px = (t: number) => t * TILE + TILE / 2;

export function placeStory(m: GameMap): void {
  const docs = LORE_DOCS.filter(d => d.zone === m.id);
  const objs = STORY_OBJS.filter(o => o.zone === m.id);
  if (!docs.length && !objs.length) return;
  const { w, h, tiles, solid } = m;
  const I = (x: number, y: number) => y * w + x;
  const inb = (x: number, y: number) => x >= 1 && y >= 1 && x < w - 1 && y < h - 1;
  let oid = m.objects.reduce((a, o) => Math.max(a, o.id), 0) + 1;

  // belegte Zellen: vorhandene Objekte samt ihrer Sperr-/Fallenzellen
  const occ = new Set<number>();
  for (const o of m.objects) {
    occ.add(I(Math.floor(o.x / TILE), Math.floor(o.y / TILE)));
    for (const c of (o.props?.cells ?? []) as number[]) occ.add(c);
  }
  // Erreichbarkeit vom Start (Türen und Felsblockaden gelten als offen)
  const reach = new Uint8Array(w * h);
  { const s = I(Math.floor(m.start.x / TILE), Math.floor(m.start.y / TILE)); const q = [s]; reach[s] = 1;
    while (q.length) { const i = q.pop()!; for (const n of [i - 1, i + 1, i - w, i + w]) if (n >= 0 && n < reach.length && !reach[n] && !solid[n]) { reach[n] = 1; q.push(n); } } }
  // Abstand zu Wegen (nur Oberwelt)
  const pd = new Int16Array(w * h).fill(-1);
  if (!m.dungeon) { const q: number[] = [];
    for (let i = 0; i < tiles.length; i++) if (tiles[i] === T.PATH || tiles[i] === T.BRIDGE) { pd[i] = 0; q.push(i); }
    for (let k = 0; k < q.length; k++) { const i = q[k], x = i % w; for (const n of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (n >= 0 && n < pd.length && pd[n] < 0) { pd[n] = pd[i] + 1; q.push(n); } } }

  const isPath = (x: number, y: number) => tiles[I(x, y)] === T.PATH || tiles[I(x, y)] === T.BRIDGE;
  const free = (x: number, y: number) => { if (!inb(x, y)) return false; const i = I(x, y), t = tiles[i]; return !!reach[i] && !solid[i] && isWalkableTile(t) && t !== T.HAZARD && t !== T.BRIDGE && !occ.has(i); };
  const offPath = (x: number, y: number) => free(x, y) && !isPath(x, y);
  /** alle acht Nachbarn begehbar und frei von Wegen – hier darf etwas Solides oder ein Portal stehen */
  const roomy = (x: number, y: number) => { if (!offPath(x, y)) return false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (!inb(xx, yy) || solid[I(xx, yy)] || !isWalkableTile(tiles[I(xx, yy)]) || isPath(xx, yy)) return false; } return true; };
  /** nächste passende Zelle in wachsenden Ringen um (cx, cy) */
  const near = (cx: number, cy: number, ok: (x: number, y: number) => boolean, maxR = 10): [number, number] | null => {
    for (let r = 0; r <= maxR; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (ok(cx + dx, cy + dy)) return [cx + dx, cy + dy];
    }
    return null;
  };
  const add = (type: string, c: [number, number], tag: string, props?: Record<string, any>) => { m.objects.push({ id: oid++, type, x: px(c[0]), y: px(c[1]), tag, props }); occ.add(I(c[0], c[1])); };
  const anchor = (at: string, dx = 0, dy = 0): [number, number] | null => {
    if (m.dungeon) return at === 'boss' && m.bossRoom ? [m.bossRoom.cx + dx, m.bossRoom.cy + dy] : null;
    const p = m.def.pois?.find(q => q.id === at);
    return p ? [p.x + dx, p.y + dy] : null;
  };

  // ---------------------------------------------------------------- feste Story-Objekte
  for (const o of objs) {
    const a = anchor(o.at, o.dx, o.dy);
    if (!a) continue;
    let c: [number, number] | null;
    if (o.exact) c = a;
    else if (o.type === 'npc') c = near(a[0], a[1], free);
    else if (o.type === 'shrine' || o.type === 'exit') c = near(a[0], a[1], roomy) ?? near(a[0], a[1], offPath);
    else c = near(a[0], a[1], offPath) ?? near(a[0], a[1], free);
    if (!c) c = a;
    const block = o.type === 'shrine' && roomy(c[0], c[1]);
    add(o.type, c, o.tag, o.props ? { ...o.props } : undefined);
    if (block) solid[I(c[0], c[1])] = 1;
    if (o.type === 'exit' && o.props?.to) {
      const e0 = anchor(o.at, o.entry?.[0] ?? (o.dx ?? 0), o.entry?.[1] ?? (o.dy ?? 0) + 2)!;
      const e = near(e0[0], e0[1], (x, y) => free(x, y) && Math.hypot(x - c![0], y - c![1]) >= 2) ?? e0;
      m.entries[o.props.to] = { x: px(e[0]), y: px(e[1]) };
    }
  }

  // ---------------------------------------------------------------- Chronik-Dokumente
  for (const d of docs) {
    const rng = new Rng(strHash(m.id + ':' + d.id));
    let c: [number, number] | null = null;
    if (m.dungeon) {
      const pool = m.rooms.filter(r => r.role === d.at);
      const rooms = pool.length ? pool : m.rooms.filter(r => r.role === 'combat' || r.role === 'treasure');
      const room = rooms[strHash(d.id) % Math.max(1, rooms.length)] ?? m.rooms[0];
      const onAxis = (x: number, y: number) => x === room.cx || x === room.cx - 1 || y === room.cy || y === room.cy - 1;
      for (let k = 0; k < 80 && !c; k++) {
        const x = rng.int(room.x0 + 1, room.x1 - 1), y = rng.int(room.y0 + 1, room.y1 - 1);
        if (free(x, y) && tiles[I(x, y)] === T.FLOOR && !onAxis(x, y)) c = [x, y];
      }
      c ??= near(room.cx + 2, room.cy + 2, free, 6);
    } else {
      const p = d.at ? m.def.pois?.find(q => q.id === d.at) : undefined;
      if (p) {
        const ang = rng.range(0, Math.PI * 2), rad = p.kind === 'secret' ? 1.5 : Math.max(2, Math.min(p.r - 1, 4));
        const ax = Math.round(p.x + Math.cos(ang) * rad), ay = Math.round(p.y + Math.sin(ang) * rad);
        c = near(ax, ay, offPath, 5) ?? near(ax, ay, free, 8);
      } else {
        for (let k = 0; k < 600 && !c; k++) {
          const x = rng.int(4, w - 5), y = rng.int(4, h - 5), dist = pd[I(x, y)];
          if (offPath(x, y) && dist >= 2 && dist <= 6 && !m.safe.some(s => Math.hypot(px(x) - s.x, px(y) - s.y) < s.r)) c = [x, y];
        }
        c ??= near(Math.floor(w / 2), Math.floor(h / 2), offPath, 30);
      }
    }
    if (!c) continue;
    add('lore', c, d.id, d.when ? { look: d.look, when: d.when } : { look: d.look });
  }
}
