# Asset-Katalog

> Automatisch erzeugt von `npm run assets` – nicht von Hand bearbeiten.

Alle Ressourcen liegen unter `client/public/assets/` und werden beim Spielstart über `manifest.json` geladen.
Quelle jeder Grafik ist ein Zeichenprogramm in `client/src/gfx/` (siehe `docs/ART_BIBLE.md`). Kontaktbögen: `docs/art/`.

| Format | Verwendung | Lesbar mit |
|---|---|---|
| `sprites/**/<key>.png` + `.json` | Raster-Spritesheets mit Animations-Tags | Aseprite (Import Sprite Sheet / JSON), Phaser |
| `atlases/*.png` + `.json` | gepackte Atlanten, JSON-Hash | TexturePacker, Phaser `load.atlas` |
| `assets/tiled/*.tmj` | Karten aller Zonen (Terrain-Art, Deko, Objekte, Gegner) | Tiled |

## Spritesheets: chars

| Sheet | Frame | Frames | Animationen (Frames) |
|---|---|---|---|
| `char_krieger` | 32×40 | 129 | idle 4, walk 6, run 6, attack 4, heavy 5, dodge 4, hit 2, cast 4, interact 3, death 5 |
| `char_magier` | 32×40 | 129 | idle 4, walk 6, run 6, attack 4, heavy 5, dodge 4, hit 2, cast 4, interact 3, death 5 |
| `char_paladin` | 32×40 | 129 | idle 4, walk 6, run 6, attack 4, heavy 5, dodge 4, hit 2, cast 4, interact 3, death 5 |
| `char_schattenjaeger` | 32×40 | 129 | idle 4, walk 6, run 6, attack 4, heavy 5, dodge 4, hit 2, cast 4, interact 3, death 5 |
| `char_waldlaeufer` | 32×40 | 129 | idle 4, walk 6, run 6, attack 4, heavy 5, dodge 4, hit 2, cast 4, interact 3, death 5 |
| `npc_aelteste` | 32×40 | 129 | idle 4, walk 6, run 6, attack 4, heavy 5, dodge 4, hit 2, cast 4, interact 3, death 5 |
| `npc_archaeologin` | 32×40 | 129 | idle 4, walk 6, run 6, attack 4, heavy 5, dodge 4, hit 2, cast 4, interact 3, death 5 |
| `npc_bergfrau` | 32×40 | 129 | idle 4, walk 6, run 6, attack 4, heavy 5, dodge 4, hit 2, cast 4, interact 3, death 5 |
| `npc_echo` | 32×40 | 129 | idle 4, walk 6, run 6, attack 4, heavy 5, dodge 4, hit 2, cast 4, interact 3, death 5 |
| `npc_einsiedler` | 32×40 | 129 | idle 4, walk 6, run 6, attack 4, heavy 5, dodge 4, hit 2, cast 4, interact 3, death 5 |
| `npc_fellhaendlerin` | 32×40 | 129 | idle 4, walk 6, run 6, attack 4, heavy 5, dodge 4, hit 2, cast 4, interact 3, death 5 |
| `npc_geist` | 32×40 | 129 | idle 4, walk 6, run 6, attack 4, heavy 5, dodge 4, hit 2, cast 4, interact 3, death 5 |
| `npc_gelehrter` | 32×40 | 129 | idle 4, walk 6, run 6, attack 4, heavy 5, dodge 4, hit 2, cast 4, interact 3, death 5 |
| `npc_haendlerin` | 32×40 | 129 | idle 4, walk 6, run 6, attack 4, heavy 5, dodge 4, hit 2, cast 4, interact 3, death 5 |
| `npc_jaegerin` | 32×40 | 129 | idle 4, walk 6, run 6, attack 4, heavy 5, dodge 4, hit 2, cast 4, interact 3, death 5 |
| `npc_kind` | 32×40 | 129 | idle 4, walk 6, run 6, attack 4, heavy 5, dodge 4, hit 2, cast 4, interact 3, death 5 |
| `npc_kraemer` | 32×40 | 129 | idle 4, walk 6, run 6, attack 4, heavy 5, dodge 4, hit 2, cast 4, interact 3, death 5 |
| `npc_nomade` | 32×40 | 129 | idle 4, walk 6, run 6, attack 4, heavy 5, dodge 4, hit 2, cast 4, interact 3, death 5 |
| `npc_schmied` | 32×40 | 129 | idle 4, walk 6, run 6, attack 4, heavy 5, dodge 4, hit 2, cast 4, interact 3, death 5 |
| `npc_wache` | 32×40 | 129 | idle 4, walk 6, run 6, attack 4, heavy 5, dodge 4, hit 2, cast 4, interact 3, death 5 |

## Spritesheets: mobs

