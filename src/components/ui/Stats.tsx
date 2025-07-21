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
  stats
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
      className={`bg-[#f7f7f7] text-black rounded-lg shadow-lg p-2 sm:p-3 w-full border border-[#222]/20 relative overflow-hidden`}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#eaeaea] to-transparent"></div>
      <div className="absolute top-0 right-0 w-32 sm:w-48 lg:w-64 h-32 sm:h-48 lg:h-64 bg-gradient-to-br from-[#222]/10 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-24 sm:w-36 lg:w-48 h-24 sm:h-36 lg:h-48 bg-gradient-to-tr from-[#258BCC]/10 to-transparent rounded-full blur-2xl"></div>
      
      {/* Header */}
      <motion.div
        initial={isClient ? { opacity: 0, y: -10 } : { opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mb-2 relative z-10 text-center"
      >
        <div className="inline-flex items-center bg-[#222]/5 px-2 py-1 rounded-full mb-2 border border-[#222]/10">
          <Code2 size={12} className="text-[#258BCC] mr-1" />
          <span className="font-semibold text-[#222] text-xs">Community Stats</span>
          <Zap size={10} className="text-[#258BCC] ml-1" />
        </div>
      </motion.div>

      {/* Stats Layout - Vertical on mobile, Horizontal on desktop */}
      <div className="flex flex-col gap-1 md:grid md:grid-cols-4 md:gap-2 relative z-10">
        {statItems.map((item, index) => (
          <motion.div
            key={index}
            initial={isClient ? { opacity: 0, x: -20 } : { opacity: 1, x: 0 }}
            whileInView={{ opacity: 1, x: 0 }}
            whileHover={{ 
              scale: 1.02, 
              transition: { duration: 0.2 }
            }}
            viewport={{ once: true }}
            transition={{ 
              duration: 0.6, 
              delay: isClient ? 0.4 + (index * 0.1) : 0,
              type: "spring",
              stiffness: 100
            }}
            className="group touch-manipulation cursor-pointer"
          >
            <div className={`bg-[#f7f7f7] rounded-lg p-2 border border-[#222]/10 hover:border-[#258BCC] transition-all duration-300 relative overflow-hidden text-center
              ${index === 0 ? 'hover:bg-blue-50/20' : ''}
              ${index === 1 ? 'hover:bg-green-50/20' : ''}
              ${index === 2 ? 'hover:bg-purple-50/20' : ''}
              ${index === 3 ? 'hover:bg-yellow-50/20' : ''}
            `}>
              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#258BCC]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative z-10">
                {/* Icon at top */}
                <div className="flex justify-center mb-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm
                    ${index === 0 ? 'bg-blue-100' : ''}
                    ${index === 1 ? 'bg-green-100' : ''}
                    ${index === 2 ? 'bg-purple-100' : ''}
                    ${index === 3 ? 'bg-yellow-100' : ''}
                  `}>
                    <div className={
                      index === 0 ? 'text-blue-700' :
                      index === 1 ? 'text-green-700' :
                      index === 2 ? 'text-purple-700' :
                      index === 3 ? 'text-yellow-700' :
                      'text-[#258BCC]'}>
                      <item.icon className="w-3 h-3" />
                    </div>
                  </div>
                </div>
                
                {/* Animated counter - Big number on top */}
                <motion.div
                  initial={isClient ? { opacity: 0, scale: 0.5 } : { opacity: 1, scale: 1 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.8,
                    delay: isClient ? 0.8 + (index * 100) : 0,
                    type: "spring",
                    stiffness: 100
                  }}
                  className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#222] group-hover:text-[#258BCC] transition-colors duration-300 relative mb-1"
                >
                  <AnimatedCounter value={item.value} delay={800 + (index * 100)} />
                </motion.div>
                
                {/* Title - Below the number */}
                <div className="text-xs font-bold text-[#258BCC] group-hover:text-[#222] transition-colors duration-300 mb-1">
                  {item.title}
                </div>
                
                {/* Description - At the bottom */}
                <div className="text-xs text-[#444] group-hover:text-[#258BCC]/80 transition-colors duration-300 leading-tight">
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
        className="text-center mt-2 relative z-10"
      >
        <div className="inline-flex items-center text-[#222] text-xs font-medium">
          <TrendingUp size={12} className="mr-1 text-green-600" />
          <span>Growing daily!</span>
          <span className="ml-1">🚀</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
