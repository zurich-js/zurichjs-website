import { dateLong, type Event, type Partner, type Speaker } from '@zurichjs/events';

export const SITE_URL = 'https://zurichjs.com';
/** The generated default share card (apps/web/src/lib/og.ts); pages normally pass their own card. */
export const DEFAULT_OG_IMAGE = '/og/default.png';

export const absoluteUrl = (pathOrUrl: string) => (/^https?:\/\//.test(pathOrUrl) ? pathOrUrl : `${SITE_URL}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`);

/** Canonical form of a path: no query, no trailing slash (except "/"). */
export const canonicalUrl = (path: string) => {
  const clean = path.split(/[?#]/)[0]!.replace(/\/+$/, '') || '/';
  return clean === '/' ? SITE_URL : `${SITE_URL}${clean}`;
};

export interface MetaInput {
  /** Full <title>. */
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  type?: 'website' | 'article' | 'profile';
  /**
   * Origin for the share image on non-production deploys (Netlify's DEPLOY_PRIME_URL), so previews show
   * their own cards before they exist on zurichjs.com. Canonical URLs always stay on zurichjs.com.
   */
  assetOrigin?: string;
  noindex?: boolean;
  keywords?: string[];
  /** Adds geo.* and ICBM tags for Zurich (landing pages). */
  geo?: boolean;
  profile?: { firstName?: string; lastName?: string; username?: string };
}

export interface MetaTags {
  title: string;
  canonical: string;
  meta: { name?: string; property?: string; httpEquiv?: string; content: string }[];
}

/** Everything that goes into <head>, built once. Mirrors the production SEO component, with absolute URLs. */
export function buildMeta(m: MetaInput): MetaTags {
  const canonical = canonicalUrl(m.path);
  const path = m.image ?? DEFAULT_OG_IMAGE;
  const image = m.assetOrigin && path.startsWith('/') ? `${m.assetOrigin.replace(/\/+$/, '')}${path}` : absoluteUrl(path);
  // Generated cards are always 1200×630 PNGs.
  const card = /\/og\/[\w.-]+\.png$/.test(path);
  const alt = m.imageAlt ?? m.title;
  const meta: MetaTags['meta'] = [
    { name: 'description', content: m.description },
    { httpEquiv: 'content-language', content: 'en' },
    { name: 'robots', content: m.noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' },
    { property: 'og:site_name', content: 'ZurichJS' },
    { property: 'og:locale', content: 'en_US' },
    { property: 'og:title', content: m.title },
    { property: 'og:description', content: m.description },
    { property: 'og:type', content: m.type ?? 'website' },
    { property: 'og:url', content: canonical },
    { property: 'og:image', content: image },
    ...(card
      ? [
          { property: 'og:image:type', content: 'image/png' },
          { property: 'og:image:width', content: '1200' },
          { property: 'og:image:height', content: '630' },
        ]
      : []),
    { property: 'og:image:alt', content: alt },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:site', content: '@zurichjs' },
    { name: 'twitter:title', content: m.title },
    { name: 'twitter:description', content: m.description },
    { name: 'twitter:image', content: image },
    { name: 'twitter:image:alt', content: alt },
  ];
  if (m.keywords?.length) meta.push({ name: 'keywords', content: m.keywords.join(', ') });
  if (m.geo) {
    meta.push(
      { name: 'geo.region', content: 'CH-ZH' },
      { name: 'geo.placename', content: 'Zurich' },
      { name: 'geo.position', content: '47.3769;8.5417' },
      { name: 'ICBM', content: '47.3769, 8.5417' },
    );
  }
  if (m.type === 'profile' && m.profile) {
    if (m.profile.firstName) meta.push({ property: 'profile:first_name', content: m.profile.firstName });
    if (m.profile.lastName) meta.push({ property: 'profile:last_name', content: m.profile.lastName });
    if (m.profile.username) meta.push({ property: 'profile:username', content: m.profile.username });
  }
  return { title: m.title, canonical, meta };
}

/* ------------------------------------------------------------------------------------------ */
/* JSON-LD. Ported from the production src/utils/structuredData.ts; Event and Person are now   */
/* actually emitted (production never called them).                                            */
/* ------------------------------------------------------------------------------------------ */

type JsonLd = Record<string, unknown>;
const ctx = { '@context': 'https://schema.org' } as const;
const ORG_ID = `${SITE_URL}/#organization`;

export const organizationSchema = (): JsonLd => ({
  ...ctx,
  '@type': 'Organization',
  '@id': ORG_ID,
  name: 'ZurichJS',
  alternateName: ['Zurich JavaScript', 'Zurich JS Meetup', 'ZurichJS Community'],
  url: SITE_URL,
  logo: `${SITE_URL}/logo-square.png`,
  description:
    'ZurichJS is the JavaScript and TypeScript community in Zurich, Switzerland. We host regular meetups, workshops and a yearly conference for web developers, with talks on React, Node.js, Vue, Angular, AI and modern web development.',
  sameAs: [
    'https://twitter.com/zurichjs',
    'https://www.linkedin.com/company/zurichjs',
    'https://github.com/zurichjs',
    'https://www.meetup.com/zurich-js/',
    'https://bsky.app/profile/zurichjs.com',
  ],
  address: { '@type': 'PostalAddress', addressLocality: 'Zurich', addressRegion: 'ZH', addressCountry: 'CH' },
  geo: { '@type': 'GeoCoordinates', latitude: 47.3769, longitude: 8.5417 },
  areaServed: ['Zurich', 'Winterthur', 'Zug', 'Basel', 'Konstanz', 'St. Gallen'].map((name) => ({ '@type': 'City', name })),
  contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: 'hello@zurichjs.com' },
  knowsAbout: [
    'JavaScript',
    'TypeScript',
    'React',
    'Node.js',
    'Vue.js',
    'Angular',
    'Web Development',
    'Frontend Development',
    'Backend Development',
    'Artificial Intelligence',
    'Web Performance',
    'Software Engineering',
  ],
});

export const websiteSchema = (): JsonLd => ({
  ...ctx,
  '@type': 'WebSite',
  name: 'ZurichJS',
  url: SITE_URL,
  publisher: { '@id': ORG_ID },
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/events?search={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
});

/** Kept for parity with production's home page; the placeholder phone number is dropped. */
export const localBusinessSchema = (): JsonLd => ({
  ...ctx,
  '@type': 'LocalBusiness',
  '@id': `${SITE_URL}/#localbusiness`,
  name: 'ZurichJS',
  image: `${SITE_URL}/logo-square.png`,
  url: SITE_URL,
  email: 'hello@zurichjs.com',
  priceRange: 'Free',
  address: { '@type': 'PostalAddress', addressLocality: 'Zurich', addressRegion: 'ZH', postalCode: '8000', addressCountry: 'CH' },
  geo: { '@type': 'GeoCoordinates', latitude: 47.3769, longitude: 8.5417 },
});

export const faqSchema = (faqs: { question: string; answer: string }[]): JsonLd => ({
  ...ctx,
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
});

export const breadcrumbSchema = (items: { name: string; path: string }[]): JsonLd => ({
  ...ctx,
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: canonicalUrl(it.path) })),
});

const STATUS: Record<Event['status'], string> = {
  scheduled: 'https://schema.org/EventScheduled',
  'rsvp-soon': 'https://schema.org/EventScheduled',
  full: 'https://schema.org/EventScheduled',
  tbc: 'https://schema.org/EventScheduled',
  postponed: 'https://schema.org/EventPostponed',
  cancelled: 'https://schema.org/EventCancelled',
};

/** schema.org Event. Returns null for events without a date (Google requires startDate). */
export function eventSchema(ev: Event, speakers: Speaker[], hosts: Partner[] = []): JsonLd | null {
  if (!ev.startsAt) return null;
  const url = canonicalUrl(`/events/${ev.slug}`);
  const performers = [...new Set(ev.agenda.flatMap((a) => a.talk?.speakerIds ?? []))]
    .map((id) => speakers.find((s) => s.id === id))
    .filter((s): s is Speaker => !!s)
    .map((s) => ({ '@type': 'Person', name: s.name, url: canonicalUrl(`/speakers/${s.id}`) }));
  return {
    ...ctx,
    '@type': 'Event',
    name: ev.title,
    description: ev.description || `ZurichJS meetup on ${dateLong(ev.startsAt)}.`,
    startDate: ev.startsAt,
    ...(ev.endsAt ? { endDate: ev.endsAt } : {}),
    eventStatus: STATUS[ev.status],
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url,
    ...(ev.photos[0] ? { image: [absoluteUrl(ev.photos[0].src)] } : { image: [`${SITE_URL}/og/event-${ev.slug}.png`] }),
    location: ev.venue
      ? {
          '@type': 'Place',
          name: ev.venue.name,
          address: { '@type': 'PostalAddress', streetAddress: ev.venue.street, postalCode: ev.venue.zip, addressLocality: ev.venue.city, addressCountry: 'CH' },
        }
      : { '@type': 'Place', name: 'Zurich', address: { '@type': 'PostalAddress', addressLocality: 'Zurich', addressCountry: 'CH' } },
    organizer: { '@type': 'Organization', '@id': ORG_ID, name: 'ZurichJS', url: SITE_URL },
    ...(performers.length ? { performer: performers } : {}),
    ...(hosts.length ? { sponsor: hosts.map((h) => ({ '@type': 'Organization', name: h.name, ...(h.url ? { url: h.url } : {}) })) } : {}),
    offers: {
      '@type': 'Offer',
      url: ev.meetupUrl ?? url,
      price: 0,
      priceCurrency: 'CHF',
      availability: ev.status === 'full' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
    },
  };
}

export function personSchema(s: Speaker): JsonLd {
  return {
    ...ctx,
    '@type': 'Person',
    name: s.name,
    url: canonicalUrl(`/speakers/${s.id}`),
    ...(s.role ? { jobTitle: s.role } : {}),
    ...(s.company ? { worksFor: { '@type': 'Organization', name: s.company } } : {}),
    ...(s.bio ? { description: s.bio } : {}),
    ...(s.photo ? { image: absoluteUrl(s.photo.src) } : {}),
    ...(s.links.length ? { sameAs: s.links.map((l) => l.url) } : {}),
    ...(s.topics.length ? { knowsAbout: s.topics } : {}),
  };
}

/* ------------------------------------------------------------------------------------------ */
/* Sitemap and llms.txt                                                                        */
/* ------------------------------------------------------------------------------------------ */

export interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority?: number;
}

