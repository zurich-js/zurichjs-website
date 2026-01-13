import { motion } from 'framer-motion';
import { FileText, Clock, Calendar } from 'lucide-react';
import { useFeatureFlagEnabled } from 'posthog-js/react';

import Section from '@/components/Section';
import { FeatureFlags } from '@/constants';

export default function SubmissionGuidelines() {
  const showDeepDiveOption = useFeatureFlagEnabled(FeatureFlags.CfpDeepDiveOption);

  const guidelines = [
    {
      icon: FileText,
      title: 'Talk Content',
      description:
        'Your talk should focus on JavaScript or related web technologies. We welcome topics from beginner to advanced levels.',
      delay: 0.1,
    },
    {
      icon: Clock,
      title: 'Talk Length',
      description: showDeepDiveOption
        ? 'We offer slots for lightning talks (5 min), standard talks (25 min), and deep dives (35 min).'
        : 'We offer slots for lightning talks (5 min) and standard talks (25 min).',
      delay: 0.2,
    },
    {
      icon: Calendar,
      title: 'Upcoming Events',
      description:
        'We typically host meetups monthly. Your talk will be scheduled based on the theme and availability.',
      delay: 0.3,
    },
  ];

  return (
    <Section variant="white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl font-bold mb-3">Submission Guidelines</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Here&apos;s what you need to know before submitting your talk proposal.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {guidelines.map(({ icon: Icon, title, description, delay }) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay }}
            className="bg-gray-50 p-6 rounded-lg border border-gray-200"
          >
            <Icon className="text-yellow-500 mb-4" size={32} />
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            <p className="text-gray-600">{description}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
