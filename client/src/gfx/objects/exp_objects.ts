/**
 * Expeditionen – Portale und Dungeon-Mechanik (ab 0.9). Hüterstein (hell, Goldzier) + Manawirbel.
 *   expedition_portal_0..5 64×80  großes Torportal mit Wirbel (Mittelpunkt des Portalplatzes), Anker unten Mitte
 *   portal_small_0..3      32×44  Rückkehrportal der Belohnungskammer
 *   boss_seal_0..3         16×32  leuchtende Sperre vor dem Arenaeingang, je Kachel ein Frame, waagerecht kachelbar
 *   reward_altar           40×36  Altar der Belohnungen (die Beute erscheint auf der Platte, ca. 14 px über dem Fuß)
 *   checkpoint_0..3        24×40  Rastkristall des Vorbereitungsraums
 *   secret_wall / _open    16×32  rissige Wand / aufgebrochener Durchgang (wie door_closed)
 *   collapse_floor_0..2    16×16  Bodenplatte, die zerbricht (0 = erste Risse, 2 = kurz vor dem Einsturz), flach
 */
import { Px } from '../draw';
import { Frames, MARK, P, Ramp, TAU, WHITE, alpha, anim, glow, hash2, masonry, mix, moss, one, part, rnd2, shadeArea, sparkle } from './kit';
import { prism } from './kr_kit';
import { DARK, I, LSTONE, MANA, SHADE, WSTONE, Y, crest, stampArt } from './hub_kit';

/** Hüterstein (neutral-hell, eine Spur kühler als der Stadtstein) */
export const GSTONE: Ramp = [mix(P.stone[0], P.steel[0], 0.3), mix(P.stone[1], P.steel[1], 0.3), mix(P.stone[2], P.cream[2], 0.25), mix(P.stone[3], P.cream[3], 0.35), mix(P.stone[4], P.cream[4], 0.45)];
const SW: Ramp = [mix(P.teal[0], P.blue[0], 0.4), P.teal[1], P.teal[2], P.teal[3], P.teal[4], mix(P.teal[4], WHITE, 0.6), WHITE];

/** Manawirbel in einer Ellipse (Spiralarme drehen sich über n Frames). */
function vortex(p: Px, cx: number, cy: number, rx: number, ry: number, f: number, n: number, arms = 3, R: Ramp = SW): void {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, d = Math.sqrt(u * u + v * v);
    if (d > 1) continue;
    const a = Math.atan2(v, u), s = Math.sin(a * arms + d * 7.5 - (f / n) * TAU);
    let t = d > 0.93 ? 1 : d < 0.18 ? 6 : d < 0.32 ? 5 : s > 0.55 ? 4 : s > 0 ? 3 : s > -0.6 ? 2 : 1;
    if (d > 0.82 && t > 2) t--;
    if ((hash2(x, y, 3 + f) & 63) === 0 && d < 0.85) t = 6;
    p.set(x, y, R[t]);
  }
}

