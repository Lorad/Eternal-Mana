/** Die 15 NPC-Erscheinungen: eigene Köpfe, Körperbau, Farben und Requisiten. */
import type { Px } from '../draw';
import { P, WHITE, alpha, mix } from '../palette';
import type { Ramp } from '../palette';
import { BUILD, FH, FW, art, head, legend, lo, mixR } from './rig';
import type { Art, Build, Costume, Dir, K, LayerFn } from './rig';
import { braid, krieger, mSatchel, waldlaeufer, wQuiver } from './classes';
import { book, bow, pickaxe, smithHammer, spear, stick } from './weapons';

const GINGER = lo(P.fire);
const BLOND = mixR(P.gold, P.tan, 0.4);
const DARK = [P.ash[1], P.ash[2], P.ash[3], P.ash[4]];
const OCHRE = lo(P.gold);
const r3 = (r: Ramp, i = 3): [number, number, number] => [r[i], r[i - 1], r[i - 2]];
const r2 = (r: Ramp, i = 3): [number, number] => [r[i], r[i - 1]];

/** Robe/Kleid/Mantel: Standardfaltenwurf, oben `top`-Zeilen, Gürtel in Zeile 5, Saum unten. */
function robe(dir: Dir, top: string[], belt: string | null, hem: string, below: number, mid = 'AA'): Art {
  const n = 9 + below, rows: string[] = [];
  for (let r = 0; r < n; r++) {
    let s: string;
    if (r < top.length) s = top[r];
    else if (r === 5 && belt) s = belt;
    else if (r === n - 1) s = hem;
    else if (dir === 1) s = r <= 6 ? '.aAbAAA.' : r === 7 ? '.aAAbAAA' : 'aAAAbAAA';
    else {
      const m = dir === 0 ? mid : r > 5 ? 'Aa' : 'AA';
      s = r <= 6 ? `..AbA${m}AAa..` : r === 7 ? `.AAbA${m}AAaa.` : r >= n - 3 && n - 3 > 8 ? (r === n - 3 ? `AAbAA${m}AAAaa` : `AbAAA${m}AAAAa`) : `.AbAA${m}AAAa.`;
    }
    rows.push(s);
  }
  return art(rows, below);
}
const robes = (top: string[][], belt: Array<string | null>, hem: string[], below: number, mid = 'AA'): [Art, Art, Art] =>
  [robe(0, top[0], belt[0], hem[0], below, mid), robe(1, top[1], belt[1], hem[1], below), robe(2, top[2], belt[2], hem[2], below)];

const base = (o: Partial<Costume> & Pick<Costume, 'key' | 'lg' | 'head' | 'torso' | 'arm' | 'leg'>): Costume => ({ B: BUILD, carry: () => ({}), npc: true, reach: 'o', ...o });
const B = (o: Partial<Build>): Build => ({ ...BUILD, ...o });

// ================================================================ Mirelda (Älteste)
const aLg = legend(P.skin, P.snow, [P.forest, P.green, P.gold, P.cream]);
const aelteste = base({
  key: 'npc_aelteste', lg: aLg, B: B({ leg: 6, arm: 6 }), stoop: 1, plant: true,
  head: [
    head([
      '.....UVVu.....',
      '....UVVVUu....',
      '.....UVUu.....',
      '...UVVVVVUu...',
      '..UVVvVVVVUu..',
      '.UVVvVVVvVVUu.',
      '.UVVVttttVVUu.',
      '.UVtttttttVUu.',
      '.U.tt....tt.u.',
      '.u..........u.',
    ], 3),
    head([
      '..UVVu........',
      '.UVVVUu.......',
      '..UVVUu.......',
      '...UVVVVVUu...',
      '..UVVvVVVVVUu.',
      '.uUVvVVVvVVVu.',
      '.uUVVVVVVtttt.',
      '.uUVVVVVtt....',
      '.uUVVVVt.tt...',
      '.uuUVuUt......',
      '. uuUu........',
    ], 3),
    head([
      '.....UVVu.....',
      '....UVVVUu....',
      '.....UVUu.....',
      '...UVVVVVUu...',
      '..UVVvVVVVUu..',
      '.UVVvVVVvVVUu.',
      '.UVVVVvVVVVUu.',
      '.UVvVVVVvVUUu.',
      '.uUVVvVVVUUuu.',
      '.uUUVVVUUUuuu.',
      '..uUUUUUuuu...',
      '....uSSSSu....',
      '....SSSSSs....',
    ], 3),
  ],
  torso: robes(
    [['..CCdccdCC..', '.CdCCdCCCCc.', '.CCdCCCCCcc.', '..cCCeECcc..'], ['..CdCc..', '.CdCCCCc', '.CCdCCCc', '.cCCCeE.'], ['..CCdCCCCC..', '.CdCCdCCCCc.', '.CCdCCCCCcc.', '..cCdCCCcc..']],
    [null, null, null], ['cCdCCCCCdCcc', 'cCCdCCCc', 'cCdCCCCCdCcc'], 4),
  arm: { up: r2(P.green), low: r2(P.forest), hand: r2(P.skin) },
  leg: { c: r3(P.wood), boot: r3(P.wood), robe: true },
  weapon: (l, k, hx, hy, ang) => { stick(l, hx, hy, ang, 11, 9, P.wood, P.green[4]); },
  swing: [0.2, 0.5],
  carry: (dir) => (dir === 0 ? { mh: [-2, 3], wa: -90 } : dir === 1 ? { mh: [5, 3], wa: -90 } : { mh: [2, 3], wa: -90, wz: 1 }),
});

