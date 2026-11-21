/** Gegner des Schattenreichs: Schattenwandler, Leerenbrut, Nachtmahr, Hohlritter. */
import { Px, bez, tube } from '../draw';
import type { Pt } from '../draw';
import { P, INK, WHITE, alpha } from '../palette';
import type { Ramp } from '../palette';
import { R, deathFx, dots, form, glow, puff, shredUp, spark, xf } from './kit';
import type { Fr, MobDef, MobFn } from './kit';
import { slimeBody, slimeGeo, slimeState } from './slime';
import type { Profile } from './slime';
import { quad, quadPose } from './quad';
import type { QLook } from './quad';
import { biped, bipPose } from './biped';
import type { BLook } from './biped';
import { sword } from './ruinen';

/** Zeichnet in einen Puffer, legt einen kalten Lichtsaum um die Silhouette und überträgt nach p. */
function rimmed(p: Px, c: number, fn: (b: Px) => void): void { const b = new Px(p.w, p.h); fn(b); b.outline(c); p.draw(b); }
function arcW(p: Px, a: Pt, c: Pt, b: Pt, col: number): void { const pts = bez(a, c, b, 24); pts.forEach((q, i) => { const t = i / pts.length; p.blend(R(q[0]), R(q[1]), alpha(col, R(230 * t))); if (t > 0.4) p.blend(R(q[0] - 1), R(q[1] + 1), alpha(col, R(120 * t))); }); }

