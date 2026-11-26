// Browser-Durchlauf (0.9), Teil 2: Die Unteren Archive (Hinterhalt, Tintenfass – und die Spur zur geheimen Expedition, die
// vorher nicht in der Liste stehen darf), Der Hof der Hohlen Krone (Einsturz, wanderndes Licht) und Die Gestrichenen Seiten
// (Finsternis, der Erste Schreiber). Ablauf und Plan: tests/e2e/lib/plan.mjs; Teil 1: tests/e2e/expeditionen.mjs.
// Bilder: tests/e2e/out/expeditionen-spaet-*.png
//   EM_DEV=1 EM_PORT=7795 EM_DATA=/tmp/em-e2e npm start        (anderes Fenster)
//   EM_URL=http://localhost:7795 node tests/e2e/expeditionen-spaet.mjs
import { playExpeditions } from './lib/plan.mjs';

process.exit(await playExpeditions('expeditionen-spaet', ['exp_ruinen', 'exp_schatten', 'exp_gestrichen']));
