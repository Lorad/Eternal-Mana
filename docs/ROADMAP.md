# Roadmap – Ausbau zu einem langfristigen Action-RPG

Dieses Dokument ist die verbindliche Leitlinie für den Ausbau ab Version 0.3. Es legt Geschichte, Systeme, Namen und Regeln
fest, damit alle Teile zusammenpassen. Den Stand der Umsetzung führt `PROJECT_STATUS.md`.

**Achtung: enthält die gesamte Handlung (Spoiler).**

## 1. Regeln für jede Erweiterung

1. **Nichts Bestehendes brechen.** Grafik, Mehrspieler, Kampfsystem und Spielstände bleiben funktionsfähig. Vorhandene IDs
   (Quests, Gegenstände, Zonen, NPCs, Flags, Nachrichten) werden nie umbenannt oder entfernt.
2. **Spielstände bleiben kompatibel.** Neue Felder in `CharData` sind optional gedacht: `sanitizeChar` (server/src/db.ts) füllt
   Standardwerte, und Code darf sich nie darauf verlassen, dass ein alter Spielstand sie schon hat.
3. **Der Server entscheidet.** Jede neue Aktion (Herstellen, Handeln, Wählen, Betreten …) wird serverseitig geprüft: Besitz,
   Kosten, Nähe zum NPC/Objekt, Voraussetzungen. Der Client zeigt nur an.
4. **Keine Attrappen.** Was in der Oberfläche auftaucht, funktioniert. Lieber wenige, gut verzahnte Mechaniken als viele halbe.
5. **Zentrales Balancing.** Zahlen stehen in `shared/src/config.ts` oder in `shared/src/data/*`, nicht verstreut im Code.
6. **Alles ist verbunden.** Rohstoffe kommen aus Biomen, Dungeons, Bossen und Ereignissen und fließen in Handwerk und
   Verbesserungen; Ruf, Sammlung und Geschichte schalten Rezepte, Begleiter und Erscheinungen frei.
7. **Deutsch** für alle Texte im Spiel, Ton wie bisher: warm, trocken-humorvoll, nie pathetisch ohne Bruch.
8. **Tests.** Jede Erweiterung bringt eigene Tests (`tests/*.test.ts`, Bot-Helfer in `tests/helpers/bot.ts`) mit;
   `npm test`, `npx tsc --noEmit -p .` und `npm run build` müssen grün sein.
9. **Grafik** nur über die Asset-Pipeline (`docs/ASSET_PIPELINE.md`, `docs/ART_BIBLE.md`); keine fremden Assets.

## 2. Die Geschichte

### 2.1 Was bisher feststeht (Akt I, Versionen 0.1–0.2)

Sechs Siegel halten die Elemente im Gleichgewicht. Die Quelle unter Quellhain versiegt. Der Quellgänger (die Spielfigur) holt
die Siegel von Erde (Dornenmutter), Licht (Kristallkoloss), Feuer (Ignarok), Wasser (Ysolde) und Wind (Archivar) zurück und
erfährt: Morvain, der siebte Hüter – der Hüter des Gleichgewichts –, trank vor vierhundert Jahren die Quelle, um seine kranke
Tochter Maelis zu retten, nahm das Siegel der Dunkelheit mit ins Schattenreich und wurde dort zum Hohlen König. Die anderen
sechs strichen seinen Namen. Am Ende liegen sechs Siegel auf dem Brunnenrand, die Quelle fließt wieder, Maelis’ Licht verlischt.

Offene Fäden, die Akt II aufnimmt: der Name, den das Wasser nachts flüstert; die müde Stimme beim ersten Siegel („Noch nicht.
Bitte. Noch nicht.“); der Brunnen, der „falsch“ singt; die Quellsplitter, die Fenwick zum „ganzen Lied“ zusammensetzt; die vier
Töne des Wiegenlieds.

### 2.2 Die Wahrheit (Akt II)

- **Aetherion** ist kein Dämon, sondern das Wesen, das die Quelle *ist*: „der Träumer am Grund“. Mana ist sein Atem, den es
  der Welt freiwillig schenkte. Der Name, den das Wasser flüstert, ist seiner.
- **Der Alte Krieg** (vor über tausend Jahren): Sieben Reiche stritten um die Quelle und schöpften sie aus, bis das Land
  verdorrte. Aetherion begann, seinen Atem zurückzunehmen – „die Große Stille“. Sie hätte alles beendet, was von Mana lebt.
- **Die sieben Ersten Hüter**, einer aus jedem Reich, beendeten Krieg und Stille zugleich: Sie zerteilten Aetherions Herz in
  **sieben Mana-Kristalle** – sechs elementare und den **Herzkristall**. Die sechs elementaren wurden in die Siegel gefasst
  (das Siegel ist die Fassung, der Kristall der Inhalt) und über die Welt verteilt. Der Herzkristall ließ sich nicht fassen;
  ihn trug fortan der jeweilige Hüter des Gleichgewichts. Aus den Sieben wurde ein Orden mit sieben Sitzen.
