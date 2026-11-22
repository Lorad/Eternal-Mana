/** Der Hohle König (Dunkel, Endboss): hagere gekrönte Gestalt im zerfließenden Mantel, in der Brust das geraubte Quelllicht. 128×128. */
import { Px, bez, tube } from '../draw';
import type { Pt } from '../draw';
import { P, INK, WHITE, alpha, mix, rnd2 } from '../palette';
import type { Ramp } from '../palette';
import { pk, R, TAU, clamp, ease, form, glow, lay, lerp, rays, shredUp, spark } from './kit';
import type { BFr, BossDef } from './kit';
import { ik } from '../mobs/kit';

const GY = 121, CX = 62;
const MANT: Ramp = [P.shadow[0], P.shadow[1], P.shadow[2], P.shadow[3], mix(P.shadow[4], P.violet[2], 0.35)];
const ROBE: Ramp = [mix(INK, P.shadow[0], 0.5), P.shadow[0], P.shadow[1], P.shadow[2], P.shadow[3]];
const TGOLD: Ramp = [mix(P.gold[0], P.ash[1], 0.45), mix(P.gold[1], P.ash[3], 0.4), mix(P.gold[2], P.ash[4], 0.35), mix(P.gold[3], P.ash[4], 0.2), P.gold[4]];
const FACE: Ramp = [mix(P.bone[0], P.shadow[3], 0.4), P.bone[1], P.bone[2], P.bone[3], P.bone[4]];
const HAIRK: Ramp = [P.bone[0], mix(P.bone[0], P.bone[1], 0.5), P.bone[1], mix(P.bone[1], P.bone[2], 0.6), P.bone[3]];
const GLASS: Ramp = [P.shadow[0], P.shadow[2], P.violet[1], P.violet[3], P.violet[4]];
const MOTES = [P.fire[3], P.blue[3], P.green[4], P.teal[4], P.gold[4], P.violet[3]];

interface H { dy: number; lean: number; hd: Pt; L: Pt; Rh: Pt; ba: number; light: number; ph: number; crown: number; held: boolean; spread: number; f: BFr }

function pose(f: BFr): H {
  const s = Math.sin(f.ph), c = Math.cos(f.ph), i = f.i;
  const z: H = { dy: 0, lean: 0, hd: [0, 0], L: [39, 78], Rh: [98, 67], ba: 1.52, light: 0.6, ph: f.ph, crown: 1, held: true, spread: 0, f };
  switch (f.a) {
    case 'idle': z.dy = [0, 0, -1, -1, -1, 0][i]; z.hd = [0, i >= 2 && i <= 4 ? 1 : 0]; z.light = 0.55 + [0, 0.25, 0.1, 0.35, 0.05, 0.2][i]; z.L = [39 + R(s), 78 + z.dy]; z.Rh = [98, 67 + z.dy]; break;
    case 'windup': z.lean = [-3, -5][i]; z.dy = [1, 2][i]; z.hd = pk([[-1, 0], [-2, 1]], i); z.Rh = pk([[52, 66], [48, 60]], i); z.L = pk([[46, 62], [42, 56]], i); z.ba = [-2.1, -2.32][i]; z.light = [0.8, 1][i]; z.spread = 1; break;
    case 'attack': z.lean = [2, 6, 6, 3][i]; z.dy = [0, 2, 3, 1][i]; z.hd = pk([[1, 0], [2, 1], [2, 2], [1, 1]], i);
      z.Rh = pk([[74, 50], [68, 62], [72, 70], [86, 66]], i); z.L = pk([[68, 52], [66, 66], [66, 74], [44, 84]], i); z.ba = [-0.95, 0.08, 0.92, 1.25][i]; z.light = [1, 0.9, 0.7, 0.6][i]; z.spread = [1, 3, 2, 1][i]; break;
    case 'special': z.dy = [-1, -2, -1, -2][i]; z.hd = [0, -1]; z.L = pk([[34, 30], [33, 28], [34, 30], [35, 31]], i); z.light = [1.2, 1.5, 1.2, 1.5][i]; z.Rh = [98, 65]; z.spread = 2; break;
    case 'hit': z.lean = [-4, -2][i]; z.hd = pk([[-2, -1], [-1, 0]], i); z.L = pk([[30, 80], [34, 85]], i); z.Rh = pk([[95, 64], [97, 65]], i); z.ba = [1.4, 1.48][i]; z.light = 0.3; break;
    case 'death': {
      const k = Math.min(i, 3);
      z.dy = [1, 13, 30, 32][k]; z.lean = [-3, 0, 2, 3][k]; z.hd = pk([[-2, -1], [0, 2], [2, 5], [3, 7]], k); z.spread = [0, 3, 7, 8][k];
      z.L = pk([[32, 84], [34, 104], [36, 116], [36, 117]], k); z.Rh = pk([[96, 68], [84, 84], [88, 115], [88, 116]], k); z.ba = [1.42, 0.68, 0, 0][k]; z.held = k < 2;
      z.light = [0.3, 0.5, 0.8, 1.2][k]; z.crown = k < 3 ? 1 : 0; z.ph = k * 0.8; break;
    }
  }
  return z;
}

