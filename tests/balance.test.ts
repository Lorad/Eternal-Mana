/**
 * Balance (0.8): ein schneller Ausschnitt des Spieltests (scripts/playtest.ts) als Wächter. Bots mit dem Spielermodell
 * aus scripts/playtest/model.ts kämpfen echte Kämpfe; geprüft werden KORRIDORE, keine einzelnen Zahlen. Wer einen
 * Boss doppelt so hart schlagen lässt, Gegnerleben halbiert oder eine Klasse abhängt, bekommt hier Bescheid.
 * Die Begründung der Korridore steht in docs/GAME_DESIGN.md (Abschnitt „Balance“).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { CFG } from '../shared/src/config';
import { CLASS_IDS } from '../shared/src/data/classes';
import { BOSSES } from '../shared/src/data/enemies';
import { EXPEDITION_LIST } from '../shared/src/data/expeditions';
import { riftPar } from '../shared/src/data/rifts';
import { computeStats } from '../shared/src/stats';
import type { ClassId } from '../shared/src/types';
import { Rng } from '../shared/src/util/rng';
import { plausibleChar } from '../scripts/playtest/chars';
import { Lab } from '../scripts/playtest/lab';
import { BOSS_STOPS, expeditionXp, measureBoss, measureZone, pacing } from '../scripts/playtest/measure';
import { SKILL } from '../scripts/playtest/model';
import { echoFight, riftChar } from '../scripts/playtest/runs';
import { dummyDps } from '../scripts/playtest/world';

let lab: Lab;
beforeAll(() => {
  // gleicher Zufall bei jedem Lauf (Erwachte, Wetter, Beute würfeln sonst mit Math.random)
  const r = new Rng(20261125);
  vi.spyOn(Math, 'random').mockImplementation(() => r.next());
  lab = new Lab();
});
afterAll(() => { lab.close(); vi.restoreAllMocks(); });

const stop = (boss: string) => BOSS_STOPS.find(b => b.boss === boss)!;
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

describe('Balance – Wächter über die wichtigsten Korridore', () => {
  it('Tempo: am Boss steht der Spieler nie weit unter und nie weit über dessen Stufe – gerechnet über die Expeditionen (0.11)', () => {
    // seit 0.9 führt jeder alte Dungeon-Eingang in die Expedition der Region: Kapitel 1–6 rechnen mit ihr, nicht mit der alten Karte
    expect(pacing(0.8, 60).slice(0, 6).map(r => r.exp)).toEqual(['exp_gruenwald', 'exp_kristall', 'exp_glut', 'exp_frost', 'exp_ruinen', 'exp_schatten']);
    for (const r of pacing(0.8, 60)) { expect(r.atBoss - r.bossLevel, `Kapitel ${r.ch} mit Nebenaufgaben`).toBeGreaterThanOrEqual(-1); expect(r.atBoss - r.bossLevel, `Kapitel ${r.ch} mit Nebenaufgaben`).toBeLessThanOrEqual(3); }
    for (const r of pacing(0, 35)) { expect(r.atBoss - r.bossLevel, `Kapitel ${r.ch} nur Hauptlinie`).toBeGreaterThanOrEqual(-5); expect(r.atBoss - r.bossLevel, `Kapitel ${r.ch} nur Hauptlinie`).toBeLessThanOrEqual(1); }
    // die Höchststufe fällt ins letzte Drittel der Geschichte, nicht in den ersten Akt
    expect(pacing(0.8, 60)[5].leave).toBeLessThan(CFG.player.maxLevel);
    // ein erster Abschluss auf Normal bei empfohlener Stufe: knapp zwei Stufen (bis 0.11: zweieinhalb bis gut drei)
    const levels = (from: number, xp: number) => { let l = from; while (xp >= CFG.xpToNext(l)) { xp -= CFG.xpToNext(l); l++; } return l - from + xp / CFG.xpToNext(l); };
    for (const x of EXPEDITION_LIST) {
      const e = expeditionXp(x.id, x.rec), up = levels(x.rec, e.mobs + e.minis + e.event + e.clear);
      expect(up, `${x.name}: Stufen je Abschluss`).toBeGreaterThan(1.3);
      expect(up, `${x.name}: Stufen je Abschluss`).toBeLessThan(2.6);
    }
    // Gold in Akt I: mehr als mit den alten Dungeons (zehn Plätze kosten doppelt so viel Verbessern), aber kein Vielfaches
    const gold = (rows: { gold: number }[]) => rows.slice(0, 6).reduce((a, r) => a + r.gold, 0);
    const g = gold(pacing(0.8, 60)) / gold(pacing(0.8, 60, { old: true }));
    expect(g).toBeGreaterThan(1.15);
    expect(g).toBeLessThan(1.8);
  });

  it('Gewöhnliche Gegner: ein paar Treffer, kein Dauerfeuer – und sie tun etwas, ohne zu töten', { timeout: 120_000 }, () => {
    for (const [zone, lo, hi] of [['gruenwald', 0.1, 1.6], ['frost', 0.3, 3.5], ['schatten', 0.8, 6]] as const) {
      const rows = (['krieger', 'magier'] as ClassId[]).map(cls => measureZone(lab, zone, cls, SKILL.mittel, 1, 6));
      const ttk = mean(rows.map(r => r.ttk)), taken = mean(rows.map(r => r.taken));
      expect(ttk, `${zone}: Sekunden je Gegner`).toBeGreaterThan(lo);
      expect(ttk, `${zone}: Sekunden je Gegner`).toBeLessThan(hi);
      expect(taken, `${zone}: Schaden je Gruppe (× Leben)`).toBeLessThan(0.6);
      expect(mean(rows.map(r => r.deathsH)), `${zone}: Tode je Stunde`).toBeLessThan(4);
    }
  });

  it('Bosse der Geschichte: lang genug für alle drei Phasen, für durchschnittliche Spieler zu schaffen, aber nicht geschenkt', { timeout: 240_000 }, () => {
    // [Boss, Dauer von–bis (s), erlittener Schaden von–bis (× eigenes Leben)]
    for (const [boss, t0, t1, d0, d1] of [['dornenmutter', 22, 80, 0.15, 2], ['hohlkoenig', 55, 170, 1, 5], ['aetherion', 65, 200, 1.4, 6.5]] as const) {
      const rows = (['krieger', 'magier', 'schattenjaeger'] as ClassId[]).map(cls => measureBoss(lab, stop(boss), [cls], SKILL.mittel, 2));
      const name = BOSSES[boss].name;
      expect(mean(rows.map(r => r.win)), `${name}: Siege durchschnittlicher Spieler`).toBeGreaterThanOrEqual(0.66);
      const t = mean(rows.filter(r => r.time > 0).map(r => r.time));
      expect(t, `${name}: Kampfdauer`).toBeGreaterThan(t0);
      expect(t, `${name}: Kampfdauer`).toBeLessThan(t1);
      const d = mean(rows.map(r => r.taken));
      expect(d, `${name}: erlittener Schaden (× Leben)`).toBeGreaterThan(d0);
      expect(d, `${name}: erlittener Schaden (× Leben)`).toBeLessThan(d1);
      expect(rows.every(r => r.timeouts === 0), `${name}: kein Kampf läuft ins Leere`).toBe(true);
    }
  });

  it('Sorgfältig gespielt ist der letzte Boss sicher – niemand stirbt gezwungen', { timeout: 120_000 }, () => {
    const rows = (['paladin', 'waldlaeufer'] as ClassId[]).map(cls => measureBoss(lab, stop('aetherion'), [cls], SKILL.sorgsam, 2));
    expect(mean(rows.map(r => r.win))).toBe(1);
  });

  it('Eine Salve trifft einmal: wer im Boss steht, stirbt nicht an sechzehn Geschossen zugleich', () => {
    expect(CFG.combat.shotGrace).toBeGreaterThanOrEqual(0.2);
    const b = lab.join(plausibleChar('schattenjaeger', 16, { seed: 1 }), SKILL.mittel, 1);
    const z = lab.enter([b], 'gruenwald', 1), p = b.p;
    p.iframesUntil = 0;
    const hp0 = p.hp;
    for (let i = 0; i < 16; i++) z.spawnProj({ x: p.x, y: p.y - 6, vx: Math.cos(i) * 90, vy: Math.sin(i) * 90, life: 2, r: 5, hostile: true, lvl: 17, raw: 60, el: 'fire', pierce: 0, by: 'Probe' }, 'orb');
    (lab.game as any).tick(0.05);
    const lost = hp0 - p.hp;
    expect(lost).toBeGreaterThan(0);
    expect(lost).toBeLessThan(60 * 1.2); // genau ein Treffer
    lab.leave(b);
  });

  it('Klassen: der Schaden der schwächsten liegt bei mindestens 60 % der stärksten (vor 0.8: 47 %); Lebensraub ist gedeckelt', { timeout: 120_000 }, () => {
    const dps = CLASS_IDS.map(cls => dummyDps(lab, [plausibleChar(cls, 40, { seed: 1 })], SKILL.mittel, 4, { sec: 30 }));
    expect(Math.min(...dps) / Math.max(...dps), CLASS_IDS.map((c, i) => `${c} ${Math.round(dps[i])}`).join(', ')).toBeGreaterThan(0.6);
    const sj = plausibleChar('schattenjaeger', 40, { seed: 1 });
    sj.equip.weapon!.affixes.push(['lifesteal', 30]);
    expect(computeStats(sj).lifesteal).toBeLessThanOrEqual(CFG.combat.lifestealCap);
  });

  it('Mana-Risse: Stufe 1 gelingt mit der Ausrüstung aus der Geschichte, Stufe 15 mit Riss-Ausrüstung – und beides dauert', { timeout: 240_000 }, () => {
    const a = (['krieger', 'magier'] as ClassId[]).map((cls, i) => echoFight(lab, 'gletscherdom', 1, [riftChar(cls, 1, 'geschichte', 1)], SKILL.mittel, 3 + i, ['finsternis'])!);
    expect(a.every(r => r.ok), 'Stufe 1').toBe(true);
    expect(mean(a.map(r => r.bossSec / r.bossTries))).toBeGreaterThan(25);
    expect(mean(a.map(r => r.bossSec / r.bossTries))).toBeLessThan(140);
    const b = (['krieger', 'magier'] as ClassId[]).map((cls, i) => echoFight(lab, 'gletscherdom', 15, [riftChar(cls, 15, 'riss', 1)], SKILL.mittel, 5 + i, ['finsternis', 'erwacht'])!);
    expect(b.every(r => r.ok), 'Stufe 15').toBe(true);
    expect(mean(b.map(r => r.bossSec / r.bossTries))).toBeGreaterThan(40);
    expect(mean(b.map(r => r.bossSec / r.bossTries))).toBeLessThan(240);
    // die Richtzeit ist ein Ziel, kein Geschenk: wenige Minuten, wachsend mit der Stufe
    expect(riftPar('wurzelgruft', 1)).toBeLessThan(200);
    expect(riftPar('thron', 30)).toBeGreaterThan(riftPar('thron', 1) + 200);
    expect(riftPar('thron', 30)).toBeLessThan(600);
  });
});
