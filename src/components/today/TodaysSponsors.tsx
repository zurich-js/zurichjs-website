import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

import { getTodaysSponsors } from '@/data';

export default function TodaysSponsors() {
  const sponsors = getTodaysSponsors();

  if (sponsors.length === 0) {
    return null;
  }

  const getTierBadge = (tier?: string) => {
    const badges = {
      champion: { color: 'bg-gradient-to-r from-purple-500 to-purple-700', text: '🏆 Community Champion' },
      builder: { color: 'bg-gradient-to-r from-yellow-400 to-yellow-600', text: '🏗️ Community Builder' },
      friend: { color: 'bg-gradient-to-r from-blue-500 to-blue-700', text: '🤝 Community Friend' },
      supporter: { color: 'bg-gradient-to-r from-green-500 to-green-700', text: '💚 Community Supporter' }
    };
    
    return badges[tier as keyof typeof badges] || badges.supporter;
  };

  const renderSponsorCard = (sponsor: { id: string; name: string; logo: string; url: string; tier?: string; description?: string }, index: number) => {
    const badge = getTierBadge(sponsor.tier);
    
    // Get accent color and size based on tier
    const getTierStyles = () => {
      switch (sponsor.tier) {
        case 'champion':
          return {
            borderColor: 'border-purple-300 md:border-l-purple-500',
            logoSize: 'w-32 h-32 md:w-20 md:h-20',
            mobileLogoSize: '(max-width: 768px) 128px, 80px'
          };
        case 'builder':
          return {
            borderColor: 'border-yellow-300 md:border-l-yellow-500',
            logoSize: 'w-28 h-28 md:w-18 md:h-18',
            mobileLogoSize: '(max-width: 768px) 112px, 72px'
          };
        case 'friend':
          return {
            borderColor: 'border-blue-300 md:border-l-blue-500',
            logoSize: 'w-24 h-24 md:w-16 md:h-16',
            mobileLogoSize: '(max-width: 768px) 96px, 64px'
          };
        default:
          return {
            borderColor: 'border-green-300 md:border-l-green-500',
            logoSize: 'w-20 h-20 md:w-14 md:h-14',
            mobileLogoSize: '(max-width: 768px) 80px, 56px'
          };
      }
    };
    
    const tierStyles = getTierStyles();
    
    return (
      <motion.div
        key={sponsor.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.03 }}
      >
        <Link
          href={sponsor.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`group block bg-white rounded-xl border-2 md:border md:border-l-4 hover:border-gray-300 hover:shadow-lg transition-all duration-200 h-full ${tierStyles.borderColor}`}
        >
          {/* Mobile: Stacked vertical layout */}
          <div className="md:hidden p-5 flex flex-col items-center text-center space-y-3">
            {/* Logo - Large and centered on mobile */}
            <div className="flex-shrink-0">
              <div className={`relative ${tierStyles.logoSize} group-hover:scale-105 transition-transform duration-200`}>
                <Image
                  src={sponsor.logo}
                  alt={`${sponsor.name} logo`}
                  fill
                  className="object-contain"
                  sizes={tierStyles.mobileLogoSize}
                />
              </div>
            </div>

            {/* Content - Centered */}
            <div className="w-full">
              <h3 className="font-bold text-gray-900 group-hover:text-zurich transition-colors duration-200 text-lg leading-tight mb-2">
                {sponsor.name}
              </h3>
              
              {/* Tier Badge */}
              <div className={`inline-flex items-center rounded-md font-semibold text-white ${badge.color} px-3 py-1 text-xs mb-3`}>
                {badge.text}
              </div>
              
              {/* Description */}
              {sponsor.description && (
                <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                  {sponsor.description}
                </p>
              )}
              
              {/* External link indicator */}
              <div className="text-gray-400 group-hover:text-zurich transition-all duration-200 mt-3 flex items-center justify-center gap-1 text-sm">
                <span>Visit website</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Desktop: Horizontal compact layout */}
          <div className="hidden md:flex p-3 items-start gap-3">
            {/* Logo */}
            <div className="flex-shrink-0">
              <div className={`relative ${tierStyles.logoSize} group-hover:scale-105 transition-transform duration-200`}>
                <Image
                  src={sponsor.logo}
                  alt={`${sponsor.name} logo`}
                  fill
                  className="object-contain"
                  sizes={tierStyles.mobileLogoSize}
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 group-hover:text-zurich transition-colors duration-200 text-sm leading-tight mb-1">
                    {sponsor.name}
                  </h3>
                  <div className={`inline-flex items-center rounded font-medium text-white ${badge.color} px-1.5 py-0.5 text-[10px] leading-tight`}>
                    {badge.text}
                  </div>
                </div>
                
                {/* External link indicator */}
                <div className="flex-shrink-0 text-gray-400 group-hover:text-zurich group-hover:translate-x-0.5 transition-all duration-200 mt-0.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              
              {sponsor.description && (
                <p className="text-xs text-gray-600 leading-snug line-clamp-2">
                  {sponsor.description}
                </p>
              )}
            </div>
          </div>
        </Link>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Today&apos;s Sponsors
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Making this event possible 🙏
          </p>
        </div>
        
        {/* Compact CTA */}
        <Link 
          href="/partnerships" 
          className="text-xs text-zurich hover:text-zurich/80 font-medium underline transition-colors duration-200 whitespace-nowrap"
        >
          Become a sponsor →
        </Link>
      </div>

      {/* All sponsors in unified grid - sorted by tier, responsive columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {sponsors.map((sponsor, index) => renderSponsorCard(sponsor, index))}
      </div>

      {/* Ultra-compact tier legend */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        <span className="text-[10px] text-gray-500 font-medium mr-1">Tiers:</span>
        <div className="flex items-center gap-1 text-[10px]">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
          <span className="text-gray-700">Champion</span>
        </div>
        <div className="flex items-center gap-1 text-[10px]">
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
          <span className="text-gray-700">Builder</span>
        </div>
        <div className="flex items-center gap-1 text-[10px]">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
          <span className="text-gray-700">Friend</span>
        </div>
        <div className="flex items-center gap-1 text-[10px]">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
          <span className="text-gray-700">Supporter</span>
        </div>
      </div>
    </div>
  );
}