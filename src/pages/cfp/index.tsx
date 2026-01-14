import { Calendar, ExternalLink, Mic, Users } from 'lucide-react';
import Link from 'next/link';

import { CONFERENCE_CFP_URL } from '@/components/cfp/constants';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/SEO';
import useReferrerTracking from '@/hooks/useReferrerTracking';

export default function CFP() {
  useReferrerTracking();

  return (
    <Layout>
      <SEO
        title="Call for Papers | ZurichJS"
        description="Submit a talk for ZurichJS Conference or our monthly meetups. Share your JavaScript expertise with the community!"
        openGraph={{
          title: 'Call for Papers | ZurichJS',
          description:
            'Share your JavaScript knowledge with the ZurichJS community. Submit a talk for our conference or monthly meetups.',
          image: '/api/og/cfp',
          type: 'website',
        }}
      />

      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Share Your <span className="bg-js px-2 rounded">Knowledge</span>
          </h1>
          <p className="text-xl text-gray-600">
            Choose where you&apos;d like to speak. We&apos;d love to hear from you!
          </p>
        </div>

        {/* Side-by-side selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {/* Conference Option */}
          <a
            href={CONFERENCE_CFP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col p-8 bg-white border-2 border-gray-200 rounded-2xl hover:border-js hover:shadow-xl transition-all duration-300"
          >
            <div className="absolute -top-3 left-6">
              <span className="bg-js text-black text-xs font-bold px-3 py-1 rounded-full">
                Sept 2026
              </span>
            </div>

            <div className="flex items-center justify-center w-16 h-16 bg-js rounded-xl mb-6 group-hover:scale-105 transition-transform">
              <Mic size={32} className="text-black" />
            </div>

            <h2 className="text-2xl font-bold mb-3 flex items-center">
              Conference Talk
              <ExternalLink size={18} className="ml-2 text-gray-400 group-hover:text-black transition-colors" />
            </h2>

            <p className="text-gray-600 mb-6 flex-grow">
              Present at ZurichJS Conf, our annual full-day JavaScript conference with 300+ attendees.
            </p>

            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex items-center">
                <Calendar size={14} className="mr-2" />
                Full-day event in September
              </li>
              <li className="flex items-center">
                <Users size={14} className="mr-2" />
                300+ developers
              </li>
            </ul>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <span className="inline-flex items-center text-black font-semibold group-hover:underline">
                Submit conference talk
                <ExternalLink size={16} className="ml-2" />
              </span>
            </div>
          </a>

          {/* Meetup Option */}
          <Link
            href="/cfp/form"
            className="group relative flex flex-col p-8 bg-white border-2 border-gray-200 rounded-2xl hover:border-js hover:shadow-xl transition-all duration-300"
          >
            <div className="absolute -top-3 left-6">
              <span className="bg-gray-800 text-white text-xs font-bold px-3 py-1 rounded-full">
                Monthly
              </span>
            </div>

            <div className="flex items-center justify-center w-16 h-16 bg-js rounded-xl mb-6 group-hover:scale-105 transition-transform">
              <Users size={32} className="text-black" />
            </div>

            <h2 className="text-2xl font-bold mb-3">Meetup Talk</h2>

            <p className="text-gray-600 mb-6 flex-grow">
              Speak at one of our monthly meetups. Perfect for first-time speakers or trying out new
              material.
            </p>

            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex items-center">
                <Calendar size={14} className="mr-2" />
                Monthly events
              </li>
              <li className="flex items-center">
                <Users size={14} className="mr-2" />
                40-70 developers
              </li>
            </ul>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <span className="inline-flex items-center text-black font-semibold group-hover:underline">
                Submit meetup talk
                <span className="ml-2">&rarr;</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Footer note */}
        <p className="mt-12 text-gray-500 text-center max-w-lg">
          Not sure which to choose? Meetups are great for testing ideas before the conference, and we
          welcome speakers of all experience levels.
        </p>
      </div>
    </Layout>
  );
}
