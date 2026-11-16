'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Handshake, MessageCircle } from 'lucide-react';
import { api, type Connections, type MsgKey } from '@/lib/client-api';
import { useWorkspace } from '@/components/workspace-context';

const STATUS_KEYS: Record<string, MsgKey> = {
  pending: 'connections.status.pending',
  accepted: 'connections.status.accepted',
  declined: 'connections.status.declined',
};

export default function ConnectionsPage() {
  const { flash, t, lang } = useWorkspace();
  const [connections, setConnections] = useState<Connections | null>(null);
  const [contactTo, setContactTo] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [sending, setSending] = useState(false);

  const loadConnections = useCallback(async () => {
    try {
      setConnections(await api<Connections>('/api/connections'));
    } catch (caught) {
      flash(caught instanceof Error ? caught.message : t('connections.loadError'));
    }
  }, [flash, t]);

  useEffect(() => {
    void loadConnections();
  }, [loadConnections]);

  const respond = async (id: string, status: 'accepted' | 'declined') => {
    try {
      await api('/api/connections', { method: 'PATCH', body: JSON.stringify({ id, status }) });
      await loadConnections();
      flash(status === 'accepted' ? t('connections.flashAccepted') : t('connections.flashDeclined'));
    } catch (caught) {
      flash(caught instanceof Error ? caught.message : t('connections.respondError'));
    }
  };

  const sendRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    const target = contactTo.trim();
    if (!target) return;

    setSending(true);
    try {
      const payload = target.includes('@')
        ? { toEmail: target, message: contactMessage.trim() || undefined }
        : { toWorkspaceId: target, message: contactMessage.trim() || undefined };

      await api('/api/connections', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setContactTo('');
      setContactMessage('');
      await loadConnections();
      flash(t('connections.requestSent'));
    } catch (caught) {
      flash(caught instanceof Error ? caught.message : t('connections.requestError'));
    } finally {
      setSending(false);
    }
  };

  const renderStatus = (status: string) => {
    const key = STATUS_KEYS[status];
    return key ? t(key) : status;
  };

  const renderMessageAction = (requestId: string) => (
    <Link
      href={`/messages?c=${encodeURIComponent(requestId)}`}
      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-700"
    >
      <MessageCircle aria-hidden className="h-3.5 w-3.5" />
      {t('connections.message')}
    </Link>
  );

  const renderDetails = (person: { roles: string[] }, createdAt: string) => (
    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
      {person.roles.map((role) => (
        <span key={role} className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700 ring-1 ring-inset ring-brand-200">
          {role}
        </span>
      ))}
      <time dateTime={createdAt}>{new Date(createdAt).toLocaleDateString(lang)}</time>
    </p>
  );

  return (
    <main className="mx-10 flex-1 px-4 py-6 sm:px-6">
      <div className="flex items-center gap-2">
        <Handshake aria-hidden className="h-5 w-5 text-brand-600" />
        <h1 className="text-xl font-bold text-slate-900">{t('connections.title')}</h1>
      </div>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        {t('connections.privacyNotice')}
      </p>

      <form
        onSubmit={sendRequest}
        className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4"
      >
        <div>
          <label htmlFor="c-email" className="block text-sm font-medium text-slate-700">
            {t('connections.emailLabel')}
          </label>
          <input
            id="c-email"
            type="email"
            required
            value={contactTo}
            onChange={(event) => setContactTo(event.target.value)}
            className="mt-1 w-56 rounded-lg border p-1.5 border-slate-300 text-sm"
          />
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor="c-msg" className="block text-sm font-medium text-slate-700">
            {t('connections.optionalMessageLabel')}
          </label>
          <input
            id="c-msg"
            maxLength={500}
            value={contactMessage}
            onChange={(event) => setContactMessage(event.target.value)}
            className="mt-1 w-full rounded-lg border p-1.5 border-slate-300 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={sending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {sending ? t('connections.sending') : t('connections.sendRequest')}
        </button>
      </form>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm">
          <h2 className="font-semibold text-slate-900">{t('connections.received')}</h2>
          {connections?.received.length ? (
            <ul className="mt-2 space-y-2">
              {connections.received.map((item) => (
                <li key={item.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-medium">{item.from.name}</p>
                  {renderDetails(item.from, item.createdAt)}
                  {item.message && <p className="mt-0.5 text-xs text-slate-600">“{item.message}”</p>}
                  {item.status === 'pending' ? (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => respond(item.id, 'accepted')}
                        className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        {t('connections.accept')}
                      </button>
                      <button
                        type="button"
                        onClick={() => respond(item.id, 'declined')}
                        className="rounded-lg px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                      >
                        {t('connections.decline')}
                      </button>
                    </div>
                  ) : item.status === 'accepted' ? (
                    renderMessageAction(item.id)
                  ) : (
                    <p className="mt-1 text-xs capitalize text-slate-500">{renderStatus(item.status)}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">{t('connections.noReceived')}</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm">
          <h2 className="font-semibold text-slate-900">{t('connections.sent')}</h2>
          {connections?.sent.length ? (
            <ul className="mt-2 space-y-2">
              {connections.sent.map((item) => (
                <li key={item.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-medium">{item.to.name}</p>
                  {renderDetails(item.to, item.createdAt)}
                  {item.message && <p className="mt-0.5 text-xs text-slate-600">“{item.message}”</p>}
                  {item.status === 'accepted' ? (
                    renderMessageAction(item.id)
                  ) : (
                    <p className="mt-0.5 text-xs capitalize text-slate-500">{renderStatus(item.status)}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">{t('connections.noSent')}</p>
          )}
        </section>
      </div>
    </main>
  );
}