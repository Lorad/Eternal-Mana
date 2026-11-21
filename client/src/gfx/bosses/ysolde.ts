/** Ysolde, die Frostweberin (Wasser/Eis, schwebend): hohe Eiszauberin mit Kristallkrone, wehendem Haar und Eisspindel. 96×112. */
import { Px, bez, crystal, tube } from '../draw';
import type { Pt } from '../draw';
import { P, INK, WHITE, alpha, mix, rnd2 } from '../palette';
import type { Ramp } from '../palette';
import { R, TAU, clamp, cracks, dissolve, glow, lay, lerp, shatter, spark } from './kit';
import type { BFr, BossDef } from './kit';
import { ik } from '../mobs/kit';

const GY = 104;
const SKIN: Ramp = [mix(P.skin[1], P.blue[1], 0.5), mix(P.skin[2], P.ice[0], 0.45), mix(P.skin[3], P.ice[2], 0.4), mix(P.skin[4], P.ice[3], 0.35), mix(P.skin[4], WHITE, 0.6)];
const HAIR: Ramp = [P.ice[0], P.snow[1], P.snow[2], P.snow[3], WHITE];
const T_BLUE: Ramp = [P.blue[0], mix(P.blue[0], P.blue[1], 0.6), P.blue[1], mix(P.blue[1], P.blue[2], 0.55), P.blue[2]];
const T_MID: Ramp = [mix(P.blue[1], P.ice[0], 0.5), P.ice[0], mix(P.ice[0], P.ice[1], 0.55), P.ice[1], P.ice[2]];
const T_LOW: Ramp = [P.ice[1], mix(P.ice[1], P.ice[2], 0.5), P.ice[2], P.ice[3], P.snow[4]];
const LIPS = mix(P.red[1], P.blue[1], 0.35), LASH = P.blue[0];

interface Y { dx: number; dy: number; lean: number; hd: Pt; L: Pt; Rh: Pt; sa: number; wind: number; ph: number; drift: number; halo: number; f: BFr }

function pose(f: BFr): Y {
  const s = Math.sin(f.ph), c = Math.cos(f.ph), i = f.i;
  const z: Y = { dx: 0, dy: 0, lean: 0, hd: [0, 0], L: [33, 56], Rh: [66, 48], sa: -1.5, wind: 0, ph: f.ph, drift: 0, halo: 0, f };
  switch (f.a) {
    case 'idle': z.dy = [0, -1, -2, -2, -1, 0][i]; z.L = [33 + R(c), 56 + R(s)]; z.Rh = [66, 48 - R(c * 0.6)]; z.sa = -1.5 + s * 0.03; z.drift = s * 2; break;
    case 'windup': z.dy = [-2, -3][i]; z.lean = [-1, -2][i]; z.hd = [[-1, -1], [-1, -1]][i] as Pt; z.L = [[37, 48], [40, 44]][i] as Pt; z.Rh = [[66, 40], [65, 35]][i] as Pt; z.sa = [-1.75, -1.95][i]; z.wind = [1, 2][i]; z.drift = -1; break;
    case 'attack': z.dy = [-2, -1, -1, -1][i]; z.dx = [1, 3, 3, 1][i]; z.lean = [1, 3, 3, 1][i]; z.hd = [[1, 0], [1, 1], [1, 1], [0, 0]][i] as Pt;
      z.L = [[60, 50], [70, 53], [69, 53], [52, 55]][i] as Pt; z.Rh = [[62, 40], [60, 44], [60, 44], [64, 46]][i] as Pt; z.sa = [-0.75, 0.04, 0.04, -0.7][i]; z.wind = [0, -2, -1, 0][i]; z.drift = [2, 4, 3, 1][i]; break;
    case 'special': z.dy = [-3, -4, -3, -4][i]; z.hd = [0, -1]; z.L = [[22, 42], [21, 40], [22, 42], [23, 43]][i] as Pt; z.Rh = [[73, 42], [74, 40], [73, 42], [72, 43]][i] as Pt; z.sa = -1.57; z.wind = [3, 4, 3, 4][i]; z.ph = i * 1.57; z.halo = 1; z.drift = [1, 0, -1, 0][i]; break;
    case 'hit': z.dx = [-3, -1][i]; z.lean = [-3, -1][i]; z.hd = [[-1, 1], [0, 0]][i] as Pt; z.L = [[30, 50], [32, 54]][i] as Pt; z.Rh = [[63, 44], [65, 47]][i] as Pt; z.sa = [-1.25, -1.4][i]; z.drift = -3; break;
    case 'death': z.dx = -1; z.lean = [-2, -1, -1, -1][Math.min(i, 3)]; z.hd = [[-1, 0], [0, 1], [0, 2], [0, 2]][Math.min(i, 3)] as Pt; z.L = [[30, 50], [33, 58], [34, 60], [34, 60]][Math.min(i, 3)] as Pt; z.Rh = [[64, 44], [65, 52], [65, 56], [65, 56]][Math.min(i, 3)] as Pt; z.sa = [-1.3, -1.2, -1.1, -1.1][Math.min(i, 3)]; z.ph = 1; break;
  }
  return z;
}

