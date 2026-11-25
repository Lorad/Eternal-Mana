/**
 * Quellwarte (0.9): Leute, die herumlaufen. Jede Figur geht ihre Runde (HUB_WALKERS in shared/src/maps/hubgen.ts) von Wegpunkt
 * zu Wegpunkt und verweilt an jedem kurz. Bewegt wird wie bei den Tagesabläufen über das Ereignis `omv` – der Client
 * zeichnet den Weg dazwischen; im Snapshot kostet das nichts. Läuft nur, solange jemand in der Quellwarte ist.
 */
import { CFG } from '../../../shared/src/config';
import { HUB_WALKERS } from '../../../shared/src/maps/hubgen';
import { TILE } from '../../../shared/src/maps/tiles';
import { moveObj } from '../world/state';
import type { Obj, Zone } from '../zone';

interface Walker { obj: Obj; pts: { x: number; y: number }[]; i: number; at: number }
const WALK = new WeakMap<Zone, Walker[]>();
const ROUTE = new Map(HUB_WALKERS);

function list(z: Zone): Walker[] {
  let w = WALK.get(z);
  if (!w) {
    w = [];
    let k = 0;
    for (const o of z.objs.values()) {
      if (o.type !== 'npc' || !o.props?.walker) continue;
      const pts = (ROUTE.get(String(o.tag)) ?? []).map(([x, y]) => ({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 }));
      if (pts.length > 1) w.push({ obj: o, pts, i: 0, at: z.game.now + 2 + (k++ * 1.7) });
    }
    WALK.set(z, w);
  }
  return w;
}
export function tickWalkers(z: Zone, now: number) {
  const [lo, hi] = CFG.hub.walkerPause;
  for (const w of list(z)) {
    if (now < w.at) continue;
    w.i = (w.i + 1) % w.pts.length;
    const to = w.pts[w.i], t = Math.hypot(to.x - w.obj.x, to.y - w.obj.y) / CFG.living.routine.speed;
    moveObj(z, w.obj, to.x, to.y, t);
    w.at = now + t + lo + z.rng.next() * (hi - lo);
  }
}
