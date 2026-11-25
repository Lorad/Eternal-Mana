/**
 * Client-Logik ohne Browser (0.8): eigene Bewegung bei niedriger Bildrate, Tastenbelegung, Hinweise, Handbuch.
 * Alles hier sind reine Funktionen aus `client/src` – ohne Phaser und ohne DOM.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { MAX_CATCHUP, SUB_STEP, advanceSelf, frameSeconds, type SelfMotion } from '../client/src/game/motion';
import { CFG } from '../shared/src/config';
import type { ServerMsg } from '../shared/src/types';
import { Sim } from './helpers/sim';

const free = () => false;
const still: SelfMotion = { speed: 100, rollMul: 2.7, rollFrom: 0, rollUntil: 0, rollDir: 0, lockUntil: 0, mx: 0, my: 0 };

/** Läuft `sec` Sekunden mit fester Bildrate geradeaus und liefert die Endposition. */
function walk(fps: number, sec: number, m: SelfMotion, solid: (tx: number, ty: number) => boolean = free): { x: number; y: number } {
  let x = 0, y = 0, last = 1000;
  const end = 1000 + sec * 1000;
  for (let k = 1; ; k++) {
    const now = Math.min(end, 1000 + (k * 1000) / fps);
    const r = advanceSelf(solid, x, y, 5, now, frameSeconds(now, last), m);
    x = r.x; y = r.y; last = now;
    if (now >= end) break;
  }
  return { x, y };
}

describe('Eigene Bewegung bei niedriger Bildrate', () => {
  it('holt die echte Zeit nach, bis hinunter zu 4 Bildern pro Sekunde', () => {
    expect(frameSeconds(2000, 0)).toBeCloseTo(SUB_STEP);          // erstes Bild
    expect(frameSeconds(2016, 2000)).toBeCloseTo(0.016);
    expect(frameSeconds(2100, 2000)).toBeCloseTo(0.1);            // 10 Bilder/s: früher auf 0,05 gedeckelt
    expect(frameSeconds(2250, 2000)).toBeCloseTo(0.25);
    expect(frameSeconds(9000, 2000)).toBe(MAX_CATCHUP);           // Hänger: nicht alles nachholen
    expect(frameSeconds(1990, 2000)).toBe(0);                     // Uhr läuft nie rückwärts
  });

  it('läuft bei 60, 30, 15, 10, 5 und 4 Bildern pro Sekunde gleich weit', () => {
    for (const fps of [60, 30, 15, 10, 5, 4]) {
      const p = walk(fps, 2, { ...still, mx: 1 });
      expect(p.x, `${fps} Bilder/s`).toBeCloseTo(200, 3);         // 100 px/s × 2 s – der alte Deckel ergab bei 10 Bildern/s nur 100
      expect(p.y).toBe(0);
    }
  });

  it('rollt bei jeder Bildrate gleich weit und läuft danach weiter', () => {
    const dur = CFG.player.dodgeDuration * 1000;
    for (const fps of [60, 20, 10, 5]) {
      // Rolle beginnt bei 1000 ms; danach wird bis 2000 ms weitergelaufen
      const p = walk(fps, 1, { ...still, mx: 1, rollFrom: 1000, rollUntil: 1000 + dur, rollDir: 0 });
      const want = 100 * 2.7 * (dur / 1000) + 100 * (1 - dur / 1000);
      expect(Math.abs(p.x - want), `${fps} Bilder/s`).toBeLessThan(100 * 2.7 * SUB_STEP + 0.01); // höchstens ein Teilschritt Abweichung
    }
  });

  it('steht während der Angriffssperre und läuft nie durch eine Wand', () => {
    const locked = walk(10, 1, { ...still, mx: 1, lockUntil: 1500 });
    expect(locked.x).toBeCloseTo(50, 0);
    const wall = (tx: number) => tx >= 3;                          // Wand ab x = 48
    for (const fps of [60, 10, 4]) expect(walk(fps, 2, { ...still, mx: 1, speed: 400 }, wall).x, `${fps} Bilder/s`).toBeLessThan(48 - 5 + 0.01);
    expect(walk(10, 1, { ...still, mx: 1, speed: 0 }).x).toBe(0);  // festgewurzelt
  });
});

