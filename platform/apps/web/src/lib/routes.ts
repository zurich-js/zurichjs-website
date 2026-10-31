import type { SitemapEntry } from '@zurichjs/seo';

/**
 * Indexable static routes, for /sitemap.xml and /llms.txt. Dynamic routes
 * (events, speakers, policies) are added from content. The SEO parity check
 * (tools/seo/compare.mjs) fails if a built, indexable page is missing here.
 */
export const STATIC_ROUTES: (SitemapEntry & { title: string; summary: string })[] = [
  { path: '/', priority: 1.0, changefreq: 'daily', title: 'Home', summary: 'The next meetup, recent talks, speakers and how to take part.' },
  { path: '/events', priority: 0.9, changefreq: 'daily', title: 'Events', summary: 'Upcoming and past ZurichJS meetups.' },
  { path: '/speakers', priority: 0.8, changefreq: 'weekly', title: 'Speakers', summary: 'Everyone who has spoken at ZurichJS, with their talks.' },
  { path: '/cfp', priority: 0.8, changefreq: 'weekly', title: 'Speak at a meetup', summary: 'Propose a talk; first-time speakers welcome.' },
  { path: '/today', priority: 0.6, changefreq: 'daily', title: 'Tonight', summary: 'The programme of tonight’s meetup, now and next.' },
  { path: '/about', priority: 0.7, changefreq: 'monthly', title: 'About', summary: 'Who runs ZurichJS, the association behind it and its history.' },
  { path: '/about/why-zurichjs', priority: 0.4, changefreq: 'yearly', title: 'Why it’s called ZurichJS', summary: 'The story behind the name.' },
  { path: '/partners', priority: 0.7, changefreq: 'monthly', title: 'Host or support a meetup', summary: 'Ways for companies to host, sponsor or support ZurichJS.' },
  { path: '/media', priority: 0.6, changefreq: 'weekly', title: 'Photos', summary: 'Photos from ZurichJS meetups.' },
  { path: '/contact', priority: 0.6, changefreq: 'monthly', title: 'Contact', summary: 'How to reach the organisers.' },
  { path: '/cfv', priority: 0.5, changefreq: 'monthly', title: 'Volunteer', summary: 'Help run ZurichJS.' },
  { path: '/donate', priority: 0.5, changefreq: 'monthly', title: 'Donate', summary: 'Support the community with a donation (card or TWINT).' },
  { path: '/feedback', priority: 0.4, changefreq: 'monthly', title: 'Feedback', summary: 'Tell us how the last meetup went.' },
];
