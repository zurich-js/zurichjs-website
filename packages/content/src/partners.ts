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
 */
import type { Event, Partner, SponsorTier, SupporterRole } from '@zurichjs/events';

type Sourced<T> = T & { source: string };

const logo = (f: string) => `/images/partners/${f}`;

export const PARTNER_RECORDS: Sourced<Partner>[] = [
  // Current sponsors: production lists these under "Our Sponsors" with a tier.
  {
    id: 'vercel',
    name: 'Vercel',
    url: 'https://vercel.com',
    logo: logo('vercel-black.webp'),
    kinds: ['sponsor'],
    tier: 'champion',
    current: true,
    description: 'The AI Cloud for building and deploying modern web applications',
    blurb: 'Vercel is a unified platform to build, deploy, and scale web applications, from static sites and full-stack apps to AI-powered experiences.',
    source: 'old-partners',
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
    description: 'Hosting venue for ZurichJS meetups',
    source: 'old-partners',
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
    current: true,
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
  {
    id: 'code-blossom',
    name: 'Code Blossom',
    url: 'https://www.code-blossom.com/',
    logo: logo('code-blossom.webp'),
    kinds: ['community'],
    current: true,
    description: 'Regional JavaScript community partner',
    source: 'old-partners',
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
  { id: 'voxxed-days-zurich', name: 'Voxxed Days Zurich', logo: logo('voxxed-days-zurich.webp'), kinds: ['conference'], current: false, source: 'old-previous' },
  { id: 'dotjs', name: 'DotJS', logo: logo('dotjs.webp'), kinds: ['conference'], current: false, source: 'old-previous' },
  { id: 'react-paris', name: 'React Paris', logo: logo('react-paris.webp'), kinds: ['conference'], current: false, source: 'old-previous' },
  { id: 'dynatrace', name: 'Dynatrace', logo: logo('dynatrace.webp'), kinds: ['sponsor'], current: false, source: 'old-previous' },
];

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
  if (partners.length > 0) return { partners, events, source: 'sanity' };
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

/** Production's tiers, prices and benefits, verbatim apart from punctuation (no em dashes, one thousands separator). */
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
      'Co-host one exclusive workshop per year',
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
    description: 'Host our meetup at your venue. Covering speaker travel (about CHF 1’500–2’500) automatically qualifies you as a Community Friend sponsor.',
    prices: [
      { label: 'Venue only', amount: 'Free', note: 'when hosting' },
      { label: 'Venue + speaker travel', amount: 'CHF 1’500–2’500', note: 'becomes Community Friend' },
    ],
    perks: [
      'Logo recognition for the event',
      'Company introduction at the hosted event',
      'Social media mentions',
      'Cover speaker travel costs and automatically qualify as Community Friend',
      'Food & beverage welcome but does not replace partnership tier',
    ],
  },
];

/** "Request the Prospectus" on production: an email to the organisers with this subject. */
export const PROSPECTUS_MAILTO = 'mailto:hello@zurichjs.com?subject=ZurichJS%20Sponsorship%20Prospectus%20Request';

/** Production's reach figures, as published in October 2025 [old-stats]. Shown with that date; confirm before updating. */
export const REACH_STATS: { value: string; label: string }[] = [
  { value: '900', label: 'members across ZurichJS and Vue Zurich' },
  { value: '50–100', label: 'RSVPs per meetup, 70–80% confirmed participation' },
  { value: '15’000+', label: 'website views in 6 months' },
  { value: '525+', label: 'LinkedIn followers' },
  { value: '35%', label: 'repeat attendees' },
  { value: '114', label: 'peak RSVP rate' },
];

/** [old-stats] "International reach", without the flags. */
export const REACH_COUNTRIES = 'Attendees and speakers have travelled in for the meetup from the Swiss French side, Germany, France, Belgium, Italy, Greece, and Albania.';
