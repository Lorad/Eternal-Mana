# Game Design

## Vision

Ein klassisches Action-RPG in schräger Draufsicht: kurze, knackige Echtzeitkämpfe, in denen Positionierung und die
Ausweichrolle zählen; eine zusammenhängende Welt aus sechs Landstrichen; Dungeons mit Schlüsseln, Fallen, Rätseln und
Bossen, die man allein oder zu viert bestreitet. Welt, Figuren, Geschichte, Grafik und Musik sind eigenständig.

Aus der ersten, etwa sechsstündigen Geschichte (0.1) ist mit den Versionen 0.3 bis 0.7 ein großes Rollenspiel geworden.
Der Leitgedanke dabei: **wenige Währungen, keine Berufsstufen, alles ist verbunden** – Rohstoffe kommen aus Biomen,
Dungeons, Bossen und Ereignissen und fließen in Handwerk und Verbesserungen; Ruf, Sammlung und Geschichte schalten Rezepte,
Begleiter und Erscheinungen frei. Die verbindliche Leitlinie des Ausbaus (mit der ganzen Handlung) ist `docs/ROADMAP.md`.

## Überblick der Systeme

| System | seit | Wo man ihm begegnet | Abschnitt |
|---|---|---|---|
| Kampf, Klassen, Stufen, Beute, sechs Regionen und Dungeons (Akt I) | 0.1 | von der ersten Minute an | Welt · Dungeons · Bosse · Klassen · Kampf · Beute |
| Handwerk an vier Stationen, Sets, Legendäre Waffen, Runen | 0.3 | Schmiede, Alchemistin, Lagerfeuer, Gelehrte – als Zeile im Gespräch | Handwerk |
| Schwächen, Resistenzen, Zustände je Element, Reaktionen | 0.3 | Zielanzeige oben im Bild, Bossleiste | Elemente |
| Akt II, Gespräche mit Auswahl, Entscheidungen, Filmszenen, Chronik | 0.4 | nach dem Hohlen König wieder in Quellhain; Chronik im Questlog | Geschichte |
| Mana-Risse, Boss-Echos, Prüfung der Sieben, Quellstufen, Neuer Kreis | 0.5 | Riss-Stein in Quellhain, Knopf unter dem eigenen Rahmen | Endspiel |
| Ruf, Ereignisse, Weltbosse, seltene Monster, Schätze, Tagesläufe, Jahreszeiten | 0.6 | Fenster „Ruf und Welt“ (U), Anzeige rechts im Bild, Karte | Lebendige Welt |
| Hof mit Lagertruhe, Trophäen, Begleiter, Sammlung, Erscheinungen | 0.7 | Mirelda, Wegweiser in Quellhain, Fenster „Sammlung“ (B) | Zuhause |
| Gruppenverwaltung, Handel, Quest teilen, Gruppentruhe, Ansehen | 0.7.1 | Fenster „Gruppe“ (P), Menü an jedem Mitspieler | Gemeinsam |
| Handbuch, Hinweise, einheitliches HUD, Gamepad in allen Fenstern, „Blitze reduzieren“ | 0.8 | Taste H, Menü, Einstellungen | Bedienung und Hilfen |

Was der Spieler selbst nachlesen kann, steht im **Handbuch** im Spiel (Taste H) – dessen Zahlen stammen aus denselben
Tabellen wie die Spielregeln (`shared/src/config.ts`, `shared/src/data/*`) und können deshalb nicht veralten. Dieses Dokument
beschreibt Absicht und Zusammenhang; wo es Zahlen nennt, ist im Zweifel der Code maßgeblich.

## Geschichte

Unter der Welt entspringt die **Ewige Quelle**; aus ihr fließt das Mana der sechs Elemente. Sechs Siegel halten sie im
Gleichgewicht. In Quellhain sinkt der Brunnen – die Quelle versiegt, Geschöpfe werden bösartig, alte Wächter erwachen.
Der Spieler, ein **Quellgänger**, sammelt die Siegel der Erde, des Lichts, des Feuers, des Wassers und des Windes und
erfährt dabei, was die Chroniken verschweigen: Es gab einen siebten Hüter. **Morvain** trank die Quelle, um seine sterbende
Tochter Maelis zu retten. Seither sitzt er als **Hohler König** im Schattenreich und hält die Quelle in sich fest, damit
Maelis' Echo nicht vergeht. Ihn zu besiegen bringt das Wasser zurück – und lässt Maelis gehen.

**Akt II (ab 0.4, Kapitel 7–10 und Epilog):** Mit den sechs Siegeln am Brunnen hat der Quellgänger – ohne es zu wissen –
sechs der sieben Mana-Kristalle wieder vereint. Die Quelle *ist* ein Wesen: **Aetherion**, der Träumer am Grund. **Vael**, der
letzte der Ersten Hüter, bewacht seinen Schlaf seit tausend Jahren und prüft den Spieler, statt ihn zu töten. Unter dem
Brunnen liegt der **Quellgrund** und darin das **Herz der Quelle**; der Kampf dort richtet sich gegen Aetherions Albtraum,
nicht gegen das Wesen. Am Ende steht eine Entscheidung mit drei Ausgängen (versiegeln, befreien – und ein verborgener dritter
für alle, die die Hüter-Erinnerungen, Fenwicks Lied und Maelis’ Wiegenlied gefunden haben). Sie bleibt gespeichert und
verändert Epilog und Gespräche.

Erzählt wird über Questdialoge (jede Figur hat eine eigene Stimme), **Gesprächsthemen mit Auswahl** (der Server führt den
Gesprächsbaum; Antworten mit „!“ sind Entscheidungen), **Filmszenen** mit Kapitelkarten (überspringbar – erst beim zweiten
Tastendruck; wer zuschaut, ist geschützt), die **Chronik** (Schriftstücke in der Welt, gesammelt im Questlog), Inschriften und
Zwischenrufe der Bosse. Umfang: 88 Quests (32 Haupt-, 49 Nebenquests samt Charakter- und Geheimquests, 6 wiederholbare
Aufträge, 1 Gruppenquest), 6 Entscheidungen, 25 Filmszenen, 49 Chronik-Dokumente, 22 Figuren mit Gespräch.