function crown(l: Px, x: number, y: number, skew = 0): void {
  // x,y = linke untere Ecke des Reifs (12 breit)
  const sp: Array<[number, number]> = [[0, 6], [3, 8], [5, 12], [8, 8], [11, 4]];
  for (const [dx, h] of sp) for (let j = 0; j < h; j++) { const w = j > h - 3 || dx === 11 ? 1 : 2, ox = x + dx + Math.round(-j * skew); l.rect(ox, y - 3 - j, w, 1, TGOLD[j > h - 2 ? 4 : dx < 5 ? 3 : 2]); if (w === 2) l.set(ox + 1, y - 3 - j, TGOLD[1]); }
  l.rect(x, y - 3, 13, 3, TGOLD[2]); l.rect(x, y - 3, 7, 1, TGOLD[3]); l.rect(x, y - 1, 13, 1, TGOLD[0]); l.rect(x + 8, y - 3, 5, 2, TGOLD[1]);
  l.set(x + 6, y - 2, P.teal[2]); l.set(x + 2, y - 2, INK); l.set(x + 10, y - 2, P.red[1]); l.set(x + 1, y - 3, TGOLD[4]);
}

function blade(l: Px, hand: Pt, ang: number, len = 54, gw = 8): Pt {
  const c = Math.cos(ang), s = Math.sin(ang), at = (d: number, o: number): Pt => [hand[0] + c * d - s * o, hand[1] + s * d + c * o];
  const pm = at(-10, 0), g = at(4, 0), tip = at(len, 0);
  l.line(pm[0], pm[1], g[0], g[1], P.ash[2], 2); for (let d = -8; d < 3; d += 3) { const q = at(d, 0); l.set(q[0], q[1], P.ash[4]); }
  l.ell(pm[0], pm[1], 2.2, 2.2, TGOLD[2]); l.set(pm[0] - 1, pm[1] - 1, TGOLD[4]);
  // Klinge aus dunklem Glas
  l.poly([at(5, -3.2), at(len * 0.55, -3), at(len * 0.86, -2), tip, at(len * 0.86, 2), at(len * 0.55, 3), at(5, 3.2)], GLASS[1]);
  l.poly([at(5, -3.2), at(len * 0.55, -3), at(len * 0.86, -2), tip, at(len * 0.5, -0.5), at(5, -0.5)], GLASS[2]);
  const e0 = at(6, -3), e1 = at(len * 0.55, -2.8), e2 = at(len * 0.86, -1.8); l.line(e0[0], e0[1], e1[0], e1[1], GLASS[3]); l.line(e1[0], e1[1], e2[0], e2[1], GLASS[3]); l.line(e2[0], e2[1], tip[0], tip[1], GLASS[4]);
  const f0 = at(6, 2.6), f1 = at(len * 0.8, 1.8); l.line(f0[0], f0[1], f1[0], f1[1], GLASS[0]);
  for (const [d, n, col] of [[14, 5, P.teal[3]], [30, 7, GLASS[4]], [42, 4, P.teal[2]]] as const) for (let k = 0; k < n; k++) { const q = at(d + k, -1.5 + k * 0.5); l.set(q[0], q[1], col); }
  l.set(tip[0], tip[1], WHITE);
  // Parierstange
  const g0 = at(4, -gw), g1 = at(4, gw), g2 = at(7, -gw - 1), g3 = at(7, gw + 1);
  l.line(g0[0], g0[1], g1[0], g1[1], TGOLD[2], 2); l.line(g0[0], g0[1], g[0], g[1], TGOLD[3]); l.set(g2[0], g2[1], TGOLD[3]); l.set(g3[0], g3[1], TGOLD[1]); l.set(g[0], g[1], P.teal[2]);
  return tip;
}

