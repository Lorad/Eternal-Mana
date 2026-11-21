/** Gegner-Sprites. Eine Zeile je Gegner: 0-3 Zyklus, 4 Ausholen, 5 Schlag, 6 Getroffen. Blick nach rechts. */
import { Px, gridSheet } from './draw';
import { P, Ramp, INK, WHITE, alpha, mix } from './palette';
import { MOB_IDS } from './spec';
import type { Sheet, SpriteMeta } from './spec';

type MobFn = (p: Px, f: number) => void;
interface MobDef { w: number; h: number; fn: MobFn }

const SQ = [0, 1, 0, -1];
const cyc = (f: number): number => (f < 4 ? f : 0);
/** Auge 2x2 mit Glanzpunkt. */
function eye(l: Px, x: number, y: number, c = INK, hl = WHITE): void {
  l.rect(x, y, 2, 2, c); l.set(x, y, hl);
}
function glow(p: Px, cx: number, cy: number, r: number, c: number, a = 90): void {
  for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
    if (d < 1) p.blend(x, y, alpha(c, Math.round(a * (d < 0.55 ? 1 : 0.5))));
  }
}

// ---------------------------------------------------------------- Schleime
function slime(p: Px, f: number, r: Ramp, deco: (l: Px, cx: number, top: number, rx: number, ry: number) => void, a = 255, base = 21): void {
  let rx = 8, ry = 6, cx = 12;
  if (f < 4) { rx -= SQ[f]; ry += SQ[f]; }
  else if (f === 4) { rx = 9.5; ry = 4.2; cx = 11; }
  else if (f === 5) { rx = 6.5; ry = 8; cx = 14; }
  const cy = base - ry * 0.78;
  p.layer((l) => {
    l.ball(cx, cy, rx, ry, r, 1, 4);
    for (let x = 0; x < l.w; x++) for (let y = base + 1; y < l.h; y++) l.set(x, y, 0);
    l.rect(Math.round(cx - rx * 0.6), base, Math.round(rx * 1.2), 1, r[1]);
    // Glanzlicht
    l.rect(Math.round(cx - rx * 0.55), Math.round(cy - ry * 0.55), 2, 1, WHITE); l.set(Math.round(cx - rx * 0.55) - 1, Math.round(cy - ry * 0.55) + 1, WHITE);
    deco(l, cx, cy - ry, rx, ry);
    const ey = Math.round(cy - ry * 0.05), ex = Math.round(cx + rx * 0.1);
    eye(l, ex, ey); eye(l, ex + Math.round(rx * 0.5), ey);
    if (f === 5) { l.rect(ex + 1, ey + 3, 3, 2, r[0]); l.set(ex + 2, ey + 4, P.red[2]); } else if (f === 4) l.rect(ex + 1, ey + 3, 3, 1, r[0]);
    else l.set(ex + 2, ey + 3, r[0]);
    if (a < 255) l.alphaMul(a / 255);
  });
}
const moosling: MobFn = (p, f) => slime(p, f, P.green, (l, cx, top, rx, ry) => {
  // Moospolster + Blättchen
  l.px([cx - 4, top + 3, cx - 3, top + 2, cx + 2, top + 2, cx + 4, top + 4, cx - 6, top + ry + 2, cx + 5, top + ry + 4, cx - 2, top + ry + 5], P.forest[2]);
  l.px([cx - 2, top + 2, cx + 3, top + 3, cx - 5, top + ry + 1], P.green[4]);
  const lean = f === 5 ? 2 : f === 4 ? -1 : SQ[cyc(f)];
  l.line(cx, top + 1, cx + lean, top - 2, P.forest[3]);
  l.rect(cx + lean + 1, top - 4, 3, 2, P.green[3]); l.set(cx + lean + 3, top - 4, P.green[4]); l.set(cx + lean + 4, top - 3, P.green[3]);
  l.rect(cx + lean - 3, top - 3, 3, 2, P.green[4]); l.set(cx + lean - 4, top - 3, P.green[3]);
  void rx;
});
const tropfschleim: MobFn = (p, f) => slime(p, f, P.blue, (l, cx, top, rx, ry) => {
  const lean = f === 5 ? 2 : 0;
  l.poly([[cx - 2.5, top + 2], [cx + lean + 0.5, top - 4], [cx + 3, top + 2]], P.blue[3]); l.set(cx + lean, top - 3, P.blue[4]); l.set(cx - 1, top, P.blue[4]);
  l.px([cx - 3, top + ry + 3, cx + 5, top + ry + 1], P.blue[4]); l.set(cx - 4, top + ry + 1, WHITE);
  l.ell(cx - 1, top + ry * 1.25, 2.2, 1.6, P.blue[1]);
  void rx;
}, 215);
const magmaschleim: MobFn = (p, f) => slime(p, f, P.fire, (l, cx, top, rx, ry) => {
  // dunkle Krustenplatten
  const plates: Array<[number, number, number, number]> = [[-5, 2, 4, 3], [0, 0, 5, 3], [4, 4, 3, 3], [-7, 6, 3, 3], [-2, 4, 3, 2]];
  for (const [dx, dy, w, h] of plates) {
    if (dy > ry) continue;
    l.rrect(cx + dx, top + dy + 1, w, h, P.ash[2]); l.rect(cx + dx + 1, top + dy + 1, w - 2, 1, P.ash[4]); l.rect(cx + dx + 1, top + dy + h, w - 2, 1, P.fire[1]);
  }
  const t = cyc(f);
  l.set(cx - 3 + t * 2, top - 2 - (t & 1), P.fire[3]); l.set(cx + 4 - t, top - 1 - ((t + 1) & 1) * 2, P.fire[4]);
  void rx;
});

