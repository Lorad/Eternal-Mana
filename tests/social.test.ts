/** Gemeinsam (0.7): Gruppenverwaltung, Handel, Quest teilen, Gruppentruhe, Wertung in der Gruppe, Wiederverbindung. */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { sanitizeChar } from '../server/src/db';
import type { Player } from '../server/src/player';
import { Rift } from '../server/src/rift';
import { Social } from '../server/src/social';
import { Story } from '../server/src/story';
import { World } from '../server/src/world';
import type { Obj, Zone } from '../server/src/zone';
import { CFG } from '../shared/src/config';
import { ENEMIES } from '../shared/src/data/enemies';
import { ITEMS, generateGear, makeStack } from '../shared/src/data/items';
import { ECHO_FRAG } from '../shared/src/data/materials';
import { QUESTS } from '../shared/src/data/quests';
import { RECIPE_LIST, scrollOf } from '../shared/src/data/recipes';
import { RIFT_UNLOCK_QUEST, TRIAL_RECIPE, riftMods } from '../shared/src/data/rifts';
import { ECHOES } from '../shared/src/data/story';
import { TILE } from '../shared/src/maps/tiles';
import { PARTY_RULES, invFits, shareBlock, shareTargetBlock, slotsAfterTrade, tradeBlock } from '../shared/src/social';
import type { ClassId, ItemInstance, PartyInvite, PartyMember, ServerMsg, TradeView } from '../shared/src/types';
import { Rng } from '../shared/src/util/rng';
import { Sim, type Tester } from './helpers/sim';

const S = CFG.social;
let sim: Sim;
beforeAll(() => { sim = new Sim(); World.setAuto(sim.game, false); });
afterAll(() => sim.close());
afterEach(() => sim.clear());   // auch nach einem gescheiterten Test: der nächste beginnt ohne Altlasten

let n = 0;
const AZ = 'abcdefghijklmnopqrstuvwxyz';
/** Neuer Charakter in Quellhain (alle stehen am selben Fleck, also in Handelsreichweite). */
function mk(cls: ClassId = 'krieger', level = 10): Tester {
  const t = sim.join('Soz' + AZ[n % 26] + AZ[Math.floor(n / 26) % 26] + AZ[Math.floor(n / 676) % 26], cls, level);
  n++;
  t.p.god = true;
  t.p.char.inv = []; t.p.char.gold = 0;                                   // ohne Startvorrat: die Tests zählen genau
  return t;
}
/** Bildet über das echte Protokoll eine Gruppe: der erste lädt ein und führt an. */
function group(lead: Tester, ...others: Tester[]) {
  for (const o of others) { lead.send({ t: 'party', a: 'invite', id: o.p.id }); o.send({ t: 'party', a: 'accept' }); }
  for (const o of others) expect(o.p.party, 'Gruppe gebildet').toBe(lead.p.party);
  return lead.p.party!;
}
const last = <T extends ServerMsg['t']>(t: Tester, type: T) => t.msgs.filter(m => m.t === type).at(-1) as Extract<ServerMsg, { t: T }> | undefined;
const partyOf = (t: Tester): PartyMember[] => last(t, 'party')!.members;
/** offene Einladung, wie der Client sie führt: `invite` gesetzt = neue, null = erloschen, eine Gruppenliste räumt sie weg */
function inviteOf(t: Tester): PartyInvite | null {
  let inv: PartyInvite | null = null;
  for (const m of t.msgs) if (m.t === 'party') inv = m.invite !== undefined ? m.invite : m.members.length ? null : inv;
  return inv;
}
const toasted = (t: Tester, re: RegExp, since = 0) => t.toasts.slice(since).some(s => re.test(s));
/** letzter Stand des Handels aus Sicht dieses Spielers (null = kein Handel offen) */
function tv(t: Tester): TradeView | null {
  const m = t.msgs.filter(x => x.t === 'trade' && (x as any).tr !== undefined).at(-1) as Extract<ServerMsg, { t: 'trade' }> | undefined;
  return m?.tr ?? null;
}
function openTrade(a: Tester, b: Tester) {
  sim.step(S.tradeRequestCooldownSec + 0.1);                               // nicht in die Pause zwischen zwei Anfragen laufen
  a.send({ t: 'trade', a: 'request', id: b.p.id });
  b.send({ t: 'trade', a: 'accept' });
  expect(tv(a), 'Handel offen').toBeTruthy();
  expect(tv(b)!.with.id).toBe(a.p.id);
}
/** Beide sperren (nach der Sperrfrist) und bestätigen. */
function seal(a: Tester, b: Tester) {
  sim.step(S.tradeLockDelaySec + 0.1);
  a.send({ t: 'trade', a: 'lock' }); b.send({ t: 'trade', a: 'lock' });
  a.send({ t: 'trade', a: 'confirm' }); b.send({ t: 'trade', a: 'confirm' });
}
const gear = (cls: ClassId = 'krieger', lvl = 10): ItemInstance => generateGear(new Rng(1000 + n++), lvl, 2, cls, 'weapon');
const snap = (t: Tester) => JSON.stringify([t.p.char.inv, t.p.char.gold]);
const stone = (z: Zone) => [...z.objs.values()].find(o => o.type === 'stone')!;
function toRiftStone(t: Tester) {
  if (t.p.zone.id !== 'gruenwald' || t.p.zone.rift) sim.game.transfer(t.p, 'gruenwald', '');
  const o = [...t.p.zone.objs.values()].find(x => x.type === 'riftstone')!;
  t.p.x = o.x; t.p.y = o.y + 12;
}
/** Stufe 40, Risse freigeschaltet, am Riss-Stein. */
function hero(cls: ClassId = 'krieger'): Tester {
  const t = mk(cls, 40);
  t.p.char.quests[RIFT_UNLOCK_QUEST] = { s: 'done', p: [], n: 1 };
  t.p.char.rift = { stufe: 1, seed: 1, best: {} };
  toRiftStone(t);
  return t;
}
/** Öffnet einen Riss ohne Modifikatoren, die Zahl oder Art der Gegner ändern. */
function openRift(t: Tester, dungeon = 'wurzelgruft'): Zone {
  for (let s = 1; s < 5000; s++) { const r = riftMods(s, dungeon, 1); if (r.mods.includes('finsternis')) { t.p.char.rift!.seed = s; break; } }
  t.send({ t: 'rift', a: 'start', dungeon, stufe: 1 });
  if (!t.p.zone.rift) throw new Error('Riss nicht geöffnet: ' + t.toasts.at(-1));
  return t.p.zone;
}
/** Stellt die Spieler in den Bossraum und wartet, bis der Kampf beginnt. */
function startBoss(z: Zone, ...ts: Tester[]) {
  const room = z.map.bossRoom!;
  ts.forEach((t, i) => { t.p.x = (room.cx + 0.5 + i) * TILE; t.p.y = (room.cy + 3.5) * TILE; });
  for (let i = 0; i < 80 && !z.boss!.active; i++) sim.step(0.05);
  expect(z.boss!.active, 'Bosskampf beginnt').toBe(true);
}
function killBoss(z: Zone, t: Tester) {
  const b = z.boss!;
  b.mob.invuln = false;
  z.hitMob(b.mob, t.p, 1e9, 'phys');
  expect(b.mob.dead).toBe(true);
}
const groupChest = (z: Zone) => [...z.objs.values()].find(o => o.type === 'chest' && o.props?.group);
function openChest(t: Tester, o: Obj) { t.p.x = o.x; t.p.y = o.y + 10; t.send({ t: 'interact', id: o.id }); }
/** Kein Geist bleibt zurück: jede Gruppe besteht nur aus Spielern, die in der Welt sind und auf sie zurückverweisen. */
function noGhosts() {
  const st = Social.state(sim.game);
  for (const p of sim.game.players.values()) for (const q of p.party?.members ?? []) { expect(sim.game.players.get(q.charId), 'Mitglied ist in der Welt').toBe(q); expect(q.party).toBe(p.party); }
  for (const p of st.trades.keys()) expect(sim.game.players.get(p.charId)).toBe(p);
  for (const p of st.invites.keys()) expect(sim.game.players.get(p.charId)).toBe(p);
  for (const [c, party] of st.seatOf) { expect(party.seats.has(c)).toBe(true); expect(party.members.size).toBeGreaterThan(0); }
}

