# Art Bible – Eternal Mana (Grafikstil v2)

Verbindliche Stilregeln für alle Grafiken. Ziel: eine dichte, liebevoll ausgestaltete Fantasy-Pixel-Art-Welt im Geist
der späten 32-Bit-/Handheld-Ära – üppig, warm, handgemacht. Jedes Motiv ist ein eigener Entwurf; es werden keine
Figuren, Kacheln oder Motive bestehender Spiele nachgezeichnet.

## 1. Leitbild (Referenz: Grünwald)

- **Kleine Figur, große Welt.** Die Kamera zeigt etwa 640 × 360 Weltpixel (40 × 22 Kacheln). Bäume sind riesig
  (Kronen 5–6 Kacheln breit, ragen über Wege und den Bildrand), Figuren sind rund zwei Kacheln hoch.
- **Kein Quadratzentimeter ist leer.** Böden bestehen aus mehreren Schichten: Grundton → großflächige Farbflecken →
  Büschel/Strukturen → Einzeldetails (Blüten, Kiesel, Laub). Flächen ohne Detail sind höchstens 6–8 Pixel groß.
- **Organische Kanten.** Übergänge zwischen Untergründen sind ausgefranst, überlappend und unregelmäßig; nie eine gerade
  Linie entlang einer Kachelgrenze. Das 16-Pixel-Raster darf nirgends ablesbar sein.
- **Tiefe durch Überlagerung.** Hohe Objekte verdecken, was hinter ihnen liegt (y-Sortierung); Kronen, Schilf und Korn
  überlappen Figuren. Alles Hohe wirft einen Schatten.

## 2. Technische Grundregeln

| Regel | Wert |
|---|---|
| Kachelgröße | 16 × 16 Weltpixel, 1 Texel = 1 Weltpixel (einheitlicher Maßstab für alles) |
| Darstellung | ganzzahliger Zoom (2×, 3×, 4×), Nearest-Neighbour, keine Subpixel-Positionen |
| Lichtrichtung | von oben links; Schlagschatten fallen nach unten rechts |
| Perspektive | schräge Draufsicht (¾): Man sieht Oberseite und Südseite von Objekten |
| Kontur | 1 px, dunkel und **farbig** (abgedunkelte Eigenfarbe, nie reines Schwarz); innen sparsam; Bodenkacheln ohne Kontur |
| Schattierung | 3–5 Stufen je Material; Schatten kühl (ins Blau-Violette verschoben), Lichter warm (ins Gelbe) |
| Anti-Aliasing | keines an Außenkanten von Sprites; weiche Alpha-Verläufe nur bei Licht, Rauch, Nebel, Schatten |
| Dithering | sparsam, nur für Texturübergänge in Böden und große Schattenflächen |
| Hintergrund | transparent; **keine eingebackenen Bodenschatten** in Sprites (Schatten erzeugt die Engine dynamisch) |
| Ankerpunkt | Standfläche unten Mitte; Figuren stehen 3 px über der Frame-Unterkante |
| Determinismus | kein `Math.random`; alle Varianten aus Seeds, damit jeder Export identisch ist |

## 3. Farbe

Die Masterpalette liegt in `client/src/gfx/palette.ts` (Rampen mit je fünf Stufen). Regeln:

- Jedes Biom hat **eine Leitfarbe, eine Gegenfarbe und einen Akzent**; Sättigung liegt im Mittelgrund am höchsten.
- Spielfiguren und Gegner nutzen die kräftigsten, hellsten Töne ihrer Rampen und heben sich dadurch vom Boden ab.
- Interaktive Objekte (Truhen, Hebel, Quellsteine, Splitter) tragen Gold- oder Türkisakzente, die es sonst kaum gibt.

| Biom | Leitfarbe | Gegenfarbe | Akzent | Stimmung |
|---|---|---|---|---|
| Grünwald | sattes Gelbgrün bis Blaugrün | Ocker (Wege, Korn) | Türkis (Wasser), Blütenrot/-blau | sonnig, üppig, friedlich |
| Kristallhöhlen | Petrol/Indigo | warmes Braun (Gestein, Holz) | Cyan- und Magentaglühen | feucht, glitzernd, geheimnisvoll |
| Glutlande | Anthrazit/Rostbraun | Glutorange | Lavagelb | heiß, rau, bedrohlich |
| Frostgebirge | Schneeweiß/Eisblau | dunkles Tannengrün | Warmes Hüttenlicht | klar, still, weit |
| Verlorene Ruinen | Sandstein/Oliv | Moosgrün | Runengold, Arkanblau | alt, rätselhaft, sonnenverblichen |
| Schattenreich | Tiefviolett/Nachtblau | Magenta-Adern | kaltes Weißlicht | fremd, verzerrt, schwebend |

