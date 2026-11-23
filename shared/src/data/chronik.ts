/**
 * Die Chronik: sammelbare Schriftstücke, die in der Welt liegen (Bücher, Tafeln, Schriftrollen, Steine).
 * Gefunden = Flag `l:<id>`. Platzierung deterministisch durch maps/storygen.ts.
 */
import type { CharData } from '../types';
import type { Cond } from './cond';

export type LoreCat = 'krieg' | 'hueter' | 'orden' | 'traeumer' | 'morvain' | 'lied' | 'leute';
export const LORE_CATS: { id: LoreCat; name: string }[] = [
  { id: 'krieg', name: 'Der Alte Krieg' },
  { id: 'hueter', name: 'Die Ersten Hüter' },
  { id: 'orden', name: 'Der Orden der Sieben' },
  { id: 'traeumer', name: 'Der Träumer am Grund' },
  { id: 'morvain', name: 'Morvain und Maelis' },
  { id: 'lied', name: 'Das Wiegenlied' },
  { id: 'leute', name: 'Land und Leute' },
];

export interface LoreDoc {
  id: string; title: string; cat: LoreCat; zone: string;
  /** Aussehen des Fundstücks (Objekt-Frame `lore_<look>`) */
  look: 'book' | 'tablet' | 'scroll' | 'stone';
  /** Oberwelt: POI-Id, in dessen Nähe es liegt · Dungeon: Raumrolle (entrance, combat, treasure, key, puzzle, secret, trap) */
  at?: string;
  /** nur vorhanden, wenn die Bedingung zutrifft (zählt dann nicht zur Gesamtzahl) */
  when?: Cond;
  text: string;
}
const D = (d: LoreDoc) => d;

