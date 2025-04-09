import { motion } from 'framer-motion';
import Button from '../ui/Button';
import Newsletter from '../ui/Newsletter';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { FeatureFlags } from '@/constants';
import Section from "@/components/Section";

// Define TypeScript interfaces
interface Benefit {
  title: string;
  description: string;
}

interface JoinCTAProps {
  benefits?: Benefit[];
  newsletterTitle?: string;
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
  newsletterTitle = "Stay in the JS Loop!",
  buttonUrl = "https://meetup.com/zurich-js"
}: JoinCTAProps) {
  const showNewsletter = useFeatureFlagEnabled(FeatureFlags.Newsletter);

  return (
    <Section variant="black" padding="lg" className="flex justify-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-screen-md mx-auto flex flex-col justify-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center">
            Join the JS Revolution in Zurich!
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
            variant="secondary"
            size="lg"
            className="w-fit mx-auto block"
          >
            Join Our JS Community
          </Button>
        </motion.div>

        {showNewsletter && (
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
        )}
    </Section>
  );
}
