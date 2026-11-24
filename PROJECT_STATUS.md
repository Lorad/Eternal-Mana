# Projektstatus – Eternal Mana

Stand: Version 0.5.0 (Endspiel; Akt II der Geschichte; Handwerk & Elemente; Launcher mit automatischen Updates; Grafik-Neuaufbau abgeschlossen)

Bei jeder spürbaren Änderung: `PATCHNOTES.md` (zeigt der Launcher an) und die Version in `package.json` und
`shared/src/config.ts` pflegen. Der Launcher folgt dem Zweig aus `config/patcher.json`.

## Ausbau ab 0.3 (Roadmap: docs/ROADMAP.md)

| Version | Inhalt | Stand |
|---|---|---|
| 0.3 | Handwerk & Elemente: Rohstoffe, vier Stationen, 86 Rezepte, 6 Sets, 5 Legendäre Waffen, Runen, Resistenzen, 8 Reaktionen | **fertig** |
| 0.4 | Geschichte: Akt II (4 Kapitel + Epilog, 3 Enden), 47 Quests, Gesprächsbäume, 6 Entscheidungen, 25 Filmszenen, 49 Chronik-Dokumente, 3 Zonen, Bosse Vael und Aetherion | **fertig** |
| 0.5 | Endspiel: Mana-Risse (30 Stufen, 12 Modifikatoren, 7 Boss-Echos), Prüfung der Sieben, Quellstufen, Neuer Kreis | **fertig** |
| 0.6 | Lebendige Welt | in Arbeit |
| 0.7 | Gemeinsam & Zuhause | geplant |
| 0.8 | Feinschliff | geplant |

### Offene Punkte aus 0.3

- Lagerfeuer, Brunnen und Esse fehlen als Deko in den erzeugten Karten (`addDecor` lehnt Wegfelder ab); die Kochstellen
  setzt deshalb der Server als Objekte.
- Nicht im Spiel zu zweit erprobt: Reaktionen und Handwerk über echte Verbindungen (nur in Tests ohne Netzwerk).
- Legendäre Waffen von Magier, Schattenjäger und Paladin wirken im Einzelkampf schwach; Feinschliff in 0.8.

### Offene Punkte aus 0.4

- Kein Mensch hat Akt II bisher gespielt: Tempo, Erfahrungskurve und Schwierigkeit der Kapitel 7–10 sind berechnet, nicht
  erprobt. Ob die Muster von Vael und Aetherion ohne Unverwundbarkeit fair ausweichbar sind, ist ungeprüft.
- Vael als NPC ist ein eingefärbter Einsiedler und sieht anders aus als sein Boss-Sprite.
- Aetherion wechselt oft das Element (häufiges Aufblitzen). Ton und Animationen der Filmszenen nur in Standbildern geprüft.
- Koop nur mit zwei Test-Bots geprüft, nicht mit zwei echten Browsern.

### Offene Punkte aus 0.5

- Kein Mensch hat das Endspiel gespielt: Richtzeiten, die Kurve der Riss-Stufen und die Prüfung der Sieben sind berechnet.
- Nur zwei der zwölf Modifikatoren (Glutspur, Finsternis) wurden im Browser angesehen, die übrigen nur serverseitig getestet.
- Koop nur mit simulierten Spielern. Spieler in verschiedenen Kreisen sehen sich ohne Gruppe nicht (eigene Weltinstanzen);
  wer mit einem Kreis-0-Charakter gruppiert, spielt in dessen leichterer Welt.
- Riss-Stufen werden von der Gruppe getragen (ein Mitglied kann weit nach oben gezogen werden).
- Echo-Fragmente nutzen das Symbol der Quellsplitter; die Einfärbung der Echos ist bei manchen Bossen dezent.

## Starten und Testen

```bash
./start-server.sh        # Windows: start-server.bat  → http://localhost:7777
npm test                 # 31 Logik- und Server-Integrationstests
npm run test:e2e         # Browser-Durchlauf (Server muss laufen; benötigt Playwright)
npm run dev              # Entwicklung: Server + Vite mit Hot Reload (http://localhost:5173)
EM_DEV=1 npm start       # Entwickler-Chatbefehle: /lvl 20, /tp glut, /gold 5000, /gear 3, /god, /boss, /kill, /quests
```

Hilfsseiten für die Entwicklung (nur über `npm run dev`): `/preview-chars.html`, `/preview-mobs.html`, `/preview-bosses.html`,
`/preview-objects.html` (auch `…2`, `…3`), `/preview-fx.html`, `/preview-terrain.html?map=<zone>`, `/audio-preview.html`,
`/dev-game.html?server=localhost:7777` (Spielszene ohne Menüs). `npm run assets` exportiert alle Grafiken neu.
Dev-Befehle zusätzlich: `/time 0..1` (Tageszeit), `/weather <art>`.
`npx tsx scripts/mapdump.ts <zone>` gibt eine Karte als ASCII aus und validiert alle Zonen.

