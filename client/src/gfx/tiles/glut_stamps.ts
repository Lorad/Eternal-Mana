/**
 * Glutlande – vorgezeichnete Kleinmotive: Schlackebrocken, Kiesel, Trittplatten, Steinmännchen, Brandflecken, Glutnester,
 * Spritzsteine, dürres Reisig, Risse, Basaltschutt, Lavaadern, Kettenpfosten sowie die Wandmotive der Aschenschmiede.
 */
import { INK, P, alpha, mix, rng } from '../palette';
import { Px } from '../draw';
import { stampOf, stampRows, type Stamp } from './core';
import { ASHN, BAS, CRUST, HOT, IRON, SLABR, SLAG } from './glut_pal';
import { halo } from './kristall_util';

export const GS = {
  cinder: [] as Stamp[], peb: [] as Stamp[], pebL: [] as Stamp[], slab: [] as Stamp[], cairn: [] as Stamp[], scorch: [] as Stamp[], ember: [] as Stamp[],
  spatter: [] as Stamp[], twig: [] as Stamp[], crack: [] as Stamp[], talus: [] as Stamp[], vein: [] as Stamp[], post: [] as Stamp[],
  vent: [] as Stamp[], relief: [] as Stamp[], grate: [] as Stamp[], rubble: [] as Stamp[], ripple: [] as Stamp[], bone: [] as Stamp[],
};
const SH = alpha(INK, 90);

