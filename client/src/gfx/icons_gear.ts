/**
 * 24x24-Icons der neuen Ausrüstungsplätze (0.9/0.10): Handschuhe, Beine, Schuhe je Rüstungsart (schwer = Stahl,
 * leicht = Leder, Robe = Stoff), Nebenhand (Schild, Köcher, Foliant, Fokus, Parierdolch) und die Platzhalter
 * `slot_<platz>` für leere Ausrüstungsplätze (die UI graut sie aus, siehe `.slot .ghost-icon`).
 * Aufbau wie icons_craft.ts: gezeichnet, danach konturiert (iconPx); `GEAR_GLOW` legt Schein darüber. Keys ohne `item_`.
 */
import { Px } from './draw';
import { P, Ramp, WHITE, alpha, mix } from './palette';

type Fn = (p: Px) => void;
const I = P.steel, L = P.tan, W = P.wood, Y = P.gold;
/** Robenstoff (Violett-Indigo) und Hüterblau */
const CL: Ramp = [P.violet[0], P.violet[1], mix(P.violet[2], P.blue[2], 0.3), mix(P.violet[3], P.blue[3], 0.3), mix(P.violet[4], P.ice[3], 0.3)];
const HB: Ramp = [mix(P.blue[0], P.violet[0], 0.3), P.blue[1], mix(P.blue[2], P.teal[2], 0.25), mix(P.blue[3], P.teal[3], 0.3), mix(P.blue[4], P.teal[4], 0.3)];

/** Handschuh (Handrücken nach vorn, Finger nach oben): Stulpe unten, R = Rampe, plates = Stahlschienen */
function glove(p: Px, R: Ramp, plates: boolean): void {
  // Stulpe
  p.poly([[5, 23], [5, 16], [16, 15], [17, 22]], R[1]); p.poly([[5, 23], [5, 16], [8, 16], [8, 23]], R[2]); p.rect(5, 15, 12, 2, R[3]);
  // Handrücken und Finger
  p.rrect(6, 7, 11, 9, R[2]); p.rect(7, 7, 3, 8, R[3]);
  for (const [x, top] of [[6, 2], [9, 1], [12, 2], [15, 4]] as const) { p.rect(x, top, 3, 7 - top + 2, R[2]); p.rect(x, top, 1, 7 - top + 2, R[3]); p.set(x, top, R[4]); }
  // Daumen
  p.poly([[17, 12], [21, 8], [22, 10], [18, 15]], R[2]); p.line(18, 12, 21, 9, R[3]);
  if (plates) {
    for (const [x, top] of [[6, 2], [9, 1], [12, 2], [15, 4]] as const) for (let y = top + 2; y < 9; y += 2) p.rect(x, y, 3, 1, R[1]);
    p.rect(6, 10, 11, 1, R[1]); p.rect(6, 13, 11, 1, R[1]); p.rect(5, 18, 12, 1, Y[2]); p.set(7, 11, WHITE);
  }
}
/** Hose/Beinschutz: Bund oben, zwei Beine */
function legs(p: Px, R: Ramp): void {
  p.poly([[5, 3], [19, 3], [20, 22], [14, 22], [12, 11], [10, 22], [4, 22]], R[2]);
  p.poly([[5, 3], [9, 3], [8, 22], [4, 22]], R[3]); p.poly([[15, 8], [19, 3], [20, 22], [17, 22]], R[1]);
  p.rect(5, 3, 15, 3, R[1]); p.rect(5, 3, 15, 1, R[3]); p.line(12, 11, 12, 6, R[1]);
}
/** Stiefelpaar (seitlich) */
function boots(p: Px, R: Ramp, tall: number, cuff?: number): void {
  for (const [dx, dy, k] of [[6, -1, 1], [0, 1, 0]] as const) {
    const x = 3 + dx, y = 22 + dy, top = y - tall;
    p.rect(x, top, 7, tall - 3, R[2 + k - 1 < 1 ? 1 : 2]); p.rect(x, top, 2, tall - 3, R[3]);
    p.poly([[x, y - 4], [x + 7, y - 4], [x + 13, y - 2], [x + 13, y], [x, y]], R[2]); p.rect(x, y - 1, 14, 2, R[0]); p.rect(x + 1, y - 4, 6, 1, R[3]);
    if (cuff !== undefined) { p.rect(x - 1, top, 9, 2, cuff); }
  }
}

