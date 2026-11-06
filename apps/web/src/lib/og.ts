/**
 * Share cards (Open Graph and X): every page gets a generated 1200×630 PNG from /og/<name>.png.
 * The generator (pages/og/[name].png.ts) and BaseLayout both read this list, so a page without its own
 * card falls back to the default card, never to a photo or the square logo.
 * Events use /og/event-<slug>.png and speakers /og/speaker-<id>.png.
 */

export interface PageCard {
  /** File name: /og/<name>.png. */
  name: string;
  title: string;
  sub: string;
}

const card = (name: string, title: string, sub: string): PageCard => ({ name, title, sub });

/** By public path. Policies share one card. */
export const PAGE_CARDS: Record<string, PageCard> = {
  '/': card('home', 'JavaScript meets Zurich.', 'Free monthly meetups with talks, food and conversation. Run by volunteers.'),
  '/events': card('events', 'Upcoming and past meetups', 'Every ZurichJS evening, with its talks and speakers.'),
  '/speakers': card('speakers', 'Speakers', 'Everyone who has spoken at ZurichJS, with their talks.'),
  '/cfp': card('cfp', 'Give a talk at ZurichJS', 'It doesn’t have to be about JavaScript. First-time speakers get help.'),
  '/cfv': card('cfv', 'Volunteer with ZurichJS', 'On the night, with photos, or with the website.'),
  '/contact': card('contact', 'Contact the organisers', 'Questions, ideas, partnerships: hello@zurichjs.com'),
  '/partners': card('partners', 'Host or sponsor a meetup', 'Offer a room, food and drinks, or a contribution to the community.'),
  '/donate': card('donate', 'Support the community', 'ZurichJS is a nonprofit, run by volunteers.'),
  '/membership': card('membership', 'Become a member', 'Join the Swiss JavaScript Group, the nonprofit association behind ZurichJS.'),
  '/about': card('about', 'JavaScript is the common ground that brought us together', 'The volunteer-run JavaScript community in Zurich since 2024.'),
  '/about/why-zurichjs': card('why-zurichjs', 'Why it’s called ZurichJS', 'JavaScript is the banner we stand under, and it’s wide enough for everyone.'),
  '/media': card('media', 'Photos and videos', 'Taken at ZurichJS meetups since November 2024.'),
  '/today': card('today', 'Today at ZurichJS', 'The programme, getting there, and feedback on the evening.'),
  '/feedback': card('feedback', 'Share your feedback', 'Tell us how the evening went.'),
  '/waitlist/conf': card('waitlist-conf', 'ZurichJS Conf', 'Join the waitlist for our annual conference.'),
  '/policies': card('policies', 'Policies', 'Code of conduct, privacy and terms for ZurichJS.'),
  '/meetups/javascript-zurich': card('javascript-zurich', 'JavaScript meetups in Zurich', 'Free monthly JavaScript and TypeScript meetups with expert speakers.'),
  '/meetups/ai-ml-zurich': card('ai-ml-zurich', 'AI development meetups in Zurich', 'Practical AI for web developers, in JavaScript and TypeScript.'),
  '/conferences/tech-conferences-zurich': card('tech-conferences-zurich', 'Meetups and conferences in Zurich', 'Monthly community meetups between the big conferences.'),
  '/ai-context': card('ai-context', 'ZurichJS: information for AI assistants', 'Facts about the JavaScript community in Zurich, in one page.'),
};

export const DEFAULT_CARD = card('default', 'ZurichJS', 'JavaScript meets Zurich. Free monthly meetups, run by volunteers.');

/** The card for a page path: its own, the shared policies card, or the default. */
export function cardForPath(path: string): PageCard {
  const clean = path.replace(/\/+$/, '') || '/';
  return PAGE_CARDS[clean] ?? (clean.startsWith('/policies/') ? PAGE_CARDS['/policies']! : DEFAULT_CARD);
}

/** Every page card, once, for the generator. */
export const allPageCards = (): PageCard[] => [...new Map([...Object.values(PAGE_CARDS), DEFAULT_CARD].map((c) => [c.name, c])).values()];

/** Removes emoji: the card font has none, and satori would draw an empty box. */
export const withoutEmoji = (s: string) =>
  s
    .replace(/\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|\u{FE0F}|\u{200D}|\u{20E3}/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

/** Alt text for an event card: what the card says. */
export const eventCardAlt = (title: string, when?: string, venue?: string) => withoutEmoji([title, when, venue].filter(Boolean).join(', '));
/** Alt text for a speaker card. */
export const speakerCardAlt = (name: string, role?: string) => [name, role, 'ZurichJS speaker'].filter(Boolean).join(', ');
