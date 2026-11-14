'use client';

import { useCallback, useEffect, useState } from 'react';
import { MessagesSquare } from 'lucide-react';
import { api, type Connections } from '@/lib/client-api';
import { useWorkspace } from '@/components/workspace-context';

export default function ConnectionsPage() {
  const { flash, t } = useWorkspace();
  const [connections, setConnections] = useState<Connections | null>(null);
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<{ id: string; body: string; mine: boolean; createdAt: string }[]>([]);
  const [draftMessage, setDraftMessage] = useState('');
  const [contactTo, setContactTo] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [sending, setSending] = useState(false);

  const loadConnections = useCallback(async () => {
    try {
      setConnections(await api<Connections>('/api/connections'));
    } catch (caught) {
      flash(caught instanceof Error ? caught.message : 'Could not load connection requests.');
    }
  }, [flash]);

  useEffect(() => {
    void loadConnections();
  }, [loadConnections]);

  const respond = async (id: string, status: 'accepted' | 'declined') => {
    try {
      await api('/api/connections', { method: 'PATCH', body: JSON.stringify({ id, status }) });
      await loadConnections();
      flash(status === 'accepted' ? 'Connection accepted.' : 'Request declined.');
    } catch (caught) {
      flash(caught instanceof Error ? caught.message : 'Could not respond to the request.');
    }
  };

  const openChat = async (requestId: string) => {
    if (openThread === requestId) {
      setOpenThread(null);
      return;
    }
    setOpenThread(requestId);
    try {
      const thread = await api<{ messages: typeof threadMessages }>(`/api/messages?requestId=${requestId}`);
      setThreadMessages(thread.messages);
    } catch (caught) {
      flash(caught instanceof Error ? caught.message : 'Could not open the conversation.');
    }
  };

  const sendMessage = async (requestId: string) => {
    if (!draftMessage.trim()) return;
    try {
      await api('/api/messages', { method: 'POST', body: JSON.stringify({ requestId, body: draftMessage.trim() }) });
      setDraftMessage('');
      const thread = await api<{ messages: typeof threadMessages }>(`/api/messages?requestId=${requestId}`);
      setThreadMessages(thread.messages);
    } catch (caught) {
      flash(caught instanceof Error ? caught.message : 'Could not send the message.');
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
        body: JSON.stringify(payload)
      });
      setContactTo('');
      setContactMessage('');
      await loadConnections();
      flash('Connection request sent.');
    } catch (caught) {
      flash(caught instanceof Error ? caught.message : 'Could not send the request.');
    } finally {
      setSending(false);
    }
  };

  const renderChatSection = (requestId: string) => (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => openChat(requestId)}
        aria-expanded={openThread === requestId}
        className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-700"
      >
        {openThread === requestId ? 'Hide chat' : 'Open chat'}
      </button>
      {openThread === requestId && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <ul className="space-y-1.5">
            {threadMessages.length ? (
              threadMessages.map((message) => (
                <li
                  key={message.id}
                  className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs ${
                    message.mine
                      ? 'ml-auto bg-brand-600 text-white'
                      : 'bg-white text-slate-800 ring-1 ring-inset ring-slate-200'
                  }`}
                >
                  {message.body}
                </li>
              ))
            ) : (
              <li className="text-xs text-slate-500">No messages yet. Say hello.</li>
            )}
          </ul>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage(requestId);
            }}
            className="mt-2 flex gap-2"
          >
            <label className="sr-only" htmlFor={`msg-${requestId}`}>
              Message
            </label>
            <input
              id={`msg-${requestId}`}
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
              placeholder="Write a message…"
              className="flex-1 rounded-lg border-slate-300 text-xs"
            />
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex items-center gap-2">
        <MessagesSquare aria-hidden className="h-5 w-5 text-brand-600" />
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
            Email of a discoverable user
          </label>
          <input
            id="c-email"
            type="email"
            required
            value={contactTo}
            onChange={(event) => setContactTo(event.target.value)}
            className="mt-1 w-56 rounded-lg border-slate-300 text-sm"
          />
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor="c-msg" className="block text-sm font-medium text-slate-700">
            Message (optional)
          </label>
          <input
            id="c-msg"
            maxLength={500}
            value={contactMessage}
            onChange={(event) => setContactMessage(event.target.value)}
            className="mt-1 w-full rounded-lg border-slate-300 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={sending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {sending ? 'Sending…' : 'Send request'}
        </button>
      </form>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm">
          <h2 className="font-semibold text-slate-900">Received</h2>
          {connections?.received.length ? (
            <ul className="mt-2 space-y-2">
              {connections.received.map((item) => (
                <li key={item.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-medium">{item.from.name}</p>
                  {item.message && <p className="mt-0.5 text-xs text-slate-600">“{item.message}”</p>}
                  {item.status === 'pending' ? (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => respond(item.id, 'accepted')}
                        className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => respond(item.id, 'declined')}
                        className="rounded-lg px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                      >
                        Decline
                      </button>
                    </div>
                  ) : item.status === 'accepted' ? (
                    renderChatSection(item.id)
                  ) : (
                    <p className="mt-1 text-xs capitalize text-slate-500">{item.status}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">No requests yet.</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm">
          <h2 className="font-semibold text-slate-900">Sent</h2>
          {connections?.sent.length ? (
            <ul className="mt-2 space-y-2">
              {connections.sent.map((item) => (
                <li key={item.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-medium">{item.to.name}</p>
                  {item.message && <p className="mt-0.5 text-xs text-slate-600">“{item.message}”</p>}
                  {item.status === 'accepted' ? (
                    renderChatSection(item.id)
                  ) : (
                    <p className="mt-0.5 text-xs capitalize text-slate-500">{item.status}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">Nothing sent yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}