# Changelog

## 0.12.1 – Verkaufsfeld

- Neue Nachricht `sellMany` (`server/src/game.ts`): prüft alle Kennungen, verkauft in einem Zug, speichert sofort; Quest-
  gegenstände, fremde und doppelte Kennungen zählen nicht. Verkaufsfeld mit HTML5-Drag-and-Drop in
  `client/src/ui/panels/inventory.tsx` (`ItemSlot drag`, `ITEM_DRAG`). Tests `tests/inventory.test.ts`, Browser-Durchlauf
  `tests/e2e/verkauf.mjs` (in einer Expedition, 1280×720 und 600×900).

## 0.12.0 – Ausrüstungswert

- `shared/src/gearscore.ts`: eine Formel für Gegenstand und Charakter (Platzgewicht × (Stufe + 2) × (Seltenheit × Verbesserung
  + 0,2 × Eigenschafts-Einheiten)); `shared/src/data/gsreq.ts`: Messpunkte `GS_REF`, Stufen, Empfehlungen und Mindestwerte je
  Expedition/Grad/Tiefe/Riss, allgemeine Deklaration `GsReqDecl` (auch für künftige Raids), gemeinsame Belohnungsrechnung.
  Dokumentation `docs/GEAR_SCORE.md`, Kalibrierung `scripts/gearscore-calib.ts`, Wächter in `tests/balance.test.ts`.
- Server berechnet den Wert (`Player.gs`, in `recalc()`), verschickt ihn nur in Gruppe, Ansehen, Online-Liste, Gesuchen und
  Lobby; nie aus dem Client übernommen. Warnung statt Sperre bei zu niedrigem Wert.
- Oberfläche: Puppe, Charakterbogen, Tooltips mit Vergleich, Schmiede, Portal, Riss-Stein, Weltkarte, Gruppenrahmen,
  Gruppenfenster, Ansehen, Bereitschaftsprüfung, Gruppenbereich und Trophäenhalle. Tests `tests/gearscore.test.ts`,
  Browser-Durchlauf `tests/e2e/ausruestungswert.mjs`.

## 0.11.3 – Expeditionen nur über die Quellwarte

- `server/src/expedition/hub.ts`: mit Quellwarte kein Portal in Quellhain. `Expedition.useExit`/`entry`: Dungeon-Eingänge
  der Oberwelt führen wieder in die Dungeons der Region; ein Spielstand dort bleibt dort (Umleitung aus 0.9 entfernt,
  `dressExits` entfällt).
- Hinterhalt (`tickAmbush`/`finishAmbush`): Abbruch nur, wenn niemand lebend im Abschnitt samt Türrand ist (vorher zählte der
  äußerste Ring als draußen → Neustart nach der letzten Welle); nach der letzten Welle sofort vorbei; Rastplatz mit eigenem
  Wiederbelebungspunkt (`props.spot`).
- `shared/src/maps/expedition.ts`: keine `stairs_down`-Deko mehr in Treppen-Übergängen.

## 0.11.2 – Questzeichen in Farbe

- `npcMark` (`shared/src/data/quests.ts`) liefert Art (abgeben/Angebot/laufend) und Farbe (Haupt/Neben/wiederholbar);
  Vorrang Abgeben > Angebot > laufend, innerhalb gleicher Art Haupt > Neben > wiederholbar. Neue Marker-Frames
  `exclaim_side|repeat`, `question_side|repeat`; Karte, Minikarte, Gesprächsoptionen und Questverfolgung färben mit.

## 0.11.1 – Zwischenspeicher der Grafiken

- `tools/export-assets.ts` hängt jeder Datei im Manifest eine Inhaltskennung an (`?v=<sha1>`); der Server
  (`server/src/index.ts`) speichert nur noch Adressen mit Kennung oder Vite-Hash lange zwischen, alles andere mit ETag und
  `no-cache` (304 bei unverändert). Vorher galt `/assets/*` ein Jahr lang als unveränderlich – nach einem Update blieb der alte
  Symbol-Atlas im Browser, und neue Gegenstände fielen auf `item_gem` zurück.
- `iconKey` prüft, ob ein Icon im geladenen Atlas liegt (`hasIcon`), und nimmt sonst ein verwandtes Icon; Ersatz in der
  Schmiede ist die Schriftrolle statt des Edelsteins.

## 0.11.0 – Endspiel der Expeditionen (Meilensteine 0.10 und 0.11)

