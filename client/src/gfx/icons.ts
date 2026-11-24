/** 24x24-Icons für die HTML-UI (Items, Skill-Glyphen) als Data-URLs. */
import { Px, crystal } from './draw';
import { P, Ramp, INK, WHITE, mix } from './palette';
import type { ElementKey } from './spec';
import { CRAFT_FLAT, CRAFT_GLOW, CRAFT_ICONS, iconTile } from './icons_craft';

type Fn = (p: Px) => void;
const blade = (p: Px, x0: number, y0: number, x1: number, y1: number, r: Ramp = P.steel) => { p.line(x0, y0, x1, y1, r[3], 3); p.line(x0, y0, x1, y1, r[4], 2); p.line(x0 + 2, y0 + 1, x1 + 2, y1 + 1, r[2]); };
const potion = (r: Ramp): Fn => (p) => { p.ball(12, 15, 7, 6.5, r, 1, 4); p.rect(10, 4, 4, 6, P.ice[3]); p.rect(9, 7, 6, 1, P.ice[4]); p.rect(10, 2, 4, 2, P.tan[2]); p.rect(10, 2, 2, 1, P.tan[4]); p.rect(6, 12, 12, 2, mix(r[4], WHITE, 0.4)); p.rect(8, 11, 2, 1, WHITE); p.rect(7, 13, 1, 3, WHITE); p.set(15, 18, r[4]); };
const seal = (r: Ramp, glyph: Fn): Fn => (p) => { p.ell(12, 12, 10, 10, P.gold[1]); p.ell(12, 12, 9, 9, P.gold[3]); p.ell(12, 12, 7.5, 7.5, r[1]); p.ball(12, 12, 6.5, 6.5, r, 1, 3); p.rect(6, 4, 5, 1, P.gold[4]); p.rect(4, 6, 1, 4, P.gold[4]); const q = new Px(24, 24); glyph(q); for (let i = 0; i < q.d.length; i++) if (q.d[i]) p.d[i] = q.d[i]; };
const mat = (fn: Fn): Fn => fn;