| Sheet | Frame | Frames | Animationen (Frames) |
|---|---|---|---|
| `mob_arkanauge` | 32×32 | 22 | idle 4, move 6, windup 2, attack 3, hit 2, death 5 |
| `mob_aschenhund` | 48×40 | 22 | idle 4, move 6, windup 2, attack 3, hit 2, death 5 |
| `mob_dornkaefer` | 32×32 | 22 | idle 4, move 6, windup 2, attack 3, hit 2, death 5 |
| `mob_eiswicht` | 32×32 | 22 | idle 4, move 6, windup 2, attack 3, hit 2, death 5 |
| `mob_fledermaus` | 32×32 | 22 | idle 4, move 6, windup 2, attack 3, hit 2, death 5 |
| `mob_fluchgeist` | 32×32 | 22 | idle 4, move 6, windup 2, attack 3, hit 2, death 5 |
| `mob_frostwisp` | 32×32 | 22 | idle 4, move 6, windup 2, attack 3, hit 2, death 5 |
| `mob_frostwolf` | 48×40 | 22 | idle 4, move 6, windup 2, attack 3, hit 2, death 5 |
| `mob_glimmerwisp` | 32×32 | 22 | idle 4, move 6, windup 2, attack 3, hit 2, death 5 |
| `mob_glutimp` | 32×32 | 22 | idle 4, move 6, windup 2, attack 3, hit 2, death 5 |
| `mob_hohlritter` | 48×48 | 22 | idle 4, move 6, windup 2, attack 3, hit 2, death 5 |
| `mob_kristallkrabbler` | 32×32 | 22 | idle 4, move 6, windup 2, attack 3, hit 2, death 5 |
| `mob_leerenbrut` | 32×32 | 22 | idle 4, move 6, windup 2, attack 3, hit 2, death 5 |
| `mob_magmaschleim` | 32×32 | 22 | idle 4, move 6, windup 2, attack 3, hit 2, death 5 |
| `mob_moosling` | 32×32 | 22 | idle 4, move 6, windup 2, attack 3, hit 2, death 5 |
| `mob_nachtmahr` | 56×48 | 22 | idle 4, move 6, windup 2, attack 3, hit 2, death 5 |
| `mob_pilzling` | 32×32 | 22 | idle 4, move 6, windup 2, attack 3, hit 2, death 5 |
| `mob_runenwaechter` | 48×48 | 22 | idle 4, move 6, windup 2, attack 3, hit 2, death 5 |
| `mob_schattenwandler` | 48×40 | 22 | idle 4, move 6, windup 2, attack 3, hit 2, death 5 |
| `mob_schlackengolem` | 48×48 | 22 | idle 4, move 6, windup 2, attack 3, hit 2, death 5 |
| `mob_schneebrute` | 48×48 | 22 | idle 4, move 6, windup 2, attack 3, hit 2, death 5 |
| `mob_skelettkrieger` | 48×40 | 22 | idle 4, move 6, windup 2, attack 3, hit 2, death 5 |
| `mob_tropfschleim` | 32×32 | 22 | idle 4, move 6, windup 2, attack 3, hit 2, death 5 |
| `mob_waldwolf` | 48×40 | 22 | idle 4, move 6, windup 2, attack 3, hit 2, death 5 |
| `mob_wurzelschleicher` | 32×32 | 22 | idle 4, move 6, windup 2, attack 3, hit 2, death 5 |

## Spritesheets: bosses

| Sheet | Frame | Frames | Animationen (Frames) |
|---|---|---|---|
| `boss_archivar` | 112×112 | 26 | idle 6, windup 2, attack 4, special 4, hit 2, death 8 |
| `boss_dornenmutter` | 112×112 | 26 | idle 6, windup 2, attack 4, special 4, hit 2, death 8 |
| `boss_hohlkoenig` | 128×128 | 26 | idle 6, windup 2, attack 4, special 4, hit 2, death 8 |
| `boss_ignarok` | 112×112 | 26 | idle 6, windup 2, attack 4, special 4, hit 2, death 8 |
| `boss_kristallkoloss` | 112×112 | 26 | idle 6, windup 2, attack 4, special 4, hit 2, death 8 |
| `boss_vael` | 96×96 | 26 | idle 6, windup 2, attack 4, special 4, hit 2, death 8 |
| `boss_ysolde` | 96×112 | 26 | idle 6, windup 2, attack 4, special 4, hit 2, death 8 |

## Atlas: obj (587 Frames, 2048×360)

