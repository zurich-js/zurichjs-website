import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

import { getTodaysSponsors } from '@/data';

export default function TodaysSponsors() {
  const sponsors = getTodaysSponsors();

  if (sponsors.length === 0) {
    return null;
  }

  // Group sponsors by tier
  const goldSponsors = sponsors.filter(s => s.tier === 'gold');
  const silverSponsors = sponsors.filter(s => s.tier === 'silver');
  const otherSponsors = sponsors.filter(s => s.tier !== 'gold' && s.tier !== 'silver');

  const getTierBadge = (tier?: string) => {
    const badges = {
      gold: { color: 'bg-gradient-to-r from-yellow-400 to-yellow-600', text: '🥇 Gold' },
      silver: { color: 'bg-gradient-to-r from-gray-300 to-gray-500', text: '🥈 Silver' },
      bronze: { color: 'bg-gradient-to-r from-amber-600 to-amber-800', text: '🥉 Bronze' },
      supporting: { color: 'bg-gradient-to-r from-blue-500 to-blue-600', text: '🤝 Supporting' }
    };
    
    return badges[tier as keyof typeof badges] || badges.supporting;
  };

  const renderSponsorCard = (sponsor: { id: string; name: string; logo: string; url: string; tier?: string; description?: string }, index: number, isGold: boolean = false) => {
    const badge = getTierBadge(sponsor.tier);
    
    return (
      <motion.div
        key={sponsor.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
      >
        <Link
          href={sponsor.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`group block bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300 h-full ${
            isGold ? 'p-8' : 'p-4'
          }`}
        >
          {isGold ? (
            // Gold sponsors - vertical layout
            <div className="flex flex-col items-center text-center space-y-4 h-full">
              {/* Tier Badge */}
              <div className={`inline-flex items-center rounded-full font-bold text-white ${badge.color} px-4 py-2 text-sm`}>
                {badge.text}
              </div>

              {/* Logo */}
              <div className="flex-1 flex items-center justify-center w-full">
                <div className="relative w-32 h-24 group-hover:scale-105 transition-transform duration-300">
                  <Image
                    src={sponsor.logo}
                    alt={`${sponsor.name} logo`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 128px, 128px"
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <h3 className="font-bold text-gray-900 group-hover:text-zurich transition-colors duration-200 text-lg">
                  {sponsor.name}
                </h3>
                {sponsor.description && (
                  <p className="text-gray-500 mt-1 line-clamp-2 text-sm">
                    {sponsor.description}
                  </p>
                )}
              </div>

              {/* External link indicator */}
              <div className="text-gray-400 group-hover:text-zurich group-hover:translate-x-1 transition-all duration-200 text-sm">
                →
              </div>
            </div>
          ) : (
            // Silver sponsors - horizontal compact layout
            <div className="flex items-center space-x-4 h-full">
              {/* Logo on the left */}
              <div className="flex-shrink-0">
                <div className="relative w-16 h-12 group-hover:scale-105 transition-transform duration-300">
                  <Image
                    src={sponsor.logo}
                    alt={`${sponsor.name} logo`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 64px, 64px"
                  />
                </div>
              </div>

              {/* Content on the right */}
              <div className="flex-1 min-w-0">
                {/* Tier Badge */}
                <div className={`inline-flex items-center rounded-full font-bold text-white ${badge.color} px-2 py-1 text-xs mb-2`}>
                  {badge.text}
                </div>

                {/* Name */}
                <h3 className="font-bold text-gray-900 group-hover:text-zurich transition-colors duration-200 text-sm">
                  {sponsor.name}
                </h3>
                {sponsor.description && (
                  <p className="text-gray-500 mt-1 line-clamp-2 text-xs">
                    {sponsor.description}
                  </p>
                )}
              </div>

              {/* External link indicator */}
              <div className="flex-shrink-0 text-gray-400 group-hover:text-zurich group-hover:translate-x-1 transition-all duration-200 text-sm">
                →
              </div>
            </div>
          )}
        </Link>
      </motion.div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Today&apos;s Sponsors
        </h2>
        <p className="text-gray-600">
          Thank you to our amazing sponsors who make this event possible! 🙏
        </p>
      </div>

      {/* Gold Sponsors - Pyramid Top (Larger) */}
      {goldSponsors.length > 0 && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-yellow-600 mb-4">🥇 Gold Sponsors</h3>
          </div>
          <div className={`grid gap-6 justify-center ${
            goldSponsors.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' :
            goldSponsors.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto' :
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto'
          }`}>
            {goldSponsors.map((sponsor, index) => renderSponsorCard(sponsor, index, true))}
          </div>
        </div>
      )}

      {/* Silver Sponsors - Pyramid Base (Smaller) */}
      {silverSponsors.length > 0 && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-md font-semibold text-gray-500 mb-4">🥈 Silver Sponsors</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {silverSponsors.map((sponsor, index) => renderSponsorCard(sponsor, goldSponsors.length + index, false))}
          </div>
        </div>
      )}

      {/* Other Sponsors */}
      {otherSponsors.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {otherSponsors.map((sponsor, index) => renderSponsorCard(sponsor, goldSponsors.length + silverSponsors.length + index, false))}
          </div>
        </div>
      )}

      {/* Call to action */}
      <div className="text-center pt-4">
        <p className="text-sm text-gray-500">
          Interested in sponsoring ZurichJS events?{' '}
          <Link 
            href="/partnerships" 
            className="text-zurich hover:text-zurich/80 font-medium underline transition-colors duration-200"
          >
            Learn more about partnerships
          </Link>
        </p>
      </div>
    </div>
  );
}