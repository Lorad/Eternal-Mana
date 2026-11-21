/** Chibi-Charaktere (24x32): ein parametrisches Rig für alle Klassen und NPCs. */
import { Px, gridSheet } from './draw';
import { P, Ramp, INK, WHITE, mix, alpha } from './palette';
import { CHAR_COLS, CHAR_FRAME_H, CHAR_FRAME_W, CLASS_IDS, NPC_LOOKS } from './spec';
import type { Sheet } from './spec';

type Weapon = 'sword' | 'staff' | 'bow' | 'hammer' | 'daggers' | 'spear' | 'book' | 'none';
type Hat = 'none' | 'band' | 'wizard' | 'hood' | 'guardhelm' | 'winghelm' | 'cap' | 'kerchief' | 'tropen' | 'floppy' | 'lamphelm' | 'furhood' | 'turban';
type Hair = 'short' | 'long' | 'bun' | 'spiky' | 'braid' | 'bald';

interface Look {
  skin: Ramp; hair: Ramp; hairStyle: Hair; hat: Hat; hatC: Ramp; hatTrim?: Ramp;
  top: Ramp; sleeve?: Ramp; legs: Ramp; boots: Ramp; trim: Ramp;
  chest?: 'plate' | 'vest' | 'apron' | 'sash' | 'tabard'; chestC?: Ramp;
  robe?: boolean; cape?: Ramp; scarf?: Ramp; beard?: Ramp; longBeard?: boolean;
  pauldron?: Ramp; backpack?: Ramp; bigPack?: boolean; quiver?: boolean; backBow?: boolean; glasses?: boolean; mask?: Ramp; bag?: Ramp;
  weapon: Weapon; gem?: Ramp; shield?: Ramp; wide?: boolean;
  small?: boolean; ghost?: boolean; glow?: boolean; npc?: boolean;
}

const dk = (r: Ramp): Ramp => [INK, r[0], r[1], r[2], r[3]];
const DTEAL: Ramp = [P.ash[0], P.ash[1], P.teal[0], P.teal[1], P.teal[2]];

const LOOKS: Record<string, Look> = {
  char_krieger: { skin: P.skin, hair: P.wood, hairStyle: 'spiky', hat: 'band', hatC: P.red, top: P.red, legs: P.steel, boots: P.wood, trim: P.gold,
    chest: 'plate', chestC: P.steel, pauldron: P.steel, cape: P.red, weapon: 'sword', shield: P.steel },
  char_magier: { skin: P.skin, hair: P.gold, hairStyle: 'long', hat: 'wizard', hatC: P.violet, hatTrim: P.gold, top: P.violet, legs: P.violet, boots: P.wood, trim: P.gold,
    chest: 'sash', chestC: P.blue, robe: true, weapon: 'staff', gem: P.blue },
  char_waldlaeufer: { skin: P.skinD, hair: P.wood, hairStyle: 'short', hat: 'hood', hatC: P.green, top: P.green, legs: P.tan, boots: P.wood, trim: P.tan,
    chest: 'vest', chestC: P.tan, cape: P.forest, quiver: true, weapon: 'bow' },
  char_paladin: { skin: P.skin, hair: P.gold, hairStyle: 'short', hat: 'winghelm', hatC: P.cream, hatTrim: P.gold, top: P.cream, legs: P.cream, boots: P.gold, trim: P.gold,
    chest: 'plate', chestC: P.cream, pauldron: P.gold, cape: P.blue, weapon: 'hammer' },
  char_schattenjaeger: { skin: P.skin, hair: P.snow, hairStyle: 'spiky', hat: 'none', hatC: P.teal, top: DTEAL, legs: P.ash, boots: P.ash, trim: P.teal,
    mask: DTEAL, scarf: P.pink, chest: 'sash', chestC: P.teal, weapon: 'daggers' },

  npc_aelteste: { skin: P.skin, hair: P.snow, hairStyle: 'bun', hat: 'none', hatC: P.green, top: P.forest, legs: P.forest, boots: P.wood, trim: P.gold, robe: true, chest: 'sash', chestC: P.green, weapon: 'staff', gem: P.green, npc: true },
  npc_schmied: { skin: P.skin, hair: P.wood, hairStyle: 'bald', hat: 'none', hatC: P.wood, top: P.stone, sleeve: P.skin, legs: P.wood, boots: P.ash, trim: P.wood, chest: 'apron', chestC: P.tan, beard: P.wood, wide: true, weapon: 'none', npc: true },
  npc_haendlerin: { skin: P.skinD, hair: P.ash, hairStyle: 'long', hat: 'kerchief', hatC: P.pink, hatTrim: P.gold, top: P.fire, legs: P.violet, boots: P.wood, trim: P.teal, robe: true, chest: 'sash', chestC: P.teal, weapon: 'none', npc: true },
  npc_gelehrter: { skin: P.skin, hair: P.stone, hairStyle: 'short', hat: 'none', hatC: P.blue, top: P.blue, legs: P.blue, boots: P.wood, trim: P.cream, robe: true, chest: 'sash', chestC: P.cream, glasses: true, weapon: 'book', npc: true },
  npc_kind: { skin: P.skin, hair: P.tan, hairStyle: 'short', hat: 'cap', hatC: P.red, top: P.blue, legs: P.tan, boots: P.wood, trim: P.wood, small: true, weapon: 'none', npc: true },
  npc_jaegerin: { skin: P.skin, hair: P.fire, hairStyle: 'braid', hat: 'none', hatC: P.tan, top: P.tan, legs: P.wood, boots: P.ash, trim: P.wood, chest: 'vest', chestC: P.wood, quiver: true, backBow: true, weapon: 'none', npc: true },
  npc_wache: { skin: P.skin, hair: P.wood, hairStyle: 'short', hat: 'guardhelm', hatC: P.steel, top: P.blue, legs: P.steel, boots: P.wood, trim: P.gold, chest: 'tabard', chestC: P.blue, pauldron: P.steel, weapon: 'spear', npc: true },
  npc_bergfrau: { skin: P.skinD, hair: P.fire, hairStyle: 'braid', hat: 'lamphelm', hatC: P.gold, top: P.stone, legs: P.wood, boots: P.ash, trim: P.tan, chest: 'apron', chestC: P.teal, wide: true, weapon: 'none', npc: true },
  npc_nomade: { skin: P.skinD, hair: P.ash, hairStyle: 'short', hat: 'turban', hatC: P.red, hatTrim: P.gold, top: P.gold, legs: P.red, boots: P.wood, trim: P.red, robe: true, chest: 'sash', chestC: P.red, mask: P.gold, weapon: 'none', npc: true },
  npc_einsiedler: { skin: P.skin, hair: P.stone, hairStyle: 'long', hat: 'none', hatC: P.tan, top: P.tan, legs: P.tan, boots: P.wood, trim: P.cream, robe: true, beard: P.bone, longBeard: true, chest: 'vest', chestC: P.cream, weapon: 'staff', npc: true },
  npc_fellhaendlerin: { skin: P.skin, hair: P.gold, hairStyle: 'short', hat: 'furhood', hatC: P.tan, hatTrim: P.cream, top: P.tan, legs: P.wood, boots: P.cream, trim: P.cream, chest: 'vest', chestC: P.cream, weapon: 'none', npc: true },
  npc_archaeologin: { skin: P.skinD, hair: P.wood, hairStyle: 'braid', hat: 'tropen', hatC: P.sand, hatTrim: P.wood, top: P.cream, legs: P.sand, boots: P.wood, trim: P.wood, bag: P.tan, weapon: 'none', npc: true },
  npc_geist: { skin: P.ice, hair: P.ice, hairStyle: 'long', hat: 'guardhelm', hatC: P.ice, top: P.blue, legs: P.blue, boots: P.blue, trim: P.ice, robe: true, chest: 'tabard', chestC: P.ice, pauldron: P.ice, weapon: 'spear', ghost: true, npc: true },
  npc_echo: { skin: P.cream, hair: P.gold, hairStyle: 'long', hat: 'none', hatC: P.gold, top: P.cream, legs: P.cream, boots: P.gold, trim: P.gold, robe: true, chest: 'sash', chestC: P.gold, glow: true, weapon: 'none', npc: true },
  npc_kraemer: { skin: P.skin, hair: P.tan, hairStyle: 'short', hat: 'floppy', hatC: P.forest, hatTrim: P.gold, top: P.sand, legs: P.wood, boots: P.ash, trim: P.wood, chest: 'vest', chestC: P.red, backpack: P.tan, bigPack: true, beard: P.tan, weapon: 'none', npc: true },
};

