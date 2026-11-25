/**
 * Quellwarte (Hub) – Platzmöbel: Manabrunnen (Mittelpunkt), Laternen, Banner, Marktstand, Stadtbaum, Bank, Beet,
 * Kisten, Fässer, Wegweiser, Pflanzkübel, Hüterstatue, Poller. Anker überall unten Mitte.
 */
import { Px, bez } from '../draw';
import { Frames, LEAF, MARK, P, Ramp, TAU, WHITE, alpha, anim, barkFill, crown, glow, hash2, limb, mix, moss, one, part, planks, shadeArea, sparkle, sw } from './kit';
import { DARK, HBLUE, I, LIT, LSTONE, MANA, PLASTER, SHADE, W, WINE, WSTONE, Y, awning, crest, stampArt } from './hub_kit';
import { barrel, crateBox, sack } from './hub_buildings';
import { prism } from './kr_kit';

// ================================================================ Manabrunnen
const MW: Ramp = [mix(P.teal[0], P.blue[0], 0.3), P.teal[1], P.teal[2], mix(P.teal[3], P.teal[2], 0.3), P.teal[3], P.teal[4], mix(P.teal[4], WHITE, 0.6)];
function brunnen(p: Px, f: number): void {
  const cx = 32, cy = 35, rx = 30, ry = 9, irx = 26.5, iry = 7, wallH = 6;
  const inE = (x: number, y: number, ax: number, ay: number) => { const u = (x + 0.5 - cx) / ax, v = (y + 0.5 - cy) / ay; return u * u + v * v <= 1; };
  // Becken: Außenwand (Front), Randoberseite, Wasser
  part(p, (l) => {
    for (let x = cx - rx; x < cx + rx; x++) {
      const u = (x + 0.5 - cx) / rx, eb = cy + ry * Math.sqrt(Math.max(0, 1 - u * u));
      for (let y = Math.floor(cy); y < Math.round(eb) + wallH; y++) {
        if (y < eb - 0.5) continue;
        const k = y - Math.round(eb), seg = Math.floor((Math.asin(Math.max(-1, Math.min(1, u))) * 6) + (k > 2 ? 0.5 : 0)), lightK = -u * 0.8 + 0.1;
        let t = 2 + (lightK > 0.45 ? 1 : lightK < -0.45 ? -1 : 0);
        if (k === 2 || Math.abs(Math.asin(Math.max(-1, Math.min(1, u))) * 6 + (k > 2 ? 0.5 : 0) - Math.round(Math.asin(Math.max(-1, Math.min(1, u))) * 6 + (k > 2 ? 0.5 : 0))) < 0.08) t = 0;
        if (k === wallH - 1) t = Math.max(0, t - 1);
        if ((hash2(seg, k > 2 ? 1 : 0, 9) & 7) === 0 && t > 0) t--;
        l.set(x, y, LSTONE[t]);
      }
    }
    for (let y = cy - ry - 1; y <= cy + ry + 1; y++) for (let x = cx - rx; x < cx + rx; x++) {
      if (!inE(x, y, rx, ry) || inE(x, y, irx, iry)) continue;
      const v = (y + 0.5 - cy) / ry, u = (x + 0.5 - cx) / rx;
      l.set(x, y, LSTONE[v < -0.3 ? 2 : v > 0.5 ? 4 : u < -0.6 ? 4 : 3]);
    }
  });
  // goldene Einlagen in der Beckenwand und Wappen vorn
  for (let k = -2; k <= 2; k++) { if (k === 0) continue; const x = cx + k * 11, u = (x + 0.5 - cx) / rx, eb = Math.round(cy + ry * Math.sqrt(1 - u * u)); p.rect(x - 1, eb + 3, 3, 2, Y[2]); p.set(x - 1, eb + 3, Y[4]); }
  crest(p, cx - 4, cy + ry - 3);
  // Wasser
  for (let y = cy - iry - 1; y <= cy + iry + 1; y++) for (let x = cx - irx - 1; x < cx + irx + 1; x++) {
    if (!inE(x, y, irx, iry)) continue;
    const u = (x + 0.5 - cx) / irx, v = (y + 0.5 - cy) / iry, d = Math.sqrt(u * u + v * v);
    let t = v < -0.55 ? 1 : v < -0.1 ? 2 : 3;
    if (d > 0.9 && v < 0) t = 0;
    const ring = (d * 3.2 - f / 4 + 10) % 1;
    if (ring < 0.12 && d > 0.25 && d < 0.95) t = Math.min(6, t + 2);
    if ((hash2(x, y, 31 + f) & 63) === 0 && v > -0.3) t = 6;
    p.set(x, y, MW[t]);
  }
  // Glitzern auf dem Wasser (wandert)
  for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + f * 0.4, x = Math.round(cx + Math.cos(a) * irx * 0.62), y = Math.round(cy + Math.sin(a) * iry * 0.55); p.set(x, y, WHITE); p.set(x + 1, y, MW[5]); }
  // Säule mit Goldband, obere Schale
  part(p, (l) => {
    for (let y = 19; y < cy + 2; y++) for (let i = 0; i < 7; i++) l.set(cx - 3 + i, y, LSTONE[i === 0 ? 4 : i === 1 ? 3 : i === 5 ? 1 : i === 6 ? 0 : 2]);
    l.rect(cx - 4, cy - 1, 9, 3, LSTONE[2]); l.rect(cx - 4, cy - 1, 9, 1, LSTONE[3]);
    l.rect(cx - 3, 27, 7, 2, Y[2]); l.rect(cx - 3, 27, 7, 1, Y[4]); l.set(cx, 28, MANA[3]);
    // Schale (Unterseite, dann Rand)
    for (let y = 16; y < 23; y++) { const hw = 11 - (y - 16) * 1.35; for (let x = Math.floor(cx - hw); x < cx + hw; x++) { const u = (x + 0.5 - cx) / hw; l.set(x, y, LSTONE[u < -0.5 ? 3 : u > 0.5 ? 1 : 2]); } }
    l.ell(cx + 0.5, 16, 11.5, 3.2, LSTONE[4]); l.ell(cx + 0.5, 16, 10, 2.4, MW[2]); l.ell(cx + 0.5, 16.4, 8, 1.6, MW[3]);
    l.rect(cx - 10, 18, 21, 1, Y[2]);
  });
  // Quellkristall auf der Schale
  part(p, (l) => { prism(l, cx, 16, cx, 3, 3, [MW[1], MW[2], MW[4], MW[5], MW[6], WHITE], { seed: 7 }); });
  const k = [0.6, 0.85, 1, 0.8][f];
  glow(p, cx, 9, 9 + k * 2, MANA[3], 30 + k * 30);
  glow(p, cx, 9, 4, MANA[4], 50 + k * 40, true);
  // Überlauf: zwei Strahlen fallen aus der Schale ins Becken
  for (const sx of [-1, 1]) {
    for (let j = 0; j < 17; j++) {
      const y = 17 + j, x = Math.round(cx + sx * (11 + Math.sqrt(j) * 1.6));
      const on = (j + f * 2) % 4 !== 0;
      p.set(x, y, on ? MW[5] : MW[4]); if (j > 2) p.blend(x - sx, y, alpha(MW[4], on ? 150 : 90));
    }
    const sx0 = Math.round(cx + sx * (11 + Math.sqrt(17) * 1.6));
    // Spritzer am Auftreffpunkt
    p.px([sx0 - 1, 33 - (f & 1), sx0 + 1, 32 - ((f + 1) & 1)], MW[6]); p.set(sx0 + sx * 2, 31 + (f === 2 ? 0 : 1), WHITE);
  }
  // aufsteigende Lichtpunkte über dem Kristall
  for (let j = 0; j < 3; j++) { const t = ((f + j * 1.33) % 4) / 4, x = cx + [-4, 4, 1][j] + Math.round(Math.sin(t * TAU + j) * 1.2), y = Math.round(6 - t * 6 + 2); p.blend(x, y, alpha(WHITE, Math.round(220 * (1 - t)))); }
  sparkle(p, cx - 2 + (f & 1) * 3, 4 + (f >> 1), MANA[4]);
}

