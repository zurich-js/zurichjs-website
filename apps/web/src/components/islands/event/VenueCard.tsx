import { directionsUrl, mapEmbedUrl, venueAddress, type Venue } from '@zurichjs/events';
import { useState } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';

interface Props {
  venue: Venue;
  /** Public Google Maps Embed API key, restricted to zurichjs.com. Without it the map is Google's keyless embed. */
  mapsKey?: string;
  heading?: string;
  headingLevel?: 2 | 3;
  past?: boolean;
}

/**
 * Where the meetup is: name, full address, how to get in, and directions.
 * The directions link always works. The map loads only when asked for
 * (no Google request or cookie before that): the Maps Embed API with a key,
 * otherwise Google Maps' keyless embed of the address (see mapEmbedUrl).
 */
export default function VenueCard({ venue, mapsKey, heading = 'Venue', headingLevel = 2, past }: Props) {
  const [showMap, setShowMap] = useState(false);
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
      <H id="h-venue" class="m-0 text-[clamp(26px,2.6vw,34px)] font-bold">
        {heading}
      </H>
      <div class="bg-grey rounded-card p-6 flex flex-col gap-4">
        <div class="flex flex-col gap-0.5">
          <div class="text-[20px] font-bold">{venue.name}</div>
          <address class="not-italic text-[17px] text-ink-2">{address}</address>
        </div>
        {notes.length > 0 && (
          <dl class="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-x-8 gap-y-3">
            {notes.map(([label, value]) => (
              <div key={label} class="flex flex-col gap-0.5">
                <dt class="text-[15px] text-ink-2">{label}</dt>
                <dd class="m-0 text-[17px] leading-normal">{value}</dd>
              </div>
            ))}
          </dl>
        )}
        <div class="flex flex-wrap gap-3 items-center">
          <Button href={directionsUrl(venue)} variant="black" external>
            Get directions
          </Button>
          <Button variant="outline-black" onClick={() => setShowMap(!showMap)} aria-controls="venue-map" aria-expanded={showMap}>
            {showMap ? 'Hide map' : 'Show map'}
          </Button>
        </div>
        {showMap && (
          <div id="venue-map" class="flex flex-col gap-2">
            {mapFailed ? (
              <p class="m-0 text-[16px] text-ink-2">The map didn’t load. The directions link above still works.</p>
            ) : (
              <iframe
                title={`Map of ${venue.name}, ${address}`}
                src={mapEmbedUrl(venue, mapsKey)}
                class="w-full aspect-[4/3] md:aspect-[16/9] rounded-2xl border-0 bg-grey-soft"
                loading="lazy"
                referrerpolicy="strict-origin-when-cross-origin"
                onError={() => setMapFailed(true)}
                allowFullScreen
              />
            )}
            <p class="m-0 text-[14px] text-ink-2">Map by Google. Loading it shares your IP address with Google. If it stays blank, use Get directions.</p>
          </div>
        )}
        {past && <p class="m-0 text-[15px] text-ink-2">Where this meetup took place. Venues change between meetups; check the next event for its address.</p>}
      </div>
    </section>
  );
}
