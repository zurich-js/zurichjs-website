import { motion } from 'framer-motion';
import { Calendar, Plane, MapPin } from 'lucide-react';

import Section from '@/components/Section';
import Button from '@/components/ui/Button';

import { CONFERENCE_CFP_URL } from './constants';

export default function CFPNotice() {
  return (
    <Section variant="white" padding="md">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        {/* Meetup Clarification */}
        <div className="bg-gradient-to-r from-js/20 to-yellow-100 rounded-xl p-6 border-2 border-js mb-4">
          <div className="flex flex-col md:flex-row items-start gap-4">
            <div className="bg-js rounded-full p-3 flex-shrink-0">
              <MapPin className="text-black" size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-black mb-2">
                This is for ZurichJS Meetups
              </h2>
              <p className="text-gray-700 mb-4">
                Submit your talk proposal here for our regular monthly meetups in Zurich.
                We host events with 2-3 speakers, great food, and an amazing community of developers.
              </p>
            </div>
          </div>
        </div>

        {/* Conference CFP Link */}
        <div className="bg-black rounded-xl p-6 border-2 border-js/30 mb-4">
          <div className="flex flex-col md:flex-row items-start gap-4">
            <div className="bg-js rounded-full p-3 flex-shrink-0">
              <Calendar className="text-black" size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white mb-2">
                Looking for ZurichJS Conf 2026?
              </h2>
              <p className="text-gray-300 text-sm mb-4">
                If you want to speak at our annual conference instead, head over to our conference CFP.
                The conference offers a bigger stage, travel support for speakers, and more.
              </p>
              <Button
                href={CONFERENCE_CFP_URL}
                variant="primary"
                size="md"
                className="w-full sm:w-auto"
              >
                Go to Conference CFP
              </Button>
            </div>
          </div>
        </div>

        {/* Travel Welcome Message */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
              <Plane className="text-blue-600" size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">
                International Speakers Welcome!
              </h3>
              <p className="text-blue-800 text-sm">
                While we can&apos;t cover travel expenses for meetup speakers, we&apos;d love to have you
                if you&apos;re planning to visit Zurich or already live here. Need help with travel tips,
                accommodation suggestions, or local recommendations? Just mention it in your submission
                and we&apos;ll be happy to help make your trip amazing!
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </Section>
  );
}
