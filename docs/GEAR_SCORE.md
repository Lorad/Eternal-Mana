# Ausrüstungswert (GS)

Stand: 0.12 (noch ohne Versionssprung). Eine Zahl, die sagt, wie gut die **angelegte Ausrüstung** eines Charakters ist – für
den Blick in die Puppe, den Vergleich zweier Teile, die Empfehlungen am Portal und den Blick auf Mitspieler. Im Spiel heißt sie
**Ausrüstungswert**, abgekürzt **GS** (überall gleich: „Ausrüstungswert“ in Überschriften und Erklärungen, „GS 1.234“ an Zahlen).

Alles hier ist Code, nicht Absicht – die Quellen:

| Was | Wo |
|---|---|
| Formel (eine Funktion für Server, Oberfläche, Tests, Skripte) | `shared/src/gearscore.ts` (`itemGS`, `charGS`, `gsCompare`, `GS`) |
| Messpunkte, Farbstufen, Empfehlungen, Warnungen | `shared/src/data/gsreq.ts` (`GS_REF`, `GS_BRACKETS`, `expRequirement`, `riftRequirement`, `gsCheck`) |
| Messung mit dem Spielermodell | `scripts/playtest/gearscore.ts`, Ausgabe `npx tsx scripts/gearscore-calib.ts [--ref] [--req]` |
| Wächter | `tests/gearscore.test.ts`, `tests/balance.test.ts` („Ausrüstungswert …“), Browser: `tests/e2e/ausruestungswert.mjs` |

## Grundsätze

- **Nur abgeleitet, nie gespeichert.** Gespeichert werden die Gegenstände; der Wert wird daraus berechnet – beim Laden, nach
  jeder Änderung (anlegen, ablegen, verbessern, Element einschmieden, Rune, umschmieden, Überführung alter Stände). Ändert sich
  die Formel, rechnen alte Charaktere sofort mit der neuen. Der Server hält ihn je Spieler zwischengespeichert (`Player.gs`, neu
  bei jedem `recalc`, das jede Änderung der Ausrüstung auslöst).
- **Summe der zehn Plätze.** Leere Plätze zählen 0. Alte Plätze (`acc1`/`acc2`) zählen nicht – das Laden überführt sie.
- **Klassenneutral.** Bewertet wird die Güte eines Teils **im Verhältnis zum Budget seines Platzes**, nicht seine Werte:
  ein Schild zählt wie ein Köcher, eine Robe wie ein Plattenpanzer, Verteidigung wie Angriff. Gleich gute Ausrüstung ergibt für
  alle fünf Klassen denselben Wert (ohne Eigenschaften exakt, mit gewürfelten innerhalb von 1 %, siehe Messung).
- **Setboni zählen nicht.** Ein Setteil zählt wie dasselbe Teil ohne Set; das zweite, vierte und sechste Teil heben den Wert
  um nichts mehr als ihren eigenen Wert. Aktive Sets zeigt die Oberfläche getrennt (Puppe, Charakterbogen, Ansehen). Eine
  zusätzliche „Kampfkraft“ gibt es bewusst **nicht**: Sie ließe sich nur über Schadens- und Überlebensmodelle je Klasse
  ehrlich rechnen, und genau die würden Klassen gegeneinander gewichten.
- **Der Server vertraut keinem Wert vom Client.** Er rechnet aus seinen eigenen Gegenständen; im Netz geht der Wert nur in
  Gruppenstand, Ansehen, Online-Liste, Gruppenbrett und Bereitschaftsprüfung mit – nie in die Snapshots (20 Hz).

## Formel

Für ein Teil auf Gegenstandsstufe **L**, Seltenheit **r**, Verbesserung **u** (+0…+10):

```
GS(Teil) = runden( Gewicht × (L + 2) × (Grundfaktor + 0,2 × Einheiten) )

Grundfaktor = Seltenheitsfaktor[r] × (1 + 0,08 × u)        – genau der Faktor der Grundwerte (data/items.ts, baseMods)
Einheiten   = Σ Eigenschaften (jede im Verhältnis zu ihrer Normstärke, höchstens 2,5)
            + Boni der Verbesserung bei +3/+6/+9 (wie Eigenschaften gerechnet) + 1 bei +10 (Passive)
            + Rune (ihre Werte, wie Eigenschaften gerechnet)
            + Elementstufe 1/2/3 → 0,5/1/1,5 · Legendäre Waffe 3 · benanntes Unikat 0,5
Gewicht     = AFFIX_SCALE[Platz] / 0,5                       – Anteil des Platzes an den Eigenschaften (im Mittel 1)

GS(Charakter) = Σ GS(Teil) über die zehn Plätze
```

