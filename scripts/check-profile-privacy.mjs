#!/usr/bin/env node
// Verifies the Opportunity DNA visibility rules and DTO shape without a database.
// Run: node --experimental-strip-types scripts/check-profile-privacy.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canView, resolveRelation, toProfileDto } from '../src/lib/profile-policy.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ME = 'ws_me', THEM = 'ws_them';
const record = (visibility) => ({
  name: 'Asha', role: 'Startup', roles: ['Startup', 'Creator'], industry: 'FinTech', location: 'Pune',
  description: 'Builds things', stage: 'Seed', interests: 'AI, Web3', constraints: 'Only evenings', goals: 'Find a co-founder',
  visibility, updatedAt: new Date('2026-01-01'),
  capabilities: [{ label: 'Smart Contracts' }], needs: [{ label: 'Funding' }],
});
const at = (day) => new Date(`2026-01-${String(day).padStart(2, '0')}`);
const opts = (extra = {}) => ({ targetVisibility: 'discoverable', viewerHasProfile: true, isSelf: false, ...extra });
let passed = 0;
const check = (name, fn) => { fn(); passed += 1; console.log(`  ok  ${name}`); };

check('discoverable profile is viewable by another member', () => assert.equal(canView(ME, THEM, 'discoverable'), true));
check('private profile is hidden from others', () => assert.equal(canView(ME, THEM, 'private'), false));
check('unknown visibility values fail closed', () => assert.equal(canView(ME, THEM, 'whatever'), false));
check('owner always sees own private profile', () => assert.equal(canView(ME, ME, 'private'), true));
check('accepted connection does NOT lift a private profile', () => {
  const relation = resolveRelation(ME, [{ id: 'r1', status: 'accepted', fromWorkspaceId: ME, createdAt: at(2) }], opts({ targetVisibility: 'private' }));
  assert.equal(relation.status, 'connected');
  assert.equal(canView(ME, THEM, 'private'), false);
});

check('DTO hides constraints from other members', () => {
  const dto = toProfileDto(THEM, ME, record('discoverable'), resolveRelation(ME, [], opts()));
  assert.equal(dto.constraints, null);
  assert.equal(dto.isSelf, false);
});
check('DTO gives constraints to the owner only', () => {
  const dto = toProfileDto(ME, ME, record('private'), resolveRelation(ME, [], opts({ isSelf: true })));
  assert.equal(dto.constraints, 'Only evenings');
  assert.equal(dto.isSelf, true);
});
check('DTO contains capabilities and needs as plain labels', () => {
  const dto = toProfileDto(THEM, ME, record('discoverable'), resolveRelation(ME, [], opts()));
  assert.deepEqual(dto.capabilities, ['Smart Contracts']);
  assert.deepEqual(dto.needs, ['Funding']);
});
check('DTO is an allow-list with no account or auth fields', () => {
  const dto = toProfileDto(THEM, ME, { ...record('discoverable'), passwordHash: 'x', email: 'a@b.c', tokenHash: 't', id: 'p1' }, resolveRelation(ME, [], opts()));
  const json = JSON.stringify(dto);
  for (const banned of ['passwordHash', 'recoveryCodeHash', 'tokenHash', 'email', 'accountId', 'primaryRole', 'a@b.c']) {
    assert.equal(json.includes(banned), false, `leaked ${banned}`);
  }
  assert.deepEqual(Object.keys(dto).sort(), ['capabilities', 'constraints', 'description', 'goals', 'industry', 'interests', 'isSelf', 'location', 'name', 'needs', 'relation', 'role', 'roles', 'stage', 'updatedAt', 'visibility', 'workspaceId']);
});

check('no request: can connect when viewer has a profile and target is discoverable', () => {
  const relation = resolveRelation(ME, [], opts());
  assert.deepEqual([relation.status, relation.canConnect, relation.canMessage], ['none', true, false]);
});
check('no request: cannot connect without own saved profile', () => assert.equal(resolveRelation(ME, [], opts({ viewerHasProfile: false })).canConnect, false));
check('pending sent shows Pending, no Connect, no Message', () => {
  const relation = resolveRelation(ME, [{ id: 'r1', status: 'pending', fromWorkspaceId: ME, createdAt: at(2) }], opts());
  assert.deepEqual([relation.status, relation.canConnect, relation.canMessage], ['pending_sent', false, false]);
});
check('pending received routes to Connections, no Connect', () => {
  const relation = resolveRelation(ME, [{ id: 'r1', status: 'pending', fromWorkspaceId: THEM, createdAt: at(2) }], opts());
  assert.deepEqual([relation.status, relation.canConnect, relation.canMessage], ['pending_received', false, false]);
});
check('accepted enables Message with the request id', () => {
  const relation = resolveRelation(ME, [{ id: 'r9', status: 'accepted', fromWorkspaceId: THEM, createdAt: at(3) }], opts());
  assert.deepEqual([relation.status, relation.canMessage, relation.requestId, relation.canConnect], ['connected', true, 'r9', false]);
});
check('declined request allows connecting again (matches POST /api/connections)', () => {
  const relation = resolveRelation(ME, [{ id: 'r1', status: 'declined', fromWorkspaceId: ME, createdAt: at(2) }], opts());
  assert.equal(relation.canConnect, true);
});
check('own profile offers no Connect or Message', () => {
  const relation = resolveRelation(ME, [], opts({ isSelf: true }));
  assert.deepEqual([relation.canConnect, relation.canMessage], [false, false]);
});

// Static guards on the route source.
const route = readFileSync(join(root, 'src/app/api/profiles/[workspaceId]/route.ts'), 'utf8');
check('route authenticates via requireAccount', () => assert.match(route, /requireAccount\(session\.id\)/));
check('route never selects secrets', () => {
  for (const banned of ['passwordHash', 'recoveryCodeHash', 'tokenHash', 'include:', 'account:']) assert.equal(route.includes(banned), false, `route mentions ${banned}`);
});
check('route answers private and missing profiles identically', () => assert.equal((route.match(/private or unavailable/g) ?? []).length >= 2, true));

console.log(`\n${passed} privacy checks passed`);
