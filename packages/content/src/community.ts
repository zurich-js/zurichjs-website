/**
 * Community content that is not in Sanity yet: the team, volunteers and the
 * timeline. Real content (used in every build), each fact with its source.
 * The full list of sources, and what was left out because it could not be
 * verified, is in docs/v2/CONTENT-SOURCES.md. Organisers: correct roles and
 * add milestones here (or move them to Sanity later).
 *
 * Sources:
 *   [old-about]  the production site's /about page (zurichjs-website origin/main, src/pages/about.tsx)
 *   [conf-about] conf.zurichjs.com about page (zurichjs-conf src/data/about-us.ts)
 *   [conf-blog]  "How ZurichJS got here", conf.zurichjs.com blog, 26 June 2026 (zurichjs-conf src/content/blog/how-zurichjs-got-here.mdx)
 *   [conf-timeline] conf.zurichjs.com timeline (zurichjs-conf src/data/timeline.ts)
 *   [old-today]  the production site's /today sponsors (origin/main src/data/index.ts, getTodaysSponsors)
 *   [owner]      Faris, in the V2 work session (2nd November 2026)
 */
import { initials, type Milestone, type TeamMember } from '@zurichjs/events';

const photo = (name: string, alt: string, position = 'center 20%') => ({ src: `/images/photos/${name}.webp`, alt, position });

export const TEAM: TeamMember[] = [
  {
    name: 'Faris Aziz',
    role: 'Co-founder and lead organiser',
    group: 'organisers',
    initials: initials('Faris Aziz'),
    photo: photo('faris', 'Faris Aziz'),
    // [old-about]
    bio: 'Staff Software Engineer and conference speaker focused on React, resilient systems, and scaling products used by millions. Founder of ZurichJS, passionate about practical architecture, great DX, and developer communities.',
    links: [
      { label: 'Website', url: 'https://faziz-dev.com' },
      { label: 'GitHub', url: 'https://github.com/farisaziz12' },
      { label: 'LinkedIn', url: 'https://linkedin.com/in/farisaziz12' },
      { label: 'X', url: 'https://x.com/farisaziz12' },
    ],
  },
  {
    name: 'Bogdan Mihai Ilie',
    role: 'Co-founder and lead organiser',
    group: 'organisers',
    initials: initials('Bogdan Mihai Ilie'),
    photo: photo('bogdan', 'Bogdan Mihai Ilie'),
    // His speaker profile is listed as "Bogdan Ilie".
    speakerId: 'bogdan-ilie',
    // [old-about]
    bio: 'Frontend specialist with a knack for making everyone feel welcome. Passionate about inclusive tech communities and Vue.',
    links: [
      { label: 'Website', url: 'https://bugdan.dev' },
      { label: 'GitHub', url: 'https://github.com/nosthrillz' },
      { label: 'LinkedIn', url: 'https://linkedin.com/in/ilie-bogdan' },
      { label: 'X', url: 'https://x.com/nosthrillz' },
    ],
  },
  {
    name: 'Nadja Hesselbjerg',
    // [conf-blog]: joined the core team after the fourth meetup; [owner]: in May 2025. [old-about] listed her as "Community Supporter".
    role: 'Core team and lead organiser',
    group: 'organisers',
    initials: initials('Nadja Hesselbjerg'),
    // Photo from conf.zurichjs.com/about (owner's choice), on black.
    photo: photo('nadja-conf', 'Nadja Hesselbjerg', '45% 30%'),
    // [old-about]
    bio: 'Zurich-based frontend developer with a flair for sleek, user-friendly web experiences. She turns complex ideas into intuitive interfaces, and brings a multicultural perspective to her work.',
    links: [
      { label: 'GitHub', url: 'https://github.com/Nadjaroemer' },
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/nadja-r%C3%B8mer-hesselbjerg-47002a12b/' },
    ],
  },
];

/** ZurichJS Conf 2026 volunteers, as thanked on conf.zurichjs.com [conf-about]. Saurav Tiru removed: he came as an attendee (owner, 4th November 2026). */
export const VOLUNTEERS: string[] = [
  'Aldous Waites',
  'Aleksej Dix',
  'Ameet Madan',
  'Arnau Manyosa',
  'Diana Ilie',
  'Efstathios Tantalidis',
  'Gianpierre Fernandez',
  'Giovanni Jiayi Hu',
  'Hugo Sousa',
  'Jan Schwarzkopf',
  'Maximilian Walterskirchen',
  'Oleh Vdovenko',
  'Renan Oliveira',
];

const h = (name: string, alt: string) => ({ src: `/images/photos/${name}.webp`, alt });

