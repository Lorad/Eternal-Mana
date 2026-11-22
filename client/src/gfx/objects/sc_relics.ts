/** Schattenreich – Verlorenes: Grabsteine, Kettenpfeiler, Spielzeug, letztes Licht, zerbrochener Bogen, leerer Bilderrahmen. */
import { Px, resample } from '../draw';
import { Frames, INK, MARK, P, Ramp, WHITE, alpha, boulder, clamp, glow, hash2, mix, rnd2 } from './kit';
import { MAGENTA, jag, vein } from './kr_kit';
import { slab, stoneFill } from './ru_kit';
import { COLD, NIGHT, NIGHT5, overS, rim, sAnim, sOne, sOutline } from './sc_kit';

const V = P.violet, Y = P.gold, I = P.steel;
const N = NIGHT5;
const crack = (p: Px, a: readonly [number, number], b: readonly [number, number], seed: number, c: number = N[0]): void => { for (const [x, y] of resample(jag(a, b, 1.1, seed, 3))) if (p.get(Math.floor(x), Math.floor(y)) >>> 24) p.set(x, y, c); };
/** fahle Flechte auf Oberkanten */
function lichen(p: Px, test: (x: number, y: number) => boolean, seed: number): void {
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.get(x, y) >>> 24 && test(x, y) && rnd2(x, y, seed) < 0.5) p.set(x, y, rnd2(x, y, seed + 1) < 0.4 ? mix(COLD[0], N[3], 0.3) : mix(COLD[0], N[2], 0.6));
}

function tombstone(p: Px): void {
  // leicht nach links geneigte Platte mit rundem Kopf
  for (let y = 2; y < 19; y++) { const sh = Math.round((18 - y) * -0.1), hw = y < 7 ? Math.sqrt(Math.max(0, 1 - ((7 - y) / 5) ** 2)) * 5 : 5; for (let x = Math.round(8 - hw); x < Math.round(8 + hw); x++) p.set(x + sh, y, MARK); }
  stoneFill(p, N, 3, MARK, true);
  for (let y = 3; y < 19; y++) for (let x = 0; x < 16; x++) if (p.get(x, y) === N[1] && !(p.get(x + 1, y) >>> 24)) { p.set(x, y, N[0]); if (p.get(x - 1, y) >>> 24) p.set(x - 1, y, N[1]); }
  // Auge als Grabzeichen, verwitterte Zeilen
  p.px([6, 6, 7, 5, 8, 5, 9, 6, 7, 7, 8, 7], N[0]); p.set(7, 6, MAGENTA[3]); p.set(8, 6, MAGENTA[2]);
  for (const [y, a, b] of [[10, 4, 10], [12, 5, 11], [14, 4, 8]] as const) for (let x = a; x < b; x++) if ((x + y) % 4) p.set(x, y, N[1]);
  crack(p, [10, 3], [8, 12], 4);
  lichen(p, (_x, y) => y < 5, 3);
  // aufgeworfene Erde, fahle Halme
  overS(p, (l) => { l.ell(8, 19.4, 7, 1.8, P.shadow[1]); l.px([3, 18, 4, 18, 9, 18, 10, 18, 11, 18], P.shadow[3]); l.px([6, 19, 12, 19], P.shadow[2]); }, 0);
  p.line(2, 18, 1, 15, COLD[0]); p.line(13, 18, 14, 16, mix(COLD[0], N[2], 0.5)); p.set(1, 14, COLD[2]);
}
function tombstoneB(p: Px): void {
  // Ringkreuz, nach rechts geneigt
  const sh = (y: number): number => Math.round((20 - y) * 0.12);
  for (let y = 1; y < 20; y++) for (let x = 0; x < 16; x++) {
    const X = x - sh(y), r = Math.hypot(X + 0.5 - 7.5, y + 0.5 - 7);
    if ((X >= 6 && X < 9 && y >= 1) || (y >= 6 && y < 9 && X >= 2 && X < 13) || (r >= 3.4 && r < 5.2)) p.set(x, y, MARK);
  }
  stoneFill(p, N, 5, MARK, true);
  p.set(7 + sh(7), 7, MAGENTA[3]); p.px([6 + sh(4), 4, 8 + sh(11), 11, 7 + sh(14), 14], N[0]);
  crack(p, [8, 10], [9, 18], 2);
  lichen(p, (_x, y) => y < 3 || y === 6, 6);
  overS(p, (l) => { slab(l, 3, 18, 11, 4, 1, 3, N); }, 0.3);
  p.line(1, 21, 0, 18, COLD[0]); p.line(14, 21, 15, 19, mix(COLD[0], N[2], 0.5));
  // abgebrochenes Ringstück liegt davor
  p.px([11, 20, 12, 20, 13, 21], N[3]); p.set(12, 21, N[1]);
}

