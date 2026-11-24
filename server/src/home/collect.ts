/**
 * Zuhause (0.7) – Sammlung, Serverseite: führt Buch über das, was die Charaktere eines Profils beweisen, zählt Siege,
 * schaltet Begleiter und Erscheinungen frei und zahlt Meilensteine genau einmal aus. Regeln: shared/src/data/collection.ts.
 *
 * Einziger Auslöser neben dem Betreten der Welt ist `Player.onDirty`: ändert sich am Charakter etwas, das die Sammlung
 * betrifft (Flags, Inventar, Ausrüstung, Rezepte, Quests, Ruf, Risse), liest `absorb` den Spielstand neu – ohne dass
 * Boss-, Welt- oder Handwerkscode davon wissen müsste.
 */
import { BEASTS, FINDS, MILESTONE, dueMilestones, flagBeast, milestoneFlag, perksOf, proofs, studyNeed } from '../../../shared/src/data/collection';
import { HOME_TROPHY } from '../../../shared/src/data/home';
import { LOOKS } from '../../../shared/src/data/looks';
import { PETS } from '../../../shared/src/data/pets';
import { BOSS_BY_MOB, RARE_BY_MOB } from '../../../shared/src/data/rares';
import { TITLES } from '../../../shared/src/data/rifts';
import type { CharData } from '../../../shared/src/types';
import type { Game } from '../game';
import type { Player } from '../player';
import type { Mob, Zone } from '../zone';
import { MEMO, acc, homeOf, note, touch } from './state';

const WATCH: (keyof CharData)[] = ['flags', 'inv', 'equip', 'recipes', 'quests', 'rep', 'rift', 'kreise'];
const FIND: Record<string, string> = Object.fromEntries(FINDS.map(f => [f.id, f.name]));

/** Rechnet Begleiter und Trophäen in die Werte des Spielers ein. */
export function refresh(g: Game, p: Player) {
  const k = perksOf(homeOf(g, p), p.char);
  p.perkMods = k.mods; p.perk = { pickup: k.pickup, rep: k.rep, maps: k.maps };
  p.recalc();
}

export function unlockPet(g: Game, p: Player, id: string, quiet = false): boolean {
  const h = homeOf(g, p), d = PETS[id];
  if (!d || h.pets.includes(id)) return false;
  h.pets.push(id); touch(g, p.accountId, 'pets');
  if (!quiet) { note(g, p, `Neuer Begleiter: ${d.name}. ${d.perk}`, 'story'); p.pev.push({ k: 'sfx', n: 'quest_complete' }); }
  // der erste Begleiter läuft gleich mit
  if (!p.char.pet) { p.char.pet = id; p.sync('pet'); refresh(g, p); if (g.players.has(p.charId)) g.broadcastPlayerInfo(p); }
  return true;
}
export function unlockLook(g: Game, p: Player, id: string, quiet = false): boolean {
  const h = homeOf(g, p), d = LOOKS[id];
  if (!d || h.looks.includes(id)) return false;
  h.looks.push(id); touch(g, p.accountId, 'looks');
  if (!quiet) note(g, p, `Neue Erscheinung: ${d.name} (${d.kind === 'g' ? 'Gewand' : 'Waffenglanz'}). Am Kleiderschrank auf einem Hof anlegen.`, 'good');
  return true;
}

/** Titel und Lagerplätze der Meilensteine gelten für das Profil – die Titel-Flags werden in jeden Charakter gespiegelt. */
function mirror(g: Game, p: Player) {
  const h = homeOf(g, p);
  let changed = false;
  for (const id of h.ms) if (MILESTONE[id]?.title && !p.char.flags[milestoneFlag(id)]) { p.char.flags[milestoneFlag(id)] = 1; changed = true; }
  if (h.owned && !p.char.flags['t:heim']) { p.char.flags['t:heim'] = 1; changed = true; }
  if (changed) p.sync('flags');
}
/** Zahlt erreichte Meilensteine aus – jeder genau einmal je Profil. */
function payMilestones(g: Game, p: Player, quiet: boolean) {
  const h = homeOf(g, p);
  for (let guard = 0; guard < 8; guard++) {
    const due = dueMilestones(h);
    if (!due.length) break;
    for (const m of due) {
      h.ms.push(m.id); touch(g, p.accountId, 'ms');
      if (m.pet) unlockPet(g, p, m.pet, true);
      if (m.look) unlockLook(g, p, m.look, true);
      note(g, p, `Sammlung – „${m.name}“ erreicht: ${m.reward}${m.title && TITLES[m.title] ? ' (wählbar im Fenster „Sammlung“)' : ''}.`, 'story');
      if (!quiet) p.pev.push({ k: 'sfx', n: 'quest_complete' });
    }
  }
  mirror(g, p);
}