// ================================================================ Borin (Schmied)
const sLg = legend(P.skin, P.wood, [P.tan, P.stone, P.wood, P.steel]);
const WIDE_TORSO: [Art, Art, Art] = [
  art([
    '..CdttCc..',
    'CdAbttAaCc',
    'CCAbAAAaCc',
    'cCAbAAAaCc',
    '.cAbAAAac.',
    '.eEfAAEee.',
    '.cAbAAAac.',
    '.cAbAAAac.',
    '.eAbAAAae.',
    '..AbAAAa..',
    '..aAAAaa..',
  ], 2),
  art([
    '..CdCc..',
    '.CdCAbA.',
    '.CCdAbAA',
    '.cCCAbAA',
    '.cCCAAAa',
    '.eEfEAAa',
    '.cCcAbAa',
    '.cCcAbA.',
    '.eecAAa.',
    '....AAa.',
    '....aa..',
  ], 2),
  art([
    '..CdCCCc..',
    'CdAdCCAcCc',
    'CCdACAcCcc',
    'cCdCAACCcc',
    '.cdACCAcc.',
    '.eEfEEEee.',
    '.cCdCCCcc.',
    '.cCdCCCcc.',
    '.eeCCCcee.',
  ]),
];
const schmied = base({
  key: 'npc_schmied', lg: sLg, B: B({ shX: 7, legX: 5 }),
  head: [
    head([
      '..............',
      '..............',
      '..............',
      '.U..........u.',
      '.U.uu....uu.u.',
      '.U..........u.',
      '.Uv........Uu.',
      '.UvVUttttUUUu.',
      '.UUvUUUUUUUuu.',
      '..UvVUUUUUuu..',
      '...UvUUUUuu...',
      '....UUUUuu....',
    ]),
    head([
      '..............',
      '..............',
      '..............',
      '.uU...........',
      '.uUU.....uu...',
      '.uU...........',
      '.uu.....vU....',
      '..u....UvVUUUU',
      '.......UUvUUUu',
      '.......uUUUUu.',
      '........uUUu..',
      '.........uu...',
    ]),
    head([
      '...tTTtttSS...',
      '..tTTtttttSS..',
      '.tTTtttttttSS.',
      '.tTttttttttSS.',
      '.UtttttttttSu.',
      '.UUvUttttUUuu.',
      '.uUUUUUUUUuuu.',
      '..uUUUUUUuuu..',
      '...SSSSSSSs...',
      '...SSSSSSSs...',
    ]),
  ],
  torso: WIDE_TORSO,
  arm: { up: r2(P.skin), low: r2(P.skin), hand: r2(P.wood), w: 3 },
  leg: { c: r3(P.wood, 2), boot: r3(P.ash, 4), cuff: P.ash[3] },
  weapon: (l, k, hx, hy, ang) => smithHammer(l, hx, hy, ang),
  swing: [0.6, 0.8],
  carry: (dir) => (dir === 0 ? { mh: [-1, 6], wa: 112.5, oh: [0, 6] } : dir === 1 ? { mh: [2, 6], wa: 45 } : { mh: [1, 6], wa: 67.5 }),
});

// ================================================================ Sella (Händlerin)
const hLg = legend(P.skinD, DARK, [P.pink, P.fire, P.gold, P.teal, P.violet]);
const haendlerin = base({
  key: 'npc_haendlerin', lg: { ...hLg, A: P.violet[2], a: P.violet[1], b: P.violet[3], B: P.violet[4], p: P.pink[1], P: P.pink[2], q: P.pink[3], Q: P.pink[4] },
  head: [
    head([
      '...PqqPPPPp...',
      '..PqQePPPePp..',
      '.PqPPPePPPPPp.',
      '.PPePPPPPePpp.',
      '.pUuttttttuUp.',
      '.p..........p.',
      '.p..........p.',
      '.E..........E.',
    ]),
    head([
      '...PqqPPPPp...',
      '..PqQePPPPPPp.',
      '.pPqPPPePPPPp.',
      '.pPPePPPPPUUt.',
      '.pPPPPPPUu....',
      '.pPPPPPu......',
      '.ppPPPpu......',
      '. ppPPp.E.....',
      '..pPp.........',
      '..pp..........',
    ]),
    head([
      '...PqqPPPPp...',
      '..PqQePPPePp..',
      '.PqPPPePPPPPp.',
      '.PPePPPPPePpp.',
      '.PqPPPPePPPpp.',
      '.PPPePPPPPPpp.',
      '.pPPPPPPePppp.',
      '..pPPPqPPppp..',
      '.....PqPp.....',
      '.....pPp......',
      '......p.......',
    ]),
  ],
  torso: robes(
    [['..CdfeefCc..', '.CCdCeeCCCc.', '.CdDCCCCCCc.', '..CdCCCCCc..', '..cCCCCCcc..'], ['..CdCc..', '.cCdCCC.', '.cCdDCC.', '.cCCdCC.', '.ccCCCc.'], ['..CdCCCCCc..', '.CCdCCCCCCc.', '.CdDCCCCCCc.', '..CdCCCCCc..', '..cCCCCCcc..']],
    ['..gGhHhGGg..', '.gGhGGGh', '..gGhGGGGg..'], ['EfEeEfEeEfEe', 'EfEeEfEe', 'EfEeEfEeEfEe'], 5, 'bA'),
  arm: { up: r2(P.fire), low: r2(P.fire, 4), hand: r2(P.skinD) },
  leg: { c: r3(P.wood), boot: r3(P.wood), robe: true },
  mid: (k, L) => { if (k.dir !== 2) L((l) => { const x = k.dir === 0 ? k.cx - 6 : k.cx + 1, y = k.hipY - 1; l.rect(x, y, 4, 4, P.tan[2]); l.rect(x, y, 4, 1, P.tan[4]); l.rect(x + 3, y + 1, 1, 3, P.tan[1]); l.set(x + 1, y - 1, P.red[2]); l.set(x + 2, y - 1, P.green[3]); l.set(x + 1, y + 2, P.tan[1]); }); },
  carry: (dir) => (dir === 0 ? { mh: [1, 4], oh: [1, 4] } : dir === 1 ? { oh: [3, 4] } : {}),
});

// ================================================================ Fenwick (Gelehrter)
const gLg = legend(P.skin, P.stone, [P.blue, P.cream, P.wood, P.steel]);
const gelehrter = base({
  key: 'npc_gelehrter', lg: gLg, B: B({ leg: 8 }),
  head: [
    head([
      '..............',
      '..............',
      '.U..........u.',
      '.UU........Uu.',
      '.U.gg....gg.u.',
      '.Ug..gggg..gu.',
      '.ug..g..g..gu.',
      '...gg....gg...',
      '..............',
      '......UU......',
      '......uu......',
    ]),
    head([
      '..............',
      '..............',
      '.uU...........',
      '.uUU..........',
      '.uUUU....gg...',
      '.uUUU.ggg..g..',
      '.uuUU...g..g..',
      '. uuU....gg...',
      '..............',
      '.........Uu...',
      '.........u....',
    ]),
    head([
      '...tTTtttSS...',
      '..tTTtttttSS..',
      '.UtTtttttttSu.',
      '.UUtttttttSUu.',
      '.UUUvttttUUUu.',
      '.UUvUUUUUUUuu.',
      '.uUUUvUUUUuuu.',
      '..uUUUUUUuuu..',
      '....uSSSSu....',
      '....SSSSSs....',
    ]),
  ],
  torso: robes(
    [['..AAdDDdAA..', '..AbCdDCAa..', '..AbACcAAa..'], ['..AdDA..', '.aAbADC.', '.aAbAAC.'], ['..AAbAAAAa..', '..AbCCCCAa..', '..AbAAAAAa..']],
    ['..eEfEEEEe..', '.eEfEEEf', '..eEfEEEEe..'], ['cCdCCCCdCCcc', 'cCCdCCCc', 'cCdCCCCdCCcc'], 6),
  arm: { up: r2(P.blue), low: r2(P.blue, 4), hand: r2(P.skin) },
  leg: { c: r3(P.wood), boot: r3(P.wood), robe: true },
  off: (l, k, hx, hy) => { if (k.dir === 0) book(l, hx - 3, hy - 2); else if (k.dir === 1) book(l, hx, hy - 2, true); },
  swing: [0.7, 0.1],
  carry: (dir) => (dir === 0 ? { oh: [-3, 3], mh: [2, 4] } : dir === 1 ? { oh: [5, 2], oz: 1 } : { oh: [2, 3], mh: [-2, 4] }),
});