function tendrils(l: Px, z: H, x0: number, x1: number, flat = 0): void {
  for (let k = 0; k < 8; k++) {
    const x = lerp(x0, x1, k / 7), dir = k < 4 ? -1 : 1, sw = Math.sin(z.ph + k * 1.3) * 2.5, up = k === 0 || k === 7;
    if (up && !flat) tube(l, bez([x, GY - 10], [x + dir * 9, GY - 1], [x + dir * (14 + sw), GY - 12 + sw], 14), 3, 0.7, MANT, 0);
    else tube(l, bez([x, GY - 12 + flat * 8], [x + dir * 2, GY - 3], [x + dir * (6 + sw), GY - 1 - (k % 2) * 2], 12), 3.4, 0.9, MANT, 0);
  }
}

function hole(p: Px, x: number, y: number, light: number): void {
  lay(p, (l) => {
    l.ell(x, y, 7.5, 9.5, mix(INK, P.shadow[0], 0.6)); l.ell(x, y, 6, 8, P.teal[0]); l.ell(x, y + 0.5, 5, 7, P.teal[1]);
    l.ell(x, y + 1, 3.6, 5.4, P.teal[2]); l.ell(x, y + 1.5, 2.4 + light * 0.8, 3.4 + light, P.teal[3]); l.ell(x, y + 2, 1.2 + light * 0.7, 1.8 + light, P.teal[4]);
    if (light > 0.7) l.rect(R(x) - 1, R(y) + 1, 2, 2 + (light > 1.1 ? 1 : 0), WHITE);
    // ausgefranster Rand
    for (const [a, n] of [[0.3, 3], [1.3, 2], [2.4, 3], [3.5, 2], [4.4, 3], [5.5, 2]] as const) { const bx = x + Math.cos(a) * 7, by = y + Math.sin(a) * 9; l.line(bx, by, x + Math.cos(a) * (7 - n), y + Math.sin(a) * (9 - n), ROBE[1]); }
  }, false);
  glow(p, x, y + 1, 11 + light * 7, P.teal[3], 30 + light * 28); glow(p, x, y + 1, 5 + light * 2, P.teal[4], 50 + light * 20);
  // aufsteigende Lichtfäden
  const fi = p.w > 0 ? Math.round(light * 20) : 0;
  for (let k = 0; k < 3; k++) { const cyc = (fi + k * 5) % 9; p.blend(x - 3 + k * 3, y - 6 - cyc, alpha(P.teal[4], 220 - cyc * 22)); }
}

