/**
 * Tastenbelegung als reine Daten und Regeln (0.8) – ohne Browser, damit Einstellungen, Handbuch und Tests dieselbe Liste benutzen.
 * Neue Aktionen kommen HIER dazu (Bezeichnung, Standardtaste, Gruppe); Einstellungen und Handbuch zeigen sie dann von selbst.
 */
export type Action =
  | 'up' | 'down' | 'left' | 'right' | 'attack' | 'dodge' | 'interact'
  | 'skill1' | 'skill2' | 'skill3' | 'skill4' | 'potionHp' | 'potionMp'
  | 'inventory' | 'character' | 'skills' | 'quests' | 'map' | 'party' | 'ruf' | 'sammlung' | 'chat' | 'menu'
  | 'help' | 'tracker' | 'perf';

export const ACTION_LABEL: Record<Action, string> = {
  up: 'Nach oben', down: 'Nach unten', left: 'Nach links', right: 'Nach rechts',
  attack: 'Angriff', dodge: 'Ausweichrolle', interact: 'Interagieren',
  skill1: 'Fähigkeit 1', skill2: 'Fähigkeit 2', skill3: 'Fähigkeit 3', skill4: 'Fähigkeit 4',
  potionHp: 'Heiltrank', potionMp: 'Manatrank',
  inventory: 'Inventar', character: 'Charakter', skills: 'Fähigkeiten', quests: 'Questlog', map: 'Weltkarte', party: 'Gruppe', ruf: 'Ruf und Welt', sammlung: 'Sammlung', chat: 'Chat', menu: 'Menü / Schließen',
  help: 'Handbuch', tracker: 'Questverfolgung ein-/ausklappen', perf: 'Leistungsanzeige',
};
export const ACTIONS = Object.keys(ACTION_LABEL) as Action[];

/** Gruppen für Einstellungen und Handbuch – jede Aktion steht in genau einer (ein Test prüft das). */
export const KEY_GROUPS: [string, Action[]][] = [
  ['Bewegung', ['up', 'down', 'left', 'right']],
  ['Kampf', ['attack', 'dodge', 'interact', 'skill1', 'skill2', 'skill3', 'skill4', 'potionHp', 'potionMp']],
  ['Fenster', ['inventory', 'character', 'skills', 'quests', 'map', 'party', 'ruf', 'sammlung', 'help', 'menu']],
  ['Sonstiges', ['chat', 'tracker', 'perf']],
];

/** Tasten als KeyboardEvent.code; 'Mouse0' = linke, 'Mouse2' = rechte Maustaste */
export const DEFAULT_KEYS: Record<Action, string[]> = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  attack: ['Mouse0', 'KeyJ'], dodge: ['Space'], interact: ['KeyE'],
  skill1: ['Digit1', 'Mouse2'], skill2: ['Digit2'], skill3: ['Digit3'], skill4: ['Digit4'],
  potionHp: ['KeyQ'], potionMp: ['KeyR'],
  inventory: ['KeyI'], character: ['KeyC'], skills: ['KeyK'], quests: ['KeyL'], map: ['KeyM'], party: ['KeyP'], ruf: ['KeyU'], sammlung: ['KeyB'], chat: ['Enter'], menu: ['Escape'],
  help: ['KeyH', 'F1'], tracker: ['KeyT'], perf: ['F3'],
};

/** Gamepad-Belegung (Standard-Mapping): Aktion → Button-Index. Fenster ohne eigene Taste erreicht man über Start (Menü). */
export const DEFAULT_PAD: Partial<Record<Action, number>> = {
  attack: 2, dodge: 1, interact: 0, skill1: 3, skill2: 4, skill3: 5, skill4: 7, potionHp: 6, potionMp: 11,
  inventory: 8, menu: 9, map: 12, quests: 13, character: 14, skills: 15,
};
export const PAD_NAME = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Back', 'Start', 'L3', 'R3', 'Steuerkreuz ↑', 'Steuerkreuz ↓', 'Steuerkreuz ←', 'Steuerkreuz →'];

export type KeyMap = Record<Action, string[]>;
export const cloneKeys = (k: KeyMap): KeyMap => JSON.parse(JSON.stringify(k));

/**
 * Bringt eine gespeicherte Belegung auf den heutigen Stand: unbekannte Aktionen fallen weg, fehlende (neu hinzugekommene)
 * erhalten ihre Standardtasten – aber nur die, die der Spieler nicht schon anderweitig vergeben hat. So entsteht durch ein
 * Update nie ein Konflikt mit einer eigenen Belegung.
 */
export function sanitizeKeys(raw: unknown): KeyMap {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out = {} as KeyMap;
  const used = new Set<string>();
  for (const a of ACTIONS) {
    const v = src[a];
    if (Array.isArray(v)) { out[a] = v.filter((c): c is string => typeof c === 'string' && c.length > 0 && c.length < 24).slice(0, 3); for (const c of out[a]) used.add(c); }
  }
  for (const a of ACTIONS) {
    if (out[a]) continue;
    out[a] = DEFAULT_KEYS[a].filter(c => !used.has(c));
    for (const c of out[a]) used.add(c);
  }
  return out;
}

/** Tasten, die mehr als eine Aktion auslösen. Leer = keine Konflikte. */
export function keyConflicts(keys: KeyMap): { code: string; actions: Action[] }[] {
  const by = new Map<string, Action[]>();
  for (const a of ACTIONS) for (const c of keys[a] ?? []) { const l = by.get(c); if (l) { if (!l.includes(a)) l.push(a); } else by.set(c, [a]); }
  return [...by].filter(([, l]) => l.length > 1).map(([code, actions]) => ({ code, actions }));
}
/** Aktionen, die gerade keine Taste haben. */
export function unboundActions(keys: KeyMap): Action[] { return ACTIONS.filter(a => !(keys[a] ?? []).length); }

/**
 * Legt `code` als Haupttaste von `action` fest. Die Taste wird allen anderen Aktionen weggenommen (sie zeigen dann „—“,
 * falls es ihre einzige war) – eine Taste löst also nie zwei Dinge aus. `taken` nennt, wem sie genommen wurde.
 */
export function bindKey(keys: KeyMap, action: Action, code: string): { keys: KeyMap; taken: Action[] } {
  const out = cloneKeys(keys);
  const taken: Action[] = [];
  for (const a of ACTIONS) {
    if (a === action || !(out[a] ?? []).includes(code)) continue;
    out[a] = out[a].filter(c => c !== code);
    taken.push(a);
  }
  out[action] = [code, ...(out[action] ?? []).slice(1).filter(c => c !== code)];
  return { keys: out, taken };
}

const KEY_NAMES: Record<string, string> = {
  Mouse0: 'Linke Maustaste', Mouse1: 'Mittlere Maustaste', Mouse2: 'Rechte Maustaste', Space: 'Leertaste', Escape: 'Esc', Enter: 'Enter',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', ShiftLeft: 'Umschalt', ShiftRight: 'Umschalt rechts', ControlLeft: 'Strg', ControlRight: 'Strg rechts', AltLeft: 'Alt', AltRight: 'Alt Gr', Tab: 'Tab',
  Backspace: 'Rücktaste', CapsLock: 'Feststelltaste', Comma: ',', Period: '.',
};
export function keyName(code: string): string {
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
  return code;
}
