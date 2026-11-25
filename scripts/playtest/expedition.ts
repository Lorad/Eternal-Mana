/**
 * Spieltest der Expeditionen (0.9): ein ganzer Lauf vom Portal bis zur Rückkehr – echte Instanz, echte Gegner, echte Tore,
 * Schlüssel, Rätsel, Hinterhalt, Mini-Bosse und Endboss. Die Bots kämpfen mit dem Spielermodell (model.ts); was sie nicht
 * „denken“ können, kostet gemessene Zeit nach Spielertyp:
 *   sorgsam  liest Schilder und Chronik, sucht die geheime Wand, nimmt alle Seitenflügel und Mini-Bosse mit, öffnet jede Truhe
 *   zügig    folgt dem Hauptweg, liest kurz, nimmt Truhen am Weg; Seitenflügel nur, wenn sie nah liegen; Geheimes nur zufällig
 * Zahlen für die Zeitaufschläge stehen in THINK.
 */
import { CFG } from '../../shared/src/config';
import { EXPEDITIONS } from '../../shared/src/data/expeditions';
import type { Difficulty } from '../../shared/src/data/hub';
import { RUNE_SYMBOLS, type ExpSection } from '../../shared/src/maps/expedition';
import { TILE } from '../../shared/src/maps/tiles';
import type { CharData } from '../../shared/src/types';
import { Rng } from '../../shared/src/util/rng';
import type { Obj, Zone } from '../../server/src/zone';
import type { Lab } from './lab';
import { Nav, type Bot, type Skill } from './model';

export type Style = 'sorgsam' | 'zuegig';
/** Sekunden, die ein Mensch für das braucht, was der Bot nicht spielt */
export const THINK = {
  sorgsam: { sign: 7, lore: 12, puzzle: 40, chest: 2, secret: 20, look: 6 },
  zuegig: { sign: 2, lore: 4, puzzle: 55, chest: 1, secret: 10, look: 1.5 },
};
export interface ExpRunResult { ok: boolean; sec: number; deaths: number; potions: number; stuck: number; bossSec: number; minis: number; secrets: number; kills: number; byRole: Record<string, number> }

type Task =
  | { k: 'go'; x: number; y: number; sec?: ExpSection; why: string }
  | { k: 'clear'; sec: ExpSection }
  | { k: 'use'; o: Obj; think: number; why: string }
  | { k: 'wait'; s: number; why: string }
  | { k: 'puzzle'; sec: ExpSection }
  | { k: 'secret'; o: Obj }
  | { k: 'event'; sec: ExpSection }
  | { k: 'mini'; sec: ExpSection }
  | { k: 'boss' };

const inSec = (s: ExpSection, x: number, y: number, pad = 0) => x >= (s.x0 + pad) * TILE && x < (s.x1 + 1 - pad) * TILE && y >= (s.y0 + pad) * TILE && y < (s.y1 + 1 - pad) * TILE;

