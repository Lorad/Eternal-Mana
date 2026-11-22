#!/usr/bin/env sh
# Eternal Mana - Launcher: sucht Aktualisierungen, zeigt Neuigkeiten, startet Spiel und Server.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js fehlt. Bitte Node.js 22.13 oder neuer installieren: https://nodejs.org/"
  exit 1
fi
nohup node launcher/launcher.mjs >/dev/null 2>&1 &
