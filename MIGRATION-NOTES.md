# Phase 2 migration notes — Authenticated multilingual intelligence

## What moved
Guest-only cookie sessions (Phase 1) now coexist with recoverable accounts.
Additive migration `20261114083716_phase2_accounts_connections`: new `Account`
and `ConnectionRequest` tables; new nullable columns `Workspace.accountId`,
`Opportunity.ownerId`, `Opportunity.sourceUrl`, `Opportunity.evidence`;
new columns `Profile.roles`, `Profile.visibility`. No column was dropped or
retyped, so Phase 1 data is untouched and the change is a one-way additive
deploy with no backfill needed.

## Behaviour preserved exactly
- Guest workspaces still work without an account (cookie `o360_workspace`).
- Match scoring (`src/lib/matching.ts`) is unchanged and rule-based.
- Demo listings stay labelled "Demo · fictional"; guest listings "Unverified".
- First-visit load order (workspace session before opportunities fetch).

## Phase boundaries and order
1. Schema migration (additive) — app still works as guests. Done.
2. Accounts lib + auth API routes. Done.
3. AI provider with structured outputs + graceful degradation. Done.
4. Ingestion with evidence + confirm-before-publish. Done.
5. Connections with privacy masking. Done.
6. UI (auth panel, Hindi toggle, draft review, connections panel). Done.

## Cutover
No big-bang switch: guests and accounts run on the same tables; signing in
adopts the current guest workspace (`src/lib/auth.ts` `adoptWorkspace`) and
migrates its profile, saved rows, listings and connection requests to the
account, deleting only superseded guest workspaces of the same account.

## Rollback
`git revert` the Phase 2 commit(s), then:
`npx prisma migrate resolve --rolled-back 20261114083716_phase2_accounts_connections`
and (only if the columns must go too) drop them in a new migration. Because
everything added is nullable or a new table, reverting the code alone is safe.

## Phase 3 — Collaboration and source-backed impact (2026-11-14)
Additive migration `20261114084803_phase3_collaboration_metrics`:
`Message` (threads on accepted connections), `Tracker` (applications/leads,
stages identified→applied→in conversation→committed→closed), `ActivityEvent`
(append-only activity log), plus a generated `tsvector` column with GIN index
on `Opportunity` for ranked full-text search. Note: the generated column uses
immutable expressions only (`array_to_string` on arrays is not immutable, so
requirements/offers are matched with `unnest ... ILIKE` at query time).
Rollback: `git revert` + `npx prisma migrate resolve --rolled-back
20261114084803_phase3_collaboration_metrics`.

## Known gaps / next phase
- Real LLM inference is unreachable from this sandbox (egress proxy returns a
  canned `OK`); code paths are stub-detecting and degrade to manual publish.
- Recovery codes are the only account-recovery channel (no email provider).
- Embeddings are wired but not yet used for ranking; matching stays rule-based
  by design until Phase 3.
