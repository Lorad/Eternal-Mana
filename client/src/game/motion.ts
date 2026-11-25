/**
 * Eigene Bewegung in Echtzeit, unabhängig von der Bildrate (0.8).
 *
 * Früher war der Zeitschritt eines Bildes auf 50 ms gedeckelt: Unter 20 Bildern pro Sekunde lief die eigene Figur
 * langsamer als in Echtzeit (und die Ausweichrolle kam nicht so weit wie bei allen anderen). Jetzt wird die wirklich
 * vergangene Zeit nachgeholt – in kurzen Teilschritten, damit die Kollision so genau bleibt wie bei 60 Bildern.
 *
 * Ohne Phaser und ohne DOM, damit die Tests (tests/client.test.ts) diese Datei direkt benutzen können.
 */
import { moveCircle, type SolidFn } from '../../../shared/src/collision';

/**
 * Längster Zeitraum, den ein einzelnes Bild nachholt (Sekunden). Mehr verfällt: Der Server gewährt je Meldung höchstens
 * 0,3 s Bewegungsbudget (server/src/game.ts `move`), und nach einem Hänger (Tab im Hintergrund) soll die Figur nicht springen.
 * Bis hinunter zu 4 Bildern pro Sekunde bleibt die Bewegung damit in Echtzeit.
 */
export const MAX_CATCHUP = 0.25;
/** Länge eines Teilschritts der eigenen Bewegung (Sekunden) */
export const SUB_STEP = 1 / 60;

/** Vergangene Zeit seit dem letzten Bild in Sekunden – echte Uhr, nach oben begrenzt. `lastMs` = 0 heißt: erstes Bild. */
export function frameSeconds(nowMs: number, lastMs: number): number {
  if (!lastMs) return SUB_STEP;
  return Math.max(0, Math.min(MAX_CATCHUP, (nowMs - lastMs) / 1000));
}

export interface SelfMotion {
  /** Lauftempo in Pixeln je Sekunde, Verlangsamung schon eingerechnet (0 = festgewurzelt) */
  speed: number;
  /** Faktor während der Ausweichrolle */
  rollMul: number;
  /** Rolle läuft von … bis … (Millisekunden, dieselbe Uhr wie `nowMs`) in Richtung `rollDir` */
  rollFrom: number; rollUntil: number; rollDir: number;
  /** bis dahin steht die Figur (Angriffsanimation) */
  lockUntil: number;
  /** gewünschte Laufrichtung, Länge ≤ 1 (0 = steht) */
  mx: number; my: number;
}
export interface SelfStep { x: number; y: number; /** zurückgelegter Weg */ dist: number; /** Geschwindigkeit des letzten bewegten Teilschritts */ vx: number; vy: number }

/**
 * Bewegt die eigene Figur über den Zeitraum (nowMs − dt, nowMs]. Jeder Teilschritt entscheidet für seinen eigenen
 * Zeitpunkt, ob gerollt, gelaufen oder gestanden wird – eine Rolle ist deshalb bei jeder Bildrate gleich lang.
 */
export function advanceSelf(solid: SolidFn, x: number, y: number, radius: number, nowMs: number, dt: number, m: SelfMotion): SelfStep {
  const out: SelfStep = { x, y, dist: 0, vx: 0, vy: 0 };
  if (!(dt > 0)) return out;
  const n = Math.max(1, Math.ceil(dt / SUB_STEP - 1e-6)), h = dt / n;
  const t0 = nowMs - dt * 1000;
  const walking = Math.hypot(m.mx, m.my) > 0.1;
  for (let i = 0; i < n; i++) {
    const t = t0 + i * h * 1000;
    let vx = 0, vy = 0;
    if (t >= m.rollFrom && t < m.rollUntil) { const s = m.speed * m.rollMul; vx = Math.cos(m.rollDir) * s; vy = Math.sin(m.rollDir) * s; }
    else if (walking && t >= m.lockUntil) { vx = m.mx * m.speed; vy = m.my * m.speed; }
    if (!vx && !vy) continue;
    const r = moveCircle(solid, out.x, out.y, vx * h, vy * h, radius);
    out.dist += Math.hypot(r.x - out.x, r.y - out.y);
    out.x = r.x; out.y = r.y; out.vx = vx; out.vy = vy;
  }
  return out;
}
