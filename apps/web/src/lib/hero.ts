import type { Photo } from '@zurichjs/events';

/**
 * The three photos in the home page hero, set by hand (owner, 3rd November 2026).
 * They are never picked from ImageKit or Sanity: this file is the only place they come from.
 *
 * To change one:
 * 1. Put the image in apps/web/public/images/hero/. Wide (landscape) photos work best:
 *    about 1600 px wide for the two square tiles, about 2400 px for the tall middle one.
 * 2. Edit `src` and `alt` below (alt describes the photo for people who can't see it).
 * 3. Optional: `srcset` lists a smaller copy for phones, and `position` keeps a part of the
 *    photo in view when the tile crops it (for example "center 30%" or "left center").
 */
export const HERO_PHOTOS: { audience: Photo; speaker: Photo; conversation: Photo } = {
  // Top left (square).
  audience: {
    src: '/images/hero/audience.webp',
    srcset: '/images/hero/audience-1200.webp 1200w, /images/hero/audience.webp 1600w',
    alt: 'A full room listening to a talk at a ZurichJS meetup',
  },
  // Right (tall, spans both rows).
  speaker: {
    src: '/images/hero/speaker.webp',
    srcset: '/images/hero/speaker-1200.webp 1200w, /images/hero/speaker.webp 2400w',
    alt: 'Matteo Collina running his Node.js workshop for ZurichJS in June 2025',
    position: 'center 35%',
  },
  // Bottom left (square).
  conversation: {
    src: '/images/hero/conversation.webp',
    srcset: '/images/hero/conversation-1200.webp 1200w, /images/hero/conversation.webp 1600w',
    alt: 'Laughing round a table after a ZurichJS meetup',
    position: '60% center',
  },
};
