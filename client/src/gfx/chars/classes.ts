/** Die fünf spielbaren Klassen: Pixelkarten, Ausrüstung und klassenspezifische Angriffsposen. */
import { P, WHITE, alpha, mix } from '../palette';
import { BUILD, art, cape, head, legend, mixR, ribbon } from './rig';
import type { Costume, Dir, K, LayerFn, Pose, V2 } from './rig';
import type { Px } from '../draw';
import { bow, dagger, hammer, shieldFront, shieldSide, staff, sword, tipGlow } from './weapons';

type PP = Partial<Pose>;
type Tab = Record<string, PP[][]>;
/** Posentabelle [Blickrichtung][Frame] je Animation */
const table = (t: Tab) => (anim: string, dir: Dir, f: number): PP | null => t[anim]?.[dir]?.[f] ?? null;

/** Geflochtener Zopf: n Zeilen ab (x,y), Schrittrichtung d, Pendel sw. */
function braid(l: Px, x: number, y: number, n: number, d: V2, sw: number, cA: number, cB: number, tie: number): void {
  for (let i = 0; i <= n; i++) {
    const t = i / n, px = Math.round(x + d[0] * i + sw * t * t * 1.5), py = Math.round(y + d[1] * i);
    if (i === n) { l.set(px, py, tie); l.set(px + 1, py, tie); l.set(px, py + 1, cB); break; }
    l.set(px, py, i % 2 ? cA : cB); l.set(px + 1, py, i % 2 ? cB : cA);
  }
}

// ================================================================ Krieger
const K_HAIR = mixR(P.wood, P.red, 0.42);
const kLg = legend(P.skin, K_HAIR, [P.red, P.steel, P.gold, P.wood]);
const kTab: Tab = {
  attack: [
    [ // unten: Hieb von links nach rechts vor dem Körper
      { mh: [-2, 0], wa: -112.5, lean: -1, oh: [2, 5], fa: [-1, 0, 0] },
      { mh: [3, 3], wa: 135, y: 1, oh: [3, 3], fa: [0, 0, 1], tr: 2, tag: 'wtop' },
      { mh: [8, 3], wa: 22.5, y: 1, lean: 1, oh: [3, 2], fa: [0, 0, 1], tr: 2, sw: -1, tag: 'wtop' },
      { mh: [5, 5], wa: 67.5, lean: 1, oh: [2, 4], sw: 1, tag: 'wtop' },
    ],
    [ // Seite: von hinten oben nach vorn
      { mh: [-4, 0], wa: -135, lean: -1, oh: [4, 3], fa: [2, 0, 0], fb: [-2, 0, 0] },
      { mh: [3, 1], wa: 0, lean: 2, x: -3, y: 1, oh: [1, 4], fa: [5, 0, 0], fb: [-3, 0, 0], tr: 2 },
      { mh: [4, 4], wa: 45, lean: 2, x: -2, y: 1, oh: [0, 4], fa: [4, 0, 0], fb: [-3, 0, 0], tr: 2, sw: 1 },
      { mh: [3, 4], wa: -22.5, lean: 1, x: -1, oh: [2, 4], fa: [3, 0, 0], fb: [-2, 0, 0], sw: -1 },
    ],
    [ // oben: Klinge über/hinter dem Kopf sichtbar
      { mh: [2, 0], wa: -67.5, lean: 1, fa: [1, 0, 0] },
      { mh: [-3, -5], wa: -90, y: 1, tr: 2 },
      { mh: [-9, 1], wa: -135, y: 1, lean: -1, tr: 2, sw: 1 },
      { mh: [-6, 4], wa: -157.5, lean: -1, sw: -1, x: 1 },
    ],
  ],
  heavy: [
    [
      { mh: [-1, -3], wa: -67.5, two: -2, y: 1, lean: -1, tag: 'two' },
      { mh: [0, -5], wa: -90, two: -2, hy: -1, tag: 'two', up: 1 },
      { mh: [5, -2], wa: 90, two: -2, y: 2, hy: 1, tag: 'two wtop', tr: 3, fa: [-1, 0, 1], fb: [1, 0, 0] },
      { mh: [5, 0], wa: 112.5, two: -2, y: 3, hy: 1, tag: 'two wtop', tr: 2, fa: [-1, 0, 1], fb: [1, 0, 0] },
      { mh: [3, 2], wa: 135, y: 1, tag: 'wtop', sw: 1 },
    ],
    [
      { mh: [-3, -3], wa: -135, two: -2, lean: -2, y: 1, fa: [2, 0, 0], fb: [-3, 0, 0], tag: 'two' },
      { mh: [-1, -6], wa: -90, two: -2, lean: -1, hy: -1, fa: [2, 0, 0], fb: [-3, 0, 0], tag: 'two', up: 1 },
      { mh: [4, 0], wa: 22.5, two: -2, lean: 3, x: -3, y: 2, fa: [5, 0, 0], fb: [-4, 0, 0], tag: 'two', tr: 3 },
      { mh: [4, 2], wa: 45, two: -2, lean: 3, x: -2, y: 3, fa: [5, 0, 0], fb: [-4, 0, 0], tag: 'two', tr: 2 },
      { mh: [3, 3], wa: 22.5, lean: 1, x: -1, y: 1, fa: [3, 0, 0], fb: [-2, 0, 0], tag: 'two', sw: 1 },
    ],
    [
      { mh: [0, -3], wa: -112.5, two: -2, y: 1, lean: 1, tag: 'two' },
      { mh: [0, -6], wa: -90, two: -2, hy: -1, tag: 'two', up: 1 },
      { mh: [-4, -5], wa: -90, two: -2, y: 2, hy: 1, tag: 'two', tr: 3 },
      { mh: [-5, 1], wa: -157.5, two: -2, y: 3, hy: 2, tag: 'two', tr: 2 },
      { mh: [-2, 4], wa: -157.5, y: 1, tag: 'two', sw: 1 },
    ],
  ],
};
function kBand(k: K, L: LayerFn): void {
  const { dir, ps, headX: hx, neckY: ny } = k, r = P.red;
  L((l) => {
    if (dir === 0) { l.rect(hx + 6, ny - 6, 1, 2, r[2]); ribbon(l, hx + 7, ny - 5, 3 + ps.tr, [0.4 + ps.tr * 0.2, 1], 1, ps.sw, 1, r[2], r[1]); }
    else if (dir === 1) { ribbon(l, hx - 7, ny - 6, 4 + ps.tr, [-1, 0.25 - ps.tr * 0.1], 1.2, ps.sw, 1, r[2], r[1]); ribbon(l, hx - 7, ny - 5, 3 + ps.tr, [-1, 0.6 - ps.tr * 0.15], 1.2, ps.sw + 1, 1, r[1], r[1]); }
    else { l.rect(hx - 1, ny - 6, 2, 2, r[3]); l.set(hx, ny - 5, r[2]); const s = ps.sw > 0 ? 1 : 0; l.rect(hx - 2 - s, ny - 4, 1, 2, r[2]); l.set(hx - 3 - s, ny - 2, r[2]); l.rect(hx + 1 + s, ny - 4, 1, 3, r[3]); }
  }, dir !== 2);
}
export const krieger: Costume = {
  key: 'char_krieger', lg: kLg, B: BUILD,
  head: [
    head([
      '.....v..U.....',
      '...UvVvUvUu...',
      '..UvVvvUvUUu..',
      '.UvvvUvvUUUuu.',
      '.AbbAAAAAAAaa.',
      '.uUvUttUtUUuu.',
      '.u..........u.',
      '.u..........u.',
    ], 1),
    head([
      '....U..vU.....',
      '...UvVvvUUu...',
      '..UvVvvUvUUUu.',
      '.uUvvUvUUUUUu.',
      '.aAAAAAAAbbAA.',
      '.uUUvUUUtUttt.',
      '.uuUUUUt......',
      '.uuUUuUt......',
      '. uuUu........',
    ], 1),
    head([
      '.....v..U.....',
      '...UvVvUvUu...',
      '..UvVvvUvUUu..',
      '.UvvvUvvUUUuu.',
      '.AbbAAAAAAAaa.',
      '.UvvUUvUUUUuu.',
      '.UvUvUUUuUUuu.',
      '.uUUUUuUUUuuu.',
      '..uUuUUuUuuu..',
      '....uSuSSu....',
      '....SSSSSs....',
    ], 1),
  ],
  torso: [
    art([
      'CddddddC',
      'dAbAAAAc',
      'CAbAfAac',
      'CAAfFfac',
      'cAAAfAac',
      'gGhfEGGg',
      'cAbAAAac',
      'ccAbAacc',
      'cCAbAacc',
      '..AbAa..',
      '..AAAa..',
      '..EfEe..',
    ], 3),
    art([
      '.CddC.',
      'cAbAAC',
      'cAbAAA',
      'cAAAfA',
      'cAAAAa',
      'gGhGGE',
      'cAbAAa',
      'cAAAa.',
      '.cAAa.',
      '..AAa.',
      '..AAa.',
      '..Efe.',
    ], 3),
    art([
      'CddddddC',
      'dAAbAAac',
      'CAAAAAac',
      'CAAAAAac',
      'cAAAAaac',
      'gGGhGGGg',
      'cAAbAAac',
      'ccAAAacc',
      'cCAAAacc',
      '..AAAa..',
      '..AAAa..',
      '..EfEe..',
    ], 3),
  ],
  arm: { up: [P.steel[2], P.steel[1]], low: [P.steel[3], P.steel[2]], hand: [P.skin[3], P.skin[2]] },
  leg: { c: [P.steel[2], P.steel[1], P.steel[0]], boot: [P.wood[3], P.wood[2], P.wood[1]], cuff: P.steel[3] },
  pauldron: (l, k, s, far, side) => {
    const cx = s[0] + 1 + side * 0.5, cy = s[1] + 0.9;
    l.ball(cx, cy, 2.5, 2.2, P.steel, far ? 1 : 2, 4, 0.08);
    if (!far) l.set(Math.round(cx - 0.5), Math.round(cy + 1.2), P.gold[3]);
  },
  weapon: sword,
  off: (l, k, hx, hy) => {
    if (k.ps.tag.includes('two') || k.ps.tag.includes('tuck')) return;
    if (k.dir === 0) shieldFront(l, hx + 2.5, hy - 0.5);
    else if (k.dir === 1) shieldSide(l, hx + 3, hy - 1);
  },
  mid: (k, L) => { if (k.dir === 2) L((l) => { shieldFront(l, k.topX - 0.5, k.shTop + 4.5, 5); }); },
  top: kBand,
  swing: [0.5, 0.4],
  carry: (dir) => (dir === 0 ? { mh: [-2, 1], wa: 112.5, oh: [1, 5] } : dir === 1 ? { mh: [3, 4], wa: -45, oh: [4, 4] } : { mh: [2, 1], wa: 67.5 }),
  anim: (a, dir, f) => {
    if (a === 'lie') return { wa: -90, mh: [dir === 0 ? -1 : 1, 5], tag: 'two' };
    return table(kTab)(a, dir, f);
  },
};