interface Pose {
  bob: number; lean: number; la: number; lb: number;
  hw: [number, number]; ho: [number, number];
  wd: [number, number]; wd2?: [number, number];
  pull?: number; noArrow?: boolean; face: 'n' | 'closed' | 'hurt' | 'happy';
  fxv?: number; wBehind?: boolean; armsUp?: boolean;
}

const mirrorX = (v: [number, number]): [number, number] => [23 - v[0], v[1]];
const mirrorD = (v: [number, number]): [number, number] => [-v[0], v[1]];

function carry(dir: number, w: Weapon): { hw: [number, number]; wd: [number, number]; wd2?: [number, number]; wBehind?: boolean } {
  if (dir === 1) {
    switch (w) {
      case 'sword': return { hw: [13, 22], wd: [1, -0.55] };
      case 'staff': return { hw: [18, 21], wd: [0, -1] };
      case 'spear': return { hw: [18, 21], wd: [0, -1] };
      case 'hammer': return { hw: [13, 21], wd: [-0.55, -1], wBehind: true };
      case 'daggers': return { hw: [14, 22], wd: [1, 0.25], wd2: [1, 0.25] };
      case 'bow': return { hw: [17, 21], wd: [1, 0] };
      case 'book': return { hw: [15, 20], wd: [1, 0] };
      default: return { hw: [12, 22], wd: [0, 1] };
    }
  }
  let r: { hw: [number, number]; wd: [number, number]; wd2?: [number, number]; wBehind?: boolean };
  switch (w) {
    case 'sword': r = { hw: [5, 22], wd: [-0.3, -1] }; break;
    case 'staff': r = { hw: [4, 21], wd: [0, -1] }; break;
    case 'spear': r = { hw: [4, 21], wd: [0, -1] }; break;
    case 'hammer': r = { hw: [5, 21], wd: [-0.25, -1] }; break;
    case 'daggers': r = { hw: [5, 22], wd: [-0.5, 1], wd2: [0.5, 1] }; break;
    case 'bow': r = { hw: [5, 21], wd: [-1, 0] }; break;
    case 'book': r = { hw: [9, 21], wd: [1, 0] }; break;
    default: r = { hw: [6, 22], wd: [0, 1] };
  }
  if (dir === 2) { r.hw = mirrorX(r.hw); r.wd = mirrorD(r.wd); if (r.wd2) r.wd2 = mirrorD(r.wd2); }
  return r;
}

function poseFor(dir: number, col: number, L: Look): Pose {
  const w = L.weapon, c = carry(dir, w);
  const ho0: [number, number] = dir === 1 ? [10, 22] : dir === 0 ? [17, 22] : [6, 22];
  const ps: Pose = { bob: 0, lean: 0, la: 0, lb: 0, hw: [c.hw[0], c.hw[1]], ho: ho0, wd: c.wd, wd2: c.wd2, face: 'n', wBehind: c.wBehind };
  const M = (v: [number, number]) => (dir === 2 ? mirrorX(v) : v);
  const D = (v: [number, number]) => (dir === 2 ? mirrorD(v) : v);
  if (col === 1) ps.bob = 1;
  else if (col >= 2 && col <= 5) {
    const k = col - 2;
    ps.la = k === 0 ? 1 : k === 2 ? -1 : 0; ps.lb = -ps.la;
    ps.bob = k % 2 === 0 ? 1 : 0;
    if (dir === 1) { ps.hw[0] -= ps.la; ps.ho[0] += ps.la * 2; } else { ps.hw[1] -= ps.la; ps.ho[1] += ps.la; }
  } else if (col >= 6 && col <= 8 && !L.npc) {
    const k = col - 6;
    if (w === 'bow') {
      if (dir === 1) { ps.hw = [17, 20]; ps.wd = [1, 0]; ps.ho = [11 + (k ? 3 : 0), 20]; }
      else if (dir === 0) { ps.hw = [12, 24]; ps.wd = [0, 1]; ps.ho = [14, 21]; }
      else { ps.hw = [16, 13]; ps.wd = [0, -1]; ps.ho = [13, 17]; }
      ps.pull = k === 0 ? 1 : 0; ps.noArrow = k > 0; ps.lean = k === 1 && dir === 1 ? -1 : 0; ps.bob = k === 0 ? 0 : 1;
    } else if (w === 'daggers') {
      if (dir === 1) {
        if (k === 0) { ps.hw = [9, 16]; ps.wd = [-0.5, -1]; ps.ho = [14, 17]; ps.wd2 = [0.5, -1]; ps.lean = -1; }
        else if (k === 1) { ps.hw = [17, 19]; ps.wd = [1, 0]; ps.ho = [15, 23]; ps.wd2 = [1, 0.2]; ps.lean = 1; ps.la = 1; ps.lb = -1; }
        else { ps.hw = [15, 24]; ps.wd = [0.7, 0.7]; ps.ho = [8, 21]; ps.wd2 = [-1, 0.3]; ps.lean = 1; ps.la = 1; ps.lb = -1; }
      } else {
        if (k === 0) { ps.hw = M([4, 15]); ps.wd = D([-0.3, -1]); ps.ho = M([19, 15]); ps.wd2 = D([0.3, -1]); }
        else if (k === 1) { ps.hw = M([9, 22]); ps.wd = D([1, dir === 0 ? 0.6 : -0.6]); ps.ho = M([14, 22]); ps.wd2 = D([-1, dir === 0 ? 0.6 : -0.6]); ps.bob = 1; }
        else { ps.hw = M([4, 23]); ps.wd = D([-1, 0.4]); ps.ho = M([19, 23]); ps.wd2 = D([1, 0.4]); ps.bob = 1; }
      }
    } else {
      if (dir === 1) {
        if (k === 0) { ps.hw = [9, 15]; ps.wd = [-0.6, -1]; ps.lean = -1; ps.wBehind = false; }
        else if (k === 1) { ps.hw = [16, 20]; ps.wd = [1, 0.1]; ps.lean = 1; ps.la = 1; ps.lb = -1; ps.wBehind = false; }
        else { ps.hw = [15, 24]; ps.wd = [0.8, 0.7]; ps.lean = 1; ps.la = 1; ps.lb = -1; ps.bob = 1; ps.wBehind = false; }
      } else if (dir === 0) {
        if (k === 0) { ps.hw = [4, 14]; ps.wd = [-0.15, -1]; }
        else if (k === 1) { ps.hw = [7, 23]; ps.wd = [1, 0.45]; ps.bob = 1; ps.la = 1; }
        else { ps.hw = [15, 24]; ps.wd = [1, 0.1]; ps.bob = 1; ps.la = 1; }
      } else {
        if (k === 0) { ps.hw = [19, 18]; ps.wd = [1, -0.5]; }
        else if (k === 1) { ps.hw = [18, 13]; ps.wd = [-0.35, -1]; ps.bob = 0; ps.la = 1; }
        else { ps.hw = [6, 15]; ps.wd = [-1, -0.5]; ps.la = 1; }
      }
      if (w === 'staff' && k === 1) ps.fxv = 1;
    }
  } else if (col === 9 || col === 10) {
    const u = col === 10 ? 2 : 0;
    ps.armsUp = true;
    if (dir === 1) { ps.hw = [16, 15 - u]; ps.ho = [14, 16 - u]; ps.wd = [0.3, -1]; ps.wd2 = [0.3, -1]; }
    else { ps.hw = M([4, 14 - u]); ps.ho = M([19, 14 - u]); ps.wd = D([-0.1, -1]); ps.wd2 = D([0.1, -1]); }
    ps.fxv = col === 10 ? 2 : 1; ps.bob = col === 10 ? 0 : 1; ps.wBehind = false;
  } else if (col === 11) {
    ps.face = 'hurt'; ps.lean = dir === 1 ? -1 : 0; ps.bob = 1;
    if (dir === 1) { ps.hw = [8, 19]; ps.ho = [7, 21]; } else { ps.hw = M([3, 19]); ps.ho = M([20, 19]); }
    ps.la = -1;
  }
  return ps;
}