**Normstärke** einer Eigenschaft = der Mittelwert, den das Spiel für sie auf Stufe L würfelt (`affixNominal` in
`data/items.ts`), mal dem Faktor des Platzes (`AFFIX_SCALE`). Eine durchschnittlich gewürfelte Eigenschaft ist also 1 Einheit,
eine starke bis 1,3 × (1 + 0,08 r). Werte, die es nicht als Eigenschaft gibt (aus Runen und Verbesserungsboni), haben feste
Normstärken: % Angriff 5, % Verteidigung 6, % Leben 4, % Mana 6, alle Resistenzen 4, schnellere Ausweichrolle 8, % Heilung 8.

| Konstante (`GS` in gearscore.ts) | Wert | Bedeutung |
|---|---|---|
| `levelOffset` | 2 | alle Grundbudgets wachsen etwa mit (L + 2) (`GEAR_BUDGET`) |
| `affixUnit` | 0,2 | eine Eigenschaft in Normstärke = ein Fünftel des Grundbudgets eines gewöhnlichen Teils |
| `affixCap` | 2,5 | Deckel je Eigenschaft (Teile von vor 0.9 würfelten stärker; feste Resistenzen der Boss-Unikate) |
| `up10` | 1 | Passive der Stufe +10 – so viel wie eine Eigenschaft |
| `element` | 0 / 0,5 / 1 / 1,5 | Elementstufe der Waffe |
| `legend` | 3 | Sonderwirkung einer Legendären Waffe |
| `unique` | 0,5 | benanntes Unikat (nicht Set, nicht Legendär) |
| Gewichte | Waffe 1,2 · Zweithand 1,0 · Helm 0,9 · Brust 1,1 · Handschuhe 0,9 · Beine 1,0 · Schuhe 0,9 · Amulett 1,2 · Ring je 0,9 | aus `AFFIX_SCALE` |

Seltenheitsfaktoren (`CFG.loot.rarityStatMul`): Gewöhnlich 1 · Ungewöhnlich 1,12 · Selten 1,26 · Episch 1,42 · Legendär 1,62 ·
Mythisch 1,85. Damit gilt, was das Spiel auch in den Werten tut: **Verbesserung schlägt Seltenheit** – gewöhnlich +10
(1,8 + Boni) liegt über ungewöhnlich +0, selten +10 über legendär +0, episch +10 über mythisch +0; und **Stufe schlägt
Seltenheit** – ein seltener Helm der Stufe 30 liegt über einem epischen der Stufe 20.

Beispiele (gerechnet mit `itemGSParts`):

| Teil | Rechnung | GS |
|---|---|---|
| Startwaffe, gewöhnlich, Stufe 1 | 1,2 × 3 × 1 | 4 |
| Neuer Charakter (Waffe, Zweithand, Brust, Handschuhe) | 4 + 3 + 3 + 3 | 13 |
| Seltener Helm, Stufe 20, +0, zwei Eigenschaften (2,07 Einheiten) | 0,9 × 22 × (1,26 + 0,41) | 33 |
| Schild **oder** Köcher, selten, Stufe 20, +3 (Bonus 1 Einheit) | 1,0 × 22 × (1,56 + 0,2) | 39 / 39 |
| Epische Waffe, Stufe 40, +6, drei Eigenschaften, Feuer 2, Rune der Macht | 1,2 × 42 × (2,10 + 0,2 × (3,24 + 0,66 + 1,67 + 1)) | 172 |
| Mythischer Ring, Stufe 70, +10, ohne Eigenschaften | 0,9 × 72 × (3,33 + 0,2 × 1,3) | 233 |

## Messung: der Wert entlang der Reise

Charaktere des Spielermodells (`scripts/playtest/chars.ts`, `runs.ts`), alle fünf Klassen mit je sechs Würfel-Samen; Mittel
(Spanne). „karg“ = alles Ungewöhnlich, drei Stufen hinterher, +0 · „typisch“ = Waffe/Zweithand/Brust/Beine Selten, eine Stufe
hinterher, +⌊Stufe/10⌋ · „gut“ = alles Episch auf Stufe, +5. Ende der Geschichte = Stufe 40 typisch mit zwei Setteilen, Runen,
Element 2. Riss-Ausrüstung *s* = was die Risse bis zur Stufe davor abwerfen (Episch, Gegenstandsstufe 40 + s − 1, +4…+8,
Legendäre Waffe mit Element 3, Echo-Runen ab 10). Spitze = alle zehn Plätze Legendär bzw. Mythisch +10 auf Stufe 70, Waffe
Element 3, Echo-Runen.

