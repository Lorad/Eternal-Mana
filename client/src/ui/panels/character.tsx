/** Charakterbogen: Attribute, abgeleitete Werte, Statistik. */
import { useStore } from '../../state/store';
import { CFG, ELEMENT_NAME } from '../../../../shared/src/config';
import { CLASSES } from '../../../../shared/src/data/classes';
import { ZONE_LIST } from '../../../../shared/src/data/zones';
import { computeStats, countShards } from '../../../../shared/src/stats';
import { ATTR_NAME } from '../../../../shared/src/types';
import type { AttrKey } from '../../../../shared/src/types';
import { Bar, Btn, ELEMENT_CSS, Portrait, Window, closePanel, cx, fmtDec, fmtNum, fmtTime, send } from '../common';

const ATTR_HELP: Record<AttrKey, string> = {
  str: 'Erhöht Angriff (Nahkampfklassen) und etwas Verteidigung.',
  dex: 'Erhöht Angriff (Fernkampf, Dolche) und die Chance auf kritische Treffer.',
  int: 'Erhöht Zauberangriff, maximales Mana und Mana-Regeneration.',
  vit: 'Erhöht Leben, Verteidigung und Lebensregeneration.',
};

export function CharacterPanel() {
  const char = useStore(s => s.char);
  if (!char) return null;
  const cls = CLASSES[char.cls];
  const d = computeStats(char);
  const need = CFG.xpToNext(char.level);
  const maxed = char.level >= CFG.player.maxLevel;
  const shards = countShards(char);
  const shardMax = ZONE_LIST.filter(z => z.kind === 'overworld').length * CFG.world.shardsPerZone;
  const mitig = CFG.combat.mitigation(d.def, char.level);
  const w = cls.powerWeights;
  const stats: [string, string, string][] = [
    ['Leben', fmtNum(d.maxHp), 'Maximale Lebenspunkte.'],
    ['Mana', fmtNum(d.maxMp), 'Vorrat für Fähigkeiten. Standardangriffe füllen Mana auf.'],
    ['Angriff', fmtDec(d.power), 'Grundlage für den Schaden aller Angriffe und Fähigkeiten.'],
    ['Verteidigung', fmtDec(d.def), `Verringert erlittenen Schaden – gegen gleichstufige Gegner um etwa ${Math.round(mitig * 100)} %.`],
    ['Krit-Chance', fmtDec(d.crit * 100) + ' %', 'Chance auf einen kritischen Treffer.'],
    ['Krit-Schaden', Math.round(d.critDmg * 100) + ' %', 'Schaden kritischer Treffer im Verhältnis zum normalen Treffer.'],
    ['Tempo', Math.round((d.speed / CFG.player.baseSpeed) * 100) + ' %', 'Laufgeschwindigkeit.'],
    ['Lebensregeneration', fmtDec(d.hpRegen) + ' /s', 'Außerhalb des Kampfes deutlich stärker.'],
    ['Mana-Regeneration', fmtDec(d.mpRegen) + ' /s', 'Mana, das jede Sekunde zurückkehrt.'],
    ['Abklingzeit-Reduktion', fmtDec(d.cdr) + ' %', 'Verkürzt die Abklingzeit aller Fähigkeiten (höchstens 40 %).'],
    ['Ausweichrolle', fmtDec(d.dodgeCd, 2) + ' s', 'Abklingzeit der Ausweichrolle.'],
    ['Lebensraub', fmtDec(d.lifesteal) + ' %', 'Anteil des verursachten Schadens, der dich heilt.'],
    ['Elementarschaden', '+' + fmtDec(d.elemPct) + ' %', 'Bonus auf jeden Schaden, der nicht physisch ist.'],
    ['Heilung', '+' + fmtDec(d.healPct) + ' %', 'Verstärkt deine Heilfähigkeiten.'],
    ['Goldfund', '+' + fmtDec(d.goldPct) + ' %', 'Mehr Gold von Gegnern.'],
    ['Erfahrung', '+' + fmtDec(d.xpPct) + ' %', 'Mehr Erfahrungspunkte.'],
  ];
  return (
    <Window title="Charakter" onClose={closePanel} class="win-char">
      <div class="charp">
        <div class="charp-left">
          <div class="charp-hero">
            <div class="char-stage"><Portrait k={'char_' + char.cls} scale={3} /></div>
            <div class="grow">
              <h3 class="charp-name">{char.name}</h3>
              <div class="charp-cls">Stufe {char.level} · {cls.name}</div>
              <div class="note">{cls.tagline}</div>
            </div>
          </div>
          <div>
            <div class="row between note"><span>Erfahrung</span><span>{maxed ? 'Höchststufe' : `noch ${fmtNum(need - char.xp)} bis Stufe ${char.level + 1}`}</span></div>
            <Bar kind="xp" v={maxed ? 1 : char.xp} max={maxed ? 1 : need} label={maxed ? 'MAX' : `${fmtNum(char.xp)} / ${fmtNum(need)} EP`} />
          </div>

          <div class="sec-title">Attribute {char.attrPoints > 0 && <span class="pill gold-pill">{char.attrPoints} Punkt{char.attrPoints > 1 ? 'e' : ''} frei</span>}</div>
          <ul class="attr-list">
            {(Object.keys(ATTR_NAME) as AttrKey[]).map(a => {
              const bonus = d.attrs[a] - char.attrs[a];
              return (
                <li>
                  <div class="grow">
                    <div class="attr-head"><b>{ATTR_NAME[a]}</b>{(w as any)[a] ? <span class="pill">Hauptwert ×{(w as any)[a]}</span> : null}</div>
                    <small>{ATTR_HELP[a]}</small>
                  </div>
                  <span class="attr-val">{d.attrs[a]}{bonus > 0 && <small class="good"> (+{bonus})</small>}</span>
                  <Btn kind="primary" class="attr-plus" disabled={char.attrPoints < 1} ariaLabel={`${ATTR_NAME[a]} erhöhen`} title="1 Punkt vergeben" onClick={() => send({ t: 'attr', a })}>+</Btn>
                  <Btn class="attr-plus" disabled={char.attrPoints < 5} title="5 Punkte vergeben" ariaLabel={`${ATTR_NAME[a]} um 5 erhöhen`} onClick={() => send({ t: 'attr', a, n: 5 })}>+5</Btn>
                </li>
              );
            })}
          </ul>
          <div class="note">Je Stufenaufstieg erhältst du {CFG.player.attrPointsPerLevel} Attributspunkte und {CFG.player.skillPointsPerLevel} Fähigkeitspunkt. Fenwick in Quellhain setzt alles gegen Gold zurück.</div>
        </div>

        <div class="charp-right">
          <div class="sec-title">Werte</div>
          <ul class="stat-list">
            {stats.map(([name, val, help]) => (
              <li title={help}><span>{name}<small>{help}</small></span><b>{val}</b></li>
            ))}
            <li><span>Angriffselement<small>Bestimmt durch deine Waffe.</small></span><b style={{ color: ELEMENT_CSS[d.attackElement] }}>{ELEMENT_NAME[d.attackElement]}</b></li>
          </ul>
          <div class="sec-title">Chronik</div>
          <ul class={cx('stat-list', 'compact')}>
            <li><span>Spielzeit</span><b>{fmtTime(char.playtime)}</b></li>
            <li><span>Besiegte Gegner</span><b>{fmtNum(char.kills)}</b></li>
            <li><span>Niederlagen</span><b>{fmtNum(char.deaths)}</b></li>
            <li><span>Quellsplitter<small>Jeder Splitter: +4 Leben, +2 Mana – dauerhaft.</small></span><b>{shards} / {shardMax}</b></li>
          </ul>
        </div>
      </div>
    </Window>
  );
}
