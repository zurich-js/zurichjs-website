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

      {/* Action Buttons */}
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
    </div>
  );
}