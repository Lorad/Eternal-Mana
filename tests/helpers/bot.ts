/** Kopfloser Test-Client: spricht das echte Netzwerkprotokoll und spielt wie ein Mensch (nur dümmer). */
import WebSocket from 'ws';
import type { CharData, CharSummary, ClientMsg, GameEvent, MobInfo, ObjInfo, ServerMsg, ZoneInit } from '../../shared/src/types';

export class Bot {
  ws!: WebSocket;
  chars: CharSummary[] = [];
  char!: CharData;
  me = 0; x = 0; y = 0; epoch = 0; zone = '';
  hp = 0; maxHp = 0; mp = 0; dead = false;
  mobs = new Map<number, MobInfo>();
  objs = new Map<number, ObjInfo>();
  players = new Map<number, { x: number; y: number; hp: number }>();
  drops = new Map<number, { x: number; y: number }>();
  events: GameEvent[] = [];
  msgs: ServerMsg[] = [];
  toasts: string[] = [];
  /** Story (0.3): letzter Gesprächsknoten, empfangene Filmszenen und Chronik-Dokumente */
  dlg: Extract<ServerMsg, { t: 'dlg' }> | null = null;
  cines: string[] = [];
  lores: string[] = [];
  private waiters: { pred: (m: ServerMsg) => boolean; res: (m: ServerMsg) => void }[] = [];
  token: string;

  constructor(public url: string, public name: string, token?: string) { this.token = token ?? 'bot_' + name + '_' + Math.random().toString(36).slice(2).padEnd(16, 'x'); }

  send(m: ClientMsg) { this.ws.send(JSON.stringify(m)); }
  waitFor<T extends ServerMsg['t']>(t: T, ms = 5000, pred: (m: any) => boolean = () => true): Promise<Extract<ServerMsg, { t: T }>> {
    return new Promise((res, rej) => {
      const to = setTimeout(() => rej(new Error(`Timeout beim Warten auf '${t}'`)), ms);
      this.waiters.push({ pred: m => m.t === t && pred(m), res: m => { clearTimeout(to); res(m as any); } });
    });
  }
  private applyInit(i: ZoneInit) {
    this.zone = i.zone; this.x = i.x; this.y = i.y; this.epoch = i.epoch; this.me = i.you;
    this.mobs.clear(); this.objs.clear(); this.drops.clear(); this.players.clear();
    for (const m of i.mobs) this.mobs.set(m.id, m);
    for (const o of i.objs) this.objs.set(o.id, o);
    for (const d of i.drops) this.drops.set(d.id, d);
  }
  private onMsg(m: ServerMsg) {
    switch (m.t) {
      case 'welcome': this.chars = m.chars; break;
      case 'chars': this.chars = m.chars; break;
      case 'entered': this.char = m.char; this.applyInit(m.init); this.dead = false; break;
      case 'zone': this.applyInit(m.init); break;
      case 'pos': this.x = m.x; this.y = m.y; this.epoch = m.e; break;
      case 'char': Object.assign(this.char, m.d); break;
      case 'dead': this.dead = true; break;
      case 'toast': this.toasts.push(m.s); break;
      case 'dlg': this.dlg = m; break;
      case 'cine': this.cines.push(m.id); this.send({ t: 'cineEnd', id: m.id }); break; // Bots schauen nicht zu
      case 'lore': this.lores.push(m.id); break;
      case 'drop+': this.drops.set(m.d.id, m.d); break;
      case 'drop-': this.drops.delete(m.id); break;
      case 's':
        if (m.me) { this.hp = m.me[0]; this.maxHp = m.me[1]; this.mp = m.me[2]; if (this.hp > 0) this.dead = false; }
        for (const s of m.m) { const mob = this.mobs.get(s[0]); if (mob) { mob.x = s[1]; mob.y = s[2]; mob.hp = s[5]; } }
        for (const s of m.p) this.players.set(s[0], { x: s[1], y: s[2], hp: s[5] });
        for (const e of m.ev ?? []) {
          this.events.push(e);
          if (e.k === 'mob+') this.mobs.set(e.m.id, e.m);
          else if (e.k === 'mob-') this.mobs.delete(e.id);
          else if (e.k === 'obj') { const o = this.objs.get(e.id); if (o) { o.state = e.state; if (e.props) Object.assign(o.props ??= {}, e.props); } }
          else if (e.k === 'obj+') this.objs.set(e.o.id, e.o);
        }
        break;
    }
    if (m.t !== 's') this.msgs.push(m);
    for (let i = this.waiters.length - 1; i >= 0; i--) if (this.waiters[i].pred(m)) { const w = this.waiters.splice(i, 1)[0]; w.res(m); }
  }

  async connect() {
    this.ws = new WebSocket(this.url);
    this.ws.on('message', d => this.onMsg(JSON.parse(d.toString())));
    await new Promise<void>((res, rej) => { this.ws.once('open', () => res()); this.ws.once('error', rej); });
    const w = this.waitFor('welcome');
    this.send({ t: 'hello', token: this.token, name: this.name, v: 'test' });
    return w;
  }
  async createAndEnter(cls: CharData['cls'], charName = this.name) {
    if (!this.chars.length) { const w = this.waitFor('chars'); this.send({ t: 'charCreate', slot: 0, name: charName, cls }); await w; }
    const e = this.waitFor('entered');
    this.send({ t: 'enter', id: this.chars[0].id });
    return e;
  }
  close() { this.ws.close(); }
  sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
  chat(s: string) { this.send({ t: 'chat', s }); }