| Stufe | karg | typisch | gut |
|---|---|---|---|
| 1 | 42 (40–43) | 47 (45–48) | 81 (78–84) |
| 5 | 54 (53–57) | 90 (87–93) | 186 (181–191) |
| 10 | 121 (117–124) | 168 (164–173) | 315 (308–321) |
| 15 | 188 (185–194) | 244 (239–250) | 446 (437–454) |
| 20 | 255 (252–259) | 335 (328–343) | 576 (566–590) |
| 25 | 322 (317–327) | 414 (405–427) | 706 (691–721) |
| 30 | 391 (381–401) | 518 (505–526) | 837 (820–852) |
| 35 | 456 (448–467) | 604 (589–620) | 966 (951–984) |
| 40 | 524 (516–534) | 747 (738–757) | 1.097 (1.071–1.114) |

| Endspiel | GS (Spanne) | Krieger / Magier / Waldläufer / Paladin / Schattenjäger |
|---|---|---|
| Ende der Geschichte | 784 (774–798) | 785 / 785 / 783 / 782 / 784 |
| Riss-Ausrüstung 5 | 1.396 (1.370–1.430) | 1.400 / 1.396 / 1.396 / 1.397 / 1.388 |
| Riss-Ausrüstung 10 | 1.706 (1.673–1.725) | 1.709 / 1.704 / 1.708 / 1.709 / 1.700 |
| Riss-Ausrüstung 15 | 1.993 (1.957–2.019) | 1.999 / 1.995 / 1.994 / 1.998 / 1.979 |
| Riss-Ausrüstung 20 | 2.235 (2.207–2.271) | 2.234 / 2.238 / 2.242 / 2.239 / 2.223 |
| Riss-Ausrüstung 25 | 2.496 (2.441–2.523) | 2.500 / 2.500 / 2.500 / 2.501 / 2.480 |
| Riss-Ausrüstung 30 | 2.687 (2.660–2.734) | 2.694 / 2.683 / 2.694 / 2.690 / 2.673 |
| Alles Legendär +10 | 3.672 (3.632–3.719) | 3.672 / 3.677 / 3.664 / 3.673 / 3.675 |
| Alles Mythisch +10 | 4.159 (4.115–4.212) | 4.165 / 4.147 / 4.163 / 4.157 / 4.165 |

Die Klassen liegen auf jedem Messpunkt innerhalb von 1 %. Keine Inflation: Der Wert wächst mit der Stufe etwa linear (das
Budget tut es auch) und mit der Güte; die Spitze des Endspiels liegt beim 5,3-Fachen des Stands am Ende der Geschichte – so
viel stärker ist diese Ausrüstung in den Grundwerten auch (Stufe 70 statt 40, ×1,85 × 1,8 statt ×1,26 × 1,3).

Das Modell rüstet für Riss-Stufe 1 schon so aus wie für Stufe 5 (1.308) – deshalb gilt für Stufe 1–4 der Weg zwischen dem Ende
der Geschichte und Stufe 5 (`GS_REF.rift` beginnt bei 5).

## Farbstufen

Farben wie die Seltenheiten (gleiche Bedeutung, grau → gold, ohne Effekte); das Türkis von Mythisch bleibt den Gegenständen.
Die Schwellen sind Messpunkte – keine getippten Zahlen (`GS_BRACKETS` in `data/gsreq.ts`):

| Stufe | ab GS | Messpunkt | Farbe |
|---|---|---|---|
| Grundausstattung | 0 | – | grau `#c9c9c9` |
| Erprobt | 244 | typisch, Stufe 15 (Mitte von Akt I) | grün `#5fd35f` |
| Gefestigt | 518 | typisch, Stufe 30 (Ende von Akt I) | blau `#4aa3ff` |
| Meisterlich | 784 | Ende der Geschichte | violett `#c77dff` |
| Endspiel | 2.235 | Riss-Ausrüstung 20 (= Empfehlung für Mythisch) | gold-orange `#ffb02e` |

Einzelne Teile färbt die Oberfläche nach derselben Skala, als ob alle zehn Plätze so gut wären (`itemGSEquiv`: Wert ÷ Gewicht × 10).

## Empfehlungen und Mindestwerte

