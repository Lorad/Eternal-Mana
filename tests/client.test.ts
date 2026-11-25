/**
 * Client-Logik ohne Browser (0.8): eigene Bewegung bei niedriger Bildrate, Tastenbelegung, Hinweise, Handbuch.
 * Alles hier sind reine Funktionen aus `client/src` – ohne Phaser und ohne DOM.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { MAX_CATCHUP, SUB_STEP, advanceSelf, frameSeconds, type SelfMotion } from '../client/src/game/motion';
import { CFG } from '../shared/src/config';
import type { ServerMsg } from '../shared/src/types';
import { Sim } from './helpers/sim';

const free = () => false;
const still: SelfMotion = { speed: 100, rollMul: 2.7, rollFrom: 0, rollUntil: 0, rollDir: 0, lockUntil: 0, mx: 0, my: 0 };

/** Läuft `sec` Sekunden mit fester Bildrate geradeaus und liefert die Endposition. */
function walk(fps: number, sec: number, m: SelfMotion, solid: (tx: number, ty: number) => boolean = free): { x: number; y: number } {
  let x = 0, y = 0, last = 1000;
  const end = 1000 + sec * 1000;
  for (let k = 1; ; k++) {
    const now = Math.min(end, 1000 + (k * 1000) / fps);
    const r = advanceSelf(solid, x, y, 5, now, frameSeconds(now, last), m);
    x = r.x; y = r.y; last = now;
    if (now >= end) break;
  }
  return { x, y };
}

describe('Eigene Bewegung bei niedriger Bildrate', () => {
  it('holt die echte Zeit nach, bis hinunter zu 4 Bildern pro Sekunde', () => {
    expect(frameSeconds(2000, 0)).toBeCloseTo(SUB_STEP);          // erstes Bild
    expect(frameSeconds(2016, 2000)).toBeCloseTo(0.016);
    expect(frameSeconds(2100, 2000)).toBeCloseTo(0.1);            // 10 Bilder/s: früher auf 0,05 gedeckelt
    expect(frameSeconds(2250, 2000)).toBeCloseTo(0.25);
    expect(frameSeconds(9000, 2000)).toBe(MAX_CATCHUP);           // Hänger: nicht alles nachholen
    expect(frameSeconds(1990, 2000)).toBe(0);                     // Uhr läuft nie rückwärts
  });

  it('läuft bei 60, 30, 15, 10, 5 und 4 Bildern pro Sekunde gleich weit', () => {
    for (const fps of [60, 30, 15, 10, 5, 4]) {
      const p = walk(fps, 2, { ...still, mx: 1 });
      expect(p.x, `${fps} Bilder/s`).toBeCloseTo(200, 3);         // 100 px/s × 2 s – der alte Deckel ergab bei 10 Bildern/s nur 100
      expect(p.y).toBe(0);
    }
  });

  it('rollt bei jeder Bildrate gleich weit und läuft danach weiter', () => {
    const dur = CFG.player.dodgeDuration * 1000;
    for (const fps of [60, 20, 10, 5]) {
      // Rolle beginnt bei 1000 ms; danach wird bis 2000 ms weitergelaufen
      const p = walk(fps, 1, { ...still, mx: 1, rollFrom: 1000, rollUntil: 1000 + dur, rollDir: 0 });
      const want = 100 * 2.7 * (dur / 1000) + 100 * (1 - dur / 1000);
      expect(Math.abs(p.x - want), `${fps} Bilder/s`).toBeLessThan(100 * 2.7 * SUB_STEP + 0.01); // höchstens ein Teilschritt Abweichung
    }
  });

  it('steht während der Angriffssperre und läuft nie durch eine Wand', () => {
    const locked = walk(10, 1, { ...still, mx: 1, lockUntil: 1500 });
    expect(locked.x).toBeCloseTo(50, 0);
    const wall = (tx: number) => tx >= 3;                          // Wand ab x = 48
    for (const fps of [60, 10, 4]) expect(walk(fps, 2, { ...still, mx: 1, speed: 400 }, wall).x, `${fps} Bilder/s`).toBeLessThan(48 - 5 + 0.01);
    expect(walk(10, 1, { ...still, mx: 1, speed: 0 }).x).toBe(0);  // festgewurzelt
  });
});

describe('Eigene Bewegung gegen den echten Server', () => {
  const sim = new Sim();
  afterAll(() => sim.close());

  /** Spielt den Client nach: Bilder im festen Abstand, Meldung höchstens alle 50 ms, Server im 50-ms-Takt. */
  function run(fps: number, roll: boolean): { rejected: number; cx: number; cy: number; sx: number; sy: number; moved: number } {
    sim.clear();
    const t = sim.join('Lauf' + fps + (roll ? 'r' : ''), 'krieger');
    const { z, x: x0, y: y0 } = sim.arena(t);
    t.p.epoch++; t.msgs.length = 0;
    const speed = t.p.stats.speed;
    // Richtung mit dem meisten freien Platz suchen
    let dir = 0, best = -1;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const r = advanceSelf(z.solidWalk, x0, y0, CFG.player.radius, 4000, 4 * MAX_CATCHUP, { ...still, speed, mx: Math.cos(a), my: Math.sin(a) });
      if (r.dist > best) { best = r.dist; dir = a; }
    }
    let x = x0, y = y0, last = 0, lastSend = -1e9, simT = 0, moved = 0;
    const m: SelfMotion = { ...still, speed, rollMul: CFG.player.dodgeSpeedMul, mx: Math.cos(dir), my: Math.sin(dir) };
    const frame = 1000 / fps;
    for (let now = frame; now <= 3000; now += frame) {
      while (simT + 50 <= now) { sim.step(0.05); simT += 50; }
      if (roll && m.rollUntil === 0 && now >= 1000) {
        m.rollFrom = now; m.rollUntil = now + CFG.player.dodgeDuration * 1000; m.rollDir = dir;
        t.send({ t: 'dodge', ang: dir });
      }
      const r = advanceSelf(z.solidWalk, x, y, CFG.player.radius, now, frameSeconds(now, last), m);
      moved += r.dist; x = r.x; y = r.y; last = now;
      if (now - lastSend >= 1000 / CFG.net.moveSendRate) {
        lastSend = now;
        t.send({ t: 'm', x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, f: 0, e: t.p.epoch, mv: 1 });
      }
    }
    const rejected = t.msgs.filter((msg: ServerMsg) => msg.t === 'pos').length;
    return { rejected, cx: x, cy: y, sx: t.p.x, sy: t.p.y, moved };
  }

  it('nimmt der Server die Bewegung bei jeder Bildrate an (kein Zurücksetzen), auch mit Ausweichrolle', () => {
    for (const roll of [false, true]) for (const fps of [60, 20, 12, 8, 5, 4]) {
      const r = run(fps, roll);
      expect(r.rejected, `${fps} Bilder/s${roll ? ' mit Rolle' : ''}: zurückgesetzt`).toBe(0);
      expect(Math.hypot(r.cx - r.sx, r.cy - r.sy), `${fps} Bilder/s: Server und Client auseinander`).toBeLessThan(1);
      expect(r.moved, `${fps} Bilder/s: zu wenig Weg`).toBeGreaterThan(60);
    }
  });
});
