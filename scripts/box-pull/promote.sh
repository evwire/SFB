#!/usr/bin/env bash
# Copy an accepted snapshot over committed data/ (four layer files + latest-changes.json).
# Does not commit or push. Usage: bash scripts/box-pull/promote.sh data/snapshots/YYYY-MM-DD
set -euo pipefail
cd "$(dirname "$0")/../.."
SNAP="${1:?snapshot dir}"
[[ -f "$SNAP/pull-summary.json" ]] && grep -q '"status": "OK"' "$SNAP/pull-summary.json" || { echo "Refusing: $SNAP has no OK pull-summary.json"; exit 1; }
for f in sites.tesla-customer-owned.json sites.tesla-customer-owned-europe.json sites.tesla-upcoming-customer-owned.json sites.tesla-upcoming-customer-owned-europe.json latest-changes.json; do
  cp "$SNAP/$f" "data/$f"
done
echo "Promoted $SNAP into data/ (not committed)."