describe('Eigene Bewegung gegen den echten Server', () => {
  const sim = new Sim();
  afterAll(() => sim.close());

  /** Spielt den Client nach: Bilder im festen Abstand, Meldung höchstens alle 50 ms, Server im 50-ms-Takt. */
  function run(fps: number, roll: boolean): { rejected: number; cx: number; cy: number; sx: number; sy: number; moved: number } {
    sim.clear();
    const t = sim.join('Lauf' + fps + (roll ? 'r' : ''), 'krieger');
    const { z, x: x0, y: y0 } = sim.arena(t);
    t.p.epoch++; t.msgs.length = 0;
    const speed = t.p.stats.speed;
    // Richtung mit dem meisten freien Platz suchen
    let dir = 0, best = -1;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const r = advanceSelf(z.solidWalk, x0, y0, CFG.player.radius, 4000, 4 * MAX_CATCHUP, { ...still, speed, mx: Math.cos(a), my: Math.sin(a) });
      if (r.dist > best) { best = r.dist; dir = a; }
    }
    let x = x0, y = y0, last = 0, lastSend = -1e9, simT = 0, moved = 0;
    const m: SelfMotion = { ...still, speed, rollMul: CFG.player.dodgeSpeedMul, mx: Math.cos(dir), my: Math.sin(dir) };
    const frame = 1000 / fps;
    for (let now = frame; now <= 3000; now += frame) {
      while (simT + 50 <= now) { sim.step(0.05); simT += 50; }
      if (roll && m.rollUntil === 0 && now >= 1000) {
        m.rollFrom = now; m.rollUntil = now + CFG.player.dodgeDuration * 1000; m.rollDir = dir;
        t.send({ t: 'dodge', ang: dir });
      }
      const r = advanceSelf(z.solidWalk, x, y, CFG.player.radius, now, frameSeconds(now, last), m);
      moved += r.dist; x = r.x; y = r.y; last = now;
      if (now - lastSend >= 1000 / CFG.net.moveSendRate) {
        lastSend = now;
        t.send({ t: 'm', x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, f: 0, e: t.p.epoch, mv: 1 });
      }
    }
    const rejected = t.msgs.filter((msg: ServerMsg) => msg.t === 'pos').length;
    return { rejected, cx: x, cy: y, sx: t.p.x, sy: t.p.y, moved };
  }

  it('nimmt der Server die Bewegung bei jeder Bildrate an (kein Zurücksetzen), auch mit Ausweichrolle', () => {
    for (const roll of [false, true]) for (const fps of [60, 20, 12, 8, 5, 4]) {
      const r = run(fps, roll);
      expect(r.rejected, `${fps} Bilder/s${roll ? ' mit Rolle' : ''}: zurückgesetzt`).toBe(0);
      expect(Math.hypot(r.cx - r.sx, r.cy - r.sy), `${fps} Bilder/s: Server und Client auseinander`).toBeLessThan(1);
      expect(r.moved, `${fps} Bilder/s: zu wenig Weg`).toBeGreaterThan(60);
    }
  });
});

// =====================================================================================================================
import { ACTIONS, ACTION_LABEL, DEFAULT_KEYS, DEFAULT_PAD, KEY_GROUPS, bindKey, cloneKeys, keyConflicts, keyName, sanitizeKeys, unboundActions, type Action } from '../client/src/state/keys';

