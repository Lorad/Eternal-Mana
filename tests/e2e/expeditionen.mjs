// Browser-Durchlauf (0.9), Teil 1: Die Singende Tiefe, Die Gießerei der Ersten, Der Webstuhl aus Eis – je durch das Portal
// der Quellwarte hinein, Mini-Boss, Ereignis (Finsternis, Einsturz, Flut), Abschnitte, Schatzkammer, die Signatur des Endbosses
// wirklich auslösen (Prismensäule, Kühlkette, Stillstand), Phasen 2 und 3, Abschluss, Rückkehr in die Warte.
// Teil 2 (Archive, Hof, die geheime Expedition): tests/e2e/expeditionen-spaet.mjs. Ablauf und Plan: tests/e2e/lib/plan.mjs.
// Die Wurzeltiefe spielt tests/e2e/expedition.mjs, die höheren Schwierigkeitsgrade tests/e2e/expedition-grade.mjs.
// Bilder: tests/e2e/out/expeditionen-*.png
//   EM_DEV=1 EM_PORT=7795 EM_DATA=/tmp/em-e2e npm start        (anderes Fenster)
//   EM_URL=http://localhost:7795 node tests/e2e/expeditionen.mjs [exp_glut …]   (einzelne Expeditionen)
import { playExpeditions } from './lib/plan.mjs';

process.exit(await playExpeditions('expeditionen', ['exp_kristall', 'exp_glut', 'exp_frost']));