function snowflake(p: Px, cx: number, cy: number, r: number, a0: number, a: number): void {
  for (let k = 0; k < 6; k++) {
    const an = a0 + (k / 6) * TAU, ca = Math.cos(an), sa = Math.sin(an);
    for (let d = 5; d < r; d++) { p.blend(cx + ca * d, cy + sa * d, alpha(d % 7 < 5 ? P.ice[4] : WHITE, a)); if (d > r * 0.3) p.blend(cx + ca * d - sa, cy + sa * d + ca, alpha(P.ice[2], a * 0.5)); }
    for (const bd of [0.45, 0.7]) for (const sg of [-1, 1]) { const bx = cx + ca * r * bd, by = cy + sa * r * bd, ba = an + sg * 1.05; for (let d = 1; d < r * (bd < 0.5 ? 0.3 : 0.22); d++) p.blend(bx + Math.cos(ba) * d, by + Math.sin(ba) * d, alpha(P.ice[3], a)); }
    const tx = cx + ca * r, ty = cy + sa * r; p.blend(tx, ty, alpha(WHITE, 255)); p.blend(tx + 1, ty, alpha(P.ice[4], a)); p.blend(tx - 1, ty, alpha(P.ice[4], a)); p.blend(tx, ty + 1, alpha(P.ice[4], a)); p.blend(tx, ty - 1, alpha(P.ice[4], a));
  }
  for (let k = 0; k < 48; k++) { const an = a0 + (k / 48) * TAU; if (k % 8 !== 0) p.blend(cx + Math.cos(an) * r * 0.36, cy + Math.sin(an) * r * 0.36, alpha(P.ice[3], a * 0.8)); }
}

function hairBack(p: Px, z: Y, hx: number, hy: number): void {
  lay(p, (l) => {
    const w = z.wind, strands: Array<[Pt, Pt, Pt, number]> = [
      [[hx - 2, hy + 3], [hx - 22, hy - 1 - w * 2], [hx - 40, hy + 10 - w * 4], 4.2],
      [[hx - 3, hy + 6], [hx - 24, hy + 10 - w * 2], [hx - 42, hy + 25 - w * 5], 4.8],
      [[hx - 3, hy + 10], [hx - 22, hy + 20 - w], [hx - 38, hy + 39 - w * 5], 5],
      [[hx - 2, hy + 13], [hx - 17, hy + 30], [hx - 31, hy + 51 - w * 4], 4.6],
      [[hx, hy + 14], [hx - 11, hy + 34], [hx - 21, hy + 58 - w * 3], 4],
    ];
    strands.forEach(([a, b, c, r], k) => {
      const wv = Math.sin(z.ph + k * 0.9) * 2.4, wv2 = Math.cos(z.ph + k * 0.9) * 3;
      const pts = tube(l, bez(a, [b[0], b[1] + wv], [c[0] + wv2 * 0.5, c[1] + wv2], 18), r, 1, HAIR, 1);
      for (let q = 3; q < pts.length - 2; q++) if (q % 9 < 6) l.set(pts[q][0] + 1, pts[q][1] + 1.6, HAIR[k % 2 ? 0 : 1]);
      const e = pts[pts.length - 1]; l.set(e[0] - 1, e[1] + 1, HAIR[3]); l.set(e[0] - 2, e[1] + 2, HAIR[2]);
    });
  });
}

