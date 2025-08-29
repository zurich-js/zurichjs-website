import Link from 'next/link';

import { Event } from '@/sanity/queries';

interface SponsorCardProps {
  event: Event;
}

export default function SponsorCard({ event }: SponsorCardProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-black text-gray-900">
        Connect 🌟
      </h2>
      
      <Link
        href="https://join.slack.com/t/zurichjs/shared_invite/zt-35xc7fswg-NswAFDUErn1XoUF8ixH6fg"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 hover:border-gray-200 transition-all duration-200 active:scale-95 shadow-lg hover:shadow-xl"
      >
        <div className="w-10 h-10 rounded-xl bg-[#4A154B] flex items-center justify-center text-white text-lg">
          <svg className="w-5 h-5" viewBox="0 0 54 54" xmlns="http://www.w3.org/2000/svg">
            <g fill="none" fillRule="evenodd">
              <path d="M19.712.133a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386h5.376V5.52A5.381 5.381 0 0 0 19.712.133m0 14.365H5.376A5.381 5.381 0 0 0 0 19.884a5.381 5.381 0 0 0 5.376 5.387h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386" fill="#36C5F0"/>
              <path d="M53.76 19.884a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386v5.387h5.376a5.381 5.381 0 0 0 5.376-5.387m-14.336 0V5.52A5.381 5.381 0 0 0 34.048.133a5.381 5.381 0 0 0-5.376 5.387v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387" fill="#2EB67D"/>
              <path d="M34.048 54a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386h-5.376v5.386A5.381 5.381 0 0 0 34.048 54m0-14.365h14.336a5.381 5.381 0 0 0 5.376-5.386 5.381 5.381 0 0 0-5.376-5.387H34.048a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386" fill="#ECB22E"/>
              <path d="M0 34.249a5.381 5.381 0 0 0 5.376 5.386 5.381 5.381 0 0 0 5.376-5.386v-5.387H5.376A5.381 5.381 0 0 0 0 34.25m14.336-.001v14.364A5.381 5.381 0 0 0 19.712 54a5.381 5.381 0 0 0 5.376-5.387V34.25a5.381 5.381 0 0 0-5.376-5.387 5.381 5.381 0 0 0-5.376 5.387" fill="#E01E5A"/>
            </g>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900">Join Slack</div>
          <div className="text-sm text-gray-600">Community chat</div>
        </div>
        <div className="text-gray-400 group-hover:text-zurich group-hover:translate-x-1 transition-all duration-200">
          →
        </div>
      </Link>
      
      <Link
        href="https://linkedin.com/company/zurichjs"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 hover:border-gray-200 transition-all duration-200 active:scale-95 shadow-lg hover:shadow-xl"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-js to-js-dark flex items-center justify-center text-white text-lg">
          💼
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900">LinkedIn</div>
          <div className="text-sm text-gray-600">Follow us</div>
        </div>
        <div className="text-gray-400 group-hover:text-zurich group-hover:translate-x-1 transition-all duration-200">
          →
        </div>
      </Link>

      {event.attendees > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 text-center p-4 shadow-lg">
          <div className="text-2xl font-black text-zurich">{event.attendees}+</div>
          <div className="text-sm text-gray-600 font-medium">🧙‍♂️ Joining today!</div>
        </div>
      )}
    </div>
  );
}