- Die unbequeme Hälfte der Wahrheit: Die Hüter retteten die Welt – und machten dabei „einen Träumer zum Brunnen“. Die Quelle
  blieb *nutzbar*. Der Windhüter ließ Aetherions Namen und Wesen aus allen Chroniken streichen (das erste Vergessen; der
  Archivar setzt diese Arbeit bis heute fort).
- **Das Schattenreich** ist kein Reich des Bösen: Es ist Aetherions Traum – alles, was die Quelle „vergessen“ musste, seit ihr
  Herz zerteilt ist. Darum konnte Maelis dort bleiben: Aetherion hat sie behalten. Es hat das Wiegenlied von ihr gelernt.
- **Vael, der Hüter der Dunkelheit**, ist der einzige der Ersten, der noch lebt. Er ging mit dem Schatten seines Kristalls in
  den Traum, um Aetherions Schlaf von innen zu bewachen, und blieb – tausend Jahre lang Wärter und einziger Gesprächspartner
  zugleich. Der Sitz der Dunkelheit galt im Orden als „leer“, weil sein Hüter den Posten nie verlassen hat. Seine ist die müde
  Stimme. Er ließ Morvain aus Mitleid gewähren. Er ist erschöpft, höflich, ehrlich bis zur Schmerzgrenze, und er weiß nicht
  mehr, ob er Kerkermeister oder Freund ist. **Er ist kein Bösewicht und wird nicht getötet.** Der Kampf gegen ihn ist eine
  Prüfung, die er selbst verlangt, bevor er die letzte Tür öffnet.
- **Die Wendung:** Indem der Quellgänger die sechs Siegel an den Brunnen brachte, hat er sechs der sieben Kristalle wieder
  vereint – genau das, wovor Vael warnte. Der Herzkristall ist seit Morvains Fall frei: Die **Quellsplitter** sind seine
  Splitter, und Quellgänger sind Menschen, in denen einer davon singt. Aetherion erwacht.
- **Aetherion selbst** ist beim Erwachen weder gut noch böse, sondern verletzt: Es träumt seit tausend Jahren den Krieg.
  Der Bosskampf richtet sich gegen diesen Albtraum („die Große Stille“), nicht gegen das Wesen.

### 2.3 Kapitel

| Kapitel | Titel | Gebiet | Inhalt |
|---|---|---|---|
| 1–6 | (Akt I, vorhanden) | je Gebiet | Siegel, Morvain, Maelis |
| 7 | Das falsche Lied | Quellhain / Grünwald | Der Brunnen läuft über, Mana-Wogen. Ein Fremder am Brunnen (Vael, als Schatten). Mirelda war mehr als Dorfälteste: Brunnenhüterin. Fenwick erkennt im Lied der Splitter einen Namen. |
| 8 | Die sieben Sitze | alle sechs Gebiete | Je Gebiet ein **Hüterschrein** mit der Erinnerung des Ersten Hüters dieses Elements: derselbe Krieg aus sieben Blickwinkeln. Je eine Charakterquest mit der Figur vor Ort. |
| 9 | Der Wächter am Grund | Schattenreich | Vael zeigt sich. Seine Geschichte, seine Zweifel, die Prüfung („Vaels Wacht“). Maelis’ Spur im Traum. |
| 10 | Das Herz der Quelle | Quellgrund (unter dem Brunnen) | Abstieg, Dungeon „Herz der Quelle“, Aetherions Albtraum, die Entscheidung. |
| Epilog | je nach Entscheidung | Quellhain | Nachklang, Neuer Kreis (New Game+), Endspiel. |

**Die Entscheidung am Ende** (bleibt gespeichert, verändert Epilog, Dialoge und Belohnung):
1. *Versiegeln* – die Kristalle kehren auf ihre Sitze zurück; die Welt bleibt, wie sie war, die Quelle verblasst über Jahrhunderte.
2. *Befreien* – Aetherion wird ganz; Mana wird wild und reich, der Orden endet.
3. *Das Lied vollenden* (verborgen; nur wählbar, wenn alle sieben Hüter-Erinnerungen gefunden, Fenwicks Lied vollständig und
   Maelis’ Wiegenlied entdeckt ist) – weder Kerker noch Entfesselung: Aetherion bleibt aus freien Stücken, „ein Brunnen, der zuhört“.

Vaels Schicksal folgt der Entscheidung (er wacht weiter / er darf gehen / er sieht nach tausend Jahren die Sonne).

### 2.4 Figuren