// ================================================================ Laterne (Manalicht)
function laterne(p: Px): void {
  part(p, (l) => {
    // Sockel, Pfosten, Zierring, Ausleger
    l.rect(3, 37, 8, 4, WSTONE[2]); l.rect(3, 37, 8, 1, WSTONE[4]); l.rect(3, 40, 8, 1, WSTONE[0]); l.rect(9, 38, 2, 3, WSTONE[1]);
    l.rect(6, 12, 2, 25, I[1]); l.rect(6, 12, 1, 25, I[3]); l.rect(5, 33, 4, 4, I[2]); l.rect(5, 33, 4, 1, I[3]); l.rect(5, 22, 4, 2, Y[2]); l.set(5, 22, Y[4]);
    // Laternenkopf
    l.rect(3, 11, 8, 1, I[2]); l.rect(4, 2, 6, 2, I[2]); l.rect(5, 0, 4, 2, I[1]); l.set(6, 0, Y[3]);
    l.rect(3, 4, 8, 7, I[0]); l.rect(4, 4, 6, 7, MANA[3]); l.rect(5, 5, 4, 5, MANA[4]); l.rect(6, 6, 2, 3, WHITE); l.rect(4, 4, 1, 7, MANA[4]); l.rect(9, 4, 1, 7, MANA[1]);
    l.rect(6, 4, 2, 7, mix(MANA[4], WHITE, 0.3)); l.rect(3, 7, 8, 1, I[1]);
    l.px([2, 4, 11, 4, 2, 10, 11, 10], Y[3]);
  });
  glow(p, 7, 7, 7, MANA[3], 60);
}

