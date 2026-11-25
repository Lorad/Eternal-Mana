/**
 * Quellwarte (Hub) – Fassaden der Einrichtungen. Frontansicht in ¾-Sicht; Standfläche = Unterkante des Frames,
 * die Tür liegt unten mittig (Türmitte = Framemitte, Schwelle in den zwei untersten Zeilen).
 *   hub_schmiede 96×92 · hub_haendler 96×90 · hub_alchemie 88×104 · hub_meister 104×96
 *   hub_lager 104×88 · hub_gasthaus 112×104 · hub_halle 112×100 · hub_gruppe 96×80
 */
import { Px } from '../draw';
import { Frames, MARK, MARK2, P, Ramp, WHITE, alpha, boulder, embers, glow, hash2, mix, moss, one, part, planks, rnd2, shadeArea, sparkle, texFill } from './kit';
import { roofTiles } from './gw_houses';
import {
  C, DARK, GOLD, HBLUE, I, LIT, LSTONE, MANA, PLASTER, S, SHADE, SLATE, SLATE_G, TL, W, WINE, WSTONE, Y,
  awning, brace, chimney, cornice, crest, door, eave, hangBanner, hangSign, hbeam, manaLamp, plaster, plinth, roof, stampArt, stoneWall, vbeam, wallShadow, win,
} from './hub_kit';

// ================================================================ kleine Ausstattung (auch von hub_props genutzt)
export function barrel(l: Px, x: number, y: number, w = 8, h = 10): void {
  for (let j = 0; j < h; j++) { const bulge = Math.round(Math.sin((j / (h - 1)) * Math.PI) * 1); for (let i = -bulge; i < w + bulge; i++) { const u = (i + bulge) / (w + 2 * bulge); l.set(x + i, y + j, W[u < 0.25 ? 3 : u > 0.75 ? 1 : 2]); } }
  for (const yy of [y + 1, y + h - 2]) { l.rect(x - 1, yy, w + 2, 1, I[1]); l.set(x, yy, I[3]); }
  l.rect(x, y, w, 2, W[4]); l.ell(x + w / 2, y + 1, w / 2 - 1, 1, W[1]); for (let i = 1; i < w - 1; i += 2) l.set(x + i, y + 1, W[3]);
}
export function crateBox(l: Px, x: number, y: number, w: number, h: number, seed: number, R: Ramp = P.tan): void {
  l.rect(x, y, w, h, MARK); planks(l, x, y, w, h, { ramp: R, pw: 3, seed, mark: MARK, worn: 0.4 });
  l.rect(x, y, w, 1, R[4]); l.rect(x, y + h - 1, w, 1, R[0]); l.rect(x, y, 1, h, R[3]); l.rect(x + w - 1, y, 1, h, R[1]);
  l.line(x + 1, y + h - 2, x + w - 2, y + 1, R[1]); l.line(x + 1, y + h - 3, x + w - 3, y + 1, R[3]);
}
export function sack(l: Px, cx: number, by: number, w: number, h: number, R: Ramp = P.tan): void {
  l.ball(cx, by - h / 2, w / 2, h / 2, R, 1, 4); l.rect(Math.round(cx) - 1, Math.round(by - h) - 1, 3, 2, R[1]); l.set(Math.round(cx), Math.round(by - h) - 2, R[3]);
}
function anvil(l: Px, x: number, y: number): void {
  // Holzklotz
  l.rect(x + 2, y + 6, 8, 7, W[2]); l.rect(x + 2, y + 6, 2, 7, W[3]); l.rect(x + 8, y + 6, 2, 7, W[1]); l.rect(x + 2, y + 6, 8, 1, P.tan[3]); l.px([x + 5, y + 9, x + 6, y + 11], W[1]);
  // Amboss
  l.rect(x, y + 1, 12, 3, I[2]); l.rect(x, y + 1, 12, 1, I[4]); l.rect(x - 2, y + 1, 3, 2, I[3]); l.set(x - 3, y + 1, I[2]);
  l.rect(x + 3, y + 4, 6, 2, I[1]); l.rect(x + 2, y + 5, 8, 1, I[0]); l.set(x + 4, y + 1, WHITE);
}
function dummy(l: Px, cx: number, by: number, f = 0): void {
  // Trainingspuppe: Pfahl, Querholz, Strohkörper, Sackkopf
  l.rect(cx - 1, by - 22, 2, 22, W[2]); l.set(cx - 1, by - 22, W[3]); l.rect(cx, by - 22, 1, 22, W[1]);
  l.rect(cx - 7, by - 17, 14, 2, W[2]); l.rect(cx - 7, by - 17, 14, 1, W[3]);
  const ST: Ramp = [mix(W[1], Y[0], 0.5), mix(P.tan[1], Y[1], 0.4), mix(P.tan[2], Y[2], 0.45), mix(P.tan[3], Y[3], 0.45), mix(P.tan[4], Y[4], 0.4)];
  l.ball(cx + f, by - 12, 4.5, 6, ST, 1, 4); for (let j = -5; j < 6; j += 2) l.set(cx - 3 + f, by - 12 + j, ST[1]);
  l.rect(cx - 4 + f, by - 13, 9, 1, P.red[1]); l.rect(cx - 4 + f, by - 10, 9, 1, P.red[1]);
  l.ball(cx + f, by - 21, 3.5, 3.2, P.tan, 1, 4); l.px([cx - 1 + f, by - 21, cx + 1 + f, by - 21], DARK); l.px([cx - 2 + f, by - 24, cx + 2 + f, by - 24], P.tan[1]);
  l.px([cx - 7, by - 18, cx + 6, by - 18], ST[3]); l.px([cx - 8, by - 16, cx + 7, by - 16], ST[2]);
}

