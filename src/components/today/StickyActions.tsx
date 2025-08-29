import Link from 'next/link';

import { Event } from '@/sanity/queries';

interface StickyActionsProps {
  event: Event;
}

export default function StickyActions({ event }: StickyActionsProps) {
  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 pb-[env(safe-area-inset-bottom)] bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-xl z-50">
      <div className="px-4 py-3">
        <div className="flex gap-3">
          <Link
            href={`/events/${event.id}?feedback=true`}
            className="flex-1 min-h-[52px] bg-js text-black rounded-2xl font-bold text-base flex items-center justify-center active:scale-[0.98] transition-transform duration-200 touch-manipulation shadow-lg"
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">⭐</span>
              Rate
            </span>
          </Link>
          <Link
            href="/buy-us-a-coffee"
            className="flex-1 min-h-[52px] bg-zurich text-white rounded-2xl font-bold text-base flex items-center justify-center active:scale-[0.98] transition-transform duration-200 touch-manipulation shadow-lg"
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">☕</span>
              Support
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}