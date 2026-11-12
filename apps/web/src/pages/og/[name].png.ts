/**
 * Share cards (1200×630 PNG), prerendered at build time with satori and resvg.
 * Replaces production's runtime /api/og/* (@vercel/og) images.
 *
 *   /og/<name>.png            one per page card (lib/og.ts), plus /og/default.png
 *   /og/event-<slug>.png      one per event, with its Sanity artwork when it has one
 *   /og/speaker-<id>.png      one per speaker, with their photo when it has one
 *
 * The design follows docs/design-system.md: black, white and yellow, Figtree, 24px tiles, pills, no kickers.
 * Remote images are fetched once per build with a timeout; when a fetch fails, the card is drawn without
 * it (date tile or initials), so a CDN problem never breaks the build.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import type { APIRoute, GetStaticPaths } from 'astro';
import satori from 'satori';
import { color } from '@zurichjs/design/theme';
import { dateLong, dateParts, type Event, type Speaker } from '@zurichjs/events';
import { mediaForEvent } from '@zurichjs/content';
import { BUILD_TIME, content } from '~/lib/content';
import { allPageCards, withoutEmoji, type PageCard } from '~/lib/og';

const W = 1200;
const H = 630;
const YELLOW = color('yellow');
const GREY_MID = color('grey-mid');

type Card = { kind: 'page'; page: PageCard } | { kind: 'event'; ev: Event; photos: number; past: boolean } | { kind: 'speaker'; s: Speaker };

export const getStaticPaths = (async () => {
  const { events, speakers, media } = await content();
  const now = BUILD_TIME.getTime();
  return [
    ...allPageCards().map((page) => ({ params: { name: page.name }, props: { card: { kind: 'page', page } as Card } })),
    ...events.map((ev) => ({
      params: { name: `event-${ev.slug}` },
      props: {
        card: {
          kind: 'event',
          ev,
          photos: mediaForEvent(media.items, ev.slug).filter((m) => m.kind === 'photo').length,
          past: !!ev.startsAt && Date.parse(ev.startsAt) < now,
        } as Card,
      },
    })),
    ...speakers.map((s) => ({ params: { name: `speaker-${s.id}` }, props: { card: { kind: 'speaker', s } as Card } })),
  ];
}) satisfies GetStaticPaths;

// --- assets ----------------------------------------------------------------

type Node = { type: string; props: Record<string, unknown> & { style?: Record<string, unknown>; children?: unknown } };
const h = (type: string, style: Record<string, unknown>, ...children: unknown[]): Node => ({
  type,
  props: { style: { display: 'flex', ...style }, children: children.length === 1 ? children[0] : children },
});
const img = (src: string, w: number, ht: number, style: Record<string, unknown> = {}): Node => ({
  type: 'img',
  props: { src, width: w, height: ht, style: { width: w, height: ht, objectFit: 'cover', ...style } },
});

/** Fonts and the wordmark live in the app; the build runs from apps/web (or the workspace root). */
const appFile = (rel: string) => {
  for (const base of [process.cwd(), join(process.cwd(), 'apps/web')]) {
    try {
      return readFileSync(join(base, rel));
    } catch {
      /* try the next base */
    }
  }
  throw new Error(`OG image: cannot read ${rel}`);
};

let assets: { fonts: Parameters<typeof satori>[1]['fonts']; wordmark: string } | undefined;
const loadAssets = () =>
  (assets ??= {
    fonts: [
      { name: 'Figtree', data: appFile('src/assets/fonts/figtree-400.ttf'), weight: 400, style: 'normal' },
      { name: 'Figtree', data: appFile('src/assets/fonts/figtree-700.ttf'), weight: 700, style: 'normal' },
    ],
    wordmark: `data:image/svg+xml;base64,${appFile('public/images/logo/wordmark-white.svg').toString('base64')}`,
  });

/** A remote JPEG as a data URI, fetched once per build; undefined when it can't be fetched in time. */
const fetched = new Map<string, Promise<string | undefined>>();
const remoteJpeg = (url: string | undefined) => {
  if (!url) return Promise.resolve(undefined);
  if (!fetched.has(url)) {
    fetched.set(
      url,
      fetch(url, { signal: AbortSignal.timeout(8000) })
        .then(async (r) =>
          r.ok && /jpe?g/.test(r.headers.get('content-type') ?? '') ? `data:image/jpeg;base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}` : undefined,
        )
        .catch(() => undefined),
    );
  }
  return fetched.get(url)!;
};
const isSanity = (src: string) => src.startsWith('https://cdn.sanity.io/');
const isImageKit = (src: string) => src.startsWith('https://ik.imagekit.io/');
/** The event's promotional artwork, 16:9, as a JPEG. */
const coverUrl = (ev: Event) => (ev.cover?.src && isSanity(ev.cover.src) ? `${ev.cover.src}?w=1040&h=585&fit=crop&fm=jpg&q=80` : undefined);
/** A square crop around the speaker's face, as a JPEG. */
const faceUrl = (s: Speaker) => {
  const src = s.photo?.src;
  if (!src) return undefined;
  if (isSanity(src)) return `${src}?w=420&h=420&fit=crop&crop=focalpoint&fp-x=0.5&fp-y=0.35&fm=jpg&q=80`;
  if (isImageKit(src)) return `${src}${src.includes('?') ? '&' : '?'}tr=w-420,h-420,fo-face,q-80,f-jpg`;
  return undefined;
};

// --- layout ----------------------------------------------------------------

