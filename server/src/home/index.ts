/**
 * Zuhause (0.7) – Einstiegspunkt für die Kernklassen: der eigene Hof als Instanz je Besitzer, Lagertruhe, Ausbau,
 * Trophäen, Begleiter, Erscheinungen, „Ausgeruht“. `Game`, `Zone` und `Player` rufen nur die Funktionen dieses Objekts;
 * daneben liegen state.ts (Profil-Stand im Speicher), collect.ts (Sammlung) und storage.ts (Truhe).
 *
 * Jede Aktion wird hier geprüft – eigener Hof oder Besuch, Nähe zum Möbel, Besitz, Kosten, Voraussetzungen.
 * Regeln und Texte: shared/src/data/{home,pets,looks,collection}.ts, Zahlen: CFG.home.
 */
import { CFG } from '../../../shared/src/config';
import { BESTIARY, perksOf } from '../../../shared/src/data/collection';
import { HOME_ID, HOME_LEVELS, HOME_MAX, HOME_NPC, HOME_SIGN, HOME_TROPHIES, HOME_TROPHY, TROPHY_CATS, buyBlock, hasBed, hasStations, homeStands, ownsTrophy, trophySeen, upgradeBlock } from '../../../shared/src/data/home';
import { ITEMS } from '../../../shared/src/data/items';
import { LOOKS, LOOK_LIST } from '../../../shared/src/data/looks';
import { PETS, PET_LIST } from '../../../shared/src/data/pets';
import type { StationId } from '../../../shared/src/data/recipes';
import { ZONES } from '../../../shared/src/data/zones';
import { getMap, type GameMap } from '../../../shared/src/maps/mapgen';
import { T, TILE } from '../../../shared/src/maps/tiles';
import type { CharData, ClientMsg, HomeData, ItemInstance, PlayerInfo, ZoneInit } from '../../../shared/src/types';
import type { Game } from '../game';
import { Player, nextId } from '../player';
import { Zone, type Mob, type Obj } from '../zone';
import { absorb, onDirty, onKill, refresh, unlockLook, unlockPet } from './collect';
import { OWNER, acc, flush, homeOf, touch } from './state';
import { stashMessage } from './storage';

type HomeMsg = Extract<ClientMsg, { t: 'home' }>;
const H = CFG.home;
export function reject(p: Player, s: string) { p.toast(s, 'bad'); p.pev.push({ k: 'sfx', n: 'ui_error' }); }

// ------------------------------------------------------------------ Wegweiser in Quellhain
let signCache: { x: number; y: number } | null | undefined;
/** Platz des Wegweisers: nächste freie, geräumige Kachel abseits der Wege (die Karte bleibt unverändert). */
export function signSpot(): { x: number; y: number } | null {
  if (signCache !== undefined) return signCache;
  const map = getMap(HOME_SIGN.zone), poi = map.def.pois?.find(p => p.id === HOME_SIGN.poi);
  signCache = null;
  if (!poi) return null;
  const I = (x: number, y: number) => y * map.w + x;
  const open = (x: number, y: number) => x >= 2 && y >= 2 && x < map.w - 2 && y < map.h - 2 && !map.solid[I(x, y)] && map.tiles[I(x, y)] !== T.PATH && map.tiles[I(x, y)] !== T.BRIDGE && map.tiles[I(x, y)] !== T.HAZARD;
  const roomy = (x: number, y: number) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!open(x + dx, y + dy)) return false; return true; };
  const taken = (tx: number, ty: number) => map.objects.some(o => Math.abs(Math.floor(o.x / TILE) - tx) <= 2 && Math.abs(Math.floor(o.y / TILE) - ty) <= 2);
  for (let r = 0; r <= 8 && !signCache; r++) for (let oy = -r; oy <= r && !signCache; oy++) for (let ox = -r; ox <= r && !signCache; ox++) {
    if (Math.max(Math.abs(ox), Math.abs(oy)) !== r) continue;
    const tx = poi.x + HOME_SIGN.dx + ox, ty = poi.y + HOME_SIGN.dy + oy;
    if (roomy(tx, ty) && !taken(tx, ty)) signCache = { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
  }
  return signCache;
}
function toQuellhain(g: Game, p: Player) {
  const s = signSpot();
  g.transfer(p, HOME_SIGN.zone, '', s ? { x: s.x, y: s.y + 18 } : undefined);
}