// ================================================================ Schattenwandler
const SH: Ramp = [P.shadow[1], P.shadow[3], P.shadow[4], P.violet[2], P.violet[3]];
const SH_FAR: Ramp = [P.shadow[0], P.shadow[2], P.shadow[3], P.shadow[3], P.shadow[4]];
const WANDLER: BLook = {
  w: 48, h: 40, cx: -3, hip: 12, torsoH: 9, stance: 2, legR: [1, 1], legs: false, armL: 11, armR: [1.3, 0.9], shN: [-1, 1], shF: [2, 1], skin: SH, far: SH_FAR,
  torso: (l, k, b) => {
    const s = k.sh, h = k.hip, t = b.fr.i + (b.fr.a === 'move' ? b.fr.i : 0), sw = Math.sin(t * 1.3) * 1.5, tr = b.fr.a === 'move' || b.fr.a === 'attack' ? 4 : 0;
    // Unterleib zerfließt in Schwaden
    tube(l, bez([h[0], h[1] - 1], [h[0] - 2 + sw, h[1] + 6], [h[0] - 3 - tr + sw * 1.5, k.G - 0.5], 10), 2.8, 0.7, SH, 1);
    tube(l, bez([h[0] + 1, h[1]], [h[0] + 3 - sw, h[1] + 5], [h[0] + 1 - tr * 0.5 - sw, k.G - 3], 8), 1.8, 0.5, SH, 1);
    tube(l, bez([h[0] - 1, h[1]], [h[0] - 5, h[1] + 3 + sw], [h[0] - 8 - tr, h[1] + 7 + sw], 8), 1.5, 0.5, SH_FAR, 1);
    form(l, (m) => { m.poly([[s[0] - 3.5, s[1]], [s[0] + 3.5, s[1]], [h[0] + 2.4, h[1] + 1], [h[0] - 2.4, h[1] + 1]], 1); m.ell(s[0], s[1] + 1, 4.2, 2.2, 1); }, SH, 1, 4, 0.05);
    // Magenta-Ader in der Brust
    const mx = R((s[0] + h[0]) / 2), my = R(s[1] + 3); l.px([mx, my, mx + 1, my + 1, mx, my + 2, mx + 1, my + 3, mx, my + 4], P.pink[b.fr.a === 'windup' ? 4 : 2]); l.set(mx + 1, my + 1, P.pink[3]);
    // Schulterfetzen
    l.poly([[s[0] - 3, s[1]], [s[0] - 8 - tr, s[1] - 2 + sw], [s[0] - 4, s[1] + 3]], SH[1]);
  },
  head: (l, x, y, b) => {
    const hx = R(x + 2), hy = R(y - 4), sw = Math.sin(b.fr.i * 1.4) * 1.2;
    l.poly([[hx - 2, hy - 3], [hx - 7, hy - 7 + sw], [hx - 3, hy]], SH[2]); l.poly([[hx - 2, hy], [hx - 6, hy - 1 - sw], [hx - 2, hy + 2]], SH[1]);
    l.ball(hx, hy, 3.3, 4.3, SH, 1, 4);
    const flare = b.mood === 'angry' || b.mood === 'open';
    if (b.mood === 'shut') l.px([hx - 1, hy - 1, hx, hy - 1, hx + 2, hy - 1], P.violet[1]);
    else { l.px([hx - 1, hy - 2, hx, hy - 1, hx + 2, hy - 1, hx + 3, hy - 2], WHITE); if (flare) l.px([hx - 1, hy - 1, hx, hy, hx + 2, hy, hx - 2, hy - 3], WHITE); if (b.mood === 'blink') l.px([hx - 1, hy - 2, hx + 3, hy - 2], SH[2]); }
    if (b.mood === 'open') l.px([hx, hy + 2, hx + 1, hy + 3, hx + 2, hy + 2], P.pink[3]);
  },
  hand: (l, h, b, near) => {
    // drei lange Klauen in Armrichtung
    const d = near ? b.armN : b.armF, n = Math.hypot(d[0], d[1]) || 1, a = Math.atan2(d[1] / n, d[0] / n) + (b.fr.a === 'idle' ? Math.sin(b.fr.i * 1.5) * 0.15 : 0);
    for (const [da, len] of [[-0.42, 5], [0, 6.5], [0.42, 5]] as const) { const tx = h[0] + Math.cos(a + da) * len, ty = h[1] + Math.sin(a + da) * len; l.line(R(h[0]), R(h[1]), R(tx), R(ty), near ? P.violet[4] : P.violet[2]); if (near) l.set(R(tx), R(ty), WHITE); }
  },
  behind: (p, k, b) => { const i = b.fr.i; for (let s = 0; s < 3; s++) puff(p, k.sh[0] - 7 - s * 3 - (b.fr.a === 'move' ? 2 : 0), k.sh[1] + 2 + s * 4 - ((i + s) % 3), 2.6 - s * 0.4, 2, P.violet[1], 120 - s * 30); if (b.fr.a === 'windup') glow(p, k.neck[0] + 2, k.neck[1] - 4, 5 + i, P.violet[3], 90); },
  over: (p, k, b) => {
    const f = b.fr, h = k.handN;
    if (f.a === 'attack' && f.i === 0) arcW(p, [h[0] - 12, h[1] - 9], [h[0] + 5, h[1] - 12], [h[0] + 8, h[1] - 1], WHITE);
    if (f.a === 'attack' && f.i === 1) { arcW(p, [h[0] - 2, h[1] - 14], [h[0] + 12, h[1] - 9], [h[0] + 8, h[1] + 5], WHITE); arcW(p, [h[0] - 5, h[1] - 11], [h[0] + 8, h[1] - 7], [h[0] + 5, h[1] + 6], P.violet[4]); }
    if (f.a === 'attack' && f.i === 2) dots(p, [h[0] + 7, h[1] - 3, h[0] + 9, h[1] + 1, h[0] + 5, h[1] + 5], P.violet[4]);
  },
};
function wandlerPose(fr: Fr): ReturnType<typeof bipPose> {
  const b = bipPose(fr, 'slash', 11), i = fr.i;
  b.lean += 2; b.feet = [[0, 0], [0, 0]];
  if (fr.a === 'idle') { b.armN = [4, 8 + [0, 0, 1, 1][i]]; b.armF = [5, 7 + [0, 1, 1, 0][i]]; }
  if (fr.a === 'move') { b.lean += 2; b.armN = [-3, 8 + (i & 1)]; b.armF = [-2, 7]; }
  if (fr.a === 'windup') { b.dy = [2, 3][i]; b.armN = [[-6, -5], [-8, -8]][i] as unknown as Pt; b.armF = [[-5, -2], [-7, -4]][i] as unknown as Pt; }
  if (fr.a === 'attack') { b.armN = [[9, -4], [9, 5], [6, 8]][i] as unknown as Pt; b.armF = [[7, -1], [8, 6], [5, 8]][i] as unknown as Pt; }
  return b;
}
const schattenwandler: MobFn = (p, fr) => {
  if (fr.a === 'death' && fr.i >= 1) {
    const b = new Px(48, 40); biped(b, WANDLER, wandlerPose({ ...fr, i: 0 })); b.outline(P.violet[1]);
    deathFx(p, b, fr.i, 'shred', 35, 13);
    // die Augen verlöschen zuletzt
    const c = alpha(WHITE, [0, 255, 255, 220, 140][fr.i]); dots(p, [19, 12, 20, 13, 22, 13, 23, 12], c);
    return;
  }
  rimmed(p, P.violet[1], (b) => biped(b, WANDLER, wandlerPose(fr)));
};