const ITEMS: Record<string, Fn> = {
  sword: (p) => { blade(p, 8, 14, 18, 4); p.rect(19, 2, 2, 2, P.steel[4]); p.line(5, 12, 11, 18, P.gold[3], 2); p.set(5, 12, P.gold[4]); p.line(7, 16, 4, 19, P.wood[2], 2); p.rect(2, 20, 3, 3, P.gold[3]); p.set(2, 20, P.gold[4]); },
  axe: (p) => { p.line(5, 21, 17, 5, P.wood[2], 2); p.line(5, 21, 16, 6, P.wood[3]); p.poly([[12, 3], [19, 2], [22, 8], [21, 14], [16, 11], [14, 8]], P.steel[3]); p.poly([[12, 3], [19, 2], [16, 8], [14, 8]], P.steel[4]); p.line(21, 8, 20, 13, P.steel[2]); p.rect(3, 20, 3, 3, P.tan[2]); },
  staff: (p) => { p.line(5, 22, 15, 7, P.wood[2], 2); p.line(5, 22, 15, 8, P.wood[3]); p.ball(17, 5.5, 4, 4, P.blue, 1, 4); p.set(15, 4, WHITE); p.line(13, 8, 12, 5, P.gold[3]); p.line(16, 10, 19, 10, P.gold[2]); p.set(13, 9, P.gold[4]); p.set(8, 17, P.gold[3]); p.set(9, 16, P.gold[3]); },
  bow: (p) => { for (let i = 0; i <= 20; i++) { const t = i / 20, x = 5 + t * 14 + Math.sin(t * Math.PI) * 5, y = 20 - t * 16 + Math.sin(t * Math.PI) * 5; p.rect(Math.round(x), Math.round(y), 2, 2, i < 3 || i > 17 ? P.wood[4] : P.wood[2]); } p.line(5, 21, 19, 4, P.cream[3]); p.rect(14, 14, 2, 3, P.tan[3]); p.line(4, 13, 17, 13, P.tan[4]); p.poly([[16, 11], [20, 13.5], [16, 16]], P.steel[4]); p.rect(3, 12, 2, 1, P.red[3]); p.rect(3, 14, 2, 1, P.red[2]); },
  hammer: (p) => { p.line(5, 21, 14, 10, P.wood[2], 2); p.line(5, 21, 14, 11, P.wood[3]); p.poly([[9, 6], [15, 1], [22, 9], [16, 14]], P.steel[3]); p.poly([[9, 6], [15, 1], [17, 3], [11, 8]], P.steel[4]); p.poly([[20, 7], [22, 9], [16, 14], [14, 12]], P.steel[2]); p.line(12, 9, 18, 4, P.gold[3]); p.rect(3, 20, 3, 3, P.gold[3]); },
  dagger: (p) => { blade(p, 11, 12, 18, 5); p.rect(19, 3, 2, 2, P.steel[4]); p.line(8, 11, 13, 16, P.teal[3], 2); p.line(9, 15, 5, 19, P.wood[1], 2); p.rect(3, 19, 3, 3, P.teal[2]); p.set(3, 19, P.teal[4]); },
  helm_heavy: (p) => { p.ball(12, 11, 8, 8, P.steel, 1, 4); p.rect(4, 11, 16, 9, P.steel[2]); p.rect(4, 11, 3, 9, P.steel[3]); p.rect(16, 11, 4, 9, P.steel[1]); p.rect(7, 12, 10, 2, INK); p.rect(11, 12, 2, 8, INK); p.rect(11, 3, 2, 7, P.gold[3]); p.rect(4, 10, 16, 1, P.gold[3]); p.poly([[10, 3], [12, 0], [15, 2], [13, 4]], P.red[2]); p.set(7, 6, WHITE); },
  helm_light: (p) => { p.ball(12, 12, 8, 7, P.tan, 1, 4); p.rect(4, 13, 16, 3, P.wood[2]); p.rect(4, 13, 16, 1, P.wood[3]); p.rect(5, 16, 3, 5, P.tan[2]); p.rect(16, 16, 3, 5, P.tan[1]); p.rect(11, 6, 2, 7, P.wood[2]); p.px([7, 14, 12, 14, 17, 14], P.gold[3]); p.set(8, 8, P.tan[4]); },
  hood: (p) => { p.poly([[12, 2], [20, 9], [20, 21], [4, 21], [4, 9]], P.green[2]); p.poly([[12, 2], [4, 9], [4, 21], [8, 21], [8, 10]], P.green[3]); p.poly([[17, 8], [20, 9], [20, 21], [17, 21]], P.green[1]); p.ell(12, 14, 5, 6, P.forest[0]); p.rect(8, 20, 8, 2, P.green[1]); p.line(12, 3, 6, 9, P.green[4]); p.rect(11, 20, 2, 2, P.gold[3]); },
  armor_heavy: (p) => { p.poly([[5, 4], [9, 3], [12, 6], [15, 3], [19, 4], [21, 9], [18, 11], [18, 21], [6, 21], [6, 11], [3, 9]], P.steel[3]); p.poly([[5, 4], [9, 3], [11, 6], [8, 21], [6, 21], [6, 11], [3, 9]], P.steel[4]); p.poly([[16, 6], [19, 4], [21, 9], [18, 11], [18, 21], [15, 21]], P.steel[2]); p.rect(7, 15, 10, 1, P.steel[1]); p.rect(7, 18, 10, 1, P.steel[1]); p.rect(11, 8, 2, 6, P.gold[3]); p.rect(9, 10, 6, 2, P.gold[3]); p.rect(6, 20, 12, 2, P.gold[2]); },
  armor_light: (p) => { p.poly([[6, 4], [9, 3], [12, 7], [15, 3], [18, 4], [20, 9], [17, 10], [17, 21], [7, 21], [7, 10], [4, 9]], P.tan[2]); p.poly([[6, 4], [9, 3], [11, 7], [9, 21], [7, 21], [7, 10], [4, 9]], P.tan[3]); p.poly([[16, 6], [18, 4], [20, 9], [17, 10], [17, 21], [15, 21]], P.tan[1]); p.line(12, 8, 12, 20, P.wood[1]); p.px([11, 10, 13, 12, 11, 14, 13, 16], P.cream[3]); p.rect(7, 17, 10, 2, P.wood[2]); p.rect(11, 17, 2, 2, P.gold[3]); },
  robe: (p) => { p.poly([[8, 3], [16, 3], [18, 8], [21, 13], [18, 15], [19, 22], [5, 22], [6, 15], [3, 13], [6, 8]], P.violet[2]); p.poly([[8, 3], [11, 3], [9, 22], [5, 22], [6, 15], [3, 13], [6, 8]], P.violet[3]); p.poly([[16, 5], [18, 8], [21, 13], [18, 15], [19, 22], [16, 22]], P.violet[1]); p.poly([[10, 3], [12, 8], [14, 3]], P.violet[0]); p.rect(11, 8, 2, 14, P.gold[3]); p.rect(5, 20, 14, 1, P.gold[2]); p.rect(7, 13, 10, 2, P.blue[2]); p.rect(11, 13, 2, 2, P.gold[4]); },
  ring: (p) => { p.ell(12, 14, 7, 7, P.gold[3]); p.ell(12, 14, 4.5, 4.5, 0); p.ell(13.5, 16, 6, 5.5, 0); p.ell(12, 14, 7, 7, P.gold[2]); p.ell(12, 14, 4.6, 4.6, 0); for (let a = 2.4; a < 5.4; a += 0.1) p.set(12 + Math.cos(a) * 6, 14 + Math.sin(a) * 6, P.gold[4]); for (let a = 0; a < 6.28; a += 0.05) { p.set(12 + Math.cos(a) * 4.6, 14 + Math.sin(a) * 4.6, P.gold[1]); } p.ball(12, 6, 3.4, 3.4, P.red, 1, 4); p.set(11, 5, WHITE); },
  amulet: (p) => { for (let a = 3.3; a < 6.2; a += 0.12) { p.set(12 + Math.cos(a) * 8, 12 + Math.sin(a) * 9, P.gold[3]); p.set(12 + Math.cos(a) * 8, 13 + Math.sin(a) * 9, P.gold[1]); } p.line(4, 11, 10, 15, P.gold[3]); p.line(20, 11, 14, 15, P.gold[2]); p.poly([[12, 12], [17, 16], [12, 22], [7, 16]], P.gold[2]); p.poly([[12, 14], [15, 16.5], [12, 20], [9, 16.5]], P.teal[3]); p.poly([[12, 14], [12, 20], [9, 16.5]], P.teal[4]); p.set(11, 16, WHITE); },
  charm: (p) => { p.line(12, 1, 12, 6, P.red[2]); p.ell(12, 3, 2, 2, P.red[2]); p.ell(12, 3, 1, 1, 0); p.rrect(6, 6, 12, 15, P.tan[3]); p.rect(6, 7, 2, 13, P.tan[4]); p.rect(15, 8, 3, 12, P.tan[2]); p.rect(8, 9, 8, 1, P.red[2]); p.rect(8, 17, 8, 1, P.red[2]); p.rect(11, 11, 2, 5, P.violet[2]); p.rect(9, 13, 6, 1, P.violet[2]); p.set(11, 13, P.violet[4]); p.line(10, 21, 9, 23, P.red[2]); p.line(13, 21, 14, 23, P.red[2]); },
  potion_hp: potion(P.red), potion_mp: potion(P.blue),
  potion_elixir: (p) => { potion(P.gold)(p); p.set(4, 5, WHITE); p.px([3, 5, 5, 5, 4, 4, 4, 6], P.gold[4]); p.set(19, 9, WHITE); p.px([18, 9, 20, 9, 19, 8, 19, 10], P.gold[4]); },
  food: (p) => { p.ball(13, 11, 8, 7, P.tan, 1, 4); p.ball(13, 10, 6, 5, P.red, 1, 3); p.rect(9, 8, 3, 1, P.red[4]); p.line(6, 15, 3, 20, P.bone[3], 2); p.rect(1, 19, 3, 2, P.bone[4]); p.rect(3, 21, 2, 2, P.bone[4]); p.px([15, 12, 12, 13, 16, 9], P.red[1]); },
  scroll: (p) => { p.rect(5, 5, 14, 14, P.cream[3]); p.rect(5, 5, 14, 1, P.cream[1]); p.rect(16, 6, 3, 13, P.cream[2]); p.rrect(3, 2, 18, 4, P.cream[4]); p.rect(4, 5, 16, 1, P.cream[2]); p.rrect(3, 18, 18, 4, P.cream[4]); p.rect(4, 21, 16, 1, P.cream[1]); p.rect(2, 3, 2, 2, P.wood[2]); p.rect(20, 3, 2, 2, P.wood[2]); p.rect(2, 19, 2, 2, P.wood[2]); p.rect(20, 19, 2, 2, P.wood[2]); for (const y of [8, 10, 12]) p.rect(7, y, 8, 1, P.wood[1]); p.rect(10, 14, 4, 3, P.red[2]); p.set(10, 14, P.red[4]); },
  mat_wood: mat((p) => { p.rrect(2, 12, 19, 7, P.wood[2]); p.rect(3, 12, 16, 2, P.wood[3]); p.rect(3, 17, 17, 2, P.wood[1]); p.ell(19, 15.5, 2.5, 3.5, P.tan[3]); p.ell(19, 15.5, 1.2, 2, P.tan[2]); p.rrect(4, 5, 17, 7, P.wood[3]); p.rect(5, 5, 14, 2, P.wood[4]); p.rect(5, 10, 15, 2, P.wood[1]); p.ell(5.5, 8.5, 2.5, 3.5, P.tan[4]); p.ell(5.5, 8.5, 1.2, 2, P.tan[2]); p.line(10, 8, 15, 8, P.wood[1]); p.line(8, 15, 14, 15, P.wood[1]); }),
  mat_herb: mat((p) => { p.line(12, 22, 12, 8, P.green[2], 2); p.poly([[12, 14], [4, 10], [3, 5], [9, 7]], P.green[3]); p.poly([[13, 12], [20, 8], [21, 3], [15, 5]], P.green[2]); p.poly([[12, 19], [5, 18], [3, 14], [8, 14]], P.green[2]); p.poly([[13, 18], [19, 17], [21, 13], [16, 13]], P.forest[2]); p.line(5, 7, 11, 13, P.green[4]); p.line(19, 5, 14, 11, P.green[4]); p.ball(12, 5, 3, 3, P.pink, 2, 4); p.set(12, 5, P.gold[4]); }),
  mat_crystal: mat((p) => { crystal(p, 7, 21, 4, 9, 3, P.teal); crystal(p, 17, 21, 20, 8, 3, P.ice); crystal(p, 12, 22, 12, 2, 4.5, P.teal); p.set(10, 6, WHITE); p.set(9, 6, P.teal[4]); p.set(10, 5, P.teal[4]); }),
  mat_ember: mat((p) => { p.ball(12, 14, 8, 7, [P.ash[0], P.ash[1], P.ash[2], P.ash[3], P.ash[4]], 0, 3); p.line(7, 11, 11, 15, P.fire[2]); p.line(11, 15, 16, 12, P.fire[3]); p.line(11, 15, 10, 19, P.fire[2]); p.line(14, 17, 17, 16, P.fire[1]); p.set(11, 15, P.fire[4]); p.poly([[10, 6], [12, 1], [14, 6]], P.fire[2]); p.set(12, 4, P.fire[4]); p.set(17, 5, P.fire[3]); p.set(6, 4, P.fire[2]); }),
  mat_frost: mat((p) => { for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 - Math.PI / 2, x = 12 + Math.cos(a) * 9, y = 12 + Math.sin(a) * 9; p.line(12, 12, x, y, P.ice[3], 2); const mx = 12 + Math.cos(a) * 6, my = 12 + Math.sin(a) * 6; p.line(mx, my, mx + Math.cos(a + 1) * 3, my + Math.sin(a + 1) * 3, P.ice[4]); p.line(mx, my, mx + Math.cos(a - 1) * 3, my + Math.sin(a - 1) * 3, P.ice[2]); } p.rect(11, 11, 3, 3, WHITE); }),
  mat_rune: mat((p) => { p.poly([[5, 21], [4, 7], [11, 2], [19, 5], [20, 21]], P.sand[2]); p.poly([[5, 21], [4, 7], [11, 2], [10, 21]], P.sand[3]); p.line(4, 7, 11, 2, P.sand[4]); p.rect(5, 20, 15, 2, P.sand[1]); const G = P.gold[4]; p.rect(11, 6, 2, 11, G); p.line(12, 6, 16, 10, G, 1); p.line(12, 11, 8, 15, G, 1); p.rect(15, 15, 2, 2, G); p.set(11, 6, WHITE); }),
  mat_void: mat((p) => { p.ell(12, 12, 9.5, 9.5, P.violet[1]); p.ell(12, 12, 8, 8, P.shadow[0]); for (let a = 0; a < 9; a += 0.15) { const r = 1 + a * 0.75; p.set(12 + Math.cos(a) * r, 12 + Math.sin(a) * r, a > 6 ? P.violet[2] : P.pink[3]); } p.rect(11, 11, 2, 2, WHITE); p.px([5, 6, 18, 17, 17, 5], P.pink[4]); }),
  key: (p) => { p.ell(8, 8, 5, 5, P.steel[3]); p.ell(8, 8, 2, 2, 0); p.line(11, 11, 19, 19, P.steel[3], 2); p.rect(16, 14, 3, 2, P.steel[2]); p.rect(19, 17, 2, 3, P.steel[2]); p.rect(5, 5, 3, 1, P.steel[4]); p.set(4, 7, P.steel[4]); },
  bosskey: (p) => { p.ell(8, 8, 6, 6, P.gold[3]); p.ell(8, 8, 2.4, 2.4, P.violet[2]); p.set(7, 7, P.violet[4]); p.line(12, 12, 20, 20, P.gold[3], 2); p.rect(15, 13, 4, 2, P.gold[2]); p.rect(18, 16, 4, 2, P.gold[2]); p.rect(20, 19, 2, 3, P.gold[2]); p.rect(5, 4, 4, 1, P.gold[4]); p.set(3, 7, P.gold[4]); p.poly([[5, 1], [8, -1], [11, 1], [8, 3]], P.gold[4]); },
  shard: (p) => { p.poly([[12, 1], [18, 10], [12, 23], [6, 10]], P.teal[3]); p.poly([[12, 1], [12, 23], [6, 10]], P.teal[4]); p.poly([[12, 11], [17, 10], [12, 21]], P.teal[2]); p.line(12, 3, 8, 10, WHITE); p.rect(6, 10, 12, 1, P.gold[3]); p.set(12, 10, P.gold[4]); p.set(12, 1, P.gold[4]); p.px([3, 4, 20, 18], P.gold[4]); },
  gold: (p) => { for (const [x, y] of [[8, 17], [15, 18], [11, 12], [14, 7]] as const) { p.ell(x + 0.5, y + 1.5, 5.5, 3.2, P.gold[1]); p.ell(x + 0.5, y, 5.5, 3.2, P.gold[3]); p.ell(x + 0.5, y, 3.5, 1.8, P.gold[2]); p.rect(x - 3, y - 2, 3, 1, P.gold[4]); } p.set(19, 3, WHITE); p.px([18, 3, 20, 3, 19, 2, 19, 4], P.gold[4]); },
  gem: (p) => { p.poly([[6, 5], [18, 5], [22, 10], [12, 22], [2, 10]], P.pink[2]); p.poly([[6, 5], [12, 5], [8, 10], [2, 10]], P.pink[4]); p.poly([[12, 5], [18, 5], [16, 10], [8, 10]], P.pink[3]); p.poly([[2, 10], [8, 10], [12, 22]], P.pink[3]); p.poly([[16, 10], [22, 10], [12, 22]], P.pink[1]); p.line(7, 6, 5, 9, WHITE); p.rect(2, 10, 20, 1, P.pink[1]); },
  seal_fire: seal(P.fire, (p) => { p.poly([[8, 17], [8, 12], [12, 5], [16, 12], [16, 17]], P.fire[4]); p.poly([[10.5, 17], [12, 11], [13.5, 17]], WHITE); }),
  seal_water: seal(P.blue, (p) => { p.poly([[12, 5], [16.5, 13], [12, 18], [7.5, 13]], P.blue[4]); p.ell(12, 14, 4, 4, P.blue[4]); p.rect(10, 13, 2, 2, WHITE); }),
  seal_earth: seal([P.wood[0], P.forest[1], P.green[2], P.green[3], P.green[4]], (p) => { p.poly([[6, 17], [10, 9], [13, 14], [15, 11], [18, 17]], P.green[4]); p.poly([[10, 9], [11.5, 12], [8.5, 12]], WHITE); }),
  seal_wind: seal(P.teal, (p) => { for (const [y, w] of [[9, 9], [12, 11], [15, 7]] as const) { p.rect(7, y, w, 1, P.teal[4]); p.set(7 + w, y - 1, P.teal[4]); p.set(7 + w - 1, y - 2, P.teal[4]); } p.rect(7, 12, 4, 1, WHITE); }),
  seal_light: seal(P.gold, (p) => { p.ell(12, 12, 3, 3, WHITE); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; p.line(12 + Math.cos(a) * 4.5, 12 + Math.sin(a) * 4.5, 12 + Math.cos(a) * 6, 12 + Math.sin(a) * 6, P.gold[4]); } }),
  seal_dark: seal(P.violet, (p) => { p.ell(12, 12, 5, 5, P.violet[4]); p.ell(14, 10.5, 4.2, 4.2, P.violet[1]); p.set(9, 14, WHITE); p.set(16, 16, P.pink[4]); }),
};