// ---------------------------------------------------------------- Waffen
function drawWeapon(l: Px, kind: Weapon, hx: number, hy: number, d: [number, number], L: Look, pull = 0, noArrow = false): void {
  const n = Math.hypot(d[0], d[1]) || 1, dx = d[0] / n, dy = d[1] / n, qx = -dy, qy = dx;
  const at = (t: number, s = 0): [number, number] => [Math.round(hx + dx * t + qx * s), Math.round(hy + dy * t + qy * s)];
  const dot = (t: number, s: number, c: number) => { const p = at(t, s); l.set(p[0], p[1], c); };
  const seg = (t0: number, t1: number, s: number, c: number) => { for (let t = t0; t <= t1; t += 0.5) dot(t, s, c); };
  // Schattenseite der Klinge = die, die eher unten/rechts liegt
  const sh = qx + qy > 0 ? 1 : -1;
  switch (kind) {
    case 'sword':
      seg(-2, 1, 0, P.wood[2]); dot(-2.5, 0, P.gold[3]);
      seg(2.5, 11, 0, P.steel[4]); seg(2.5, 10, sh, P.steel[2]); dot(11.6, 0, P.steel[4]);
      seg(1.5, 2, -2, P.gold[3]); seg(1.5, 2, 2, P.gold[2]); seg(1.5, 2, -1, P.gold[3]); seg(1.5, 2, 1, P.gold[2]); seg(1.5, 2, 0, P.gold[4]);
      break;
    case 'daggers':
      seg(-1, 0.5, 0, P.wood[1]); seg(1, 1.5, -1, P.teal[3]); seg(1, 1.5, 1, P.teal[2]); seg(1, 1.5, 0, P.teal[3]);
      seg(2, 6, 0, P.steel[4]); seg(2, 4.5, sh, P.steel[2]);
      break;
    case 'staff': {
      seg(-7, 9, 0, P.wood[3]);
      const g = L.gem ?? P.cream, c = at(11.5);
      l.ball(c[0] + 0.5, c[1] + 0.5, 2.4, 2.4, g, 1, 4);
      l.set(c[0] - 1, c[1] - 1, WHITE);
      dot(9.5, -1.6, P.gold[3]); dot(9.5, 1.6, P.gold[2]); dot(9, 0, P.gold[3]);
      break;
    }
    case 'spear':
      seg(-9, 11, 0, P.wood[3]); seg(11.5, 15, 0, P.steel[4]); seg(11.5, 13, 1, P.steel[2]); seg(11.5, 13, -1, P.steel[3]); dot(11, 0, P.gold[3]);
      break;
    case 'hammer': {
      seg(-4, 7, 0, P.wood[3]); dot(-4.5, 0, P.gold[3]);
      const a = at(7.5, -4), b = at(7.5, 4), c2 = at(12, 4), e = at(12, -4);
      l.poly([a, b, c2, e].map((p) => [p[0] + 0.5, p[1] + 0.5] as const), P.steel[3]);
      const c = at(9.75);
      l.rect(c[0] - 2, c[1] - 2, 5, 5, P.steel[3]);
      for (let s = -3.5; s <= 3.5; s += 0.5) { dot(7.5, s, P.steel[4]); dot(12, s, P.steel[2]); }
      seg(8, 11.5, 0, P.gold[3]); seg(8, 11.5, sh * 3.6, P.steel[2]); seg(8, 11.5, -sh * 3.6, P.steel[4]);
      break;
    }
    case 'bow': {
      for (let s = -7; s <= 7; s += 0.5) {
        const k = s / 7, f = 3 * (1 - k * k) - 1;
        dot(f, s, Math.abs(s) > 5.5 ? P.wood[4] : P.wood[3]);
      }
      for (let s = -6.5; s <= 6.5; s += 0.5) dot(-1 - pull * 3 * (1 - Math.abs(s) / 6.5), s, P.cream[3]);
      dot(0.5, 0, P.tan[3]); dot(1.5, 0, P.tan[2]);
      if (!noArrow && pull > 0) { seg(-3.5, 6, 0, P.tan[4]); dot(7, 0, P.steel[4]); dot(6.5, 0, P.steel[4]); dot(-4, 0.9, P.red[3]); dot(-4, -0.9, P.red[3]); }
      break;
    }
    case 'book': {
      const c = at(1);
      l.rect(c[0] - 2, c[1] - 2, 6, 5, P.red[2]); l.rect(c[0] - 1, c[1] - 1, 4, 3, P.cream[4]); l.rect(c[0] + 1, c[1] - 2, 1, 5, P.red[1]);
      l.rect(c[0] - 1, c[1], 1, 1, P.cream[2]); l.rect(c[0] + 2, c[1], 1, 1, P.cream[2]);
      break;
    }
    default: break;
  }
}

const HEAD_ROWS: Array<[number, number, number]> = [[4, 8, 15], [5, 7, 16], [6, 6, 17], [7, 6, 17], [8, 6, 17], [9, 6, 17], [10, 6, 17], [11, 6, 17], [12, 6, 17], [13, 6, 17], [14, 7, 16], [15, 8, 15]];

