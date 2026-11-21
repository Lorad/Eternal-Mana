#!/usr/bin/env bash
# Eternal Mana – Server starten (Linux/macOS). Beenden: Strg+C, "stop" eingeben oder ./stop-server.sh
set -e
cd "$(dirname "$0")"
command -v node >/dev/null 2>&1 || { echo "Node.js fehlt. Bitte Node.js 22.13+ installieren: https://nodejs.org/"; exit 1; }
node scripts/ensure-build.mjs
exec npm start --silent