// ================================================================ Tobi (Kind)
const KID: Build = B({ leg: 4, torso: 6, arm: 5, shX: 5, legX: 3 });
const kLg = legend(P.skin, BLOND, [P.red, P.blue, P.gold, P.tan]);
const kind = base({
  key: 'npc_kind', lg: kLg, B: KID,
  head: [
    head([
      '......WW......',
      '.....bWWa.....',
      '...AbbAAAAa...',
      '..AbBAAAAAAa..',
      '.AbAAAAAAAAAa.',
      '.AbbbbbbbbbAa.',
      '.uUtUttttUtUu.',
      '.u..........u.',
    ], 2),
    head([
      '..WW..........',
      '..WWAAa.......',
      '...AbbAAAAa...',
      '..AbBAAAAAAAa.',
      '.aAbAAAAAAAAa.',
      '.aAbbbbbbbbbA.',
      '.uUUUUUtUtttt.',
      '.uUUUUt.......',
      '.uuUUu........',
      '. uu..........',
    ], 2),
    head([
      '......WW......',
      '.....AWWa.....',
      '...AbbAAAAa...',
      '..AbBAAAAAAa..',
      '.AbAAAAAAAAAa.',
      '.AbbbbbbbbbAa.',
      '.UvvUUvUUUUuu.',
      '.UvUvUUUuUUuu.',
      '.uUUUUuUUUuuu.',
      '..uUuUUuUuuu..',
      '....uSuSSu....',
      '....SSSSSs....',
    ], 2),
  ],
  torso: [
    art(['.CddCCc.', 'CdDCCCCc', 'CCdCfCcc', 'cCdCCCcc', '.gGhGGg.', '.gGhGGg.']),
    art(['.CdCc.', 'CdDCCc', 'cCdCCc', 'cCCCCc', '.GhGg.', '.gGGg.']),
    art(['.CddCCc.', 'CdDCCCCc', 'CCdCCCcc', 'cCdCCCcc', '.gGhGGg.', '.gGhGGg.']),
  ],
  arm: { up: r2(P.blue), low: r2(P.skin), hand: r2(P.skin) },
  leg: { c: r3(P.skin), boot: r3(P.wood), bootH: 2 },
  swing: [1, 1],
});

// ================================================================ Ayla (Jägerin)
const jLg = legend(P.skin, GINGER, [P.tan, P.wood, P.green, P.gold]);
const jaegerin = base({
  key: 'npc_jaegerin', lg: jLg,
  head: [
    head([
      '...UvvVvUUu...',
      '..UvVVvvUUUu..',
      '.UvVvvUvUUUUu.',
      '.UvUttttttUUu.',
      '.Utt......tUu.',
      '.U..........u.',
      '.u..........u.',
    ]),
    head([
      '...UvvVvUUu...',
      '..UvVVvvUUUu..',
      '.UvVvvUvUUUUu.',
      '.uUvUUUUttttt.',
      '.uUUUUt.......',
      '.uUUUUt.......',
      '.uuUUu........',
      '. uUu.........',
    ]),
    waldlaeufer.head[2],
  ],
  torso: [
    art(['.EfFEEe.', 'AEfEEeAa', 'AbAcAAAa', 'AbAAcAAa', '.AbAAcA.', '.cCdgCc.', '.AbAAAa.', '.aAAAAa.', '.cCaaCc.']),
    art(['.EfEe.', 'AEfEEa', 'AbAAcA', 'AbAAcA', '.AbAcA', '.cCdCg', '.AbAAa', '.aAAAa', '.cCCc.']),
    art(['.EfFEEe.', 'AEEfEeAa', 'AbcAAAAa', 'AbAcAAAa', '.AbAcAA.', '.cCdCCc.', '.AbAAAa.', '.aAAAAa.', '.cCaaCc.']),
  ],
  arm: { up: r2(P.tan), low: r2(P.wood, 4), hand: r2(P.skin) },
  leg: { c: r3(P.wood), boot: r3(P.ash, 4), bootH: 4, cuff: P.tan[3] },
  under: (k, L) => {
    const fake = { ...k, ps: { ...k.ps, bow: 0, arrow: false } } as K;
    if (k.dir === 0) { L((l) => wQuiver(l, k)); L((l) => bow(l, fake, k.topX + 1, k.shTop + 3, -22.5)); }
    else if (k.dir === 1) { L((l) => bow(l, fake, k.topX - 6, k.shTop + 4, 157.5)); L((l) => wQuiver(l, k)); }
    else { L((l) => wQuiver(l, k)); L((l) => bow(l, fake, k.topX - 1, k.shTop + 4, 22.5)); }
  },
  top: (k, L) => {
    const { dir, ps, headX: hx, neckY: ny, lg } = k;
    L((l) => {
      if (dir === 0) braid(l, hx - 6, ny - 1, 7, [-0.1, 1], ps.sw * 0.6, lg.U, lg.u, P.green[4]);
      else if (dir === 1) braid(l, hx - 6, ny - 3, 9, [-0.15 - ps.tr * 0.3, 1 - ps.tr * 0.1], ps.sw, lg.U, lg.u, P.green[4]);
      else braid(l, hx + 2, ny - 2, 9, [0.1, 1], ps.sw, lg.U, lg.u, P.green[4]);
    });
  },
});

