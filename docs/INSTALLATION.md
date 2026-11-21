# Installation, Start, Aktualisieren, Sichern

## 1. Voraussetzungen

- **Node.js 22.13 oder neuer** (LTS-Installer von https://nodejs.org/). Prüfen: `node -v`.
  Der Server nutzt das in Node eingebaute SQLite – es müssen keine nativen Module kompiliert werden.
- Ein aktueller Browser (Chrome, Edge, Firefox, Safari).
- Für Multiplayer über das Internet: Tailscale auf allen beteiligten Geräten (siehe [TAILSCALE_SETUP.md](TAILSCALE_SETUP.md)).

## 2. Starten

**Windows:** `start-server.bat` doppelklicken. **Linux/macOS:** `./start-server.sh`.

Das Skript prüft die Node-Version, installiert beim ersten Mal die Abhängigkeiten (`npm install`), baut den Client, falls er
fehlt oder veraltet ist, und startet den Server. Im Fenster steht dann zum Beispiel:

```
  ETERNAL MANA – Server v0.1.0 läuft
  Dieser Rechner         http://localhost:7777
  Heimnetz (eth0)        http://192.168.178.20:7777
  Tailscale-IP           http://100.101.102.103:7777
  Tailscale MagicDNS     http://mein-pc.tail1234.ts.net:7777
```

Spiel öffnen: `start-client.bat` bzw. `./start-client.sh` – oder die Adresse von Hand in den Browser eingeben.

## 3. Beenden

- Im Serverfenster `stop` eingeben und Enter drücken, **oder** Strg+C, **oder** `stop-server.bat` / `./stop-server.sh`.
- In allen Fällen werden vorher alle Charaktere gespeichert und ein Backup der Datenbank angelegt.

Weitere Befehle im Serverfenster: `save` (sofort speichern), `backup` (Backup anlegen), `players` (wer ist online),
`say <Text>` (Servernachricht an alle).

## 4. Einstellungen des Servers

`config/server.json`:

```json
{ "name": "Eternal Mana", "port": 7777, "host": "0.0.0.0", "dataDir": "data" }
```

- `port` – Port für HTTP und WebSocket. Ändern, falls 7777 belegt ist.
- `host` – `0.0.0.0` = auf allen Netzwerkschnittstellen erreichbar (nötig für Tailscale). Mit `127.0.0.1` ist der Server
  ausschließlich vom eigenen Rechner aus erreichbar (reiner Einzelspieler).
- `dataDir` – Ordner für Spielstände und Backups.

Die Werte lassen sich auch per Umgebungsvariable überschreiben: `EM_PORT`, `EM_HOST`, `EM_DATA`.
`EM_DEV=1` schaltet Entwickler-Chatbefehle frei (`/lvl`, `/tp`, `/gold` …) – nicht für normale Runden gedacht.

## 5. Spielstände und Sicherung

Alles liegt in `data/`:

- `data/eternal-mana.db` – die SQLite-Datenbank mit Profilen und Charakteren.
- `data/backups/` – automatische Sicherungen: bei jedem Serverstart, alle 15 Minuten während gespielt wird und beim
  Beenden. Es werden die letzten 20 automatischen Backups aufbewahrt. Manuelle Backups (`backup` im Serverfenster oder
  `npm run backup`) werden nie automatisch gelöscht.

**Sichern:** Den Ordner `data/` kopieren (am besten bei beendetem Server) – das genügt.

**Wiederherstellen:** Server beenden, die gewünschte Datei aus `data/backups/` nach `data/eternal-mana.db` kopieren
(vorhandene Dateien `eternal-mana.db-wal` und `-shm` löschen), Server starten.

**Schutz vor beschädigten Ständen** (automatisch):
- Jeder Charakter wird mit Prüfsumme gespeichert. Stimmt sie beim Laden nicht, greift der Server auf einen der letzten
  fünf Charakter-Snapshots zurück (alle fünf Minuten angelegt).
- Beim Start wird die Datenbank auf Integrität geprüft. Ist die Datei defekt, wird sie beiseitegelegt
  (`eternal-mana.db.defekt-…`) und das jüngste Backup eingespielt.
- Gespeichert wird automatisch alle 30 Sekunden, bei jedem Zonenwechsel, Questabschluss, Bosssieg und beim Trennen.

**Profil-Schlüssel:** Der Browser merkt sich einen zufälligen Profil-Schlüssel; an ihm hängen deine Charaktere auf dem
Server. Unter *Einstellungen → Profil* kannst du ihn anzeigen und in einem anderen Browser/Gerät eintragen. Behandle ihn
wie ein Passwort. Wer den Browser-Speicher löscht, ohne den Schlüssel notiert zu haben, kommt nicht mehr an seine
Charaktere (die Daten bleiben in der Datenbank erhalten).

## 6. Aktualisieren

1. Server beenden.
2. Neue Version holen: `git pull` (oder das neue Archiv über den alten Ordner entpacken – **`data/` nicht löschen**).
3. Server wie gewohnt starten. Das Startskript installiert geänderte Abhängigkeiten und baut den Client neu.

Von Hand: `npm install && npm run build && npm start`.

## 7. Fehlerbehebung

| Problem | Lösung |
|---|---|
| „Node.js fehlt“ / Version zu alt | Node.js 22.13+ installieren, Terminal neu öffnen. |
| „Port 7777 ist bereits belegt“ | Läuft der Server schon? Sonst `port` in `config/server.json` ändern. |
| Browser zeigt „Client wurde noch nicht gebaut“ | `npm run build` ausführen (macht das Startskript normalerweise selbst). |
| Freunde erreichen den Server nicht | [TAILSCALE_SETUP.md](TAILSCALE_SETUP.md), Abschnitt Fehlersuche. |
| Kein Ton | Einmal ins Spiel klicken (Browser geben Ton erst nach einer Eingabe frei); Lautstärke in den Einstellungen prüfen. |
| Ruckeln | In den Einstellungen Beleuchtung und Wetter abschalten; Hardwarebeschleunigung im Browser aktivieren. |