| Name | Größe | Frames | Herkunft / Verwendung |
|---|---|---|---|
| `anvil` | 20×16 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `arch` | 56×64 | 1 | Weltdeko · Modul `objects/ruinen.ts` |
| `ash_pile` | 20×10 | 1 | Weltdeko · Modul `objects/glut.ts` |
| `banner` | 16×44 | 4 (`_0…_3`) | Weltdeko · Modul `objects/gruenwald.ts` |
| `barrel` | 16×20 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `basalt_cluster` | 40×40 | 1 | Weltdeko · Modul `objects/glut.ts` |
| `basalt_column` | 20×44 | 1 | Weltdeko · Modul `objects/glut.ts` |
| `bed` | 26×41 | 1 | Weltdeko · Modul `objects/common.ts` |
| `beehive` | 16×22 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `bench` | 28×16 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `birch_bare` | 36×64 | 1 | Weltdeko · Modul `objects/frost.ts` |
| `birdhouse` | 16×44 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `bones` | 16×10 | 1 | Weltdeko · Modul `objects/kristall.ts` |
| `boulder_wall` | 16×28 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `bounty_board` | 36×36 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `brazier` | 16×28 | 4 (`_0…_3`) | interaktives Objekt · Modul `objects/common.ts` |
| `brazier_blue` | 16×28 | 4 (`_0…_3`) | interaktives Objekt · Modul `objects/ruinen.ts` |
| `brazier_unlit` | 16×28 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `bridge_post` | 8×20 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `broken_arch` | 56×60 | 1 | Weltdeko · Modul `objects/schatten.ts` |
| `bush` | 24×20 | 4 (`_0…_3`) | Weltdeko · Modul `objects/gruenwald.ts` |
| `bush_berry` | 24×20 | 4 (`_0…_3`) | Weltdeko · Modul `objects/gruenwald.ts` |
| `bush_flower` | 24×20 | 4 (`_0…_3`) | Weltdeko · Modul `objects/gruenwald.ts` |
| `cabin` | 80×100 | 1 | Weltdeko · Modul `objects/frost.ts` |
| `cairn` | 14×20 | 1 | Weltdeko · Modul `objects/glut.ts` |
| `campfire` | 20×24 | 4 (`_0…_3`) | Weltdeko · Modul `objects/gruenwald.ts` |
| `cart` | 44×30 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `cattail` | 16×28 | 4 (`_0…_3`) | Weltdeko · Modul `objects/gruenwald.ts` |
| `cave_entrance` | 48×44 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `cave_moss` | 16×10 | 1 | interaktives Objekt · Modul `objects/kristall.ts` |
| `chain_pillar` | 20×52 | 1 | Weltdeko · Modul `objects/schatten.ts` |
| `charred_stump` | 18×16 | 1 | Weltdeko · Modul `objects/glut.ts` |
| `chest_buried` | 22×18 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `chest_gold_closed` | 20×20 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `chest_gold_mid` | 20×20 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `chest_gold_open` | 20×20 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `chest_silver_closed` | 20×20 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `chest_silver_mid` | 20×20 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `chest_silver_open` | 20×20 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `chest_wood_closed` | 20×20 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `chest_wood_mid` | 20×20 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `chest_wood_open` | 20×20 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `clover` | 16×12 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `crate` | 16×16 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `crit_bird_fly` | 12×12 | 4 (`_0…_3`) | Kleintier (Umgebung) · Modul `objects/gruenwald.ts` |
| `crit_bird_idle` | 12×12 | 2 (`_0…_1`) | Kleintier (Umgebung) · Modul `objects/gruenwald.ts` |
| `crit_bird_peck` | 12×12 | 2 (`_0…_1`) | Kleintier (Umgebung) · Modul `objects/gruenwald.ts` |
| `crit_butterfly_a` | 8×8 | 4 (`_0…_3`) | Kleintier (Umgebung) · Modul `objects/gruenwald.ts` |
| `crit_butterfly_b` | 8×8 | 4 (`_0…_3`) | Kleintier (Umgebung) · Modul `objects/gruenwald.ts` |
| `crit_cavebat` | 12×10 | 4 (`_0…_3`) | Kleintier (Umgebung) · Modul `objects/kristall.ts` |
| `crit_cavefish` | 16×12 | 5 (`_0…_4`) | Kleintier (Umgebung) · Modul `objects/kristall.ts` |
| `crit_dragonfly` | 10×8 | 2 (`_0…_1`) | Kleintier (Umgebung) · Modul `objects/gruenwald.ts` |
| `crit_emberfly` | 5×5 | 2 (`_0…_1`) | Kleintier (Umgebung) · Modul `objects/glut.ts` |
| `crit_eyeling_idle` | 10×10 | 2 (`_0…_1`) | Kleintier (Umgebung) · Modul `objects/schatten.ts` |
| `crit_eyeling_run` | 10×10 | 4 (`_0…_3`) | Kleintier (Umgebung) · Modul `objects/schatten.ts` |
| `crit_firefly` | 5×5 | 2 (`_0…_1`) | Kleintier (Umgebung) · Modul `objects/gruenwald.ts` |
| `crit_fish` | 16×12 | 5 (`_0…_4`) | Kleintier (Umgebung) · Modul `objects/gruenwald.ts` |
| `crit_frog_hop` | 12×10 | 3 (`_0…_2`) | Kleintier (Umgebung) · Modul `objects/gruenwald.ts` |
| `crit_frog_idle` | 12×10 | 2 (`_0…_1`) | Kleintier (Umgebung) · Modul `objects/gruenwald.ts` |
| `crit_glowbug` | 5×5 | 2 (`_0…_1`) | Kleintier (Umgebung) · Modul `objects/kristall.ts` |
| `crit_hare_hop` | 16×16 | 4 (`_0…_3`) | Kleintier (Umgebung) · Modul `objects/frost.ts` |
| `crit_hare_idle` | 16×16 | 2 (`_0…_1`) | Kleintier (Umgebung) · Modul `objects/frost.ts` |
| `crit_icesparkle` | 5×5 | 2 (`_0…_1`) | Kleintier (Umgebung) · Modul `objects/frost.ts` |
| `crit_lavapop` | 16×14 | 5 (`_0…_4`) | Kleintier (Umgebung) · Modul `objects/glut.ts` |
| `crit_lizard_idle` | 16×8 | 2 (`_0…_1`) | Kleintier (Umgebung) · Modul `objects/glut.ts` |
| `crit_lizard_run` | 16×8 | 4 (`_0…_3`) | Kleintier (Umgebung) · Modul `objects/glut.ts` |
| `crit_moth` | 8×8 | 4 (`_0…_3`) | Kleintier (Umgebung) · Modul `objects/ruinen.ts` |
| `crit_newt_idle` | 14×8 | 2 (`_0…_1`) | Kleintier (Umgebung) · Modul `objects/kristall.ts` |
| `crit_newt_run` | 14×8 | 4 (`_0…_3`) | Kleintier (Umgebung) · Modul `objects/kristall.ts` |
| `crit_rabbit_hop` | 16×16 | 4 (`_0…_3`) | Kleintier (Umgebung) · Modul `objects/gruenwald.ts` |
| `crit_rabbit_idle` | 16×16 | 2 (`_0…_1`) | Kleintier (Umgebung) · Modul `objects/gruenwald.ts` |
| `crit_scarab_idle` | 10×8 | 2 (`_0…_1`) | Kleintier (Umgebung) · Modul `objects/ruinen.ts` |
| `crit_scarab_run` | 10×8 | 4 (`_0…_3`) | Kleintier (Umgebung) · Modul `objects/ruinen.ts` |
| `crit_shadowmoth` | 8×8 | 4 (`_0…_3`) | Kleintier (Umgebung) · Modul `objects/schatten.ts` |
| `crit_snowbird_fly` | 12×12 | 4 (`_0…_3`) | Kleintier (Umgebung) · Modul `objects/frost.ts` |
| `crit_snowbird_idle` | 12×12 | 2 (`_0…_1`) | Kleintier (Umgebung) · Modul `objects/frost.ts` |
| `crit_snowbird_peck` | 12×12 | 2 (`_0…_1`) | Kleintier (Umgebung) · Modul `objects/frost.ts` |
| `crit_squirrel_idle` | 16×14 | 2 (`_0…_1`) | Kleintier (Umgebung) · Modul `objects/gruenwald.ts` |
| `crit_squirrel_run` | 16×14 | 4 (`_0…_3`) | Kleintier (Umgebung) · Modul `objects/gruenwald.ts` |
| `crit_voidspark` | 5×5 | 2 (`_0…_1`) | Kleintier (Umgebung) · Modul `objects/schatten.ts` |
| `crit_wisp` | 5×5 | 2 (`_0…_1`) | Kleintier (Umgebung) · Modul `objects/ruinen.ts` |
| `crystal_big` | 40×60 | 4 (`_0…_3`) | Weltdeko · Modul `objects/kristall.ts` |
| `crystal_blue` | 20×30 | 4 (`_0…_3`) | Weltdeko · Modul `objects/kristall.ts` |
| `crystal_pink` | 20×30 | 4 (`_0…_3`) | Weltdeko · Modul `objects/kristall.ts` |
| `crystal_shards` | 16×12 | 1 | Weltdeko · Modul `objects/kristall.ts` |
| `crystal_teal` | 28×24 | 4 (`_0…_3`) | Weltdeko · Modul `objects/kristall.ts` |
| `cypress` | 24×64 | 4 (`_0…_3`) | Weltdeko · Modul `objects/ruinen.ts` |
| `d_banner` | 16×36 | 4 (`_0…_3`) | Dungeon-Ausstattung · Modul `objects/common.ts` |
| `d_barrel` | 14×18 | 1 | Dungeon-Ausstattung · Modul `objects/common.ts` |
| `d_bones` | 16×10 | 1 | Dungeon-Ausstattung · Modul `objects/common.ts` |
| `d_bookshelf` | 32×40 | 1 | Dungeon-Ausstattung · Modul `objects/common.ts` |
| `d_candles` | 12×14 | 4 (`_0…_3`) | Dungeon-Ausstattung · Modul `objects/common.ts` |
| `d_chains` | 12×30 | 1 | Dungeon-Ausstattung · Modul `objects/common.ts` |
| `d_cobweb` | 20×20 | 1 | Dungeon-Ausstattung · Modul `objects/common.ts` |
| `d_crack` | 20×14 | 3 (`_0…_2`) | Dungeon-Ausstattung · Modul `objects/common.ts` |
| `d_crate` | 16×18 | 1 | Dungeon-Ausstattung · Modul `objects/common.ts` |
| `d_grate` | 16×16 | 1 | Dungeon-Ausstattung · Modul `objects/common.ts` |
| `d_moss` | 20×14 | 3 (`_0…_2`) | Dungeon-Ausstattung · Modul `objects/common.ts` |
| `d_mushroom_glow` | 12×12 | 2 (`_0…_1`) | Dungeon-Ausstattung · Modul `objects/common.ts` |
| `d_pillar` | 16×44 | 1 | Dungeon-Ausstattung · Modul `objects/common.ts` |
| `d_pillar_broken` | 16×28 | 1 | Dungeon-Ausstattung · Modul `objects/common.ts` |
| `d_puddle` | 20×12 | 1 | Dungeon-Ausstattung · Modul `objects/common.ts` |
| `d_rack` | 28×32 | 1 | Dungeon-Ausstattung · Modul `objects/common.ts` |
| `d_roots` | 32×36 | 1 | Dungeon-Ausstattung · Modul `objects/common.ts` |
| `d_rubble` | 24×16 | 1 | Dungeon-Ausstattung · Modul `objects/common.ts` |
| `d_rug_a` | 48×32 | 1 | Dungeon-Ausstattung · Modul `objects/common.ts` |
| `d_rug_b` | 48×32 | 1 | Dungeon-Ausstattung · Modul `objects/common.ts` |
| `d_sarcophagus` | 36×26 | 1 | Dungeon-Ausstattung · Modul `objects/common.ts` |
| `d_skull` | 10×10 | 1 | Dungeon-Ausstattung · Modul `objects/common.ts` |
| `d_statue` | 24×48 | 1 | Dungeon-Ausstattung · Modul `objects/common.ts` |
| `d_table` | 32×22 | 1 | Dungeon-Ausstattung · Modul `objects/common.ts` |
| `d_urn` | 14×18 | 1 | Dungeon-Ausstattung · Modul `objects/common.ts` |
| `dead_tree` | 44×64 | 1 | Weltdeko · Modul `objects/glut.ts` |
| `dig_crates` | 24×22 | 1 | Weltdeko · Modul `objects/ruinen.ts` |
| `dig_spot` | 22×14 | 1 | Weltdeko · Modul `objects/common.ts` |
| `dig_table` | 32×24 | 1 | Weltdeko · Modul `objects/ruinen.ts` |
| `dig_tent` | 48×44 | 1 | Weltdeko · Modul `objects/ruinen.ts` |
| `door_boss` | 32×40 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `door_closed` | 16×32 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `door_locked` | 16×32 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `door_open` | 16×32 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `drip_stone` | 12×20 | 1 | Weltdeko · Modul `objects/kristall.ts` |
| `drop_bag` | 14×14 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `drop_gear` | 14×14 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `drop_gold` | 14×14 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `drop_key` | 14×14 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `drop_potion` | 14×14 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `ember_vent` | 16×20 | 4 (`_0…_3`) | Weltdeko · Modul `objects/glut.ts` |
| `eye_stalk` | 14×28 | 4 (`_0…_3`) | Weltdeko · Modul `objects/schatten.ts` |
| `fence_h` | 16×16 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `fence_post` | 8×18 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `fence_v` | 16×24 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `fern` | 16×16 | 4 (`_0…_3`) | Weltdeko · Modul `objects/gruenwald.ts` |
| `fire_geyser` | 16×40 | 6 (`_0…_5`) | Weltdeko · Modul `objects/glut.ts` |
| `floating_rune` | 12×16 | 4 (`_0…_3`) | Weltdeko · Modul `objects/ruinen.ts` |
| `floating_shard` | 16×28 | 4 (`_0…_3`) | Weltdeko · Modul `objects/schatten.ts` |
| `flowers_a` | 16×16 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `flowers_b` | 16×16 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `flowers_c` | 16×16 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `flowers_d` | 16×16 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `flowers_e` | 16×16 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `flowers_f` | 16×16 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `forge` | 32×44 | 4 (`_0…_3`) | Weltdeko · Modul `objects/gruenwald.ts` |
| `forge_ruin` | 44×48 | 1 | Weltdeko · Modul `objects/glut.ts` |
| `frozen_bush` | 22×18 | 1 | Weltdeko · Modul `objects/frost.ts` |
| `frozen_statue` | 20×40 | 1 | Weltdeko · Modul `objects/frost.ts` |
| `fur_rack` | 28×30 | 1 | Weltdeko · Modul `objects/frost.ts` |
| `gate_bars` | 16×32 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `ghost_flower` | 12×16 | 4 (`_0…_3`) | Weltdeko · Modul `objects/schatten.ts` |
| `glowshroom` | 16×18 | 4 (`_0…_3`) | Weltdeko · Modul `objects/kristall.ts` |
| `glowshroom_big` | 20×30 | 4 (`_0…_3`) | Weltdeko · Modul `objects/kristall.ts` |
| `grave` | 16×20 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `haystack` | 28×24 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `house_a` | 80×100 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `house_b` | 80×100 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `house_c` | 80×100 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `house_shelf` | 26×38 | 1 | Weltdeko · Modul `objects/common.ts` |
| `house_table` | 32×24 | 1 | Weltdeko · Modul `objects/common.ts` |
| `hueterschrein` | 32×48 | 4 (`_0…_3`) | Weltdeko · Modul `objects/common.ts` |
| `ice_crack` | 24×14 | 1 | Weltdeko · Modul `objects/frost.ts` |
| `ice_crystal` | 20×26 | 4 (`_0…_3`) | Weltdeko · Modul `objects/frost.ts` |
| `ice_spike` | 16×28 | 1 | Weltdeko · Modul `objects/frost.ts` |
| `ice_spike_l` | 28×48 | 1 | Weltdeko · Modul `objects/frost.ts` |
| `icicle_log` | 40×18 | 1 | Weltdeko · Modul `objects/frost.ts` |
| `lamp` | 16×44 | 4 (`_0…_3`) | Weltdeko · Modul `objects/gruenwald.ts` |
| `lantern_frost` | 14×36 | 4 (`_0…_3`) | Weltdeko · Modul `objects/frost.ts` |
| `lantern_post` | 14×36 | 4 (`_0…_3`) | Weltdeko · Modul `objects/kristall.ts` |
| `last_light` | 20×40 | 4 (`_0…_3`) | Weltdeko · Modul `objects/schatten.ts` |
| `lava_rock` | 22×20 | 4 (`_0…_3`) | Weltdeko · Modul `objects/glut.ts` |
| `leafpile` | 16×10 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `lever_mid` | 16×18 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `lever_off` | 16×18 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `lever_on` | 16×18 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `lily_flower` | 12×10 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `lilypad_a` | 12×8 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `lilypad_b` | 12×8 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `log` | 40×18 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `log_moss` | 40×18 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `lore_book` | 16×14 | 1 | Weltdeko · Modul `objects/common.ts` |
| `lore_scroll` | 16×14 | 1 | Weltdeko · Modul `objects/common.ts` |
| `lore_stone` | 18×20 | 1 | Weltdeko · Modul `objects/common.ts` |
| `lore_tablet` | 16×18 | 1 | Weltdeko · Modul `objects/common.ts` |
| `lost_toy` | 12×10 | 1 | Weltdeko · Modul `objects/schatten.ts` |
| `magma_crack` | 24×14 | 3 (`_0…_2`) | Weltdeko · Modul `objects/glut.ts` |
| `mana_surge` | 32×40 | 4 (`_0…_3`) | Weltdeko · Modul `objects/common.ts` |
| `memory_frame` | 20×26 | 1 | Weltdeko · Modul `objects/schatten.ts` |
| `mine_cart` | 30×24 | 1 | Weltdeko · Modul `objects/kristall.ts` |
| `mine_rails` | 32×12 | 1 | Weltdeko · Modul `objects/kristall.ts` |
| `mine_support` | 48×56 | 1 | Weltdeko · Modul `objects/kristall.ts` |
| `mosaic` | 32×24 | 3 (`_0…_2`) | Weltdeko · Modul `objects/ruinen.ts` |
| `mushroom_big` | 16×20 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `mushrooms` | 16×12 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `node_crystal` | 20×22 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `node_ember` | 20×20 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `node_empty` | 16×10 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `node_frost` | 20×20 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `node_herb` | 16×18 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `node_rune` | 20×22 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `node_void` | 20×22 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `node_wood` | 20×24 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `nomad_banner` | 16×44 | 4 (`_0…_3`) | Weltdeko · Modul `objects/glut.ts` |
| `nomad_brazier` | 16×26 | 4 (`_0…_3`) | Weltdeko · Modul `objects/glut.ts` |
| `nomad_tent` | 48×44 | 1 | Weltdeko · Modul `objects/glut.ts` |
| `obelisk` | 20×56 | 4 (`_0…_3`) | Weltdeko · Modul `objects/ruinen.ts` |
| `obsidian` | 18×26 | 1 | Weltdeko · Modul `objects/glut.ts` |
| `obsidian_big` | 36×48 | 1 | Weltdeko · Modul `objects/glut.ts` |
| `ore_crate` | 16×18 | 1 | Weltdeko · Modul `objects/kristall.ts` |
| `pebbles` | 16×8 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `pickaxe_rack` | 20×26 | 1 | Weltdeko · Modul `objects/kristall.ts` |
| `pillar` | 18×52 | 1 | Weltdeko · Modul `objects/ruinen.ts` |
| `pillar_broken` | 18×30 | 1 | Weltdeko · Modul `objects/ruinen.ts` |
| `pillar_fallen` | 48×18 | 1 | Weltdeko · Modul `objects/ruinen.ts` |
| `pine_snow` | 48×88 | 4 (`_0…_3`) | Weltdeko · Modul `objects/frost.ts` |
| `pine_snow_small` | 24×36 | 4 (`_0…_3`) | Weltdeko · Modul `objects/frost.ts` |
| `pine_snow2` | 40×72 | 4 (`_0…_3`) | Weltdeko · Modul `objects/frost.ts` |
| `plate_down` | 16×16 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `plate_up` | 16×16 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `portal` | 40×56 | 8 (`_0…_7`) | interaktives Objekt · Modul `objects/common.ts` |
| `prayer_flags` | 48×40 | 4 (`_0…_3`) | Weltdeko · Modul `objects/frost.ts` |
| `puddle_cave` | 20×12 | 1 | Weltdeko · Modul `objects/kristall.ts` |
| `push_block` | 16×22 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `quellstein` | 32×52 | 6 (`_0…_5`) | interaktives Objekt · Modul `objects/common.ts` |
| `quellstein_off` | 32×52 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `reeds` | 16×26 | 4 (`_0…_3`) | Weltdeko · Modul `objects/gruenwald.ts` |
| `ribcage` | 30×22 | 1 | Weltdeko · Modul `objects/glut.ts` |
| `riss_stein` | 28×44 | 4 (`_0…_3`) | Weltdeko · Modul `objects/common.ts` |
| `rock_cave_l` | 36×30 | 1 | Weltdeko · Modul `objects/kristall.ts` |
| `rock_cave_m` | 24×20 | 1 | Weltdeko · Modul `objects/kristall.ts` |
| `rock_cave_s` | 16×14 | 1 | Weltdeko · Modul `objects/kristall.ts` |
| `rock_l` | 36×28 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `rock_m` | 24×20 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `rock_moss` | 28×22 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `rock_s` | 16×14 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `rubble` | 24×16 | 1 | Weltdeko · Modul `objects/ruinen.ts` |
| `rug` | 40×26 | 1 | Weltdeko · Modul `objects/common.ts` |
| `rune_stone` | 20×32 | 4 (`_0…_3`) | Weltdeko · Modul `objects/ruinen.ts` |
| `sacks` | 16×16 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `sapling` | 24×32 | 4 (`_0…_3`) | Weltdeko · Modul `objects/gruenwald.ts` |
| `scarecrow` | 24×40 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `scorched_bush` | 20×16 | 1 | Weltdeko · Modul `objects/glut.ts` |
| `seal_pedestal` | 24×32 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `shadow_spire` | 20×48 | 1 | Weltdeko · Modul `objects/schatten.ts` |
| `shadow_spire_l` | 36×72 | 1 | Weltdeko · Modul `objects/schatten.ts` |
| `shard` | 16×26 | 6 (`_0…_5`) | interaktives Objekt · Modul `objects/common.ts` |
| `shrine` | 36×52 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `signpost` | 16×28 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `skull` | 12×10 | 1 | Weltdeko · Modul `objects/glut.ts` |
| `sled` | 30×16 | 1 | Weltdeko · Modul `objects/frost.ts` |
| `snow_rock` | 24×18 | 1 | Weltdeko · Modul `objects/frost.ts` |
| `snow_rock_l` | 38×28 | 1 | Weltdeko · Modul `objects/frost.ts` |
| `snowdrift` | 24×10 | 1 | Weltdeko · Modul `objects/frost.ts` |
| `snowman` | 18×26 | 1 | Weltdeko · Modul `objects/frost.ts` |
| `spikes` | 16×16 | 4 (`_0…_3`) | interaktives Objekt · Modul `objects/common.ts` |
| `stairs_down` | 32×32 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `stairs_up` | 32×32 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `stalagmite` | 16×28 | 1 | Weltdeko · Modul `objects/kristall.ts` |
| `stalagmite_cluster` | 32×36 | 1 | Weltdeko · Modul `objects/kristall.ts` |
| `stalagmite_l` | 24×44 | 1 | Weltdeko · Modul `objects/kristall.ts` |
| `stall` | 48×44 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `star_shard` | 18×20 | 4 (`_0…_3`) | Weltdeko · Modul `objects/common.ts` |
| `stash_chest` | 32×26 | 1 | Weltdeko · Modul `objects/common.ts` |
| `station_alchemy` | 32×30 | 1 | Weltdeko · Modul `objects/common.ts` |
| `station_cook` | 28×35 | 4 (`_0…_3`) | Weltdeko · Modul `objects/common.ts` |
| `station_enchant` | 28×38 | 4 (`_0…_3`) | Weltdeko · Modul `objects/common.ts` |
| `statue` | 24×52 | 1 | Weltdeko · Modul `objects/ruinen.ts` |
| `statue_broken` | 24×34 | 1 | Weltdeko · Modul `objects/ruinen.ts` |
| `stump` | 20×16 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `stump_moss` | 20×16 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `sundial` | 24×20 | 1 | Weltdeko · Modul `objects/ruinen.ts` |
| `tallgrass` | 16×16 | 4 (`_0…_3`) | Weltdeko · Modul `objects/gruenwald.ts` |
| `tendril` | 16×30 | 4 (`_0…_3`) | Weltdeko · Modul `objects/schatten.ts` |
| `tent` | 44×40 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `tombstone` | 16×20 | 1 | Weltdeko · Modul `objects/schatten.ts` |
| `tombstone_b` | 16×22 | 1 | Weltdeko · Modul `objects/schatten.ts` |
| `torch` | 12×30 | 4 (`_0…_3`) | interaktives Objekt · Modul `objects/common.ts` |
| `tree_birch` | 48×88 | 4 (`_0…_3`) | Weltdeko · Modul `objects/gruenwald.ts` |
| `tree_dead` | 48×64 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `tree_oak` | 96×112 | 4 (`_0…_3`) | Weltdeko · Modul `objects/gruenwald.ts` |
| `tree_oak2` | 88×104 | 4 (`_0…_3`) | Weltdeko · Modul `objects/gruenwald.ts` |
| `tree_pine` | 56×96 | 4 (`_0…_3`) | Weltdeko · Modul `objects/gruenwald.ts` |
| `tree_willow` | 96×104 | 4 (`_0…_3`) | Weltdeko · Modul `objects/gruenwald.ts` |
| `trophy_stand` | 20×34 | 1 | Weltdeko · Modul `objects/common.ts` |
| `turret` | 16×26 | 1 | interaktives Objekt · Modul `objects/common.ts` |
| `twisted_tree` | 56×80 | 4 (`_0…_3`) | Weltdeko · Modul `objects/schatten.ts` |
| `urn` | 14×18 | 1 | Weltdeko · Modul `objects/ruinen.ts` |
| `urn_broken` | 16×12 | 1 | Weltdeko · Modul `objects/ruinen.ts` |
| `vine_tree` | 56×80 | 4 (`_0…_3`) | Weltdeko · Modul `objects/ruinen.ts` |
| `void_crystal` | 20×32 | 4 (`_0…_3`) | Weltdeko · Modul `objects/schatten.ts` |
| `void_rift` | 28×40 | 4 (`_0…_3`) | Weltdeko · Modul `objects/schatten.ts` |
| `wall_frag` | 48×30 | 1 | Weltdeko · Modul `objects/ruinen.ts` |
| `wall_ruin_end` | 24×24 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `wall_ruin_h` | 48×26 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `wall_torch` | 12×22 | 4 (`_0…_3`) | interaktives Objekt · Modul `objects/common.ts` |
| `water_skins` | 16×16 | 1 | Weltdeko · Modul `objects/glut.ts` |
| `well` | 32×44 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `wheat` | 16×26 | 4 (`_0…_3`) | Weltdeko · Modul `objects/gruenwald.ts` |
| `woodpile` | 28×20 | 1 | Weltdeko · Modul `objects/gruenwald.ts` |
| `woodpile_snow` | 28×20 | 1 | Weltdeko · Modul `objects/frost.ts` |

