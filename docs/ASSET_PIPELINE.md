# Asset-Pipeline

```
Quelle                              Export                    Spiel
client/src/gfx/**  ──npm run assets──▶  client/public/assets/  ──▶  Phaser lädt PNG + JSON
(Pixel-Zeichenprogramme)               assets/tiled/*.tmj            (client/src/gfx/runtime.ts)
                                       docs/ASSETS.md, docs/art/
```

## Warum Zeichenprogramme statt Bilddateien als Quelle?

In der Entwicklungsumgebung dieses Projekts standen weder ein Bildgenerator noch Aseprite, Tiled oder TexturePacker zur
Verfügung. Jede Grafik ist deshalb als deterministisches Zeichenprogramm in TypeScript geschrieben (Pixel für Pixel über
die gemeinsame Palette) und wird von der Pipeline in **normale Spielressourcen** exportiert. Das Spiel selbst lädt nur
diese exportierten Dateien. Wer lieber in Aseprite zeichnet, kann jede exportierte PNG-Datei dort öffnen, überarbeiten
und zurückspeichern – siehe „Assets von Hand ersetzen“.

## Befehle

| Befehl | Wirkung |
|---|---|
| `npm run assets` | exportiert alle Grafiken neu (ca. 4 s), schreibt Katalog, Kontaktbögen und Tiled-Karten |
| `npm run build` | baut den Client inklusive `client/public/assets` |
| `npm run dev` → `/preview-chars.html`, `/preview-mobs.html`, `/preview-bosses.html`, `/preview-objects.html`, `/preview-objects2.html`, `/preview-objects3.html`, `/preview-fx.html`, `/preview-terrain.html` | Vorschauseiten der Zeichenprogramme (Kontaktbögen, Animationen, Geländeausschnitte echter Karten) |

Die exportierten Dateien sind eingecheckt; zum Spielen muss `npm run assets` nicht ausgeführt werden.

## Ausgabeformate

| Pfad | Inhalt | Format | öffnen mit |
|---|---|---|---|
| `client/public/assets/sprites/chars/*.png/.json` | 20 Figuren, 43 × 3 Frames à 32×40 | Rastersheet + Aseprite-JSON (frames, frameTags, duration) | Aseprite, Phaser |
| `…/sprites/mobs/*.png/.json` | 25 Gegner, 22 Frames | wie oben | Aseprite, Phaser |
| `…/sprites/bosses/*.png/.json` | 6 Bosse, 26 Frames | wie oben | Aseprite, Phaser |
| `…/atlases/obj.png/.json` | Welt- und Dungeonobjekte, Kleintiere | Atlas, TexturePacker-JSON-Hash | TexturePacker, Phaser |
| `…/atlases/fx.png/.json` | Kampf-, Magie-, Wetter- und Markierungseffekte | Atlas, JSON-Hash | TexturePacker, Phaser |
| `…/atlases/icons.png/.json` | Gegenstands- und Fähigkeiten-Icons | Atlas, JSON-Hash | TexturePacker |
| `…/liquids/<biom>.png` | 8 nahtlose 64×64-Frames je Biom als Streifen | PNG | jedes Bildprogramm |
| `…/overlays/*.png` | Nebel, Wolkenschatten, Blätterschatten (256×256, nahtlos) | PNG | jedes Bildprogramm |
| `…/manifest.json` | Inhaltsverzeichnis, Framegrößen, Animationsraster | JSON | – |
| `assets/tiled/<zone>.tmj` | alle 12 Karten: Terrain-Art, Deko, Objekte, Gegner | Tiled-JSON | Tiled |
| `docs/ASSETS.md` | vollständiger Katalog aller Frames mit Größe, Frameanzahl, Herkunft | Markdown | – |
| `docs/art/*.png` | Kontaktbögen je Gruppe | PNG | – |

## Technische Regeln (werden beim Export geprüft bzw. sind in `spec.ts` festgelegt)

- Rastersheets sind strikt: gleiche Framegröße, keine Überlappung, feste Spalten je Animation
  (`CHAR_ANIMS`, `MOB_ANIMS`, `BOSS_ANIMS` in `client/src/gfx/spec.ts`). Der Export warnt, wenn ein Sheet nicht zum Raster passt.
- Einheitlicher Maßstab: 1 Texel = 1 Weltpixel, Kachel 16 px; Anker unten Mitte.
- Transparenter Hintergrund, keine eingebackenen Bodenschatten (Schatten wirft die Engine).
- Benennung: `<gruppe>_<motiv>[_<variante>][_<frame>]`; Animationen `_0…_n`.
- Deterministisch: zwei Exporte ergeben byte-gleiche Dateien.

## Gelände

Der Boden jeder Zone wird nicht aus einem kleinen Kachelsatz zusammengesetzt, sondern beim Betreten der Zone als
zusammenhängendes Bild gemalt (`client/src/gfx/tiles/`, ein Maler je Biom über `core.ts`). Dadurch gibt es keine sichtbare
Rasterwiederholung, und Übergänge, Uferböschungen, zweistöckige Wandfronten oder raumbezogene Dungeonmuster entstehen aus
der Karte selbst. Der Geländemaler ist deshalb der einzige Teil der Zeichenprogramme, der mit dem Spiel ausgeliefert wird.
Die Tiled-Dateien zeigen die logische Karte (Terrain-Art je Kachel und alle platzierten Objekte); sie dienen der Ansicht
und Analyse – maßgeblich bleibt der Kartengenerator in `shared/src/maps/mapgen.ts`.

## Ein neues Asset hinzufügen

1. Im passenden Modul zeichnen (z. B. `client/src/gfx/objects/gw_plants.ts`) und in der Liste des Moduls eintragen.
   Hilfen: `objects/kit.ts` (Laub, Holz, Stein, Flammen, Konturen), `mobs/kit.ts`, `fx2/kit.ts`, `tiles/core.ts`.
2. Auf der Vorschauseite prüfen (`npm run dev`).
3. `npm run assets` – das Asset erscheint im Atlas, im Katalog und im Kontaktbogen.
4. Verwenden: Deko über die Listen in `shared/src/data/zones.ts` bzw. `shared/src/maps/mapgen.ts`, Effekte über
   `client/src/game/fxlib.ts` (`fx.play('name', x, y)`).

## Assets von Hand ersetzen (Aseprite & Co.)

- **Spritesheet:** `client/public/assets/sprites/…/<key>.png` in Aseprite öffnen (*File → Import Sprite Sheet*, Framegröße
  laut `manifest.json`; die `.json` daneben enthält die Animations-Tags), bearbeiten, mit gleicher Größe und gleichem
  Raster zurückspeichern.
- **Atlas-Frame:** Frame aus `atlases/obj.png` anhand der Koordinaten in `obj.json` bearbeiten, oder den Atlas mit
  TexturePacker aus Einzelbildern neu packen (Format „JSON (Hash)“, Framenamen beibehalten).
- Achtung: `npm run assets` überschreibt handbearbeitete Dateien. Wer dauerhaft von Hand arbeitet, nimmt das betreffende
  Sheet aus dem Export heraus (Schleifen in `tools/export-assets.ts`) oder überträgt die Änderung ins Zeichenprogramm.
