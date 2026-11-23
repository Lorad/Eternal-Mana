/**
 * Spielverwaltung: Sitzungen, Charaktere, Zonen-Instanzen, Gruppen, Nachrichtenverteilung und Speichern.
 * Alle spielrelevanten Entscheidungen fallen hier bzw. in zone.ts – der Client schickt nur Absichten.
 */
import type { WebSocket } from 'ws';
import { circleFree } from '../../shared/src/collision';
import { CFG } from '../../shared/src/config';
import { CLASSES } from '../../shared/src/data/classes';
import { ITEMS, TIER_MATERIAL, canEquip, generateGear, isGear, itemName, itemPrice, makeStack, newUid, sellPrice, slotOf, tierOf } from '../../shared/src/data/items';
import { NPCS, shopStock } from '../../shared/src/data/npcs';
import { QUESTS, STORY, questAvailable, questComplete } from '../../shared/src/data/quests';
import { SKILLS } from '../../shared/src/data/skills';
import { ZONES } from '../../shared/src/data/zones';
import { getMap } from '../../shared/src/maps/mapgen';
import { newCharacter } from '../../shared/src/stats';
import type { AttrKey, ClientMsg, ItemInstance, PartyMember, PlayerInfo, ServerInfo, ServerMsg, Slot } from '../../shared/src/types';
import { SLOTS } from '../../shared/src/types';
import { Rng } from '../../shared/src/util/rng';
import type { AccountRow, Db } from './db';
import { Player } from './player';
import { Story } from './story';
import { Zone } from './zone';

export interface Session {
  ws: WebSocket;
  account: AccountRow | null;
  player: Player | null;
  msgs: number; msgWindow: number;
}
export class Party {
  static next = 1;
  id = Party.next++;
  members = new Set<Player>();
}

const DEV = !!process.env.EM_DEV;

export class Game {
  now = 0;
  zones = new Map<string, Zone>();
  sessions = new Set<Session>();
  /** charId → Spieler in der Welt (auch kurzzeitig getrennte) */
  players = new Map<number, Player>();
  private invites = new Map<number, Player>();
  private rng = new Rng(Date.now() & 0xffffff);
  private last = performance.now();
  private timers = { save: 0, party: 0, online: 0, env: 0, backup: 0 };
  private timer: NodeJS.Timeout | null = null;

  constructor(public db: Db, public info: ServerInfo) {}

  clock() { return this.now; }
  private todOffset = 0.32;
  tod() { return (((this.now / CFG.world.dayLengthSec + this.todOffset) % 1) + 1) % 1; }

  start() {
    const step = 1000 / CFG.net.tickRate;
    this.last = performance.now();
    this.timer = setInterval(() => {
      const t = performance.now();
      const dt = Math.min(0.2, (t - this.last) / 1000);
      this.last = t;
      try { this.tick(dt); } catch (e) { console.error('[tick] Fehler:', e); }
    }, step);
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.saveAll();
    for (const s of this.sessions) try { s.ws.close(1001, 'Server wird beendet'); } catch { /* egal */ }
  }

  zone(id: string): Zone {
    let z = this.zones.get(id);
    if (!z) { z = new Zone(this, ZONES[id]); this.zones.set(id, z); }
    return z;
  }

  private tick(dt: number) {
    this.now += dt;
    for (const [id, z] of this.zones) {
      if (z.players.size) z.update(dt);
      else if (z.def.kind === 'dungeon' && this.now - z.emptySince > CFG.world.dungeonResetSec) this.zones.delete(id);
    }
    // getrennte Spieler nach Schonfrist entfernen
    for (const p of this.players.values()) if (p.linkdead && this.now - p.linkdeadAt > CFG.net.reconnectGraceMs / 1000) this.removePlayer(p);
    const T = this.timers;
    if ((T.save += dt) >= CFG.save.autosaveSec) { T.save = 0; this.saveAll(); }
    if ((T.party += dt) >= 1) { T.party = 0; const done = new Set<Party>(); for (const p of this.players.values()) if (p.party && !done.has(p.party)) { done.add(p.party); this.sendParty(p.party); } }
    if ((T.online += dt) >= 4) { T.online = 0; this.sendOnline(); }
    if ((T.env += dt) >= 15) { T.env = 0; const tod = this.tod(); for (const p of this.players.values()) if (!p.linkdead) p.send({ t: 'env', tod }); }
    if ((T.backup += dt) >= CFG.save.backupEveryMin * 60) { T.backup = 0; if (this.players.size) { try { this.db.backup(); } catch (e) { console.error('[backup]', e); } } }
  }