// ================================================================ Dorfwache
const wLg = legend(P.skin, P.wood, [P.blue, P.steel, P.gold, P.wood], { p: P.red[1], P: P.red[2], q: P.red[3] });
const HELM: [Art, Art, Art] = [
  head([
    '......pP......',
    '.....pPPq.....',
    '...CddDddCc...',
    '..CdDDdddCCc..',
    '.CdDdddddCCCc.',
    '.CdddddddCCCc.',
    'cCCCCCCCCCCccc',
    '.c....Cd....c.',
    '.c....Cc....c.',
    '.c..........c.',
    '..c........c..',
  ], 2),
  head([
    '....pPq.......',
    '...pPPPq......',
    '...CddDddCc...',
    '..CdDDdddCCc..',
    '.cCdDddddCCCc.',
    '.cCddddddCCCc.',
    '.cCCCCCCCCCCCc',
    '.cCCCCc.....c.',
    '.cCCCc......c.',
    '. cCCc........',
  ], 2),
  head([
    '......pP......',
    '.....pPPq.....',
    '...CddDddCc...',
    '..CdDDdddCCc..',
    '.CdDdddddCCCc.',
    '.CdddddddCCCc.',
    'cCCCCCCCCCCccc',
    '.CddddddCCCCc.',
    '.cCdddCCCCCcc.',
    '.cCCCCCCCCccc.',
    '..cCCCCCCcc...',
    '....sSSSSs....',
  ], 2),
];
const wache = base({
  key: 'npc_wache', lg: wLg, head: HELM, torso: krieger.torso, plant: true,
  arm: krieger.arm, leg: krieger.leg, pauldron: krieger.pauldron,
  weapon: (l, k, hx, hy, ang) => spear(l, hx, hy, ang, 13, 10),
  swing: [0.2, 0.7],
  carry: (dir) => (dir === 0 ? { mh: [-2, 2], wa: -90 } : dir === 1 ? { mh: [5, 2], wa: -90 } : { mh: [2, 2], wa: -90, wz: 1 }),
});

// ================================================================ Hedda (Bergfrau)
const bLg = legend(P.skinD, GINGER, [P.teal, P.gold, P.wood, P.steel, P.fire], { A: P.teal[1], a: P.teal[0], b: P.teal[2], B: P.teal[3], C: P.stone[3], c: P.stone[2], d: P.stone[4], D: P.cream[4], z: P.gold[1], Z: P.gold[2], y: P.gold[3], Y: P.gold[4] });
const bergfrau = base({
  key: 'npc_bergfrau', lg: bLg, B: B({ shX: 7, legX: 5, leg: 6 }),
  head: [
    head([
      '....ZyyYyz....',
      '...ZyYJJyZz...',
      '..ZyYgJJgZZz..',
      '.ZyYygjjgZZZz.',
      'zZZZZZZZZZZZzz',
      '.UUtttttttUUu.',
      '.U..........u.',
      '.U..........u.',
    ], 1),
    head([
      '....ZyyYyz....',
      '...ZyYYyyZgJ..',
      '..ZyYYyyyZgJJ.',
      '.zZyYyyyyZZgj.',
      '.zZZZZZZZZZZZz',
      '.uUUUUUtUtttt.',
      '.uUUUUt.......',
      '.uuUUUt.......',
      '. uUUu........',
    ], 1),
    head([
      '....ZyyYyz....',
      '...ZyYYyyZz...',
      '..ZyYYyyyZZz..',
      '.ZyYyyyyyZZZz.',
      'zZZZZZZZZZZZzz',
      '.UvvUUvUUUUuu.',
      '.UvUvUUUuUUuu.',
      '.uUUUUuUUUuuu.',
      '..uUuUUuUuuu..',
      '....uSuSSu....',
      '....SSSSSs....',
    ], 1),
  ],
  torso: WIDE_TORSO,
  arm: { up: r2(P.stone, 4), low: r2(P.skinD), hand: r2(P.wood), w: 3 },
  leg: { c: [P.teal[1], P.teal[0], P.teal[0]], boot: r3(P.ash, 4), cuff: P.ash[3] },
  weapon: (l, k, hx, hy, ang) => pickaxe(l, hx, hy, ang),
  top: (k, L) => {
    const { dir, ps, headX: hx, neckY: ny, lg } = k;
    L((l) => {
      if (dir === 0) { braid(l, hx - 7, ny - 2, 6, [0, 1], ps.sw * 0.5, lg.U, lg.u, P.teal[3]); braid(l, hx + 5, ny - 2, 6, [0, 1], ps.sw * 0.5, lg.U, lg.u, P.teal[3]); }
      else if (dir === 1) braid(l, hx - 5, ny - 2, 7, [-0.2 - ps.tr * 0.2, 1], ps.sw, lg.U, lg.u, P.teal[3]);
      else { braid(l, hx - 5, ny - 2, 6, [0, 1], ps.sw * 0.5, lg.U, lg.u, P.teal[3]); braid(l, hx + 3, ny - 2, 6, [0, 1], ps.sw * 0.5, lg.U, lg.u, P.teal[3]); }
    });
  },
  post: (p, k) => {
    // Lampenschein am Helm
    if (k.dir === 2 || k.ps.label === 'lie') return;
    const x = k.dir === 0 ? k.headX : k.headX + 6, y = k.neckY - 8;
    for (const [dx, dy] of [[-1, -1], [2, -1], [-1, 1], [2, 1], [0, -2], [1, -2], [3, 0], [-2, 0]]) if (x + dx > 0 && x + dx < FW - 1 && y + dy > 0 && p.get(x + dx, y + dy) >>> 24 < 255) p.blend(x + dx, y + dy, alpha(P.fire[4], 110));
  },
  swing: [0.4, 0.8],
  carry: (dir) => (dir === 0 ? { mh: [3, 3], wa: -112.5 } : dir === 1 ? { mh: [2, 4], wa: -135, wz: 0 } : { mh: [-3, 3], wa: -67.5 }),
});

// ================================================================ Rakhan (Nomade)
const nLg = legend(P.skinD, DARK, [OCHRE, P.red, P.gold, P.gold], { p: P.red[1], P: P.red[2], q: P.red[3], Q: P.red[4] });
/** Buchstaben umschlüsseln (z. B. Turban auf einen anderen Farbslot legen) */
const re = (rows: string[], from: string, to: string): string[] => rows.map((r) => r.split('').map((ch) => { const i = from.indexOf(ch); return i < 0 ? ch : to[i]; }).join(''));
const nomade = base({
  key: 'npc_nomade', lg: nLg,
  head: [
    head(re([
      '.....AbbAAa.....',
      '...AAbBbAAAAa...',
      '..AbBbAAAAAaAa..',
      '.AbBAAhHAAAaaAa.',
      '.AbAAAaAAAAAaAa.',
      '.AAAaaAAAAaaAAa.',
      '..aSSttttttSSa..',
      '................',
      '................',
      '..eEfEEEEEEEee..',
      '...EfEEEEEEee...',
      '....EfEEEEee....',
      '.....eEEEee.....',
      '......eEee......',
    ], 'aAbB', 'pPqQ'), 2),
    head(re([
      '....AbbAAa......',
      '..AAbBbAAAAa....',
      '.AbBbAAAAAAaAa..',
      '.AbBAAAAAAhHAa..',
      '.AbAAAaAAAAAaAa.',
      '.aAAaaAAAAaaAAa.',
      '.aAa..uSSSSSS...',
      '.aAa............',
      '.aAa............',
      '.aAa....eEfEEEe.',
      '..aa....EfEEEe..',
      '..a......EEEe...',
      '..........Ee....',
    ], 'aAbB', 'pPqQ'), 2),
    head(re([
      '.....AbbAAa.....',
      '...AAbBbAAAAa...',
      '..AbBbAAAAAaAa..',
      '.AbBAAAAAAAaaAa.',
      '.AbAAAaAAAAAaAa.',
      '.AAAaaAAAAaaAAa.',
      '..aAAAAaAAAAaa..',
      '...aAAaAAAaaa...',
      '....aAAbAaa.....',
      '.....AbAa.......',
      '.....AAAa.......',
      '......Aa........',
    ], 'aAbB', 'pPqQ'), 2),
  ],
  torso: (() => {
    const t = robes(
      [['..CCdCCCCc..', '.CdCCdCCCCc.', '.CCdCCCCCcc.', '..cCdCCCcc..'], ['..CdCc..', '.CdCCCc.', '.CCdCCc.', '.cCCdCc.'], ['..CCdCCCCc..', '.CdCCdCCCCc.', '.CCdCCCCCcc.', '..cCCdCCcc..']],
      ['..cCdhgCCc..', '.cCdCCCh', '..cCdCCCCc..'], ['cCdCCCCdCCcc', 'cCCdCCCc', 'cCdCCCCdCCcc'], 5);
    return t;
  })(),
  arm: { up: r2(P.red), low: [OCHRE[3], OCHRE[2]], hand: r2(P.skinD) },
  leg: { c: r3(P.wood), boot: r3(P.wood), robe: true },
});

