/** Fähigkeitenbaum der Klasse mit Detailbereich und Belegung der Aktionsleiste. */
import { masteryOf } from '../../../../shared/src/data/hubdata';
import { useState } from 'preact/hooks';
import { keyHint } from '../../state/settings';
import type { Action } from '../../state/settings';
import { useStore } from '../../state/store';
import { CFG, ELEMENT_NAME } from '../../../../shared/src/config';
import { CLASSES } from '../../../../shared/src/data/classes';
import { SKILLS, skillCd, skillMp, skillsOf } from '../../../../shared/src/data/skills';
import type { Effect, SkillDef } from '../../../../shared/src/data/skills';
import { computeStats } from '../../../../shared/src/stats';
import { STATUS_NAME } from '../../../../shared/src/types';
import type { CharData, ModKey, Mods } from '../../../../shared/src/types';
import { Btn, ELEMENT_CSS, Icon, Window, closePanel, cx, fmtDec, fmtMod, send, sfx } from '../common';

const pct = (m: number) => Math.round(m * 100) + ' %';
function modsAt(base: Mods, perRank: Mods | undefined, rank: number): string[] {
  const keys = new Set<string>([...Object.keys(base), ...Object.keys(perRank ?? {})]);
  return [...keys].map(k => fmtMod(k as ModKey, ((base as any)[k] ?? 0) + ((perRank as any)?.[k] ?? 0) * (rank - 1)));
}
function effectLines(e: Effect, rank: number, power: number): string[] {
  const out: string[] = [];
  const m = 'mult' in e ? e.mult + e.multR * (rank - 1) : 0;
  const dmg = (label: string) => `${label}: ${pct(m)} des Angriffs (≈ ${Math.round(m * power)})`;
  switch (e.k) {
    case 'arc': out.push(dmg('Schaden')); if (e.healSelf) out.push(`Heilt dich um ${pct(e.healSelf)} des Schadens`); break;
    case 'spin': out.push(dmg('Schaden im Umkreis')); break;
    case 'proj':
      out.push(dmg(e.count > 1 ? `${e.count} Geschosse, Schaden je Treffer` : 'Schaden'));
      if (e.explode) out.push('Explodiert beim Einschlag');
      if ((e.pierce ?? 0) >= 99) out.push('Durchschlägt alle Gegner'); else if (e.pierce) out.push(`Durchschlägt bis zu ${e.pierce} Gegner`);
      break;
    case 'aoe': out.push(dmg('Flächenschaden')); if (e.delay >= 0.6) out.push(`Schlägt nach ${fmtDec(e.delay)} s ein`); break;
    case 'zone':
      out.push(dmg(`Schaden alle ${fmtDec(e.tick, 2)} s`)); out.push(`Dauer: ${fmtDec(e.dur)} s`);
      if (e.healAllies) out.push(`Heilt Verbündete je Tick um ${pct(e.healAllies)} des Angriffs`);
      break;
    case 'dash':
      if (m > 0) out.push(dmg('Schaden'));
      if (e.critBonus) out.push(`+${pct(e.critBonus)} Krit-Chance bei diesem Angriff`);
      break;
    case 'blink': out.push('Teleportiert dich in Blickrichtung'); break;
    case 'buff':
      out.push(`Dauer: ${fmtDec(e.dur + (e.durR ?? 0) * (rank - 1))} s${e.party ? ' · wirkt auf die Gruppe' : ''}`);
      out.push(...modsAt(e.mods, e.modsR, rank));
      if (e.shield) out.push(`Schild: ${pct(e.shield + (e.shieldR ?? 0) * (rank - 1))} des maximalen Lebens`);
      break;
    case 'heal': out.push(`Heilung: ${pct(m)} des Angriffs (≈ ${Math.round(m * power)})`); break;
  }
  if ('status' in e && e.status) out.push(`Verursacht ${STATUS_NAME[e.status.id]} (${fmtDec(e.status.dur)} s)`);
  return out;
}
function rankLines(sk: SkillDef, rank: number, char: CharData): string[] {
  const d = computeStats(char);
  if (sk.passive) return modsAt(Object.fromEntries(Object.entries(sk.passive).map(([k, v]) => [k, v * rank])) as Mods, undefined, 1);
  const out = [`Manakosten: ${skillMp(sk, rank)}`, `Abklingzeit: ${fmtDec(skillCd(sk, rank, d.cdr))} s`];
  for (const e of sk.effects ?? []) out.push(...effectLines(e, rank, d.power));
  return out;
}

