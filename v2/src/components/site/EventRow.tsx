import Link from 'next/link';
import type { Event } from '@/data/types';
import { cx } from '@/lib/cx';
import { dateParts } from '@/lib/format';
import { eventHref, presentEvent, talkCount } from '@/lib/events';

interface Props {
  ev: Event;
  now: Date;
}

/** One event in the list: date tile, type and status, title, one line of practical detail. */
export function EventRow({ ev, now }: Props) {
  const p = presentEvent(ev, now);
  const upcoming = p.state !== 'past';
  const parts = ev.startsAt ? dateParts(ev.startsAt) : { mon: ev.dateText?.slice(0, 3) ?? 'TBC', day: '?', year: ev.dateText?.slice(-4) ?? '' };
  const typeLabel = ev.type === 'workshop' ? 'Workshop' : 'Meetup';
  const status = upcoming ? (ev.type === 'workshop' ? (ev.workshop?.seatsLeft === 0 ? 'Sold out' : 'Tickets on sale') : p.stateLabel) : ev.recap ? 'Recap' : 'Past';
  const n = talkCount(ev);
  const meta = upcoming
    ? ev.type === 'workshop'
      ? `Half day · CHF ${ev.workshop?.priceChf} · Max. ${ev.workshop?.capacity} people`
      : `${n} talk${n === 1 ? '' : 's'} · ${p.venueShort} · Free`
    : ev.type === 'workshop'
      ? `Workshop · ${p.venueShort}`
      : `${n} talk${n === 1 ? '' : 's'}${ev.photos.length ? ' · Photos' : ''}`;

  return (
    <Link
      href={eventHref(ev)}
      className="no-underline text-black w-full text-left rounded-card bg-white hover:bg-grey grid grid-cols-[80px_minmax(0,1fr)] gap-[clamp(16px,2vw,28px)] items-center p-3.5 -mx-3.5 box-content"
    >
      <span className={cx('flex flex-col items-center justify-center h-20 rounded-2xl', upcoming ? 'bg-yellow' : 'bg-grey')}>
        <span className="text-[14px] font-bold">{parts.mon}</span>
        <span className="text-[30px] font-bold leading-none">{parts.day}</span>
        <span className="text-[13px]">{parts.year}</span>
      </span>
      <span className="flex flex-col gap-1.5 min-w-0">
        <span className="text-[15px] font-bold text-ink-2">
          {typeLabel} · {status}
        </span>
        <span className="text-[clamp(19px,2vw,23px)] font-bold leading-[1.25] text-pretty">{ev.title}</span>
        <span className="text-[16px] text-ink-2">{meta}</span>
      </span>
    </Link>
  );
}
