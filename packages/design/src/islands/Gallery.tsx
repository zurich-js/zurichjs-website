import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { sizedSrc, srcsetFor } from '../images.ts';
import { buttonClass, cx } from '../recipes.ts';

export interface GalleryItem {
  id: string;
  kind: 'photo' | 'video';
  src: string;
  poster?: string;
  width?: number;
  height?: number;
  alt: string;
  caption?: string;
  credit?: string;
  /** Shown in the viewer when the gallery mixes events, e.g. "Signals, streams…, 16 Sep 2026". */
  context?: { label: string; href: string };
  /** WebVTT captions for a video, when the editors provide them. */
  captions?: string;
}

interface Props {
  items: GalleryItem[];
  /** Accessible name of the grid, e.g. "Photos from Signals, streams and the state of state". */
  label: string;
  /** Show only the first n thumbnails (the viewer still pages through all). */
  max?: number;
  sizes?: string;
}

/**
 * Thumbnail grid plus a viewer (a native modal <dialog>: focus stays inside,
 * Esc closes, focus returns to the thumbnail). ← and → move between items,
 * with buttons for touch. Videos play only on request. #media-<id> in the URL
 * opens an item directly, so a photo can be shared.
 */
export function Gallery({ items, label, max, sizes = '(min-width: 800px) 25vw, 50vw' }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  // Pages such as /media have several galleries (separate islands, so useId would repeat):
  // each viewer's caption id comes from the gallery's own label.
  const captionId = `gallery-caption-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const shown = max ? items.slice(0, max) : items;
  const cur = open === null ? null : items[open];

  const show = (i: number, from?: HTMLElement | null) => {
    if (from) opener.current = from;
    setOpen(i);
  };
  const close = () => {
    dialog.current?.close();
  };
  // Functional update: fast key presses never read a stale position.
  const step = (d: number) => setOpen((o) => (o === null ? o : (o + d + items.length) % items.length));

  // The open item is in the URL (#media-<id>) so it can be shared. Both effects are layout effects, so they run
  // before the next key press: deferred ones could reopen the viewer, or write the hash back, after Escape closed it.
  useLayoutEffect(() => {
    if (open !== null) history.replaceState(history.state, '', `#media-${items[open]!.id}`);
  }, [open, items]);

  useLayoutEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open !== null && !d.open) d.showModal();
  }, [open]);

  // A shared link (#media-<id>) opens that item.
  useEffect(() => {
    const id = location.hash.match(/^#media-(.+)$/)?.[1];
    const i = id ? items.findIndex((m) => m.id === decodeURIComponent(id)) : -1;
    if (i >= 0) setOpen(i);
  }, [items]);

  // ← and → page through while the viewer is open; a click on the backdrop closes it.
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      // In the video player the arrow keys seek; they page only from elsewhere in the viewer.
      if (e.target instanceof HTMLMediaElement) return;
      e.preventDefault();
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      setOpen((o) => (o === null ? o : (o + delta + items.length) % items.length));
    };
    const onClick = (e: MouseEvent) => {
      if (e.target === d) d.close();
    };
    d.addEventListener('keydown', onKey);
    d.addEventListener('click', onClick);
    return () => {
      d.removeEventListener('keydown', onKey);
      d.removeEventListener('click', onClick);
    };
  }, [items]);

  const onClose = () => {
    setOpen(null);
    if (location.hash.startsWith('#media-')) history.replaceState(history.state, '', location.pathname + location.search);
    opener.current?.focus();
  };

  if (!items.length) return null;

  return (
    <>
      <ul
        class="m-0 p-0 list-none grid grid-cols-[repeat(auto-fill,minmax(min(100%,160px),1fr))] md:grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-3"
        aria-label={label}
      >
        {shown.map((m, i) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={(e) => show(i, e.currentTarget)}
              class="group relative block w-full aspect-4/3 overflow-hidden rounded-card bg-grey p-0 border-0 cursor-zoom-in"
              aria-label={`${m.kind === 'video' ? 'Play clip' : 'Open photo'}: ${m.alt}`}
            >
              <img
                src={sizedSrc(m.kind === 'video' ? (m.poster ?? '') : m.src, 480)}
                srcset={srcsetFor(m.kind === 'video' ? (m.poster ?? '') : m.src)}
                sizes={sizes}
                alt=""
                loading="lazy"
                decoding="async"
                width={m.width}
                height={m.height}
                class={cx('absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-102', m.kind === 'video' && !m.poster && 'hidden')}
              />
              {m.kind === 'video' && (
                <span aria-hidden="true" class="absolute inset-0 flex items-center justify-center">
                  <span class="w-14 h-14 rounded-full bg-black/75 text-white flex items-center justify-center text-card-title pl-1">▶</span>
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        onClose={onClose}
        aria-labelledby={captionId}
        class="m-auto p-0 border-0 bg-ink rounded-card max-w-site w-full max-h-dvh backdrop:bg-black/85 text-white"
      >
        {cur && open !== null && (
          <figure class="m-0 flex flex-col gap-3 p-3 md:p-6">
            <div class="flex items-center justify-between gap-3">
              <span class="text-compact font-bold tabular-nums" aria-live="polite">
                {open + 1} of {items.length}
              </span>
              <button type="button" onClick={close} class={buttonClass({ inverse: true })} autoFocus>
                Close
              </button>
            </div>
            <div class="relative flex items-center justify-center min-h-[40vh]">
              {cur.kind === 'video' ? (
                // Captions are added when editors provide a WebVTT file (ImageKit custom metadata "captions");
                // until then the clip's caption text is shown below the player.
                // oxlint-disable-next-line jsx-a11y/media-has-caption
                <video
                  key={cur.id}
                  controls
                  playsInline
                  preload="none"
                  poster={cur.poster ? sizedSrc(cur.poster, 1600) : undefined}
                  class="max-h-[70vh] max-w-full rounded-card bg-black"
                  aria-label={cur.alt}
                >
                  <source src={cur.src} />
                  {cur.captions && <track kind="captions" src={cur.captions} srcLang="en" label="English" default />}
                  <a href={cur.src} class="text-white">
                    Download the clip
                  </a>
                </video>
              ) : (
                <img
                  key={cur.id}
                  src={sizedSrc(cur.src, 1600)}
                  srcset={srcsetFor(cur.src)}
                  sizes="(min-width: 1200px) 1152px, 100vw"
                  alt={cur.alt}
                  class="max-h-[70vh] max-w-full rounded-card object-contain"
                  decoding="async"
                />
              )}
            </div>
            <figcaption id={captionId} class="flex flex-col gap-1 text-compact">
              {cur.caption ? <span>{cur.caption}</span> : <span class="sr-only">{cur.alt}</span>}
              <span class="text-grey-light">
                {cur.credit}
                {cur.context && (
                  <>
                    {cur.credit ? ' · ' : ''}
                    <a href={cur.context.href} class="text-white underline">
                      {cur.context.label}
                    </a>
                  </>
                )}
              </span>
            </figcaption>
            {items.length > 1 && (
              <div class="flex justify-between gap-3">
                <button type="button" onClick={() => step(-1)} class={buttonClass({ variant: 'plain', inverse: true })}>
                  ← Previous
                </button>
                <button type="button" onClick={() => step(1)} class={buttonClass({ variant: 'plain', inverse: true })}>
                  Next →
                </button>
              </div>
            )}
          </figure>
        )}
      </dialog>
    </>
  );
}
