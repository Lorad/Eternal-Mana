/**
 * Garderobe: fünf Gewand-Varianten je Klasse (`char_<klasse>_<variante>`), gleiches Sheet-Layout wie die Klassen.
 * Eine Variante ist eine Umfärbung von Kleidung und Rüstung an der Quelle – Legende, Arm-/Beinfarben und alle
 * Kostüm-Ebenen (Umhang, Schulterstücke, Bänder, Taschen) werden über eine Farbtabelle auf die Rampen des Themas
 * gelegt, bevor Trennlinien und Außenkontur entstehen. Haut, Haar und Waffen bleiben; dazu kommt je Thema ein
 * kleines Motiv (Kragen, Gürtel, Saum) über zusätzliche Legendenzeichen y/Y/z/Z in den Rumpfkarten.
 */
import { Px } from '../draw';
import { P, WHITE, mix } from '../palette';
import type { Ramp } from '../palette';
import { CLASS_IDS, OUTFIT_IDS } from '../spec';
import type { OutfitId } from '../spec';
import { mixR } from './rig';
import type { Art, Costume, Dir, Hook, ItemFn, Legend } from './rig';
import { CLASSES, M_ROBE, P_SKY, S_COAL, S_PINK, S_TEAL } from './classes';

type ClassId = (typeof CLASS_IDS)[number];
type Role = 'main' | 'deep' | 'alt' | 'trim' | 'leather' | 'keep';
interface Theme {
  /** Hauptstoff · dunklere Zweitfarbe desselben Tons · Gegenfarbe (Rüstung, Hut, Leder) · Zierrat · Riemen und Stiefel */
  main: Ramp; deep: Ramp; alt: Ramp; trim: Ramp; leather: Ramp;
  /** Motivfarben für die Legendenzeichen y, Y, z, Z */
  motif: [number, number, number, number];
  /** Stulpenfarbe der Stiefel (überschreibt die umgefärbte) */
  cuff?: number;
}

const THEMES: Record<OutfitId, Theme> = {
  // Waldgewand: Laubgrün und Rindenbraun, Ocker als Zierrat, Blätterkragen mit roten Beeren
  wald: {
    main: P.green, deep: P.forest, alt: P.tan, trim: mixR(P.gold, P.tan, 0.45), leather: P.wood,
    motif: [P.green[3], P.green[4], P.red[2], P.red[3]],
  },
  // Glutgewand: Glutrot und Kohlschwarz, Zierrat in Flammenfarben, glimmende Schnalle und Funken am Saum
  glut: {
    main: [P.red[0], P.red[1], P.red[2], mix(P.red[3], P.fire[1], 0.5), mix(P.red[4], P.fire[2], 0.6)],
    deep: [P.ash[0], P.red[0], P.red[1], P.red[2], P.red[3]],
    alt: [P.ash[1], P.ash[2], P.ash[3], P.ash[4], mix(P.ash[4], P.stone[3], 0.5)],
    trim: P.fire,
    leather: [P.ash[0], P.ash[1], mix(P.ash[2], P.red[0], 0.4), mix(P.ash[3], P.red[1], 0.4), mix(P.ash[4], P.red[2], 0.35)],
    motif: [P.fire[1], P.fire[2], P.fire[3], P.fire[4]],
  },
  // Frostgewand: Eisblau und Schneeweiß, Silber, Pelzkragen und Pelzstulpen
  frost: {
    main: [P.blue[1], P.blue[2], P.blue[3], P.ice[2], P.ice[3]],
    deep: P.blue, alt: P.snow,
    trim: [P.steel[1], P.steel[2], P.steel[3], P.steel[4], WHITE],
    leather: mixR(P.steel, P.blue, 0.3),
    motif: [P.snow[2], P.snow[4], P.ice[3], WHITE], cuff: P.snow[4],
  },
  // Schattengewand: Violett und Schwarz, bleicher Zierrat, bleiche Schärpe
  schatten: {
    main: P.violet,
    deep: [P.shadow[0], P.violet[0], P.violet[1], P.violet[2], P.violet[3]],
    alt: [P.shadow[1], P.shadow[2], P.shadow[3], P.shadow[4], mix(P.shadow[4], P.violet[3], 0.4)],
    trim: P.bone,
    leather: [P.shadow[0], P.shadow[1], mix(P.shadow[2], P.violet[1], 0.4), mix(P.shadow[3], P.violet[1], 0.4), mix(P.shadow[4], P.violet[2], 0.4)],
    motif: [P.bone[2], P.bone[4], P.bone[3], WHITE],
  },
  // Goldgewand (das Prunkstück): Weiß und Gold, Goldkragen, Goldgürtel mit hellem Stein
  gold: {
    main: [P.cream[1], P.cream[2], P.cream[3], P.cream[4], WHITE],
    deep: P.cream, alt: P.gold,
    trim: P.gold,
    leather: [P.gold[0], P.gold[1], mix(P.gold[1], P.tan[2], 0.5), P.tan[3], P.tan[4]],
    motif: [P.gold[2], P.gold[4], P.ice[3], WHITE], cuff: P.gold[4],
  },
};

