/**
 * Partners and the sponsorship offering, as the production site states them.
 *
 * Production Sanity has no `partner` documents yet (the Studio PR that adds the
 * type is unmerged), so a real build would otherwise show no sponsors, hosts or
 * community partners at all. This record is used whenever Sanity returns no
 * partners; as soon as Sanity has partner documents, Sanity wins and this list
 * is ignored (see `withPartnerFallback`).
 *
 * Every entry names its source. Nothing here is guessed: what production does
 * not say (for example whether a conference partner is still current) is a
 * "confirm" item in docs/v2/CONTENT-SOURCES.md.
 *
 * Sources:
 *   [old-partners]  origin/main src/data/index.ts, getPartners() (the production partner list, last changed 2026-05-20)
 *   [old-previous]  origin/main src/pages/partnerships.tsx, "Previous Partners and Sponsors"
 *   [old-today]     origin/main src/data/index.ts, getTodaysSponsors() (the Tonight page for the September 2026 warm-up)
 *   [old-tiers]     origin/main src/pages/partnerships.tsx, partnershipTiers and the "Choose Your Partnership Level" section
 *   [old-stats]     origin/main src/pages/partnerships.tsx, "The Numbers Speak" (added 2025-10-26)
 *   [old-about]     origin/main src/pages/about.tsx (the timeline)
 *   [sanity-event]  the event's own `location` in production Sanity
 *   [owner-2026-11] owner decision, 2nd November 2026: Vercel, Ginetta and Code Blossom are no longer promoted;
 *                   3rd November 2026: DotJS and React Paris are no longer shown, Voxxed Days Zurich is a current partner
 *   [conf-sponsor]  conf.zurichjs.com/sponsorship, "Our typical Audience" (undated; "the meetup attendee profile")
 *   [meetup-export] owner-provided Meetup export: RSVPs (not check-ins) for 18 meetups, November 2024 to September 2026
 *   [owner]         the owner, 4th November 2026: AWS, Gatling, Supabase, Remotion and Vercel as past sponsors; SAE Institute Zürich as a current host
 *   [prospectus]    the 2026 sponsorship prospectus (owner, shared 3rd November 2026): its partner and sponsor logos
 *   [photo-banners] the sponsor banners on the owner's event photos (ImageKit archive, shared 3rd November 2026), and the
 *                   old site's unused logo files (origin/main public/images/partners): Cloudflare and OnlyDust (September 2025),
 *                   ImageKit and Storyblok (2025 meetups), Platformatic (the June 2025 workshop), Digitec Galaxus (the anniversary)
 */
import type { Event, Partner, SponsorTier, SupporterRole } from '@zurichjs/events';

type Sourced<T> = T & { source: string };

const logo = (f: string) => `/images/partners/${f}`;

