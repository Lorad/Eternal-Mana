/**
 * Handwerk (0.4): Fenster für Schmiede, Alchemie, Kochstelle und Verzauberung.
 * Geöffnet wird es aus dem NPC-Gespräch (`StationOptions`) oder am Lagerfeuer. Alle Prüfungen laufen über dieselben
 * Regeln wie auf dem Server (shared/src/craft.ts) – der Server entscheidet, hier wird nur angezeigt, warum etwas nicht geht.
 */
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { store, useStore } from '../state/store';
import { CFG, ELEMENTS, ELEMENT_NAME, RARITY_COLOR, RARITY_NAME } from '../../../shared/src/config';
import { countItem, craftBlock, enchantBlock, enchantCost, enchantFits, infuseBlock, infusePlan, knowsRecipe, legendIlvl, recipeBase, recipeCost, recipeLabel, reforgeBlock, reforgeCost, tierIlvl, type Cost } from '../../../shared/src/craft';
import { ITEMS, isGear, itemName, tierOf } from '../../../shared/src/data/items';
import { LEGEND_TEXT } from '../../../shared/src/data/materials';
import { NPCS } from '../../../shared/src/data/npcs';
import { Upgrade } from './dialog';
import { CAT_NAME, ENCHANT_LIST, FIRE, HOME_AT, RECIPE_LIST, STATION_CATS, STATION_NAME, STATION_NPCS, STATION_OPTION, type InfuseElement, type RecipeDef, type StationId } from '../../../shared/src/data/recipes';
import { SETS } from '../../../shared/src/data/sets';
import { ELEMENT_INFO, reactionsWith } from '../../../shared/src/elements';
import { SLOTS } from '../../../shared/src/types';
import type { CharData, ItemInstance } from '../../../shared/src/types';
import { Btn, ELEMENT_CSS, Gold, INV_SIZE, Icon, ItemSlot, Tabs, Toggle, Window, cx, fmtMod, itemIconKey, modEntries, send, sfx } from './common';
import { Attune } from './endgame';
import { modsLine } from './itemextra';
import { riftUnlocked } from '../../../shared/src/data/rifts';

export function openCraft(at: string, station: StationId) { store.set({ dialog: null, panel: null, prompt: null, craft: { at, station } }); }

/** Einträge im NPC-Gespräch: je Station des NPCs eine Zeile, die das Handwerksfenster öffnet. */
export function StationOptions({ npc }: { npc: string }) {
  const list = STATION_NPCS[npc] ?? [];
  return (
    <>
      {list.map(st => (
        <button type="button" class="opt opt-craft" onClick={() => { sfx('ui_click'); openCraft(npc, st); }}>
          <i class="opt-mark">{STATION_OPTION[st][0]}</i><span class="grow">{STATION_OPTION[st][1]}</span>
        </button>
      ))}
    </>
  );
}

export function CraftWindow() {
  const craft = useStore(s => s.craft);
  const char = useStore(s => s.char);
  const [tab, setTab] = useState<'make' | 'reforge' | 'infuse' | 'attune' | 'upgrade'>('make');
  if (!craft || !char) return null;
  const station = craft.station as StationId, at = craft.at;
  const who = at === FIRE ? 'Lagerfeuer' : at === HOME_AT ? 'Hof' : NPCS[at]?.name ?? '';
  return (
    <Window title={`${STATION_NAME[station]} · ${who}`} onClose={() => store.set({ craft: null })} class="win-craft"
      head={<>
        {station === 'forge' && <Tabs tabs={[['make', 'Herstellen'], ['reforge', 'Umschmieden'], ['infuse', 'Element einschmieden'], ...(riftUnlocked(char) ? [['attune', 'Angleichen'] as ['attune', string]] : []), ...(at === HOME_AT ? [['upgrade', 'Verbessern'] as ['upgrade', string]] : [])]} value={tab} onChange={setTab} />}
        <span class="dlg-gold craft-gold">Gold <Gold n={char.gold} /></span>
      </>}>
      {station === 'enchant' ? <Enchant char={char} at={at} />
        : station === 'forge' && tab === 'reforge' ? <Reforge char={char} at={at} />
        : station === 'forge' && tab === 'infuse' ? <Infuse char={char} at={at} />
        : station === 'forge' && tab === 'attune' ? <Attune char={char} at={at} />
        : station === 'forge' && tab === 'upgrade' ? <Upgrade npc={at} char={char} back={() => setTab('make')} />
        : <Recipes char={char} station={station} at={at} />}
    </Window>
  );
}

