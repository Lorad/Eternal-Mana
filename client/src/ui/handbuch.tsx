/**
 * Handbuch (0.8): jedes System auf einer Seite. Zahlen und Listen kommen aus denselben Daten, mit denen das Spiel rechnet
 * (shared/src/config.ts und shared/src/data/*) – ändert sich dort etwas, steht es hier von selbst richtig.
 * Erreichbar über das Menü, die Taste „Handbuch“ (Standard H oder F1) und aus jedem Hinweis heraus.
 */
import { HubHelp } from './hub';
import type { ComponentChildren } from 'preact';
import { CFG, ELEMENTS, ELEMENT_NAME, RARITY_COLOR, RARITY_NAME, strongAgainst } from '../../../shared/src/config';
import { LORE_DOCS } from '../../../shared/src/data/chronik';
import { CLASSES, CLASS_IDS } from '../../../shared/src/data/classes';
import { MILESTONES } from '../../../shared/src/data/collection';
import { EVENTS, SEASON_EFFECT, SEASON_GLYPH, SEASON_NAMES } from '../../../shared/src/data/events';
import { FACTION_LIST, RANK_NAMES, REP_SOURCES } from '../../../shared/src/data/factions';
import { HOME_LEVELS, HOME_TROPHIES, TROPHY_CATS } from '../../../shared/src/data/home';
import { LOOK_LIST } from '../../../shared/src/data/looks';
import { DEPTH_CFG, ENDGAME_LIST, ENDGAME_TITLES } from '../../../shared/src/data/expeditions_endgame';
import { BOSSES } from '../../../shared/src/data/enemies';
import { NPCS } from '../../../shared/src/data/npcs';
import { PET_LIST } from '../../../shared/src/data/pets';
import { RARE_LIST, WORLD_BOSS_LIST } from '../../../shared/src/data/rares';
import { ENCHANT_LIST, RECIPE_LIST, STATION_NAME, STATION_NPCS, type StationId } from '../../../shared/src/data/recipes';
import { QUELL_MAX, QUELL_TRACKS, RIFT_DUNGEONS, RIFT_MOD_LIST, TRIAL_BOSSES, TRIAL_NAME } from '../../../shared/src/data/rifts';
import { SET_FULL, SET_LIST } from '../../../shared/src/data/sets';
import { CINES, DECISIONS } from '../../../shared/src/data/story';
import { ZONES, ZONE_LIST } from '../../../shared/src/data/zones';
import { ELEMENT_INFO, REACTIONS } from '../../../shared/src/elements';
import { PARTY_RULES } from '../../../shared/src/social';
import type { Element } from '../../../shared/src/types';
import { ACTION_LABEL, DEFAULT_PAD, KEY_GROUPS, PAD_NAME, keyConflicts, keyName, unboundActions, type Action } from '../state/keys';
import { HELP_TITLE, HELP_TOPICS, HINTS, type HelpTopicId } from '../state/hints';
import { updateSettings } from '../state/settings';
import { store, useStore } from '../state/store';
import { Btn, ELEMENT_CSS, Kbd, Window, cx, fmtNum, sfx, useSettings } from './common';

const pct = (v: number) => fmtNum(Math.round(v * 100)) + ' %';
const sec = (v: number) => (v >= 120 ? fmtNum(Math.round(v / 60)) + ' Minuten' : String(v).replace('.', ',') + ' Sekunden');
const El = ({ e }: { e: Element }) => <b style={{ color: ELEMENT_CSS[e] }}>{ELEMENT_NAME[e]}</b>;
function H({ children }: { children: ComponentChildren }) { return <div class="sec-title">{children}</div>; }
/** Zeilen „Begriff – Erklärung“ */
function Facts({ rows }: { rows: [ComponentChildren, ComponentChildren][] }) {
  return <dl class="hb-facts">{rows.map(([a, b]) => <><dt>{a}</dt><dd>{b}</dd></>)}</dl>;
}
function K({ a }: { a: Action }) {
  const s = useSettings();
  const k = s.keys[a]?.[0];
  return <Kbd>{k ? keyName(k) : '—'}</Kbd>;
}

interface Chapter<T extends HelpTopicId = HelpTopicId> { id: T; title: string; body: () => ComponentChildren }
/** Kapitel anlegen: Kennung und Titel stehen in state/hints.ts (`HELP_TOPICS`), damit Hinweise nur auf vorhandene Kapitel zeigen. */
const ch = <T extends HelpTopicId>(id: T, body: () => ComponentChildren): Chapter<T> => ({ id, title: HELP_TITLE[id], body });

const stationWho = (st: StationId) => Object.keys(STATION_NPCS).filter(n => STATION_NPCS[n].includes(st)).map(n => NPCS[n]?.name ?? n).join(', ');
const regions = ZONE_LIST.filter(z => z.kind === 'overworld');

