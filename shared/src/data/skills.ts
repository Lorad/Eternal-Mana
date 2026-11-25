import type { ClassId, Element, Mods, StatusSpec } from '../types';

/** Ein Wirkungsbaustein einer aktiven Fähigkeit. `mult` skaliert mit dem Angriffswert; `+multR` je weiterem Rang. */
export type Effect =
  | { k: 'arc'; range: number; arc: number; mult: number; multR: number; kb?: number; status?: StatusSpec; healSelf?: number }
  | { k: 'spin'; radius: number; mult: number; multR: number; kb?: number; status?: StatusSpec }
  | { k: 'proj'; count: number; spread: number; speed: number; range: number; mult: number; multR: number; pierce?: number; radius?: number; explode?: number; status?: StatusSpec; sprite: string }
  | { k: 'aoe'; at: 'target' | 'self'; maxRange: number; radius: number; delay: number; mult: number; multR: number; status?: StatusSpec }
  | { k: 'zone'; at: 'target' | 'self'; maxRange: number; radius: number; dur: number; tick: number; mult: number; multR: number; status?: StatusSpec; healAllies?: number; follow?: boolean }
  | { k: 'dash'; dist: number; mult: number; multR: number; width: number; back?: boolean; status?: StatusSpec; critBonus?: number }
  | { k: 'blink'; dist: number }
  | { k: 'buff'; id: string; party?: number; dur: number; durR?: number; mods: Mods; modsR?: Mods; shield?: number; shieldR?: number }
  | { k: 'heal'; party: number; mult: number; multR: number };

export interface SkillDef {
  id: string;
  cls: ClassId;
  name: string;
  desc: string;
  glyph: string;
  element: Element;
  maxRank: number;
  reqLevel: number;
  requires?: string;
  /** Position im Skilltree: Spalte 0..2, Zeile 0..3 */
  pos: [number, number];
  passive?: Mods;          // je Rang
  mp?: number;             // Manakosten (Rang 1), +8 % je Rang
  cd?: number;             // Abklingzeit in s
  anim?: 'attack' | 'cast';
  sfx?: string;
  effects?: Effect[];
}

const S = (s: SkillDef) => s;