// =====================================================================================================================
describe('Regeln (shared)', () => {
  it('handelbar ist alles außer Questgegenständen, Legendären Waffen, Trophäen und persönlichen Rezepten', () => {
    for (const base of ['potion_hp1', 'mat_wood', 'gem', 'food_bread', 'w_sword_1', 'c_ring_3', ECHO_FRAG, 'tmap_gruenwald']) expect(tradeBlock({ base }), base).toBeNull();
    expect(tradeBlock({ base: 'seal_earth' })).toMatch(/Questgegenst/);
    expect(tradeBlock({ base: 'q_pilzhut' })).toMatch(/Questgegenst/);
    expect(tradeBlock({ base: 'leg_krieger' })).toMatch(/Legend/);
    expect(tradeBlock({ base: Object.keys(ITEMS).find(k => ITEMS[k].use?.trophy)! })).toMatch(/Troph/);
    expect(tradeBlock({ base: scrollOf(TRIAL_RECIPE) })).toMatch(/Rezept/);
    expect(tradeBlock({ base: scrollOf(RECIPE_LIST.find(r => r.src === 'ruf')!.id) })).toMatch(/Rezept/);
    expect(tradeBlock({ base: scrollOf(RECIPE_LIST.find(r => r.unlock === 'learn' && !r.src && !r.exclusive)!.id) })).toBeNull();
    expect(tradeBlock({ base: 'gibtsnicht' })).toBeTruthy();
    // jeder Questgegenstand der Daten ist gebunden
    for (const b of Object.values(ITEMS)) if (b.kind === 'quest') expect(tradeBlock({ base: b.id }), b.id).toBeTruthy();
  });
  it('Platzrechnung eines Tauschs: Stapel verschmelzen, ganz Abgegebenes macht Platz, Teilmengen nicht', () => {
    const inv: ItemInstance[] = [{ ...makeStack('potion_hp1', 5), uid: 'p' }, { ...gear(), uid: 'g1' }, { ...gear(), uid: 'g2' }];
    expect(slotsAfterTrade(inv, new Map(), [])).toBe(3);
    expect(slotsAfterTrade(inv, new Map(), [{ base: 'potion_hp1' }])).toBe(3);                    // wandert auf den vorhandenen Stapel
    expect(slotsAfterTrade(inv, new Map(), [{ base: 'mat_wood' }, { base: 'mat_wood' }])).toBe(4); // zwei Lieferungen derselben Art: ein Platz
    expect(slotsAfterTrade(inv, new Map(), [{ base: 'w_sword_1' }, { base: 'w_sword_1' }])).toBe(5);
    expect(slotsAfterTrade(inv, new Map([['g1', 1]]), [{ base: 'w_sword_1' }])).toBe(3);
    expect(slotsAfterTrade(inv, new Map([['p', 2]]), [])).toBe(3);                                // Teilmenge: der Stapel bleibt
    expect(slotsAfterTrade(inv, new Map([['p', 5]]), [{ base: 'potion_hp1' }])).toBe(3);          // Stapel weg, neuer Stapel braucht wieder einen Platz
    const full = Array.from({ length: CFG.player.invSize }, (_, i) => ({ ...gear(), uid: 'f' + i }));
    expect(invFits(full, new Map(), [])).toBe(true);
    expect(invFits(full, new Map(), [{ base: 'mat_wood' }])).toBe(false);
    expect(invFits(full, new Map([['f0', 1]]), [{ base: 'mat_wood' }])).toBe(true);
  });
  it('teilbar sind Neben-, Gruppen- und wiederholbare Quests – keine Hauptquests, keine Geheimnisse; die Regeln stehen im Gruppenfenster', () => {
    expect(shareBlock(QUESTS.s_woelfe)).toBeNull();
    expect(shareBlock(QUESTS.r_gruenwald)).toBeNull();
    expect(shareBlock(QUESTS.g_jagd)).toBeNull();
    expect(shareBlock(QUESTS.m_erwachen)).toMatch(/Hauptquest/);
    expect(shareBlock(QUESTS.x_arm)).toMatch(/Geheimnis/);
    expect(shareBlock(undefined)).toBeTruthy();
    const c = sanitizeChar({ name: 'Regel', cls: 'krieger' })!;
    expect(shareTargetBlock(c, QUESTS.s_woelfe)).toBeNull();
    expect(shareTargetBlock(c, QUESTS.g_jagd)).toMatch(/braucht zuerst/);
    expect(shareTargetBlock(c, QUESTS.s_splitter2)).toMatch(/In Fis/);
    c.quests.s_woelfe = { s: 'active', p: [0] };
    expect(shareTargetBlock(c, QUESTS.s_woelfe)).toMatch(/hat sie schon/);
    c.quests.s_woelfe = { s: 'done', p: [], n: 1 };
    expect(shareTargetBlock(c, QUESTS.s_woelfe)).toMatch(/erledigt/);
    c.quests.r_gruenwald = { s: 'done', p: [], n: 3 };
    expect(shareTargetBlock(c, QUESTS.r_gruenwald)).toBeNull();                                   // wiederholbar
    expect(PARTY_RULES[0][0]).toBe('Beute: jeder würfelt für sich');
    expect(PARTY_RULES.map(r => r[0]).join()).toMatch(/Mana-Risse.*Neuer Kreis/);
  });
});

