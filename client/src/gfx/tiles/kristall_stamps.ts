/**
 * Kristallhöhlen – vorgezeichnete Kleinmotive: Kiesel, Risse, Pfützen, Kristallsplitter, Sinterhöcker, Flechtenpolster,
 * Leuchtpilze, Bohlenstege, Drusen, Sintervorhänge, Nässestreifen, Geröll, Scherbenfelder, Brückenpfosten.
 */
import { INK, P, WHITE, alpha, mix, rng } from '../palette';
import { Px, crystal } from '../draw';
import { stampOf, stampRows, type Stamp } from './core';
import { CYR, FACE, FLOWST, GRAV, LICH, MGR, PLANK, ROPE, SCUM, SLATE, VIR } from './kristall_pal';
import { halo, transpose } from './kristall_util';

export const KS = {
  peb: [] as Stamp[], pebL: [] as Stamp[], grit: [] as Stamp[], crack: [] as Stamp[], puddle: [] as Stamp[], shard: [] as Stamp[][],
  nub: [] as Stamp[], cushion: [] as Stamp[], fungi: [] as Stamp[], ring: [] as Stamp[], boardH: [] as Stamp[], boardV: [] as Stamp[], ore: [] as Stamp[],
  druse: [] as Stamp[][], druseS: [] as Stamp[][], streak: [] as Stamp[], curtain: [] as Stamp[], crackV: [] as Stamp[], talus: [] as Stamp[],
  haz: [] as Stamp[], post: [] as Stamp[], stone: [] as Stamp[], stoneWet: [] as Stamp[], glint: [] as Stamp[], grow: [] as Stamp[][],
};
const CR = [CYR, MGR, VIR];
const SH = alpha(INK, 85);

