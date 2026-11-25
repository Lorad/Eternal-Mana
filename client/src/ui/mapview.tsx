/** Kartendarstellung: Minimap (HUD) und große Zonenkarte teilen sich denselben vorgerenderten Kachel-Hintergrund. */
import { useEffect, useRef } from 'preact/hooks';
import { live } from '../state/live';
import { store } from '../state/store';
import { npcMarker } from '../../../shared/src/data/quests';
import { NPCS } from '../../../shared/src/data/npcs';
import { objVisible } from '../../../shared/src/data/story';
import { ZONES } from '../../../shared/src/data/zones';
import { getMap } from '../../../shared/src/maps/mapgen';
import type { GameMap } from '../../../shared/src/maps/mapgen';
import { onTick } from './common';

const TILE = 16;
/** Pixel je Kachel im vorgerenderten Kartenbild */
export const CELL = 4;

interface Pal { ground: string; ground2: string; path: string; floor: string; wall: string; wallFace: string; liquid: string; liquidHi: string; bridge: string; hazard: string; void: string }
const PALS: Record<string, Pal> = {
  quellwarte: { ground: '#8d8574', ground2: '#4d8a3e', path: '#b9a27a', floor: '#c8bfa6', wall: '#3a3a44', wallFace: '#26262e', liquid: '#3a9ab8', liquidHi: '#7fd8ee', bridge: '#9a948a', hazard: '#8a5a34', void: '#0a0d14' }, // 0.9: Pflaster der Quellwarte
  gruenwald: { ground: '#4d8a3e', ground2: '#3c7636', path: '#cfae6e', floor: '#8f8a7c', wall: '#1d4428', wallFace: '#12301c', liquid: '#3878c8', liquidHi: '#6fb0ee', bridge: '#9a6a3a', hazard: '#8a5a34', void: '#0a0d14' },
  kristall: { ground: '#4a4a6c', ground2: '#5b4f84', path: '#8e88ae', floor: '#6c6a8a', wall: '#1b1930', wallFace: '#0f0e1e', liquid: '#2a9cbc', liquidHi: '#7fe0f0', bridge: '#8a6a4a', hazard: '#b868f0', void: '#07070e' },
  glut: { ground: '#5c4138', ground2: '#49302c', path: '#a07e5c', floor: '#6c5a56', wall: '#231513', wallFace: '#140b0a', liquid: '#f07020', liquidHi: '#ffc04a', bridge: '#7a6a5a', hazard: '#c0481e', void: '#0a0606' },
  frost: { ground: '#dde7f1', ground2: '#c2d2e6', path: '#a8b4c6', floor: '#98a4b8', wall: '#62769a', wallFace: '#47597a', liquid: '#4c94d0', liquidHi: '#a0d4f4', bridge: '#8a6e50', hazard: '#8cc8ec', void: '#0c1018' },
  ruinen: { ground: '#9a9072', ground2: '#7e8a5c', path: '#d2c69c', floor: '#b0a88a', wall: '#4a4638', wallFace: '#322f26', liquid: '#36888a', liquidHi: '#7fd0c8', bridge: '#8a6a3a', hazard: '#a47a3e', void: '#0b0b0e' },
  schatten: { ground: '#3b3054', ground2: '#4b3b6c', path: '#6c608c', floor: '#564a72', wall: '#120e1f', wallFace: '#090611', liquid: '#1a0e30', liquidHi: '#7a3cc0', bridge: '#5a4a6a', hazard: '#a23ec4', void: '#05040a' },
};
function hex(c: string): [number, number, number] { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function hash(x: number, y: number): number { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967295; }

const canvases = new Map<string, HTMLCanvasElement>();
/** Rendert die Kacheln einer Zone einmalig in ein Offscreen-Canvas (CELL px je Kachel). */
export function mapCanvas(zone: string): { cv: HTMLCanvasElement; map: GameMap } | null {
  if (!ZONES[zone]) return null;
  let map: GameMap;
  try { map = getMap(zone); } catch { return null; }
  let cv = canvases.get(zone);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = map.w * CELL; cv.height = map.h * CELL;
    const ctx = cv.getContext('2d')!;
    const img = ctx.createImageData(cv.width, cv.height);
    const pal = PALS[map.biome] ?? PALS.gruenwald;
    const rgb: Record<number, [number, number, number]> = {
      0: hex(pal.void), 1: hex(pal.ground), 2: hex(pal.ground2), 3: hex(pal.path), 4: hex(pal.floor), 5: hex(pal.wall), 6: hex(pal.liquid), 7: hex(pal.bridge), 8: hex(pal.hazard),
    };
    const face = hex(pal.wallFace), liqHi = hex(pal.liquidHi);
    const t = map.tiles, W = map.w, H = map.h;
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : t[y * W + x]);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = t[y * W + x];
      const base = rgb[k] ?? rgb[0];
      const below = at(x, y + 1), above = at(x, y - 1);
      for (let py = 0; py < CELL; py++) for (let px = 0; px < CELL; px++) {
        let c = base;
        let v = (hash(x * CELL + px, y * CELL + py) - 0.5) * (k === 5 || k === 0 ? 10 : k === 3 || k === 4 ? 12 : 22);
        if (k === 5) {
          // Wand: Vorderkante dunkler, wenn darunter begehbarer Boden liegt; Oberkante heller
          if (below !== 5 && below !== 0 && py >= CELL - 2) c = face;
          else if (above !== 5 && above !== 0 && py === 0) v += 26;
        } else if (k === 6) {
          if (above !== 6 && py === 0) v -= 30;
          else if (hash(x * 7 + ((px / 2) | 0), y * 13 + py) > 0.9) c = liqHi;
        } else if (k !== 0) {
          if (above === 5 && py === 0) v -= 34; // Schatten unter Wänden
          if (k === 8 && (px + py) % 3 === 0) v += 30;
        }
        const i = ((y * CELL + py) * cv!.width + x * CELL + px) * 4;
        img.data[i] = Math.max(0, Math.min(255, c[0] + v));
        img.data[i + 1] = Math.max(0, Math.min(255, c[1] + v));
        img.data[i + 2] = Math.max(0, Math.min(255, c[2] + v));
        img.data[i + 3] = k === 0 ? 0 : 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    canvases.set(zone, cv);
    if (canvases.size > 4) { const first = canvases.keys().next().value; if (first && first !== zone) canvases.delete(first); }
  }
  return { cv, map };
}

