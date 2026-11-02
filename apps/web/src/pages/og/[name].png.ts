/**
 * Open Graph images (1200×630 PNG), prerendered at build time with satori and
 * resvg. Replaces production's runtime /api/og/* (@vercel/og) images.
 *
 *   /og/<page>.png            home, events, speakers, cfp, contact, partners, donate, about, …
 *   /og/event-<slug>.png      one per event
 *   /og/speaker-<id>.png      one per speaker
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import type { APIRoute, GetStaticPaths } from 'astro';
import satori from 'satori';
import { dateLong, dateParts, type Event, type Speaker } from '@zurichjs/events';
import { content } from '~/lib/content';

const W = 1200;
const H = 630;
const YELLOW = '#F1E271';
const GREY_MID = '#A9AAB1';

type Card = { kind: 'page'; title: string; sub: string } | { kind: 'event'; ev: Event } | { kind: 'speaker'; s: Speaker };

const PAGES: Record<string, { title: string; sub: string }> = {
  home: { title: 'JavaScript and TypeScript meetups in Zurich', sub: 'Free monthly talks, food and conversation. Run by volunteers.' },
  events: { title: 'Upcoming and past meetups', sub: 'Every ZurichJS evening, with its talks and speakers.' },
  speakers: { title: 'Speakers', sub: 'Everyone who has spoken at ZurichJS, with their talks.' },
  cfv: { title: 'Volunteer with ZurichJS', sub: 'On the night, with photos, or with the website.' },
  cfp: { title: 'Give a talk at ZurichJS', sub: 'It doesn’t have to be about JavaScript. First-time speakers get help.' },
  contact: { title: 'Contact the organisers', sub: 'Questions, ideas, partnerships: hello@zurichjs.com' },
  partners: { title: 'Host or support a meetup', sub: 'Offer a room, food or a contribution to the community.' },
  donate: { title: 'Support the community', sub: 'ZurichJS is a nonprofit, run by volunteers.' },
  about: { title: 'JavaScript is the common ground that brought us together', sub: 'The volunteer-run JavaScript community in Zurich since 2024.' },
  'javascript-zurich': { title: 'JavaScript meetups in Zurich', sub: 'Free monthly JavaScript and TypeScript meetups with expert speakers.' },
  'ai-ml-zurich': { title: 'AI development meetups in Zurich', sub: 'Practical AI for web developers, in JavaScript and TypeScript.' },
  'tech-conferences-zurich': { title: 'Meetups and conferences in Zurich', sub: 'Monthly community meetups between the big conferences.' },
  'ai-context': { title: 'ZurichJS: information for AI assistants', sub: 'Facts about the JavaScript community in Zurich, in one page.' },
};

export const getStaticPaths = (async () => {
  const { events, speakers } = await content();
  return [
    ...Object.entries(PAGES).map(([name, p]) => ({ params: { name }, props: { card: { kind: 'page', ...p } as Card } })),
    ...events.map((ev) => ({ params: { name: `event-${ev.slug}` }, props: { card: { kind: 'event', ev } as Card } })),
    ...speakers.map((s) => ({ params: { name: `speaker-${s.id}` }, props: { card: { kind: 'speaker', s } as Card } })),
  ];
}) satisfies GetStaticPaths;

// --- rendering -------------------------------------------------------------

type Node = { type: string; props: Record<string, unknown> & { style?: Record<string, unknown>; children?: unknown } };
const h = (type: string, style: Record<string, unknown>, ...children: unknown[]): Node => ({
  type,
  props: { style: { display: 'flex', ...style }, children: children.length === 1 ? children[0] : children },
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

const clamp = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);
const titleSize = (s: string) => (s.length <= 28 ? 84 : s.length <= 48 ? 72 : s.length <= 72 ? 60 : 52);

function frame(wordmark: string, body: Node, footer: string): Node {
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
    { type: 'img', props: { src: wordmark, width: 329, height: 48, style: { width: 329, height: 48 } } },
    body,
    h(
      'div',
      { fontSize: 28, color: GREY_MID, justifyContent: 'space-between', width: '100%' },
      h('span', {}, footer),
      h('span', { color: '#fff', fontWeight: 700 }, 'zurichjs.com'),
    ),
  );
}

const pill = (text: string) =>
  h('div', { alignSelf: 'flex-start', background: YELLOW, color: '#000', fontSize: 26, fontWeight: 700, padding: '10px 24px', borderRadius: 999 }, text);

function tree(card: Card, wordmark: string): Node {
  if (card.kind === 'page') {
    const t = clamp(card.title, 90);
    return frame(
      wordmark,
      h(
        'div',
        { flexDirection: 'column', gap: 24, maxWidth: 1000 },
        h('div', { fontSize: titleSize(t), fontWeight: 700, lineHeight: 1.08 }, t),
        h('div', { fontSize: 32, color: GREY_MID, lineHeight: 1.35 }, clamp(card.sub, 110)),
      ),
      'JavaScript community in Zurich',
    );
  }
  if (card.kind === 'event') {
    const { ev } = card;
    const parts = ev.startsAt ? dateParts(ev.startsAt) : { mon: 'TBC', day: '?', suffix: '', year: ev.dateText?.slice(-4) ?? '' };
    const t = clamp(ev.title, 80);
    const where = [ev.startsAt ? dateLong(ev.startsAt) : ev.dateText, ev.venue?.name].filter(Boolean).join(' · ');
    return frame(
      wordmark,
      h(
        'div',
        { alignItems: 'center', gap: 48 },
        h(
          'div',
          { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 190, height: 210, flexShrink: 0, background: YELLOW, color: '#000', borderRadius: 32 },
          h('div', { fontSize: 34, fontWeight: 700 }, parts.mon),
          h('div', { alignItems: 'flex-start', fontWeight: 700, lineHeight: 1 }, h('div', { fontSize: 92 }, parts.day), h('div', { fontSize: 40, marginTop: 6 }, parts.suffix)),
          h('div', { fontSize: 30 }, parts.year),
        ),
        h(
          'div',
          { flexDirection: 'column', gap: 20, flex: 1 },
          h('div', { fontSize: titleSize(t) - 8, fontWeight: 700, lineHeight: 1.1 }, t),
          where ? h('div', { fontSize: 30, color: GREY_MID }, clamp(where, 70)) : h('div', {}, ''),
        ),
      ),
      'ZurichJS meetup',
    );
  }
  const { s } = card;
  const role = clamp(`${s.role}${s.company ? ` at ${s.company}` : ''}`, 70);
  const talks = s.talks.length;
  return frame(
    wordmark,
    h(
      'div',
      { alignItems: 'center', gap: 48 },
      h(
        'div',
        {
          alignItems: 'center',
          justifyContent: 'center',
          width: 210,
          height: 210,
          flexShrink: 0,
          background: YELLOW,
          color: '#000',
          borderRadius: 32,
          fontSize: 88,
          fontWeight: 700,
        },
        s.initials,
      ),
      h(
        'div',
        { flexDirection: 'column', gap: 18, flex: 1 },
        h('div', { fontSize: titleSize(s.name) - 4, fontWeight: 700, lineHeight: 1.08 }, clamp(s.name, 50)),
        role ? h('div', { fontSize: 32, color: GREY_MID, lineHeight: 1.3 }, role) : h('div', {}, ''),
        talks > 0 ? pill(`${talks} talk${talks === 1 ? '' : 's'} at ZurichJS`) : pill('Speaker at ZurichJS'),
      ),
    ),
    'ZurichJS speaker',
  );
}

export const GET: APIRoute = async ({ props }) => {
  const { fonts, wordmark } = loadAssets();
  const svg = await satori(tree((props as { card: Card }).card, wordmark) as Parameters<typeof satori>[0], { width: W, height: H, fonts });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
  return new Response(new Uint8Array(png), { headers: { 'content-type': 'image/png' } });
};
