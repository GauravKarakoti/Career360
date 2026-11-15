// Phase 4 end-to-end smoke: org create, members, verification, documents, audit, rate limit, CSV export.
const BASE = 'http://127.0.0.1:3000';
const ok = (cond, label) => { if (!cond) throw new Error('FAIL: ' + label); console.log('ok -', label); };

function user(name) {
  const u = {
    name, jar: '',
    email: `phase4-${name}-${Date.now()}@smoke.test`,
    async call(path, opts = {}) {
      const res = await fetch(BASE + path, {
        ...opts,
        headers: { 'content-type': 'application/json', ...(u.jar ? { cookie: u.jar } : {}), ...(opts.headers || {}) },
      });
      for (const c of res.headers.getSetCookie?.() || []) if (c.startsWith('o360_workspace')) u.jar = c.split(';')[0];
      const text = await res.text();
      let body; try { body = JSON.parse(text); } catch { body = text; }
      return { status: res.status, body };
    },
  };
  return u;
}

const main = async () => {
  const owner = user('owner'), admin = user('admin'), member = user('member'), outsider = user('outsider');
  for (const [u, role] of [[owner, 'Startup'], [admin, 'Recruiter'], [member, 'Candidate'], [outsider, 'Business']]) {
    const r = await u.call('/api/auth/sign-up', { method: 'POST', body: JSON.stringify({ email: u.email, password: 'correct-horse-42', role }) });
    ok(r.status === 200 || r.status === 201, `${u.name} signed up (${r.status})`);
  }

  // 1. Create org
  const created = await owner.call('/api/organizations', { method: 'POST', body: JSON.stringify({ name: 'Smoke Systems ' + Date.now(), description: 'phase-4 smoke' }) });
  ok(created.status === 200 || created.status === 201, 'organization created');
  ok(!('adminKeyHash' in created.body.organization), 'admin key hash not exposed');
  const key = created.body.adminKey, orgId = created.body.organization.id;
  ok(!!key && key.length >= 20, 'admin key returned once');

  // 2. Roles: creator is owner
  const detail = await owner.call(`/api/organizations/${orgId}`);
  ok(detail.body.role === 'owner', 'creator is owner');

  // 3. Owner adds admin; admin adds member; member cannot add
  const addAdmin = await owner.call(`/api/organizations/${orgId}/members`, { method: 'POST', body: JSON.stringify({ email: admin.email, role: 'admin' }) });
  ok(addAdmin.status === 200 || addAdmin.status === 201, 'owner added admin');
  const addMember = await admin.call(`/api/organizations/${orgId}/members`, { method: 'POST', body: JSON.stringify({ email: member.email, role: 'member' }) });
  ok(addMember.status === 200 || addMember.status === 201, 'admin added member');
  const memberAdds = await member.call(`/api/organizations/${orgId}/members`, { method: 'POST', body: JSON.stringify({ email: outsider.email }) });
  ok(memberAdds.status === 403, 'member cannot add members (403)');

  // 4. Outsider sees no documents/roster
  const outDetail = await outsider.call(`/api/organizations/${orgId}`);
  ok(outDetail.status === 200 && outDetail.body.role === null && outDetail.body.organization.documents.length === 0, 'outsider sees public card only');

  // 5. Member sees member docs but not admins-only ones; wrong key rejected; right key verifies
  const docAdmins = await admin.call(`/api/organizations/${orgId}/documents`, { method: 'POST', body: JSON.stringify({ title: 'Cap table', body: 'restricted', accessLevel: 'admins' }) });
  ok(docAdmins.status === 200 || docAdmins.status === 201, 'admin created admins-only document');
  const docMembers = await admin.call(`/api/organizations/${orgId}/documents`, { method: 'POST', body: JSON.stringify({ title: 'Onboarding', body: 'welcome', accessLevel: 'members' }) });
  ok(docMembers.status === 200 || docMembers.status === 201, 'admin created members document');
  const memberDetail = await member.call(`/api/organizations/${orgId}`);
  const titles = memberDetail.body.organization.documents.map((d) => d.title);
  ok(titles.includes('Onboarding') && !titles.includes('Cap table'), 'member sees member docs, not admins-only');

  const badKey = await member.call(`/api/organizations/${orgId}/verify`, { method: 'POST', body: JSON.stringify({ adminKey: 'not-the-real-key-123456' }) });
  ok(badKey.status === 403, 'wrong admin key rejected (403)');
  const verify = await admin.call(`/api/organizations/${orgId}/verify`, { method: 'POST', body: JSON.stringify({ adminKey: key }) });
  ok(verify.status === 200 && verify.body.organization.verified === true, 'correct admin key verified org');

  // 6. Audit log visible to admin, blocked for member
  const auditAdmin = await admin.call(`/api/organizations/${orgId}/audit`);
  const actions = auditAdmin.body.entries.map((e) => e.action);
  ok(auditAdmin.status === 200 && actions.includes('org.created') && actions.includes('org.verified') && actions.includes('document.created') && actions.includes('member.added'), 'audit log captured the trail');
  const auditMember = await member.call(`/api/organizations/${orgId}/audit`);
  ok(auditMember.status === 403, 'member cannot read audit log (403)');

  // 7. CSV exports
  const csvAudit = await admin.call('/api/export?kind=audit&orgId=' + orgId);
  ok(csvAudit.status === 200 && String(csvAudit.body).includes('org.verified'), 'audit CSV export works');
  const csvTrackers = await member.call('/api/export?kind=trackers');
  ok(csvTrackers.status === 200 && String(csvTrackers.body).startsWith('opportunity'), 'trackers CSV export works');
  const csvDenied = await member.call('/api/export?kind=audit&orgId=' + orgId);
  ok(csvDenied.status === 403, 'audit CSV denied to non-admin (403)');

  // 8. Rate limit on sign-in (10/min) - attempt 12
  let got429 = false;
  for (let i = 0; i < 12; i++) {
    const r = await outsider.call('/api/auth/sign-in', { method: 'POST', body: JSON.stringify({ email: 'nobody@example.com', password: 'wrong' }) });
    if (r.status === 429) { got429 = true; break; }
  }
  ok(got429, 'sign-in rate limit returns 429');

  console.log('\nALL PHASE-4 SMOKE CHECKS PASSED');
};

main().catch((e) => { console.error(e.message); process.exit(1); });
