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
    // [conf-blog]: joined the core team after the fourth meetup. [old-about] listed her as "Community Supporter".
    role: 'Core team',
    group: 'organisers',
    initials: initials('Nadja Hesselbjerg'),
    photo: photo('nadja', 'Nadja Hesselbjerg', '25% 30%'),
    // [old-about]
    bio: 'Zurich-based frontend developer with a flair for sleek, user-friendly web experiences. She turns complex ideas into intuitive interfaces, and brings a multicultural perspective to her work.',
    links: [
      { label: 'GitHub', url: 'https://github.com/Nadjaroemer' },
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/nadja-r%C3%B8mer-hesselbjerg-47002a12b/' },
    ],
  },
];

/** ZurichJS Conf 2026 volunteers, as thanked on conf.zurichjs.com [conf-about]. */
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
  'Saurav Tiru',
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
    text: '34 developers at novu, with Nico Martin, a Google Developer Expert in AI, as the first speaker.',
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
    date: '18th June 2025',
    iso: '2025-06-18',
    title: 'ZurichJS becomes a Swiss nonprofit',
    text: 'ZurichJS becomes official through the Swiss JavaScript Group, a registered Swiss nonprofit association (Verein).',
    link: { label: 'Membership', href: '/membership' },
    source: 'conf-blog',
  },
  {
    date: 'November 2025',
    iso: '2025-11-13',
    title: 'One year of ZurichJS',
    text: 'The first anniversary, back at Pause im Foifi where it started, presented by Digitec Galaxus.',
    photo: h('history-anniversary', 'The one-year anniversary meetup, November 2025'),
    source: 'old-about',
  },
  {
    date: 'November 2025',
    iso: '2025-11-14',
    title: 'ZurichJS Conf announced',
    text: 'The first tickets for ZurichJS Conf 2026 go on sale, a year after the first meetup.',
    link: { label: 'conf.zurichjs.com', href: 'https://conf.zurichjs.com' },
    source: 'conf-timeline',
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
    text: 'Our first annual conference on 11th September at Technopark Zürich, after a Community Day on 9th September and the Zurich Engineering Day on 10th September, run with a team of volunteers.',
    link: { label: 'conf.zurichjs.com', href: 'https://conf.zurichjs.com' },
    source: 'conf-timeline',
  },
];
