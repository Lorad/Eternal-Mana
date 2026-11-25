# Projektstatus – Eternal Mana

Stand: Version 0.8.0 (Feinschliff; Gemeinsam; Zuhause; Lebendige Welt; Endspiel; Akt II der Geschichte; Handwerk & Elemente; Launcher mit automatischen Updates; Grafik-Neuaufbau abgeschlossen)

Bei jeder spürbaren Änderung: `PATCHNOTES.md` (zeigt der Launcher an) und die Version in `package.json` und
`shared/src/config.ts` pflegen. Der Launcher folgt dem Zweig aus `config/patcher.json`.

## Ausbau ab 0.3 (Roadmap: docs/ROADMAP.md)

| Version | Inhalt | Stand |
|---|---|---|
| 0.3 | Handwerk & Elemente: Rohstoffe, vier Stationen, 86 Rezepte, 6 Sets, 5 Legendäre Waffen, Runen, Resistenzen, 8 Reaktionen | **fertig** |
| 0.4 | Geschichte: Akt II (4 Kapitel + Epilog, 3 Enden), 47 Quests, Gesprächsbäume, 6 Entscheidungen, 25 Filmszenen, 49 Chronik-Dokumente, 3 Zonen, Bosse Vael und Aetherion | **fertig** |
| 0.5 | Endspiel: Mana-Risse (30 Stufen, 12 Modifikatoren, 7 Boss-Echos), Prüfung der Sieben, Quellstufen, Neuer Kreis | **fertig** |
| 0.6 | Lebendige Welt: Ruf (6 Fraktionen), 6 Ereignisarten, 3 Weltbosse, 12 seltene Monster, Schatzkarten, 4 Begegnungen, Tagesabläufe, Jahreszeiten | **fertig** |
| 0.7 | Zuhause (Hof mit Lagertruhe und drei Ausbaustufen, 30 Trophäen, 8 Begleiter, Sammlung, Erscheinungen) und Gemeinsam (Gruppenverwaltung, Handel, Quest teilen, Gruppentruhe, Ansehen) | **fertig** |
| 0.8 | Feinschliff: Spieltest mit Spielermodell und Abstimmung aller Zahlen, Balance-Wächter, Handbuch, Hinweise, aufgeräumtes HUD, Gamepad in allen Fenstern, „Blitze reduzieren“, Echtzeit-Bewegung bei wenig Bildern, fehlende Grafik, Dokumentation | **fertig** |

### Offene Punkte nach 0.8

Alle Inhalte der Roadmap sind umgesetzt. Was bleibt, betrifft vor allem das, was nur Menschen beurteilen können:

- **Gespielt hat es noch niemand.** Seit 0.8 misst ein Spieltest mit Spielermodell die ganze Reise (Bosse, Dungeons, Tempo,
  Risse, Weltinhalte; `scripts/playtest.ts`, Ergebnisse in `docs/GAME_DESIGN.md` → Balance). Gefühl, Lesbarkeit der Muster,
  Ton und Animationen in Bewegung beurteilt er nicht.
- **Koop** wurde mit genau zwei echten Browsern auf einem Rechner geprüft, nicht mit mehr Spielern und nicht über Tailscale
  mit echter Verzögerung. Gruppen überleben keinen Server-Neustart; fallen alle Mitglieder länger als 90 Sekunden aus, kann ein
  laufender Riss weg sein.
- **Kreise:** Spieler in verschiedenen Kreisen sehen sich ohne Gruppe nicht (eigene Weltinstanzen); wer mit einem
  Kreis-0-Charakter gruppiert, spielt in dessen leichterer Welt. Riss-Stufen werden von der Gruppe getragen.
- **Welt:** NPCs und Begleiter laufen ohne Kollision; seltene Monster können unter Baumkronen stehen. Die Jahreszeiten-Uhr
  läuft nur, während der Server läuft. Lagerfeuer, Brunnen und Esse fehlen als Deko in den erzeugten Karten (die Kochstellen
  setzt der Server als Objekte).
- **Nicht im Browser gesehen:** Stolleneinsturz, Aschesturm, Schneesturmjagd, Geleit, Duell, Graben, die meisten
  Riss-Modifikatoren, alles in einem Kreis ab 1.
- Die Einfärbung der Boss-Echos ist bei manchen Bossen dezent. Waffenglanz färbt nicht die Trefferfunken am Ziel.
- Die Gruppentruhe gibt es bei jedem Bosssieg ohne Abschlag für Wiederholungen. Ansehen geht serverweit, ohne Nähe.
- Springt nach beschädigter Prüfsumme ein Truhen-Snapshot ein (bis 5 Minuten alt), können Truhe und Charakter auseinanderliegen.
- Die Klassen liegen im Schaden bei mindestens 60 % der stärksten (Ziel war zwei Drittel).

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
- **Balancing ist mit einem Spielermodell gemessen, nicht durch langes Spielen.** `tests/balance.test.ts` hält die wichtigsten
  Werte in ihrem Korridor; Feinheiten werden sich beim Spielen zeigen. Alle Werte: `shared/src/config.ts`.
- Keine Touch-Steuerung: Auf Telefonen/Tablets funktionieren die Menüs, zum Spielen braucht es Tastatur/Maus oder ein Gamepad.
- Gamepads benötigen in manchen Browsern eine „sichere“ Seite (localhost oder HTTPS, siehe docs/TAILSCALE_SETUP.md).
- **Animationen wurden nur als Einzelbilder geprüft, nie in Bewegung** – der Eindruck am Bildschirm ist unbestätigt.
- Grafik außerhalb des Grünwalds hatte weniger Überarbeitungsrunden; Liste der Schwächen im Qualitätsbericht.
- Charaktere hängen am Profil-Schlüssel des Browsers (kein Passwort-Login). Schlüssel sichern: Einstellungen → Profil.
- Gegner laufen durch NPCs und Spieler hindurch (kein Körperblock) – bewusst, damit niemand eingeklemmt wird.

## Als Nächstes sinnvoll

1. Spieltest-Runde zu zweit oder dritt über Tailscale: Schwierigkeit, Tempo, Lautstärken und Animationen in Bewegung beurteilen.
2. Touch-Steuerung (virtueller Stick und Aktionsknöpfe).
3. Mehr Bewegungsphasen bei Bossen und zusätzliche Rätseltypen (Schiebeblöcke, Spiegel).
4. Sprachumschaltung (Texte liegen gesammelt in `shared/src/data/`).