/** Schlanker Kristallsplitter von (bx, by) nach oben: Höhe hh, halbe Breite hw, Neigung lean (px an der Spitze). */
export function shard(p: Px, bx: number, by: number, hh: number, hw: number, lean: number, R: readonly number[]): void {
  for (let j = 0; j < hh; j++) {
    const f = hh > 1 ? j / (hh - 1) : 1, w = Math.round(hw * (f < 0.45 ? 1 : 1 - (f - 0.45) / 0.55)), cx = Math.round(bx + lean * f), y = by - j;
    for (let k = -w; k <= w; k++) {
      let col = k < 0 ? R[3] : k === 0 ? R[4] : R[2];
      if (w > 1 && k === w) col = R[1];
      if (j === 0) col = R[1];
      p.set(cx + k, y, col);
    }
    if (j === hh - 1) p.set(cx, y, WHITE);
  }
}
/** Druse: Kristallprismen, die strahlenförmig aus einem Punkt wachsen (für Wandfronten und Böden). */
function mkDruse(seed: number, R: readonly number[], big: boolean, up: boolean): Stamp {
  const r = rng(seed), w = big ? 19 : 11, h = big ? 17 : 10, p = new Px(w, h), cx = w >> 1, cy = up ? h - 3 : (h >> 1) + 1;
  const n = big ? 4 + ((r() * 3) | 0) : 3 + ((r() * 2) | 0);
  if (!up) p.ell(cx + 0.5, cy + 0.5, big ? 4.5 : 2.6, big ? 3 : 1.8, mix(R[0], INK, 0.5));
  const arms: Array<[number, number]> = [];
  for (let k = 0; k < n; k++) arms.push([(up ? -2.6 + (k / (n - 1)) * 2.1 : -3.3 + (k / n) * 3.6) + (r() - 0.5) * 0.4, (big ? 4.5 : 2.6) + r() * (big ? 4 : 2.2)]);
  arms.sort((a, b) => Math.sin(a[0]) - Math.sin(b[0]));
  for (const [a, len] of arms) {
    const tx = cx + Math.cos(a) * len * 1.1, ty = cy + Math.sin(a) * len * 0.9;
    crystal(p, cx + Math.cos(a) * 0.8, cy + Math.sin(a) * 0.5, tx, ty, big ? 1.7 : 1.1, R);
  }
  p.set(cx - 1, cy - 1, R[4]);
  halo(p, R[3], 70, 30);
  return stampOf(p, cx, cy);
}
function mkStone(seed: number, R: readonly number[], wet: boolean): Stamp {
  const r = rng(seed), sw = 4 + ((r() * 7) | 0), sh = 3 + ((r() * 3) | 0), p = new Px(sw + 4, sh + 5), cx = 2 + sw / 2, cy = 1 + sh / 2;
  p.ell(cx + 0.6, cy + 1.2, sw / 2 + 0.3, sh / 2 + 0.2, alpha(INK, wet ? 115 : 85));
  p.ball(cx, cy, sw / 2, sh / 2, R, wet ? 0 : 1, wet ? 4 : 5, 0.08);
  if (wet) { const y = Math.round(cy + sh / 2 + 1.2); for (let x = 1; x < sw + 3; x++) if (r() < 0.55) p.set(x, y, alpha(SCUM, 160)); }
  return stampOf(p, Math.round(cx), Math.round(cy + sh / 2));
}
/** Bohlensteg: n Bohlen quer zur Laufrichtung auf zwei Holmen (vert = Bohlen stehen senkrecht nebeneinander). */
function mkBoard(seed: number, vert: boolean): Stamp {
  const r = rng(seed), n = 5 + ((r() * 2) | 0), L = 24, p = new Px(n * 5 + 3, L + 3);
  for (let x = 0; x < p.w - 1; x++) { p.set(x, 6, PLANK[1]); p.set(x, 7, PLANK[0]); p.set(x, L - 6, PLANK[1]); p.set(x, L - 5, PLANK[0]); }
  for (let k = 0; k < n; k++) {
    if (r() < 0.08) continue;
    const x = 1 + k * 5, y0 = 1 + ((r() * 3) | 0), y1 = L - 1 - ((r() * 3) | 0), t = 3 + ((r() * 3) | 0), brk = r() < 0.14 ? y0 + 8 + ((r() * 6) | 0) : -1;
    for (let y = y0; y <= y1; y++) {
      if (y === brk) continue;
      for (let i = 0; i < 4; i++) p.set(x + i, y, PLANK[y === y0 ? Math.min(6, t + 1) : y === y1 ? 1 : i === 0 ? Math.min(6, t + 1) : i === 3 ? t - 1 : r() < 0.12 ? t - 1 : t]);
    }
    p.set(x + 1, 6, PLANK[0]); p.set(x + 2, L - 6, PLANK[0]);
    for (let i = 0; i < 4; i++) { p.set(x + i, y1 + 1, SH); p.set(x + i + 1, y1 + 2, alpha(INK, 45)); }
  }
  const q = vert ? p : transpose(p);
  return stampOf(q, q.w >> 1, q.h >> 1);
}

