/**
 * Quellwarte (0.9): Gesprächsthemen der Wirtin, der Stammgäste und der Hüter der Einrichtungen. Wird in dialoge.ts an
 * TOPICS angehängt; geprüft und verbucht wie alle Dialogbäume vom Server (server/src/story.ts).
 */
import type { DlgOpt, DlgTopic } from './story';

const T = (t: DlgTopic) => t;
const END = (s = 'Danke. Ich muss weiter.'): DlgOpt => ({ s });

export const TOPICS_HUB: DlgTopic[] = [
  // ================================================================================== HANNE
  T({ id: 'hanne_warte', npc: 'hanne', label: 'Was ist die Quellwarte eigentlich?',
    nodes: {
      start: { lines: ['Eine Wache. Die Hüter haben sie gebaut, als es noch sieben von ihnen gab – oben über dem Netz der Quellsteine, damit jemand nachsieht, ob das Wasser auch dahin fließt, wo es soll.',
        'Dann gab es weniger Hüter und mehr Staub. Mein Großvater hat die Kaserne zum Gasthaus gemacht. Er sagte, Soldaten und Gäste wollen dasselbe: ein Dach, ein Bett und jemanden, der ihnen zuhört.'],
        opts: [{ s: 'Und jetzt?', to: 'jetzt' }, { s: 'Warum „Zum Versiegten Brunnen“?', to: 'name' }, END()] },
      jetzt: { lines: ['Jetzt kommen die Quellgänger wieder. Seit die Quelle stockt, braucht die Welt Leute, die hinuntersteigen. Und Leute, die hinuntersteigen, brauchen Eintopf.',
        'Gunda schmiedet, Ottmar handelt, Irmela braut, Corvin schimpft, Fridolin sortiert. Und Bertram staubt Trophäen ab, die ihr ihm bringt. Jeder hat seine Aufgabe. Meine ist, dass keiner verhungert.'],
        opts: [{ s: 'Warum „Zum Versiegten Brunnen“?', to: 'name' }, END()] },
      name: { lines: ['Als Großvater das Haus aufmachte, war der Brunnen auf dem Platz trocken. Seit hundert Jahren. Also hieß das Gasthaus so.',
        'Jetzt sprudelt er wieder. Ich ändere doch nicht das Schild. Die Leute würden denken, wir hätten den Besitzer gewechselt – und dann müsste ich mich vorstellen.'] },
    } }),
  T({ id: 'hanne_gaeste', npc: 'hanne', label: 'Wer sitzt hier so herum?',
    nodes: {
      start: { lines: ['Stammgäste. Man wird sie nicht los, aber man vermisst sie, wenn sie fehlen. Wie Schnupfen, nur geselliger.'],
        opts: [{ s: 'Alrik?', to: 'alrik' }, { s: 'Merle?', to: 'merle' }, { s: 'Lotte?', to: 'lotte' }, { s: 'Rudger?', to: 'rudger' }, END('Danke.')] },
      alrik: { lines: ['Vierzig Jahre Quellgänger, sagt er. Ich habe nachgerechnet. Es waren elf. Die anderen neunundzwanzig saß er hier und hat erzählt, wie es war.',
        'Aber die elf waren echt. Er hat Narben, wo andere Leute Erinnerungen haben. Sei nett zu ihm.'], opts: [{ s: 'Und die anderen?', to: 'start' }, END('Danke.')] },
      merle: { lines: ['Spielt schief, singt schief, zahlt schief. Aber wenn sie das Lied über die sieben Hüter spielt, wird es still im Raum. Selbst Alrik hört dann auf zu reden.',
        'Ich zahle ihr weniger, wenn sie gut spielt. Sonst bleiben die Leute zu lange. Sie weiß das. Sie spielt trotzdem gut. Manchmal.'], opts: [{ s: 'Und die anderen?', to: 'start' }, END('Danke.')] },
      lotte: { lines: ['Ein Kartenlehrling aus dem Süden. Ihr Meister hat sie hergeschickt, „damit sie die Welt kennenlernt“. Ich glaube, er wollte seine Ruhe.',
        'Sie fragt jeden Quellgänger aus, der zur Tür hereinkommt. Antworte ihr. Sie schreibt alles auf, und ihre Karten sind besser als die meisten, die man kaufen kann.'], opts: [{ s: 'Und die anderen?', to: 'start' }, END('Danke.')] },
      rudger: { lines: ['Der letzte Hauptmann der Torwache. Als die Kaserne zum Gasthaus wurde, hat er sich einfach an den Tisch gesetzt, an dem früher die Wachstube war. Er sitzt seitdem dort.',
        'Er tut streng. Er ist es nicht. Wenn du ihn zum Lachen bringst, gibt er einen aus – das ist in dreißig Jahren genau zweimal passiert.'], opts: [{ s: 'Und die anderen?', to: 'start' }, END('Danke.')] },
    } }),
  T({ id: 'hanne_brett', npc: 'hanne', label: 'Was hat es mit dem Gerüchtebrett auf sich?',
    nodes: { start: { lines: ['Wer hier trinkt, redet. Wer redet, übertreibt. Und manchmal ist zwischen den Übertreibungen etwas Wahres. Das schreibe ich auf und nagle es ans Brett.',
      'Seltene Ungeheuer, verborgene Winkel, Dinge, die nachts vom Himmel fallen. Jeden Tag hängen andere Zettel. Was davon stimmt, findest du nur heraus, wenn du hingehst.',
      'Und wenn einer stimmt – erzähl es mir. Dann kostet das nächste Bier die Hälfte. Das ist mein Forschungsetat.'] } } }),

  // ================================================================================== ALRIK
  T({ id: 'alrik_geschichte', npc: 'alrik', label: 'Erzähl von früher.',
    nodes: {
      start: { lines: ['Früher. Früher war alles weiter weg, und wir sind trotzdem hingelaufen. Ohne Quellsteine. Mit einem Laib Brot und einer Meinung.',
        'Ich war mal der Beste. Fragt man heute die anderen, sagen sie, ich war der Lauteste. Das schließt sich nicht aus.'],
        opts: [{ s: 'Was ist in der Wurzelgruft passiert?', to: 'gruft' }, { s: 'Warst du wirklich der Beste?', to: 'beste' }, END()] },
      gruft: { lines: ['Ich war jung, die Dornenmutter war schlecht gelaunt. Ich habe zugeschlagen, sie hat zugeschlagen, und dann bin ich gerannt. Sehr schnell. In die richtige Richtung, zum Glück.',
        'Seitdem träume ich von Dornen. Die eine Hälfte von mir sagt, ich soll wieder hinunter. Die andere Hälfte sagt, ich soll noch ein Bier bestellen. Rate, welche Hälfte hier am Tresen sitzt.'],
        opts: [{ s: 'Warst du wirklich der Beste?', to: 'beste' }, END()] },
      beste: { lines: ['Nein. Die Beste war Mirelda. Bevor sie Älteste wurde, hat sie in einer Woche drei Gruften ausgeräumt und am Sonntag noch Kuchen gebacken.',
        'Sag ihr nicht, dass ich das gesagt habe. Sie würde mir glauben, und das hält keiner von uns beiden aus.'] },
    } }),
  T({ id: 'alrik_ganz', npc: 'alrik', label: 'Und, wie fühlt sich die andere Hälfte an?', if: { done: 'qw_alrik' },
    nodes: { start: { lines: ['Ungewohnt. Ich bin heute Morgen aufgewacht und wollte in einen Dungeon. Einfach so. Habe mich dann zum Glück hingelegt, bis es vorbei war.',
      'Danke, Quellgänger. Ehrlich. Wenn du mal jemanden brauchst, der dir von hinten Ratschläge zuruft: Ich bin da. Am Tresen.'] } } }),

  // ================================================================================== MERLE
  T({ id: 'merle_lied', npc: 'merle', label: 'Spielst du etwas?',
    nodes: {
      start: { lines: ['Etwas Fröhliches oder etwas Wahres? Beides zusammen kann ich nicht, das hat noch keiner geschafft.'],
        opts: [{ s: 'Etwas Fröhliches.', to: 'froh' }, { s: 'Etwas Wahres.', to: 'wahr' }, END('Vielleicht später.')] },
      froh: { lines: ['(Merle spielt ein Lied über einen Moosling, der einem Bauern die Stiefel stiehlt und sie nicht zurückgibt, weil sie ihm besser stehen. Der Refrain hat elf Strophen. Alrik singt alle mit, falsch.)'],
        opts: [{ s: 'Und jetzt etwas Wahres.', to: 'wahr' }, END('Großartig. Wirklich.')] },
      wahr: { lines: ['(Sie stimmt die Laute nach, bis sie fast richtig klingt.)',
        '„Sieben gingen hinab, wo das Wasser schläft, / sieben schworen, es fließe für alle. / Einer blieb unten, der Rest ging nach Haus – / und keiner sprach je von dem Siebten.“',
        'Das ist alt. Älter als die Warte. Niemand weiß, wer es geschrieben hat. Ich singe es trotzdem jedes Mal so, als wüsste ich es.'] },
    } }),
  T({ id: 'merle_dank', npc: 'merle', label: 'Wie ist das Lied geworden?', if: { done: 'qw_merle' },
    nodes: { start: { lines: ['Furchtbar. Das Publikum liebt es. Ich verstehe das Publikum nicht, aber ich verstehe Trinkgeld.',
      'Ich habe eine Strophe über dich geschrieben. Du kommst darin auf einem Obsidianfeld vor und siehst sehr entschlossen aus. In Wirklichkeit hast du wahrscheinlich geschwitzt. Lieder lügen gnädig.'] } } }),

  // ================================================================================== LOTTE
  T({ id: 'lotte_karte', npc: 'lotte', label: 'Zeig mal deine Karte.',
    nodes: {
      start: { lines: ['(Ein großes Blatt, darauf Quellhain, sehr ordentlich. Drumherum viel Weiß – und an den Rändern Ungeheuer mit erstaunlich vielen Zähnen.)',
        'Die Ungeheuer sind geraten. Mein Lehrmeister sagt, das darf man nicht. Ich sage, sonst sieht die Karte so leer aus.'],
        opts: [{ s: 'Warum bist du hier?', to: 'warum' }, { s: 'Was zeichnest du als Nächstes?', to: 'next' }, END()] },
      warum: { lines: ['Mein Lehrmeister hat gesagt: „Geh und lern die Welt kennen.“ Dann hat er die Tür zugemacht und abgeschlossen. Ich glaube, er hat es ernst gemeint.',
        'Die Quellwarte ist der beste Ort dafür. Alle kommen hier vorbei und erzählen, wo sie waren. Ich muss nur zuhören und schnell genug malen.'],
        opts: [{ s: 'Was zeichnest du als Nächstes?', to: 'next' }, END()] },
      next: { lines: ['Die Quellsteine! Sie sind wie Nägel, an denen man die Karte festmacht. Wenn ich weiß, wo alle stehen, weiß ich, wie groß die Welt ist.',
        'Und dann zeichne ich die Wege dazwischen. Und dann die Ungeheuer. Die echten diesmal. Hoffentlich haben sie weniger Zähne.'] },
    } }),

  // ================================================================================== RUDGER
  T({ id: 'rudger_kaserne', npc: 'rudger', label: 'Wie war die Quellwarte früher?',
    nodes: {
      start: { lines: ['Ordentlich. Morgens Appell, mittags Appell, abends Appell. Dazwischen Wache. Und nachts habe ich geträumt, ich stünde beim Appell.',
        'Dreißig Mann Besatzung, zwölf davon Ehrenwache. Wir haben das Tor gehalten, die Steine bewacht und Fremde nach ihrem Namen gefragt. Die meisten hatten einen.'],
        opts: [{ s: 'Was ist mit der Ehrenwache passiert?', to: 'wache' }, { s: 'Vermisst du es?', to: 'vermisst' }, END()] },
      wache: { lines: ['Sie sind in die Ruinen gezogen, als die Hüter verschwanden. Um nachzusehen. Niemand ist zurückgekommen.',
        'Ich war zu jung für die Ehrenwache. Ich habe mich jahrelang darüber geärgert. Jetzt bin ich alt und ärgere mich nicht mehr. Über das eine nicht.'],
        opts: [{ s: 'Vermisst du es?', to: 'vermisst' }, END()] },
      vermisst: { lines: ['Den Appell? Nein. Die Leute? Jeden Tag.', 'Aber das Bier war damals schlechter. Man muss die Dinge im Zusammenhang sehen.'] },
    } }),
  T({ id: 'rudger_ruhe', npc: 'rudger', label: 'Die Ehrenwache hat ihre Ruhe.', if: { done: 'qw_rudger' },
    nodes: { start: { lines: ['Ich weiß. Ich habe es im Dienstbuch eingetragen. Unter „Abgelöst“. Das ist das schönste Wort, das wir hatten.',
      '(Er hebt den Krug, sieht einen Moment lang an dir vorbei und trinkt dann sehr lange.)', 'Hanne. Noch einen. Für den Quellgänger. – Ja, ich zahle. Schreib es in die Chronik.'] } } }),

  // ================================================================================== HÜTER DER EINRICHTUNGEN
  T({ id: 'corvin_meister', npc: 'corvin', label: 'Was sind Meisterränge?',
    nodes: { start: { lines: ['Wer eine Technik ganz beherrscht, glaubt, er sei fertig. Das ist der Moment, in dem ich anfange.',
      'Bring mir eine Fähigkeit, die du bis zum Ende gelernt hast. Dann zeige ich dir, was hinter dem Ende kommt. Es kostet Gold, Essenzen und deinen Stolz. Den Stolz bekommst du zurück. Meistens.',
      'Aber nur für wenige Techniken zugleich. Wer alles meistern will, meistert nichts. Das habe ich nicht erfunden, das hat mir mein Lehrer gesagt, und er hat mich dabei mit einem Stock geschlagen.'] } } }),
  T({ id: 'wenke_gruppe', npc: 'wenke', label: 'Wie finde ich hier Leute?',
    nodes: { start: { lines: ['Am Brett neben mir hängen die Gesuche. Häng deins dazu, dann sehen alle in der Warte das Fähnchen über deinem Kopf und wissen: Der da will nicht allein.',
      'Einladen kannst du jeden, der hier steht. Wer annimmt, ist im Rott. Wer anführt, wählt im Portal das Ziel. Wer nicht anführt, packt die Tränke ein.'] } } }),
  T({ id: 'bertram_halle', npc: 'bertram', label: 'Was wird hier ausgestellt?',
    nodes: { start: { lines: ['Alles, was du besiegt, gefunden oder überlebt hast. Ich führe Buch. Siege, Bestzeiten, besondere Stücke. Wer viel erlebt hat, bekommt viel Regal.',
      'Die Trophäen selbst stellst du auf deinem Hof auf, wenn du einen hast. Hier zeige ich dir nur, was du alles hast. Das ist bei manchen Leuten ein kurzer Besuch.'] } } }),
];