/** Kettenglieder entlang einer Linie. */
function chain(p: Px, x0: number, y0: number, x1: number, y1: number): void {
  const n = Math.round(Math.hypot(x1 - x0, y1 - y0));
  for (let i = 0; i <= n; i++) { const t = i / n, x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t), m = i % 3; p.set(x, y, m === 0 ? I[3] : m === 1 ? I[2] : I[0]); if (m !== 2) p.set(x, y + 1, I[1]); }
}
function chainPillar(p: Px): void {
  slab(p, 2, 45, 16, 7, 1, 3, N); slab(p, 4, 42, 12, 3, 1, 4, N);
  // Schaft aus großen Quadern, Front hell, rechte Seite im Schatten
  for (let y = 7; y < 42; y++) for (let x = 5; x < 15; x++) {
    const m = (y - 7) % 9, hh = hash2(Math.floor((y - 7) / 9), 2, 5);
    let t = x >= 13 ? 1 : x === 5 ? 3 : 2;
    if (m === 8) t = 0; else if (m === 0) t++; else if (x < 13 && x === 6 + (hh % 6) && Math.floor((y - 7) / 9) % 2 === 0) t = 0;
    if (rnd2(x, y, 6) < 0.05) t--;
    p.set(x, y, N[clamp(t, 0, 4)]);
  }
  slab(p, 3, 3, 14, 5, 2, 6, N); p.rect(4, 8, 12, 1, N[0]);
  vein(p, jag([7, 41], [9, 26], 1.2, 3), MAGENTA, 0.3, 4); vein(p, jag([12, 22], [10, 9], 1.2, 5), MAGENTA, 0.25, 6);
  rim(p, P.ice[2], 0.4);
  // Ketten: zwei Windungen, ein loses Ende, Ring oben
  chain(p, 4, 13, 15, 20); chain(p, 15, 23, 4, 31); chain(p, 4, 34, 15, 39);
  chain(p, 16, 20, 17, 33); p.px([17, 34, 18, 35, 18, 36], I[2]); p.set(18, 37, I[1]);
  p.px([8, 1, 9, 0, 10, 0, 11, 1, 11, 2, 8, 2], I[2]); p.set(9, 0, I[4]);
  // Siegelschloss mit glimmender Rune
  p.rect(8, 23, 5, 6, I[1]); p.rect(8, 23, 5, 1, I[3]); p.rect(8, 23, 1, 6, I[2]); p.rect(12, 24, 1, 5, I[0]); p.px([9, 22, 10, 21, 11, 22], I[3]);
  p.px([10, 25, 10, 26, 9, 26, 11, 26, 10, 27], MAGENTA[4]); p.set(10, 26, WHITE);
  sOutline(p);
  glow(p, 10.5, 26.5, 4, P.pink[3], 60, true); glow(p, 10.5, 26.5, 7, P.pink[2], 26);
}

