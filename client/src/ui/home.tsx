/**
 * Zuhause (0.7): die Fenster des Hofs (Lagertruhe, Ausbau, Trophäen, Kleiderschrank, Auswahl am Wegweiser), das Fenster
 * „Sammlung“ (Bestiarium, Fundstücke, Rezepte, Trophäen, Begleiter, Erscheinungen) und der Kauf bei Mirelda.
 * Alle Regeln, Zahlen und Texte kommen aus shared/src/data/{home,pets,looks,collection}.ts – der Server prüft jede
 * Aktion selbst (server/src/home); hier wird nur angezeigt, was geht und warum etwas nicht geht.
 */
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { store, togglePanel, useStore } from '../state/store';
import { CFG, ELEMENT_NAME } from '../../../shared/src/config';
import { loreProgress } from '../../../shared/src/data/chronik';
import { CLASSES } from '../../../shared/src/data/classes';
import { BESTIARY, COLL_CATS, FINDS, MILESTONES, beastKills, collCount, collTotal, dropSeen, milestoneProgress, perksOf, stashSlots, studied, studyNeed, type Beast, type CollCat } from '../../../shared/src/data/collection';
import { FACTIONS, RANK_NAMES } from '../../../shared/src/data/factions';
import { HOME_ID, HOME_LEVELS, HOME_MAX, HOME_NPC, HOME_TROPHIES, HOME_TROPHY, TROPHY_CATS, buyBlock, emptyHome, homeStands, ownsTrophy, stashBlock, trophyPerks, upgradeBlock } from '../../../shared/src/data/home';
import { ITEMS } from '../../../shared/src/data/items';
import { LOOKS, LOOK_LIST, outfitSheet } from '../../../shared/src/data/looks';
import { PETS, PET_LIST } from '../../../shared/src/data/pets';
import { LEARNABLE } from '../../../shared/src/data/recipes';
import { TITLES, ownedTitles } from '../../../shared/src/data/rifts';
import { recipeLabel } from '../../../shared/src/craft';
import type { CharData, HomeData, ItemInstance } from '../../../shared/src/types';
import { Bar, Btn, Confirm, ELEMENT_CSS, Gold, Icon, ItemDetails, ItemSlot, Tabs, TextInput, Window, closePanel, cx, fmtMod, fmtNum, modEntries, send, sfx, tipProps } from './common';
import { CostList } from './craft';

const useHome = (): HomeData => useStore(s => s.home) ?? EMPTY_HOME;
const EMPTY_HOME = emptyHome();
const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');

// ------------------------------------------------------------------ Grafik aus den Texturen der Spielszene (Begleiter, Hof-Möbel, Gewänder)
const frameCache = new Map<string, string>();
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
const textures = (): any => (window as any).__em?.game?.textures;
/** Data-URL eines Frames einer geladenen Textur, ganzzahlig vergrößert; `tint` färbt wie in der Spielszene (multiplizierend). */
function frameUrl(key: string, frame: string, scale = 2, tint?: number): string {
  const ck = `${key}|${frame}|${scale}|${tint ?? ''}`;
  let u = frameCache.get(ck);
  if (u) return u;
  const tm = textures(), f = tm?.exists(key) && tm.get(key).has(frame) ? tm.get(key).get(frame) : null;
  if (!f) return BLANK;
  const cv = document.createElement('canvas'), w = f.cutWidth * scale, h = f.cutHeight * scale;
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const draw = () => ctx.drawImage(f.source.image, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, w, h);
  draw();
  if (tint !== undefined) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = hex(tint); ctx.fillRect(0, 0, w, h); ctx.globalCompositeOperation = 'destination-in'; draw(); }
  u = cv.toDataURL('image/png');
  frameCache.set(ck, u);
  return u;
}
function Sprite({ k, f, scale = 2, tint, class: c }: { k: string; f: string; scale?: number; tint?: number; class?: string }) {
  return <img class={cx('px', c)} src={frameUrl(k, f, scale, tint)} alt="" draggable={false} />;
}
/** Figur im gewählten Gewand – über dieselbe Rückfall-Regel wie die Spielszene (`outfitSheet`) */
function Figure({ cls, g, scale = 3 }: { cls: string; g?: string; scale?: number }) {
  const o = outfitSheet(k => !!textures()?.exists(k), cls, g);
  return <Sprite k={o.key} f="0" scale={scale} tint={o.tint} class="hof-figure" />;
}
const PetSprite = ({ id, scale = 3 }: { id: string; scale?: number }) => <Sprite k="obj" f={`pet_${id}_0`} scale={scale} />;