describe('Tastenbelegung', () => {
  it('hat in der Standardbelegung keine Konflikte und keine Aktion ohne Taste', () => {
    expect(keyConflicts(DEFAULT_KEYS)).toEqual([]);
    expect(unboundActions(DEFAULT_KEYS)).toEqual([]);
    for (const a of ACTIONS) expect(ACTION_LABEL[a], a).toBeTruthy();
  });

  it('führt jede Aktion in genau einer Gruppe (Einstellungen und Handbuch zeigen dieselbe Liste)', () => {
    const grouped = KEY_GROUPS.flatMap(g => g[1]);
    expect([...grouped].sort()).toEqual([...ACTIONS].sort());
    expect(new Set(grouped).size).toBe(grouped.length);
  });

  it('hat für jedes Fenster seit 0.3 eine belegbare Taste; das Gamepad erreicht den Rest über das Menü', () => {
    for (const a of ['inventory', 'character', 'skills', 'quests', 'map', 'party', 'ruf', 'sammlung', 'help', 'menu'] as Action[]) expect(DEFAULT_KEYS[a].length, a).toBeGreaterThan(0);
    expect(DEFAULT_KEYS.menu).toContain('Escape');
    expect(DEFAULT_PAD.menu).toBe(9);                                    // Start öffnet das Menü mit allen Fenstern
    const used = Object.values(DEFAULT_PAD);
    expect(new Set(used).size).toBe(used.length);                        // kein Knopf doppelt
  });

  it('nimmt eine neu vergebene Taste der alten Aktion weg (nie zwei Aktionen auf einer Taste)', () => {
    const r = bindKey(DEFAULT_KEYS, 'dodge', 'KeyE');
    expect(r.taken).toEqual(['interact']);
    expect(r.keys.dodge[0]).toBe('KeyE');
    expect(r.keys.interact).toEqual([]);
    expect(keyConflicts(r.keys)).toEqual([]);
    expect(unboundActions(r.keys)).toEqual(['interact']);
    expect(DEFAULT_KEYS.interact).toEqual(['KeyE']);                     // die Vorlage bleibt unverändert
    // Zweitbelegung bleibt erhalten, dieselbe Taste noch einmal ändert nichts
    const again = bindKey(r.keys, 'attack', 'KeyX');
    expect(again.keys.attack).toEqual(['KeyX', 'KeyJ']);
    expect(bindKey(again.keys, 'attack', 'KeyX').keys).toEqual(again.keys);
  });

  it('ergänzt bei alten Einstellungen neue Aktionen nur mit freien Tasten', () => {
    // Stand vor 0.8: ohne Handbuch, Questverfolgung, Leistungsanzeige – und der Spieler hat H schon für das Inventar vergeben
    const old: any = cloneKeys(DEFAULT_KEYS);
    delete old.help; delete old.tracker; delete old.perf;
    old.inventory = ['KeyH'];
    old.frueher = ['KeyZ'];                                               // unbekannte Aktion fällt weg
    const k = sanitizeKeys(old);
    expect(k.inventory).toEqual(['KeyH']);
    expect(k.help).toEqual(['F1']);                                      // H ist vergeben → nur die freie Zweittaste
    expect(k.tracker).toEqual(['KeyT']);
    expect(k.perf).toEqual(['F3']);
    expect((k as any).frueher).toBeUndefined();
    expect(keyConflicts(k)).toEqual([]);
    expect(sanitizeKeys(null)).toEqual(DEFAULT_KEYS);
    expect(sanitizeKeys({ attack: 'kaputt', dodge: [1, 'Space'] }).dodge).toEqual(['Space']);
  });

  it('benennt Tasten lesbar', () => {
    expect(keyName('KeyH')).toBe('H'); expect(keyName('Digit3')).toBe('3'); expect(keyName('Space')).toBe('Leertaste'); expect(keyName('Mouse2')).toBe('Rechte Maustaste'); expect(keyName('F1')).toBe('F1');
  });
});

// =====================================================================================================================
import { HELP_TOPICS, HINT, HINTS, hintText, markSeen, nextHint, type HintState } from '../client/src/state/hints';
import { makeStack } from '../shared/src/data/items';

