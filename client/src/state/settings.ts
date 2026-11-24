/** Einstellungen: lokal im Browser gespeichert und zusätzlich beim Server am Profil hinterlegt. */
export type Action =
  | 'up' | 'down' | 'left' | 'right' | 'attack' | 'dodge' | 'interact'
  | 'skill1' | 'skill2' | 'skill3' | 'skill4' | 'potionHp' | 'potionMp'
  | 'inventory' | 'character' | 'skills' | 'quests' | 'map' | 'party' | 'ruf' | 'sammlung' | 'chat' | 'menu';

export const ACTION_LABEL: Record<Action, string> = {
  up: 'Nach oben', down: 'Nach unten', left: 'Nach links', right: 'Nach rechts',
  attack: 'Angriff', dodge: 'Ausweichrolle', interact: 'Interagieren',
  skill1: 'Fähigkeit 1', skill2: 'Fähigkeit 2', skill3: 'Fähigkeit 3', skill4: 'Fähigkeit 4',
  potionHp: 'Heiltrank', potionMp: 'Manatrank',
  inventory: 'Inventar', character: 'Charakter', skills: 'Fähigkeiten', quests: 'Questlog', map: 'Weltkarte', party: 'Gruppe', ruf: 'Ruf und Welt', sammlung: 'Sammlung', chat: 'Chat', menu: 'Menü',
};
export const ACTIONS = Object.keys(ACTION_LABEL) as Action[];

/** Tasten als KeyboardEvent.code; 'Mouse0' = linke, 'Mouse2' = rechte Maustaste */
export const DEFAULT_KEYS: Record<Action, string[]> = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  attack: ['Mouse0', 'KeyJ'], dodge: ['Space'], interact: ['KeyE'],
  skill1: ['Digit1', 'Mouse2'], skill2: ['Digit2'], skill3: ['Digit3'], skill4: ['Digit4'],
  potionHp: ['KeyQ'], potionMp: ['KeyR'],
  inventory: ['KeyI'], character: ['KeyC'], skills: ['KeyK'], quests: ['KeyL'], map: ['KeyM'], party: ['KeyP'], ruf: ['KeyU'], sammlung: ['KeyB'], chat: ['Enter'], menu: ['Escape'],
};

/** Gamepad-Belegung (Standard-Mapping): Aktion → Button-Index */
export const DEFAULT_PAD: Partial<Record<Action, number>> = {
  attack: 2, dodge: 1, interact: 0, skill1: 3, skill2: 4, skill3: 5, skill4: 7, potionHp: 6, potionMp: 11,
  inventory: 8, menu: 9, map: 12, quests: 13, character: 14, skills: 15,
};

export interface Settings {
  musicVolume: number;   // 0..1
  sfxVolume: number;     // 0..1
  keys: Record<Action, string[]>;
  pad: Partial<Record<Action, number>>;
  damageNumbers: boolean;
  screenShake: boolean;
  showMinimap: boolean;
  uiScale: number;       // 0.8..1.4
  autoAim: boolean;      // Tastatur/Gamepad: automatisch auf nahe Gegner zielen
  lighting: boolean;     // Beleuchtung/Tag-Nacht-Effekt
  weather: boolean;
  playerName: string;
  lastServer: string;    // zuletzt benutzte Serveradresse ('' = dieser Server)
}

const KEY = 'eternal-mana-settings';
const TOKEN_KEY = 'eternal-mana-token';

export function defaults(): Settings {
  return {
    musicVolume: 0.5, sfxVolume: 0.7, keys: JSON.parse(JSON.stringify(DEFAULT_KEYS)), pad: { ...DEFAULT_PAD },
    damageNumbers: true, screenShake: true, showMinimap: true, uiScale: 1, autoAim: true, lighting: true, weather: true,
    playerName: '', lastServer: '',
  };
}

function load(): Settings {
  const d = defaults();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    Object.assign(d, raw);
    d.keys = { ...defaults().keys, ...(raw.keys ?? {}) };
    d.pad = { ...defaults().pad, ...(raw.pad ?? {}) };
  } catch { /* Standardwerte */ }
  return d;
}

export const settings: Settings = load();
const listeners = new Set<() => void>();
let syncToServer: ((json: string) => void) | null = null;
let syncTimer: number | undefined;

export function onSettingsChange(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); }
export function setServerSync(fn: ((json: string) => void) | null) { syncToServer = fn; }

/** Ändert Einstellungen, speichert sie und benachrichtigt alle Zuhörer. */
export function updateSettings(patch: Partial<Settings>) {
  Object.assign(settings, patch);
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* privater Modus */ }
  for (const fn of listeners) fn();
  clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => syncToServer?.(JSON.stringify({ ...settings, lastServer: undefined })), 1500);
}
/** Übernimmt beim Anmelden die am Server-Profil gespeicherten Einstellungen (nur wenn lokal noch nichts gespeichert ist). */
export function adoptServerSettings(json: string | null) {
  if (!json || localStorage.getItem(KEY)) return;
  try { const raw = JSON.parse(json); delete raw.lastServer; updateSettings(raw); } catch { /* ignorieren */ }
}
export function resetKeys() { updateSettings({ keys: JSON.parse(JSON.stringify(DEFAULT_KEYS)), pad: { ...DEFAULT_PAD } }); }

/** Profil-Schlüssel: identifiziert den Spieler gegenüber dem Server (Spielstände hängen daran). */
export function getToken(): string {
  let t = '';
  try { t = localStorage.getItem(TOKEN_KEY) ?? ''; } catch { /* egal */ }
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(t)) {
    const a = new Uint8Array(24);
    crypto.getRandomValues(a);
    t = Array.from(a, b => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[b % 62]).join('');
    try { localStorage.setItem(TOKEN_KEY, t); } catch { /* egal */ }
  }
  return t;
}
export function setToken(t: string): boolean {
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(t)) return false;
  localStorage.setItem(TOKEN_KEY, t);
  return true;
}

const KEY_NAMES: Record<string, string> = {
  Mouse0: 'Linke Maustaste', Mouse1: 'Mittlere Maustaste', Mouse2: 'Rechte Maustaste', Space: 'Leertaste', Escape: 'Esc', Enter: 'Enter',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', ShiftLeft: 'Umschalt', ShiftRight: 'Umschalt rechts', ControlLeft: 'Strg', AltLeft: 'Alt', Tab: 'Tab',
};
export function keyName(code: string): string {
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
  return code;
}
/** Kurzbezeichnung der ersten Taste einer Aktion (für HUD-Hinweise) */
export function keyHint(a: Action): string {
  const k = settings.keys[a]?.[0];
  if (!k) return '';
  if (k === 'Mouse0') return 'LMT';
  if (k === 'Mouse2') return 'RMT';
  return keyName(k);
}
