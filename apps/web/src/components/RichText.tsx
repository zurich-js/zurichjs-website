import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { textBlocks, type Inline } from '@zurichjs/events';

interface Props {
  text: string | null | undefined;
  /** Classes for the wrapper; paragraphs and lists inherit size and colour. */
  class?: string;
  /**
   * Show at most this many lines, ending in "…", with a "Read more" button when
   * the text is longer. The full text stays in the page (search engines, screen
   * readers); only its height is limited until someone expands it.
   */
  clampLines?: number;
  /** Button labels for the clamp, e.g. ['See more', 'See less']. */
  moreLabels?: [string, string];
  /** Classes for the More/Less toggle, when it should look different from the default underlined text. */
  moreClass?: string;
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
export function RichText({ text, class: cls, clampLines, moreLabels = ['Read more', 'Show less'], moreClass }: Props) {
  const blocks = textBlocks(text);
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    if (!clampLines || !box.current) return;
    const el = box.current;
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 2);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [clampLines]);

  if (!blocks.length) return null;
  const clamped = !!clampLines && !expanded;
  const body = blocks.map((b, i) =>
    b.kind === 'ul' ? (
      <ul key={i} class="m-0 pl-6 list-disc [&>li+li]:mt-1.5">
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
  );

  if (!clampLines) return <div class={`flex flex-col gap-3 ${cls ?? ''}`}>{body}</div>;

  // Block children spaced with margins (not flex), so line clamping counts lines across paragraphs and lists.
  return (
    <div class={`flex flex-col items-start gap-1.5 ${cls ?? ''}`}>
      <div
        ref={box}
        id={id}
        class="[&>*+*]:mt-3"
        style={clamped ? { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: String(clampLines), overflow: 'hidden' } : undefined}
      >
        {body}
      </div>
      {(overflows || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((e) => !e)}
          class={moreClass ?? 'p-0 bg-transparent border-0 font-bold text-[16px] text-black underline underline-offset-[3px] cursor-pointer'}
        >
          {expanded ? moreLabels[1] : moreLabels[0]}
        </button>
      )}
    </div>
  );
}