  // ------------------------------------------------------------------ Speichern
  savePlayer(p: Player) { try { this.db.saveChar(p.charId, p.snapshotChar()); } catch (e) { console.error('[save] Fehler bei', p.name, e); } }
  saveAll() { for (const p of this.players.values()) this.savePlayer(p); }
  saveZonePlayers(z: Zone) { for (const p of z.players.values()) this.savePlayer(p); }

  // ------------------------------------------------------------------ Verbindungen
  send(s: Session, m: ServerMsg) { if (s.ws.readyState === 1) s.ws.send(JSON.stringify(m)); }
  onConnect(ws: WebSocket): Session {
    const s: Session = { ws, account: null, player: null, msgs: 0, msgWindow: 0 };
    this.sessions.add(s);
    return s;
  }
  onClose(s: Session) {
    this.sessions.delete(s);
    const p = s.player;
    if (p) {
      this.savePlayer(p);
      p.linkdead = true; p.linkdeadAt = this.now; p.send = () => {};
      this.sysChat(`${p.name} hat die Verbindung verloren.`);
    }
  }
  private removePlayer(p: Player) {
    this.savePlayer(p);
    p.zone.removePlayer(p);
    this.players.delete(p.charId);
    this.leaveParty(p);
  }

  onMessage(s: Session, raw: string) {
    const sec = Math.floor(performance.now() / 1000);
    if (sec !== s.msgWindow) { s.msgWindow = sec; s.msgs = 0; }
    if (++s.msgs > 240 || raw.length > 4000) return;
    let m: ClientMsg;
    try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m.t !== 'string') return;
    try { this.route(s, m); } catch (e) { console.error('[msg] Fehler bei', m.t, e); }
  }

  private route(s: Session, m: ClientMsg) {
    if (m.t === 'ping') { this.send(s, { t: 'pong', c: m.c, n: Math.round(this.now * 1000) }); return; }
    if (m.t === 'hello') { this.hello(s, m); return; }
    if (!s.account) return;
    const p = s.player;
    switch (m.t) {
      case 'charCreate': return this.charCreate(s, m);
      case 'charDelete': if (!p) { this.db.deleteChar(s.account.id, m.id); this.send(s, { t: 'chars', chars: this.db.listChars(s.account.id) }); } return;
      case 'enter': if (!p) this.enter(s, m.id); return;
      case 'settings': if (typeof m.data === 'string') this.db.saveSettings(s.account.id, m.data); return;
    }
    if (!p) return;
    const z = p.zone;
    if (p.story.cineUntil > this.now && (m.t === 'atk' || m.t === 'skill')) Story.cineEnd(p); // wer kämpft, schaut nicht zu
    switch (m.t) {
      case 'leave': this.removePlayer(p); s.player = null; this.send(s, { t: 'chars', chars: this.db.listChars(s.account.id) }); return;
      case 'm': return this.move(p, m);
      case 'atk': return z.playerAttack(p, m.ang);
      case 'skill': return z.playerSkill(p, m.id, m.ang, m.tx, m.ty);
      case 'dodge': return z.playerDodge(p, m.ang);
      case 'interact': return z.interact(p, m.id);
      case 'revive': { const t = z.players.get(m.id); if (t && t.dead && !p.dead && Math.hypot(t.x - p.x, t.y - p.y) < 40) { t.dead = false; t.hp = Math.round(t.stats.maxHp * 0.4); t.iframesUntil = this.now + CFG.player.respawnInvuln; t.toast(`${p.name} hat dich wiederbelebt.`, 'good'); z.ev({ k: 'fx', n: 'heal', x: t.x, y: t.y, el: 'light' }); z.ev({ k: 'sfx', n: 'heal', x: t.x, y: t.y }); } return; }
      case 'respawn': return this.respawn(p);
      case 'equip': return this.equip(p, m.uid, m.slot);
      case 'unequip': return this.unequip(p, m.slot);
      case 'use': return this.useItem(p, m.uid);
      case 'quick': return this.quick(p, m.kind);
      case 'drop': { const i = p.char.inv.findIndex(it => it.uid === m.uid); if (i >= 0 && ITEMS[p.char.inv[i].base].kind !== 'quest') { p.char.inv.splice(i, 1); p.sync('inv'); } return; }
      case 'sell': return this.sell(p, m.uid, m.qty);
      case 'buy': return this.buy(p, m.npc, m.idx, m.qty ?? 1);
      case 'upgrade': return this.upgrade(p, m.uid, m.npc);
      case 'attr': return this.attr(p, m.a, m.n ?? 1);
      case 'learn': return this.learn(p, m.id);
      case 'hotbar': if (Array.isArray(m.slots)) { p.char.hotbar = [0, 1, 2, 3].map(i => { const id = m.slots[i]; return typeof id === 'string' && p.char.skills[id] && SKILLS[id]?.effects ? id : null; }); p.sync('hotbar'); } return;
      case 'respec': return this.respec(p, m.npc);
      case 'qAccept': return this.qAccept(p, m.id, m.npc);
      case 'qTurnIn': return this.qTurnIn(p, m.id, m.npc);
      case 'qAbandon': { const q = QUESTS[m.id]; if (q && q.type !== 'main' && p.char.quests[m.id]?.s === 'active') { delete p.char.quests[m.id]; p.sync('quests'); } return; }
      case 'talk': if (this.nearNpc(p, m.npc)) p.questEvent({ t: 'talk', npc: m.npc }); return;
      case 'dlgOpen': return Story.dlgOpen(this, p, String(m.npc), String(m.topic));
      case 'dlgPick': return Story.dlgPick(this, p, m);
      case 'cineEnd': return Story.cineEnd(p);
      case 'teleport': return this.teleport(p, m.zone);
      case 'chat': return this.chat(p, String(m.s ?? '').slice(0, 200));
      case 'party': return this.partyMsg(p, m.a, m.id);
      case 'save': this.savePlayer(p); p.send({ t: 'saved' }); return;
      case 'sortInv': {
        const order = ['weapon', 'helm', 'armor', 'accessory', 'consumable', 'material', 'quest'];
        p.char.inv.sort((a, b) => order.indexOf(ITEMS[a.base].kind) - order.indexOf(ITEMS[b.base].kind) || b.rarity - a.rarity || b.ilvl - a.ilvl || a.base.localeCompare(b.base));
        p.sync('inv'); return;
      }
    }
  }

  private hello(s: Session, m: Extract<ClientMsg, { t: 'hello' }>) {
    const token = String(m.token ?? '');
    if (!/^[a-zA-Z0-9_-]{16,80}$/.test(token)) { this.send(s, { t: 'err', s: 'Ungültiges Profil.' }); return; }
    const name = String(m.name ?? 'Spieler').replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 20) || 'Spieler';
    const acc = this.db.account(token, name);
    // alte Sitzung desselben Profils ablösen
    for (const o of this.sessions) if (o !== s && o.account?.id === acc.id) { o.player = null; o.account = null; try { o.ws.close(4000, 'Anmeldung von anderem Fenster'); } catch { /* egal */ } }
    s.account = acc;
    this.send(s, { t: 'welcome', account: acc.id, name: acc.name, chars: this.db.listChars(acc.id), settings: acc.settings, server: this.info });
    // Wiederverbindung: Charakter steht noch in der Welt
    for (const p of this.players.values()) if (p.accountId === acc.id) {
      s.player = p; p.linkdead = false; p.send = msg => this.send(s, msg);
      p.epoch++;
      p.send({ t: 'entered', char: p.char, charId: p.charId, init: p.zone.initFor(p) });
      p.buffsDirty = true;
      this.sysChat(`${p.name} ist wieder da.`);
      break;
    }
    this.sendOnline();
  }

  private charCreate(s: Session, m: Extract<ClientMsg, { t: 'charCreate' }>) {
    const acc = s.account!;
    const name = String(m.name ?? '').trim().replace(/\s+/g, ' ');
    const err = (t: string) => this.send(s, { t: 'err', s: t });
    if (!/^[\p{L}][\p{L}\p{N} '-]{1,15}$/u.test(name)) return err('Der Name braucht 2–16 Zeichen und muss mit einem Buchstaben beginnen.');
    if (!CLASSES[m.cls]) return err('Unbekannte Klasse.');
    const chars = this.db.listChars(acc.id);
    const slot = Math.floor(m.slot);
    if (!(slot >= 0 && slot < CFG.save.slots) || chars.some(c => c.slot === slot)) return err('Dieser Platz ist belegt.');
    if (this.db.nameTaken(name)) return err('Dieser Name ist bereits vergeben.');
    this.db.createChar(acc.id, slot, newCharacter(name, m.cls));
    this.send(s, { t: 'chars', chars: this.db.listChars(acc.id) });
  }

  private enter(s: Session, charId: number) {
    const acc = s.account!;
    if (this.players.has(charId)) return;
    const char = this.db.loadChar(acc.id, charId);
    if (!char) { this.send(s, { t: 'err', s: 'Charakter konnte nicht geladen werden.' }); return; }
    const p = new Player(acc.id, charId, char, msg => this.send(s, msg));
    s.player = p;
    this.players.set(charId, p);
    const z = this.zone(char.zone);
    const fresh = char.x === 0 && char.y === 0;
    const useStart = fresh || z.def.kind === 'dungeon';
    z.addPlayer(p, useStart ? z.map.start.x : char.x, useStart ? z.map.start.y : char.y);
    if (fresh) char.respawn = { zone: z.id, x: z.map.start.x, y: z.map.start.y };
    p.send({ t: 'entered', char, charId, init: z.initFor(p) });
    if (!char.flags.intro) { char.flags.intro = 1; this.story(p, 'intro'); }
    this.sysChat(`${p.name} betritt die Welt.`);
    this.sendOnline();
  }

  transfer(p: Player, to: string, from: string, pos?: { x: number; y: number }) {
    if (!ZONES[to]) return;
    p.zone.removePlayer(p);
    const z = this.zone(to);
    const e = pos ?? z.map.entries[from] ?? z.map.start;
    p.statuses.clear();
    z.addPlayer(p, e.x, e.y);
    p.send({ t: 'zone', init: z.initFor(p) });
    this.savePlayer(p);
  }
  private teleport(p: Player, zoneId: string) {
    if (p.dead || !ZONES[zoneId] || !p.char.flags[`t:${zoneId}`]) return;
    const near = [...p.zone.objs.values()].some(o => o.type === 'stone' && Math.hypot(o.x - p.x, o.y - p.y) < 70);
    if (!near) { p.toast('Du musst an einem Quellstein stehen, um zu reisen.', 'bad'); return; }
    if (zoneId === p.zone.id) return;
    const stone = getMap(zoneId).objects.find(o => o.type === 'stone');
    if (!stone) return;
    p.zone.ev({ k: 'fx', n: 'blink', x: p.x, y: p.y, el: 'water' });
    this.transfer(p, zoneId, '', { x: stone.x, y: stone.y + 18 });
    p.pev.push({ k: 'sfx', n: 'teleport' });
  }
  private respawn(p: Player) {
    if (!p.dead) return;
    p.dead = false; p.hp = p.stats.maxHp; p.mp = p.stats.maxMp;
    p.iframesUntil = this.now + CFG.player.respawnInvuln;
    const cur = p.zone;
    if (cur.def.kind === 'dungeon') this.transfer(p, cur.id, '', cur.map.start);
    else {
      const r = p.char.respawn;
      const z = this.zone(r.zone);
      this.transfer(p, r.zone, '', r.x ? { x: r.x, y: r.y } : z.map.start);
    }
  }

  private move(p: Player, m: Extract<ClientMsg, { t: 'm' }>) {
    const now = this.now;
    if (m.e !== p.epoch || p.dead || !isFinite(m.x + m.y + m.f)) return;
    const z = p.zone;
    const dt = Math.min(0.3, now - p.lastMoveAt);
    p.lastMoveAt = now;
    const speed = p.speed(now);
    p.budget = Math.min(speed * 0.6, p.budget + dt * speed * 1.3);
    const d = Math.hypot(m.x - p.x, m.y - p.y);
    const reject = () => { p.epoch++; p.budget = 0; p.send({ t: 'pos', x: p.x, y: p.y, e: p.epoch }); };
    if (p.stunned(now)) { if (d > 4) reject(); return; }
    if (d > p.budget + 8) return reject();
    if (!circleFree(z.solidWalk, m.x, m.y, CFG.player.radius - 1.5)) return reject();
    p.budget -= d;
    p.x = m.x; p.y = m.y; p.facing = m.f;
    p.moving = !!m.mv; p.lastMoveMsg = now;
  }

  // ------------------------------------------------------------------ Infos
  playerInfo(p: Player): PlayerInfo { return { id: p.id, name: p.name, cls: p.char.cls, level: p.level, party: p.party?.id ?? 0 }; }
  broadcastPlayerInfo(p: Player) { for (const q of p.zone.players.values()) if (q !== p) q.pev.push({ k: 'pl+', p: this.playerInfo(p) }); }
  story(p: Player, id: string) { const st = STORY[id]; if (st) p.send({ t: 'story', id, title: st.title, lines: st.lines }); }
  sysChat(s: string) { for (const p of this.players.values()) p.send({ t: 'chat', from: '', s, ch: 'sys' }); }
  private sendOnline() {
    const players = [...this.players.values()].filter(p => !p.linkdead).map(p => ({ id: p.id, name: p.name, cls: p.char.cls, level: p.level, zone: p.zone.id }));
    for (const s of this.sessions) if (s.account) this.send(s, { t: 'online', players });
  }
  onlineCount() { return [...this.players.values()].filter(p => !p.linkdead).length; }

  private chat(p: Player, text: string) {
    text = text.trim();
    if (!text) return;
    if (text.startsWith('/')) {
      const [cmd, ...rest] = text.slice(1).split(' ');
      if (cmd === 'p' || cmd === 'g') {
        if (!p.party) { p.toast('Du bist in keiner Gruppe.', 'bad'); return; }
        for (const q of p.party.members) q.send({ t: 'chat', from: p.name, s: rest.join(' '), ch: 'party' });
        return;
      }
      if (DEV) return this.devCommand(p, cmd, rest);
      p.toast('Unbekannter Befehl. /p <Text> schreibt an die Gruppe.', 'bad');
      return;
    }
    for (const q of this.players.values()) q.send({ t: 'chat', from: p.name, s: text, ch: 'all' });
  }
  /** Entwickler-Befehle (nur mit Umgebungsvariable EM_DEV=1) */
  private devCommand(p: Player, cmd: string, a: string[]) {
    const c = p.char;
    if (cmd === 'lvl') { const n = Math.max(1, Math.min(CFG.player.maxLevel, +a[0] || 1)); while (c.level < n) { c.xp = CFG.xpToNext(c.level); p.gainXp(0.0001); } }
    else if (cmd === 'gold') p.gainGold(+a[0] || 1000);
    else if (cmd === 'tp' && ZONES[a[0]]) this.transfer(p, a[0], '');
    else if (cmd === 'time') { this.todOffset += (+a[0] || 0.5) - this.tod(); const tod = this.tod(); for (const q of this.players.values()) q.send({ t: 'env', tod }); }
    else if (cmd === 'weather') { p.zone.weather = a[0] ?? 'clear'; p.zone.weatherUntil = this.now + 600; for (const q of p.zone.players.values()) q.send({ t: 'env', weather: p.zone.weather }); }
    else if (cmd === 'god') { p.god = !p.god; p.toast('Unverwundbar: ' + p.god); }
    else if (cmd === 'gear') { for (const k of ['weapon', 'helm', 'armor', 'accessory'] as const) p.give(generateGear(this.rng, c.level, +a[0] || 3, c.cls, k)); }
    else if (cmd === 'item' && ITEMS[a[0]]) p.give(makeStack(a[0], +a[1] || 1));
    else if (cmd === 'quest' && QUESTS[a[0]]) { c.quests[a[0]] = { s: 'done', p: [], n: 1 }; p.sync('quests'); }
    else if (cmd === 'quests') { for (const id in QUESTS) if (QUESTS[id].type === 'main') c.quests[id] = { s: 'done', p: [], n: 1 }; p.sync('quests'); }
    else if (cmd === 'boss') { const r = p.zone.map.bossRoom; if (r) { p.x = (r.cx) * 16; p.y = (r.y1 - 1) * 16; p.epoch++; p.send({ t: 'pos', x: p.x, y: p.y, e: p.epoch }); } }
    else if (cmd === 'kill') { for (const m of [...p.zone.mobs.values()]) if (Math.hypot(m.x - p.x, m.y - p.y) < 300 && !m.invuln) p.zone.hitMob(m, p, 1e7, 'phys'); }
    else if (cmd === 'goto') { p.x = +a[0]; p.y = +a[1]; p.epoch++; p.send({ t: 'pos', x: p.x, y: p.y, e: p.epoch }); }
    else if (Story.dev(this, p, cmd, a)) { /* Story-Befehle */ }
    else p.toast('Dev: /lvl n, /gold n, /tp zone, /time 0..1, /weather art, /god, /gear r, /item id n, /quest id, /quests, /boss, /kill, /goto x y · Story: /akt2, /qa id, /flag k v, /dec id v, /lore id|all, /mem el|all, /cine id, /npc tag, /obj typ tag');
  }

  // ------------------------------------------------------------------ Gruppen
  private partyMsg(p: Player, a: string, id?: number) {
    if (a === 'invite') {
      const t = [...this.players.values()].find(q => q.id === id);
      if (!t || t === p || t.linkdead) return;
      if (t.party && t.party === p.party) return;
      if (t.party) { p.toast(`${t.name} ist bereits in einer Gruppe.`, 'bad'); return; }
      if (p.party && p.party.members.size >= 4) { p.toast('Die Gruppe ist voll (max. 4).', 'bad'); return; }
      this.invites.set(t.id, p);
      t.send({ t: 'party', members: t.party ? this.partyMembers(t.party) : [], invite: { from: p.id, name: p.name } });
      p.toast(`Einladung an ${t.name} gesendet.`);
    } else if (a === 'accept') {
      const from = this.invites.get(p.id);
      this.invites.delete(p.id);
      if (!from || !this.players.has(from.charId) || p.party) return;
      if (!from.party) { from.party = new Party(); from.party.members.add(from); }
      if (from.party.members.size >= 4) return;
      from.party.members.add(p); p.party = from.party;
      for (const q of p.party.members) { q.toast(`${p.name} ist der Gruppe beigetreten.`, 'good'); this.broadcastPlayerInfo(q); }
      this.sendParty(p.party);
    } else if (a === 'decline') {
      const from = this.invites.get(p.id);
      this.invites.delete(p.id);
      from?.toast(`${p.name} hat abgelehnt.`);
    } else if (a === 'leave') this.leaveParty(p);
  }
  private leaveParty(p: Player) {
    const party = p.party;
    if (!party) return;
    party.members.delete(p); p.party = null;
    p.send({ t: 'party', members: [] });
    for (const q of party.members) q.toast(`${p.name} hat die Gruppe verlassen.`);
    if (party.members.size === 1) { const last = [...party.members][0]; last.party = null; last.send({ t: 'party', members: [] }); party.members.clear(); if (this.players.has(last.charId)) this.broadcastPlayerInfo(last); }
    else this.sendParty(party);
    if (this.players.has(p.charId)) this.broadcastPlayerInfo(p);
  }
  private partyMembers(party: Party): PartyMember[] {
    return [...party.members].map(q => ({ id: q.id, charId: q.charId, name: q.name, cls: q.char.cls, level: q.level, hp: Math.max(0, Math.round(q.hp)), maxHp: q.stats.maxHp, zone: q.zone.id, online: !q.linkdead }));
  }
  private sendParty(party: Party) { const members = this.partyMembers(party); for (const q of party.members) q.send({ t: 'party', members }); }

  // ------------------------------------------------------------------ Charakteraktionen
  nearNpc(p: Player, npc: string): boolean {
    for (const o of p.zone.objs.values()) {
      if (Math.hypot(o.x - p.x, o.y - p.y) > 80) continue;
      if (o.type === 'npc' && o.tag === npc && Story.visible(p, o)) return true;
      if (o.type === 'board' && npc === 'ayla') return true;
    }
    return false;
  }
  private findItem(p: Player, uid: string): ItemInstance | undefined {
    return p.char.inv.find(i => i.uid === uid) ?? SLOTS.map(s => p.char.equip[s]).find(i => i?.uid === uid);
  }
  private equip(p: Player, uid: string, want?: Slot) {
    const c = p.char, i = c.inv.findIndex(it => it.uid === uid);
    if (i < 0 || p.dead) return;
    const it = c.inv[i], b = ITEMS[it.base];
    if (!isGear(b)) return;
    if (!canEquip(c.cls, b)) { p.toast('Deine Klasse kann das nicht ausrüsten.', 'bad'); return; }
    if (it.ilvl > c.level + 2) { p.toast(`Benötigt Stufe ${it.ilvl - 2}.`, 'bad'); return; }
    let slot = slotOf(b)!;
    if (b.kind === 'accessory') slot = want === 'acc2' || want === 'acc1' ? want : !c.equip.acc1 ? 'acc1' : !c.equip.acc2 ? 'acc2' : 'acc1';
    const old = c.equip[slot];
    c.inv.splice(i, 1);
    if (old) c.inv.push(old);
    c.equip[slot] = it;
    p.recalc(); p.sync('inv', 'equip');
    p.pev.push({ k: 'sfx', n: 'ui_equip' });
  }
  private unequip(p: Player, slot: Slot) {
    const c = p.char, it = c.equip[slot];
    if (!it || p.dead) return;
    if (c.inv.length >= CFG.player.invSize) { p.toast('Inventar voll.', 'bad'); return; }
    delete c.equip[slot];
    c.inv.push(it);
    p.recalc(); p.sync('inv', 'equip');
  }
  private consume(p: Player, it: ItemInstance): boolean {
    const u = ITEMS[it.base].use;
    if (!u || p.dead) return false;
    if (this.now < p.potionReadyAt) { p.toast('Tränke sind noch nicht wieder bereit.', 'bad'); return false; }
    const hp = (u.hp ?? 0) + ((u.hpPct ?? 0) / 100) * p.stats.maxHp, mp = (u.mp ?? 0) + ((u.mpPct ?? 0) / 100) * p.stats.maxMp;
    if ((hp === 0 || p.hp >= p.stats.maxHp) && (mp === 0 || p.mp >= p.stats.maxMp)) { p.toast('Das brauchst du gerade nicht.'); return false; }
    p.potionReadyAt = this.now + CFG.player.potionCooldown;
    if (hp) p.heal(hp);
    if (mp) { p.mp = Math.min(p.stats.maxMp, p.mp + mp); p.zone.ev({ k: 'txt', x: p.x, y: p.y - 20, s: `+${Math.round(mp)} Mana`, col: '#6fb7ff' }); }
    p.removeItems(it.base, 1);
    p.pev.push({ k: 'sfx', n: 'potion' });
    p.send({ t: 'cd', id: '_potion', cd: CFG.player.potionCooldown });
    return true;
  }
  private useItem(p: Player, uid: string) { const it = p.char.inv.find(i => i.uid === uid); if (it) this.consume(p, it); }
  private quick(p: Player, kind: 'hp' | 'mp') {
    const missing = kind === 'hp' ? p.stats.maxHp - p.hp : p.stats.maxMp - p.mp;
    const have = [1, 2, 3].map(t => p.char.inv.find(i => i.base === `potion_${kind}${t}`)).filter(Boolean) as ItemInstance[];
    if (!have.length) { const e = p.char.inv.find(i => i.base === 'elixir'); if (e) this.consume(p, e); else p.toast(kind === 'hp' ? 'Keine Heiltränke mehr!' : 'Keine Manatränke mehr!', 'bad'); return; }
    const pick = have.find(i => ((ITEMS[i.base].use as any)[kind] ?? 0) >= missing) ?? have[have.length - 1];
    this.consume(p, pick);
  }
  private sell(p: Player, uid: string, qty?: number) {
    const c = p.char, it = c.inv.find(i => i.uid === uid);
    if (!it || ITEMS[it.base].kind === 'quest') return;
    const n = Math.max(1, Math.min(it.qty ?? 1, Math.floor(qty ?? it.qty ?? 1)));
    p.gainGold(sellPrice(it) * n);
    if ((it.qty ?? 1) > n) it.qty = (it.qty ?? 1) - n; else c.inv.splice(c.inv.indexOf(it), 1);
    p.sync('inv'); p.pev.push({ k: 'sfx', n: 'sell' });
    p.checkCollectQuests();
  }
  private buy(p: Player, npc: string, idx: number, qty: number) {
    if (!this.nearNpc(p, npc)) return;
    const stock = shopStock(npc, p.char.cls, p.zone.def.level[0] + 1);
    const e = stock[idx];
    if (!e) return;
    qty = Math.max(1, Math.min(20, Math.floor(qty)));
    const b = ITEMS[e.item.base];
    if (!b.stack) qty = 1;
    const price = itemPrice(e.item) * qty;
    if (p.char.gold < price) { p.toast('Nicht genug Gold.', 'bad'); return; }
    const it: ItemInstance = { ...e.item, affixes: e.item.affixes.map(a => [...a] as typeof a), uid: newUid(), qty: b.stack ? qty : undefined };
    if (!p.addItem(it)) { p.toast('Inventar voll.', 'bad'); return; }
    p.char.gold -= price; p.sync('gold');
    p.pev.push({ k: 'sfx', n: 'buy' });
    p.checkCollectQuests();
  }
  private upgrade(p: Player, uid: string, npc: string) {
    if (!this.nearNpc(p, npc) || !NPCS[npc]?.services?.includes('upgrade')) return;
    const it = this.findItem(p, uid);
    if (!it || !isGear(ITEMS[it.base])) return;
    if (it.up >= CFG.upgrade.max) { p.toast('Mehr geht nicht. Selbst Borin hat Grenzen.', 'bad'); return; }
    const gold = CFG.upgrade.gold(it.ilvl, it.up), mat = TIER_MATERIAL[tierOf(it.ilvl) - 1], n = CFG.upgrade.mats(it.up);
    if (p.char.gold < gold) { p.toast('Nicht genug Gold.', 'bad'); return; }
    if (p.countItem(mat) < n) { p.toast(`Es fehlt Material: ${n}× ${ITEMS[mat].name}.`, 'bad'); return; }
    p.char.gold -= gold; p.removeItems(mat, n);
    if (this.rng.chance(CFG.upgrade.chance[it.up])) {
      it.up++;
      p.toast(`${itemName(it)} – Verbesserung gelungen!`, 'good');
      p.pev.push({ k: 'sfx', n: 'upgrade_success' });
    } else {
      p.toast('Die Verbesserung ist misslungen. Material und Gold sind verloren, der Gegenstand bleibt unversehrt.', 'bad');
      p.pev.push({ k: 'sfx', n: 'upgrade_fail' });
    }
    p.recalc(); p.sync('gold', 'inv', 'equip');
  }
  private attr(p: Player, a: AttrKey, n: number) {
    const c = p.char;
    if (!['str', 'dex', 'int', 'vit'].includes(a)) return;
    n = Math.max(1, Math.min(c.attrPoints, Math.floor(n)));
    if (c.attrPoints < 1) return;
    c.attrs[a] += n; c.attrPoints -= n;
    p.recalc(); p.sync('attrs', 'attrPoints');
  }
  private learn(p: Player, id: string) {
    const c = p.char, sk = SKILLS[id];
    if (!sk || sk.cls !== c.cls || c.skillPoints < 1) return;
    const rank = c.skills[id] ?? 0;
    if (rank >= sk.maxRank) return;
    if (c.level < sk.reqLevel + rank * 2) { p.toast(`Benötigt Stufe ${sk.reqLevel + rank * 2}.`, 'bad'); return; }
    if (sk.requires && !c.skills[sk.requires]) { p.toast(`Benötigt zuerst: ${SKILLS[sk.requires].name}.`, 'bad'); return; }
    c.skills[id] = rank + 1; c.skillPoints--;
    if (rank === 0 && sk.effects && !c.hotbar.includes(id)) { const free = c.hotbar.indexOf(null); if (free >= 0) c.hotbar[free] = id; }
    p.recalc(); p.sync('skills', 'skillPoints', 'hotbar');
    p.pev.push({ k: 'sfx', n: 'buff' });
  }
  private respec(p: Player, npc: string) {
    if (!this.nearNpc(p, npc) || !NPCS[npc]?.services?.includes('respec')) return;
    const c = p.char, cost = CFG.respecGold(c.level);
    if (c.gold < cost) { p.toast(`Fenwick verlangt ${cost} Gold.`, 'bad'); return; }
    c.gold -= cost;
    const cls = CLASSES[c.cls];
    let sp = c.skillPoints; for (const id in c.skills) sp += c.skills[id];
    c.skills = { [cls.startSkill]: 1 }; c.skillPoints = sp - 1; c.hotbar = [cls.startSkill, null, null, null];
    let ap = c.attrPoints; for (const a of ['str', 'dex', 'int', 'vit'] as const) { ap += c.attrs[a] - cls.baseAttrs[a]; c.attrs[a] = cls.baseAttrs[a]; }
    c.attrPoints = ap;
    p.recalc(); p.sync('skills', 'skillPoints', 'hotbar', 'attrs', 'attrPoints', 'gold');
    p.toast('Fähigkeiten und Attribute wurden zurückgesetzt.', 'good');
  }
  private qAccept(p: Player, id: string, npc: string) {
    const q = QUESTS[id];
    if (!q || q.giver !== npc || !this.nearNpc(p, npc) || !questAvailable(p.char, q)) return;
    p.char.quests[id] = { s: 'active', p: q.objectives.map(() => 0), n: p.char.quests[id]?.n };
    p.sync('quests');
    p.toast(`Quest angenommen: ${q.name}`, 'quest');
    p.pev.push({ k: 'sfx', n: 'quest_accept' });
    p.checkCollectQuests();
    Story.onAccept(p, q);
  }
  private qTurnIn(p: Player, id: string, npc: string) {
    const q = QUESTS[id], c = p.char;
    if (!q || (q.turnIn ?? q.giver) !== npc || !this.nearNpc(p, npc) || !questComplete(c, q)) return;
    for (const o of q.objectives) if (o.t === 'collect') p.removeItems(o.item, o.n);
    c.quests[id] = { s: 'done', p: [], n: (c.quests[id].n ?? 0) + 1 };
    const r = q.rewards;
    p.gainGold(r.gold);
    for (const [base, n] of r.items ?? []) p.give(makeStack(base, n));
    if (r.gear !== undefined) p.give(generateGear(this.rng, Math.min(CFG.player.maxLevel, Math.max(q.level + 1, 1)), r.gear, c.cls));
    if (r.skillPoints) { c.skillPoints += r.skillPoints; p.sync('skillPoints'); }
    if (r.attrPoints) { c.attrPoints += r.attrPoints; p.sync('attrPoints'); }
    p.sync('quests');
    p.toast(`Quest abgeschlossen: ${q.name}`, 'quest');
    p.pev.push({ k: 'sfx', n: 'quest_complete' });
    p.gainXp(r.xp);
    Story.onTurnIn(p, q);
    if (q.story) this.story(p, q.story);
    this.savePlayer(p);
  }
}