function drawHead(h: Px, L: Look, dir: number, ox: number, oy: number, face: Pose['face']): void {
  const S = (x: number, y: number, c: number) => h.set(x + ox, y + oy, c);
  const R = (x: number, y: number, w: number, hh: number, c: number) => h.rect(x + ox, y + oy, w, hh, c);
  const sk = L.skin, hr = L.hair, hc = L.hatC, ht = L.hatTrim ?? L.trim;
  const side = dir === 1, back = dir === 2;
  // Schädelform
  for (const [y, x0, x1] of HEAD_ROWS) R(x0, y, x1 - x0 + 1, 1, back ? hr[2] : sk[3]);
  const bald = L.hairStyle === 'bald';
  if (!back) {
    // Hautschattierung
    if (!side) { R(16, 10, 2, 4, sk[2]); R(15, 14, 2, 1, sk[2]); R(9, 15, 6, 1, sk[2]); R(6, 9, 1, 3, sk[4]); }
    else { R(8, 14, 6, 2, sk[2]); R(7, 10, 5, 4, sk[2]); S(11, 11, sk[1]); S(11, 12, sk[2]); }
    // Haare
    if (!bald) {
      if (!side) {
        R(8, 4, 8, 1, hr[2]); R(7, 5, 10, 1, hr[2]); R(6, 6, 12, 3, hr[2]);
        R(6, 9, 2, 1, hr[2]); R(16, 9, 2, 1, hr[1]); R(6, 10, 1, 2, hr[2]); R(17, 10, 1, 2, hr[1]);
        R(10, 9, 1, 1, hr[2]); R(13, 9, 2, 1, hr[1]);
        R(8, 5, 4, 1, hr[3]); R(7, 6, 3, 1, hr[3]); R(14, 7, 4, 2, hr[1]); S(11, 6, hr[4]);
      } else {
        R(8, 4, 8, 1, hr[2]); R(7, 5, 10, 1, hr[2]); R(6, 6, 12, 3, hr[2]); R(6, 9, 6, 3, hr[2]); R(6, 12, 4, 2, hr[1]); R(7, 14, 2, 1, hr[1]);
        R(12, 9, 2, 1, hr[2]); R(16, 9, 2, 1, hr[1]); R(6, 9, 2, 4, hr[1]);
        R(9, 5, 4, 1, hr[3]); R(8, 6, 3, 1, hr[3]); S(12, 6, hr[4]);
      }
    } else if (!side) { R(8, 4, 8, 1, sk[4]); R(7, 5, 5, 1, sk[4]); R(6, 8, 1, 3, hr[2]); R(17, 8, 1, 3, hr[1]); }
    else { R(8, 4, 6, 1, sk[4]); R(6, 8, 3, 4, hr[1]); }
    // Gesicht
    const ey = 11;
    const eyes: number[] = side ? [15] : [9, 14];
    for (const ex of eyes) {
      if (face === 'n') { S(ex, ey, INK); S(ex, ey + 1, INK); S(ex, ey - 1, mix(sk[2], INK, 0.25)); }
      else if (face === 'closed') { S(ex, ey + 1, INK); S(ex + (ex < 12 ? -1 : 1) * (side ? 0 : 0), ey + 1, INK); S(ex - 1, ey + 1, sk[1]); S(ex + 1, ey + 1, sk[1]); }
      else if (face === 'happy') { S(ex, ey, INK); S(ex - 1, ey + 1, INK); S(ex + 1, ey + 1, INK); }
      else { S(ex - 1, ey, INK); S(ex, ey + 1, INK); S(ex + 1, ey, INK); S(ex, ey, sk[3]); }
    }
    if (!side) { S(8, 13, mix(sk[2], P.red[3], 0.5)); S(15, 13, mix(sk[2], P.red[3], 0.5)); if (face === 'hurt' || face === 'happy') R(11, 14, 2, 1, face === 'happy' ? P.red[1] : sk[0]); }
    else { S(16, 13, mix(sk[2], P.red[3], 0.5)); if (face === 'hurt' || face === 'happy') S(16, 14, sk[0]); }
    if (L.glasses) {
      if (!side) { for (const gx of [8, 10, 13, 15]) S(gx, 11, P.ice[4]); R(11, 11, 2, 1, P.steel[2]); S(8, 12, P.ice[3]); S(15, 12, P.ice[3]); }
      else { S(14, 11, P.ice[4]); S(16, 11, P.ice[4]); R(11, 11, 3, 1, P.steel[2]); }
    }
    if (L.mask) {
      const m = L.mask;
      if (!side) { R(6, 13, 12, 1, m[3]); R(7, 14, 10, 1, m[2]); R(8, 15, 8, 1, m[2]); R(13, 14, 3, 1, m[1]); S(11, 13, m[4]); }
      else { R(11, 13, 7, 1, m[3]); R(11, 14, 6, 1, m[2]); R(11, 15, 5, 1, m[1]); }
    }
    if (L.beard) {
      const b = L.beard;
      if (!side) {
        R(6, 12, 1, 2, b[2]); R(17, 12, 1, 2, b[1]); R(7, 13, 2, 2, b[2]); R(15, 13, 2, 2, b[1]); R(8, 14, 8, 2, b[2]); R(9, 16, 6, 1, b[2]); R(11, 13, 2, 1, b[3]); R(13, 15, 3, 1, b[1]);
        if (L.longBeard) { R(9, 16, 6, 3, b[2]); R(10, 19, 4, 2, b[2]); R(11, 21, 2, 1, b[1]); R(9, 16, 2, 3, b[3]); R(13, 17, 2, 2, b[1]); }
      } else {
        R(12, 13, 6, 3, b[2]); R(13, 16, 4, 1, b[2]); R(12, 13, 2, 2, b[1]); S(17, 13, b[3]);
        if (L.longBeard) { R(13, 16, 5, 3, b[2]); R(14, 19, 3, 2, b[1]); S(17, 17, b[3]); }
      }
    }
  } else {
    // Hinterkopf
    R(15, 6, 2, 8, hr[1]); R(8, 14, 8, 1, hr[1]); R(8, 5, 4, 1, hr[3]); R(7, 6, 3, 2, hr[3]); S(10, 8, hr[3]);
    if (L.hairStyle !== 'long' && !bald) { R(9, 15, 6, 1, sk[2]); }
    if (bald) { for (const [y, x0, x1] of HEAD_ROWS) if (y < 10) R(x0, y, x1 - x0 + 1, 1, sk[3]); R(8, 4, 5, 1, sk[4]); R(14, 6, 3, 4, sk[2]); R(9, 15, 6, 1, sk[2]); }
  }
  // Frisuren-Extras
  switch (L.hairStyle) {
    case 'spiky':
      if (L.hat === 'none' || L.hat === 'band') {
        if (side) { h.px([8 + ox, 3 + oy, 9 + ox, 3 + oy, 12 + ox, 3 + oy, 13 + ox, 2 + oy, 13 + ox, 3 + oy, 5 + ox, 7 + oy, 5 + ox, 10 + oy, 4 + ox, 6 + oy], hr[2]); S(16, 3, hr[2]); S(17, 4, hr[2]); S(18, 9, hr[1]); }
        else { h.px([7 + ox, 3 + oy, 8 + ox, 3 + oy, 11 + ox, 2 + oy, 11 + ox, 3 + oy, 12 + ox, 3 + oy, 15 + ox, 3 + oy, 16 + ox, 2 + oy, 16 + ox, 4 + oy, 5 + ox, 6 + oy, 5 + ox, 9 + oy, 18 + ox, 7 + oy], hr[2]); S(18, 10, hr[1]); S(11, 2, hr[3]); if (!back) { S(9, 9, hr[2]); S(12, 9, hr[2]); S(12, 10, hr[2]); } }
      }
      break;
    case 'long':
      if (side) { R(5, 8, 3, 9, hr[2]); R(5, 12, 2, 6, hr[1]); R(6, 17, 3, 2, hr[1]); S(7, 9, hr[3]); }
      else if (back) { R(5, 8, 14, 9, hr[2]); R(6, 17, 12, 2, hr[2]); R(7, 19, 10, 1, hr[1]); R(13, 8, 5, 10, hr[1]); R(7, 9, 2, 6, hr[3]); S(10, 12, hr[3]); S(11, 15, hr[1]); S(9, 17, hr[1]); }
      else { R(5, 8, 2, 9, hr[2]); R(17, 8, 2, 9, hr[1]); R(5, 17, 2, 2, hr[1]); R(17, 17, 2, 2, hr[1]); S(5, 9, hr[3]); S(5, 10, hr[3]); }
      break;
    case 'bun':
      h.ball(12 + ox + (side ? -3 : 0), 3 + oy + (side ? 1 : 0), 2.6, 2.4, hr, 1, 4);
      break;
    case 'braid':
      if (side) { R(5, 11, 2, 3, hr[2]); R(4, 14, 2, 3, hr[1]); R(5, 17, 2, 3, hr[2]); S(5, 20, L.trim[3]); }
      else if (back) { R(11, 13, 2, 3, hr[2]); R(11, 16, 2, 2, hr[3]); R(11, 18, 2, 3, hr[2]); R(11, 21, 2, 1, L.trim[3]); S(12, 14, hr[1]); S(12, 19, hr[1]); }
      else { R(17, 11, 2, 3, hr[2]); R(18, 14, 2, 3, hr[1]); R(17, 17, 2, 3, hr[2]); S(18, 20, L.trim[3]); }
      break;
    default: break;
  }
  // Kopfbedeckungen
  switch (L.hat) {
    case 'band':
      if (side) { R(6, 7, 12, 2, hc[2]); R(6, 8, 12, 1, hc[1]); R(14, 7, 3, 1, hc[3]); R(3, 8, 3, 1, hc[2]); R(2, 9, 2, 2, hc[1]); S(4, 10, hc[2]); }
      else { R(6, 7, 12, 2, hc[2]); R(6, 8, 12, 1, hc[1]); R(7, 7, 4, 1, hc[3]); if (back) { R(11, 9, 2, 1, hc[1]); R(10, 10, 1, 3, hc[2]); R(13, 10, 1, 4, hc[1]); } else { S(18, 8, hc[2]); S(19, 9, hc[1]); S(19, 10, hc[2]); } }
      break;
    case 'wizard': {
      const lean = side ? -1 : 0;
      const rows: Array<[number, number]> = [[12, 14], [11, 14], [10, 14], [9, 15], [9, 15], [8, 15], [8, 16], [7, 16]];
      rows.forEach(([a, b], i) => {
        const sx = i < 3 ? (side ? -3 + i : 1 - Math.floor(i / 2)) : 0;
        R(a + sx + lean, i - 1, b - a + 1, 1, hc[2]);
        S(a + sx + lean, i - 1, hc[3]); S(b + sx + lean, i - 1, hc[1]); if (i > 3) S(b - 1 + sx + lean, i - 1, hc[1]);
      });
      R(9 + lean, 2, 2, 3, hc[3]);
      R(7 + lean, 6, 10, 1, ht[3]); R(13 + lean, 6, 4, 1, ht[2]); R(11 + lean, 6, 2, 1, ht[4]);
      R(4, 7, 16, 2, hc[2]); R(3, 8, 18, 1, hc[2]); R(4, 7, 9, 1, hc[3]); R(12, 8, 9, 1, hc[1]); R(5, 9, 14, 1, hc[0]);
      if (!back) { if (side) R(12, 9, 7, 1, mix(L.skin[1], hc[0], 0.4)); else R(8, 9, 8, 1, mix(L.skin[1], hc[0], 0.4)); }
      break;
    }
    case 'hood': case 'furhood': {
      for (const [y, x0, x1] of HEAD_ROWS) { if (y <= 9 || back) R(x0 - 1, y - 1, x1 - x0 + 3, 2, hc[2]); }
      if (back) {
        R(6, 15, 12, 2, hc[2]); R(13, 5, 5, 10, hc[1]); R(7, 5, 4, 2, hc[3]); R(6, 7, 2, 4, hc[3]); S(12, 2, hc[2]); S(12, 3, hc[3]); R(8, 16, 8, 1, hc[1]); R(11, 9, 1, 5, hc[1]);
      } else if (side) {
        R(5, 9, 7, 6, hc[2]); R(5, 12, 5, 4, hc[1]); R(6, 16, 5, 1, hc[1]); R(8, 4, 5, 1, hc[3]); R(6, 6, 4, 2, hc[3]); S(7, 2, hc[2]); R(6, 3, 3, 1, hc[2]);
        R(12, 8, 6, 1, hc[1]); R(12, 9, 1, 6, hc[1]); R(13, 9, 5, 1, mix(L.skin[1], hc[0], 0.4)); R(13, 9, 3, 1, L.hair[1]);
        R(17, 6, 2, 3, hc[2]); S(18, 8, hc[1]);
      } else {
        R(5, 9, 2, 6, hc[2]); R(17, 9, 2, 6, hc[1]); R(6, 15, 2, 1, hc[1]); R(16, 15, 2, 1, hc[1]); R(7, 9, 1, 5, hc[1]); R(16, 9, 1, 5, hc[0]);
        R(8, 8, 8, 1, hc[1]); R(8, 9, 8, 1, L.hair[1]); R(9, 9, 2, 1, L.hair[2]); R(7, 4, 5, 1, hc[3]); R(6, 5, 3, 2, hc[3]); R(14, 5, 4, 3, hc[1]); S(12, 2, hc[2]); S(11, 2, hc[3]);
      }
      if (L.hat === 'furhood' && !back) {
        const f = ht;
        if (side) { for (let y = 5; y <= 15; y++) { S(12 + (y < 8 ? 8 - y : 0) + ((y & 1) ? 0 : 1), y, f[3]); S(11 + (y < 8 ? 8 - y : 0), y, f[4]); } }
        else { for (let x = 7; x <= 16; x++) { S(x, 7 + ((x & 1) ? 0 : 1), f[4]); S(x, 8, f[3]); } for (let y = 9; y <= 15; y++) { S(6 + ((y & 1) ? 0 : 1), y, f[4]); S(7, y, f[3]); S(17 - ((y & 1) ? 0 : 1), y, f[3]); S(16, y, f[2]); } }
      }
      break;
    }
    case 'guardhelm': case 'lamphelm': {
      R(8, 3, 8, 1, hc[3]); R(7, 4, 10, 1, hc[3]); R(6, 5, 12, 4, hc[2]); R(6, 5, 4, 2, hc[3]); R(8, 4, 3, 1, hc[4]); R(14, 5, 4, 4, hc[1]); R(5, 8, 14, 1, hc[1]); R(5, 8, 6, 1, hc[2]);
      if (back) { R(6, 9, 12, 3, hc[2]); R(13, 9, 5, 3, hc[1]); R(7, 12, 10, 1, hc[1]); }
      else if (L.hat === 'guardhelm') {
        if (side) { R(6, 9, 4, 4, hc[2]); R(6, 12, 3, 1, hc[1]); R(16, 9, 1, 3, hc[3]); } else { R(11, 9, 2, 3, hc[3]); S(12, 11, hc[1]); R(6, 9, 1, 4, hc[2]); R(17, 9, 1, 4, hc[1]); }
        R(11, 1, 2, 2, P.red[2]); S(11, 1, P.red[3]);
      }
      if (L.hat === 'lamphelm' && !back) { const lx = side ? 15 : 11; R(lx, 5, 2, 2, P.fire[4]); R(lx - 1, 5, 1, 2, P.steel[1]); R(lx + 2, 5, 1, 2, P.steel[1]); R(lx, 4, 2, 1, P.steel[1]); R(lx, 7, 2, 1, P.fire[3]); }
      break;
    }
    case 'winghelm': {
      R(8, 3, 8, 1, hc[4]); R(7, 4, 10, 1, hc[3]); R(6, 5, 12, 3, hc[3]); R(6, 5, 5, 2, hc[4]); R(14, 5, 4, 3, hc[2]); R(6, 8, 12, 1, ht[3]); R(13, 8, 5, 1, ht[2]); R(11, 3, 2, 5, ht[3]); S(11, 3, ht[4]);
      if (back) { R(6, 9, 12, 3, hc[3]); R(13, 9, 5, 3, hc[2]); R(7, 12, 10, 1, hc[2]); R(11, 8, 2, 4, ht[2]); }
      else if (side) { R(6, 9, 4, 4, hc[3]); R(6, 12, 3, 1, hc[2]); }
      else { R(6, 9, 1, 4, hc[3]); R(17, 9, 1, 4, hc[2]); }
      // Flügel
      if (side) { R(7, 4, 3, 1, ht[4]); R(5, 3, 3, 1, ht[4]); R(4, 2, 2, 1, ht[3]); R(6, 5, 3, 1, ht[3]); R(4, 4, 2, 1, ht[2]); R(3, 1, 1, 2, ht[4]); }
      else { for (const sgn of [-1, 1]) { const bx = sgn < 0 ? 5 : 18; const c1 = sgn < 0 ? ht[4] : ht[3], c2 = sgn < 0 ? ht[3] : ht[2]; S(bx, 6, c2); S(bx, 5, c1); S(bx + sgn, 4, c1); S(bx + sgn, 3, c1); S(bx + sgn, 5, c2); S(bx + 2 * sgn, 2, c1); S(bx + 2 * sgn, 3, c2); S(bx + 2 * sgn, 1, c1); } }
      break;
    }
    case 'cap':
      R(8, 3, 8, 1, hc[2]); R(7, 4, 10, 1, hc[2]); R(6, 5, 12, 3, hc[2]); R(7, 4, 4, 2, hc[3]); R(14, 5, 4, 3, hc[1]); R(6, 8, 12, 1, hc[1]); R(11, 1, 3, 2, WHITE); S(13, 2, P.snow[2]);
      if (!back) { if (side) R(15, 8, 5, 1, hc[2]); else R(7, 8, 10, 1, hc[3]); }
      break;
    case 'kerchief':
      R(8, 4, 8, 1, hc[3]); R(7, 5, 10, 1, hc[2]); R(6, 6, 12, 2, hc[2]); R(6, 8, 12, 1, hc[1]); R(7, 5, 4, 2, hc[3]); R(14, 6, 4, 2, hc[1]); S(9, 6, ht[3]); S(12, 5, ht[3]); S(15, 7, ht[3]); S(11, 7, ht[3]);
      if (back) { R(6, 9, 12, 3, hc[2]); R(13, 9, 5, 3, hc[1]); R(9, 12, 6, 2, hc[1]); R(11, 14, 2, 2, hc[2]); S(9, 10, ht[3]); S(14, 11, ht[3]); }
      else if (side) { R(4, 8, 3, 2, hc[2]); R(3, 10, 2, 2, hc[1]); } else { R(18, 8, 2, 2, hc[2]); S(19, 10, hc[1]); }
      break;
    case 'tropen':
      R(8, 2, 8, 1, hc[4]); R(7, 3, 10, 1, hc[3]); R(6, 4, 12, 3, hc[3]); R(7, 3, 4, 2, hc[4]); R(14, 4, 4, 3, hc[2]); R(6, 6, 12, 1, ht[2]); R(4, 7, 16, 1, hc[3]); R(3, 8, 18, 1, hc[2]); R(12, 8, 9, 1, hc[1]);
      if (!back && !side) R(8, 9, 8, 1, mix(L.skin[1], hc[0], 0.3));
      break;
    case 'floppy':
      R(9, 2, 6, 1, hc[2]); R(8, 3, 9, 1, hc[2]); R(7, 4, 10, 3, hc[2]); R(8, 3, 4, 2, hc[3]); R(14, 4, 3, 3, hc[1]); R(7, 6, 10, 1, ht[3]); R(4, 7, 16, 1, hc[3]); R(2, 8, 20, 1, hc[2]); R(2, 9, 3, 1, hc[1]); R(19, 9, 3, 1, hc[1]); R(12, 8, 10, 1, hc[1]); S(16, 2, P.red[2]); S(17, 1, P.red[3]); S(17, 0, P.red[3]);
      if (!back && !side) R(8, 9, 8, 1, mix(L.skin[1], hc[0], 0.3));
      break;
    case 'turban':
      R(8, 3, 8, 1, hc[3]); R(7, 4, 10, 1, hc[2]); R(5, 5, 14, 4, hc[2]); R(6, 9, 12, 1, hc[1]); R(6, 5, 5, 1, hc[3]); R(5, 6, 3, 2, hc[3]); R(14, 6, 5, 3, hc[1]); R(8, 6, 6, 1, hc[1]); R(10, 8, 6, 1, hc[3]); S(12, 4, ht[3]); S(11, 5, ht[4]);
      if (back) { R(6, 10, 12, 3, hc[2]); R(13, 10, 5, 3, hc[1]); R(10, 13, 3, 4, hc[1]); }
      else if (side) R(5, 9, 3, 6, hc[1]);
      break;
    default: break;
  }
}

