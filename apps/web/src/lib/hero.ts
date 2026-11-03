import type { Photo } from '@zurichjs/events';

/**
 * The three photos in the home page hero, set by hand (owner, 3rd November 2026).
 * They are never picked from ImageKit or Sanity: this file is the only place they come from.
 *
 * To change one:
 * 1. Put the image in apps/web/public/images/hero/ under a new file name (browsers cache
 *    /images/* for a week, so reusing a name keeps showing the old photo). Wide (landscape) photos work best:
 *    about 1600 px wide for each tile (the tall middle one can be a portrait crop).
 * 2. Edit `src` and `alt` below (alt describes the photo for people who can't see it).
 * 3. Optional: `srcset` lists a smaller copy for phones, and `position` keeps a part of the
 *    photo in view when the tile crops it (for example "center 30%" or "left center").
 */
export const HERO_PHOTOS: { audience: Photo; speaker: Photo; conversation: Photo } = {
  // Top left (square).
  audience: {
    src: '/images/hero/full-room.webp',
    srcset: '/images/hero/full-room-1200.webp 1200w, /images/hero/full-room.webp 1600w',
    alt: 'A full room listening to a talk at a ZurichJS meetup',
  },
  // Right (tall, spans both rows).
  speaker: {
    src: '/images/hero/matteo-workshop.webp',
    srcset: '/images/hero/matteo-workshop-1000.webp 1000w, /images/hero/matteo-workshop.webp 1600w',
    alt: 'Matteo Collina running his Node.js workshop for ZurichJS in June 2025',
    position: 'center 35%',
  },
  // Bottom left (square).
  conversation: {
    src: '/images/hero/drinks-after-talks.webp',
    srcset: '/images/hero/drinks-after-talks-960.webp 960w, /images/hero/drinks-after-talks.webp 1317w',
    alt: 'Two attendees with drinks after the talks at a ZurichJS meetup',
    position: 'center 30%',
  },
};
