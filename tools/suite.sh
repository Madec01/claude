#!/bin/bash
# Lance la suite de tests, en deux vitesses (règle de CLAUDE.md, journal 107).
#
#   tools/suite.sh court     ~3 min  : les quatre tests Node (règles, événements, nuage, reprise)
#                                      et gate.js comme test de fumée dans Chromium
#   tools/suite.sh complet  ~25 min  : la suite courte puis les neuf autres tests navigateur
#
# Les tests navigateur ont besoin d'un serveur statique sur le port 8765 ; le script le lance
# s'il n'y est pas et l'éteint en sortant. Le journal complet va dans $LOG (défaut : /tmp/suite.log).
set -u
cd "$(dirname "$0")/.."
MODE="${1:-court}"
LOG="${LOG:-/tmp/suite.log}"
: > "$LOG"

case "$MODE" in
  court)   NAV="gate" ;;
  complet) NAV="gate feel calm mobile fauna decouverte resume pepin finale autoplay" ;;
  *) echo "usage : tools/suite.sh court|complet" >&2; exit 2 ;;
esac

SERVEUR=""
if ! curl -s -o /dev/null "http://127.0.0.1:8765/index.html"; then
  python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 &
  SERVEUR=$!
  sleep 1
fi
trap '[ -n "$SERVEUR" ] && kill "$SERVEUR" 2>/dev/null' EXIT

RATES=0
lance() {
  local t="$1"
  echo "=== $t ===" | tee -a "$LOG"
  local debut=$SECONDS
  if node "tests/$t" >> "$LOG" 2>&1; then
    echo "    ok  ($((SECONDS - debut)) s)"
  else
    echo "    RATÉ ($((SECONDS - debut)) s) — voir $LOG"
    RATES=$((RATES + 1))
  fi
}

for t in rules events cloud run; do lance "$t.test.js"; done
for t in $NAV; do lance "$t.js"; done

if [ "$RATES" -eq 0 ]; then echo "Suite $MODE : tout est vert."; else echo "Suite $MODE : $RATES test(s) raté(s)."; fi
exit "$RATES"
