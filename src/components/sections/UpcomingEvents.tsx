import { motion } from 'framer-motion';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Section from '../Section';
import { Event } from '@/sanity/queries';
interface UpcomingEventsProps {
  events: Event[];
  textClassName?: string;
  titleClassName?: string;
}

export default function UpcomingEvents({
  events,
}: UpcomingEventsProps) {
  if (!events || events.length === 0) {
    return null;
  }

  // Sort events by datetime in ascending order (earliest first)
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
  );

  return (
    <Section variant="white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold mb-2">
            Next JavaScript meetups in Zurich
          </h2>
          <p className="mb-4">
            Get ready to geek out at our epic JS meetups! Knowledge sharing, networking & pure coding fun!
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Button
            href="/events"
            variant="outline"
            className="border-blue-700 text-blue-700 hover:bg-blue-50"
          >
            View All Events 🗓️
          </Button>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedEvents.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card
              type="event"
              item={event}
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
          href="https://meetup.com/zurich-js"
          variant="primary"
          size="lg"
          className="bg-blue-700 hover:bg-blue-600 text-white"
        >
          Join Next Meetup 🚀
        </Button>
        <p className="mt-4">
          Awesome JS talks, cool people, and snacks - what&apos;s not to love? <br />
          Can&apos;t wait to see all the JS magic happening in one room! 💛
        </p>
      </motion.div>
    </Section>
  );
}
