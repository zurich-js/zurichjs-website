import { describe, expect, it, vi } from 'vitest';
import { fromImageKit, loadMedia, mediaCounts, pickFeatured, type ImageKitFile } from '../src/index.ts';
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
  it('recognises videos and gives them a poster', () => {
    const m = fromImageKit(file({ name: 'clip.MP4', url: 'https://ik.imagekit.io/zjs/2026-09-warmup/clip.MP4', fileType: 'non-image' }), titles)!;
    expect(m.kind).toBe('video');
    expect(m.poster).toBe('https://ik.imagekit.io/zjs/2026-09-warmup/clip.MP4/ik-thumbnail.jpg?tr=w-960');
  });
  it('leaves out promotional artwork, hidden files and other documents', () => {
    expect(fromImageKit(file({ tags: ['promo'] }), titles)).toBeNull();
    expect(fromImageKit(file({ tags: ['Hidden'] }), titles)).toBeNull();
    expect(fromImageKit(file({ name: 'slides.pdf', fileType: 'non-image' }), titles)).toBeNull();
  });
  it('keeps files in folders that are not events (e.g. the conference), without an event', () => {
    expect(fromImageKit(file({ filePath: '/zurichjs-conf-2026/x.jpg' }), titles)).toMatchObject({ folder: 'zurichjs-conf-2026', eventSlug: undefined });
  });
});

describe('loadMedia', () => {
  const events = [ev('2026-09-warmup', { photos: [{ src: 'https://cdn.sanity.io/x.jpg', alt: 'Room' }], photoCredit: 'Photos: Enrique' })];
  it('works without an ImageKit key (Sanity photos only) and says so', async () => {
    const log = vi.fn();
    const c = await loadMedia({}, events, vi.fn(), log);
    expect(c.imagekit).toBe('not-configured');
    expect(c.items).toHaveLength(1);
    expect(c.items[0]).toMatchObject({ eventSlug: '2026-09-warmup', credit: 'Photos: Enrique' });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('IMAGEKIT_PRIVATE_KEY missing'));
  });
  it('pages through ImageKit with the private key, and falls back when it fails', async () => {
    const f = vi.fn(async () => Response.json([file({})]));
    const c = await loadMedia({ IMAGEKIT_PRIVATE_KEY: 'private_x' }, events, f, () => {});
    expect((f.mock.calls[0] as unknown as [string, RequestInit])[1].headers).toEqual({ authorization: `Basic ${btoa('private_x:')}` });
    expect(c.imagekit).toBe('ok');
    expect(mediaCounts(c.items)).toEqual({ photos: 2, videos: 0, events: 1 });
    const broken = await loadMedia(
      { IMAGEKIT_PRIVATE_KEY: 'k' },
      events,
      vi.fn(async () => new Response('', { status: 500 })),
      () => {},
    );
    expect(broken).toMatchObject({ imagekit: 'failed', items: [expect.objectContaining({ src: 'https://cdn.sanity.io/x.jpg' })] });
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
