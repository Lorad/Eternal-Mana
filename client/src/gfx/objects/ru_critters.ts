/** Verlorene Ruinen – Kleintiere, Präfix `crit_`. Alle blicken nach rechts (Engine spiegelt). */
import { Px } from '../draw';
import { Frames, INK, P, Ramp, WHITE, alpha, anim, mix } from './kit';

const Y = P.gold, C = P.cream, T = P.tan;

function wisp(p: Px, f: number): void {
  const c = mix(Y[3], Y[4], 0.5);
  p.set(2, 2, alpha(WHITE, f ? 255 : 180)); for (const [x, y] of [[1, 2], [3, 2], [2, 1], [2, 3]] as const) p.set(x, y, alpha(c, f ? 220 : 120));
  if (f) for (const [x, y] of [[0, 2], [4, 2], [2, 0], [2, 4], [1, 1], [3, 1], [1, 3], [3, 3]] as const) p.set(x, y, alpha(Y[3], 80));
}
/** Skarabäus: schillernder Panzer (Petrol → Gold), sechs Beine. step 0..3 = Laufphase, lift = Fühler/Flügeldecke zuckt. */
function scarab(p: Px, step: number, lift = 0, dy = 0): void {
  const S: Ramp = [P.teal[0], P.teal[1], mix(P.teal[2], P.blue[2], 0.4), P.teal[3], mix(P.teal[4], Y[4], 0.5)];
  const a = step % 2 === 0 ? 0 : 1;
  // Beine (wechselseitig), Fühler
  for (const [x, k] of [[2, 0], [4, 1], [6, 0]] as const) { const o = (k + a) % 2 ? 1 : -1; p.set(x + o, 6, INK); p.set(x + o + (o > 0 ? 1 : -1), 7, P.ash[2]); p.set(x, 1 + dy + (step > 1 ? 0 : 0), 0); }
  p.set(1, 2 + dy, P.ash[2]); p.set(3 + (a ? 0 : 1), 1 + dy, P.ash[2]);
  p.ell(4.4, 4 + dy, 3.3, 2.3, S[1]); p.ell(4, 3.6 + dy, 2.6, 1.6, S[2]); p.px([3, 2 + dy, 4, 2 + dy], S[3]); p.set(2, 3 + dy, S[4]); p.line(4, 2 + dy, 5, 5 + dy, S[0]);
  p.px([5, 3 + dy, 6, 4 + dy], Y[2]);
  // Kopfschild und Fühler
  p.rect(7, 3 + dy, 2, 3, P.ash[1]); p.set(7, 3 + dy, P.ash[3]); p.set(9, 3 + dy - lift, Y[2]); p.set(9, 5 + dy, P.ash[2]); p.set(8, 4 + dy, Y[3]);
}
function moth(p: Px, f: number): void {
  const A: Ramp = [T[0], T[1], mix(T[2], C[2], 0.4), C[3], C[4]];
  const sp = [3, 2, 0, 2][f], dy = [0, 0, -1, 0][f];
  p.rect(4, 2 + dy, 1, 4, mix(T[0], INK, 0.3)); p.set(4, 1 + dy, T[1]); p.px([3, 0 + dy, 5, 0 + dy], T[2]);
  if (sp === 0) { p.rect(3, 1 + dy, 1, 4, A[1]); p.set(3, 2 + dy, A[3]); return; }
  for (const s of [-1, 1]) {
    const x0 = 4 + s;
    for (let i = 0; i < sp; i++) {
      const x = x0 + s * i, lit = s < 0;
      p.set(x, 2 + dy - (i > 0 ? 1 : 0), i === sp - 1 ? A[1] : A[lit ? 3 : 2]); p.set(x, 3 + dy - (i > 0 ? 1 : 0), A[lit ? 4 : 3]); p.set(x, 4 + dy, i === sp - 1 ? A[1] : A[2]);
      if (i < sp - 1 || sp === 2) p.set(x, 5 + dy, A[lit ? 2 : 1]);
    }
    if (sp === 3) { p.set(x0 + s, 1 + dy, A[4]); p.set(x0 + s * 2, 3 + dy, Y[3]); p.set(x0 + s, 6 + dy, A[1]); p.set(x0 + s, 3 + dy, T[1]); }
    else p.set(x0 + s, 2 + dy, Y[3]);
  }
}

export function ruCritters(out: Frames): void {
  anim(out, 'crit_wisp', 2, 5, 5, wisp, false);
  anim(out, 'crit_scarab_idle', 2, 10, 8, (p, f) => scarab(p, 0, f));
  anim(out, 'crit_scarab_run', 4, 10, 8, (p, f) => scarab(p, f, 0, f === 1 ? -1 : 0));
  anim(out, 'crit_moth', 4, 8, 8, moth);
}