  /** Läuft in kleinen, vom Server akzeptierten Schritten Richtung Ziel (Luftlinie). */
  async walkTo(tx: number, ty: number, maxMs = 8000, stopDist = 6) {
    const t0 = Date.now();
    while (Date.now() - t0 < maxMs) {
      const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy);
      if (d <= stopDist) return true;
      const step = Math.min(d, 4);
      this.x += (dx / d) * step; this.y += (dy / d) * step;
      this.send({ t: 'm', x: this.x, y: this.y, f: Math.atan2(dy, dx), e: this.epoch, mv: 1 });
      await this.sleep(50);
    }
    return false;
  }
  /** Dev-Teleport neben einen NPC (Server muss mit EM_DEV=1 laufen). */
  async gotoNpc(tag: string) {
    const o = [...this.objs.values()].find(x => x.type === 'npc' && x.tag === tag);
    if (!o) throw new Error('NPC nicht in dieser Zone: ' + tag);
    const w = this.waitFor('pos');
    this.chat(`/goto ${o.x} ${o.y + 18}`);
    await w;
  }
  // ------------------------------------------------------------ Story-Helfer (0.3)
  /** Dev-Befehl senden und kurz warten, bis der Server ihn verarbeitet hat. */
  async dev(cmd: string, ms = 120) { this.chat(cmd); await this.sleep(ms); }
  obj(type: string, tag?: string): ObjInfo | undefined { return [...this.objs.values()].find(o => o.type === type && (tag === undefined || o.tag === tag)); }
  /** Dev-Teleport an eine Weltposition. */
  async warp(x: number, y: number) { const w = this.waitFor('pos'); this.chat(`/goto ${Math.round(x)} ${Math.round(y)}`); await w; }
  /** Dev-Teleport vor ein Objekt (Standard: eine Zelle darunter). */
  async gotoObj(type: string, tag?: string, dy = 18): Promise<ObjInfo> {
    const o = this.obj(type, tag);
    if (!o) throw new Error(`Objekt nicht in dieser Zone: ${type}:${tag}`);
    await this.warp(o.x, o.y + dy);
    return o;
  }
  /** Dev-Zonenwechsel. */
  async tp(zone: string) { if (this.zone === zone) return; const z = this.waitFor('zone'); this.chat('/tp ' + zone); await z; }
  async interact(o: ObjInfo, ms = 200) { this.send({ t: 'interact', id: o.id }); await this.sleep(ms); }
  /** Gesprächsthema öffnen; liefert die Antwort des Servers (node null + err = abgelehnt). */
  async dlgOpen(npc: string, topic: string) { const w = this.waitFor('dlg'); this.send({ t: 'dlgOpen', npc, topic }); return w; }
  /** Option im aktuellen (oder einem behaupteten) Knoten wählen. */
  async dlgPick(opt: number, over: Partial<{ npc: string; topic: string; node: string }> = {}) {
    const w = this.waitFor('dlg');
    this.send({ t: 'dlgPick', npc: over.npc ?? this.dlg?.npc ?? '', topic: over.topic ?? this.dlg?.topic ?? '', node: over.node ?? this.dlg?.node ?? '', opt });
    return w;
  }
  async accept(id: string, npc: string) { await this.gotoNpc(npc); this.send({ t: 'qAccept', id, npc }); await this.sleep(150); }
  async turnIn(id: string, npc: string) { await this.gotoNpc(npc); this.send({ t: 'qTurnIn', id, npc }); await this.sleep(200); }

  nearestMob(max = 9999): MobInfo | null {
    let best: MobInfo | null = null, bd = max;
    for (const m of this.mobs.values()) { const d = Math.hypot(m.x - this.x, m.y - this.y); if (d < bd) { bd = d; best = m; } }
    return best;
  }
  /** Greift den nächsten Gegner an, bis er stirbt oder die Zeit abläuft. */
  async fight(maxMs = 15000): Promise<boolean> {
    const target = this.nearestMob();
    if (!target) return false;
    const t0 = Date.now();
    while (Date.now() - t0 < maxMs && this.mobs.has(target.id) && !this.dead) {
      const d = Math.hypot(target.x - this.x, target.y - this.y);
      if (d > 24) {
        // Hindernis im Weg? Dann per Dev-Befehl direkt neben den Gegner setzen (Server läuft in Tests mit EM_DEV=1).
        if (d > 60 || !(await this.walkTo(target.x, target.y, 400, 20))) { this.chat(`/goto ${target.x + 14} ${target.y}`); await this.sleep(150); }
      }
      this.send({ t: 'atk', ang: Math.atan2(target.y - this.y, target.x - this.x) });
      await this.sleep(120);
    }
    return !this.mobs.has(target.id);
  }
}