export function openSammlung(tab = 'uebersicht') { store.set({ sammlungTab: tab, panel: 'sammlung', dialog: null, craft: null, endgame: null, wshop: null, hof: null, prompt: null }); }

// =====================================================================================================================
//  HOF-FENSTER
// =====================================================================================================================
const HOF_TITLE: Record<string, string> = { lager: 'Lagertruhe', ausbau: 'Ausbau des Hofs', trophaeen: 'Trophäen', schrank: 'Kleiderschrank', weg: 'Hof am Waldrand' };
export function HofWindow() {
  const hof = useStore(s => s.hof);
  const char = useStore(s => s.char);
  const home = useHome();
  if (!hof || !char) return null;
  const close = () => store.set({ hof: null });
  return (
    <Window title={HOF_TITLE[hof.tab] ?? 'Hof'} onClose={close} class={cx('win-hof', 'win-hof-' + hof.tab)}>
      {hof.tab === 'lager' ? <Lager char={char} home={home} />
        : hof.tab === 'ausbau' ? <Ausbau char={char} home={home} />
        : hof.tab === 'trophaeen' ? <Trophies home={home} slot={hof.slot ?? 0} />
        : hof.tab === 'schrank' ? <Wardrobe char={char} home={home} />
        : <Weg home={home} />}
    </Window>
  );
}