function Keys() {
  const s = useSettings();
  const clash = keyConflicts(s.keys), free = unboundActions(s.keys);
  return (
    <>
      <div class="hb-cols">
        <div>
          <H>Tastatur und Maus</H>
          <div class="help-keys">
            <div class="key-row"><span class="grow">Zielen</span><span class="note">Mauszeiger</span></div>
            {KEY_GROUPS.map(([title, acts]) => (
              <>
                <h4>{title}</h4>
                {acts.map(a => <div class="key-row"><span class="grow">{ACTION_LABEL[a]}</span>{(s.keys[a] ?? []).length ? s.keys[a].map(k => <Kbd>{keyName(k)}</Kbd>) : <span class="note bad">nicht belegt</span>}</div>)}
              </>
            ))}
          </div>
        </div>
        <div>
          <H>Gamepad</H>
          <div class="help-keys">
            <div class="key-row"><span class="grow">Bewegen</span><Kbd>Linker Stick</Kbd></div>
            <div class="key-row"><span class="grow">Zielen</span><Kbd>Rechter Stick</Kbd></div>
            {(Object.entries(DEFAULT_PAD) as [Action, number][]).sort((a, b) => a[1] - b[1]).map(([a, b]) => <div class="key-row"><span class="grow">{ACTION_LABEL[a]}</span><Kbd>{PAD_NAME[b] ?? b}</Kbd></div>)}
          </div>
          <p class="note">Gruppe, Ruf und Welt, Sammlung und Handbuch öffnest du mit dem Gamepad über <b>Start</b> (Menü). Mehr dazu im Kapitel „Gamepad“.</p>
          <H>Gut zu wissen</H>
          <ul class="tips">
            <li><b>Esc</b> schließt immer das oberste Fenster – auch wenn du „Menü“ auf eine andere Taste legst.</li>
            <li>Tasten änderst du unter <b>Einstellungen → Tastenbelegung</b>. Eine Taste gehört immer nur einer Aktion: Wer sie neu vergibt, nimmt sie der alten weg.</li>
            {clash.length > 0 && <li class="bad">Doppelt belegt: {clash.map(c => `${keyName(c.code)} (${c.actions.map(a => ACTION_LABEL[a]).join(', ')})`).join(' · ')}</li>}
            {free.length > 0 && <li class="bad">Ohne Taste: {free.map(a => ACTION_LABEL[a]).join(', ')}</li>}
          </ul>
        </div>
      </div>
    </>
  );
}

function HintsBox() {
  const s = useSettings();
  return (
    <div class="card hb-hints">
      <div class="grow"><b>Hinweise</b><div class="note">{s.hints ? `Kurze Erklärungen erscheinen, wenn etwas zum ersten Mal wichtig wird (${s.hintsSeen.length} von ${HINTS.length} gesehen).` : 'Hinweise sind abgeschaltet.'}</div></div>
      <Btn kind="small" onClick={() => updateSettings({ hints: !s.hints })}>{s.hints ? 'Abschalten' : 'Einschalten'}</Btn>
      <Btn kind="small" disabled={!s.hintsSeen.length} onClick={() => updateSettings({ hintsSeen: [], hints: true })}>Alle noch einmal zeigen</Btn>
    </div>
  );
}

