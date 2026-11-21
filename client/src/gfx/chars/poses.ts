/** Posenbibliothek: allgemeine Animationen (Stehen, Gehen, Rennen, Treffer, Rolle, Zaubern, Interagieren, Sterben). */
import { Px } from '../draw';
import { CHAR_ANIMS, CHAR_COLS } from '../spec';
import type { CharAnim } from '../spec';
import { CX, FOOT, bbox, drawFrame, mkPose, rotPlace, setFrameLabel } from './rig';
import type { Costume, Dir, Pose, V2 } from './rig';

const v2 = (a: V2, dx: number, dy: number): V2 => [a[0] + dx, a[1] + dy];

export function rest(c: Costume, dir: Dir): Pose {
  const ps = mkPose({ mh: [0, c.B.arm - 1], oh: [0, c.B.arm - 1] });
  if (dir === 1) { ps.fa = [1, 0, 0]; ps.fb = [-1, 0, 0]; }
  return { ...ps, ...c.carry(dir) };
}
const merge = (ps: Pose, o: Partial<Pose> | null | undefined): Pose => (o ? { ...ps, ...o } : ps);

// Seitenansicht: [aX, aHub, bX, bHub, y]
const WALK_S: number[][] = [[4, 0, -4, 0, 0], [2, 0, -3, 1, 1], [0, 0, 1, 3, 0], [-4, 0, 4, 0, 0], [-3, 1, 2, 0, 1], [1, 3, 0, 0, 0]];
const RUN_S: number[][] = [[6, 0, -5, 2, 0], [2, 0, -4, 4, 1], [-2, 1, 3, 4, -1], [-5, 2, 6, 0, 0], [-4, 4, 2, 0, 1], [3, 4, -2, 1, -1]];
// Front/Rücken: [aHub, aVor, bHub, bVor, y]
const WALK_F: number[][] = [[0, 1, 1, -1, 0], [0, 0, 2, -1, 1], [0, 0, 2, 0, 0], [1, -1, 0, 1, 0], [2, -1, 0, 0, 1], [2, 0, 0, 0, 0]];
const RUN_F: number[][] = [[0, 1, 2, -1, 0], [0, 0, 4, -1, 1], [1, 0, 3, 0, -1], [2, -1, 0, 1, 0], [4, -1, 0, 0, 1], [3, 0, 1, 0, -1]];

function locomotion(c: Costume, dir: Dir, f: number, run: boolean): Pose {
  const ps = rest(c, dir), sw = c.swing ?? [1, 1];
  const sway = [1, 0, -1, -1, 0, 1][f];
  ps.sw = sway; ps.tr = run ? 2 : 1;
  if (dir === 1) {
    const t = (run ? RUN_S : WALK_S)[f];
    ps.fa = [t[0], t[1], 0]; ps.fb = [t[2], t[3], 0]; ps.y = t[4];
    const amp = run ? 0.7 : 0.5;
    const ma = Math.round(-t[0] * amp * sw[0]), oa = Math.round(-t[2] * amp * sw[1]);
    ps.mh = v2(ps.mh, ma, -Math.round(Math.abs(ma) / (run ? 1.5 : 2.5)) - (run && sw[0] > 0.5 ? 1 : 0));
    ps.oh = v2(ps.oh, oa, -Math.round(Math.abs(oa) / (run ? 1.5 : 2.5)) - (run && sw[1] > 0.5 ? 1 : 0));
    if (run) { ps.lean += 2; ps.hx += 0; }
  } else {
    const t = (run ? RUN_F : WALK_F)[f], inv = dir === 2 ? -1 : 1;
    ps.fa = [0, t[0], t[1] * inv]; ps.fb = [0, t[2], t[3] * inv]; ps.y = t[4];
    const s = [1, 1, 0, -1, -1, 0][f] * (run ? 2 : 1);
    ps.mh = v2(ps.mh, 0, -Math.round(s * sw[0] * (run ? 0.8 : 1)) - (run && sw[0] > 0.5 ? 1 : 0));
    ps.oh = v2(ps.oh, 0, Math.round(s * sw[1] * (run ? 0.8 : 1)) - (run && sw[1] > 0.5 ? 1 : 0));
    if (run) ps.hy += 1;
  }
  if (c.plant) ps.mh = [ps.mh[0], ps.mh[1] - ps.y];
  return ps;
}