function head(l: Px, hx: number, hy: number, crowned: number, bowed: boolean): void {
  // hx,hy = linke obere Ecke der 13×17-Kopfbox: strähniges Haar, hageres Gesicht, Spitzbart
  l.rect(hx, hy + 2, 13, 14, HAIRK[1]); l.rect(hx + 1, hy + 1, 11, 2, HAIRK[2]);
  for (const [dx, len] of [[-1, 20], [0, 23], [1, 18], [11, 19], [12, 22], [13, 16]] as const) { l.rect(hx + dx, hy + 4, 1, len, HAIRK[dx % 2 === 0 ? 2 : 3]); l.set(hx + dx, hy + 4 + len, HAIRK[0]); }
  l.rect(hx - 1, hy + 4, 1, 12, HAIRK[4]);
  l.rect(hx + 2, hy + 3, 9, 10, FACE[3]); l.rect(hx + 3, hy + 13, 7, 1, FACE[3]); l.rect(hx + 4, hy + 14, 5, 1, FACE[2]); l.rect(hx + 5, hy + 15, 3, 1, FACE[1]);
  l.rect(hx + 2, hy + 3, 9, 1, FACE[1]); l.rect(hx + 10, hy + 4, 1, 9, FACE[1]); l.rect(hx + 2, hy + 4, 2, 3, FACE[4]); l.set(hx + 9, hy + 13, FACE[1]);
  // Brauen (innen hoch, außen tief), halb geschlossene Augen mit Quelllicht, Augenringe
  l.px([hx + 3, hy + 7, hx + 4, hy + 6, hx + 5, hy + 6, hx + 8, hy + 6, hx + 9, hy + 6, hx + 10, hy + 7], FACE[0]);
  l.rect(hx + 3, hy + 8, 3, 1, P.shadow[1]); l.rect(hx + 8, hy + 8, 2, 1, P.shadow[1]);
  if (!bowed) { l.set(hx + 4, hy + 9, P.shadow[2]); l.set(hx + 5, hy + 9, P.teal[3]); l.set(hx + 8, hy + 9, P.shadow[2]); l.set(hx + 9, hy + 9, P.teal[3]); }
  l.px([hx + 3, hy + 10, hx + 4, hy + 10, hx + 8, hy + 10, hx + 9, hy + 10], FACE[2]);
  // Nase, hohle Wangen, herabgezogener Mund
  l.px([hx + 7, hy + 9, hx + 7, hy + 10, hx + 7, hy + 11], FACE[1]); l.set(hx + 6, hy + 11, FACE[2]);
  l.px([hx + 2, hy + 11, hx + 3, hy + 12, hx + 2, hy + 12, hx + 10, hy + 11], FACE[1]);
  l.rect(hx + 5, hy + 13, 3, 1, P.shadow[2]); l.set(hx + 4, hy + 14, FACE[0]); l.set(hx + 8, hy + 14, FACE[0]);
  l.rect(hx + 5, hy + 16, 3, 2, HAIRK[3]); l.set(hx + 6, hy + 18, HAIRK[2]); l.set(hx + 5, hy + 16, HAIRK[4]);
  if (crowned) crown(l, hx, hy + 4, 0.08);
}

function arm(l: Px, sh: Pt, hand: Pt, dir: number): void {
  const el = ik(sh, hand, 16, 17, hand[1] < sh[1] - 4 ? -dir : dir);
  tube(l, [sh, el], 3.2, 2.6, MANT, 1); tube(l, [el, hand], 2.6, 1.8, MANT, 1);
  l.poly([[el[0] - 1, el[1] + 1], [hand[0] - 2, hand[1]], [hand[0] - 4, hand[1] + 8], [lerp(el[0], hand[0], 0.5) - 2, lerp(el[1], hand[1], 0.5) + 6]], MANT[1]);
  const hx = R(hand[0]), hy = R(hand[1]);
  l.rect(hx - 2, hy - 2, 4, 1, TGOLD[2]);
  l.rect(hx - 1, hy - 1, 3, 4, FACE[2]); l.set(hx - 1, hy - 1, FACE[4]); l.px([hx - 1, hy + 3, hx + 1, hy + 3, hx + 2, hy + 1], FACE[1]);
}

