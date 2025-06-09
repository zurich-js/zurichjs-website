import { motion } from 'framer-motion';
import Image from 'next/image';
import { useState, useEffect } from 'react';

import Section from "@/components/Section";
import useEvents from '@/hooks/useEvents';

import Button from '../ui/Button';

// Define TypeScript interfaces for partners data
interface Partner {
  id: string;
  name: string;
  logo: string;
  url: string;
  type?: string;
  sponsorshipTier?: 'gold' | 'silver' | 'community' | 'other';
  description?: string;
  blurb?: string;
}

// Props interface with optional styling properties
interface PartnersProps {
  partners: Partner[];
  titleClassName?: string;
}

export default function Partners({ partners, titleClassName = 'text-blue-700' }: PartnersProps) {
  const [isClient, setIsClient] = useState(false);
  const { track } = useEvents();
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!partners || partners.length === 0) {
    return null;
  }

  // Separate partners by sponsorship tier
  const goldPartners = partners.filter(partner => partner.sponsorshipTier === 'gold');
  const silverPartners = partners.filter(partner => partner.sponsorshipTier === 'silver');
  const regularPartners = partners.filter(partner => !partner.sponsorshipTier);

  // Handle partner click tracking
  const handlePartnerClick = (partner: Partner, section: string) => {
    track('partner_click_homepage', {
      partnerName: partner.name,
      partnerTier: partner.sponsorshipTier || 'regular',
      section: section,
      partnerUrl: partner.url
    });
  };

  return (
    <Section variant="white" padding="lg">
      {/* Gold Partners Section - Most Prominent */}
      {goldPartners.length > 0 && (
        <div className="mb-16">
          <motion.div
            initial={isClient ? { opacity: 0, y: -20 } : { opacity: 1, y: 0 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-2xl">🥇</span>
              </div>
              <h2 className="text-4xl font-bold text-gray-900">Our Gold Sponsors</h2>
            </div>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              These incredible sponsors help us keep the JavaScript passion beating in our community. We couldn&apos;t be more grateful for their support that allows us to thrive! ✨
            </p>
          </motion.div>

          <div className="space-y-12">
            {goldPartners.map((partner, index) => (
              <motion.div
                key={partner.id}
                initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gradient-to-r from-yellow-50 to-amber-50 p-8 rounded-2xl border-2 border-yellow-200 shadow-lg"
              >
                <div className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left">
                  <div className="flex-shrink-0 mb-6 lg:mb-0 lg:mr-8">
                    <motion.a
                      href={partner.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => handlePartnerClick(partner, 'gold_logo')}
                    >
                      <div className="w-56 h-28 sm:w-64 sm:h-32 lg:w-72 lg:h-36 relative bg-white p-3 sm:p-4 lg:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                        <Image
                          src={partner.logo}
                          alt={partner.name}
                          fill
                          className="object-contain"
                        />
                      </div>
                    </motion.a>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4">{partner.name}</h3>
                    {partner.blurb && (
                      <div className="text-gray-700 leading-relaxed text-base sm:text-lg lg:text-xl mb-6">
                        {partner.blurb.split('\n').map((line, idx) => (
                          <p key={idx} className={idx > 0 ? 'mt-2' : ''}>
                            {line}
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row lg:flex-row gap-3">
                      <Button
                        href={partner.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="primary"
                        className="bg-yellow-600 hover:bg-yellow-700 text-white w-full sm:w-auto lg:w-auto"
                        onClick={() => handlePartnerClick(partner, 'gold_cta')}
                      >
                        Visit {partner.name} →
                      </Button>
                      <Button
                        href="/partnerships"
                        variant="outline"
                        className="border-yellow-600 text-yellow-700 hover:bg-yellow-600 hover:text-white w-full sm:w-auto lg:w-auto"
                        onClick={() => track('partnership_cta_click', { source: 'gold_partner_section' })}
                      >
                        Learn More About Sponsoring
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Silver Partners Section */}
      {silverPartners.length > 0 && (
        <div className="mb-16">
          <motion.div
            initial={isClient ? { opacity: 0, y: -20 } : { opacity: 1, y: 0 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-gray-300 to-gray-500 rounded-full flex items-center justify-center mr-4">
                <span className="text-2xl">🥈</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Our Silver Sponsors</h2>
            </div>
            <p className="text-lg text-gray-700 max-w-3xl mx-auto">
              These amazing partners fuel our JavaScript passion and help our community flourish. Their support means the world to us! 💛
            </p>
          </motion.div>

          <div className="space-y-8">
            {silverPartners.map((partner, index) => (
              <motion.div
                key={partner.id}
                initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gradient-to-r from-gray-50 to-slate-50 p-6 rounded-xl border-2 border-gray-200 shadow-md"
              >
                <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left">
                  <div className="flex-shrink-0 mb-6 md:mb-0 md:mr-6">
                    <motion.a
                      href={partner.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => handlePartnerClick(partner, 'silver_logo')}
                    >
                      <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 relative bg-white p-3 md:p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        <Image
                          src={partner.logo}
                          alt={partner.name}
                          fill
                          className="object-contain"
                        />
                      </div>
                    </motion.a>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3">{partner.name}</h3>
                    {partner.blurb && (
                      <div className="text-gray-700 leading-relaxed mb-4 text-sm sm:text-base md:text-lg">
                        {partner.blurb.split('\n').map((line, idx) => (
                          <p key={idx} className={idx > 0 ? 'mt-2' : ''}>
                            {line}
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        href={partner.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="outline"
                        className="border-gray-400 text-gray-700 hover:bg-gray-700 hover:text-white w-full sm:w-auto"
                        onClick={() => handlePartnerClick(partner, 'silver_cta')}
                      >
                        Visit {partner.name} →
                      </Button>
                      <Button
                        href="/partnerships"
                        variant="outline"
                        className="border-gray-400 text-gray-600 hover:bg-gray-600 hover:text-white w-full sm:w-auto"
                        onClick={() => track('partnership_cta_click', { source: 'silver_partner_section' })}
                      >
                        Become a Sponsor
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Partners Section */}
      {regularPartners.length > 0 && (
        <div>
          <motion.div
            initial={isClient ? { opacity: 0, y: -20 } : { opacity: 1, y: 0 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className={`text-3xl font-bold mb-3 ${titleClassName}`}>
              Our Community Partners
            </h2>
            <p className="text-gray-800 max-w-2xl mx-auto">
              Amazing organizations helping us build the JavaScript community in Zurich! 🤝
            </p>
          </motion.div>

          <motion.div
            initial={isClient ? { opacity: 0 } : { opacity: 1 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8 lg:gap-10 items-center justify-items-center mb-12"
          >
            {regularPartners.map((partner) => (
              <motion.a
                key={partner.id}
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ y: -5 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-[120px] sm:max-w-[150px] lg:max-w-[180px] h-16 sm:h-20 lg:h-24 relative grayscale hover:grayscale-0 transition-all"
                aria-label={`Visit ${partner.name} website`}
                onClick={() => handlePartnerClick(partner, 'regular')}
              >
                <Image
                  src={partner.logo}
                  alt={`${partner.name} logo`}
                  fill
                  className="object-contain"
                />
              </motion.a>
            ))}
          </motion.div>
        </div>
      )}

      <motion.div
        initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <Button
          href="/partnerships"
          variant="secondary"
          onClick={() => track('partnership_cta_click', { source: 'partners_section_bottom' })}
        >
          Become a Partner 🚀
        </Button>
      </motion.div>
    </Section>
  );
}
