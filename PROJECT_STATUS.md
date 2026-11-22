# Projektstatus – Eternal Mana

Stand: Version 0.2.1 (Launcher mit automatischen Updates; Grafik-Neuaufbau abgeschlossen; Spielumfang wie 0.1.0)

Bei jeder spürbaren Änderung: `PATCHNOTES.md` (zeigt der Launcher an) und die Version in `package.json` und
`shared/src/config.ts` pflegen. Der Launcher folgt dem Zweig aus `config/patcher.json`.

## Ausbau ab 0.3 (Roadmap: docs/ROADMAP.md)

| Version | Inhalt | Stand |
|---|---|---|
| 0.3 | Geschichte: Akt II, Dialoge mit Entscheidungen, Filmszenen, Chronik, Story-Bosse | in Arbeit |
| 0.4 | Handwerk & Elemente | in Arbeit |
| 0.5 | Endspiel | geplant |
| 0.6 | Lebendige Welt | geplant |
| 0.7 | Gemeinsam & Zuhause | geplant |
| 0.8 | Feinschliff | geplant |

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
