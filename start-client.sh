#!/usr/bin/env bash
# Eternal Mana – Spiel im Browser öffnen.
#   ./start-client.sh                    → Server auf diesem Rechner
#   ./start-client.sh 100.101.102.103    → Server eines Freundes (Tailscale-IP oder MagicDNS-Name)
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then node scripts/open.mjs "$1"; else
  URL="${1:-localhost}"; case "$URL" in http*) ;; *) URL="http://$URL:7777";; esac
  (xdg-open "$URL" || open "$URL") 2>/dev/null || echo "Bitte im Browser öffnen: $URL"
fi