// ================================================================ Leerenbrut
const LV: Ramp = [P.shadow[1], P.shadow[3], P.shadow[4], P.violet[2], P.violet[3]];
const EYES: ReadonlyArray<readonly [number, number, number]> = [[0.12, 0.45, 3], [-0.52, 0.3, 2], [0.66, 0.6, 2], [-0.25, 0.74, 2], [0.6, 0.2, 2]];
function brutDraw(p: Px, fr: Fr, st: ReturnType<typeof slimeState>, shutAll = false): void {
  const i = fr.i, t = fr.a === 'move' ? i * 1.3 : i;
  const blob: Profile = (v) => Math.sqrt(Math.max(0, 1 - Math.pow(v, 2.2))) * (0.86 + 0.14 * Math.min(1, v / 0.15)) * (1 + 0.09 * Math.sin(v * 8 + t * 1.6));
  const g = slimeGeo(32, 32, 8.8, 13, st, blob);
  p.layer((l) => {
    // Tentakel
    const up = fr.a === 'windup' ? 3 : 0, fw = fr.a === 'attack' && i < 2 ? 1 : 0;
    for (const [u, len, ph] of [[-0.7, 6, 0], [-0.15, 7, 2], [0.5, 6, 4]] as const) {
      const a = g.at(u, 0.85), sw = Math.sin(t * 1.5 + ph) * 2;
      const tip: Pt = fw ? [a[0] + 9 + len, a[1] + 3 + ph] : [a[0] + u * 4 + sw - (fr.a === 'move' ? 3 : 0), a[1] - len - up];
      const pts = tube(l, bez(a, [a[0] + u * 2 - sw + (fw ? 4 : 0), a[1] - len * 0.7 - up], tip, 8), 1.5, 0.6, LV, 1); const e = pts[pts.length - 1]; l.set(R(e[0]), R(e[1]), P.pink[3]);
    }
    slimeBody(l, g, LV, 1, 4, blob, 0.04);
    for (const [u, v] of [[-0.7, 0.55], [0.3, 0.8], [0.8, 0.35], [-0.3, 0.15]] as const) { const q = g.at(u, v); l.set(R(q[0]), R(q[1]), P.pink[2]); l.set(R(q[0]) + 1, R(q[1]) + 1, P.pink[1]); }
    // viele Augen, die reihum blinzeln
    EYES.forEach(([u, v, s], k) => {
      const q = g.at(u, v), x = R(q[0]) - 1, y = R(q[1]) - 1;
      const closed = shutAll || st.mood === 'shut' || st.mood === 'dead' || (fr.a === 'idle' && (i + k) % 4 === 3) || (fr.a === 'move' && (i + k * 2) % 6 === 5);
      if (closed) { l.rect(x, y + 1, s + 1, 1, P.shadow[0]); return; }
      l.rrect(x, y, s + 1, s, WHITE); const hot = st.mood === 'angry' || st.mood === 'open';
      l.rect(x + (s > 2 ? 2 : 1), y + (s > 2 ? 1 : 0), s > 2 ? 2 : 1, s > 2 ? 2 : s, hot ? P.red[2] : P.pink[2]); l.set(x + (s > 2 ? 3 : 1), y + (s > 2 ? 1 : 1), INK);
    });
    if (st.mood === 'open') { const m = g.at(0.55, 0.3); l.ell(m[0] + 1, m[1] + 1, 2.6, 3.2, INK); l.px([m[0], m[1] - 1, m[0] + 2, m[1] - 1, m[0] + 1, m[1] + 3], WHITE); l.set(R(m[0] + 1), R(m[1] + 1), P.pink[1]); }
  });
}
const leerenbrut: MobFn = (p, fr) => {
  const i = fr.i, st = slimeState(fr);
  if (fr.a === 'death' && i >= 1) {
    // stürzt in sich zusammen
    const b = new Px(32, 32); st.sq = 0; st.mood = 'dead'; brutDraw(b, fr, st, true);
    const s = [1, 0.74, 0.5, 0.26, 0][i];
    if (s > 0) { const c = xf(b, { sx: s, sy: s, ax: 15, ay: 20 }); c.outline(P.violet[2]); p.draw(c); }
    const rr = [0, 9, 11, 12.5, 13.5][i];
    for (let k = 0; k < 16; k++) { const a = k * 0.3927 + i * 0.3; if ((k + i) % (i >= 3 ? 3 : 2) === 0) p.blend(R(15 + Math.cos(a) * rr), R(20 + Math.sin(a) * rr * 0.6), alpha(i === 4 ? P.violet[2] : P.pink[3], 255 - i * 40)); }
    if (i >= 3) { p.set(15, 20, WHITE); if (i === 3) spark(p, 15, 20, WHITE, P.pink[4], 2); }
    return;
  }
  if (fr.a === 'windup') glow(p, 16 + st.dx, 20, 11 + i * 2, P.pink[1], 70);
  rimmed(p, P.violet[1], (b) => brutDraw(b, fr, st));
  if (fr.a === 'windup' && i === 1) dots(p, [4, 12, 27, 9, 6, 24, 28, 22], P.pink[3]);
};