/** Quellfarben einer Klasse: Rampe (bzw. Farbliste) und die Stufen der Zielrampe, auf die sie fallen */
interface Src { c: Ramp; at?: number[] }
interface ClassOutfit {
  src: Src[];
  /** Rolle je Quellrampe und Thema (gleiche Reihenfolge wie `src`) */
  roles: Record<OutfitId, Role[]>;
  /** auch den Gegenstand der Nebenhand umfärben (Schild des Kriegers) */
  off?: boolean;
}
const all = (r: Role[]): Record<OutfitId, Role[]> => ({ wald: r, glut: r, frost: r, schatten: r, gold: r });
const CLASS_OUTFIT: Record<ClassId, ClassOutfit> = {
  // Waffenrock · Plattenteile · Zierrat · Gürtel und Stiefel (im Glutgewand vertauscht: schwarzer Rock, glutrote Platten – der Rock ist schon rot)
  krieger: {
    src: [{ c: P.red }, { c: P.steel }, { c: P.gold }, { c: P.wood }], off: true,
    roles: { ...all(['main', 'alt', 'trim', 'leather']), glut: ['alt', 'main', 'trim', 'leather'] },
  },
  // Robe · Hut · Borten und Stern · Riemen und Tasche · Schuhe (im Schattengewand: schwarze Robe, violetter Hut)
  magier: {
    src: [{ c: M_ROBE }, { c: P.violet }, { c: P.gold }, { c: P.tan }, { c: P.wood }],
    roles: { ...all(['main', 'alt', 'trim', 'leather', 'leather']), schatten: ['alt', 'main', 'trim', 'leather', 'leather'] },
  },
  // Umhang und Kapuzenkragen · Rock · Lederwams · Schnalle · Gürtel, Köcher, Stiefel (im Waldgewand vertauscht: Rindenumhang, grünes Wams)
  waldlaeufer: {
    src: [{ c: P.forest }, { c: P.green }, { c: P.tan }, { c: P.gold }, { c: P.wood }],
    roles: { ...all(['main', 'deep', 'alt', 'trim', 'leather']), wald: ['leather', 'deep', 'main', 'trim', 'leather'] },
  },
  // Rüstung · Gold (Borten, Handschuhe, Stiefel) · Umhang, Stirnband und Stein · Helmflügel · Leder
  paladin: {
    src: [{ c: P.cream }, { c: P.gold }, { c: P_SKY, at: [1, 2, 3, 4] }, { c: P.snow }, { c: P.wood }],
    roles: {
      wald: ['main', 'trim', 'alt', 'keep', 'leather'], glut: ['alt', 'trim', 'main', 'trim', 'leather'], frost: ['main', 'trim', 'alt', 'keep', 'leather'],
      schatten: ['alt', 'trim', 'main', 'trim', 'leather'], gold: ['alt', 'main', 'main', 'keep', 'leather'], // Goldrüstung, Weiß für alles bisher Goldene
    },
  },
  // Anzug · Maske und Hose · Schal und Band · helle Akzente
  schattenjaeger: {
    src: [{ c: S_TEAL, at: [0, 1, 2, 3] }, { c: S_COAL, at: [1, 2, 3, 4] }, { c: S_PINK, at: [1, 2, 3, 4] }, { c: [P.teal[3], P.teal[4]], at: [3, 4] }],
    roles: {
      wald: ['main', 'leather', 'trim', 'deep'], glut: ['alt', 'leather', 'main', 'trim'], frost: ['main', 'leather', 'alt', 'trim'],
      schatten: ['main', 'alt', 'trim', 'deep'], gold: ['main', 'leather', 'alt', 'trim'],
    },
  },
};

