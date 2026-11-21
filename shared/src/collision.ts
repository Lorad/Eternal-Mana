import { TILE } from './maps/tiles';

export type SolidFn = (tx: number, ty: number) => boolean;

/** Ist ein Kreis (als Quadrat mit Halbkante r angenähert) an Position x,y frei? */
export function circleFree(solid: SolidFn, x: number, y: number, r: number): boolean {
  const x0 = Math.floor((x - r) / TILE), x1 = Math.floor((x + r) / TILE);
  const y0 = Math.floor((y - r) / TILE), y1 = Math.floor((y + r) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solid(tx, ty)) return false;
  return true;
}

/** Bewegt einen Kreis achsengetrennt mit Gleiten an Wänden. Gibt die neue Position zurück. */
export function moveCircle(solid: SolidFn, x: number, y: number, dx: number, dy: number, r: number): { x: number; y: number; hit: boolean } {
  let hit = false;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4));
  const sx = dx / steps, sy = dy / steps;
  for (let i = 0; i < steps; i++) {
    if (sx !== 0) { if (circleFree(solid, x + sx, y, r)) x += sx; else hit = true; }
    if (sy !== 0) { if (circleFree(solid, x, y + sy, r)) y += sy; else hit = true; }
  }
  return { x, y, hit };
}

/** Sichtlinie: true, wenn zwischen den Punkten keine blockierende Zelle liegt. */
export function lineClear(solid: SolidFn, x0: number, y0: number, x1: number, y1: number): boolean {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.ceil(d / 6));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (solid(Math.floor((x0 + (x1 - x0) * t) / TILE), Math.floor((y0 + (y1 - y0) * t) / TILE))) return false;
  }
  return true;
}

export function distToSegment(px: number, py: number, x0: number, y0: number, x1: number, y1: number): number {
  const dx = x1 - x0, dy = y1 - y0;
  const l2 = dx * dx + dy * dy;
  let t = l2 === 0 ? 0 : ((px - x0) * dx + (py - y0) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t));
}

export function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}
