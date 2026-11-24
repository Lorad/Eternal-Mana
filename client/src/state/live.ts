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
  /** geschätzte Serverzeit in ms */
  serverNow: () => performance.now(),
};
