import Link from 'next/link';

import TodayCard from "@/components/today/TodayCard";
import { Event } from '@/sanity/queries';

interface HeroProps {
  event: Event;
}

export default function TodayHero({ event }: HeroProps) {
  const today = new Date();
  const day = today.getDate();
  const month = today.toLocaleDateString('en-US', { month: 'short' });

  return (
    <div className="text-center flex flex-col [&>*]:grow gap-6">
      <TodayCard>
          {/* Today's Date - Super Clean */}
          <div className="inline-block">
              <div className="bg-black text-white px-6 py-3 rounded-2xl">
                  <div className="text-3xl md:text-xl lg:text-3xl font-black">{day}</div>
                  <div className="text-sm font-bold uppercase tracking-wider opacity-80">{month}</div>
              </div>
              <div className="text-black font-black text-xl mt-2 tracking-wide">TODAY</div>
          </div>

          {/* Event Title - Minimalistic */}
          <h1 className="text-3xl md:text-2xl lg:text-3xl mb-4 font-black text-gray-900">
              {event.title}
          </h1>

          {/* Attendees Count */}
          {event.attendees > 0 && (
              <p className="text-center">
                  {event.attendees}+ Joining today!
              </p>
          )}

          <Link
              href={`/events/${event.id}`}
              className="mt-4 block border-2 border-black font-bold py-4 px-8 rounded-2xl hover:bg-black hover:text-white transition-all duration-200"
          >
              Event details
          </Link>
      </TodayCard>

      {/* Primary Action Buttons */}
        <TodayCard>
            <div className="space-y-4">
                <h2 className="text-left font-semibold text-sm uppercase tracking-tight">Support us</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Link
                        href="/feedback"
                        className="flex-1 bg-black text-white hover:bg-black/90 font-bold py-4 px-8 rounded-2xl transition-all duration-200"
                    >
                        Rate Event
                    </Link>
                    <Link
                        href={`/events/${event.id}?feedback=true`}
                        className="flex-1 bg-js hover:bg-js-dark text-black font-bold py-4 px-8 rounded-2xl transition-all duration-200"
                    >
                        Rate Talks
                    </Link>
                    <Link
                        href="/buy-us-a-coffee"
                        className="block border-2 border-black font-bold py-4 px-8 rounded-2xl hover:bg-black hover:text-white transition-all duration-200"
                    >
                        Buy us a coffee
                    </Link>
                    <Link
                        href="/donate"
                        className="block border-2 border-black font-bold py-4 px-8 rounded-2xl hover:bg-black hover:text-white transition-all duration-200"
                    >
                        Donate with Twint
                    </Link>
                    <Link
                        href="/tshirt"
                        className="block border-2 border-black font-bold py-4 px-8 rounded-2xl hover:bg-black hover:text-white transition-all duration-200"
                    >
                        Buy a T-shirt
                    </Link>
                    <Link
                        href={`https://www.linkedin.com/feed/?linkOrigin=LI_BADGE&shareActive=true&shareUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : 'https://zurichjs.com/events')}&text=${encodeURIComponent(`I had a great time at ZurichJS! Just attended "${event.title}" - what an amazing JavaScript community event! Thanks to all the speakers and organizers. 🚀 #ZurichJS #JavaScript #Community`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block border-2 border-black font-bold py-4 px-8 rounded-2xl hover:bg-black hover:text-white transition-all duration-200"
                    >
                        Post on LinkedIn
                    </Link>
                </div>
            </div>
        </TodayCard>

        <TodayCard>
            <div className="space-y-4">
                <h2 className="text-left font-semibold text-sm uppercase tracking-tight">Let&#39;s connect</h2>
                <div className="flex gap-4 flex-wrap">
                    <Link
                        href="/feedback"
                        className="block p-2"
                        aria-label="Join our Slack"
                    >
                        <svg className="size-8" viewBox="0 0 54 54" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19.712.133a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386h5.376V5.52A5.381 5.381 0 0 0 19.712.133m0 14.365H5.376A5.381 5.381 0 0 0 0 19.884a5.381 5.381 0 0 0 5.376 5.387h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386" fill="#36C5F0"/>
                            <path d="M53.76 19.884a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386v5.387h5.376a5.381 5.381 0 0 0 5.376-5.387m-14.336 0V5.52A5.381 5.381 0 0 0 34.048.133a5.381 5.381 0 0 0-5.376 5.387v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387" fill="#2EB67D"/>
                            <path d="M34.048 54a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386h-5.376v5.386A5.381 5.381 0 0 0 34.048 54m0-14.365h14.336a5.381 5.381 0 0 0 5.376-5.386 5.381 5.381 0 0 0-5.376-5.387H34.048a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386" fill="#ECB22E"/>
                            <path d="M0 34.249a5.381 5.381 0 0 0 5.376 5.386 5.381 5.381 0 0 0 5.376-5.386v-5.387H5.376A5.381 5.381 0 0 0 0 34.25m14.336-.001v14.364A5.381 5.381 0 0 0 19.712 54a5.381 5.381 0 0 0 5.376-5.387V34.25a5.381 5.381 0 0 0-5.376-5.387 5.381 5.381 0 0 0-5.376 5.387" fill="#E01E5A"/>
                        </svg>
                    </Link>
                    <Link
                        href={`/events/${event.id}?feedback=true`}
                        className="block p-2"
                        aria-label="Follow us on LinkedIn"
                    >
                        <svg className="size-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" data-supported-dps="24x24" fill="currentColor" focusable="false">
                            <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"></path>
                        </svg>
                    </Link>
                    <Link
                        href="/buy-us-a-coffee"
                        className="block p-2"
                        aria-label="Follow us on X.com"
                    >
                        <svg className="size-8" viewBox="0 0 24 24" aria-hidden="true">
                            <path
                                d="M21.742 21.75l-7.563-11.179 7.056-8.321h-2.456l-5.691 6.714-4.54-6.714H2.359l7.29 10.776L2.25 21.75h2.456l6.035-7.118 4.818 7.118h6.191-.008zM7.739 3.818L18.81 20.182h-2.447L5.29 3.818h2.447z"></path>
                        </svg>
                    </Link>
                    <Link
                        href="/donate"
                        className="block p-2"
                        aria-label="Follow us on Bluesky"
                    >
                        <svg className="size-8" fill="none" viewBox="0 0 64 57">
                            <path fill="#0F73FF"
                                  d="M13.873 3.805C21.21 9.332 29.103 20.537 32 26.55v15.882c0-.338-.13.044-.41.867-1.512 4.456-7.418 21.847-20.923 7.944-7.111-7.32-3.819-14.64 9.125-16.85-7.405 1.264-15.73-.825-18.014-9.015C1.12 23.022 0 8.51 0 6.55 0-3.268 8.579-.182 13.873 3.805ZM50.127 3.805C42.79 9.332 34.897 20.537 32 26.55v15.882c0-.338.13.044.41.867 1.512 4.456 7.418 21.847 20.923 7.944 7.111-7.32 3.819-14.64-9.125-16.85 7.405 1.264 15.73-.825 18.014-9.015C62.88 23.022 64 8.51 64 6.55c0-9.818-8.578-6.732-13.873-2.745Z"></path></svg>
                    </Link>
                    <Link
                        href="/tshirt"
                        className="block p-2"
                        aria-label="Follow us on Instagram"
                    >
                        <svg className="size-8" fill="currentColor" viewBox="0 0 24 24"><title>Instagram</title>
                            <path
                                d="M12 2.982c2.937 0 3.285.011 4.445.064a6.087 6.087 0 0 1 2.042.379 3.408 3.408 0 0 1 1.265.823 3.408 3.408 0 0 1 .823 1.265 6.087 6.087 0 0 1 .379 2.042c.053 1.16.064 1.508.064 4.445s-.011 3.285-.064 4.445a6.087 6.087 0 0 1-.379 2.042 3.643 3.643 0 0 1-2.088 2.088 6.087 6.087 0 0 1-2.042.379c-1.16.053-1.508.064-4.445.064s-3.285-.011-4.445-.064a6.087 6.087 0 0 1-2.043-.379 3.408 3.408 0 0 1-1.264-.823 3.408 3.408 0 0 1-.823-1.265 6.087 6.087 0 0 1-.379-2.042c-.053-1.16-.064-1.508-.064-4.445s.011-3.285.064-4.445a6.087 6.087 0 0 1 .379-2.042 3.408 3.408 0 0 1 .823-1.265 3.408 3.408 0 0 1 1.265-.823 6.087 6.087 0 0 1 2.042-.379c1.16-.053 1.508-.064 4.445-.064M12 1c-2.987 0-3.362.013-4.535.066a8.074 8.074 0 0 0-2.67.511 5.392 5.392 0 0 0-1.949 1.27 5.392 5.392 0 0 0-1.269 1.948 8.074 8.074 0 0 0-.51 2.67C1.012 8.638 1 9.013 1 12s.013 3.362.066 4.535a8.074 8.074 0 0 0 .511 2.67 5.392 5.392 0 0 0 1.27 1.949 5.392 5.392 0 0 0 1.948 1.269 8.074 8.074 0 0 0 2.67.51C8.638 22.988 9.013 23 12 23s3.362-.013 4.535-.066a8.074 8.074 0 0 0 2.67-.511 5.625 5.625 0 0 0 3.218-3.218 8.074 8.074 0 0 0 .51-2.67C22.988 15.362 23 14.987 23 12s-.013-3.362-.066-4.535a8.074 8.074 0 0 0-.511-2.67 5.392 5.392 0 0 0-1.27-1.949 5.392 5.392 0 0 0-1.948-1.269 8.074 8.074 0 0 0-2.67-.51C15.362 1.012 14.987 1 12 1Zm0 5.351A5.649 5.649 0 1 0 17.649 12 5.649 5.649 0 0 0 12 6.351Zm0 9.316A3.667 3.667 0 1 1 15.667 12 3.667 3.667 0 0 1 12 15.667Zm5.872-10.859a1.32 1.32 0 1 0 1.32 1.32 1.32 1.32 0 0 0-1.32-1.32Z"></path>
                        </svg>
                    </Link>
                </div>
            </div>
        </TodayCard>
    </div>
  );
}