// =====================================================================================================================
describe('Gruppe', () => {
  it('Einladen, Annehmen, Ablehnen: der Gründer führt an, nur der Anführer lädt ein, höchstens vier', () => {
    const [a, b, c, d, e, x] = [mk(), mk('magier'), mk(), mk(), mk(), mk()];
    a.send({ t: 'party', a: 'invite', id: a.p.id });                       // sich selbst: nichts
    expect(a.toasts.length).toBe(0);
    a.send({ t: 'party', a: 'invite', id: b.p.id });
    expect(inviteOf(b)).toMatchObject({ from: a.p.id, name: a.p.name, sec: S.inviteSec, kreis: 0, size: 1 });
    expect(a.p.party).toBeNull();                                          // erst die Annahme gründet die Gruppe
    b.send({ t: 'party', a: 'accept' });
    const party = a.p.party!;
    expect(b.p.party).toBe(party);
    expect(party.leader).toBe(a.p);
    expect(partyOf(b).map(m => [m.name, m.lead ?? 0])).toEqual([[a.p.name, 1], [b.p.name, 0]]);
    expect(inviteOf(b)).toBeNull();                                        // die Anfrage ist vom Tisch
    // ein Mitglied lädt nicht ein
    b.send({ t: 'party', a: 'invite', id: c.p.id });
    expect(toasted(b, /Nur wer die Gruppe anführt, lädt ein/)).toBe(true);
    expect(last(c, 'party')).toBeUndefined();
    // wer schon in einer Gruppe ist, wird nicht eingeladen
    x.send({ t: 'party', a: 'invite', id: b.p.id });
    expect(toasted(x, /bereits in einer Gruppe/)).toBe(true);
    // Ablehnen: Bescheid an den Anführer, kurze Sperre gegen erneutes Nachfragen
    a.send({ t: 'party', a: 'invite', id: c.p.id });
    c.send({ t: 'party', a: 'decline' });
    expect(toasted(a, /hat abgelehnt/)).toBe(true);
    expect(c.p.party).toBeNull();
    a.send({ t: 'party', a: 'invite', id: c.p.id });
    expect(toasted(a, /warte einen Moment/)).toBe(true);
    expect(inviteOf(c)).toBeNull();
    sim.step(S.inviteCooldownSec + 1.1);
    a.send({ t: 'party', a: 'invite', id: c.p.id });
    expect(inviteOf(c)).toMatchObject({ from: a.p.id, size: 2 });
    c.send({ t: 'party', a: 'accept' });
    a.send({ t: 'party', a: 'invite', id: d.p.id }); d.send({ t: 'party', a: 'accept' });
    expect(party.members.size).toBe(S.partyMax);
    a.send({ t: 'party', a: 'invite', id: e.p.id });
    expect(toasted(a, /Die Gruppe ist voll/)).toBe(true);
    expect(last(e, 'party')).toBeUndefined();
    // erfundene Antworten ohne Einladung bewirken nichts
    e.send({ t: 'party', a: 'accept' }); e.send({ t: 'party', a: 'decline' });
    expect(e.p.party).toBeNull();
    noGhosts();
    sim.clear();
  });

  it('eine Einladung verfällt nach der Frist; eine zweite an denselben Spieler muss warten', () => {
    const [a, b, c] = [mk(), mk(), mk()];
    a.send({ t: 'party', a: 'invite', id: b.p.id });
    c.send({ t: 'party', a: 'invite', id: b.p.id });
    expect(toasted(c, /andere Einladung offen/)).toBe(true);
    a.send({ t: 'party', a: 'invite', id: b.p.id });
    expect(toasted(a, /noch nicht beantwortet/)).toBe(true);
    sim.step(S.inviteSec - 2);
    expect(inviteOf(b)).toMatchObject({ from: a.p.id });                   // noch offen
    sim.step(3.2);
    expect(inviteOf(b)).toBeNull();                                        // der Client räumt die Anfrage weg
    expect(toasted(a, /nicht geantwortet/)).toBe(true);
    b.send({ t: 'party', a: 'accept' });
    expect(b.p.party).toBeNull(); expect(a.p.party).toBeNull();
    c.send({ t: 'party', a: 'invite', id: b.p.id });                       // jetzt ist b wieder frei
    expect(inviteOf(b)).toMatchObject({ from: c.p.id });
    // verschwindet der Einladende aus der Welt, erlischt die Einladung sofort
    sim.leave(c);
    expect(inviteOf(b)).toBeNull();
    b.send({ t: 'party', a: 'accept' });
    expect(b.p.party).toBeNull();
    noGhosts();
    sim.clear();
  });

  it('Ernennen, Entfernen, Verlassen, Auflösen: nur der Anführer; geht er, führt das dienstälteste Mitglied', () => {
    const [a, b, c] = [mk(), mk(), mk()];
    let party = group(a, b, c);
    for (const act of ['promote', 'kick'] as const) b.send({ t: 'party', a: act, id: c.p.id });
    b.send({ t: 'party', a: 'disband' });
    expect(toasted(b, /kann die Führung abgeben/)).toBe(true);
    expect(toasted(b, /kann jemanden entfernen/)).toBe(true);
    expect(toasted(b, /kann sie auflösen/)).toBe(true);
    expect(party.leader).toBe(a.p); expect(party.members.size).toBe(3);
    a.send({ t: 'party', a: 'kick', id: a.p.id });                         // sich selbst entfernt man nicht
    a.send({ t: 'party', a: 'promote', id: 999999 });                      // Unbekannte auch nicht
    expect(party.members.size).toBe(3); expect(party.leader).toBe(a.p);
    // Ernennen
    a.send({ t: 'party', a: 'promote', id: b.p.id });
    expect(party.leader).toBe(b.p);
    expect(partyOf(c).find(m => m.lead)!.name).toBe(b.p.name);
    expect(toasted(b, /hat dir die Führung/)).toBe(true);
    a.send({ t: 'party', a: 'kick', id: c.p.id });                         // der alte Anführer hat nichts mehr zu sagen
    expect(c.p.party).toBe(party);
    // Entfernen
    b.send({ t: 'party', a: 'kick', id: a.p.id });
    expect(a.p.party).toBeNull();
    expect(partyOf(a)).toEqual([]);
    expect(toasted(a, /hat dich aus der Gruppe entfernt/)).toBe(true);
    expect(toasted(c, /wurde aus der Gruppe entfernt/)).toBe(true);
    expect([...party.members]).toEqual([b.p, c.p]);
    // Zu zweit: geht einer, löst sich die Gruppe auf
    b.send({ t: 'party', a: 'leave' });
    expect(b.p.party).toBeNull(); expect(c.p.party).toBeNull();
    expect(partyOf(c)).toEqual([]);
    expect(toasted(c, /Die Gruppe hat sich aufgelöst/)).toBe(true);
    // Der Anführer geht: das dienstälteste Mitglied übernimmt
    party = group(a, b, c);
    a.send({ t: 'party', a: 'leave' });
    expect(party.leader).toBe(b.p);
    expect(toasted(b, /Du führst jetzt die Gruppe an/)).toBe(true);
    expect(toasted(c, new RegExp(b.p.name + ' führt jetzt die Gruppe an'))).toBe(true);
    // Auflösen
    b.send({ t: 'party', a: 'disband' });
    expect(b.p.party).toBeNull(); expect(c.p.party).toBeNull();
    expect(toasted(c, /hat die Gruppe aufgelöst/)).toBe(true);
    expect(partyOf(b)).toEqual([]); expect(partyOf(c)).toEqual([]);
    noGhosts();
    sim.clear();
  });

  it('Nachfolge: verliert der Anführer die Verbindung oder bleibt er gefallen, führt ein anderer weiter', () => {
    const [a, b, c] = [mk(), mk(), mk()];
    const party = group(a, b, c);
    sim.drop(a);
    expect(party.leader).toBe(b.p);                                        // sofort
    expect(toasted(c, /führt jetzt die Gruppe an – .* Verbindung verloren/)).toBe(true);
    expect(partyOf(b).find(m => m.name === a.p.name)).toMatchObject({ online: false });
    sim.reconnect(a);
    expect(a.p.party).toBe(party);
    expect(party.leader).toBe(b.p);                                        // die Führung kommt nicht von selbst zurück
    expect(partyOf(a).length).toBe(3);
    // gefallener Anführer: erst nach der Frist, und nur an Lebende
    b.p.god = false;
    b.p.zone.killPlayer(b.p, 'Test');
    sim.step(S.deadLeaderSec - 3);
    expect(party.leader).toBe(b.p);
    expect(partyOf(a).find(m => m.name === b.p.name)).toMatchObject({ dead: 1, lead: 1 });
    sim.step(5);
    expect(party.leader).toBe(a.p);                                        // dienstältestes lebendes Mitglied
    expect(toasted(c, /ist gefallen/)).toBe(true);
    // steht er rechtzeitig wieder auf, bleibt er Anführer
    a.p.god = false;
    a.p.zone.killPlayer(a.p, 'Test');
    sim.step(S.deadLeaderSec - 5);
    a.send({ t: 'respawn' });
    sim.step(10);
    expect(party.leader).toBe(a.p);
    // niemand sonst da, der führen könnte: es bleibt, wie es ist
    b.send({ t: 'respawn' });
    sim.drop(b); sim.drop(c);
    a.p.zone.killPlayer(a.p, 'Test');
    sim.step(8);
    expect(party.leader).toBe(a.p);
    noGhosts();
    sim.clear();
  });

  it('Mana-Riss: Verlassen und Entfernen führen zum Riss-Stein zurück; kein Entfernen im Bosskampf, kein Auflösen im Riss; Nachzügler folgen', () => {
    const [a, b, c] = [hero(), hero('magier'), hero('paladin')];
    const party = group(a, b, c);
    const z = openRift(a);
    expect(b.p.zone).toBe(z); expect(c.p.zone).toBe(z);
    sim.step(1.1);
    expect(partyOf(a).every(m => m.inst === z.key && m.rift === 1)).toBe(true);
    a.send({ t: 'party', a: 'disband' });
    expect(toasted(a, /Solange jemand von euch im Mana-Riss steckt/)).toBe(true);
    expect(party.members.size).toBe(3);
    // Entfernen außerhalb des Bosskampfs: zurück an den Riss-Stein, kein Weg zurück in diesen Riss
    a.send({ t: 'party', a: 'kick', id: c.p.id });
    expect(c.p.party).toBeNull();
    expect(c.p.zone.id).toBe('gruenwald'); expect(c.p.zone.rift).toBeNull();
    expect(toasted(c, /Der Riss gehört der Gruppe/)).toBe(true);
    toRiftStone(c); c.send({ t: 'rift', a: 'join' });
    expect(c.p.zone.rift).toBeNull();
    expect(toasted(c, /kein Riss für dich offen/)).toBe(true);
    // im Bosskampf wird niemand entfernt
    for (const m of [...z.mobs.values()]) if (!m.boss) z.mobs.delete(m.id);
    startBoss(z, a, b);
    a.send({ t: 'party', a: 'kick', id: b.p.id });
    expect(toasted(a, /Während eines Bosskampfs wird niemand/)).toBe(true);
    expect(b.p.party).toBe(party); expect(b.p.zone).toBe(z);
    // freiwillig gehen darf man immer – auch gefallen; man steht dann lebend am Riss-Stein
    b.p.god = false; z.killPlayer(b.p, 'Test');
    b.send({ t: 'party', a: 'leave' });
    expect(b.p.zone.id).toBe('gruenwald'); expect(b.p.dead).toBe(false);
    expect(a.p.party).toBeNull();                                          // zu zweit: aufgelöst …
    expect(a.p.zone).toBe(z);                                              // … aber wer drin ist, kämpft weiter und schließt ab
    killBoss(z, a);
    expect(a.p.char.rift!.stufe).toBe(2);
    expect(b.p.char.rift!.stufe).toBe(1);
    expect(groupChest(z)).toBeUndefined();                                 // allein beendet: keine Gruppentruhe
    sim.clear();
    // Wer während eines Risses zur Gruppe stößt, folgt am Riss-Stein
    const [d, e, f] = [hero(), hero(), hero()];
    group(d, e);
    e.p.x += 900;                                                          // steht nicht am Stein, bleibt draußen
    const z2 = openRift(d);
    expect(e.p.zone.rift).toBeNull();
    d.send({ t: 'party', a: 'invite', id: f.p.id }); f.send({ t: 'party', a: 'accept' });
    expect(f.p.party).toBe(d.p.party);
    toRiftStone(f); f.send({ t: 'rift', a: 'join' });
    expect(f.p.zone).toBe(z2);
    // der Anführer verlässt die Gruppe im Riss: er steht am Stein, die Führung geht weiter, der Riss bleibt
    d.send({ t: 'party', a: 'leave' });
    expect(d.p.zone.rift).toBeNull();
    expect(e.p.party!.leader).toBe(e.p);
    expect(f.p.zone).toBe(z2);
    expect(z2.rift!.members.has(d.p.charId)).toBe(false);
    noGhosts();
    sim.clear();
  });

  it('Neuer Kreis: die Gruppe spielt in der Welt des niedrigsten Kreises; die Einladung nennt ihn; im Bosskampf wird der Wechsel aufgeschoben', () => {
    const [a, b] = [mk('krieger', 40), mk('magier', 40)];
    a.p.char.kreis = 2; sim.game.rehome(a.p);
    expect(a.p.zone.key).toBe('gruenwald#k2');
    a.send({ t: 'party', a: 'invite', id: b.p.id });
    expect(inviteOf(b)).toMatchObject({ kreis: 0 });
    b.send({ t: 'party', a: 'accept' });
    expect(a.p.zone.key).toBe('gruenwald'); expect(b.p.zone.key).toBe('gruenwald');
    expect(toasted(a, /niedrigsten Kreises: Erster Kreis/)).toBe(true);
    expect(partyOf(b).map(m => [m.kreis ?? 0, m.inst])).toEqual([[2, 'gruenwald'], [0, 'gruenwald']]);
    // umgekehrt: der Höhere wird eingeladen und erfährt, in welcher Welt gespielt wird
    b.send({ t: 'party', a: 'leave' });
    expect(a.p.zone.key).toBe('gruenwald#k2');                             // allein wieder in der eigenen Welt
    b.send({ t: 'party', a: 'invite', id: a.p.id });
    expect(inviteOf(a)).toMatchObject({ kreis: 0 });
    a.send({ t: 'party', a: 'accept' });
    expect(a.p.zone.key).toBe('gruenwald');
    // Bosskampf: wer mittendrin steckt, wechselt erst danach
    sim.game.transfer(a.p, 'wurzelgruft', '');
    const z = a.p.zone;
    expect(z.key).toBe('wurzelgruft');
    startBoss(z, a);
    const t0 = a.toasts.length;
    b.send({ t: 'party', a: 'leave' });
    expect(a.p.party).toBeNull();
    expect(a.p.zone).toBe(z);
    expect(toasted(a, /Nach diesem Kampf wechselst du/, t0)).toBe(true);
    sim.step(2);
    expect(a.p.zone).toBe(z);
    a.p.y -= 5 * TILE;                                                     // nicht dort stehen, wo gleich das Portal erscheint
    killBoss(z, a);
    sim.step(1.3);
    expect(a.p.zone.key).toBe('wurzelgruft#k2');
    noGhosts();
    sim.clear();
  });

  it('Zur Gruppe reisen: eine gewöhnliche Quellstein-Reise – nur vom Quellstein aus und nur zu aktivierten Steinen', () => {
    const [a, b, c] = [mk(), mk(), mk()];
    group(a, b);
    sim.travel(a, 'kristall');
    const st = stone(b.p.zone);
    b.p.x = st.x; b.p.y = st.y + 18;
    b.send({ t: 'party', a: 'travel', id: a.p.id });
    expect(toasted(b, /noch nicht aktiviert/)).toBe(true);
    expect(b.p.zone.id).toBe('gruenwald');
    b.p.char.flags['t:kristall'] = 1;
    b.p.x += 400;
    b.send({ t: 'party', a: 'travel', id: a.p.id });
    expect(toasted(b, /an einem Quellstein stehen/)).toBe(true);
    expect(b.p.zone.id).toBe('gruenwald');
    b.p.x = st.x;
    c.p.x = st.x; c.p.y = st.y + 18; c.p.char.flags['t:kristall'] = 1;
    c.send({ t: 'party', a: 'travel', id: a.p.id });                       // kein Gruppenmitglied: nichts
    expect(c.p.zone.id).toBe('gruenwald');
    b.send({ t: 'party', a: 'travel', id: a.p.id });
    expect(b.p.zone.id).toBe('kristall');
    const k = stone(b.p.zone);
    expect(Math.hypot(b.p.x - k.x, b.p.y - k.y)).toBeLessThan(30);
    // steckt das Mitglied im Dungeon, geht es zum Quellstein des Gebiets davor
    sim.travel(b, 'gruenwald'); b.p.x = st.x; b.p.y = st.y + 18;
    sim.travel(a, 'geode');
    b.send({ t: 'party', a: 'travel', id: a.p.id });
    expect(b.p.zone.id).toBe('kristall');
    b.send({ t: 'party', a: 'travel', id: a.p.id });
    expect(toasted(b, /in deinem Gebiet/)).toBe(true);
    sim.clear();
  });
});