/** Oldest first. Event links are resolved by date at build time (an event on that day). */
// Milestones only: routine meetups live on /events (owner, 2nd November 2026).
export const MILESTONES: Milestone[] = [
  {
    date: 'July 2024',
    iso: '2024-07',
    title: 'Faris and Bogdan meet at a Zürich ReactJS meetup',
    text: 'They connect over one idea: with consistency and care, the Zurich tech community could become something real again.',
    link: { label: 'Why it’s called ZurichJS', href: '/about/why-zurichjs' },
    source: 'conf-blog',
  },
  {
    date: '14th November 2024',
    iso: '2024-11-14',
    title: 'The first ZurichJS meetup',
    text: '34 developers at novu, with Nico Martin, a Google Developer Expert in AI, as the first speaker. 70% of the RSVPs came, which told us Zurich developers wanted a better meetup.',
    photo: h('history-first-meetup', 'The first ZurichJS meetup at novu, November 2024'),
    source: 'old-about',
  },
  {
    date: 'January 2025',
    iso: '2025-01',
    title: 'The community grows',
    text: '100 followers on LinkedIn, and 80 to 90 active members in the Meetup group.',
    photo: h('history-web-zurich', 'ZurichJS and Web Zurich at dinner, January 2025'),
    source: 'old-about',
  },
  {
    date: 'February 2025',
    iso: '2025-02-06',
    title: 'International speakers and local friends',
    text: 'Evangelia flies in from Thessaloniki for the second meetup, and the partnership with Web Zurich begins.',
    photo: h('history-second-meetup', 'The second ZurichJS meetup, February 2025'),
    link: { label: 'Community partners', href: '/partners#partners-community' },
    source: 'old-about',
  },
  {
    date: 'March 2025',
    iso: '2025-02-28',
    title: 'Partnerships to the Moon!',
    text: 'Partnerships with React Paris and Code Blossom, alongside CityJS and Grusp.',
    photo: h('history-partnerships', 'Partnerships to the Moon!, March 2025'),
    link: { label: 'Our partners', href: '/partners#partners-community' },
    source: 'old-about',
  },
  {
    date: 'March 2025',
    iso: '2025-03-06',
    title: 'ZurichJS x Vue Zurich',
    text: 'The Vue Zurich meetup joins ZurichJS. Adam Berecz, Vue.js expert and founder of Vueform, speaks.',
    photo: { src: '/images/photos/vue-zurich.webp', alt: 'ZurichJS x Vue Zurich, March 2025' },
    source: 'old-about',
  },
  {
    date: 'April 2025',
    iso: '2025-04-17',
    title: 'ZurichJS comes to Smallpdf',
    text: 'Smallpdf hosts the fourth meetup, joining Ginetta, novu and GetYourGuide as venue partners.',
    photo: h('history-smallpdf', 'The fourth ZurichJS meetup at Smallpdf, April 2025'),
    link: { label: 'Venue hosts', href: '/partners#partners-venues' },
    source: 'old-about',
  },
  {
    // [owner]: May 2025. [conf-blog]: she joined the core team after the fourth meetup (April 2025).
    date: 'May 2025',
    iso: '2025-05',
    title: 'Nadja joins the core team',
    text: 'Nadja Hesselbjerg joins Faris and Bogdan in organising ZurichJS.',
    photo: { src: '/images/photos/nadja-conf.webp', alt: 'Nadja Hesselbjerg', position: '45% 30%' },
    link: { label: 'Meet the team', href: '/about#team' },
    source: 'owner',
  },
  {
    date: '18th June 2025',
    iso: '2025-06-18',
    title: 'ZurichJS becomes a Swiss nonprofit',
    text: 'ZurichJS becomes official through the Swiss JavaScript Group, a registered Swiss nonprofit association (Verein).',
    // The group photo from the meetup that evening (the media archive, owner's pick, 12th November 2026).
    photo: {
      src: 'https://ik.imagekit.io/farisaziz/zurich-js-meetup-6-june-s-server-solstice/DSC02418_wide.jpg?updatedAt=1752923416958',
      alt: 'Speakers, organisers and attendees together at the ZurichJS meetup on 18th June 2025',
    },
    link: { label: 'Membership', href: '/membership' },
    source: 'conf-blog',
  },
  {
    date: 'November 2025',
    iso: '2025-11-13',
    title: 'One year of ZurichJS',
    text: 'The first anniversary, back at Pause im Foifi where it started, presented by Digitec Galaxus.',
    // The anniversary cake (the media archive, owner's pick, 12th November 2026).
    photo: {
      src: 'https://ik.imagekit.io/farisaziz/zurichjs-10-1st-anniversary-special-edition/2025-11-13-export-002.png?updatedAt=1764918729330',
      alt: 'A slice of chocolate cake with a yellow birthday candle at the ZurichJS first-anniversary meetup',
    },
    source: 'old-about',
  },
  {
    date: 'November 2025',
    iso: '2025-11-14',
    title: 'ZurichJS Conf announced',
    text: 'The first tickets for ZurichJS Conf 2026 go on sale, a year after the first meetup.',
    photo: h('history-anniversary', 'The one-year anniversary meetup, November 2025'),
    link: { label: 'conf.zurichjs.com', href: 'https://conf.zurichjs.com' },
    source: 'conf-timeline',
  },
  {
    // [prospectus]: the conference CFP closed on 3rd April 2026, reviewed anonymised by the CFP Review Committee. 434 talk submissions
    // (owner's correction and the CFP-closed post, 12th November 2026; the prospectus said 436).
    date: '3rd April 2026',
    iso: '2026-04-03',
    title: '434 talk proposals for ZurichJS Conf',
    text: 'The call for papers (CFP) for the conference closes with 434 talk submissions. The review committee reads them anonymised, so every proposal is judged on its content.',
    photo: {
      ...h('history-cfp-closed', 'The CFP-closed announcement: 434 talk submissions, 261 speaker profiles, 40 workshop submissions and 61% non-AI topics'),
      position: 'center 42%',
    },
    link: { label: 'conf.zurichjs.com', href: 'https://conf.zurichjs.com' },
    source: 'prospectus',
  },
  {
    date: 'June 2026',
    iso: '2026-06',
    title: 'Open Source Award at JSNation',
    text: 'ZurichJS is recognised as one of the most impactful open-source communities worldwide at the OSS Awards during JSNation.',
    photo: { src: '/images/photos/open-source-award-winner.webp', alt: 'Faris Aziz receiving the JS Open Source Award for ZurichJS' },
    link: { label: 'Read the story', href: 'https://conf.zurichjs.com/blog/how-zurichjs-got-here' },
    source: 'conf-blog',
  },
  {
    // [conf-home]: Community Day 9 Sept, Zurich Engineering Day 10 Sept, Conference Day 11 Sept 2026, Technopark Zurich.
    date: '9th–11th September 2026',
    iso: '2026-09-11',
    title: 'The first ZurichJS Conf',
    photo: { ...h('history-first-conf', 'Attendees, speakers and volunteers in one group photo at ZurichJS Conf 2026, Technopark Zürich') },
    text: 'Our first annual conference on 11th September at Technopark Zürich, after a Community Day on 9th September and the Zurich Engineering Day on 10th September, run with a team of volunteers.',
    link: { label: 'conf.zurichjs.com', href: 'https://conf.zurichjs.com' },
    source: 'conf-timeline',
  },
];

