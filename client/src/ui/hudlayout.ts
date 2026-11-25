/**
 * Rangfolge der rechten HUD-Spalte (0.8) als reine Rechnung – ohne DOM, damit sie sich testen lässt.
 *
 * Von oben nach unten: Karte mit Ort und Uhr → Riss-Anzeige → Ereignisse hier → Questverfolgung → Weltbosse anderswo.
 * Was oben steht, hat Vorrang; die Questverfolgung bekommt den Platz, der übrig bleibt, und klappt von selbst zu einer
 * Zeile zusammen, wenn es eng wird oder gerade etwas Wichtigeres läuft (Mana-Riss, Bosskampf). Unten bleibt Platz für
 * Meldungen und die Menüleiste.
 */
export interface ColumnInput {
  /** Höhe der Oberfläche in ihren eigenen Pixeln (vor der Skalierung, `uiScale.h`) */
  h: number;
  narrow: boolean;
  minimap: boolean;
  /** Mana-Riss läuft; `riftMods` = Zahl seiner Modifikatoren */
  rift: boolean; riftMods: number;
  /** Expedition läuft (0.9): ihre Anzeige steht unter der Karte, die Questverfolgung klappt wie im Riss zusammen */
  exp?: boolean;
  /** Bossleiste ist zu sehen */
  boss: boolean;
  /** Ereignisse in dieser Zone (dazu zählt der Hinweis der Schatzkarte) */
  events: number;
  /** Weltbosse in anderen Regionen */
  far: number;
  /** aktive Quests */
  quests: number;
  /** von Hand eingeklappt (Einstellung) bzw. in dieser Zone von Hand wieder aufgeklappt */
  collapsed: boolean; opened: boolean;
}
export interface ColumnPlan {
  /** so viele Quests zeigt die Questverfolgung (0 = nur die eingeklappte Zeile) */
  quests: number;
  collapsed: boolean;
  /** Grund des Einklappens: von Hand, weil gerade ein Riss oder Bosskampf läuft, oder aus Platzmangel */
  why: 'hand' | 'kampf' | 'platz' | null;
  /** so viele ferne Weltbosse werden (als kurze Zeile) gezeigt */
  far: number;
}

/** ungefähre Höhen der Blöcke in Oberflächen-Pixeln */
export const COLUMN = { top: 12, minimap: 160, minimapNarrow: 120, info: 50, gap: 10, rift: 58, riftModRow: 24, exp: 118, event: 72, far: 30, quest: 56, pill: 28, more: 18,
  /** unten frei bleiben: Menüleiste, Verbindungsanzeige und zwei Meldungen – im schmalen Fenster steht die Menüleiste zweispaltig darüber */
  bottom: 180, bottomNarrow: 400 };

export function planColumn(i: ColumnInput): ColumnPlan {
  let free = i.h - COLUMN.top - COLUMN.info - (i.narrow ? COLUMN.bottomNarrow : COLUMN.bottom);
  if (i.minimap) free -= (i.narrow ? COLUMN.minimapNarrow : COLUMN.minimap) + 4;
  if (i.rift) free -= COLUMN.rift + Math.ceil(i.riftMods / 2) * COLUMN.riftModRow + COLUMN.gap;
  if (i.exp) free -= COLUMN.exp + COLUMN.gap;
  free -= i.events * COLUMN.event + (i.events ? COLUMN.gap : 0);
  const busy = i.rift || i.boss || !!i.exp;
  // ferne Weltbosse: im Kampf gar nicht, sonst höchstens zwei kurze Zeilen
  let far = busy ? 0 : Math.min(i.far, i.events ? 1 : 2);
  if (!i.quests) return { quests: 0, collapsed: false, why: null, far: Math.max(0, Math.min(far, Math.floor(free / COLUMN.far))) };
  free -= COLUMN.pill;                       // Kopfzeile der Questverfolgung (zum Ein- und Ausklappen) steht immer
  const max = i.narrow ? 2 : 4;
  let why: ColumnPlan['why'] = null;
  if (i.collapsed) why = 'hand';
  else if (busy && !i.opened) why = 'kampf';
  let quests = 0;
  if (!why) {
    // passt nicht alles, braucht die Zeile „+ n weitere im Questlog“ ebenfalls Platz
    const fit = (room: number) => { const all = Math.min(i.quests, max); return all * COLUMN.quest <= room && all === i.quests ? all : Math.max(0, Math.min(all, Math.floor((room - COLUMN.more) / COLUMN.quest))); };
    quests = fit(free - far * COLUMN.far);
    // lieber eine Quest mehr als ein ferner Weltboss
    while (quests < Math.min(i.quests, 2) && far > 0) { far--; quests = fit(free - far * COLUMN.far); }
    if (quests <= 0) { quests = 0; why = 'platz'; }
  }
  if (why) far = Math.max(0, Math.min(far, Math.floor(free / COLUMN.far)));
  return { quests, collapsed: !!why, why, far };
}