// ================================================================ großes Expeditionsportal
function bigPortal(p: Px, f: number): void {
  const cx = 32, A = GSTONE;
  // Wirbel (liegt hinter dem Bogen)
  vortex(p, cx, 40, 17, 25, f, 6, 3);
  // Bogen aus Keilsteinen mit Runen, Pfeiler, Sockelstufen
  part(p, (l) => {
    for (let y = 6; y < 72; y++) for (let x = 4; x < 60; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - 40, inner = (dx / 17) ** 2 + (dy / 25) ** 2, outer = (dx / 27) ** 2 + (Math.min(0, dy + 4) / 34) ** 2;
      const pillar = y >= 40 && (Math.abs(dx) >= 17 && Math.abs(dx) <= 27);
      if (inner <= 1 && !(y >= 40 && Math.abs(dx) > 17)) continue;
      if (!(y < 40 ? outer <= 1 : pillar)) continue;
      l.set(x, y, MARK);
    }
    // Keilsteine: Segmente nach Winkel, Pfeiler: Quader
    for (let y = 0; y < 72; y++) for (let x = 0; x < 64; x++) {
      if (l.get(x, y) !== MARK) continue;
      const dx = x + 0.5 - cx, dy = y + 0.5 - 40;
      let t: number;
      if (y < 40) {
        const a = Math.atan2(dy, dx) / Math.PI, seg = Math.floor(-a * 11), ring = (dx / 17) ** 2 + (dy / 25) ** 2;
        const lit = -dx / 27 * 0.8 - dy / 34 * 0.6;
        t = 2 + (lit > 0.3 ? 1 : lit < -0.3 ? -1 : 0) + ((hash2(seg, 1, 9) & 3) === 0 ? 1 : 0);
        if (Math.abs(-a * 11 - Math.round(-a * 11)) < 0.06) t = 0;
        if (ring < 1.12) t = Math.min(4, t + 1);
        if (seg === 5) t = -1; // Schlussstein
      } else {
        const lx = Math.abs(dx) - 17, row = Math.floor((y - 40) / 6), m = (y - 40) % 6;
        t = dx < 0 ? (lx < 2 ? 2 : lx > 8 ? 4 : 3) : (lx < 2 ? 3 : lx > 8 ? 1 : 2);
        if (m === 5) t = 0; else if (m === 0) t++;
        if ((hash2(row, dx < 0 ? 1 : 2, 5) & 3) === 0) t--;
      }
      l.set(x, y, t < 0 ? Y[3] : A[Math.max(0, Math.min(4, t))]);
    }
    // Schlussstein mit Wappen
    crest(l, cx - 4, 3);
    // Kapitelle und Sockel der Pfeiler
    for (const sx of [-1, 1]) {
      const x0 = sx < 0 ? cx - 28 : cx + 16;
      l.rect(x0, 38, 12, 3, A[4]); l.rect(x0, 40, 12, 1, A[1]); l.rect(x0, 39, 12, 1, Y[2]);
      l.rect(x0 - 1, 64, 14, 4, A[3]); l.rect(x0 - 1, 64, 14, 1, A[4]); l.rect(x0 - 1, 67, 14, 1, A[1]);
    }
    // Stufen
    for (let k = 0; k < 3; k++) { const w = 44 + k * 8, x0 = cx - w / 2, y = 70 + k * 3; l.rect(x0, y, w, 3, A[3 - (k & 1)]); l.rect(x0, y, w, 1, A[4]); l.rect(x0, y + 2, w, 1, A[1]); }
    l.rect(cx - 10, 70, 20, 1, Y[2]);
  });
  // Runen in den Pfeilern (leuchten im Takt)
  const RUNES = [['.x.', 'xxx', '.x.', 'x.x'], ['x.x', '.x.', 'xxx', '.x.'], ['xx.', '.xx', 'x..', 'xxx']];
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
    const x = sx < 0 ? cx - 24 : cx + 21, y = 44 + k * 7, on = (k + f + (sx > 0 ? 1 : 0)) % 3 === 0;
    stampArt(p, x, y, RUNES[(k + (sx > 0 ? 1 : 0)) % 3], { x: on ? MANA[4] : MANA[1] });
    if (on) glow(p, x + 1.5, y + 2, 4, MANA[3], 50, true);
  }
  // Runen im Bogen
  for (let k = 0; k < 9; k++) { const a = Math.PI * (0.12 + k * 0.095), x = Math.round(cx - Math.cos(a) * 22), y = Math.round(40 - Math.sin(a) * 29.5); p.set(x, y, (k + f) % 3 === 0 ? WHITE : MANA[3]); }
  // Lichtsaum innen, schwebende Splitter, Funken
  glow(p, cx, 40, 30, MANA[3], 22);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + (f / 6) * TAU, x = cx + Math.cos(a) * 21, y = 42 + Math.sin(a) * 30 * 0.5 - 6;
    if (Math.sin(a) < 0) continue;
    p.set(x, y, WHITE); p.blend(x + 1, y, alpha(MANA[4], 180)); p.blend(x, y + 1, alpha(MANA[3], 140));
  }
  for (let j = 0; j < 4; j++) { const t = ((f + j * 1.5) % 6) / 6, x = cx + [-9, 6, -3, 11][j], y = Math.round(64 - t * 40); p.blend(x, y, alpha(WHITE, Math.round(230 * (1 - t)))); }
  sparkle(p, cx - 1 + (f % 3) - 1, 16 + (f % 2), MANA[4], f === 2);
}