// ================================================================ Jorund (Einsiedler)
const eLg = legend(P.skin, P.stone, [P.tan, P.cream, P.wood, P.gold]);
const einsiedler = base({
  key: 'npc_einsiedler', lg: eLg, plant: true,
  head: [
    head([
      '....U.vU.U....',
      '...UvVvUvUu...',
      '..UvVVvvUvUUu.',
      '.UvVvvvUUvUUu.',
      '.UvvUvUUvUUUu.',
      '.UUvvttttvvUu.',
      '.U..........u.',
      '.Uv........Uu.',
      '.UvVUttttUvUu.',
      '.UvVvUUUUvUuu.',
      '..UvVvUUvUuu..',
      '..UvVVvUvUuu..',
      '...UvVvUvUu...',
      '...UvVVvUuu...',
      '....UvVvUu....',
      '....UvVUuu....',
      '.....UvUu.....',
      '......Uu......',
    ], 1),
    head([
      '....U.vU.U....',
      '...UvVvUvUu...',
      '..UvVVvvUvUUu.',
      '.uUvVvvUUvUUu.',
      '.uUvUvUUUUvvt.',
      '.uUUvUUUt.vv..',
      '.uUUvUUt......',
      '.uuUvUUt..vVUu',
      '.uuUUUu.UvVVUu',
      '..uuUu..UvVvUu',
      '...uu...UvVvUu',
      '........UvVvUu',
      '.........UvVUu',
      '.........UvVu.',
      '..........UVu.',
      '..........Uu..',
    ], 1),
    head([
      '....U.vU.U....',
      '...UvVvUvUu...',
      '..UvVVvvUvUUu.',
      '.UvVvvvUUvUUu.',
      '.UvvUvUUvUUUu.',
      '.UvVUUvUUvUUu.',
      '.UvUvUUvUUUuu.',
      '.uUvUUvUUvUuu.',
      '.uUUvUUUvUuuu.',
      '..uUUvUUUuuu..',
      '...uUUvUuuu...',
    ], 1),
  ],
  torso: robes(
    [['.CdDdCCdCCc.', '.CDdCdCCdCc.', '..CdAAAACc..'], ['.CdDdCc.', '.CDdCCCc', '.cAbAAC.'], ['.CdDdCCdCCc.', '.CDdCdCCdCc.', '..cAbAAAAc..']],
    ['..eEfEEEEe..', '.eEfEEEf', '..eEfEEEEe..'], ['CdDCdCDdCdCc', 'CdDCdCDc', 'CdDCdCDdCdCc'], 4),
  arm: { up: r2(P.tan), low: r2(P.cream, 4), hand: r2(P.skin) },
  leg: { c: r3(P.wood), boot: r3(P.wood), robe: true },
  weapon: (l, k, hx, hy, ang) => { stick(l, hx, hy, ang, 13, 9, P.wood); const a = (ang * Math.PI) / 180; l.set(Math.round(hx + 0.5 + Math.cos(a) * 13 + 1), Math.round(hy + 0.5 + Math.sin(a) * 13), P.wood[2]); l.set(Math.round(hx + 0.5 + Math.cos(a) * 14 + 1), Math.round(hy + 0.5 + Math.sin(a) * 14), P.wood[3]); },
  swing: [0.2, 0.6],
  carry: (dir) => (dir === 0 ? { mh: [-2, 3], wa: -90 } : dir === 1 ? { mh: [5, 3], wa: -90 } : { mh: [2, 3], wa: -90, wz: 1 }),
});

// ================================================================ Inga (Fellhändlerin)
const fLg = legend(P.skin, BLOND, [P.tan, P.wood, P.cream, P.red]);
const fellhaendlerin = base({
  key: 'npc_fellhaendlerin', lg: fLg, B: B({ leg: 6 }),
  head: [
    head([
      '.....AbbAAa.....',
      '...AbfFFfFfEa...',
      '..AfFfUvVvUfEEa.',
      '.AfFUvVvvUUUfEa.',
      '.AfUvvUUUUUUuEa.',
      '.AFUUttttttUuEa.',
      '.Af..........Ea.',
      '.AF..........Ea.',
      '.Af..........Ea.',
      '..fF........Ee..',
      '...fFf....fEe...',
      '....fFfEEfEe....',
    ], 1),
    head([
      '....AbbAAa......',
      '..AbbAAAAfFfe...',
      '.AbAAAAAfFfFfEe.',
      '.AbAAAAAfFUvUfE.',
      '.AAAAAAAfFUUtt..',
      '.aAAAAAAfF......',
      '.aAAAAAAfF......',
      '.aAAAAAAfE......',
      '.aaAAAAAfE......',
      '..aaAAAfFE......',
      '...aaAfFfEe.....',
      '.....fFfEEe.....',
    ], 1),
    head([
      '.....AbbAAa.....',
      '...AbbAAAAAAa...',
      '..AbbAAAAAAAAa..',
      '.AbAAAAAAAAAAAa.',
      '.AbAAAAAAAAAAaa.',
      '.AbAAAaAAAAAAaa.',
      '.AAAAAaAAAAAaaa.',
      '.aAAAAAaAAAAaaa.',
      '.aAAAAAaAAAaaaa.',
      '..aAAAAAAAaaaa..',
      '...fFfFfEfEEe...',
      '....fFfEEfEe....',
    ], 1),
  ],
  torso: robes(
    [['.EfFfEEfEEe.', '..AbAEfAAa..', '..AbAfEAAa..'], ['.EfFfEe.', '.aAbAEf.', '.aAbAAf.'], ['.EfFfEEfEEe.', '..AbAAAAAa..']],
    ['..cCdhgCCc..', '.cCdCCCh', '..cCdCCCCc..'], ['EfFEfEFfEfEe', 'EfFEfEFe', 'EfFEfEFfEfEe'], 3, 'fE'),
  arm: { up: r2(P.tan), low: r2(P.cream, 4), hand: r2(P.red) },
  leg: { c: r3(P.wood), boot: r3(P.cream, 4), robe: true },
  mid: (k, L) => { if (k.dir === 2) L((l) => { l.rect(k.cx - 5, k.shTop + 2, 9, 7, P.wood[2]); l.rect(k.cx - 5, k.shTop + 2, 9, 2, P.cream[3]); l.rect(k.cx - 5, k.shTop + 4, 2, 5, P.wood[3]); l.rect(k.cx + 2, k.shTop + 4, 2, 5, P.wood[1]); l.rect(k.cx - 4, k.shTop + 1, 7, 1, P.cream[4]); l.set(k.cx - 1, k.shTop + 6, P.gold[3]); }); else if (k.dir === 1) L((l) => { l.rect(k.cx - 7, k.shTop + 2, 4, 7, P.wood[2]); l.rect(k.cx - 7, k.shTop + 1, 4, 2, P.cream[3]); l.rect(k.cx - 7, k.shTop + 3, 1, 6, P.wood[3]); }); },
});

