/**
 * Endspiel (0.5), Serverseite: Verteiler für die neuen Nachrichten sowie Quellstufen, Neuer Kreis, Angleichen und Titel.
 * Jede Aktion wird hier geprüft (Nähe zu Riss-Stein, Mirelda oder Schmiede, Voraussetzungen, Kosten) – der Client zeigt nur an.
 * Mana-Risse selbst: server/src/rift.ts. Regeln und Daten: shared/src/data/rifts.ts, Zahlen: CFG.rift / CFG.quell / CFG.kreis.
 */
import { CFG } from '../../shared/src/config';
import { ITEMS, generateGear, itemName, makeStack, rescaleItem } from '../../shared/src/data/items';
import { AETHER, ECHO_FRAG } from '../../shared/src/data/materials';
import { QUEST_LIST } from '../../shared/src/data/quests';
import { KREIS_KEEP_FLAGS, KREIS_NAME, KREIS_NPC, KREIS_RESET_FLAGS, KREIS_RESET_PREFIX, QUELL_MAX, QUELL_TRACK, TRIAL_ID, attuneBlock, attunePlan, kreisBlock, kreisOf, nextKreis, ownedTitles, quellBonus, quellFree, riftUnlocked } from '../../shared/src/data/rifts';
import { getMap } from '../../shared/src/maps/mapgen';
import { MOD_LABEL, SLOTS } from '../../shared/src/types';
import type { ClientMsg, ItemInstance } from '../../shared/src/types';
import { atStation } from './craft';
import type { Game } from './game';
import type { Player } from './player';
import { Rift, riftHome } from './rift';

export type EndgameMsg = Extract<ClientMsg, { t: 'rift' | 'quell' | 'kreis' | 'attune' | 'title' }>;
function reject(p: Player, s: string) { p.toast(s, 'bad'); p.pev.push({ k: 'sfx', n: 'ui_error' }); }

export function handleEndgame(g: Game, p: Player, m: EndgameMsg) {
  switch (m.t) {
    case 'rift':
      if (m.a === 'start') return Rift.start(g, p, String(m.dungeon ?? ''), Number(m.stufe ?? 1));
      if (m.a === 'join') return Rift.join(g, p);
      if (m.a === 'leave') { if (p.zone.rift && !p.dead) Rift.leave(g, p); return; }
      return;
    case 'quell': return spendQuell(p, String(m.track ?? ''));
    case 'kreis': return startKreis(g, p);
    case 'attune': return attune(g, p, String(m.uid ?? ''), String(m.at ?? ''));
    case 'title': {
      const id = String(m.id ?? '');
      if (id && !ownedTitles(p.char).includes(id)) return;
      if (id) p.char.title = id; else delete p.char.title;
      p.sync('title');
      g.broadcastPlayerInfo(p);
      return;
    }
  }
}

// ------------------------------------------------------------------ Quellstufen
/** Setzt einen freien Quellpunkt auf eine Bahn (Erfahrung dafür sammelt Player.gainQuellXp). */
function spendQuell(p: Player, track: string) {
  const c = p.char, t = QUELL_TRACK[track];
  if (!t || p.dead) return;
  if (quellFree(c) < 1) return reject(p, 'Kein freier Quellpunkt.');
  const q = (c.quell ??= { lvl: 0, xp: 0, pts: {} });
  const n = q.pts[t.id] ?? 0;
  if (n >= CFG.quell.trackCap) return reject(p, `${t.name} ist bereits voll ausgebaut.`);
  q.pts[t.id] = n + 1;
  p.recalc(); p.sync('quell');
  p.toast(`${t.name}: +${quellBonus(t, n + 1)} ${MOD_LABEL[t.mod]} (${n + 1}/${CFG.quell.trackCap})`, 'good');
  p.pev.push({ k: 'sfx', n: 'buff' });
}

// ------------------------------------------------------------------ Neuer Kreis
/**
 * Beginnt bei Mirelda einen Neuen Kreis: Haupt- und Nebenquests sowie der Story-Fortschritt (KREIS_RESET_PREFIX) beginnen neu,
 * die Welt wird härter. Es bleiben Stufe, Ausrüstung, Inventar (außer Questgegenständen), Rezepte, Chronik, Quellsplitter,
 * Quellstufen und Riss-Fortschritt. Die Entscheidungen des abgeschlossenen Kreises werden in `kreise` festgehalten.
 */
