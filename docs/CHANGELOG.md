# Changelog

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