// ================================================================ kleines Rückkehrportal
function smallPortal(p: Px, f: number): void {
  const cx = 16, A = GSTONE;
  vortex(p, cx, 22, 10, 15, f, 4, 2);
  part(p, (l) => {
    // Ring aus Stein (Ellipse), zwei Füße, Bodenplatte
    for (let y = 4; y < 40; y++) for (let x = 2; x < 30; x++) {
      const u = (x + 0.5 - cx) / 13.5, v = (y + 0.5 - 22) / 18, ui = (x + 0.5 - cx) / 10, vi = (y + 0.5 - 22) / 15;
      if (u * u + v * v > 1 || ui * ui + vi * vi <= 1) continue;
      const lit = -u * 0.7 - v * 0.7, seg = Math.floor(Math.atan2(v, u) * 2.6);
      let t = 2 + (lit > 0.3 ? 1 : lit < -0.3 ? -1 : 0); if ((hash2(seg, 2, 7) & 3) === 0) t++;
      l.set(x, y, A[Math.max(0, Math.min(4, t))]);
    }
    l.rect(4, 38, 24, 4, A[3]); l.rect(4, 38, 24, 1, A[4]); l.rect(4, 41, 24, 1, A[1]); l.rect(13, 39, 6, 1, Y[2]);
    l.rect(14, 3, 4, 3, Y[3]); l.set(14, 3, Y[4]);
  });
  for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + (f / 4) * (TAU / 6), x = Math.round(cx + Math.cos(a) * 11.8), y = Math.round(22 + Math.sin(a) * 16.5); p.set(x, y, k % 2 ? MANA[3] : WHITE); }
  glow(p, cx, 22, 17, MANA[3], 26);
}

// ================================================================ Siegel der Bossarena
function bossSeal(p: Px, f: number): void {
  // senkrechtes Energiefeld: waagerecht nahtlos (Muster mit Periode 16), unten Bodenkante, oben ausblendend
  for (let y = 0; y < 32; y++) for (let x = 0; x < 16; x++) {
    const fade = y < 8 ? y / 8 : 1, wave = Math.sin((x / 16) * TAU * 2 + y * 0.45 - f * (TAU / 4)), band = Math.sin((x / 16) * TAU + (y + f * 3) * 0.22);
    let a = 90 + wave * 40 + band * 25, c = P.violet[3];
    if (wave > 0.75) { c = mix(P.violet[4], WHITE, 0.4); a += 40; }
    if (y > 27) { a += 60; c = P.violet[4]; }
    p.set(x, y, alpha(c, Math.max(0, Math.min(255, Math.round(a * fade)))));
  }
  // Runenkette quer durch das Feld (Periode 16)
  const R = ['x.x.', '.x..', 'xxx.', '.x..'];
  stampArt(p, 6, 12 + (f & 1 ? 1 : 0), R, { x: WHITE });
  for (let x = 0; x < 16; x++) { p.set(x, 18, alpha(mix(P.violet[4], P.pink[4], 0.5), 200)); if ((x + f * 2) % 8 === 0) p.set(x, 18, WHITE); }
  // Bodenrinne: Fuge mit glühender Linie
  for (let x = 0; x < 16; x++) { p.set(x, 30, P.violet[4]); p.set(x, 31, P.violet[1]); }
  for (let k = 0; k < 2; k++) { const x = (k * 8 + f * 3) % 16, y = 26 - ((f * 5 + k * 7) % 20); p.set(x, y, WHITE); }
}