// ================================================================ Schmiede
const E_ANVIL = ['.hhh......', '.hhh......', '..w.......', '..w.......', 'aaaaaaaa..', '.aaaaaaaaa', '..aaaaaa..', '...aaaa...', '..aaaaaa..'];
function schmiede(p: Px): void {
  const H = 92;
  // Kaminturm rechts (hinter dem Hauptdach)
  part(p, (l) => { chimney(l, 74, 6, 13, 82, 11, true); moss(l, (x, y) => (y > 80 && x < 80 ? 0.3 : 0), 4); });
  part(p, (l) => {
    stoneWall(l, 8, 48, 66, 38, 21, { rough: 0.75, bh: 4, bw: 7 });
    plinth(l, 7, 86, 68, 6, 22);
    cornice(l, 7, 47, 68, 2);
    // Esse: offenes Tor mit Glut
    door(l, 40, 62, 16, H - 2 - 62, { open: true, frame: WSTONE });
    win(l, 15, 60, 12, 11, { panes: 3 });
  });
  // Glut im Tor: Esse, Funken, Lichtschein
  part(p, (l) => {
    l.rect(41, 80, 14, 7, WSTONE[1]); l.rect(41, 80, 14, 1, WSTONE[3]); l.rect(41, 86, 14, 1, WSTONE[0]);
    embers(l, 43, 78, 10, 2, 1, 5);
    l.rect(44, 72, 8, 6, mix(DARK, P.fire[0], 0.4)); l.rect(45, 74, 6, 4, P.fire[1]); l.rect(46, 75, 4, 3, P.fire[2]); l.rect(47, 76, 2, 2, P.fire[3]); l.set(47, 76, P.fire[4]);
  }, false);
  shadeArea(p, (x, y) => x >= 40 && x < 56 && y >= 62 && y < 72, P.fire[1], 0.25);
  glow(p, 48, 76, 9, P.fire[2], 70, true);
  p.px([45, 69, 50, 67, 52, 70, 47, 65], P.fire[3]); p.px([49, 64, 44, 66], P.fire[4]);
  // Dach
  part(p, (l) => {
    roof(l, 16, 66, 16, 47, 9, 31);
    moss(l, (x, y) => (y > 40 && x < 18 ? 0.3 : 0), 5);
    // Lüftungsgaube mit Lamellen
    l.rect(30, 22, 14, 10, WSTONE[2]); stoneWall(l, 30, 22, 14, 10, 7, { bh: 3, bw: 5 });
    l.poly([[28, 22], [37, 15], [46, 22]], MARK2); roofTiles(l, SLATE, 15, 7, 9, 3, 4, MARK2); l.line(28, 22, 37, 15, SLATE[4]); l.line(37, 15, 46, 22, SLATE[0]);
    l.rect(33, 25, 8, 6, DARK); for (let y = 25; y < 31; y += 2) l.rect(33, y, 8, 1, W[2]); l.rect(33, 25, 8, 1, P.fire[1]);
  });
  wallShadow(p, 8, 73, 49);
  // Schild mit Amboss und Hammer
  part(p, (l) => hangSign(l, 18, 74, 14, 13, E_ANVIL, { h: I[4], w: W[3], a: I[3] }, 1, WINE));
  // Vordach über dem Amboss, Amboss, Löschfass, Waffenständer
  part(p, (l) => {
    l.poly([[56, 66], [76, 66], [80, 72], [58, 72]], MARK); planks(l, 56, 66, 26, 6, { ramp: W, pw: 3, vertical: true, seed: 5, mark: MARK }); l.rect(57, 66, 21, 1, W[4]); l.rect(58, 72, 22, 1, W[0]);
    l.rect(78, 72, 2, 18, W[1]); l.rect(78, 72, 1, 18, W[2]);
  });
  part(p, (l) => anvil(l, 62, 78));
  part(p, (l) => { barrel(l, 82, 80, 9, 11); l.rect(83, 81, 7, 1, mix(P.blue[1], DARK, 0.3)); l.set(85, 81, P.ice[3]); });
  part(p, (l) => {
    // Ständer mit drei Klingen links vor der Wand
    l.rect(2, 77, 2, 14, W[2]); l.rect(13, 77, 2, 14, W[1]); l.rect(2, 79, 13, 2, W[3]); l.rect(2, 87, 13, 2, W[2]);
    for (const [x, top] of [[5, 64], [9, 67], [12, 65]] as const) {
      l.rect(x, top, 1, 11, I[4]); l.rect(x + 1, top + 1, 1, 10, I[2]); l.set(x, top - 1, I[3]);
      l.rect(x - 1, top + 11, 4, 1, Y[2]); l.set(x - 1, top + 11, Y[4]); l.rect(x, top + 12, 2, 4, W[1]); l.set(x, top + 12, W[3]); l.rect(x, top + 16, 2, 1, Y[2]);
    }
  });
  // glühender Schein am Kaminkopf
  glow(p, 80.5, 4, 5, P.fire[2], 60);
  void H;
}

