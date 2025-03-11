import { motion } from 'framer-motion';
import Button from '../ui/Button';
import Newsletter from '../ui/Newsletter';

// Define TypeScript interfaces
interface Benefit {
  title: string;
  description: string;
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
      description: "Regular gatherings packed with awesome JS talks"
    },
    {
      title: "JavaScript Wizards",
      description: "Learn from passionate industry rockstars"
    },
    {
      title: "Grow Your Network",
      description: "Connect with the coolest JS devs in Zurich"
    },
    {
      title: "Free Food & Drinks",
      description: "Fuel your brain while feeding your curiosity"
    }
  ],
  newsletterTitle = "Stay in the JS Loop! 📬",
  buttonUrl = "https://meetup.com/zurichjs"
}: JoinCTAProps) {
  return (
    <section className="py-20 bg-gray-900 text-white">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:w-1/2"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Join the JS Revolution in Zurich! 💛
            </h2>
            <p className="text-xl mb-8">
              Calling all JavaScript enthusiasts! Whether you&apos;re coding in React, Vue, Angular, or vanilla JS – we&apos;ve created an incredible community just for you! Let&apos;s build amazing things together! ✨
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start">
                  <div className="text-blue-400 mr-4 text-2xl">✓</div>
                  <div>
                    <h3 className="font-bold">{benefit.title}</h3>
                    <p className="text-gray-300">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button
              href={buttonUrl}
              variant="primary"
              size="lg"
              className="bg-blue-700 hover:bg-blue-600 text-white"
            >
              Join Our JS Community 🎉
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:w-1/2 bg-gray-800 p-8 rounded-lg"
          >
            <h3 className="text-2xl font-bold mb-4">{newsletterTitle}</h3>
            <p className="mb-6">
              Never miss a ZurichJS gathering! Subscribe to our newsletter for exclusive updates on upcoming meetups, special guests, and the latest JavaScript magic happening in Zurich! 🌟
            </p>
            <Newsletter />
            <p className="mt-4 text-sm text-gray-400">
              PS: We promise not to spam your inbox - just pure JavaScript goodness delivered fresh! 💌
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}