// ================================================================ Magier
const M_ROBE = mixR(P.blue, P.violet, 0.5);
const mLg = legend(P.skin, P.snow, [M_ROBE, P.violet, P.gold, P.tan]);
const mTab: Tab = {
  attack: [
    [
      { mh: [-1, 1], wa: -90, y: 0, lean: -1, flare: 1 },
      { mh: [1, 0], wa: 45, y: 1, flare: 3, tag: 'wtop tipglint', glint: 2, tr: 2 },
      { mh: [1, 1], wa: 45, y: 1, flare: 2, tag: 'wtop tipglint', glint: 3, tr: 1, sw: 1 },
      { mh: [-1, 2], wa: 112.5, flare: 1, sw: -1 },
    ],
    [
      { mh: [1, 2], wa: -90, lean: -1, flare: 1 },
      { mh: [3, 0], wa: -45, lean: 1, x: -1, y: 1, flare: 3, tag: 'tipglint', glint: 2, fa: [3, 0, 0], tr: 2 },
      { mh: [4, 0], wa: -45, lean: 1, x: -1, y: 1, flare: 2, tag: 'tipglint', glint: 3, fa: [3, 0, 0], tr: 1, sw: 1 },
      { mh: [4, 2], wa: -67.5, flare: 1, sw: -1 },
    ],
    [
      { mh: [1, 1], wa: -90, lean: 1, flare: 1 },
      { mh: [-1, -1], wa: -135, y: 1, flare: 3, tag: 'tipglint', glint: 2, tr: 2 },
      { mh: [-1, 0], wa: -135, y: 1, flare: 2, tag: 'tipglint', glint: 3, tr: 1, sw: 1 },
      { mh: [1, 2], wa: -112.5, flare: 1, sw: -1 },
    ],
  ],
  heavy: [
    [
      { mh: [-2, 4], wa: -90, y: 2, hy: 1 },
      { mh: [0, -2], wa: -90, hy: -1, up: 2, flare: 1, oh: [1, -2] },
      { mh: [0, -3], wa: -90, hy: -1, up: 2, flare: 2, oh: [2, -3], tag: 'tipglint', glint: 1 },
      { mh: [-1, 4], wa: -90, y: 3, hy: 1, flare: 3, tag: 'tipglint', glint: 2, tr: 3, oh: [2, 2], fa: [-1, 0, 0], fb: [1, 0, 0] },
      { mh: [-2, 4], wa: -90, y: 1, flare: 2, tag: 'tipglint', glint: 3, sw: 1 },
    ],
    [
      { mh: [3, 4], wa: -67.5, y: 2, lean: 1 },
      { mh: [2, -3], wa: -90, hy: -1, lean: -1, up: 2, flare: 1, oh: [3, -2] },
      { mh: [2, -4], wa: -90, hy: -1, lean: -2, up: 2, flare: 2, oh: [4, -3], tag: 'tipglint', glint: 1 },
      { mh: [5, 4], wa: -90, y: 3, lean: 3, x: -1, flare: 3, tag: 'tipglint', glint: 2, tr: 3, oh: [5, 1], fa: [4, 0, 0], fb: [-3, 0, 0] },
      { mh: [5, 4], wa: -90, y: 1, lean: 1, flare: 2, tag: 'tipglint', glint: 3, sw: 1, fa: [3, 0, 0] },
    ],
    [
      { mh: [2, 4], wa: -90, y: 2, hy: 1 },
      { mh: [0, -2], wa: -90, hy: -1, up: 2, flare: 1, oh: [-1, -2], wz: 1 },
      { mh: [0, -3], wa: -90, hy: -1, up: 2, flare: 2, oh: [-2, -3], tag: 'tipglint', glint: 1, wz: 1 },
      { mh: [1, 4], wa: -90, y: 3, hy: 1, flare: 3, tag: 'tipglint', glint: 2, tr: 3, oh: [-2, 2], wz: 1 },
      { mh: [2, 4], wa: -90, y: 1, flare: 2, tag: 'tipglint', glint: 3, sw: 1 },
    ],
  ],
};
function mSatchel(k: K, L: LayerFn): void {
  const x = k.dir === 0 ? k.cx + 2 : k.dir === 1 ? k.cx - 4 : k.cx - 6, y = k.hipY - 2 + (k.ps.sw > 0 ? 0 : 0);
  if (k.ps.tag.includes('tuck')) return;
  L((l) => {
    l.rect(x, y, 4, 5, P.tan[2]); l.rect(x, y, 4, 2, P.tan[3]); l.rect(x, y, 1, 4, P.tan[3]); l.rect(x + 3, y + 1, 1, 4, P.tan[1]);
    l.set(x + 1, y + 2, P.gold[3]); l.rect(x + 1, y + 4, 3, 1, P.tan[1]);
  });
}
export const magier: Costume = {
  key: 'char_magier', lg: mLg, B: BUILD,
  head: [
    head([
      '...........CC.......',
      '..........CdCCc.....',
      '.........CdCc.Cc....',
      '.........CdCc..f....',
      '........CdCCc.fFf...',
      '........CdCCc..f....',
      '.......CCdCCCc......',
      '.......CdDCCCc......',
      '......CCdDCCCCc.....',
      '......eEfFfEEEe.....',
      '..cCCCCdDCCCCCCCcc..',
      '.cCCdDCCCCCCCCCCccc.',
      '..ccvSSSSSSSSSSucc..',
      '....V..........U....',
      '....V..........U....',
      '...vV..........Uu...',
      '...vV...........u...',
      '....v...............',
    ], 8),
    head([
      '......CC............',
      '....cCCdC...........',
      '...cC..CdC..........',
      '...f...CdCc.........',
      '..fFf..CdCCc........',
      '...f...CdCCc........',
      '......CCdCCCc.......',
      '......CdDCCCc.......',
      '.....CCdDCCCCc......',
      '.....eEfFfEEEe......',
      '..cCCCdDCCCCCCCCc...',
      '.cCCdDCCCCCCCCCCCcc.',
      '..c.vVVVVUSSSSSS.c..',
      '....vVVvVU..........',
      '....vVVvVu..........',
      '....vVvVUu..........',
      '.....vVVu...........',
      '.....vVu............',
      '......vu............',
    ], 8),
    head([
      '.......CC...........',
      '.....CCdCc..........',
      '....Cc.CdCc.........',
      '....f..CdCc.........',
      '...fFf.CdCCc........',
      '....f..CdCCc........',
      '.......CCdCCCc......',
      '.......CdDCCCc......',
      '......CCdDCCCCc.....',
      '......eEfFfEEEe.....',
      '..cCCCCdDCCCCCCCcc..',
      '.cCCdDCCCCCCCCCCccc.',
      '..ccvVVVVVVVVVUucc..',
      '....vVVvVVVvVVUu....',
      '....vVVvVVVvVVUu....',
      '....vVVvVVVvVUUu....',
      '.....vVvVVvVVUu.....',
      '.....vVVvVVvUUu.....',
      '......vVvVvUuu......',
    ], 8),
  ],
  torso: [
    art([
      '..AAbffbAA..',
      '..AGAEfAAa..',
      '..AbGCCAAa..',
      '..AbAGCAAa..',
      '..AbACGAAa..',
      '..eEfFfEEe..',
      '..AbACCGAa..',
      '.AAbACCAAaa.',
      '.AbAACCAAAa.',
      '.AbAACdAAAa.',
      '.AbAACCAAAa.',
      'AAbAACCAAAaa',
      'AbAAACCAAAAa',
      'eEfEEEEfEEee',
    ], 5),
    art([
      '..AffA..',
      '.aAbAAC.',
      '.aAbAAC.',
      '.aAAbAC.',
      '.aAAbAC.',
      '.eEfEEf.',
      '.aAAbAC.',
      '.aAAbAAC',
      'aAAAbAAC',
      'aAAAbAAC',
      'aAAbAAAC',
      'aAAbAAAC',
      'aAAbAAAA',
      'eEEfEEEe',
    ], 5),
    art([
      '..AAbAAAAa..',
      '..AbAAAGAa..',
      '..AbAAGAaa..',
      '..AbAGAAAa..',
      '..AbGAAAAa..',
      '..eEfEEEEe..',
      '..AGAAAaAa..',
      '.AAbAAAaAaa.',
      '.AbAAAAaAAa.',
      '.AbAAaAAAAa.',
      '.AbAAaAAAAa.',
      'AAbAAaAAaAaa',
      'AbAAAaAAaAAa',
      'eEfEEEEfEEee',
    ], 5),
  ],
  arm: { up: [M_ROBE[2], M_ROBE[1]], low: [M_ROBE[3], M_ROBE[2]], hand: [P.skin[3], P.skin[2]] },
  leg: { c: [P.wood[2], P.wood[1], P.wood[1]], boot: [P.wood[3], P.wood[2], P.wood[1]], robe: true },
  weapon: staff,
  mid: mSatchel,
  post: (p, k) => tipGlow(p, k, P.teal[4]),
  swing: [0.3, 0.7], reach: 'o', plant: true,
  carry: (dir) => (dir === 0 ? { mh: [-3, 4], wa: -90 } : dir === 1 ? { mh: [5, 4], wa: -67.5 } : { mh: [3, 4], wa: -90, wz: 1 }),
  anim: (a, dir, f) => {
    if (a === 'lie') return { wa: -90, mh: [dir === 0 ? -2 : 2, 5] };
    if (a === 'cast') return { tag: 'tipglint' };
    if (a === 'run' && dir === 1) return { wa: -90 };
    return table(mTab)(a, dir, f);
  },
};