// ------------------------------------------------------------------ Hof-Instanz und ihre Einrichtung
const NONE = { label: null, prompt: null, ui: null, station: null, light: null, tro: null };
/** Aussehen und Aufforderung eines Hof-Objekts aus dem Stand des Besitzers. `ui` sagt dem Client, was er öffnen soll. */
function look(h: HomeData, kind: string, idx: number): Record<string, any> {
  const bau = (frame: string, lvl: number) => ({ frame, label: 'Bauplatz', prompt: `Bauplatz ansehen: ${HOME_LEVELS[lvl].name}`, ui: 'ausbau' });
  switch (kind) {
    case 'stash': return { frame: 'stash_chest', prompt: 'Lagertruhe öffnen', ui: 'lager' };
    case 'wardrobe': return { frame: 'house_shelf', prompt: 'Kleiderschrank öffnen', ui: 'schrank' };
    case 'table': return { frame: 'house_table', prompt: 'Baupläne ansehen', ui: 'ausbau' };
    case 'stable': return { frame: 'haystack', prompt: 'Nach den Begleitern sehen', ui: 'begleiter' };
    case 'bed': return hasBed(h) ? { frame: 'bed', prompt: 'Schlafen', ui: 'bett' } : bau('woodpile', 3);
    case 'forge': return hasStations(h) ? { frame: 'forge', prompt: 'Schmieden', station: 'forge', light: [72, 0xff9040, 0.9] } : bau('woodpile', 2);
    case 'alchemy': return hasStations(h) ? { frame: 'station_alchemy', prompt: 'Tränke und Elixiere brauen', station: 'alchemy', light: [30, 0x70ffd8, 0.4] } : bau('crate', 2);
    case 'cooking': return hasStations(h) ? { frame: 'station_cook', prompt: 'Kochen', station: 'cooking', light: [82, 0xffb060, 0.95] } : bau('barrel', 2);
    case 'enchant': return hasStations(h) ? { frame: 'station_enchant', prompt: 'Ausrüstung verzaubern', station: 'enchant', light: [56, 0x80c0ff, 0.7] } : bau('crate', 2);
    case 'stand': {
      if (idx >= homeStands(h)) return { frame: 'fence_post' };
      const t = HOME_TROPHY[h.stands[idx]];
      if (!t || !ownsTrophy(h, t.id)) return { frame: 'trophy_stand', prompt: 'Trophäenständer (leer)', ui: 'trophaeen' };
      return { frame: 'trophy_stand', label: t.name, prompt: `Trophäe ansehen: ${t.name}`, ui: 'trophaeen', tro: t.id, light: [36, TROPHY_CATS.find(c => c.id === t.cat)!.color, 0.55] };
    }
    case 'tor': return { frame: 'signpost', label: 'Quellhain', prompt: 'Zurück nach Quellhain', ui: 'tor' };
  }
  return {};
}
/** Richtet die Instanz nach dem Stand des Besitzers ein; geänderte Objekte gehen als Ereignis an alle Anwesenden. */
function dress(g: Game, z: Zone) {
  const o = OWNER.get(z);
  if (!o) return;
  const h = acc(g, o.acc).h;
  for (const obj of z.objs.values()) {
    if (obj.type !== 'hobj') continue;
    const kind = String(obj.tag), idx = Number(obj.props?.idx ?? 0);
    const props = { sid: obj.props?.sid, kind, idx, ...NONE, ...look(h, kind, idx) };
    if (JSON.stringify(props) === JSON.stringify(obj.props)) continue;
    obj.props = props;
    z.ev({ k: 'obj', id: obj.id, state: obj.state, props });
  }
}
function instance(g: Game, owner: Player): Zone {
  const key = `${HOME_ID}:${owner.accountId}`;
  let z = g.zones.get(key);
  if (!z) {
    z = new Zone(g, ZONES[HOME_ID], { key });
    g.zones.set(key, z);
    OWNER.set(z, { acc: owner.accountId, name: owner.name });
    dress(g, z);
    z.events = []; // die Einrichtung steht schon in `initFor`
  }
  return z;
}
function near(p: Player, kind: string, r = H.useRadius): Obj | undefined {
  for (const o of p.zone.objs.values()) if (o.type === 'hobj' && o.tag === kind && Math.hypot(o.x - p.x, o.y - p.y) <= r) return o;
  return undefined;
}
/** Steht der Spieler auf seinem EIGENEN Hof? */
export const atOwn = (p: Player) => OWNER.get(p.zone)?.acc === p.accountId;

