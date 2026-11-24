/**
 * Tagesabläufe (0.6): NPCs gehen sichtbar zwischen Stammplatz, Feierabend- und Schlafplatz hin und her.
 * Der Ort eines NPCs ist das Objekt selbst – Nähe-Prüfungen (Handel, Quests, Handwerk), Questmarker und Karten folgen
 * ihm damit von allein. War eine Zone leer, stehen beim Betreten alle sofort dort, wo sie um diese Zeit hingehören.
 * NPCs mit Story-Bedingung (`props.when`) und unsichtbare Gesprächsanker bleiben unberührt.
 */
import { CFG } from '../../../shared/src/config';
import { ROUTINES_BY_ZONE, routineIndex } from '../../../shared/src/data/routines';
import { TILE } from '../../../shared/src/maps/tiles';
import { freeNear } from '../../../shared/src/world';
import type { Zone } from '../zone';
import { moveObj, zw, type RoutineNpc } from './state';

const C = CFG.living.routine;

function build(z: Zone): RoutineNpc[] {
  const out: RoutineNpc[] = [];
  for (const def of ROUTINES_BY_ZONE[z.id] ?? []) {
    const obj = [...z.objs.values()].find(o => o.type === 'npc' && o.tag === def.npc && !o.props?.when && !o.props?.anchor && !o.dynamic);
    if (!obj) continue;
    const home = { x: obj.x, y: obj.y };
    const stops = def.stops.map(s => {
      if (!s.at) return home;
      const poi = z.def.pois?.find(p => p.id === s.at![0]);
      return (poi && freeNear(z.map, poi.x + s.at[1], poi.y + s.at[2], 4)) || home;
    });
    out.push({ def, obj, home, stops, cur: -1, path: null, seg: 0 });
  }
  return out;
}
function list(z: Zone): RoutineNpc[] { const zs = zw(z); return (zs.routines ??= build(z)); }

/** Kürzester Weg über begehbare Zellen (Breitensuche); Wegpunkte im Abstand von höchstens `C.segment` Pixeln. */
function findPath(z: Zone, from: { x: number; y: number }, to: { x: number; y: number }): { x: number; y: number }[] | null {
  const w = z.map.w, h = z.map.h;
  const sx = Math.floor(from.x / TILE), sy = Math.floor(from.y / TILE), tx = Math.floor(to.x / TILE), ty = Math.floor(to.y / TILE);
  if (sx === tx && sy === ty) return [to];
  const prev = new Int32Array(w * h).fill(-1), s = sy * w + sx, t = ty * w + tx, q = [s];
  prev[s] = s;
  for (let k = 0; k < q.length && prev[t] < 0; k++) {
    const i = q[k], x = i % w, y = (i / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, n = ny * w + nx;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || prev[n] >= 0 || (n !== t && z.solidWalk(nx, ny))) continue;
      prev[n] = i; q.push(n);
    }
  }
  if (prev[t] < 0) return null;
  const cells: number[] = [];
  for (let i = t; i !== s; i = prev[i]) cells.push(i);
  cells.reverse();
  const step = Math.max(1, Math.floor(C.segment / TILE)), out: { x: number; y: number }[] = [];
  for (let i = step - 1; i < cells.length - 1; i += step) out.push({ x: (cells[i] % w) * TILE + TILE / 2, y: Math.floor(cells[i] / w) * TILE + TILE / 2 });
  out.push(to);
  return out;
}
function nextSegment(z: Zone, n: RoutineNpc, now: number) {
  const wp = n.path![0];
  const t = Math.hypot(wp.x - n.obj.x, wp.y - n.obj.y) / C.speed;
  moveObj(z, n.obj, wp.x, wp.y, t);
  n.seg = now + t;
}
/** Alle NPCs sofort an ihren Platz stellen (Zone war leer oder wird gerade betreten). */
export function snapRoutines(z: Zone) {
  const tod = z.game.tod();
  for (const n of list(z)) {
    const idx = routineIndex(n.def, tod), s = n.stops[idx];
    n.cur = idx; n.path = null;
    if (n.obj.x !== s.x || n.obj.y !== s.y) moveObj(z, n.obj, s.x, s.y, 0);
  }
}
export function tickRoutines(z: Zone, now: number) {
  const tod = z.game.tod();
  for (const n of list(z)) {
    if (n.path) {
      if (now < n.seg) continue;
      n.path.shift();
      if (n.path.length) { nextSegment(z, n, now); continue; }
      n.path = null;
    }
    const idx = routineIndex(n.def, tod);
    if (idx === n.cur) continue;
    n.cur = idx;
    const to = n.stops[idx];
    if (to.x === n.obj.x && to.y === n.obj.y) continue;
    n.path = findPath(z, n.obj, to);
    if (n.path) nextSegment(z, n, now); else moveObj(z, n.obj, to.x, to.y, 0);
  }
}
/** Station, an der ein NPC gerade steht bzw. zu der er unterwegs ist (für Tests und Dev-Befehle) */
export function routineOfNpc(z: Zone, npc: string): RoutineNpc | undefined { return list(z).find(n => n.def.npc === npc); }