// ================================================================ Ausrüster
const E_BAG = ['...yy...', '..yyyy..', '.y.yy.y.', 'gggggggg', 'gGGGGGGg', 'gGGyyGGg', 'gGGGGGGg', '.gggggg.'];
function haendler(p: Px): void {
  const H = 90;
  part(p, (l) => {
    // Erdgeschoss: Werkstein; Obergeschoss: Fachwerk, kragt über
    stoneWall(l, 10, 58, 76, 28, 41);
    plinth(l, 9, 84, 78, 6, 42);
    door(l, 41, 62, 14, H - 2 - 62, { R: [mix(W[0], HBLUE[0], 0.3), mix(W[1], HBLUE[1], 0.5), mix(W[2], HBLUE[2], 0.5), mix(W[3], HBLUE[3], 0.45), mix(W[4], HBLUE[4], 0.4)] });
    // zwei breite Schaufenster
    win(l, 15, 64, 18, 14, { panes: 3, sill: true });
    win(l, 63, 64, 18, 14, { panes: 3, sill: true });
  });
  // Waren in den Schaufenstern: Helm, Schild | Stiefel, Bogen
  part(p, (l) => {
    l.ball(20, 72, 3, 3, I, 1, 4); l.rect(17, 72, 6, 3, I[2]); l.rect(19, 73, 2, 2, DARK); l.set(19, 70, WHITE);
    l.poly([[26, 69], [31, 69], [31, 73], [28.5, 77], [26, 73]], HBLUE[2]); l.rect(28, 69, 1, 8, Y[3]); l.rect(26, 71, 6, 1, Y[3]);
    l.rect(66, 72, 3, 5, W[2]); l.rect(66, 76, 5, 2, W[2]); l.rect(70, 72, 3, 5, W[1]); l.rect(70, 76, 5, 2, W[1]);
    for (let j = 0; j < 12; j++) l.set(77 + Math.round(Math.sin((j / 11) * Math.PI) * 2), 66 + j, W[3]); l.line(77, 66, 77, 77, C[3]);
  }, false);
  part(p, (l) => {
    // Obergeschoss
    plaster(l, 6, 30, 84, 27, 43);
    hbeam(l, 5, 30, 86); hbeam(l, 5, 54, 86, 4);
    for (const x of [6, 26, 46, 66, 86]) vbeam(l, x, 30, 25);
    brace(l, 9, 53, 14, 44); brace(l, 23, 53, 18, 44); brace(l, 69, 53, 74, 44); brace(l, 83, 53, 78, 44);
    win(l, 30, 36, 12, 11, { panes: 2, box: true, curtain: 1 });
    win(l, 52, 36, 12, 11, { panes: 2, box: true, curtain: 1 });
    // Balkenköpfe der Auskragung
    for (let x = 8; x < 90; x += 8) { l.rect(x, 57, 3, 2, W[1]); l.set(x, 57, W[3]); }
  });
  // Markise über der ganzen Front
  part(p, (l) => awning(l, 10, 59, 76, 4, HBLUE, [C[0], C[1], C[2], C[3], C[4]], 6));
  // Dach mit Zwerchgiebel
  part(p, (l) => {
    roof(l, 14, 82, 8, 30, 8, 47);
    l.poly([[48, 2], [66, 30], [30, 30]], MARK2);
    texFill(l, MARK2, (x, y) => { const n = rnd2(x, y, 3); return n < 0.05 ? PLASTER[2] : n > 0.93 ? PLASTER[4] : PLASTER[3]; });
    l.line(48, 2, 29, 31, W[2], 2); l.line(48, 2, 67, 31, W[0], 2); l.line(48, 1, 28, 31, W[3]); vbeam(l, 47, 12, 18, 2);
    win(l, 42, 17, 4, 7, { panes: 1, sill: false }); win(l, 51, 17, 4, 7, { panes: 1, sill: false });
    l.set(48, 0, Y[3]); l.set(48, 1, Y[2]);
  });
  wallShadow(p, 10, 85, 63, 3);
  // Aushänger: Geldbeutel
  part(p, (l) => hangSign(l, 74, 41, 12, 11, E_BAG, { y: Y[4], g: W[3], G: P.tan[3] }, -1, W));
  // Rüstständer links, Fass mit Speeren rechts
  part(p, (l) => {
    l.rect(4, 87, 9, 2, W[2]); l.rect(7, 70, 2, 17, W[2]);
    l.poly([[3, 72], [13, 72], [12, 82], [4, 82]], I[2]); l.poly([[3, 72], [7, 72], [6, 82], [4, 82]], I[3]); l.rect(4, 76, 9, 1, I[1]); l.rect(7, 73, 2, 8, Y[3]);
    l.ball(8, 68, 3.2, 3, I, 1, 4); l.set(7, 67, WHITE);
  });
  part(p, (l) => { for (const [x, top] of [[86, 64], [89, 67], [92, 65]] as const) { l.rect(x, top, 1, 22, W[3]); l.poly([[x - 1, top], [x + 0.5, top - 4], [x + 2, top]], I[4]); } barrel(l, 84, 79, 10, 11); });
  void H;
}