const ALL = [
  ch('start', () => (
    <>
      <p>Du bist ein Quellgänger. In Quellhain sinkt der Brunnen – finde heraus, warum. Das Spiel führt dich über Aufgaben von Ort zu Ort; verlaufen kann man sich, verpassen kaum etwas.</p>
      <Facts rows={[
        [<>Gelbes <b class="hb-q">!</b></>, <>Hier gibt es eine Aufgabe. Hingehen und <K a="interact" /> drücken.</>],
        [<>Gelbes <b class="hb-q">?</b></>, 'Hier gibst du eine erfüllte Aufgabe ab und bekommst die Belohnung.'],
        ['Questverfolgung', <>Rechts im Bild stehen deine nächsten Ziele. <K a="tracker" /> klappt sie ein und aus, ein Klick öffnet das Questlog (<K a="quests" />). In Mana-Riss, Expedition und Bosskampf klappt sie sich von selbst ein.</>],
        ['Questzeichen', <>Über den Köpfen: <b>!</b> – eine Quest oder ein wichtiges Gespräch wartet, <b>?</b> – eine Quest ist bereit zum Abgeben, graues <b>?</b> – läuft noch. Die Farbe zeigt die Art: <b style={{ color: '#ffd23e' }}>gold</b> Hauptquest, <b style={{ color: '#8fdc4e' }}>grün</b> Nebenquest, <b style={{ color: '#58a6ea' }}>blau</b> wiederholbar.</>],
        ['Karte', <>Oben rechts die Umgebung, mit <K a="map" /> die ganze Welt. Marken zeigen Auftraggeber, Ausgänge, Quellsteine und Ereignisse.</>],
        ['Quellsteine', 'Berühren heilt, setzt deinen Rückkehrpunkt und schaltet den Stein für die Schnellreise frei (Weltkarte, während du an einem Quellstein stehst).'],
        ['Speichern', `Automatisch alle ${CFG.save.autosaveSec} Sekunden, bei jedem Zonenwechsel, Questabschluss und Bosssieg. Du musst nichts tun.`],
        ['Niederlage', `Du erwachst am letzten Quellstein (im Dungeon am Eingang) und verlierst ${pct(CFG.player.deathGoldLoss)} deines Goldes. Mitspieler können dir vorher aufhelfen.`],
      ]} />
      <HintsBox />
    </>
  )),
  ch('steuerung', () => <Keys />),
  ch('kampf', () => (
    <>
      <p>Kämpfe sind kurz und entscheiden sich über Position. Gegner kündigen ihre Angriffe an – mit einer Ausholbewegung oder roten Flächen am Boden.</p>
      <Facts rows={[
        ['Angriff', <><K a="attack" /> gedrückt halten. Bei Nahkämpfern endet jede dritte Folge in einem stärkeren Hieb (×{String(CFG.player.comboFinisherMul).replace('.', ',')}). Treffer füllen Mana auf.</>],
        ['Ausweichrolle', <><K a="dodge" /> – {sec(CFG.player.dodgeIFrames)} unverwundbar, danach {sec(CFG.player.dodgeCooldown)} Pause. Rolle durch Angriffe hindurch, nicht davon weg.</>],
        ['Fähigkeiten', <><K a="skill1" /> bis <K a="skill4" /> – kosten Mana und haben eine Abklingzeit. Gezielt wird mit der Maus; mit Tastatur oder Gamepad zielt das Spiel auf Wunsch von selbst (Einstellungen).</>],
        ['Tränke', <><K a="potionHp" /> Heiltrank, <K a="potionMp" /> Manatrank – gemeinsame Abklingzeit von {sec(CFG.player.potionCooldown)}.</>],
        ['Kritische Treffer', `Grundchance ${pct(CFG.combat.baseCrit)}, Schaden ×${String(CFG.combat.baseCritDmg).replace('.', ',')}; mehr über Geschick und Ausrüstung.`],
        ['Erwachte', `Etwa jeder ${Math.round(1 / CFG.enemy.eliteChance)}. Gegner ist ein Erwachter: mehr Leben und Schaden, dafür deutlich bessere Beute.`],
        ['Zielanzeige', 'Oben in der Mitte stehen Name, Stufe und Element deines Ziels – und wogegen es schwach ist oder was es abwehrt.'],
        ['Bosse', 'Drei Phasen (bei zwei Dritteln und einem Drittel Leben). Das Tor schließt sich; scheitert ihr, setzt sich der Boss zurück.'],
      ]} />
    </>
  )),
  ch('elemente', () => (
    <>
      <div class="elem-cycle card">
        <div class="cycle-row">{(['fire', 'wind', 'earth', 'water'] as Element[]).map(e => <><El e={e} /><i>›</i></>)}<El e="fire" /></div>
        <div class="cycle-row"><El e="light" /><i>↔</i><El e="dark" /></div>
        <small>Überlegen: {pct(CFG.combat.elemStrong)} Schaden · unterlegen: {pct(CFG.combat.elemWeak)} · Gleiches gegen Gleiches: {pct(CFG.combat.elemSame)}. Ausdrückliche Schwächen eines Gegners zählen zusätzlich ×{String(CFG.elements.weakMul).replace('.', ',')}, Resistenzen ×{String(CFG.elements.resistMul).replace('.', ',')}.</small>
      </div>
      <div class="hb-cols">
        <div>
          <H>Zustand je Element</H>
          <Facts rows={ELEMENTS.map(e => [<El e={e} />, <>{ELEMENT_INFO[e as Exclude<Element, 'phys'>]}{strongAgainst(e) ? <span class="note"> · stark gegen {ELEMENT_NAME[strongAgainst(e)!]}</span> : null}</>])} />
          <p class="note">Deine eigenen Resistenzen (Ausrüstung, Runen, Sets, Elixiere) wirken bis höchstens {CFG.elements.resCap} %.</p>
        </div>
        <div>
          <H>Reaktionen</H>
          <p class="note">Trägt ein Gegner den Zustand eines Elements und trifft ihn ein zweites, reagieren beide. Danach ist das Ziel {CFG.elements.reactCd} s (Bosse {CFG.elements.reactCdBoss} s) gesperrt. Stammen die Elemente von zwei Spielern, wirkt es {pct(CFG.elements.duoMul - 1)} stärker und beide erhalten „Einklang“ (+{CFG.elements.duoBuff.powerPct} % Angriff).</p>
          <Facts rows={REACTIONS.map(r => [<b style={{ color: r.color }}>{r.name}</b>, <><El e={r.pair[0]} /> + <El e={r.pair[1]} /> – {r.desc}</>])} />
        </div>
      </div>
    </>
  )),
  ch('charakter', () => (
    <>
      <Facts rows={[
        ['Stufen', `Bis Stufe ${CFG.player.maxLevel}. Je Stufe ${CFG.player.attrPointsPerLevel} Attributspunkte und ${CFG.player.skillPointsPerLevel} Fähigkeitspunkt.`],
        ['Attribute', <>Stärke, Geschick, Intelligenz, Vitalität – im Fenster Charakter (<K a="character" />). Dort stehen auch alle errechneten Werte.</>],
        ['Fähigkeiten', <>Im Fenster Fähigkeiten (<K a="skills" />): sechs aktive und drei passive je Klasse. Gelernte aktive Fähigkeiten legst du auf einen der {CFG.player.hotbarSize} Plätze der Aktionsleiste.</>],
        ['Zurücksetzen', `Fenwick in Quellhain erstattet alle Punkte – für ${CFG.respecGold(1)} Gold je Stufe.`],
        ['Quellsplitter', `In jeder Region sind ${CFG.world.shardsPerZone} versteckt. Jeder erhöht dauerhaft Leben und Mana.`],
      ]} />
      <H>Klassen</H>
      <Facts rows={CLASS_IDS.map(id => [CLASSES[id].name, CLASSES[id].tagline])} />
    </>
  )),
  ch('beute', () => (
    <>
      <p>Beute ist immer persönlich: Was du siehst, gehört dir. Im Inventar (<K a="inventory" />) legt ein Doppelklick an; der Tooltip vergleicht mit dem, was du trägst. Der Rucksack fasst {CFG.player.invSize} Gegenstände (Stapel zählen einmal).</p>
      <Facts rows={[
        ['Plätze', 'Zehn: Hauptwaffe, Zweithand (Schild bei Krieger und Paladin, Köcher beim Waldläufer, Foliant oder Fokus beim Magier, Parierdolch beim Schattenjäger), Helm, Brust, Handschuhe, Beine, Schuhe, Amulett (auch Talisman) und zwei Ringe.'],
        ['Seltenheit', <>{RARITY_NAME.map((n, i) => <><b style={{ color: RARITY_COLOR[i] }}>{n}</b>{i < RARITY_NAME.length - 1 ? ' · ' : ''}</>)} – mit {CFG.loot.affixCount.join('/')} zufälligen Eigenschaften.</>],
        ['Verbessern', <>Schmiede werten bis +{CFG.upgrade.max} auf (je Stufe +{pct(CFG.upgrade.statPerLevel)} Grundwerte). Jede Stufe gelingt – nichts wird zerstört, nichts fällt zurück, nichts geht verloren; nur die Kosten steigen: ab +4 Essenzen, ab +7 Bosskerne, für +10 Ätherstaub. Bei +3, +6 und +9 kommt je eine feste Eigenschaft dazu, bei +10 eine kleine Wirkung je Art des Teils.</>],
        ['Verkaufen', `Händler zahlen ${pct(CFG.loot.sellFactor)} des Wertes. Doppelklick im Reiter „Verkaufen“ verkauft den ganzen Stapel. Unterwegs – auch im Dungeon – zieh Gegenstände im Inventar ins Feld „Verkauf“ (oder Umschalt+Klick) und verkaufe alles auf einmal zum selben Preis; bei wertvollen Stücken fragt das Spiel nach.`],
        ['Sets', `${SET_LIST.length} Rüstungssets (je Dungeon eines) aus ${SET_FULL} Teilen: 2 Teile schützen, 4 Teile stärken eine Fähigkeit deiner Klasse, alle ${SET_FULL} schalten eine eigene Wirkung frei.`],
        ['Legendäre Waffen', `Eine je Klasse, mit eigener Wirkung – geschmiedet aus allen Bosskernen (ab Gegenstandsstufe ${CFG.craft.legendMinIlvl}).`],
        ['Liegengebliebenes', `Beute am Boden verschwindet nach ${sec(CFG.loot.dropLifetimeSec)}. Ist das Inventar voll, bleibt sie liegen.`],
      ]} />
    </>
  )),
  ch('handwerk', () => (
    <>
      <p>Keine Berufe, keine eigene Währung: Rezept, Rohstoffe, Gold, die richtige Station – fertig. Zurzeit gibt es {RECIPE_LIST.length} Rezepte und {ENCHANT_LIST.length} Runen. Die meisten kennst du von Anfang an, weitere lernst du aus Rezeptrollen (Erwachte, Truhen, Bosse, Ruf).</p>
      <H>Stationen</H>
      <Facts rows={(Object.keys(STATION_NAME) as StationId[]).map(st => [STATION_NAME[st], <>{stationWho(st)}{st === 'cooking' ? ' und jedes Lagerfeuer' : ''}. {({ forge: 'Ausrüstung herstellen, umschmieden (Eigenschaften neu würfeln), ein Element einschmieden; im Gespräch außerdem verbessern.', alchemy: `Tränke und Elixiere. Ein Elixier wirkt ${sec(CFG.craft.elixirSec)}, immer nur eines zugleich.`, cooking: `Speisen aus den Zutaten der Region. Eine Speise wirkt ${sec(CFG.craft.foodSec)}, immer nur eine zugleich.`, enchant: 'Eine Rune je Ausrüstungsteil, bezahlt mit Essenzen.' } as Record<StationId, string>)[st]}</>])} />
      <H>Rohstoffe</H>
      <Facts rows={[
        ['Erz und Kraut', 'An Abbaustellen in der Welt – je Region eine Sorte.'],
        ['Monster-Rohstoff und Zutat', `Von Gegnern der Region (etwa ${pct(CFG.loot.monsterMatChance)} bzw. ${pct(CFG.loot.ingredientChance)} je Sieg; Erwachte ×${String(CFG.loot.eliteMatMul).replace('.', ',')}).`],
        ['Essenzen', 'Von Gegnern des jeweiligen Elements. Nötig zum Einschmieden und Verzaubern.'],
        ['Bosskerne', `Beim ersten Sieg garantiert, danach ${pct(CFG.loot.bossCoreRepeat)}. Für Setteile und Legendäre Waffen.`],
      ]} />
      <p class="note">Im Fenster steht bei jedem Rezept, was fehlt. Speise und Elixier überstehen Tod und Abmelden.</p>
    </>
  )),
  ch('welt', () => (
    <>
      <H>Regionen</H>
      <Facts rows={regions.map(z => { const d = ZONE_LIST.filter(x => x.kind === 'dungeon' && x.parent === z.id); return [z.name, `Stufe ${z.level[0]}–${z.level[1]}${d.length ? ' · Dungeon: ' + d.map(x => x.name).join(', ') : ''}`]; })} />
      <H>Dungeons</H>
      <ul class="tips">
        <li>Eine bewachte Truhe enthält den <b>Schlüssel</b> für die verschlossene Tür auf dem Hauptweg.</li>
        <li><b>Brüchige Felsblockaden</b> zertrümmerst du mit Angriffen – dahinter liegen Truhen, Quellsplitter oder Abkürzungen.</li>
        <li><b>Rätselräume</b> (Fackeln, Hebel, Druckplatten) öffnen eine Bonustruhe. Allein lösbar, zu mehreren leichter.</li>
        <li>Leere Dungeons setzen sich nach {sec(CFG.world.dungeonResetSec)} zurück und lassen sich beliebig wiederholen.</li>
        <li>Ein Tag dauert {sec(CFG.world.dayLengthSec)}. Höhlen und Dungeons sind immer dunkel; Licht bringen Feuerschalen, Kristalle und du selbst.</li>
      </ul>
    </>
  )),
  ch('geschichte', () => (
    <>
      <Facts rows={[
        ['Gespräche', 'Figuren haben Gesprächsthemen (❝). Antworten mit „!“ sind Entscheidungen: Sie werden gespeichert und ändern spätere Gespräche und den Epilog.'],
        ['Entscheidungen', `${Object.keys(DECISIONS).length} im Lauf der Geschichte – und am Ende eine große mit drei möglichen Ausgängen, einer davon verborgen.`],
        ['Filmszenen', <>{Object.keys(CINES).length} kurze Szenen. „Weiter“ (oder <K a="interact" />, Enter) blättert; <b>Esc zweimal</b> überspringt die ganze Szene. Deine Figur ist währenddessen geschützt.</>],
        ['Chronik', <>{LORE_DOCS.length} Schriftstücke liegen in der Welt. Gelesenes steht im Questlog (<K a="quests" />) unter „Chronik“. Wer liest, bekommt mancherorts andere Antworten.</>],
        ['Hüter-Erinnerungen', 'An den Hüterschreinen des zweiten Akts. Wer alle findet, hat am Ende eine Wahl mehr.'],
      ]} />
      <p class="note">Die Geschichte hat zwei Akte: Akt I führt durch die sechs Regionen, Akt II (ab Kapitel 7) beginnt nach dem Sieg über den Hohlen König wieder in Quellhain.</p>
    </>
  )),
  ch('endspiel', () => (
    <>
      <p>Nach dem Sieg über den Hohlen König erwacht der <b>Riss-Stein</b> in Quellhain. Das Endspiel-Fenster öffnest du dort oder über den Knopf unter deinem Rahmen.</p>
      <div class="hb-cols">
        <div>
          <H>Mana-Risse</H>
          <Facts rows={[
            ['Stufen', `1 bis ${CFG.rift.maxStufe}, in jedem der ${RIFT_DUNGEONS.length} Dungeons des ersten Akts. Wer Stufe n schafft, schaltet n+1 frei.`],
            ['Gegner', `Stufe ${CFG.rift.mobLevel(1)} (Riss-Stufe 1) bis ${CFG.rift.mobLevel(CFG.rift.maxStufe)}; am Ende wartet das Echo des Bosses.`],
            ['Modifikatoren', `Einer, ab Stufe 10 zwei, ab Stufe 20 drei – vor dem Betreten zu sehen.`],
            ['Richtzeit', 'Wer darunter bleibt, bekommt eine Bonustruhe. Langsam sein beendet nichts.'],
            ['Lebensfunken', `${CFG.rift.revives}, je weiterem Mitglied ${CFG.rift.revivesPerExtra} mehr. Wiederkehr am Eingang kostet einen, Aufhelfen nichts.`],
            ['Beute', `Gegenstandsstufe ${CFG.rift.ilvl(1)}–${CFG.rift.ilvl(CFG.rift.maxStufe)}, Echo-Fragmente (zum Angleichen an der Schmiede), Ätherstaub.`],
            [TRIAL_NAME, `Ab abgeschlossener Stufe ${CFG.rift.trial.unlock}: ${TRIAL_BOSSES.length} Echos nacheinander.`],
          ]} />
          <H>Quellstufen</H>
          <p>Erfahrung über Stufe {CFG.player.maxLevel} hinaus füllt bis zu {QUELL_MAX} Quellstufen. Jede gibt einen Punkt für eine Bahn (höchstens {CFG.quell.trackCap} je Bahn, jeder weitere bringt weniger):</p>
          <Facts rows={QUELL_TRACKS.map(t => [t.name, `${t.desc} Voll ausgebaut +${t.max} %.`])} />
          <H>Neuer Kreis</H>
          <p>Nach dem Epilog beginnt bei Mirelda die Geschichte von vorn – bis zu {CFG.kreis.max} weitere, härtere Kreise. Stufe, Ausrüstung, Rezepte, Chronik und Fortschritt im Endspiel bleiben. Gruppen spielen in der Welt ihres niedrigsten Kreises.</p>
          <H>Endspiel-Expeditionen und Tiefen</H>
          <Facts rows={[
            ...ENDGAME_LIST.map(x => [x.name, `${BOSSES[x.boss].name} · ab Stufe ${x.rec}. Freischaltung: ${x.unlock.map(r => r.text).join(', ')}. Beute eine Stufe besser als der Grad, dazu Echo-Fragmente und Ätherstaub.`] as [string, string]),
            ['Tiefen', `Nach einem Abschluss auf Mythisch: Tiefe 1 bis ${DEPTH_CFG.max} in jeder Expedition, eine nach der anderen. Je Tiefe +${Math.round(DEPTH_CFG.hp * 100)} % Leben und +${Math.round(DEPTH_CFG.dmg * 100)} % Schaden der Gegner, alle zwei Tiefen eine Gegnerstufe mehr; ab Tiefe ${DEPTH_CFG.modsAt[0]} ein Modifikator, ab ${DEPTH_CFG.modsAt[1]} zwei, ab ${DEPTH_CFG.modsAt[2]} drei – sie wechseln jede Woche.`],
            ['Lohn der Tiefen', `Gegenstandsstufe und Mythisch steigen mit, dazu der Bosskern des Endbosses, Echo-Fragmente, ab Tiefe ${DEPTH_CFG.aetherFrom} Ätherstaub; beim ersten Mal auf Tiefe 5, 10, 15 und 20 ein mythisches Stück.`],
            ['Ehrungen', `${Object.values(ENDGAME_TITLES).map(t => `„${t.name}“ (${t.desc.replace(/\.$/, '')})`).join(' · ')}.`],
            ['Bestenliste', 'Die Trophäenhalle der Quellwarte zeigt die schnellsten Läufe jedes Grades und die tiefste Tiefe – mit den Namen der Gruppe.'],
          ]} />
        </div>
        <div>
          <H>Die {RIFT_MOD_LIST.length} Modifikatoren</H>
          <Facts rows={RIFT_MOD_LIST.map(m => [<b style={{ color: m.color }}>{m.name}</b>, m.desc])} />
        </div>
      </div>
    </>
  )),
  ch('ruf', () => (
    <>
      <div class="hb-cols">
        <div>
          <H>Ruf bei {FACTION_LIST.length} Fraktionen</H>
          <p>Jede Region hat ihre Fraktion. Übersicht: <K a="ruf" />. Ränge: {RANK_NAMES.map((n, i) => `${n} (ab ${fmtNum(CFG.living.rep.ranks[i])})`).join(' · ')}. Höhere Ränge öffnen Vorräte, Rezepte, Titel und bis zu {pct(CFG.living.rep.discount[CFG.living.rep.discount.length - 1])} Nachlass bei den Händlern der Region.</p>
          <ul class="tips">{REP_SOURCES.map(s => <li>{s}</li>)}</ul>
          <Facts rows={FACTION_LIST.map(f => [f.name, `${ZONES[f.zone]?.name ?? f.zone} · Ansprechpartner: ${NPCS[f.npc]?.name ?? f.npc}`])} />
        </div>
        <div>
          <H>Ereignisse</H>
          <p class="note">Werden angesagt, stehen rechts im Bild und auf der Karte. Jeder Beteiligte wird einmal persönlich belohnt.</p>
          <Facts rows={Object.values(EVENTS).map(e => [<>{e.glyph} {e.name}</>, e.goal + (e.night ? ' (nur nachts)' : '')])} />
          <Facts rows={[
            ['Weltbosse', WORLD_BOSS_LIST.map(b => b.name).join(', ') + ' – erscheinen von Zeit zu Zeit; alle in der Nähe kämpfen mit.'],
            ['Seltene Monster', `${RARE_LIST.length} benannte Gegner mit Eigenheiten und Trophäen.`],
            ['Schatzkarten', 'Im Inventar benutzen, dem Hinweis rechts folgen, an der Stelle graben.'],
            ['Tageslauf', 'Dorfbewohner gehen abends heim (und antworten trotzdem). Manches zeigt sich nur nachts.'],
          ]} />
          <H>Jahreszeiten</H>
          <Facts rows={SEASON_NAMES.map((n, i) => [`${SEASON_GLYPH[i]} ${n}`, SEASON_EFFECT[i]])} />
          <p class="note">Eine Jahreszeit dauert {sec(CFG.living.season.lengthSec)}.</p>
        </div>
      </div>
    </>
  )),
  ch('zuhause', () => (
    <>
      <p>Mirelda verkauft den <b>Hof am Waldrand</b>, sobald die Wurzelgruft erledigt ist. Er gehört – wie Lagertruhe, Begleiter, Erscheinungen und Sammlung – dem Profil, also allen deinen Charakteren. Hin kommst du über den Wegweiser in Quellhain und von jedem Quellstein aus (Weltkarte).</p>
      <div class="hb-cols">
        <div>
          <H>Ausbau</H>
          <Facts rows={HOME_LEVELS.map(l => [<>{l.name}<div class="note">{fmtNum(l.gold)} Gold</div></>, l.adds.join(' · ')])} />
          <H>Trophäen</H>
          <p class="note">{HOME_TROPHIES.length} Stück. Auf Ständern ausgestellt geben sie je Art einmal einen kleinen Bonus für das ganze Profil:</p>
          <Facts rows={TROPHY_CATS.map(c => [c.name, c.perk])} />
        </div>
        <div>
          <H>Begleiter</H>
          <p class="note">Einer läuft mit; gewechselt wird im Fenster Sammlung (<K a="sammlung" />). Begleiter kämpfen nicht.</p>
          <Facts rows={PET_LIST.map(p => [p.name, <>{p.perk}<div class="note">{p.how}</div></>])} />
          <H>Sammlung und Erscheinungen</H>
          <p>Bestiarium, Fundstücke, Rezepte, Trophäen, Begleiter und {LOOK_LIST.length} Erscheinungen (Gewänder und Waffenglanz – reine Optik, am Kleiderschrank angelegt). {MILESTONES.length} Meilensteine bringen Titel, Lagerplätze und mehr.</p>
        </div>
      </div>
    </>
  )),
  ch('quellwarte', () => <HubHelp />),
  ch('gemeinsam', () => (
    <>
      <p>Bis zu {CFG.social.partyMax} Spieler bilden eine Gruppe (<K a="party" />). Neben einem Mitspieler öffnet <K a="interact" /> (oder ein Klick auf die Figur) ein kleines Menü: Ansehen, Handeln, Einladen. Gegner haben je weiterem Spieler in der Nähe {pct(CFG.enemy.hpPerExtraPlayer)} mehr Leben, Bosse {pct(CFG.enemy.bossHpPerExtraPlayer)}.</p>
      <Facts rows={PARTY_RULES} />
      <H>Handel</H>
      <ul class="tips">
        <li>Beide legen Gegenstände (höchstens {CFG.social.tradeSlots} verschiedene) und Gold ins Angebot, <b>sperren</b> und <b>bestätigen</b> dann. Jede Änderung hebt die Sperren auf; danach lässt sich {String(CFG.social.tradeLockDelaySec).replace('.', ',')} Sekunden lang nicht sperren.</li>
        <li>Der Tausch geschieht ganz oder gar nicht. Weggehen, Zonenwechsel oder Esc bricht ab.</li>
        <li>Nicht handelbar („Gebunden“): Questgegenstände, Legendäre Waffen, Trophäen und manche Rezepte.</li>
      </ul>
    </>
  )),
  ch('gamepad', () => (
    <>
      <p>Jedes Gamepad mit Standard-Belegung wird erkannt, sobald du eine Taste drückst. Die Hinweise im Bild wechseln dann auf Gamepad-Knöpfe.</p>
      <Facts rows={[
        ['Im Spiel', 'Linker Stick bewegt, rechter Stick zielt (sonst zielt das Spiel von selbst). Die Knöpfe stehen im Kapitel „Steuerung“.'],
        ['In Fenstern', <>Stick oder Steuerkreuz wählt aus, <Kbd>A</Kbd> bestätigt, <Kbd>B</Kbd> schließt das oberste Fenster. Der Fokus bleibt im obersten Fenster.</>],
        ['Alle Fenster', <><Kbd>Start</Kbd> öffnet das Menü. Dort stehen auch die Fenster ohne eigenen Knopf (Gruppe, Ruf und Welt, Sammlung, Handbuch) und offene Anfragen (Einladung, Handel, geteilte Quest).</>],
        ['Doppelklick', 'Nirgends nötig: Jede Aktion gibt es auch als Knopf, sobald ein Gegenstand ausgewählt ist.'],
        ['Mitspieler', <>Neben einem Mitspieler <Kbd>A</Kbd> drücken: Sein Menü öffnet sich und lässt sich wie ein Fenster bedienen.</>],
        ['Filmszenen', <><Kbd>A</Kbd> blättert weiter, <Kbd>B</Kbd> zweimal überspringt.</>],
      ]} />
      <H>Grenzen</H>
      <ul class="tips">
        <li><b>Chat</b> braucht eine Tastatur. Einen Namen für den Charakter schlägt „Name würfeln“ vor; Schieberegler stellst du mit links und rechts ein.</li>
        <li><b>Goldbeträge</b> in Handel und Lagertruhe stellst du mit den Knöpfen neben dem Feld ein (±10, ±100, ±1000, alles).</li>
        <li><b>Tasten neu belegen</b> geht nur für die Tastatur; die Gamepad-Belegung ist fest.</li>
        <li>Manche Browser geben Gamepads nur auf „sicheren“ Seiten frei (localhost oder HTTPS).</li>
      </ul>
    </>
  )),
  ch('hilfe', () => (
    <>
      <Facts rows={[
        ['Es ruckelt', <>Einstellungen → Beleuchtung und Wettereffekte abschalten; im Browser die Hardwarebeschleunigung einschalten. <K a="perf" /> zeigt Bilder pro Sekunde, Bildzeit und Verzögerung. Die Figur läuft auch bei niedriger Bildrate in Echtzeit.</>],
        ['Es blitzt zu stark', 'Einstellungen → „Blitze reduzieren“: weiche statt greller Bildschirmblitze, kaum Bildschirmwackeln, ruhigere Farbwechsel.'],
        ['Verbindung verloren', `Das Spiel verbindet von selbst neu. Dein Charakter bleibt ${Math.round(CFG.net.reconnectGraceMs / 1000)} Sekunden unverwundbar stehen; danach wird er gespeichert und aus der Welt genommen. Dein Platz in der Gruppe bleibt ${Math.round(CFG.social.seatSec / 60)} Minuten frei.`],
        ['Server neu gestartet', 'Nach der Wiederverbindung geht es am letzten gespeicherten Stand weiter. Meldet das Spiel eine neue Version, lade die Seite neu.'],
        ['Kein Ton', 'Einmal ins Spiel klicken – Browser geben Ton erst nach einer Eingabe frei. Lautstärke in den Einstellungen prüfen.'],
        ['Anderer Rechner', 'Deine Charaktere hängen am Profil-Schlüssel (Einstellungen → Profil). Notiere ihn, bevor du den Browser-Speicher leerst.'],
      ]} />
    </>
  )),
] as const;
// Der Übersetzer prüft, dass kein Kapitel aus `HELP_TOPICS` fehlt:
type Missing = Exclude<HelpTopicId, (typeof ALL)[number]['id']>;
const complete: [Missing] extends [never] ? true : never = true; void complete;
export const CHAPTERS: readonly Chapter[] = HELP_TOPICS.map(([id]) => ALL.find(c => c.id === id)!);
export const CHAPTER: Record<string, Chapter> = Object.fromEntries(CHAPTERS.map(c => [c.id, c]));

export function HandbuchPanel({ modal }: { modal?: boolean }) {
  const tab = useStore(s => s.helpTab);
  const cur = CHAPTER[tab] ?? CHAPTERS[0];
  return (
    <Window title="Handbuch" onClose={() => store.set({ panel: null })} class="win-handbuch" modal={modal}>
      <div class="hb">
        <nav class="hb-nav scroll" aria-label="Kapitel">
          {CHAPTERS.map(c => (
            <button type="button" class={cx('hb-tab', c.id === cur.id && 'on')} aria-current={c.id === cur.id} onClick={() => { if (c.id !== cur.id) { sfx('ui_tab'); store.set({ helpTab: c.id }); } }}>{c.title}</button>
          ))}
        </nav>
        <article class="hb-page scroll" key={cur.id}>
          <h3 class="hb-title">{cur.title}</h3>
          {cur.body()}
        </article>
      </div>
    </Window>
  );
}