export function expeditionRun(lab: Lab, id: string, chars: CharData[], skill: Skill, style: Style, seed: number, diff: Difficulty = 'normal', maxSec = 3600): ExpRunResult {
  const bots = chars.map((c, i) => lab.join(c, skill, seed * 31 + i));
  lab.party(bots);
  const x = EXPEDITIONS[id], game = lab.game, rng = new Rng(seed), T = THINK[style];
  // freischalten und zum Portal
  for (const b of bots) {
    for (const r of x.unlock) { if (r.cond?.flag) b.p.char.flags[r.cond.flag] = 1; for (const a of r.cond?.any ?? []) if (a.started) b.p.char.quests[a.started] = { s: 'active', p: [0] }; }
    if (diff !== 'normal') b.p.char.expeditions = { [id]: { clears: { normal: 1, schwer: 1, albtraum: 1 } } };
    game.transfer(b.p, 'gruenwald', '');
    const o = [...b.p.zone.objs.values()].find(q => q.props?.kind === 'portal')!;
    lab.place(b.p, o.x, o.y + 20);
  }
  bots[0].send({ t: 'exp', a: 'select', id, diff });
  if (bots.length > 1) { for (const b of bots.slice(1)) b.send({ t: 'exp', a: 'ready' }); bots[0].send({ t: 'exp', a: 'start' }); }
  const z = bots[0].p.zone;
  if (!z.exp) throw new Error('Expedition startet nicht: ' + id);
  z.rng = new Rng(seed);
  lab.tap(z, bots);
  const info = z.map.exp!, run = z.exp;
  const objs = [...z.objs.values()];
  const near = (s: ExpSection, o: Obj) => inSec(s, o.x, o.y, -1);
  // ---- Plan: Hauptweg; Seitenflügel und Schatzkammern hängen am Abschnitt, von dem sie abzweigen
  const tasks: Task[] = [];
  const mains = info.sections.filter(s => s.main).sort((a, b) => a.order - b.order);
  const pathDist = (a: ExpSection, b: ExpSection) => Math.hypot(a.cx - b.cx, a.cy - b.cy);
  const plan = (s: ExpSection) => {
    if (s.role === 'boss') { tasks.push({ k: 'go', x: s.entry.x, y: s.entry.y, sec: s, why: 'Arena' }, { k: 'boss' }); return; }
    if (s.role === 'reward') return;
    tasks.push({ k: 'go', x: (s.cx + 0.5) * TILE, y: (s.cy + 0.5) * TILE, sec: s, why: s.name });
    if (s.role === 'event') tasks.push({ k: 'event', sec: s });
    if (s.role === 'mini') tasks.push({ k: 'mini', sec: s });
    tasks.push({ k: 'clear', sec: s });
    for (const o of objs) if (near(s, o)) {
      if (o.type === 'chest' && !o.props?.key && (style === 'sorgsam' || rng.chance(0.6))) tasks.push({ k: 'use', o, think: T.chest, why: 'Truhe' });
      if (o.type === 'chest' && o.props?.key) tasks.push({ k: 'use', o, think: T.chest, why: 'Schlüssel' });
      if (o.type === 'sign') tasks.push({ k: 'use', o, think: o.tag === 'lore' ? T.lore : T.sign, why: 'Schild' });
      if (o.type === 'lore') tasks.push({ k: 'use', o, think: T.lore, why: 'Chronik' });
      if (o.type === 'node') tasks.push({ k: 'use', o, think: 1, why: 'Abbau' });
      if (o.type === 'xobj' && o.props?.kind === 'checkpoint') tasks.push({ k: 'use', o, think: 3, why: 'Rast' });
    }
    if (s.role === 'puzzle') tasks.push({ k: 'puzzle', sec: s });
    tasks.push({ k: 'wait', s: T.look, why: 'umsehen' });
    // Abzweige
    if (s.main) for (const w of info.sections.filter(q => !q.main && q.order === s.order)) {
      if (w.secret) {
        const wall = objs.find(o => o.type === 'boulder' && o.props?.sec === w.id);
        if (wall && (style === 'sorgsam' || rng.chance(0.35))) { tasks.push({ k: 'go', x: wall.x, y: wall.y, why: 'geheime Wand' }, { k: 'wait', s: T.secret, why: 'Wand absuchen' }, { k: 'secret', o: wall }); plan(w); }
      } else if (style === 'sorgsam' || pathDist(s, w) < 28 || rng.chance(0.5)) plan(w);
    }
  };
  for (const s of mains) plan(s);

  // ---- Durchführen
  const navs = bots.map(() => new Nav(z));
  const t0 = game.now, d0 = bots.map(b => b.p.char.deaths);
  const byRole: Record<string, number> = {};
  let ti = 0, taskAt = game.now, stuck = 0, bossSec = 0, waitUntil = 0, navAt = 0, lastProg = game.now, lastPos = { x: 0, y: 0 };
  const room = z.map.bossRoom!;
  const bounds = { x0: (room.x0 + 1.6) * TILE, y0: (room.y0 + 1.6) * TILE, x1: (room.x1 - 0.6) * TILE, y1: (room.y1 - 0.6) * TILE };
  const lead = () => bots.find(b => !b.p.dead) ?? bots[0];
  const sendAll = (o: Obj) => { for (const b of bots) if (Math.hypot(b.p.x - o.x, b.p.y - o.y) < 40) b.send({ t: 'interact', id: o.id }); };
  const goal = (b: Bot, gx: number, gy: number) => { const path = navs[bots.indexOf(b)].path(b.p.x, b.p.y, gx, gy); b.goto = path ? path[Math.min(path.length - 1, 3)] : { x: gx, y: gy }; };
  const next = () => { const t = tasks[ti]; const key = t.k === 'go' ? 'Weg' : t.k === 'clear' ? 'Kampf' : t.k === 'boss' ? 'Boss' : t.k === 'mini' ? 'Mini-Boss' : t.k === 'event' ? 'Hinterhalt' : t.k === 'puzzle' ? 'Rätsel' : 'Erkunden'; byRole[key] = (byRole[key] ?? 0) + (game.now - taskAt); ti++; taskAt = game.now; waitUntil = 0; lastProg = game.now; };
  for (;;) {
    const now = game.now;
    if (run.done || ti >= tasks.length || now - t0 > maxSec) break;
    const t = tasks[ti];
    if (z.boss?.active) bossSec += 1 / CFG.net.tickRate;
    if (now >= navAt) {
      navAt = now + 0.25;
      for (const b of bots) {
        if (b.p.zone !== z) continue;
        if (b.p.dead) { if (bots.every(q => q.p.dead || q.p.zone !== z)) b.send({ t: 'respawn' }); continue; }
        b.bounds = z.boss?.active && z.inRoom(room, b.p.x, b.p.y) ? bounds : null;
        // Türen öffnen, wenn man davorsteht
        for (const o of z.objs.values()) if ((o.type === 'door' || o.type === 'bossdoor') && o.state === 0 && !o.props?.ambush && Math.hypot(o.x - b.p.x, o.y - b.p.y) < 40 && !z.boss?.active) b.send({ t: 'interact', id: o.id });
      }
      const L = lead().p;
      if (Math.hypot(L.x - lastPos.x, L.y - lastPos.y) > 20) { lastPos = { x: L.x, y: L.y }; lastProg = now; }
      if (now - lastProg > 45 && t.k !== 'boss' && !(waitUntil && now < waitUntil + 5)) { stuck++; if (process.env.EM_DEBUG) console.log('hängt bei', t.k, (t as any).why ?? (t as any).sec?.id ?? '', Math.round(L.x / TILE), Math.round(L.y / TILE)); next(); continue; }
      switch (t.k) {
        case 'go': {
          if (bots.every(b => b.p.dead || Math.hypot(b.p.x - t.x, b.p.y - t.y) < 28)) { next(); break; }
          for (const b of bots) if (!b.p.dead) goal(b, t.x, t.y);
          break;
        }
        case 'clear': case 'mini': case 'event': {
          const left = [...z.mobs.values()].filter(m => !m.dead && !m.boss && inSec(t.sec, m.x, m.y, -1) && (t.k !== 'mini' || run.miniMobs.has(m.id) || m.awake));
          const ev = t.k === 'event' ? run.events.get(t.sec.id) : undefined;
          if (t.k === 'event' && ev && ev.state === 'idle') { for (const b of bots) if (!b.p.dead) goal(b, (t.sec.cx + 0.5) * TILE, (t.sec.cy + 0.5) * TILE); break; }
          if (!left.length && (!ev || ev.state === 'done')) { next(); break; }
          if (!left.length) break; // nächste Welle
          for (const b of bots) if (!b.p.dead) { const m = left.reduce((a, c) => (Math.hypot(c.x - b.p.x, c.y - b.p.y) < Math.hypot(a.x - b.p.x, a.y - b.p.y) ? c : a)); if (Math.hypot(m.x - b.p.x, m.y - b.p.y) > 60) goal(b, m.x, m.y); else b.goto = null; }
          break;
        }
        case 'use': {
          const o = t.o;
          if (o.type === 'chest' && o.props?.mini && [...run.miniMobs.values()].some(s => s.id === o.props!.mini && !s.mob.dead)) { next(); break; }
          if (Math.hypot(L.x - o.x, L.y - o.y) > 30) { for (const b of bots) if (!b.p.dead) goal(b, o.x, o.y + 14); break; }
          if (!waitUntil) { waitUntil = now + t.think; sendAll(o); }
          if (now >= waitUntil) next();
          break;
        }
        case 'wait': if (!waitUntil) waitUntil = now + t.s; if (now >= waitUntil) next(); break;
        case 'puzzle': {
          const pz = run.puzzles.get(t.sec.id);
          if (!pz || pz.solved) { next(); break; }
          if (!waitUntil) waitUntil = now + T.puzzle; // nachdenken, lesen, probieren
          if (now < waitUntil) break;
          // lösen: die richtigen Teile in der richtigen Reihenfolge benutzen (der Bot läuft hin)
          const parts = objs.filter(o => o.props?.psec === t.sec.id).sort((a, b) => (a.props!.idx ?? 0) - (b.props!.idx ?? 0));
          const home = { x: L.x, y: L.y };
          const order = pz.kind === 'torches' ? pz.order!.map(i => parts.find(o => o.props!.idx === i)!) : parts;
          for (const o of order) {
            if (pz.kind === 'levers' && o.state === pz.bits![o.props!.idx]) continue;
            if (pz.kind === 'runes') { while (o.state !== pz.runes![o.props!.idx]) { lab.place(L, o.x, o.y + 16); (z as any).interact(L, o.id); } continue; }
            if (pz.kind === 'plates') { lab.place(L, o.x, o.y); (z as any).updateObjs?.(now); continue; }
            lab.place(L, o.x, o.y + 16); z.interact(L, o.id);
          }
          if (pz.kind === 'plates') for (let i = 0; i < 6; i++) { for (const o of parts) { lab.place(L, o.x, o.y); lab.step(bots); } }
          void RUNE_SYMBOLS;
          lab.place(L, home.x, home.y); // zurück an die freie Stelle, von der aus der Bot gelöst hat
          next();
          break;
        }
        case 'secret': { if (t.o.state === 0) (z as any).breakBoulder(t.o, L); next(); break; }
        case 'boss': {
          for (const b of bots) if (!b.p.dead && !z.boss?.active) goal(b, (room.cx + 0.5) * TILE, (room.cy + 2.5) * TILE);
          else if (!b.p.dead && !z.inRoom(room, b.p.x, b.p.y)) goal(b, (room.cx + 0.5) * TILE, (room.cy + 2.5) * TILE); else b.goto = null;
          lastProg = now;
          break;
        }
      }
    }
    lab.step(bots);
  }
  if (tasks[ti]) next();
  const res: ExpRunResult = {
    ok: !!run.done, sec: run.done ? run.done.sec : game.now - t0, deaths: bots.reduce((a, b, i) => a + b.p.char.deaths - d0[i], 0), potions: bots.reduce((a, b) => a + b.potions, 0),
    stuck, bossSec, minis: run.minis.size, secrets: run.secrets.size, kills: run.kills, byRole,
  };
  for (const b of bots) lab.leave(b);
  game.zones.delete(z.key);
  return res;
}
