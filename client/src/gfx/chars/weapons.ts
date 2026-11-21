/** Waffen und Requisiten der Figuren; alle entlang eines Winkels ab der Hand gezeichnet. */
import { Px } from '../draw';
import { P, WHITE, alpha, mix } from '../palette';
import type { Ramp } from '../palette';
import { axis, bar, linePts } from './rig';
import type { ItemFn, K, V2 } from './rig';

const put = (l: Px, p: V2, c: number): void => { l.set(p[0], p[1], c); };

/** Kriegerschwert: Goldknauf, Parierstange, zweifarbige Klinge. */
export const sword: ItemFn = (l, k, hx, hy, ang) => {
  const at = axis(hx, hy, ang);
  put(l, at(-2), P.gold[3]); put(l, at(-1), P.wood[2]);
  const a = at(3), b = at(10);
  bar(l, a[0], a[1], b[0], b[1], P.steel[4], P.steel[2]);
  put(l, at(11), P.steel[4]); put(l, at(6), WHITE); put(l, at(7), WHITE);
  for (let s = -2; s <= 2; s++) put(l, at(2, s), s === 0 ? P.gold[4] : Math.abs(s) === 2 ? P.gold[2] : P.gold[3]);
  k.tip = at(10);
};

/** Rundschild von vorn (r≈4.5) bzw. von der Kante. */
export function shieldFront(l: Px, cx: number, cy: number, r = 4.6): void {
  l.ell(cx, cy, r, r + 0.4, P.steel[2]);
  l.ball(cx, cy, r - 0.3, r + 0.1, P.steel, 2, 4, 0.05);
  l.ball(cx, cy, r - 1.5, r - 1.1, P.red, 1, 3, 0.05);
  l.rect(cx - 1, cy - 3, 1, 6, P.gold[3]); l.rect(cx - 3, cy - 1, 5, 1, P.gold[3]);
  l.rect(cx - 1, cy - 1, 1, 1, P.gold[4]); l.set(cx, cy, P.gold[2]);
}
export function shieldSide(l: Px, cx: number, cy: number): void {
  l.ell(cx, cy, 2, 5, P.steel[2]);
  l.rect(cx - 1, cy - 4, 1, 8, P.red[2]); l.rect(cx - 2, cy - 3, 1, 6, P.steel[4]); l.rect(cx, cy - 4, 1, 8, P.red[1]);
  l.rect(cx - 1, cy - 1, 1, 2, P.gold[3]);
}

/** Knorriger Magierstab mit Kristall in einer Astgabel. */
export const staff: ItemFn = (l, k, hx, hy, ang) => {
  const at = axis(hx, hy, ang);
  for (let t = -9; t <= 10; t += 0.5) put(l, at(t, t > 4 && t < 8 ? 0.6 : t < -4 && t > -7 ? -0.6 : 0), Math.round(t) % 4 === 0 ? P.wood[2] : P.wood[3]);
  put(l, at(-2, 1), P.wood[2]); put(l, at(2), P.gold[3]); put(l, at(3), P.gold[2]);
  for (const s of [-1, 1]) { put(l, at(10, s), P.wood[3]); put(l, at(11, s * 2), P.wood[s < 0 ? 4 : 2]); put(l, at(12, s * 2), P.wood[s < 0 ? 4 : 2]); put(l, at(13, s * 2), P.wood[3]); }
  const fl = k.ps.flare;
  for (let t = 11; t <= 15; t++) put(l, at(t), fl > 1 ? WHITE : P.teal[4]);
  for (let t = 12; t <= 14; t++) { put(l, at(t, -1), fl > 2 ? WHITE : fl ? P.teal[4] : P.teal[3]); put(l, at(t, 1), fl > 1 ? P.teal[4] : P.teal[2]); }
  put(l, at(12, -1), WHITE);
  k.tip = at(13);
};
/** Leuchten um die Kristallspitze (nach der Kontur aufzutragen). */
export function tipGlow(p: Px, k: K, c: number): void {
  const fl = k.ps.flare, t = k.tip;
  if (!t) return;
  const r = fl ? 2 + fl : 2;
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const d = Math.hypot(x, y);
    if (d > r + 0.3 || d < 1.2) continue;
    const a = fl ? 150 - d * 26 : 70 - d * 22;
    const px = t[0] + x, py = t[1] + y;
    if (a > 12 && px > 0 && px < 31 && py > 0 && py < 36 && p.get(px, py) >>> 24 < 255) p.blend(px, py, alpha(c, a));
  }
  if (fl >= 2) for (const [dx, dy] of [[0, -r - 1], [r + 1, 0], [-r - 1, 0], [0, r + 1]]) { const px = t[0] + dx, py = t[1] + dy; if (px > 0 && px < 31 && py > 0 && py < 36) p.blend(px, py, alpha(WHITE, 200)); }
}