Jede wichtige Figur hat Hintergrund, Eigenart, eine eigene Questlinie und Beziehungen; Dialoge ändern sich mit dem Fortschritt.

| Figur | Kern | Beziehung / Linie |
|---|---|---|
| Mirelda | spöttische Älteste, heimliche Brunnenhüterin | Schuld, es gewusst zu haben; alte Zuneigung zu Borin |
| Borin | wortkarger Schmied | schmiedet die Legendären Waffen; verlorener Lehrling |
| Fenwick | zerstreuter Gelehrter | das Lied der Splitter; hört als Erster den Namen |
| Sella, Tobi, Ayla, Edda | Dorf | kleine Linien (Rezepte, Tobis Ritterweg, Aylas Jagd) |
| Hedda & Pim | Grubenmeisterin, Wagenbauer | Stollen sieben, Heddas Bruder |
| Rakhan | Nomadenführer | Exil, die Schmiede der Ersten |
| Jorund & Inga | Einsiedler, Fellhändlerin | vierzig Jahre Winter, Ysolde |
| Liora & Sen | Archäologin, Geist | die Wahrheit veröffentlichen oder schützen; Sens Warten auf Morvain |
| Maelis | Kind aus Licht | ihr Wiegenlied; Nachklang im Traum |
| Vael | Hüter der Dunkelheit | siehe oben |
| Aetherion | der Träumer | spricht anfangs nur in Bruchstücken und Tönen |

## 3. Spielsysteme (Zielbild)

Bewusst schlank: wenige Währungen, keine Berufsstufen, alles über Rezepte, Rohstoffe und Freischaltungen.

- **Rohstoffe:** je Biom ein Monster-Rohstoff und eine Zutat zusätzlich zum vorhandenen Erz/Kraut; **Bosskerne** (je Boss);
  **Element-Essenzen** (sechs); seltene Endspiel-Rohstoffe (Ätherstaub, Echo-Fragmente, Sternsplitter).
- **Handwerk an Stationen:** Schmiede (Borin u. a.), Alchemie (Sella), Kochen (Lagerfeuer/Kessel), Verzauberung (Fenwick,
  Liora). Rezepte sind von Anfang an bekannt oder werden über Quests, Ruf, Funde freigeschaltet.
- **Schmiede:** Ausrüstung herstellen, verbessern (vorhanden, +10), umschmieden (Affixe neu würfeln), Element einschmieden.
- **Alchemie / Kochen:** Tränke, Elixiere (ein Elixier gleichzeitig), Speisen (eine Speise gleichzeitig, lange Wirkung).
- **Verzauberung:** ein Zauber je Ausrüstungsteil.
- **Rüstungssets** mit 2er- und 4er-Bonus; **Legendäre Waffen** je Klasse mit eigener Wirkung.
- **Elemente:** Resistenzen und Schwächen, Zustände je Element, **Reaktionen** (zwei Elemente treffen aufeinander),
  Bonus, wenn die beiden Elemente von verschiedenen Spielern stammen.
- **Endspiel:** Mana-Risse (Dungeons in Stufen mit zufälligen Modifikatoren und Boss-Echos), Weltbosse, Quellstufen,
  Neuer Kreis (New Game+).
- **Gemeinsam:** Gruppenverwaltung, Handel, Gruppenbelohnungen; Beute ist immer persönlich (jeder würfelt für sich).
- **Welt:** Ruf bei sechs Fraktionen, Tagesabläufe, Ereignisse, seltene Monster, Schätze, Jahreszeiten.
- **Zuhause:** eigenes Haus mit Lagertruhe, Stationen und Trophäen; Begleiter; Sammlung; Erscheinungen.

## 4. Meilensteine

Stand: alle Meilensteine bis 0.8 sind umgesetzt (siehe `PROJECT_STATUS.md` und `docs/CHANGELOG.md`).

| Version | Inhalt |
|---|---|
| 0.3 | **Handwerk & Elemente:** Rohstoffe, Stationen, Rezepte, Sets, Legendäre Waffen, Verzauberung, Resistenzen, Zustände, Reaktionen |
| 0.4 | **Geschichte:** Akt II (Kapitel 7–10), verzweigte Dialoge, Entscheidungen, Filmszenen, Chronik (Lore-Dokumente), Charakter- und Geheimquests, Story-Bosse Vael und Aetherion |
| 0.5 | **Endspiel:** Mana-Risse, Modifikatoren, Boss-Echos, Weltbosse, Quellstufen, Neuer Kreis |
| 0.6 | **Lebendige Welt:** Ruf und Fraktionen, Ereignisse, seltene Monster, Schätze, Tagesabläufe, Jahreszeiten |
| 0.7 | **Gemeinsam & Zuhause:** Gruppenverwaltung, Handel, Haus mit Lager, Begleiter, Sammlung, Erscheinungen |
| 0.8 | Feinschliff: Balance über alle Systeme, Bedienung, Leistung |

