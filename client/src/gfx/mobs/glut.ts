/** Gegner der Glutlande: Glutimp, Aschenhund, Magmaschleim, Schlackengolem. */
import { Px, bez, tube } from '../draw';
import type { Pt } from '../draw';
import { P, INK, WHITE, alpha } from '../palette';
import type { Ramp } from '../palette';
import { R, box, debris, deathFx, dissolve, dots, form, glow, pk, puff, shatter, slab, spark } from './kit';
import type { Fr, MobDef, MobFn } from './kit';
import { slimeBody, slimeGeo, slimeState } from './slime';
import type { Profile } from './slime';
import { quad, quadPose } from './quad';
import type { QLook } from './quad';
import { biped, bipPose } from './biped';
import type { BLook } from './biped';
import { wolfHead } from './gruenwald';

// ================================================================ Glutimp
const IMP_FAR: Ramp = [P.red[0], P.red[0], P.red[1], P.red[1], P.red[2]];
const IMP: BLook = {
  w: 32, h: 32, hip: 5, torsoH: 5, stance: 1.5, legR: [1.4, 1], armL: 6, armR: [1.2, 0.9], shN: [0, 1], shF: [2, 1], skin: P.red, far: IMP_FAR,
  torso: (l, k) => { const x = (k.hip[0] + k.sh[0]) / 2, y = (k.hip[1] + k.sh[1]) / 2 + 0.5; l.ball(x, y, 3.5, 3.9, P.red, 1, 3); l.ell(x + 1, y + 1, 1.9, 2.1, P.fire[2]); l.set(R(x + 1), R(y), P.fire[3]); },
  head: (l, x, y, b) => {
    const hx = R(x + 1), hy = R(y - 4);
    l.poly([[hx - 4, hy - 1], [hx - 8.5, hy - 3], [hx - 4, hy + 2.5]], P.red[2]); l.set(hx - 6, hy - 1, P.red[1]);
    l.poly([[hx - 3.5, hy - 3], [hx - 5.5, hy - 9.5], [hx - 0.5, hy - 4]], P.bone[3]); l.set(hx - 5, hy - 8, P.bone[4]); l.set(hx - 4, hy - 6, P.bone[4]); l.set(hx - 2, hy - 4, P.bone[1]);
    l.poly([[hx + 1, hy - 4], [hx + 4.5, hy - 7], [hx + 4, hy - 3.5]], P.bone[2]); l.set(hx + 4, hy - 7, 0);
    l.ball(hx, hy, 5, 4.3, P.red, 1, 4);
    l.poly([[hx + 3.5, hy - 1], [hx + 7.5, hy - 4], [hx + 5, hy + 2]], P.red[3]);
    if (b.mood === 'shut') l.px([hx - 1, hy - 1, hx, hy, hx + 1, hy - 1, hx + 3, hy - 1, hx + 4, hy, hx + 5, hy - 1], P.red[0]);
    else { l.rect(hx - 1, hy - 1, 2, 2, P.gold[4]); l.set(hx, hy, INK); l.rect(hx + 3, hy - 1, 2, 2, P.gold[4]); l.set(hx + 4, hy, INK); if (b.mood === 'blink') { l.rect(hx - 1, hy - 1, 2, 1, P.red[1]); l.rect(hx + 3, hy - 1, 2, 1, P.red[1]); } }
    l.px([hx - 2, hy - 3, hx - 1, hy - 2, hx, hy - 2, hx + 3, hy - 2, hx + 4, hy - 2, hx + 5, hy - 3], P.red[0]);
    if (b.mood === 'open') { l.rect(hx - 1, hy + 2, 6, 2, INK); l.px([hx - 1, hy + 2, hx + 1, hy + 2, hx + 3, hy + 2], WHITE); l.rect(hx + 1, hy + 3, 2, 1, P.fire[2]); }
    else { l.rect(hx - 1, hy + 2, 6, 1, INK); l.px([hx, hy + 2, hx + 2, hy + 2, hx + 4, hy + 2], WHITE); l.set(hx - 2, hy + 1, INK); l.set(hx + 5, hy + 1, INK); }
  },
  hand: (l, h) => { l.set(R(h[0] + 1), R(h[1]), P.red[4]); l.set(R(h[0] + 1), R(h[1] + 1), P.bone[4]); },
  behind: (p, k, b) => {
    const sw = Math.sin(b.fr.ph + b.fr.i) * 1.5, tx = k.hip[0] - 9, ty = k.hip[1] - 5 + sw;
    glow(p, tx, ty, 4.5, P.fire[2], 70);
    p.layer((l) => {
      l.poly([[k.sh[0] - 2, k.sh[1] + 1], [k.sh[0] - 7, k.sh[1] - 3 + (b.fr.i & 1)], [k.sh[0] - 6, k.sh[1] + 1], [k.sh[0] - 4, k.sh[1] + 4]], P.red[0]); l.set(R(k.sh[0] - 6), R(k.sh[1] - 2 + (b.fr.i & 1)), P.red[1]);
      tube(l, bez([k.hip[0] - 2, k.hip[1]], [k.hip[0] - 8, k.hip[1] + 3], [tx, ty + 2], 8), 0.9, 0.6, P.red, 1);
      l.ball(tx, ty, 2.1, 2.4, P.fire, 2, 4); l.set(R(tx), R(ty - 3 - (b.fr.i & 1)), P.fire[3]); l.set(R(tx - 1 + (b.fr.i % 3)), R(ty - 5), P.fire[2]);
    });
  },
  over: (p, k, b) => {
    const f = b.fr, h = k.handN;
    const ball = (x: number, y: number, r: number): void => { glow(p, x, y, r + 4, P.fire[2], 90); p.layer((l) => l.ball(x, y, r, r, P.fire, 2, 4), false); p.set(R(x - 0.5), R(y - 0.5), WHITE); };
    if (f.a === 'windup') { ball(h[0], h[1] - 3 - f.i, [2.3, 3.3][f.i]); dots(p, f.i ? [h[0] - 5, h[1] - 9, h[0] + 5, h[1] - 8, h[0] - 6, h[1] - 3] : [h[0] + 4, h[1] - 6], P.fire[4]); }
    if (f.a === 'attack' && f.i === 0) { ball(h[0] + 4, h[1] - 1, 3); dots(p, [h[0] - 1, h[1] - 3, h[0] - 3, h[1] - 5, h[0], h[1] + 2], P.fire[3]); }
    if (f.a === 'attack' && f.i === 1) dots(p, [h[0] + 4, h[1] - 3, h[0] + 6, h[1] - 1, h[0] + 3, h[1] + 1], P.fire[4]);
  },
};
const glutimp: MobFn = (p, fr) => {
  const i = fr.i;
  if (fr.a === 'death' && i >= 1) {
    // verpufft zu Rauch, Asche und Hörnern
    const b = new Px(32, 32); biped(b, IMP, bipPose({ ...fr, i: 0 }, 'throw', 6)); b.tint(P.ash[3], 0.25 + i * 0.18);
    if (i < 3) deathFx(p, b, i + 1, 'burst', 27, 5, { cx: 15, cy: 18, dist: 7 });
    for (let k = 0; k < 4; k++) puff(p, 15 + Math.sin(k * 2.1) * (3 + i * 1.5), 19 - k * 2.2 - i * 2.4, 3.4 - i * 0.4, 2.8 - i * 0.3, P.stone[2 + (k & 1)], [0, 150, 120, 80, 40][i]);
    p.layer((l) => { l.ell(15, 26.4, 5 - i * 0.6, 1.2, P.ash[3]); l.rect(13, 25, 3, 1, P.ash[4]); l.px([11, 26, 10, 25], P.bone[3]); l.px([18, 26, 19, 25], P.bone[2]); });
    if (i < 4) dots(p, [10 + i, 14 - i * 2, 20 - i, 12 - i, 15, 9 - i], P.fire[3]);
    if (i === 4) p.alphaMul(0.55);
    return;
  }
  const b = bipPose(fr, 'throw', 6);
  if (fr.a === 'idle') b.dy = [0, -1, 0, 1][i];
  biped(p, IMP, b);
};

