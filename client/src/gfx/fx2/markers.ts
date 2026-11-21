/** Weltmarker (farbig, knackig, dunkle Kontur): Questzeichen, Sprechblase, Auswahl-Ellipse, Pfeil, Status-Icons. */
import type { Px } from '../draw';
import { INK, P, WHITE, mix } from '../palette';
import { G, WH, anim, ering, one } from './kit';
import type { Item } from './kit';
import { bmp } from './particles';

const EX = ['............', '....hhhh....', '...hmmmms...', '...hmmmms...', '...hmmmms...', '...hmmmms...', '....hmms....', '....hmms....', '....hmms....', '.....ms.....', '.....ms.....', '............', '............', '....hmm.....', '...hmmms....', '...hmmms....', '....mss.....', '............'];
const QU = ['............', '...hhhhh....', '..hmmmmms...', '..hms..mms..', '..hms..mms..', '.......mms..', '......mms...', '.....mms....', '....hms.....', '....hms.....', '....hms.....', '............', '............', '....hmm.....', '...hmmms....', '...hmmms....', '....mss.....', '............'];

export function markerItems(out: Item[]): void {
  const mark = (name: string, rows: readonly string[], r: readonly number[]): void => one(out, name, 12, 18, (p) => {
    bmp(p, 0, 0, rows, { h: r[4], m: r[3], s: r[2] });
    p.outline(mix(r[0], INK, 0.55));
    p.set(4, 2, WHITE);
  });
  mark('exclaim', EX, P.gold); mark('question', QU, P.gold); mark('question_grey', QU, P.steel);
  one(out, 'bubble', 16, 14, (p) => {
    p.rrect(1, 1, 14, 9, WHITE); p.rect(2, 9, 12, 1, P.snow[2]); p.rect(14, 3, 1, 6, P.snow[2]);
    p.poly([[4, 10], [4, 13], [8, 10]], WHITE); p.set(4, 11, P.snow[2]);
    for (const x of [4, 7, 10]) { p.rect(x, 5, 2, 2, P.steel[1]); p.set(x, 5, P.steel[2]); }
    p.outline(P.steel[0]);
  });
  // Auswahl-Ellipse (tintbar): vier Klammersegmente, vorn heller
  one(out, 'target', 28, 14, (p) => {
    ering(p, 14, 7, 13.6, 6.6, 2.2, (a, e) => {
      if (Math.abs(Math.sin(a * 2)) > 0.86) return 0;
      return Math.sin(a) > -0.2 ? (e < 0.55 ? WH : G(0.8)) : e < 0.55 ? G(0.86) : G(0.66);
    });
    for (const [x, y] of [[0, 7], [27, 6], [13, 0], [14, 13]] as const) p.set(x, y, WH);
  });
  anim(out, 'arrow_marker', 2, 12, 12, (p, k) => {
    const g = P.gold;
    bmp(p, 0, k, ['............', '...hmmmms...', '...hmmmms...', '...hmmmms...', '...hmmmms...', '.hhhmmmmsss.', '..hmmmmmms..', '...hmmmms...', '....hmms....', '.....ms.....'], { h: g[4], m: g[3], s: g[2] });
    p.outline(mix(g[0], INK, 0.55));
    p.set(4, 1 + k, WHITE);
  });
  const status = (name: string, rows: readonly string[], map: Record<string, number>, o: number): void => one(out, name, 8, 8, (p: Px) => { bmp(p, 0, 0, rows, map); p.outline(o); });
  const f = P.fire, b = P.blue, g = P.gold, gr = P.green, r = P.red, st = P.steel;
  status('status_burn', ['........', '...o....', '..oo.o..', '..oyoo..', '.oyyyo..', '.oywyo..', '..oyo...', '........'], { o: f[2], y: f[3], w: f[4] }, mix(f[0], INK, 0.4));
  status('status_slow', ['........', '..hbbb..', '..bwwd..', '...wd...', '...bd...', '..bwwd..', '..bbbd..', '........'], { h: b[4], b: b[3], d: b[2], w: WHITE }, mix(b[0], INK, 0.4));
  status('status_stun', ['........', '...y....', '...yy...', '.yywyyy.', '..ywyo..', '..yoyo..', '.yo..oo.', '........'], { y: g[4], o: g[3], w: WHITE }, mix(g[0], INK, 0.4));
  status('status_poison', ['........', '...g....', '..ghg...', '..ggg...', '.ghggd..', '.gwggd..', '..gdd...', '........'], { g: gr[3], h: gr[4], d: gr[2], w: WHITE }, mix(gr[0], INK, 0.4));
  status('status_buff', ['........', '...hr...', '..hrrd..', '.hrrrrd.', '...rd...', '...rd...', '...rd...', '........'], { r: r[3], h: r[4], d: r[2] }, mix(r[0], INK, 0.4));
  status('status_shield', ['........', '.hsssss.', '.hsbbsd.', '.hsbbsd.', '.hsbbsd.', '..ssdd..', '...sd...', '........'], { s: st[3], h: st[4], d: st[2], b: b[3] }, mix(st[0], INK, 0.4));
}
