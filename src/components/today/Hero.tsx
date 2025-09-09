import Link from 'next/link';

import { Event } from '@/sanity/queries';

interface HeroProps {
  event: Event;
}

export default function Hero({ event }: HeroProps) {
  const today = new Date();
  const day = today.getDate();
  const month = today.toLocaleDateString('en-US', { month: 'short' });

  return (
    <div className="text-center space-y-8">
      {/* Today's Date - Super Clean */}
      <div className="inline-block">
        <div className="bg-black text-white px-6 py-3 rounded-2xl">
          <div className="text-3xl font-black">{day}</div>
          <div className="text-sm font-bold uppercase tracking-wider opacity-80">{month}</div>
        </div>
        <div className="text-black font-black text-xl mt-2 tracking-wide">TODAY</div>
      </div>

      {/* Event Title - Minimalistic */}
      <div>
        <h1 className="text-3xl font-black text-gray-900">
          {event.title}
        </h1>
      </div>

      {/* Mobile Navigation Buttons - Only visible on mobile */}
      <div className="md:hidden flex flex-col gap-2 max-w-sm mx-auto">
        <button
          onClick={() => {
            const scheduleElement = document.querySelector('[data-section="schedule"]');
            if (scheduleElement) {
              scheduleElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
          className="bg-gray-100 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-all duration-200 active:scale-95 hover:bg-gray-200"
        >
          📅 View Schedule
        </button>
        <button
          onClick={() => {
            const dealsElement = document.querySelector('[data-section="deals"]');
            if (dealsElement) {
              dealsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
          className="bg-zurich text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 active:scale-95 hover:bg-zurich/90"
        >
          🔥 View Today&apos;s Deals
        </button>
      </div>

      {/* Primary Action Buttons */}
      <div className="flex flex-col gap-4 max-w-sm mx-auto">
        <Link
          href={`/events/${event.id}?feedback=true`}
          className="bg-js text-black font-bold py-4 px-8 rounded-2xl transition-all duration-200 active:scale-95"
        >
          ⭐ Rate Talks
        </Link>
        <Link
          href="/buy-us-a-coffee"
          className="bg-white text-zurich font-bold py-4 px-8 rounded-2xl border-2 border-zurich transition-all duration-200 active:scale-95"
        >
          ☕ Support Us
        </Link>
      </div>

      {/* Additional Actions */}
      <div className="space-y-3 max-w-sm mx-auto">
        <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Quick Actions</h3>
        
        <div className="grid gap-2">
          <Link
            href={`/events/${event.id}`}
            className="group flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-all duration-200 active:scale-[0.98] hover:shadow-md"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm group-hover:scale-110 transition-transform duration-200 flex-shrink-0">
              📍
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm leading-tight">
                Event Info
              </div>
            </div>
            <div className="text-gray-400 group-hover:text-zurich group-hover:translate-x-1 transition-all duration-200 text-sm flex-shrink-0">
              →
            </div>
          </Link>

          <Link
            href={`https://www.linkedin.com/feed/?linkOrigin=LI_BADGE&shareActive=true&shareUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : 'https://zurichjs.com/events')}&text=${encodeURIComponent(`I had a great time at ZurichJS! Just attended "${event.title}" - what an amazing JavaScript community event! Thanks to all the speakers and organizers. 🚀 #ZurichJS #JavaScript #Community`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-all duration-200 active:scale-[0.98] hover:shadow-md"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-700 to-blue-800 flex items-center justify-center text-white text-sm group-hover:scale-110 transition-transform duration-200 flex-shrink-0">
              💼
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm leading-tight">
                Post on LinkedIn
              </div>
            </div>
            <div className="text-gray-400 group-hover:text-zurich group-hover:translate-x-1 transition-all duration-200 text-sm flex-shrink-0">
              →
            </div>
          </Link>

          <Link
            href="/tshirt"
            className="group flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-all duration-200 active:scale-[0.98] hover:shadow-md"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-sm group-hover:scale-110 transition-transform duration-200 flex-shrink-0">
              👕
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm leading-tight">
                Buy T-shirt
              </div>
            </div>
            <div className="text-gray-400 group-hover:text-zurich group-hover:translate-x-1 transition-all duration-200 text-sm flex-shrink-0">
              →
            </div>
          </Link>
        </div>
      </div>

      {/* Connect Section */}
      <div className="space-y-3 max-w-sm mx-auto">
        <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Connect</h3>
        
        <div className="grid gap-2">
          <Link
            href="https://join.slack.com/t/zurichjs/shared_invite/zt-35xc7fswg-NswAFDUErn1XoUF8ixH6fg"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-all duration-200 active:scale-[0.98] hover:shadow-md"
          >
            <div className="w-8 h-8 rounded-lg bg-[#4A154B] flex items-center justify-center text-white text-sm group-hover:scale-110 transition-transform duration-200 flex-shrink-0">
              <svg className="w-4 h-4" viewBox="0 0 54 54" xmlns="http://www.w3.org/2000/svg">
                <g fill="none" fillRule="evenodd">
                  <path d="M19.712.133a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386h5.376V5.52A5.381 5.381 0 0 0 19.712.133m0 14.365H5.376A5.381 5.381 0 0 0 0 19.884a5.381 5.381 0 0 0 5.376 5.387h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386" fill="#36C5F0"/>
                  <path d="M53.76 19.884a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386v5.387h5.376a5.381 5.381 0 0 0 5.376-5.387m-14.336 0V5.52A5.381 5.381 0 0 0 34.048.133a5.381 5.381 0 0 0-5.376 5.387v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387" fill="#2EB67D"/>
                  <path d="M34.048 54a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386h-5.376v5.386A5.381 5.381 0 0 0 34.048 54m0-14.365h14.336a5.381 5.381 0 0 0 5.376-5.386 5.381 5.381 0 0 0-5.376-5.387H34.048a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386" fill="#ECB22E"/>
                  <path d="M0 34.249a5.381 5.381 0 0 0 5.376 5.386 5.381 5.381 0 0 0 5.376-5.386v-5.387H5.376A5.381 5.381 0 0 0 0 34.25m14.336-.001v14.364A5.381 5.381 0 0 0 19.712 54a5.381 5.381 0 0 0 5.376-5.387V34.25a5.381 5.381 0 0 0-5.376-5.387 5.381 5.381 0 0 0-5.376 5.387" fill="#E01E5A"/>
                </g>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm leading-tight">
                Join Slack
              </div>
              <div className="text-xs text-gray-600 leading-tight">Community chat</div>
            </div>
            <div className="text-gray-400 group-hover:text-zurich group-hover:translate-x-1 transition-all duration-200 text-sm flex-shrink-0">
              →
            </div>
          </Link>

          <Link
            href="https://linkedin.com/company/zurichjs"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-all duration-200 active:scale-[0.98] hover:shadow-md"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-js to-js-dark flex items-center justify-center text-white text-sm group-hover:scale-110 transition-transform duration-200 flex-shrink-0">
              💼
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm leading-tight">
                LinkedIn
              </div>
              <div className="text-xs text-gray-600 leading-tight">Follow us</div>
            </div>
            <div className="text-gray-400 group-hover:text-zurich group-hover:translate-x-1 transition-all duration-200 text-sm flex-shrink-0">
              →
            </div>
          </Link>
        </div>
      </div>

      {/* Attendees Count */}
      {event.attendees > 0 && (
        <div className="max-w-sm mx-auto">
          <div className="bg-gray-50 rounded-xl border border-gray-100 text-center p-4">
            <div className="text-2xl font-black text-zurich">{event.attendees}+</div>
            <div className="text-sm text-gray-600 font-medium leading-tight">🧙‍♂️ Joining today!</div>
          </div>
        </div>
      )}
    </div>
  );
}