/**
 * Companies and organisations our speakers have worked at [owner, 3rd November 2026].
 * Each logo is the company's own full-colour SVG in apps/web/public/images/speaker-logos/
 * (from Wikimedia Commons or the company's website), with its width-to-height `ratio` (of the drawn logo; the files are trimmed to it)
 * so the row can size every logo to about the same visual weight.
 * `label` shows the name beside a logo that is only a symbol (Simple Icons, CC0, in the brand's colour).
 */
export interface SpeakerCompany {
  name: string;
  logo: string;
  ratio: number;
  label?: boolean;
  /** White shapes inside a coloured one (checked by eye): the black filter thresholds it so they stay. */
  knockout?: boolean;
}
/** Logos with white shapes inside a coloured one (checked by eye, 12th November 2026). */
const KNOCKOUTS = new Set(['AXA', 'SBB', 'Digitec Galaxus', 'University of Oxford']);
const company = (name: string, file: string, ratio: number, label = false): SpeakerCompany => ({
  name,
  logo: `/images/speaker-logos/${file.includes('.') ? file : `${file}.svg`}`,
  ratio,
  ...(label ? { label } : {}),
  ...(KNOCKOUTS.has(name) ? { knockout: true } : {}),
});
export const SPEAKER_COMPANIES: SpeakerCompany[] = [
  company('Google', 'google', 3.036),
  company('Cloudflare', 'cloudflare', 3.03),
  company('Stripe', 'stripe', 2.405),
  company('AWS', 'aws', 1.672),
  company('GitLab', 'gitlab', 4.601),
  company('Hugging Face', 'huggingface', 4.515),
  company('Storybook', 'storybook', 4.987),
  company('Chromatic', 'chromatic', 5),
  company('Astro', 'astro', 3.805),
  company('Unity', 'unity', 2.721),
  company('Sentry', 'sentry', 1, true),
  company('Dynatrace', 'dynatrace', 5.657),
  company('GetYourGuide', 'getyourguide', 1.264),
  company('Smallpdf', 'smallpdf', 3.647),
  company('Digitec Galaxus', 'digitec-galaxus.webp', 685 / 352),
  company('Gatling', 'gatling', 533 / 145),
  company('SBB', 'sbb', 8.889),
  company('SIX', 'six', 3.604),
  company('AXA', 'axa', 1),
  company('University of Oxford', 'oxford', 3.433),
  company('ImageKit', 'imagekit', 4.815),
  company('Platformatic', 'platformatic', 1.471, true),
  company('React Bricks', 'reactbricks', 6.03),
];
/** Recognition programmes our speakers belong to [owner]; not companies, so they're named in a sentence. */
/**
 * "Our beginnings" in the 2026 sponsorship prospectus [prospectus]: where we started in November 2024.
 * The "now" side is the November 2026 reach (partners.ts) plus the speaker count from content.
 */
export const BEGINNINGS: { value: string; label: string }[] = [
  { value: '3', label: 'active members, in a Meetup group of 216' },
  { value: '0', label: 'social media followers' },
  { value: '0', label: 'partners or sponsors' },
  { value: '0', label: 'speakers' },
];