/** Recurvebogen in der Nebenhand; ang = Schussrichtung. Sehne läuft bei Auszug zur Haupthand. */
export const bow: ItemFn = (l, k, hx, hy, ang) => {
  const at = axis(hx, hy, ang), pull = k.ps.bow;
  const curve = (s: number): number => { const u = Math.abs(s) / 8; return 1.4 - 3.6 * u * u + (u > 0.72 ? (u - 0.72) * 9 : 0) + pull * 0.5 * u; };
  const tipA = at(curve(-8), -8), tipB = at(curve(8), 8);
  const sc = P.cream[3];
  if (pull > 0) {
    const m: V2 = [k.mh[0] + 1, k.mh[1] + 1];
    for (const q of linePts(tipA[0], tipA[1], m[0], m[1])) put(l, q, sc);
    for (const q of linePts(tipB[0], tipB[1], m[0], m[1])) put(l, q, sc);
  } else for (const q of linePts(tipA[0], tipA[1], tipB[0], tipB[1])) put(l, q, sc);
  if (k.ps.arrow) {
    // 'aup': Schuss von der Kamera weg – der Pfeil zeigt neben dem Bogen nach oben
    const aup = k.ps.tag.includes('aup'), a = ((aup ? -90 : ang) * Math.PI) / 180, m: V2 = aup ? at(-2, 2 + pull * 2) : pull > 0 ? [k.mh[0] + 1, k.mh[1] + 1] : at(-1);
    const len = aup ? 10 : Math.abs(Math.sin(a)) > 0.9 ? 10 : 12;
    const e: V2 = [Math.round(m[0] + Math.cos(a) * len), Math.round(m[1] + Math.sin(a) * len)];
    const pts = linePts(m[0], m[1], e[0], e[1]);
    pts.forEach((q, i) => put(l, q, i >= pts.length - 2 ? P.steel[4] : i < 2 ? P.red[3] : P.tan[4]));
    k.tip = e;
  } else k.tip = at(3);
  for (let s = -8; s <= 8; s += 0.25) {
    const a = Math.abs(s);
    put(l, at(curve(s), s), a > 7.2 ? P.gold[3] : a < 1.6 ? P.forest[4] : s < 0 ? P.tan[3] : P.tan[2]);
    if (a < 6.5 && a > 1.6) put(l, at(curve(s) + 1, s), P.tan[s < 0 ? 2 : 1]);
  }
};

/** Kriegshammer: kurzer Schaft, heller Steinkopf mit Goldbändern und strahlendem Kern. */
export const hammer: ItemFn = (l, k, hx, hy, ang) => {
  const at = axis(hx, hy, ang), a = (ang * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a);
  const s0 = at(-3), s1 = at(8);
  bar(l, s0[0], s0[1], s1[0], s1[1], P.wood[3], P.wood[2]);
  put(l, at(-3), P.gold[3]); put(l, at(-4), P.gold[2]); put(l, at(3), P.gold[3]); put(l, at(6), P.gold[2]);
  // Schattenseite: wohin die Normale nach unten/rechts zeigt
  const dn = -dy + dx >= 0 ? 1 : -1;
  // von vorn/hinten senkrecht gehalten sieht man die schmale Stirnseite
  const end = k.dir !== 1 && Math.abs(dy) > 0.9, hw = end ? 2.5 : 4.5;
  for (let t = 8; t <= 12.01; t += 0.5) for (let s = -hw; s <= hw + 0.01; s += 0.5) {
    const as = Math.abs(s), far = s * dn > 0;
    let c = P.cream[3];
    if (end) c = as > 1.6 || t < 8.6 || t > 11.6 ? (far || t > 11.6 ? P.gold[2] : P.gold[3]) : P.cream[4];
    else if (as > 3.2) c = far ? P.gold[2] : P.gold[3];
    else if (t < 8.6) c = far ? P.cream[2] : P.cream[4];
    else if (t > 11.6) c = P.cream[2];
    else if (far && as > 1.6) c = P.cream[2];
    else if (!far && as > 1.6) c = P.cream[4];
    put(l, at(t, s), c);
  }
  const fl = k.ps.flare;
  put(l, at(10), fl ? WHITE : P.gold[4]); put(l, at(10, 1), P.gold[fl ? 4 : 3]); put(l, at(10, -1), P.gold[fl ? 4 : 3]); put(l, at(9), P.gold[3]); put(l, at(11), P.gold[3]);
  k.tip = at(10);
};