## Welt

| Gebiet | Stufe | Charakter | Dungeon · Boss | Zugang |
|---|---|---|---|---|
| Grünwald (Dorf Quellhain) | 1–5 | Wald, Weiher, Dorf | Wurzelgruft · Dornenmutter | Start |
| Kristallhöhlen | 6–10 | dunkle Höhle, leuchtende Kristalle | Tiefe Geode · Kristallkoloss | nach „Was unter dem Baum schläft“ |
| Glutlande | 11–15 | Asche, Lavaseen, Glutboden | Aschenschmiede · Ignarok | nach „Der Berg bewegt sich“ |
| Frostgebirge | 16–20 | Schnee, Eis, Schneestürme | Gletscherdom · Ysolde | nach „Der Schlackenwurm“ |
| Verlorene Ruinen | 21–25 | antike Stadt der Hüter | Archiv der Stille · Der Archivar | nach „Die Frostweberin“ |
| Schattenreich | 26–30 | Kehrseite der Quelle | Thron der Leere · Der Hohle König | nach „Archiv der Stille“ |
| ↳ Vaels Wacht (Akt II) | 34–36 | Dungeon im Schattenreich | Vael, Hüter der Dunkelheit | Kapitel 9 |
| Quellgrund (Akt II) | 35–38 | unter dem Brunnen von Quellhain | Herz der Quelle (38–40) · Aetherion / „Die Große Stille“ | Kapitel 10 |

Die Höchststufe ist 40. Danach füllt Erfahrung Quellstufen (Endspiel), und in einem Neuen Kreis steigen die Stufen aller
Gebiete mit.

Jedes Gebiet hat eigene Bodengrafik und Deko, vier eigene Gegnertypen, eigenes Musikstück und Ambiente, eigenes Wetter,
einen Rohstoff, ein Lager mit NPCs und Quellstein, bewachte Truhen an besonderen Orten, fünf versteckte Quellsplitter und
zwei geheime Haine hinter brüchigen Felsblockaden. Die Oberwelt folgt einem zwölfminütigen Tag-Nacht-Zyklus; Höhlen und
Dungeons sind dauerhaft dunkel und werden von Feuerschalen, Kristallen und den Spielern selbst beleuchtet.

**Quellsteine** heilen, setzen den Wiedereinstiegspunkt und erlauben Schnellreise zwischen allen aktivierten Steinen.
**Quellsplitter** erhöhen dauerhaft Leben und Mana; Fenwick belohnt 5, 15 und alle 30.

## Dungeons

Dungeons werden aus einem festen Seed erzeugt (jeder Dungeon sieht immer gleich aus) und bestehen aus 6–12 Räumen:

- **Kampfräume** mit Gegnergruppen, teils mit Flüssigkeitsbecken oder Gefahrenboden.
- **Fallenräume** mit getakteten Stachelreihen und Geschoss-Statuen.
- **Schlüsselraum:** Eine bewachte Truhe enthält den Schlüssel für die verschlossene Tür auf dem Hauptweg.
- **Rätselraum** (optional, mit versiegelter Bonustruhe): Fackeln in der richtigen Reihenfolge entzünden
  (Wurzelgruft, Gletscherdom), Hebelkombination nach einem Leuchtstein-Hinweis (Tiefe Geode, Archiv) oder fünf
  Druckplatten gleichzeitig aktiv halten (Aschenschmiede, Thron der Leere – allein per Sprint, zu mehreren aufgeteilt).
- **Geheimraum** hinter einer brüchigen Felsblockade mit Truhe und Quellsplitter.
- **Bossraum:** Das Tor schließt sich, sobald der Kampf beginnt. Scheitert die Gruppe, setzt sich der Boss zurück.

Leere Dungeons werden nach 90 Sekunden zurückgesetzt und sind beliebig wiederholbar; der erste Sieg gibt volle, jeder
weitere 40 % der Boss-Erfahrung, dazu jedes Mal eine goldene Truhe.

## Expeditionen (0.9)

Seit 0.9 sind die Dungeons der sechs Regionen **Expeditionen**: große, mehrteilige Karten (16–21 Abschnitte) für 15–30 Minuten.
Die Dungeon-Eingänge der Oberwelt führen in die Expedition ihrer Region (Normal, eigene Instanz der Gruppe); das Portal in der
Quellwarte (bis dahin: das kleine Portal in Quellhain) führt in alle freigeschalteten. Die alten Dungeons oben bleiben für die
Mana-Risse erhalten.

| Expedition | Region | Stufe | Endboss | Signatur | Ereignis | Mini-Bosse |
|---|---|---|---|---|---|---|
| Die Wurzeltiefe | Grünwald | 5 | Dornenmutter | Dornenknospen schützen sie – erst die Knospen | Hinterhalt (vier Wellen) | Sporenkönig Pfifferling, Borkenmutter |
| Die Singende Tiefe | Kristallhöhlen | 10 | Kristallkoloss | Ansturm in eine Prismensäule locken | Finsternis (drei Lichtsteine) | Glasmaul, Glimmerkönigin |
| Die Gießerei der Ersten | Glutlande | 15 | Ignarok | Glut steigt – Kühlkette ziehen, sonst Ausbruch | Einsturz-Jagd über den Steg | Schlackenvogt, Mutter Asche |
| Der Webstuhl aus Eis | Frostgebirge | 20 | Ysolde | „Halt still“ – wer sich bewegt, friert ein | Flut (drei Ventile) | Reifriese Hjalmar, Die Weiße Wache |
| Die Unteren Archive | Verlorene Ruinen | 25 | Der Archivar | „Eintrag“ am Tintenfass streichen | Hinterhalt | Kustos Vierzehn, Die Fußnote |
| Der Hof der Hohlen Krone | Schattenreich | 30 | Der Hohle König | bei Maelis’ wanderndem Licht stehen | Einsturz-Jagd | Ritter ohne Krone, Die Mahrkönigin |
| Die Gestrichenen Seiten (geheim) | Verlorene Ruinen | 34 | Der Erste Schreiber | wie der Archivar | Finsternis | Die Fußnote, Kustos Vierzehn |