function drawFrame(L: Look, dir: number, col: number): Px {
  const p = new Px(CHAR_FRAME_W, CHAR_FRAME_H);
  if (col >= 12 && col <= 15) return drawRoll(L, col - 12);
  const ps = poseFor(dir, col, L);
  return drawPose(p, L, dir, ps, col);
}

function drawPose(p: Px, L: Look, dir: number, ps: Pose, col: number): Px {
  const side = dir === 1, back = dir === 2;
  const drop = L.small ? 3 : 0;
  const b = ps.bob, lx = ps.lean;
  const ty = 17 + drop + b;
  const top = L.top, sl = L.sleeve ?? L.top, lg = L.legs, bt = L.boots;
  const wide = L.wide ? 1 : 0;
  const hw: [number, number] = [ps.hw[0] + lx, ps.hw[1] + b + (ps.armsUp ? drop : 0)];
  const ho: [number, number] = [ps.ho[0] + lx, ps.ho[1] + b + (ps.armsUp ? drop : 0)];
  const walking = col >= 2 && col <= 5;
  const sway = walking ? ps.la : 0;

  const weaponLayer = (): void => {
    if (L.weapon === 'none') return;
    p.layer((l) => {
      if (L.weapon === 'daggers' && !side) drawWeapon(l, 'daggers', ho[0], ho[1], ps.wd2 ?? ps.wd, L);
      drawWeapon(l, L.weapon, hw[0], hw[1], ps.wd, L, ps.pull ?? 0, ps.noArrow);
      // Hand über dem Griff
      if (L.weapon !== 'book') l.rect(hw[0] - (side ? 0 : 0), hw[1], 2, 2, L.skin[3]);
      if (L.weapon === 'daggers' && !side) l.rect(ho[0], ho[1], 2, 2, L.skin[3]);
    });
  };
  const arm = (l: Px, sx: number, sy: number, h: [number, number], c: Ramp, shade: number): void => {
    l.line(sx, sy, h[0], h[1] - 1, c[shade], 2);
    l.rect(h[0], h[1], 2, 2, L.skin[shade === 1 ? 2 : 3]);
  };

  // ---------------- Körper-Ebene
  p.layer((l) => {
    const cx0 = 8 + lx - wide, tw = 8 + wide * 2;
    if (side) {
      const sx0 = 9 + lx - wide, sw = 6 + wide;
      // Umhang / Rucksack hinten
      if (L.cape) { const c = L.cape; l.poly([[sx0 + 1, ty], [sx0 - 2 - sway, 27], [sx0 + 2, 27], [sx0 + 3, ty]], c[2]); l.line(sx0 - 1 - sway, 26, sx0, ty + 2, c[1]); l.rect(sx0 - 2 - sway, 27, 3, 1, c[1]); }
      if (L.scarf) { const c = L.scarf; l.rect(sx0 - 4 - Math.abs(sway), ty + 1 + (sway > 0 ? 1 : 0), 5, 2, c[2]); l.rect(sx0 - 6 - Math.abs(sway), ty + 2 + (sway < 0 ? -1 : 1), 3, 2, c[1]); l.set(sx0 - 3, ty + 1, c[3]); }
      if (L.backpack) { const c = L.backpack; if (L.bigPack) { l.rrect(sx0 - 6, ty - 5, 7, 13, c[2]); l.rect(sx0 - 6, ty - 3, 2, 9, c[1]); l.rect(sx0 - 5, ty - 6, 5, 2, P.cream[3]); l.rect(sx0 - 5, ty + 2, 6, 1, c[0]); l.rect(sx0 - 3, ty - 2, 2, 2, c[3]); l.rect(sx0 - 7, ty + 3, 2, 3, P.steel[3]); } else l.rrect(sx0 - 3, ty, 4, 6, c[2]); }
      if (L.quiver) { l.line(sx0 - 2, ty + 5, sx0 + 1, ty - 1, P.wood[2], 2); l.set(sx0 + 1, ty - 2, P.red[3]); l.set(sx0 + 2, ty - 3, P.cream[4]); l.set(sx0, ty - 2, P.cream[4]); }
      if (L.backBow) { for (let s = -6; s <= 6; s++) l.set(sx0 - 2 - Math.round(2 * (1 - (s * s) / 36)), ty + 3 + s, P.wood[3]); }
      // hinterer Arm (bei Dolchen / Zaubern sichtbar)
      if (L.weapon === 'daggers' || ps.armsUp) { arm(l, 12 + lx, ty + 1, ho, sl, 1); if (L.weapon === 'daggers') drawWeapon(l, 'daggers', ho[0], ho[1], ps.wd2 ?? ps.wd, L); }
      // Beine
      if (L.robe) {
        l.poly([[sx0, ty + 5], [sx0 - 1, 29], [sx0 + sw + 1, 29], [sx0 + sw, ty + 5]], lg[2]);
        l.rect(sx0 - 1, 27, 2, 2, lg[1]); l.rect(sx0 + 1, 28, sw, 1, lg[1]); l.line(sx0 + 2, ty + 7, sx0 + 1 + sway, 28, lg[1]);
        l.rect(sx0 + 1 + (sway > 0 ? 2 : 0), 29, 3, 1, bt[1]); l.rect(sx0 + 3 + (sway < 0 ? -1 : 1), 29, 3, 1, bt[2]);
      } else {
        const leg = (ph: number, far: boolean) => {
          const fx = 10 + lx + ph * 2, fy = 29 - (ph < 0 ? 1 : 0) - (far && ph === 0 && walking ? 1 : 0);
          l.line(10 + lx, 24, fx, fy - 2, lg[far ? 1 : 2], 3);
          l.rect(fx, fy - 1, 3, 2, bt[far ? 1 : 2]); l.set(fx + 3, fy, bt[far ? 1 : 2]);
          if (!far) l.set(fx, fy - 1, bt[3]);
        };
        leg(ps.lb, true); leg(ps.la, false);
      }
      // Torso
      l.rect(sx0, ty, sw, 24 - ty + (L.robe ? 6 : 0), top[2]);
      l.rect(sx0, ty, 1, 7, top[1]); l.rect(sx0 + sw - 1, ty + 1, 1, 5, top[3]);
      if (L.chest === 'plate') { const c = L.chestC!; l.rect(sx0 + 1, ty, sw - 1, 5, c[3]); l.rect(sx0 + sw - 1, ty + 1, 1, 3, c[4]); l.rect(sx0 + 1, ty + 4, sw - 1, 1, c[2]); l.rect(sx0 + 1, ty, 1, 4, c[2]); }
      if (L.chest === 'vest') { const c = L.chestC!; l.rect(sx0, ty, 3, 6, c[2]); l.rect(sx0, ty, 1, 6, c[1]); }
      if (L.chest === 'apron') { const c = L.chestC!; l.rect(sx0 + sw - 2, ty + 1, 2, 9, c[2]); l.set(sx0 + sw - 1, ty + 2, c[3]); }
      if (L.chest === 'tabard') { const c = L.chestC!; l.rect(sx0 + 2, ty, sw - 2, 9, c[2]); l.rect(sx0 + sw - 1, ty + 1, 1, 7, c[3]); l.rect(sx0 + 3, ty + 3, 2, 2, L.trim[3]); }
      if (L.chest === 'sash' && L.robe) { const c = L.chestC!; l.rect(sx0 + sw - 2, ty, 2, 12 - b, c[2]); l.set(sx0 + sw - 1, ty + 2, c[3]); }
      l.rect(sx0, 23, sw, 1, L.trim[2]); l.rect(sx0, 23, 2, 1, L.trim[1]);
      if (L.bag) { l.line(sx0 + 1, ty, sx0 + sw - 1, 23, L.trim[1]); l.rrect(sx0 + sw - 3, 22, 5, 5, L.bag[2]); l.rect(sx0 + sw - 2, 23, 3, 1, L.bag[3]); }
      if (L.scarf) { l.rect(sx0, ty - 1, sw + 1, 2, L.scarf[2]); l.rect(sx0 + 2, ty - 1, 3, 1, L.scarf[3]); }
      // vorderer Arm
      if (!(L.weapon !== 'none' && false)) arm(l, 10 + lx, ty + 1, hw, sl, 2);
      if (L.pauldron) { l.ball(11.5 + lx, ty + 1.5, 2.6, 2.2, L.pauldron, 2, 4); }
    } else {
      // ------- vorne / hinten
      if (L.cape && !back) { const c = L.cape; l.poly([[cx0, ty + 1], [cx0 - 1 - (sway > 0 ? 1 : 0), 28], [cx0 + tw + 1 + (sway < 0 ? 1 : 0), 28], [cx0 + tw, ty + 1]], c[1]); l.rect(cx0 - 1, 26, 2, 2, c[2]); l.rect(cx0 + tw - 1, 26, 2, 2, c[0]); }
      if (L.backpack && !back) { const c = L.backpack; if (L.bigPack) { l.rrect(3 + lx, ty - 9, 18, 14, c[2]); l.rect(3 + lx, ty - 7, 2, 10, c[3]); l.rect(18 + lx, ty - 7, 3, 10, c[1]); l.rect(5 + lx, ty - 11, 14, 3, P.cream[3]); l.rect(13 + lx, ty - 10, 6, 2, P.cream[2]); l.rect(1 + lx, ty - 2, 2, 4, P.steel[3]); l.rect(21 + lx, ty - 4, 2, 3, P.red[2]); } }
      if (L.shield && back) { const c = L.shield; l.rrect(2 + lx, ty, 6, 9, c[2]); l.rect(2 + lx, ty + 1, 1, 6, c[1]); l.rect(3 + lx, ty, 4, 1, c[3]); }
      if (L.quiver && !back) { l.rect(15 + lx, ty - 3, 2, 3, P.wood[2]); l.set(15 + lx, ty - 4, P.cream[4]); l.set(17 + lx, ty - 4, P.red[3]); l.set(16 + lx, ty - 5, P.cream[4]); }
      if (L.backBow && !back) { for (let s = -6; s <= 6; s++) l.set(5 + lx - Math.round(2 * (1 - (s * s) / 36)) + 0, ty + 2 + s, P.wood[3]); }
      // Beine
      if (L.robe) {
        l.poly([[cx0, ty + 5], [cx0 - 1, 29], [cx0 + tw + 1, 29], [cx0 + tw, ty + 5]], lg[2]);
        l.rect(cx0 + tw - 1, ty + 6, 2, 23 - ty - 6 + 6, lg[1]); l.rect(cx0 - 1, 27, 1, 2, lg[3]); l.rect(cx0, 28, tw, 1, lg[1]);
        l.line(cx0 + 2 + (sway > 0 ? 1 : 0), ty + 8, cx0 + 2, 27, lg[1]); l.line(cx0 + tw - 3, ty + 8, cx0 + tw - 3 - (sway < 0 ? 1 : 0), 27, lg[1]); l.line(cx0 + 1, ty + 7, cx0, 27, lg[3]);
        l.rect(cx0 + 1, 29, 3, 1 + (ps.la > 0 ? 1 : 0), bt[2]); l.rect(cx0 + tw - 4, 29, 3, 1 + (ps.lb > 0 ? 1 : 0), bt[1]);
      } else {
        const leg = (x: number, ph: number, dkk: boolean) => {
          const end = ph > 0 ? 30 : ph < 0 ? 28 : 29;
          l.rect(x, 23, 3, end - 24, lg[ph < 0 ? 1 : 2]); l.rect(x + 2, 24, 1, end - 25, lg[1]);
          l.rect(x, end - 1, 3, 2, bt[dkk || ph < 0 ? 1 : 2]); if (!dkk && ph >= 0) l.set(x, end - 1, bt[3]);
        };
        leg(cx0 + (back ? tw - 3 : 0), ps.la, back); leg(cx0 + (back ? 0 : tw - 3), ps.lb, !back);
        l.rect(cx0 + 3, 24, tw - 6, 1, lg[1]);
      }
      // Torso
      l.rect(cx0, ty, tw, 24 - ty, top[2]);
      l.rect(cx0, ty, 1, 24 - ty, top[3]); l.rect(cx0 + tw - 1, ty, 1, 24 - ty, top[1]); l.rect(cx0 + tw - 2, ty + 2, 1, 4, top[1]);
      if (!back) {
        const c = L.chestC ?? top;
        if (L.chest === 'plate') { l.rect(cx0 + 1, ty, tw - 2, 5, c[3]); l.rect(cx0 + 1, ty, 2, 3, c[4]); l.rect(cx0 + tw - 3, ty + 1, 2, 4, c[2]); l.rect(cx0 + 1, ty + 4, tw - 2, 1, c[2]); l.rect(cx0 + 3, ty + 2, 2, 1, L.trim[3]); }
        if (L.chest === 'vest') { l.rect(cx0, ty, 3, 6, c[2]); l.rect(cx0 + tw - 3, ty, 3, 6, c[1]); l.rect(cx0, ty, 1, 6, c[3]); }
        if (L.chest === 'apron') { l.rect(cx0 + 1, ty + 1, tw - 2, 9 - b, c[2]); l.rect(cx0 + 1, ty + 1, 1, 9 - b, c[3]); l.rect(cx0 + tw - 2, ty + 2, 1, 8 - b, c[1]); l.rect(cx0 + 2, ty, 1, 1, c[1]); l.rect(cx0 + tw - 3, ty, 1, 1, c[1]); l.rect(cx0 + 3, ty + 5, tw - 6, 1, c[1]); }
        if (L.chest === 'tabard') { l.rect(cx0 + 1, ty, tw - 2, 10 - b, c[2]); l.rect(cx0 + 1, ty, 1, 10 - b, c[3]); l.rect(cx0 + tw - 2, ty + 1, 1, 9 - b, c[1]); l.rect(cx0 + 3, ty + 2, 2, 3, L.trim[3]); l.rect(cx0 + 2, ty + 3, 4, 1, L.trim[3]); }
        if (L.chest === 'sash') { if (L.robe) { l.rect(cx0 + 3, ty, 2, 12 - b, c[2]); l.rect(cx0 + 3, ty, 1, 12 - b, c[3]); l.set(cx0 + 3, ty + 3, L.trim[3]); l.set(cx0 + 4, ty + 3, L.trim[3]); } else { l.line(cx0, ty, cx0 + tw - 1, ty + 5, c[2]); l.line(cx0, ty + 1, cx0 + tw - 2, ty + 5, c[1]); } }
        if (L.bag) { l.line(cx0 + tw - 1, ty, cx0, 23, L.trim[1]); l.rrect(cx0 - 2, 22, 5, 5, L.bag[2]); l.rect(cx0 - 1, 23, 3, 1, L.bag[3]); }
      }
      l.rect(cx0, 23, tw, 1, L.trim[2]); l.rect(cx0 + tw - 3, 23, 3, 1, L.trim[1]); if (!back) l.rect(cx0 + 3, 23, 2, 1, L.trim[4]);
      if (L.robe) { l.rect(cx0 + tw - 1, ty, 1, 6, top[1]); }
      if (back) {
        if (L.cape) { const c = L.cape; l.poly([[cx0, ty], [cx0 - 1 - (sway > 0 ? 1 : 0), 28], [cx0 + tw + 1 + (sway < 0 ? 1 : 0), 28], [cx0 + tw, ty]], c[2]); l.rect(cx0 + tw - 2, ty + 1, 2, 27 - ty, c[1]); l.line(cx0 + 2, ty + 3, cx0 + 1, 27, c[3]); l.line(cx0 + 4, ty + 4, cx0 + 4, 27, c[1]); l.rect(cx0 - 1, 27, tw + 2, 1, c[1]); l.rect(cx0, ty, tw, 1, L.trim[3]); }
        if (L.quiver) { l.line(10 + lx, ty + 6, 15 + lx, ty - 1, P.wood[2], 3); l.line(10 + lx, ty + 6, 15 + lx, ty - 1, P.wood[3]); l.set(16 + lx, ty - 2, P.cream[4]); l.set(17 + lx, ty - 3, P.red[3]); l.set(17 + lx, ty - 1, P.cream[4]); }
        if (L.backBow) { for (let s = -7; s <= 7; s++) l.set(12 + lx + s, ty + 4 - s * 0.6 - 2 * (1 - (s * s) / 49), P.wood[3]); }
        if (L.backpack) { const c = L.backpack; if (L.bigPack) { l.rrect(3 + lx, ty - 9, 18, 17, c[2]); l.rect(3 + lx, ty - 7, 2, 13, c[3]); l.rect(17 + lx, ty - 7, 4, 13, c[1]); l.rect(5 + lx, ty - 11, 14, 3, P.cream[3]); l.rect(13 + lx, ty - 10, 6, 2, P.cream[2]); l.rect(4 + lx, ty + 1, 16, 1, c[0]); l.rect(7 + lx, ty - 4, 4, 4, c[3]); l.rect(13 + lx, ty + 3, 4, 3, c[1]); l.rect(11 + lx, ty + 1, 2, 2, P.gold[3]); l.rect(1 + lx, ty - 2, 2, 4, P.steel[3]); l.rect(21 + lx, ty - 4, 2, 3, P.red[2]); } else { l.rrect(cx0 + 1, ty, tw - 2, 7, c[2]); l.rect(cx0 + tw - 3, ty + 1, 2, 5, c[1]); } }
      }
      if (L.scarf) { const c = L.scarf; l.rect(cx0, ty - 1, tw, 2, c[2]); l.rect(cx0 + 1, ty - 1, 3, 1, c[3]); const sxx = back ? cx0 - 2 : cx0 + tw; l.rect(sxx, ty, 2, 4 + (sway > 0 ? 1 : 0), c[2]); l.rect(sxx + (back ? -1 : 1), ty + 3, 2, 4 + (sway < 0 ? 1 : 0), c[1]); }
      // Arme
      const lsx = cx0 - 1, rsx = cx0 + tw - 1;
      const wLeft = !back;
      arm(l, wLeft ? lsx : rsx, ty + 1, hw, sl, wLeft ? 2 : 1);
      arm(l, wLeft ? rsx : lsx, ty + 1, ho, sl, wLeft ? 1 : 2);
      if (L.pauldron) { l.ball(cx0 - 0.2, ty + 1.2, 2.4, 2.2, L.pauldron, 2, 4); l.ball(cx0 + tw + 0.2, ty + 1.2, 2.4, 2.2, L.pauldron, 1, 3); }
    }
  });
  // Schild (Frontansicht / Seite)
  if (L.shield && !back) {
    p.layer((l) => {
      const c = L.shield!;
      const sx = side ? 9 + lx : ho[0] - 2, sy = side ? ty + 1 : ho[1] - 7;
      if (side) { l.rrect(sx - 1, sy, 5, 8, c[2]); l.rect(sx - 1, sy + 1, 1, 6, c[1]); l.rect(sx, sy, 3, 1, c[3]); l.rect(sx + 1, sy + 3, 2, 2, P.red[2]); }
      else {
        l.rrect(sx, sy, 7, 9, c[3]); l.rect(sx + 1, sy + 8, 5, 1, c[1]); l.rect(sx + 2, sy + 9, 3, 1, c[1]);
        l.rect(sx + 5, sy + 1, 2, 7, c[2]); l.rect(sx + 1, sy, 5, 1, c[4]); l.rect(sx, sy + 1, 1, 6, c[4]);
        l.rect(sx + 3, sy + 2, 1, 5, P.red[2]); l.rect(sx + 2, sy + 4, 3, 1, P.red[2]); l.set(sx + 3, sy + 4, P.gold[3]);
      }
    });
  }
  if (ps.wBehind) weaponLayer();
  // ---------------- Kopf
  p.layer((h) => drawHead(h, L, dir, lx + (side ? 0 : 0), b + drop, ps.face));
  if (!ps.wBehind) weaponLayer();
  // Zauber-Funken
  if (ps.fxv) {
    const g = L.gem ?? P.gold;
    const pts: Array<[number, number]> = ps.armsUp ? [[hw[0], hw[1] - 3], [ho[0] + 1, ho[1] - 3], [12, 1]] : [[hw[0] + ps.wd[0] * 13, hw[1] + ps.wd[1] * 13]];
    pts.forEach(([x, y], i) => {
      if (ps.fxv === 2 || i < 2) { p.set(x, y, WHITE); p.set(x - 1, y, g[4]); p.set(x + 1, y, g[4]); p.set(x, y - 1, g[4]); p.set(x, y + 1, g[4]); if (ps.fxv === 2) { p.set(x - 2, y - 2, g[3]); p.set(x + 2, y + 1, g[3]); } }
    });
  }
  return finish(p, L);
}

