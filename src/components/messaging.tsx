'use client';

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, MessageCircle, Search, SendHorizontal, User } from 'lucide-react';
import { useWorkspace } from '@/components/workspace-context';
import type { ChatMessage, Conversation } from '@/lib/client-api';

// ---------- formatting ----------

const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
const daysAgo = (date: Date) => Math.round((dayStart(new Date()) - dayStart(date)) / 86400000);

const clockTime = (iso: string, lang: string) =>
  new Date(iso).toLocaleTimeString(lang, { hour: 'numeric', minute: '2-digit' });

function listTime(iso: string, lang: string) {
  const date = new Date(iso);
  const diff = daysAgo(date);
  if (diff <= 0) return clockTime(iso, lang);
  if (diff < 7) return date.toLocaleDateString(lang, { weekday: 'short' });
  return date.toLocaleDateString(lang, { day: 'numeric', month: 'short' });
}

function dayLabel(iso: string, lang: string) {
  const date = new Date(iso);
  const diff = daysAgo(date);
  if (diff === 0 || diff === 1) {
    const text = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }).format(-diff, 'day');
    return text.charAt(0).toLocaleUpperCase(lang) + text.slice(1);
  }
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long', ...(sameYear ? {} : { year: 'numeric' }) });
}

// ---------- avatar ----------

const TONES = [
  'bg-brand-100 text-brand-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-800',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
];

function Avatar({ id, name, isPrivate, size = 'md' }: { id: string; name: string; isPrivate: boolean; size?: 'md' | 'lg' }) {
  const dimensions = size === 'lg' ? 'h-10 w-10 text-sm' : 'h-11 w-11 text-sm';
  if (isPrivate) {
    return (
      <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 ${dimensions}`}>
        <User className="h-5 w-5" />
      </span>
    );
  }
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = Array.from(words[0] ?? '?')[0];
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] : '';
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${TONES[hash % TONES.length]} ${dimensions}`}>
      {(first + last).toLocaleUpperCase()}
    </span>
  );
}

// ---------- conversation list ----------

