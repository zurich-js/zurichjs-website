import { motion } from 'framer-motion';
import { TrendingUp, Clock, Users } from 'lucide-react';

import Section from '@/components/Section';

import { TalkSubmissionStats } from './types';

interface CommunityStatsProps {
  submissionStats: TalkSubmissionStats;
}

export default function CommunityStats({ submissionStats }: CommunityStatsProps) {
  return (
    <Section variant="white" padding="sm">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-4xl mx-auto"
      >
        <div className="grid grid-cols-3 gap-3 md:gap-6">
          <div className="bg-gray-50 rounded-lg p-3 md:p-4 text-center border border-gray-200">
            <TrendingUp className="mx-auto mb-2 text-green-600" size={24} />
            <div className="text-xl md:text-2xl font-bold text-black">
              {submissionStats.recentSubmissions}
            </div>
            <div className="text-xs text-gray-600">Recent submissions</div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 md:p-4 text-center border border-gray-200">
            <Clock className="mx-auto mb-2 text-blue-600" size={24} />
            <div className="text-sm md:text-lg font-bold text-black">1 week - 2 months</div>
            <div className="text-xs text-gray-600">Typical wait (24h response)</div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 md:p-4 text-center border border-gray-200">
            <Users className="mx-auto mb-2 text-purple-600" size={24} />
            <div className="text-xl md:text-2xl font-bold text-black">
              {submissionStats.pendingSubmissions}
            </div>
            <div className="text-xs text-gray-600">In queue</div>
          </div>
        </div>
      </motion.div>
    </Section>
  );
}
