/**
 * ZENTRALES BALANCING. Alle wichtigen Spielwerte stehen hier (bzw. in shared/src/data/*),
 * damit sie nicht über den Quellcode verstreut sind.
 */
import type { Element } from './types';

export const CFG = {
  version: '0.7.1',
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
    hp: (lvl: number) => 36 + lvl * 20 + lvl * lvl * 2,
    dmg: (lvl: number) => 8 + lvl * 3.6,
    def: (lvl: number) => lvl * 1.5,
    xp: (lvl: number) => 10 + lvl * 6,
    gold: (lvl: number) => 2 + lvl * 1.2,
    leashDist: 260,
    aggroLoseDist: 300,
    wakeDist: 420,           // Gegner simulieren nur, wenn ein Spieler so nah ist
    respawnSec: 75,
    eliteChance: 0.06,       // Chance auf einen Elite-Gegner (mehr HP/Schaden, besserer Loot)
    eliteHpMul: 3,
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
    elemProc: { fire: 0.22, water: 0.25, earth: 0.1, wind: 0.18, light: 0.15, dark: 0.15, phys: 0 } as Record<Element, number>,
    /** „Entblößt“ (Wind): Treffer gegen das Ziel sind um so viel wahrscheinlicher kritisch; Spieler erleiden stattdessen mehr Schaden */
    exposeCrit: 0.15,
    exposeDmgTaken: 1.1,
    /** 0.8: s Schonfrist nach einem Geschosstreffer gegen weitere Geschosse desselben Gegners (eine Salve trifft einmal, nicht mit jedem Geschoss) */
    shotGrace: 0.3,
    /** 0.8: ein Heilzauber (Heilendes Licht) heilt je Wirken höchstens diesen Anteil des maximalen Lebens des Geheilten */
    healCap: 0.35,
    /** 0.8: Obergrenze für Lebensraub in Prozent des Schadens (Affixe, Rune, Set und Blutdurst zusammen) */
    lifestealCap: 4,
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
    // ---- Handwerks-Rohstoffe (0.4); Tabellen: shared/src/data/materials.ts
    monsterMatChance: 0.16,   // Monster-Rohstoff des Bioms je besiegtem Gegner
    ingredientChance: 0.1,    // Zutat des Bioms je besiegtem Gegner
    essenceChance: 0.07,      // Essenz im Element des Gegners
    eliteMatMul: 2.5,         // Erwachte: Rohstoff-Chancen × diesen Wert …
    eliteEssence: [2, 3],     // … und garantiert so viele Essenzen
    aetherElite: 0.02,        // Ätherstaub: Erwachte (sehr selten)
    aetherBoss: 0.15,         // Ätherstaub: Bosse (selten)
    bossCoreRepeat: 0.3,      // Bosskern ab dem zweiten Sieg (der erste ist garantiert)
    bossEssence: [4, 6],
    nodeBonusChance: 0.35,    // Zutat des Bioms zusätzlich beim Abbauen
    scrollElite: 0.05,        // Rezeptrolle von Erwachten
    scrollChest: { wood: 0, silver: 0.08, gold: 0.25 } as Record<string, number>,
    scrollBoss: 0.6,
    setPieceBoss: 0.35,       // Setteil aus der Bosstruhe (beim ersten Öffnen garantiert)
    setPieceChest: { wood: 0, silver: 0.06, gold: 0.15 } as Record<string, number>,
  },
  /** Handwerk (0.4). Rezepte: shared/src/data/recipes.ts */
  craft: {
    fireRadius: 60,           // so nah muss man an einem Lagerfeuer stehen
    maxBatch: 10,
    /** Seltenheit geschmiedeter Ausrüstung (Mindestseltenheit „Ungewöhnlich“) bzw. von Meisterstücken („Selten“) */
    gearWeights: [0, 68, 26, 5, 1],
    masterWeights: [0, 0, 72, 23, 5],
    setWeights: [0, 0, 70, 25, 5],
    gearGold: (tier: number) => 20 + 30 * tier * tier,
    reforgeGold: (ilvl: number, rarity: number) => Math.floor((20 + ilvl * 6) * (1 + rarity)),
    reforgeMats: 2,           // Erz der Stufe + ebenso viele Monster-Rohstoffe
    /** Element einschmieden: Essenzen und Gold je Zielstufe 1..3; Stufe 3 braucht zusätzlich den Bosskern des Elements */
    infuseEssences: [8, 14, 22],
    infuseGold: (ilvl: number, level: number) => Math.floor((40 + ilvl * 10) * level * level),
    /** Mehrschaden mit dem Waffenelement und Faktor auf die Zustandschance je Elementstufe 0..3 */
    infuseDmg: [0, 0, 0.04, 0.08],
    infuseProc: [1, 1, 1.3, 1.6],
    foodSec: 900,
    feastSec: 1200,
    elixirSec: 300,
    feastRadius: 170,
    legendMinIlvl: 30,
  },
  /** Elemente (0.4): Resistenzen, Schwächen, Reaktionen. Tabellen: shared/src/elements.ts */
  elements: {
    weakMul: 1.25,            // ausdrückliche Schwäche eines Gegners (zusätzlich zum Kreislauf)
    resistMul: 0.8,           // ausdrückliche Resistenz eines Gegners
    resCap: 50,               // Obergrenze der Spieler-Resistenz in Prozent
    reactCd: 3,               // s, bis dasselbe Ziel erneut reagieren kann
    reactCdBoss: 5,
    duoMul: 1.5,              // Reaktion aus den Elementen zweier Spieler
    duoBuff: { powerPct: 8, dur: 6 },
    freezeImmuneSec: 6,       // so lange kann ein Ziel nach „Eingefroren“/„Verwurzelt“ nicht erneut festgesetzt werden
    eliteCcMul: 0.6,
  },
  /** Legendäre Waffen (0.4): Zahlen der Sonderwirkungen */
  legend: {
    krieger: { every: 4, mult: 1.2, radius: 52 },
    magier: { reactMul: 3, reactCdCut: 2 },
    waldlaeufer: { ricochet: 0.5, echo: 0.18, range: 110 },
    paladin: { shield: 0.5, cap: 0.3, dur: 8, power: 8 },
    schattenjaeger: { mult: 2, radius: 48, cd: 1.5 },
  },
  upgrade: {
    max: 10,
    statPerLevel: 0.08,
    chance: [1, 1, 1, 0.95, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4],
    gold: (ilvl: number, up: number) => Math.floor((30 + ilvl * 8) * (up + 1) * (1 + up * 0.25)),
    mats: (up: number) => 1 + Math.floor(up / 2),
  },
  respecGold: (level: number) => 50 * level,
  /** Endspiel (0.5): Mana-Risse. Modifikatoren, Echos und Texte: shared/src/data/rifts.ts */
  rift: {
    maxStufe: 30,
    /** Gegnerstufe und Gegenstandsstufe der Beute je Riss-Stufe (oberhalb der Höchststufe 40) */
    mobLevel: (stufe: number) => 40 + 2 * stufe,
    ilvl: (stufe: number) => 40 + stufe,
    /** zusätzlich zur Gegnerstufe: Faktor auf Leben und Schaden aller Gegner und des Echos (Stufe 1 = unverändert) */
    hpMul: (stufe: number) => 1 + 0.03 * (stufe - 1),
    dmgMul: (stufe: number) => 1 + 0.04 * (stufe - 1),
    /** Anzahl der Modifikatoren */
    modCount: (stufe: number) => (stufe >= 20 ? 3 : stufe >= 10 ? 2 : 1),
    /** Richtzeit: Grundzeit + Zeit je Raum des Dungeons + Zuschlag je Stufe (s) */
    parBase: 60, parPerRoom: 10, parPerStufe: 11,
    /** Lebensfunken: so oft darf die Gruppe am Eingang wiederkehren (allein / je weiterem Mitglied) */
    revives: 3, revivesPerExtra: 1,
    joinRadius: 420,          // so nah am Riss-Stein müssen Gruppenmitglieder stehen, um mitgenommen zu werden
    stoneRadius: 70,
    eliteChance: 0.08,
    /** Boss-Echo: einheitliche Stärke, damit alle sechs Dungeons vergleichbar sind */
    echo: { hpMul: 46, dmgMul: 1.9, defMul: 1.5, levelPlus: 2, xpMul: 45, goldMul: 70 },
    /** Seltenheitsgewichte der Belohnungstruhe bei Stufe 1 und bei der höchsten Stufe (dazwischen linear) */
    rarityLow: [0, 18, 52, 25, 5], rarityHigh: [0, 0, 30, 50, 20],
    chestGear: 2, bonusGear: 1,
    fragments: (stufe: number) => 2 + Math.floor(stufe / 3),
    bonusFragments: (stufe: number) => 1 + Math.floor(stufe / 5),
    fragElite: 0.25,          // Echo-Fragment von Erwachten im Riss
    aether: (stufe: number) => Math.min(1, 0.15 + 0.03 * stufe),
    bonusAether: 0.5,
    setPiece: (stufe: number) => Math.min(0.75, 0.3 + 0.015 * stufe),
    scroll: 0.4, unique: 0.12,
    // ---- Modifikatoren
    brand: { radius: 22, dur: 6, mult: 0.35 },
    bersten: { radius: 34, delay: 1.2, mult: 1.4 },
    finsternis: { aggro: 0.6, light: 0.5 },
    versiegt: { heal: 0.5 },
    horde: { extra: 0.8, hp: 0.6, dmg: 0.8 },
    erwacht: { eliteChance: 0.3 },
    wucher: { regen: 0.03, calm: 3 },
    hast: { speed: 1.3, cd: 0.75 },
    glas: { dmgTaken: 1.4, cd: 0.7 },
    sturm: { every: 6, radius: 26, delay: 1.1, mult: 1.2 },
    duerre: { regen: 0.5, gain: 2 },
    /** Angleichen (Schmiede): Stufen je Schritt, Echo-Fragmente je Stufe, Ätherstaub je Schritt bei Legendären Waffen, Gold je Stufe */
    attune: { step: 5, frags: 2, legendFrags: 3, legendAether: 1, gold: (ilvl: number) => 120 + ilvl * 12 },
    /** Prüfung der Sieben */
    trial: { unlock: 15, stufe: 18, hpMul: 0.4, revives: 3, pause: 5, fragments: 8, aether: 2 },
  },
  /** Endspiel (0.5): Quellstufen – Erfahrung über die Höchststufe hinaus. Bahnen: QUELL_TRACKS in data/rifts.ts */
  quell: {
    xpToNext: (q: number) => 15000 + 1500 * q,
    trackCap: 10,
  },
  /** Endspiel (0.5): Neuer Kreis */
  kreis: {
    max: 3,
    floor: 36,                // ab dem 1. Kreis ist kein Gegner schwächer als diese Stufe …
    levelPer: 10,             // … und jeder Kreis legt so viele Stufen darauf
    bossXp: 40, bossGold: 60, // Boss-Belohnung mindestens: Gegner-EP/-Gold seiner Stufe × Faktor
    pointFragments: 1,        // ab dem 1. Kreis geben Quests statt Attribut-/Fähigkeitspunkten Echo-Fragmente
  },
  /** Gemeinsam (0.7): Gruppe, Handel, Quest teilen, Gruppentruhe. Regeln: shared/src/social.ts · Logik: server/src/social/* */
  social: {
    partyMax: 4,
    inviteSec: 30,            // so lange bleibt eine Einladung offen
    inviteCooldownSec: 8,     // nach Ablehnung oder Verfall: Pause, bevor derselbe Spieler dieselbe Person erneut einladen kann
    deadLeaderSec: 30,        // bleibt der Anführer so lange gefallen, geht die Führung an ein lebendes Mitglied
    seatSec: 300,             // wer die Verbindung ganz verliert, behält seinen Platz in der Gruppe so lange
    tradeRadius: 110,         // px – beide Handelspartner müssen so nah beieinander stehen
    tradeRequestSec: 20,      // so lange bleibt eine Handelsanfrage offen
    tradeRequestCooldownSec: 4,
    tradeSlots: 8,            // verschiedene Gegenstände je Seite
    tradeLockDelaySec: 1.5,   // nach jeder Änderung am Angebot: so lange kann niemand sperren (Schutz vor schnellem Umtauschen)
    tradeOpsPerSec: 20,
    goldCap: 999_999_999,     // mehr Gold nimmt ein Charakter im Handel nicht an
    shareSec: 30,             // so lange bleibt eine geteilte Quest zur Annahme offen
    shareCooldownSec: 4,
    inspectCooldownSec: 0.5,
    /** Gruppentruhe nach einem Dungeon- oder Riss-Boss: erscheint, wenn mindestens `min` Mitglieder derselben Gruppe dabei waren; Inhalt für jeden persönlich */
    groupChest: { min: 2, gold: [5, 8] as [number, number], gearMinRarity: 1, mats: [1, 2] as [number, number], potions: 2, fragments: 1 },
  },
  /**
   * Lebendige Welt (0.6): Ruf, Ereignisse, Weltbosse, seltene Monster, Schätze, Begegnungen, Tagesabläufe, Jahreszeiten.
   * Inhalte: shared/src/data/{factions,events,rares,routines,worlditems}.ts · Logik: server/src/world/*
   */
  living: {
    rep: {
      /** Rufpunkte, ab denen Rang 1..5 gilt */
      ranks: [0, 250, 800, 2000, 4200],
      /** Preisnachlass bei den Händlern der Region je Rang 1..5 */
      discount: [0, 0.04, 0.08, 0.12, 0.16],
      quest: { main: 120, side: 80, repeat: 35, group: 60 } as Record<string, number>,
      /** so viele Abschlüsse einer wiederholbaren Quest zählen beim Nachtragen für alte Spielstände */
      backfillRepeats: 8,
      /** Ruf je Beitragsstufe eines Ereignisses: –, Bronze, Silber, Gold */
      event: [0, 25, 40, 60],
      rare: 50, worldBoss: 120, encounter: 25, treasure: 30, trader: 10,
      /** Ruf je gespendetem Rohstoff (Erz/Kraut, Zutat, Monster-Rohstoff) */
      donate: { node: 2, ingredient: 2, monster: 3 },
      donateMax: 50,
    },
    season: { lengthSec: 1200 },   // vier Jahreszeiten = 80 Minuten
    events: {
      firstDelay: [240, 420],      // s nach dem ersten Besucher einer Zone
      gap: [420, 720],             // s zwischen zwei Ereignissen derselben Zone
      minPlayerDist: 320,          // so weit entfernt von allen Spielern beginnt ein Ereignis
      arriveSec: 300,              // so lange wartet ein Ereignis auf die ersten Teilnehmer
      fightSec: 240,               // Zeitlimit, sobald es läuft
      abandonSec: 90,              // leere Zone: Ereignis wird aufgeräumt
      nearRadius: 420,             // Umkreis, in dem Gruppenmitglieder und Helfer mitzählen
      /** Beitragsstufen: Anteil am fairen Anteil (1/Teilnehmer), ab dem Silber bzw. Gold gilt */
      tiers: [0.2, 0.6],
      /** Belohnung je Stufe (Bronze, Silber, Gold) als Faktor */
      tierMul: [0.5, 0.75, 1],
      gold: 7, xp: 10,             // × Gold/XP eines Gegners der Gebietsstufe (Messung: scripts/world-income.ts)
      mapChance: 0.1, scrollChance: 0.06,
      stars: { everySec: 8, lifeSec: 150, durSec: 170, bonusAt: 5 },
      trader: { durSec: 330 },
    },
    boss: {
      respawn: [2400, 3600],       // s zwischen zwei Auftritten desselben Weltbosses
      firstDelay: [600, 1200],
      despawnSec: 900,
      hpPerPlayer: 0.7,            // zusätzliches Leben je weiterem Teilnehmer
      radius: 520,
      gold: 30, xp: 30,
      aether: 0.35, scroll: 0.3, map: 0.25,
      essences: [4, 6],
      rarity: [0, 0, 55, 35, 10],
    },
    rare: {
      respawn: [900, 1800], firstDelay: [150, 480], despawnSec: 900,
      spawnDist: 260,              // nicht vor den Augen der Spieler erscheinen
      hintDist: 300,
      mats: [3, 5], essences: [2, 3], scroll: 0.25, map: 0.1, trophyRepeat: 0.25, gold: 3,
    },
    treasure: {
      spots: 24,                   // mögliche Grabstellen je Region
      radius: 34,                  // etwas größer als der Radius, in dem der Client „Hier graben“ anbietet
      gold: [10, 15],              // × Gold eines Gegners der Gebietsstufe
      rarity: [0, 0, 60, 32, 8],
      aether: 0.15, scroll: 0.2,
      eliteChance: 0.02,
      chest: { wood: 0, silver: 0.05, gold: 0.12 } as Record<string, number>,
    },
    encounter: {
      minRoad: 600,                // px auf Wegen, bevor wieder etwas passieren kann
      cooldown: [300, 540],
      chance: 0.5,                 // je Prüfung (alle 2 s), sobald alles andere stimmt
      lifeSec: 240,
      gold: 3, xp: 4,
      mapChance: 0.05,
    },
    routine: { speed: 30, segment: 48 },
    /** Echo-Fragmente (0.5) aus der Lebendigen Welt: nur bei Gegnern ab dieser Stufe (Welten der Neuen Kreise), sparsam */
    echo: { minLevel: 40, boss: 0.5, event: 0.12 },
  },
  /**
   * Zuhause (0.7): Hof, Lagertruhe, Begleiter, Sammlung, Erscheinungen.
   * Inhalte: shared/src/data/{home,pets,looks,collection}.ts · Logik: server/src/home/*
   */
  home: {
    price: 400,                    // Gold für den Hof (bei Mirelda)
    buyQuest: 'm_wurzel',          // ab dieser abgeschlossenen Hauptquest steht er zum Verkauf
    /** Lagerplätze und Trophäenständer je Ausbaustufe 0..3 */
    slots: [24, 48, 72, 96],
    stands: [2, 3, 4, 8],
    slotBonus: 12,                 // zusätzliche Lagerplätze je „Lager“-Meilenstein der Sammlung
    goldCap: 9_999_999,
    useRadius: 44,                 // so nah muss man an Truhe, Bett, Schrank oder Station stehen
    /** „Ausgeruht“: Bonus und Dauer (Spielzeit) nach dem Schlafen im eigenen oder einem besuchten Hof ab Stufe 3 */
    rest: { xpPct: 10, sec: 1800 },
    /** Bonus je ausgestellter Trophäen-Art (höchstens einmal je Art, gilt für alle Charaktere des Profils) */
    trophy: { jagd: { goldPct: 3 }, welt: { rep: 0.05 }, boss: { xpPct: 2 }, zeichen: { rest: 0.5 } },
    /** Bestiarium: Siege, ab denen Schwächen und Resistenzen bekannt sind (gewöhnliche Gegner / benannte und Bosse) */
    study: 8, studyNamed: 1,
  },
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