// =====================================================================================================================
describe('Handel', () => {
  it('Gegenstände, Stapel mit Menge und Gold wechseln in einem Zug den Besitzer und sind sofort gespeichert', () => {
    const [a, b] = [mk(), mk('magier')];
    const sword = gear();
    a.p.addItem(sword); a.give('potion_hp1', 10); a.p.char.gold = 500;
    b.give('mat_wood', 7); b.give('potion_hp1', 2); b.p.char.gold = 50;
    a.send({ t: 'trade', a: 'request', id: b.p.id });
    expect(last(b, 'trade')!.req).toMatchObject({ from: a.p.id, name: a.p.name, sec: S.tradeRequestSec });
    expect(tv(a)).toBeNull();
    b.send({ t: 'trade', a: 'accept' });
    expect(tv(a)!.with).toMatchObject({ id: b.p.id, name: b.p.name, cls: 'magier' });
    const potion = a.p.char.inv.find(i => i.base === 'potion_hp1')!, wood = b.p.char.inv.find(i => i.base === 'mat_wood')!;
    a.send({ t: 'trade', a: 'add', uid: sword.uid });
    a.send({ t: 'trade', a: 'add', uid: potion.uid, qty: 4 });
    a.send({ t: 'trade', a: 'gold', gold: 120 });
    b.send({ t: 'trade', a: 'add', uid: wood.uid });                       // ohne Menge: der ganze Stapel
    b.send({ t: 'trade', a: 'gold', gold: 30 });
    // beide sehen das Angebot des anderen
    expect(tv(b)!.them.items.map(i => [i.base, i.qty ?? 1])).toEqual([[sword.base, 1], ['potion_hp1', 4]]);
    expect(tv(b)!.them.gold).toBe(120);
    expect(tv(a)!.them.items.map(i => [i.base, i.qty])).toEqual([['mat_wood', 7]]);
    expect(tv(a)!.me.items.length).toBe(2);
    expect(a.count('potion_hp1')).toBe(10);                                // noch ist nichts bewegt
    // direkt nach einer Änderung lässt sich nicht sperren
    a.send({ t: 'trade', a: 'lock' });
    expect(toasted(a, /gerade geändert/)).toBe(true);
    expect(tv(a)!.me.locked).toBe(false);
    expect(tv(a)!.wait).toBeGreaterThan(0);
    sim.step(S.tradeLockDelaySec + 0.1);
    a.send({ t: 'trade', a: 'confirm' });                                  // bestätigen, bevor beide gesperrt haben: nein
    expect(toasted(a, /Erst wenn beide gesperrt haben/)).toBe(true);
    a.send({ t: 'trade', a: 'lock' });
    expect(tv(b)!.them.locked).toBe(true);
    b.send({ t: 'trade', a: 'lock' });
    a.send({ t: 'trade', a: 'confirm' });
    expect(tv(b)!.them.ok).toBe(true); expect(tv(b)!.me.ok).toBe(false);
    expect(b.p.char.inv.some(i => i.uid === sword.uid)).toBe(false);       // eine Bestätigung allein bewegt nichts
    b.send({ t: 'trade', a: 'confirm' });
    // getauscht
    expect(last(a, 'trade')).toMatchObject({ tr: null, done: 1 }); expect(last(b, 'trade')).toMatchObject({ tr: null, done: 1 });
    expect(a.p.char.inv.some(i => i.uid === sword.uid)).toBe(false);
    expect(b.p.char.inv.find(i => i.uid === sword.uid)).toMatchObject({ base: sword.base, affixes: sword.affixes });
    expect(a.count('potion_hp1')).toBe(6); expect(b.count('potion_hp1')).toBe(6);   // 2 + 4, auf einem Stapel
    expect(b.p.char.inv.filter(i => i.base === 'potion_hp1').length).toBe(1);
    expect(a.count('mat_wood')).toBe(7); expect(b.count('mat_wood')).toBe(0);
    expect(a.p.char.gold).toBe(500 - 120 + 30); expect(b.p.char.gold).toBe(50 + 120 - 30);
    const uids = [...a.p.char.inv, ...b.p.char.inv].map(i => i.uid);
    expect(new Set(uids).size).toBe(uids.length);
    expect(toasted(a, /Handel mit .* abgeschlossen/)).toBe(true);
    // sofort gespeichert – beide, ohne auf das automatische Speichern zu warten
    for (const t of [a, b]) {
      const saved = sim.db.loadChar(t.s.account!.id, t.p.charId)!;
      expect(saved.gold).toBe(t.p.char.gold);
      expect(saved.inv.map(i => [i.uid, i.qty ?? 1])).toEqual(t.p.char.inv.map(i => [i.uid, i.qty ?? 1]));
    }
    expect(Social.state(sim.game).trades.size).toBe(0);
    // ein reiner Goldhandel geht auch
    openTrade(b, a);
    b.send({ t: 'trade', a: 'gold', gold: 40 });
    seal(a, b);
    expect(a.p.char.gold).toBe(450); expect(b.p.char.gold).toBe(100);
    sim.clear();
  });

  it('wird abgelehnt: zu weit weg, gefallen, andere Welt, schon im Handel, Dauerfeuer, abgelaufene Anfrage', () => {
    const [a, b, c] = [mk(), mk(), mk()];
    a.send({ t: 'trade', a: 'request', id: a.p.id });                      // mit sich selbst: nichts
    expect(a.toasts.length).toBe(0);
    b.p.x += S.tradeRadius + 50;
    a.send({ t: 'trade', a: 'request', id: b.p.id });
    expect(toasted(a, /zu weit auseinander/)).toBe(true);
    b.p.x = a.p.x;
    b.p.god = false; b.p.zone.killPlayer(b.p, 'Test');
    a.send({ t: 'trade', a: 'request', id: b.p.id });
    expect(toasted(a, /beide am Leben/)).toBe(true);
    b.send({ t: 'respawn' }); b.p.x = a.p.x; b.p.y = a.p.y;
    expect(last(b, 'trade')?.req ?? null).toBeNull();
    // andere Welt-Instanz (höherer Kreis): man sieht sich nicht, man handelt nicht
    b.p.char.kreis = 1; sim.game.rehome(b.p); b.p.x = a.p.x; b.p.y = a.p.y;
    a.send({ t: 'trade', a: 'request', id: b.p.id });
    expect(last(b, 'trade')?.req ?? null).toBeNull();
    b.p.char.kreis = 0; sim.game.rehome(b.p); b.p.x = a.p.x; b.p.y = a.p.y;
    // Anfragen im Dauerfeuer
    sim.step(S.tradeRequestCooldownSec + 0.1);
    a.send({ t: 'trade', a: 'request', id: b.p.id });
    expect(last(b, 'trade')!.req).toMatchObject({ from: a.p.id });
    const before = b.msgs.length;
    for (let i = 0; i < 30; i++) a.send({ t: 'trade', a: 'request', id: b.p.id });
    expect(b.msgs.length).toBe(before);                                    // b bekommt nichts davon mit
    expect(toasted(a, /gerade erst angefragt/)).toBe(true);
    c.send({ t: 'trade', a: 'request', id: b.p.id });
    expect(toasted(c, /andere Anfrage offen/)).toBe(true);
    b.send({ t: 'trade', a: 'decline' });
    expect(toasted(a, /möchte gerade nicht handeln/)).toBe(true);
    expect(last(b, 'trade')!.req).toBeNull();
    a.send({ t: 'trade', a: 'request', id: b.p.id });                      // gleich noch einmal: Pause
    expect(last(b, 'trade')!.req).toBeNull();
    // Anfrage läuft ab
    sim.step(S.tradeRequestCooldownSec + 0.1);
    a.send({ t: 'trade', a: 'request', id: b.p.id });
    sim.step(S.tradeRequestSec + 0.6);
    expect(last(b, 'trade')!.req).toBeNull();
    expect(toasted(a, /nicht geantwortet/)).toBe(true);
    b.send({ t: 'trade', a: 'accept' });
    expect(tv(a)).toBeNull();
    // wer handelt, ist beschäftigt
    openTrade(a, b);
    c.send({ t: 'trade', a: 'request', id: a.p.id });
    expect(toasted(c, /handelt gerade mit jemand anderem/)).toBe(true);
    // Handgriffe im Dauerfeuer: nach den ersten ist für diese Sekunde Schluss
    a.p.char.gold = 1000;
    for (let i = 1; i <= 200; i++) a.send({ t: 'trade', a: 'gold', gold: i });
    expect(tv(b)!.them.gold).toBe(S.tradeOpsPerSec);
    // Nachrichten ohne Handel bewirken nichts
    for (const act of ['add', 'gold', 'lock', 'confirm', 'cancel', 'unlock', 'remove'] as const) c.send({ t: 'trade', a: act, uid: 'x', qty: 1, gold: 5 });
    expect(tv(c)).toBeNull();
    sim.clear();
  });

  it('Exploits: Angebot nach dem Sperren ändern, doppelte uids, unmögliche Mengen, Angelegtes, fremde und gebundene Gegenstände', () => {
    const [a, b] = [mk(), mk()];
    a.give('potion_hp1', 10); a.p.char.gold = 300; b.p.char.gold = 300;
    const sword = gear(), worn = gear();
    b.p.addItem(sword);
    a.p.char.equip.weapon = worn;
    const potion = a.p.char.inv.find(i => i.base === 'potion_hp1')!;
    openTrade(a, b);
    // --- ändern, nachdem der andere gesperrt hat: alle Sperren fallen, bestätigen geht nicht mehr
    b.send({ t: 'trade', a: 'add', uid: sword.uid });
    a.send({ t: 'trade', a: 'gold', gold: 200 });
    sim.step(S.tradeLockDelaySec + 0.1);
    a.send({ t: 'trade', a: 'lock' }); b.send({ t: 'trade', a: 'lock' });
    a.send({ t: 'trade', a: 'confirm' });
    expect(tv(b)!.them).toMatchObject({ locked: true, ok: true });
    b.send({ t: 'trade', a: 'remove', uid: sword.uid });                   // b zieht das Schwert im letzten Moment zurück …
    expect(tv(a)!.me).toMatchObject({ locked: false, ok: false });         // … und a ist wieder frei
    expect(tv(a)!.them.items.length).toBe(0);
    b.send({ t: 'trade', a: 'lock' });                                     // sofort wieder sperren geht nicht
    expect(tv(b)!.me.locked).toBe(false);
    b.send({ t: 'trade', a: 'confirm' });
    expect(a.p.char.gold).toBe(300); expect(b.p.char.gold).toBe(300);
    sim.step(S.tradeLockDelaySec + 0.1);
    b.send({ t: 'trade', a: 'lock' }); b.send({ t: 'trade', a: 'confirm' });
    expect(a.p.char.gold).toBe(300);                                       // allein lässt sich nichts abschließen
    // auch Gold zählt als Änderung; „entsperren“ nimmt beiden die Bestätigung
    a.send({ t: 'trade', a: 'lock' }); a.send({ t: 'trade', a: 'confirm' });
    a.send({ t: 'trade', a: 'unlock' });
    expect(tv(b)!.them).toMatchObject({ locked: false, ok: false });
    expect(tv(b)!.me).toMatchObject({ locked: true, ok: false });
    a.send({ t: 'trade', a: 'gold', gold: 0 });
    expect(tv(b)!.me.locked).toBe(false);
    // --- unmögliche Mengen und Beträge
    const t0 = a.toasts.length;
    for (const q of [-1, 0, 1.5, 11, 1e12, NaN, Infinity, -Infinity, '5; DROP', null, {}, [3, 4]]) a.send({ t: 'trade', a: 'add', uid: potion.uid, qty: q as any });
    expect(tv(a)!.me.items.length).toBe(0);
    expect(a.toasts.slice(t0).filter(s => /Ungültige Menge/.test(s)).length).toBeGreaterThanOrEqual(10);
    for (const gold of [-5, 1.5, 301, 1e15, NaN, Infinity, 'viel', null]) a.send({ t: 'trade', a: 'gold', gold: gold as any });
    expect(tv(a)!.me.gold).toBe(0);
    // --- dieselbe uid mehrfach: ein Eintrag, die letzte Menge gilt
    sim.step(1);
    a.send({ t: 'trade', a: 'add', uid: potion.uid, qty: 3 });
    a.send({ t: 'trade', a: 'add', uid: potion.uid, qty: 3 });
    a.send({ t: 'trade', a: 'add', uid: potion.uid, qty: 6 });
    expect(tv(b)!.them.items.map(i => i.qty)).toEqual([6]);
    // --- Angelegtes, Fremdes, Erfundenes, Gebundenes
    a.send({ t: 'trade', a: 'add', uid: worn.uid });
    expect(toasted(a, /Angelegtes lässt sich nicht handeln/)).toBe(true);
    a.send({ t: 'trade', a: 'add', uid: sword.uid });                      // gehört b
    a.send({ t: 'trade', a: 'add', uid: 'gibtsnicht' });
    for (const base of ['seal_earth', 'leg_krieger', scrollOf(TRIAL_RECIPE)]) {
      a.p.addItem({ ...makeStack(base), uid: 'bound_' + base });
      a.send({ t: 'trade', a: 'add', uid: 'bound_' + base });
    }
    expect(toasted(a, /Questgegenstände lassen sich nicht handeln/)).toBe(true);
    expect(toasted(a, /Legendäre Waffen sind an ihren Träger gebunden/)).toBe(true);
    expect(toasted(a, /persönliche Belohnung/)).toBe(true);
    expect(tv(a)!.me.items.map(i => i.base)).toEqual(['potion_hp1']);
    // --- beschädigtes Inventar mit doppelter uid: wird nicht angefasst
    sim.step(1);
    const twin = gear(); a.p.char.inv.push(twin, { ...twin });
    a.send({ t: 'trade', a: 'add', uid: twin.uid });
    expect(tv(a)!.me.items.length).toBe(1);
    a.p.char.inv = a.p.char.inv.filter(i => i.uid !== twin.uid);
    // --- mehr als die erlaubte Zahl verschiedener Gegenstände
    sim.step(1);
    for (let i = 0; i < S.tradeSlots + 2; i++) { const g = gear(); a.p.addItem(g); a.send({ t: 'trade', a: 'add', uid: g.uid }); }
    expect(tv(a)!.me.items.length).toBe(S.tradeSlots);
    expect(toasted(a, /verschiedene Gegenstände passen nicht/)).toBe(true);
    // --- der Tausch bewegt genau das Angebotene, nichts doppelt
    for (const it of tv(a)!.me.items) if (it.base !== 'potion_hp1') a.send({ t: 'trade', a: 'remove', uid: it.uid });
    const total = (base: string) => a.count(base) + b.count(base);
    expect(total('potion_hp1')).toBe(10);
    seal(a, b);
    expect(last(a, 'trade')).toMatchObject({ done: 1 });
    expect(a.count('potion_hp1')).toBe(4); expect(b.count('potion_hp1')).toBe(6);
    expect(total('potion_hp1')).toBe(10);
    expect(a.p.char.equip.weapon).toBe(worn);
    expect(a.p.char.inv.filter(i => i.uid.startsWith('bound_')).length).toBe(3);
    sim.clear();
  });

  it('verschwindet Angebotenes aus dem Inventar (verkauft, verbraucht, angelegt), fällt es aus dem Angebot und die Sperren fallen', () => {
    const [a, b] = [mk(), mk()];
    a.give('potion_hp1', 10); a.p.char.gold = 300;
    const sword = gear(); a.p.addItem(sword);
    const potion = a.p.char.inv.find(i => i.base === 'potion_hp1')!;
    openTrade(a, b);
    a.send({ t: 'trade', a: 'add', uid: potion.uid, qty: 8 });
    a.send({ t: 'trade', a: 'add', uid: sword.uid });
    a.send({ t: 'trade', a: 'gold', gold: 250 });
    sim.step(S.tradeLockDelaySec + 0.1);
    a.send({ t: 'trade', a: 'lock' }); b.send({ t: 'trade', a: 'lock' });
    b.send({ t: 'trade', a: 'confirm' });
    // a verbraucht Tränke, legt das Schwert an und gibt Gold aus – alles während des Handels
    a.p.removeItems('potion_hp1', 5);
    a.send({ t: 'equip', uid: sword.uid });
    expect(a.p.char.equip.weapon?.uid).toBe(sword.uid);
    a.p.char.gold = 100;
    sim.step(0.3);
    expect(tv(b)!.them.items.length).toBe(0);
    expect(tv(b)!.them.gold).toBe(100);
    expect(tv(b)!.me).toMatchObject({ locked: false, ok: false });
    expect(toasted(b, /Ein Angebot hat sich geändert/)).toBe(true);
    // und selbst ohne den Takt dazwischen: der Abschluss prüft noch einmal
    a.send({ t: 'trade', a: 'add', uid: potion.uid, qty: 5 });
    sim.step(S.tradeLockDelaySec + 0.1);
    a.send({ t: 'trade', a: 'lock' }); b.send({ t: 'trade', a: 'lock' });
    a.send({ t: 'trade', a: 'confirm' });
    a.p.removeItems('potion_hp1', 3);                                      // zwischen den beiden Bestätigungen
    b.send({ t: 'trade', a: 'confirm' });
    expect(last(b, 'trade')!.done).toBeUndefined();
    expect(b.count('potion_hp1')).toBe(0); expect(a.count('potion_hp1')).toBe(2);
    expect(b.p.char.gold).toBe(0);
    sim.clear();
  });

  it('atomar: fehlt einem der Platz, wechselt nichts – nach dem Aufräumen gelingt derselbe Handel; scheitert das Speichern, wird alles zurückgenommen', () => {
    const [a, b] = [mk(), mk()];
    const s1 = gear(), s2 = gear();
    a.p.addItem(s1); a.p.addItem(s2); a.give('potion_hp1', 4); a.p.char.gold = 200;
    for (let i = 0; i < CFG.player.invSize - 1; i++) b.p.char.inv.push(gear());
    b.give('potion_hp1', 1);
    expect(b.p.char.inv.length).toBe(CFG.player.invSize);
    const junk = b.p.char.inv[0];
    openTrade(a, b);
    a.send({ t: 'trade', a: 'add', uid: s1.uid }); a.send({ t: 'trade', a: 'add', uid: s2.uid });
    a.send({ t: 'trade', a: 'add', uid: a.p.char.inv.find(i => i.base === 'potion_hp1')!.uid, qty: 4 });   // passt auf b's Stapel
    a.send({ t: 'trade', a: 'gold', gold: 100 });
    b.send({ t: 'trade', a: 'add', uid: junk.uid });                       // macht einen Platz frei – gebraucht werden zwei
    const before = [snap(a), snap(b)];
    seal(a, b);
    expect(last(a, 'trade')!.done).toBeUndefined();
    expect([snap(a), snap(b)]).toEqual(before);                            // nichts hat sich bewegt, auch kein Gold
    expect(toasted(a, /hat nicht genug Platz im Inventar/)).toBe(true);
    expect(toasted(b, /Dein Inventar ist zu voll/)).toBe(true);
    expect(tv(a)).toMatchObject({ full: 'them', me: { locked: false, ok: false } });
    expect(tv(b)).toMatchObject({ full: 'me' });
    // b schafft Platz – derselbe Handel gelingt
    b.send({ t: 'drop', uid: b.p.char.inv[1].uid });
    seal(a, b);
    expect(last(a, 'trade')).toMatchObject({ done: 1 });
    expect(b.p.char.inv.length).toBe(CFG.player.invSize);
    expect(b.p.char.inv.some(i => i.uid === s1.uid) && b.p.char.inv.some(i => i.uid === s2.uid)).toBe(true);
    expect(b.count('potion_hp1')).toBe(5);
    expect(a.p.char.inv.map(i => i.uid)).toEqual([junk.uid]);
    expect(a.p.char.gold).toBe(100); expect(b.p.char.gold).toBe(100);
    // Speichern scheitert: beide Inventare stehen wieder exakt wie vorher
    openTrade(a, b);
    a.send({ t: 'trade', a: 'add', uid: junk.uid }); a.send({ t: 'trade', a: 'gold', gold: 60 });
    b.send({ t: 'trade', a: 'add', uid: s1.uid }); b.send({ t: 'trade', a: 'add', uid: b.p.char.inv.find(i => i.base === 'potion_hp1')!.uid, qty: 2 });
    const safe = [snap(a), snap(b)];
    const real = sim.db.saveChars.bind(sim.db);
    sim.db.saveChars = () => { throw new Error('Platte voll'); };
    const err = console.error; console.error = () => {};
    try { seal(a, b); } finally { sim.db.saveChars = real; console.error = err; }
    expect([snap(a), snap(b)]).toEqual(safe);
    expect(last(a, 'trade')).toMatchObject({ tr: null }); expect(last(a, 'trade')!.done).toBeUndefined();
    expect(toasted(a, /vollständig zurückgenommen/)).toBe(true);
    expect(Social.state(sim.game).trades.size).toBe(0);
    // zu viel Gold für den Empfänger: abgelehnt
    openTrade(a, b);
    b.p.char.gold = S.goldCap - 10;
    a.send({ t: 'trade', a: 'gold', gold: 50 });
    seal(a, b);
    expect(toasted(a, /kann nicht so viel Gold tragen/)).toBe(true);
    expect(a.p.char.gold).toBe(100); expect(b.p.char.gold).toBe(S.goldCap - 10);
    sim.clear();
  });

  it('Abbruch durch Weggehen, Zonenwechsel, Tod, Verbindungsabriss, Abbrechen und Verlassen der Welt – nie wechselt etwas den Besitzer', () => {
    const causes: [string, (a: Tester, b: Tester) => void, RegExp][] = [
      ['weggehen', a => { a.p.x += S.tradeRadius + 60; }, /zu weit auseinander/],
      ['zonenwechsel', a => sim.travel(a, 'kristall'), /nicht mehr am selben Ort/],
      ['tod', (_a, b) => { b.p.god = false; b.p.zone.killPlayer(b.p, 'Test'); }, /beide am Leben/],
      ['verbindung', a => sim.drop(a), /Verbindung verloren/],
      ['abbrechen', a => a.send({ t: 'trade', a: 'cancel' }), /hat abgebrochen/],
      ['welt verlassen', a => sim.leave(a), /hat die Welt verlassen/],
    ];
    for (const [name, cause, why] of causes) {
      const [a, b] = [mk(), mk()];
      a.give('potion_hp1', 5); a.p.char.gold = 100; b.give('mat_wood', 3);  // b ohne Gold: der Tod kostet sonst welches
      openTrade(a, b);
      a.send({ t: 'trade', a: 'add', uid: a.p.char.inv[0].uid, qty: 5 }); a.send({ t: 'trade', a: 'gold', gold: 70 });
      b.send({ t: 'trade', a: 'add', uid: b.p.char.inv[0].uid, qty: 3 });
      sim.step(S.tradeLockDelaySec + 0.1);
      a.send({ t: 'trade', a: 'lock' }); b.send({ t: 'trade', a: 'lock' }); a.send({ t: 'trade', a: 'confirm' });
      const pa = a.p, pb = b.p;
      const before = JSON.stringify([pa.char.inv, pa.char.gold, pb.char.inv, pb.char.gold]);
      cause(a, b);
      sim.step(0.3);
      expect(last(b, 'trade'), name).toMatchObject({ tr: null });
      expect(last(b, 'trade')!.done, name).toBeUndefined();
      expect(toasted(b, why), name + ': ' + b.toasts.at(-1)).toBe(true);
      b.send({ t: 'trade', a: 'confirm' });                                 // die späte Bestätigung läuft ins Leere
      expect(JSON.stringify([pa.char.inv, pa.char.gold, pb.char.inv, pb.char.gold]), name).toBe(before);
      expect(Social.state(sim.game).trades.size, name).toBe(0);
      if (name === 'verbindung') { sim.reconnect(a); expect(last(a, 'trade')).toMatchObject({ tr: null, req: null }); }
      noGhosts();
      sim.clear();
    }
  });
});

