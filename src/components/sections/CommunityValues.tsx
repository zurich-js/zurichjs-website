import { motion } from 'framer-motion';
import { Code, Users, Lightbulb, Globe, Heart, Star, Sparkles, ArrowRight, Zap, Target } from 'lucide-react';
import { useState, useEffect } from 'react';

import Section from "@/components/Section";
import Button from '@/components/ui/Button';

interface CommunityValue {
  icon: JSX.Element;
  title: string;
  description: string;
  color: string;
  bgGradient: string;
  borderColor: string;
  iconBg: string;
}

export default function CommunityValues() {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const values: CommunityValue[] = [
    {
      icon: <Code size={36} />,
      title: 'Epic Knowledge Sharing',
      description: 'Got JS wisdom? Share it! We believe in freely exchanging ideas so everyone can level up their JavaScript superpowers! No gatekeeping, just pure learning goodness.',
      color: 'text-blue-600',
      bgGradient: 'from-blue-50 to-cyan-50',
      borderColor: 'border-blue-200',
      iconBg: 'from-blue-500 to-cyan-500'
    },
    {
      icon: <Users size={36} />,
      title: 'Everyone Belongs Here',
      description: 'From JS newbies to seasoned pros - our community welcomes developers of all backgrounds, experience levels, and coding styles with open arms! Your unique perspective matters!',
      color: 'text-purple-600',
      bgGradient: 'from-purple-50 to-pink-50',
      borderColor: 'border-purple-200',
      iconBg: 'from-purple-500 to-pink-500'
    },
    {
      icon: <Lightbulb size={36} />,
      title: 'Cutting-Edge Innovation',
      description: "We're all about exploring those shiny new JS frameworks, libraries, and techniques! Stay ahead of the curve and geek out with fellow tech enthusiasts on the coolest JS innovations!",
      color: 'text-yellow-600',
      bgGradient: 'from-yellow-50 to-orange-50',
      borderColor: 'border-yellow-200',
      iconBg: 'from-yellow-500 to-orange-500'
    },
    {
      icon: <Globe size={36} />,
      title: 'Zurich × Global JS Scene',
      description: 'Proudly rooted in our beautiful city of Zurich, but connected to the worldwide JavaScript ecosystem. We bring global JS trends to our local community and showcase Swiss JS talent!',
      color: 'text-green-600',
      bgGradient: 'from-green-50 to-emerald-50',
      borderColor: 'border-green-200',
      iconBg: 'from-green-500 to-emerald-500'
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      }
    }
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.9
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  const floatingVariants = {
    animate: {
      y: [-8, 8, -8],
      rotate: [-2, 2, -2],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <Section variant="gradient" className="relative overflow-hidden">
      {/* Enhanced background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 -right-32 w-64 h-64 bg-white/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 -left-32 w-80 h-80 bg-white/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Floating decorative elements */}
      <motion.div
        className="absolute top-20 right-20 text-4xl opacity-30"
        variants={floatingVariants}
        animate="animate"
      >
        ⚛️
      </motion.div>
      <motion.div
        className="absolute top-40 left-10 text-3xl opacity-25"
        variants={floatingVariants}
        animate="animate"
        style={{ animationDelay: '1s' }}
      >
        💡
      </motion.div>
      <motion.div
        className="absolute bottom-32 right-10 text-3xl opacity-35"
        variants={floatingVariants}
        animate="animate"
        style={{ animationDelay: '2s' }}
      >
        🌟
      </motion.div>

      <div className="relative z-10">
        {/* Enhanced header with glassmorphism */}
        <motion.div
          initial={isClient ? { opacity: 0, y: -20 } : { opacity: 1, y: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center bg-white/30 backdrop-blur-lg px-6 py-3 rounded-full mb-6 border border-white/50 shadow-lg">
            <Heart size={20} className="text-red-500 mr-2" />
            <span className="font-semibold text-black">What makes our JS community special</span>
            <Sparkles size={18} className="text-yellow-600 ml-2" />
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-black">
            Our JavaScript <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
              Community Values
            </span> ✨
          </h2>
          <p className="max-w-4xl mx-auto text-xl md:text-2xl leading-relaxed text-black/80">
            These aren&apos;t just words on a screen - they&apos;re the core principles that make ZurichJS the most vibrant,
            welcoming, and knowledge-packed JavaScript community in Switzerland! 💛
          </p>
        </motion.div>

        {/* Enhanced values grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12"
        >
          {values.map((value, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{ 
                y: -12, 
                scale: 1.02,
                transition: { duration: 0.3 }
              }}
              className="group"
            >
              <div className={`bg-gradient-to-br ${value.bgGradient} backdrop-blur-xl p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border ${value.borderColor} hover:border-opacity-80 relative overflow-hidden`}>
                {/* Background glow effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${value.bgGradient} opacity-50 blur-xl scale-110 group-hover:opacity-70 transition-opacity duration-300`}></div>
                
                {/* Decorative elements */}
                <div className="absolute -right-8 -top-8 opacity-10">
                  <Star size={120} />
                </div>
                <div className="absolute -left-4 -bottom-4 opacity-5">
                  <Target size={80} />
                </div>

                <div className="relative z-10">
                  {/* Enhanced icon with gradient background */}
                  <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${value.iconBg} rounded-2xl shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <div className="text-white">
                      {value.icon}
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className={`text-2xl lg:text-3xl font-bold mb-4 ${value.color} group-hover:scale-105 transition-transform duration-300 origin-left`}>
                    {value.title}
                  </h3>
                  <p className="text-gray-700 text-lg leading-relaxed group-hover:text-gray-800 transition-colors duration-300">
                    {value.description}
                  </p>

                  {/* Hover indicator */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 0 }}
                    whileHover={{ opacity: 1, x: 0 }}
                    className="flex items-center mt-4 text-sm font-semibold text-gray-600"
                  >
                    <span>Learn more about this value</span>
                    <ArrowRight size={16} className="ml-2" />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Enhanced call to action */}
        <motion.div
          initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <div className="bg-white/20 backdrop-blur-xl rounded-2xl p-8 border border-white/30 shadow-2xl max-w-4xl mx-auto">
            <div className="mb-6">
              <div className="inline-flex items-center mb-4">
                <Zap size={24} className="text-yellow-500 mr-2" />
                <h3 className="text-2xl md:text-3xl font-bold text-black">
                  Sounds like your kind of community?
                </h3>
                <Zap size={24} className="text-yellow-500 ml-2" />
              </div>
              <p className="text-xl md:text-2xl text-black/80 mb-6 leading-relaxed">
                Join us at our next meetup and experience the ZurichJS magic firsthand! Connect with like-minded developers, share your passion for JavaScript, and be part of something special.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                href="https://www.meetup.com/zurich-js"
                variant="primary"
                size="lg"
                className="group bg-black hover:bg-gray-800 text-white shadow-lg hover:shadow-xl"
              >
                <span>Join Our Next Meetup</span>
                <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Button
                href="/about"
                variant="outline"
                size="lg"
                className="border-2 border-black text-black hover:bg-black hover:text-white"
              >
                Learn More About Us
              </Button>
            </div>
            
            <div className="mt-6 flex items-center justify-center text-black/60 text-sm">
              <Sparkles size={16} className="mr-2 text-yellow-500" />
              <span>Open community • Welcoming atmosphere • JavaScript excellence ✨</span>
            </div>
          </div>
        </motion.div>
      </div>
    </Section>
  );
}