const ELEMENT: Record<ElementKey, Ramp> = {
  phys: P.steel, fire: [P.red[0], P.red[1], P.fire[1], P.fire[2], P.fire[3]], water: P.blue,
  earth: [P.wood[0], mix(P.wood[1], P.forest[1], 0.5), mix(P.wood[2], P.green[2], 0.55), mix(P.tan[2], P.green[3], 0.55), P.green[4]],
  wind: [P.teal[0], P.teal[1], P.teal[2], P.teal[3], P.teal[4]], light: P.gold, dark: P.violet,
};

const arrowG = (p: Px, x0: number, y0: number, x1: number, y1: number, c: number) => { p.line(x0, y0, x1, y1, c, 2); const a = Math.atan2(y1 - y0, x1 - x0); p.poly([[x1 + 1 + Math.cos(a) * 3, y1 + 1 + Math.sin(a) * 3], [x1 + 1 + Math.cos(a + 2.4) * 4, y1 + 1 + Math.sin(a + 2.4) * 4], [x1 + 1 + Math.cos(a - 2.4) * 4, y1 + 1 + Math.sin(a - 2.4) * 4]], c); };
const arc = (p: Px, cx: number, cy: number, r: number, a0: number, a1: number, c: number, t = 2) => { for (let a = a0; a <= a1; a += 0.06) p.rect(Math.round(cx + Math.cos(a) * r - t / 2), Math.round(cy + Math.sin(a) * r - t / 2), t, t, c); };
const C = WHITE;
const GLYPHS: Record<string, Fn> = {
  slash: (p) => { for (let a = -1.9; a < 0.5; a += 0.04) { const w = 1 + 2.5 * Math.sin(((a + 1.9) / 2.4) * Math.PI); for (let k = 0; k < w; k++) p.set(8 + Math.cos(a) * (11 - k), 15 + Math.sin(a) * (11 - k), C); } },
  cleave: (p) => { for (const off of [0, 5]) for (let a = -2.2; a < 0.2; a += 0.04) { const w = 1 + 2 * Math.sin(((a + 2.2) / 2.4) * Math.PI); for (let k = 0; k < w; k++) p.set(6 + off + Math.cos(a) * (10 - k), 14 + off * 0.6 + Math.sin(a) * (10 - k), C); } },
  whirl: (p) => { arc(p, 12, 12, 7, 0.3, 2.8, C); arc(p, 12, 12, 7, 3.45, 5.95, C); p.poly([[19, 10], [22, 15], [16, 15]], C); p.poly([[5, 14], [2, 9], [8, 9]], C); p.rect(11, 11, 2, 2, C); },
  shield: (p) => { p.poly([[5, 4], [19, 4], [19, 12], [12, 21], [5, 12]], C); p.poly([[7, 6], [17, 6], [17, 11], [12, 18], [7, 11]], 0); p.rect(11, 6, 2, 12, C); p.rect(7, 10, 10, 2, C); },
  shout: (p) => { p.poly([[4, 9], [9, 9], [13, 5], [13, 19], [9, 15], [4, 15]], C); arc(p, 13, 12, 4, -0.9, 0.9, C, 1); arc(p, 13, 12, 7, -0.9, 0.9, C, 2); },
  charge: (p) => { for (const x of [4, 10, 16]) { p.line(x, 6, x + 5, 12, C, 2); p.line(x + 5, 12, x, 18, C, 2); } },
  quake: (p) => { p.line(3, 11, 8, 8, C, 2); p.line(8, 8, 11, 12, C, 2); p.line(11, 12, 15, 7, C, 2); p.line(15, 7, 20, 11, C, 2); p.line(11, 13, 9, 17, C); p.line(9, 17, 13, 20, C); p.rect(4, 15, 3, 3, C); p.rect(17, 15, 3, 3, C); p.rect(15, 19, 2, 2, C); },
  bolt: (p) => { p.poly([[14, 2], [6, 13], [11, 13], [9, 22], [18, 10], [13, 10]], C); },
  fireball: (p) => { p.ell(10, 15, 5.5, 5.5, C); p.poly([[10, 10], [20, 3], [15, 13]], C); p.poly([[13, 9], [22, 9], [15, 15]], C); p.ell(9.5, 15.5, 2.5, 2.5, 0); p.ell(9.5, 15.5, 1.2, 1.2, C); },
  frost: (p) => { for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI; p.line(12 - Math.cos(a) * 9, 12 - Math.sin(a) * 9, 12 + Math.cos(a) * 9, 12 + Math.sin(a) * 9, C, i === 1 ? 2 : 1); p.line(11 - Math.cos(a) * 9, 12 - Math.sin(a) * 9, 11 + Math.cos(a) * 9, 12 + Math.sin(a) * 9, C); } for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, x = 12 + Math.cos(a) * 6, y = 12 + Math.sin(a) * 6; p.line(x, y, x + Math.cos(a + 0.9) * 3, y + Math.sin(a + 0.9) * 3, C); p.line(x, y, x + Math.cos(a - 0.9) * 3, y + Math.sin(a - 0.9) * 3, C); } },
  nova: (p) => { p.ell(12, 12, 3.5, 3.5, C); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; p.line(12 + Math.cos(a) * 6, 12 + Math.sin(a) * 6, 12 + Math.cos(a) * (i % 2 ? 8 : 10), 12 + Math.sin(a) * (i % 2 ? 8 : 10), C, i % 2 ? 1 : 2); } },
  meteor: (p) => { p.ell(15, 16, 5, 5, C); p.line(4, 3, 11, 12, C, 2); p.line(9, 2, 14, 10, C); p.line(2, 8, 9, 15, C); p.set(13, 14, 0); p.set(16, 17, 0); p.set(14, 18, 0); },
  blink: (p) => { p.poly([[17, 6], [21, 12], [17, 18], [13, 12]], C); for (const x of [3, 6, 9]) p.rect(x, 11, 2, 2, C); p.line(4, 6, 7, 12, C); p.line(4, 18, 7, 12, C); p.set(17, 12, 0); },
  barrier: (p) => { arc(p, 12, 15, 9, Math.PI, Math.PI * 2, C); p.rect(3, 15, 19, 2, C); arc(p, 12, 15, 5, Math.PI, Math.PI * 2, C, 1); p.rect(11, 6, 2, 9, C); },
  chain: (p) => { p.line(3, 5, 9, 10, C, 2); p.line(9, 10, 6, 13, C, 2); p.line(6, 13, 13, 16, C, 2); p.line(13, 16, 20, 12, C, 2); p.line(13, 16, 17, 21, C, 2); p.rect(19, 10, 3, 3, C); p.rect(16, 20, 3, 3, C); },
  arrow: (p) => arrowG(p, 4, 19, 16, 7, C),
  multishot: (p) => { arrowG(p, 4, 20, 9, 6, C); arrowG(p, 6, 20, 16, 8, C); arrowG(p, 8, 20, 18, 15, C); },
  rain: (p) => { for (const [x, y] of [[5, 3], [11, 6], [17, 3]] as const) arrowG(p, x, y, x, y + 10, C); },
  trap: (p) => { arc(p, 12, 14, 8, Math.PI, Math.PI * 2, C); p.rect(3, 14, 19, 2, C); for (let x = 5; x < 20; x += 4) p.poly([[x - 1.5, 14], [x + 0.5, 9], [x + 2.5, 14]], 0); for (let x = 5; x < 20; x += 4) p.poly([[x - 1, 16], [x + 0.5, 20], [x + 2, 16]], C); },
  roll: (p) => { arc(p, 12, 12, 7, -0.4, 4.4, C); p.poly([[14, 2], [20, 6], [13, 9]], C); p.ell(12, 12, 2.5, 2.5, C); },
  eagle: (p) => { p.poly([[2, 12], [12, 6], [22, 12], [12, 18]], C); p.ell(12, 12, 4, 4, 0); p.ell(12, 12, 2, 2, C); p.line(12, 2, 12, 5, C); p.line(5, 4, 7, 7, C); p.line(19, 4, 17, 7, C); },
  heal: (p) => { p.rect(9, 4, 6, 16, C); p.rect(4, 9, 16, 6, C); p.rect(11, 6, 2, 12, 0); p.rect(6, 11, 12, 2, 0); p.rect(11, 11, 2, 2, C); },
  smite: (p) => { p.rect(11, 2, 3, 14, C); p.rect(7, 6, 11, 3, C); p.poly([[9, 16], [12.5, 22], [16, 16]], C); p.line(3, 14, 6, 17, C); p.line(21, 14, 18, 17, C); p.line(3, 20, 7, 20, C); p.line(18, 20, 21, 20, C); },
  aura: (p) => { arc(p, 12, 12, 9, 0, 6.3, C, 1); arc(p, 12, 12, 5.5, 0, 6.3, C, 2); p.rect(11, 11, 2, 2, C); for (const [x, y] of [[12, 1], [12, 22], [1, 12], [22, 12]] as const) p.rect(x - 1, y - 1, 2, 2, C); },
  hammer: (p) => { p.line(6, 20, 13, 11, C, 2); p.poly([[9, 7], [14, 2], [21, 9], [16, 14]], C); p.line(11, 8, 15, 4, 0); },
  holy: (p) => { p.ell(12, 12, 4, 4, C); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; p.line(12 + Math.cos(a) * 6, 12 + Math.sin(a) * 6, 12 + Math.cos(a) * 10, 12 + Math.sin(a) * 10, C, i % 2 ? 1 : 2); } p.rect(11, 10, 2, 5, 0); p.rect(10, 11, 4, 1, 0); },
  stab: (p) => { p.poly([[19, 3], [21, 5], [10, 16], [8, 14]], C); p.line(6, 12, 12, 18, C, 2); p.line(7, 17, 4, 20, C, 2); p.rect(20, 2, 2, 2, C); },
  fan: (p) => { for (const a of [-2.3, -1.57, -0.84]) { p.line(12 + Math.cos(a) * 4, 20 + Math.sin(a) * 4, 12 + Math.cos(a) * 16, 20 + Math.sin(a) * 16, C, 2); p.rect(Math.round(12 + Math.cos(a) * 17), Math.round(20 + Math.sin(a) * 17), 2, 2, C); } p.ell(12, 20, 3, 3, C); },
  vanish: (p) => { for (const [x, y, r] of [[8, 14, 5], [15, 13, 5.5], [12, 9, 4.5]] as const) p.ell(x, y, r, r, C); p.rect(6, 17, 2, 4, C); p.rect(11, 18, 2, 4, C); p.rect(16, 17, 2, 3, C); p.rect(9, 11, 2, 2, 0); p.rect(14, 11, 2, 2, 0); },
  poison: (p) => { p.poly([[12, 2], [18, 13], [12, 21], [6, 13]], C); p.ell(12, 14, 6, 6, C); p.rect(9, 12, 2, 3, 0); p.rect(13, 12, 2, 3, 0); p.rect(10, 17, 4, 1, 0); p.set(11, 18, 0); p.set(13, 18, 0); },
  mark: (p) => { arc(p, 12, 12, 8, 0, 6.3, C); p.rect(11, 1, 2, 7, C); p.rect(11, 16, 2, 7, C); p.rect(1, 11, 7, 2, C); p.rect(16, 11, 7, 2, C); p.rect(11, 11, 2, 2, C); },
  p_str: (p) => { p.rrect(6, 8, 13, 10, C); p.rect(4, 10, 3, 6, C); p.rect(8, 5, 3, 4, C); p.rect(12, 5, 3, 4, C); p.rect(16, 6, 3, 3, C); p.rect(11, 9, 1, 4, 0); p.rect(15, 9, 1, 4, 0); p.rect(7, 13, 11, 1, 0); p.rect(9, 18, 8, 3, C); },
  p_int: (p) => { p.poly([[3, 6], [11, 8], [11, 20], [3, 18]], C); p.poly([[21, 6], [13, 8], [13, 20], [21, 18]], C); for (const y of [10, 13, 16]) { p.line(5, y - 1, 9, y, 0); p.line(15, y, 19, y - 1, 0); } p.rect(11, 2, 2, 4, C); p.rect(9, 3, 6, 2, C); },
  p_dex: (p) => { p.poly([[19, 2], [21, 8], [12, 18], [7, 20], [8, 14]], C); p.line(4, 22, 18, 5, 0); p.line(3, 22, 8, 17, C, 2); p.line(12, 10, 16, 11, 0); p.line(10, 13, 14, 14, 0); },
  p_vit: (p) => { p.ell(8, 9, 5, 5, C); p.ell(16, 9, 5, 5, C); p.poly([[3.5, 11], [20.5, 11], [12, 21]], C); p.rect(6, 7, 2, 2, 0); },
  p_crit: (p) => { for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2; p.poly([[12 + Math.cos(a - 0.35) * 5, 12 + Math.sin(a - 0.35) * 5], [12 + Math.cos(a) * (i % 2 ? 9 : 11), 12 + Math.sin(a) * (i % 2 ? 9 : 11)], [12 + Math.cos(a + 0.35) * 5, 12 + Math.sin(a + 0.35) * 5]], C); } p.ell(12, 12, 5.5, 5.5, C); p.rect(11, 7, 2, 6, 0); p.rect(11, 15, 2, 2, 0); },
  p_mana: (p) => { p.poly([[12, 2], [18, 13], [12, 21], [6, 13]], C); p.ell(12, 14, 6, 6, C); p.ell(10, 15, 1.5, 2.5, 0); p.px([4, 5, 20, 7, 19, 19], C); },
  p_speed: (p) => { p.poly([[8, 4], [15, 4], [15, 13], [20, 15], [20, 19], [8, 19]], C); p.rect(8, 15, 12, 1, 0); for (const y of [7, 11, 16]) p.rect(2, y, 4, 2, C); },
  p_def: (p) => { p.poly([[5, 4], [19, 4], [19, 12], [12, 21], [5, 12]], C); p.rect(11, 7, 2, 8, 0); p.rect(8, 10, 8, 2, 0); },
  p_element: (p) => { p.ell(12, 6, 3.5, 3.5, C); p.ell(6, 17, 3.5, 3.5, C); p.ell(18, 17, 3.5, 3.5, C); p.line(12, 9, 7, 14, C); p.line(12, 9, 17, 14, C); p.line(9, 17, 15, 17, C); p.rect(11, 12, 2, 2, C); },
};