// ================================================================ Belohnungsaltar
function rewardAltar(p: Px): void {
  const A = GSTONE;
  part(p, (l) => {
    l.rect(1, 30, 38, 5, A[2]); l.rect(1, 30, 38, 1, A[4]); l.rect(1, 34, 38, 1, A[0]);
    l.rect(6, 14, 28, 16, MARK); masonry(l, 6, 14, 28, 16, { ramp: A, bh: 5, bw: 9, seed: 3, rough: 0.2, mark: MARK });
    shadeArea(l, (x, y) => x >= 29 && y >= 14 && y < 30, SHADE, 0.3); shadeArea(l, (x, y) => x <= 8 && y >= 14 && y < 30, WHITE, 0.15);
    l.rect(13, 18, 14, 9, Y[2]); l.rect(13, 18, 14, 1, Y[4]); l.rect(14, 19, 12, 7, mix(DARK, P.blue[1], 0.4)); crest(l, 16, 17);
    // Platte
    l.rect(2, 8, 36, 6, A[3]); l.rect(2, 8, 36, 2, A[4]); l.rect(2, 13, 36, 1, A[1]); l.rect(2, 11, 36, 1, Y[2]); l.px([2, 11, 37, 11], Y[4]);
    for (const x of [6, 33]) { l.rect(x - 2, 5, 5, 3, Y[2]); l.rect(x - 2, 5, 5, 1, Y[4]); l.set(x, 4, P.fire[3]); l.set(x, 3, P.fire[4]); }
  });
  // Lichtsäule über der Platte
  for (let y = 0; y < 8; y++) for (let x = 12; x < 28; x++) { const u = Math.abs(x + 0.5 - 20) / 8; if (u < 1) p.blend(x, y, alpha(mix(Y[4], WHITE, 0.5), Math.round((1 - u) * (y + 1) * 14))); }
  glow(p, 20, 8, 12, Y[4], 30);
}

// ================================================================ Rastkristall
function checkpoint(p: Px, f: number): void {
  const A = GSTONE, k = [0.5, 0.8, 1, 0.75][f];
  part(p, (l) => {
    l.rect(3, 33, 18, 6, A[2]); l.rect(3, 33, 18, 1, A[4]); l.rect(3, 38, 18, 1, A[0]); l.rect(18, 34, 3, 4, A[1]);
    l.rect(6, 28, 12, 5, A[3]); l.rect(6, 28, 12, 1, A[4]); l.rect(6, 30, 12, 1, Y[2]); l.rect(16, 29, 2, 4, A[1]);
  });
  const bob = [0, -1, -1, 0][f];
  part(p, (l) => { prism(l, 12, 26 + bob, 12, 3 + bob, 4.4, [MANA[0], MANA[1], MANA[2], MANA[3], MANA[4], WHITE], { seed: 11 }); });
  glow(p, 12, 15 + bob, 11 + k * 2, MANA[3], 20 + k * 30);
  // warmer Lichtring auf dem Sockel (Rast = Wärme)
  for (let x = 6; x < 18; x++) p.set(x, 28, (x + f) % 3 === 0 ? Y[4] : Y[3]);
  for (let j = 0; j < 3; j++) { const t = ((f + j * 1.33) % 4) / 4, x = 12 + [-5, 5, 2][j], y = Math.round(24 - t * 18); p.blend(x, y, alpha(WHITE, Math.round(220 * (1 - t)))); }
}