// ---------------------------------------------------------------- Wölfe / Hunde (32x24)
function wolf(p: Px, f: number, r: Ramp, kind: 'wald' | 'asche' | 'frost'): void {
  const t = cyc(f);
  let bx = 0, by = 0, hy = 0, hx = 0, open = false;
  if (f === 4) { bx = -2; by = 2; hy = 3; hx = -1; }
  if (f === 5) { bx = 3; by = 0; hy = 0; hx = 1; open = true; }
  const run = [[2, -2, -2, 2], [1, 0, -1, 0], [-2, 2, 2, -2], [-1, 0, 1, 0]][t];
  const lf = f === 4 ? [1, 1, 0, 0] : f === 5 ? [4, 3, -3, -2] : run;
  const base = 21;
  const eyeC = kind === 'asche' ? P.fire[3] : kind === 'frost' ? P.blue[3] : P.gold[3];
  p.layer((l) => {
    const X = (x: number) => x + bx, Y = (y: number) => y + by;
    // hintere Beine (dunkler)
    l.line(X(9), Y(15), X(9) + lf[3], base, r[1], 2); l.line(X(21), Y(15), X(21) + lf[1], base, r[1], 2);
    // Schweif
    const tw = f === 4 ? -3 : SQ[t];
    if (kind === 'asche') {
      l.line(X(6), Y(11), X(2), Y(8 + tw), r[2], 2);
      l.ball(X(2), Y(7 + tw), 2.4, 3, P.fire, 1, 4); l.set(X(1), Y(4 + tw - (t & 1)), P.fire[3]);
    } else {
      l.poly([[X(7), Y(10)], [X(1), Y(7 + tw)], [X(0), Y(11 + tw)], [X(3), Y(14 + tw)], [X(8), Y(14)]], r[2]);
      l.line(X(1), Y(8 + tw), X(5), Y(10), r[3]); l.line(X(2), Y(13 + tw), X(6), Y(14), r[1]); l.set(X(0), Y(10 + tw), r[4]);
    }
    // Rumpf
    l.ball(X(13), Y(13), 8, 4.6, r, 1, 3);
    l.ball(X(20), Y(12), 5, 5.2, r, 1, 4);
    l.rect(X(8), Y(16), 10, 1, r[kind === 'asche' ? 1 : 4]);
    // Mähne/Nackenfell
    l.px([X(17), Y(6), X(19), Y(5), X(15), Y(8)], r[3]);
    // vordere Beine
    const leg = (x: number, d: number) => { l.line(X(x), Y(15), X(x) + d, base - 1, r[2], 2); l.rect(X(x) + d, base, 3, 1, r[3]); l.set(X(x) + d, base - 1, r[3]); };
    leg(11, lf[2]); leg(23, lf[0]);
    // Kopf
    const HX = (x: number) => X(x) + hx, HY = (y: number) => Y(y) + hy;
    l.ball(HX(25), HY(9), 4.2, 3.8, r, 2, 4);
    l.poly([[HX(21.5), HY(6)], [HX(22.5), HY(1.5)], [HX(25), HY(5.5)]], r[2]); l.poly([[HX(24.5), HY(6)], [HX(26.5), HY(2)], [HX(27.5), HY(6.5)]], r[3]); l.set(HX(25), HY(4), P.pink[3]);
    l.rect(HX(27), HY(9), 4, 2, r[4]); l.rect(HX(27), HY(11), 3, 1, r[2]); l.rect(HX(30), HY(9), 1, 1, INK);
    if (open) { l.rect(HX(26), HY(11), 4, 2, P.red[1]); l.rect(HX(26), HY(13), 4, 1, r[2]); l.set(HX(27), HY(11), WHITE); l.set(HX(29), HY(11), WHITE); l.set(HX(28), HY(12), WHITE); }
    l.rect(HX(25), HY(8), 2, 1, eyeC); l.set(HX(26), HY(8), INK); l.rect(HX(24), HY(7), 3, 1, r[1]);
    // Besonderheiten
    if (kind === 'frost') {
      for (const [x, y, h] of [[11, 8, 3], [14, 7, 4], [17, 6, 4], [20, 5, 3]] as const) { l.poly([[X(x - 1.5), Y(y + 2)], [X(x - 0.5), Y(y - h)], [X(x + 1.5), Y(y + 2)]], P.ice[3]); l.set(X(x - 1), Y(y - h + 1), P.ice[4]); l.set(X(x), Y(y + 1), P.ice[1]); }
    }
    if (kind === 'asche') {
      l.line(X(8), Y(12), X(11), Y(14), P.fire[2]); l.line(X(11), Y(14), X(14), Y(11), P.fire[3]); l.line(X(16), Y(13), X(19), Y(10), P.fire[2]); l.set(X(20), Y(14), P.fire[3]); l.set(X(13), Y(10), P.fire[2]); l.set(HX(23), HY(10), P.fire[2]);
    }
  });
}

// ---------------------------------------------------------------- Irrlichter
function wisp(p: Px, f: number, r: Ramp, ice: boolean): void {
  const t = cyc(f), bob = [0, -1, -2, -1][t];
  let cx = 12, cy = 11 + bob, rad = 4;
  if (f === 4) { rad = 3; cy = 10; } if (f === 5) { rad = 5; cx = 14; }
  glow(p, cx, cy, rad + (f === 4 ? 7 : 5), r[4], f === 4 ? 80 : 45);
  // Schweif
  for (let i = 0; i < 9; i++) {
    const w = Math.max(0.6, (rad - 0.5) * (1 - i / 9)), sx = Math.sin((i + t * 1.6) * 0.9) * (i / 4) - (f === 5 ? i * 0.5 : 0);
    p.ell(cx + sx, cy + 2 + i, w, 1, i < 4 ? r[3] : alpha(r[2], 200 - i * 12));
  }
  const core = new Px(p.w, p.h);
  if (ice) { core.poly([[cx, cy - rad - 2], [cx + rad + 1, cy], [cx, cy + rad + 1], [cx - rad - 1, cy]], r[3]); core.poly([[cx, cy - rad - 1], [cx + 1, cy], [cx, cy + rad], [cx - rad, cy]], r[4]); core.line(cx, cy - rad, cx, cy + rad - 1, WHITE); }
  else { core.ball(cx, cy, rad, rad, r, 2, 4); core.ell(cx - 0.5, cy - 0.5, rad * 0.55, rad * 0.55, WHITE); }
  core.outline(r[1]);
  p.draw(core);
  eye(p, cx - 1, cy - 1, r[0], r[0]); eye(p, cx + 2, cy - 1, r[0], r[0]);
  // Funken
  const sp: Array<[number, number]> = f === 5 ? [[cx + 7, cy - 1], [cx + 5, cy - 6], [cx + 5, cy + 5], [cx - 6, cy - 4], [cx + 8, cy + 3]] : f === 4 ? [[cx - 7, cy - 5], [cx + 7, cy - 5], [cx - 7, cy + 4], [cx + 7, cy + 4]] : [[cx - 6 + t, cy - 5 + t], [cx + 6 - t, cy + 2 - t * 2]];
  for (const [x, y] of sp) { p.set(x, y, WHITE); if (f >= 4) { p.blend(x - 1, y, alpha(r[4], 200)); p.blend(x + 1, y, alpha(r[4], 200)); p.blend(x, y - 1, alpha(r[4], 200)); p.blend(x, y + 1, alpha(r[4], 200)); } }
  if (ice) { const a = t * 0.8; for (let i = 0; i < 3; i++) { const aa = a + (i * Math.PI * 2) / 3; const x = cx + Math.cos(aa) * 8, y = cy + Math.sin(aa) * 4; p.set(x, y, P.ice[4]); p.set(x, y + 1, P.ice[2]); p.set(x, y - 1, WHITE); } }
}

// ---------------------------------------------------------------- Kobolde
function imp(p: Px, f: number, r: Ramp, ice: boolean): void {
  const t = cyc(f), bob = t % 2;
  const la = [1, 0, -1, 0][t], atk = f === 4 ? 1 : f === 5 ? 2 : 0;
  const bx = atk === 2 ? 2 : atk === 1 ? -1 : 0;
  p.layer((l) => {
    // Schwanz
    const tl = SQ[t];
    l.line(9 + bx, 17, 5 + bx, 15 + tl, r[1]); l.line(5 + bx, 15 + tl, 4 + bx, 12 + tl, r[1]);
    if (ice) { l.rect(3 + bx, 10 + tl, 2, 2, P.ice[4]); } else { l.ball(4.5 + bx, 10.5 + tl, 2, 2.4, P.fire, 2, 4); l.set(4 + bx, 7 + tl + (t & 1), P.fire[3]); }
    // Beine
    l.line(11 + bx, 18, 10 + bx - la, 21, r[1], 2); l.line(13 + bx, 18, 14 + bx + la, 21, r[2], 2); l.rect(14 + bx + la, 21, 3, 1, r[2]);
    // Körper
    l.ball(12 + bx, 16 + bob, 3.6, 3.6, r, 1, 3); l.rect(11 + bx, 16 + bob, 3, 2, ice ? P.ice[3] : P.fire[3]);
    // Kopf
    const hy = 9 + bob + (atk === 1 ? -1 : 0);
    l.ball(13 + bx, hy, 5.2, 4.6, r, 1, 4);
    l.poly([[7.5 + bx, hy - 1], [4.5 + bx, hy - 3], [8 + bx, hy + 2]], r[2]); l.poly([[18 + bx, hy - 1], [21 + bx, hy - 4], [18 + bx, hy + 2]], r[3]);
    if (ice) { l.poly([[11 + bx, hy - 4], [13.5 + bx, hy - 10], [16 + bx, hy - 4]], P.ice[3]); l.line(13 + bx, hy - 8, 12 + bx, hy - 4, P.ice[4]); l.set(15 + bx, hy - 5, P.ice[1]); }
    else { l.poly([[9 + bx, hy - 3], [9 + bx, hy - 8], [12 + bx, hy - 4]], P.bone[3]); l.poly([[15 + bx, hy - 4], [18 + bx, hy - 8], [17 + bx, hy - 3]], P.bone[4]); l.set(9 + bx, hy - 7, P.bone[2]); }
    const ec = ice ? WHITE : P.fire[4];
    l.rect(12 + bx, hy - 1, 2, 2, ec); l.rect(16 + bx, hy - 1, 2, 2, ec); l.set(13 + bx, hy, INK); l.set(17 + bx, hy, INK); l.set(11 + bx, hy - 2, r[0]); l.set(12 + bx, hy - 2, r[0]); l.set(17 + bx, hy - 2, r[0]);
    l.rect(13 + bx, hy + 2, 4, 1, INK); l.set(14 + bx, hy + 2, WHITE); l.set(16 + bx, hy + 2, WHITE);
    // Arme
    if (atk === 0) { l.line(9 + bx, 15 + bob, 8 + bx, 18 + bob + la, r[2], 2); l.line(15 + bx, 15 + bob, 17 + bx, 17 + bob - la, r[3], 2); }
    else if (atk === 1) { l.line(9 + bx, 15, 7 + bx, 18, r[2], 2); l.line(15 + bx, 14, 18 + bx, 8, r[3], 2); }
    else { l.line(9 + bx, 15, 6 + bx, 13, r[2], 2); l.line(15 + bx, 15, 20 + bx, 14, r[3], 2); }
  });
  // Geschoss in der Hand
  if (atk === 1) {
    if (ice) p.layer((l) => { l.poly([[16, 7], [20, 0], [22, 7]], P.ice[3]); l.line(19, 2, 18, 6, WHITE); });
    else { glow(p, 18.5, 5, 5, P.fire[2], 110); p.layer((l) => { l.ball(18.5, 5, 2.8, 2.8, P.fire, 2, 4); }, false); p.set(18, 4, WHITE); }
  }
  if (atk === 2) { p.set(23, 13, WHITE); p.set(22, 11, ice ? P.ice[4] : P.fire[4]); p.set(22, 16, ice ? P.ice[3] : P.fire[3]); }
}

