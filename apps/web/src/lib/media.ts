/** Helpers between the media collection (@zurichjs/content) and the Gallery island. */
import type { MediaItem } from '@zurichjs/content';
import { dateShort, type Event } from '@zurichjs/events';
import type { GalleryItem } from '@zurichjs/design/islands/Gallery';

export const mediaHref = (slug: string) => `/media/${slug}`;

export function toGallery(items: MediaItem[], events?: Event[]): GalleryItem[] {
  const bySlug = new Map((events ?? []).map((e) => [e.slug, e]));
  return items.map((m) => {
    const ev = m.eventSlug ? bySlug.get(m.eventSlug) : undefined;
    return {
      id: m.id,
      kind: m.kind,
      src: m.src,
      poster: m.poster,
      width: m.width,
      height: m.height,
      alt: m.alt,
      caption: m.caption,
      credit: m.credit,
      captions: m.captions,
      context: ev ? { label: `${ev.title}${ev.startsAt ? `, ${dateShort(ev.startsAt)}` : ''}`, href: `/events/${ev.slug}` } : undefined,
    };
  });
}

/** "24 photos and 2 videos", "1 photo". */
export function countLabel(items: MediaItem[]) {
  const p = items.filter((m) => m.kind === 'photo').length;
  const v = items.filter((m) => m.kind === 'video').length;
  const part = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  return [p ? part(p, 'photo') : '', v ? part(v, 'video') : ''].filter(Boolean).join(' and ');
}
