import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Heart, Star, Trophy, Users, Zap, Building2, Handshake } from 'lucide-react';
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
}

export default function Partners({ partners }: PartnersProps) {
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      }
    }
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const floatingVariants = {
    animate: {
      y: [-8, 8, -8],
      rotate: [-2, 2, -2],
      transition: {
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <Section variant="gradient" padding="lg" className="relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 -left-40 w-96 h-96 bg-white/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      {/* Floating decorative elements */}
      <motion.div
        className="absolute top-16 right-16 text-3xl opacity-30"
        variants={floatingVariants}
        animate="animate"
      >
        🤝
      </motion.div>
      <motion.div
        className="absolute bottom-20 left-16 text-2xl opacity-25"
        variants={floatingVariants}
        animate="animate"
        style={{ animationDelay: '2s' }}
      >
        💫
      </motion.div>
      <motion.div
        className="absolute top-32 left-1/4 text-2xl opacity-20"
        variants={floatingVariants}
        animate="animate"
        style={{ animationDelay: '4s' }}
      >
        🚀
      </motion.div>

      <div className="relative z-10">
        {/* Main Header */}
        <motion.div
          initial={isClient ? { opacity: 0, y: -20 } : { opacity: 1, y: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full mb-6 border border-white/30">
            <Handshake size={20} className="text-blue-600 mr-2" />
            <span className="font-semibold text-black">Our Amazing Partners</span>
            <Heart size={18} className="text-yellow-600 ml-2" />
          </div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-black">
            Powered by <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-yellow-600">Incredible</span> Sponsors 🎯
          </h2>
          <p className="text-xl text-black/80 max-w-3xl mx-auto leading-relaxed">
            These amazing organizations fuel our JavaScript passion and make our community thrive. 
            Together, we&apos;re building something extraordinary! ✨
          </p>
        </motion.div>

        {/* Gold Partners Section - Premium Tier */}
        {goldPartners.length > 0 && (
          <div className="mb-20">
            <motion.div
              initial={isClient ? { opacity: 0, y: -15 } : { opacity: 1, y: 0 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center bg-gradient-to-r from-yellow-400/20 to-yellow-500/20 backdrop-blur-sm px-6 py-3 rounded-full mb-6 border border-yellow-300/50">
                <Trophy size={20} className="text-yellow-600 mr-2" />
                <span className="font-semibold text-yellow-900">Premium Partners</span>
                <Star size={18} className="text-yellow-600 ml-2" />
              </div>
            </motion.div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="space-y-8"
            >
                             {goldPartners.map((partner) => (
                <motion.div
                  key={partner.id}
                  variants={cardVariants}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="group"
                >
                  <div className="relative">
                    {/* Premium glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/30 to-blue-400/30 rounded-3xl blur-xl scale-105 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    {/* Premium badge - positioned outside card to avoid clipping */}
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black px-4 py-1.5 rounded-full font-bold text-xs shadow-lg transform rotate-2 z-20">
                      🥇 Premium Partner
                    </div>
                    
                    {/* Premium card */}
                    <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50 p-8 md:p-10">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-white/40"></div>

                      <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left gap-8">
                        <div className="flex-shrink-0">
                          <motion.a
                            href={partner.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                            whileHover={{ scale: 1.05, rotateY: 5 }}
                            transition={{ duration: 0.3 }}
                            onClick={() => handlePartnerClick(partner, 'gold_logo')}
                          >
                            <div className="w-64 h-32 lg:w-80 lg:h-40 relative bg-white/80 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100">
                              <Image
                                src={partner.logo}
                                alt={partner.name}
                                fill
                                className="object-contain"
                              />
                            </div>
                          </motion.a>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">{partner.name}</h3>
                          {partner.blurb && (
                            <div className="text-gray-700 leading-relaxed text-lg mb-6">
                              {partner.blurb.split('\n').map((line, idx) => (
                                <p key={idx} className={idx > 0 ? 'mt-3' : ''}>
                                  {line}
                                </p>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex flex-col sm:flex-row gap-4">
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button
                                href={partner.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="primary"
                                className="group bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl"
                                onClick={() => handlePartnerClick(partner, 'gold_cta')}
                              >
                                <span>Visit {partner.name}</span>
                                <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                              </Button>
                            </motion.div>
                            
                            <Button
                              href="/partnerships"
                              variant="outline"
                              className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
                              onClick={() => track('partnership_cta_click', { source: 'gold_partner_section' })}
                            >
                              Partner With Us
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}

        {/* Silver Partners Section */}
        {silverPartners.length > 0 && (
          <div className="mb-20">
            <motion.div
              initial={isClient ? { opacity: 0, y: -15 } : { opacity: 1, y: 0 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center bg-gradient-to-r from-blue-400/20 to-blue-500/20 backdrop-blur-sm px-6 py-3 rounded-full mb-6 border border-blue-300/50">
                <Building2 size={20} className="text-blue-600 mr-2" />
                <span className="font-semibold text-blue-900">Supporting Partners</span>
                <Sparkles size={18} className="text-blue-600 ml-2" />
              </div>
            </motion.div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
                             {silverPartners.map((partner) => (
                <motion.div
                  key={partner.id}
                  variants={cardVariants}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="group"
                >
                  <div className="relative">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-yellow-400/20 rounded-2xl blur-lg scale-105 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Card */}
                    <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-white/50 p-6">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/70 to-white/30"></div>
                      
                      <div className="relative z-10 flex flex-col items-center text-center">
                        <motion.a
                          href={partner.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block mb-6"
                          whileHover={{ scale: 1.05 }}
                          transition={{ duration: 0.2 }}
                          onClick={() => handlePartnerClick(partner, 'silver_logo')}
                        >
                          <div className="w-48 h-24 relative bg-white/90 p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                            <Image
                              src={partner.logo}
                              alt={partner.name}
                              fill
                              className="object-contain"
                            />
                          </div>
                        </motion.a>
                        
                        <h3 className="text-xl font-bold text-gray-900 mb-3">{partner.name}</h3>
                        {partner.blurb && (
                          <p className="text-gray-700 leading-relaxed mb-4 text-sm">
                            {partner.blurb}
                          </p>
                        )}
                        
                        <div className="flex flex-col sm:flex-row gap-3 w-full">
                          <Button
                            href={partner.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="outline"
                            className="border-blue-500 text-blue-600 hover:bg-blue-600 hover:text-white flex-1"
                            onClick={() => handlePartnerClick(partner, 'silver_cta')}
                          >
                            Visit Website
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}

        {/* Community Partners Section */}
        {regularPartners.length > 0 && (
          <div className="mb-16">
            <motion.div
              initial={isClient ? { opacity: 0, y: -15 } : { opacity: 1, y: 0 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full mb-6 border border-white/30">
                <Users size={20} className="text-blue-600 mr-2" />
                <span className="font-semibold text-black">Community Partners</span>
                <Heart size={18} className="text-yellow-600 ml-2" />
              </div>
              
              <h3 className="text-2xl md:text-3xl font-bold text-black mb-4">
                Amazing Organizations Supporting Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-yellow-600">Community</span>
              </h3>
              <p className="text-black/80 max-w-2xl mx-auto text-lg">
                These incredible partners help us build bridges in the JavaScript ecosystem! 🌉
              </p>
            </motion.div>

            <motion.div
              initial={isClient ? { opacity: 0 } : { opacity: 1 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, staggerChildren: 0.05 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-10 items-center justify-items-center mb-12"
            >
              {regularPartners.map((partner, index) => (
                <motion.div
                  key={partner.id}
                  initial={isClient ? { opacity: 0, scale: 0.8 } : { opacity: 1, scale: 1 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ 
                    y: -8, 
                    scale: 1.1,
                    transition: { duration: 0.2 }
                  }}
                  className="group"
                >
                  <a
                    href={partner.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-40 h-28 relative"
                    aria-label={`Visit ${partner.name} website`}
                    onClick={() => handlePartnerClick(partner, 'regular')}
                  >
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-md rounded-xl shadow-lg group-hover:shadow-2xl border border-white/50 transition-all duration-300 p-4">
                      <Image
                        src={partner.logo}
                        alt={`${partner.name} logo`}
                        fill
                        className="object-contain grayscale group-hover:grayscale-0 transition-all duration-300 p-2"
                      />
                    </div>
                  </a>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}

        {/* Enhanced Call to Action */}
        <motion.div
          initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center bg-white/20 backdrop-blur-xl rounded-3xl p-10 border border-white/30 shadow-2xl"
        >
          <div className="mb-6">
            <div className="inline-flex items-center mb-4">
              <Zap size={24} className="text-yellow-600 mr-2" />
              <h3 className="text-2xl md:text-3xl font-bold text-black">
                Ready to Sponsor Our Community?
              </h3>
              <Zap size={24} className="text-yellow-600 ml-2" />
            </div>
            <p className="text-black/80 max-w-3xl mx-auto text-lg leading-relaxed">
              Join our incredible sponsors and help us build the most vibrant JavaScript community in Switzerland! 
              Your support makes all the difference. 💫
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                href="/partnerships"
                variant="primary"
                size="lg"
                className="group bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl"
                onClick={() => track('partnership_cta_click', { source: 'partners_section_cta' })}
              >
                <span>Become a Partner</span>
                <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
            
            <Button
              href="/contact"
              variant="outline"
              size="lg"
              className="border-2 border-white text-black hover:bg-zurich hover:text-black"
            >
              Get in Touch
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center text-black/80">
              <Trophy size={20} className="text-yellow-600 mb-2" />
              <span className="text-sm font-medium">Premium visibility</span>
            </div>
            <div className="flex flex-col items-center text-black/80">
              <Users size={20} className="text-blue-600 mb-2" />
              <span className="text-sm font-medium">Access to talent</span>
            </div>
            <div className="flex flex-col items-center text-black/80">
              <Heart size={20} className="text-yellow-600 mb-2" />
              <span className="text-sm font-medium">Community impact</span>
            </div>
          </div>
        </motion.div>
      </div>
    </Section>
  );
}