function finish(p: Px, L: Look): Px {
  if (L.ghost) {
    p.tint(P.ice[3], 0.45);
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      const c = p.d[y * p.w + x];
      if (c >>> 24) p.d[y * p.w + x] = alpha(c, y > 23 ? Math.max(40, 190 - (y - 23) * 26) : 190);
    }
  }
  if (L.glow) {
    p.tint(P.gold[4], 0.3);
    const src = p.d.slice();
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      if (src[y * p.w + x] >>> 24) continue;
      const near = (dx: number, dy: number) => { const xx = x + dx, yy = y + dy; return xx >= 0 && yy >= 0 && xx < p.w && yy < p.h && src[yy * p.w + xx] >>> 24 > 0; };
      if (near(1, 0) || near(-1, 0) || near(0, 1) || near(0, -1)) p.d[y * p.w + x] = alpha(P.gold[4], 130);
    }
  }
  return p;
}

function drawRoll(L: Look, k: number): Px {
  const p = new Px(CHAR_FRAME_W, CHAR_FRAME_H);
  const cx = 12, cy = 23;
  const a = (k * Math.PI) / 2 - Math.PI / 4;
  const hx = cx + Math.cos(a) * 3.2, hy = cy + Math.sin(a) * 3.2;
  p.layer((l) => {
    l.ball(cx, cy, 6.5, 6.2, L.top, 1, 3);
    // Beine / Stiefel gegenüber vom Kopf
    const fx = cx - Math.cos(a) * 4.5, fy = cy - Math.sin(a) * 4.5;
    l.ell(fx, fy, 2.6, 2.6, L.robe ? L.legs[1] : L.legs[2]);
    l.ell(fx - Math.sin(a) * 2, fy + Math.cos(a) * 2, 1.6, 1.6, L.boots[2]);
    const acc = L.scarf ?? L.cape ?? L.trim;
    l.ell(cx - Math.sin(a) * 4.2, cy + Math.cos(a) * 4.2, 2.2, 2.2, acc[2]);
    l.set(cx - Math.sin(a) * 4.2, cy + Math.cos(a) * 4.2, acc[3]);
    // Kopf
    const hc = L.hat === 'none' || L.hat === 'band' ? L.hair : L.hatC;
    l.ball(hx, hy, 4.2, 4.2, hc, 1, 3);
    l.ell(hx + Math.cos(a + 1.2) * 2.2, hy + Math.sin(a + 1.2) * 2.2, 1.8, 1.8, L.skin[3]);
    if (L.hat === 'band') l.line(hx - Math.sin(a) * 3, hy + Math.cos(a) * 3, hx + Math.sin(a) * 3, hy - Math.cos(a) * 3, L.hatC[2]);
  });
  // Bewegungslinien
  const m = alpha(WHITE, 150);
  for (let i = 0; i < 3; i++) { const aa = a + Math.PI + (i - 1) * 0.5; p.blend(cx + Math.cos(aa) * 9, cy + Math.sin(aa) * 8.5, m); p.blend(cx + Math.cos(aa + 0.15) * 9.5, cy + Math.sin(aa + 0.15) * 9, m); }
  return finish(p, L);
}

