import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { ProofSentence } from './ProofSentence';
import { PHOTOS, SITE } from '@/data/content';
import type { Event } from '@/data/types';
import { eventHref, presentEvent } from '@/lib/events';
import { track } from '@/lib/analytics';

interface Props {
  next?: Event;
  now: Date;
}

/**
 * Black hero on the same surface as the header. Headline, one sentence, the next
 * meetup once (title, date, venue, status, action), then the rating and award,
 * with a three-photo mosaic beside it (after it on phones).
 */
export function HomeHero({ next, now }: Props) {
  const p = next ? presentEvent(next, now) : null;
  return (
    <section className="relative px-gut pt-[clamp(24px,5vw,72px)] pb-[clamp(40px,6vw,88px)] grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-[clamp(36px,5vw,72px)] items-center">
      <div className="relative z-[1] flex flex-col gap-[clamp(28px,3.4vw,44px)] min-w-0">
        <div className="flex flex-col gap-[18px]">
          <h1 className="m-0 text-[clamp(40px,6.4vw,84px)] leading-[1.05] font-bold text-balance">JavaScript meetups in Zurich.</h1>
          <p className="m-0 text-[clamp(18px,1.6vw,21px)] leading-[1.5] max-w-[540px] text-pretty">
            Come for the talks. Stay for the people: juniors to CTOs, every framework, and a room full of developers you wouldn’t otherwise meet.
          </p>
        </div>

        {next && p ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="text-[17px] font-bold text-yellow">{p.dateLineShort}</div>
              <div className="text-[clamp(22px,2.2vw,28px)] leading-[1.2] font-bold text-pretty">{next.title}</div>
              <div className="text-[17px] leading-[1.5] text-grey-mid">
                {p.venueShort} · Free · {p.stateLabel}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              {(p.cta.kind === 'rsvp' || p.cta.kind === 'waitlist') && p.cta.href && (
                <Button href={p.cta.href} variant="yellow" onClick={() => track({ name: 'rsvp_handoff_click', eventId: next.id })}>
                  {p.cta.label}
                </Button>
              )}
              {p.cta.kind === 'follow' && (
                <Button href={SITE.meetupGroupUrl} variant="yellow">
                  {p.cta.label}
                </Button>
              )}
              {p.cta.kind === 'feedback' && (
                <Button href={eventHref(next)} variant="yellow">
                  Rate the talks
                </Button>
              )}
              <Button href={eventHref(next)} variant="outline-white">
                Event details
              </Button>
            </div>
            {(p.cta.kind === 'rsvp' || p.cta.kind === 'waitlist') && <div className="text-[15px] text-grey-mid">Opens Meetup in a new tab. Your RSVP is confirmed there.</div>}
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            <div className="text-[clamp(22px,2.2vw,28px)] leading-[1.2] font-bold">The next meetup is being planned.</div>
            <div className="text-[17px] leading-[1.5] text-grey-mid">We announce it on Meetup first. Follow the group there, or catch up on past talks.</div>
            <div className="flex flex-wrap gap-3">
              <Button href={SITE.meetupGroupUrl} variant="yellow">
                Follow ZurichJS on Meetup
              </Button>
              <Button href="/events?tab=past" variant="outline-white">
                Past events
              </Button>
            </div>
          </div>
        )}

        <ProofSentence />
      </div>

      <div className="grid grid-cols-2 grid-rows-2 gap-[clamp(8px,1vw,12px)] w-full aspect-square md:aspect-[1/1.05]" aria-label="Photos from ZurichJS meetups" role="group">
        <HeroImg src={PHOTOS.audience.src} alt={PHOTOS.audience.alt} priority />
        <HeroImg src={PHOTOS.speaker.src} alt={PHOTOS.speaker.alt} position="center 25%" className="row-span-2" priority />
        <HeroImg src={PHOTOS.conversation.src} alt={PHOTOS.conversation.alt} />
      </div>
    </section>
  );
}

function HeroImg({ src, alt, position, className = '', priority }: { src: string; alt: string; position?: string; className?: string; priority?: boolean }) {
  return (
    <span className={`relative block min-h-0 rounded-[20px] overflow-hidden bg-ink ${className}`}>
      <Image src={src} alt={alt} fill priority={priority} sizes="(min-width: 800px) 25vw, 50vw" className="object-cover" style={{ objectPosition: position ?? 'center' }} />
    </span>
  );
}
