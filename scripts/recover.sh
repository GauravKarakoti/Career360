#!/usr/bin/env bash
# Automated recovery: bring a Career360 deployment back to a known-good state.
# Usage: scripts/recover.sh [--fresh]
#   (default)  re-apply pending migrations and restart-safe checks
#   --fresh    ALSO reseed demo content (idempotent upserts; user data untouched)
set -euo pipefail
cd "$(dirname "$0")/.."

echo "[recover] 1/4 database reachable…"
node scripts/database.mjs ping 2>/dev/null || {
  echo "[recover] database unreachable. Start PostgreSQL (mlai-service start postgres) and set DATABASE_URL." >&2
  exit 1;
}

echo "[recover] 2/4 applying pending migrations…"
npx prisma migrate deploy

if [[ "${1:-}" == "--fresh" ]]; then
  echo "[recover] 3/4 reseeding demo content…"
  node prisma/seed.mjs
else
  echo "[recover] 3/4 skipping reseed (use --fresh to reseed demo content)"
fi

echo "[recover] 4/4 verification…"
npm run typecheck
npx next build --experimental-build-mode compile >/dev/null 2>&1 || npx next build >/dev/null 2>&1

echo "[recover] done. Rollback for the current phase: prisma migrate resolve --rolled-back 20261114100000_phase4_organizations && npx prisma migrate deploy, then git revert the phase-4 commit."