function lostToy(p: Px): void {
  // Stoffbär, auf der Seite liegend: ausgeblichen, ein Knopfauge fehlt
  const B: Ramp = [mix(P.wood[0], P.shadow[2], 0.4), mix(P.tan[1], P.shadow[3], 0.35), mix(P.tan[2], P.stone[2], 0.35), mix(P.tan[3], P.stone[3], 0.3), mix(P.tan[4], P.cream[3], 0.4)];
  p.ball(7.6, 6.2, 3.2, 2.6, B); p.ball(3.6, 5, 2.7, 2.6, B);
  p.ell(1.6, 2.6, 1.2, 1.2, B[2]); p.set(1, 2, B[3]); p.ell(5.2, 2.2, 1.1, 1.1, B[1]); p.set(5, 2, B[2]);
  p.px([10, 4, 11, 3, 10, 8, 11, 9, 6, 8, 5, 9, 8, 9, 9, 9], B[2]); p.px([11, 4, 11, 8, 6, 9], B[1]); p.set(10, 3, B[3]);
  p.set(3, 5, INK); p.px([4, 4, 5, 5], B[0]); p.set(4, 5, B[0]); p.set(2, 6, B[4]); p.set(2, 7, B[0]);
  // Flicken, aufgeplatzte Naht mit Füllwatte, rotes Halsband
  p.rect(7, 5, 2, 2, mix(P.red[1], B[2], 0.5)); p.set(7, 5, mix(P.red[2], B[3], 0.5)); p.px([8, 8, 9, 8], COLD[2]); p.set(9, 7, COLD[3]); p.px([5, 7, 6, 6, 6, 4], mix(P.red[2], B[1], 0.3));
}

function lastLight(p: Px, f: number): void {
  const W: Ramp = [mix(P.wood[0], P.shadow[1], 0.4), mix(P.wood[1], P.shadow[3], 0.3), mix(P.wood[2], P.stone[1], 0.3), mix(P.wood[3], P.stone[2], 0.3), mix(P.wood[4], P.stone[3], 0.3)];
  // Steine halten den Stab
  overS(p, (l) => { boulder(l, 12, 40, 7, 4, { ramp: N, seed: 3, cracks: 0 }); boulder(l, 16.5, 40, 6, 3, { ramp: N, seed: 5, cracks: 0 }); }, 0.3);
  // Hirtenstab mit Haken
  const st = new Px(p.w, p.h);
  st.rect(11, 9, 2, 29, W[2]); st.rect(11, 9, 1, 29, W[3]); for (let y = 13; y < 36; y += 5) st.set(12, y, W[1]);
  st.px([11, 8, 11, 7, 11, 6, 10, 5, 10, 4, 9, 3, 8, 3, 7, 3, 6, 4, 5, 5, 5, 6], W[2]); st.px([12, 8, 12, 7, 12, 6, 11, 5, 11, 4, 10, 3, 9, 2, 8, 2, 7, 2, 6, 3], W[3]); st.px([5, 7], W[1]);
  st.rect(11, 20, 2, 2, P.tan[2]); st.set(11, 20, P.tan[4]);
  // Stoffband flattert
  const o = [0, 1, 0, -1][f];
  for (let i = 0; i < 5; i++) { const y = 21 + Math.round(Math.sin(i * 1.1 + (f * Math.PI) / 2) * 1) + (i > 2 ? 1 : 0); st.set(13 + i, y, i % 2 ? P.cream[2] : P.cream[3]); if (i < 4) st.set(13 + i, y + 1, P.cream[1]); }
  // Laterne am Haken
  const B: Ramp = [P.ash[0], I[0], I[1], I[2], I[3]];
  st.rect(5, 8, 1, 2, B[2]); st.rect(3, 10, 5, 1, B[2]); st.rect(4, 9, 3, 1, B[3]); st.rect(3, 11, 5, 6, Y[3]); st.rect(3, 11, 1, 6, B[1]); st.rect(7, 11, 1, 6, B[0]); st.rect(3, 17, 5, 1, B[1]); st.rect(5, 11, 1, 6, mix(Y[2], B[1], 0.45)); st.rect(4, 18, 3, 1, B[0]);
  st.rect(4, 13 - (f === 1 ? 1 : 0), 1, 3, P.fire[4]); st.set(6, 14 + o, P.fire[4]); st.px([4, 16, 6, 16], P.fire[2]); st.set(4, 12, f === 1 ? P.fire[3] : WHITE);
  rim(st, P.fire[4], 0.25); sOutline(st); p.draw(st, 3, 0);
  glow(p, 8.5, 14, 8.5 + (f & 1) * 0.5, P.fire[4], 60 + (f === 1 ? 12 : f === 3 ? -8 : 0));
  glow(p, 8.5, 14, 4.5, P.fire[4], 44);
}