// ================================================================ Banner (am Mast, weht)
function hubBanner(p: Px, f: number): void {
  // Mast mit Goldknauf und Querstange
  p.rect(2, 4, 2, 47, W[2]); p.rect(2, 4, 1, 47, W[3]); p.rect(1, 50, 4, 2, WSTONE[2]); p.rect(1, 50, 4, 1, WSTONE[4]);
  p.px([2, 1, 3, 1, 2, 2, 3, 2, 1, 2, 4, 2], Y[3]); p.set(2, 1, Y[4]); p.set(3, 3, Y[1]); p.rect(2, 3, 2, 1, Y[2]);
  p.rect(3, 5, 14, 2, W[2]); p.rect(3, 5, 14, 1, W[3]); p.px([17, 5, 17, 6], Y[3]);
  const C = HBLUE;
  for (let x = 4; x < 17; x++) {
    const u = (x - 4) / 12, ph = (f * Math.PI) / 2 - u * 2.4, dy = Math.round(Math.sin(ph) * (0.3 + u * 1.4)), light = Math.cos(ph);
    const len = 30 + (x === 10 ? -5 : Math.abs(x - 10) === 1 ? -4 : Math.abs(x - 10) === 2 ? -2 : Math.abs(x - 10) === 3 ? -1 : 0);
    for (let j = 0; j < len; j++) {
      const y = 7 + j + (j > 3 ? dy : 0);
      let c = light > 0.45 ? C[3] : light < -0.45 ? C[1] : C[2];
      if (x === 4 || x === 16) c = light > 0 ? Y[3] : Y[2];
      else if (j === 1 || j === len - 4) c = Y[2];
      p.set(x, y, c);
    }
    // Emblem: Quelltropfen im Goldring
    const e = (dx: number, dyy: number, c: number): void => { if (x === 10 + dx) p.set(x, 17 + dyy + dy, c); };
    for (const [dx, dyy] of [[-3, 0], [-3, 1], [-2, -2], [-2, 3], [-1, -3], [0, -3], [1, -3], [2, -2], [2, 3], [3, 0], [3, 1], [-1, 4], [0, 4], [1, 4]] as const) e(dx, dyy, light > -0.2 ? Y[3] : Y[2]);
    for (const [dx, dyy] of [[0, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1], [0, 2]] as const) e(dx, dyy, MANA[dyy < 1 ? 4 : 3]);
    e(0, -2, MANA[3]); e(-1, 0, WHITE);
  }
}