export const GEAR_ICONS: Record<string, Fn> = {
  gloves_heavy: (p) => glove(p, I, true),
  gloves_light: (p) => { glove(p, L, false); for (let y = 9; y < 14; y += 2) p.set(12, y, L[0]); p.rect(5, 18, 12, 1, W[2]); p.set(15, 19, Y[3]); },
  gloves_robe: (p) => { glove(p, CL, false); p.rect(5, 17, 12, 2, Y[2]); p.px([10, 10, 11, 9, 12, 10, 11, 11], P.teal[4]); p.set(11, 10, WHITE); },
  legs_heavy: (p) => { legs(p, I); for (const x of [5, 15]) { p.rect(x, 9, 5, 4, I[3]); p.rect(x, 9, 5, 1, I[4]); p.rect(x, 16, 5, 1, I[1]); } p.rect(5, 3, 15, 2, Y[2]); p.set(7, 10, WHITE); },
  legs_light: (p) => { legs(p, L); p.rect(5, 4, 15, 1, W[2]); p.rect(11, 4, 3, 2, Y[3]); for (let y = 8; y < 21; y += 3) { p.set(6, y, L[0]); p.set(18, y, L[0]); } },
  legs_robe: (p) => { legs(p, CL); p.rect(5, 4, 15, 2, Y[2]); p.rect(4, 20, 6, 2, Y[2]); p.rect(14, 20, 6, 2, Y[2]); p.set(12, 8, P.teal[4]); },
  boots_heavy: (p) => { boots(p, I, 16, Y[2]); for (const [x, y] of [[4, 9], [10, 7]] as const) { p.rect(x, y + 3, 7, 3, I[3]); p.rect(x, y + 3, 7, 1, I[4]); p.set(x + 1, y + 4, WHITE); } },
  boots_light: (p) => { boots(p, L, 14, L[4]); p.px([5, 16, 5, 18, 11, 14, 11, 16], W[1]); },
  boots_robe: (p) => { boots(p, CL, 8, Y[2]); p.px([14, 20, 20, 18], P.teal[4]); },
  shield: (p) => {
    p.poly([[3, 3], [21, 3], [21, 11], [12, 22], [3, 11]], HB[2]); p.poly([[3, 3], [12, 3], [12, 22], [3, 11]], HB[3]);
    p.rect(3, 3, 18, 2, Y[3]); p.line(3, 4, 3, 11, Y[3]); p.line(21, 4, 21, 11, Y[2]); p.line(3, 11, 12, 22, Y[3]); p.line(21, 11, 12, 22, Y[2]);
    p.rect(11, 6, 2, 12, Y[3]); p.rect(7, 9, 10, 2, Y[3]); p.ball(12, 10, 2.2, 2.2, P.teal, 2, 4); p.set(11, 9, WHITE); p.set(5, 5, WHITE);
  },
  quiver: (p) => {
    for (const [x, c] of [[8, P.red], [11, P.gold], [14, P.ice]] as const) { p.line(x, 9, x + 2, 1, W[3]); p.poly([[x + 1, 3], [x + 3, 0], [x + 4, 4]], c[3]); }
    p.poly([[5, 9], [15, 7], [19, 21], [10, 23]], W[2]); p.poly([[5, 9], [9, 8], [13, 23], [10, 23]], W[3]); p.rect(5, 8, 11, 3, L[1]); p.line(6, 15, 17, 13, Y[2]); p.line(8, 20, 18, 18, L[1]);
    p.line(4, 10, 2, 22, L[2]);
  },
  tome: (p) => {
    p.rect(4, 3, 16, 19, CL[1]); p.rect(5, 3, 15, 18, CL[2]); p.rect(5, 3, 3, 18, CL[3]); p.rect(18, 4, 2, 17, P.cream[3]); p.rect(18, 4, 1, 17, P.cream[1]);
    p.rect(4, 3, 16, 1, Y[3]); p.rect(4, 21, 16, 1, Y[2]); for (const [x, y] of [[5, 4], [16, 4], [5, 19], [16, 19]] as const) p.rect(x, y, 2, 2, Y[3]);
    p.ell(12, 12, 4, 4, Y[2]); p.ball(12, 12, 2.6, 2.6, P.teal, 2, 4); p.set(11, 11, WHITE); p.rect(19, 11, 3, 3, Y[3]);
  },
  focus: (p) => {
    p.poly([[7, 22], [17, 22], [15, 18], [9, 18]], W[2]); p.rect(9, 17, 6, 2, Y[2]); p.line(9, 17, 7, 13, Y[3]); p.line(15, 17, 17, 13, Y[2]);
    p.ball(12, 10, 7, 7, [P.violet[1], P.violet[2], mix(P.violet[3], P.teal[3], 0.5), P.teal[3], P.teal[4]], 0, 4);
    p.ell(10, 8, 2, 1.5, mix(P.teal[4], WHITE, 0.5)); p.set(9, 7, WHITE);
  },
  offdagger: (p) => {
    p.line(9, 14, 19, 3, I[3], 3); p.line(9, 14, 19, 3, I[4], 2); p.line(11, 15, 20, 5, I[2]);
    // Parierkorb
    p.ell(9, 15, 4.5, 4.5, Y[2]); p.ell(9, 15, 3, 3, 0); p.line(5, 11, 13, 19, Y[3], 2);
    p.line(7, 17, 3, 21, W[2], 2); p.rect(2, 20, 3, 3, Y[3]); p.set(2, 20, Y[4]);
  },
};

/** Platzhalter für leere Plätze: Umriss eines typischen Gegenstands (wird von der UI ausgegraut). */
GEAR_ICONS.slot_offhand = GEAR_ICONS.shield;
GEAR_ICONS.slot_gloves = GEAR_ICONS.gloves_heavy;
GEAR_ICONS.slot_legs = GEAR_ICONS.legs_heavy;
GEAR_ICONS.slot_boots = GEAR_ICONS.boots_heavy;

/** Schein nach der Kontur */
export const GEAR_GLOW: Record<string, Fn> = {
  focus: (p) => { for (const [x, y] of [[3, 4], [20, 6], [19, 15], [4, 14]] as const) if (p.get(x, y) >>> 24 === 0) p.set(x, y, alpha(P.teal[4], 200)); },
  tome: (p) => { if (p.get(22, 9) >>> 24 === 0) p.set(22, 9, alpha(P.teal[4], 180)); },
};
