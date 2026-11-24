/** Elemente im HUD (0.4): Schwächen/Resistenzen des anvisierten Gegners und des Bosses. */
import { useStore } from '../state/store';
import { ELEMENT_NAME } from '../../../shared/src/config';
import type { Element } from '../../../shared/src/types';
import { Bar, ELEMENT_CSS, cx } from './common';

function Els({ list }: { list: Element[] }) {
  return <>{list.map(e => <span class="aff-el" style={{ '--c': ELEMENT_CSS[e] } as any}><i />{ELEMENT_NAME[e]}</span>)}</>;
}
export function Affinity({ weak, resist }: { weak?: Element[]; resist?: Element[] }) {
  if (!weak?.length && !resist?.length) return null;
  return (
    <div class="aff">
      {!!weak?.length && <span class="aff-group">Schwach gegen <Els list={weak} /></span>}
      {!!resist?.length && <span class="aff-group">Widersteht <Els list={resist} /></span>}
    </div>
  );
}

/** Kleine Zielanzeige oben in der Mitte: der Gegner, den man gerade trifft oder mit der Maus anvisiert. */
export function TargetInfo() {
  const t = useStore(s => s.target);
  const boss = useStore(s => !!s.boss);
  if (!t || boss) return null;
  return (
    <div class="target">
      <div class={cx('target-name', t.elite && 'elite')}><span style={{ color: ELEMENT_CSS[t.el] }}>◆</span>{t.name}<small>Stufe {t.lvl} · {ELEMENT_NAME[t.el]}</small></div>
      <Bar kind="hp" v={t.hp} max={t.maxHp} label={false} class="thin" />
      <Affinity weak={t.weak} resist={t.resist} />
    </div>
  );
}