// ================================================================ Alchemie (Rundturm)
function alchemie(p: Px): void {
  const H = 104, cx = 44, rx = 26;
  // Turmkörper: gekrümmtes Quaderwerk
  part(p, (l) => {
    for (let y = 46; y < H - 6; y++) for (let x = cx - rx; x < cx + rx; x++) l.set(x, y, MARK);
    texFill(l, MARK, (x, y) => {
      const u = (x + 0.5 - cx) / rx, a = Math.asin(Math.max(-1, Math.min(1, u))), s = a * 9, row = Math.floor((y - 46) / 5), m = (y - 46) % 5;
      const col = Math.floor(s + (row & 1) * 0.5), hb = hash2(col, row, 7), base = 2 + ((hb & 3) === 0 ? 1 : (hb & 3) === 1 ? -1 : 0);
      let t = base; if (m === 4 || Math.abs(s + (row & 1) * 0.5 - Math.round(s + (row & 1) * 0.5)) < 0.06 * (1 + Math.abs(u) * 3)) t = 0; else if (m === 0) t = base + 1;
      const lightK = -u * 0.9 + 0.2; t += lightK > 0.55 ? 1 : lightK < -0.45 ? -1 : 0; if (u > 0.85) t -= 1;
      return WSTONE[Math.max(0, Math.min(4, t))];
    });
    // Sockelring und Gesimsring
    for (let x = cx - rx - 1; x <= cx + rx; x++) { const u = (x + 0.5 - cx) / rx, t = u < -0.4 ? 4 : u > 0.6 ? 1 : 3; l.rect(x, H - 6, 1, 5, LSTONE[t - 1 < 0 ? 0 : t - 1]); l.set(x, H - 6, LSTONE[t]); l.set(x, H - 2, LSTONE[0]); l.set(x, 46, LSTONE[t]); l.set(x, 47, LSTONE[t - 1]); l.set(x, 48, LSTONE[0]); l.set(x, 74, LSTONE[t]); l.set(x, 75, LSTONE[0]); }
    moss(l, (x, y) => (y > H - 12 && (x < cx - rx + 9 || x > cx + rx - 8) ? 0.45 : 0), 3);
    door(l, cx - 7, 78, 14, H - 2 - 78, { R: [mix(W[0], P.violet[0], 0.3), mix(W[1], P.violet[1], 0.45), mix(W[2], P.violet[2], 0.4), mix(W[3], P.violet[3], 0.4), mix(W[4], P.violet[4], 0.35)] });
    // Rundbogenfenster: oben ein großes, unten zwei kleine
    win(l, cx - 6, 52, 12, 16, { arch: true, panes: 2 });
    win(l, cx - 22, 80, 7, 10, { arch: true, panes: 1, lit: true });
    win(l, cx + 15, 80, 7, 10, { arch: true, panes: 1, lit: false });
  });
  // Flaschen auf den Simsen
  for (const [x, y, c] of [[cx - 5, 66, P.red], [cx - 2, 66, TL], [cx + 1, 66, P.violet], [cx + 4, 66, Y], [cx - 21, 88, P.green], [cx - 18, 88, P.pink]] as const) { p.rect(x, y - 3, 2, 3, c[3]); p.set(x, y - 3, c[4]); p.set(x, y - 4, P.ice[3]); p.set(x + 1, y - 1, c[1]); }
  // Kegeldach aus Grünschiefer mit Spitze
  part(p, (l) => {
    for (let y = 6; y <= 47; y++) { const t = (y - 6) / 41, hw = 3 + t * (rx + 6); for (let x = Math.floor(cx - hw); x < cx + hw; x++) l.set(x, y, MARK); }
    texFill(l, MARK, (x, y) => {
      const t = (y - 6) / 41, hw = 3 + t * (rx + 6), u = (x + 0.5 - cx) / hw, row = Math.floor((y - 6) / 4), m = (y - 6) % 4;
      const col = Math.floor((Math.asin(Math.max(-1, Math.min(1, u))) * (4 + t * 9)) + (row & 1) * 0.5), hb = hash2(col, row, 13);
      let k = 2 + ((hb & 7) < 2 ? 1 : (hb & 7) > 5 ? -1 : 0); if (m === 3) k = 1; else if (m === 0) k += 1;
      k += u < -0.35 ? 1 : u > 0.5 ? -1 : 0; if (u > 0.85) k--;
      return SLATE_G[Math.max(0, Math.min(4, k))];
    });
    eave(l, cx - rx - 6, cx + rx + 5, 46, SLATE_G, 4);
    // Gaube mit Rundfenster
    l.rect(cx - 5, 24, 10, 9, LSTONE[2]); l.rect(cx - 5, 24, 10, 1, LSTONE[4]); l.ell(cx, 28.5, 3, 3, W[0]); l.ell(cx, 28.5, 2.2, 2.2, LIT[3]); l.set(cx - 1, 27, LIT[4]); l.rect(cx, 26, 1, 5, W[1]);
    l.poly([[cx - 7, 25], [cx, 18], [cx + 7, 25]], SLATE_G[3]); l.line(cx - 7, 25, cx, 18, SLATE_G[4]); l.line(cx, 18, cx + 7, 25, SLATE_G[1]);
    // Spitze mit Mondsichel und Kugel
    l.rect(cx - 1, 0, 2, 7, I[2]); l.set(cx - 1, 0, I[4]); l.ell(cx, 2.5, 2, 2, Y[3]); l.set(cx - 1, 2, Y[4]);
    // Kupferrohr
    l.line(cx + 16, 30, cx + 23, 18, mix(P.fire[1], W[2], 0.4), 3); l.line(cx + 16, 30, cx + 23, 18, mix(P.fire[2], P.tan[3], 0.4)); l.rect(cx + 21, 15, 5, 3, mix(P.fire[1], W[2], 0.4)); l.rect(cx + 21, 15, 5, 1, mix(P.fire[3], P.tan[4], 0.5));
  });
  shadeArea(p, (x, y) => y >= 49 && y < 53 && x > cx - rx && x < cx + rx, SHADE, 0.3);
  // Schild: Kolben
  const E_FLASK = ['..ww..', '..ww..', '..ww..', '.pppp.', 'pppPpp', 'ppPppp', 'pppppp', '.pppp.'];
  part(p, (l) => hangSign(l, 7, 56, 10, 12, E_FLASK, { w: P.ice[3], p: P.violet[3], P: WHITE }, 1, W));
  // Regal mit Gläsern und Kessel vor dem Turm
  part(p, (l) => {
    l.rect(64, 86, 2, 12, W[2]); l.rect(80, 86, 2, 12, W[1]); l.rect(64, 88, 18, 2, W[3]); l.rect(64, 94, 18, 2, W[2]);
    for (const [x, y, c] of [[67, 83, P.green], [71, 84, TL], [75, 83, P.red], [78, 85, Y], [68, 90, P.violet], [73, 91, P.blue]] as const) { l.rect(x, y, 3, 88 - y + (y > 88 ? 6 : 0) - (y > 88 ? 0 : 0), c[2]); l.rect(x, y, 1, 3, c[4]); l.rect(x, y - 1, 3, 1, P.ice[3]); }
  });
  part(p, (l) => { l.ball(12, 97, 7, 5, P.ash, 1, 4); l.ell(12, 93, 6, 1.6, P.ash[3]); l.ell(12, 93.4, 5, 1.1, P.green[3]); l.set(10, 93, P.green[4]); l.px([6, 101, 18, 101], P.ash[1]); });
  for (const [x, y] of [[11, 90], [14, 88], [12, 86]] as const) p.blend(x, y, alpha(P.green[4], 190));
  // farbiger Dampf aus dem Kupferrohr
  const SM = [mix(P.violet[3], WHITE, 0.3), mix(TL[3], WHITE, 0.3), mix(P.pink[3], WHITE, 0.35)];
  for (let j = 0; j < 9; j++) {
    const t = j / 8, x = 68 + t * 12 + Math.sin(t * 7) * 2.2, y = 12 - t * 12, r = 1.6 + t * 2.4, k = j % 3;
    for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++) { const d = Math.hypot(xx + 0.5 - x, yy + 0.5 - y) / r; if (d < 1) p.blend(xx, yy, alpha(d < 0.5 ? SM[k] : mix(SM[k], P.violet[2], 0.35), Math.round((d < 0.5 ? 200 : 120) * (1 - t * 0.55)))); }
  }

  void H;
}

