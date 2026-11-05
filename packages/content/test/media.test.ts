import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  eventPhotoState,
  fromImageKit,
  imageKitPoster,
  imageKitRequired,
  loadContent,
  loadMedia,
  mediaCounts,
  mediaForEvent,
  MediaUnavailableError,
  pickFeatured,
  resetContentCache,
  type ImageKitFile,
} from '../src/index.ts';
import type { Event } from '@zurichjs/events';

const ev = (slug: string, over: Partial<Event> = {}): Event => ({
  id: slug,
  slug,
  title: `Event ${slug}`,
  status: 'scheduled',
  description: '',
  agenda: [],
  practical: [],
  photos: [],
  ...over,
});
const file = (over: Partial<ImageKitFile>): ImageKitFile => ({
  fileId: 'f1',
  name: 'a.jpg',
  filePath: '/2026-09-warmup/a.jpg',
  url: 'https://ik.imagekit.io/zjs/2026-09-warmup/a.jpg',
  fileType: 'image',
  ...over,
});
const titles = (s: string) => (s === '2026-09-warmup' ? 'September warm-up' : undefined);
const quiet = { log: () => {} };

describe('ImageKit files', () => {
  it('maps the top-level folder to the event and reads editorial metadata', () => {
    const m = fromImageKit(file({ tags: ['featured-home', 'speaker:faris'], customMetadata: { caption: 'Q&A', credit: 'Photo: Enrique', alt: 'Faris on stage' } }), titles)!;
    expect(m).toMatchObject({
      kind: 'photo',
      eventSlug: '2026-09-warmup',
      caption: 'Q&A',
      credit: 'Photo: Enrique',
      alt: 'Faris on stage',
      tags: ['featured-home', 'speaker:faris'],
    });
  });
  it('recognises videos as clips and gives them an untransformed poster', () => {
    const m = fromImageKit(file({ name: 'clip.MP4', url: 'https://ik.imagekit.io/zjs/2026-09-warmup/clip.MP4?updatedAt=1', fileType: 'non-image' }), titles)!;
    expect(m.kind).toBe('video');
    expect(m.poster).toBe('https://ik.imagekit.io/zjs/2026-09-warmup/clip.MP4/ik-thumbnail.jpg');
    expect(m.alt).toBe('Short clip from September warm-up');
  });
  it('takes the poster of a phone clip from the original, not from its MP4 rendition', () => {
    expect(imageKitPoster('https://ik.imagekit.io/farisaziz/zurichjs-4/IMG_7611.MOV/ik-video.mp4?updatedAt=1752925343556')).toBe(
      'https://ik.imagekit.io/farisaziz/zurichjs-4/IMG_7611.MOV/ik-thumbnail.jpg',
    );
  });
  it('treats HEIC and PNG photos as photos, whatever the file type field says', () => {
    expect(fromImageKit(file({ name: 'IMG_1.HEIC', fileType: undefined, mime: 'image/heic' }), titles)?.kind).toBe('photo');
    expect(fromImageKit(file({ name: 'export.png', fileType: 'png' }), titles)?.kind).toBe('photo');
  });
  it('leaves out promotional artwork, hidden files and other documents', () => {
    expect(fromImageKit(file({ tags: ['promo'] }), titles)).toBeNull();
    expect(fromImageKit(file({ tags: ['Hidden'] }), titles)).toBeNull();
    expect(fromImageKit(file({ name: 'slides.pdf', fileType: 'non-image', mime: 'application/pdf' }), titles)).toBeNull();
  });
  it('keeps files in folders that are not events (e.g. the conference), without an event', () => {
    expect(fromImageKit(file({ filePath: '/zurichjs-conf-2026/x.jpg' }), titles)).toMatchObject({ folder: 'zurichjs-conf-2026', eventSlug: undefined });
  });
});