export interface Marker { x: number; y: number; type: string; mark?: 'offer' | 'turnin' | 'progress' | null; label?: string; state?: number }

/** Eigene Position in Weltpixeln (aus der Spielszene; sonst aus dem Spielstand). */
export function selfPos(zone: string): { x: number; y: number } {
  if (live.zone === zone && (live.x || live.y)) return { x: live.x, y: live.y };
  const c = store.state.char;
  if (c && c.zone === zone && (c.x || c.y)) return { x: c.x, y: c.y };
  const m = mapCanvas(zone)?.map;
  return m ? { x: m.start.x, y: m.start.y } : { x: 0, y: 0 };
}
/** Statische Orientierungspunkte aus den Kartendaten (Ausgänge, Quellsteine, NPCs mit Questmarkern). */
export function staticMarkers(map: GameMap): Marker[] {
  const c = store.state.char;
  const out: Marker[] = [];
  for (const o of map.objects) {
    if (!objVisible(c, o) || o.props?.anchor) continue; // Story-Objekte mit Bedingung (0.3)
    if (o.type === 'npc') out.push({ x: o.x, y: o.y, type: 'npc', mark: c && o.tag ? npcMarker(c, o.tag) : null, label: o.tag ? NPCS[o.tag]?.name : undefined });
    else if (o.type === 'exit') out.push({ x: o.x, y: o.y, type: 'exit', label: o.props?.label ?? ZONES[o.props?.to]?.name });
    else if (o.type === 'stone') out.push({ x: o.x, y: o.y, type: 'stone', label: 'Quellstein' });
    else if (o.type === 'board') out.push({ x: o.x, y: o.y, type: 'board', label: 'Auftragsbrett' });
  }
  return out;
}
export function currentMarkers(zone: string, map: GameMap): Marker[] {
  if (live.zone === zone && live.objs.length) return live.objs;
  return staticMarkers(map);
}
/** 0.6: laufende Ereignisse und Weltbosse dieser Zone als Marker */
export function eventMarkers(zone: string): Marker[] {
  return (store.state.world?.ev ?? []).filter(e => e.zone === zone).map(e => ({ x: e.x, y: e.y, type: e.boss ? 'w_boss' : 'w_event', label: e.name }));
}
const WORLD_MARKS = new Set(['w_star', 'w_trader', 'w_enc', 'w_dig']);