/**
 * Liest den Charakter in die Sammlung seines Profils ein. `backfill`: erster Besuch dieses Charakters (Spielstand von
 * vor 0.7 oder neuer Charakter) – dann zählen auch die bisherigen Siege über Bosse, seltene Monster und Weltbosse,
 * und statt vieler einzelner Meldungen gibt es eine Zusammenfassung.
 */
export function absorb(g: Game, p: Player, backfill = false) {
  const h = homeOf(g, p), c = p.char, pr = proofs(c);
  let fresh = 0;
  for (const k of pr.seen) {
    if (h.seen[k]) continue;
    h.seen[k] = 1; touch(g, p.accountId, 'seen'); fresh++;
    if (backfill) continue;
    if (k.startsWith('t:')) { const t = HOME_TROPHY[k.slice(2)]; if (t) note(g, p, `Trophäe für den Hof: ${t.name}.`, 'good', 'item_' + t.icon); }
    else if (k.startsWith('f:') && FIND[k.slice(2)]) note(g, p, `Fundstück für die Sammlung: ${FIND[k.slice(2)]}.`, 'good');
  }
  for (const id of pr.pets) if (unlockPet(g, p, id, backfill)) fresh++;
  for (const id of pr.looks) if (unlockLook(g, p, id, backfill)) fresh++;
  // Sieg-Zähler in den Flags: was seit dem letzten Blick dazukam, sind Siege im Bestiarium
  let memo = MEMO.get(p);
  const first = !memo;
  if (!memo) MEMO.set(p, (memo = new Map()));
  for (const k in c.flags) {
    const beast = flagBeast(k);
    if (!beast) continue;
    const v = c.flags[k], old = memo.get(k) ?? 0;
    if (v > old && (!first || backfill)) { h.kills[beast] = (h.kills[beast] ?? 0) + (v - old); touch(g, p.accountId, 'kills'); fresh++; }
    memo.set(k, v);
  }
  for (const k of memo.keys()) if (!c.flags[k]) memo.delete(k); // Neuer Kreis: Bosssiege beginnen wieder bei null
  if (backfill) {
    c.cv = 1; p.sync('cv');
    if (fresh > 0 && (c.playtime > 60 || c.level > 1)) note(g, p, `Deine Sammlung wurde nachgetragen: ${fresh} Einträge aus dem, was ${c.name} schon erlebt hat.`, 'story');
  }
  payMilestones(g, p, backfill);
}
export function onDirty(g: Game, p: Player, keys: Set<keyof CharData>) {
  if (p.char.cv === undefined || !WATCH.some(k => keys.has(k))) return;
  absorb(g, p);
}

/** Gewöhnlicher Gegner besiegt: zählt für jeden Beteiligten. (Bosse, seltene Monster und Weltbosse zählen über ihre Flags.) */
export function onKill(z: Zone, m: Mob, rec: Player[]) {
  const id = m.def.id, b = BEASTS[id];
  if (!b || RARE_BY_MOB[id] || BOSS_BY_MOB[id]) return;
  const g = z.game, done = new Set<number>();
  for (const p of rec) {
    if (done.has(p.accountId)) continue;
    done.add(p.accountId);
    const h = acc(g, p.accountId).h, n = (h.kills[id] = (h.kills[id] ?? 0) + 1);
    touch(g, p.accountId, 'kills');
    if (n === 1) { note(g, p, `Bestiarium: ${b.name} eingetragen.`, 'info'); payMilestones(g, p, false); }
    else if (n === studyNeed(b)) note(g, p, `Bestiarium: Du kennst jetzt die Schwächen von „${b.name}“.`, 'info');
  }
}
export { mirror, payMilestones };
