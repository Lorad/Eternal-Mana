/** Inventar: Ausrüstung (Puppe mit zehn Plätzen), 40 Plätze, Verkaufsfeld, Detailbereich mit Aktionen. */
let shiftDown = false;
if (typeof window !== 'undefined') {
  for (const ev of ['keydown', 'keyup'] as const) window.addEventListener(ev, e => { shiftDown = e.shiftKey; });
  window.addEventListener('mousedown', e => { shiftDown = e.shiftKey; }, true);
}
import { useState } from 'preact/hooks';
import { useStore } from '../../state/store';
import { CLASSES } from '../../../../shared/src/data/classes';
import { ITEMS, canEquip, equipLevel, isGear, itemName, sellPrice, slotsFor } from '../../../../shared/src/data/items';
import { SETS, SET_FULL, setCounts } from '../../../../shared/src/data/sets';
import { SLOT_NAME } from '../../../../shared/src/types';
import type { ItemInstance, Slot } from '../../../../shared/src/types';
import { charGS } from '../../../../shared/src/gearscore';
import { gsBracket } from '../../../../shared/src/data/gsreq';
import { Btn, Confirm, GS_HELP, Gold, GsValue, INV_SIZE, ITEM_DRAG, ItemDetails, ItemSlot, Portrait, SLOT_ICON, Window, closePanel, cx, send, sfx } from '../common';

/** Puppe (0.9): links Rüstung von Kopf bis Fuß, rechts Waffen und Schmuck – Reihenfolge = Fokus-Reihenfolge für das Gamepad */
const DOLL_LEFT: Slot[] = ['helm', 'armor', 'gloves', 'legs', 'boots'];
const DOLL_RIGHT: Slot[] = ['weapon', 'offhand', 'amulet', 'ring1', 'ring2'];
const label = (s: Slot) => (s === 'ring1' ? 'Ring 1' : s === 'ring2' ? 'Ring 2' : SLOT_NAME[s]);

