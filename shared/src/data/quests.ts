import type { CharData } from '../types';
import { countShards } from '../stats';
import { condOk, countLore, countMemories, type Cond } from './cond';
import { TOPICS } from './dialoge';
import { QUESTS_AKT2 } from './quests_akt2';
import { ZONE_CHAPTER } from './story';

export type Objective =
  | { t: 'kill'; mob: string; n: number; label: string }
  | { t: 'killzone'; zone: string; n: number; label: string }
  | { t: 'boss'; boss: string; label: string }
  | { t: 'bossparty'; n: number; label: string }
  | { t: 'collect'; item: string; n: number; label: string }
  | { t: 'talk'; npc: string; label: string }
  | { t: 'shards'; n: number; label: string }
  // ---- ab 0.3 (alle aus Flags abgeleitet): Chronik-Dokument finden, Ort besuchen, Entscheidung treffen, Echo bestehen, Gesprächs-Flag, Hüter-Erinnerungen
  | { t: 'lore'; doc: string; label: string }
  | { t: 'lorecount'; n: number; label: string }
  | { t: 'visit'; place: string; label: string }
  | { t: 'decide'; id: string; label: string }
  | { t: 'echo'; id: string; label: string }
  | { t: 'flag'; flag: string; label: string }
  | { t: 'memories'; n: number; label: string };
/** Ziele, deren Fortschritt aus dem Charakterstand abgeleitet wird (nicht aus `QuestState.p`). */
export const DERIVED_OBJECTIVES = new Set<Objective['t']>(['collect', 'shards', 'lore', 'lorecount', 'visit', 'decide', 'echo', 'flag', 'memories']);
export interface QuestRewards { xp: number; gold: number; items?: [string, number][]; gear?: number; skillPoints?: number; attrPoints?: number }

export interface QuestDef {
  id: string;
  name: string;
  type: 'main' | 'side' | 'repeat' | 'group';
  giver: string;
  turnIn?: string;
  level: number;
  zone: string;
  requires?: string[];
  summary: string;
  objectives: Objective[];
  rewards: QuestRewards;
  offer: string[];
  progress: string;
  done: string[];
  /** Story-Einblendung nach Abschluss */
  story?: string;
  // ---- ab 0.3
  /** Hauptquest: Kapitel (7–10, 11 = Epilog); für Akt I ergibt es sich aus der Zone */
  chapter?: number;
  /** Questreihe für das Questlog, z. B. „Hüterschrein“ oder „Borin“ */
  line?: string;
  /** Geheimquest: wird nie angeboten, sondern ausgelöst (Dialog, Fundstück, Ort) und erscheint erst dann im Log */
  hidden?: boolean;
  /** zusätzliche Voraussetzung (Entscheidungen, Flags, Queststände) */
  when?: Cond;
  /** Auslöser verborgener Quests: eines der Dokumente gelesen / Ort betreten */
  trigger?: { lore?: string[]; visit?: string };
  /** Filmszene nach Abschluss – fest oder je nach Bedingung (erste passende) */
  cine?: string | { if: Cond; id: string }[];
  /** abweichende Texte je nach Bedingung (erste passende Variante gewinnt, fehlende Teile fallen auf den Standard zurück) */
  alt?: { if: Cond; offer?: string[]; progress?: string; done?: string[] }[];
  /** zusätzliche Belohnung je nach Bedingung (z. B. getroffene Entscheidung) */
  bonus?: ({ if: Cond; note: string } & Partial<QuestRewards>)[];
  /** Flags, die der Abschluss setzt */
  flags?: string[];
}

const Q = (q: QuestDef) => q;