// ================================================================ Fähigkeitenmeister (Halle)
function meister(p: Px): void {
  const H = 96, cx = 52;
  part(p, (l) => {
    stoneWall(l, 12, 48, 80, 42, 61, { bh: 6, bw: 11, rough: 0.2 });
    plinth(l, 11, 90, 82, 6, 62);
    // Lisenen
    for (const x of [12, 30, 70, 88]) { l.rect(x, 48, 4, 42, LSTONE[2]); l.rect(x, 48, 1, 42, LSTONE[4]); l.rect(x + 3, 48, 1, 42, LSTONE[0]); for (let y = 52; y < 90; y += 6) l.rect(x, y, 4, 1, LSTONE[1]); }
    door(l, cx - 8, 64, 16, H - 2 - 64, { double: true, R: [mix(W[0], P.red[0], 0.3), mix(W[1], P.red[1], 0.4), mix(W[2], P.red[1], 0.35), mix(W[3], P.red[2], 0.3), mix(W[4], P.red[3], 0.3)] });
    win(l, 18, 58, 8, 14, { arch: true, panes: 1 }); win(l, 78, 58, 8, 14, { arch: true, panes: 1 });
    cornice(l, 10, 46, 84, 3);
  });
  // Banner an beiden Seiten der Tür
  part(p, (l) => { hangBanner(l, 34, 52, 8, 26, HBLUE); hangBanner(l, 62, 52, 8, 26, HBLUE); });
  // Giebelfront mit Fachwerk und gekreuzten Klingen
  part(p, (l) => {
    roof(l, 22, 82, 10, 46, 12, 71);
    l.poly([[cx, 4], [cx + 30, 45], [cx - 30, 45]], MARK2);
    texFill(l, MARK2, (x, y) => { const n = rnd2(x, y, 5); return n < 0.05 ? PLASTER[2] : n > 0.93 ? PLASTER[4] : PLASTER[3]; });
    hbeam(l, cx - 26, 40, 52, 3); vbeam(l, cx - 1, 6, 34, 3); brace(l, cx - 20, 40, cx - 4, 18); brace(l, cx + 19, 40, cx + 3, 18);
    l.line(cx, 3, cx - 32, 46, W[3], 2); l.line(cx, 3, cx + 32, 46, W[0], 2); l.line(cx, 2, cx - 33, 46, W[2]); l.line(cx + 1, 3, cx + 33, 46, W[1]);
    l.rect(cx - 1, 0, 3, 3, Y[3]); l.set(cx - 1, 0, Y[4]);
    // Rundscheibe mit gekreuzten Klingen
    l.ell(cx + 0.5, 28.5, 8, 8, W[0]); l.ell(cx + 0.5, 28.5, 7, 7, HBLUE[1]); l.ell(cx + 0.5, 28.5, 6, 6, HBLUE[2]);
    l.line(cx - 4, 33, cx + 4, 23, I[4]); l.line(cx + 5, 33, cx - 3, 23, I[3]); l.line(cx - 4, 31, cx - 2, 33, Y[3]); l.line(cx + 3, 33, cx + 5, 31, Y[3]); l.set(cx + 0.5, 28, Y[4]);
  });
  wallShadow(p, 12, 91, 49);
  // Trainingspuppen
  part(p, (l) => dummy(l, 6, 95));
  part(p, (l) => dummy(l, 98, 95, 1));
  // Zielscheibe an der Wand
  part(p, (l) => { for (const [r, c] of [[5, P.cream[3]], [4, P.red[2]], [3, P.cream[3]], [2, P.red[2]], [1, Y[3]]] as const) l.ell(21.5, 82.5, r, r, c); l.line(21, 81, 25, 79, W[3]); });
  void H;
}

// ================================================================ Lagerhaus
function lager(p: Px): void {
  const H = 88, cx = 52;
  part(p, (l) => {
    plinth(l, 5, 82, 94, 6, 81);
    l.rect(6, 40, 92, 42, MARK); planks(l, 6, 40, 92, 42, { ramp: W, pw: 4, vertical: true, seed: 82, mark: MARK, worn: 0.6 });
    shadeArea(l, (x, y) => y >= 40 && y < 82, P.tan[2], 0.12);
    hbeam(l, 5, 40, 94, 3); hbeam(l, 5, 60, 94, 3);
    for (const x of [5, 30, 72, 96]) vbeam(l, x, 40, 42, 3);
    // großes Doppeltor mit Andreaskreuzen
    l.rect(cx - 15, 54, 30, 32, LSTONE[1]); l.rect(cx - 15, 54, 30, 2, LSTONE[3]);
    l.rect(cx - 13, 56, 26, 30, MARK2); planks(l, cx - 13, 56, 26, 30, { ramp: P.tan, pw: 4, vertical: true, seed: 84, mark: MARK2 });
    for (const sx of [cx - 13, cx]) { l.rect(sx, 56, 13, 2, P.tan[1]); l.rect(sx, 84, 13, 2, P.tan[1]); l.line(sx + 1, 58, sx + 11, 83, P.tan[1], 2); l.line(sx + 11, 58, sx + 1, 83, P.tan[1], 2); l.line(sx + 1, 58, sx + 11, 83, P.tan[3]); }
    l.rect(cx, 56, 1, 30, P.tan[0]); l.rect(cx - 3, 70, 2, 3, I[3]); l.rect(cx + 2, 70, 2, 3, I[3]);
    l.rect(cx - 17, 86, 34, 2, LSTONE[3]); l.rect(cx - 17, 86, 34, 1, LSTONE[4]);
    win(l, 13, 48, 10, 8, { panes: 2, lit: false }); win(l, 80, 48, 10, 8, { panes: 2, lit: false });
  });
  // Dach mit Ladeluke und Kranbalken
  part(p, (l) => {
    roof(l, 14, 90, 12, 40, 9, 85);
    l.rect(cx - 7, 16, 14, 18, W[0]); l.rect(cx - 6, 17, 12, 16, MARK); planks(l, cx - 6, 17, 12, 16, { ramp: P.tan, pw: 3, vertical: true, seed: 86, mark: MARK });
    l.poly([[cx - 10, 17], [cx, 8], [cx + 10, 17]], SLATE[3]); l.line(cx - 10, 17, cx, 8, SLATE[4]); l.line(cx, 8, cx + 10, 17, SLATE[1]); l.rect(cx - 9, 17, 18, 1, SLATE[0]);
    l.rect(cx - 2, 9, 4, 4, W[2]); l.rect(cx - 2, 9, 4, 1, W[3]); // Balkenkopf
  });
  // Seil und hängende Kiste
  for (let y = 13; y < 26; y++) p.set(cx + 1, y, P.tan[y % 2 ? 2 : 3]);
  part(p, (l) => { crateBox(l, cx - 3, 26, 9, 8, 7); });
  wallShadow(p, 6, 97, 43);
  // Kisten, Säcke, Fässer an den Seiten
  part(p, (l) => { crateBox(l, 2, 72, 14, 12, 3); crateBox(l, 14, 76, 12, 10, 4); crateBox(l, 5, 62, 11, 10, 5, W); });
  part(p, (l) => { sack(l, 22, 76, 7, 7); sack(l, 27, 86, 8, 8, C); });
  part(p, (l) => { barrel(l, 80, 75, 9, 11); barrel(l, 90, 76, 9, 11); crateBox(l, 84, 64, 12, 11, 9); });
  part(p, (l) => { sack(l, 74, 87, 8, 7); });
  // Hängeschild: Kiste
  const E_CRATE = ['gggggggg', 'gGGgGGGg', 'gGgGgGGg', 'gGGgGgGg', 'gGgGGGgg', 'gggggggg'];
  part(p, (l) => hangSign(l, 34, 44, 12, 10, E_CRATE, { g: P.tan[1], G: P.tan[3] }, 1));
  void H;
}

