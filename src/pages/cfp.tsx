import CFPForm from '@/components/cfp/CFPForm';
import CFPHero from '@/components/cfp/CFPHero';
import CFPNotice from '@/components/cfp/CFPNotice';
import CommunityStats from '@/components/cfp/CommunityStats';
import SubmissionGuidelines from '@/components/cfp/SubmissionGuidelines';
import { TalkSubmissionStats } from '@/components/cfp/types';
import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import SEO from '@/components/SEO';
import useReferrerTracking from '@/hooks/useReferrerTracking';
import { getTalkSubmissionStats } from '@/sanity/queries';

interface CFPProps {
  submissionStats?: TalkSubmissionStats | null;
}

export default function CFP({ submissionStats }: CFPProps) {
  useReferrerTracking();

  return (
    <Layout>
      <SEO
        title="Submit a Talk | ZurichJS"
        description="Submit your talk proposal for an upcoming ZurichJS meetup. Share your JavaScript knowledge with the community!"
        openGraph={{
          title: 'Submit a Talk | ZurichJS',
          description:
            'Share your JavaScript knowledge with the ZurichJS community by submitting a talk proposal for our upcoming meetups.',
          image: '/api/og/cfp',
          type: 'website',
        }}
      />

      {/* Hero Section */}
      <CFPHero submissionStats={submissionStats} />

      {/* Meetup vs Conference Notice + Travel Welcome */}
      <CFPNotice />

      {/* Community Stats & Waiting Info */}
      {submissionStats && <CommunityStats submissionStats={submissionStats} />}

      {/* Submission Guidelines */}
      <SubmissionGuidelines />

      {/* Submission Form */}
      <Section variant="gray" id="form">
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