// ================================================================ Marktstand
function stand(p: Px): void {
  // Pfosten
  part(p, (l) => { for (const x of [3, 43]) { l.rect(x, 10, 3, 31, W[2]); l.rect(x, 10, 1, 31, W[3]); l.rect(x + 2, 10, 1, 31, W[0]); } });
  // Rückwand mit Regal und Waren
  part(p, (l) => {
    l.rect(6, 14, 37, 14, MARK); planks(l, 6, 14, 37, 14, { ramp: W, pw: 4, vertical: true, seed: 5, mark: MARK });
    l.rect(6, 20, 37, 2, W[3]); l.rect(6, 20, 37, 1, W[4]);
    for (const [x, c] of [[9, P.red], [14, Y], [19, P.green], [25, P.violet], [31, P.blue], [36, P.red]] as const) { l.rect(x, 16, 3, 4, c[2]); l.set(x, 16, c[4]); l.rect(x, 15, 3, 1, P.ice[3]); }
    // aufgehängte Tücher
    l.rect(10, 22, 5, 6, HBLUE[2]); l.rect(10, 22, 1, 6, HBLUE[4]); l.rect(17, 22, 5, 5, WINE[3]); l.rect(17, 22, 1, 5, WINE[4]); l.rect(24, 22, 4, 6, P.gold[2]);
  });
  // Ladentisch mit Obstkörben
  part(p, (l) => {
    l.rect(4, 29, 41, 11, MARK); planks(l, 4, 29, 41, 11, { ramp: P.tan, pw: 3, vertical: true, seed: 9, mark: MARK, worn: 0.5 });
    l.rect(2, 27, 45, 3, W[3]); l.rect(2, 27, 45, 1, W[4]); l.rect(2, 29, 45, 1, W[1]);
    l.rect(4, 32, 41, 2, WINE[2]); for (let x = 4; x < 45; x += 4) l.set(x + 2, 34, WINE[3]);
  });
  part(p, (l) => {
    for (const [x, c] of [[8, P.red], [17, P.green], [27, Y], [36, P.fire]] as const) {
      l.rect(x, 24, 8, 3, P.tan[2]); l.rect(x, 26, 8, 1, P.tan[1]); for (let i = 0; i < 4; i++) { l.ball(x + 1.5 + i * 1.8, 23.5 - (i & 1), 1.3, 1.3, c, 1, 4); }
    }
  });
  // Markise
  part(p, (l) => { awning(l, 3, 4, 43, 6, WINE, PLASTER, 5); });
  p.set(24, 2, Y[3]);
}

