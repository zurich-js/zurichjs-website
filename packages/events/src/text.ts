/**
 * Plain text from Sanity (talk descriptions, speaker bios) as paragraphs and
 * lists. Editors and speakers write blank lines between paragraphs, "- ",
 * "* " or "• " for list items (sometimes with blank lines between items),
 * Windows line endings, and bare URLs. Nothing here produces HTML: renderers
 * output text nodes, so the content is always escaped.
 */

export type Inline = { text: string } | { href: string; text: string };
export type TextBlock = { kind: 'p'; lines: Inline[][] } | { kind: 'ul'; items: Inline[][] };

const BULLET = /^\s*(?:[-*•]|–)\s+/;
const URL = /\bhttps?:\/\/[^\s<>"')\]]+[^\s<>"')\].,;:!?]/g;

/** Splits a line into text and links. Only http(s) URLs become links. */
export function inlines(line: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of line.matchAll(URL)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ text: line.slice(last, i) });
    out.push({ href: m[0], text: m[0] });
    last = i + m[0].length;
  }
  if (last < line.length) out.push({ text: line.slice(last) });
  return out;
}

export function textBlocks(input: string | null | undefined): TextBlock[] {
  const text = (input ?? '').replace(/\r\n?/g, '\n').trim();
  if (!text) return [];
  const blocks: TextBlock[] = [];
  for (const chunk of text.split(/\n[ \t]*\n+/)) {
    const lines = chunk
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    let para: string[] = [];
    const flush = () => {
      if (para.length) blocks.push({ kind: 'p', lines: para.map(inlines) });
      para = [];
    };
    for (const line of lines) {
      if (BULLET.test(line)) {
        flush();
        const item = inlines(line.replace(BULLET, ''));
        const prev = blocks.at(-1);
        // Items separated by blank lines still form one list.
        if (prev?.kind === 'ul') prev.items.push(item);
        else blocks.push({ kind: 'ul', items: [item] });
      } else {
        para.push(line);
      }
    }
    flush();
  }
  return blocks;
}

/** One line of plain text (meta descriptions, cards): list markers and line breaks removed. */
export function plainText(input: string | null | undefined): string {
  return textBlocks(input)
    .flatMap((b) => (b.kind === 'p' ? b.lines : b.items).map((l) => l.map((x) => x.text).join('')))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