## Atlas: fx (318 Frames, 1024×729)

| Name | Größe | Frames | Herkunft / Verwendung |
|---|---|---|---|
| `arrow` | 16×7 | 1 | Geschoss |
| `arrow_marker` | 12×12 | 2 (`_0…_1`) | Geschoss |
| `arrow_trail` | 24×5 | 3 (`_0…_2`) | Geschoss |
| `ash` | 4×4 | 2 (`_0…_1`) | Wetter/Umgebung |
| `bite` | 32×32 | 4 (`_0…_3`) | Kampf: Waffenspur/Treffer |
| `blink` | 32×40 | 6 (`_0…_5`) | Effekt |
| `block` | 32×32 | 4 (`_0…_3`) | Kampf: Waffenspur/Treffer |
| `bolt_arcane` | 20×16 | 4 (`_0…_3`) | Geschoss |
| `bolt_dark` | 22×18 | 4 (`_0…_3`) | Geschoss |
| `bolt_earth` | 18×16 | 4 (`_0…_3`) | Geschoss |
| `bolt_fire` | 24×16 | 4 (`_0…_3`) | Geschoss |
| `bolt_light` | 26×14 | 4 (`_0…_3`) | Geschoss |
| `bolt_water` | 24×14 | 4 (`_0…_3`) | Geschoss |
| `bolt_wind` | 24×18 | 4 (`_0…_3`) | Geschoss |
| `bubble` | 16×14 | 1 | Weltmarker |
| `buff` | 32×40 | 5 (`_0…_4`) | Effekt |
| `burn` | 16×20 | 4 (`_0…_3`) | Effekt |
| `cast` | 40×40 | 6 (`_0…_5`) | Effekt |
| `claw` | 40×40 | 4 (`_0…_3`) | Kampf: Waffenspur/Treffer |
| `crack` | 48×32 | 3 (`_0…_2`) | Effekt |
| `dagger` | 14×7 | 1 | Geschoss |
| `death_poof` | 32×32 | 6 (`_0…_5`) | Effekt |
| `dodge_trail` | 32×24 | 4 (`_0…_3`) | Effekt |
| `drip` | 6×14 | 4 (`_0…_3`) | Wetter/Umgebung |
| `dust` | 16×16 | 5 (`_0…_4`) | Effekt |
| `dust_run` | 12×8 | 4 (`_0…_3`) | Effekt |
| `ember` | 3×3 | 2 (`_0…_1`) | Wetter/Umgebung |
| `exclaim` | 12×18 | 1 | Weltmarker |
| `explosion_dark` | 64×64 | 8 (`_0…_7`) | Explosion |
| `explosion_earth` | 64×64 | 8 (`_0…_7`) | Explosion |
| `explosion_fire` | 64×64 | 8 (`_0…_7`) | Explosion |
| `explosion_light` | 64×64 | 8 (`_0…_7`) | Explosion |
| `explosion_phys` | 48×48 | 6 (`_0…_5`) | Explosion |
| `explosion_water` | 64×64 | 8 (`_0…_7`) | Explosion |
| `explosion_wind` | 64×64 | 8 (`_0…_7`) | Explosion |
| `footprint` | 6×5 | 1 | Effekt |
| `frost` | 16×20 | 4 (`_0…_3`) | Effekt |
| `glow` | 128×128 | 1 | Effekt |
| `glow_small` | 48×48 | 1 | Effekt |
| `godray` | 48×160 | 1 | Wetter/Umgebung |
| `heal` | 32×48 | 6 (`_0…_5`) | Effekt |
| `heat` | 16×24 | 4 (`_0…_3`) | Wetter/Umgebung |
| `hit` | 32×32 | 5 (`_0…_4`) | Kampf: Waffenspur/Treffer |
| `hit_crit` | 48×48 | 6 (`_0…_5`) | Kampf: Waffenspur/Treffer |
| `hit_magic` | 32×32 | 5 (`_0…_4`) | Kampf: Waffenspur/Treffer |
| `lance` | 48×12 | 3 (`_0…_2`) | Geschoss |
| `leaf` | 8×8 | 4 (`_0…_3`) | Wetter/Umgebung |
| `levelup` | 64×64 | 8 (`_0…_7`) | Effekt |
| `mark` | 16×16 | 2 (`_0…_1`) | Effekt |
| `mote` | 3×3 | 1 | Wetter/Umgebung |
| `petal` | 5×5 | 2 (`_0…_1`) | Wetter/Umgebung |
| `pillar` | 32×96 | 7 (`_0…_6`) | Effekt |
| `poison` | 16×20 | 4 (`_0…_3`) | Effekt |
| `px` | 2×2 | 1 | Effekt |
| `question` | 12×18 | 1 | Weltmarker |
| `question_grey` | 12×18 | 1 | Weltmarker |
| `rain_splash` | 8×5 | 3 (`_0…_2`) | Wetter/Umgebung |
| `raindrop` | 2×10 | 1 | Wetter/Umgebung |
| `ring` | 64×64 | 1 | Effekt |
| `ripple` | 16×10 | 4 (`_0…_3`) | Effekt |
| `rune_circle` | 64×64 | 1 | Effekt |
| `rune_circle_big` | 112×80 | 1 | Effekt |
| `scorch` | 40×28 | 1 | Effekt |
| `shadow` | 24×10 | 1 | Effekt |
| `shadow_l` | 48×18 | 1 | Effekt |
| `shield` | 40×44 | 4 (`_0…_3`) | Effekt |
| `shockwave` | 96×72 | 6 (`_0…_5`) | Effekt |
| `slash_dagger` | 48×40 | 5 (`_0…_4`) | Kampf: Waffenspur/Treffer |
| `slash_heavy` | 80×80 | 7 (`_0…_6`) | Kampf: Waffenspur/Treffer |
| `slash_sword` | 64×64 | 6 (`_0…_5`) | Kampf: Waffenspur/Treffer |
| `smash_hammer` | 72×56 | 7 (`_0…_6`) | Kampf: Waffenspur/Treffer |
| `smoke` | 16×16 | 4 (`_0…_3`) | Effekt |
| `snowflake` | 7×7 | 3 (`_0…_2`) | Wetter/Umgebung |
| `spark` | 5×5 | 1 | Effekt |
| `sparkle` | 8×8 | 4 (`_0…_3`) | Effekt |
| `spawn` | 32×32 | 6 (`_0…_5`) | Effekt |
| `splash` | 16×16 | 5 (`_0…_4`) | Effekt |
| `spore` | 8×8 | 2 (`_0…_1`) | Geschoss |
| `star` | 7×7 | 1 | Effekt |
| `status_buff` | 8×8 | 1 | Weltmarker |
| `status_burn` | 8×8 | 1 | Weltmarker |
| `status_poison` | 8×8 | 1 | Weltmarker |
| `status_shield` | 8×8 | 1 | Weltmarker |
| `status_slow` | 8×8 | 1 | Weltmarker |
| `status_stun` | 8×8 | 1 | Weltmarker |
| `stun` | 24×12 | 4 (`_0…_3`) | Effekt |
| `target` | 28×14 | 1 | Weltmarker |
| `tele_ring` | 64×64 | 1 | Effekt |
| `thrust` | 56×20 | 4 (`_0…_3`) | Kampf: Waffenspur/Treffer |
| `void_mote` | 5×5 | 3 (`_0…_2`) | Wetter/Umgebung |
| `weak` | 16×16 | 2 (`_0…_1`) | Effekt |

