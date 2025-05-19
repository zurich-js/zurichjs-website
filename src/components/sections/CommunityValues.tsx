import { motion } from 'framer-motion';
import { Code, Users, Lightbulb, Globe, Heart, Star } from 'lucide-react';
import { useState, useEffect } from 'react';

import Section from "@/components/Section";

// Define TypeScript interfaces
interface CommunityValue {
  icon: JSX.Element;
  title: string;
  description: string;
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
    },
    {
      icon: <Users size={36} />,
      title: 'Everyone Belongs Here',
      description: 'From JS newbies to seasoned pros - our community welcomes developers of all backgrounds, experience levels, and coding styles with open arms! Your unique perspective matters!',
    },
    {
      icon: <Lightbulb size={36} />,
      title: 'Cutting-Edge Innovation',
      description: "We're all about exploring those shiny new JS frameworks, libraries, and techniques! Stay ahead of the curve and geek out with fellow tech enthusiasts on the coolest JS innovations!",
    },
    {
      icon: <Globe size={36} />,
      title: 'Zurich × Global JS Scene',
      description: 'Proudly rooted in our beautiful city of Zurich, but connected to the worldwide JavaScript ecosystem. We bring global JS trends to our local community and showcase Swiss JS talent!',
    },
  ];

  return (
    <Section variant="gradient">
      <motion.div
        initial={isClient ? { opacity: 0, y: -20 } : { opacity: 1, y: 0 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center bg-white/30 px-4 py-2 rounded-full mb-4">
          <Heart size={18} className="text-red-500 mr-2" />
          <span className="font-medium text-black">What makes our JS community special</span>
        </div>

        <h2 className="text-3xl font-bold mb-3">Our JavaScript Community Values ✨</h2>
        <p className="max-w-3xl mx-auto text-lg">
          These aren&apos;t just words on a screen - they&apos;re the core principles that make ZurichJS the most vibrant,
          welcoming, and knowledge-packed JavaScript community in Switzerland! 💛
        </p>
      </motion.div>

      <div className="grid grid-cols-[repeat(auto-fit,_minmax(300px,1fr))] gap-8">
        {values.map((value, index) => (
          <motion.div
            key={index}
            initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: isClient ? index * 0.1 : 0 }}
            className="bg-white p-6 rounded-lg shadow-md relative overflow-hidden"
          >
            {/* Decorative star in background */}
            <div className="absolute -right-4 -bottom-4 opacity-5">
              <Star size={100} />
            </div>

            <div className="flex justify-between items-start mb-4">
              <div className="text-blue-600 z-10">{value.icon}</div>
            </div>

            <h3 className="text-xl font-bold mb-2 text-gray-900 z-10 relative">
              {value.title}
            </h3>
            <p className="text-gray-700 z-10 relative">
              {value.description}
            </p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: isClient ? 0.5 : 0 }}
        className="mt-12 text-center"
      >
        <p className="text-xl font-bold">
          Sounds like your kind of community?
        </p>
        <p className="text-lg font-medium">
          <a href="https://www.meetup.com/zurich-js" target="_blank" className="underline hover:text-blue-700 transition-colors">Join us at our next meetup</a> and experience the ZurichJS magic!
        </p>
      </motion.div>
    </Section>
  );
}