- **Abschnitte** nach einem Plan je Expedition: Eingang, Erkundung, Gegnergruppen, Kampfhallen, Fallen (Stacheln, Geschoss-Statuen,
  Gift, brüchiger Boden), Schlüssel und verschlossene Tür, Rätsel (Fackeln, Hebel, Platten, neu: **Runenscheiben**), ein zweiter Teil
  mit anderer Einrichtung und Gegnermischung, Erwachte, Rastplatz (Kontrollpunkt und Heilung), Arena, Belohnungskammer. Dazu
  Seitenflügel mit Mini-Bossen (mindestens einer freiwillig), eine Schatzkammer hinter einer rissigen Wand, seltene Abbaustellen,
  ein verborgenes Ausrüstungsversteck, Inschriften und die Chronik-Dokumente des alten Dungeons. Übergänge: Treppe, Brücke über
  einen Abgrund, Tor, Stollen, verschlossene Tür.
- **Endbosse:** Phasen bei 60 % und 25 % mit kurzem Filmmoment (unverwundbar, Worte, die Arena verändert sich), eigene Arena je Region,
  eine Signaturmechanik, die man lernen muss.
- **Schwierigkeitsgrade:** Normal → Schwer (nach einem Normal-Abschluss; Erwachte mit einem Affix, mehr Gegner, zusätzlicher Bossangriff,
  Truhe ohne Tod) → Albtraum (Stufe 40 und Schwer geschafft; zwei Affixe, Helfer je Bossphase, Wut nach fünf Minuten, Truhe unter der
  Richtzeit) → Mythisch (nach Albtraum; drei Affixe, Wut nach knapp vier Minuten, Signatur öfter). Beute je Grad besser, bis zur
  höchsten Seltenheit (`RARITY_NAME.length`).
- **Abschluss:** Belohnung genau einmal je Lauf und Charakter (Erfahrung, Gold, zwei Ausrüstungsteile, Rohstoffe der Region,
  Boss-Unikat beim ersten Mal, Trophäe je erstem Abschluss eines Grades, selten der besondere Fund der Expedition, Chance auf
  Legendär), Statistik, gemeinsame Rückkehr durch ein Portal (oder nach 60 Sekunden), Zusammenfassung mit Weg zur Schmiede.
  Bestzeiten und Abschlüsse je Grad, Geheimnisse und Mini-Bosse stehen in `CharData.expeditions`.
- **Wochenherausforderung:** je ISO-Woche eine Expedition, ein Grad und zwei Modifikatoren; einmal je Woche anderthalbfache
  Belohnung und zwei Teile mehr.
- **Erfahrung:** Alle Gegner einer Expedition zusammen bringen doppelt so viel wie die des alten Dungeons ihrer Region – eine
  Expedition auf Normal hebt bei empfohlener Stufe um gut zwei Stufen.

## Bosse

Jeder Boss hat drei Phasen (bei 66 % und 33 % Leben) und eigene Mechaniken:

| Boss | Element | Besonderheiten |
|---|---|---|
| Dornenmutter | Erde | steht fest; Sporenfächer, Wurzeln unter den Füßen, ruft Wurzelschleicher, Dornenringe mit Lücke, Sporenspirale |
| Kristallkoloss | Licht | langsamer Verfolger; Bodenschlag mit Felssplittern, Felsbrocken, Sturmangriff – rammt er die Wand, ist er 2,5 s lang verwundbar (+60 % Schaden), Kristallregen mit Lichtkreuz |
| Ignarok | Feuer | Feueratem-Schwenk, Lavapfützen, gräbt sich ein und bricht woanders hervor, Meteorhagel, Feuerringe mit wandernder Lücke |
| Ysolde | Wasser | teleportiert; Eisfächer, verlangsamende Schneefelder, Eislanzen auf jeden Spieler, Spiegelbilder, „Absoluter Stillstand“: raumweiter Angriff, nur in zwei Lichtkreisen überlebt man |
| Der Archivar | Wind | rotierendes Strahlenkreuz, schwächende Kugeln, Schachbrett-Einschläge, Dreifachspirale, „Löschung“ mit sicheren Zonen |
| Der Hohle König | Dunkelheit | Phase 1 Duellant mit Sturmhieben; Phase 2 wechselt reihum durch fünf Elemente (und damit seine Schwäche) mit je eigenem Angriff; Phase 3 Leere: Raumangriff mit Lichtkreisen, Vierfachspirale, Leerenbrut |
| Vael (Akt II) | Dunkelheit | eine Prüfung, kein Kampf auf Leben und Tod: Er wird nicht getötet und bleibt danach in Ruhepose stehen |
| Aetherion – „Die Große Stille“ (Akt II) | wechselnd | wandert durch alle sechs Elemente und damit durch Schwächen und Angriffe; auch er stirbt nicht |

Wechselt ein Boss nur das Element, blitzt nicht jedes Mal das ganze Bild: Den Bildschirmblitz gibt es beim Phasenwechsel und
sonst höchstens alle paar Sekunden; mit „Blitze reduzieren“ (Einstellungen) bleibt nur ein weicher Schleier.

## Klassen

| Klasse | Rolle | Standardangriff | Aktive Fähigkeiten |
|---|---|---|---|
| Krieger | Nahkampf, robust | Schwertkombo (3. Hieb stärker) | Wuchtschlag, Wirbelklinge, Sturmangriff, Kriegsschrei, Erdspalter, Glutschneise |
| Magier | Flächenschaden | Arkangeschoss | Feuerball, Frostfächer, Blinzeln, Sturmlanze, Eissturm, Meteor |
| Waldläufer | Fernkampf, beweglich | Pfeile | Fächerschuss, Giftpfeil, Rücksprung, Dornenfalle, Pfeilhagel, Sturmpfeil |
| Paladin | Heilung, Schutz | Hammerkombo | Lichtschlag, Heilendes Licht, Schildwall, Hammer des Urteils, Weihe, Zorn der Quelle |
| Schattenjäger | schnell, kritisch | Dolchstöße | Meuchelstoß, Klingenfächer, Schattenschritt, Toxinstoß, Todesmal, Schattentanz |

