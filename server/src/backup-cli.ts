// Manuelles Backup der Spielstände:  npm run backup
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Db } from './db';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let dataDir = 'data';
try { dataDir = JSON.parse(fs.readFileSync(path.join(root, 'config/server.json'), 'utf8')).dataDir ?? 'data'; } catch { /* Standard */ }
const db = new Db(path.resolve(root, process.env.EM_DATA ?? dataDir));
console.log('Backup geschrieben:', db.backup('manuell'));
db.close();