function lying(L: Look): Px {
  const ps = poseFor(0, 11, L);
  ps.face = 'closed'; ps.bob = 0; ps.lean = 0; ps.la = 0; ps.lb = 0;
  const up = drawPose(new Px(CHAR_FRAME_W, CHAR_FRAME_H), { ...L, weapon: 'none', shield: undefined, ghost: false, glow: false }, 0, ps, 11);
  const o = Px.map(CHAR_FRAME_W, CHAR_FRAME_H, up, (x, y) => [31 - y - 0.5, 2 + x * (29 / 24)]);
  return finish(o, L);
}

function cheer(L: Look): Px {
  const ps = poseFor(0, 10, L);
  ps.face = 'happy'; ps.bob = 0; ps.fxv = L.npc ? 0 : 2;
  const p = drawPose(new Px(CHAR_FRAME_W, CHAR_FRAME_H), L, 0, ps, 10);
  return p;
}

export function buildCharSheet(key: string): Sheet {
  const L = LOOKS[key];
  const frames: Px[] = [];
  for (let row = 0; row < 3; row++) for (let col = 0; col < CHAR_COLS; col++) frames.push(drawFrame(L, row, col));
  const idle0 = frames[0], idle1 = frames[1];
  for (let col = 0; col < CHAR_COLS; col++) frames.push(col === 0 ? lying(L) : col === 1 ? cheer(L) : col % 2 === 0 ? idle0 : idle1);
  return gridSheet(frames, CHAR_COLS);
}

export function buildChars(): Record<string, Sheet> {
  const out: Record<string, Sheet> = {};
  for (const id of CLASS_IDS) out[`char_${id}`] = buildCharSheet(`char_${id}`);
  for (const id of NPC_LOOKS) out[`npc_${id}`] = buildCharSheet(`npc_${id}`);
  return out;
}