// =====================================================================================================================
describe('Quest teilen', () => {
  it('gefragt wird nur, wer die Quest annehmen dürfte; die Annahme braucht keinen Auftraggeber, aber dieselben Voraussetzungen', () => {
    const [a, b, c, d] = [mk(), mk(), mk(), mk()];
    const solo = mk();
    a.send({ t: 'qShare', id: 's_woelfe' });                               // hat sie nicht: nichts
    expect(a.toasts.length).toBe(0);
    for (const id of ['s_woelfe', 'g_jagd', 'm_erwachen', 'x_arm']) sim.game.acceptQuest(a.p, QUESTS[id]);
    a.send({ t: 'qShare', id: 's_woelfe' });
    expect(toasted(a, /Zum Teilen brauchst du eine Gruppe/)).toBe(true);
    group(a, b, c, d);
    c.p.char.quests.s_woelfe = { s: 'done', p: [], n: 1 };
    d.p.char.quests.s_woelfe = { s: 'active', p: [2] };
    sim.travel(b, 'kristall');                                             // weit weg von Ayla
    const t0 = a.toasts.length;
    a.send({ t: 'qShare', id: 's_woelfe' });
    expect(last(b, 'qOffer')).toMatchObject({ id: 's_woelfe', from: a.p.name, sec: S.shareSec });
    expect(last(c, 'qOffer')).toBeUndefined(); expect(last(d, 'qOffer')).toBeUndefined();
    expect(a.toasts.slice(t0).join(' ')).toMatch(new RegExp(`angeboten: ${b.p.name}\\..*${c.p.name} hat sie schon erledigt.*${d.p.name} hat sie schon`));
    b.send({ t: 'qShareAns', id: 's_woelfe', ok: true });
    expect(b.p.char.quests.s_woelfe).toMatchObject({ s: 'active', p: [0] });
    expect(toasted(b, /Quest angenommen: Sie haben angefangen/)).toBe(true);
    expect(toasted(a, /hat „Sie haben angefangen“ angenommen/)).toBe(true);
    b.send({ t: 'qShareAns', id: 's_woelfe', ok: true });                   // zweimal annehmen: nichts
    expect(d.p.char.quests.s_woelfe.p).toEqual([2]);                        // fremder Fortschritt bleibt unberührt
    // erfundene Annahmen ohne Angebot
    c.send({ t: 'qShareAns', id: 's_woelfe', ok: true });
    solo.send({ t: 'qShareAns', id: 's_woelfe', ok: true });
    solo.send({ t: 'qShareAns', id: 'gibtsnicht', ok: true });
    expect(c.p.char.quests.s_woelfe.s).toBe('done');
    expect(solo.p.char.quests.s_woelfe).toBeUndefined();
    // Voraussetzung fehlt: kein Angebot
    sim.step(S.shareCooldownSec + 0.1);
    a.send({ t: 'qShare', id: 'g_jagd' });
    expect(last(c, 'qOffer')).toBeUndefined();
    expect(toasted(a, /kann gerade niemand annehmen.*braucht zuerst „Ein Flüstern im Wasser“/)).toBe(true);
    // Hauptquests und Geheimnisse
    sim.step(S.shareCooldownSec + 0.1);
    a.send({ t: 'qShare', id: 'm_erwachen' });
    expect(toasted(a, /Hauptquests erzählt die Geschichte jedem selbst/)).toBe(true);
    a.send({ t: 'qShare', id: 'x_arm' });
    expect(toasted(a, /Geheimnisse muss jeder selbst finden/)).toBe(true);
    expect(last(c, 'qOffer')).toBeUndefined();
    // zu oft hintereinander
    c.p.char.quests.m_erwachen = { s: 'done', p: [], n: 1 };
    a.send({ t: 'qShare', id: 'g_jagd' });
    expect(last(c, 'qOffer')).toMatchObject({ id: 'g_jagd' });
    a.send({ t: 'qShare', id: 'g_jagd' });
    expect(toasted(a, /gerade erst eine Quest geteilt/)).toBe(true);
    // Ablehnen
    c.send({ t: 'qShareAns', id: 'g_jagd', ok: false });
    expect(c.p.char.quests.g_jagd).toBeUndefined();
    expect(toasted(a, /hat „Gemeinsame Jagd“ abgelehnt/)).toBe(true);
    c.send({ t: 'qShareAns', id: 'g_jagd', ok: true });                     // das Angebot ist verbraucht
    expect(c.p.char.quests.g_jagd).toBeUndefined();
    // Angebot verfällt
    sim.step(S.shareCooldownSec + 0.1);
    a.send({ t: 'qShare', id: 'g_jagd' });
    sim.step(S.shareSec + 1.2);
    expect(last(c, 'qOffer')).toMatchObject({ id: 'g_jagd', sec: 0 });
    c.send({ t: 'qShareAns', id: 'g_jagd', ok: true });
    expect(c.p.char.quests.g_jagd).toBeUndefined();
    // wer die Gruppe verlässt, kann das Angebot nicht mehr annehmen
    a.send({ t: 'qShare', id: 'g_jagd' });
    c.send({ t: 'party', a: 'leave' });
    c.send({ t: 'qShareAns', id: 'g_jagd', ok: true });
    expect(c.p.char.quests.g_jagd).toBeUndefined();
    expect(toasted(c, /Das Angebot gilt nicht mehr/)).toBe(true);
    sim.clear();
  });
});