export const PARTNER_RECORDS: Sourced<Partner>[] = [
  // Current sponsors: production lists these under "Our Sponsors" with a tier.
  // Vercel was production's Community Champion; shown again as a past sponsor (owner, 4th November 2026).
  {
    id: 'vercel',
    name: 'Vercel',
    url: 'https://vercel.com',
    logo: logo('vercel-black.webp'),
    kinds: ['sponsor'],
    current: false,
    source: 'old-partners, owner-2026-11',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    url: 'https://stripe.com',
    logo: logo('stripe.webp'),
    kinds: ['sponsor'],
    tier: 'builder',
    // Production lists Stripe as a Community Builder AND in "Previous Partners and Sponsors". Confirm item.
    current: true,
    description: 'Financial infrastructure for the internet',
    blurb:
      'Stripe is a financial infrastructure platform for businesses. Millions of companies use Stripe to accept payments, grow revenue, and accelerate new business opportunities.',
    source: 'old-partners',
  },
  {
    id: 'gyff',
    name: 'GYFF',
    url: 'https://www.gyffted.com',
    logo: logo('gyff-logo-square.webp'),
    kinds: ['sponsor'],
    tier: 'supporter',
    current: true,
    description: 'IT recruitment in Switzerland',
    blurb:
      'GYFF: IT recruitment in Switzerland. Staff augmentation (LSE), umbrella employment, freelance and direct hires (executive search & try-and-hire). JS, Cloud, Data, AI/ML, DevOps, Cybersecurity. Geneva · Lausanne · Vaud · Zurich · Basel.',
    allowReferrer: true,
    source: 'old-partners',
  },
  {
    id: 'fin',
    name: 'FIN',
    url: 'https://trust-fin.ch/tax-return-switzerland/',
    logo: logo('fin.webp'),
    kinds: ['sponsor'],
    tier: 'supporter',
    current: true,
    description: 'Your Financial Clarity Starts Here',
    blurb:
      'Looking for tax clarity instead of complexity? FIN is your tax advisor in Switzerland, guiding you through all financial and tax matters. No jargon, no red tape, just real support, on your terms.',
    allowReferrer: true,
    source: 'old-partners',
  },

  // Venue partners: "Companies that provide their spaces for our meetups".
  {
    id: 'ginetta',
    name: 'Ginetta',
    url: 'https://ginetta.net',
    logo: logo('ginetta.webp'),
    kinds: ['venue'],
    current: false,
    // Hosted early meetups (factual history on those event pages); not listed as a venue partner [owner-2026-11].
    delisted: true,
    description: 'Hosting venue for ZurichJS meetups',
    source: 'old-partners, owner-2026-11',
  },
  {
    id: 'novu',
    name: 'novu AG',
    url: 'https://novu.ch/',
    logo: logo('novu.webp'),
    kinds: ['venue'],
    current: false,
    description: 'Hosting venue for ZurichJS meetups',
    source: 'old-partners',
  },
  {
    id: 'getyourguide',
    name: 'GetYourGuide',
    url: 'https://qrco.de/bgTBWh',
    logo: logo('get-your-guide.webp'),
    kinds: ['venue'],
    current: false,
    description: 'Software company hosting us for Vue Zurich/ZurichJS meetups',
    source: 'old-partners',
  },
  {
    id: 'smallpdf',
    name: 'Smallpdf',
    url: 'https://smallpdf.com',
    logo: logo('smallpdf.webp'),
    kinds: ['venue'],
    current: false,
    description: 'Hosting venue for ZurichJS meetups',
    source: 'old-partners',
  },
  {
    id: 'orbiz-josef',
    name: 'Orbiz Josef Zurich',
    url: 'https://orbiz-flex.ch/standort/josef',
    logo: logo('orbiz.webp'),
    kinds: ['venue'],
    current: false,
    description: 'Hosting venue for ZurichJS meetups',
    source: 'old-partners',
  },

  // Conference partners: "Conferences offering exclusive discounts to our members". Production shows them as active; confirm.
  {
    id: 'whatthestack',
    name: 'WhatTheStack',
    url: 'https://wts.sh',
    logo: logo('wts.webp'),
    kinds: ['conference'],
    current: true,
    description: 'Exclusive perks for ZurichJS members',
    source: 'old-partners',
  },
  {
    id: 'cityjs',
    name: 'CityJS',
    url: 'https://cityjsconf.org/',
    logo: logo('city-js.webp'),
    kinds: ['conference'],
    // A past supporter now (owner, 4th November 2026).
    current: false,
    description: 'Exclusive perks for ZurichJS members',
    source: 'old-partners',
  },
  {
    id: 'ijs-munich',
    name: 'iJS Munich',
    url: 'https://javascript-conference.com/munich/',
    logo: logo('ijs-munich.webp'),
    kinds: ['conference'],
    current: true,
    description: 'The Conference for Fullstack JS Development',
    source: 'old-partners',
  },
  // Production files Grusp under conference partners, with a community description.
  {
    id: 'grusp',
    name: 'Grusp',
    url: 'https://www.grusp.org/',
    logo: logo('grusp.webp'),
    kinds: ['conference'],
    current: true,
    description: 'Regional JavaScript community partner',
    source: 'old-partners',
  },

  // Community partners: "Fellow tech communities we collaborate with".
  // Code Blossom: a March 2025 partnership (About timeline); withdrawn from promotion [owner-2026-11].
  {
    id: 'code-blossom',
    name: 'Code Blossom',
    url: 'https://www.code-blossom.com/',
    logo: logo('code-blossom.webp'),
    kinds: ['community'],
    current: false,
    delisted: true,
    source: 'old-partners, owner-2026-11',
  },
  {
    id: 'web-zurich',
    name: 'Web Zurich',
    url: 'https://webzurich.ch/',
    logo: logo('webzurich.webp'),
    kinds: ['community'],
    current: true,
    description: 'Regional web development community partner',
    source: 'old-partners',
  },

  // Supporting partners: "Companies providing resources and tools".
  {
    id: 'swiss-dev-jobs',
    name: 'Swiss Dev Jobs',
    url: 'https://swissdevjobs.ch/jobs/JavaScript/all',
    logo: logo('sdj-rectangle.webp'),
    kinds: ['supporting'],
    current: true,
    description: 'Job board access for ZurichJS members',
    source: 'old-partners',
  },
  {
    id: 'jetbrains',
    name: 'JetBrains',
    url: 'https://www.jetbrains.com/',
    logo: logo('jetbrains.webp'),
    kinds: ['supporting'],
    current: true,
    description: 'Software licenses and tools for ZurichJS',
    source: 'old-partners',
  },

  // Previous partners and sponsors. Production shows logos only, without links or roles.
  // Kinds follow production's own wording elsewhere: Dynatrace "supported" the October 2025 meetup [old-about].
  // Voxxed Days Zurich is current again; DotJS and React Paris are no longer shown [owner-2026-11].
  { id: 'voxxed-days-zurich', name: 'Voxxed Days Zurich', logo: logo('voxxed-days-zurich.webp'), kinds: ['conference'], current: true, source: 'old-previous' },
  { id: 'dotjs', name: 'DotJS', logo: logo('dotjs.webp'), kinds: ['conference'], current: false, delisted: true, source: 'old-previous' },
  { id: 'react-paris', name: 'React Paris', logo: logo('react-paris.webp'), kinds: ['conference'], current: false, delisted: true, source: 'old-previous' },
  { id: 'dynatrace', name: 'Dynatrace', logo: logo('dynatrace.webp'), kinds: ['sponsor'], current: false, source: 'old-previous' },

  // Past sponsors named on the event photos' sponsor banners [photo-banners].
  { id: 'aws', name: 'AWS', url: 'https://aws.amazon.com', logo: logo('aws.svg'), kinds: ['sponsor'], current: false, source: 'owner' },
  { id: 'gatling', name: 'Gatling', url: 'https://gatling.io', logo: logo('gatling.svg'), kinds: ['sponsor'], current: false, source: 'owner' },
  { id: 'supabase', name: 'Supabase', url: 'https://supabase.com', logo: logo('supabase.svg'), kinds: ['sponsor'], current: false, source: 'owner' },
  { id: 'remotion', name: 'Remotion', url: 'https://www.remotion.dev', logo: logo('remotion.svg'), kinds: ['sponsor'], current: false, source: 'owner' },
  { id: 'sae-institute', name: 'SAE Institute Zürich', url: 'https://www.sae.swiss', logo: logo('sae-institute.svg'), kinds: ['venue'], current: true, source: 'owner' },
  { id: 'sentry', name: 'Sentry', url: 'https://sentry.io', logo: logo('sentry.svg'), kinds: ['sponsor'], current: false, source: 'prospectus' },
  { id: 'cloudflare', name: 'Cloudflare', url: 'https://www.cloudflare.com', logo: logo('cloudflare.svg'), kinds: ['sponsor'], current: false, source: 'photo-banners' },
  { id: 'imagekit', name: 'ImageKit', url: 'https://imagekit.io', logo: logo('imagekit.svg'), kinds: ['sponsor'], current: false, source: 'photo-banners' },
  { id: 'storyblok', name: 'Storyblok', url: 'https://www.storyblok.com', logo: logo('storyblok.webp'), kinds: ['sponsor'], current: false, source: 'photo-banners' },
  { id: 'onlydust', name: 'OnlyDust', url: 'https://www.onlydust.com', logo: logo('only-dust.webp'), kinds: ['sponsor'], current: false, source: 'photo-banners' },
  { id: 'platformatic', name: 'Platformatic', url: 'https://platformatic.dev', logo: logo('platformatic.svg'), kinds: ['sponsor'], current: false, source: 'photo-banners' },
  {
    id: 'digitec-galaxus',
    name: 'Digitec Galaxus',
    url: 'https://www.galaxus.ch',
    logo: logo('digitec-galaxus.webp'),
    kinds: ['sponsor'],
    current: false,
    source: 'photo-banners',
  },
];