- Browser-Durchläufe aller Expeditionen (`tests/e2e/expeditionen.mjs`, `expeditionen-spaet.mjs`, `expedition-grade.mjs`,
  gemeinsamer Code in `tests/e2e/lib/`); Korrekturen an Kristallkoloss (`EchoMech.charged`, Säulen, Ansturm vor Wänden),
  wanderndem Licht, Belohnungsstufe auf hohen Graden, Zusatztruhen, Ereignistexten, Lichtsteinen, Einsturzlinie und
  Namensschildern (`GameScene.declutterMobLabels`). Dev-Befehle `/expfrei spuren`, `/expwut`, `/mythisch`.
- Lastprobe `scripts/load-check.ts --exp`: vier Spieler in einer Expedition, 0,8 ms je Takt.
- Endspiel-Expeditionen (`shared/src/data/expeditions_endgame.ts`): Die Lange Wacht (Vael, Wachfeuer), Das Atmende Herz
  (Aetherion, Wiegenlied); Tiefen 1–20 mit wöchentlichen Modifikatoren; serverweite Bestenliste (Tabelle `meta`).
  Browser-Durchlauf `tests/e2e/lange-wacht.mjs`.
- Balance über die neue Länge (`docs/GAME_DESIGN.md`, Balance 0.11): Erfahrung und Gold der Expeditionen, Tempo-Test über die
  Expeditionen, `borinGift` mit Stufe/Seltenheit/Verbesserung der alten Teile (`ItemInstance.gift`, nicht umschmiedbar),
  Heiler heilen keine Heiler.

## 0.9.0 – Quellwarte und Expeditionen

- Hub `quellwarte` (`shared/src/maps/hubgen.ts`, `server/src/hub/`, `shared/src/data/hubdata.ts`, `client/src/ui/hub.tsx`):
  eine Instanz für alle, neun Einrichtungen mit serverseitig geprüften Aktionen, Händler mit Tages-/Wochenware,
  Meisterränge (`CFG.hub.mastery`), Lagerhaus-Regale (`HomeData.rows`), Gasthaus mit vier Stammgästen, fünf Aufträgen und
  38 Gerüchten, Trophäenhalle, Gruppengesuche. Neue Hauptquest `m_quellwarte`. Lasttest `scripts/load-check.ts --hub`.
- Expeditionen (`server/src/expedition/*`, `shared/src/data/expeditions.ts`, `shared/src/maps/expedition.ts`,
  `client/src/ui/expedition.tsx`): deterministischer Abschnitts-Generator mit `validateExpedition`, sieben Expeditionen
  (eine geheim), Ereignisse, Mini-Bosse, Bossmechaniken (`bossmech.ts`), vier Schwierigkeitsgrade, Freischaltungen,
  Wochen-Herausforderung, Bereitschaftsprüfung, Instanzen je Gruppe, Wiederverbinden, Abschluss genau einmal je Lauf
  (`CharData.expRuns`, `CharData.expeditions`), gemeinsame Rückkehr. Belohnungen bei vollem Rucksack in die Lagertruhe.
  Dauer gemessen mit `scripts/exp-playtest.ts`.
- Ausrüstung (`shared/src/equip.ts`, `shared/src/rarity.ts`, `server/src/gearfx.ts`, `shared/src/data/upgrade.ts`): zehn Plätze,
  Überführung alter Stände (`migrateEquip`, `CharData.eqv = 2`), Budget je Platz (`GEAR_BUDGET`), Seltenheit Mythisch,
  Verbessern +0…+10 ohne Fehlschlag mit Boni bei +3/+6/+9 und Passiven bei +10, Sets mit 2/4/6 Teilen, Puppe im Inventar.
- Grafik: Quellwarte-Biom, Fassaden, Requisiten und Hub-NPCs, Expeditionsobjekte, Icons der neuen Plätze.
- HUD: Expeditionsanzeige in der rechten Spalte; die Questverfolgung klappt in Expeditionen ein.
- Tests: `tests/hub.test.ts`, `tests/expedition.test.ts`, `tests/equipment.test.ts`; Browser-Durchläufe `hub` und `expedition`.

## 0.8.0 – Feinschliff