Jede Klasse hat einen Skilltree mit sechs aktiven und drei passiven Fähigkeiten (je bis Rang 5 bzw. 3), eigene
Grundwerte, eine eigene Waffengattung und Rüstungsklasse sowie eigene Sprites und Angriffsanimationen. Pro Stufe gibt es
drei Attributspunkte (Stärke, Geschick, Intelligenz, Vitalität) und einen Fähigkeitspunkt. Fenwick setzt beides gegen Gold zurück.

## Kampf

- **Ausweichrolle** mit kurzer Unverwundbarkeit; gegnerische Angriffe werden angekündigt (Ausholpose, rote Bodenmarkierungen).
- **Elemente:** Feuer › Wind › Erde › Wasser › Feuer, Licht ‹› Dunkelheit. Stark ×1,5, schwach ×0,65, gleiches Element ×0,5.
  Elementartreffer können Zustände auslösen: Brennen, Verlangsamen, Betäuben, Schwächen, Zeichnen; dazu Gift.
- **Kritische Treffer** aus Geschick und Ausrüstung. Waffen können ein Element tragen.
- **Gegnerverhalten:** Nahkämpfer, Hüpfer, Sturzflieger, Stürmer mit Anlauf, Fernkämpfer, Flächenzauberer, Teleportierer;
  Rudel alarmieren sich; **Erwachte** (Elite) sind stärker und lassen bessere Beute fallen.
- Tod: Wiedereinstieg am Quellstein bzw. Dungeoneingang, 5 % Goldverlust. Mitspieler können wiederbeleben.

## Beute und Ausrüstung

Fünf Slots (Waffe, Kopf, Rüstung, zwei Accessoires), fünf Seltenheitsstufen (Gewöhnlich bis Legendär) mit 0–4 zufälligen
Affixen, sechs Materialstufen. Bosse lassen benannte Elementarwaffen für die eigene Klasse fallen. Schmiede verbessern
Ausrüstung bis +10 gegen Gold und den Rohstoff der passenden Stufe; ab +4 kann ein Versuch scheitern (Material weg,
Gegenstand bleibt). Händler verkaufen Tränke und Grundausrüstung.

## Handwerk (0.3)

Bewusst schlank: keine Berufsstufen, keine eigene Währung – nur Rezept, Rohstoffe, Gold, Stufe und die richtige Station.

- **Rohstoffe:** Je Gebiet ein Monster-Rohstoff (von allen Gegnern dort) und eine Zutat (Gegner und als Beifang an
  Abbaustellen) zusätzlich zum vorhandenen Erz/Kraut; sechs **Element-Essenzen** (von Gegnern des Elements, Erwachte
  garantiert mehrere); je Boss ein **Bosskern** (erster Sieg garantiert, danach 30 %); **Ätherstaub** (Bosse selten,
  Erwachte sehr selten). Beute bleibt persönlich.
- **Stationen:** Schmiede (Borin, Hedda, Rakhan, Pim), Alchemie (Sella, Pim), Kochstelle (Lagerfeuer in Dorf und Lagern,
  Ayla, Jorund, Rakhan), Verzauberung (Fenwick, Liora). Im Schattenreich brennt kein Feuer.
- **Schmiede:** Ausrüstung der eigenen Klasse auf der Materialstufe schmieden (Mindestseltenheit „Ungewöhnlich“,
  Meisterstücke „Selten“), **umschmieden** (Affixe neu würfeln), **Element einschmieden** (Stufe 1–3 mit Essenzen; Stufe 3
  braucht den Bosskern des Elements), Setteile mit Bosskern, Legendäre Waffen. Verbessern bis +10 bleibt wie bisher.
- **Alchemie:** Tränke bis zur vierten Stufe, Läuterungstrank, **Elixiere** (eines gleichzeitig, 5 Minuten): Verteidigung,
  Tempo, Krit, Angriff und je Element ein Schutzelixier.
- **Kochen:** **Speisen** (eine gleichzeitig, 15 Minuten) aus den Zutaten der Gebiete; das **Quellhainer Festmahl** stärkt
  auch Gruppenmitglieder in der Nähe. Speise und Elixier überstehen Tod und Abmelden.
- **Verzauberung:** genau eine Rune je Ausrüstungsteil, bezahlt mit Essenzen (Angriff, Krit, Lebensraub, Leben,
  Verteidigung, Mana, Resistenzen, Tempo, Abklingzeit …).
- **Rezepte** sind von Anfang an bekannt oder werden über **Rezeptrollen** gelernt (Erwachte, Truhen, Bosse; später Quests
  und Ruf): Meisterwaffen, Schutzelixiere, Festmahl.
- **Rüstungssets** (sechs, je Dungeon eines): Kopf, Rüstung, Reif, Anhänger; Boni bei 2 und 4 Teilen. Schmuck aus den
  Truhen des Dungeons (Bosstruhe: beim ersten Mal garantiert), Kopf und Rüstung mit Bosskern schmiedbar.
- **Legendäre Waffen** (eine je Klasse, aus allen sechs Bosskernen und Ätherstaub, bei Borin oder Rakhan):
  Krieger *Sechsklang* – jeder vierte Treffer entfesselt eine Schockwelle · Magier *Wogenruf* – Reaktionen treffen härter
  und häufiger · Waldläufer *Echosehne* – kritische Treffer prallen ab · Paladin *Morgenwacht* – Heilungen legen Schilde ·
  Schattenjäger *Zwielichtfänge* – gezeichnete Ziele detonieren.

## Elemente (0.3)

- **Schwächen und Resistenzen:** Zusätzlich zum Kreislauf hat jeder Boss und fast jeder Gegner ausdrückliche Schwächen
  (×1,25) und manche Resistenzen (×0,8, auch gegen physischen Schaden). Die Zielanzeige oben im Bild und die Bossleiste
  zeigen beides. Spieler sammeln **Resistenzen** über Affixe, Runen, Sets und Elixiere (höchstens 50 %).
- **Zustand je Element:** Feuer – Brennen · Wasser – Verlangsamt · Erde – Betäubt · Wind – Entblößt (Treffer öfter
  kritisch) · Licht – Geschwächt (Ziel teilt weniger aus) · Dunkelheit – Gezeichnet. Dazu Gift, Verwurzelt, Eingefroren.