function brokenArch(p: Px): void {
  const cx = 28, cy = 25, ri = 11.5, ro = 19.5;
  const tone = (x: number, y: number, dx: number, dy: number): number => {
    const r = Math.hypot(dx, dy), a = (Math.atan2(dy, dx) / Math.PI) * 9, fr = a - Math.floor(a);
    let t = 2 + (dx < -4 ? 1 : dx > 6 ? -1 : 0);
    if (fr < 0.1) t = 0; else if (fr > 0.86) t++;
    if (r < ri + 1.2) t = Math.min(t, 1); else if (r > ro - 1.3) t++;
    if (rnd2(x, y, 5) < 0.06) t--;
    return N[clamp(t, 0, 4)];
  };
  // Pfeiler: links voll, rechts auf halber Höhe abgebrochen
  const pier = (l: Px, x0: number, y0: number, seed: number): void => {
    for (let y = y0; y < 54; y++) for (let x = x0; x < x0 + 13; x++) {
      const m = (y - 24) % 7, row = Math.floor((y - 24) / 7), hh = hash2(row, seed, 3), jx = (x - x0 + (row & 1) * 5) % 10;
      let t = x >= x0 + 11 ? 1 : x === x0 ? 3 : 2;
      if (m === 6 || jx === 9) t = 0; else if (m === 0 || jx === 0) t++; else if ((hh & 3) === 0) t--;
      if (rnd2(x, y, seed) < 0.05) t--;
      if (y < y0 + 3 + (hash2(x >> 1, seed, 8) % 4) && y0 > 26) continue;
      l.set(x, y, N[clamp(t, 0, 4)]);
    }
    slab(l, x0 - 1, 54, 15, 6, 1, seed, N);
  };
  overS(p, (l) => {
    pier(l, 4, 24, 3); pier(l, 39, 34, 5);
    slab(l, 3, 22, 15, 3, 1, 4, N);
    // stehender Bogenansatz links (Keile 5–8)
    for (let y = 3; y < cy; y++) for (let x = 3; x < 30; x++) { const dx = x + 0.5 - cx, dy = cy - (y + 0.5), r = Math.hypot(dx, dy), k = Math.floor((Math.atan2(dy, dx) / Math.PI) * 9); if (r >= ri && r < ro && k >= 5) l.set(x, y, tone(x, y, dx, dy)); }
    vein(l, jag([9, 53], [11, 30], 1.4, 3), MAGENTA, 0.4, 4); vein(l, jag([11, 30], [8, 14], 1.3, 5), MAGENTA, 0.35, 6); vein(l, jag([46, 53], [44, 38], 1.2, 7), MAGENTA, 0.3, 8);
  }, 0.4);
  // losgelöste Keilsteine treiben im Bogenverlauf, leicht verdreht
  const OFF: Record<number, [number, number]> = { 4: [1, -3], 3: [4, -5], 2: [6, -1], 1: [5, 4], 0: [3, 9] };
  for (const k of [4, 3, 2, 1, 0]) overS(p, (l) => {
    const [ox, oy] = OFF[k];
    for (let y = 3; y < cy; y++) for (let x = 20; x < 50; x++) { const dx = x + 0.5 - cx, dy = cy - (y + 0.5), r = Math.hypot(dx, dy), a = (Math.atan2(dy, dx) / Math.PI) * 9; if (r >= ri + (k % 2) && r < ro - (k === 3 ? 2 : 0) && Math.floor(a) === k && a - k > 0.08 && a - k < 0.94) l.set(x + ox, y + oy, tone(x, y, dx, dy)); }
  }, 0.5);
  crack(p, [14, 26], [12, 44], 2);
  sOutline(p);
  // Magentaglimmen in den Bruchstellen
  for (const [x, y, r] of [[31, 7, 5], [41, 11, 5], [47, 22, 5], [45, 33, 5]] as const) glow(p, x, y, r, P.pink[2], 40);
  p.px([30, 8, 40, 12, 46, 23], alpha(MAGENTA[4], 220)); p.px([36, 6, 48, 16, 44, 30], alpha(WHITE, 200));
}