const clamp = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);
const titleSize = (s: string) => (s.length <= 28 ? 84 : s.length <= 48 ? 72 : s.length <= 72 ? 60 : 52);
const pill = (text: string) =>
  h('div', { alignSelf: 'flex-start', background: YELLOW, color: '#000', fontSize: 26, fontWeight: 700, padding: '10px 24px', borderRadius: 999 }, text);
const tile = { flexShrink: 0, background: YELLOW, color: '#000', borderRadius: 24 };

/** Black card: the wordmark and the address on top, the content below. */
function frame(wordmark: string, body: Node): Node {
  return h(
    'div',
    {
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      background: '#000',
      color: '#fff',
      fontFamily: 'Figtree',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '64px 72px',
    },
    h(
      'div',
      { width: '100%', justifyContent: 'space-between', alignItems: 'center' },
      img(wordmark, 329, 48, { objectFit: 'contain' }),
      h('span', { fontSize: 28, fontWeight: 700, color: GREY_MID }, 'zurichjs.com'),
    ),
    body,
  );
}

function pageCard(page: PageCard): Node {
  const t = clamp(withoutEmoji(page.title), 90);
  return h(
    'div',
    { flexDirection: 'column', gap: 24, maxWidth: 1000, paddingBottom: 8 },
    h('div', { fontSize: titleSize(t), fontWeight: 700, lineHeight: 1.08 }, t),
    h('div', { fontSize: 32, color: GREY_MID, lineHeight: 1.35 }, clamp(withoutEmoji(page.sub), 110)),
  );
}

function eventCard(ev: Event, photos: number, past: boolean, cover: string | undefined): Node {
  const t = clamp(withoutEmoji(ev.title), cover ? 60 : 80);
  const when = ev.startsAt ? dateLong(ev.startsAt) : ev.dateText;
  const tag = past ? pill(photos > 0 ? `Recap · ${photos} photos` : 'Recap') : null;
  if (cover) {
    // The organisers' artwork on the right; the date, title and venue on the left.
    return h(
      'div',
      { alignItems: 'center', gap: 48, width: '100%' },
      h(
        'div',
        { flexDirection: 'column', gap: 16, flex: 1 },
        when ? h('div', { fontSize: 30, fontWeight: 700, color: YELLOW }, when) : h('div', {}, ''),
        h('div', { fontSize: Math.min(titleSize(t) - 12, 60), fontWeight: 700, lineHeight: 1.1 }, t),
        ev.venue?.name ? h('div', { fontSize: 28, color: GREY_MID }, clamp(ev.venue.name, 40)) : h('div', {}, ''),
        tag ?? h('div', {}, ''),
      ),
      img(cover, 520, 293, { borderRadius: 24, flexShrink: 0 }),
    );
  }
  const parts = ev.startsAt ? dateParts(ev.startsAt) : { mon: 'TBC', day: '?', suffix: '', year: ev.dateText?.slice(-4) ?? '' };
  const where = [when, ev.venue?.name].filter(Boolean).join(' · ');
  return h(
    'div',
    { alignItems: 'center', gap: 48 },
    h(
      'div',
      { ...tile, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 190, height: 210 },
      h('div', { fontSize: 34, fontWeight: 700 }, parts.mon),
      h('div', { alignItems: 'flex-start', fontWeight: 700, lineHeight: 1 }, h('div', { fontSize: 92 }, parts.day), h('div', { fontSize: 40, marginTop: 6 }, parts.suffix)),
      h('div', { fontSize: 30 }, parts.year),
    ),
    h(
      'div',
      { flexDirection: 'column', gap: 20, flex: 1 },
      h('div', { fontSize: titleSize(t) - 8, fontWeight: 700, lineHeight: 1.1 }, t),
      where ? h('div', { fontSize: 30, color: GREY_MID }, clamp(where, 70)) : h('div', {}, ''),
      tag ?? h('div', {}, ''),
    ),
  );
}

function speakerCard(s: Speaker, face: string | undefined): Node {
  const role = clamp(withoutEmoji(`${s.role}${s.company && !s.role.includes(s.company) ? ` at ${s.company}` : ''}`), 70);
  const talks = s.talks.length;
  return h(
    'div',
    { alignItems: 'center', gap: 48 },
    face
      ? img(face, 210, 210, { borderRadius: 24, flexShrink: 0 })
      : h('div', { ...tile, alignItems: 'center', justifyContent: 'center', width: 210, height: 210, fontSize: 88, fontWeight: 700 }, s.initials),
    h(
      'div',
      { flexDirection: 'column', gap: 18, flex: 1 },
      h('div', { fontSize: titleSize(s.name) - 4, fontWeight: 700, lineHeight: 1.08 }, clamp(withoutEmoji(s.name), 50)),
      role ? h('div', { fontSize: 32, color: GREY_MID, lineHeight: 1.3 }, role) : h('div', {}, ''),
      pill(talks > 0 ? `${talks} talk${talks === 1 ? '' : 's'} at ZurichJS` : 'Speaker at ZurichJS'),
    ),
  );
}

async function tree(card: Card, wordmark: string): Promise<Node> {
  if (card.kind === 'page') return frame(wordmark, pageCard(card.page));
  if (card.kind === 'event') return frame(wordmark, eventCard(card.ev, card.photos, card.past, await remoteJpeg(coverUrl(card.ev))));
  return frame(wordmark, speakerCard(card.s, await remoteJpeg(faceUrl(card.s))));
}

export const GET: APIRoute = async ({ props }) => {
  const { fonts, wordmark } = loadAssets();
  const svg = await satori((await tree((props as { card: Card }).card, wordmark)) as Parameters<typeof satori>[0], { width: W, height: H, fonts });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
  return new Response(new Uint8Array(png), { headers: { 'content-type': 'image/png' } });
};
