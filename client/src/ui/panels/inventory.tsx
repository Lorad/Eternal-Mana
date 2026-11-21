/** Inventar: Ausrüstung, 40 Plätze, Detailbereich mit Aktionen. */
import { useState } from 'preact/hooks';
import { useStore } from '../../state/store';
import { CLASSES } from '../../../../shared/src/data/classes';
import { ITEMS, canEquip, isGear, itemName } from '../../../../shared/src/data/items';
import { SLOTS, SLOT_NAME } from '../../../../shared/src/types';
import type { ItemInstance, Slot } from '../../../../shared/src/types';
import { Btn, Confirm, Gold, INV_SIZE, ItemDetails, ItemSlot, Portrait, SLOT_ICON, Window, closePanel, cx, send, sfx } from '../common';

export function InventoryPanel() {
  const char = useStore(s => s.char);
  const [sel, setSel] = useState<string | null>(null);
  const [drop, setDrop] = useState<ItemInstance | null>(null);
  if (!char) return null;

  const eqSlot = SLOTS.find(s => char.equip[s]?.uid === sel);
  const item = eqSlot ? char.equip[eqSlot]! : char.inv.find(i => i.uid === sel) ?? null;
  const base = item ? ITEMS[item.base] : null;
  const full = char.inv.length >= INV_SIZE;

  const primary = (it: ItemInstance, slot?: Slot) => {
    const b = ITEMS[it.base];
    if (!b) return;
    if (slot) { if (full) sfx('ui_error'); send({ t: 'unequip', slot }); return; }
    if (isGear(b)) { if (!canEquip(char.cls, b) || it.ilvl > char.level + 2) sfx('ui_error'); send({ t: 'equip', uid: it.uid }); }
    else if (b.kind === 'consumable') send({ t: 'use', uid: it.uid });
  };
  const cells: (ItemInstance | null)[] = [...char.inv];
  while (cells.length < INV_SIZE) cells.push(null);

  return (
    <Window title="Inventar" onClose={closePanel} class="win-inv">
      <div class="inv">
        <div class="inv-equip">
          <div class="sec-title">Ausrüstung</div>
          <div class="doll">
            <div class="char-stage"><Portrait k={'char_' + char.cls} scale={3} /></div>
            <div class="doll-name"><b>{char.name}</b><small>Stufe {char.level} · {CLASSES[char.cls].name}</small></div>
          </div>
          <ul class="equip-list">
            {SLOTS.map(s => {
              const it = char.equip[s];
              return (
                <li class={cx(sel && it?.uid === sel && 'on')}>
                  <ItemSlot item={it} placeholder={SLOT_ICON[s]} label={SLOT_NAME[s] + ' (leer)'} char={char} equipped selected={!!it && it.uid === sel}
                    onClick={() => setSel(it ? it.uid : null)} onAlt={() => it && primary(it, s)} />
                  <div class="grow"><small>{SLOT_NAME[s]}</small><div class={cx('equip-name', it && 'rc' + it.rarity)}>{it ? itemName(it) : '—'}</div></div>
                </li>
              );
            })}
          </ul>
        </div>

        <div class="inv-bag">
          <div class="sec-title">Rucksack <span class={cx('pill', full && 'bad')}>{char.inv.length} / {INV_SIZE}</span></div>
          <div class="inv-grid">
            {cells.map((it, i) => (
              <ItemSlot key={it ? it.uid : 'e' + i} item={it} char={char} selected={!!it && it.uid === sel}
                dim={!!it && isGear(ITEMS[it.base]) && !canEquip(char.cls, ITEMS[it.base])}
                onClick={it ? () => setSel(it.uid) : undefined} onAlt={() => it && primary(it)} />
            ))}
          </div>
          <div class="inv-foot">
            <span class="inv-gold">Gold <Gold n={char.gold} /></span>
            <span class="note grow">Doppelklick oder Rechtsklick: anlegen / benutzen</span>
            <Btn kind="small" onClick={() => send({ t: 'sortInv' })}>Sortieren</Btn>
          </div>
        </div>

        <div class="inv-detail card">
          {item && base ? (
            <>
              <ItemDetails item={item} char={char} equipped={!!eqSlot} />
              <div class="inv-actions">
                {eqSlot && <Btn kind="primary" disabled={full} title={full ? 'Inventar voll' : undefined} onClick={() => primary(item, eqSlot)}>Ablegen</Btn>}
                {!eqSlot && isGear(base) && <Btn kind="primary" disabled={!canEquip(char.cls, base) || item.ilvl > char.level + 2} onClick={() => primary(item)} sound="ui_equip">Ausrüsten</Btn>}
                {!eqSlot && base.kind === 'accessory' && char.equip.acc1 && char.equip.acc2 && <Btn onClick={() => send({ t: 'equip', uid: item.uid, slot: 'acc2' })} sound="ui_equip">In Platz 2</Btn>}
                {!eqSlot && base.kind === 'consumable' && <Btn kind="primary" onClick={() => primary(item)}>Benutzen</Btn>}
                {!eqSlot && base.kind !== 'quest' && <Btn kind="danger" onClick={() => setDrop(item)}>Wegwerfen</Btn>}
              </div>
            </>
          ) : (
            <div class="inv-empty">
              <b>Kein Gegenstand gewählt</b>
              <span class="note">Wähle einen Gegenstand, um Details, Vergleich und Aktionen zu sehen.</span>
            </div>
          )}
        </div>
      </div>
      {drop && (
        <Confirm danger yes="Wegwerfen" onNo={() => setDrop(null)} onYes={() => { send({ t: 'drop', uid: drop.uid }); setDrop(null); setSel(null); }}
          text={<><b>{itemName(drop)}{(drop.qty ?? 1) > 1 ? ` ×${drop.qty}` : ''}</b> wirklich wegwerfen? Der Gegenstand ist danach verloren.</>} />
      )}
    </Window>
  );
}