/** Gewand: drei Stufen (Tiefblau → Eisblau → Schnee), Faltenwurf, Saum zerfällt zu Frost. */
function gown(p: Px, z: Y, ox: number, oy: number): void {
  const dr = z.drift, ph = z.ph;
  lay(p, (l) => {
    const m = new Px(l.w, l.h), pts: Pt[] = [[ox - 6, oy], [ox + 6, oy], [ox + 10, oy + 9], [ox + 14, oy + 21], [ox + 18 + dr * 0.6, oy + 33], [ox + 21 + dr, oy + 39]];
    for (let x = 20; x >= -24; x -= 4) pts.push([ox + x + dr * (x < 0 ? 1.2 : 1), oy + 41 + Math.sin(x * 0.55 + ph) * 1.8 - ((x + 2) / 23) ** 2 * 2.5]);
    pts.push([ox - 25 + dr * 1.3, oy + 37], [ox - 21 + dr * 0.7, oy + 27], [ox - 13, oy + 13], [ox - 9, oy + 5]);
    m.poly(pts, 1);
    for (let y = 0; y < m.h; y++) {
      let xl = -1, xr = -1;
      for (let x = 0; x < m.w; x++) if (m.d[y * m.w + x]) { if (xl < 0) xl = x; xr = x; }
      if (xl < 0) continue;
      for (let x = xl; x <= xr; x++) {
        if (!m.d[y * m.w + x]) continue;
        const u = (x - xl) / Math.max(1, xr - xl), v = (y - oy) / 41, vv = v + 0.025 * Math.sin(x * 0.9 + 1);
        const fold = Math.sin(u * 10.5 + v * 1.6 + 0.4 + dr * 0.1);
        let t = 2.7 - u * 1.9 + fold * 1.05 + (u < 0.06 ? 0.8 : 0) - (u > 0.92 ? 0.8 : 0);
        const tier = vv < 0.4 ? T_BLUE : vv < 0.73 ? T_MID : T_LOW;
        const edge = Math.min(Math.abs(vv - 0.4), Math.abs(vv - 0.73));
        let c = tier[clamp(Math.floor(t), 0, 4)];
        if (edge < 0.014) c = (x + (vv > 0.6 ? 1 : 0)) % 3 === 0 ? P.ice[3] : WHITE; else if ((vv > 0.4 && vv < 0.44) || (vv > 0.73 && vv < 0.765)) c = tier[clamp(Math.floor(t) - 1, 0, 4)];
        l.set(x, y, c);
      }
    }
    // Frostmuster auf der dunklen Stufe
    for (const [dx, dy] of [[-5, 8], [4, 12], [-2, 14], [7, 6], [-8, 13]] as const) { const x = ox + dx, y = oy + dy; if (m.get(x, y)) { l.set(x, y, P.ice[2]); l.set(x - 1, y, P.blue[3]); l.set(x + 1, y, P.blue[3]); l.set(x, y - 1, P.blue[3]); l.set(x, y + 1, P.blue[3]); } }
  });
  // Saum löst sich in Frost auf
  const y0 = oy + 31;
  for (let y = y0; y < oy + 46; y++) for (let x = 0; x < p.w; x++) {
    const i = y * p.w + x; if (!p.d[i]) continue;
    const t = (y - y0) / 13 + Math.max(0, (ox - 14 - x) / 30);
    if (rnd2(x + R(dr), y, 5) < t * t * 0.95) p.d[i] = 0; else if (t > 0.55 && p.d[i] !== WHITE && rnd2(x, y, 9) < 0.5) p.d[i] = P.snow[4];
  }
  for (let k = 0; k < 16; k++) {
    const cyc = (k * 5 + z.f.i * 3) % 12, x = ox - 30 + rnd2(k, 1, 4) * 52 + dr - cyc * 0.8, y = oy + 40 + rnd2(k, 2, 4) * 8 + cyc * 0.35;
    if (y < 99) p.blend(x, y, alpha(k % 3 ? WHITE : P.ice[3], 255 - cyc * 16));
  }
}