describe('Hinweise', () => {
  const sim = new Sim();
  afterAll(() => sim.close());
  const base = (patch: Partial<HintState> = {}): HintState => ({
    screen: 'game', char: null, zone: 'gruenwald', panel: null, craft: null, endgame: null, hof: null, lore: null, cine: null, dlgNode: null, rift: null, world: null,
    party: [], trade: null, home: null, dead: null, boss: null, target: null, nearStone: false, prompt: null, dialog: null, ...patch,
  });

  it('haben eindeutige Kennungen, kurze Texte und zeigen nur auf vorhandene Handbuch-Kapitel', () => {
    expect(new Set(HINTS.map(h => h.id)).size).toBe(HINTS.length);
    const topics = HELP_TOPICS.map(t => t[0]) as string[];
    for (const h of HINTS) {
      expect(h.text.length, h.id).toBeLessThan(230);
      if (h.topic) expect(topics, h.id).toContain(h.topic);
      for (const m of h.text.matchAll(/\{(\w+)\}/g)) expect(ACTIONS, `${h.id}: {${m[1]}}`).toContain(m[1]);
    }
  });

  it('begleiten einen neuen Charakter durch die ersten Schritte – jeder Hinweis genau einmal', () => {
    const t = sim.join('Neuling', 'krieger');
    const c = t.p.char;
    let seen: string[] = [];
    const next = (patch: Partial<HintState> = {}) => nextHint(base({ char: c, ...patch }), seen, true)?.id ?? null;
    const done = (id: string) => { seen = markSeen(seen, id); };
    expect(next()).toBe('start');                                         // frisch in Quellhain: zu Mirelda
    expect(next({ screen: 'loading' })).toBeNull();                        // nie außerhalb des Spiels …
    expect(next({ cine: { id: 'x', bars: true, title: null, line: null, fade: 0, fadeMs: 0 } })).toBeNull(); // … oder in Filmszenen
    expect(nextHint(base({ char: c }), seen, false)).toBeNull();           // abgeschaltet
    done('start');
    expect(next()).toBeNull();                                            // nichts Neues, solange nichts passiert
    sim.gotoNpc(t, 'mirelda'); t.send({ t: 'qAccept', id: 'm_erwachen', npc: 'mirelda' });
    expect(c.quests.m_erwachen?.s).toBe('active');
    expect(next()).toBe('kampf');
    done('kampf');
    c.quests.m_erwachen.p = [99];                                         // Ziel erfüllt → zurück zum Auftraggeber
    expect(next()).toBe('abgeben');
    done('abgeben');
    c.attrPoints = 3;
    expect(next()).toBe('stufe');
    expect(next({ panel: 'character' })).not.toBe('stufe');               // wer das Fenster schon offen hat, braucht ihn nicht
    done('stufe'); c.attrPoints = 0;
    expect(next({ craft: { at: 'fire', station: 'cooking' } })).toBe('kochen');
    done('kochen');
    expect(next({ craft: { at: 'borin', station: 'forge' } })).toBe('handwerk');
    done('handwerk');
    expect(next({ zone: 'wurzelgruft' })).toBe('dungeon');
    done('dungeon');
    expect(next({ lore: { id: 'brunnenbuch', first: true } })).toBe('chronik');
    expect(seen).toEqual(['start', 'kampf', 'abgeben', 'stufe', 'kochen', 'handwerk', 'dungeon']);
    expect(markSeen(['gibtsnicht', 'start'], 'start')).toEqual(['start']); // alte, unbekannte Kennungen fallen heraus
    expect(markSeen(seen, 'unbekannt')).toEqual(seen);
  });

  it('melden späte Systeme erst, wenn sie da sind: volles Inventar, Gruppe, Handel, Hof', () => {
    sim.clear();
    const t = sim.join('Spaet', 'magier', 12);
    const c = t.p.char;
    const all = HINTS.map(h => h.id);
    const only = (id: string, patch: Partial<HintState>) => nextHint(base({ char: c, ...patch }), all.filter(x => x !== id), true)?.id ?? null;
    expect(only('voll', {})).toBeNull();
    while (c.inv.length < CFG.player.invSize) c.inv.push({ ...makeStack('mat_wood', 1), uid: 'x' + c.inv.length });
    expect(only('voll', {})).toBe('voll');
    expect(only('gruppe', {})).toBeNull();
    expect(only('gruppe', { party: [{} as any, {} as any] })).toBe('gruppe');
    expect(only('handel', { trade: {} as any })).toBe('handel');
    expect(only('hofkauf', { home: { owned: 0, pets: [] } as any })).toBeNull();          // erst nach der Wurzelgruft
    c.quests[CFG.home.buyQuest] = { s: 'done', p: [], n: 1 };
    expect(only('hofkauf', { home: { owned: 0, pets: [] } as any })).toBe('hofkauf');
    expect(only('hofkauf', { home: { owned: 1, pets: [] } as any })).toBeNull();
    expect(only('begleiter', { home: { owned: 1, pets: ['moosling'] } as any })).toBe('begleiter');
    expect(only('rissinnen', { rift: { done: null } as any })).toBe('rissinnen');
  });

  it('setzen die aktuelle Taste in den Text ein', () => {
    const s = hintText(HINT.start, a => (a === 'interact' ? 'E' : ''));
    expect(s).toContain('[E]');
    expect(s).not.toMatch(/\{\w+\}/);
    expect(hintText(HINT.kampf, () => '')).toContain('(nicht belegt)');
  });
});