// ================================================================ Waldläufer
const W_HAIR = mixR(P.wood, P.fire, 0.28);
const wLg = legend(P.skin, W_HAIR, [P.green, P.forest, P.tan, P.gold, P.wood]);
const wTab: Tab = {
  attack: [
    [
      { oh: [-4, 3], wa2: 90, mh: [4, 2], bow: 0.5, arrow: true, y: 0 },
      { oh: [-4, 4], wa2: 90, mh: [4, 0], bow: 1, arrow: true, hy: 1, tag: 'tipglint' },
      { oh: [-4, 4], wa2: 90, mh: [4, -1], bow: 0, arrow: false, hy: 1, y: 1, tr: 2 },
      { oh: [-2, 4], wa2: 67.5, mh: [2, 3], sw: 1 },
    ],
    [
      { oh: [6, 1], wa2: 0, mh: [3, 1], bow: 0.5, arrow: true, lean: 0, fa: [3, 0, 0], fb: [-2, 0, 0] },
      { oh: [6, 1], wa2: 0, mh: [-1, 1], bow: 1, arrow: true, lean: -1, fa: [3, 0, 0], fb: [-3, 0, 0], tag: 'tipglint' },
      { oh: [6, 1], wa2: 0, mh: [-2, 0], bow: 0, arrow: false, lean: -1, x: -1, fa: [3, 0, 0], fb: [-3, 0, 0], tr: 2 },
      { oh: [5, 2], wa2: 22.5, mh: [0, 4], fa: [2, 0, 0], fb: [-2, 0, 0], sw: 1 },
    ],
    [
      { oh: [5, -2], wa2: -90, mh: [-4, 0], bow: 0.5, arrow: true },
      { oh: [5, -4], wa2: -90, mh: [-4, 0], bow: 1, arrow: true, hy: -1 },
      { oh: [5, -4], wa2: -90, mh: [-4, 1], bow: 0, arrow: false, y: 1, tr: 2 },
      { oh: [2, 2], wa2: -135, mh: [-2, 3], sw: 1 },
    ],
  ],
  heavy: [
    [
      { oh: [-4, 2], wa2: 90, mh: [4, 1], bow: 0.5, arrow: true, y: 2 },
      { oh: [-4, 1], wa2: 90, mh: [4, -2], bow: 1, arrow: true, kneel: true, y: 5, tag: 'tipglint', glint: 1 },
      { oh: [-4, 1], wa2: 90, mh: [4, -3], bow: 1, arrow: true, kneel: true, y: 5, tag: 'tipglint', glint: 2, up: 1 },
      { oh: [-4, 1], wa2: 90, mh: [4, -3], bow: 0, arrow: false, kneel: true, y: 5, hy: 1, tr: 3 },
      { oh: [-3, 3], wa2: 90, mh: [3, 2], y: 2, sw: 1 },
    ],
    [
      { oh: [6, 1], wa2: 0, mh: [3, 1], bow: 0.5, arrow: true, y: 2, fa: [3, 0, 0], fb: [-3, 0, 0] },
      { oh: [6, 0], wa2: 0, mh: [-1, 0], bow: 1, arrow: true, kneel: true, y: 5, lean: -1, tag: 'tipglint', glint: 1 },
      { oh: [6, 0], wa2: 0, mh: [-2, 0], bow: 1, arrow: true, kneel: true, y: 5, lean: -1, tag: 'tipglint', glint: 2, up: 1 },
      { oh: [6, 0], wa2: 0, mh: [-3, -1], bow: 0, arrow: false, kneel: true, y: 5, lean: -2, x: -1, tr: 3 },
      { oh: [5, 2], wa2: 22.5, mh: [0, 3], y: 2, fa: [3, 0, 0], fb: [-3, 0, 0], sw: 1 },
    ],
    [
      { oh: [5, -2], wa2: -90, mh: [-4, 0], bow: 0.5, arrow: true, y: 2 },
      { oh: [5, -4], wa2: -90, mh: [-4, 0], bow: 1, arrow: true, kneel: true, y: 5, tag: 'tipglint', glint: 1 },
      { oh: [5, -4], wa2: -90, mh: [-4, 1], bow: 1, arrow: true, kneel: true, y: 5, tag: 'tipglint', glint: 2, up: 1 },
      { oh: [5, -4], wa2: -90, mh: [-4, 1], bow: 0, arrow: false, kneel: true, y: 5, hy: 1, tr: 3 },
      { oh: [3, 1], wa2: -112.5, mh: [-2, 3], y: 2, sw: 1 },
    ],
  ],
};
function wQuiver(l: Px, k: K): void {
  const { dir, topX: tx, shTop: sy } = k;
  if (dir === 0) {
    l.rect(tx - 8, sy - 3, 3, 5, P.wood[2]); l.rect(tx - 8, sy - 3, 1, 5, P.wood[3]);
    l.set(tx - 8, sy - 5, P.cream[4]); l.set(tx - 8, sy - 4, P.cream[3]); l.set(tx - 6, sy - 4, P.red[3]); l.set(tx - 7, sy - 5, P.red[2]); l.set(tx - 6, sy - 6, P.cream[4]); l.set(tx - 6, sy - 5, P.cream[3]);
  } else if (dir === 1) {
    for (let i = 0; i < 9; i++) { const x = tx - 5 - Math.round(i * 0.35), y = sy + i; l.rect(x, y, 3, 1, P.wood[2]); l.set(x, y, P.wood[3]); l.set(x + 2, y, P.wood[1]); }
    l.rect(tx - 5, sy, 3, 1, P.gold[2]);
    l.set(tx - 5, sy - 2, P.cream[4]); l.set(tx - 4, sy - 1, P.cream[3]); l.set(tx - 3, sy - 2, P.red[3]); l.set(tx - 3, sy - 1, P.red[2]); l.set(tx - 5, sy - 1, P.cream[3]);
  } else {
    for (let i = 0; i < 10; i++) { const x = tx + 2 - Math.round(i * 0.55), y = sy + i; l.rect(x, y, 3, 1, P.wood[2]); l.set(x, y, P.wood[3]); l.set(x + 2, y, P.wood[1]); }
    l.rect(tx + 2, sy, 3, 1, P.gold[2]); l.rect(tx - 1, sy + 5, 3, 1, P.gold[2]);
    l.set(tx + 3, sy - 2, P.cream[4]); l.set(tx + 3, sy - 1, P.cream[3]); l.set(tx + 5, sy - 2, P.red[3]); l.set(tx + 5, sy - 1, P.red[2]); l.set(tx + 4, sy - 3, P.cream[4]); l.set(tx + 4, sy - 1, P.cream[3]);
  }
}
export const waldlaeufer: Costume = {
  key: 'char_waldlaeufer', lg: wLg, B: BUILD,
  head: [
    head([
      '...UvvVvUUu...',
      '..UvVVvvUUUu..',
      '.UvVvvvUUUUUu.',
      '.UvvvUUUUUUuu.',
      '.UvUUttttUUUu.',
      '.Ut........Uu.',
      '.u..........u.',
      '.u..........u.',
    ]),
    head([
      '...UvvVvUUu...',
      '..UvVVvvUUUu..',
      '.UvVvvvUUUUUu.',
      '.UvvvUUUUUUUu.',
      '.uUvUUUUtUttt.',
      '.uUUUUUt......',
      '.uuUUuUt......',
      '. uUUu........',
    ]),
    head([
      '...UvvVvUUu...',
      '..UvVVvvUUUu..',
      '.UvVvvvUUUUUu.',
      '.UvvvUUUUUUuu.',
      '.UvvUUvUUUUuu.',
      '.UvUvUUUuUUuu.',
      '.uUUUvUUUUuuu.',
      '..uUuUUuUuuu..',
      '....uSuSSu....',
      '....SSSSSs....',
    ]),
  ],
  torso: [
    art([
      'cCdCCCCc',
      'CdChGCCc',
      'CCEfEEec',
      'cEfEEEec',
      '.EfEIEe.',
      '.iIjhIi.',
      '.AbAAAa.',
      '.AbAAAa.',
      '.aAAAaa.',
      '.aA..Aa.',
    ], 1),
    art([
      '.CdCc.',
      'CdCChG',
      'cCEfEE',
      'cEfEEe',
      '.EfEEe',
      '.iIjIh',
      '.AbAAa',
      '.AbAAa',
      '.aAAa.',
      '.aAA..',
    ], 1),
    art([
      'cCdCCCCc',
      'CdCCCCCc',
      'CCdCCCcc',
      'cCdCCCcc',
      '.CdCCCc.',
      '.iIjIIi.',
      '.AbAAAa.',
      '.AbAAAa.',
      '.aAAAaa.',
      '.aA..Aa.',
    ], 1),
  ],
  arm: { up: [P.green[3], P.green[2]], low: [P.tan[3], P.tan[2]], hand: [P.skin[3], P.skin[2]] },
  leg: { c: [P.tan[2], P.tan[1], P.tan[0]], boot: [P.wood[3], P.wood[2], P.wood[1]], bootH: 4, cuff: P.wood[4] },
  off: bow,
  under: (k, L) => {
    if (k.ps.tag.includes('tuck')) return;
    if (k.dir === 0) L((l) => wQuiver(l, k));
    L((l) => cape(l, k, P.forest, 11, { half: 5, flare: 1, ragged: true }));
    if (k.dir !== 0) L((l) => wQuiver(l, k));
    if (k.dir === 2) L((l) => { l.ball(k.topX, k.shTop + 1.2, 4.6, 2.3, P.forest, 1, 3); });
    if (k.dir === 1) L((l) => { l.ball(k.topX - 3.5, k.shTop + 0.8, 2.6, 2.2, P.forest, 1, 3); });
  },
  top: (k, L) => {
    const { dir, ps, headX: hx, neckY: ny, lg } = k;
    L((l) => {
      if (dir === 0) braid(l, hx + 4, ny - 1, 6, [0.1, 1], ps.sw * 0.6, lg.U, lg.u, P.green[4]);
      else if (dir === 1) braid(l, hx - 6, ny - 2, 7, [-0.15 - ps.tr * 0.35, 1 - ps.tr * 0.15], ps.sw, lg.U, lg.u, P.green[4]);
      else braid(l, hx - 1, ny - 2, 8, [0, 1], ps.sw, lg.U, lg.u, P.green[4]);
    });
  },
  swing: [1, 0.3], reach: 'm',
  carry: (dir) => (dir === 0 ? { oh: [2, 4], wa2: 0 } : dir === 1 ? { oh: [5, 3], wa2: 22.5, lean: 0 } : { oh: [-2, 4], wa2: 180 }),
  anim: (a, dir, f) => {
    if (a === 'lie') return { wa2: -90, oh: [dir === 0 ? 1 : -1, 5], oz: 1 };
    if (a === 'cast') return dir === 1 ? { oh: [5, 0], wa2: -22.5, mh: [3, -1], tag: 'tipglint' } : { oh: [dir === 0 ? 2 : -2, 1], wa2: dir === 0 ? -22.5 : -157.5, mh: [dir === 0 ? -1 : 1, -2], tag: 'tipglint', oz: dir === 0 ? 1 : 0 };
    return table(wTab)(a, dir, f);
  },
};

