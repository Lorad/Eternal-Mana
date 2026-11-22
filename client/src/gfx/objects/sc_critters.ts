/** Schattenreich – Kleintiere, Präfix `crit_`. Alle blicken nach rechts (Engine spiegelt). */
import { Px } from '../draw';
import { Frames, INK, P, Ramp, WHITE, alpha, anim, mix } from './kit';
import { COLD, FLESH, sAnim } from './sc_kit';

const V = P.violet;

function shadowMoth(p: Px, f: number): void {
  const A: Ramp = [P.shadow[1], P.shadow[3], mix(V[1], P.shadow[4], 0.5), V[2], V[3]];
  const sp = [3, 2, 0, 2][f], dy = [0, 0, -1, 0][f];
  p.rect(4, 2 + dy, 1, 4, P.shadow[0]); p.set(4, 1 + dy, COLD[0]); p.px([3, 0 + dy, 5, 0 + dy], V[2]);
  if (sp === 0) { p.rect(3, 1 + dy, 1, 4, A[2]); p.set(3, 2 + dy, A[4]); return; }
  for (const s of [-1, 1]) {
    const x0 = 4 + s;
    for (let i = 0; i < sp; i++) {
      const x = x0 + s * i, lit = s < 0;
      p.set(x, 2 + dy - (i > 0 ? 1 : 0), i === sp - 1 ? A[4] : A[lit ? 3 : 2]); p.set(x, 3 + dy - (i > 0 ? 1 : 0), A[lit ? 3 : 2]); p.set(x, 4 + dy, i === sp - 1 ? A[3] : A[2]);
      if (i < sp - 1 || sp === 2) p.set(x, 5 + dy, A[lit ? 2 : 1]);
    }
    if (sp === 3) { p.set(x0 + s, 1 + dy, COLD[1]); p.set(x0 + s * 2, 3 + dy, P.pink[3]); p.set(x0 + s, 6 + dy, A[1]); }
    else p.set(x0 + s, 2 + dy, P.pink[3]);
  }
}
/** Äugling: ein Auge auf drei dünnen Beinen. lid 0 offen … 1 zu; step = Laufphase. */
function eyeling(p: Px, lid: number, step: number, dy = 0): void {
  const a = step % 2;
  // Beine
  for (const [x, k] of [[3, 0], [5, 1], [7, 0]] as const) { const o = step < 0 ? 0 : (k + a) % 2 ? 1 : -1; p.set(x, 7 + dy, FLESH[1]); p.set(x + o, 8, FLESH[1]); p.set(x + o + (step < 0 ? 0 : o), 9, FLESH[2]); }
  p.ell(5, 4.2 + dy, 3.6, 3.4, FLESH[2]); p.ell(4.6, 3.8 + dy, 2.8, 2.6, FLESH[3]);
  if (lid < 1) {
    const ry = lid ? 1.2 : 2.5;
    p.ell(5.6, 4.2 + dy, 2.7, ry, COLD[3]); p.ell(5.2, 3.9 + dy, 1.8, Math.max(0.6, ry - 0.8), WHITE);
    p.ell(6.8, 4.3 + dy, 1.3, Math.min(1.5, ry), P.pink[3]); p.set(7, 4 + dy, INK); if (!lid) p.set(6, 3 + dy, WHITE);
  } else { p.rect(3, 4 + dy, 6, 1, FLESH[0]); p.rect(4, 5 + dy, 4, 1, FLESH[4]); }
  p.px([3, 1 + dy, 4, 1 + dy], FLESH[4]); p.set(1, 3 + dy, FLESH[1]);
}
function voidSpark(p: Px, f: number): void {
  const c = P.pink[3];
  p.set(2, 2, alpha(WHITE, f ? 255 : 200));
  if (f) { for (const [x, y] of [[1, 2], [3, 2], [2, 1], [2, 3]] as const) p.set(x, y, alpha(mix(c, WHITE, 0.3), 230)); for (const [x, y] of [[0, 2], [4, 2], [2, 0], [2, 4]] as const) p.set(x, y, alpha(V[3], 150)); }
  else for (const [x, y] of [[1, 1], [3, 3], [1, 3], [3, 1]] as const) p.set(x, y, alpha(c, 170));
}

export function scCritters(out: Frames): void {
  sAnim(out, 'crit_shadowmoth', 4, 8, 8, shadowMoth, true, 0);
  sAnim(out, 'crit_eyeling_idle', 2, 10, 10, (p, f) => eyeling(p, f ? 0.5 : 0, -1), true, 0);
  sAnim(out, 'crit_eyeling_run', 4, 10, 10, (p, f) => eyeling(p, 0, f, f === 1 || f === 3 ? -1 : 0), true, 0);
  anim(out, 'crit_voidspark', 2, 5, 5, voidSpark, false);
}