/** Krummdolch (Rückhandgriff: Klinge zeigt vom kleinen Finger weg). bend = Krümmungsseite. */
export function dagger(l: Px, k: K, hx: number, hy: number, ang: number, bend = 1): void {
  const at = axis(hx, hy, ang);
  put(l, at(-1), P.ash[3]); put(l, at(-2), P.teal[3]);
  put(l, at(1, -1), P.teal[3]); put(l, at(1, 1), P.teal[2]); put(l, at(1), P.teal[4]);
  for (let t = 2; t <= 6; t++) { const s = t > 4 ? bend : t > 2 ? bend * 0.5 : 0; put(l, at(t, s), P.steel[4]); if (t < 5) put(l, at(t, s + bend), P.steel[2]); }
  put(l, at(4, 0.5 * bend), WHITE);
}

// ---------------------------------------------------------------- NPC-Requisiten
/** Schlichter Wanderstab / Gehstock; top = Verzierung. */
export function stick(l: Px, hx: number, hy: number, ang: number, up: number, down: number, r: Ramp, knob?: number): void {
  const at = axis(hx, hy, ang);
  for (let t = -down; t <= up; t += 0.5) put(l, at(t), Math.round(t) % 5 === 0 ? r[2] : r[3]);
  if (knob !== undefined) { put(l, at(up + 1), knob); put(l, at(up, 1), r[3]); put(l, at(up + 1, 1), r[2]); put(l, at(up + 2, 0), r[3]); }
}
export function spear(l: Px, hx: number, hy: number, ang: number, up: number, down: number, tint = 0): void {
  const at = axis(hx, hy, ang), t3 = (c: number) => (tint ? mix(c, tint, 0.55) : c);
  for (let t = -down; t <= up; t += 0.5) put(l, at(t), t3(P.wood[3]));
  put(l, at(up - 1), t3(P.red[2])); put(l, at(up - 1, 1), t3(P.red[2])); put(l, at(up - 2, 1), t3(P.red[1]));
  for (let t = up; t <= up + 4; t++) { put(l, at(t), t3(P.steel[4])); if (t < up + 3 && t > up) { put(l, at(t, 1), t3(P.steel[2])); put(l, at(t, -1), t3(P.steel[3])); } }
}

/** Schmiedehammer */
export function smithHammer(l: Px, hx: number, hy: number, ang: number): void {
  const at = axis(hx, hy, ang);
  for (let t = -1; t <= 5; t++) put(l, at(t), P.wood[3]);
  for (let t = 5; t <= 7; t++) for (let s = -2; s <= 2; s++) put(l, at(t, s), s < -1 ? P.steel[4] : s > 1 ? P.steel[1] : t === 5 ? P.steel[3] : P.steel[2]);
}
/** Spitzhacke */
export function pickaxe(l: Px, hx: number, hy: number, ang: number): void {
  const at = axis(hx, hy, ang);
  for (let t = -2; t <= 11; t += 0.5) put(l, at(t), Math.round(t) % 4 === 0 ? P.wood[2] : P.wood[3]);
  for (let s = -5; s <= 5; s += 0.5) { const u = s / 5, t = 11 - u * u * 2.6; put(l, at(t, s), Math.abs(s) > 3.4 ? P.steel[4] : P.steel[3]); if (Math.abs(s) < 3.5) put(l, at(t + 1, s), P.steel[2]); }
  put(l, at(11), P.steel[1]); put(l, at(12), P.steel[1]);
}
/** Aufgeschlagenes Buch */
export function book(l: Px, x: number, y: number, side = false): void {
  if (side) { l.rect(x, y, 4, 5, P.red[2]); l.rect(x + 1, y, 3, 4, P.cream[4]); l.rect(x + 1, y + 3, 3, 1, P.cream[2]); l.rect(x, y, 1, 5, P.red[1]); return; }
  l.rect(x, y, 8, 5, P.red[2]); l.rect(x, y + 4, 8, 1, P.red[1]);
  l.rect(x + 1, y, 3, 4, P.cream[4]); l.rect(x + 4, y, 3, 4, P.cream[3]); l.rect(x + 1, y + 1, 2, 1, P.cream[2]); l.rect(x + 5, y + 2, 2, 1, P.cream[2]); l.set(x + 4, y + 1, P.cream[2]);
}