// =====================================================================================================================
import { COLUMN, planColumn, type ColumnInput } from '../client/src/ui/hudlayout';

describe('Rangfolge der rechten HUD-Spalte', () => {
  const inp = (p: Partial<ColumnInput> = {}): ColumnInput => ({ h: 720, narrow: false, minimap: true, rift: false, riftMods: 0, boss: false, events: 0, far: 0, quests: 0, collapsed: false, opened: false, ...p });
  /** grobe Höhe dessen, was der Plan zeigt – muss über der unteren Leiste bleiben */
  const height = (i: ColumnInput) => {
    const p = planColumn(i);
    let h = COLUMN.top + COLUMN.info + (i.minimap ? (i.narrow ? COLUMN.minimapNarrow : COLUMN.minimap) + 4 : 0);
    if (i.rift) h += COLUMN.rift + Math.ceil(i.riftMods / 2) * COLUMN.riftModRow + COLUMN.gap;
    h += i.events * COLUMN.event + (i.events ? COLUMN.gap : 0);
    if (i.quests) h += COLUMN.pill + p.quests * COLUMN.quest + (p.quests && p.quests < i.quests ? COLUMN.more : 0);
    return h + p.far * COLUMN.far;
  };

  it('zeigt im ruhigen Fall bis zu vier Quests und klappt im Mana-Riss und im Bosskampf von selbst ein', () => {
    expect(planColumn(inp({ quests: 6 }))).toMatchObject({ quests: 4, collapsed: false, why: null });
    expect(planColumn(inp({ quests: 2 }))).toMatchObject({ quests: 2, collapsed: false });
    expect(planColumn(inp({ quests: 5, rift: true, riftMods: 3 }))).toMatchObject({ quests: 0, collapsed: true, why: 'kampf', far: 0 });
    expect(planColumn(inp({ quests: 5, boss: true }))).toMatchObject({ collapsed: true, why: 'kampf' });
    // von Hand aufgeklappt bleibt sie auch im Riss offen – mit dem Platz, der da ist
    const open = planColumn(inp({ quests: 5, rift: true, riftMods: 3, opened: true }));
    expect(open.collapsed).toBe(false); expect(open.quests).toBeGreaterThan(0); expect(open.quests).toBeLessThan(4);
    expect(planColumn(inp({ quests: 5, collapsed: true, opened: true }))).toMatchObject({ collapsed: true, why: 'hand' });
    expect(planColumn(inp({ quests: 0, far: 3 }))).toMatchObject({ quests: 0, collapsed: false, far: 2 });
  });

  it('gibt Ereignissen hier den Vorrang vor Quests und Quests den Vorrang vor fernen Weltbossen', () => {
    const quiet = planColumn(inp({ quests: 5, far: 2 })), busy = planColumn(inp({ quests: 5, far: 2, events: 2 }));
    expect(busy.quests).toBeLessThan(quiet.quests);
    expect(busy.quests).toBeGreaterThanOrEqual(1);
    expect(busy.far).toBeLessThanOrEqual(1);
    expect(planColumn(inp({ quests: 5, events: 4, far: 2 })).why).toBe('platz');     // vier Ereignisse: kein Platz mehr, nur die Zeile
  });

  it('bleibt in jeder Lage über der unteren Leiste (1280×720, 1000×560, Hochformat, ohne Karte)', () => {
    // 1000×560 wird auf 0,78 verkleinert → dieselben 718 Oberflächen-Pixel Höhe; 600×900 → 1000 hoch und schmal
    for (const h of [718, 720, 900]) for (const minimap of [true, false]) for (const rift of [false, true]) for (const events of [0, 1, 2]) for (const quests of [0, 1, 3, 8]) for (const far of [0, 3]) for (const opened of [false, true]) {
      const i = inp({ h, minimap, rift, riftMods: rift ? 3 : 0, events, quests, far, opened });
      expect(height(i), JSON.stringify(i)).toBeLessThanOrEqual(h - COLUMN.bottom + 1);
      expect(planColumn(i).quests).toBeLessThanOrEqual(Math.min(quests, 4));
    }
    for (const events of [0, 1, 2]) for (const quests of [0, 2, 8]) for (const rift of [false, true]) {
      const i = inp({ h: 1000, narrow: true, rift, riftMods: rift ? 3 : 0, events, quests, far: 2, opened: true });
      expect(height(i), JSON.stringify(i)).toBeLessThanOrEqual(1000 - COLUMN.bottomNarrow + 1);
      expect(planColumn(i).quests).toBeLessThanOrEqual(2);
    }
  });
});

