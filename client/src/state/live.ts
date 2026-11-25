/**
 * Flüchtiger Weltzustand, den die Spielszene jeden Frame aktualisiert (ohne Re-Render der Oberfläche).
 * Minimap und Weltkarte lesen ihn per requestAnimationFrame.
 */
export const live = {
  zone: '',
  x: 0, y: 0,
  /** andere Spieler: x, y, party (gleiche Gruppe) */
  players: [] as { x: number; y: number; name: string; party: boolean }[],
  /** aktive Gegner */
  mobs: [] as { x: number; y: number; boss: boolean; rare?: boolean }[],
  /** sichtbare Objekte für die Minimap: type = 'npc'|'exit'|'stone'|'chest'|'shard'|'node'|…; mark = Questmarker */
  objs: [] as { x: number; y: number; type: string; state: number; mark?: 'offer' | 'turnin' | 'progress' | null; label?: string }[],
  fps: 60,
  /** Leistungsanzeige (0.8): die Spielszene und das Netz füllen diese Werte zweimal je Sekunde */
  perf: { fps: 0, ms: 0, worst: 0, mobs: 0, players: 0, objs: 0, projs: 0, draw: 0, tex: 0, snaps: 0, inKb: 0 },
  /** geschätzte Serverzeit in ms */
  serverNow: () => performance.now(),
};
