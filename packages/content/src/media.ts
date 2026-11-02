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
 * Videos are short clips from the evening. ZurichJS does not record talks,
 * so a clip is never described as a talk recording.
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
  /**
   * Whether the ImageKit archive was read:
   *  - "ok" (and "sample"): the archive is complete, so "no photos" means none exist
   *  - "not-configured": no IMAGEKIT_PRIVATE_KEY in this build
   *  - "failed": the listing failed (network, auth, unexpected answer)
   * For the last two, pages say the archive is unavailable, never "coming soon".
   */
  imagekit: 'ok' | 'not-configured' | 'failed' | 'sample';
}

type Env = Record<string, string | undefined>;

/** True when the collection is the complete archive, so an event without items really has none. */
export const archiveComplete = (c: Pick<MediaCollection, 'imagekit'>) => c.imagekit === 'ok' || c.imagekit === 'sample';

/**
 * Thrown when a build must have the archive (Netlify production, or
 * MEDIA_REQUIRE_IMAGEKIT=1) and cannot read it. loadContent never falls back
 * to sample content for it: the build fails and the previous deploy stays live.
 */
export class MediaUnavailableError extends Error {
  override name = 'MediaUnavailableError';
}

/**
 * Production builds need the archive: shipping an empty /media would hide 800+ photos.
 * `MEDIA_REQUIRE_IMAGEKIT` decides ("1" or "0", set per context in netlify.toml);
 * without it, Netlify production requires it. The draft preview site never does.
 */
export const imageKitRequired = (env: Env) =>
  env.SANITY_PERSPECTIVE !== 'drafts' && (env.MEDIA_REQUIRE_IMAGEKIT ? env.MEDIA_REQUIRE_IMAGEKIT === '1' : env.CONTEXT === 'production');

const VIDEO = /\.(mp4|mov|m4v|webm)$/i;
const PHOTO = /\.(jpe?g|png|webp|avif|gif|heic|heif|tiff?)$/i;

/** The Admin API's file object (GET /v1/files). Only the fields the site reads. */
export interface ImageKitFile {
  fileId: string;
  name: string;
  filePath: string;
  url: string;
  /** "image" or "non-image" (videos are "non-image"). */
  fileType?: string;
  mime?: string;
  width?: number;
  height?: number;
  tags?: string[] | null;
  customMetadata?: Record<string, unknown> | null;
  createdAt?: string;
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined);

/**
 * A video's first frame from ImageKit, without transformations (images.ts sizes it where it is used).
 * Phone clips (.MOV) are listed with ImageKit's MP4 rendition, ".../IMG_1.MOV/ik-video.mp4"; the
 * thumbnail hangs off the original file.
 */
export const imageKitPoster = (url: string) => `${url.split('?')[0]!.replace(/\/ik-video\.mp4$/, '')}/ik-thumbnail.jpg`;

/** Photo, video, or neither (documents, archives): by MIME type, then file type, then extension. */
export function imageKitKind(f: Pick<ImageKitFile, 'name' | 'mime' | 'fileType'>): 'photo' | 'video' | null {
  if (f.mime?.startsWith('video/') || VIDEO.test(f.name)) return 'video';
  if (f.mime?.startsWith('image/') || f.fileType === 'image' || PHOTO.test(f.name)) return 'photo';
  return null;
}

/** One ImageKit file → a media item, or null when it is excluded (promo, hidden, not a photo or video). */
export function fromImageKit(f: ImageKitFile, eventTitle: (slug: string) => string | undefined): MediaItem | null {
  const tags = (f.tags ?? []).map((t) => t.trim()).filter(Boolean);
  if (tags.some((t) => /^(promo|hidden)$/i.test(t))) return null;
  const kind = imageKitKind(f);
  if (!kind || !f.url || !f.filePath) return null;
  const video = kind === 'video';
  const folder = f.filePath.split('/').filter(Boolean)[0];
  const cm = f.customMetadata ?? {};
  const title = folder ? eventTitle(folder) : undefined;
  const what = video ? 'Short clip' : 'Photo';
  return {
    id: `ik-${f.fileId}`,
    kind,
    src: f.url,
    poster: video ? imageKitPoster(f.url) : undefined,
    width: num(f.width),
    height: num(f.height),
    alt: str(cm.alt) ?? `${what} from ${title ?? 'a ZurichJS event'}`,
    caption: str(cm.caption),
    credit: str(cm.credit),
    captions: video ? str(cm.captions) : undefined,
    eventSlug: title ? folder : undefined,
    folder,
    tags,
    createdAt: f.createdAt,
  };
}

/** The Admin API's list endpoint. IMAGEKIT_API_URL points a build at a local mock (tools/imagekit-mock.mjs). */
export const imageKitListUrl = (env: Env) => env.IMAGEKIT_API_URL || 'https://api.imagekit.io/v1/files';