function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); }
function outlined(ctx: CanvasRenderingContext2D, fill: string) { ctx.lineWidth = 2; ctx.strokeStyle = '#05060a'; ctx.stroke(); ctx.fillStyle = fill; ctx.fill(); }

/** Zeichnet einen Marker. u = Größe einer "Einheit" in Canvas-Pixeln. */
export function drawMarker(ctx: CanvasRenderingContext2D, m: Marker, x: number, y: number, u: number) {
  switch (m.type) {
    case 'npc': {
      ctx.beginPath(); ctx.arc(x, y, u * 1.5, 0, 7); outlined(ctx, '#ffe9a8');
      if (m.mark) {
        ctx.font = `900 ${Math.round(u * 6.5)}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        const ch = m.mark === 'offer' ? '!' : '?';
        ctx.lineWidth = 3; ctx.strokeStyle = '#05060a'; ctx.strokeText(ch, x, y - u * 2.2);
        ctx.fillStyle = m.mark === 'progress' ? '#aab0c4' : '#ffd23e'; ctx.fillText(ch, x, y - u * 2.2);
      }
      break;
    }
    case 'exit': {
      ctx.beginPath(); ctx.rect(x - u * 1.6, y - u * 1.6, u * 3.2, u * 3.2); outlined(ctx, '#ffffff');
      ctx.fillStyle = '#20263f'; ctx.fillRect(x - u * 0.6, y - u * 0.6, u * 1.2, u * 2.2);
      break;
    }
    case 'stone': diamond(ctx, x, y, u * 2.3); outlined(ctx, '#7fe9ff'); break;
    case 'chest': if (!m.state) { ctx.beginPath(); ctx.rect(x - u * 1.5, y - u * 1.1, u * 3, u * 2.2); outlined(ctx, '#e3b75c'); } break;
    case 'shard': if (!m.state) { diamond(ctx, x, y, u * 1.4); outlined(ctx, '#d6c4ff'); } break;
    case 'board': { ctx.beginPath(); ctx.rect(x - u * 1.3, y - u * 1.3, u * 2.6, u * 2.6); outlined(ctx, '#c58f4a'); break; }
    case 'riftstone': diamond(ctx, x, y, u * 2.1); outlined(ctx, '#b89cff'); break; // Riss-Stein (0.5)
    // ---- Lebendige Welt (0.6)
    case 'w_event': case 'w_boss': {
      const boss = m.type === 'w_boss', r = u * (2.4 + 0.5 * Math.sin(performance.now() / 300));
      ctx.beginPath(); ctx.arc(x, y, r * 1.7, 0, 7); ctx.strokeStyle = boss ? 'rgba(255,90,130,.7)' : 'rgba(110,255,220,.7)'; ctx.lineWidth = 2; ctx.stroke();
      diamond(ctx, x, y, u * 2.4); outlined(ctx, boss ? '#ff3b6b' : '#6effdc');
      break;
    }
    case 'w_star': if (!m.state) { diamond(ctx, x, y, u * 1.3); outlined(ctx, '#fff0a8'); } break;
    case 'w_trader': { ctx.beginPath(); ctx.arc(x, y, u * 2, 0, 7); outlined(ctx, '#ffcf5e'); ctx.fillStyle = '#5a3a10'; ctx.fillRect(x - u * 0.5, y - u * 0.5, u, u); break; }
    case 'w_enc': { ctx.beginPath(); ctx.arc(x, y, u * 1.6, 0, 7); outlined(ctx, '#9fd8ff'); break; }
    case 'w_dig': {
      ctx.lineCap = 'round';
      for (const [w, c] of [[u * 1.9, '#05060a'], [u * 1.1, '#ff5a3c']] as const) { ctx.lineWidth = w; ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(x - u * 2, y - u * 2); ctx.lineTo(x + u * 2, y + u * 2); ctx.moveTo(x + u * 2, y - u * 2); ctx.lineTo(x - u * 2, y + u * 2); ctx.stroke(); }
      break;
    }
    default: break;
  }
}
function drawSelf(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, now: number) {
  const pulse = 1 + 0.25 * Math.sin(now / 260);
  ctx.beginPath(); ctx.arc(x, y, u * 3.2 * pulse, 0, 7); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, u * 1.8, 0, 7); outlined(ctx, '#ffffff');
}

/** Minimap: Ausschnitt um die eigene Position. */
export function MinimapCanvas({ zone, size, view = 34 }: { zone: string; size: number; view?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const mc = mapCanvas(zone);
    const ctx = cv.getContext('2d')!;
    const R = cv.width;               // interne Auflösung
    const ppt = R / view;             // Canvas-Pixel je Kachel
    const u = R / 100;
    let frame = 0;
    const draw = (now: number) => {
      if (frame++ % 3) return;        // ~20 Bilder pro Sekunde genügen
      ctx.fillStyle = '#080a12'; ctx.fillRect(0, 0, R, R);
      if (!mc) return;
      const me = selfPos(zone);
      const cxT = me.x / TILE, cyT = me.y / TILE;
      const sx = (cxT - view / 2) * CELL, sy = (cyT - view / 2) * CELL, sw = view * CELL;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(mc.cv, sx, sy, sw, sw, 0, 0, R, R);
      const tx = (wx: number) => (wx / TILE - cxT) * ppt + R / 2, ty = (wy: number) => (wy / TILE - cyT) * ppt + R / 2;
      const inView = (x: number, y: number) => x > -8 && y > -8 && x < R + 8 && y < R + 8;
      for (const m of [...currentMarkers(zone, mc.map), ...eventMarkers(zone)]) {
        let x = tx(m.x), y = ty(m.y);
        const important = m.type === 'exit' || m.type === 'stone' || (m.type === 'npc' && m.mark && m.mark !== 'progress') || m.type === 'w_event' || m.type === 'w_boss' || m.type === 'w_dig' || m.type === 'w_trader';
        if (!inView(x, y)) {
          if (!important) continue;
          // wichtige Ziele außerhalb des Ausschnitts am Rand anzeigen
          const dx = x - R / 2, dy = y - R / 2, k = (R / 2 - u * 5) / Math.max(Math.abs(dx), Math.abs(dy));
          x = R / 2 + dx * k; y = R / 2 + dy * k;
          ctx.globalAlpha = 0.75; drawMarker(ctx, m, x, y, u * 0.8); ctx.globalAlpha = 1;
          continue;
        }
        drawMarker(ctx, m, x, y, u);
      }
      if (live.zone === zone) {
        for (const m of live.mobs) {
          const x = tx(m.x), y = ty(m.y); if (!inView(x, y)) continue;
          if (m.rare) { diamond(ctx, x, y, u * (2.2 + 0.4 * Math.sin(now / 200))); outlined(ctx, '#ffb02e'); continue; }   // seltenes Monster in der Nähe
          ctx.beginPath(); ctx.arc(x, y, m.boss ? u * 2.6 : u * 1.2, 0, 7); outlined(ctx, m.boss ? '#ff3b6b' : '#ff5a48');
        }
        for (const p of live.players) { const x = tx(p.x), y = ty(p.y); if (!inView(x, y)) continue; ctx.beginPath(); ctx.arc(x, y, u * 1.7, 0, 7); outlined(ctx, p.party ? '#7bdc7b' : '#6fb7ff'); }
      }
      drawSelf(ctx, R / 2, R / 2, u, now);
    };
    return onTick(draw);
  }, [zone, size, view]);
  return <canvas ref={ref} class="px minimap-canvas" width={size * 2} height={size * 2} style={{ width: size + 'px', height: size + 'px' }} />;
}

/** Große Karte der ganzen Zone mit Ortsnamen und Markierungen. */
export function ZoneMapCanvas({ zone }: { zone: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const mc = mapCanvas(zone);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || !mc) return;
    const ctx = cv.getContext('2d')!;
    const k = cv.width / mc.cv.width;       // Canvas-Pixel je Kartenbild-Pixel
    const u = Math.max(1.6, cv.width / 260);
    let frame = 0;
    const draw = (now: number) => {
      if (frame++ % 4) return;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(mc.cv, 0, 0, cv.width, cv.height);
      const tx = (wx: number) => (wx / TILE) * CELL * k, ty = (wy: number) => (wy / TILE) * CELL * k;
      const seen = new Set<string>();
      // 0.6: NPCs folgen ihrem Tagesablauf – in der eigenen Zone zählt ihr tatsächlicher Standort
      const here = live.zone === zone && live.objs.length > 0;
      const marks = here ? [...staticMarkers(mc.map).filter(m => m.type !== 'npc'), ...live.objs.filter(o => o.type === 'npc' || WORLD_MARKS.has(o.type))] : [...staticMarkers(mc.map)];
      marks.push(...eventMarkers(zone));
      const me = selfPos(zone);
      // Truhen und Splitter nur in Sichtweite – die große Karte soll nichts verraten
      if (live.zone === zone) for (const o of live.objs) if ((o.type === 'chest' || o.type === 'shard') && Math.hypot(o.x - me.x, o.y - me.y) < 280) marks.push(o);
      for (const m of marks) { const key = m.type + Math.round(m.x / 8) + ':' + Math.round(m.y / 8); if (seen.has(key)) continue; seen.add(key); drawMarker(ctx, m, tx(m.x), ty(m.y), u); }
      if (live.zone === zone) for (const p of live.players) { ctx.beginPath(); ctx.arc(tx(p.x), ty(p.y), u * 1.8, 0, 7); outlined(ctx, p.party ? '#7bdc7b' : '#6fb7ff'); }
      drawSelf(ctx, tx(me.x), ty(me.y), u * 1.2, now);
    };
    return onTick(draw);
  }, [zone]);
  if (!mc) return <div class="note">Für diesen Ort gibt es keine Karte.</div>;
  const W = mc.map.w * TILE, H = mc.map.h * TILE;
  const scale = Math.max(2, Math.round(1100 / mc.cv.width));
  const exits = mc.map.objects.filter(o => o.type === 'exit' && objVisible(store.state.char, o));
  return (
    <div class="zonemap" style={{ aspectRatio: `${mc.map.w} / ${mc.map.h}` }}>
      <canvas ref={ref} class="px" width={mc.cv.width * scale} height={mc.cv.height * scale} />
      {mc.map.labels.map(l => <span class="zonemap-label" style={{ left: (l.x / W) * 100 + '%', top: (l.y / H) * 100 + '%' }}>{l.name}</span>)}
      {exits.filter(e => !mc.map.labels.some(l => Math.hypot(l.x - e.x, l.y - e.y) < 80 || l.name === (e.props?.label ?? ZONES[e.props?.to]?.name))).map(e => (
        <span class="zonemap-label exit" style={{ left: (e.x / W) * 100 + '%', top: (e.y / H) * 100 + '%' }}>→ {e.props?.label ?? ZONES[e.props?.to]?.name ?? 'Ausgang'}</span>
      ))}
    </div>
  );
}