// ------------------------------------------------------------------ gemeinsame Bausteine
export function CostList({ cost, char }: { cost: Cost; char: CharData }) {
  return (
    <ul class="upg-cost craft-cost">
      {cost.mats.map(([b, n]) => {
        const have = countItem(char, b), it = ITEMS[b];
        return (
          <li class={cx(have < n && 'bad')}>
            <span class="row"><Icon k={'item_' + (it?.icon ?? 'scroll')} size={24} />{it?.name ?? b}</span>
            <span class="craft-have"><b>{have}</b> / {n}</span>
          </li>
        );
      })}
      {cost.gold > 0 && <li class={cx(char.gold < cost.gold && 'bad')}><span>Gold</span><Gold n={cost.gold} /></li>}
    </ul>
  );
}
function gearOf(char: CharData, filter: (it: ItemInstance) => boolean): { equipped: ItemInstance[]; bag: ItemInstance[] } {
  const ok = (it: ItemInstance | undefined): it is ItemInstance => !!it && !!ITEMS[it.base] && isGear(ITEMS[it.base]) && filter(it);
  return { equipped: SLOTS.map(s => char.equip[s]).filter(ok), bag: char.inv.filter(ok) };
}
export function GearPicker({ char, sel, onSel, filter, empty }: { char: CharData; sel: string | null; onSel: (uid: string) => void; filter: (it: ItemInstance) => boolean; empty: string }) {
  const { equipped, bag } = gearOf(char, filter);
  return (
    <div class="upg-pick">
      <div class="sec-title">Angelegt</div>
      <div class="upg-grid">{equipped.length ? equipped.map(i => <ItemSlot key={i.uid} item={i} char={char} equipped size="sm" selected={i.uid === sel} onClick={() => onSel(i.uid)} />) : <span class="note">{empty}</span>}</div>
      <div class="sec-title">Im Rucksack</div>
      <div class="upg-grid scroll">{bag.length ? bag.map(i => <ItemSlot key={i.uid} item={i} char={char} size="sm" selected={i.uid === sel} onClick={() => onSel(i.uid)} />) : <span class="note">Nichts Passendes.</span>}</div>
    </div>
  );
}
export function useGear(char: CharData, filter: (it: ItemInstance) => boolean): [ItemInstance | null, string | null, (uid: string) => void] {
  const { equipped, bag } = gearOf(char, filter);
  const [sel, setSel] = useState<string | null>(equipped[0]?.uid ?? bag[0]?.uid ?? null);
  return [[...equipped, ...bag].find(i => i.uid === sel) ?? null, sel, setSel];
}
export function ItemTitle({ it, sub }: { it: ItemInstance; sub: ComponentChildren }) {
  return (
    <div class="upg-title">
      <span class={cx('slot slot-static', 'r' + it.rarity)}><Icon k={itemIconKey(it)} /></span>
      <div><b style={{ color: RARITY_COLOR[it.rarity] }}>{itemName(it)}</b><div class="upg-arrow">{sub}</div></div>
    </div>
  );
}

