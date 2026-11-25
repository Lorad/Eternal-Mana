/**
 * Quellwarte (0.9): der Schritt der ersten Hauptquest, der neue Charaktere einmal in den Hub führt, und die Nebenquests der
 * Quellwarte – Aufträge der Wirtin und der Stammgäste, die hinaus in die Welt und in die Dungeons schicken.
 * Wird in quests.ts an QUEST_LIST angehängt. Orte der „besuchen“-Ziele: PLACES in data/story.ts (`qw_…`).
 */
import type { QuestDef } from './quests';

const Q = (q: QuestDef) => q;
/** Neue Charaktere (ab 0.9) bekommen den Schritt in die Quellwarte; ältere einen einmaligen Hinweis (server/src/hub). */
export const HUB_NEW_FLAG = 'qw:neu', HUB_OLD_FLAG = 'qw:alt';
export const HUB_MAIN_QUEST = 'm_quellwarte';

export const QUESTS_HUB: QuestDef[] = [
  Q({ id: HUB_MAIN_QUEST, name: 'Die alte Wache', type: 'main', giver: 'mirelda', turnIn: 'hanne', level: 1, zone: 'gruenwald', requires: ['m_erwachen'], when: { flag: HUB_NEW_FLAG },
    summary: 'Mirelda schickt dich in die Quellwarte, die alte Wache der Hüter über den Quellsteinen. Reise über den Quellstein am Brunnen oder durch das Tor am Dorfrand und melde dich bei Hanne im Gasthaus.',
    objectives: [{ t: 'talk', npc: 'hanne', label: 'Mit Hanne im Gasthaus der Quellwarte sprechen' }],
    rewards: { xp: 50, gold: 30, items: [['potion_hp1', 2]] },
    offer: ['Bevor du weiter durch den Wald stapfst: Es gibt einen Ort, den jeder Quellgänger kennen sollte. Die Quellwarte – die alte Wache der Hüter, hoch über dem Netz der Quellsteine.',
      'Leg die Hand auf den Quellstein hier am Brunnen und denk an sie. Oder nimm das Tor am Dorfrand, wenn du lieber läufst. Ich laufe nie. In meinem Alter ist jeder Schritt ein Geschenk, und ich verschenke ungern.',
      'Dort gibt es alles, was du brauchst: eine Schmiede, einen Händler, ein Lager, einen Meister mit schlechter Laune und ein Gasthaus mit guter. Sag Hanne, dass ich dich schicke. Sie schuldet mir einen Krug.'],
    progress: 'Quellstein am Brunnen, Hand drauf, an die Quellwarte denken. Oder durchs Tor am Dorfrand. Hauptsache, du kommst an.',
    done: ['Mirelda schickt dich? Dann bist du entweder sehr begabt oder sehr lästig. Meistens ist es beides.',
      'Willkommen in der Quellwarte. Um den Platz herum findest du alles: Schmiede, Händler, Alchemie, Lagerhaus, den Fähigkeitenmeister und die Trophäenhalle. In der Mitte das Portal – damit geht es in die Tiefe. Mit Freunden, wenn du schlau bist.',
      'Und wenn du etwas hören willst, das du nicht wissen solltest: das Brett neben meiner Tür. Gerüchte, frisch und ungeprüft. Den Krug zahlt übrigens Mirelda. Das weiß sie nur noch nicht.'] }),

  Q({ id: 'qw_hanne', name: 'Eintopf für alle', type: 'side', giver: 'hanne', level: 3, zone: 'quellwarte',
    summary: 'Im Gasthaus „Zum Versiegten Brunnen“ gehen die Vorräte aus. Bring Hanne Waldbeeren und Quellkraut aus dem Grünwald.',
    objectives: [{ t: 'collect', item: 'ing_berry', n: 6, label: 'Waldbeeren sammeln (Grünwald)' }, { t: 'collect', item: 'mat_herb', n: 4, label: 'Quellkraut sammeln (Grünwald)' }],
    rewards: { xp: 220, gold: 90, items: [['food_bread', 3]] },
    offer: ['Der Eintopf geht aus, wenn jeder Quellgänger zweimal nachnimmt. Und das tun sie. Alle. Auch die, die behaupten, sie hätten schon gegessen.',
      'Sechs Handvoll Waldbeeren und vier Büschel Quellkraut aus dem Grünwald. Die Beeren für den Kuchen, das Kraut für den Eintopf. Nicht verwechseln. Einmal hat das jemand. Wir reden nicht darüber.'],
    progress: 'Beeren und Kraut, beides aus dem Grünwald. Kuchen und Eintopf. Nicht verwechseln.',
    done: ['Wunderbar! Das reicht für drei Tage. Oder für Alrik für einen.', 'Hier, nimm Brot mit. Es ist von gestern, aber es weiß das nicht.'] }),

  Q({ id: 'qw_alrik', name: 'Die andere Hälfte', type: 'side', giver: 'alrik', level: 5, zone: 'quellwarte',
    summary: 'Alrik der Halbe behauptet, sein Mut stecke seit vierzig Jahren in der Wurzelgruft fest. Besiege die Dornenmutter in seinem Namen.',
    objectives: [{ t: 'boss', boss: 'dornenmutter', label: 'Die Dornenmutter in der Wurzelgruft besiegen' }],
    rewards: { xp: 520, gold: 180, gear: 1 },
    offer: ['Vor vierzig Jahren bin ich in die Wurzelgruft gestiegen. Halb wieder rausgekommen. Die andere Hälfte – mein Mut – sitzt noch da unten und weigert sich.',
      'Die Dornenmutter steht wieder da, sagen sie. Hau sie um. In meinem Namen. Dann traut sich meine Hälfte vielleicht raus.',
      'Und wenn nicht: Erzähl mir wenigstens, wie es war. Ausführlich. Mit Übertreibungen. Ich übertreibe dann weiter.'],
    progress: 'Die Wurzelgruft. Nordwestlich von Quellhain, unter dem ältesten Baum. Grüß meine Hälfte.',
    done: ['Du hast sie – wirklich? … Ich fühle mich schon ganzer. Ungefähr drei Viertel.', 'Hanne! Eine Runde für alle, auf meine Rechnung! … Sie sagt, meine Rechnung ist voll. Dann eben auf deine.'] }),

  Q({ id: 'qw_lotte', name: 'Weiße Flecken', type: 'side', giver: 'lotte', level: 8, zone: 'quellwarte',
    summary: 'Lotte Kompass zeichnet eine Karte der Welt – bisher mit sehr viel Weiß. Berühre die Quellsteine im Grubenlager der Kristallhöhlen und in der Aschenrast der Glutlande.',
    objectives: [{ t: 'flag', flag: 't:kristall', label: 'Quellstein in den Kristallhöhlen berühren' }, { t: 'flag', flag: 't:glut', label: 'Quellstein in den Glutlanden berühren' }],
    rewards: { xp: 900, gold: 260, items: [['mat_crystal', 3]] },
    offer: ['Auf meiner Karte gibt es Quellhain und sehr viel Weiß. Mein Lehrmeister sagt, Weiß heißt „unerforscht“. Ich sage, Weiß heißt langweilig.',
      'Die Quellsteine sind die Ecken der Welt – jeder, den du berührst, kommt auf meine Karte. Berühr den im Grubenlager der Kristallhöhlen und den in der Aschenrast der Glutlande.',
      'Und wenn du unterwegs etwas Komisches siehst, merk es dir. Für die Ränder. Da malt man die Ungeheuer hin.'],
    progress: 'Zwei Quellsteine: Grubenlager und Aschenrast. Du musst sie nur anfassen. Nicht ablecken. Das hat Hedda verboten.',
    done: ['Zwei Steine! Zwei Ecken! … Mit Quellhain ist das ein Dreieck. Ich habe ein Dreieck gezeichnet. Mein Lehrmeister wird weinen.', 'Hier, für dich. Kartenzeichner zahlen in Ehre und Kristall. Die Ehre ist gerade aus.'] }),

  Q({ id: 'qw_merle', name: 'Lieder vom Rand der Welt', type: 'side', giver: 'merle', level: 12, zone: 'quellwarte',
    summary: 'Merle Federkiel schreibt ein Lied über Orte, an denen sie nie war. Stell dich für sie an den Weiher im Grünwald, an den Spiegelsee in den Kristallhöhlen und auf das Obsidianfeld der Glutlande.',
    objectives: [{ t: 'visit', place: 'qw_weiher', label: 'Am Weiher im Grünwald lauschen' }, { t: 'visit', place: 'qw_spiegelsee', label: 'Am Spiegelsee in den Kristallhöhlen lauschen' }, { t: 'visit', place: 'qw_obsidian', label: 'Auf dem Obsidianfeld in den Glutlanden lauschen' }],
    rewards: { xp: 1500, gold: 420, items: [['ess_wind', 3]] },
    offer: ['Ich schreibe ein Lied über die Welt. Ich war nur noch nie draußen. Zu gefährlich. Zu nass. Zu viele Ungeheuer mit eigener Meinung.',
      'Geh für mich an drei Orte und hör zu: den Weiher im Grünwald, den Spiegelsee in den Kristallhöhlen und das Obsidianfeld in den Glutlanden.',
      'Stell dich hin, sei still, merk dir, wie es klingt. Dann komm wieder und erzähl es mir. Wenn du singst, höre ich höflich weg.'],
    progress: 'Weiher, Spiegelsee, Obsidianfeld. Hinstellen, zuhören, merken. Singen nur im Notfall.',
    done: ['Der Weiher plätschert in G. Der Spiegelsee schweigt in Moll. Und das Obsidianfeld knistert – das ist kein Ton, das ist eine Drohung.', 'Wunderbar. Das wird das schlechteste Lied, das ich je geschrieben habe. Also mein bestes.'] }),

  Q({ id: 'qw_rudger', name: 'Ein letzter Appell', type: 'side', giver: 'rudger', level: 22, zone: 'quellwarte',
    summary: 'In den Verlorenen Ruinen marschieren Skelettkrieger in Reih und Glied – Rudger glaubt, es sei die alte Ehrenwache der Quellwarte. Gib zwölf von ihnen ihre Ruhe.',
    objectives: [{ t: 'kill', mob: 'skelettkrieger', n: 12, label: 'Skelettkrieger in den Verlorenen Ruinen zur Ruhe betten' }],
    rewards: { xp: 6000, gold: 1300, gear: 2 },
    offer: ['Die Kaserne der Quellwarte hatte früher eine Ehrenwache. Zwölf Mann. Die besten. Die Pünktlichsten. Zwei davon konnten sogar lesen.',
      'Liora schreibt, in den Ruinen marschieren Skelette im Gleichschritt. Mit den alten Abzeichen der Warte. Ich habe die Dienstliste geprüft. Dreimal.',
      'Gib ihnen ihre Ruhe. Mit Respekt. Und kräftig.'],
    progress: 'Zwölf. In den Ruinen. Sie marschieren noch immer im Gleichschritt – du erkennst sie am Takt.',
    done: ['Zwölf. … Danke. Ich trage sie aus dem Dienstbuch aus. Mit Tinte, nicht mit Bleistift.', 'Wegtreten, Quellgänger. Und – gut gemacht. Das sage ich nicht oft. Eigentlich nie. Merk es dir.'] }),
];
