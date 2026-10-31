import type {
  AwardRecord,
  ConferenceCopy,
  ConferenceState,
  Event,
  Milestone,
  Quote,
  RatingRecord,
  Speaker,
  Sponsor,
  TeamMember,
} from './types';

/* -------------------------------------------------------------------------- */
/* Site-wide records                                                           */
/* -------------------------------------------------------------------------- */

export const SITE = {
  name: 'ZurichJS',
  email: 'hello@zurichjs.com',
  meetupGroupUrl: 'https://www.meetup.com/zurich-js/',
  slackInviteUrl: 'https://join.slack.com/t/zurichjs/shared_invite/',
  linkedinUrl: 'https://www.linkedin.com/company/zurichjs',
  instagramUrl: 'https://www.instagram.com/zurich.js',
  blueskyUrl: 'https://bsky.app/profile/zurichjs.com',
  confUrl: 'https://conf.zurichjs.com',
  confSponsorshipUrl: 'https://conf.zurichjs.com/sponsorship',
  confContactUrl: 'https://conf.zurichjs.com/contact',
  association: 'Swiss JavaScript Group',
  uid: 'CHE-255.581.547',
};

/**
 * Sourced starting value, not a live integration. Meetup API approval is
 * unavailable, so organisers update this record by hand after checking the
 * group page. The scale was not confirmed, so the UI does not print "/5".
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
    headline: 'The community’s conference, one bigger day a year.',
    body: 'The next edition hasn’t been announced yet. The conference site has the latest.',
    cta: 'Visit conf.zurichjs.com',
    cfp: 'It opens when the next edition is announced.',
  },
  announced: {
    headline: 'The community’s conference, one bigger day a year.',
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
    headline: 'Enough talk, let’s build!',
    body: 'The last edition is over. Talks and photos are on the conference site.',
    cta: 'See the last edition',
    cfp: 'It is closed.',
  },
};

/* -------------------------------------------------------------------------- */
/* Photos                                                                       */
/* -------------------------------------------------------------------------- */