/**
 * Partners the owner withdrew from all promotion (2nd and 3rd November 2026), by id or
 * name. Applied to Sanity partners too, so a seeded or re-imported document
 * cannot bring them back onto partner lists, logo walls or upcoming event pages.
 */
export const DELISTED_PARTNERS: readonly string[] = ['ginetta', 'code-blossom', 'dotjs', 'react-paris'];
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
export const isDelisted = (p: Pick<Partner, 'id' | 'name' | 'delisted'>) =>
  p.delisted === true || DELISTED_PARTNERS.includes(norm(p.id)) || DELISTED_PARTNERS.includes(norm(p.name));

/** The partner list without the source notes. */
export const PARTNERS: Partner[] = PARTNER_RECORDS.map(({ source: _source, ...p }) => p);

/**
 * Partners thanked on a specific event, by event slug (production Sanity ids).
 * Only what production stated for that evening.
 */
export const EVENT_SUPPORTERS: Record<string, Sourced<{ partnerId: string; role: SupporterRole }>[]> = {
  // The conference warm-up: "Today's Sponsors" on production's Tonight page.
  'sep-2026': [
    { partnerId: 'getyourguide', role: 'venue', source: 'old-today' },
    { partnerId: 'gyff', role: 'sponsor', source: 'old-today' },
    { partnerId: 'fin', role: 'sponsor', source: 'old-today' },
  ],
  // "A Halloween meetup … with the support of Dynatrace."
  'pro-zurichjs-meetup-9': [{ partnerId: 'dynatrace', role: 'sponsor', source: 'old-about' }],
};

