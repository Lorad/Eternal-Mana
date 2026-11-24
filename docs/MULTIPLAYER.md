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

- **Bilden:** Fenster **Gruppe** (Taste P) → Spieler aus der Online-Liste einladen. Oder zu jemandem hingehen und
  *Interagieren* drücken (außerhalb von Kämpfen genügt auch ein Klick auf die Figur): Das kleine Menü bietet *Ansehen*,
  *Handeln* und *In die Gruppe einladen*. Der Eingeladene bekommt eine Anfrage mit Frist (30 s) und bestätigt.
- **Anführer:** Wer einlädt, ohne in einer Gruppe zu sein, gründet sie und führt sie an (Stern am Namen). Nur der Anführer lädt
  ein, entfernt Mitglieder, ernennt einen Nachfolger, löst die Gruppe auf und öffnet Mana-Risse. Verlässt er die Gruppe, verliert
  er die Verbindung oder bleibt er 30 s gefallen, führt das dienstälteste verbundene Mitglied weiter. Höchstens vier Mitglieder.
- **Gruppenrahmen:** Links im Bild stehen die Mitglieder mit Leben, Stufe und Aufenthaltsort (Gebiet, Mana-Riss mit Stufe,
  Welt eines anderen Kreises), dazu „Gefallen“ oder „Verbindung getrennt“. Ein Klick öffnet das Menü zum Mitglied.
- **Gruppenchat:** `/p Text` schreibt nur an die Gruppe.
- **Zur Gruppe reisen:** Von einem Quellstein aus reist „Hinreisen“ zum Quellstein des Gebiets, in dem ein Mitglied gerade ist
  (steckt es in einem Dungeon oder Riss: das Gebiet davor). Es ist eine gewöhnliche Quellstein-Reise – der Ziel-Quellstein
  muss aktiviert sein.
- **Erfahrung:** Wer an einem Kampf beteiligt ist, erhält die volle Erfahrung – Gruppenmitglieder in der Nähe ebenfalls,
  plus 10 % Bonus je weiterem Mitglied.
- **Beute: jeder würfelt für sich.** Jeder Spieler bekommt seine eigene Beute, passend zur eigenen Klasse. Niemand kann anderen
  etwas wegnehmen; auch Truhen und Bosstruhen öffnet jeder für sich.
- **Gruppentruhe:** Besiegt ihr einen Dungeon- oder Riss-Boss und waren mindestens zwei Mitglieder derselben Gruppe dabei,
  erscheint zusätzlich eine Gruppentruhe. Jeder, der dabei war, öffnet sie einmal und findet eigene Beute (Gold, ein
  Ausrüstungsteil für die eigene Klasse, Rohstoffe, Tränke – im Riss dazu ein Echo-Fragment).
- **Quests:** Kills, Questziele, Echos, Ereignisse und Weltbosse zählen für alle Gruppenmitglieder in der Nähe (gleicher
  Umkreis wie bei der Erfahrung); ein Bosssieg zählt für alle im Dungeon. Dungeon-Schlüssel, Türen und Rätsel gelten für alle im
  Dungeon. Die Gruppenquest „Gemeinsame Jagd“ (Ayla in Quellhain) verlangt einen Bosssieg mit mindestens zwei Gruppenmitgliedern.
- **Quest teilen:** Im Questlog bietet „Mit der Gruppe teilen“ eine aktive Neben-, Gruppen- oder wiederholbare Quest allen
  Mitgliedern an, die sie annehmen dürfen. Sie nehmen an, ohne zum Auftraggeber zu laufen – die Voraussetzungen bleiben dieselben.
  Hauptquests und Geheimnisse lassen sich nicht teilen.
- **Schwierigkeit:** Gegner erhalten je weiterem Spieler in der Nähe 55 % mehr Leben, Bosse 75 %.
- **Wiederbeleben:** Neben einem gefallenen Mitspieler *Interagieren* drücken. Gewinnt die Gruppe einen Bosskampf,
  stehen Gefallene automatisch wieder auf.