// ------------------------------------------------------------------ Rezepte (Schmiede, Alchemie, Kochen)
/** Kurzform des Ablehnungsgrundes für die Liste */
function shortWhy(why: string | null): string {
  if (!why) return 'bereit';
  if (why.startsWith('Benötigt Stufe')) return why.replace('Benötigt ', '').replace('.', '');
  if (why.startsWith('Es fehlt')) return 'Material fehlt';
  if (why.startsWith('Nicht genug Gold')) return 'Gold fehlt';
  if (why.startsWith('Inventar')) return 'Inventar voll';
  if (why.startsWith('Dieses Rezept')) return 'Rezept unbekannt';
  return 'nicht hier';
}
function minRarity(r: RecipeDef): number { return r.out.k === 'legend' ? 4 : r.out.k === 'set' ? 2 : r.out.k === 'gear' ? (r.out.master ? 2 : 1) : 0; }
function outIlvl(r: RecipeDef, level: number): number { return r.out.k === 'gear' ? tierIlvl(r.out.tier, level) : r.out.k === 'set' ? SETS[r.out.set].ilvl : r.out.k === 'legend' ? legendIlvl(level) : 1; }

function Recipes({ char, station, at }: { char: CharData; station: StationId; at: string }) {
  const [cat, setCat] = useState('all');
  const [only, setOnly] = useState(false);
  const [allTiers, setAllTiers] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const block = (r: RecipeDef, n = 1): string | null =>
    r.npcs && !r.npcs.includes(at) ? `Das schmiedet nur ${r.npcs.map(n2 => NPCS[n2]?.name ?? n2).join(' oder ')}.` : craftBlock(char, r, n);
  const curTier = tierOf(char.level);
  const mine = RECIPE_LIST.filter(r => r.station === station && (!r.cls || r.cls === char.cls));
  const cats = STATION_CATS[station].filter(c => mine.some(r => r.cat === c));
  const shown = mine.filter(r => {
    if (cat !== 'all' && r.cat !== cat) return false;
    if (only && block(r) !== null) return false;
    if (station === 'forge' && !allTiers && r.out.k !== 'legend') {
      const t = r.out.k === 'gear' ? r.out.tier : r.out.k === 'set' ? SETS[r.out.set].tier : curTier;
      if (r.level > char.level + 5 || t < curTier - 1) return false;
    }
    return true;
  }).sort((a, b) => +!knowsRecipe(char, a) - +!knowsRecipe(char, b));
  const r = shown.find(x => x.id === sel) ?? shown[0] ?? null;
  const stackable = !!r && r.out.k === 'item';
  let max = 1;
  if (r && stackable) while (max < CFG.craft.maxBatch && block(r, max + 1) === null) max++;
  const n = stackable ? Math.min(qty, max) : 1;
  const why = r ? block(r, n) : null;
  const base = r ? ITEMS[recipeBase(r, char.cls)] : null;
  const preview: ItemInstance | null = r && base ? { uid: 'preview', base: base.id, rarity: minRarity(r), ilvl: outIlvl(r, char.level), up: 0, affixes: [], set: r.out.k === 'set' ? r.out.set : undefined, name: r.out.k === 'set' ? r.name : undefined } : null;
  return (
    <div class="craft">
      <div class="craft-left">
        <div class="craft-filters">
          {cats.length > 1 && <Tabs tabs={[['all', 'Alle'], ...cats.map(c => [c, CAT_NAME[c]] as [string, string])]} value={cat} onChange={setCat} />}
          <Toggle on={only} onChange={setOnly} label="Nur herstellbare" />
          {station === 'forge' && <Toggle on={allTiers} onChange={setAllTiers} label="Alle Stufen" />}
        </div>
        <ul class="craft-list scroll">
          {shown.map(x => {
            const b = ITEMS[recipeBase(x, char.cls)], w = block(x), known = knowsRecipe(char, x);
            return (
              <li>
                <button type="button" class={cx('craft-row', r?.id === x.id && 'on', !!w && 'blocked', !known && 'locked')} onClick={() => { sfx('ui_click'); setSel(x.id); setQty(1); }}>
                  <span class={cx('slot slot-sm slot-static', 'r' + minRarity(x))}><Icon k={'item_' + (b?.icon ?? 'scroll')} size={36} /></span>
                  <span class="grow craft-name"><b>{recipeLabel(x, char.cls)}</b><small>{CAT_NAME[x.cat]}{x.level > 1 ? ` · ab Stufe ${x.level}` : ''}{b && isGear(b) ? ` · Gegenstandsstufe ${outIlvl(x, char.level)}` : ''}</small></span>
                  <span class={cx('craft-state', !w && 'good')}>{shortWhy(w)}</span>
                </button>
              </li>
            );
          })}
          {shown.length === 0 && <li class="note craft-none">Kein Rezept passt zu diesen Filtern.</li>}
        </ul>
      </div>
      <div class="card craft-detail">
        {r && base && preview ? (
          <>
            <div class="upg-title">
              <ItemSlot item={preview} char={char} size="sm" />
              <div>
                <b style={{ color: RARITY_COLOR[minRarity(r)] }}>{recipeLabel(r, char.cls)}</b>
                <div class="upg-arrow">{STATION_NAME[station]}{r.level > 1 ? ` · ab Stufe ${r.level}` : ''}</div>
              </div>
            </div>
            {r.out.k === 'item' && base.desc && <p class="note">{base.desc}</p>}
            {r.out.k === 'item' && base.use?.buff && <p class="craft-effect">{modsLine(base.use.buff.mods)} · {Math.round(base.use.buff.dur / 60)} Minuten{base.use.buff.party ? ' · auch für Gruppenmitglieder in der Nähe' : ''}</p>}
            {r.out.k === 'gear' && <p class="note">Für deine Klasse, Gegenstandsstufe <b>{outIlvl(r, char.level)}</b> (deine Stufe im Bereich dieses Materials). Seltenheit mindestens <b style={{ color: RARITY_COLOR[minRarity(r)] }}>{RARITY_NAME[minRarity(r)]}</b>, mit Glück höher; die Eigenschaften werden gewürfelt.</p>}
            {r.out.k === 'set' && <p class="note">Teil des Sets <b>{SETS[r.out.set].name}</b>. (2) {modsLine(SETS[r.out.set].bonus2)} · (4) {modsLine(SETS[r.out.set].bonus4)}. Reif und Anhänger liegen in den Truhen des Dungeons.</p>}
            {r.out.k === 'legend' && <p class="craft-effect">★ {LEGEND_TEXT[char.cls]}</p>}
            {r.out.k === 'legend' && <p class="note">Legendär, Gegenstandsstufe {outIlvl(r, char.level)}, vier gewürfelte Eigenschaften. {base.desc}</p>}
            {!knowsRecipe(char, r) && <p class="note bad">Dieses Rezept musst du erst lernen: Rezeptrollen stammen von Erwachten, aus Truhen und von Bossen.</p>}
            <div class="sec-title">Benötigt</div>
            <CostList cost={recipeCost(r, n)} char={char} />
            {stackable && max > 1 && <Qty v={n} max={max} onChange={setQty} />}
            <Btn kind="primary" class="block" disabled={!!why} onClick={() => send({ t: 'craft', id: r.id, at, n })} sound={null}>
              {why ?? (stackable && r.out.k === 'item' ? `Herstellen (${r.out.qty * n} Stück)` : 'Herstellen')}
            </Btn>
            <span class="note">Rucksack: <b class={cx(char.inv.length >= INV_SIZE && 'bad')}>{char.inv.length} / {INV_SIZE}</b></span>
          </>
        ) : <p class="note">Wähle links ein Rezept.</p>}
      </div>
    </div>
  );
}
function Qty({ v, max, onChange }: { v: number; max: number; onChange: (n: number) => void }) {
  const set = (n: number) => { sfx('ui_click'); onChange(Math.max(1, Math.min(max, n))); };
  return (
    <div class="row between">
      <span class="note">Anzahl der Durchgänge</span>
      <span class="stepper">
        <button type="button" disabled={v <= 1} aria-label="weniger" onClick={() => set(v - 1)}>−</button>
        <b>{v}</b>
        <button type="button" disabled={v >= max} aria-label="mehr" onClick={() => set(v + 1)}>+</button>
        <button type="button" class="stepper-max" disabled={v >= max} onClick={() => set(max)}>max</button>
      </span>
    </div>
  );
}

