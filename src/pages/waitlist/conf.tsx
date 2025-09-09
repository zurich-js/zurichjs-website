import { motion } from 'framer-motion';
import { Calendar, Users, Star, Gift, MapPin, Clock, Sparkles, ExternalLink } from 'lucide-react';

import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import SEO from '@/components/SEO';
import useReferrerTracking from '@/hooks/useReferrerTracking';

export default function ConferenceWaitlist() {
  useReferrerTracking();

  return (
    <Layout>
      <SEO
        title="ZurichJS Conference 2026 - Join the Waitlist | ZurichJS"
        description="Be the first to know about ZurichJS Conference 2026! Join our waitlist for exclusive early access, discounted tickets, and help shape the future of JavaScript in Zurich."
        openGraph={{
          title: "ZurichJS Conference 2026 - Join the Waitlist",
          description: "Be the first to know about ZurichJS Conference 2026! Join our waitlist for exclusive early access and discounted tickets.",
          image: '/api/og/home',
        }}
      />

      {/* Hero Section */}
      <Section variant="gradient" padding="lg" className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          <div className="mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-black/10 rounded-full px-4 py-2 text-black font-medium mb-6"
            >
              <Sparkles className="w-4 h-4" />
              <span>Coming Soon</span>
            </motion.div>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-5xl lg:text-7xl font-bold text-black mb-6 leading-tight"
          >
            ZurichJS
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-black to-gray-600">
              Conference 2026
            </span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex items-center justify-center gap-4 text-black/80 mb-8"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              <span className="font-medium">Zurich, Switzerland</span>
            </div>
            <div className="w-1 h-1 bg-black/40 rounded-full"></div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Late August / Early September</span>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-xl lg:text-2xl text-black/80 mb-12 leading-relaxed"
          >
            A focused one-day JavaScript conference in Zurich.
            <br />
            Join us for quality talks, networking, and community building.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <a
              href="https://getwaitlist.com/waitlist/31042"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-zurich hover:bg-zurich/90 text-white font-bold text-xl px-8 py-4 rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105 group"
            >
              <span>Join the Waitlist</span>
              <ExternalLink className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </a>
          </motion.div>
        </motion.div>
      </Section>

      {/* Benefits Section */}
      <Section variant="white" padding="lg">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-black mb-6">
              Why Join the Waitlist?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get exclusive access and help us create a great JavaScript conference experience in Zurich.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-center p-8 rounded-2xl bg-gradient-to-br from-js/10 to-js-dark/10 border border-js/20"
            >
              <div className="w-16 h-16 bg-js rounded-full flex items-center justify-center mx-auto mb-6">
                <Star className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-2xl font-bold text-black mb-4">Be First to Know</h3>
              <p className="text-gray-600 leading-relaxed">
                Get exclusive early access to speaker announcements, schedule reveals, and ticket releases before anyone else.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center p-8 rounded-2xl bg-gradient-to-br from-zurich/10 to-zurich/20 border border-zurich/20"
            >
              <div className="w-16 h-16 bg-zurich rounded-full flex items-center justify-center mx-auto mb-6">
                <Gift className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-black mb-4">Exclusive Discounts</h3>
              <p className="text-gray-600 leading-relaxed">
                Waitlist members get access to special early-bird pricing and exclusive discount codes not available to the general public.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-center p-8 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300"
            >
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-black mb-4">Shape the Journey</h3>
              <p className="text-gray-600 leading-relaxed">
                Your feedback helps us curate the perfect lineup of speakers, topics, and experiences that matter most to the JS community.
              </p>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* Waitlist Form Section */}
      <Section variant="gradient" padding="lg">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-black mb-6">
              Join the Waitlist
            </h2>
            <p className="text-xl text-black/80 mb-12">
              Be part of something extraordinary. Your journey starts here.
            </p>

            {/* Waitlist Link */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/20"
            >
              <a
                href="https://getwaitlist.com/waitlist/31042"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-zurich hover:bg-zurich/90 text-white font-bold text-xl px-8 py-4 rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105 group"
              >
                <span>Join the Waitlist</span>
                <ExternalLink className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </a>
              <p className="text-gray-600 mt-4 text-sm">
                Click to join our waitlist and be the first to know about tickets, speakers, and updates!
              </p>
            </motion.div>
          </motion.div>
        </div>
      </Section>

      {/* Conference Details Preview */}
      <Section variant="black" padding="lg">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              What to Expect
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              A quality conference experience designed for the JavaScript community in Switzerland.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-js rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-black" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Great Speakers</h3>
              <p className="text-gray-300">
                Experienced developers and community members sharing practical insights
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-zurich rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Full Day + Warm-up</h3>
              <p className="text-gray-300">
                One-day conference with pre-conference meetup and pro workshops
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-10 h-10 text-black" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Great Venue</h3>
              <p className="text-gray-300">
                Quality location in Zurich with excellent facilities for learning and networking
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-gradient-to-r from-js to-js-dark rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-black" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Community Focus</h3>
              <p className="text-gray-300">
                Built by the community, for the community - celebrating JavaScript in Switzerland
              </p>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* Final CTA */}
      <Section variant="js" padding="md">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-black mb-6">
            Join the ZurichJS Conference 2026
          </h2>
          <p className="text-lg text-black/80 mb-8">
            Connect with fellow JavaScript developers and learn from great speakers in a focused, community-driven event.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center text-black/70">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span>Late August / Early September 2026</span>
            </div>
            <div className="hidden sm:block w-1 h-1 bg-black/40 rounded-full"></div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              <span>Zurich, Switzerland</span>
            </div>
          </div>
        </motion.div>
      </Section>
    </Layout>
  );
}