export const LORE_DOCS: LoreDoc[] = [
  // ================================================================================== GRÜNWALD
  D({ id: 'brunnenbuch', title: 'Das Brunnenbuch', cat: 'orden', zone: 'gruenwald', look: 'book', at: 'schrein',
    text: '„Buch der Brunnenhüterinnen von Quellhain. Jede schreibe hinein, was das Wasser ihr sagt, und sage es sonst niemandem.“\n\nEintrag 1: „Es flüstert einen Namen. Ich schreibe ihn nicht auf. Alruna hat gesagt, wir sollen ihn hören, nicht weitergeben.“\n\nEintrag 212: „Der Name, wieder. Dazu heute Nacht eine zweite Stimme, müde, sehr höflich: ‚Noch nicht.‘ Mit wem spricht sie?“\n\nLetzter Eintrag, eine enge, spöttische Handschrift: „Brunnen steht eine Handbreit tiefer. Die Stimme bittet jede Nacht. Ich schicke trotzdem jemanden nach den Siegeln. Das Dorf verdurstet sonst. Möge mir das Wasser vergeben; ich selbst habe es nicht vor. – M.“' }),
  D({ id: 'oda_kerben', title: 'Odas Kerbholz', cat: 'hueter', zone: 'gruenwald', look: 'tablet', at: 'weiher',
    text: 'Ein Erntestock, Kerbe um Kerbe, Jahr um Jahr. Äpfel, Birnen, Korn.\n\nDann eine Reihe ohne Kerben und daneben, eingebrannt: „Stille. Nichts wächst. Auch nicht das Unkraut, und das will was heißen.“\n\nDie letzte Kerbe ist tief wie ein Axthieb: „Garten abgegeben. Dafür ein Siegel bekommen. Schlechter Tausch für mich, guter für alle anderen. So ist Landwirtschaft.“' }),
  D({ id: 'holzarm', title: 'Ein hölzerner Arm', cat: 'leute', zone: 'gruenwald', look: 'scroll', at: 'hain1',
    text: 'Zwischen den Wurzeln liegt ein winziger Arm aus Holz, sauber geschnitzt, mit einem Zapfen an der Schulter. Die Hand hält ein Schwert von der Größe eines Zahnstochers.\n\nJemand hat ihn sorgfältig in ein Blatt gewickelt und einen Zettel dazugelegt, in Wolfszahn-Abdrücken und etwas, das Sabber sein könnte. Der Zettel ist leer. Wölfe schreiben selten.\n\nIrgendwo in Quellhain vermisst ein sehr tapferer Ritter etwas.' }),
  D({ id: 'holzfaeller', title: 'Zettel der Holzfäller, Rückseite', cat: 'leute', zone: 'gruenwald', look: 'scroll', at: 'lager',
    text: '„Nachtrag, weil Jost darauf besteht: Die Äxte summen. Nicht alle. Nur die, die wir am Weiher geschliffen haben.\n\nJost sagt, sie summen einen Namen. Ich sage, Jost soll weniger von Sellas Selbstgebranntem trinken.\n\nWir gehen trotzdem ins Dorf zurück. Nicht wegen des Summens. Wegen der Käfer. Hauptsächlich wegen der Käfer.“' }),
  D({ id: 'kinderreim', title: 'Abzählreim der Quellhainer Kinder', cat: 'traeumer', zone: 'gruenwald', look: 'stone',
    text: 'Mit Kreide auf einen flachen Stein geschrieben, in sieben Kästchen zum Hüpfen:\n\n„Eins für Erde, die nichts vergisst,\nzwei für Licht, das hingesehen,\ndrei für Feuer, das nicht wartet,\nvier für Wasser, das es weiß,\nfünf für Wind, der Zeilen streicht,\nsechs fürs Herz an einer Kette,\nsieben sitzt an einer Tür –\nund wer schläft, der bist nicht du.“\n\nNiemand im Dorf weiß, woher der Reim stammt. Alle können ihn.' }),
  D({ id: 'vael_laterne', title: 'Zettel unter einer Laterne', cat: 'traeumer', zone: 'gruenwald', look: 'scroll', at: 'dorf', when: { dec: ['ende', 2] },
    text: 'Am Brunnenrand steht eine Laterne. Sie ist aus. Darunter klemmt ein Zettel in einer sehr ordentlichen, sehr alten Handschrift:\n\n„Verzeiht die Unordnung. Ich habe tausend Jahre lang nichts besessen außer dieser Lampe und wusste nicht, wem man so etwas hinterlässt.\n\nSie brennt nicht mehr. Das ist kein schlechtes Zeichen. Sie hat nur gebrannt, solange jemand im Dunkeln saß.\n\nIch gehe nach Osten. Man sagt, dort geht die Sonne auf. Ich möchte das prüfen. – V.“' }),

  // ================================================================================== WURZELGRUFT
  D({ id: 'gruft_wurzeln', title: 'In die Wurzel geritzt', cat: 'hueter', zone: 'wurzelgruft', look: 'tablet', at: 'treasure',
    text: 'Grobe, tiefe Buchstaben, mit einem Erntemesser geschnitten:\n\n„Hier stand mein Birnbaum. Hier die Bank. Hier hat mein Mann immer zu früh gepflückt.\n\nJetzt steht hier ein Siegel, und die Wurzeln halten es fest, wie ich es ihnen gesagt hab. Wurzeln tun, was man ihnen sagt, wenn man lange genug mit ihnen redet.\n\nWer das liest: Tritt nicht auf die Stelle bei der Bank. – O.“' }),
  D({ id: 'gruft_garten', title: 'Verzeichnis eines Obsthains', cat: 'krieg', zone: 'wurzelgruft', look: 'scroll', at: 'combat',
    text: '„Tannreich, im dritten Jahr des Quellstreits. Bestand: 400 Apfel, 220 Birne, 60 Kirsche.\n\nBewässerung: täglich 30 Fass aus dem Quellkanal. Hochwind nimmt 50. Kharrad nimmt 200 für die Essen und sagt, Eisen sei wichtiger als Äpfel.\n\nNachtrag: Der Kanal führt die Hälfte. Wir graben tiefer. Alle graben tiefer.\n\nNachtrag: Der Kanal ist trocken. Kharrad sagt, wir seien schuld. Wir sagen, Kharrad sei schuld. Das Wasser sagt nichts mehr.“' }),

  // ================================================================================== KRISTALLHÖHLEN
  D({ id: 'henrik_lampe', title: 'Henriks Grubenlampe', cat: 'leute', zone: 'kristall', look: 'stone', at: 'tief',
    text: 'Eine verbeulte Grubenlampe, das Glas gesprungen, der Docht verkohlt. Im Boden steckt ein Zettel, mit Kreide beschrieben, die Schrift wird nach unten hin hastiger:\n\n„Stollen 7. Der Berg läuft. Stützen 4 bis 9 gebrochen.\n\nPims Wagen hat gehalten. Elf Mann raus. Hab ihm gesagt: FAHR.\n\nKarl fehlt. Hol ihn noch.\n\nHedda – das Erz hinten links ist das beste, das ich je gesehen hab. Nur damit du’s weißt. H.“' }),
  D({ id: 'kaspian_linse', title: 'Kaspians Linsenbuch', cat: 'hueter', zone: 'kristall', look: 'book', at: 'halle',
    text: '„Schliff 114. Durch diese Linse sieht das Quellwasser aus wie Wasser. Enttäuschend.\n\nSchliff 115. Wie Wasser, aber es sieht ZURÜCK. Ich habe vor Schreck die Linse fallen lassen. Schliff 116 angefangen.\n\nSchliff 131. Da ist ein Puls. Ich habe ihn gezählt: ein Schlag, während ich dreimal atme. Etwas, das so langsam lebt, hält uns vermutlich für Eintagsfliegen.\n\nSchliff 140. Die anderen wollen es ‚teilen‘. Ich habe gefragt, ob man dazu nicht erst wissen müsse, was es IST. Rhuna sagt: ‚Ein Problem.‘“' }),
  D({ id: 'spiegelsee', title: 'Am Spiegelsee, eingeritzt', cat: 'traeumer', zone: 'kristall', look: 'tablet', at: 'see',
    text: 'Viele Hände haben hier über die Jahrhunderte dasselbe in den Stein gekratzt, in immer neuen Schriften:\n\n„Ich habe eine Stadt gesehen.“ – „Ich auch. Mit Türmen aus Glas.“ – „Sie hat mir gewinkt.“ – „Blödsinn, Städte winken nicht.“ – „Diese schon.“\n\nGanz unten, frisch: „Es ist keine Stadt. Es ist eine Erinnerung an eine. Jemand träumt von Tiefenglanz, wie es war, bevor wir kamen. – Messgehilfin, Schicht 3“' }),
  D({ id: 'grubenlied', title: 'Grubenlied, Strophe sieben', cat: 'leute', zone: 'kristall', look: 'scroll',
    text: '„Sechs Strophen singt der Hauer laut,\ndie siebte singt er nicht,\ndie siebte summt der Berg allein,\nwenn keiner mit ihm spricht.\n\nUnd summt der Berg, dann halt den Mund\nund leg die Hacke hin –\nes hat noch keiner je bereut,\ndass er höflich gewesen bin.“\n\nRandnotiz in Heddas Schrift: „Reimt sich nicht. Stimmt aber.“' }),

  // ================================================================================== TIEFE GEODE
  D({ id: 'guenther', title: 'Günthers Namensschild', cat: 'leute', zone: 'geode', look: 'tablet', at: 'entrance',
    text: 'Ein Brett, mit Draht an einen Stalagmiten gebunden. In ungelenker Schönschrift:\n\n„GÜNTHER. Wächter. Steht hier seit immer. Nicht anfassen, nicht füttern, nicht nach dem Weg fragen.“\n\nDarunter, in vielen verschiedenen Handschriften, eine Strichliste: „Tage ohne Bewegung“. Sie reicht über vier Bretter.\n\nDer letzte Strich ist durchgestrichen. Jemand hat daneben geschrieben: „Schlackendreck.“' }),
  D({ id: 'geode_messung', title: 'Messreihe der Glasschleifer', cat: 'traeumer', zone: 'geode', look: 'book', at: 'puzzle',
    text: '„Tiefenglanz, Messreihe zur Quellader. Helligkeit der Kristalle, täglich zur selben Stunde.\n\nTag 1 bis 300: gleichmäßig.\nTag 301: Schwankung. Wir haben an diesem Tag den Kanal erweitert.\nTag 340: Schwankung. Kanal erweitert.\nTag 400: Die Kristalle werden jedes Mal dunkler, wenn wir mehr nehmen. Als zöge jemand die Hand zurück.\n\nVermerk der Zunft: Beobachtung ist interessant, ändert aber nichts an der Förderquote.“' }),

  // ================================================================================== GLUTLANDE
  D({ id: 'kharrad_strasse', title: 'Straßenschild von Kharrad', cat: 'krieg', zone: 'glut', look: 'stone', at: 'feld',
    text: 'Im Obsidian eingeschlossen wie eine Fliege im Bernstein: ein eisernes Schild.\n\n„HAMMERGASSE. Zur Großen Esse 200 Schritt. Lehrlinge links gehen.“\n\nDarunter hat jemand vor sehr langer Zeit mit einem Nagel gekratzt: „Rhuna hat gesagt, wir haben eine Stunde. Es war weniger.“\n\nUnd darunter, viel später, mit Kohle: „Wir vergeben dir nicht. Wir tragen deine Siegel trotzdem im Wappen. – Die Sippen“' }),
  D({ id: 'rhuna_regel', title: 'Rhunas Schmiederegeln', cat: 'hueter', zone: 'glut', look: 'tablet', at: 'krater',
    text: '„1. Miss zweimal. Schlag einmal.\n2. Wer das Eisen fragt, was es werden will, bekommt einen Klumpen.\n3. Eine Fassung ist kein Käfig. Eine Fassung ist ein Versprechen, dass etwas hält.\n4. Wenn du zwischen Werkstück und Werkstatt wählen musst, hast du vorher etwas falsch gemacht. Wähle trotzdem.\n5. Entschuldige dich nie für gute Arbeit.“\n\nRegel 6 ist ausgemeißelt. Man erkennt noch den Anfang: „Wenn es weint –“' }),
  D({ id: 'nomadenlied', title: 'Wanderlied der Glutsippen', cat: 'leute', zone: 'glut', look: 'scroll',
    text: '„Wir haben kein Dach, wir haben den Rauch,\nwir haben kein Tor, wir haben den Wind,\nwir hatten eine Stadt aus Eisen und Brauch –\nfrag nicht die Alten, frag nicht das Kind.\n\nDie Mutter trug Siegel, die Mutter trug schwer,\ndie Mutter trug uns nicht, wir trugen uns selbst.\nUnd fragt einer: ‚Wann geht ihr wieder heim?‘ –\ndann sag ihm, Fremder: wenn du uns fehlst.“' }),
  D({ id: 'kelda_notiz', title: 'Notiz an der Feldesse', cat: 'leute', zone: 'glut', look: 'scroll', at: 'lager',
    text: 'Mit einem Nagel an einen Zeltpfosten geheftet, verrußt:\n\n„Was ich noch kann: Nähte, die halten. Kanten, die nicht ausbrechen. Den Hammer so führen, dass er singt.\n\nWas ich verlernt habe: Fragen, ob es gut genug ist.\n\nWas ich nie konnte: Ihm sagen, dass es reicht, wenn einer mal ‚gut‘ sagt. Einmal. In neun Jahren.\n\nSchmiede hier für Wasser und Brot. Die Sippen sagen ‚gut‘. Ständig. Es ist unerträglich. Ich bleibe.“' }),

  // ================================================================================== ASCHENSCHMIEDE
  D({ id: 'kharrad', title: 'Schmiedebuch von Kharrad', cat: 'hueter', zone: 'aschenschmiede', look: 'book', at: 'key',
    text: '„Auftrag der Sieben: sechs Fassungen, eine je Element, für etwas, das größer ist als jede Form.\n\nIch habe gesagt, das geht nicht. Dann habe ich es gemacht.\n\nGuss 1 bis 6 gelungen. Guss 7 gesprungen, dreimal. Das siebte Stück lässt sich nicht fassen. Es will nicht. Zum ersten Mal in meinem Leben schreibe ich über ein Werkstück, dass es etwas WILL.\n\nLetzte Zeile, hastig: Der Berg kommt. Ich nehme die Fassungen. Die Lehrlinge sollen laufen. Wer das hier findet: Sag den Sippen, ich habe gezählt, wie viele es aus der Hammergasse geschafft haben. Ich zähle noch. – R.“' }),
  D({ id: 'gussform', title: 'Die siebte Gussform', cat: 'orden', zone: 'aschenschmiede', look: 'tablet', at: 'secret',
    text: 'Eine Gussform aus schwarzem Stein, rund, handtellergroß – und leer. Sie hat nie etwas gehalten.\n\nIm Rand eine umlaufende Inschrift der Ersten Hüter:\n\n„Sechs sind gefasst. Das siebte trägt, wer das Gleichgewicht hütet, am eigenen Leib, bis es einen anderen findet. So bleibt das Herz geteilt, und was geteilt ist, erwacht nicht.“\n\nDarunter, kleiner, in anderer Hand: „Und wenn der Träger es je fallen lässt? – Dann zerspringt es in Splitter und sucht sich selbst jemanden.“' }),

  // ================================================================================== FROSTGEBIRGE
  D({ id: 'ton1', title: 'Erster Ton', cat: 'lied', zone: 'frost', look: 'scroll', at: 'gipfel',
    text: 'An der untersten Gebetsfahne hängt ein Glöckchen aus Eis, das nicht taut. Wenn der Wind es berührt, gibt es einen einzigen Ton.\n\nEr ist tief und ruhig. Ein Ton wie eine Hand, die eine Decke glattstreicht.\n\nAuf der Fahne steht in verblichener Tinte: „Der erste ist zum Einatmen, Papa. So fängt man an. – M.“' }),
  D({ id: 'nerys_logbuch', title: 'Logbuch einer Fähre', cat: 'hueter', zone: 'frost', look: 'book', at: 'see',
    text: '„Überfahrt 3041. Vier Verwundete aus Hochwind, zwei aus Tannreich. Sie haben sich im Boot angeschwiegen. Am Ufer haben sie einander herausgeholfen. So ist das mit Booten.\n\nÜberfahrt 3050. Das Wasser war heute warm an einer Stelle, mitten im Fjord. Darunter ist nichts. Darunter ist nur die Ader zur Quelle.\n\nÜberfahrt 3051. Wieder warm. Ich habe die Hand hineingehalten und ‚Ich weiß‘ gesagt. Ich weiß nicht, warum.\n\nLetzter Eintrag: Keine Überfahrt mehr. Der Fjord steht. Ich habe das Ruder behalten. Man gibt so etwas nicht ab.“' }),
  D({ id: 'unterfjord', title: 'Ortstafel: Unterfjord', cat: 'leute', zone: 'frost', look: 'stone',
    text: 'Eine Holztafel, halb im Eis:\n\n„UNTERFJORD. 31 Seelen, 4 Boote, 1 Ziege mit Meinung.“\n\nDie Zahl ist durchgestrichen und ersetzt, immer wieder: 28. 19. 7. Dann nichts mehr.\n\nJemand hat – viel später, die Kerben sind noch hell – ein Wort daruntergeschnitzt: „INGA war hier. Bin wieder da. Hab nicht vor, es jemandem zu erklären.“' }),
  D({ id: 'jorund_kessel', title: 'Jorunds Wetterbuch', cat: 'leute', zone: 'frost', look: 'book', at: 'lager',
    text: '„Tag 14 601. Schnee. Kessel sagt: Schnee.\nTag 14 602. Schnee. Kessel schweigt beleidigt.\nTag 14 603. Schnee. Heute vor vierzig Jahren habe ich zu ihr gesagt: ‚Halt es auf, wenn du kannst.‘ Ich meinte den Bach. Ich war in Eile.\nTag 14 604. Schnee.\nTag 14 610. Ein Tropfen. Vom Dach. Kessel und ich haben eine Stunde lang zugesehen, ob noch einer kommt.\nEs kam noch einer.“' }),
  D({ id: 'zeile2', title: 'Zweiter Streifen', cat: 'krieg', zone: 'frost', look: 'scroll', at: 'klamm2',
    text: 'Ein schmaler Streifen Pergament, sauber mit dem Lineal abgetrennt, in einer Felsspalte festgefroren. Die Tinte ist tausend Jahre alt und gestochen scharf:\n\n„… jemand gefragt?“\n\nMehr steht nicht darauf. Der obere Rand passt zu etwas, das fehlt.' }),

  // ================================================================================== GLETSCHERDOM
  D({ id: 'ysolde_faden', title: 'Ysoldes letzter Faden', cat: 'orden', zone: 'gletscherdom', look: 'scroll', at: 'puzzle',
    text: 'In Eis gewebt, Buchstabe für Buchstabe, die Zeilen werden nach unten hin unruhiger:\n\n„Meister Jorund sagte: Halt es auf, wenn du kannst. Er sagte nicht, was. Er war in Eile. Er ist immer in Eile, wenn etwas wichtig ist.\n\nAlso halte ich es auf. Den Bach. Den Winter. Das Versiegen. Alles, was fließt, geht verloren; was steht, bleibt.\n\nEr wird es verstehen, wenn er es sieht. Er hat immer gesagt, ich sei seine gründlichste Schülerin.\n\nMir ist kalt. Das gehört dazu.“' }),
  D({ id: 'dom_muster', title: 'Webmuster, unvollendet', cat: 'orden', zone: 'gletscherdom', look: 'tablet', at: 'treasure',
    text: 'Eine Eisplatte, darin eingefroren ein Webrahmen. Das Muster zeigt sieben Figuren um einen Kreis.\n\nSechs sind fertig gewebt. Die siebte ist nur vorgezeichnet: eine Gestalt, die sich abwendet.\n\nDaneben eine Notiz in Ysoldes Schrift: „Lehrstück der Wasserhüter. Die siebte Figur wird in jedem Jahrgang weggelassen. Niemand konnte mir sagen, warum. Meister Jorund sagt: ‚Tradition.‘ Das sagt er immer, wenn er etwas nicht weiß.“' }),

  // ================================================================================== VERLORENE RUINEN
  D({ id: 'ton2', title: 'Zweiter Ton', cat: 'lied', zone: 'ruinen', look: 'stone', at: 'garten',
    text: 'Zwischen den gläsernen Blumen im Kinderbeet steht eine, die anders ist: ein Glockenblümchen, nicht größer als ein Fingernagel.\n\nWenn du dich hinkniest und atmest, klingt es. Ein heller Ton, eine Spur zu hoch – wie ein Kind, das beim Singen auf den Zehenspitzen steht.\n\nIn den Einfassungsstein ist gekratzt: „Der zweite ist zum Aufschauen.“' }),
  D({ id: 'dienstplan', title: 'Wachplan der Schwelle', cat: 'morvain', zone: 'ruinen', look: 'tablet', at: 'turm',
    text: '„Dienstplan Schwellenwache, Tor Südost.\n\nFrühwache: Aldric. Tagwache: Sen. Ablösung bei Sonnenuntergang durch: Hüter Morvain persönlich.“\n\nDaneben, in eiliger Schrift: „Sen – ich gehe nur kurz zur Quelle. Die Kleine hatte eine schlechte Nacht. Halt die Stellung, ich löse dich heute Abend ab. Versprochen. M.“\n\nDie Tafel ist vierhundert Jahre alt. Der Eintrag für die Ablösung ist nie abgehakt worden.' }),
  D({ id: 'sieben_sitze', title: 'Sitzordnung des Ordens', cat: 'orden', zone: 'ruinen', look: 'tablet', at: 'platz',
    text: '„Ratssaal der Quellhüter, Ordnung der Sitze:\n\nI Erde – II Licht – III Feuer – IV Wasser – V Wind – VI Gleichgewicht.\n\nVII Dunkelheit: bleibt frei. Wird täglich abgestaubt. Bei Abstimmungen zählt der Sitz als anwesend und enthält sich.\n\nAnfragen, warum, sind an das Archiv zu richten.“\n\nJemand hat mit Kreide ergänzt: „Das Archiv antwortet: ‚Eintrag nicht vorhanden.‘ Der Stuhl ist trotzdem warm, wenn man sich draufsetzt. Ich hab’s probiert. – Rekrut S.“' }),
  D({ id: 'zeile1', title: 'Abgerissener Streifen', cat: 'krieg', zone: 'ruinen', look: 'scroll', at: 'kammer1',
    text: 'Ein schmaler Streifen Pergament, sauber mit dem Lineal abgetrennt, hinter einem losen Stein versteckt. Jemand wollte ihn nicht vernichten. Jemand wollte nur, dass er fehlt.\n\n„Der Hüter der Dunkelheit bittet ums Wort und fragt die Versammelten: Hat es …“\n\nHier endet der Streifen. Der untere Rand passt zu etwas, das fehlt.' }),
  D({ id: 'liora_feldbuch', title: 'Lioras Feldbuch, Seite 1', cat: 'leute', zone: 'ruinen', look: 'book', at: 'lager',
    text: '„GRABUNGSREGELN (für mich selbst):\n1. Nicht schreien. (Gestrichen. Unrealistisch.)\n2. Erst zeichnen, dann anfassen.\n3. Wenn es leuchtet: erst recht zeichnen.\n4. Wenn es sich bewegt: rennen, DANN zeichnen.\n5. Den Geist nicht nach seinem Todesdatum fragen. Er wird traurig, und dann wird es im ganzen Lager kalt.\n6. Die Wahrheit gehört allen. (Unterstrichen. Zweimal.)“\n\nAm Rand, mit anderer Tinte, viel später: „Regel 6: wirklich? Auch die, die jemandem wehtut?“' }),

  // ================================================================================== ARCHIV DER STILLE
  D({ id: 'protokoll', title: 'Protokoll der Nacht am Quellrand', cat: 'krieg', zone: 'archiv', look: 'book', at: 'key',
    text: '„Protokoll der Sieben. Ort: Quellrand. Wetter: Asche.\n\nOda (Tannreich) verteilt Brot. Kaspian (Tiefenglanz) lacht; wird zur Ordnung gerufen. Rhuna (Kharrad) erklärt das Verfahren. Nerys (Nebelfjord) schweigt. Alruna (Quellmark) wird um die entscheidende Stimme gebeten.\n\n███████████████████████████████████\n\nAlruna: ‚Tut es.‘ Rhuna führt den Schlag. Ergebnis: sieben Stücke, sechs gefasst.“\n\nDie geschwärzte Zeile ist nicht geschwärzt. Sie ist herausgeschnitten, in zwei Streifen, mit dem Lineal. Der Schnitt ist sehr sauber. Wer immer das tat, hat sich Mühe gegeben.' }),
  D({ id: 'berichtigung', title: 'Berichtigungsvermerk Nr. 1', cat: 'orden', zone: 'archiv', look: 'scroll', at: 'combat',
    text: '„An alle Schreibstuben der sieben Reiche. Betreff: Vereinheitlichung der Begriffe.\n\nAb sofort ist zu schreiben: ‚die Quelle‘ (nicht: ‚der Träumer‘, ‚der am Grund‘, oder der Eigenname). ‚Mana‘ (nicht: ‚sein Atem‘). ‚Siegel‘ (nicht: ‚Fassung‘, ‚Stück‘, ‚Teil von ihm‘).\n\nBegründung: Klarheit.\n\nÄltere Schriften sind einzusenden. Sie werden berichtigt und zurückgegeben.\n\ngez. C. Aldermoor“\n\nKein einziges der eingesandten Bücher trägt einen Rückgabestempel.' }),
  D({ id: 'archiv_anweisung', title: 'Dienstanweisung an den Archivar', cat: 'orden', zone: 'archiv', look: 'tablet', at: 'treasure',
    text: '„Du bist gebaut, um zu vergessen, damit Menschen es nicht müssen.\n\n§1 Was gestrichen ist, hat es nie gegeben.\n§2 Wer danach fragt, wird berichtigt.\n§3 Wer zum zweiten Mal fragt, wird archiviert.\n§4 Solltest du selbst je fragen, was du vergessen hast: Sieh in Schublade 7.\n\nSchublade 7 ist leer. Das ist beabsichtigt. – C. A.“\n\nIn den Boden der Schublade hat jemand mit einer Metallspitze geritzt, ungelenk, wie von einer Hand, die nicht zum Schreiben gebaut wurde: „ICH FRAGE TROTZDEM.“' }),

  // ================================================================================== SCHATTENREICH
  D({ id: 'ton3', title: 'Dritter Ton', cat: 'lied', zone: 'schatten', look: 'stone', at: 'westen',
    text: 'Das Spielzeug im Staub ist eine Spieluhr ohne Walze. Wenn du blinzelst, liegt sie woanders. Wenn du NICHT blinzelst, spielt sie.\n\nEinen Ton. Er ist traurig, aber nicht sehr – so, wie man traurig ist, wenn man ins Bett muss und noch nicht will.\n\nUnter der Spieluhr, in den Staub geschrieben und nie verweht: „Der dritte ist zum Bleiben. Nur noch ein bisschen.“' }),
  D({ id: 'spur_schaukel', title: 'Eine Schaukel ohne Baum', cat: 'morvain', zone: 'schatten', look: 'stone', at: 'mitte',
    text: 'Mitten im Nichts hängt eine Schaukel. Die Seile führen nach oben und hören irgendwo auf. Es gibt keinen Ast.\n\nDas Brett ist blank gesessen. Daneben im Staub: Abdrücke von kleinen Füßen, die abspringen, und eine einzelne, sehr große Mulde – als hätte etwas Riesiges sich hingelegt, um auf Augenhöhe zu sein.\n\nIn das Brett ist geritzt, mit Kinderhand: „Höher!“ Und darunter, in keiner Schrift, die du kennst, etwas, das du trotzdem lesen kannst: „Vorsichtig.“' }),
  D({ id: 'spur_bett', title: 'Ein Bett, sorgfältig gemacht', cat: 'morvain', zone: 'schatten', look: 'stone', at: 'osten',
    text: 'Ein Kinderbett aus Schatten, die Decke glattgezogen, das Kissen aufgeschüttelt. Es ist nicht ganz richtig – das Kopfende hat fünf Ecken, und die Decke ist aus etwas, das Wasser sein möchte.\n\nWer immer es gebaut hat, kannte Betten nur vom Hörensagen. Aber er hat sich Mühe gegeben. Und er macht es jeden Abend neu.\n\nAm Fußende liegt ein Zettel, in Maelis’ Schrift: „Danke. Die Decke ist nass, aber ich sag nichts. Du gibst dir solche Mühe.“' }),
  D({ id: 'alruna_kette', title: 'Eine Kette ohne Anhänger', cat: 'hueter', zone: 'schatten', look: 'stone', at: 'riss1',
    text: 'Eine dünne Kette aus angelaufenem Silber, ordentlich über einen Stein gelegt. Die Fassung ist leer.\n\nIn die Innenseite der Glieder ist etwas graviert, so klein, dass es sechzig Jahre gedauert haben muss:\n\n„Verzeih. Verzeih. Verzeih. Verzeih. Verzeih.“\n\nImmer dasselbe Wort, Glied um Glied. Auf dem allerletzten steht etwas anderes: „Vael sagt, du hörst zu. Ich hoffe, er hat recht. A.“' }),

  // ================================================================================== THRON DER LEERE
  D({ id: 'krone', title: 'Die Krone auf dem leeren Thron', cat: 'morvain', zone: 'thron', look: 'stone', at: 'treasure',
    text: 'Eine Krone aus nichts. Sie wiegt genau so viel wie ein schlechtes Gewissen.\n\nInnen, wo sie die Stirn berührt hat, steht in winzigen Buchstaben eine Liste:\n\n„Was ich wollte: dass sie den Winter übersteht.\nWas ich bekam: vierhundert Winter.\nWas ich dafür nahm: alles.\nWas der Alte an der Tür sagte, als er mich durchließ: ‚Ich hätte es auch getan. Darum sollte ich Euch aufhalten. Ich bringe es nicht fertig.‘“' }),
  D({ id: 'aldric', title: 'Dienstbuch des Herrn Aldric', cat: 'morvain', zone: 'thron', look: 'book', at: 'combat',
    text: '„Frühwache. Keine Vorkommnisse.\nFrühwache. Die Kleine hat mir eine Blume gebracht. Habe mich verbeugt. Dienstvorschrift sieht keine Blumen vor; habe sie trotzdem angenommen.\nFrühwache. Hüter Morvain ist nicht zurück. Sen hält am Tor. Ich halte hier.\nFrühwache. Ich erinnere mich nicht mehr an mein Gesicht. An die Blume schon.\nFrühwache.\nFrühwache.\nFrühwache. Jemand kommt. Wenn es die Ablösung ist: Ich habe mich immer verbeugt. Bitte ins Buch eintragen.“' }),

  // ================================================================================== VAELS WACHT
  D({ id: 'vael_striche', title: 'Tausend Jahre in Strichen', cat: 'traeumer', zone: 'wacht', look: 'tablet', at: 'combat',
    text: 'Eine Wand voller Striche, in Fünferbündeln. Sie reichen weiter, als das Licht trägt.\n\nAm Anfang sind sie tief und gerade. Nach etwa hundert Jahren werden sie flacher. Bei dreihundert steht daneben: „Aufgehört zu zählen. Wieder angefangen. Man braucht etwas zu tun.“\n\nBei sechshundert: „Heute hat es im Schlaf gelacht. Ich weiß nicht, worüber. Ich habe mitgelacht, aus Höflichkeit.“\n\nDer letzte Strich ist frisch. Daneben: „Es kommt jemand. Ich habe den Stuhl abgestaubt.“' }),
  D({ id: 'vael_gespraeche', title: 'Gesprächsprotokoll, einseitig', cat: 'traeumer', zone: 'wacht', look: 'book', at: 'treasure',
    text: '„Jahr 12. Habe ihm vom Wetter erzählt. Keine Antwort.\nJahr 80. Habe ihm von den Dämmerlanden erzählt. Keine Antwort. Das Wasser war danach wärmer.\nJahr 204. Habe gefragt, ob es Schmerzen hat. Lange nichts. Dann ein Ton. Tief. Ich nehme das als Ja.\nJahr 611. Ein Mann kam mit einem sterbenden Kind auf dem Arm. Es hat ZUERST gesprochen. Zum ersten Mal. Es sagte: ‚Lass sie durch.‘ Ich habe sie durchgelassen.\nJahr 612. Es summt jetzt. Vier Töne. Das Kind hat sie ihm beigebracht. Ich bin, glaube ich, eifersüchtig. Mit tausend Jahren. Lächerlich.“' }),

  // ================================================================================== QUELLGRUND
  D({ id: 'ton4', title: 'Vierter Ton', cat: 'lied', zone: 'quellgrund', look: 'stone', at: 'becken',
    text: 'Das Wasser in diesem Becken summt. Nicht in Fis.\n\nEs sind vier Töne, immer dieselben, immer in derselben Reihenfolge – und der letzte ist der schönste: Er löst die anderen auf, wie wenn jemand am Ende doch die Augen zumacht.\n\nNiemand hat dem Wasser dieses Lied beigebracht. Doch. Eine. Sie war sieben Jahre alt und sehr krank, und sie hat es gesungen, damit etwas sehr Großes keine Angst mehr hat.\n\nIn den Beckenrand ist gekratzt: „Der vierte ist zum Einschlafen. Du zuerst. Ich pass auf. – M.“' }),
  D({ id: 'grund_inschrift', title: 'Inschrift am Grund des Brunnens', cat: 'krieg', zone: 'quellgrund', look: 'tablet', at: 'auf',
    text: 'Sieben Handschriften, in den nassen Fels gemeißelt. Tausend Jahre Tropfwasser haben sie nicht gelöscht:\n\n„Hier haben wir es getan. – R.“\n„Es war nötig. – C.“\n„Es war schön. Es war schrecklich. – K.“\n„Ich habe Brot mitgebracht. – O.“\n„Ich habe es gehört. – N.“\n„Ich habe es gesagt. – A.“\n\nDie siebte Zeile steht tiefer, fast am Boden, wo einer sitzt: „Ich bin noch da. – V.“' }),
  D({ id: 'erster_eimer', title: 'Der erste Eimer', cat: 'krieg', zone: 'quellgrund', look: 'stone', at: 'grotte',
    text: 'Ein Holzeimer, versteinert, die Reifen aus grünem Kupfer. Er steht hier seit vor den Reichen, vor dem Krieg, vor allem.\n\nJemand hat ihn einmal hinuntergelassen, gefüllt und wieder hinaufgezogen. Und dann – das sieht man an den Kerben im Rand – wieder. Und wieder. Hunderte Male. Tausende.\n\nNiemand hat je etwas zurück in den Eimer gelegt.\n\nIm Boden des Eimers, von unten nach oben gewachsen wie ein Tropfstein: ein einzelner, vollkommen runder Kristall. Als hätte der Brunnen am Ende selbst etwas hineingetan, weil es sonst keiner tat.' }),
  D({ id: 'pim_zettel', title: 'Pims Preisliste für den Weltuntergang', cat: 'leute', zone: 'quellgrund', look: 'scroll', at: 'lager',
    text: '„SONDERANGEBOT QUELLGRUND (Pim war zuerst hier!)\n\nHeiltrank: wie oben. Pim ist kein Unmensch.\nSeil, 20 Schritt: ausverkauft. Pim hat es selbst gebraucht.\nAuskunft, wie Pim hier heruntergekommen ist: unverkäuflich.\nAuskunft, warum Pim immer zuerst da ist: …\n\n(Die Zeile ist durchgestrichen. Darunter, kleiner:)\n\nWeil Pim einmal zuerst DRAUSSEN war. Seitdem geht Pim lieber zuerst rein.“' }),

  // ================================================================================== HERZ DER QUELLE
  D({ id: 'herz_stimmen', title: 'Sieben Stimmen im Stein', cat: 'traeumer', zone: 'herz', look: 'tablet', at: 'combat',
    text: 'Die Wand ist glatt wie ein Spiegel. Wenn du die Hand auflegst, hörst du sie – sieben Stimmen, sehr fern, immer dieselben Sätze, wie etwas, das jemand tausend Jahre lang im Schlaf wiederholt:\n\n„Man fragt den Acker nicht.“ – „Sieh hin.“ – „Einer musste.“ – „Ich habe so getan, als verstünde ich es nicht.“ – „Wird nicht protokolliert.“ – „Tut es.“\n\nUnd die siebte, leiser als alle: „Hat es jemand gefragt?“\n\nEs träumt nicht vom Schmerz. Es träumt von den Sätzen.' }),
  D({ id: 'herz_frage', title: 'Die achte Farbe', cat: 'traeumer', zone: 'herz', look: 'stone', at: 'treasure',
    text: 'Ein Kristall, der in keiner Farbe leuchtet, die du benennen könntest. Kaspian Hellglas hat sie einmal gesehen und nie wieder etwas anderes.\n\nWenn du lange genug hinsiehst, verstehst du, was sie ist. Es ist die Farbe von jemandem, der etwas verschenkt.\n\nSo hat es angefangen: Niemand hat der Welt das Mana abgerungen. Es wurde ihr gegeben. Atemzug für Atemzug, freiwillig, von jemandem, der fand, dass es schön sei, wenn oben etwas wächst.\n\nDann kamen die Eimer.' }),
];
export const DOCS: Record<string, LoreDoc> = Object.fromEntries(LORE_DOCS.map(d => [d.id, d]));

/** Gefundene / insgesamt zählende Dokumente einer Kategorie (bedingte Dokumente zählen nur, wenn gefunden). */
export function loreProgress(c: CharData, cat?: LoreCat): { found: number; total: number } {
  let found = 0, total = 0;
  for (const d of LORE_DOCS) {
    if (cat && d.cat !== cat) continue;
    const has = !!c.flags[`l:${d.id}`];
    if (has) found++;
    if (has || !d.when) total++;
  }
  return { found, total };
}