// ================================================================ Paladin
const P_HAIR = mixR(P.gold, P.tan, 0.4);
const P_SKY = [P.blue[2], P.blue[3], mix(P.blue[3], P.blue[4], 0.5), P.blue[4]];
const pLg = legend(P.skin, P_HAIR, [P.cream, P.gold, P_SKY, P.wood, P.blue, P.snow]);
const pTab: Tab = {
  attack: [
    [
      { mh: [0, -3], wa: -112.5, two: 3, lean: -1 },
      { mh: [5, -1], wa: 90, two: 3, y: 1, tag: 'wtop', tr: 2, flare: 1 },
      { mh: [5, 0], wa: 90, two: 3, y: 2, hy: 1, tag: 'wtop', tr: 2, flare: 2 },
      { mh: [2, 1], wa: 112.5, two: 3, y: 1, sw: 1 },
    ],
    [
      { mh: [-2, -4], wa: -112.5, two: 3, lean: -1, fa: [2, 0, 0], fb: [-2, 0, 0] },
      { mh: [3, -2], wa: 45, two: 3, lean: 2, x: -2, y: 1, fa: [4, 0, 0], fb: [-3, 0, 0], tr: 2, flare: 1 },
      { mh: [4, 0], wa: 67.5, two: 3, lean: 2, x: -1, y: 2, fa: [4, 0, 0], fb: [-3, 0, 0], tr: 2, flare: 2 },
      { mh: [5, 1], wa: 90, two: 3, lean: 1, y: 1, fa: [3, 0, 0], fb: [-2, 0, 0], sw: 1 },
    ],
    [
      { mh: [0, -3], wa: -67.5, two: 3, lean: 1 },
      { mh: [-4, -5], wa: -90, two: 3, tr: 2, flare: 1 },
      { mh: [-4, -2], wa: -90, two: 3, y: 2, hy: 1, tr: 2, flare: 2 },
      { mh: [-1, 1], wa: 67.5, two: 3, y: 1, sw: 1 },
    ],
  ],
  heavy: [
    [ // Drehschlag: vorn → Rücken → vorn → Schmetterschlag
      { mh: [5, 1], wa: 180, two: 3, y: 1, lean: -1, tag: 'wtop' },
      { rdir: 2, mh: [-5, 1], wa: 0, two: 3, y: 1, tr: 3, wz: 1, sw: 1 },
      { mh: [5, 0], wa: 0, two: 3, y: 0, tr: 3, tag: 'wtop', sw: -1, flare: 1 },
      { mh: [5, -1], wa: 90, two: 3, y: 2, hy: 1, tr: 3, tag: 'wtop', flare: 3 },
      { mh: [4, 0], wa: 90, two: 3, y: 2, tag: 'wtop', flare: 1, sw: 1 },
    ],
    [
      { mh: [-1, 2], wa: 157.5, two: 3, y: 1, lean: -1, fa: [2, 0, 0], fb: [-2, 0, 0] },
      { rdir: 0, mh: [5, 1], wa: 0, two: 3, y: 1, tr: 3, tag: 'wtop', sw: 1 },
      { rdir: 2, mh: [-5, 0], wa: 180, two: 3, y: 0, tr: 3, wz: 1, sw: -1, flare: 1 },
      { mh: [3, -1], wa: 67.5, two: 3, lean: 3, x: -2, y: 2, fa: [5, 0, 0], fb: [-4, 0, 0], tr: 3, flare: 3 },
      { mh: [4, 0], wa: 67.5, two: 3, lean: 2, x: -1, y: 2, fa: [4, 0, 0], fb: [-3, 0, 0], flare: 1, sw: 1 },
    ],
    [
      { mh: [-5, 1], wa: 0, two: 3, y: 1, lean: 1, wz: 1 },
      { rdir: 0, mh: [5, 1], wa: 180, two: 3, y: 1, tr: 3, tag: 'wtop', sw: 1 },
      { mh: [-5, 0], wa: 180, two: 3, y: 0, tr: 3, wz: 1, sw: -1, flare: 1 },
      { mh: [-4, -5], wa: -90, two: 3, y: 2, hy: 1, tr: 3, flare: 3 },
      { mh: [-4, -2], wa: -90, two: 3, y: 2, hy: 1, flare: 1, sw: 1 },
    ],
  ],
};
export const paladin: Costume = {
  key: 'char_paladin', lg: pLg, B: BUILD,
  head: [
    head([
      '.N..............N.',
      '.nN..UvVVvUUu..Nn.',
      'lnN.UvVVvvUUUu.Nnl',
      '.lnUvVvvvUUUUUunl.',
      '..leEfFjJfEEEeel..',
      '...UvUttttttUUu...',
      '...U..........u...',
      '...u..........u...',
    ], 1),
    head([
      '..N...............',
      '..nN..UvVVvUu.....',
      '...nNNvVVvvUUUu...',
      '...lnnNNvvUUUUUu..',
      '...eEEfnNfFfEEEe..',
      '...uUUvUUUtUttt...',
      '...uuUUUUt........',
      '...uuUUuUt........',
      '... uuUu..........',
    ], 1),
    head([
      '.N..............N.',
      '.nN..UvVVvUUu..Nn.',
      'lnN.UvVVvvUUUu.Nnl',
      '.lnUvVvvvUUUUUunl.',
      '..leEEfEEEEEEeel..',
      '...UvvUUvUUUUuu...',
      '...UvUvUUUuUUuu...',
      '...uUUUUuUUUuuu...',
      '....uUuUUuUuuu....',
      '......uSuSSu......',
      '......SSSSSs......',
    ], 1),
  ],
  torso: [
    art([
      'cddffddc',
      'AbBbbbAa',
      'AbBbAbAa',
      'AbbdDbAa',
      'aAbdcAAa',
      'cdDfFdcc',
      'aAbAAbAa',
      'aAbAaAAa',
      'cAbAaAAc',
    ]),
    art([
      '.cdfd.',
      'aAbBbA',
      'aAbBbA',
      'aAbbdA',
      'aAAbAa',
      'ccdDfd',
      'aAbAbA',
      'aAbAAa',
      '.aAAa.',
    ]),
    art([
      'cddffddc',
      'AbBbbAAa',
      'AbbbAAAa',
      'AbbAAAaa',
      'aAbAAAaa',
      'cdDddccc',
      'aAbAAaAa',
      'aAbAAaAa',
      'cAbAAaAc',
    ]),
  ],
  arm: { up: [P.cream[3], P.cream[2]], low: [P.cream[4], P.cream[2]], hand: [P.gold[3], P.gold[2]] },
  leg: { c: [P.cream[3], P.cream[2], P.cream[1]], boot: [P.gold[3], P.gold[2], P.gold[1]], cuff: P.gold[3] },
  pauldron: (l, k, s, far, side) => {
    const cx = s[0] + 1 + side * 0.5, cy = s[1] + 0.9;
    l.ball(cx, cy, 2.6, 2.3, P.cream, far ? 1 : 2, 4, 0.1);
    l.rect(Math.round(cx - 1.5), Math.round(cy + 1.2), 3, 1, far ? P.gold[1] : P.gold[3]);
  },
  weapon: hammer,
  under: (k, L) => { if (!k.ps.tag.includes('tuck')) L((l) => cape(l, k, P_SKY, 9, { half: 5, flare: 0, trim: P.snow[3] })); },
  swing: [0.3, 0.6], reach: 'o', plant: true,
  carry: (dir) => (dir === 0 ? { mh: [-2, 1], wa: 90 } : dir === 1 ? { mh: [6, 1], wa: 90 } : { mh: [2, 1], wa: 90, wz: 1 }),
  anim: (a, dir, f) => {
    if (a === 'lie') return { wa: -90, mh: [dir === 0 ? -2 : 2, 6] };
    if (a === 'cast') {
      const b = [0, -1, -1, 0][f];
      return dir === 1 ? { mh: [6, 1], wa: 90, oh: [4, -2 + b], lean: 0, tag: 'oglint', oz: 1 } : { mh: [dir === 0 ? -2 : 2, 1], wa: 90, oh: [dir === 0 ? 1 : -1, -3 + b], tag: 'oglint', wz: dir === 2 ? 1 : null };
    }
    return table(pTab)(a, dir, f);
  },
};

