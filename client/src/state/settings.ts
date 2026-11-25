/** Einstellungen: lokal im Browser gespeichert und zusätzlich beim Server am Profil hinterlegt. */
import { ACTIONS, ACTION_LABEL, DEFAULT_KEYS, DEFAULT_PAD, cloneKeys, keyName, sanitizeKeys, type Action } from './keys';
export { ACTIONS, ACTION_LABEL, DEFAULT_KEYS, DEFAULT_PAD, keyName };
export type { Action };

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
  // ---- Feinschliff (0.8); alte gespeicherte Einstellungen bekommen die Standardwerte
  /** Blitze reduzieren: weiche statt greller Bildschirmblitze, kaum Bildschirmwackeln, ruhigere Farbwechsel */
  reduceFlash: boolean;
  /** kurze Hinweise, wenn ein System zum ersten Mal wichtig wird */
  hints: boolean;
  /** schon gezeigte Hinweise (IDs aus state/hints.ts) – wandert mit den Einstellungen ans Profil */
  hintsSeen: string[];
  /** Questverfolgung von Hand eingeklappt */
  trackerCollapsed: boolean;
  /** Leistungsanzeige (Bilder pro Sekunde, Bildzeit, Ping, Objekte) */
  perfOverlay: boolean;
}

const KEY = 'eternal-mana-settings';
const TOKEN_KEY = 'eternal-mana-token';

export function defaults(): Settings {
  return {
    musicVolume: 0.5, sfxVolume: 0.7, keys: cloneKeys(DEFAULT_KEYS), pad: { ...DEFAULT_PAD },
    damageNumbers: true, screenShake: true, showMinimap: true, uiScale: 1, autoAim: true, lighting: true, weather: true,
    playerName: '', lastServer: '',
    reduceFlash: false, hints: true, hintsSeen: [], trackerCollapsed: false, perfOverlay: false,
  };
}

function load(): Settings {
  const d = defaults();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    Object.assign(d, raw);
    d.keys = sanitizeKeys(raw.keys ?? DEFAULT_KEYS);   // 0.8: neue Aktionen erhalten ihre Standardtaste nur, wenn sie noch frei ist
    d.pad = { ...defaults().pad, ...(raw.pad ?? {}) };
    if (!Array.isArray(d.hintsSeen)) d.hintsSeen = [];
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
  try { const raw = JSON.parse(json); delete raw.lastServer; if (raw.keys) raw.keys = sanitizeKeys(raw.keys); if (!Array.isArray(raw.hintsSeen)) delete raw.hintsSeen; updateSettings(raw); } catch { /* ignorieren */ }
}
export function resetKeys() { updateSettings({ keys: cloneKeys(DEFAULT_KEYS), pad: { ...DEFAULT_PAD } }); }

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

/** Kurzbezeichnung der ersten Taste einer Aktion (für HUD-Hinweise) */
export function keyHint(a: Action): string {
  const k = settings.keys[a]?.[0];
  if (!k) return '';
  if (k === 'Mouse0') return 'LMT';
  if (k === 'Mouse2') return 'RMT';
  return keyName(k);
}