// ---------------------------------------------------------------- Golems (32x32)
function golem(p: Px, f: number, rock: Ramp, glowR: Ramp, runic: boolean): void {
  const t = cyc(f), bob = t === 1 || t === 2 ? 1 : 0, sw = [1, 0, -1, 0][t];
  const atk = f === 4 ? 1 : f === 5 ? 2 : 0;
  const by = bob + (atk === 2 ? 2 : 0), bx = atk === 2 ? 2 : atk === 1 ? -1 : 0;
  const gl = glowR[atk ? 4 : 3];
  p.layer((l) => {
    // Beine
    for (const [x, d, sh] of [[10, -sw, 1], [18, sw, 2]] as const) { l.rrect(x + bx * 0.5, 23 - (d > 0 ? 1 : 0), 6, 7 + (d > 0 ? 1 : 0), rock[sh]); l.rect(x + bx * 0.5 + 1, 29, 5, 1, rock[0]); l.rect(x + bx * 0.5 + 1, 24, 2, 1, rock[sh + 1]); }
    // linker (hinterer) Arm
    l.ball(6 + bx, 15 + by + sw, 3.5, 4, rock, 0, 2); l.ball(5 + bx, 22 + by + sw, 3.6, 3.6, rock, 0, 3);
  });
  p.layer((l) => {
    // Rumpf
    if (runic) { l.rrect(8 + bx, 8 + by, 16, 16, rock[2]); l.rect(9 + bx, 8 + by, 14, 2, rock[4]); l.rect(8 + bx, 9 + by, 2, 13, rock[3]); l.rect(20 + bx, 11 + by, 4, 12, rock[1]); l.rect(9 + bx, 22 + by, 14, 2, rock[1]); l.rect(10 + bx, 10 + by, 3, 1, rock[3]); }
    else { l.ball(16 + bx, 15 + by, 9.5, 9, rock, 0, 4); l.ball(11 + bx, 10 + by, 4, 3.4, rock, 2, 4); l.ball(21 + bx, 11 + by, 4, 3.4, rock, 1, 3); }
    // Kopf
    if (runic) { l.rrect(12 + bx, 2 + by, 9, 7, rock[3]); l.rect(13 + bx, 2 + by, 7, 1, rock[4]); l.rect(18 + bx, 4 + by, 3, 5, rock[1]); l.rect(13 + bx, 5 + by, 7, 2, rock[0]); l.rect(14 + bx, 5 + by, 2, 2, gl); l.rect(18 + bx, 5 + by, 2, 2, gl); }
    else { l.ball(17 + bx, 7 + by, 4.5, 4, rock, 1, 4); l.rect(14 + bx, 7 + by, 7, 2, rock[0]); l.rect(15 + bx, 7 + by, 2, 2, gl); l.rect(19 + bx, 7 + by, 2, 2, gl); l.set(15 + bx, 7 + by, WHITE); l.set(19 + bx, 7 + by, WHITE); }
    // Glut-Risse / Runen
    if (runic) {
      const g = gl;
      l.rect(14 + bx, 12 + by, 5, 1, g); l.rect(16 + bx, 12 + by, 1, 7, g); l.rect(13 + bx, 15 + by, 7, 1, g); l.rect(14 + bx, 18 + by, 1, 2, g); l.rect(18 + bx, 18 + by, 1, 2, g); l.set(16 + bx, 15 + by, WHITE);
      l.set(10 + bx, 13 + by, glowR[2]); l.set(10 + bx, 17 + by, glowR[2]); l.set(22 + bx, 14 + by, glowR[2]);
    } else {
      l.line(11 + bx, 13 + by, 14 + bx, 16 + by, glowR[2]); l.line(14 + bx, 16 + by, 13 + bx, 20 + by, glowR[3]); l.line(14 + bx, 16 + by, 19 + bx, 17 + by, glowR[3]); l.line(19 + bx, 17 + by, 21 + bx, 21 + by, glowR[2]); l.line(19 + bx, 17 + by, 22 + bx, 14 + by, glowR[2]); l.set(14 + bx, 16 + by, glowR[4]); l.set(16 + bx, 20 + by, glowR[1]); l.rect(15 + bx, 12 + by, 3, 2, glowR[3]); l.set(16 + bx, 12 + by, glowR[4]);
    }
  });
  // rechter (vorderer) Arm
  let ax = 26, ay = 15 + by - sw, fx = 27, fy = 22 + by - sw;
  if (atk === 1) { ax = 25; ay = 8; fx = 26; fy = 3; }
  if (atk === 2) { ax = 27; ay = 17; fx = 28; fy = 25; }
  p.layer((l) => {
    l.ball(ax + bx * 0.5, ay, 3.6, 4, rock, 1, 3);
    l.ball(fx + bx * 0.5, fy + 0.5, 4, 4, rock, 1, 4);
    l.set(fx + bx * 0.5 - 1, fy + 1, glowR[3]); l.set(fx + bx * 0.5, fy + 2, glowR[2]); if (runic) l.rect(fx + bx * 0.5 - 1, fy, 2, 1, gl);
  });
  if (atk === 2) { for (const [x, y] of [[23, 29], [31, 28], [26, 30], [30, 30], [22, 27]] as const) p.set(x, y, glowR[4]); p.set(31, 25, WHITE); }
  if (atk === 1) { for (const [x, y] of [[21, 1], [31, 2], [22, 6], [30, 7]] as const) p.set(x, y, glowR[4]); }
}