function arm(l: Px, sh: Pt, hand: Pt, dir: number): void {
  const el = ik(sh, hand, 12, 13, dir);
  tube(l, [sh, el], 2.6, 2.1, T_BLUE, 2); tube(l, [el, hand], 2.1, 1.5, T_MID, 2);
  // Trompetenärmel
  l.poly([[el[0], el[1] + 1], [hand[0] - 1, hand[1] + 1], [hand[0] - 3, hand[1] + 11], [lerp(el[0], hand[0], 0.5), lerp(el[1], hand[1], 0.5) + 6]], T_MID[2]);
  l.line(hand[0] - 1, hand[1] + 2, hand[0] - 3, hand[1] + 11, T_LOW[3]); l.set(hand[0] - 3, hand[1] + 11, WHITE);
  l.rect(R(hand[0]) - 2, R(hand[1]) - 2, 4, 2, WHITE);
  l.rect(R(hand[0]) - 1, R(hand[1]), 3, 3, SKIN[3]); l.set(R(hand[0]) + 1, R(hand[1]) + 2, SKIN[1]); l.set(R(hand[0]) - 1, R(hand[1]), SKIN[4]);
}

function spindle(l: Px, hand: Pt, sa: number, glowT: number): Pt {
  const ca = Math.cos(sa), s = Math.sin(sa), top: Pt = [hand[0] + ca * 25, hand[1] + s * 25], bot: Pt = [hand[0] - ca * 40, hand[1] - s * 40];
  l.line(bot[0], bot[1], top[0], top[1], P.ice[2], 2); l.line(bot[0], bot[1], top[0], top[1], P.ice[4]);
  for (let d = -36; d < 22; d += 6) { const x = hand[0] + ca * d, y = hand[1] + s * d; l.set(x - s, y + ca, P.ice[1]); l.set(x + 1 - s, y + ca, P.blue[2]); }
  l.poly([[bot[0] - s * 2, bot[1] + ca * 2], [bot[0] - ca * 5, bot[1] - s * 5], [bot[0] + s * 2, bot[1] - ca * 2]], P.ice[3]);
  // Spindelkopf: Doppelkegel-Kristall mit Wirtel
  const tip: Pt = [top[0] + ca * 9, top[1] + s * 9], base: Pt = [top[0] - ca * 5, top[1] - s * 5];
  crystal(l, top[0], top[1], tip[0], tip[1], 3.4, glowT > 0.5 ? [P.ice[2], P.ice[3], P.ice[4], WHITE, WHITE] : P.ice);
  crystal(l, top[0], top[1], base[0], base[1], 3, P.teal);
  l.line(top[0] - s * 5, top[1] + ca * 5, top[0] + s * 5, top[1] - ca * 5, P.snow[4]); l.set(top[0] - s * 5, top[1] + ca * 5, P.ice[2]); l.set(top[0] + s * 5, top[1] - ca * 5, P.ice[2]);
  return tip;
}

function head(l: Px, hx: number, hy: number, dead = 0): void {
  // hx,hy = linke obere Ecke der 13×15-Kopfbox
  l.rect(hx + 2, hy + 1, 10, 3, HAIR[2]); l.rect(hx + 1, hy + 2, 12, 9, HAIR[2]);
  l.rect(hx + 3, hy + 4, 9, 8, SKIN[3]); l.rect(hx + 4, hy + 12, 7, 1, SKIN[3]); l.rect(hx + 5, hy + 13, 5, 1, SKIN[2]); l.rect(hx + 6, hy + 14, 3, 1, SKIN[1]);
  l.rect(hx + 3, hy + 4, 9, 1, SKIN[1]); l.rect(hx + 11, hy + 5, 1, 7, SKIN[2]); l.set(hx + 10, hy + 12, SKIN[1]); l.rect(hx + 4, hy + 5, 3, 2, SKIN[4]);
  // Scheitel und Strähnen
  l.rect(hx + 3, hy + 1, 8, 1, HAIR[4]); l.rect(hx + 2, hy + 2, 5, 1, HAIR[4]); l.rect(hx + 7, hy + 2, 5, 2, HAIR[3]); l.px([hx + 8, hy + 4, hx + 9, hy + 4, hx + 10, hy + 4, hx + 11, hy + 4, hx + 12, hy + 5, hx + 12, hy + 6], HAIR[3]);
  l.rect(hx + 1, hy + 3, 2, 10, HAIR[3]); l.rect(hx + 2, hy + 5, 2, 9, HAIR[2]); l.rect(hx + 1, hy + 4, 1, 8, HAIR[4]); l.px([hx + 3, hy + 12, hx + 3, hy + 13, hx + 2, hy + 14, hx + 3, hy + 14, hx + 4, hy + 5], HAIR[1]);
  l.px([hx + 12, hy + 7, hx + 12, hy + 8, hx + 12, hy + 9], HAIR[1]);
  // Brauen (traurig: innen hoch, außen tief), Augen, Nase, Mund
  l.px([hx + 4, hy + 7, hx + 5, hy + 6, hx + 6, hy + 6, hx + 9, hy + 6, hx + 10, hy + 6, hx + 11, hy + 7], P.ice[0]);
  if (dead) { l.rect(hx + 4, hy + 9, 3, 1, LASH); l.rect(hx + 9, hy + 9, 2, 1, LASH); }
  else {
    l.rect(hx + 4, hy + 8, 3, 1, LASH); l.px([hx + 4, hy + 9], P.snow[4]); l.px([hx + 5, hy + 9], P.ice[2]); l.px([hx + 6, hy + 9], LASH); l.set(hx + 3, hy + 8, mix(LASH, SKIN[2], 0.5));
    l.rect(hx + 9, hy + 8, 2, 1, LASH); l.px([hx + 9, hy + 9], P.ice[2]); l.px([hx + 10, hy + 9], LASH);
  }
  l.px([hx + 5, hy + 10, hx + 9, hy + 10], SKIN[2]);
  l.px([hx + 8, hy + 10, hx + 8, hy + 11], SKIN[1]); l.set(hx + 7, hy + 11, SKIN[2]);
  l.px([hx + 7, hy + 12, hx + 8, hy + 12], LIPS); l.set(hx + 6, hy + 13, SKIN[1]);
  // gefrorene Träne
  l.px([hx + 4, hy + 10, hx + 4, hy + 11], P.ice[3]);
}