// ------------------------------------------------------------------ „Ausgeruht“
function applyRest(p: Player) {
  const left = (p.char.rest ?? 0) - p.char.playtime;
  if (left <= 1) { if (p.char.rest !== undefined) { delete p.char.rest; p.sync('rest'); } return; }
  p.addBuff({ id: 'rest', name: 'Ausgeruht', glyph: 'p_vit', icon: 'item_food_tee', until: p.zone.game.now + left, mods: { xpPct: H.rest.xpPct }, shield: 0, keep: true,
    desc: `Ausgeruht – +${H.rest.xpPct} % Erfahrung (auch für Quellstufen). Gilt nur, während du spielst.` });
}

// ------------------------------------------------------------------ Nachrichten
function handle(g: Game, p: Player, m: HomeMsg) {
  const c = p.char, a = acc(g, p.accountId), h = a.h, z = p.zone;
  switch (String(m.a)) {
    case 'buy': {
      if (!g.nearNpc(p, HOME_NPC)) return reject(p, 'Den Hof verkauft Mirelda. Persönlich und mit Kommentar.');
      const why = buyBlock(c, h);
      if (why) return reject(p, why);
      c.gold -= H.price; c.flags['t:heim'] = 1;
      h.owned = 1; h.level = 0;
      touch(g, p.accountId, 'owned', 'level');
      p.sync('gold', 'flags');
      p.toast('Der Hof am Waldrand gehört dir. Der Wegweiser am Dorfrand zeigt hin – und jeder Quellstein kennt jetzt den Weg nach Hause.', 'story');
      p.pev.push({ k: 'sfx', n: 'quest_complete' });
      g.savePlayer(p);
      return;
    }
    case 'go': {
      if (z.rift || OWNER.has(z)) return;
      if (!near(p, 'weg', 70)) return reject(p, 'Der Weg zum Hof beginnt am Wegweiser in Quellhain.');
      let owner = p;
      if (m.owner !== undefined && m.owner !== p.id) {
        const q = p.party ? [...p.party.members].find(x => x.id === m.owner && !x.linkdead) : undefined;
        if (!q) return reject(p, 'Besuchen kannst du nur die Höfe deiner Gruppe.');
        owner = q;
      }
      if (!acc(g, owner.accountId).h.owned) return reject(p, owner === p ? 'Der Hof steht zum Verkauf. Mirelda hat den Schlüssel – und Ansichten über den Preis.' : `${owner.name} hat noch keinen Hof.`);
      const hz = instance(g, owner);
      p.zone.ev({ k: 'fx', n: 'blink', x: p.x, y: p.y, el: 'earth' });
      g.moveTo(p, hz, hz.map.start);
      if (owner !== p) { p.toast(`Zu Besuch auf dem Hof von ${owner.name}. Die Truhe bleibt zu – der Rest steht dir offen.`); owner.toast(`${p.name} besucht deinen Hof.`); }
      return;
    }
    case 'leave': if (OWNER.has(z)) toQuellhain(g, p); return;
    case 'put': case 'take': case 'gold': case 'sort':
      if (!atOwn(p)) return reject(p, OWNER.has(z) ? 'Fremde Truhen öffnet man nicht. Mirelda hätte dazu eine Meinung.' : 'Die Lagertruhe steht auf deinem Hof.');
      if (!near(p, 'stash')) return reject(p, 'Dafür musst du an der Lagertruhe stehen.');
      return stashMessage(g, p, m);
    case 'upgrade': {
      if (!atOwn(p)) return reject(p, 'Ausbauen kannst du nur deinen eigenen Hof – und nur vor Ort.');
      const why = upgradeBlock(c, h);
      if (why) return reject(p, why);
      const L = HOME_LEVELS[h.level + 1];
      c.gold -= L.gold;
      for (const [b, n] of L.mats) p.removeItems(b, n);
      h.level++;
      touch(g, p.accountId, 'level');
      p.sync('gold', 'inv');
      dress(g, z);
      refresh(g, p);
      p.toast(`${L.name} ist fertig. ${L.adds[0]}.`, 'story');
      z.ev({ k: 'fx', n: 'levelup', x: p.x, y: p.y });
      p.pev.push({ k: 'sfx', n: 'quest_complete' });
      p.checkCollectQuests();
      g.savePlayer(p);
      return;
    }
    case 'trophy': {
      if (!atOwn(p)) return reject(p, 'Trophäen stellst du auf deinem eigenen Hof aus.');
      const slot = Math.floor(Number(m.slot)), id = String(m.id ?? '');
      if (!(slot >= 0 && slot < homeStands(h))) return reject(p, 'Diesen Ständer gibt es noch nicht.');
      if (id && (!HOME_TROPHY[id] || !ownsTrophy(h, id))) return reject(p, 'Diese Trophäe hast du nicht.');
      if (id) for (let i = 0; i < h.stands.length; i++) if (h.stands[i] === id) h.stands[i] = '';
      h.stands[slot] = id;
      touch(g, p.accountId, 'stands');
      dress(g, z);
      refresh(g, p);
      p.pev.push({ k: 'sfx', n: 'ui_equip' });
      return;
    }
    case 'pet': {
      const id = String(m.id ?? '');
      if (id && (!PETS[id] || !h.pets.includes(id))) return reject(p, 'Diesen Begleiter kennst du noch nicht.');
      if (id) c.pet = id; else delete c.pet;
      p.sync('pet');
      refresh(g, p);
      g.broadcastPlayerInfo(p);
      return;
    }
    case 'look': {
      if (!OWNER.has(z) || !near(p, 'wardrobe')) return reject(p, 'Umziehen kannst du dich am Kleiderschrank auf einem Hof.');
      const next: NonNullable<CharData['look']> = { ...c.look };
      for (const k of ['g', 'w'] as const) {
        const id = m[k];
        if (id === undefined) continue;
        if (id === '') { delete next[k]; continue; }
        if (LOOKS[id]?.kind !== k || !h.looks.includes(id)) return reject(p, 'Diese Erscheinung hast du noch nicht freigeschaltet.');
        next[k] = id;
      }
      if (next.g || next.w) c.look = next; else delete c.look;
      p.sync('look');
      g.broadcastPlayerInfo(p);
      p.pev.push({ k: 'sfx', n: 'ui_equip' });
      return;
    }
    case 'sleep': {
      const o = OWNER.get(z);
      if (!o || !near(p, 'bed')) return reject(p, 'Zum Schlafen brauchst du ein Bett. Der Wald zählt nicht.');
      if (!hasBed(acc(g, o.acc).h)) return reject(p, 'Auf einem Bretterstapel schläft es sich schlecht. Das Bett kommt mit dem Ausbau „Herdfeuer“.');
      const sec = Math.round(H.rest.sec * (1 + perksOf(h, c).rest));
      c.rest = Math.round(c.playtime + sec);
      p.sync('rest');
      applyRest(p);
      p.hp = p.stats.maxHp; p.mp = p.stats.maxMp;
      z.ev({ k: 'fx', n: 'heal', x: p.x, y: p.y, el: 'light' });
      p.pev.push({ k: 'sfx', n: 'heal' });
      p.toast(`Ausgeruht: +${H.rest.xpPct} % Erfahrung für ${Math.round(sec / 60)} Minuten Spielzeit.`, 'good', 'item_food_tee');
      return;
    }
  }
}

