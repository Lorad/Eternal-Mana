/**
 * Boss-Echos (0.5): die Zusatzmechanik jedes Bosses im Mana-Riss. Namen und Beschreibungen stehen in
 * shared/src/data/rifts.ts (ECHO_BOSS), die Stärke in CFG.rift.echo. BossCtl (boss.ts) ruft diese Haken auf:
 *   start   – einmal zu Kampfbeginn            phase – bei jedem Phasenwechsel
 *   pattern – zusätzliches Angriffsmuster, das in jeder Phase mit an die Reihe kommt
 *   speed   – Faktor auf das Tempo aller Muster (> 1 = kürzere Pausen)
 */
import { TILE } from '../../shared/src/maps/tiles';
import { Anim } from '../../shared/src/types';
import type { BossCtl } from './boss';

export type BossKit = ReturnType<BossCtl['kit']>;
type Gen = Generator<number, void, void>;
export interface EchoMech { speed?: number; start?(k: BossKit): void; phase?(k: BossKit, phase: number): void; pattern?(k: BossKit): Gen }

export const ECHO_MECH: Record<string, EchoMech> = {
  /** Dornensaat: angekündigte Felder, die als Giftlachen liegen bleiben und den Raum enger machen */
  dornenmutter: {
    *pattern(k) {
      k.anim(Anim.Special, 1.6);
      k.say('*Dornensaat: Leuchtende Samen regnen in den Raum.*');
      const spots: [number, number][] = [];
      for (let i = 0; i < 4 + k.boss.phase; i++) spots.push(k.rndPos(2));
      for (const [x, y] of spots) k.tele(x, y, 26, 1.0, 1.0, { id: 'poison', dur: 3, chance: 0.6 });
      yield 1.05;
      for (const [x, y] of spots) k.pool(x, y, 26, 8, 0.35, { id: 'poison', dur: 2, chance: 0.5 });
      yield 0.5;
    },
  },
  /** Prismengitter: waagrechte Lichtbahnen – erst die geraden, dann die ungeraden Reihen */
  kristallkoloss: {
    *pattern(k) {
      const r = k.boss.room, x0 = r.x0 * TILE, x1 = (r.x1 + 1) * TILE;
      k.anim(Anim.Special, 2.5);
      k.say('*Prismengitter: Das Licht in seiner Brust fächert sich auf.*');
      for (let par = 0; par < 2; par++) {
        for (let ty = r.y0 + 1, i = 0; ty <= r.y1; ty += 2, i++) if (i % 2 === par) k.beam(x0, (ty + 0.5) * TILE, x1, (ty + 0.5) * TILE, TILE * 1.6, 1.0, 1.4, 'light');
        yield 1.15;
      }
      yield 0.3;
    },
  },
  /** Schlackenbrut: Glutimps zu Kampfbeginn und bei jedem Phasenwechsel */
  ignarok: {
    start(k) { k.summon('glutimp', 2); },
    phase(k) { k.say('*Aus der Lava klettert Schlackenbrut.*'); k.summon('glutimp', 2); },
  },
  /** Spiegelschritt: zwei Sprünge kurz hintereinander, an jedem verlassenen Ort bleibt ein Frostfeld */
  ysolde: {
    *pattern(k) {
      const b = k.boss;
      for (let i = 0; i < 2; i++) {
        k.anim(Anim.Special, 0.3); yield 0.3;
        k.pool(b.mob.x, b.mob.y, 30, 6, 0.35, { id: 'slow', dur: 1.5 });
        const [x, y] = k.rndPos(3);
        k.moveTo(x, y);
        k.anim(Anim.Attack, 0.3); yield 0.3;
        k.radial(14, 120, b.zone.rng.range(0, 1), 'shard', 0.8, b.zone.rng.range(0, 6.28), 0.5);
        yield 0.4;
      }
    },
  },
  /** Schnellschrift: alle Muster folgen um ein Viertel schneller aufeinander */
  archivar: { speed: 1.25 },
  /** Kronenschatten: Leerenbrut von Beginn an; ein Ring aus Einschlägen zieht sich in drei Stufen um die Raummitte zusammen (je eine Lücke) */
  hohlkoenig: {
    start(k) { k.summon('leerenbrut', 2); },
    *pattern(k) {
      const b = k.boss, g = b.zone.rng;
      k.anim(Anim.Special, 2.4);
      k.say('„Die Krone wirft noch Schatten.“ – Der Ring zieht sich zusammen!');
      for (let ring = 3; ring >= 1; ring--) {
        const rad = ring * 44, n = 5 + ring * 3, gap = g.int(0, n - 1);
        for (let i = 0; i < n; i++) {
          if (i === gap || i === (gap + 1) % n) continue;
          const a = (i / n) * Math.PI * 2;
          k.tele(b.cx + Math.cos(a) * rad, b.cy + Math.sin(a) * rad, 21, 0.95, 1.3, { id: 'mark', dur: 4, chance: 0.4 });
        }
        yield 0.6;
      }
      yield 0.6;
    },
  },
  /** Wachablösung (nur in der Prüfung der Sieben): Wachschatten von Beginn an, kürzere Pausen */
  vael: { speed: 1.15, start(k) { k.summon('wachschatten', 2); } },
};
