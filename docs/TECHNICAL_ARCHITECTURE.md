# Technische Architektur

## Überblick

```
Browser (Client)                               Node.js (Server, ein Prozess)
┌──────────────────────────────┐   WebSocket   ┌─────────────────────────────────┐
│ Preact-Oberfläche (HTML/CSS) │◄─────────────►│ Game: Sitzungen, Gruppen, Routing│
│ Phaser-3-Spielszene (WebGL)  │   JSON /ws    │ Zone: Simulation 20 Hz           │
│ Grafik + Audio prozedural    │               │ BossCtl: Bossmuster              │
│ Vorhersage eigener Bewegung  │   HTTP        │ Db: node:sqlite, Backups         │
└──────────────────────────────┘◄──────────────│ statische Dateien (client/dist)  │
               ▲                               └─────────────────────────────────┘
               └────── shared/: Regeln, Daten, Kartengenerator, Protokolltypen ──────┘
```

| Ordner | Inhalt |
|---|---|
| `shared/src` | `config.ts` (Balancing), `types.ts` (Protokoll, Spielstand), `stats.ts`, `collision.ts`, `data/` (Klassen, Skills, Items, Gegner, Zonen, NPCs, Quests, Texte), `maps/` (Kacheln, Generator) |
| `server/src` | `index.ts` (HTTP + WebSocket, Konsole), `game.ts` (Sitzungen, Charakteraktionen, Gruppen), `zone.ts` (Simulation), `boss.ts`, `player.ts`, `db.ts`, `tailscale.ts` |
| `client/src` | `game/` (Phaser-Szene, Eingabe), `ui/` (Menüs, HUD), `gfx/` (Pixel-Art-Erzeugung), `audio/` (Synthese, Musik), `net/`, `state/` |
| `tests/` | Logiktests, Server-Integrationstests mit Bot-Clients, Browser-Test |

## Architekturentscheidungen

1. **Immer Client–Server, auch im Einzelspieler.** Es gibt nur einen Codepfad: Einzelspieler ist ein Server mit einem
   Spieler auf `localhost`. Dadurch ist Multiplayer kein Aufsatz, sondern der Normalfall, und Spielstände liegen immer
   serverseitig.
2. **Autoritativer Server.** Der Client sendet Absichten (`atk`, `skill`, `dodge`, `interact`, `buy` …). Treffer, Schaden,
   Zustände, Beute, Erfahrung, Quests, Inventar und Handel berechnet ausschließlich der Server.
3. **Bewegung: Client-Vorhersage mit Server-Prüfung.** Der eigene Charakter bewegt sich sofort lokal (gleicher
   Kollisionscode aus `shared/`) und meldet 20-mal pro Sekunde seine Position. Der Server prüft Geschwindigkeit
   (Bewegungsbudget) und Kollision; bei Verstoß schickt er `pos` mit neuer Epoche, ältere Meldungen verfallen. Vom Server
   erzwungene Bewegungen (Sturmangriff, Teleport) laufen über denselben Mechanismus. Alle anderen Entitäten werden aus
   Snapshots mit 110 ms Verzögerung interpoliert.
4. **Deterministische Karten.** Server und Client erzeugen jede Zone aus derselben Definition und demselben Seed. Karten
   werden nie übertragen; nur Objektzustände (Tür offen, Truhe geplündert) gehen über das Netz.
5. **Snapshots + Ereignisse.** Pro Tick (50 ms) erhält jeder Spieler die Positionen aller Spieler und der *wachen* Gegner
   seiner Zone (schlafende Gegner fern von Spielern werden weder simuliert noch gesendet) sowie eine Ereignisliste
   (Schaden, Effekte, Geschoss-Start/-Ende, Objektänderungen). Geschosse fliegen geradlinig und werden nur als Start- und
   Endereignis übertragen.
6. **Eingebautes SQLite (`node:sqlite`).** Keine nativen Abhängigkeiten, daher problemlose Installation unter Windows.
   Charaktere liegen als JSON mit SHA-1-Prüfsumme in einer Tabelle; rollierende Snapshots und `VACUUM INTO`-Backups
   schützen vor Verlust (Details in INSTALLATION.md).
7. **Prozedurale Grafik und Musik.** Sprites, Kacheln, Icons, Soundeffekte und alle Musikstücke entstehen im Browser aus
   Code (Canvas bzw. WebAudio). Vorteile: einheitlicher Stil, keine Lizenzfragen, keine Ladezeiten für Assets, offline lauffähig.
8. **Oberfläche in HTML (Preact), Welt in WebGL (Phaser).** Menüs profitieren von Text, Layout und Zugänglichkeit des DOM;
   die Welt von schnellem Sprite-Rendering. Beide teilen sich einen kleinen Zustandsspeicher (`state/store.ts`) und einen Ereignisbus.
