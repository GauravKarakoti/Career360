'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, Clock, Eye, EyeOff, Lock, MapPin, MessageCircle, Pencil, Target, UserPlus } from 'lucide-react';
import { api, type MsgKey, type ProfileViewDto } from '@/lib/client-api';
import { useWorkspace } from '@/components/workspace-context';
import { Avatar } from '@/components/messaging';

// Interests are stored as free text; split list-like input into tags, keep prose as-is.
const toTags = (value: string) =>
  value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean).slice(0, 30);

function Skeleton() {
  return (
    <div aria-hidden className="animate-pulse space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-48 rounded bg-slate-200" />
            <div className="h-3 w-64 max-w-full rounded bg-slate-200" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {[0, 1, 2].map((item) => <div key={item} className="h-36 rounded-xl border border-slate-200 bg-white" />)}
        </div>
        <div className="space-y-4">
          {[0, 1].map((item) => <div key={item} className="h-40 rounded-xl border border-slate-200 bg-white" />)}
        </div>
      </div>
    </div>
  );
}

function Section({ title, hint, children, className = '' }: { title: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-sm italic text-slate-400">{children}</p>;

function Tags({ items, tone }: { items: string[]; tone: 'brand' | 'amber' | 'slate' }) {
  const styles = {
    brand: 'bg-brand-50 text-brand-700 ring-brand-200',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200',
    slate: 'bg-slate-50 text-slate-700 ring-slate-200',
  }[tone];
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item} className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${styles}`}>{item}</li>
      ))}
    </ul>
  );
}

function Fact({ label, value, fallback }: { label: string; value: string; fallback: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-sm ${value ? 'text-slate-900' : 'italic text-slate-400'}`}>{value || fallback}</dd>
    </div>
  );
}

