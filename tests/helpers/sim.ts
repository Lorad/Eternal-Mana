/**
 * Test-Welt ohne Netzwerk: ein echtes `Game` mit echter Datenbank im Temp-Ordner. Spieler melden sich über
 * denselben Nachrichtenweg an wie im Spiel (`Game.onMessage`), nur ohne Socket. Die Zeit läuft von Hand (`step`),
 * der Zufall ist setzbar – damit lassen sich Kampfregeln und Handwerk genau prüfen.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Db } from '../../server/src/db';
import { Game, Party, type Session } from '../../server/src/game';
import type { Player } from '../../server/src/player';
import type { Mob, Zone } from '../../server/src/zone';
import { CFG } from '../../shared/src/config';
import { makeStack } from '../../shared/src/data/items';
import type { ClassId, ClientMsg, GameEvent, ServerMsg } from '../../shared/src/types';
import { Rng } from '../../shared/src/util/rng';

export interface Tester {
  s: Session;
  p: Player;
  msgs: ServerMsg[];
  toasts: string[];
  /** schickt eine Client-Nachricht über den normalen Verteiler des Servers */
  send(m: ClientMsg): void;
  count(base: string): number;
  give(base: string, n?: number): void;
  /** Profil-Schlüssel (für die Wiederverbindung, 0.7) */
  token: string;
}

export class Sim {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'em-sim-'));
  db = new Db(this.dir);
  game = new Game(this.db, { name: 'sim', version: CFG.version, port: 0, addresses: [], tailscale: { available: false } });
  private n = 0;
  private testers: Tester[] = [];

  /** Meldet ein neues Profil an, erstellt einen Charakter und betritt die Welt. */
  join(name: string, cls: ClassId, level = 1): Tester {
    const msgs: ServerMsg[] = [], toasts: string[] = [];
    const ws = { readyState: 1, send: (raw: string) => { const m = JSON.parse(raw) as ServerMsg; msgs.push(m); if (m.t === 'toast') toasts.push(m.s); }, close() {} };
    const s = this.game.onConnect(ws as any);
    const send = (m: ClientMsg) => this.game.onMessage(s, JSON.stringify(m));
    const token = `sim_${name}_${this.n++}`.padEnd(20, 'x');
    send({ t: 'hello', token, name, v: 'test' });
    send({ t: 'charCreate', slot: 0, name, cls });
    const chars = (msgs.filter(m => m.t === 'chars').at(-1) as Extract<ServerMsg, { t: 'chars' }>).chars;
    send({ t: 'enter', id: chars[0].id });
    const p = s.player!;
    if (!p) throw new Error('Betreten fehlgeschlagen: ' + JSON.stringify(msgs.at(-1)));
    if (level > 1) { p.char.level = level; p.recalc(); p.hp = p.stats.maxHp; p.mp = p.stats.maxMp; }
    const t: Tester = {
      s, p, msgs, toasts, send, token,
      // `t.p` wechselt beim erneuten Betreten – deshalb immer über `t` zugreifen
      count: base => t.p.countItem(base),
      give: (base, n = 1) => { t.p.addItem(makeStack(base, n)); },
    };
    this.testers.push(t);
    return t;
  }
  /** Nimmt alle bisherigen Test-Spieler aus der Welt, damit sich Tests nicht gegenseitig stören. */
  clear() { for (const t of this.testers) if (t.s.player) t.send({ t: 'leave' }); this.testers = []; }
  /** Verbindung trennen und Charakter sofort aus der Welt nehmen (speichert). */
  leave(t: Tester) { t.send({ t: 'leave' }); }
  /** Betritt die Welt erneut mit demselben Profil (lädt aus der Datenbank). */
  reenter(t: Tester): Tester {
    const chars = this.db.listChars(t.s.account!.id);
    t.send({ t: 'enter', id: chars[0].id });
    t.p = t.s.player!;
    return t;
  }
  /** 0.7: Die Verbindung reißt ab – der Charakter bleibt (unverwundbar) in der Welt, bis die Schonfrist um ist. */
  drop(t: Tester) { this.game.onClose(t.s); }
  /** 0.7: Dasselbe Profil meldet sich über eine neue Verbindung an. Steht der Charakter noch in der Welt, hängt der Server ihn an; sonst wird er neu geladen. */
  reconnect(t: Tester): Tester {
    const ws = { readyState: 1, send: (raw: string) => { const m = JSON.parse(raw) as ServerMsg; t.msgs.push(m); if (m.t === 'toast') t.toasts.push(m.s); }, close() {} };
    const s = this.game.onConnect(ws as any);
    t.s = s;
    t.send = (m: ClientMsg) => this.game.onMessage(s, JSON.stringify(m));
    t.send({ t: 'hello', token: t.token, name: t.p.name, v: 'test' });
    if (!s.player) t.send({ t: 'enter', id: this.db.listChars(s.account!.id)[0].id });
    t.p = s.player!;
    return t;
  }
  zone(id: string): Zone { return this.game.zone(id); }
  /** Lässt `sec` Sekunden Spielzeit vergehen (20 Schritte je Sekunde). */
  step(sec: number) { const dt = 1 / CFG.net.tickRate; for (let t = 0; t < sec - 1e-9; t += dt) (this.game as any).tick(dt); }
  seed(z: Zone, n: number) { z.rng = new Rng(n); }
  /** Stellt den Spieler neben einen NPC seiner Zone. */
  gotoNpc(t: Tester, tag: string) {
    const o = [...t.p.zone.objs.values()].find(x => x.type === 'npc' && x.tag === tag);
    if (!o) throw new Error('NPC nicht in dieser Zone: ' + tag);
    t.p.x = o.x; t.p.y = o.y + 18;
  }
  /** Versetzt den Spieler in eine andere Zone (wie /tp). */
  travel(t: Tester, zoneId: string) { this.game.transfer(t.p, zoneId, ''); }
  /** Leerer Kampfplatz: entfernt alle Gegner der Zone und stellt den Spieler abseits der Schutzzonen auf. */
  arena(t: Tester): { z: Zone; x: number; y: number } {
    const z = t.p.zone;
    for (const m of [...z.mobs.values()]) z.mobs.delete(m.id);
    const sp = z.map.spawns[Math.floor(z.map.spawns.length / 2)];
    t.p.x = sp.x; t.p.y = sp.y;
    t.p.iframesUntil = 0;
    return { z, x: sp.x, y: sp.y };
  }
  /** Ein Gegner mit sehr viel Leben, der stillhält (zum Messen von Treffern). */
  dummy(z: Zone, mob: string, lvl: number, x: number, y: number, hp = 1e7): Mob {
    const m = z.spawnMob(mob, lvl, x, y, false);
    m.maxHp = m.hp = hp;
    m.speed = 0; m.cdUntil = 1e9;
    return m;
  }
  party(...ts: Tester[]) { const party = new Party(); for (const t of ts) { party.members.add(t.p); t.p.party = party; } return party; }
  close() { this.db.close(); fs.rmSync(this.dir, { recursive: true, force: true }); }
}

/** Ereignisse, die seit dem letzten Snapshot in der Zone angefallen sind. */
export function events(z: Zone): GameEvent[] { return z.events; }
export function sumDmg(z: Zone, mobId: number): number { let n = 0; for (const e of z.events) if (e.k === 'dmg' && e.id === mobId) n += e.a; return n; }
export function texts(z: Zone): string[] { return z.events.filter(e => e.k === 'txt').map(e => (e as any).s as string); }
