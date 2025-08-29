import Link from 'next/link';

import { Event } from '@/sanity/queries';

interface StickyActionsProps {
  event: Event;
}

export default function StickyActions({ event }: StickyActionsProps) {
  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 pb-[env(safe-area-inset-bottom)] bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-xl z-50">
      <div className="px-4 py-2">
        <div className="flex gap-2">
          <Link
            href={`/events/${event.id}?feedback=true`}
            className="flex-1 h-14 bg-js text-black rounded-2xl font-bold text-lg flex items-center justify-center active:scale-95 transition-transform duration-200"
          >
            ⭐ Rate
          </Link>
          <Link
            href="/buy-us-a-coffee"
            className="flex-1 h-14 bg-zurich text-white rounded-2xl font-bold text-lg flex items-center justify-center active:scale-95 transition-transform duration-200"
          >
            ☕ Support
          </Link>
        </div>
      </div>
    </div>
  );
}