/**
 * SAMPLE CONTENT from the V2 design prototype (Swiss "Muster" names, Sample
 * Venue AG, placeholder logos). Used only when Sanity is not configured or not
 * reachable; the build logs loudly when it is used. Never presented as real.
 */
import type { MediaItem } from './media.ts';
import { PARTNERS as PRODUCTION_PARTNERS } from './partners.ts';
import {
  buildSchedule,
  type AwardRecord,
  type ConferenceCopy,
  type ConferenceState,
  type Event,
  type Partner,
  type Quote,
  type RatingRecord,
  type ScheduleInput,
  type Speaker,
  type TalkRef,
} from '@zurichjs/events';

/* -------------------------------------------------------------------------- */
/* Site-wide records                                                           */
/* -------------------------------------------------------------------------- */

export const SITE = {
  name: 'ZurichJS',
  email: 'hello@zurichjs.com',
  meetupGroupUrl: 'https://www.meetup.com/zurich-js/',
  linkedinUrl: 'https://www.linkedin.com/company/zurichjs',
  instagramUrl: 'https://www.instagram.com/zurich.js',
  blueskyUrl: 'https://bsky.app/profile/zurichjs.com',
  xUrl: 'https://x.com/zurichjs',
  /** The Slack invite (owner, 4th November 2026), used unless Site settings in Sanity set another. */
  slackInviteUrl: 'https://join.slack.com/t/zurichjs/shared_invite/zt-4dlq2wk5i-fsL14ZKQcn78tnOJWuVHAQ',
  confUrl: 'https://conf.zurichjs.com',
  confSponsorshipUrl: 'https://conf.zurichjs.com/sponsorship',
  confContactUrl: 'https://conf.zurichjs.com/contact',
  association: 'Swiss JavaScript Group',
  uid: 'CHE-255.581.547',
};

/**
 * Sourced starting value, not a live integration. Meetup API approval is
 * unavailable, so organisers update this record by hand after checking the
 * group page. The site shows it out of 5 (owner, 4th November 2026).
 */
export const RATING: RatingRecord = {
  score: '4.9',
  scale: 5,
  count: 199,
  url: SITE.meetupGroupUrl,
  source: 'Meetup group page, public snapshot',
  checkedAt: '2026-09-28',
};

export const AWARD: AwardRecord = {
  title: '2026 Open Source Award winner',
  category: 'Most Impactful Contribution to the Community',
  url: 'https://www.linkedin.com/posts/jsnation-the-main-js-conference_congrats-to-all-the-winners-of-the-open-activity-7474846182234771456-BOu0',
};

export const CONFERENCE_STATE: ConferenceState = 'unannounced';

export const CONFERENCE: Record<ConferenceState, ConferenceCopy> = {
  unannounced: {
    headline: 'Our annual conference, with community events and workshops around it.',
    body: 'The next edition hasn’t been announced yet. The conference site has the latest.',
    cta: 'Visit conf.zurichjs.com',
    cfp: 'It opens when the next edition is announced.',
  },
  announced: {
    headline: 'Our annual conference, with community events and workshops around it.',
    body: 'The next edition is announced. Tickets are not on sale yet.',
    cta: 'Visit conf.zurichjs.com',
    cfp: 'Check the conference site for dates.',
  },
  onsale: {
    headline: 'JS Conference by humans, for humans.',
    body: 'Tickets for the next edition are on sale on the conference site.',
    cta: 'Get conference tickets',
    cfp: 'See the conference site for its status.',
  },
  soldout: {
    headline: 'Sold out. Thank you.',
    body: 'The conference is sold out. The conference site runs its own waitlist.',
    cta: 'Conference waitlist',
    cfp: 'It is closed.',
  },
  completed: {
    headline: 'Our annual conference, with community events and workshops around it.',
    body: 'The 2026 edition is over. The conference site has the recap.',
    cta: 'See the last edition',
    cfp: 'It is closed.',
  },
};

/* -------------------------------------------------------------------------- */
/* Photos                                                                       */
/* -------------------------------------------------------------------------- */

