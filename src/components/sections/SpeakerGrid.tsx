import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Mic, Star, Users, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import Section from "@/components/Section";
import Button from '@/components/ui/Button';
import type { Speaker } from '@/types';

interface SpeakerGridProps {
  speakers: Speaker[];
  textClassName?: string;
  titleClassName?: string;
}

export default function SpeakerGrid({ 
  speakers, 
  textClassName = 'text-gray-800',
  titleClassName = 'text-gray-900'
}: SpeakerGridProps) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!speakers || speakers.length === 0) {
    return null;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      }
    }
  };

  const floatingVariants = {
    animate: {
      y: [-5, 5, -5],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <Section variant="white" className="relative overflow-hidden">
      {/* Background decoration with ZurichJS colors */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-32 w-64 h-64 bg-gradient-to-br from-yellow-200 to-blue-200 rounded-full opacity-40 blur-3xl"></div>
        <div className="absolute bottom-20 -right-32 w-80 h-80 bg-gradient-to-br from-blue-100 to-yellow-100 rounded-full opacity-30 blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-yellow-100 to-blue-100 rounded-full opacity-20 blur-3xl"></div>
      </div>

      {/* Floating decorative elements */}
      <motion.div
        className="absolute top-16 right-16 text-3xl opacity-25"
        variants={floatingVariants}
        animate="animate"
      >
        🎤
      </motion.div>
      <motion.div
        className="absolute bottom-20 left-16 text-2xl opacity-30"
        variants={floatingVariants}
        animate="animate"
        style={{ animationDelay: '1s' }}
      >
        ⭐
      </motion.div>

      <div className="relative z-10">
        {/* Enhanced header section with ZurichJS colors */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-6">
          <motion.div
            initial={isClient ? { opacity: 0, x: -20 } : { opacity: 1, x: 0 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex-1"
          >
            <div className="inline-flex items-center bg-gradient-to-r from-yellow-50 to-blue-50 backdrop-blur-sm px-6 py-3 rounded-full mb-6 border border-yellow-200/50">
              <Mic size={20} className="text-blue-600 mr-2" />
              <span className="font-semibold text-blue-900">Meet Our Amazing Speakers</span>
              <Trophy size={18} className="text-yellow-600 ml-2" />
            </div>
            
            <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold mb-4 ${titleClassName}`}>
              Featured <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-yellow-600">Speakers</span> 🎤
            </h2>
            <p className={`${textClassName} text-xl leading-relaxed max-w-2xl`}>
              Get inspired by these JavaScript wizards sharing their coding superpowers and industry insights with our amazing community! ✨
            </p>
          </motion.div>
          
          <motion.div
            initial={isClient ? { opacity: 0, x: 20 } : { opacity: 1, x: 0 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Button 
              href="/speakers" 
              variant="outline"
              size="lg"
              className="group border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white shadow-lg hover:shadow-xl"
            >
              <span>View All Speakers</span>
              <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </div>

                {/* Horizontal scrolling speakers showcase */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mb-8 overflow-hidden"
        >
          {/* Scrolling speaker profiles line */}
          <div className="relative">
            {/* Background pattern */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-yellow-50/50 rounded-3xl -rotate-1"></div>
            <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl py-8 px-6 border border-blue-100/50 shadow-lg overflow-hidden">
              
              {/* Scrolling container */}
              <div className="relative">
                <motion.div
                  className="flex gap-4"
                  animate={{
                    x: [0, -((speakers.length * 80) + (speakers.length * 16))] // 80px width + 16px gap
                  }}
                  transition={{
                    duration: speakers.length * 3, // Adjust speed based on number of speakers
                    ease: "linear",
                    repeat: Infinity,
                  }}
                  style={{ width: `${(speakers.length * 2) * (80 + 16)}px` }} // Double width for seamless loop
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
                        scale: 1.15,
                        y: -12,
                        transition: { duration: 0.2 },
                        zIndex: 50
                      }}
                      className="group relative flex-shrink-0"
                      style={{ width: '80px', height: '80px' }}
                    >
                      <div className="relative">
                        {/* Hover glow */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-yellow-400/20 rounded-full scale-125 opacity-0 group-hover:opacity-100 transition-all duration-300 blur-md"></div>
                        
                        {/* Mini profile card */}
                        <Link href={`/speakers/${speaker.id}`} className="block">
                          <div className="relative bg-white rounded-full shadow-md group-hover:shadow-xl transition-all duration-300 border-2 border-gray-100 group-hover:border-blue-200 overflow-hidden w-20 h-20 cursor-pointer">
                            <img
                              src={`${speaker.image}?h=120`}
                              alt={speaker.name}
                              className="w-full h-full object-cover"
                            />
                            
                            {/* Talk count mini badge */}
                            <div className="absolute -top-1 -right-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
                              {speaker.talks.length}
                            </div>
                          </div>
                        </Link>
                        
                        {/* Hover tooltip - positioned to avoid cutoff */}
                        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none shadow-lg">
                          <div className="text-center font-medium">{speaker.name}</div>
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
                        scale: 1.15,
                        y: -12,
                        transition: { duration: 0.2 },
                        zIndex: 50
                      }}
                      className="group relative flex-shrink-0"
                      style={{ width: '80px', height: '80px' }}
                    >
                      <div className="relative">
                        {/* Hover glow */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-yellow-400/20 rounded-full scale-125 opacity-0 group-hover:opacity-100 transition-all duration-300 blur-md"></div>
                        
                        {/* Mini profile card */}
                        <Link href={`/speakers/${speaker.id}`} className="block">
                          <div className="relative bg-white rounded-full shadow-md group-hover:shadow-xl transition-all duration-300 border-2 border-gray-100 group-hover:border-blue-200 overflow-hidden w-20 h-20 cursor-pointer">
                            <img
                              src={`${speaker.image}?h=120`}
                              alt={speaker.name}
                              className="w-full h-full object-cover"
                            />
                            
                            {/* Talk count mini badge */}
                            <div className="absolute -top-1 -right-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
                              {speaker.talks.length}
                            </div>
                          </div>
                        </Link>
                        
                        {/* Hover tooltip - positioned to avoid cutoff */}
                        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none shadow-lg">
                          <div className="text-center font-medium">{speaker.name}</div>
                          {/* Tooltip arrow */}
                          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-black rotate-45"></div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
              
              {/* Quick stats - removed countries */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="mt-8 text-center"
              >
                <p className="text-gray-700 text-sm">
                  <span className="font-semibold text-blue-600">{speakers.length} speakers</span> • 
                  <span className="font-semibold text-yellow-600 ml-1">{speakers.reduce((total, speaker) => total + speaker.talks.length, 0)} talks</span> • 
                  <span className="font-semibold text-purple-600 ml-1">One amazing community</span>
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced call to action section with ZurichJS colors */}
        <motion.div
          initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center bg-gradient-to-r from-yellow-50 to-blue-50 rounded-2xl p-8 border border-yellow-200/50 backdrop-blur-sm"
        >
          <div className="mb-6">
            <div className="inline-flex items-center mb-4">
              <Star size={24} className="text-yellow-500 mr-2" />
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900">
                Ready to Share Your Knowledge?
              </h3>
              <Star size={24} className="text-yellow-500 ml-2" />
            </div>
            <p className="text-gray-700 max-w-3xl mx-auto text-lg leading-relaxed">
              Got JavaScript knowledge to share? Join our amazing lineup of speakers and rock the stage! 
              Whether you&apos;re a seasoned expert or sharing for the first time, we&apos;d love to hear from you.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <Button 
              href="/cfp" 
              variant="primary" 
              size="lg"
                              className="group bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl"
            >
              <span>Become a Speaker</span>
              <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <Button 
              href="/speakers" 
              variant="outline" 
              size="lg"
              className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
            >
              Browse All Speakers
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="flex items-center justify-center text-gray-600 text-sm">
              <Users size={16} className="mr-2 text-blue-500" />
              <span>Supportive audience</span>
            </div>
            <div className="flex items-center justify-center text-gray-600 text-sm">
              <Trophy size={16} className="mr-2 text-yellow-500" />
              <span>Professional growth</span>
            </div>
            <div className="flex items-center justify-center text-gray-600 text-sm">
              <Sparkles size={16} className="mr-2 text-yellow-500" />
              <span>Community impact</span>
            </div>
          </div>
        </motion.div>
      </div>
    </Section>
  );
}