export const SKILL_LIST: SkillDef[] = [
  // ============================================================ KRIEGER
  S({ id: 'kr_wucht', cls: 'krieger', name: 'Wuchtschlag', glyph: 'slash', element: 'phys', maxRank: 5, reqLevel: 1, pos: [1, 0],
    desc: 'Ein schwerer Hieb in weitem Bogen, der Gegner zurückwirft.', mp: 8, cd: 3, anim: 'attack', sfx: 'swing_heavy',
    effects: [{ k: 'arc', range: 38, arc: 150, mult: 2.4, multR: 0.34, kb: 90 }] }),
  S({ id: 'kr_wirbel', cls: 'krieger', name: 'Wirbelklinge', glyph: 'whirl', element: 'wind', maxRank: 5, reqLevel: 3, requires: 'kr_wucht', pos: [0, 1],
    desc: 'Wirbelt die Klinge im Kreis und trifft alle Gegner ringsum mit Windschaden.', mp: 12, cd: 6, anim: 'attack', sfx: 'swing_heavy',
    effects: [{ k: 'spin', radius: 44, mult: 1.95, multR: 0.29, kb: 50 }] }),
  S({ id: 'kr_sturm', cls: 'krieger', name: 'Sturmangriff', glyph: 'charge', element: 'phys', maxRank: 5, reqLevel: 5, requires: 'kr_wucht', pos: [2, 1],
    desc: 'Stürmt vor, durchbricht Gegnerreihen und betäubt alles im Weg.', mp: 14, cd: 8, anim: 'attack', sfx: 'dodge',
    effects: [{ k: 'dash', dist: 110, mult: 1.85, multR: 0.29, width: 22, status: { id: 'stun', dur: 1.2 } }] }),
  S({ id: 'kr_schrei', cls: 'krieger', name: 'Kriegsschrei', glyph: 'shout', element: 'phys', maxRank: 5, reqLevel: 8, requires: 'kr_wirbel', pos: [0, 2],
    desc: 'Ein Schlachtruf, der Angriff und Verteidigung der ganzen Gruppe stärkt.', mp: 20, cd: 30, anim: 'cast', sfx: 'buff',
    effects: [{ k: 'buff', id: 'kriegsschrei', party: 160, dur: 12, durR: 1, mods: { powerPct: 15, defPct: 20 }, modsR: { powerPct: 3, defPct: 4 } }] }),
  S({ id: 'kr_erdspalter', cls: 'krieger', name: 'Erdspalter', glyph: 'quake', element: 'earth', maxRank: 5, reqLevel: 12, requires: 'kr_sturm', pos: [2, 2],
    desc: 'Rammt die Klinge in den Boden. Eine Felswelle rast voraus und durchschlägt alle Gegner.', mp: 22, cd: 10, anim: 'attack', sfx: 'cast_earth',
    effects: [{ k: 'proj', count: 1, spread: 0, speed: 210, range: 170, mult: 3.0, multR: 0.4, pierce: 99, radius: 14, sprite: 'rock', status: { id: 'slow', dur: 2.5 } }] }),
  S({ id: 'kr_glut', cls: 'krieger', name: 'Glutschneise', glyph: 'cleave', element: 'fire', maxRank: 5, reqLevel: 16, requires: 'kr_schrei', pos: [1, 3],
    desc: 'Die Klinge entflammt und schlägt eine brennende Schneise. Getroffene Gegner brennen.', mp: 30, cd: 14, anim: 'attack', sfx: 'cast_fire',
    effects: [{ k: 'arc', range: 58, arc: 200, mult: 3.9, multR: 0.52, kb: 60, status: { id: 'burn', dur: 4 } }] }),
  S({ id: 'kr_p_eisen', cls: 'krieger', name: 'Eisenhaut', glyph: 'p_def', element: 'earth', maxRank: 5, reqLevel: 2, pos: [0, 0],
    desc: 'Jahre des Trainings härten den Körper.', passive: { defPct: 6 } }),
  S({ id: 'kr_p_zaeh', cls: 'krieger', name: 'Zähigkeit', glyph: 'p_vit', element: 'phys', maxRank: 5, reqLevel: 4, pos: [2, 0],
    desc: 'Mehr Lebenspunkte und schnellere Erholung.', passive: { hpPct: 5, hpRegen: 0.6 } }),
  S({ id: 'kr_p_rausch', cls: 'krieger', name: 'Kampfrausch', glyph: 'p_str', element: 'fire', maxRank: 5, reqLevel: 10, pos: [1, 2],
    desc: 'Im Getümmel wächst deine Kraft.', passive: { powerPct: 5, crit: 1.5 } }),

  // ============================================================ MAGIER
  S({ id: 'ma_feuerball', cls: 'magier', name: 'Feuerball', glyph: 'fireball', element: 'fire', maxRank: 5, reqLevel: 1, pos: [1, 0],
    desc: 'Schleudert einen Feuerball, der beim Einschlag explodiert und Gegner entzündet.', mp: 10, cd: 2.5, anim: 'cast', sfx: 'cast_fire',
    effects: [{ k: 'proj', count: 1, spread: 0, speed: 250, range: 220, mult: 2.0, multR: 0.3, explode: 34, radius: 6, sprite: 'orb', status: { id: 'burn', dur: 3 } }] }),
  S({ id: 'ma_frost', cls: 'magier', name: 'Frostfächer', glyph: 'frost', element: 'water', maxRank: 5, reqLevel: 3, requires: 'ma_feuerball', pos: [0, 1],
    desc: 'Fünf Eissplitter fächern aus und verlangsamen getroffene Gegner.', mp: 14, cd: 5, anim: 'cast', sfx: 'cast_water',
    effects: [{ k: 'proj', count: 5, spread: 50, speed: 280, range: 150, mult: 0.95, multR: 0.14, radius: 5, sprite: 'shard', status: { id: 'slow', dur: 3 } }] }),
  S({ id: 'ma_blinzeln', cls: 'magier', name: 'Blinzeln', glyph: 'blink', element: 'wind', maxRank: 3, reqLevel: 5, requires: 'ma_feuerball', pos: [2, 1],
    desc: 'Teleportiert dich ein Stück in Blickrichtung – auch durch Gegner hindurch. Höhere Ränge senken die Abklingzeit.', mp: 12, cd: 7, anim: 'cast', sfx: 'teleport',
    effects: [{ k: 'blink', dist: 90 }] }),
  S({ id: 'ma_lanze', cls: 'magier', name: 'Sturmlanze', glyph: 'chain', element: 'wind', maxRank: 5, reqLevel: 8, requires: 'ma_blinzeln', pos: [2, 2],
    desc: 'Ein gebündelter Blitzstrahl, der alle Gegner in einer Linie durchbohrt.', mp: 20, cd: 7, anim: 'cast', sfx: 'shock',
    effects: [{ k: 'proj', count: 1, spread: 0, speed: 420, range: 240, mult: 2.5, multR: 0.35, pierce: 99, radius: 8, sprite: 'lance' }] }),
  S({ id: 'ma_eissturm', cls: 'magier', name: 'Eissturm', glyph: 'nova', element: 'water', maxRank: 5, reqLevel: 12, requires: 'ma_frost', pos: [0, 2],
    desc: 'Beschwört einen Eissturm am Zielort, der sechs Sekunden lang Schaden verursacht und verlangsamt.', mp: 28, cd: 14, anim: 'cast', sfx: 'freeze',
    effects: [{ k: 'zone', at: 'target', maxRange: 170, radius: 46, dur: 6, tick: 0.5, mult: 0.5, multR: 0.07, status: { id: 'slow', dur: 1.5 } }] }),
  S({ id: 'ma_meteor', cls: 'magier', name: 'Meteor', glyph: 'meteor', element: 'fire', maxRank: 5, reqLevel: 16, requires: 'ma_lanze', pos: [1, 3],
    desc: 'Ruft nach kurzer Verzögerung einen Meteor herab. Gewaltiger Flächenschaden.', mp: 40, cd: 18, anim: 'cast', sfx: 'cast_fire',
    effects: [{ k: 'aoe', at: 'target', maxRange: 190, radius: 58, delay: 0.9, mult: 5.2, multR: 0.7, status: { id: 'burn', dur: 4 } }] }),
  S({ id: 'ma_p_mana', cls: 'magier', name: 'Manafluss', glyph: 'p_mana', element: 'water', maxRank: 5, reqLevel: 2, pos: [0, 0],
    desc: 'Die Quelle antwortet dir. Mehr Mana und schnellere Regeneration.', passive: { mpPct: 6, mpRegen: 0.5 } }),
  S({ id: 'ma_p_fokus', cls: 'magier', name: 'Elementarfokus', glyph: 'p_element', element: 'fire', maxRank: 5, reqLevel: 4, pos: [2, 0],
    desc: 'Verstärkt jeglichen Elementarschaden.', passive: { elemPct: 5 } }),
  S({ id: 'ma_p_barriere', cls: 'magier', name: 'Arkane Schulung', glyph: 'p_int', element: 'light', maxRank: 5, reqLevel: 10, pos: [1, 2],
    desc: 'Schnelleres Wirken und schärferer Geist.', passive: { cdr: 3, crit: 1.5 } }),

  // ============================================================ WALDLÄUFER
  S({ id: 'wl_faecher', cls: 'waldlaeufer', name: 'Fächerschuss', glyph: 'multishot', element: 'phys', maxRank: 5, reqLevel: 1, pos: [1, 0],
    desc: 'Drei Pfeile auf einmal in einem Fächer.', mp: 8, cd: 3, anim: 'attack', sfx: 'bow_shot',
    effects: [{ k: 'proj', count: 3, spread: 28, speed: 320, range: 200, mult: 0.9, multR: 0.14, radius: 4, sprite: 'arrow' }] }),
  S({ id: 'wl_gift', cls: 'waldlaeufer', name: 'Giftpfeil', glyph: 'poison', element: 'earth', maxRank: 5, reqLevel: 3, requires: 'wl_faecher', pos: [0, 1],
    desc: 'Ein mit Wurzelgift getränkter Pfeil. Vergiftet das Ziel lange und stark.', mp: 10, cd: 5, anim: 'attack', sfx: 'bow_shot',
    effects: [{ k: 'proj', count: 1, spread: 0, speed: 340, range: 230, mult: 1.6, multR: 0.25, radius: 4, sprite: 'arrow', status: { id: 'poison', dur: 6 } }] }),
  S({ id: 'wl_sprung', cls: 'waldlaeufer', name: 'Rücksprung', glyph: 'roll', element: 'wind', maxRank: 3, reqLevel: 5, requires: 'wl_faecher', pos: [2, 1],
    desc: 'Springt weit zurück und schießt dabei eine Pfeilsalve nach vorn.', mp: 10, cd: 7, anim: 'attack', sfx: 'dodge',
    effects: [{ k: 'dash', dist: 80, mult: 0, multR: 0, width: 0, back: true }, { k: 'proj', count: 3, spread: 20, speed: 320, range: 190, mult: 0.9, multR: 0.2, radius: 4, sprite: 'arrow' }] }),
  S({ id: 'wl_falle', cls: 'waldlaeufer', name: 'Dornenfalle', glyph: 'trap', element: 'earth', maxRank: 5, reqLevel: 8, requires: 'wl_gift', pos: [0, 2],
    desc: 'Legt ein Dornenfeld aus, das Gegner verlangsamt und verletzt.', mp: 16, cd: 12, anim: 'cast', sfx: 'cast_earth',
    effects: [{ k: 'zone', at: 'target', maxRange: 140, radius: 38, dur: 8, tick: 0.5, mult: 0.42, multR: 0.06, status: { id: 'slow', dur: 1.2 } }] }),
  S({ id: 'wl_hagel', cls: 'waldlaeufer', name: 'Pfeilhagel', glyph: 'rain', element: 'wind', maxRank: 5, reqLevel: 12, requires: 'wl_sprung', pos: [2, 2],
    desc: 'Ein Hagel aus Pfeilen geht auf das Zielgebiet nieder.', mp: 26, cd: 13, anim: 'attack', sfx: 'bow_shot',
    effects: [{ k: 'zone', at: 'target', maxRange: 190, radius: 50, dur: 3, tick: 0.3, mult: 0.5, multR: 0.07 }] }),
  S({ id: 'wl_sturmpfeil', cls: 'waldlaeufer', name: 'Sturmpfeil', glyph: 'eagle', element: 'wind', maxRank: 5, reqLevel: 16, requires: 'wl_hagel', pos: [1, 3],
    desc: 'Ein vom Wind getragener Pfeil, der alles durchschlägt und Gegner davonfegt.', mp: 32, cd: 12, anim: 'attack', sfx: 'cast_wind',
    effects: [{ k: 'proj', count: 1, spread: 0, speed: 460, range: 280, mult: 3.8, multR: 0.5, pierce: 99, radius: 9, sprite: 'lance' }] }),
  S({ id: 'wl_p_auge', cls: 'waldlaeufer', name: 'Adlerauge', glyph: 'p_crit', element: 'wind', maxRank: 5, reqLevel: 2, pos: [0, 0],
    desc: 'Du findest jede Lücke in der Deckung.', passive: { crit: 2.5, critDmg: 5 } }),
  S({ id: 'wl_p_fuss', cls: 'waldlaeufer', name: 'Leichtfuß', glyph: 'p_speed', element: 'wind', maxRank: 5, reqLevel: 4, pos: [2, 0],
    desc: 'Schneller unterwegs, schneller wieder ausgewichen.', passive: { speedPct: 2.5, dodgeCdr: 5 } }),
  S({ id: 'wl_p_jagd', cls: 'waldlaeufer', name: 'Jagdinstinkt', glyph: 'p_dex', element: 'earth', maxRank: 5, reqLevel: 10, pos: [1, 2],
    desc: 'Jeder Schuss sitzt härter.', passive: { powerPct: 3.5 } }),

  // ============================================================ PALADIN
  S({ id: 'pa_lichtschlag', cls: 'paladin', name: 'Lichtschlag', glyph: 'smite', element: 'light', maxRank: 5, reqLevel: 1, pos: [1, 0],
    desc: 'Ein geweihter Hammerschlag. Heilt dich für einen Teil des Schadens.', mp: 8, cd: 3.5, anim: 'attack', sfx: 'cast_light',
    effects: [{ k: 'arc', range: 36, arc: 130, mult: 2.4, multR: 0.34, kb: 60, healSelf: 0.03 }] }),
  S({ id: 'pa_heilung', cls: 'paladin', name: 'Heilendes Licht', glyph: 'heal', element: 'light', maxRank: 5, reqLevel: 3, requires: 'pa_lichtschlag', pos: [0, 1],
    desc: 'Heilt dich und alle Verbündeten in der Nähe.', mp: 22, cd: 12, anim: 'cast', sfx: 'heal',
    effects: [{ k: 'heal', party: 150, mult: 0.5, multR: 0.08 }] }),
  S({ id: 'pa_schild', cls: 'paladin', name: 'Schildwall', glyph: 'shield', element: 'earth', maxRank: 5, reqLevel: 5, requires: 'pa_lichtschlag', pos: [2, 1],
    desc: 'Umgibt die Gruppe mit einem Schild, der Schaden absorbiert, und erhöht die Verteidigung.', mp: 20, cd: 22, anim: 'cast', sfx: 'buff',
    effects: [{ k: 'buff', id: 'schildwall', party: 150, dur: 8, mods: { defPct: 25 }, modsR: { defPct: 5 }, shield: 0.18, shieldR: 0.04 }] }),
  S({ id: 'pa_hammer', cls: 'paladin', name: 'Hammer des Urteils', glyph: 'hammer', element: 'light', maxRank: 5, reqLevel: 8, requires: 'pa_schild', pos: [2, 2],
    desc: 'Schleudert einen Hammer aus Licht, der sein Ziel betäubt.', mp: 18, cd: 8, anim: 'attack', sfx: 'cast_light',
    effects: [{ k: 'proj', count: 1, spread: 0, speed: 260, range: 190, mult: 3.0, multR: 0.42, radius: 8, pierce: 2, sprite: 'orb', status: { id: 'stun', dur: 1.5 } }] }),
  S({ id: 'pa_weihe', cls: 'paladin', name: 'Weihe', glyph: 'aura', element: 'light', maxRank: 5, reqLevel: 12, requires: 'pa_heilung', pos: [0, 2],
    desc: 'Weiht den Boden um dich: Gegner erleiden Lichtschaden, Verbündete regenerieren Leben.', mp: 30, cd: 18, anim: 'cast', sfx: 'cast_light',
    effects: [{ k: 'zone', at: 'self', maxRange: 0, radius: 56, dur: 8, tick: 0.5, mult: 0.55, multR: 0.08, healAllies: 0.16 }] }),
  S({ id: 'pa_zorn', cls: 'paladin', name: 'Zorn der Quelle', glyph: 'holy', element: 'light', maxRank: 5, reqLevel: 16, requires: 'pa_hammer', pos: [1, 3],
    desc: 'Eine Säule aus gleißendem Licht bricht um dich hervor, betäubt und versengt alle Gegner.', mp: 38, cd: 20, anim: 'cast', sfx: 'explosion',
    effects: [{ k: 'aoe', at: 'self', maxRange: 0, radius: 70, delay: 0.45, mult: 5.0, multR: 0.65, status: { id: 'stun', dur: 1.5 } }] }),
  S({ id: 'pa_p_hingabe', cls: 'paladin', name: 'Hingabe', glyph: 'p_mana', element: 'light', maxRank: 5, reqLevel: 2, pos: [0, 0],
    desc: 'Deine Heilung wird stärker, dein Mana tiefer.', passive: { healPct: 6, mpPct: 4 } }),
  S({ id: 'pa_p_bollwerk', cls: 'paladin', name: 'Bollwerk', glyph: 'p_def', element: 'earth', maxRank: 5, reqLevel: 4, pos: [2, 0],
    desc: 'Du bist die Mauer, hinter der andere stehen.', passive: { defPct: 5, hpPct: 4 } }),
  S({ id: 'pa_p_licht', cls: 'paladin', name: 'Lichtträger', glyph: 'p_element', element: 'light', maxRank: 5, reqLevel: 10, pos: [1, 2],
    desc: 'Dein Licht brennt heller.', passive: { elemPct: 4, powerPct: 4 } }),

  // ============================================================ SCHATTENJÄGER
  S({ id: 'sj_meuchel', cls: 'schattenjaeger', name: 'Meuchelstoß', glyph: 'stab', element: 'dark', maxRank: 5, reqLevel: 1, pos: [1, 0],
    desc: 'Schnellt durch die Gegner hindurch. Trifft mit stark erhöhter kritischer Chance.', mp: 8, cd: 4, anim: 'attack', sfx: 'swing_light',
    effects: [{ k: 'dash', dist: 70, mult: 2.0, multR: 0.3, width: 18, critBonus: 0.35 }] }),
  S({ id: 'sj_faecher', cls: 'schattenjaeger', name: 'Klingenfächer', glyph: 'fan', element: 'phys', maxRank: 5, reqLevel: 3, requires: 'sj_meuchel', pos: [0, 1],
    desc: 'Wirft fünf Dolche in einem weiten Fächer.', mp: 12, cd: 5, anim: 'attack', sfx: 'dagger_throw',
    effects: [{ k: 'proj', count: 5, spread: 70, speed: 330, range: 130, mult: 0.85, multR: 0.13, radius: 4, sprite: 'dagger' }] }),
  S({ id: 'sj_schritt', cls: 'schattenjaeger', name: 'Schattenschritt', glyph: 'vanish', element: 'dark', maxRank: 3, reqLevel: 5, requires: 'sj_meuchel', pos: [2, 1],
    desc: 'Verschmilzt mit den Schatten, taucht ein Stück weiter wieder auf und schärft kurz deine Sinne.', mp: 12, cd: 9, anim: 'cast', sfx: 'teleport',
    effects: [{ k: 'blink', dist: 80 }, { k: 'buff', id: 'schattenschritt', dur: 4, mods: { crit: 20, speedPct: 15 }, modsR: { crit: 5 } }] }),
  S({ id: 'sj_toxin', cls: 'schattenjaeger', name: 'Toxinstoß', glyph: 'poison', element: 'earth', maxRank: 5, reqLevel: 8, requires: 'sj_faecher', pos: [0, 2],
    desc: 'Vergiftete Klingen schneiden in weitem Bogen. Starkes, lang anhaltendes Gift.', mp: 16, cd: 8, anim: 'attack', sfx: 'swing_light',
    effects: [{ k: 'arc', range: 34, arc: 160, mult: 1.7, multR: 0.25, status: { id: 'poison', dur: 7 } }] }),
  S({ id: 'sj_mal', cls: 'schattenjaeger', name: 'Todesmal', glyph: 'mark', element: 'dark', maxRank: 5, reqLevel: 12, requires: 'sj_schritt', pos: [2, 2],
    desc: 'Zeichnet ein Ziel. Gezeichnete Gegner erleiden von allen Quellen 25 % mehr Schaden.', mp: 18, cd: 14, anim: 'attack', sfx: 'cast_dark',
    effects: [{ k: 'proj', count: 1, spread: 0, speed: 380, range: 200, mult: 1.5, multR: 0.2, radius: 6, sprite: 'dagger', status: { id: 'mark', dur: 8 } }] }),
  S({ id: 'sj_tanz', cls: 'schattenjaeger', name: 'Schattentanz', glyph: 'whirl', element: 'dark', maxRank: 5, reqLevel: 16, requires: 'sj_mal', pos: [1, 3],
    desc: 'Ein Wirbel aus Klingen umgibt dich drei Sekunden lang und zerfetzt alles in Reichweite.', mp: 34, cd: 18, anim: 'attack', sfx: 'cast_dark',
    effects: [{ k: 'zone', at: 'self', maxRange: 0, radius: 46, dur: 3, tick: 0.25, mult: 0.62, multR: 0.09, follow: true }] }),
  S({ id: 'sj_p_praezision', cls: 'schattenjaeger', name: 'Tödliche Präzision', glyph: 'p_crit', element: 'dark', maxRank: 5, reqLevel: 2, pos: [0, 0],
    desc: 'Kritische Treffer richten noch mehr Schaden an.', passive: { critDmg: 10, crit: 1.5 } }),
  S({ id: 'sj_p_laeufer', cls: 'schattenjaeger', name: 'Schattenläufer', glyph: 'p_speed', element: 'wind', maxRank: 5, reqLevel: 4, pos: [2, 0],
    desc: 'Schneller, leiser, schwerer zu fassen.', passive: { speedPct: 2.5, dodgeCdr: 6 } }),
  S({ id: 'sj_p_blut', cls: 'schattenjaeger', name: 'Blutdurst', glyph: 'p_str', element: 'dark', maxRank: 5, reqLevel: 10, pos: [1, 2],
    desc: 'Ein Teil deines Schadens heilt dich.', passive: { lifesteal: 0.3, powerPct: 2.5 } }),
];

export const SKILLS: Record<string, SkillDef> = Object.fromEntries(SKILL_LIST.map(s => [s.id, s]));
export function skillsOf(cls: ClassId): SkillDef[] { return SKILL_LIST.filter(s => s.cls === cls); }
export function skillMp(s: SkillDef, rank: number): number { return Math.round((s.mp ?? 0) * (1 + 0.08 * (rank - 1))); }
export function skillCd(s: SkillDef, rank: number, cdrPct: number): number {
  let cd = s.cd ?? 0;
  if (s.effects?.some(e => e.k === 'blink') && s.maxRank === 3) cd *= 1 - 0.15 * (rank - 1);
  return cd * (1 - Math.min(40, cdrPct) / 100);
}