Jeder Inhalt hat einen **empfohlenen** und einen **Mindestwert**, die **empfohlene Stufe**, die **Belohnungsstufe** und die
Beute in Worten (`GsReq`). Unter dem Mindestwert warnt die Oberfläche deutlich, in Gruppen mit Namen; der Server schickt beim
Aufbruch dieselbe Warnung. **Gesperrt wird nichts** – außer ein Inhalt legt ausdrücklich `hard: true` fest (das Feld gibt es in
`ExpeditionDef.gsReq`, der Server prüft es beim Aufbruch, bei „Bereit“ und beim Nachkommen; im Spiel nutzt es derzeit kein Inhalt).

Herleitung (`expRequirement`, `riftRequirement`, `trialRequirement`):

| Inhalt | empfohlen | Mindestwert | Belohnungsstufe |
|---|---|---|---|
| Story-Expedition, Normal | typisch auf der empfohlenen Stufe | karg auf der empfohlenen Stufe | Abenteuer |
| Story-Expedition, Schwer (Gegner +3 Stufen) | Mitte aus typisch und gut, drei Stufen weiter | typisch auf der empfohlenen Stufe | Veteran |
| Endspiel-Expedition, Normal | Ende der Geschichte | karg Stufe 40 | Endspiel |
| Endspiel-Expedition, Schwer | Riss-Ausrüstung 5 | Ende der Geschichte | Endspiel |
| jede Expedition, Albtraum | Riss-Ausrüstung 10 | Riss-Ausrüstung 5 | Endspiel |
| jede Expedition, Mythisch | Riss-Ausrüstung 20 | Riss-Ausrüstung 10 | **Raid-Endgame** |
| Tiefe t (über Mythisch) | Riss-Ausrüstung 20 + t | Riss-Ausrüstung 15 + t | **Raid-Endgame** |
| Mana-Riss, Stufe s | Riss-Ausrüstung s | Riss-Ausrüstung s − 5 (mind. Ende der Geschichte) | Endspiel, ab 20 **Raid-Endgame** |
| Prüfung der Sieben | Riss-Ausrüstung 18 (ihre Stufe) | Riss-Ausrüstung 15 (ab der sie offen ist) | **Raid-Endgame** |

Endspiel-Stufen über 30 gehen weiter zu „alles Legendär +10“ (35) und „alles Mythisch +10“ (40); Tiefe 15 verlangt damit
Legendär +10, Tiefe 20 Mythisch +10. Die Zuordnung der Grade zu Riss-Ausrüstung ist die des Spieltests
(`scripts/exp-playtest.ts --endspiel`, Tabelle „Endspiel: die Leiter“ in `docs/GAME_DESIGN.md`): Dort schaffen sorgfältige
Spieler allein Die Lange Wacht auf Albtraum mit Riss-Ausrüstung 10 und auf Mythisch mit Riss-Ausrüstung 20, Tiefe 1 mit 20,
Tiefe 5 mit 25 und Tiefe 10 mit 30 – die beiden letzten mit Toden. Für Tiefen ist die Empfehlung also die Grenze dessen, was
Einzelne gerade noch schaffen.

Ergebnis (`npx tsx scripts/gearscore-calib.ts --req`):

| Expedition | Normal (Stufe) | Schwer (Stufe) | Albtraum | Mythisch |
|---|---|---|---|---|
| Die Wurzeltiefe | 90 / 54 (5) | 200 / 90 (8) | 1.706 / 1.396 | 2.235 / 1.706 |
| Die Singende Tiefe | 168 / 121 (10) | 304 / 168 (13) | 1.706 / 1.396 | 2.235 / 1.706 |
| Die Gießerei der Ersten | 244 / 188 (15) | 412 / 244 (18) | 1.706 / 1.396 | 2.235 / 1.706 |
| Der Webstuhl aus Eis | 335 / 255 (20) | 518 / 335 (23) | 1.706 / 1.396 | 2.235 / 1.706 |
| Die Unteren Archive | 414 / 322 (25) | 631 / 414 (28) | 1.706 / 1.396 | 2.235 / 1.706 |
| Der Hof der Hohlen Krone | 518 / 391 (30) | 742 / 518 (33) | 1.706 / 1.396 | 2.235 / 1.706 |
| Die Gestrichenen Seiten | 587 / 443 (34) | 840 / 587 (37) | 1.706 / 1.396 | 2.235 / 1.706 |
| Die Lange Wacht | 784 / 524 (40) | 1.396 / 784 (40) | 1.706 / 1.396 | 2.235 / 1.706 |
| Das Atmende Herz | 784 / 524 (40) | 1.396 / 784 (40) | 1.706 / 1.396 | 2.235 / 1.706 |