// ================================================================ Stadtbaum im Steinkübel (Linde)
const LINDE = [
  { x: 22, y: 26, rx: 15, ry: 12, lv: -0.5 },
  { x: 13, y: 33, rx: 9, ry: 8, lv: -0.1, amp: 1.4 },
  { x: 31, y: 33, rx: 9, ry: 8, lv: -0.35, amp: 1.4 },
  { x: 21, y: 16, rx: 11, ry: 9, lv: 0.25, amp: 1 },
  { x: 22, y: 36, rx: 12, ry: 6, lv: 0.1, amp: 1.2 },
];
function baum(p: Px): void {
  // Stamm
  limb(p, bez([22, 58], [21, 50], [22, 38]), 3, 2.2);
  limb(p, bez([22, 44], [17, 38], [13, 33]), 1.8, 1);
  limb(p, bez([22, 42], [27, 37], [31, 32]), 1.8, 1);
  const BW: Ramp = [W[0], mix(W[1], P.stone[1], 0.3), mix(W[2], P.stone[2], 0.3), mix(W[3], P.tan[3], 0.4), mix(W[4], P.tan[4], 0.4)];
  barkFill(p, BW, 41, MARK, 3);
  crown(p, LINDE, { ramp: LEAF.oak, seed: 711, tuft: 4.2, frame: 0, sway: 0 });
  // Steinkübel mit Goldkante
  part(p, (l) => {
    l.rect(8, 55, 28, 13, MARK); for (let y = 55; y < 68; y++) for (let x = 8; x < 36; x++) { const u = (x - 8) / 27, row = Math.floor((y - 58) / 5), m = (y - 58) % 5; let t = u < 0.2 ? 3 : u > 0.82 ? 1 : 2; if (y >= 58 && (m === 4 || (x + row * 4) % 9 === 0)) t = 0; if (y < 58) t = y === 55 ? 4 : y === 57 ? 1 : 3; l.set(x, y, WSTONE[t]); }
    l.rect(8, 58, 28, 1, Y[2]); l.set(8, 58, Y[4]);
    l.rect(10, 55, 24, 2, mix(W[0], P.green[0], 0.3)); l.px([11, 55, 15, 54, 28, 55, 32, 54], P.green[3]); l.px([13, 54, 30, 54], P.pink[3]); l.set(31, 53, WHITE);
  });
  moss(p, (x, y) => (y > 63 && (x < 13 || x > 31) ? 0.4 : 0), 5);
}

// ================================================================ Bank
function bank(p: Px): void {
  part(p, (l) => {
    // Rückenlehne aus Holz, Seitenwangen aus Stein
    l.rect(4, 2, 22, 6, MARK); planks(l, 4, 2, 22, 6, { ramp: W, pw: 3, seed: 3, mark: MARK, worn: 0.3 }); l.rect(4, 2, 22, 1, W[4]);
    l.rect(3, 10, 24, 4, MARK); planks(l, 3, 10, 24, 4, { ramp: W, pw: 2, seed: 5, mark: MARK, worn: 0.3 }); l.rect(3, 10, 24, 1, W[4]); l.rect(3, 13, 24, 1, W[1]);
    for (const x of [1, 25]) { l.rect(x, 1, 4, 17, WSTONE[2]); l.rect(x, 1, 1, 17, WSTONE[4]); l.rect(x + 3, 1, 1, 17, WSTONE[0]); l.rect(x, 1, 4, 1, WSTONE[4]); l.rect(x, 7, 4, 1, Y[2]); }
  });
}

// ================================================================ Blumenbeet (flach)
function blumen(p: Px): void {
  // niedrige Einfassung, Erde, Blumen in Gruppen
  for (let y = 1; y < 15; y++) for (let x = 0; x < 32; x++) {
    const u = (x + 0.5 - 16) / 16, v = (y + 0.5 - 8) / 7; if (u * u + v * v > 1) continue;
    const edge = u * u + v * v > 0.68;
    p.set(x, y, edge ? LSTONE[v < 0 ? 3 : 2] : mix(W[0], P.green[0], 0.3));
  }
  for (let y = 1; y < 15; y++) for (let x = 0; x < 32; x++) { const u = (x + 0.5 - 16) / 16, v = (y + 0.5 - 8) / 7, d = u * u + v * v; if (d <= 1 && d > 0.68 && v > 0.3) p.set(x, y + 1 > 15 ? y : y + 1, LSTONE[0]); }
  // Laub deckt fast die ganze Erde, darauf dichte Blütengruppen (je Gruppe eine Farbe)
  for (let y = 2; y < 14; y++) for (let x = 2; x < 30; x++) {
    const u = (x + 0.5 - 16) / 16, v = (y + 0.5 - 8) / 7; if (u * u + v * v > 0.66) continue;
    const h = hash2(x, y, 41) & 15; if (h < 3) continue;
    p.set(x, y, h < 7 ? P.green[1] : h < 12 ? P.green[2] : P.green[3]);
  }
  const FL: Ramp[] = [P.red, P.gold, P.pink, P.violet, HBLUE, P.red];
  const groups = [[7, 6], [12, 9], [16, 5], [21, 8], [25, 6], [10, 4], [19, 11], [14, 7]];
  groups.forEach(([gx, gy], g) => {
    const R = FL[g % FL.length];
    for (let k = 0; k < 6; k++) {
      const h = hash2(k, g, 79), x = gx + ((h & 3) - 1), y = gy + (((h >> 2) & 3) - 1);
      const u = (x + 0.5 - 16) / 16, v = (y + 0.5 - 8) / 7; if (u * u + v * v > 0.62) continue;
      p.set(x, y, R[3]); if ((h >> 5) & 1) p.set(x, y - 1, R[4]); p.set(x + 1, y, R[2]);
    }
    p.set(gx, gy - 1, g % 3 === 0 ? WHITE : R[4]);
  });
}