// ---------------------------------------------------------------- Motive in den Rumpfkarten
/** Ersetzt in einer Zeile der Karte jedes belegte Zeichen: fn(Zeichen, laufende Nummer, Anzahl) */
function mapRow(a: Art, row: number, fn: (ch: string, j: number, n: number) => string): Art {
  if (row < 0) row += a.rows.length;
  const src = a.rows[row], n = src.replace(/\./g, '').length;
  let j = 0;
  const out = src.split('').map((ch) => (ch === '.' ? ch : fn(ch, j++, n))).join('');
  return { rows: a.rows.map((r, i) => (i === row ? out : r)), w: a.w, ay: a.ay };
}
const BELT = 5;
const MOTIF: Record<OutfitId, (a: Art, dir: Dir) => Art> = {
  // Blätterkragen: helle und dunkle Blätter, dazwischen Beeren
  wald: (a) => mapRow(a, 0, (_, j) => (j % 3 === 1 ? 'z' : j % 2 ? 'y' : 'Y')),
  // glimmende Schnalle (vorn Mitte, seitlich vorn) und Funken am Saum
  glut: (a, dir) => mapRow(mapRow(a, BELT, (ch, j, n) => (dir === 0 && (j === (n >> 1) - 1 || j === n >> 1) ? (j === n >> 1 ? 'z' : 'Z') : dir === 1 && j === n - 1 ? 'Z' : ch)), -1, (ch, j) => (j % 3 === 1 ? 'y' : ch)),
  // Pelzkragen
  frost: (a) => mapRow(a, 0, (_, j, n) => (j === n - 1 || j % 3 === 2 ? 'y' : 'Y')),
  // bleiche Schärpe statt des Gürtels
  schatten: (a) => mapRow(a, BELT, (_, j, n) => (j < n / 2 ? 'Y' : 'y')),
  // Goldkragen und Goldgürtel mit hellem Stein
  gold: (a, dir) => mapRow(mapRow(a, 0, (_, j, n) => (j === 0 || j === n - 1 ? 'y' : 'Y')), BELT, (_, j, n) => (dir === 0 && j === n >> 1 ? 'Z' : dir === 0 && j === (n >> 1) - 1 ? 'z' : dir === 1 && j === n - 1 ? 'Z' : j < n / 2 ? 'Y' : 'y')),
};

// ---------------------------------------------------------------- Umfärben
function outfit(cls: ClassId, id: OutfitId): Costume {
  const base = CLASSES[`char_${cls}`], th = THEMES[id], co = CLASS_OUTFIT[cls], roles = co.roles[id];
  const map = new Map<number, number>();
  co.src.forEach((s, i) => {
    const role = roles[i];
    if (role === 'keep') return;
    const to = th[role], at = s.at ?? (s.c.length === 5 ? [0, 1, 2, 3, 4] : [1, 2, 3, 4]);
    s.c.forEach((c, j) => map.set(c, to[at[j]]));
  });
  const m = (c: number): number => map.get(c) ?? c;
  const m2 = (a: [number, number]): [number, number] => [m(a[0]), m(a[1])];
  const m3 = (a: [number, number, number]): [number, number, number] => [m(a[0]), m(a[1]), m(a[2])];
  const remap = (l: Px): void => { const d = l.d; for (let i = 0; i < d.length; i++) { const c = d[i]; if (c >>> 24) { const t = map.get(c); if (t !== undefined) d[i] = t; } } };
  const hook = (h?: Hook): Hook | undefined => h && ((k, L) => h(k, (fn, sep) => L((l) => { fn(l); remap(l); }, sep)));
  const item = (f?: ItemFn): ItemFn | undefined => f && ((l, k, hx, hy, ang) => { const t = new Px(l.w, l.h); f(t, k, hx, hy, ang); remap(t); l.draw(t); });
  const lg: Legend = {};
  for (const ch of Object.keys(base.lg)) lg[ch] = m(base.lg[ch]);
  [lg.y, lg.Y, lg.z, lg.Z] = th.motif;
  const pauldron = base.pauldron;
  return {
    ...base, key: `char_${cls}_${id}`, lg,
    torso: [MOTIF[id](base.torso[0], 0), MOTIF[id](base.torso[1], 1), MOTIF[id](base.torso[2], 2)],
    arm: { ...base.arm, up: m2(base.arm.up), low: m2(base.arm.low), hand: m2(base.arm.hand) },
    leg: { ...base.leg, c: m3(base.leg.c), boot: m3(base.leg.boot), cuff: base.leg.cuff === undefined ? undefined : th.cuff ?? m(base.leg.cuff) },
    pauldron: pauldron && ((l, k, s, far, side) => { const t = new Px(l.w, l.h); pauldron(t, k, s, far, side); remap(t); l.draw(t); }),
    under: hook(base.under), mid: hook(base.mid), top: hook(base.top),
    off: co.off ? item(base.off) : base.off,
  };
}

/** Alle Gewand-Varianten, Schlüssel `char_<klasse>_<variante>` */
export const OUTFITS: Record<string, Costume> = {};
for (const cls of CLASS_IDS) for (const id of OUTFIT_IDS) OUTFITS[`char_${cls}_${id}`] = outfit(cls, id);