function figure(p: Px, z: H): { chest: Pt; tip: Pt } {
  const S: Pt = [CX + z.lean, 44 + z.dy], hx = S[0] - 6 + z.hd[0], hy = S[1] - 25 + z.hd[1], sp = z.spread;
  const chest: Pt = [S[0] + 1, S[1] + 14];
  // Mantel mit Schattenranken am Saum
  lay(p, (l) => {
    form(l, (m) => {
      const pts: Pt[] = [[S[0] - 19, S[1] - 1], [S[0] - 11, S[1] - 5], [S[0] + 11, S[1] - 5], [S[0] + 19, S[1] - 1], [S[0] + 23, S[1] + 14], [89 + sp, 96], [92 + sp, GY - 8]];
      for (let x = 92 + sp; x >= 30 - sp; x -= 6) pts.push([x, GY - 7 + Math.sin(x * 0.4 + z.ph) * 1.5]);
      pts.push([30 - sp, GY - 8], [33 - sp, 96], [S[0] - 23, S[1] + 14]);
      m.poly(pts, 1);
    }, MANT, 0, 4, 0.02, 0.5);
    // Faltenwurf
    for (const [fx, w] of [[-0.82, 1], [-0.55, 0], [0.5, 0], [0.8, 1]] as const) {
      const top: Pt = [S[0] + fx * 18, S[1] + 6], bot: Pt = [CX + fx * (34 + sp) + Math.sin(z.ph + fx * 3) * 2, GY - 9];
      const pts = bez(top, [lerp(top[0], bot[0], 0.3) + fx * 4, lerp(top[1], bot[1], 0.5)], bot, 24);
      pts.forEach((q, k) => { l.set(q[0], q[1], MANT[0]); if (k > 3) l.set(q[0] - 1, q[1], fx < 0 ? MANT[4] : MANT[2]); if (w && k > 8) l.set(q[0] + 1, q[1], MANT[0]); });
    }
    // Flicken und Risse
    for (const [x, y] of [[40, 92], [84, 84], [38, 70], [86, 104]] as const) { l.line(x + z.lean * 0.3, y, x + z.lean * 0.3 + 2, y + 4, MANT[0]); l.set(x + z.lean * 0.3 - 1, y + 1, MANT[3]); }
    tendrils(l, z, 31 - sp, 91 + sp);
  });
  // Innengewand in der Mantelöffnung, Goldborte, karminrotes Futter
  lay(p, (l) => {
    const xl = (y: number): number => lerp(S[0] - 6, CX - 11, clamp((y - S[1]) / (GY - 12 - S[1]))), xr = (y: number): number => lerp(S[0] + 8, CX + 13, clamp((y - S[1]) / (GY - 12 - S[1])));
    for (let y = S[1] - 2; y < GY - 9; y++) {
      const a = R(xl(y)), b = R(xr(y));
      for (let x = a; x <= b; x++) { const u = (x - a) / Math.max(1, b - a); l.set(x, y, ROBE[u < 0.2 ? 3 : u < 0.5 ? 2 : u < 0.8 ? 1 : 0]); }
      if ((y - S[1]) % 9 < 7) { l.set(a + 4, y, ROBE[1]); l.set(b - 5, y, ROBE[3]); }
      l.set(a - 1, y, P.red[0]); l.set(a - 2, y, y % 5 === 0 ? TGOLD[3] : TGOLD[2]); l.set(b + 1, y, P.red[0]); l.set(b + 2, y, y % 5 === 2 ? TGOLD[2] : TGOLD[1]);
    }
    // Gürtel mit Schnalle
    const by = S[1] + 29; if (by < GY - 14) { l.rect(R(xl(by)), by, R(xr(by) - xl(by)) + 1, 2, TGOLD[1]); l.rect(S[0], by - 1, 4, 4, TGOLD[3]); l.set(S[0] + 1, by, P.shadow[0]); l.rect(S[0] + 1, by + 3, 2, 7, TGOLD[1]); }
  }, false);
  hole(p, chest[0], chest[1], z.light);
  // Pelzkragen, Schulterstücke, Kette
  lay(p, (l) => {
    for (const sg of [-1, 1]) {
      l.ball(S[0] + sg * 13, S[1] + 1, 8.5, 5.5, sg < 0 ? [P.bone[1], P.bone[2], P.bone[3], P.bone[4]] : [P.bone[0], P.bone[1], P.bone[2], P.bone[3]], 0, 3);
      l.poly([[S[0] + sg * 18, S[1] - 2], [S[0] + sg * 25, S[1] - 7], [S[0] + sg * 21, S[1] + 3]], TGOLD[sg < 0 ? 3 : 2]); l.set(S[0] + sg * 25, S[1] - 7, TGOLD[4]);
      for (const [dx, dy] of [[9, 0], [14, 2], [17, -1], [11, 4]] as const) l.set(S[0] + sg * dx, S[1] + dy, P.shadow[1]);
    }
    l.rect(S[0] - 2, S[1] - 8, 5, 6, FACE[0]); l.rect(S[0] - 2, S[1] - 8, 2, 5, FACE[1]);
    for (let k = 0; k <= 8; k++) { const x = S[0] - 7 + k * 2, y = S[1] + 3 + Math.round(Math.sin((k / 8) * Math.PI) * 3); l.set(x, y, k % 2 ? TGOLD[3] : TGOLD[1]); }
  });
  lay(p, (l) => head(l, hx, hy, z.crown, z.hd[1] >= 4));
  // Arme und Klinge
  let tip: Pt = [0, 0];
  const two = z.f.a === 'windup' || (z.f.a === 'attack' && z.f.i < 3);
  lay(p, (l) => arm(l, [S[0] - 16, S[1] + 3], two ? [z.Rh[0] - 3, z.Rh[1] + 3] : z.L, 1));
  if (z.held) lay(p, (l) => { tip = blade(l, z.Rh, z.ba); });
  lay(p, (l) => arm(l, [S[0] + 16, S[1] + 3], z.Rh, -1));
  return { chest, tip };
}