## 4. Figuren

- Proportion: ca. 2,3 Köpfe hoch, Körper rund 16 × 28 px im 32 × 40-Frame; Platz im Frame für Waffen und Umhänge.
- **Silhouette zuerst:** Jede Klasse und jeder NPC muss als schwarze Fläche erkennbar sein (Hut, Schulterpartie,
  Waffe, Frisur, Umhang).
- Gesichter: zwei Augenpixel mit Glanzpunkt, angedeuteter Mund nur bei Ausdruck; Blickrichtung folgt der Bewegung.
- Animation: Antizipation → Aktion → Ausschwingen. Laufzyklen mit Gegenbewegung von Armen und Beinen, 1 px Auf und Ab,
  nachschwingenden Haaren/Umhängen. Angriffe zeigen die Waffe in jeder Phase; schwere Angriffe holen sichtbar weiter aus.
- Sprite-Sheets sind strikte Raster: gleiche Framegröße, kein Überlappen, feste Spalten je Animation (siehe
  `client/src/gfx/spec.ts`).

## 5. Umgebung

- **Vegetation** in Größenstaffelung: Bodendecker → Büschel → Sträucher → junge Bäume → große Bäume. Laub in Büscheln
  mit klaren Lichtkanten oben links, tiefen kühlen Schatten unten rechts und einzelnen „Lichtlöchern“.
- Alles Biegsame hat 3–4 Wiegeframes (Kronen, Büsche, Gras, Schilf, Korn, Banner, Flammen).
- **Fels und Mauerwerk** mit lesbaren Blöcken, Fugen, Moos an Nord- und Schattenseiten, Bruchkanten.
- **Wasser**: türkis, mit dunklerer Tiefe zur Mitte, hellem Ufersaum, wandernden Lichtreflexen; Uferböschung mit
  Steinen, Schilf, Seerosen.
- **Gebautes** (Häuser, Brücken, Zäune) aus sichtbaren Einzelteilen: Balken, Bretter mit Maserung, Nägel, Seile,
  Dachziegel reihenweise versetzt; leichte Asymmetrie und Gebrauchsspuren.
- **Wände** in ¾-Sicht: helle, strukturierte Front (bis zu zwei Kacheln hoch), dunklere Oberseite mit Lichtkante; am
  Wandfuß ein weicher Schatten auf dem Boden.

## 6. Effekte

- Pixelig und kantig, in 4–8 handgesetzten Phasen: Aufblitzen (fast weiß) → Ausdehnung (Elementfarbe) → Zerfall in
  Einzelpixel. Keine weichgezeichneten Verläufe außer bei Lichtschein.
- Elementfarben: Feuer orange-gelb, Wasser cyan-weiß, Erde ocker-grün, Wind mint-weiß, Licht gold-weiß, Dunkelheit
  violett-magenta, physisch stahlweiß.
- Jede Klasse hat eine eigene Handschrift: Krieger breite Stahlbögen, Paladin goldene Einschläge mit Staubring,
  Schattenjäger schnelle violette Doppelschnitte, Waldläufer Pfeile mit Luftspur, Magier Runenkreise und Kugeln.

## 7. Benennung

`<gruppe>_<motiv>[_<variante>][_<frame>]`, alles klein, ASCII. Animationsframes enden auf `_0`, `_1`, …
Beispiele: `tree_oak_2`, `chest_gold_open`, `crit_rabbit_hop_3`, `explosion_fire_5`, `d_pillar_broken`.
Der vollständige Katalog wird beim Export erzeugt: `docs/ASSETS.md`.

## 8. Qualitätsprüfung (für jedes Asset)

1. Silhouette lesbar (bei 1× und 2×)?  2. Lichtrichtung korrekt?  3. Kontur farbig, nicht schwarz?
4. Passt die Sättigung zum Biom?  5. Keine Rasterwiederholung, keine leeren Flächen?
6. Animation: gleiche Standfläche in allen Frames, kein Springen, weiche Schleife?
7. Im Spiel neben Figur und Nachbarobjekten geprüft (Größenverhältnis)?
