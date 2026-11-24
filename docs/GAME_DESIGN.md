# Game Design

## Vision

Ein klassisches Action-RPG in schräger Draufsicht: kurze, knackige Echtzeitkämpfe, in denen Positionierung und die
Ausweichrolle zählen; eine zusammenhängende Welt aus sechs Landstrichen; Dungeons mit Schlüsseln, Fallen, Rätseln und
Bossen, die man allein oder zu viert bestreitet. Welt, Figuren, Geschichte, Grafik und Musik sind eigenständig.

## Geschichte

Unter der Welt entspringt die **Ewige Quelle**; aus ihr fließt das Mana der sechs Elemente. Sechs Siegel halten sie im
Gleichgewicht. In Quellhain sinkt der Brunnen – die Quelle versiegt, Geschöpfe werden bösartig, alte Wächter erwachen.
Der Spieler, ein **Quellgänger**, sammelt die Siegel der Erde, des Lichts, des Feuers, des Wassers und des Windes und
erfährt dabei, was die Chroniken verschweigen: Es gab einen siebten Hüter. **Morvain** trank die Quelle, um seine sterbende
Tochter Maelis zu retten. Seither sitzt er als **Hohler König** im Schattenreich und hält die Quelle in sich fest, damit
Maelis' Echo nicht vergeht. Ihn zu besiegen bringt das Wasser zurück – und lässt Maelis gehen.

Erzählt wird über Questdialoge (jeder NPC hat eine eigene Stimme), Story-Einblendungen bei jedem Siegel, Inschriften in
der Welt und Zwischenrufe der Bosse. 18 Hauptquests, 14 Nebenquests, 6 wiederholbare Aufträge, 1 wiederholbare Gruppenquest.

## Welt

| Gebiet | Stufe | Charakter | Dungeon · Boss | Zugang |
|---|---|---|---|---|
| Grünwald (Dorf Quellhain) | 1–5 | Wald, Weiher, Dorf | Wurzelgruft · Dornenmutter | Start |
| Kristallhöhlen | 6–10 | dunkle Höhle, leuchtende Kristalle | Tiefe Geode · Kristallkoloss | nach „Was unter dem Baum schläft“ |
| Glutlande | 11–15 | Asche, Lavaseen, Glutboden | Aschenschmiede · Ignarok | nach „Der Berg bewegt sich“ |
| Frostgebirge | 16–20 | Schnee, Eis, Schneestürme | Gletscherdom · Ysolde | nach „Der Schlackenwurm“ |
| Verlorene Ruinen | 21–25 | antike Stadt der Hüter | Archiv der Stille · Der Archivar | nach „Die Frostweberin“ |
| Schattenreich | 26–30 | Kehrseite der Quelle | Thron der Leere · Der Hohle König | nach „Archiv der Stille“ |

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

## Handwerk (ab 0.4)

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

## Elemente (ab 0.4)

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

## Balancing

Alle Stellschrauben liegen zentral in `shared/src/config.ts` (Levelkurve, Gegnerformeln, Schadensminderung,
Elementfaktoren, Beutechancen, Seltenheitsgewichte, Verbesserungskosten, Mehrspieler-Skalierung, Wiedereinstiegsregeln)
und in den Datentabellen unter `shared/src/data/` (Klassen, Fähigkeiten, Gegner, Bosse, Gegenstände, Zonen, Quests).
Ein automatischer Test prüft für alle Klassen auf den Stufen 1, 10, 20 und 30, dass „Treffer bis zum Sieg“ und
„Treffer bis zum Tod“ in einem fairen Korridor bleiben.