function heap(p: Px, t: number, z: H): void {
  // leerer Mantel am Boden
  lay(p, (l) => {
    const h = lerp(28, 13, t);
    form(l, (m) => { m.ell(CX, GY - 4, 36, 5, 1); m.ell(CX - 3, GY - h * 0.5 - 1, lerp(24, 26, t), h * 0.5 + 1, 1); m.ell(CX + 12, GY - h * 0.3 - 2, 14, h * 0.4 + 1, 1); }, MANT, 0, 4, 0.03, 0.55);
    for (const [x0, x1, yy] of [[36, 54, 0.5], [50, 76, 0.8], [70, 92, 0.4], [42, 66, 0.2]] as const) bez([x0, GY - 3], [(x0 + x1) / 2, GY - h * yy - 4], [x1, GY - 2], 18).forEach((q, k) => { l.set(q[0], q[1], MANT[0]); if (k % 3) l.set(q[0], q[1] - 1, MANT[4]); });
    bez([34, GY - 2], [56, GY - h * 0.9], [84, GY - 3], 30).forEach((q, k) => l.set(q[0], q[1] + 2, k % 4 === 0 ? TGOLD[3] : TGOLD[1]));
    l.ball(CX - 6, GY - h * 0.8 - 1, 8, 3.5, [P.bone[0], P.bone[1], P.bone[2], P.bone[3]], 0, 3); l.px([CX - 9, GY - h * 0.8 - 1, CX - 4, GY - h * 0.8, CX - 1, GY - h * 0.8 - 2], P.shadow[1]);
    tendrils(l, z, 28, 96, 1);
  });
}