(empfohlen / Mindestwert; Albtraum und Mythisch auf Stufe 40)

| Tiefe | 1 | 2 | 3 | 5 | 8 | 10 | 15 | 20 |
|---|---|---|---|---|---|---|---|---|
| empfohlen | 2.287 | 2.339 | 2.392 | 2.496 | 2.611 | 2.687 | 3.672 | 4.159 |
| Mindestwert | 2.041 | 2.090 | 2.138 | 2.235 | 2.392 | 2.496 | 2.687 | 3.672 |

| Mana-Riss | 1 | 5 | 10 | 15 | 20 | 25 | 30 | Prüfung der Sieben |
|---|---|---|---|---|---|---|---|---|
| empfohlen | 906 | 1.396 | 1.706 | 1.993 | 2.235 | 2.496 | 2.687 | 2.138 |
| Mindestwert | 784 | 784 | 1.396 | 1.706 | 1.993 | 2.235 | 2.496 | 1.993 |

### Raids

**Eternal Mana hat keine Raids.** Es gibt keinen Inhalt für mehr als vier Spieler und keinen, der eine Gruppe voraussetzt.
Die Belohnungsstufe „Raid-Endgame“ tragen die schwersten vorhandenen Inhalte: Mythisch, Tiefen, Prüfung der Sieben und
Mana-Risse ab Stufe 20. Ein künftiger Raid legt nur seine Werte fest (`GsReqDecl`: `recGS`, `minGS`, `recLevel`, `tier`,
`hard`) und bekommt dieselbe Anzeige, Warnung und Prüfung.

## Wo der Wert steht

- **Inventar (Puppe):** Stufe, Klasse, Ausrüstungswert in der Farbe seiner Stufe mit Namen der Stufe; jeder Platz zeigt
  unten rechts den Wert seines Teils in der Farbe seiner Güte. Aktive Sets darunter, getrennt.
- **Charakterbogen:** Ausrüstungswert mit Stufe unter Name und Klasse; Sets mit Hinweis, dass sie nicht mitzählen.
- **Tooltip jedes Ausrüstungsteils:** „Ausrüstungswert GS n“. Beim Vergleich zusätzlich der Charakter-Wert vorher → nachher
  mit ▲ grün / ▼ rot; Ringe gegen beide Ringplätze (auch freie).
- **Schmiede (Verbessern):** Wert des Teils vorher → nachher.
- **Gruppe:** Gruppenrahmen im HUD (kurz), Gruppenfenster (Mitglieder und Online-Liste), Ansehen (mit Wert je Platz),
  Bereitschaftsprüfung am Portal (je Mitglied, markiert unter Empfehlung/Mindestwert).
- **Quellwarte:** Gruppenbereich (Spieler in der Warte und Gesuche am Brett), Trophäenhalle (Statistik), Portal
  (je Expedition die Empfehlung auf Normal, je Grad die Empfehlung, für den gewählten Grad und die Tiefe der Kasten mit
  empfohlen / mindestens / dein Wert / Belohnungsstufe / Beute und die Warnung), Riss-Stein (je Stufe und Prüfung der Sieben).

## Neu einmessen

Ändert sich etwas an Ausrüstung, Beute oder Spielermodell, schlägt `tests/balance.test.ts` an (Abweichung > 3 %). Dann:
`npx tsx scripts/gearscore-calib.ts --ref`, den ausgegebenen Block als `GS_REF` in `shared/src/data/gsreq.ts` übernehmen und
die Tabellen hier mit `--req` erneuern. Empfehlungen und Farbstufen folgen von selbst.

## Schwächen

- Die Gewichte der Eigenschaften untereinander sind gleich (eine Normstärke = 1), gleich ob Krit-Chance oder Goldfund – der
  Wert misst Güte der Würfelung, nicht Nutzen im Kampf. Gold- und Erfahrungsbonus zählen deshalb mit.
- Die Empfehlungen für Schwer auf Story-Expeditionen sind nicht mit Bots gemessen (nur Normal und das Endspiel sind es).
- Ein neuer Charakter (13) liegt unter dem Mindestwert der Wurzeltiefe (54): Das Modell trägt auf Stufe 5 schon zehn Teile.
  Die Warnung ist dort ehrlich, aber für Anfänger streng.
- Tiefen über 10 und Gruppen in Tiefen sind ungemessen (siehe `PROJECT_STATUS.md`); ihre Empfehlungen sind fortgeschrieben.
