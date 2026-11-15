'use client';

import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Building2, Loader2, ShieldCheck } from 'lucide-react';
import { api, type Lang } from '@/lib/client-api';
import { useWorkspace } from '@/components/workspace-context';

type OrgCard = {
  id: string;
  name: string;
  slug: string;
  description: string;
  website: string;
  verified: boolean;
  createdAt: string;
  _count: { memberships: number; documents: number };
};
type OrgDetail = {
  id: string;
  name: string;
  slug: string;
  description: string;
  website: string;
  verified: boolean;
  verifiedAt: string | null;
  memberships: { id: string; role: string; createdAt: string; account: { email: string } }[];
  documents: { id: string; title: string; body: string; accessLevel: string; createdAt: string }[];
};
type AuditEntry = { id: string; action: string; detail: string; createdAt: string; account?: { email: string } | null };

export default function OrganizationsPage() {
  const { t } = useWorkspace();
  const [orgs, setOrgs] = useState<OrgCard[]>([]);
  const [selected, setSelected] = useState<{ org: OrgDetail; role: string | null } | null>(null);
  const [audit, setAudit] = useState<AuditEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [verifyKey, setVerifyKey] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docBody, setDocBody] = useState('');
  const [docLevel, setDocLevel] = useState<'members' | 'admins'>('members');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ organizations: OrgCard[] }>('/api/organizations');
      setOrgs(data.organizations);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load organizations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const open = async (id: string) => {
    setError('');
    setNotice('');
    setAudit(null);
    setVerifyKey('');
    try {
      const data = await api<{ organization: OrgDetail; role: string | null }>(`/api/organizations/${id}`);
      setSelected({ org: data.organization, role: data.role });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load organization.');
    }
  };

  const run = async (fn: () => Promise<string | void>) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const message = await fn();
      if (message) setNotice(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const isAdmin = selected?.role === 'owner' || selected?.role === 'admin';
  const isOwner = selected?.role === 'owner';

  return (
    <main className="mx-10 flex-1 px-4 py-8 sm:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
        <Building2 aria-hidden className="h-6 w-6 text-brand-600" />
        {t('orgs.title')}
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        {t('orgs.intro')}
      </p>

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-inset ring-red-200">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">{notice}</p>}

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">{t('orgs.create')}</h2>
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const data = await api<{ organization: OrgCard; adminKey: string }>('/api/organizations', {
                method: 'POST',
                body: JSON.stringify({ name: newName, description: newDesc }),
              });
              setAdminKey(data.adminKey);
              setNewName('');
              setNewDesc('');
              await load();
              return t('orgs.createdNotice');
            });
          }}
        >
          <input
            required
            minLength={2}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('orgs.namePlaceholder')}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder={t('orgs.descPlaceholder')}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />} {t('orgs.createBtn')}
          </button>
        </form>
        {adminKey && (
          <p className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
            {t('orgs.adminKey')}{' '}
            <code className="break-all font-mono font-semibold">{adminKey}</code>
          </p>
        )}
      </section>

      {loading ? (
        <p className="mt-8 flex items-center gap-2 text-slate-500">
          <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> {t('orgs.loading')}
        </p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {orgs.map((org) => (
            <li key={org.id}>
              <button
                type="button"
                onClick={() => void open(org.id)}
                className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand-300 hover:shadow-sm"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{org.name}</span>
                  {org.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      <BadgeCheck aria-hidden className="h-3.5 w-3.5" /> {t('orgs.verified')}
                    </span>
                  )}
                </span>
                <span className="mt-1 block line-clamp-2 text-sm text-slate-600">
                  {org.description || t('orgs.noDesc')}
                </span>
                <span className="mt-2 block text-xs text-slate-500">
                  {t('orgs.membersCount', { count: org._count.memberships })} · {t('orgs.docsCount', { count: org._count.documents })}
                </span>
              </button>
            </li>
          ))}
          {orgs.length === 0 && <li className="text-sm text-slate-500">{t('orgs.empty')}</li>}
        </ul>
      )}

      {selected && (
        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900">{selected.org.name}</h2>
            <div className="flex items-center gap-2">
              {selected.org.verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  <BadgeCheck aria-hidden className="h-3.5 w-3.5" /> {t('orgs.verified')}
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{t('orgs.unverified')}</span>
              )}
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200">
                {selected.role ?? 'guest'}
              </span>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-sm text-slate-500 hover:text-slate-800"
              >
                {t('orgs.close')}
              </button>
            </div>
          </div>
          {selected.org.website && (
            <a className="mt-1 block text-sm text-brand-700 underline" href={selected.org.website} target="_blank" rel="noreferrer">
              {selected.org.website}
            </a>
          )}
          <p className="mt-2 text-sm text-slate-700">{selected.org.description || t('orgs.noDesc')}</p>

          {selected.role && !selected.org.verified && (
            <form
              className="mt-4 flex flex-col gap-2 rounded-lg bg-slate-50 p-4 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await api(`/api/organizations/${selected.org.id}/verify`, {
                    method: 'POST',
                    body: JSON.stringify({ adminKey: verifyKey }),
                  });
                  setAdminKey('');
                  setVerifyKey('');
                  await open(selected.org.id);
                  await load();
                  return t('orgs.verifiedNotice');
                });
              }}
            >
              <input
                required
                value={verifyKey}
                onChange={(e) => setVerifyKey(e.target.value)}
                placeholder={t('orgs.adminKeyPlaceholder')}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                autoComplete="off"
              />
              <button
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                <ShieldCheck aria-hidden className="h-4 w-4" /> {t('orgs.verifyBtn')}
              </button>
            </form>
          )}

          {selected.role && (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{t('orgs.membersTitle')}</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {selected.org.memberships.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                      <span className="truncate">{m.account.email}</span>
                      <span className="shrink-0 text-xs font-medium text-slate-600">{m.role}</span>
                      {isOwner && m.role !== 'owner' && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              await api(`/api/organizations/${selected.org.id}/members`, {
                                method: 'PATCH',
                                body: JSON.stringify({ membershipId: m.id, role: m.role === 'member' ? 'admin' : 'member' }),
                              });
                              await open(selected.org.id);
                            })
                          }
                          className="shrink-0 text-xs text-brand-700 underline"
                        >
                          {m.role === 'member' ? t('orgs.makeAdmin') : t('orgs.makeMember')}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                {isAdmin && (
                  <form
                    className="mt-3 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run(async () => {
                        await api(`/api/organizations/${selected.org.id}/members`, {
                          method: 'POST',
                          body: JSON.stringify({ email: memberEmail }),
                        });
                        setMemberEmail('');
                        await open(selected.org.id);
                        return t('orgs.memberAdded');
                      });
                    }}
                  >
                    <input
                      required
                      type="email"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      placeholder={t('orgs.memberEmailPlaceholder')}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button
                      disabled={busy}
                      className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                    >
                      {t('orgs.addMemberBtn')}
                    </button>
                  </form>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">{t('orgs.docsTitle')}</h3>
                <ul className="mt-2 space-y-2 text-sm">
                  {selected.org.documents.length === 0 && <li className="text-slate-500">{t('orgs.noDocs')}</li>}
                  {selected.org.documents.map((d) => (
                    <li key={d.id} className="rounded-lg bg-slate-50 px-3 py-2">
                      <span className="flex items-center justify-between gap-2 font-medium text-slate-900">
                        {d.title}
                        <span className="text-xs font-normal text-slate-500">
                          {d.accessLevel === 'admins' ? t('orgs.accessAdmins') : t('orgs.accessMembers')}
                        </span>
                      </span>
                      <span className="mt-1 block whitespace-pre-wrap text-slate-700">{d.body}</span>
                    </li>
                  ))}
                </ul>
                {isAdmin && (
                  <form
                    className="mt-3 space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run(async () => {
                        await api(`/api/organizations/${selected.org.id}/documents`, {
                          method: 'POST',
                          body: JSON.stringify({ title: docTitle, body: docBody, accessLevel: docLevel }),
                        });
                        setDocTitle('');
                        setDocBody('');
                        await open(selected.org.id);
                        return t('orgs.docSaved');
                      });
                    }}
                  >
                    <input
                      required
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      placeholder={t('orgs.docTitlePlaceholder')}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <textarea
                      required
                      value={docBody}
                      onChange={(e) => setDocBody(e.target.value)}
                      rows={3}
                      placeholder={t('orgs.docBodyPlaceholder')}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <select
                        value={docLevel}
                        onChange={(e) => setDocLevel(e.target.value as 'members' | 'admins')}
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="members">{t('orgs.docLevelMembers')}</option>
                        <option value="admins">{t('orgs.docLevelAdmins')}</option>
                      </select>
                      <button
                        disabled={busy}
                        className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                      >
                        {t('orgs.saveDocBtn')}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="mt-6">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">{t('orgs.auditTitle')}</h3>
                <div className="flex gap-2">
                  {!audit && (
                    <button
                      type="button"
                      onClick={() =>
                        void run(async () => {
                          const data = await api<{ entries: AuditEntry[] }>(`/api/organizations/${selected.org.id}/audit`);
                          setAudit(data.entries);
                        })
                      }
                      className="text-xs text-brand-700 underline"
                    >
                      {t('orgs.loadAudit')}
                    </button>
                  )}
                  <a href={`/api/export?kind=audit&orgId=${selected.org.id}`} className="text-xs text-brand-700 underline">
                    {t('orgs.exportCsv')}
                  </a>
                </div>
              </div>
              {audit && (
                <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto text-xs">
                  {audit.map((entry) => (
                    <li key={entry.id} className="flex gap-2 rounded bg-slate-50 px-2 py-1">
                      <span className="text-slate-500">{new Date(entry.createdAt).toLocaleString()}</span>
                      <span className="font-medium text-slate-800">{entry.action}</span>
                      <span className="truncate text-slate-600">{entry.detail}</span>
                    </li>
                  ))}
                  {audit.length === 0 && <li className="text-slate-500">{t('orgs.noAudit')}</li>}
                </ul>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export type { Lang };