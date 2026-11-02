import { textBlocks, type Inline } from '@zurichjs/events';

interface Props {
  text: string | null | undefined;
  /** Classes for the wrapper; paragraphs and lists inherit size and colour. */
  class?: string;
}

const line = (parts: Inline[]) =>
  parts.map((p, i) =>
    'href' in p ? (
      <a key={i} href={p.href} rel="nofollow noopener" target="_blank" class="underline underline-offset-[3px] break-words">
        {p.text}
      </a>
    ) : (
      p.text
    ),
  );

/**
 * Talk descriptions and bios as written: paragraphs, line breaks and "- " lists.
 * Works in islands and statically in Astro pages. Text is rendered as text nodes, never as HTML.
 */
export function RichText({ text, class: cls }: Props) {
  const blocks = textBlocks(text);
  if (!blocks.length) return null;
  return (
    <div class={`flex flex-col gap-3 ${cls ?? ''}`}>
      {blocks.map((b, i) =>
        b.kind === 'ul' ? (
          <ul key={i} class="m-0 pl-6 list-disc flex flex-col gap-1.5">
            {b.items.map((it, j) => (
              <li key={j}>{line(it)}</li>
            ))}
          </ul>
        ) : (
          <p key={i} class="m-0">
            {b.lines.map((l, j) => (
              <>
                {j > 0 && <br />}
                {line(l)}
              </>
            ))}
          </p>
        ),
      )}
    </div>
  );
}