## Fertig

- **Grundlage:** Projektstruktur (client / server / shared), Vite + TypeScript, Phaser-3-Szene, Kamera, Bewegung mit
  Kollision, prozedurale Pixel-Art für alle Figuren, Gegner, Bosse, Objekte, Kacheln und Icons.
- **Gameplay:** Echtzeitkampf mit Kombos, Ausweichrolle, 30 aktiven und 15 passiven Fähigkeiten, Elementen, Zuständen,
  kritischen Treffern; 24 Gegnertypen, Elite-Gegner; Beute, Inventar, Ausrüstung, Verbesserung, Händler; Stufen,
  Attribute, Skilltree, Zurücksetzen.
- **Welt:** 6 Gebiete, 6 Dungeons, 6 Bosse mit je 3 Phasen; Quellsteine (Schnellreise), Truhen, Geheimnisse,
  Quellsplitter, Rohstoffe, Fallen, drei Rätseltypen, Schlüssel und Türen; 15 NPCs, 39 Quests, Story von Anfang bis Ende.
- **Multiplayer:** autoritativer Server, WebSockets, Gruppen bis 4, geteilte Kill-Wertung, individuelle Beute,
  Skalierung, Wiederbeleben, Wiederverbindung, Verbindungsanzeige, Chat, Tailscale-Erkennung.
- **Persistenz:** SQLite, 4 Charakterplätze, Autosave, manuelles Speichern, Prüfsummen, Snapshots, Backups, Reparatur.
- **Polish:** 10 Musikstücke, 66 Soundeffekte, Ambiente, Tag-Nacht, Beleuchtung, Wetter, Partikel, Schadenszahlen,
  Bildschirmwackeln; vollständige Menüs und HUD; Tastenbelegung, Gamepad, Vollbild, UI-Skalierung.
- **Qualität:** automatisierte Tests, Startskripte für Windows/Linux/macOS, Dokumentation.

## Grafik-Neuaufbau (0.2.0) – fertig

- Alle Figuren, Gegner, Bosse, Objekte, Effekte und das Gelände aller Biome und Dungeons neu; Asset-Pipeline mit Export.
- Details, Vergleichsbilder und Schwächen: `docs/VISUAL_QUALITY_REPORT.md`.

## In Arbeit

- Nichts Offenes.

## Bekannte Schwächen

- **Musik und Klang wurden nur messtechnisch geprüft** (Pegel, Fehlerfreiheit), nicht von einem Menschen abgehört.
  Lautstärkeverhältnisse und Klangfarben brauchen wahrscheinlich Feinschliff nach Gehör
  (`client/src/audio/sfx.ts` Tabelle `GAIN`, Spurlautstärken in `client/src/audio/tracks/`).
- **Balancing ist rechnerisch abgestimmt, nicht durch langes Spielen.** Ein Test hält die Werte in einem fairen
  Korridor; Feinheiten (Bossdauer, Goldfluss, Beuteraten) werden sich beim Spielen zeigen. Alle Werte: `shared/src/config.ts`.
- Keine Touch-Steuerung: Auf Telefonen/Tablets funktionieren die Menüs, zum Spielen braucht es Tastatur/Maus oder ein Gamepad.
- Gamepads benötigen in manchen Browsern eine „sichere“ Seite (localhost oder HTTPS, siehe docs/TAILSCALE_SETUP.md).
- **Animationen wurden nur als Einzelbilder geprüft, nie in Bewegung** – der Eindruck am Bildschirm ist unbestätigt.
- Grafik außerhalb des Grünwalds hatte weniger Überarbeitungsrunden; Liste der Schwächen im Qualitätsbericht.
- Charaktere hängen am Profil-Schlüssel des Browsers (kein Passwort-Login). Schlüssel sichern: Einstellungen → Profil.
- Gegner laufen durch NPCs und Spieler hindurch (kein Körperblock) – bewusst, damit niemand eingeklemmt wird.

## Als Nächstes sinnvoll

1. Spieltest-Runde zu zweit/dritt über Tailscale; Balancing, Lautstärken und Animationen in Bewegung beurteilen.
2. Touch-Steuerung (virtueller Stick + Aktionsknöpfe).
3. Mehr Abwechslung im Endgame: zufällige Dungeon-Seeds („Tiefen der Quelle“), Set-Gegenstände, zweite Fähigkeiten-Seite.
4. Handel und Gegenstandstausch zwischen Spielern.
5. Mehr Bewegungsphasen bei Bossen und zusätzliche Rätseltypen (Schiebeblöcke, Spiegel).
6. Sprachumschaltung (Texte liegen bereits gesammelt in `shared/src/data/`).