function ListSkeleton() {
  return (
    <ul aria-hidden className="divide-y divide-slate-100">
      {Array.from({ length: 6 }, (_, index) => (
        <li key={index} className="flex animate-pulse items-center gap-3 px-4 py-3">
          <span className="h-11 w-11 shrink-0 rounded-full bg-slate-200" />
          <span className="min-w-0 flex-1 space-y-2">
            <span className="block h-3 w-2/5 rounded bg-slate-200" />
            <span className="block h-3 w-4/5 rounded bg-slate-100" />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ConversationList({
  conversations, error, selectedId, search, onSearch, onSelect, onRetry,
}: {
  conversations: Conversation[] | null;
  error: string;
  selectedId: string | null;
  search: string;
  onSearch: (value: string) => void;
  onSelect: (id: string) => void;
  onRetry: () => void;
}) {
  const { t, lang } = useWorkspace();
  const empty = conversations?.length === 0;

  return (
    <section aria-label={t('messages.conversations')} className="flex min-h-0 w-full flex-col md:w-80 md:shrink-0 md:border-r md:border-slate-200 lg:w-96">
      <div className="border-b border-slate-200 p-4">
        <h1 className="text-lg font-bold text-slate-900">{t('messages.title')}</h1>
        <div className="relative mt-3">
          <label htmlFor="conversation-search" className="sr-only">{t('messages.searchLabel')}</label>
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="conversation-search"
            type="search"
            value={search}
            maxLength={80}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={t('messages.searchPlaceholder')}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:bg-white"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && !conversations ? (
          <div role="alert" className="m-4 rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-inset ring-red-200">
            <p className="flex items-start gap-2"><AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /> {error}</p>
            <button type="button" onClick={onRetry} className="mt-2 text-xs font-semibold underline">{t('messages.retry')}</button>
          </div>
        ) : !conversations ? (
          <ListSkeleton />
        ) : empty ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <MessageCircle className="h-6 w-6" />
            </span>
            {search.trim() ? (
              <p className="mt-3 text-sm text-slate-500">{t('messages.noResults')}</p>
            ) : (
              <>
                <h2 className="mt-3 text-sm font-semibold text-slate-900">{t('messages.emptyTitle')}</h2>
                <p className="mt-1 text-sm text-slate-500">{t('messages.emptyBody')}</p>
                <Link href="/connections" className="mt-4 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
                  {t('messages.goToConnections')}
                </Link>
              </>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {conversations.map((conversation) => {
              const selected = conversation.id === selectedId;
              const unread = conversation.unread > 0;
              const last = conversation.lastMessage;
              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(conversation.id)}
                    aria-current={selected ? 'true' : undefined}
                    className={`flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition ${
                      selected ? 'border-brand-600 bg-brand-50' : 'border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <Avatar id={conversation.id} name={conversation.counterpart.name} isPrivate={conversation.counterpart.private} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={`truncate text-sm ${unread ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>
                          {conversation.counterpart.name}
                        </span>
                        {last && (
                          <time dateTime={last.createdAt} className={`shrink-0 text-[11px] ${unread ? 'font-semibold text-brand-700' : 'text-slate-400'}`}>
                            {listTime(last.createdAt, lang)}
                          </time>
                        )}
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className={`truncate text-xs ${unread ? 'font-medium text-slate-800' : 'text-slate-500'}`}>
                          {last ? `${last.mine ? t('messages.you') : ''}${last.body}` : t('messages.noPreview')}
                        </span>
                        {unread && (
                          <span
                            aria-label={t('messages.unreadLabel', { count: conversation.unread })}
                            className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white"
                          >
                            {conversation.unread > 99 ? '99+' : conversation.unread}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

// ---------- chat window ----------

export function EmptyChat() {
  const { t } = useWorkspace();
  return (
    <div className="hidden min-w-0 flex-1 flex-col items-center justify-center bg-slate-50/60 px-6 text-center md:flex">
      <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm ring-1 ring-slate-200">
        <MessageCircle className="h-7 w-7" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-slate-900">{t('messages.selectTitle')}</h2>
      <p className="mt-1 max-w-xs text-sm text-slate-500">{t('messages.selectBody')}</p>
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div aria-hidden className="flex animate-pulse flex-col gap-3 p-4">
      <span className="h-9 w-2/5 rounded-2xl bg-slate-200" />
      <span className="ml-auto h-9 w-1/2 rounded-2xl bg-slate-200" />
      <span className="h-9 w-1/3 rounded-2xl bg-slate-200" />
      <span className="ml-auto h-9 w-2/5 rounded-2xl bg-slate-200" />
    </div>
  );
}

export function ChatWindow({
  conversation, messages, loading, error, sendError, onBack, onRetry, onSend,
}: {
  conversation: Conversation | null;
  messages: ChatMessage[] | null;
  loading: boolean;
  error: string;
  sendError: string;
  onBack: () => void;
  onRetry: () => void;
  onSend: (body: string) => Promise<boolean>;
}) {
  const { t, lang } = useWorkspace();
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nearBottom = useRef(true);
  const seenFirstLoad = useRef(false);
  const lastMessageId = useRef<string | null>(null);

  // Jump to the newest message when a conversation first loads; afterwards follow new
  // messages only when you sent them or were already reading the bottom of the thread.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !messages) return;
    const last = messages[messages.length - 1];
    if (!seenFirstLoad.current) {
      list.scrollTop = list.scrollHeight;
      seenFirstLoad.current = true;
    } else if (last && last.id !== lastMessageId.current && (last.mine || nearBottom.current)) {
      list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
    }
    lastMessageId.current = last?.id ?? null;
  }, [messages]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 128)}px`;
  }, [draft]);

  const submit = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    const sent = await onSend(body);
    if (!sent) setDraft((current) => current || body);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter adds a line; never fire while an IME (e.g. Hindi) is composing.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  };

  const person = conversation?.counterpart;
  const details = person ? [person.industry, person.location].filter(Boolean).join(' · ') : '';

  return (
    // Full-screen on mobile, a normal pane beside the list from md up.
    <section className="pane-enter fixed inset-0 z-40 flex min-w-0 flex-col bg-white pb-[env(safe-area-inset-bottom)] md:static md:z-auto md:flex-1 md:pb-0">
      <header className="flex items-center gap-3 border-b border-slate-200 px-3 py-3 sm:px-4">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('messages.back')}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
        >
          <ArrowLeft aria-hidden className="h-5 w-5" />
        </button>
        {person && conversation ? (
          <>
            <Avatar id={conversation.id} name={person.name} isPrivate={person.private} size="lg" />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-slate-900">{person.name}</h2>
              <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500">
                {person.private ? (
                  t('messages.privateNote')
                ) : (
                  <>
                    {person.roles.map((role) => (
                      <span key={role} className="rounded-full bg-brand-50 px-2 py-px font-medium text-brand-700 ring-1 ring-inset ring-brand-200">{role}</span>
                    ))}
                    {details && <span className="truncate">{details}</span>}
                  </>
                )}
              </p>
            </div>
          </>
        ) : (
          <span aria-hidden className="flex animate-pulse items-center gap-3">
            <span className="h-10 w-10 rounded-full bg-slate-200" />
            <span className="h-3 w-32 rounded bg-slate-200" />
          </span>
        )}
      </header>

      {error && !messages ? (
        <div role="alert" className="m-4 rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-inset ring-red-200">
          <p className="font-semibold">{t('messages.threadError')}</p>
          <p className="mt-1">{error}</p>
          <button type="button" onClick={onRetry} className="mt-2 text-xs font-semibold underline">{t('messages.retry')}</button>
        </div>
      ) : (
        <div
          ref={listRef}
          onScroll={(event) => {
            const el = event.currentTarget;
            nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
          }}
          aria-label={t('messages.historyLabel')}
          aria-busy={loading}
          className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-3 py-4 sm:px-4"
        >
          {!messages || loading ? (
            <ThreadSkeleton />
          ) : messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">{t('messages.noMessages')}</p>
          ) : (
            <ol className="space-y-1.5">
              {messages.map((message, index) => {
                const previous = messages[index - 1];
                const newDay = !previous || daysAgo(new Date(previous.createdAt)) !== daysAgo(new Date(message.createdAt));
                return (
                  <li key={message.id}>
                    {newDay && (
                      <p className="my-3 text-center text-[11px] font-medium text-slate-400">{dayLabel(message.createdAt, lang)}</p>
                    )}
                    <div className={`flex flex-col ${message.mine ? 'items-end' : 'items-start'}`}>
                      <p
                        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[75%] ${
                          message.mine
                            ? 'rounded-br-md bg-brand-600 text-white'
                            : 'rounded-bl-md bg-white text-slate-800 ring-1 ring-inset ring-slate-200'
                        } ${message.pending ? 'opacity-60' : ''}`}
                      >
                        {message.body}
                      </p>
                      <time dateTime={message.createdAt} className="mt-0.5 px-1 text-[11px] text-slate-400">
                        {clockTime(message.createdAt, lang)}
                      </time>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}

      {sendError && (
        <p role="alert" className="flex items-start gap-2 border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-800">
          <AlertCircle aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {sendError}
        </p>
      )}
      <form
        onSubmit={(event) => { event.preventDefault(); void submit(); }}
        className="flex items-end gap-2 border-t border-slate-200 bg-white p-3 sm:p-4"
      >
        <label htmlFor="message-input" className="sr-only">{t('messages.inputLabel')}</label>
        <textarea
          id="message-input"
          ref={inputRef}
          rows={1}
          value={draft}
          maxLength={2000}
          disabled={!messages}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('messages.inputPlaceholder')}
          className="max-h-32 min-h-10 flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={!draft.trim() || !messages}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <SendHorizontal aria-hidden className="h-4 w-4" />
          <span className="hidden sm:inline">{t('messages.send')}</span>
          <span className="sr-only sm:hidden">{t('messages.send')}</span>
        </button>
      </form>
    </section>
  );
}
