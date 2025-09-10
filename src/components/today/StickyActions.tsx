import Link from 'next/link';

export default function StickyActions() {
  return (
    <div className="fixed inset-x-0 bottom-0 pb-[env(safe-area-inset-bottom)] bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-xl z-50">
      <div className="px-4 py-3">
        {/* Mobile: Single row of 2 buttons */}
        <div className="md:hidden">
          <div className="flex gap-3">
            <Link
              href="/buy-us-a-coffee"
              className="flex-1 min-h-[52px] bg-zurich text-white rounded-2xl font-bold text-sm flex items-center justify-center active:scale-[0.98] transition-transform duration-200 touch-manipulation shadow-lg"
            >
              <span className="flex items-center gap-2">
                <span className="text-base">☕</span>
                Support Us
              </span>
            </Link>
            <Link
              href="/events"
              className="flex-1 min-h-[52px] bg-gray-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center active:scale-[0.98] transition-transform duration-200 touch-manipulation shadow-lg"
            >
              <span className="flex items-center gap-2">
                <span className="text-base">📅</span>
                Upcoming Events
              </span>
            </Link>
          </div>
        </div>

        {/* Desktop: Single row of 2 buttons */}
        <div className="hidden md:flex gap-4 max-w-2xl mx-auto">
          <Link
            href="/buy-us-a-coffee"
            className="flex-1 min-h-[52px] bg-zurich text-white rounded-2xl font-bold text-base flex items-center justify-center hover:bg-zurich/90 transition-colors duration-200 shadow-lg"
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">☕</span>
              Support Us
            </span>
          </Link>
          <Link
            href="/events"
            className="flex-1 min-h-[52px] bg-gray-600 text-white rounded-2xl font-bold text-base flex items-center justify-center hover:bg-gray-500 transition-colors duration-200 shadow-lg"
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">📅</span>
              Upcoming Events
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}