/** How each venue partner's name appears in an event's `location` [sanity-event]. */
const VENUE_NAMES: Record<string, RegExp> = {
  ginetta: /\bginetta\b/i,
  novu: /\bnovu\b/i,
  getyourguide: /\bget\s?your\s?guide\b/i,
  smallpdf: /\bsmallpdf\b/i,
  'orbiz-josef': /\borbiz\b/i,
};

/** The venue partner whose name is the event's location, if any. */
export function venueHost(venueName: string | undefined, partners: Partner[]): string | undefined {
  if (!venueName) return undefined;
  return partners.find((p) => p.kinds.includes('venue') && VENUE_NAMES[p.id]?.test(venueName))?.id;
}

/**
 * Sanity partners when there are any; otherwise the production record above,
 * with each event's host (from its location) and stated supporters filled in
 * where Sanity has none. Sanity's own event hosts and supporters always win.
 */
export function withPartnerFallback(partners: Partner[], events: Event[]): { partners: Partner[]; events: Event[]; source: 'sanity' | 'code' } {
  if (partners.length > 0) return { partners: partners.map((p) => (isDelisted(p) ? { ...p, current: false, delisted: true } : p)), events, source: 'sanity' };
  const fallback = PARTNERS;
  return {
    partners: fallback,
    source: 'code',
    events: events.map((e) => {
      const host = venueHost(e.venue?.name, fallback);
      const stated = (EVENT_SUPPORTERS[e.slug] ?? []).map(({ partnerId, role }) => ({ partnerId, role }));
      return {
        ...e,
        hosts: e.hosts?.length ? e.hosts : host ? [host] : [],
        supporters: e.supporters?.length ? e.supporters : stated,
      };
    }),
  };
}

/* -------------------------------------------------------------------------- */
/* The sponsorship offering [old-tiers]                                         */
/* -------------------------------------------------------------------------- */

export interface SponsorshipTierOffer {
  id: SponsorTier | 'host';
  name: string;
  prices: { label: string; amount: string; note?: string }[];
  perks: string[];
  description?: string;
}

/**
 * Production's tiers, prices and benefits, verbatim apart from punctuation (no
 * em dashes, one thousands separator), minus the discontinued workshop perk.
 * Yearly is ten times monthly ("2 months free"), as production states.
 */