const cache = new Map<string, string>();
function toUrl(p: Px): string { return p.toCanvas().toDataURL('image/png'); }

export function iconPx(key: string, element: ElementKey = 'phys'): Px {
  const p = new Px(24, 24);
  if (key.startsWith('skill_')) {
    const r = ELEMENT[element] ?? ELEMENT.phys, g = GLYPHS[key.slice(6)];
    iconTile(p, r);
    const q = new Px(24, 24);
    if (g) g(q); else { q.rect(9, 9, 6, 6, WHITE); }
    // Glyphe leicht einrücken, Schlagschatten + dunkle Kontur
    const sh = new Px(24, 24);
    for (let i = 0; i < q.d.length; i++) if (q.d[i]) sh.d[i] = r[0];
    const ins = (src: Px, dx: number, dy: number) => { for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) { const c = src.d[y * 24 + x]; const xx = x + dx, yy = y + dy; if (c && xx > 1 && yy > 1 && xx < 22 && yy < 22) p.d[yy * 24 + xx] = c; } };
    ins(sh, 1, 1); ins(sh, 0, 1); ins(sh, 1, 0); ins(sh, -1, 0); ins(sh, 0, -1);
    for (let i = 0; i < q.d.length; i++) if (q.d[i]) q.d[i] = mix(WHITE, r[4], ((i / 24) | 0) > 13 ? 0.45 : 0.1);
    ins(q, 0, 0);
  } else {
    const k = key.startsWith('item_') ? key.slice(5) : key, fn = ITEMS[k] ?? CRAFT_ICONS[k];
    if (fn) { fn(p); if (!CRAFT_FLAT.has(k)) p.outline(INK); CRAFT_GLOW[k]?.(p); } else { p.rrect(3, 3, 18, 18, P.stone[2]); p.rect(11, 6, 2, 8, WHITE); p.rect(11, 16, 2, 2, WHITE); p.outline(INK); }
  }
  return p;
}
export function iconUrl(key: string, element: ElementKey = 'phys'): string {
  const ck = key.startsWith('skill_') ? `${key}|${element}` : key;
  let u = cache.get(ck);
  if (!u) { u = toUrl(iconPx(key, element)); cache.set(ck, u); }
  return u;
}