// ================================================================ Schattenjäger
const S_TEAL = [P.teal[0], P.teal[1], mix(P.teal[1], P.teal[2], 0.55), P.teal[2]];
const S_COAL = [P.ash[2], P.ash[3], P.ash[4], mix(P.ash[4], P.stone[3], 0.5)];
const S_PINK = [P.pink[1], P.pink[2], P.pink[3], P.pink[4]];
const sLg = legend(P.skin, P.snow, [S_TEAL, S_COAL, S_PINK, P.teal, P.steel]);
const SB: typeof BUILD = { ...BUILD, shX: 5, legX: 3 };
const sTab: Tab = {
  attack: [
    [ // gekreuzt → auseinanderreißen
      { mh: [5, 0], wa: -45, oh: [-5, 1], wa2: -135, y: 1, tag: 'wtop' },
      { mh: [-3, 1], wa: 157.5, oh: [3, 1], wa2: 22.5, y: 1, tr: 2 },
      { mh: [-3, 4], wa: 135, oh: [3, 4], wa2: 45, y: 2, tr: 2, sw: 1 },
      { mh: [-1, 4], wa: 112.5, oh: [1, 4], wa2: 67.5, y: 1, sw: -1 },
    ],
    [
      { mh: [-1, 1], wa: -112.5, oh: [2, 2], wa2: -67.5, lean: 0, y: 1, fa: [2, 0, 0], fb: [-2, 0, 0] },
      { mh: [4, 0], wa: 22.5, oh: [3, 3], wa2: -22.5, lean: 3, x: -1, y: 1, fa: [4, 0, 0], fb: [-3, 0, 0], tr: 2 },
      { mh: [1, 4], wa: 135, oh: [5, 0], wa2: 45, lean: 3, x: -1, y: 2, fa: [4, 0, 0], fb: [-3, 0, 0], tr: 2, sw: 1 },
      { mh: [2, 3], wa: 112.5, oh: [3, 3], wa2: 90, lean: 2, y: 1, fa: [3, 0, 0], fb: [-2, 0, 0], sw: -1 },
    ],
    [
      { mh: [1, -1], wa: -67.5, oh: [-1, -1], wa2: -112.5, y: 1 },
      { mh: [3, 1], wa: 0, oh: [-3, 1], wa2: 180, y: 1, tr: 2 },
      { mh: [3, 3], wa: 45, oh: [-3, 3], wa2: 135, y: 2, tr: 2, sw: 1 },
      { mh: [1, 4], wa: 67.5, oh: [-1, 4], wa2: 112.5, y: 1, sw: -1 },
    ],
  ],
  heavy: [
    [
      { mh: [-1, 2], wa: -112.5, oh: [1, 2], wa2: -67.5, y: 2, hy: 1 },
      { mh: [-2, 1], wa: -135, oh: [2, 1], wa2: -45, y: 3, hy: 1, up: 1 },
      { mh: [3, 2], wa: 90, oh: [-3, 2], wa2: 90, y: 2, hy: 2, tr: 3, fa: [-1, 0, 1], fb: [1, 1, -1], tag: 'wtop' },
      { mh: [3, 3], wa: 90, oh: [-3, 3], wa2: 90, y: 3, hy: 2, tr: 3, fa: [-1, 0, 1], fb: [1, 1, -1], tag: 'wtop', sw: 1 },
      { mh: [0, 4], wa: 112.5, oh: [0, 4], wa2: 67.5, y: 1, sw: -1, tr: 1 },
    ],
    [
      { mh: [-1, 3], wa: 0, oh: [1, 3], wa2: 0, lean: 0, x: -2, y: 2, fa: [1, 0, 0], fb: [-2, 0, 0] },
      { mh: [-2, 3], wa: 0, oh: [0, 3], wa2: 0, lean: 1, x: -3, y: 3, fa: [1, 0, 0], fb: [-2, 0, 0], up: 1 },
      { mh: [3, 0], wa: 0, oh: [3, 2], wa2: 0, lean: 4, x: 0, y: 2, fa: [6, 0, 0], fb: [-6, 0, 0], tr: 3 },
      { mh: [3, 1], wa: 0, oh: [3, 2], wa2: 22.5, lean: 4, x: 0, y: 3, fa: [6, 0, 0], fb: [-6, 0, 0], tr: 3, sw: 1 },
      { mh: [2, 3], wa: 67.5, oh: [2, 3], wa2: 90, lean: 2, y: 1, fa: [3, 0, 0], fb: [-3, 0, 0], tr: 1, sw: -1 },
    ],
    [
      { mh: [1, 2], wa: -67.5, oh: [-1, 2], wa2: -112.5, y: 2, hy: 1 },
      { mh: [2, 1], wa: -45, oh: [-2, 1], wa2: -135, y: 3, hy: 1, up: 1 },
      { mh: [1, -2], wa: -67.5, oh: [-1, -2], wa2: -112.5, y: 1, hy: -1, tr: 3 },
      { mh: [1, -3], wa: -67.5, oh: [-1, -3], wa2: -112.5, y: 0, hy: -1, tr: 3, sw: 1 },
      { mh: [1, 3], wa: 67.5, oh: [-1, 3], wa2: 112.5, y: 1, sw: -1, tr: 1 },
    ],
  ],
};
function sTail(k: K, L: LayerFn, pony: boolean): void {
  const { dir, ps, topX: tx, shTop: sy, headX: hx, neckY: ny } = k, tr = Math.min(3, ps.tr), up = ps.up * 0.35;
  const pk = [P.pink[1], P.pink[2], P.pink[3], P.pink[4]], sn = P.snow;
  L((l) => {
    if (pony) {
      if (dir === 1) ribbon(l, hx - 6, ny - 8, Math.min(6 + (tr > 1 ? 1 : 0), hx - 8), tr > 1 ? [-1, 0.15] : [-0.55, 0.8 - up], 1, ps.sw, 2, sn[4], sn[2]);
      else if (dir === 2) ribbon(l, hx - 1, ny - 7, 8, [ps.sw * 0.12, 1], tr ? 1 : 0.5, ps.sw, 2, sn[4], sn[2]);
      return;
    }
    if (dir === 1) {
      const x0 = tx - 4, n = Math.min(8 + tr, x0 - 2), d: V2 = tr === 0 ? [-0.4, 1 - up] : tr === 1 ? [-0.85, 0.5 - up] : [-1, 0.05 - up * 0.5];
      const e = ribbon(l, x0, sy + 1, n, d, 1.4, ps.sw, 2, pk[2], pk[1]); l.set(e[0], e[1], pk[3]);
    } else if (dir === 0) {
      const x0 = tx + 4, n = 7 + (tr > 1 ? 1 : 0), d: V2 = tr === 0 ? [0.25, 1 - up] : tr === 1 ? [0.55, 0.8 - up] : [Math.min(1, (28 - x0) / n), 0.35 - up];
      const e = ribbon(l, x0, sy + 1, n, d, 1.2, ps.sw, 2, pk[2], pk[1]); l.set(e[0], e[1], pk[3]);
    } else {
      const d: V2 = tr === 0 ? [-0.15, 1 - up] : tr === 1 ? [-0.45, 0.9 - up] : [-0.8, 0.6 - up];
      const e = ribbon(l, tx - 2, sy + 1, 8 + (tr > 1 ? 1 : 0), d, 1.2, ps.sw, 2, pk[2], pk[1]); l.set(e[0], e[1], pk[3]);
    }
  });
}
export const schattenjaeger: Costume = {
  key: 'char_schattenjaeger', lg: sLg, B: SB,
  head: [
    head([
      '.........vV...',
      '........vVVu..',
      '...UVVvVVVUu..',
      '..UVVVVvVVVUu.',
      '.UVVvVVVvVVUUu',
      '.UVvVVvVVvVUu.',
      '.UvVtVVvttvUu.',
      '.Uv..v......u.',
      '.u..........u.',
      '.uCdCCCCCCCcu.',
      '..CdCCCCCCcc..',
      '...cCCCCCcc...',
    ], 2),
    head([
      '...UVVvVVUu...',
      '..UVVVvVVvUUu.',
      '.UVVvVVvvVUUu.',
      '.UVvVVvVvUUUUu',
      '.UvVVvVUtUtUt.',
      '.uUVVUUt......',
      '.uuUVuUt.....C',
      '. uuUu.CCdCCC.',
      '......cCCdCC..',
      '......cCCCC...',
    ]),
    head([
      '...UVVvVVUu...',
      '..UVVVUUVvUUu.',
      '.UVVUUEEUUVUu.',
      '.UVUUuffuUUUu.',
      '.UVUUuUUuUUUu.',
      '.UvUUuUUuUUuu.',
      '.uUUUuUUuUuuu.',
      '..uUuuUUuuuu..',
      '....uSuSSu....',
      '....SSSSSs....',
    ]),
  ],
  torso: [
    art([
      'EfFfEEEe',
      'EfFfEEEe',
      'eEfEEEee',
      '.AbfEAa.',
      '.AhAeAa.',
      '.CGhCCc.',
      '.AAGAAa.',
      '.aAAAaa.',
      '.aAaAAa.',
    ]),
    art([
      '.EfFE.',
      'EfFfEe',
      'eEfEEe',
      '.AbAAa',
      '.AhAAa',
      '.CGhCc',
      '.AAGAa',
      '.aAAa.',
      '.aAAa.',
    ]),
    art([
      'EfFfEEEe',
      'EfFfEEEe',
      'eEEfEEee',
      '.AbAAAa.',
      '.AGAAAa.',
      '.CChGCc.',
      '.AAAGAa.',
      '.aAAAaa.',
      '.aAaAAa.',
    ]),
  ],
  arm: { up: [S_TEAL[2], S_TEAL[1]], low: [S_COAL[3], S_COAL[1]], hand: [P.skin[3], P.skin[2]] },
  leg: { c: [S_COAL[2], S_COAL[1], S_COAL[0]], boot: [S_TEAL[2], S_TEAL[1], S_TEAL[0]], bootH: 4, cuff: P.teal[2] },
  weapon: (l, k, hx, hy, ang) => dagger(l, k, hx, hy, ang, 1),
  off: (l, k, hx, hy, ang) => dagger(l, k, hx, hy, ang, -1),
  under: (k, L) => { if (k.dir !== 2 && !k.ps.tag.includes('tuck')) sTail(k, L, false); },
  mid: (k, L) => { if (k.dir === 2) sTail(k, L, false); },
  top: (k, L) => { if (k.dir !== 0) sTail(k, L, true); },
  swing: [0.8, 0.8], reach: 'o',
  carry: (dir) => (dir === 0 ? { mh: [-1, 4], wa: 112.5, oh: [1, 4], wa2: 67.5, y: 0 } : dir === 1 ? { mh: [3, 3], wa: 112.5, oh: [-2, 4], wa2: 112.5, lean: 1 } : { mh: [1, 4], wa: 67.5, oh: [-1, 4], wa2: 112.5 }),
  anim: (a, dir, f) => {
    if (a === 'lie') return { wa: -90, wa2: -90, oz: 1, wz: 1, lean: 0 };
    if (a === 'cast') return dir === 1 ? { wa: -90, wa2: -90, mh: [4, -1], oh: [2, 0] } : { wa: dir === 0 ? -112.5 : -67.5, wa2: dir === 0 ? -67.5 : -112.5, oz: dir === 0 ? 1 : 0 };
    return table(sTab)(a, dir, f);
  },
};

export const CLASSES: Record<string, Costume> = {
  char_krieger: krieger, char_magier: magier, char_waldlaeufer: waldlaeufer, char_paladin: paladin, char_schattenjaeger: schattenjaeger,
};
void WHITE; void alpha; void shieldSide;
