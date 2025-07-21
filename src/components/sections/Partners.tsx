import { ArrowRight, Handshake, Users, Heart, Crown, Award } from 'lucide-react';
import Image from 'next/image';

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
}

export default function Partners({ partners }: PartnersProps) {
  const { track } = useEvents();
  
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
      <div className="px-4 sm:px-6">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center bg-gradient-to-r from-purple-400/20 via-pink-400/20 to-red-400/20 px-3 sm:px-4 py-2 rounded-full mb-3 sm:mb-4 border border-purple-500/30 shadow-sm">
            <Handshake size={14} className="text-purple-700 mr-2 sm:w-4 sm:h-4" />
            <span className="font-bold text-purple-800 text-xs sm:text-sm tracking-wide">Our Partners</span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-3 sm:mb-4">
            Powered by Amazing <span className="text-zurich">Partners</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-black/80 max-w-3xl mx-auto leading-relaxed px-2 sm:px-0">
            These organizations support our JavaScript community and help make our events possible.
          </p>
        </div>

        {/* Gold Partners Section - Premium Tier */}
        {goldPartners.length > 0 && (
          <div className="mb-8 sm:mb-12">
            <div className="text-center mb-4 sm:mb-6">
              <div className="inline-flex items-center bg-gradient-to-r from-amber-300/30 via-yellow-400/30 to-orange-400/30 px-3 sm:px-4 py-2 rounded-full border border-amber-400/40 shadow-lg">
                <Crown size={14} className="text-amber-700 mr-2 sm:w-4 sm:h-4" />
                <span className="font-bold text-amber-900 text-xs sm:text-sm tracking-wide">Premium Partners</span>
              </div>
            </div>

            <div className="space-y-4 sm:space-y-6">
              {goldPartners.map((partner) => (
                <div
                  key={partner.id}
                  className="bg-gradient-to-br from-white to-amber-50/50 border-2 border-amber-200/50 rounded-xl p-4 sm:p-6 hover:shadow-2xl hover:border-amber-300/60 transition-all duration-200 shadow-lg"
                >
                  <div className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left gap-4 sm:gap-6">
                    <div className="flex-shrink-0">
                      <a
                        href={partner.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block transition-all duration-200 hover:scale-105 touch-manipulation"
                        onClick={() => handlePartnerClick(partner, 'gold_logo')}
                      >
                        <div className="w-40 h-28 sm:w-48 sm:h-36 lg:w-64 lg:h-48 relative bg-white/60 p-3 sm:p-4 rounded-xl border border-black/20 hover:border-black/30 transition-all duration-200">
                          <Image
                            src={partner.logo}
                            alt={partner.name}
                            fill
                            className="object-contain"
                          />
                        </div>
                      </a>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-black mb-2 sm:mb-3">{partner.name}</h3>
                      {partner.blurb && (
                        <div className="text-black/70 leading-relaxed mb-3 sm:mb-4 text-sm sm:text-base">
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
                          variant="primary"
                          className="bg-black hover:bg-gray-800 text-white transition-all duration-200 w-full sm:w-auto min-h-[48px] touch-manipulation"
                          onClick={() => handlePartnerClick(partner, 'gold_cta')}
                        >
                          <span>Visit {partner.name}</span>
                          <ArrowRight size={14} className="ml-2 flex-shrink-0" />
                        </Button>
                        
                        <Button
                          href="/partnerships"
                          variant="outline"
                          className="border-2 border-black text-black hover:bg-black hover:text-white transition-all duration-200 w-full sm:w-auto min-h-[48px] touch-manipulation"
                          onClick={() => track('partnership_cta_click', { source: 'gold_partner_section' })}
                        >
                          Partner With Us
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Silver Partners Section */}
        {silverPartners.length > 0 && (
          <div className="mb-8 sm:mb-12">
            <div className="text-center mb-4 sm:mb-6">
              <div className="inline-flex items-center bg-gradient-to-r from-cyan-400/30 via-blue-400/30 to-indigo-500/30 px-3 sm:px-4 py-2 rounded-full border border-cyan-400/40 shadow-lg">
                <Award size={14} className="text-cyan-700 mr-2 sm:w-4 sm:h-4" />
                <span className="font-bold text-indigo-800 text-xs sm:text-sm tracking-wide">Supporting Partners</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {silverPartners.map((partner) => (
                <div
                  key={partner.id}
                  className="bg-gradient-to-br from-white to-blue-50/40 border-2 border-blue-200/60 rounded-xl p-4 sm:p-5 hover:shadow-xl hover:border-cyan-300/70 transition-all duration-200 shadow-md"
                >
                  <div className="text-center">
                    <a
                      href={partner.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mb-3 sm:mb-4 transition-all duration-200 hover:scale-105 touch-manipulation"
                      onClick={() => handlePartnerClick(partner, 'silver_logo')}
                    >
                      <div className="w-28 h-28 sm:w-32 sm:h-32 relative bg-white/60 p-2 sm:p-3 rounded-lg mx-auto border border-black/20 hover:border-black/30 transition-all duration-200">
                        <Image
                          src={partner.logo}
                          alt={partner.name}
                          fill
                          className="object-contain"
                        />
                      </div>
                    </a>
                    
                    <h3 className="text-base sm:text-lg font-bold text-black mb-2">{partner.name}</h3>
                    {partner.blurb && (
                      <p className="text-black/70 leading-relaxed mb-2 sm:mb-3 text-xs sm:text-sm line-clamp-3">
                        {partner.blurb}
                      </p>
                    )}
                    
                    <Button
                      href={partner.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="outline"
                      size="sm"
                      className="border border-black text-black hover:bg-black hover:text-white transition-all duration-200 w-full min-h-[40px] touch-manipulation"
                      onClick={() => handlePartnerClick(partner, 'silver_cta')}
                    >
                      Visit Website
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Community Partners Section */}
        {regularPartners.length > 0 && (
          <div className="mb-8 sm:mb-12">
            <div className="text-center mb-4 sm:mb-6">
              <div className="inline-flex items-center bg-gradient-to-r from-emerald-400/30 via-green-400/30 to-teal-500/30 px-3 sm:px-4 py-2 rounded-full border border-emerald-400/40 shadow-lg">
                <Users size={14} className="text-emerald-700 mr-2 sm:w-4 sm:h-4" />
                <span className="font-bold text-teal-800 text-xs sm:text-sm tracking-wide">Community Partners</span>
              </div>
              
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-black mb-2 mt-3">
                Community <span className="text-zurich">Partners</span>
              </h3>
              <p className="text-black/70 max-w-2xl mx-auto text-xs sm:text-sm px-2 sm:px-0">
                Organizations that help us build connections in the JavaScript ecosystem.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-6 items-center justify-items-center">
              {regularPartners.map((partner) => (
                <div
                  key={partner.id}
                  className="group w-full"
                >
                  <a
                    href={partner.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full aspect-square max-w-28 sm:max-w-32 mx-auto relative transition-all duration-200 hover:scale-105 touch-manipulation"
                    aria-label={`Visit ${partner.name} website`}
                    onClick={() => handlePartnerClick(partner, 'regular')}
                  >
                    <div className="bg-gradient-to-br from-white to-green-50/30 border border-emerald-200/60 hover:border-teal-300/80 rounded-xl p-2 sm:p-3 h-full shadow-sm hover:shadow-lg transition-all duration-200">
                      <Image
                        src={partner.logo}
                        alt={`${partner.name} logo`}
                        fill
                        className="object-contain grayscale group-hover:grayscale-0 transition-all duration-200 p-1 sm:p-2"
                      />
                    </div>
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="text-center bg-gradient-to-br from-js-100/60 via-js-dark-50/40 to-js-darker-100/60 backdrop-blur rounded-xl p-4 sm:p-6 border border-violet-200/50 shadow-lg">
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-zurich mb-2 sm:mb-3">
            Ready to Partner With Us?
          </h3>
          <p className="text-gray-700 mb-4 sm:mb-6 leading-relaxed max-w-2xl mx-auto text-sm sm:text-base px-2 sm:px-0">
            Join our partners and help us build the most vibrant JavaScript community in Switzerland.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center mb-4 sm:mb-6">
            <Button
              href="/partnerships"
              variant="primary"
              className="bg-black hover:bg-gray-800 text-white transition-all duration-200 w-full sm:w-auto min-h-[48px] touch-manipulation"
              onClick={() => track('partnership_cta_click', { source: 'partners_section_cta' })}
            >
              <span>Become a Partner</span>
              <ArrowRight size={16} className="ml-2 flex-shrink-0" />
            </Button>
            
            <Button
              href="/contact"
              variant="outline"
              className="border border-black text-black hover:bg-black hover:text-white transition-all duration-200 w-full sm:w-auto min-h-[48px] touch-manipulation"
            >
              Get in Touch
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
            <div className="flex flex-col items-center text-black hover:text-red-600 transition-colors duration-200 p-2 sm:p-3 rounded-lg hover:bg-red-50/50">
              <Heart size={18} className="text-red-500 mb-1 sm:w-5 sm:h-5" />
              <span className="text-xs font-bold">Community Impact</span>
            </div>
            <div className="flex flex-col items-center text-black hover:text-blue-600 transition-colors duration-200 p-2 sm:p-3 rounded-lg hover:bg-blue-50/50">
              <Users size={18} className="text-blue-500 mb-1 sm:w-5 sm:h-5" />
              <span className="text-xs font-bold">Access to Talent</span>
            </div>
            <div className="flex flex-col items-center text-black hover:text-green-600 transition-colors duration-200 p-2 sm:p-3 rounded-lg hover:bg-green-50/50">
              <Handshake size={18} className="text-green-500 mb-1 sm:w-5 sm:h-5" />
              <span className="text-xs font-bold">Brand Visibility</span>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
