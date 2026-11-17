'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BadgeCheck,
  Building2,
  Check,
  Loader2,
  LogOut,
  MailQuestion,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';
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
  memberships: {
    id: string;
    role: string;
    createdAt: string;
    account: { email: string };
  }[];
  documents: {
    id: string;
    title: string;
    body: string;
    accessLevel: string;
    createdAt: string;
  }[];
};

type AuditEntry = {
  id: string;
  action: string;
  detail: string;
  createdAt: string;
  account?: { email: string } | null;
};

type PendingInviteItem = {
  org: OrgCard;
  invitedRole: 'member' | 'admin';
};

const INVITE_COPY: Record<
  Lang,
  {
    pendingHeading: string;
    pendingSub: string;
    invitedAs: (role: string) => string;
    acceptBtn: string;
    declineBtn: string;
    acceptedNotice: (orgName: string) => string;
    declinedNotice: (orgName: string) => string;
    inviteSentNotice: (email: string) => string;
    inviteRevokedNotice: string;
    inviteOnlyConnectedHint: string;
    sendInviteBtn: string;
    pendingInvitesSection: string;
    revokeBtn: string;
    invitedBadge: string;
    roleMember: string;
    roleAdmin: string;
    youAreInvitedBanner: (orgName: string, role: string) => string;
    leaveBtn: string;
    leftNotice: (orgName: string) => string;
    makeOwner: string;
    removeMemberBtn: string;
    memberRemovedNotice: string;
    emptyMyOrgs: string;
  }
> = {
  en: {
    pendingHeading: 'Pending organization invitations',
    pendingSub: 'Accept an invitation to join the organization and access member documents.',
    invitedAs: (role) => `Invited as ${role}`,
    acceptBtn: 'Accept & join',
    declineBtn: 'Decline',
    acceptedNotice: (orgName) => `You have joined ${orgName}.`,
    declinedNotice: (orgName) => `Declined invitation to ${orgName}.`,
    inviteSentNotice: (email) =>
      `Invitation sent to ${email}. They will join once they accept the request.`,
    inviteRevokedNotice: 'Invitation revoked.',
    inviteOnlyConnectedHint:
      'Only accepted connections can be invited. They must accept the request before joining.',
    sendInviteBtn: 'Send invite',
    pendingInvitesSection: 'Pending invitations',
    revokeBtn: 'Revoke',
    invitedBadge: 'Invitation pending',
    roleMember: 'Member',
    roleAdmin: 'Admin',
    youAreInvitedBanner: (orgName, role) =>
      `You have been invited to join ${orgName} as ${role}. Accept to view members and internal documents.`,
    leaveBtn: 'Leave organization',
    leftNotice: (orgName) => `You have left ${orgName}.`,
    makeOwner: 'Make owner',
    removeMemberBtn: 'Remove',
    memberRemovedNotice: 'Member removed.',
    emptyMyOrgs:
      'You are not a member of or invited to any organization yet. Create one above or ask a connected colleague to invite you.',
  },
  hi: {
    pendingHeading: 'लंबित संगठन आमंत्रण',
    pendingSub: 'संगठन में शामिल होने और दस्तावेज़ देखने के लिए आमंत्रण स्वीकार करें।',
    invitedAs: (role) => `${role} के रूप में आमंत्रित`,
    acceptBtn: 'स्वीकार करें और जुड़ें',
    declineBtn: 'अस्वीकार करें',
    acceptedNotice: (orgName) => `आप ${orgName} में शामिल हो गए हैं।`,
    declinedNotice: (orgName) => `${orgName} का आमंत्रण अस्वीकार कर दिया गया।`,
    inviteSentNotice: (email) =>
      `${email} को आमंत्रण भेजा गया। उनके स्वीकार करने के बाद वे सदस्य बनेंगे।`,
    inviteRevokedNotice: 'आमंत्रण वापस ले लिया गया।',
    inviteOnlyConnectedHint:
      'केवल स्वीकृत कनेक्शनों को ही आमंत्रित किया जा सकता है। जुड़ने के लिए उन्हें अनुरोध स्वीकार करना होगा।',
    sendInviteBtn: 'आमंत्रण भेजें',
    pendingInvitesSection: 'लंबित आमंत्रण',
    revokeBtn: 'रद्द करें',
    invitedBadge: 'आमंत्रण लंबित',
    roleMember: 'सदस्य (Member)',
    roleAdmin: 'एडमिन (Admin)',
    youAreInvitedBanner: (orgName, role) =>
      `आपको ${orgName} में ${role} के रूप में शामिल होने के लिए आमंत्रित किया गया है। सदस्यों और दस्तावेज़ों को देखने के लिए स्वीकार करें।`,
    leaveBtn: 'संगठन छोड़ें',
    leftNotice: (orgName) => `आपने ${orgName} छोड़ दिया है।`,
    makeOwner: 'ओनर बनाएं',
    removeMemberBtn: 'हटाएं',
    memberRemovedNotice: 'सदस्य को हटा दिया गया।',
    emptyMyOrgs:
      'आप अभी किसी संगठन के सदस्य नहीं हैं और न ही आपको कोई आमंत्रण मिला है। ऊपर नया संगठन बनाएं या किसी जुड़े हुए सदस्य से आमंत्रण प्राप्त करें।',
  },
};