export function startKreis(g: Game, p: Player) {
  const c = p.char;
  if (p.dead || p.zone.rift) return;
  if (!g.nearNpc(p, KREIS_NPC)) return reject(p, 'Darüber musst du mit Mirelda sprechen.');
  const why = kreisBlock(c);
  if (why) return reject(p, why);
  const dec: Record<string, number> = {};
  for (const k in c.flags) if (k.startsWith('d:')) dec[k.slice(2)] = c.flags[k];
  c.kreise = [...(c.kreise ?? []), { ende: c.flags['d:ende'] ?? 0, dec }].slice(-12);
  c.kreis = nextKreis(c);
  c.quests = {};
  for (const k of Object.keys(c.flags)) if ((KREIS_RESET_PREFIX.some(pre => k.startsWith(pre)) || KREIS_RESET_FLAGS.includes(k)) && !KREIS_KEEP_FLAGS.includes(k)) delete c.flags[k];
  c.flags[KREIS_KEEP_FLAGS[0]] = 1;
  c.inv = c.inv.filter(it => ITEMS[it.base]?.kind !== 'quest');
  const home = getMap('gruenwald');
  const stone = home.objects.find(o => o.type === 'stone');
  c.respawn = { zone: home.id, x: stone ? stone.x : home.start.x, y: stone ? stone.y + 18 : home.start.y };
  p.story.dlg = null; p.story.places.clear(); p.story.zone = '';
  p.sync('quests', 'flags', 'inv', 'kreis', 'kreise', 'respawn');
  p.checkCollectQuests();
  p.pev.push({ k: 'sfx', n: 'quest_complete' });
  p.toast(`${KREIS_NAME[c.kreis] ?? 'Neuer Kreis'} beginnt. Die Quelle versiegt noch einmal – und alles, was du kannst, kommt mit.`, 'story');
  // in die Welt des neuen Kreises wechseln (in einer Gruppe: in die ihres niedrigsten Kreises); sonst die Zone neu schicken,
  // damit Truhen, Quellsteine und Story-Objekte wieder ihren Anfangszustand zeigen
  const before = p.zone;
  g.rehome(p);
  if (p.zone === before) p.send({ t: 'zone', init: before.initFor(p) });
  p.zone.ev({ k: 'fx', n: 'levelup', x: p.x, y: p.y });
  g.savePlayer(p);
}
/** Quest-Belohnung in Punkten: im ersten Durchgang wie bisher, ab dem zweiten Kreis stattdessen Echo-Fragmente (sonst wüchse ein Charakter mit jedem Kreis unbegrenzt). */
export function questPoints(p: Player, skillPoints = 0, attrPoints = 0) {
  const c = p.char;
  if (!skillPoints && !attrPoints) return;
  if (kreisOf(c) > 0) { p.give(makeStack(ECHO_FRAG, (skillPoints + attrPoints) * CFG.kreis.pointFragments)); return; }
  if (skillPoints) { c.skillPoints += skillPoints; p.sync('skillPoints'); }
  if (attrPoints) { c.attrPoints += attrPoints; p.sync('attrPoints'); }
}

// ------------------------------------------------------------------ Angleichen (Schmiede)
function attune(g: Game, p: Player, uid: string, at: string) {
  const c = p.char;
  if (p.dead) return;
  const it: ItemInstance | undefined = c.inv.find(i => i.uid === uid) ?? SLOTS.map(s => c.equip[s]).find(i => i?.uid === uid);
  if (!it) return;
  if (!atStation(g, p, at, 'forge')) return reject(p, 'Dafür musst du an der passenden Station stehen.');
  const why = attuneBlock(c, it);
  if (why) return reject(p, why);
  const plan = attunePlan(c, it)!;
  c.gold -= plan.gold;
  for (const [b, n] of plan.mats) p.removeItems(b, n);
  rescaleItem(it, plan.to);
  p.recalc(); p.sync('gold', 'inv', 'equip');
  p.toast(`${itemName(it)} wurde angeglichen: Gegenstandsstufe ${plan.to}.`, 'good');
  p.pev.push({ k: 'sfx', n: 'upgrade_success' });
}

// ------------------------------------------------------------------ Entwickler-Befehle (EM_DEV=1)
/** /endspiel · /riss <stufe> · /risstein · /quell <n> · /echo <n> · /kreis [n] · /pruefung */
export function devEndgame(g: Game, p: Player, cmd: string, a: string[]): boolean {
  const c = p.char;
  const rift = () => (c.rift ??= { stufe: 1, seed: 1, best: {} });
  const toStone = () => {
    const h = riftHome();
    if (p.zone.id !== h.zone || p.zone.rift) g.transfer(p, h.zone, '', h);
    else { p.x = h.x; p.y = h.y; p.epoch++; p.send({ t: 'pos', x: p.x, y: p.y, e: p.epoch }); }
  };
  if (cmd === 'endspiel') { // alles abgeschlossen, Stufe 40, gute Ausrüstung, am Riss-Stein
    for (const q of QUEST_LIST) if (q.type === 'main') c.quests[q.id] = { s: 'done', p: [], n: 1 };
    if (!c.flags['d:ende']) c.flags['d:ende'] = 1;
    while (c.level < CFG.player.maxLevel) { c.xp = CFG.xpToNext(c.level); p.gainXp(0.0001); }
    for (const k of ['weapon', 'helm', 'armor', 'accessory', 'accessory'] as const) p.give(generateGear(p.zone.rng, c.level, 3, c.cls, k), false);
    rift(); p.sync('quests', 'flags', 'rift');
    toStone();
  } else if (cmd === 'riss') { rift().stufe = Math.max(1, Math.min(CFG.rift.maxStufe, +a[0] || 1)); p.sync('rift'); }
  else if (cmd === 'risstein') toStone();
  else if (cmd === 'quell') { for (let i = Math.max(1, +a[0] || 1); i > 0 && (c.quell?.lvl ?? 0) < QUELL_MAX; i--) p.gainQuellXp(CFG.quell.xpToNext(c.quell?.lvl ?? 0) - (c.quell?.xp ?? 0)); }
  else if (cmd === 'echo') { p.give(makeStack(ECHO_FRAG, +a[0] || 20), false); p.give(makeStack(AETHER, Math.ceil((+a[0] || 20) / 5)), false); }
  else if (cmd === 'kreis') { c.kreis = Math.max(0, Math.min(CFG.kreis.max, a[0] !== undefined ? +a[0] || 0 : kreisOf(c) + 1)); p.sync('kreis'); g.rehome(p); }
  else if (cmd === 'pruefung') { rift().stufe = Math.max(rift().stufe, CFG.rift.trial.unlock + 1); p.sync('rift'); toStone(); if (riftUnlocked(c)) Rift.start(g, p, TRIAL_ID, 0); }
  else return false;
  return true;
}
