import { motion } from 'framer-motion';
import { Mic, Users, TrendingUp } from 'lucide-react';

import Section from '@/components/Section';
import Button from '@/components/ui/Button';
import useEvents from '@/hooks/useEvents';

import { TalkSubmissionStats } from './types';

interface CFPHeroProps {
  submissionStats?: TalkSubmissionStats | null;
}

export default function CFPHero({ submissionStats }: CFPHeroProps) {
  const { track } = useEvents();

  return (
    <Section variant="gradient" padding="lg">
      <div className="flex flex-col lg:flex-row items-center lg:mt-20 gap-8 lg:gap-12">
        <div className="lg:w-1/2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Call for Papers
            </h1>
            <p className="text-lg md:text-xl mb-4 font-medium">
              Share your passion with Zurich&apos;s most vibrant developer community!
            </p>
            <p className="text-base md:text-lg mb-6">
              We&apos;re constantly looking for speakers for our upcoming meetups. Whether you&apos;re a
              seasoned presenter or a first-timer, we&apos;d love to hear from you!
            </p>

            {submissionStats && (
              <div className="bg-js/20 backdrop-blur rounded-lg p-4 mb-6 border border-js/30">
                <p className="text-sm md:text-base font-medium text-black">
                  {submissionStats.recentSubmissions > 0 ? (
                    <>
                      <strong>Join our amazing speaker community!</strong> We&apos;ve had{' '}
                      {submissionStats.recentSubmissions} submissions in the last 90 days and our
                      events are packed with incredible talent. Submit now to get in the queue!
                    </>
                  ) : (
                    <>
                      <strong>Perfect timing!</strong> There hasn&apos;t been a submission for a
                      while - go for it! Your talk could be the next big hit at ZurichJS.
                    </>
                  )}
                </p>
              </div>
            )}

            <Button
              href="#form"
              variant="primary"
              size="lg"
              className="bg-black hover:bg-gray-800 text-white font-bold w-full sm:w-auto"
              onClick={() => {
                document.getElementById('form')?.scrollIntoView({ behavior: 'smooth' });
                track('skip_to_form_hero', {});
              }}
            >
              Submit Now
            </Button>
          </motion.div>
        </div>

        <div className="lg:w-1/2 w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white p-6 md:p-8 rounded-lg shadow-lg"
          >
            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-4">
                <div className="bg-yellow-100 rounded-full p-2 flex-shrink-0">
                  <Mic className="text-yellow-600" size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Share Your Expertise</h3>
                  <p className="text-gray-600 text-sm">
                    Help others learn from your experiences and insights
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-yellow-100 rounded-full p-2 flex-shrink-0">
                  <Users className="text-yellow-600" size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Build Your Network</h3>
                  <p className="text-gray-600 text-sm">
                    Connect with like-minded developers in the community
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-yellow-100 rounded-full p-2 flex-shrink-0">
                  <TrendingUp className="text-yellow-600" size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Grow Your Career</h3>
                  <p className="text-gray-600 text-sm">
                    Speaking builds visibility and opens doors to new opportunities
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </Section>
  );
}