function memoryFrame(p: Px): void {
  const G: Ramp = [mix(Y[0], P.shadow[1], 0.5), mix(Y[1], P.shadow[3], 0.4), mix(Y[2], V[2], 0.3), mix(Y[3], P.stone[3], 0.3), mix(Y[4], P.cream[4], 0.3)];
  const sh = (y: number): number => Math.round((y - 11) * 0.14);
  // im Rahmen: nur noch ein fahler Schimmer und ein Fetzen Leinwand
  for (let y = 5; y < 18; y++) for (let x = 6; x < 14; x++) p.set(x + sh(y), y, alpha(COLD[1], (x + y) % 7 < 2 ? 70 : 28));
  for (let y = 5; y < 11; y++) for (let x = 6; x < 10 - ((y - 5) >> 1); x++) p.set(x + sh(y), y, (x + y) % 3 ? mix(P.cream[1], P.shadow[3], 0.3) : mix(P.cream[2], P.shadow[3], 0.3));
  const fr = new Px(p.w, p.h);
  for (let y = 2; y < 21; y++) for (let x = 3; x < 17; x++) {
    const inner = x >= 6 && x < 14 && y >= 5 && y < 18; if (inner) continue;
    const top = y < 5, left = x < 6, bot = y >= 18;
    let t = top ? (y === 2 ? 4 : y === 3 ? 3 : 1) : bot ? (y === 18 ? 3 : y === 19 ? 2 : 0) : left ? (x === 3 ? 4 : x === 4 ? 3 : 1) : x === 14 ? 3 : x === 15 ? 2 : 0;
    if ((x + y) % 5 === 0 && t > 1) t--;
    fr.set(x + sh(y), y, G[t]);
  }
  // Eckzier und Bekrönung
  for (const [x, y] of [[3, 2], [16, 2], [3, 20], [16, 20]] as const) { fr.set(x + sh(y), y, G[4]); fr.set(x + sh(y) + (x < 10 ? -1 : 1), y + (y < 10 ? -1 : 1), G[3]); fr.set(x + sh(y) + (x < 10 ? 1 : -1), y + (y < 10 ? 1 : -1), G[4]); }
  fr.px([9 + sh(1), 1, 10 + sh(1), 1, 9 + sh(0), 0], G[3]); fr.set(10 + sh(1), 0, G[4]); fr.px([8 + sh(2), 1, 11 + sh(2), 1], G[2]);
  fr.px([15 + sh(12), 12, 16 + sh(13), 13], 0); fr.set(14 + sh(9), 9, G[0]);
  rim(fr, P.ice[2], 0.3); sOutline(fr); p.draw(fr);
  // schwebt: Lichtstaub darunter, gerissener Draht
  p.px([7, 23, 12, 24], alpha(COLD[2], 150)); p.set(9, 25, alpha(COLD[3], 110)); p.set(14, 22, alpha(V[4], 130));
  glow(p, 10, 11, 7, mix(V[3], COLD[1], 0.5), 26);
}

export function scRelics(out: Frames): void {
  sOne(out, 'tombstone', 16, 20, tombstone); sOne(out, 'tombstone_b', 16, 22, tombstoneB);
  sOne(out, 'chain_pillar', 20, 52, chainPillar, false);
  sOne(out, 'lost_toy', 12, 10, lostToy, true, 0);
  sAnim(out, 'last_light', 4, 20, 40, lastLight, false);
  sOne(out, 'broken_arch', 56, 60, brokenArch, false);
  sOne(out, 'memory_frame', 20, 26, memoryFrame, false);
}