// ================================================================ Aschenhund
const ASH: Ramp = [P.ash[1], P.ash[3], P.ash[4], P.stone[2], P.stone[3]];
const ASH_FAR: Ramp = [P.ash[0], P.ash[1], P.ash[2], P.ash[2], P.ash[3]];
const HUND: QLook = {
  w: 48, h: 40, coat: ASH, far: ASH_FAR,
  hip: [15.5, 21.5], sh: [27, 21], rump: [5.2, 5], chest: [6, 6.2], neck: [6.5, -5.5], neckR: 3, tuck: 2.2,
  legF: [5.7, 6, 2, 1.3], legH: [4.8, 4.6, 2.2, 1.2], hock: [-1.8, -4], paw: 2,
  head: (l, x, y, q) => { wolfHead(l, x, y, q.jaw, Math.max(0.6, q.ear), q.eye, ASH, P.fire[4], ASH); if (q.eye !== 'shut') { l.set(R(x) + 1, R(y) - 1, WHITE); l.set(R(x), R(y), P.fire[3]); } l.px([R(x) - 2, R(y) + 1, R(x) - 1, R(y) + 2, R(x) + 4, R(y) + 1], P.fire[2]); },
  tail: (l, x, y, q) => { const a = q.tail * 1.1, tx = x - Math.cos(a) * 6, ty = y - Math.sin(a) * 6; tube(l, [[x + 1, y + 1], [tx, ty]], 1.5, 1, ASH, 1); l.ball(tx - 1, ty - 0.5, 1.9, 2.1, P.fire, 2, 4); l.set(R(tx - 1), R(ty - 3 - (q.fr.i & 1)), P.fire[3]); },
  back: (l, k, q) => {
    // glühende Risse
    const hot = q.fr.a === 'windup' || q.fr.a === 'attack', c1 = P.fire[hot ? 3 : 2], c2 = P.fire[hot ? 4 : 3];
    for (const pt of bez([k.hip[0] - 3, k.hip[1] - 1], [k.hip[0] + 2, k.hip[1] + 3], [k.hip[0] + 6, k.hip[1] - 1], 9)) l.set(R(pt[0]), R(pt[1]), c1);
    for (const pt of bez([k.sh[0] - 5, k.sh[1] + 2], [k.sh[0] - 2, k.sh[1] - 3], [k.sh[0] + 2, k.sh[1] + 1], 8)) l.set(R(pt[0]), R(pt[1]), c1);
    l.px([k.hip[0] + 2, k.hip[1] + 1, k.sh[0] - 2, k.sh[1] - 1, k.sh[0] + 1, k.sh[1] + 3, k.hip[0] + 8, k.hip[1] + 1], c2);
    // Flammenmähne
    const a: Pt = [k.sh[0] - 6, k.sh[1] - 5.6], b: Pt = [k.head[0] - 3.5, k.head[1] - 3];
    for (let s = 0; s < 5; s++) { const t = s / 4, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, h = 2.5 + ((s + q.fr.i) % 3) + (hot ? 1.5 : 0); l.poly([[x - 1.6, y + 2], [x - 2.4, y - h], [x + 1.6, y + 1.5]], P.fire[1 + ((s + q.fr.i) % 2)]); l.set(R(x - 1), R(y), P.fire[3]); }
  },
  behind: (p, k, q) => { if (q.fr.a !== 'death') glow(p, k.sh[0] - 3, k.sh[1] - 6, 6, P.fire[2], 45); },
  over: (p, k, q) => {
    if (q.fr.a === 'death' && q.fr.i > 0) return;
    const i = q.fr.i;
    for (let s = 0; s < 3; s++) puff(p, k.sh[0] - 6 - s * 3 - (q.fr.a === 'move' ? 3 : 0), k.sh[1] - 11 - s * 2.5 - ((i + s) % 3), 2.4 - s * 0.4, 1.8 - s * 0.3, P.stone[1], 120 - s * 30);
    if (q.fr.a === 'windup') dots(p, [k.sh[0] + 9, k.G - 1, k.sh[0] + 11, k.G - 2 - i, k.sh[0] + 6, k.G], P.fire[3]);
    if (q.fr.a === 'attack' && i < 2) dots(p, [k.hip[0] - 8, k.hip[1] - 2, k.hip[0] - 11, k.hip[1], k.hip[0] - 9, k.hip[1] + 4, k.hip[0] - 13, k.hip[1] - 3], P.fire[2 + i]);
  },
};
const aschenhund: MobFn = (p, fr) => {
  if (fr.a === 'death' && fr.i >= 2) {
    const b = new Px(48, 40); quad(b, HUND, quadPose({ ...fr, i: 2 }, 'charge')); b.tint(P.ash[2], [0, 0, 0.35, 0.7, 0.85][fr.i]);
    if (fr.i >= 3) { const s = shatter(b, fr.i === 3 ? 0.5 : 1, 35, 4, { cell: 3, heap: 2, cx: 22, spread: 0.5 }); if (fr.i === 4) { dissolve(s, 0.55, 2); s.alphaMul(0.5); } p.draw(s); } else p.draw(b);
    dots(p, [[], [], [14, 24, 30, 26], [12, 20, 22, 17, 31, 21], [18, 16, 27, 13]][fr.i], P.fire[3]);
    return;
  }
  quad(p, HUND, quadPose(fr, 'charge'));
};

