/**
 * Expeditionen (0.9): Wo steht das Portal, wohin kehrt man zurück?
 *
 * ===================================================================================================================
 *  EINZIGE STELLE für den Weg in den Hub. Gibt es die Zone HUB_ZONE (Quellwarte) – sie entsteht parallel –, steht das
 *  große Portal an HUB_SPOTS.portal und man kehrt nach HUB_SPOTS.rueckkehr zurück. Fehlt sie, gilt Quellhain: das
 *  kleine Portal neben dem Dorfplatz, Rückkehr davor. Ein kleines Portal in Quellhain gibt es in beiden Fällen.
 * ===================================================================================================================
 */
import { HUB_SPOTS, HUB_ZONE } from '../../../shared/src/data/hub';
import { ZONES } from '../../../shared/src/data/zones';
import { getMap, type GameMap } from '../../../shared/src/maps/mapgen';
import { T, TILE } from '../../../shared/src/maps/tiles';
import { nextId } from '../player';
import type { Obj } from '../zone';

/** Quellhain: kleines Portal rechts oberhalb des Dorfplatzes (Kacheln relativ zum POI „dorf“) */
const QUELLHAIN = { zone: 'gruenwald', poi: 'dorf', dx: 7, dy: -9 };
export const hubExists = () => !!ZONES[HUB_ZONE];

function freeSpot(map: GameMap, tx0: number, ty0: number, roomyR = 1): [number, number] | null {
  const I = (x: number, y: number) => y * map.w + x;
  const open = (x: number, y: number) => x >= 2 && y >= 2 && x < map.w - 2 && y < map.h - 2 && !map.solid[I(x, y)] && map.tiles[I(x, y)] !== T.HAZARD && map.tiles[I(x, y)] !== T.LIQUID;
  const roomy = (x: number, y: number) => { for (let dy = -roomyR; dy <= roomyR; dy++) for (let dx = -roomyR; dx <= roomyR; dx++) if (!open(x + dx, y + dy)) return false; return true; };
  const taken = (tx: number, ty: number) => map.objects.some(o => Math.abs(Math.floor(o.x / TILE) - tx) <= 2 && Math.abs(Math.floor(o.y / TILE) - ty) <= 2);
  for (let r = 0; r <= 10; r++) for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++) {
    if (Math.max(Math.abs(ox), Math.abs(oy)) !== r) continue;
    const tx = tx0 + ox, ty = ty0 + oy;
    if (roomy(tx, ty) && !taken(tx, ty)) return [tx, ty];
  }
  return null;
}
const spotCache = new Map<string, { x: number; y: number } | null>();
/** Mittelpunkt eines Portals in dieser Karte (px) – oder null, wenn hier keines steht */
export function portalAt(map: GameMap): { x: number; y: number; big: boolean } | null {
  if (map.id === HUB_ZONE) { const [x, y] = HUB_SPOTS.portal; return { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2, big: true }; }
  if (map.id !== QUELLHAIN.zone) return null;
  if (!spotCache.has(map.id)) {
    const poi = map.def.pois?.find(p => p.id === QUELLHAIN.poi);
    const s = poi ? freeSpot(map, poi.x + QUELLHAIN.dx, poi.y + QUELLHAIN.dy) : null;
    spotCache.set(map.id, s ? { x: s[0] * TILE + TILE / 2, y: s[1] * TILE + TILE / 2 } : null);
  }
  const s = spotCache.get(map.id);
  return s ? { ...s, big: false } : null;
}
/** Server-Objekte der Portale (nicht in der Karte – die Karte bleibt unverändert, wie beim Riss-Stein) */
export function expeditionPortals(map: GameMap): Obj[] {
  const p = portalAt(map);
  if (!p) return [];
  return [{ id: nextId(), type: 'xobj', x: p.x, y: p.y, state: 0, tag: 'portal', props: { sid: 'xportal', kind: 'portal', ui: 'exp', big: p.big ? 1 : undefined,
    frame: p.big ? 'expedition_portal' : 'portal_small', label: 'Expeditionsportal', prompt: 'Expeditionen wählen', tint: 0x9fe8ff, light: [p.big ? 120 : 90, 0x9fe8ff, 0.9] } }];
}
/** Wohin man nach einer Expedition (oder beim Verlassen) zurückkehrt */
export function returnSpot(): { zone: string; x: number; y: number } {
  if (hubExists()) { const [x, y] = HUB_SPOTS.rueckkehr; return { zone: HUB_ZONE, x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 }; }
  const m = getMap(QUELLHAIN.zone), p = portalAt(m);
  return p ? { zone: m.id, x: p.x, y: p.y + 1.6 * TILE } : { zone: m.id, x: m.start.x, y: m.start.y };
}
