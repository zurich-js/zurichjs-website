import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Users, Zap, Heart, Trophy, Coffee, MessageSquare, Target } from 'lucide-react';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { useState, useEffect } from 'react';

import Section from "@/components/Section";
import { FeatureFlags } from '@/constants';

import Button from '../ui/Button';
import Newsletter from '../ui/Newsletter';

// Define TypeScript interfaces
interface Benefit {
  title: string;
  description: string;
  icon: JSX.Element;
  gradient: string;
}

interface JoinCTAProps {
  benefits?: Benefit[];
  newsletterTitle?: string;
  buttonUrl?: string;
}

export default function JoinCTA({
  benefits = [
    {
      title: "Epic Monthly Meetups",
      description: "Regular gatherings packed with awesome JS talks and networking opportunities",
      icon: <Users size={24} />,
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      title: "JavaScript Wizards",
      description: "Learn from passionate industry rockstars and seasoned developers",
      icon: <Zap size={24} />,
      gradient: "from-purple-500 to-pink-500"
    },
    {
      title: "Grow Your Network",
      description: "Connect with the coolest JS devs and tech enthusiasts in Zurich",
      icon: <Target size={24} />,
      gradient: "from-green-500 to-emerald-500"
    },
    {
      title: "Free Food & Drinks",
      description: "Fuel your brain while feeding your curiosity at every community event",
      icon: <Coffee size={24} />,
      gradient: "from-orange-500 to-yellow-500"
    }
  ],
  newsletterTitle = "Stay in the JS Loop!",
  buttonUrl = "https://meetup.com/zurich-js"
}: JoinCTAProps) {
  const showNewsletter = useFeatureFlagEnabled(FeatureFlags.Newsletter);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

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

  const itemVariants = {
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
      rotate: [-3, 3, -3],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <Section variant="black" padding="lg" className="relative overflow-hidden">
      {/* Enhanced background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 -right-40 w-80 h-80 bg-gradient-to-br from-blue-500/20 to-yellow-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 -left-40 w-96 h-96 bg-gradient-to-br from-yellow-500/20 to-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-blue-500/15 to-yellow-500/15 rounded-full blur-3xl"></div>
      </div>

      {/* Floating decorative elements */}
      <motion.div
        className="absolute top-16 right-16 text-3xl opacity-30"
        variants={floatingVariants}
        animate="animate"
      >
        🚀
      </motion.div>
      <motion.div
        className="absolute bottom-20 left-16 text-2xl opacity-25"
        variants={floatingVariants}
        animate="animate"
        style={{ animationDelay: '1s' }}
      >
        ⭐
      </motion.div>
      <motion.div
        className="absolute top-32 left-1/4 text-2xl opacity-20"
        variants={floatingVariants}
        animate="animate"
        style={{ animationDelay: '2s' }}
      >
        💻
      </motion.div>

      <div className="relative z-10">
        <div className={`flex flex-col ${showNewsletter ? 'lg:flex-row lg:gap-16' : ''} gap-8 max-w-7xl mx-auto`}>
          {/* Main CTA Section */}
          <motion.div
            initial={isClient ? { opacity: 0, x: -30 } : { opacity: 1, x: 0 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className={`${showNewsletter ? 'lg:w-2/3' : 'max-w-5xl mx-auto'} text-center ${showNewsletter ? 'lg:text-left' : ''}`}
          >
            {/* Enhanced header */}
            <div className="mb-8">
              <div className="inline-flex items-center bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full mb-6 border border-white/20">
                <Heart size={20} className="text-red-400 mr-2" />
                <span className="font-semibold text-white">Join Our Community</span>
                <Sparkles size={18} className="text-yellow-400 ml-2" />
              </div>
              
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white">
                Join the <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">JS Revolution</span> in Zurich! 
              </h2>
              <p className="text-xl md:text-2xl mb-8 text-gray-300 leading-relaxed">
                Calling all JavaScript enthusiasts! Whether you&apos;re coding in React, Vue, Angular, or vanilla JS – we&apos;ve created an incredible community just for you! Let&apos;s build amazing things together! ✨
              </p>
            </div>

            {/* Enhanced benefits grid with equal heights */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10"
            >
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  whileHover={{ 
                    scale: 1.05, 
                    y: -5,
                    transition: { duration: 0.2 }
                  }}
                  className="group h-full"
                >
                  <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/20 hover:border-white/40 transition-all duration-300 hover:bg-white/15 h-full flex flex-col">
                    {/* Icon with gradient background */}
                    <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br ${benefit.gradient} rounded-xl shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                      <div className="text-white">
                        {benefit.icon}
                      </div>
                    </div>
                    
                    <h3 className="font-bold text-white text-lg mb-3 flex-shrink-0">{benefit.title}</h3>
                    <p className="text-gray-300 group-hover:text-gray-200 transition-colors duration-300 flex-1 leading-relaxed">{benefit.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Enhanced CTA button with better contrast */}
            <motion.div
              initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mb-8"
            >
              <Button
                href={buttonUrl}
                variant="secondary"
                size="lg"
                className="group bg-yellow-400 hover:bg-yellow-500 text-black font-bold shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-200 border-2 border-white/20 hover:border-white/30"
              >
                <span className="text-black font-extrabold">Join Our JS Community</span>
                <ArrowRight size={24} className="ml-2 group-hover:translate-x-1 transition-transform text-black" />
              </Button>
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={isClient ? { opacity: 0 } : { opacity: 1 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="text-center"
            >
              <div className="inline-flex items-center text-gray-400 text-sm">
                <Trophy size={16} className="mr-2 text-yellow-400" />
                <span>Join 500+ JavaScript developers • Welcoming community • Amazing experiences ✨</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Newsletter section */}
          {showNewsletter && (
            <motion.div
              initial={isClient ? { opacity: 0, x: 30 } : { opacity: 1, x: 0 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="lg:w-1/3"
            >
              <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl p-8 rounded-2xl border border-gray-700/50 h-full">
                {/* Newsletter header */}
                <div className="mb-6">
                  <div className="inline-flex items-center bg-gradient-to-r from-blue-500/20 to-yellow-500/20 px-4 py-2 rounded-full mb-4 border border-blue-500/30">
                    <MessageSquare size={18} className="text-blue-400 mr-2" />
                    <span className="font-medium text-blue-200">Stay Updated</span>
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-4 text-white">{newsletterTitle}</h3>
                  <p className="mb-6 text-gray-300 leading-relaxed">
                    Never miss a ZurichJS gathering! Subscribe to our newsletter for exclusive updates on upcoming meetups, special guests, and the latest JavaScript magic happening in Zurich! 🌟
                  </p>
                </div>
                
                <Newsletter />
                
                <p className="mt-4 text-sm text-gray-400">
                  PS: We promise not to spam your inbox - just pure JavaScript goodness delivered fresh! 💌
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </Section>
  );
}