// ================================================================ Kleinkram
function kisten(p: Px): void {
  part(p, (l) => crateBox(l, 1, 10, 14, 13, 3));
  part(p, (l) => crateBox(l, 13, 13, 13, 10, 5, W));
  part(p, (l) => crateBox(l, 4, 1, 11, 10, 7));
  part(p, (l) => sack(l, 21, 13, 7, 7));
}
function faesser(p: Px): void {
  part(p, (l) => barrel(l, 1, 7, 10, 12));
  part(p, (l) => barrel(l, 12, 8, 10, 11));
  part(p, (l) => { barrel(l, 6, 0, 8, 7); l.rect(7, 0, 6, 1, W[4]); });
}
function wegweiser(p: Px): void {
  part(p, (l) => {
    l.rect(10, 4, 3, 30, W[2]); l.rect(10, 4, 1, 30, W[3]); l.rect(12, 4, 1, 30, W[0]); l.rect(8, 33, 7, 3, WSTONE[2]); l.rect(8, 33, 7, 1, WSTONE[4]);
    l.rect(10, 2, 3, 2, Y[3]); l.set(10, 2, Y[4]);
  });
  const sign = (l: Px, x: number, y: number, w: number, right: boolean, R: Ramp) => {
    l.rect(x, y, w, 5, R[2]); l.rect(x, y, w, 1, R[3]); l.rect(x, y + 4, w, 1, R[0]);
    if (right) { l.px([x + w, y + 1, x + w, y + 2, x + w, y + 3, x + w + 1, y + 2], R[2]); } else { l.px([x - 1, y + 1, x - 1, y + 2, x - 1, y + 3, x - 2, y + 2], R[2]); }
    for (let i = x + 2; i < x + w - 2; i += 2) l.set(i, y + 2, R[0]);
  };
  part(p, (l) => sign(l, 12, 6, 10, true, P.tan));
  part(p, (l) => sign(l, 2, 12, 10, false, HBLUE));
  part(p, (l) => sign(l, 12, 18, 9, true, WINE));
}
function kuebel(p: Px): void {
  // runder Buchs im Terrakottakübel mit Goldband
  part(p, (l) => {
    l.poly([[3, 12], [15, 12], [13, 21], [5, 21]], WSTONE[2]); l.poly([[3, 12], [7, 12], [6, 21], [5, 21]], WSTONE[3]); l.poly([[12, 12], [15, 12], [13, 21], [11, 21]], WSTONE[1]);
    l.rect(2, 11, 14, 2, WSTONE[3]); l.rect(2, 11, 14, 1, WSTONE[4]); l.rect(4, 16, 10, 1, Y[2]);
  });
  part(p, (l) => { l.ball(9, 7, 6.5, 5.5, LEAF.oak, 1, 6); for (let k = 0; k < 9; k++) { const h = hash2(k, 1, 5); l.set(4 + (h % 10), 3 + ((h >> 5) % 7), LEAF.oak[(h >> 9) & 1 ? 5 : 2]); } l.set(6, 3, LEAF.oak[6]); });
}
function statue(p: Px): void {
  const A = LSTONE;
  part(p, (l) => {
    // Hüter in Rüstung, Hände auf dem Knauf des aufgestellten Schwertes
    stampArt(l, 4, 5, [
      '......cCc.......',
      '.....cCCCc......',
      '.....CCCCc......',
      '.....CdDdC......',
      '.....CdddC......',
      '......cCc.......',
      '....aAAAAAa.....',
      '...aAbAAAAAa....',
      '..aAAbAAAAAAa...',
      '..aAbAAAAAAAa...',
      '..AAbAAAAAAAa...',
      '..AAbAAhhAAAa...',
      '..AbAAAhhAAAa...',
      '.aAbAAggggAAAa..',
      '.aAbAAAssAAAAa..',
      '.aAbAAAssAAAAa..',
      '.AAbAAAssAAAAa..',
      '.AAbAAAssAAAAa..',
      '.AbAAAAssAAAAAa.',
      '.AbAAAAssAAAAAa.',
      'AAbAAAAssAAAAAa.',
      'AAbAAAAssAAAAAa.',
      'AbAAAAAssAAAAAa.',
      'AbAAAAAssAAAAAAa',
      'AbAAAAAssAAAAAAa',
      'AAAAAAAAAAAAAAAa',
      'aAAAAAAAAAAAAAaa',
      '.aaaaaaaaaaaaaa.',
    ], { A: A[3], a: A[1], b: A[4], c: A[2], C: A[3], d: A[0], D: MANA[4], g: Y[3], h: A[4], s: I[3] });
    for (let y = 19; y < 30; y++) l.set(11, y, I[4]);
    // Sockel mit Goldtafel
    l.rect(2, 32, 20, 9, A[2]); l.rect(2, 32, 20, 1, A[4]); l.rect(2, 40, 20, 1, A[0]); l.rect(19, 33, 3, 7, A[1]); l.rect(2, 33, 1, 7, A[3]);
    l.rect(0, 41, 24, 3, WSTONE[2]); l.rect(0, 41, 24, 1, WSTONE[4]); l.rect(0, 43, 24, 1, WSTONE[0]);
    l.rect(6, 35, 12, 3, Y[2]); l.rect(6, 35, 12, 1, Y[4]); l.px([8, 36, 10, 36, 12, 36, 14, 36], Y[1]);
  });
  glow(p, 11.5, 8.5, 3.5, MANA[3], 80);
}
function poller(p: Px): void {
  part(p, (l) => { l.rect(1, 3, 6, 9, LSTONE[2]); l.rect(1, 3, 2, 9, LSTONE[3]); l.rect(6, 3, 1, 9, LSTONE[1]); l.ell(4, 3, 3, 1.6, LSTONE[4]); l.rect(1, 6, 6, 1, Y[2]); });
}

export function hubProps(out: Frames): void {
  anim(out, 'hub_brunnen', 4, 64, 52, brunnen, false);
  one(out, 'hub_laterne', 14, 42, laterne, false);
  anim(out, 'hub_banner', 4, 20, 54, hubBanner);
  one(out, 'hub_stand', 50, 42, stand);
  one(out, 'hub_baum', 44, 68, baum);
  one(out, 'hub_bank', 30, 18, bank);
  one(out, 'hub_blumen', 32, 16, blumen);
  one(out, 'hub_kisten', 28, 24, kisten);
  one(out, 'hub_faesser', 24, 20, faesser);
  one(out, 'hub_wegweiser', 24, 38, wegweiser);
  one(out, 'hub_kuebel', 18, 22, kuebel);
  one(out, 'hub_statue', 24, 44, statue);
  one(out, 'hub_poller', 8, 13, poller);
}
void DARK; void LIT; void SHADE; void shadeArea; void sw; void TAU;