- **Mana-Risse:** Der Riss gehört der Gruppe. Wer sie im laufenden Riss verlässt oder entfernt wird, steht wieder am Riss-Stein
  und kann in diesen Riss nicht zurück. Während eines Bosskampfs wird niemand entfernt; aufgelöst wird nicht, solange jemand
  im Riss steckt. Wer neu dazukommt, folgt der Gruppe am Riss-Stein.
- **Neuer Kreis:** Die Gruppe spielt in der Welt ihres niedrigsten Kreises; die Einladung nennt ihn. Ändert sich die Gruppe,
  wechseln alle in die passende Welt – wer gerade in einem Bosskampf steckt, erst danach.
- **Höfe:** Am Wegweiser in Quellhain besuchst du die Höfe deiner Gruppenmitglieder; der Gruppenrahmen zeigt, wer gerade auf
  welchem Hof ist. Stationen, Gästebett und Kleiderschrank stehen Gästen offen, die Lagertruhe nicht. Wer nicht mehr zur Gruppe
  des Gastgebers gehört (verlassen, entfernt, aufgelöst – oder der Gastgeber ist ganz weg), steht wieder in Quellhain.
  „Hinreisen“ zu jemandem auf einem Hof führt zum Quellstein von Quellhain.
- **Ansehen:** Stufe, Klasse, Titel, Werte, Ausrüstung, Begleiter und Erscheinung eines anderen Spielers lassen sich ansehen
  (nur lesen).

## Handel

1. Nebeneinanderstellen, *Interagieren* (oder Klick auf die Figur / den Gruppenrahmen) → **Handeln**. Der andere bestätigt die Anfrage.
2. Beide legen Gegenstände (bei Stapeln mit Menge) und Gold in ihr Angebot und sehen das des anderen sofort.
3. Beide **sperren**, dann **bestätigen** beide. Jede Änderung hebt die Sperren wieder auf; direkt danach lässt sich kurz
   nicht sperren, damit niemand dem anderen im letzten Moment etwas unterschiebt.
4. Der Server tauscht in einem Zug und speichert beide Charaktere sofort gemeinsam – oder es passiert gar nichts
   (z. B. wenn einem der Platz im Inventar fehlt).

Abgebrochen wird der Handel durch Weggehen, Zonenwechsel, Tod, Verbindungsabriss oder „Abbrechen“. Nicht handelbar
(„Gebunden“, steht im Tooltip): Questgegenstände, Legendäre Waffen, Trophäen sowie Rezepte, die es nur für Ruf oder aus der
Prüfung der Sieben gibt. Angelegtes muss vorher abgelegt werden. Gehandelt wird nur aus dem Rucksack – die Lagertruhe des
Hofs und alles, was dem Profil gehört (Begleiter, Erscheinungen, Sammlung), ist für den Handel unerreichbar. Einen
„Pilzling im Topf“ darf man verschenken.

## Verbindung

- Die Anzeige im HUD zeigt die Verzögerung (Ping) in Millisekunden.
- Bricht die Verbindung ab, versucht das Spiel selbstständig, sie wiederherzustellen. Dein Charakter bleibt bis zu
  30 Sekunden unverwundbar an Ort und Stelle – in der Gruppe, im Dungeon oder Mana-Riss, an derselben Position. Meldest du
  dich in dieser Zeit wieder an (auch nach einem Neuladen der Seite), geht es genau dort weiter.
- Danach wird der Charakter gespeichert und aus der Welt genommen. Dein **Platz in der Gruppe bleibt 5 Minuten frei**: Betrittst
  du die Welt in dieser Zeit wieder, bist du sofort wieder Mitglied; steckt die Gruppe in einem Mana-Riss, folgst du ihr am Riss-Stein.
- Wer die Welt bewusst verlässt (Charakterauswahl), verlässt auch die Gruppe. Nach einem Neustart des Servers gibt es keine Gruppen mehr.
- Ein Profil kann nur einmal gleichzeitig angemeldet sein. Öffnest du das Spiel in einem zweiten Fenster, wird das erste
  abgemeldet; Charakter und Gruppe bleiben.

## Sicherheit und Fairness

- Der Server entscheidet alles Wesentliche: Treffer, Schaden, Beute, Erfahrung, Questfortschritt, Käufe, Inventar, Handel.
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
