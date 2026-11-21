# Eternal Mana

Ein eigenständiges Fantasy-Action-RPG für den Browser – Pixel-Art, Echtzeitkampf, sechs Biome, sechs Dungeons mit Bossen,
Quests und Story, Loot und Charakterentwicklung, Koop-Multiplayer für bis zu vier Spieler über ein privates Tailscale-Netz.

Alle Grafiken, Musikstücke und Soundeffekte werden zur Laufzeit im Browser erzeugt – das Projekt enthält keine fremden Assets
und braucht nach der Installation keine Internetverbindung.

## Schnellstart

Voraussetzung: [Node.js 22.13 oder neuer](https://nodejs.org/).

| | Windows | Linux / macOS |
|---|---|---|
| Server starten | `start-server.bat` doppelklicken | `./start-server.sh` |
| Spiel öffnen | `start-client.bat` | `./start-client.sh` |
| Server beenden | `stop-server.bat` (oder `stop` im Serverfenster, Strg+C) | `./stop-server.sh` |

Beim ersten Start werden Abhängigkeiten installiert und der Client gebaut (ein bis zwei Minuten). Danach zeigt das
Serverfenster die Adressen an, unter denen das Spiel erreichbar ist – auf dem eigenen Rechner `http://localhost:7777`.

**Einzelspieler** ist einfach ein Server, auf dem nur du spielst. **Mit Freunden** spielen: siehe
[docs/MULTIPLAYER.md](docs/MULTIPLAYER.md) und [docs/TAILSCALE_SETUP.md](docs/TAILSCALE_SETUP.md).

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
| Inventar, Charakter, Fähigkeiten, Quests, Karte, Gruppe | I, C, K, L, M, P | Select bzw. Steuerkreuz |
| Chat (`/p Text` = Gruppenchat) | Enter | – |
| Menü / Schließen | Esc | Start |

## Dokumentation

- [docs/INSTALLATION.md](docs/INSTALLATION.md) – Installation, Start, Aktualisieren, Sichern
- [docs/MULTIPLAYER.md](docs/MULTIPLAYER.md) – gemeinsam spielen, Gruppen, Wiederverbindung
- [docs/TAILSCALE_SETUP.md](docs/TAILSCALE_SETUP.md) – Tailscale Schritt für Schritt, ACLs, Firewall
- [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) – Welt, Klassen, Kampf, Balancing
- [docs/TECHNICAL_ARCHITECTURE.md](docs/TECHNICAL_ARCHITECTURE.md) – Aufbau, Protokoll, Architekturentscheidungen
- [docs/CHANGELOG.md](docs/CHANGELOG.md) · [PROJECT_STATUS.md](PROJECT_STATUS.md)

## Für Entwickler

```bash
npm install
npm run dev        # Server (7777, automatischer Neustart) + Vite-Client (5173, Hot Reload)
npm test           # Logik- und Server-Integrationstests
npm run test:e2e   # Browser-Test (braucht einen laufenden Server und Playwright)
npm run typecheck
```

Projektstruktur: `client/` (Phaser-Spielszene, Preact-Oberfläche, Grafik- und Audio-Erzeugung), `server/` (autoritative
Simulation, SQLite), `shared/` (Spielregeln, Daten, Kartengenerator, Protokoll), `config/`, `tests/`, `docs/`, `scripts/`.