describe('the real archive (a trimmed copy of the production listing)', () => {
  // Two or three files from each of the 14 production folders, in the Admin API's shape (tools/imagekit-mock.mjs).
  const files = JSON.parse(readFileSync(new URL('./fixtures/imagekit-files.json', import.meta.url), 'utf8')) as ImageKitFile[];
  const folders = [...new Set(files.map((f) => f.filePath.split('/')[1]!))];
  const events = folders.map((s) => ev(s, { title: `Title of ${s}` }));

  it('puts every file in its event, clips included, with posters that are ImageKit thumbnails', async () => {
    const log = vi.fn();
    const c = await loadMedia({ IMAGEKIT_PRIVATE_KEY: 'k' }, events, { fetchImpl: vi.fn(async () => Response.json(files)), log });
    expect(c.imagekit).toBe('ok');
    expect(mediaCounts(c.items)).toEqual({ photos: 28, videos: 5, events: 14 });
    expect(mediaForEvent(c.items, 'zurichjs-4').filter((m) => m.kind === 'video')).toHaveLength(2);
    for (const m of c.items.filter((x) => x.kind === 'video')) {
      expect(m.src).toMatch(/\.(mp4|MOV\/ik-video\.mp4)\?updatedAt=\d+$/);
      expect(m.poster).toMatch(/^https:\/\/ik\.imagekit\.io\/farisaziz\/.+\.(mp4|MOV)\/ik-thumbnail\.jpg$/);
    }
    expect(c.items.every((m) => m.width && m.height)).toBe(true);
    expect(log).not.toHaveBeenCalledWith(expect.stringContaining('match no event'));
  });

  it('reports folders that match no event slug', async () => {
    const log = vi.fn();
    await loadMedia({ IMAGEKIT_PRIVATE_KEY: 'k' }, events.slice(1), { fetchImpl: vi.fn(async () => Response.json(files)), log });
    expect(log).toHaveBeenCalledWith(expect.stringContaining(`match no event slug, left out of event galleries: ${folders[0]}`));
  });
});