function figure(p: Px, z: Y): Pt {
  const bx = 48 + z.dx, by = z.dy, sx = bx + z.lean, hx = sx - 5 + z.hd[0], hy = 15 + by + z.hd[1];
  const shL: Pt = [sx - 8, 37 + by], shR: Pt = [sx + 8, 37 + by];
  const L: Pt = [z.L[0] + z.dx, z.L[1] + by], Rh: Pt = [z.Rh[0] + z.dx, z.Rh[1] + by];
  hairBack(p, z, hx + 4, hy);
  // Stehkragen aus Eis
  lay(p, (l) => {
    for (const sg of [-1, 1]) { crystal(l, sx + sg * 7, 36 + by, sx + sg * 14, 22 + by, 2.6, P.ice); crystal(l, sx + sg * 10, 37 + by, sx + sg * 18, 29 + by, 2, P.teal); }
  });
  gown(p, z, bx, 50 + by);
  // hinterer Arm (ihr linker, im Bild rechts) hält die Spindel
  let tip: Pt = [0, 0];
  lay(p, (l) => arm(l, shR, Rh, -1));
  lay(p, (l) => { tip = spindle(l, [Rh[0] + 1, Rh[1]], z.sa, z.f.a === 'windup' || z.f.a === 'attack' ? 1 : 0); });
  lay(p, (l) => { l.rect(R(Rh[0]) - 1, R(Rh[1]) - 1, 3, 3, SKIN[3]); l.set(R(Rh[0]) - 1, R(Rh[1]) - 1, SKIN[4]); l.set(R(Rh[0]) + 1, R(Rh[1]) + 1, SKIN[1]); });
  // Mieder
  lay(p, (l) => {
    l.poly([[sx - 9, 35 + by], [sx + 9, 35 + by], [bx + 6, 51 + by], [bx - 6, 51 + by]], T_BLUE[2]);
    l.poly([[sx - 9, 35 + by], [sx - 3, 35 + by], [bx - 3, 51 + by], [bx - 6, 51 + by]], T_BLUE[3]);
    l.poly([[sx + 4, 36 + by], [sx + 9, 35 + by], [bx + 6, 51 + by], [bx + 3, 51 + by]], T_BLUE[1]);
    l.rect(sx - 2, 30 + by, 4, 6, SKIN[2]); l.rect(sx - 2, 30 + by, 2, 5, SKIN[3]);
    l.poly([[sx - 5, 35 + by], [sx + 5, 35 + by], [sx, 43 + by]], SKIN[3]); l.line(sx + 1, 36 + by, sx + 4, 36 + by, SKIN[2]);
    l.line(sx - 6, 35 + by, sx, 44 + by, WHITE); l.line(sx + 6, 35 + by, sx, 44 + by, P.ice[3]);
    l.rect(sx - 1, 44 + by, 2, 3, P.teal[4]); l.set(sx - 1, 44 + by, WHITE); l.set(sx, 47 + by, P.teal[2]);
    l.rect(bx - 6, 50 + by, 12, 2, P.ice[3]); l.rect(bx - 6, 50 + by, 6, 1, WHITE); l.rect(bx - 1, 51 + by, 2, 3, P.ice[2]); l.set(bx, 54 + by, P.teal[4]);
    // Schulterpelz
    l.ell(sx - 9, 36 + by, 4, 2.6, P.snow[3]); l.ell(sx - 10, 35.4 + by, 2.4, 1.4, WHITE); l.ell(sx + 9, 36 + by, 4, 2.6, P.snow[2]); l.ell(sx + 8, 35.4 + by, 2.4, 1.4, P.snow[4]);
  });
  // Kopf und Krone
  lay(p, (l) => {
    const cy = hy + 2;
    crystal(l, hx + 1.5, cy + 1, hx - 2, cy - 7, 1.6, P.teal); crystal(l, hx + 11.5, cy + 1, hx + 15, cy - 7, 1.6, P.teal);
    crystal(l, hx + 4, cy, hx + 2.5, cy - 10, 1.8, P.ice); crystal(l, hx + 9.5, cy, hx + 11, cy - 10, 1.8, P.ice); crystal(l, hx + 6.5, cy, hx + 6.5, cy - 14, 2.2, P.ice);
    l.rect(hx + 1, cy, 11, 2, P.ice[3]); l.rect(hx + 1, cy, 6, 1, WHITE); l.set(hx + 6, cy + 1, P.teal[4]);
  });
  lay(p, (l) => head(l, hx, hy, z.f.a === 'death' ? 1 : 0));
  // vorderer Arm
  lay(p, (l) => arm(l, shL, L, 1));
  return tip;
}