// ================================================================ Nachtmahr
const NM: Ramp = [P.shadow[1], P.steel[0], P.steel[1], P.steel[2], P.steel[3]];
const NM_FAR: Ramp = [P.shadow[0], P.shadow[2], P.steel[0], P.steel[0], P.steel[1]];
function flames(l: Px, a: Pt, b: Pt, n: number, h: number, t: number, back = 1.2): void {
  for (let s = 0; s < n; s++) {
    const u = s / (n - 1), x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u, hh = h + ((s * 2 + t) % 3) * 1.4;
    l.poly([[x - 1.8, y + 2], [x - back * (1.5 + ((s + t) % 2)), y - hh], [x + 1.8, y + 1.5]], P.violet[2 + ((s + t) % 2)]);
    l.set(R(x - 0.5), R(y - hh * 0.35), P.violet[4]); l.set(R(x - back), R(y - hh + 1), P.pink[3]);
  }
}
const MAHR: QLook = {
  w: 56, h: 48, coat: NM, far: NM_FAR,
  hip: [19, 26], sh: [33, 25], rump: [5.8, 5.4], chest: [6, 6.2], neck: [6.5, -9.5], neckR: 2.7, tuck: 3,
  legF: [8, 8.4, 1.9, 1.1], legH: [6.2, 6, 2.2, 1.1], hock: [-2, -6], paw: 1.6,
  head: (l, x, y, q) => {
    const hx = R(x), hy = R(y), j = Math.min(3, q.jaw);
    l.poly([[hx - 2.5, hy - 2.5], [hx - 2 - q.ear * 2, hy - 8 + q.ear * 2], [hx + 0.5, hy - 3]], NM[2]); l.poly([[hx, hy - 3], [hx + 2 - q.ear * 2, hy - 7.5 + q.ear * 2], [hx + 2.5, hy - 2.5]], NM[1]);
    if (j) { l.poly([[hx + 1, hy + 3], [hx + 7.5, hy + 5 + j], [hx + 6, hy + 6.5 + j], [hx, hy + 4.5]], NM[1]); l.poly([[hx + 2, hy + 3.5], [hx + 7.5, hy + 4.5], [hx + 6.5, hy + 4.5 + j]], P.pink[2]); }
    form(l, (m) => { m.ell(hx, hy, 3.7, 3.5, 1); m.poly([[hx + 1, hy - 3], [hx + 9, hy + 1.5], [hx + 9, hy + 4.5], [hx + 5, hy + 5], [hx - 1, hy + 3.5]], 1); }, NM, 1, 4, 0.08);
    l.px([hx + 8, hy + 3, hx + 5, hy + 4, hx + 7, hy + 4], WHITE); l.set(hx + 8, hy + 2, P.pink[3]);
    if (q.eye === 'shut' || q.eye === 'blink') l.rect(hx + 1, hy - 1, 2, 1, P.shadow[0]); else { l.rect(hx + 1, hy - 1, 2, 1, WHITE); l.px([hx, hy - 1, hx - 1, hy - 2], P.pink[3]); if (q.eye === 'angry') { l.set(hx + 2, hy, WHITE); l.set(hx - 2, hy - 3, P.pink[2]); } }
    l.px([hx + 3, hy + 1, hx + 4, hy + 2], NM[1]);
  },
  tail: (l, x, y, q) => {
    const a = q.tail * 1.1, t = q.fr.i, mx = x - Math.cos(a) * 5, my = y - Math.sin(a) * 5 + 1, tx = x - Math.cos(a * 1.3) * 11, ty = y - Math.sin(a * 1.3) * 11 + 3;
    tube(l, bez([x + 1, y + 1], [mx, my], [tx, ty], 8), 1.8, 0.8, P.violet, 1); flames(l, [x - 1, y], [tx + 1, ty - 1], 4, 2.5, t, 1.6); l.set(R(tx), R(ty), P.pink[4]);
  },
  back: (l, k, q) => {
    const t = q.fr.i, big = q.fr.a === 'windup' || q.fr.a === 'attack' ? 2 : 0;
    flames(l, [k.sh[0] - 5, k.sh[1] - 5.6], [k.head[0] - 2.5, k.head[1] - 3], 6, 3.5 + big, t);
    // durchscheinende Rippen
    for (let s = 0; s < 3; s++) { const x = k.hip[0] + 5 + s * 3, y = (k.hip[1] + k.sh[1]) / 2 - 1; l.line(R(x), R(y), R(x - 1), R(y + 3), NM[1]); }
    l.px([k.sh[0] + 1, k.sh[1] + 1, k.sh[0] + 2, k.sh[1] + 2, k.hip[0] - 1, k.hip[1] - 1], P.violet[3]);
  },
  foot: (l, x, y, near) => { l.rect(R(x - 1), R(y - 1), 3, 2, P.shadow[0]); l.set(R(x - 1), R(y - 1), near ? P.violet[3] : P.violet[1]); l.set(R(x - 1), R(y - 3), near ? P.pink[3] : P.violet[2]); l.set(R(x - 2), R(y - 2), near ? P.violet[4] : P.violet[2]); },
  behind: (p, k, q) => { if (!(q.fr.a === 'death' && q.fr.i > 1)) glow(p, k.sh[0] - 1, k.sh[1] - 9, 8, P.violet[2], 60); },
  over: (p, k, q) => {
    const a = q.fr.a, i = q.fr.i;
    if (a === 'move') dots(p, [k.hip[0] - 12 - (i % 3), k.hip[1] - 4, k.hip[0] - 15, k.hip[1] + 2 + (i & 1), k.hip[0] - 9, k.hip[1] - 9], P.pink[3]);
    if (a === 'windup') { dots(p, [k.head[0] + 11, k.head[1] + 3 - i, k.head[0] + 13, k.head[1] + 1 - i * 2], P.pink[4]); puff(p, k.head[0] + 11, k.head[1] + 4, 2.4, 1.6, P.violet[3], 140); }
    if (a === 'attack' && i === 1) { spark(p, k.sh[0] + 11, k.G - 1, WHITE, P.pink[4], 2); dots(p, [k.sh[0] + 6, k.G - 3, k.sh[0] + 15, k.G - 4, k.sh[0] + 13, k.G - 7, k.sh[0] + 8, k.G - 6], P.violet[4]); }
  },
};
function mahrPose(fr: Fr): ReturnType<typeof quadPose> {
  const q = quadPose(fr, 'rear');
  if (fr.a === 'windup') { q.sh = [[-3, -5], [-4, -8]][fr.i] as unknown as Pt; q.head = [[-2, 0], [-3, 1]][fr.i] as unknown as Pt; }
  if (fr.a === 'attack' && fr.i === 0) { q.sh = [1, -5]; q.head = [1, 0]; }
  return q;
}
const nachtmahr: MobFn = (p, fr) => {
  if (fr.a === 'death' && fr.i >= 2) {
    const b = new Px(56, 48); quad(b, MAHR, mahrPose({ ...fr, i: 2 })); b.outline(P.violet[1]);
    const s = shredUp(b, [0, 0, 0.15, 0.5, 0.85][fr.i], 17, 14); if (fr.i === 4) s.alphaMul(0.55); p.draw(s);
    dots(p, [[], [], [14, 30, 36, 28], [18, 24, 30, 20, 40, 26], [24, 16, 33, 13]][fr.i], P.pink[3]);
    return;
  }
  rimmed(p, P.violet[2], (b) => quad(b, MAHR, mahrPose(fr)));
};

