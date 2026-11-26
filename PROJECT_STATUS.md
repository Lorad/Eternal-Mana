# Projektstatus – Eternal Mana

Stand: Version 0.11.0 (Endspiel-Expeditionen, Tiefen, Bestenliste, Balance über die neue Länge; Quellwarte, Expeditionen und Ausrüstung mit zehn Plätzen; Feinschliff; Gemeinsam; Zuhause; Lebendige Welt; Endspiel; Akt II der Geschichte; Handwerk & Elemente; Launcher mit automatischen Updates; Grafik-Neuaufbau abgeschlossen)

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
| 0.9 | Quellwarte (Hub mit neun Einrichtungen), sieben Expeditionen mit Mini-Bossen, Endbossen mit Signaturmechanik, vier Schwierigkeitsgraden, Wochen-Herausforderung und gemeinsamer Rückkehr; zehn Ausrüstungsplätze, Seltenheit Mythisch, faires Verbessern bis +10, Sets mit sechs Teilen | **fertig** |
| 0.10/0.11 | Alle Expeditionen und Schwierigkeitsgrade im Browser geprüft und korrigiert; Endspiel-Expeditionen „Die Lange Wacht“ und „Das Atmende Herz“, Tiefen 1–20, Bestenliste; Tempo, Gold und Überführung der Ausrüstung abgestimmt; Leistung mit vier Spielern gemessen | **fertig** |

### Offene Punkte nach 0.9 (Roadmap Abschnitt 5)

0.10 und 0.11 sind zusammen als Version 0.11.0 erschienen. Stand der einzelnen Punkte:

- **Im Browser durchgespielt** sind alle sieben Expeditionen (`tests/e2e/expedition*.mjs`): je Portal, Mini-Boss, Ereignis
  (Hinterhalt, Finsternis, Flut, Einsturz), die Signatur des Endbosses wirklich ausgelöst (Prismensäule, Kühlkette, Stillstand,
  Tintenfass, wanderndes Licht), Phasen, Abschluss, Rückkehr; die geheime Expedition über ihre Spur entdeckt; Schwer, Albtraum
  und Mythisch an der Singenden Tiefe. Mit Dev-Befehlen abgekürzt: Normale Gegner und Bosse fallen per `/kill`/`/expsieg`, nicht
  im echten Kampf; Rätsel, Fallen, Schlüssel und das Einschlagen der geheimen Wände sind nur durch Tests und Bots geprüft.
- **Einsturz-Jagd** (Gießerei, Hof) ist kurz: Die ferne Mündung liegt 10–14 Kacheln vom Zugang, die Bruchkante startet nach 1,6 s
  mit 46 px/s – wer losläuft, ist nach gut zwei Sekunden durch. Spannung bräuchte einen längeren Weg (Karte) oder eine schnellere Kante.
- **Leistung, vier Spieler in einer Expedition** (`load-check.ts --exp`): Takt im Mittel 0,8 ms (p99 2–5 ms, Budget 50 ms),
  Snapshots im Mittel 1,7 kB (Singende Tiefe) bis 2,1 kB (Hof), 34–40 kB/s je Spieler beim Durchkämpfen, im Bosskampf 0,6 kB.
  Zwei Vierergruppen in je einer Instanz: 1,35 ms je Takt. Kein Engpass gefunden.
- **Dauer:** Bot-Läufe auf Normal brauchen allein 14–19 Minuten, zu zweit 11–19 (`scripts/exp-playtest.ts`). Schnelle Läufe
  von Wurzeltiefe und Gießerei liegen knapp unter 15 Minuten.
- Tempo und Überführung der Ausrüstung: erledigt in 0.11 (siehe unten). Keine legendären Zweithand-Stücke.
- **Gruppen:** mit höchstens zwei echten Browsern geprüft. Gruppen-Instanzen und Gruppengesuche überleben keinen Neustart.
- Händler-Wechsel um Mitternacht nur mit gestellter Uhr geprüft; Gamepad in Hub-Fenstern und Inventar-Puppe nicht mit echtem Pad.

### Stand 0.11 (Endspiel-Expeditionen und Balance über die neue Länge)

- **Tempo:** Erfahrung und Gold der Expeditionen auf die Geschichte abgestimmt (ein Normal-Abschluss knapp zwei Stufen statt
  gut zwei bis drei; Gegner geben 60 % Gold). Der Tempo-Test rechnet über die Expeditionen statt über die alten Karten.
- **Ausrüstung:** Borins Beigaben bei der Überführung tragen Stufe, Seltenheit und Verbesserung der alten Teile (höchstens −6 %,
  vorher bis −20 %); +10 auf allem bleibt bei ×1,37 – begründet mit den Kosten (docs/GAME_DESIGN.md, Balance 0.11).
- **Endspiel:** „Die Lange Wacht“ (Vael) und „Das Atmende Herz“ (Aetherion), Tiefen 1–20 über Mythisch für alle Expeditionen,
  Bestenliste in der Trophäenhalle; heilende Erwachte heilen keine Heiler mehr (Mythisch war für Einzelne unschaffbar).
- **Offen:** Spielstände, die schon mit 0.9/0.10 überführt wurden, behalten Borins gewöhnliche Stücke. Tiefen über 10 und
  Gruppen in Tiefen sind ungemessen (Bots zu zweit hängen dort fest). Wachfeuer und Herztöne benutzen vorhandene Kunst
  (Feuerschale, Kristall). Bestenliste nur serverweit, ohne Zeitraum.

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

1. Die übrigen Expeditionen und die Grade ab Schwer im Browser durchspielen; Tiefen zu zweit und zu viert im Browser spielen.
2. Spieltest-Runde zu zweit oder dritt über Tailscale: Schwierigkeit, Tempo, Lautstärken und Animationen in Bewegung beurteilen.
3. Touch-Steuerung (virtueller Stick und Aktionsknöpfe).
4. Mehr Bewegungsphasen bei Bossen und zusätzliche Rätseltypen (Schiebeblöcke, Spiegel).
5. Sprachumschaltung (Texte liegen gesammelt in `shared/src/data/`).
