#!/bin/bash
# Lance la suite de tests, en deux vitesses (règle de CLAUDE.md, journal 107).
#
#   tools/suite.sh court     ~2 min  : les quatre tests Node (règles, événements, nuage, reprise)
#                                      et gate.js comme test de fumée dans Chromium
#   tools/suite.sh complet  ~8 min   : la suite courte puis les neuf autres tests navigateur
#
# Les tests Node se suivent ; les tests navigateur tournent par trois (PARALLELE), chacun dans son Chromium,
# les plus longs d'abord. Ils ont besoin d'un serveur statique sur le port 8765 ; le script le lance s'il n'y
# est pas et l'éteint en sortant. Le journal complet va dans $LOG (défaut : /tmp/suite.log), un test après l'autre.
set -u
cd "$(dirname "$0")/.."
MODE="${1:-court}"
LOG="${LOG:-/tmp/suite.log}"
: > "$LOG"

PARALLELE="${PARALLELE:-3}"
case "$MODE" in
  court)   NAV="gate" ;;
  complet) NAV="autoplay mobile calm gate finale feel pepin decouverte resume fauna" ;;   # du plus long au plus court : le lot se remplit mieux
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

# les tests navigateur : chacun écrit son propre journal, recopié dans $LOG une fois tous finis
lance_fond() {
  local t="$1" debut=$SECONDS
  if node "tests/$t" > "$LOG.$t" 2>&1; then echo "=== $t ===  ok  ($((SECONDS - debut)) s)"
  else echo "=== $t ===  RATÉ ($((SECONDS - debut)) s) — voir $LOG"; touch "$LOG.$t.rate"; fi
}
for t in $NAV; do
  while [ "$(jobs -rp | wc -l)" -ge "$PARALLELE" ]; do sleep 1; done
  lance_fond "$t.js" &
done
wait
for t in $NAV; do
  { echo "=== $t.js ==="; cat "$LOG.$t.js"; } >> "$LOG"; rm -f "$LOG.$t.js"
  if [ -e "$LOG.$t.js.rate" ]; then RATES=$((RATES + 1)); rm -f "$LOG.$t.js.rate"; fi
done

if [ "$RATES" -eq 0 ]; then echo "Suite $MODE : tout est vert."; else echo "Suite $MODE : $RATES test(s) raté(s)."; fi
exit "$RATES"