export const PHOTOS = {
  audience: { src: '/images/meetups/may.png', alt: 'People laughing in the audience during a ZurichJS talk' },
  speaker: { src: '/images/meetups/jens.png', alt: 'A speaker presenting to the room at a ZurichJS meetup', position: 'center 25%' },
  workshop: { src: '/images/meetups/june.png', alt: 'Attendees at the June 2025 Node.js workshop at ORBIZ Josef' },
  conversation: { src: '/images/meetups/ginetta.png', alt: 'Attendees talking after the talks at a ZurichJS meetup' },
  cloudflare: { src: '/images/community/cloudflare.png', alt: 'Meetup photo' },
  community3: { src: '/images/community/meetup-3.jpeg', alt: 'Attendees at a ZurichJS meetup' },
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
      { eventId: 'p-nov-2025', title: 'Accessible comboboxes: the hard parts', format: 'Talk' },
      { eventId: 'p-mar-2025', title: 'TypeScript at the edges of your app', format: 'Lightning talk' },
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
      { eventId: 'p-nov-2025', title: 'Tokens that survive a rebrand', format: 'Talk' },
      { eventId: 'p-mar-2025', title: 'CSS layers in a large codebase', format: 'Talk' },
      { eventId: 'p-may-2026', title: 'Design systems nobody asked for', format: 'Lightning talk' },
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
    talks: [{ eventId: 'p-may-2026', title: 'React at scale: what we measure', format: 'Talk' }],
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
      { eventId: 'p-may-2026', title: 'Testing what users actually do', format: 'Talk' },
      { eventId: 'p-mar-2025', title: 'Flaky tests, honest fixes', format: 'Lightning talk' },
      { eventId: 'p-nov-2025', title: 'Traces over screenshots', format: 'Talk' },
      { eventId: 'p-jun-2026', title: 'Testing at the edge', format: 'Lightning talk' },
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
    talks: [{ eventId: 'p-jun-2026', title: 'Edge runtimes in practice: what actually changed in our deploys', format: 'Talk' }],
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
    talks: [
      { eventId: 'p-sep-2026', title: 'Signals without the hype: what we kept after six months', format: 'Talk' },
      { eventId: 'p-nov-2025', title: 'State that outlives the component', format: 'Lightning talk' },
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
    talks: [{ eventId: 'p-sep-2026', title: 'Streams in Node, explained with a coffee machine', format: 'Lightning talk' }],
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
      { eventId: 'p-may-2026', title: 'Testing what users actually do', format: 'Talk' },
      { eventId: 'p-nov-2025', title: 'Screen reader testing in ten minutes', format: 'Lightning talk' },
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
  { label: 'Getting there', value: SAMPLE_VENUE.directions },
  { label: 'Access', value: 'Not yet checked by organisers. Email hello@zurichjs.com and we will find out for you.' },
  { label: 'Code of conduct', value: 'All ZurichJS events follow our code of conduct.' },
];

export const EVENTS: Event[] = [
  {
    id: 'u-nov-2026',
    slug: '2026-11-forms-types',
    type: 'meetup',
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
    hosts: ['host-1', 'sponsor-1'],
  },
  {
    id: 'w-dec-2026',
    slug: 'accessibility-fundamentals',
    type: 'workshop',
    title: 'Accessibility fundamentals for component authors',
    status: 'scheduled',
    startsAt: '2026-12-10T13:30:00+01:00',
    endsAt: '2026-12-10T17:30:00+01:00',
    venue: SAMPLE_VENUE,
    description: 'A half-day, hands-on workshop for developers who build or maintain UI components.',
    agenda: [],
    practical: [],
    photos: [],
    workshop: {
      priceChf: 150,
      capacity: 24,
      seatsLeft: 24,
      trainerId: 'sara-vorlage',
      language: 'English',
      learn: [
        { heading: 'Semantics first', detail: 'Which native elements to reach for, and when ARIA helps or hurts.' },
        { heading: 'Keyboard and focus', detail: 'Focus order, visible focus and managing focus in dialogs and menus.' },
        { heading: 'Testing with a screen reader', detail: 'A short, repeatable check with VoiceOver and NVDA.' },
        { heading: 'Automating the basics', detail: 'Adding accessibility checks to component tests and CI.' },
      ],
      whoFor:
        'Developers who build or maintain UI components and want them to work with a keyboard and a screen reader. You should be comfortable with HTML and one component framework. No accessibility experience needed.',
      bring: 'a laptop with a recent browser and Node.js. A component from your own project is welcome but optional.',
      schedule: [
        { time: '13:30', heading: 'Welcome and setup' },
        { time: '13:45', heading: 'Semantics and ARIA, with exercises' },
        { time: '15:00', heading: 'Break' },
        { time: '15:20', heading: 'Keyboard, focus and screen reader testing' },
        { time: '17:00', heading: 'Automated checks and questions' },
        { time: '17:30', heading: 'Close' },
      ],
      faq: [
        { q: 'Can my employer pay?', a: 'Yes. Tick “My company needs an invoice” at checkout and add the billing details.' },
        { q: 'What if I can’t come?', a: 'You can transfer your ticket to a colleague by emailing us. Refunds follow the refund policy.' },
        { q: 'Is food included?', a: 'Coffee and snacks during the break.' },
        { q: 'Is it recorded?', a: 'No. Workshops are hands-on and not recorded.' },
      ],
    },
  },
  {
    id: 'p-sep-2026',
    slug: '2026-09-signals-streams',
    type: 'meetup',
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
    id: 'p-jun-2026',
    slug: '2026-06-edge-runtimes',
    type: 'meetup',
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
    photos: [{ src: PHOTOS.conversation.src, alt: 'Meetup photo' }, { src: PHOTOS.audience.src, alt: 'Audience during a talk' }],
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
    type: 'meetup',
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
      { time: '19:35', title: 'React at scale: what we measure', talk: { speakerIds: ['lea-platzhalter'], title: 'React at scale: what we measure', format: 'talk', durationMin: 25 } },
      { time: '21:30', title: 'Close' },
    ],
    practical: PRACTICAL_MEETUP,
    photos: [],
    recap: {
      talks: [
        { title: 'Testing what users actually do', speakerIds: ['jonas-test', 'sara-vorlage'], summary: 'Traces, real sessions and the tests that caught nothing.', format: 'Talk · 25 min' },
        { title: 'React at scale: what we measure', speakerIds: ['lea-platzhalter'], summary: 'The four numbers a platform team watches every release.', format: 'Talk · 25 min' },
      ],
    },
  },
  {
    id: 'p-nov-2025',
    slug: '2025-11-anniversary',
    type: 'meetup',
    title: 'One year anniversary is here!',
    status: 'scheduled',
    startsAt: '2025-11-13T18:30:00+01:00',
    endsAt: '2025-11-13T21:30:00+01:00',
    venue: SAMPLE_VENUE,
    description: 'One year of ZurichJS, with talks and cake.',
    agenda: [],
    practical: PRACTICAL_MEETUP,
    photos: [],
    recap: { talks: [] },
  },
  {
    id: 'p-jun-2025',
    slug: '2025-06-nodejs-workshop',
    type: 'workshop',
    title: 'Node.js: More Threads Than You Think',
    status: 'scheduled',
    startsAt: '2025-06-18T13:30:00+02:00',
    endsAt: '2025-06-18T17:30:00+02:00',
    venue: { name: 'ORBIZ Josef', city: 'Zürich' },
    description: 'Workshop with Matteo Collina.',
    agenda: [],
    practical: [],
    photos: [PHOTOS.workshop],
    recap: { talks: [] },
  },
  {
    id: 'p-mar-2025',
    slug: '2025-03-partnerships',
    type: 'meetup',
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

/* -------------------------------------------------------------------------- */
/* Sponsors / hosts (logos are placeholders until the real set is wired up)     */
/* -------------------------------------------------------------------------- */

export const SPONSORS: Sponsor[] = [
  { id: 'host-1', name: 'Host logo' },
  { id: 'sponsor-1', name: 'Sponsor logo' },
  { id: 'sponsor-2', name: 'Sponsor logo' },
  { id: 'sponsor-3', name: 'Sponsor logo' },
  { id: 'partner-1', name: 'Partner logo' },
  { id: 'partner-2', name: 'Partner logo' },
];

/* -------------------------------------------------------------------------- */
/* About page content                                                           */
/* -------------------------------------------------------------------------- */

export const TEAM: TeamMember[] = [
  { name: 'Faris Aziz', role: 'Founder & Lead Organizer', initials: 'FA', photo: { src: '/images/team/faris.jpg', alt: 'Faris Aziz', position: 'center 20%' } },
  { name: 'Bogdan Mihai Ilie', role: 'Founder & Lead Organizer', initials: 'BI', photo: { src: '/images/team/bogdan.jpg', alt: 'Bogdan Mihai Ilie', position: 'center 20%' } },
  { name: 'Enrique Ruiz Durazo', role: 'Official Photographer', initials: 'ER', photo: { src: '/images/team/enrique.jpeg', alt: 'Enrique Ruiz Durazo', position: 'center 20%' } },
  { name: 'Nadja Hesselbjerg', role: 'Community Supporter', initials: 'NH' },
];

export const MILESTONES: Milestone[] = [
  { date: 'July 2024', title: 'Faris and Bogdan meet at a Zürich ReactJS meetup' },
  { date: '14 Nov 2024', title: 'Zurich JS is Born!' },
  { date: 'March 2025', title: 'Partnerships to the Moon!', photo: { src: '/images/community/meetup-3.jpeg', alt: 'Partnerships to the Moon!, March 2025' }, eventId: 'p-mar-2025' },
  { date: 'March 2025', title: 'ZurichJS x Vue Zurich', photo: { src: '/images/community/vue-zurich.jpeg', alt: 'ZurichJS x Vue Zurich, March 2025' } },
  { date: 'May 2025', title: 'May the Code be with you', photo: { src: '/images/community/may-the-force.webp', alt: 'May the Code be with you, May 2025' } },
  { date: '18 June 2025', title: 'ZurichJS becomes a Swiss nonprofit' },
  { date: 'September 2025', title: 'Flare up your performance', photo: { src: '/images/community/cloudflare.png', alt: 'Flare up your performance, September 2025' } },
  { date: 'November 2025', title: 'One year anniversary is here!', eventId: 'p-nov-2025' },
];

export const QUOTES: Quote[] = [
  {
    text: 'Every meetup feels like a mini‑conference, thanks to the impressive depth of expertise in the room. Finding a local group that consistently sets a high technical standard while maintaining authentic community spirit is truly uncommon.',
    name: 'Colin Schwarz',
    role: 'Attendee',
  },
  { text: 'Amazing meetup as always. Thanks a lot, you guys make the tech ecosystem in Zuri vibrant.', name: 'Toma Sakai', role: 'Speaker' },
  {
    text: 'It felt like a large group of friends because folks knew each other, and were also very welcoming. Looking forward to collaborating again in the future!',
    name: 'Harshil Agrawal',
    role: 'Dev Educator, Cloudflare',
  },
];

/* -------------------------------------------------------------------------- */
/* Policies (placeholder wording; import the current /policies text)            */
/* -------------------------------------------------------------------------- */

export type PolicySlug = 'code-of-conduct' | 'privacy' | 'terms' | 'refunds';

export interface Policy {
  slug: PolicySlug;
  tab: string;
  title: string;
  updated: string;
  sections: { heading: string; paragraphs: string[] }[];
}

export const POLICIES: Policy[] = [
  {
    slug: 'code-of-conduct',
    tab: 'Code of conduct',
    title: 'Code of conduct',
    updated: 'Last updated 1 Sep 2026',
    sections: [
      { heading: 'Our standard', paragraphs: ['ZurichJS events are for everyone who wants to learn and share. Be kind, be curious, and give people room to speak.'] },
      {
        heading: 'Not acceptable',
        paragraphs: ['Harassment, discriminatory jokes or language, unwanted contact or photos, and disrupting talks. This applies to attendees, speakers, sponsors and organisers.'],
      },
      {
        heading: 'What happens after a report',
        paragraphs: ['Organisers talk with the person who reported first, then decide what to do. That can range from a conversation to removal from the event and future events.'],
      },
      { heading: 'Where it applies', paragraphs: ['Meetups, workshops, the conference, and our online spaces such as Slack.'] },
    ],
  },
  {
    slug: 'privacy',
    tab: 'Privacy',
    title: 'Privacy policy',
    updated: 'Last updated 1 Sep 2026',
    sections: [
      { heading: 'What we collect', paragraphs: ['Your email and name when you submit a form, buy a ticket or subscribe. Nothing else unless you give it to us.'] },
      { heading: 'Analytics', paragraphs: ['We measure page visits and clicks with PostHog, only after you agree. We do not sell data.'] },
      { heading: 'Payments', paragraphs: ['Stripe processes payments. We receive your name, email and what you bought, never your card details.'] },
      { heading: 'Your rights', paragraphs: ['Ask us for a copy of your data or to delete it at hello@zurichjs.com.'] },
    ],
  },
  {
    slug: 'terms',
    tab: 'Terms',
    title: 'Terms of use',
    updated: 'Last updated 1 Sep 2026',
    sections: [
      { heading: 'Using this site', paragraphs: ['Content on this site is provided for information about ZurichJS events.'] },
      { heading: 'Events', paragraphs: ['Details can change. We update the event page and tell registered attendees when they do.'] },
      { heading: 'Talks and photos', paragraphs: ['Speakers keep the rights to their talks. Photos from events may appear on our site and channels; ask us if you want one removed.'] },
    ],
  },
  {
    slug: 'refunds',
    tab: 'Refunds',
    title: 'Refund policy',
    updated: 'Last updated 1 Sep 2026',
    sections: [
      { heading: 'Workshop tickets', paragraphs: ['Refund terms are shown at checkout and apply to the ticket you bought.'] },
      { heading: 'If we cancel', paragraphs: ['If we cancel a paid event, you get a full refund to your original payment method.'] },
      { heading: 'Donations', paragraphs: ['Donations are not refundable, except for payment errors. Contact us if something went wrong.'] },
    ],
  },
];