export function initGlutStamps(): void {
  if (GS.cinder.length) return;
  const cp = { h: SLAG[4], m: SLAG[2], d: SLAG[1], k: SLAG[0], g: HOT[2], s: SH };
  GS.cinder.push(stampRows(['hm', 'ks'], cp), stampRows(['.h.', 'mdk', '.ks'], cp), stampRows(['hd', '.s'], cp), stampRows(['m.h', 'ks.', '..s'], cp), stampRows(['.hm.', 'mdgk', '.kks'], cp), stampRows(['h', 'k'], cp), stampRows(['hmd', 'dkk', '.ss'], cp));
  const pb = { h: BAS[6], l: BAS[5], m: BAS[4], d: BAS[2], s: SH };
  GS.peb.push(stampRows(['.hl.', 'hmmd', '.dds'], pb), stampRows(['hl', 'md', '.s'], pb), stampRows(['hlm', 'mdd', '.ss'], pb), stampRows(['.h.', 'lmd', '.ds'], pb), stampRows(['.hll', 'hmmd', 'mdds'], pb));
  GS.pebL.push(stampRows(['.hhl..', 'hllmd.', 'lmmmdd', '.dddds', '..sss.'], pb), stampRows(['..hl..', '.hlmm.', 'hlmmmd', 'lmmmdd', '.dddss'], pb), stampRows(['.hhhl.', 'hlmmmd', '.ddddd', '..ssss'], pb));
  // Trittplatten: flache, in die Asche eingesunkene Steinplatten
  for (let k = 0; k < 8; k++) {
    const r = rng(9000 + k * 13), w = 9 + ((r() * 7) | 0), h = 5 + ((r() * 4) | 0), p = new Px(w + 3, h + 3), t = 2 + ((r() * 2) | 0);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const cut = (x === 0 || x === w - 1) && (y === 0 || y === h - 1);
      if (cut || (r() < 0.06 && (x < 2 || x > w - 3 || y === 0))) continue;
      p.set(x + 1, y, y === 0 ? SLABR[t + 2] : x === 0 ? SLABR[t + 1] : y === h - 1 ? SLABR[t - 1] : x === w - 1 ? SLABR[t - 1] : r() < 0.1 ? SLABR[t - 1] : r() > 0.92 ? SLABR[t + 1] : SLABR[t]);
    }
    for (let x = 1; x < w + 1; x++) { p.set(x + 1, h, alpha(INK, 110)); if (x % 3) p.set(x + 1, h + 1, alpha(INK, 50)); }
    for (let y = 1; y < h; y++) p.set(w + 1, y, alpha(INK, 80));
    if (r() < 0.6) { const cx = 3 + ((r() * (w - 5)) | 0); for (let y = 1; y < h - 1; y++) p.set(cx + 1 + ((y * 0.6) | 0), y, SLABR[t - 2]); }
    GS.slab.push(stampOf(p, (w + 3) >> 1, h >> 1));
  }
  // Steinmännchen am Wegrand
  for (let k = 0; k < 5; k++) {
    const r = rng(9100 + k * 17), p = new Px(11, 13), n = 3 + (k % 2);
    p.ell(6.2, 11, 4.2, 1.5, alpha(INK, 100));
    let y = 9.6, rw = 3.6;
    for (let j = 0; j < n; j++) { const rh = 1.5 + r() * 0.5; p.ball(5 + (r() - 0.5) * 1.2, y, rw, rh, j % 2 ? SLABR : BAS, 1, 5 + (j % 2 ? 0 : 1), 0.08); y -= rh * 1.55; rw *= 0.72; }
    GS.cairn.push(stampOf(p, 5, 10));
  }
  for (let k = 0; k < 6; k++) {
    const r = rng(9200 + k * 19), p = new Px(15, 10), rw = 3 + r() * 3.5, rh = 2 + r() * 2;
    for (let y = 0; y < 10; y++) for (let x = 0; x < 15; x++) {
      const nx = (x - 7) / rw, ny = (y - 4.5) / rh, d = nx * nx + ny * ny + (r() - 0.5) * 0.5;
      if (d < 0.45) p.set(x, y, alpha(INK, 105)); else if (d < 1) p.set(x, y, alpha(INK, (x + y) & 1 ? 70 : 40));
    }
    GS.scorch.push(stampOf(p, 7, 5));
  }
  const ep = { c: HOT[5], y: HOT[4], o: HOT[3], r: HOT[2], d: HOT[0], a: alpha(HOT[2], 90), b: alpha(HOT[2], 45), k: CRUST[1] };
  GS.ember.push(
    stampRows(['.b.', 'bya', '.a.'], ep, 1, 1), stampRows(['.ab.', 'aoyb', 'bryo', '.ab.'], ep, 1, 1), stampRows(['.b..', 'ayk.', 'bkoa', '..ab'], ep, 1, 1),
    stampRows(['..ab..', '.kyoa.', 'aocyrb', 'bryok.', '.bab..'], ep, 2, 2), stampRows(['y'], ep, 0, 0), stampRows(['o.', '.y'], ep, 0, 0), stampRows(['.a.', 'aca', 'bob', '.b.'], ep, 1, 1),
  );
  // Spritzsteine: dunkle Brocken mit glühender Unterseite
  for (let k = 0; k < 6; k++) {
    const r = rng(9300 + k * 23), sw = 3 + ((r() * 5) | 0), sh = 2 + ((r() * 3) | 0), p = new Px(sw + 6, sh + 6), cx = 3 + sw / 2, cy = 2 + sh / 2;
    p.ell(cx, cy + 1.3, sw / 2 + 0.4, sh / 2 + 0.3, HOT[2]);
    p.ball(cx, cy, sw / 2, sh / 2, CRUST, 0, 4, 0.05);
    halo(p, HOT[2], 80, 35);
    GS.spatter.push(stampOf(p, Math.round(cx), Math.round(cy + sh / 2)));
  }
  const tw = { a: mix(P.wood[1], ASHN[1], 0.4), b: mix(P.wood[0], INK, 0.2), l: mix(P.wood[3], ASHN[4], 0.5), s: alpha(INK, 70) };
  GS.twig.push(stampRows(['l....', '.ab..', '..sab', '....s'], tw), stampRows(['...la', '.lab.', 'ab.s.', '.s...'], tw), stampRows(['lab', '.ss'], tw), stampRows(['.l..l', '..ab.', '.ab..', 'ab.s.'], tw));
  const bp = { b: P.bone[3], B: P.bone[2], d: P.bone[1], s: alpha(INK, 70) };
  GS.bone.push(stampRows(['b..b', '.BB.', 'b.sB', '...s'], bp), stampRows(['bBBd', '.sss'], bp), stampRows(['.b.', 'bBd', '.ds'], bp));
  const cr = { d: BAS[1], D: BAS[0], l: ASHN[5] };
  GS.crack.push(
    stampRows(['d.......', '.Dd.....', '..lD....', '...dD.d.', '....lDd.', '......D.', '......lD'], cr, 3, 3), stampRows(['......d', '....dD.', '...Dl..', '.dD....', 'Dl.....', 'd......'], cr, 3, 3),
    stampRows(['..d......', '.D.......', '.lDd.....', '...lDdD..', '......lDd', '....d....', '...D.....'], cr, 4, 3), stampRows(['Dd........', '.lDDd.....', '....lDd...', '......lDDd', '.........l'], cr, 5, 2),
  );
  const rp = { a: ASHN[5], b: ASHN[2] };
  GS.ripple.push(stampRows(['.aaaa..', 'a.bbbaa', '.....bb'], rp, 3, 1), stampRows(['..aaa', 'aabbb', 'bb...'], rp, 2, 1), stampRows(['aaa...', 'bbbaaa', '...bbb'], rp, 3, 1));
  // Basaltschutt am Wandfuß: abgebrochene Säulenstücke
  for (let k = 0; k < 8; k++) {
    const r = rng(9400 + k * 29), p = new Px(18, 10), n = 2 + ((r() * 3) | 0);
    for (let j = 0; j < n; j++) {
      const x = 2 + j * (12 / n) + ((r() * 2) | 0), w = 3 + ((r() * 3) | 0), h = 3 + ((r() * 3) | 0), y = 7 - h;
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) p.set(x + xx, y + yy, yy === 0 ? BAS[6] : xx === 0 ? BAS[5] : xx === w - 1 ? BAS[2] : yy === 1 ? BAS[5] : BAS[3 + (j & 1)]);
      for (let xx = 0; xx <= w; xx++) p.set(x + xx + 1, y + h, SH);
      for (let yy = 1; yy < h; yy++) p.set(x + w, y + yy, alpha(INK, 70));
    }
    GS.talus.push(stampOf(p, 9, 7));
  }
  // Lavaader in einer Wandspalte (Anker oben)
  for (let k = 0; k < 6; k++) {
    const r = rng(9500 + k * 31), hh = 7 + ((r() * 12) | 0), p = new Px(9, hh + 2);
    let x = 4;
    for (let y = 0; y < hh; y++) { if (r() < 0.4) x += r() < 0.5 ? -1 : 1; x = Math.max(2, Math.min(6, x)); const t = Math.sin((y / hh) * Math.PI); p.set(x, y + 1, t > 0.75 ? HOT[5] : t > 0.4 ? HOT[4] : HOT[3]); if (t > 0.6 && r() < 0.6) p.set(x + (r() < 0.5 ? -1 : 1), y + 1, HOT[2]); }
    halo(p, HOT[2], 95, 40);
    GS.vein.push(stampOf(p, 4, 0));
  }
  const ip = { o: IRON[0], h: IRON[6], l: IRON[5], m: IRON[4], d: IRON[2], k: IRON[1], s: alpha(INK, 90), c: IRON[5], C: IRON[3] };
  GS.post.push(
    stampRows(['.ooo.', 'ohhlo', 'olmdo', 'ocCco', 'olmdo', 'omdko', 'omdko', '.ooos', '..sss'], ip, 2, 7),
    stampRows(['.ooo.', 'ohhlo', 'olmdo', 'ocCco', 'olmdo', 'olmdo', 'omdko', 'omdko', 'odkko', '.ooos', '..sss'], ip, 2, 9),
  );
  // ------------------------------------------------------------ Aschenschmiede
  const vp = { o: IRON[0], f: IRON[4], F: IRON[5], d: IRON[2], g: HOT[3], G: HOT[4], r: HOT[2], k: mix(HOT[0], INK, 0.4), a: alpha(HOT[2], 80), b: alpha(HOT[2], 40) };
  GS.vent.push(
    stampRows(['.bbbbbbbbbbbb.', 'baFFFFFFFFFFab', 'bFooooooooooFb', 'bfoGogoGogorfb', 'bfogoGogorokfb', 'bfoGogorogokfb', 'bfogorogokokfb', 'bfooooooooooda', 'bdddddddddddda', '.aaaaaaaaaaaa.', '..bbbbbbbbbb..'], vp, 7, 9),
    stampRows(['..bbbbbbbb..', '.baFFFFFFab.', 'bFFooooooFFb', 'bfoGgGgGgofb', 'bfogrgrgrofb', 'bfoGgGgrkofb', 'bfogrgrkkofb', 'bfdoooooodfa', '.adddddddda.', '..aaaaaaaa..'], vp, 6, 8),
  );
  const rl = { o: mix(BAS[0], INK, 0.2), l: BAS[5], m: BAS[3], d: BAS[1], g: P.gold[2], G: P.gold[3] };
  GS.relief.push(
    // Amboss
    stampRows(['llllllllllllll', 'lddddddddddddo', 'ld.mmmmmmmm.do', 'ldmllllllllmoo', 'ld.mmmmmmmmo.o', 'ld...mllmo...o', 'ld...mllmo...o', 'ld..mllllmo..o', 'ld.mllllllmo.o', 'ld.oooooooo..o', 'loooooooooooo.'], rl, 7, 10),
    // Hammer
    stampRows(['llllllllllllll', 'lddddddddddddo', 'ld.mmmmmmm..do', 'ldmlllllllm.oo', 'ldmlllllllmo.o', 'ld.ooomlooo..o', 'ld....mlo....o', 'ld....mlo....o', 'ld....mGo....o', 'ld....ooo....o', 'loooooooooooo.'], rl, 7, 10),
    // Siegelring
    stampRows(['llllllllllllll', 'lddddddddddddo', 'ld...mGGm...do', 'ld.mGo..oGm.oo', 'ldmGo.mm.oGm.o', 'ldGo.mGGm.oG.o', 'ldmGo.mm.oGm.o', 'ld.mGo..oGm..o', 'ld...mGGm....o', 'ld...........o', 'loooooooooooo.'], rl, 7, 10),
  );
  const gp = { o: IRON[0], b: IRON[4], B: IRON[5], k: mix(INK, HOT[0], 0.3), r: HOT[1], g: HOT[2], d: IRON[2] };
  GS.grate.push(
    stampRows(['BBBBBBBBBBBBBB', 'BooooooooooooD', 'BokbkrbkbkrbkD', 'BokbkgbkbkrbkD', 'BokbrgbkbkkbkD', 'BokbkrbkbrkbkD', 'BokbkkbkbgkbkD', 'BokbkkbrbgrbkD', 'BokbkrbkbrkbkD', 'BokbkkbkbkkbkD', 'BooooooooooooD', 'BDDDDDDDDDDDDD'].map((s) => s.replace(/D/g, 'd')), gp, 7, 6),
  );
  const rb = { h: BAS[6], l: BAS[5], m: BAS[4], d: BAS[2], s: SH, g: HOT[2] };
  GS.rubble.push(stampRows(['.hl.', 'lmmd', '.dds'], rb), stampRows(['hl', 'md', '.s'], rb), stampRows(['.hhl..', 'hlmmd.', 'lmmmdd', '.dddss'], rb), stampRows(['hl..h.', 'ds.lmd', '....ds'], rb), stampRows(['.h', 'ld', '.s'], rb));
}
