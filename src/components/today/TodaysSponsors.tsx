import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

import { getTodaysSponsors, SponsorshipTier } from '@/data';

type TierMeta = {
  label: string;
  tagTone: string;
  logoSize: string;
};

const TIER_META: Record<SponsorshipTier, TierMeta> = {
  [SponsorshipTier.Champion]: {
    label: 'Champion Sponsor',
    tagTone: 'bg-brand-orange text-white',
    logoSize: 'w-20 h-20',
  },
  [SponsorshipTier.Builder]: {
    label: 'Builder Sponsor',
    tagTone: 'bg-brand-blue text-white',
    logoSize: 'w-20 h-20',
  },
  [SponsorshipTier.Friend]: {
    label: 'Friend Sponsor',
    tagTone: 'bg-brand-green text-white',
    logoSize: 'w-20 h-20',
  },
  [SponsorshipTier.Supporter]: {
    label: 'Supporter Sponsor',
    tagTone: 'bg-brand-yellow-main text-black',
    logoSize: 'w-20 h-20',
  },
  [SponsorshipTier.Other]: {
    label: 'Sponsor',
    tagTone: 'bg-brand-black text-white',
    logoSize: 'w-20 h-20',
  },
};

const TIER_ORDER: SponsorshipTier[] = [
  SponsorshipTier.Champion,
  SponsorshipTier.Builder,
  SponsorshipTier.Friend,
  SponsorshipTier.Supporter,
];

export default function TodaysSponsors() {
  const sponsors = getTodaysSponsors();

  if (sponsors.length === 0) {
    return null;
  }

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
        
        <Link
          href="/partnerships" 
          className="text-xs text-zurich hover:text-zurich/80 font-medium underline transition-colors duration-200 whitespace-nowrap"
        >
          Become a sponsor →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {sponsors.map((sponsor, index) => {
          const tier = sponsor.sponsorshipTier ?? SponsorshipTier.Supporter;
          const tierMeta = TIER_META[tier];
          const sponsorUrl = sponsor.url.includes('?')
            ? sponsor.url
            : `${sponsor.url}?utm_source=zurichjs.com&utm_medium=website&utm_campaign=sponsorship`;

          return (
            <motion.div
              key={sponsor.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.03 }}
            >
              <Link
                href={sponsorUrl}
                target="_blank"
                className="group relative block overflow-hidden rounded-lg border border-brand-gray-light bg-white text-black transition-all duration-200 h-full hover:shadow-md"
              >
                <div className="p-4 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
                  <div className="flex-shrink-0">
                    <div className={`relative ${tierMeta.logoSize}`}>
                      <Image
                        src={sponsor.logo}
                        alt={`${sponsor.name} logo`}
                        fill
                        className="object-contain"
                        sizes="80px"
                      />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg sm:text-base leading-tight mb-1">
                          {sponsor.name}
                        </h3>
                        <div className={`inline-flex items-center rounded-full font-semibold uppercase tracking-[0.08em] sm:px-2 py-1 text-[10px] sm:text-[9px] leading-tight ${tierMeta.tagTone}`}>
                          {tierMeta.label}
                        </div>
                      </div>

                      <div className="hidden sm:block flex-shrink-0 transition-opacity duration-200 mt-0.5 opacity-60 group-hover:opacity-100">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>

                    {sponsor.description && (
                      <p className="text-sm sm:text-xs leading-relaxed sm:leading-snug line-clamp-2 opacity-80">
                        {sponsor.description}
                      </p>
                    )}

                    <div className="mt-3 sm:hidden transition-opacity duration-200 flex items-center justify-center gap-1 text-sm opacity-60 group-hover:opacity-100">
                      <span>Visit website</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Ultra-compact tier legend */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        <span className="text-[10px] text-gray-500 font-medium mr-1">Tiers:</span>
        {TIER_ORDER.map((tier) => (
          <span
            key={tier}
            className={`text-[10px] font-semibold uppercase tracking-[0.08em] px-2 py-1 rounded-full ${TIER_META[tier].tagTone}`}
          >
            {TIER_META[tier].label.replace(' Sponsor', '')}
          </span>
        ))}
      </div>
    </div>
  );
}
