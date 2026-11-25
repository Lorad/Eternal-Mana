/**
 * Dialogbäume (ab 0.3): Gesprächsthemen je NPC mit Knoten, Optionen, Bedingungen und Wirkungen.
 * Der Client zeigt nur an; jede Auswahl prüft und verbucht der Server (server/src/story.ts).
 * Einstiegsknoten jedes Themas ist `start`. Eine Option ohne `to` beendet das Gespräch.
 */
import type { Cond } from './cond';
import { LIED_COND, type DlgNode, type DlgOpt, type DlgTopic } from './story';
import { TOPICS_HUB } from './dialoge_hub';

const T = (t: DlgTopic) => t;
const END = (s = 'Das genügt für heute.'): DlgOpt => ({ s });
/** Zweistufige Entscheidung: Rückfrage mit Hinweis auf die Endgültigkeit, dann Festlegung. */
function decision(id: string, v: number, note: string, confirm: string, after: string[]): Record<string, DlgNode> {
  return {
    [`c${v}`]: { who: '', lines: [`(${note} Diese Entscheidung ist endgültig.)`], opts: [{ s: confirm, to: `d${v}`, fx: { decide: [id, v] } }, { s: 'Ich überlege noch.', to: 'start' }] },
    [`d${v}`]: { lines: after },
  };
}
const hot = (quest: string, flag: string): Cond => ({ active: quest, noFlag: flag });

