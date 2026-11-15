'use client';

import { Fragment, useMemo, useState } from 'react';
import { parseBlocks } from '@/lib/rich-text';
import { useWorkspace } from '@/components/workspace-context';

function Inline({ text }: { text: string }) {
  // Only **bold** is supported; everything else renders as plain text (React escapes it).
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
          <strong key={i} className="font-semibold text-slate-800">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

const COLLAPSE_AT = 420;

export function RichDescription({ text }: { text: string }) {
  const { t } = useWorkspace();
  const [expanded, setExpanded] = useState(false);
  const blocks = useMemo(() => parseBlocks(text), [text]);
  const collapsible = text.length > COLLAPSE_AT;
  const collapsed = collapsible && !expanded;

  return (
    <div className="mt-3">
      <div
        className={`relative space-y-2 text-sm leading-relaxed text-slate-700 ${
          collapsed ? 'max-h-36 overflow-hidden' : ''
        }`}
      >
        {blocks.map((block, i) => {
          if (block.type === 'heading') {
            return (
              <h4 key={i} className="pt-1 text-sm font-semibold text-slate-900">
                <Inline text={block.text} />
              </h4>
            );
          }
          if (block.type === 'list') {
            return (
              <ul key={i} className="list-disc space-y-0.5 pl-5 marker:text-slate-400">
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Inline text={item} />
                  </li>
                ))}
              </ul>
            );
          }
          return (
            <p key={i}>
              <Inline text={block.text} />
            </p>
          );
        })}
        {collapsed && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent"
          />
        )}
      </div>
      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-1 text-xs font-medium text-brand-700 hover:underline"
        >
          {expanded ? t('card.showLess') : t('card.showMore')}
        </button>
      )}
    </div>
  );
}