// ================================================================ Liora (Archäologin)
const lLg = legend(P.skinD, P.wood, [P.sand, P.cream, P.red, P.wood]);
const archaeologin = base({
  key: 'npc_archaeologin', lg: lLg,
  head: [
    head([
      '.....AbbbAa.....',
      '....AbBBbAAa....',
      '...AbBbbAAAAa...',
      '...gGhGGGGGGg...',
      '.aAbbbAAAAAAAAa.',
      '..aaaaaaaaaaaa..',
      '..USttttttttSu..',
      '..U..........u..',
      '..u..........u..',
    ], 2),
    head([
      '.....AbbbAa.....',
      '....AbBBbAAa....',
      '...AbBbbAAAAa...',
      '...gGhGGGGGGg...',
      '.aAbbAAAAAAAAAAa',
      '..aaaaaaaaaaaaa.',
      '..uUUUUUSSSSSS..',
      '..uUUUUt........',
      '..uuUUUt........',
      '.. uUUu.........',
    ], 2),
    head([
      '.....AbbbAa.....',
      '....AbBBbAAa....',
      '...AbBbbAAAAa...',
      '...gGhGGGGGGg...',
      '.aAbbbAAAAAAAAa.',
      '..aaaaaaaaaaaa..',
      '..UvUUvUUUUUuu..',
      '..UvUvUUUuUUuu..',
      '..uUUUvUUUUuuu..',
      '...uUuUUuUuuu...',
      '.....uSuSSu.....',
      '.....SSSSSs.....',
    ], 2),
  ],
  torso: [
    art(['.cCEECc.', 'CdDgdCCc', 'CdDdgCCc', 'cCddCgCc', '.CdCCCg.', '.gGhGGg.', '.AbAAAa.', '.AbAAAa.', '.aAaAAa.']),
    art(['.CEEc.', 'CdDCCg', 'CdDCgC', 'cCdCgC', '.CdCCg', '.gGhGg', '.AbAAa', '.AbAAa', '.aAAa.']),
    art(['.cCEECc.', 'CdDCCgCc', 'CdDCgCCc', 'cCdgCCCc', '.CgCCCc.', '.gGhGGg.', '.AbAAAa.', '.AbAAAa.', '.aAaAAa.']),
  ],
  arm: { up: r2(P.cream, 4), low: r2(P.skinD), hand: r2(P.skinD) },
  leg: { c: r3(P.sand), boot: r3(P.wood), bootH: 4, cuff: P.wood[4] },
  mid: mSatchel,
  top: (k, L) => { const { dir, ps, headX: hx, neckY: ny, lg } = k; if (dir !== 0) L((l) => { if (dir === 1) braid(l, hx - 5, ny - 2, 6, [-0.2 - ps.tr * 0.3, 1], ps.sw, lg.U, lg.u, P.red[3]); else braid(l, hx - 1, ny - 2, 7, [0, 1], ps.sw, lg.U, lg.u, P.red[3]); }); },
});

// ================================================================ Sen (Wächtergeist)
const GH_SKIN = [P.blue[2], P.blue[3], P.ice[2], P.ice[3]];
const GH_ROBE = [P.blue[1], P.blue[2], P.blue[3], P.ice[2]];
const sgLg = legend(GH_SKIN, P.ice, [GH_ROBE, P.ice, P.ice, P.ice], { p: P.blue[3], P: P.ice[3], q: P.ice[4], x: WHITE, X: WHITE, o: WHITE, e: P.ice[1], E: P.ice[2], f: P.ice[3], F: P.ice[4] });
const GH_TAIL = ['.AbAAAAAAAa.', '.AbAAaAAAAa.', '..AbAaAAAa..', '..AbAAaAa...', '...AbAaa....', '....Aa.a....', '.....a......'];
function ghostTorso(dir: Dir): Art {
  const t = robe(dir, dir === 1 ? ['..CdCc..', '.CdDCCC.', '.cCdCCc.'] : ['..CCdDdCCc..', '.CdDCdCCCCc.', '..cCdCCCcc..'], dir === 1 ? '.eEfEEEf' : '..eEfFfEEe..', dir === 1 ? '..a.....' : '.....a......', 7);
  const rows = t.rows.slice(0, 9);
  for (const r of GH_TAIL) rows.push(dir === 1 ? r.slice(2, 10) : r);
  return art(rows, 7);
}
function ghostPost(p: Px, k: K): void {
  const m = /death(\d)/.exec(k.ps.label), fade = m ? 1 - Number(m[1]) * 0.21 : 1;
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const c = p.d[y * FW + x];
    if (!(c >>> 24)) continue;
    const base2 = y > 30 ? 0.35 : y > 26 ? 0.55 : 0.78;
    p.d[y * FW + x] = alpha(mix(c, P.ice[3], 0.18), Math.round((c >>> 24) * base2 * fade));
  }
}
const geist = base({
  key: 'npc_geist', lg: sgLg, head: HELM, fade: true,
  torso: [ghostTorso(0), ghostTorso(1), ghostTorso(2)],
  arm: { up: [GH_ROBE[2], GH_ROBE[1]], low: [P.ice[2], P.ice[1]], hand: [P.ice[3], P.ice[2]] },
  leg: { c: r3(P.blue), boot: r3(P.blue), none: true },
  weapon: (l, k, hx, hy, ang) => spear(l, hx, hy, ang, 12, 8, P.ice[3]),
  post: ghostPost,
  swing: [0.2, 0.5],
  carry: (dir) => (dir === 0 ? { mh: [-2, 2], wa: -90, y: -1 } : dir === 1 ? { mh: [5, 2], wa: -90, y: -1 } : { mh: [2, 2], wa: -90, wz: 1, y: -1 }),
  anim: (a, dir, f) => (a === 'walk' || a === 'run' ? { y: [-1, 0, 0, -1, -2, -2][f], lean: dir === 1 ? (a === 'run' ? 2 : 1) : 0 } : null),
});