## Atlas: icons (318 Frames, 501×401)

| Name | Größe | Frames | Herkunft / Verwendung |
|---|---|---|---|
| `item_amulet` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_armor_heavy` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_armor_light` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_axe` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_bosskey` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_bow` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_charm` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_dagger` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_food` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_gem` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_gold` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_hammer` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_helm_heavy` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_helm_light` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_hood` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_key` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_mat_crystal` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_mat_ember` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_mat_frost` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_mat_herb` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_mat_rune` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_mat_void` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_mat_wood` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_potion_elixir` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_potion_hp` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_potion_mp` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_ring` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_robe` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_scroll` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_seal_dark` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_seal_earth` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_seal_fire` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_seal_light` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_seal_water` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_seal_wind` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_shard` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_staff` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `item_sword` | 24×24 | 1 | Gegenstands-Icon (Inventar, Händler, Beute) |
| `skill_arrow_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_arrow_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_arrow_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_arrow_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_arrow_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_arrow_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_arrow_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_aura_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_aura_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_aura_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_aura_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_aura_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_aura_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_aura_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_barrier_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_barrier_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_barrier_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_barrier_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_barrier_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_barrier_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_barrier_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_blink_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_blink_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_blink_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_blink_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_blink_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_blink_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_blink_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_bolt_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_bolt_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_bolt_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_bolt_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_bolt_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_bolt_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_bolt_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_chain_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_chain_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_chain_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_chain_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_chain_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_chain_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_chain_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_charge_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_charge_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_charge_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_charge_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_charge_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_charge_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_charge_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_cleave_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_cleave_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_cleave_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_cleave_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_cleave_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_cleave_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_cleave_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_eagle_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_eagle_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_eagle_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_eagle_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_eagle_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_eagle_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_eagle_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_fan_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_fan_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_fan_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_fan_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_fan_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_fan_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_fan_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_fireball_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_fireball_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_fireball_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_fireball_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_fireball_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_fireball_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_fireball_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_frost_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_frost_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_frost_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_frost_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_frost_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_frost_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_frost_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_hammer_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_hammer_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_hammer_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_hammer_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_hammer_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_hammer_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_hammer_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_heal_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_heal_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_heal_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_heal_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_heal_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_heal_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_heal_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_holy_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_holy_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_holy_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_holy_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_holy_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_holy_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_holy_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_mark_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_mark_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_mark_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_mark_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_mark_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_mark_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_mark_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_meteor_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_meteor_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_meteor_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_meteor_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_meteor_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_meteor_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_meteor_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_multishot_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_multishot_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_multishot_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_multishot_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_multishot_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_multishot_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_multishot_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_nova_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_nova_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_nova_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_nova_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_nova_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_nova_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_nova_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_crit_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_crit_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_crit_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_crit_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_crit_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_crit_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_crit_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_def_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_def_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_def_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_def_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_def_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_def_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_def_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_dex_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_dex_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_dex_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_dex_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_dex_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_dex_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_dex_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_element_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_element_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_element_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_element_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_element_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_element_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_element_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_int_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_int_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_int_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_int_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_int_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_int_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_int_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_mana_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_mana_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_mana_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_mana_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_mana_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_mana_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_mana_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_speed_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_speed_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_speed_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_speed_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_speed_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_speed_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_speed_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_str_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_str_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_str_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_str_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_str_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_str_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_str_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_vit_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_vit_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_vit_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_vit_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_vit_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_vit_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_p_vit_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_poison_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_poison_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_poison_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_poison_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_poison_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_poison_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_poison_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_quake_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_quake_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_quake_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_quake_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_quake_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_quake_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_quake_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_rain_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_rain_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_rain_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_rain_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_rain_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_rain_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_rain_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_roll_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_roll_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_roll_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_roll_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_roll_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_roll_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_roll_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_shield_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_shield_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_shield_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_shield_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_shield_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_shield_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_shield_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_shout_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_shout_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_shout_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_shout_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_shout_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_shout_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_shout_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_slash_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_slash_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_slash_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_slash_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_slash_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_slash_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_slash_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_smite_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_smite_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_smite_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_smite_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_smite_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_smite_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_smite_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_stab_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_stab_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_stab_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_stab_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_stab_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_stab_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_stab_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_trap_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_trap_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_trap_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_trap_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_trap_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_trap_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_trap_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_vanish_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_vanish_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_vanish_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_vanish_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_vanish_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_vanish_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_vanish_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_whirl_dark` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_whirl_earth` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_whirl_fire` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_whirl_light` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_whirl_phys` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_whirl_water` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |
| `skill_whirl_wind` | 24×24 | 1 | Fähigkeiten-Icon in Elementfarbe (Skilltree, Leiste) |

## Flüssigkeiten (nahtlos kachelnde Animationsstreifen)

| Biom | Frame | Frames |
|---|---|---|
| `liquids/frost.png` | 64×64 | 8 |
| `liquids/ruinen.png` | 64×64 | 8 |
| `liquids/gruenwald.png` | 64×64 | 8 |
| `liquids/kristall.png` | 64×64 | 8 |
| `liquids/glut.png` | 64×64 | 8 |
| `liquids/schatten.png` | 64×64 | 8 |

## Overlays (256×256, nahtlos)

| Datei | Verwendung |
|---|---|
| `overlays/fog.png` | ziehender Nebel |
| `overlays/cloud_shadow.png` | Wolkenschatten über der Oberwelt |
| `overlays/leaf_shadow.png` | Blätterschatten im Grünwald |

