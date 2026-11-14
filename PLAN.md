# Career360 — implementation plan

## Goal and users
Build the selected Opportunity Workspace for founders, candidates and other stakeholders. Working means a visitor can save a private structured Opportunity DNA profile, discover database-backed opportunities, inspect transparent mutual-fit reasoning and source limitations, and save an opportunity across reloads.

## Scope
This run implements Phase 1 only: the real data-to-action foundation, not the entire hackathon MVP. Include all stakeholder types in the DNA editor, a responsive dashboard, editable DNA, opportunity creation, search/category filters, deterministic mutual matching, gap inspection, source transparency and saved activity. Use explicitly labeled fictional demo listings from a seed script.

Out of scope in Phase 1: account sign-in, public profiles, multi-user connection delivery, generated AI answers, resume extraction, semantic embeddings, Hindi/Hinglish understanding, automatic source verification, market forecasts, chat, uploads and outcome analytics. Do not imply these are active.

## Design brief
- For: founders, candidates and collaborators looking for complementary capabilities.
- Job: discover a match, understand both sides and save a next action.
- Mood: precise, calm, optimistic.
- Direction: selected Opportunity Workspace; #F5F7FA background, #202B3B text, #2455D6 accent, #10213A headings and 10px cards.
- Memorable element: a connected DNA diagram pairing offers and needs, beside an evidence-led opportunity list.

## Architecture
- Next.js App Router, React and TypeScript: one application for the UI and REST route handlers.
- Tailwind CSS with shared CSS tokens: selected palette, system sans typography, accessible focus and responsive layout. Lucide icons. Defer chart/motion libraries until real analytics need them.
- PostgreSQL and Prisma 6: relational persistence, migrations and parameterized access. Use the workspace's local PostgreSQL for preview; production requires DATABASE_URL in Vault.
- Data model: Workspace (hashed anonymous session, expiry), Profile (one per workspace; identity, role, industry, location, description, stage, interests, constraints, goals, privacy), Capability and Need (owned profile terms), Opportunity (organization, title, category, location, description, requirements, offers, deadline, publication date, source URL, demo flag), SavedOpportunity (unique workspace/opportunity).
- Authentication boundary: Phase 1 is a private guest workspace, not an account. Generate a cryptographically random, HTTP-only, same-site session cookie; store its hash, enforce expiry and scope all profile/save mutations to it. No public contact data or sharing. Cookie loss loses access; account recovery comes in Phase 2.
- API: GET /api/workspace initializes/reads the workspace; PUT /api/profile saves DNA atomically; GET/POST /api/opportunities lists/creates listings; POST /api/saved toggles saved state; DELETE /api/workspace deletes private workspace data.
- Server owns validation, ownership, token handling, matching, expiry labels, and integrity. Client owns form state, navigation, filtering and display. Sources are not fetched in this phase, eliminating server-side URL fetch risk.
- Matching: case-normalized exact term overlap, two-sided weights by stakeholder, plus industry/location. Show score as a heuristic fit index, not a success probability. Explicitly show unsupported constraints as not assessed.
- TruthLens foundation: display submitted source URL, dates, requirements, demo/unverified labels and expiry; never claim automated verification. No invented evidence.
- Hosting: managed port-3000 preview; standard Next.js build/start for deployment. Hosted Postgres required outside this workspace. No LLM secrets required for Phase 1.

## Risks and assumptions
- No existing app or DATABASE_URL is configured. Provision local PostgreSQL; development-only local connection configuration must never be used in production.
- Seed records are fictional examples, not live listings; every card and detail view must say so. Demo profile fields are visibly labeled until the user saves their own DNA.
- New user-submitted listings are private to the creator in Phase 1; shared catalogs require moderation and account authentication later.
- English is the Phase 1 UI language; all storage and forms support Unicode. Full multilingual interactions require Phase 2.
- Exact matching is explainable but not semantic or AI-powered. Unknown budget, availability and eligibility are not silently treated as satisfied.
- Guest sessions are not an acceptable replacement for production identity; no cross-user requests or sensitive uploads in this slice.

## Phase 1: Opportunity Workspace foundation
Deliver a thin vertical slice from PostgreSQL through APIs to usable discovery and saved actions.
- [x] Create schema, migration and explicitly labeled demo seed; protect private data with guest sessions and validated APIs.
- [x] Build responsive workspace with DNA create/edit, offer/need visualization and persisted profile data.
- [x] Build searchable opportunity list, private listing creation, deterministic mutual match and evidence/gap details.
- [x] Persist saved activity, support guest-data deletion, and handle loading, empty, error and success states.
- [x] Run production build, live API isolation/persistence checks and desktop/mobile/tablet browser scenarios.
Acceptance: save a startup DNA through the UI, reload to recover it from PostgreSQL, inspect ranked demo matches and their limitations, save a match, and create a private listing that remains after reload. Candidate capability gaps can be inspected using the same model.

## Phase 2: Authenticated multilingual intelligence
Connect identity, confirmed AI extraction and bilingual intelligence without overstating evidence.
- [x] Add recoverable authenticated accounts, multi-role selection and consent-based profile visibility.
- [x] Integrate configurable LLM/embedding providers with structured outputs, confirmation and English/Hindi/Hinglish interactions.
- [x] Add source ingestion, evidence comparisons and mandatory/preferred gap bridges with real learning sources.
- [x] Implement recipient-owned accept/decline connection requests and activity transitions.
Acceptance: a startup and candidate can use the specified multilingual MVP flows against real or clearly labeled demo opportunities, with source evidence and real connection recipients.

## Phase 3: Collaboration and source-backed impact
Expand actions into measurable collaboration and trustworthy market intelligence.
- [ ] Add messaging, collaboration workspaces, application and lead trackers.
- [ ] Add authorized ingestion jobs, re-verification, search indexing and monitoring.
- [ ] Add source/time-bounded Market Pulse and SDG metrics separating discovery from achieved outcomes.
Acceptance: users track real collaboration progress; analytics link to underlying events and sources.

## Phase 4: Scale and enterprise readiness
Harden the system for public production and larger organizations.
- [x] Add organization verification, advanced permissions, secure documents, abuse controls and audit logs.
- [x] Add tested recovery, deployment automation, enterprise integrations and additional languages.
Acceptance: monitored, recoverable production deployment with reviewed privacy and operational controls.

### Phase 4 delivered
- `Organization` (admin-key verification, one-time key shown at creation, sha256+timingSafeEqual check), `OrgMembership` (owner/admin/member ranks), `OrgDocument` (members/admins access levels), `AuditLog` (append-only, indexed) — additive migration `20261114100000_phase4_organizations`.
- APIs under `/api/organizations` (list/create, detail with role-scoped visibility, members add/role-change/remove, verify, documents, audit read) plus `/api/export?kind=trackers|audit&orgId=…` CSV downloads.
- Abuse controls: per-route rate limits (auth 10/min, ingest 8/min, connections 15/min, messages 30/min, org mutations 5–20/min) enforced inside `handle` so they return 429.
- `/organizations` page with verification badges, member management, secure documents and audit trail; nav entry in the app shell; Marathi (मराठी) as third UI language with Hindi fallback.
- Automation: `scripts/recover.sh` (migration re-apply, optional `--fresh` reseed, typed rollback command) and `scripts/deploy-check.sh` (typecheck, build, migrate deploy, health probe).
