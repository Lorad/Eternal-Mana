/**
 * Gegenstände der Expeditionen (0.9): je Endboss eine Expeditionstrophäe (erster Abschluss je Schwierigkeitsgrad) und je
 * Expedition ein seltener Fund, den es nur dort gibt. Ohne Laufzeit-Abhängigkeit zu items.ts – items.ts trägt `EXP_ITEMS` ein.
 * Icons: vorhandene (Boss-Trophäen des Hofs `tro_b_<boss>`, Bosskerne `mat_core_<boss>`).
 */
import type { ItemBase } from './items';

export const expTrophy = (boss: string) => 'xtro_' + boss;
const TRO: [string, string, string][] = [
  ['dornenmutter', 'Wurzelkrone der Dornenmutter', 'Aus der Tiefe mitgebracht. Riecht nach nassem Wald und schlechten Entscheidungen.'],
  ['kristallkoloss', 'Prismenherz des Kolosses', 'Fängt Licht und gibt es nur widerwillig zurück.'],
  ['ignarok', 'Gussform des Schlackenwurms', 'Noch warm. Borin will wissen, was man darin gießen kann. Lieber nicht.'],
  ['ysolde', 'Spule aus gewebtem Eis', 'Der Faden darauf hört nie auf. Man hat es versucht.'],
  ['archivar', 'Stempel „Erledigt“', 'Der Archivar hat ihn nie benutzt. Jetzt schon.'],
  ['hohlkoenig', 'Krone ohne Kopf', 'Leicht. Viel zu leicht für das, was sie gekostet hat.'],
  // 0.11: Endspiel-Expeditionen
  ['vael', 'Dienstplan der Langen Wacht', 'Tausend Zeilen, ein Name. In der letzten steht jetzt deiner. Vael hat ihn sehr ordentlich geschrieben.'],
  ['aetherion', 'Atemzug in Glas', 'Ein einziger Atemzug des Träumers, eingefangen. Das Glas beschlägt von innen, wenn jemand singt.'],
];
const RARE: [string, string, string, string][] = [
  ['xr_wurzelherz', 'Pochendes Wurzelherz', 'mat_core_dornenmutter', 'Schlägt langsam, etwa einmal pro Jahreszeit. Borin bezahlt gut dafür, Fenwick noch besser.'],
  ['xr_prismenstaub', 'Singender Prismenstaub', 'mat_core_kristallkoloss', 'Rieselt in Terzen.'],
  ['xr_urglut', 'Urglut', 'mat_core_ignarok', 'Die erste Flamme der Aschenschmiede. Sie will nicht ausgehen, und man nimmt es ihr nicht übel.'],
  ['xr_stillfaden', 'Stillfaden', 'mat_core_ysolde', 'Ein Faden, der die Zeit ein wenig festhält.'],
  ['xr_tintenstein', 'Versteinerte Tinte', 'mat_core_archivar', 'Ein Wort, das nie geschrieben wurde. Man kann es fühlen.'],
  ['xr_kronensplitter', 'Kronensplitter', 'mat_core_hohlkoenig', 'Ein Zacken, der in die falsche Richtung zeigt.'],
  // 0.11: Endspiel-Expeditionen
  ['xr_laternenglut', 'Laternenglut', 'elx_laterne', 'Ein Funke aus Vaels Laterne. Er ist tausend Jahre lang nicht ausgegangen und hat nicht vor, jetzt damit anzufangen.'],
  ['xr_herzton', 'Herzton', 'seal_water', 'Ein Ton aus dem Wiegenlied, so rein, dass er sich anfassen lässt. Er summt, wenn man ihn ans Ohr hält – und hört vor dem fünften auf.'],
];
export const EXP_ITEMS: ItemBase[] = [
  ...TRO.map(([boss, name, desc]): ItemBase => ({ id: expTrophy(boss), name: 'Expeditionstrophäe: ' + name, kind: 'material', icon: 'tro_b_' + boss, stack: true, price: 250, desc })),
  ...RARE.map(([id, name, icon, desc]): ItemBase => ({ id, name, kind: 'material', icon, stack: true, price: 400, desc: desc + ' Nur in Expeditionen zu finden.' })),
];
