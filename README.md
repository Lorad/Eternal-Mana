# Eternal Mana

Ein eigenständiges Fantasy-Action-RPG für den Browser: Pixel-Art, Echtzeitkampf mit Ausweichrolle und Element-Reaktionen,
eine Geschichte in zwei Akten mit Entscheidungen und drei Enden, Handwerk an vier Stationen, ein Endspiel aus Mana-Rissen,
eine Welt mit Ruf, Ereignissen und Jahreszeiten, ein eigener Hof mit Lagertruhe, Begleitern und Sammlung – allein oder zu
viert im Koop über ein privates Tailscale-Netz.

Alle Grafiken sind eigene Pixel-Art (aus Zeichenprogrammen exportierte Sprite-Sheets und Atlanten), Musik und Klänge werden
im Browser synthetisiert – das Projekt enthält keine fremden Assets und braucht nach der Installation kein Internet.

## Schnellstart

Voraussetzung: [Node.js 22.13 oder neuer](https://nodejs.org/).

**Am einfachsten: der Launcher.** `Eternal-Mana.bat` doppelklicken (Linux/macOS: `./eternal-mana.sh`). Er sucht nach
Aktualisierungen, lädt nur die geänderten Dateien, bereitet das Spiel vor und zeigt die Neuigkeiten. Mit „Spiel starten“ und
„Server starten“ geht es von dort weiter – ganz ohne Konsolenfenster. Unter Windows legt er eine Verknüpfung „Eternal Mana“ an.

Ohne Launcher geht es mit den Skripten:

| | Windows | Linux / macOS |
|---|---|---|
| Server starten | `start-server.bat` doppelklicken | `./start-server.sh` |
| Spiel öffnen | `start-client.bat` | `./start-client.sh` |
| Server beenden | `stop-server.bat` (oder `stop` im Serverfenster, Strg+C) | `./stop-server.sh` |

Beim ersten Start werden Abhängigkeiten installiert und der Client gebaut (ein bis zwei Minuten). Danach zeigt das
Serverfenster die Adressen an, unter denen das Spiel erreichbar ist – auf dem eigenen Rechner `http://localhost:7777`.

**Einzelspieler** ist einfach ein Server, auf dem nur du spielst. **Mit Freunden** spielen: siehe
[docs/MULTIPLAYER.md](docs/MULTIPLAYER.md) und [docs/TAILSCALE_SETUP.md](docs/TAILSCALE_SETUP.md).

## Im Spiel zurechtfinden

- **Handbuch** (Taste H oder F1, im Menü und schon im Hauptmenü): jedes System auf einer Seite, mit den Zahlen, mit denen das
  Spiel wirklich rechnet.
- **Hinweise** erscheinen, wenn etwas zum ersten Mal wichtig wird – einmal je Profil, wegklickbar, abschaltbar.
- **Einstellungen:** Lautstärke, Größe der Oberfläche, Tastenbelegung, Beleuchtung und Wetter, „Blitze reduzieren“,
  Leistungsanzeige (F3).

## Steuerung (Standard, im Spiel änderbar)

| Aktion | Tastatur / Maus | Gamepad |
|---|---|---|
| Bewegen | WASD / Pfeiltasten | Linker Stick |
| Zielen | Maus | Rechter Stick (sonst automatisch) |
| Angriff (halten = Dauerangriff) | Linke Maustaste / J | X |
| Ausweichrolle (kurz unverwundbar) | Leertaste | B |
| Fähigkeiten 1–4 | 1–4 (1 auch rechte Maustaste) | Y, LB, RB, RT |
| Heiltrank / Manatrank | Q / R | LT / R3 |
| Interagieren | E | A |
| Inventar, Charakter, Fähigkeiten, Questlog, Weltkarte | I, C, K, L, M | Back, Steuerkreuz ←, →, ↓, ↑ |
| Gruppe, Ruf und Welt, Sammlung, Handbuch | P, U, B, H (auch F1) | über das Menü (Start) |
| Questverfolgung ein-/ausklappen, Leistungsanzeige | T, F3 | – |
| Chat (`/p Text` = Gruppenchat) | Enter | – |
| Menü / oberstes Fenster schließen | Esc | Start / B |

In Fenstern wählt das Gamepad mit Stick oder Steuerkreuz aus, A bestätigt, B schließt. Was das Gamepad nicht kann (Chat,
Namen eingeben, Tasten neu belegen), steht im Handbuch unter „Gamepad“.

## Dokumentation

- [docs/INSTALLATION.md](docs/INSTALLATION.md) – Installation, Start, Aktualisieren, Sichern, Fehlerbehebung
- [docs/MULTIPLAYER.md](docs/MULTIPLAYER.md) – gemeinsam spielen: Gruppe, Handel, Höfe, Wiederverbindung
- [docs/TAILSCALE_SETUP.md](docs/TAILSCALE_SETUP.md) – Tailscale Schritt für Schritt, ACLs, Firewall
- [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) – Überblick über alle Systeme: Geschichte, Welt, Kampf, Handwerk, Endspiel, Zuhause
- [docs/TECHNICAL_ARCHITECTURE.md](docs/TECHNICAL_ARCHITECTURE.md) – Aufbau, Protokoll, Architekturentscheidungen, Tests, Messwerkzeuge
- [docs/ROADMAP.md](docs/ROADMAP.md) – Leitlinie des Ausbaus (enthält die ganze Handlung)
- [docs/ART_BIBLE.md](docs/ART_BIBLE.md) – Stilregeln · [docs/ASSET_PIPELINE.md](docs/ASSET_PIPELINE.md) · [docs/ASSETS.md](docs/ASSETS.md) – Katalog
- [docs/VISUAL_QUALITY_REPORT.md](docs/VISUAL_QUALITY_REPORT.md) – Qualitätsbericht zum Grafik-Neuaufbau
- [PATCHNOTES.md](PATCHNOTES.md) (zeigt der Launcher) · [docs/CHANGELOG.md](docs/CHANGELOG.md) · [PROJECT_STATUS.md](PROJECT_STATUS.md)

## Für Entwickler

```bash
npm install
npm run dev            # Server (7777, automatischer Neustart) + Vite-Client (5173, Hot Reload)
npm test               # Logik- und Server-Integrationstests (vitest)
npm run typecheck
npm run build          # Client nach client/dist bauen (macht das Startskript bei Bedarf selbst)
npm run test:e2e:all   # alle Browser-Durchläufe; startet je Durchlauf einen eigenen Server (braucht Playwright)
npm run test:e2e       # nur der kurze Durchlauf gegen einen laufenden Server
npm run assets         # Grafiken neu exportieren (Sprite-Sheets, Atlanten, Katalog, Tiled-Karten)
EM_DEV=1 npm start     # Server mit Entwickler-Chatbefehlen (/lvl, /tp, /gold … – Liste: irgendein unbekannter /befehl)
```

Projektstruktur: `client/` (Phaser-Spielszene, Preact-Oberfläche, Grafik- und Audio-Erzeugung), `server/` (autoritative
Simulation, SQLite), `shared/` (Spielregeln, Daten, Kartengenerator, Protokoll), `launcher/` (Launcher und Patcher),
`config/`, `tests/`, `docs/`, `scripts/` (Start, Messungen, Simulationen).