// ================================================================ Magmaschleim
const lump: Profile = (v) => Math.sqrt(Math.max(0, 1 - Math.pow(v, 3.2))) * (0.88 + 0.12 * Math.min(1, v / 0.16)) * (1 + 0.05 * Math.sin(v * 11));
const PLATES: ReadonlyArray<readonly [number, number, number, number]> = [[-0.6, 0.84, 4, 3], [0.02, 0.97, 5, 3], [0.62, 0.8, 4, 3], [-0.86, 0.52, 3, 3], [0.9, 0.46, 3, 3], [-0.22, 0.66, 3, 2]];
function magmaDraw(p: Px, fr: { a: string; i: number }, st: ReturnType<typeof slimeState>, cool: number): void {
  const g = slimeGeo(32, 32, 9.2, 11.5, st, lump), i = fr.i;
  if (cool < 0.5) glow(p, g.cx, g.gy - 3, 12, P.fire[2], 55 - cool * 100);
  p.layer((l) => {
    slimeBody(l, g, P.fire, 1, 4, lump, 0.1);
    const hl = g.at(-0.6, 0.4); l.rect(R(hl[0]), R(hl[1]), 2, 1, P.fire[4]); l.set(R(hl[0]) - 1, R(hl[1]) + 1, WHITE);
    // Tropfnasen am Rand
    for (const u of [-0.9, 0.2, 0.8]) { const q = g.at(u, 0.05); l.set(R(q[0]), R(q[1]), P.fire[3]); }
    // Krustenplatten
    for (const [u, v, w, h] of PLATES) {
      const q = g.at(u, v), x = R(q[0] - w / 2), y = R(q[1]);
      l.rrect(x, y, w, h, P.ash[2]); l.rect(x + 1, y, w - 2, 1, P.ash[4]); l.set(x + 1, y + 1, P.ash[3]); l.rect(x + 1, y + h - 1, w - 2, 1, P.ash[1]); l.rect(x + 1, y + h, w - 2, 1, P.fire[1]);
    }
    // Gesicht: dunkle Augen mit Glutfunken, zackiges Maul
    const e = g.at(0, 0.34), ex = R(e[0] + 0.5), ey = R(e[1]) - 2, D = P.ash[0], m = st.mood;
    if (m === 'shut' || m === 'dead' || m === 'blink') { l.rect(ex, ey + 1, 3, 1, D); l.rect(ex + 5, ey + 1, 2, 1, D); }
    else { l.rect(ex, ey, 3, 3, D); l.rect(ex + 1, ey + 1, 1, 2, P.fire[4]); l.rect(ex + 5, ey, 2, 3, D); l.set(ex + 5, ey + 1, P.fire[4]); l.px([ex - 1, ey - 2, ex, ey - 1, ex + 1, ey - 1, ex + 2, ey, ex + 5, ey, ex + 6, ey - 1, ex + 7, ey - 2], P.ash[2]); }
    if (m === 'open') { l.rect(ex + 1, ey + 3, 5, 3, D); l.rect(ex + 2, ey + 4, 3, 2, P.fire[4]); l.px([ex + 1, ey + 3, ex + 3, ey + 3, ex + 5, ey + 3], P.ash[4]); }
    else if (g.H > 8) l.px([ex + 1, ey + 4, ex + 2, ey + 5, ex + 3, ey + 4, ex + 4, ey + 5, ex + 5, ey + 4], D); else l.rect(ex + 1, ey + 3, 4, 1, D);
    // Blase
    if (cool === 0) { const bq = g.at(0.36, 1); const r = [1.2, 1.8, 2.3, 0][i % 4]; if (r) { l.ball(bq[0], bq[1] - r + 1, r, r, P.fire, 2, 4); l.set(R(bq[0] - 0.5), R(bq[1] - r), WHITE); } }
    if (cool) l.tint(P.ash[2], cool);
  });
  if (cool === 0 && i % 4 === 3) { const bq = g.at(0.36, 1); dots(p, [bq[0] - 2, bq[1] - 3, bq[0] + 2, bq[1] - 4, bq[0], bq[1] - 6], P.fire[4]); }
}
const magmaschleim: MobFn = (p, fr) => {
  const i = fr.i, st = slimeState(fr);
  if (fr.a === 'death' && i >= 1) {
    st.sq = [0, 0.5, 0.56, 0.56, 0.56][i]; st.mood = 'dead';
    const b = new Px(32, 32); magmaDraw(b, fr, st, [0, 0.35, 0.65, 0.85, 0.9][i]);
    if (i >= 3) { const s = shatter(b, i === 3 ? 0.6 : 1, 27, 3, { cell: 4, heap: 1, cx: 15 }); if (i === 4) { dissolve(s, 0.6, 9); s.alphaMul(0.5); } p.draw(s); } else p.draw(b);
    dots(p, [[], [8, 14, 22, 12], [10, 12, 19, 10, 24, 15], [13, 20, 20, 22], [15, 24]][i], P.fire[3]);
    for (let k = 0; k < 2; k++) puff(p, 12 + k * 6, 16 - i * 2 - k * 3, 2.5, 2, P.stone[2], [0, 60, 90, 70, 30][i]);
    return;
  }
  magmaDraw(p, fr, st, 0);
  const cx = 16 + st.dx, gy = 27 - st.lift;
  if (fr.a === 'windup') dots(p, i ? [cx - 6, gy - 16, cx + 2, gy - 18, cx + 8, gy - 15, cx - 11, gy - 10] : [cx - 4, gy - 11, cx + 6, gy - 12], P.fire[4]);
  if (fr.a === 'attack' && i === 1) { dots(p, [cx - 12, gy - 1, cx + 12, gy - 2, cx - 13, gy - 4, cx + 13, gy - 5, cx + 10, gy - 8], P.fire[3]); }
  if (fr.a === 'move' && i === 5) dots(p, [cx - 12, gy - 1, cx + 12, gy - 1, cx - 11, gy - 4], P.fire[3]);
  if (fr.a === 'hit' && i === 0) dots(p, [cx + 10, gy - 9, cx + 8, gy - 12, cx - 12, gy - 6], P.fire[4]);
};