## 5. Ausbau ab 0.9: Quellwarte (Hub) und Expeditionen

Ziel: ein zentraler Hub, von dem aus Spieler ihre Abenteuer starten, sich verbessern und einander treffen – und Dungeons,
die sich wie vollständige Spiellevel anfühlen (normal 15–30 Minuten, große länger). Die offene Welt, die Geschichte und alle
Systeme bis 0.8 bleiben erhalten; der Hub kommt dazu, er ersetzt nichts. Gemeinsame Namen und Formate: `shared/src/data/hub.ts`.

### 5.1 Grundentscheidungen

- **Die Quellwarte** (`quellwarte`): die alte Wache der Hüter über dem Quellstein-Netz, wieder geöffnet als Basis der
  Quellgänger – eine kleine, lebendige Stadt. Eine Instanz für alle Spieler (kein Kampf). Erreichbar von Anfang an über jeden
  Quellstein und über ein Portal in Quellhain; neue Charaktere beginnen weiterhin die Geschichte in Quellhain und werden in der
  ersten Quest zur Quellwarte geführt.
- **Einrichtungen** (alle funktionieren): Dungeon-Portal, Schmiede, Ausrüstungshändler (wechselndes Angebot), Alchemie,
  Fähigkeitenmeister, Lagerhaus (dieselbe Profil-Truhe wie auf dem Hof, ohne Hofkauf erreichbar, erweiterbar), Gasthaus
  (Geschichten, Nebenquests, Gerüchte über geheime Dungeons, Treffpunkt), Trophäenhalle (Bosse, Erfolge, Bestzeiten,
  Statistiken, seltene Stücke), Gruppenbereich (Spieler sehen, Gruppen bilden, Bereitschaft, gemeinsam wählen).
  Die vorhandenen Systeme (Handwerk, Truhe, Gruppe, Sammlung) werden dort angebunden, nicht dupliziert.
- **Expeditionen** sind die Dungeons des Spiels: je Region eine große, mehrteilige Karte mit Abschnitten (Eingang, Erkundung,
  Kampfhallen, versteckte Schatzkammer, Rätsel, Mini-Boss, neuer Abschnitt, Elite, Vorbereitungsraum, Bossarena,
  Belohnungskammer), geheimen Wegen, Schlüsseln, Fallen und eigener Stimmung. Sie lösen die bisherigen kleinen Story-Dungeons
  ab: Die Dungeon-Eingänge in der Welt führen in die Expedition dieser Region (Schwierigkeit Normal), das Portal im Hub führt
  in alle freigeschalteten. Die Story-Bosse sind die Endbosse; Quest-Ziele bleiben gültig. Alte Dungeon-Zonen bleiben für
  Spielstände und die Mana-Risse erhalten.
- **Schwierigkeitsgrade** Normal, Schwer, Albtraum, Mythisch – nicht nur mehr Leben: neue Gegnermechaniken, zusätzliche
  Bossangriffe, Zusatzaufgaben, seltenere Belohnungen. Die Mana-Risse (0.5) bleiben und sind über das Portal erreichbar.
- **Abschluss:** Boss stirbt mit eigener Animation → Arena schließt sich → Belohnungsphase → Statistik → serverseitig
  gespeichert (genau einmal je Lauf und Spieler, auch bei Verbindungsabbruch) → die Gruppe kehrt gemeinsam durch ein Portal
  in den Hub zurück → dort Zusammenfassung mit direktem Weg zur Schmiede.
- **Ausrüstung:** zehn Plätze (Hauptwaffe, Zweithand/Schild, Helm, Brust, Handschuhe, Beine, Schuhe, Amulett, Ring, Ring),
  sechs Seltenheiten (neu: Mythisch), faire Verbesserung +0 bis +10 ohne Zerstörung oder Rückstufung, Sets mit Boni für
  2, 4 und alle Teile. Alte Gegenstände werden verlustfrei überführt.
- **Gruppen:** bis vier Spieler, Anführer, Bereitschaftsprüfung, gemeinsame Auswahl und gemeinsamer Start; jede Gruppe hat
  ihre Instanz; Wiederverbindung in die laufende Instanz. Beute bleibt persönlich.

### 5.2 Meilensteine

| Version | Inhalt |
|---|---|
| 0.9 | Quellwarte mit allen Einrichtungen; eine vollständige Expedition mit Mini-Boss und Endboss; Abschluss und Rückkehr |
| 0.10 | Alle Expeditionen, Schwierigkeitsgrade, wöchentliche Herausforderung, Bestzeiten; Ausrüstung mit zehn Plätzen |
| 0.11 | Endgame-Expeditionen, Balance über die neue Länge, Leistung |