export default function OrganizationsPage() {
  const { email, lang, t } = useWorkspace();
  const copy = INVITE_COPY[lang] ?? INVITE_COPY.en;

  const [orgs, setOrgs] = useState<OrgCard[]>([]);
  const [myRolesByOrg, setMyRolesByOrg] = useState<Record<string, string | null>>({});
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
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [docTitle, setDocTitle] = useState('');
  const [docBody, setDocBody] = useState('');
  const [docLevel, setDocLevel] = useState<'members' | 'admins'>('members');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ organizations: OrgCard[] }>('/api/organizations');

      const rolePairs = await Promise.all(
        data.organizations.map(async (org) => {
          try {
            const detail = await api<{ organization: OrgDetail; role: string | null }>(
              `/api/organizations/${org.id}`
            );
            return [org.id, detail.role] as const;
          } catch {
            return [org.id, null] as const;
          }
        })
      );

      const rolesMap = Object.fromEntries(rolePairs);
      // Only keep organizations the user is a part of or invited to
      const memberOrInvitedOrgs = data.organizations.filter((org) => Boolean(rolesMap[org.id]));

      setMyRolesByOrg(rolesMap);
      setOrgs(memberOrInvitedOrgs);
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
      const data = await api<{ organization: OrgDetail; role: string | null }>(
        `/api/organizations/${id}`
      );
      if (!data.role) {
        setSelected(null);
        await load();
        return;
      }
      setSelected({ org: data.organization, role: data.role });
      setMyRolesByOrg((prev) => ({ ...prev, [id]: data.role }));
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

  const respondToInvite = (orgId: string, orgName: string, action: 'accept' | 'decline') => {
    void run(async () => {
      await api(`/api/organizations/${orgId}/members`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
      await load();
      if (action === 'accept') {
        await open(orgId);
        return copy.acceptedNotice(orgName);
      } else {
        if (selected?.org.id === orgId) {
          setSelected(null);
        }
        return copy.declinedNotice(orgName);
      }
    });
  };

  const leaveOrganization = (orgId: string, orgName: string) => {
    void run(async () => {
      await api(`/api/organizations/${orgId}/members`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'leave' }),
      });
      setSelected(null);
      await load();
      return copy.leftNotice(orgName);
    });
  };

  const pendingInvites: PendingInviteItem[] = orgs
    .filter((org) => myRolesByOrg[org.id]?.startsWith('invited'))
    .map((org) => ({
      org,
      invitedRole: myRolesByOrg[org.id]?.split(':')[1] === 'admin' ? 'admin' : 'member',
    }));

  const isInvited = Boolean(selected?.role?.startsWith('invited'));
  const isActiveMember = Boolean(selected?.role && !isInvited);
  const isAdmin = selected?.role === 'owner' || selected?.role === 'admin';
  const isOwner = selected?.role === 'owner';

  const activeMembers =
    selected?.org.memberships.filter((m) => !m.role.startsWith('invited')) ?? [];
  const invitedMembers =
    selected?.org.memberships.filter((m) => m.role.startsWith('invited')) ?? [];

  return (
    <main className="mx-10 flex-1 px-4 py-8 sm:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
        <Building2 aria-hidden className="h-6 w-6 text-brand-600" />
        {t('orgs.title')}
      </h1>
      <p className="mt-1 text-sm text-slate-600">{t('orgs.intro')}</p>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-inset ring-red-200"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200"
        >
          {notice}
        </p>
      )}

      {/* Pending Invitations Banner */}
      {pendingInvites.length > 0 && (
        <section className="mt-6 rounded-xl border border-amber-300 bg-amber-50/70 p-5">
          <div className="flex items-center gap-2">
            <MailQuestion aria-hidden className="h-5 w-5 text-amber-700" />
            <h2 className="text-sm font-bold text-amber-950">{copy.pendingHeading}</h2>
          </div>
          <p className="mt-1 text-xs text-amber-800">{copy.pendingSub}</p>
          <ul className="mt-3 space-y-2">
            {pendingInvites.map(({ org, invitedRole }) => (
              <li
                key={org.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white p-3 shadow-sm"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{org.name}</p>
                  <p className="text-xs text-slate-500">
                    {copy.invitedAs(invitedRole)} · {org.description || t('orgs.noDesc')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => respondToInvite(org.id, org.name, 'accept')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <Check aria-hidden className="h-3.5 w-3.5" />
                    {copy.acceptBtn}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => respondToInvite(org.id, org.name, 'decline')}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-60"
                  >
                    <X aria-hidden className="h-3.5 w-3.5" />
                    {copy.declineBtn}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">{t('orgs.create')}</h2>
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const data = await api<{ organization: OrgCard; adminKey: string }>(
                '/api/organizations',
                {
                  method: 'POST',
                  body: JSON.stringify({ name: newName, description: newDesc }),
                }
              );
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
          {orgs.map((org) => {
            const myRole = myRolesByOrg[org.id];
            const hasInvite = myRole?.startsWith('invited');
            return (
              <li key={org.id}>
                <button
                  type="button"
                  onClick={() => void open(org.id)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand-300 hover:shadow-sm"
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">{org.name}</span>
                    <span className="flex items-center gap-1.5">
                      {hasInvite ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                          {copy.invitedBadge}
                        </span>
                      ) : (
                        myRole && (
                          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200">
                            {myRole}
                          </span>
                        )
                      )}
                      {org.verified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                          <BadgeCheck aria-hidden className="h-3.5 w-3.5" /> {t('orgs.verified')}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="mt-1 block line-clamp-2 text-sm text-slate-600">
                    {org.description || t('orgs.noDesc')}
                  </span>
                  <span className="mt-2 block text-xs text-slate-500">
                    {t('orgs.membersCount', { count: org._count.memberships })} ·{' '}
                    {t('orgs.docsCount', { count: org._count.documents })}
                  </span>
                </button>
              </li>
            );
          })}
          {orgs.length === 0 && (
            <li className="sm:col-span-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
              {copy.emptyMyOrgs}
            </li>
          )}
        </ul>
      )}

      {selected && (
        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900">{selected.org.name}</h2>
            <div className="flex flex-wrap items-center gap-2">
              {selected.org.verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  <BadgeCheck aria-hidden className="h-3.5 w-3.5" /> {t('orgs.verified')}
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {t('orgs.unverified')}
                </span>
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                  isInvited
                    ? 'bg-amber-50 text-amber-800 ring-amber-200'
                    : 'bg-brand-50 text-brand-700 ring-brand-200'
                }`}
              >
                {isInvited
                  ? copy.invitedAs(selected.role?.split(':')[1] ?? 'member')
                  : (selected.role ?? 'guest')}
              </span>
              {isActiveMember && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => leaveOrganization(selected.org.id, selected.org.name)}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-200 hover:bg-red-50 disabled:opacity-60"
                >
                  <LogOut aria-hidden className="h-3.5 w-3.5" />
                  {copy.leaveBtn}
                </button>
              )}
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
            <a
              className="mt-1 block text-sm text-brand-700 underline"
              href={selected.org.website}
              target="_blank"
              rel="noreferrer"
            >
              {selected.org.website}
            </a>
          )}
          <p className="mt-2 text-sm text-slate-700">
            {selected.org.description || t('orgs.noDesc')}
          </p>

          {/* Invitation Prompt inside Selected Org */}
          {isInvited && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-950">
                {copy.youAreInvitedBanner(
                  selected.org.name,
                  selected.role?.split(':')[1] ?? 'member'
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    respondToInvite(selected.org.id, selected.org.name, 'accept')
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <Check aria-hidden className="h-4 w-4" />
                  {copy.acceptBtn}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    respondToInvite(selected.org.id, selected.org.name, 'decline')
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-60"
                >
                  <X aria-hidden className="h-4 w-4" />
                  {copy.declineBtn}
                </button>
              </div>
            </div>
          )}

          {isActiveMember && !selected.org.verified && (
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

          {isActiveMember && (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {t('orgs.membersTitle')}
                </h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {activeMembers.map((m) => {
                    const isMe = Boolean(
                      email && m.account.email.toLowerCase() === email.toLowerCase()
                    );
                    return (
                      <li
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
                      >
                        <span className="truncate">{m.account.email}</span>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-xs font-medium text-slate-600">
                            {m.role}
                          </span>
                          {isOwner && !isMe && m.role !== 'owner' && (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void run(async () => {
                                    await api(
                                      `/api/organizations/${selected.org.id}/members`,
                                      {
                                        method: 'PATCH',
                                        body: JSON.stringify({
                                          membershipId: m.id,
                                          role: m.role === 'member' ? 'admin' : 'member',
                                        }),
                                      }
                                    );
                                    await open(selected.org.id);
                                  })
                                }
                                className="text-xs text-brand-700 underline"
                              >
                                {m.role === 'member'
                                  ? t('orgs.makeAdmin')
                                  : t('orgs.makeMember')}
                              </button>
                              {m.role === 'admin' && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void run(async () => {
                                      await api(
                                        `/api/organizations/${selected.org.id}/members`,
                                        {
                                          method: 'PATCH',
                                          body: JSON.stringify({
                                            membershipId: m.id,
                                            role: 'owner',
                                          }),
                                        }
                                      );
                                      await open(selected.org.id);
                                    })
                                  }
                                  className="text-xs font-medium text-emerald-700 underline"
                                >
                                  {copy.makeOwner}
                                </button>
                              )}
                            </>
                          )}
                          {isAdmin && !isMe && m.role !== 'owner' && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void run(async () => {
                                  await api(
                                    `/api/organizations/${selected.org.id}/members`,
                                    {
                                      method: 'DELETE',
                                      body: JSON.stringify({ membershipId: m.id }),
                                    }
                                  );
                                  await open(selected.org.id);
                                  await load();
                                  return copy.memberRemovedNotice;
                                })
                              }
                              className="text-xs text-red-600 underline hover:text-red-800"
                            >
                              {copy.removeMemberBtn}
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Pending Invitations List for Org Admins */}
                {invitedMembers.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {copy.pendingInvitesSection}
                    </h4>
                    <ul className="mt-1.5 space-y-1 text-sm">
                      {invitedMembers.map((m) => {
                        const targetRole = m.role.split(':')[1] ?? 'member';
                        return (
                          <li
                            key={m.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2"
                          >
                            <span className="truncate text-slate-800">
                              {m.account.email}
                            </span>
                            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                              {copy.invitedAs(targetRole)}
                            </span>
                            {isAdmin && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void run(async () => {
                                    await api(
                                      `/api/organizations/${selected.org.id}/members`,
                                      {
                                        method: 'DELETE',
                                        body: JSON.stringify({ membershipId: m.id }),
                                      }
                                    );
                                    await open(selected.org.id);
                                    await load();
                                    return copy.inviteRevokedNotice;
                                  })
                                }
                                className="shrink-0 text-xs font-medium text-red-600 underline hover:text-red-800"
                              >
                                {copy.revokeBtn}
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {isAdmin && (
                  <form
                    className="mt-3 space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const invitedEmail = memberEmail.trim();
                      void run(async () => {
                        await api(`/api/organizations/${selected.org.id}/members`, {
                          method: 'POST',
                          body: JSON.stringify({
                            email: invitedEmail,
                            role: inviteRole,
                          }),
                        });
                        setMemberEmail('');
                        await open(selected.org.id);
                        return copy.inviteSentNotice(invitedEmail);
                      });
                    }}
                  >
                    <div className="flex flex-wrap gap-2">
                      <input
                        required
                        type="email"
                        value={memberEmail}
                        onChange={(e) => setMemberEmail(e.target.value)}
                        placeholder={t('orgs.memberEmailPlaceholder')}
                        className="min-w-[12rem] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) =>
                          setInviteRole(e.target.value as 'member' | 'admin')
                        }
                        aria-label="Invited role"
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm"
                      >
                        <option value="member">{copy.roleMember}</option>
                        <option value="admin">{copy.roleAdmin}</option>
                      </select>
                      <button
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                      >
                        <UserPlus aria-hidden className="h-4 w-4" />
                        {copy.sendInviteBtn}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">
                      {copy.inviteOnlyConnectedHint}
                    </p>
                  </form>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {t('orgs.docsTitle')}
                </h3>
                <ul className="mt-2 space-y-2 text-sm">
                  {selected.org.documents.length === 0 && (
                    <li className="text-slate-500">{t('orgs.noDocs')}</li>
                  )}
                  {selected.org.documents.map((d) => (
                    <li key={d.id} className="rounded-lg bg-slate-50 px-3 py-2">
                      <span className="flex items-center justify-between gap-2 font-medium text-slate-900">
                        {d.title}
                        <span className="text-xs font-normal text-slate-500">
                          {d.accessLevel === 'admins'
                            ? t('orgs.accessAdmins')
                            : t('orgs.accessMembers')}
                        </span>
                      </span>
                      <span className="mt-1 block whitespace-pre-wrap text-slate-700">
                        {d.body}
                      </span>
                    </li>
                  ))}
                </ul>
                {isAdmin && (
                  <form
                    className="mt-3 space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run(async () => {
                        await api(
                          `/api/organizations/${selected.org.id}/documents`,
                          {
                            method: 'POST',
                            body: JSON.stringify({
                              title: docTitle,
                              body: docBody,
                              accessLevel: docLevel,
                            }),
                          }
                        );
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
                        onChange={(e) =>
                          setDocLevel(e.target.value as 'members' | 'admins')
                        }
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
                <h3 className="text-sm font-semibold text-slate-900">
                  {t('orgs.auditTitle')}
                </h3>
                <div className="flex gap-2">
                  {!audit && (
                    <button
                      type="button"
                      onClick={() =>
                        void run(async () => {
                          const data = await api<{ entries: AuditEntry[] }>(
                            `/api/organizations/${selected.org.id}/audit`
                          );
                          setAudit(data.entries);
                        })
                      }
                      className="text-xs text-brand-700 underline"
                    >
                      {t('orgs.loadAudit')}
                    </button>
                  )}
                  <a
                    href={`/api/export?kind=audit&orgId=${selected.org.id}`}
                    className="text-xs text-brand-700 underline"
                  >
                    {t('orgs.exportCsv')}
                  </a>
                </div>
              </div>
              {audit && (
                <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto text-xs">
                  {audit.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex gap-2 rounded bg-slate-50 px-2 py-1"
                    >
                      <span className="text-slate-500">
                        {new Date(entry.createdAt).toLocaleString()}
                      </span>
                      <span className="font-medium text-slate-800">
                        {entry.action}
                      </span>
                      <span className="truncate text-slate-600">
                        {entry.detail}
                      </span>
                    </li>
                  ))}
                  {audit.length === 0 && (
                    <li className="text-slate-500">{t('orgs.noAudit')}</li>
                  )}
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