const fn = (p: Px, f: BFr): void => {
  const z = pose(f), i = f.i;
  if (f.a === 'death' && i >= 4) {
    // zerspringt zu Schnee: Brocken fallen, zurück bleibt ein Schneehäufchen mit Krone und Spindel
    const snap = new Px(p.w, p.h), z3 = pose({ ...f, i: 3 });
    figure(snap, z3); snap.tint(P.snow[3], 0.62);
    const t = [0.3, 0.62, 0.9, 1][i - 4];
    if (i < 7) { const s = shatter(snap, t, GY, 12, { cell: 4, spread: 1.3, heap: 7, pop: 5 }); if (i >= 5) dissolve(s, i === 5 ? 0.25 : 0.6, 3); p.draw(s); }
    if (i >= 5) lay(p, (l) => {
      const k = i === 5 ? 0.6 : 1;
      l.ball(46, GY - 3 * k, 19 * k, 5 * k, P.snow, 1, 4); l.ball(56, GY - 2 * k, 13 * k, 3.5 * k, P.snow, 1, 4); l.ball(34, GY - 1.5 * k, 10 * k, 3 * k, P.snow, 2, 4);
      if (i >= 6) {
        l.line(26, GY - 1, 70, GY - 5, P.ice[2], 2); l.line(26, GY - 2, 70, GY - 6, P.ice[4]); crystal(l, 70, GY - 5, 79, GY - 7, 3, P.ice); crystal(l, 70, GY - 5, 65, GY - 4, 2.6, P.teal);
        crystal(l, 40, GY - 5, 38, GY - 13, 1.8, P.ice); crystal(l, 44, GY - 6, 45, GY - 15, 2, P.ice); crystal(l, 48, GY - 5, 51, GY - 12, 1.6, P.teal); l.rect(38, GY - 6, 12, 2, P.ice[3]); l.rect(38, GY - 6, 6, 1, WHITE);
        l.px([30, GY - 3, 54, GY - 5, 60, GY - 2], WHITE);
      }
    });
    for (let k = 0; k < 14; k++) { const x = 14 + rnd2(k, 1, 6) * 66, y = 30 + rnd2(k, 2, 6) * 50 + (i - 4) * 9; if (y < GY - 4 && i < 7) p.blend(x + Math.sin(k + i) * 2, y, alpha(WHITE, 230 - (i - 4) * 40)); }
    if (i === 7) { spark(p, 45, GY - 16, WHITE, alpha(P.ice[4], 180), 1); p.blend(60, GY - 12, alpha(WHITE, 160)); p.blend(30, GY - 9, alpha(WHITE, 120)); }
    return;
  }
  if (z.halo) { glow(p, 48, 40 + z.dy, 34, P.ice[2], 34); snowflake(p, 48 + z.dx, 40 + z.dy, 36, f.i * (TAU / 24), 215); }
  const tip = figure(p, z);
  if (f.a === 'windup') {
    glow(p, tip[0], tip[1], 7 + i * 4, P.ice[3], 80); spark(p, tip[0], tip[1], WHITE, P.ice[4], 2 + i);
    for (let k = 0; k < 9; k++) { const a = k * 0.7 + i * 0.5, d = 22 - i * 9 + (k % 3) * 3; p.blend(tip[0] + Math.cos(a) * d, tip[1] + Math.sin(a) * d * 0.8, alpha(k % 2 ? WHITE : P.ice[3], 230)); }
    const hx = z.L[0] + z.dx, hy = z.L[1] + z.dy; glow(p, hx, hy, 5, P.ice[3], 60); p.set(hx - 2, hy - 3, WHITE); p.set(hx + 2, hy - 4, P.ice[4]);
  }
  if (f.a === 'attack') {
    const hx = z.L[0] + z.dx + 3, hy = z.L[1] + z.dy;
    if (i === 0) { glow(p, tip[0], tip[1], 9, WHITE, 90); spark(p, tip[0], tip[1], WHITE, P.ice[4], 3); }
    if (i >= 1) {
      const d = [0, 6, 14, 20][i];
      lay(p, (l) => {
        for (const [a, o] of [[-0.55, 0], [-0.2, 3], [0.12, 1], [0.45, 4], [0.8, 2]] as const) {
          const dd = d + o, x = hx + Math.cos(a) * dd, y = hy - 4 + Math.sin(a) * dd * 1.4, len = i === 3 ? 4 : 7;
          if (x + len > 93) continue;
          l.poly([[x - Math.sin(a) * 1.6, y + Math.cos(a) * 1.6], [x + Math.cos(a) * len, y + Math.sin(a) * len], [x + Math.sin(a) * 1.6, y - Math.cos(a) * 1.6], [x - Math.cos(a) * 2, y - Math.sin(a) * 2]], P.ice[3]);
          l.line(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, WHITE);
        }
      });
      glow(p, hx, hy - 2, 7 - i, P.ice[4], 100 - i * 20);
      for (let k = 0; k < 8; k++) p.blend(hx - 4 + rnd2(k, i, 2) * (d + 8), hy - 12 + rnd2(k, i, 3) * 22, alpha(WHITE, 220 - k * 15));
      for (let k = 0; k < 6; k++) p.blend(tip[0] - 10 + k * 2, tip[1] - 3 + (k % 2) * 6, alpha(P.ice[4], 60 + k * 30));
    }
  }
  if (f.a === 'special') {
    for (let k = 0; k < 14; k++) { const a = k * 0.449 + i * 0.26, d = 26 + (k % 4) * 5; const x = 48 + Math.cos(a) * d * 1.05, y = 46 + z.dy + Math.sin(a) * d; if (x > 2 && x < 93 && y > 2 && y < 100) { if (k % 3 === 0) spark(p, x, y, WHITE, alpha(P.ice[3], 200), 1); else p.blend(x, y, alpha(WHITE, 230)); } }
    for (const h of [z.L, z.Rh]) glow(p, h[0], h[1] + z.dy, 5, P.ice[4], 70);
  }
  if (f.a === 'death') {
    // Risse wie in Porzellan, Farbe erstarrt zu Weiß
    p.tint(P.snow[3], [0.15, 0.3, 0.45, 0.6][i]);
    cracks(p, [[49, 24], [47, 44], [42, 66], [56, 60], [50, 80], [34, 54], [62, 46]], [0.25, 0.5, 0.8, 1][i], 21, P.blue[1], i >= 2 ? WHITE : undefined, 22);
    if (i === 0) glow(p, 48, 40, 26, WHITE, 40);
    if (i === 3) for (let k = 0; k < 8; k++) p.set(20 + k * 8, 30 + ((k * 13) % 50), WHITE);
  }
  void INK;
};

export const ysolde: BossDef = { w: 96, h: 112, fn };