function ProfileView() {
  const { t, flash } = useWorkspace();
  const params = useParams<{ workspaceId: string }>();
  const search = useSearchParams();
  const workspaceId = decodeURIComponent(params.workspaceId ?? '');

  const [profile, setProfile] = useState<ProfileViewDto | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable' | 'error'>('loading');
  const [errorText, setErrorText] = useState('');
  const [connecting, setConnecting] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await api<{ profile: ProfileViewDto }>(`/api/profiles/${encodeURIComponent(workspaceId)}`);
      setProfile(result.profile);
      setState('ready');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '';
      // The API answers private and missing profiles identically (404) on purpose.
      if (/private or unavailable/i.test(message)) setState('unavailable');
      else { setErrorText(message || t('profile.loadError')); setState('error'); }
    }
  }, [workspaceId, t]);

  useEffect(() => {
    setState('loading');
    setProfile(null);
    void load();
  }, [load]);

  // Return path: only two known origins are honoured, never an arbitrary URL.
  const from = search.get('from');
  const requestId = search.get('c');
  const back =
    from === 'messages' && requestId
      ? { href: `/messages?c=${encodeURIComponent(requestId)}`, label: t('profile.back.messages') }
      : from === 'connections'
        ? { href: '/connections', label: t('profile.back.connections') }
        : { href: '/connections', label: t('profile.back.default') };

  const connect = async () => {
    if (!profile) return;
    setConnecting(true);
    try {
      await api('/api/connections', { method: 'POST', body: JSON.stringify({ toWorkspaceId: profile.workspaceId }) });
      flash(t('profile.requestSent'));
      await load();
    } catch (caught) {
      flash(caught instanceof Error ? caught.message : t('profile.requestError'));
    } finally {
      setConnecting(false);
    }
  };

  const actionClass = 'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold';

  const renderActions = (p: ProfileViewDto) => {
    if (p.isSelf) {
      return (
        <Link href="/dna" className={`${actionClass} bg-brand-600 text-white hover:bg-brand-700`}>
          <Pencil aria-hidden className="h-4 w-4" />{t('profile.editProfile')}
        </Link>
      );
    }
    const { status, canConnect, canMessage, requestId: relId } = p.relation;
    // Only offer what the existing workflow permits: connect before a request exists,
    // message once accepted, and answer incoming requests on the Connections page.
    return (
      <>
        {canConnect && (
          <button type="button" onClick={connect} disabled={connecting} className={`${actionClass} bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60`}>
            <UserPlus aria-hidden className="h-4 w-4" />{connecting ? t('profile.connecting') : t('profile.connect')}
          </button>
        )}
        {status === 'pending_sent' && (
          <span className={`${actionClass} bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200`}>
            <Clock aria-hidden className="h-4 w-4" />{t('profile.pendingSent')}
          </span>
        )}
        {status === 'pending_received' && (
          <Link href="/connections" className={`${actionClass} bg-emerald-600 text-white hover:bg-emerald-700`}>
            <Clock aria-hidden className="h-4 w-4" />{t('profile.pendingReceived')}
          </Link>
        )}
        {status === 'connected' && (
          <span className={`${actionClass} bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200`}>
            <Check aria-hidden className="h-4 w-4" />{t('profile.connected')}
          </span>
        )}
        {canMessage && relId && (
          <Link href={`/messages?c=${encodeURIComponent(relId)}`} className={`${actionClass} bg-brand-600 text-white hover:bg-brand-700`}>
            <MessageCircle aria-hidden className="h-4 w-4" />{t('profile.message')}
          </Link>
        )}
      </>
    );
  };

  let body: React.ReactNode;
  if (state === 'loading') {
    body = <Skeleton />;
  } else if (state === 'unavailable') {
    body = (
      <div role="status" className="mx-auto mt-6 max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500"><Lock aria-hidden className="h-6 w-6" /></span>
        <h1 className="mt-4 text-lg font-bold text-slate-900">{t('profile.unavailableTitle')}</h1>
        <p className="mt-2 text-sm text-slate-500">{t('profile.unavailableBody')}</p>
      </div>
    );
  } else if (state === 'error' || !profile) {
    body = (
      <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-inset ring-red-200">
        <p className="font-semibold">{t('profile.loadError')}</p>
        {errorText && <p className="mt-1">{errorText}</p>}
        <button type="button" onClick={() => { setState('loading'); void load(); }} className="mt-2 text-xs font-semibold underline">{t('profile.retry')}</button>
      </div>
    );
  } else {
    const others = profile.roles.filter((role: any) => role !== profile.role);
    const interests = toTags(profile.interests);
    const meta: { key: string; text: string }[] = [
      { key: 'industry', text: profile.industry },
      { key: 'stage', text: profile.stage },
    ].filter((item) => item.text);
    body = (
      <div className="pane-enter space-y-4">
        <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div aria-hidden className="h-20 bg-gradient-to-r from-brand-600 via-brand-500 to-brand-300 sm:h-24" />
          <div className="px-5 pb-5 sm:px-6">
            <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="rounded-full bg-white p-1 ring-1 ring-slate-200 self-start">
                <Avatar id={profile.workspaceId} name={profile.name} isPrivate={false} size="xl" />
              </div>
              <div className="flex flex-wrap items-center gap-2">{renderActions(profile)}</div>
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-brand-700">{t('profile.eyebrow')}</p>
            <h1 className="text-2xl font-bold text-slate-900">{profile.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-semibold text-white">{profile.role}</span>
              {others.map((role: any) => (
                <span key={role} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200">{role}</span>
              ))}
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
              {meta.map((item) => <span key={item.key}>{item.text}</span>)}
              {profile.location && (
                <span className="inline-flex items-center gap-1"><MapPin aria-hidden className="h-3.5 w-3.5 text-slate-400" />{profile.location}</span>
              )}
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                profile.visibility === 'discoverable' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'
              }`}>
                {profile.visibility === 'discoverable' ? <Eye aria-hidden className="h-3 w-3" /> : <EyeOff aria-hidden className="h-3 w-3" />}
                {t(`profile.visibility.${profile.visibility}` as MsgKey)}
              </span>
            </p>
            {profile.description && <p className="mt-3 line-clamp-3 max-w-3xl text-sm text-slate-700">{profile.description}</p>}
            {profile.isSelf && <p className="mt-3 text-xs text-slate-500">{t('profile.selfNotice')}</p>}
            {!profile.isSelf && profile.visibility === 'discoverable' && !profile.relation.canConnect && profile.relation.status === 'none' && (
              <p className="mt-3 text-xs text-slate-500">{t('profile.connectNeedsProfile')}</p>
            )}
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Section title={t('profile.identity')}>
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <Fact label={t('profile.primaryRole')} value={profile.role} fallback={t('profile.notProvided')} />
                <Fact label={t('profile.otherRoles')} value={others.join(', ')} fallback={t('profile.notProvided')} />
                <Fact label={t('profile.industry')} value={profile.industry} fallback={t('profile.notProvided')} />
                <Fact label={t('profile.stage')} value={profile.stage} fallback={t('profile.notProvided')} />
                <Fact label={t('profile.location')} value={profile.location} fallback={t('profile.notProvided')} />
              </dl>
              <div className="mt-4 border-t border-slate-100 pt-3">
                <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('profile.about')}</h3>
                {profile.description
                  ? <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-slate-700">{profile.description}</p>
                  : <div className="mt-1"><Empty>{t('profile.emptyDescription')}</Empty></div>}
              </div>
            </Section>

            <Section title={t('profile.interests')}>
              {interests.length ? <Tags items={interests} tone="slate" /> : <Empty>{t('profile.emptyInterests')}</Empty>}
            </Section>

            <Section title={t('profile.goals')}>
              {profile.goals
                ? <p className="inline-flex gap-2 whitespace-pre-line break-words text-sm leading-relaxed text-slate-700"><Target aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /><span>{profile.goals}</span></p>
                : <Empty>{t('profile.emptyGoals')}</Empty>}
            </Section>

            {/* Constraints are returned by the API to the owner only. */}
            {profile.isSelf && (
              <Section title={t('profile.constraints')} hint={t('profile.constraintsOwnerOnly')}>
                {profile.constraints
                  ? <p className="whitespace-pre-line break-words text-sm leading-relaxed text-slate-700">{profile.constraints}</p>
                  : <Empty>{t('profile.notProvided')}</Empty>}
              </Section>
            )}
          </div>

          <div className="space-y-4">
            <Section title={t('profile.capabilities')} hint={t('profile.capabilitiesHint')}>
              {profile.capabilities.length ? <Tags items={profile.capabilities} tone="brand" /> : <Empty>{t('profile.emptyCapabilities')}</Empty>}
            </Section>
            <Section title={t('profile.needs')} hint={t('profile.needsHint')}>
              {profile.needs.length ? <Tags items={profile.needs} tone="amber" /> : <Empty>{t('profile.emptyNeeds')}</Empty>}
            </Section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-4 md:px-6 md:py-6">
      <Link href={back.href} className="mb-3 inline-flex items-center gap-1.5 rounded-lg py-1 pr-2 text-sm font-medium text-slate-600 hover:text-brand-700">
        <ArrowLeft aria-hidden className="h-4 w-4" />{back.label}
      </Link>
      {body}
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="p-6"><Skeleton /></div>}>
      <ProfileView />
    </Suspense>
  );
}