describe('loadMedia', () => {
  const events = [ev('2026-09-warmup', { photos: [{ src: 'https://cdn.sanity.io/x.jpg', alt: 'Room' }], photoCredit: 'Photos: Enrique' })];
  it('works without an ImageKit key (Sanity photos only) and says so', async () => {
    const log = vi.fn();
    const c = await loadMedia({}, events, { fetchImpl: vi.fn(), log });
    expect(c.imagekit).toBe('not-configured');
    expect(c.items).toHaveLength(1);
    expect(c.items[0]).toMatchObject({ eventSlug: '2026-09-warmup', credit: 'Photos: Enrique' });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('IMAGEKIT_PRIVATE_KEY missing'));
  });
  it('pages through ImageKit with the private key, and falls back when it fails', async () => {
    const f = vi.fn(async () => Response.json([file({})]));
    const c = await loadMedia({ IMAGEKIT_PRIVATE_KEY: 'private_x' }, events, { fetchImpl: f, ...quiet });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/^https:\/\/api\.imagekit\.io\/v1\/files\?type=file&limit=1000&skip=0/);
    expect(init.headers).toEqual({ authorization: `Basic ${btoa('private_x:')}` });
    expect(c.imagekit).toBe('ok');
    expect(mediaCounts(c.items)).toEqual({ photos: 2, videos: 0, events: 1 });
    const broken = await loadMedia({ IMAGEKIT_PRIVATE_KEY: 'k' }, events, { fetchImpl: vi.fn(async () => new Response('', { status: 500 })), ...quiet });
    expect(broken).toMatchObject({ imagekit: 'failed', items: [expect.objectContaining({ src: 'https://cdn.sanity.io/x.jpg' })] });
  });
  it('reads a second page when the first is full, and a mock API when IMAGEKIT_API_URL is set', async () => {
    const page = Array.from({ length: 1000 }, (_, i) => file({ fileId: `p${i}` }));
    const f = vi.fn(async (u: string | URL | Request) => Response.json(String(u).includes('skip=0') ? page : [file({ fileId: 'last' })]));
    const c = await loadMedia({ IMAGEKIT_PRIVATE_KEY: 'k', IMAGEKIT_API_URL: 'http://127.0.0.1:4529/v1/files' }, events, { fetchImpl: f, ...quiet });
    expect(f).toHaveBeenCalledTimes(2);
    expect(String(f.mock.calls[1]![0])).toBe('http://127.0.0.1:4529/v1/files?type=file&limit=1000&skip=1000&sort=ASC_CREATED');
    expect(c.items).toHaveLength(1002);
  });
  it('treats an answer that is not a list as a failure, not as an empty archive', async () => {
    const c = await loadMedia({ IMAGEKIT_PRIVATE_KEY: 'k' }, events, { fetchImpl: vi.fn(async () => Response.json({ message: 'nope' })), ...quiet });
    expect(c.imagekit).toBe('failed');
  });
  it('fails a build that requires the archive (production) instead of shipping it empty', async () => {
    await expect(loadMedia({ MEDIA_REQUIRE_IMAGEKIT: '1' }, events, quiet)).rejects.toBeInstanceOf(MediaUnavailableError);
    await expect(
      loadMedia({ CONTEXT: 'production', IMAGEKIT_PRIVATE_KEY: 'k' }, events, { fetchImpl: vi.fn(async () => new Response('', { status: 401 })), ...quiet }),
    ).rejects.toThrow(/HTTP 401/);
  });
  it('requires the archive on production only, never on the draft preview site', () => {
    expect(imageKitRequired({ CONTEXT: 'production' })).toBe(true);
    expect(imageKitRequired({ CONTEXT: 'production', MEDIA_REQUIRE_IMAGEKIT: '0' })).toBe(false);
    expect(imageKitRequired({ MEDIA_REQUIRE_IMAGEKIT: '1', SANITY_PERSPECTIVE: 'drafts' })).toBe(false);
    expect(imageKitRequired({ CONTEXT: 'deploy-preview' })).toBe(false);
    expect(imageKitRequired({})).toBe(false);
  });
  it('loadContent does not fall back to sample content when the archive is required and missing', async () => {
    resetContentCache();
    const err = new MediaUnavailableError('no key');
    await expect(loadContent({ CONTENT_REQUIRE_SANITY: '0' }, async () => Promise.reject(err))).rejects.toBe(err);
    resetContentCache();
  });
  it('featured picks never repeat a photo on the same page', () => {
    const items = [
      fromImageKit(file({ fileId: 'a', tags: ['featured-home'] }), titles)!,
      fromImageKit(file({ fileId: 'b', url: 'https://ik.imagekit.io/zjs/b.jpg', tags: ['featured-home'] }), titles)!,
    ];
    const used = new Set<string>();
    expect(pickFeatured(items, 'featured-home', 1, used)).toHaveLength(1);
    expect(pickFeatured(items, 'featured-home', 2, used).map((m) => m.src)).toEqual(['https://ik.imagekit.io/zjs/b.jpg']);
  });
});

describe('what an event page says about its photos', () => {
  const now = new Date('2026-11-02T12:00:00+01:00');
  const ok = { imagekit: 'ok' as const };
  it('shows photos when there are any, even if ImageKit was not read', () => {
    expect(eventPhotoState(3, ok, undefined, now)).toBe('shown');
    expect(eventPhotoState(1, { imagekit: 'failed' }, undefined, now)).toBe('shown');
  });
  it('says the archive is unavailable when it was not read, never "coming soon"', () => {
    expect(eventPhotoState(0, { imagekit: 'not-configured' }, new Date('2026-10-30T19:00:00+01:00'), now)).toBe('unavailable');
    expect(eventPhotoState(0, { imagekit: 'failed' }, new Date('2025-01-01'), now)).toBe('unavailable');
  });
  it('says photos are on their way for two weeks after the event, then that there are none', () => {
    expect(eventPhotoState(0, ok, new Date('2026-10-30T21:00:00+01:00'), now)).toBe('pending');
    expect(eventPhotoState(0, ok, new Date('2026-09-09T21:00:00+02:00'), now)).toBe('none');
    expect(eventPhotoState(0, { imagekit: 'sample' }, undefined, now)).toBe('none');
  });
});