// ---------------------------------------------------------------- Einzelstücke
const dornkaefer: MobFn = (p, f) => {
  const t = cyc(f), bx = f === 4 ? -2 : f === 5 ? 3 : 0, tilt = f === 4 ? -2 : 0;
  p.layer((l) => {
    const lg = [[0, 1, 0], [1, 0, 1], [0, 1, 0], [1, 0, 1]][t];
    for (let i = 0; i < 3; i++) { const x = 7 + i * 4 + bx, up = lg[i] && f < 4 ? 1 : 0; l.line(x, 17, x - 1 + (t & 1 ? 1 : -1) * (i === 1 ? -1 : 1) * (f < 4 ? 1 : 0), 21 - up, P.wood[1]); l.set(x - 2 + (i === 2 ? 3 : 0), 21 - up, P.wood[1]); }
    // Panzer
    l.ball(11 + bx, 13, 8, 6, P.tan, 0, 3);
    l.line(11 + bx, 8, 11 + bx, 18, P.wood[1]); l.ball(8 + bx, 11, 2, 1.5, P.tan, 3, 4);
    l.rect(4 + bx, 17, 14, 2, P.wood[1]); l.rect(5 + bx, 18, 12, 1, P.forest[2]);
    // Dornen
    for (const [x, y] of [[6, 9], [10, 7], [14, 8]] as const) { l.poly([[x + bx - 1.5, y + 1], [x + bx - 1, y - 4], [x + bx + 2, y + 1]], P.green[3]); l.set(x + bx - 1, y - 3, P.green[4]); l.set(x + bx + 1, y, P.forest[2]); }
    // Kopf + Horn
    l.ball(19 + bx, 15 + tilt, 3.4, 3.4, P.wood, 1, 3);
    l.line(21 + bx, 14 + tilt, 23 + bx, 10 + tilt + (f === 5 ? 3 : 0), P.bone[3], 1); l.line(21 + bx, 15 + tilt, 23 + bx, 11 + tilt + (f === 5 ? 3 : 0), P.bone[2], 1);
    l.rect(19 + bx, 14 + tilt, 2, 2, P.gold[4]); l.set(20 + bx, 15 + tilt, INK);
    l.set(22 + bx, 17 + tilt, P.wood[0]); l.set(21 + bx, 18 + tilt, P.wood[0]);
  });
};
const pilzling: MobFn = (p, f) => {
  const t = cyc(f), bob = t % 2, la = [1, 0, -1, 0][t];
  const cry = f === 4 ? 7 : f === 5 ? 4.5 : 6, cy = f === 4 ? 8 : f === 5 ? 11 : 9 + bob, cx = f === 5 ? 13 : f === 4 ? 11 : 12;
  p.layer((l) => {
    l.rect(9 - la, 20, 3, 2, P.tan[2]); l.rect(13 + la, 20, 3, 2, P.tan[3]);
    l.rrect(8, 12 + bob, 9, 9 - bob, P.cream[3]); l.rect(8, 13 + bob, 2, 7 - bob, P.cream[4]); l.rect(15, 13 + bob, 2, 7 - bob, P.cream[2]); l.rect(9, 12 + bob, 7, 2, P.cream[1]);
    eye(l, 11, 15 + bob); eye(l, 15, 15 + bob); l.set(10, 18 + bob, P.red[3]); l.set(13, 18 + bob, f >= 4 ? INK : P.cream[1]); if (f === 5) l.rect(13, 18, 2, 2, INK);
  });
  p.layer((l) => {
    l.ball(cx, cy, 10, cry, P.red, 1, 4);
    for (let x = 0; x < l.w; x++) for (let y = Math.round(cy + cry * 0.55); y < l.h; y++) l.set(x, y, 0);
    for (let x = cx - 8; x <= cx + 8; x++) if (l.get(Math.round(x), Math.round(cy + cry * 0.55) - 1)) l.set(x, Math.round(cy + cry * 0.55) - 1, P.red[0]);
    for (const [dx, dy, s] of [[-5, -2, 2], [1, -4, 3], [5, 0, 2], [-2, 1, 2], [-8, 1, 1]] as const) { l.rrect(cx + dx, cy + dy * (cry / 6), s, s, WHITE); if (s > 1) l.set(cx + dx + s - 1, cy + dy * (cry / 6) + s - 1, P.cream[2]); }
  });
  if (f === 5) for (const [x, y] of [[20, 13], [22, 10], [23, 15], [21, 17], [19, 9]] as const) { p.set(x, y, P.green[4]); p.blend(x + 1, y, alpha(P.green[3], 160)); }
  if (f === 4) { p.set(4, 4, P.green[4]); p.set(19, 3, P.green[4]); }
};
const wurzelschleicher: MobFn = (p, f) => {
  const t = cyc(f), up = f === 4 ? -3 : f === 5 ? 0 : (t & 1), bx = f === 5 ? 2 : 0;
  const cx = 11 + bx, cy = 13 + up;
  p.layer((l) => {
    const feet: Array<[number, number, number]> = [[3, 21, 0], [7, 21, 1], [15, 21, 0], [19, 21, 1], [1, 17, 1], [21, 18, 0]];
    feet.forEach(([fx, fy, ph], i) => {
      const lift = f < 4 && (t % 2 === ph) ? 2 : 0, sh = f < 4 ? (t % 2 === ph ? 1 : -1) : 0;
      let ex = fx + sh + bx * 0.5, ey = fy - lift;
      if (f === 4 && fx > 12) { ex = fx + 1; ey = fy - 12 + i; }
      if (f === 5 && fx > 12) { ex = fx + 4; ey = fy - 6 + (i & 1) * 4; }
      const mx = (cx + ex) / 2 + (fx < 12 ? -1 : 1), my = Math.min(cy, ey) - 3 + (i % 3);
      l.line(cx, cy, mx, my, P.wood[2], 2); l.line(mx, my, ex, ey, P.wood[2], 2); l.set(mx, my, P.wood[3]); l.set(ex, ey + 1, P.wood[1]);
    });
    l.ball(cx, cy, 6, 5, P.wood, 0, 3);
    l.line(cx - 3, cy - 3, cx - 5, cy - 8, P.wood[2]); l.line(cx + 1, cy - 4, cx + 2, cy - 9, P.wood[3]); l.rect(cx - 7, cy - 9, 2, 2, P.green[3]); l.rect(cx + 2, cy - 11, 3, 2, P.green[4]); l.set(cx + 5, cy - 10, P.green[3]);
    l.rect(cx - 2, cy - 1, 7, 3, P.wood[0]);
    const g = f >= 4 ? P.fire[4] : P.fire[3];
    l.rect(cx - 1, cy - 1, 2, 2, g); l.rect(cx + 3, cy - 1, 2, 2, g); l.set(cx - 1, cy - 1, WHITE); l.set(cx + 3, cy - 1, WHITE);
    l.px([cx - 4, cy + 2, cx + 2, cy + 3, cx - 1, cy + 3], P.wood[1]); l.set(cx - 3, cy - 2, P.forest[3]); l.set(cx + 4, cy + 3, P.forest[3]);
  });
};
const fledermaus: MobFn = (p, f) => {
  const t = cyc(f);
  const wy = f === 4 ? -7 : f === 5 ? 3 : [-6, -1, 5, -1][t];
  const cy = (f === 5 ? 14 : f === 4 ? 10 : 11) + (f < 4 ? [1, 0, -1, 0][t] : 0), cx = f === 5 ? 14 : 12;
  p.layer((l) => {
    for (const s of [-1, 1]) {
      const tx = cx + s * 11, ty = cy + wy, mx = cx + s * 6, my = cy + wy * 0.5 - 2;
      l.poly([[cx + s * 2, cy - 2], [mx, my], [tx, ty], [cx + s * 8, ty + 4 - wy * 0.3], [cx + s * 5, cy + 3 - wy * 0.1], [cx + s * 2, cy + 3]], P.violet[s < 0 ? 1 : 2]);
      l.line(cx + s * 2, cy - 1, mx, my, P.violet[3]); l.line(mx, my, tx, ty, P.violet[3]); l.line(mx, my, cx + s * 6, cy + 3 - wy * 0.1, P.violet[s < 0 ? 0 : 1]);
    }
    l.ball(cx, cy, 3.8, 4.4, P.violet, 1, 4);
    l.poly([[cx - 3.5, cy - 3], [cx - 3, cy - 8], [cx - 0.5, cy - 4]], P.violet[2]); l.poly([[cx + 0.5, cy - 4], [cx + 3, cy - 8], [cx + 3.5, cy - 3]], P.violet[3]); l.set(cx + 2, cy - 5, P.pink[3]); l.set(cx - 3, cy - 5, P.pink[2]);
    l.rect(cx - 2, cy - 2, 2, 2, P.fire[4]); l.rect(cx + 1, cy - 2, 2, 2, P.fire[4]); l.set(cx - 1, cy - 1, INK); l.set(cx + 2, cy - 1, INK);
    if (f === 5) { l.rect(cx - 1, cy + 1, 4, 2, P.red[1]); l.set(cx - 1, cy + 1, WHITE); l.set(cx + 2, cy + 1, WHITE); } else { l.set(cx - 1, cy + 2, WHITE); l.set(cx + 2, cy + 2, WHITE); }
    l.set(cx - 1, cy + 5, P.violet[1]); l.set(cx + 1, cy + 5, P.violet[1]);
  });
};
const kristallkrabbler: MobFn = (p, f) => {
  const t = cyc(f), bob = t & 1, bx = f === 5 ? 2 : f === 4 ? -1 : 0;
  p.layer((l) => {
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const x = 12 + bx + s * (4 + i * 2), up = f < 4 && ((i + (s > 0 ? 1 : 0) + t) & 1) ? 1 : 0; l.line(x, 17, x + s * 3, 15 - up, P.teal[1]); l.line(x + s * 3, 15 - up, x + s * 4, 21 - up, P.teal[2]); }
    // linke Schere
    l.ball(4 + bx, 15 + bob, 3, 2.6, P.teal, 1, 3); l.rect(1 + bx, 13 + bob, 2, 1, P.teal[3]); l.set(1 + bx, 15 + bob, P.teal[0]);
    // Panzer
    l.ball(12 + bx, 15 + bob, 7.5, 4.6, P.teal, 0, 3); l.rect(7 + bx, 18 + bob, 10, 1, P.teal[0]);
    // Kristalle
    for (const [x, h, w, r] of [[8, 5, 2.5, P.teal], [12, 8, 3, P.ice], [16, 6, 2.5, P.teal]] as const) {
      l.poly([[x + bx - w, 13 + bob], [x + bx, 13 + bob - h], [x + bx + w, 13 + bob]], r[3]);
      l.line(x + bx, 12 + bob - h + 1, x + bx - 1, 12 + bob, r[4]); l.line(x + bx + 1, 12 + bob - h + 3, x + bx + 2, 12 + bob, r[2]); l.set(x + bx, 13 + bob - h, WHITE);
    }
    // Augenstiele
    l.rect(14 + bx, 15 + bob, 1, 2, P.teal[3]); l.rect(17 + bx, 15 + bob, 1, 2, P.teal[3]); eye(l, 14 + bx, 16 + bob); eye(l, 17 + bx, 16 + bob);
  });
  p.layer((l) => {
    // rechte Schere (Angriff)
    const cx = f === 4 ? 20 : f === 5 ? 21 : 20 + bx, cy = f === 4 ? 6 : f === 5 ? 13 : 15 + bob;
    if (f >= 4) l.line(17 + bx, 15, cx - 1, cy + 1, P.teal[2], 2);
    l.ball(cx, cy, 3.2, 3, P.teal, 1, 4);
    if (f === 4) { l.rect(cx + 2, cy - 4, 2, 3, P.teal[3]); l.rect(cx - 1, cy - 4, 2, 2, P.teal[2]); }
    else { l.rect(cx + 2, cy - 2, 2 + (f === 5 ? 1 : 0), 1, P.teal[4]); l.rect(cx + 2, cy + 1, 2, 1, P.teal[1]); }
  });
  if (f === 5) { p.set(23, 10, WHITE); p.set(22, 15, P.teal[4]); }
};
const skelettkrieger: MobFn = (p, f) => {
  const t = cyc(f), bob = t % 2, la = [1, 0, -1, 0][t], bx = f === 5 ? 2 : f === 4 ? -1 : 0;
  const B = P.bone;
  p.layer((l) => {
    // Beine
    l.line(11 + bx, 16, 10 + bx - la * 2, 21, B[2]); l.rect(9 + bx - la * 2, 21, 3, 1, B[2]);
    l.line(13 + bx, 16, 14 + bx + la * 2, 21, B[3]); l.rect(14 + bx + la * 2, 21, 3, 1, B[3]);
    // Becken + Wirbelsäule + Rippen
    l.rect(10 + bx, 15, 5, 2, B[2]); l.rect(12 + bx, 10 + bob, 1, 6, B[2]);
    for (let i = 0; i < 3; i++) { l.rect(10 + bx, 10 + bob + i * 2, 5, 1, B[3]); l.set(10 + bx, 10 + bob + i * 2, B[2]); }
    l.rect(9 + bx, 9 + bob, 7, 1, B[3]);
    // Schild (links, hinten)
    l.ball(7 + bx, 13 + bob, 3.4, 4, P.wood, 1, 3); l.rect(6 + bx, 12 + bob, 2, 2, P.steel[2]); l.set(6 + bx, 12 + bob, P.steel[4]);
    // Schädel
    const hy = 5 + bob;
    l.ball(13 + bx, hy, 4.2, 4, B, 2, 4); l.rect(11 + bx, hy + 3, 5, 2, B[3]); l.rect(12 + bx, hy + 4, 1, 1, INK); l.rect(14 + bx, hy + 4, 1, 1, INK);
    l.rect(11 + bx, hy - 1, 2, 2, INK); l.rect(15 + bx, hy - 1, 2, 2, INK); l.set(12 + bx, hy, P.violet[4]); l.set(16 + bx, hy, P.violet[4]); l.set(14 + bx, hy + 1, B[1]);
  });
  p.layer((l) => {
    // Schwertarm
    let hx = 17 + bx, hy = 14 + bob - la, d: [number, number] = [0.5, -1];
    if (f === 4) { hx = 16; hy = 6; d = [-0.3, -1]; } if (f === 5) { hx = 19; hy = 13; d = [1, 0.3]; }
    l.line(15 + bx, 10 + bob, hx, hy, B[2]);
    const n = Math.hypot(d[0], d[1]);
    for (let s = 1; s <= 8; s += 0.5) { l.set(hx + (d[0] / n) * s, hy + (d[1] / n) * s, s > 6.5 ? P.tan[2] : P.steel[3]); }
    l.set(hx + (d[0] / n) * 3, hy + (d[1] / n) * 3, P.tan[1]); l.set(hx + (d[0] / n) * 5.5, hy + (d[1] / n) * 5.5, P.tan[2]);
    l.set(hx - d[1] / n, hy + d[0] / n, P.wood[2]); l.set(hx + d[1] / n, hy - d[0] / n, P.wood[2]); l.set(hx, hy, B[4]);
  });
};
const fluchgeist: MobFn = (p, f) => {
  const t = cyc(f), bob = [0, -1, -2, -1][t], bx = f === 5 ? 3 : f === 4 ? -1 : 0;
  const V = P.violet, cy = 9 + bob + (f === 4 ? -1 : 0);
  const g = new Px(p.w, p.h);
  g.layer((l) => {
    l.ball(12 + bx, cy, 6, 6, V, 1, 4);
    for (let x = 6; x <= 18; x++) {
      const len = 8 + Math.round(Math.sin((x + t * 2) * 1.3) * 2 + ((x * 7) % 3));
      for (let y = 0; y < len; y++) { const xx = x + bx - Math.round((y / len) * (f === 5 ? 3 : 1)); l.set(xx, cy + 2 + y, x < 9 ? V[3] : x > 15 ? V[1] : V[2]); }
    }
    l.px([8 + bx, cy + 4, 10 + bx, cy + 7, 14 + bx, cy + 6, 16 + bx, cy + 4], V[1]);
    // Gesicht
    l.rect(11 + bx, cy - 2, 2, 3, INK); l.rect(15 + bx, cy - 2, 2, 3, INK); l.set(11 + bx, cy - 1, P.pink[3]); l.set(15 + bx, cy - 1, P.pink[3]);
    if (f === 5) { l.rect(12 + bx, cy + 2, 4, 3, INK); l.set(13 + bx, cy + 2, P.pink[4]); } else l.rect(13 + bx, cy + 2, 2, 1 + (f === 4 ? 1 : 0), INK);
    // Klauenarme
    const ay = f === 4 ? cy - 6 : cy + 2, ax = f === 5 ? 21 + bx * 0 : f === 4 ? 19 : 19 + bx;
    l.line(17 + bx, cy + 1, ax, ay, V[3], 2); l.px([ax + 2, ay - 1, ax + 2, ay + 1, ax + 1, ay + 3], P.pink[4]);
    l.line(7 + bx, cy + 1, f === 4 ? 4 : 5 + bx, f === 4 ? cy - 5 : cy + 4, V[2], 2);
  });
  g.alphaMul(0.82);
  for (let y = 16; y < g.h; y++) for (let x = 0; x < g.w; x++) { const c = g.d[y * g.w + x]; if (c >>> 24) g.d[y * g.w + x] = alpha(c, Math.max(50, (c >>> 24) - (y - 15) * 22)); }
  p.draw(g);
};
const arkanauge: MobFn = (p, f) => {
  const t = cyc(f), bob = [0, -1, -1, 0][t], cx = 12, cy = 10 + bob;
  // Runenring hinten
  const ring = (front: boolean) => { for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + t * 0.35 + (f === 4 ? 0.4 : 0); const s = Math.sin(a); if ((s > 0) !== front) continue; const x = cx + Math.cos(a) * 10, y = cy + 1 + s * 3.4; p.set(x, y, f >= 4 ? WHITE : P.gold[i % 2 ? 3 : 4]); if (i % 2 === 0) p.set(x, y - 1, P.gold[2]); } };
  ring(false);
  p.layer((l) => {
    // Tentakel
    for (let i = 0; i < 3; i++) { const x0 = cx - 3 + i * 3; for (let y = 0; y < 7 - Math.abs(i - 1) * 1; y++) { l.set(x0 + Math.round(Math.sin((y + t * 1.5 + i) * 0.9) * 1.5), cy + 5 + y, y > 4 ? P.pink[2] : P.violet[2]); } }
    l.ball(cx, cy, 6.5, 6.5, P.bone, 2, 4);
    // Lid
    l.poly([[cx - 6.5, cy - 1], [cx - 4, cy - 6], [cx + 4, cy - 6], [cx + 6.5, cy - 1], [cx + 3, cy - 4 + (f === 4 ? 2 : 0)], [cx - 3, cy - 4 + (f === 4 ? 2 : 0)]], P.violet[2]);
    l.rect(cx - 3, cy - 6, 5, 1, P.violet[3]);
    // Iris
    const ix = cx + 2, ir = f === 4 ? 2.6 : 3.2;
    l.ball(ix, cy + 0.5, ir, ir, f >= 4 ? P.fire : P.teal, 1, 4);
    l.ell(ix + 0.5, cy + 0.5, f === 4 ? 0.8 : 1.4, f === 4 ? 2 : 1.6, INK); l.set(ix - 1, cy - 1, WHITE);
    l.set(cx - 4, cy + 2, P.red[3]); l.set(cx - 3, cy + 3, P.red[3]);
  });
  ring(true);
  if (f === 5) { for (let x = cx + 6; x < 24; x++) { p.set(x, cy, WHITE); p.blend(x, cy - 1, alpha(P.gold[4], 190)); p.blend(x, cy + 1, alpha(P.gold[3], 190)); } }
  if (f === 4) glow(p, cx + 2, cy, 6, P.fire[3], 70);
};
const schattenwandler: MobFn = (p, f) => {
  const t = cyc(f), sway = [0, 1, 0, -1][t], bx = f === 5 ? 3 : f === 4 ? -1 : 0;
  const S = P.shadow;
  p.layer((l) => {
    // Unterkörper läuft in Schwaden aus
    for (let y = 0; y < 10; y++) { const w = 3 - y * 0.25, x = 12 + bx * (1 - y / 10) + Math.sin((y + t * 1.5) * 0.9) * (y / 5); l.rect(Math.round(x - w), 12 + y, Math.max(1, Math.round(w * 2)), 1, y > 6 ? S[2] : S[3]); }
    l.px([9 + sway, 21, 14 - sway, 22, 11, 22], S[2]);
    // Torso
    l.poly([[9 + bx, 8], [16 + bx, 8], [14 + bx, 14], [10 + bx, 14]], S[3]); l.rect(9 + bx, 8, 2, 3, S[4]); l.rect(14 + bx, 9, 2, 4, S[2]);
    l.rect(11 + bx, 10, 3, 1, P.violet[2]); l.set(12 + bx, 11, P.violet[3]);
    // Kopf mit Hörnern
    l.ball(13 + bx, 5, 3.4, 3.4, S, 2, 4);
    l.line(10 + bx, 3, 8 + bx, 0, S[3]); l.line(15 + bx, 2, 17 + bx, 0, S[4]);
    l.rect(12 + bx, 4, 2, 2, WHITE); l.rect(15 + bx, 4, 2, 2, WHITE); l.set(12 + bx, 6, S[1]);
    // hinterer Arm
    l.line(9 + bx, 9, 6 + bx - sway, 16, S[2], 2); l.px([5 + bx - sway, 18, 6 + bx - sway, 19, 7 + bx - sway, 18], S[4]);
  });
  p.layer((l) => {
    // Klauenarm vorne
    let hx = 18 + bx + sway, hy = 16, mx = 18 + bx, my = 12;
    if (f === 4) { hx = 20; hy = 3; mx = 18; my = 8; } if (f === 5) { hx = 22; hy = 14; mx = 19; my = 10; }
    l.line(15 + bx, 9, mx, my, S[3], 2); l.line(mx, my, hx, hy, S[3], 2);
    const d = f === 4 ? -1 : 1;
    l.line(hx, hy + d, hx - 1, hy + d * 4, WHITE); l.line(hx + 1, hy + d, hx + 1, hy + d * 4, WHITE); l.line(hx + 2, hy, hx + 3, hy + d * 3, P.violet[4]);
  });
  if (f === 5) { for (let i = 0; i < 6; i++) p.blend(17 + i, 6 + i * 2, alpha(WHITE, 200 - i * 20)); }
};
const leerenbrut: MobFn = (p, f) => {
  const t = cyc(f), pu = SQ[t], S = P.shadow, c = f === 4 ? -1 : 0, bx = f === 5 ? 1 : 0;
  p.layer((l) => {
    // Tentakel unten
    for (let i = 0; i < 4; i++) { const x0 = 6 + i * 4 + bx; for (let y = 0; y < 5; y++) l.set(x0 + Math.round(Math.sin((y + t * 1.5 + i * 2) * 1.1)), 17 + y, y > 2 ? P.violet[1] : S[3]); }
    l.ball(12 + bx, 12, 8 + pu * 0.5 + c, 7 - pu * 0.5 + c, S, 1, 4);
    l.ball(6 + bx - c, 10 + pu, 3.5 + c, 3.5 + c, S, 2, 4); l.ball(18 + bx + c, 9 - pu, 3.5 + c, 4 + c, S, 1, 3); l.ball(10 + bx, 5 - c, 3.5, 3, S, 2, 4); l.ball(16 + bx, 16, 4, 3, S, 1, 3);
    l.px([8 + bx, 15, 14 + bx, 6, 20 + bx, 13], P.violet[2]);
    // Augen
    const E = (x: number, y: number, s: number) => { l.rrect(x + bx, y, s + 1, s, WHITE); l.rect(x + bx + (s > 2 ? 2 : 1), y + (s > 2 ? 1 : 0), s > 2 ? 2 : 1, s > 2 ? 2 : 1, f >= 4 ? P.red[2] : P.pink[2]); if (s > 2) l.set(x + bx + 3, y + 2, INK); };
    E(11, 9, 4); E(5, 9, 2); E(17, 7, 3); E(9, 4, 2); E(15, 14, 2); E(8, 14, 2);
  });
  if (f === 4) { p.set(2, 5, P.pink[3]); p.set(21, 3, P.pink[3]); p.set(22, 17, P.pink[3]); }
  if (f === 5) p.layer((l) => { l.line(19, 12, 23, 11, S[3], 2); l.line(18, 15, 23, 17, S[3], 1); l.set(23, 10, P.pink[4]); l.set(23, 17, P.pink[4]); });
};
const schneebrute: MobFn = (p, f) => {
  const t = cyc(f), bob = t === 1 || t === 2 ? 1 : 0, sw = [1, 0, -1, 0][t];
  const atk = f === 4 ? 1 : f === 5 ? 2 : 0, by = bob + (atk === 2 ? 2 : atk === 1 ? -1 : 0);
  const W = P.snow, B = P.ice;
  const fur = (l: Px, cx: number, cy: number, rx: number, ry: number) => {
    l.ball(cx, cy, rx, ry, W, 0, 4);
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2 + 0.2; const x = cx + Math.cos(a) * rx * 0.95, y = cy + Math.sin(a) * ry * 0.95; l.ell(x, y, 1.6, 1.6, W[Math.sin(a) > 0.3 ? (Math.cos(a) > 0 ? 0 : 1) : Math.cos(a) < 0 ? 4 : 3]); }
  };
  p.layer((l) => {
    l.rrect(9 - sw, 25, 6, 5, W[1]); l.rrect(18 + sw, 25, 6, 5, W[2]); l.rect(9 - sw, 29, 6, 1, B[0]); l.rect(18 + sw, 29, 6, 1, B[0]);
    // hinterer Arm
    if (atk === 1) { l.ball(5, 8 + by, 3.5, 5, W, 0, 2); l.ball(4, 3 + by, 3.4, 3.2, B, 0, 2); } else { l.ball(5, 17 + by + sw, 3.5, 5.5, W, 0, 2); l.ball(4.5, 24 + by + sw, 3.4, 3.2, B, 0, 2); }
  });
  p.layer((l) => {
    fur(l, 16, 17 + by, 10, 9.5);
    fur(l, 17, 8 + by, 6.5, 5.5);
    // Zotteln
    for (const [x, y] of [[10, 14], [13, 19], [19, 21], [22, 15], [15, 23], [9, 20]] as const) { l.set(x, y + by, W[1]); l.set(x, y + 1 + by, W[1]); l.set(x + 1, y + 1 + by, W[2]); }
    l.rect(13, 16 + by, 6, 1, W[4]); l.rect(12, 17 + by, 4, 1, W[4]);
    // Gesicht
    l.rrect(14, 6 + by, 8, 6, B[1]); l.rect(15, 6 + by, 6, 1, B[2]); l.rect(15, 8 + by, 2, 2, WHITE); l.rect(19, 8 + by, 2, 2, WHITE); l.set(16, 9 + by, INK); l.set(20, 9 + by, INK); l.rect(14, 7 + by, 3, 1, B[0]); l.rect(19, 7 + by, 3, 1, B[0]);
    if (atk) { l.rect(16, 10 + by, 4, 2, INK); l.set(16, 10 + by, WHITE); l.set(19, 10 + by, WHITE); } else l.rect(16, 11 + by, 4, 1, B[0]);
    l.poly([[11, 5 + by], [10, 0 + by], [14, 4 + by]], P.bone[3]); l.poly([[21, 4 + by], [24, 0 + by], [23, 5 + by]], P.bone[4]);
  });
  p.layer((l) => {
    if (atk === 1) { l.ball(27, 8 + by, 3.6, 5, W, 1, 4); l.ball(28, 3 + by, 3.6, 3.4, B, 1, 3); }
    else if (atk === 2) { l.ball(27, 19, 3.6, 5.5, W, 1, 4); l.ball(28, 26, 3.8, 3.6, B, 1, 3); }
    else { l.ball(27, 17 + by - sw, 3.6, 5.5, W, 1, 4); l.ball(27.5, 24 + by - sw, 3.6, 3.4, B, 1, 3); l.set(29, 26 + by - sw, WHITE); }
  });
  if (atk === 2) for (const [x, y] of [[23, 30], [31, 29], [25, 28], [31, 24]] as const) p.set(x, y, WHITE);
};
const nachtmahr: MobFn = (p, f) => {
  const t = cyc(f), S = P.shadow, V = P.violet;
  const rear = f === 4, bx = f === 5 ? 3 : 0, by = f === 5 ? 1 : rear ? -1 : (t & 1);
  const lf = rear ? [0, 0, 1, -1] : f === 5 ? [4, 3, -3, -2] : [[3, -2, -3, 2], [1, 0, -1, 0], [-3, 2, 3, -2], [-1, 0, 1, 0]][t];
  const flame = (l: Px, x: number, y: number, h: number, ph: number) => { const hh = h + ((t + ph) & 1); l.poly([[x - 2, y + 1], [x - 0.5 - ((t + ph) % 3 === 0 ? 1 : 0), y - hh], [x + 2, y + 1]], V[3]); l.line(x, y, x, y - hh + 2, V[4]); l.set(x, y, WHITE); };
  p.layer((l) => {
    const X = (x: number) => x + bx, Y = (y: number) => y + by;
    const fy = (x: number) => (rear && x > 16 ? -7 : 0);
    // hintere Beine
    l.line(X(9), Y(19), X(8) + lf[3], 29, S[1], 2); l.line(X(21), Y(19) + fy(21), X(22) + lf[1] + (rear ? 4 : 0), 29 + fy(21) * 1.2, S[1], 2);
    // Schweif-Flamme
    for (let i = 0; i < 4; i++) flame(l, X(5 - i * 1.3), Y(15 + i * 2.2), 3, i);
    // Rumpf
    if (rear) { l.poly([[X(7), Y(16)], [X(20), Y(9)], [X(24), Y(15)], [X(12), Y(23)], [X(7), Y(22)]], S[2]); l.line(X(8), Y(16), X(20), Y(10), S[3]); l.line(X(12), Y(22), X(23), Y(15), S[1]); }
    else { l.ball(X(14), Y(18), 8.5, 4.6, S, 1, 3); l.ball(X(20), Y(17), 4.5, 5, S, 1, 4); }
    // vordere Beine
    const leg = (x: number, d: number, ry: number) => { l.line(X(x), Y(20) + ry, X(x) + d, 28 + ry * 1.3, S[2], 2); l.rect(X(x) + d, 29 + ry * 1.3, 3, 1, V[3]); };
    leg(11, lf[2], 0); leg(23, lf[0] + (rear ? 3 : 0), fy(23));
    // Hals + Kopf
    const nx = rear ? 22 : 23, ny = rear ? 3 : 8;
    l.poly([[X(19), Y(15) + fy(19)], [X(nx - 1), Y(ny)], [X(nx + 3), Y(ny + 2)], [X(24), Y(17) + fy(24)]], S[3]);
    l.ball(X(nx + 3), Y(ny + 1), 3, 2.8, S, 2, 4); l.rrect(X(nx + 4), Y(ny + 1), 5, 4, S[3]); l.rect(X(nx + 5), Y(ny + 1), 3, 1, S[4]); l.set(X(nx + 8), Y(ny + 3), V[3]);
    l.poly([[X(nx + 1), Y(ny - 1)], [X(nx + 1.5), Y(ny - 5)], [X(nx + 3.5), Y(ny - 1)]], S[3]);
    l.rect(X(nx + 3), Y(ny + 1), 2, 1, P.pink[4]); l.set(X(nx + 4), Y(ny + 1), WHITE);
    if (f === 5) { l.rect(X(nx + 5), Y(ny + 5), 3, 1, S[2]); l.set(X(nx + 6), Y(ny + 4), P.pink[3]); }
    // Mähnen-Flammen
    for (let i = 0; i < 5; i++) { const k = i / 4; flame(l, X(19 + (nx - 19) * k - 1), Y(14 + fy(19) + (ny - 14 - fy(19)) * k), 4, i); }
  });
  glow(p, 24 + bx, 8 + by, 5, V[3], 40);
};
const hohlritter: MobFn = (p, f) => {
  const t = cyc(f), bob = [0, 1, 1, 0][t], sw = [1, 0, -1, 0][t], A = P.ash, V = P.violet;
  const atk = f === 4 ? 1 : f === 5 ? 2 : 0, bx = atk === 2 ? 2 : atk === 1 ? -1 : 0;
  const vg = V[atk ? 4 : 3];
  // Leuchten aus den Fugen
  glow(p, 16 + bx, 15 + bob, 7, V[2], 80);
  p.layer((l) => {
    // zerfetzter Umhang
    l.poly([[9 + bx, 10 + bob], [5 + bx - sw, 27], [12 + bx, 25], [22 + bx, 10 + bob]], P.shadow[2]);
    for (let x = 5; x < 12; x++) l.rect(x + bx - sw, 25 + ((x * 3) % 4), 1, 3, P.shadow[(x & 1) + 1]);
    // Stiefel (schweben getrennt)
    l.rrect(10 + bx - sw, 25, 5, 5, A[3]); l.rect(10 + bx - sw, 29, 6, 1, A[1]); l.rect(11 + bx - sw, 25, 2, 1, A[4]);
    l.rrect(18 + bx + sw, 25, 5, 5, A[2]); l.rect(18 + bx + sw, 29, 6, 1, A[1]);
    l.rect(11 + bx - sw, 23, 3, 1, vg); l.rect(19 + bx + sw, 23, 3, 1, V[2]);
  });
  p.layer((l) => {
    // Brustpanzer
    l.rrect(10 + bx, 11 + bob, 13, 10, A[3]); l.rect(11 + bx, 11 + bob, 11, 1, A[4]); l.rect(10 + bx, 12 + bob, 2, 7, A[4]); l.rect(19 + bx, 13 + bob, 4, 8, A[2]); l.rect(11 + bx, 20 + bob, 11, 1, A[1]);
    l.rect(15 + bx, 13 + bob, 3, 5, P.shadow[0]); l.rect(16 + bx, 14 + bob, 1, 3, vg); l.set(16 + bx, 15 + bob, WHITE); l.rect(12 + bx, 21 + bob, 9, 1, V[2]);
    // Schulterplatten
    l.ball(9 + bx, 11 + bob, 4, 3.4, A, 2, 4); l.ball(24 + bx, 11 + bob, 4, 3.4, A, 1, 3); l.poly([[5 + bx, 10 + bob], [4 + bx, 6 + bob], [8 + bx, 9 + bob]], A[4]); l.poly([[25 + bx, 9 + bob], [29 + bx, 6 + bob], [28 + bx, 10 + bob]], A[3]);
    // Helm
    l.rrect(12 + bx, 2 + bob, 10, 8, A[3]); l.rect(13 + bx, 2 + bob, 8, 1, A[4]); l.rect(12 + bx, 3 + bob, 2, 5, A[4]); l.rect(19 + bx, 4 + bob, 3, 6, A[2]);
    l.rect(14 + bx, 5 + bob, 7, 2, P.shadow[0]); l.rect(15 + bx, 5 + bob, 2, 2, vg); l.rect(19 + bx, 5 + bob, 2, 2, vg); l.rect(17 + bx, 7 + bob, 1, 3, P.shadow[0]);
    l.poly([[15 + bx, 2 + bob], [17 + bx, -2 + bob], [19 + bx, 2 + bob]], V[2]); l.set(17 + bx, 0 + bob, V[4]);
    l.rect(15 + bx, 10 + bob, 4, 1, vg);
    // linker Handschuh
    l.ball(6 + bx, 19 + bob + sw, 2.8, 2.8, A, 1, 3);
  });
  p.layer((l) => {
    let hx = 26 + bx, hy = 19 + bob - sw, d: [number, number] = [0.25, -1];
    if (atk === 1) { hx = 25; hy = 8; d = [-0.4, -1]; } if (atk === 2) { hx = 26; hy = 20; d = [1, 0.5]; }
    const n = Math.hypot(d[0], d[1]), dx = d[0] / n, dy = d[1] / n;
    for (let s = 2; s <= 15; s += 0.5) { l.set(hx + dx * s, hy + dy * s, A[4]); l.set(hx + dx * s - dy, hy + dy * s + dx, A[2]); l.set(hx + dx * s + dy, hy + dy * s - dx, P.steel[3]); }
    for (let s = 4; s <= 13; s += 3) l.set(hx + dx * s, hy + dy * s, vg);
    for (let s = -3; s <= 3; s++) l.set(hx + dx * 2 - dy * s, hy + dy * 2 + dx * s, V[2]);
    l.ball(hx + 0.5, hy + 0.5, 2.8, 2.8, A, 1, 4);
  });
  if (atk === 2) for (let i = 0; i < 7; i++) p.blend(24 + i, 8 + i * 1.5, alpha(V[4], 220 - i * 22));
};

