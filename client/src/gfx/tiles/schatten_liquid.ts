/**
 * Schattenreich – die Leere: 8 Frames à 64×64, nahtlos kachelbar, als Schleife.
 * Tiefer Raum: fast schwarzes Violett, ein blasser Nebelstreif, ferne Sterne (treiben langsam, funkeln) und nahe Sterne
 * (treiben schneller, blitzen als Kreuz auf), dazu eine Sternschnuppe je Durchlauf.
 * Jeder Stern lebt genau einen Durchlauf: einblenden → treiben → ausblenden → am Startpunkt neu; so schließt die Schleife,
 * obwohl alles in eine Richtung zieht. Die Zeit geht sonst nur als Phase in periodische Funktionen ein.
 */
import { P, WHITE, hash2, mix } from '../palette';
import { Px } from '../draw';
import { VOIDC } from './schatten_pal';

const N = 64, FR = 8, TAU = Math.PI * 2;
const NEB1 = mix(VOIDC, P.violet[1], 0.22), NEB2 = mix(VOIDC, P.pink[1], 0.22), NEB3 = mix(VOIDC, P.pink[1], 0.3), NEBC = mix(VOIDC, P.blue[1], 0.22);
const FAR = [0, mix(VOIDC, P.ice[1], 0.45), mix(VOIDC, P.ice[2], 0.7), P.ice[3]];
const NEAR = [0, mix(VOIDC, P.ice[2], 0.55), P.ice[3], WHITE];
const ARM = mix(VOIDC, P.ice[2], 0.6), PINKS = mix(P.pink[4], WHITE, 0.3);

export function schattenLiquid(): Px[] {
  const out: Px[] = [];
  const wrap = (v: number): number => ((Math.round(v) % N) + N) % N;
  for (let f = 0; f < FR; f++) {
    const p = new Px(N, N), ph = (f / FR) * TAU;
    const put = (x: number, y: number, col: number): void => { p.d[wrap(y) * N + wrap(x)] = col; };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = (x / N) * TAU, v = (y / N) * TAU;
      // Nebelstreif: ein schräges, sanft atmendes Band; daneben ein kälterer Schleier
      // ein einzelner langer Schleier je Kachel: Band quer zur Diagonale, zu den Enden hin auslaufend
      const band = Math.cos(u + v + 0.55 * Math.sin(u - v + 0.8) + 0.16 * Math.sin(u + ph));
      const along = 0.5 + 0.5 * Math.cos(u - v + 1.9 + 0.2 * Math.sin(v - ph));
      const s = band * 0.5 + 0.5 - (1 - along) * 0.3;
      const t = Math.cos(u + v + 2.6 + 0.5 * Math.sin(u - v)) * 0.5 + 0.5 - (0.5 + 0.5 * Math.cos(u - v + 4.6)) * 0.6;
      let col = VOIDC;
      if (s > 0.93) col = (x + y) & 1 ? NEB3 : NEB2;
      else if (s > 0.84) col = NEB2;
      else if (s > 0.7) col = s > 0.76 || ((x + y) & 1) ? NEB1 : VOIDC;
      else if (t > 0.9) col = NEBC;
      else if (t > 0.84 && ((x + y) & 1)) col = NEBC;
      p.d[y * N + x] = col;
    }
    // ferne Sterne: ½ px je Frame nach links, sanftes Ein- und Ausblenden
    for (let k = 0; k < 30; k++) {
      const h = hash2(k, 11, 3901), life = (f + (h % FR)) % FR, x = (h >>> 5) % N, y = (h >>> 12) % N;
      const lv = [0, 1, 2, 2, 3, 2, 1, 1][life] - ((h >>> 20) % 3 === 0 ? 1 : 0);
      if (lv > 0) put(x - (life >> 1), y, k % 7 === 0 && lv > 1 ? PINKS : FAR[lv]);
    }
    // nahe Sterne: 1 px je Frame nach links, leicht sinkend; auf dem Höhepunkt ein Kreuz
    for (let k = 0; k < 7; k++) {
      const h = hash2(k, 23, 3907), life = (f + (h % FR)) % FR, x = (h >>> 5) % N - life, y = (h >>> 12) % N + (life >> 2);
      const lv = [0, 1, 2, 3, 3, 2, 1, 0][life];
      if (lv === 0) continue;
      put(x, y, NEAR[lv]);
      if (lv === 3) { put(x - 1, y, ARM); put(x + 1, y, ARM); put(x, y - 1, ARM); put(x, y + 1, ARM); }
      else if (lv === 2) put(x + 1, y, FAR[1]);
    }
    // Sternschnuppe: zieht in drei Frames schräg durch
    {
      const h = hash2(5, 31, 3911), k = f - 2;
      if (k >= 0 && k < 3) {
        const x = (h % N) + k * 7, y = ((h >>> 8) % N) + k * 3;
        for (let j = 0; j < 6; j++) put(x - j, y - Math.round(j * 0.43), j === 0 ? WHITE : j < 3 ? P.ice[3] : j < 5 ? FAR[2] : FAR[1]);
      }
    }
    out.push(p);
  }
  return out;
}