- Spieltest mit Spielermodell (`scripts/playtest.ts`, `scripts/playtest/*`): drei Spielertypen, ganze Dungeon- und
  Riss-Durchläufe, Bosse allein und zu zweit, Tempo, Wirtschaft, Stärkequellen, Weltinhalte. Abstimmung von Gegnerwerten,
  Bossen, Fähigkeiten, Legendären Waffen, Rissen und Neuem Kreis; Deckel für Heilung und Lebensraub; Schonfrist nach
  Geschosstreffern. Wächter-Tests `tests/balance.test.ts`, Balance-Abschnitt in `docs/GAME_DESIGN.md`.
- Handbuch (aus Spieldaten erzeugt), Hinweise beim ersten Kontakt, HUD-Rangfolge, einheitliche Fensterköpfe, Gamepad in allen
  Fenstern, „Blitze reduzieren“, Leistungsanzeige, Fehlerwege bei Verbindungsverlust.
- Eigene Bewegung in Echtzeit auch unter 20 Bildern pro Sekunde.
- `npm run test:e2e:all`: alle Browser-Durchläufe mit je eigenem Server; neue Durchläufe `erste-schritte` und `fenster`;
  Leistungsmessung im Browser (`scripts/perf-browser.mjs`).
- Grafik: 30 Trophäen-Miniaturen, Hof-Objekte, Symbole, überarbeitete Begleiter, Gewänder und Objekte.
- Dokumentation auf dem Stand 0.3–0.8.

## 0.7.1 – Gemeinsam

- Gruppenverwaltung ausgelagert nach `server/src/social/party.ts`: Anführer, Ernennen, Entfernen, Auflösen, Einladungsfrist,
  Führungswechsel, freigehaltener Platz nach Verbindungsabriss; Regeln für Risse, Kreise und Höfe.
- Handel (`server/src/social/trade.ts`): Anfrage, Angebot, Sperren, Bestätigen; atomarer Tausch mit sofortigem Speichern beider
  Charaktere in einer Transaktion (`Db.saveChars`), gebundene Gegenstände.
- Quest teilen, Gruppentruhe nach Dungeon- und Riss-Bossen, Spieler ansehen, „Hinreisen“.
- Erstmals mit zwei echten Browsern geprüft: `tests/e2e/coop.mjs` (15 Schritte: Gruppe, Handel, Quest teilen, Reaktion zu zweit,
  Riss, Verbindungsabriss, Gruppentruhe, Mana-Woge, Hofbesuch). Lastprobe `scripts/load-check.ts` (12 Bots: Takt im Mittel
  unter 1 ms, p95 rund 2 ms).
- Tests: 28 neue in `tests/social.test.ts`.

## 0.7.0 – Zuhause

- Hof am Waldrand als eigene Instanz je Profil (`heim:<Konto>`, `server/src/home/*`, `shared/src/maps/homegen.ts`), Kauf bei
  Mirelda, drei Ausbaustufen mit Sperren über Ruf und Riss-Fortschritt.
- Lagertruhe je Profil in eigener Tabelle; Charakter und Truhe werden in einer Transaktion gespeichert.
- 30 ausstellbare Trophäen, acht Begleiter (clientseitig mitlaufend, `client/src/game/pets.ts`), Sammlung mit sieben Bereichen
  und elf Meilensteinen, Erscheinungen (fünf Gewänder je Klasse über nachgeladene Sheets, neun Farben Waffenglanz).
- Grafik: 25 Gewand-Sheets, NPC-Aussehen für Vael, 40 Symbole für Gegenstände aus 0.5/0.6.
- Tests: 29 neue in `tests/home.test.ts`; Browser-Durchlauf `tests/e2e/zuhause.mjs`.

## 0.6.0 – Lebendige Welt

- Ruf bei sechs Fraktionen mit fünf Rängen (`shared/src/data/factions.ts`), Rückrechnung für alte Spielstände, rangabhängige
  Vorräte, Nachlässe, Titel; Fenster „Ruf und Welt“.
- Ereignis-Rahmen je Oberwelt-Instanz (`server/src/world/*`): Mana-Woge, Sternenregen, Fahrende Händlerin, drei regionale
  Ereignisse, drei Weltbosse; Beitragsstufen und persönliche Belohnungen.
- Zwölf seltene Monster mit Bedingungen (Nacht, Wetter, Jahreszeit) und Trophäen; Schatzkarten mit serverseitig geprüftem
  Graben; vier Begegnungstypen unterwegs.