- **Reaktionen:** Trägt ein Ziel den Zustand eines Elements und wird von einem zweiten getroffen, reagieren beide:
  Feuersturm (Feuer+Wind), Frost (Wasser+Wind), Dampf (Feuer+Wasser), Schlamm (Erde+Wasser), Zwielicht (Licht+Dunkelheit),
  Sandsturm (Erde+Wind), Fäulnis (Erde+Dunkelheit), Quellsegen (Wasser+Licht). Danach ist das Ziel 3 s (Bosse 5 s)
  gesperrt; Bosse lassen sich nicht einfrieren oder festsetzen.
- **Zusammenspiel:** Stammen die beiden Elemente von verschiedenen Spielern, wirkt die Reaktion 50 % stärker und beide
  erhalten kurz „Einklang“ (+8 % Angriff).
- **Spielstile:** Jede Klasse erreicht über Fähigkeiten und ein eingeschmiedetes Element mindestens zwei Reaktionen
  (z. B. Krieger Feuersturm/Sandsturm, Magier Dampf/Frost/Feuersturm, Waldläufer Sandsturm/Frost, Paladin
  Zwielicht/Quellsegen, Schattenjäger Fäulnis/Zwielicht).

## Endspiel (0.5)

Für Charaktere, die die Geschichte abgeschlossen haben. Wenige Mechaniken, die in Handwerk, Sets, Legendäre Waffen und
Elemente zurückfließen.

- **Mana-Risse:** Nach dem Sieg über den Hohlen König erwacht der **Riss-Stein** in Quellhain. Dort wählt man (in einer
  Gruppe: wer sie anführt) einen der sechs Dungeons des ersten Akts und eine **Stufe** (1–30). Jeder Riss ist eine eigene
  Instanz der Gruppe. Gegner stehen über der Höchststufe (Stufe 42 bei Riss-Stufe 1, 100 bei Stufe 30), Leben und Schaden
  wachsen zusätzlich je Stufe. Wer Stufe n abschließt, schaltet n+1 frei (je Charakter; in der Gruppe alle Beteiligten).
- **Modifikatoren:** einer bis Stufe 9, zwei ab 10, drei ab 20 – ausgewürfelt aus zwölf und schon vor dem Betreten zu
  sehen. Nach jedem abgeschlossenen Riss mischen sie sich neu. *Glutspur* (brennender Boden), *Berstend* (Gegner
  zerplatzen), *Elementwoche* (alle tragen ein Element, widerstehen ihm, sind für das Gegenelement anfällig),
  *Finsternis* (halbes Licht, Gegner bemerken später), *Versiegt* (halbe Heilung), *Horden* (mehr, schwächere Gegner),
  *Erwachte Schar* (viele Erwachte), *Wuchernd* (Gegner heilen, außer sie brennen oder sind vergiftet), *Gehetzt*
  (schnellere Gegner), *Gläsern* (mehr Schaden erleiden, schnellere Fähigkeiten), *Manasturm* (Blitze auf den Standort),
  *Manadürre* (halbe Regeneration, doppeltes Mana aus Standardangriffen).
- **Boss-Echos:** Am Ende wartet das Echo des Dungeon-Bosses – blass eingefärbt, einheitlich stark und mit einer
  Zusatzmechanik: Dornensaat, Prismengitter, Schlackenbrut, Spiegelschritt, Schnellschrift, Kronenschatten.
- **Richtzeit und Lebensfunken:** Wer unter der Richtzeit bleibt, bekommt eine Bonustruhe; langsam zu sein beendet nichts.
  Die Gruppe teilt sich Lebensfunken (3, je weiterem Mitglied einer mehr): Wiederkehr am Eingang kostet einen, Aufhelfen
  durch Mitspieler nichts. Ohne Funken stößt der Riss Gefallene aus; fällt die ganze Gruppe, schließt er sich.
- **Belohnung** (persönlich): Ausrüstung über der alten Obergrenze (Gegenstandsstufe 40 + Riss-Stufe, anlegbar ab Stufe
  40), **Echo-Fragmente**, Ätherstaub, Setteile und das Boss-Unikat auf Riss-Stufe, Rezeptrollen.
- **Echo-Fragmente** fließen ins Handwerk: **Angleichen** an der Schmiede hebt Legendäre Waffen, Setteile und Boss-Unikate
  schrittweise auf die Beutestufe des höchsten abgeschlossenen Risses; vier **Echo-Runen** sind die stärksten
  Verzauberungen; sechs Fragmente lassen sich zu Ätherstaub verdichten.
- **Prüfung der Sieben:** ab abgeschlossener Stufe 15 – sieben Echos nacheinander in einem Raum (die sechs Bosse und das
  Echo der Wacht). Lohn: der Titel „Bezwinger der Sieben“ hinter dem Namen und das Rezept *Elixier der Sieben*.
- **Quellstufen:** Erfahrung über Stufe 40 hinaus füllt bis zu 60 Quellstufen; jede gibt einen Punkt für eine von sechs
  Bahnen (Angriff, Leben, Verteidigung, Abklingzeit, Resistenzen, Goldfund). Jeder weitere Punkt auf einer Bahn bringt
  weniger, bei zehn ist Schluss – voll ausgebaut sind es höchstens +6 % Angriff und +8 % Leben.
- **Neuer Kreis:** Nach dem Epilog beginnt bei Mirelda die Geschichte von vorn (bis zu drei weitere Kreise werden
  härter: kein Gegner unter Stufe 40/44/48, Bosse und Beute steigen mit). Es bleiben Stufe, Ausrüstung, Rezepte,
  Chronik, Quellsplitter, Quellstufen, Riss-Fortschritt und Titel; Quests, Entscheidungen, Bosssiege, Truhen und
  Quellsteine beginnen neu. Die gesehenen Enden und die Entscheidungen jedes Kreises bleiben vermerkt. Quests geben ab
  dem zweiten Kreis Echo-Fragmente statt Punkten. **Gruppen spielen in der Welt des Mitglieds mit dem niedrigsten Kreis.**

## Lebendige Welt (0.6)

