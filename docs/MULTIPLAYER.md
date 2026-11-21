# Multiplayer

Bis zu vier Spieler in einer Gruppe, beliebig viele auf einem Server. Ein Rechner ist Gastgeber und führt die gesamte
Spielwelt; alle anderen verbinden sich mit dem Browser.

## So spielt ihr zusammen

1. **Gastgeber:** Server starten (`start-server.bat` / `./start-server.sh`). Die Adressen stehen im Serverfenster und im
   Spiel in der Charakterauswahl unter „Server“.
2. **Mitspieler:** Die Tailscale-Adresse des Gastgebers im Browser öffnen, z. B. `http://100.101.102.103:7777`.
   Einrichtung von Tailscale: [TAILSCALE_SETUP.md](TAILSCALE_SETUP.md). Im selben Heimnetz genügt die Heimnetz-Adresse.
3. Namen eingeben, **Spielen**, Charakter erstellen, Welt betreten.

Wer das Projekt selbst installiert hat, kann stattdessen im Hauptmenü **Server beitreten** wählen und die Adresse des
Gastgebers eintragen – der eigene Browser lädt das Spiel dann lokal und verbindet sich nur für die Spieldaten mit dem
Gastgeber.

Charaktere werden **auf dem Server des Gastgebers** gespeichert. Ein Charakter, den du bei einem Freund erstellt hast,
existiert auf deinem eigenen Server nicht (und umgekehrt).

## Gruppe

- Fenster **Gruppe** (Taste P): Spieler aus der Online-Liste einladen; der Eingeladene bestätigt.
- Gruppenmitglieder sehen gegenseitig Leben und Aufenthaltsort; `/p Text` im Chat schreibt nur an die Gruppe.
- **Erfahrung:** Wer an einem Kampf beteiligt ist, erhält die volle Erfahrung – Gruppenmitglieder in der Nähe ebenfalls,
  plus 10 % Bonus je weiterem Mitglied.
- **Beute:** Jeder Spieler bekommt seine eigene Beute, passend zur eigenen Klasse. Niemand kann anderen etwas wegnehmen;
  auch Truhen und Bosstruhen kann jeder für sich öffnen.
- **Quests:** Kills zählen für alle beteiligten Gruppenmitglieder. Dungeon-Schlüssel, Türen und Rätsel gelten für alle im
  Dungeon. Die Gruppenquest „Gemeinsame Jagd“ (Ayla in Quellhain) verlangt einen Bosssieg mit mindestens zwei
  Gruppenmitgliedern.
- **Schwierigkeit:** Gegner erhalten je weiterem Spieler in der Nähe 55 % mehr Leben, Bosse 75 %.
- **Wiederbeleben:** Neben einem gefallenen Mitspieler *Interagieren* drücken. Gewinnt die Gruppe einen Bosskampf,
  stehen Gefallene automatisch wieder auf.

## Verbindung

- Die Anzeige im HUD zeigt die Verzögerung (Ping) in Millisekunden.
- Bricht die Verbindung ab, versucht das Spiel selbstständig, sie wiederherzustellen. Dein Charakter bleibt bis zu
  30 Sekunden unverwundbar an Ort und Stelle; danach wird er gespeichert und aus der Welt genommen. Beim erneuten
  Verbinden geht es dort weiter, wo du warst.
- Ein Profil kann nur einmal gleichzeitig angemeldet sein. Öffnest du das Spiel in einem zweiten Fenster, wird das erste
  abgemeldet.

## Sicherheit und Fairness

- Der Server entscheidet alles Wesentliche: Treffer, Schaden, Beute, Erfahrung, Questfortschritt, Käufe, Inventar.
  Der Client schickt nur Absichten („ich greife in diese Richtung an“). Bewegungen werden auf Geschwindigkeit und
  Kollision geprüft; unmögliche Positionen setzt der Server zurück.
- Der Server lauscht standardmäßig auf allen Netzwerkschnittstellen (`0.0.0.0`), ist aber ohne Portfreigabe am Router
  nur im Heimnetz und im Tailnet erreichbar. Wer ihn auf Tailscale beschränken will, setzt in `config/server.json`
  `"host"` auf die eigene Tailscale-IP (dann ist `localhost` nicht mehr erreichbar – der Gastgeber nutzt selbst die
  Tailscale-Adresse) oder schränkt den Port per Firewall auf die Tailscale-Schnittstelle ein.
- Es gibt bewusst keine Passwörter: Der Zugang wird durch das Tailnet geregelt. Ladet nur Leute ein, denen ihr vertraut.

## Server verwalten

Im Serverfenster: `players` (Liste), `say <Text>` (Durchsage), `save`, `backup`, `stop`.
Dungeons setzen sich 90 Sekunden, nachdem der letzte Spieler sie verlassen hat, zurück und können erneut gespielt werden.