// ================================================================ Gasthaus „Zum Letzten Licht“
const E_LANTERN = ['...gg...', '..gggg..', '.g....g.', '.g.yy.g.', '.g.yY.g.', '.g.yy.g.', '.g....g.', '..gggg..'];
function gasthaus(p: Px): void {
  const H = 104, cx = 56;
  part(p, (l) => { chimney(l, 86, 4, 10, 30, 91); });
  part(p, (l) => {
    // Erdgeschoss Werkstein, Obergeschoss Fachwerk
    stoneWall(l, 8, 70, 96, 28, 92);
    plinth(l, 7, 98, 98, 6, 93);
    door(l, cx - 8, 74, 16, H - 2 - 74, { double: true });
    for (const x of [14, 30, 74, 90]) win(l, x, 76, 10, 12, { panes: 2, curtain: 1 });
    plaster(l, 6, 40, 100, 29, 94);
    hbeam(l, 5, 40, 102); hbeam(l, 5, 66, 102, 4);
    for (const x of [6, 30, 54, 79, 103]) vbeam(l, x, 40, 27);
    for (const [a, b] of [[10, 26], [34, 50], [58, 75], [83, 99]] as const) { brace(l, a, 65, a + 5, 57); brace(l, b, 65, b - 5, 57); }
    for (const x of [13, 37, 61, 86]) win(l, x, 45, 11, 10, { panes: 2, box: true, curtain: 1 });
    for (let x = 8; x < 104; x += 8) { l.rect(x, 69, 3, 2, W[1]); l.set(x, 69, W[3]); }
  });
  // Vordach über der Tür auf zwei Konsolen
  part(p, (l) => {
    l.poly([[cx - 14, 66], [cx + 14, 66], [cx + 16, 72], [cx - 16, 72]], MARK); roofTiles(l, SLATE, 66, 6, 95, 3, 4); l.rect(cx - 16, 72, 32, 1, W[0]);
    l.line(cx - 13, 73, cx - 10, 76, W[2], 2); l.line(cx + 12, 73, cx + 9, 76, W[1], 2);
  });
  // Dach mit zwei Gauben
  part(p, (l) => {
    roof(l, 14, 98, 14, 40, 10, 96);
    for (const gx of [30, 82]) {
      l.rect(gx - 6, 20, 12, 12, PLASTER[3]); vbeam(l, gx - 6, 20, 12, 2); vbeam(l, gx + 4, 20, 12, 2);
      win(l, gx - 3, 23, 6, 7, { panes: 2, sill: false });
      l.poly([[gx - 9, 21], [gx, 12], [gx + 9, 21]], MARK2); roofTiles(l, SLATE, 12, 9, gx, 3, 4, MARK2); l.line(gx - 9, 21, gx, 12, SLATE[4]); l.line(gx, 12, gx + 9, 21, SLATE[0]);
    }
    // Firstlaterne (das „Letzte Licht“)
    l.rect(cx - 3, 4, 6, 8, I[1]); l.rect(cx - 2, 5, 4, 6, LIT[3]); l.rect(cx - 1, 6, 2, 4, LIT[4]); l.set(cx - 2, 5, WHITE); l.poly([[cx - 4, 4], [cx, 0], [cx + 4, 4]], I[2]); l.set(cx, 0, Y[4]);
  });
  glow(p, cx, 8, 9, LIT[3], 60);
  wallShadow(p, 8, 103, 43); wallShadow(p, 8, 103, 71, 3);
  // großes Schild am Ausleger: Laterne
  part(p, (l) => hangSign(l, 14, 58, 14, 12, E_LANTERN, { g: I[1], y: LIT[3], Y: WHITE }, 1, WINE));
  // Bank und Fässer vor dem Haus
  part(p, (l) => { barrel(l, 96, 88, 9, 11); barrel(l, 3, 89, 8, 10); });
  part(p, (l) => { l.rect(70, 94, 18, 2, W[3]); l.rect(70, 94, 18, 1, W[4]); l.rect(71, 96, 2, 5, W[1]); l.rect(85, 96, 2, 5, W[1]); l.rect(70, 89, 18, 2, W[2]); l.rect(71, 91, 2, 3, W[1]); l.rect(85, 91, 2, 3, W[1]); });
  part(p, (l) => { l.rect(24, 92, 12, 2, W[3]); l.rect(24, 92, 12, 1, W[4]); l.rect(25, 94, 2, 6, W[1]); l.rect(33, 94, 2, 6, W[1]); l.rect(28, 88, 3, 4, P.tan[3]); l.rect(28, 88, 3, 1, C[4]); });
  manaLamp(p, cx - 13, 76); manaLamp(p, cx + 12, 76);
  void H;
}

