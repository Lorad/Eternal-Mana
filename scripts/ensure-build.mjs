// Baut den Client, falls er fehlt oder älter ist als der Quellcode. Wird von den Startskripten aufgerufen.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [maj, min] = process.versions.node.split('.').map(Number);
if (maj < 22 || (maj === 22 && min < 13)) {
  console.error(`\nEternal Mana benötigt Node.js 22.13 oder neuer (gefunden: ${process.versions.node}).\nDownload: https://nodejs.org/\n`);
  process.exit(1);
}
function newest(dir) {
  let t = 0;
  if (!fs.existsSync(dir)) return 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    t = Math.max(t, e.isDirectory() ? newest(p) : fs.statSync(p).mtimeMs);
  }
  return t;
}
const run = cmd => execSync(cmd, { cwd: root, stdio: 'inherit' });
const pkgTime = fs.statSync(path.join(root, 'package.json')).mtimeMs;
const nm = path.join(root, 'node_modules', '.package-lock.json');
if (!fs.existsSync(nm) || fs.statSync(nm).mtimeMs < pkgTime) {
  console.log('Installiere Abhängigkeiten (einmalig, kann ein paar Minuten dauern) …');
  run('npm install --no-audit --no-fund');
}
const built = path.join(root, 'client/dist/index.html');
const src = Math.max(newest(path.join(root, 'client/src')), newest(path.join(root, 'shared/src')), fs.statSync(path.join(root, 'client/index.html')).mtimeMs);
if (!fs.existsSync(built) || fs.statSync(built).mtimeMs < src) {
  console.log('Baue den Spiel-Client …');
  run('npm run build');
}