Die Oberwelt ist nicht nur Kulisse zwischen zwei Dungeons. Alles hier belohnt persönlich – niemand nimmt jemandem etwas weg –
und läuft nur in Zonen, in denen gerade jemand ist.

- **Ruf bei sechs Fraktionen**, eine je Region (Übersicht: Fenster „Ruf und Welt“, Taste U). Quests, Ereignisse, seltene
  Monster, gehobene Schätze, Begegnungen und gespendete Rohstoffe bringen Ruf. Fünf Ränge (Fremd, Bekannt, Geachtet, Vertraut,
  Unentbehrlich) öffnen die Vorräte der Fraktion, Rezepte, einen Titel, ein einmaliges Schmuckstück und einen Nachlass bei
  allen Händlern der Region. Alte Spielstände bekommen den Ruf für erledigte Quests einmalig gutgeschrieben.
- **Ereignisse:** Mana-Woge, Sternenregen (nachts), die Fahrende Händlerin, Stolleneinsturz, Aschesturm, Schneesturmjagd –
  angesagt, rechts im Bild mit Ziel und Restzeit, auf der Karte markiert. Der Beitrag jedes Beteiligten bestimmt seine Stufe
  der Belohnung (Bronze, Silber, Gold).
- **Weltbosse** (Moosgrimm, Aschenmaul, Feldwebel Niemand) ziehen durch je zwei Regionen und werden mit jedem Mitkämpfer zäher.
  Die Anzeige rechts nennt Weltbosse anderer Regionen nur, wenn sie für die eigene Stufe in Reichweite sind.
- **Seltene Monster:** zwölf benannte Geschöpfe mit eigener Besonderheit, manche nur nachts, bei bestimmtem Wetter oder zu
  einer Jahreszeit; jedes hinterlässt eine Trophäe.
- **Schatzkarten:** im Inventar benutzen, dem Hinweis rechts im Bild folgen, an der Stelle graben.
- **Begegnungen am Weg:** Hinterhalt, verirrter Reisender, verletztes Tier, Duell.
- **Tagesabläufe und Jahreszeiten:** Dorfbewohner gehen mittags essen und abends heim (und bedienen trotzdem). Vier
  Jahreszeiten zu je 20 Minuten verändern Wetter, Licht, Abbaustellen und was sich draußen zeigt. Die Uhr der Jahreszeiten
  läuft nur, während der Server läuft.

## Zuhause (0.7)

Ein Ort, an dem zusammenläuft, was die anderen Systeme abwerfen. Alles hier gehört dem Profil, nicht dem einzelnen Charakter.

- **Hof am Waldrand:** Mirelda verkauft ihn für 400 Gold, sobald die Wurzelgruft erledigt ist. Jeder Hof ist ein eigener
  Ort – zu erreichen über den Wegweiser am Dorfrand von Quellhain und von jedem Quellstein aus. Gruppenmitglieder dürfen zu
  Besuch kommen: Stationen, Bett und Kleiderschrank stehen ihnen offen, die Truhe nicht.
- **Lagertruhe:** 24 Plätze für alle Charaktere des Profils, dazu Gold. So tauschen die eigenen Charaktere Dinge aus.
- **Ausbau** am Tisch auf dem Hof, mit Gold und Rohstoffen aus mehreren Regionen: *Vorratskammer* (48 Plätze, 3 Ständer) ·
  *Werkhof* (Schmiede, Alchemie, Kochstelle, Verzauberung auf dem Hof; 72 Plätze; braucht Rang „Geachtet“ in Quellhain) ·
  *Herdfeuer* (ein Bett: „Ausgeruht“ gibt 10 % mehr Erfahrung für 30 Minuten Spielzeit; 96 Plätze, 8 Ständer; braucht einen
  abgeschlossenen Mana-Riss der Stufe 5). Die Legendäre Waffe schmieden weiterhin nur Borin und Rakhan.
- **Trophäen:** 30 Stück – von den zwölf seltenen Monstern und drei Weltbossen (0.6), von den acht Bossen und sieben
  Wegzeichen (Riss-Stufen 10/20/30, Prüfung der Sieben, jedes der drei Enden). Auf Ständern ausgestellt sehen sie auch
  Besucher. Je ausgestellter ART gibt es einen kleinen Bonus für alle Charaktere des Profils – genau einmal, egal wie viele
  Ständer sie füllt: Jagd +3 % Goldfund · Weltboss +5 % Ruf · Boss +2 % Erfahrung · Wegzeichen: „Ausgeruht“ hält 50 % länger.
- **Begleiter:** Acht, jeder aus einem anderen Winkel des Spiels, jeder mit einer kleinen Eigenheit; sie kämpfen nicht.
  Moosling (Tobis Quest; sammelt Beute weiträumig ein) · Pilzling (an der Kochstelle gezogen; Lebensregeneration) ·
  Glutfuchs (Ruf bei den Aschennomaden; Feuerresistenz) · Schneeeule (Schatz im Frostgebirge; mehr Schatzkarten) ·
  Schattenkatze (seltenes Monster im Schattenreich; Goldfund) · Irrwisch (Weltboss; Manaregeneration) · Runenkäfer
  (Sammlung; Ruf) · Quelldrachling (verborgenes Ende oder Prüfung der Sieben; Erfahrung). Einer läuft mit, gewechselt
  wird jederzeit im Fenster „Sammlung“.
- **Sammlung:** Bestiarium (Schwächen zeigen sich nach acht Siegen, bei Bossen und benannten Gegnern nach dem ersten; Beute,
  sobald man sie einmal besessen hat), Fundstücke (Legendäre Waffen, Setteile, Boss-Unikate), Rezepte, Trophäen, Begleiter,
  Erscheinungen. Elf Meilensteine bringen fünf Titel, dreimal zwölf Lagerplätze, einen Begleiter, einen Waffenglanz und
  das Goldene Gewand. Alte Spielstände werden beim ersten Betreten nachgetragen.
- **Erscheinungen:** *Gewand* (fünf Varianten des Klassen-Sprites: Wald, Frost, Glut, Schatten, Gold) und *Waffenglanz*
  (neun Farben für Hieb und Geschoss) – freigeschaltet über Ruf, Riss-Stufen, Enden und die Sammlung, angelegt am
  Kleiderschrank eines Hofs, für andere Spieler sichtbar. Rein kosmetisch.

