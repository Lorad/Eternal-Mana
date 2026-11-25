/**
 * Story-Engine (ab 0.3), Serverseite. Hier wird alles geprüft und verbucht, was die Geschichte betrifft:
 * Dialogbäume (Nähe, erreichbarer Knoten, Bedingung), Entscheidungen, Chronik-Funde, Hüterschreine,
 * Echo-Begegnungen, besuchte Orte, verborgene Quests, Kapitel und der Schutz während Filmszenen.
 * Der Client zeigt nur an (client/src/ui/story.tsx, client/src/game/cinematic.ts).
 */
import { fullKit } from '../../shared/src/equip';
import { circleFree } from '../../shared/src/collision';
import { CFG } from '../../shared/src/config';
import { DOCS } from '../../shared/src/data/chronik';
import { MEMORY_KEYS, condOk, countMemories, type MemoryKey } from '../../shared/src/data/cond';
import { TOPIC } from '../../shared/src/data/dialoge';
import { BOSSES, ENEMIES } from '../../shared/src/data/enemies';
import { ITEMS, generateGear, makeStack } from '../../shared/src/data/items';
import { NPCS } from '../../shared/src/data/npcs';
import { QUESTS, QUEST_LIST, questChapter, questStartable, type QuestDef } from '../../shared/src/data/quests';
import { CINES, DECISIONS, ECHOES, MEMORY_NAMES, PLACES, SHRINES, cineSeconds, objVisible, type DlgFx, type EchoDef } from '../../shared/src/data/story';
import { kreisLevel, kreisOf } from '../../shared/src/data/rifts';
import { ZONES } from '../../shared/src/data/zones';
import { TILE } from '../../shared/src/maps/tiles';
import type { ClientMsg } from '../../shared/src/types';
import { questPoints } from './endgame';
import type { Game } from './game';
import type { Player } from './player';
import { Mob, type Obj, type Zone } from './zone';

interface ActiveEcho { def: EchoDef; x: number; y: number; mobs: Set<Mob>; who: Set<Player>; aloneSince: number; obj?: Obj }
interface ZoneStory { echoes: Map<string, ActiveEcho>; t: number }
const zoneState = new WeakMap<Zone, ZoneStory>();
const zs = (z: Zone): ZoneStory => { let s = zoneState.get(z); if (!s) zoneState.set(z, (s = { echoes: new Map(), t: 0 })); return s; };

/** Orte je Zone in Weltpixeln */
const PLACE_POS: Record<string, { id: string; x: number; y: number; r: number }[]> = {};
for (const id in PLACES) {
  const pl = PLACES[id], poi = ZONES[pl.zone]?.pois?.find(p => p.id === pl.poi);
  if (!poi) continue;
  (PLACE_POS[pl.zone] ??= []).push({ id, x: (poi.x + (pl.dx ?? 0) + 0.5) * TILE, y: (poi.y + (pl.dy ?? 0) + 0.5) * TILE, r: (pl.r ?? poi.r) * TILE });
}
const VISIT_QUESTS = QUEST_LIST.filter(q => q.trigger?.visit);
const LORE_QUESTS = QUEST_LIST.filter(q => q.trigger?.lore);

function setFlag(p: Player, key: string, v = 1) { p.char.flags[key] = v; p.sync('flags'); }

/** Startet eine Quest ohne Auftraggeber-Gespräch (Dialogwirkung, Fundstück, Ort). */
function startQuest(p: Player, q: QuestDef | undefined): boolean {
  if (!q || !questStartable(p.char, q)) return false;
  p.char.quests[q.id] = { s: 'active', p: q.objectives.map(() => 0), n: p.char.quests[q.id]?.n };
  p.sync('quests');
  p.toast(q.hidden ? `Geheime Quest entdeckt: ${q.name}` : `Quest angenommen: ${q.name}`, 'quest');
  p.pev.push({ k: 'sfx', n: q.hidden ? 'secret' : 'quest_accept' });
  p.checkCollectQuests();
  Story.onAccept(p, q);
  return true;
}

function grantMemory(p: Player, el: MemoryKey) {
  if (p.char.flags[`h:${el}`]) return;
  setFlag(p, `h:${el}`);
  const m = MEMORY_NAMES[el];
  p.toast(`Hüter-Erinnerung empfangen: ${m.guardian} (${countMemories(p.char)}/${MEMORY_KEYS.length})`, 'story');
  p.checkCollectQuests();
}

