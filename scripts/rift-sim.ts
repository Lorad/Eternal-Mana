// Balance der Mana-Risse per Simulation (ohne Netzwerk):  npx tsx scripts/rift-sim.ts
// Ein Charakter der Stufe 40 kämpft gegen den typischen Gegner des Thron-Risses auf mehreren Riss-Stufen.
// Gemessen werden die Zeit je Gegner, der erlittene Schaden je Sekunde, die Zeit bis zum Tod ohne Gegenwehr und –
// hochgerechnet aus dem Schaden je Sekunde – die Dauer des Echo-Kampfes. Drei Ausrüstungsstände:
//   „Geschichte“   Ausbau aus 0.4 (Set, Runen, Speise, Elixier, Legendäre Waffe) auf Gegenstandsstufe 40, Seltenheit Ungewöhnlich
//   „gut“          dasselbe in Episch mit +5 auf allen Teilen – ein gut ausgerüsteter Charakter am Ende der Geschichte
//   „Riss“         wie „gut“, aber angeglichen bzw. ersetzt durch Beute der vorigen Riss-Stufe, dazu Echo-Runen und volle Quellstufen
import { CFG, ELEMENTS } from '../shared/src/config';
import { CLASS_IDS } from '../shared/src/data/classes';
import { rescaleItem } from '../shared/src/data/items';
import { QUELL_MAX, QUELL_TRACKS } from '../shared/src/data/rifts';
import { computeStats } from '../shared/src/stats';
import type { CharData, ClassId, Element } from '../shared/src/types';
import { SLOTS } from '../shared/src/types';
import { applyTimed } from '../server/src/craft';
import type { Player } from '../server/src/player';
import { investedChar, simulate } from './balance-sim';

const STUFEN = [1, 10, 20, 30];
const MOB = 'leerenbrut'; // häufigster Gegner im Thron der Leere (Dunkelheit)
const buffs = (p: Player) => { applyTimed(p, 'food_spiess', 9999); applyTimed(p, 'elx_power', 9999); };

function build(cls: ClassId, el: Element, kind: 'story' | 'good' | 'rift', stufe: number): CharData {
  const c = investedChar(cls, 40, el, true);
  if (kind === 'story') return c;
  for (const s of SLOTS) { const it = c.equip[s]; if (it) { it.rarity = Math.max(it.rarity, 3); it.up = 5; } }
  if (kind === 'good') return c;
  const ilvl = CFG.rift.ilvl(Math.max(1, stufe - 1));
  for (const s of SLOTS) { const it = c.equip[s]; if (it) rescaleItem(it, ilvl); }
  c.equip.weapon!.ench = 'echo_macht'; c.equip.helm!.ench = 'echo_wacht'; c.equip.armor!.ench = 'echo_wacht'; c.equip.ring1!.ench = 'echo_einklang';
  c.quell = { lvl: QUELL_MAX, xp: 0, pts: Object.fromEntries(QUELL_TRACKS.map(t => [t.id, CFG.quell.trackCap])) };
  return c;
}

function main() {
  const E = CFG.rift.echo;
  console.log(`Mana-Risse (Version ${CFG.version}) – Charakter Stufe 40 gegen „${MOB}“; Mittel über alle fünf Klassen, mittleres der sechs Waffenelemente`);
  console.log('Stufe  Gegner-St.  Ausrüstung   Angriff  Leben   s/Gegner  erlitten/s  s bis Tod   Echo-Kampf (min, allein)');
  for (const stufe of STUFEN) {
    const lvl = CFG.rift.mobLevel(stufe);
    for (const kind of ['story', 'good', 'rift'] as const) {
      if (kind === 'rift' && stufe === 1) continue;
      let ttk = 0, dtps = 0, ttd = 0, power = 0, hp = 0, boss = 0;
      for (const cls of CLASS_IDS) {
        const runs = ELEMENTS.map(el => { const c = build(cls, el, kind, stufe); return { r: simulate(c, lvl, 12, buffs, MOB), c }; }).sort((a, b) => b.r.dps - a.r.dps);
        const mid = runs[2], d = computeStats(mid.c);
        // Echo: Leben und Verteidigung des Echos gegenüber dem gemessenen Gegner
        const bl = lvl + E.levelPlus;
        const adj = (1 - CFG.combat.mitigation(CFG.enemy.def(bl) * E.defMul, 40)) / (1 - CFG.combat.mitigation(CFG.enemy.def(lvl), 40));
        // der Riss legt je Stufe einen Faktor auf Leben und Schaden (CFG.rift.hpMul/dmgMul) – die Simulation misst ohne ihn
        const fh = CFG.rift.hpMul(stufe), fd = CFG.rift.dmgMul(stufe);
        ttk += mid.r.ttk * fh; dtps += mid.r.dtps * fd; ttd += mid.r.ttd / fd; power += d.power; hp += d.maxHp;
        boss += (CFG.enemy.hp(bl) * E.hpMul * fh) / (mid.r.dps * adj) / 60;
      }
      const n = CLASS_IDS.length, name = { story: 'Geschichte', good: 'gut', rift: 'Riss' }[kind];
      console.log(`${String(stufe).padStart(5)}  ${String(lvl).padStart(10)}  ${name.padEnd(11)}  ${(power / n).toFixed(0).padStart(7)}  ${(hp / n).toFixed(0).padStart(5)}  ${(ttk / n).toFixed(1).padStart(9)}  ${(dtps / n).toFixed(1).padStart(10)}  ${(ttd / n).toFixed(1).padStart(9)}   ${(boss / n).toFixed(1).padStart(8)}`);
    }
  }
  console.log('\nZum Vergleich – Gegner der Stufe 40 (Ende der Geschichte), Ausrüstung „Geschichte“:');
  let ttk = 0, dtps = 0, ttd = 0;
  for (const cls of CLASS_IDS) { const r = simulate(build(cls, 'fire', 'story', 1), 40, 12, buffs, MOB); ttk += r.ttk; dtps += r.dtps; ttd += r.ttd; }
  console.log(`  s/Gegner ${(ttk / 5).toFixed(1)}, erlitten/s ${(dtps / 5).toFixed(1)}, s bis Tod ${(ttd / 5).toFixed(1)}`);
}
main();