- Tagesabläufe für 14 NPCs; Jahreszeiten auf gespeicherter Serveruhr mit Wirkung auf Wetter, Licht, Abbaustellen und Ereignisse.
- Zusammenspiel mit 0.5: alles läuft je Weltinstanz (Kreis), nie in Rissen; Ruf, Titel und Trophäen überdauern den Neuen Kreis.
- Tests: 36 neue in `tests/world.test.ts`; Browser-Durchlauf `tests/e2e/welt.mjs`; Einkommensmessung `scripts/world-income.ts`.

## 0.5.0 – Endspiel

- Mana-Risse: instanzierte Dungeonläufe in 30 Stufen (`server/src/rift.ts`, `shared/src/data/rifts.ts`), zwölf Modifikatoren,
  Richtzeit, Lebensfunken, Beute über Gegenstandsstufe 40 (bis 70).
- Boss-Echos mit je einer zusätzlichen Mechanik (`server/src/echo.ts`); Prüfung der Sieben als Bossfolge.
- Quellstufen (60 Stufen, sechs Pfade), Echo-Fragmente mit Verwendung (Angleichen, Echo-Runen, Ätherstaub).
- Neuer Kreis (`server/src/endgame.ts`): bis zu drei härtere Durchgänge, eigene Weltinstanz je Kreis (`Zone.key` = `id#kN`),
  Gruppen spielen im niedrigsten Kreis.
- Oberfläche: Endspiel-Fenster, Riss-Anzeige, Angleichen-Reiter in der Schmiede.
- Tests: 40 neue in `tests/endgame.test.ts`; Browser-Durchlauf `tests/e2e/endgame.mjs`; Simulation `scripts/rift-sim.ts`.

## 0.4.0 – Akt II: Das falsche Lied

- Story-Engine: Gesprächsbäume mit serverseitig geprüfter Auswahl, Entscheidungen in `flags` (`d:`), Bedingungen
  (`shared/src/data/cond.ts`), neue Zieltypen, Geheimquests, Kapitel (`server/src/story.ts`, `shared/src/data/story.ts`).
- Inhalte: 47 neue Quests (14 Haupt-, 6 Schrein-, 22 Charakter-, 5 Geheimquests), 33 Gesprächsthemen, 6 Entscheidungen,
  25 Filmszenen, 49 Chronik-Dokumente (`quests_akt2.ts`, `dialoge.ts`, `chronik.ts`, `npcs_akt2.ts`).
- Filmszenen-Sequenzer im Client (`client/src/game/cinematic.ts`) mit Schutz des Zuschauers auf dem Server.
- Drei neue Zonen (`wacht`, `quellgrund`, `herz`), 12 Gegner mit wiederverwendeten Sprites (Sprite-/Farbüberschreibung),
  Story-Bosse `vael` (wird verschont) und `aetherion`; Story-Objekte über `shared/src/maps/storygen.ts`.
- Tests: `tests/story.test.ts` (Datenkonsistenz, Auswahlprüfung, Durchlauf Kapitel 7 bis Epilog, alter Spielstand).

## 0.3.0 – Handwerk und Elemente

- Handwerk an vier Stationen (Schmiede, Alchemie, Kochen, Verzauberung), 86 Rezepte, 13 davon über Rezeptrollen; alles
  serverseitig geprüft (`server/src/craft.ts`, Daten in `shared/src/data/{materials,recipes,sets}.ts`).
- 25 neue Rohstoffe (Monster-Rohstoffe, Zutaten, Essenzen, Bosskerne, Ätherstaub), eingebunden in Beute, Truhen und Sammelstellen.
- Umschmieden, Element einschmieden (drei Stufen), 17 Runen, 6 Rüstungssets (2er-/4er-Bonus), 5 Legendäre Waffen mit Wirkung.
- Elemente: Resistenzen für Spieler, Schwächen/Resistenzen für Gegner und Bosse, neue Zustände (Entblößt, Verwurzelt, Gefroren),
  acht Reaktionen mit Bonus bei zwei Spielern (`server/src/react.ts`, `shared/src/elements.ts`).
- Speisen und Elixiere als zeitliche Stärkungen, die Speichern und Tod überdauern.
- Neue Objekt-Grafiken (Hüterschrein, Chronik-Dokumente, Riss-Stein, Stationen, Hausmöbel, Ereignis-Objekte) und die
  Boss-Sprites Vael und Aetherion für kommende Versionen.
- Tests: 51 neue (Handwerk, Elemente) ohne Netzwerk über `tests/helpers/sim.ts`; Balance-Vergleich `scripts/balance-sim.ts`.

