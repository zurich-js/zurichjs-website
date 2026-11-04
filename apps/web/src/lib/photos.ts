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
  // Home grid (below) and elsewhere.
  talk: { src: '/images/photos/speakers-organisers-july-2025.webp', alt: 'Speakers and organisers together at the July 2025 meetup' },
  questions: { src: '/images/photos/meetup-questions.webp', alt: 'Hands up for a question at a ZurichJS meetup', position: 'center 40%' },
  // Home, "An award-winning community": the JavaScript Open Source Awards 2026 stage (from conf.zurichjs.com/volunteer).
  award: { src: '/images/photos/oss-awards-2026.webp', alt: 'ZurichJS on stage at the JavaScript Open Source Awards 2026 during JSNation in Amsterdam' },
  // About, "What your first meetup is like" (also the page's share image).
  firstVisit: { src: '/images/photos/speakers-organisers-july-2025.webp', alt: 'Speakers and organisers at the July 2025 meetup' },
  // Partners, "What we take care of".
  hosted: { src: '/images/photos/workshop-june-2025.webp', alt: 'Everyone at the Node.js workshop with Matteo Collina, hosted by ORBIZ Josef in June 2025' },
  // Volunteer, "Before you apply".
  team: { src: '/images/photos/team-november-2025.webp', alt: 'Organisers in ZurichJS T-shirts with the speakers at the November 2025 meetup' },
} satisfies Record<string, Photo>;

type Cells = { cols: number; rows: number };
/**
 * Home, below "An award-winning community": a packed grid of meetup photos (Bogdan's review,
 * 4th November 2026), packed like the conference's sponsor grid (@zurichjs/design gridPacker).
 * Sizes are in square cells: 4 columns on phones, 6 from 800px. Photos with a sponsor frame are left out.
 */
export const COMMUNITY_GRID: { id: string; photo: Photo; sizes: { base: Cells; md: Cells }; priority: number }[] = [
  { id: 'workshop', photo: PAGE_PHOTOS.hosted, sizes: { base: { cols: 4, rows: 2 }, md: { cols: 3, rows: 2 } }, priority: 1 },
  { id: 'speakers', photo: PAGE_PHOTOS.talk, sizes: { base: { cols: 2, rows: 2 }, md: { cols: 2, rows: 2 } }, priority: 2 },
  { id: 'questions', photo: PAGE_PHOTOS.questions, sizes: { base: { cols: 2, rows: 2 }, md: { cols: 1, rows: 1 } }, priority: 3 },
  {
    id: 'smallpdf',
    photo: { src: '/images/photos/history-smallpdf.webp', alt: 'The fourth ZurichJS meetup at Smallpdf, April 2025' },
    sizes: { base: { cols: 2, rows: 1 }, md: { cols: 1, rows: 1 } },
    priority: 4,
  },
  { id: 'team', photo: PAGE_PHOTOS.team, sizes: { base: { cols: 2, rows: 1 }, md: { cols: 2, rows: 1 } }, priority: 5 },
  {
    id: 'speaker',
    photo: { src: '/images/photos/meetup-jens.webp', alt: 'A speaker presenting at a ZurichJS meetup', position: 'center 30%' },
    sizes: { base: { cols: 2, rows: 1 }, md: { cols: 2, rows: 1 } },
    priority: 6,
  },
  {
    id: 'may',
    photo: { src: '/images/photos/meetup-may.webp', alt: 'Attendees listening to a talk at a ZurichJS meetup' },
    sizes: { base: { cols: 2, rows: 1 }, md: { cols: 2, rows: 1 } },
    priority: 7,
  },
];
