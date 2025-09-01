import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

import Section from '../Section';
import Button from '../ui/Button';

// Define workshop state type
export type WorkshopState = 'confirmed' | 'interest';

export interface Workshop {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  dateInfo: string;
  timeInfo: string;
  locationInfo: string;
  maxAttendees: number;
  image: string;
  iconColor: string;
  tag: string;
  speakerId: string;
  state: WorkshopState;
  speaker?: {
    id: string;
    name: string;
    title: string;
    image: string;
  };
}

interface UpcomingWorkshopsProps {
  workshops: Workshop[];
  textClassName?: string;
  titleClassName?: string;
}

export default function UpcomingWorkshops({
  workshops,
}: UpcomingWorkshopsProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!workshops || workshops.length === 0) {
    return null;
  }

  return (
    <Section variant="gray">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
        <motion.div
          initial={isClient ? { opacity: 0, x: -20 } : { opacity: 1, x: 0 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold mb-2">
            Upcoming JavaScript Workshops
          </h2>
          <p className="mb-4">
            Level up your JavaScript skills with our hands-on workshops led by industry experts!
          </p>
        </motion.div>
        <motion.div
          initial={isClient ? { opacity: 0, x: 20 } : { opacity: 1, x: 0 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Button
            href="/workshops"
            variant="primary"
            className="bg-blue-700 text-white hover:bg-blue-600"
          >
            View All Workshops 🧠
          </Button>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workshops.map((workshop, index) => (
          <motion.div
            key={workshop.id}
            initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden h-full flex flex-col border border-gray-100">
              <div className="relative">
                <div
                  className="w-full h-48 bg-cover bg-center relative"
                  style={{ backgroundImage: `url(${workshop.image})` }}
                />
              </div>
              <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-xl font-bold mb-1">{workshop.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{workshop.subtitle}</p>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="flex items-center bg-gray-50 px-2 py-1.5 rounded-lg text-xs border border-gray-100">
                    <span className="text-gray-700 truncate">📅 {workshop.dateInfo}</span>
                  </div>
                  <div className="flex items-center bg-gray-50 px-2 py-1.5 rounded-lg text-xs border border-gray-100">
                    <span className="text-gray-700 truncate">⏰ {workshop.timeInfo}</span>
                  </div>
                  <div className="flex items-center bg-gray-50 px-2 py-1.5 rounded-lg text-xs border border-gray-100">
                    <span className="text-gray-700 truncate">📍 {workshop.locationInfo}</span>
                  </div>
                  <div className="flex items-center bg-gray-50 px-2 py-1.5 rounded-lg text-xs border border-gray-100">
                    <span className="text-gray-700 truncate">👥 Max {workshop.maxAttendees}</span>
                  </div>
                </div>

                <p className="text-sm text-gray-700 mb-4 line-clamp-2">{workshop.description}</p>

                <div className="mt-auto">
                  <Button
                    href={`/workshops/${workshop.id}`}
                    variant="primary"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Learn More
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-12 text-center"
      >
        <Button
          href="/workshops"
          variant="primary"
          size="lg"
          className="bg-blue-700 hover:bg-blue-800 text-white"
        >
          Explore All Workshops 🚀
        </Button>
        <p className="mt-4">
          Hands-on learning, expert guidance, and career-boosting skills! <br />
          Small group settings ensure personalized attention for maximum learning!
        </p>
      </motion.div>
    </Section>
  );
}
