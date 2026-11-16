'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { api, type ChatMessage, type Conversation } from '@/lib/client-api';
import { useWorkspace } from '@/components/workspace-context';
import { ChatWindow, ConversationList, EmptyChat } from '@/components/messaging';

const POLL_MS = 5000;
const errorText = (caught: unknown, fallback: string) => (caught instanceof Error ? caught.message : fallback);
const byRecent = (a: Conversation, b: Conversation) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();

type Thread = { conversation: Conversation; messages: ChatMessage[] };

function MessagesView() {
  const { t, refreshUnread } = useWorkspace();
  const router = useRouter();
  const selectedId = useSearchParams().get('c');

  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [listError, setListError] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [thread, setThread] = useState<Thread | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState('');
  const [sendError, setSendError] = useState('');

  // Refs let the polling timer and async callbacks see the latest selection/search without re-subscribing.
  const selectedRef = useRef<string | null>(null);
  const queryRef = useRef('');
  const sendingRef = useRef(0);
  selectedRef.current = selectedId;
  queryRef.current = query;

  const loadList = useCallback(async (q: string, quiet = false) => {
    try {
      const result = await api<{ conversations: Conversation[] }>(`/api/messages${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      if (queryRef.current !== q) return; // a newer search superseded this response
      const open = document.visibilityState === 'visible' ? selectedRef.current : null;
      setConversations(result.conversations.map((item) => (item.id === open ? { ...item, unread: 0 } : item)));
      setListError('');
    } catch (caught) {
      if (!quiet) setListError(errorText(caught, t('messages.loadError')));
    }
  }, [t]);

  const markRead = useCallback(async (id: string) => {
    try {
      await api('/api/messages', { method: 'PATCH', body: JSON.stringify({ requestId: id }) });
      setConversations((previous) => previous?.map((item) => (item.id === id ? { ...item, unread: 0 } : item)) ?? previous);
      void refreshUnread();
    } catch {
      /* read state is best-effort; it is retried on the next poll */
    }
  }, [refreshUnread]);

  const loadThread = useCallback(async (id: string, quiet = false) => {
    try {
      const result = await api<Thread>(`/api/messages?requestId=${encodeURIComponent(id)}`);
      if (selectedRef.current !== id) return;
      if (quiet && sendingRef.current > 0) return; // don't clobber an optimistic message mid-send
      setThread(result);
      setThreadError('');
      if (result.conversation.unread > 0 && document.visibilityState === 'visible') void markRead(id);
    } catch (caught) {
      if (selectedRef.current === id && !quiet) setThreadError(errorText(caught, t('messages.threadError')));
    } finally {
      if (!quiet && selectedRef.current === id) setThreadLoading(false);
    }
  }, [markRead, t]);

  // Debounce the search box, then query the server (name or message text).
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => { void loadList(query); }, [query, loadList]);

  // Open (or deep-link into) a conversation.
  useEffect(() => {
    setThread(null);
    setThreadError('');
    setSendError('');
    if (!selectedId) { setThreadLoading(false); return; }
    setThreadLoading(true);
    void loadThread(selectedId);
  }, [selectedId, loadThread]);

  // Lightweight polling keeps the list and the open thread fresh without websockets.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      void loadList(queryRef.current, true);
      if (selectedRef.current) void loadThread(selectedRef.current, true);
    };
    const timer = window.setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [loadList, loadThread]);

  const select = (id: string) => router.push(`/messages?c=${encodeURIComponent(id)}`, { scroll: false });
  const back = () => router.replace('/messages', { scroll: false });

  const send = async (body: string) => {
    const id = selectedRef.current;
    if (!id) return false;
    setSendError('');
    const pending: ChatMessage = { id: `pending-${Date.now()}`, body, mine: true, createdAt: new Date().toISOString(), pending: true };
    setThread((previous) => (previous?.conversation.id === id ? { ...previous, messages: [...previous.messages, pending] } : previous));
    sendingRef.current += 1;
    try {
      const saved = await api<ChatMessage>('/api/messages', { method: 'POST', body: JSON.stringify({ requestId: id, body }) });
      const message: ChatMessage = { id: saved.id, body: saved.body, mine: true, createdAt: saved.createdAt };
      setThread((previous) => (previous?.conversation.id === id
        ? { ...previous, messages: previous.messages.map((item) => (item.id === pending.id ? message : item)) }
        : previous));
      // Reflect the new preview and ordering immediately, before the next poll.
      setConversations((previous) => previous
        ?.map((item) => (item.id === id
          ? { ...item, unread: 0, lastActivityAt: message.createdAt, lastMessage: { body: message.body, mine: true, createdAt: message.createdAt } }
          : item))
        .sort(byRecent) ?? previous);
      return true;
    } catch (caught) {
      setThread((previous) => (previous?.conversation.id === id
        ? { ...previous, messages: previous.messages.filter((item) => item.id !== pending.id) }
        : previous));
      setSendError(errorText(caught, t('messages.sendError')));
      return false;
    } finally {
      sendingRef.current -= 1;
    }
  };

  const retryThread = () => {
    if (!selectedId) return;
    setThreadError('');
    setThreadLoading(true);
    void loadThread(selectedId);
  };

  return (
    <div className="flex h-[calc(100dvh-13rem)] min-h-[32rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:h-[calc(100dvh-14rem)]">
      {/* On mobile the list is its own view; opening a chat replaces it with a full-screen pane. */}
      <div className={`min-h-0 w-full md:flex md:w-auto ${selectedId ? 'hidden' : 'flex'}`}>
        <ConversationList
          conversations={conversations}
          error={listError}
          selectedId={selectedId}
          search={search}
          onSearch={setSearch}
          onSelect={select}
          onRetry={() => void loadList(query)}
        />
      </div>
      {selectedId ? (
        <ChatWindow
          key={selectedId}
          conversation={thread?.conversation ?? conversations?.find((item) => item.id === selectedId) ?? null}
          messages={thread?.messages ?? null}
          loading={threadLoading}
          error={threadError}
          sendError={sendError}
          onBack={back}
          onRetry={retryThread}
          onSend={send}
        />
      ) : (
        <EmptyChat />
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <main className="flex-1 px-3 py-4 sm:px-4 md:mx-10 md:px-6 md:py-6">
      <Suspense
        fallback={(
          <div className="flex h-64 items-center justify-center text-slate-500">
            <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
          </div>
        )}
      >
        <MessagesView />
      </Suspense>
    </main>
  );
}