export const QUEST_LIST: QuestDef[] = [
  // ================================================================================== HAUPTGESCHICHTE
  Q({ id: 'm_erwachen', name: 'Ein Flüstern im Wasser', type: 'main', giver: 'mirelda', level: 1, zone: 'gruenwald',
    summary: 'Die Quelle unter Quellhain wird schwächer, und die Geschöpfe des Waldes werden unruhig. Mirelda will sehen, was du kannst.',
    objectives: [{ t: 'kill', mob: 'moosling', n: 5, label: 'Mooslinge besiegen' }],
    rewards: { xp: 60, gold: 30, items: [['potion_hp1', 3]] },
    offer: ['Da bist du ja. Das Wasser hat dich angekündigt – es war ganz aufgeregt, das arme Ding.', 'Hör zu: Der Brunnen steht eine Handbreit tiefer als im Frühjahr. Die Quelle versiegt. Und alles, was von ihr trinkt, wird … launisch.', 'Die Mooslinge vor dem Dorf zum Beispiel. Früher haben sie Kindern die Schuhe geklaut. Jetzt beißen sie. Zeig mir, dass du mit fünf von ihnen fertig wirst.'],
    progress: 'Fünf Mooslinge. Sie sind grün, sie hüpfen, du wirst sie erkennen.',
    done: ['Sauber. Na gut, nicht sauber – du hast Moos im Haar. Aber wirksam.', 'Du bist ein Quellgänger, Kind. Das Wasser hört auf dich. Das ist selten geworden.'] }),
  Q({ id: 'm_borin', name: 'Gutes Eisen', type: 'main', giver: 'mirelda', turnIn: 'borin', level: 2, zone: 'gruenwald', requires: ['m_erwachen'],
    summary: 'Bevor du tiefer in den Wald gehst, sollst du Borin Eisenholz bringen, damit er deine Waffe verbessern kann.',
    objectives: [{ t: 'collect', item: 'mat_wood', n: 3, label: 'Eisenholz sammeln (Bäume mit Markierung, Dornkäfer)' }],
    rewards: { xp: 90, gold: 40, gear: 1 },
    offer: ['Mit dem Zahnstocher da gehst du mir nicht in die Gruft.', 'Bring Borin drei Stücke Eisenholz. Du findest es an den gekerbten Stämmen im Wald – oder in dem, was die Dornkäfer davon übrig lassen.', 'Und sei nett zu ihm. Er tut nur so, als hätte er kein Herz. Es ist da. Ich habe nachgesehen.'],
    progress: 'Eisenholz. Drei Stück. Der Wald ist voll davon.',
    done: ['Hm. Das ist gutes Holz.', 'Gib her. … Da. Und merk dir: Bring mir Material und Gold, dann mach ich deine Sachen besser. Je besser, desto öfter geht’s schief. So ist Eisen.'] }),
  Q({ id: 'm_wurzel', name: 'Was unter dem Baum schläft', type: 'main', giver: 'mirelda', level: 4, zone: 'gruenwald', requires: ['m_borin'],
    summary: 'In der Wurzelgruft im Nordwesten des Grünwalds ist etwas erwacht, das der Quelle das Wasser abgräbt. Besiege die Dornenmutter.',
    objectives: [{ t: 'boss', boss: 'dornenmutter', label: 'Die Dornenmutter in der Wurzelgruft besiegen' }],
    rewards: { xp: 300, gold: 120, gear: 2 },
    offer: ['Jetzt wird es ernst. Im Nordwesten, unter dem ältesten Baum, liegt die Wurzelgruft.', 'Dort hat früher ein Siegel der Erde geruht. Es hat die Wurzeln ruhig gehalten. Seit die Quelle schwächelt, hält es gar nichts mehr.', 'Was immer da unten gewachsen ist: Es trinkt unser Wasser. Geh hinunter und mach, dass es aufhört.'],
    progress: 'Die Gruft liegt im Nordwesten. Folge dem Weg, bis die Bäume dich komisch ansehen.',
    done: ['Du hast es. Das Siegel der Erde. Ich habe es mir größer vorgestellt.', 'Sechs solcher Siegel haben die alten Quellhüter geschmiedet, eins für jedes Element. Wenn die Erde ihres verloren hatte … dann die anderen auch.', 'Im Osten liegen die Kristallhöhlen. Hedda führt dort das Grubenlager. Sie ist laut, aber sie hat immer recht. Sag ihr das nicht.'],
    }),
  Q({ id: 'm_hedda', name: 'Das singende Dunkel', type: 'main', giver: 'mirelda', turnIn: 'hedda', level: 6, zone: 'kristall', requires: ['m_wurzel'],
    summary: 'Reise durch den Höhleneingang im Osten des Grünwalds in die Kristallhöhlen und sprich mit Grubenmeisterin Hedda.',
    objectives: [{ t: 'talk', npc: 'hedda', label: 'Mit Hedda im Grubenlager sprechen' }],
    rewards: { xp: 150, gold: 50 },
    offer: ['Edda lässt dich jetzt am Osttor durch. Nimm Tränke mit. Und eine Lampe. Und Vernunft, falls du welche findest.'],
    progress: 'Nach Osten, durch den Höhleneingang. Hedda beißt nicht. Meistens.',
    done: ['Du bist das also, von dem Mirelda schreibt. Hab dich mir breiter vorgestellt.', 'Egal. Wir haben ein Problem, und es ist ungefähr so groß wie ein Haus.'] }),
  Q({ id: 'm_kristalle', name: 'Stollen sieben', type: 'main', giver: 'hedda', level: 7, zone: 'kristall', requires: ['m_hedda'],
    summary: 'Die Krabbler haben die Stollen übernommen. Dezimiere sie, damit Heddas Leute wieder arbeiten können.',
    objectives: [{ t: 'kill', mob: 'kristallkrabbler', n: 8, label: 'Kristallkrabbler besiegen' }, { t: 'collect', item: 'mat_crystal', n: 4, label: 'Kristallsplitter sammeln' }],
    rewards: { xp: 420, gold: 140, gear: 1 },
    offer: ['Seit das Licht in den Kristallen flackert, drehen die Krabbler durch. Fressen Stützbalken. STÜTZBALKEN.', 'Hau mir acht von den Biestern weg und bring vier Splitter mit – ich will sehen, ob das Flackern im Stein sitzt oder im Tier.'],
    progress: 'Acht Krabbler, vier Splitter. Und nichts ablecken.',
    done: ['Hm. Die Splitter sind in Ordnung. Das Flackern kommt von tiefer unten.', 'Aus der Geode. Schlackendreck. Ich hatte gehofft, ich irre mich.'] }),
  Q({ id: 'm_koloss', name: 'Der Berg bewegt sich', type: 'main', giver: 'hedda', level: 10, zone: 'kristall', requires: ['m_kristalle'],
    summary: 'In der Tiefen Geode im Nordosten der Höhlen ist der Kristallkoloss erwacht. Er bewacht das Siegel des Lichts – und lässt niemanden mehr vorbei.',
    objectives: [{ t: 'boss', boss: 'kristallkoloss', label: 'Den Kristallkoloss in der Tiefen Geode besiegen' }],
    rewards: { xp: 1000, gold: 300, gear: 2 },
    offer: ['In der Tiefen Geode steht ein Wächter. Stand. Jahrhundertelang hat er sich nicht gerührt. Wir haben ihm Namen gegeben. Meiner hieß Günther.', 'Vor drei Wochen hat Günther Stollen sieben eingerissen.', 'Er hütet das Siegel des Lichts. Wenn er durchdreht, stimmt mit dem Siegel was nicht. Hol es raus, bevor uns der Berg auf den Kopf fällt.'],
    progress: 'Die Geode liegt im Nordosten. Wenn’s hell wird und brummt, bist du richtig.',
    done: ['Du hast Günther – nein. Schon gut. War nötig.', 'Der Südstollen ist frei. Er führt in die Glutlande. Ein Nomade namens Rakhan lagert dort. Der redet in Rätseln, aber er kennt die alte Schmiede.'],
    }),
  Q({ id: 'm_rakhan', name: 'Wo die Erde Feuer atmet', type: 'main', giver: 'hedda', turnIn: 'rakhan', level: 11, zone: 'glut', requires: ['m_koloss'],
    summary: 'Nimm den Südstollen der Kristallhöhlen in die Glutlande und suche den Aschennomaden Rakhan.',
    objectives: [{ t: 'talk', npc: 'rakhan', label: 'Mit Rakhan in der Aschenrast sprechen' }],
    rewards: { xp: 300, gold: 80 },
    offer: ['Südstollen, immer bergab, bis dir die Augenbrauen schmoren. Grüß Rakhan. Er schuldet mir noch ein Fass.'],
    progress: 'Nach Süden. Du merkst, wenn du da bist.',
    done: ['Zwei Siegel am Gürtel, und Ruß nur an den Stiefeln. Die Asche hat von dir geflüstert.', 'Setz dich ans Feuer. Es ist das einzige hier, das dir nichts will.'] }),
  Q({ id: 'm_kerne', name: 'Herzen aus Schlacke', type: 'main', giver: 'rakhan', level: 12, zone: 'glut', requires: ['m_rakhan'],
    summary: 'Das Tor der Aschenschmiede öffnet sich nur der Hitze von Golemherzen. Erbeute drei Glühende Kerne von Schlackengolems.',
    objectives: [{ t: 'collect', item: 'q_kern', n: 3, label: 'Glühende Kerne von Schlackengolems erbeuten' }],
    rewards: { xp: 900, gold: 260, gear: 1 },
    offer: ['Die Schmiede, in der die Siegel gegossen wurden, liegt im Südosten. Ihr Tor kennt nur eine Sprache: Hitze.', 'Die Golems tragen Kerne in der Brust, die noch vom ersten Guss glühen. Drei davon, und das Tor erinnert sich an dich.'],
    progress: 'Drei Kerne. Die Golems geben sie nicht freiwillig. Das spricht für sie.',
    done: ['Warm, nicht wahr? Halte sie nicht zu lange. Was lange glüht, will irgendwann brennen.'] }),
  Q({ id: 'm_glut', name: 'Der Schlackenwurm', type: 'main', giver: 'rakhan', level: 15, zone: 'glut', requires: ['m_kerne'],
    summary: 'In der Aschenschmiede haust Ignarok, der sich um das Siegel des Feuers gewunden hat. Besiege ihn.',
    objectives: [{ t: 'boss', boss: 'ignarok', label: 'Ignarok in der Aschenschmiede besiegen' }],
    rewards: { xp: 2000, gold: 550, gear: 2 },
    offer: ['In der Schmiede schläft Ignarok im Gusskanal. Meine Großmutter hat ihm Opfer gebracht. Meine Mutter hat ihn gemieden. Ich habe gewartet.', 'Auf dich, wie es scheint. Er liegt auf dem Siegel des Feuers wie ein Hund auf einem Knochen.'],
    progress: 'Die Schmiede liegt im Südosten. Folge dem Weg, bis der Boden zu leuchten beginnt.',
    done: ['Der Wurm schweigt. Hörst du es? Nein – das ist es ja.', 'Drei Siegel. Mit der Wärme des Feuers kommst du über den Pass im Norden des Grünwalds, hinauf ins Frostgebirge. Dort lebt ein alter Mann, der mehr weiß, als er sagt. Das ist nicht schwer: Er sagt fast nichts.'],
    }),
  Q({ id: 'm_jorund', name: 'Stille über den Wolken', type: 'main', giver: 'rakhan', turnIn: 'jorund', level: 16, zone: 'frost', requires: ['m_glut'],
    summary: 'Steige über den Nordpass des Grünwalds ins Frostgebirge und finde den Einsiedler Jorund.',
    objectives: [{ t: 'talk', npc: 'jorund', label: 'Mit Jorund in seiner Hütte sprechen' }],
    rewards: { xp: 500, gold: 120 },
    offer: ['Geh, bevor die Asche dich behalten will. Der Pass liegt nördlich von Quellhain.'],
    progress: 'Nach Norden, über Quellhain hinaus, bis dir der Atem gefriert.',
    done: ['Was. Wer. … Ach. Mirelda hat geschrieben. Sie schreibt immer, wenn ich gerade meine Ruhe habe.', 'Du willst zum Gletscherdom. Natürlich willst du das. Alle Dummköpfe wollen dahin.'] }),
  Q({ id: 'm_wichte', name: 'Ein Muster aus Eis', type: 'main', giver: 'jorund', level: 17, zone: 'frost', requires: ['m_jorund'],
    summary: 'Ysoldes Eiswichte weben ein Muster über den Berg. Zerstöre genug von ihnen, um das Gewebe zu schwächen.',
    objectives: [{ t: 'kill', mob: 'eiswicht', n: 8, label: 'Eiswichte besiegen' }, { t: 'kill', mob: 'frostwisp', n: 5, label: 'Frostwispe besiegen' }],
    rewards: { xp: 1600, gold: 420, gear: 1 },
    offer: ['Ysolde – die Frostweberin – war eine Hüterin des Wassersiegels. Meine Schülerin.', 'Als die Quelle zu versiegen begann, wollte sie den Rest bewahren. Also hat sie alles eingefroren. Den Fluss. Den Wald. Am Ende sich selbst.', 'Ihre Wichte weben das Eis über den Berg. Reiß genug Fäden heraus, dann kommst du in den Dom.'],
    progress: 'Acht Wichte, fünf Wispe. Sie sind klein und blau und sehr von sich überzeugt.',
    done: ['Das Muster hat Löcher. Gut. Ich hasse Symmetrie.'] }),
  Q({ id: 'm_ysolde', name: 'Die Frostweberin', type: 'main', giver: 'jorund', level: 20, zone: 'frost', requires: ['m_wichte'],
    summary: 'Im Gletscherdom im Nordwesten wartet Ysolde. Sie hält das Siegel des Wassers im Eis gefangen.',
    objectives: [{ t: 'boss', boss: 'ysolde', label: 'Ysolde im Gletscherdom besiegen' }],
    rewards: { xp: 3500, gold: 900, gear: 3 },
    offer: ['Der Dom liegt im Nordwesten. Sie wird mit dir reden wollen. Sie redet gern. Hör nicht zu lange hin – sie klingt vernünftig.', 'Und … sei schnell. Sie hat nie gern Schmerzen gehabt.'],
    progress: 'Nordwesten. Der Dom glitzert. Schön ist er, das muss man ihr lassen.',
    done: ['Es taut. Hörst du? Tropfen. Vierzig Jahre habe ich keinen Tropfen gehört.', 'Sie hat etwas gesagt, am Ende, nicht wahr? … Nein. Behalt es. Das Siegel hast du. Im Osten, hinter dem Pass, liegen die Ruinen der Hüter. Dort hat alles angefangen.'],
    }),
  Q({ id: 'm_liora', name: 'Was die Hüter zurückließen', type: 'main', giver: 'jorund', turnIn: 'liora', level: 21, zone: 'ruinen', requires: ['m_ysolde'],
    summary: 'Folge dem Ostpass des Frostgebirges zu den Verlorenen Ruinen und sprich mit der Archäologin Liora.',
    objectives: [{ t: 'talk', npc: 'liora', label: 'Mit Liora im Grabungslager sprechen' }],
    rewards: { xp: 800, gold: 200 },
    offer: ['Im Osten gräbt eine Frau in den Ruinen. Sie schreit viel. Du wirst sie finden.'],
    progress: 'Der Pass im Osten ist frei, seit das Eis taut.',
    done: ['VIER Siegel?! Darf ich – nein, nicht anfassen, ich weiß, ich weiß. Darf ich sie abzeichnen?', 'Hör zu, das ist unglaublich: Es gab nicht sechs Hüter. Es gab sieben.'] }),
  Q({ id: 'm_tafeln', name: 'Der siebte Sockel', type: 'main', giver: 'liora', level: 22, zone: 'ruinen', requires: ['m_liora'],
    summary: 'Die Runenwächter tragen Bruchstücke einer Inschrift in sich. Sammle vier Runentafeln, damit Liora den Namen des siebten Hüters lesen kann.',
    objectives: [{ t: 'collect', item: 'q_tafel', n: 4, label: 'Runentafeln von Runenwächtern erbeuten' }],
    rewards: { xp: 2800, gold: 700, gear: 2 },
    offer: ['Der Name auf dem siebten Sockel wurde abgeschlagen. Aber die Runenwächter – die großen Steinkerle – wurden aus denselben Tafeln gebaut!', 'Vier Bruchstücke, und ich kann den Text zusammensetzen. Sie werden sich wehren. Das ist normal, das machen Artefakte manchmal.'],
    progress: 'Vier Tafeln. Aus den Wächtern. Ja, ich weiß, wie das klingt.',
    done: ['„Morvain, Hüter des Gleichgewichts, der die Quelle trank …“ – trank?! – „… damit sein Kind den Winter überstehe.“', 'Er hat die Quelle nicht bewacht. Er hat sie genommen. Und die anderen sechs haben seinen Namen ausgelöscht, statt ihn aufzuhalten.', 'Das Archiv im Norden muss mehr wissen. Dort liegt auch das Siegel des Windes – falls der Archivar dich lässt.'] }),
  Q({ id: 'm_archivar', name: 'Archiv der Stille', type: 'main', giver: 'liora', level: 25, zone: 'ruinen', requires: ['m_tafeln'],
    summary: 'Im Archiv der Stille bewacht der Archivar das Siegel des Windes und alles, was über Morvain verschwiegen wurde.',
    objectives: [{ t: 'boss', boss: 'archivar', label: 'Den Archivar im Archiv der Stille besiegen' }],
    rewards: { xp: 5500, gold: 1400, gear: 3 },
    offer: ['Der Archivar ist kein Mensch. Die Hüter haben ihn gebaut, damit er vergisst, was sie vergessen wollten.', 'Er wird dich „berichtigen“ wollen. Lass dich nicht berichtigen.'],
    progress: 'Das Archiv liegt im Norden der Ruinen, unter dem großen Treppenschacht.',
    done: ['Fünf Siegel. Das Tor im Südosten hat fünf Vertiefungen – das sechste Siegel ist auf der anderen Seite.', 'Die Dunkelheit. Morvain hat es mitgenommen, als er ging. Dorthin, wo die Quelle ihre Schatten wirft.', 'Sen – der Geist da drüben – war sein Freund. Sprich mit ihm, bevor du gehst. Er … wartet immer noch.'],
    }),
  Q({ id: 'm_maelis', name: 'Die Kehrseite der Quelle', type: 'main', giver: 'liora', turnIn: 'maelis', level: 26, zone: 'schatten', requires: ['m_archivar'],
    summary: 'Durchschreite das Tor im Südosten der Ruinen. Im Schattenreich wartet jemand am „Letzten Licht“.',
    objectives: [{ t: 'talk', npc: 'maelis', label: 'Das Echo am Letzten Licht ansprechen' }],
    rewards: { xp: 1200, gold: 300 },
    offer: ['Geh. Und komm wieder, hörst du? Ich brauche jemanden, der mir sagt, wie es drüben aussieht. Für die Wissenschaft. Und überhaupt.'],
    progress: 'Das Tor ist offen. Es summt. In Fis, würde Fenwick sagen.',
    done: ['Oh. Du bist echt. Die anderen hier sind nur Erinnerungen, die vergessen haben, wem sie gehören.', 'Ich bin Maelis. Ich war sehr krank, vor langer Zeit. Vater hat die Quelle getrunken, um mich zu behalten. Es hat nicht ganz geklappt. Es hat nicht ganz nicht geklappt.'] }),
  Q({ id: 'm_schatten', name: 'Ein scheues Portal', type: 'main', giver: 'maelis', level: 27, zone: 'schatten', requires: ['m_maelis'],
    summary: 'Das Portal zum Thron der Leere flieht vor Lebenden. Die Schatten, die es nähren, müssen weichen.',
    objectives: [{ t: 'kill', mob: 'schattenwandler', n: 10, label: 'Schattenwandler besiegen' }, { t: 'kill', mob: 'leerenbrut', n: 8, label: 'Leerenbrut besiegen' }],
    rewards: { xp: 5000, gold: 1200, gear: 2 },
    offer: ['Vater sitzt im Norden auf einem Thron aus allem, was fehlt. Das Portal dorthin hat Angst vor dir.', 'Die Wandler und die Brut füttern es mit Dunkelheit. Wenn genug von ihnen fort sind, hält es still. Ich würde helfen, aber meine Hände gehen durch alles durch.'],
    progress: 'Zehn Wandler, acht von der Brut. Ich zähle mit. Ich habe sonst wenig zu tun.',
    done: ['Jetzt hält es still. Ich habe ihm gut zugeredet.', 'Wenn du ihn besiegst, fließt die Quelle wieder. Dann gibt es mich nicht mehr. Schau nicht so. Ich bin seit vierhundert Jahren müde.'] }),
  Q({ id: 'm_koenig', name: 'Der Hohle König', type: 'main', giver: 'maelis', turnIn: 'mirelda', level: 30, zone: 'schatten', requires: ['m_schatten'],
    summary: 'Morvain, der siebte Quellhüter, hält die Quelle in sich gefangen. Besiege den Hohlen König im Thron der Leere und bringe die Siegel heim nach Quellhain.',
    objectives: [{ t: 'boss', boss: 'hohlkoenig', label: 'Den Hohlen König besiegen' }],
    rewards: { xp: 15000, gold: 5000, gear: 4, skillPoints: 2 },
    offer: ['Sag ihm nicht, dass ich dich geschickt habe. Sag ihm … sag ihm, dass der Winter vorbei ist.', 'Und wenn es getan ist, bring die Siegel nach Hause. Die alte Frau am Brunnen wartet auf dich. Ich habe sie durch das Wasser gesehen. Sie macht sich Sorgen und tut so, als wäre es Ärger.'],
    progress: 'Er wartet im Norden. Er wartet schon sehr lange.',
    done: ['Sechs Siegel. Leg sie auf den Brunnenrand. Vorsichtig, das sind Erbstücke von Leuten, die ich nie leiden konnte.', '… Hörst du? Da. Der Brunnen. Er singt wieder. Falsch wie eh und je.', 'Du hast es getan, Quellgänger. Die Welt wird nie erfahren, wie knapp es war. Ich schon. Ich erzähle es jedem. Ob er will oder nicht.'],
    story: 'ending' }),

  // ================================================================================== NEBENQUESTS
  Q({ id: 's_tobi', name: 'Ritter ohne Arm', type: 'side', giver: 'tobi', level: 2, zone: 'gruenwald',
    summary: 'Ein Waldwolf hat Tobis Holzritter verschleppt. Hol ihn zurück.',
    objectives: [{ t: 'collect', item: 'q_puppe', n: 1, label: 'Tobis Holzritter von Waldwölfen zurückholen' }],
    rewards: { xp: 120, gold: 15, items: [['food_bread', 5]] },
    offer: ['Ein Wolf hat Herrn Splitter geklaut! Meinen Ritter! Der hat nur einen Arm, aber er ist SEHR tapfer!', 'Kannst du ihn holen? Ich würd ja selber, aber Edda lässt mich nicht raus. Und ich hab ein bisschen Angst. Aber nur ein bisschen.'],
    progress: 'Hast du Herrn Splitter? Er hat bestimmt Angst. Nein, hat er nicht. Er ist tapfer.',
    done: ['HERR SPLITTER! Du lebst! … Er sagt danke. Er ist schüchtern.', 'Hier, das Brot ist von Mama. Ich hab nur an einem ein bisschen geknabbert.'] }),
  Q({ id: 's_pilze', name: 'Sellas Geheimzutat', type: 'side', giver: 'sella', level: 2, zone: 'gruenwald',
    summary: 'Sella braucht Pilzlingshüte für ihre Tränke.',
    objectives: [{ t: 'collect', item: 'q_pilzhut', n: 5, label: 'Pilzlingshüte sammeln' }],
    rewards: { xp: 140, gold: 60, items: [['potion_hp2', 2], ['potion_mp1', 3]] },
    offer: ['Unter uns: Was meine Heiltränke so rot macht, wächst auf zwei Beinen und spuckt.', 'Fünf Pilzlingshüte, und ich mach dir einen Preis, bei dem ich weine. Innerlich. Äußerlich lächle ich.'],
    progress: 'Fünf Hüte! Die roten, mit den Punkten. Nicht die Viecher selbst, nur die Hüte.',
    done: ['Wunderbar! Riechst du das? Nein? Besser so.', 'Hier, frisch abgefüllt. Sag niemandem, was drin ist.'] }),
  Q({ id: 's_woelfe', name: 'Sie haben angefangen', type: 'side', giver: 'ayla', level: 3, zone: 'gruenwald',
    summary: 'Die Wölfe wagen sich zu nah ans Dorf. Ayla will das Rudel ausdünnen.',
    objectives: [{ t: 'kill', mob: 'waldwolf', n: 6, label: 'Waldwölfe besiegen' }],
    rewards: { xp: 220, gold: 80, gear: 1 },
    offer: ['Die Wölfe haben früher Rehe gejagt. Jetzt jagen sie Holzfäller.', 'Sechs weniger, und das Rudel zieht sich zurück. Ich mach die andere Hälfte. Nicht drängeln.'],
    progress: 'Sechs. Zähl mit, ich kontrolliere.',
    done: ['Hm. Nicht schlecht. Du trampelst immer noch, aber wenigstens in die richtige Richtung.'] }),
  Q({ id: 's_splitter1', name: 'In Fis, meistens', type: 'side', giver: 'fenwick', level: 1, zone: 'gruenwald',
    summary: 'Überall in der Welt liegen Quellsplitter verborgen – erstarrte Tropfen der Quelle. Fenwick möchte sie untersuchen. Jeder Splitter stärkt außerdem dauerhaft Leben und Mana.',
    objectives: [{ t: 'shards', n: 5, label: 'Quellsplitter finden' }],
    rewards: { xp: 400, gold: 150, attrPoints: 2 },
    offer: ['Quellsplitter! Erstarrte Tropfen der Quelle selbst. Sie verstecken sich – nun, sie liegen herum, aber an Orten, die sich wie Verstecke anfühlen.', 'Abseits der Wege, hinter brüchigen Felsen, in vergessenen Kammern. Bring mir Kunde von fünf Stück. Du darfst sie behalten, sie mögen dich offenbar.'],
    progress: 'Fünf Splitter. Achte auf brüchige Felsblockaden – ein kräftiger Schlag, und sie geben nach.',
    done: ['Faszinierend! Sie summen lauter, seit du sie trägst. Du bist ein Resonanzkörper. Das ist ein Kompliment.'] }),
  Q({ id: 's_splitter2', name: 'Resonanzkörper', type: 'side', giver: 'fenwick', level: 10, zone: 'gruenwald', requires: ['s_splitter1'],
    summary: 'Fenwick will wissen, was geschieht, wenn jemand fünfzehn Quellsplitter trägt.',
    objectives: [{ t: 'shards', n: 15, label: 'Quellsplitter finden' }],
    rewards: { xp: 2500, gold: 600, attrPoints: 3, skillPoints: 1 },
    offer: ['Meine Hypothese: Bei fünfzehn Splittern beginnt man zu leuchten. Oder zu platzen. Eins von beiden wäre publizierbar.'],
    progress: 'Fünfzehn! In jedem Landstrich liegen fünf, und in manchem Dungeon noch einer.',
    done: ['Kein Platzen. Schade. Äh – wie schön! Wie schön, wollte ich sagen.'] }),
  Q({ id: 's_splitter3', name: 'Das ganze Lied', type: 'side', giver: 'fenwick', level: 25, zone: 'gruenwald', requires: ['s_splitter2'],
    summary: 'Dreißig Quellsplitter ergeben zusammen die ganze Melodie der Quelle.',
    objectives: [{ t: 'shards', n: 30, label: 'Quellsplitter finden' }],
    rewards: { xp: 12000, gold: 3000, attrPoints: 5, skillPoints: 2, gear: 4 },
    offer: ['Dreißig Splitter, sechs Lande. Wenn du sie alle trägst, höre ich vielleicht zum ersten Mal das ganze Lied. Ich habe mein Leben lang nur den Refrain gekannt.'],
    progress: 'Dreißig. Ich warte. Ich habe Tee. Er ist kalt. Ich warte trotzdem.',
    done: ['… Oh.', 'Verzeih. Ich hatte etwas im Auge. Beide Augen. Es ist ein sehr schönes Lied.'] }),
  Q({ id: 's_fluegel', name: 'Pim braucht Leder', type: 'side', giver: 'pim', level: 7, zone: 'kristall',
    summary: 'Pim flickt seinen Rucksack mit Fledermausflügeln.',
    objectives: [{ t: 'collect', item: 'q_fluegel', n: 6, label: 'Fledermausflügel sammeln' }],
    rewards: { xp: 380, gold: 160, items: [['potion_hp2', 3]] },
    offer: ['Pims Rucksack hat ein Loch! Durch das Loch fällt Ware! Ware, die fällt, ist Ware, die Pim nicht verkauft!', 'Sechs Fledermausflügel, gutes Leder, Pim näht selbst. Pim zahlt! Pim zahlt ungern, aber Pim zahlt.'],
    progress: 'Sechs Flügel! Die Viecher hängen überall. Nicht hochschauen beim Gähnen.',
    done: ['Ha! Dicht! Pim ist wieder im Geschäft!'] }),
  Q({ id: 's_wisp', name: 'Falsches Licht', type: 'side', giver: 'hedda', level: 8, zone: 'kristall',
    summary: 'Glimmerwispe locken Heddas Leute in Schächte. Schluss damit.',
    objectives: [{ t: 'kill', mob: 'glimmerwisp', n: 8, label: 'Glimmerwispe besiegen' }],
    rewards: { xp: 520, gold: 180, gear: 1 },
    offer: ['Die Wispe sehen aus wie Grubenlampen. Der junge Karl ist letzte Woche einer nachgelaufen. Wir haben ihn aus Schacht drei gezogen. Zweimal.', 'Acht Stück. Dann lernen sie’s.'],
    progress: 'Acht Wispe. Die gelben Funzeln, die wegschweben, wenn du hinsiehst.',
    done: ['Gut. Karl darf wieder allein laufen. Mit Seil.'] }),
  Q({ id: 's_imps', name: 'Lachen in der Asche', type: 'side', giver: 'rakhan', level: 12, zone: 'glut',
    summary: 'Die Glutimps stehlen den Nomaden das Wasser.',
    objectives: [{ t: 'kill', mob: 'glutimp', n: 10, label: 'Glutimps besiegen' }],
    rewards: { xp: 1100, gold: 320, gear: 1 },
    offer: ['Die Imps lachen, wenn sie unsere Wasserschläuche aufschlitzen. Ich bin ein geduldiger Mann. Meine Geduld hat zehn Imps gereicht. Die sind jetzt aufgebraucht.'],
    progress: 'Zehn. Du hörst sie, bevor du sie siehst.',
    done: ['Stille. Die Asche dankt dir. Ich auch, das ist seltener.'] }),
  Q({ id: 's_glutstein', name: 'Warm bis ins Alter', type: 'side', giver: 'rakhan', level: 13, zone: 'glut',
    summary: 'Rakhan sammelt Glutsteine für die Alten seines Stammes.',
    objectives: [{ t: 'collect', item: 'mat_ember', n: 6, label: 'Glutsteine sammeln' }],
    rewards: { xp: 900, gold: 400, items: [['potion_hp3', 2], ['potion_mp2', 3]] },
    offer: ['Unsere Alten frieren, selbst hier. Ein Glutstein im Mantel hält ein Jahr. Sechs Steine, sechs Winter.'],
    progress: 'Sechs Glutsteine. Die Adern leuchten im Fels, du kannst sie nicht verfehlen.',
    done: ['Sechs Winter. Meine Großmutter wird dich segnen. Sie segnet laut und lange – sei gewarnt.'] }),
  Q({ id: 's_pelz', name: 'Ingas Wette', type: 'side', giver: 'inga', level: 17, zone: 'frost',
    summary: 'Inga wettet, dass du keine fünf Frostwolfpelze zusammenbekommst.',
    objectives: [{ t: 'collect', item: 'q_pelz', n: 5, label: 'Frostwolfpelze erbeuten' }],
    rewards: { xp: 1800, gold: 700, gear: 2 },
    offer: ['Wetten, du schaffst keine fünf Frostwolfpelze? Die Biester sind schneller als du. Und hübscher.', 'Wenn doch, kriegst du was Ordentliches aus meiner Truhe. Wenn nicht, schuldest du mir eine Geschichte.'],
    progress: 'Na? Fünf Pelze? Dacht ich mir.',
    done: ['… Fünf. Schlackendreck. So sagt man doch bei euch da unten?', 'Hier. Gewonnen ist gewonnen.'] }),
  Q({ id: 's_brute', name: 'Der Kessel ist dagegen', type: 'side', giver: 'jorund', level: 18, zone: 'frost',
    summary: 'Schneebruten trampeln Jorunds Flechtengarten nieder.',
    objectives: [{ t: 'kill', mob: 'schneebrute', n: 3, label: 'Schneebruten besiegen' }],
    rewards: { xp: 2200, gold: 500, items: [['elixir', 1]] },
    offer: ['Die Bruten trampeln durch meine Flechten. Zwanzig Jahre Zucht. Der Kessel ist empört.', 'Drei von den Zotteln, dann merken es die anderen. Sie sind dumm, aber nicht so dumm.'],
    progress: 'Drei Bruten. Groß, weiß, schlechte Manieren.',
    done: ['Der Kessel sagt danke. Ich sage: Tee? Nein? Klug.'] }),
  Q({ id: 's_geister', name: 'Ablösung', type: 'side', giver: 'sen', level: 22, zone: 'ruinen',
    summary: 'Sen bittet dich, die verfluchten Geister seiner alten Kameraden zu erlösen.',
    objectives: [{ t: 'kill', mob: 'fluchgeist', n: 8, label: 'Fluchgeister erlösen' }],
    rewards: { xp: 3000, gold: 800, gear: 2 },
    offer: ['Die Geister in den Ruinen … ich kenne ihre Stimmen. Es sind die Männer und Frauen meiner Wache.', 'Sie haben vergessen, wer sie waren. Ich bitte Euch: Löst sie ab. Acht stehen noch auf Posten.'],
    progress: 'Acht Kameraden warten auf ihre Ablösung.',
    done: ['Habt Dank. Sie ruhen. Ich … sollte wohl auch – nein. Meine Wache endet bei Sonnenuntergang.'] }),
  Q({ id: 's_augen', name: 'Es schaut zurück', type: 'side', giver: 'liora', level: 23, zone: 'ruinen',
    summary: 'Die Arkanaugen beobachten Lioras Grabung – und stören ihre Messungen.',
    objectives: [{ t: 'kill', mob: 'arkanauge', n: 6, label: 'Arkanaugen besiegen' }],
    rewards: { xp: 3200, gold: 750, items: [['potion_hp3', 3], ['potion_mp3', 3]] },
    offer: ['Diese schwebenden Augen starren auf meine Notizen. Ich schwöre, eins hat eine Zeile KORRIGIERT. Sechs Stück, bitte. Für die Wissenschaft.'],
    progress: 'Sechs Augen. Schau nicht zu lange hinein.',
    done: ['Danke! Endlich arbeite ich wieder unbeobachtet. Bis auf Sen. Und dich. Und – egal.'] }),
  Q({ id: 's_ritter', name: 'Leere Rüstungen', type: 'side', giver: 'maelis', level: 27, zone: 'schatten',
    summary: 'Die Hohlritter waren einst Morvains Leibwache. Maelis möchte, dass sie endlich abtreten dürfen.',
    objectives: [{ t: 'kill', mob: 'hohlritter', n: 4, label: 'Hohlritter besiegen' }],
    rewards: { xp: 5200, gold: 1300, gear: 3 },
    offer: ['Die Ritter haben mir früher Blumen gebracht. Jetzt ist nichts mehr in ihnen, nur der Befehl.', 'Vier stehen noch. Lass sie gehen, ja?'],
    progress: 'Vier Ritter. Sie waren freundlich, früher.',
    done: ['Danke. Einer hat sich verbeugt, am Ende, nicht wahr? Das war Herr Aldric. Er hat sich immer verbeugt.'] }),
  Q({ id: 's_essenz', name: 'Was fehlt', type: 'side', giver: 'maelis', level: 28, zone: 'schatten',
    summary: 'Maelis sammelt Leerenessenz – verlorene Erinnerungen.',
    objectives: [{ t: 'collect', item: 'mat_void', n: 8, label: 'Leerenessenz sammeln' }],
    rewards: { xp: 4800, gold: 1500, items: [['elixir', 2]] },
    offer: ['Leerenessenz ist das, was übrig bleibt, wenn jemand etwas vergisst. Ich suche eine bestimmte Erinnerung. Ein Lied, das Vater gesungen hat. Acht Stück – vielleicht ist es dabei.'],
    progress: 'Acht Essenzen. Aus den Rissen im Boden, oder aus den Schatten.',
    done: ['… Da ist es. Es hat nur vier Töne. Ich dachte, es wäre länger gewesen. Danke.'] }),

  // ================================================================================== WIEDERHOLBAR
  Q({ id: 'r_gruenwald', name: 'Aushang: Waldpatrouille', type: 'repeat', giver: 'ayla', level: 2, zone: 'gruenwald',
    summary: 'Wiederholbarer Auftrag vom Brett in Quellhain: Halte die Wege des Grünwalds frei.',
    objectives: [{ t: 'killzone', zone: 'gruenwald', n: 15, label: 'Beliebige Gegner im Grünwald besiegen' }],
    rewards: { xp: 180, gold: 90, items: [['mat_wood', 2]] },
    offer: ['Patrouille. Fünfzehn von dem, was knurrt, hüpft oder spuckt. Bezahlung am Brett.'], progress: 'Der Wald ist noch nicht ruhig.', done: ['Sauber. Das Brett hat morgen wieder was.'] }),
  Q({ id: 'r_kristall', name: 'Schichtarbeit', type: 'repeat', giver: 'hedda', level: 7, zone: 'kristall',
    summary: 'Wiederholbar: Sichere die Stollen der Kristallhöhlen.',
    objectives: [{ t: 'killzone', zone: 'kristall', n: 18, label: 'Beliebige Gegner in den Kristallhöhlen besiegen' }],
    rewards: { xp: 600, gold: 220, items: [['mat_crystal', 3]] },
    offer: ['Schicht ist Schicht. Achtzehn Viecher, dann ist Feierabend.'], progress: 'Noch ist nicht Feierabend.', done: ['Feierabend! Für dich. Ich hab noch drei Stollen.'] }),
  Q({ id: 'r_glut', name: 'Aschenwache', type: 'repeat', giver: 'rakhan', level: 12, zone: 'glut',
    summary: 'Wiederholbar: Halte die Glutlande rund um die Aschenrast sicher.',
    objectives: [{ t: 'killzone', zone: 'glut', n: 18, label: 'Beliebige Gegner in den Glutlanden besiegen' }],
    rewards: { xp: 1400, gold: 420, items: [['mat_ember', 3]] },
    offer: ['Die Asche ruht nie. Achtzehn, und wir schlafen eine Nacht.'], progress: 'Die Nacht ist noch nicht verdient.', done: ['Schlaf gut. Wir tun es heute auch.'] }),
  Q({ id: 'r_frost', name: 'Fährtenlese', type: 'repeat', giver: 'inga', level: 17, zone: 'frost',
    summary: 'Wiederholbar: Jage im Frostgebirge.',
    objectives: [{ t: 'killzone', zone: 'frost', n: 18, label: 'Beliebige Gegner im Frostgebirge besiegen' }],
    rewards: { xp: 2600, gold: 700, items: [['mat_frost', 3]] },
    offer: ['Wetten, du schaffst keine achtzehn vor dem nächsten Schneesturm?'], progress: 'Der Sturm kommt näher. Ich sag’s nur.', done: ['Tss. Schon wieder verloren. Hier.'] }),
  Q({ id: 'r_ruinen', name: 'Grabungsschutz', type: 'repeat', giver: 'liora', level: 22, zone: 'ruinen',
    summary: 'Wiederholbar: Schütze Lioras Grabung.',
    objectives: [{ t: 'killzone', zone: 'ruinen', n: 18, label: 'Beliebige Gegner in den Ruinen besiegen' }],
    rewards: { xp: 4200, gold: 1000, items: [['mat_rune', 3]] },
    offer: ['Jedes Mal, wenn ich etwas ausgrabe, will es mich umbringen. Achtzehn weniger wären ein Anfang!'], progress: 'Es gräbt sich so schlecht, wenn man rennt.', done: ['Danke! Ich habe heute DREI Scherben gefunden. Ohne Verluste!'] }),
  Q({ id: 'r_schatten', name: 'Ein bisschen Licht', type: 'repeat', giver: 'maelis', level: 27, zone: 'schatten',
    summary: 'Wiederholbar: Dränge die Schatten zurück.',
    objectives: [{ t: 'killzone', zone: 'schatten', n: 20, label: 'Beliebige Gegner im Schattenreich besiegen' }],
    rewards: { xp: 6500, gold: 1500, items: [['mat_void', 3]] },
    offer: ['Wenn du zwanzig Schatten vertreibst, wird es hier für einen Moment heller. Ich mag den Moment.'], progress: 'Es ist noch dunkel. Das ist kein Vorwurf.', done: ['Da. Hast du es gesehen? Fast wie Morgen.'] }),
  // ================================================================================== GRUPPE
  Q({ id: 'g_jagd', name: 'Gemeinsame Jagd', type: 'group', giver: 'ayla', level: 4, zone: 'gruenwald', requires: ['m_erwachen'],
    summary: 'Gruppenquest (wiederholbar): Besiegt gemeinsam – in einer Gruppe aus mindestens zwei Spielern – einen beliebigen Dungeon-Boss.',
    objectives: [{ t: 'bossparty', n: 1, label: 'Einen Boss in einer Gruppe (2+) besiegen' }],
    rewards: { xp: 800, gold: 400, gear: 3 },
    offer: ['Große Beute jagt man nicht allein. Such dir jemanden, dem du den Rücken zudrehen kannst, und legt zusammen etwas Großes.', '(Gruppe bilden: Im Menü „Gruppe“ einen Mitspieler einladen.)'],
    progress: 'Allein zählt nicht. Bring Verstärkung.',
    done: ['Zu zweit, und beide noch am Stück. So macht man das.'] }),
  // ================================================================================== AKT II (0.3) – siehe quests_akt2.ts
  ...QUESTS_AKT2,
];