const xmlEscape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function sitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((e) =>
      [
        '  <url>',
        `    <loc>${xmlEscape(canonicalUrl(e.path))}</loc>`,
        e.lastmod ? `    <lastmod>${e.lastmod.slice(0, 10)}</lastmod>` : '',
        e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : '',
        e.priority !== undefined ? `    <priority>${e.priority.toFixed(1)}</priority>` : '',
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export interface LlmsInput {
  events: Event[];
  speakers: Speaker[];
  now?: Date;
  /** Short pages to list under "Pages". */
  pages: { title: string; path: string; summary: string }[];
}

/**
 * /llms.txt following https://llmstxt.org: an H1, a one-paragraph summary,
 * then link lists. `full` adds every event and speaker with details.
 */
export function llmsTxt({ events, speakers, pages, now = new Date() }: LlmsInput, full = false): string {
  const upcoming = events.filter((e) => e.startsAt && Date.parse(e.startsAt) >= now.getTime() && e.status !== 'cancelled');
  const past = events.filter((e) => e.startsAt && Date.parse(e.startsAt) < now.getTime());
  const line = (title: string, path: string, note?: string) => `- [${title}](${canonicalUrl(path)})${note ? `: ${note}` : ''}`;
  const eventNote = (e: Event) =>
    [e.startsAt ? dateLong(e.startsAt) : e.dateText, e.venue ? `${e.venue.name}, ${e.venue.city}` : undefined, full ? e.description.replace(/\s+/g, ' ').slice(0, 300) : undefined]
      .filter(Boolean)
      .join(' · ');
  const out = [
    '# ZurichJS',
    '',
    '> ZurichJS is a non-profit JavaScript and TypeScript community in Zurich, Switzerland, run by the Swiss JavaScript Group association. It hosts free monthly meetups with talks and the yearly ZurichJS Conference. RSVPs happen on Meetup (https://www.meetup.com/zurich-js/). Talks are not recorded and slides are not published.',
    '',
    '## Pages',
    ...pages.map((p) => line(p.title, p.path, p.summary)),
    '',
    '## Upcoming events',
    ...(upcoming.length ? upcoming.map((e) => line(e.title, `/events/${e.slug}`, eventNote(e))) : ['- No dates announced yet. See https://zurichjs.com/events']),
    '',
    full ? '## Past events' : '## Optional',
    ...(full ? past.map((e) => line(e.title, `/events/${e.slug}`, eventNote(e))) : [line('Full list of events and speakers', '/llms-full.txt')]),
  ];
  if (full) {
    out.push('', '## Speakers', ...speakers.map((s) => line(s.name, `/speakers/${s.id}`, [s.role, s.company, s.topics.join(', ')].filter(Boolean).join(' · '))));
  }
  return out.join('\n') + '\n';
}