// ------------------------------------------------------------------ Umschmieden
function Reforge({ char, at }: { char: CharData; at: string }) {
  const [it, sel, setSel] = useGear(char, i => CFG.loot.affixCount[i.rarity] > 0);
  const why = it ? reforgeBlock(char, it) : null;
  return (
    <div class="upg">
      <GearPicker char={char} sel={sel} onSel={setSel} filter={i => CFG.loot.affixCount[i.rarity] > 0} empty="Nichts mit Eigenschaften angelegt." />
      <div class="upg-main card">
        {it ? (
          <>
            <ItemTitle it={it} sub={<>{RARITY_NAME[it.rarity]} · {it.affixes.length} Eigenschaft{it.affixes.length === 1 ? '' : 'en'}</>} />
            <ul class="tip-stats affix craft-affixes">{it.affixes.map(([k, v]) => <li>{fmtMod(k, v)}</li>)}</ul>
            <p class="note">Alle Eigenschaften werden neu gewürfelt – passend zu deiner Klasse. Seltenheit, Gegenstandsstufe, Verbesserung, Element und Rune bleiben, wie sie sind.</p>
            <div class="sec-title">Kosten</div>
            <CostList cost={reforgeCost(it)} char={char} />
            <Btn kind="primary" class="block" disabled={!!why} onClick={() => send({ t: 'reforge', uid: it.uid, at })} sound={null}>{why ?? 'Umschmieden'}</Btn>
          </>
        ) : <p class="note">Du hast nichts, was sich umschmieden ließe. Gewöhnliche Gegenstände haben keine Eigenschaften.</p>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Element einschmieden
function Infuse({ char, at }: { char: CharData; at: string }) {
  const isWeapon = (i: ItemInstance) => ITEMS[i.base]?.kind === 'weapon';
  const [it, sel, setSel] = useGear(char, isWeapon);
  const [pick, setPick] = useState<InfuseElement | null>(null);
  const el = (pick ?? (it?.element as InfuseElement | undefined) ?? 'fire') as InfuseElement;
  const cur = it?.element ? Math.max(1, it.elv ?? 1) : 0;
  const plan = it ? infusePlan(it, el) : null;
  const why = it ? infuseBlock(char, it, el) : null;
  const D = CFG.craft.infuseDmg, P = CFG.craft.infuseProc;
  return (
    <div class="upg">
      <GearPicker char={char} sel={sel} onSel={uid => { setSel(uid); setPick(null); }} filter={isWeapon} empty="Keine Waffe angelegt." />
      <div class="upg-main card">
        {it ? (
          <>
            <ItemTitle it={it} sub={it.element ? <span style={{ color: ELEMENT_CSS[it.element] }}>◆ {ELEMENT_NAME[it.element]} · Elementstufe {cur} / 3</span> : 'Noch ohne Element'} />
            <div class="el-btns" role="radiogroup" aria-label="Element wählen">
              {ELEMENTS.map(e => (
                <button type="button" role="radio" aria-checked={e === el} class={cx('el-btn', e === el && 'on')} style={{ '--c': ELEMENT_CSS[e] } as any} onClick={() => { sfx('ui_click'); setPick(e as InfuseElement); }}>
                  <i />{ELEMENT_NAME[e]}{it.element === e && <small>Stufe {cur}</small>}
                </button>
              ))}
            </div>
            <p class="note"><b style={{ color: ELEMENT_CSS[el] }}>{ELEMENT_NAME[el]}</b>: Standardangriffe und physische Fähigkeiten treffen mit diesem Element. Zustand: {ELEMENT_INFO[el]}.
              {' '}Reaktionen: {reactionsWith(el).map(r => `${r.name} (mit ${ELEMENT_NAME[r.pair[0] === el ? r.pair[1] : r.pair[0]]})`).join(', ')}.</p>
            <ul class="upg-cost">
              <li><span>Stufe 2</span><span>+{Math.round(D[2] * 100)} % Schaden, Zustand {Math.round((P[2] - 1) * 100)} % öfter</span></li>
              <li><span>Stufe 3</span><span>+{Math.round(D[3] * 100)} % Schaden, Zustand {Math.round((P[3] - 1) * 100)} % öfter · braucht einen Bosskern</span></li>
            </ul>
            {plan ? (
              <>
                <div class="sec-title">{it.element === el ? `Stufe ${cur} ➜ ${plan.level}` : it.element ? `Wechsel zu ${ELEMENT_NAME[el]} (beginnt bei Stufe 1)` : `${ELEMENT_NAME[el]} einschmieden (Stufe 1)`}</div>
                <CostList cost={plan.cost} char={char} />
                {it.element && it.element !== el && cur > 1 && <p class="note bad">Achtung: Die bisherige Elementstufe {cur} geht beim Wechsel verloren.</p>}
              </>
            ) : <p class="note">Die höchste Elementstufe ist erreicht. Ein anderes Element lässt sich jederzeit neu einschmieden.</p>}
            <Btn kind="primary" class="block" disabled={!!why} onClick={() => send({ t: 'infuse', uid: it.uid, el, at })} sound={null}>{why ?? 'Einschmieden'}</Btn>
          </>
        ) : <p class="note">Du brauchst eine Waffe. Nur Waffen können ein Element tragen.</p>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Verzaubern
function Enchant({ char, at }: { char: CharData; at: string }) {
  const [it, sel, setSel] = useGear(char, () => true);
  const list = it ? ENCHANT_LIST.filter(e => enchantFits(it, e)) : [];
  return (
    <div class="upg">
      <GearPicker char={char} sel={sel} onSel={setSel} filter={() => true} empty="Nichts angelegt." />
      <div class="upg-main card">
        {it ? (
          <>
            <ItemTitle it={it} sub={it.ench ? <>✦ {ENCHANT_LIST.find(e => e.id === it.ench)?.name ?? 'Rune'}</> : 'Noch ohne Rune'} />
            <p class="note">Jedes Ausrüstungsteil trägt genau eine Rune. Eine neue Rune ersetzt die alte. Bezahlt wird mit Essenzen.</p>
            <ul class="shop-list scroll craft-ench">
              {list.map(e => {
                const why = enchantBlock(char, it, e.id), cost = enchantCost(e), on = it.ench === e.id;
                return (
                  <li class={cx('shop-row', on && 'on')}>
                    <div class="grow shop-name"><b>{e.name}{on ? ' – aktiv' : ''}</b><small>{modEntries(e.mods).map(([k, v]) => fmtMod(k, v)).join(', ')}{e.level > 1 ? ` · ab Stufe ${e.level}` : ''}</small>{why && !on && <small class="bad craft-why">{why}</small>}</div>
                    <span class="craft-chips">
                      {cost.mats.map(([b, n]) => <span class={cx('craft-chip', countItem(char, b) < n && 'bad')} title={ITEMS[b]?.name}><Icon k={'item_' + ITEMS[b].icon} size={20} />{countItem(char, b)}/{n}<em>{ITEMS[b]?.name.replace('Essenz ', '')}</em></span>)}
                    </span>
                    <span class={cx('shop-price', char.gold < cost.gold && 'bad')}><Gold n={cost.gold} /></span>
                    <Btn kind="primary" disabled={!!why} title={why ?? undefined} onClick={() => send({ t: 'enchant', uid: it.uid, id: e.id, at })} sound={null}>{on ? 'Aktiv' : 'Verzaubern'}</Btn>
                  </li>
                );
              })}
            </ul>
          </>
        ) : <p class="note">Du hast keine Ausrüstung, die sich verzaubern ließe.</p>}
      </div>
    </div>
  );
}
