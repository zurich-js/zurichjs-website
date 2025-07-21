import { motion } from 'framer-motion';
import { Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';

import Section from "@/components/Section";
import Button from '@/components/ui/Button';
import { Speaker } from '@/types';

interface SpeakerGridProps {
  speakers: Speaker[];
  textClassName?: string;
  titleClassName?: string;
}

export default function SpeakerGrid({ 
  speakers, 
  textClassName = 'text-black/80',
  titleClassName = 'text-black'
}: SpeakerGridProps) {

  if (!speakers || speakers.length === 0) {
    return null;
  }

  const totalSpeakers = speakers.length;
  const totalTalks = speakers.reduce((total, speaker) => total + speaker.talks.length, 0);

  return (
    <Section variant="white" padding="lg">
      <div className="px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center bg-black/10 px-3 sm:px-4 py-2 rounded-full mb-4 sm:mb-6 border border-black/20 shadow-sm">
            <Users size={16} className="text-black mr-2" />
            <span className="font-semibold text-black text-xs sm:text-sm">Meet Our Speakers</span>
          </div>
          
          <h2 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 ${titleClassName}`}>
            Featured <span className="text-zurich">Speakers</span>
          </h2>
          <p className={`${textClassName} text-base sm:text-lg md:text-xl leading-relaxed max-w-3xl mx-auto px-2 sm:px-0`}>
            Get inspired by JavaScript experts sharing their knowledge and insights with our community.
          </p>
        </div>

        {/* Horizontal scrolling speakers showcase */}
        <div className="mb-6 sm:mb-8 overflow-hidden">
          <div className="relative">
            <div className="relative bg-white rounded-3xl py-6 sm:py-8 px-4 sm:px-6 border border-black/10 shadow-lg overflow-hidden">
              {/* Scrolling container */}
              <div className="relative">
                <motion.div
                  className="flex gap-3 sm:gap-4"
                  animate={{
                    x: [0, -((totalSpeakers * 70) + (totalSpeakers * 12))] // Adjusted for smaller mobile size
                  }}
                  transition={{
                    duration: totalSpeakers * 3, // Adjust speed based on number of speakers
                    ease: "linear",
                    repeat: Infinity,
                  }}
                  style={{ width: `${(totalSpeakers * 2) * (70 + 12)}px` }} // Double width for seamless loop
                >
                  {/* First set of speakers */}
                  {speakers.map((speaker, index) => (
                    <motion.div
                      key={`${speaker.id}-1`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ 
                        duration: 0.4, 
                        delay: index * 0.05,
                        type: "spring",
                        bounce: 0.3
                      }}
                      whileHover={{ 
                        scale: 1.1,
                        y: -8,
                        transition: { duration: 0.2 },
                        zIndex: 50
                      }}
                      className="group relative flex-shrink-0 cursor-pointer"
                      style={{ width: '70px', height: '70px' }}
                    >
                      <div className="relative">
                        {/* Hover glow */}
                        <div className="absolute inset-0 bg-gradient-to-r from-zurich/20 to-js/20 rounded-full scale-125 opacity-0 group-hover:opacity-100 transition-all duration-300 blur-md"></div>
                        
                        {/* Mini profile card */}
                        <Link href={`/speakers/${speaker.id}`} className="block cursor-pointer">
                          <div className="relative bg-white/80 rounded-full shadow-md group-hover:shadow-xl transition-all duration-300 border-2 border-black/10 group-hover:border-zurich/50 overflow-hidden w-[70px] h-[70px] cursor-pointer">
                            <img
                              src={speaker.image || '/images/speakers/default.png'}
                              alt={speaker.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                            
                            {/* Talk count mini badge */}
                            <div className="absolute -top-1 -right-1 bg-gradient-to-r from-zurich to-js text-black text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shadow-lg cursor-pointer">
                              {speaker.talks.length}
                            </div>
                          </div>
                        </Link>
                        
                        {/* Hover tooltip - positioned to avoid cutoff */}
                        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none shadow-lg">
                          <div className="text-center font-medium">{speaker.name}</div>
                          {speaker.company && (
                            <div className="text-center text-xs text-gray-300">{speaker.company}</div>
                          )}
                          {/* Tooltip arrow */}
                          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-black rotate-45"></div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* Duplicate set for seamless loop */}
                  {speakers.map((speaker) => (
                    <motion.div
                      key={`${speaker.id}-2`}
                      initial={{ opacity: 1, scale: 1 }}
                      whileHover={{ 
                        scale: 1.1,
                        y: -8,
                        transition: { duration: 0.2 },
                        zIndex: 50
                      }}
                      className="group relative flex-shrink-0 cursor-pointer"
                      style={{ width: '70px', height: '70px' }}
                    >
                      <div className="relative">
                        {/* Hover glow */}
                        <div className="absolute inset-0 bg-gradient-to-r from-zurich/20 to-js/20 rounded-full scale-125 opacity-0 group-hover:opacity-100 transition-all duration-300 blur-md"></div>
                        
                        {/* Mini profile card */}
                        <Link href={`/speakers/${speaker.id}`} className="block cursor-pointer">
                          <div className="relative bg-white/80 rounded-full shadow-md group-hover:shadow-xl transition-all duration-300 border-2 border-black/10 group-hover:border-zurich/50 overflow-hidden w-[70px] h-[70px] cursor-pointer">
                            <img
                              src={speaker.image || '/images/speakers/default.png'}
                              alt={speaker.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                            
                            {/* Talk count mini badge */}
                            <div className="absolute -top-1 -right-1 bg-gradient-to-r from-zurich to-js text-black text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shadow-lg cursor-pointer">
                              {speaker.talks.length}
                            </div>
                          </div>
                        </Link>
                        
                        {/* Hover tooltip - positioned to avoid cutoff */}
                        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none shadow-lg">
                          <div className="text-center font-medium">{speaker.name}</div>
                          {speaker.company && (
                            <div className="text-center text-xs text-gray-300">{speaker.company}</div>
                          )}
                          {/* Tooltip arrow */}
                          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-black rotate-45"></div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
              
              {/* Quick stats - Accurate speaker count */}
              <div className="mt-6 sm:mt-8 text-center">
                <p className="text-black/70 text-xs sm:text-sm">
                  <span className="font-bold text-zurich">{totalSpeakers} speakers</span> • 
                  <span className="font-bold text-js-darker ml-1">{totalTalks} talks</span> • 
                  <span className="font-bold text-black ml-1">One amazing community</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Call to action */}
        <div className="text-center bg-white/20 backdrop-blur rounded-2xl p-6 sm:p-8 border border-black/20 shadow-lg">
          <h3 className="text-xl sm:text-2xl font-bold text-black mb-3 sm:mb-4">
            Want to Speak at ZurichJS?
          </h3>
          <p className="text-black/70 mb-4 sm:mb-6 leading-relaxed max-w-xl mx-auto text-sm sm:text-base px-2 sm:px-0">
            Share your JavaScript knowledge with our community. We welcome speakers of all experience levels 
            and provide a supportive environment to share your story.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center">
            <Button
              href="/cfp"
              variant="primary"
              size="lg"
              className="bg-black hover:bg-gray-800 text-white cursor-pointer transition-all duration-200 w-full sm:w-auto min-h-[48px] touch-manipulation"
            >
              Submit a Talk
            </Button>
            
            <Button
              href="/speakers"
              variant="outline"
              size="lg"
              className="border border-black text-black hover:bg-black hover:text-white cursor-pointer transition-all duration-200 w-full sm:w-auto min-h-[48px] touch-manipulation"
            >
              View All Speakers <ArrowRight size={14} className="ml-2 flex-shrink-0" />
            </Button>
          </div>
        </div>
      </div>
    </Section>
  );
}