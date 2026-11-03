import type { Photo } from '@zurichjs/events';

/**
 * Section photos chosen by hand (owner, 3rd November 2026), like the hero in ./hero.ts.
 * They are never picked from ImageKit or Sanity.
 *
 * The originals carry the yellow sponsor frame, so these are crops from inside it.
 * To change one, put <name>.webp (up to 1600 px wide) with <name>-960.webp and
 * <name>-480.webp in apps/web/public/images/photos/, then edit `src` and `alt` here.
 */
export const PAGE_PHOTOS = {
  // Home, "What happens at a meetup".
  questions: { src: '/images/photos/meetup-questions.webp', alt: 'Hands up for a question at a ZurichJS meetup', position: 'center 40%' },
  // About, "What your first meetup is like" (also the page's share image).
  firstVisit: { src: '/images/photos/speakers-organisers-july-2025.webp', alt: 'Speakers and organisers at the July 2025 meetup' },
  // Partners, "What we take care of".
  hosted: { src: '/images/photos/workshop-june-2025.webp', alt: 'Everyone at the Node.js workshop with Matteo Collina, hosted by ORBIZ Josef in June 2025' },
  // Volunteer, "Before you apply".
  team: { src: '/images/photos/team-november-2025.webp', alt: 'Organisers in ZurichJS T-shirts with the speakers at the November 2025 meetup' },
} satisfies Record<string, Photo>;