export const TOPICS: DlgTopic[] = [
  // ================================================================================== DER FREMDE AM BRUNNEN
  T({ id: 'fremder_brunnen', npc: 'fremder', label: 'Wer seid Ihr – und was geschieht mit dem Brunnen?', if: { started: 'm_fremder' }, hot: hot('m_fremder', 'q:fremder'),
    nodes: {
      start: { lines: ['Guten Abend. Oder Morgen. Verzeiht, ich bin bei Tageszeiten aus der Übung.', 'Ihr seid der Quellgänger. Ihr habt sechs davon nebeneinandergelegt. Ich hatte gebeten, es nicht zu tun – zugegeben, sehr leise, und durch eine Wand aus Wasser.'],
        opts: [{ s: '„Noch nicht. Bitte.“ – Das wart Ihr?', to: 'stimme' }, { s: 'Wer seid Ihr?', to: 'wer' }, { s: 'Was geschieht mit dem Brunnen?', to: 'brunnen' }, END('Ich muss darüber nachdenken.')] },
      stimme: { lines: ['Das war ich. Ich entschuldige mich für den Zeitpunkt. Ihr hattet gerade eine sehr große Pflanze erschlagen, da hört man schlecht zu.', 'Ich habe es bei jedem Siegel versucht. Beim sechsten habe ich nichts mehr gesagt. Man fällt einem Kind nicht ins Wort, das sich von seinem Vater verabschiedet.'],
        opts: [{ s: 'Wer seid Ihr?', to: 'wer' }, { s: 'Was geschieht mit dem Brunnen?', to: 'brunnen' }, END()] },
      wer: { lines: ['Jemand, der sehr lange an einer Tür gesessen hat. Den Namen lasse ich noch weg. Er würde Euch nichts sagen – und das ist nicht Eure Schuld. Dafür hat jemand gesorgt.', 'Was Ihr vor Euch seht, ist auch nur mein Schatten. Der Rest von mir ist beschäftigt. Er passt auf, dass etwas weiterschläft.'],
        opts: [{ s: '„Noch nicht. Bitte.“ – Das wart Ihr?', to: 'stimme' }, { s: 'Was geschieht mit dem Brunnen?', to: 'brunnen' }, END()] },
      brunnen: { fx: { flag: 'q:fremder' }, lines: ['Er läuft über, weil unten jemand tiefer atmet. Sechs von sieben Teilen liegen wieder beieinander. Es erinnert sich daran, ganz zu sein.', 'Fragt Eure Brunnenhüterin, was das Wasser nachts flüstert. Sie weiß es seit achtzig Jahren. Sie hat es nur nie einen Namen genannt.', 'Ja – Brunnenhüterin. Die alte Dame, die dort drüben steht und so tut, als höre sie nicht zu. Richtet ihr meinen Gruß aus. Wir kennen uns. Einseitig.'],
        opts: [{ s: 'Wer seid Ihr?', to: 'wer' }, END('Ich richte es aus.')] },
    } }),
  T({ id: 'fremder_mirelda', npc: 'fremder', label: 'Ihr kennt Mirelda?', if: { done: 'm_brunnenhueterin' },
    nodes: { start: { lines: ['Eure Älteste hört mich seit achtzig Jahren und hat nie zurückgerufen. Ich nehme es ihr nicht übel. Ich hätte mir auch nicht geantwortet.', 'Sie grüßt den Brunnen jeden Morgen, wusstet Ihr das? Es mag das. Das Wasser wird wärmer, wenn sie kommt. Sagt es ihr nicht – sie würde damit aufhören. Aus Trotz.'] } } }),

  // ================================================================================== MIRELDA
  T({ id: 'mirelda_amt', npc: 'mirelda', label: 'Was tut eine Brunnenhüterin?', if: { done: 'm_brunnenhueterin' },
    nodes: { start: { lines: ['Zuhören und den Mund halten. In einem davon war ich sehr gut.', 'Das Amt ist älter als der Orden. Die Erste hieß Alruna, steht im Buch – kaum mehr als ein Mädchen. Sie hat verfügt, dass immer eine von uns am Brunnen sitzt und hinhört. Nicht eingreift. Hinhört.', 'Ich habe mich achtzig Jahre lang gefragt, ob das Feigheit ist oder Weisheit. Ich fürchte, es kommt darauf an, was man mit dem Gehörten macht.'] } } }),
  T({ id: 'mirelda_bank', npc: 'mirelda', label: 'Und die Bank?', if: { done: 'c_mirelda_2' },
    nodes: { start: { lines: ['Sie steht noch. Unter der Linde, hinter der Schmiede. Er hat sie jedes Frühjahr gestrichen, vierzig Jahre lang, und ich habe so getan, als fiele mir das nicht auf.', 'Wir sitzen jetzt abends dort. Er sagt nichts. Ich sage alles. Es ist, wie es immer hätte sein sollen.', 'Wenn du grinst, verwandle ich dich in etwas mit Kiemen. Ich kann das nicht. Aber sicher weißt du es nicht.'] } } }),

  // ================================================================================== BORIN
  T({ id: 'borin_brief', npc: 'borin', label: '„Die Brunnenhüterin lässt fragen, ob das Angebot mit der Bank noch steht.“', if: { started: 'c_mirelda_2' }, hot: hot('c_mirelda_2', 'q:brief_borin'),
    nodes: {
      start: { lines: ['…', 'Die Bank. Unter der Linde. Hab sie gebaut, als ich neunzehn war. Für zwei.', 'Sie hat „Brunnenhüterin“ gesagt? Selber? … Dann hat sie’s dir erzählt. Dann darf ich’s auch wissen. Vierzig Jahre hab ich so getan, als wüsst ich nichts. War anstrengend.'],
        opts: [{ s: 'Was soll ich ihr ausrichten?', to: 'antwort' }] },
      antwort: { fx: { flag: 'q:brief_borin' }, lines: ['Sag ihr: Das Eisen ist noch warm.', 'Sie weiß, was das heißt. Wenn nicht, erklär ich’s ihr. In vierzig Jahren.'] },
    } }),
  T({ id: 'borin_kelda', npc: 'borin', label: 'Keldas Hammer', if: { active: 'c_borin_2', undecided: 'borin' }, hot: { active: 'c_borin_2', undecided: 'borin' },
    nodes: {
      start: { lines: ['Zwei Kerben, ein Punkt. Das ist er. Ihr erster. Wollt ihn ihr zur Freisprechung geben und hab stattdessen was von „noch nicht so weit“ gesagt.', 'Wo hast du den her? Wo ist sie?'],
        opts: [{ s: 'Sie lebt. Sie schmiedet in der Aschenrast, bei Rakhans Leuten.', to: 'c1' }, { s: 'Ich habe nur den Hammer gefunden.', to: 'c2' }, END('Gib mir einen Moment.')] },
      ...decision('borin', 1, 'Kelda hat dich gebeten, Borin nicht zu verraten, wo sie ist. Sagst du es ihm, weiß er es.', 'Er hat ein Recht darauf. [Die Wahrheit sagen]', ['In der Asche. Bei den Sippen. … Hm.', 'Gib den Hammer her. Der gehört an den Haken, bis sie ihn holt.']),
      ...decision('borin', 2, 'Du wahrst Keldas Bitte. Borin bekommt den Hammer – und keine Antwort.', 'Es ist ihre Entscheidung, nicht meine. [Schweigen]', ['Nur den Hammer. … Soso.', 'Gib her. Der gehört an den Haken.']),
      d1: { fx: { take: [['q_hammer', 1]] }, lines: ['In der Asche. Bei den Sippen. … Hm.', 'Gib den Hammer her. Der gehört an den Haken, bis sie ihn holt.'] },
      d2: { fx: { take: [['q_hammer', 1]] }, lines: ['Nur den Hammer. … Soso.', 'Gib her. Der gehört an den Haken.'] },
    } }),
  T({ id: 'borin_schwert', npc: 'borin', label: 'Ist Tobis Schwert fertig?', if: { started: 'c_tobi_2' }, hot: hot('c_tobi_2', 'q:holzschwert'),
    nodes: { start: { fx: { flag: 'q:holzschwert' }, lines: ['Hm. Fertig. Seit vorgestern. Wollt’s nur noch mal schleifen. Stumpf schleifen ist schwerer als scharf.', 'Eisenholz. Hält ein Leben lang. Sag dem Jungen, es ist stumpf, weil Ritter nicht schneiden, sondern schützen.', 'Sag nicht, dass das von mir ist. … Sag’s ruhig.'] } } }),
  T({ id: 'borin_arm', npc: 'borin', label: 'Ein sehr kleiner Arm aus Holz', if: { started: 'x_arm' }, hot: hot('x_arm', 'q:arm_borin'),
    nodes: { start: { fx: { flag: 'q:arm_borin' }, lines: ['Was ist das. Ein Arm. Für eine Puppe.', 'Leim? Du willst LEIM? Das wird gezapft. Schwalbenschwanz. Wenn man was macht, macht man’s richtig, auch wenn’s einen Daumen groß ist.', '… Hält. Der Arm überlebt den Jungen. Und dessen Enkel. Geh, sag’s ihm. Den Ritter bring ich selber rüber. Und sag der Mutter, ich mag Honigbrot.'] } } }),

  // ================================================================================== KELDA (Aschenrast)
  T({ id: 'kelda_schmiede', npc: 'kelda', label: 'Was machst du hier?',
    nodes: { start: { lines: ['Ich repariere, was die Asche frisst. Wasserschläuche, Zeltstangen, Messer. Keine Siegel, keine Legenden.', 'Die Sippen haben seit tausend Jahren keinen Schmied, der bleibt. Schlechtes Gewissen, sagen sie. Wegen einer Stadt. Frag Rakhan, wenn er einen redseligen Tag hat. Also nie.'] } } }),
  T({ id: 'kelda_borin', npc: 'kelda', label: 'Zwei Kerben, ein Punkt', if: { started: 'c_borin_1' }, hot: hot('c_borin_1', 'q:kelda'),
    nodes: {
      start: { lines: ['Was starrst du auf meinen Hammer? … Die Marke. Du kennst die Marke.', 'Zwei Kerben, ein Punkt. Der alte Sturkopf lebt also noch. Natürlich lebt er. Der ist zu stur zum Sterben.'],
        opts: [{ s: 'Er fragt nach dir. In seiner Schmiede hängt seit zwanzig Jahren ein leerer Haken.', to: 'haken' }, END('Ich wollte nicht stören.')] },
      haken: { fx: { flag: 'q:kelda', give: [['q_hammer', 1]] }, lines: ['Ein leerer Haken. Zwanzig Jahre. Und er hat nie – nein. Natürlich nicht. Er sagt ja nichts. Er hat in neun Jahren Lehre nicht einmal „gut“ gesagt. Nicht ein einziges Mal.', 'Ich bin gegangen, weil ich dachte, ich werde nie gut genug. Hier sagen sie es dauernd. Es ist unerträglich. Ich bleibe.', 'Hier. Mein erster Hammer. Er hat ihn mir am letzten Tag doch noch hingelegt, ohne ein Wort. Bring ihn ihm zurück. Und – sag ihm nicht, wo ich bin. Bitte. Ich bin noch nicht so weit. Zwanzig Jahre, und ich bin noch nicht so weit.'] },
    } }),
  T({ id: 'kelda_antwort', npc: 'kelda', label: 'Wegen Borin', if: { started: 'c_borin_3' }, hot: hot('c_borin_3', 'q:kelda_antwort'),
    nodes: {
      start: { lines: ['Du schon wieder. Du hast dieses Gesicht. Was hast du ihm gesagt?'],
        opts: [{ s: 'Die Wahrheit. Er weiß, wo du bist. Er hat dir geschrieben.', if: { dec: ['borin', 1] }, to: 'w1' }, { s: 'Nichts. Er hat nur den Hammer. Aber er hat gemerkt, dass ich lüge.', if: { dec: ['borin', 2] }, to: 'w2' }] },
      w1: { fx: { flag: 'q:kelda_antwort' }, lines: ['Du hast – ich hatte dich GEBETEN –', '… Gib her.', '„Kelda. Deine Nähte waren immer gut. Hab’s nie gesagt. War falsch. Der Haken ist frei. B.“ Drei Zeilen. Dafür hat er bestimmt zwei Nächte gebraucht.', 'Ich bin dir böse. Merk dir das. Und jetzt bring ihm das hier. Ich schreibe schneller als er.'] },
      w2: { fx: { flag: 'q:kelda_antwort' }, lines: ['Natürlich hat er das gemerkt. Er merkt alles, er sagt nur nichts.', 'Und er hat nicht nachgebohrt? „Wenn sie ihn holen will, weiß sie, wo“? … Das ist das Längste, was er je zu mir gesagt hat, und er hat es nicht einmal zu mir gesagt.', 'Danke, dass du dichtgehalten hast. Jetzt bin ich so weit. Hier – ein Brief. Mein Entschluss, nicht deiner. Das ist mir wichtig.'] },
    } }),

  // ================================================================================== RAKHAN
  T({ id: 'rakhan_kelda', npc: 'rakhan', label: 'Die Schmiedin aus dem Norden', if: { started: 'c_borin_1' },
    nodes: { start: { lines: ['Die mit dem Hammer. Sie kam vor zwanzig Wintern und fragte nach dem ersten Guss. Ich sagte: Der erste Guss hat uns die Heimat gekostet. Sie sagte: Dann zeig mir den zweiten.', 'Sie spricht nicht von dem Mann, der sie gelehrt hat. Aber jedes Werkstück prüft sie, als sähe ihr jemand über die Schulter. Sie steht dort drüben, bei der Feldesse.'] } } }),
  T({ id: 'rakhan_rat', npc: 'rakhan', label: 'Der Rat der Sippen', if: { active: 'c_rakhan_2', undecided: 'rakhan' }, hot: { active: 'c_rakhan_2', undecided: 'rakhan' },
    nodes: {
      start: { lines: ['Sprich. Heim nach Kharrad – oder weiter durch die Asche?'],
        opts: [{ s: 'Geht heim. Baut an der Schmiede. Tausend Jahre sind genug.', to: 'c1' }, { s: 'Bleibt Wanderer. Ein Volk ist kein Ort.', to: 'c2' }, END('Lass mich darüber schlafen.')] },
      ...decision('rakhan', 1, 'Die Glutsippen werden sesshaft und bauen Kharrad an der Aschenschmiede neu.', 'Heim. [Heimkehr raten]', ['Heim. … So sei es.']),
      ...decision('rakhan', 2, 'Die Glutsippen bleiben Wanderer – aus freier Wahl.', 'Der Weg. [Wanderschaft raten]', ['Der Weg. … So sei es.']),
    } }),

  // ================================================================================== HEDDA & PIM
  T({ id: 'hedda_karl', npc: 'hedda', label: 'Wo steckt eigentlich Karl?', if: { done: 's_wisp', notStarted: 'x_karl' },
    nodes: { start: { lines: ['Karl? Der sollte – Moment. KARL! … Schlackendreck. Sein Seil hängt da. Ohne Karl dran.', 'Schacht drei hab ich vergittert. Dann ist er hinter dem Spiegelsee. Da flackert’s seit Tagen hinter der Felsblockade im Osten. Hol ihn mir, bevor er dem Ding einen Namen gibt.'],
      opts: [{ s: 'Ich hole ihn.', fx: { quest: 'x_karl' } }, { s: 'Er findet schon zurück.' }] } } }),
  T({ id: 'hedda_stollen', npc: 'hedda', label: 'Was aus Stollen sieben werden soll', if: { active: 'c_hedda_2', flag: 'q:pim_stollen', undecided: 'hedda' }, hot: { active: 'c_hedda_2', flag: 'q:pim_stollen', undecided: 'hedda' },
    nodes: {
      start: { lines: ['Pim hat geredet? Der redet doch sonst nur über Preise.', '… „Fahr“, hat Henrik gesagt. Und Pim ist gefahren. Elf Mann auf einem Wagen, der für sechs gebaut ist. Ich wär auch gefahren. Sag ihm das nicht. Ich sag’s ihm selber.', 'Und jetzt du. Was tät’st du mit dem Stollen?'],
        opts: [{ s: 'Versiegle ihn. Manche Stollen sind Gräber.', to: 'c1' }, { s: 'Mach ihn wieder auf. Er hat dir sogar aufgeschrieben, wo das beste Erz liegt.', to: 'c2' }, END('Das will überlegt sein.')] },
      ...decision('hedda', 1, 'Stollen sieben wird als Grab versiegelt; eine Tafel erinnert an Henrik und die elf Geretteten.', 'Zu. [Versiegeln raten]', ['Zu. … Ja.']),
      ...decision('hedda', 2, 'Stollen sieben wird neu ausgebaut und wieder betrieben; Henriks Lampe hängt über dem Eingang.', 'Auf. [Öffnen raten]', ['Auf. … Ja.']),
    } }),
  T({ id: 'pim_stollen', npc: 'pim', label: 'Der Tag in Stollen sieben', if: { started: 'c_hedda_2' }, hot: hot('c_hedda_2', 'q:pim_stollen'),
    nodes: {
      start: { lines: ['Pim weiß nichts von Stollen sieben! Pim war nie – Pim hat nur – …', 'Pim war da.'], opts: [{ s: 'Erzähl.', to: 'tag' }, END('Schon gut.')] },
      tag: { fx: { flag: 'q:pim_stollen' }, lines: ['Pim hat Wagen gebaut, früher. Gute Wagen. Der in Stollen sieben war Pims bester.', 'Dann lief der Berg. Der Steiger – Henrik – hat elf Mann auf Pims Wagen geworfen. Elf! Auf einen Sechser! Und gebrüllt: FAHR. Und Pim ist gefahren.', 'Pim war zuerst draußen. Vor allen anderen. Und hinter Pim ist der Stollen zugegangen wie ein Mund.', 'Seitdem ist Pim immer zuerst DA. Überall. Damit Pim nie wieder zuerst WEG ist. Verstehst du? … Sag es der Grubenmeisterin nicht. Doch. Sag es ihr. Pim kann das nicht mehr tragen, und Pim trägt sonst alles.'] },
    } }),

  // ================================================================================== INGA
  T({ id: 'inga_wette', npc: 'inga', label: 'Warum bist du auf dem Berg geblieben?', if: { started: 'c_jorund_2' }, hot: hot('c_jorund_2', 'q:inga_wette'),
    nodes: {
      start: { lines: ['Wette verloren. Hab ich doch gesagt.', '… Du glaubst mir nicht. Wetten, du glaubst mir nicht? Siehst du. Gewonnen.'], opts: [{ s: 'Unterfjord. Einunddreißig Seelen.', to: 'unterfjord' }, END('Wie du meinst.')] },
      unterfjord: { fx: { flag: 'q:inga_wette' }, lines: ['Wo hast du – die Tafel. Ich hätt sie verbrennen sollen.', 'Ich war vier, als das Eis kam. Meine Leute sind gegangen oder geblieben. Die geblieben sind, sind geblieben. Mit zwanzig bin ich wieder rauf, um den Mann zu finden, der der Eishexe das Weben beigebracht hat.', 'Ich hab ihn gefunden. Er hat mit einem KESSEL geredet und hatte kein Feuerholz. Was soll man da machen? Man kann keinen Mann hassen, der mit seinem Kessel streitet und verliert.', 'Sag ihm, es war eine Wette. Ich hab gewettet, dass ich ihm nie verzeihe. Ich verlier seit elf Jahren. Jeden Tag ein bisschen.'] },
    } }),

  // ================================================================================== LIORA & SEN
  T({ id: 'liora_sen', npc: 'liora', label: 'Du und Sen', if: { done: 'm_archivar' },
    nodes: { start: { lines: ['Sen? Er ist der beste Grabungshelfer, den ich je hatte. Er läuft durch Wände, er schläft nie, und er sagt mir, wenn ich seit zwei Tagen nichts gegessen habe.', 'Er wartet auf jemanden. Ich frage nicht nach. Ich habe einmal gefragt, da ist im ganzen Lager das Wasser gefroren. … Er ist mein Freund. Schreib das nicht auf.'] } } }),
  T({ id: 'liora_manuskript', npc: 'liora', label: 'Das Manuskript', if: { active: 'c_liora_2', undecided: 'liora' }, hot: { active: 'c_liora_2', undecided: 'liora' },
    nodes: {
      start: { lines: ['Sag es einfach. Raus oder rein. Akademie oder Kiste.'],
        opts: [{ s: 'Veröffentliche es. Die Wahrheit gehört allen – Regel sechs.', to: 'c1' }, { s: 'Verwahre es. Nicht streichen – aufheben, bis die Zeit reif ist.', to: 'c2' }, END('Ich brauche noch einen Moment.')] },
      ...decision('liora', 1, 'Das Manuskript geht an drei Akademien. Die Welt erfährt, dass die Quelle ein Jemand ist.', 'Raus damit. [Veröffentlichen raten]', ['Raus damit. JA.']),
      ...decision('liora', 2, 'Das Manuskript bleibt in Lioras Kiste, bis sie die Zeit für reif hält.', 'In die Kiste. [Verwahren raten]', ['In die Kiste. … Ja.']),
    } }),
  T({ id: 'sen_liora', npc: 'sen', label: 'Die Gelehrte', if: { done: 'm_archivar' },
    nodes: { start: { lines: ['Fräulein Liora schreit, wenn sie sich freut, wenn sie sich ärgert und wenn sie niest. Es ist die lebendigste Wache, die ich je gehalten habe.', 'Sie hat mich gefragt, ob ich friere. In vierhundert Jahren hat das niemand gefragt. Ich habe „nein“ gesagt. Es war gelogen. Seitdem stellt sie abends eine Laterne neben mich. Sie wärmt nicht. Es hilft trotzdem.'] } } }),
  T({ id: 'sen_sitz', npc: 'sen', label: 'Der leere Sitz der Dunkelheit', if: { started: 'm_leerer_sitz' }, hot: hot('m_leerer_sitz', 'q:sen_sitz'),
    nodes: { start: { fx: { flag: 'q:sen_sitz' }, lines: ['Der Sitz der Dunkelheit, Reisender? Gewiss. Dienstvorschrift, Absatz neun: „Der siebte Stuhl bleibt frei und wird dennoch täglich abgestaubt.“', 'Wir Rekruten hielten es für einen Scherz der Alten. Hüter Morvain sagte einmal: „Der Stuhl ist nicht leer. Sein Hüter ist nur nie von seinem Posten heimgekommen.“ Dann hat er lange zum Tor gesehen.', 'Ein Posten, den man tausend Jahre nicht verlässt … Verzeiht. Ich finde das weniger befremdlich, als ich sollte.'] } } }),
  T({ id: 'sen_antwort', npc: 'sen', label: '„Kommt er noch?“', if: { active: 'c_sen_2', undecided: 'sen' }, hot: { active: 'c_sen_2', undecided: 'sen' },
    nodes: {
      start: { lines: ['Kommt er noch, Reisender? Klare Meldung, bitte.'],
        opts: [{ s: 'Nein. Morvain ist tot. Ich habe ihn auf dem Thron der Leere besiegt. Deine Wache ist zu Ende.', to: 'c1' }, { s: 'Er lässt dich grüßen. Du sollst die Schwelle halten.', to: 'c2' }, END('Ich … melde mich gleich.')] },
      ...decision('sen', 1, 'Die Wahrheit: Sen erfährt, dass niemand mehr kommt, und wird abgelöst.', 'Wache Sen: abgelöst. [Die Wahrheit sagen]', ['Er kommt nicht. … Verstanden.']),
      ...decision('sen', 2, 'Eine barmherzige Lüge: Sen wartet weiter – mit einem Gruß von seinem Freund.', 'Halte die Schwelle. [Die Wache bestätigen]', ['Er lässt grüßen. … Verstanden.']),
    } }),

  // ================================================================================== MAELIS
  T({ id: 'maelis_nachklang', npc: 'maelis', label: 'Warum bist du noch hier?', if: { done: 'm_koenig' },
    nodes: { start: { lines: ['Ich bin nicht mehr ganz hier. Ich war es ja nie. Aber als das Wasser wieder floss, hat mich etwas festgehalten. Ganz vorsichtig. So, wie man ein Vogelküken hält.', 'Ich habe es immer „den Großen“ genannt. Es hat mich „die Kleine“ genannt. Wir waren mit den Namen zufrieden.'] } } }),
  T({ id: 'maelis_vael', npc: 'maelis', label: 'Der Höfliche', if: { started: 'm_traum' },
    nodes: { start: { lines: ['Er hat mir früher Geschichten erzählt, von weitem, damit ich mich nicht fürchte. Er dachte, ich höre ihn nicht. Alle seine Geschichten enden damit, dass jemand wartet.', 'Wenn du ihn prüfst – oder er dich –, sei nett. Er hat seit tausend Jahren keinen Besuch gehabt, der nicht entweder schläft oder tot ist.'] } } }),

  // ================================================================================== VAEL
  T({ id: 'vael_geschichte', npc: 'vael', label: 'Wer seid Ihr wirklich?', if: { started: 'm_traum' }, hot: hot('m_traum', 'q:vael_geschichte'),
    nodes: {
      start: { fx: { cine: 'vael' }, lines: ['Ihr habt einen Namen gehört, einige Erinnerungen und die Meinung eines Kindes. Dann bin ich an der Reihe. Fragt.'],
        opts: [{ s: 'Warum habt Ihr Morvain durchgelassen?', to: 'morvain' }, { s: 'Seid Ihr sein Wärter oder sein Freund?', to: 'freund' }, { s: 'Was geschieht, wenn es ganz erwacht?', to: 'erwachen' }, END()] },
      morvain: { lines: ['Weil er ein sterbendes Kind auf dem Arm hatte und ich Totenwächter bin. Wir sitzen bei denen, die sterben. Niemand hat mich je gelehrt, einem Vater die Tür zu weisen.', 'Ich wusste, was es kosten würde. Ich habe es ihm gesagt. Er sagte: „Dann kostet es das.“', 'Und es – es selbst – hat zum ersten Mal in sechshundert Jahren gesprochen. Es sagte: „Lass sie durch.“ Nicht ihn. Sie.'],
        opts: [{ s: 'Seid Ihr sein Wärter oder sein Freund?', to: 'freund' }, { s: 'Was geschieht, wenn es ganz erwacht?', to: 'erwachen' }, END()] },
      freund: { lines: ['Ich habe mir die Frage abgewöhnt. Sie hat keine Antwort, mit der ich schlafen könnte, und ich schlafe ohnehin nicht.', 'Ein Freund würde die Tür öffnen. Ein Wärter würde nie mit ihm reden. Ich tue beides nicht richtig. Vielleicht gibt es ein drittes Wort. Wenn Ihr es findet, sagt es mir.'],
        opts: [{ s: 'Vielleicht: Zeuge.', to: 'zeuge', fx: { flag: 'q:vael_zeuge' } }, { s: 'Warum habt Ihr Morvain durchgelassen?', to: 'morvain' }, { s: 'Was geschieht, wenn es ganz erwacht?', to: 'erwachen' }, END()] },
      zeuge: { lines: ['Zeuge. … Jemand, der dabei war und nicht wegsieht.', 'Das wäre – ja. Damit könnte ich schlafen. Wenn ich schliefe. Ich danke Euch. Das meine ich nicht höflich.'],
        opts: [{ s: 'Was geschieht, wenn es ganz erwacht?', to: 'erwachen' }, END()] },
      erwachen: { fx: { flag: 'q:vael_geschichte' }, lines: ['Das weiß niemand. Auch es nicht. Es ist beim Aufwachen weder gut noch böse – es ist verletzt. Es träumt seit tausend Jahren dieselbe Nacht.', 'Ihr habt sechs seiner Kristalle auf einen Brunnenrand gelegt. Der siebte ist seit Morvains Fall zersprungen und singt in Splittern – in Euch, unter anderem. Es fehlt nicht mehr viel.', 'Darum zeige ich Euch die letzte Tür. Nicht, weil ich will. Weil sie ohnehin aufgeht – und dann soll jemand davorstehen, der fragen kann.'],
        opts: [{ s: 'Warum habt Ihr Morvain durchgelassen?', to: 'morvain' }, { s: 'Seid Ihr sein Wärter oder sein Freund?', to: 'freund' }, END('Ich habe verstanden.')] },
    } }),
  T({ id: 'vael_siebte', npc: 'vael', label: 'Die siebte Erinnerung', if: { flag: 'b:vael' }, hot: { flag: 'b:vael', noFlag: 'h:dark' },
    nodes: {
      start: { lines: ['Sechs Schreine, sechs Stimmen. Die siebte hat keinen Stein. Sie hat nur mich, und ich bin ein schlechter Schrein: Ich rede dazwischen.', 'Wollt Ihr sie hören?'], opts: [{ s: 'Ja.', to: 'mem' }, { s: 'Später.' }] },
      mem: { fx: { mem: 'dark', cine: 'mem_dark' }, lines: ['(Vael stellt die Laterne ab. Zum ersten Mal, seit du ihn kennst, hat er beide Hände frei.)'] },
    } }),
  T({ id: 'vael_nochmal', npc: 'vael', label: 'Noch eine Prüfung, alter Mann?', if: { flag: 'b:vael' },
    nodes: { start: { lines: ['Ihr wollt es noch einmal? Ich bin tausend Jahre alt, und Ihr seid unhöflich.', '… Gut. Aber nur in meiner Wacht, am Ende, wo die Tür ist. Anderswo prügle ich mich nicht.'],
      opts: [{ s: 'Zeigt, was Ihr könnt. [Kampf beginnen]', fx: { boss: 1 } }, { s: 'Lieber nicht.' }] } } }),
  T({ id: 'vael_wetter', npc: 'vael', label: 'Wie geht es ihm?', if: { dec: ['ende', 1] },
    nodes: { start: { lines: ['Es schläft. Ruhiger als früher. Manchmal summt es die vier Töne und bricht nach dem dritten ab, wie jemand, der beim Vorlesen einnickt.', 'Ich sage ihm jeden Abend, wie oben das Wetter war. Heute: bedeckt, später Sonne. Es mag Sonne. Fragt mich nicht, woher ich das weiß.'] } } }),
  T({ id: 'vael_sonne', npc: 'vael', label: 'Wie ist die Sonne?', if: { dec: ['ende', 3] },
    nodes: { start: { lines: ['Warm. Ich hatte vergessen, dass sie warm ist. Ich wusste noch, dass sie hell ist – das steht in Büchern. Das mit der Wärme schreibt keiner auf.', 'Eure Älteste hat mir Tee gebracht. Er schmeckt scheußlich. Ich habe drei Tassen getrunken.', 'Der Junge mit dem Holzschwert hat gefragt, ob ich ein Zauberer bin. Ich habe „Wächter“ gesagt. Er hat gesagt: „Ich auch.“ … Ich glaube, ich bleibe ein wenig.'] } } }),

  // ================================================================================== AETHERION
  T({ id: 'aeth_frage', npc: 'aetherion', label: 'Antworten', if: { active: 'm_entscheidung', undecided: 'ende' }, hot: { active: 'm_entscheidung', undecided: 'ende' },
    nodes: {
      start: { who: '', lines: ['(Das Wasser um dich wird warm. Etwas sehr Großes hält den Atem an – diesmal aus Höflichkeit.)', '„Sag es. Was … machst du … mit deinen Händen?“'],
        opts: [
          { s: 'Die Kristalle kehren auf ihre Sitze zurück. Die Welt bleibt, wie sie ist.', to: 'c1' },
          { s: 'Du sollst ganz sein. Kein Siegel, kein Orden, kein Wärter.', to: 'c2' },
          { s: '♪ Vier Töne summen – und dann fragen: „Was willst DU?“', if: LIED_COND, to: 'c3' },
          { s: 'Ich weiß es noch nicht.' },
        ] },
      ...decision('ende', 1, 'Versiegeln: Die sieben Kristalle werden wieder getrennt. Die Quelle bleibt nutzbar und verblasst über Jahrhunderte. Vael wacht weiter.', 'So soll es sein. [Versiegeln]', ['„… zurück. Ja. Ich … kenne das.“']),
      ...decision('ende', 2, 'Befreien: Aetherion wird ganz. Mana wird wild und reich, der Orden endet. Vael darf gehen.', 'So soll es sein. [Befreien]', ['„… ♪♪♪ …“']),
      ...decision('ende', 3, 'Das Lied vollenden: Du stellst die Frage, die nie gestellt wurde, und überlässt Aetherion die Antwort. Vael sieht nach tausend Jahren die Sonne.', 'Ich frage dich. [Das Lied vollenden]', ['„… gefragt. Du hast … gefragt.“']),
    } }),
  T({ id: 'aeth_albtraum', npc: 'aetherion', label: 'Den Albtraum noch einmal durchleben', if: { flag: 'b:aetherion', done: 'm_albtraum' },
    nodes: { start: { lines: ['… ♪ … wieder? Die Nacht aus Asche?', 'Für dich ist es ein Kampf. Für mich ist es … Üben. Jedes Mal wird sie kleiner.'], opts: [{ s: 'Zeig sie mir. [Kampf beginnen]', fx: { boss: 1 } }, { s: 'Nicht heute.' }] } } }),
  T({ id: 'aeth_morgen', npc: 'aetherion', label: 'Guten Morgen.', if: { dec: ['ende', 3] },
    nodes: { start: { lines: ['♪ … Guten Morgen. Das Wort ist … neu. Ich übe.', 'Das Kind mit dem Holzschwert sagt es jeden Tag. Es wartet auf Antwort. Ich mache dann das Wasser warm. Ist das … richtig so?'] } } }),

  // ================================================================================== FENWICK
  T({ id: 'fenwick_name', npc: 'fenwick', label: 'Aetherion', if: { done: 'm_name' },
    nodes: { start: { lines: ['Ae-the-ri-on. Ich habe es in vier alten Sprachen nachgeschlagen. In keiner bedeutet es etwas. In allen vieren klingt es wie Ausatmen.', 'Weißt du, was mich um den Schlaf bringt? Wir sagen „Mana“. Die allerälteste Glosse, die ich kenne, übersetzt es mit „was er uns leiht“. Ich habe das „er“ immer für einen Schreibfehler gehalten.'] } } }),
];
TOPICS.push(...TOPICS_HUB); // Quellwarte (0.9)
export const TOPIC: Record<string, DlgTopic> = Object.fromEntries(TOPICS.map(t => [t.id, t]));
export function topicsOf(npc: string): DlgTopic[] { return TOPICS.filter(t => t.npc === npc); }