export const QUESTS: Record<string, QuestDef> = Object.fromEntries(QUEST_LIST.map(q => [q.id, q]));

/** Darf die Quest (jetzt) begonnen werden? Gilt auch für verborgene Quests – die werden aber nie angeboten. */
export function questStartable(c: CharData, q: QuestDef): boolean {
  const st = c.quests[q.id];
  if (st?.s === 'active') return false;
  if (st?.s === 'done' && q.type !== 'repeat' && q.type !== 'group') return false;
  for (const r of q.requires ?? []) if (c.quests[r]?.s !== 'done') return false;
  return condOk(c, q.when);
}
export function questAvailable(c: CharData, q: QuestDef): boolean { return !q.hidden && questStartable(c, q); }
export function objectiveProgress(c: CharData, q: QuestDef, i: number): number {
  const o = q.objectives[i];
  switch (o.t) {
    case 'shards': return Math.min(o.n, countShards(c));
    case 'collect': { let n = 0; for (const it of c.inv) if (it.base === o.item) n += it.qty ?? 1; return Math.min(o.n, n); }
    case 'lore': return c.flags[`l:${o.doc}`] ? 1 : 0;
    case 'lorecount': return Math.min(o.n, countLore(c));
    case 'visit': return c.flags[`v:${o.place}`] ? 1 : 0;
    case 'decide': return c.flags[`d:${o.id}`] ? 1 : 0;
    case 'echo': return c.flags[`e:${o.id}`] ? 1 : 0;
    case 'flag': return c.flags[o.flag] ? 1 : 0;
    case 'memories': return Math.min(o.n, countMemories(c));
  }
  return c.quests[q.id]?.p[i] ?? 0;
}
export function objectiveTarget(o: Objective): number { return 'n' in o ? o.n : 1; }
export function questComplete(c: CharData, q: QuestDef): boolean {
  if (c.quests[q.id]?.s !== 'active') return false;
  return q.objectives.every((o, i) => objectiveProgress(c, q, i) >= objectiveTarget(o));
}
export { condOk };
/** Texte einer Quest unter Berücksichtigung der Varianten (`alt`). */
export function questText(c: CharData, q: QuestDef): { offer: string[]; progress: string; done: string[] } {
  const a = q.alt?.find(x => condOk(c, x.if));
  return { offer: a?.offer ?? q.offer, progress: a?.progress ?? q.progress, done: a?.done ?? q.done };
}
/** Kapitel einer Hauptquest (undefined für alles andere). */
export function questChapter(q: QuestDef): number | undefined {
  return q.type === 'main' ? q.chapter ?? ZONE_CHAPTER[q.zone] : undefined;
}
/** Aktuelles Kapitel des Charakters: das höchste, in dem eine Hauptquest läuft oder abgeschlossen ist. */
export function chapterOf(c: CharData): number {
  let n = 1;
  for (const q of QUEST_LIST) if (c.quests[q.id]) { const ch = questChapter(q); if (ch && ch > n) n = ch; }
  return n;
}
/** Welche Questmarkierung trägt ein NPC für diesen Charakter? */
export function npcMarker(c: CharData, npcId: string): 'turnin' | 'offer' | 'progress' | null {
  let offer = false, progress = false;
  for (const q of QUEST_LIST) {
    const st = c.quests[q.id];
    if (st?.s === 'active') {
      if ((q.turnIn ?? q.giver) === npcId) { if (questComplete(c, q)) return 'turnin'; progress = true; }
      // Gesprächsziele
      q.objectives.forEach((o, i) => { if (o.t === 'talk' && o.npc === npcId && (st.p[i] ?? 0) < 1) offer = true; });
    } else if (q.giver === npcId && questAvailable(c, q) && c.level >= q.level - 3) offer = true;
  }
  // wichtige Gesprächsthemen (Dialogbäume) zählen wie ein Angebot
  if (!offer) for (const t of TOPICS) if (t.npc === npcId && t.hot && condOk(c, t.hot) && condOk(c, t.if)) { offer = true; break; }
  return offer ? 'offer' : progress ? 'progress' : null;
}