// =====================================================================================================================
describe('Gruppenbelohnung und Wertung', () => {
  it('Gruppentruhe: nur wenn zwei aus einer Gruppe dabei waren; jeder öffnet sie einmal und findet eigene Beute; Fremde und Abwesende nicht', () => {
    const [a, b, c, x] = [mk('krieger', 12), mk('magier', 12), mk('paladin', 12), mk('krieger', 12)];
    group(a, b, c);
    for (const t of [a, b, x]) sim.game.transfer(t.p, 'wurzelgruft', '');   // c bleibt im Dorf, x ist ein Fremder im selben Dungeon
    const z = a.p.zone;
    expect(b.p.zone).toBe(z); expect(x.p.zone).toBe(z);
    for (const m of [...z.mobs.values()]) if (!m.boss) z.mobs.delete(m.id);
    for (const t of [a, b, c, x]) sim.game.acceptQuest(t.p, QUESTS.g_jagd);
    startBoss(z, a, b, x);
    b.p.god = false; z.killPlayer(b.p, 'Test');                            // gefallen zählt als dabei
    killBoss(z, a);
    const chest = groupChest(z)!;
    expect(chest).toBeTruthy();
    expect(chest.props).toMatchObject({ tier: 'silver', label: 'Gruppentruhe' });
    expect(toasted(a, /Gruppentruhe ist erschienen/)).toBe(true);
    expect(toasted(x, /Gruppentruhe/)).toBe(false);
    // Wertung des Bosssiegs: alle im Dungeon – die Gruppenquest zählt nur für die, die mit Gruppe dort waren
    for (const t of [a, b, x]) expect(t.p.char.flags['b:' + z.def.boss]).toBe(1);
    expect(c.p.char.flags['b:' + z.def.boss]).toBeUndefined();
    expect(a.p.char.quests.g_jagd.p[0]).toBe(1); expect(b.p.char.quests.g_jagd.p[0]).toBe(1);
    expect(x.p.char.quests.g_jagd.p[0]).toBe(0); expect(c.p.char.quests.g_jagd.p[0]).toBe(0);
    // der Fremde bekommt nichts aus der Gruppentruhe
    const xi = snap(x);
    openChest(x, chest);
    expect(toasted(x, /gehört denen, die den Kampf gemeinsam bestritten haben/)).toBe(true);
    expect(snap(x)).toBe(xi);
    // jedes Mitglied genau einmal, mit eigenem Inhalt
    const loot = (t: Tester) => { const g0 = t.p.char.gold, inv0 = new Set(t.p.char.inv.map(i => i.uid)); openChest(t, chest); return { gold: t.p.char.gold - g0, items: t.p.char.inv.filter(i => !inv0.has(i.uid)) }; };
    const la = loot(a), lb = loot(b);
    for (const l of [la, lb]) { expect(l.gold).toBeGreaterThan(0); expect(l.items.some(i => ITEMS[i.base].kind === 'weapon' || ITEMS[i.base].kind === 'helm' || ITEMS[i.base].kind === 'armor' || ITEMS[i.base].kind === 'accessory')).toBe(true); }
    expect(la.items.find(i => i.rarity >= 1)).toBeTruthy();
    expect(la.items.map(i => i.uid).some(u => lb.items.some(i => i.uid === u))).toBe(false);
    expect(loot(a)).toEqual({ gold: 0, items: [] });
    // c war nicht dabei – auch wenn er später nachkommt
    sim.game.transfer(c.p, 'wurzelgruft', '');
    expect(c.p.zone).toBe(z);
    openChest(c, chest);
    expect(toasted(c, /gehört denen/)).toBe(true);
    sim.clear();
    // allein – oder mit einer Gruppe, die woanders ist – erscheint keine
    const [d, e] = [mk('krieger', 12), mk('krieger', 12)];
    group(d, e);
    sim.game.transfer(d.p, 'geode', '');
    const z2 = d.p.zone;
    for (const m of [...z2.mobs.values()]) if (!m.boss) z2.mobs.delete(m.id);
    startBoss(z2, d);
    killBoss(z2, d);
    expect(groupChest(z2)).toBeUndefined();
    expect([...z2.objs.values()].some(o => o.type === 'chest' && o.props?.boss)).toBe(true);   // die gewöhnliche Belohnung bleibt
    sim.clear();
  });

  it('Mana-Riss: der Abschluss zählt für alle in der Instanz, die Gruppentruhe enthält zusätzlich Echo-Fragmente', () => {
    const [a, b] = [hero(), hero('magier')];
    group(a, b);
    const z = openRift(a);
    for (const m of [...z.mobs.values()]) if (!m.boss) z.mobs.delete(m.id);
    startBoss(z, a, b);
    killBoss(z, a);
    for (const t of [a, b]) { expect(t.p.char.rift!.stufe).toBe(2); expect(t.p.char.rift!.best.wurzelgruft[0]).toBe(1); }
    const chest = groupChest(z)!;
    expect(chest).toBeTruthy();
    const f0 = b.count(ECHO_FRAG);
    openChest(b, chest);
    expect(b.count(ECHO_FRAG)).toBe(f0 + S.groupChest.fragments);
    // die gewöhnliche Riss-Truhe bleibt daneben bestehen und ist nicht dieselbe
    expect([...z.objs.values()].filter(o => o.type === 'chest').length).toBeGreaterThanOrEqual(2);
    sim.clear();
  });

  it('Kills: Erfahrung, Zähler und Questziele gelten für Gruppenmitglieder in Reichweite – nicht für Entfernte, nicht für Fremde', () => {
    const [a, b, c, x] = [mk('krieger', 3), mk('magier', 3), mk('paladin', 3), mk('krieger', 3)];
    group(a, b, c);
    const { z, x: ax, y: ay } = sim.arena(a);
    b.p.x = ax + CFG.combat.partyXpRadius - 60; b.p.y = ay;                // in Reichweite, greift nicht an
    c.p.x = ax + CFG.combat.partyXpRadius + 80; c.p.y = ay;                // zu weit weg
    x.p.x = ax + 20; x.p.y = ay;                                           // Fremder direkt daneben, greift nicht an
    for (const t of [a, b, c, x]) { sim.game.acceptQuest(t.p, QUESTS.s_woelfe); sim.game.acceptQuest(t.p, QUESTS.r_gruenwald); t.p.char.xp = 0; }
    const m = sim.dummy(z, 'waldwolf', 3, ax + 12, ay, 50);
    z.hitMob(m, a.p, 1e6, 'phys');
    expect(m.dead).toBe(true);
    for (const t of [a, b]) {
      expect(t.p.char.kills, t.p.name).toBe(1);
      expect(t.p.char.quests.s_woelfe.p[0]).toBe(1);
      expect(t.p.char.quests.r_gruenwald.p[0]).toBe(1);
    }
    for (const t of [c, x]) {
      expect(t.p.char.kills, t.p.name).toBe(0);
      expect(t.p.char.xp).toBe(0);
      expect(t.p.char.quests.s_woelfe.p[0]).toBe(0);
    }
    // Gruppenbonus: 10 % je weiterem Mitglied in Reichweite – beide bekommen dieselbe Erfahrung
    const base = CFG.enemy.xp(3) * ENEMIES.waldwolf.xpMul;
    expect(a.p.char.xp).toBe(Math.round(base * (1 + CFG.combat.partyXpBonus)));
    expect(b.p.char.xp).toBe(a.p.char.xp);
    // allein: kein Bonus
    const solo = mk('krieger', 3); solo.p.x = ax; solo.p.y = ay + 700; solo.p.char.xp = 0;
    const m2 = sim.dummy(z, 'waldwolf', 3, ax, ay + 712, 50);
    z.hitMob(m2, solo.p, 1e6, 'phys');
    expect(solo.p.char.xp).toBe(Math.round(base));
    // Ereignisse der Geschichte (Echo): das Gruppenmitglied in Reichweite erhält das Zeichen, der Entfernte nicht
    const id = Object.keys(ECHOES)[0];
    const fake = { id: -1, type: 'rift', x: ax, y: ay, state: 0, tag: id } as Obj;
    Story.startEcho(z, a.p, id, fake);
    const echoMobs = [...z.mobs.values()].filter(q => q.summoned && !q.dead && q !== m && q !== m2);
    expect(echoMobs.length).toBeGreaterThan(0);
    for (const q of echoMobs) { q.invuln = false; z.hitMob(q, a.p, 1e9, 'phys'); }
    expect(a.p.char.flags['e:' + id]).toBe(1);
    expect(b.p.char.flags['e:' + id]).toBe(1);                             // 460 px entfernt: über dem Umkreis des Echos, aber in Gruppenreichweite
    expect(c.p.char.flags['e:' + id]).toBeUndefined();
    sim.clear();
  });
});