## Gemeinsam (0.7.1)

Bis zu vier Spieler bilden eine Gruppe; beliebig viele teilen sich einen Server. Die Regeln im Einzelnen stehen in
[MULTIPLAYER.md](MULTIPLAYER.md) – hier nur die Grundsätze:

- **Beute ist immer persönlich** (jeder würfelt für sich, passend zur eigenen Klasse); Erfahrung, Kill-Zähler, Questziele,
  Ereignisse und Weltbosse zählen für alle Gruppenmitglieder in der Nähe.
- **Die Gruppe hat einen Anführer** (lädt ein, entfernt, ernennt, öffnet Mana-Risse); die Führung geht von selbst weiter,
  wenn er ausfällt. Ein Platz bleibt nach einem Verbindungsabriss fünf Minuten frei.
- **Handel** ist ein Tausch in einem Zug mit Sperren und Bestätigen auf beiden Seiten; gebundene Gegenstände (Quest, Legendäre
  Waffen, Trophäen, manche Rezepte) und alles, was dem Profil gehört, sind ausgenommen.
- **Quest teilen**, **Gruppentruhe** nach Dungeon- und Riss-Bossen, **Ansehen** anderer Spieler, **Besuch auf dem Hof**.
- Gegner werden mit jedem weiteren Spieler in der Nähe zäher; Reaktionen aus den Elementen zweier Spieler wirken stärker.

## Bedienung und Hilfen (0.8)

Das Spiel soll sich von jemandem lernen lassen, der es nie gesehen hat – ohne Tutorial-Wand.

- **Hinweise** (`client/src/state/hints.ts`): eine kurze Karte über der Aktionsleiste in dem Moment, in dem ein System zum
  ersten Mal wichtig wird – der erste Auftrag, der erste Kampf, Stufenaufstieg, neue Ausrüstung, Quellstein, Station,
  Dungeon, Boss, Schwächen, Chronik, Entscheidung, Riss-Stein, Quellpunkt, Ereignis, Ruf, Schatzkarte, Hofkauf, Lagertruhe,
  Kleiderschrank, Begleiter, Sammlung, Gruppe, Handel, volles Inventar. Jeder erscheint einmal je Profil, lässt sich
  wegklicken, führt auf Wunsch ins passende Kapitel des Handbuchs und verschwindet nach kurzer Zeit von selbst. Abschaltbar
  in den Einstellungen.
- **Handbuch** (Taste H oder F1, Menü, Hauptmenü; `client/src/ui/handbuch.tsx`): 15 Kapitel, je System eine Seite. Zahlen,
  Listen und Namen kommen aus den Spieldaten.
- **Tasten:** alle Aktionen in vier Gruppen (Bewegung, Kampf, Fenster, Sonstiges), frei belegbar; eine Taste gehört immer
  nur einer Aktion, Esc schließt immer das oberste Fenster. Neu: Handbuch, Questverfolgung ein-/ausklappen, Leistungsanzeige.
- **HUD mit Rangfolge:** Die rechte Spalte zeigt von oben nach unten Karte → Riss-Anzeige → Ereignisse hier →
  Questverfolgung → Weltbosse anderswo. Die Questverfolgung zeigt nur offene Ziele, nimmt den Platz, der übrig bleibt, und
  klappt im Mana-Riss und im Bosskampf von selbst zu einer Zeile zusammen (Taste T oder ein Klick klappt sie auf).
- **Fenster** passen bei 1280×720, 1000×560 und im Hochformat ins Bild; Kopfzeilen sind einzeilig (Titel · Reiter · Gold ·
  Schließen), im schmalen Fenster stehen die Reiter als eigene Zeile darunter.
- **Gamepad:** Der Fokus bleibt im obersten Fenster; jedes Fenster ist über das Menü (Start) erreichbar, auch offene
  Anfragen (Einladung, Handel, geteilte Quest); Beträge lassen sich mit Knöpfen einstellen, Schieberegler mit links und
  rechts, den Namen eines neuen Charakters schlägt „Name würfeln“ vor. Der Chat und das Umbelegen von Tasten brauchen eine
  Tastatur – das steht auch im Handbuch.
- **Verträglichkeit:** „Blitze reduzieren“ ersetzt Bildschirmblitze durch einen weichen Schleier, dämpft Bildschirmwackeln
  und Lichtblitze und nimmt der Oberfläche pulsierende Flächen; „Bildschirmwackeln“ lässt sich getrennt ganz abschalten.
- **Niedrige Bildrate:** Die eigene Figur bewegt sich bis hinunter zu 4 Bildern pro Sekunde in Echtzeit (und für den Server
  gültig); die Leistungsanzeige (F3) hilft beim Eingrenzen.
- **Wenn etwas schiefgeht**, gibt es immer eine Meldung und einen Weg weiter: Verbindung weg, Server neu gestartet oder
  aktualisiert, Speichern gescheitert, Zone oder Grafik nicht ladbar, Fehler in der Darstellung.

## Balancing

Alle Stellschrauben liegen zentral in `shared/src/config.ts` (Levelkurve, Gegnerformeln, Schadensminderung,
Elementfaktoren, Beutechancen, Seltenheitsgewichte, Verbesserungskosten, Mehrspieler-Skalierung, Wiedereinstiegsregeln)
und in den Datentabellen unter `shared/src/data/` (Klassen, Fähigkeiten, Gegner, Bosse, Gegenstände, Zonen, Quests).
Ein automatischer Test prüft für alle Klassen auf den Stufen 1, 10, 20 und 30, dass „Treffer bis zum Sieg“ und
„Treffer bis zum Tod“ in einem fairen Korridor bleiben.

## Balance (Stand 0.8)

Bis 0.7 waren alle Zahlen gerechnet. Seit 0.8 misst ein Spieltest sie: `npx tsx scripts/playtest.ts [Abschnitt …] [--schnell]`
(Abschnitte: `tempo`, `bosse`, `gebiete`, `dungeons`, `wirtschaft`, `kraft`, `risse`, `welt`; Spielermodell in
`scripts/playtest/model.ts`). Bots kämpfen dabei im echten Server-Code ohne Unverwundbarkeit und ohne Entwicklerbefehle: Sie
laufen, greifen an, nutzen ihre Fähigkeiten, weichen markierten Angriffen mit Reaktionszeit und Fehlerquote aus und trinken
Tränke mit der echten Abklingzeit. Ausrüstung entspricht dem, was man an der Stelle plausibel besitzt, nicht dem Besten.

