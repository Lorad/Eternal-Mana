/**
 * Ausrüstungswert in Fenstern mit Empfehlungen (0.12): Portal der Expeditionen, Riss-Stein. Die Zahlen kommen aus
 * shared/src/data/gsreq.ts, der eigene Wert aus shared/src/gearscore.ts, die Werte der Gruppe vom Server.
 */
import { fmtGS } from '../../../shared/src/gearscore';
import { gsColor, type GsReq } from '../../../shared/src/data/gsreq';
import { GS_HELP, cx } from './common';

/** Empfehlung zum Ausrüstungswert (0.12): empfohlen, Mindestwert, Belohnungsstufe – und die Warnung, wer darunter liegt */
export function GsReqBox({ req, mine, crew, warn }: { req: GsReq; mine: number; crew: { name: string; gs: number }[] | null; warn: string | null }) {
  const state = (gs: number) => (gs >= req.recGS ? 'ok' : gs >= req.minGS ? 'low' : 'bad');
  return (
    <div class={cx('xp-gs', 'card', req.tier === 'raid' && 'raid')} title={GS_HELP}>
      <div class="xp-gs-row">
        <span>Empfohlen <b style={{ color: gsColor(req.recGS) }}>GS {fmtGS(req.recGS)}</b></span>
        <span>Mindestens <b>GS {fmtGS(req.minGS)}</b>{req.hard ? ' (verlangt)' : ''}</span>
        <span>Dein Wert <b class={'xp-gs-' + state(mine)}>GS {fmtGS(mine)}</b></span>
      </div>
      <div class="xp-gs-row note">
        <span class={cx('xp-tier', 't-' + req.tier)}>{req.tierName}</span>
        <span class="grow">Stufe {req.recLevel} · Beute: {req.reward}</span>
      </div>
      {crew && crew.length > 1 && (
        <div class="xp-gs-crew">{crew.map(m => <span class={'xp-gs-' + state(m.gs)} title={state(m.gs) === 'bad' ? 'unter dem Mindestwert' : state(m.gs) === 'low' ? 'unter der Empfehlung' : 'erfüllt die Empfehlung'}>{state(m.gs) === 'bad' ? '⚠ ' : state(m.gs) === 'ok' ? '✓ ' : '· '}{m.name} {fmtGS(m.gs)}</span>)}</div>
      )}
      {warn && <div class={cx('xp-gs-warn', req.hard && 'hard')} role="alert">⚠ {warn}</div>}
    </div>
  );
}