export function initKristallStamps(): void {
  if (KS.peb.length) return;
  const peb = { h: SLATE[6], l: SLATE[5], m: SLATE[4], d: SLATE[2], s: SH };
  KS.peb.push(
    stampRows(['.hl.', 'hmmd', '.dds'], peb), stampRows(['hl', 'md', '.s'], peb), stampRows(['hlm', 'mdd', '.ss'], peb),
    stampRows(['.h.', 'lmd', '.ds'], peb), stampRows(['hm', 'ds'], peb), stampRows(['.hll', 'hmmd', 'mdds'], peb),
  );
  const pebF = { h: FLOWST[6], l: FLOWST[5], m: FLOWST[4], d: FLOWST[2], s: SH };
  KS.peb.push(stampRows(['.hl.', 'hmmd', '.dds'], pebF), stampRows(['hl', 'md', '.s'], pebF), stampRows(['.h.', 'lmd', '.ds'], pebF));
  KS.pebL.push(
    stampRows(['.hhl..', 'hllmd.', 'lmmmdd', '.dddds', '..sss.'], peb), stampRows(['..hl..', '.hlmm.', 'hlmmmd', 'lmmmdd', '.dddss'], peb),
    stampRows(['.hhhl.', 'hlmmmd', '.ddddd', '..ssss'], pebF), stampRows(['.hl....', 'hlmmd..', 'lmmmdhl', '.dddsmd', '..ss.ds'], peb),
  );
  const gr = { d: GRAV[1], D: GRAV[0], h: GRAV[5], l: GRAV[4] };
  KS.grit.push(stampRows(['d.', '.h'], gr), stampRows(['hd'], gr), stampRows(['l', 'd'], gr), stampRows(['.d', 'h.', '..', 'd.'], gr), stampRows(['lD'], gr), stampRows(['d..h'], gr), stampRows(['lh', 'dD'], gr), stampRows(['.hl', 'ldD'], gr));
  const cp = { d: SLATE[1], D: SLATE[0], l: SLATE[5] };
  KS.crack.push(
    stampRows(['d.......', '.Dd.....', '..lD....', '...dD.d.', '....lDd.', '......D.', '......lD'], cp, 3, 3),
    stampRows(['......d', '....dD.', '...Dl..', '.dD....', 'Dl.....', 'd......'], cp, 3, 3),
    stampRows(['..d......', '.D.......', '.lDd.....', '...lDdD..', '......lDd', '....d....', '...D.....'], cp, 4, 3),
    stampRows(['d..', 'lD.', '.d.', '.lD', '..d'], cp, 1, 2),
    stampRows(['Dd........', '.lDDd.....', '....lDd...', '......lDDd', '.........l'], cp, 5, 2),
  );
  const pd = { o: SLATE[1], w: mix(P.teal[1], SLATE[3], 0.35), k: mix(P.teal[0], SLATE[1], 0.5), h: mix(P.teal[4], WHITE, 0.35), g: P.teal[3], r: SLATE[5] };
  KS.puddle.push(
    stampRows(['..ooooo..', '.owwhhwo.', 'owgwwwkko', '.okkkkkor', '..oooorr.'], pd), stampRows(['.oooo..', 'owhhwo.', 'owwwkko', '.okkkor', '..oorr.'], pd),
    stampRows(['...oooooo...', '.oowwwhhwoo.', 'owwgwwwwwkko', 'okkwwwkkkkor', '.ookkkkkoorr', '...oooorr...'], pd), stampRows(['.ooo.', 'owhko', '.oor.'], pd),
  );
  // Kristallsplitter am Boden (0 cyan, 1 magenta, 2 violett)
  CR.forEach((R, ci) => {
    const list: Stamp[] = [];
    for (let k = 0; k < 8; k++) {
      const r = rng(7000 + ci * 53 + k * 11), p = new Px(11, 11), n = 1 + ((r() * 3) | 0);
      p.set(4, 9, SH); p.set(5, 9, SH); p.set(6, 9, SH);
      for (let j = 0; j < n; j++) shard(p, 4 + j * 2 + ((r() * 2) | 0), 8, 3 + ((r() * 5) | 0), r() < 0.3 ? 1 : 0, ((r() * 3) | 0) - 1, R);
      halo(p, R[3], 46, 0);
      list.push(stampOf(p, 5, 8));
    }
    KS.shard.push(list);
    KS.druse.push(Array.from({ length: 6 }, (_, k) => mkDruse(7200 + ci * 61 + k * 13, R, true, false)));
    KS.druseS.push(Array.from({ length: 6 }, (_, k) => mkDruse(7300 + ci * 67 + k * 17, R, false, false)));
    KS.grow.push(Array.from({ length: 6 }, (_, k) => mkDruse(7400 + ci * 71 + k * 19, R, k % 2 === 0, true)));
  });
  // Sinterhöcker (kleine Stalagmiten)
  for (let k = 0; k < 6; k++) {
    const r = rng(7500 + k * 7), p = new Px(9, 10), hh = 3 + ((r() * 4) | 0);
    p.ell(5, 8.2, 3.2, 1.3, SH);
    for (let j = 0; j < hh; j++) { const w = Math.round((1 - j / hh) * 2.2), y = 7 - j; for (let i = -w; i <= w; i++) p.set(4 + i, y, i < 0 ? FLOWST[5] : i === 0 ? FLOWST[j === hh - 1 ? 6 : 4] : FLOWST[2]); }
    KS.nub.push(stampOf(p, 4, 7));
  }
  // Flechtenpolster
  for (let k = 0; k < 10; k++) {
    const r = rng(7600 + k * 9), p = new Px(13, 9), rw = 2.4 + r() * 3.2, rh = 1.5 + r() * 1.6;
    p.ell(6.8, 4.9, rw + 0.2, rh + 0.2, alpha(mix(LICH[0], INK, 0.4), 150));
    p.ball(6, 4, rw, rh, LICH, k % 3 === 0 ? 2 : 1, k % 3 === 0 ? 5 : 4);
    if (r() < 0.5) p.set(6 - rw * 0.4, 4 - rh * 0.5, LICH[5]);
    KS.cushion.push(stampOf(p, 6, 4));
  }
  // Leuchtpilze / Leuchtpunkte
  const fg = (core: number, glow: number): Record<string, number> => ({ c: core, g: glow, a: alpha(glow, 95), b: alpha(glow, 45), s: mix(LICH[0], INK, 0.3) });
  for (const pal of [fg(mix(P.teal[4], WHITE, 0.5), P.teal[3]), fg(mix(P.green[4], WHITE, 0.4), mix(P.green[4], P.teal[3], 0.5)), fg(P.pink[4], P.pink[3])]) {
    KS.fungi.push(stampRows(['.b.', 'bcb', '.a.'], pal, 1, 1), stampRows(['.bab.', 'bagab', 'agcga', 'bagab', '.bsb.'], pal, 2, 2), stampRows(['.a..b.', 'aca.cb', '.s.bab', '...acb', '....s.'], pal, 2, 2), stampRows(['bab', 'gcg', 'bsb'], pal, 1, 1));
  }
  const rp = { a: alpha(SCUM, 120), b: alpha(SCUM, 65) };
  KS.ring.push(stampRows(['.baaab.', 'a.....a', '.baaab.'], rp), stampRows(['.aab.', 'b...a', '.baa.'], rp), stampRows(['baaaab'], rp), stampRows(['.bab.', 'a...a', 'b...b', '.aba.'], rp));
  for (let k = 0; k < 4; k++) { KS.boardV.push(mkBoard(7700 + k * 23, true)); KS.boardH.push(mkBoard(7750 + k * 29, false)); }
  const op = { g: P.gold[2], G: P.gold[3], k: P.gold[0], c: CYR[3], C: CYR[4], d: GRAV[0], s: SH };
  KS.ore.push(stampRows(['.G.', 'gkg', '.ds'], op), stampRows(['Gg', 'ks'], op), stampRows(['.C', 'cd', '.s'], op), stampRows(['g..G', '.dk.', '..s.'], op), stampRows(['Cc.', '.dG', '..s'], op));
  // Wandmotive
  for (let k = 0; k < 6; k++) {
    const r = rng(7800 + k * 31), hh = 8 + ((r() * 14) | 0), p = new Px(4, hh + 2);
    let x = 1;
    for (let y = 0; y < hh; y++) { if (y % 5 === 4 && r() < 0.5) x += r() < 0.5 ? -1 : 1; x = Math.max(1, Math.min(2, x)); p.set(x, y, alpha(mix(INK, P.teal[0], 0.5), 105)); if (y % 3 !== 2) p.set(x - 1, y, alpha(P.ice[2], y < 3 ? 110 : 60)); }
    p.set(x, hh, alpha(P.ice[3], 200)); p.set(x, hh + 1, alpha(P.ice[4], 120));
    KS.streak.push(stampOf(p, 1, 0));
  }
  for (let k = 0; k < 8; k++) {
    const r = rng(7900 + k * 37), w = 7 + ((r() * 8) | 0), hm = 8 + ((r() * 12) | 0), p = new Px(w + 2, hm + 3), ph = r() * 6;
    for (let x = 0; x < w; x++) {
      const fold = Math.sin(x * 1.25 + ph), edge = Math.sin((x / (w - 1)) * Math.PI), len = Math.max(2, Math.round(hm * (0.35 + 0.65 * edge) * (0.72 + 0.28 * Math.sin(x * 2.1 + ph * 2))));
      for (let y = 0; y < len; y++) p.set(x, y, y === 0 ? FLOWST[6] : y >= len - 1 ? FLOWST[3] : fold > 0.45 ? FLOWST[6] : fold > -0.2 ? FLOWST[5] : fold > -0.7 ? FLOWST[4] : FLOWST[3]);
      p.set(x, len, alpha(INK, 90)); if (x === w - 1) for (let y = 1; y < len; y++) p.set(x + 1, y, alpha(INK, 70));
    }
    KS.curtain.push(stampOf(p, w >> 1, 0));
  }
  for (let k = 0; k < 6; k++) {
    const r = rng(8000 + k * 41), hh = 6 + ((r() * 11) | 0), p = new Px(7, hh);
    let x = 3;
    for (let y = 0; y < hh; y++) { if (r() < 0.45) x += r() < 0.5 ? -1 : 1; x = Math.max(1, Math.min(4, x)); p.set(x, y, FACE[0]); if (y % 3 !== 0) p.set(x + 1, y, FACE[5]); if (y === (hh >> 1) && r() < 0.6) { p.set(x - 1, y + 1, FACE[0]); p.set(x - 2, y + 2, FACE[1]); } }
    KS.crackV.push(stampOf(p, 3, 0));
  }
  for (let k = 0; k < 8; k++) {
    const r = rng(8100 + k * 43), p = new Px(18, 10), n = 3 + ((r() * 3) | 0);
    for (let j = 0; j < n; j++) {
      const x = 3 + j * (11 / n) + r() * 2, sw = 2 + r() * 2.6, sh = 1.4 + r() * 1.6, y = 6.2 - sh + r() * 1.2;
      p.ell(x + 0.7, y + sh * 0.5 + 0.9, sw, sh * 0.8, SH);
      p.ball(x, y, sw, sh, j % 3 === 2 ? SLATE : FACE, 1, 6, 0.06);
    }
    KS.talus.push(stampOf(p, 9, 7));
  }
  // Scherbenfeld (Gefahr): hohe, rasiermesserscharfe Splitter
  for (let k = 0; k < 8; k++) {
    const r = rng(8200 + k * 47), p = new Px(22, 20), n = 4 + ((r() * 3) | 0);
    for (let x = 3; x < 19; x++) if (r() < 0.75) p.set(x, 17 + ((r() * 2) | 0), alpha(INK, 110));
    const xs = Array.from({ length: n }, (_, j) => 3 + (j / (n - 1)) * 15 + (r() - 0.5) * 2).sort(() => r() - 0.5);
    xs.forEach((x, j) => shard(p, Math.round(x), 16 + (j % 2), 5 + ((r() * 11) | 0), r() < 0.45 ? 1 : r() < 0.2 ? 2 : 0, ((r() * 5) | 0) - 2, j % 4 === 3 ? MGR : j % 5 === 4 ? VIR : CYR));
    halo(p, CYR[3], 60, 0);
    KS.haz.push(stampOf(p, 11, 16));
  }
  const pp = { o: PLANK[0], h: PLANK[6], l: PLANK[5], m: PLANK[4], d: PLANK[2], k: PLANK[1], s: alpha(INK, 90), r: ROPE[3], R: ROPE[1] };
  KS.post.push(
    stampRows(['.ooo.', 'ohhlo', 'olmdo', 'orrRo', 'oRrRo', 'olmdo', 'omdko', 'omdko', '.ooos', '..sss'], pp, 2, 8),
    stampRows(['.ooo.', 'ohhlo', 'olmdo', 'orrRo', 'oRrRo', 'olmdo', 'olmdo', 'omdko', 'omdko', 'omdko', 'odkko', '.ooos', '..sss'], pp, 2, 11),
  );
  for (let k = 0; k < 8; k++) { KS.stone.push(mkStone(8300 + k * 31, k % 3 === 0 ? FLOWST : SLATE, false)); KS.stoneWet.push(mkStone(8400 + k * 37, SLATE, true)); }
  // schwache Kristallfunken im Dunkel der Wandoberseiten
  for (const R of CR) {
    const g = { a: R[2], b: R[1], c: R[3], h: alpha(R[2], 50) };
    KS.glint.push(stampRows(['.h.', 'hah', '.b.'], g, 1, 1), stampRows(['c', 'b'], g, 0, 0), stampRows(['.a', 'cb', '.b'], g, 0, 1), stampRows(['a.b', '.c.'], g, 1, 0));
  }
}