export function InventoryPanel() {
  const char = useStore(s => s.char);
  const [sel, setSel] = useState<string | null>(null);
  const [drop, setDrop] = useState<ItemInstance | null>(null);
  const [tray, setTray] = useState<string[]>([]);     // Verkaufsfeld (0.12.1): Kennungen der Gegenstände darin
  const [hot, setHot] = useState(false);              // Verkaufsfeld unter dem Mauszeiger beim Ziehen
  const [ask, setAsk] = useState(false);              // Rückfrage bei wertvollen Stücken
  if (!char) return null;

  const eqSlot = [...DOLL_LEFT, ...DOLL_RIGHT].find(s => char.equip[s]?.uid === sel);
  const item = eqSlot ? char.equip[eqSlot]! : char.inv.find(i => i.uid === sel) ?? null;
  const base = item ? ITEMS[item.base] : null;
  const full = char.inv.length >= INV_SIZE;
  const gs = charGS(char);

  const primary = (it: ItemInstance, slot?: Slot) => {
    const b = ITEMS[it.base];
    if (!b) return;
    if (slot) { if (full) sfx('ui_error'); send({ t: 'unequip', slot }); return; }
    if (isGear(b)) { if (!canEquip(char.cls, b) || char.level < equipLevel(it.ilvl)) sfx('ui_error'); send({ t: 'equip', uid: it.uid }); }
    else if (b.kind === 'consumable') send({ t: 'use', uid: it.uid });
  };
  const cells: (ItemInstance | null)[] = [...char.inv];
  while (cells.length < INV_SIZE) cells.push(null);

  // ---- Verkaufsfeld: Gegenstände hineinziehen (oder Umschalt+Klick / Knopf), dann alles auf einmal verkaufen – überall
  const trayItems = tray.map(u => char.inv.find(i => i.uid === u)).filter((i): i is ItemInstance => !!i);
  const inTray = new Set(trayItems.map(i => i.uid));
  const sellable = (it: ItemInstance) => ITEMS[it.base]?.kind !== 'quest';
  const addTray = (uid: string) => {
    const it = char.inv.find(i => i.uid === uid);
    if (!it || inTray.has(uid)) return;
    if (!sellable(it)) { sfx('ui_error'); return; }
    sfx('ui_click'); setTray([...trayItems.map(i => i.uid), uid]);
  };
  const dropTray = (uid: string) => setTray(trayItems.map(i => i.uid).filter(u => u !== uid));
  const trayGold = trayItems.reduce((a, it) => a + sellPrice(it) * (it.qty ?? 1), 0);
  /** wertvoll: episch oder besser, ab +3 verbessert, Setteil, benanntes Stück oder mit Element */
  const precious = trayItems.filter(it => isGear(ITEMS[it.base]) && (it.rarity >= 3 || it.up >= 3 || !!it.set || !!it.element || !!it.name));
  const sellNow = () => { send({ t: 'sellMany', uids: trayItems.map(i => i.uid) }); setTray([]); setAsk(false); if (sel && inTray.has(sel)) setSel(null); };
  const dragUid = (e: DragEvent) => e.dataTransfer?.getData(ITEM_DRAG) ?? '';

  return (
    <Window title="Inventar" onClose={closePanel} class="win-inv">
      <div class="inv">
        <div class="inv-equip">
          <div class="sec-title">Ausrüstung</div>
          <div class="doll">
            {([DOLL_LEFT, DOLL_RIGHT] as Slot[][]).map((col, ci) => (
              <ul class={cx('doll-col', ci ? 'right' : 'left')}>
                {col.map(s => {
                  const it = char.equip[s];
                  return (
                    <li class={cx(sel && it?.uid === sel && 'on')} title={label(s)}>
                      <ItemSlot item={it} placeholder={SLOT_ICON[s]} label={label(s) + ' (leer)'} char={char} equipped gs selected={!!it && it.uid === sel}
                        onClick={() => setSel(it ? it.uid : null)} onAlt={() => it && primary(it, s)} />
                      <small class="doll-label">{label(s)}</small>
                    </li>
                  );
                })}
              </ul>
            ))}
            <div class="doll-mid">
              <div class="char-stage"><Portrait k={'char_' + char.cls} scale={3} /></div>
              <div class="doll-name"><b>{char.name}</b><small>Stufe {char.level} · {CLASSES[char.cls].name}</small></div>
              <div class="doll-gs" title={GS_HELP}><small>Ausrüstungswert</small><GsValue gs={gs} /><small class="doll-gs-b" style={{ color: gsBracket(gs).color }}>{gsBracket(gs).name}</small></div>
              {Object.entries(setCounts(char)).filter(([, n]) => n >= 2).map(([id, n]) => <small class="doll-set" title="Angelegte Setteile">◆ {SETS[id]?.name} {n}/{SET_FULL}</small>)}
            </div>
          </div>
        </div>

        <div class="inv-bag">
          <div class="sec-title">Rucksack <span class={cx('pill', full && 'bad')}>{char.inv.length} / {INV_SIZE}</span></div>
          <div class="inv-grid">
            {cells.map((it, i) => (
              <ItemSlot key={it ? it.uid : 'e' + i} item={it} char={char} selected={!!it && it.uid === sel} drag={!!it && !inTray.has(it.uid)}
                dim={!!it && (inTray.has(it.uid) || (isGear(ITEMS[it.base]) && !canEquip(char.cls, ITEMS[it.base])))}
                onClick={it ? () => { if (shiftDown) { inTray.has(it.uid) ? dropTray(it.uid) : addTray(it.uid); } else setSel(it.uid); } : undefined} onAlt={() => it && primary(it)} />
            ))}
          </div>
          <div class={cx('sell-box', hot && 'hot', trayItems.length > 0 && 'full')}
            onDragOver={e => { if (e.dataTransfer?.types.includes(ITEM_DRAG)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (!hot) setHot(true); } }}
            onDragLeave={e => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setHot(false); }}
            onDrop={e => { e.preventDefault(); setHot(false); const u = dragUid(e); if (u) addTray(u); }}>
            <div class="sell-head">
              <b>Verkauf</b>
              <span class="note grow">{trayItems.length ? `${trayItems.length} ${trayItems.length === 1 ? 'Gegenstand' : 'Gegenstände'} · Klick nimmt heraus` : 'Gegenstände hierher ziehen – oder Umschalt+Klick im Rucksack'}</span>
              {trayItems.length > 0 && <span class="sell-sum"><Gold n={trayGold} /></span>}
            </div>
            {trayItems.length > 0 && (
              <div class="sell-items">
                {trayItems.map(it => <ItemSlot key={it.uid} item={it} char={char} size="sm" price={sellPrice(it)} onClick={() => dropTray(it.uid)} onAlt={() => dropTray(it.uid)} />)}
              </div>
            )}
            <div class="row end sell-btns">
              {trayItems.length > 0 && <Btn kind="small" onClick={() => setTray([])}>Leeren</Btn>}
              <Btn kind="primary" disabled={!trayItems.length} onClick={() => (precious.length ? setAsk(true) : sellNow())} sound={null}>Verkaufen</Btn>
            </div>
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
                {!eqSlot && isGear(base) && <Btn kind="primary" disabled={!canEquip(char.cls, base) || char.level < equipLevel(item.ilvl)} onClick={() => primary(item)} sound="ui_equip">Ausrüsten</Btn>}
                {!eqSlot && slotsFor(base).length > 1 && char.equip.ring1 && char.equip.ring2 && <>
                  <Btn onClick={() => send({ t: 'equip', uid: item.uid, slot: 'ring1' })} sound="ui_equip">Statt Ring 1</Btn>
                  <Btn onClick={() => send({ t: 'equip', uid: item.uid, slot: 'ring2' })} sound="ui_equip">Statt Ring 2</Btn>
                </>}
                {!eqSlot && base.kind === 'consumable' && <Btn kind="primary" onClick={() => primary(item)}>Benutzen</Btn>}
                {!eqSlot && base.kind !== 'quest' && <Btn onClick={() => (inTray.has(item.uid) ? dropTray(item.uid) : addTray(item.uid))}>{inTray.has(item.uid) ? 'Aus dem Verkauf' : 'In den Verkauf'}</Btn>}
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
      {ask && (
        <Confirm yes={`Für ${trayGold.toLocaleString('de-DE')} Gold verkaufen`} onNo={() => setAsk(false)} onYes={sellNow}
          text={<>Im Verkauf {precious.length === 1 ? 'liegt ein wertvolles Stück' : `liegen ${precious.length} wertvolle Stücke`}: <b>{precious.slice(0, 4).map(it => itemName(it)).join(', ')}{precious.length > 4 ? ' …' : ''}</b>. Wirklich alles verkaufen? Verkauftes kommt nicht zurück.</>} />
      )}
      {drop && (
        <Confirm danger yes="Wegwerfen" onNo={() => setDrop(null)} onYes={() => { send({ t: 'drop', uid: drop.uid }); setDrop(null); setSel(null); }}
          text={<><b>{itemName(drop)}{(drop.qty ?? 1) > 1 ? ` ×${drop.qty}` : ''}</b> wirklich wegwerfen? Der Gegenstand ist danach verloren.</>} />
      )}
    </Window>
  );
}