// =====================================================================================================================
describe('Wiederverbindung', () => {
  it('in der Schonfrist: Gruppe, Riss-Instanz und Position bleiben; der Charakter ist währenddessen geschützt', () => {
    const [a, b] = [hero(), hero('magier')];
    const party = group(a, b);
    const z = openRift(a);
    for (const m of [...z.mobs.values()]) if (!m.boss) z.mobs.delete(m.id);
    b.p.x += 40;
    const pos = { x: b.p.x, y: b.p.y }, pb = b.p;
    b.p.god = false;
    sim.drop(b);
    sim.step(1.1);
    expect(partyOf(a).find(m => m.name === b.p.name)).toMatchObject({ online: false, inst: z.key });
    expect(z.hitPlayer(pb, 9999, 'phys', 40, 'Test')).toBe(0);             // getrennt = unverwundbar
    sim.step(CFG.net.reconnectGraceMs / 1000 - 5);
    expect(sim.game.players.get(pb.charId)).toBe(pb);
    sim.reconnect(b);
    expect(b.p).toBe(pb);                                                  // derselbe Charakter, nicht neu geladen
    expect(b.p.party).toBe(party);
    expect(b.p.zone).toBe(z);
    expect({ x: b.p.x, y: b.p.y }).toEqual(pos);
    const entered = last(b, 'entered')!;
    expect(entered.init.rift).toMatchObject({ dungeon: 'wurzelgruft', stufe: 1 });
    expect(entered.init.players.map(p => p.id)).toEqual([a.p.id]);
    expect(partyOf(b).map(m => [m.name, m.online])).toEqual([[a.p.name, true], [b.p.name, true]]);
    expect(partyOf(a).every(m => m.online)).toBe(true);
    // und er gehört weiter zum Riss: der Abschluss zählt für beide
    startBoss(z, a, b);
    killBoss(z, a);
    expect(b.p.char.rift!.stufe).toBe(2);
    expect(groupChest(z)).toBeTruthy();
    noGhosts();
    sim.clear();
  });

  it('Verbindung ganz weg: der Platz bleibt frei und die Rückkehr stellt Gruppe und Zugang zum Riss wieder her; nach der Frist verfällt er', () => {
    const [a, b, c] = [hero(), hero('magier'), hero('paladin')];
    const party = group(a, b, c);
    const z = openRift(a);
    c.p.char.kreis = 0;
    sim.drop(c);
    sim.step(CFG.net.reconnectGraceMs / 1000 + 1.2);
    expect(sim.game.players.has(c.p.charId)).toBe(false);                  // aus der Welt genommen …
    expect(party.members.size).toBe(2);
    expect(party.seats.has(c.p.charId)).toBe(true);                        // … aber der Platz bleibt
    expect(toasted(a, /Der Platz in der Gruppe bleibt \d+ Minuten frei/)).toBe(true);
    expect(partyOf(a).find(m => m.away)).toMatchObject({ name: c.p.name, id: 0, online: false, charId: c.p.charId });
    noGhosts();
    // ein freigehaltener Platz zählt zur Gruppengröße
    const [d, e] = [hero(), hero()];
    a.p.zone.rift && sim.game.transfer(a.p, 'gruenwald', '');              // (nur für die Einladungen: a verlässt den Riss kurz)
    a.send({ t: 'party', a: 'invite', id: d.p.id }); d.send({ t: 'party', a: 'accept' });
    a.send({ t: 'party', a: 'invite', id: e.p.id });
    expect(toasted(a, /Die Gruppe ist voll/)).toBe(true);
    a.send({ t: 'party', a: 'kick', id: d.p.id });
    // Rückkehr: neu geladen, steht am Riss-Stein, ist wieder in der Gruppe und kann in den Riss folgen
    sim.reconnect(c);
    expect(sim.game.players.get(c.p.charId)).toBe(c.p);
    expect(c.p.party).toBe(party);
    expect(party.seats.size).toBe(0);
    expect(c.p.zone.id).toBe('gruenwald'); expect(c.p.zone.rift).toBeNull();
    expect(toasted(c, /Du bist zurück in deiner Gruppe/)).toBe(true);
    expect(toasted(c, /Am Riss-Stein kannst du folgen/)).toBe(true);
    expect(toasted(b, /ist zurück in der Gruppe/)).toBe(true);
    expect(partyOf(c).length).toBe(3);
    toRiftStone(c); c.send({ t: 'rift', a: 'join' });
    expect(c.p.zone).toBe(z);
    // der Platz verfällt nach der Frist
    sim.drop(c);
    sim.step(CFG.net.reconnectGraceMs / 1000 + 1.2);
    expect(party.seats.has(c.p.charId)).toBe(true);
    sim.step(S.seatSec + 1.2);
    expect(party.seats.size).toBe(0);
    expect(toasted(a, /ist verfallen/)).toBe(true);
    expect(partyOf(a).length).toBe(2);
    sim.reconnect(c);
    expect(c.p.party).toBeNull();
    // der Anführer kann einen freigehaltenen Platz auch selbst freigeben
    sim.drop(b);
    sim.step(CFG.net.reconnectGraceMs / 1000 + 1.2);
    expect(party.seats.has(b.p.charId)).toBe(true);
    a.send({ t: 'party', a: 'kick', char: b.p.charId });
    expect(a.p.party).toBeNull();                                          // niemand mehr übrig: aufgelöst
    expect(Social.state(sim.game).seatOf.size).toBe(0);
    sim.reconnect(b);
    expect(b.p.party).toBeNull();
    noGhosts();
    sim.clear();
  });

  it('kein Geist bleibt zurück: freiwilliges Gehen hält keinen Platz, der Anführer wird ersetzt, und fallen alle aus, gibt es die Gruppe nicht mehr', () => {
    const [a, b, c] = [mk(), mk(), mk()];
    let party = group(a, b, c);
    sim.leave(c);                                                          // zur Charakterauswahl: bewusst gegangen
    expect(party.members.size).toBe(2); expect(party.seats.size).toBe(0);
    expect(partyOf(a).map(m => m.name)).toEqual([a.p.name, b.p.name]);
    // der Anführer verliert die Verbindung ganz: b führt, a hält einen Platz und kommt als Mitglied zurück
    sim.drop(a);
    expect(party.leader).toBe(b.p);
    sim.step(CFG.net.reconnectGraceMs / 1000 + 1.2);
    expect(party.seats.has(a.p.charId)).toBe(true);
    expect(party.leader).toBe(b.p);
    expect(b.p.party).toBe(party);                                         // b bleibt in der Gruppe, obwohl er gerade allein darin steht
    sim.reconnect(a);
    expect(a.p.party).toBe(party); expect(party.leader).toBe(b.p);
    noGhosts();
    // alle fallen aus: die Gruppe endet, Plätze werden nicht ewig gehalten
    sim.drop(a); sim.drop(b);
    sim.step(CFG.net.reconnectGraceMs / 1000 + 1.2);
    expect(sim.game.players.has(a.p.charId)).toBe(false); expect(sim.game.players.has(b.p.charId)).toBe(false);
    sim.step(2);
    expect(Social.state(sim.game).seatOf.size).toBe(0);
    sim.reconnect(a); sim.reconnect(b);
    expect(a.p.party).toBeNull(); expect(b.p.party).toBeNull();
    // ein Fenster löst das andere ab (gleiches Profil): der Charakter bleibt, die Gruppe auch
    party = group(a, b);
    const pa: Player = a.p;
    openTrade(a, b);                                                       // … ein offener Handel endet dabei (das neue Fenster weiß nichts davon)
    sim.reconnect(a);
    expect(a.p).toBe(pa); expect(a.p.party).toBe(party); expect(a.p.linkdead).toBe(false);
    expect(partyOf(a).length).toBe(2);
    expect(last(b, 'trade')).toMatchObject({ tr: null });
    expect(Social.state(sim.game).trades.size).toBe(0);
    expect(Rift.runOf(sim.game, a.p)).toBeUndefined();
    noGhosts();
    sim.clear();
  });
});