export const Story = {
  // ================================================================== Sichtbarkeit & Objektzustand
  /** Existiert das Objekt für diesen Spieler (Bedingung `props.when`)? */
  visible(p: Player, o: { props?: Record<string, any> }): boolean { return objVisible(p.char, o); },
  /** Spielerbezogener Zustand der Story-Objekte: Dokument 1 = gefunden · Riss 1 = geschlossen · Schrein 1 = Echo bestanden, 2 = Erinnerung empfangen */
  objState(o: Obj, p: Player): number | undefined {
    const f = p.char.flags;
    if (o.type === 'lore') return f[`l:${o.tag}`] ? 1 : 0;
    if (o.type === 'rift') return f[`e:${o.tag}`] ? 1 : 0;
    if (o.type === 'shrine') return f[`h:${o.tag}`] ? 2 : f[`e:schrein_${o.tag}`] ? 1 : 0;
    return undefined;
  },

  // ================================================================== Interaktion mit Story-Objekten
  interact(zone: Zone, p: Player, o: Obj): boolean {
    if (o.type !== 'lore' && o.type !== 'shrine' && o.type !== 'rift') return false;
    if (!objVisible(p.char, o)) return true;
    if (o.type === 'lore') this.readLore(p, o.tag!, o);
    else if (o.type === 'rift') { if (!p.char.flags[`e:${o.tag}`]) this.startEcho(zone, p, o.tag!, o); }
    else this.shrine(zone, p, o);
    return true;
  },
  readLore(p: Player, id: string, o?: Obj) {
    const doc = DOCS[id];
    if (!doc) return;
    const first = !p.char.flags[`l:${id}`];
    if (first) {
      setFlag(p, `l:${id}`);
      if (o) p.pev.push({ k: 'obj', id: o.id, state: 1 });
      p.pev.push({ k: 'sfx', n: 'pickup_rare' });
      p.toast(`Chronik: „${doc.title}“ gefunden`, 'story');
    }
    p.send({ t: 'lore', id, first: first ? 1 : undefined });
    for (const q of LORE_QUESTS) if (q.trigger!.lore!.includes(id)) startQuest(p, q);
    p.checkCollectQuests();
  },
  shrine(zone: Zone, p: Player, o: Obj) {
    const def = SHRINES[o.tag!];
    if (!def) return;
    const el = def.el, f = p.char.flags;
    if (f[`h:${el}`]) { this.playCine(p, `mem_${el}`); return; }
    if (!p.char.quests[def.quest]) {
      const q = QUESTS[def.quest];
      p.toast(q && condOk(p.char, q.when) ? `Stein, Moos, sieben Kerben. Der Schrein schweigt. ${NPCS[q.giver]?.name ?? 'Jemand'} weiß vielleicht mehr darüber.` : 'Stein, Moos, sieben Kerben. Der Schrein schweigt – noch.');
      return;
    }
    if (f[`e:schrein_${el}`]) {
      grantMemory(p, el);
      p.pev.push({ k: 'obj', id: o.id, state: 2 });
      this.playCine(p, `mem_${el}`);
      return;
    }
    this.startEcho(zone, p, `schrein_${el}`, o);
  },

  // ================================================================== Echo-Begegnungen
  startEcho(zone: Zone, p: Player, id: string, o: Obj) {
    const def = ECHOES[id], st = zs(zone);
    if (!def || p.dead) return;
    const running = st.echoes.get(id);
    if (running) { running.who.add(p); p.toast('Das Echo ist bereits erwacht.', 'bad'); return; }
    const [lo, hi] = def.lvl ?? [28, 38];
    const lvl = kreisLevel(Math.max(lo, Math.min(hi, p.level)), zone.kreis);
    const e: ActiveEcho = { def, x: o.x, y: o.y, mobs: new Set(), who: new Set([p]), aloneSince: 0, obj: o };
    const spawn = (mobId: string, elite: boolean, k: number, n: number) => {
      const d = ENEMIES[mobId];
      if (!d) return;
      let x = o.x, y = o.y + 30;
      for (let t = 0; t < 14; t++) {
        const a = (k / Math.max(1, n)) * Math.PI * 2 + zone.rng.range(-0.4, 0.4), r = zone.rng.range(elite ? 26 : 34, elite ? 40 : 64);
        const nx = o.x + Math.cos(a) * r, ny = o.y + Math.sin(a) * r;
        if (circleFree(d.flying ? zone.solidFly : zone.solidWalk, nx, ny, 7)) { x = nx; y = ny; break; }
      }
      const m = new Mob(d, lvl, x, y, elite, -1, -1);
      m.summoned = true; m.awake = true; m.target = p; m.state = 'chase';
      if (elite && def.elite) { m.name = def.elite.name; if (def.elite.element) m.element = def.elite.element; }
      zone.mobs.set(m.id, m);
      zone.ev({ k: 'mob+', m: m.info() });
      zone.ev({ k: 'fx', n: 'spawn', x, y, el: m.element });
      e.mobs.add(m);
    };
    const total = def.mobs.reduce((a, [, n]) => a + n, 0) + (def.elite ? 1 : 0);
    let k = 0;
    if (def.elite) spawn(def.elite.mob, true, k++, total);
    for (const [mobId, n] of def.mobs) for (let i = 0; i < n; i++) spawn(mobId, false, k++, total);
    if (!e.mobs.size) return;
    st.echoes.set(id, e);
    zone.ev({ k: 'sfx', n: 'boss_phase', x: o.x, y: o.y });
    zone.ev({ k: 'fx', n: 'explosion', x: o.x, y: o.y - 6, r: 40, el: def.elite?.element ?? 'water' });
    for (const q of zone.players.values()) if (Math.hypot(q.x - o.x, q.y - o.y) < 360) q.toast(def.start, 'story');
  },
  onMobDeath(zone: Zone, m: Mob) {
    if (!m.summoned) return;
    const st = zoneState.get(zone);
    if (!st) return;
    for (const [id, e] of st.echoes) {
      if (!e.mobs.delete(m)) continue;
      for (const h of m.hitters) e.who.add(h);
      if (e.mobs.size) return;
      st.echoes.delete(id);
      zone.ev({ k: 'sfx', n: 'puzzle_solved', x: e.x, y: e.y });
      zone.ev({ k: 'fx', n: 'shard', x: e.x, y: e.y });
      const shrine = e.obj?.type === 'shrine';
      for (const p of zone.players.values()) {
        // Beteiligte, Umstehende – und (0.7, wie bei der Kill-Wertung) Gruppenmitglieder von Beteiligten im Gruppenradius
        const d = Math.hypot(p.x - e.x, p.y - e.y);
        if (!e.who.has(p) && d > 420 && !(p.party && d <= CFG.combat.partyXpRadius && [...e.who].some(h => h.party === p.party))) continue;
        const first = !p.char.flags[`e:${id}`];
        setFlag(p, `e:${id}`);
        if (e.obj) p.pev.push({ k: 'obj', id: e.obj.id, state: 1 });
        p.toast(e.def.end, 'story');
        if (shrine) p.toast('Der Schrein ist still geworden. Berühre ihn noch einmal.', 'info');
        if (first) p.gainXp(CFG.enemy.xp(m.lvl) * 8);
        p.checkCollectQuests();
      }
      return;
    }
  },

  // ================================================================== regelmäßige Prüfungen je Zone (Orte, verwaiste Echos)
  tick(zone: Zone, dt: number) {
    const st = zs(zone);
    if ((st.t += dt) < 0.5) return;
    st.t = 0;
    const now = zone.game.now;
    for (const [id, e] of st.echoes) {
      const near = zone.alivePlayers().some(p => Math.hypot(p.x - e.x, p.y - e.y) < 520);
      if (near) { e.aloneSince = 0; continue; }
      if (!e.aloneSince) { e.aloneSince = now; continue; }
      if (now - e.aloneSince < 12) continue;
      for (const m of e.mobs) { m.dead = true; zone.mobs.delete(m.id); zone.ev({ k: 'mob-', id: m.id }); }
      st.echoes.delete(id);
    }
    const places = PLACE_POS[zone.id];
    for (const p of zone.players.values()) {
      const s = p.story;
      if (s.zone !== zone.id) { s.zone = zone.id; s.places.clear(); }
      if (!places || p.dead || p.linkdead) continue;
      for (const pl of places) {
        const inside = Math.hypot(p.x - pl.x, p.y - pl.y) <= pl.r;
        // Questziel „besuchen“: zählt, solange man dort steht – auch wenn die Quest erst vor Ort angenommen wurde
        if (inside && !p.char.flags[`v:${pl.id}`]) this.markVisit(p, pl.id);
        // verborgene Quests lösen nur beim Betreten aus (nicht erneut, wenn man sie vor Ort aufgibt)
        if (inside === s.places.has(pl.id)) continue;
        if (!inside) { s.places.delete(pl.id); continue; }
        s.places.add(pl.id);
        for (const q of VISIT_QUESTS) if (q.trigger!.visit === pl.id) startQuest(p, q);
      }
    }
  },
  markVisit(p: Player, place: string) {
    const c = p.char;
    for (const id in c.quests) {
      if (c.quests[id].s !== 'active') continue;
      if (!QUESTS[id]?.objectives.some(o => o.t === 'visit' && o.place === place)) continue;
      setFlag(p, `v:${place}`);
      p.checkCollectQuests();
      return;
    }
  },

  // ================================================================== Dialogbäume
  dlgOpen(game: Game, p: Player, npc: string, topicId: string) {
    const t = TOPIC[topicId];
    if (!t || t.npc !== npc || p.dead || !game.nearNpc(p, npc) || !condOk(p.char, t.if) || !t.nodes.start) {
      p.send({ t: 'dlg', npc, topic: topicId, node: null, err: 1 });
      return;
    }
    p.story.dlg = { npc, topic: topicId, node: 'start' };
    this.applyFx(p, t.nodes.start.fx);
    p.send({ t: 'dlg', npc, topic: topicId, node: 'start' });
  },
  dlgPick(game: Game, p: Player, m: Extract<ClientMsg, { t: 'dlgPick' }>) {
    const s = p.story.dlg, t = s ? TOPIC[s.topic] : undefined;
    const node = t?.nodes[s!.node];
    const opt = node?.opts && Number.isInteger(m.opt) ? node.opts[m.opt] : undefined;
    // gültig nur: laufendes Gespräch an genau diesem Knoten, NPC in Reichweite, Option vorhanden und Bedingung erfüllt
    if (!s || !t || !opt || s.npc !== m.npc || s.topic !== m.topic || s.node !== m.node || p.dead || !game.nearNpc(p, s.npc) || !condOk(p.char, opt.if)) {
      p.send({ t: 'dlg', npc: String(m.npc), topic: String(m.topic), node: null, err: 1 });
      return;
    }
    this.applyFx(p, opt.fx);
    const next = opt.to && t.nodes[opt.to] ? opt.to : null;
    if (next) { s.node = next; this.applyFx(p, t.nodes[next].fx); } else p.story.dlg = null;
    p.send({ t: 'dlg', npc: s.npc, topic: s.topic, node: next });
  },
  applyFx(p: Player, fx: DlgFx | undefined) {
    if (!fx) return;
    const c = p.char;
    if (fx.decide) {
      const [id, v] = fx.decide, d = DECISIONS[id], o = d?.options.find(x => x.v === v);
      if (d && o && !c.flags[`d:${id}`]) {
        setFlag(p, `d:${id}`, v);
        p.toast(`Entscheidung getroffen – ${d.title}: ${o.label}`, 'story');
        p.pev.push({ k: 'sfx', n: 'quest_progress' });
      }
    }
    for (const f of fx.flag ? (Array.isArray(fx.flag) ? fx.flag : [fx.flag]) : []) if (!c.flags[f]) setFlag(p, f);
    if (fx.mem) grantMemory(p, fx.mem);
    for (const [item, n] of fx.take ?? []) p.removeItems(item, Math.min(n, p.countItem(item)));
    for (const [item, n] of fx.give ?? []) {
      if (!ITEMS[item] || (ITEMS[item].kind === 'quest' && p.countItem(item) >= n)) continue;
      p.give(makeStack(item, n));
    }
    if (fx.quest) startQuest(p, QUESTS[fx.quest]);
    if (fx.cine) this.playCine(p, fx.cine, !fx.mem);
    if (fx.boss) {
      const b = p.zone.boss;
      if (b && b.def.spared !== undefined && !b.active) { b.challenge(); p.toast('Der Kampf beginnt, sobald du bereit im Raum stehst.', 'info'); }
      else p.toast(b?.active ? 'Der Kampf läuft bereits.' : 'Dafür musst du am Ort der Prüfung sein.', 'bad');
    }
    p.checkCollectQuests();
  },

  // ================================================================== Filmszenen
  /** Schickt eine Filmszene und schützt den Zuschauer, bis sie endet (Meldung des Clients) oder die Frist abläuft. */
  playCine(p: Player, id: string, once = false) {
    const def = CINES[id];
    if (!def || (once && p.char.flags[`k:${id}`])) return;
    if (!p.char.flags[`k:${id}`]) setFlag(p, `k:${id}`);
    const now = p.zone.game.now;
    if (p.story.cineUntil <= now) p.story.cineAt = now;
    p.story.cineUntil = Math.min(now + 300, Math.max(now, p.story.cineUntil) + cineSeconds(def));
    p.iframesUntil = Math.max(p.iframesUntil, p.story.cineUntil);
    p.send({ t: 'cine', id });
  },
  cineEnd(p: Player) {
    const now = p.zone.game.now;
    if (p.story.cineUntil <= now) return;
    p.story.cineUntil = 0;
    p.iframesUntil = Math.min(p.iframesUntil, now + 1.2);
  },

  // ================================================================== Quests: Kapitel, Zusatzbelohnungen, Filmszenen
  onAccept(p: Player, q: QuestDef) {
    // Wer die Prüfung eines verschonten Story-Bosses schon bestanden hat (etwa als Helfer in einer Gruppe), muss sie nicht wiederholen
    const st = p.char.quests[q.id];
    q.objectives.forEach((o, i) => {
      if (o.t === 'boss' && st && BOSSES[o.boss]?.spared !== undefined && p.char.flags[`b:${o.boss}`] && !st.p[i]) { st.p[i] = 1; p.sync('quests'); }
    });
    const ch = questChapter(q);
    if (!ch) return;
    let seen = p.char.flags.ch ?? 0;
    if (!seen) for (const o of QUEST_LIST) if (o !== q && p.char.quests[o.id]) seen = Math.max(seen, questChapter(o) ?? 0);
    if (ch <= seen) return;
    setFlag(p, 'ch', ch);
    this.playCine(p, `ch${ch}`);
  },
  onTurnIn(p: Player, q: QuestDef) {
    const c = p.char;
    for (const f of q.flags ?? []) setFlag(p, f);
    for (const b of q.bonus ?? []) {
      if (!condOk(c, b.if)) continue;
      if (b.gold) p.gainGold(b.gold);
      for (const [base, n] of b.items ?? []) p.give(makeStack(base, n));
      if (b.gear !== undefined) p.give(generateGear(p.zone.rng, kreisLevel(Math.min(CFG.player.maxLevel, q.level + 1), kreisOf(c)), b.gear, c.cls));
      questPoints(p, b.skillPoints, b.attrPoints); // 0.5: ab dem zweiten Kreis Echo-Fragmente statt Punkten
      if (b.xp) p.gainXp(b.xp);
      p.toast(b.note, 'story');
    }
    const cine = typeof q.cine === 'string' ? q.cine : q.cine?.find(x => condOk(c, x.if))?.id;
    if (cine) this.playCine(p, cine);
  },

  // ================================================================== Entwickler-Befehle (nur EM_DEV=1)
  dev(game: Game, p: Player, cmd: string, a: string[]): boolean {
    const c = p.char;
    const warp = (x: number, y: number) => { p.x = x; p.y = y; p.epoch++; p.send({ t: 'pos', x, y, e: p.epoch }); };
    switch (cmd) {
      case 'akt2': // Akt I abgeschlossen, bereit für Kapitel 7
        for (const q of QUEST_LIST) if (q.type === 'main' && !q.chapter) c.quests[q.id] = { s: 'done', p: [], n: 1 };
        while (c.level < 32) { c.xp = CFG.xpToNext(c.level); p.gainXp(0.0001); }
        for (const it of Object.values(fullKit(p.zone.rng, c.level, 3, c.cls))) p.give(it!, false); // 0.9: alle zehn Plätze
        p.sync('quests'); return true;
      case 'qa': { const q = QUESTS[a[0]]; if (q) { c.quests[q.id] = { s: 'active', p: q.objectives.map(() => 0) }; p.sync('quests'); p.checkCollectQuests(); } return true; }
      case 'flag': if (a[0]) { if (a[1] === '0') { delete c.flags[a[0]]; p.sync('flags'); } else setFlag(p, a[0], +a[1] || 1); p.checkCollectQuests(); } return true;
      case 'dec': if (DECISIONS[a[0]]) { setFlag(p, `d:${a[0]}`, +a[1] || 1); p.checkCollectQuests(); } return true;
      case 'lore': for (const id of a[0] === 'all' ? Object.keys(DOCS).filter(k => !DOCS[k].when) : [a[0]]) if (DOCS[id]) setFlag(p, `l:${id}`); p.checkCollectQuests(); return true;
      case 'mem': for (const k of a[0] === 'all' ? MEMORY_KEYS : [a[0] as MemoryKey]) if (MEMORY_KEYS.includes(k)) setFlag(p, `h:${k}`); p.checkCollectQuests(); return true;
      case 'cine': this.playCine(p, a[0]); return true;
      case 'npc': { const o = [...p.zone.objs.values()].find(x => x.type === 'npc' && x.tag === a[0]); if (o) warp(o.x, o.y + 18); return true; }
      case 'obj': { const o = [...p.zone.objs.values()].find(x => x.type === a[0] && (!a[1] || x.tag === a[1])); if (o) warp(o.x, o.y + 18); return true; }
    }
    return false;
  },
};
