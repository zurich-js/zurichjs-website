/**
 * The media collection: photos and videos taken at events, shared by the
 * archive (/media), event galleries, speaker profiles, the home page, the
 * timeline and the partners page.
 *
 * Sources, merged at build time:
 *  - ImageKit (the existing archive the old site listed at runtime with
 *    IMAGEKIT_PRIVATE_KEY): one top-level folder per event, named after the
 *    event's URL slug (origin/main: src/pages/media.tsx).
 *  - Sanity `events.photos`.
 * Promotional artwork (Sanity `events.image`, or ImageKit files tagged
 * `promo`) is never part of a gallery.
 *
 * Editorial metadata, set in ImageKit (tags and custom metadata) so editors
 * can refresh featured picks without a code change:
 *   tags   featured-home · featured-partners · speaker:<speaker id> ·
 *          talk:<talk id> · milestone:<id> · promo (excluded) · hidden (excluded)
 *   custom metadata   caption · credit · alt · captions (WebVTT URL, videos)
 */
import type { Event } from '@zurichjs/events';

export interface MediaItem {
  id: string;
  kind: 'photo' | 'video';
  src: string;
  /** For videos: an image shown before playing. */
  poster?: string;
  width?: number;
  height?: number;
  alt: string;
  caption?: string;
  credit?: string;
  /** WebVTT captions for a video (ImageKit custom metadata "captions"). */
  captions?: string;
  /** Event URL slug, when the item belongs to an event. */
  eventSlug?: string;
  /** Top-level ImageKit folder (the event slug, or a collection such as the conference). */
  folder?: string;
  tags: string[];
  createdAt?: string;
}

export interface MediaCollection {
  items: MediaItem[];
  /** "ok", or why ImageKit was not read (the site then shows Sanity photos only). */
  imagekit: 'ok' | 'not-configured' | 'failed' | 'sample';
}

type Env = Record<string, string | undefined>;

const VIDEO = /\.(mp4|mov|m4v|webm)$/i;

