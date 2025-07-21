import { motion } from 'framer-motion';
import { Users, Calendar, Mic, TrendingUp, Trophy, Code2, Zap } from 'lucide-react';
import React, { useState, useEffect } from 'react';

interface StatsData {
  members: number;
  eventsHosted: number;
  speakersToDate: number;
  totalAttendees: number;
}

interface StatsProps {
  stats: StatsData;
  backgroundColor?: string;
}

// Animated counter component
const AnimatedCounter = ({ value, delay = 0 }: { value: number; delay?: number }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setCount((prev) => {
          const increment = Math.ceil((value - prev) / 20);
          const nextValue = prev + increment;
          
          if (nextValue >= value) {
            clearInterval(interval);
            return value;
          }
          return nextValue;
        });
      }, 50);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return <span>{count.toLocaleString()}</span>;
};

export default function Stats({
  stats,
  backgroundColor = 'bg-black/70 backdrop-blur-xl'
}: StatsProps) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const statItems = [
    {
      title: 'Community Rockstars',
      description: 'JS enthusiasts across all our groups & counting!',
      value: stats.members,
      icon: Users,
      gradient: 'from-blue-400 to-blue-600',
      bgColor: 'bg-blue-50/10'
    },
    {
      title: 'Epic Gatherings',
      description: 'Knowledge-packed events',
      value: stats.eventsHosted,
      icon: Calendar,
      gradient: 'from-green-400 to-green-600',
      bgColor: 'bg-green-50/10'
    },
    {
      title: 'Inspiring Speakers',
      description: 'Sharing JS wisdom',
      value: stats.speakersToDate,
      icon: Mic,
      gradient: 'from-purple-400 to-purple-600',
      bgColor: 'bg-purple-50/10'
    },
    {
      title: 'Happy Attendees',
      description: 'Minds blown by JS magic',
      value: stats.totalAttendees,
      icon: Trophy,
      gradient: 'from-yellow-400 to-yellow-600',
      bgColor: 'bg-yellow-50/10'
    },
  ];

  return (
    <motion.div 
      initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={`${backgroundColor} text-white rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto border border-white/10 relative overflow-hidden`}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-yellow-400/10 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-400/10 to-transparent rounded-full blur-2xl"></div>
      
      {/* Header */}
      <motion.div
        initial={isClient ? { opacity: 0, y: -10 } : { opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-center mb-4 sm:mb-6 lg:mb-8 relative z-10"
      >
        <div className="inline-flex items-center bg-gradient-to-r from-yellow-400/20 to-yellow-500/20 backdrop-blur-sm px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-full mb-3 sm:mb-4 border border-yellow-400/30">
          <Code2 size={16} className="text-yellow-400 mr-2 sm:mr-2 sm:w-5 sm:h-5" />
          <span className="font-semibold text-white text-sm sm:text-base">Our Growing JavaScript Community</span>
          <Zap size={14} className="text-yellow-400 ml-2 sm:ml-2 sm:w-4 sm:h-4" />
        </div>
        
        <p className="text-gray-300 text-sm sm:text-base lg:text-lg px-4 sm:px-0">
          These numbers tell our story – but the real magic happens when we come together! ✨
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 relative z-10">
        {statItems.map((item, index) => (
          <motion.div
            key={index}
            initial={isClient ? { opacity: 0, scale: 0.8 } : { opacity: 1, scale: 1 }}
            whileInView={{ opacity: 1, scale: 1 }}
            whileHover={{ 
              scale: 1.05, 
              y: -5,
              transition: { duration: 0.2 }
            }}
            viewport={{ once: true }}
            transition={{ 
              duration: 0.6, 
              delay: isClient ? 0.4 + (index * 0.1) : 0,
              type: "spring",
              stiffness: 100
            }}
            className="group"
          >
            <div className={`${item.bgColor} backdrop-blur-sm rounded-xl p-3 sm:p-4 lg:p-6 text-center border border-white/10 hover:border-white/20 transition-all duration-300 relative overflow-hidden h-full flex flex-col`}>
              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              {/* Icon with gradient background */}
              <div className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 mx-auto mb-3 sm:mb-4 bg-gradient-to-br ${item.gradient} rounded-full flex items-center justify-center relative z-10 shadow-lg`}>
                <div className="text-white">
                  <item.icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" />
                </div>
              </div>
              
              {/* Animated counter */}
              <motion.div
                initial={isClient ? { opacity: 0, scale: 0.5 } : { opacity: 1, scale: 1 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.8,
                  delay: isClient ? 0.8 + (index * 0.1) : 0,
                  type: "spring",
                  stiffness: 100
                }}
                className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 text-white relative z-10 group-hover:text-yellow-300 transition-colors duration-300"
              >
                <AnimatedCounter value={item.value} delay={800 + (index * 100)} />
                {/* Sparkle effect */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
                  transition={{ 
                    duration: 2,
                    delay: 1.5 + (index * 0.2),
                    repeat: Infinity,
                    repeatDelay: 3
                  }}
                  className="absolute -top-2 -right-2 text-yellow-400 text-sm"
                >
                  ✨
                </motion.div>
              </motion.div>
              
              {/* Fun title and description */}
              <div className="relative z-10 mt-auto">
                <div className="text-xs sm:text-sm font-bold text-yellow-300 mb-1 group-hover:text-yellow-200 transition-colors duration-300">
                  {item.title}
                </div>
                <div className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors duration-300 leading-relaxed hidden sm:block">
                  {item.description}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Call to action at bottom */}
      <motion.div
        initial={isClient ? { opacity: 0 } : { opacity: 1 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 1.2 }}
        className="text-center mt-4 sm:mt-6 lg:mt-8 relative z-10"
      >
        <div className="inline-flex items-center text-gray-300 text-xs sm:text-sm px-4 sm:px-0">
          <TrendingUp size={14} className="mr-2 text-green-400 sm:w-4 sm:h-4" />
          <span>Growing every day with passionate JavaScript developers!</span>
          <span className="ml-2 text-base sm:text-lg">🚀</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