export const Home = {
  // ================================================================== Speichern, Betreten
  /** Speichert den Charakter – und in derselben Transaktion den Profil-Stand, falls er sich geändert hat. */
  save(g: Game, p: Player) {
    const a = acc(g, p.accountId);
    g.db.saveChar(p.charId, p.snapshotChar(), a.save ? { accountId: p.accountId, data: a.h } : undefined);
    a.save = false;
  },
  /**
   * Mehrere Charaktere in EINER Transaktion (Handel, server/src/social/trade.ts) – jeder mit seinem Profil-Stand, falls der
   * sich geändert hat. So liegt nach einem Handel nie ein frischer Charakter neben einem veralteten Hof. Wirft bei Fehlern;
   * dann ist nichts geschrieben und die Änderungsvermerke bleiben stehen.
   */
  saveMany(g: Game, ps: Player[]) {
    const accs = ps.map(p => acc(g, p.accountId));
    g.db.saveChars(ps.map((p, i) => [p.charId, p.snapshotChar(), accs[i].save ? { accountId: p.accountId, data: accs[i].h } : undefined]));
    for (const a of accs) a.save = false;
  },
  /**
   * Charakter betritt die Welt (nach `entered`): Freischaltungen prüfen, Sammlung nachtragen (alte Spielstände und neue
   * Charaktere desselben Profils), Werte und „Ausgeruht“ wiederherstellen, den ganzen Profil-Stand schicken.
   */
  onEnter(g: Game, p: Player) {
    const c = p.char, h = homeOf(g, p);
    if (c.pet && !h.pets.includes(c.pet)) { delete c.pet; p.sync('pet'); }
    if (c.look) {
      const l = { ...c.look };
      for (const k of ['g', 'w'] as const) if (l[k] && !h.looks.includes(l[k]!)) delete l[k];
      if (l.g !== c.look.g || l.w !== c.look.w) { if (l.g || l.w) c.look = l; else delete c.look; p.sync('look'); }
    }
    absorb(g, p, c.cv === undefined);
    refresh(g, p);
    applyRest(p);
    flush(g, p, true);
  },
  /** Wiederverbindung: der Client hat seinen Zustand verworfen */
  sendTo(g: Game, p: Player) { flush(g, p, true); p.buffsDirty = true; },
  /** Zone, in der ein Charakter wieder erscheint, der auf einem Hof gespeichert wurde: der eigene Hof – sonst Quellhain. */
  entry(g: Game, p: Player): Zone | null {
    const c = p.char;
    if (c.zone !== HOME_ID) return null;
    if (homeOf(g, p).owned) return instance(g, p);
    const s = signSpot(), m = getMap(HOME_SIGN.zone);
    c.zone = HOME_SIGN.zone; c.x = s ? s.x : m.start.x; c.y = s ? s.y + 18 : m.start.y;
    return null;
  },
  /** Die eigene Hof-Instanz (Quellstein-Reise, Wiederkehr) – null, wenn das Profil keinen Hof besitzt. */
  zoneFor(g: Game, p: Player): Zone | null { return homeOf(g, p).owned ? instance(g, p) : null; },
  /** Gruppenwechsel: Wer auf einem fremden Hof steht und nicht mehr zur Gruppe des Besitzers gehört, geht. true = auf einem Hof (erledigt). */
  rehome(g: Game, p: Player): boolean {
    const o = OWNER.get(p.zone);
    if (!o) return false;
    if (o.acc === p.accountId || (p.party && [...p.party.members].some(q => q.accountId === o.acc))) return true;
    toQuellhain(g, p);
    p.toast('Der Besuch ist vorbei – du stehst wieder in Quellhain.');
    return true;
  },
  /** Wegweiser zum Hof: Server-Objekt in Quellhain (wie Riss-Stein und Lagerfeuer). */
  signs(map: GameMap): Obj[] {
    if (map.id !== HOME_SIGN.zone) return [];
    const s = signSpot();
    return s ? [{ id: nextId(), type: 'hobj', x: s.x, y: s.y, state: 0, tag: 'weg', props: { sid: 'heimweg', kind: 'weg', ...NONE, frame: 'lamp', label: 'Hof am Waldrand', prompt: 'Zum Hof am Waldrand', ui: 'weg', light: [84, 0xffd89a, 0.9] } }] : [];
  },
  init(z: Zone, p: Player): ZoneInit['heim'] {
    const o = OWNER.get(z);
    return o ? { owner: o.name, own: o.acc === p.accountId, level: acc(z.game, o.acc).h.level } : undefined;
  },
  /** Zusatz zur Spieler-Info: Begleiter, Gewand, Waffenglanz */
  info(p: Player): Pick<PlayerInfo, 'pet' | 'g' | 'w'> { return { pet: p.char.pet, g: p.char.look?.g, w: p.char.look?.w }; },

  // ================================================================== Spieleraktionen
  message(g: Game, p: Player, m: HomeMsg) {
    if (p.dead || !m || typeof m.a !== 'string') return;
    handle(g, p, m);
    flush(g, p);
  },
  /** Objekte des Hofs: Fast alles öffnet der Client als Fenster; Tor und Wegweiser gehen auch über die normale Interaktion. */
  interact(z: Zone, p: Player, o: Obj): boolean {
    if (o.type !== 'hobj') return false;
    if (o.tag === 'tor') this.message(z.game, p, { t: 'home', a: 'leave' });
    else if (o.tag === 'weg') this.message(z.game, p, { t: 'home', a: 'go' });
    return true;
  },
  /** Steht der Spieler an dieser Station eines (eigenen oder besuchten) Hofs, und ist sie schon gebaut? */
  atStation(p: Player, station: StationId): boolean {
    const o = OWNER.get(p.zone);
    return !!o && hasStations(acc(p.zone.game, o.acc).h) && !!near(p, station, CFG.craft.fireRadius);
  },
  /** „Pilzling im Topf“ und künftige Begleiter-Gegenstände */
  useItem(g: Game, p: Player, it: ItemInstance): boolean {
    const id = ITEMS[it.base].use!.pet!, d = PETS[id];
    if (!d) return false;
    if (homeOf(g, p).pets.includes(id)) { p.toast(`${d.name} wohnt schon bei dir. Den zweiten kannst du verkaufen – oder verschenken.`, 'info'); return false; }
    p.removeItems(it.base, 1);
    unlockPet(g, p, id);
    flush(g, p);
    return true;
  },
  onKill(z: Zone, m: Mob, rec: Player[]) { onKill(z, m, rec); },

  // ================================================================== Spieltakt
  /** Schickt geänderte Profil-Stände an ihre Spieler: einmal je Takt und nur, wenn sich etwas geändert hat (Siege werden so gebündelt). */
  tick(g: Game, _dt: number) { for (const p of g.players.values()) flush(g, p); },

  // ================================================================== Tests, Dev-Befehle
  of: homeOf, instance, dress, absorb, unlockPet, unlockLook, signSpot, owner: (z: Zone) => OWNER.get(z),
  /** /hof [stufe] · /begleiter <id|alle> · /gewand · /trophaeen · /bestiarium [n] */
  dev(g: Game, p: Player, cmd: string, a: string[]): boolean {
    const h = homeOf(g, p);
    if (cmd === 'hof') {
      h.owned = 1; h.level = Math.max(0, Math.min(HOME_MAX, a[0] !== undefined ? +a[0] || 0 : h.level));
      p.char.flags['t:heim'] = 1; p.sync('flags'); touch(g, p.accountId, 'owned', 'level');
      const z = instance(g, p);
      dress(g, z);
      if (p.zone !== z) g.moveTo(p, z, z.map.start);
    } else if (cmd === 'begleiter') { for (const d of PET_LIST) if (a[0] === 'alle' || a[0] === d.id) unlockPet(g, p, d.id); }
    else if (cmd === 'gewand') { for (const d of LOOK_LIST) unlockLook(g, p, d.id, true); }
    else if (cmd === 'trophaeen') { for (const t of HOME_TROPHIES) h.seen[trophySeen(t.id)] = 1; touch(g, p.accountId, 'seen'); }
    else if (cmd === 'bestiarium') { for (const b of BESTIARY.slice(0, +a[0] || BESTIARY.length)) h.kills[b.id] = Math.max(h.kills[b.id] ?? 0, 10); touch(g, p.accountId, 'kills'); absorb(g, p); }
    else return false;
    flush(g, p);
    return true;
  },
};

// Die Sammlung liest mit, sobald sich an einem Charakter etwas ändert (siehe collect.ts)
Player.onDirty = (p, keys) => onDirty(p.zone.game, p, keys);