export const SPONSORSHIP_TIERS: SponsorshipTierOffer[] = [
  {
    id: 'champion',
    name: 'Community Champion',
    prices: [
      { label: 'Yearly', amount: 'CHF 7’500', note: '2 months free' },
      { label: 'Monthly', amount: 'CHF 750' },
      { label: 'One-time', amount: 'CHF 1’000' },
    ],
    perks: [
      'XL logo on our site and partner list',
      'Branded photos of the event',
      'Sponsor slides or video at each meetup',
      'Personal shoutout and introduction at events',
      'Featured mention in event announcements',
      'Direct access to recruit from our talent pool',
      'Priority input on future meetup topics',
      // Production also listed "Co-host one exclusive workshop per year". Workshops are discontinued, so it is not offered.
      'Swag distribution at events',
    ],
  },
  {
    id: 'builder',
    name: 'Community Builder',
    prices: [
      { label: 'Yearly', amount: 'CHF 5’000', note: '2 months free' },
      { label: 'Monthly', amount: 'CHF 500' },
      { label: 'One-time', amount: 'CHF 700' },
    ],
    perks: [
      'Large logo on our site and partner list',
      '2 sponsor slides in rotation at meetups',
      'Social media mentions and shoutouts',
      'Name-drop and recognition at events',
      'Access to post job opportunities',
      'Swag distribution at events',
    ],
  },
  {
    id: 'friend',
    name: 'Community Friend',
    prices: [
      { label: 'Yearly', amount: 'CHF 3’000', note: '2 months free' },
      { label: 'Monthly', amount: 'CHF 300' },
      { label: 'One-time', amount: 'CHF 400' },
    ],
    perks: ['Medium logo on our site and partner list', '1 sponsor slide in rotation at meetups', 'Name-drop and recognition at events', 'Swag distribution at events'],
  },
  {
    id: 'supporter',
    name: 'Community Supporter',
    prices: [
      { label: 'Yearly', amount: 'CHF 1’500', note: '2 months free' },
      { label: 'Monthly', amount: 'CHF 150' },
      { label: 'One-time', amount: 'CHF 250' },
    ],
    perks: ['Small logo on our site and partner list', '1 sponsor slide in rotation at meetups', 'Swag distribution at events'],
  },
  {
    id: 'host',
    name: 'Community Host',
    description: 'Host our meetup at your venue. Covering speaker travel (about CHF 1’500 to 2’500) automatically qualifies you as a Community Friend sponsor.',
    prices: [
      { label: 'Venue only', amount: 'Free', note: 'when hosting' },
      { label: 'Venue and speaker travel', amount: 'CHF 1’500 to 2’500', note: 'becomes Community Friend' },
    ],
    perks: [
      'Logo recognition for the event',
      'Company introduction at the hosted event',
      'Social media mentions',
      'Cover speaker travel costs and automatically qualify as Community Friend',
      'Food and drinks are welcome, but do not replace a sponsorship package',
    ],
  },
];

/** "Request the Prospectus" on production: an email to the organisers with this subject. */
export const PROSPECTUS_MAILTO = 'mailto:hello@zurichjs.com?subject=ZurichJS%20Sponsorship%20Prospectus%20Request';

/** Reach as of November 2026 (owner, 3rd November 2026, including the page views); RSVPs per meetup from the 2026 sponsorship prospectus. */
/** "30+ trusted sponsors and partners to date" [prospectus]. */
export const PARTNERS_TO_DATE = '30+';
/** "International speakers and attendees from 10+ countries" [prospectus]. */
export const COUNTRIES_REACHED = '10+';
export const REACH_STATS: { value: string; label: string }[] = [
  { value: '1K+', label: 'Meetup members' },
  { value: '50%+', label: 'repeat attendees' },
  { value: '1.6K+', label: 'followers across LinkedIn, Instagram, X and Bluesky' },
  { value: '50 to 100', label: 'RSVPs per meetup' },
  { value: '52K+', label: 'website page views since the March 2025 launch' },
  { value: PARTNERS_TO_DATE, label: 'sponsors and partners to date' },
];
export const REACH_AS_OF = 'November 2026';

/**
 * "Our typical Audience" on conf.zurichjs.com/sponsorship [conf-sponsor], which
 * calls it "the meetup attendee profile". Undated, no method stated.
 */
export const AUDIENCE_PROFILE: { value: string; label: string }[] = [
  { value: '75%+', label: 'full-stack or frontend engineers' },
  { value: '40%', label: 'in senior roles' },
  { value: '60%+', label: 'with five or more years of experience' },
];
// What the audience works with (owner, 3rd November 2026): far beyond JavaScript. Qwik and Laravel came up in past talks.
export const AUDIENCE_INTERESTS = [
  'JavaScript',
  'TypeScript',
  'React',
  'Next.js',
  'Vue',
  'Nuxt',
  'Angular',
  'Svelte',
  'Astro',
  'Qwik',
  'Node.js',
  'Python',
  'Java',
  'Go',
  'Ruby',
  'PHP and Laravel',
  'GraphQL',
  'Performance',
  'AI integration',
  'Testing',
  'DevOps',
];

/** [old-stats] "International reach", without the flags. */
export const REACH_COUNTRIES = 'Attendees and speakers have travelled in for the meetup from the Swiss French side, Germany, France, Belgium, Italy, Greece, and Albania.';