export const PHOTOS = {
  audience: { src: '/images/photos/meetup-may.webp', alt: 'People laughing in the audience during a ZurichJS talk' },
  speaker: { src: '/images/photos/meetup-jens.webp', alt: 'A speaker presenting to the room at a ZurichJS meetup', position: 'center 25%' },
  nodeWorkshop: { src: '/images/photos/meetup-june.webp', alt: 'Attendees at the June 2025 Node.js workshop at ORBIZ Josef' },
  conversation: { src: '/images/photos/meetup-ginetta.webp', alt: 'Attendees talking after the talks at a ZurichJS meetup' },
  cloudflare: { src: '/images/photos/cloudflare.webp', alt: 'Meetup photo' },
  community3: { src: '/images/photos/meetup-3.webp', alt: 'Attendees at a ZurichJS meetup' },
};

/* -------------------------------------------------------------------------- */
/* Speakers (sample content, Swiss "Muster" names)                              */
/* -------------------------------------------------------------------------- */

export const SPEAKERS: Speaker[] = [
  {
    id: 'anna-beispiel',
    name: 'Anna Beispiel',
    role: 'Frontend engineer',
    company: 'Sample Company AG',
    initials: 'AB',
    bio: 'Anna builds form-heavy products and cares about what happens when validation meets real users. She has spoken at ZurichJS about accessible components and TypeScript at the edges of an app.',
    topics: ['forms', 'typescript', 'accessibility'],
    tagline: 'Forms and TypeScript',
    links: [
      { label: 'GitHub', url: 'https://github.com/' },
      { label: 'LinkedIn', url: 'https://www.linkedin.com/' },
      { label: 'Website', url: 'https://example.com/' },
    ],
    talks: [
      {
        id: 'talk.retro',
        slug: 'one-year-retro',
        title: 'A year of ZurichJS, looking back',
        format: 'Talk',
        durationMin: 25,
        tags: ['Community'],
        eventSlugs: ['2025-11-anniversary'],
      },
      { title: 'Accessible comboboxes: the hard parts', format: 'Talk', tags: ['Accessibility', 'React'], eventSlugs: ['2025-11-anniversary'] },
      { title: 'TypeScript at the edges of your app', format: 'Lightning talk', tags: ['TypeScript'], eventSlugs: ['2025-03-partnerships'] },
    ],
  },
  {
    id: 'max-muster',
    name: 'Max Muster',
    role: 'Design systems lead',
    initials: 'MM',
    bio: 'Max leads a design system used by four product teams and talks about adoption, versioning and the components worth deleting.',
    topics: ['design systems', 'css'],
    tagline: 'Design systems',
    links: [{ label: 'LinkedIn', url: 'https://www.linkedin.com/' }],
    talks: [
      { id: 'talk.next', slug: 'whats-next', title: 'What comes next', format: 'Lightning talk', durationMin: 10, tags: ['Community'], eventSlugs: ['2025-11-anniversary'] },
      { title: 'Tokens that survive a rebrand', format: 'Talk', tags: ['Design systems', 'CSS'], eventSlugs: ['2025-11-anniversary'] },
      { title: 'CSS layers in a large codebase', format: 'Talk', tags: ['CSS'], eventSlugs: ['2025-03-partnerships'] },
      { title: 'Design systems nobody asked for', format: 'Lightning talk', tags: ['Design systems'], eventSlugs: ['2026-05-testing'] },
    ],
  },
  {
    id: 'lea-platzhalter',
    name: 'Lea Platzhalter',
    role: 'Staff engineer',
    initials: 'LP',
    bio: 'Lea works on React performance at scale and co-presents with Max on design system adoption.',
    topics: ['design systems', 'react'],
    tagline: 'React at scale',
    links: [{ label: 'GitHub', url: 'https://github.com/' }],
    talks: [{ title: 'React at scale: what we measure', format: 'Talk', tags: ['React', 'Performance'], eventSlugs: ['2026-05-testing'] }],
  },
  {
    id: 'jonas-test',
    name: 'Jonas Test',
    role: 'Developer advocate',
    initials: 'JT',
    bio: 'Jonas tests what users actually do and has a soft spot for Playwright traces.',
    topics: ['testing', 'playwright'],
    tagline: 'Testing',
    links: [{ label: 'Website', url: 'https://example.com/' }],
    talks: [
      { title: 'Testing what users actually do', format: 'Talk', tags: ['Testing', 'Playwright'], eventSlugs: ['2026-05-testing'] },
      { title: 'Flaky tests, honest fixes', format: 'Lightning talk', tags: ['Testing'], eventSlugs: ['2025-03-partnerships'] },
      { title: 'Traces over screenshots', format: 'Talk', tags: ['Testing', 'Playwright'], eventSlugs: ['2025-11-anniversary'] },
      { title: 'Testing at the edge', format: 'Lightning talk', tags: ['Testing', 'Edge'], eventSlugs: ['2026-06-edge-runtimes'] },
    ],
  },
  {
    id: 'urs-vorlage',
    name: 'Urs Vorlage',
    role: 'Freelance web developer',
    initials: 'UV',
    bio: 'Urs moved three client deployments to edge runtimes and reports on what actually changed.',
    topics: ['edge runtimes'],
    tagline: 'Edge runtimes',
    links: [{ label: 'Website', url: 'https://example.com/' }],
    talks: [{ title: 'Edge runtimes in practice: what actually changed in our deploys', format: 'Talk', tags: ['Edge', 'Node.js'], eventSlugs: ['2026-06-edge-runtimes'] }],
  },
  {
    id: 'mia-entwurf',
    name: 'Mia Entwurf',
    role: 'Engineering manager',
    initials: 'ME',
    bio: 'Mia manages a platform team and keeps a list of the places fine-grained reactivity paid off, and the two where it did not.',
    topics: ['signals', 'state'],
    tagline: 'Signals',
    links: [{ label: 'LinkedIn', url: 'https://www.linkedin.com/' }],
    // Sample of a speaker whose ID was cleaned up: the old URL keeps working (301).
    legacySlugs: ['Mia_Entwurf'],
    talks: [
      { title: 'Signals without the hype: what we kept after six months', format: 'Talk', tags: ['Signals', 'State'], eventSlugs: ['2026-09-signals-streams'] },
      { title: 'State that outlives the component', format: 'Lightning talk', tags: ['State', 'React'], eventSlugs: ['2025-11-anniversary'] },
      {
        title: 'Agentic checkout flows in the browser',
        description: 'What changes when an AI agent, not a person, fills in your checkout.',
        format: 'Talk',
        tags: ['AI', 'React'],
        eventSlugs: ['2025-11-anniversary'],
      },
    ],
  },
  {
    id: 'noah-probe',
    name: 'Noah Probe',
    role: 'Student',
    initials: 'NP',
    bio: 'Noah is finishing a degree in Zurich and gave his first talk at ZurichJS, about Node streams and a coffee machine.',
    topics: ['streams', 'node'],
    tagline: 'Node streams',
    links: [{ label: 'GitHub', url: 'https://github.com/' }],
    talks: [{ title: 'Streams in Node, explained with a coffee machine', format: 'Lightning talk', tags: ['Node.js'], eventSlugs: ['2026-09-signals-streams'] }],
  },
  {
    id: 'sara-vorlage',
    name: 'Sara Vorlage',
    role: 'Accessibility specialist',
    initials: 'SV',
    bio: 'Sara audits component libraries and teaches teams to test with assistive technology. She has spoken twice at ZurichJS.',
    topics: ['accessibility', 'testing'],
    tagline: 'Accessibility',
    links: [{ label: 'Website', url: 'https://example.com/' }],
    talks: [
      { title: 'Testing what users actually do', format: 'Talk', tags: ['Testing', 'Playwright'], eventSlugs: ['2026-05-testing'] },
      { title: 'Screen reader testing in ten minutes', format: 'Lightning talk', tags: [], eventSlugs: ['2025-11-anniversary'] },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Events                                                                       */
/* -------------------------------------------------------------------------- */

const SAMPLE_VENUE = {
  name: 'Sample Venue AG',
  street: 'Musterstrasse 1',
  zip: '8005',
  city: 'Zürich',
  directions: 'Tram 4 to Musterplatz, 3 min walk. Bike parking at the entrance.',
};

const PRACTICAL_MEETUP = [
  { label: 'Cost', value: 'Free. RSVP helps the host plan food and space.' },
  { label: 'Language', value: 'Talks in English.' },
  { label: 'Who it’s for', value: 'Anyone who builds software, or is curious about it. Juniors to CTOs. First-timers very welcome.' },
  { label: 'Code of conduct', value: 'All ZurichJS events follow our code of conduct.' },
];

/** Sample events are written like Sanity data: an agenda (times as organisers typed them) and/or talks. */
type SampleEvent = Omit<Event, 'agenda'> & { agenda: NonNullable<ScheduleInput['agenda']>; talks?: TalkRef[] };

const SAMPLE_EVENTS: SampleEvent[] = [
  {
    id: 'u-nov-2026',
    slug: '2026-11-forms-types',
    title: 'Forms, types and design systems',
    status: 'scheduled',
    startsAt: '2026-11-18T18:30:00+01:00',
    endsAt: '2026-11-18T21:30:00+01:00',
    venue: SAMPLE_VENUE,
    meetupUrl: 'https://www.meetup.com/zurich-js/events/',
    description:
      'Two talks about building forms people can trust and the design systems that hold them together. Bring questions; there is time after each talk and plenty after the programme.',
    agenda: [
      { time: '18:30', title: 'Doors open', note: 'Drinks, name tags, time to find a seat.' },
      {
        time: '19:00',
        title: 'Type-safe forms without the ceremony',
        talk: {
          speakerIds: ['anna-beispiel'],
          title: 'Type-safe forms without the ceremony',
          description: 'How to share one schema between client validation, server actions and error messages, and where that breaks down.',
          format: 'talk',
          durationMin: 25,
          level: 'Intermediate',
          language: 'English',
        },
      },
      {
        time: '19:35',
        title: 'What we learned shipping a design system across teams that did not ask for one',
        talk: {
          speakerIds: ['max-muster', 'lea-platzhalter'],
          title: 'What we learned shipping a design system across teams that did not ask for one',
          description: 'Adoption, versioning and the components we deleted. A two-person talk with a long Q&A.',
          format: 'deep-dive',
          durationMin: 35,
          level: 'All levels',
          language: 'English',
        },
      },
      { time: '20:15', title: 'Food and conversation', note: 'Hosted by the venue partner. Vegetarian and vegan options.' },
      { time: '21:30', title: 'Close' },
    ],
    practical: PRACTICAL_MEETUP,
    photos: [],
    hosts: ['smallpdf'],
    supporters: [
      { partnerId: 'smallpdf', role: 'venue' },
      { partnerId: 'gyff', role: 'sponsor' },
      { partnerId: 'fin', role: 'food' },
    ],
  },
  {
    id: 'p-sep-2026',
    slug: '2026-09-signals-streams',
    title: 'Signals, streams and the state of state',
    status: 'scheduled',
    startsAt: '2026-09-16T18:30:00+02:00',
    endsAt: '2026-09-16T21:30:00+02:00',
    venue: SAMPLE_VENUE,
    meetupUrl: 'https://www.meetup.com/zurich-js/events/',
    description: 'Two talks and photos from the evening.',
    agenda: [
      { time: '18:30', title: 'Doors open' },
      {
        time: '19:00',
        title: 'Signals without the hype: what we kept after six months',
        talk: { speakerIds: ['mia-entwurf'], title: 'Signals without the hype: what we kept after six months', format: 'talk', durationMin: 25 },
      },
      {
        time: '19:35',
        title: 'Streams in Node, explained with a coffee machine',
        talk: { speakerIds: ['noah-probe'], title: 'Streams in Node, explained with a coffee machine', format: 'lightning', durationMin: 5 },
      },
      { time: '20:00', title: 'Food and conversation' },
      { time: '21:30', title: 'Close' },
    ],
    practical: PRACTICAL_MEETUP,
    photos: [
      { src: PHOTOS.audience.src, alt: 'Audience during a talk' },
      { src: PHOTOS.speaker.src, alt: 'Speaker presenting' },
      { src: PHOTOS.cloudflare.src, alt: 'Meetup photo' },
      { src: PHOTOS.conversation.src, alt: 'Meetup photo' },
    ],
    recap: {
      talks: [
        {
          title: 'Signals without the hype: what we kept after six months',
          speakerIds: ['mia-entwurf'],
          summary: 'Where fine-grained reactivity paid off in a large app, and the two places the team went back to plain state.',
          format: 'Talk · 25 min',
        },
        {
          title: 'Streams in Node, explained with a coffee machine',
          speakerIds: ['noah-probe'],
          summary: 'Backpressure, pipelines and the bug that made the talk necessary.',
          format: 'Lightning talk · 5 min',
        },
      ],
    },
  },
  {
    // A social evening without talks (production: /events/june-2026). Only evening feedback, no talk ratings.
    // No agenda and no end time: the page says "Starts 18:00" and nothing more.
    id: 'p-jul-2026',
    slug: '2026-07-summer-social',
    title: 'Summer social',
    status: 'scheduled',
    startsAt: '2026-07-08T18:00:00+02:00',
    venue: SAMPLE_VENUE,
    description: 'An evening without talks: drinks, food and time to meet the community.',
    agenda: [],
    practical: PRACTICAL_MEETUP,
    photos: [],
  },
  {
    id: 'p-jun-2026',
    slug: '2026-06-edge-runtimes',
    title: 'Edge runtimes in practice: what actually changed in our deploys',
    status: 'scheduled',
    startsAt: '2026-06-24T18:30:00+02:00',
    endsAt: '2026-06-24T21:30:00+02:00',
    venue: SAMPLE_VENUE,
    description: 'Three talks and photos from the evening.',
    agenda: [
      { time: '18:30', title: 'Doors open' },
      {
        time: '19:00',
        title: 'Edge runtimes in practice: what actually changed in our deploys',
        talk: { speakerIds: ['urs-vorlage'], title: 'Edge runtimes in practice: what actually changed in our deploys', format: 'talk', durationMin: 25 },
      },
      { time: '19:35', title: 'Testing at the edge', talk: { speakerIds: ['jonas-test'], title: 'Testing at the edge', format: 'lightning', durationMin: 5 } },
      { time: '21:30', title: 'Close' },
    ],
    practical: PRACTICAL_MEETUP,
    photos: [
      { src: PHOTOS.conversation.src, alt: 'Meetup photo' },
      { src: PHOTOS.audience.src, alt: 'Audience during a talk' },
    ],
    recap: {
      talks: [
        {
          title: 'Edge runtimes in practice: what actually changed in our deploys',
          speakerIds: ['urs-vorlage'],
          summary: 'Cold starts, regional data and the surprising bill. Three client deployments compared.',
          format: 'Talk · 25 min',
        },
        { title: 'Testing at the edge', speakerIds: ['jonas-test'], summary: 'Running the same Playwright suite against every region.', format: 'Lightning talk · 5 min' },
      ],
    },
  },
  {
    id: 'p-may-2026',
    slug: '2026-05-testing',
    title: 'Testing what users actually do',
    status: 'scheduled',
    startsAt: '2026-05-20T18:30:00+02:00',
    endsAt: '2026-05-20T21:30:00+02:00',
    venue: SAMPLE_VENUE,
    description: 'Two talks.',
    agenda: [
      { time: '18:30', title: 'Doors open' },
      {
        time: '19:00',
        title: 'Testing what users actually do',
        talk: { speakerIds: ['jonas-test', 'sara-vorlage'], title: 'Testing what users actually do', format: 'talk', durationMin: 25 },
      },
      {
        time: '19:35',
        title: 'React at scale: what we measure',
        talk: { speakerIds: ['lea-platzhalter'], title: 'React at scale: what we measure', format: 'talk', durationMin: 25 },
      },
      { time: '21:30', title: 'Close' },
    ],
    practical: PRACTICAL_MEETUP,
    photos: [],
    recap: {
      talks: [
        {
          title: 'Testing what users actually do',
          speakerIds: ['jonas-test', 'sara-vorlage'],
          summary: 'Traces, real sessions and the tests that caught nothing.',
          format: 'Talk · 25 min',
        },
        { title: 'React at scale: what we measure', speakerIds: ['lea-platzhalter'], summary: 'The four numbers a platform team watches every release.', format: 'Talk · 25 min' },
      ],
    },
  },
  {
    id: 'p-nov-2025',
    slug: '2025-11-anniversary',
    title: 'One year anniversary is here!',
    status: 'scheduled',
    startsAt: '2025-11-13T18:30:00+01:00',
    endsAt: '2025-11-13T21:30:00+01:00',
    venue: SAMPLE_VENUE,
    description: 'One year of ZurichJS, with talks and cake.',
    // Talks without an agenda: the site lists them in order, without inventing times.
    agenda: [],
    talks: [
      { id: 'talk.retro', slug: 'one-year-retro', speakerIds: ['anna-beispiel'], title: 'A year of ZurichJS, looking back', format: 'talk', durationMin: 25, tags: ['Community'] },
      { id: 'talk.next', slug: 'whats-next', speakerIds: ['max-muster'], title: 'What comes next', format: 'lightning', durationMin: 10, tags: ['Community'] },
    ],
    practical: PRACTICAL_MEETUP,
    photos: [],
    photoCredit: 'Photos: sample credit',
  },
  {
    id: 'p-jun-2025',
    slug: '2025-06-nodejs-workshop',
    title: 'Node.js: More Threads Than You Think',
    status: 'scheduled',
    startsAt: '2025-06-18T13:30:00+02:00',
    endsAt: '2025-06-18T17:30:00+02:00',
    venue: { name: 'ORBIZ Josef', city: 'Zürich' },
    description: 'Workshop with Matteo Collina.',
    agenda: [],
    practical: [],
    photos: [PHOTOS.nodeWorkshop],
    recap: { talks: [] },
  },
  {
    id: 'p-mar-2025',
    slug: '2025-03-partnerships',
    title: 'Partnerships to the Moon!',
    status: 'scheduled',
    startsAt: '2025-03-20T18:30:00+01:00',
    endsAt: '2025-03-20T21:30:00+01:00',
    venue: SAMPLE_VENUE,
    description: 'Partnerships to the Moon!',
    agenda: [],
    practical: PRACTICAL_MEETUP,
    photos: [PHOTOS.community3],
    recap: { talks: [] },
  },
];

export const EVENTS: Event[] = SAMPLE_EVENTS.map(({ talks, ...e }) => ({
  ...e,
  recap: e.recap?.talks.length ? e.recap : undefined,
  agenda: buildSchedule({ agenda: e.agenda, talks: talks ?? [] }),
}));

/* -------------------------------------------------------------------------- */
/* Sponsors and hosts                                                           */
/* -------------------------------------------------------------------------- */

/**
 * The same sourced partner list real builds use until Sanity has partner
 * documents (partners.ts), so sample and production builds show the same
 * recognition. Sample events reference these ids.
 */
export const PARTNERS: Partner[] = PRODUCTION_PARTNERS;

/* -------------------------------------------------------------------------- */
/* About page content                                                           */
/* -------------------------------------------------------------------------- */

export const QUOTES: Quote[] = [
  {
    text: 'Every meetup feels like a mini-conference, thanks to the impressive depth of expertise in the room. Finding a local group that consistently sets a high technical standard while maintaining authentic community spirit is truly uncommon.',
    name: 'Colin Schwarz',
    role: 'Attendee',
  },
  { text: 'Amazing meetup as always. Thanks a lot, you guys make the tech ecosystem in Zuri vibrant.', name: 'Toma Sakai', role: 'Speaker' },
  {
    text: 'It felt like a large group of friends because folks knew each other, and were also very welcoming. Looking forward to collaborating again in the future!',
    name: 'Harshil Agrawal',
    role: 'Dev Educator, Cloudflare',
  },
  {
    // His LinkedIn post, shared by the owner (3rd November 2026).
    text: 'Discovering ZurichJS was the best thing that ever happened to me in terms of discovering tech communities in Zurich, Switzerland. 100% recommended for good vibes and latest in JS + AI World!',
    name: 'Saurav Tiru',
    role: 'Attendee',
    url: 'https://www.linkedin.com/posts/saurav-tiru-796041119_discovering-zurichjs-was-the-best-thing-that-share-7518963682052255747-A-2L/',
  },
];

/* -------------------------------------------------------------------------- */
/* Media (sample): the events' photos plus tagged picks and one clip           */
/* -------------------------------------------------------------------------- */

const eventPhotos: MediaItem[] = EVENTS.flatMap((e) =>
  e.photos.map((p, i) => ({
    id: `sample-${e.slug}-${i}`,
    kind: 'photo' as const,
    src: p.src,
    alt: p.alt,
    eventSlug: e.slug,
    folder: e.slug,
    credit: e.photoCredit,
    tags: [] as string[],
  })),
);
export const MEDIA: MediaItem[] = [
  ...eventPhotos.map((m, i) =>
    i === 0 ? { ...m, caption: 'The room during the first talk.', credit: 'Photo: sample credit', tags: ['featured-home', 'speaker:mia-entwurf'] } : m,
  ),
  // A clip, so galleries can be tested with video. The file is served only in e2e tests.
  {
    id: 'sample-clip',
    kind: 'video',
    src: '/sample/clip.mp4',
    poster: PHOTOS.audience.src,
    alt: 'Short clip from the evening',
    caption: 'Applause after the last talk.',
    eventSlug: '2026-09-signals-streams',
    folder: '2026-09-signals-streams',
    tags: [],
  },
  {
    id: 'sample-partners',
    kind: 'photo',
    src: PHOTOS.conversation.src,
    alt: 'Attendees talking at a hosted ZurichJS meetup',
    eventSlug: '2026-06-edge-runtimes',
    folder: '2026-06-edge-runtimes',
    tags: ['featured-partners'],
  },
];