// ================================================================ Schlackengolem
const BAS: Ramp = [P.ash[0], P.ash[2], P.ash[3], P.ash[4], P.stone[2]];
const BAS_FAR: Ramp = [P.ash[0], P.ash[1], P.ash[2], P.ash[2], P.ash[3]];
const DIM: Ramp = [P.fire[0], P.fire[0], P.fire[0], P.fire[1], P.fire[1]];
function golemLit(a: string, i: number): number { return a === 'windup' ? [0.7, 1][i] : a === 'attack' ? [1, 0.8, 0.4][i] : a === 'hit' ? -1 : a === 'death' ? (i === 0 ? 1.2 : -1) : [0, 0.25, 0.5, 0.25, 0, 0.25][i]; }
const GOLEM: BLook = {
  w: 48, h: 48, cx: -1, hip: 12, torsoH: 19, stance: 5.5, legR: [3.6, 3.6], armL: 15, armR: [3.6, 4.4], armRF: [2.6, 2.8], shN: [-9, 4], shF: [9, 5], skin: BAS, far: BAS_FAR,
  // Glieder aus Basaltquadern: der vordere Arm ist der Riesenarm
  seg: (l, a, b, part, idx, near) => {
    const w = part === 'leg' ? 3.6 : near ? [3.7, 4.5][idx] : 2.7;
    slab(l, a, b, w, w + (part === 'arm' && near ? 0.4 : 0), near ? BAS : BAS_FAR, near ? 1 : 0);
    if (near) { const mx = R((a[0] + b[0]) / 2), my = R((a[1] + b[1]) / 2); l.set(mx, my, BAS[1]); l.set(mx, my + 1, BAS[1]); l.set(mx + 1, my - 1, BAS[1]); }
  },
  torso: (l, k, b) => {
    const cx = (k.hip[0] + k.sh[0]) / 2, cy = (k.hip[1] + k.sh[1]) / 2, lit = golemLit(b.fr.a, b.fr.i), top = k.sh[1], bot = k.hip[1] + 3;
    box(l, R(k.sh[0] + 7), R(top + 3), 7, 6, BAS_FAR, 1);
    // Rumpf aus fünf Basaltsäulen unterschiedlicher Höhe
    for (const [dx, dy, w] of [[-12, 4, 5], [-7, -1, 5], [-2, -3, 5], [3, 0, 5], [8, 5, 4]] as const) {
      const x = R(cx + dx + (k.sh[0] - cx) * 0.4), y = R(top + dy);
      box(l, x, y, w, R(bot - Math.abs(dx + 2) * 0.3) - y, BAS, 1); l.rect(x + 1, y + 1, w - 2, 1, BAS[2]);
    }
    box(l, R(k.sh[0] - 14), R(top + 1), 9, 8, BAS, 1); l.px([k.sh[0] - 12, top + 3, k.sh[0] - 11, top + 4, k.sh[0] - 9, top + 6], BAS[1]);
    // Glutkern mit Rissen
    const kx = R(cx + 1), ky = R(cy - 2), c1 = lit < 0 ? P.fire[0] : P.fire[lit > 0.6 ? 3 : 2], c2 = lit < 0 ? P.fire[1] : P.fire[lit > 0.6 ? 4 : 3];
    for (const [ex, ey, mx, my] of [[-10, 6, -5, -1], [9, 7, 5, 5], [-6, -9, -4, -3], [6, -8, 2, -5], [0, 10, 1, 5]] as const) for (const pt of bez([kx, ky], [kx + mx, ky + my], [kx + ex, ky + ey], 12)) if (l.get(R(pt[0]), R(pt[1])) >>> 24) l.set(R(pt[0]), R(pt[1]), c1);
    l.ell(kx + 0.5, ky + 0.5, 4.9, 4.9, P.ash[0]); l.ball(kx + 0.5, ky + 0.5, 3.8, 3.8, lit < 0 ? DIM : P.fire, 2, 4);
    if (lit >= 0) { l.rect(kx - 1, ky - 1, 2, 2, WHITE); l.set(kx + 1, ky, c2); l.set(kx - 2, ky + 1, c2); if (lit > 0.6) l.rect(kx - 1, ky - 1, 3, 3, WHITE); }
  },
  head: (l, x, y, b) => {
    const hx = R(x - 2), hy = R(y - 6), lit = golemLit(b.fr.a, b.fr.i);
    box(l, hx, hy, 10, 7, BAS, 1); box(l, hx + 1, hy + 6, 9, 3, BAS, 1); box(l, hx - 1, hy + 2, 12, 2, BAS, 1);
    l.rect(hx + 2, hy + 4, 8, 2, P.ash[0]); l.px([hx + 3, hy + 6, hx + 5, hy + 6, hx + 7, hy + 6], P.ash[0]);
    if (b.mood === 'shut' || lit < 0) { l.rect(hx + 3, hy + 5, 2, 1, P.fire[0]); l.rect(hx + 7, hy + 5, 2, 1, P.fire[0]); }
    else { l.rect(hx + 3, hy + 4, 2, 2, P.fire[4]); l.rect(hx + 7, hy + 4, 2, 2, P.fire[3]); l.set(hx + 3, hy + 4, WHITE); if (lit > 0.6) { l.set(hx + 7, hy + 4, WHITE); l.set(hx + 5, hy + 5, P.fire[2]); } }
    l.px([hx + 1, hy - 1, hx + 2, hy - 1, hx + 2, hy - 2], BAS[2]);
  },
  hand: (l, h, b, near) => {
    if (!near) { box(l, R(h[0] - 3), R(h[1] - 3), 7, 7, BAS_FAR, 0); return; }
    const x = R(h[0] - 6), y = R(h[1] - 5), hot = golemLit(b.fr.a, b.fr.i) > 0.6;
    box(l, x, y, 12, 11, BAS, 1); l.rect(x + 1, y + 7, 10, 1, BAS[1]);
    for (const dx of [4, 8]) l.line(x + dx, y + 1, x + dx, y + 9, BAS[1]);
    l.px([x + 2, y + 3, x + 3, y + 4, x + 6, y + 5, x + 9, y + 3, x + 6, y + 4], P.fire[hot ? 4 : 2]); l.px([x + 1, y + 1, x + 2, y + 1, x + 5, y + 1, x + 9, y + 1], BAS[4]);
  },
  foot: (l, x, y, near) => box(l, R(x - 4), R(y - 1), 10, 5, near ? BAS : BAS_FAR, near ? 1 : 0),
  behind: (p, k, b) => {
    if (b.fr.a === 'death' && b.fr.i > 0) return;
    const i = b.fr.i, x = R(k.sh[0] - 12), y = R(k.sh[1] - 4);
    p.layer((l) => { box(l, x, y, 5, 7, BAS, 1); l.rect(x + 1, y, 3, 1, P.fire[1]); });
    for (let s = 0; s < 3; s++) puff(p, x + 2 - s * 1.5 - (b.fr.a === 'move' ? s : 0), y - 3 - s * 3 - ((i + s) % 3), 2.6 - s * 0.3, 2 - s * 0.2, P.stone[1 + (s & 1)], 120 - s * 30);
  },
  over: (p, k, b) => {
    const lit = golemLit(b.fr.a, b.fr.i), cx = (k.hip[0] + k.sh[0]) / 2 + 1.5, cy = (k.hip[1] + k.sh[1]) / 2 - 1.5;
    if (lit > 0) glow(p, cx, cy, 6 + lit * 5, P.fire[3], 40 + lit * 50);
    if (b.fr.a === 'windup') dots(p, [k.handN[0] - 8, k.handN[1] - 3, k.handN[0] + 8, k.handN[1] - 4, k.handN[0] + 9, k.handN[1] + 3 - b.fr.i], P.fire[4]);
    if (b.fr.a === 'attack' && b.fr.i === 1) { debris(p, k.handN[0] + 2, k.G, 0.6, 5, 10, [P.fire[4], P.fire[3], BAS[3], WHITE], 8, 10); spark(p, k.handN[0] + 8, k.G - 2, WHITE, P.fire[4], 2); }
    if (b.fr.a === 'attack' && b.fr.i === 2) debris(p, k.handN[0] + 2, k.G, 1, 5, 8, [P.fire[2], BAS[3]], 9, 5);
    if (b.fr.a === 'move' && (b.fr.i === 1 || b.fr.i === 4)) dots(p, [k.cx - 12, k.G, k.cx + 11, k.G - 1], alpha(P.stone[3], 180));
  },
};
function golemPose(fr: Fr): ReturnType<typeof bipPose> {
  const b = bipPose(fr, 'slam', 15);
  b.lean += 1;
  if (fr.a === 'windup') { b.armN = pk([[3, -6], [2, -7]], fr.i); b.armF = [4, 9]; b.dy = 0; }
  if (fr.a === 'attack') { b.armN = pk([[10, -4], [8, 19], [7, 17]], fr.i); b.armF = [4, 8]; }
  if (fr.a === 'hit') b.armN = [0, 12];
  return b;
}
const schlackengolem: MobFn = (p, fr) => {
  if (fr.a === 'death' && fr.i >= 1) {
    const b = new Px(48, 48); biped(b, GOLEM, golemPose({ ...fr, a: 'hit', i: 1 }));
    deathFx(p, b, fr.i, 'shatter', 43, 21, { cell: 6, heap: 7, cx: 23, pop: 2, spread: 0.6 });
    if (fr.i < 4) { glow(p, 23, 39, 5 - fr.i, P.fire[2], 80 - fr.i * 15); p.set(23, 40, P.fire[4 - fr.i]); p.set(24, 41, P.fire[3 - (fr.i >> 1)]); }
    if (fr.i <= 2) debris(p, 23, 43, fr.i * 0.4, 8, 8, [BAS[3], P.fire[3], BAS[2]], 14, 8);
    return;
  }
  biped(p, GOLEM, golemPose(fr));
};

export const GLUT: Record<string, MobDef> = {
  glutimp: { w: 32, h: 32, fn: glutimp },
  aschenhund: { w: 48, h: 40, fn: aschenhund },
  magmaschleim: { w: 32, h: 32, fn: magmaschleim },
  schlackengolem: { w: 48, h: 48, fn: schlackengolem },
};