export interface ImageKitFile {
  fileId: string;
  name: string;
  filePath: string;
  url: string;
  fileType?: string;
  mime?: string;
  width?: number;
  height?: number;
  tags?: string[] | null;
  customMetadata?: Record<string, unknown> | null;
  createdAt?: string;
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

/** One ImageKit file → a media item, or null when it is excluded (promo, hidden, not a photo or video). */
export function fromImageKit(f: ImageKitFile, eventTitle: (slug: string) => string | undefined): MediaItem | null {
  const tags = (f.tags ?? []).map((t) => t.trim()).filter(Boolean);
  if (tags.some((t) => /^(promo|hidden)$/i.test(t))) return null;
  const video = VIDEO.test(f.name) || f.mime?.startsWith('video/') === true;
  if (!video && f.fileType && f.fileType !== 'image') return null;
  const folder = f.filePath.split('/').filter(Boolean)[0];
  const cm = f.customMetadata ?? {};
  const title = folder ? eventTitle(folder) : undefined;
  return {
    id: `ik-${f.fileId}`,
    kind: video ? 'video' : 'photo',
    src: f.url,
    poster: video ? `${f.url.split('?')[0]}/ik-thumbnail.jpg?tr=w-960` : undefined,
    width: f.width || undefined,
    height: f.height || undefined,
    alt: str(cm.alt) ?? (title ? `${video ? 'Video' : 'Photo'} from ${title}` : video ? 'Video from a ZurichJS event' : 'Photo from a ZurichJS event'),
    caption: str(cm.caption),
    credit: str(cm.credit),
    captions: video ? str(cm.captions) : undefined,
    eventSlug: title ? folder : undefined,
    folder,
    tags,
    createdAt: f.createdAt,
  };
}

/** Lists every file with ImageKit's Admin API (Basic auth with the private key), 1000 per page. */
export async function listImageKit(privateKey: string, fetchImpl: typeof fetch = fetch): Promise<ImageKitFile[]> {
  const out: ImageKitFile[] = [];
  const auth = `Basic ${btoa(`${privateKey}:`)}`;
  for (let skip = 0; skip < 20_000; skip += 1000) {
    const url = `https://api.imagekit.io/v1/files?type=file&limit=1000&skip=${skip}&sort=ASC_CREATED`;
    const res = await fetchImpl(url, { headers: { authorization: auth }, signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`ImageKit list failed: HTTP ${res.status}`);
    const page = (await res.json()) as ImageKitFile[];
    out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}

/** Sanity event photos as media items. */
export function fromSanityPhotos(events: Event[]): MediaItem[] {
  return events.flatMap((e) =>
    e.photos.map((p, i) => ({
      id: `sanity-${e.slug}-${i}`,
      kind: 'photo' as const,
      src: p.src,
      width: p.width,
      height: p.height,
      alt: p.alt || `Photo from ${e.title}`,
      credit: e.photoCredit,
      eventSlug: e.slug,
      folder: e.slug,
      tags: [],
    })),
  );
}

/**
 * Builds the collection. ImageKit is optional: without a key, or when the API
 * fails, the build continues with Sanity photos and says so in the log.
 */
export async function loadMedia(env: Env, events: Event[], fetchImpl: typeof fetch = fetch, log: (m: string) => void = console.warn): Promise<MediaCollection> {
  const sanity = fromSanityPhotos(events);
  const key = env.IMAGEKIT_PRIVATE_KEY;
  if (!key) {
    log('[media] IMAGEKIT_PRIVATE_KEY missing; only Sanity event photos are shown.');
    return { items: sanity, imagekit: 'not-configured' };
  }
  try {
    const titles = new Map(events.map((e) => [e.slug, e.title]));
    const credits = new Map(events.map((e) => [e.slug, e.photoCredit]));
    const files = await listImageKit(key, fetchImpl);
    const ik = files
      .map((f) => fromImageKit(f, (s) => titles.get(s)))
      .filter((m): m is MediaItem => !!m)
      .map((m) => ({ ...m, credit: m.credit ?? (m.eventSlug ? credits.get(m.eventSlug) : undefined) }));
    return { items: [...ik, ...sanity], imagekit: 'ok' };
  } catch (err) {
    log(`[media] ImageKit could not be read (${(err as Error).message}); only Sanity event photos are shown.`);
    return { items: sanity, imagekit: 'failed' };
  }
}

/* -------------------------------------------------------------------------- */
/* Queries over the collection                                                 */
/* -------------------------------------------------------------------------- */

export const mediaForEvent = (items: MediaItem[], slug: string) => items.filter((m) => m.eventSlug === slug);
export const mediaTagged = (items: MediaItem[], tag: string) => items.filter((m) => m.tags.some((t) => t.toLowerCase() === tag.toLowerCase()));
export const mediaInFolder = (items: MediaItem[], folder?: string) => (folder ? items.filter((m) => m.folder === folder) : []);

/**
 * A curated pick without repeats: tagged items first, then photos from the
 * most recent events, skipping anything already used on the page.
 */
export function pickFeatured(items: MediaItem[], tag: string, n: number, used = new Set<string>()): MediaItem[] {
  const photos = items.filter((m) => m.kind === 'photo' && !used.has(m.src));
  const tagged = mediaTagged(photos, tag);
  const picked = tagged.slice(0, n);
  for (const m of picked) used.add(m.src);
  return picked;
}

/** Counts for the archive heading: "816 photos and 16 videos from 14 events". */
export function mediaCounts(items: MediaItem[]) {
  const events = new Set(items.flatMap((m) => (m.eventSlug ? [m.eventSlug] : [])));
  return { photos: items.filter((m) => m.kind === 'photo').length, videos: items.filter((m) => m.kind === 'video').length, events: events.size };
}