export const STORY: Record<string, { title: string; lines: string[] }> = {
  intro: { title: 'Eternal Mana', lines: [
    'Tief unter der Welt entspringt die Ewige Quelle. Aus ihr fließt, was die Alten Mana nannten: der Atem von Feuer und Wasser, Erde und Wind, Licht und Dunkelheit.',
    'Sechs Siegel halten die Elemente im Gleichgewicht. So war es immer. So steht es in jeder Chronik.',
    'Doch in Quellhain sinkt der Brunnen. Die Tiere des Waldes werden bissig, in den Bergen bewegt sich der Stein, und in den Nächten flüstert das Wasser einen Namen, den niemand mehr kennt.',
    'Du bist ein Quellgänger – einer der wenigen, auf die das Wasser noch hört. Die Älteste erwartet dich am Brunnen.' ] },
  seal_earth: { title: 'Das Siegel der Erde', lines: [
    'Als die Dornenmutter zerfällt, liegt in ihrem Herzen ein Siegel aus dunklem Stein. Es ist warm, als hätte es jemand eben erst aus der Hand gelegt.',
    'Für einen Augenblick hörst du Wasser rauschen – weit entfernt, wie durch eine Wand. Dann eine Stimme, müde und sehr alt: „Noch nicht. Bitte. Noch nicht.“' ] },
  seal_light: { title: 'Das Siegel des Lichts', lines: [
    'Der Koloss sinkt in sich zusammen, und sein Licht sammelt sich in einem Siegel aus klarem Kristall.',
    'Darin, wie in einem Fenster: ein Mann an einem Krankenbett. Er hält eine kleine Hand. Das Bild zerspringt, bevor du sein Gesicht siehst.' ] },
  seal_fire: { title: 'Das Siegel des Feuers', lines: [
    'Ignarok erstarrt zu Schlacke. Aus dem Gusskanal hebst du ein Siegel, das wie ein Herz pulsiert.',
    'In der Glut siehst du sechs Gestalten um einen Amboss stehen – und eine siebte, die sich abwendet und geht. Niemand hält sie auf.' ] },
  seal_water: { title: 'Das Siegel des Wassers', lines: [
    'Ysoldes letzter Atem gefriert nicht. „Er hat mich gebeten, es aufzuhalten“, flüstert sie. „Den Winter. Das Ende. Ich habe es nur … zu gut gemacht.“',
    'Das Siegel des Wassers löst sich aus dem Eis. Zum ersten Mal seit vierzig Jahren tropft es im Gletscherdom.' ] },
  seal_wind: { title: 'Das Siegel des Windes', lines: [
    'Seiten wirbeln durch das Archiv, als der Archivar zerfällt. Auf jeder steht derselbe gestrichene Name – und darunter, in anderer Handschrift: „Vergebt ihm. Wir haben ihn allein gelassen.“',
    'Das Siegel des Windes liegt leicht in deiner Hand. Fünf Siegel. Irgendwo im Südosten antwortet ein steinernes Tor mit einem tiefen Ton.' ] },
  schatten: { title: 'Das Schattenreich', lines: [
    'Hinter dem Tor ist die Welt verkehrt herum: Der Himmel liegt unten, das Licht fällt nach oben, und alles ist aus dem gemacht, was die Quelle vergessen hat.',
    'In der Ferne, auf einem Thron aus Leere, sitzt eine Gestalt und wartet. Näher bei dir brennt ein einzelnes kleines Licht.' ] },
  ending: { title: 'Die Ewige Quelle', lines: [
    'Sechs Siegel liegen auf dem Brunnenrand von Quellhain. Einen Atemzug lang geschieht nichts.',
    'Dann steigt das Wasser. Es steigt bis zur alten Markierung und eine Handbreit darüber, und es singt dabei – falsch, laut und unaufhaltsam.',
    'Im Schattenreich verlischt ein kleines Licht, so sanft, wie man eine Kerze ausbläst, wenn der Morgen kommt. Und auf einem leeren Thron bleibt nichts zurück als eine Krone und vier Töne eines Wiegenlieds.',
    'Die Quelle fließt wieder. Sie wird nicht ewig fließen – nichts tut das. Aber heute fließt sie. Und du hast sie heimgebracht.',
    'DANKE FÜRS SPIELEN. Die Welt bleibt offen: Dungeons, Aufträge und Gruppenjagden lassen sich beliebig wiederholen.' ] },
};
