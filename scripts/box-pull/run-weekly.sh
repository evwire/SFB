#!/usr/bin/env bash
# Weekly SfB Tesla Customer Owned watch (see data/WATCH.md and scripts/box-pull/README.md).
#
#   bash scripts/box-pull/run-weekly.sh            # pull + diff into data/snapshots/<date>/, data/ untouched
#   bash scripts/box-pull/run-weekly.sh --promote  # also copy the snapshot over committed data/ (no git commit)
#
# Exit: 0 ok, 3 BLOCKED (Akamai; nothing promoted), 1 error.
# Final line of stdout is the path of weekly-summary.json.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO"
PROMOTE=0; [[ "${1:-}" == "--promote" ]] && PROMOTE=1
DATE="$(TZ=Europe/Tallinn date +%F)"
SNAP="data/snapshots/$DATE"
mkdir -p "$SNAP"
START=$(date +%s)

if [[ "${SFB_SKIP_GIT_PULL:-0}" != "1" ]]; then
  git pull --ff-only origin main
fi
[[ -d node_modules ]] || npm ci --no-audit --no-fund   # diff script deps
# Pinned, newer Playwright for the pull (old Chromium is denied by Akamai)
[[ -d scripts/box-pull/node_modules/playwright ]] || npm --prefix scripts/box-pull ci --no-audit --no-fund
export SFB_PLAYWRIGHT="${SFB_PLAYWRIGHT:-$REPO/scripts/box-pull/node_modules/playwright/index.mjs}"
node -e "import(process.env.SFB_PLAYWRIGHT).then(p=>p.chromium.executablePath()).then(e=>require('fs').existsSync(e)||process.exit(1))" \
  || (cd scripts/box-pull && npx playwright install chromium)

ENGINE="${SFB_ENGINE:-chromium}"
RUN=(node scripts/box-pull/pull-open.mjs --out "$SNAP" --engine "$ENGINE")
if [[ "$(uname)" == "Linux" && -z "${DISPLAY:-}" ]]; then RUN=(xvfb-run -a "${RUN[@]}"); fi

set +e
"${RUN[@]}"
RC=$?
set -e
if [[ $RC -eq 3 ]]; then
  echo "BLOCKED: Tesla/Akamai denied the pull. Nothing diffed or promoted. See $SNAP/pull-summary.json"
  echo "$REPO/$SNAP/pull-summary.json"
  exit 3
elif [[ $RC -ne 0 ]]; then
  echo "ERROR: pull failed (exit $RC). See $SNAP/pull.log"; exit 1
fi

node scripts/diff-sfb-sites.mjs --baseline data --fresh "$SNAP" --out "$SNAP/CHANGELOG.md" --changes-out "$SNAP/latest-changes.json"
node scripts/diff-sfb-sites.mjs --baseline data --fresh "$SNAP" --json > "$SNAP/diff.json"
node scripts/box-pull/summarize.mjs "$SNAP" "$(( $(date +%s) - START ))"

if [[ $PROMOTE -eq 1 ]]; then
  bash scripts/box-pull/promote.sh "$SNAP"
fi
echo "$REPO/$SNAP/weekly-summary.json"
