/**
 * ZENTRALES BALANCING. Alle wichtigen Spielwerte stehen hier (bzw. in shared/src/data/*),
 * damit sie nicht über den Quellcode verstreut sind.
 */
import type { Element } from './types';

export const CFG = {
  version: '0.1.0',
  net: {
    defaultPort: 7777,
    tickRate: 20,            // Server-Simulationsschritte pro Sekunde (= Snapshot-Rate)
    moveSendRate: 20,        // Positionsmeldungen des Clients pro Sekunde
    interpDelayMs: 110,      // Darstellungsverzögerung fremder Entitäten (Interpolation)
    reconnectGraceMs: 30000, // so lange bleibt ein Charakter nach Verbindungsabbruch in der Welt
    pingIntervalMs: 2000,
  },
  save: {
    autosaveSec: 30,
    backupEveryMin: 15,
    backupsKept: 20,
    charSnapshotsKept: 5,
    slots: 4,
  },
  player: {
    radius: 5,
    baseSpeed: 86,           // px/s
    dodgeSpeedMul: 2.7,
    dodgeDuration: 0.32,
    dodgeIFrames: 0.28,
    dodgeCooldown: 0.85,
    comboWindow: 0.7,        // s – Zeitfenster für den nächsten Kombo-Schlag
    comboFinisherMul: 1.5,
    invSize: 40,
    hotbarSize: 4,
    maxLevel: 40,
    attrPointsPerLevel: 3,
    skillPointsPerLevel: 1,
    respawnInvuln: 2.5,
    deathGoldLoss: 0.05,
    reviveTime: 2.5,
    pickupRadius: 22,
    interactRadius: 30,
    outOfCombatRegenDelay: 5, // s ohne Schaden, bis HP-Regeneration verstärkt einsetzt
    potionCooldown: 4,
  },
  /** XP, die für den Aufstieg von `level` auf `level+1` nötig sind */
  xpToNext: (level: number) => Math.floor(40 * Math.pow(level, 1.6) + 60),
  enemy: {
    hp: (lvl: number) => 30 + lvl * 18 + lvl * lvl * 1.2,
    dmg: (lvl: number) => 6 + lvl * 2.6,
    def: (lvl: number) => lvl * 1.5,
    xp: (lvl: number) => 10 + lvl * 6,
    gold: (lvl: number) => 2 + lvl * 1.2,
    leashDist: 260,
    aggroLoseDist: 300,
    wakeDist: 420,           // Gegner simulieren nur, wenn ein Spieler so nah ist
    respawnSec: 75,
    eliteChance: 0.06,       // Chance auf einen Elite-Gegner (mehr HP/Schaden, besserer Loot)
    eliteHpMul: 2.4,
    eliteDmgMul: 1.35,
    /** Zusätzliche HP je weiterem Spieler in der Zone */
    hpPerExtraPlayer: 0.55,
    bossHpPerExtraPlayer: 0.75,
    /** XP-Abzug, wenn der Spieler deutlich über dem Gegnerlevel liegt */
    xpLevelPenalty: (playerLvl: number, mobLvl: number) => {
      const d = playerLvl - mobLvl;
      if (d <= 3) return 1;
      return Math.max(0.1, 1 - (d - 3) * 0.15);
    },
  },
  combat: {
    /** Schadensminderung durch Verteidigung */
    mitigation: (def: number, attackerLevel: number) => def / (def + 60 + 12 * attackerLevel),
    variance: 0.1,
    baseCrit: 0.05,
    baseCritDmg: 1.5,
    elemStrong: 1.5,
    elemWeak: 0.65,
    elemSame: 0.5,
    markDmgTaken: 1.25,
    weakDmgDealt: 0.7,
    slowFactor: 0.55,
    burnTick: 0.12,   // Anteil des auslösenden Schadens je Sekunde
    poisonTick: 0.1,
    /** Chance, dass ein Elementartreffer seinen Zustand auslöst */
    elemProc: { fire: 0.22, water: 0.25, earth: 0.1, wind: 0, light: 0.15, dark: 0.15, phys: 0 } as Record<Element, number>,
    partyXpRadius: 520,
    partyXpBonus: 0.1, // je weiterem Gruppenmitglied in Reichweite
  },
  loot: {
    /** Grundchance, dass ein normaler Gegner Ausrüstung fallen lässt */
    gearChance: 0.085,
    eliteGearChance: 0.6,
    potionChance: 0.1,
    materialChance: 0.22,
    /** Gewichte der Seltenheitsstufen 0..4 (gewöhnlich … legendär) */
    rarityWeights: [62, 26, 9, 2.6, 0.4],
    eliteRarityWeights: [20, 44, 26, 8.5, 1.5],
    bossRarityWeights: [0, 20, 50, 25, 5],
    chestRarityWeights: { wood: [50, 35, 12, 3, 0], silver: [15, 45, 30, 9, 1], gold: [0, 20, 45, 30, 5] } as Record<string, number[]>,
    rarityStatMul: [1, 1.12, 1.26, 1.42, 1.62],
    affixCount: [0, 1, 2, 3, 4],
    elementChance: [0, 0.1, 0.25, 0.4, 0.6],
    dropLifetimeSec: 120,
    sellFactor: 0.25,
  },
  upgrade: {
    max: 10,
    statPerLevel: 0.08,
    chance: [1, 1, 1, 0.95, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4],
    gold: (ilvl: number, up: number) => Math.floor((30 + ilvl * 8) * (up + 1) * (1 + up * 0.25)),
    mats: (up: number) => 1 + Math.floor(up / 2),
  },
  respecGold: (level: number) => 50 * level,
  world: {
    dayLengthSec: 720,     // ein voller Tag-Nacht-Zyklus
    weatherMinSec: 90,
    weatherMaxSec: 240,
    dungeonResetSec: 90,   // leerer Dungeon wird nach dieser Zeit zurückgesetzt
    shardsPerZone: 5,
  },
};

export const ELEMENTS: Element[] = ['fire', 'water', 'earth', 'wind', 'light', 'dark'];
export const ELEMENT_NAME: Record<Element, string> = {
  phys: 'Physisch', fire: 'Feuer', water: 'Wasser', earth: 'Erde', wind: 'Wind', light: 'Licht', dark: 'Dunkelheit',
};
export const ELEMENT_COLOR: Record<Element, number> = {
  phys: 0xe8e4d8, fire: 0xff7a3c, water: 0x5fb4ff, earth: 0xb9a05a, wind: 0x8ef0c0, light: 0xfff2a0, dark: 0xb070ff,
};
/** Kreislauf: Feuer > Wind > Erde > Wasser > Feuer; Licht und Dunkelheit schlagen sich gegenseitig. */
const BEATS: Partial<Record<Element, Element>> = { fire: 'wind', wind: 'earth', earth: 'water', water: 'fire', light: 'dark', dark: 'light' };

export function elementMultiplier(attack: Element, target: Element): number {
  if (attack === 'phys' || target === 'phys') return 1;
  if (BEATS[attack] === target) return CFG.combat.elemStrong;
  if (attack === target) return CFG.combat.elemSame;
  if (BEATS[target] === attack) return CFG.combat.elemWeak;
  return 1;
}
export function strongAgainst(e: Element): Element | undefined { return BEATS[e]; }

export const RARITY_NAME = ['Gewöhnlich', 'Ungewöhnlich', 'Selten', 'Episch', 'Legendär'];
export const RARITY_COLOR = ['#c9c9c9', '#5fd35f', '#4aa3ff', '#c77dff', '#ffb02e'];