// ================================================================ Trophäenhalle
function halle(p: Px): void {
  const H = 100, cx = 56, A = LSTONE;
  part(p, (l) => {
    // Hallenkörper hinter dem Portikus
    stoneWall(l, 8, 40, 96, 52, 111, { R: WSTONE, bh: 6, bw: 12, rough: 0.15 });
    door(l, cx - 9, 62, 18, H - 2 - 62 - 6, { double: true, R: [mix(W[0], DARK, 0.2), W[1], W[2], W[3], W[4]] });
    win(l, 14, 56, 8, 18, { arch: true, panes: 1 }); win(l, 90, 56, 8, 18, { arch: true, panes: 1 });
  });
  // Stufen
  part(p, (l) => { for (let k = 0; k < 3; k++) { const y = H - 8 + k * 2 + (k === 2 ? 0 : 0), x0 = 16 - k * 4, w = 80 + k * 8; l.rect(x0, y + 2, w, 2, A[3]); l.rect(x0, y + 2, w, 1, A[4]); l.rect(x0, y + 3, w, 1, A[1]); } l.rect(6, H - 2, 100, 2, A[2]); l.rect(6, H - 2, 100, 1, A[4]); });
  // Säulen
  part(p, (l) => {
    for (const x of [18, 36, 70, 88]) {
      l.rect(x - 1, 86, 9, 3, A[3]); l.rect(x - 1, 86, 9, 1, A[4]); l.rect(x - 1, 88, 9, 1, A[1]);
      for (let y = 42; y < 86; y++) for (let i = 0; i < 7; i++) l.set(x + i, y, A[i === 0 ? 4 : i === 1 ? 3 : i === 5 ? 1 : i === 6 ? 0 : (i === 3 ? 2 : 3)]);
      for (let y = 44; y < 86; y++) l.set(x + 3, y, A[1]);
      l.rect(x - 1, 39, 9, 3, A[3]); l.rect(x - 1, 39, 9, 1, A[4]); l.rect(x - 1, 41, 9, 1, A[1]); l.px([x - 1, 40, x + 7, 40], Y[3]);
    }
  });
  // Gebälk und Giebel mit Wappen
  part(p, (l) => {
    l.rect(10, 32, 92, 7, A[2]); l.rect(10, 32, 92, 1, A[4]); l.rect(10, 38, 92, 1, A[0]); l.rect(10, 35, 92, 1, Y[2]);
    for (let x = 14; x < 100; x += 8) l.px([x, 33, x + 1, 33], A[3]);
    // Trophäenschilde im Fries
    for (const [x, c] of [[22, WINE], [40, HBLUE], [72, P.forest], [90, WINE]] as const) { l.poly([[x - 3, 32], [x + 3, 32], [x + 3, 35], [x, 38], [x - 3, 35]], c[2]); l.rect(x, 32, 1, 6, Y[3]); }
    l.poly([[cx, 8], [104, 31], [8, 31]], MARK);
    texFill(l, MARK, (x, y) => { const n = rnd2(x, y, 8), d = Math.abs(x + 0.5 - cx) - (y - 8) * (48 / 23); return d > -3 ? (x < cx ? A[4] : A[1]) : n < 0.06 ? A[1] : A[3]; });
    l.rect(8, 31, 96, 1, A[0]);
    crest(l, cx - 4, 14);
    for (const sx of [-1, 1]) { l.line(cx + sx * 7, 22, cx + sx * 14, 26, Y[3]); l.line(cx + sx * 7, 23, cx + sx * 12, 27, Y[2]); }
  });
  // Dach hinter dem Giebel
  part(p, (l) => { l.poly([[20, 6], [92, 6], [104, 30], [8, 30]], MARK2); roofTiles(l, SLATE, 6, 24, 113, 4, 5, MARK2); for (let x = 20; x <= 92; x++) l.set(x, 5, SLATE[4]); }, true);
  // Giebel erneut über das Dach (Dach liegt dahinter)
  part(p, (l) => {
    l.poly([[cx, 8], [104, 31], [8, 31]], MARK);
    texFill(l, MARK, (x, y) => { const n = rnd2(x, y, 8), d = Math.abs(x + 0.5 - cx) - (y - 8) * (48 / 23); return d > -3 ? (x < cx ? A[4] : A[1]) : n < 0.06 ? A[1] : A[3]; });
    crest(l, cx - 4, 15);
    for (const sx of [-1, 1]) { l.line(cx + sx * 7, 23, cx + sx * 16, 28, Y[3]); }
  });
  // Giebelbekrönung: goldene Schale mit Manaflamme
  part(p, (l) => {
    l.rect(cx - 3, 6, 6, 3, A[2]); l.rect(cx - 3, 6, 6, 1, A[4]); l.rect(cx - 3, 4, 6, 2, Y[2]); l.rect(cx - 3, 4, 6, 1, Y[4]); l.rect(cx - 1, 3, 2, 1, Y[1]);
  });
  p.px([cx - 1, 2, cx, 2, cx, 1, cx - 1, 0], MANA[3]); p.set(cx - 1, 1, MANA[4]); p.set(cx, 0, WHITE); glow(p, cx, 2, 5, MANA[3], 60);
  wallShadow(p, 8, 103, 42, 6);
  // Hüterstatue links vor der Halle: Kapuzenfigur aus hellem Stein hält eine goldene Flammenschale empor
  part(p, (l) => {
    l.rect(0, 84, 15, 12, A[2]); l.rect(0, 84, 15, 1, A[4]); l.rect(0, 95, 15, 1, A[0]); l.rect(13, 85, 2, 10, A[1]); l.rect(0, 85, 1, 10, A[3]);
    l.rect(3, 88, 9, 4, Y[2]); l.rect(3, 88, 9, 1, Y[4]); l.rect(4, 89, 7, 2, Y[1]); l.px([5, 89, 7, 89, 9, 89], Y[3]);
    stampArt(l, 1, 61, [
      '...........ff.',
      '..........fFFf',
      '..........fFf.',
      '.........gGGGg',
      '..........gg..',
      '.........aa...',
      '...ccc...aa...',
      '..cCCCc..aa...',
      '..cCdCc.aa....',
      '..cCddCaa.....',
      '...cCCaa......',
      '..aAbAAAa.....',
      '.aAbAAAAAa....',
      '.aAbAAAAAa....',
      '.aAbAAAAAa....',
      '..AbAAAAa.....',
      '..AbAAgAa.....',
      '..AbAAAAAa....',
      '..AbAAAAAa....',
      '.AAbAAAAAAa...',
      '.AAbAAAAAAa...',
      '.AbAAAAAAAAa..',
      'AAbAAAAAAAAa..',
    ], { A: A[3], a: A[1], b: A[4], c: A[2], C: A[3], d: A[0], f: P.fire[3], F: mix(Y[4], WHITE, 0.5), g: Y[2], G: Y[4] });
  });
  glow(p, 13, 62, 6, Y[4], 70);
  void H;
}

