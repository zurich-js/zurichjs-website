import { motion } from 'framer-motion';
import Card from '../ui/Card';
import Button from '../ui/Button';

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
  if (!speakers || speakers.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
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
            initial={{ opacity: 0, x: 20 }}
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
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card 
                type="speaker" 
                item={speaker} 
              />
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
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
      </div>
    </section>
  );
}