function generic(c: Costume, dir: Dir, anim: CharAnim, f: number): Pose {
  const ps = generic0(c, dir, anim, f);
  if (c.plant && (anim === 'idle' || anim === 'interact' || anim === 'hit')) ps.mh = [ps.mh[0], ps.mh[1] - ps.y];
  return ps;
}
function generic0(c: Costume, dir: Dir, anim: CharAnim, f: number): Pose {
  const ps = rest(c, dir), A = c.B.arm - 1, out = dir === 0 ? -1 : 1;
  switch (anim) {
    case 'idle':
      if (f === 1) { ps.y = 1; ps.sw = 1; }
      if (f === 2) { ps.y = 1; ps.face = 'blink'; ps.sw = 1; }
      if (f === 3) { ps.sw = -1; }
      return ps;
    case 'walk': return locomotion(c, dir, f, false);
    case 'run': return locomotion(c, dir, f, true);
    case 'hit':
      ps.face = 'hurt'; ps.tr = 1; ps.sw = f ? 1 : -1;
      if (dir === 1) {
        ps.lean -= f ? 1 : 2; ps.x = f ? 0 : -1; ps.hx = f ? 0 : -1; ps.y = f;
        ps.mh = v2(ps.mh, f ? -1 : -2, f ? -1 : -3); ps.oh = [f ? 2 : 4, A - 3];
        ps.fa = [f ? 2 : 3, 0, 0]; ps.fb = [-3, 0, 0];
      } else {
        ps.y = f ? 1 : 0; ps.hy = f ? 0 : -1;
        ps.mh = v2(ps.mh, out * (f ? 1 : 2), f ? -1 : -3); ps.oh = v2(ps.oh, -out * (f ? 1 : 2), f ? -1 : -3);
        ps.fa = [out, 0, 0]; ps.fb = [-out, 0, 0];
      }
      return ps;
    case 'cast': {
      const b = [0, -1, -1, 0][f];
      ps.y = b === 0 ? 0 : 0; ps.hy = b; ps.up = f === 1 || f === 2 ? 2 : 1; ps.sw = [0, 1, 0, -1][f]; ps.glint = f + 1; ps.flare = [1, 2, 3, 2][f];
      if (dir === 1) { ps.mh = [5, 0 + b]; ps.oh = [5, 2 + b]; ps.wa = -67.5; ps.lean -= 1; }
      else { ps.mh = [out * 1, -1 + b]; ps.oh = [-out * 1, -1 + b]; ps.wa = -90; ps.wz = 1; }
      return ps;
    }
    case 'interact': {
      const r = [1, 2, 1][f], m = (c.reach ?? 'o') === 'm';
      if (dir === 1) { ps.lean += r; ps.hx += r > 1 ? 1 : 0; const h: V2 = [3 + r * 2, r > 1 ? 0 : 2]; if (m) ps.mh = h; else ps.oh = h; ps.fa = [2, 0, 0]; }
      else {
        ps.y = r > 1 ? 1 : 0; ps.hy = 1;
        const inw = (m ? 1 : -1) * (dir === 0 ? 1 : -1);
        const h: V2 = dir === 0 ? [inw * (1 + r), 2 + r] : [inw * r, 3 - r];
        if (m) ps.mh = h; else ps.oh = h;
      }
      return ps;
    }
    default: return ps;
  }
}

/** Zusammengekauerte Haltung (Rolle) */
function tuck(c: Costume, dir: Dir): Pose {
  const ps = rest(c, dir);
  ps.y = c.B.leg - 3; ps.hy = 4; ps.tr = 0; ps.wz = 0; ps.tag = 'tuck';
  if (dir === 1) { ps.lean = 3; ps.hx = 1; ps.hy = 3; ps.mh = [3, 3]; ps.oh = [4, 4]; ps.fa = [3, 0, 0]; ps.fb = [2, 1, 0]; ps.wa = -135; ps.wa2 = -135; }
  else { ps.mh = [dir === 0 ? 3 : -3, 3]; ps.oh = [dir === 0 ? -3 : 3, 3]; ps.wa = dir === 0 ? 0 : 180; ps.wa2 = dir === 0 ? 180 : 0; ps.oz = 0; }
  return ps;
}

function lyingFrame(c: Costume, dir: Dir, settle: number): Px {
  const mk = (sq: number, hd: number): Px => {
    const ps = merge(rest(c, dir), c.anim?.('lie', dir, 0));
    ps.face = 'blink'; ps.y = sq; ps.hy = hd; ps.tag += ' lie'; ps.label = 'lie';
    if (dir !== 1 && sq) { const o = dir === 0 ? -1 : 1; ps.fa = [o, 0, 0]; ps.fb = [-o, 0, 0]; }
    return drawFrame(c, dir, ps);
  };
  let up = mk(0, 0);
  const b = bbox(up);
  if (b && b[3] - b[1] + 1 > 30) { const over = b[3] - b[1] + 1 - 30; up = mk(Math.min(5, over), Math.max(0, Math.min(3, over - 5))); }
  // Seitenansicht: nach vorn gefallen (Gesicht nach unten); Front: auf dem Rücken, Kopf links; Rücken: Kopf rechts
  const q = dir === 1 ? 1 : dir === 0 ? 3 : 1;
  return rotPlace(up, q, CX, FOOT + 1 - settle);
}

