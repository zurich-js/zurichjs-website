import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import CFPForm from '@/components/cfp/CFPForm';
import CommunityStats from '@/components/cfp/CommunityStats';
import SubmissionGuidelines from '@/components/cfp/SubmissionGuidelines';
import { TalkSubmissionStats } from '@/components/cfp/types';
import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import SEO from '@/components/SEO';
import useReferrerTracking from '@/hooks/useReferrerTracking';
import { getTalkSubmissionStats } from '@/sanity/queries';

interface CFPFormPageProps {
  submissionStats?: TalkSubmissionStats | null;
}

export default function CFPFormPage({ submissionStats }: CFPFormPageProps) {
  useReferrerTracking();

  return (
    <Layout>
      <SEO
        title="Submit a Meetup Talk | ZurichJS"
        description="Submit your talk proposal for an upcoming ZurichJS meetup. Share your JavaScript knowledge with the community!"
        openGraph={{
          title: 'Submit a Meetup Talk | ZurichJS',
          description:
            'Share your JavaScript knowledge with the ZurichJS community by submitting a talk proposal for our monthly meetups.',
          image: '/api/og/cfp',
          type: 'website',
        }}
      />

      {/* Header with back link */}
      <Section className="pt-8 pb-4">
        <Link
          href="/cfp"
          className="inline-flex items-center text-gray-600 hover:text-black transition-colors group"
        >
          <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to CFP options
        </Link>
      </Section>

      {/* Hero Section */}
      <Section className="pt-4 pb-8">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Submit a <span className="bg-js px-2 rounded">Meetup Talk</span>
          </h1>
          <p className="text-xl text-gray-600">
            Share your JavaScript knowledge at one of our monthly meetups. We welcome speakers of all
            experience levels!
          </p>
        </div>
      </Section>

      {/* Community Stats & Waiting Info */}
      {submissionStats && <CommunityStats submissionStats={submissionStats} />}

      {/* Submission Guidelines */}
      <SubmissionGuidelines />

      {/* Submission Form */}
      <Section variant="gray">
        <div className="max-w-3xl mx-auto">
          <CFPForm />
        </div>
      </Section>
    </Layout>
  );
}

export async function getStaticProps() {
  try {
    const submissionStats = await getTalkSubmissionStats();

    return {
      props: {
        submissionStats,
      },
      revalidate: 3600,
    };
  } catch (error) {
    console.error('Error fetching data:', error);

    return {
      props: {
        submissionStats: null,
      },
      revalidate: 300,
    };
  }
}