// ================================================================ Gruppenpavillon
const E_GROUP = ['.a..b..c.', 'aaa.b.ccc', '.a.bbb.c.', 'aaa.b.ccc', 'a.abbbc.c'];
function gruppe(p: Px): void {
  const H = 80, cx = 48;
  // Rückwand: Anschlagtafel mit Zetteln
  part(p, (l) => {
    l.rect(16, 34, 64, 30, MARK); planks(l, 16, 34, 64, 30, { ramp: W, pw: 4, seed: 121, mark: MARK, worn: 0.4 });
    l.rect(18, 37, 60, 24, mix(P.tan[1], W[1], 0.4)); l.rect(18, 37, 60, 1, P.tan[0]);
    const papers = [[20, 39, 9, 10], [31, 40, 8, 8], [42, 38, 11, 11], [55, 40, 8, 9], [66, 39, 9, 10], [24, 51, 8, 8], [36, 50, 9, 9], [49, 51, 9, 8], [61, 50, 10, 9]];
    papers.forEach(([x, y, w, h], k) => {
      const c = k === 2 ? mix(C[4], Y[4], 0.4) : k % 3 === 1 ? C[3] : C[4];
      l.rect(x, y, w, h, c); l.rect(x, y + h - 1, w, 1, C[1]); l.rect(x + w - 1, y, 1, h, C[2]);
      for (let yy = y + 2; yy < y + h - 2; yy += 2) l.rect(x + 1, yy, w - 3 - (hash2(k, yy, 3) & 1) * 2, 1, C[0]);
      l.set(x + (w >> 1), y, k % 2 ? P.red[3] : Y[3]);
    });
  });
  // Pfosten
  part(p, (l) => { for (const x of [8, 84]) { l.rect(x, 20, 4, 58, W[2]); l.rect(x, 20, 1, 58, W[3]); l.rect(x + 3, 20, 1, 58, W[0]); l.rect(x - 1, 74, 6, 4, WSTONE[2]); l.rect(x - 1, 74, 6, 1, WSTONE[4]); } });
  // Tisch mit Karte in der Mitte
  part(p, (l) => {
    l.rect(30, 62, 36, 5, W[3]); l.rect(30, 62, 36, 1, W[4]); l.rect(30, 66, 36, 1, W[1]); l.rect(32, 67, 3, 8, W[1]); l.rect(61, 67, 3, 8, W[1]);
    l.rect(37, 61, 18, 3, C[3]); l.rect(37, 61, 18, 1, C[4]); l.px([40, 62, 44, 62, 49, 63, 52, 62], P.red[2]); l.line(40, 62, 52, 62, P.tan[1]);
  });
  // Bänke links/rechts
  part(p, (l) => { for (const x of [16, 68]) { l.rect(x, 70, 14, 2, W[3]); l.rect(x, 70, 14, 1, W[4]); l.rect(x + 1, 72, 2, 5, W[1]); l.rect(x + 11, 72, 2, 5, W[1]); } });
  // Pavillondach: gestreifte Plane auf Schieferkrone, Wimpel
  part(p, (l) => {
    l.poly([[cx, 2], [cx + 46, 22], [cx - 46, 22]], MARK);
    texFill(l, MARK, (x, y) => { const s = Math.floor((x - cx) / (2 + (y - 2) * 0.22) + 100) & 1, R = s ? HBLUE : PLASTER; const k = (y - 2) / 20; return R[k < 0.3 ? 4 : k < 0.75 ? 3 : 2]; });
    for (let x = cx - 46; x <= cx + 46; x += 6) { const R = (Math.floor((x - cx) / 6 + 100) & 1) ? HBLUE : PLASTER; l.rect(x, 22, 6, 2, R[2]); l.rect(x + 1, 24, 4, 1, R[1]); l.set(x + 3, 25, R[1]); }
    l.rect(cx - 46, 22, 92, 1, Y[3]);
    l.rect(cx - 1, 0, 2, 3, W[3]); l.poly([[cx + 1, 0], [cx + 8, 2], [cx + 1, 4]], WINE[3]);
  });
  // Wimpelkette zwischen den Pfosten
  for (let x = 12; x <= 84; x++) { const y = 28 + Math.round(Math.sin(((x - 12) / 72) * Math.PI) * 4); p.set(x, y, P.tan[2]); if ((x - 12) % 6 === 2) { const c = [WINE[3], Y[3], HBLUE[3], P.green[3]][((x - 12) / 6) % 4 | 0]; p.px([x, y + 1, x + 1, y + 1, x + 2, y + 1, x, y + 2, x + 1, y + 2, x, y + 3], c); } }
  // Gruppenzeichen: drei Figuren auf blauem Schild über der Tafel
  part(p, (l) => { l.rect(cx - 7, 27, 14, 8, HBLUE[2]); l.rect(cx - 7, 27, 14, 1, HBLUE[4]); l.rect(cx - 7, 34, 14, 1, HBLUE[0]); stampArt(l, cx - 4, 29, E_GROUP, { a: Y[4], b: WHITE, c: Y[4] }); });
  manaLamp(p, 13, 34); manaLamp(p, 83, 34);
  void H;
}

export function hubBuildings(out: Frames): void {
  one(out, 'hub_schmiede', 96, 92, schmiede);
  one(out, 'hub_haendler', 96, 90, haendler);
  one(out, 'hub_alchemie', 88, 104, alchemie);
  one(out, 'hub_meister', 104, 96, meister);
  one(out, 'hub_lager', 104, 88, lager);
  one(out, 'hub_gasthaus', 112, 104, gasthaus);
  one(out, 'hub_halle', 112, 100, halle);
  one(out, 'hub_gruppe', 96, 80, gruppe);
}
void boulder; void GOLD; void MANA; void S; void TL; void C;