const DEFS: Record<(typeof MOB_IDS)[number], MobDef> = {
  moosling: { w: 24, h: 24, fn: moosling },
  dornkaefer: { w: 24, h: 24, fn: dornkaefer },
  pilzling: { w: 24, h: 24, fn: pilzling },
  waldwolf: { w: 32, h: 24, fn: (p, f) => wolf(p, f, P.steel, 'wald') },
  wurzelschleicher: { w: 24, h: 24, fn: wurzelschleicher },
  fledermaus: { w: 24, h: 24, fn: fledermaus },
  kristallkrabbler: { w: 24, h: 24, fn: kristallkrabbler },
  glimmerwisp: { w: 24, h: 24, fn: (p, f) => wisp(p, f, P.gold, false) },
  tropfschleim: { w: 24, h: 24, fn: tropfschleim },
  glutimp: { w: 24, h: 24, fn: (p, f) => imp(p, f, P.red, false) },
  aschenhund: { w: 32, h: 24, fn: (p, f) => wolf(p, f, [P.ash[0], P.ash[1], P.ash[2], P.ash[3], P.ash[4]], 'asche') },
  magmaschleim: { w: 24, h: 24, fn: magmaschleim },
  schlackengolem: { w: 32, h: 32, fn: (p, f) => golem(p, f, P.ash, P.fire, false) },
  frostwolf: { w: 32, h: 24, fn: (p, f) => wolf(p, f, P.snow, 'frost') },
  eiswicht: { w: 24, h: 24, fn: (p, f) => imp(p, f, P.blue, true) },
  schneebrute: { w: 32, h: 32, fn: schneebrute },
  frostwisp: { w: 24, h: 24, fn: (p, f) => wisp(p, f, P.ice, true) },
  runenwaechter: { w: 32, h: 32, fn: (p, f) => golem(p, f, P.stone, P.gold, true) },
  skelettkrieger: { w: 24, h: 24, fn: skelettkrieger },
  fluchgeist: { w: 24, h: 24, fn: fluchgeist },
  arkanauge: { w: 24, h: 24, fn: arkanauge },
  schattenwandler: { w: 24, h: 24, fn: schattenwandler },
  leerenbrut: { w: 24, h: 24, fn: leerenbrut },
  nachtmahr: { w: 32, h: 32, fn: nachtmahr },
  hohlritter: { w: 32, h: 32, fn: hohlritter },
};

export function buildMobs(): { mobs: Record<string, Sheet>; mobMeta: Record<string, SpriteMeta> } {
  const mobs: Record<string, Sheet> = {}, mobMeta: Record<string, SpriteMeta> = {};
  for (const id of MOB_IDS) {
    const d = DEFS[id], frames: Px[] = [];
    for (let f = 0; f < 7; f++) {
      const p = new Px(d.w, d.h);
      if (f === 6) { const q = new Px(d.w, d.h); d.fn(q, 0); q.tint(mix(WHITE, P.red[4], 0.2), 0.55); p.draw(q, -1, 0); }
      else d.fn(p, f);
      frames.push(p);
    }
    mobs[`mob_${id}`] = gridSheet(frames, 7);
    mobMeta[`mob_${id}`] = { w: d.w, h: d.h };
  }
  return { mobs, mobMeta };
}