## 0.2.1 – Launcher, Kamera und Licht

- Launcher (`Eternal-Mana.bat`, `eternal-mana.sh`, Quellcode in `launcher/`): eigenes Fenster im Stil des Spiels mit
  Fortschrittsbalken, Patch Notes (`PATCHNOTES.md`), „Spiel starten“ und „Server starten“.
- Automatische Aktualisierung: Abgleich mit GitHub Datei für Datei über Git-Prüfsummen, nur Geändertes wird geladen;
  danach bei Bedarf `npm install` und Client-Build. Der Launcher aktualisiert sich dabei auch selbst.
- Kamera ohne Kartengrenzen: die Spielfigur bleibt überall in der Bildmitte; weicher Übergang ins Dunkel am Kartenrand.
- Lichtkreise mit stufenlosem Verlauf statt harter Bänder.
- Behoben: `shared/src/data/` fehlte im Repository (zu breite `.gitignore`-Regel).

## 0.2.0 – Grafik-Neuaufbau

- Neuer Stil nach Art-Bible: dichter, vielschichtiger Boden ohne Rasterwiederholung, große Vegetation, kleine Figur in großer Welt.
- Gelände aller sechs Biome und aller sechs Dungeons neu (eigener Maler je Biom, zweistöckige Wandfronten, Uferböschungen,
  raumbezogene Bodenmuster, 8-Frame-Flüssigkeiten).
- Alle 20 Figuren neu (32×40) mit zehn Animationen in drei Blickrichtungen; alle 25 Gegner (22 Frames, eigene Todesanimationen)
  und alle 6 Bosse (26 Frames, 96–128 px) neu.
- Neue Objekte für alle Biome, Dorf, Lager und Dungeons; wiegende Bäume, Gras und Korn; Kleintiere je Biom.
- 90 handanimierte Effekte (Waffenspuren je Klasse, Treffer, Geschosse und Explosionen je Element, Zauber, Zustände, Wetter).
- Engine: dynamische Schlagschatten, farbige Lichtkarte mit Tagesverlauf, Wolken- und Blätterschatten, Nebel, Lichtstrahlen,
  Kronen blenden aus, Fußspuren, Treffer-Stopps; ganzzahliger Zoom mit größerem Sichtfeld.
- Welt: Bach mit Brücken, Kornfelder, Uferbewuchs, Mauerreste im Grünwald; biomtypische Lager; reichere Dungeon-Ausstattung.
- Asset-Pipeline: Export als PNG-Sheets/Atlanten mit Aseprite- bzw. TexturePacker-JSON, Tiled-Karten, Asset-Katalog.
- Browser-Durchlauftest (`npm run test:e2e`), Dev-Befehle `/time` und `/weather`.

## 0.1.0 – Erste spielbare Version

- Sechs Gebiete (Grünwald, Kristallhöhlen, Glutlande, Frostgebirge, Verlorene Ruinen, Schattenreich) und sechs Dungeons
  mit Schlüssel-, Fallen-, Rätsel- und Geheimräumen.
- Fünf Klassen mit je neun Fähigkeiten, Skilltree, Attributen, Ausweichrolle, Elementsystem und Zuständen.
- 24 Gegnertypen mit sieben Verhaltensmustern, Elite-Gegner, sechs Bosse mit je drei Phasen.
- Beute mit fünf Seltenheitsstufen und Affixen, Boss-Unikate, Händler, Ausrüstungsverbesserung, Rohstoffe.
- 39 Quests (Haupt-, Neben-, wiederholbare und Gruppenquests), 15 NPCs, Story-Einblendungen, Inschriften.
- Autoritativer Server mit WebSockets, Koop für Gruppen bis vier Spieler, Tailscale-Erkennung, Wiederverbindung.
- SQLite-Spielstände mit automatischem Speichern, Prüfsummen, Snapshots und Backups; vier Charakterplätze je Profil.
- Prozedural erzeugte Pixel-Art, zehn Musikstücke, 66 Soundeffekte, acht Ambiente-Kulissen.
- Tag-Nacht-Zyklus, Beleuchtung, Wetter je Gebiet, Minimap, Weltkarte mit Schnellreise.
- Tastatur/Maus mit frei belegbaren Tasten, Gamepad-Unterstützung, Vollbild, skalierbare Oberfläche.
- Startskripte für Windows, Linux und macOS; automatisierte Tests.