const fn = (p: Px, f: BFr): void => {
  const z = pose(f), i = f.i;
  const groundBlade = (): void => { lay(p, (l) => blade(l, [58, GY - 4], 0.01, 54, 3)); };
  const groundCrown = (x: number, y: number, sk: number): void => { lay(p, (l) => crown(l, x, y, sk)); };
  if (f.a === 'death' && i >= 4) {
    const t = [0.35, 0.75, 1, 1][i - 4], z3 = pose({ ...f, i: 3 });
    if (i < 6) { const snap = new Px(p.w, p.h); figure(snap, { ...z3, light: 0, held: false }); p.draw(shredUp(snap, [0.42, 0.78][i - 4], 17, 16).alphaMul(i === 4 ? 0.9 : 0.6)); }
    heap(p, t, z);
    groundBlade(); groundCrown(98, GY, -0.25);
    // das Licht entweicht nach oben
    const ly = [58, 30, 10, 0][i - 4];
    if (i < 7) {
      for (let y = ly + 4; y < Math.min(96, ly + 46); y += 1) { const a = 200 * (1 - (y - ly) / 46) * (i === 6 ? 0.5 : 1), w = Math.sin(y * 0.4 + i) * 2; p.blend(CX + 1 + w, y, alpha(P.teal[4], a)); if (y % 2) p.blend(CX + 2 + w, y, alpha(P.teal[3], a * 0.6)); }
      glow(p, CX + 1, ly, i === 6 ? 7 : 12, P.teal[3], 70); glow(p, CX + 1, ly, i === 6 ? 3 : 5, WHITE, 130);
      lay(p, (l) => { l.ell(CX + 1, ly, i === 6 ? 1.6 : 3, i === 6 ? 2.2 : 4, P.teal[4]); l.ell(CX + 1, ly, i === 6 ? 0.8 : 1.6, i === 6 ? 1.2 : 2.4, WHITE); }, false);
      rays(p, CX + 1, ly, 4, i === 6 ? 9 : 16, 8, i * 0.4, P.teal[4], 170);
    }
    return;
  }
  // Elementfunken (Spezial): hinten
  const motes = (front: boolean): void => {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + Math.sin(f.ph) * 0.22 + 0.3, sa = Math.sin(a), rr = 1 + Math.cos(f.ph * 2 + k) * 0.04;
      if ((sa >= 0) !== front) continue;
      const x = CX + 2 + Math.cos(a) * 52 * rr, y = 62 + sa * 17 * rr + Math.sin(f.ph + k * 1.1) * 2;
      glow(p, x, y, 7, MOTES[k], 70); lay(p, (l) => { l.poly([[x, y - 3.5], [x + 3, y], [x, y + 3.5], [x - 3, y]], MOTES[k]); l.rect(R(x) - 1, R(y) - 1, 2, 2, WHITE); }, false);
      for (let j = 1; j < 5; j++) p.blend(CX + 2 + Math.cos(a - j * 0.09) * 52 * rr, 62 + Math.sin(a - j * 0.09) * 17 * rr, alpha(MOTES[k], 200 - j * 40));
    }
  };
  if (f.a === 'special') { glow(p, CX + 1, 58 + z.dy, 30, P.teal[3], 30); rays(p, CX + 1, 58 + z.dy, 10, 36 + (i % 2) * 6, 14, i * 0.22, P.teal[4], 130); motes(false); }
  if (f.a === 'attack' && (i === 1 || i === 2)) {
    // Hiebspur
    const a0 = i === 1 ? -1.25 : -0.25, a1 = z.ba, pv = z.Rh;
    for (let a = a0; a < a1; a += 0.012) { const t = (a - a0) / (a1 - a0); for (let r = 30; r < 59; r += 1) { const al = 255 * Math.pow(t, 1.3) * (0.3 + 0.7 * ((r - 30) / 29)); if (al < 12) continue; const x = pv[0] + Math.cos(a) * r, y = pv[1] + Math.sin(a) * r; if (x < 126 && y < GY) p.blend(x, y, alpha(t > 0.86 && r > 40 ? WHITE : r > 51 ? P.violet[4] : r > 42 ? P.violet[3] : P.violet[2], al)); } }
  }
  const { chest, tip } = figure(p, z);
  if (!z.held) groundBlade();
  if (f.a === 'death' && i === 3) { groundCrown(94, GY - 26, -0.5); glow(p, chest[0], chest[1] - 6, 9, WHITE, 60); }
  if (f.a === 'special') {
    motes(true);
    const hx = z.L[0], hy = z.L[1]; glow(p, hx, hy - 3, 6, P.teal[4], 80); spark(p, hx, hy - 5, WHITE, P.teal[4], 2);
    for (let k = 0; k < 8; k++) { const cyc = (k * 4 + i * 5) % 20; p.blend(chest[0] - 8 + k * 2.2, chest[1] - 10 - cyc, alpha(P.teal[4], 230 - cyc * 10)); }
  }
  if (f.a === 'windup') { glow(p, tip[0], tip[1], 5 + i * 2, P.violet[3], 80); spark(p, tip[0], tip[1], WHITE, P.violet[4], 1 + i); for (let k = 0; k < 6; k++) p.blend(tip[0] + 4 + k * 3, tip[1] + 2 + k * 2 - i * 2, alpha(P.violet[4], 200 - k * 30)); }
  if (f.a === 'attack' && i === 1) spark(p, tip[0] - 1, tip[1], WHITE, P.violet[4], 2);
  if (f.a === 'idle') for (let k = 0; k < 6; k++) { const cyc = (k * 5 + i * 3) % 18; p.blend(30 + k * 12 + Math.sin(k + i) * 2, GY - 6 - cyc, alpha(P.shadow[3], 220 - cyc * 11)); }
  void rnd2; void ease;
};

export const hohlkoenig: BossDef = { w: 128, h: 128, fn };
