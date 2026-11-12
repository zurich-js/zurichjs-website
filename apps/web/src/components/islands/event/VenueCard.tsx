import { directionsUrl, mapEmbedUrl, venueAddress, type Venue } from '@zurichjs/events';
import { useState } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';
import { cardClass, cx } from '@zurichjs/design/recipes';

interface Props {
  venue: Venue;
  /** Public Google Maps Embed API key, restricted to zurichjs.com. Without it the map is Google's keyless embed. */
  mapsKey?: string;
  heading?: string;
  headingLevel?: 2 | 3;
  /** Beside the event description: tighter spacing, smaller text and a shorter map. */
  compact?: boolean;
}

/**
 * Where the meetup is: name, full address, how to get in, and directions.
 * The directions link always works. The map is always shown (owner, 2nd
 * November 2026) and loads lazily as it scrolls near: the Maps Embed API with a
 * key, otherwise Google Maps' keyless embed of the address (see mapEmbedUrl).
 */
export default function VenueCard({ venue, mapsKey, heading = 'Venue', headingLevel = 2, compact = false }: Props) {
  const [mapFailed, setMapFailed] = useState(false);
  const H = `h${headingLevel}` as 'h2' | 'h3';
  const address = venueAddress(venue);
  const notes = [
    ['How to get there', venue.directions],
    ['Entrance', venue.entrance],
    ['Public transport', venue.transport],
    ['Accessibility', venue.accessibility],
  ].filter((n): n is [string, string] => !!n[1]);

  return (
    <section id="venue" aria-labelledby="h-venue" class="flex flex-col gap-4 scroll-mt-6">
      <H id="h-venue" class="m-0 text-subsection font-bold">
        {heading}
      </H>
      <div class={cardClass('filled', compact ? 'sm' : 'md')}>
        <div class="flex flex-col gap-0.5">
          <div class={cx('font-bold', compact ? 'text-body' : 'text-card-title')}>{venue.name}</div>
          <address class={cx('not-italic text-ink-2', compact ? 'text-compact' : 'text-body')}>{address}</address>
        </div>
        {notes.length > 0 && (
          <dl class={cx('m-0 grid gap-x-8', compact ? 'grid-cols-1 gap-y-2' : 'grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-y-3')}>
            {notes.map(([label, value]) => (
              <div key={label} class="flex flex-col gap-0.5">
                <dt class="text-compact text-ink-2">{label}</dt>
                <dd class={cx('m-0', compact ? 'text-compact' : 'text-body')}>{value}</dd>
              </div>
            ))}
          </dl>
        )}
        <div class="flex flex-wrap gap-3 items-center">
          <Button href={directionsUrl(venue)} external>
            Get directions
          </Button>
        </div>
        {
          <div id="venue-map" class="flex flex-col gap-2">
            {mapFailed ? (
              <p class="m-0 text-compact text-ink-2">The map didn’t load. The directions link above still works.</p>
            ) : (
              <iframe
                title={`Map of ${venue.name}, ${address}`}
                src={mapEmbedUrl(venue, mapsKey)}
                class={cx('w-full rounded-nested-min border-0 bg-grey', compact ? 'h-[200px]' : 'aspect-[4/3] md:aspect-[16/9]')}
                loading="lazy"
                referrerpolicy="strict-origin-when-cross-origin"
                onError={() => setMapFailed(true)}
                allowFullScreen
              />
            )}
          </div>
        }
      </div>
    </section>
  );
}