9. **Ein Prozess, ein Port.** Der Server liefert den gebauten Client aus und nimmt WebSockets unter `/ws` an. Mitspieler
   brauchen nur eine Adresse und nichts zu installieren.
10. **Zentrales Balancing.** Formeln und Konstanten stehen in `shared/src/config.ts`, Inhalte in Datentabellen.

## Netzwerkprotokoll (JSON über WebSocket)

Typen: `ClientMsg` und `ServerMsg` in `shared/src/types.ts`.

- **Anmeldung:** `hello {token, name}` → `welcome {chars, server}`. Das Token ist ein zufälliger Profil-Schlüssel aus dem
  Browser-Speicher. `charCreate`, `enter` → `entered {char, init}`.
- **Welt:** `init` (ZoneInit) enthält Spieler, Gegner, Objekte mit *spielerbezogenem* Zustand (z. B. ob *du* die Truhe
  schon geöffnet hast), aktive Flächeneffekte, Wetter, Tageszeit. Danach `s` (Snapshot: `p` Spieler, `m` Gegner,
  `ev` Ereignisse, `me` eigene Werte).
- **Charakter:** Der Server schickt geänderte Teile des Spielstands als `char {d}`; der Client ersetzt sie.
- **Wiederverbindung:** Bei Verbindungsabbruch bleibt der Charakter 30 s unverwundbar in der Welt. Meldet sich dasselbe
  Token wieder an, hängt der Server die neue Verbindung an den bestehenden Charakter und schickt `entered` erneut.
- **Schutz:** Nachrichtenlimit je Verbindung (240/s, 4 kB), Prüfung aller Eingaben, NPC-Nähe für Handel/Quests,
  Abklingzeiten und Manakosten serverseitig, `/api/stop` nur von `127.0.0.1`.

## Simulation (server/src/zone.ts)

Reihenfolge pro Tick: Wetter → Spieler (Regeneration, Zustände, Gefahrenboden, Beute aufsammeln, Ausgänge) →
Wegfindungsfelder → Gegner-KI → Boss → Geschosse → Flächeneffekte/Ankündigungen → Fallen/Rätsel → Wiedererscheinen →
Snapshots.

- **Kollision:** Kachelraster (16 px) mit drei Stufen (frei, blockiert Laufen, blockiert auch Geschosse) plus dynamisch
  blockierte Zellen (Türen, Felsblockaden).
- **Wegfindung:** Je Spieler ein Breitensuche-Distanzfeld (Radius 20 Kacheln, neu bei Kachelwechsel). Gegner laufen bei
  freier Sichtlinie direkt, sonst entlang des Feldes.
- **Bosse:** Angriffsmuster sind Generatorfunktionen (`yield sekunden` = warten) aus einem kleinen Werkzeugkasten
  (gezielte Fächer, Ringe mit Lücke, Spiralen, angekündigte Kreise/Strahlen, Sturmlinien, Pfützen, Raumangriffe mit
  sicheren Zonen, Beschwörungen).
- **Instanzen:** Jede Zone existiert einmal pro Server. Oberwelt-Gegner erscheinen nach 75 s neu; leere Dungeons werden
  nach 90 s verworfen und frisch erzeugt.

## Client

- **GameScene:** malt den Boden einmalig in 512-px-Kacheln auf Canvas-Texturen (nachbarschaftsbewusste Übergänge), legt
  animierte Flüssigkeit als TileSprite darunter, sortiert Sprites nach y. Beleuchtung: eine RenderTexture in
  Weltauflösung wird abgedunkelt und an Lichtquellen „ausgestanzt“. Wetter: wiederverwendete Sprites im Sichtfeld.
- **Eingabe:** Tastatur, Maus und Gamepad API werden auf Aktionen abgebildet (frei belegbar); Gamepads steuern Menüs über
  räumliche Fokus-Navigation.
- **Leistung:** keine Re-Renders der Oberfläche pro Frame (schmale Store-Abos; Minimap liest Positionsdaten direkt),
  Bodentexturen statt Tausender Kachel-Sprites, Snapshots nur für wache Gegner.

## Tests

- `tests/shared.test.ts` – Karten (Erreichbarkeit aller Objekte, Schlüssel/Türen, Splitter), Datenintegrität
  (Quests ↔ NPCs ↔ Items ↔ Gegner), Elementregeln, Levelkurve, Balancing-Korridor, Beuteerzeugung.
- `tests/server.test.ts` – startet einen echten Serverprozess und spielt mit Bot-Clients über das Protokoll: Kampf,
  Schummelversuche, zwei Spieler mit Gruppe, Speichern über Neustart, Wiederverbindung, Quest/Handel/Verbesserung,
  Bosskampf, beschädigte Spielstände.
- `tests/e2e/smoke.mjs` – Browser-Durchlauf mit Playwright: Menü → Charakter erstellen → Welt → bewegen → angreifen.
