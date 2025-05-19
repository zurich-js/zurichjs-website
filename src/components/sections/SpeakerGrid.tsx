import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

import Section from '../Section';
import Button from '../ui/Button';
import Card from '../ui/Card';

// Define TypeScript interfaces for the component
interface Speaker {
  id: string;
  name: string;
  title: string;
  image: string;
  talks: number;
}

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

  return (
    <Section variant="white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
        <motion.div
          initial={isClient ? { opacity: 0, x: -20 } : { opacity: 1, x: 0 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className={`text-3xl font-bold mb-2 ${titleClassName}`}>
            Featured Speakers 🎤
          </h2>
          <p className={textClassName}>
            Get inspired by these JavaScript wizards sharing their coding superpowers! ✨
          </p>
        </motion.div>
        <motion.div
          initial={isClient ? { opacity: 0, x: 20 } : { opacity: 1, x: 0 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Button 
            href="/speakers" 
            variant="outline"
            className="border-blue-700 text-blue-700 hover:bg-blue-50"
          >
            View All Speakers
          </Button>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {speakers.map((speaker, index) => (
          <motion.div
            key={speaker.id}
            initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: isClient ? index * 0.1 : 0 }}
          >
            <Card 
              type="speaker" 
              item={speaker}
            />
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: isClient ? 0.3 : 0 }}
        className="mt-12 text-center"
      >
        <Button 
          href="/cfp" 
          variant="secondary" 
          size="lg"
        >
          Become a Speaker 💻
        </Button>
        <p className={`mt-4 text-sm ${textClassName}`}>
          Got JS knowledge to share? Join our amazing lineup and rock the stage! 🌟
        </p>
      </motion.div>
    </Section>
  );
}