Drei Spielertypen: **sorgfältig** (Reaktion 0,25 s, übersieht 3 % der Markierungen), **durchschnittlich** (0,35 s, 10 %),
**unachtsam** (0,55 s, 30 %).

### Zielkorridore

- Sorgfältige Spieler schaffen jeden Story-Boss allein; niemand stirbt gezwungen (kein unausweichlicher Schaden).
- Durchschnittliche Spieler schaffen jeden Story-Boss in mindestens 90 % der Versuche; Unachtsamkeit wird nach hinten hin
  spürbar bestraft.
- Bosskämpfe dauern lang genug für alle drei Phasen (rund 40 s am Anfang, rund 100 s am Ende).
- Gruppenspiel lohnt sich, ist für die Geschichte aber nie nötig.
- Die schwächste Klasse liegt im Schaden bei mindestens 60 % der stärksten (vor 0.8: 47 %).
- Lebensraub ist gedeckelt; Heilzauber heilen je Wirken höchstens einen Teil des Lebens.

Die wichtigsten Korridore bewacht `tests/balance.test.ts`: Wer später etwa den Bossschaden verdoppelt, bekommt einen roten Test.

### Messung: Story-Bosse allein (schneller Lauf, fünf Klassen)

| Boss | Stufe Boss / Spieler | Sieg sorgfältig | Sieg durchschn. | Sieg unachtsam | Dauer (s) | Tränke |
|---|---|---|---|---|---|---|
| Dornenmutter | 6 / 6 | 100 % | 100 % | 90 % | 43 | 0,6 |
| Kristallkoloss | 12 / 11 | 100 % | 100 % | 95 % | 48 | 0,5 |
| Ignarok | 17 / 16 | 100 % | 100 % | 70 % | 61 | 1,4 |
| Ysolde | 22 / 21 | 100 % | 100 % | 95 % | 66 | 1,4 |
| Der Archivar | 27 / 26 | 100 % | 100 % | 75 % | 75 | 2,5 |
| Der Hohle König | 33 / 31 | 100 % | 100 % | 45 % | 93 | 3,4 |
| Vael | 38 / 37 | 100 % | 90 % | 45 % | 99 | 2,8 |
| Aetherion | 40 / 40 | 100 % | 95 % | 25 % | 105 | 3,3 |

Zu zweit (durchschnittlich) gewinnen alle geprüften Paare jeden Boss ohne Tod, in rund 70 % der Zeit.
Ganze Dungeon-Durchläufe gelingen durchschnittlichen Spielern fast immer; unachtsame scheitern ab der Aschenschmiede häufiger.

### Messung: Tempo

Wer Nebenaufgaben größtenteils erledigt, kommt jeweils etwa eine Stufe über dem Boss an und erreicht Stufe 40 vor Akt II,
Kapitel 10. Wer nur der Hauptlinie folgt, steht ein bis fünf Stufen unter dem Boss – machbar, aber spürbar schwerer;
Nebenaufgaben lohnen sich also, ohne Pflicht zu sein.

### Was 0.8 geändert hat und warum

| Wert | vorher | nachher | Grund |
|---|---|---|---|
| Gegnerleben `enemy.hp` (Stufe 40) | 2670 | 4036 | gewöhnliche Gegner fielen nach ein bis zwei Treffern |
| Gegnerschaden `enemy.dmg` (Stufe 40) | 110 | 152 | Gegner taten nichts; Tränke waren überflüssig |
| Elitegegner Leben | ×2,4 | ×3 | Elite kaum von normalen Gegnern zu unterscheiden |
| Schonfrist nach Geschosstreffer | – | 0,3 s | Salven trafen mit jedem Geschoss, kaum auszuweichen |
| Heilzauber je Wirken | unbegrenzt | höchstens 35 % des Lebens | Paladin und Heilendes Licht machten Bosse belanglos |
| Lebensraub | unbegrenzt | höchstens 4 % | Lebensraub-Stapel hielten unbegrenzt am Leben |
| Legendär Magier (Reaktion) | ×2, Abklingzeit −1,5 s | ×3, −2 s | wirkte im Einzelkampf kaum |
| Legendär Waldläufer (Abpraller) | 60 % / 22 % | 50 % / 18 % | deutlich stärker als die übrigen |
| Legendär Paladin (Schild) | 30 %, 6 s | 50 %, 8 s, +8 Angriff | rein defensiv und zu schwach |
| Riss-Schaden je Stufe | +2,5 % | +4 % | die Kurve war bis Stufe 25 flach und stieg dann abrupt |
| Riss-Richtzeit | 150 s + 42 s je Raum + 4 s je Stufe | 60 s + 10 s je Raum + 11 s je Stufe | Bonustruhe gab es praktisch immer |
| Boss-Echos | Leben ×17, Schaden ×1,5 | Leben ×46, Schaden ×1,9 | Echos fielen schneller als ihre normalen Vorbilder |
| Prüfung der Sieben | Leben ×0,6 | ×0,4 | sieben Echos hintereinander waren mit den neuen Echos zu lang |
| Neuer Kreis | +4 Stufen je Kreis | +10 | ein höherer Kreis war kaum zu spüren |
| Vael, Aetherion | – | schärfere Muster, Spiralen mit Lücken | Spiralen hatten Stellen ohne Ausweg |

Dazu Feinheiten an Fähigkeiten (`shared/src/data/skills.ts`), Weltbossen und seltenen Monstern (zäher).

### Was der Spieltest nicht beurteilen kann

Gefühl, Lesbarkeit und Ton; ob Muster auf dem Bildschirm gut erkennbar sind; Bedienung mit Gamepad; echte Netzverzögerung;
Lernen über mehrere Versuche. Das Spielermodell ist eine Näherung – seine Zahlen sind Vergleichswerte, keine Versprechen.