/** Lists every file with ImageKit's Admin API (Basic auth with the private key), 1000 per page. */
export async function listImageKit(privateKey: string, fetchImpl: typeof fetch = fetch, base = imageKitListUrl({})): Promise<ImageKitFile[]> {
  const out: ImageKitFile[] = [];
  const auth = `Basic ${btoa(`${privateKey}:`)}`;
  for (let skip = 0; skip < 20_000; skip += 1000) {
    const url = `${base}?type=file&limit=1000&skip=${skip}&sort=ASC_CREATED`;
    const res = await fetchImpl(url, { headers: { authorization: auth }, signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`ImageKit list failed: HTTP ${res.status}`);
    const body = (await res.json()) as unknown;
    // The API answers with an array. Accept { assets: [...] } too, and fail on anything else rather than list nothing.
    const assets = (body as { assets?: unknown } | null)?.assets;
    const page = Array.isArray(body) ? body : Array.isArray(assets) ? assets : null;
    if (!page) throw new Error('ImageKit list failed: the answer is not a list of files');
    out.push(...(page as ImageKitFile[]));
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

interface LoadOptions {
  fetchImpl?: typeof fetch;
  log?: (m: string) => void;
  /** Folders that are collections on purpose (the conference), so they are not reported as unmatched. */
  collections?: (string | undefined)[];
}

/**
 * Builds the collection from ImageKit and Sanity event photos.
 *
 * Without a key, or when the listing fails, the result says so ("not-configured"
 * or "failed"), keeps Sanity photos, and the build log says it loudly. Builds that
 * require the archive (imageKitRequired: Netlify production) throw
 * MediaUnavailableError instead, so an empty archive never ships.
 */
export async function loadMedia(env: Env, events: Event[], { fetchImpl = fetch, log = console.warn, collections = [] }: LoadOptions = {}): Promise<MediaCollection> {
  const sanity = fromSanityPhotos(events);
  const required = imageKitRequired(env);
  const key = env.IMAGEKIT_PRIVATE_KEY;
  if (!key) {
    const msg = '[media] IMAGEKIT_PRIVATE_KEY missing: the photo archive is NOT in this build, and pages say it is unavailable.';
    if (required) throw new MediaUnavailableError(`${msg} Production builds need the key.`);
    log(`\n${msg}\n`);
    return { items: sanity, imagekit: 'not-configured' };
  }
  let files: ImageKitFile[];
  try {
    files = await listImageKit(key, fetchImpl, imageKitListUrl(env));
  } catch (err) {
    const msg = `[media] ImageKit could not be read (${(err as Error).message}): the photo archive is NOT in this build, and pages say it is unavailable.`;
    if (required) throw new MediaUnavailableError(msg);
    log(`\n${msg}\n`);
    return { items: sanity, imagekit: 'failed' };
  }
  const titles = new Map(events.map((e) => [e.slug, e.title]));
  const credits = new Map(events.map((e) => [e.slug, e.photoCredit]));
  const ik = files
    .map((f) => fromImageKit(f, (s) => titles.get(s)))
    .filter((m): m is MediaItem => !!m)
    .map((m) => ({ ...m, credit: m.credit ?? (m.eventSlug ? credits.get(m.eventSlug) : undefined) }));
  const known = new Set(collections.filter(Boolean));
  const unmatched = [...new Set(ik.filter((m) => !m.eventSlug && m.folder && !known.has(m.folder)).map((m) => m.folder))];
  if (unmatched.length) log(`[media] ImageKit folders that match no event slug, left out of event galleries: ${unmatched.join(', ')}`);
  const c = mediaCounts(ik);
  log(`[media] ImageKit: ${c.photos} photos and ${c.videos} videos for ${c.events} events.`);
  return { items: [...ik, ...sanity], imagekit: 'ok' };
}

/**
 * What an event page says about photos:
 *  - "shown": there are photos or clips
 *  - "unavailable": the archive was not read in this build, so nobody can tell
 *  - "pending": none yet, and the event ended less than two weeks ago
 *  - "none": none, and none are expected any more
 */
export type EventPhotoState = 'shown' | 'unavailable' | 'pending' | 'none';

export function eventPhotoState(count: number, collection: Pick<MediaCollection, 'imagekit'>, eventEnd: Date | undefined, now: Date): EventPhotoState {
  if (count > 0) return 'shown';
  if (!archiveComplete(collection)) return 'unavailable';
  if (eventEnd && now.getTime() - eventEnd.getTime() < 14 * 86_400_000) return 'pending';
  return 'none';
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

/** Counts for the archive heading: "806 photos and 16 videos from 14 events". */
export function mediaCounts(items: MediaItem[]) {
  const events = new Set(items.flatMap((m) => (m.eventSlug ? [m.eventSlug] : [])));
  return { photos: items.filter((m) => m.kind === 'photo').length, videos: items.filter((m) => m.kind === 'video').length, events: events.size };
}
