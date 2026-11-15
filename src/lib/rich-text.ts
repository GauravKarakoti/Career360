// Converts the messy description formats we receive (HTML, double-escaped HTML,
// bullet-character plain text, Markdown) into one small Markdown subset:
//   ## / ### headings, "- " bullets, **bold**, blank-line separated paragraphs.
// The same subset is rendered by <RichDescription /> without dangerouslySetInnerHTML.

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>',
  ndash: '–', mdash: '—', hellip: '…', bull: '•', middot: '·',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', copy: '©', reg: '®', euro: '€',
};

export function decodeEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (whole, body: string) => {
    if (body[0] === '#') {
      const code = body[1].toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ' ';
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? ' ';
  });
}

const stripTags = (s: string) => s.replace(/<[^>]+>/g, '');
const inline = (s: string) => stripTags(s).replace(/\s+/g, ' ').trim();

/** True when the text still contains HTML tags or HTML entities. */
export function looksLikeMarkup(text: string): boolean {
  return /<\/?[a-z][^>]*>?/i.test(text) || /&(lt|gt|amp|nbsp|quot|#\d+|#x[0-9a-f]+);/i.test(text);
}

export function htmlToMarkdown(raw: string): string {
  if (!raw) return '';
  let s = raw.replace(/\r\n?/g, '\n');

  // Some APIs ship HTML escaped (&lt;p&gt;...). Unescape it so the tag rules below apply.
  if (!/<[a-z][^>]*>/i.test(s) && /&lt;\/?[a-z][^&]*&gt;/i.test(s)) s = decodeEntities(s);

  const hasHtml = /<[a-z][^>]*>/i.test(s);
  if (hasHtml) {
    // Source HTML uses real newlines only as whitespace.
    s = s.replace(/\n+/g, ' ');
  }

  s = s
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(style|script|svg|noscript|iframe|head)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<img[^>]*>/gi, ' ')
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, t: string) => {
      const text = inline(t);
      if (!text) return ' ';
      // Keep the whitespace that sat inside the tag, but outside the ** markers.
      const lead = /^\s/.test(stripTags(t)) ? ' ' : '';
      const trail = /\s$/.test(stripTags(t)) ? ' ' : '';
      return `${lead}**${text}**${trail}`;
    })
    .replace(/<h[1-2]\b[^>]*>([\s\S]*?)<\/h[1-2]>/gi, (_, t: string) => {
      const text = inline(t);
      return text ? `\n\n## ${text}\n\n` : '\n\n';
    })
    .replace(/<h[3-6]\b[^>]*>([\s\S]*?)<\/h[3-6]>/gi, (_, t: string) => {
      const text = inline(t);
      return text ? `\n\n### ${text}\n\n` : '\n\n';
    })
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, t: string) => {
      const text = t.replace(/<\/?(p|div|br)\b[^>]*>/gi, ' ');
      const flat = inline(text);
      return flat ? `\n- ${flat}` : '';
    })
    .replace(/<\/(ul|ol)>/gi, '\n\n')
    .replace(/<(ul|ol)\b[^>]*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|header|footer|tr|table|blockquote)>/gi, '\n\n')
    .replace(/<(p|div|section|article|header|footer|tr|table|blockquote)\b[^>]*>/gi, '\n\n');

  // A description cut off mid-tag (e.g. `<li style="font-size: 10pt;"><span sty`) would
  // otherwise leak raw markup, so drop any unterminated trailing tag first.
  s = s.replace(/<[^>]*$/, '');

  // Remove whatever tags are left, then decode entities (decoding last means
  // "&lt;script&gt;" in the text can never turn back into a tag).
  s = decodeEntities(stripTags(s));

  const lines = s
    .replace(/[ ​]/g, ' ')
    .split('\n')
    .map((line) =>
      line
        .replace(/[ \t]+/g, ' ')
        .replace(/^\s*[•●▪◦·*]\s+/, '- ') // plain-text bullets
        .replace(/^\s*-\s+/, '- ')
        .replace(/\*{4,}/g, '')
        .trim()
    );

  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Markdown subset -> plain text (for search, evidence quotes, AI prompts). */
export function markdownToPlain(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^-\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Cut at a paragraph/line boundary so we never leave a dangling half-bullet or `**`. */
export function truncateMarkdown(md: string, max: number): string {
  if (md.length <= max) return md;
  const cut = md.slice(0, max);
  const boundary = Math.max(cut.lastIndexOf('\n\n'), cut.lastIndexOf('\n'));
  const out = boundary > max * 0.6 ? cut.slice(0, boundary) : cut.replace(/\s+\S*$/, '');
  const trimmed = out.trim();
  return ((trimmed.match(/\*\*/g) ?? []).length % 2 ? trimmed.replace(/\*\*(?!.*\*\*)/, '') : trimmed) + ' …';
}

export type Block =
  | { type: 'heading'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'paragraph'; text: string };

export function parseBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: string[] | null = null;
  const flushPara = () => {
    if (para.length) blocks.push({ type: 'paragraph', text: para.join(' ') });
    para = [];
  };
  const flushList = () => {
    if (list?.length) blocks.push({ type: 'list', items: list });
    list = null;
  };
  for (const line of md.split('\n')) {
    if (!line.trim()) {
      flushPara();
      flushList();
    } else if (/^#{2,6}\s+/.test(line)) {
      flushPara();
      flushList();
      blocks.push({ type: 'heading', text: line.replace(/^#{2,6}\s+/, '') });
    } else if (line.startsWith('- ')) {
      flushPara();
      (list ??= []).push(line.slice(2));
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return blocks;
}