// =====================================================================================================================
describe('Fehlerwege', () => {
  const sim = new Sim();
  afterAll(() => sim.close());

  it('meldet ein gescheitertes Speichern, statt es zu bestätigen', () => {
    const t = sim.join('Sparer', 'krieger');
    t.msgs.length = 0; t.toasts.length = 0;
    t.send({ t: 'save' });
    expect(t.msgs.some(m => m.t === 'saved')).toBe(true);

    const orig = sim.db.saveChar;
    const quiet = console.error;
    console.error = () => {};                                            // der Server protokolliert den Fehler – hier gewollt
    try {
      sim.db.saveChar = () => { throw new Error('Datenträger voll'); };
      t.msgs.length = 0; t.toasts.length = 0;
      t.send({ t: 'save' });
      expect(t.msgs.some(m => m.t === 'saved'), 'trotz Fehler bestätigt').toBe(false);
      expect(t.toasts.join(' | ')).toMatch(/konnte deinen Spielstand nicht speichern/);
      expect(t.toasts.join(' | ')).toMatch(/Speichern fehlgeschlagen/);
      // die ausführliche Meldung kommt höchstens einmal je Minute – auch wenn jeder Versuch scheitert
      t.toasts.length = 0;
      t.send({ t: 'save' }); t.send({ t: 'save' });
      expect(t.toasts.filter(s => /konnte deinen Spielstand/.test(s)).length).toBe(0);
      expect(sim.game.savePlayer(t.p)).toBe(false);
    } finally { sim.db.saveChar = orig; console.error = quiet; }

    // sobald der Datenträger wieder schreibt, geht alles weiter wie zuvor – der Stand im Speicher ist nicht verloren
    t.p.char.gold = 4242;
    t.msgs.length = 0;
    t.send({ t: 'save' });
    expect(t.msgs.some(m => m.t === 'saved')).toBe(true);
    sim.leave(t);
    expect(sim.reenter(t).p.char.gold).toBe(4242);
  });
});
