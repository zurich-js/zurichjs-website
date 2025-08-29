import Link from 'next/link';

import { Event } from '@/sanity/queries';

interface QuickActionsProps {
  event: Event;
}

interface Action {
  label: string;
  href: string;
  icon: string;
  color: string;
  external?: boolean;
}

export default function QuickActions({ event }: QuickActionsProps) {
  const actions: Action[] = [
    {
      label: "Rate Talks",
      href: `/events/${event.id}?feedback=true`,
      icon: "⭐",
      color: "bg-gradient-to-br from-js to-js-dark"
    },
    {
      label: "Event Info",
      href: `/events/${event.id}`,
      icon: "📍",
      color: "bg-gradient-to-br from-purple-500 to-pink-500"
    },
    {
      label: "Post on LinkedIn",
      href: `https://www.linkedin.com/feed/?linkOrigin=LI_BADGE&shareActive=true&shareUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : 'https://zurichjs.com/events')}&text=${encodeURIComponent(`I had a great time at ZurichJS! Just attended "${event.title}" - what an amazing JavaScript community event! Thanks to all the speakers and organizers. 🚀 #ZurichJS #JavaScript #Community`)}`,
      icon: "💼",
      color: "bg-gradient-to-br from-blue-700 to-blue-800",
      external: true
    },
    {
      label: "Buy T-shirt",
      href: "/tshirt",
      icon: "👕",
      color: "bg-gradient-to-br from-green-500 to-emerald-600"
    },
    {
      label: "Buy us a Coffee",
      href: "/buy-us-a-coffee",
      icon: "☕",
      color: "bg-gradient-to-br from-amber-500 to-orange-600"
    }
  ];

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-black text-gray-900">Actions</h2>
      
      <div className="grid gap-3 sm:gap-2">
        {actions.map((action, index) => (
          <Link
            key={index}
            href={action.href}
            {...(action.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="group flex items-center gap-4 sm:gap-3 p-4 sm:p-3 bg-white rounded-2xl border border-gray-100 hover:border-gray-200 transition-all duration-200 active:scale-[0.98] shadow-lg hover:shadow-xl min-h-[60px] touch-manipulation"
          >
            <div className={`w-12 h-12 sm:w-10 sm:h-10 rounded-xl ${action.color} flex items-center justify-center text-white text-xl sm:text-lg group-hover:scale-110 transition-transform duration-200 flex-shrink-0`}>
              {action.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-900 text-base sm:text-sm leading-tight">
                {action.label}
              </div>
            </div>
            <div className="text-gray-400 group-hover:text-zurich group-hover:translate-x-1 transition-all duration-200 text-lg sm:text-base flex-shrink-0">
              →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}