// ================================================================ Geheimwand
function wallStones(l: Px, seed: number): void {
  l.rect(0, 0, 16, 32, MARK); masonry(l, 0, 0, 16, 32, { ramp: P.stone, bh: 5, bw: 8, seed, rough: 0.5, mark: MARK });
  l.rect(0, 0, 16, 3, P.stone[3]); l.rect(0, 0, 16, 1, P.stone[4]); l.rect(0, 3, 16, 1, P.stone[1]);
}
function secretWall(p: Px): void {
  part(p, (l) => {
    wallStones(l, 17);
    // feiner Riss durch mehrere Steine, Luftzug: etwas Staub und ein Moosfleck – das Auge soll stutzen
    const crack = [[8, 6], [8, 7], [9, 8], [9, 9], [8, 10], [8, 11], [7, 12], [7, 13], [8, 14], [9, 15], [9, 16], [10, 17], [9, 18], [9, 19], [8, 20], [8, 21], [7, 22], [6, 23], [6, 24]];
    for (const [x, y] of crack) { l.set(x, y, DARK); l.set(x + 1, y, P.stone[4]); }
    l.px([6, 9, 5, 10, 10, 19, 11, 20], DARK);
    l.px([3, 28, 4, 29, 12, 29, 13, 28], P.stone[1]);
    moss(l, (x, y) => (y > 24 && x < 6 ? 0.5 : 0), 5);
  }, false);
}
function secretWallOpen(p: Px): void {
  // aufgebrochen: dunkler Durchgang, Bruchkanten, Schutt am Boden
  part(p, (l) => {
    wallStones(l, 17);
    for (let y = 6; y < 32; y++) for (let x = 2; x < 14; x++) {
      const edge = (hash2(x, y, 3) & 3) === 0, inside = Math.abs(x + 0.5 - 8) < 5 - (y < 10 ? (10 - y) * 0.7 : 0) - (edge ? 1 : 0);
      if (inside) l.set(x, y, mix(DARK, P.shadow[1], (y - 6) / 40));
    }
  }, false);
  part(p, (l) => { for (const [x, y, w] of [[2, 28, 5], [8, 29, 4], [11, 27, 4], [5, 26, 3]] as const) { l.rect(x, y, w, 3, P.stone[2]); l.rect(x, y, w, 1, P.stone[4]); l.set(x + w - 1, y + 2, P.stone[0]); } });
}

// ================================================================ Einsturzboden
function collapseFloor(p: Px, f: number): void {
  // Bodenplatte (neutraler Stein), Risse wachsen, Splitter sacken ab
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    let c = P.stone[2 + ((hash2(x >> 2, y >> 2, 5) & 3) === 0 ? 1 : 0)];
    if (x === 0 || y === 0) c = P.stone[3]; if (x === 15 || y === 15) c = P.stone[1];
    p.set(x, y, c);
  }
  const lines: [number, number][][] = [
    [[3, 4], [5, 5], [7, 7], [8, 8], [10, 9], [12, 9]],
    [[7, 7], [7, 9], [6, 11], [5, 13], [8, 9], [9, 11], [11, 13]],
    [[2, 9], [4, 10], [5, 12], [12, 4], [11, 6], [10, 8], [13, 12], [14, 14], [3, 2], [4, 3]],
  ];
  for (let k = 0; k <= f; k++) for (const [x, y] of lines[k]) { p.set(x, y, DARK); p.set(x + 1, y, P.stone[4]); if (k < f) p.set(x, y + 1, P.shadow[1]); }
  if (f === 2) {
    // abgesackte Mitte: dunkle Spalten, Splitter, Staub
    for (let y = 6; y < 12; y++) for (let x = 5; x < 11; x++) if ((hash2(x, y, 9) & 3) !== 0) p.set(x, y, mix(p.get(x, y), DARK, 0.45));
    p.px([7, 8, 8, 9, 6, 10, 9, 7], DARK);
    p.px([2, 14, 13, 3, 14, 10], alpha(P.stone[4], 160));
  }
}

export function expObjects(out: Frames): void {
  anim(out, 'expedition_portal', 6, 64, 80, bigPortal, false);
  anim(out, 'portal_small', 4, 32, 44, smallPortal, false);
  anim(out, 'boss_seal', 4, 16, 32, bossSeal, false);
  one(out, 'reward_altar', 40, 36, rewardAltar, false);
  anim(out, 'checkpoint', 4, 24, 40, checkpoint, false);
  one(out, 'secret_wall', 16, 32, secretWall, false);
  one(out, 'secret_wall_open', 16, 32, secretWallOpen, false);
  anim(out, 'collapse_floor', 3, 16, 16, collapseFloor, false);
}
void rnd2; void WSTONE; void LSTONE; void I;