// ================================================================ Maelis (Echo)
const EC_SKIN = [P.cream[2], P.cream[3], P.cream[4], WHITE];
const EC_HAIR = [P.gold[1], P.gold[2], P.gold[3], P.gold[4]];
const ecLg = legend(EC_SKIN, EC_HAIR, [[P.cream[2], P.cream[3], P.cream[4], WHITE], P.gold, P.gold], { x: P.gold[0], X: P.gold[1], o: WHITE, r: mix(P.cream[4], P.fire[3], 0.3), M: P.gold[2] });
function echoPost(p: Px, k: K): void {
  const m = /death(\d)/.exec(k.ps.label), fade = m ? 1 - Number(m[1]) * 0.21 : 1, src = p.d.slice();
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < FW && y < FH && src[y * FW + x] >>> 24 >= 128;
  for (let y = 1; y < FH - 4; y++) for (let x = 1; x < FW - 1; x++) {
    const i = y * FW + x;
    if (on(x, y)) { p.d[i] = alpha(mix(src[i], P.gold[4], src[i] === src[0] ? 0 : 0.06), Math.round(255 * (fade < 1 ? fade * 0.9 : 1))); continue; }
    let n = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (on(x + dx, y + dy)) n += 2;
    for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, 1], [1, -1], [-1, -1]]) if (on(x + dx, y + dy)) n += 1;
    if (n) p.d[i] = alpha(P.gold[4], Math.round(Math.min(150, 36 + n * 22 + (k.ps.sw ? 10 : 0)) * fade));
  }
}
const echo = base({
  key: 'npc_echo', lg: ecLg, B: B({ leg: 4, torso: 6, arm: 5, shX: 5, legX: 3 }), fade: true,
  head: [
    head([
      '...UvVVVvUu...',
      '..UvVVVVVvUu..',
      '.UvVVvVVvVVUu.',
      '.UvVvttttvVUu.',
      '.UVvttttttvUu.',
      '.Uv........vu.',
      '.Uv........vu.',
      '.Uv........Uu.',
      '.UvU......UUu.',
      '.UvU......Uuu.',
      '.UvU......Uu..',
      '..UU......Uu..',
      '..U........u..',
    ]),
    head([
      '...UvVVVvUu...',
      '..UvVVVVVvUu..',
      '.UvVVvVVvVVUu.',
      '.UvVVVVVvUttt.',
      '.UvVVVVVUtt...',
      '.UvVVVVUt.....',
      '.UvVVVvUt.....',
      '.UvVVVvU......',
      '.UvVVvUu......',
      '.UvVVvUu......',
      '.UvVvUu.......',
      '..UvVUu.......',
      '..UvUu........',
    ]),
    head([
      '...UvVVVvUu...',
      '..UvVVVVVvUu..',
      '.UvVVvVVvVVUu.',
      '.UvVVvVVVvVUu.',
      '.UvVvVVvVVvUu.',
      '.UvVVvVVvVVUu.',
      '.UvVvVVVvVvUu.',
      '.UvVVvVvVVUUu.',
      '.UvVvVVVvVUuu.',
      '.UvVVvVvVVUuu.',
      '.UVvVVvVvUUu..',
      '..UvVvVVvUu...',
      '..UvUvUvUu....',
    ]),
  ],
  torso: [
    art(['..AbbAAa..', '.AbBbAAAa.', '.AbbdDAAa.', '.AbAAAAAa.', '.cCdCCCCc.', '.AbAAAAAa.', '.AbAAAAAa.', 'AAbAAAAAAa', 'cCdCCCdCcc'], 3),
    art(['.AbBa.', '.AbbAa', '.AbbAd', '.AbAAa', '.cCdCc', '.AbAAa', '.AbAAa', 'AAbAAa', 'cCdCCc'], 3),
    art(['..AbbAAa..', '.AbBbAAAa.', '.AbbAAAAa.', '.AbAAAAAa.', '.cCdCCCCc.', '.AbAAAAAa.', '.AbAAaAAa.', 'AAbAAaAAAa', 'cCdCCCdCcc'], 3),
  ],
  arm: { up: [P.cream[4], P.cream[3]], low: [P.cream[4], P.cream[3]], hand: [WHITE, P.cream[4]] },
  leg: { c: [P.cream[4], P.cream[3], P.cream[2]], boot: [P.cream[4], P.cream[3], P.cream[2]], robe: true },
  post: echoPost,
  swing: [0.6, 0.6],
});

