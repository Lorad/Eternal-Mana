/**
 * Zusatzzeilen im Gegenstands-Tooltip für die Eigenschaften der Version 0.4:
 * Elementstufe, Rune, Setzugehörigkeit mit aktiven Boni, Sonderwirkung Legendärer Waffen, Rezeptrollen.
 * Bewusst ohne Import aus common.tsx (common.tsx bindet diese Datei ein).
 */
import { CFG, ELEMENT_COLOR } from '../../../shared/src/config';
import { knowsRecipe } from '../../../shared/src/craft';
import { ITEMS } from '../../../shared/src/data/items';
import { LEGEND_TEXT } from '../../../shared/src/data/materials';
import { ENCHANTS, RECIPES } from '../../../shared/src/data/recipes';
import { SETS, SET_PIECES, SET_PIECE_NAME, setCounts } from '../../../shared/src/data/sets';
import { tradeBlock } from '../../../shared/src/social';
import { MOD_LABEL } from '../../../shared/src/types';
import type { CharData, ItemInstance, ModKey, Mods } from '../../../shared/src/types';

const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
export function modsLine(m: Mods): string {
  return (Object.keys(m) as ModKey[]).map(k => `${m[k]! > 0 ? '+' : '−'}${String(Math.abs(m[k]!)).replace('.', ',')} ${MOD_LABEL[k]}`).join(', ');
}

export function ItemExtras({ item: it, char }: { item: ItemInstance; char: CharData | null }) {
  const b = ITEMS[it.base];
  if (!b) return null;
  const lvl = it.element ? Math.max(1, Math.min(3, it.elv ?? 1)) : 0;
  const ench = it.ench ? ENCHANTS[it.ench] : undefined;
  const set = it.set ? SETS[it.set] : undefined;
  const learn = b.use?.learn ? RECIPES[b.use.learn] : undefined;
  const bound = tradeBlock(it); // 0.7: gebundene Gegenstände lassen sich nicht handeln
  if (!lvl && !ench && !set && !b.legend && !learn && !bound) return null;
  const n = set && char ? setCounts(char)[set.id] ?? 0 : 0;
  const worn = (piece: string) => !!char && Object.values(char.equip).some(e => e?.set === set?.id && (piece === 'helm' ? e.base.startsWith('h_') : piece === 'armor' ? e.base.startsWith('a_') : e.base.startsWith('c_' + piece)));
  return (
    <>
      {b.kind === 'weapon' && lvl > 0 && (
        <div class="tip-sub" style={{ color: hex(ELEMENT_COLOR[it.element!]) }}>
          Elementstufe {lvl} / 3{CFG.craft.infuseDmg[lvl] > 0 ? ` · +${Math.round(CFG.craft.infuseDmg[lvl] * 100)} % Schaden mit diesem Element` : ''}{CFG.craft.infuseProc[lvl] > 1 ? ', Zustand wird öfter ausgelöst' : ''}
        </div>
      )}
      {ench && <div class="tip-ench">✦ {ench.name}: {modsLine(ench.mods)}</div>}
      {b.legend && <div class="tip-legend">★ {LEGEND_TEXT[b.legend]}</div>}
      {set && (
        <div class="tip-set">
          <div class="tip-set-h">Set: {set.name} <span>({n} / 4 angelegt)</span></div>
          <div class="tip-set-pieces">{SET_PIECES.map(p => <span class={worn(p) ? 'on' : undefined}>{SET_PIECE_NAME[p]}</span>)}</div>
          <div class={n >= 2 ? 'tip-set-b on' : 'tip-set-b'}>(2) {modsLine(set.bonus2)}</div>
          <div class={n >= 4 ? 'tip-set-b on' : 'tip-set-b'}>(4) {modsLine(set.bonus4)}</div>
        </div>
      )}
      {learn && char && <div class={knowsRecipe(char, learn) ? 'tip-req' : 'tip-req good'}>{knowsRecipe(char, learn) ? 'Dieses Rezept kennst du bereits.' : 'Noch nicht gelernt.'}</div>}
      {bound && <div class="tip-req tip-bound">⛓ Gebunden – nicht handelbar. {bound}</div>}
    </>
  );
}
