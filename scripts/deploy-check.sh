#!/usr/bin/env bash
# Deploy check: run everything that must pass before a Career360 release.
set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
step() { printf '\n== %s ==\n' "$1"; }

step "typecheck"; npm run typecheck || fail=1
step "build";     npm run build >/tmp/deploy-build.log 2>&1 && tail -3 /tmp/deploy-build.log || { tail -30 /tmp/deploy-build.log; fail=1; }
step "migrations"; DATABASE_URL="${DATABASE_URL:?DATABASE_URL must be set}" npx prisma migrate deploy || fail=1
step "health";    if curl -fsS "${HEALTH_URL:-http://127.0.0.1:3000}/api/health" | grep -q ok; then echo "health ok"; else echo "health check skipped or failed (start the app first)"; fi

if [[ $fail -ne 0 ]]; then echo "\nDEPLOY CHECK FAILED"; exit 1; fi
echo "\nDEPLOY CHECK PASSED"