/** Ein Frame einer Animation (fertiges Bild). */
export function renderAnim(c: Costume, dir: Dir, anim: CharAnim, f: number): Px {
  setFrameLabel(`${anim}${f}`);
  const own = (a: string, ff: number): Partial<Pose> | null => ({ ...(c.anim?.(a, dir, ff) ?? {}), label: `${anim}${f}` });
  if (anim === 'dodge') {
    if (c.npc) return drawFrame(c, dir, generic(c, dir, 'hit', f % 2));
    const t = tuck(c, dir);
    if (f === 0) {
      const ps = rest(c, dir); ps.tr = 2; ps.tag = 'dive';
      if (dir === 1) { ps.lean = 4; ps.x = 1; ps.y = 2; ps.hx = 1; ps.hy = 1; ps.mh = [6, 1]; ps.oh = [5, 3]; ps.fa = [-2, 0, 0]; ps.fb = [-5, 2, 0]; ps.wa = 22.5; }
      else { ps.y = 3; ps.hy = 3; ps.mh = [ps.mh[0] + (dir === 0 ? 1 : -1), Math.min(2, ps.mh[1] - 3)]; ps.oh = [ps.oh[0] + (dir === 0 ? -1 : 1), Math.min(2, ps.oh[1] - 3)]; ps.fa = [dir === 0 ? -1 : 1, 0, 0]; ps.fb = [dir === 0 ? 1 : -1, 0, 0]; }
      return drawFrame(c, dir, merge(ps, own('dodge', 0)));
    }
    if (dir === 1) {
      if (f === 1 || f === 2) return rotPlace(drawFrame(c, 1, merge(t, own('dodge', f))), f, CX + 1, FOOT + 1);
    } else {
      // zur Kamera: erst der eingerollte Rücken kopfüber, dann geduckt von vorn; von der Kamera weg umgekehrt
      const tb = merge(tuck(c, 2), own('dodge', 1));
      if (f === 1) return dir === 0 ? rotPlace(drawFrame(c, 2, tb), 2, CX, FOOT + 1) : drawFrame(c, 2, tb);
      if (f === 2) return dir === 0 ? drawFrame(c, 0, merge(t, own('dodge', 2))) : rotPlace(drawFrame(c, 2, tb), 2, CX, FOOT + 1);
    }
    const ps = merge(t, own('dodge', 3)); ps.y -= 2; ps.hy -= 2; ps.tr = 1;
    return drawFrame(c, dir, ps);
  }
  if (anim === 'death' && c.fade) {
    const ps = generic(c, dir, f === 0 ? 'hit' : 'idle', f === 0 ? 0 : 1);
    ps.label = `death${f}`; ps.face = f ? 'blink' : 'hurt'; ps.y += f > 2 ? 1 : 0; ps.up = 1;
    return drawFrame(c, dir, ps);
  }
  if (anim === 'cast' && c.npc) return drawFrame(c, dir, merge(generic(c, dir, 'interact', [0, 1, 2, 1][f]), own('cast', f)));
  if (anim === 'death') {
    if (f >= 3) return lyingFrame(c, dir, f === 3 ? 1 : 0);
    const ps = generic(c, dir, 'hit', 0);
    if (f === 0) { if (dir === 1) { ps.lean -= 1; ps.hx -= 1; } else ps.hy -= 0; return drawFrame(c, dir, merge(ps, own('death', 0))); }
    ps.kneel = true; ps.face = 'blink'; ps.y = c.B.leg - 2; ps.hx = 0; ps.x = 0; ps.tr = 0; ps.sw = 0; ps.wz = 0;
    const A = c.B.arm - 1;
    if (dir === 1) {
      ps.lean = f === 1 ? 1 : 5; ps.hy = f === 1 ? 1 : 4; ps.hx = f === 1 ? 0 : 2; ps.mh = [f === 1 ? 1 : -2, A - (f === 1 ? 2 : 3)]; ps.oh = [f === 1 ? 1 : 5, A - 2];
      ps.mh = [f === 1 ? 4 : 4, A - 4]; ps.wa = -90; ps.wa2 = -67.5;
    } else {
      ps.hy = f === 1 ? 2 : 5; ps.y += f === 1 ? 0 : 2; ps.mh = [dir === 0 ? -1 : 1, A - 3]; ps.oh = [dir === 0 ? 1 : -1, A - 3];
      ps.lean = 0; ps.wa = dir === 0 ? -112.5 : -67.5; ps.wa2 = dir === 0 ? -67.5 : -112.5;
      ps.mh = [dir === 0 ? -2 : 2, A - 4]; ps.wz = 1;
    }
    return drawFrame(c, dir, merge(ps, own('death', f)));
  }
  let ps = generic(c, dir, anim, f);
  if (anim === 'attack' || anim === 'heavy') {
    const o = c.anim?.(anim, dir, f);
    ps = o ? merge(rest(c, dir), o) : c.npc ? generic(c, dir, 'idle', f % 4) : ps;
    ps.label = `${anim}${f}`;
  } else ps = merge(ps, own(anim, f));
  return drawFrame(c, ps.rdir ?? dir, ps);
}

/** Alle 3×43 Frames eines Kostüms. */
export function allFrames(c: Costume): Px[] {
  const frames: Px[] = [];
  for (let dir = 0; dir < 3; dir++) {
    const row: Px[] = new Array(CHAR_COLS);
    for (const [name, def] of Object.entries(CHAR_ANIMS)) for (let f = 0; f < def.len; f++) row[def.start + f] = renderAnim(c, dir as Dir, name as CharAnim, f);
    frames.push(...row);
  }
  return frames;
}
