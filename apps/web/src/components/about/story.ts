import type { Event, Photo } from '@zurichjs/events';

/** One entry in the About page's story: a milestone, or one of the two panels with numbers (where we started, where we are now). */
export interface StoryRow {
  key: string;
  title: string;
  date: string;
  text?: string;
  photo?: Photo;
  ev?: Event;
  gallery?: string;
  link?: { label: string; href: string };
  stats?: { value: string; label: string }[];
}