// ================================================================ Hohlritter
const ARM: Ramp = [P.shadow[1], P.steel[0], P.steel[1], P.steel[2], P.steel[3]];
const ARM_FAR: Ramp = [P.shadow[0], P.shadow[1], P.steel[0], P.steel[0], P.steel[1]];
function soul(fr: Fr): number { return fr.a === 'windup' ? [P.violet[4], WHITE][fr.i] : fr.a === 'attack' ? [WHITE, P.violet[4], P.violet[3]][fr.i] : fr.a === 'hit' ? P.violet[1] : fr.a === 'death' ? (fr.i === 0 ? WHITE : P.shadow[1]) : P.violet[[3, 3, 4, 3, 3, 4][fr.i]]; }
function ritterDir(fr: Fr): Pt { const i = fr.i; return fr.a === 'windup' ? [[-0.94, -0.4], [-0.9, -0.55]][i] as unknown as Pt : fr.a === 'attack' ? [[0.75, -0.65], [0.8, 0.6], [0.85, 0.5]][i] as unknown as Pt : fr.a === 'hit' ? [-0.2, -1] : fr.a === 'death' ? [0.6, -0.8] : [-0.5, -1]; }
const RITTER: BLook = {
  w: 48, h: 48, cx: -3, hip: 12, torsoH: 12, stance: 3.5, legR: [2.6, 2.3], armL: 11, armR: [2.4, 2.1], shN: [-3, 2], shF: [5, 2], skin: ARM, far: ARM_FAR,
  torso: (l, k, b) => {
    const s = k.sh, h = k.hip, cx = (s[0] + h[0]) / 2, cy = (s[1] + h[1]) / 2, g0 = soul(b.fr), g = g0 === WHITE ? P.violet[4] : g0;
    form(l, (m) => { m.ell(cx, cy - 1, 6.4, 7.4, 1); m.poly([[h[0] - 6, h[1] - 1], [h[0] + 6, h[1] - 1], [h[0] + 5.5, h[1] + 4], [h[0] - 5.5, h[1] + 4]], 1); }, ARM, 1, 4, 0.06);
    // Taillen- und Halsfuge, durch die das Leuchten dringt
    l.rect(R(h[0] - 4), R(h[1] - 2), 9, 1, g); l.rect(R(h[0] - 4), R(h[1] - 1), 9, 1, ARM[0]); l.line(R(h[0]), R(h[1]), R(h[0]), R(h[1] + 3), ARM[1]);
    l.line(R(cx - 1), R(cy - 6), R(cx - 1), R(cy + 2), ARM[4]); l.px([cx + 2, cy - 3, cx + 3, cy - 2, cx + 2, cy - 1, cx + 3, cy], g); l.rect(R(s[0] - 2), R(s[1]), 5, 1, g);
    // Schulterstücke: vorne groß mit Dorn
    l.ball(s[0] + 5.5, s[1] + 2, 3.2, 2.8, ARM_FAR, 1, 4);
    l.poly([[s[0] - 6, s[1] - 1], [s[0] - 7, s[1] - 6], [s[0] - 3, s[1] - 1.5]], ARM[3]); l.ball(s[0] - 4, s[1] + 1.5, 4.4, 3.7, ARM, 1, 4); l.rect(R(s[0] - 7), R(s[1] + 4), 7, 1, ARM[1]); l.set(R(s[0] - 6), R(s[1]), WHITE);
  },
  head: (l, x, y, b) => {
    const hx = R(x + 1), hy = R(y - 5), g = soul(b.fr);
    l.poly([[hx - 3, hy - 2], [hx - 9, hy - 8], [hx - 6, hy - 2], [hx - 2, hy - 4.5]], ARM[3]); l.set(hx - 8, hy - 7, WHITE); l.poly([[hx + 1, hy - 4], [hx - 2, hy - 9], [hx + 3, hy - 4]], ARM[2]);
    l.ball(hx, hy, 4.5, 4.9, ARM, 1, 4); l.rect(hx - 3, hy + 4, 7, 1, ARM[1]);
    if (b.mood === 'shut') { l.rect(hx, hy - 1, 4, 1, P.violet[1]); l.rect(hx + 2, hy, 1, 3, P.shadow[0]); }
    else { l.rect(hx - 1, hy - 1, 6, 1, g); l.rect(hx + 2, hy, 1, 3, g); l.set(hx + 3, hy - 1, WHITE); l.rect(hx - 1, hy - 2, 6, 1, P.shadow[0]); }
    l.px([hx - 3, hy - 3, hx - 2, hy - 4], ARM[4]); l.rect(hx - 1, hy + 5, 3, 1, g);
  },
  hand: (l, h, b, near) => {
    if (near) { const d = ritterDir(b.fr), tip = sword(l, h, d[0], d[1], 18, [P.shadow[0], P.shadow[2], P.steel[0], P.steel[1], P.steel[2]], 1.6, P.gold[1], soul(b.fr)); l.set(R(tip[0]), R(tip[1]), P.violet[4]); l.set(R(h[0] + d[0] * 6), R(h[1] + d[1] * 6), soul(b.fr)); l.set(R(h[0] + d[0] * 10), R(h[1] + d[1] * 10), soul(b.fr)); }
    l.ball(h[0], h[1], 2.3, 2.3, near ? ARM : ARM_FAR, 1, 4);
  },
  foot: (l, x, y, near) => { const r = near ? ARM : ARM_FAR; l.poly([[x - 2, y - 2.5], [x + 4.5, y - 0.5], [x + 4.5, y + 1], [x - 2, y + 1]], r[2]); l.set(R(x - 1), R(y - 2), r[3]); },
  behind: (p, k, b) => {
    // zerfetzter Umhang
    const i = b.fr.i, w = Math.sin(b.fr.ph + i * 0.8) * 1.5, tr = b.fr.a === 'move' || b.fr.a === 'attack' ? 3 : 0, s = k.sh, top = s[1] + 1, bot = k.G - 3;
    p.layer((l) => {
      l.poly([[s[0] - 5, top], [s[0] + 2, top], [k.hip[0] - 2, bot - 4], [k.hip[0] - 5 - tr, bot], [k.hip[0] - 7 - tr + w, bot - 3], [k.hip[0] - 9 - tr + w, bot + 1], [k.hip[0] - 11 - tr + w, bot - 4], [s[0] - 9 - tr * 0.5, top + 8]], P.violet[1]);
      l.line(R(s[0] - 6), R(top + 3), R(k.hip[0] - 9 - tr + w), R(bot - 5), P.violet[0]); l.line(R(s[0] - 3), R(top + 4), R(k.hip[0] - 5 - tr), R(bot - 3), P.violet[0]); l.px([k.hip[0] - 8 - tr + w, bot - 1, s[0] - 7, top + 6], P.violet[2]);
    });
  },
  over: (p, k, b) => {
    const f = b.fr, i = f.i, h = k.handN, nx = k.neck[0] + 3, ny = k.neck[1] - 6;
    if (!(f.a === 'death' && i > 0)) { glow(p, nx, ny, 4 + (f.a === 'windup' ? 2 + i : 0), P.violet[3], f.a === 'hit' ? 30 : 90); for (let s = 0; s < 3; s++) puff(p, nx + 1 - s * 1.5 - (f.a === 'move' ? s : 0), ny - 4 - s * 3 - ((i + s) % 3), 1.8 - s * 0.3, 1.6 - s * 0.2, P.violet[3], 130 - s * 35); }
    if (f.a === 'attack' && i === 0) arcW(p, [h[0] - 14, h[1] - 3], [h[0] - 2, h[1] - 18], [h[0] + 13, h[1] - 12], P.violet[4]);
    if (f.a === 'attack' && i === 1) { arcW(p, [h[0] + 2, h[1] - 19], [h[0] + 19, h[1] - 10], [h[0] + 14, h[1] + 9], WHITE); spark(p, h[0] + 13, h[1] + 10, WHITE, P.violet[4], 2); dots(p, [h[0] + 9, h[1] + 8, h[0] + 16, h[1] + 7, h[0] + 12, h[1] + 5], P.violet[4]); }
    if (f.a === 'windup' && i === 1) spark(p, h[0] - 15, h[1] - 9, WHITE, P.violet[4]);
  },
};
function ritterPose(fr: Fr): ReturnType<typeof bipPose> {
  const b = bipPose(fr, 'slash', 11), i = fr.i;
  if (fr.a === 'idle' || fr.a === 'move') b.armN = [5, 6 + (fr.a === 'idle' ? [0, 0, 1, 1][i] : [0, 1, 0, 0, 1, 0][i])];
  if (fr.a === 'windup') { b.armN = [[2, -4], [1, -6]][i] as unknown as Pt; b.dx = [0, -1][i]; b.feet = [[2, 0], [-1, 0]]; }
  if (fr.a === 'attack') { b.armN = [[8, -5], [9, 3], [7, 6]][i] as unknown as Pt; b.dx = [1, 3, 2][i]; }
  if (fr.a === 'hit') b.armN = [4, 3];
  if (fr.a === 'death') { b.armN = [6, 2]; b.dx = -1; }
  b.armF = [b.armN[0] - 8, b.armN[1]];
  return b;
}
const hohlritter: MobFn = (p, fr) => {
  if (fr.a === 'death' && fr.i >= 1) {
    // das Leuchten entweicht, die Rüstung fällt scheppernd auseinander
    const b = new Px(48, 48); biped(b, RITTER, ritterPose(fr));
    deathFx(p, b, fr.i, 'shatter', 43, 29, { cell: 5, heap: 4, cx: 21, pop: 3 });
    for (let s = 0; s < 4 - fr.i; s++) puff(p, 20 + Math.sin(s * 2.3 + fr.i) * 5, 26 - fr.i * 6 - s * 4, 3 - fr.i * 0.5, 2.4, P.violet[3], 150 - fr.i * 30);
    if (fr.i < 3) dots(p, [17, 22 - fr.i * 5, 25, 18 - fr.i * 5], P.violet[4]);
    return;
  }
  rimmed(p, P.violet[0], (b) => biped(b, RITTER, ritterPose(fr)));
};

export const SCHATTEN: Record<string, MobDef> = {
  schattenwandler: { w: 48, h: 40, fn: schattenwandler },
  leerenbrut: { w: 32, h: 32, fn: leerenbrut },
  nachtmahr: { w: 56, h: 48, fn: nachtmahr },
  hohlritter: { w: 48, h: 48, fn: hohlritter },
};
