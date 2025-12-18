import { motion } from 'framer-motion';
import { Users, Calendar, Mic, UserPlus, Sparkles } from 'lucide-react';
import { useState, useEffect, type JSX } from 'react';

// Define TypeScript interfaces for data structure
interface StatsData {
  members: number;
  eventsHosted: number;
  speakersToDate: number;
  totalAttendees: number;
}

interface StatItem {
  icon: JSX.Element;
  label: string;
  value: number;
  description?: string;
}

interface StatsProps {
  stats: StatsData;
  iconColor?: string;
  backgroundColor?: string;
}

export default function Stats({
  stats,
  iconColor = 'text-blue-400',
  backgroundColor = 'bg-black bg-opacity-80'
}: StatsProps) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const statItems: StatItem[] = [
    {
      icon: <Users size={24} />,
      label: 'Community Rockstars',
      value: stats.members,
      description: 'JS enthusiasts across all our groups & counting!'
    },
    {
      icon: <Calendar size={24} />,
      label: 'Epic Gatherings',
      value: stats.eventsHosted,
      description: 'Knowledge-packed events'
    },
    {
      icon: <Mic size={24} />,
      label: 'Inspiring Speakers',
      value: stats.speakersToDate,
      description: 'Sharing JS wisdom'
    },
    {
      icon: <UserPlus size={24} />,
      label: 'Happy Attendees',
      value: stats.totalAttendees,
      description: 'Minds blown by JS magic'
    },
  ];

  return (
    <div className={`${backgroundColor} text-white rounded-xl shadow-xl p-6 backdrop-blur-sm max-w-screen-lg mx-auto`}>
      <motion.div
        initial={isClient ? { opacity: 0, y: -10 } : { opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex justify-center mb-4"
      >
        <div className="flex items-center bg-white/10 px-4 py-2 rounded-full">
          <Sparkles size={16} className={iconColor} />
          <span className="ml-2 text-sm font-medium">Our JavaScript community is thriving! 💛</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {statItems.map((item, index) => (
          <motion.div
            key={index}
            initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: isClient ? index * 0.1 : 0 }}
            className="flex flex-col items-center text-center"
          >
            <div className={`${iconColor} mb-2`}>{item.icon}</div>
            <motion.div
              initial={isClient ? { opacity: 0, scale: 0.8 } : { opacity: 1, scale: 1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.8,
                delay: isClient ? 0.5 + (index * 0.1) : 0,
                type: "spring",
                stiffness: 100
              }}
              className="text-3xl font-bold relative"
            >
              {item.value.toLocaleString()}
              <span className="absolute -top-1 -right-2 text-js text-sm">
                {index === 0 ? '✨' : ''}
              </span>
            </motion.div>
            <div className="text-sm font-medium text-white mt-1">{item.label}</div>
            {item.description && (
              <div className="text-xs text-gray-300 mt-1 italic">
                {item.description}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