// ================================================================ Pim (Krämer)
const pLg = legend(P.skin, GINGER, [P.forest, P.sand, P.gold, P.wood, P.red]);
function pimPack(k: K, L: LayerFn): void {
  const { dir, topX: tx, shTop: sy, ps } = k, b = ps.sw > 0 ? 1 : 0, T = P.tan, hi = k.hipY;
  if (ps.tag.includes('tuck')) return;
  L((l) => {
    if (dir === 1) {
      const x0 = Math.max(4, tx - 12), y0 = sy - 11 + b, w = 10, h = hi - y0 + 2;
      l.rrect(x0, y0 + 3, w, h - 3, T[2]); l.rect(x0, y0 + 5, 2, h - 7, T[3]); l.rect(x0 + w - 2, y0 + 5, 2, h - 6, T[1]);
      l.rect(x0 + 1, y0 + 9, w - 2, 1, T[1]); l.rect(x0 + 2, y0 + 13, w - 4, 1, T[1]); l.rect(x0 + 2, y0 + 14, 5, 4, T[3]); l.rect(x0 + 2, y0 + 17, 5, 1, T[1]); l.set(x0 + 4, y0 + 15, P.gold[3]);
      l.rrect(x0 + 1, y0, w - 1, 4, P.cream[3]); l.rect(x0 + 2, y0, w - 3, 1, P.cream[4]); l.rect(x0 + 3, y0, 1, 4, P.red[2]); l.rect(x0 + 7, y0, 1, 4, P.red[2]); l.rect(x0 + 1, y0 + 3, w - 1, 1, P.cream[2]);
      l.ell(x0 + 0.5, y0 + 15.5, 2, 2.6, P.steel[2]); l.ell(x0 + 0.2, y0 + 15.2, 1.2, 1.8, P.steel[3]); l.rect(x0 + 1, y0 + 11, 1, 3, P.steel[1]);
      l.rect(x0 + 4, y0 + 5, 3, 3, P.tan[4]); l.rect(x0 + 4, y0 + 7, 3, 1, T[1]);
    } else {
      const x0 = tx - 9, y0 = sy - 12 + b, w = 18, h = dir === 0 ? hi - y0 - 2 : hi - y0 + 2;
      l.rrect(x0, y0 + 3, w, h - 3, dir === 0 ? T[1] : T[2]);
      l.rect(x0, y0 + 5, 2, h - 7, dir === 0 ? T[2] : T[3]); l.rect(x0 + w - 3, y0 + 5, 3, h - 7, dir === 0 ? T[0] : T[1]);
      l.rrect(x0 + 1, y0, w - 2, 4, P.cream[3]); l.rect(x0 + 2, y0, w - 4, 1, P.cream[4]); l.rect(x0 + 4, y0, 1, 4, P.red[2]); l.rect(x0 + w - 5, y0, 1, 4, P.red[2]); l.rect(x0 + 1, y0 + 3, w - 2, 1, P.cream[2]);
      l.ell(x0 - 0.5, y0 + 17, 2.4, 3, P.steel[2]); l.ell(x0 - 0.8, y0 + 16.6, 1.5, 2, P.steel[3]); l.rect(x0, y0 + 11, 1, 4, P.steel[1]);
      l.rect(x0 + w, y0 + 12, 2, 3, P.gold[2]); l.rect(x0 + w, y0 + 13, 2, 1, P.fire[4]); l.rect(x0 + w, y0 + 10, 1, 2, P.steel[1]); l.rect(x0 + w, y0 + 15, 2, 1, P.gold[1]);
      if (dir === 2) {
        l.rect(x0 + 2, y0 + 5, w - 5, 1, T[3]); l.rect(x0 + 1, y0 + 10, w - 2, 1, T[1]);
        l.rect(x0 + 3, y0 + 6, 1, h - 8, T[1]); l.rect(x0 + w - 5, y0 + 6, 1, h - 8, T[1]);
        l.rect(x0 + 5, y0 + 12, 7, 6, T[3]); l.rect(x0 + 5, y0 + 12, 7, 2, T[4]); l.rect(x0 + 5, y0 + 17, 7, 1, T[1]); l.rect(x0 + 11, y0 + 13, 1, 5, T[1]); l.rect(x0 + 8, y0 + 14, 1, 2, P.gold[3]);
        l.rect(x0 + 3, y0 + 8, 1, 1, P.gold[3]); l.rect(x0 + w - 5, y0 + 8, 1, 1, P.gold[3]);
        l.rect(x0 + 6, y0 + 20, 5, 3, T[1]); l.rect(x0 + 6, y0 + 20, 5, 1, T[3]);
      }
    }
  });
}
const kraemer = base({
  key: 'npc_kraemer', lg: pLg, B: B({ leg: 5, arm: 6 }),
  head: [
    head([
      '......AbAa......',
      '.....AbbAAa.....',
      '....AbBbAAAa....',
      '....eEfFfEEe....',
      '.aAbbAAAAAAAAAa.',
      'aAAaaaaaaaaaaAAa',
      'a.USttttttttSu.a',
      '..U..........u..',
      '..u..........u..',
      '....UvVUUVvU....',
      '.....Uu..uU.....',
    ], 2),
    head([
      '.....AbAa.......',
      '....AbbAAa......',
      '...AbBbAAAa.....',
      '...eEfFfEEe.....',
      'aAbbAAAAAAAAAAa.',
      '.aaaaaaaaaaaaAAa',
      '..uUUUUUSSSSS..a',
      '..uUUUUt........',
      '..uuUUUt........',
      '.. uUUu...UvVU..',
      '...........Uu...',
    ], 2),
    head([
      '......AbAa......',
      '.....AbbAAa.....',
      '....AbBbAAAa....',
      '....eEfEEEEe....',
      '.aAbbAAAAAAAAAa.',
      'aAAaaaaaaaaaaAAa',
      'a.UvUUvUUUUUuu.a',
      '..UvUvUUUuUUuu..',
      '..uUUUvUUUUuuu..',
      '...uUuUUuUuuu...',
      '.....uSuSSu.....',
      '.....SSSSSs.....',
    ], 2),
  ],
  torso: [
    art(['.cCddCc.', 'gJCddCIg', 'gJCdCCIg', 'IgCdCCgi', 'IJiCCIIi', '.gGhfGg.', '.GhGGGg.', '.GhGGGg.', '.gGgGGg.']),
    art(['.CddC.', 'iJgCdC', 'iJgCCC', 'iIJgCC', '.IJIIi', '.gGhGf', '.GhGGg', '.GhGGg', '.gGGg.']),
    art(['.cCddCc.', 'IJCddCIi', 'IJCdCCIi', 'IJICCIIi', 'IJIIIIIi', '.gGhGGg.', '.GhGGGg.', '.GhGGGg.', '.gGgGGg.']),
  ],
  arm: { up: r2(P.sand, 4), low: r2(P.sand, 4), hand: r2(P.skin) },
  leg: { c: r3(P.wood), boot: r3(P.ash, 4), cuff: P.ash[3] },
  under: (k, L) => { if (k.dir !== 2) pimPack(k, L); },
  top: (k, L) => {
    if (k.dir === 2) pimPack(k, L);
    L((l) => { const x = k.headX + (k.dir === 1 ? -2 : 3), y = k.neckY - 12; l.set(x, y, P.red[2]); l.set(x + 1, y - 1, P.red[3]); l.set(x + 1, y - 2, P.red[3]); l.set(x + 2, y - 3, P.red[2]); }, false);
  },
  weapon: (l, k, hx, hy, ang) => { stick(l, hx, hy, ang, 9, 8, P.wood); },
  plant: true, swing: [0.2, 0.7],
  carry: (dir) => (dir === 0 ? { mh: [-2, 2], wa: -90 } : dir === 1 ? { mh: [5, 2], wa: -90 } : { mh: [2, 2], wa: -90, wz: 1 }),
});

export const NPCS: Record<string, Costume> = {
  npc_aelteste: aelteste, npc_schmied: schmied, npc_haendlerin: haendlerin, npc_gelehrter: gelehrter, npc_kind: kind,
  npc_jaegerin: jaegerin, npc_wache: wache, npc_bergfrau: bergfrau, npc_nomade: nomade, npc_einsiedler: einsiedler,
  npc_fellhaendlerin: fellhaendlerin, npc_archaeologin: archaeologin, npc_geist: geist, npc_echo: echo, npc_kraemer: kraemer,
};