// ------------------------------------------------------------------ Wegweiser: eigener Hof oder Besuch
function Weg({ home }: { home: HomeData }) {
  const party = useStore(s => s.party), myId = useStore(s => s.myId);
  const go = (owner?: number) => { send({ t: 'home', a: 'go', owner }); store.set({ hof: null }); };
  return (
    <div class="hof-weg">
      <p class="note">Jeder Hof ist sein eigener Ort. Auf den Höfen deiner Gruppe bist du Gast: Stationen, Bett und Kleiderschrank stehen dir offen, die Truhe nicht.</p>
      <Btn kind="primary" class="block" disabled={!home.owned} onClick={() => go()}>{home.owned ? 'Zu meinem Hof' : 'Du hast noch keinen Hof – Mirelda verkauft einen'}</Btn>
      {party.filter(m => m.id !== myId).map(m => (
        <Btn class="block" disabled={!m.online} onClick={() => go(m.id)}>{m.name} besuchen</Btn>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ Lagertruhe
function Lager({ char, home }: { char: CharData; home: HomeData }) {
  const [sel, setSel] = useState<{ side: 'inv' | 'stash'; uid: string } | null>(null);
  const [n, setN] = useState(0);
  const [gold, setGold] = useState('');
  const slots = stashSlots(home);
  const item = sel ? (sel.side === 'inv' ? char.inv : home.stash).find(i => i.uid === sel.uid) ?? null : null;
  const qty = item?.qty ?? 1, amount = Math.max(1, Math.min(qty, n || qty));
  const move = (side: 'inv' | 'stash', it: ItemInstance, k?: number) => { send({ t: 'home', a: side === 'inv' ? 'put' : 'take', uid: it.uid, n: k }); if (k === undefined || k >= (it.qty ?? 1)) setSel(null); setN(0); };
  const pick = (side: 'inv' | 'stash', it: ItemInstance) => { setSel({ side, uid: it.uid }); setN(0); };
  const cells = (list: ItemInstance[], size: number) => { const a: (ItemInstance | null)[] = [...list]; while (a.length < size) a.push(null); return a; };
  const g = Math.max(0, Math.floor(Number(gold.replace(/\D/g, '')) || 0));
  const why = item && sel?.side === 'inv' ? stashBlock(item) : null;
  const full = home.stash.length >= slots, invFull = char.inv.length >= CFG.player.invSize;
  return (
    <div class="hof-lager">
      <div class="hof-col">
        <div class="sec-title">Rucksack <span class={cx('pill', invFull && 'bad')}>{char.inv.length} / {CFG.player.invSize}</span></div>
        <div class="inv-grid sm">
          {cells(char.inv, CFG.player.invSize).map((it, i) => (
            <ItemSlot key={it ? it.uid : 'e' + i} size="sm" item={it} char={char} selected={!!it && sel?.side === 'inv' && it.uid === sel.uid} dim={!!it && !!stashBlock(it)}
              onClick={it ? () => pick('inv', it) : undefined} onAlt={() => it && move('inv', it)} />
          ))}
        </div>
        <div class="hof-gold"><span class="inv-gold">Bei dir <Gold n={char.gold} /></span></div>
      </div>
      <div class="hof-col">
        <div class="sec-title">Lagertruhe <span class={cx('pill', full && 'bad')}>{home.stash.length} / {slots}</span>
          <Btn kind="small" onClick={() => send({ t: 'home', a: 'sort' })}>Sortieren</Btn></div>
        <div class="inv-grid sm hof-stash scroll">
          {cells(home.stash, Math.max(slots, home.stash.length)).map((it, i) => (
            <ItemSlot key={it ? it.uid : 'e' + i} size="sm" item={it} char={char} selected={!!it && sel?.side === 'stash' && it.uid === sel.uid}
              onClick={it ? () => pick('stash', it) : undefined} onAlt={() => it && move('stash', it)} />
          ))}
        </div>
        <div class="hof-gold">
          <span class="inv-gold">In der Truhe <Gold n={home.gold} /></span>
          <TextInput class="hof-gold-in" value={gold} onInput={setGold} placeholder="Betrag" maxLength={8} ariaLabel="Goldbetrag" />
          <Btn kind="small" disabled={!g || !char.gold} onClick={() => { send({ t: 'home', a: 'gold', n: g }); setGold(''); }}>Einlagern</Btn>
          <Btn kind="small" disabled={!g || !home.gold} onClick={() => { send({ t: 'home', a: 'gold', n: -g }); setGold(''); }}>Abheben</Btn>
        </div>
      </div>
      <div class="hof-detail card">
        {item ? (
          <>
            <ItemDetails item={item} char={char} compare={false} />
            {qty > 1 && (
              <div class="row hof-qty">
                <span class="note">Menge</span>
                <Btn kind="small" disabled={amount <= 1} onClick={() => setN(amount - 1)} ariaLabel="weniger">−</Btn>
                <b>{amount}</b>
                <Btn kind="small" disabled={amount >= qty} onClick={() => setN(amount + 1)} ariaLabel="mehr">+</Btn>
                <Btn kind="small" onClick={() => setN(Math.max(1, Math.floor(qty / 2)))}>Hälfte</Btn>
                <Btn kind="small" onClick={() => setN(qty)}>Alle</Btn>
              </div>
            )}
            <Btn kind="primary" class="block" disabled={!!why} onClick={() => move(sel!.side, item, amount)}>{why ?? (sel!.side === 'inv' ? 'In die Truhe legen' : 'In den Rucksack nehmen')}</Btn>
          </>
        ) : (
          <div class="inv-empty">
            <b>Eine Truhe für alle</b>
            <span class="note">Was hier liegt, erreichen alle Charaktere deines Profils. Doppelklick oder Rechtsklick legt einen Gegenstand sofort hinüber.</span>
            <span class="note">Mehr Platz bringen der Ausbau des Hofs und Meilensteine der Sammlung.</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Ausbau
function Ausbau({ char, home }: { char: CharData; home: HomeData }) {
  const [ask, setAsk] = useState(false);
  const next = HOME_LEVELS[home.level + 1], why = upgradeBlock(char, home);
  return (
    <div class="hof-ausbau">
      <ol class="hof-levels">
        {HOME_LEVELS.map((L, i) => (
          <li class={cx('card', i <= home.level && 'done', i === home.level + 1 && 'next')}>
            <div class="hof-level-head"><b>{i === 0 ? L.name : `Stufe ${i}: ${L.name}`}</b>{i <= home.level ? <span class="pill gold-pill">gebaut</span> : i === home.level + 1 ? <span class="pill">als Nächstes</span> : null}</div>
            <ul class="hof-adds">{L.adds.map(a => <li>{a}</li>)}</ul>
          </li>
        ))}
      </ol>
      <div class="hof-next card">
        {next ? (
          <>
            <h3>{next.name}</h3>
            <p class="note">{next.desc}</p>
            <div class="sec-title">Kosten</div>
            <CostList cost={{ gold: next.gold, mats: next.mats }} char={char} />
            {(next.rep || next.rift) && <div class="sec-title">Voraussetzung</div>}
            {next.rep && <p class="note">Ruf: <b>{FACTIONS[next.rep[0]].name}</b>, Rang „{RANK_NAMES[next.rep[1] - 1]}“</p>}
            {next.rift && <p class="note">Ein abgeschlossener <b>Mana-Riss der Stufe {next.rift}</b></p>}
            <Btn kind="primary" class="block" disabled={!!why} onClick={() => setAsk(true)}>{why ?? 'Ausbauen'}</Btn>
          </>
        ) : (
          <>
            <h3>Fertig</h3>
            <p class="note">Mehr passt nicht aufs Grundstück. Borin sagt, er könne noch einen Turm anbauen. Mirelda sagt, das könne er nicht.</p>
          </>
        )}
      </div>
      {ask && next && <Confirm yes="Ausbauen" onNo={() => setAsk(false)} onYes={() => { send({ t: 'home', a: 'upgrade' }); setAsk(false); }}
        text={<><b>{next.name}</b> bauen? Gold und Rohstoffe werden sofort verbraucht.</>} />}
    </div>
  );
}

// ------------------------------------------------------------------ Trophäen
function Trophies({ home, slot }: { home: HomeData; slot: number }) {
  const [sel, setSel] = useState(Math.min(slot, Math.max(0, homeStands(home) - 1)));
  const stands = homeStands(home), perks = trophyPerks(home);
  const max = CFG.home.stands[HOME_MAX];
  const place = (id: string) => { send({ t: 'home', a: 'trophy', slot: sel, id }); };
  return (
    <div class="hof-tro">
      <div class="hof-stands">
        {Array.from({ length: max }, (_, i) => {
          const t = HOME_TROPHY[home.stands[i]], locked = i >= stands;
          return (
            <button type="button" class={cx('hof-stand', sel === i && 'on', locked && 'locked')} disabled={locked} onClick={() => { sfx('ui_click'); setSel(i); }}
              {...tipProps(() => <div class="tip-text"><b>{locked ? 'Noch kein Ständer' : t ? t.name : `Ständer ${i + 1} (leer)`}</b>{locked ? 'Mehr Ständer bringt der Ausbau des Hofs.' : t?.desc}</div>)}>
              <Sprite k="obj" f={locked ? 'fence_post' : 'trophy_stand'} scale={2} />
              {t && !locked && <Icon k={'item_' + t.icon} size={24} class="hof-stand-icon" />}
              <span>{locked ? '—' : i + 1}</span>
            </button>
          );
        })}
      </div>
      <div class="hof-perks">
        {TROPHY_CATS.map(c => <span class={cx('pill', perks.cats.includes(c.id) && 'gold-pill')} {...tipProps(() => <div class="tip-text"><b>{c.name}</b>Steht mindestens eine davon auf einem Ständer, gilt für alle Charaktere deines Profils: {c.perk}. Mehrere derselben Art bringen nicht mehr.</div>)}>
          <i style={{ background: hex(c.color) }} />{c.name}: {c.perk}</span>)}
      </div>
      <div class="hof-tro-list scroll">
        {TROPHY_CATS.map(c => (
          <div>
            <div class="sec-title">{c.name} <span class="pill">{HOME_TROPHIES.filter(t => t.cat === c.id && ownsTrophy(home, t.id)).length} / {HOME_TROPHIES.filter(t => t.cat === c.id).length}</span></div>
            <div class="hof-tro-grid">
              {HOME_TROPHIES.filter(t => t.cat === c.id).map(t => {
                const own = ownsTrophy(home, t.id), at = home.stands.indexOf(t.id);
                return (
                  <button type="button" class={cx('craft-row', !own && 'locked', at === sel && 'on')} disabled={!own} onClick={() => { sfx('ui_click'); place(at === sel ? '' : t.id); }}
                    {...tipProps(() => <div class="tip-text"><b>{t.name}</b>{own ? t.desc : t.how}</div>)}>
                    <Icon k={'item_' + t.icon} size={28} />
                    <span class="craft-name grow"><b>{own ? t.name : '???'}</b><small>{own ? (at >= 0 && at < stands ? `steht auf Ständer ${at + 1}` : 'im Schuppen') : t.how}</small></span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p class="note">Wähle oben einen Ständer, dann eine Trophäe. Ein zweiter Klick räumt sie wieder ab. Besucher sehen, was du aufstellst.</p>
    </div>
  );
}

// ------------------------------------------------------------------ Kleiderschrank
function Wardrobe({ char, home }: { char: CharData; home: HomeData }) {
  const g = char.look?.g ?? '', w = char.look?.w ?? '';
  const cls = CLASSES[char.cls];
  const opt = (kind: 'g' | 'w', id: string, name: string, sub: string, own: boolean, on: boolean, swatch: ComponentChildren, tip?: string) => (
    <button type="button" class={cx('craft-row hof-look', on && 'on', !own && 'locked')} disabled={!own} onClick={() => { sfx('ui_click'); send({ t: 'home', a: 'look', [kind]: id }); }}
      {...(tip ? tipProps(() => <div class="tip-text"><b>{name}</b>{tip}</div>) : {})}>
      {swatch}
      <span class="craft-name grow"><b>{name}</b><small>{sub}</small></span>
      {on && <span class="pill gold-pill">angelegt</span>}
    </button>
  );
  return (
    <div class="hof-schrank">
      <div class="hof-mirror card">
        <div class="char-stage"><Figure cls={char.cls} g={g || undefined} scale={4} /></div>
        <b>{char.name}</b>
        <small>{g ? LOOKS[g]?.name : `${cls.name}: eigene Kleidung`}</small>
        <small class="hof-glow"><i style={{ background: w ? hex(LOOKS[w]?.color ?? 0xffffff) : 'transparent' }} />{w ? LOOKS[w]?.name : 'Waffenglanz: Farbe des Elements'}</small>
      </div>
      <div class="hof-looks">
        <div class="sec-title">Gewand</div>
        {opt('g', '', 'Eigene Kleidung', `wie ${cls.name} eben aussehen`, true, !g, <span class="hof-thumb"><Figure cls={char.cls} scale={1} /></span>)}
        {LOOK_LIST.filter(l => l.kind === 'g').map(l => { const own = home.looks.includes(l.id); return opt('g', l.id, l.name, own ? l.desc : l.how, own, g === l.id, <span class="hof-thumb"><Figure cls={char.cls} g={l.id} scale={1} /></span>, l.desc); })}
      </div>
      <div class="hof-looks">
        <div class="sec-title">Waffenglanz</div>
        {opt('w', '', 'Farbe des Elements', 'Hieb und Schweif in der Farbe deiner Waffe', true, !w, <i class="hof-swatch hof-swatch-el" />)}
        {LOOK_LIST.filter(l => l.kind === 'w').map(l => { const own = home.looks.includes(l.id); return opt('w', l.id, l.name, own ? l.desc : l.how, own, w === l.id, <i class="hof-swatch" style={{ background: hex(l.color) }} />, l.desc); })}
      </div>
    </div>
  );
}

// =====================================================================================================================
//  SAMMLUNG
// =====================================================================================================================
type STab = 'uebersicht' | CollCat;
export function SammlungPanel() {
  const char = useStore(s => s.char);
  const start = useStore(s => s.sammlungTab);
  const home = useHome();
  const [tab, setTab] = useState<STab>((['uebersicht', ...COLL_CATS.map(c => c.id)].includes(start) ? start : 'uebersicht') as STab);
  if (!char) return null;
  const tabs: [STab, string, (number | string)?][] = [['uebersicht', 'Übersicht'], ...COLL_CATS.map(c => [c.id, c.name] as [STab, string])];
  return (
    <Window title="Sammlung" onClose={closePanel} class="win-sammlung" head={<Tabs tabs={tabs} value={tab} onChange={setTab} />}>
      {tab === 'uebersicht' ? <Overview char={char} home={home} go={setTab} />
        : tab === 'best' ? <Bestiary home={home} />
        : tab === 'fund' ? <Finds home={home} />
        : tab === 'rez' ? <RecipeList char={char} home={home} />
        : tab === 'tro' ? <TrophyList home={home} />
        : tab === 'begl' ? <Pets char={char} home={home} />
        : <Looks char={char} home={home} />}
    </Window>
  );
}

function Overview({ char, home, go }: { char: CharData; home: HomeData; go: (t: STab) => void }) {
  const lore = loreProgress(char), [have, total] = collTotal(home);
  const titles = ownedTitles(char), k = perksOf(home, char), mods = modEntries(k.mods);
  return (
    <div class="sam-over">
      <div class="sam-cats">
        {COLL_CATS.map(c => {
          const [a, b] = collCount(home, c.id);
          return (
            <button type="button" class="card sam-cat" onClick={() => { sfx('ui_tab'); go(c.id); }} {...tipProps(() => <div class="tip-text"><b>{c.name}</b>{c.hint}</div>)}>
              <div class="row between"><b>{c.name}</b><span class="note">{a} / {b}</span></div>
              <Bar kind="xp" v={a} max={b} label={false} />
            </button>
          );
        })}
        <button type="button" class="card sam-cat" onClick={() => { sfx('ui_tab'); togglePanel('quests'); }} {...tipProps(() => <div class="tip-text"><b>Chronik</b>Schriftstücke, Hüter-Erinnerungen und Entscheidungen stehen im Questlog unter „Chronik“ – sie gehören zu diesem Charakter und seiner Geschichte.</div>)}>
          <div class="row between"><b>Chronik</b><span class="note">{lore.found} / {lore.total}</span></div>
          <Bar kind="xp" v={lore.found} max={lore.total} label={false} />
          <small>im Questlog öffnen</small>
        </button>
      </div>
      <div class="sam-side">
        <div class="card">
          <div class="sec-title">Insgesamt <span class="pill gold-pill">{have} / {total}</span></div>
          <p class="note">Die Sammlung gehört deinem Profil: Alle deine Charaktere tragen dazu bei, und ein Neuer Kreis nimmt nichts davon weg.</p>
          {(mods.length > 0 || k.pickup !== 1 || k.rep !== 1 || k.maps !== 1) && <>
            <div class="sec-title">Wirkt gerade</div>
            <ul class="sam-perks">
              {mods.map(([m, v]) => <li>{fmtMod(m, v)}</li>)}
              {k.pickup !== 1 && <li>Beute wird aus {Math.round(k.pickup * 100)} % der üblichen Entfernung eingesammelt</li>}
              {k.rep !== 1 && <li>+{Math.round((k.rep - 1) * 100)} % Ruf</li>}
              {k.maps !== 1 && <li>Schatzkarten {k.maps}× so oft</li>}
              {k.rest > 0 && <li>„Ausgeruht“ hält {Math.round(k.rest * 100)} % länger</li>}
            </ul>
            <small>Begleiter und ausgestellte Trophäen</small>
          </>}
        </div>
        {titles.length > 0 && (
          <div class="card">
            <div class="sec-title">Titel</div>
            <div class="sam-titles">
              <Btn kind="small" class={cx(!char.title && 'on')} onClick={() => send({ t: 'title', id: '' })}>keiner</Btn>
              {titles.map(t => <Btn kind="small" class={cx(char.title === t && 'on')} title={TITLES[t]?.desc} onClick={() => send({ t: 'title', id: t })}>{TITLES[t]?.name ?? t}</Btn>)}
            </div>
          </div>
        )}
      </div>
      <div class="sam-ms">
        <div class="sec-title">Meilensteine</div>
        <ul>
          {MILESTONES.map(m => {
            const done = home.ms.includes(m.id), p = Math.min(m.need, milestoneProgress(home, m));
            return (
              <li class={cx('card', done && 'done')}>
                <div class="row between"><b>{m.name}</b><span class="note">{m.cat === 'alles' ? 'alle Einträge' : COLL_CATS.find(c => c.id === m.cat)!.name}: {p} / {m.need}</span></div>
                <div class="row between"><span class="note">{m.reward}</span>{done && <span class="pill gold-pill">erhalten</span>}</div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

const KIND_NAME: Record<Beast['kind'], string> = { mob: 'Gewöhnliche Wesen', named: 'Seltene Monster, Weltbosse und Besonderes', boss: 'Hüter und Bosse' };
function Bestiary({ home }: { home: HomeData }) {
  const [sel, setSel] = useState<string>(BESTIARY.find(b => beastKills(home, b) > 0)?.id ?? BESTIARY[0].id);
  const b = BESTIARY.find(x => x.id === sel) ?? BESTIARY[0], kills = beastKills(home, b), known = kills > 0, st = studied(home, b);
  return (
    <div class="sam-two">
      <div class="sam-list scroll">
        {(['mob', 'named', 'boss'] as const).map(kind => (
          <>
            <div class="sec-title">{KIND_NAME[kind]}</div>
            {BESTIARY.filter(x => x.kind === kind).map(x => {
              const n = beastKills(home, x);
              return (
                <button type="button" class={cx('craft-row', sel === x.id && 'on', !n && 'locked')} onClick={() => { sfx('ui_click'); setSel(x.id); }}>
                  <i class="sam-el" style={{ background: n ? ELEMENT_CSS[x.el] : '#444b66' }} />
                  <span class="craft-name grow"><b>{n ? x.name : '???'}</b></span>
                  <span class="note">{n ? `${fmtNum(n)}×` : ''}</span>
                </button>
              );
            })}
          </>
        ))}
      </div>
      <div class="sam-detail card">
        <h3>{known ? b.name : 'Unbekanntes Wesen'}</h3>
        <p class="note">{known ? b.where : 'Noch nie besiegt. Irgendwo da draußen läuft es herum und hält sich für ungesehen.'}</p>
        {known && <>
          <dl class="eg-facts sam-facts">
            <div><dt>Siege</dt><dd>{fmtNum(kills)}</dd></div>
            <div><dt>Element</dt><dd style={{ color: ELEMENT_CSS[b.el] }}>{ELEMENT_NAME[b.el]}</dd></div>
          </dl>
          <div class="sec-title">Schwächen und Resistenzen</div>
          {st ? (
            <p class="note">
              Schwach gegen: {b.weak.length ? b.weak.map(e => <b style={{ color: ELEMENT_CSS[e] }}> {ELEMENT_NAME[e]}</b>) : ' nichts Besonderes'}<br />
              Widersteht: {b.resist.length ? b.resist.map(e => <b style={{ color: ELEMENT_CSS[e] }}> {ELEMENT_NAME[e]}</b>) : ' nichts Besonderem'}
            </p>
          ) : <p class="note">Noch {studyNeed(b) - kills} Sieg{studyNeed(b) - kills === 1 ? '' : 'e'}, dann weißt du, wo es wehtut.</p>}
          <div class="sec-title">Beute</div>
          <div class="sam-drops">
            {b.drops.map(d => dropSeen(home, d)
              ? <span class="slot slot-sm slot-static" {...tipProps(() => <div class="tip-text"><b>{ITEMS[d].name}</b>{ITEMS[d].desc}</div>)} style={{ pointerEvents: 'auto' }}><Icon k={'item_' + ITEMS[d].icon} size={36} /></span>
              : <span class="slot slot-sm slot-static sam-unknown" {...tipProps(() => <div class="tip-text"><b>Unbekannte Beute</b>Zeigt sich, sobald du sie einmal in der Hand hattest.</div>)} style={{ pointerEvents: 'auto' }}>?</span>)}
            {b.drops.length === 0 && <span class="note">Nichts, was sich aufzuheben lohnt.</span>}
          </div>
          <small>Dazu wie überall: Gold, Tränke und Ausrüstung der Gegend.</small>
        </>}
      </div>
    </div>
  );
}

function Finds({ home }: { home: HomeData }) {
  const groups = [...new Set(FINDS.map(f => f.group))];
  return (
    <div class="sam-grid scroll">
      {groups.map(g => (
        <div class="card">
          <div class="sec-title">{g} <span class="pill">{FINDS.filter(f => f.group === g && home.seen['f:' + f.id]).length} / {FINDS.filter(f => f.group === g).length}</span></div>
          <ul class="sam-finds">
            {FINDS.filter(f => f.group === g).map(f => {
              const own = !!home.seen['f:' + f.id];
              return <li class={cx(!own && 'locked')} {...tipProps(() => <div class="tip-text"><b>{f.name}</b>{own ? 'Hat ein Charakter deines Profils schon besessen.' : f.how}</div>)}><Icon k={'item_' + f.icon} size={24} /><span>{f.name}</span></li>;
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function RecipeList({ char, home }: { char: CharData; home: HomeData }) {
  return (
    <div class="sam-grid scroll">
      <div class="card sam-wide">
        <div class="sec-title">Rezepte, die man lernen muss</div>
        <ul class="sam-finds sam-cols">
          {LEARNABLE.filter(r => !r.cls || r.cls === char.cls || home.seen['r:' + r.id]).map(r => {
            const own = !!home.seen['r:' + r.id], mine = !!char.recipes?.includes(r.id);
            return <li class={cx(!own && 'locked')} {...tipProps(() => <div class="tip-text"><b>{recipeLabel(r, char.cls)}</b>{mine ? `${char.name} kennt dieses Rezept.` : own ? 'Ein anderer Charakter deines Profils kennt es. Rezeptrollen lassen sich über die Lagertruhe weitergeben.' : r.src === 'ruf' ? 'Bei einem Fraktionshändler.' : r.src === 'welt' ? 'Aus Ereignissen, von seltenen Monstern oder der Fahrenden Händlerin.' : r.exclusive ? 'Eine besondere Belohnung.' : 'Rezeptrolle aus Truhen, von Erwachten oder Bossen.'}</div>)}>
              <Icon k="item_recipe" size={24} /><span>{recipeLabel(r, char.cls)}</span>{mine && <i class="sam-check">✓</i>}</li>;
          })}
        </ul>
      </div>
    </div>
  );
}

function TrophyList({ home }: { home: HomeData }) {
  return (
    <div class="sam-grid scroll">
      {TROPHY_CATS.map(c => (
        <div class="card">
          <div class="sec-title">{c.name} <span class="pill">{HOME_TROPHIES.filter(t => t.cat === c.id && ownsTrophy(home, t.id)).length} / {HOME_TROPHIES.filter(t => t.cat === c.id).length}</span></div>
          <ul class="sam-finds">
            {HOME_TROPHIES.filter(t => t.cat === c.id).map(t => {
              const own = ownsTrophy(home, t.id);
              return <li class={cx(!own && 'locked')} {...tipProps(() => <div class="tip-text"><b>{own ? t.name : '???'}</b>{own ? t.desc : t.how}</div>)}><Icon k={'item_' + t.icon} size={24} /><span>{own ? t.name : t.how}</span>{home.stands.includes(t.id) && <i class="sam-check" title="ausgestellt">◆</i>}</li>;
            })}
          </ul>
          <small>Ausgestellt: {c.perk}</small>
        </div>
      ))}
      <p class="note sam-wide">{home.owned ? 'Aufstellen kannst du Trophäen an den Ständern auf deinem Hof.' : 'Aufstellen lassen sich Trophäen auf einem eigenen Hof – Mirelda verkauft einen, sobald die Wurzelgruft hinter dir liegt.'}</p>
    </div>
  );
}

function Pets({ char, home }: { char: CharData; home: HomeData }) {
  return (
    <div class="sam-pets scroll">
      {PET_LIST.map(p => {
        const own = home.pets.includes(p.id), on = char.pet === p.id;
        return (
          <div class={cx('card sam-pet', !own && 'locked', on && 'on')}>
            <div class="sam-pet-pic"><PetSprite id={p.id} /></div>
            <div class="grow">
              <div class="row between"><b>{own ? p.name : '???'}</b>{on && <span class="pill gold-pill">läuft mit</span>}</div>
              <p class="note">{own ? p.desc : p.how}</p>
              {own && <p class="sam-pet-perk">{p.perk}</p>}
            </div>
            {own && <Btn kind={on ? 'small' : 'primary'} onClick={() => send({ t: 'home', a: 'pet', id: on ? '' : p.id })}>{on ? 'Zu Hause lassen' : 'Mitnehmen'}</Btn>}
          </div>
        );
      })}
      <p class="note sam-wide">Einer läuft mit – wechseln kannst du jederzeit und überall. Begleiter kämpfen nicht und können nicht verletzt werden.</p>
    </div>
  );
}

function Looks({ char, home }: { char: CharData; home: HomeData }) {
  const row = (id: string) => {
    const l = LOOKS[id], own = home.looks.includes(id), on = char.look?.g === id || char.look?.w === id;
    return (
      <li class={cx(!own && 'locked')} {...tipProps(() => <div class="tip-text"><b>{l.name}</b>{l.desc}<br />{l.how}</div>)}>
        {l.kind === 'g' ? <span class="hof-thumb"><Figure cls={char.cls} g={id} scale={1} /></span> : <i class="hof-swatch" style={{ background: hex(l.color) }} />}
        <span>{l.name}<small>{own ? (on ? 'angelegt' : 'freigeschaltet') : l.how}</small></span>
      </li>
    );
  };
  return (
    <div class="sam-grid scroll">
      <div class="card"><div class="sec-title">Gewänder</div><ul class="sam-finds sam-looks">{LOOK_LIST.filter(l => l.kind === 'g').map(l => row(l.id))}</ul></div>
      <div class="card"><div class="sec-title">Waffenglanz</div><ul class="sam-finds sam-looks">{LOOK_LIST.filter(l => l.kind === 'w').map(l => row(l.id))}</ul></div>
      <p class="note sam-wide">Angelegt wird am Kleiderschrank – auf dem eigenen Hof oder zu Besuch auf dem Hof eines Gruppenmitglieds.</p>
    </div>
  );
}

// =====================================================================================================================
//  EINSTIEGE: Kauf bei Mirelda · Heimreise auf der Weltkarte
// =====================================================================================================================
/** Gesprächsoption bei Mirelda: den Hof kaufen (solange das Profil keinen hat). */
export function HomeOption({ npc }: { npc: string }) {
  const char = useStore(s => s.char);
  const home = useHome();
  const [ask, setAsk] = useState(false);
  if (npc !== HOME_NPC || !char || home.owned) return null;
  const why = buyBlock(char, home), L = HOME_LEVELS[0];
  return (
    <>
      <button type="button" class="opt opt-craft" onClick={() => { sfx('ui_click'); setAsk(true); }}>
        <i class="opt-mark">⌂</i><span class="grow">Den Hof am Waldrand kaufen …</span>
      </button>
      {ask && <Confirm yes={why ? 'Verstanden' : `Kaufen (${CFG.home.price} Gold)`} no="Später" onNo={() => setAsk(false)}
        onYes={() => { if (!why) send({ t: 'home', a: 'buy', npc }); setAsk(false); }}
        text={<div class="hof-buy"><b>{L.name}</b><p class="note">{L.desc}</p><ul class="hof-adds">{L.adds.map(a => <li>{a}</li>)}</ul>{why && <p class="bad">{why}</p>}</div>} />}
    </>
  );
}
/** Weltkarte, am Quellstein: Reise auf den eigenen Hof (der Hof ist kein Gebiet der Karte). */
export function HomeTravel() {
  const owned = useStore(s => !!s.home?.owned), near = useStore(s => s.nearStone), at = useStore(s => !!s.heim?.own);
  if (!owned || at) return null;
  return <Btn kind="small" disabled={!near} title={near ? undefined : 'Nur an einem Quellstein'} sound="teleport" onClick={() => { send({ t: 'teleport', zone: HOME_ID }); closePanel(); }}>⌂ Nach Hause reisen</Btn>;
}