const CW = 124, CH = 104, NODE = 60;
export function SkillsPanel() {
  const char = useStore(s => s.char);
  const [selId, setSel] = useState<string | null>(null);
  if (!char) return null;
  const list = skillsOf(char.cls);
  const sel = list.find(s => s.id === selId) ?? list.find(s => s.id === CLASSES[char.cls].startSkill) ?? list[0];
  const rank = char.skills[sel.id] ?? 0;
  const needLevel = sel.reqLevel + rank * 2;
  const reqSkill = sel.requires ? SKILLS[sel.requires] : null;
  const reqOk = !reqSkill || !!char.skills[reqSkill.id];
  const maxed = rank >= sel.maxRank;
  const canLearn = !maxed && char.skillPoints > 0 && char.level >= needLevel && reqOk;
  const why = maxed ? 'Höchster Rang erreicht' : !reqOk ? `Benötigt zuerst: ${reqSkill!.name}` : char.level < needLevel ? `Benötigt Stufe ${needLevel}` : char.skillPoints < 1 ? 'Keine Fähigkeitspunkte frei' : '';
  const active = !sel.passive;

  const assign = (slot: number) => {
    if (!active || rank < 1) { sfx('ui_error'); return; }
    const slots = [...char.hotbar];
    while (slots.length < CFG.player.hotbarSize) slots.push(null);
    const prev = slots.indexOf(sel.id);
    if (prev === slot) slots[slot] = null;
    else { if (prev >= 0) slots[prev] = slots[slot]; slots[slot] = sel.id; }
    sfx('ui_equip');
    send({ t: 'hotbar', slots });
  };
  const state = (s: SkillDef) => {
    const r = char.skills[s.id] ?? 0;
    if (r >= s.maxRank) return 'max';
    if (r > 0) return 'known';
    const ok = (!s.requires || !!char.skills[s.requires]) && char.level >= s.reqLevel;
    return ok ? 'open' : 'locked';
  };
  const cxy = (s: SkillDef) => [s.pos[0] * CW + CW / 2, s.pos[1] * CH + NODE / 2 + 6] as const;

  return (
    <Window title="Fähigkeiten" onClose={closePanel} class="win-skills"
      head={<span class={cx('pill', char.skillPoints > 0 && 'gold-pill')}>{char.skillPoints} Punkt{char.skillPoints === 1 ? '' : 'e'} frei</span>}>
      <div class="skp">
        <div class="tree-wrap">
          <div class="tree" style={{ width: CW * 3 + 'px', height: CH * 4 + 'px' }}>
            <svg class="tree-lines" width={CW * 3} height={CH * 4} aria-hidden="true">
              {list.filter(s => s.requires && SKILLS[s.requires]).map(s => {
                const [x2, y2] = cxy(s), [x1, y1] = cxy(SKILLS[s.requires!]);
                const on = !!char.skills[s.requires!];
                const my = (y1 + y2) / 2 + 14;
                return <path d={`M${x1} ${y1} V${my} H${x2} V${y2}`} class={cx('tree-line', on && 'on')} />;
              })}
            </svg>
            {list.map(s => {
              const r = char.skills[s.id] ?? 0, st = state(s);
              return (
                <button type="button" class={cx('node', st, s.passive && 'passive', sel.id === s.id && 'sel')} style={{ left: s.pos[0] * CW + 'px', top: s.pos[1] * CH + 'px', width: CW + 'px' }}
                  aria-label={`${s.name}, Rang ${r} von ${s.maxRank}`} onClick={() => { sfx('ui_click'); setSel(s.id); }}
                  onDblClick={() => { if (s.id === sel.id && canLearn) send({ t: 'learn', id: s.id }); }}>
                  <span class="node-icon"><Icon k={'skill_' + s.glyph} el={s.element} size={48} />{st === 'locked' && <i class="node-lock">{char.level < s.reqLevel ? `St. ${s.reqLevel}` : 'Vorstufe'}</i>}</span>
                  <span class="node-name">{s.name}</span>
                  <span class="pips">{Array.from({ length: s.maxRank }, (_, i) => <i class={cx(i < r && 'on')} />)}{Array.from({ length: masteryOf(char, s.id) }, () => <i class="on master" title="Meisterrang (Quellwarte)" />)}</span>
                </button>
              );
            })}
          </div>
          <div class="tree-legend note"><span><i class="lg round" /> Aktive Fähigkeit</span><span><i class="lg" /> Passiver Bonus</span></div>
        </div>

        <div class="sk-detail">
          <div class="card sk-card">
            <div class="sk-head">
              <Icon k={'skill_' + sel.glyph} el={sel.element} size={48} />
              <div class="grow">
                <h3>{sel.name}</h3>
                <div class="note">{sel.passive ? 'Passiv' : 'Aktiv'} · <span style={{ color: ELEMENT_CSS[sel.element] }}>{ELEMENT_NAME[sel.element]}</span> · Rang {rank} / {sel.maxRank}</div>
              </div>
            </div>
            <p class="sk-desc">{sel.desc}</p>
            <div class="sk-ranks">
              {rank > 0 && <div><h4>Rang {rank}</h4><ul>{rankLines(sel, rank, char).map(l => <li>{l}</li>)}</ul></div>}
              {!maxed && <div class="next"><h4>{rank > 0 ? `Nächster Rang (${rank + 1})` : 'Rang 1'}</h4><ul>{rankLines(sel, rank + 1, char).map(l => <li>{l}</li>)}</ul></div>}
            </div>
            <div class="sk-req">
              {!maxed && <span class={cx(char.level < needLevel && 'bad')}>Benötigt Stufe {needLevel}</span>}
              {reqSkill && <span class={cx(!reqOk && 'bad')}>Voraussetzung: {reqSkill.name}</span>}
            </div>
            <div class="row">
              <Btn kind="primary" disabled={!canLearn} onClick={() => send({ t: 'learn', id: sel.id })}>{rank > 0 ? 'Verbessern' : 'Lernen'} (1 Punkt)</Btn>
              {why && <span class="note">{why}</span>}
            </div>
          </div>

          <div class="card">
            <div class="sec-title">Aktionsleiste</div>
            <div class="hb-assign">
              {Array.from({ length: CFG.player.hotbarSize }, (_, i) => {
                const id = char.hotbar[i] ?? null, s = id ? SKILLS[id] : null;
                return (
                  <button type="button" class={cx('hslot', !s && 'empty', id === sel.id && 'cur')} aria-label={`Platz ${i + 1}: ${s ? s.name : 'leer'}`} title={s ? s.name : 'Leerer Platz'} onClick={() => assign(i)}>
                    {s ? <Icon k={'skill_' + s.glyph} el={s.element} size={48} /> : <span class="hslot-plus">+</span>}
                    <span class="hslot-key">{keyHint(('skill' + (i + 1)) as Action)}</span>
                  </button>
                );
              })}
            </div>
            <div class="note">
              {!active ? 'Passive Boni wirken immer und brauchen keinen Platz.' : rank < 1 ? 'Lerne die Fähigkeit, um sie auf die Leiste zu legen.' : <>Klicke einen Platz, um <b>{sel.name}</b> dort abzulegen. Ein Klick auf den eigenen Platz entfernt sie wieder.</>}
            </div>
          </div>
        </div>
      </div>
    </Window>
  );
}
